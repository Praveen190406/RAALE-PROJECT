"""
SmartAlarm - Preprocessing & Feature Engineering Pipeline
Merges all datasets, creates features, encodes, scales, and saves the pipeline.

IMPORTANT: The SAME pipeline object must be used for both training and prediction.
"""

import numpy as np
import pandas as pd
import joblib
import os
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.pipeline import Pipeline

DATASET_DIR = os.path.join(os.path.dirname(__file__), "..", "dataset")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "model", "saved_model")

LABEL_NAMES = {0: "Nuisance", 1: "Watch", 2: "Escalation", 3: "Critical"}

CATEGORICAL_COLS = [
    "device_type", "alarm_type", "alarm_priority",
    "age_group", "ward", "high_risk_medicine",
    "consciousness_status", "action_taken", "escalated_to_staff"
]

NUMERICAL_COLS = [
    "alarm_duration_seconds", "alarm_count_10min", "time_since_previous_alarm",
    "heart_rate", "spo2", "systolic_bp", "diastolic_bp",
    "respiratory_rate", "temperature",
    "acknowledgement_time_seconds", "response_time_seconds",
    # engineered
    "vital_abnormality_count", "hr_change", "spo2_change",
    "rr_change", "bp_change", "temp_change",
    "alarm_frequency_trend", "repeated_alarm_count",
]


# ─── Loaders ──────────────────────────────────────────────────────────────────

def load_datasets():
    alarm = pd.read_csv(os.path.join(DATASET_DIR, "alarm_stream.csv"), parse_dates=["timestamp"])
    context = pd.read_csv(os.path.join(DATASET_DIR, "patient_context.csv"), parse_dates=["timestamp"])
    staff = pd.read_csv(os.path.join(DATASET_DIR, "staff_response.csv"))
    return alarm, context, staff


def merge_datasets(alarm, context, staff):
    """Merge alarm stream with patient context and staff response."""
    # Merge on alarm_id + patient_id
    df = alarm.merge(
        context.drop(columns=["timestamp"]),
        on=["alarm_id", "patient_id"],
        how="left"
    )
    df = df.merge(staff, on=["alarm_id", "patient_id"], how="left")
    return df


# ─── Feature Engineering ──────────────────────────────────────────────────────

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df = df.sort_values(["patient_id", "timestamp"]).reset_index(drop=True)

    # ── Vital sign changes (lag-1 per patient) ────────────────────────────────
    for col, new_col in [
        ("heart_rate", "hr_change"),
        ("spo2", "spo2_change"),
        ("respiratory_rate", "rr_change"),
        ("systolic_bp", "bp_change"),
        ("temperature", "temp_change"),
    ]:
        df[new_col] = df.groupby("patient_id")[col].diff().fillna(0)

    # ── Vital abnormality count ───────────────────────────────────────────────
    # Prototype thresholds (NOT clinically validated)
    abnormal = (
        (df["heart_rate"] > 100) | (df["heart_rate"] < 50) |
        (df["spo2"] < 92) |
        (df["respiratory_rate"] > 25) | (df["respiratory_rate"] < 8) |
        (df["systolic_bp"] > 160) | (df["systolic_bp"] < 90) |
        (df["temperature"] > 38.5) | (df["temperature"] < 35.5)
    )
    df["vital_abnormality_count"] = abnormal.astype(int)

    # ── Alarm frequency trend: change in alarm_count_10min vs previous ────────
    df["alarm_frequency_trend"] = (
        df.groupby("patient_id")["alarm_count_10min"].diff().fillna(0)
    )

    # ── Repeated alarm count: # of same alarm_type per patient in last 10 min ─
    df["repeated_alarm_count"] = df.groupby(
        ["patient_id", "alarm_type"]
    )["alarm_id"].transform("count").fillna(0)

    # ── Fill missing response columns ─────────────────────────────────────────
    df["acknowledgement_time_seconds"] = df["acknowledgement_time_seconds"].fillna(
        df["acknowledgement_time_seconds"].median())
    df["response_time_seconds"] = df["response_time_seconds"].fillna(
        df["response_time_seconds"].median())
    df["action_taken"] = df["action_taken"].fillna("No Immediate Action")
    df["escalated_to_staff"] = df["escalated_to_staff"].fillna("No")

    # ── Fill missing context columns ──────────────────────────────────────────
    for col in ["age_group", "ward", "high_risk_medicine", "consciousness_status"]:
        df[col] = df[col].fillna("Unknown")

    # ── Fill missing vitals with patient median ───────────────────────────────
    for col in ["heart_rate", "spo2", "systolic_bp", "diastolic_bp",
                "respiratory_rate", "temperature"]:
        df[col] = df.groupby("patient_id")[col].transform(
            lambda x: x.fillna(x.median()))
        df[col] = df[col].fillna(df[col].median())

    return df


# ─── Encoding ─────────────────────────────────────────────────────────────────

class CategoricalEncoder:
    """Fits and transforms categorical columns using LabelEncoder per column."""

    def __init__(self, cols):
        self.cols = cols
        self.encoders = {}

    def fit(self, df):
        for col in self.cols:
            le = LabelEncoder()
            le.fit(df[col].astype(str))
            self.encoders[col] = le
        return self

    def transform(self, df):
        df = df.copy()
        for col in self.cols:
            le = self.encoders[col]
            # Handle unseen categories
            known = set(le.classes_)
            df[col] = df[col].astype(str).apply(
                lambda x: x if x in known else le.classes_[0]
            )
            df[col] = le.transform(df[col])
        return df

    def fit_transform(self, df):
        return self.fit(df).transform(df)

    def inverse_transform_col(self, col, values):
        return self.encoders[col].inverse_transform(values)


class NumericalScaler:
    """Fits and applies StandardScaler to numerical columns."""

    def __init__(self, cols):
        self.cols = cols
        self.scaler = StandardScaler()

    def fit(self, df):
        self.scaler.fit(df[self.cols].fillna(0))
        return self

    def transform(self, df):
        df = df.copy()
        df[self.cols] = self.scaler.transform(df[self.cols].fillna(0))
        return df

    def fit_transform(self, df):
        return self.fit(df).transform(df)


# ─── Full pipeline ────────────────────────────────────────────────────────────

FEATURE_COLS = CATEGORICAL_COLS + NUMERICAL_COLS


def get_available_feature_cols(df):
    """Return only those feature columns that are actually in the dataframe."""
    return [c for c in FEATURE_COLS if c in df.columns]


def build_preprocessing_pipeline(df: pd.DataFrame):
    """
    Fit categorical encoder and numerical scaler on df.
    Returns (encoder, scaler, feature_list).
    """
    df_eng = engineer_features(df)
    avail_cat = [c for c in CATEGORICAL_COLS if c in df_eng.columns]
    avail_num = [c for c in NUMERICAL_COLS if c in df_eng.columns]

    encoder = CategoricalEncoder(avail_cat)
    df_enc = encoder.fit_transform(df_eng)

    scaler = NumericalScaler(avail_num)
    df_scaled = scaler.fit_transform(df_enc)

    feature_list = avail_cat + avail_num
    return encoder, scaler, feature_list, df_scaled


def preprocess_for_prediction(df: pd.DataFrame, encoder, scaler, feature_list):
    """
    Apply the SAME preprocessing as during training to new data.
    """
    df_eng = engineer_features(df)
    avail_cat = [c for c in encoder.cols if c in df_eng.columns]
    avail_num = [c for c in scaler.cols if c in df_eng.columns]

    df_enc = encoder.transform(df_eng)
    df_scaled = scaler.transform(df_enc)

    # Return only known feature columns
    avail_features = [f for f in feature_list if f in df_scaled.columns]
    return df_scaled[avail_features], avail_features


def save_pipeline(encoder, scaler, feature_list):
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(encoder, os.path.join(MODEL_DIR, "encoder.pkl"))
    joblib.dump(scaler, os.path.join(MODEL_DIR, "scaler.pkl"))
    joblib.dump(feature_list, os.path.join(MODEL_DIR, "feature_list.pkl"))
    print("[✓] Preprocessing pipeline saved.")


def load_pipeline():
    encoder = joblib.load(os.path.join(MODEL_DIR, "encoder.pkl"))
    scaler = joblib.load(os.path.join(MODEL_DIR, "scaler.pkl"))
    feature_list = joblib.load(os.path.join(MODEL_DIR, "feature_list.pkl"))
    return encoder, scaler, feature_list


if __name__ == "__main__":
    alarm, context, staff = load_datasets()
    df = merge_datasets(alarm, context, staff)
    print(f"[✓] Merged dataset: {len(df):,} rows")

    encoder, scaler, feature_list, df_processed = build_preprocessing_pipeline(df)
    save_pipeline(encoder, scaler, feature_list)
    print(f"[✓] Feature list ({len(feature_list)} features): {feature_list}")
    print(df_processed[feature_list].head())
