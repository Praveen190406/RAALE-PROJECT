import { createContext, useContext, useReducer, useEffect, useRef } from 'react'
import { PATIENTS }       from '../data/patients'
import { DRUG_REGISTRY, HIGH_RISK_COUNT } from '../data/drugs'
import { WARDS }          from '../data/wards'
import { generateAlarm, buildSeedAlarms } from '../engine/alarmStream'
import { analysePatterns } from '../engine/patternAnalyser'

/* ============================================================
   Stats computation
   ============================================================ */
const ONE_HOUR    = 60 * 60 * 1_000
const TWENTY_FOUR = 24 * 60 * 60 * 1_000

function todayStartMs() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/**
 * Compute dashboard stat cards values from the alarm stream.
 * Returns an object matching the STATS id keys used by Dashboard.
 */
function computeStats(alarms) {
  const now        = Date.now()
  const todayStart = todayStartMs()
  const active     = alarms.filter((a) => a.status === 'Active')
  const last1h     = alarms.filter((a) => now - a.timestamp < ONE_HOUR)
  const prev1h     = alarms.filter(
    (a) => now - a.timestamp >= ONE_HOUR && now - a.timestamp < 2 * ONE_HOUR
  )

  const missedActive = active.filter((a) => a.type === 'Missed Dose')
  const prevMissed   = prev1h.filter((a) => a.type === 'Missed Dose' && a.status === 'Active')

  const resolvedToday = alarms.filter(
    (a) => a.status === 'Resolved' && a.timestamp >= todayStart
  )

  const escalations24h = alarms.filter(
    (a) => a.type === 'Escalation' && now - a.timestamp < TWENTY_FOUR
  )

  const activeDelta = last1h.filter((a) => a.status === 'Active').length -
                      prev1h.filter((a) => a.status === 'Active').length

  const missedDelta = missedActive.length - prevMissed.length

  return {
    activeAlarms:    active.length,
    activeDelta,
    missedDoses:     missedActive.length,
    missedDelta,
    resolvedToday:   resolvedToday.length,
    highRiskDrugs:   HIGH_RISK_COUNT,
    wardsMonitored:  WARDS.length,
    escalations24h:  escalations24h.length,
  }
}

/**
 * Compute per-ward risk scores and alarm counts.
 * Risk score formula: base(35) + Σ severityWeight(active alarms), capped at 100.
 * Trend: compare active alarms in last 30 min vs previous 30 min window.
 */
function computeWardStats(alarms) {
  const now  = Date.now()
  const SEV  = { critical: 18, high: 12, medium: 7, low: 3 }
  const HALF = 30 * 60 * 1_000

  return WARDS.map((ward) => {
    const wardAlarms   = alarms.filter((a) => a.wardId === ward.id)
    const activeAlarms = wardAlarms.filter((a) => a.status === 'Active')

    const rawRisk = activeAlarms.reduce((sum, a) => sum + (SEV[a.severity] || 3), 0)
    const risk    = Math.min(100, 35 + rawRisk)

    // Trend: count Active alarms in last 30min vs prior 30min
    const recent = wardAlarms.filter((a) => now - a.timestamp < HALF && a.status === 'Active').length
    const prior  = wardAlarms.filter(
      (a) => now - a.timestamp >= HALF && now - a.timestamp < HALF * 2 && a.status === 'Active'
    ).length
    const trend  = recent > prior ? 'up' : recent < prior ? 'down' : 'stable'

    return {
      wardId: ward.id,
      ward:   ward.name,
      alarms: activeAlarms.length,
      risk,
      trend,
    }
  }).sort((a, b) => b.risk - a.risk)
}

/* ============================================================
   Reducer
   ============================================================ */
const MAX_ALARMS = 500  // cap stream to avoid unbounded growth

function reducer(state, action) {
  switch (action.type) {

    case 'ADD_ALARM': {
      const alarms = [action.payload, ...state.alarms].slice(0, MAX_ALARMS)
      return {
        ...state,
        alarms,
        stats:     computeStats(alarms),
        wardStats: computeWardStats(alarms),
      }
    }

    case 'ADD_MULTIPLE_ALARMS': {
      const alarms = [...action.payload, ...state.alarms].slice(0, MAX_ALARMS)
      return {
        ...state,
        alarms,
        stats:     computeStats(alarms),
        wardStats: computeWardStats(alarms),
      }
    }

    case 'SET_ALARMS': {
      return {
        ...state,
        alarms: action.payload,
        stats:     computeStats(action.payload),
        wardStats: computeWardStats(action.payload),
      }
    }

    case 'ACKNOWLEDGE_ALARM': {
      const alarms = state.alarms.map((a) =>
        a.id === action.payload ? { ...a, status: 'Acknowledged' } : a
      )
      return {
        ...state,
        alarms,
        stats:     computeStats(alarms),
        wardStats: computeWardStats(alarms),
      }
    }

    case 'RESOLVE_ALARM': {
      const alarms = state.alarms.map((a) =>
        a.id === action.payload ? { ...a, status: 'Resolved' } : a
      )
      return {
        ...state,
        alarms,
        stats:     computeStats(alarms),
        wardStats: computeWardStats(alarms),
      }
    }

    case 'UPDATE_PATTERNS': {
      // Merge: preserve firstDetectedAt for already-known patterns
      const existingMap = new Map(state.patterns.map((p) => [p.id, p]))
      const merged = action.payload.map((p) => {
        const prev = existingMap.get(p.id)
        return prev ? { ...p, firstDetectedAt: prev.firstDetectedAt ?? prev.detectedAt } : { ...p, firstDetectedAt: p.detectedAt }
      })
      return { ...state, patterns: merged }
    }

    case 'TOGGLE_STREAM':
      return { ...state, isStreaming: !state.isStreaming }

    default:
      return state
  }
}

/* ============================================================
   Initial state
   ============================================================ */
const seedAlarms = buildSeedAlarms()

const initialState = {
  alarms:      seedAlarms,
  patients:    PATIENTS,
  drugs:       DRUG_REGISTRY,
  wards:       WARDS,
  patterns:    [],
  stats:       computeStats(seedAlarms),
  wardStats:   computeWardStats(seedAlarms),
  isStreaming: true,
}

/* ============================================================
   Context
   ============================================================ */
const AlarmContext = createContext(null)

/* ── Stream interval bounds (ms) ────────────────────── */
const MIN_INTERVAL = 8_000
const MAX_INTERVAL = 15_000

export function AlarmProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Ref so stream callback always sees current streaming flag
  const isStreamingRef = useRef(state.isStreaming)
  isStreamingRef.current = state.isStreaming

  /* ── Alarm stream generator ──────────────────────────── */
  useEffect(() => {
    let timerId

    function scheduleNext() {
      if (!isStreamingRef.current) return
      const delay = MIN_INTERVAL + Math.random() * (MAX_INTERVAL - MIN_INTERVAL)
      timerId = setTimeout(() => {
        const alarm = generateAlarm(PATIENTS)
        if (alarm) dispatch({ type: 'ADD_ALARM', payload: alarm })
        scheduleNext()
      }, delay)
    }

    if (state.isStreaming) scheduleNext()

    return () => clearTimeout(timerId)
  }, [state.isStreaming])

  /* ── Pattern analyser — runs after every alarm change ─── */
  useEffect(() => {
    const patterns = analysePatterns(state.alarms)
    dispatch({ type: 'UPDATE_PATTERNS', payload: patterns })
  }, [state.alarms])

  return (
    <AlarmContext.Provider value={{ ...state, dispatch }}>
      {children}
    </AlarmContext.Provider>
  )
}

/** Convenience hook */
export function useAlarms() {
  const ctx = useContext(AlarmContext)
  if (!ctx) throw new Error('useAlarms must be used inside <AlarmProvider>')
  return ctx
}
