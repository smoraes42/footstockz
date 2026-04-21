import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import fsLogo from '../assets/fs-logo.png';
import fsLogoBlack from '../assets/fs-logo-black.png';
import MobileHeader from '../components/MobileHeader';
import { registerUser, googleLogin, initGoogleSignIn } from '../services/api';
import styles from '../styles/Register.module.css';

const RegisterMobile = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        initGoogleSignIn(handleGoogleResponse);
    }, []);

    const handleGoogleResponse = async (response) => {
        setError('');
        setLoading(true);
        try {
            await googleLogin(response.credential);
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
            navigate(`/verify?email=${encodeURIComponent(email)}`);
        } catch (err) {
            setError(err.message || 'Error al registrarse');
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
                    <h1 className={styles['mobile-title']}>Crear Cuenta</h1>

                    {error && (
                        <div className={styles['mobile-error-alert']}>
                            {error}
                        </div>
                    )}

                    <form className={styles['mobile-form']} onSubmit={(e) => { e.preventDefault(); handleRegister(); }}>
                        <div>
                            <label className={styles['mobile-label']}>Username</label>
                            <input 
                                type="text" 
                                value={username} 
                                onChange={(e) => setUsername(e.target.value)} 
                                className={styles['mobile-input']} 
                                placeholder="Tu username" 
                            />
                        </div>
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
                        <div>
                            <label className={styles['mobile-label']}>Repetir Contraseña</label>
                            <input 
                                type="password" 
                                value={confirmPassword} 
                                onChange={(e) => setConfirmPassword(e.target.value)} 
                                className={styles['mobile-input']} 
                                placeholder="••••••••" 
                            />
                        </div>
                        <button 
                            type="submit" 
                            className={`${styles['mobile-submit-btn']} ${loading ? styles['mobile-loading-btn'] : ''} neon-button`} 
                            disabled={loading}
                        >
                            {loading ? 'Creando cuenta...' : <>Unirse a <img src={fsLogoBlack} alt="Futstocks" className={styles['mobile-submit-btn-logo']} /></>}
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
                        <span className={styles['mobile-footer-text']}>¿Ya tienes cuenta? </span>
                        <Link to="/login" className={styles['mobile-footer-link']}>Inicia sesión</Link>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default RegisterMobile;
