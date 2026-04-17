import type { Context, Next } from 'hono'
import type { Env, SessionData } from '../types'
import { getSessionToken, verifySession } from '../lib/session'

type Variables = { session: SessionData }

export async function authMiddleware(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next
) {
  const token = getSessionToken(c.req.header('Cookie') ?? null)
  if (!token) return c.json({ error: 'Unauthorized' }, 401)

  const session = await verifySession(c.env.SESSION_SECRET, token)
  if (!session) return c.json({ error: 'Unauthorized' }, 401)

  c.set('session', session)
  await next()
}
