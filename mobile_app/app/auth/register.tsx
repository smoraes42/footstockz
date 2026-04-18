import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';
import { registerUser } from '../../services/api';

const Register = () => {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError('');
    if (!username || !email || !password || !confirmPassword) {
      setError('Todos los campos son obligatorios');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setLoading(true);
    try {
      await registerUser(username, email, password);
      router.push({
        pathname: '/auth/verify',
        params: { email }
      });
    } catch (err: any) {
      setError(err.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };



  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/images/fs-logo.png')} 
            style={styles.logo}
            contentFit="contain"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Crear Cuenta</Text>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Tu username"
              placeholderTextColor={Colors.dark.tabIconDefault}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="tu@email.com"
              placeholderTextColor={Colors.dark.tabIconDefault}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={Colors.dark.tabIconDefault}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Repetir Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={Colors.dark.tabIconDefault}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity 
            style={[styles.registerBtn, loading && styles.disabledBtn]} 
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <View style={styles.btnContent}>
                <Text style={styles.registerBtnText}>Unirse a </Text>
                <Image 
                  source={require('../../assets/images/fs-logo.png')} 
                  style={styles.btnLogo}
                  contentFit="contain"
                  tintColor="#000"
                />
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
            <Link href="/auth/login" asChild>
              <TouchableOpacity>
                <Text style={styles.linkText}>Inicia sesión</Text>
              </TouchableOpacity>
            </Link>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  logo: {
    height: 30,
    width: 150,
  },
  card: {
    backgroundColor: Colors.dark.surface,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  title: {
    color: Colors.dark.text,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: 'rgba(255,77,77,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,77,77,0.3)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: Colors.dark.error,
    fontSize: 14,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: Colors.dark.tabIconDefault,
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    backgroundColor: Colors.dark.surfaceLighter,
    borderRadius: 10,
    padding: 12,
    color: Colors.dark.text,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  registerBtn: {
    backgroundColor: Colors.dark.accentNeon,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: Colors.dark.accentNeon,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
  },
  btnLogo: {
    height: 18,
    width: 80,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    color: Colors.dark.tabIconDefault,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    backgroundColor: Colors.dark.surfaceLighter,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleBtnText: {
    color: Colors.dark.text,
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 30,
  },
  footerText: {
    color: Colors.dark.tabIconDefault,
    fontSize: 14,
  },
  linkText: {
    color: Colors.dark.accentNeon,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default Register;
