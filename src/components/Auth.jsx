import { useState } from 'react';
import './Auth.css';

export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin();
  };

  return (
    <div className="auth-container">
      <div className="auth-left">
        <div className="auth-content-left">
          <div className="auth-brand">
            <div className="brand-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <span className="brand-text">WardAlarm Sentinel</span>
          </div>
          <h1 className="auth-hero-title">Intelligent Monitoring<br />for Critical Care</h1>
          <p className="auth-hero-subtitle">
            Experience real-time analytics, predictive alerts, and seamless patient journeys all in one powerful platform.
          </p>
          <div className="auth-features">
            <div className="feature">
              <span className="feature-icon">✨</span>
              <span>AI-Powered Insights</span>
            </div>
            <div className="feature">
              <span className="feature-icon">🔔</span>
              <span>Smart Alarm Filtering</span>
            </div>
            <div className="feature">
              <span className="feature-icon">📊</span>
              <span>Advanced Analytics</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-header">
            <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
            <p>{isLogin ? 'Sign in to access your dashboard' : 'Join the network today'}</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {!isLogin && (
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" placeholder="Dr. John Doe" required />
              </div>
            )}
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" placeholder="name@hospital.org" required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" placeholder="••••••••" required />
            </div>
            <button type="submit" className="auth-button">
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="auth-footer">
            <button className="auth-toggle" onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
