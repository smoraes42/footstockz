import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTeamMarket } from '../services/api';
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
        <div className={styles.mobileTeamsList}>
            {loading ? (
                <div className={styles.loading}>Cargando equipos...</div>
            ) : (
                teams.map(team => (
                    <div 
                        key={team.id}
                        onClick={() => navigate(`/market/team/${team.id}`)}
                        className={`${styles.mobileTeamCard} glass-panel`}
                    >
                        <div className={styles.mobileTeamHeader}>
                            <div>
                                <h3 className={styles.mobileTeamName}>{team.name}</h3>
                                <p className={styles.mobileTeamMeta}>{team.league} • {team.playerCount} Jugadores</p>
                            </div>
                            <div className={styles.mobileTeamValueBox}>
                                <p className={styles.mobileTeamPrice}>{team.price.toFixed(2)}€</p>
                                <p className={`${styles.mobileTeamChange} ${team.change >= 0 ? styles.mobileChangePositive : styles.mobileChangeNegative}`}>
                                    {team.change >= 0 ? '+' : ''}{team.change}%
                                </p>
                            </div>
                        </div>

                        <button className={styles.mobileTeamActionBtn}>
                            Ver Detalles / Invertir
                        </button>
                    </div>
                ))
            )}
        </div>
    );
};

export default TeamsMarketMobile;
