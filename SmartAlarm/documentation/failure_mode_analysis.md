# SmartAlarm Failure Mode & Error Analysis

Because SmartAlarm operates in a high-risk environment (inpatient wards), understanding its failure modes is more important than overall accuracy.

## 1. False Positives (Nuisance predicted as Dangerous)
**Definition**: The model predicts Escalation or Critical, but the actual event was a Nuisance or Watch pattern.
**Observed Causes**: 
- High alarm frequency combined with a transient vital sign artefact (e.g., sensor displacement causing a brief drop in SpO2 readings).
- Strict adherence to the `spo2_change` feature without context of the absolute SpO2 level (e.g., dropping from 100% to 96% is less concerning than 94% to 90%).
**Potential Harm**: 
- Unnecessary staff interruption.
- Increased alarm burden and subsequent alarm fatigue.
- Clinical resources diverted from genuinely critical patients.

## 2. False Negatives (Dangerous predicted as Nuisance/Watch)
**Definition**: The model predicts Nuisance or Watch, but the patient was actually experiencing a Critical or Escalation event.
**Observed Causes**: 
- Low alarm frequency combined with borderline, slowly degrading vitals that don't trigger the steep `change` features.
- Incomplete staff response data leading to median imputation, masking a delayed staff response (a key indicator of escalation).
**Potential Harm (SAFETY CRITICAL)**: 
- Delayed recognition of patient deterioration.
- Delayed human assessment.
- Potentially missed adverse clinical event.
*Note: False Negatives are aggressively minimised in model selection by prioritising the 'Dangerous Pattern Recall' metric.*

## 3. Conflicting Signals (Low Confidence)
**Definition**: The model's predicted probabilities are closely split (e.g., 45% Watch, 40% Escalation).
**System Behavior**: 
- The system flags the prediction as `LOW CONFIDENCE`.
- It mandates an urgent human review rather than presenting a false sense of security.

## 4. Failure Cases Implemented for Demonstration
The prototype explicitly demonstrates these failure cases (`analysis/failure_cases.py`):
1.  **FC-01**: Many Alarms + Stable Patient (Testing feature dominance).
2.  **FC-02**: Few Alarms + Worsening Context (Testing vital signs override).
3.  **FC-03**: Conflicting Signals (Testing uncertainty).
4.  **FC-04**: False Positive Example.
5.  **FC-05**: False Negative Example.
