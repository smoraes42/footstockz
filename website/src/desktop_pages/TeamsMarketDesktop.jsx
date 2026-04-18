import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { getMe, getTeamMarket, teamMarketBuy } from '../services/api';
import { useSocket } from '../context/SocketContext';

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
            {loading ? (
                <p>Cargando mercado de equipos...</p>
            ) : (
                teams.map(team => (
                    <div 
                        key={team.id}
                        onClick={() => navigate(`/market/team/${team.id}`)}
                        style={{ 
                            backgroundColor: 'var(--surface-dark)', 
                            borderRadius: '16px', 
                            padding: '1.5rem',
                            border: '1px solid rgba(255,255,255,0.05)',
                            transition: 'transform 0.2s',
                            cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>{team.name}</h3>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{team.league} • {team.playerCount} Jugadores</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-main)' }}>{team.price.toFixed(2)}€</p>
                                <p style={{ 
                                    margin: 0, 
                                    fontSize: '0.8rem', 
                                    fontWeight: '700', 
                                    color: team.change >= 0 ? 'var(--accent-neon)' : '#ff4d4d' 
                                }}>
                                    {team.change >= 0 ? '+' : ''}{team.change}%
                                </p>
                            </div>
                        </div>

                        <div style={{ height: '60px', marginBottom: '1.5rem', opacity: 0.5 }}>
                            {/* Simple placeholder for sparkline */}
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={[10, 12, 11, 14, 13, 16]}>
                                    <Line type="monotone" dataKey="value" stroke="var(--accent-neon)" strokeWidth={2} dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <button 
                            style={{ 
                                width: '100%', 
                                padding: '10px', 
                                borderRadius: '8px', 
                                border: 'none', 
                                backgroundColor: 'var(--accent-neon)', 
                                color: '#000', 
                                fontWeight: '800', 
                                cursor: 'pointer' 
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

export default TeamsMarketDesktop;
