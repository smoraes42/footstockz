import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import fsLogo from '../assets/fs-logo.png';
import { loginUser, googleLogin, initGoogleSignIn } from '../services/api';
import { useAuth } from '../context/AuthContext';

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
        <div style={{ backgroundColor: 'var(--bg-main)', minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column' }}>
            <nav style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(16,16,16,0.9)', position: 'sticky', top: 0, zIndex: 10 }}>
                <Link to="/">
                    <img src={fsLogo} alt="Futstocks Logo" style={{ height: '30px' }} />
                </Link>
            </nav>
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '150vw', height: '150vw', background: 'radial-gradient(circle, rgba(57,255,20,0.1) 0%, rgba(16,16,16,0) 60%)', zIndex: 0, pointerEvents: 'none' }}></div>
                <div className="glass-panel fade-in-up" style={{ width: '100%', padding: '2rem 1.5rem', borderRadius: '12px', zIndex: 1, position: 'relative' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '1.5rem', textAlign: 'center' }}>Iniciar Sesión</h1>

                    {error && (
                        <div style={{ backgroundColor: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.3)', borderRadius: '8px', padding: '10px', marginBottom: '1.25rem', color: '#ff4d4d', fontSize: '0.85rem', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}

                    <form style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'var(--surface-lighter)', color: 'var(--text-main)', outline: 'none' }} placeholder="tu@email.com" />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Contraseña</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'var(--surface-lighter)', color: 'var(--text-main)', outline: 'none' }} placeholder="••••••••" />
                        </div>
                        <button type="submit" className="neon-button" style={{ padding: '14px', borderRadius: '8px', fontSize: '1rem', marginTop: '1rem', width: '100%', opacity: loading ? 0.6 : 1, cursor: loading ? 'wait' : 'pointer' }} disabled={loading}>
                            {loading ? 'Entrando...' : 'Entrar'}
                        </button>

                        <div style={{ display: 'flex', alignItems: 'center', margin: '0.5rem 0' }}>
                            <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
                            <span style={{ padding: '0 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>O</span>
                            <div style={{ flex: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.1)' }}></div>
                        </div>

                        <button type="button" className="outline-button" onClick={handleGoogleClick} style={{ padding: '14px', borderRadius: '8px', fontSize: '1rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', backgroundColor: 'var(--surface-dark)' }}>
                            <img src="https://authjs.dev/img/providers/google.svg" alt="Google" style={{ height: '20px' }} />
                            Continuar con Google
                        </button>
                    </form>
                    <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>¿No tienes cuenta? </span>
                        <Link to="/register" style={{ color: 'var(--accent-neon)', textDecoration: 'none', fontWeight: '600', fontSize: '0.85rem' }}>Regístrate aquí</Link>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default LoginMobile;
