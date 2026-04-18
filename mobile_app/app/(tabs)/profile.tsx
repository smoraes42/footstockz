import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import Colors from '@/constants/Colors';
import { useAuth } from '@/components/AuthContext';

const ProfileScreen = () => {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      "Cerrar Sesión",
      "¿Estás seguro de que quieres salir?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Salir", 
          style: "destructive", 
          onPress: async () => {
            await signOut();
            router.replace('/auth/login');
          }
        }
      ]
    );
  };

  const SettingItem = ({ icon, label, onPress, destructive = false }: { icon: any, label: string, onPress?: () => void, destructive?: boolean }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <View style={[styles.iconBox, destructive && styles.destructiveIconBox]}>
          <Ionicons name={icon} size={20} color={destructive ? Colors.dark.error : Colors.dark.accentNeon} />
        </View>
        <Text style={[styles.settingLabel, destructive && styles.destructiveText]}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.1)" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perfil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.userSection}>
          <View style={styles.avatarLarge}>
            {user?.avatar_url ? (
              <Image
                source={{ uri: user.avatar_url }}
                style={{ width: '100%', height: '100%', borderRadius: 30 }}
                contentFit="cover"
              />
            ) : (
              <Text style={styles.avatarInitial}>{user?.username?.charAt(0).toUpperCase() || 'U'}</Text>
            )}
          </View>
          <Text style={styles.usernameText}>{user?.username || 'Usuario'}</Text>
          <Text style={styles.emailText}>{user?.email || 'email@ejemplo.com'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CUENTA</Text>
          <SettingItem icon="person-outline" label="Editar Perfil" />
          <SettingItem icon="shield-checkmark-outline" label="Seguridad" />
          <SettingItem icon="notifications-outline" label="Notificaciones" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>AJUSTES</Text>
          <SettingItem icon="globe-outline" label="Idioma" />
          <SettingItem icon="moon-outline" label="Modo Oscuro" />
          <SettingItem icon="help-circle-outline" label="Ayuda y Soporte" />
        </View>

        <View style={styles.section}>
          <SettingItem 
            icon="log-out-outline" 
            label="Cerrar Sesión" 
            destructive 
            onPress={handleLogout}
          />
        </View>

        <View style={styles.footer}>
          <Image 
            source={require('../../assets/images/fs-logo.png')} 
            style={styles.footerLogo}
            contentFit="contain"
          />
          <Text style={styles.versionText}>Versión {Constants.expoConfig?.version ?? '1.0.0'} (Beta)</Text>
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
    paddingBottom: 40,
  },
  userSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
  },
  avatarInitial: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '900',
  },
  usernameText: {
    color: Colors.dark.text,
    fontSize: 24,
    fontWeight: '900',
  },
  emailText: {
    color: Colors.dark.tabIconDefault,
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionLabel: {
    color: Colors.dark.tabIconDefault,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 15,
    marginLeft: 10,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    padding: 16,
    borderRadius: 18,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(57,255,20,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  destructiveIconBox: {
    backgroundColor: 'rgba(255,77,77,0.05)',
  },
  settingLabel: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '700',
  },
  destructiveText: {
    color: Colors.dark.error,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    gap: 10,
  },
  footerLogo: {
    height: 20,
    width: 100,
    opacity: 0.3,
  },
  versionText: {
    color: Colors.dark.tabIconDefault,
    fontSize: 12,
  },
});

export default ProfileScreen;
