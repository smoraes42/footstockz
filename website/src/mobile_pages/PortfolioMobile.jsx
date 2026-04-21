import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import fsLogo from '../assets/fs-logo.png';
import { getPortfolio, getMe, getUserTradeHistory } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { PlayerPrice, PlayerChange } from '../components/PriceDisplay';
import MobileHeader from '../components/MobileHeader';
import MobileNavbar from '../components/MobileNavbar';
import styles from '../styles/Portfolio.module.css';

const formatCompactNumber = (number) => {
    if (number >= 1000000) {
        return (number / 1000000).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'M €';
    }
    if (number >= 1000) {
        return (number / 1000).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'K €';
    }
    return Number(number).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
};

const PortfolioMobile = () => {
    const [portfolio, setPortfolio] = useState(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('players');
    const [tradeHistory, setTradeHistory] = useState([]);
    const [loadingTrades, setLoadingTrades] = useState(true);
    const [showActivity, setShowActivity] = useState(true);
    const [updatedPlayerId, setUpdatedPlayerId] = useState(null);

    const [sortConfig, setSortConfig] = useState({ key: 'player_name', direction: 'asc' });

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key) => {
        if (sortConfig.key !== key) return '';
        return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
    };

    const { socket, connected } = useSocket();

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

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [portData, userData, tradesData] = await Promise.all([
                    getPortfolio(),
                    getMe(),
                    getUserTradeHistory()
                ]);
                setPortfolio(portData);
                setUser(userData);
                setTradeHistory(tradesData);
            } catch (error) {
                console.error('Failed to load portfolio:', error);
            } finally {
                setLoading(false);
                setLoadingTrades(false);
            }
        };
        fetchData();
    }, []);

    // WebSocket real-time price updates (same as desktop)
    useEffect(() => {
        if (!socket || !connected) return;

        const handlePriceUpdate = (data) => {
            setUpdatedPlayerId(data.playerId);
            setTimeout(() => setUpdatedPlayerId(null), 1000);

            setPortfolio(prev => {
                if (!prev) return prev;
                const k = 0.0001;
                const updatedHoldings = (prev.holdings || []).map(h => {
                    if (h.player_id === data.playerId) {
                        const newPrice = data.price;
                        const shares = parseFloat(h.shares_owned) || 0;
                        const newValue = (newPrice / k) * (1 - Math.exp(-k * shares));
                        return { ...h, current_price: newPrice, position_value: newValue };
                    }
                    return h;
                });
                return { ...prev, holdings: updatedHoldings };
            });
        };

        const handlePortfolioUpdate = () => fetchPortfolioData();

        socket.on('price_update', handlePriceUpdate);
        socket.on('portfolio_update', handlePortfolioUpdate);

        return () => {
            socket.off('price_update', handlePriceUpdate);
            socket.off('portfolio_update', handlePortfolioUpdate);
        };
    }, [socket, connected]);

    const walletBalance = portfolio ? portfolio.walletBalance : 0;
    const rawHoldings = portfolio ? portfolio.holdings || [] : [];
    const holdingsValue = rawHoldings.reduce((acc, h) => acc + h.position_value, 0);
    const totalEquity = walletBalance + holdingsValue;

    const holdings = [...rawHoldings].sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    return (
        <div className={styles['mobile-container']}>
            
            <MobileHeader />

            <main className={styles['mobile-main']}>
                <div className={styles['mobile-title-row']}>
                    <h2 className={styles['mobile-section-title']}>
                        {activeTab === 'activity' ? 'Actividad Reciente' : 'Tu Portfolio'}
                    </h2>
                    <button 
                        className={`${styles['mobile-activity-btn']} ${activeTab === 'activity' ? styles['mobile-activity-btn-active'] : ''}`}
                        onClick={() => setActiveTab(activeTab === 'activity' ? 'players' : 'activity')}
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </button>
                </div>

                {activeTab !== 'activity' && (
                    <>
                    {/* Equity Header */}
                    <div className={styles['mobile-equity-header']}>
                        <span className={styles['mobile-equity-label']}>Capital Total</span>
                        <span className={styles['mobile-equity-value']}>
                            €{loading ? '---' : formatCompactNumber(totalEquity)}
                        </span>
                    </div>

                    {/* Wallet Breakdown Cards */}
                    <div className={styles['mobile-breakdown-grid']}>
                        <div className={`${styles['mobile-breakdown-card']} glass-panel`}>
                            <p className={styles['mobile-breakdown-label']}>Cash</p>
                            <p className={styles['mobile-breakdown-value']}>€{loading ? '---' : formatCompactNumber(walletBalance)}</p>
                        </div>
                        <div className={`${styles['mobile-breakdown-card']} glass-panel`}>
                            <p className={styles['mobile-breakdown-label']}>Invertido</p>
                            <p className={styles['mobile-breakdown-value']}>€{loading ? '---' : formatCompactNumber(holdingsValue)}</p>
                        </div>
                    </div>
                    {/* Tab Selection Toggle */}
                    <div className={styles['mobile-tab-switcher']}>
                        <button
                            onClick={() => setActiveTab('players')}
                            className={`${styles['mobile-tab-btn']} ${activeTab === 'players' ? styles['mobile-tab-btn-active'] : ''}`}
                        >Jugadores</button>
                        <button
                            onClick={() => setActiveTab('teams')}
                            className={`${styles['mobile-tab-btn']} ${activeTab === 'teams' ? styles['mobile-tab-btn-active'] : ''}`}
                        >Índices</button>
                    </div>
                    </>
                )}

                {/* Main Content Area */}
                <div className={styles['mobile-content-area']}>
                    {activeTab === 'activity' ? (
                        loadingTrades ? (
                            <div className={styles.loading}>Cargando actividad...</div>
                        ) : tradeHistory.length === 0 ? (
                            <div className={styles['mobile-no-data']}>
                                <p className={styles['mobile-no-data-text']}>No hay actividad reciente.</p>
                            </div>
                        ) : (
                            <div className={styles['mobile-activity-list-full']}>
                                {tradeHistory.slice(0, 20).map((trade, idx) => (
                                    <div 
                                        key={idx} 
                                        className={`${styles['mobile-activity-card-full']} glass-panel`}
                                        onClick={() => navigate(`/trades/${trade.id}`)}
                                    >
                                        <div className={styles['mobile-asset-info']}>
                                            <div className={`${styles['mobile-activity-icon-box']} ${trade.side === 'buy' ? styles['mobile-activity-buy'] : styles['mobile-activity-sell']}`}>
                                                {trade.side === 'buy' ? 'COMPRA' : 'VENTA'}
                                            </div>
                                            <div>
                                                <p className={styles['mobile-activity-name']}>{trade.player_name || 'Desconocido'}</p>
                                                <p className={styles['mobile-activity-meta']}>
                                                    {new Date(trade.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={styles['mobile-asset-value-box']}>
                                            <p className={styles['mobile-activity-value']}>{parseFloat(trade.total_value).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</p>
                                            <p className={styles['mobile-activity-shares']}>{parseFloat(trade.quantity).toFixed(4)} Acc.</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        <>
                        <div className={styles['mobile-holdings-header']}>
                            <h3 className={styles['mobile-holdings-title']}>
                                {activeTab === 'teams' ? 'Mis Índices' : 'Mis Jugadores'}
                            </h3>
                        </div>
                        
                        {/* Sorting Chips */}
                        {!loading && rawHoldings.length > 1 && (
                            <div className={styles['mobile-sort-chips']}>
                                {[
                                    { key: 'player_name', label: 'Nombre' },
                                    { key: 'shares_owned', label: 'Acciones' },
                                    { key: 'current_price', label: 'Precio' },
                                    { key: 'position_value', label: 'Valor' }
                                ].map(chip => (
                                    <button
                                        key={chip.key}
                                        onClick={() => requestSort(chip.key)}
                                        className={`${styles['mobile-sort-chip']} ${sortConfig.key === chip.key ? styles['mobile-sort-chip-active'] : ''}`}
                                    >
                                        {chip.label}{getSortIndicator(chip.key)}
                                    </button>
                                ))}
                            </div>
                        )}
                        
                        {loading ? (
                            <div className={styles.loading}>Cargando activos...</div>
                        ) : (() => {
                            const displayData = holdings.filter(h => {
                                if (activeTab === 'teams') return h.type === 'team';
                                return h.type !== 'team';
                            });

                            if (displayData.length === 0) {
                                return (
                                    <div className={styles['mobile-no-data']}>
                                        <p className={styles['mobile-no-data-text']}>
                                            No tienes inversiones en este mercado.
                                        </p>
                                        <Link to="/market" className={styles['mobile-go-to-market']}>Ir al Mercado</Link>
                                    </div>
                                );
                            }

                            return (
                                <div className={styles['mobile-asset-list']}>
                                    {displayData.map(item => (
                                        <Link 
                                            to={item.type === 'team' ? `/market/team/${item.team_id}` : `/market/player/${item.player_id}`}
                                            key={item.type === 'team' ? `team-${item.team_id}` : `player-${item.player_id}`} 
                                            className={`${styles['mobile-asset-card']} glass-panel`}
                                        >
                                            <div className={styles['mobile-asset-info']}>
                                                <div className={styles['mobile-asset-icon-box']}>
                                                    {item.type === 'team' ? '🏟️' : '👤'}
                                                </div>
                                                <div>
                                                    <p className={styles['mobile-asset-name']}>
                                                        {item.player_name}
                                                    </p>
                                                    <p className={styles['mobile-asset-shares']}>
                                                        {item.type === 'team' ? parseFloat(item.shares_owned).toFixed(4) : parseFloat(item.shares_owned).toFixed(2)} acciones
                                                    </p>
                                                </div>
                                            </div>

                                            <div className={styles['mobile-asset-value-box']}>
                                                <PlayerPrice 
                                                    price={item.position_value} 
                                                    isUpdated={updatedPlayerId === item.player_id} 
                                                    className={styles['mobile-asset-price']} 
                                                />
                                                <p className={styles['mobile-asset-price-sub']}>
                                                    {item.current_price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/u
                                                </p>
                                                {item.variation_24h !== undefined && (
                                                    <PlayerChange 
                                                        change={item.variation_24h} 
                                                        indicatorType="sign" 
                                                        className={styles['mobile-asset-change']} 
                                                    />
                                                )}
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            );
                        })()}
                        </>
                    )}
                </div>
            </main>

            <MobileNavbar />
        </div>
    );
};

export default PortfolioMobile;
