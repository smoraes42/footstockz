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
                <div className={styles['glow-effect']}></div>
                <div className={`glass-panel fade-in-up ${styles['glass-panel']}`}>
                    <h1 className={styles.title}>Iniciar Sesión</h1>

                    {error && (
                        <div className={styles['error-alert']}>
                            {error}
                        </div>
                    )}

                    <form className={styles.form} onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
                        <div className={styles['field-group']}>
                            <label className={styles.label}>Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={handleEmailChange}
                                onBlur={() => setFieldErrors(prev => ({ ...prev, email: validateEmail(email) }))}
                                className={`${styles.input} ${fieldErrors.email ? styles['input-error'] : ''}`}
                                placeholder="tu@email.com"
                            />
                            {fieldErrors.email && <p className={styles['field-hint']}>{fieldErrors.email}</p>}
                        </div>
                        <div className={styles['field-group']}>
                            <label className={styles.label}>Contraseña</label>
                            <input
                                type="password"
                                value={password}
                                onChange={handlePasswordChange}
                                onBlur={() => setFieldErrors(prev => ({ ...prev, password: validatePassword(password) }))}
                                className={`${styles.input} ${fieldErrors.password ? styles['input-error'] : ''}`}
                                placeholder="••••••••"
                            />
                            {fieldErrors.password && <p className={styles['field-hint']}>{fieldErrors.password}</p>}
                        </div>
                        <button
                            type="submit"
                            className={`neon-button ${styles['submit-btn']} ${loading ? styles['loading-btn'] : ''}`}
                            disabled={loading}
                        >
                            {loading ? 'Entrando...' : 'Entrar'}
                        </button>

                        <div className={styles.divider}>
                            <div className={styles['divider-line']}></div>
                            <span className={styles['divider-text']}>O</span>
                            <div className={styles['divider-line']}></div>
                        </div>

                        <button type="button" className={`outline-button ${styles['google-btn']}`} onClick={handleGoogleClick}>
                            <img src="https://authjs.dev/img/providers/google.svg" alt="Google" className={styles['google-icon']} />
                            Continuar con Google
                        </button>
                    </form>
                    <div className={styles.footer}>
                        <span className={styles['footer-text']}>¿No tienes cuenta? </span>
                        <Link to="/register" className={styles['footer-link']}>Regístrate aquí</Link>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LoginDesktop;
