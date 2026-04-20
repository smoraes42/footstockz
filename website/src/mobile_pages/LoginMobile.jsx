import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import fsLogo from '../assets/fs-logo.png';
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
        <div className={styles.mobileContainer}>
            <nav className={styles.mobileNav}>
                <Link to="/">
                    <img src={fsLogo} alt="Futstocks Logo" className={styles.mobileLogo} />
                </Link>
            </nav>
            <main className={styles.mobileMain}>
                <div className={styles.mobileGlow}></div>
                <div className={`${styles.mobileGlassPanel} glass-panel fade-in-up`}>
                    <h1 className={styles.mobileTitle}>Iniciar Sesión</h1>

                    {error && (
                        <div className={styles.mobileErrorAlert}>
                            {error}
                        </div>
                    )}

                    <form className={styles.mobileForm} onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
                        <div>
                            <label className={styles.mobileLabel}>Email</label>
                            <input 
                                type="email" 
                                value={email} 
                                onChange={(e) => setEmail(e.target.value)} 
                                className={styles.mobileInput} 
                                placeholder="tu@email.com" 
                            />
                        </div>
                        <div>
                            <label className={styles.mobileLabel}>Contraseña</label>
                            <input 
                                type="password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                className={styles.mobileInput} 
                                placeholder="••••••••" 
                            />
                        </div>
                        <button 
                            type="submit" 
                            className={`${styles.mobileSubmitBtn} ${loading ? styles.mobileLoadingBtn : ''} neon-button`} 
                            disabled={loading}
                        >
                            {loading ? 'Entrando...' : 'Entrar'}
                        </button>

                        <div className={styles.mobileDivider}>
                            <div className={styles.mobileDividerLine}></div>
                            <span className={styles.mobileDividerText}>O</span>
                            <div className={styles.mobileDividerLine}></div>
                        </div>

                        <button 
                            type="button" 
                            className={`${styles.mobileGoogleBtn} outline-button`} 
                            onClick={handleGoogleClick} 
                        >
                            <img src="https://authjs.dev/img/providers/google.svg" alt="Google" className={styles.mobileGoogleIcon} />
                            Continuar con Google
                        </button>
                    </form>
                    <div className={styles.mobileFooter}>
                        <span className={styles.mobileFooterText}>¿No tienes cuenta? </span>
                        <Link to="/register" className={styles.mobileFooterLink}>Regístrate aquí</Link>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LoginMobile;
