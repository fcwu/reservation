import { Hono } from 'hono'
import type { Env } from '../../types'

const customers = new Hono<{ Bindings: Env }>()

// GET /api/customers/lookup?phone=xxx — check if phone exists to auto-fill name
customers.get('/lookup', async (c) => {
  const phone = c.req.query('phone')
  if (!phone) return c.json({ error: 'phone is required' }, 400)

  const customer = await c.env.DB.prepare(
    'SELECT name, phone FROM customers WHERE phone = ?'
  )
    .bind(phone)
    .first<{ name: string; phone: string }>()

  if (!customer) return c.json({ found: false })
  return c.json({ found: true, name: customer.name })
})

export default customers
