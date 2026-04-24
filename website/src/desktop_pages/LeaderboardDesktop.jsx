import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/Leaderboard.module.css';
import { getLeaderboard } from '../services/api';



export default function LeaderboardDesktop() {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { socket, connected } = useSocket();
    const { user } = useAuth();


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
        <div className={styles.container}>
            <Navbar />

            <main className={styles['main-content']}>
                <header className={styles.header}>
                    <h1 className={styles.title}>Leaderboard</h1>
                    <p className={styles.subtitle}>Ranking de los mejores inversores</p>
                </header>

                <div className={`glass-panel ${styles['table-container']}`}>
                    {loading ? (
                        <div className={styles.loading}>Cargando leaderboard...</div>
                    ) : error ? (
                        <div className={styles.error}>{error}</div>
                    ) : (
                        <table className={styles.table}>
                            <thead>
                                <tr className={styles['table-head-row']}>
                                    <th className={styles['table-header-cell']}>Rango</th>
                                    <th className={styles['table-header-cell']}>Usuario</th>
                                    <th className={styles['table-header-cell']}>24h Change</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user, index) => (
                                    <tr
                                        key={user.id}
                                        onClick={() => navigate(`/profile/${user.id}`)}
                                        className={styles['table-row']}
                                    >
                                        <td className={`${styles['table-cell']} ${styles['rank-cell']} ${index < 3 ? styles['rank-top'] : ''}`}>
                                            #{index + 1}
                                        </td>
                                        <td className={styles['table-cell']}>
                                            <div className={styles['user-cell-content']}>
                                                <div className={styles['user-avatar']}>
                                                    {user.username.charAt(0).toUpperCase()}
                                                </div>
                                                <p className={styles['user-name']}>{user.username}</p>
                                            </div>
                                        </td>
                                        <td className={`${styles['table-cell']} ${styles['change-cell']} ${user.change24h >= 0 ? styles['change-positive'] : styles['change-negative']}`}>
                                            {user.change24h > 0 ? '+' : ''}{Number(user.change24h).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className={styles['no-data']}>
                                            No se encontraron usuarios
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>
        </div>
    );
}
