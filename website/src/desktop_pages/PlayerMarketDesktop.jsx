import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { toast } from 'react-toastify';
import { getPortfolio, getPlayerById } from '../services/api';
import fsLogo from '../assets/fs-logo.png';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';


const playSuccessSound = () => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();

        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        // Use a clean sine wave for a gentle sound
        osc.type = 'sine';

        // Start at a lower, gentle frequency (e.g., 400Hz) and drop it slightly
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);

        // Very fast attack and quick decay for a "pop"
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.01); // Quick attack to 40% volume
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15); // Fast fade out

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.2); // Total duration 200ms
    } catch (e) {
        console.error("Audio playback failed", e);
    }
};

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/v1`;

const formatEU = (val, decimals = 2) => {
    if (val === null || val === undefined || val === '') return '';
    let num;
    if (typeof val === 'string') {
        if (val.includes(',')) {
            num = parseFloat(val.replace(/\./g, '').replace(',', '.'));
        } else {
            num = parseFloat(val);
        }
    } else {
        num = val;
    }
    if (isNaN(num)) return val;
    return num.toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const parseEU = (str) => {
    if (typeof str !== 'string' || !str) return typeof str === 'number' ? str : 0;
    if (str.includes(',')) {
        const sanitized = str.replace(/\./g, '').replace(',', '.');
        return parseFloat(sanitized) || 0;
    }
    return parseFloat(str) || 0;
};

export default function PlayerMarketDesktop() {
    const { playerId } = useParams();
    const navigate = useNavigate();

    const [currentPlayer, setCurrentPlayer] = useState(null);
    const [portfolio, setPortfolio] = useState(null);
    const [priceHistory, setPriceHistory] = useState([]);
    const [tradeHistory, setTradeHistory] = useState([]);

    // Trade Forms
    const [orderAmount, setOrderAmount] = useState('');
    const [orderPrice, setOrderPrice] = useState('');
    const [marketBuyTotal, setMarketBuyTotal] = useState('');
    const [marketBuyQty, setMarketBuyQty] = useState('');
    const [marketSellQty, setMarketSellQty] = useState('');
    const [marketSellTotal, setMarketSellTotal] = useState('');
    const [activeTab, setActiveTab] = useState('buy');
    const [kFactor, setKFactor] = useState(0.0001);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { socket, connected, subscribeToPlayer, unsubscribeFromPlayer, subscribeToUser, unsubscribeFromUser } = useSocket();
    const { user } = useAuth();

    const fetchData = useCallback(async () => {
        if (!playerId) return;

        try {
            const [hRes, tRes, port, pData] = await Promise.all([
                fetch(`${API_BASE}/players/${playerId}/history`),
                fetch(`${API_BASE}/trades/history/${playerId}`, { credentials: 'include' }),
                getPortfolio(),
                getPlayerById(playerId)
            ]);

            const historyData = await hRes.json();
            const tradesData = await tRes.json();

            const history = Array.isArray(historyData) ? historyData : [];
            const trades = Array.isArray(tradesData) ? tradesData : [];

            // Format time for Recharts
            const formattedHistory = (history || []).map(h => ({
                ...h,
                time: new Date(h.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            }));

            setPriceHistory(formattedHistory);
            setTradeHistory(trades || []);
            setPortfolio(port);
            setCurrentPlayer(pData);
        } catch (err) {
            console.error('Fetch error:', err);
        }
    }, [playerId]);

    // Initial Fetch
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // WebSocket Listeners
    useEffect(() => {
        if (!socket || !connected || !playerId) return;

        subscribeToPlayer(playerId);

        const handlePriceUpdate = (data) => {
            if (data.playerId === parseInt(playerId)) {
                // Update specific player state
                setCurrentPlayer(prev => prev ? { ...prev, price: data.price, change: parseFloat(data.change || 0) } : null);
                
                // Update price history (add new point)
                setPriceHistory(prev => {
                    const newPoint = {
                        price: data.price,
                        time: new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    };
                    const updated = [...prev, newPoint];
                    return updated.slice(-100); // Keep last 100 points
                });
            }
        };

        const handleTradeExecuted = (trade) => {
            if (trade.playerId === parseInt(playerId)) {
                setTradeHistory(prev => {
                    const updated = [trade, ...prev];
                    return updated.slice(0, 100); // Keep last 100 trades
                });
            }
        };

        const handlePortfolioUpdate = () => {
            getPortfolio().then(setPortfolio).catch(console.error);
        };

        socket.on('price_update', handlePriceUpdate);
        socket.on('trade_executed', handleTradeExecuted);
        socket.on('portfolio_update', handlePortfolioUpdate);

        return () => {
            unsubscribeFromPlayer(playerId);
            socket.off('price_update', handlePriceUpdate);
            socket.off('trade_executed', handleTradeExecuted);
            socket.off('portfolio_update', handlePortfolioUpdate);
        };
    }, [socket, connected, playerId, subscribeToPlayer, unsubscribeFromPlayer]);


    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const res = await fetch(`${API_BASE}/trades/config`);
                const config = await res.json();
                if (config.PRICE_IMPACT_FACTOR) {
                    setKFactor(config.PRICE_IMPACT_FACTOR);
                }
            } catch (error) {
                console.error('Failed to fetch config:', error);
            }
        };
        fetchConfig();
    }, []);

    useEffect(() => {
        if (user && user.id) {
            subscribeToUser(user.id);
            return () => unsubscribeFromUser(user.id);
        }
    }, [user, subscribeToUser, unsubscribeFromUser]);

    const calculateQuantityFromValue = (value, p0) => {
        if (!value || !p0 || p0 <= 0) return '';
        const v = parseEU(value);
        // Exponential: Q = ln(V*k/p0 + 1) / k
        const q = Math.log((v * kFactor / p0) + 1) / kFactor;
        return formatEU(q, 4);
    };

    const calculateValueFromQuantity = (q, p0) => {
        if (!q || !p0 || p0 <= 0) return '';
        const qty = parseEU(q);
        // Exponential: V = (p0/k) * (e^(kQ) - 1)
        const v = (p0 / kFactor) * (Math.exp(kFactor * qty) - 1);
        return formatEU(v, 2);
    };

    const calculateQuantityFromSellValue = (value, p0) => {
        if (!value || !p0 || p0 <= 0) return '';
        const v = parseEU(value);
        // Exponential: Q = -ln(1 - V*k/p0) / k
        const inner = 1 - (v * kFactor / p0);
        if (inner <= 0) return formatEU(0, 2); // Should not happen with real pool
        const q = -Math.log(inner) / kFactor;
        return formatEU(q, 4);
    };

    const calculateValueFromSellQuantity = (q, p0) => {
        if (!q || !p0 || p0 <= 0) return '';
        const qty = parseEU(q);
        // Exponential: V = (p0/k) * (1 - e^(-kQ))
        const v = (p0 / kFactor) * (1 - Math.exp(-kFactor * qty));
        return formatEU(v, 2);
    };

    const handleMarketBuy = async () => {
        if (!marketBuyTotal || !marketBuyQty || !playerId) return;

        if (portfolio && parseFloat(marketBuyTotal) > portfolio.walletBalance) {
            setError("Insufficient wallet balance for this purchase.");
            return;
        }

        const currentPrice = currentPlayer?.price || 0;
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_BASE}/trades/market-buy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    playerId: parseInt(playerId),
                    totalValue: parseEU(marketBuyTotal),
                    expectedPrice: currentPrice
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to execute market buy.');

            playSuccessSound();
            toast.success("Compra Exitosa", {
                position: "top-center",
                autoClose: 3000,
                hideProgressBar: true,
                closeOnClick: true,
                theme: "dark",
            });

            setMarketBuyTotal('');
            setMarketBuyQty('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickBuy = (percentage) => {
        if (!portfolio || !currentPlayer) return;
        const maxSpend = portfolio.walletBalance || 0;
        const targetValueNumber = (maxSpend * percentage);
        const targetValue = formatEU(targetValueNumber, 2);
        setMarketBuyTotal(targetValue);

        if (currentPlayer?.price > 0) {
            setMarketBuyQty(calculateQuantityFromValue(targetValue, currentPlayer.price));
        } else {
            setMarketBuyQty('');
        }
    };

    const handleQuickSell = (percentage) => {
        if (!portfolio || !currentPlayer || !playerId) return;
        const holding = portfolio.holdings?.find(h => h.player_id === parseInt(playerId));
        const maxShares = holding ? holding.shares_owned : 0;
        if (maxShares <= 0) return;

        const targetQtyNumber = (Math.floor(maxShares * percentage * 10000) / 10000);
        const targetQty = formatEU(targetQtyNumber, 4);
        setMarketSellQty(targetQty);

        if (currentPlayer?.price > 0) {
            setMarketSellTotal(calculateValueFromSellQuantity(targetQty, currentPlayer.price));
        } else {
            setMarketSellTotal('');
        }
    };

    const handleMarketSell = async () => {
        const holding = portfolio?.holdings?.find(h => h.player_id === parseInt(playerId));
        if (!holding || parseFloat(marketSellQty) > holding.shares_owned) {
            setError("Insufficient shares held for this sale.");
            return;
        }

        const currentPrice = currentPlayer?.price || 0;
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_BASE}/trades/market-sell`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    playerId: parseInt(playerId),
                    quantity: parseEU(marketSellQty),
                    expectedPrice: currentPrice
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to execute market sell.');

            playSuccessSound();
            toast.success("Venta Exitosa", {
                position: "top-center",
                autoClose: 3000,
                hideProgressBar: true,
                closeOnClick: true,
                theme: "dark",
            });

            setMarketSellQty('');
            setMarketSellTotal('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOrder = async (side) => {
        if (!orderAmount || !orderPrice) return;
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_BASE}/trades/order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    playerId: parseInt(playerId),
                    side: side === 'BUY' ? 'Buy' : 'Sell',
                    price: parseEU(orderPrice),
                    quantity: parseEU(orderAmount)
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to place order.');

            setOrderAmount('');
            setOrderPrice('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ backgroundColor: 'var(--bg-main)', height: '100vh', width: '100%', display: 'flex' }}>
            {/* Sidebar (Similar to Home) */}
            <aside style={{
                width: '250px',
                backgroundColor: 'rgba(28,28,28,0.7)',
                borderRight: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                flexDirection: 'column',
                padding: '2rem 1.5rem',
                position: 'fixed',
                height: '100vh',
                top: 0,
                left: 0
            }}>
                <div style={{ marginBottom: '3rem', paddingLeft: '0.5rem' }}>
                    <img src={fsLogo} alt="Futstocks Logo" style={{ height: '32px' }} />
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                    <div onClick={() => navigate('/home')} className="sidebar-link" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem', padding: '12px 16px', borderRadius: '8px', color: 'var(--text-muted)', textDecoration: 'none', transition: 'all 0.2s' }}>
                        <span style={{ fontWeight: '500' }}>Inicio</span>
                    </div>
                    <div onClick={() => navigate('/portfolio')} className="sidebar-link" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem', padding: '12px 16px', borderRadius: '8px', color: 'var(--text-muted)', textDecoration: 'none', transition: 'all 0.2s' }}>
                        <span style={{ fontWeight: '500' }}>Portfolio</span>
                    </div>
                    <div onClick={() => navigate('/market')} className="sidebar-link active" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem', padding: '12px 16px', borderRadius: '8px', color: 'var(--text-main)', textDecoration: 'none', backgroundColor: 'rgba(57,255,20,0.1)', borderLeft: '3px solid var(--accent-neon)' }}>
                        <span style={{ fontWeight: '600' }}>Mercado</span>
                    </div>
                    <div onClick={() => navigate('/leaderboard')} className="sidebar-link" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem', padding: '12px 16px', borderRadius: '8px', color: 'var(--text-muted)', textDecoration: 'none', transition: 'all 0.2s' }}>
                        <span style={{ fontWeight: '500' }}>Leaderboard</span>
                    </div>
                </nav>

                <div
                    onClick={() => navigate('/profile')}
                    style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--surface-lighter)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>
                            {user?.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                            <p style={{ fontSize: '0.9rem', fontWeight: '600', margin: 0 }}>{user?.username || 'Usuario'}</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Ver perfil</p>
                        </div>
                    </div>
                </div>
            </aside>

            <main style={{ marginLeft: '250px', flex: 1, padding: '2rem 3rem', overflowY: 'auto', height: '100vh' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <button onClick={() => navigate('/market')} style={{
                        backgroundColor: 'var(--accent-neon)',
                        border: 'none',
                        color: '#000000',
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        padding: '8px 20px',
                        borderRadius: '8px',
                        fontWeight: '800',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.2s'
                    }}>Volver</button>
                    {portfolio && (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            gap: '4px'
                        }}>
                            <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px' }}>Wallet Balance:</span>
                            <span style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--accent-neon)' }}>{portfolio.walletBalance?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                        </div>
                    )}
                </div>

                <div style={styles.mainGrid}>
                    <div style={styles.leftCol}>
                        {/* Chart */}
                        <div style={styles.card}>
                            <h2 style={styles.cardTitle}>
                                {currentPlayer ? `${currentPlayer.name} Chart` : 'Loading Chart...'}
                                <span style={styles.currentPriceTag}>Current: {currentPlayer?.price?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'} €</span>
                            </h2>
                            <div style={{ width: '100%', height: 350, minWidth: 0 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={priceHistory}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                                        <XAxis dataKey="time" stroke="#666" fontSize={12} />
                                        <YAxis domain={['auto', 'auto']} stroke="#666" fontSize={12} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333', borderRadius: '8px' }}
                                            itemStyle={{ color: 'var(--accent-neon)' }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="price"
                                            stroke="var(--accent-neon)"
                                            strokeWidth={3}
                                            dot={{ r: 2, fill: 'var(--accent-neon)' }}
                                            activeDot={{ r: 5 }}
                                            animationDuration={300}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Recent Trades Tape */}
                        <div style={styles.card}>
                            <h2 style={styles.cardTitle}>Recent Trades</h2>
                            {tradeHistory.length > 0 ? (
                                <div style={{ overflowX: 'auto', maxHeight: '400px' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                                                <th style={{ padding: '8px' }}>Type</th>
                                                <th style={{ padding: '8px' }}>Price</th>
                                                <th style={{ padding: '8px' }}>Qty</th>
                                                <th style={{ padding: '8px' }}>Total (€)</th>
                                                <th style={{ padding: '8px' }}>Time</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tradeHistory.slice(0, 15).map((trade, idx) => (
                                                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                    <td style={{ padding: '8px', color: trade.side === 'buy' ? 'var(--accent-neon)' : 'var(--error-red)', fontWeight: 'bold' }}>
                                                        {trade.side === 'buy' ? 'BUY' : 'SELL'}
                                                    </td>
                                                    <td style={{ padding: '8px', color: '#fff' }}>{parseFloat(trade.price).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                                                    <td style={{ padding: '8px', color: '#ccc' }}>{parseFloat(trade.quantity).toLocaleString('es-ES', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                                                    <td style={{ padding: '8px', color: '#fff' }}>{parseFloat(trade.total_value || trade.totalValue).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                                                    <td style={{ padding: '8px', color: 'var(--text-muted)' }}>
                                                        {new Date(trade.timestamp || trade.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div style={styles.emptyBook}>No recent trades for this player.</div>
                            )}
                        </div>

                    </div>

                    <div style={styles.rightCol}>
                        {/* Your Position */}
                        <div style={styles.card}>
                            <h2 style={styles.cardTitle}>Tu Posición</h2>
                            {portfolio?.holdings?.find(h => h.player_id === parseInt(playerId)) ? (
                                <div style={styles.positionBox}>
                                    <div style={styles.posRow}>
                                        <span style={styles.label}>Acciones:</span>
                                        <span style={styles.posValue}>{portfolio.holdings.find(h => h.player_id === parseInt(playerId)).shares_owned.toFixed(4)}</span>
                                    </div>
                                    <div style={styles.posRow}>
                                        <span style={styles.label}>Valor:</span>
                                        <span style={styles.posValue}>{portfolio.holdings.find(h => h.player_id === parseInt(playerId)).position_value?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                                    </div>
                                </div>
                            ) : (
                                <div style={styles.noPosition}>No tienes acciones de este jugador.</div>
                            )}
                        </div>

                        {/* Trade Form */}
                        <div style={styles.card}>
                            <h2 style={styles.cardTitle}>Trade Order</h2>

                            <div style={styles.tabRow}>
                                <button
                                    style={{
                                        ...styles.tabButton,
                                        ...(activeTab === 'buy' ? styles.activeTabBuy : {})
                                    }}
                                    onClick={() => setActiveTab('buy')}
                                >
                                    BUY
                                </button>
                                <button
                                    style={{
                                        ...styles.tabButton,
                                        ...(activeTab === 'sell' ? styles.activeTabSell : {})
                                    }}
                                    onClick={() => setActiveTab('sell')}
                                >
                                    SELL
                                </button>
                            </div>

                            <div style={styles.orderSection}>
                                {activeTab === 'buy' && (
                                    <>
                                        <div style={styles.formRow}>
                                            <div style={{ ...styles.inputGroup, flex: 1 }}>
                                                <label style={styles.label}>Quantity</label>
                                                <input
                                                    type="text"
                                                    style={styles.input}
                                                    placeholder="0,0000"
                                                    value={marketBuyQty}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        // Allow numbers, dots, and commas
                                                        if (val && !/^[0-9.,]*$/.test(val)) return;
                                                        setMarketBuyQty(val);
                                                        if (val && currentPlayer?.price) {
                                                            setMarketBuyTotal(calculateValueFromQuantity(val, currentPlayer.price));
                                                        } else {
                                                            setMarketBuyTotal('');
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <div style={{ ...styles.inputGroup, flex: 1 }}>
                                                <label style={styles.label}>Value (€)</label>
                                                <input
                                                    type="text"
                                                    style={{
                                                        ...styles.input,
                                                        color: portfolio && parseEU(marketBuyTotal) > portfolio.walletBalance ? '#ff3d00' : '#fff'
                                                    }}
                                                    placeholder="0,00"
                                                    value={marketBuyTotal}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        if (val && !/^[0-9.,]*$/.test(val)) return;
                                                        setMarketBuyTotal(val);
                                                        if (val && currentPlayer?.price) {
                                                            setMarketBuyQty(calculateQuantityFromValue(val, currentPlayer.price));
                                                        } else {
                                                            setMarketBuyQty('');
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div style={styles.quickSelectRow}>
                                            <button style={styles.quickSelectBtn} onClick={() => handleQuickBuy(0.25)}>25%</button>
                                            <button style={styles.quickSelectBtn} onClick={() => handleQuickBuy(0.50)}>50%</button>
                                            <button style={styles.quickSelectBtn} onClick={() => handleQuickBuy(1.00)}>100%</button>
                                        </div>


                                        <div style={{ ...styles.buttonRow, marginTop: '20px' }}>
                                            <button
                                                disabled={loading}
                                                style={{ ...styles.buyButton, width: '50%' }}
                                                onClick={handleMarketBuy}
                                            >
                                                {loading ? '...' : 'MARKET BUY'}
                                            </button>
                                        </div>
                                    </>
                                )}

                                {activeTab === 'sell' && (
                                    <>
                                        <div style={styles.formRow}>
                                            <div style={{ ...styles.inputGroup, flex: 1 }}>
                                                <label style={styles.label}>Quantity</label>
                                                <input
                                                    type="text"
                                                    style={{
                                                        ...styles.input,
                                                        color: portfolio && portfolio.holdings?.find(h => h.player_id === parseInt(playerId)) && parseEU(marketSellQty) > portfolio.holdings.find(h => h.player_id === parseInt(playerId)).shares_owned ? '#ff3d00' : '#fff'
                                                    }}
                                                    placeholder="0,0000"
                                                    value={marketSellQty}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        if (val && !/^[0-9.,]*$/.test(val)) return;
                                                        setMarketSellQty(val);
                                                        if (val && currentPlayer?.price) {
                                                            setMarketSellTotal(calculateValueFromSellQuantity(val, currentPlayer.price));
                                                        } else {
                                                            setMarketSellTotal('');
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <div style={{ ...styles.inputGroup, flex: 1 }}>
                                                <label style={styles.label}>Value (€)</label>
                                                <input
                                                    type="text"
                                                    style={styles.input}
                                                    placeholder="0,00"
                                                    value={marketSellTotal}
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        if (val && !/^[0-9.,]*$/.test(val)) return;
                                                        setMarketSellTotal(val);
                                                        if (val && currentPlayer?.price) {
                                                            setMarketSellQty(calculateQuantityFromSellValue(val, currentPlayer.price));
                                                        } else {
                                                            setMarketSellQty('');
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div style={styles.quickSelectRow}>
                                            <button style={styles.quickSelectBtn} onClick={() => handleQuickSell(0.25)}>25%</button>
                                            <button style={styles.quickSelectBtn} onClick={() => handleQuickSell(0.50)}>50%</button>
                                            <button style={styles.quickSelectBtn} onClick={() => handleQuickSell(1.00)}>100%</button>
                                        </div>


                                        <div style={{ ...styles.buttonRow, marginTop: '20px' }}>
                                            <button
                                                disabled={loading}
                                                style={{ ...styles.sellButton, width: '50%' }}
                                                onClick={handleMarketSell}
                                            >
                                                {loading ? '...' : 'MARKET SELL'}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                        {error && (
                            <div style={{ ...styles.errorBanner, marginTop: '20px', marginBottom: '0' }}>
                                {error}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

const styles = {
    // container: {
    //     padding: '30px',
    //     maxWidth: '1400px',
    //     margin: '0 auto',
    //     backgroundColor: 'var(--bg-main)',
    //     minHeight: '100vh',
    //     display: 'flex',
    //     flexDirection: 'column',
    //     gap: '20px',
    //     overflowY: 'auto'
    // },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    backButton: {
        background: 'none',
        border: 'none',
        color: 'var(--text-main)',
        fontSize: '1rem',
        cursor: 'pointer',
        padding: '10px 0',
        fontWeight: 'bold'
    },
    errorBanner: {
        backgroundColor: '#ff525222',
        color: '#ff5252',
        padding: '12px 20px',
        borderRadius: '8px',
        border: '1px solid #ff525244',
        fontSize: '0.9rem'
    },
    walletInfo: {
        marginLeft: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '4px'
    },
    walletValue: {
        fontSize: '1.4rem',
        fontWeight: '700',
        color: 'var(--accent-neon)'
    },
    label: {
        fontSize: '0.75rem',
        color: '#666',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '1px'
    },
    input: {
        padding: '14px 18px',
        borderRadius: '12px',
        backgroundColor: '#000',
        border: '1px solid #333',
        color: '#fff',
        fontSize: '1rem',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box',
        transition: 'border-color 0.2s',
    },
    tabRow: {
        display: 'flex',
        marginBottom: '20px',
        gap: '10px',
        backgroundColor: '#0a0a0a',
        padding: '5px',
        borderRadius: '12px',
        border: '1px solid #222',
    },
    tabButton: {
        flex: 1,
        padding: '12px 16px',
        borderRadius: '8px',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: 'transparent',
        backgroundColor: 'transparent',
        color: '#888',
        fontSize: '1rem',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    positionBox: {
        backgroundColor: '#0a0a0a',
        padding: '15px 20px',
        borderRadius: '12px',
        border: '1px solid #222',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        height: '80px',
        justifyContent: 'center',
        boxSizing: 'border-box',
    },
    posRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    posValue: {
        fontWeight: 'bold',
        fontSize: '1.1rem',
        color: '#fff',
    },
    noPosition: {
        color: '#666',
        fontStyle: 'italic',
        backgroundColor: '#0a0a0a',
        padding: '15px 20px',
        borderRadius: '12px',
        border: '1px solid #222',
        height: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
    },
    activeTabBuy: {
        backgroundColor: 'rgba(57, 255, 20, 0.15)',
        color: 'var(--accent-neon)',
        borderColor: 'var(--accent-neon)',
    },
    activeTabSell: {
        backgroundColor: 'rgba(255, 77, 77, 0.15)',
        color: 'var(--error-red)',
        borderColor: 'var(--error-red)',
    },
    mainGrid: {
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 1fr)',
        gap: '30px',
        flex: 1
    },
    leftCol: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
    },
    rightCol: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
    },
    card: {
        backgroundColor: '#0a0a0a',
        borderRadius: '24px',
        padding: '24px',
        border: '1px solid #1a1a1a',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    },
    cardTitle: {
        fontSize: '1.3rem',
        fontWeight: '700',
        marginBottom: '24px',
        color: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    cardTitleSmall: {
        fontSize: '1rem',
        fontWeight: '700',
        margin: '20px 0 12px 0',
        color: '#444',
        textTransform: 'uppercase',
    },
    currentPriceTag: {
        fontSize: '0.9rem',
        backgroundColor: 'rgba(57, 255, 20, 0.1)',
        color: 'var(--accent-neon)',
        padding: '6px 14px',
        borderRadius: '100px',
        border: '1px solid rgba(57, 255, 20, 0.2)'
    },
    formRow: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
        marginBottom: '20px',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    buttonRow: {
        display: 'flex',
        justifyContent: 'center',
    },
    buyButton: {
        padding: '18px',
        border: 'none',
        borderRadius: '14px',
        backgroundColor: 'var(--accent-neon)',
        color: '#000',
        fontWeight: '900',
        fontSize: '0.9rem',
        cursor: 'pointer',
        transition: 'transform 0.1s, opacity 0.2s',
    },
    sellButton: {
        padding: '18px',
        border: 'none',
        borderRadius: '14px',
        backgroundColor: 'var(--error-red)',
        color: '#000',
        fontWeight: '900',
        fontSize: '0.9rem',
        cursor: 'pointer',
        transition: 'transform 0.1s, opacity 0.2s',
    },
    quickSelectBtn: {
        flex: 1,
        padding: '10px',
        borderRadius: '10px',
        border: '1px solid #222',
        backgroundColor: 'transparent',
        color: '#fff',
        fontSize: '0.75rem',
        fontWeight: '700',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    orderbookGrid: {
        display: 'flex',
        flexDirection: 'column',
    },
    orderbookHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        paddingBottom: '12px',
        color: '#444',
        fontSize: '0.8rem',
        fontWeight: '800',
        textTransform: 'uppercase'
    },
    asksContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    bidsContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    askRow: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.9rem',
        color: 'var(--error-red)aa'
    },
    bidRow: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.9rem',
        color: 'var(--accent-neon)aa'
    },
    askPrice: {
        color: 'var(--error-red)',
        fontWeight: '750',
    },
    bidPrice: {
        color: 'var(--accent-neon)',
        fontWeight: '750',
    },
    spreadIndicator: {
        textAlign: 'center',
        padding: '20px 0',
        color: '#333',
        fontSize: '0.8rem',
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: '2px'
    },
    emptyBook: {
        textAlign: 'center',
        color: '#222',
        padding: '10px',
        fontSize: '0.8rem'
    },
    openOrdersSection: {
        marginTop: '30px',
        borderTop: '1px solid #1a1a1a'
    },
    openOrderRow: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '8px 0',
        fontSize: '0.85rem',
        borderBottom: '1px solid #111',
        color: '#888'
    },
    noOrders: {
        color: '#222',
        fontSize: '0.8rem'
    },
    orderSection: {
        padding: '10px 0'
    },
    successMessage: {
        marginTop: '20px',
        padding: '15px',
        borderRadius: '12px',
        backgroundColor: '#00c85311',
        border: '1px solid #00c85344',
        color: 'var(--accent-neon)',
        fontSize: '0.9rem',
        fontWeight: '600',
        textAlign: 'center'
    },
    quickSelectRow: {
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '15px',
        gap: '10px'
    }
};
