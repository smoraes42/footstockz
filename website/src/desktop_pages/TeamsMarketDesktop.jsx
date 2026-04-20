import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { getMe, getTeamMarket, teamMarketBuy } from '../services/api';
import { useSocket } from '../context/SocketContext';
import styles from '../styles/TeamsMarketDesktop.module.css';

const TeamsMarketDesktop = ({ searchTerm = '', selectedLeague = null }) => {
    const navigate = useNavigate();
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const { socket } = useSocket();

    const fetchTeams = async () => {
        try {
            setLoading(true);
            const data = await getTeamMarket(searchTerm, selectedLeague?.id);
            setTeams(data);
        } catch (error) {
            console.error('Failed to fetch teams market:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeams();
    }, [searchTerm, selectedLeague]);

    useEffect(() => {
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
        <div className={styles.grid}>
            {loading ? (
                <p className={styles.loading}>Cargando mercado de equipos...</p>
            ) : (
                teams.map(team => (
                    <div
                        key={team.id}
                        onClick={() => navigate(`/market/team/${team.id}`)}
                        className={styles.card}
                    >
                        <div className={styles.header}>
                            <div className={styles.teamInfo}>
                                <h3 className={styles.teamName}>{team.name}</h3>
                                <p className={styles.teamMeta}>{team.league} • {team.playerCount} Jugadores</p>
                            </div>
                            <div className={styles.priceInfo}>
                                <p className={styles.price}>{team.price.toFixed(2)}€</p>
                                <p className={`${styles.change} ${team.change >= 0 ? styles.changePositive : styles.changeNegative}`}>
                                    {team.change >= 0 ? '+' : ''}{team.change}%
                                </p>
                            </div>
                        </div>

                        <div className={styles.chartContainer}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={[10, 12, 11, 14, 13, 16].map(v => ({ value: v }))}>
                                    <Line type="monotone" dataKey="value" stroke="var(--accent-neon)" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <button className={styles.actionBtn}>
                            Ver Detalles / Invertir
                        </button>
                    </div>
                ))
            )}
        </div>
    );
};

export default TeamsMarketDesktop;
