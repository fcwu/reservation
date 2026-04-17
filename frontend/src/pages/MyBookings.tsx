import { useState } from 'react'
import { api, type ReservationItem } from '../api'

const STATUS_LABEL: Record<string, string> = {
  pending: '待確認',
  confirmed: '已確認',
  rejected: '已拒絕',
  cancelled: '已取消',
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
  cancelled: 'bg-gray-100 text-gray-500',
}

export default function MyBookings() {
  const [phone, setPhone] = useState('')
  const [reservations, setReservations] = useState<ReservationItem[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const results = await api.getMyReservations(phone)
      setReservations(results)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-800 mb-6 text-center">查詢我的預約</h1>

        <form onSubmit={handleSearch} className="flex gap-2 mb-6">
          <input
            required
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="輸入預約時使用的電話號碼"
            className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
          >
            查詢
          </button>
        </form>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {reservations !== null && (
          <div className="space-y-3">
            {reservations.map((r) => (
              <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-gray-800 mb-0.5">
                      {r.service_name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(r.start_at).toLocaleString('zh-TW', {
                        month: 'numeric',
                        day: 'numeric',
                        weekday: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      NT$ {r.price.toLocaleString()}　{r.duration_minutes} 分鐘
                    </div>
                    {r.rejection_reason && (
                      <div className="text-xs text-red-500 mt-1">原因：{r.rejection_reason}</div>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[r.status]}`}>
                    {STATUS_LABEL[r.status]}
                  </span>
                </div>
              </div>
            ))}
            {reservations.length === 0 && (
              <div className="text-center py-12 text-gray-400">查無預約紀錄</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
