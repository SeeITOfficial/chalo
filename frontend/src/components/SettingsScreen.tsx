import React, { useState } from 'react';
import { api, clearStoredToken } from '../api';
import { User, Bell, LogOut, Check } from 'lucide-react';

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
              alert('Notifications enabled!');
            }
          }
        } catch (e) {
          console.error('Push error:', e);
        }
      }
    }
  };

  return (
    <div style={{ padding: '24px 20px 90px' }}>
      <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '6px' }}>
        Profile
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '24px' }}>
        Your account settings.
      </p>

      {/* User Info Card */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          padding: '18px',
          backgroundColor: 'var(--bg-card)',
          border: '1.5px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '22px',
            fontWeight: 800,
          }}
        >
          {user?.first_name?.[0] || 'R'}
        </div>
        <div>
          <div style={{ fontSize: '19px', fontWeight: 700, color: 'var(--text-main)' }}>
            {user?.first_name || 'Rider'}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
            ID: {user?.id?.slice(0, 8)}...
          </div>
        </div>
      </div>

      {/* Gender */}
      <div
        style={{
          padding: '20px',
          backgroundColor: 'var(--bg-card)',
          border: '1.5px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <User size={20} color="var(--primary)" />
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Gender</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '10px' }}>
          {[
            { id: 'female', label: 'Female' },
            { id: 'male', label: 'Male' },
            { id: 'other', label: 'Other' },
            { id: 'unspecified', label: 'Prefer not to say' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={savingGender}
              onClick={() => handleGenderChange(item.id as any)}
              style={{
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                border: gender === item.id ? '2px solid var(--primary)' : '1.5px solid var(--border)',
                backgroundColor: gender === item.id ? 'var(--primary-light)' : 'var(--bg-page)',
                color: gender === item.id ? 'var(--primary)' : 'var(--text-main)',
                fontWeight: 700,
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              {gender === item.id && <Check size={16} />}
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {genderSavedNotice && (
          <div style={{ fontSize: '13px', color: 'var(--accent-green)', fontWeight: 700 }}>
            Preference saved!
          </div>
        )}
      </div>

      {/* Notifications */}
      <div
        style={{
          padding: '20px',
          backgroundColor: 'var(--bg-card)',
          border: '1.5px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <Bell size={20} color="var(--primary)" />
          <h2 style={{ fontSize: '18px', fontWeight: 700 }}>Ride Alerts</h2>
        </div>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '16px' }}>
          Get notified when someone near you posts a ride to one of your saved places.
        </p>

        {notifStatus === 'granted' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-green)', fontWeight: 700, fontSize: '15px' }}>
            <Check size={18} />
            <span>Alert notifications are enabled</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleRequestPush}
            className="btn-secondary"
            style={{ width: '100%' }}
          >
            <Bell size={18} />
            <span>Enable Notifications</span>
          </button>
        )}
      </div>

      {/* Sign Out */}
      <button
        type="button"
        onClick={() => {
          clearStoredToken();
          onSignOut();
        }}
        className="btn-danger"
        style={{ width: '100%', minHeight: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
      >
        <LogOut size={18} />
        <span>Sign Out</span>
      </button>
    </div>
  );
};
