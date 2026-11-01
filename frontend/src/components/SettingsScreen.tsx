import React, { useState } from 'react';
import { api, clearStoredToken } from '../api';
import { Shield, Bell, LogOut, Check, Info } from 'lucide-react';

interface SettingsScreenProps {
  user: any;
  onUserUpdated: (u: any) => void;
  onSignOut: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  user,
  onUserUpdated,
  onSignOut,
}) => {
  const [gender, setGender] = useState<string>(user?.gender || 'unspecified');
  const [savingGender, setSavingGender] = useState(false);
  const [genderSavedNotice, setGenderSavedNotice] = useState(false);
  const [notifStatus, setNotifStatus] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );

  const handleGenderChange = async (g: 'female' | 'male' | 'other' | 'unspecified') => {
    setGender(g);
    setSavingGender(true);
    try {
      await api.updateGender(g);
      const updated = await api.getMe();
      onUserUpdated(updated);
      setGenderSavedNotice(true);
      setTimeout(() => setGenderSavedNotice(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingGender(false);
    }
  };

  const handleRequestPush = async () => {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      const perm = await Notification.requestPermission();
      setNotifStatus(perm);
      if (perm === 'granted') {
        try {
          const reg = await navigator.serviceWorker.ready;
          const { publicKey } = await api.getVapidPublicKey();
          if (publicKey) {
            const sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: publicKey,
            });
            const subJson = sub.toJSON();
            if (subJson.endpoint && subJson.keys) {
              await api.savePushSubscription({
                endpoint: subJson.endpoint,
                p256dh: subJson.keys.p256dh,
                auth: subJson.keys.auth,
              });
              alert('Push notifications enabled successfully!');
            }
          }
        } catch (e) {
          console.error('Push registration error:', e);
        }
      }
    }
  };

  return (
    <div style={{ padding: '20px', paddingBottom: '90px' }}>
      <h2 style={{ fontSize: '1.4rem', color: '#FFF', marginBottom: '4px' }}>Settings</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '24px' }}>
        Profile & Safety Controls
      </p>

      {/* User Card */}
      <div className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.2rem', color: '#FFF' }}>
          {user?.first_name?.[0] || 'R'}
        </div>
        <div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FFF' }}>{user?.first_name}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Rider ID: {user?.id?.slice(0, 8)}...</div>
        </div>
      </div>

      {/* Gender Selection & Night Safety */}
      <div className="glass-card" style={{ padding: '18px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <Shield size={18} color="#EC4899" />
          <h3 style={{ fontSize: '0.95rem', color: '#FFF' }}>Gender (Night Women-Only Matching)</h3>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: '1.35' }}>
          Self-declared and optional. Night window is <strong>8:00 PM to 6:00 AM IST</strong>. Women riders' trips are women-only by default at night.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '8px' }}>
          {(['female', 'male', 'other', 'unspecified'] as const).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => handleGenderChange(g)}
              disabled={savingGender}
              className={`quick-chip ${gender === g ? 'selected' : ''}`}
              style={{ textAlign: 'center', textTransform: 'capitalize' }}
            >
              {g}
            </button>
          ))}
        </div>
        {genderSavedNotice && (
          <div style={{ fontSize: '0.75rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
            <Check size={14} /> Preference saved
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="glass-card" style={{ padding: '18px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Bell size={18} color="#FF6B00" />
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#FFF' }}>Web Push Notifications</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                Status: <strong style={{ color: notifStatus === 'granted' ? '#10B981' : '#F59E0B' }}>{notifStatus}</strong>
              </div>
            </div>
          </div>
          {notifStatus !== 'granted' && (
            <button onClick={handleRequestPush} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
              Enable
            </button>
          )}
        </div>
      </div>

      {/* Privacy Notice */}
      <div style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px', border: '1px solid var(--border-subtle)', marginBottom: '24px', display: 'flex', gap: '10px' }}>
        <Info size={18} color="var(--text-dim)" style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: '1.4' }}>
          Chalo never shares your exact GPS coordinates with other users. All board distances are bucketed to 50 meters. First names only; phone numbers are never shared or stored.
        </div>
      </div>

      {/* Sign Out */}
      <button
        onClick={() => {
          clearStoredToken();
          onSignOut();
        }}
        className="btn-secondary"
        style={{ width: '100%', borderColor: 'rgba(239, 68, 68, 0.3)', color: '#F87171' }}
      >
        <LogOut size={16} /> Sign Out
      </button>
    </div>
  );
};
