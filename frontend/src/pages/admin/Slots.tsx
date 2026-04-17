import { useEffect, useState } from 'react'
import { api, type AdminSlotsResponse, type SlotRule } from '../../api'

const DAYS = ['日', '一', '二', '三', '四', '五', '六']

export default function AdminSlots() {
  const [data, setData] = useState<AdminSlotsResponse | null>(null)
  const [tab, setTab] = useState<'manual' | 'rules'>('rules')
  const [ruleForm, setRuleForm] = useState({ day_of_week: 1, start_time: '09:00', end_time: '17:00' })
  const [slotForm, setSlotForm] = useState({ start_at: '', end_at: '' })
  const [overrideDate, setOverrideDate] = useState('')
  const [error, setError] = useState('')

  const load = () => api.getAdminSlots().then(setData).catch(console.error)
  useEffect(() => { load() }, [])

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await api.createSlotRule(ruleForm)
      load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const handleToggleRule = async (rule: SlotRule) => {
    await api.updateSlotRule(rule.id, { is_active: rule.is_active ? 0 : 1 })
    load()
  }

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await api.createSlot(slotForm)
      setSlotForm({ start_at: '', end_at: '' })
      load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const handleDeleteSlot = async (id: string) => {
    if (!confirm('確定刪除此時段？')) return
    try {
      await api.deleteSlot(id)
      load()
    } catch (err) {
      alert((err as Error).message)
    }
  }

  const handleOverride = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!overrideDate) return
    await api.createSlotOverride(overrideDate)
    setOverrideDate('')
    load()
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-6">時段設定</h2>

      <div className="flex gap-2 mb-6">
        {(['rules', 'manual'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t ? 'bg-indigo-600 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t === 'rules' ? '週期性規則' : '單次時段'}
          </button>
        ))}
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {tab === 'rules' && (
        <div className="space-y-6">
          <form onSubmit={handleCreateRule} className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-medium text-gray-700 mb-4">新增週期性規則</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">星期</label>
                <select
                  value={ruleForm.day_of_week}
                  onChange={(e) => setRuleForm({ ...ruleForm, day_of_week: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                  {DAYS.map((d, i) => (
                    <option key={i} value={i}>星期{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">開始時間</label>
                <input
                  type="time"
                  value={ruleForm.start_time}
                  onChange={(e) => setRuleForm({ ...ruleForm, start_time: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">結束時間</label>
                <input
                  type="time"
                  value={ruleForm.end_time}
                  onChange={(e) => setRuleForm({ ...ruleForm, end_time: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
            </div>
            <button
              type="submit"
              className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
            >
              新增規則
            </button>
          </form>

          <form onSubmit={handleOverride} className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-medium text-gray-700 mb-4">關閉特定日期</h3>
            <div className="flex gap-3 items-end">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">日期</label>
                <input
                  type="date"
                  value={overrideDate}
                  onChange={(e) => setOverrideDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <button
                type="submit"
                className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-600"
              >
                關閉此日期
              </button>
            </div>
          </form>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">星期</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">時間</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(data?.rules ?? []).map((rule) => (
                  <tr key={rule.id}>
                    <td className="px-4 py-3 text-gray-800">每週{DAYS[rule.day_of_week]}</td>
                    <td className="px-4 py-3 text-gray-600">{rule.start_time} – {rule.end_time}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleRule(rule)}
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          rule.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {rule.is_active ? '啟用' : '停用'}
                      </button>
                    </td>
                  </tr>
                ))}
                {(!data?.rules?.length) && (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">尚無規則</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'manual' && (
        <div className="space-y-6">
          <form onSubmit={handleCreateSlot} className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-medium text-gray-700 mb-4">新增單次時段</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">開始時間</label>
                <input
                  required
                  type="datetime-local"
                  value={slotForm.start_at}
                  onChange={(e) => setSlotForm({ ...slotForm, start_at: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">結束時間</label>
                <input
                  required
                  type="datetime-local"
                  value={slotForm.end_at}
                  onChange={(e) => setSlotForm({ ...slotForm, end_at: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
            </div>
            <button
              type="submit"
              className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
            >
              新增時段
            </button>
          </form>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">開始時間</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">結束時間</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">狀態</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(data?.manual ?? []).map((slot) => (
                  <tr key={slot.id}>
                    <td className="px-4 py-3 text-gray-800">{new Date(slot.start_at).toLocaleString('zh-TW')}</td>
                    <td className="px-4 py-3 text-gray-600">{new Date(slot.end_at).toLocaleString('zh-TW')}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        slot.reservation_status === 'confirmed'
                          ? 'bg-blue-100 text-blue-700'
                          : slot.reservation_status === 'pending'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {slot.reservation_status === 'confirmed' ? '已預約'
                          : slot.reservation_status === 'pending' ? '待確認'
                          : '開放'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="text-red-500 hover:underline text-sm"
                      >
                        刪除
                      </button>
                    </td>
                  </tr>
                ))}
                {(!data?.manual?.length) && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">尚無單次時段</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
