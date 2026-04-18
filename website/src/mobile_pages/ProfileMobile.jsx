import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import fsLogo from '../assets/fs-logo.png';
import { getMe, getPortfolio, getPublicProfile } from '../services/api';

const ProfileMobile = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const isOwnProfile = !userId;
    
    const [user, setUser] = useState(null);
    const [portfolio, setPortfolio] = useState(null);
    const [publicData, setPublicData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (isOwnProfile) {
                    const [userData, portData] = await Promise.all([
                        getMe(),
                        getPortfolio()
                    ]);
                    setUser(userData);
                    setPortfolio(portData);
                } else {
                    const pData = await getPublicProfile(userId);
                    setPublicData(pData);
                    setUser(pData.user);
                    
                    // Still try to get "me" for navigation thumbnail
                    getMe().then(me => setPortfolio({ myUsername: me.username }));
                }
            } catch (error) {
                console.error('Failed to load profile:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [userId, isOwnProfile]);

    if (loading) return <div style={{ backgroundColor: 'var(--bg-main)', height: '100dvh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>Cargando...</div>;

    const totalValue = isOwnProfile 
        ? ((portfolio?.walletBalance || 0) + (portfolio?.holdings?.reduce((acc, h) => acc + h.position_value, 0) || 0))
        : (publicData?.totalHoldingsValue || 0);

    const holdings = isOwnProfile ? (portfolio?.holdings || []) : (publicData?.holdings || []);

    return (
        <div style={{ backgroundColor: 'var(--bg-main)', height: '100dvh', overflow: 'hidden', width: '100%', display: 'flex', flexDirection: 'column' }}>
            
            {/* Header */}
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
                {isOwnProfile ? (
                    <img src={fsLogo} alt="Logo" style={{ height: '22px' }} />
                ) : (
                    <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--accent-neon)', fontSize: '0.85rem', fontWeight: '800' }}>VOLVER</button>
                )}
                <h3 style={{ fontSize: '0.95rem', fontWeight: '800', margin: 0, letterSpacing: '1px', color: 'var(--accent-neon)', position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
                    {isOwnProfile ? 'MI PERFIL' : 'PERFIL'}
                </h3>
                {isOwnProfile ? (
                    <button onClick={() => {
                        document.cookie = "jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                        window.location.href = "/login";
                    }} style={{ background: 'none', border: 'none', color: '#ff5050', fontSize: '0.7rem', fontWeight: '800' }}>SALIR</button>
                ) : <div style={{ width: '60px' }} />}
            </header>

            <main style={{ flex: 1, padding: '1.5rem', paddingBottom: '80px', overflowY: 'auto' }}>
                
                {/* User Info */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem' }}>
                    <div style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--surface-lighter)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        fontSize: '2.5rem',
                        fontWeight: 'bold',
                        color: 'var(--accent-neon)',
                        marginBottom: '1rem',
                        border: '3px solid rgba(57,255,20,0.2)',
                        overflow: 'hidden'
                    }}>
                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: '0 0 0.25rem 0' }}>{user?.username}</h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>Miembro desde {new Date(user?.created_at).toLocaleDateString()}</p>
                </div>

                {/* Capital Breakdown */}
                <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '24px', marginBottom: '2.5rem', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Valor Total</span>
                    <p style={{ fontSize: '2.4rem', fontWeight: '900', color: 'var(--accent-neon)', margin: '0.25rem 0 1rem 0', letterSpacing: '-1px' }}>€{totalValue.toFixed(2)}</p>
                    
                    {isOwnProfile && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                            <div>
                                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '700', margin: '0 0 4px 0' }}>CASH</p>
                                <p style={{ fontSize: '1rem', fontWeight: '800', margin: 0 }}>€{portfolio?.walletBalance?.toFixed(2)}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: '700', margin: '0 0 4px 0' }}>ACCIONES</p>
                                <p style={{ fontSize: '1rem', fontWeight: '800', margin: 0 }}>€{(totalValue - portfolio?.walletBalance).toFixed(2)}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Holdings Section (Simplified) */}
                <div style={{ marginTop: '2.5rem' }}>
                    <h3 style={{ fontSize: '0.90rem', fontWeight: '800', color: 'var(--accent-neon)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1.25rem' }}>Portafolio</h3>
                    {holdings.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '0.9rem' }}>No hay acciones en cartera.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {holdings.map((h, i) => (
                                <Link 
                                    to={`/market/player/${h.player_id}`}
                                    key={i} 
                                    className="glass-panel" 
                                    style={{ padding: '1rem', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', color: 'inherit' }}
                                >
                                    <div>
                                        <p style={{ fontWeight: '700', fontSize: '0.95rem', margin: 0 }}>{h.player_name}</p>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{h.shares_owned.toFixed(2)} acciones</p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontWeight: '800', fontSize: '0.95rem', margin: 0, color: 'var(--accent-neon)' }}>€{h.position_value.toFixed(2)}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

            </main>

            {/* Bottom Navigation */}
            {isOwnProfile && (
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
                    <Link to="/profile" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', padding: '12px 0', textDecoration: 'none', color: 'var(--accent-neon)' }}>
                        <div style={{ width: '20px', height: '2px', backgroundColor: 'var(--accent-neon)', borderRadius: '2px', position: 'absolute', top: 0 }}></div>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--surface-lighter)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '0.7rem' }}>
                            {user?.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                    </Link>
                </nav>
            )}
        </div>
    );
};

export default ProfileMobile;
