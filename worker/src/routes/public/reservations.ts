import { Hono } from 'hono'
import type { Env } from '../../types'
import { newId } from '../../lib/id'
import { pushMessage } from '../../lib/line'
import { addMinutes } from '../../lib/time'

const publicReservations = new Hono<{ Bindings: Env }>()

// POST /api/reservations — submit a booking
publicReservations.post('/', async (c) => {
  const body = await c.req.json<{
    slot_id: string
    service_id: string
    name: string
    phone: string
    note?: string
    line_user_id?: string
  }>()

  if (!body.slot_id || !body.service_id || !body.name || !body.phone) {
    return c.json({ error: 'slot_id, service_id, name, phone are required' }, 400)
  }

  const rBody = body as typeof body & { start_at?: string; source_rule_id?: string }

  // Resolve start_at: from existing slot or from body
  const existingSlot = await c.env.DB.prepare('SELECT * FROM slots WHERE id = ?')
    .bind(body.slot_id)
    .first<{ id: string; start_at: string; is_available: number }>()

  let startAt: string
  if (existingSlot) {
    if (!existingSlot.is_available) return c.json({ error: '此時段已被預約' }, 409)
    startAt = existingSlot.start_at
  } else if (rBody.start_at) {
    startAt = rBody.start_at
  } else {
    return c.json({ error: 'Slot not found' }, 404)
  }

  // Every booking is exactly 2 hours
  const endAt = addMinutes(startAt, 120)

  // Check no confirmed reservation overlaps with [startAt, endAt)
  const overlap = await c.env.DB.prepare(
    `SELECT r.id FROM reservations r
     JOIN slots sl ON sl.id = r.slot_id
     WHERE r.status = 'confirmed'
       AND sl.start_at < ? AND sl.end_at > ?`
  )
    .bind(endAt, startAt)
    .first()
  if (overlap) return c.json({ error: '此時段已被預約' }, 409)

  // Find or create the 2-hour booking slot
  let slotId: string
  const existingByStart = await c.env.DB.prepare('SELECT id FROM slots WHERE start_at = ?')
    .bind(startAt)
    .first<{ id: string }>()
  if (existingByStart) {
    slotId = existingByStart.id
  } else {
    slotId = newId()
    await c.env.DB.prepare(
      'INSERT INTO slots (id, start_at, end_at, source_rule_id) VALUES (?, ?, ?, ?)'
    )
      .bind(slotId, startAt, endAt, rBody.source_rule_id ?? null)
      .run()
  }

  // Upsert customer by phone
  let customer = await c.env.DB.prepare('SELECT * FROM customers WHERE phone = ?')
    .bind(body.phone)
    .first<{ id: string; name: string; line_user_id: string | null }>()

  if (!customer) {
    const customerId = newId()
    await c.env.DB.prepare(
      'INSERT INTO customers (id, phone, name, line_user_id) VALUES (?, ?, ?, ?)'
    )
      .bind(customerId, body.phone, body.name, body.line_user_id ?? null)
      .run()
    customer = { id: customerId, name: body.name, line_user_id: body.line_user_id ?? null }
  } else if (body.line_user_id && !customer.line_user_id) {
    await c.env.DB.prepare('UPDATE customers SET line_user_id = ? WHERE id = ?')
      .bind(body.line_user_id, customer.id)
      .run()
  }

  const reservationId = newId()
  await c.env.DB.prepare(
    `INSERT INTO reservations (id, slot_id, service_id, customer_id, note)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(reservationId, slotId, body.service_id, customer.id, body.note ?? null)
    .run()

  // Notify owner
  if (c.env.OWNER_LINE_USER_ID) {
    const slotData = await c.env.DB.prepare('SELECT start_at FROM slots WHERE id = ?')
      .bind(slotId)
      .first<{ start_at: string }>()
    const service = await c.env.DB.prepare('SELECT name FROM services WHERE id = ?')
      .bind(body.service_id)
      .first<{ name: string }>()
    if (slotData && service) {
      const dt = new Date(slotData.start_at).toLocaleString('zh-TW', {
        timeZone: 'Asia/Taipei',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      await pushMessage(
        c.env.LINE_CHANNEL_ACCESS_TOKEN,
        c.env.OWNER_LINE_USER_ID,
        `新預約通知\n顧客：${body.name}（${body.phone}）\n時間：${dt}\n服務：${service.name}\n管理後台：${c.env.FRONTEND_URL}/admin`
      )
    }
  }

  return c.json({ id: reservationId, status: 'pending' }, 201)
})

// GET /api/reservations?phone=xxx
publicReservations.get('/', async (c) => {
  const phone = c.req.query('phone')
  if (!phone) return c.json({ error: 'phone is required' }, 400)

  const { results } = await c.env.DB.prepare(
    `SELECT r.id, r.status, r.note, r.rejection_reason, r.created_at,
            s.name as service_name, s.duration_minutes, s.price,
            sl.start_at, sl.end_at
     FROM reservations r
     JOIN customers c ON c.id = r.customer_id
     JOIN services s ON s.id = r.service_id
     JOIN slots sl ON sl.id = r.slot_id
     WHERE c.phone = ?
     ORDER BY sl.start_at DESC`
  )
    .bind(phone)
    .all()

  return c.json(results)
})

export default publicReservations
