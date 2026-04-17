/** Add minutes to a "YYYY-MM-DDTHH:MM[:SS]" string and return "YYYY-MM-DDTHH:MM:00" */
export function addMinutes(datetimeStr: string, minutes: number): string {
  const m = datetimeStr.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/)
  if (!m) return datetimeStr
  const [, date, h, min] = m
  const total = parseInt(h) * 60 + parseInt(min) + minutes
  const nh = Math.floor(total / 60)
  const nm = total % 60
  return `${date}T${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}:00`
}

/** Return all 30-min slot start times in [startAt, endAt), e.g. ["2024-04-17T10:00:00", "2024-04-17T10:30:00", ...] */
export function halfHourTimesInRange(startAt: string, endAt: string): string[] {
  const ms = startAt.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/)
  const me = endAt.match(/T(\d{2}):(\d{2})/)
  if (!ms || !me) return []
  const [, date, sh, sm] = ms
  const [, eh, em] = me
  const startMins = parseInt(sh) * 60 + parseInt(sm)
  const endMins = parseInt(eh) * 60 + parseInt(em)
  const times: string[] = []
  for (let t = startMins; t < endMins; t += 30) {
    const h = Math.floor(t / 60)
    const min = t % 60
    times.push(`${date}T${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`)
  }
  return times
}
