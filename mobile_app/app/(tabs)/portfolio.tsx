import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { getPortfolio, getConfig } from '../../services/api';
import { useSocket } from '../../context/SocketContext';

const PortfolioScreen = () => {
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [kFactor, setKFactor] = useState(0.0001);
  const [groupByTeam, setGroupByTeam] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'player_name', direction: 'asc' });
  const { socket, connected } = useSocket();
  const insets = useSafeAreaInsets();

  const fetchData = useCallback(async () => {
    try {
      const [portData, config] = await Promise.all([
        getPortfolio(),
        getConfig()
      ]);
      setPortfolio(portData);
      if (config?.PRICE_IMPACT_FACTOR) {
        setKFactor(config.PRICE_IMPACT_FACTOR);
      }
    } catch (error) {
      console.error('Error fetching portfolio data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // WebSocket Listener for real-time portfolio value updates
  useEffect(() => {
    if (!socket || !connected) return;

    const handlePriceUpdate = (data: any) => {
      setPortfolio((prev: any) => {
        if (!prev || !prev.holdings) return prev;

        const hasHolding = prev.holdings.some((h: any) => h.player_id === data.playerId);
        if (!hasHolding) return prev;

        const updatedHoldings = prev.holdings.map((h: any) => {
          if (h.player_id === data.playerId) {
            const currentPrice = parseFloat(data.price);
            const shares = parseFloat(h.shares_owned);
            // Exponential Liquidation Value: V = (P0 / k) * (1 - e^(-kQ))
            const newValue = (currentPrice / kFactor) * (1 - Math.exp(-kFactor * shares));
            
            return { 
              ...h, 
              current_price: currentPrice,
              position_value: newValue,
              variation_24h: parseFloat(data.change || 0)
            };
          }
          return h;
        });

        return { ...prev, holdings: updatedHoldings };
      });
    };

    socket.on('price_update', handlePriceUpdate);
    return () => {
      socket.off('price_update', handlePriceUpdate);
    };
  }, [socket, connected, kFactor]);

  const requestSort = (key: string) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: string) => {
    if (sortConfig.key !== key) return null;
    return <Ionicons name={sortConfig.direction === 'asc' ? 'chevron-up' : 'chevron-down'} size={12} color={Colors.dark.accentNeon} />;
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={Colors.dark.accentNeon} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image 
          source={require('../../assets/images/fs-logo.png')} 
          style={styles.logo}
          contentFit="contain"
        />
        <Link href="/(tabs)/history" asChild>
          <TouchableOpacity style={styles.historyBtn}>
            <Ionicons name="time-outline" size={26} color={Colors.dark.text} />
          </TouchableOpacity>
        </Link>
      </View>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.accentNeon} />
        }
      >
        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{groupByTeam ? 'Equipos' : 'Tus Traspasos'}</Text>
          <TouchableOpacity 
            style={[styles.toggleBtn, groupByTeam && styles.activeToggleBtn]} 
            onPress={() => setGroupByTeam(!groupByTeam)}
          >
            <Text style={[styles.toggleBtnText, groupByTeam && styles.activeToggleText]}>
              {groupByTeam ? 'Ver Jugadores' : 'Agrupar'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sorting Chips */}
        {!loading && (portfolio?.holdings?.length || 0) > 1 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.sortContainer}
          >
            {[
              { key: 'player_name', label: 'Nombre' },
              { key: 'shares_owned', label: 'Acciones' },
              { key: 'current_price', label: 'Precio' },
              { key: 'position_value', label: 'Valor' }
            ].map(chip => (
              <TouchableOpacity
                key={chip.key}
                onPress={() => requestSort(chip.key)}
                style={[
                  styles.sortChip, 
                  sortConfig.key === chip.key && styles.activeSortChip
                ]}
              >
                <Text style={[
                  styles.sortChipText, 
                  sortConfig.key === chip.key && styles.activeSortChipText
                ]}>
                  {chip.label}
                </Text>
                {getSortIndicator(chip.key)}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {(() => {
          let rawHoldings = portfolio?.holdings || [];
          let displayData = [];
          
          if (groupByTeam) {
            const groups: any = {};
            rawHoldings.forEach((h: any) => {
              if (h.type === 'team') return; 
              const team = h.team_name || 'Sin Equipo';
              if (!groups[team]) {
                groups[team] = {
                  id: team,
                  player_name: team, 
                  shares_owned: 0,
                  position_value: 0,
                  variation_24h: 0,
                  count: 0,
                  type: 'player_group'
                };
              }
              groups[team].shares_owned += h.shares_owned;
              groups[team].position_value += h.position_value;
              groups[team].variation_24h += h.variation_24h;
              groups[team].count += 1;
            });
            
            const groupedPlayers = Object.values(groups).map((g: any) => ({
              ...g,
              current_price: g.position_value / Math.max(g.shares_owned, 1),
              variation_24h: g.variation_24h / Math.max(g.count, 1)
            }));
            
            const dedicatedTeams = rawHoldings.filter((h: any) => h.type === 'team');
            displayData = [...dedicatedTeams, ...groupedPlayers];
          } else {
            displayData = [...rawHoldings];
          }

          displayData.sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];
            
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
          });

          if (displayData.length === 0) {
            return (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No tienes jugadores en tu equipo aún.</Text>
                <Link href="/(tabs)/market" asChild>
                  <TouchableOpacity style={styles.marketLink}>
                    <Text style={styles.marketLinkText}>Ir al Mercado</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            );
          }

          return displayData.map((h: any, idx: number) => {
            const isTeam = h.type === 'team';
            const isGroup = h.type === 'player_group';
            
            const CardContent = (
              <TouchableOpacity style={styles.holdingCard}>
                <View style={styles.playerInfo}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarIcon}>{isTeam ? '🏟️' : isGroup ? '🤝' : '👤'}</Text>
                  </View>
                  <View>
                    <Text style={styles.playerName}>{h.player_name}</Text>
                    <Text style={styles.playerShares}>
                      {isGroup ? `${h.count} Jugadores` : `${h.shares_owned.toFixed(4)} acciones`}
                    </Text>
                  </View>
                </View>
                <View style={styles.holdingValue}>
                  <Text style={styles.valuePrice}>{h.position_value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</Text>
                  <Text style={[styles.variation, { color: h.variation_24h >= 0 ? Colors.dark.accentNeon : Colors.dark.error }]}>
                    {h.variation_24h >= 0 ? '+' : ''}{h.variation_24h.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                  </Text>
                </View>
              </TouchableOpacity>
            );

            if (isTeam) {
              return <Link key={idx} href={`/team/${h.team_id}` as any} asChild>{CardContent}</Link>;
            } else if (!isGroup) {
              return <Link key={idx} href={`/(tabs)/player/${h.player_id}` as any} asChild>{CardContent}</Link>;
            }
            return <View key={idx}>{CardContent}</View>;
          });
        })()}
      </ScrollView>

      {/* Bottom Summary Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.barItem}>
          <Text style={styles.barLabel}>SALDO</Text>
          <Text style={styles.barValue}>{portfolio?.walletBalance?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</Text>
        </View>
        <View style={[styles.barItem, styles.centerItem]}>
          <Text style={styles.barLabel}>CARTERA</Text>
          <Text style={styles.barValue}>{((portfolio?.walletBalance + (portfolio?.holdings?.reduce((acc: number, h: any) => acc + h.position_value, 0) || 0)) - portfolio?.walletBalance).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</Text>
        </View>
        <View style={[styles.barItem, styles.rightItem]}>
          <Text style={styles.barLabel}>TOTAL</Text>
          <Text style={styles.barValueTotal}>{(portfolio?.walletBalance + (portfolio?.holdings?.reduce((acc: number, h: any) => acc + h.position_value, 0) || 0)).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</Text>
        </View>
      </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  logo: {
    height: 30,
    width: 140,
  },
  historyBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
    marginTop: 20,
  },
  toggleBtn: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  activeToggleBtn: {
    backgroundColor: 'rgba(57,255,20,0.1)',
    borderColor: Colors.dark.accentNeon,
  },
  toggleBtnText: {
    color: Colors.dark.tabIconDefault,
    fontSize: 12,
    fontWeight: '700',
  },
  activeToggleText: {
    color: Colors.dark.accentNeon,
  },
  sectionTitle: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '900',
  },
  holdingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  sortContainer: {
    paddingHorizontal: 20,
    paddingBottom: 15,
    gap: 8,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  activeSortChip: {
    backgroundColor: 'rgba(57,255,20,0.1)',
    borderColor: Colors.dark.accentNeon,
  },
  sortChipText: {
    color: Colors.dark.tabIconDefault,
    fontSize: 12,
    fontWeight: '700',
  },
  activeSortChipText: {
    color: Colors.dark.accentNeon,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarIcon: {
    fontSize: 20,
  },
  playerName: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '700',
  },
  playerShares: {
    color: Colors.dark.tabIconDefault,
    fontSize: 12,
    marginTop: 2,
  },
  holdingValue: {
    alignItems: 'flex-end',
    gap: 4,
  },
  valuePrice: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '800',
  },
  variation: {
    fontSize: 12,
    fontWeight: '800',
  },
  emptyCard: {
    margin: 20,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 24,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  emptyText: {
    color: Colors.dark.tabIconDefault,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  marketLink: {
    backgroundColor: Colors.dark.accentNeon,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  marketLinkText: {
    color: '#000',
    fontWeight: '800',
  },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: '#1c1c1cd9',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingBottom: 75, // Enough space to be above tab bar
  },
  barItem: {
    flex: 1,
  },
  centerItem: {
    alignItems: 'center',
  },
  rightItem: {
    alignItems: 'flex-end',
  },
  barLabel: {
    color: Colors.dark.tabIconDefault,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  barValue: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  barValueTotal: {
    color: Colors.dark.accentNeon,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
});

export default PortfolioScreen;
