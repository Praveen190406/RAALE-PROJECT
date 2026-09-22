# SmartAlarm Technical Documentation

## 1. Problem Definition
Hospital inpatient wards use numerous medical devices that continuously generate alarms. The core problem is **alarm fatigue**: frequent nuisance alarms cause unnecessary staff interruptions and reduce the attention available for genuinely critical patients. Dangerous alarm patterns are often difficult to distinguish from nuisance alarms without observing patient context.

## 2. Solution Overview
SmartAlarm is an AI-Based Alarm Pattern Analyser. It combines the raw alarm stream with patient context (vital signs, demographics) and staff response times to classify the underlying risk pattern. It does NOT diagnose patients; rather, it flags potentially important alarm patterns for human review.

## 3. Data Generation
Because this is an academic prototype, we generate **synthetic data** (`generate_data.py`).
*   **Volume**: ~6,000 alarm records.
*   **Features**: Patient vitals (HR, SpO2, BP, RR, Temp), device types, alarm types, staff response times.
*   **Labels**: Simulated based on predefined prototype thresholds (Nuisance = 0, Watch = 1, Escalation = 2, Critical = 3).

## 4. Preprocessing & Feature Engineering
The pipeline (`preprocess.py`) ensures that training and inference use identical transformations.
*   **Missing Values**: Filled using median (numerical) or "Unknown" (categorical).
*   **Scaling & Encoding**: `StandardScaler` for numericals, `LabelEncoder` for categoricals.
*   **Engineered Features**:
    *   `hr_change`, `spo2_change`, `rr_change`: Lag-1 differences in vital signs to capture *trends*.
    *   `vital_abnormality_count`: Number of vitals outside normal bounds.
    *   `alarm_frequency_trend`: Rate of change in alarms over the last 10 minutes.
    *   `repeated_alarm_count`: Count of the same alarm type from the same device.

## 5. Prototype Thresholds (Baseline)
A rule-based baseline (`baseline.py`) is used for comparison.
*   **Critical**: SpO2 < 85 OR HR > 130 OR RR > 35, combined with high alarm frequency.
*   **Escalation**: Mildly abnormal vitals (e.g., SpO2 < 92) AND worsening trend AND moderate alarm frequency.
*   **Nuisance**: Stable vitals, normal response times, but high repeated alarm frequency.
*   **Watch**: Everything else.

## 6. Machine Learning Models
Two models were trained (`train.py`):
1.  **Logistic Regression**: Simple, interpretable baseline ML model.
2.  **Random Forest**: Selected as the final model due to its ability to capture non-linear interactions between vital sign trends and alarm counts.

**Metrics Focus**: 
*   **Dangerous Pattern Recall**: Ensuring we don't miss Escalation/Critical events.
*   **Nuisance High-Priority Rate**: Ensuring we don't falsely escalate Nuisance alarms.

## 7. Evidence & Uncertainty
Every prediction (`predict.py`) includes:
*   **Class Probabilities**: The softmax output of the Random Forest.
*   **Confidence**: High (>70%), Medium (50-70%), Low (<50%).
*   **Evidence**: Human-readable strings mapping engineered features back to clinical indicators (e.g., "Alarm frequency is increasing").
*   **Potential Harm**: Explicit statement of what happens if the model is wrong (False Positive / False Negative).

## 8. Human-in-the-Loop
Predictions are stored in a pending state until a human reviewer confirms, rejects, or marks them as uncertain. The model acts purely as a decision-support filter.
