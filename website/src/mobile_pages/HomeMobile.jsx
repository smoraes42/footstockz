import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import fsLogo from '../assets/fs-logo.png';

import { getPlayers, getPortfolio, getPortfolioHistory, getMe } from '../services/api';
import { useSocket } from '../context/SocketContext';


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
        <div style={{ backgroundColor: 'var(--bg-main)', height: '100dvh', overflow: 'hidden', width: '100%', display: 'flex', flexDirection: 'column' }}>

            {/* Top Header Mobile */}
            <header style={{
                padding: '0 1.5rem',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                backgroundColor: 'rgba(16,16,16,0.9)',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                height: '60px',
                boxSizing: 'border-box'
            }}>
                <img src={fsLogo} alt="Futstocks Logo" style={{ height: '22px' }} />
                <div style={{ width: '22px' }} />
            </header>

            {/* Main Content Area Mobile */}
            <main style={{ flex: 1, padding: '1.5rem', paddingBottom: '80px', overflowY: 'auto' }}>
                <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--accent-neon)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1.5rem', marginTop: '0', textAlign: 'left' }}>Cartera</h2>
                
                {/* Cartera Main Display */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
                        {loadingPortfolio ? '---' : formatCompactNumber(displayValue)} €
                    <span style={{ color: variation24h.amount >= 0 ? 'var(--accent-neon)' : 'var(--error-red)', fontWeight: '600', fontSize: '1rem', marginTop: '0.5rem', backgroundColor: variation24h.amount >= 0 ? 'rgba(57,255,20,0.1)' : 'rgba(255,77,77,0.1)', padding: '4px 12px', borderRadius: '20px' }}>
                        {variation24h.amount >= 0 ? '+' : '-'} {Math.abs(variation24h.amount).toFixed(2)} € ({variation24h.percent.toFixed(2)}%)
                    </span>
                </div>

                {/* Timeframes */}
                <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '1rem', msOverflowStyle: 'none', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                    <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--surface-dark)', padding: '4px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', minWidth: 'max-content' }}>
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
                <div style={{ height: '220px', width: '100%', marginBottom: '2rem', marginLeft: '-15px', minWidth: 0, position: 'relative' }}>
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
                                            <div style={{
                                                backgroundColor: 'rgba(20, 20, 20, 0.95)',
                                                border: '1px solid rgba(57, 255, 20, 0.4)',
                                                borderRadius: '8px',
                                                padding: '8px 12px',
                                                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                                                backdropFilter: 'blur(8px)',
                                            }}>
                                                <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.65rem', marginBottom: '2px', textTransform: 'uppercase' }}>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h2 style={{ fontSize: '0.90rem', fontWeight: '800', color: 'var(--accent-neon)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem', marginTop: '0', textAlign: 'left' }}>Top Jugadores</h2>
                        <Link to="/market" style={{ color: 'var(--accent-neon)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: '600' }}>Ver todos</Link>
                    </div>

                    {loadingPlayers ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Cargando jugadores...</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {players.slice(0, 10).map((player, idx) => (
                                <Link 
                                    to={`/market/player/${player.id}`} 
                                    key={player.id} 
                                    className="glass-panel" 
                                    style={{ 
                                        padding: '1rem', 
                                        borderRadius: '16px', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'space-between', 
                                        textDecoration: 'none', 
                                        color: 'inherit',
                                        position: 'relative',
                                        transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                        border: player.id === updatedPlayerId ? '1px solid var(--accent-neon)' : '1px solid rgba(255,255,255,0.05)',
                                        transform: player.id === updatedPlayerId ? 'scale(1.02)' : 'scale(1)',
                                        boxShadow: player.id === updatedPlayerId ? '0 0 10px rgba(57, 255, 20, 0.15)' : 'none'
                                    }}
                                >
                                    <div style={{ position: 'absolute', left: 0, top: 0, padding: '2px 6px', backgroundColor: 'rgba(57,255,20,0.1)', color: 'var(--accent-neon)', fontSize: '0.6rem', fontWeight: '900', borderBottomRightRadius: '8px' }}>
                                        #{idx + 1}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ width: '42px', height: '42px', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'var(--surface-dark)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                            <img 
                                                src={`${import.meta.env.VITE_API_URL}/api/v1/players/${player.id}/image`}
                                                alt={player.name}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                            />
                                            <span style={{ fontSize: '1.25rem', position: 'absolute' }}>👤</span>
                                        </div>
                                        <div>
                                            <p style={{ fontWeight: '800', margin: 0, fontSize: '0.9rem', color: '#fff' }}>{player.name}</p>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: 0, fontWeight: '500' }}>{player.team}</p>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <p style={{ fontWeight: '900', margin: 0, fontSize: '1rem', color: 'var(--text-main)' }}>{Number(player.price).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
                                        <p style={{ color: player.change >= 0 ? 'var(--accent-neon)' : 'var(--error-red)', margin: 0, fontSize: '0.75rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px' }}>
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
            <nav style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                width: '100%',
                backgroundColor: 'rgba(28,28,28,0.95)',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                zIndex: 20,
                paddingBottom: 'env(safe-area-inset-bottom)'
            }}>
                <Link to="/home" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', padding: '12px 0', textDecoration: 'none', color: 'var(--accent-neon)' }}>
                    <div style={{ width: '20px', height: '2px', backgroundColor: 'var(--accent-neon)', borderRadius: '2px', position: 'absolute', top: 0 }}></div>
                    <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>Inicio</span>
                </Link>
                <Link to="/portfolio" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', padding: '12px 0', textDecoration: 'none', color: 'var(--text-muted)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>Portfolio</span>
                </Link>
                <Link to="/market" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', padding: '12px 0', textDecoration: 'none', color: 'var(--text-muted)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>Mercado</span>
                </Link>
                <div 
                    onClick={() => window.location.href = '/profile'}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px 0', color: 'var(--text-muted)' }}
                >
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--surface-lighter)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '0.7rem' }}>
                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                </div>
            </nav>
        </div>
    );
};

export default HomeMobile;
