import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LineChart } from 'react-native-wagmi-charts';
import { Image } from 'expo-image';
import Colors from '@/constants/Colors';
import { getPlayerHistory, getPortfolio, getPlayerById, marketBuy, marketSell, getConfig } from '../../../services/api';
import { useSocket } from '../../../context/SocketContext';


const { width } = Dimensions.get('window');

const formatEU = (val: any, decimals = 2) => {
  if (val === null || val === undefined || val === '') return '';
  const num = typeof val === 'string' ? parseFloat(val.replace(/\./g, '').replace(',', '.')) : val;
  if (isNaN(num)) return val;
  return num.toLocaleString('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
};

const parseEU = (str: string) => {
  if (!str) return 0;
  const sanitized = str.replace(/\./g, '').replace(',', '.');
  const parsed = parseFloat(sanitized);
  return isNaN(parsed) ? 0 : parsed;
};

const PlayerDetails = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [player, setPlayer] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  
  const [buyQty, setBuyQty] = useState('');
  const [buyTotal, setBuyTotal] = useState('');
  const [sellQty, setSellQty] = useState('');
  const [sellTotal, setSellTotal] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [kFactor, setKFactor] = useState(0.0001); // Default, will be updated from config

  const { socket, connected, subscribeToPlayer, unsubscribeFromPlayer } = useSocket();
  const [lastPrice, setLastPrice] = useState<number | null>(null);


  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      setError('');
      console.log('Fetching details for player:', id);
      const [history, port, playerData, config] = await Promise.all([
        getPlayerHistory(id),
        getPortfolio(),
        getPlayerById(id),
        getConfig()
      ]);

      if (config && config.PRICE_IMPACT_FACTOR) {
        setKFactor(config.PRICE_IMPACT_FACTOR);
      }

      if (history) {
        const formattedHistory = (history || []).map((h: any) => ({
          timestamp: new Date(h.time).getTime(),
          value: parseFloat(h.price)
        }));
        setPriceHistory(formattedHistory);
      }

      setPortfolio(port);
      setPlayer(playerData);

    } catch (err: any) {
      console.error('Fetch error:', err);
      setError('Error al cargar datos. Verifica tu conexión.');
    } finally {
      setFetching(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // WebSocket Listeners
  useEffect(() => {
    if (!socket || !connected || !id) return;

    subscribeToPlayer(id as string);

    const handlePriceUpdate = (data: any) => {
      if (data.playerId === parseInt(id as string)) {
        // Update price history (add new point)
        setPriceHistory(prev => {
          const newPoint = {
            timestamp: new Date(data.timestamp).getTime(),
            value: parseFloat(data.price)
          };
          const updated = [...prev, newPoint];
          return updated.slice(-100); // Keep last 100 points
        });

        // Update player state to reflect new price and change
        setPlayer((prev: any) => prev ? { ...prev, price: data.price, change: parseFloat(data.change || 0) } : null);
        setLastPrice(data.price);
      }
    };

    const handleTradeExecuted = (trade: any) => {
      // Re-fetch portfolio to update balance and positions
      getPortfolio().then(setPortfolio).catch(console.error);
    };

    socket.on('price_update', handlePriceUpdate);
    socket.on('trade_executed', handleTradeExecuted);

    return () => {
      unsubscribeFromPlayer(id as string);
      socket.off('price_update', handlePriceUpdate);
      socket.off('trade_executed', handleTradeExecuted);
    };
  }, [socket, connected, id, subscribeToPlayer, unsubscribeFromPlayer]);


  const handleMarketBuy = async () => {
    const totalValueNum = parseEU(buyTotal);
    if (!buyTotal || !id || isNaN(totalValueNum)) {
      setError('Introduce una cantidad válida');
      return;
    }
    setLoading(true);
    setError('');
    console.log('Attempting Market Buy:', { id, buyQty, buyTotal });
    try {
      const resp = await marketBuy(parseInt(id as string), undefined, totalValueNum, player?.price);
      console.log('Buy Success:', resp);
      setBuyQty('');
      setBuyTotal('');
      // fetchData() removed - reliance on WebSockets
    } catch (err: any) {
      console.error('Buy Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarketSell = async () => {
    const qtyNum = parseEU(sellQty);
    if (!sellQty || !id || isNaN(qtyNum)) {
      setError('Introduce una cantidad válida');
      return;
    }
    setLoading(true);
    setError('');
    console.log('Attempting Market Sell:', { id, sellQty, sellTotal });
    try {
      const resp = await marketSell(parseInt(id as string), qtyNum, undefined, player?.price);
      console.log('Sell Success:', resp);
      setSellQty('');
      setSellTotal('');
      // fetchData() removed - reliance on WebSockets
    } catch (err: any) {
      console.error('Sell Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickBuy = (percent: number) => {
    if (!portfolio || !player) return;
    const amount = portfolio.walletBalance * percent;
    setBuyTotal(formatEU(amount, 2));
    
    const p0 = player.price;
    // Exponential: Q = ln(V*k/p0 + 1) / k
    const qty = Math.log((amount * kFactor / p0) + 1) / kFactor;
    setBuyQty(formatEU(qty, 4));
  };

  const handleQuickSell = (percent: number) => {
    if (!portfolio || !player) return;
    const holding = portfolio.holdings?.find((h: any) => h.player_id === player.id);
    if (!holding) return;
    const qty = Math.floor(holding.shares_owned * percent * 10000) / 10000;
    setSellQty(formatEU(qty, 4));
    
    // Exponential: Value = (P0 / k) * (1 - e^(-kQ))
    const val = (player.price / kFactor) * (1 - Math.exp(-kFactor * qty));
    setSellTotal(formatEU(val, 2));
  };

  if (fetching) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={Colors.dark.accentNeon} size="large" />
      </View>
    );
  }

  const holding = portfolio?.holdings?.find((h: any) => h.player_id === player?.id);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image 
            source={require('../../../assets/images/fs-logo.png')} 
            style={styles.logo}
            contentFit="contain"
          />
        </View>
        <View style={styles.walletInfo}>
          <Text style={styles.walletLabel}>WALLET</Text>
          <Text style={styles.walletValue}>{portfolio?.walletBalance?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'} €</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Player Hero */}
        <View style={styles.hero}>
          <View>
            <Text style={styles.playerName}>{player?.name}</Text>
            <Text style={styles.playerTeam}>{player?.team}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.playerPrice}>{player?.price?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</Text>
            <View style={[styles.changeBadge, { backgroundColor: (player?.change || 0) >= 0 ? 'rgba(57,255,20,0.1)' : 'rgba(255,77,77,0.1)' }]}>
              <Text style={[styles.changeText, { color: (player?.change || 0) >= 0 ? Colors.dark.accentNeon : Colors.dark.error }]}>
                {(player?.change || 0) >= 0 ? '+' : ''}{(player?.change || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
              </Text>
            </View>
          </View>
        </View>

        {/* Chart */}
        <View style={styles.chartSection}>
          {priceHistory.length > 0 ? (
            <LineChart.Provider data={priceHistory}>
              <LineChart width={width} height={200}>
                <LineChart.Path color={Colors.dark.accentNeon} width={3} />
                <LineChart.CursorCrosshair color={Colors.dark.accentNeon} />
              </LineChart>
            </LineChart.Provider>
          ) : (
            <View style={styles.chartPlaceholder}>
              <Text style={styles.placeholderText}>Sin historial de precios</Text>
            </View>
          )}
        </View>



        {/* Interaction Panel */}
        <View style={styles.panel}>
          <View style={styles.tabs}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'buy' && styles.activeTabBuy]} 
              onPress={() => setActiveTab('buy')}
            >
              <Text style={[styles.tabText, activeTab === 'buy' && styles.activeTabTextBuy]}>COMPRAR</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'sell' && styles.activeTabSell]} 
              onPress={() => setActiveTab('sell')}
            >
              <Text style={[styles.tabText, activeTab === 'sell' && styles.activeTabTextSell]}>VENDER</Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'buy' ? (
            <View style={styles.form}>
              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>CANTIDAD</Text>
                  <TextInput 
                    style={styles.input}
                    placeholder="0,0000"
                    placeholderTextColor="#666"
                    keyboardType="default"
                    inputMode="decimal"
                    value={buyQty}
                    onChangeText={(val) => {
                      if (val && !/^[0-9.,]*$/.test(val)) return;
                      setBuyQty(val);
                      if (val && player) {
                        const q = parseEU(val);
                        // Exponential: V = (P0 / k) * (e^(kQ) - 1)
                        const cost = (player.price / kFactor) * (Math.exp(kFactor * q) - 1);
                        setBuyTotal(formatEU(cost, 2));
                      } else setBuyTotal('');
                    }}
                  />
                  <Text style={styles.holdingInlineText}>
                    En propiedad: <Text style={styles.boldWhite}>{holding?.shares_owned?.toLocaleString('es-ES', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) || '0,0000'}</Text>
                  </Text>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>TOTAL (€)</Text>
                  <TextInput 
                    style={styles.input}
                    placeholder="0,00"
                    placeholderTextColor="#666"
                    keyboardType="default"
                    inputMode="decimal"
                    value={buyTotal}
                    onChangeText={(val) => {
                      if (val && !/^[0-9.,]*$/.test(val)) return;
                      setBuyTotal(val);
                      if (val && player) {
                        const v = parseEU(val);
                        const p0 = player.price;
                        // Exponential: Q = ln(V*k/p0 + 1) / k
                        const q = Math.log((v * kFactor / p0) + 1) / kFactor;
                        setBuyQty(formatEU(q, 4));
                      } else setBuyQty('');
                    }}
                  />
                </View>
              </View>

              <View style={styles.quickSelect}>
                {[0.25, 0.5, 1].map(p => (
                  <TouchableOpacity key={p} style={styles.quickBtn} onPress={() => handleQuickBuy(p)}>
                    <Text style={styles.quickBtnText}>{p * 100}%</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity 
                style={[styles.actionBtn, styles.buyBtn, loading && styles.disabledBtn]} 
                onPress={handleMarketBuy}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.actionBtnText}>EJECUTAR COMPRA</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>CANTIDAD</Text>
                  <TextInput 
                    style={styles.input}
                    placeholder="0,0000"
                    placeholderTextColor="#666"
                    keyboardType="default"
                    inputMode="decimal"
                    value={sellQty}
                    onChangeText={(val) => {
                      if (val && !/^[0-9.,]*$/.test(val)) return;
                      setSellQty(val);
                      if (val && player) {
                        const q = parseEU(val);
                        // Exponential: V = (P0 / k) * (1 - e^(-kQ))
                        const valReceived = (player.price / kFactor) * (1 - Math.exp(-kFactor * q));
                        setSellTotal(formatEU(valReceived, 2));
                      } else setSellTotal('');
                    }}
                  />
                  <Text style={styles.holdingInlineText}>
                    En propiedad: <Text style={styles.boldWhite}>{holding?.shares_owned?.toLocaleString('es-ES', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) || '0,0000'}</Text>
                  </Text>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>TOTAL (€)</Text>
                  <TextInput 
                    style={styles.input}
                    placeholder="0,00"
                    placeholderTextColor="#666"
                    keyboardType="default"
                    inputMode="decimal"
                    value={sellTotal}
                    onChangeText={(val) => {
                      if (val && !/^[0-9.,]*$/.test(val)) return;
                      setSellTotal(val);
                      if (val && player) {
                        const v = parseEU(val);
                        const p0 = player.price;
                        // Exponential: Q = -ln(1 - V*k/p0) / k
                        const inner = 1 - (v * kFactor / p0);
                        const q = inner > 0 ? -Math.log(inner) / kFactor : 0;
                        setSellQty(formatEU(q, 4));
                      } else setSellQty('');
                    }}
                  />
                </View>
              </View>

              <View style={styles.quickSelect}>
                {[0.25, 0.5, 1].map(p => (
                  <TouchableOpacity key={p} style={styles.quickBtn} onPress={() => handleQuickSell(p)}>
                    <Text style={styles.quickBtnText}>{p * 100}%</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity 
                style={[styles.actionBtn, styles.sellBtn, loading && styles.disabledBtn]} 
                onPress={handleMarketSell}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.actionBtnText}>EJECUTAR VENTA</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    height: 25,
    width: 100,
  },
  walletInfo: {
    alignItems: 'flex-end',
  },
  walletLabel: {
    color: Colors.dark.tabIconDefault,
    fontSize: 10,
    fontWeight: '800',
  },
  walletValue: {
    color: Colors.dark.accentNeon,
    fontSize: 14,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120, // Extra space for tab bar
  },
  hero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
  },
  playerName: {
    color: Colors.dark.text,
    fontSize: 24,
    fontWeight: '900',
  },
  playerTeam: {
    color: Colors.dark.tabIconDefault,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  priceRow: {
    alignItems: 'flex-end',
  },
  playerPrice: {
    color: Colors.dark.accentNeon,
    fontSize: 24,
    fontWeight: '900',
  },
  changeBadge: {
    backgroundColor: 'rgba(57,255,20,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  changeText: {
    color: Colors.dark.accentNeon,
    fontSize: 12,
    fontWeight: '700',
  },
  chartSection: {
    height: 240,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 24,
    marginBottom: 30,
    justifyContent: 'center',
    overflow: 'hidden',
    // Removed marginLeft to center better
  },
  chartPlaceholder: {
    alignItems: 'center',
  },
  placeholderText: {
    color: Colors.dark.tabIconDefault,
  },
  holdingInlineText: {
    color: '#666',
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
  boldWhite: {
    color: '#fff',
    fontWeight: '700',
  },
  bold: {
    color: Colors.dark.text,
    fontWeight: '700',
  },
  panel: {
    backgroundColor: Colors.dark.surface,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#000',
    padding: 4,
    borderRadius: 12,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTabBuy: {
    backgroundColor: 'rgba(57,255,20,0.15)',
  },
  activeTabSell: {
    backgroundColor: 'rgba(255,77,77,0.15)',
  },
  tabText: {
    color: '#666',
    fontWeight: '800',
    fontSize: 13,
  },
  activeTabTextBuy: {
    color: Colors.dark.accentNeon,
  },
  activeTabTextSell: {
    color: Colors.dark.error,
  },
  form: {
    gap: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputGroup: {
    flex: 1,
    gap: 6,
  },
  label: {
    color: Colors.dark.tabIconDefault,
    fontSize: 10,
    fontWeight: '800',
  },
  input: {
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  quickSelect: {
    flexDirection: 'row',
    gap: 8,
  },
  quickBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#222',
    alignItems: 'center',
  },
  quickBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  errorText: {
    color: Colors.dark.error,
    fontSize: 12,
    fontWeight: '600',
  },
  actionBtn: {
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buyBtn: {
    backgroundColor: Colors.dark.accentNeon,
  },
  sellBtn: {
    backgroundColor: Colors.dark.error,
  },
  actionBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '900',
  },
  disabledBtn: {
    opacity: 0.6,
  },
});

export default PlayerDetails;
