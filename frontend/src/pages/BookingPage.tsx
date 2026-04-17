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
const THIRTY_MIN_MS = 30 * 60 * 1000

function addTwoHours(start_at: string): string {
  const m = start_at.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/)
  if (!m) return start_at
  const [, date, h, min] = m
  const total = parseInt(h) * 60 + parseInt(min) + 120
  return `${date}T${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}:00`
}

function getAvailableWindows(slots: Slot[]): Slot[] {
  const times = new Set(slots.map((s) => new Date(s.start_at).getTime()))
  return slots.filter((s) => {
    const t = new Date(s.start_at).getTime()
    return (
      times.has(t + THIRTY_MIN_MS) &&
      times.has(t + 2 * THIRTY_MIN_MS) &&
      times.has(t + 3 * THIRTY_MIN_MS)
    )
  })
}

function fmtTime(s: string) {
  return new Date(s).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
}

// ── Calendar ──────────────────────────────────────────────────────────────────

function BookingCalendar({
  year,
  month,
  slotDates,
  bookedDates,
  closedDates,
  selectedDate,
  onSelect,
  onPrev,
  onNext,
}: {
  year: number
  month: number
  slotDates: Set<string>
  bookedDates: Set<string>
  closedDates: Set<string>
  selectedDate: string | null
  onSelect: (date: string) => void
  onPrev: () => void
  onNext: () => void
}) {
  const todayStr = new Date().toISOString().slice(0, 10)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDow = new Date(year, month, 1).getDay()

  const cells: (number | null)[] = Array(firstDow).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="bg-white">
      {/* Month navigation */}
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={onPrev} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-indigo-600 text-lg">
          ‹
        </button>
        <span className="text-sm font-semibold text-gray-700">
          {month + 1} 月 {year}
        </span>
        <button onClick={onNext} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-indigo-600 text-lg">
          ›
        </button>
      </div>

      {/* Week header */}
      <div className="grid grid-cols-7 text-center text-xs text-gray-400 pb-1 border-b border-gray-100">
        {WEEK_LABELS.map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 py-2">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isPast = dateStr < todayStr
          const isSelected = selectedDate === dateStr
          const isToday = dateStr === todayStr
          const isClosed = closedDates.has(dateStr)
          const hasSlots = slotDates.has(dateStr)
          const isBooked = bookedDates.has(dateStr)
          const isAvailable = hasSlots && !isClosed

          let dayClass = 'mx-auto w-9 h-9 flex items-center justify-center rounded-full text-sm transition select-none '

          if (isSelected) {
            dayClass += 'bg-blue-600 text-white font-semibold'
          } else if (isToday && isAvailable) {
            dayClass += 'border-2 border-red-400 text-red-500 font-semibold cursor-pointer hover:bg-red-50'
          } else if (isAvailable) {
            dayClass += 'border-2 border-blue-400 text-blue-600 font-semibold cursor-pointer hover:bg-blue-50'
          } else if (isPast) {
            dayClass += 'text-gray-300'
          } else if (isClosed || isBooked) {
            dayClass += 'text-gray-400'
          } else {
            dayClass += 'text-gray-400'
          }

          return (
            <div key={dateStr} className="flex justify-center py-1">
              <button
                disabled={!isAvailable || isPast}
                onClick={() => isAvailable && !isPast && onSelect(dateStr)}
                className={dayClass}
              >
                {day}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BookingPage() {
  const [slots, setSlots] = useState<Slot[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [bookedDates, setBookedDates] = useState<string[]>([])
  const [closedDates, setClosedDates] = useState<string[]>([])
  const [calYear, setCalYear] = useState(() => new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selected, setSelected] = useState<Slot | null>(null)
  const [form, setForm] = useState({ service_id: '', name: '', phone: '', note: '' })
  const [lineUserId, setLineUserId] = useState<string | null>(null)
  const [liffReady, setLiffReady] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getSlots().then(({ slots, services, bookedDates, closedDates }) => {
      setSlots(slots)
      setServices(services)
      setBookedDates(bookedDates ?? [])
      setClosedDates(closedDates ?? [])
      if (services.length > 0) setForm((f) => ({ ...f, service_id: services[0].id }))
    })
    if (LIFF_ID) {
      const script = document.createElement('script')
      script.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js'
      script.onload = () => window.liff.init({ liffId: LIFF_ID }).then(() => setLiffReady(true))
      document.head.appendChild(script)
    }
  }, [])

  const slotsByDate = new Map<string, Slot[]>()
  for (const slot of slots) {
    const d = slot.start_at.slice(0, 10)
    if (!slotsByDate.has(d)) slotsByDate.set(d, [])
    slotsByDate.get(d)!.push(slot)
  }

  const slotDates = new Set(slotsByDate.keys())
  const bookedSet = new Set(bookedDates)
  const closedSet = new Set(closedDates)

  const windows = selectedDate ? getAvailableWindows(slotsByDate.get(selectedDate) ?? []) : []

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
    else setCalMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
    else setCalMonth(m => m + 1)
  }

  const handlePhoneBlur = async () => {
    if (form.phone.length >= 8) {
      const res = await api.lookupCustomer(form.phone).catch(() => null)
      if (res?.found && res.name) setForm((f) => ({ ...f, name: res.name! }))
    }
  }

  const handleLineLogin = async () => {
    if (!liffReady) return
    if (!window.liff.isLoggedIn()) { window.liff.login(); return }
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
            onClick={() => { setSubmitted(false); setSelected(null); setSelectedDate(null) }}
            className="mt-6 text-indigo-600 hover:underline text-sm"
          >
            再次預約
          </button>
        </div>
      </div>
    )
  }

  if (selected) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl font-semibold text-gray-800 mb-6 text-center">線上預約</h1>
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">填寫預約資料</h2>
              <button type="button" onClick={() => setSelected(null)} className="text-sm text-indigo-600 hover:underline">
                重選時段
              </button>
            </div>

            <div className="bg-indigo-50 rounded-lg px-4 py-3 text-sm text-indigo-800 font-medium">
              {new Date(selected.start_at).toLocaleDateString('zh-TW', {
                month: 'long', day: 'numeric', weekday: 'long',
              })}　{fmtTime(selected.start_at)} – {fmtTime(selected.end_at)}
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">服務項目</label>
              <select required value={form.service_id}
                onChange={(e) => setForm({ ...form, service_id: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}（{s.duration_minutes} 分）NT$ {s.price.toLocaleString()}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">電話號碼</label>
              <input required type="tel" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                onBlur={handlePhoneBlur}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="0912345678" />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">姓名</label>
              <input required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="王小明" />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">備註（選填）</label>
              <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
            </div>

            <div className="border-t border-gray-100 pt-4">
              {lineUserId ? (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">✓ 已綁定 LINE 通知</div>
              ) : (
                <button type="button" onClick={handleLineLogin}
                  className="w-full flex items-center justify-center gap-2 border border-green-400 text-green-700 px-4 py-2 rounded-lg text-sm hover:bg-green-50 transition">
                  <span className="text-lg">💬</span>以 LINE 接收預約通知（選填）
                </button>
              )}
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button type="submit" disabled={submitting}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition disabled:opacity-60">
              {submitting ? '送出中...' : '送出預約'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto">
        <div className="px-4 pt-6 pb-2">
          <h1 className="text-xl font-semibold text-gray-800 text-center">請選擇日期</h1>
        </div>

        {/* Calendar */}
        <div className="bg-white shadow-sm">
          <BookingCalendar
            year={calYear}
            month={calMonth}
            slotDates={slotDates}
            bookedDates={bookedSet}
            closedDates={closedSet}
            selectedDate={selectedDate}
            onSelect={(d) => { setSelectedDate(d); setSelected(null) }}
            onPrev={prevMonth}
            onNext={nextMonth}
          />
        </div>

        {/* Time slot picker */}
        {selectedDate && (
          <div>
            <div className="px-4 py-3 bg-gray-100 border-t border-b border-gray-200">
              <span className="text-sm font-medium text-gray-700">請選擇預約時間</span>
            </div>

            {closedSet.has(selectedDate) ? (
              <div className="px-4 py-8 text-center text-gray-400 bg-white text-sm">此日期業主已關閉預約</div>
            ) : windows.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 bg-white text-sm">今日無完整兩小時可預約時段</div>
            ) : (
              <div className="bg-white px-4 py-4 grid grid-cols-3 gap-3">
                {windows.map((slot) => {
                  const endAt = addTwoHours(slot.start_at)
                  return (
                    <button
                      key={slot.id}
                      onClick={() => setSelected({ ...slot, end_at: endAt })}
                      className="border border-gray-300 rounded-2xl py-3 text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition"
                    >
                      {fmtTime(slot.start_at)}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {!selectedDate && (
          <div className="px-4 py-8 text-center text-gray-400 bg-white mt-0.5 text-sm">
            請點選上方有藍色圓圈的日期
          </div>
        )}
      </div>
    </div>
  )
}
