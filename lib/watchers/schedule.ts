export type WatcherFrequency = 'manual' | 'hourly' | 'daily' | 'weekly' | 'monthly'

const DAY_MAP: Record<string, number> = {
  domingo: 0,
  segunda: 1, 'segunda-feira': 1,
  terca: 2, 'terça': 2, 'terça-feira': 2,
  quarta: 3, 'quarta-feira': 3,
  quinta: 4, 'quinta-feira': 4,
  sexta: 5, 'sexta-feira': 5,
  sabado: 6, 'sábado': 6,
}

export function calcNextRunAt(opts: {
  frequency:    WatcherFrequency
  scheduleTime: string | null   // "HH:mm" no timezone informado
  timezone:     string | null
  daysOfWeek:   string[] | null // ['segunda', 'quarta', 'sexta']
  now?:         Date
}): string | null {
  const { frequency, scheduleTime, daysOfWeek } = opts
  const tz  = opts.timezone || 'America/Recife'
  const now = opts.now ?? new Date()

  if (frequency === 'manual') return null

  if (frequency === 'hourly') {
    const next = new Date(now.getTime() + 60 * 60 * 1000)
    next.setMinutes(0, 0, 0)
    return next.toISOString()
  }

  // Parse HH:mm
  let targetH = 8, targetM = 0
  if (scheduleTime) {
    const [hStr, mStr] = scheduleTime.split(':')
    const h = parseInt(hStr ?? '')
    const m = parseInt(mStr ?? '')
    if (!isNaN(h)) targetH = h
    if (!isNaN(m)) targetM = m
  }

  // Converter "now" para o fuso local
  const nowLocal = new Date(now.toLocaleString('en-US', { timeZone: tz }))
  // Offset entre UTC real e data deslocada
  const offsetMs = now.getTime() - nowLocal.getTime()

  // Candidato: hoje no horário alvo (em hora local)
  const candidate = new Date(nowLocal)
  candidate.setHours(targetH, targetM, 0, 0)

  const toUTC = (local: Date) => new Date(local.getTime() + offsetMs)

  if (frequency === 'daily') {
    if (toUTC(candidate) <= now) candidate.setDate(candidate.getDate() + 1)
    return toUTC(candidate).toISOString()
  }

  if (frequency === 'weekly') {
    const allowed = (daysOfWeek ?? [])
      .map(d => DAY_MAP[d.toLowerCase().trim()] ?? -1)
      .filter(d => d >= 0)

    if (allowed.length === 0) {
      candidate.setDate(candidate.getDate() + 7)
      return toUTC(candidate).toISOString()
    }

    for (let off = 0; off <= 7; off++) {
      const try_ = new Date(candidate)
      try_.setDate(try_.getDate() + off)
      if (allowed.includes(try_.getDay()) && toUTC(try_) > now) {
        return toUTC(try_).toISOString()
      }
    }
    candidate.setDate(candidate.getDate() + 7)
    return toUTC(candidate).toISOString()
  }

  if (frequency === 'monthly') {
    if (toUTC(candidate) <= now) candidate.setMonth(candidate.getMonth() + 1)
    return toUTC(candidate).toISOString()
  }

  return null
}
