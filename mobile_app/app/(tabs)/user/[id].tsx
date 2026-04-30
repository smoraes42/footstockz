import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { getPublicProfile } from '../../../services/api';

const { width } = Dimensions.get('window');

const UserProfileScreen = () => {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            const data = await getPublicProfile(id as string);
            setProfile(data);
        } catch (e: any) {
            setError('Error al cargar el perfil.');
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={Colors.dark.accentNeon} />
                </View>
            </SafeAreaView>
        );
    }

    if (error || !profile) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <Text style={styles.errorText}>{error || 'Usuario no encontrado'}</Text>
                    <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                        <Text style={styles.backBtnText}>Volver</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const { user, holdings, totalHoldingsValue } = profile;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Perfil de {user.username}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.profileHero}>
                    <View style={styles.avatarLarge}>
                        <Text style={styles.avatarLargeText}>
                            {user.username.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                    <Text style={styles.profileUsername}>{user.username}</Text>
                    <Text style={styles.joinDate}>
                        Miembro desde {new Date(user.created_at).toLocaleDateString('es-ES', {
                            day: '2-digit', month: 'long', year: 'numeric'
                        })}
                    </Text>
                </View>

                <View style={styles.portfolioSection}>
                    <Text style={styles.sectionTitle}>Portafolio Público</Text>
                    
                    {holdings && holdings.length > 0 ? (
                        holdings.map((h: any, idx: number) => (
                            <TouchableOpacity 
                                key={idx} 
                                style={styles.holdingCard}
                                onPress={() => {
                                    if (h.player_id) router.push(`/(tabs)/player/${h.player_id}` as any);
                                    else if (h.team_id) router.push(`/(tabs)/team/${h.team_id}` as any);
                                }}
                            >
                                <View style={styles.holdingInfo}>
                                    <Text style={styles.assetName}>{h.player_name || h.team_name}</Text>
                                    <Text style={styles.assetType}>{h.player_id ? 'Jugador' : 'Equipo'}</Text>
                                </View>
                                <View style={styles.holdingStats}>
                                    <Text style={styles.holdingValue}>**** €</Text>
                                    <Text style={styles.sharesLabel}>**** Acciones</Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyStateText}>Este usuario no posee acciones actualmente.</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.dark.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        paddingHorizontal: 20, 
        paddingVertical: 14, 
        borderBottomWidth: 1, 
        borderBottomColor: 'rgba(255,255,255,0.05)' 
    },
    iconBtn: { backgroundColor: Colors.dark.accentNeon, padding: 8, borderRadius: 10 },
    headerTitle: { color: Colors.dark.text, fontSize: 16, fontWeight: '900' },
    scroll: { paddingBottom: 100 },
    profileHero: { alignItems: 'center', paddingVertical: 40, gap: 12 },
    avatarLarge: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.dark.accentNeon,
    },
    avatarLargeText: { color: '#fff', fontSize: 32, fontWeight: '800' },
    profileUsername: { color: '#fff', fontSize: 24, fontWeight: '900' },
    joinDate: { color: Colors.dark.tabIconDefault, fontSize: 14, fontWeight: '600' },
    portfolioSection: { paddingHorizontal: 20 },
    sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 20 },
    holdingCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: Colors.dark.surface,
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    holdingInfo: { gap: 4 },
    assetName: { color: '#fff', fontSize: 16, fontWeight: '700' },
    assetType: { color: Colors.dark.tabIconDefault, fontSize: 12, fontWeight: '600' },
    holdingStats: { alignItems: 'flex-end', gap: 4 },
    holdingValue: { color: Colors.dark.accentNeon, fontSize: 16, fontWeight: '800' },
    sharesLabel: { color: Colors.dark.tabIconDefault, fontSize: 12, fontWeight: '600' },
    emptyState: { paddingVertical: 40, alignItems: 'center' },
    emptyStateText: { color: Colors.dark.tabIconDefault, textAlign: 'center' },
    errorText: { color: Colors.dark.error, marginBottom: 20 },
    backBtn: { backgroundColor: Colors.dark.accentNeon, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
    backBtnText: { color: '#000', fontWeight: '800' },
});

export default UserProfileScreen;
