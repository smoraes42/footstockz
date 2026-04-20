import React, { useState, useEffect, useCallback } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { API_URL } from '../services/api';
import styles from '../styles/TestOrderbook.module.css';

const API_BASE = `${API_URL}/v1`;

export default function TestOrderbook() {
    const [users, setUsers] = useState([]);
    const [players, setPlayers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedPlayer, setSelectedPlayer] = useState(null);

    const [portfolio, setPortfolio] = useState(null);
    const [priceHistory, setPriceHistory] = useState([]);
    const [orderbook, setOrderbook] = useState({ bids: [], asks: [] });

    const [orderAmount, setOrderAmount] = useState('');
    const [orderPrice, setOrderPrice] = useState('');
    const [marketBuyTotal, setMarketBuyTotal] = useState('');
    const [marketBuyQty, setMarketBuyQty] = useState('');

    const [marketSellQty, setMarketSellQty] = useState('');
    const [marketSellTotal, setMarketSellTotal] = useState('');

    const [activeTab, setActiveTab] = useState('buy');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [lastTradeResult, setLastTradeResult] = useState(null);

    // Initial Data Fetch
    useEffect(() => {
        const init = async () => {
            try {
                const [uRes, pRes] = await Promise.all([
                    fetch(`${API_BASE}/user/all`),
                    fetch(`${API_BASE}/players`)
                ]);
                const uData = await uRes.json();
                const pData = await pRes.json();

                setUsers(uData);
                setPlayers(pData);

                if (uData.length > 0) setSelectedUser(uData[0].id);
                if (pData.length > 0) setSelectedPlayer(pData[0].id);
            } catch (err) {
                console.error('Initialization error:', err);
                setError('Failed to load initial data.');
            }
        };
        init();
    }, []);

    const fetchData = useCallback(async () => {
        if (!selectedPlayer || !selectedUser) return;

        try {
            const [hRes, bRes, poRes, pRes] = await Promise.all([
                fetch(`${API_BASE}/players/${selectedPlayer}/history`),
                fetch(`${API_BASE}/trades/book/${selectedPlayer}`),
                fetch(`${API_BASE}/portfolio`, {
                    method: 'POST', // The route in portfolioRoutes uses req.body.userId if no auth
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: selectedUser })
                }),
                fetch(`${API_BASE}/players`)
            ]);

            const history = await hRes.json();
            const book = await bRes.json();
            const port = await poRes.json();
            const pData = await pRes.json();

            // Format time for Recharts
            const formattedHistory = history.map(h => ({
                ...h,
                time: new Date(h.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }));

            setPriceHistory(formattedHistory);
            setOrderbook(book);
            setPortfolio(port);
            setPlayers(pData);
        } catch (err) {
            console.error('Fetch error:', err);
        }
    }, [selectedPlayer, selectedUser]);

    // Periodic Refresh
    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 3000);
        return () => clearInterval(interval);
    }, [fetchData]);

    // Clear inputs when player changes
    useEffect(() => {
        setMarketBuyTotal('');
        setMarketBuyQty('');
        setMarketSellTotal('');
        setMarketSellQty('');
        setLastTradeResult(null);
        setError(null);
    }, [selectedPlayer]);

    const handleMarketBuy = async () => {
        if (!marketBuyTotal || !marketBuyQty || !selectedPlayer || !selectedUser) return;

        const currentPrice = currentPlayer?.price || 0;
        const expectedValue = parseFloat(marketBuyQty) * currentPrice;

        // Validate if amount and value match (allowing a small rounding tolerance)
        if (Math.abs(parseFloat(marketBuyTotal) - expectedValue) > 0.01) {
            setError("Amount and Value don't match the current price! Adjusting Value to match Amount.");
            setMarketBuyTotal(expectedValue.toLocaleString('en-US', { useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2 }));
            return;
        }

        if (portfolio && parseFloat(marketBuyTotal) > portfolio.walletBalance) {
            setError("Insufficient wallet balance for this purchase.");
            return;
        }

        setLoading(true);
        setError(null);
        setLastTradeResult(null);

        try {
            const body = {
                userId: selectedUser,
                playerId: selectedPlayer,
                quantity: parseFloat(marketBuyQty)
            };

            const res = await fetch(`${API_BASE}/trades/market-buy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to execute market buy.');

            setLastTradeResult(`Success! Bought ${data.sharesBought.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} shares at avg price ${data.avgPrice.toLocaleString('es-ES', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} €. Total spent: ${data.totalSpent.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`);
            setMarketBuyTotal('');
            setMarketBuyQty('');
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
        const targetValue = (maxSpend * percentage).toLocaleString('en-US', { useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2 });
        setMarketBuyTotal(targetValue);

        if (currentPlayer.price > 0) {
            setMarketBuyQty((parseFloat(targetValue) / currentPlayer.price).toLocaleString('en-US', { useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        } else {
            setMarketBuyQty('');
        }
    };

    const handleQuickSell = (percentage) => {
        if (!portfolio || !currentPlayer || !selectedPlayer) return;
        const holding = portfolio.holdings?.find(h => h.player_id === selectedPlayer);
        const maxShares = holding ? holding.shares_owned : 0;
        if (maxShares <= 0) return;

        const targetQty = (maxShares * percentage).toLocaleString('en-US', { useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2 });
        setMarketSellQty(targetQty);

        if (currentPlayer.price > 0) {
            setMarketSellTotal((parseFloat(targetQty) * currentPlayer.price).toLocaleString('en-US', { useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        } else {
            setMarketSellTotal('');
        }
    };

    const handleMarketSell = async () => {
        if (!marketSellTotal || !marketSellQty || !selectedPlayer || !selectedUser) return;

        const currentPrice = currentPlayer?.price || 0;
        const expectedValue = parseFloat(marketSellQty) * currentPrice;

        // Validate if amount and value match (allowing a small rounding tolerance)
        if (Math.abs(parseFloat(marketSellTotal) - expectedValue) > 0.01) {
            setError("Amount and Value don't match the current price! Adjusting Value to match Amount.");
            setMarketSellTotal(expectedValue.toLocaleString('en-US', { useGrouping: false, minimumFractionDigits: 2, maximumFractionDigits: 2 }));
            return;
        }

        const holding = portfolio?.holdings?.find(h => h.player_id === selectedPlayer);
        if (!holding || parseFloat(marketSellQty) > holding.shares_owned) {
            setError("Insufficient shares held for this sale.");
            return;
        }

        setLoading(true);
        setError(null);
        setLastTradeResult(null);

        try {
            const body = {
                userId: selectedUser,
                playerId: selectedPlayer,
                quantity: parseFloat(marketSellQty)
            };

            const res = await fetch(`${API_BASE}/trades/market-sell`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to execute market sell.');

            setLastTradeResult(`Success! Sold ${data.sharesSold} shares at avg price ${data.avgPrice.toLocaleString('es-ES', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} €. Total received: ${data.totalReceived.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`);
            setMarketSellQty('');
            setMarketSellTotal('');
            fetchData();
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
            const res = await fetch(`${API_BASE}/trades/order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: selectedUser,
                    playerId: selectedPlayer,
                    side: side === 'BUY' ? 'Buy' : 'Sell',
                    price: parseFloat(orderPrice),
                    quantity: parseFloat(orderAmount)
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to place order.');

            setOrderAmount('');
            setOrderPrice('');
            fetchData(); // Immediate refresh
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const currentPlayer = players.find(p => p.id === parseInt(selectedPlayer));

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Futstocks Market Engine Test</h1>

            <div className={styles['controls-row']}>
                <div className={styles['control-group']}>
                    <label className={styles.label}>Impersonate User:</label>
                    <select
                        className={styles.select}
                        value={selectedUser || ''}
                        onChange={(e) => setSelectedUser(parseInt(e.target.value))}
                    >
                        {users.map(u => <option key={u.id} value={u.id}>{u.username} (ID: {u.id})</option>)}
                    </select>
                </div>

                <div className={styles['control-group']}>
                    <label className={styles.label}>Select Player:</label>
                    <select
                        className={styles.select}
                        value={selectedPlayer || ''}
                        onChange={(e) => setSelectedPlayer(parseInt(e.target.value))}
                    >
                        {players.map(p => <option key={p.id} value={p.id}>{p.name} - {p.team}</option>)}
                    </select>
                </div>

                {portfolio && (
                    <div className={styles['wallet-info']}>
                        <span className={styles.label}>Wallet Balance:</span>
                        <span className={styles['wallet-value']}>{portfolio.walletBalance?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                    </div>
                )}
            </div>

            <div className={styles['main-grid']}>
                <div className={styles['left-col']}>

                    {/* Chart */}
                    <div className={styles.card}>
                        <h2 className={styles['card-title']}>
                            {currentPlayer?.name} Price Chart
                            <span className={styles['current-price-tag']}>Current: {currentPlayer?.price?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                        </h2>
                        <div className={styles['chart-wrapper']}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={priceHistory}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                                    <XAxis dataKey="time" stroke="#666" fontSize={12} />
                                    <YAxis domain={['auto', 'auto']} stroke="#666" fontSize={12} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333', borderRadius: '8px' }}
                                        itemStyle={{ color: '#00e676' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="price"
                                        stroke="#00e676"
                                        strokeWidth={3}
                                        dot={{ r: 2, fill: '#00e676' }}
                                        activeDot={{ r: 5 }}
                                        animationDuration={300}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Orderbook */}
                    <div className={styles.card}>
                        <h2 className={styles['card-title']}>Order Book</h2>

                        <div className={styles['orderbook-grid']}>
                            <div className={styles['asks-container']}>
                                <div className={styles['orderbook-header']}>
                                    <span>Price (€)</span>
                                    <span>Size</span>
                                </div>
                                {orderbook.asks.length > 0 ? (
                                    orderbook.asks.slice().reverse().map((ask, i) => (
                                        <div key={`ask-${i}`} className={styles['ask-row']}>
                                            <span className={styles['ask-price']}>{ask.price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            <span>{ask.quantity.toLocaleString()}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className={styles['empty-book']}>No SELL orders</div>
                                )}
                            </div>

                            <div className={styles['spread-indicator']}>
                                {orderbook.asks.length > 0 && orderbook.bids.length > 0
                                    ? `Spread: ${(orderbook.asks[0].price - orderbook.bids[0].price).toLocaleString('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} €`
                                    : 'Market Open'
                                }
                            </div>

                            <div className={styles['bids-container']}>
                                {orderbook.bids.length > 0 ? (
                                    orderbook.bids.map((bid, i) => (
                                        <div key={`bid-${i}`} className={styles['bid-row']}>
                                            <span className={styles['bid-price']}>{bid.price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            <span>{bid.quantity.toLocaleString()}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className={styles['empty-book']}>No BUY orders</div>
                                )}
                            </div>
                        </div>

                        {/* Open Orders */}
                        <div className={styles['open-orders-section']}>
                            <h3 className={styles['card-title-small']}>Your Open Orders</h3>
                            {portfolio?.openOrders?.length > 0 ? (
                                portfolio.openOrders.map(o => (
                                    <div key={o.order_id} className={styles['open-order-row']}>
                                        <span>{o.trade_type === 'Buy' ? 'BUY' : 'SELL'}</span>
                                        <span>{o.quantity} @ {o.target_price}</span>
                                    </div>
                                ))
                            ) : (
                                <div className={styles['no-orders']}>No active orders</div>
                            )}
                        </div>

                    </div>

                </div>

                {/* Trade Form and User Position in Right Column */}
                <div className={styles['right-col']}>
                    {/* User Position */}
                    <div className={styles.card}>
                        <h2 className={styles['card-title']}>Your Position</h2>
                        {portfolio?.holdings?.find(h => h.player_id === selectedPlayer) ? (
                            <div className={styles['position-box']}>
                                <div className={styles['pos-row']}>
                                    <span className={styles.label}>Shares Held:</span>
                                    <span className={styles['pos-value']}>{portfolio.holdings.find(h => h.player_id === selectedPlayer).shares_owned}</span>
                                </div>
                                <div className={styles['pos-row']}>
                                    <span className={styles.label}>Value:</span>
                                    <span className={styles['pos-value']}>{portfolio.holdings.find(h => h.player_id === selectedPlayer).position_value?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                                </div>
                            </div>
                        ) : (
                            <div className={styles['no-position']}>No shares held.</div>
                        )}
                    </div>

                    {/* Trade Form */}
                    <div className={styles.card}>
                        <h2 className={styles['card-title']}>Trade Order</h2>

                        {/* Tab Navigation */}
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

                        {/* Market Orders Section */}
                        <div className={styles['order-section']}>
                            {activeTab === 'buy' && (
                                <>
                                    <div className={styles['form-row']}>
                                        <div className={styles['input-group']}>
                                            <label className={styles.label}>Quantity</label>
                                            <input
                                                type="number"
                                                className={styles.input}
                                                placeholder="Qty"
                                                value={marketBuyQty}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setMarketBuyQty(val);
                                                    if (val && currentPlayer?.price) {
                                                        setMarketBuyTotal((parseFloat(val) * currentPlayer.price).toFixed(2));
                                                    } else {
                                                        setMarketBuyTotal('');
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div className={styles['input-group']}>
                                            <label className={styles.label}>Value (€)</label>
                                            <input
                                                type="number"
                                                className={`${styles.input} ${portfolio && parseFloat(marketBuyTotal) > portfolio.walletBalance ? styles['input-error'] : ''}`}
                                                placeholder="Value (€)"
                                                value={marketBuyTotal}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setMarketBuyTotal(val);
                                                    if (val && currentPlayer?.price) {
                                                        setMarketBuyQty((parseFloat(val) / currentPlayer.price).toFixed(2));
                                                    } else {
                                                        setMarketBuyQty('');
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className={styles['quick-select-row']}>
                                        <button
                                            className={styles['quick-select-btn']}
                                            onClick={() => handleQuickBuy(0.25)}
                                        >
                                            25%
                                        </button>
                                        <button
                                            className={styles['quick-select-btn']}
                                            onClick={() => handleQuickBuy(0.50)}
                                        >
                                            50%
                                        </button>
                                        <button
                                            className={styles['quick-select-btn']}
                                            onClick={() => handleQuickBuy(1.00)}
                                        >
                                            100%
                                        </button>
                                    </div>
                                    <div className={styles['button-row']}>
                                        <button
                                            disabled={loading || (marketBuyTotal && parseEU(marketBuyTotal) > (portfolio?.walletBalance || 0))}
                                            className={`${styles['buy-button']} ${(marketBuyTotal && parseEU(marketBuyTotal) > (portfolio?.walletBalance || 0)) ? styles['button-disabled'] : ''}`}
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
                                                type="number"
                                                className={`${styles.input} ${portfolio && portfolio.holdings?.find(h => h.player_id === selectedPlayer) && parseFloat(marketSellQty) > portfolio.holdings.find(h => h.player_id === selectedPlayer).shares_owned ? styles['input-error'] : ''}`}
                                                placeholder="Qty"
                                                value={marketSellQty}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setMarketSellQty(val);
                                                    if (val && currentPlayer?.price) {
                                                        setMarketSellTotal((parseFloat(val) * currentPlayer.price).toFixed(2));
                                                    } else {
                                                        setMarketSellTotal('');
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div className={styles['input-group']}>
                                            <label className={styles.label}>Value (€)</label>
                                            <input
                                                type="number"
                                                className={styles.input}
                                                placeholder="Value (€)"
                                                value={marketSellTotal}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setMarketSellTotal(val);
                                                    if (val && currentPlayer?.price) {
                                                        setMarketSellQty((parseFloat(val) / currentPlayer.price).toFixed(2));
                                                    } else {
                                                        setMarketSellQty('');
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className={styles['quick-select-row']}>
                                        <button
                                            className={styles['quick-select-btn']}
                                            onClick={() => handleQuickSell(0.25)}
                                        >
                                            25%
                                        </button>
                                        <button
                                            className={styles['quick-select-btn']}
                                            onClick={() => handleQuickSell(0.50)}
                                        >
                                            50%
                                        </button>
                                        <button
                                            className={styles['quick-select-btn']}
                                            onClick={() => handleQuickSell(1.00)}
                                        >
                                            100%
                                        </button>
                                    </div>
                                    <div className={styles['button-row']}>
                                        <button
                                            disabled={loading || (marketSellQty && parseEU(marketSellQty) > (portfolio?.holdings?.find(h => h.player_id === selectedPlayer)?.shares_owned || 0))}
                                            className={`${styles['sell-button']} ${(marketSellQty && parseEU(marketSellQty) > (portfolio?.holdings?.find(h => h.player_id === selectedPlayer)?.shares_owned || 0)) ? styles['button-disabled'] : ''}`}
                                            onClick={handleMarketSell}
                                        >
                                            {loading ? '...' : 'MARKET SELL'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        {error && (
                            <div className={`${styles['error-banner']} ${styles['error-banner-spacing']}`}>
                                {error}
                            </div>
                        )}

                        {lastTradeResult && (
                            <div className={styles['success-message']}>
                                {lastTradeResult}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
