import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import MarketChart from '../components/MarketChart';
import { toast } from 'react-toastify';
import {
    getPortfolio, getPlayerById, getPlayerHistory, getPlayerTradeHistory, getTradeConfig, marketBuy, marketSell, getMe
} from '../services/api';
import MobileHeader from '../components/MobileHeader';
import MobileNavbar from '../components/MobileNavbar';
import fsLogo from '../assets/fs-logo.png';
import { useSocket } from '../context/SocketContext';
import { useSettings } from '../context/SettingsContext';
import { PlayerPrice, PlayerChange } from '../components/PriceDisplay';
import styles from '../styles/PlayerMarket.module.css';

const playSuccessSound = () => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
    } catch (e) {
        console.error("Audio playback failed", e);
    }
};


const PlayerMarketMobile = () => {
    const { playerId } = useParams();
    const navigate = useNavigate();

    const [currentPlayer, setCurrentPlayer] = useState(null);
    const [portfolio, setPortfolio] = useState(null);
    const [priceHistory, setPriceHistory] = useState([]);
    const [tradeHistory, setTradeHistory] = useState([]);
    const [user, setUser] = useState(null);
    const [timeframe, setTimeframe] = useState('line');

    const [activeTab, setActiveTab] = useState('buy');
    const [marketBuyTotal, setMarketBuyTotal] = useState('');
    const [marketBuyQty, setMarketBuyQty] = useState('');
    const [marketSellQty, setMarketSellQty] = useState('');
    const [marketSellTotal, setMarketSellTotal] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [fetchError, setFetchError] = useState(null);
    const [kFactor, setKFactor] = useState(0.0001);
    const [isUpdated, setIsUpdated] = useState(false);
    const { socket, connected, subscribeToPlayer, unsubscribeFromPlayer } = useSocket();
    const { timezone } = useSettings();

    const calculateQuantityFromValue = (value, p0) => {
        if (!value || !p0 || p0 <= 0) return '';
        const v = parseFloat(value);
        // Exponential: Q = ln(V*k/p0 + 1) / k
        const q = Math.log((v * kFactor / p0) + 1) / kFactor;
        return q.toFixed(4);
    };

    const calculateValueFromQuantity = (q, p0) => {
        if (!q || !p0 || p0 <= 0) return '';
        const qty = parseFloat(q);
        // Exponential: V = (p0/k) * (e^(kQ) - 1)
        const v = (p0 / kFactor) * (Math.exp(kFactor * qty) - 1);
        return v.toFixed(2);
    };

    const calculateQuantityFromSellValue = (value, p0) => {
        if (!value || !p0 || p0 <= 0) return '';
        const v = parseFloat(value);
        // Exponential: Q = -ln(1 - V*k/p0) / k
        const inner = 1 - (v * kFactor / p0);
        if (inner <= 0) return '0.0000';
        const q = -Math.log(inner) / kFactor;
        return q.toFixed(4);
    };

    const calculateValueFromSellQuantity = (q, p0) => {
        if (!q || !p0 || p0 <= 0) return '';
        const qty = parseFloat(q);
        // Exponential: V = (p0/k) * (1 - e^(-kQ))
        const v = (p0 / kFactor) * (1 - Math.exp(-kFactor * qty));
        return v.toFixed(2);
    };
    const [hoverInfo, setHoverInfo] = useState(null);

    const handleChartMouseMove = (e) => {
        if (!e || !e.activePayload || !e.activePayload.length) { setHoverInfo(null); return; }
        const payload = e.activePayload[0].payload;
        setHoverInfo({ timestamp: payload.timestamp, price: payload.price });
    };

    // Format raw API history into a fixed-size normalized grid
    const formatHistory = useCallback((history, tf) => {
        const GRID_SIZE = tf === 'line' ? 200 : 100;
        const bucketMs = { 'line': 5000, '5m': 300000, '30m': 1800000, '1h': 3600000, '2h': 7200000 };
        const bMs = bucketMs[tf] || 300000;
        
        const now = Date.now();
        const endTs = Math.floor(now / bMs) * bMs;
        const grid = [];
        const gridMap = new Map();

        for (let i = 0; i < GRID_SIZE; i++) {
            const ts = endTs - (GRID_SIZE - 1 - i) * bMs;
            const date = new Date(ts);
            const label = tf === '2h'
                ? date.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: timezone, hour12: false })
                : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: timezone, hour12: false });
            
            const point = {
                timestamp: ts,
                time: label,
                price: null,
                isFiller: true
            };
            grid.push(point);
            gridMap.set(ts, point);
        }

        if (!history || history.length === 0) return grid;

        const sortedHistory = [...history].sort((a, b) => new Date(a.time || a.bucket_time).getTime() - new Date(b.time || b.bucket_time).getTime());
        let lastKnownPrice = sortedHistory[0] ? (parseFloat(sortedHistory[0].price || sortedHistory[0].close) || 0) : 0;

        sortedHistory.forEach(h => {
            const hTs = new Date(h.time || h.bucket_time).getTime();
            const roundedTs = Math.floor(hTs / bMs) * bMs;
            
            const point = gridMap.get(roundedTs);
            if (point) {
                const price = parseFloat(h.price || h.close) || 0;
                point.price = price;
                point.isFiller = false;
                lastKnownPrice = price;
            }
        });

        let currentPrice = lastKnownPrice;
        for (let i = 0; i < grid.length; i++) {
            if (grid[i].price === null) grid[i].price = currentPrice;
            else currentPrice = grid[i].price;
        }

        return grid;
    }, [timezone]);

    const fetchHistory = useCallback(async (tf = timeframe) => {
        if (!playerId) return;
        try {
            const history = await getPlayerHistory(playerId, tf);
            setPriceHistory(formatHistory(history, tf));
        } catch (err) {
            console.error('Fetch history error:', err);
        }
    }, [playerId, timeframe, formatHistory]);

    const fetchBaseData = useCallback(async () => {
        if (!playerId) return;
        setFetchError(null);
        try {
            const [trades, port, pData, uData] = await Promise.all([
                getPlayerTradeHistory(playerId),
                getPortfolio(),
                getPlayerById(playerId),
                getMe()
            ]);
            setTradeHistory(trades || []);
            setPortfolio(port);
            setCurrentPlayer(pData);
            setUser(uData);
        } catch (err) {
            console.error('Fetch base data error:', err);
            setFetchError('Error de conexión.');
        }
    }, [playerId]);

    useEffect(() => {
        fetchBaseData();
        fetchHistory(timeframe);
        const fetchConfig = async () => {
            try {
                const config = await getTradeConfig();
                if (config.PRICE_IMPACT_FACTOR) setKFactor(config.PRICE_IMPACT_FACTOR);
            } catch (error) { console.error(error); }
        };
        fetchConfig();
    }, [fetchBaseData, fetchHistory]);

    // Re-fetch only history when timeframe changes
    useEffect(() => {
        fetchHistory(timeframe);
    }, [timeframe, fetchHistory]);

    // WebSocket Listeners
    useEffect(() => {
        if (!socket || !connected || !playerId) return;

        subscribeToPlayer(playerId);

        const handlePriceUpdate = (data) => {
            if (data.playerId !== parseInt(playerId)) return;

            setCurrentPlayer(prev => {
                if (!prev) return null;
                return { ...prev, price: data.price, change: parseFloat(data.change || 0) };
            });
            setIsUpdated(true);
            setTimeout(() => setIsUpdated(false), 1000);

            // Patch history atomically
            setPriceHistory(prev => {
                const bucketMs = { 'line': 5000, '5m': 300000, '30m': 1800000, '1h': 3600000, '2h': 7200000 };
                const bMs = bucketMs[timeframe] || 300000;
                const newTs = new Date(data.timestamp).getTime();
                const thisBucket = Math.floor(newTs / bMs) * bMs;
                
                const updated = [...prev];
                const lastPoint = updated[updated.length - 1];

                if (lastPoint && lastPoint.timestamp === thisBucket) {
                    updated[updated.length - 1] = {
                        ...lastPoint,
                        price: data.price,
                        isFiller: false
                    };
                } else if (lastPoint && thisBucket > lastPoint.timestamp) {
                    const date = new Date(thisBucket);
                    const label = timeframe === '2h'
                        ? date.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: timezone, hour12: false })
                        : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: timezone, hour12: false });
                    
                    updated.push({
                        timestamp: thisBucket,
                        time: label,
                        price: data.price,
                        isFiller: false
                    });
                    if (updated.length > 100) updated.shift();
                }
                return updated;
            });
        };

        const handleTradeExecuted = (trade) => {
            if (trade.playerId === parseInt(playerId)) {
                setTradeHistory(prev => [trade, ...prev].slice(0, 50));
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
    }, [socket, connected, playerId, timeframe, timezone, subscribeToPlayer, unsubscribeFromPlayer, fetchHistory, formatHistory]);


    const handleMarketBuy = async () => {
        if (!marketBuyTotal || !marketBuyQty || !playerId) return;
        if (portfolio && parseFloat(marketBuyTotal) > portfolio.walletBalance) {
            setError("Saldo insuficiente.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            await marketBuy(
                parseInt(playerId),
                parseFloat(marketBuyTotal),
                currentPlayer?.price
            );

            playSuccessSound();
            toast.success("Compra Exitosa", { position: "top-center", theme: "dark" });
            setMarketBuyTotal('');
            setMarketBuyQty('');
            fetchBaseData();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleMarketSell = async () => {
        if (!marketSellTotal || !marketSellQty || !playerId) return;
        const holding = portfolio?.holdings?.find(h => h.player_id === parseInt(playerId));
        if (!holding || parseFloat(marketSellQty) > holding.shares_owned) {
            setError("No tienes suficientes acciones.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            await marketSell(
                parseInt(playerId),
                parseFloat(marketSellQty),
                currentPlayer?.price
            );

            playSuccessSound();
            toast.success("Venta Exitosa", { position: "top-center", theme: "dark" });
            setMarketSellQty('');
            setMarketSellTotal('');
            fetchBaseData();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickBuy = (percentage) => {
        if (!portfolio || !currentPlayer) return;
        const maxSpend = portfolio.walletBalance || 0;
        const targetValue = (maxSpend * percentage).toFixed(2);
        setMarketBuyTotal(targetValue);
        if (currentPlayer?.price > 0) {
            setMarketBuyQty(calculateQuantityFromValue(targetValue, currentPlayer.price));
        } else {
            setMarketBuyQty('');
        }
    };

    const handleQuickSell = (percentage) => {
        if (!portfolio || !playerId) return;
        const holding = portfolio.holdings?.find(h => h.player_id === parseInt(playerId));
        const maxShares = holding ? holding.shares_owned : 0;
        if (maxShares <= 0) return;
        const targetQty = (Math.floor(maxShares * percentage * 10000) / 10000).toFixed(4);
        setMarketSellQty(targetQty);
        if (currentPlayer?.price > 0) {
            setMarketSellTotal(calculateValueFromSellQuantity(targetQty, currentPlayer.price));
        } else {
            setMarketSellTotal('');
        }
    };

    return (
        <div className={styles['mobile-container']}>
            <MobileHeader
                backLink="/market"
                walletBalance={portfolio?.walletBalance}
            />

            <div className={styles['mobile-position-bar']}>
                <span className={styles['mobile-pos-label']}>Posición: <span className={styles['mobile-pos-value']}>{portfolio?.holdings?.find(h => h.player_id === parseInt(playerId))?.shares_owned?.toFixed(4) || '0.0000'}</span></span>
            </div>

            <main className={styles['mobile-main']}>
                {/* Player Hero */}
                <div className={styles['mobile-player-hero']}>
                    {fetchError ? (
                        <div className={styles['mobile-fetch-error-card']}>
                            <p className={styles['mobile-fetch-error-text']}>{fetchError}</p>
                            <button onClick={() => navigate('/market')} className={styles['mobile-fetch-error-btn']}>Volver</button>
                        </div>
                    ) : (
                        <div className={styles['mobile-hero-top']}>
                            <div>
                                <h2 className={styles['mobile-player-name']}>{currentPlayer?.name || 'Cargando...'}</h2>
                                <p className={styles['mobile-player-team']}>{currentPlayer?.team || '---'}</p>
                            </div>
                            <div className={styles['mobile-price-display']}>
                                <p className={styles['mobile-current-price']}>
                                    <PlayerPrice price={currentPlayer?.price} isUpdated={isUpdated} />
                                </p>
                                <span className={styles['mobile-price-change']}>
                                    <PlayerChange change={currentPlayer?.change} indicatorType="sign" />
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                <MarketChart
                    priceHistory={priceHistory}
                    timeframe={timeframe}
                    onTimeframeChange={setTimeframe}
                />

                {/* Trade Tabs */}
                <div className={`${styles['mobile-trade-card']} glass-panel`}>
                    <div className={styles['mobile-tab-row']}>
                        <button
                            onClick={() => setActiveTab('buy')}
                            className={`${styles['mobile-tab-btn']} ${activeTab === 'buy' ? styles['mobile-tab-btn-active-buy'] : ''}`}
                        >
                            COMPRAR
                        </button>
                        <button
                            onClick={() => setActiveTab('sell')}
                            className={`${styles['mobile-tab-btn']} ${activeTab === 'sell' ? styles['mobile-tab-btn-active-sell'] : ''}`}
                        >
                            VENDER
                        </button>
                    </div>

                    {activeTab === 'buy' ? (
                        <div className={styles['mobile-trade-form']}>
                            <div className={styles['mobile-input-grid']}>
                                <div className={styles['mobile-input-group']}>
                                    <label className={styles['mobile-input-label']}>CANTIDAD</label>
                                    <input
                                        type="text"
                                        placeholder="0,0000"
                                        value={marketBuyQty}
                                        onChange={e => {
                                            const val = e.target.value;
                                            if (val && !/^[0-9.,]*$/.test(val)) return;
                                            setMarketBuyQty(val);
                                            if (val && currentPlayer?.price) {
                                                setMarketBuyTotal(calculateValueFromQuantity(val, currentPlayer.price));
                                            } else {
                                                setMarketBuyTotal('');
                                            }
                                        }}
                                        className={styles['mobile-input']}
                                    />
                                </div>
                                <div className={styles['mobile-input-group']}>
                                    <label className={styles['mobile-input-label']}>TOTAL (€)</label>
                                    <input
                                        type="text"
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
                                        className={styles['mobile-input']}
                                    />
                                </div>
                            </div>
                            <div className={styles['mobile-quick-select-row']}>
                                {[0.25, 0.5, 1].map(p => (
                                    <button key={p} onClick={() => handleQuickBuy(p)} className={styles['mobile-quick-select-btn']}>{p * 100}%</button>
                                ))}
                            </div>

                            {error && <p className={styles['mobile-error-msg']}>{error}</p>}
                            <button
                                onClick={handleMarketBuy}
                                disabled={loading || !marketBuyQty}
                                className={`${styles['mobile-execute-btn']} ${styles['mobile-buy-btn']}`}
                                style={{ opacity: loading ? 0.7 : 1 }}
                            >
                                {loading ? 'PROCESANDO...' : 'EJECUTAR COMPRA'}
                            </button>
                        </div>
                    ) : (
                        <div className={styles['mobile-trade-form']}>
                            <div className={styles['mobile-input-grid']}>
                                <div className={styles['mobile-input-group']}>
                                    <label className={styles['mobile-input-label']}>CANTIDAD</label>
                                    <input
                                        type="text"
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
                                        className={styles['mobile-input']}
                                    />
                                </div>
                                <div className={styles['mobile-input-group']}>
                                    <label className={styles['mobile-input-label']}>TOTAL (€)</label>
                                    <input
                                        type="text"
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
                                        className={styles['mobile-input']}
                                    />
                                </div>
                            </div>
                            <div className={styles['mobile-quick-select-row']}>
                                {[0.25, 0.5, 1].map(p => (
                                    <button key={p} onClick={() => handleQuickSell(p)} className={styles['mobile-quick-select-btn']}>{p * 100}%</button>
                                ))}
                            </div>

                            {error && <p className={styles['mobile-error-msg']}>{error}</p>}
                            <button
                                onClick={handleMarketSell}
                                disabled={loading || !marketSellQty}
                                className={`${styles['mobile-execute-btn']} ${styles['mobile-sell-btn']}`}
                                style={{ opacity: loading ? 0.7 : 1 }}
                            >
                                {loading ? 'PROCESANDO...' : 'EJECUTAR VENTA'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Recent Trades Section Mobile */}
                <div className={styles['mobile-trades-section']}>
                    <h3 className={styles['mobile-trades-title']}>Operaciones Recientes</h3>
                    <div className={styles['mobile-trades-card']}>
                        {tradeHistory.length > 0 ? (
                            <table className={styles['mobile-trades-table']}>
                                <thead className={styles['mobile-trades-header']}>
                                    <tr>
                                        <th>TIPO</th>
                                        <th>PRECIO</th>
                                        <th>CANT.</th>
                                        <th style={{ textAlign: 'right' }}>HORA</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tradeHistory.slice(0, 10).map((trade, idx) => (
                                        <tr
                                            key={idx}
                                            className={styles['mobile-trade-row']}
                                            onClick={() => navigate(`/trades/${trade.id || trade.tradeId}`)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <td className={`${styles['mobile-trade-side']} ${trade.side === 'buy' ? styles['mobile-trade-side-buy'] : styles['mobile-trade-side-sell']}`}>
                                                {trade.side === 'buy' ? 'COMPRA' : 'VENTA'}
                                            </td>
                                            <td className={styles['mobile-trade-price']}>
                                                {parseFloat(trade.price).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}€
                                            </td>
                                            <td className={styles['mobile-trade-qty']}>
                                                {parseFloat(trade.quantity).toFixed(2)}
                                            </td>
                                            <td className={styles['mobile-trade-time']}>
                                                {new Date(trade.timestamp || trade.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: timezone, hour12: false })}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className={styles['mobile-no-trades']}>No hay operaciones recientes para este jugador.</div>
                        )}
                    </div>
                </div>

                <div className={styles['mobile-spacer']} />
            </main>

            <MobileNavbar />
        </div>
    );
};

export default PlayerMarketMobile;
