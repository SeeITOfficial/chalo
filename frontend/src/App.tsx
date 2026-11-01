import React, { useState, useEffect } from 'react';
import { api, getStoredToken, getStoredUser, clearStoredToken } from './api';
import { SignIn } from './components/SignIn';
import { OnboardingModal } from './components/OnboardingModal';
import { BoardScreen } from './components/BoardScreen';
import { PostSheet } from './components/PostSheet';
import { TripScreen } from './components/TripScreen';
import { SavedPlacesScreen } from './components/SavedPlacesScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { Compass, Bookmark, Settings, Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  const [user, setUser] = useState<any>(getStoredUser());
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [onboarded, setOnboarded] = useState<boolean>(Boolean(localStorage.getItem('chalo_onboarded')));

  // Coordinates: default to Parul University Gate pilot cluster
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: 22.2887,
    lng: 73.3634,
  });

  const [activeTab, setActiveTab] = useState<'board' | 'saved' | 'settings'>('board');
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [showPostSheet, setShowPostSheet] = useState<boolean>(false);
  const [savedPlaces, setSavedPlaces] = useState<any[]>([]);

  // Register PWA service worker on boot
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW registration failed:', err);
      });
    }
  }, []);

  // Track user geolocation
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        () => {
          // Fallback to Vadodara pilot coords
          setCoords({ lat: 22.2887, lng: 73.3634 });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  // Fetch saved places when logged in
  const loadSavedPlaces = async () => {
    if (!token) return;
    try {
      const data = await api.getSavedPlaces();
      setSavedPlaces(data.places || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (token) {
      loadSavedPlaces();
    }
  }, [token]);

  // Handle URL deep link from push notification (?trip=<id>)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tripParam = params.get('trip');
    if (tripParam) {
      setActiveTripId(tripParam);
    }
  }, []);

  // Handle 401 unauthorized
  useEffect(() => {
    const handleUnauth = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener('chalo_unauthorized', handleUnauth);
    return () => window.removeEventListener('chalo_unauthorized', handleUnauth);
  }, []);

  if (!token) {
    return (
      <SignIn
        onSuccess={(u) => {
          setUser(u);
          setToken(getStoredToken());
        }}
      />
    );
  }

  if (!onboarded) {
    return (
      <OnboardingModal
        user={user}
        onComplete={(u) => {
          setUser(u);
          setOnboarded(true);
        }}
      />
    );
  }

  // Active Trip Screen view
  if (activeTripId) {
    return (
      <TripScreen
        tripId={activeTripId}
        user={user}
        onBack={() => setActiveTripId(null)}
        onTripEnded={() => setActiveTripId(null)}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative' }}>
      {/* App Header */}
      <header className="app-header">
        <div className="logo-badge">
          <span className="brand-name">चलो Chalo</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            👋 {user?.first_name || 'Rider'}
          </span>
        </div>
      </header>

      {/* Screen Router */}
      <main style={{ flex: 1 }}>
        {activeTab === 'board' && (
          <BoardScreen
            user={user}
            userCoords={coords}
            savedPlaces={savedPlaces}
            onOpenPostSheet={() => setShowPostSheet(true)}
            onOpenTrip={(tId) => setActiveTripId(tId)}
          />
        )}
        {activeTab === 'saved' && (
          <SavedPlacesScreen onPlaceSavedChange={loadSavedPlaces} />
        )}
        {activeTab === 'settings' && (
          <SettingsScreen
            user={user}
            onUserUpdated={(u) => setUser(u)}
            onSignOut={() => {
              clearStoredToken();
              setToken(null);
              setUser(null);
            }}
          />
        )}
      </main>

      {/* Post Sheet Modal ("Going Now") */}
      {showPostSheet && (
        <PostSheet
          user={user}
          userCoords={coords}
          savedPlaces={savedPlaces}
          onClose={() => setShowPostSheet(false)}
          onTripCreated={(createdTrip) => {
            setShowPostSheet(false);
            setActiveTripId(createdTrip.id);
          }}
        />
      )}

      {/* Mobile-First Sticky Bottom Navigation */}
      <nav className="bottom-nav">
        <button
          onClick={() => setActiveTab('board')}
          className={`nav-item ${activeTab === 'board' ? 'active' : ''}`}
        >
          <Compass size={20} />
          <span>Rides</span>
        </button>

        <button
          onClick={() => setShowPostSheet(true)}
          style={{
            background: 'var(--accent-gradient)',
            color: '#FFF',
            border: 'none',
            borderRadius: '50%',
            width: '46px',
            height: '46px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--accent-glow)',
            transform: 'translateY(-10px)',
            cursor: 'pointer',
          }}
          title="Going Now"
        >
          <Sparkles size={22} />
        </button>

        <button
          onClick={() => setActiveTab('saved')}
          className={`nav-item ${activeTab === 'saved' ? 'active' : ''}`}
        >
          <Bookmark size={20} />
          <span>Saved</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
        >
          <Settings size={20} />
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
