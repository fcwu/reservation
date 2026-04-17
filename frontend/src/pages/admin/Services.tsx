import { useEffect, useState } from 'react'
import { api, type Service } from '../../api'

export default function AdminServices() {
  const [services, setServices] = useState<Service[]>([])
  const [form, setForm] = useState({ name: '', duration_minutes: 60, price: 0 })
  const [editing, setEditing] = useState<Service | null>(null)
  const [error, setError] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const load = () => api.getServices().then(setServices).catch(console.error)
  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      if (editing) {
        await api.updateService(editing.id, form)
        setEditing(null)
      } else {
        await api.createService(form)
      }
      setForm({ name: '', duration_minutes: 60, price: 0 })
      load()
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await api.deleteService(id)
      setConfirmDeleteId(null)
      load()
    } catch (err) {
      setConfirmDeleteId(null)
      setError((err as Error).message)
    }
  }

  const toggleActive = async (s: Service) => {
    await api.updateService(s.id, { is_active: s.is_active ? 0 : 1 } as unknown as Partial<Service>)
    load()
  }

  const startEdit = (s: Service) => {
    setEditing(s)
    setForm({ name: s.name, duration_minutes: s.duration_minutes, price: s.price })
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-800 mb-6">服務項目管理</h2>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-4">
          {editing ? '編輯服務' : '新增服務'}
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">服務名稱</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="例：剪髮"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">時長（分鐘）</label>
            <input
              required
              type="number"
              min={15}
              value={form.duration_minutes}
              onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">價格（元）</label>
            <input
              required
              type="number"
              min={0}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        <div className="flex gap-2 mt-4">
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 transition"
          >
            {editing ? '儲存變更' : '新增服務'}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => { setEditing(null); setForm({ name: '', duration_minutes: 60, price: 0 }) }}
              className="border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              取消
            </button>
          )}
        </div>
      </form>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">名稱</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">時長</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">價格</th>
              <th className="text-left px-4 py-3 text-gray-600 font-medium">狀態</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {services.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 text-gray-800">{s.name}</td>
                <td className="px-4 py-3 text-gray-600">{s.duration_minutes} 分</td>
                <td className="px-4 py-3 text-gray-600">NT$ {s.price.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(s)}
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      s.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {s.is_active ? '啟用' : '停用'}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  {confirmDeleteId === s.id ? (
                    <span className="inline-flex gap-2 items-center">
                      <span className="text-sm text-gray-600">確定刪除？</span>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-red-600 font-medium hover:underline text-sm"
                      >
                        確認
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-gray-500 hover:underline text-sm"
                      >
                        取消
                      </button>
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(s)}
                        className="text-indigo-600 hover:underline mr-3"
                      >
                        編輯
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(s.id)}
                        className="text-red-500 hover:underline"
                      >
                        刪除
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {services.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  尚無服務項目
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
