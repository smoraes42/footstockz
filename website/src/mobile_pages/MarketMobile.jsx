import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { getPlayers, getMe, getLeagues, getPlayerImageUrl } from '../services/api';
import fsLogo from '../assets/fs-logo.png';
import { useSocket } from '../context/SocketContext';
import TeamsMarketMobile from './TeamsMarketMobile';
import MobileHeader from '../components/MobileHeader';
import MobileNavbar from '../components/MobileNavbar';
import { PlayerPrice, PlayerChange } from '../components/PriceDisplay';
import styles from '../styles/Market.module.css';


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
    const [updatedPlayerId, setUpdatedPlayerId] = useState(null);


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
                const sparkline = [priceNum, priceNum, priceNum, priceNum, priceNum];
                return { ...p, price: priceNum, change: changeNum, sparkline };
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
            setUpdatedPlayerId(data.playerId);
            setTimeout(() => setUpdatedPlayerId(null), 1000);

            setPlayers(prev => {
                const updated = prev.map(p => {
                    if (p.id === data.playerId) {
                        const priceNum = data.price;
                        const changeNum = parseFloat(data.change || 0);
                        const newSparkline = [...(p.sparkline || [priceNum]).slice(1), priceNum];
                        return { ...p, price: priceNum, change: changeNum, sparkline: newSparkline };
                    }
                    return p;
                });

                // Live re-sort if active (matches desktop behaviour)
                if (sortConfig.key && sortConfig.direction !== 'default') {
                    updated.sort((a, b) => {
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
                return updated;
            });
        };

        socket.on('price_update', handlePriceUpdate);

        return () => {
            socket.off('price_update', handlePriceUpdate);
        };
    }, [socket, connected, sortConfig]);

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
        <div className={styles['mobile-container']}>

            {/* Top Header Mobile */}
            <MobileHeader />

            <main className={styles['mobile-main']}>
                <div className={styles['mobile-market-tabs']}>
                    <h2 
                        onClick={() => setMarketType('players')}
                        className={`${styles['mobile-market-tab']} ${marketType === 'players' ? styles['mobile-market-tab-active'] : styles['mobile-market-tab-inactive']}`}
                    >
                        Jugadores
                    </h2>
                    <h2 
                        onClick={() => setMarketType('teams')}
                        className={`${styles['mobile-market-tab']} ${marketType === 'teams' ? styles['mobile-market-tab-active'] : styles['mobile-market-tab-inactive']}`}
                    >
                        Equipos
                    </h2>
                </div>

                {marketType === 'teams' ? (
                    <TeamsMarketMobile searchTerm={searchTerm} selectedLeague={selectedLeague} />
                ) : (
                    <>
                {/* Sort & Filter Bar */}
                <div className={styles['mobile-filter-bar']}>
                    {/* League Filter (Horizontal Scroll) */}
                    <div className={`${styles['mobile-horizontal-scroll']} ${styles['mobile-league-filter-row']}`}>
                        <button
                            onClick={() => { setSelectedLeague(null); setSelectedTeam(null); }}
                            className={`${styles['mobile-filter-btn']} ${!selectedLeague ? styles['mobile-filter-btn-active'] : ''}`}
                        >
                            TODAS LAS LIGAS
                        </button>
                        {leagues.map(league => (
                            <button
                                key={league.id}
                                onClick={() => { setSelectedLeague(league); setSelectedTeam(null); }}
                                className={`${styles['mobile-filter-btn']} ${selectedLeague?.id === league.id ? styles['mobile-filter-btn-active'] : ''}`}
                            >
                                {league.name.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    {/* Team Filter (Horizontal Scroll) */}
                    {selectedLeague && (
                        <div className={styles['mobile-horizontal-scroll']}>
                            <button
                                onClick={() => setSelectedTeam(null)}
                                className={`${styles['mobile-filter-btn']} ${!selectedTeam ? styles['mobile-filter-btn-active'] : ''}`}
                            >
                                TODOS
                            </button>
                            {selectedLeague.teams?.map(team => (
                                <button
                                    key={team.id}
                                    onClick={() => setSelectedTeam(team)}
                                    className={`${styles['mobile-filter-btn']} ${selectedTeam?.id === team.id ? styles['mobile-filter-btn-active'] : ''}`}
                                >
                                    {team.name.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* List Header */}
                <div className={styles['mobile-list-header']}>
                    <button 
                        onClick={() => handleSortToggle('name')}
                        className={`${styles['mobile-header-item']} ${styles['mobile-header-item-name']} ${sortConfig.key === 'name' ? styles['mobile-header-item-active'] : ''}`}
                    >
                        Nombre {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                    </button>
                    <button 
                        onClick={() => handleSortToggle('change')}
                        className={`${styles['mobile-header-item']} ${styles['mobile-header-item-24h']} ${sortConfig.key === 'change' ? styles['mobile-header-item-active'] : ''}`}
                    >
                        24h {sortConfig.key === 'change' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                    </button>
                    <button 
                        onClick={() => handleSortToggle('price')}
                        className={`${styles['mobile-header-item']} ${styles['mobile-header-item-price']} ${sortConfig.key === 'price' ? styles['mobile-header-item-active'] : ''}`}
                    >
                        Precio {sortConfig.key === 'price' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}
                    </button>
                </div>

                    <div className={styles['mobile-player-list']}>

                        {loadingPlayers ? (
                            <div className={styles.loading}>Cargando mercado...</div>
                        ) : (
                            players.map(player => (
                                <Link
                                    to={`/market/player/${player.id}`}
                                    key={player.id}
                                    className={`${styles['mobile-player-card']} glass-panel ${updatedPlayerId === player.id ? styles['mobile-player-card-updated'] : ''}`}
                                >
                                    <div className={styles['mobile-player-info']}>
                                        <div className={styles['mobile-player-avatar-box']}>
                                            <img
                                                src={getPlayerImageUrl(player.id)}
                                                alt={player.name}
                                                className={styles['mobile-player-avatar-img']}
                                                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                            />
                                            <span className={styles['mobile-player-avatar-placeholder']}>👤</span>
                                        </div>
                                        <div>
                                            <p className={styles['mobile-player-name']}>{player.name}</p>
                                            <p className={styles['mobile-player-team']}>{player.team}</p>
                                        </div>
                                    </div>

                                    <div className={styles['mobile-player-change-center']}>
                                        <PlayerChange change={player.change} indicatorType="sign" />
                                    </div>

                                    <div className={styles['mobile-player-price-right']}>
                                        <PlayerPrice price={player.price} isUpdated={updatedPlayerId === player.id} className={styles['mobile-player-price']} />
                                    </div>
                                </Link>
                            ))
                        )}

                        {!loadingPlayers && players.length === 0 && (
                            <div className={styles.loading}>
                                No se encontraron jugadores con estos filtros.
                            </div>
                        )}

                        {!loadingPlayers && currentPage < totalPages && (
                            <div className={styles['mobile-load-more-container']}>
                                <button
                                    onClick={handleLoadMore}
                                    disabled={fetchingMore}
                                    className={`${styles['mobile-load-more-btn']} ${fetchingMore ? styles['mobile-load-more-btn-loading'] : ''}`}
                                >
                                    {fetchingMore ? 'Cargando...' : 'Cargar más jugadores'}
                                </button>
                            </div>
                        )}
                    </div>
                </>
                )}

            </main>

            <MobileNavbar />

            {/* Floating Search Button (FAB) */}
            {!showSearch && (
                <button
                    onClick={() => setShowSearch(true)}
                    className={`${styles['mobile-fab']} glass-panel`}
                >
                    <span className={styles['mobile-fab-icon']}>🔍</span>
                </button>
            )}

            {/* Search Overlay */}
            {showSearch && (
                <div className={styles['mobile-search-overlay']}>
                    <div className={styles['mobile-search-input-box']}>
                        <div className={styles['mobile-search-icon-box']}>
                            <input
                                autoFocus
                                type="text"
                                placeholder="Nombre del jugador..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={styles['mobile-search-input']}
                            />
                        </div>
                        <button
                            onClick={() => { setShowSearch(false); if (searchTerm) fetchPlayers(1); }}
                            className={styles['mobile-search-close-btn']}
                        >
                            LISTO
                        </button>
                    </div>
                    <p className={styles['mobile-search-subtext']}>
                        Presiona "LISTO" o toca fuera para cerrar.
                    </p>
                    <div
                        onClick={() => setShowSearch(false)}
                        className={styles['mobile-search-overlay-backdrop']}
                    />
                </div>
            )}
        </div>
    );
};

export default MarketMobile;
