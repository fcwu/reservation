import { Hono } from 'hono'
import type { Env } from '../../types'

const lineAuth = new Hono<{ Bindings: Env }>()

// POST /api/auth/line — verify LIFF idToken and return LINE userId
lineAuth.post('/', async (c) => {
  const body = await c.req.json<{ id_token: string; phone?: string }>()
  if (!body.id_token) return c.json({ error: 'id_token is required' }, 400)

  const verifyRes = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      id_token: body.id_token,
      client_id: c.env.GOOGLE_CLIENT_ID, // Note: this should be LINE channel ID
    }),
  })

  // LINE verify returns { sub: userId, ... }
  if (!verifyRes.ok) {
    return c.json({ error: 'LINE token verification failed' }, 400)
  }

  const data = (await verifyRes.json()) as { sub: string }

  // If phone provided, update customer record
  if (body.phone) {
    await c.env.DB.prepare(
      'UPDATE customers SET line_user_id = ? WHERE phone = ? AND line_user_id IS NULL'
    )
      .bind(data.sub, body.phone)
      .run()
  }

  return c.json({ line_user_id: data.sub })
})

export default lineAuth
