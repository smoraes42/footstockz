import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import fsLogo from '../assets/fs-logo.png';
import { loginUser, googleLogin, initGoogleSignIn } from '../services/api';
import { useAuth } from '../context/AuthContext';

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

    const inputStyle = (fieldKey) => ({
        width: '100%',
        padding: '12px 16px',
        borderRadius: '8px',
        border: `1px solid ${fieldErrors[fieldKey] ? 'rgba(255,77,77,0.6)' : 'rgba(255,255,255,0.1)'}`,
        backgroundColor: 'var(--surface-lighter)',
        color: 'var(--text-main)',
        outline: 'none',
        transition: 'border-color 0.2s'
    });

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
                    <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '2rem', textAlign: 'center' }}>Iniciar Sesión</h1>

                    {error && (
                        <div style={{ backgroundColor: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.3)', borderRadius: '8px', padding: '12px', marginBottom: '1.5rem', color: '#ff4d4d', fontSize: '0.9rem', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}

                    <form style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={handleEmailChange}
                                onBlur={() => setFieldErrors(prev => ({ ...prev, email: validateEmail(email) }))}
                                style={inputStyle('email')}
                                placeholder="tu@email.com"
                            />
                            {fieldErrors.email && <p style={{ color: '#ff4d4d', fontSize: '0.78rem', marginTop: '4px' }}>{fieldErrors.email}</p>}
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Contraseña</label>
                            <input
                                type="password"
                                value={password}
                                onChange={handlePasswordChange}
                                onBlur={() => setFieldErrors(prev => ({ ...prev, password: validatePassword(password) }))}
                                style={inputStyle('password')}
                                placeholder="••••••••"
                            />
                            {fieldErrors.password && <p style={{ color: '#ff4d4d', fontSize: '0.78rem', marginTop: '4px' }}>{fieldErrors.password}</p>}
                        </div>
                        <button type="submit" className="neon-button" style={{ padding: '14px', borderRadius: '8px', fontSize: '1.05rem', marginTop: '1rem', opacity: loading ? 0.6 : 1, cursor: loading ? 'wait' : 'pointer' }} disabled={loading}>
                            {loading ? 'Entrando...' : 'Entrar'}
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
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>¿No tienes cuenta? </span>
                        <Link to="/register" style={{ color: 'var(--accent-neon)', textDecoration: 'none', fontWeight: '600', fontSize: '0.9rem' }}>Regístrate aquí</Link>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LoginDesktop;
