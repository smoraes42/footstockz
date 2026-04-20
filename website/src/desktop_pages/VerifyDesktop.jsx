import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import fsLogo from '../assets/fs-logo.png';
import { verifyEmail } from '../services/api';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/Verify.module.css';
import Navbar from '../components/Navbar';

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

    return (
        <div className={styles.container}>
            <Navbar type="top" />
            <main className={styles.main}>
                <div className={styles.glowEffect}></div>
                <div className={`glass-panel fade-in-up ${styles.glassPanel}`}>

                    {success ? (
                        <div>
                            <h1 className={styles.successTitle}>¡Email Verificado!</h1>
                            <p className={styles.successSubtext}>Redirigiendo al inicio...</p>
                        </div>
                    ) : (
                        <>
                            <h1 className={styles.title}>Verifica tu Email</h1>
                            <p className={styles.subtext}>
                                Hemos enviado un código de 6 dígitos a<br />
                                <strong className={styles.emailText}>{email}</strong>
                            </p>

                            {error && (
                                <div className={styles.errorAlert}>
                                    {error}
                                </div>
                            )}

                            <div className={styles.codeContainer} onPaste={handlePaste}>
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
                                        className={`${styles.digitInput} ${digit ? styles.digitInputActive : ''}`}
                                    />
                                ))}
                            </div>

                            <button
                                type="button"
                                className={`neon-button ${styles.verifyBtn}`}
                                style={{ opacity: loading ? 0.6 : 1, cursor: loading ? 'wait' : 'pointer' }}
                                onClick={handleVerify}
                                disabled={loading}
                            >
                                {loading ? 'Verificando...' : 'Verificar'}
                            </button>

                            <p className={styles.resendText}>
                                ¿No recibiste el código? <Link to="/login" className={styles.resendLink}>Volver al login</Link>
                            </p>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default VerifyDesktop;
