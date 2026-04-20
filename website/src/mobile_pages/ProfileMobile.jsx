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

    if (loading) return <div className={styles['loading-container']}>Cargando...</div>;

    const totalValue = isOwnProfile 
        ? ((portfolio?.walletBalance || 0) + (portfolio?.holdings?.reduce((acc, h) => acc + h.position_value, 0) || 0))
        : (publicData?.totalHoldingsValue || 0);

    const holdings = isOwnProfile ? (portfolio?.holdings || []) : (publicData?.holdings || []);

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
                </div>

                {/* Capital Breakdown */}
                <div className={`${styles['mobile-capital-card']} glass-panel`}>
                    <span className={styles['mobile-capital-label']}>Valor Total</span>
                    <p className={styles['mobile-capital-value']}>€{totalValue.toFixed(2)}</p>
                    
                    {isOwnProfile && (
                        <div className={styles['mobile-capital-breakdown']}>
                            <div>
                                <p className={styles['mobile-breakdown-item-label']}>CASH</p>
                                <p className={styles['mobile-breakdown-item-value']}>€{portfolio?.walletBalance?.toFixed(2)}</p>
                            </div>
                            <div>
                                <p className={styles['mobile-breakdown-item-label']}>ACCIONES</p>
                                <p className={styles['mobile-breakdown-item-value']}>€{(totalValue - portfolio?.walletBalance).toFixed(2)}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Holdings Section (Simplified) */}
                <div className={styles['mobile-holdings-section']}>
                    <h3 className={styles['mobile-holdings-title']}>Portafolio</h3>
                    {holdings.length === 0 ? (
                        <p className={styles['mobile-no-holdings']}>No hay acciones en cartera.</p>
                    ) : (
                        <div className={styles['mobile-holdings-list']}>
                            {holdings.map((h, i) => (
                                <Link 
                                    to={`/market/player/${h.player_id}`}
                                    key={i} 
                                    className={`${styles['mobile-holding-card']} glass-panel`} 
                                >
                                    <div>
                                        <p className={styles['mobile-holding-name']}>{h.player_name}</p>
                                        <p className={styles['mobile-holding-shares']}>{h.shares_owned.toFixed(2)} acciones</p>
                                    </div>
                                    <div className={styles['mobile-holding-value-box']}>
                                        <p className={styles['mobile-holding-value']}>€{h.position_value.toFixed(2)}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
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
