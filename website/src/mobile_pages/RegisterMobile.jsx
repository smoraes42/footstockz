import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import fsLogo from '../assets/fs-logo.png';
import fsLogoBlack from '../assets/fs-logo-black.png';
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
        <div className={styles.mobileContainer}>
            <nav className={styles.mobileNav}>
                <Link to="/">
                    <img src={fsLogo} alt="Futstocks Logo" className={styles.mobileLogo} />
                </Link>
            </nav>
            <main className={styles.mobileMain}>
                <div className={styles.mobileGlow}></div>
                <div className={`${styles.mobileGlassPanel} glass-panel fade-in-up`}>
                    <h1 className={styles.mobileTitle}>Crear Cuenta</h1>

                    {error && (
                        <div className={styles.mobileErrorAlert}>
                            {error}
                        </div>
                    )}

                    <form className={styles.mobileForm} onSubmit={(e) => { e.preventDefault(); handleRegister(); }}>
                        <div>
                            <label className={styles.mobileLabel}>Username</label>
                            <input 
                                type="text" 
                                value={username} 
                                onChange={(e) => setUsername(e.target.value)} 
                                className={styles.mobileInput} 
                                placeholder="Tu username" 
                            />
                        </div>
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
                        <div>
                            <label className={styles.mobileLabel}>Repetir Contraseña</label>
                            <input 
                                type="password" 
                                value={confirmPassword} 
                                onChange={(e) => setConfirmPassword(e.target.value)} 
                                className={styles.mobileInput} 
                                placeholder="••••••••" 
                            />
                        </div>
                        <button 
                            type="submit" 
                            className={`${styles.mobileSubmitBtn} ${loading ? styles.mobileLoadingBtn : ''} neon-button`} 
                            disabled={loading}
                        >
                            {loading ? 'Creando cuenta...' : <>Unirse a <img src={fsLogoBlack} alt="Futstocks" className={styles.mobileSubmitBtnLogo} /></>}
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
                        <span className={styles.mobileFooterText}>¿Ya tienes cuenta? </span>
                        <Link to="/login" className={styles.mobileFooterLink}>Inicia sesión</Link>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default RegisterMobile;
