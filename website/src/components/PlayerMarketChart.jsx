import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { useSettings } from '../context/SettingsContext';
import styles from '../styles/PlayerMarket.module.css';

const TIMEFRAMES = ['line', '5m', '30m', '1h', '2h'];
const DEFAULT_WINDOW = 60; // visible data points
const MIN_WINDOW = 10;
const MAX_WINDOW = 200;

/**
 * PlayerMarketChart
 *
 * Props:
 *  - variant:           'desktop' | 'mobile'  (default: 'desktop')
 *  - priceHistory:      array of formatted data points (used as initial data)
 *  - timeframe:         'line' | '5m' | '30m' | '1h' | '2h'
 *  - onTimeframeChange: (tf: string) => void
 *  - onLoadMore:        async (beforeIso: string) => DataPoint[]   — called when user drags to oldest edge
 *
 * Mobile-only props:
 *  - hoverInfo / onMouseMove / onMouseLeave
 *
 * Interactions:
 *  - Click + drag left/right  → pan the visible window through historical data
 *  - Mouse wheel (deltaY)     → zoom Y axis (compress/expand price scale)
 *  - Dragging past the oldest loaded point triggers onLoadMore to fetch more history
 */
export default function PlayerMarketChart({
    variant = 'desktop',
    priceHistory = [],
    hoverInfo = null,
    onMouseMove,
    onMouseLeave,
    timeframe = 'line',
    onTimeframeChange,
    onLoadMore,
}) {
    const { timezone } = useSettings();

    // ── Data buffer ────────────────────────────────────────────────────────
    // allData holds everything fetched so far, oldest→newest (ASC)
    const [allData, setAllData] = useState([]);

    // viewOffset: how many points from the right-end we have shifted
    // 0 = showing latest N points; increases as user drags left
    const [viewOffset, setViewOffset] = useState(0);

    // Y-axis zoom: 1.0 = default, >1 zooms in (tighter range), <1 zooms out
    const [yZoom, setYZoom] = useState(1.0);

    // Loading guard
    const isLoadingMoreRef = useRef(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);

    // No-more-history flag (stop fetching when API returns empty)
    const noMoreHistoryRef = useRef(false);

    // Drag state
    const dragRef = useRef({ active: false, startX: 0, startOffset: 0, pointsPerPx: 1 });
    const containerRef = useRef(null);

    // ── Sync priceHistory prop → allData when timeframe changes ────────────
    useEffect(() => {
        setAllData(priceHistory);
        setViewOffset(0);
        setYZoom(1.0);
        noMoreHistoryRef.current = false;
        isLoadingMoreRef.current = false;
        setIsLoadingMore(false);
    }, [priceHistory]);

    // ── Append new live data points from parent ────────────────────────────
    // When priceHistory grows (live WS updates), merge new tail into allData
    // but only if we're already viewing the latest data (viewOffset === 0)
    useEffect(() => {
        if (priceHistory.length === 0) return;
        setAllData(prev => {
            if (prev.length === 0) return priceHistory;
            const lastPrev = prev[prev.length - 1];
            const lastNew = priceHistory[priceHistory.length - 1];
            // Detect if a new point was appended
            const prevKey = lastPrev?.timestamp ?? lastPrev?.time;
            const newKey = lastNew?.timestamp ?? lastNew?.time;
            if (prevKey === newKey) return prev; // No change
            // Merge: keep prev buffer, append only genuinely new tail points
            // Find where priceHistory diverges from the end of prev
            const tail = priceHistory.filter(p => {
                const k = p?.timestamp ?? p?.time;
                return k !== prevKey && k > prevKey;
            });
            if (tail.length === 0) return prev;
            return [...prev, ...tail];
        });
    }, [priceHistory]);

    // ── Compute visible slice ──────────────────────────────────────────────
    const windowSize = DEFAULT_WINDOW;
    const visibleData = useMemo(() => {
        if (allData.length === 0) return [];
        const end = Math.max(0, allData.length - viewOffset);
        const start = Math.max(0, end - windowSize);
        return allData.slice(start, end);
    }, [allData, viewOffset, windowSize]);

    // ── Y-axis domain with zoom ────────────────────────────────────────────
    const yDomain = useMemo(() => {
        const prices = visibleData.map(p => p.price).filter(v => v != null && !isNaN(v));
        if (prices.length < 2) return ['auto', 'auto'];
        const dataMin = Math.min(...prices);
        const dataMax = Math.max(...prices);
        const center = (dataMax + dataMin) / 2;
        const baseHalf = (dataMax - dataMin) / 2 || 0.01;
        const half = baseHalf / yZoom; // zoom in → smaller half range
        const pad = half * 0.05; // tiny extra padding
        return [
            parseFloat((center - half - pad).toFixed(4)),
            parseFloat((center + half + pad).toFixed(4)),
        ];
    }, [visibleData, yZoom]);

    // ── Format X labels for visible data ──────────────────────────────────
    const formattedVisible = useMemo(() => {
        return visibleData.map(p => {
            if (p.time) return p; // already has formatted label (desktop line mode)
            if (!p.timestamp) return p;
            const t = new Date(p.timestamp);
            const label = timeframe === 'line' || timeframe === '5m' || timeframe === '30m' || timeframe === '1h'
                ? t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: timezone, hour12: false })
                : t.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: timezone, hour12: false });
            return { ...p, time: label };
        });
    }, [visibleData, timeframe, timezone]);

    // ── Load more history ──────────────────────────────────────────────────
    const loadMoreHistory = useCallback(async () => {
        if (!onLoadMore || isLoadingMoreRef.current || noMoreHistoryRef.current) return;
        const oldest = allData[0];
        if (!oldest) return;
        // Get the ISO timestamp of the oldest loaded point
        const oldestTs = oldest.timestamp
            ? new Date(oldest.timestamp).toISOString()
            : oldest.time // 'HH:MM:SS' string — can't reliably use as ISO, skip
                ? null
                : null;
        if (!oldestTs) return;

        isLoadingMoreRef.current = true;
        setIsLoadingMore(true);
        try {
            const older = await onLoadMore(oldestTs);
            if (!older || older.length === 0) {
                noMoreHistoryRef.current = true;
                return;
            }
            setAllData(prev => {
                // Deduplicate: remove any from 'older' that overlap with existing data
                const existingKeys = new Set(prev.map(p => p.timestamp ?? p.time));
                const fresh = older.filter(p => !existingKeys.has(p.timestamp ?? p.time));
                return [...fresh, ...prev];
            });
            // Shift view offset to keep the same visible range after prepend
            setViewOffset(prev => prev + older.length);
        } catch (err) {
            console.error('loadMoreHistory failed:', err);
        } finally {
            isLoadingMoreRef.current = false;
            setIsLoadingMore(false);
        }
    }, [allData, onLoadMore]);

    // ── Drag handlers ──────────────────────────────────────────────────────
    const getPointsPerPx = useCallback(() => {
        if (!containerRef.current) return 1;
        const w = containerRef.current.clientWidth;
        return windowSize / Math.max(w, 1);
    }, [windowSize]);

    const onMouseDownChart = useCallback((e) => {
        e.preventDefault();
        dragRef.current = {
            active: true,
            startX: e.clientX,
            startOffset: viewOffset,
            pointsPerPx: getPointsPerPx(),
        };
    }, [viewOffset, getPointsPerPx]);

    const onMouseMoveChart = useCallback((e) => {
        if (!dragRef.current.active) return;
        const dx = e.clientX - dragRef.current.startX;
        // dx > 0 = dragging right = showing older data (increase offset)
        // dx < 0 = dragging left = going toward present (decrease offset)
        const delta = Math.round(dx * dragRef.current.pointsPerPx * 2);
        const maxOffset = Math.max(0, allData.length - windowSize);
        const newOffset = Math.max(0, Math.min(maxOffset, dragRef.current.startOffset + delta));

        setViewOffset(newOffset);

        // Trigger load-more when close to the leftmost edge
        if (newOffset >= maxOffset - 5 && !isLoadingMoreRef.current && !noMoreHistoryRef.current) {
            loadMoreHistory();
        }
    }, [allData.length, windowSize, loadMoreHistory]);

    const onMouseUpChart = useCallback(() => {
        dragRef.current.active = false;
    }, []);

    // Touch equivalents for mobile drag
    const touchStartRef = useRef({ x: 0, offset: 0 });
    const onTouchStartChart = useCallback((e) => {
        const t = e.touches[0];
        touchStartRef.current = { x: t.clientX, offset: viewOffset };
        dragRef.current.pointsPerPx = getPointsPerPx();
    }, [viewOffset, getPointsPerPx]);

    const onTouchMoveChart = useCallback((e) => {
        const t = e.touches[0];
        const dx = t.clientX - touchStartRef.current.x;
        const delta = Math.round(dx * dragRef.current.pointsPerPx * 2);
        const maxOffset = Math.max(0, allData.length - windowSize);
        const newOffset = Math.max(0, Math.min(maxOffset, touchStartRef.current.offset + delta));
        setViewOffset(newOffset);
        if (newOffset >= maxOffset - 5 && !isLoadingMoreRef.current && !noMoreHistoryRef.current) {
            loadMoreHistory();
        }
    }, [allData.length, windowSize, loadMoreHistory]);

    // ── Wheel handler: Y-axis zoom ─────────────────────────────────────────
    const onWheelChart = useCallback((e) => {
        e.preventDefault();
        // Zoom in on scroll up (negative deltaY), out on scroll down
        const factor = e.deltaY < 0 ? 1.15 : 0.87;
        setYZoom(prev => Math.min(20, Math.max(0.1, prev * factor)));
    }, []);

    // Attach wheel listener as non-passive so we can preventDefault
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const handler = (e) => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.15 : 0.87;
            setYZoom(prev => Math.min(20, Math.max(0.1, prev * factor)));
        };
        el.addEventListener('wheel', handler, { passive: false });
        return () => el.removeEventListener('wheel', handler);
    }, []);

    // Global mouse-up to end drag even if cursor leaves the chart
    useEffect(() => {
        const up = () => { dragRef.current.active = false; };
        window.addEventListener('mouseup', up);
        return () => window.removeEventListener('mouseup', up);
    }, []);

    // ── Shared timeframe selector ──────────────────────────────────────────
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

    // ── Shared chart hint overlay ──────────────────────────────────────────
    const ChartHint = () => (
        <div className={styles['chart-hint']}>
            {isLoadingMore && <span className={styles['chart-hint-loading']}>⟳ Loading…</span>}
            {!isLoadingMore && noMoreHistoryRef.current && viewOffset > 0 && (
                <span className={styles['chart-hint-edge']}>◀ No more history</span>
            )}
        </div>
    );

    // ── Mobile variant ────────────────────────────────────────────────────
    if (variant === 'mobile') {
        return (
            <div
                className={`${styles['mobile-chart-box']} glass-panel`}
                ref={containerRef}
                onMouseDown={onMouseDownChart}
                onMouseMove={onMouseMoveChart}
                onMouseUp={onMouseUpChart}
                onTouchStart={onTouchStartChart}
                onTouchMove={onTouchMoveChart}
                style={{ cursor: 'grab', userSelect: 'none' }}
            >
                <TimeframeSelector mobile />
                <ChartHint />

                {hoverInfo && (
                    <div className={styles['mobile-tooltip']}>
                        <div className={styles['mobile-tooltip-time']}>
                            {new Date(hoverInfo.timestamp).toLocaleString('es-ES', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
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
                        data={visibleData}
                        onMouseMove={onMouseMove}
                        onMouseLeave={onMouseLeave}
                    >
                        <XAxis
                            dataKey="time"
                            type="category"
                            hide
                        />
                        <YAxis domain={yDomain} hide allowDataOverflow />
                        <Tooltip
                            animationDuration={0}
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

    // ── Desktop variant ───────────────────────────────────────────────────
    return (
        <div className={styles['chart-wrapper']}>
            <div className={styles['chart-controls-row']}>
                <TimeframeSelector />
                <div className={styles['chart-zoom-info']}>
                    <span className={styles['chart-zoom-badge']}>
                        Y {yZoom > 1 ? `${yZoom.toFixed(1)}×` : `${(1/yZoom).toFixed(1)}× out`}
                    </span>
                    {viewOffset > 0 && (
                        <button
                            className={styles['chart-reset-btn']}
                            onClick={() => { setViewOffset(0); setYZoom(1.0); }}
                        >
                            Reset View
                        </button>
                    )}
                </div>
            </div>

            <div
                ref={containerRef}
                className={styles['chart-container']}
                onMouseDown={onMouseDownChart}
                onMouseMove={onMouseMoveChart}
                onMouseUp={onMouseUpChart}
                style={{ cursor: dragRef.current?.active ? 'grabbing' : 'grab', userSelect: 'none' }}
            >
                <ChartHint />
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={visibleData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                        <XAxis
                            dataKey="time"
                            type="category"
                            stroke="#444"
                            fontSize={11}
                            tick={{ fill: '#555' }}
                            interval={Math.floor(visibleData.length / 6)} // Dynamic tick reduction
                        />
                        <YAxis
                            domain={yDomain}
                            stroke="#444"
                            fontSize={11}
                            tick={{ fill: '#555' }}
                            tickFormatter={v => `€${Number(v).toFixed(2)}`}
                            width={60}
                            allowDataOverflow
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
                            type="stepAfter"
                            dataKey="price"
                            stroke="var(--accent-neon)"
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{ r: 5, fill: 'var(--accent-neon)', strokeWidth: 0 }}
                            isAnimationActive={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
