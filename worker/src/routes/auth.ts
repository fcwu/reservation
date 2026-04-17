import { Hono } from 'hono'
import type { Env } from '../types'
import { createSession, sessionCookie, SESSION_DURATION } from '../lib/session'
import { getSessionToken, verifySession } from '../lib/session'

const auth = new Hono<{ Bindings: Env }>()

auth.get('/google', (c) => {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', c.env.GOOGLE_CLIENT_ID)
  url.searchParams.set(
    'redirect_uri',
    `${new URL(c.req.url).origin}/auth/callback`
  )
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'openid email profile')
  url.searchParams.set('access_type', 'offline')
  return c.redirect(url.toString())
})

auth.get('/callback', async (c) => {
  const code = c.req.query('code')
  if (!code) return c.json({ error: 'Missing code' }, 400)

  const origin = new URL(c.req.url).origin

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: c.env.GOOGLE_CLIENT_ID,
      client_secret: c.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: `${origin}/auth/callback`,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) return c.json({ error: 'Token exchange failed' }, 400)

  const tokens = (await tokenRes.json()) as { id_token?: string }
  if (!tokens.id_token) return c.json({ error: 'No id_token' }, 400)

  // Decode JWT payload (no verification needed — Google already signed it, and we verify email)
  const [, payload] = tokens.id_token.split('.')
  const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
  const email: string = decoded.email

  if (email !== c.env.OWNER_EMAIL) {
    return c.html(
      '<h2>此帳號無管理權限</h2><a href="/admin/login">返回登入</a>',
      403
    )
  }

  const session = await createSession(c.env.SESSION_SECRET, {
    userId: decoded.sub,
    email,
    expiresAt: Date.now() + SESSION_DURATION,
  })

  return new Response(null, {
    status: 302,
    headers: {
      Location: '/admin',
      'Set-Cookie': sessionCookie(session),
    },
  })
})

auth.post('/logout', (_c) => {
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/admin/login',
      'Set-Cookie': sessionCookie('', 0),
    },
  })
})

auth.get('/me', async (c) => {
  const token = getSessionToken(c.req.header('Cookie') ?? null)
  if (!token) return c.json({ authenticated: false })
  const session = await verifySession(c.env.SESSION_SECRET, token)
  if (!session) return c.json({ authenticated: false })
  return c.json({ authenticated: true, email: session.email })
})

export default auth
