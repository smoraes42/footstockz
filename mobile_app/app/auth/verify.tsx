import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '@/constants/Colors';
import { useAuth } from '@/components/AuthContext';
import { verifyEmail } from '../../services/api';

const Verify = () => {
  const router = useRouter();
  const { signIn } = useAuth();
  const params = useLocalSearchParams();
  const email = params.email as string || '';

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    if (inputRefs.current[0]) inputRefs.current[0].focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('Introduce el código completo de 6 dígitos');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const userData = await verifyEmail(email, fullCode);
      await signIn(userData);
      setSuccess(true);
      // router.replace will be handled by the _layout's useEffect
    } catch (err: any) {
      setError(err.message || 'Código inválido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (code.every(d => d !== '')) {
      handleVerify();
    }
  }, [code]);

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
          {success ? (
            <View style={styles.successContent}>
              <Text style={styles.title}>¡Email Verificado!</Text>
              <Text style={styles.successSubtitle}>Redirigiendo al inicio...</Text>
              <ActivityIndicator color={Colors.dark.accentNeon} style={{ marginTop: 20 }} />
            </View>
          ) : (
            <>
              <Text style={styles.title}>Verifica tu Email</Text>
              <Text style={styles.subtitle}>
                Código enviado a{"\n"}
                <Text style={styles.emailText}>{email}</Text>
              </Text>

              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <View style={styles.codeContainer}>
                {code.map((digit, idx) => (
                  <TextInput
                    key={idx}
                    ref={el => { inputRefs.current[idx] = el; }}
                    style={[
                      styles.digitInput,
                      digit ? styles.digitInputFilled : null
                    ]}
                    keyboardType="numeric"
                    maxLength={1}
                    value={digit}
                    onChangeText={(val) => handleChange(idx, val)}
                    onKeyPress={({ nativeEvent }) => handleKeyPress(idx, nativeEvent.key)}
                  />
                ))}
              </View>

              <TouchableOpacity 
                style={[styles.verifyBtn, loading && styles.disabledBtn]} 
                onPress={handleVerify}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.verifyBtnText}>Verificar</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.footer} onPress={() => router.replace('/auth/login')}>
                <Text style={styles.footerText}>
                  ¿No recibiste el código? <Text style={styles.linkText}>Volver al login</Text>
                </Text>
              </TouchableOpacity>
            </>
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
    height: 30,
    width: 150,
  },
  card: {
    backgroundColor: Colors.dark.surface,
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  successContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successSubtitle: {
    color: Colors.dark.tabIconDefault,
    fontSize: 14,
    marginTop: 8,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.dark.tabIconDefault,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emailText: {
    color: Colors.dark.text,
    fontWeight: '700',
  },
  errorContainer: {
    backgroundColor: 'rgba(255,77,77,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,77,77,0.3)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    width: '100%',
  },
  errorText: {
    color: Colors.dark.error,
    fontSize: 14,
    textAlign: 'center',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 30,
  },
  digitInput: {
    width: 45,
    height: 55,
    backgroundColor: Colors.dark.surfaceLighter,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    color: Colors.dark.text,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  digitInputFilled: {
    borderColor: Colors.dark.accentNeon,
  },
  verifyBtn: {
    backgroundColor: Colors.dark.accentNeon,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    width: '100%',
    shadowColor: Colors.dark.accentNeon,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  verifyBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
  },
  footer: {
    marginTop: 24,
  },
  footerText: {
    color: Colors.dark.tabIconDefault,
    fontSize: 14,
  },
  linkText: {
    color: Colors.dark.accentNeon,
    fontWeight: '700',
  },
});

export default Verify;
