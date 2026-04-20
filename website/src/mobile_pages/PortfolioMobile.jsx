import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import fsLogo from '../assets/fs-logo.png';
import { getPortfolio, getMe, getUserTradeHistory } from '../services/api';
import styles from '../styles/Portfolio.module.css';

const formatCompactNumber = (number) => {
    if (number >= 1000000) {
        return (number / 1000000).toFixed(1) + 'M';
    }
    if (number >= 1000) {
        return (number / 1000).toFixed(1) + 'K';
    }
    return Number(number).toFixed(2);
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
        <div className={styles.mobileContainer}>
            
            {/* Top Header */}
            <header className={styles.mobileHeader}>
                <img src={fsLogo} alt="Futstocks Logo" className={styles.mobileLogo} />
                <div className={styles.mobileNavSpacer} />
            </header>

            <main className={styles.mobileMain}>
                <h2 className={styles.mobileSectionTitle}>Tu Portfolio</h2>

                {/* Equity Header */}
                <div className={styles.mobileEquityHeader}>
                    <span className={styles.mobileEquityLabel}>Capital Total</span>
                    <span className={styles.mobileEquityValue}>
                        €{loading ? '---' : formatCompactNumber(totalEquity)}
                    </span>
                </div>

                {/* Wallet Breakdown Cards */}
                <div className={styles.mobileBreakdownGrid}>
                    <div className={`${styles.mobileBreakdownCard} glass-panel`}>
                        <p className={styles.mobileBreakdownLabel}>Cash</p>
                        <p className={styles.mobileBreakdownValue}>€{loading ? '---' : formatCompactNumber(walletBalance)}</p>
                    </div>
                    <div className={`${styles.mobileBreakdownCard} glass-panel`}>
                        <p className={styles.mobileBreakdownLabel}>Invertido</p>
                        <p className={styles.mobileBreakdownValue}>€{loading ? '---' : formatCompactNumber(holdingsValue)}</p>
                    </div>
                </div>
                {/* Tab Selection Toggle */}
                <div className={styles.mobileTabSwitcher}>
                    <button
                        onClick={() => setActiveTab('players')}
                        className={`${styles.mobileTabBtn} ${activeTab === 'players' ? styles.mobileTabBtnActive : ''}`}
                    >Jugadores</button>
                    <button
                        onClick={() => setActiveTab('teams')}
                        className={`${styles.mobileTabBtn} ${activeTab === 'teams' ? styles.mobileTabBtnActive : ''}`}
                    >Índices</button>
                </div>

                {/* Holdings List */}
                <div>
                    <div className={styles.mobileHoldingsHeader}>
                        <h3 className={styles.mobileHoldingsTitle}>
                            {activeTab === 'teams' ? 'Mis Índices' : 'Mis Jugadores'}
                        </h3>
                    </div>
                    
                    {/* Sorting Chips */}
                    {!loading && rawHoldings.length > 1 && (
                        <div className={styles.mobileSortChips}>
                            {[
                                { key: 'player_name', label: 'Nombre' },
                                { key: 'shares_owned', label: 'Acciones' },
                                { key: 'current_price', label: 'Precio' },
                                { key: 'position_value', label: 'Valor' }
                            ].map(chip => (
                                <button
                                    key={chip.key}
                                    onClick={() => requestSort(chip.key)}
                                    className={`${styles.mobileSortChip} ${sortConfig.key === chip.key ? styles.mobileSortChipActive : ''}`}
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
                                <div className={styles.mobileNoData}>
                                    <p className={styles.mobileNoDataText}>
                                        No tienes inversiones en este mercado.
                                    </p>
                                    <Link to="/market" className={styles.mobileGoToMarket}>Ir al Mercado</Link>
                                </div>
                            );
                        }

                        return (
                            <div className={styles.mobileAssetList}>
                                {displayData.map(item => (
                                    <Link 
                                        to={item.type === 'team' ? `/market/team/${item.team_id}` : `/market/player/${item.player_id}`}
                                        key={item.type === 'team' ? `team-${item.team_id}` : `player-${item.player_id}`} 
                                        className={`${styles.mobileAssetCard} glass-panel`}
                                    >
                                        <div className={styles.mobileAssetInfo}>
                                            <div className={styles.mobileAssetIconBox}>
                                                {item.type === 'team' ? '🏟️' : '👤'}
                                            </div>
                                            <div>
                                                <p className={styles.mobileAssetName}>
                                                    {item.player_name}
                                                </p>
                                                <p className={styles.mobileAssetShares}>
                                                    {item.type === 'team' ? parseFloat(item.shares_owned).toFixed(4) : parseFloat(item.shares_owned).toFixed(2)} acciones
                                                </p>
                                            </div>
                                        </div>

                                        <div className={styles.mobileAssetValueBox}>
                                            <p className={styles.mobileAssetPrice}>€{item.position_value.toFixed(2)}</p>
                                            <p className={styles.mobileAssetPriceSub}>€{item.current_price.toFixed(2)}/u</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        );
                    })()}
                </div>

                {/* Recent Activity Section */}
                <div className={styles.mobileActivityContainer}>
                    <div className={styles.mobileActivityHeader}>
                        <h3 className={styles.mobileActivityTitle}>
                            Actividad Reciente
                        </h3>
                        <button 
                            onClick={() => setShowActivity(!showActivity)}
                            className={styles.mobileActivityToggle}
                        >
                            {showActivity ? 'Ocultar' : 'Ver'}
                            <span className={`${styles.mobileActivityArrow} ${showActivity ? styles.mobileActivityArrowOpen : ''}`}>▼</span>
                        </button>
                    </div>
                    
                    {showActivity && (
                        loadingTrades ? (
                            <div className={styles.mobileLoadingActivity}>Cargando actividad...</div>
                        ) : tradeHistory.length === 0 ? (
                            <div className={styles.mobileNoData}>
                                <p className={styles.mobileNoDataText}>No hay actividad reciente.</p>
                            </div>
                        ) : (
                            <div className={styles.mobileActivityList}>
                                {tradeHistory.slice(0, 10).map((trade, idx) => (
                                    <div key={idx} className={`${styles.mobileActivityCard} glass-panel`}>
                                        <div className={styles.mobileAssetInfo}>
                                            <div className={`${styles.mobileActivityIconBox} ${trade.side === 'buy' ? styles.mobileActivityBuy : styles.mobileActivitySell}`}>
                                                {trade.side === 'buy' ? '↙' : '↗'}
                                            </div>
                                            <div>
                                                <p className={styles.mobileActivityName}>{trade.player_name || 'Desconocido'}</p>
                                                <p className={styles.mobileActivityMeta}>
                                                    {new Date(trade.created_at).toLocaleDateString()} • {trade.side === 'buy' ? 'Compra' : 'Venta'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className={styles.mobileAssetValueBox}>
                                            <p className={styles.mobileActivityValue}>{parseFloat(trade.total_value).toFixed(2)} €</p>
                                            <p className={styles.mobileActivityShares}>{parseFloat(trade.quantity).toFixed(4)} Acc.</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            </main>

            {/* Bottom Navigation */}
            <nav className={styles.mobileBottomNav}>
                <Link to="/home" className={styles.mobileNavLink}>
                    <span className={styles.mobileNavText}>Inicio</span>
                </Link>
                <Link to="/portfolio" className={`${styles.mobileNavLink} ${styles.mobileNavLinkActive}`}>
                    <div className={styles.mobileNavLinkActiveBar}></div>
                    <span className={`${styles.mobileNavText} ${styles.mobileNavTextActive}`}>Portfolio</span>
                </Link>
                <Link to="/market" className={styles.mobileNavLink}>
                    <span className={styles.mobileNavText}>Mercado</span>
                </Link>
                <div 
                    onClick={() => window.location.href = '/profile'}
                    className={styles.mobileNavLink}
                >
                    <div className={styles.mobileNavAvatar}>
                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                </div>
            </nav>
        </div>
    );
};

export default PortfolioMobile;
