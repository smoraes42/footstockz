import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import fsLogo from '../assets/fs-logo.png';
import MobileHeader from '../components/MobileHeader';
import { loginUser, googleLogin, initGoogleSignIn } from '../services/api';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/Login.module.css';

const LoginMobile = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
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

    const handleLogin = async () => {
        setError('');
        if (!email || !password) {
            setError('Introduce tu email y contraseña');
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
        <div className={styles['mobile-container']}>
            <MobileHeader backLink="/" />
            <main className={styles['mobile-main']}>
                <div className={styles['mobile-glow']}></div>
                <div className={`${styles['mobile-glass-panel']} glass-panel fade-in-up`}>
                    <h1 className={styles['mobile-title']}>Iniciar Sesión</h1>

                    {error && (
                        <div className={styles['mobile-error-alert']}>
                            {error}
                        </div>
                    )}

                    <form className={styles['mobile-form']} onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
                        <div>
                            <label className={styles['mobile-label']}>Email</label>
                            <input 
                                type="email" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                className={styles['mobile-input']} 
                                placeholder="tu@email.com" 
                            />
                        </div>
                        <div>
                            <label className={styles['mobile-label']}>Contraseña</label>
                            <input 
                                type="password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                className={styles['mobile-input']} 
                                placeholder="••••••••" 
                            />
                        </div>
                        <button 
                            type="submit" 
                            className={`${styles['mobile-submit-btn']} ${loading ? styles['mobile-loading-btn'] : ''} neon-button`} 
                            disabled={loading}
                        >
                            {loading ? 'Entrando...' : 'Entrar'}
                        </button>

                        <div className={styles['mobile-divider']}>
                            <div className={styles['mobile-divider-line']}></div>
                            <span className={styles['mobile-divider-text']}>O</span>
                            <div className={styles['mobile-divider-line']}></div>
                        </div>

                        <button 
                            type="button" 
                            className={`${styles['mobile-google-btn']} outline-button`} 
                            onClick={handleGoogleClick} 
                        >
                            <img src="https://authjs.dev/img/providers/google.svg" alt="Google" className={styles['mobile-google-icon']} />
                            Continuar con Google
                        </button>
                    </form>
                    <div className={styles['mobile-footer']}>
                        <span className={styles['mobile-footer-text']}>¿No tienes cuenta? </span>
                        <Link to="/register" className={styles['mobile-footer-link']}>Regístrate aquí</Link>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LoginMobile;
