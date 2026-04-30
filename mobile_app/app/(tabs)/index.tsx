import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Image } from 'expo-image';
import Colors from '@/constants/Colors';
import { getPlayers, getPortfolio, getPortfolioHistory, BASE_URL } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { AnimatedPriceText } from '../../components/AnimatedPriceText';
import PlayerChart from '../../components/PlayerChart';


const { width } = Dimensions.get('window');

const Home = () => {
  const [portfolio, setPortfolio] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [activeTimeframe, setActiveTimeframe] = useState('D');
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const { socket, connected } = useSocket();


  const fetchHistory = useCallback(async (timeframe = activeTimeframe, showLoading = true) => {
    try {
      if (showLoading) setChartLoading(true);
      const histData = await getPortfolioHistory(timeframe);
      let formattedHistory = histData.map((h: any) => ({
        timestamp: new Date(h.time).getTime(),
        value: parseFloat(h.value)
      }));

      if (timeframe === 'D') {
        const now = new Date();
        const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const normalized: any[] = [];
        
        for (let i = 0; i <= 24; i++) {
          const bucketTime = new Date(start.getTime() + i * 60 * 60 * 1000);
          const ts = bucketTime.getTime();
          
          const lastKnown = formattedHistory.reduce((prev: any, curr: any) => {
            if (curr.timestamp <= ts && (prev === null || curr.timestamp > prev.timestamp)) {
              return curr;
            }
            return prev;
          }, null);
          
          normalized.push({
            timestamp: ts,
            value: lastKnown ? lastKnown.value : (normalized.length > 0 ? normalized[normalized.length - 1].value : 0)
          });
        }
        formattedHistory = normalized;
      } else if (timeframe === 'W') {
        const now = new Date();
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const normalized: any[] = [];
        
        for (let i = 0; i <= 7; i++) {
          const bucketTime = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
          const ts = bucketTime.getTime();
          
          const lastKnown = formattedHistory.reduce((prev: any, curr: any) => {
            if (curr.timestamp <= ts && (prev === null || curr.timestamp > prev.timestamp)) {
              return curr;
            }
            return prev;
          }, null);
          
          normalized.push({
            timestamp: ts,
            value: lastKnown ? lastKnown.value : (normalized.length > 0 ? normalized[normalized.length - 1].value : 0)
          });
        }
        formattedHistory = normalized;
      } else if (timeframe === 'M') {
        const now = new Date();
        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const normalized: any[] = [];
        
        for (let i = 0; i <= 30; i++) {
          const bucketTime = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
          const ts = bucketTime.getTime();
          
          const lastKnown = formattedHistory.reduce((prev: any, curr: any) => {
            if (curr.timestamp <= ts && (prev === null || curr.timestamp > prev.timestamp)) {
              return curr;
            }
            return prev;
          }, null);
          
          normalized.push({
            timestamp: ts,
            value: lastKnown ? lastKnown.value : (normalized.length > 0 ? normalized[normalized.length - 1].value : 0)
          });
        }
        formattedHistory = normalized;
      } else if (timeframe === 'Y') {
        const now = new Date();
        const normalized: any[] = [];
        
        for (let i = 0; i <= 12; i++) {
          const bucketTime = new Date(now.getFullYear(), now.getMonth() - (12 - i), now.getDate(), now.getHours(), now.getMinutes());
          const ts = bucketTime.getTime();
          
          const lastKnown = formattedHistory.reduce((prev: any, curr: any) => {
            if (curr.timestamp <= ts && (prev === null || curr.timestamp > prev.timestamp)) {
              return curr;
            }
            return prev;
          }, null);
          
          normalized.push({
            timestamp: ts,
            value: lastKnown ? lastKnown.value : (normalized.length > 0 ? normalized[normalized.length - 1].value : 0)
          });
        }
        formattedHistory = normalized;
      } else if (timeframe === 'Max') {
        if (portfolio && portfolio.walletCreatedAt) {
          const now = new Date();
          const walletStartTs = new Date(portfolio.walletCreatedAt).getTime();
          const normalized: any[] = [{ timestamp: walletStartTs, value: 0 }];
          
          let current = new Date(walletStartTs);
          current.setMonth(current.getMonth() + 1);
          current.setDate(1);
          current.setHours(0, 0, 0, 0);

          while (current <= now) {
            const ts = current.getTime();
            const lastKnown = formattedHistory.reduce((prev: any, curr: any) => {
              if (curr.timestamp <= ts && (prev === null || curr.timestamp > prev.timestamp)) {
                return curr;
              }
              return prev;
            }, null);
            
            normalized.push({
              timestamp: ts,
              value: lastKnown ? lastKnown.value : normalized[normalized.length - 1].value
            });
            
            current.setMonth(current.getMonth() + 1);
          }
          
          const finalPoint = formattedHistory.length > 0 ? formattedHistory[formattedHistory.length - 1] : { timestamp: now.getTime(), value: 0 };
          if (normalized[normalized.length - 1].timestamp < finalPoint.timestamp) {
            normalized.push(finalPoint);
          }
          
          formattedHistory = normalized;
        }
      }

      setHistory(formattedHistory);
    } catch (error) {
      console.error('Error fetching history data:', error);
    } finally {
      setChartLoading(false);
    }
  }, [portfolio]);

  const fetchData = useCallback(async () => {
    try {
      const [portData, playersData] = await Promise.all([
        getPortfolio(),
        getPlayers({ sort_by: 'price', sort_dir: 'desc', limit: 30 })
      ]);

      setPortfolio(portData);
      
      const playersArray = playersData.data || playersData;
      setPlayers(playersArray.slice(0, 10));
    } catch (error) {
      console.error('Error fetching home data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchHistory(activeTimeframe);
  }, [activeTimeframe, portfolio?.walletCreatedAt, fetchHistory]);

  // WebSocket Price Updates
  useEffect(() => {
    if (!socket || !connected) return;

    const handlePriceUpdate = (data: any) => {
      setPlayers((prev: any) => {
        const updated = prev.map((p: any) => 
          p.id === data.playerId ? { ...p, price: data.price, change: data.change } : p
        );
        // Re-sort players by price descending
        return [...updated].sort((a, b) => b.price - a.price);
      });

      // Recalculate portfolio value in real-time
      setPortfolio((prevPortfolio: any) => {
        if (!prevPortfolio || !prevPortfolio.holdings) return prevPortfolio;
        
        const updatedHoldings = prevPortfolio.holdings.map((h: any) => {
          if (h.player_id === data.playerId) {
            // Simplified linear update for index.tsx socket (since we don't have kFactor here readily)
            // It will be re-fetched on trade_executed anyway
            const shares = Number(h.shares_owned) || 0;
            const price = Number(data.price) || 0;
            const approxNewValue = shares > 0 ? (price * shares) : 0; // fallback approx
            return { ...h, current_price: price, position_value: approxNewValue };
          }
          return h;
        });

        return { ...prevPortfolio, holdings: updatedHoldings };
      });
    };

    let debounceTimer: NodeJS.Timeout;

    const handleTradeExecuted = (data: any) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchData();
        fetchHistory(activeTimeframe, false);
      }, 2000);
    };

    socket.on('price_update', handlePriceUpdate);
    socket.on('trade_executed', handleTradeExecuted);

    return () => {
      socket.off('price_update', handlePriceUpdate);
      socket.off('trade_executed', handleTradeExecuted);
    };
  }, [socket, connected]);


  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
    fetchHistory(activeTimeframe);
  };

  const handleTimeframeChange = (tf: string) => {
    setActiveTimeframe(tf);
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={Colors.dark.accentNeon} size="large" />
      </View>
    );
  }

  const walletBal = Number(portfolio?.walletBalance) || 0;
  const holdingsVal = portfolio?.holdings?.reduce((acc: number, h: any) => acc + Number(h.position_value || 0), 0) || 0;
  const totalValue = walletBal + holdingsVal;
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image 
          source={require('../../assets/images/fs-logo.png')} 
          style={styles.logo}
          contentFit="contain"
        />
        <Link href="/(tabs)/profile" asChild>
          <TouchableOpacity style={styles.profileBtn}>
            <Ionicons name="person-circle-outline" size={28} color={Colors.dark.text} />
          </TouchableOpacity>
        </Link>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.accentNeon} />
        }
      >
        {/* Wealth Summary Card (From Portfolio) */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>VALOR TOTAL</Text>
          <AnimatedPriceText value={totalValue} style={styles.totalValueDisplay} />
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>CARTERA</Text>
              <AnimatedPriceText value={holdingsVal} style={styles.balanceValue} />
            </View>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>SALDO</Text>
              <AnimatedPriceText value={walletBal} style={styles.balanceValue} />
            </View>
          </View>
        </View>

        {/* Wealth Chart Section */}
        <View style={styles.chartSection}>
          <View style={styles.chartHeader}>
            <View style={styles.timeframes}>
              {['D', 'W', 'M', 'Y', 'Max'].map(tf => (
                <TouchableOpacity 
                  key={tf} 
                  style={[styles.tfBtn, activeTimeframe === tf && styles.activeTf]} 
                  onPress={() => handleTimeframeChange(tf)}
                >
                  <Text style={[styles.tfText, activeTimeframe === tf && styles.activeTfText]}>{tf}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={{ minHeight: 230, position: 'relative' }}>
            {history.length > 0 ? (
              <View style={{ opacity: chartLoading ? 0.3 : 1 }}>
                <PlayerChart 
                  data={history} 
                  timeframe={activeTimeframe} 
                  width={width} 
                />
              </View>
            ) : !chartLoading ? (
              <View style={styles.noHistory}>
                <Text style={styles.noHistoryText}>Sin datos históricos suficientes</Text>
              </View>
            ) : null}

            {chartLoading && (
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator color={Colors.dark.accentNeon} size="large" />
              </View>
            )}
          </View>
        </View>

        {/* Players List Section */}
        <View style={styles.playersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Top Jugadores</Text>
            <Link href="/(tabs)/market" asChild>
              <TouchableOpacity>
                <Text style={styles.seeAll}>Ver todos</Text>
              </TouchableOpacity>
            </Link>
          </View>

          <View style={styles.playerList}>
            {players.map((player: any, idx) => (
              <Link key={player.id} href={`/(tabs)/player/${player.id}`} asChild>
                <TouchableOpacity style={styles.playerCard}>
                  <View style={{ position: 'absolute', left: 0, top: 0, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: 'rgba(57, 255, 20, 0.1)', borderBottomRightRadius: 8 }}>
                    <Text style={{ color: Colors.dark.accentNeon, fontSize: 8, fontWeight: '900' }}>#{idx + 1}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ position: 'absolute', fontSize: 20 }}>👤</Text>
                      <Image 
                        source={{ uri: `${BASE_URL}/api/v1/players/${player.id}/image` }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                      />
                    </View>
                    <View>
                      <Text style={styles.playerName}>{player.name}</Text>
                      <Text style={styles.playerTeam}>{player.team}</Text>
                    </View>
                  </View>
                  <View style={styles.playerStats}>
                    <Text style={styles.playerPrice}>{parseFloat(player.price).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</Text>
                    <Text style={[styles.playerChange, { color: player.change >= 0 ? Colors.dark.accentNeon : '#ff4d4d' }]}>
                      {player.change >= 0 ? '▲' : '▼'} {Math.abs(player.change).toFixed(2)}%
                    </Text>
                  </View>
                </TouchableOpacity>
              </Link>
            ))}
          </View>
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    height: 24,
    width: 120,
  },
  chartDetails: {
    paddingHorizontal: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  chartPriceText: {
    color: Colors.dark.accentNeon,
    fontSize: 20,
    fontWeight: '900',
  },
  chartDateText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
  },
  profileBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  summaryCard: {
    margin: 20,
    padding: 24,
    backgroundColor: Colors.dark.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  summaryLabel: {
    color: Colors.dark.tabIconDefault,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  totalValueDisplay: {
    color: Colors.dark.text,
    fontSize: 36,
    fontWeight: '900',
    marginVertical: 10,
  },
  balanceRow: {
    flexDirection: 'row',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    gap: 30,
  },
  balanceItem: {
    flex: 1,
  },
  balanceLabel: {
    color: Colors.dark.tabIconDefault,
    fontSize: 10,
    fontWeight: '700',
  },
  balanceValue: {
    color: Colors.dark.accentNeon,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  chartSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '800',
  },
  timeframes: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.surface,
    padding: 4,
    borderRadius: 10,
    gap: 4,
  },
  tfBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeTf: {
    backgroundColor: Colors.dark.accentNeon,
  },
  tfText: {
    color: Colors.dark.tabIconDefault,
    fontSize: 12,
    fontWeight: '700',
  },
  activeTfText: {
    color: '#000',
  },
  noHistory: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 20,
  },
  noHistoryText: {
    color: Colors.dark.tabIconDefault,
    fontSize: 14,
  },
  playersSection: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '700',
  },
  seeAll: {
    color: Colors.dark.accentNeon,
    fontSize: 14,
    fontWeight: '600',
  },
  playerList: {
    gap: 12,
  },
  playerCard: {
    backgroundColor: Colors.dark.surface,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  playerName: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '700',
  },
  playerTeam: {
    color: Colors.dark.tabIconDefault,
    fontSize: 12,
    marginTop: 2,
  },
  playerStats: {
    alignItems: 'flex-end',
  },
  playerPrice: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '800',
  },
  playerChange: {
    color: Colors.dark.accentNeon,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});

export default Home;
