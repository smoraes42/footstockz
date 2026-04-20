import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { getPlayers, getLeagues, getPlayerImageUrl } from '../services/api';
import Navbar from '../components/Navbar';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import TeamsMarketDesktop from './TeamsMarketDesktop';
import styles from '../styles/MarketDesktop.module.css';


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

            <main className={styles.mainContent}>
                <header className={styles.header}>
                    <div className={styles.headerLeft}>
                        <h1 
                            onClick={() => setMarketType('players')}
                            className={`${styles.marketTypeTitle} ${marketType === 'players' ? styles.marketTypeTitleActive : ''}`}
                        >
                            Jugadores
                        </h1>
                        <h1 
                            onClick={() => setMarketType('teams')}
                            className={`${styles.marketTypeTitle} ${marketType === 'teams' ? styles.marketTypeTitleActive : ''}`}
                        >
                            Equipos
                        </h1>
                    </div>

                    <div className={styles.headerRight}>
                        {/* View Mode Toggle */}
                        <div className={styles.viewModeContainer}>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`${styles.viewModeBtn} ${viewMode === 'list' ? styles.viewModeBtnActive : ''}`}
                            >
                                ≡ Lista
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`${styles.viewModeBtn} ${viewMode === 'grid' ? styles.viewModeBtnActive : ''}`}
                            >
                                ⊞ Grid
                            </button>
                        </div>

                        <div className={styles.searchContainer}>
                            <input
                                type="text"
                                placeholder="Buscar jugador..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={styles.searchInput}
                            />
                        </div>
                    </div>
                </header>

                {marketType === 'teams' ? (
                    <TeamsMarketDesktop searchTerm={searchTerm} selectedLeague={selectedLeague} />
                ) : (
                    <div className={`${viewMode === 'list' ? "glass-panel" : ""} ${styles.tablePanel}`}>

                    {loadingPlayers ? (
                        <div className={styles.loading}>Cargando jugadores del mercado...</div>
                    ) : (
                        viewMode === 'list' ? (
                            <table className={styles.table}>
                                <thead>
                                    <tr className={styles.tableHeadRow}>
                                        <th
                                            className={styles.tableHeaderCell}
                                            onClick={() => handleSortToggle('name')}
                                        >
                                            Jugador {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : sortConfig.direction === 'desc' ? '↓' : '↕') : '↕'}
                                        </th>
                                        <th
                                            className={styles.tableHeaderCell}
                                            onClick={() => handleSortToggle('price')}
                                        >
                                            Precio {sortConfig.key === 'price' ? (sortConfig.direction === 'asc' ? '↑' : sortConfig.direction === 'desc' ? '↓' : '↕') : '↕'}
                                        </th>
                                        <th
                                            className={styles.tableHeaderCell}
                                            onClick={() => handleSortToggle('change')}
                                        >
                                            24h % {sortConfig.key === 'change' ? (sortConfig.direction === 'asc' ? '↑' : sortConfig.direction === 'desc' ? '↓' : '↕') : '↕'}
                                        </th>
                                        <th className={styles.tableHeaderCell}>Evolución</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPlayers.map(player => (
                                        <tr
                                            key={player.id}
                                            className={`${styles.tableRow} ${updatedPlayerId === player.id ? styles.tableRowUpdated : ''}`}
                                            onClick={() => navigate(`/market/player/${player.id}`)}
                                        >
                                            <td className={styles.tableCell}>
                                                <div className={styles.playerCellContent}>
                                                    {/* Using the image endpoint wrapper directly for UI display */}
                                                    <img
                                                        src={getPlayerImageUrl(player.id)}
                                                        alt={player.name}
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                            e.target.nextSibling.style.display = 'flex';
                                                        }}
                                                        className={styles.playerAvatarImg}
                                                    />
                                                    <div className={styles.playerAvatarPlaceholder}>
                                                        👤
                                                    </div>
                                                    <div>
                                                        <p className={styles.playerName}>{player.name}</p>
                                                        <p className={styles.playerTeam}>{player.team}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className={`${styles.tableCell} ${styles.priceCell}`}>
                                                {Number(player.price).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                            </td>
                                            <td className={`${styles.tableCell} ${styles.changeCell} ${player.change >= 0 ? styles.changePositive : styles.changeNegative}`}>
                                                {player.change >= 0 ? '+' : ''}{Number(player.change).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                                            </td>
                                            <td className={`${styles.tableCell} ${styles.sparklineCell}`}>
                                                <div className={styles.sparklineWrapper}>
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
                            <div className={styles.gridContainer}>
                                <div className={styles.gridSortHeader}>
                                    <button
                                        onClick={() => handleSortToggle('name')}
                                        className={styles.gridSortBtn}
                                    >
                                        <span className={styles.gridSortLabel}>Ordenar: </span>
                                        Nombre {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : sortConfig.direction === 'desc' ? '↓' : '↕') : '↕'}
                                    </button>
                                    <button
                                        onClick={() => handleSortToggle('price')}
                                        className={styles.gridSortBtn}
                                    >
                                        <span className={styles.gridSortLabel}>Ordenar:</span>
                                        Precio {sortConfig.key === 'price' ? (sortConfig.direction === 'asc' ? '↑' : sortConfig.direction === 'desc' ? '↓' : '↕') : '↕'}
                                    </button>
                                    <button
                                        onClick={() => handleSortToggle('change')}
                                        className={styles.gridSortBtn}
                                    >
                                        <span className={styles.gridSortLabel}>Ordenar:</span>
                                        24h % {sortConfig.key === 'change' ? (sortConfig.direction === 'asc' ? '↑' : sortConfig.direction === 'desc' ? '↓' : '↕') : '↕'}
                                    </button>
                                </div>
                                <div className={styles.playerGrid}>
                                    {filteredPlayers.map(player => (
                                        <div
                                            key={player.id}
                                            className={`glass-panel ${styles.playerCard} ${updatedPlayerId === player.id ? styles.playerCardUpdated : ''}`}
                                            onClick={() => navigate(`/market/player/${player.id}`)}
                                        >
                                            <div className={styles.playerCardAvatarContainer}>
                                                <img
                                                    src={getPlayerImageUrl(player.id)}
                                                    alt={player.name}
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'flex';
                                                    }}
                                                    className={styles.playerCardAvatar}
                                                />
                                                <div className={styles.playerCardAvatarPlaceholder}>
                                                    👤
                                                </div>
                                            </div>

                                            <h3 className={styles.playerCardName}>{player.name}</h3>
                                            <p className={styles.playerCardTeam}>{player.team}</p>

                                            <div className={styles.playerCardStats}>
                                                <div>
                                                    <p className={styles.playerCardStatLabel}>Precio</p>
                                                    <p className={`${styles.playerCardStatValue} ${styles.playerCardPrice}`}>{Number(player.price).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
                                                </div>
                                                <div className={styles.playerCardChangeContainer}>
                                                    <p className={styles.playerCardStatLabel}>24h</p>
                                                    <p className={`${styles.playerCardStatValue} ${player.change >= 0 ? styles.changePositive : styles.changeNegative}`}>
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
                        <div className={styles.paginationContainer}>
                            <button
                                onClick={handlePrevPage}
                                disabled={currentPage === 1}
                                className={`${styles.paginationBtn} ${currentPage === 1 ? styles.paginationBtnDisabled : ''}`}
                            >
                                ← Anterior
                            </button>
                            <span className={styles.paginationInfo}>
                                Pág. {currentPage} de {totalPages}
                            </span>
                            <button
                                onClick={handleNextPage}
                                disabled={currentPage === totalPages}
                                className={`${styles.paginationBtn} ${currentPage === totalPages ? styles.paginationBtnDisabled : ''}`}
                            >
                                Siguiente →
                            </button>
                        </div>
                     )}
                    </div>
                )}

            </main>

            {/* Right Sidebar (Leagues and Teams Menu) */}
            <aside className={styles.rightSidebar}>
                <div className={styles.filterHeader}>
                    <h3 className={styles.filterTitle}>Filtros</h3>
                </div>

                <div className={styles.filterGroupContainer}>

                    {/* League Selector */}
                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>Competición</label>
                        <button
                            onClick={() => setIsLeagueDropdownOpen(!isLeagueDropdownOpen)}
                            className={styles.dropdownBtn}
                        >
                            <span>{selectedLeague ? selectedLeague.name : 'Todas las competiciones'}</span>
                            <span className={`${styles.dropdownArrow} ${isLeagueDropdownOpen ? styles.dropdownArrowOpen : ''}`}>▼</span>
                        </button>

                        {isLeagueDropdownOpen && (
                            <div className={styles.dropdownMenu}>
                                <button
                                    onClick={() => handleSelectLeague(null)}
                                    className={`${styles.dropdownItem} ${!selectedLeague ? styles.dropdownItemActive : ''}`}
                                >
                                    Todas las competiciones
                                </button>
                                {leagues.map(league => (
                                    <button
                                        key={league.id}
                                        onClick={() => handleSelectLeague(league)}
                                        className={`${styles.dropdownItem} ${selectedLeague?.id === league.id ? styles.dropdownItemActive : ''}`}
                                    >
                                        {league.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Team Selector */}
                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>Equipo</label>
                        <button
                            onClick={() => selectedLeague && setIsTeamDropdownOpen(!isTeamDropdownOpen)}
                            disabled={!selectedLeague}
                            className={`${styles.dropdownBtn} ${!selectedLeague ? styles.dropdownBtnDisabled : ''}`}
                        >
                            <span>
                                {!selectedLeague
                                    ? 'Selecciona competición'
                                    : (selectedTeam ? selectedTeam.name : 'Todos los equipos')}
                            </span>
                            <span className={`${styles.dropdownArrow} ${isTeamDropdownOpen ? styles.dropdownArrowOpen : ''}`}>▼</span>
                        </button>

                        {/* Team Options Dropdown */}
                        {isTeamDropdownOpen && selectedLeague && (
                            <div className={styles.dropdownMenu}>
                                <button
                                    onClick={() => handleSelectTeam(null)}
                                    className={`${styles.dropdownItem} ${!selectedTeam ? styles.dropdownItemActive : ''}`}
                                >
                                    Todos los equipos
                                </button>
                                {selectedLeague.teams.map(team => (
                                    <button
                                        key={team.id}
                                        onClick={() => handleSelectTeam(team)}
                                        className={`${styles.dropdownItem} ${selectedTeam?.id === team.id ? styles.dropdownItemActive : ''}`}
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
