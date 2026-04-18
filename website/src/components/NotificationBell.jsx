import React, { useState, useRef, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';

const typeIcon = {
    success: '✓',
    error: '✕',
    info: 'ℹ',
    warning: '⚠',
};

const typeColor = {
    success: 'var(--accent-neon)',
    error: 'var(--error-red)',
    info: '#60a5fa',
    warning: '#f59e0b',
};

const NotificationBell = () => {
    const { notifications, clearNotifications, removeNotification } = useNotifications();
    const [open, setOpen] = useState(false);
    const panelRef = useRef(null);
    const unread = notifications.length;

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        if (open) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    return (
        <div ref={panelRef} style={{ position: 'relative' }}>
            {/* Bell Button */}
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    padding: '6px',
                    borderRadius: '8px',
                    color: open ? 'var(--accent-neon)' : 'var(--text-muted)',
                    transition: 'color 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
                title="Notifications"
            >
                {/* Bell SVG */}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {/* Badge */}
                {unread > 0 && (
                    <span style={{
                        position: 'absolute', top: 2, right: 2,
                        background: 'var(--accent-neon)', color: '#000',
                        fontSize: '0.6rem', fontWeight: '800',
                        borderRadius: '50%', width: '14px', height: '14px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        lineHeight: 1,
                    }}>
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {open && (
                <div style={{
                    position: 'absolute', right: 0, top: 'calc(100% + 8px)',
                    width: '300px', maxHeight: '360px',
                    backgroundColor: 'rgba(18,18,18,0.98)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '12px', overflow: 'hidden',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    display: 'flex', flexDirection: 'column',
                    zIndex: 1000,
                }}>
                    {/* Header */}
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}>
                        <span style={{ fontWeight: '700', fontSize: '0.85rem', color: 'var(--text-main)' }}>
                            Notificaciones {unread > 0 && <span style={{ color: 'var(--accent-neon)' }}>({unread})</span>}
                        </span>
                        {unread > 0 && (
                            <button
                                onClick={clearNotifications}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.75rem', padding: 0 }}
                            >
                                Limpiar todo
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div style={{ overflowY: 'auto', flex: 1 }}>
                        {notifications.length === 0 ? (
                            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                Sin notificaciones
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    onClick={() => removeNotification(n.id)}
                                    style={{
                                        display: 'flex', alignItems: 'flex-start', gap: '10px',
                                        padding: '10px 16px',
                                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                                        cursor: 'pointer',
                                        transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <span style={{
                                        color: typeColor[n.type] || typeColor.success,
                                        fontWeight: '800', fontSize: '0.9rem', marginTop: '1px', flexShrink: 0,
                                    }}>
                                        {typeIcon[n.type] || typeIcon.success}
                                    </span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '0.82rem', color: 'var(--text-main)', lineHeight: 1.4 }}>{n.message}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                            {n.time.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
