import { useState } from 'react'
import { useAlarms } from '../context/AlarmContext'
import { EXPERIMENT_DATASET } from '../data/experimentDataset'
import { buildSeedAlarms } from '../engine/alarmStream'
import './SimulationLab.css'

export default function SimulationLab() {
  const { dispatch } = useAlarms()
  const [lastAction, setLastAction] = useState(null)

  const handleInject = (scenarioName, filterFn) => {
    const alarms = EXPERIMENT_DATASET.filter(filterFn)
    dispatch({ type: 'ADD_MULTIPLE_ALARMS', payload: alarms })
    setLastAction(`Injected scenario: ${scenarioName} (${alarms.length} alarms)`)
  }

  const handleReset = () => {
    dispatch({ type: 'SET_ALARMS', payload: buildSeedAlarms() })
    setLastAction('Reset to baseline seed data.')
  }

  return (
    <div className="simulation-page animate-fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Simulation Lab</h1>
          <p className="page-subtitle">Inject targeted scenarios to test the pattern analyser</p>
        </div>
      </div>

      <div className="card simulation-card">
        <h2 className="sim-h2">Available Scenarios</h2>
        <div className="sim-grid">
          
          <div className="sim-box">
            <h3>Normal / Low Risk</h3>
            <p>Injects Journey B (Margaret Osei) – mostly timing variances and low-severity nuisance alarms.</p>
            <button className="btn btn-secondary" onClick={() => handleInject('Normal / Low Risk', a => a.id.startsWith('EXP-B'))}>
              Generate Simulation
            </button>
          </div>

          <div className="sim-box">
            <h3>Rapid Escalation</h3>
            <p>Injects Journey A (James Hargreaves) – high urgency, multiple critical alarms in short succession.</p>
            <button className="btn btn-secondary" onClick={() => handleInject('Rapid Escalation', a => a.id.startsWith('EXP-A'))}>
              Generate Simulation
            </button>
          </div>

          <div className="sim-box">
            <h3>Missing Patient Context</h3>
            <p>Injects Failure Case 1 – high severity alarm but patient context is null/missing.</p>
            <button className="btn btn-secondary" onClick={() => handleInject('Missing Context', a => a.id === 'EXP-FC001')}>
              Generate Simulation
            </button>
          </div>

          <div className="sim-box">
            <h3>Conflicting Signals</h3>
            <p>Injects Failure Case 2 – simultaneous critical and low severity alarms for the same patient.</p>
            <button className="btn btn-secondary" onClick={() => handleInject('Conflicting Signals', a => a.id === 'EXP-FC002' || a.id === 'EXP-FC003')}>
              Generate Simulation
            </button>
          </div>

          <div className="sim-box">
            <h3>Delayed Staff Response</h3>
            <p>Injects a mix of alarms with long delay before acknowledgement.</p>
            <button className="btn btn-secondary" onClick={() => handleInject('Delayed Staff Response', a => a.staffResponse?.ackTime != null && (a.staffResponse.ackTime - a.timestamp) > 300000)}>
              Generate Simulation
            </button>
          </div>
          
          <div className="sim-box sim-box-danger">
            <h3>Reset Data</h3>
            <p>Clear all injected experiment data and revert to the default dashboard seed alarms.</p>
            <button className="btn btn-danger" onClick={handleReset}>
              Reset
            </button>
          </div>

        </div>

        {lastAction && (
          <div className="sim-toast">
            ✅ {lastAction}
          </div>
        )}
      </div>
    </div>
  )
}
