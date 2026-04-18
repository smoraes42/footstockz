import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-wagmi-charts';
import Colors from '@/constants/Colors';
import { getTeamById, getTeamHistory, teamMarketBuy, teamMarketSell, getPortfolio } from '../../services/api';
import { BASE_URL } from '../../services/api';

const { width } = Dimensions.get('window');

const TeamDetailScreen = () => {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [team, setTeam] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [portfolio, setPortfolio] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [buyAmount, setBuyAmount] = useState('');
    const [buyQty, setBuyQty] = useState('');
    const [sellAmount, setSellAmount] = useState('');
    const [sellQty, setSellQty] = useState('');
    const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
    const [isTrading, setIsTrading] = useState(false);
    const [kFactor, setKFactor] = useState(0.0001);

    const fetchData = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            const [tData, hData, pData] = await Promise.all([
                getTeamById(id as string),
                getTeamHistory(id as string),
                getPortfolio()
            ]);
            setTeam(tData);
            setPortfolio(pData);
            
            // Format history for wagmi-charts
            const formatted = hData.map((h: any) => ({
                timestamp: new Date(h.time).getTime(),
                value: parseFloat(h.price)
            }));
            setHistory(formatted);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();
        const fetchConfig = async () => {
            try {
                const res = await fetch(`${BASE_URL}/api/v1/trades/config`);
                const config = await res.json();
                if (config.PRICE_IMPACT_FACTOR) setKFactor(config.PRICE_IMPACT_FACTOR);
            } catch (err) { console.error(err); }
        };
        fetchConfig();
    }, [fetchData]);

    const calculateQuantityFromBuyValue = (value: string, p0: number) => {
        const v = parseFloat(value.replace(',', '.'));
        if (isNaN(v) || !p0 || p0 <= 0) return '';
        const q = Math.log((v * kFactor / p0) + 1) / kFactor;
        return q.toFixed(4);
    };

    const calculateValueFromBuyQuantity = (qStr: string, p0: number) => {
        const qty = parseFloat(qStr.replace(',', '.'));
        if (isNaN(qty) || !p0 || p0 <= 0) return '';
        const v = (p0 / kFactor) * (Math.exp(kFactor * qty) - 1);
        return v.toFixed(2);
    };

    const calculateQuantityFromSellValue = (value: string, p0: number) => {
        const v = parseFloat(value.replace(',', '.'));
        if (isNaN(v) || !p0 || p0 <= 0) return '';
        const inner = 1 - (v * kFactor / p0);
        if (inner <= 0) return '0.00';
        const q = -Math.log(inner) / kFactor;
        return q.toFixed(4);
    };

    const calculateValueFromSellQuantity = (qStr: string, p0: number) => {
        const qty = parseFloat(qStr.replace(',', '.'));
        if (isNaN(qty) || !p0 || p0 <= 0) return '';
        const v = (p0 / kFactor) * (1 - Math.exp(-kFactor * qty));
        return v.toFixed(2);
    };

    const handleBuy = async () => {
        if (!buyAmount || isNaN(parseFloat(buyAmount))) return;
        try {
            setIsTrading(true);
            await teamMarketBuy(id as string, parseFloat(buyAmount.replace(',', '.')));
            alert('¡Inversión exitosa!');
            setBuyAmount('');
            setBuyQty('');
            fetchData();
        } catch (e: any) {
            alert('Error: ' + e.message);
        } finally {
            setIsTrading(false);
        }
    };

    const handleSell = async () => {
        if (!sellQty || isNaN(parseFloat(sellQty))) return;
        try {
            setIsTrading(true);
            await teamMarketSell(id as string, parseFloat(sellQty.replace(',', '.')));
            alert('¡Venta exitosa!');
            setSellQty('');
            setSellAmount('');
            fetchData();
        } catch (e: any) {
            alert('Error: ' + e.message);
        } finally {
            setIsTrading(false);
        }
    };

    const handleQuickBuy = (percentage: number) => {
        if (!portfolio || !team) return;
        const maxSpend = portfolio.walletBalance || 0;
        const targetValue = maxSpend * percentage;
        setBuyAmount(targetValue.toFixed(2));
        if (team.price > 0) {
            setBuyQty(calculateQuantityFromBuyValue(targetValue.toString(), team.price));
        }
    };

    const handleQuickSell = (percentage: number) => {
        if (!teamHolding || !team) return;
        const maxShares = teamHolding.shares;
        if (maxShares <= 0) return;
        const targetQty = Math.floor(maxShares * percentage * 10000) / 10000;
        setSellQty(targetQty.toFixed(4));
        if (team.price > 0) {
            setSellAmount(calculateValueFromSellQuantity(targetQty.toString(), team.price));
        }
    };

    const teamHolding = team?.players?.reduce((acc: any, p: any) => {
        const h = portfolio?.holdings?.find((hold: any) => hold.player_id === p.id);
        if (!h) return { ...acc, shares: 0 };
        return {
            shares: Math.min(acc.shares, h.shares_owned),
            value: acc.value + (h.position_value || 0)
        };
    }, { shares: Infinity, value: 0 }) || { shares: 0, value: 0 };

    if (teamHolding.shares === Infinity) teamHolding.shares = 0;

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
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>Índice de Equipo</Text>
                    <Text style={styles.priceValue}>{team?.price.toFixed(2)} €</Text>
                    <Text style={[styles.priceChange, { color: team?.change >= 0 ? Colors.dark.accentNeon : Colors.dark.error }]}>
                        {team?.change >= 0 ? '+' : ''}{team?.change.toFixed(2)}% (24h)
                    </Text>
                </View>

                {history.length > 1 && (
                    <View style={styles.chartContainer}>
                        <LineChart.Provider data={history}>
                            <LineChart height={220} width={width - 40}>
                                <LineChart.Path color={Colors.dark.accentNeon} width={2} />
                                <LineChart.CursorLine color={Colors.dark.accentNeon} />
                            </LineChart>
                        </LineChart.Provider>
                    </View>
                )}

                <View style={[styles.card, { marginTop: 20 }]}>
                    <Text style={styles.cardTitle}>Tu Posición</Text>
                    {teamHolding.shares > 0 ? (
                        <View style={{ gap: 10 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ color: Colors.dark.tabIconDefault, fontSize: 13, fontWeight: '700' }}>ACCIONES DEL EQUIPO:</Text>
                                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>{teamHolding.shares.toFixed(4)}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={{ color: Colors.dark.tabIconDefault, fontSize: 13, fontWeight: '700' }}>VALOR TOTAL:</Text>
                                <Text style={{ color: Colors.dark.accentNeon, fontSize: 15, fontWeight: '800' }}>{teamHolding.value.toFixed(2)} €</Text>
                            </View>
                        </View>
                    ) : (
                        <Text style={{ color: Colors.dark.tabIconDefault, fontSize: 13, textAlign: 'center' }}>No tienes participaciones en este equipo.</Text>
                    )}
                </View>

                <View style={[styles.card, { marginTop: 20 }]}>
                    <Text style={styles.cardTitle}>Trade Order</Text>
                    
                    <View style={{ flexDirection: 'row', marginBottom: 20, gap: 10, backgroundColor: '#000', padding: 5, borderRadius: 15 }}>
                        <TouchableOpacity 
                            style={{ flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', backgroundColor: activeTab === 'buy' ? 'rgba(57,255,20,0.1)' : 'transparent' }}
                            onPress={() => setActiveTab('buy')}
                        >
                            <Text style={{ color: activeTab === 'buy' ? Colors.dark.accentNeon : '#666', fontWeight: '800' }}>BUY</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={{ flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', backgroundColor: activeTab === 'sell' ? 'rgba(255,77,77,0.1)' : 'transparent' }}
                            onPress={() => setActiveTab('sell')}
                        >
                            <Text style={{ color: activeTab === 'sell' ? Colors.dark.error : '#666', fontWeight: '800' }}>SELL</Text>
                        </TouchableOpacity>
                    </View>

                    {activeTab === 'buy' ? (
                        <>
                            <View style={{ flexDirection: 'row', gap: 15, marginBottom: 15 }}>
                                <View style={{ flex: 1, gap: 5 }}>
                                    <Text style={styles.label}>CANT. ACCIONES</Text>
                                    <TextInput 
                                        style={[styles.input, { padding: 10, fontSize: 16 }]}
                                        placeholder="0.0000"
                                        placeholderTextColor="#444"
                                        keyboardType="numeric"
                                        value={buyQty}
                                        onChangeText={(v) => {
                                            setBuyQty(v);
                                            if (v && team?.price) setBuyAmount(calculateValueFromBuyQuantity(v, team.price));
                                            else setBuyAmount('');
                                        }}
                                    />
                                </View>
                                <View style={{ flex: 1, gap: 5 }}>
                                    <Text style={styles.label}>VALOR (€)</Text>
                                    <TextInput 
                                        style={[styles.input, { padding: 10, fontSize: 16 }]}
                                        placeholder="0.00"
                                        placeholderTextColor="#444"
                                        keyboardType="numeric"
                                        value={buyAmount}
                                        onChangeText={(v) => {
                                            setBuyAmount(v);
                                            if (v && team?.price) setBuyQty(calculateQuantityFromBuyValue(v, team.price));
                                            else setBuyQty('');
                                        }}
                                    />
                                </View>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                                {[0.25, 0.5, 1.0].map(p => (
                                    <TouchableOpacity key={p} onPress={() => handleQuickBuy(p)} style={{ flex: 1, padding: 8, borderRadius: 8, backgroundColor: '#111', borderWidth: 1, borderColor: '#222', alignItems: 'center' }}>
                                        <Text style={{ color: '#666', fontWeight: '700', fontSize: 12 }}>{p * 100}%</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <TouchableOpacity 
                                style={[styles.buyBtn, isTrading && { opacity: 0.7 }]} 
                                onPress={handleBuy}
                                disabled={isTrading}
                            >
                                {isTrading ? <ActivityIndicator color="#000" /> : <Text style={styles.buyBtnText}>MARKET BUY</Text>}
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <View style={{ flexDirection: 'row', gap: 15, marginBottom: 15 }}>
                                <View style={{ flex: 1, gap: 5 }}>
                                    <Text style={styles.label}>CANT. ACCIONES</Text>
                                    <TextInput 
                                        style={[styles.input, { padding: 10, fontSize: 16 }]}
                                        placeholder="0.0000"
                                        placeholderTextColor="#444"
                                        keyboardType="numeric"
                                        value={sellQty}
                                        onChangeText={(v) => {
                                            setSellQty(v);
                                            if (v && team?.price) setSellAmount(calculateValueFromSellQuantity(v, team.price));
                                            else setSellAmount('');
                                        }}
                                    />
                                </View>
                                <View style={{ flex: 1, gap: 5 }}>
                                    <Text style={styles.label}>VALOR (€)</Text>
                                    <TextInput 
                                        style={[styles.input, { padding: 10, fontSize: 16 }]}
                                        placeholder="0.00"
                                        placeholderTextColor="#444"
                                        keyboardType="numeric"
                                        value={sellAmount}
                                        onChangeText={(v) => {
                                            setSellAmount(v);
                                            if (v && team?.price) setSellQty(calculateQuantityFromSellValue(v, team.price));
                                            else setSellQty('');
                                        }}
                                    />
                                </View>
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                                {[0.25, 0.5, 1.0].map(p => (
                                    <TouchableOpacity key={p} onPress={() => handleQuickSell(p)} style={{ flex: 1, padding: 8, borderRadius: 8, backgroundColor: '#111', borderWidth: 1, borderColor: '#222', alignItems: 'center' }}>
                                        <Text style={{ color: '#666', fontWeight: '700', fontSize: 12 }}>{p * 100}%</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <TouchableOpacity 
                                style={[styles.buyBtn, { backgroundColor: Colors.dark.error }, isTrading && { opacity: 0.7 }]} 
                                onPress={handleSell}
                                disabled={isTrading}
                            >
                                {isTrading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.buyBtnText, { color: '#fff' }]}>MARKET SELL</Text>}
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                <View style={[styles.card, { marginTop: 20 }]}>
                    <Text style={styles.cardTitle}>Roster del Equipo</Text>
                    {team?.players?.map((p: any) => (
                        <TouchableOpacity key={p.id} onPress={() => router.push(`/(tabs)/player/${p.id}`)} style={styles.playerRow}>
                            <View>
                                <Text style={styles.playerName}>{p.name}</Text>
                                <Text style={styles.playerChange}>{p.price.toFixed(2)} €</Text>
                            </View>
                            <Text style={[styles.playerChange, { color: p.change >= 0 ? Colors.dark.accentNeon : Colors.dark.error }]}>
                                {p.change >= 0 ? '+' : ''}{p.change.toFixed(1)}%
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
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 15 },
    backBtn: { backgroundColor: Colors.dark.accentNeon, padding: 8, borderRadius: 10 },
    title: { color: Colors.dark.text, fontSize: 20, fontWeight: '900' },
    scroll: { paddingBottom: 40 },
    priceContainer: { paddingHorizontal: 20, marginBottom: 10 },
    priceLabel: { color: Colors.dark.tabIconDefault, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    priceValue: { color: Colors.dark.text, fontSize: 32, fontWeight: '900', marginVertical: 4 },
    priceChange: { fontSize: 16, fontWeight: '700' },
    chartContainer: { height: 220, marginHorizontal: 20, marginTop: 10 },
    card: { backgroundColor: Colors.dark.surface, marginHorizontal: 20, padding: 20, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    cardTitle: { color: Colors.dark.text, fontSize: 18, fontWeight: '800', marginBottom: 8 },
    cardDesc: { color: Colors.dark.tabIconDefault, fontSize: 13, marginBottom: 20 },
    inputGroup: { gap: 8, marginBottom: 20 },
    label: { color: Colors.dark.tabIconDefault, fontSize: 10, fontWeight: '800' },
    input: { backgroundColor: '#000', borderWidth: 1, borderColor: '#222', borderRadius: 12, padding: 15, color: '#fff', fontSize: 18, fontWeight: '700' },
    buyBtn: { backgroundColor: Colors.dark.accentNeon, padding: 18, borderRadius: 12, alignItems: 'center' },
    buyBtnText: { color: '#000', fontSize: 16, fontWeight: '900' },
    playerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)' },
    playerName: { color: '#fff', fontSize: 15, fontWeight: '700' },
    playerChange: { fontSize: 13, fontWeight: '600' }
});

export default TeamDetailScreen;
