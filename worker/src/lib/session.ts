import type { SessionData } from '../types'

const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

async function hmacSign(secret: string, data: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
}

export async function createSession(secret: string, data: SessionData): Promise<string> {
  const payload = btoa(JSON.stringify(data))
  const sig = await hmacSign(secret, payload)
  return `${payload}.${sig}`
}

export async function verifySession(
  secret: string,
  token: string
): Promise<SessionData | null> {
  try {
    const [payload, sig] = token.split('.')
    if (!payload || !sig) return null
    const expected = await hmacSign(secret, payload)
    if (expected !== sig) return null
    const data: SessionData = JSON.parse(atob(payload))
    if (Date.now() > data.expiresAt) return null
    return data
  } catch {
    return null
  }
}

export function sessionCookie(token: string, maxAge?: number): string {
  const age = maxAge !== undefined ? maxAge : SESSION_DURATION / 1000
  return `session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${age}`
}

export function getSessionToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null
  const match = cookieHeader.match(/session=([^;]+)/)
  return match ? match[1] : null
}

export { SESSION_DURATION }
