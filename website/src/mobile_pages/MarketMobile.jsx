import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getPlayers, getMe, getLeagues, API_URL } from '../services/api';
import fsLogo from '../assets/fs-logo.png';
import { useSocket } from '../context/SocketContext';
import TeamsMarketMobile from './TeamsMarketMobile';
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
        <div className={styles['mobile-container']}>

            {/* Top Header Mobile */}
            <header className={styles['mobile-header']}>
                <img src={fsLogo} alt="Futstocks Logo" className={styles['mobile-logo']} />
                <div className={styles['mobile-nav-spacer']} />
            </header>

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

                    {/* Horizontal Scroll Sort Buttons */}
                    <div className={styles['mobile-horizontal-scroll']}>
                        <button
                            onClick={() => handleSortToggle('price')}
                            className={`${styles['mobile-sort-btn']} ${sortConfig.key === 'price' ? styles['mobile-sort-btn-active'] : ''}`}
                        >
                            Precio {sortConfig.key === 'price' ? (sortConfig.direction === 'asc' ? '↑' : sortConfig.direction === 'desc' ? '↓' : '') : '↕'}
                        </button>
                        <button
                            onClick={() => handleSortToggle('change')}
                            className={`${styles['mobile-sort-btn']} ${sortConfig.key === 'change' ? styles['mobile-sort-btn-active'] : ''}`}
                        >
                            Cambio 24h {sortConfig.key === 'change' ? (sortConfig.direction === 'asc' ? '↑' : sortConfig.direction === 'desc' ? '↓' : '') : '↕'}
                        </button>
                        <button
                            onClick={() => handleSortToggle('name')}
                            className={`${styles['mobile-sort-btn']} ${sortConfig.key === 'name' ? styles['mobile-sort-btn-active'] : ''}`}
                        >
                            Nombre {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : sortConfig.direction === 'desc' ? '↓' : '') : '↕'}
                        </button>
                    </div>

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

                    <div className={styles['mobile-player-list']}>

                        {loadingPlayers ? (
                            <div className={styles.loading}>Cargando mercado...</div>
                        ) : (
                            players.map(player => (
                                <Link
                                    to={`/market/player/${player.id}`}
                                    key={player.id}
                                    className={`${styles['mobile-player-card']} glass-panel`}
                                >
                                    <div className={styles['mobile-player-info']}>
                                        <div className={styles['mobile-player-avatar-box']}>
                                            <img
                                                src={`${API_URL}/v1/players/${player.id}/image`}
                                                alt={player.name}
                                                className={styles['mobile-player-avatar-img']}
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                            <span className={styles['mobile-player-avatar-placeholder']}>👤</span>
                                        </div>
                                        <div>
                                            <p className={styles['mobile-player-name']}>{player.name}</p>
                                            <p className={styles['mobile-player-team']}>{player.team}</p>
                                        </div>
                                    </div>

                                    <div className={styles['mobile-player-price-box']}>
                                        <p className={styles['mobile-player-price']}>€{player.price.toFixed(2)}</p>
                                        <span className={`${styles['mobile-player-change']} ${player.change >= 0 ? styles['mobile-change-positive'] : styles['mobile-change-negative']}`}>
                                            {player.change >= 0 ? '+' : ''}{player.change.toFixed(2)}%
                                        </span>
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

            {/* Bottom Navigation Mobile */}
            <nav className={styles['mobile-bottom-nav']}>
                <Link to="/home" className={styles['mobile-nav-link']}>
                    <span className={styles['mobile-nav-text']}>Inicio</span>
                </Link>
                <Link to="/portfolio" className={styles['mobile-nav-link']}>
                    <span className={styles['mobile-nav-text']}>Portfolio</span>
                </Link>
                <Link to="/market" className={`${styles['mobile-nav-link']} ${styles['mobile-nav-link-active']}`}>
                    <div className={styles['mobile-nav-link-active-bar']}></div>
                    <span className={`${styles['mobile-nav-text']} ${styles['mobile-nav-text-active']}`}>Mercado</span>
                </Link>
                <Link to="/profile" className={styles['mobile-nav-link']}>
                    <div className={styles['mobile-nav-avatar']}>
                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                </Link>
            </nav>

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
