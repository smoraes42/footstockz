import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import fsLogo from '../assets/fs-logo.png';

import { getPlayers, getPortfolio, getPortfolioHistory, getMe } from '../services/api';
import { useSocket } from '../context/SocketContext';
import styles from '../styles/Home.module.css';


const formatCompactNumber = (number) => {
    if (number >= 1000000) {
        return (number / 1000000).toFixed(1) + 'M';
    }
    if (number >= 1000) {
        return (number / 1000).toFixed(1) + 'K';
    }
    return Number(number).toFixed(2);
};

const HomeMobile = () => {
    const [chartData, setChartData] = useState([]);
    const [portfolio, setPortfolio] = useState(null);
    const [loadingPortfolio, setLoadingPortfolio] = useState(true);
    const [activeTimeframe, setActiveTimeframe] = useState('D');
    const [players, setPlayers] = useState([]);
    const [loadingPlayers, setLoadingPlayers] = useState(true);
    const [updatedPlayerId, setUpdatedPlayerId] = useState(null);
    const [variation24h, setVariation24h] = useState({ amount: 0, percent: 0 });
    const [user, setUser] = useState(null);
    const { socket, connected } = useSocket();


    const timeframes = ['D', 'W', 'M', 'Y', 'Max'];

    useEffect(() => {
        const fetchPlayers = async () => {
            try {
                const data = await getPlayers({ sort_by: 'price', sort_dir: 'desc', limit: 20 });
                // Using actual data structure if it's an object with .data
                const playersArray = data.data || data;
                const playersWithPrices = playersArray.map(p => {
                    const priceNum = parseFloat(p.price) || 0;
                    const changeNum = parseFloat(p.change || 0);
                    return { ...p, price: priceNum, change: changeNum };
                });
                setPlayers(playersWithPrices);
            } catch (error) {
                console.error('Failed to load players:', error);
            } finally {
                setLoadingPlayers(false);
            }
        };
        fetchPlayers();
    }, []);

    // WebSocket Price Updates
    useEffect(() => {
        if (!socket || !connected) return;

        let debounceTimer;
        const handlePriceUpdate = (data) => {
            // 1. Update existing players in state
            setPlayers(prev => {
                const updated = prev.map(p =>
                    p.id === data.playerId ? { ...p, price: data.price, change: data.change } : p
                );
                return [...updated].sort((a, b) => b.price - a.price);
            });

            // 2. Highlighting
            setUpdatedPlayerId(data.playerId);
            setTimeout(() => setUpdatedPlayerId(null), 1000);

            // 3. Debounced re-fetch
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                // Re-fetch players to ensure sorting and other data are fresh
                const fetchPlayers = async () => {
                    try {
                        const data = await getPlayers({ sort_by: 'price', sort_dir: 'desc', limit: 20 });
                        const playersArray = data.data || data;
                        const playersWithPrices = playersArray.map(p => {
                            const priceNum = parseFloat(p.price) || 0;
                            const changeNum = parseFloat(p.change || 0);
                            return { ...p, price: priceNum, change: changeNum };
                        });
                        setPlayers(playersWithPrices);
                    } catch (error) {
                        console.error('Failed to load players:', error);
                    }
                };
                fetchPlayers();
            }, 3000);

            // Update portfolio value if player in holdings
            setPortfolio(prevPortfolio => {
                if (!prevPortfolio || !prevPortfolio.holdings) return prevPortfolio;
                
                const updatedHoldings = prevPortfolio.holdings.map(h => {
                    if (h.player_id === data.playerId) {
                        return { ...h, current_price: data.price, position_value: h.shares * data.price };
                    }
                    return h;
                });

                return { ...prevPortfolio, holdings: updatedHoldings };
            });
        };

        const handleTradeExecuted = (data) => {
            fetchData();
            fetchHistory();
        };

        socket.on('price_update', handlePriceUpdate);
        socket.on('trade_executed', handleTradeExecuted);

        return () => {
            clearTimeout(debounceTimer);
            socket.off('price_update', handlePriceUpdate);
            socket.off('trade_executed', handleTradeExecuted);
        };
    }, [socket, connected]);


    const fetchData = async () => {
        try {
            const [portData, userData] = await Promise.all([
                getPortfolio(),
                getMe()
            ]);
            setPortfolio(portData);
            setUser(userData);
        } catch (error) {
            console.error('Failed to load home data:', error);
        } finally {
            setLoadingPortfolio(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchHistory = async () => {
        try {
            const historyData = await getPortfolioHistory(activeTimeframe);
            // Backend now appends a live sentinel
            // Create 24 hourly buckets for the '1D' timeframe
            let formattedData = historyData.map(point => ({
                timestamp: new Date(point.time).getTime(),
                value: point.value
            }));

            if (activeTimeframe === 'D') {
                const now = new Date();
                const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                const normalized = [];
                
                for (let i = 0; i <= 24; i++) {
                    const bucketTime = new Date(start.getTime() + i * 60 * 60 * 1000);
                    const ts = bucketTime.getTime();
                    
                    // Find the last known value before or at this bucket time
                    const lastKnown = formattedData.reduce((prev, curr) => {
                        if (curr.timestamp <= ts && (prev === null || curr.timestamp > prev.timestamp)) {
                            return curr;
                        }
                        return prev;
                    }, null);
                    
                    normalized.push({
                        timestamp: ts,
                        value: lastKnown ? lastKnown.value : (normalized.length > 0 ? normalized[normalized.length - 1].value : 0)
                    });
                }
                formattedData = normalized;
            } else if (activeTimeframe === 'W') {
                const now = new Date();
                const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                const normalized = [];
                
                for (let i = 0; i <= 7; i++) {
                    const bucketTime = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
                    const ts = bucketTime.getTime();
                    
                    const lastKnown = formattedData.reduce((prev, curr) => {
                        if (curr.timestamp <= ts && (prev === null || curr.timestamp > prev.timestamp)) {
                            return curr;
                        }
                        return prev;
                    }, null);
                    
                    normalized.push({
                        timestamp: ts,
                        value: lastKnown ? lastKnown.value : (normalized.length > 0 ? normalized[normalized.length - 1].value : 0)
                    });
                }
                formattedData = normalized;
            } else if (activeTimeframe === 'M') {
                const now = new Date();
                const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                const normalized = [];
                
                for (let i = 0; i <= 30; i++) {
                    const bucketTime = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
                    const ts = bucketTime.getTime();
                    
                    const lastKnown = formattedData.reduce((prev, curr) => {
                        if (curr.timestamp <= ts && (prev === null || curr.timestamp > prev.timestamp)) {
                            return curr;
                        }
                        return prev;
                    }, null);
                    
                    normalized.push({
                        timestamp: ts,
                        value: lastKnown ? lastKnown.value : (normalized.length > 0 ? normalized[normalized.length - 1].value : 0)
                    });
                }
                formattedData = normalized;
            } else if (activeTimeframe === 'Y') {
                const now = new Date();
                const normalized = [];
                
                for (let i = 0; i <= 12; i++) {
                    const bucketTime = new Date(now.getFullYear(), now.getMonth() - (12 - i), now.getDate(), now.getHours(), now.getMinutes());
                    const ts = bucketTime.getTime();
                    
                    const lastKnown = formattedData.reduce((prev, curr) => {
                        if (curr.timestamp <= ts && (prev === null || curr.timestamp > prev.timestamp)) {
                            return curr;
                        }
                        return prev;
                    }, null);
                    
                    normalized.push({
                        timestamp: ts,
                        value: lastKnown ? lastKnown.value : (normalized.length > 0 ? normalized[normalized.length - 1].value : 0)
                    });
                }
                formattedData = normalized;
            } else if (activeTimeframe === 'Max') {
                if (portfolio && portfolio.walletCreatedAt) {
                    const now = new Date();
                    const walletStartTs = new Date(portfolio.walletCreatedAt).getTime();
                    const normalized = [{ timestamp: walletStartTs, value: 0 }];
                    
                    // Start buckets from the 1st of the month following the wallet creation
                    let current = new Date(walletStartTs);
                    current.setMonth(current.getMonth() + 1);
                    current.setDate(1);
                    current.setHours(0, 0, 0, 0);

                    while (current <= now) {
                        const ts = current.getTime();
                        const lastKnown = formattedData.reduce((prev, curr) => {
                            if (curr.timestamp <= ts && (prev === null || curr.timestamp > prev.timestamp)) {
                                return curr;
                            }
                            return prev;
                        }, null);
                        
                        normalized.push({
                            timestamp: ts,
                            value: lastKnown ? lastKnown.value : normalized[normalized.length - 1].value
                        });
                        
                        current.setMonth(current.getMonth() + 1);
                    }
                    
                    const finalPoint = formattedData.length > 0 ? formattedData[formattedData.length - 1] : { timestamp: now.getTime(), value: 0 };
                    if (normalized[normalized.length - 1].timestamp < finalPoint.timestamp) {
                        normalized.push(finalPoint);
                    }
                    
                    formattedData = normalized;
                }
            }

            setChartData(formattedData);
        } catch (error) {
            console.error('Failed to load portfolio history:', error);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [activeTimeframe, portfolio?.walletCreatedAt]);

    useEffect(() => {
        const fetch24hVariation = async () => {
            try {
                const history24h = await getPortfolioHistory('1D');
                if (history24h && history24h.length > 0 && portfolio) {
                    const firstValue = history24h[0].value;
                    const currentValue = portfolio.walletBalance + (portfolio.holdings?.reduce((acc, h) => acc + h.position_value, 0) || 0);
                    const diff = currentValue - firstValue;
                    const percent = firstValue !== 0 ? (diff / firstValue) * 100 : 0;
                    setVariation24h({ amount: diff, percent });
                }
            } catch (error) {
                console.error('Failed to fetch 24h variation:', error);
            }
        };

        if (portfolio) {
            fetch24hVariation();
        }
    }, [portfolio]);

    const displayValue = portfolio ? portfolio.walletBalance + (portfolio.holdings?.reduce((acc, h) => acc + h.position_value, 0) || 0) : 0;

    // Custom hover state for smooth chart tracking
    const [hoverInfo, setHoverInfo] = useState(null);
    const handleChartMouseMove = (e) => {
        if (!e || !e.activePayload || !e.activePayload.length) { setHoverInfo(null); return; }
        const payload = e.activePayload[0].payload;
        setHoverInfo({ timestamp: payload.timestamp, value: payload.value });
    };

    return (
        <div className={styles.mobileContainer}>

            {/* Top Header Mobile */}
            <header className={styles.mobileHeader}>
                <img src={fsLogo} alt="Futstocks Logo" className={styles.mobileLogo} />
                <div className={styles.mobileNavSpacer} />
            </header>

            {/* Main Content Area Mobile */}
            <main className={styles.mobileMain}>
                <h2 className={styles.mobileSectionTitle}>Cartera</h2>
                
                {/* Cartera Main Display */}
                <div className={styles.mobilePortfolioValue}>
                        {loadingPortfolio ? '---' : formatCompactNumber(displayValue)} €
                    <span className={`${styles.mobilePortfolioVariation} ${variation24h.amount >= 0 ? styles.mobileVariationPositive : styles.mobileVariationNegative}`}>
                        {variation24h.amount >= 0 ? '+' : '-'} {Math.abs(variation24h.amount).toFixed(2)} € ({variation24h.percent.toFixed(2)}%)
                    </span>
                </div>

                {/* Timeframes */}
                <div className={styles.mobileTimeframeContainer}>
                    <div className={styles.mobileTimeframeList}>
                        {timeframes.map(tf => (
                            <button
                                key={tf}
                                className={`timeframe-btn ${activeTimeframe === tf ? 'active' : ''}`}
                                onClick={() => setActiveTimeframe(tf)}
                            >
                                {tf}
                            </button>
                        ))}
                    </div>
                </div>
                {/* Cartera Chart */}
                <div className={styles.mobileChartContainer}>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id="colorValueMobile" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="var(--accent-neon)" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="var(--accent-neon)" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis
                                dataKey="timestamp"
                                type="number"
                                domain={['dataMin', 'dataMax']}
                                stroke="var(--text-muted)"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                dy={10}
                                tickFormatter={(unixTime) => {
                                    const date = new Date(unixTime);
                                if (activeTimeframe === 'D') {
                                    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
                                } else if (activeTimeframe === 'W') {
                                    return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
                                } else if (activeTimeframe === 'Y') {
                                    return date.toLocaleDateString('es-ES', { month: 'short' });
                                } else if (activeTimeframe === 'Max') {
                                    return date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
                                }
                                    return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
                                }}
                                ticks={(() => {
                                    if (activeTimeframe === 'D') { // Renamed from '1D'
                                        return chartData.filter((_, i) => i % 6 === 0).map(d => d.timestamp);
                                    }
                                    if (activeTimeframe === 'W') { // Renamed from '1W'
                                        return chartData.map(d => d.timestamp);
                                    }
                                    if (activeTimeframe === 'M') { // Renamed from '1M'
                                        // Every 6 days for 1M on mobile
                                        return chartData.filter((_, i) => i % 6 === 0).map(d => d.timestamp);
                                    }
                                    if (activeTimeframe === 'Y') { // Renamed from '1Y'
                                        // Every 3 months for 1Y on mobile
                                        return chartData.filter((_, i) => i % 3 === 0).map(d => d.timestamp);
                                    }
                                    if (activeTimeframe === 'Max') {
                                        // Every 4 to 8 months depending on length for mobile
                                        const interval = chartData.length > 24 ? 8 : 4;
                                        return chartData.filter((_, i) => i % interval === 0 || i === chartData.length - 1).map(d => d.timestamp);
                                    }
                                    return undefined;
                                })()}
                            />
                            <YAxis
                                domain={['auto', 'auto']}
                                hide={true}
                            />
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0].payload;
                                        return (
                                            <div className={styles.mobileTooltip}>
                                                <div className={styles.mobileTooltipTime}>
                                                    {new Date(data.timestamp).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })}
                                                </div>
                                                    {Number(data.value).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                                cursor={{ stroke: 'rgba(57, 255, 20, 0.3)', strokeWidth: 1.5 }}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="var(--accent-neon)"
                                strokeWidth={2.5}
                                fillOpacity={1}
                                fill="url(#colorValueMobile)"
                                dot={false}
                                activeDot={{ r: 5, strokeWidth: 0, fill: 'var(--accent-neon)' }}
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Players List Section */}
                <div>
                    <div className={styles.mobileTopPlayersHeader}>
                        <h2 className={styles.mobileTopPlayersTitle}>Top Jugadores</h2>
                        <Link to="/market" className={styles.mobileViewAll}>Ver todos</Link>
                    </div>

                    {loadingPlayers ? (
                        <div className={styles.loading}>Cargando jugadores...</div>
                    ) : (
                        <div className={styles.mobilePlayerList}>
                            {players.slice(0, 10).map((player, idx) => (
                                <Link 
                                    to={`/market/player/${player.id}`} 
                                    key={player.id} 
                                    className={`${styles.mobilePlayerCard} ${player.id === updatedPlayerId ? styles.mobilePlayerCardActive : ''} glass-panel`} 
                                >
                                    <div className={styles.mobilePlayerRank}>
                                        #{idx + 1}
                                    </div>
                                    <div className={styles.mobilePlayerInfo}>
                                        <div className={styles.mobilePlayerAvatarBox}>
                                            <img 
                                                src={`${import.meta.env.VITE_API_URL}/v1/players/${player.id}/image`}
                                                alt={player.name}
                                                className={styles.mobilePlayerAvatarImg}
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                            <span className={styles.mobilePlayerAvatarPlaceholder}>👤</span>
                                        </div>
                                        <div>
                                            <p className={styles.mobilePlayerName}>{player.name}</p>
                                            <p className={styles.mobilePlayerTeam}>{player.team}</p>
                                        </div>
                                    </div>
                                    <div className={styles.mobilePlayerPriceBox}>
                                        <p className={styles.mobilePlayerPrice}>{Number(player.price).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
                                        <p className={`${styles.mobilePlayerChange} ${player.change >= 0 ? styles.mobilePriceUp : styles.mobilePriceDown}`}>
                                            {player.change >= 0 ? '▲' : '▼'} {Math.abs(player.change)}%
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Bottom Navigation Mobile */}
            <nav className={styles.mobileBottomNav}>
                <Link to="/home" className={`${styles.mobileNavLink} ${styles.mobileNavLinkActive}`}>
                    <div className={styles.mobileNavLinkActiveBar}></div>
                    <span className={`${styles.mobileNavText} ${styles.mobileNavTextActive}`}>Inicio</span>
                </Link>
                <Link to="/portfolio" className={styles.mobileNavLink}>
                    <span className={styles.mobileNavText}>Portfolio</span>
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

export default HomeMobile;
