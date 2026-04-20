import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { toast } from 'react-toastify';
import { getPortfolio, getTeamById, getTeamHistory, teamMarketBuy, teamMarketSell, getTradeConfig } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { PlayerPrice, PlayerChange } from '../components/PriceDisplay';
import styles from '../styles/Market.module.css';

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
                const config = await getTradeConfig();
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
        <div className={styles['mobile-detail-container']}>
            <div className={styles['mobile-detail-header']}>
                <button onClick={() => navigate(-1)} className={styles['mobile-back-btn']}>← Volver</button>
                <h1 className={styles['mobile-detail-title']}>{team?.name || 'Cargando...'}</h1>
            </div>

            <div className={styles['mobile-chart-card']}>
                <div className={styles['mobile-chart-header']}>
                    <span className={styles['mobile-chart-label']}>Índice de Equipo</span>
                    <span className={styles['mobile-chart-value']}>
                        <PlayerPrice price={team?.price} />
                    </span>
                </div>
                <div className={styles['mobile-chart-wrapper']}>
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
            <div className={styles['mobile-position-card']}>
                <h2 className={styles['mobile-card-title']}>Tu Posición</h2>
                {teamHolding.shares > 0 ? (
                    <div className={styles['mobile-position-info']}>
                        <div className={styles['mobile-position-row']}>
                            <span className={styles['mobile-position-label']}>Acciones:</span>
                            <span className={styles['mobile-position-value']}>{Number(teamHolding.shares).toFixed(4)}</span>
                        </div>
                        <div className={styles['mobile-position-row']}>
                            <span className={styles['mobile-position-label']}>Valor Total:</span>
                            <span className={styles['mobile-position-value-accent']}>{formatEU(teamHolding.value)} €</span>
                        </div>
                    </div>
                ) : (
                    <p className={styles['mobile-no-position']}>No tienes participaciones en este equipo.</p>
                )}
            </div>

            {/* Trade Order */}
            <div className={styles['mobile-trade-card']}>
                <h2 className={styles['mobile-card-title']}>Trade Order</h2>
                
                <div className={styles['mobile-trade-tabs']}>
                    <button 
                        className={`${styles['mobile-trade-tab']} ${activeTab === 'buy' ? styles['mobile-trade-tab-buy-active'] : ''}`}
                        onClick={() => setActiveTab('buy')}
                    >BUY</button>
                    <button 
                        className={`${styles['mobile-trade-tab']} ${activeTab === 'sell' ? styles['mobile-trade-tab-sell-active'] : ''}`}
                        onClick={() => setActiveTab('sell')}
                    >SELL</button>
                </div>

                {activeTab === 'buy' ? (
                    <>
                        <div className={styles['mobile-trade-inputs']}>
                            <div className={styles['mobile-trade-input-group']}>
                                <label className={styles['mobile-trade-input-label']}>CANT. ACCIONES</label>
                                <input 
                                    type="text" 
                                    placeholder="0,0000" 
                                    className={styles['mobile-trade-input']}
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
                            <div className={styles['mobile-trade-input-group']}>
                                <label className={styles['mobile-trade-input-label']}>VALOR (€)</label>
                                <input 
                                    type="text" 
                                    placeholder="0,00" 
                                    className={styles['mobile-trade-input']}
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
                        <div className={styles['mobile-quick-trade']}>
                            <button onClick={() => handleQuickBuy(0.25)} className={styles['mobile-quick-btn']}>25%</button>
                            <button onClick={() => handleQuickBuy(0.50)} className={styles['mobile-quick-btn']}>50%</button>
                            <button onClick={() => handleQuickBuy(1.00)} className={styles['mobile-quick-btn']}>100%</button>
                        </div>
                        <button 
                            onClick={handleMarketBuy}
                            disabled={loading || !marketBuyTotal}
                            className={styles['mobile-buy-btn']}
                        >MARKET BUY</button>
                    </>
                ) : (
                    <>
                        <div className={styles['mobile-trade-inputs']}>
                            <div className={styles['mobile-trade-input-group']}>
                                <label className={styles['mobile-trade-input-label']}>CANT. ACCIONES</label>
                                <input 
                                    type="text" 
                                    placeholder="0,0000" 
                                    className={styles['mobile-trade-input']}
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
                            <div className={styles['mobile-trade-input-group']}>
                                <label className={styles['mobile-trade-input-label']}>VALOR (€)</label>
                                <input 
                                    type="text" 
                                    placeholder="0,00" 
                                    className={styles['mobile-trade-input']}
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
                        <div className={styles['mobile-quick-trade']}>
                            <button onClick={() => handleQuickSell(0.25)} className={styles['mobile-quick-btn']}>25%</button>
                            <button onClick={() => handleQuickSell(0.50)} className={styles['mobile-quick-btn']}>50%</button>
                            <button onClick={() => handleQuickSell(1.00)} className={styles['mobile-quick-btn']}>100%</button>
                        </div>
                        <button 
                            onClick={handleMarketSell}
                            disabled={loading || !marketSellQty}
                            className={styles['mobile-sell-btn']}
                        >MARKET SELL</button>
                    </>
                )}
                {error && <p className={styles['mobile-trade-error']}>{error}</p>}
            </div>

            <div className={styles['mobile-roster-card']}>
                <h2 className={styles['mobile-card-title']}>Roster</h2>
                {team?.players?.map(p => (
                    <div key={p.id} onClick={() => navigate(`/market/player/${p.id}`)} className={styles['mobile-roster-item']}>
                        <span className={styles['mobile-roster-item-name']}>{p.name}</span>
                        <div className={styles['mobile-roster-item-value-box']}>
                            <div className={styles['mobile-roster-item-price']}>
                                <PlayerPrice price={p.price} />
                            </div>
                            <div className={styles['mobile-roster-item-change']}>
                                <PlayerChange change={p.change} indicatorType="sign" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
