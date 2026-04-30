import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { getTeamById, getTeamHistory, teamMarketBuy, teamMarketSell, getPortfolio, BASE_URL } from '../../../services/api';
import { useSocket } from '../../../context/SocketContext';
import PlayerChart from '../../../components/PlayerChart';

const { width } = Dimensions.get('window');

const TeamDetailScreen = () => {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    const [team, setTeam] = useState<any>(null);
    const [portfolio, setPortfolio] = useState<any>(null);
    const [priceHistory, setPriceHistory] = useState<any[]>([]);
    const [historyCache, setHistoryCache] = useState<Record<string, any[]>>({});
    const [timeframe, setTimeframe] = useState('line');
    const [chartLoading, setChartLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isTrading, setIsTrading] = useState(false);
    const [kFactor, setKFactor] = useState(0.0001);

    const [buyAmount, setBuyAmount] = useState('');
    const [buyQty, setBuyQty] = useState('');
    const [sellAmount, setSellAmount] = useState('');
    const [sellQty, setSellQty] = useState('');
    const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');

    const timeframeRef = useRef('line');
    const { socket, connected } = useSocket();

    // ── Format raw API data → [{timestamp, value}] ──────────────────────────
    const formatHistory = useCallback((raw: any[], currentSpotPrice?: number) => {
        const result = (raw || []).map((h: any) => ({
            timestamp: new Date(h.time || h.bucket_time || h.timestamp).getTime(),
            value: parseFloat(h.price || h.close) || 0,
        })).filter((p: any) => p.timestamp > 0 && p.value > 0);

        result.sort((a: any, b: any) => a.timestamp - b.timestamp);

        if (currentSpotPrice != null && currentSpotPrice > 0) {
            result.push({ timestamp: Date.now(), value: currentSpotPrice });
        }
        return result;
    }, []);

    // ── Initial data load ────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            setError('');
            const [tData, hData, pData] = await Promise.all([
                getTeamById(id as string),
                getTeamHistory(id as string, 'line'),
                getPortfolio(),
            ]);
            setTeam(tData);
            setPortfolio(pData);
            setHistoryCache({ line: hData || [] });
            setPriceHistory(formatHistory(hData || [], tData?.price));
        } catch (e: any) {
            setError('Error al cargar datos.');
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [id, formatHistory]);

    useEffect(() => {
        fetchData();
        // Fetch kFactor config
        (async () => {
            try {
                const res = await fetch(`${BASE_URL}/api/v1/trades/config`);
                const cfg = await res.json();
                if (cfg.PRICE_IMPACT_FACTOR) setKFactor(cfg.PRICE_IMPACT_FACTOR);
            } catch {}
        })();
    }, [fetchData]);

    // ── Timeframe switching ─────────────────────────────────────────────────
    const handleTimeframeChange = async (tf: string) => {
        setTimeframe(tf);
        timeframeRef.current = tf;

        if (historyCache[tf]) {
            setPriceHistory(formatHistory(historyCache[tf], team?.price));
            return;
        }

        setChartLoading(true);
        try {
            const data = await getTeamHistory(id as string, tf);
            setHistoryCache(prev => ({ ...prev, [tf]: data || [] }));
            setPriceHistory(formatHistory(data || [], team?.price));
        } catch (e) {
            console.error('Team history fetch error:', e);
        } finally {
            setChartLoading(false);
        }
    };

    // ── Fetch older data (pan past edge) ────────────────────────────────────
    const handleFetchMore = async (before: string): Promise<number> => {
        const tf = timeframeRef.current;
        try {
            const newData = await getTeamHistory(id as string, tf, before);
            if (!newData || newData.length === 0) return 0;

            setHistoryCache(prev => {
                const existing = prev[tf] || [];
                const combined = [...newData, ...existing];
                setPriceHistory(formatHistory(combined, team?.price));
                return { ...prev, [tf]: combined };
            });
            return newData.length;
        } catch (e) {
            console.error('FetchMore error:', e);
            return 0;
        }
    };

    // ── WebSocket: live team index price updates ────────────────────────────
    useEffect(() => {
        if (!socket || !connected || !id) return;

        const handlePriceUpdate = (data: any) => {
            // Team price updates arrive as price_update for individual players;
            // recompute team price from team data when any player in this team updates
            if (!team?.players?.find((p: any) => p.id === data.playerId)) return;

            setTeam((prev: any) => {
                if (!prev) return prev;
                // Update the changed player's price in the roster
                const updatedPlayers = prev.players.map((p: any) =>
                    p.id === data.playerId ? { ...p, price: parseFloat(data.price) } : p
                );
                const newTeamPrice = updatedPlayers.reduce((s: number, p: any) => s + (parseFloat(p.price) || 0), 0);
                const newPoint = { timestamp: new Date(data.timestamp).getTime(), value: parseFloat(newTeamPrice.toFixed(2)) };

                // Atomically patch priceHistory
                setPriceHistory(prev => {
                    if (!prev.length) return prev;
                    const tf = timeframeRef.current;
                    const bucketMs: Record<string, number> = { 'line': 5000, '5m': 300000, '30m': 1800000, '1h': 3600000, '2h': 7200000 };
                    const bMs = bucketMs[tf] || 300000;
                    const thisBucket = Math.floor(newPoint.timestamp / bMs) * bMs;
                    const updated = [...prev];
                    const last = updated[updated.length - 1];
                    if (last && Math.floor(last.timestamp / bMs) * bMs === thisBucket) {
                        updated[updated.length - 1] = { ...last, value: newPoint.value };
                    } else if (last && thisBucket > last.timestamp) {
                        updated.push({ timestamp: thisBucket, value: newPoint.value });
                        if (updated.length > 200) updated.shift();
                    }
                    return updated;
                });

                return { ...prev, players: updatedPlayers, price: parseFloat(newTeamPrice.toFixed(2)) };
            });
        };

        socket.on('price_update', handlePriceUpdate);
        return () => { socket.off('price_update', handlePriceUpdate); };
    }, [socket, connected, id, team?.players]);

    // ── Trade helpers ────────────────────────────────────────────────────────
    const calcBuyQty = (val: string) => {
        const v = parseFloat(val.replace(',', '.'));
        if (isNaN(v) || !team?.price) return '';
        return (Math.log((v * kFactor / team.price) + 1) / kFactor).toFixed(4);
    };
    const calcBuyVal = (qty: string) => {
        const q = parseFloat(qty.replace(',', '.'));
        if (isNaN(q) || !team?.price) return '';
        return ((team.price / kFactor) * (Math.exp(kFactor * q) - 1)).toFixed(2);
    };
    const calcSellQty = (val: string) => {
        const v = parseFloat(val.replace(',', '.'));
        if (isNaN(v) || !team?.price) return '';
        const inner = 1 - (v * kFactor / team.price);
        if (inner <= 0) return '0.0000';
        return (-Math.log(inner) / kFactor).toFixed(4);
    };
    const calcSellVal = (qty: string) => {
        const q = parseFloat(qty.replace(',', '.'));
        if (isNaN(q) || !team?.price) return '';
        return ((team.price / kFactor) * (1 - Math.exp(-kFactor * q))).toFixed(2);
    };

    const handleBuy = async () => {
        const amount = parseFloat(buyAmount.replace(',', '.'));
        if (!buyAmount || isNaN(amount)) return;
        setIsTrading(true); setError('');
        try {
            await teamMarketBuy(id as string, amount);
            setBuyAmount(''); setBuyQty('');
            const pData = await getPortfolio();
            setPortfolio(pData);
        } catch (e: any) { setError(e.message); }
        finally { setIsTrading(false); }
    };

    const handleSell = async () => {
        const qty = parseFloat(sellQty.replace(',', '.'));
        if (!sellQty || isNaN(qty)) return;
        setIsTrading(true); setError('');
        try {
            await teamMarketSell(id as string, qty);
            setSellQty(''); setSellAmount('');
            const pData = await getPortfolio();
            setPortfolio(pData);
        } catch (e: any) { setError(e.message); }
        finally { setIsTrading(false); }
    };

    const teamHolding = portfolio?.holdings?.find((h: any) => h.team_id === parseInt(id as string) || h.type === 'team' && h.player_id === parseInt(id as string));
    const sharesOwned = teamHolding?.shares_owned || 0;
    const positionValue = teamHolding?.position_value || 0;

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator size="large" color={Colors.dark.accentNeon} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.title}>{team?.name}</Text>
                <View style={styles.walletChip}>
                    <Text style={styles.walletLabel}>WALLET</Text>
                    <Text style={styles.walletValue}>
                        {portfolio?.walletBalance?.toLocaleString('es-ES', { minimumFractionDigits: 2 }) || '0,00'} €
                    </Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                {/* Hero */}
                <View style={styles.hero}>
                    <View>
                        <Text style={styles.teamName}>{team?.name}</Text>
                        <Text style={styles.teamLeague}>{team?.league_name || team?.league}</Text>
                    </View>
                    <View style={styles.priceRight}>
                        <Text style={styles.price}>{team?.price?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</Text>
                        <View style={[styles.changeBadge, { backgroundColor: (team?.change || 0) >= 0 ? 'rgba(57,255,20,0.1)' : 'rgba(255,77,77,0.1)' }]}>
                            <Text style={[styles.changeText, { color: (team?.change || 0) >= 0 ? Colors.dark.accentNeon : Colors.dark.error }]}>
                                {(team?.change || 0) >= 0 ? '+' : ''}{(team?.change || 0).toFixed(2)}%
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Chart Section */}
                <View style={styles.chartSection}>
                    <View style={styles.tfRow}>
                        {['line', '5m', '30m', '1h', '2h'].map(tf => (
                            <TouchableOpacity
                                key={tf}
                                onPress={() => handleTimeframeChange(tf)}
                                style={[styles.tfBtn, timeframe === tf && styles.tfBtnActive]}
                            >
                                <Text style={[styles.tfBtnText, timeframe === tf && styles.tfBtnTextActive]}>
                                    {tf.toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={{ minHeight: 270, position: 'relative' }}>
                        <View style={{ opacity: chartLoading ? 0.3 : 1 }}>
                            <PlayerChart
                                data={priceHistory}
                                timeframe={timeframe}
                                width={width}
                                onFetchMore={handleFetchMore}
                            />
                        </View>
                        {chartLoading && (
                            <View style={styles.chartLoader}>
                                <ActivityIndicator color={Colors.dark.accentNeon} size="large" />
                            </View>
                        )}
                    </View>
                </View>

                {/* Position */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Tu Posición</Text>
                    {sharesOwned > 0 ? (
                        <View style={{ gap: 10 }}>
                            <View style={styles.posRow}>
                                <Text style={styles.posLabel}>ACCIONES DEL EQUIPO</Text>
                                <Text style={styles.posValue}>{sharesOwned.toFixed(4)}</Text>
                            </View>
                            <View style={styles.posRow}>
                                <Text style={styles.posLabel}>VALOR TOTAL</Text>
                                <Text style={[styles.posValue, { color: Colors.dark.accentNeon }]}>{positionValue.toFixed(2)} €</Text>
                            </View>
                        </View>
                    ) : (
                        <Text style={styles.emptyPos}>No tienes participaciones en este equipo.</Text>
                    )}
                </View>

                {/* Trade Panel */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Trade Order</Text>
                    <View style={styles.tabs}>
                        <TouchableOpacity style={[styles.tab, activeTab === 'buy' && styles.activeTabBuy]} onPress={() => setActiveTab('buy')}>
                            <Text style={[styles.tabText, activeTab === 'buy' && styles.activeTabTextBuy]}>COMPRAR</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.tab, activeTab === 'sell' && styles.activeTabSell]} onPress={() => setActiveTab('sell')}>
                            <Text style={[styles.tabText, activeTab === 'sell' && styles.activeTabTextSell]}>VENDER</Text>
                        </TouchableOpacity>
                    </View>

                    {activeTab === 'buy' ? (
                        <View style={styles.form}>
                            <View style={styles.inputRow}>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>CANT. ACCIONES</Text>
                                    <TextInput style={styles.input} placeholder="0,0000" placeholderTextColor="#666"
                                        keyboardType="decimal-pad" value={buyQty}
                                        onChangeText={v => { setBuyQty(v); setBuyAmount(calcBuyVal(v)); }} />
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>VALOR (€)</Text>
                                    <TextInput style={styles.input} placeholder="0,00" placeholderTextColor="#666"
                                        keyboardType="decimal-pad" value={buyAmount}
                                        onChangeText={v => { setBuyAmount(v); setBuyQty(calcBuyQty(v)); }} />
                                </View>
                            </View>
                            <View style={styles.quickSelect}>
                                {[0.25, 0.5, 1.0].map(p => (
                                    <TouchableOpacity key={p} style={styles.quickBtn}
                                        onPress={() => {
                                            const val = ((portfolio?.walletBalance || 0) * p).toFixed(2);
                                            setBuyAmount(val); setBuyQty(calcBuyQty(val));
                                        }}>
                                        <Text style={styles.quickBtnText}>{p * 100}%</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            {error ? <Text style={styles.errorText}>{error}</Text> : null}
                            <TouchableOpacity style={[styles.actionBtn, styles.buyBtn, isTrading && styles.disabled]} onPress={handleBuy} disabled={isTrading}>
                                {isTrading ? <ActivityIndicator color="#000" /> : <Text style={styles.actionBtnText}>EJECUTAR COMPRA</Text>}
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.form}>
                            <View style={styles.inputRow}>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>CANT. ACCIONES</Text>
                                    <TextInput style={styles.input} placeholder="0,0000" placeholderTextColor="#666"
                                        keyboardType="decimal-pad" value={sellQty}
                                        onChangeText={v => { setSellQty(v); setSellAmount(calcSellVal(v)); }} />
                                    <Text style={styles.holdingHint}>En propiedad: <Text style={{ color: '#fff' }}>{sharesOwned.toFixed(4)}</Text></Text>
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>VALOR (€)</Text>
                                    <TextInput style={styles.input} placeholder="0,00" placeholderTextColor="#666"
                                        keyboardType="decimal-pad" value={sellAmount}
                                        onChangeText={v => { setSellAmount(v); setSellQty(calcSellQty(v)); }} />
                                </View>
                            </View>
                            <View style={styles.quickSelect}>
                                {[0.25, 0.5, 1.0].map(p => (
                                    <TouchableOpacity key={p} style={styles.quickBtn}
                                        onPress={() => {
                                            const qty = (Math.floor(sharesOwned * p * 10000) / 10000).toFixed(4);
                                            setSellQty(qty); setSellAmount(calcSellVal(qty));
                                        }}>
                                        <Text style={styles.quickBtnText}>{p * 100}%</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            {error ? <Text style={styles.errorText}>{error}</Text> : null}
                            <TouchableOpacity style={[styles.actionBtn, styles.sellBtn, isTrading && styles.disabled]} onPress={handleSell} disabled={isTrading}>
                                {isTrading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.actionBtnText, { color: '#fff' }]}>EJECUTAR VENTA</Text>}
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* Roster */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Roster del Equipo</Text>
                    {team?.players?.map((p: any) => (
                        <TouchableOpacity key={p.id} onPress={() => router.push(`/(tabs)/player/${p.id}` as any)} style={styles.playerRow}>
                            <View>
                                <Text style={styles.playerName}>{p.name}</Text>
                                <Text style={styles.playerPrice}>{(p.price || 0).toFixed(2)} €</Text>
                            </View>
                            <Text style={[styles.playerChange, { color: (p.change || 0) >= 0 ? Colors.dark.accentNeon : Colors.dark.error }]}>
                                {(p.change || 0) >= 0 ? '+' : ''}{(p.change || 0).toFixed(1)}%
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.dark.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', gap: 12 },
    backBtn: { backgroundColor: Colors.dark.accentNeon, padding: 8, borderRadius: 10 },
    title: { flex: 1, color: Colors.dark.text, fontSize: 16, fontWeight: '900' },
    walletChip: { alignItems: 'flex-end' },
    walletLabel: { color: Colors.dark.tabIconDefault, fontSize: 9, fontWeight: '800' },
    walletValue: { color: Colors.dark.accentNeon, fontSize: 13, fontWeight: '800' },
    scroll: { paddingBottom: 60 },
    hero: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingVertical: 20 },
    teamName: { color: Colors.dark.text, fontSize: 22, fontWeight: '900' },
    teamLeague: { color: Colors.dark.tabIconDefault, fontSize: 13, fontWeight: '600', marginTop: 2 },
    priceRight: { alignItems: 'flex-end' },
    price: { color: Colors.dark.accentNeon, fontSize: 22, fontWeight: '900' },
    changeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4 },
    changeText: { fontSize: 12, fontWeight: '700' },
    // Chart
    chartSection: { backgroundColor: 'rgba(255,255,255,0.02)', marginBottom: 24, paddingTop: 14, paddingBottom: 8, marginHorizontal: -0 },
    tfRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 10 },
    tfBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    tfBtnActive: { backgroundColor: Colors.dark.accentNeon, borderColor: Colors.dark.accentNeon },
    tfBtnText: { color: Colors.dark.tabIconDefault, fontWeight: '700', fontSize: 12 },
    tfBtnTextActive: { color: '#000', fontWeight: '900' },
    chartLoader: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
    // Cards
    card: { backgroundColor: Colors.dark.surface, marginHorizontal: 20, marginBottom: 16, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    cardTitle: { color: Colors.dark.text, fontSize: 18, fontWeight: '800', marginBottom: 14 },
    posRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    posLabel: { color: Colors.dark.tabIconDefault, fontSize: 12, fontWeight: '700' },
    posValue: { color: '#fff', fontSize: 15, fontWeight: '800' },
    emptyPos: { color: Colors.dark.tabIconDefault, fontSize: 13, textAlign: 'center' },
    // Trade
    tabs: { flexDirection: 'row', backgroundColor: '#000', padding: 4, borderRadius: 12, marginBottom: 20 },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10 },
    activeTabBuy: { backgroundColor: 'rgba(57,255,20,0.15)' },
    activeTabSell: { backgroundColor: 'rgba(255,77,77,0.15)' },
    tabText: { color: '#666', fontWeight: '800', fontSize: 13 },
    activeTabTextBuy: { color: Colors.dark.accentNeon },
    activeTabTextSell: { color: Colors.dark.error },
    form: { gap: 14 },
    inputRow: { flexDirection: 'row', gap: 12 },
    inputGroup: { flex: 1, gap: 6 },
    label: { color: Colors.dark.tabIconDefault, fontSize: 10, fontWeight: '800' },
    input: { backgroundColor: '#000', borderWidth: 1, borderColor: '#222', borderRadius: 10, padding: 12, color: '#fff', fontSize: 16, fontWeight: '600' },
    holdingHint: { color: '#666', fontSize: 10, fontWeight: '600', marginTop: 3 },
    quickSelect: { flexDirection: 'row', gap: 8 },
    quickBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#222', alignItems: 'center' },
    quickBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    errorText: { color: Colors.dark.error, fontSize: 12, fontWeight: '600' },
    actionBtn: { paddingVertical: 18, borderRadius: 14, alignItems: 'center', marginTop: 4 },
    buyBtn: { backgroundColor: Colors.dark.accentNeon },
    sellBtn: { backgroundColor: Colors.dark.error },
    actionBtnText: { color: '#000', fontSize: 16, fontWeight: '900' },
    disabled: { opacity: 0.6 },
    // Roster
    playerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
    playerName: { color: '#fff', fontSize: 14, fontWeight: '700' },
    playerPrice: { color: Colors.dark.tabIconDefault, fontSize: 12, fontWeight: '600', marginTop: 2 },
    playerChange: { fontSize: 13, fontWeight: '700' },
});

export default TeamDetailScreen;
