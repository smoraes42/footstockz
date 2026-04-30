import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, PanResponder } from 'react-native';
import Svg, { Path, Line, LinearGradient, Defs, Stop, Circle, Text as SvgText } from 'react-native-svg';
import Colors from '@/constants/Colors';

const SCREEN_WIDTH = Dimensions.get('window').width;
const WINDOW_SIZE = 60;
const GESTURE_THRESHOLD = 8; // px before gesture type is locked

interface DataPoint { timestamp: number; value: number; }

interface PlayerChartProps {
  data: DataPoint[];
  timeframe: string;
  width?: number;
  /** Called when user pans into the past. Receives ISO `before` cursor. Returns count of new points prepended. */
  onFetchMore?: (before: string) => Promise<number>;
}

// ── Label helpers ─────────────────────────────────────────────────────────────
function xLabel(ts: number, tf: string) {
  if (!ts) return '';
  const d = new Date(ts);
  if (['Y', 'Max'].includes(tf)) {
    return d.toLocaleString('es-ES', { month: 'short', year: '2-digit' });
  }
  if (['2h', 'W', 'M'].includes(tf)) {
    return d.toLocaleString('es-ES', { day: '2-digit', month: '2-digit' });
  }
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function yLabel(v: number) { return `€${v.toFixed(2)}`; }

function tooltipDate(ts: number, tf: string) {
  if (!ts) return '';
  const isLong = ['Y', 'Max'].includes(tf);
  return new Date(ts).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: isLong ? undefined : '2-digit', 
    minute: isLong ? undefined : '2-digit',
    second: tf === 'line' ? '2-digit' : undefined,
    hour12: false,
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function PlayerChart({ data, timeframe, width = SCREEN_WIDTH, onFetchMore }: PlayerChartProps) {
  const Y_AXIS_W = 52;
  const X_AXIS_H = 22;
  const PAD_TOP = 10;
  const PAD_LEFT = 8;
  const chartW = width - Y_AXIS_W - PAD_LEFT;
  const chartH = 200;

  // ── State ──────────────────────────────────────────────────────────────────
  const [viewOffset, setViewOffset] = useState(0);
  const [yZoom, setYZoom] = useState(1.0);
  const [cursor, setCursor] = useState<{ x: number; idx: number } | null>(null);

  // Refs to read latest values in PanResponder without stale closures
  const voRef = useRef(0); // viewOffset ref
  const yzRef = useRef(1.0); // yZoom ref
  const dataRef = useRef(data);
  const fetchingRef = useRef(false);
  useEffect(() => { dataRef.current = data; }, [data]);

  const gesture = useRef<{
    type: 'none' | 'pan' | 'zoom' | 'crosshair';
    startX: number; startY: number;
    startOffset: number; startZoom: number;
  }>({ type: 'none', startX: 0, startY: 0, startOffset: 0, startZoom: 1 });

  // Reset on timeframe change
  useEffect(() => {
    voRef.current = 0; setViewOffset(0);
    yzRef.current = 1.0; setYZoom(1.0);
    setCursor(null);
  }, [timeframe]);

  // ── Visible slice ──────────────────────────────────────────────────────────
  const { visibleData, maxOffset } = useMemo(() => {
    const validData = data.filter(d => !isNaN(d.value) && !isNaN(d.timestamp));
    if (!validData.length) return { visibleData: [], maxOffset: 0 };
    const max = Math.max(0, validData.length - WINDOW_SIZE);
    const safe = Math.min(viewOffset, max);
    const end = validData.length - safe;
    const start = Math.max(0, end - WINDOW_SIZE);
    return { visibleData: validData.slice(start, end), maxOffset: max };
  }, [data, viewOffset]);

  // ── Y domain (zoom-aware) ──────────────────────────────────────────────────
  const { minY, maxY } = useMemo(() => {
    if (!visibleData.length) return { minY: 0, maxY: 1 };
    const vals = visibleData.map(p => p.value);
    const lo = Math.min(...vals), hi = Math.max(...vals);
    const center = (hi + lo) / 2;
    const half = ((hi - lo) / 2 || 0.01) / yZoom;
    return { minY: center - half, maxY: center + half };
  }, [visibleData, yZoom]);

  // ── Coordinate helpers ─────────────────────────────────────────────────────
  const toX = (i: number) => {
    if (visibleData.length <= 1) return PAD_LEFT + chartW / 2;
    return PAD_LEFT + (i / (visibleData.length - 1)) * chartW;
  };
  const toY = (v: number) => {
    if (maxY === minY) return PAD_TOP + chartH / 2;
    return PAD_TOP + chartH - ((v - minY) / (maxY - minY)) * chartH;
  };
  const locToIdx = (lx: number) => {
    const f = Math.max(0, Math.min(1, (lx - PAD_LEFT) / chartW));
    return Math.round(f * (visibleData.length - 1));
  };

  // ── SVG paths ──────────────────────────────────────────────────────────────
  const linePath = useMemo(() => {
    if (!visibleData.length) return '';
    return visibleData.reduce((d, p, i) => {
      const x = toX(i).toFixed(1);
      const y = toY(p.value).toFixed(1);
      if (x === 'NaN' || y === 'NaN') return d;
      return d === '' ? `M${x},${y}` : `${d} H${x} V${y}`;
    }, '');
  }, [visibleData, minY, maxY]);

  const fillPath = useMemo(() => {
    if (!linePath || !visibleData.length) return '';
    const bot = (PAD_TOP + chartH).toFixed(1);
    return `${linePath} L${toX(visibleData.length - 1).toFixed(1)},${bot} L${toX(0).toFixed(1)},${bot} Z`;
  }, [linePath, visibleData]);

  // ── Axis ticks ─────────────────────────────────────────────────────────────
  const yTicks = useMemo(() =>
    Array.from({ length: 5 }, (_, i) => {
      const val = minY + (i / 4) * (maxY - minY);
      return { val, y: PAD_TOP + chartH - (i / 4) * chartH };
    }), [minY, maxY]);

  const xTicks = useMemo(() => {
    if (!visibleData.length) return [];
    const step = Math.max(1, Math.floor(visibleData.length / 4));
    return visibleData.reduce((acc: any[], _, i) => {
      if (i % step === 0) acc.push({ x: toX(i), label: xLabel(visibleData[i].timestamp, timeframe) });
      return acc;
    }, []);
  }, [visibleData, timeframe]);

  // ── Fetch older data ───────────────────────────────────────────────────────
  const triggerFetchMore = async (currentOffset: number) => {
    if (fetchingRef.current || !onFetchMore || !dataRef.current.length) return;
    fetchingRef.current = true;
    try {
      const before = new Date(dataRef.current[0].timestamp).toISOString();
      const added = await onFetchMore(before);
      if (added > 0) {
        // Shift the viewOffset so the visible window stays in place
        voRef.current = currentOffset + added;
        setViewOffset(currentOffset + added);
      }
    } finally {
      fetchingRef.current = false;
    }
  };

  // ── PanResponder ───────────────────────────────────────────────────────────
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,

    onPanResponderGrant: (e) => {
      const { locationX, locationY } = e.nativeEvent;
      gesture.current = {
        type: 'none',
        startX: locationX, startY: locationY,
        startOffset: voRef.current, startZoom: yzRef.current,
      };
      // Immediately show crosshair on touch
      const idx = locToIdx(locationX);
      setCursor({ x: toX(idx), idx });
    },

    onPanResponderMove: (e) => {
      const { locationX, locationY } = e.nativeEvent;
      const dx = locationX - gesture.current.startX;
      const dy = locationY - gesture.current.startY;

      // Lock gesture type once threshold exceeded
      if (gesture.current.type === 'none') {
        if (Math.abs(dx) < GESTURE_THRESHOLD && Math.abs(dy) < GESTURE_THRESHOLD) {
          // Still a tap/crosshair — update crosshair position
          const idx = locToIdx(locationX);
          setCursor({ x: toX(idx), idx });
          return;
        }
        gesture.current.type = Math.abs(dx) >= Math.abs(dy) ? 'pan' : 'zoom';
        setCursor(null); // hide crosshair when panning or zooming
      }

      if (gesture.current.type === 'pan') {
        // Right drag → older data → higher offset
        const pointsPerPx = WINDOW_SIZE / chartW;
        const delta = Math.round(dx * pointsPerPx * 1.5);
        const newOffset = Math.max(0, gesture.current.startOffset + delta);
        const d = dataRef.current;
        const max = Math.max(0, d.length - WINDOW_SIZE);
        const clamped = Math.min(newOffset, max);
        voRef.current = clamped;
        setViewOffset(clamped);

        // Fetch more when nearing the oldest available data
        if (newOffset >= max - 5) {
          triggerFetchMore(clamped);
        }
      }

      if (gesture.current.type === 'zoom') {
        // Drag up (negative dy) → zoom in; drag down → zoom out
        const factor = Math.pow(1.02, -dy / 4);
        const newZoom = Math.max(0.1, Math.min(20, gesture.current.startZoom * factor));
        yzRef.current = newZoom;
        setYZoom(newZoom);
      }
    },

    onPanResponderRelease: () => {
      gesture.current.type = 'none';
      setCursor(null);
    },
    onPanResponderTerminate: () => {
      gesture.current.type = 'none';
      setCursor(null);
    },
  }), []); // stable — reads from refs

  // ── Render ─────────────────────────────────────────────────────────────────
  const tooltipPoint = cursor != null ? visibleData[cursor.idx] : null;
  const cursorY = tooltipPoint ? toY(tooltipPoint.value) : 0;
  const totalSvgH = PAD_TOP + chartH + X_AXIS_H;

  if (!data.length) {
    return (
      <View style={[styles.empty, { width }]}>
        <Text style={styles.emptyText}>Sin historial de precios</Text>
      </View>
    );
  }

  return (
    <View style={{ width }}>
      {/* Price / Date header */}
      <View style={styles.priceRow}>
        <Text style={styles.livePrice}>
          {tooltipPoint
            ? yLabel(tooltipPoint.value)
            : yLabel(visibleData[visibleData.length - 1]?.value ?? 0)}
        </Text>
        <Text style={styles.liveDatetime}>
          {tooltipPoint ? tooltipDate(tooltipPoint.timestamp, timeframe) : ''}
        </Text>
      </View>

      {/* Chart */}
      <View {...panResponder.panHandlers} style={{ width, height: totalSvgH }}>
        <Svg width={width} height={totalSvgH}>
          <Defs>
            <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={Colors.dark.accentNeon} stopOpacity={0.22} />
              <Stop offset="100%" stopColor={Colors.dark.accentNeon} stopOpacity={0} />
            </LinearGradient>
          </Defs>

          {/* Horizontal grid lines */}
          {yTicks.map((t, i) => (
            <Line key={i} x1={PAD_LEFT} y1={t.y} x2={PAD_LEFT + chartW} y2={t.y}
              stroke="#1a1a1a" strokeWidth={1} strokeDasharray="4,4" />
          ))}

          {/* Gradient fill */}
          <Path d={fillPath} fill="url(#grad)" />

          {/* Step line */}
          <Path d={linePath} stroke={Colors.dark.accentNeon} strokeWidth={2.5} fill="none" />

          {/* Y-axis labels */}
          {yTicks.map((t, i) => (
            <SvgText key={i} x={PAD_LEFT + chartW + 4} y={t.y + 4}
              fill="#555" fontSize={10} fontWeight="600">
              {yLabel(t.val)}
            </SvgText>
          ))}

          {/* X baseline */}
          <Line x1={PAD_LEFT} y1={PAD_TOP + chartH} x2={PAD_LEFT + chartW} y2={PAD_TOP + chartH}
            stroke="#222" strokeWidth={1} />

          {/* X-axis labels */}
          {xTicks.map((t, i) => (
            <SvgText key={i} x={t.x} y={PAD_TOP + chartH + 16}
              fill="#555" fontSize={10} fontWeight="600"
              textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}>
              {t.label}
            </SvgText>
          ))}

          {/* Crosshair */}
          {cursor != null && tooltipPoint && (
            <>
              <Line x1={cursor.x} y1={PAD_TOP} x2={cursor.x} y2={PAD_TOP + chartH}
                stroke={Colors.dark.accentNeon} strokeWidth={1}
                strokeDasharray="4,3" strokeOpacity={0.8} />
              <Circle cx={cursor.x} cy={cursorY} r={6}
                fill={Colors.dark.accentNeon} stroke="#000" strokeWidth={2} />
            </>
          )}
        </Svg>
      </View>

      {/* Y-zoom hint */}
      {yZoom !== 1.0 && (
        <Text style={styles.zoomHint}>Y ×{yZoom.toFixed(1)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { height: 260, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#555', fontSize: 14 },
  priceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 12, marginBottom: 8, minHeight: 28,
  },
  livePrice: { color: Colors.dark.accentNeon, fontSize: 20, fontWeight: '900' },
  liveDatetime: { color: '#555', fontSize: 12, fontWeight: '600' },
  zoomHint: { color: '#555', fontSize: 10, textAlign: 'right', paddingRight: 60, marginTop: 2 },
});
