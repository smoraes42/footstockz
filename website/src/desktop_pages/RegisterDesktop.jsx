import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import fsLogo from '../assets/fs-logo.png';
import fsLogoBlack from '../assets/fs-logo-black.png';
import { registerUser, googleLogin, initGoogleSignIn } from '../services/api';
import styles from '../styles/RegisterDesktop.module.css';
import Navbar from '../components/Navbar';

const RegisterDesktop = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
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

    // Per-field validators
    const validators = {
        username: (v) => {
            if (!v) return 'El username es obligatorio';
            if (v.length < 3) return 'Mínimo 3 caracteres';
            if (v.length > 30) return 'Máximo 30 caracteres';
            if (!/^[a-zA-Z0-9_]+$/.test(v)) return 'Solo letras, números y guión bajo';
            return '';
        },
        email: (v) => {
            if (!v) return 'El email es obligatorio';
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Email no válido';
            return '';
        },
        password: (v) => {
            if (!v) return 'La contraseña es obligatoria';
            if (v.length < 8) return 'Mínimo 8 caracteres';
            return '';
        },
        confirmPassword: (v) => {
            if (!v) return 'Repite la contraseña';
            if (v !== password) return 'Las contraseñas no coinciden';
            return '';
        }
    };

    const handleChange = (field, val) => {
        const setters = { username: setUsername, email: setEmail, password: setPassword, confirmPassword: setConfirmPassword };
        setters[field](val);
        setFieldErrors(prev => ({ ...prev, [field]: validators[field](val) }));
    };

    const handleRegister = async () => {
        setError('');
        const errors = {
            username: validators.username(username),
            email: validators.email(email),
            password: validators.password(password),
            confirmPassword: validators.confirmPassword(confirmPassword),
        };
        setFieldErrors(errors);
        if (Object.values(errors).some(Boolean)) return;

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

    const fieldHint = (field) =>
        fieldErrors[field] ? <p className={styles.fieldHint}>{fieldErrors[field]}</p> : null;

    return (
        <div className={styles.container}>
            <Navbar type="top" />
            <main className={styles.main}>
                <div className={styles.glowEffect}></div>
                <div className={`glass-panel fade-in-up ${styles.glassPanel}`}>
                    <h1 className={styles.title}>Crear Cuenta</h1>

                    {error && (
                        <div className={styles.errorAlert}>
                            {error}
                        </div>
                    )}

                    <form className={styles.form} onSubmit={(e) => { e.preventDefault(); handleRegister(); }}>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>Username</label>
                            <input type="text" value={username} onChange={(e) => handleChange('username', e.target.value)} onBlur={() => setFieldErrors(prev => ({ ...prev, username: validators.username(username) }))} className={`${styles.input} ${fieldErrors.username ? styles.inputError : ''}`} placeholder="Tu username" />
                            {fieldHint('username')}
                        </div>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>Email</label>
                            <input type="email" value={email} onChange={(e) => handleChange('email', e.target.value)} onBlur={() => setFieldErrors(prev => ({ ...prev, email: validators.email(email) }))} className={`${styles.input} ${fieldErrors.email ? styles.inputError : ''}`} placeholder="tu@email.com" />
                            {fieldHint('email')}
                        </div>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>Contraseña</label>
                            <input type="password" value={password} onChange={(e) => handleChange('password', e.target.value)} onBlur={() => setFieldErrors(prev => ({ ...prev, password: validators.password(password) }))} className={`${styles.input} ${fieldErrors.password ? styles.inputError : ''}`} placeholder="••••••••" />
                            {fieldHint('password')}
                        </div>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>Repetir Contraseña</label>
                            <input type="password" value={confirmPassword} onChange={(e) => handleChange('confirmPassword', e.target.value)} onBlur={() => setFieldErrors(prev => ({ ...prev, confirmPassword: validators.confirmPassword(confirmPassword) }))} className={`${styles.input} ${fieldErrors.confirmPassword ? styles.inputError : ''}`} placeholder="••••••••" />
                            {fieldHint('confirmPassword')}
                        </div>
                        <button
                            type="submit"
                            className={`neon-button ${styles.submitBtn} ${loading ? styles.loadingBtn : ''}`}
                            disabled={loading}
                        >
                            {loading ? 'Creando cuenta...' : <><span>Unirse a</span> <img src={fsLogoBlack} alt="Futstocks" className={styles.submitBtnLogo} /></>}
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
                        <span className={styles.footerText}>¿Ya tienes cuenta? </span>
                        <Link to="/login" className={styles.footerLink}>Inicia sesión</Link>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default RegisterDesktop;
