import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import Colors from '@/constants/Colors';
import { getPlayers, getLeagues, getTeamMarket, teamMarketBuy } from '../../services/api';
import { useSocket } from '../../context/SocketContext';


const MarketScreen = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState('id'); // id, name, price, change
  const [sortDir, setSortDir] = useState('asc'); // asc, desc
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [leagues, setLeagues] = useState<any[]>([]);
  const [selectedLeague, setSelectedLeague] = useState<any>(null);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [updatedPlayerId, setUpdatedPlayerId] = useState<number | null>(null);
  const [marketType, setMarketType] = useState('players'); // players, teams
  const [teams, setTeams] = useState<any[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const { socket, connected } = useSocket();


  const fetchPlayersData = async (pageToFetch = 1, currentSortBy = sortBy, currentSortDir = sortDir, currentLeague = selectedLeague, currentTeam = selectedTeam) => {
    try {
      if (pageToFetch === 1) setLoading(true);
      else setFetchingMore(true);

      const response = await getPlayers({ 
        page: pageToFetch, 
        limit: 20,
        sort_by: currentSortBy,
        sort_dir: currentSortDir,
        league_id: currentLeague?.id || '',
        team_id: currentTeam?.id || ''
      });
      const data = response.data || [];
      
      if (response.pagination) {
        setTotalPages(response.pagination.totalPages);
      }

      const processedPlayers = data.map((p: any) => {
        return { ...p, price: parseFloat(p.price) || 0, change: parseFloat(p.change || 0) };
      });

      if (pageToFetch === 1) {
        setPlayers(processedPlayers);
      } else {
        setPlayers((prev: any[]) => [...prev, ...processedPlayers]);
      }
    } catch (error) {
      console.error('Failed to load players:', error);
    } finally {
      setLoading(false);
      setFetchingMore(false);
    }
  };

  useEffect(() => {
    fetchPlayersData();
    fetchTeamsData();
    loadLeagues();
  }, []);

  const fetchTeamsData = async (searchParam = '') => {
    try {
      setLoadingTeams(true);
      const data = await getTeamMarket(searchParam);
      setTeams(data);
    } catch (error) {
      console.error('Failed to load teams:', error);
    } finally {
      setLoadingTeams(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
        if (marketType === 'teams') {
            fetchTeamsData(searchTerm);
        }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, marketType]);

  // WebSocket Listeners for real-time price updates in the list
  useEffect(() => {
    if (!socket || !connected) return;

    const handlePriceUpdate = (data: any) => {
      // Visual feedback: briefly highlight the updated player
      setUpdatedPlayerId(data.playerId);
      setTimeout(() => setUpdatedPlayerId(null), 1000);

      setPlayers(prev => {
        const updated = prev.map(p => {
          if (p.id === data.playerId) {
            return { ...p, price: parseFloat(data.price), change: parseFloat(data.change || 0) };
          }
          return p;
        });

        // Live re-sorting to match desktop experience
        return [...updated].sort((a, b) => {
          let valA = a[sortBy];
          let valB = b[sortBy];

          if (sortBy === 'name') {
            valA = (valA || '').toString().toLowerCase();
            valB = (valB || '').toString().toLowerCase();
          } else {
            valA = parseFloat(valA || 0);
            valB = parseFloat(valB || 0);
          }

          if (sortDir === 'desc') return valB > valA ? 1 : -1;
          return valA > valB ? 1 : -1;
        });
      });
    };

    socket.on('price_update', handlePriceUpdate);

    return () => {
      socket.off('price_update', handlePriceUpdate);
    };
  }, [socket, connected, sortBy, sortDir]);


  const loadLeagues = async () => {
    try {
      const data = await getLeagues();
      setLeagues(data);
    } catch (e) {
      console.error('Error loading leagues', e);
    }
  };

  const handleSort = (newSortBy: string) => {
    let newSortDir = 'asc';
    if (sortBy === newSortBy) {
      newSortDir = sortDir === 'asc' ? 'desc' : 'asc';
    }
    setSortBy(newSortBy);
    setSortDir(newSortDir);
    setPage(1);
    fetchPlayersData(1, newSortBy, newSortDir);
  };

  const applyFilters = (league: any, team: any) => {
    setSelectedLeague(league);
    setSelectedTeam(team);
    setIsFilterVisible(false);
    setPage(1);
    fetchPlayersData(1, sortBy, sortDir, league, team);
  };

  const clearFilters = () => {
    setSelectedLeague(null);
    setSelectedTeam(null);
    setIsFilterVisible(false);
    setPage(1);
    fetchPlayersData(1, sortBy, sortDir, null, null);
  };

  const handleLoadMore = () => {
    if (page < totalPages && !fetchingMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPlayersData(nextPage);
    }
  };

  const filteredPlayers = players.filter((p: any) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.team.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderPlayer = ({ item }: { item: any }) => (
    <Link href={`/(tabs)/player/${item.id}`} asChild>
      <TouchableOpacity style={[
        styles.playerCard,
        updatedPlayerId === item.id && { backgroundColor: 'rgba(57,255,20,0.15)', borderColor: Colors.dark.accentNeon }
      ]}>
        <View style={styles.playerInfo}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarIcon}>👤</Text>
          </View>
          <View>
            <Text style={styles.playerName}>{item.name}</Text>
            <Text style={styles.playerTeam}>{item.team}</Text>
          </View>
        </View>

        <View style={styles.playerStats}>
          <Text style={styles.playerPrice}>{item.price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</Text>
          <View style={[styles.changeBadge, { backgroundColor: item.change >= 0 ? 'rgba(57,255,20,0.1)' : 'rgba(255,77,77,0.1)' }]}>
            <Text style={[styles.changeText, { color: item.change >= 0 ? Colors.dark.accentNeon : Colors.dark.error }]}>
              {item.change >= 0 ? '+' : ''}{item.change.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Link>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Mercado</Text>
          <View style={styles.marketTypeSelector}>
            <TouchableOpacity 
              style={[styles.typeBtn, marketType === 'players' && styles.activeTypeBtn]} 
              onPress={() => setMarketType('players')}
            >
              <Text style={[styles.typeText, marketType === 'players' && styles.activeTypeText]}>Jugadores</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.typeBtn, marketType === 'teams' && styles.activeTypeBtn]} 
              onPress={() => setMarketType('teams')}
            >
              <Text style={[styles.typeText, marketType === 'teams' && styles.activeTypeText]}>Equipos</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.searchContainer}>
          <TextInput
            placeholder="Buscar jugadores..."
            placeholderTextColor={Colors.dark.tabIconDefault}
            style={styles.searchInput}
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
        
        <View style={styles.filterBar}>
          <View style={styles.sortOptions}>
            <TouchableOpacity 
              style={[styles.filterBtn, sortBy === 'name' && styles.activeFilter]} 
              onPress={() => handleSort('name')}
            >
              <Text style={[styles.filterText, sortBy === 'name' && styles.activeFilterText]}>{sortBy === 'name' && (sortDir === 'asc' ? '↑' : '↓')}Nombre</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.filterBtn, sortBy === 'price' && styles.activeFilter]} 
              onPress={() => handleSort('price')}
            >
              <Text style={[styles.filterText, sortBy === 'price' && styles.activeFilterText]}>{sortBy === 'price' && (sortDir === 'asc' ? '↑' : '↓')}Precio</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.filterBtn, sortBy === 'change' && styles.activeFilter]} 
              onPress={() => handleSort('change')}
            >
              <Text style={[styles.filterText, sortBy === 'change' && styles.activeFilterText]}>{sortBy === 'change' && (sortDir === 'asc' ? '↑' : '↓')}Var.</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.advancedFilterBtn, (selectedLeague || selectedTeam) && styles.activeFilter]} 
            onPress={() => setIsFilterVisible(true)}
          >
            <Ionicons 
                name="options-outline" 
                size={16} 
                color={(selectedLeague || selectedTeam) ? Colors.dark.accentNeon : Colors.dark.tabIconDefault} 
            />
            <Text style={[styles.filterText, (selectedLeague || selectedTeam) && styles.activeFilterText]}>
                Filtros
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={isFilterVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsFilterVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filtrar Mercado</Text>
              <TouchableOpacity onPress={() => setIsFilterVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.dark.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterScroll}>
              <Text style={styles.filterLabel}>Liga</Text>
              <View style={styles.chipGrid}>
                {leagues.map(l => (
                   <TouchableOpacity 
                    key={l.id} 
                    style={[styles.chip, selectedLeague?.id === l.id && styles.activeChip]}
                    onPress={() => {
                        if (selectedLeague?.id === l.id) {
                            setSelectedLeague(null);
                            setSelectedTeam(null);
                        } else {
                            setSelectedLeague(l);
                            setSelectedTeam(null);
                        }
                    }}
                   >
                     <Text style={[styles.chipText, selectedLeague?.id === l.id && styles.activeChipText]}>{l.name}</Text>
                   </TouchableOpacity>
                ))}
              </View>

              {selectedLeague && (
                <>
                  <Text style={[styles.filterLabel, { marginTop: 20 }]}>Equipo</Text>
                  <View style={styles.chipGrid}>
                    {selectedLeague.teams.map((t: any) => (
                      <TouchableOpacity 
                        key={t.id} 
                        style={[styles.chip, selectedTeam?.id === t.id && styles.activeChip]}
                        onPress={() => setSelectedTeam(selectedTeam?.id === t.id ? null : t)}
                      >
                        <Text style={[styles.chipText, selectedTeam?.id === t.id && styles.activeChipText]}>{t.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
                <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
                    <Text style={styles.clearBtnText}>Limpiar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.applyBtn} onPress={() => applyFilters(selectedLeague, selectedTeam)}>
                    <Text style={styles.applyBtnText}>Aplicar Filtros</Text>
                </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {marketType === 'players' ? (
        loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.dark.accentNeon} />
            <Text style={styles.loadingText}>Cargando mercado...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredPlayers}
            renderItem={renderPlayer}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={() => (
              fetchingMore ? (
                <ActivityIndicator style={styles.footerLoader} color={Colors.dark.accentNeon} />
              ) : null
            )}
          />
        )
      ) : (
        loadingTeams ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.dark.accentNeon} />
            <Text style={styles.loadingText}>Cargando equipos...</Text>
          </View>
        ) : (
          <FlatList
            data={teams}
            renderItem={({ item }) => (
              <Link href={`/(tabs)/team/${item.id}` as any} asChild>
                <TouchableOpacity style={styles.playerCard}>
                  <View style={styles.playerInfo}>
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarIcon}>🏟️</Text>
                    </View>
                    <View>
                      <Text style={styles.playerName}>{item.name}</Text>
                      <Text style={styles.playerTeam}>{item.league} • {item.playerCount} Jugadores</Text>
                    </View>
                  </View>

                  <View style={styles.playerStats}>
                    <Text style={styles.playerPrice}>{item.price.toFixed(2)} €</Text>
                    <View style={[styles.changeBadge, { backgroundColor: item.change >= 0 ? 'rgba(57,255,20,0.1)' : 'rgba(255,77,77,0.1)' }]}>
                      <Text style={[styles.changeText, { color: item.change >= 0 ? Colors.dark.accentNeon : Colors.dark.error }]}>
                        {item.change >= 0 ? '+' : ''}{item.change}%
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </Link>
            )}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
          />
        )
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 24,
    fontWeight: '800',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  marketTypeSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 4,
  },
  typeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  activeTypeBtn: {
    backgroundColor: Colors.dark.surfaceLighter,
  },
  typeText: {
    color: Colors.dark.tabIconDefault,
    fontSize: 12,
    fontWeight: '700',
  },
  activeTypeText: {
    color: Colors.dark.accentNeon,
  },
  searchContainer: {
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchInput: {
    color: Colors.dark.text,
    paddingVertical: 10,
    fontSize: 14,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  sortOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  advancedFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.dark.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  activeFilter: {
    backgroundColor: 'rgba(57,255,20,0.1)',
    borderColor: Colors.dark.accentNeon,
  },
  filterText: {
    color: Colors.dark.tabIconDefault,
    fontSize: 12,
    fontWeight: '600',
  },
  activeFilterText: {
    color: Colors.dark.accentNeon,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 100, // Space for bottom tabs
  },
  playerCard: {
    backgroundColor: Colors.dark.surface,
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarPlaceholder: {
    width: 45,
    height: 45,
    borderRadius: 10,
    backgroundColor: Colors.dark.surfaceLighter,
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
  playerTeam: {
    color: Colors.dark.tabIconDefault,
    fontSize: 12,
    marginTop: 2,
  },
  playerStats: {
    alignItems: 'flex-end',
    gap: 4,
  },
  playerPrice: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '800',
  },
  changeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.dark.tabIconDefault,
    marginTop: 10,
  },
  footerLoader: {
    paddingVertical: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.dark.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '80%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '900',
  },
  filterScroll: {
    flex: 1,
  },
  filterLabel: {
    color: Colors.dark.tabIconDefault,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: Colors.dark.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  activeChip: {
    backgroundColor: 'rgba(57,255,20,0.1)',
    borderColor: Colors.dark.accentNeon,
  },
  chipText: {
    color: Colors.dark.tabIconDefault,
    fontSize: 13,
    fontWeight: '600',
  },
  activeChipText: {
    color: Colors.dark.accentNeon,
  },
  modalFooter: {
    flexDirection: 'row',
    paddingTop: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  clearBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  clearBtnText: {
    color: Colors.dark.text,
    fontWeight: '700',
  },
  applyBtn: {
    flex: 2,
    backgroundColor: Colors.dark.accentNeon,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#000',
    fontWeight: '800',
  },
  inputGroup: {
    gap: 6,
    marginBottom: 16,
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
});

export default MarketScreen;
