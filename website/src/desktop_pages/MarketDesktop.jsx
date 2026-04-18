import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { getPlayers, getLeagues } from '../services/api';
import fsLogo from '../assets/fs-logo.png';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import TeamsMarketDesktop from './TeamsMarketDesktop';




const MarketDesktop = () => {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [players, setPlayers] = useState([]);
    const [loadingPlayers, setLoadingPlayers] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [fetchingMore, setFetchingMore] = useState(false);
    const [leagues, setLeagues] = useState([]);
    const [selectedLeague, setSelectedLeague] = useState({ id: 140, name: 'La Liga' });
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [isLeagueDropdownOpen, setIsLeagueDropdownOpen] = useState(false);
    const [isTeamDropdownOpen, setIsTeamDropdownOpen] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'default' }); // { key: 'price' | 'change', direction: 'default' | 'asc' | 'desc' }
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'
    const [updatedPlayerId, setUpdatedPlayerId] = useState(null);
    const [marketType, setMarketType] = useState('players'); // 'players' | 'teams'

    const { socket, connected } = useSocket();
    const { user } = useAuth();


    const fetchPlayers = async (pageToFetch = 1, currentLeagueId = selectedLeague?.id, currentTeamId = selectedTeam?.id) => {
        try {
            setLoadingPlayers(true);

            const params = {
                page: pageToFetch,
                limit: 50,
                search: searchTerm,
                league_id: currentLeagueId || '',
                team_id: currentTeamId || '',
                sort_by: sortConfig.key || '',
                sort_dir: sortConfig.direction !== 'default' ? sortConfig.direction : ''
            };

            const response = await getPlayers(params);
            const data = response.data || [];

            if (response.pagination) {
                setTotalPages(response.pagination.totalPages || 1);
            }

            const playersWithPrices = data.map(p => {
                const priceNum = parseFloat(p.price) || 0;
                const changeNum = parseFloat(p.change || 0);

                // Flat sparkline using the actual price until history API is implemented for all players
                const sparkline = [priceNum, priceNum, priceNum, priceNum, priceNum];

                return { ...p, price: priceNum, change: changeNum, sparkline };
            });

            setPlayers(playersWithPrices);
        } catch (error) {
            console.error('Failed to load players:', error);
        } finally {
            setLoadingPlayers(false);
        }
    };

    // Fetch leagues on mount
    useEffect(() => {
        const fetchLeaguesData = async () => {
            try {
                const data = await getLeagues();
                setLeagues(data);
                // Ensure La Liga is selected if found in the list, though we default above
                const laLiga = data.find(l => l.id === 140);
                if (laLiga) setSelectedLeague(laLiga);
            } catch (error) {
                console.error('Failed to load leagues:', error);
            }
        };
        fetchLeaguesData();
    }, []);



    // Re-fetch when filters change (debounce search slightly)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setCurrentPage(1); // Reset to page 1 when filters change
            fetchPlayers(1, selectedLeague?.id, selectedTeam?.id);
        }, 300); // 300ms debounce

        return () => clearTimeout(timeoutId);
    }, [searchTerm, selectedLeague, selectedTeam, sortConfig]);

    // WebSocket Listeners for real-time price updates in the list
    useEffect(() => {
        if (!socket || !connected) return;
    
        const handlePriceUpdate = (data) => {
            // Visual feedback: briefly highlight the updated player
            setUpdatedPlayerId(data.playerId);
            setTimeout(() => setUpdatedPlayerId(null), 1000);
    
            setPlayers(prev => {
                const updatedPlayers = prev.map(p => {
                    if (p.id === data.playerId) {
                        const priceNum = data.price;
                        const changeNum = parseFloat(data.change || 0);
                        const newSparkline = [...p.sparkline.slice(1), priceNum];
                        return { ...p, price: priceNum, change: changeNum, sparkline: newSparkline };
                    }
                    return p;
                });
    
                // Live Re-sorting if an active sort is present
                if (sortConfig.key && sortConfig.direction !== 'default') {
                    updatedPlayers.sort((a, b) => {
                        let valA = a[sortConfig.key];
                        let valB = b[sortConfig.key];
    
                        if (sortConfig.key === 'name') {
                            valA = (valA || '').toString().toLowerCase();
                            valB = (valB || '').toString().toLowerCase();
                        } else {
                            valA = parseFloat(valA || 0);
                            valB = parseFloat(valB || 0);
                        }
    
                        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                        return 0;
                    });
                }
                return updatedPlayers;
            });
        };
    
        socket.on('price_update', handlePriceUpdate);
    
        return () => {
            socket.off('price_update', handlePriceUpdate);
        };
    }, [socket, connected, sortConfig]);


    const handleSelectLeague = (league) => {
        if (selectedLeague?.id !== league?.id) {
            setSelectedLeague(league);
            setSelectedTeam(null); // Reset team when league changes
        }
        setIsLeagueDropdownOpen(false);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            const prevPage = currentPage - 1;
            setCurrentPage(prevPage);
            fetchPlayers(prevPage);
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            const nextPage = currentPage + 1;
            setCurrentPage(nextPage);
            fetchPlayers(nextPage);
        }
    };

    const handleSelectTeam = (team) => {
        setSelectedTeam(team);
        setIsTeamDropdownOpen(false);
    };

    const handleSortToggle = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        } else if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'default';
        }
        setSortConfig({ key, direction });
    };

    // Sorting and filtering is handled by backend
    let filteredPlayers = players;

    return (
        <div style={{ backgroundColor: 'var(--bg-main)', height: '100vh', width: '100%', display: 'flex' }}>

            {/* Sidebar (Similar to Home) */}
            <aside style={{
                width: '250px',
                backgroundColor: 'rgba(28,28,28,0.7)',
                borderRight: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                flexDirection: 'column',
                padding: '2rem 1.5rem',
                position: 'fixed',
                height: '100vh',
                top: 0,
                left: 0
            }}>
                <div style={{ marginBottom: '3rem', paddingLeft: '0.5rem' }}>
                    <img src={fsLogo} alt="Futstocks Logo" style={{ height: '32px' }} />
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                    <Link to="/home" className="sidebar-link" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '12px 16px', borderRadius: '8px', color: 'var(--text-muted)', textDecoration: 'none', transition: 'all 0.2s' }}>
                        <span style={{ fontWeight: '500' }}>Inicio</span>
                    </Link>
                    <Link to="/portfolio" className="sidebar-link" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '12px 16px', borderRadius: '8px', color: 'var(--text-muted)', textDecoration: 'none', transition: 'all 0.2s' }}>
                        <span style={{ fontWeight: '500' }}>Portfolio</span>
                    </Link>
                    <Link to="/market" className="sidebar-link active" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '12px 16px', borderRadius: '8px', color: 'var(--text-main)', textDecoration: 'none', backgroundColor: 'rgba(57,255,20,0.1)', borderLeft: '3px solid var(--accent-neon)' }}>
                        <span style={{ fontWeight: '600' }}>Mercado</span>
                    </Link>
                    <Link to="/leaderboard" className="sidebar-link" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '12px 16px', borderRadius: '8px', color: 'var(--text-muted)', textDecoration: 'none', transition: 'all 0.2s' }}>
                        <span style={{ fontWeight: '500' }}>Leaderboard</span>
                    </Link>
                </nav>

                <div
                    onClick={() => navigate('/profile')}
                    style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--surface-lighter)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>
                            {user?.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                            <p style={{ fontSize: '0.9rem', fontWeight: '600', margin: 0 }}>{user?.username || 'Usuario'}</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Ver perfil</p>
                        </div>
                    </div>
                </div>
            </aside>

            <main style={{ marginLeft: '250px', marginRight: '250px', flex: 1, padding: '2rem 3rem', overflowY: 'auto', height: '100vh', position: 'relative' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                        <h1 
                            onClick={() => setMarketType('players')}
                            style={{ 
                                fontSize: '1.3rem', 
                                fontWeight: '800', 
                                color: marketType === 'players' ? 'var(--accent-neon)' : 'rgba(255,255,255,0.3)', 
                                textTransform: 'uppercase', 
                                letterSpacing: '1px', 
                                margin: 0,
                                cursor: 'pointer'
                            }}
                        >
                            Jugadores
                        </h1>
                        <h1 
                            onClick={() => setMarketType('teams')}
                            style={{ 
                                fontSize: '1.3rem', 
                                fontWeight: '800', 
                                color: marketType === 'teams' ? 'var(--accent-neon)' : 'rgba(255,255,255,0.3)', 
                                textTransform: 'uppercase', 
                                letterSpacing: '1px', 
                                margin: 0,
                                cursor: 'pointer'
                            }}
                        >
                            Equipos
                        </h1>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        {/* View Mode Toggle */}
                        <div style={{ display: 'flex', backgroundColor: 'var(--surface-dark)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <button
                                onClick={() => setViewMode('list')}
                                style={{
                                    padding: '6px 12px',
                                    border: 'none',
                                    background: viewMode === 'list' ? 'var(--bg-main)' : 'transparent',
                                    color: viewMode === 'list' ? 'var(--text-main)' : 'var(--text-muted)',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    transition: 'all 0.2s'
                                }}
                            >
                                ≡ Lista
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                style={{
                                    padding: '6px 12px',
                                    border: 'none',
                                    background: viewMode === 'grid' ? 'var(--bg-main)' : 'transparent',
                                    color: viewMode === 'grid' ? 'var(--text-main)' : 'var(--text-muted)',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    transition: 'all 0.2s'
                                }}
                            >
                                ⊞ Grid
                            </button>
                        </div>

                        <div style={{ position: 'relative', width: '300px' }}>
                            <input
                                type="text"
                                placeholder="Buscar jugador..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '12px 20px',
                                    backgroundColor: 'var(--surface-dark)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '12px',
                                    color: 'white',
                                    outline: 'none',
                                    fontSize: '0.9rem'
                                }}
                            />
                        </div>
                    </div>
                </header>

                {marketType === 'teams' ? (
                    <TeamsMarketDesktop searchTerm={searchTerm} selectedLeague={selectedLeague} />
                ) : (
                    <div className={viewMode === 'list' ? "glass-panel" : ""} style={{ borderRadius: '16px', overflow: 'hidden', minHeight: '400px' }}>

                    {loadingPlayers ? (
                        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando jugadores del mercado...</div>
                    ) : (
                        viewMode === 'list' ? (
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                        <th
                                            style={{ padding: '1.5rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}
                                            onClick={() => handleSortToggle('name')}
                                        >
                                            Jugador {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : sortConfig.direction === 'desc' ? '↓' : '↕') : '↕'}
                                        </th>
                                        <th
                                            style={{ padding: '1.5rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}
                                            onClick={() => handleSortToggle('price')}
                                        >
                                            Precio {sortConfig.key === 'price' ? (sortConfig.direction === 'asc' ? '↑' : sortConfig.direction === 'desc' ? '↓' : '↕') : '↕'}
                                        </th>
                                        <th
                                            style={{ padding: '1.5rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase', cursor: 'pointer', userSelect: 'none' }}
                                            onClick={() => handleSortToggle('change')}
                                        >
                                            24h % {sortConfig.key === 'change' ? (sortConfig.direction === 'asc' ? '↑' : sortConfig.direction === 'desc' ? '↓' : '↕') : '↕'}
                                        </th>
                                        <th style={{ padding: '1.5rem', color: 'var(--text-muted)', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase' }}>Evolución</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPlayers.map(player => (
                                        <tr
                                            key={player.id}
                                            style={{ 
                                                borderBottom: '1px solid rgba(255,255,255,0.05)', 
                                                transition: 'background 0.3s ease', 
                                                cursor: 'pointer',
                                                backgroundColor: updatedPlayerId === player.id ? 'rgba(57,255,20,0.15)' : 'transparent'
                                            }}
                                            className="market-row"
                                            onClick={() => navigate(`/market/player/${player.id}`)}
                                        >
                                            <td style={{ padding: '1.2rem 1.5rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    {/* Using the image endpoint wrapper directly for UI display */}
                                                    <img
                                                        src={`${import.meta.env.VITE_API_URL}/api/v1/players/${player.id}/image`}
                                                        alt={player.name}
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            e.target.nextSibling.style.display = 'flex';
                                                        }}
                                                        style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }}
                                                    />
                                                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: 'var(--surface-lighter)', display: 'none', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem' }}>
                                                        👤
                                                    </div>
                                                    <div>
                                                        <p style={{ fontWeight: '700', fontSize: '1rem', margin: 0 }}>{player.name}</p>
                                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{player.team}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '1.2rem 1.5rem', fontWeight: '800', fontSize: '1.1rem' }}>
                                                {Number(player.price).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                            </td>
                                            <td style={{ padding: '1.2rem 1.5rem', fontWeight: '700', color: player.change >= 0 ? 'var(--accent-neon)' : 'var(--error-red)' }}>
                                                {player.change >= 0 ? '+' : ''}{Number(player.change).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                                            </td>
                                            <td style={{ padding: '1.2rem 1.5rem', width: '120px' }}>
                                                <div style={{ height: '40px', width: '100%' }}>
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <LineChart data={player.sparkline.map((v, i) => ({ v, i }))}>
                                                            <Line
                                                                type="monotone"
                                                                dataKey="v"
                                                                stroke={player.change >= 0 ? 'var(--accent-neon)' : 'var(--error-red)'}
                                                                strokeWidth={2}
                                                                dot={false}
                                                            />
                                                        </LineChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <button
                                        onClick={() => handleSortToggle('name')}
                                        style={{ background: 'var(--surface-dark)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-main)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                    >
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Ordenar: </span>
                                        Nombre {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : sortConfig.direction === 'desc' ? '↓' : '↕') : '↕'}
                                    </button>
                                    <button
                                        onClick={() => handleSortToggle('price')}
                                        style={{ background: 'var(--surface-dark)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-main)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                    >
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Ordenar:</span>
                                        Precio {sortConfig.key === 'price' ? (sortConfig.direction === 'asc' ? '↑' : sortConfig.direction === 'desc' ? '↓' : '↕') : '↕'}
                                    </button>
                                    <button
                                        onClick={() => handleSortToggle('change')}
                                        style={{ background: 'var(--surface-dark)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-main)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                    >
                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase' }}>Ordenar:</span>
                                        24h % {sortConfig.key === 'change' ? (sortConfig.direction === 'asc' ? '↑' : sortConfig.direction === 'desc' ? '↓' : '↕') : '↕'}
                                    </button>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                                    {filteredPlayers.map(player => (
                                        <div
                                            key={player.id}
                                            className="glass-panel"
                                            style={{
                                                borderRadius: '16px',
                                                padding: '1.5rem',
                                                cursor: 'pointer',
                                                transition: 'transform 0.2s, background-color 0.3s ease',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                backgroundColor: updatedPlayerId === player.id ? 'rgba(57,255,20,0.15)' : 'var(--surface-dark)',
                                                border: updatedPlayerId === player.id ? '1px solid var(--accent-neon)' : '1px solid rgba(255,255,255,0.1)'
                                            }}
                                            onClick={() => navigate(`/market/player/${player.id}`)}
                                            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; if(updatedPlayerId !== player.id) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; if(updatedPlayerId !== player.id) e.currentTarget.style.backgroundColor = 'var(--surface-dark)'; }}
                                        >
                                            <div style={{ position: 'relative', width: '100px', height: '100px', marginBottom: '1rem' }}>
                                                <img
                                                    src={`${import.meta.env.VITE_API_URL}/api/v1/players/${player.id}/image`}
                                                    alt={player.name}
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'flex';
                                                    }}
                                                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--surface-lighter)' }}
                                                />
                                                <div style={{ width: '100%', height: '100%', borderRadius: '50%', backgroundColor: 'var(--surface-lighter)', display: 'none', justifyContent: 'center', alignItems: 'center', fontSize: '3rem', border: '3px solid var(--surface-light)' }}>
                                                    👤
                                                </div>
                                            </div>

                                            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.2rem', fontWeight: '800', textAlign: 'center' }}>{player.name}</h3>
                                            <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>{player.team}</p>

                                            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
                                                <div>
                                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Precio</p>
                                                    <p style={{ margin: 0, fontSize: '1.3rem', fontWeight: '900' }}>{Number(player.price).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>24h</p>
                                                    <p style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: player.change >= 0 ? 'var(--accent-neon)' : 'var(--error-red)' }}>
                                                        {player.change >= 0 ? '+' : ''}{Number(player.change).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    )}

                    {!loadingPlayers && totalPages > 1 && (
                        <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
                            <button
                                onClick={handlePrevPage}
                                disabled={currentPage === 1}
                                style={{
                                    padding: '10px 24px',
                                    backgroundColor: currentPage === 1 ? 'rgba(255,255,255,0.05)' : 'rgba(57,255,20,0.1)',
                                    color: currentPage === 1 ? 'var(--text-muted)' : 'var(--accent-neon)',
                                    border: `1px solid ${currentPage === 1 ? 'rgba(255,255,255,0.1)' : 'rgba(57,255,20,0.3)'}`,
                                    borderRadius: '8px',
                                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                                    fontWeight: 'bold',
                                    transition: 'all 0.2s'
                                }}
                            >
                                ← Anterior
                            </button>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>
                                Pág. {currentPage} de {totalPages}
                            </span>
                            <button
                                onClick={handleNextPage}
                                disabled={currentPage === totalPages}
                                style={{
                                    padding: '10px 24px',
                                    backgroundColor: currentPage === totalPages ? 'rgba(255,255,255,0.05)' : 'rgba(57,255,20,0.1)',
                                    color: currentPage === totalPages ? 'var(--text-muted)' : 'var(--accent-neon)',
                                    border: `1px solid ${currentPage === totalPages ? 'rgba(255,255,255,0.1)' : 'rgba(57,255,20,0.3)'}`,
                                    borderRadius: '8px',
                                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                                    fontWeight: 'bold',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Siguiente →
                            </button>
                        </div>
                     )}
                    </div>
                )}

            </main>

            {/* Right Sidebar (Leagues and Teams Menu) */}
            <aside style={{
                width: '250px',
                backgroundColor: 'rgba(28,28,28,0.7)',
                borderLeft: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                flexDirection: 'column',
                padding: '2rem 1.5rem',
                position: 'fixed',
                height: '100vh',
                top: 0,
                right: 0,
                overflowY: 'auto'
            }}>
                <div style={{ marginBottom: '2rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-main)' }}>Filtros</h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* League Selector */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>Competición</label>
                        <button
                            onClick={() => setIsLeagueDropdownOpen(!isLeagueDropdownOpen)}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '12px 16px',
                                backgroundColor: 'var(--surface-dark)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '0.95rem',
                                transition: 'all 0.2s'
                            }}
                        >
                            <span>{selectedLeague ? selectedLeague.name : 'Todas las competiciones'}</span>
                            <span style={{ fontSize: '0.8rem', transform: isLeagueDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                        </button>

                        {isLeagueDropdownOpen && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                marginTop: '4px',
                                backgroundColor: 'var(--surface-dark)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                zIndex: 10,
                                maxHeight: '200px',
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                padding: '0.5rem'
                            }}>
                                <button
                                    onClick={() => handleSelectLeague(null)}
                                    style={{
                                        textAlign: 'left',
                                        padding: '8px 12px',
                                        backgroundColor: !selectedLeague ? 'rgba(57,255,20,0.1)' : 'transparent',
                                        border: 'none',
                                        color: !selectedLeague ? 'var(--accent-neon)' : 'white',
                                        cursor: 'pointer',
                                        borderRadius: '6px',
                                        fontSize: '0.9rem',
                                        transition: 'all 0.2s'
                                    }}
                                    className="dropdown-item"
                                >
                                    Todas las competiciones
                                </button>
                                {leagues.map(league => (
                                    <button
                                        key={league.id}
                                        onClick={() => handleSelectLeague(league)}
                                        style={{
                                            textAlign: 'left',
                                            padding: '8px 12px',
                                            backgroundColor: selectedLeague?.id === league.id ? 'rgba(57,255,20,0.1)' : 'transparent',
                                            border: 'none',
                                            color: selectedLeague?.id === league.id ? 'var(--accent-neon)' : 'white',
                                            cursor: 'pointer',
                                            borderRadius: '6px',
                                            fontSize: '0.9rem',
                                            transition: 'all 0.2s'
                                        }}
                                        className="dropdown-item"
                                    >
                                        {league.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Team Selector */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', position: 'relative' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '600' }}>Equipo</label>
                        <button
                            onClick={() => selectedLeague && setIsTeamDropdownOpen(!isTeamDropdownOpen)}
                            disabled={!selectedLeague}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '12px 16px',
                                backgroundColor: selectedLeague ? 'var(--surface-dark)' : 'rgba(255,255,255,0.02)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: selectedLeague ? 'white' : 'var(--text-muted)',
                                cursor: selectedLeague ? 'pointer' : 'not-allowed',
                                fontSize: '0.95rem',
                                transition: 'all 0.2s',
                                opacity: selectedLeague ? 1 : 0.5
                            }}
                        >
                            <span>
                                {!selectedLeague
                                    ? 'Selecciona competición'
                                    : (selectedTeam ? selectedTeam.name : 'Todos los equipos')}
                            </span>
                            <span style={{ fontSize: '0.8rem', transform: isTeamDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                        </button>

                        {/* Team Options Dropdown */}
                        {isTeamDropdownOpen && selectedLeague && (
                            <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                marginTop: '4px',
                                backgroundColor: 'var(--surface-dark)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                zIndex: 10,
                                maxHeight: '200px',
                                overflowY: 'auto',
                                display: 'flex',
                                flexDirection: 'column',
                                padding: '0.5rem'
                            }}>
                                <button
                                    onClick={() => handleSelectTeam(null)}
                                    style={{
                                        textAlign: 'left',
                                        padding: '8px 12px',
                                        backgroundColor: !selectedTeam ? 'rgba(57,255,20,0.1)' : 'transparent',
                                        border: 'none',
                                        color: !selectedTeam ? 'var(--accent-neon)' : 'white',
                                        cursor: 'pointer',
                                        borderRadius: '6px',
                                        fontSize: '0.9rem',
                                        transition: 'all 0.2s'
                                    }}
                                    className="dropdown-item"
                                >
                                    Todos los equipos
                                </button>
                                {selectedLeague.teams.map(team => (
                                    <button
                                        key={team.id}
                                        onClick={() => handleSelectTeam(team)}
                                        style={{
                                            textAlign: 'left',
                                            padding: '8px 12px',
                                            backgroundColor: selectedTeam?.id === team.id ? 'rgba(57,255,20,0.1)' : 'transparent',
                                            border: 'none',
                                            color: selectedTeam?.id === team.id ? 'var(--accent-neon)' : 'white',
                                            cursor: 'pointer',
                                            borderRadius: '6px',
                                            fontSize: '0.9rem',
                                            transition: 'all 0.2s'
                                        }}
                                        className="dropdown-item"
                                    >
                                        {team.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </aside>

            <style>{`
        .market-row:hover {
          background-color: rgba(255,255,255,0.03);
        }
        .dropdown-item:hover {
          background-color: rgba(255,255,255,0.06) !important;
        }
      `}</style>
        </div>
    );
};

export default MarketDesktop;
