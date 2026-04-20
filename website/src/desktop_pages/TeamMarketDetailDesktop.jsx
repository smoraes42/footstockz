import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { toast } from 'react-toastify';
import { getPortfolio, getTeamById, getTeamHistory, getMe, teamMarketBuy, teamMarketSell, getTradeConfig } from '../services/api';
import Navbar from '../components/Navbar';
import { useSocket } from '../context/SocketContext';
import styles from '../styles/TeamMarketDetailDesktop.module.css';

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
        <div className={styles.container}>
            <Navbar />

            <main className={styles.mainContent}>
                <div className={styles.topHeader}>
                    <button onClick={() => navigate('/market')} className={styles.backBtn}>Volver</button>
                    {portfolio && (
                        <div className={styles.walletInfo}>
                            <span className={styles.walletLabel}>WALLET: </span>
                            <span className={styles.walletValue}>{formatEU(portfolio.walletBalance)} €</span>
                        </div>
                    )}
                </div>

                <div className={styles.contentGrid}>
                    <div className={styles.leftCol}>
                        <div className={`${styles.card} glass-panel`}>
                            <h2 className={styles.chartTitle}>
                                {team ? `${team.name} (Índice)` : 'Cargando...'}
                                {team && <span className={styles.chartPrice}>{formatEU(team.price)} €</span>}
                            </h2>
                            <div className={styles.chartContainer}>
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

                        <div className={`${styles.playersCard} glass-panel`}>
                            <h3 className={styles.playersTitle}>Jugadores del Equipo</h3>
                            <div className={styles.tableContainer}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr className={styles.tableHead}>
                                            <th className={styles.tableHeadCell}>Jugador</th>
                                            <th className={styles.tableHeadCell}>Precio</th>
                                            <th className={styles.tableHeadCell}>24h</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {team?.players?.map(p => (
                                            <tr key={p.id} className={styles.tableRow} onClick={() => navigate(`/market/player/${p.id}`)}>
                                                <td className={`${styles.tableCell} ${styles.playerName}`}>{p.name}</td>
                                                <td className={styles.tableCell}>{formatEU(p.price)} €</td>
                                                <td className={`${styles.tableCell} ${p.change >= 0 ? styles.playerChangePositive : styles.playerChangeNegative}`}>{p.change >= 0 ? '+' : ''}{Number(p.change).toFixed(2)}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div className={styles.rightCol}>
                        {/* Tu Posición */}
                        <div className={`${styles.positionCard} glass-panel`}>
                            <h2 className={styles.positionTitle}>Tu Posición</h2>
                            {teamHolding.shares > 0 ? (
                                <div className={styles.positionGrid}>
                                    <div className={styles.positionItem}>
                                        <span className={styles.positionLabel}>Acciones del Equipo:</span>
                                        <span className={styles.positionValue}>{Number(teamHolding.shares).toFixed(4)}</span>
                                    </div>
                                    <div className={styles.positionItem}>
                                        <span className={styles.positionLabel}>Valor Total:</span>
                                        <span className={`${styles.positionValue} ${styles.positionValueAccent}`}>{formatEU(teamHolding.value)} €</span>
                                    </div>
                                </div>
                            ) : (
                                <p className={styles.noPosition}>No tienes participaciones en este equipo.</p>
                            )}
                        </div>

                        {/* Trade Order */}
                        <div className={`${styles.tradeCard} glass-panel`}>
                            <h2 className={styles.tradeTitle}>Trade Order</h2>
                            
                            <div className={styles.tabRow}>
                                <button 
                                    className={`${styles.tabBtn} ${activeTab === 'buy' ? styles.tabBtnBuy : ''}`}
                                    onClick={() => setActiveTab('buy')}
                                >BUY</button>
                                <button 
                                    className={`${styles.tabBtn} ${activeTab === 'sell' ? styles.tabBtnSell : ''}`}
                                    onClick={() => setActiveTab('sell')}
                                >SELL</button>
                            </div>

                            {activeTab === 'buy' ? (
                                <>
                                    <div className={styles.formRow}>
                                        <div className={styles.inputGroup}>
                                            <label className={styles.inputLabel}>Cant. Acciones</label>
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
                                        <div className={styles.inputGroup}>
                                            <label className={styles.inputLabel}>Valor (€)</label>
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
                                    <div className={styles.quickSelectRow}>
                                        <button onClick={() => handleQuickBuy(0.25)} className={styles.quickSelectBtn}>25%</button>
                                        <button onClick={() => handleQuickBuy(0.50)} className={styles.quickSelectBtn}>50%</button>
                                        <button onClick={() => handleQuickBuy(1.00)} className={styles.quickSelectBtn}>100%</button>
                                    </div>
                                    <button 
                                        onClick={handleMarketBuy}
                                        disabled={loading || !marketBuyTotal}
                                        className={`${styles.submitBtn} ${styles.submitBtnBuy}`}
                                    >MARKET BUY</button>
                                </>
                            ) : (
                                <>
                                    <div className={styles.formRow}>
                                        <div className={styles.inputGroup}>
                                            <label className={styles.inputLabel}>Cant. Acciones</label>
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
                                        <div className={styles.inputGroup}>
                                            <label className={styles.inputLabel}>Valor (€)</label>
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
                                    <div className={styles.quickSelectRow}>
                                        <button onClick={() => handleQuickSell(0.25)} className={styles.quickSelectBtn}>25%</button>
                                        <button onClick={() => handleQuickSell(0.50)} className={styles.quickSelectBtn}>50%</button>
                                        <button onClick={() => handleQuickSell(1.00)} className={styles.quickSelectBtn}>100%</button>
                                    </div>
                                    <button 
                                        onClick={handleMarketSell}
                                        disabled={loading || !marketSellQty}
                                        className={`${styles.submitBtn} ${styles.submitBtnSell}`}
                                    >MARKET SELL</button>
                                </>
                            )}

                            {error && <p className={styles.errorText}>{error}</p>}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
