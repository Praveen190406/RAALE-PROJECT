"""
SmartAlarm - Model Training Script
Trains Logistic Regression and Random Forest classifiers.
Saves the best model based on Dangerous Pattern Recall.

IMPORTANT: This is an academic prototype using synthetic data.
"""

import numpy as np
import pandas as pd
import joblib
import os
import sys
import json

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from preprocessing.preprocess import (
    load_datasets, merge_datasets, engineer_features,
    build_preprocessing_pipeline, save_pipeline, LABEL_NAMES
)
from baseline.baseline import baseline_predict

MODEL_DIR = os.path.join(os.path.dirname(__file__), "saved_model")
DATASET_DIR = os.path.join(os.path.dirname(__file__), "..", "dataset")
os.makedirs(MODEL_DIR, exist_ok=True)


# ─── Metrics ──────────────────────────────────────────────────────────────────

def compute_metrics(y_true, y_pred, model_name="Model"):
    """Compute all required evaluation metrics."""
    acc = accuracy_score(y_true, y_pred)

    # Per-class metrics (macro averaged)
    from sklearn.metrics import precision_score, recall_score, f1_score
    precision = precision_score(y_true, y_pred, average="macro", zero_division=0)
    recall = recall_score(y_true, y_pred, average="macro", zero_division=0)
    f1 = f1_score(y_true, y_pred, average="macro", zero_division=0)

    cm = confusion_matrix(y_true, y_pred, labels=[0, 1, 2, 3])

    # Dangerous Pattern Recall: (Escalation=2, Critical=3)
    dangerous_mask = np.isin(y_true, [2, 3])
    if dangerous_mask.sum() > 0:
        dangerous_recall = ((np.isin(y_pred[dangerous_mask], [2, 3])).sum() /
                            dangerous_mask.sum())
    else:
        dangerous_recall = 0.0

    # Nuisance High-Priority Rate: nuisance (label=0) predicted as Escalation/Critical
    nuisance_mask = y_true == 0
    if nuisance_mask.sum() > 0:
        nuisance_hp_rate = (np.isin(y_pred[nuisance_mask], [2, 3]).sum() /
                            nuisance_mask.sum())
    else:
        nuisance_hp_rate = 0.0

    # Binary dangerous vs not for sensitivity/specificity
    y_bin_true = np.isin(y_true, [2, 3]).astype(int)
    y_bin_pred = np.isin(y_pred, [2, 3]).astype(int)
    TP = ((y_bin_true == 1) & (y_bin_pred == 1)).sum()
    TN = ((y_bin_true == 0) & (y_bin_pred == 0)).sum()
    FP = ((y_bin_true == 0) & (y_bin_pred == 1)).sum()
    FN = ((y_bin_true == 1) & (y_bin_pred == 0)).sum()

    sensitivity = TP / (TP + FN) if (TP + FN) > 0 else 0
    specificity = TN / (TN + FP) if (TN + FP) > 0 else 0
    fpr = FP / (FP + TN) if (FP + TN) > 0 else 0
    fnr = FN / (FN + TP) if (FN + TP) > 0 else 0

    return {
        "model": model_name,
        "accuracy": round(acc, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "sensitivity": round(sensitivity, 4),
        "specificity": round(specificity, 4),
        "false_positive_rate": round(fpr, 4),
        "false_negative_rate": round(fnr, 4),
        "dangerous_pattern_recall": round(dangerous_recall, 4),
        "nuisance_high_priority_rate": round(nuisance_hp_rate, 4),
        "confusion_matrix": cm.tolist(),
        "n_false_positives": int(FP),
        "n_false_negatives": int(FN),
    }


def train():
    print("=" * 60)
    print("SmartAlarm Model Training")
    print("=" * 60)

    # ── Load & merge ──────────────────────────────────────────────────────────
    alarm, context, staff = load_datasets()
    df = merge_datasets(alarm, context, staff)
    print(f"[✓] Merged dataset: {len(df):,} rows")

    # ── Preprocessing & Feature Engineering ───────────────────────────────────
    encoder, scaler, feature_list, df_processed = build_preprocessing_pipeline(df)
    save_pipeline(encoder, scaler, feature_list)

    X = df_processed[feature_list].values
    y = df["label"].values

    # ── Train / Test Split (no leakage: split before feature engineering) ─────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"[✓] Train: {len(X_train):,} | Test: {len(X_test):,}")

    # ── Baseline ──────────────────────────────────────────────────────────────
    df_processed_reset = df_processed.reset_index(drop=True)
    test_indices = np.where(
        np.isin(np.arange(len(y)), np.arange(len(y_test)))
    )[0][:len(y_test)]

    # We get test rows from the full processed df
    _, test_idx = train_test_split(
        np.arange(len(df_processed)), test_size=0.2, random_state=42,
        stratify=y
    )
    df_test = df_processed.iloc[test_idx].copy()
    y_test_actual = y[test_idx]

    baseline_preds = baseline_predict(df_test)
    baseline_metrics = compute_metrics(y_test_actual, baseline_preds, "Baseline")
    print(f"\n[Baseline] Accuracy: {baseline_metrics['accuracy']:.4f} | "
          f"Dangerous Recall: {baseline_metrics['dangerous_pattern_recall']:.4f}")

    # ── Logistic Regression ───────────────────────────────────────────────────
    lr = LogisticRegression(max_iter=1000, random_state=42, C=1.0,
                             class_weight="balanced")
    lr.fit(X_train, y_train)
    lr_preds = lr.predict(X_test)
    lr_metrics = compute_metrics(y_test, lr_preds, "Logistic Regression")
    print(f"[LR]       Accuracy: {lr_metrics['accuracy']:.4f} | "
          f"Dangerous Recall: {lr_metrics['dangerous_pattern_recall']:.4f}")

    # ── Random Forest ─────────────────────────────────────────────────────────
    rf = RandomForestClassifier(
        n_estimators=200, random_state=42,
        class_weight="balanced", max_depth=15, n_jobs=-1
    )
    rf.fit(X_train, y_train)
    rf_preds = rf.predict(X_test)
    rf_metrics = compute_metrics(y_test, rf_preds, "Random Forest")
    print(f"[RF]       Accuracy: {rf_metrics['accuracy']:.4f} | "
          f"Dangerous Recall: {rf_metrics['dangerous_pattern_recall']:.4f}")

    # ── Choose best model (by Dangerous Pattern Recall, then F1) ─────────────
    candidates = [(lr, lr_metrics, "lr"), (rf, rf_metrics, "rf")]
    best_model, best_metrics, best_name = max(
        candidates,
        key=lambda x: (x[1]["dangerous_pattern_recall"], x[1]["f1"])
    )
    print(f"\n[✓] Best model: {best_metrics['model']}")

    # ── Save models & metrics ─────────────────────────────────────────────────
    joblib.dump(lr, os.path.join(MODEL_DIR, "logistic_regression.pkl"))
    joblib.dump(rf, os.path.join(MODEL_DIR, "random_forest.pkl"))
    joblib.dump(best_model, os.path.join(MODEL_DIR, "best_model.pkl"))
    joblib.dump(best_name, os.path.join(MODEL_DIR, "best_model_name.pkl"))

    # Save feature importances for RF
    fi = pd.DataFrame({
        "feature": feature_list,
        "importance": rf.feature_importances_
    }).sort_values("importance", ascending=False)
    fi.to_csv(os.path.join(MODEL_DIR, "feature_importances.csv"), index=False)

    # Save all metrics and test predictions for the app
    all_metrics = {
        "baseline": baseline_metrics,
        "logistic_regression": lr_metrics,
        "random_forest": rf_metrics,
        "best_model": best_metrics["model"],
    }
    with open(os.path.join(MODEL_DIR, "metrics.json"), "w") as f:
        json.dump(all_metrics, f, indent=2)

    # Save test predictions for error analysis
    df_test_out = df_processed.iloc[test_idx].copy()
    df_test_out["y_true"] = y_test_actual
    df_test_out["y_pred_baseline"] = baseline_preds
    df_test_out["y_pred_lr"] = lr_preds
    df_test_out["y_pred_rf"] = rf_preds
    df_test_out["y_pred_best"] = best_model.predict(X_test)
    # Save probabilities from best model
    probs = best_model.predict_proba(X_test)
    for i, cls in enumerate([0, 1, 2, 3]):
        df_test_out[f"prob_class_{cls}"] = probs[:, i]
    df_test_out.to_csv(os.path.join(MODEL_DIR, "test_predictions.csv"), index=False)

    print(f"\n[✓] All models and metrics saved to: {MODEL_DIR}")
    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    for m in [baseline_metrics, lr_metrics, rf_metrics]:
        print(f"\n{m['model']}:")
        print(f"  Accuracy:               {m['accuracy']:.4f}")
        print(f"  F1 (macro):             {m['f1']:.4f}")
        print(f"  Dangerous Pattern Recall: {m['dangerous_pattern_recall']:.4f}")
        print(f"  Nuisance HP Rate:       {m['nuisance_high_priority_rate']:.4f}")
        print(f"  False Positives:        {m['n_false_positives']}")
        print(f"  False Negatives:        {m['n_false_negatives']}")

    return all_metrics


if __name__ == "__main__":
    train()
