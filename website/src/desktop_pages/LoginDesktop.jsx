import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import fsLogo from '../assets/fs-logo.png';
import { loginUser, googleLogin, initGoogleSignIn } from '../services/api';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/Login.module.css';
import Navbar from '../components/Navbar';

const LoginDesktop = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        initGoogleSignIn(handleGoogleResponse);
    }, []);

    const handleGoogleResponse = async (response) => {
        setError('');
        setLoading(true);
        try {
            const data = await googleLogin(response.credential);
            login(data.user);
            navigate('/home');
        } catch (err) {
            setError(err.message || 'Error con Google');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleClick = () => {
        if (window.google) {
            window.google.accounts.id.prompt();
        }
    };

    // Real-time per-field validation
    const validateEmail = (val) => {
        if (!val) return 'El email es obligatorio';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return 'Email no válido';
        return '';
    };

    const validatePassword = (val) => {
        if (!val) return 'La contraseña es obligatoria';
        if (val.length < 6) return 'Mínimo 6 caracteres';
        return '';
    };

    const handleEmailChange = (e) => {
        const val = e.target.value;
        setEmail(val);
        setFieldErrors(prev => ({ ...prev, email: validateEmail(val) }));
    };

    const handlePasswordChange = (e) => {
        const val = e.target.value;
        setPassword(val);
        setFieldErrors(prev => ({ ...prev, password: validatePassword(val) }));
    };

    const handleLogin = async () => {
        setError('');
        const emailErr = validateEmail(email);
        const passwordErr = validatePassword(password);
        if (emailErr || passwordErr) {
            setFieldErrors({ email: emailErr, password: passwordErr });
            return;
        }
        setLoading(true);
        try {
            const data = await loginUser(email, password);
            login(data.user);
            navigate('/home');
        } catch (err) {
            if (err.status === 403) {
                navigate(`/verify?email=${encodeURIComponent(email)}`);
            } else {
                setError(err.message || 'Error al iniciar sesión');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <Navbar type="top" />
            <main className={styles.main}>
                <div className={styles.glowEffect}></div>
                <div className={`glass-panel fade-in-up ${styles.glassPanel}`}>
                    <h1 className={styles.title}>Iniciar Sesión</h1>

                    {error && (
                        <div className={styles.errorAlert}>
                            {error}
                        </div>
                    )}

                    <form className={styles.form} onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={handleEmailChange}
                                onBlur={() => setFieldErrors(prev => ({ ...prev, email: validateEmail(email) }))}
                                className={`${styles.input} ${fieldErrors.email ? styles.inputError : ''}`}
                                placeholder="tu@email.com"
                            />
                            {fieldErrors.email && <p className={styles.fieldHint}>{fieldErrors.email}</p>}
                        </div>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>Contraseña</label>
                            <input
                                type="password"
                                value={password}
                                onChange={handlePasswordChange}
                                onBlur={() => setFieldErrors(prev => ({ ...prev, password: validatePassword(password) }))}
                                className={`${styles.input} ${fieldErrors.password ? styles.inputError : ''}`}
                                placeholder="••••••••"
                            />
                            {fieldErrors.password && <p className={styles.fieldHint}>{fieldErrors.password}</p>}
                        </div>
                        <button
                            type="submit"
                            className={`neon-button ${styles.submitBtn} ${loading ? styles.loadingBtn : ''}`}
                            disabled={loading}
                        >
                            {loading ? 'Entrando...' : 'Entrar'}
                        </button>

                        <div className={styles.divider}>
                            <div className={styles.dividerLine}></div>
                            <span className={styles.dividerText}>O</span>
                            <div className={styles.dividerLine}></div>
                        </div>

                        <button type="button" className={`outline-button ${styles.googleBtn}`} onClick={handleGoogleClick}>
                            <img src="https://authjs.dev/img/providers/google.svg" alt="Google" className={styles.googleIcon} />
                            Continuar con Google
                        </button>
                    </form>
                    <div className={styles.footer}>
                        <span className={styles.footerText}>¿No tienes cuenta? </span>
                        <Link to="/register" className={styles.footerLink}>Regístrate aquí</Link>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LoginDesktop;
