export interface Env {
  DB: D1Database
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  LINE_CHANNEL_ACCESS_TOKEN: string
  SESSION_SECRET: string
  OWNER_EMAIL: string
  OWNER_LINE_USER_ID: string
}

export interface SessionData {
  userId: string
  email: string
  expiresAt: number
}

export type ReservationStatus = 'pending' | 'confirmed' | 'rejected' | 'cancelled'
