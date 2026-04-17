import { Hono } from 'hono'
import type { Env } from '../../types'
import { newId } from '../../lib/id'
import { expandRules } from '../../lib/slots'

const slots = new Hono<{ Bindings: Env }>()

// GET /api/admin/slots — list all upcoming slots (manual + expanded from rules)
slots.get('/', async (c) => {
  const manualSlots = await c.env.DB.prepare(
    `SELECT s.*, r.id as reservation_id, r.status as reservation_status
     FROM slots s
     LEFT JOIN reservations r ON r.slot_id = s.id AND r.status IN ('pending','confirmed')
     WHERE s.start_at >= datetime('now')
     ORDER BY s.start_at`
  ).all()

  const rules = await c.env.DB.prepare(
    'SELECT * FROM slot_rules WHERE is_active = 1'
  ).all<{
    id: string
    day_of_week: number
    start_time: string
    end_time: string
    is_active: number
  }>()

  const overrides = await c.env.DB.prepare(
    'SELECT date FROM slot_overrides WHERE is_closed = 1'
  ).all<{ date: string }>()

  const overrideDates = new Set(overrides.results.map((o) => o.date))
  const existingDates = new Set(
    (manualSlots.results as Array<{ start_at: string }>).map((s) => s.start_at)
  )

  const expanded = expandRules(rules.results, overrideDates, existingDates)

  return c.json({
    manual: manualSlots.results,
    recurring: expanded,
    rules: rules.results,
    overrides: overrides.results,
  })
})

// POST /api/admin/slots — create one-time slot
slots.post('/', async (c) => {
  const body = await c.req.json<{ start_at: string; end_at: string }>()
  if (!body.start_at || !body.end_at) {
    return c.json({ error: 'start_at and end_at are required' }, 400)
  }

  // Check overlap
  const overlap = await c.env.DB.prepare(
    `SELECT id FROM slots WHERE NOT (end_at <= ? OR start_at >= ?)`
  )
    .bind(body.start_at, body.end_at)
    .first()
  if (overlap) return c.json({ error: '與現有時段時間重疊' }, 409)

  const id = newId()
  await c.env.DB.prepare('INSERT INTO slots (id, start_at, end_at) VALUES (?, ?, ?)')
    .bind(id, body.start_at, body.end_at)
    .run()

  return c.json(
    await c.env.DB.prepare('SELECT * FROM slots WHERE id = ?').bind(id).first(),
    201
  )
})

// DELETE /api/admin/slots/:id
slots.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const confirmed = await c.env.DB.prepare(
    `SELECT id FROM reservations WHERE slot_id = ? AND status IN ('confirmed','pending')`
  )
    .bind(id)
    .first()
  if (confirmed) return c.json({ error: '此時段有未完成的預約，請先處理' }, 409)

  await c.env.DB.prepare('DELETE FROM slots WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

// ── Slot Rules ────────────────────────────────────────────────────────────────

slots.post('/rules', async (c) => {
  const body = await c.req.json<{
    day_of_week: number
    start_time: string
    end_time: string
  }>()
  if (body.day_of_week === undefined || !body.start_time || !body.end_time) {
    return c.json({ error: 'day_of_week, start_time, end_time are required' }, 400)
  }
  const id = newId()
  await c.env.DB.prepare(
    'INSERT INTO slot_rules (id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)'
  )
    .bind(id, body.day_of_week, body.start_time, body.end_time)
    .run()
  return c.json(
    await c.env.DB.prepare('SELECT * FROM slot_rules WHERE id = ?').bind(id).first(),
    201
  )
})

slots.put('/rules/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<{
    day_of_week?: number
    start_time?: string
    end_time?: string
    is_active?: boolean
  }>()
  const existing = await c.env.DB.prepare('SELECT * FROM slot_rules WHERE id = ?')
    .bind(id)
    .first<{
      day_of_week: number
      start_time: string
      end_time: string
      is_active: number
    }>()
  if (!existing) return c.json({ error: 'Not found' }, 404)

  await c.env.DB.prepare(
    `UPDATE slot_rules SET day_of_week=?, start_time=?, end_time=?, is_active=? WHERE id=?`
  )
    .bind(
      body.day_of_week ?? existing.day_of_week,
      body.start_time ?? existing.start_time,
      body.end_time ?? existing.end_time,
      body.is_active !== undefined ? (body.is_active ? 1 : 0) : existing.is_active,
      id
    )
    .run()
  return c.json(
    await c.env.DB.prepare('SELECT * FROM slot_rules WHERE id = ?').bind(id).first()
  )
})

// ── Slot Overrides ────────────────────────────────────────────────────────────

slots.post('/overrides', async (c) => {
  const body = await c.req.json<{ date: string }>()
  if (!body.date) return c.json({ error: 'date is required' }, 400)

  const id = newId()
  await c.env.DB.prepare(
    'INSERT OR REPLACE INTO slot_overrides (id, date, is_closed) VALUES (?, ?, 1)'
  )
    .bind(id, body.date)
    .run()
  return c.json({ id, date: body.date, is_closed: true }, 201)
})

export default slots
