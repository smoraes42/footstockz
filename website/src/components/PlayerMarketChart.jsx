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
}) {
    const { timezone } = useSettings();

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

    // Calculate Y-axis domain based on visible data
    const prices = priceHistory.map(p => p.price).filter(v => v != null && !isNaN(v));
    const dataMin = prices.length > 0 ? Math.min(...prices) : 0;
    const dataMax = prices.length > 0 ? Math.max(...prices) : 100;
    const padding = (dataMax - dataMin) * 0.1 || 1;
    const yDomain = [
        parseFloat((dataMin - padding).toFixed(2)),
        parseFloat((dataMax + padding).toFixed(2))
    ];

    return (
        <div className={styles['chart-wrapper']}>
            <div className={styles['chart-controls-row']}>
                <TimeframeSelector />
            </div>

            <div className={styles['chart-container']}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart 
                        data={priceHistory}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                        <XAxis
                            dataKey="time"
                            type="category"
                            stroke="#444"
                            fontSize={11}
                            tick={{ fill: '#555' }}
                            interval={Math.floor(priceHistory.length / 6)}
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
                        />
                        <Tooltip
                            animationDuration={0}
                            labelFormatter={(label, payload) => {
                                if (payload && payload.length > 0) {
                                    const data = payload[0].payload;
                                    return new Date(data.timestamp).toLocaleString('es-ES', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: timeframe === 'line' ? '2-digit' : undefined,
                                        timeZone: timezone,
                                        hour12: false
                                    });
                                }
                                return label;
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
