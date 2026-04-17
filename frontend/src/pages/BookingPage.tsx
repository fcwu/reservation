import { useEffect, useState } from 'react'
import { api, type Service, type Slot, type ReservationSubmit } from '../api'

declare global {
  interface Window {
    liff: {
      init: (config: { liffId: string }) => Promise<void>
      isLoggedIn: () => boolean
      login: () => void
      getIDToken: () => string | null
    }
  }
}

const LIFF_ID = import.meta.env.VITE_LIFF_ID ?? ''
const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六']

function MonthCalendar({
  year,
  month,
  slotDates,
  bookedDates,
  selectedDate,
  onSelect,
}: {
  year: number
  month: number
  slotDates: Set<string>
  bookedDates: Set<string>
  selectedDate: string | null
  onSelect: (date: string) => void
}) {
  const todayStr = new Date().toISOString().slice(0, 10)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDow = new Date(year, month, 1).getDay()

  const cells: (number | null)[] = Array(firstDow).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div>
      <div className="text-sm font-semibold text-gray-700 mb-3 text-center">
        {year} 年 {month + 1} 月
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 mb-1">
        {WEEK_LABELS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isPast = dateStr < todayStr
          const hasSlots = slotDates.has(dateStr)
          const isBooked = bookedDates.has(dateStr)
          const isSelected = selectedDate === dateStr
          const isToday = dateStr === todayStr

          let cls =
            'h-9 rounded-lg text-sm font-medium flex items-center justify-center w-full transition '
          if (isPast) {
            cls += 'text-gray-300'
          } else if (isSelected) {
            cls += 'bg-indigo-600 text-white shadow-sm'
          } else if (hasSlots) {
            cls += 'bg-blue-100 text-blue-700 hover:bg-blue-200 cursor-pointer'
          } else if (isBooked) {
            cls += 'bg-gray-100 text-gray-400'
          } else {
            cls += 'text-gray-400'
          }
          if (isToday && !isSelected) cls += ' ring-2 ring-inset ring-indigo-300'

          return (
            <button
              key={dateStr}
              disabled={!hasSlots || isPast}
              onClick={() => hasSlots && !isPast && onSelect(dateStr)}
              className={cls}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function BookingPage() {
  const [slots, setSlots] = useState<Slot[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [bookedDates, setBookedDates] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selected, setSelected] = useState<Slot | null>(null)
  const [form, setForm] = useState({ service_id: '', name: '', phone: '', note: '' })
  const [lineUserId, setLineUserId] = useState<string | null>(null)
  const [liffReady, setLiffReady] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getSlots().then(({ slots, services, bookedDates }) => {
      setSlots(slots)
      setServices(services)
      setBookedDates(bookedDates ?? [])
      if (services.length > 0) setForm((f) => ({ ...f, service_id: services[0].id }))
    })

    if (LIFF_ID) {
      const script = document.createElement('script')
      script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js'
      script.onload = () => {
        window.liff.init({ liffId: LIFF_ID }).then(() => setLiffReady(true))
      }
      document.head.appendChild(script)
    }
  }, [])

  const today = new Date()
  const months = [
    { year: today.getFullYear(), month: today.getMonth() },
    {
      year: today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear(),
      month: (today.getMonth() + 1) % 12,
    },
  ]

  const slotsByDate = new Map<string, Slot[]>()
  for (const slot of slots) {
    const date = slot.start_at.slice(0, 10)
    if (!slotsByDate.has(date)) slotsByDate.set(date, [])
    slotsByDate.get(date)!.push(slot)
  }

  const slotDates = new Set(slotsByDate.keys())
  const bookedDatesSet = new Set(bookedDates)
  const daySlotsForSelected = selectedDate ? (slotsByDate.get(selectedDate) ?? []) : []

  const handlePhoneBlur = async () => {
    if (form.phone.length >= 8) {
      const res = await api.lookupCustomer(form.phone).catch(() => null)
      if (res?.found && res.name) setForm((f) => ({ ...f, name: res.name! }))
    }
  }

  const handleLineLogin = async () => {
    if (!liffReady) return
    if (!window.liff.isLoggedIn()) {
      window.liff.login()
      return
    }
    const idToken = window.liff.getIDToken()
    if (!idToken) return
    try {
      const { line_user_id } = await api.verifyLineToken(idToken, form.phone || undefined)
      setLineUserId(line_user_id)
    } catch {
      alert('LINE 登入驗證失敗，請稍後再試')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    setSubmitting(true)
    setError('')
    try {
      const payload: ReservationSubmit = {
        slot_id: selected.id,
        service_id: form.service_id,
        name: form.name,
        phone: form.phone,
        note: form.note || undefined,
        line_user_id: lineUserId ?? undefined,
        start_at: selected.start_at,
        end_at: selected.end_at,
        source_rule_id: selected.source_rule_id ?? undefined,
      }
      await api.submitReservation(payload)
      setSubmitted(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-sm w-full text-center">
          <div className="text-4xl mb-4">✅</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">預約申請已送出</h2>
          <p className="text-gray-500 text-sm">等待業主確認後，將透過 LINE 通知您。</p>
          <button
            onClick={() => {
              setSubmitted(false)
              setSelected(null)
              setSelectedDate(null)
            }}
            className="mt-6 text-indigo-600 hover:underline text-sm"
          >
            再次預約
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-semibold text-gray-800 mb-6 text-center">線上預約</h1>

        {!selected ? (
          <div className="space-y-4">
            {/* Calendar */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="space-y-6">
                {months.map(({ year, month }) => (
                  <MonthCalendar
                    key={`${year}-${month}`}
                    year={year}
                    month={month}
                    slotDates={slotDates}
                    bookedDates={bookedDatesSet}
                    selectedDate={selectedDate}
                    onSelect={setSelectedDate}
                  />
                ))}
              </div>
              <div className="flex items-center gap-5 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-blue-200 inline-block" />
                  可預約
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-gray-200 inline-block" />
                  已額滿
                </span>
              </div>
            </div>

            {/* Day time slots */}
            {selectedDate && daySlotsForSelected.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h2 className="text-sm font-medium text-gray-700 mb-3">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('zh-TW', {
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long',
                  })}{' '}
                  可選時段
                </h2>
                <div className="space-y-2">
                  {daySlotsForSelected.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => setSelected(slot)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-left hover:border-indigo-400 hover:shadow-sm transition"
                    >
                      <span className="font-medium text-gray-800">
                        {new Date(slot.start_at).toLocaleTimeString('zh-TW', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="text-gray-400 mx-2">–</span>
                      <span className="text-sm text-gray-500">
                        {new Date(slot.end_at).toLocaleTimeString('zh-TW', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {slots.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">目前沒有開放的預約時段</div>
            )}
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">填寫預約資料</h2>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-sm text-indigo-600 hover:underline"
              >
                重選時段
              </button>
            </div>

            <div className="bg-indigo-50 rounded-lg px-4 py-3 text-sm text-indigo-800">
              {new Date(selected.start_at).toLocaleString('zh-TW', {
                month: 'long',
                day: 'numeric',
                weekday: 'long',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">服務項目</label>
              <select
                required
                value={form.service_id}
                onChange={(e) => setForm({ ...form, service_id: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}（{s.duration_minutes} 分）NT$ {s.price.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">電話號碼</label>
              <input
                required
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                onBlur={handlePhoneBlur}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="0912345678"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">姓名</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="王小明"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">備註（選填）</label>
              <textarea
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            <div className="border-t border-gray-100 pt-4">
              {lineUserId ? (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                  ✓ 已綁定 LINE 通知
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleLineLogin}
                  className="w-full flex items-center justify-center gap-2 border border-green-400 text-green-700 px-4 py-2 rounded-lg text-sm hover:bg-green-50 transition"
                >
                  <span className="text-lg">💬</span>
                  以 LINE 接收預約通知（選填）
                </button>
              )}
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition disabled:opacity-60"
            >
              {submitting ? '送出中...' : '送出預約'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
