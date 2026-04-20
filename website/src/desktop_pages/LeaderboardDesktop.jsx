import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/LeaderboardDesktop.module.css';
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

            <main className={styles.mainContent}>
                <header className={styles.header}>
                    <h1 className={styles.title}>Leaderboard</h1>
                    <p className={styles.subtitle}>Top usuarios por valor de portafolio</p>
                </header>

                <div className={`glass-panel ${styles.tableContainer}`}>
                    {loading ? (
                        <div className={styles.loading}>Cargando leaderboard...</div>
                    ) : error ? (
                        <div className={styles.error}>{error}</div>
                    ) : (
                        <table className={styles.table}>
                            <thead>
                                <tr className={styles.tableHeadRow}>
                                    <th className={styles.tableHeaderCell}>Rango</th>
                                    <th className={styles.tableHeaderCell}>Usuario</th>
                                    <th className={styles.tableHeaderCell}>Portfolio Value</th>
                                    <th className={styles.tableHeaderCell}>24h Change</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user, index) => (
                                    <tr
                                        key={user.id}
                                        onClick={() => navigate(`/profile/${user.id}`)}
                                        className={styles.tableRow}
                                    >
                                        <td className={`${styles.tableCell} ${styles.rankCell} ${index < 3 ? styles.rankTop : ''}`}>
                                            #{index + 1}
                                        </td>
                                        <td className={styles.tableCell}>
                                            <div className={styles.userCellContent}>
                                                <div className={styles.userAvatar}>
                                                    {user.username.charAt(0).toUpperCase()}
                                                </div>
                                                <p className={styles.userName}>{user.username}</p>
                                            </div>
                                        </td>
                                        <td className={`${styles.tableCell} ${styles.valueCell}`}>
                                            {Number(user.portfolio_value).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                        </td>
                                        <td className={`${styles.tableCell} ${styles.changeCell} ${user.change24h >= 0 ? styles.changePositive : styles.changeNegative}`}>
                                            {user.change24h > 0 ? '+' : ''}{Number(user.change24h).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className={styles.noData}>
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
