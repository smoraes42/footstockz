import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';

const { width } = Dimensions.get('window');

const Landing = () => {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.navbar}>
        <Image 
          source={require('../assets/images/fs-logo.png')} 
          style={styles.logo}
          contentFit="contain"
        />
        <Link href="/auth/login" asChild>
          <TouchableOpacity style={styles.smallNeonBtn}>
            <Text style={styles.smallNeonBtnText}>Entrar</Text>
          </TouchableOpacity>
        </Link>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroContainer}>
          {/* Glow Effect */}
          <View style={styles.glow} />

          <View style={styles.content}>
            <Image 
              source={require('../assets/images/fs-slogan.png')} 
              style={styles.slogan}
              contentFit="contain"
            />

            <Text style={styles.description}>
              Ficha a tus jugadores favoritos y especula con su valor. El precio sube o baja según la <Text style={styles.bold}>oferta y demanda</Text> del mercado.
            </Text>

            <Link href="/auth/register" asChild>
              <TouchableOpacity style={styles.mainBtn}>
                <Text style={styles.mainBtnText}>Empezar a Jugar</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <Image 
              source={require('../assets/images/fs-logo.png')} 
              style={styles.footerLogo}
              contentFit="contain"
            />
            <Text style={styles.copyright}>© 2026 Futstocks.</Text>
          </View>
          <View style={styles.linksRow}>
            <Text style={styles.footerLink}>Términos</Text>
            <Text style={styles.footerLink}>Privacidad</Text>
            <Text style={styles.footerLink}>Contacto</Text>
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
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  logo: {
    height: 24,
    width: 120,
  },
  smallNeonBtn: {
    backgroundColor: Colors.dark.accentNeon,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  smallNeonBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 14,
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    position: 'relative',
    minHeight: 500,
  },
  glow: {
    position: 'absolute',
    top: '20%',
    left: '50%',
    transform: [{ translateX: -width * 0.75 }],
    width: width * 1.5,
    height: width * 1.5,
    backgroundColor: 'radial-gradient(circle, rgba(57,255,20,0.1) 0%, rgba(16,16,16,0) 60%)', // Note: Radial gradient doesn't work like this in standard RN, but some libraries support it. I'll use a semi-transparent view.
    borderRadius: width,
    opacity: 0.2,
  },
  content: {
    alignItems: 'center',
    zIndex: 1,
  },
  slogan: {
    width: '100%',
    height: 140,
    marginBottom: 20,
  },
  description: {
    color: Colors.dark.tabIconDefault,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  bold: {
    color: Colors.dark.text,
    fontWeight: '700',
  },
  mainBtn: {
    backgroundColor: Colors.dark.accentNeon,
    width: '100%',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: Colors.dark.accentNeon,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  mainBtnText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '800',
  },
  footer: {
    padding: 40,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    gap: 20,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  footerLogo: {
    height: 20,
    width: 100,
    opacity: 0.5,
  },
  copyright: {
    color: Colors.dark.tabIconDefault,
    fontSize: 12,
  },
  linksRow: {
    flexDirection: 'row',
    gap: 20,
  },
  footerLink: {
    color: Colors.dark.tabIconDefault,
    fontSize: 12,
  },
});

export default Landing;
