import React, { useState } from 'react';
import { api } from '../api';
import { ArrowRight, UserCheck } from 'lucide-react';

interface SignInProps {
  onSuccess: (user: any) => void;
}

export const SignIn: React.FC<SignInProps> = ({ onSuccess }) => {
  const [googleTokenInput, setGoogleTokenInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMockLogin = async (sub: string, name: string, gender: string) => {
    setLoading(true);
    setError(null);
    try {
      await api.authGoogle(`mock:${sub}:${name}:${gender}`);
      const me = await api.getMe();
      onSuccess(me);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleTokenInput.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await api.authGoogle(googleTokenInput.trim());
      const me = await api.getMe();
      onSuccess(me);
    } catch (err: any) {
      setError(err.message || 'Invalid token');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'space-between', backgroundColor: '#FFFFFF' }}>
      <div>
        <div style={{ textAlign: 'left', marginTop: '16px', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 900, marginBottom: '6px' }}>
            <span style={{ color: 'var(--primary)' }}>चलो</span> Chalo
          </h1>
          <p style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            I'm leaving now. Who else is going where I'm going?
          </p>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginTop: '8px', lineHeight: '1.4' }}>
            Find 2–3 people nearby heading to the same station, airport, or mall. Share an auto and split the fare.
          </p>
        </div>

        {error && (
          <div style={{ background: 'var(--danger-bg)', color: 'var(--danger)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: '20px', fontSize: '15px', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {/* Quick Demo Profiles (Pilot Testing) */}
        <div style={{ background: 'var(--bg-subtle)', padding: '18px', borderRadius: 'var(--radius-lg)', border: '1.5px solid var(--border)', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontWeight: 700, fontSize: '15px', color: 'var(--text-main)' }}>
            <UserCheck size={18} color="var(--primary)" />
            Select a profile to start:
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              onClick={() => handleMockLogin('anita-vadodara', 'Anita', 'female')}
              disabled={loading}
              className="btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '12px' }}
            >
              👩 Anita <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>(F)</span>
            </button>
            <button
              type="button"
              onClick={() => handleMockLogin('rahul-vadodara', 'Rahul', 'male')}
              disabled={loading}
              className="btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '12px' }}
            >
              👨 Rahul <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>(M)</span>
            </button>
            <button
              type="button"
              onClick={() => handleMockLogin('priya-vadodara', 'Priya', 'female')}
              disabled={loading}
              className="btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '12px' }}
            >
              👩 Priya <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>(F)</span>
            </button>
            <button
              type="button"
              onClick={() => handleMockLogin('dev-vadodara', 'Dev', 'male')}
              disabled={loading}
              className="btn-secondary"
              style={{ justifyContent: 'flex-start', padding: '12px' }}
            >
              👨 Dev <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>(M)</span>
            </button>
          </div>
        </div>

        {/* Google Sign In option */}
        <form onSubmit={handleGoogleTokenSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="text"
            placeholder="Or enter Google ID token"
            value={googleTokenInput}
            onChange={(e) => setGoogleTokenInput(e.target.value)}
            style={{
              padding: '14px 16px',
              fontSize: '15px',
              border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              background: '#FFFFFF',
              color: 'var(--text-main)',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={loading || !googleTokenInput.trim()}
            className="btn-primary"
          >
            <span>{loading ? 'Signing in...' : 'Sign in with Google'}</span>
            <ArrowRight size={18} />
          </button>
        </form>
      </div>

      <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', marginTop: '24px' }}>
        Vadodara Pilot: Station • Airport • Waghodia & Ajwa Societies
      </div>
    </div>
  );
};
