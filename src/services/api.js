/**
 * Centralized Clinical Alarm System API Client
 * Manages HTTP communication with the Node/Express backend on /api
 */

const API_BASE = '/api';

class ApiService {
  getToken() {
    return localStorage.getItem('clinical_alarm_token');
  }

  setToken(token) {
    if (token) {
      localStorage.setItem('clinical_alarm_token', token);
    } else {
      localStorage.removeItem('clinical_alarm_token');
    }
  }

  clearToken() {
    localStorage.removeItem('clinical_alarm_token');
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = data.message || `HTTP ${response.status}: ${response.statusText}`;
        const error = new Error(errorMsg);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      console.error(`[API Error] ${options.method || 'GET'} ${endpoint}:`, err.message);
      throw err;
    }
  }

  /* ── Authentication ────────────────────────────────────── */
  async login(email, password) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  async register(name, email, password, role) {
    const res = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role }),
    });
    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  async getMe() {
    return this.request('/auth/me');
  }

  /* ── Alarms ────────────────────────────────────────────── */
  async getAlarms(params = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/alarms?${query}` : '/alarms';
    return this.request(endpoint);
  }

  async getAlarmById(id) {
    return this.request(`/alarms/${id}`);
  }

  async createAlarm(data) {
    return this.request('/alarms', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async acknowledgeAlarm(id, notes = '') {
    return this.request(`/alarms/${id}/acknowledge`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  async resolveAlarm(id, notes = '') {
    return this.request(`/alarms/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  async batchCreateAlarms(alarms) {
    return this.request('/alarms/batch', {
      method: 'POST',
      body: JSON.stringify({ alarms }),
    });
  }

  async resetAlarms() {
    return this.request('/alarms/reset', {
      method: 'POST',
    });
  }

  /* ── Patients ──────────────────────────────────────────── */
  async getPatients() {
    return this.request('/patients');
  }

  async getPatientById(id) {
    return this.request(`/patients/${id}`);
  }

  async createPatient(data) {
    return this.request('/patients', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /* ── Wards ─────────────────────────────────────────────── */
  async getWards() {
    return this.request('/wards');
  }

  async createWard(data) {
    return this.request('/wards', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /* ── Drugs ─────────────────────────────────────────────── */
  async getDrugs() {
    return this.request('/drugs');
  }

  async createDrug(data) {
    return this.request('/drugs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /* ── Pattern Analyser ──────────────────────────────────── */
  async getPatterns() {
    return this.request('/patterns');
  }

  async analysePatterns() {
    return this.request('/patterns/analyse', {
      method: 'POST',
    });
  }

  /* ── Analytics ─────────────────────────────────────────── */
  async getAnalytics() {
    return this.request('/analytics');
  }

  /* ── Reports ───────────────────────────────────────────── */
  async getReports() {
    return this.request('/reports');
  }

  async getReportById(id) {
    return this.request(`/reports/${id}`);
  }

  async saveReport(data) {
    return this.request('/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /* ── Validation & Benchmarking ─────────────────────────── */
  async runValidation() {
    return this.request('/validation/run', {
      method: 'POST',
    });
  }

  async getFeedback() {
    return this.request('/validation/feedback');
  }

  async submitFeedback(data) {
    return this.request('/validation/feedback', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /* ── System Health ─────────────────────────────────────── */
  async checkHealth() {
    return this.request('/health');
  }
}

export const api = new ApiService();
export default api;
