import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import fsLogo from '../assets/fs-logo.png';
import { getPortfolio, logout } from '../services/api';
import { useAuth } from '../context/AuthContext';

const ProfileDesktop = () => {
    const navigate = useNavigate();
    const { user, clearUser } = useAuth();   // user already fetched globally — no redundant getMe()
    const [portfolio, setPortfolio] = useState(null);
    const [loading, setLoading] = useState(true);
    const [portfolioError, setPortfolioError] = useState('');

    useEffect(() => {
        const fetchPortfolio = async () => {
            try {
                const portfolioData = await getPortfolio();
                setPortfolio(portfolioData);
            } catch (error) {
                if (error.status === 401 || error.status === 403) {
                    clearUser();
                    navigate('/login');
                    return;
                }
                setPortfolioError('No se pudo cargar el portfolio. Inténtalo de nuevo.');
                console.error('Failed to load portfolio:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPortfolio();
    }, []);

    if (loading) {
        return (
            <div style={{ backgroundColor: 'var(--bg-main)', height: '100vh', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-main)' }}>
                Cargando perfil...
            </div>
        );
    }

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
                        cursor: 'pointer',
                        backgroundColor: 'rgba(57,255,20,0.05)',
                        margin: '0 -1.5rem',
                        padding: '2rem 1.5rem 1rem 1.5rem'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--accent-neon)',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            fontWeight: 'bold',
                            color: '#000',
                            overflow: 'hidden'
                        }}>
                            {user?.avatar_url ? (
                                <img src={user.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                user?.username?.charAt(0).toUpperCase() || 'U'
                            )}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <p style={{ fontSize: '0.9rem', fontWeight: '600', margin: 0, color: 'var(--text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{user?.username || 'Usuario'}</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Ver perfil</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{ marginLeft: '250px', flex: 1, padding: '2rem 3rem', overflowY: 'auto' }}>
                <header style={{ marginBottom: '3rem' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', margin: '0 0 0.5rem 0' }}>Mi Perfil</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Gestiona tu cuenta y revisa tus estadísticas</p>
                </header>

                {portfolioError && (
                    <div style={{ backgroundColor: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '2rem', color: '#ff4d4d', fontSize: '0.9rem' }}>
                        {portfolioError}
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>

                    {/* User Info Card */}
                    <div className="glass-panel" style={{ padding: '2rem', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
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
                        <h2 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '0.5rem' }}>{user?.username}</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>{user?.email}</p>

                        <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                            <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '16px' }}>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.5rem 0' }}>NIVEL</p>
                                <p style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>1</p>
                            </div>
                            <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '16px' }}>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.5rem 0' }}>EXP</p>
                                <p style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>150</p>
                            </div>
                        </div>

                        <button style={{
                            marginTop: '2rem',
                            width: '100%',
                            padding: '12px',
                            borderRadius: '12px',
                            border: 'none',
                            backgroundColor: 'rgba(255,50,50,0.1)',
                            color: '#ff5050',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }} onClick={async () => {
                            await logout();
                            clearUser();
                            navigate('/login');
                        }}>
                            Cerrar Sesión
                        </button>
                    </div>

                    {/* Stats & Details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                        {/* Wallet Summary */}
                        <div className="glass-panel" style={{ padding: '2rem', borderRadius: '24px' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1.5rem' }}>Resumen de Cuenta</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                                <div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Balance de Wallet</p>
                                    <p style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--accent-neon)' }}>{portfolio?.walletBalance?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'} €</p>
                                </div>
                                <div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Valor en Acciones</p>
                                    <p style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-main)' }}>{(portfolio?.holdings?.reduce((acc, h) => acc + h.position_value, 0) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
                                </div>
                                <div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Valor Total</p>
                                    <p style={{ fontSize: '1.8rem', fontWeight: '800', color: 'var(--text-main)' }}>{((portfolio?.walletBalance || 0) + (portfolio?.holdings?.reduce((acc, h) => acc + h.position_value, 0) || 0)).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
                                </div>
                            </div>
                        </div>

                        {/* Account Details */}
                        <div className="glass-panel" style={{ padding: '2rem', borderRadius: '24px' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1.5rem' }}>Detalles de la Cuenta</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.8rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Fecha de registro</span>
                                    <span style={{ fontWeight: '500' }}>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.8rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Estado de la cuenta</span>
                                    <span style={{ color: 'var(--accent-neon)', fontWeight: '600' }}>Verificada</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.8rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>ID de Usuario</span>
                                    <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)' }}>#{user?.id}</span>
                                </div>
                            </div>
                        </div>

                    </div>

                </div>
            </main>

        </div>
    );
};

export default ProfileDesktop;
