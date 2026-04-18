import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { getUserTradeHistory } from '../../services/api';

const HistoryScreen = () => {
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      const trades = await getUserTradeHistory();
      setTradeHistory(trades);
    } catch (error) {
      console.error('Error fetching trade history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Actividad Reciente</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.accentNeon} />
        }
      >
        <View style={styles.activityList}>
            {tradeHistory.map((t: any) => (
                <View key={t.id} style={styles.activityItem}>
                    <View style={styles.activityIconBox}>
                        <Text style={[styles.activityIcon, { color: t.side === 'buy' ? Colors.dark.accentNeon : Colors.dark.error }]}>
                            {t.side === 'buy' ? '↙' : '↗'}
                        </Text>
                    </View>
                    <View style={styles.activityDetails}>
                        <Text style={styles.activityName}>{t.player_name}</Text>
                        <Text style={styles.activityTime}>{new Date(t.created_at).toLocaleDateString()} • {t.side === 'buy' ? 'Compra' : 'Venta'}</Text>
                    </View>
                    <View style={styles.activityAmount}>
                        <Text style={styles.activityValue}>{parseFloat(t.total_value).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</Text>
                        <Text style={styles.activityQty}>{parseFloat(t.quantity).toFixed(4)} Acc.</Text>
                    </View>
                </View>
            ))}
            {tradeHistory.length === 0 && (
                <Text style={styles.emptySmallText}>No hay actividad reciente.</Text>
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
  headerTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '800',
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  activityIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityIcon: {
    fontSize: 18,
    fontWeight: '900',
  },
  activityDetails: {
    flex: 1,
  },
  activityName: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '700',
  },
  activityTime: {
    color: Colors.dark.tabIconDefault,
    fontSize: 11,
    marginTop: 2,
  },
  activityAmount: {
    alignItems: 'flex-end',
  },
  activityValue: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '800',
  },
  activityQty: {
    color: Colors.dark.tabIconDefault,
    fontSize: 11,
    marginTop: 2,
  },
  emptySmallText: {
    color: Colors.dark.tabIconDefault,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 10,
  },
});

export default HistoryScreen;
