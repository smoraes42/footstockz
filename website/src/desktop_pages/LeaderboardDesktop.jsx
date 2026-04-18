import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import fsLogo from '../assets/fs-logo.png';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';


const API_BASE = `${import.meta.env.VITE_API_URL}/v1`;

export default function LeaderboardDesktop() {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { socket, connected } = useSocket();
    const { user } = useAuth();


    const fetchLeaderboard = async () => {
        try {
            const res = await fetch(`${API_BASE}/leaderboard`, {
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });

            if (!res.ok) {
                throw new Error('Failed to fetch leaderboard');
            }

            const data = await res.json();
            setUsers(data);
        } catch (err) {
            console.error('Error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    // WebSocket Listeners
    useEffect(() => {
        if (!socket || !connected) return;

        let debounceTimer;
        const handlePriceUpdate = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                fetchLeaderboard();
            }, 3000); // 3 seconds debounce
        };

        socket.on('price_update', handlePriceUpdate);

        return () => {
            clearTimeout(debounceTimer);
            socket.off('price_update', handlePriceUpdate);
        };
    }, [socket, connected]);




    return (
        <div style={{ backgroundColor: 'var(--bg-main)', height: '100vh', width: '100%', display: 'flex' }}>
            {/* Sidebar (Similar to Home) */}
            <aside style={{
                width: '250px',
                backgroundColor: 'rgba(28,28,28,0.7)',
                borderRight: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                flexDirection: 'column',
                padding: '2rem 1.5rem',
                position: 'fixed',
                height: '100vh',
                top: 0,
                left: 0
            }}>
                <div style={{ marginBottom: '3rem', paddingLeft: '0.5rem' }}>
                    <img src={fsLogo} alt="Futstocks Logo" style={{ height: '32px' }} />
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                    <div onClick={() => navigate('/home')} className="sidebar-link" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem', padding: '12px 16px', borderRadius: '8px', color: 'var(--text-muted)', textDecoration: 'none', transition: 'all 0.2s' }}>
                        <span style={{ fontWeight: '500' }}>Inicio</span>
                    </div>
                    <div onClick={() => navigate('/portfolio')} className="sidebar-link" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem', padding: '12px 16px', borderRadius: '8px', color: 'var(--text-muted)', textDecoration: 'none', transition: 'all 0.2s' }}>
                        <span style={{ fontWeight: '500' }}>Portfolio</span>
                    </div>
                    <div onClick={() => navigate('/market')} className="sidebar-link" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem', padding: '12px 16px', borderRadius: '8px', color: 'var(--text-muted)', textDecoration: 'none', transition: 'all 0.2s' }}>
                        <span style={{ fontWeight: '500' }}>Mercado</span>
                    </div>
                    <div className="sidebar-link active" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem', padding: '12px 16px', borderRadius: '8px', color: 'var(--text-main)', textDecoration: 'none', backgroundColor: 'rgba(57,255,20,0.1)', borderLeft: '3px solid var(--accent-neon)' }}>
                        <span style={{ fontWeight: '600' }}>Leaderboard</span>
                    </div>
                </nav>

                <div
                    onClick={() => navigate('/profile')}
                    style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--surface-lighter)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>
                            {user?.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                            <p style={{ fontSize: '0.9rem', fontWeight: '600', margin: 0 }}>{user?.username || 'Usuario'}</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Ver perfil</p>
                        </div>
                    </div>
                </div>
            </aside>

            <main style={{ marginLeft: '250px', flex: 1, padding: '2rem 3rem', overflowY: 'auto', height: '100vh' }}>
                <header style={{ marginBottom: '2.5rem' }}>
                    <h1 style={{ fontSize: '1.3rem', fontWeight: '800', color: 'var(--accent-neon)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Leaderboard</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Top usuarios por valor de portafolio</p>
                </header>

                <div className="glass-panel" style={{ borderRadius: '16px', overflow: 'hidden', minHeight: '400px' }}>
                    {loading ? (
                        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando leaderboard...</div>
                    ) : error ? (
                        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--error-red)' }}>{error}</div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                    <th style={{ padding: '1.5rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase' }}>Rango</th>
                                    <th style={{ padding: '1.5rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase' }}>Usuario</th>
                                    <th style={{ padding: '1.5rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase' }}>Portfolio Value</th>
                                    <th style={{ padding: '1.5rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase' }}>24h Change</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user, index) => (
                                    <tr
                                        key={user.id}
                                        onClick={() => navigate(`/profile/${user.id}`)}
                                        style={{
                                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                                            transition: 'background 0.2s',
                                            cursor: 'pointer'
                                        }}
                                        className="table-row-hover"
                                    >
                                        <td style={{ padding: '1.2rem 1.5rem', fontWeight: '800', color: index < 3 ? 'var(--accent-neon)' : 'var(--text-main)' }}>
                                            #{index + 1}
                                        </td>
                                        <td style={{ padding: '1.2rem 1.5rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--surface-lighter)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>
                                                    {user.username.charAt(0).toUpperCase()}
                                                </div>
                                                <p style={{ fontWeight: '700', fontSize: '1rem', margin: 0 }}>{user.username}</p>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1.2rem 1.5rem', fontWeight: '800', fontSize: '1.1rem' }}>
                                            {Number(user.portfolio_value).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                        </td>
                                        <td style={{ padding: '1.2rem 1.5rem', fontWeight: '800', fontSize: '1rem', color: user.change24h >= 0 ? 'var(--accent-neon)' : 'var(--error-red)' }}>
                                            {user.change24h > 0 ? '+' : ''}{Number(user.change24h).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            No se encontraron usuarios
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>

            <style>{`
                .table-row-hover:hover {
                    background-color: rgba(255,255,255,0.03) !important;
                }
            `}</style>
        </div>
    );
}
