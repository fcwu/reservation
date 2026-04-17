import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env, SessionData } from './types'
import { authMiddleware } from './middleware/auth'

import authRoutes from './routes/auth'
import adminServices from './routes/admin/services'
import adminSlots from './routes/admin/slots'
import adminReservations from './routes/admin/reservations'
import publicSlots from './routes/public/slots'
import publicReservations from './routes/public/reservations'
import lineAuthRoute from './routes/public/line-auth'
import customersRoute from './routes/public/customers'

type Variables = { session: SessionData }

const app = new Hono<{ Bindings: Env; Variables: Variables }>()

app.use('*', cors({
  origin: (origin) => origin?.endsWith('.pages.dev') || origin === 'http://localhost:5173' ? origin : '',
  credentials: true,
}))

// Auth routes (public)
app.route('/auth', authRoutes)

// Admin API (protected)
const admin = new Hono<{ Bindings: Env; Variables: Variables }>()
admin.use('*', authMiddleware)
admin.route('/services', adminServices)
admin.route('/slots', adminSlots)
admin.route('/reservations', adminReservations)

app.route('/api/admin', admin)

// Public API
app.route('/api/slots', publicSlots)
app.route('/api/reservations', publicReservations)
app.route('/api/auth/line', lineAuthRoute)
app.route('/api/customers', customersRoute)

export default app
