import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import fsLogo from '../assets/fs-logo.png';
import { verifyEmail } from '../services/api';
import { useAuth } from '../context/AuthContext';

const VerifyDesktop = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [searchParams] = useSearchParams();
    const email = searchParams.get('email') || '';

    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const inputRefs = useRef([]);

    useEffect(() => {
        if (inputRefs.current[0]) inputRefs.current[0].focus();
    }, []);

    const handleChange = (index, value) => {
        if (value.length > 1) value = value.slice(-1);
        if (!/^\d*$/.test(value)) return;

        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);

        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            setCode(pasted.split(''));
            inputRefs.current[5]?.focus();
        }
    };

    const handleVerify = async () => {
        const fullCode = code.join('');
        if (fullCode.length !== 6) {
            setError('Introduce el código completo de 6 dígitos');
            return;
        }
        setError('');
        setLoading(true);
        try {
            const data = await verifyEmail(email, fullCode);
            login(data.user);
            setSuccess(true);
            setTimeout(() => navigate('/home'), 1500);
        } catch (err) {
            setError(err.message || 'Código inválido');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (code.every(d => d !== '')) {
            handleVerify();
        }
    }, [code]);

    const digitInputStyle = {
        width: '56px', height: '64px', textAlign: 'center', fontSize: '1.8rem', fontWeight: '800',
        borderRadius: '12px', border: '2px solid rgba(255,255,255,0.1)', backgroundColor: 'var(--surface-lighter)',
        color: 'var(--text-main)', outline: 'none', caretColor: 'var(--accent-neon)',
        transition: 'border-color 0.2s, box-shadow 0.2s'
    };

    return (
        <div style={{ backgroundColor: 'var(--bg-main)', minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column' }}>
            <nav style={{ padding: '1.5rem 4rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <Link to="/">
                    <img src={fsLogo} alt="Futstocks Logo" style={{ height: '40px' }} />
                </Link>
            </nav>
            <main style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(57,255,20,0.05) 0%, rgba(16,16,16,0) 70%)', zIndex: 0, pointerEvents: 'none' }}></div>
                <div className="glass-panel fade-in-up" style={{ width: '100%', maxWidth: '480px', padding: '3rem', borderRadius: '16px', zIndex: 1, position: 'relative', textAlign: 'center' }}>

                    {success ? (
                        <div>
                            <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '0.5rem' }}>¡Email Verificado!</h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>Redirigiendo al inicio...</p>
                        </div>
                    ) : (
                        <>
                            <h1 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '0.5rem' }}>Verifica tu Email</h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: 1.5 }}>
                                Hemos enviado un código de 6 dígitos a<br />
                                <strong style={{ color: 'var(--text-main)' }}>{email}</strong>
                            </p>

                            {error && (
                                <div style={{ backgroundColor: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.3)', borderRadius: '8px', padding: '12px', marginBottom: '1.5rem', color: '#ff4d4d', fontSize: '0.9rem' }}>
                                    {error}
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '2rem' }} onPaste={handlePaste}>
                                {code.map((digit, idx) => (
                                    <input
                                        key={idx}
                                        ref={el => inputRefs.current[idx] = el}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleChange(idx, e.target.value)}
                                        onKeyDown={(e) => handleKeyDown(idx, e)}
                                        style={{
                                            ...digitInputStyle,
                                            borderColor: digit ? 'var(--accent-neon)' : 'rgba(255,255,255,0.1)',
                                            boxShadow: digit ? '0 0 10px rgba(57,255,20,0.15)' : 'none'
                                        }}
                                    />
                                ))}
                            </div>

                            <button
                                type="button"
                                className="neon-button"
                                style={{ padding: '14px 2rem', borderRadius: '8px', fontSize: '1.05rem', width: '100%', opacity: loading ? 0.6 : 1, cursor: loading ? 'wait' : 'pointer' }}
                                onClick={handleVerify}
                                disabled={loading}
                            >
                                {loading ? 'Verificando...' : 'Verificar'}
                            </button>

                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '2rem' }}>
                                ¿No recibiste el código? <Link to="/login" style={{ color: 'var(--accent-neon)', textDecoration: 'none', fontWeight: '600' }}>Volver al login</Link>
                            </p>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default VerifyDesktop;
