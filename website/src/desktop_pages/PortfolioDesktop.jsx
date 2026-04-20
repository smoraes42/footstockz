import React, { useState, useEffect } from 'react';
import { getPortfolio, getUserTradeHistory } from '../services/api';
import Navbar from '../components/Navbar';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/PortfolioDesktop.module.css';


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
            <main className={styles.mainContent}>



                {/* Global Summary Cards */}
                <div className={styles.summaryCards}>

                    <div className={`glass-panel ${styles.summaryCard}`}>
                        <h3 className={styles.summaryLabel}>Capital Total</h3>
                        <p className={styles.summaryValue}>
                            {loading ? '---' : totalEquity.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </p>
                    </div>

                    <div className={`glass-panel ${styles.summaryCard}`}>
                        <h3 className={styles.summaryLabel}>Poder de Compra (Cash)</h3>
                        <p className={`${styles.summaryValue} ${styles.summaryValueHighlight}`}>
                            {loading ? '---' : walletBalance.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </p>
                    </div>

                    <div className={`glass-panel ${styles.summaryCard}`}>
                        <h3 className={styles.summaryLabel}>Invertido</h3>
                        <p className={styles.summaryValue}>
                            {loading ? '---' : holdingsValue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </p>
                    </div>


                </div>

                {/* Tab Selection Toggle */}
                <div className={styles.tabsContainer}>
                    <button
                        onClick={() => setActiveTab('players')}
                        className={`${styles.tabBtn} ${activeTab === 'players' ? styles.tabBtnActive : ''}`}
                    >
                        Jugadores
                    </button>
                    <button
                        onClick={() => setActiveTab('teams')}
                        className={`${styles.tabBtn} ${activeTab === 'teams' ? styles.tabBtnActive : ''}`}
                    >
                        Índices
                    </button>
                </div>

                {/* Tab Content */}
                {loading ? (
                    <div className={styles.loading}>Cargando portfolio...</div>
                ) : (
                    <div>
                        <div className={`glass-panel ${styles.tablePanel}`}>
                            <table className={styles.table}>
                                <thead>
                                    <tr className={styles.tableHeadRow}>
                                        <th 
                                            className={styles.tableHeaderCell}
                                            onClick={() => requestSort('player_name')}
                                        >
                                            <div className={styles.tableHeaderCellContent}>
                                                {activeTab === 'teams' ? 'Equipo (Índice)' : 'Jugador'}
                                                <span className={styles.sortIcon}>{getSortIndicator('player_name')}</span>
                                            </div>

                                        </th>
                                        <th 
                                            className={styles.tableHeaderCell}
                                            onClick={() => requestSort('shares_owned')}
                                        >
                                            <div className={styles.tableHeaderCellContent}>
                                                Acciones
                                                <span className={styles.sortIcon}>{getSortIndicator('shares_owned')}</span>
                                            </div>
                                        </th>
                                        <th 
                                            className={styles.tableHeaderCell}
                                            onClick={() => requestSort('current_price')}
                                        >
                                            <div className={styles.tableHeaderCellContent}>
                                                Precio
                                                <span className={styles.sortIcon}>{getSortIndicator('current_price')}</span>
                                            </div>
                                        </th>
                                        <th 
                                            className={styles.tableHeaderCell}
                                            onClick={() => requestSort('position_value')}
                                        >
                                            <div className={styles.tableHeaderCellContent}>
                                                Valor Total
                                                <span className={styles.sortIcon}>{getSortIndicator('position_value')}</span>
                                            </div>
                                        </th>
                                        <th 
                                            className={styles.tableHeaderCell}
                                            onClick={() => requestSort('variation_24h')}
                                        >
                                            <div className={styles.tableHeaderCellContent}>
                                                Variación (24h)
                                                <span className={styles.sortIcon}>{getSortIndicator('variation_24h')}</span>
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
                                                    <td colSpan="5" className={styles.noDataCell}>
                                                        No tienes inversiones en este mercado. ¡Explora!
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return displayData.map((position, idx) => (
                                            <tr
                                                key={idx}
                                                className={styles.tableRow}
                                                onClick={() => {
                                                    if (position.type === 'team') {
                                                        navigate(`/market/team/${position.team_id}`);
                                                    } else {
                                                        navigate(`/market/player/${position.player_id}`);
                                                    }
                                                }}
                                            >
                                                <td className={`${styles.tableCell} ${styles.assetName}`}>
                                                    {position.type === 'team' ? `🏟️ ${position.player_name}` : position.player_name}
                                                </td>

                                                <td className={styles.tableCell}>
                                                    {position.type === 'team' ? `${parseFloat(position.shares_owned).toFixed(4)} Shares` : position.shares_owned.toLocaleString()}
                                                </td>

                                                <td className={styles.tableCell}>
                                                    {`${position.current_price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}
                                                </td>
                                                <td className={`${styles.tableCell} ${styles.valueBold}`}>
                                                    {position.position_value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                                </td>
                                                <td className={`${styles.tableCell} ${styles.valueBold} ${position.variation_24h >= 0 ? styles.variationPositive : styles.variationNegative}`}>
                                                    {position.variation_24h >= 0 ? '+' : ''}{position.variation_24h.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                                                </td>
                                            </tr>
                                        ));
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Recent Activity Section */}
                <div className={styles.activitySection}>
                    <div className={styles.activityHeader}>
                        <h2 className={styles.activityTitle}>Actividad Reciente</h2>
                        <button 
                            onClick={() => setShowActivity(!showActivity)}
                            className={styles.toggleBtn}
                        >
                            {showActivity ? 'Ocultar' : 'Mostrar'}
                            <span className={`${styles.toggleArrow} ${showActivity ? styles.toggleArrowOpen : ''}`}>▼</span>
                        </button>
                    </div>

                    {showActivity && (
                        <div className={`glass-panel ${styles.tablePanel}`}>
                            {loadingTrades ? (
                                <div className={styles.loading}>Cargando actividad...</div>
                            ) : (
                                <table className={styles.table}>
                                    <thead>
                                        <tr className={styles.tableHeadRow}>
                                            <th className={styles.tableHeaderCell}>Activo</th>
                                            <th className={styles.tableHeaderCell}>Tipo</th>
                                            <th className={styles.tableHeaderCell}>Cantidad</th>
                                            <th className={styles.tableHeaderCell}>Valor Total</th>
                                            <th className={styles.tableHeaderCell}>Fecha</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tradeHistory.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className={styles.noDataCell}>
                                                    No hay actividad reciente para mostrar.
                                                </td>
                                            </tr>
                                        ) : (
                                            tradeHistory.slice(0, 10).map((trade, idx) => (
                                                <tr key={idx} className={styles.tableHeadRow}>
                                                    <td className={`${styles.tableCell} ${styles.assetName}`}>
                                                        {trade.player_name || 'Desconocido'}
                                                    </td>
                                                    <td className={styles.tableCell}>
                                                        <span className={`${styles.sideBadge} ${trade.side === 'buy' ? styles.sideBuy : styles.sideSell}`}>
                                                            {trade.side === 'buy' ? 'COMPRA' : 'VENTA'}
                                                        </span>
                                                    </td>
                                                    <td className={styles.tableCell}>
                                                        {parseFloat(trade.quantity).toFixed(4)}
                                                    </td>
                                                    <td className={`${styles.tableCell} ${styles.valueBold}`}>
                                                        {parseFloat(trade.total_value).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                                    </td>
                                                    <td className={`${styles.tableCell} ${styles.dateCell}`}>
                                                        {new Date(trade.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
};

export default PortfolioDesktop;
