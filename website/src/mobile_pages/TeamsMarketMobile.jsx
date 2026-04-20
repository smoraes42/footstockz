import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTeamMarket } from '../services/api';
import { PlayerPrice, PlayerChange } from '../components/PriceDisplay';
import styles from '../styles/Market.module.css';

const TeamsMarketMobile = ({ searchTerm = '', selectedLeague = null }) => {
    const navigate = useNavigate();
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);

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

    return (
        <div className={styles['mobile-teams-list']}>
            {loading ? (
                <div className={styles.loading}>Cargando equipos...</div>
            ) : (
                teams.map(team => (
                    <div 
                        key={team.id}
                        onClick={() => navigate(`/market/team/${team.id}`)}
                        className={`${styles['mobile-team-card']} glass-panel`}
                    >
                        <div className={styles['mobile-team-header']}>
                            <div>
                                <h3 className={styles['mobile-team-name']}>{team.name}</h3>
                                <p className={styles['mobile-team-meta']}>{team.league} • {team.playerCount} Jugadores</p>
                            </div>
                            <div className={styles['mobile-team-value-box']}>
                                <p className={styles['mobile-team-price']}>
                                    <PlayerPrice price={team.price} />
                                </p>
                                <p className={styles['mobile-team-change']}>
                                    <PlayerChange change={team.change} indicatorType="sign" />
                                </p>
                            </div>
                        </div>

                        <button className={styles['mobile-team-action-btn']}>
                            Ver Detalles / Invertir
                        </button>
                    </div>
                ))
            )}
        </div>
    );
};

export default TeamsMarketMobile;
