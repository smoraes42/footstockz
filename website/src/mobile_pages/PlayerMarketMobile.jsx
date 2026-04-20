import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';
import { toast } from 'react-toastify';
import { getPortfolio, getPlayers, getMe, getPlayerHistory, getPlayerTradeHistory, getTradeConfig, marketBuy, marketSell } from '../services/api';
import fsLogo from '../assets/fs-logo.png';

const playSuccessSound = () => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponential_rampToValueAtTime(300, ctx.currentTime + 0.1);
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

    const [players, setPlayers] = useState([]);
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
    const [kFactor, setKFactor] = useState(0.0001); 

    const calculateQuantityFromValue = (value, p0) => {
        if (!value || !p0 || p0 <= 0) return '';
        // Quadratic: V = p0 * Q * (1 + k*Q/2) => (k*p0/2)Q^2 + p0*Q - V = 0
        const a = (kFactor * p0) / 2;
        const b = p0;
        const c = -parseFloat(value);
        const q = (-b + Math.sqrt(Math.pow(b, 2) - 4 * a * c)) / (2 * a);
        return q.toFixed(4);
    };

    const calculateValueFromQuantity = (q, p0) => {
        if (!q || !p0 || p0 <= 0) return '';
        const qty = parseFloat(q);
        // Integral: V = p0 * Q * (1 + k*Q/2)
        const v = p0 * qty * (1 + (kFactor * qty) / 2);
        return v.toFixed(2);
    };

    const calculateQuantityFromSellValue = (value, p0) => {
        if (!value || !p0 || p0 <= 0) return '';
        // Quadratic: V = p0 * Q * (1 - k*Q/2) => (-k*p0/2)Q^2 + p0*Q - V = 0
        const a = (-kFactor * p0) / 2;
        const b = p0;
        const c = -parseFloat(value);
        const discriminant = Math.pow(b, 2) - 4 * a * c;
        if (discriminant < 0) return '0.00';
        const q = (-b + Math.sqrt(discriminant)) / (2 * a);
        return q.toFixed(4);
    };

    const calculateValueFromSellQuantity = (q, p0) => {
        if (!q || !p0 || p0 <= 0) return '';
        const qty = parseFloat(q);
        // Integral: V = p0 * Q * (1 - k*Q/2)
        const v = p0 * qty * (1 - (kFactor * qty) / 2);
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
        try {
            const [history, trades, port, pData, userData] = await Promise.all([
                getPlayerHistory(playerId),
                getPlayerTradeHistory(playerId),
                getPortfolio(),
                getPlayers(),
                getMe()
            ]);

            const formattedHistory = (history || []).map(h => {
                const time = new Date(h.time);
                return {
                    ...h,
                    timestamp: isNaN(time.getTime()) ? Date.now() : time.getTime(),
                    price: parseFloat(h.price) || 0
                };
            });

            setPriceHistory(formattedHistory);
            setTradeHistory(trades || []);
            setPortfolio(port);
            setPlayers(pData.data || []);
            setUser(userData);
        } catch (err) {
            console.error('Fetch error:', err);
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
        const interval = setInterval(fetchData, 3000);
        return () => clearInterval(interval);
    }, [fetchData]);

    const currentPlayer = players.find(p => p.id === parseInt(playerId));

    const handleMarketBuy = async () => {
        if (!marketBuyTotal || !marketBuyQty || !playerId) return;
        if (portfolio && parseFloat(marketBuyTotal) > portfolio.walletBalance) {
            setError("Saldo insuficiente.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const data = await marketBuy(
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
            const data = await marketSell(
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
        <div style={{ backgroundColor: 'var(--bg-main)', height: '100dvh', overflow: 'hidden', width: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
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
                <img src={fsLogo} alt="Logo" style={{ height: '22px' }} />
                <div style={{ textAlign: 'right', minWidth: '60px' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--accent-neon)', fontWeight: '800', margin: 0 }}>€{portfolio?.walletBalance?.toFixed(2) || '0.00'}</p>
                </div>
            </header>

            <div style={{ padding: '4px 1.5rem', backgroundColor: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Posición: <span style={{ color: '#fff', fontWeight: '700' }}>{portfolio?.holdings?.find(h => h.player_id === parseInt(playerId))?.shares_owned?.toFixed(4) || '0.0000'}</span></span>
            </div>

            <main style={{ flex: 1, padding: '1.5rem', paddingBottom: '80px', overflowY: 'auto' }}>
                {/* Player Hero */}
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div>
                            <h2 style={{ fontSize: '1.8rem', fontWeight: '900', margin: 0, letterSpacing: '-0.5px' }}>{currentPlayer?.name}</h2>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '600', margin: 0 }}>{currentPlayer?.team}</p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--accent-neon)', margin: 0 }}>€{currentPlayer?.price?.toFixed(2)}</p>
                            <span style={{ fontSize: '0.8rem', color: 'var(--accent-neon)', backgroundColor: 'rgba(57,255,20,0.1)', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>+0.00%</span>
                        </div>
                    </div>
                </div>

                {/* Chart Section */}
                <div className="glass-panel" style={{ padding: '1rem', borderRadius: '20px', marginBottom: '2rem', height: '260px', position: 'relative', marginLeft: '-15px', minWidth: 0 }}>
                    {hoverInfo && (
                        <div style={{
                            position: 'absolute', top: 12, left: 24, zIndex: 10,
                            backgroundColor: 'rgba(20,20,20,0.9)', border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px', padding: '4px 10px', pointerEvents: 'none'
                        }}>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                                {new Date(hoverInfo.timestamp).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })}
                            </div>
                            <div style={{ color: 'var(--accent-neon)', fontWeight: '800', fontSize: '1rem' }}>€{Number(hoverInfo.price).toFixed(2)}</div>
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
                <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', backgroundColor: '#000', padding: '4px', borderRadius: '12px' }}>
                        <button 
                            onClick={() => setActiveTab('buy')}
                            style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: activeTab === 'buy' ? 'rgba(57,255,20,0.15)' : 'transparent', color: activeTab === 'buy' ? 'var(--accent-neon)' : '#666', fontWeight: '800', fontSize: '0.85rem', transition: 'all 0.2s' }}
                        >
                            COMPRAR
                        </button>
                        <button 
                             onClick={() => setActiveTab('sell')}
                             style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', backgroundColor: activeTab === 'sell' ? 'rgba(255,77,77,0.15)' : 'transparent', color: activeTab === 'sell' ? 'var(--error-red)' : '#666', fontWeight: '800', fontSize: '0.85rem', transition: 'all 0.2s' }}
                        >
                            VENDER
                        </button>
                    </div>

                    {activeTab === 'buy' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)' }}>CANTIDAD</label>
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
                                        style={{ width: '100%', padding: '12px', borderRadius: '10px', backgroundColor: '#000', border: '1px solid #222', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)' }}>TOTAL (€)</label>
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
                                        style={{ width: '100%', padding: '12px', borderRadius: '10px', backgroundColor: '#000', border: '1px solid #222', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {[0.25, 0.5, 1].map(p => (
                                    <button key={p} onClick={() => handleQuickBuy(p)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #222', backgroundColor: 'transparent', color: '#fff', fontSize: '0.75rem', fontWeight: '700' }}>{p*100}%</button>
                                ))}
                            </div>

                            {/* Slippage Settings */}
                            <div style={{ marginTop: '0.5rem' }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)' }}>SLIPPAGE (%)</label>
                                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                                    {['0.1', '0.5', '1.0'].map(val => (
                                        <button 
                                            key={val}
                                            onClick={() => setMaxSlippage(val)}
                                            style={{
                                                flex: 1,
                                                padding: '8px',
                                                borderRadius: '8px',
                                                border: '1px solid',
                                                borderColor: maxSlippage === val ? 'var(--accent-neon)' : '#222',
                                                backgroundColor: maxSlippage === val ? 'rgba(57,255,20,0.1)' : 'transparent',
                                                color: maxSlippage === val ? 'var(--accent-neon)' : '#666',
                                                fontSize: '0.75rem',
                                                fontWeight: '800'
                                            }}
                                        >
                                            {val}%
                                        </button>
                                    ))}
                                    <input 
                                        type="number"
                                        value={maxSlippage}
                                        onChange={e => setMaxSlippage(e.target.value)}
                                        style={{ width: '60px', padding: '8px', borderRadius: '8px', backgroundColor: '#000', border: '1px solid #222', color: '#fff', fontSize: '0.8rem', textAlign: 'center' }}
                                    />
                                </div>
                            </div>

                            {error && <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--error-red)', fontWeight: '600' }}>{error}</p>}
                            <button 
                                onClick={handleMarketBuy}
                                disabled={loading || !marketBuyQty}
                                style={{ width: '100%', padding: '16px', borderRadius: '14px', border: 'none', backgroundColor: '#00c853', color: '#000', fontWeight: '900', fontSize: '1rem', marginTop: '0.5rem', opacity: loading ? 0.7 : 1 }}
                            >
                                {loading ? 'PROCESANDO...' : 'EJECUTAR COMPRA'}
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)' }}>CANTIDAD</label>
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
                                        style={{ width: '100%', padding: '12px', borderRadius: '10px', backgroundColor: '#000', border: '1px solid #222', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <label style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)' }}>TOTAL (€)</label>
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
                                        style={{ width: '100%', padding: '12px', borderRadius: '10px', backgroundColor: '#000', border: '1px solid #222', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {[0.25, 0.5, 1].map(p => (
                                    <button key={p} onClick={() => handleQuickSell(p)} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #222', backgroundColor: 'transparent', color: '#fff', fontSize: '0.75rem', fontWeight: '700' }}>{p*100}%</button>
                                ))}
                            </div>

                            {/* Slippage Settings */}
                            <div style={{ marginTop: '0.5rem' }}>
                                <label style={{ fontSize: '0.65rem', fontWeight: '700', color: 'var(--text-muted)' }}>SLIPPAGE (%)</label>
                                <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                                    {['0.1', '0.5', '1.0'].map(val => (
                                        <button 
                                            key={val}
                                            onClick={() => setMaxSlippage(val)}
                                            style={{
                                                flex: 1,
                                                padding: '8px',
                                                borderRadius: '8px',
                                                border: '1px solid',
                                                borderColor: maxSlippage === val ? 'var(--accent-neon)' : '#222',
                                                backgroundColor: maxSlippage === val ? 'rgba(57,255,20,0.1)' : 'transparent',
                                                color: maxSlippage === val ? 'var(--accent-neon)' : '#666',
                                                fontSize: '0.75rem',
                                                fontWeight: '800'
                                            }}
                                        >
                                            {val}%
                                        </button>
                                    ))}
                                    <input 
                                        type="number"
                                        value={maxSlippage}
                                        onChange={e => setMaxSlippage(e.target.value)}
                                        style={{ width: '60px', padding: '8px', borderRadius: '8px', backgroundColor: '#000', border: '1px solid #222', color: '#fff', fontSize: '0.8rem', textAlign: 'center' }}
                                    />
                                </div>
                            </div>

                            {error && <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--error-red)', fontWeight: '600' }}>{error}</p>}
                            <button 
                                onClick={handleMarketSell}
                                disabled={loading || !marketSellQty}
                                style={{ width: '100%', padding: '16px', borderRadius: '14px', border: 'none', backgroundColor: '#ff5252', color: '#000', fontWeight: '900', fontSize: '1rem', marginTop: '0.5rem', opacity: loading ? 0.7 : 1 }}
                            >
                                {loading ? 'PROCESANDO...' : 'EJECUTAR VENTA'}
                            </button>
                        </div>
                    )}
                </div>

                <div style={{ paddingBottom: '40px' }} />
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
                <Link to="/home" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', padding: '12px 0', textDecoration: 'none', color: 'var(--text-muted)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>Inicio</span>
                </Link>
                <Link to="/portfolio" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', padding: '12px 0', textDecoration: 'none', color: 'var(--text-muted)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>Portfolio</span>
                </Link>
                <Link to="/market" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', padding: '12px 0', textDecoration: 'none', color: 'var(--accent-neon)' }}>
                    <div style={{ width: '20px', height: '2px', backgroundColor: 'var(--accent-neon)', borderRadius: '2px', position: 'absolute', top: 0 }}></div>
                    <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>Mercado</span>
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

export default PlayerMarketMobile;
