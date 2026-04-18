import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import fsLogo from '../assets/fs-logo.png';
import fsLogoBlack from '../assets/fs-logo-black.png';
import { registerUser, googleLogin, initGoogleSignIn } from '../services/api';

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
        <div style={{ backgroundColor: 'var(--bg-main)', minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column' }}>
            <nav style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(16,16,16,0.9)', position: 'sticky', top: 0, zIndex: 10 }}>
                <Link to="/">
                    <img src={fsLogo} alt="Futstocks Logo" style={{ height: '30px' }} />
                </Link>
            </nav>
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '150vw', height: '150vw', background: 'radial-gradient(circle, rgba(57,255,20,0.1) 0%, rgba(16,16,16,0) 60%)', zIndex: 0, pointerEvents: 'none' }}></div>
                <div className="glass-panel fade-in-up" style={{ width: '100%', padding: '2rem 1.5rem', borderRadius: '12px', zIndex: 1, position: 'relative' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: '800', marginBottom: '1.5rem', textAlign: 'center' }}>Crear Cuenta</h1>

                    {error && (
                        <div style={{ backgroundColor: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.3)', borderRadius: '8px', padding: '10px', marginBottom: '1.25rem', color: '#ff4d4d', fontSize: '0.85rem', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}

                    <form style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }} onSubmit={(e) => { e.preventDefault(); handleRegister(); }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Username</label>
                            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'var(--surface-lighter)', color: 'var(--text-main)', outline: 'none' }} placeholder="Tu username" />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'var(--surface-lighter)', color: 'var(--text-main)', outline: 'none' }} placeholder="tu@email.com" />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Contraseña</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'var(--surface-lighter)', color: 'var(--text-main)', outline: 'none' }} placeholder="••••••••" />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Repetir Contraseña</label>
                            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'var(--surface-lighter)', color: 'var(--text-main)', outline: 'none' }} placeholder="••••••••" />
                        </div>
                        <button type="submit" className="neon-button" style={{ padding: '14px', borderRadius: '8px', fontSize: '1rem', marginTop: '1rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', opacity: loading ? 0.6 : 1, cursor: loading ? 'wait' : 'pointer' }} disabled={loading}>
                            {loading ? 'Creando cuenta...' : <>Unirse a <img src={fsLogoBlack} alt="Futstocks" style={{ height: '18px' }} /></>}
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
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>¿Ya tienes cuenta? </span>
                        <Link to="/login" style={{ color: 'var(--accent-neon)', textDecoration: 'none', fontWeight: '600', fontSize: '0.85rem' }}>Inicia sesión</Link>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default RegisterMobile;
