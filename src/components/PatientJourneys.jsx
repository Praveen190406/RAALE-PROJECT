import { EXPERIMENT_DATASET } from '../data/experimentDataset'
import './PatientJourneys.css'

function JourneyTimeline({ title, patient, urgency, description, alarms }) {
  const sorted = [...alarms].sort((a, b) => a.timestamp - b.timestamp)
  
  return (
    <div className={`journey-section journey-${urgency}`}>
      <div className="journey-header">
        <h2>{title}</h2>
        <div className="journey-meta">
          <span className="journey-patient">{patient}</span>
          <span className={`badge badge-${urgency === 'high' ? 'critical' : 'low'}`}>
            {urgency.toUpperCase()} URGENCY
          </span>
        </div>
        <p className="journey-desc">{description}</p>
      </div>

      <div className="timeline">
        {sorted.map((alarm, idx) => (
          <div key={alarm.id} className="timeline-item">
            <div className="timeline-time">{alarm.time}</div>
            <div className="timeline-marker"></div>
            <div className="timeline-content card">
              <div className="timeline-content-header">
                <strong>{alarm.drug}</strong>
                <span className={`badge badge-${alarm.severity}`}>{alarm.severity}</span>
              </div>
              <div className="timeline-body">
                <p>{alarm.type}</p>
                <div className="timeline-meta">
                  <span className="font-mono text-muted">{alarm.id}</span>
                  <span className="timeline-status">
                    {alarm.staffResponse?.ackTime ? 'Acknowledged' : 'Unacknowledged'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PatientJourneys() {
  const journeyA = EXPERIMENT_DATASET.filter(a => a.id.startsWith('EXP-A'))
  const journeyB = EXPERIMENT_DATASET.filter(a => a.id.startsWith('EXP-B'))

  return (
    <div className="journeys-page animate-fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Patient Journeys</h1>
          <p className="page-subtitle">Detailed timeline view of the simulated experiment journeys</p>
        </div>
      </div>

      <div className="journeys-grid">
        <JourneyTimeline 
          title="Journey A" 
          patient="James Hargreaves (P001) - Cardiology"
          urgency="high"
          description="Frequent critical alarms including rapid escalation cluster (<5 min apart). Repeated missed doses of Warfarin. Multiple simultaneous critical drugs."
          alarms={journeyA}
        />
        <JourneyTimeline 
          title="Journey B" 
          patient="Margaret Osei (P002) - Medical"
          urgency="low"
          description="Mostly timing variance and low-severity alarms. Longer intervals between events. Most alarms resolved promptly."
          alarms={journeyB}
        />
      </div>
    </div>
  )
}
