import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTeamMarket } from '../services/api';

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Cargando equipos...</div>
            ) : (
                teams.map(team => (
                    <div 
                        key={team.id}
                        onClick={() => navigate(`/market/team/${team.id}`)}
                        className="glass-panel"
                        style={{ padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800' }}>{team.name}</h3>
                                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{team.league} • {team.playerCount} Jugadores</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: 'var(--text-main)' }}>{team.price.toFixed(2)}€</p>
                                <p style={{ 
                                    margin: 0, 
                                    fontSize: '0.7rem', 
                                    fontWeight: '700', 
                                    color: team.change >= 0 ? 'var(--accent-neon)' : '#ff4d4d' 
                                }}>
                                    {team.change >= 0 ? '+' : ''}{team.change}%
                                </p>
                            </div>
                        </div>

                        <button 
                            style={{ 
                                width: '100%', 
                                padding: '12px', 
                                borderRadius: '10px', 
                                border: 'none', 
                                backgroundColor: 'var(--accent-neon)', 
                                color: '#000', 
                                fontWeight: '800', 
                                fontSize: '0.9rem'
                            }}
                        >
                            Ver Detalles / Invertir
                        </button>
                    </div>
                ))
            )}
        </div>
    );
};

export default TeamsMarketMobile;
