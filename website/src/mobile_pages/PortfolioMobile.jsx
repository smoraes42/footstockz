import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import fsLogo from '../assets/fs-logo.png';
import { getPortfolio, getMe, getUserTradeHistory } from '../services/api';
import { useSocket } from '../context/SocketContext';
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
            
            {/* Top Header */}
            <header className={styles['mobile-header']}>
                <img src={fsLogo} alt="Futstocks Logo" className={styles['mobile-logo']} />
                <div className={styles['mobile-nav-spacer']} />
            </header>

            <main className={styles['mobile-main']}>
                <h2 className={styles['mobile-section-title']}>Tu Portfolio</h2>

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

                {/* Holdings List */}
                <div>
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
                                            <p className={styles['mobile-asset-price']}>{item.position_value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
                                            <p className={styles['mobile-asset-price-sub']}>{item.current_price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €/u</p>
                                            {item.variation_24h !== undefined && (
                                                <p className={`${styles['mobile-asset-change']} ${item.variation_24h >= 0 ? styles['mobile-change-positive'] : styles['mobile-change-negative']}`}>
                                                    {item.variation_24h >= 0 ? '+' : ''}{Number(item.variation_24h).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                                                </p>
                                            )}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        );
                    })()}
                </div>

                {/* Recent Activity Section */}
                <div className={styles['mobile-activity-container']}>
                    <div className={styles['mobile-activity-header']}>
                        <h3 className={styles['mobile-activity-title']}>
                            Actividad Reciente
                        </h3>
                        <button 
                            onClick={() => setShowActivity(!showActivity)}
                            className={styles['mobile-activity-toggle']}
                        >
                            {showActivity ? 'Ocultar' : 'Ver'}
                            <span className={`${styles['mobile-activity-arrow']} ${showActivity ? styles['mobile-activity-arrow-open'] : ''}`}>▼</span>
                        </button>
                    </div>
                    
                    {showActivity && (
                        loadingTrades ? (
                            <div className={styles['mobile-loading-activity']}>Cargando actividad...</div>
                        ) : tradeHistory.length === 0 ? (
                            <div className={styles['mobile-no-data']}>
                                <p className={styles['mobile-no-data-text']}>No hay actividad reciente.</p>
                            </div>
                        ) : (
                            <div className={styles['mobile-activity-list']}>
                                {tradeHistory.slice(0, 10).map((trade, idx) => (
                                    <div key={idx} className={`${styles['mobile-activity-card']} glass-panel`}>
                                        <div className={styles['mobile-asset-info']}>
                                            <div className={`${styles['mobile-activity-icon-box']} ${trade.side === 'buy' ? styles['mobile-activity-buy'] : styles['mobile-activity-sell']}`}>
                                                {trade.side === 'buy' ? '↙' : '↗'}
                                            </div>
                                            <div>
                                                <p className={styles['mobile-activity-name']}>{trade.player_name || 'Desconocido'}</p>
                                                <p className={styles['mobile-activity-meta']}>
                                                    {new Date(trade.created_at).toLocaleDateString()} • {trade.side === 'buy' ? 'Compra' : 'Venta'}
                                                </p>
                                            </div>
                                        </div>
                                    <div className={styles['mobile-asset-value-box']}>
                                        <p className={styles['mobile-activity-value']}>{parseFloat(trade.total_value).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
                                        <p className={styles['mobile-activity-shares']}>{parseFloat(trade.quantity).toFixed(4)} Acc.</p>
                                    </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            </main>

            {/* Bottom Navigation */}
            <nav className={styles['mobile-bottom-nav']}>
                <Link to="/home" className={styles['mobile-nav-link']}>
                    <span className={styles['mobile-nav-text']}>Inicio</span>
                </Link>
                <Link to="/portfolio" className={`${styles['mobile-nav-link']} ${styles['mobile-nav-link-active']}`}>
                    <div className={styles['mobile-nav-link-active-bar']}></div>
                    <span className={`${styles['mobile-nav-text']} ${styles['mobile-nav-text-active']}`}>Portfolio</span>
                </Link>
                <Link to="/market" className={styles['mobile-nav-link']}>
                    <span className={styles['mobile-nav-text']}>Mercado</span>
                </Link>
                <div 
                    onClick={() => window.location.href = '/profile'}
                    className={styles['mobile-nav-link']}
                >
                    <div className={styles['mobile-nav-avatar']}>
                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                </div>
            </nav>
        </div>
    );
};

export default PortfolioMobile;
