import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { toast } from 'react-toastify';
import { getPortfolio, getPlayerById, getPlayerHistory, getPlayerTradeHistory, marketBuy, marketSell, getTradeConfig, placeOrder } from '../services/api';
import Navbar from '../components/Navbar';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/PlayerMarket.module.css';


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
    const [isUpdated, setIsUpdated] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { socket, connected, subscribeToPlayer, unsubscribeFromPlayer, subscribeToUser, unsubscribeFromUser } = useSocket();
    const { user } = useAuth();

    const fetchData = useCallback(async () => {
        if (!playerId) return;

        try {
            const [history, trades, port, pData] = await Promise.all([
                getPlayerHistory(playerId),
                getPlayerTradeHistory(playerId),
                getPortfolio(),
                getPlayerById(playerId)
            ]);

            // Format time for Recharts
            const formattedHistory = (history || []).map(h => {
                const time = new Date(h.time);
                return {
                    ...h,
                    price: parseFloat(h.price) || 0,
                    time: isNaN(time.getTime()) ? 'Invalid' : time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                };
            });

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
                setCurrentPlayer(prev => {
                    if (!prev) return null;
                    return { ...prev, price: data.price, change: parseFloat(data.change || 0) };
                });

                // Visual highlight
                setIsUpdated(true);
                setTimeout(() => setIsUpdated(null), 1000);

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
                const config = await getTradeConfig();
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

        if (portfolio && parseEU(marketBuyTotal) > portfolio.walletBalance) {
            setError("Insufficient wallet balance for this purchase.");
            return;
        }

        const currentPrice = currentPlayer?.price || 0;
        setLoading(true);
        setError(null);

        try {
            const data = await marketBuy(parseInt(playerId), parseEU(marketBuyTotal), currentPrice);

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
        if (!holding || parseEU(marketSellQty) > holding.shares_owned) {
            setError("Insufficient shares held for this sale.");
            return;
        }

        const currentPrice = currentPlayer?.price || 0;
        setLoading(true);
        setError(null);

        try {
            const data = await marketSell(parseInt(playerId), parseEU(marketSellQty), currentPrice);

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
            await placeOrder(
                parseInt(playerId),
                side === 'BUY' ? 'Buy' : 'Sell',
                parseEU(orderPrice),
                parseEU(orderAmount)
            );

            setOrderAmount('');
            setOrderPrice('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <Navbar />

            <main className={styles['main-content']}>
                <div className={styles['top-header']}>
                    <button onClick={() => navigate('/market')} className={styles['back-btn']}>Volver</button>
                    {portfolio && (
                        <div className={styles['wallet-info']}>
                            <span className={styles['wallet-label']}>Wallet Balance:</span>
                            <span className={styles['wallet-value']}>{portfolio.walletBalance?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                        </div>
                    )}
                </div>

                <div className={styles['main-grid']}>
                    <div className={styles['left-col']}>
                        {/* Chart */}
                        <div className={styles.card}>
                            <h2 className={styles['card-title']}>
                                {currentPlayer ? `${currentPlayer.name} Chart` : 'Loading Chart...'}
                                <span className={`${styles['current-price-tag']} ${isUpdated ? styles['price-pulse'] : ''}`}>Current: {currentPlayer?.price?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'} €</span>
                            </h2>
                            <div className={styles['chart-container']}>
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
                        <div className={styles.card}>
                            <h2 className={styles['card-title']}>Recent Trades</h2>
                            {tradeHistory.length > 0 ? (
                                <div className={styles['trade-table-container']}>
                                    <table className={styles['trade-table']}>
                                        <thead>
                                            <tr className={styles['trade-table-head-row']}>
                                                <th className={styles['trade-table-head-cell']}>Type</th>
                                                <th className={styles['trade-table-head-cell']}>Price</th>
                                                <th className={styles['trade-table-head-cell']}>Qty</th>
                                                <th className={styles['trade-table-head-cell']}>Total (€)</th>
                                                <th className={styles['trade-table-head-cell']}>Time</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tradeHistory.slice(0, 15).map((trade, idx) => (
                                                <tr key={idx} className={styles['trade-table-row']}>
                                                    <td className={`${styles['trade-table-cell']} ${trade.side === 'buy' ? styles['trade-type-buy'] : styles['trade-type-sell']}`}>
                                                        {trade.side === 'buy' ? 'BUY' : 'SELL'}
                                                    </td>
                                                    <td className={`${styles['trade-table-cell']} ${styles['trade-cell-white']}`}>{parseFloat(trade.price).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                                                    <td className={`${styles['trade-table-cell']} ${styles['trade-cell-muted']}`}>{parseFloat(trade.quantity).toLocaleString('es-ES', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                                                    <td className={`${styles['trade-table-cell']} ${styles['trade-cell-white']}`}>{parseFloat(trade.total_value || trade.totalValue).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                                                    <td className={`${styles['trade-table-cell']} ${styles['trade-time']}`}>
                                                        {new Date(trade.timestamp || trade.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className={styles['empty-book']}>No recent trades for this player.</div>
                            )}
                        </div>

                    </div>

                    <div className={styles['right-col']}>
                        {/* Your Position */}
                        <div className={styles.card}>
                            <h2 className={styles['card-title']}>Tu Posición</h2>
                            {portfolio?.holdings?.find(h => h.player_id === parseInt(playerId)) ? (
                                <div className={styles['position-box']}>
                                    <div className={styles['pos-row']}>
                                        <span className={styles.label}>Acciones:</span>
                                        <span className={styles['pos-value']}>{portfolio.holdings.find(h => h.player_id === parseInt(playerId)).shares_owned.toFixed(4)}</span>
                                    </div>
                                    <div className={styles['pos-row']}>
                                        <span className={styles.label}>Valor:</span>
                                        <span className={styles['pos-value']}>{portfolio.holdings.find(h => h.player_id === parseInt(playerId)).position_value?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                                    </div>
                                </div>
                            ) : (
                                <div className={styles['no-position']}>No tienes acciones de este jugador.</div>
                            )}
                        </div>

                        {/* Trade Form */}
                        <div className={styles.card}>
                            <h2 className={styles['card-title']}>Trade Order</h2>

                            <div className={styles['tab-row']}>
                                <button
                                    className={`${styles['tab-button']} ${activeTab === 'buy' ? styles['active-tab-buy'] : ''}`}
                                    onClick={() => setActiveTab('buy')}
                                >
                                    BUY
                                </button>
                                <button
                                    className={`${styles['tab-button']} ${activeTab === 'sell' ? styles['active-tab-sell'] : ''}`}
                                    onClick={() => setActiveTab('sell')}
                                >
                                    SELL
                                </button>
                            </div>

                            <div className={styles['order-section']}>
                                {activeTab === 'buy' && (
                                    <>
                                        <div className={styles['form-row']}>
                                            <div className={styles['input-group']}>
                                                <label className={styles.label}>Quantity</label>
                                                <input
                                                    type="text"
                                                    className={styles.input}
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
                                            <div className={styles['input-group']}>
                                                <label className={styles.label}>Value (€)</label>
                                                <input
                                                    type="text"
                                                    className={`${styles.input} ${portfolio && parseEU(marketBuyTotal) > portfolio.walletBalance ? styles['input-error'] : ''}`}
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
                                        <div className={styles['quick-select-row']}>
                                            <button className={styles['quick-select-btn']} onClick={() => handleQuickBuy(0.25)}>25%</button>
                                            <button className={styles['quick-select-btn']} onClick={() => handleQuickBuy(0.50)}>50%</button>
                                            <button className={styles['quick-select-btn']} onClick={() => handleQuickBuy(1.00)}>100%</button>
                                        </div>


                                        <div className={styles['button-row']}>
                                            <button
                                                disabled={loading}
                                                className={styles['buy-button']}
                                                onClick={handleMarketBuy}
                                            >
                                                {loading ? '...' : 'MARKET BUY'}
                                            </button>
                                        </div>
                                    </>
                                )}

                                {activeTab === 'sell' && (
                                    <>
                                        <div className={styles['form-row']}>
                                            <div className={styles['input-group']}>
                                                <label className={styles.label}>Quantity</label>
                                                <input
                                                    type="text"
                                                    className={`${styles.input} ${portfolio && portfolio.holdings?.find(h => h.player_id === parseInt(playerId)) && parseEU(marketSellQty) > portfolio.holdings.find(h => h.player_id === parseInt(playerId)).shares_owned ? styles['input-error'] : ''}`}
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
                                            <div className={styles['input-group']}>
                                                <label className={styles.label}>Value (€)</label>
                                                <input
                                                    type="text"
                                                    className={styles.input}
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
                                        <div className={styles['quick-select-row']}>
                                            <button className={styles['quick-select-btn']} onClick={() => handleQuickSell(0.25)}>25%</button>
                                            <button className={styles['quick-select-btn']} onClick={() => handleQuickSell(0.50)}>50%</button>
                                            <button className={styles['quick-select-btn']} onClick={() => handleQuickSell(1.00)}>100%</button>
                                        </div>


                                        <div className={styles['button-row']}>
                                            <button
                                                disabled={loading}
                                                className={styles['sell-button']}
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
                            <div className={styles['error-banner']}>
                                {error}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
