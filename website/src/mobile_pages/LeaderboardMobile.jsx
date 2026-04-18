import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import fsLogo from '../assets/fs-logo.png';
import { getMe, API_URL } from '../services/api';

const API_BASE = `${API_URL}/api/v1`;

const LeaderboardMobile = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await fetch(`${API_BASE}/leaderboard`, {
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include'
                });
                if (!res.ok) throw new Error('Failed to fetch leaderboard');
                const data = await res.json();
                setUsers(data);
            } catch (err) {
                console.error('Error:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();

        const fetchUser = async () => {
            try {
                const userData = await getMe();
                setUser(userData);
            } catch (error) {
                console.error('Failed to fetch user:', error);
            }
        };
        fetchUser();
    }, []);

    return (
        <div style={{ backgroundColor: 'var(--bg-main)', height: '100dvh', overflow: 'hidden', width: '100%', display: 'flex', flexDirection: 'column' }}>

            {/* Top Header */}
            <header style={{
                padding: '0 1.5rem',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                backgroundColor: 'rgba(16,16,16,0.9)',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                height: '60px',
                boxSizing: 'border-box'
            }}>
                <img src={fsLogo} alt="Futstocks Logo" style={{ height: '22px' }} />
                <div style={{ width: '22px' }} />
            </header>

            <main style={{ flex: 1, padding: '1.5rem', paddingBottom: '80px', overflowY: 'auto' }}>
                <header style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--accent-neon)', textTransform: 'uppercase', letterSpacing: '1px', margin: '0', textAlign: 'left' }}>Leaderboard</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Top usuarios por valor de portfolio</p>
                </header>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Cargando ranking...</div>
                    ) : error ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--error-red)' }}>{error}</div>
                    ) : (
                        users.map((item, index) => (
                            <Link
                                to={`/profile/${item.id}`}
                                key={item.id}
                                className="glass-panel"
                                style={{ padding: '1rem', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', color: 'inherit', border: item.id === user?.id ? '1px solid var(--accent-neon)' : '1px solid rgba(255,255,255,0.05)' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ fontSize: '1.1rem', fontWeight: '900', color: index < 3 ? 'var(--accent-neon)' : '#444', minWidth: '35px', textAlign: 'center' }}>
                                        #{index + 1}
                                    </div>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--surface-lighter)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>
                                        {item.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: '700', fontSize: '1rem', margin: 0 }}>{item.username}</p>
                                        <p style={{ fontSize: '0.75rem', color: item.change24h >= 0 ? 'var(--accent-neon)' : 'var(--error-red)', fontWeight: '700', margin: 0 }}>
                                            {item.change24h > 0 ? '+' : ''}{item.change24h}%
                                        </p>
                                    </div>
                                </div>

                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontWeight: '800', fontSize: '1rem', margin: 0, color: 'var(--accent-neon)' }}>€{Number(item.portfolio_value).toFixed(2)}</p>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </main>

            {/* Bottom Navigation */}
            <nav style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                width: '100%',
                backgroundColor: 'rgba(28,28,28,0.95)',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                zIndex: 20,
                paddingBottom: 'env(safe-area-inset-bottom)'
            }}>
                <Link to="/home" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', padding: '12px 0', textDecoration: 'none', color: 'var(--text-muted)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>Inicio</span>
                </Link>
                <Link to="/portfolio" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', padding: '12px 0', textDecoration: 'none', color: 'var(--text-muted)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>Portfolio</span>
                </Link>
                <Link to="/market" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', padding: '12px 0', textDecoration: 'none', color: 'var(--text-muted)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>Mercado</span>
                </Link>
                <div
                    onClick={() => window.location.href = '/profile'}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px 0', color: 'var(--accent-neon)' }}
                >
                    <div style={{ width: '20px', height: '2px', backgroundColor: 'var(--accent-neon)', borderRadius: '2px', position: 'absolute', top: 0 }}></div>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--surface-lighter)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '0.7rem' }}>
                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                </div>
            </nav>
        </div>
    );
};

export default LeaderboardMobile;
