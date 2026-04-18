import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';
import { useAuth } from '@/components/AuthContext';
import { loginUser } from '../../services/api';

const Login = () => {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    if (!email || !password) {
      setError('Introduce tu email y contraseña');
      return;
    }
    setLoading(true);
    try {
      const data = await loginUser(email, password);
      // data = { message, token, user: { id, username, email, ... } }
      await signIn(data.token, data.user);
      // _layout.tsx useEffect will handle the redirect
    } catch (err: any) {
      if (err.status === 403) {
        router.push({ pathname: '/auth/verify', params: { email } });
      } else {
        setError(err.message || 'Error al iniciar sesión');
      }
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
          <Text style={styles.title}>Iniciar Sesión</Text>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

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

          <TouchableOpacity 
            style={[styles.loginBtn, loading && styles.disabledBtn]} 
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.loginBtnText}>Entrar</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>¿No tienes cuenta? </Text>
            <Link href="/auth/register" asChild>
              <TouchableOpacity>
                <Text style={styles.linkText}>Regístrate aquí</Text>
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
    marginTop: 40,
    marginBottom: 40,
  },
  logo: {
    height: 40,
    width: 180,
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
  loginBtn: {
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
  loginBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
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

export default Login;
