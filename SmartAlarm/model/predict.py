"""
SmartAlarm - Prediction Module
Loads the trained model and preprocessing pipeline to make predictions
on new alarm pattern data.

IMPORTANT: Every prediction is model output requiring human review.
This system does NOT diagnose patients or prescribe treatment.
"""

import numpy as np
import pandas as pd
import joblib
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from preprocessing.preprocess import (
    load_pipeline, preprocess_for_prediction, engineer_features
)

MODEL_DIR = os.path.join(os.path.dirname(__file__), "saved_model")

LABEL_NAMES = {0: "Nuisance", 1: "Watch", 2: "Escalation", 3: "Critical"}
LABEL_COLORS = {0: "#2ecc71", 1: "#f39c12", 2: "#e67e22", 3: "#e74c3c"}
LABEL_ICONS = {0: "✅", 1: "👁️", 2: "⚠️", 3: "🚨"}

CONFIDENCE_THRESHOLDS = {"HIGH": 0.70, "MEDIUM": 0.50}


def load_model(model_type="best"):
    """Load a trained model. model_type: 'best', 'lr', 'rf'"""
    fname_map = {
        "best": "best_model.pkl",
        "lr": "logistic_regression.pkl",
        "rf": "random_forest.pkl",
    }
    path = os.path.join(MODEL_DIR, fname_map.get(model_type, "best_model.pkl"))
    return joblib.load(path)


def get_confidence(max_prob):
    if max_prob >= CONFIDENCE_THRESHOLDS["HIGH"]:
        return "HIGH"
    elif max_prob >= CONFIDENCE_THRESHOLDS["MEDIUM"]:
        return "MEDIUM"
    return "LOW"


def generate_evidence(row: pd.Series, predicted_label: int) -> list:
    """
    Generate human-readable evidence strings explaining the prediction.
    Does NOT claim medical causality.
    """
    evidence = []

    alarm_count = row.get("alarm_count_10min", 0)
    time_since = row.get("time_since_previous_alarm", 9999)
    spo2 = row.get("spo2", 98)
    hr = row.get("heart_rate", 75)
    rr = row.get("respiratory_rate", 16)
    sbp = row.get("systolic_bp", 120)
    temp = row.get("temperature", 37.0)
    spo2_change = row.get("spo2_change", 0)
    hr_change = row.get("hr_change", 0)
    rr_change = row.get("rr_change", 0)
    resp_time = row.get("response_time_seconds", 60)
    vital_abnorm = row.get("vital_abnormality_count", 0)
    alarm_freq_trend = row.get("alarm_frequency_trend", 0)
    repeated = row.get("repeated_alarm_count", 1)
    alarm_type = row.get("alarm_type", "Unknown")
    device = row.get("device_type", "Unknown")

    # Alarm frequency evidence
    if alarm_count >= 6:
        evidence.append(f"🔴 {int(alarm_count)} alarms occurred within the last 10 minutes (high frequency)")
    elif alarm_count >= 3:
        evidence.append(f"🟠 {int(alarm_count)} alarms occurred within the last 10 minutes (moderate frequency)")
    else:
        evidence.append(f"🟢 {int(alarm_count)} alarms in the last 10 minutes (low frequency)")

    if alarm_freq_trend > 1:
        evidence.append(f"🔴 Alarm frequency is increasing (trend: +{alarm_freq_trend:.1f})")
    elif alarm_freq_trend < -1:
        evidence.append(f"🟢 Alarm frequency is decreasing (trend: {alarm_freq_trend:.1f})")

    if repeated >= 4:
        evidence.append(f"🔴 Same alarm type '{alarm_type}' repeated {int(repeated)} times")
    elif repeated >= 2 and predicted_label == 0:
        evidence.append(f"🟡 Repeated '{alarm_type}' alarms from {device} — pattern consistent with device nuisance")

    # SpO2 evidence
    if spo2 < 85:
        evidence.append(f"🔴 SpO2 is critically low at {spo2:.1f}%")
    elif spo2 < 92:
        evidence.append(f"🔴 SpO2 is low at {spo2:.1f}%")
    elif spo2 >= 95:
        evidence.append(f"🟢 SpO2 within normal range ({spo2:.1f}%)")

    if spo2_change < -3:
        evidence.append(f"🔴 SpO2 has decreased by {abs(spo2_change):.1f}% since last observation")
    elif spo2_change < -1:
        evidence.append(f"🟠 SpO2 decreased by {abs(spo2_change):.1f}% (mild downward trend)")

    # Heart rate evidence
    if hr > 130:
        evidence.append(f"🔴 Heart rate is high at {hr:.0f} bpm")
    elif hr > 100:
        evidence.append(f"🟠 Heart rate is elevated at {hr:.0f} bpm")
    elif 50 <= hr <= 100:
        evidence.append(f"🟢 Heart rate within normal range ({hr:.0f} bpm)")
    else:
        evidence.append(f"🔴 Heart rate is low at {hr:.0f} bpm")

    if hr_change > 10:
        evidence.append(f"🔴 Heart rate increased by {hr_change:.0f} bpm since last observation")
    elif hr_change > 5:
        evidence.append(f"🟠 Heart rate increased by {hr_change:.0f} bpm")

    # Respiratory rate
    if rr > 35:
        evidence.append(f"🔴 Respiratory rate critically high at {rr:.0f}/min")
    elif rr > 25:
        evidence.append(f"🟠 Respiratory rate elevated at {rr:.0f}/min")
    elif 8 <= rr <= 25:
        evidence.append(f"🟢 Respiratory rate within normal range ({rr:.0f}/min)")

    if rr_change > 5:
        evidence.append(f"🔴 Respiratory rate increased by {rr_change:.0f}/min")
    elif rr_change > 2:
        evidence.append(f"🟠 Respiratory rate increased by {rr_change:.0f}/min")

    # Blood pressure
    if sbp < 90:
        evidence.append(f"🔴 Systolic BP is low at {sbp:.0f} mmHg")
    elif sbp > 160:
        evidence.append(f"🟠 Systolic BP is elevated at {sbp:.0f} mmHg")
    else:
        evidence.append(f"🟢 Systolic BP within acceptable range ({sbp:.0f} mmHg)")

    # Staff response time
    if resp_time > 600:
        evidence.append(f"🔴 Staff response time delayed ({resp_time/60:.0f} min)")
    elif resp_time > 180:
        evidence.append(f"🟠 Staff response time: {resp_time/60:.0f} min (moderate delay)")
    else:
        evidence.append(f"🟢 Staff responded within {resp_time:.0f} seconds")

    # Vital abnormality count
    if vital_abnorm > 0:
        evidence.append(f"🔴 {int(vital_abnorm)} vital sign(s) outside prototype reference range")
    else:
        evidence.append(f"🟢 No vital signs outside prototype reference range")

    # Inter-alarm time
    if time_since < 60 and time_since > 0:
        evidence.append(f"🔴 Alarms occurring every {time_since:.0f} seconds (rapidly)")
    elif time_since < 120 and time_since > 0:
        evidence.append(f"🟠 Short interval between alarms ({time_since:.0f}s)")

    return evidence


def get_potential_harm(predicted_label: int, confidence: str) -> dict:
    """Return potential harm description for false positive and false negative."""

    false_positive_harm = {
        0: "If this Nuisance pattern is correctly identified: No harm from missed action.",
        1: "If Watch pattern is a false positive (actual Nuisance): Staff unnecessarily alerted, possible minor alarm fatigue.",
        2: "If Escalation is a false positive (actual Nuisance or Watch): Unnecessary staff interruption, increased alarm burden, possible alarm fatigue, resources diverted from other patients.",
        3: "If Critical is a false positive (actual lower severity): Unnecessary emergency response, high staff burden, alarm fatigue, reduced attention for genuinely critical patients.",
    }

    false_negative_harm = {
        0: "N/A — Nuisance prediction unlikely to miss dangerous pattern if vitals are stable.",
        1: "If Watch is a false negative (actual Escalation or Critical): Delayed recognition, delayed human assessment, potentially missed deterioration — requires close monitoring.",
        2: "If Escalation is a false negative (actual Critical): Severity underestimated — delayed escalation of care — potentially missed rapid deterioration.",
        3: "If Critical is correctly identified: Urgent human review required immediately.",
    }

    return {
        "false_positive": false_positive_harm.get(predicted_label, "Unknown"),
        "false_negative": false_negative_harm.get(predicted_label, "Unknown"),
        "priority": "HIGH" if predicted_label >= 2 else "LOW",
        "note": ("⚠️ LOW CONFIDENCE — HUMAN REVIEW STRONGLY REQUIRED"
                 if confidence == "LOW" else
                 "Human review required before any clinical action."),
    }


def predict(df: pd.DataFrame, model_type="best") -> pd.DataFrame:
    """
    Run the full prediction pipeline on a dataframe of alarm records.
    Returns a dataframe with predictions, probabilities, confidence, evidence.
    """
    encoder, scaler, feature_list = load_pipeline()
    model = load_model(model_type)

    X, used_features = preprocess_for_prediction(df, encoder, scaler, feature_list)
    probs = model.predict_proba(X)
    preds = model.predict(X)

    results = []
    df_eng = engineer_features(df)

    for i, (pred, prob) in enumerate(zip(preds, probs)):
        row = df_eng.iloc[i]
        max_prob = prob[pred]
        confidence = get_confidence(max_prob)
        evidence = generate_evidence(row, pred)
        harm = get_potential_harm(pred, confidence)
        uncertainty = round((1 - max_prob) * 100, 1)

        results.append({
            "alarm_id": row.get("alarm_id", f"ALM{i}"),
            "patient_id": row.get("patient_id", "Unknown"),
            "timestamp": row.get("timestamp", ""),
            "predicted_label": int(pred),
            "predicted_class": LABEL_NAMES[int(pred)],
            "confidence": confidence,
            "uncertainty_pct": uncertainty,
            "prob_nuisance": round(float(prob[0]) * 100, 1),
            "prob_watch": round(float(prob[1]) * 100, 1),
            "prob_escalation": round(float(prob[2]) * 100, 1),
            "prob_critical": round(float(prob[3]) * 100, 1),
            "evidence": evidence,
            "harm_false_positive": harm["false_positive"],
            "harm_false_negative": harm["false_negative"],
            "harm_priority": harm["priority"],
            "harm_note": harm["note"],
            "review_status": "Pending",
        })

    return pd.DataFrame(results)


if __name__ == "__main__":
    from preprocessing.preprocess import load_datasets, merge_datasets
    alarm, context, staff = load_datasets()
    df = merge_datasets(alarm, context, staff)
    sample = df.head(5)
    results = predict(sample)
    print(results[["patient_id", "predicted_class", "confidence", "uncertainty_pct"]])
