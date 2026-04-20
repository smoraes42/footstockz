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
        <div className={styles.mobileContainer}>

            {/* Top Header Mobile */}
            <header className={styles.mobileHeader}>
                <img src={fsLogo} alt="Futstocks Logo" className={styles.mobileLogo} />
                <div className={styles.mobileNavSpacer} />
            </header>

            <main className={styles.mobileMain}>
                <div className={styles.mobileMarketTabs}>
                    <h2 
                        onClick={() => setMarketType('players')}
                        className={`${styles.mobileMarketTab} ${marketType === 'players' ? styles.mobileMarketTabActive : styles.mobileMarketTabInactive}`}
                    >
                        Jugadores
                    </h2>
                    <h2 
                        onClick={() => setMarketType('teams')}
                        className={`${styles.mobileMarketTab} ${marketType === 'teams' ? styles.mobileMarketTabActive : styles.mobileMarketTabInactive}`}
                    >
                        Equipos
                    </h2>
                </div>

                {marketType === 'teams' ? (
                    <TeamsMarketMobile searchTerm={searchTerm} selectedLeague={selectedLeague} />
                ) : (
                    <>
                {/* Sort & Filter Bar */}
                <div className={styles.mobileFilterBar}>

                    {/* Horizontal Scroll Sort Buttons */}
                    <div className={styles.mobileHorizontalScroll}>
                        <button
                            onClick={() => handleSortToggle('price')}
                            className={`${styles.mobileSortBtn} ${sortConfig.key === 'price' ? styles.mobileSortBtnActive : ''}`}
                        >
                            Precio {sortConfig.key === 'price' ? (sortConfig.direction === 'asc' ? '↑' : sortConfig.direction === 'desc' ? '↓' : '') : '↕'}
                        </button>
                        <button
                            onClick={() => handleSortToggle('change')}
                            className={`${styles.mobileSortBtn} ${sortConfig.key === 'change' ? styles.mobileSortBtnActive : ''}`}
                        >
                            Cambio 24h {sortConfig.key === 'change' ? (sortConfig.direction === 'asc' ? '↑' : sortConfig.direction === 'desc' ? '↓' : '') : '↕'}
                        </button>
                        <button
                            onClick={() => handleSortToggle('name')}
                            className={`${styles.mobileSortBtn} ${sortConfig.key === 'name' ? styles.mobileSortBtnActive : ''}`}
                        >
                            Nombre {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : sortConfig.direction === 'desc' ? '↓' : '') : '↕'}
                        </button>
                    </div>

                    {/* League Filter (Horizontal Scroll) */}
                    <div className={`${styles.mobileHorizontalScroll} ${styles.mobileLeagueFilterRow}`}>
                        <button
                            onClick={() => { setSelectedLeague(null); setSelectedTeam(null); }}
                            className={`${styles.mobileFilterBtn} ${!selectedLeague ? styles.mobileFilterBtnActive : ''}`}
                        >
                            TODAS LAS LIGAS
                        </button>
                        {leagues.map(league => (
                            <button
                                key={league.id}
                                onClick={() => { setSelectedLeague(league); setSelectedTeam(null); }}
                                className={`${styles.mobileFilterBtn} ${selectedLeague?.id === league.id ? styles.mobileFilterBtnActive : ''}`}
                            >
                                {league.name.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    {/* Team Filter (Horizontal Scroll) */}
                    {selectedLeague && (
                        <div className={styles.mobileHorizontalScroll}>
                            <button
                                onClick={() => setSelectedTeam(null)}
                                className={`${styles.mobileFilterBtn} ${!selectedTeam ? styles.mobileFilterBtnActive : ''}`}
                            >
                                TODOS
                            </button>
                            {selectedLeague.teams?.map(team => (
                                <button
                                    key={team.id}
                                    onClick={() => setSelectedTeam(team)}
                                    className={`${styles.mobileFilterBtn} ${selectedTeam?.id === team.id ? styles.mobileFilterBtnActive : ''}`}
                                >
                                    {team.name.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                    <div className={styles.mobilePlayerList}>

                        {loadingPlayers ? (
                            <div className={styles.loading}>Cargando mercado...</div>
                        ) : (
                            players.map(player => (
                                <Link
                                    to={`/market/player/${player.id}`}
                                    key={player.id}
                                    className={`${styles.mobilePlayerCard} glass-panel`}
                                >
                                    <div className={styles.mobilePlayerInfo}>
                                        <div className={styles.mobilePlayerAvatarBox}>
                                            <img
                                                src={`${API_URL}/v1/players/${player.id}/image`}
                                                alt={player.name}
                                                className={styles.mobilePlayerAvatarImg}
                                            <span className={styles.mobilePlayerAvatarPlaceholder}>👤</span>
                                        </div>
                                        <div>
                                            <p className={styles.mobilePlayerName}>{player.name}</p>
                                            <p className={styles.mobilePlayerTeam}>{player.team}</p>
                                        </div>
                                    </div>

                                    <div className={styles.mobilePlayerPriceBox}>
                                        <p className={styles.mobilePlayerPrice}>€{player.price.toFixed(2)}</p>
                                        <span className={`${styles.mobilePlayerChange} ${player.change >= 0 ? styles.mobileChangePositive : styles.mobileChangeNegative}`}>
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
                            <div className={styles.mobileLoadMoreContainer}>
                                <button
                                    onClick={handleLoadMore}
                                    disabled={fetchingMore}
                                    className={`${styles.mobileLoadMoreBtn} ${fetchingMore ? styles.mobileLoadMoreBtnLoading : ''}`}
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
            <nav className={styles.mobileBottomNav}>
                <Link to="/home" className={styles.mobileNavLink}>
                    <span className={styles.mobileNavText}>Inicio</span>
                </Link>
                <Link to="/portfolio" className={styles.mobileNavLink}>
                    <span className={styles.mobileNavText}>Portfolio</span>
                </Link>
                <Link to="/market" className={`${styles.mobileNavLink} ${styles.mobileNavLinkActive}`}>
                    <div className={styles.mobileNavLinkActiveBar}></div>
                    <span className={`${styles.mobileNavText} ${styles.mobileNavTextActive}`}>Mercado</span>
                </Link>
                <Link to="/profile" className={styles.mobileNavLink}>
                    <div className={styles.mobileNavAvatar}>
                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                </Link>
            </nav>

            {/* Floating Search Button (FAB) */}
            {!showSearch && (
                <button
                    onClick={() => setShowSearch(true)}
                    className={`${styles.mobileFab} glass-panel`}
                >
                    <span className={styles.mobileFabIcon}>🔍</span>
                </button>
            )}

            {/* Search Overlay */}
            {showSearch && (
                <div className={styles.mobileSearchOverlay}>
                    <div className={styles.mobileSearchInputBox}>
                        <div className={styles.mobileSearchIconBox}>
                            <input
                                autoFocus
                                type="text"
                                placeholder="Nombre del jugador..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={styles.mobileSearchInput}
                            />
                        </div>
                        <button
                            onClick={() => { setShowSearch(false); if (searchTerm) fetchPlayers(1); }}
                            className={styles.mobileSearchCloseBtn}
                        >
                            LISTO
                        </button>
                    </div>
                    <p className={styles.mobileSearchSubtext}>
                        Presiona "LISTO" o toca fuera para cerrar.
                    </p>
                    <div
                        onClick={() => setShowSearch(false)}
                        className={styles.mobileSearchOverlayBackdrop}
                    />
                </div>
            )}
        </div>
    );
};

export default MarketMobile;
