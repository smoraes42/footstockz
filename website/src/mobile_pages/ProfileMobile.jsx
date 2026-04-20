import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import fsLogo from '../assets/fs-logo.png';
import { getMe, getPortfolio, getPublicProfile } from '../services/api';
import styles from '../styles/Profile.module.css';

const ProfileMobile = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const isOwnProfile = !userId;
    
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (isOwnProfile) {
                    const userData = await getMe();
                    setUser(userData);
                } else {
                    const pData = await getPublicProfile(userId);
                    setUser(pData.user);
                }
            } catch (error) {
                console.error('Failed to load profile:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [userId, isOwnProfile]);

    if (loading) return <div className={styles['loading-container']}>Cargando...</div>;

    return (
        <div className={styles['mobile-container']}>
            
            {/* Header */}
            <header className={styles['mobile-header']}>
                {isOwnProfile ? (
                    <img src={fsLogo} alt="Logo" className={styles['mobile-logo']} />
                ) : (
                    <button onClick={() => navigate(-1)} className={styles['mobile-back-btn']}>VOLVER</button>
                )}
                <h3 className={styles['mobile-header-title']}>
                    {isOwnProfile ? 'MI PERFIL' : 'PERFIL'}
                </h3>
                {isOwnProfile ? (
                    <button onClick={() => {
                        document.cookie = "jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                        window.location.href = "/login";
                    }} className={styles['mobile-logout-btn']}>SALIR</button>
                ) : <div className={styles['mobile-header-spacer']} />}
            </header>

            <main className={styles['mobile-main']}>
                
                {/* User Info */}
                <div className={styles['mobile-user-info']}>
                    <div className={styles['mobile-avatar']}>
                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <h2 className={styles['mobile-user-name']}>{user?.username}</h2>
                    <p className={styles['mobile-user-meta']}>Miembro desde {new Date(user?.created_at).toLocaleDateString()}</p>
                    <div style={{ marginTop: '2rem', padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.5rem' }}>ID DE USUARIO</p>
                        <p style={{ color: 'var(--accent-neon)', fontSize: '1.2rem', fontWeight: '900' }}>#{user?.id}</p>
                    </div>
                </div>

            </main>

            {/* Bottom Navigation */}
            {isOwnProfile && (
                <nav className={styles['mobile-bottom-nav']}>
                    <Link to="/home" className={styles['mobile-nav-link']}>
                        <span className={styles['mobile-nav-text']}>Inicio</span>
                    </Link>
                    <Link to="/portfolio" className={styles['mobile-nav-link']}>
                        <span className={styles['mobile-nav-text']}>Portfolio</span>
                    </Link>
                    <Link to="/market" className={styles['mobile-nav-link']}>
                        <span className={styles['mobile-nav-text']}>Mercado</span>
                    </Link>
                    <Link to="/profile" className={`${styles['mobile-nav-link']} ${styles['mobile-nav-link-active']}`}>
                        <div className={styles['mobile-nav-link-active-bar']}></div>
                        <div className={styles['mobile-nav-avatar']}>
                            {user?.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                    </Link>
                </nav>
            )}
        </div>
    );
};

export default ProfileMobile;
