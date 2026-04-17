import { useEffect, useState } from 'react'
import { api, type AdminReservation } from '../../api'

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

export default function AdminReservations() {
  const [reservations, setReservations] = useState<AdminReservation[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  const load = () =>
    api.getAdminReservations(statusFilter ? { status: statusFilter } : {}).then(setReservations)

  useEffect(() => { load() }, [statusFilter])

  const handleConfirm = async (id: string) => {
    try {
      await api.confirmReservation(id)
      load()
    } catch (err) {
      alert((err as Error).message)
    }
  }

  const handleReject = async () => {
    if (!rejectModal) return
    try {
      await api.rejectReservation(rejectModal.id, rejectReason || undefined)
      setRejectModal(null)
      setRejectReason('')
      load()
    } catch (err) {
      alert((err as Error).message)
    }
  }

  const handleCancel = async (id: string) => {
    if (!confirm('確定取消此預約？')) return
    try {
      await api.cancelReservation(id)
      load()
    } catch (err) {
      alert((err as Error).message)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800">預約管理</h2>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="">全部</option>
          <option value="pending">待確認</option>
          <option value="confirmed">已確認</option>
          <option value="rejected">已拒絕</option>
          <option value="cancelled">已取消</option>
        </select>
      </div>

      <div className="space-y-3">
        {reservations.map((r) => (
          <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-medium text-gray-800">{r.customer_name}</span>
                  <span className="text-sm text-gray-500">{r.customer_phone}</span>
                  {r.line_user_id && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">LINE</span>
                  )}
                </div>
                <div className="text-sm text-gray-600">
                  {new Date(r.start_at).toLocaleString('zh-TW', {
                    month: 'numeric',
                    day: 'numeric',
                    weekday: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  　{r.service_name}
                </div>
                {r.note && <div className="text-sm text-gray-500 mt-1">備註：{r.note}</div>}
                {r.rejection_reason && (
                  <div className="text-sm text-red-500 mt-1">拒絕原因：{r.rejection_reason}</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLOR[r.status]}`}>
                  {STATUS_LABEL[r.status]}
                </span>
                {r.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleConfirm(r.id)}
                      className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-700"
                    >
                      確認
                    </button>
                    <button
                      onClick={() => setRejectModal({ id: r.id })}
                      className="border border-red-300 text-red-600 text-xs px-3 py-1.5 rounded-lg hover:bg-red-50"
                    >
                      拒絕
                    </button>
                  </>
                )}
                {r.status === 'confirmed' && (
                  <button
                    onClick={() => handleCancel(r.id)}
                    className="border border-gray-300 text-gray-600 text-xs px-3 py-1.5 rounded-lg hover:bg-gray-50"
                  >
                    取消預約
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {reservations.length === 0 && (
          <div className="text-center py-12 text-gray-400">尚無預約</div>
        )}
      </div>

      {rejectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-semibold text-gray-800 mb-4">拒絕預約</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="拒絕原因（選填）"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setRejectModal(null)}
                className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm"
              >
                取消
              </button>
              <button
                onClick={handleReject}
                className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600"
              >
                確認拒絕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
