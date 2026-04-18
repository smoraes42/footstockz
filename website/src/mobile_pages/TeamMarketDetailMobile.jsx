import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { toast } from 'react-toastify';
import { getPortfolio, getTeamById, getTeamHistory, teamMarketBuy, teamMarketSell } from '../services/api';
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

export default function TeamMarketDetailMobile() {
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
    const [kFactor, setKFactor] = useState(0.0001);

    const fetchData = useCallback(async () => {
        if (!teamId) return;
        try {
            const [history, port, tData] = await Promise.all([
                getTeamHistory(teamId),
                getPortfolio(),
                getTeamById(teamId)
            ]);
            setPriceHistory((history || []).map(h => {
                const time = new Date(h.time);
                return {
                    ...h,
                    price: parseFloat(h.price) || 0,
                    time: isNaN(time.getTime()) ? 'Invalid' : time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                };
            }));
            setPortfolio(port);
            setTeam(tData);
        } catch (err) {
            console.error(err);
        }
    }, [teamId]);

    useEffect(() => {
        fetchData();
        const fetchConfig = async () => {
            try {
                const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';
                const res = await fetch(`${API_BASE}/v1/trades/config`, { credentials: 'include' });
                const config = await res.json();
                if (config.PRICE_IMPACT_FACTOR) setKFactor(config.PRICE_IMPACT_FACTOR);
            } catch (err) { console.error(err); }
        };
        fetchConfig();
    }, [fetchData]);

    const calculateQuantityFromBuyValue = (value, p0) => {
        if (!value || !p0 || p0 <= 0) return '';
        const v = parseEU(value);
        const q = Math.log((v * kFactor / p0) + 1) / kFactor;
        return formatEU(q, 4);
    };

    const calculateValueFromBuyQuantity = (q, p0) => {
        if (!q || !p0 || p0 <= 0) return '';
        const qty = parseEU(q);
        const v = (p0 / kFactor) * (Math.exp(kFactor * qty) - 1);
        return formatEU(v, 2);
    };

    const calculateQuantityFromSellValue = (value, p0) => {
        if (!value || !p0 || p0 <= 0) return '';
        const v = parseEU(value);
        const inner = 1 - (v * kFactor / p0);
        if (inner <= 0) return formatEU(0, 2);
        const q = -Math.log(inner) / kFactor;
        return formatEU(q, 4);
    };

    const calculateValueFromSellQuantity = (q, p0) => {
        if (!q || !p0 || p0 <= 0) return '';
        const qty = parseEU(q);
        const v = (p0 / kFactor) * (1 - Math.exp(-kFactor * qty));
        return formatEU(v, 2);
    };

    const handleMarketBuy = async () => {
        if (!marketBuyTotal) return;
        setLoading(true);
        setError(null);
        try {
            await teamMarketBuy(teamId, parseEU(marketBuyTotal));
            toast.success("Compra Exitosa");
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
        if (!marketSellQty) return;
        setLoading(true);
        setError(null);
        try {
            await teamMarketSell(teamId, parseEU(marketSellQty));
            toast.success("Venta Exitosa");
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

    const teamHolding = portfolio?.holdings?.find(h => h.type === 'team' && parseInt(h.team_id) === parseInt(teamId)) || { shares: 0, value: 0 };
    if (teamHolding.shares === undefined) teamHolding.shares = teamHolding.shares_owned || 0;
    if (teamHolding.value === undefined) teamHolding.value = teamHolding.position_value || 0;

    return (
        <div style={{ backgroundColor: 'var(--bg-main)', minHeight: '100vh', padding: '16px', paddingBottom: '100px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
                <button onClick={() => navigate(-1)} style={{ backgroundColor: '#222', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '8px' }}>← Volver</button>
                <h1 style={{ fontSize: '1.2rem', margin: 0 }}>{team?.name || 'Cargando...'}</h1>
            </div>

            <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Índice de Equipo</span>
                    <span style={{ fontWeight: 'bold', color: 'var(--accent-neon)', fontSize: '1.2rem' }}>{formatEU(team?.price)} €</span>
                </div>
                <div style={{ width: '100%', height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={priceHistory}>
                            <XAxis dataKey="time" hide />
                            <YAxis domain={['auto', 'auto']} hide />
                            <Tooltip contentStyle={{ backgroundColor: '#000', border: 'none', borderRadius: '8px', fontSize: '12px' }} />
                            <Line type="monotone" dataKey="price" stroke="var(--accent-neon)" strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Tu Posición */}
            <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '1rem', marginBottom: '12px' }}>Tu Posición</h2>
                {teamHolding.shares > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Acciones:</span>
                            <span style={{ fontWeight: 'bold' }}>{Number(teamHolding.shares).toFixed(4)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Valor Total:</span>
                            <span style={{ fontWeight: 'bold', color: 'var(--accent-neon)' }}>{formatEU(teamHolding.value)} €</span>
                        </div>
                    </div>
                ) : (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>No tienes participaciones en este equipo.</p>
                )}
            </div>

            {/* Trade Order */}
            <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '1rem', marginBottom: '12px' }}>Trade Order</h2>
                
                <div style={{ display: 'flex', marginBottom: '12px', gap: '8px', backgroundColor: '#000', padding: '4px', borderRadius: '10px' }}>
                    <button 
                        style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: activeTab === 'buy' ? 'rgba(57,255,20,0.1)' : 'transparent', color: activeTab === 'buy' ? 'var(--accent-neon)' : '#666' }}
                        onClick={() => setActiveTab('buy')}
                    >BUY</button>
                    <button 
                        style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: activeTab === 'sell' ? 'rgba(255,77,77,0.1)' : 'transparent', color: activeTab === 'sell' ? '#ff4d4d' : '#666' }}
                        onClick={() => setActiveTab('sell')}
                    >SELL</button>
                </div>

                {activeTab === 'buy' ? (
                    <>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '0.65rem', color: '#666', marginBottom: '4px' }}>CANT. ACCIONES</label>
                                <input 
                                    type="text" 
                                    placeholder="0,0000" 
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', outline: 'none' }}
                                    value={marketBuyQty}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (val && !/^[0-9.,]*$/.test(val)) return;
                                        setMarketBuyQty(val);
                                        if (val && team?.price) setMarketBuyTotal(calculateValueFromBuyQuantity(val, team.price));
                                        else setMarketBuyTotal('');
                                    }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '0.65rem', color: '#666', marginBottom: '4px' }}>VALOR (€)</label>
                                <input 
                                    type="text" 
                                    placeholder="0,00" 
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', outline: 'none' }}
                                    value={marketBuyTotal}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (val && !/^[0-9.,]*$/.test(val)) return;
                                        setMarketBuyTotal(val);
                                        if (val && team?.price) setMarketBuyQty(calculateQuantityFromBuyValue(val, team.price));
                                        else setMarketBuyQty('');
                                    }}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                            <button onClick={() => handleQuickBuy(0.25)} style={{ flex: 1, padding: '6px', borderRadius: '6px', backgroundColor: '#111', color: '#666', border: '1px solid #333', fontSize: '0.75rem' }}>25%</button>
                            <button onClick={() => handleQuickBuy(0.50)} style={{ flex: 1, padding: '6px', borderRadius: '6px', backgroundColor: '#111', color: '#666', border: '1px solid #333', fontSize: '0.75rem' }}>50%</button>
                            <button onClick={() => handleQuickBuy(1.00)} style={{ flex: 1, padding: '6px', borderRadius: '6px', backgroundColor: '#111', color: '#666', border: '1px solid #333', fontSize: '0.75rem' }}>100%</button>
                        </div>
                        <button 
                            onClick={handleMarketBuy}
                            disabled={loading || !marketBuyTotal}
                            style={{ width: '100%', padding: '14px', borderRadius: '8px', backgroundColor: 'var(--accent-neon)', color: '#000', fontWeight: 'bold', border: 'none' }}
                        >MARKET BUY</button>
                    </>
                ) : (
                    <>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '0.65rem', color: '#666', marginBottom: '4px' }}>CANT. ACCIONES</label>
                                <input 
                                    type="text" 
                                    placeholder="0,0000" 
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', outline: 'none' }}
                                    value={marketSellQty}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (val && !/^[0-9.,]*$/.test(val)) return;
                                        setMarketSellQty(val);
                                        if (val && team?.price) setMarketSellTotal(calculateValueFromSellQuantity(val, team.price));
                                        else setMarketSellTotal('');
                                    }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '0.65rem', color: '#666', marginBottom: '4px' }}>VALOR (€)</label>
                                <input 
                                    type="text" 
                                    placeholder="0,00" 
                                    style={{ width: '100%', padding: '10px', borderRadius: '8px', backgroundColor: '#000', border: '1px solid #333', color: '#fff', outline: 'none' }}
                                    value={marketSellTotal}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (val && !/^[0-9.,]*$/.test(val)) return;
                                        setMarketSellTotal(val);
                                        if (val && team?.price) setMarketSellQty(calculateQuantityFromSellValue(val, team.price));
                                        else setMarketSellQty('');
                                    }}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                            <button onClick={() => handleQuickSell(0.25)} style={{ flex: 1, padding: '6px', borderRadius: '6px', backgroundColor: '#111', color: '#666', border: '1px solid #333', fontSize: '0.75rem' }}>25%</button>
                            <button onClick={() => handleQuickSell(0.50)} style={{ flex: 1, padding: '6px', borderRadius: '6px', backgroundColor: '#111', color: '#666', border: '1px solid #333', fontSize: '0.75rem' }}>50%</button>
                            <button onClick={() => handleQuickSell(1.00)} style={{ flex: 1, padding: '6px', borderRadius: '6px', backgroundColor: '#111', color: '#666', border: '1px solid #333', fontSize: '0.75rem' }}>100%</button>
                        </div>
                        <button 
                            onClick={handleMarketSell}
                            disabled={loading || !marketSellQty}
                            style={{ width: '100%', padding: '14px', borderRadius: '8px', backgroundColor: '#ff4d4d', color: '#fff', fontWeight: 'bold', border: 'none' }}
                        >MARKET SELL</button>
                    </>
                )}
                {error && <p style={{ color: '#ff4d4d', fontSize: '0.8rem', marginTop: '8px', textAlign: 'center' }}>{error}</p>}
            </div>

            <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '16px' }}>
                <h2 style={{ fontSize: '1rem', marginBottom: '12px' }}>Roster</h2>
                {team?.players?.map(p => (
                    <div key={p.id} onClick={() => navigate(`/market/player/${p.id}`)} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span>{p.name}</span>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 'bold' }}>{formatEU(p.price)} €</div>
                            <div style={{ fontSize: '0.8rem', color: p.change >= 0 ? 'var(--accent-neon)' : '#ff4d4d' }}>{p.change >= 0 ? '+' : ''}{Number(p.change).toFixed(2)}%</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
