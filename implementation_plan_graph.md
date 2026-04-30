# Chart Timeframe Selectors — Implementation Plan

## Context & Current Behavior

`player_prices` table stores one row **per trade** — every buy or sell writes `(player_id, price, created_at)`. The current "Line" chart is just those raw ticks plotted in order. This is correct: it's a **tick chart**, one point per market event.

The goal is to add a timeframe selector that aggregates those raw ticks into fixed-duration **buckets** (5m, 30m, 1h, 2h), where each bucket shows the **closing price** of that interval as the line value, and the Y axis is auto-scaled to the min/max within the visible window.

---

## Timeframe Definitions

| Label | Bucket Duration | Window (100 buckets) | Use case |
|---|---|---|---|
| **Line** | 1 tick per trade | last 100 raw ticks | Current behavior, unchanged |
| **5m** | 300 seconds | ~8.3 hours | Short intraday |
| **30m** | 1800 seconds | ~2 days | Medium intraday |
| **1h** | 3600 seconds | ~4 days | Swing view |
| **2h** | 7200 seconds | ~8 days | Multi-day |

---

## Data Shape per Timeframe

### Line (current, unchanged)
```json
[
  { "price": 12.34, "time": "09:00:15" }
]
```
- `time`: locale time string `HH:MM:SS`

### 5m / 30m / 1h / 2h (aggregated)
```json
[
  { "price": 12.34, "open": 12.10, "high": 12.50, "low": 12.05, "close": 12.34, "time": "09:00", "timestamp": 1745316000000 }
]
```
- `price` is always `close` — this is what the Line chart `dataKey` uses
- `open`, `high`, `low` are stored for future candlestick use
- `time`: formatted string for the X axis label
- `timestamp`: Unix ms for Recharts numeric axis (mobile only)

---

## Part 1 — Backend: `playerController.js`

**File:** `/home/debiandev/Public/footstockz/backend/controllers/playerController.js`

### What to change

Modify `getPlayerPriceHistory` (currently line 167) to:
1. Read an optional `?timeframe=line|5m|30m|1h|2h` query param
2. Run a different SQL query per timeframe

### New implementation

Replace the entire `getPlayerPriceHistory` function with the following:

```js
export const getPlayerPriceHistory = async (req, res) => {
    try {
        const playerId = req.params.id;
        const timeframe = req.query.timeframe || 'line';

        // Map timeframe label to bucket size in seconds
        const bucketSeconds = {
            '5m':  300,
            '30m': 1800,
            '1h':  3600,
            '2h':  7200,
        };

        if (timeframe === 'line') {
            // Raw tick data — current behavior
            const [history] = await db.query(
                'SELECT price, created_at AS time FROM player_prices WHERE player_id = ? ORDER BY created_at ASC LIMIT 100',
                [playerId]
            );
            return res.status(200).json(history);
        }

        const bucket = bucketSeconds[timeframe];
        if (!bucket) {
            return res.status(400).json({ message: 'Invalid timeframe. Use: line, 5m, 30m, 1h, 2h' });
        }

        // Aggregated OHLC query using MySQL GROUP_CONCAT trick for open/close
        // Each bucket covers `bucket` seconds. We fetch the last 100 complete buckets.
        const [history] = await db.query(`
            SELECT
                FROM_UNIXTIME(FLOOR(UNIX_TIMESTAMP(created_at) / ?) * ?) AS bucket_time,
                CAST(SUBSTRING_INDEX(GROUP_CONCAT(price ORDER BY created_at ASC  SEPARATOR ','), ',', 1)  AS DECIMAL(15,6)) AS open,
                MAX(price)  AS high,
                MIN(price)  AS low,
                CAST(SUBSTRING_INDEX(GROUP_CONCAT(price ORDER BY created_at DESC SEPARATOR ','), ',', 1) AS DECIMAL(15,6)) AS close
            FROM player_prices
            WHERE player_id = ?
            GROUP BY FLOOR(UNIX_TIMESTAMP(created_at) / ?)
            ORDER BY bucket_time ASC
            LIMIT 100
        `, [bucket, bucket, playerId, bucket]);

        return res.status(200).json(history);
    } catch (error) {
        console.error('Error fetching player history:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};
```

> **Note:** `GROUP_CONCAT` with `ORDER BY` is standard MySQL and does not need a subquery. The `CAST AS DECIMAL` ensures the string result is returned as a number.

---

## Part 2 — Frontend API: `api.js`

**File:** `/home/debiandev/Public/footstockz/website/src/services/api.js`

### What to change

`getPlayerHistory` currently takes only `id`. Add a `timeframe` parameter.

**Find this line (currently line 196):**
```js
export const getPlayerHistory = async (id) => {
    try {
        const response = await api.get(`/v1/players/${id}/history`);
```

**Replace with:**
```js
export const getPlayerHistory = async (id, timeframe = 'line') => {
    try {
        const response = await api.get(`/v1/players/${id}/history`, {
            params: { timeframe }
        });
```

No other change needed in this file.

---

## Part 3 — Parent Pages: State & Data Management

Both `PlayerMarketDesktop.jsx` and `PlayerMarketMobile.jsx` need the same three changes:

### 3a. Add `timeframe` state

Add this line near the top of the component's state declarations, after the existing `useState` calls:
```js
const [timeframe, setTimeframe] = useState('line');
```

### 3b. Update `fetchData` to accept and pass `timeframe`

**Desktop (`PlayerMarketDesktop.jsx`):**

The `fetchData` callback (around line 97) currently calls `getPlayerHistory(playerId)` with no second arg. It also formats the history as time strings. This needs to branch based on timeframe.

Replace the entire `fetchData` function with:

```js
const fetchData = useCallback(async (tf = timeframe) => {
    if (!playerId) return;
    try {
        const [history, trades, port, pData] = await Promise.all([
            getPlayerHistory(playerId, tf),
            getPlayerTradeHistory(playerId),
            getPortfolio(),
            getPlayerById(playerId)
        ]);

        let formattedHistory;

        if (tf === 'line') {
            // Raw tick: format created_at as HH:MM:SS string
            formattedHistory = (history || []).map(h => {
                const t = new Date(h.time);
                return {
                    ...h,
                    price: parseFloat(h.price) || 0,
                    time: isNaN(t.getTime()) ? '' : t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                };
            });
        } else {
            // Aggregated: format bucket_time as HH:MM (or DD/MM for 2h)
            formattedHistory = (history || []).map(h => {
                const t = new Date(h.bucket_time);
                const label = tf === '2h'
                    ? t.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                    : t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return {
                    price:     parseFloat(h.close) || 0,
                    open:      parseFloat(h.open)  || 0,
                    high:      parseFloat(h.high)  || 0,
                    low:       parseFloat(h.low)   || 0,
                    time:      label,
                    timestamp: t.getTime()
                };
            });
        }

        setPriceHistory(formattedHistory);
        setTradeHistory(trades || []);
        setPortfolio(port);
        setCurrentPlayer(pData);
    } catch (err) {
        console.error('Fetch error:', err);
    }
}, [playerId, timeframe]);
```

**Mobile (`PlayerMarketMobile.jsx`):**

Same idea. The mobile `fetchData` uses `Promise.allSettled` and formats timestamps as Unix ms. Replace the history-processing block:

```js
// Inside fetchData, replace the if (historyRes.status === 'fulfilled') block:
if (historyRes.status === 'fulfilled') {
    const tf = timeframe; // captured in closure
    let formattedHistory;

    if (tf === 'line') {
        formattedHistory = (historyRes.value || []).map(h => {
            const t = new Date(h.time);
            return {
                ...h,
                timestamp: isNaN(t.getTime()) ? Date.now() : t.getTime(),
                price: parseFloat(h.price) || 0
            };
        });
    } else {
        formattedHistory = (historyRes.value || []).map(h => {
            const t = new Date(h.bucket_time);
            return {
                price:     parseFloat(h.close) || 0,
                open:      parseFloat(h.open)  || 0,
                high:      parseFloat(h.high)  || 0,
                low:       parseFloat(h.low)   || 0,
                timestamp: t.getTime()
            };
        });
    }
    setPriceHistory(formattedHistory);
}
```

Also add `timeframe` as a dependency to the `useCallback` for `fetchData`:
```js
}, [playerId, timeframe]);
```

### 3c. Re-fetch when timeframe changes

Add a new `useEffect` in both pages that re-fetches chart data when the user changes the timeframe:

```js
useEffect(() => {
    fetchData(timeframe);
}, [timeframe]); // fetchData itself should NOT be in the deps here to avoid double-fetch
```

> **Important:** This is separate from the initial `useEffect(() => { fetchData(); }, [fetchData])`. The initial one uses `fetchData` as a dep (standard `useCallback` pattern). This new one only watches `timeframe`.

### 3d. Handle WebSocket `price_update` per timeframe

In the WebSocket `handlePriceUpdate` handler (inside the socket `useEffect`), update the logic to handle both modes:

```js
const handlePriceUpdate = (data) => {
    if (data.playerId !== parseInt(playerId)) return;

    // Always update current player live price display
    setCurrentPlayer(prev => {
        if (!prev) return null;
        return { ...prev, price: data.price, change: parseFloat(data.change || 0) };
    });
    setIsUpdated(true);
    setTimeout(() => setIsUpdated(null), 1000);

    setPriceHistory(prev => {
        const newTs = new Date(data.timestamp).getTime();

        if (timeframe === 'line') {
            // Append new raw tick — existing behavior
            const newPoint = {
                price: data.price,
                time: new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            };
            return [...prev, newPoint].slice(-100);
        }

        // For timeframe buckets: find if this event belongs to the last bucket
        const bucketMs = { '5m': 300000, '30m': 1800000, '1h': 3600000, '2h': 7200000 };
        const bMs = bucketMs[timeframe];
        const thisBucket = Math.floor(newTs / bMs) * bMs;

        const updated = [...prev];
        const last = updated[updated.length - 1];

        if (last && Math.floor(last.timestamp / bMs) * bMs === thisBucket) {
            // Update existing bucket: update close, recalc high/low
            updated[updated.length - 1] = {
                ...last,
                price: data.price,          // close = latest price
                high:  Math.max(last.high, data.price),
                low:   Math.min(last.low,  data.price),
            };
        } else {
            // New bucket: start with this tick as open=high=low=close
            const label = timeframe === '2h'
                ? new Date(thisBucket).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                : new Date(thisBucket).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            updated.push({
                price:     data.price,
                open:      data.price,
                high:      data.price,
                low:       data.price,
                time:      label,
                timestamp: thisBucket
            });
        }

        return updated.slice(-100);
    });
};
```

> **Note:** `timeframe` must be included in the dependency array of the socket `useEffect` so the handler always sees the current value:
> ```js
> }, [socket, connected, playerId, timeframe, subscribeToPlayer, unsubscribeFromPlayer]);
> ```

### 3e. Pass props to the chart component

In both pages, where `<PlayerMarketChart ... />` is rendered, add two new props:

**Desktop (current render, in the left column):**
```jsx
<PlayerMarketChart
    priceHistory={priceHistory}
    timeframe={timeframe}
    onTimeframeChange={setTimeframe}
/>
```

**Mobile:**
```jsx
<PlayerMarketChart
    variant="mobile"
    priceHistory={priceHistory}
    hoverInfo={hoverInfo}
    onMouseMove={handleChartMouseMove}
    onMouseLeave={() => setHoverInfo(null)}
    timeframe={timeframe}
    onTimeframeChange={setTimeframe}
/>
```

---

## Part 4 — Component: `PlayerMarketChart.jsx`

**File:** `/home/debiandev/Public/footstockz/website/src/components/PlayerMarketChart.jsx`

### 4a. Add new props to the signature

```js
export default function PlayerMarketChart({
    variant = 'desktop',
    priceHistory = [],
    hoverInfo = null,
    onMouseMove,
    onMouseLeave,
    timeframe = 'line',
    onTimeframeChange,
}) {
```

### 4b. Define the timeframe buttons config (above the return, shared by both variants)

```js
const TIMEFRAMES = ['line', '5m', '30m', '1h', '2h'];
```

### 4c. Compute Y axis domain from data

```js
// Derive min/max from priceHistory for explicit Y axis scaling
const prices = priceHistory.map(p => p.price).filter(Boolean);
const dataMin = prices.length ? Math.min(...prices) : 'auto';
const dataMax = prices.length ? Math.max(...prices) : 'auto';
// Add 2% padding above and below
const yPad = prices.length ? (dataMax - dataMin) * 0.02 : 0;
const yDomain = prices.length
    ? [parseFloat((dataMin - yPad).toFixed(4)), parseFloat((dataMax + yPad).toFixed(4))]
    : ['auto', 'auto'];
```

### 4d. X axis tick formatter

```js
// For timeframe views the time field is already pre-formatted.
// For 'line' on desktop it's an HH:MM:SS string — show only every Nth label to avoid crowding.
const tickCount = timeframe === 'line' ? 6 : 8;
```

Pass `tickCount` to `<XAxis interval="preserveStartEnd" />` — Recharts will auto-space them.

### 4e. Timeframe selector UI

Render the same selector bar in both variants, placed **above** the chart area. Use CSS module classes (defined in step 5).

```jsx
{/* Timeframe selector — shared between desktop and mobile */}
<div className={styles['tf-selector-row']}>
    {TIMEFRAMES.map(tf => (
        <button
            key={tf}
            onClick={() => onTimeframeChange && onTimeframeChange(tf)}
            className={`${styles['tf-btn']} ${timeframe === tf ? styles['tf-btn-active'] : ''}`}
        >
            {tf.toUpperCase()}
        </button>
    ))}
</div>
```

### 4f. Updated desktop chart block

Replace the current `<div className={styles['chart-container']}>` block with:

```jsx
<div className={styles['chart-wrapper']}>
    {/* Timeframe selector */}
    <div className={styles['tf-selector-row']}>
        {TIMEFRAMES.map(tf => (
            <button
                key={tf}
                onClick={() => onTimeframeChange?.(tf)}
                className={`${styles['tf-btn']} ${timeframe === tf ? styles['tf-btn-active'] : ''}`}
            >
                {tf.toUpperCase()}
            </button>
        ))}
    </div>

    <div className={styles['chart-container']}>
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={priceHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis
                    dataKey="time"
                    stroke="#666"
                    fontSize={11}
                    interval="preserveStartEnd"
                    tick={{ fill: '#666' }}
                />
                <YAxis
                    domain={yDomain}
                    stroke="#666"
                    fontSize={11}
                    tickFormatter={v => v.toFixed(2)}
                    width={55}
                />
                <Tooltip
                    contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--accent-neon)' }}
                    formatter={(value) => [`€${value.toFixed(2)}`, 'Price']}
                />
                <Line
                    type="monotone"
                    dataKey="price"
                    stroke="var(--accent-neon)"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5 }}
                    animationDuration={300}
                    isAnimationActive={timeframe === 'line'}
                />
            </LineChart>
        </ResponsiveContainer>
    </div>
</div>
```

> Changes vs current:
> - `dot={{ r: 2 }}` removed — dots look cluttered on 100 points, `dot={false}` is cleaner
> - `YAxis` now uses explicit `domain={yDomain}` with 2% padding
> - `animationDuration` animation only active on `line` timeframe (avoids jarring re-renders on timeframe switches)

### 4g. Updated mobile chart block

Same approach — add the selector row above the `<ResponsiveContainer>` inside the `mobile-chart-box` div:

```jsx
<div className={`${styles['mobile-chart-box']} glass-panel`}>
    {/* Timeframe selector */}
    <div className={styles['mobile-tf-selector-row']}>
        {TIMEFRAMES.map(tf => (
            <button
                key={tf}
                onClick={() => onTimeframeChange?.(tf)}
                className={`${styles['mobile-tf-btn']} ${timeframe === tf ? styles['mobile-tf-btn-active'] : ''}`}
            >
                {tf.toUpperCase()}
            </button>
        ))}
    </div>

    {hoverInfo && (
        <div className={styles['mobile-tooltip']}>
            {/* unchanged */}
        </div>
    )}
    <ResponsiveContainer width="100%" height="100%">
        <LineChart data={priceHistory} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}>
            <XAxis dataKey="timestamp" type="number" domain={['dataMin', 'dataMax']} hide />
            <YAxis domain={yDomain} hide />
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
```

---

## Part 5 — CSS: `PlayerMarket.module.css`

**File:** `/home/debiandev/Public/footstockz/website/src/styles/PlayerMarket.module.css`

Add the following new classes at the end of the file. Do **not** modify or remove existing classes.

```css
/* ── Timeframe Selector (Desktop) ─────────────────── */
.chart-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
}

.tf-selector-row {
    display: flex;
    gap: 4px;
    padding: 8px 0 6px 0;
    justify-content: flex-start;
}

.tf-btn {
    background: transparent;
    border: 1px solid #333;
    color: #666;
    font-size: 11px;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
    letter-spacing: 0.04em;
}

.tf-btn:hover {
    border-color: var(--accent-neon);
    color: var(--accent-neon);
}

.tf-btn-active {
    background: rgba(57, 255, 20, 0.1);
    border-color: var(--accent-neon);
    color: var(--accent-neon);
}

/* ── Timeframe Selector (Mobile) ──────────────────── */
.mobile-tf-selector-row {
    display: flex;
    gap: 4px;
    padding: 6px 8px 4px 8px;
    justify-content: flex-start;
    flex-shrink: 0;
}

.mobile-tf-btn {
    background: transparent;
    border: 1px solid #333;
    color: #666;
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
    letter-spacing: 0.05em;
}

.mobile-tf-btn:hover {
    border-color: var(--accent-neon);
    color: var(--accent-neon);
}

.mobile-tf-btn-active {
    background: rgba(57, 255, 20, 0.12);
    border-color: var(--accent-neon);
    color: var(--accent-neon);
}
```

---

## Execution Order

Implement in this exact order to avoid broken states mid-way:

1. **Backend** — `playerController.js` (Part 1)
2. **API layer** — `api.js` (Part 2)
3. **CSS** — `PlayerMarket.module.css` (Part 5) — add classes only, no deletions
4. **Chart component** — `PlayerMarketChart.jsx` (Part 4)
5. **Desktop page** — `PlayerMarketDesktop.jsx` (Part 3)
6. **Mobile page** — `PlayerMarketMobile.jsx` (Part 3)

---

## Verification

After implementation, verify these behaviors manually:

- [ ] Page loads with **Line** selected by default, chart shows raw ticks
- [ ] Clicking **5m** triggers a new fetch; chart re-renders with aggregated data
- [ ] Y axis range changes to reflect the min/max of the new data window
- [ ] X axis labels show `HH:MM` format for 5m/30m/1h, `DD/MM HH:MM` for 2h
- [ ] Making a trade on another tab while **5m** is selected updates the last bucket's close price live
- [ ] Making a trade while **Line** is selected appends a new raw tick (existing behavior)
- [ ] Active timeframe button is visually highlighted
- [ ] Mobile variant renders the selector inside the chart box with correct touch targets
