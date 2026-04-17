import { useEffect, useState } from 'react'
import { api, type AdminSlotsResponse, type Slot, type SlotRule } from '../../api'

const DAYS = ['日', '一', '二', '三', '四', '五', '六']
const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六']

function getDateCoverage(
  date: Date,
  rules: SlotRule[],
  overrideDates: Set<string>,
  manualDates: Set<string>
): 'override' | 'rule' | 'manual' | 'none' {
  const dateStr = date.toISOString().slice(0, 10)
  if (overrideDates.has(dateStr)) return 'override'
  if (manualDates.has(dateStr)) return 'manual'
  if (rules.some((r) => r.is_active && r.day_of_week === date.getDay())) return 'rule'
  return 'none'
}

function AdminCalendar({
  year,
  month,
  rules,
  overrideDates,
  manualDates,
  selectedDate,
  onSelect,
}: {
  year: number
  month: number
  rules: SlotRule[]
  overrideDates: Set<string>
  manualDates: Set<string>
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
          const isSelected = selectedDate === dateStr
          const isToday = dateStr === todayStr
          const coverage = getDateCoverage(new Date(dateStr + 'T00:00:00'), rules, overrideDates, manualDates)

          let cls =
            'h-9 rounded-lg text-sm font-medium flex items-center justify-center w-full transition cursor-pointer '
          if (isSelected) {
            cls += 'bg-indigo-600 text-white shadow-sm'
          } else if (coverage === 'override') {
            cls += 'bg-red-100 text-red-400 line-through'
          } else if (coverage === 'manual') {
            cls += 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          } else if (coverage === 'rule') {
            cls += isPast
              ? 'bg-green-50 text-green-300'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          } else {
            cls += isPast ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-100'
          }
          if (isToday && !isSelected) cls += ' ring-2 ring-inset ring-indigo-300'

          return (
            <button
              key={dateStr}
              onClick={() => onSelect(dateStr)}
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

export default function AdminSlots() {
  const [data, setData] = useState<AdminSlotsResponse | null>(null)
  const [tab, setTab] = useState<'calendar' | 'rules' | 'manual'>('calendar')
  const [ruleForm, setRuleForm] = useState({ day_of_week: 1, start_time: '10:00', end_time: '22:00' })
  const [slotForm, setSlotForm] = useState({ start_at: '', end_at: '' })
  const [overrideDate, setOverrideDate] = useState('')
  const [error, setError] = useState('')

  // Calendar tab state
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [daySlotForm, setDaySlotForm] = useState({ start_time: '10:00', end_time: '22:00' })

  // Rule editing state
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null)
  const [editRuleForm, setEditRuleForm] = useState({ day_of_week: 1, start_time: '10:00', end_time: '22:00' })

  const load = () => api.getAdminSlots().then(setData).catch(console.error)
  useEffect(() => { load() }, [])

  const today = new Date()
  const months = [
    { year: today.getFullYear(), month: today.getMonth() },
    {
      year: today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear(),
      month: (today.getMonth() + 1) % 12,
    },
  ]

  const overrideDates = new Set((data?.overrides ?? []).map((o) => o.date))
  const manualDates = new Set((data?.manual ?? []).map((s) => s.start_at.slice(0, 10)))
  const rules = data?.rules ?? []

  const selectedDaySlots = selectedDate
    ? (data?.manual ?? []).filter((s) => s.start_at.slice(0, 10) === selectedDate)
    : []

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

  const handleDeleteRule = async (id: string) => {
    if (!confirm('確定刪除此規則？')) return
    try {
      await api.deleteSlotRule(id)
      load()
    } catch (err) {
      alert((err as Error).message)
    }
  }

  const startEditRule = (rule: SlotRule) => {
    setEditingRuleId(rule.id)
    setEditRuleForm({ day_of_week: rule.day_of_week, start_time: rule.start_time, end_time: rule.end_time })
  }

  const handleSaveRule = async (id: string) => {
    setError('')
    try {
      await api.updateSlotRule(id, editRuleForm)
      setEditingRuleId(null)
      load()
    } catch (err) {
      setError((err as Error).message)
    }
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

  const handleAddDaySlot = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDate) return
    setError('')
    try {
      await api.createSlot({
        start_at: `${selectedDate}T${daySlotForm.start_time}:00`,
        end_at: `${selectedDate}T${daySlotForm.end_time}:00`,
      })
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
        {(['calendar', 'rules', 'manual'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t ? 'bg-indigo-600 text-white' : 'border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t === 'calendar' ? '月曆' : t === 'rules' ? '週期性規則' : '單次時段'}
          </button>
        ))}
      </div>

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

      {tab === 'calendar' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Calendar */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-6">
            {months.map(({ year, month }) => (
              <AdminCalendar
                key={`${year}-${month}`}
                year={year}
                month={month}
                rules={rules}
                overrideDates={overrideDates}
                manualDates={manualDates}
                selectedDate={selectedDate}
                onSelect={setSelectedDate}
              />
            ))}
            <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-green-100 inline-block" />週期規則
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-blue-100 inline-block" />單次時段
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-red-100 inline-block" />已關閉
              </span>
            </div>
          </div>

          {/* Day detail panel */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            {selectedDate ? (
              <>
                <h3 className="text-sm font-medium text-gray-700 mb-4">
                  {new Date(selectedDate + 'T00:00:00').toLocaleDateString('zh-TW', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long',
                  })}
                </h3>

                {/* Existing manual slots for this day */}
                {selectedDaySlots.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-2">已開放時段</p>
                    <div className="space-y-2">
                      {selectedDaySlots.map((slot) => (
                        <div
                          key={slot.id}
                          className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2"
                        >
                          <span className="text-sm text-gray-800">
                            {new Date(slot.start_at).toLocaleTimeString('zh-TW', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {' – '}
                            {new Date(slot.end_at).toLocaleTimeString('zh-TW', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span className="flex items-center gap-2">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                slot.reservation_status === 'confirmed'
                                  ? 'bg-blue-100 text-blue-700'
                                  : slot.reservation_status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {slot.reservation_status === 'confirmed'
                                ? '已預約'
                                : slot.reservation_status === 'pending'
                                ? '待確認'
                                : '開放'}
                            </span>
                            {!slot.reservation_status && (
                              <button
                                onClick={() => handleDeleteSlot(slot.id)}
                                className="text-red-400 hover:text-red-600 text-xs"
                              >
                                刪除
                              </button>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add slot form */}
                <form onSubmit={handleAddDaySlot}>
                  <p className="text-xs text-gray-500 mb-2">新增開放時段</p>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">開始時間</label>
                      <input
                        type="time"
                        value={daySlotForm.start_time}
                        onChange={(e) =>
                          setDaySlotForm({ ...daySlotForm, start_time: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">結束時間</label>
                      <input
                        type="time"
                        value={daySlotForm.end_time}
                        onChange={(e) =>
                          setDaySlotForm({ ...daySlotForm, end_time: e.target.value })
                        }
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700"
                  >
                    開放此時段
                  </button>
                </form>

                {/* Override / close date */}
                {!overrideDates.has(selectedDate) && (
                  <button
                    type="button"
                    onClick={async () => {
                      await api.createSlotOverride(selectedDate)
                      load()
                    }}
                    className="mt-3 w-full border border-orange-300 text-orange-600 px-4 py-2 rounded-lg text-sm hover:bg-orange-50"
                  >
                    關閉此日期
                  </button>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                點選月曆上的日期來管理時段
              </div>
            )}
          </div>
        </div>
      )}

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
                    <option key={i} value={i}>
                      星期{d}
                    </option>
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
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(data?.rules ?? []).map((rule) =>
                  editingRuleId === rule.id ? (
                    <tr key={rule.id} className="bg-indigo-50">
                      <td className="px-3 py-2">
                        <select
                          value={editRuleForm.day_of_week}
                          onChange={(e) => setEditRuleForm({ ...editRuleForm, day_of_week: Number(e.target.value) })}
                          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        >
                          {DAYS.map((d, i) => (
                            <option key={i} value={i}>星期{d}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={editRuleForm.start_time}
                            onChange={(e) => setEditRuleForm({ ...editRuleForm, start_time: e.target.value })}
                            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          />
                          <span className="text-gray-400">–</span>
                          <input
                            type="time"
                            value={editRuleForm.end_time}
                            onChange={(e) => setEditRuleForm({ ...editRuleForm, end_time: e.target.value })}
                            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => handleToggleRule(rule)}
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            rule.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {rule.is_active ? '啟用' : '停用'}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleSaveRule(rule.id)}
                          className="text-indigo-600 hover:underline text-sm mr-3 font-medium"
                        >
                          儲存
                        </button>
                        <button
                          onClick={() => setEditingRuleId(null)}
                          className="text-gray-500 hover:underline text-sm"
                        >
                          取消
                        </button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={rule.id}>
                      <td className="px-4 py-3 text-gray-800">每週{DAYS[rule.day_of_week]}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {rule.start_time} – {rule.end_time}
                      </td>
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
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => startEditRule(rule)}
                          className="text-indigo-600 hover:underline text-sm mr-3"
                        >
                          編輯
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="text-red-500 hover:underline text-sm"
                        >
                          刪除
                        </button>
                      </td>
                    </tr>
                  )
                )}
                {!data?.rules?.length && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                      尚無規則
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'manual' && (
        <div className="space-y-6">
          <form
            onSubmit={handleCreateSlot}
            className="bg-white rounded-xl border border-gray-200 p-5"
          >
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
                {(data?.manual ?? []).map((slot: Slot & { reservation_id?: string; reservation_status?: string }) => (
                  <tr key={slot.id}>
                    <td className="px-4 py-3 text-gray-800">
                      {new Date(slot.start_at).toLocaleString('zh-TW')}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(slot.end_at).toLocaleString('zh-TW')}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          slot.reservation_status === 'confirmed'
                            ? 'bg-blue-100 text-blue-700'
                            : slot.reservation_status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {slot.reservation_status === 'confirmed'
                          ? '已預約'
                          : slot.reservation_status === 'pending'
                          ? '待確認'
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
                {!data?.manual?.length && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                      尚無單次時段
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
