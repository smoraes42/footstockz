import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { toast } from 'react-toastify';
import { getPortfolio, getTeamById, getTeamHistory, getMe, teamMarketBuy, teamMarketSell } from '../services/api';
import fsLogo from '../assets/fs-logo.png';
import { useSocket } from '../context/SocketContext';

const formatEU = (val, decimals = 2) => {
    if (val === null || val === undefined || val === '') return '';
    let num;
    if (typeof val === 'string') {
        // If it contains a comma, it's likely already Spanish format (e.g. "1.234,56")
        if (val.includes(',')) {
            num = parseFloat(val.replace(/\./g, '').replace(',', '.'));
        } else {
            // Otherwise, treat it as a standard float string (e.g. "0.524")
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
    // Handle both Spanish (1.234,56) and standard (1234.56) formats
    if (str.includes(',')) {
        const sanitized = str.replace(/\./g, '').replace(',', '.');
        return parseFloat(sanitized) || 0;
    }
    return parseFloat(str) || 0;
};

export default function TeamMarketDetailDesktop() {
    const { teamId } = useParams();
    const navigate = useNavigate();

    const [team, setTeam] = useState(null);
    const [portfolio, setPortfolio] = useState(null);
    const [priceHistory, setPriceHistory] = useState([]);
    const [marketBuyTotal, setMarketBuyTotal] = useState('');
    const [marketBuyQty, setMarketBuyQty] = useState('');
    const [marketSellQty, setMarketSellQty] = useState('');
    const [marketSellTotal, setMarketSellTotal] = useState('');
    const [activeTab, setActiveTab] = useState('buy');
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const [kFactor, setKFactor] = useState(0.0001); // Default, will fetch from config

    const { socket, connected, subscribeToUser, unsubscribeFromUser } = useSocket();

    const fetchData = useCallback(async () => {
        if (!teamId) return;

        try {
            const [history, port, tData] = await Promise.all([
                getTeamHistory(teamId),
                getPortfolio(),
                getTeamById(teamId)
            ]);

            const formattedHistory = (history || []).map(h => {
                const time = new Date(h.time);
                return {
                    ...h,
                    price: parseFloat(h.price) || 0,
                    time: isNaN(time.getTime()) ? 'Invalid' : time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
            });

            setPriceHistory(formattedHistory);
            setPortfolio(port);
            setTeam(tData);
        } catch (err) {
            console.error('Fetch error:', err);
        }
    }, [teamId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const userData = await getMe();
                setUser(userData);
            } catch (error) {
                console.error('Failed to fetch user:', error);
            }
        };
        const fetchConfig = async () => {
            try {
                const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';
                const res = await fetch(`${API_BASE}/v1/trades/config`, { credentials: 'include' });
                const config = await res.json();
                if (config.PRICE_IMPACT_FACTOR) {
                    setKFactor(config.PRICE_IMPACT_FACTOR);
                }
            } catch (error) {
                console.error('Failed to fetch config:', error);
            }
        };
        fetchUser();
        fetchConfig();
    }, []);

    useEffect(() => {
        if (user && user.id) {
            subscribeToUser(user.id);
            return () => unsubscribeFromUser(user.id);
        }
    }, [user, subscribeToUser, unsubscribeFromUser]);

    // WebSocket Listeners for team price updates
    useEffect(() => {
        if (!socket || !connected || !teamId) return;

        // Note: For teams, the server might not have a specific 'team' subscription,
        // but we can listen to all 'price_update' events and recalculate if needed,
        // or the server might emit 'team_price_update'.
        // Based on backend/services/socketService.js, emitPriceUpdate is called for players.
        // Teams are aggregate, so we might need a general listener or a specific team one if implemented.
        
        const handlePriceUpdate = (data) => {
            // If the updated player belongs to this team, we should probably refresh the team data
            // or perform a partial update. For now, hitting fetchData is safest for index consistency.
            if (team && team.players && team.players.some(p => p.id === data.playerId)) {
                fetchData();
            }
        };

        socket.on('price_update', handlePriceUpdate);

        return () => {
            socket.off('price_update', handlePriceUpdate);
        };
    }, [socket, connected, teamId, team, fetchData]);

    const calculateQuantityFromBuyValue = (value, p0) => {
        if (!value || !p0 || p0 <= 0) return '';
        const v = parseEU(value);
        // Exponential: Q = ln(V*k/p0 + 1) / k
        const q = Math.log((v * kFactor / p0) + 1) / kFactor;
        return formatEU(q, 4);
    };

    const calculateValueFromBuyQuantity = (q, p0) => {
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
        if (inner <= 0) return formatEU(0, 2);
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
        if (!marketBuyTotal || !teamId) return;

        if (portfolio && parseEU(marketBuyTotal) > portfolio.walletBalance) {
            setError("Saldo insuficiente.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await teamMarketBuy(teamId, parseEU(marketBuyTotal));
            
            toast.success("Inversión en Equipo Exitosa", {
                position: "top-center",
                autoClose: 3000,
                theme: "dark",
            });

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
        if (!marketSellQty || !teamId) return;

        setLoading(true);
        setError(null);

        try {
            await teamMarketSell(teamId, parseEU(marketSellQty));
            
            toast.success("Venta de Equipo Exitosa", {
                position: "top-center",
                autoClose: 3000,
                theme: "dark",
            });

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
        if (!portfolio || !team) return;
        const maxSpend = portfolio.walletBalance || 0;
        const targetValueNumber = maxSpend * percentage;
        const targetValue = formatEU(targetValueNumber, 2);
        setMarketBuyTotal(targetValue);

        if (team?.price > 0) {
            setMarketBuyQty(calculateQuantityFromBuyValue(targetValue, team.price));
        }
    };

    const handleQuickSell = (percentage) => {
        if (!teamHolding || !team) return;
        const maxShares = teamHolding.shares;
        if (maxShares <= 0) return;

        const targetQtyNumber = Math.floor(maxShares * percentage * 10000) / 10000;
        const targetQty = formatEU(targetQtyNumber, 4);
        setMarketSellQty(targetQty);

        if (team?.price > 0) {
            setMarketSellTotal(calculateValueFromSellQuantity(targetQty, team.price));
        }
    };

    // Calculate team position
    const teamHolding = portfolio?.holdings?.find(h => h.type === 'team' && parseInt(h.team_id) === parseInt(teamId)) || { shares_owned: 0, position_value: 0 };
    
    // Normalize field names for UI consistency
    if (teamHolding.shares === undefined) teamHolding.shares = teamHolding.shares_owned || 0;
    if (teamHolding.value === undefined) teamHolding.value = teamHolding.position_value || 0;

    return (
        <div style={{ backgroundColor: 'var(--bg-main)', height: '100vh', width: '100%', display: 'flex' }}>
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
                    <div onClick={() => navigate('/home')} className="sidebar-link" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem', padding: '12px 16px', borderRadius: '8px', color: 'var(--text-muted)', textDecoration: 'none' }}>Inicio</div>
                    <div onClick={() => navigate('/portfolio')} className="sidebar-link" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem', padding: '12px 16px', borderRadius: '8px', color: 'var(--text-muted)', textDecoration: 'none' }}>Portfolio</div>
                    <div onClick={() => navigate('/market')} className="sidebar-link active" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '1rem', padding: '12px 16px', borderRadius: '8px', color: 'var(--text-main)', backgroundColor: 'rgba(57,255,20,0.1)', borderLeft: '3px solid var(--accent-neon)' }}>Mercado</div>
                </nav>
            </aside>

            <main style={{ marginLeft: '250px', flex: 1, padding: '2rem 3rem', overflowY: 'auto', height: '100vh' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <button onClick={() => navigate('/market')} style={{
                        backgroundColor: 'var(--accent-neon)', border: 'none', color: '#000', padding: '8px 20px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer'
                    }}>Volver</button>
                    {portfolio && (
                        <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '0.75rem', color: '#666', fontWeight: '700' }}>WALLET: </span>
                            <span style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--accent-neon)' }}>{formatEU(portfolio.walletBalance)} €</span>
                        </div>
                    )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                    <div>
                        <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', marginBottom: '2rem' }}>
                            <h2 style={{ color: 'var(--text-main)', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
                                {team ? `${team.name} (Índice)` : 'Cargando...'}
                                {team && <span style={{ color: 'var(--accent-neon)' }}>{formatEU(team.price)} €</span>}
                            </h2>
                            <div style={{ width: '100%', height: 350 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={priceHistory}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                                        <XAxis dataKey="time" stroke="#666" fontSize={12} />
                                        <YAxis domain={['auto', 'auto']} stroke="#666" fontSize={12} />
                                        <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333' }} />
                                        <Line type="monotone" dataKey="price" stroke="var(--accent-neon)" strokeWidth={3} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
                            <h3 style={{ color: 'var(--text-main)', marginBottom: '1rem' }}>Jugadores del Equipo</h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid #333', color: 'var(--text-muted)' }}>
                                            <th style={{ padding: '1rem' }}>Jugador</th>
                                            <th style={{ padding: '1rem' }}>Precio</th>
                                            <th style={{ padding: '1rem' }}>24h</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {team?.players?.map(p => (
                                            <tr key={p.id} style={{ borderBottom: '1px solid #222', cursor: 'pointer' }} onClick={() => navigate(`/market/player/${p.id}`)}>
                                                <td style={{ padding: '1rem', fontWeight: 'bold' }}>{p.name}</td>
                                                <td style={{ padding: '1rem' }}>{formatEU(p.price)} €</td>
                                                <td style={{ padding: '1rem', color: p.change >= 0 ? 'var(--accent-neon)' : '#ff4d4d' }}>{p.change >= 0 ? '+' : ''}{Number(p.change).toFixed(2)}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div>
                        {/* Tu Posición */}
                        <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', marginBottom: '2rem' }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1.5rem', color: 'var(--text-main)' }}>Tu Posición</h2>
                            {teamHolding.shares > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Acciones del Equipo:</span>
                                        <span style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-main)' }}>{Number(teamHolding.shares).toFixed(4)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Valor Total:</span>
                                        <span style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--accent-neon)' }}>{formatEU(teamHolding.value)} €</span>
                                    </div>
                                </div>
                            ) : (
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center' }}>No tienes participaciones en este equipo.</p>
                            )}
                        </div>

                        {/* Trade Order */}
                        <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', position: 'sticky', top: '2rem' }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '1.5rem', color: 'var(--text-main)' }}>Trade Order</h2>
                            
                            <div style={{ display: 'flex', marginBottom: '1.5rem', gap: '8px', backgroundColor: '#0a0a0a', padding: '4px', borderRadius: '12px', border: '1px solid #222' }}>
                                <button 
                                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', fontWeight: '800', cursor: 'pointer', backgroundColor: activeTab === 'buy' ? 'rgba(57,255,20,0.1)' : 'transparent', color: activeTab === 'buy' ? 'var(--accent-neon)' : '#666' }}
                                    onClick={() => setActiveTab('buy')}
                                >BUY</button>
                                <button 
                                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', fontWeight: '800', cursor: 'pointer', backgroundColor: activeTab === 'sell' ? 'rgba(255,77,77,0.1)' : 'transparent', color: activeTab === 'sell' ? '#ff4d4d' : '#666' }}
                                    onClick={() => setActiveTab('sell')}
                                >SELL</button>
                            </div>

                            {activeTab === 'buy' ? (
                                <>
                                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', fontSize: '0.7rem', color: '#666', fontWeight: '800', marginBottom: '4px', textTransform: 'uppercase' }}>Cant. Acciones</label>
                                            <input 
                                                type="text" 
                                                style={{ width: '100%', padding: '12px', borderRadius: '10px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', outline: 'none' }}
                                                placeholder="0,0000"
                                                value={marketBuyQty}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    if (val && !/^[0-9.,]*$/.test(val)) return;
                                                    setMarketBuyQty(val);
                                                    if (val && team?.price) {
                                                        setMarketBuyTotal(calculateValueFromBuyQuantity(val, team.price));
                                                    } else {
                                                        setMarketBuyTotal('');
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', fontSize: '0.7rem', color: '#666', fontWeight: '800', marginBottom: '4px', textTransform: 'uppercase' }}>Valor (€)</label>
                                            <input 
                                                type="text" 
                                                style={{ width: '100%', padding: '12px', borderRadius: '10px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', outline: 'none' }}
                                                placeholder="0,00"
                                                value={marketBuyTotal}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    if (val && !/^[0-9.,]*$/.test(val)) return;
                                                    setMarketBuyTotal(val);
                                                    if (val && team?.price) {
                                                        setMarketBuyQty(calculateQuantityFromBuyValue(val, team.price));
                                                    } else {
                                                        setMarketBuyQty('');
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
                                        <button onClick={() => handleQuickBuy(0.25)} style={{ flex: 1, padding: '6px', borderRadius: '6px', backgroundColor: '#111', color: '#666', border: '1px solid #333', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700' }}>25%</button>
                                        <button onClick={() => handleQuickBuy(0.50)} style={{ flex: 1, padding: '6px', borderRadius: '6px', backgroundColor: '#111', color: '#666', border: '1px solid #333', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700' }}>50%</button>
                                        <button onClick={() => handleQuickBuy(1.00)} style={{ flex: 1, padding: '6px', borderRadius: '6px', backgroundColor: '#111', color: '#666', border: '1px solid #333', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700' }}>100%</button>
                                    </div>
                                    <button 
                                        onClick={handleMarketBuy}
                                        disabled={loading || !marketBuyTotal}
                                        style={{ width: '100%', padding: '14px', borderRadius: '10px', backgroundColor: 'var(--accent-neon)', color: '#000', fontWeight: '800', border: 'none', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
                                    >MARKET BUY</button>
                                </>
                            ) : (
                                <>
                                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', fontSize: '0.7rem', color: '#666', fontWeight: '800', marginBottom: '4px', textTransform: 'uppercase' }}>Cant. Acciones</label>
                                            <input 
                                                type="text" 
                                                style={{ width: '100%', padding: '12px', borderRadius: '10px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', outline: 'none' }}
                                                placeholder="0,0000"
                                                value={marketSellQty}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    if (val && !/^[0-9.,]*$/.test(val)) return;
                                                    setMarketSellQty(val);
                                                    if (val && team?.price) {
                                                        setMarketSellTotal(calculateValueFromSellQuantity(val, team.price));
                                                    } else {
                                                        setMarketSellTotal('');
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ display: 'block', fontSize: '0.7rem', color: '#666', fontWeight: '800', marginBottom: '4px', textTransform: 'uppercase' }}>Valor (€)</label>
                                            <input 
                                                type="text" 
                                                style={{ width: '100%', padding: '12px', borderRadius: '10px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', outline: 'none' }}
                                                placeholder="0,00"
                                                value={marketSellTotal}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    if (val && !/^[0-9.,]*$/.test(val)) return;
                                                    setMarketSellTotal(val);
                                                    if (val && team?.price) {
                                                        setMarketSellQty(calculateQuantityFromSellValue(val, team.price));
                                                    } else {
                                                        setMarketSellQty('');
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
                                        <button onClick={() => handleQuickSell(0.25)} style={{ flex: 1, padding: '6px', borderRadius: '6px', backgroundColor: '#111', color: '#666', border: '1px solid #333', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700' }}>25%</button>
                                        <button onClick={() => handleQuickSell(0.50)} style={{ flex: 1, padding: '6px', borderRadius: '6px', backgroundColor: '#111', color: '#666', border: '1px solid #333', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700' }}>50%</button>
                                        <button onClick={() => handleQuickSell(1.00)} style={{ flex: 1, padding: '6px', borderRadius: '6px', backgroundColor: '#111', color: '#666', border: '1px solid #333', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700' }}>100%</button>
                                    </div>
                                    <button 
                                        onClick={handleMarketSell}
                                        disabled={loading || !marketSellQty}
                                        style={{ width: '100%', padding: '14px', borderRadius: '10px', backgroundColor: '#ff4d4d', color: '#fff', fontWeight: '800', border: 'none', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
                                    >MARKET SELL</button>
                                </>
                            )}

                            {error && <p style={{ color: '#ff4d4d', fontSize: '0.85rem', marginTop: '1rem', textAlign: 'center' }}>{error}</p>}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
