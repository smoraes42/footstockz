import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getPlayers, getMe, getLeagues, API_URL } from '../services/api';
import fsLogo from '../assets/fs-logo.png';
import { useSocket } from '../context/SocketContext';
import TeamsMarketMobile from './TeamsMarketMobile';


const MarketMobile = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [players, setPlayers] = useState([]);
    const [loadingPlayers, setLoadingPlayers] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [fetchingMore, setFetchingMore] = useState(false);
    const [user, setUser] = useState(null);
    const [showSearch, setShowSearch] = useState(false);
    const [marketType, setMarketType] = useState('players');


    const { socket, connected } = useSocket();

    // Filters and Sorting
    const [leagues, setLeagues] = useState([]);
    const [selectedLeague, setSelectedLeague] = useState({ id: 140, name: 'La Liga' });
    const [selectedTeam, setSelectedTeam] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'default' });

    const fetchPlayers = useCallback(async (pageToFetch = 1) => {
        try {
            if (pageToFetch === 1) setLoadingPlayers(true);
            else setFetchingMore(true);

            const params = {
                page: pageToFetch,
                limit: 50,
                search: searchTerm,
                league_id: selectedLeague?.id || '',
                team_id: selectedTeam?.id || '',
                sort_by: sortConfig.key || '',
                sort_dir: sortConfig.direction !== 'default' ? sortConfig.direction : ''
            };

            const response = await getPlayers(params);
            const data = response.data || [];

            if (response.pagination) {
                setTotalPages(response.pagination.totalPages);
            }

            const playersWithPrices = data.map(p => {
                const priceNum = parseFloat(p.price) || 0;
                const changeNum = parseFloat(p.change || 0);
                return { ...p, price: priceNum, change: changeNum };
            });

            if (pageToFetch === 1) {
                setPlayers(playersWithPrices);
            } else {
                setPlayers(prev => [...prev, ...playersWithPrices]);
            }
        } catch (error) {
            console.error('Failed to load players:', error);
        } finally {
            setLoadingPlayers(false);
            setFetchingMore(false);
        }
    }, [searchTerm, selectedLeague, selectedTeam, sortConfig]);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [leaguesData, userData] = await Promise.all([
                    getLeagues(),
                    getMe()
                ]);
                setLeagues(leaguesData);
                setUser(userData);

                // If La Liga is in the list, set it as default (redundant but safe)
                const laLiga = leaguesData.find(l => l.id === 140);
                if (laLiga) setSelectedLeague(laLiga);
            } catch (err) {
                console.error('Failed to fetch initial data:', err);
            }
        };
        fetchInitialData();
    }, []);

    // WebSocket Listeners for real-time price updates in the list
    useEffect(() => {
        if (!socket || !connected) return;

        const handlePriceUpdate = (data) => {
            setPlayers(prev => prev.map(p => {
                if (p.id === data.playerId) {
                    const priceNum = data.price;
                    const changeNum = parseFloat(data.change || 0);
                    return { ...p, price: priceNum, change: changeNum };
                }
                return p;
            }));
        };

        socket.on('price_update', handlePriceUpdate);

        return () => {
            socket.off('price_update', handlePriceUpdate);
        };
    }, [socket, connected]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setCurrentPage(1);
            fetchPlayers(1);
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [searchTerm, selectedLeague, selectedTeam, sortConfig, fetchPlayers]);

    const handleLoadMore = () => {
        if (currentPage < totalPages && !fetchingMore) {
            const nextPage = currentPage + 1;
            setCurrentPage(nextPage);
            fetchPlayers(nextPage);
        }
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

    return (
        <div style={{ backgroundColor: 'var(--bg-main)', height: '100dvh', overflow: 'hidden', width: '100%', display: 'flex', flexDirection: 'column' }}>

            {/* Top Header Mobile */}
            <header style={{
                padding: '0 1.5rem',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                backgroundColor: 'rgba(16,16,16,0.9)',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                height: '60px',
                boxSizing: 'border-box'
            }}>
                <img src={fsLogo} alt="Futstocks Logo" style={{ height: '22px' }} />
                <div style={{ width: '22px' }} />
            </header>

            <main style={{ flex: 1, padding: '1.5rem', paddingBottom: '80px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <h2 
                        onClick={() => setMarketType('players')}
                        style={{ 
                            fontSize: '0.95rem', 
                            fontWeight: '800', 
                            color: marketType === 'players' ? 'var(--accent-neon)' : 'rgba(255,255,255,0.3)', 
                            textTransform: 'uppercase', 
                            letterSpacing: '1px', 
                            margin: 0,
                            cursor: 'pointer'
                        }}
                    >
                        Jugadores
                    </h2>
                    <h2 
                        onClick={() => setMarketType('teams')}
                        style={{ 
                            fontSize: '0.95rem', 
                            fontWeight: '800', 
                            color: marketType === 'teams' ? 'var(--accent-neon)' : 'rgba(255,255,255,0.3)', 
                            textTransform: 'uppercase', 
                            letterSpacing: '1px', 
                            margin: 0,
                            cursor: 'pointer'
                        }}
                    >
                        Equipos
                    </h2>
                </div>

                {marketType === 'teams' ? (
                    <TeamsMarketMobile searchTerm={searchTerm} selectedLeague={selectedLeague} />
                ) : (
                    <>
                {/* Sort & Filter Bar */}
                <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

                    {/* Horizontal Scroll Sort Buttons */}
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                        <button
                            onClick={() => handleSortToggle('price')}
                            style={{
                                whiteSpace: 'nowrap',
                                padding: '8px 14px',
                                borderRadius: '10px',
                                border: sortConfig.key === 'price' ? '1px solid var(--accent-neon)' : '1px solid #222',
                                backgroundColor: sortConfig.key === 'price' ? 'rgba(57,255,20,0.1)' : 'rgba(255,255,255,0.03)',
                                color: sortConfig.key === 'price' ? 'var(--accent-neon)' : 'var(--text-muted)',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                transition: 'all 0.2s'
                            }}
                        >
                            Precio {sortConfig.key === 'price' ? (sortConfig.direction === 'asc' ? '↑' : sortConfig.direction === 'desc' ? '↓' : '') : '↕'}
                        </button>
                        <button
                            onClick={() => handleSortToggle('change')}
                            style={{
                                whiteSpace: 'nowrap',
                                padding: '8px 14px',
                                borderRadius: '10px',
                                border: sortConfig.key === 'change' ? '1px solid var(--accent-neon)' : '1px solid #222',
                                backgroundColor: sortConfig.key === 'change' ? 'rgba(57,255,20,0.1)' : 'rgba(255,255,255,0.03)',
                                color: sortConfig.key === 'change' ? 'var(--accent-neon)' : 'var(--text-muted)',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                transition: 'all 0.2s'
                            }}
                        >
                            Cambio 24h {sortConfig.key === 'change' ? (sortConfig.direction === 'asc' ? '↑' : sortConfig.direction === 'desc' ? '↓' : '') : '↕'}
                        </button>
                        <button
                            onClick={() => handleSortToggle('name')}
                            style={{
                                whiteSpace: 'nowrap',
                                padding: '8px 14px',
                                borderRadius: '10px',
                                border: sortConfig.key === 'name' ? '1px solid var(--accent-neon)' : '1px solid #222',
                                backgroundColor: sortConfig.key === 'name' ? 'rgba(57,255,20,0.1)' : 'rgba(255,255,255,0.03)',
                                color: sortConfig.key === 'name' ? 'var(--accent-neon)' : 'var(--text-muted)',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                transition: 'all 0.2s'
                            }}
                        >
                            Nombre {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : sortConfig.direction === 'desc' ? '↓' : '') : '↕'}
                        </button>
                    </div>

                    {/* League Filter (Horizontal Scroll) */}
                    <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none', marginTop: '8px' }}>
                        <button
                            onClick={() => { setSelectedLeague(null); setSelectedTeam(null); }}
                            style={{
                                whiteSpace: 'nowrap',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                border: !selectedLeague ? '1px solid var(--accent-neon)' : '1px solid transparent',
                                backgroundColor: !selectedLeague ? 'rgba(57,255,20,0.1)' : 'transparent',
                                color: !selectedLeague ? 'var(--accent-neon)' : 'var(--text-muted)',
                                fontSize: '0.7rem',
                                fontWeight: '700'
                            }}
                        >
                            TODAS LAS LIGAS
                        </button>
                        {leagues.map(league => (
                            <button
                                key={league.id}
                                onClick={() => { setSelectedLeague(league); setSelectedTeam(null); }}
                                style={{
                                    whiteSpace: 'nowrap',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    border: selectedLeague?.id === league.id ? '1px solid var(--accent-neon)' : '1px solid transparent',
                                    backgroundColor: selectedLeague?.id === league.id ? 'rgba(57,255,20,0.1)' : 'rgba(255,255,255,0.03)',
                                    color: selectedLeague?.id === league.id ? 'var(--accent-neon)' : 'var(--text-muted)',
                                    fontSize: '0.7rem',
                                    fontWeight: '700'
                                }}
                            >
                                {league.name.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    {/* Team Filter (Horizontal Scroll) */}
                    {selectedLeague && (
                        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                            <button
                                onClick={() => setSelectedTeam(null)}
                                style={{
                                    whiteSpace: 'nowrap',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    border: !selectedTeam ? '1px solid var(--accent-neon)' : '1px solid transparent',
                                    backgroundColor: !selectedTeam ? 'rgba(57,255,20,0.1)' : 'transparent',
                                    color: !selectedTeam ? 'var(--accent-neon)' : 'var(--text-muted)',
                                    fontSize: '0.7rem',
                                    fontWeight: '700'
                                }}
                            >
                                TODOS
                            </button>
                            {selectedLeague.teams?.map(team => (
                                <button
                                    key={team.id}
                                    onClick={() => setSelectedTeam(team)}
                                    style={{
                                        whiteSpace: 'nowrap',
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        border: selectedTeam?.id === team.id ? '1px solid var(--accent-neon)' : '1px solid transparent',
                                        backgroundColor: selectedTeam?.id === team.id ? 'rgba(57,255,20,0.1)' : 'rgba(255,255,255,0.03)',
                                        color: selectedTeam?.id === team.id ? 'var(--accent-neon)' : 'var(--text-muted)',
                                        fontSize: '0.7rem',
                                        fontWeight: '700'
                                    }}
                                >
                                    {team.name.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

                        {loadingPlayers ? (
                            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Cargando mercado...</div>
                        ) : (
                            players.map(player => (
                                <Link
                                    to={`/market/player/${player.id}`}
                                    key={player.id}
                                    className="glass-panel"
                                    style={{ padding: '1rem', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', color: 'inherit' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <div style={{ width: '45px', height: '45px', borderRadius: '10px', backgroundColor: 'var(--surface-lighter)', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
                                            <img
                                                src={`${API_URL}/v1/players/${player.id}/image`}
                                                alt={player.name}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.nextSibling.style.display = 'block';
                                                }}
                                            />
                                            <span style={{ fontSize: '1.2rem', display: 'none' }}>👤</span>
                                        </div>
                                        <div>
                                            <p style={{ fontWeight: '700', fontSize: '0.90rem', margin: 0 }}>{player.name}</p>
                                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>{player.team}</p>
                                        </div>
                                    </div>

                                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                                        <p style={{ fontWeight: '800', fontSize: '0.95rem', margin: 0 }}>€{player.price.toFixed(2)}</p>
                                        <span style={{
                                            fontSize: '0.65rem',
                                            fontWeight: '800',
                                            color: player.change >= 0 ? 'var(--accent-neon)' : 'var(--error-red)',
                                            backgroundColor: player.change >= 0 ? 'rgba(57,255,20,0.1)' : 'rgba(255,77,77,0.1)',
                                            padding: '2px 6px',
                                            borderRadius: '4px'
                                        }}>
                                            {player.change >= 0 ? '+' : ''}{player.change.toFixed(2)}%
                                        </span>
                                    </div>
                                </Link>
                            ))
                        )}

                        {!loadingPlayers && players.length === 0 && (
                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                No se encontraron jugadores con estos filtros.
                            </div>
                        )}

                        {!loadingPlayers && currentPage < totalPages && (
                            <div style={{ padding: '1rem', textAlign: 'center' }}>
                                <button
                                    onClick={handleLoadMore}
                                    disabled={fetchingMore}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        backgroundColor: 'rgba(57,255,20,0.1)',
                                        color: 'var(--accent-neon)',
                                        border: '1px solid rgba(57,255,20,0.3)',
                                        borderRadius: '10px',
                                        fontWeight: 'bold',
                                        fontSize: '0.9rem',
                                        transition: 'all 0.2s',
                                        opacity: fetchingMore ? 0.7 : 1
                                    }}
                                >
                                    {fetchingMore ? 'Cargando...' : 'Cargar más jugadores'}
                                </button>
                            </div>
                        )}
                    </div>
                </>
                )}

            </main>

            {/* Bottom Navigation Mobile */}
            <nav style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                width: '100%',
                backgroundColor: 'rgba(28,28,28,0.95)',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                zIndex: 20,
                paddingBottom: 'env(safe-area-inset-bottom)'
            }}>
                <Link to="/home" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', padding: '12px 0', textDecoration: 'none', color: 'var(--text-muted)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>Inicio</span>
                </Link>
                <Link to="/portfolio" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', padding: '12px 0', textDecoration: 'none', color: 'var(--text-muted)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>Portfolio</span>
                </Link>
                <Link to="/market" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', padding: '12px 0', textDecoration: 'none', color: 'var(--accent-neon)' }}>
                    <div style={{ width: '20px', height: '2px', backgroundColor: 'var(--accent-neon)', borderRadius: '2px', position: 'absolute', top: 0 }}></div>
                    <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>Mercado</span>
                </Link>
                <Link to="/profile" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', padding: '12px 0', textDecoration: 'none', color: 'var(--text-muted)' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--surface-lighter)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '0.7rem', color: 'var(--text-main)' }}>
                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                </Link>
            </nav>

            {/* Floating Search Button (FAB) */}
            {!showSearch && (
                <button
                    onClick={() => setShowSearch(true)}
                    className="glass-panel"
                    style={{
                        position: 'fixed',
                        bottom: '90px',
                        right: '20px',
                        width: '56px',
                        height: '56px',
                        borderRadius: '18px',
                        border: '1px solid rgba(57,255,20,0.3)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 25,
                        cursor: 'pointer',
                        boxShadow: '0 8px 32px 0 rgba(57, 255, 20, 0.15)',
                        background: 'rgba(28, 28, 28, 0.8)',
                    }}
                >
                    <span style={{ fontSize: '1.4rem' }}>🔍</span>
                </button>
            )}

            {/* Search Overlay */}
            {showSearch && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.85)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    zIndex: 100,
                    padding: '2rem 1.5rem',
                    boxSizing: 'border-box'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <input
                                autoFocus
                                type="text"
                                placeholder="Nombre del jugador..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '14px 18px',
                                    backgroundColor: '#111',
                                    border: '1px solid var(--accent-neon)',
                                    borderRadius: '14px',
                                    color: 'white',
                                    fontSize: '1rem',
                                    outline: 'none'
                                }}
                            />
                        </div>
                        <button
                            onClick={() => { setShowSearch(false); if (searchTerm) fetchPlayers(1); }}
                            style={{ background: 'none', border: 'none', color: 'var(--accent-neon)', fontWeight: '800', fontSize: '0.9rem' }}
                        >
                            LISTO
                        </button>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                        Presiona "LISTO" o toca fuera para cerrar.
                    </p>
                    <div
                        onClick={() => setShowSearch(false)}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1 }}
                    />
                </div>
            )}
        </div>
    );
};

export default MarketMobile;
