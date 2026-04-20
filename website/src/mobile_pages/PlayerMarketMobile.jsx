import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { toast } from 'react-toastify';
import { getPortfolio, getPlayerById, getMe, getPlayerHistory, getPlayerTradeHistory, getTradeConfig, marketBuy, marketSell } from '../services/api';
import fsLogo from '../assets/fs-logo.png';
import { useSocket } from '../context/SocketContext';
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

    const [activeTab, setActiveTab] = useState('buy');
    const [marketBuyTotal, setMarketBuyTotal] = useState('');
    const [marketBuyQty, setMarketBuyQty] = useState('');
    const [marketSellQty, setMarketSellQty] = useState('');
    const [marketSellTotal, setMarketSellTotal] = useState('');
    const [maxSlippage, setMaxSlippage] = useState('0.5'); // 0.5% default

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [fetchError, setFetchError] = useState(null);
    const [kFactor, setKFactor] = useState(0.0001);
    const [isUpdated, setIsUpdated] = useState(false);
    const { socket, connected, subscribeToPlayer, unsubscribeFromPlayer } = useSocket();

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

    const fetchData = useCallback(async () => {
        if (!playerId) return;
        setFetchError(null);
        try {
            const results = await Promise.allSettled([
                getPlayerHistory(playerId),
                getPlayerTradeHistory(playerId),
                getPortfolio(),
                getPlayerById(playerId),
                getMe()
            ]);

            const [historyRes, tradesRes, portRes, pDataRes, userRes] = results;

            if (pDataRes.status === 'fulfilled') {
                setCurrentPlayer(pDataRes.value);
            } else {
                setFetchError('Jugador no encontrado.');
            }

            if (historyRes.status === 'fulfilled') {
                const formattedHistory = (historyRes.value || []).map(h => {
                    const time = new Date(h.time);
                    return {
                        ...h,
                        timestamp: isNaN(time.getTime()) ? Date.now() : time.getTime(),
                        price: parseFloat(h.price) || 0
                    };
                });
                setPriceHistory(formattedHistory);
            }

            if (tradesRes.status === 'fulfilled') {
                setTradeHistory(tradesRes.value || []);
            }

            if (portRes.status === 'fulfilled') {
                setPortfolio(portRes.value);
            }

            if (userRes.status === 'fulfilled') {
                setUser(userRes.value);
            }
        } catch (err) {
            console.error('Fetch error:', err);
            setFetchError('Error de conexión.');
        }
    }, [playerId]);

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
        fetchData();
        // Removed polling in favor of WebSockets
    }, [fetchData]);

    // WebSocket Price Updates
    useEffect(() => {
        if (!socket || !connected || !playerId) return;

        subscribeToPlayer(playerId);

        const handlePriceUpdate = (data) => {
            if (data.playerId === parseInt(playerId)) {
                setCurrentPlayer(prev => {
                    if (!prev) return null;
                    return { ...prev, price: data.price, change: parseFloat(data.change || 0) };
                });

                setIsUpdated(true);
                setTimeout(() => setIsUpdated(false), 1000);

                // Update price history (add new point)
                setPriceHistory(prev => {
                    const newPoint = {
                        timestamp: data.timestamp,
                        price: data.price
                    };
                    const updated = [...prev, newPoint];
                    return updated.slice(-100);
                });
            }
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
    }, [socket, connected, playerId, subscribeToPlayer, unsubscribeFromPlayer]);


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
            fetchData();
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
            fetchData();
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
            {/* Header */}
            <header className={styles['mobile-header']}>
                <img src={fsLogo} alt="Logo" className={styles['mobile-logo']} />
                <div className={styles['mobile-wallet-box']}>
                    <p className={styles['mobile-wallet-value']}>€{portfolio?.walletBalance?.toFixed(2) || '0.00'}</p>
                </div>
            </header>

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

                {/* Chart Section */}
                <div className={`${styles['mobile-chart-box']} glass-panel`}>
                    {hoverInfo && (
                        <div className={styles['mobile-tooltip']}>
                            <div className={styles['mobile-tooltip-time']}>
                                {new Date(hoverInfo.timestamp).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })}
                            </div>
                            <div className={styles['mobile-tooltip-price']}>€{Number(hoverInfo.price).toFixed(2)}</div>
                        </div>
                    )}
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={priceHistory} onMouseMove={handleChartMouseMove} onMouseLeave={() => setHoverInfo(null)}>
                            <XAxis
                                dataKey="timestamp"
                                type="number"
                                domain={['dataMin', 'dataMax']}
                                hide
                            />
                            <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} hide />
                            <Tooltip
                                content={() => null}
                                cursor={{ stroke: 'rgba(57,255,20,0.3)', strokeWidth: 1.5, strokeDasharray: '4 2' }}
                            />
                            <Line
                                type="stepAfter"
                                dataKey="price"
                                stroke="var(--accent-neon)"
                                strokeWidth={3}
                                dot={false}
                                activeDot={{ r: 5, fill: 'var(--accent-neon)', strokeWidth: 0 }}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

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
                                        type="number"
                                        placeholder="0.00"
                                        value={marketBuyQty}
                                        onChange={e => {
                                            const val = e.target.value;
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
                                        type="number"
                                        placeholder="0.00"
                                        value={marketBuyTotal}
                                        onChange={e => {
                                            const val = e.target.value;
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

                            {/* Slippage Settings */}
                            <div className={styles['mobile-slippage-box']}>
                                <label className={styles['mobile-input-label']}>SLIPPAGE (%)</label>
                                <div className={styles['mobile-slippage-row']}>
                                    {['0.1', '0.5', '1.0'].map(val => (
                                        <button
                                            key={val}
                                            onClick={() => setMaxSlippage(val)}
                                            className={`${styles['mobile-slippage-btn']} ${maxSlippage === val ? styles['mobile-slippage-btn-active'] : ''}`}
                                        >
                                            {val}%
                                        </button>
                                    ))}
                                    <input
                                        type="number"
                                        value={maxSlippage}
                                        onChange={e => setMaxSlippage(e.target.value)}
                                        className={styles['mobile-slippage-input']}
                                    />
                                </div>
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
                                        type="number"
                                        placeholder="0.00"
                                        value={marketSellQty}
                                        onChange={e => {
                                            const val = e.target.value;
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
                                        type="number"
                                        placeholder="0.00"
                                        value={marketSellTotal}
                                        onChange={e => {
                                            const val = e.target.value;
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

                            {/* Slippage Settings */}
                            <div className={styles['mobile-slippage-box']}>
                                <label className={styles['mobile-input-label']}>SLIPPAGE (%)</label>
                                <div className={styles['mobile-slippage-row']}>
                                    {['0.1', '0.5', '1.0'].map(val => (
                                        <button
                                            key={val}
                                            onClick={() => setMaxSlippage(val)}
                                            className={`${styles['mobile-slippage-btn']} ${maxSlippage === val ? styles['mobile-slippage-btn-active'] : ''}`}
                                        >
                                            {val}%
                                        </button>
                                    ))}
                                    <input
                                        type="number"
                                        value={maxSlippage}
                                        onChange={e => setMaxSlippage(e.target.value)}
                                        className={styles['mobile-slippage-input']}
                                    />
                                </div>
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

                <div className={styles['mobile-spacer']} />
            </main>

            {/* Bottom Navigation Mobile */}
            <nav className={styles['mobile-bottom-nav']}>
                <Link to="/home" className={styles['mobile-nav-link']}>
                    <span className={styles['mobile-nav-text']}>Inicio</span>
                </Link>
                <Link to="/portfolio" className={styles['mobile-nav-link']}>
                    <span className={styles['mobile-nav-text']}>Portfolio</span>
                </Link>
                <Link to="/market" className={`${styles['mobile-nav-link']} ${styles['mobile-nav-link-active']}`}>
                    <div className={styles['mobile-nav-link-active-bar']}></div>
                    <span className={`${styles['mobile-nav-text']} ${styles['mobile-nav-text-active']}`}>Mercado</span>
                </Link>
                <div
                    onClick={() => window.location.href = '/profile'}
                    className={styles['mobile-nav-profile']}
                >
                    <div className={styles['mobile-nav-avatar']}>
                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                </div>
            </nav>
        </div>
    );
};

export default PlayerMarketMobile;
