import React, { useState, useEffect } from 'react';
import { api, getStoredToken, getStoredUser, clearStoredToken } from './api';
import { SignIn } from './components/SignIn';
import { OnboardingModal } from './components/OnboardingModal';
import { BoardScreen } from './components/BoardScreen';
import { TripScreen } from './components/TripScreen';
import { SavedPlacesScreen } from './components/SavedPlacesScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { Compass, MapPin, User } from 'lucide-react';

export const App: React.FC = () => {
  const [user, setUser] = useState<any>(getStoredUser());
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [onboarded, setOnboarded] = useState<boolean>(Boolean(localStorage.getItem('chalo_onboarded')));

  // Location: null by default. Never fall back to fake coordinates automatically!
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [activeTab, setActiveTab] = useState<'home' | 'places' | 'profile'>('home');
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [savedPlaces, setSavedPlaces] = useState<any[]>([]);

  // Register PWA service worker on boot
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW registration failed:', err);
      });
    }
  }, []);

  // Request actual geolocation
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => {
          console.warn('Geolocation not granted or error:', err.message);
          setCoords(null);
        },
        { enableHighAccuracy: true, timeout: 8000 }
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
        onComplete={() => {
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
        <div className="app-title">
          चलो <span>Chalo</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)' }}>
            👋 {user?.first_name || 'Rider'}
          </span>
        </div>
      </header>

      {/* Screen Router */}
      <main style={{ flex: 1 }}>
        {activeTab === 'home' && (
          <BoardScreen
            user={user}
            userCoords={coords}
            savedPlaces={savedPlaces}
            onOpenTrip={(tId) => setActiveTripId(tId)}
            onGoToPlaces={() => setActiveTab('places')}
            onSetTestLocation={() => setCoords({ lat: 22.2887, lng: 73.3634 })}
          />
        )}
        {activeTab === 'places' && (
          <SavedPlacesScreen onPlaceSavedChange={loadSavedPlaces} />
        )}
        {activeTab === 'profile' && (
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

      {/* 6. Bottom Navigation: Only 3 tabs: Home, Places, Profile */}
      <nav className="bottom-nav">
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className={`bottom-nav-item ${activeTab === 'home' ? 'active' : ''}`}
        >
          <Compass size={22} />
          <span>Home</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('places')}
          className={`bottom-nav-item ${activeTab === 'places' ? 'active' : ''}`}
        >
          <MapPin size={22} />
          <span>Places</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`bottom-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
        >
          <User size={22} />
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
};

export default App;
