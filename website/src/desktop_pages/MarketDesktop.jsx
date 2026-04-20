import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { getPlayers, getLeagues, getPlayerImageUrl } from '../services/api';
import Navbar from '../components/Navbar';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import TeamsMarketDesktop from './TeamsMarketDesktop';
import { PlayerPrice, PlayerChange } from '../components/PriceDisplay';
import styles from '../styles/Market.module.css';


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
        <div className={styles.container}>

            <Navbar />

            <main className={styles['main-content']}>
                <header className={styles.header}>
                    <div className={styles['header-left']}>
                        <h1 
                            onClick={() => setMarketType('players')}
                            className={`${styles['market-type-title']} ${marketType === 'players' ? styles['market-type-title-active'] : ''}`}
                        >
                            Jugadores
                        </h1>
                        <h1 
                            onClick={() => setMarketType('teams')}
                            className={`${styles['market-type-title']} ${marketType === 'teams' ? styles['market-type-title-active'] : ''}`}
                        >
                            Equipos
                        </h1>
                    </div>

                    <div className={styles['header-right']}>
                        {/* View Mode Toggle */}
                        <div className={styles['view-mode-container']}>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`${styles['view-mode-btn']} ${viewMode === 'list' ? styles['view-mode-btn-active'] : ''}`}
                            >
                                ≡ Lista
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`${styles['view-mode-btn']} ${viewMode === 'grid' ? styles['view-mode-btn-active'] : ''}`}
                            >
                                ⊞ Grid
                            </button>
                        </div>

                        <div className={styles['search-container']}>
                            <input
                                type="text"
                                placeholder="Buscar jugador..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={styles['search-input']}
                            />
                        </div>
                    </div>
                </header>

                {marketType === 'teams' ? (
                    <TeamsMarketDesktop searchTerm={searchTerm} selectedLeague={selectedLeague} />
                ) : (
                    <div className={`${viewMode === 'list' ? "glass-panel" : ""} ${styles['table-panel']}`}>

                    {loadingPlayers ? (
                        <div className={styles.loading}>Cargando jugadores del mercado...</div>
                    ) : (
                        viewMode === 'list' ? (
                            <table className={styles.table}>
                                <thead>
                                    <tr className={styles['table-head-row']}>
                                        <th
                                            className={styles['table-header-cell']}
                                            onClick={() => handleSortToggle('name')}
                                        >
                                            Jugador {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : sortConfig.direction === 'desc' ? '↓' : '↕') : '↕'}
                                        </th>
                                        <th
                                            className={styles['table-header-cell']}
                                            onClick={() => handleSortToggle('price')}
                                        >
                                            Precio {sortConfig.key === 'price' ? (sortConfig.direction === 'asc' ? '↑' : sortConfig.direction === 'desc' ? '↓' : '↕') : '↕'}
                                        </th>
                                        <th
                                            className={styles['table-header-cell']}
                                            onClick={() => handleSortToggle('change')}
                                        >
                                            24h % {sortConfig.key === 'change' ? (sortConfig.direction === 'asc' ? '↑' : sortConfig.direction === 'desc' ? '↓' : '↕') : '↕'}
                                        </th>
                                        <th className={styles['table-header-cell']}>Evolución</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPlayers.map(player => (
                                        <tr
                                            key={player.id}
                                            className={`${styles['table-row']} ${updatedPlayerId === player.id ? styles['table-row-updated'] : ''}`}
                                            onClick={() => navigate(`/market/player/${player.id}`)}
                                        >
                                            <td className={styles['table-cell']}>
                                                <div className={styles['player-cell-content']}>
                                                    {/* Using the image endpoint wrapper directly for UI display */}
                                                    <img
                                                        src={getPlayerImageUrl(player.id)}
                                                        alt={player.name}
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            e.target.nextSibling.style.display = 'flex';
                                                        }}
                                                        className={styles['player-avatar-img']}
                                                    />
                                                    <div className={styles['player-avatar-placeholder']}>
                                                        👤
                                                    </div>
                                                    <div>
                                                        <p className={styles['player-name']}>{player.name}</p>
                                                        <p className={styles['player-team']}>{player.team}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className={`${styles['table-cell']} ${styles['price-cell']}`}>
                                                <PlayerPrice price={player.price} isUpdated={updatedPlayerId === player.id} />
                                            </td>
                                            <td className={`${styles['table-cell']} ${styles['change-cell']}`}>
                                                <PlayerChange change={player.change} indicatorType="sign" />
                                            </td>
                                            <td className={`${styles['table-cell']} ${styles['sparkline-cell']}`}>
                                                <div className={styles['sparkline-wrapper']}>
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
                            <div className={styles['grid-container']}>
                                <div className={styles['grid-sort-header']}>
                                    <button
                                        onClick={() => handleSortToggle('name')}
                                        className={styles['grid-sort-btn']}
                                    >
                                        <span className={styles['grid-sort-label']}>Ordenar: </span>
                                        Nombre {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : sortConfig.direction === 'desc' ? '↓' : '↕') : '↕'}
                                    </button>
                                    <button
                                        onClick={() => handleSortToggle('price')}
                                        className={styles['grid-sort-btn']}
                                    >
                                        <span className={styles['grid-sort-label']}>Ordenar:</span>
                                        Precio {sortConfig.key === 'price' ? (sortConfig.direction === 'asc' ? '↑' : sortConfig.direction === 'desc' ? '↓' : '↕') : '↕'}
                                    </button>
                                    <button
                                        onClick={() => handleSortToggle('change')}
                                        className={styles['grid-sort-btn']}
                                    >
                                        <span className={styles['grid-sort-label']}>Ordenar:</span>
                                        24h % {sortConfig.key === 'change' ? (sortConfig.direction === 'asc' ? '↑' : sortConfig.direction === 'desc' ? '↓' : '↕') : '↕'}
                                    </button>
                                </div>
                                <div className={styles['player-grid']}>
                                    {filteredPlayers.map(player => (
                                        <div
                                            key={player.id}
                                            className={`glass-panel ${styles['player-card']} ${updatedPlayerId === player.id ? styles['player-card-updated'] : ''}`}
                                            onClick={() => navigate(`/market/player/${player.id}`)}
                                        >
                                            <div className={styles['player-card-avatar-container']}>
                                                <img
                                                    src={getPlayerImageUrl(player.id)}
                                                    alt={player.name}
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'flex';
                                                    }}
                                                    className={styles['player-card-avatar']}
                                                />
                                                <div className={styles['player-card-avatar-placeholder']}>
                                                    👤
                                                </div>
                                            </div>

                                            <h3 className={styles['player-card-name']}>{player.name}</h3>
                                            <p className={styles['player-card-team']}>{player.team}</p>

                                            <div className={styles['player-card-stats']}>
                                                <div>
                                                    <p className={styles['player-card-stat-label']}>Precio</p>
                                                    <p className={`${styles['player-card-stat-value']} ${styles['player-card-price']}`}>
                                                        <PlayerPrice price={player.price} isUpdated={updatedPlayerId === player.id} />
                                                    </p>
                                                </div>
                                                <div className={styles['player-card-change-container']}>
                                                    <p className={styles['player-card-stat-label']}>24h</p>
                                                    <p className={styles['player-card-stat-value']}>
                                                        <PlayerChange change={player.change} indicatorType="sign" />
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
                        <div className={styles['pagination-container']}>
                            <button
                                onClick={handlePrevPage}
                                disabled={currentPage === 1}
                                className={`${styles['pagination-btn']} ${currentPage === 1 ? styles['pagination-btn-disabled'] : ''}`}
                            >
                                ← Anterior
                            </button>
                            <span className={styles['pagination-info']}>
                                Pág. {currentPage} de {totalPages}
                            </span>
                            <button
                                onClick={handleNextPage}
                                disabled={currentPage === totalPages}
                                className={`${styles['pagination-btn']} ${currentPage === totalPages ? styles['pagination-btn-disabled'] : ''}`}
                            >
                                Siguiente →
                            </button>
                        </div>
                     )}
                    </div>
                )}

            </main>

            {/* Right Sidebar (Leagues and Teams Menu) */}
            <aside className={styles['right-sidebar']}>
                <div className={styles['filter-header']}>
                    <h3 className={styles['filter-title']}>Filtros</h3>
                </div>

                <div className={styles['filter-group-container']}>

                    {/* League Selector */}
                    <div className={styles['filter-group']}>
                        <label className={styles['filter-label']}>Competición</label>
                        <button
                            onClick={() => setIsLeagueDropdownOpen(!isLeagueDropdownOpen)}
                            className={styles['dropdown-btn']}
                        >
                            <span>{selectedLeague ? selectedLeague.name : 'Todas las competiciones'}</span>
                            <span className={`${styles['dropdown-arrow']} ${isLeagueDropdownOpen ? styles['dropdown-arrow-open'] : ''}`}>▼</span>
                        </button>

                        {isLeagueDropdownOpen && (
                            <div className={styles['dropdown-menu']}>
                                <button
                                    onClick={() => handleSelectLeague(null)}
                                    className={`${styles['dropdown-item']} ${!selectedLeague ? styles['dropdown-item-active'] : ''}`}
                                >
                                    Todas las competiciones
                                </button>
                                {leagues.map(league => (
                                    <button
                                        key={league.id}
                                        onClick={() => handleSelectLeague(league)}
                                        className={`${styles['dropdown-item']} ${selectedLeague?.id === league.id ? styles['dropdown-item-active'] : ''}`}
                                    >
                                        {league.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Team Selector */}
                    <div className={styles['filter-group']}>
                        <label className={styles['filter-label']}>Equipo</label>
                        <button
                            onClick={() => selectedLeague && setIsTeamDropdownOpen(!isTeamDropdownOpen)}
                            disabled={!selectedLeague}
                            className={`${styles['dropdown-btn']} ${!selectedLeague ? styles['dropdown-btn-disabled'] : ''}`}
                        >
                            <span>
                                {!selectedLeague
                                    ? 'Selecciona competición'
                                    : (selectedTeam ? selectedTeam.name : 'Todos los equipos')}
                            </span>
                            <span className={`${styles['dropdown-arrow']} ${isTeamDropdownOpen ? styles['dropdown-arrow-open'] : ''}`}>▼</span>
                        </button>

                        {/* Team Options Dropdown */}
                        {isTeamDropdownOpen && selectedLeague && (
                            <div className={styles['dropdown-menu']}>
                                <button
                                    onClick={() => handleSelectTeam(null)}
                                    className={`${styles['dropdown-item']} ${!selectedTeam ? styles['dropdown-item-active'] : ''}`}
                                >
                                    Todos los equipos
                                </button>
                                {selectedLeague.teams.map(team => (
                                    <button
                                        key={team.id}
                                        onClick={() => handleSelectTeam(team)}
                                        className={`${styles['dropdown-item']} ${selectedTeam?.id === team.id ? styles['dropdown-item-active'] : ''}`}
                                    >
                                        {team.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </aside>
        </div>
    );
};

export default MarketDesktop;
