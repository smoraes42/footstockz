import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPortfolio, getUserTradeHistory } from '../services/api';
import Navbar from '../components/Navbar';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { PlayerPrice, PlayerChange } from '../components/PriceDisplay';
import styles from '../styles/Portfolio.module.css';


const formatCompactNumber = (number) => {
    if (number >= 1000000) {
        return (number / 1000000).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'M €';
    }
    if (number >= 1000) {
        return (number / 1000).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'K €';
    }
    return number.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
};

const PortfolioDesktop = () => {
    const navigate = useNavigate();
    const [portfolio, setPortfolio] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('players'); // 'players' | 'teams'
    const [tradeHistory, setTradeHistory] = useState([]);
    const [loadingTrades, setLoadingTrades] = useState(true);
    const [showActivity, setShowActivity] = useState(true);
    const [updatedPlayerId, setUpdatedPlayerId] = useState(null);
    const { socket, connected, subscribeToUser, unsubscribeFromUser } = useSocket();
    const { user } = useAuth();


    const [sortConfig, setSortConfig] = useState({ key: 'player_name', direction: 'asc' });

    const fetchPortfolioData = async () => {
        try {
            const data = await getPortfolio();
            setPortfolio(data);
        } catch (error) {
            console.error('Failed to load portfolio:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTradeHistory = async () => {
        try {
            const data = await getUserTradeHistory();
            setTradeHistory(data);
        } catch (error) {
            console.error('Failed to load trade history:', error);
        } finally {
            setLoadingTrades(false);
        }
    };

    useEffect(() => {
        fetchPortfolioData();
        fetchTradeHistory();
    }, []);

    // WebSocket Listeners
    useEffect(() => {
        if (!socket || !connected) return;

        const handlePriceUpdate = (data) => {
            setUpdatedPlayerId(data.playerId);
            setTimeout(() => setUpdatedPlayerId(null), 1000);

            setPortfolio(prev => {
                if (!prev) return prev;
                const k = 0.0001; // CONFIG.PRICE_IMPACT_FACTOR
                const updatedHoldings = (prev.holdings || []).map(h => {
                    if (h.player_id === data.playerId) {
                        const newPrice = data.price;
                        if (h.type === 'team') {
                            const newValue = h.shares_owned * newPrice;
                            return { ...h, current_price: newPrice, position_value: newValue };
                        } else {
                            const shares = parseFloat(h.shares_owned) || 0;
                            // AMM liquidation value
                            const newValue = (newPrice / k) * (1 - Math.exp(-k * shares));
                            return { ...h, current_price: newPrice, position_value: newValue };
                        }
                    }
                    return h;
                });
                return { ...prev, holdings: updatedHoldings };
            });
        };

        const handlePortfolioUpdate = () => {
            // Re-fetch everything to ensure consistency after a buy/sell
            fetchPortfolioData();
        };

        socket.on('price_update', handlePriceUpdate);
        socket.on('portfolio_update', handlePortfolioUpdate);

        return () => {
            socket.off('price_update', handlePriceUpdate);
            socket.off('portfolio_update', handlePortfolioUpdate);
        };
    }, [socket, connected]);




    useEffect(() => {
        if (user && user.id) {
            subscribeToUser(user.id);
            return () => unsubscribeFromUser(user.id);
        }
    }, [user, subscribeToUser, unsubscribeFromUser]);

    const walletBalance = portfolio ? portfolio.walletBalance : 0;
    const holdings = portfolio ? portfolio.holdings || [] : [];
    const openOrders = portfolio ? portfolio.openOrders || [] : [];

    const holdingsValue = holdings.reduce((acc, h) => acc + h.position_value, 0);
    const totalEquity = walletBalance + holdingsValue;

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedHoldings = [...holdings].sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
            return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
            return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    const getSortIndicator = (key) => {
        if (sortConfig.key !== key) return '↕';
        return sortConfig.direction === 'asc' ? '↑' : '↓';
    };

    return (
        <div className={styles.container}>

            <Navbar />

            {/* Main Content Area */}
            <main className={styles['main-content']}>



                {/* Global Summary Cards */}
                <div className={styles['summary-cards']}>

                    <div className={`glass-panel ${styles['summary-card']}`}>
                        <h3 className={styles['summary-label']}>Capital Total</h3>
                        <p className={styles['summary-value']}>
                            {loading ? '---' : totalEquity.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </p>
                    </div>

                    <div className={`glass-panel ${styles['summary-card']}`}>
                        <h3 className={styles['summary-label']}>Poder de Compra (Cash)</h3>
                        <p className={`${styles['summary-value']} ${styles['summary-value-highlight']}`}>
                            {loading ? '---' : walletBalance.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </p>
                    </div>

                    <div className={`glass-panel ${styles['summary-card']}`}>
                        <h3 className={styles['summary-label']}>Invertido</h3>
                        <p className={styles['summary-value']}>
                            {loading ? '---' : holdingsValue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </p>
                    </div>


                </div>

                {/* Tab Selection Toggle */}
                <div className={styles['tabs-row']}>
                    <div className={styles['tabs-container']}>
                        <button
                            onClick={() => setActiveTab('players')}
                            className={`${styles['tab-btn']} ${activeTab === 'players' ? styles['tab-btn-active'] : ''}`}
                        >
                            Jugadores
                        </button>
                        <button
                            onClick={() => setActiveTab('teams')}
                            className={`${styles['tab-btn']} ${activeTab === 'teams' ? styles['tab-btn-active'] : ''}`}
                        >
                            Índices
                        </button>
                    </div>

                    <button 
                        className={`${styles['activity-toggle-btn']} ${showActivity ? styles['activity-toggle-btn-active'] : ''}`}
                        onClick={() => setShowActivity(!showActivity)}
                        title="Actividad Reciente"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </button>

                    {showActivity && (
                        <div className={styles['activity-overlay']}>
                            <div className={`glass-panel ${styles['table-panel']}`}>
                                <div className={styles['activity-header']} style={{ padding: '1.5rem', paddingBottom: '0' }}>
                                    <h3 className={styles['activity-title']} style={{ fontSize: '1.1rem' }}>Actividad Reciente</h3>
                                </div>
                                {loadingTrades ? (
                                    <div className={styles.loading} style={{ padding: '2rem' }}>Cargando actividad...</div>
                                ) : (
                                    <table className={styles.table}>
                                        <thead>
                                            <tr className={styles['table-head-row']}>
                                                <th className={styles['table-header-cell']}>Activo</th>
                                                <th className={styles['table-header-cell']}>Tipo</th>
                                                <th className={styles['table-header-cell']}>Valor</th>
                                                <th className={styles['table-header-cell']}>Fecha</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tradeHistory.length === 0 ? (
                                                <tr>
                                                    <td colSpan="4" className={styles['no-data-cell']}>
                                                        No hay actividad reciente.
                                                    </td>
                                                </tr>
                                            ) : (
                                                tradeHistory.slice(0, 10).map((trade, idx) => (
                                                    <tr key={idx} className={styles['table-head-row']}>
                                                        <td className={`${styles['table-cell']} ${styles['asset-name']}`}>
                                                            {trade.player_name || 'Desconocido'}
                                                        </td>
                                                        <td className={styles['table-cell']}>
                                                            <span className={`${styles['side-badge']} ${trade.side === 'buy' ? styles['side-buy'] : styles['side-sell']}`}>
                                                                {trade.side === 'buy' ? 'COMPRA' : 'VENTA'}
                                                            </span>
                                                        </td>
                                                        <td className={`${styles['table-cell']} ${styles['value-bold']}`}>
                                                            {parseFloat(trade.total_value).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                                        </td>
                                                        <td className={`${styles['table-cell']} ${styles['date-cell']}`}>
                                                            {new Date(trade.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Tab Content */}
                {loading ? (
                    <div className={styles.loading}>Cargando portfolio...</div>
                ) : (
                    <div>
                        <div className={`glass-panel ${styles['table-panel']}`}>
                            <table className={styles.table}>
                                <thead>
                                    <tr className={styles['table-head-row']}>
                                        <th 
                                            className={styles['table-header-cell']}
                                            onClick={() => requestSort('player_name')}
                                        >
                                            <div className={styles['table-header-cell-content']}>
                                                {activeTab === 'teams' ? 'Equipo (Índice)' : 'Jugador'}
                                                <span className={styles['sort-icon']}>{getSortIndicator('player_name')}</span>
                                            </div>

                                        </th>
                                        <th 
                                            className={styles['table-header-cell']}
                                            onClick={() => requestSort('shares_owned')}
                                        >
                                            <div className={styles['table-header-cell-content']}>
                                                Acciones
                                                <span className={styles['sort-icon']}>{getSortIndicator('shares_owned')}</span>
                                            </div>
                                        </th>
                                        <th 
                                            className={styles['table-header-cell']}
                                            onClick={() => requestSort('current_price')}
                                        >
                                            <div className={styles['table-header-cell-content']}>
                                                Precio
                                                <span className={styles['sort-icon']}>{getSortIndicator('current_price')}</span>
                                            </div>
                                        </th>
                                        <th 
                                            className={styles['table-header-cell']}
                                            onClick={() => requestSort('position_value')}
                                        >
                                            <div className={styles['table-header-cell-content']}>
                                                Valor Total
                                                <span className={styles['sort-icon']}>{getSortIndicator('position_value')}</span>
                                            </div>
                                        </th>
                                        <th 
                                            className={styles['table-header-cell']}
                                            onClick={() => requestSort('variation_24h')}
                                        >
                                            <div className={styles['table-header-cell-content']}>
                                                Variación (24h)
                                                <span className={styles['sort-icon']}>{getSortIndicator('variation_24h')}</span>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        let displayData = sortedHoldings.filter(h => {
                                            if (activeTab === 'teams') return h.type === 'team';
                                            return h.type !== 'team';
                                        });

                                        if (displayData.length === 0) {
                                            return (
                                                <tr>
                                                    <td colSpan="5" className={styles['no-data-cell']}>
                                                        No tienes inversiones en este mercado. ¡Explora!
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return displayData.map((position, idx) => (
                                            <tr
                                                key={idx}
                                                className={styles['table-row']}
                                                onClick={() => {
                                                    if (position.type === 'team') {
                                                        navigate(`/market/team/${position.team_id}`);
                                                    } else {
                                                        navigate(`/market/player/${position.player_id}`);
                                                    }
                                                }}
                                            >
                                                <td className={`${styles['table-cell']} ${styles['asset-name']}`}>
                                                    {position.type === 'team' ? `🏟️ ${position.player_name}` : position.player_name}
                                                </td>

                                                <td className={styles['table-cell']}>
                                                    {position.type === 'team' ? `${parseFloat(position.shares_owned).toFixed(4)} Shares` : position.shares_owned.toLocaleString()}
                                                </td>

                                                <td className={styles['table-cell']}>
                                                    {`${position.current_price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}
                                                </td>
                                                <td className={`${styles['table-cell']} ${styles['value-bold']}`}>
                                                    <PlayerPrice 
                                                        price={position.position_value} 
                                                        isUpdated={updatedPlayerId === position.player_id} 
                                                        className={styles['value-bold']} 
                                                    />
                                                </td>
                                                <td className={`${styles['table-cell']} ${styles['value-bold']}`}>
                                                    <PlayerChange 
                                                        change={position.variation_24h} 
                                                        indicatorType="sign" 
                                                        className={styles['value-bold']} 
                                                    />
                                                </td>
                                            </tr>
                                        ));
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
};

export default PortfolioDesktop;
