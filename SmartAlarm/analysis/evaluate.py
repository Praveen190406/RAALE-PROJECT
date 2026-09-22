"""
SmartAlarm - Evaluation Module
Loads saved test predictions and computes all evaluation metrics.
"""
import pandas as pd
import numpy as np
import json
import os

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "model", "saved_model")
LABEL_NAMES = {0: "Nuisance", 1: "Watch", 2: "Escalation", 3: "Critical"}


def load_metrics():
    path = os.path.join(MODEL_DIR, "metrics.json")
    with open(path) as f:
        return json.load(f)


def load_test_predictions():
    path = os.path.join(MODEL_DIR, "test_predictions.csv")
    return pd.read_csv(path)


def load_feature_importances():
    path = os.path.join(MODEL_DIR, "feature_importances.csv")
    return pd.read_csv(path)


if __name__ == "__main__":
    metrics = load_metrics()
    print(json.dumps(metrics, indent=2))
