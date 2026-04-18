import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import fsLogo from '../assets/fs-logo.png';
import { getPublicProfile } from '../services/api';
import { useAuth } from '../context/AuthContext';

const UserProfileDesktop = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [profileData, setProfileData] = useState(null);
    const { user: currentUser } = useAuth();  // current logged-in user from global context
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const pData = await getPublicProfile(userId);
                setProfileData(pData);
            } catch (error) {
                console.error('Failed to load user profile:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [userId]);

    if (loading) {
        return (
            <div style={{ backgroundColor: 'var(--bg-main)', height: '100vh', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-main)' }}>
                Cargando perfil de usuario...
            </div>
        );
    }

    if (!profileData) {
        return (
            <div style={{ backgroundColor: 'var(--bg-main)', height: '100vh', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-main)' }}>
                Usuario no encontrado.
            </div>
        );
    }

    const { user, holdings, totalHoldingsValue } = profileData;

    return (
        <div style={{ backgroundColor: 'var(--bg-main)', height: '100vh', width: '100%', display: 'flex' }}>

            {/* Sidebar Left */}
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
                    <img src={fsLogo} alt="Futstocks Logo" style={{ height: '32px', cursor: 'pointer' }} onClick={() => navigate('/home')} />
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                    <Link to="/home" className="sidebar-link" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '12px 16px', borderRadius: '8px', color: 'var(--text-muted)', textDecoration: 'none', transition: 'all 0.2s' }}>
                        <span style={{ fontWeight: '500' }}>Inicio</span>
                    </Link>
                    <Link to="/portfolio" className="sidebar-link" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '12px 16px', borderRadius: '8px', color: 'var(--text-muted)', textDecoration: 'none', transition: 'all 0.2s' }}>
                        <span style={{ fontWeight: '500' }}>Portfolio</span>
                    </Link>
                    <Link to="/market" className="sidebar-link" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '12px 16px', borderRadius: '8px', color: 'var(--text-muted)', textDecoration: 'none', transition: 'all 0.2s' }}>
                        <span style={{ fontWeight: '500' }}>Mercado</span>
                    </Link>
                    <Link to="/leaderboard" className="sidebar-link" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '12px 16px', borderRadius: '8px', color: 'var(--text-muted)', textDecoration: 'none', transition: 'all 0.2s' }}>
                        <span style={{ fontWeight: '500' }}>Leaderboard</span>
                    </Link>
                </nav>

                <div
                    onClick={() => navigate('/profile')}
                    style={{
                        marginTop: 'auto',
                        paddingTop: '2rem',
                        borderTop: '1px solid rgba(255,255,255,0.1)',
                        cursor: 'pointer'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--surface-lighter)',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            fontWeight: 'bold',
                            color: 'var(--text-main)',
                            overflow: 'hidden'
                        }}>
                            {currentUser?.avatar_url ? (
                                <img src={currentUser.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                currentUser?.username?.charAt(0).toUpperCase() || 'U'
                            )}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <p style={{ fontSize: '0.9rem', fontWeight: '600', margin: 0, color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{currentUser?.username || 'Usuario'}</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Ver perfil</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{ marginLeft: '250px', flex: 1, padding: '2rem 3rem', overflowY: 'auto' }}>
                <header style={{ marginBottom: '3rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                        onClick={() => navigate(-1)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}
                    >
                        ←
                    </button>
                    <div>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', margin: '0' }}>Perfil de {user.username}</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Revisa la cartera de este usuario</p>
                    </div>
                </header>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.5fr', gap: '2rem' }}>

                    {/* User Info Card */}
                    <div className="glass-panel" style={{ padding: '2rem', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', height: 'fit-content' }}>
                        <div style={{
                            width: '120px',
                            height: '120px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--surface-lighter)',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            fontSize: '3rem',
                            fontWeight: 'bold',
                            color: 'var(--accent-neon)',
                            marginBottom: '1.5rem',
                            border: '4px solid rgba(57,255,20,0.2)',
                            overflow: 'hidden'
                        }}>
                            {user?.avatar_url ? (
                                <img src={user.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                user?.username?.charAt(0).toUpperCase() || 'U'
                            )}
                        </div>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '0.5rem' }}>{user.username}</h2>
                        <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '16px', width: '100%', marginTop: '1rem' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Valor en Acciones</p>
                            <p style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--accent-neon)', margin: 0 }}>{totalHoldingsValue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
                        </div>
                        <p style={{ color: 'var(--text-muted)', marginTop: '2rem', fontSize: '0.9rem' }}>
                            Miembro desde {new Date(user.created_at).toLocaleDateString()}
                        </p>
                    </div>

                    {/* Holdings Table */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.4rem', fontWeight: '700', margin: 0 }}>Portafolio de Activos</h3>
                        <div className="glass-panel" style={{ borderRadius: '20px', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                        <th style={{ padding: '1.2rem', color: 'var(--text-muted)', fontWeight: '600' }}>Jugador</th>
                                        <th style={{ padding: '1.2rem', color: 'var(--text-muted)', fontWeight: '600' }}>Acciones</th>
                                        <th style={{ padding: '1.2rem', color: 'var(--text-muted)', fontWeight: '600' }}>Precio</th>
                                        <th style={{ padding: '1.2rem', color: 'var(--text-muted)', fontWeight: '600' }}>Valor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {holdings.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                Este usuario no tiene acciones actualmente.
                                            </td>
                                        </tr>
                                    ) : (
                                        holdings.map((h, i) => (
                                            <tr
                                                key={i}
                                                style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer' }}
                                                onClick={() => navigate(`/market/player/${h.player_id}`)}
                                                className="table-row-hover"
                                            >
                                                <td style={{ padding: '1.2rem', fontWeight: '700' }}>{h.player_name}</td>
                                                <td style={{ padding: '1.2rem' }}>{h.shares_owned.toLocaleString()}</td>
                                                <td style={{ padding: '1.2rem' }}>{h.current_price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                                                <td style={{ padding: '1.2rem', fontWeight: '700', color: 'var(--accent-neon)' }}>{h.position_value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </main>

        </div>
    );
};

export default UserProfileDesktop;
