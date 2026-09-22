"""
SmartAlarm - Error Analysis Module
Identifies and characterises false positives and false negatives.
"""
import pandas as pd
import numpy as np
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "model", "saved_model")
LABEL_NAMES = {0: "Nuisance", 1: "Watch", 2: "Escalation", 3: "Critical"}


def get_errors(df_test: pd.DataFrame) -> dict:
    """
    Given a test predictions dataframe (from model/saved_model/test_predictions.csv),
    return dicts of false positives and false negatives.

    False Positive: dangerous predicted (2 or 3) but actual is non-dangerous (0 or 1)
    False Negative: dangerous actual (2 or 3) but predicted as non-dangerous (0 or 1)
    """
    y_true = df_test["y_true"].values
    y_pred = df_test["y_pred_best"].values

    fp_mask = np.isin(y_pred, [2, 3]) & np.isin(y_true, [0, 1])
    fn_mask = np.isin(y_true, [2, 3]) & np.isin(y_pred, [0, 1])

    df_fp = df_test[fp_mask].copy()
    df_fn = df_test[fn_mask].copy()

    df_fp["actual_class"] = df_fp["y_true"].map(LABEL_NAMES)
    df_fp["predicted_class"] = df_fp["y_pred_best"].map(LABEL_NAMES)
    df_fp["error_type"] = "False Positive"
    df_fp["potential_harm"] = "Unnecessary staff escalation; possible alarm fatigue; resources diverted from genuinely critical patients."
    df_fp["possible_reason"] = "Alarm frequency or vital sign features slightly elevated but not clinically significant in context."

    df_fn["actual_class"] = df_fn["y_true"].map(LABEL_NAMES)
    df_fn["predicted_class"] = df_fn["y_pred_best"].map(LABEL_NAMES)
    df_fn["error_type"] = "False Negative"
    df_fn["potential_harm"] = "⚠️ DANGEROUS: Delayed recognition of deteriorating pattern; delayed human assessment; potentially missed clinical event."
    df_fn["possible_reason"] = "Alarm pattern or vital sign changes subtle; model features insufficient to distinguish from lower-severity pattern."

    return {"false_positives": df_fp, "false_negatives": df_fn}


if __name__ == "__main__":
    from analysis.evaluate import load_test_predictions
    df_test = load_test_predictions()
    errors = get_errors(df_test)
    print(f"False Positives: {len(errors['false_positives'])}")
    print(f"False Negatives: {len(errors['false_negatives'])}")
