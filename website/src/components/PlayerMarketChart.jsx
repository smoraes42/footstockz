import React from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useSettings } from '../context/SettingsContext';
import styles from '../styles/PlayerMarket.module.css';

const TIMEFRAMES = ['line', '5m', '30m', '1h', '2h'];

/**
 * PlayerMarketChart (Simplified Pure Renderer)
 * 
 * This version removes internal state management to eliminate render-lag.
 * It expects a perfectly normalized and sorted array in `priceHistory`.
 */
export default function PlayerMarketChart({
    priceHistory = [],
    timeframe = 'line',
    onTimeframeChange,
    onLoadMore,
}) {
    const { timezone } = useSettings();
    const [viewOffset, setViewOffset] = React.useState(0);
    const [yZoom, setYZoom] = React.useState(1.0);
    const containerRef = React.useRef(null);
    const dragRef = React.useRef({ active: false, startX: 0, startOffset: 0 });

    const WINDOW_SIZE = 60;

    // Reset view when timeframe changes
    React.useEffect(() => {
        setViewOffset(0);
        setYZoom(1.0);
    }, [timeframe]);

    // ── Interaction Handlers ──────────────────────────────────────────
    const onMouseDown = (e) => {
        if (e.button !== 0) return; // Left click only
        dragRef.current = {
            active: true,
            startX: e.clientX,
            startOffset: viewOffset
        };
    };

    const onMouseMove = (e) => {
        if (!dragRef.current.active) return;
        const dx = e.clientX - dragRef.current.startX;
        const pointsPerPx = WINDOW_SIZE / (containerRef.current?.clientWidth || 1);
        const delta = Math.round(dx * pointsPerPx * 1.5);
        
        const maxOffset = Math.max(0, priceHistory.length - WINDOW_SIZE);
        const newOffset = Math.max(0, Math.min(maxOffset, dragRef.current.startOffset + delta));
        
        if (newOffset !== viewOffset) {
            setViewOffset(newOffset);
        }

        // Trigger load more if we reach the end
        if (newOffset >= maxOffset - 5 && onLoadMore) {
            // This would need more parent logic, but we keep the hook ready
        }
    };

    const onMouseUp = () => {
        dragRef.current.active = false;
    };

    // Attach wheel listener for Y-axis zoom
    React.useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const handleWheel = (e) => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.1 : 0.9;
            setYZoom(prev => Math.min(20, Math.max(0.2, prev * factor)));
        };
        el.addEventListener('wheel', handleWheel, { passive: false });
        return () => el.removeEventListener('wheel', handleWheel);
    }, []);

    // Global mouseup to catch releases outside the chart
    React.useEffect(() => {
        window.addEventListener('mouseup', onMouseUp);
        return () => window.removeEventListener('mouseup', onMouseUp);
    }, []);

    // ── Compute Slice ──────────────────────────────────────────────
    const visibleData = React.useMemo(() => {
        if (priceHistory.length === 0) return [];
        const end = priceHistory.length - viewOffset;
        const start = Math.max(0, end - WINDOW_SIZE);
        return priceHistory.slice(start, end);
    }, [priceHistory, viewOffset]);

    // Calculate Y-axis domain based on visible data
    const yDomain = React.useMemo(() => {
        const prices = visibleData.map(p => p.price).filter(v => v != null && !isNaN(v));
        if (prices.length === 0) return ['auto', 'auto'];
        const dMin = Math.min(...prices);
        const dMax = Math.max(...prices);
        const center = (dMax + dMin) / 2;
        const half = ((dMax - dMin) / 2 || 0.1) / yZoom;
        return [
            parseFloat((center - half).toFixed(4)),
            parseFloat((center + half).toFixed(4)),
        ];
    }, [visibleData, yZoom]);

    // ── Timeframe selector ──────────────────────────────────────────
    const TimeframeSelector = () => (
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
    );

    return (
        <div className={styles['chart-wrapper']}>
            <div className={styles['chart-controls-row']}>
                <TimeframeSelector />
                {viewOffset > 0 && (
                    <button className={styles['chart-reset-btn']} onClick={() => { setViewOffset(0); setYZoom(1.0); }}>
                        Reset View
                    </button>
                )}
            </div>

            <div 
                ref={containerRef}
                className={styles['chart-container']}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                style={{ cursor: dragRef.current.active ? 'grabbing' : 'grab', userSelect: 'none' }}
            >
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                        data={visibleData}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                        <XAxis
                            dataKey="timestamp"
                            type="number"
                            scale="time"
                            domain={['dataMin', 'dataMax']}
                            stroke="#444"
                            fontSize={11}
                            tick={{ fill: '#555' }}
                            tickFormatter={t => {
                                const date = new Date(t);
                                return timeframe === 'line' || timeframe === '5m' || timeframe === '30m' || timeframe === '1h'
                                    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: timezone, hour12: false })
                                    : date.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', timeZone: timezone, hour12: false });
                            }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            domain={yDomain}
                            orientation="right"
                            stroke="#444"
                            fontSize={11}
                            tick={{ fill: '#555' }}
                            tickFormatter={v => `€${Number(v).toFixed(2)}`}
                            axisLine={false}
                            tickLine={false}
                            width={50}
                            allowDataOverflow
                        />
                        <Tooltip
                            animationDuration={0}
                            labelFormatter={(ts) => {
                                if (!ts) return '';
                                return new Date(ts).toLocaleString('es-ES', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: timeframe === 'line' ? '2-digit' : undefined,
                                    timeZone: timezone,
                                    hour12: false
                                });
                            }}
                            contentStyle={{
                                backgroundColor: 'rgba(10, 10, 10, 0.95)',
                                border: '1px solid #333',
                                borderRadius: '8px',
                                fontSize: '12px',
                                backdropFilter: 'blur(10px)'
                            }}
                            itemStyle={{ color: 'var(--accent-neon)' }}
                            labelStyle={{ color: '#888', marginBottom: '4px' }}
                            formatter={v => [`€${Number(v).toFixed(2)}`, 'Price']}
                        />
                        <Line
                            type="stepAfter"
                            dataKey="price"
                            stroke="var(--accent-neon)"
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{ r: 6, fill: 'var(--accent-neon)', stroke: '#000', strokeWidth: 2 }}
                            isAnimationActive={false}
                            connectNulls
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
