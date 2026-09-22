import { createContext, useContext, useReducer, useEffect, useRef, useState, useCallback } from 'react';
import api from '../services/api';
import { PATIENTS } from '../data/patients';
import { DRUG_REGISTRY, HIGH_RISK_COUNT } from '../data/drugs';
import { WARDS } from '../data/wards';
import { generateAlarm, buildSeedAlarms } from '../engine/alarmStream';
import { analysePatterns } from '../engine/patternAnalyser';

/* ============================================================
   Stats computation
   ============================================================ */
const ONE_HOUR = 60 * 60 * 1_000;
const TWENTY_FOUR = 24 * 60 * 60 * 1_000;

function todayStartMs() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function computeStats(alarms, currentWards = WARDS, currentDrugs = DRUG_REGISTRY) {
  const now = Date.now();
  const todayStart = todayStartMs();
  const active = alarms.filter((a) => a.status === 'Active');
  const last1h = alarms.filter((a) => now - a.timestamp < ONE_HOUR);
  const prev1h = alarms.filter(
    (a) => now - a.timestamp >= ONE_HOUR && now - a.timestamp < 2 * ONE_HOUR
  );

  const missedActive = active.filter((a) => a.type === 'Missed Dose');
  const prevMissed = prev1h.filter((a) => a.type === 'Missed Dose' && a.status === 'Active');

  const resolvedToday = alarms.filter(
    (a) => a.status === 'Resolved' && a.timestamp >= todayStart
  );

  const escalations24h = alarms.filter(
    (a) => a.type === 'Escalation' && now - a.timestamp < TWENTY_FOUR
  );

  const activeDelta =
    last1h.filter((a) => a.status === 'Active').length -
    prev1h.filter((a) => a.status === 'Active').length;

  const missedDelta = missedActive.length - prevMissed.length;

  return {
    activeAlarms: active.length,
    activeDelta,
    missedDoses: missedActive.length,
    missedDelta,
    resolvedToday: resolvedToday.length,
    highRiskDrugs: currentDrugs.length || HIGH_RISK_COUNT,
    wardsMonitored: currentWards.length || WARDS.length,
    escalations24h: escalations24h.length,
  };
}

function computeWardStats(alarms, currentWards = WARDS) {
  const now = Date.now();
  const SEV = { critical: 18, high: 12, medium: 7, low: 3 };
  const HALF = 30 * 60 * 1_000;

  return currentWards
    .map((ward) => {
      const wardAlarms = alarms.filter((a) => a.wardId === ward.id || a.ward_id === ward.id);
      const activeAlarms = wardAlarms.filter((a) => a.status === 'Active');

      const rawRisk = activeAlarms.reduce((sum, a) => sum + (SEV[a.severity] || 3), 0);
      const risk = Math.min(100, 35 + rawRisk);

      // Trend: count Active alarms in last 30min vs prior 30min
      const recent = wardAlarms.filter(
        (a) => now - a.timestamp < HALF && a.status === 'Active'
      ).length;
      const prior = wardAlarms.filter(
        (a) => now - a.timestamp >= HALF && now - a.timestamp < HALF * 2 && a.status === 'Active'
      ).length;
      const trend = recent > prior ? 'up' : recent < prior ? 'down' : 'stable';

      return {
        wardId: ward.id,
        ward: ward.name,
        shortName: ward.shortName || ward.short_name,
        beds: ward.beds,
        alarms: activeAlarms.length,
        risk,
        trend,
      };
    })
    .sort((a, b) => b.risk - a.risk);
}

/* ============================================================
   Reducer
   ============================================================ */
const MAX_ALARMS = 500;

function reducer(state, action) {
  switch (action.type) {
    case 'SET_INITIAL_DATA': {
      const { alarms, patients, wards, drugs, patterns } = action.payload;
      const currentAlarms = alarms && alarms.length > 0 ? alarms : state.alarms;
      const currentWards = wards && wards.length > 0 ? wards : state.wards;
      const currentDrugs = drugs && drugs.length > 0 ? drugs : state.drugs;
      const currentPatients = patients && patients.length > 0 ? patients : state.patients;
      return {
        ...state,
        alarms: currentAlarms,
        patients: currentPatients,
        wards: currentWards,
        drugs: currentDrugs,
        patterns: patterns || state.patterns,
        stats: computeStats(currentAlarms, currentWards, currentDrugs),
        wardStats: computeWardStats(currentAlarms, currentWards),
      };
    }

    case 'ADD_ALARM': {
      const alarms = [action.payload, ...state.alarms].slice(0, MAX_ALARMS);
      return {
        ...state,
        alarms,
        stats: computeStats(alarms, state.wards, state.drugs),
        wardStats: computeWardStats(alarms, state.wards),
      };
    }

    case 'ADD_PATIENT': {
      const patients = [...state.patients, action.payload];
      return { ...state, patients };
    }

    case 'ADD_DRUG': {
      const drugs = [action.payload, ...state.drugs];
      return {
        ...state,
        drugs,
        stats: computeStats(state.alarms, state.wards, drugs),
      };
    }

    case 'ADD_WARD': {
      const wards = [...state.wards, action.payload];
      return {
        ...state,
        wards,
        wardStats: computeWardStats(state.alarms, wards),
      };
    }

    case 'ACKNOWLEDGE_ALARM': {
      const alarms = state.alarms.map((a) =>
        a.id === action.payload ? { ...a, status: 'Acknowledged' } : a
      );
      return {
        ...state,
        alarms,
        stats: computeStats(alarms, state.wards, state.drugs),
        wardStats: computeWardStats(alarms, state.wards),
      };
    }

    case 'RESOLVE_ALARM': {
      const alarms = state.alarms.map((a) =>
        a.id === action.payload ? { ...a, status: 'Resolved' } : a
      );
      return {
        ...state,
        alarms,
        stats: computeStats(alarms, state.wards, state.drugs),
        wardStats: computeWardStats(alarms, state.wards),
      };
    }

    case 'UPDATE_PATTERNS': {
      const existingMap = new Map(state.patterns.map((p) => [p.id, p]));
      const merged = action.payload.map((p) => {
        const prev = existingMap.get(p.id);
        return prev
          ? { ...p, firstDetectedAt: prev.firstDetectedAt ?? prev.detectedAt }
          : { ...p, firstDetectedAt: p.detectedAt };
      });
      return { ...state, patterns: merged };
    }

    case 'TOGGLE_STREAM':
      return { ...state, isStreaming: !state.isStreaming };

    default:
      return state;
  }
}

const seedAlarms = buildSeedAlarms();

const initialState = {
  alarms: seedAlarms,
  patients: PATIENTS,
  drugs: DRUG_REGISTRY,
  wards: WARDS,
  patterns: [],
  stats: computeStats(seedAlarms, WARDS, DRUG_REGISTRY),
  wardStats: computeWardStats(seedAlarms, WARDS),
  isStreaming: true,
};

const AlarmContext = createContext(null);

const MIN_INTERVAL = 12_000;
const MAX_INTERVAL = 25_000;

export function AlarmProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [dbConnected, setDbConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const isStreamingRef = useRef(state.isStreaming);
  isStreamingRef.current = state.isStreaming;

  // Initial fetch from SQLite database API
  const refreshAlarms = useCallback(async () => {
    try {
      const [alarmsRes, patientsRes, wardsRes, drugsRes, patternsRes] = await Promise.all([
        api.getAlarms(),
        api.getPatients(),
        api.getWards(),
        api.getDrugs(),
        api.getPatterns(),
      ]);

      if (alarmsRes.success && alarmsRes.alarms) {
        dispatch({
          type: 'SET_INITIAL_DATA',
          payload: {
            alarms: alarmsRes.alarms,
            patients: patientsRes.patients || PATIENTS,
            wards: wardsRes.wards || WARDS,
            drugs: drugsRes.drugs || DRUG_REGISTRY,
            patterns: patternsRes.patterns || [],
          },
        });
        setDbConnected(true);
      }
    } catch (err) {
      console.warn('Backend offline or initializing, running with in-memory store:', err.message);
      setDbConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAlarms();
  }, [refreshAlarms]);

  // Persistent Acknowledge
  const acknowledgeAlarm = async (alarmId, notes = '') => {
    dispatch({ type: 'ACKNOWLEDGE_ALARM', payload: alarmId });
    try {
      await api.acknowledgeAlarm(alarmId, notes);
    } catch (err) {
      console.warn('Failed to persist acknowledgement to DB:', err.message);
    }
  };

  // Persistent Resolve
  const resolveAlarm = async (alarmId, notes = '') => {
    dispatch({ type: 'RESOLVE_ALARM', payload: alarmId });
    try {
      await api.resolveAlarm(alarmId, notes);
    } catch (err) {
      console.warn('Failed to persist resolve to DB:', err.message);
    }
  };

  // Persistent Create Alarm
  const createNewAlarm = async (alarmData) => {
    try {
      const res = await api.createAlarm(alarmData);
      if (res.success && res.alarm) {
        dispatch({ type: 'ADD_ALARM', payload: res.alarm });
        if (res.patterns) {
          dispatch({ type: 'UPDATE_PATTERNS', payload: res.patterns });
        }
        return res.alarm;
      }
    } catch (err) {
      console.warn('Fallback: adding alarm locally');
      const fallbackAlarm = {
        ...alarmData,
        id: `AL-${Date.now().toString().slice(-4)}`,
        time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
        timestamp: Date.now(),
        status: 'Active',
      };
      dispatch({ type: 'ADD_ALARM', payload: fallbackAlarm });
      return fallbackAlarm;
    }
  };

  // Persistent Create Patient
  const createNewPatient = async (patientData) => {
    const res = await api.createPatient(patientData);
    if (res.success && res.patient) {
      dispatch({ type: 'ADD_PATIENT', payload: res.patient });
      return res.patient;
    }
    throw new Error(res.message || 'Failed to admit patient');
  };

  // Persistent Create Drug
  const createNewDrug = async (drugData) => {
    const res = await api.createDrug(drugData);
    if (res.success && res.drug) {
      dispatch({ type: 'ADD_DRUG', payload: res.drug });
      return res.drug;
    }
    throw new Error(res.message || 'Failed to register medication');
  };

  // Persistent Create Ward
  const createNewWard = async (wardData) => {
    const res = await api.createWard(wardData);
    if (res.success && res.ward) {
      dispatch({ type: 'ADD_WARD', payload: res.ward });
      return res.ward;
    }
    throw new Error(res.message || 'Failed to create ward');
  };

  /* ── Background simulation stream ────────────────────── */
  useEffect(() => {
    let timerId;

    function scheduleNext() {
      if (!isStreamingRef.current) return;
      const delay = MIN_INTERVAL + Math.random() * (MAX_INTERVAL - MIN_INTERVAL);
      timerId = setTimeout(async () => {
        const generated = generateAlarm(state.patients);
        if (generated) {
          try {
            const res = await api.createAlarm(generated);
            if (res.success && res.alarm) {
              dispatch({ type: 'ADD_ALARM', payload: res.alarm });
              if (res.patterns) {
                dispatch({ type: 'UPDATE_PATTERNS', payload: res.patterns });
              }
            } else {
              dispatch({ type: 'ADD_ALARM', payload: generated });
            }
          } catch (e) {
            dispatch({ type: 'ADD_ALARM', payload: generated });
          }
        }
        scheduleNext();
      }, delay);
    }

    if (state.isStreaming) scheduleNext();

    return () => clearTimeout(timerId);
  }, [state.isStreaming, state.patients]);

  /* ── Pattern analyser recalculation ─────────────────── */
  useEffect(() => {
    const patterns = analysePatterns(state.alarms);
    dispatch({ type: 'UPDATE_PATTERNS', payload: patterns });
  }, [state.alarms]);

  // Persistent Batch Alarms (Simulation Scenarios)
  const batchAddAlarms = async (scenarioAlarms) => {
    dispatch({ type: 'ADD_MULTIPLE_ALARMS', payload: scenarioAlarms });
    try {
      const res = await api.batchCreateAlarms(scenarioAlarms);
      if (res.success && res.patterns) {
        dispatch({ type: 'UPDATE_PATTERNS', payload: res.patterns });
      }
    } catch (err) {
      console.warn('Batch alarms saved locally only:', err.message);
    }
  };

  // Persistent Reset Alarms to Baseline Seeds
  const resetAlarmsToSeed = async () => {
    try {
      const res = await api.resetAlarms();
      if (res.success) {
        await refreshAlarms();
        return;
      }
    } catch (err) {
      console.warn('Resetting locally');
    }
    dispatch({ type: 'SET_ALARMS', payload: seedAlarms });
  };

  return (
    <AlarmContext.Provider
      value={{
        ...state,
        dispatch,
        dbConnected,
        loading,
        refreshAlarms,
        acknowledgeAlarm,
        resolveAlarm,
        createNewAlarm,
        createNewPatient,
        createNewDrug,
        createNewWard,
        batchAddAlarms,
        resetAlarmsToSeed,
      }}
    >
      {children}
    </AlarmContext.Provider>
  );
}

export function useAlarms() {
  const ctx = useContext(AlarmContext);
  if (!ctx) throw new Error('useAlarms must be used inside <AlarmProvider>');
  return ctx;
}
