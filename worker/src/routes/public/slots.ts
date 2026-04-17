import { Hono } from 'hono'
import type { Env } from '../../types'
import { expandRules } from '../../lib/slots'

const publicSlots = new Hono<{ Bindings: Env }>()

publicSlots.get('/', async (c) => {
  const services = await c.env.DB.prepare(
    'SELECT id, name, duration_minutes, price FROM services WHERE is_active = 1 ORDER BY name'
  ).all()

  const manualSlots = await c.env.DB.prepare(
    `SELECT s.id, s.start_at, s.end_at, s.is_available, s.source_rule_id
     FROM slots s
     LEFT JOIN reservations r ON r.slot_id = s.id AND r.status = 'confirmed'
     WHERE s.start_at >= datetime('now')
       AND s.is_available = 1
       AND r.id IS NULL
     ORDER BY s.start_at`
  ).all<{ id: string; start_at: string; end_at: string; is_available: number; source_rule_id: string | null }>()

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
  const existingDates = new Set(manualSlots.results.map((s) => s.start_at))

  const expanded = expandRules(rules.results, overrideDates, existingDates)

  const allSlots = [
    ...manualSlots.results.map((s) => ({ ...s, type: 'manual' as const })),
    ...expanded.map((s) => ({ ...s, is_available: 1, type: 'recurring' as const })),
  ].sort((a, b) => a.start_at.localeCompare(b.start_at))

  // Find dates that are fully booked (have slots in DB but none available)
  const unavailableSlots = await c.env.DB.prepare(`
    SELECT DISTINCT date(start_at) as date
    FROM slots
    WHERE start_at >= datetime('now', 'start of day')
      AND is_available = 0
  `).all<{ date: string }>()

  const availableDates = new Set(allSlots.map((s) => s.start_at.slice(0, 10)))
  const bookedDates = unavailableSlots.results
    .map((r) => r.date)
    .filter((d) => !availableDates.has(d))

  return c.json({ slots: allSlots, services: services.results, bookedDates })
})

export default publicSlots
