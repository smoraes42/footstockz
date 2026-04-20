import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { getMe, getTeamMarket, teamMarketBuy } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { PlayerPrice, PlayerChange } from '../components/PriceDisplay';
import styles from '../styles/TeamsMarket.module.css';

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
                            <div className={styles['team-info']}>
                                <h3 className={styles['team-name']}>{team.name}</h3>
                                <p className={styles['team-meta']}>{team.league} • {team.playerCount} Jugadores</p>
                            </div>
                            <div className={styles['price-info']}>
                                <p className={styles.price}>
                                    <PlayerPrice price={team.price} />
                                </p>
                                <p className={styles.change}>
                                    <PlayerChange change={team.change} indicatorType="sign" />
                                </p>
                            </div>
                        </div>

                        <div className={styles['chart-container']}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={[10, 12, 11, 14, 13, 16].map(v => ({ value: v }))}>
                                    <Line type="monotone" dataKey="value" stroke="var(--accent-neon)" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <button className={styles['action-btn']}>
                            Ver Detalles / Invertir
                        </button>
                    </div>
                ))
            )}
        </div>
    );
};

export default TeamsMarketDesktop;
