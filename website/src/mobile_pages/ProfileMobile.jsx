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

    if (loading) return <div className={styles.loadingContainer}>Cargando...</div>;

    const totalValue = isOwnProfile 
        ? ((portfolio?.walletBalance || 0) + (portfolio?.holdings?.reduce((acc, h) => acc + h.position_value, 0) || 0))
        : (publicData?.totalHoldingsValue || 0);

    const holdings = isOwnProfile ? (portfolio?.holdings || []) : (publicData?.holdings || []);

    return (
        <div className={styles.mobileContainer}>
            
            {/* Header */}
            <header className={styles.mobileHeader}>
                {isOwnProfile ? (
                    <img src={fsLogo} alt="Logo" className={styles.mobileLogo} />
                ) : (
                    <button onClick={() => navigate(-1)} className={styles.mobileBackBtn}>VOLVER</button>
                )}
                <h3 className={styles.mobileHeaderTitle}>
                    {isOwnProfile ? 'MI PERFIL' : 'PERFIL'}
                </h3>
                {isOwnProfile ? (
                    <button onClick={() => {
                        document.cookie = "jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                        window.location.href = "/login";
                    }} className={styles.mobileLogoutBtn}>SALIR</button>
                ) : <div className={styles.mobileHeaderSpacer} />}
            </header>

            <main className={styles.mobileMain}>
                
                {/* User Info */}
                <div className={styles.mobileUserInfo}>
                    <div className={styles.mobileAvatar}>
                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <h2 className={styles.mobileUserName}>{user?.username}</h2>
                    <p className={styles.mobileUserMeta}>Miembro desde {new Date(user?.created_at).toLocaleDateString()}</p>
                </div>

                {/* Capital Breakdown */}
                <div className={`${styles.mobileCapitalCard} glass-panel`}>
                    <span className={styles.mobileCapitalLabel}>Valor Total</span>
                    <p className={styles.mobileCapitalValue}>€{totalValue.toFixed(2)}</p>
                    
                    {isOwnProfile && (
                        <div className={styles.mobileCapitalBreakdown}>
                            <div>
                                <p className={styles.mobileBreakdownItemLabel}>CASH</p>
                                <p className={styles.mobileBreakdownItemValue}>€{portfolio?.walletBalance?.toFixed(2)}</p>
                            </div>
                            <div>
                                <p className={styles.mobileBreakdownItemLabel}>ACCIONES</p>
                                <p className={styles.mobileBreakdownItemValue}>€{(totalValue - portfolio?.walletBalance).toFixed(2)}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Holdings Section (Simplified) */}
                <div className={styles.mobileHoldingsSection}>
                    <h3 className={styles.mobileHoldingsTitle}>Portafolio</h3>
                    {holdings.length === 0 ? (
                        <p className={styles.mobileNoHoldings}>No hay acciones en cartera.</p>
                    ) : (
                        <div className={styles.mobileHoldingsList}>
                            {holdings.map((h, i) => (
                                <Link 
                                    to={`/market/player/${h.player_id}`}
                                    key={i} 
                                    className={`${styles.mobileHoldingCard} glass-panel`} 
                                >
                                    <div>
                                        <p className={styles.mobileHoldingName}>{h.player_name}</p>
                                        <p className={styles.mobileHoldingShares}>{h.shares_owned.toFixed(2)} acciones</p>
                                    </div>
                                    <div className={styles.mobileHoldingValueBox}>
                                        <p className={styles.mobileHoldingValue}>€{h.position_value.toFixed(2)}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

            </main>

            {/* Bottom Navigation */}
            {isOwnProfile && (
                <nav className={styles.mobileBottomNav}>
                    <Link to="/home" className={styles.mobileNavLink}>
                        <span className={styles.mobileNavText}>Inicio</span>
                    </Link>
                    <Link to="/portfolio" className={styles.mobileNavLink}>
                        <span className={styles.mobileNavText}>Portfolio</span>
                    </Link>
                    <Link to="/market" className={styles.mobileNavLink}>
                        <span className={styles.mobileNavText}>Mercado</span>
                    </Link>
                    <Link to="/profile" className={`${styles.mobileNavLink} ${styles.mobileNavLinkActive}`}>
                        <div className={styles.mobileNavLinkActiveBar}></div>
                        <div className={styles.mobileNavAvatar}>
                            {user?.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                    </Link>
                </nav>
            )}
        </div>
    );
};

export default ProfileMobile;
