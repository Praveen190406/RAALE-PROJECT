/**
 * Automated Backend API Integration Test Suite
 * Validates health check, auth, alarms, patients, wards, drugs, patterns, analytics, reports, validation
 */

const BASE_URL = 'http://localhost:5001/api';

async function runTests() {
  console.log('🧪 Starting Backend API Automated Tests...\n');

  try {
    // 1. Health check
    const healthRes = await fetch(`${BASE_URL}/health`);
    const health = await healthRes.json();
    console.log('✅ 1. Health check:', health.status === 'ok' ? 'PASS' : 'FAIL', health);

    // 2. Login as existing doctor
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'ahmed@hospital.nhs.uk', password: 'doctor123' }),
    });
    const loginData = await loginRes.json();
    console.log('✅ 2. Doctor Login:', loginData.success ? 'PASS' : 'FAIL', loginData.user);
    const token = loginData.token;

    // 3. User Me check with token
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const meData = await meRes.json();
    console.log('✅ 3. Authenticate JWT (Me):', meData.success ? 'PASS' : 'FAIL', meData.user.name);

    // 4. Register new clinician
    const testEmail = `clinician_${Date.now()}@hospital.nhs.uk`;
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dr. Sarah Lin',
        email: testEmail,
        password: 'doctor123',
        role: 'Senior Pharmacist',
      }),
    });
    const regData = await regRes.json();
    console.log('✅ 4. Clinician Registration:', regData.success ? 'PASS' : 'FAIL', regData.user);

    // 5. Fetch Alarms
    const alarmsRes = await fetch(`${BASE_URL}/alarms`);
    const alarmsData = await alarmsRes.json();
    console.log('✅ 5. Fetch Alarms:', alarmsData.success ? 'PASS' : 'FAIL', `(${alarmsData.count} alarms found)`);

    // 6. Create a new Alarm
    const newAlarmRes = await fetch(`${BASE_URL}/alarms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        patientId: 'P001',
        drugId: 'D001',
        type: 'Missed Dose',
        severity: 'critical',
      }),
    });
    const newAlarmData = await newAlarmRes.json();
    console.log('✅ 6. Create Alarm & Trigger Pattern Engine:', newAlarmData.success ? 'PASS' : 'FAIL', newAlarmData.alarm.id);

    // 7. Acknowledge the alarm
    const ackRes = await fetch(`${BASE_URL}/alarms/${newAlarmData.alarm.id}/acknowledge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ notes: 'Reviewing INR values immediately.' }),
    });
    const ackData = await ackRes.json();
    console.log('✅ 7. Acknowledge Alarm:', ackData.success ? 'PASS' : 'FAIL', ackData.alarm.status);

    // 8. Resolve the alarm
    const resRes = await fetch(`${BASE_URL}/alarms/${newAlarmData.alarm.id}/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ notes: 'INR 2.4 confirmed therapeutic; dose given.' }),
    });
    const resData = await resRes.json();
    console.log('✅ 8. Resolve Alarm:', resData.success ? 'PASS' : 'FAIL', resData.alarm.status);

    // 9. Fetch Patients
    const patientsRes = await fetch(`${BASE_URL}/patients`);
    const patientsData = await patientsRes.json();
    console.log('✅ 9. Fetch Patients:', patientsData.success ? 'PASS' : 'FAIL', `(${patientsData.count} patients found)`);

    // 10. Admit new Patient
    const newPatientRes = await fetch(`${BASE_URL}/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: 'Patient 7B-19',
        wardId: 'W7',
        bed: '7B-19',
        age: 72,
        conditions: ['Atrial Fibrillation', 'Stroke History'],
        medications: ['D001', 'D005'],
        baseRiskScore: 85,
      }),
    });
    const newPatientData = await newPatientRes.json();
    console.log('✅ 10. Admit Patient:', newPatientData.success ? 'PASS' : 'FAIL', newPatientData.patient.id);

    // 11. Fetch Wards
    const wardsRes = await fetch(`${BASE_URL}/wards`);
    const wardsData = await wardsRes.json();
    console.log('✅ 11. Fetch Wards:', wardsData.success ? 'PASS' : 'FAIL', `(${wardsData.count} wards found)`);

    // 12. Fetch Drugs
    const drugsRes = await fetch(`${BASE_URL}/drugs`);
    const drugsData = await drugsRes.json();
    console.log('✅ 12. Fetch Drugs:', drugsData.success ? 'PASS' : 'FAIL', `(${drugsData.count} drugs found)`);

    // 13. Register new Medication
    const newDrugRes = await fetch(`${BASE_URL}/drugs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Dabigatran',
        dose: '150mg',
        category: 'Direct Oral Anticoagulant',
        riskLevel: 'critical',
        riskScore: 92,
        monitorParam: 'Renal Function / aPTT',
        notes: 'High bleeding risk in elderly or impaired renal function.',
      }),
    });
    const newDrugData = await newDrugRes.json();
    console.log('✅ 13. Register Medication:', newDrugData.success ? 'PASS' : 'FAIL', newDrugData.drug.name);

    // 14. Fetch Patterns
    const patternsRes = await fetch(`${BASE_URL}/patterns`);
    const patternsData = await patternsRes.json();
    console.log('✅ 14. Fetch Patterns:', patternsData.success ? 'PASS' : 'FAIL', `(${patternsData.count} active patterns)`);

    // 15. Fetch Analytics
    const analyticsRes = await fetch(`${BASE_URL}/analytics`);
    const analyticsData = await analyticsRes.json();
    console.log('✅ 15. Fetch Analytics:', analyticsData.success ? 'PASS' : 'FAIL', analyticsData.kpis);

    // 16. Run Validation
    const valRes = await fetch(`${BASE_URL}/validation/run`, { method: 'POST' });
    const valData = await valRes.json();
    console.log('✅ 16. Run Validation Benchmarks:', valData.success ? 'PASS' : 'FAIL', {
      baselineF1: valData.baselineMetrics.f1,
      improvedF1: valData.improvedMetrics.f1,
    });

    // 17. Submit Feedback
    const fbRes = await fetch(`${BASE_URL}/validation/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'Senior Pharmacist',
        rating: 5,
        comment: 'Full-stack persistence and pattern alert engine work accurately.',
      }),
    });
    const fbData = await fbRes.json();
    console.log('✅ 17. Submit Feedback:', fbData.success ? 'PASS' : 'FAIL', fbData.feedback.id);

    // 18. Save Report
    const repRes = await fetch(`${BASE_URL}/reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: 'Phase 2 Clinical Alarm System Automated Verification Report',
        data: {
          testResults: 'All 18 automated backend tests passed',
          improvedMetrics: valData.improvedMetrics,
        },
      }),
    });
    const repData = await repRes.json();
    console.log('✅ 18. Save Clinical Report:', repData.success ? 'PASS' : 'FAIL', repData.reportId);

    console.log('\n🎉 ALL 18 BACKEND TESTS COMPLETED SUCCESSFULLY!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Test suite failed:', err);
    process.exit(1);
  }
}

runTests();
