import { Hono } from 'hono'
import type { Env } from '../../types'
import { newId } from '../../lib/id'

const services = new Hono<{ Bindings: Env }>()

services.get('/', async (c) => {
  const { results } = await c.env.DB.prepare('SELECT * FROM services ORDER BY created_at').all()
  return c.json(results)
})

services.post('/', async (c) => {
  const body = await c.req.json<{ name: string; duration_minutes: number; price: number }>()
  if (!body.name || !body.duration_minutes) {
    return c.json({ error: 'name and duration_minutes are required' }, 400)
  }
  const id = newId()
  await c.env.DB.prepare(
    'INSERT INTO services (id, name, duration_minutes, price) VALUES (?, ?, ?, ?)'
  )
    .bind(id, body.name, body.duration_minutes, body.price ?? 0)
    .run()
  const service = await c.env.DB.prepare('SELECT * FROM services WHERE id = ?').bind(id).first()
  return c.json(service, 201)
})

services.put('/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json<{
    name?: string
    duration_minutes?: number
    price?: number
    is_active?: boolean
  }>()
  const existing = await c.env.DB.prepare('SELECT * FROM services WHERE id = ?').bind(id).first()
  if (!existing) return c.json({ error: 'Not found' }, 404)

  await c.env.DB.prepare(
    `UPDATE services SET
      name = ?, duration_minutes = ?, price = ?, is_active = ?
    WHERE id = ?`
  )
    .bind(
      body.name ?? (existing as { name: string }).name,
      body.duration_minutes ?? (existing as { duration_minutes: number }).duration_minutes,
      body.price ?? (existing as { price: number }).price,
      body.is_active !== undefined
        ? body.is_active
          ? 1
          : 0
        : (existing as { is_active: number }).is_active,
      id
    )
    .run()

  return c.json(await c.env.DB.prepare('SELECT * FROM services WHERE id = ?').bind(id).first())
})

services.delete('/:id', async (c) => {
  const id = c.req.param('id')
  const active = await c.env.DB.prepare(
    `SELECT COUNT(*) as count FROM reservations
     WHERE service_id = ? AND status IN ('pending','confirmed')`
  )
    .bind(id)
    .first<{ count: number }>()

  if (active && active.count > 0) {
    return c.json({ error: '此服務有未完成的預約，無法刪除' }, 409)
  }

  await c.env.DB.prepare('DELETE FROM services WHERE id = ?').bind(id).run()
  return c.json({ success: true })
})

export default services
