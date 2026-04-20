import React, { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import styles from '../styles/WalletChart.module.css';

const WalletChart = ({ 
  chartData, 
  activeTimeframe, 
  onTimeframeChange, 
  displayValue, 
  variation24h, 
  loading 
}) => {
  const [hoverInfo, setHoverInfo] = useState(null);

  const formatCompactNumber = (number) => {
    if (number >= 1000000) {
      return (number / 1000000).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'M €';
    }
    if (number >= 1000) {
      return (number / 1000).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'K €';
    }
    return Number(number).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  };

  const formatHoverTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    if (activeTimeframe === 'D') {
      return d.toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
    }
    if (activeTimeframe === 'W' || activeTimeframe === 'M') {
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    }
    if (activeTimeframe === 'Y' || activeTimeframe === 'Max') {
      return d.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
    }
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleChartMouseMove = (e) => {
    if (!e || !e.activePayload || !e.activePayload.length) { setHoverInfo(null); return; }
    const payload = e.activePayload[0].payload;
    setHoverInfo({ timestamp: payload.timestamp, value: payload.value });
  };

  const timeframes = ['D', 'W', 'M', 'Y', 'Max'];

  return (
    <div className={styles.sectionHeader}>
      <div className={styles.portfolioHeader}>
        <h2 className={styles.sectionTitle}>Cartera</h2>
        <div className={styles.portfolioValueContainer}>
          <div className={styles.portfolioValueWrapper}>
            <span className={styles.portfolioValue}>
              {loading ? '---' : formatCompactNumber(displayValue)}
            </span>
            <span className={`${styles.portfolioVariation} ${variation24h.amount >= 0 ? styles.variationUp : styles.variationDown}`}>
              {variation24h.amount >= 0 ? '+' : '-'} {Math.abs(variation24h.amount).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € ({variation24h.percent.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)
            </span>
          </div>

          <div className={styles.timeframeContainer}>
            {timeframes.map(tf => (
              <button
                key={tf}
                className={`${styles.timeframeBtn} ${activeTimeframe === tf ? styles.timeframeBtnActive : ''}`}
                onClick={() => onTimeframeChange(tf)}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} onMouseMove={handleChartMouseMove} onMouseLeave={() => setHoverInfo(null)}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent-neon)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--accent-neon)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={['dataMin', 'dataMax']}
              stroke="var(--text-muted)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              dy={10}
              tickFormatter={(unixTime) => {
                const date = new Date(unixTime);
                if (activeTimeframe === 'D') {
                  return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
                } else if (activeTimeframe === 'W') {
                  return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
                } else if (activeTimeframe === 'Y') {
                  return date.toLocaleDateString('es-ES', { month: 'short' });
                } else if (activeTimeframe === 'Max') {
                  return date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
                }
                return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
              }}
              ticks={(() => {
                if (activeTimeframe === 'D') {
                  return chartData.filter((_, i) => i % 4 === 0).map(d => d.timestamp);
                }
                if (activeTimeframe === 'W') {
                  return chartData.map(d => d.timestamp);
                }
                if (activeTimeframe === 'M') {
                  return chartData.filter((_, i) => i % 5 === 0).map(d => d.timestamp);
                }
                if (activeTimeframe === 'Y') {
                  return chartData.filter((_, i) => i % 2 === 0).map(d => d.timestamp);
                }
                if (activeTimeframe === 'Max') {
                  const interval = chartData.length > 24 ? 6 : 3;
                  return chartData.filter((_, i) => i % interval === 0 || i === chartData.length - 1).map(d => d.timestamp);
                }
                return undefined;
              })()}
            />
            <YAxis
              domain={['auto', 'auto']}
              stroke="var(--text-muted)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `€${formatCompactNumber(val)}`}
              dx={-10}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className={styles.tooltipContainer}>
                      <div className={styles.tooltipTime}>
                        {formatHoverTime(data.timestamp)}
                      </div>
                      <div className={styles.tooltipRow}>
                        <span className={styles.tooltipLabel}>VALOR:</span>
                          <span className={styles.tooltipValue}>
                            {Number(data.value).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                          </span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
              cursor={{ stroke: 'rgba(57,255,20,0.3)', strokeWidth: 2, strokeDasharray: '4 4' }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--accent-neon)"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorValue)"
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0, fill: 'var(--accent-neon)' }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default WalletChart;
