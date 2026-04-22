import React from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useSettings } from '../context/SettingsContext';
import styles from '../styles/PlayerMarket.module.css';

const TIMEFRAMES = ['line', '5m', '30m', '1h', '2h'];

/**
 * PlayerMarketChart
 *
 * Props:
 *  - variant:           'desktop' | 'mobile'  (default: 'desktop')
 *  - priceHistory:      array of formatted data points
 *  - timeframe:         'line' | '5m' | '30m' | '1h' | '2h'  (default: 'line')
 *  - onTimeframeChange: (tf: string) => void
 *
 * Mobile-only props:
 *  - hoverInfo:    { timestamp, price } | null
 *  - onMouseMove:  recharts onMouseMove handler
 *  - onMouseLeave: recharts onMouseLeave handler
 *
 * Data shape per timeframe:
 *  - line:               { price, time }          — time is 'HH:MM:SS' string
 *  - 5m/30m/1h/2h:      { price (=close), open, high, low, time, timestamp }
 */
export default function PlayerMarketChart({
    variant = 'desktop',
    priceHistory = [],
    hoverInfo = null,
    onMouseMove,
    onMouseLeave,
    timeframe = 'line',
    onTimeframeChange,
}) {
    const { timezone } = useSettings();

    // Compute Y axis domain from data with 2% padding
    const prices = priceHistory.map(p => p.price).filter(v => v != null && !isNaN(v));
    let yDomain = ['auto', 'auto'];
    if (prices.length >= 2) {
        const dataMin = Math.min(...prices);
        const dataMax = Math.max(...prices);
        const pad = (dataMax - dataMin) * 0.02 || 0.01;
        yDomain = [
            parseFloat((dataMin - pad).toFixed(4)),
            parseFloat((dataMax + pad).toFixed(4)),
        ];
    }

    // Shared timeframe selector bar
    const TimeframeSelector = ({ mobile = false }) => (
        <div className={mobile ? styles['mobile-tf-selector-row'] : styles['tf-selector-row']}>
            {TIMEFRAMES.map(tf => (
                <button
                    key={tf}
                    onClick={() => onTimeframeChange?.(tf)}
                    className={[
                        mobile ? styles['mobile-tf-btn'] : styles['tf-btn'],
                        timeframe === tf
                            ? (mobile ? styles['mobile-tf-btn-active'] : styles['tf-btn-active'])
                            : ''
                    ].join(' ')}
                >
                    {tf.toUpperCase()}
                </button>
            ))}
        </div>
    );

    if (variant === 'mobile') {
        return (
            <div className={`${styles['mobile-chart-box']} glass-panel`}>
                <TimeframeSelector mobile />

                {hoverInfo && (
                    <div className={styles['mobile-tooltip']}>
                        <div className={styles['mobile-tooltip-time']}>
                            {new Date(hoverInfo.timestamp).toLocaleString('es-ES', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false,
                                timeZone: timezone
                            })}
                        </div>
                        <div className={styles['mobile-tooltip-price']}>
                            €{Number(hoverInfo.price).toFixed(2)}
                        </div>
                    </div>
                )}

                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={priceHistory}
                        onMouseMove={onMouseMove}
                        onMouseLeave={onMouseLeave}
                    >
                        <XAxis
                            dataKey="timestamp"
                            type="number"
                            domain={['dataMin', 'dataMax']}
                            hide
                        />
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
        );
    }

    // Desktop variant
    return (
        <div className={styles['chart-wrapper']}>
            <TimeframeSelector />

            <div className={styles['chart-container']}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={priceHistory}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                        <XAxis
                            dataKey="time"
                            stroke="#444"
                            fontSize={11}
                            tick={{ fill: '#555' }}
                            interval="preserveStartEnd"
                        />
                        <YAxis
                            domain={yDomain}
                            stroke="#444"
                            fontSize={11}
                            tick={{ fill: '#555' }}
                            tickFormatter={v => `€${Number(v).toFixed(2)}`}
                            width={60}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#0a0a0a',
                                border: '1px solid #333',
                                borderRadius: '8px',
                                fontSize: '12px',
                            }}
                            itemStyle={{ color: 'var(--accent-neon)' }}
                            labelStyle={{ color: '#666', marginBottom: '4px' }}
                            formatter={v => [`€${Number(v).toFixed(2)}`, 'Price']}
                        />
                        <Line
                            type="monotone"
                            dataKey="price"
                            stroke="var(--accent-neon)"
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{ r: 5, fill: 'var(--accent-neon)', strokeWidth: 0 }}
                            isAnimationActive={timeframe === 'line'}
                            animationDuration={300}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
