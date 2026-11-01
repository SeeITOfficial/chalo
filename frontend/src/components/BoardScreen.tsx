import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { MapPin, Plus, Search, ChevronRight, AlertTriangle, X, Check } from 'lucide-react';
import { DestinationDetailModal } from './DestinationDetailModal';

interface BoardScreenProps {
  user: any;
  userCoords: { lat: number; lng: number } | null;
  savedPlaces: any[];
  onOpenTrip: (tripId: string) => void;
  onGoToPlaces: () => void;
  onSetTestLocation?: () => void;
}

export const BoardScreen: React.FC<BoardScreenProps> = ({
  user,
  userCoords,
  savedPlaces,
  onOpenTrip,
  onGoToPlaces,
  onSetTestLocation,
}) => {
  const [trips, setTrips] = useState<any[]>([]);
  const [alertsActive, setAlertsActive] = useState<boolean>(true);
  const [alertsMinutes, setAlertsMinutes] = useState<30 | 60 | 120>(30);
  const [showAlertModal, setShowAlertModal] = useState<boolean>(false);
  const [selectedPlace, setSelectedPlace] = useState<any | null>(null);

  // Search for other destinations
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Auto-enable alerts and fetch trips
  const refreshData = async () => {
    if (!userCoords) return;
    try {
      const data = await api.getNearbyTrips(userCoords.lat, userCoords.lng);
      setTrips(data.trips || []);
    } catch (e) {
      console.error('Failed to fetch nearby rides:', e);
    }
  };

  const updateAlerts = async (mins: 30 | 60 | 120, active: boolean) => {
    if (!userCoords) return;
    try {
      if (active) {
        await api.updatePresence(userCoords.lat, userCoords.lng, mins);
        setAlertsActive(true);
        setAlertsMinutes(mins);
      } else {
        setAlertsActive(false);
      }
    } catch (e) {
      console.error('Failed to update alerts:', e);
    }
  };

  // Auto-enable alerts on open (if coords available) and poll every 7s
  useEffect(() => {
    if (userCoords) {
      updateAlerts(alertsMinutes, true);
      refreshData();
    }

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && userCoords) {
        refreshData();
      }
    }, 7000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && userCoords) {
        refreshData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [userCoords?.lat, userCoords?.lng]);

  // Search places
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.getPlaces(searchQuery.trim());
        setSearchResults(res.places || []);
      } catch (e) {
        console.error('Failed to search places:', e);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Count active trips going to a place
  const getLiveCount = (place: any) => {
    const matching = trips.filter(
      (t) => t.place_id === place.id || t.place?.toLowerCase() === place.name?.toLowerCase()
    );
    const totalPeople = matching.reduce((acc, t) => acc + (t.going || 1), 0);
    return {
      trips: matching,
      count: totalPeople,
    };
  };

  return (
    <div style={{ paddingBottom: '90px' }}>
      {/* 4. Quiet alerts line: "Alerts on for 30 min · Change" */}
      <div className="quiet-line">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: alertsActive ? 'var(--accent-green)' : 'var(--text-light)',
              display: 'inline-block',
            }}
          />
          <span>
            {alertsActive ? `Alerts on for ${alertsMinutes} min` : 'Alerts paused'}
          </span>
        </div>
        <button
          type="button"
          className="quiet-line-change"
          onClick={() => setShowAlertModal(true)}
        >
          Change
        </button>
      </div>

      <div style={{ padding: '24px 20px 16px' }}>
        {/* 5. Location warning: Never fall back to fake coordinates */}
        {!userCoords && (
          <div
            style={{
              backgroundColor: '#FEF3C7',
              border: '1.5px solid #F59E0B',
              borderRadius: 'var(--radius-lg)',
              padding: '16px',
              marginBottom: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <AlertTriangle size={22} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: 700, color: '#92400E', fontSize: '16px' }}>
                  Location is turned off
                </div>
                <div style={{ fontSize: '14px', color: '#B45309', marginTop: '4px', lineHeight: '1.4' }}>
                  Chalo needs your location to see who is leaving near you. Please enable location in your browser.
                </div>
              </div>
            </div>

            {onSetTestLocation && (
              <button
                type="button"
                onClick={onSetTestLocation}
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: '#FFFFFF',
                  color: '#92400E',
                  border: '1px solid #D97706',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  marginTop: '4px',
                }}
              >
                Use Vadodara Test Location (Pilot Cluster)
              </button>
            )}
          </div>
        )}

        {/* 2. One question on one screen: "Where are you going?" */}
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '6px' }}>
            Where are you going?
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
            Tap a place to see who is leaving now, or start a ride in 2 taps.
          </p>
        </div>

        {/* Big tappable tiles for user's saved places */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          {savedPlaces.length > 0 ? (
            savedPlaces.map((place) => {
              const { count, trips: matchingTrips } = getLiveCount(place);
              const hasRiders = count > 0;
              return (
                <button
                  key={place.id}
                  type="button"
                  className="place-tile"
                  onClick={() => setSelectedPlace({ place, matchingTrips })}
                >
                  <div>
                    <div className="place-tile-title">{place.name}</div>
                    <div className={`place-tile-subtitle ${hasRiders ? 'place-tile-active' : ''}`}>
                      {hasRiders ? (
                        <>
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--accent-green)',
                              display: 'inline-block',
                            }}
                          />
                          <span>{count} {count === 1 ? 'person' : 'people'} going now</span>
                        </>
                      ) : (
                        <span>Nobody yet</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={22} color="var(--text-light)" />
                </button>
              );
            })
          ) : (
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1.5px dashed var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px 20px',
                textAlign: 'center',
              }}
            >
              <MapPin size={32} color="var(--primary)" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontWeight: 700, fontSize: '17px', color: 'var(--text-main)', marginBottom: '4px' }}>
                No saved places yet
              </div>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Save places like Railway Station or your office to see them here with live rider counts.
              </div>
            </div>
          )}
        </div>

        {/* Button: + Add a place */}
        <button
          type="button"
          onClick={onGoToPlaces}
          className="btn-secondary"
          style={{ width: '100%', marginBottom: '28px' }}
        >
          <Plus size={20} />
          <span>Add a place</span>
        </button>

        {/* Search for other destinations */}
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Or search any destination
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--bg-card)',
              border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              gap: '10px',
            }}
          >
            <Search size={18} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search station, bridge, society, D-Mart..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                width: '100%',
                fontSize: '16px',
                color: 'var(--text-main)',
                fontFamily: 'inherit',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', display: 'flex' }}
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Search Dropdown / Results */}
          {searchResults.length > 0 && (
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1.5px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                marginTop: '8px',
                maxHeight: '260px',
                overflowY: 'auto',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              {searchResults.map((p) => {
                const { count, trips: matchingTrips } = getLiveCount(p);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                      setSelectedPlace({ place: p, matchingTrips });
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '14px 16px',
                      borderBottom: '1px solid var(--border-subtle)',
                      background: 'none',
                      textAlign: 'left',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-main)' }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: '13px', color: count > 0 ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                        {count > 0 ? `${count} going now` : 'Nobody yet'}
                      </div>
                    </div>
                    <ChevronRight size={18} color="var(--text-light)" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Destination Detail Modal (Tapped Tile) */}
      {selectedPlace && (
        <DestinationDetailModal
          place={selectedPlace.place}
          matchingTrips={selectedPlace.matchingTrips}
          user={user}
          userCoords={userCoords}
          onClose={() => setSelectedPlace(null)}
          onTripJoined={(tId) => {
            setSelectedPlace(null);
            onOpenTrip(tId);
          }}
          onTripCreated={(created) => {
            setSelectedPlace(null);
            onOpenTrip(created.id);
          }}
        />
      )}

      {/* Change Alerts Sheet Modal */}
      {showAlertModal && (
        <div className="modal-overlay" onClick={() => setShowAlertModal(false)}>
          <div className="sheet-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px' }}>Alert Settings</h2>
              <button
                type="button"
                onClick={() => setShowAlertModal(false)}
                style={{ background: 'var(--bg-subtle)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} />
              </button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '20px' }}>
              When alerts are on, you will be notified when someone near you is heading to your saved places.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {([30, 60, 120] as const).map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => {
                    updateAlerts(mins, true);
                    setShowAlertModal(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    border: alertsActive && alertsMinutes === mins ? '2px solid var(--primary)' : '1.5px solid var(--border)',
                    backgroundColor: alertsActive && alertsMinutes === mins ? 'var(--primary-light)' : 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontWeight: 600,
                  }}
                >
                  <span>Alerts on for {mins} minutes</span>
                  {alertsActive && alertsMinutes === mins && <Check size={20} color="var(--primary)" />}
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  updateAlerts(alertsMinutes, false);
                  setShowAlertModal(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: !alertsActive ? '2px solid var(--primary)' : '1.5px solid var(--border)',
                  backgroundColor: !alertsActive ? 'var(--primary-light)' : 'var(--bg-card)',
                  color: 'var(--text-main)',
                  fontWeight: 600,
                }}
              >
                <span>Turn off alerts</span>
                {!alertsActive && <Check size={20} color="var(--primary)" />}
              </button>
            </div>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => setShowAlertModal(false)}
              style={{ width: '100%' }}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
