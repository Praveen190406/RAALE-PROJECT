# SmartAlarm Field Workflow Map

This document outlines the operational flow of data from equipment alarms to final risk classification and human review.

```mermaid
graph TD
    A[Alarm Stream\n(Device generates alarm)] --> E[Pattern Analysis Engine]
    B[Patient Context\n(Vitals, trends)] --> E
    C[Staff Response\n(Acknowledgement time)] --> E
    D[Previous Alarm History] --> E
    
    E --> F[Feature Engineering\n(Calculate trends, counts)]
    F --> G[Preprocessing Pipeline\n(Encode, Scale)]
    
    G --> H{ML Model Prediction}
    
    H -->|Prob: Nuisance| I(Nuisance)
    H -->|Prob: Watch| J(Watch)
    H -->|Prob: Escalation| K(Escalation)
    H -->|Prob: Critical| L(Critical)
    
    I --> M[Probability & Uncertainty Calculation]
    J --> M
    K --> M
    L --> M
    
    M --> N[Evidence Generation\n(e.g., 'SpO2 dropped 9%')]
    N --> O[Potential Harm Assessment]
    
    O --> P{Human Review Queue}
    
    P -->|Confirm| Q[Confirmed Event Log]
    P -->|Reject| Q
    P -->|Mark Uncertain| R[Secondary Review]
    R --> Q
    
    Q --> S[Evaluation & Error Analysis\n(Performance tracking)]
```

## Key Workflow Stages

1.  **Data Integration**: The system continuously aggregates alarms, patient vitals, and staff interactions into a single temporal view.
2.  **Pattern Analysis Engine**: The core ML model analyses not just the single alarm, but the *context* surrounding it.
3.  **Risk Classification**: The output is a probability distribution across four classes (Nuisance, Watch, Escalation, Critical).
4.  **Explainability**: Every high-priority alert is accompanied by human-readable evidence (e.g., increasing alarm frequency, worsening vital trends) and uncertainty metrics.
5.  **Human-in-the-Loop**: The system never takes autonomous clinical action. It acts as a decision support tool that presents a recommendation for a human clinician to confirm or reject.
