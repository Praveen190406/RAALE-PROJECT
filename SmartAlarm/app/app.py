"""
SmartAlarm – AI-Based Alarm Pattern Analyser for Busy Inpatient Wards
======================================================================
Academic/Research Prototype · Synthetic Data Only · Not a Medical Device
Every prediction requires human review before any clinical action.

Run: streamlit run app/app.py
"""

import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import json
import os
import sys
import time
from datetime import datetime

# ─── Path setup ───────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

DATASET_DIR = os.path.join(BASE_DIR, "dataset")
MODEL_DIR = os.path.join(BASE_DIR, "model", "saved_model")

# ─── Page config ──────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="SmartAlarm – Live Monitor",
    page_icon="🏥",
    layout="wide",
    initial_sidebar_state="expanded",
)

# ─── Theme / CSS ──────────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

* { font-family: 'Inter', sans-serif; }
.stApp { background: linear-gradient(135deg, #0a0e1a 0%, #0d1525 50%, #0a1020 100%); }
section[data-testid="stSidebar"] {
    background: linear-gradient(180deg, #0d1a2e 0%, #0a1220 100%) !important;
    border-right: 1px solid rgba(100,160,255,0.15);
}
section[data-testid="stSidebar"] .stRadio label {
    color: #a8c7f0 !important; font-size: 0.95rem !important; padding: 6px 0; font-weight: 500;
}
.safety-banner {
    background: linear-gradient(90deg, rgba(255,200,0,0.12), rgba(255,120,0,0.12));
    border: 1px solid rgba(255,180,0,0.4); border-radius: 8px; padding: 10px 16px;
    margin-bottom: 16px; font-size: 0.78rem; color: #ffd080; text-align: center;
}
.metric-card {
    background: rgba(255,255,255,0.04); border: 1px solid rgba(100,160,255,0.2);
    border-radius: 12px; padding: 18px 22px; text-align: center;
}
.label-badge { border-radius: 20px; padding: 4px 12px; font-size: 0.85rem; font-weight: 700; }
.section-header {
    font-size: 1.4rem; font-weight: 700; color: #e0eeff;
    border-left: 4px solid #4a9eff; padding-left: 12px; margin: 20px 0 14px 0;
}
.sub-header { font-size: 1rem; font-weight: 600; color: #a0c0e0; margin: 12px 0 8px 0; }
.evidence-box { background: rgba(10,30,60,0.6); border: 1px solid rgba(70,130,200,0.3); border-radius: 10px; padding: 14px 18px; margin: 8px 0; }
.evidence-item { font-size: 0.85rem; color: #cde0f8; margin: 4px 0; }
.pred-critical  { background: linear-gradient(135deg, rgba(231,76,60,0.2), rgba(180,30,20,0.1));  border: 2px solid rgba(231,76,60,0.6); border-radius: 14px; padding: 20px; }
.pred-escalation{ background: linear-gradient(135deg, rgba(230,126,34,0.15), rgba(180,90,20,0.1)); border: 2px solid rgba(230,126,34,0.5); border-radius: 14px; padding: 20px; }
.pred-watch     { background: linear-gradient(135deg, rgba(243,156,18,0.12), rgba(180,120,0,0.1)); border: 2px solid rgba(243,156,18,0.4); border-radius: 14px; padding: 20px; }
.pred-nuisance  { background: linear-gradient(135deg, rgba(46,204,113,0.1), rgba(30,140,70,0.05));  border: 2px solid rgba(46,204,113,0.3); border-radius: 14px; padding: 20px; }
.harm-box { background: rgba(60,20,20,0.5); border: 1px solid rgba(200,80,80,0.4); border-radius: 10px; padding: 14px; margin: 6px 0; }
.harm-box-low { background: rgba(20,40,20,0.5); border: 1px solid rgba(80,180,80,0.3); border-radius: 10px; padding: 14px; margin: 6px 0; }
.alarm-row { background: rgba(255,255,255,0.03); border: 1px solid rgba(100,150,200,0.15); border-radius: 8px; padding: 10px 14px; margin: 4px 0; font-size: 0.82rem; }
.stSelectbox label, .stSlider label, .stRadio label { color: #a0c0e0 !important; }
h1, h2, h3 { color: #e0eeff !important; }
p { color: #a8c7f0 !important; }
</style>
""", unsafe_allow_html=True)

# ─── Constants ────────────────────────────────────────────────────────────────
LABEL_NAMES = {0: "Nuisance", 1: "Watch", 2: "Escalation", 3: "Critical"}
LABEL_COLORS_HEX = {0: "#2ecc71", 1: "#f39c12", 2: "#e67e22", 3: "#e74c3c"}
PRED_CSS = {0: "pred-nuisance", 1: "pred-watch", 2: "pred-escalation", 3: "pred-critical"}

# ─── Cached data loaders ──────────────────────────────────────────────────────

@st.cache_data
def load_alarm_stream():
    return pd.read_csv(os.path.join(DATASET_DIR, "alarm_stream.csv"), parse_dates=["timestamp"])

@st.cache_data
def load_patient_context():
    return pd.read_csv(os.path.join(DATASET_DIR, "patient_context.csv"), parse_dates=["timestamp"])

@st.cache_data
def load_staff_response():
    return pd.read_csv(os.path.join(DATASET_DIR, "staff_response.csv"))

@st.cache_data
def load_metrics():
    with open(os.path.join(MODEL_DIR, "metrics.json")) as f:
        return json.load(f)

@st.cache_data
def load_test_predictions():
    return pd.read_csv(os.path.join(MODEL_DIR, "test_predictions.csv"))

def load_model_and_pipeline():
    import joblib
    from preprocessing.preprocess import load_pipeline
    encoder, scaler, feature_list = load_pipeline()
    model = joblib.load(os.path.join(MODEL_DIR, "best_model.pkl"))
    return model, encoder, scaler, feature_list


# ─── Helpers ──────────────────────────────────────────────────────────────────

def safety_banner():
    st.markdown(
        '<div class="safety-banner">'
        '🔬 ACADEMIC PROTOTYPE · SYNTHETIC DATA ONLY · NOT A MEDICAL DEVICE · '
        'NOT CLINICALLY VALIDATED · ALL PREDICTIONS REQUIRE HUMAN REVIEW'
        '</div>', unsafe_allow_html=True
    )

def confidence_color(conf):
    return {"HIGH": "#2ecc71", "MEDIUM": "#f39c12", "LOW": "#e74c3c"}.get(conf, "#aaa")

def prob_bar_chart(probs_dict):
    labels, values = list(probs_dict.keys()), list(probs_dict.values())
    colors = [LABEL_COLORS_HEX[i] for i in range(4)]
    fig = go.Figure(go.Bar(
        x=values, y=labels, orientation="h", marker_color=colors,
        text=[f"{v:.1f}%" for v in values], textposition="outside",
    ))
    fig.update_layout(
        xaxis=dict(range=[0, 105], title="Probability (%)", color="#a0c0e0", gridcolor="rgba(100,160,255,0.1)"),
        yaxis=dict(color="#a0c0e0"), plot_bgcolor="rgba(0,0,0,0)", paper_bgcolor="rgba(0,0,0,0)",
        font=dict(color="#a0c0e0"), height=180, margin=dict(l=10, r=60, t=10, b=10), showlegend=False,
    )
    return fig

def run_model_prediction(input_dict, model, encoder, scaler, feature_list):
    from preprocessing.preprocess import preprocess_for_prediction, engineer_features
    from model.predict import get_confidence, get_potential_harm, generate_evidence
    
    df_input = pd.DataFrame([input_dict])
    defaults = {
        "alarm_id": "SIM001", "patient_id": "P_SIM", "timestamp": pd.Timestamp.now(),
        "scenario": "unknown", "label": -1, "age_group": "Unknown", "ward": "Unknown",
        "high_risk_medicine": "Unknown", "consciousness_status": "Alert",
        "alarm_duration_seconds": 60, "alarm_count_10min": 3, "time_since_previous_alarm": 120,
        "heart_rate": 80, "spo2": 95, "systolic_bp": 120, "diastolic_bp": 75,
        "respiratory_rate": 16, "temperature": 37.0, "acknowledgement_time_seconds": 60, 
        "response_time_seconds": 120, "action_taken": "Acknowledged", "escalated_to_staff": "No",
        "device_type": "Patient Monitor", "alarm_type": "High Heart Rate", "alarm_priority": "Medium",
    }
    for k, v in defaults.items():
        if k not in df_input.columns:
            df_input[k] = v

    X, _ = preprocess_for_prediction(df_input, encoder, scaler, feature_list)
    probs = model.predict_proba(X)[0]
    pred = int(np.argmax(probs))
    confidence = get_confidence(float(probs[pred]))
    
    df_eng = engineer_features(df_input)
    evidence = generate_evidence(df_eng.iloc[0], pred)
    harm = get_potential_harm(pred, confidence)

    return {
        "predicted_label": pred, "predicted_class": LABEL_NAMES[pred], "confidence": confidence,
        "uncertainty_pct": round((1 - float(probs[pred])) * 100, 1),
        "prob_nuisance": round(float(probs[0]) * 100, 1), "prob_watch": round(float(probs[1]) * 100, 1),
        "prob_escalation": round(float(probs[2]) * 100, 1), "prob_critical": round(float(probs[3]) * 100, 1),
        "evidence": evidence, "harm": harm,
    }


def render_prediction_block(result, alarm_id):
    pred_lbl = result["predicted_label"]
    css_class = PRED_CSS[pred_lbl]
    conf_color = confidence_color(result["confidence"])

    col_ai_left, col_ai_right = st.columns([1, 1])

    with col_ai_left:
        st.markdown(
            f'<div class="{css_class}">'
            f'<div style="font-size:0.85rem; color:#8aa8cc; text-transform:uppercase;">AI Risk Classification</div>'
            f'<div style="font-size:2.4rem; font-weight:800; color:{LABEL_COLORS_HEX[pred_lbl]}; margin:4px 0;">'
            f'{["✅","👁️","⚠️","🚨"][pred_lbl]} {result["predicted_class"].upper()}</div>'
            f'<div style="font-size:0.95rem;">Confidence: <b style="color:{conf_color};">{result["confidence"]}</b>'
            f'&nbsp;&nbsp;|&nbsp;&nbsp; Uncertainty: <b style="color:#f39c12;">{result["uncertainty_pct"]}%</b></div>'
            f'</div>', unsafe_allow_html=True
        )
        probs_dict = {
            "Nuisance": result["prob_nuisance"], "Watch": result["prob_watch"],
            "Escalation": result["prob_escalation"], "Critical": result["prob_critical"]
        }
        st.plotly_chart(prob_bar_chart(probs_dict), use_container_width=True)

    with col_ai_right:
        st.markdown('<div class="sub-header" style="margin-top:0;">Supporting Evidence</div>', unsafe_allow_html=True)
        st.markdown('<div class="evidence-box">' + "".join(f'<div class="evidence-item">{e}</div>' for e in result["evidence"]) + '</div>', unsafe_allow_html=True)

        st.markdown('<div class="sub-header">Potential Harm (If Model Is Wrong)</div>', unsafe_allow_html=True)
        harm = result["harm"]
        harm_css = "harm-box" if pred_lbl >= 2 else "harm-box-low"
        st.markdown(
            f'<div class="{harm_css}">'
            f'<b style="color:#e0a0a0;">False Positive (Over-alerting):</b> <span style="font-size:0.82rem; color:#c0a0a0;">{harm["false_positive"]}</span><br>'
            f'<b style="color:#e0a0a0;">False Negative (Missed event):</b> <span style="font-size:0.82rem; color:#c0a0a0;">{harm["false_negative"]}</span><br>'
            f'</div>', unsafe_allow_html=True
        )

    st.markdown("---")
    st.markdown('<div class="sub-header">👁️ Human Review</div>', unsafe_allow_html=True)
    
    review_status = st.session_state.review_store.get(alarm_id, {}).get("status", "Pending")
    
    if review_status == "Pending":
        c1, c2, c3, _ = st.columns([1, 1, 1, 3])
        if c1.button("✅ Confirm Prediction", key=f"conf_{alarm_id}"):
            st.session_state.review_store[alarm_id] = {"status": "Confirmed", "prediction": result["predicted_class"], "timestamp": datetime.now().isoformat()}
            st.rerun()
        if c2.button("❌ Reject Prediction", key=f"rej_{alarm_id}"):
            st.session_state.review_store[alarm_id] = {"status": "Rejected", "prediction": result["predicted_class"], "timestamp": datetime.now().isoformat()}
            st.rerun()
        if c3.button("❓ Mark Uncertain", key=f"unc_{alarm_id}"):
            st.session_state.review_store[alarm_id] = {"status": "Uncertain", "prediction": result["predicted_class"], "timestamp": datetime.now().isoformat()}
            st.rerun()
    else:
        status_colors = {"Confirmed": "#2ecc71", "Rejected": "#e74c3c", "Uncertain": "#f39c12"}
        st.success(f"**Human Review:** {review_status} at {st.session_state.review_store[alarm_id]['timestamp'][:19]}")


# ─── Session state init ───────────────────────────────────────────────────────
if "sim_running" not in st.session_state: st.session_state.sim_running = False
if "sim_index" not in st.session_state: st.session_state.sim_index = 0
if "review_store" not in st.session_state: st.session_state.review_store = {}


# ═══════════════════════════════════════════════════════════════════════════════
# SIDEBAR
# ═══════════════════════════════════════════════════════════════════════════════
with st.sidebar:
    st.markdown("""
    <div style='text-align:center; padding: 10px 0 20px 0;'>
      <div style='font-size:2.5rem;'>🏥</div>
      <div style='font-size:1.4rem; font-weight:800; color:#e0eeff;'>SmartAlarm</div>
      <div style='font-size:0.8rem; color:#6a8aaa; margin-top:2px;'>AI Alarm Pattern Analyser</div>
    </div>
    """, unsafe_allow_html=True)

    page = st.radio(
        "Navigation",
        [
            "1. Live Monitor",
            "2. Patient Analysis",
            "3. Human Review",
            "4. Evaluation",
            "5. Demo Scenarios",
            "6. About / Limitations"
        ],
        label_visibility="collapsed",
    )
    st.markdown("---")
    st.markdown('<div style="font-size:0.75rem; color:#4a6a8a; text-align:center;">Academic Prototype<br>Not clinically validated</div>', unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════
# 1. LIVE MONITOR
# ═══════════════════════════════════════════════════════════════════════════════
if page == "1. Live Monitor":
    safety_banner()
    st.markdown('<h1 style="font-size:1.8rem; font-weight:800; color:#e0eeff; margin:0 0 4px 0;">Live Alarm Monitor</h1>', unsafe_allow_html=True)
    st.markdown('<p style="color:#6a8aaa; font-size:0.95rem; margin:0 0 20px 0;">Evaluate incoming equipment alarms against patient context to distinguish nuisance alerts from true clinical escalation.</p>', unsafe_allow_html=True)

    try:
        alarm = load_alarm_stream()
        context = load_patient_context()
        staff = load_staff_response()
        model, encoder, scaler, feature_list = load_model_and_pipeline()

        merged = alarm.merge(context.drop(columns=["timestamp"]), on=["alarm_id", "patient_id"], how="left")
        merged = merged.merge(staff, on=["alarm_id", "patient_id"], how="left")
        merged = merged.sort_values("timestamp").reset_index(drop=True)

        c1, c2, c3, _ = st.columns([1, 1, 1, 4])
        if c1.button("▶ Start Simulation"): st.session_state.sim_running = True; st.rerun()
        if c2.button("⏹ Stop"): st.session_state.sim_running = False; st.rerun()
        if c3.button("🔄 Reset"): st.session_state.sim_running = False; st.session_state.sim_index = 0; st.rerun()

        if st.session_state.sim_running and st.session_state.sim_index < len(merged):
            st.session_state.sim_index += 1
            time.sleep(0.4)
            st.rerun()

        idx = st.session_state.sim_index
        if idx > 0:
            sel_row = merged.iloc[idx - 1]
            
            st.markdown("---")
            st.markdown(f'<h2 style="font-size:1.4rem; color:#e0eeff;">Currently Analyzing: {sel_row["alarm_id"]} (Patient {sel_row["patient_id"]})</h2>', unsafe_allow_html=True)
            
            col_info1, col_info2 = st.columns(2)
            with col_info1:
                st.markdown(f"**Alarm Pattern:** {sel_row['alarm_type']} ({sel_row.get('device_type','Unknown')})")
                st.markdown(f"**Frequency:** {sel_row.get('alarm_count_10min', 1)} alarms in last 10 mins")
                st.markdown(f"**Time since last:** {sel_row.get('time_since_previous_alarm', 0)}s")
            with col_info2:
                st.markdown(f"**Heart Rate:** {sel_row.get('heart_rate', '?')} bpm")
                st.markdown(f"**SpO2:** {sel_row.get('spo2', '?')}%")
                st.markdown(f"**Resp Rate:** {sel_row.get('respiratory_rate', '?')}/min")

            input_data = {
                "alarm_id": sel_row["alarm_id"], "patient_id": sel_row["patient_id"],
                "timestamp": sel_row["timestamp"], "device_type": sel_row.get("device_type", "Unknown"),
                "alarm_type": sel_row.get("alarm_type", "Unknown"), "alarm_priority": sel_row.get("alarm_priority", "Medium"),
                "alarm_duration_seconds": float(sel_row.get("alarm_duration_seconds", 60)),
                "alarm_count_10min": float(sel_row.get("alarm_count_10min", 1)),
                "time_since_previous_alarm": float(sel_row.get("time_since_previous_alarm", 120)),
                "age_group": sel_row.get("age_group", "Unknown"), "ward": sel_row.get("ward", "Unknown"),
                "high_risk_medicine": sel_row.get("high_risk_medicine", "Unknown"),
                "heart_rate": float(sel_row.get("heart_rate", 80)), "spo2": float(sel_row.get("spo2", 95)),
                "systolic_bp": float(sel_row.get("systolic_bp", 120)), "diastolic_bp": float(sel_row.get("diastolic_bp", 75)),
                "respiratory_rate": float(sel_row.get("respiratory_rate", 16)), "temperature": float(sel_row.get("temperature", 37.0)),
                "consciousness_status": sel_row.get("consciousness_status", "Alert"),
                "acknowledgement_time_seconds": float(sel_row.get("acknowledgement_time_seconds", 60)),
                "response_time_seconds": float(sel_row.get("response_time_seconds", 120)),
                "action_taken": sel_row.get("action_taken", "Acknowledged"),
                "escalated_to_staff": sel_row.get("escalated_to_staff", "No")
            }

            result = run_model_prediction(input_data, model, encoder, scaler, feature_list)
            render_prediction_block(result, sel_row["alarm_id"])

        else:
            st.info("Start simulation to view live incoming alarms.")

    except Exception as e:
        st.error(f"Error loading monitor: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# 2. PATIENT ANALYSIS
# ═══════════════════════════════════════════════════════════════════════════════
elif page == "2. Patient Analysis":
    safety_banner()
    st.markdown('<h1 style="font-size:1.8rem; font-weight:800; color:#e0eeff;">Patient Analysis</h1>', unsafe_allow_html=True)

    try:
        alarm = load_alarm_stream()
        context = load_patient_context()
        staff = load_staff_response()
        model, encoder, scaler, feature_list = load_model_and_pipeline()

        sel_patient = st.selectbox("Select Patient", sorted(alarm["patient_id"].unique()))

        p_alarms = alarm[alarm["patient_id"] == sel_patient].sort_values("timestamp")
        p_context = context[context["patient_id"] == sel_patient].sort_values("timestamp")

        if len(p_context) > 0:
            latest_ctx = p_context.iloc[-1]
            c1, c2, c3, c4 = st.columns(4)
            c1.metric("Patient ID", sel_patient)
            c2.metric("Age Group", latest_ctx.get("age_group", "N/A"))
            c3.metric("Ward", latest_ctx.get("ward", "N/A"))
            c4.metric("High-Risk Medicine", latest_ctx.get("high_risk_medicine", "N/A"))

            st.markdown('<div class="sub-header">Vital Signs Trend</div>', unsafe_allow_html=True)
            if len(p_context) > 1:
                fig = make_subplots(rows=1, cols=3, subplot_titles=["Heart Rate", "SpO2", "Respiratory Rate"])
                fig.add_trace(go.Scatter(x=p_context["timestamp"], y=p_context["heart_rate"], name="HR", line=dict(color="#e74c3c")), row=1, col=1)
                fig.add_hline(y=100, line_dash="dash", line_color="rgba(231,76,60,0.5)", row=1, col=1)
                fig.add_trace(go.Scatter(x=p_context["timestamp"], y=p_context["spo2"], name="SpO2", line=dict(color="#3498db")), row=1, col=2)
                fig.add_hline(y=92, line_dash="dash", line_color="rgba(231,76,60,0.5)", row=1, col=2)
                fig.add_trace(go.Scatter(x=p_context["timestamp"], y=p_context["respiratory_rate"], name="RR", line=dict(color="#9b59b6")), row=1, col=3)
                fig.add_hline(y=25, line_dash="dash", line_color="rgba(231,76,60,0.5)", row=1, col=3)
                fig.update_layout(height=250, showlegend=False, paper_bgcolor="rgba(0,0,0,0)", plot_bgcolor="rgba(0,0,0,0)", font=dict(color="#a0c0e0"))
                st.plotly_chart(fig, use_container_width=True)

            st.markdown('<div class="sub-header">Alarm History</div>', unsafe_allow_html=True)
            st.dataframe(p_alarms[["timestamp", "device_type", "alarm_type", "alarm_priority", "alarm_duration_seconds", "alarm_count_10min"]].tail(10), use_container_width=True)

    except Exception as e:
        st.error(f"Error: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# 3. HUMAN REVIEW
# ═══════════════════════════════════════════════════════════════════════════════
elif page == "3. Human Review":
    safety_banner()
    st.markdown('<h1 style="font-size:1.8rem; font-weight:800; color:#e0eeff;">Human Review Queue</h1>', unsafe_allow_html=True)
    st.info("Predictions awaiting human review. **MODEL PREDICTIONS ≠ CONFIRMED EVENTS.** All predictions require clinical review.")
    
    if not st.session_state.review_store:
        st.success("No alarms currently in review queue.")
    else:
        history_data = [
            {"Alarm ID": k, "AI Prediction": v["prediction"], "Human Status": v["status"], "Timestamp": v["timestamp"][:19]}
            for k, v in st.session_state.review_store.items()
        ]
        st.dataframe(pd.DataFrame(history_data), use_container_width=True)


# ═══════════════════════════════════════════════════════════════════════════════
# 4. EVALUATION
# ═══════════════════════════════════════════════════════════════════════════════
elif page == "4. Evaluation":
    safety_banner()
    st.markdown('<h1 style="font-size:1.8rem; font-weight:800; color:#e0eeff;">Model Evaluation</h1>', unsafe_allow_html=True)
    st.markdown("### Did the system recognise more dangerous patterns while reducing unnecessary high-priority nuisance alarms?")

    try:
        metrics = load_metrics()
        bm = metrics["baseline"]
        best_key = "random_forest" if "Random Forest" in metrics["best_model"] else "logistic_regression"
        best_m = metrics[best_key]

        c1, c2, c3 = st.columns(3)
        c1.metric("Dangerous Pattern Recall", f"{best_m['dangerous_pattern_recall']*100:.1f}%", f"+{(best_m['dangerous_pattern_recall']-bm['dangerous_pattern_recall'])*100:.1f}% vs baseline")
        c2.metric("Nuisance HP Rate (False Alerts)", f"{best_m['nuisance_high_priority_rate']*100:.1f}%", f"{(best_m['nuisance_high_priority_rate']-bm['nuisance_high_priority_rate'])*100:.1f}% vs baseline", delta_color="inverse")
        c3.metric("F1-Score", f"{best_m['f1']:.4f}")

        st.markdown("---")
        st.markdown("### Key Metrics Comparison")
        comp_df = pd.DataFrame([
            {"Metric": "Accuracy", "Baseline": bm["accuracy"], "Best ML Model": best_m["accuracy"]},
            {"Metric": "Precision (macro)", "Baseline": bm["precision"], "Best ML Model": best_m["precision"]},
            {"Metric": "Recall (macro)", "Baseline": bm["recall"], "Best ML Model": best_m["recall"]},
            {"Metric": "False Positives", "Baseline": bm["n_false_positives"], "Best ML Model": best_m["n_false_positives"]},
            {"Metric": "False Negatives", "Baseline": bm["n_false_negatives"], "Best ML Model": best_m["n_false_negatives"]},
        ])
        st.dataframe(comp_df, use_container_width=True)

    except Exception as e:
        st.error(f"Error loading evaluation metrics: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# 5. DEMO SCENARIOS
# ═══════════════════════════════════════════════════════════════════════════════
elif page == "5. Demo Scenarios":
    safety_banner()
    st.markdown('<h1 style="font-size:1.8rem; font-weight:800; color:#e0eeff;">Demo Scenarios</h1>', unsafe_allow_html=True)
    
    try:
        model, encoder, scaler, feature_list = load_model_and_pipeline()

        st.markdown("### 🟢 SCENARIO 1 — LOW URGENCY / NUISANCE")
        st.markdown("Repeated equipment alarms + Stable patient context + Normal staff response.")
        if st.button("Run Scenario 1"):
            inp1 = {
                "alarm_id": "DEMO_1", "patient_id": "P_DEMO_A", "timestamp": pd.Timestamp.now(),
                "device_type": "Infusion Pump", "alarm_type": "Low Battery", "alarm_priority": "Low",
                "alarm_count_10min": 4, "time_since_previous_alarm": 60, "alarm_duration_seconds": 30,
                "heart_rate": 72, "spo2": 98, "respiratory_rate": 14, "systolic_bp": 120, "diastolic_bp": 80, "temperature": 36.6,
                "response_time_seconds": 30, "acknowledgement_time_seconds": 15,
                "age_group": "41-60", "ward": "General", "high_risk_medicine": "None", "consciousness_status": "Alert"
            }
            res1 = run_model_prediction(inp1, model, encoder, scaler, feature_list)
            render_prediction_block(res1, "DEMO_1")

        st.markdown("---")
        st.markdown("### 🔴 SCENARIO 2 — HIGH URGENCY / ESCALATION")
        st.markdown("Increasing alarms + Worsening patient context (Rising HR/RR, falling SpO2).")
        if st.button("Run Scenario 2"):
            inp2 = {
                "alarm_id": "DEMO_2", "patient_id": "P_DEMO_B", "timestamp": pd.Timestamp.now(),
                "device_type": "Patient Monitor", "alarm_type": "Low SpO2", "alarm_priority": "High",
                "alarm_count_10min": 7, "time_since_previous_alarm": 40, "alarm_duration_seconds": 120,
                "heart_rate": 115, "spo2": 89, "respiratory_rate": 28, "systolic_bp": 95, "diastolic_bp": 60, "temperature": 38.2,
                "response_time_seconds": 300, "acknowledgement_time_seconds": 150,
                "age_group": "61-75", "ward": "ICU", "high_risk_medicine": "Heparin", "consciousness_status": "Confused"
            }
            res2 = run_model_prediction(inp2, model, encoder, scaler, feature_list)
            render_prediction_block(res2, "DEMO_2")

    except Exception as e:
        st.error(f"Error loading scenarios: {e}")


# ═══════════════════════════════════════════════════════════════════════════════
# 6. ABOUT / LIMITATIONS
# ═══════════════════════════════════════════════════════════════════════════════
elif page == "6. About / Limitations":
    safety_banner()
    st.markdown('<h1 style="font-size:1.8rem; font-weight:800; color:#e0eeff;">About SmartAlarm</h1>', unsafe_allow_html=True)
    st.markdown("""
    **SmartAlarm** is an academic research prototype designed to distinguish nuisance alarm patterns from clinically important escalations in a busy inpatient setting.
    
    ### How it works
    It combines equipment alarm metadata with patient context (vital signs, age, ward), previous alarm patterns, and staff response times to generate a classification (Nuisance, Watch, Escalation, Critical).

    ### ⚠️ Limitations & Safety Warnings
    - **Synthetic Data Only:** The model was trained entirely on synthetic, generated data.
    - **Not Clinically Validated:** This model has not been tested in a real clinical environment.
    - **Not a Medical Device:** The system cannot diagnose conditions or prescribe treatments.
    - **Human Review Required:** A qualified clinician must always review the alarm and context before making a decision. The AI provides *decision support*, not *decision making*.
    """)
