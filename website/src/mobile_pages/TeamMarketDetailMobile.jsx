import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { toast } from 'react-toastify';
import { getPortfolio, getTeamById, getTeamHistory, teamMarketBuy, teamMarketSell, getTradeConfig } from '../services/api';
import { useSocket } from '../context/SocketContext';
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
        <div className={styles.mobileDetailContainer}>
            <div className={styles.mobileDetailHeader}>
                <button onClick={() => navigate(-1)} className={styles.mobileBackBtn}>← Volver</button>
                <h1 className={styles.mobileDetailTitle}>{team?.name || 'Cargando...'}</h1>
            </div>

            <div className={styles.mobileChartCard}>
                <div className={styles.mobileChartHeader}>
                    <span className={styles.mobileChartLabel}>Índice de Equipo</span>
                    <span className={styles.mobileChartValue}>{formatEU(team?.price)} €</span>
                </div>
                <div className={styles.mobileChartWrapper}>
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
            <div className={styles.mobilePositionCard}>
                <h2 className={styles.mobileCardTitle}>Tu Posición</h2>
                {teamHolding.shares > 0 ? (
                    <div className={styles.mobilePositionInfo}>
                        <div className={styles.mobilePositionRow}>
                            <span className={styles.mobilePositionLabel}>Acciones:</span>
                            <span className={styles.mobilePositionValue}>{Number(teamHolding.shares).toFixed(4)}</span>
                        </div>
                        <div className={styles.mobilePositionRow}>
                            <span className={styles.mobilePositionLabel}>Valor Total:</span>
                            <span className={styles.mobilePositionValueAccent}>{formatEU(teamHolding.value)} €</span>
                        </div>
                    </div>
                ) : (
                    <p className={styles.mobileNoPosition}>No tienes participaciones en este equipo.</p>
                )}
            </div>

            {/* Trade Order */}
            <div className={styles.mobileTradeCard}>
                <h2 className={styles.mobileCardTitle}>Trade Order</h2>
                
                <div className={styles.mobileTradeTabs}>
                    <button 
                        className={`${styles.mobileTradeTab} ${activeTab === 'buy' ? styles.mobileTradeTabBuyActive : ''}`}
                        onClick={() => setActiveTab('buy')}
                    >BUY</button>
                    <button 
                        className={`${styles.mobileTradeTab} ${activeTab === 'sell' ? styles.mobileTradeTabSellActive : ''}`}
                        onClick={() => setActiveTab('sell')}
                    >SELL</button>
                </div>

                {activeTab === 'buy' ? (
                    <>
                        <div className={styles.mobileTradeInputs}>
                            <div className={styles.mobileTradeInputGroup}>
                                <label className={styles.mobileTradeInputLabel}>CANT. ACCIONES</label>
                                <input 
                                    type="text" 
                                    placeholder="0,0000" 
                                    className={styles.mobileTradeInput}
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
                            <div className={styles.mobileTradeInputGroup}>
                                <label className={styles.mobileTradeInputLabel}>VALOR (€)</label>
                                <input 
                                    type="text" 
                                    placeholder="0,00" 
                                    className={styles.mobileTradeInput}
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
                        <div className={styles.mobileQuickTrade}>
                            <button onClick={() => handleQuickBuy(0.25)} className={styles.mobileQuickBtn}>25%</button>
                            <button onClick={() => handleQuickBuy(0.50)} className={styles.mobileQuickBtn}>50%</button>
                            <button onClick={() => handleQuickBuy(1.00)} className={styles.mobileQuickBtn}>100%</button>
                        </div>
                        <button 
                            onClick={handleMarketBuy}
                            disabled={loading || !marketBuyTotal}
                            className={styles.mobileBuyBtn}
                        >MARKET BUY</button>
                    </>
                ) : (
                    <>
                        <div className={styles.mobileTradeInputs}>
                            <div className={styles.mobileTradeInputGroup}>
                                <label className={styles.mobileTradeInputLabel}>CANT. ACCIONES</label>
                                <input 
                                    type="text" 
                                    placeholder="0,0000" 
                                    className={styles.mobileTradeInput}
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
                            <div className={styles.mobileTradeInputGroup}>
                                <label className={styles.mobileTradeInputLabel}>VALOR (€)</label>
                                <input 
                                    type="text" 
                                    placeholder="0,00" 
                                    className={styles.mobileTradeInput}
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
                        <div className={styles.mobileQuickTrade}>
                            <button onClick={() => handleQuickSell(0.25)} className={styles.mobileQuickBtn}>25%</button>
                            <button onClick={() => handleQuickSell(0.50)} className={styles.mobileQuickBtn}>50%</button>
                            <button onClick={() => handleQuickSell(1.00)} className={styles.mobileQuickBtn}>100%</button>
                        </div>
                        <button 
                            onClick={handleMarketSell}
                            disabled={loading || !marketSellQty}
                            className={styles.mobileSellBtn}
                        >MARKET SELL</button>
                    </>
                )}
                {error && <p className={styles.mobileTradeError}>{error}</p>}
            </div>

            <div className={styles.mobileRosterCard}>
                <h2 className={styles.mobileCardTitle}>Roster</h2>
                {team?.players?.map(p => (
                    <div key={p.id} onClick={() => navigate(`/market/player/${p.id}`)} className={styles.mobileRosterItem}>
                        <span className={styles.mobileRosterItemName}>{p.name}</span>
                        <div className={styles.mobileRosterItemValueBox}>
                            <div className={styles.mobileRosterItemPrice}>{formatEU(p.price)} €</div>
                            <div className={`${styles.mobileRosterItemChange} ${p.change >= 0 ? styles.mobileChangePositive : styles.mobileChangeNegative}`}>{p.change >= 0 ? '+' : ''}{Number(p.change).toFixed(2)}%</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
