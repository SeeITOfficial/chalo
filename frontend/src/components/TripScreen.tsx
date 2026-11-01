import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { ArrowLeft, Clock, Send, Flag, ShieldAlert, LogOut, Info } from 'lucide-react';

interface TripScreenProps {
  tripId: string;
  user: any;
  onBack: () => void;
  onTripEnded: () => void;
}

export const TripScreen: React.FC<TripScreenProps> = ({
  tripId,
  user,
  onBack,
  onTripEnded,
}) => {
  const [trip, setTrip] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatOpen, setChatOpen] = useState(true);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmFlagId, setConfirmFlagId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTripDetails = async () => {
    try {
      const data = await api.getTrip(tripId);
      setTrip(data.trip);
      setMembers(data.members || []);
      setMessages(data.messages || []);
      setChatOpen(data.chatOpen);
    } catch (err: any) {
      if (err.message === 'not_a_member') {
        onTripEnded();
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTripDetails();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchTripDetails();
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [tripId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (text: string, kind: 'text' | 'quick' = 'text') => {
    if (!text.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      await api.sendMessage(tripId, text.trim(), kind);
      setMessageText('');
      await fetchTripDetails();
    } catch (err: any) {
      if (err.status === 429) {
        setError('Please wait a moment before sending another message.');
      } else if (err.message === 'chat_closed') {
        setError('This ride has ended. Chat is closed.');
      } else {
        setError('Failed to send message.');
      }
    } finally {
      setSending(false);
    }
  };

  const handleFlagMessage = async (messageId: string) => {
    try {
      await api.flagMessage(messageId);
      setConfirmFlagId(null);
      await fetchTripDetails();
    } catch (err: any) {
      setError(err.message || 'Could not flag message');
    }
  };

  const handleLeaveTrip = async () => {
    if (!window.confirm('Are you sure you want to leave this ride?')) return;
    try {
      await api.leaveTrip(tripId);
      onTripEnded();
    } catch (err: any) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading ride details...
      </div>
    );
  }

  if (!trip) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Ride not found or you are no longer a member.
        </p>
        <button onClick={onBack} className="btn-secondary" style={{ margin: '0 auto' }}>
          Go Back
        </button>
      </div>
    );
  }

  // Countdown calculations
  const nowSec = Math.floor(Date.now() / 1000);
  const secondsToLeave = Math.max(0, trip.leave_at - nowSec);
  const secondsToExpiry = Math.max(0, trip.expires_at - nowSec);

  const formatMinSec = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isPoster = members.some((m) => m.id === user.id && m.role === 'poster');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--bg-page)' }}>
      {/* 8. Top: Destination and countdown */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderBottom: '1.5px solid var(--border-subtle)',
          padding: '16px 20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={onBack}
              style={{
                background: 'var(--bg-subtle)',
                border: 'none',
                borderRadius: '50%',
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-main)',
              }}
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 800 }}>{trip.place}</h1>
              <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {members.length} {members.length === 1 ? 'person' : 'people'} going
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLeaveTrip}
            style={{
              backgroundColor: 'var(--danger-bg)',
              color: 'var(--danger)',
              border: '1.5px solid #FECACA',
              borderRadius: 'var(--radius-md)',
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <LogOut size={15} />
            <span>{isPoster ? 'Cancel Ride' : 'Leave'}</span>
          </button>
        </div>

        {/* Countdown timer */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: secondsToLeave > 0 ? 'var(--primary-light)' : 'var(--bg-subtle)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            fontWeight: 700,
            fontSize: '15px',
            color: secondsToLeave > 0 ? 'var(--primary)' : 'var(--text-secondary)',
          }}
        >
          <Clock size={18} />
          {secondsToLeave > 0 ? (
            <span>Leaving in {formatMinSec(secondsToLeave)}</span>
          ) : secondsToExpiry > 0 ? (
            <span>Waiting for riders ({formatMinSec(secondsToExpiry)} left)</span>
          ) : (
            <span>Ride ended</span>
          )}
        </div>
      </div>

      {/* Middle: Who is going */}
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          overflowX: 'auto',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Going:
        </span>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'nowrap' }}>
          {members.map((m) => (
            <span
              key={m.id}
              style={{
                backgroundColor: m.id === user.id ? 'var(--primary-light)' : 'var(--bg-subtle)',
                color: m.id === user.id ? 'var(--primary)' : 'var(--text-main)',
                border: m.id === user.id ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '14px',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              {m.first_name} {m.role === 'poster' ? '👑' : ''} {m.id === user.id ? '(You)' : ''}
            </span>
          ))}
        </div>
      </div>

      {/* Notice Banner */}
      <div
        style={{
          backgroundColor: '#FFFBEB',
          borderBottom: '1px solid #FDE68A',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <Info size={18} color="#D97706" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '13px', color: '#92400E', fontWeight: 600, lineHeight: '1.35' }}>
          Agree the fare with the driver, then split equally among everyone who boards.
        </div>
      </div>

      {error && (
        <div style={{ margin: '12px 20px 0', padding: '10px 14px', backgroundColor: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', fontSize: '14px', fontWeight: 600 }}>
          {error}
        </div>
      )}

      {/* Chat Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px', marginTop: '40px' }}>
            No messages yet. Tap a quick button below to say you are here!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.user_id === user.id;
            return (
              <div
                key={msg.id}
                style={{
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '82%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                }}
              >
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '3px', fontWeight: 600 }}>
                  {isMe ? 'You' : msg.first_name}
                </div>
                <div
                  className={`chat-bubble ${isMe ? 'chat-bubble-me' : 'chat-bubble-other'}`}
                >
                  {msg.body}
                </div>
                {!isMe && chatOpen && (
                  <button
                    type="button"
                    onClick={() => setConfirmFlagId(msg.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontSize: '12px',
                      marginTop: '3px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    <Flag size={12} /> Flag
                  </button>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 4 Big Quick Buttons: "I'm here", "2 min late", "Leaving now", "Can't make it" */}
      {chatOpen && (
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            borderTop: '1px solid var(--border-subtle)',
            padding: '10px 16px 6px',
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
          }}
        >
          {(["I'm here", "2 min late", "Leaving now", "Can't make it"] as const).map((q) => (
            <button
              key={q}
              type="button"
              className="quick-btn"
              onClick={() => handleSendMessage(q, 'quick')}
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Message Input Bar */}
      <div
        style={{
          padding: '10px 16px max(12px, env(safe-area-inset-bottom))',
          backgroundColor: 'var(--bg-card)',
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        {chatOpen ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(messageText, 'text');
            }}
            style={{ display: 'flex', gap: '8px' }}
          >
            <input
              type="text"
              placeholder="Message riders (first names only)..."
              value={messageText}
              maxLength={500}
              onChange={(e) => setMessageText(e.target.value)}
              style={{
                flex: 1,
                border: '1.5px solid var(--border)',
                borderRadius: 'var(--radius-full)',
                padding: '12px 18px',
                fontSize: '15px',
                color: 'var(--text-main)',
                backgroundColor: 'var(--bg-subtle)',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={sending || !messageText.trim()}
              style={{
                backgroundColor: 'var(--primary)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 'var(--radius-full)',
                width: '46px',
                height: '46px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <Send size={18} />
            </button>
          </form>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '6px 0' }}>
            Ride ended. Chat is closed.
          </div>
        )}
      </div>

      {/* Flag Confirmation Dialog */}
      {confirmFlagId && (
        <div className="modal-overlay" onClick={() => setConfirmFlagId(null)}>
          <div className="sheet-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--danger)', marginBottom: '12px' }}>
              <ShieldAlert size={24} />
              <h2 style={{ fontSize: '20px' }}>Flag Message</h2>
            </div>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.4' }}>
              Flagging immediately removes this person from the ride, frees their seat, and keeps the message for review.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setConfirmFlagId(null)}
                className="btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleFlagMessage(confirmFlagId)}
                className="btn-danger"
                style={{ flex: 1, padding: '12px', fontSize: '15px' }}
              >
                Confirm Flag
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
