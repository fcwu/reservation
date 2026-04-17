import { Hono } from 'hono'
import type { Env } from '../../types'
import { pushMessage } from '../../lib/line'
import { addMinutes, halfHourTimesInRange } from '../../lib/time'
import { newId } from '../../lib/id'

const reservations = new Hono<{ Bindings: Env }>()

reservations.get('/', async (c) => {
  const status = c.req.query('status')
  const date = c.req.query('date')

  let query = `
    SELECT r.*, c.name as customer_name, c.phone as customer_phone,
           c.line_user_id, s.name as service_name,
           sl.start_at, sl.end_at
    FROM reservations r
    JOIN customers c ON c.id = r.customer_id
    JOIN services s ON s.id = r.service_id
    JOIN slots sl ON sl.id = r.slot_id
    WHERE 1=1
  `
  const params: string[] = []
  if (status) {
    query += ' AND r.status = ?'
    params.push(status)
  }
  if (date) {
    query += " AND date(sl.start_at) = ?"
    params.push(date)
  }
  query += ' ORDER BY r.created_at DESC'

  const { results } = await c.env.DB.prepare(query).bind(...params).all()
  return c.json(results)
})

reservations.post('/:id/confirm', async (c) => {
  const id = c.req.param('id')
  const reservation = await c.env.DB.prepare(
    `SELECT r.*, c.line_user_id, c.name as customer_name,
            sl.start_at, s.name as service_name
     FROM reservations r
     JOIN customers c ON c.id = r.customer_id
     JOIN slots sl ON sl.id = r.slot_id
     JOIN services s ON s.id = r.service_id
     WHERE r.id = ?`
  )
    .bind(id)
    .first<{
      id: string
      status: string
      slot_id: string
      line_user_id: string | null
      customer_name: string
      start_at: string
      service_name: string
    }>()

  if (!reservation) return c.json({ error: 'Not found' }, 404)
  if (reservation.status !== 'pending') {
    return c.json({ error: '只能確認待確認的預約' }, 409)
  }

  // Check slot conflict
  const conflict = await c.env.DB.prepare(
    `SELECT id FROM reservations WHERE slot_id = ? AND status = 'confirmed' AND id != ?`
  )
    .bind(reservation.slot_id, id)
    .first()
  if (conflict) return c.json({ error: '此時段已有其他已確認的預約' }, 409)

  await c.env.DB.prepare(`UPDATE reservations SET status = 'confirmed' WHERE id = ?`)
    .bind(id)
    .run()

  // Mark the booking slot and all overlapping 30-min slots as unavailable
  const endAt = addMinutes(reservation.start_at, 120)
  await c.env.DB.prepare(`UPDATE slots SET is_available = 0 WHERE id = ?`)
    .bind(reservation.slot_id)
    .run()
  for (const t of halfHourTimesInRange(reservation.start_at, endAt)) {
    const existing = await c.env.DB.prepare('SELECT id FROM slots WHERE start_at = ?')
      .bind(t)
      .first<{ id: string }>()
    if (existing) {
      await c.env.DB.prepare('UPDATE slots SET is_available = 0 WHERE id = ?')
        .bind(existing.id)
        .run()
    } else {
      await c.env.DB.prepare('INSERT INTO slots (id, start_at, end_at, is_available) VALUES (?, ?, ?, 0)')
        .bind(newId(), t, addMinutes(t, 30), 0)
        .run()
    }
  }

  if (reservation.line_user_id) {
    const dt = new Date(reservation.start_at).toLocaleString('zh-TW', {
      timeZone: 'Asia/Taipei',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    await pushMessage(
      c.env.LINE_CHANNEL_ACCESS_TOKEN,
      reservation.line_user_id,
      `您的預約已確認！\n時間：${dt}\n服務：${reservation.service_name}\n查看預約：${c.env.FRONTEND_URL}/my-bookings`
    )
  }

  return c.json({ success: true })
})

reservations.post('/:id/reject', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<{ reason?: string }>().catch(() => ({ reason: undefined }))

  const reservation = await c.env.DB.prepare(
    `SELECT r.*, c.line_user_id FROM reservations r
     JOIN customers c ON c.id = r.customer_id WHERE r.id = ?`
  )
    .bind(id)
    .first<{ status: string; line_user_id: string | null }>()

  if (!reservation) return c.json({ error: 'Not found' }, 404)
  if (reservation.status !== 'pending') return c.json({ error: '只能拒絕待確認的預約' }, 409)

  await c.env.DB.prepare(
    `UPDATE reservations SET status = 'rejected', rejection_reason = ? WHERE id = ?`
  )
    .bind(body?.reason ?? null, id)
    .run()

  if (reservation.line_user_id) {
    const msg = body?.reason
      ? `很抱歉，您的預約未能成立。\n原因：${body.reason}\n重新預約：${c.env.FRONTEND_URL}`
      : `很抱歉，您的預約未能成立，請聯繫業主了解詳情。\n重新預約：${c.env.FRONTEND_URL}`
    await pushMessage(c.env.LINE_CHANNEL_ACCESS_TOKEN, reservation.line_user_id, msg)
  }

  return c.json({ success: true })
})

reservations.post('/:id/cancel', async (c) => {
  const id = c.req.param('id')
  const reservation = await c.env.DB.prepare(
    `SELECT r.*, c.line_user_id, sl.start_at, sl.id as slot_id
     FROM reservations r
     JOIN customers c ON c.id = r.customer_id
     JOIN slots sl ON sl.id = r.slot_id
     WHERE r.id = ?`
  )
    .bind(id)
    .first<{ status: string; line_user_id: string | null; start_at: string; slot_id: string }>()

  if (!reservation) return c.json({ error: 'Not found' }, 404)
  if (reservation.status !== 'confirmed') return c.json({ error: '只能取消已確認的預約' }, 409)

  await c.env.DB.prepare(`UPDATE reservations SET status = 'cancelled' WHERE id = ?`)
    .bind(id)
    .run()

  // Restore the booking slot and all 30-min slots in the 2-hour window
  const endAt = addMinutes(reservation.start_at, 120)
  await c.env.DB.prepare(`UPDATE slots SET is_available = 1 WHERE id = ?`)
    .bind(reservation.slot_id)
    .run()
  await c.env.DB.prepare(
    `UPDATE slots SET is_available = 1
     WHERE start_at >= ? AND start_at < ?`
  )
    .bind(reservation.start_at, endAt)
    .run()

  if (reservation.line_user_id) {
    const dt = new Date(reservation.start_at).toLocaleString('zh-TW', {
      timeZone: 'Asia/Taipei',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    await pushMessage(
      c.env.LINE_CHANNEL_ACCESS_TOKEN,
      reservation.line_user_id,
      `您的預約已被取消，如有疑問請聯繫業主。\n時間：${dt}\n重新預約：${c.env.FRONTEND_URL}`
    )
  }

  return c.json({ success: true })
})

reservations.post('/:id/message', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<{ message: string }>().catch(() => ({ message: '' }))
  if (!body.message?.trim()) {
    return c.json({ error: '訊息內容不能為空' }, 400)
  }

  const reservation = await c.env.DB.prepare(
    `SELECT c.line_user_id FROM reservations r
     JOIN customers c ON c.id = r.customer_id WHERE r.id = ?`
  )
    .bind(id)
    .first<{ line_user_id: string | null }>()

  if (!reservation) return c.json({ error: 'Not found' }, 404)
  if (!reservation.line_user_id) return c.json({ error: '此顧客未綁定 LINE' }, 400)

  await pushMessage(c.env.LINE_CHANNEL_ACCESS_TOKEN, reservation.line_user_id, body.message.trim())
  return c.json({ success: true })
})

export default reservations
