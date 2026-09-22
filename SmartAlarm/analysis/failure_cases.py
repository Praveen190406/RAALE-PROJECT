"""
SmartAlarm - Failure Cases Module
Defines 5 structured failure/edge cases for demonstration in the app.
"""

FAILURE_CASES = [
    {
        "id": "FC-01",
        "title": "Many Alarms + Stable Patient",
        "description": (
            "Patient P001 has 9 alarms within 10 minutes from the same infusion pump, "
            "but all vital signs remain within normal ranges throughout."
        ),
        "input": {
            "alarm_count_10min": 9,
            "repeated_alarm_count": 9,
            "alarm_type": "Low Battery",
            "device_type": "Infusion Pump",
            "spo2": 97.5,
            "heart_rate": 76,
            "respiratory_rate": 14,
            "systolic_bp": 118,
            "temperature": 36.8,
            "spo2_change": -0.2,
            "hr_change": 1.0,
            "rr_change": 0.5,
            "vital_abnormality_count": 0,
            "response_time_seconds": 45,
            "alarm_frequency_trend": 0.5,
        },
        "expected": "Nuisance",
        "expected_label": 0,
        "rationale": "High alarm frequency but patient context is stable. Repeated single-device alarms suggest a device malfunction, not a clinical event.",
        "failure_mode": "Model might incorrectly predict Watch or Escalation due to high alarm frequency feature dominating.",
        "potential_harm_if_wrong": "False positive → Unnecessary staff escalation, increased alarm burden, alarm fatigue.",
        "improvement": "Weight patient stability more heavily relative to alarm frequency in the feature space.",
    },
    {
        "id": "FC-02",
        "title": "Few Alarms + Worsening Patient Context",
        "description": (
            "Patient P015 has only 2 alarms in 10 minutes, but SpO2 is dropping (96→91→87) "
            "and heart rate is rising rapidly."
        ),
        "input": {
            "alarm_count_10min": 2,
            "repeated_alarm_count": 1,
            "alarm_type": "Low SpO2",
            "device_type": "Oxygen Monitor",
            "spo2": 87.0,
            "heart_rate": 118,
            "respiratory_rate": 28,
            "systolic_bp": 95,
            "temperature": 38.2,
            "spo2_change": -9.0,
            "hr_change": 22.0,
            "rr_change": 10.0,
            "vital_abnormality_count": 1,
            "response_time_seconds": 420,
            "alarm_frequency_trend": 0.5,
        },
        "expected": "Escalation",
        "expected_label": 2,
        "rationale": "Low alarm count but severe vital sign deterioration. The model must recognise that clinical severity overrides alarm frequency.",
        "failure_mode": "Model might classify as Watch or Nuisance if alarm frequency features dominate over vital sign trend features.",
        "potential_harm_if_wrong": "False negative → Missed deterioration, delayed human assessment, potentially serious outcome.",
        "improvement": "Increase the weight of vital sign change features (spo2_change, hr_change) in the model.",
    },
    {
        "id": "FC-03",
        "title": "Conflicting Signals – Low Confidence",
        "description": (
            "Patient P022 has moderate alarm frequency and mildly abnormal SpO2 (91%), "
            "but heart rate and respiratory rate remain near normal. Staff responded quickly."
        ),
        "input": {
            "alarm_count_10min": 4,
            "repeated_alarm_count": 2,
            "alarm_type": "Sensor Disconnected",
            "device_type": "Patient Monitor",
            "spo2": 91.0,
            "heart_rate": 88,
            "respiratory_rate": 21,
            "systolic_bp": 122,
            "temperature": 37.1,
            "spo2_change": -1.5,
            "hr_change": 2.0,
            "rr_change": 1.0,
            "vital_abnormality_count": 1,
            "response_time_seconds": 90,
            "alarm_frequency_trend": 1.0,
        },
        "expected": "Watch (LOW CONFIDENCE — Human Review Required)",
        "expected_label": 1,
        "rationale": "Mixed signals: mild SpO2 abnormality but other vitals stable and sensor disconnection is a common nuisance. Prediction should be uncertain.",
        "failure_mode": "Model may produce high-confidence prediction in either direction. The key failure is confident misclassification without flagging uncertainty.",
        "potential_harm_if_wrong": "If false positive → alarm fatigue. If false negative → mild deterioration potentially missed.",
        "improvement": "Implement explicit uncertainty thresholding and enforce LOW CONFIDENCE flag when probability margins are small.",
    },
    {
        "id": "FC-04",
        "title": "False Positive Example",
        "description": (
            "Patient P007 had 6 alarms in 10 minutes with a transient SpO2 dip to 90%, "
            "but this was confirmed as an artefact (sensor displacement). Confirmed label: Nuisance."
        ),
        "input": {
            "alarm_count_10min": 6,
            "repeated_alarm_count": 5,
            "alarm_type": "Low SpO2",
            "device_type": "Oxygen Monitor",
            "spo2": 90.0,
            "heart_rate": 82,
            "respiratory_rate": 17,
            "systolic_bp": 128,
            "temperature": 36.9,
            "spo2_change": -7.0,
            "hr_change": 3.0,
            "rr_change": 0.5,
            "vital_abnormality_count": 1,
            "response_time_seconds": 55,
            "alarm_frequency_trend": 2.0,
        },
        "expected": "Nuisance (confirmed by staff — sensor artefact)",
        "expected_label": 0,
        "rationale": "Transient SpO2 dip caused by sensor displacement — not true hypoxaemia. The model may predict Escalation based on SpO2 change features.",
        "failure_mode": "Model predicts Escalation or Critical (False Positive). Sensor context is not available to the model.",
        "potential_harm_if_wrong": "Unnecessary escalation, staff distraction, alarm fatigue. Reduces trust in the system over time.",
        "improvement": "Incorporate device-specific artefact patterns (e.g., simultaneous HR and SpO2 artefact) as a feature.",
    },
    {
        "id": "FC-05",
        "title": "False Negative Example",
        "description": (
            "Patient P019 had only 3 alarms, and vitals appeared borderline at the time of alarm. "
            "Shortly after, confirmed rapid deterioration occurred. Confirmed label: Critical."
        ),
        "input": {
            "alarm_count_10min": 3,
            "repeated_alarm_count": 2,
            "alarm_type": "High Heart Rate",
            "device_type": "Patient Monitor",
            "spo2": 93.0,
            "heart_rate": 105,
            "respiratory_rate": 24,
            "systolic_bp": 100,
            "temperature": 38.6,
            "spo2_change": -2.0,
            "hr_change": 8.0,
            "rr_change": 4.0,
            "vital_abnormality_count": 1,
            "response_time_seconds": 680,
            "alarm_frequency_trend": 1.0,
        },
        "expected": "Critical (confirmed — rapid deterioration)",
        "expected_label": 3,
        "rationale": "Alarm count was low and vitals borderline at alarm time. The model predicted Watch. Rapid deterioration followed. This is a dangerous false negative.",
        "failure_mode": "Model predicts Watch instead of Critical/Escalation. Pattern appeared borderline but true severity was high.",
        "potential_harm_if_wrong": "⚠️ DANGEROUS: Delayed recognition, delayed human response, potentially serious clinical event missed.",
        "improvement": "For borderline cases with ANY vital sign trend worsening, enforce minimum Watch classification and flag for mandatory human review.",
    },
]


def get_failure_cases():
    return FAILURE_CASES


if __name__ == "__main__":
    for fc in FAILURE_CASES:
        print(f"\n{fc['id']}: {fc['title']}")
        print(f"  Expected: {fc['expected']}")
        print(f"  Potential Harm: {fc['potential_harm_if_wrong']}")
