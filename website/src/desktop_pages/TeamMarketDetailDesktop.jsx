import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getPortfolio, getTeamById, getTeamHistory, getMe, teamMarketBuy, teamMarketSell, getTradeConfig } from '../services/api';
import Navbar from '../components/Navbar';
import { useSocket } from '../context/SocketContext';
import { useSettings } from '../context/SettingsContext';
import { PlayerPrice, PlayerChange } from '../components/PriceDisplay';
import styles from '../styles/TeamMarketDetail.module.css';
import MarketChart from '../components/MarketChart';

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

export default function TeamMarketDetailDesktop() {
    const { teamId } = useParams();
    const navigate = useNavigate();

    const [team, setTeam] = useState(null);
    const [portfolio, setPortfolio] = useState(null);
    const [priceHistory, setPriceHistory] = useState([]);
    const [timeframe, setTimeframe] = useState('line');
    const [marketBuyTotal, setMarketBuyTotal] = useState('');
    const [marketBuyQty, setMarketBuyQty] = useState('');
    const [marketSellQty, setMarketSellQty] = useState('');
    const [marketSellTotal, setMarketSellTotal] = useState('');
    const [activeTab, setActiveTab] = useState('buy');
    const { timezone } = useSettings();
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const [kFactor, setKFactor] = useState(0.0001);

    const { socket, connected, subscribeToUser, unsubscribeFromUser } = useSocket();

    const formatHistory = useCallback((history, tf) => {
        const GRID_SIZE = 100;
        const bucketMs = { 'line': 10000, '5m': 300000, '30m': 1800000, '1h': 3600000, '2h': 7200000 };
        const bMs = bucketMs[tf] || 300000;
        
        const now = Date.now();
        const endTs = Math.floor(now / bMs) * bMs;
        const grid = [];
        for (let i = 0; i < GRID_SIZE; i++) {
            const ts = endTs - (GRID_SIZE - 1 - i) * bMs;
            const date = new Date(ts);
            const label = tf === '2h'
                ? date.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: timezone, hour12: false })
                : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: timezone, hour12: false });
            
            grid.push({
                timestamp: ts,
                time: label,
                price: null,
                isFiller: true
            });
        }

        if (!history || history.length === 0) return grid;

        const sortedHistory = [...history].sort((a, b) => new Date(a.time || a.bucket_time).getTime() - new Date(b.time || b.bucket_time).getTime());
        let lastKnownPrice = sortedHistory[0] ? (parseFloat(sortedHistory[0].price) || 0) : 0;

        sortedHistory.forEach(h => {
            const hTs = new Date(h.time || h.bucket_time).getTime();
            const roundedTs = Math.floor(hTs / bMs) * bMs;
            const slotIndex = grid.findIndex(g => g.timestamp === roundedTs);
            if (slotIndex !== -1) {
                const price = parseFloat(h.price) || 0;
                grid[slotIndex].price = price;
                grid[slotIndex].isFiller = false;
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

    const fetchData = useCallback(async (tf = timeframe) => {
        if (!teamId) return;

        try {
            const [history, port, tData] = await Promise.all([
                getTeamHistory(teamId, tf),
                getPortfolio(),
                getTeamById(teamId)
            ]);

            setPriceHistory(formatHistory(history, tf));
            setPortfolio(port);
            setTeam(tData);
        } catch (err) {
            console.error('Fetch error:', err);
        }
    }, [teamId, timeframe, formatHistory]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        fetchData(timeframe);
    }, [timeframe, fetchData]);

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
                const config = await getTradeConfig();
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

        const handlePriceUpdate = (data) => {
            // Update the live team price if any player in the team changed
            if (team && team.players && team.players.some(p => p.id === data.playerId)) {
                // For teams, the index is a sum. We can't easily recalculate the sum 
                // without knowing ALL current prices. So we refresh team data.
                // However, to keep the chart moving, we can also refresh the history.
                fetchData(timeframe);
            }
        };

        socket.on('price_update', handlePriceUpdate);
        return () => {
            socket.off('price_update', handlePriceUpdate);
        };
    }, [socket, connected, teamId, team, fetchData, timeframe]);

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
        <div className={styles.container}>
            <Navbar />

            <main className={styles['main-content']}>
                <div className={styles['top-header']}>
                    <button onClick={() => navigate('/market')} className={styles['back-btn']}>Volver</button>
                    {portfolio && (
                        <div className={styles['wallet-info']}>
                            <span className={styles['wallet-label']}>WALLET: </span>
                            <span className={styles['wallet-value']}>{formatEU(portfolio.walletBalance)} €</span>
                        </div>
                    )}
                </div>

                <div className={styles['content-grid']}>
                    <div className={styles['left-col']}>
                        <div className={`${styles.card} glass-panel`}>
                            <h2 className={styles['chart-title']}>
                                {team ? `${team.name} (Índice)` : 'Cargando...'}
                                {team && <span className={styles['chart-price']}>
                                    <PlayerPrice price={team.price} />
                                </span>}
                            </h2>
                            <div className={styles['chart-container']}>
                                <MarketChart
                                    priceHistory={priceHistory}
                                    timeframe={timeframe}
                                    onTimeframeChange={setTimeframe}
                                />
                            </div>
                        </div>

                        <div className={`${styles['players-card']} glass-panel`}>
                            <h3 className={styles['players-title']}>Jugadores del Equipo</h3>
                            <div className={styles['table-container']}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr className={styles['table-head']}>
                                            <th className={styles['table-head-cell']}>Jugador</th>
                                            <th className={styles['table-head-cell']}>Precio</th>
                                            <th className={styles['table-head-cell']}>24h</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {team?.players?.map(p => (
                                            <tr key={p.id} className={styles['table-row']} onClick={() => navigate(`/market/player/${p.id}`)}>
                                                <td className={`${styles['table-cell']} ${styles['player-name']}`}>{p.name}</td>
                                                <td className={styles['table-cell']}>
                                                    <PlayerPrice price={p.price} />
                                                </td>
                                                <td className={styles['table-cell']}>
                                                    <PlayerChange change={p.change} indicatorType="sign" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className={styles['right-col']}>
                        {/* Tu Posición */}
                        <div className={`${styles['position-card']} glass-panel`}>
                            <h2 className={styles['position-title']}>Tu Posición</h2>
                            {teamHolding.shares > 0 ? (
                                <div className={styles['position-grid']}>
                                    <div className={styles['position-item']}>
                                        <span className={styles['position-label']}>Acciones del Equipo:</span>
                                        <span className={styles['position-value']}>{Number(teamHolding.shares).toFixed(4)}</span>
                                    </div>
                                    <div className={styles['position-item']}>
                                        <span className={styles['position-label']}>Valor Total:</span>
                                        <span className={`${styles['position-value']} ${styles['position-value-accent']}`}>{formatEU(teamHolding.value)} €</span>
                                    </div>
                                </div>
                            ) : (
                                <p className={styles['no-position']}>No tienes participaciones en este equipo.</p>
                            )}
                        </div>

                        {/* Trade Order */}
                        <div className={`${styles['trade-card']} glass-panel`}>
                            <h2 className={styles['trade-title']}>Trade Order</h2>
                            
                            <div className={styles['tab-row']}>
                                <button 
                                    className={`${styles['tab-btn']} ${activeTab === 'buy' ? styles['tab-btn-buy'] : ''}`}
                                    onClick={() => setActiveTab('buy')}
                                >BUY</button>
                                <button 
                                    className={`${styles['tab-btn']} ${activeTab === 'sell' ? styles['tab-btn-sell'] : ''}`}
                                    onClick={() => setActiveTab('sell')}
                                >SELL</button>
                            </div>

                            {activeTab === 'buy' ? (
                                <>
                                    <div className={styles['form-row']}>
                                        <div className={styles['input-group']}>
                                            <label className={styles['input-label']}>Cant. Acciones</label>
                                            <input 
                                                type="text" 
                                                className={styles.input}
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
                                        <div className={styles['input-group']}>
                                            <label className={styles['input-label']}>Valor (€)</label>
                                            <input 
                                                type="text" 
                                                className={styles.input}
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
                                    <div className={styles['quick-select-row']}>
                                        <button onClick={() => handleQuickBuy(0.25)} className={styles['quick-select-btn']}>25%</button>
                                        <button onClick={() => handleQuickBuy(0.50)} className={styles['quick-select-btn']}>50%</button>
                                        <button onClick={() => handleQuickBuy(1.00)} className={styles['quick-select-btn']}>100%</button>
                                    </div>
                                    <button 
                                        onClick={handleMarketBuy}
                                        disabled={loading || !marketBuyTotal}
                                        className={`${styles['submit-btn']} ${styles['submit-btn-buy']}`}
                                    >MARKET BUY</button>
                                </>
                            ) : (
                                <>
                                    <div className={styles['form-row']}>
                                        <div className={styles['input-group']}>
                                            <label className={styles['input-label']}>Cant. Acciones</label>
                                            <input 
                                                type="text" 
                                                className={styles.input}
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
                                        <div className={styles['input-group']}>
                                            <label className={styles['input-label']}>Valor (€)</label>
                                            <input 
                                                type="text" 
                                                className={styles.input}
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
                                    <div className={styles['quick-select-row']}>
                                        <button onClick={() => handleQuickSell(0.25)} className={styles['quick-select-btn']}>25%</button>
                                        <button onClick={() => handleQuickSell(0.50)} className={styles['quick-select-btn']}>50%</button>
                                        <button onClick={() => handleQuickSell(1.00)} className={styles['quick-select-btn']}>100%</button>
                                    </div>
                                    <button 
                                        onClick={handleMarketSell}
                                        disabled={loading || !marketSellQty}
                                        className={`${styles['submit-btn']} ${styles['submit-btn-sell']}`}
                                    >MARKET SELL</button>
                                </>
                            )}

                            {error && <p className={styles['error-text']}>{error}</p>}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
