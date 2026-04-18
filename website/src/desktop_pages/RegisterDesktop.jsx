import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import fsLogo from '../assets/fs-logo.png';
import fsLogoBlack from '../assets/fs-logo-black.png';
import { registerUser, googleLogin, initGoogleSignIn } from '../services/api';

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

    const inputStyle = (field) => ({
        width: '100%',
        padding: '12px 16px',
        borderRadius: '8px',
        border: `1px solid ${fieldErrors[field] ? 'rgba(255,77,77,0.6)' : 'rgba(255,255,255,0.1)'}`,
        backgroundColor: 'var(--surface-lighter)',
        color: 'var(--text-main)',
        outline: 'none',
        transition: 'border-color 0.2s'
    });

    const fieldHint = (field) =>
        fieldErrors[field] ? <p style={{ color: '#ff4d4d', fontSize: '0.78rem', marginTop: '4px' }}>{fieldErrors[field]}</p> : null;

    return (
        <div style={{ backgroundColor: 'var(--bg-main)', minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column' }}>
            <nav style={{ padding: '1.5rem 4rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <Link to="/">
                    <img src={fsLogo} alt="Futstocks Logo" style={{ height: '40px' }} />
                </Link>
            </nav>
            <main style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(57,255,20,0.05) 0%, rgba(16,16,16,0) 70%)', zIndex: 0, pointerEvents: 'none' }}></div>
                <div className="glass-panel fade-in-up" style={{ width: '100%', maxWidth: '400px', padding: '3rem', borderRadius: '16px', zIndex: 1, position: 'relative' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '2rem', textAlign: 'center' }}>Crear Cuenta</h1>

                    {error && (
                        <div style={{ backgroundColor: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.3)', borderRadius: '8px', padding: '12px', marginBottom: '1.5rem', color: '#ff4d4d', fontSize: '0.9rem', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}

                    <form style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} onSubmit={(e) => { e.preventDefault(); handleRegister(); }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Username</label>
                            <input type="text" value={username} onChange={(e) => handleChange('username', e.target.value)} onBlur={() => setFieldErrors(prev => ({ ...prev, username: validators.username(username) }))} style={inputStyle('username')} placeholder="Tu username" />
                            {fieldHint('username')}
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Email</label>
                            <input type="email" value={email} onChange={(e) => handleChange('email', e.target.value)} onBlur={() => setFieldErrors(prev => ({ ...prev, email: validators.email(email) }))} style={inputStyle('email')} placeholder="tu@email.com" />
                            {fieldHint('email')}
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Contraseña</label>
                            <input type="password" value={password} onChange={(e) => handleChange('password', e.target.value)} onBlur={() => setFieldErrors(prev => ({ ...prev, password: validators.password(password) }))} style={inputStyle('password')} placeholder="••••••••" />
                            {fieldHint('password')}
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Repetir Contraseña</label>
                            <input type="password" value={confirmPassword} onChange={(e) => handleChange('confirmPassword', e.target.value)} onBlur={() => setFieldErrors(prev => ({ ...prev, confirmPassword: validators.confirmPassword(confirmPassword) }))} style={inputStyle('confirmPassword')} placeholder="••••••••" />
                            {fieldHint('confirmPassword')}
                        </div>
                        <button type="submit" className="neon-button" style={{ padding: '14px', borderRadius: '8px', fontSize: '1.05rem', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: loading ? 0.6 : 1, cursor: loading ? 'wait' : 'pointer' }} disabled={loading}>
                            {loading ? 'Creando cuenta...' : <><span>Unirse a</span> <img src={fsLogoBlack} alt="Futstocks" style={{ height: '20px' }} /></>}
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', margin: '1rem 0' }}>
                            <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
                            <span style={{ padding: '0 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>O</span>
                            <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
                        </div>

                        <button type="button" className="outline-button" onClick={handleGoogleClick} style={{ padding: '14px', borderRadius: '8px', fontSize: '1.05rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', backgroundColor: 'var(--surface-dark)' }}>
                            <img src="https://authjs.dev/img/providers/google.svg" alt="Google" style={{ height: '20px' }} />
                            Continuar con Google
                        </button>
                    </form>
                    <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>¿Ya tienes cuenta? </span>
                        <Link to="/login" style={{ color: 'var(--accent-neon)', textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem' }}>Inicia sesión</Link>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default RegisterDesktop;
