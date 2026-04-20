import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import fsLogo from '../assets/fs-logo.png';
import { verifyEmail } from '../services/api';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/Verify.module.css';

const VerifyMobile = () => {
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
        <div className={styles.mobileContainer}>
            <nav className={styles.mobileNav}>
                <Link to="/">
                    <img src={fsLogo} alt="Futstocks Logo" className={styles.mobileLogo} />
                </Link>
            </nav>
            <main className={styles.mobileMain}>
                <div className={styles.mobileGlow}></div>
                <div className={`${styles.mobileGlassPanel} glass-panel fade-in-up`}>

                    {success ? (
                        <div>
                            <h1 className={styles.mobileTitle}>¡Email Verificado!</h1>
                            <p className={styles.mobileSubtext}>Redirigiendo al inicio...</p>
                        </div>
                    ) : (
                        <>
                            <h1 className={styles.mobileTitle}>Verifica tu Email</h1>
                            <p className={styles.mobileSubtext}>
                                Código enviado a<br />
                                <strong className={styles.mobileEmail}>{email}</strong>
                            </p>

                            {error && (
                                <div className={styles.mobileErrorAlert}>
                                    {error}
                                </div>
                            )}

                            <div className={styles.mobileCodeContainer} onPaste={handlePaste}>
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
                                        className={`${styles.mobileDigitInput} ${digit ? styles.mobileDigitInputActive : ''}`}
                                    />
                                ))}
                            </div>

                            <button
                                type="button"
                                className={`${styles.mobileVerifyBtn} ${loading ? styles.mobileLoadingBtn : ''} neon-button`}
                                onClick={handleVerify}
                                disabled={loading}
                            >
                                {loading ? 'Verificando...' : 'Verificar'}
                            </button>

                            <p className={styles.mobileFooter}>
                                ¿No recibiste el código? <Link to="/login" className={styles.mobileFooterLink}>Volver al login</Link>
                            </p>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default VerifyMobile;
