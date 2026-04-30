import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Colors from '@/constants/Colors';
import { getLeaderboard } from '../../services/api';

const LeaderboardScreen = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchLeaderboardData = useCallback(async () => {
    try {
      if (!refreshing) setLoading(true);
      const data = await getLeaderboard();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useEffect(() => {
    fetchLeaderboardData();
  }, [fetchLeaderboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaderboardData();
  };

  const renderUser = ({ item, index }: { item: any, index: number }) => (
    <TouchableOpacity 
      style={styles.userCard}
      onPress={() => router.push(`/(tabs)/user/${item.id}` as any)}
    >
      <View style={styles.rankSection}>
        <Text style={[styles.rankText, index < 3 && styles.topRankText]}>
          {index + 1}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <View style={styles.avatar}>
           <Text style={styles.avatarText}>{item.username.charAt(0).toUpperCase()}</Text>
        </View>
        <View>
          <Text style={styles.username}>{item.username}</Text>
          <Text style={styles.portfolioLabel}>Capital Total</Text>
        </View>
      </View>
      <View style={styles.statsSection}>
        <Text style={styles.equityText}>***** €</Text>
        <Text style={[styles.changeText, { color: item.change24h >= 0 ? Colors.dark.accentNeon : Colors.dark.error }]}>
          {item.change24h >= 0 ? '+' : ''}{item.change24h.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image 
          source={require('../../assets/images/fs-logo.png')} 
          style={styles.logo}
          contentFit="contain"
        />
        <Text style={styles.title}>TOP TRADERS</Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.dark.accentNeon} size="large" />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderUser}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.accentNeon} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay datos disponibles</Text>
            </View>
          }
        />
      )}
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
    alignItems: 'center',
  },
  logo: {
    height: 25,
    width: 120,
    marginBottom: 5,
  },
  title: {
    color: Colors.dark.tabIconDefault,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  rankSection: {
    width: 30,
    alignItems: 'center',
  },
  rankText: {
    color: Colors.dark.tabIconDefault,
    fontSize: 16,
    fontWeight: '900',
  },
  topRankText: {
    color: Colors.dark.accentNeon,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  username: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '700',
  },
  portfolioLabel: {
    color: Colors.dark.tabIconDefault,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  statsSection: {
    alignItems: 'flex-end',
  },
  equityText: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '800',
  },
  changeText: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    color: Colors.dark.tabIconDefault,
  },
});

export default LeaderboardScreen;
