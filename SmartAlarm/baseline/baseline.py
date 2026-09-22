"""
SmartAlarm - Rule-Based Baseline Classifier
Uses simple threshold logic to classify alarm patterns.

These thresholds are for prototype/research purposes ONLY.
They are NOT clinically validated.
"""

import numpy as np
import pandas as pd
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

LABEL_NAMES = {0: "Nuisance", 1: "Watch", 2: "Escalation", 3: "Critical"}


# ─── Prototype Thresholds (documented) ───────────────────────────────────────
# NUISANCE:
#   alarm_count_10min >= 3
#   vital_abnormality_count == 0
#   spo2 >= 92
#   heart_rate in [50, 100]
#   respiratory_rate in [8, 25]
#
# CRITICAL:
#   spo2 < 85 OR heart_rate > 130 OR respiratory_rate > 35
#   alarm_count_10min >= 5
#
# ESCALATION:
#   (spo2 < 92 OR heart_rate > 100 OR rr > 25)
#   AND alarm_count_10min >= 3
#   AND (spo2_change < -2 OR hr_change > 5 OR rr_change > 3)
#
# WATCH: everything else

THRESHOLDS = {
    # Nuisance
    "nuisance_alarm_count": 3,
    "nuisance_vital_abnorm": 0,
    "nuisance_spo2_min": 92,
    "nuisance_hr_min": 50,
    "nuisance_hr_max": 100,
    "nuisance_rr_min": 8,
    "nuisance_rr_max": 25,
    # Critical
    "critical_spo2": 85,
    "critical_hr": 130,
    "critical_rr": 35,
    "critical_alarm_count": 5,
    # Escalation
    "escalation_spo2": 92,
    "escalation_hr": 100,
    "escalation_rr": 25,
    "escalation_alarm_count": 3,
    "escalation_spo2_change": -2,
    "escalation_hr_change": 5,
    "escalation_rr_change": 3,
}


def baseline_predict_single(row: pd.Series) -> int:
    """Classify a single alarm record using rule-based logic."""

    spo2 = row.get("spo2", 98)
    hr = row.get("heart_rate", 75)
    rr = row.get("respiratory_rate", 16)
    alarm_count = row.get("alarm_count_10min", 1)
    vital_abnorm = row.get("vital_abnormality_count", 0)
    spo2_change = row.get("spo2_change", 0)
    hr_change = row.get("hr_change", 0)
    rr_change = row.get("rr_change", 0)

    # ── CRITICAL ─────────────────────────────────────────────────────────────
    critical_vitals = (
        spo2 < THRESHOLDS["critical_spo2"] or
        hr > THRESHOLDS["critical_hr"] or
        rr > THRESHOLDS["critical_rr"]
    )
    if critical_vitals and alarm_count >= THRESHOLDS["critical_alarm_count"]:
        return 3  # Critical

    # ── ESCALATION ───────────────────────────────────────────────────────────
    abnormal_vitals = (
        spo2 < THRESHOLDS["escalation_spo2"] or
        hr > THRESHOLDS["escalation_hr"] or
        rr > THRESHOLDS["escalation_rr"]
    )
    worsening_trend = (
        spo2_change < THRESHOLDS["escalation_spo2_change"] or
        hr_change > THRESHOLDS["escalation_hr_change"] or
        rr_change > THRESHOLDS["escalation_rr_change"]
    )
    if (abnormal_vitals and
            alarm_count >= THRESHOLDS["escalation_alarm_count"] and
            worsening_trend):
        return 2  # Escalation

    # ── NUISANCE ─────────────────────────────────────────────────────────────
    stable_vitals = (
        spo2 >= THRESHOLDS["nuisance_spo2_min"] and
        THRESHOLDS["nuisance_hr_min"] <= hr <= THRESHOLDS["nuisance_hr_max"] and
        THRESHOLDS["nuisance_rr_min"] <= rr <= THRESHOLDS["nuisance_rr_max"]
    )
    if (alarm_count >= THRESHOLDS["nuisance_alarm_count"] and
            vital_abnorm == THRESHOLDS["nuisance_vital_abnorm"] and
            stable_vitals):
        return 0  # Nuisance

    # ── WATCH ─────────────────────────────────────────────────────────────────
    return 1  # Watch


def baseline_predict(df: pd.DataFrame) -> np.ndarray:
    """Apply rule-based classifier to a dataframe."""
    return df.apply(baseline_predict_single, axis=1).values


if __name__ == "__main__":
    import sys
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
    from preprocessing.preprocess import (
        load_datasets, merge_datasets, engineer_features
    )

    alarm, context, staff = load_datasets()
    df = merge_datasets(alarm, context, staff)
    df = engineer_features(df)
    preds = baseline_predict(df)
    print("Baseline prediction distribution:")
    unique, counts = np.unique(preds, return_counts=True)
    for u, c in zip(unique, counts):
        print(f"  {LABEL_NAMES[u]}: {c:,}")
