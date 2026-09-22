"""
SmartAlarm - Synthetic Data Generator
Generates simulated hospital alarm data for the AI-Based Alarm Pattern Analyser.

IMPORTANT: This generates SYNTHETIC data only. No real patient data is used.
This is an academic/research prototype for educational purposes.
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import os
import random

SEED = 42
np.random.seed(SEED)
random.seed(SEED)

# â”€â”€â”€ Configuration â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
N_PATIENTS = 30
N_ALARMS_TARGET = 6000
START_TIME = datetime(2024, 1, 1, 0, 0, 0)

DEVICE_TYPES = [
    "Infusion Pump", "Patient Monitor", "Oxygen Monitor",
    "Ventilator", "Syringe Pump"
]

ALARM_TYPES = [
    "Occlusion", "Low Battery", "Sensor Disconnected",
    "High Heart Rate", "Low SpO2", "High Respiratory Rate", "Flow Error"
]

ALARM_PRIORITIES = ["Low", "Medium", "High"]

WARDS = ["ICU", "Medical Ward A", "Medical Ward B", "Surgical Ward", "HDU"]

AGE_GROUPS = ["18-40", "41-60", "61-75", "75+"]

HIGH_RISK_MEDICINES = [
    "Heparin", "Insulin", "Morphine", "Potassium Chloride",
    "Warfarin", "Digoxin", "None"
]

CONSCIOUSNESS_STATUSES = ["Alert", "Confused", "Drowsy", "Unresponsive"]

ACTIONS = [
    "Acknowledged", "Checked Device", "Checked Patient",
    "Silenced Alarm", "Escalated", "No Immediate Action"
]

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "dataset")


# â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def jitter(val, lo, hi, scale=0.05):
    """Add Gaussian noise to a value, clipped to [lo, hi]."""
    return float(np.clip(val + np.random.normal(0, scale * (hi - lo)), lo, hi))


def patient_profile(pid):
    """Return a baseline vital-sign profile for a patient."""
    age_group = np.random.choice(AGE_GROUPS, p=[0.15, 0.30, 0.35, 0.20])
    ward = np.random.choice(WARDS)
    med = np.random.choice(HIGH_RISK_MEDICINES)

    # Base vitals â€“ varied per patient
    base_hr = np.random.uniform(62, 90)
    base_spo2 = np.random.uniform(94, 99)
    base_sbp = np.random.uniform(110, 145)
    base_dbp = np.random.uniform(65, 90)
    base_rr = np.random.uniform(12, 20)
    base_temp = np.random.uniform(36.2, 37.5)

    return {
        "patient_id": pid,
        "age_group": age_group,
        "ward": ward,
        "high_risk_medicine": med,
        "base_hr": base_hr,
        "base_spo2": base_spo2,
        "base_sbp": base_sbp,
        "base_dbp": base_dbp,
        "base_rr": base_rr,
        "base_temp": base_temp,
    }


# â”€â”€â”€ Scenario generators â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def scenario_nuisance(profile, t_start, n_alarms):
    """Stable patient, repeated same-device alarms â†’ NUISANCE."""
    records = []
    device = np.random.choice(DEVICE_TYPES)
    alarm_type = np.random.choice(["Low Battery", "Sensor Disconnected", "Flow Error", "Occlusion"])

    t = t_start
    for i in range(n_alarms):
        interval = np.random.randint(60, 240)   # 1â€“4 min
        t += timedelta(seconds=interval)

        hr = jitter(profile["base_hr"], 55, 100)
        spo2 = jitter(profile["base_spo2"], 92, 100)
        sbp = jitter(profile["base_sbp"], 100, 160)
        dbp = jitter(profile["base_dbp"], 60, 100)
        rr = jitter(profile["base_rr"], 10, 22)
        temp = jitter(profile["base_temp"], 36.0, 38.0)

        records.append({
            "scenario": "nuisance",
            "patient_id": profile["patient_id"],
            "timestamp": t,
            "device_type": device,
            "alarm_type": alarm_type,
            "alarm_priority": "Low" if i < n_alarms - 1 else np.random.choice(["Low", "Medium"]),
            "alarm_duration_seconds": np.random.randint(5, 60),
            "hr": hr, "spo2": spo2, "sbp": sbp, "dbp": dbp,
            "rr": rr, "temp": temp,
            "consciousness": "Alert",
            "ack_time": np.random.randint(5, 60),
            "resp_time": np.random.randint(15, 120),
            "action": np.random.choice(["Acknowledged", "Checked Device", "Silenced Alarm"]),
            "escalated": "No",
        })

    return records, t


def scenario_watch(profile, t_start, n_alarms):
    """Mild deterioration, uncertain pattern â†’ WATCH."""
    records = []
    t = t_start
    hr = profile["base_hr"]
    spo2 = profile["base_spo2"]
    rr = profile["base_rr"]

    for i in range(n_alarms):
        interval = np.random.randint(90, 360)
        t += timedelta(seconds=interval)

        # Slight worsening
        hr += np.random.uniform(-1, 2)
        spo2 -= np.random.uniform(0, 0.5)
        rr += np.random.uniform(0, 0.4)

        sbp = jitter(profile["base_sbp"], 100, 160)
        dbp = jitter(profile["base_dbp"], 60, 100)
        temp = jitter(profile["base_temp"], 36.0, 38.5)
        consciousness = np.random.choice(["Alert", "Alert", "Confused"], p=[0.7, 0.2, 0.1])

        records.append({
            "scenario": "watch",
            "patient_id": profile["patient_id"],
            "timestamp": t,
            "device_type": np.random.choice(DEVICE_TYPES),
            "alarm_type": np.random.choice(ALARM_TYPES),
            "alarm_priority": np.random.choice(["Low", "Medium"]),
            "alarm_duration_seconds": np.random.randint(15, 120),
            "hr": np.clip(hr, 55, 140),
            "spo2": np.clip(spo2, 88, 100),
            "sbp": sbp, "dbp": dbp,
            "rr": np.clip(rr, 10, 35),
            "temp": temp,
            "consciousness": consciousness,
            "ack_time": np.random.randint(20, 180),
            "resp_time": np.random.randint(60, 300),
            "action": np.random.choice(["Checked Patient", "Acknowledged", "Checked Device"]),
            "escalated": "No",
        })

    return records, t


def scenario_escalation(profile, t_start, n_alarms):
    """Increasing alarms + worsening vitals â†’ ESCALATION."""
    records = []
    t = t_start
    hr = profile["base_hr"]
    spo2 = profile["base_spo2"]
    rr = profile["base_rr"]

    for i in range(n_alarms):
        # Alarms become more frequent over time
        interval = max(30, int(np.random.randint(120, 300) * (1 - 0.07 * i)))
        t += timedelta(seconds=interval)

        hr += np.random.uniform(1.5, 4)
        spo2 -= np.random.uniform(0.5, 1.5)
        rr += np.random.uniform(0.5, 1.5)
        sbp = jitter(profile["base_sbp"] - i * 2, 85, 160)
        dbp = jitter(profile["base_dbp"], 55, 100)
        temp = jitter(profile["base_temp"] + i * 0.1, 36.5, 40.0)
        consciousness = np.random.choice(["Alert", "Confused", "Drowsy"], p=[0.4, 0.4, 0.2])

        priority = "High" if i >= n_alarms // 2 else "Medium"

        records.append({
            "scenario": "escalation",
            "patient_id": profile["patient_id"],
            "timestamp": t,
            "device_type": np.random.choice(DEVICE_TYPES),
            "alarm_type": np.random.choice(
                ["High Heart Rate", "Low SpO2", "High Respiratory Rate", "Occlusion"]),
            "alarm_priority": priority,
            "alarm_duration_seconds": np.random.randint(30, 180),
            "hr": np.clip(hr, 60, 180),
            "spo2": np.clip(spo2, 75, 100),
            "sbp": sbp, "dbp": dbp,
            "rr": np.clip(rr, 10, 45),
            "temp": temp,
            "consciousness": consciousness,
            "ack_time": np.random.randint(60, 600),
            "resp_time": np.random.randint(120, 900),
            "action": np.random.choice(["Escalated", "Checked Patient", "No Immediate Action"],
                                        p=[0.5, 0.3, 0.2]),
            "escalated": np.random.choice(["Yes", "No"], p=[0.7, 0.3]),
        })

    return records, t


def scenario_critical(profile, t_start, n_alarms):
    """Rapid severe deterioration â†’ CRITICAL."""
    records = []
    t = t_start
    hr = profile["base_hr"]
    spo2 = profile["base_spo2"]
    rr = profile["base_rr"]

    for i in range(n_alarms):
        interval = max(20, int(np.random.randint(60, 150) * (1 - 0.10 * i)))
        t += timedelta(seconds=interval)

        hr += np.random.uniform(3, 7)
        spo2 -= np.random.uniform(1.5, 3.0)
        rr += np.random.uniform(1, 3)
        sbp = jitter(profile["base_sbp"] - i * 4, 60, 160)
        dbp = jitter(profile["base_dbp"] - i * 2, 40, 100)
        temp = jitter(profile["base_temp"] + i * 0.2, 35.0, 41.0)
        consciousness = np.random.choice(
            ["Alert", "Confused", "Drowsy", "Unresponsive"], p=[0.1, 0.3, 0.4, 0.2])

        records.append({
            "scenario": "critical",
            "patient_id": profile["patient_id"],
            "timestamp": t,
            "device_type": np.random.choice(DEVICE_TYPES),
            "alarm_type": np.random.choice(
                ["High Heart Rate", "Low SpO2", "High Respiratory Rate"]),
            "alarm_priority": "High",
            "alarm_duration_seconds": np.random.randint(60, 300),
            "hr": np.clip(hr, 60, 220),
            "spo2": np.clip(spo2, 70, 100),
            "sbp": sbp, "dbp": dbp,
            "rr": np.clip(rr, 10, 55),
            "temp": temp,
            "consciousness": consciousness,
            "ack_time": np.random.randint(120, 1200),
            "resp_time": np.random.randint(300, 1800),
            "action": np.random.choice(["Escalated", "No Immediate Action"], p=[0.8, 0.2]),
            "escalated": "Yes",
        })

    return records, t


# â”€â”€â”€ Main generation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def generate_all():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    patient_profiles = {f"P{i+1:03d}": patient_profile(f"P{i+1:03d}")
                        for i in range(N_PATIENTS)}

    all_records = []
    alarm_id = 1

    # Scenario distribution: nuisance 40%, watch 25%, escalation 25%, critical 10%
    scenario_weights = {
        "nuisance": 0.40, "watch": 0.25, "escalation": 0.25, "critical": 0.10
    }
    scenario_funcs = {
        "nuisance": scenario_nuisance,
        "watch": scenario_watch,
        "escalation": scenario_escalation,
        "critical": scenario_critical,
    }
    label_map = {"nuisance": 0, "watch": 1, "escalation": 2, "critical": 3}

    patient_ids = list(patient_profiles.keys())

    # We'll keep generating scenarios until we have >= N_ALARMS_TARGET
    while len(all_records) < N_ALARMS_TARGET:
        pid = np.random.choice(patient_ids)
        prof = patient_profiles[pid]
        scenario = np.random.choice(
            list(scenario_weights.keys()),
            p=list(scenario_weights.values())
        )
        n_alarms = np.random.randint(4, 18)
        t_start = START_TIME + timedelta(
            days=np.random.randint(0, 60),
            hours=np.random.randint(0, 24),
            minutes=np.random.randint(0, 60)
        )

        fn = scenario_funcs[scenario]
        records, _ = fn(prof, t_start, n_alarms)
        for r in records:
            r["alarm_id"] = f"ALM{alarm_id:05d}"
            r["label"] = label_map[scenario]
            alarm_id += 1
        all_records.extend(records)

    df = pd.DataFrame(all_records)
    df = df.sort_values("timestamp").reset_index(drop=True)

    # â”€â”€ Compute alarm_count_10min and time_since_previous_alarm â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values(["patient_id", "timestamp"]).reset_index(drop=True)

    # Time since previous alarm per patient
    df["time_since_previous_alarm"] = (
        df.groupby("patient_id")["timestamp"].diff().dt.total_seconds().fillna(0)
    )

    # Alarm count in past 10 minutes per patient
    alarm_counts = []
    for pid in df["patient_id"].unique():
        sub = df[df["patient_id"] == pid].copy()
        counts = []
        for i, row in sub.iterrows():
            window_start = row["timestamp"] - timedelta(minutes=10)
            cnt = ((sub["timestamp"] >= window_start) &
                   (sub["timestamp"] <= row["timestamp"])).sum()
            counts.append(cnt)
        alarm_counts.extend(counts)
    df["alarm_count_10min"] = alarm_counts

    # â”€â”€â”€ Split into the 4 CSV files â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    # A. alarm_stream.csv
    alarm_stream = df[[
        "alarm_id", "patient_id", "timestamp", "device_type", "alarm_type",
        "alarm_priority", "alarm_duration_seconds", "alarm_count_10min",
        "time_since_previous_alarm", "scenario", "label"
    ]].copy()
    alarm_stream.to_csv(os.path.join(OUTPUT_DIR, "alarm_stream.csv"), index=False)
    print(f"[OK] alarm_stream.csv  -> {len(alarm_stream):,} rows")

    # B. patient_context.csv
    patient_context = df[[
        "alarm_id", "patient_id", "timestamp", "hr", "spo2",
        "sbp", "dbp", "rr", "temp", "consciousness"
    ]].copy()

    # Add static patient demographics via merge
    demog = pd.DataFrame([
        {
            "patient_id": pid,
            "age_group": p["age_group"],
            "ward": p["ward"],
            "high_risk_medicine": p["high_risk_medicine"],
        }
        for pid, p in patient_profiles.items()
    ])
    patient_context = patient_context.merge(demog, on="patient_id", how="left")
    patient_context = patient_context.rename(columns={
        "hr": "heart_rate", "spo2": "spo2", "sbp": "systolic_bp",
        "dbp": "diastolic_bp", "rr": "respiratory_rate",
        "temp": "temperature", "consciousness": "consciousness_status"
    })
    cols_order = [
        "alarm_id", "patient_id", "timestamp", "age_group", "ward",
        "high_risk_medicine", "heart_rate", "spo2", "systolic_bp",
        "diastolic_bp", "respiratory_rate", "temperature", "consciousness_status"
    ]
    patient_context = patient_context[cols_order]
    patient_context.to_csv(os.path.join(OUTPUT_DIR, "patient_context.csv"), index=False)
    print(f"[âœ“] patient_context.csv â†’ {len(patient_context):,} rows")

    # C. staff_response.csv
    staff_response = df[[
        "alarm_id", "patient_id", "ack_time", "resp_time", "action", "escalated"
    ]].copy()
    staff_response = staff_response.rename(columns={
        "ack_time": "acknowledgement_time_seconds",
        "resp_time": "response_time_seconds",
        "action": "action_taken",
        "escalated": "escalated_to_staff",
    })
    staff_response.to_csv(os.path.join(OUTPUT_DIR, "staff_response.csv"), index=False)
    print(f"[âœ“] staff_response.csv â†’ {len(staff_response):,} rows")

    # D. confirmed_events.csv
    event_rows = []
    eid = 1
    for pid in df["patient_id"].unique():
        sub = df[df["patient_id"] == pid]
        for scenario_name, group in sub.groupby("scenario"):
            label = label_map[scenario_name]
            severity = ["Minimal", "Low", "Moderate", "High"][label]
            review = np.random.choice(["Confirmed", "Probable", "Possible"])
            source = np.random.choice(
                ["Clinical Review", "Automated Flagging", "Staff Report"])
            event_rows.append({
                "patient_id": pid,
                "event_id": f"EVT{eid:05d}",
                "confirmed_label": label,
                "event_severity": severity,
                "clinical_review": review,
                "confirmation_source": source,
            })
            eid += 1

    confirmed_events = pd.DataFrame(event_rows)
    confirmed_events.to_csv(
        os.path.join(OUTPUT_DIR, "confirmed_events.csv"), index=False)
    print(f"[âœ“] confirmed_events.csv â†’ {len(confirmed_events):,} rows")

    print(f"\n[âœ“] Total alarm records generated: {len(alarm_stream):,}")
    print("\nLabel distribution:")
    print(alarm_stream["label"].value_counts().rename(
        {0: "Nuisance", 1: "Watch", 2: "Escalation", 3: "Critical"}))
    return alarm_stream


if __name__ == "__main__":
    generate_all()

