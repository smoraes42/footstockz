import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import fsLogo from '../assets/fs-logo.png';
import { getMe, getLeaderboard } from '../services/api';
import styles from '../styles/Leaderboard.module.css';

const LeaderboardMobile = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const data = await getLeaderboard();
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
        <div className={styles.mobileContainer}>

            {/* Top Header */}
            <header className={styles.mobileHeader}>
                <img src={fsLogo} alt="Futstocks Logo" className={styles.mobileLogo} />
                <div className={styles.mobileNavSpacer} />
            </header>

            <main className={styles.mobileMain}>
                <header className={styles.mobileSectionHeader}>
                    <h2 className={styles.mobileSectionTitle}>Leaderboard</h2>
                    <p className={styles.mobileSectionSubtitle}>Top usuarios por valor de portfolio</p>
                </header>

                <div className={styles.mobileUserList}>
                    {loading ? (
                        <div className={styles.loading}>Cargando ranking...</div>
                    ) : error ? (
                        <div className={styles.error}>{error}</div>
                    ) : (
                        users.map((item, index) => (
                            <Link
                                to={`/profile/${item.id}`}
                                key={item.id}
                                className={`${styles.mobileUserCard} ${item.id === user?.id ? styles.mobileUserCardActive : ''} glass-panel`}
                            >
                                <div className={styles.mobileUserInfo}>
                                    <div className={`${styles.mobileUserRank} ${index < 3 ? styles.mobileRankTop : styles.mobileRankNormal}`}>
                                        #{index + 1}
                                    </div>
                                    <div className={styles.mobileUserAvatar}>
                                        {item.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className={styles.mobileUserName}>{item.username}</p>
                                        <p className={`${styles.mobileUserChange} ${item.change24h >= 0 ? styles.mobileChangePositive : styles.mobileChangeNegative}`}>
                                            {item.change24h > 0 ? '+' : ''}{item.change24h}%
                                        </p>
                                    </div>
                                </div>

                                <div className={styles.mobileUserValueBox}>
                                    <p className={styles.mobileUserValue}>€{Number(item.portfolio_value).toFixed(2)}</p>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </main>

            {/* Bottom Navigation */}
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
                <div
                    onClick={() => window.location.href = '/profile'}
                    className={`${styles.mobileNavLink} ${styles.mobileNavLinkActive}`}
                >
                    <div className={styles.mobileNavLinkActiveBar}></div>
                    <div className={styles.mobileNavAvatar}>
                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                </div>
            </nav>
        </div>
    );
};

export default LeaderboardMobile;
