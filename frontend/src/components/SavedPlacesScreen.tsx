import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Search, MapPin, Trash2, Plus, X, Check } from 'lucide-react';

interface SavedPlacesScreenProps {
  onPlaceSavedChange: () => void;
}

export const SavedPlacesScreen: React.FC<SavedPlacesScreenProps> = ({ onPlaceSavedChange }) => {
  const [savedPlaces, setSavedPlaces] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSavedPlaces = async () => {
    try {
      const data = await api.getSavedPlaces();
      setSavedPlaces(data.places || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedPlaces();
  }, []);

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
        console.error(e);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSavePlace = async (placeId: string) => {
    try {
      await api.savePlace(placeId);
      await fetchSavedPlaces();
      onPlaceSavedChange();
      setSearchQuery('');
      setSearchResults([]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteSavedPlace = async (placeId: string) => {
    try {
      await api.deleteSavedPlace(placeId);
      await fetchSavedPlaces();
      onPlaceSavedChange();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ padding: '24px 20px 90px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '6px' }}>
          Saved Places
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: '1.4' }}>
          Places you go often. When you have alerts on, you are notified when someone near you is leaving for any of your saved places.
        </p>
      </div>

      {/* Search & Add New Place */}
      <div style={{ position: 'relative', marginBottom: '24px' }}>
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
            placeholder="Search places in Vadodara to save..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
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

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: '105%',
              left: 0,
              right: 0,
              zIndex: 30,
              backgroundColor: 'var(--bg-card)',
              border: '1.5px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              maxHeight: '260px',
              overflowY: 'auto',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            {searchResults.map((p) => {
              const isAlreadySaved = savedPlaces.some((sp) => sp.id === p.id);
              return (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-main)' }}>
                    {p.name}
                  </div>
                  {isAlreadySaved ? (
                    <span style={{ fontSize: '13px', color: 'var(--accent-green)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={16} /> Saved
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSavePlace(p.id)}
                      style={{
                        backgroundColor: 'var(--primary-light)',
                        color: 'var(--primary)',
                        border: '1px solid var(--primary)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '6px 12px',
                        fontSize: '13px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Plus size={14} /> Add
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* List of Saved Places */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
            Loading saved places...
          </div>
        ) : savedPlaces.length === 0 ? (
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
            <div style={{ fontWeight: 700, fontSize: '17px', marginBottom: '4px' }}>
              No saved places yet
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Search above to add places you frequently visit.
            </div>
          </div>
        ) : (
          savedPlaces.map((sp) => (
            <div
              key={sp.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px',
                backgroundColor: 'var(--bg-card)',
                border: '1.5px solid var(--border)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <MapPin size={20} color="var(--primary)" />
                <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-main)' }}>
                  {sp.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteSavedPlace(sp.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                }}
                title="Remove place"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
