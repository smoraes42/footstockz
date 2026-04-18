import React, { useState, useEffect, useCallback } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const API_BASE = `${import.meta.env.VITE_API_URL}/api/v1`;

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
        <div style={styles.container}>
            <h1 style={styles.title}>Futstocks Market Engine Test</h1>

            <div style={styles.controlsRow}>
                <div style={styles.controlGroup}>
                    <label style={styles.label}>Impersonate User:</label>
                    <select
                        style={styles.select}
                        value={selectedUser || ''}
                        onChange={(e) => setSelectedUser(parseInt(e.target.value))}
                    >
                        {users.map(u => <option key={u.id} value={u.id}>{u.username} (ID: {u.id})</option>)}
                    </select>
                </div>

                <div style={styles.controlGroup}>
                    <label style={styles.label}>Select Player:</label>
                    <select
                        style={styles.select}
                        value={selectedPlayer || ''}
                        onChange={(e) => setSelectedPlayer(parseInt(e.target.value))}
                    >
                        {players.map(p => <option key={p.id} value={p.id}>{p.name} - {p.team}</option>)}
                    </select>
                </div>

                {portfolio && (
                    <div style={styles.walletInfo}>
                        <span style={styles.label}>Wallet Balance:</span>
                        <span style={styles.walletValue}>{portfolio.walletBalance?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                    </div>
                )}
            </div>

            <div style={styles.mainGrid}>
                <div style={styles.leftCol}>

                    {/* Chart */}
                    <div style={styles.card}>
                        <h2 style={styles.cardTitle}>
                            {currentPlayer?.name} Price Chart
                            <span style={styles.currentPriceTag}>Current: {currentPlayer?.price?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                        </h2>
                        <div style={{ width: '100%', height: 350 }}>
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
                    <div style={styles.card}>
                        <h2 style={styles.cardTitle}>Order Book</h2>

                        <div style={styles.orderbookGrid}>
                            <div style={styles.asksContainer}>
                                <div style={styles.orderbookHeader}>
                                    <span>Price (€)</span>
                                    <span>Size</span>
                                </div>
                                {orderbook.asks.length > 0 ? (
                                    orderbook.asks.slice().reverse().map((ask, i) => (
                                        <div key={`ask-${i}`} style={styles.askRow}>
                                            <span style={styles.askPrice}>{ask.price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            <span>{ask.quantity.toLocaleString()}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div style={styles.emptyBook}>No SELL orders</div>
                                )}
                            </div>

                            <div style={styles.spreadIndicator}>
                                {orderbook.asks.length > 0 && orderbook.bids.length > 0
                                    ? `Spread: ${(orderbook.asks[0].price - orderbook.bids[0].price).toLocaleString('es-ES', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} €`
                                    : 'Market Open'
                                }
                            </div>

                            <div style={styles.bidsContainer}>
                                {orderbook.bids.length > 0 ? (
                                    orderbook.bids.map((bid, i) => (
                                        <div key={`bid-${i}`} style={styles.bidRow}>
                                            <span style={styles.bidPrice}>{bid.price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                            <span>{bid.quantity.toLocaleString()}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div style={styles.emptyBook}>No BUY orders</div>
                                )}
                            </div>
                        </div>

                        {/* Open Orders */}
                        <div style={styles.openOrdersSection}>
                            <h3 style={styles.cardTitleSmall}>Your Open Orders</h3>
                            {portfolio?.openOrders?.length > 0 ? (
                                portfolio.openOrders.map(o => (
                                    <div key={o.order_id} style={styles.openOrderRow}>
                                        <span>{o.trade_type === 'Buy' ? 'BUY' : 'SELL'}</span>
                                        <span>{o.quantity} @ {o.target_price}</span>
                                    </div>
                                ))
                            ) : (
                                <div style={styles.noOrders}>No active orders</div>
                            )}
                        </div>

                    </div>

                </div>

                {/* Trade Form and User Position in Right Column */}
                <div style={styles.rightCol}>
                    {/* User Position */}
                    <div style={styles.card}>
                        <h2 style={styles.cardTitle}>Your Position</h2>
                        {portfolio?.holdings?.find(h => h.player_id === selectedPlayer) ? (
                            <div style={styles.positionBox}>
                                <div style={styles.posRow}>
                                    <span style={styles.label}>Shares Held:</span>
                                    <span style={styles.posValue}>{portfolio.holdings.find(h => h.player_id === selectedPlayer).shares_owned}</span>
                                </div>
                                <div style={styles.posRow}>
                                    <span style={styles.label}>Value:</span>
                                    <span style={styles.posValue}>{portfolio.holdings.find(h => h.player_id === selectedPlayer).position_value?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                                </div>
                            </div>
                        ) : (
                            <div style={styles.noPosition}>No shares held.</div>
                        )}
                    </div>

                    {/* Trade Form */}
                    <div style={styles.card}>
                        <h2 style={styles.cardTitle}>Trade Order</h2>

                        {/* Tab Navigation */}
                        <div style={styles.tabRow}>
                            <button
                                style={{
                                    ...styles.tabButton,
                                    ...(activeTab === 'buy' ? styles.activeTabBuy : {})
                                }}
                                onClick={() => setActiveTab('buy')}
                            >
                                BUY
                            </button>
                            <button
                                style={{
                                    ...styles.tabButton,
                                    ...(activeTab === 'sell' ? styles.activeTabSell : {})
                                }}
                                onClick={() => setActiveTab('sell')}
                            >
                                SELL
                            </button>
                        </div>

                        {/* Market Orders Section */}
                        <div style={styles.orderSection}>
                            {activeTab === 'buy' && (
                                <>
                                    <div style={styles.formRow}>
                                        <div style={{ ...styles.inputGroup, flex: 1 }}>
                                            <label style={styles.label}>Quantity</label>
                                            <input
                                                type="number"
                                                style={styles.input}
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
                                        <div style={{ ...styles.inputGroup, flex: 1 }}>
                                            <label style={styles.label}>Value (€)</label>
                                            <input
                                                type="number"
                                                style={{
                                                    ...styles.input,
                                                    color: portfolio && parseFloat(marketBuyTotal) > portfolio.walletBalance ? '#ff3d00' : '#fff'
                                                }}
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
                                    <div style={styles.quickSelectRow}>
                                        <button
                                            style={styles.quickSelectBtn}
                                            onClick={() => handleQuickBuy(0.25)}
                                        >
                                            25%
                                        </button>
                                        <button
                                            style={styles.quickSelectBtn}
                                            onClick={() => handleQuickBuy(0.50)}
                                        >
                                            50%
                                        </button>
                                        <button
                                            style={styles.quickSelectBtn}
                                            onClick={() => handleQuickBuy(1.00)}
                                        >
                                            100%
                                        </button>
                                    </div>
                                    <div style={{ ...styles.buttonRow, marginTop: '20px' }}>
                                        <button
                                            disabled={loading}
                                            style={{ ...styles.buyButton, width: '50%' }}
                                            onClick={handleMarketBuy}
                                        >
                                            {loading ? '...' : 'MARKET BUY'}
                                        </button>
                                    </div>
                                </>
                            )}

                            {activeTab === 'sell' && (
                                <>
                                    <div style={styles.formRow}>
                                        <div style={{ ...styles.inputGroup, flex: 1 }}>
                                            <label style={styles.label}>Quantity</label>
                                            <input
                                                type="number"
                                                style={{
                                                    ...styles.input,
                                                    color: portfolio && portfolio.holdings?.find(h => h.player_id === selectedPlayer) && parseFloat(marketSellQty) > portfolio.holdings.find(h => h.player_id === selectedPlayer).shares_owned ? '#ff3d00' : '#fff'
                                                }}
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
                                        <div style={{ ...styles.inputGroup, flex: 1 }}>
                                            <label style={styles.label}>Value (€)</label>
                                            <input
                                                type="number"
                                                style={styles.input}
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
                                    <div style={styles.quickSelectRow}>
                                        <button
                                            style={styles.quickSelectBtn}
                                            onClick={() => handleQuickSell(0.25)}
                                        >
                                            25%
                                        </button>
                                        <button
                                            style={styles.quickSelectBtn}
                                            onClick={() => handleQuickSell(0.50)}
                                        >
                                            50%
                                        </button>
                                        <button
                                            style={styles.quickSelectBtn}
                                            onClick={() => handleQuickSell(1.00)}
                                        >
                                            100%
                                        </button>
                                    </div>
                                    <div style={{ ...styles.buttonRow, marginTop: '20px' }}>
                                        <button
                                            disabled={loading}
                                            style={{ ...styles.sellButton, width: '50%' }}
                                            onClick={handleMarketSell}
                                        >
                                            {loading ? '...' : 'MARKET SELL'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        {error && (
                            <div style={{ ...styles.errorBanner, marginTop: '20px', marginBottom: '0' }}>
                                {error}
                            </div>
                        )}

                        {lastTradeResult && (
                            <div style={styles.successMessage}>
                                {lastTradeResult}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

const styles = {
    container: {
        padding: '30px',
        maxWidth: '1400px',
        margin: '0 auto',
        color: '#fff',
        fontFamily: '"Outfit", sans-serif',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
    },
    title: {
        fontSize: '2.4rem',
        fontWeight: '800',
        margin: 0,
        background: 'linear-gradient(135deg, #fff 0%, #00e676 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        letterSpacing: '-1px'
    },
    errorBanner: {
        backgroundColor: '#ff525222',
        color: '#ff5252',
        padding: '12px 20px',
        borderRadius: '8px',
        border: '1px solid #ff525244',
        fontSize: '0.9rem'
    },
    controlsRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '30px',
        padding: '20px',
        backgroundColor: '#111',
        borderRadius: '16px',
        border: '1px solid #222'
    },
    controlGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    walletInfo: {
        marginLeft: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '4px'
    },
    walletValue: {
        fontSize: '1.4rem',
        fontWeight: '700',
        color: '#00e676'
    },
    label: {
        fontSize: '0.75rem',
        color: '#666',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '1px'
    },
    select: {
        padding: '12px 20px',
        borderRadius: '12px',
        backgroundColor: '#000',
        border: '1px solid #333',
        color: '#fff',
        fontSize: '0.95rem',
        outline: 'none',
        cursor: 'pointer',
        minWidth: '200px'
    },
    input: {
        padding: '14px 18px',
        borderRadius: '12px',
        backgroundColor: '#000',
        border: '1px solid #333',
        color: '#fff',
        fontSize: '1rem',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box',
        transition: 'border-color 0.2s',
    },
    tabRow: {
        display: 'flex',
        marginBottom: '20px',
        gap: '10px',
        backgroundColor: '#0a0a0a',
        padding: '5px',
        borderRadius: '12px',
        border: '1px solid #222',
    },
    tabButton: {
        flex: 1,
        padding: '12px 16px',
        borderRadius: '8px',
        border: '1px solid transparent',
        backgroundColor: 'transparent',
        color: '#888',
        fontSize: '1rem',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.2s',
    },
    positionBox: {
        backgroundColor: '#0a0a0a',
        padding: '15px 20px',
        borderRadius: '12px',
        border: '1px solid #222',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        height: '80px',
        justifyContent: 'center',
        boxSizing: 'border-box',
    },
    posRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    posValue: {
        fontWeight: 'bold',
        fontSize: '1.1rem',
        color: '#fff',
    },
    noPosition: {
        color: '#666',
        fontStyle: 'italic',
        backgroundColor: '#0a0a0a',
        padding: '15px 20px',
        borderRadius: '12px',
        border: '1px solid #222',
        height: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
    },
    activeTabBuy: {
        backgroundColor: 'rgba(0, 230, 118, 0.15)',
        color: '#00e676',
        borderColor: '#00e676',
    },
    activeTabSell: {
        backgroundColor: 'rgba(255, 61, 0, 0.15)',
        color: '#ff3d00',
        borderColor: '#ff3d00',
    },
    toggleHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
    },
    toggleBtn: {
        background: 'none',
        border: 'none',
        color: '#00e676',
        fontSize: '0.75rem',
        cursor: 'pointer',
        padding: 0,
        textDecoration: 'underline',
    },
    mainGrid: {
        display: 'grid',
        gridTemplateColumns: '2.5fr 1fr',
        gap: '24px',
        flex: 1
    },
    leftCol: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
    },
    rightCol: {
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
    },
    card: {
        backgroundColor: '#0a0a0a',
        borderRadius: '24px',
        padding: '24px',
        border: '1px solid #1a1a1a',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    },
    cardTitle: {
        fontSize: '1.3rem',
        fontWeight: '700',
        marginBottom: '24px',
        color: '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    cardTitleSmall: {
        fontSize: '1rem',
        fontWeight: '700',
        margin: '20px 0 12px 0',
        color: '#444',
        textTransform: 'uppercase',
    },
    currentPriceTag: {
        fontSize: '0.9rem',
        backgroundColor: '#00e67611',
        color: '#00e676',
        padding: '6px 14px',
        borderRadius: '100px',
        border: '1px solid #00e67622'
    },
    twoColumnRow: {
        display: 'flex',
        gap: '24px'
    },
    formRow: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
        marginBottom: '20px',
    },
    inputGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
    },
    buttonRow: {
        display: 'flex',
        justifyContent: 'center',
    },
    buyButton: {
        padding: '18px',
        border: 'none',
        borderRadius: '14px',
        backgroundColor: '#00c853',
        color: '#000',
        fontWeight: '900',
        fontSize: '0.9rem',
        cursor: 'pointer',
        transition: 'transform 0.1s, opacity 0.2s',
    },
    sellButton: {
        padding: '18px',
        border: 'none',
        borderRadius: '14px',
        backgroundColor: '#ff5252',
        color: '#000',
        fontWeight: '900',
        fontSize: '0.9rem',
        cursor: 'pointer',
        transition: 'transform 0.1s, opacity 0.2s',
    },
    orderbookGrid: {
        display: 'flex',
        flexDirection: 'column',
    },
    orderbookHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        paddingBottom: '12px',
        color: '#444',
        fontSize: '0.8rem',
        fontWeight: '800',
        textTransform: 'uppercase'
    },
    asksContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    bidsContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
    },
    askRow: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.9rem',
        color: '#ff5252aa'
    },
    bidRow: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.9rem',
        color: '#00e676aa'
    },
    askPrice: {
        color: '#ff5252',
        fontWeight: '750',
    },
    bidPrice: {
        color: '#00e676',
        fontWeight: '750',
    },
    spreadIndicator: {
        textAlign: 'center',
        padding: '20px 0',
        color: '#333',
        fontSize: '0.8rem',
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: '2px'
    },
    emptyBook: {
        textAlign: 'center',
        color: '#222',
        padding: '10px',
        fontSize: '0.8rem'
    },
    openOrdersSection: {
        marginTop: '30px',
        borderTop: '1px solid #1a1a1a'
    },
    openOrderRow: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '8px 0',
        fontSize: '0.85rem',
        borderBottom: '1px solid #111',
        color: '#888'
    },
    noOrders: {
        color: '#222',
        fontSize: '0.8rem'
    },
    orderSection: {
        padding: '10px 0'
    },
    formRowSingle: {
        marginBottom: '20px'
    },
    divider: {
        height: '1px',
        backgroundColor: '#1a1a1a',
        margin: '20px 0'
    },
    marketBuyButton: {
        width: '100%',
        padding: '18px',
        border: 'none',
        borderRadius: '14px',
        backgroundColor: '#fff',
        color: '#000',
        fontWeight: '900',
        fontSize: '0.9rem',
        cursor: 'pointer',
        transition: 'transform 0.1s, opacity 0.2s',
        textTransform: 'uppercase',
        letterSpacing: '1px'
    },
    marketSplit: {
        display: 'flex',
        gap: '12px',
    },
    marketHalf: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    },
    inputSmall: {
        padding: '10px 14px',
        borderRadius: '10px',
        backgroundColor: '#000',
        border: '1px solid #333',
        color: '#fff',
        fontSize: '0.9rem',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box'
    },
    marketBuyButtonSmall: {
        padding: '12px',
        border: 'none',
        borderRadius: '10px',
        backgroundColor: '#fff',
        color: '#000',
        fontWeight: '900',
        fontSize: '0.8rem',
        cursor: 'pointer'
    },
    marketSellButtonSmall: {
        padding: '12px',
        border: 'none',
        borderRadius: '10px',
        backgroundColor: '#333',
        color: '#fff',
        fontWeight: '900',
        fontSize: '0.8rem',
        cursor: 'pointer'
    },
    successMessage: {
        marginTop: '20px',
        padding: '15px',
        borderRadius: '12px',
        backgroundColor: '#00c85311',
        border: '1px solid #00c85344',
        color: '#00c853',
        fontSize: '0.9rem',
        fontWeight: '600',
        textAlign: 'center'
    },
    quickSelectRow: {
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '15px',
        gap: '10px'
    },
    quickSelectBtn: {
        flex: 1,
        padding: '8px 0',
        backgroundColor: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: '8px',
        color: '#fff',
        fontSize: '0.85rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s',
    }
};
