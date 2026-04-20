import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import fsLogo from '../assets/fs-logo.png';
import { getMe, getLeaderboard } from '../services/api';
import { useSocket } from '../context/SocketContext';
import styles from '../styles/Leaderboard.module.css';

const LeaderboardMobile = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const { socket, connected } = useSocket();

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

    // Debounced WebSocket refresh (same as desktop)
    useEffect(() => {
        if (!socket || !connected) return;

        let debounceTimer;
        const handlePriceUpdate = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => {
                try {
                    const data = await getLeaderboard();
                    setUsers(data);
                } catch (err) { console.error(err); }
            }, 3000);
        };

        socket.on('price_update', handlePriceUpdate);

        return () => {
            clearTimeout(debounceTimer);
            socket.off('price_update', handlePriceUpdate);
        };
    }, [socket, connected]);

    return (
        <div className={styles['mobile-container']}>

            {/* Top Header */}
            <header className={styles['mobile-header']}>
                <img src={fsLogo} alt="Futstocks Logo" className={styles['mobile-logo']} />
                <div className={styles['mobile-nav-spacer']} />
            </header>

            <main className={styles['mobile-main']}>
                <header className={styles['mobile-section-header']}>
                    <h2 className={styles['mobile-section-title']}>Leaderboard</h2>
                    <p className={styles['mobile-section-subtitle']}>Top usuarios por valor de portfolio</p>
                </header>

                <div className={styles['mobile-user-list']}>
                    {loading ? (
                        <div className={styles.loading}>Cargando ranking...</div>
                    ) : error ? (
                        <div className={styles.error}>{error}</div>
                    ) : (
                        users.map((item, index) => (
                            <Link
                                to={`/profile/${item.id}`}
                                key={item.id}
                                className={`${styles['mobile-user-card']} ${item.id === user?.id ? styles['mobile-user-card-active'] : ''} glass-panel`}
                            >
                                <div className={styles['mobile-user-info']}>
                                    <div className={`${styles['mobile-user-rank']} ${index < 3 ? styles['mobile-rank-top'] : styles['mobile-rank-normal']}`}>
                                        #{index + 1}
                                    </div>
                                    <div className={styles['mobile-user-avatar']}>
                                        {item.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className={styles['mobile-user-name']}>{item.username}</p>
                                        <p className={`${styles['mobile-user-change']} ${item.change24h >= 0 ? styles['mobile-change-positive'] : styles['mobile-change-negative']}`}>
                                            {item.change24h > 0 ? '+' : ''}{Number(item.change24h).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                                        </p>
                                    </div>
                                </div>

                                <div className={styles['mobile-user-value-box']}>
                                    <p className={styles['mobile-user-value']}>{Number(item.portfolio_value).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </main>

            {/* Bottom Navigation */}
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
                <div
                    onClick={() => window.location.href = '/profile'}
                    className={`${styles['mobile-nav-link']} ${styles['mobile-nav-link-active']}`}
                >
                    <div className={styles['mobile-nav-link-active-bar']}></div>
                    <div className={styles['mobile-nav-avatar']}>
                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                </div>
            </nav>
        </div>
    );
};

export default LeaderboardMobile;
