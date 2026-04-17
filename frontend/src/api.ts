const BASE = import.meta.env.VITE_API_BASE_URL ?? ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    if (res.status === 401 && window.location.pathname.startsWith('/admin') && !window.location.pathname.startsWith('/admin/login')) {
      window.location.href = '/admin/login'
      throw new Error('Unauthorized')
    }
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error: string }).error ?? res.statusText)
  }
  return res.json()
}

export const api = {
  // Auth
  getMe: () => request<{ authenticated: boolean; email?: string }>('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),

  // Public
  getSlots: () =>
    request<{
      slots: Slot[]
      services: Service[]
    }>('/api/slots'),

  submitReservation: (data: ReservationSubmit) =>
    request<{ id: string; status: string }>('/api/reservations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMyReservations: (phone: string) =>
    request<ReservationItem[]>(`/api/reservations?phone=${encodeURIComponent(phone)}`),

  lookupCustomer: (phone: string) =>
    request<{ found: boolean; name?: string }>(
      `/api/customers/lookup?phone=${encodeURIComponent(phone)}`
    ),

  verifyLineToken: (id_token: string, phone?: string) =>
    request<{ line_user_id: string }>('/api/auth/line', {
      method: 'POST',
      body: JSON.stringify({ id_token, phone }),
    }),

  // Admin — Services
  getServices: () => request<Service[]>('/api/admin/services'),
  createService: (data: Partial<Service>) =>
    request<Service>('/api/admin/services', { method: 'POST', body: JSON.stringify(data) }),
  updateService: (id: string, data: Partial<Service>) =>
    request<Service>(`/api/admin/services/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteService: (id: string) =>
    request(`/api/admin/services/${id}`, { method: 'DELETE' }),

  // Admin — Slots
  getAdminSlots: () => request<AdminSlotsResponse>('/api/admin/slots'),
  createSlot: (data: { start_at: string; end_at: string }) =>
    request<Slot>('/api/admin/slots', { method: 'POST', body: JSON.stringify(data) }),
  deleteSlot: (id: string) => request(`/api/admin/slots/${id}`, { method: 'DELETE' }),
  createSlotRule: (data: { day_of_week: number; start_time: string; end_time: string }) =>
    request('/api/admin/slots/rules', { method: 'POST', body: JSON.stringify(data) }),
  updateSlotRule: (id: string, data: Partial<SlotRule>) =>
    request(`/api/admin/slots/rules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  createSlotOverride: (date: string) =>
    request('/api/admin/slots/overrides', { method: 'POST', body: JSON.stringify({ date }) }),

  // Admin — Reservations
  getAdminReservations: (params?: { status?: string; date?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString()
    return request<AdminReservation[]>(`/api/admin/reservations${qs ? `?${qs}` : ''}`)
  },
  confirmReservation: (id: string) =>
    request(`/api/admin/reservations/${id}/confirm`, { method: 'POST' }),
  rejectReservation: (id: string, reason?: string) =>
    request(`/api/admin/reservations/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  cancelReservation: (id: string) =>
    request(`/api/admin/reservations/${id}/cancel`, { method: 'POST' }),
  sendReservationMessage: (id: string, message: string) =>
    request(`/api/admin/reservations/${id}/message`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    }),
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface Service {
  id: string
  name: string
  duration_minutes: number
  price: number
  is_active: number
}

export interface Slot {
  id: string
  start_at: string
  end_at: string
  is_available: number
  source_rule_id: string | null
  type?: 'manual' | 'recurring'
}

export interface SlotRule {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_active: number
}

export interface AdminSlotsResponse {
  manual: (Slot & { reservation_id?: string; reservation_status?: string })[]
  recurring: Slot[]
  rules: SlotRule[]
  overrides: { date: string }[]
}

export interface ReservationSubmit {
  slot_id: string
  service_id: string
  name: string
  phone: string
  note?: string
  line_user_id?: string
  start_at?: string
  end_at?: string
  source_rule_id?: string
}

export interface ReservationItem {
  id: string
  status: string
  note: string | null
  rejection_reason: string | null
  created_at: string
  service_name: string
  duration_minutes: number
  price: number
  start_at: string
  end_at: string
}

export interface AdminReservation {
  id: string
  status: string
  customer_name: string
  customer_phone: string
  line_user_id: string | null
  service_name: string
  start_at: string
  end_at: string
  note: string | null
  rejection_reason: string | null
  created_at: string
}
