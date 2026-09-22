# SmartAlarm – AI-Based Alarm Pattern Analyser

SmartAlarm is an AI-based decision-support prototype designed to reduce alarm fatigue in busy inpatient wards by distinguishing between device nuisance alarms and clinically important escalation patterns. 

**IMPORTANT: This is an academic/research prototype using synthetic data. It is NOT a medical device, is NOT clinically validated, does NOT diagnose patients, and MUST NOT be used to prescribe treatment. All predictions require human review.**

## Features
*   **Synthetic Data Generation**: Generates 6,000+ realistic (but synthetic) alarm and patient context records.
*   **Machine Learning**: Uses Random Forest and Logistic Regression to analyse combinations of alarm frequency, vital sign trends, and staff response times.
*   **Safety-First Evaluation**: Focuses on **Dangerous Pattern Recall** and **Nuisance High-Priority Rate** rather than raw accuracy.
*   **Explainable AI**: Every prediction includes class probabilities, confidence levels, and human-readable evidence.
*   **Human-in-the-Loop**: A dedicated UI for clinicians to confirm, reject, or flag predictions.
*   **Streamlit Dashboard**: A professional 10-page UI including real-time simulation, patient context, error analysis, and failure cases.

## Project Structure
```
SmartAlarm/
├── app/app.py                    # Streamlit web application
├── data_generation/              # Synthetic data generator
├── preprocessing/                # Feature engineering & scaling pipeline
├── baseline/                     # Rule-based reference classifier
├── model/                        # ML training and prediction scripts
├── analysis/                     # Error analysis and failure cases
├── dataset/                      # Generated CSV data
├── documentation/                # Tech docs & workflow maps
└── requirements.txt              # Dependencies
```

## Setup & Running

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Generate data:**
   ```bash
   python data_generation/generate_data.py
   ```

3. **Train models:**
   ```bash
   python model/train.py
   ```

4. **Run the Application:**
   ```bash
   streamlit run app/app.py
   ```

## Key Metrics
The final Random Forest model achieved:
*   **Dangerous Pattern Recall**: > 99% (Minimises false negatives)
*   **Nuisance HP Rate**: < 1% (Minimises false positives)
*   **Accuracy**: > 99%

*(Metrics are evaluated against synthetic data).*

## Documentation
*   [Field Workflow Map](documentation/workflow.md)
*   [Technical Documentation](documentation/technical_documentation.md)
*   [Failure Mode Analysis](documentation/failure_mode_analysis.md)
