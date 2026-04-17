/**
 * Expands recurring slot_rules into concrete slot objects for the next `weeks` weeks.
 * Returns slots NOT in slot_overrides (closed dates) and NOT already in the slots table.
 */
export function expandRules(
  rules: Array<{
    id: string
    day_of_week: number
    start_time: string
    end_time: string
    is_active: number
  }>,
  overrideDates: Set<string>,
  existingSlotDates: Set<string>, // "YYYY-MM-DD HH:MM" of existing manual slots
  weeks = 8
): Array<{ id: string; start_at: string; end_at: string; source_rule_id: string }> {
  const result: Array<{ id: string; start_at: string; end_at: string; source_rule_id: string }> =
    []
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  for (const rule of rules) {
    if (!rule.is_active) continue

    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < 7; d++) {
        const candidate = new Date(today)
        candidate.setDate(today.getDate() + w * 7 + d)

        if (candidate.getDay() !== rule.day_of_week) continue
        if (candidate < today) continue

        const dateStr = candidate.toISOString().slice(0, 10) // YYYY-MM-DD
        if (overrideDates.has(dateStr)) continue

        const [startH, startM] = rule.start_time.split(':').map(Number)
        const [endH, endM] = rule.end_time.split(':').map(Number)
        const startMinutes = startH * 60 + startM
        const endMinutes = endH * 60 + endM

        for (let t = startMinutes; t < endMinutes; t += 30) {
          const sh = Math.floor(t / 60)
          const sm = t % 60
          const eh = Math.floor((t + 30) / 60)
          const em = (t + 30) % 60
          const start_at = `${dateStr}T${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}:00`
          const end_at = `${dateStr}T${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}:00`

          if (existingSlotDates.has(start_at)) continue

          result.push({
            id: crypto.randomUUID(),
            start_at,
            end_at,
            source_rule_id: rule.id,
          })
        }
      }
    }
  }

  return result
}
