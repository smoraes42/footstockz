import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPortfolio, logout } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import styles from '../styles/Profile.module.css';

const ProfileDesktop = () => {
    const navigate = useNavigate();
    const { user, clearUser } = useAuth();   // user already fetched globally — no redundant getMe()
    const [portfolio, setPortfolio] = useState(null);
    const [loading, setLoading] = useState(true);
    const [portfolioError, setPortfolioError] = useState('');

    useEffect(() => {
        const fetchPortfolio = async () => {
            try {
                const portfolioData = await getPortfolio();
                setPortfolio(portfolioData);
            } catch (error) {
                if (error.status === 401 || error.status === 403) {
                    clearUser();
                    navigate('/login');
                    return;
                }
                setPortfolioError('No se pudo cargar el portfolio. Inténtalo de nuevo.');
                console.error('Failed to load portfolio:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPortfolio();
    }, []);

    if (loading) {
        return (
            <div className={styles['loading-container']}>
                Cargando perfil...
            </div>
        );
    }

    return (
        <div className={styles.container}>

            {/* Navbar */}
            <Navbar />

            {/* Main Content */}
            <main className={styles['main-content']}>
                <header className={styles.header}>
                    <h1 className={styles.title}>Mi Perfil</h1>
                    <p className={styles.subtitle}>Gestiona tu cuenta y revisa tus estadísticas</p>
                </header>

                {portfolioError && (
                    <div className={styles['error-banner']}>
                        {portfolioError}
                    </div>
                )}

                <div className={styles['content-grid']}>

                    {/* User Info Card */}
                    <div className={`${styles['user-card']} glass-panel`}>
                        <div className={styles['avatar-container']}>
                            {user?.avatar_url ? (
                                <img src={user.avatar_url} alt="Avatar" className={styles['avatar-img']} />
                            ) : (
                                user?.username?.charAt(0).toUpperCase() || 'U'
                            )}
                        </div>
                        <h2 className={styles['user-name']}>{user?.username}</h2>
                        <p className={styles['user-email']}>{user?.email}</p>

                        <div className={styles['level-exp-grid']}>
                            <div className={styles['stat-box']}>
                                <p className={styles['stat-label']}>NIVEL</p>
                                <p className={styles['stat-value']}>1</p>
                            </div>
                            <div className={styles['stat-box']}>
                                <p className={styles['stat-label']}>EXP</p>
                                <p className={styles['stat-value']}>150</p>
                            </div>
                        </div>

                        <button className={styles['logout-btn']} onClick={async () => {
                            await logout();
                            clearUser();
                            navigate('/login');
                        }}>
                            Cerrar Sesión
                        </button>
                    </div>

                    {/* Stats & Details */}
                    <div className={styles['details-col']}>

                        {/* Wallet Summary */}
                        <div className={`${styles['summary-card']} glass-panel`}>
                            <h3 className={styles['card-title']}>Resumen de Cuenta</h3>
                            <div className={styles['summary-grid']}>
                                <div className={styles['summary-item']}>
                                    <p className={styles['summary-label']}>Balance de Wallet</p>
                                    <p className={`${styles['summary-value']} ${styles['summary-value-accent']}`}>{portfolio?.walletBalance?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'} €</p>
                                </div>
                                <div className={styles['summary-item']}>
                                    <p className={styles['summary-label']}>Valor en Acciones</p>
                                    <p className={styles['summary-value']}>{(portfolio?.holdings?.reduce((acc, h) => acc + h.position_value, 0) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
                                </div>
                                <div className={styles['summary-item']}>
                                    <p className={styles['summary-label']}>Valor Total</p>
                                    <p className={styles['summary-value']}>{((portfolio?.walletBalance || 0) + (portfolio?.holdings?.reduce((acc, h) => acc + h.position_value, 0) || 0)).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
                                </div>
                            </div>
                        </div>

                        {/* Account Details */}
                        <div className={`${styles['details-card']} glass-panel`}>
                            <h3 className={styles['card-title']}>Detalles de la Cuenta</h3>
                            <div className={styles['details-list']}>
                                <div className={styles['details-item']}>
                                    <span className={styles['details-label']}>Fecha de registro</span>
                                    <span className={styles['details-value']}>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
                                </div>
                                <div className={styles['details-item']}>
                                    <span className={styles['details-label']}>Estado de la cuenta</span>
                                    <span className={styles['details-value-accent']}>Verificada</span>
                                </div>
                                <div className={styles['details-item']}>
                                    <span className={styles['details-label']}>ID de Usuario</span>
                                    <span className={styles['details-value-muted']}>#{user?.id}</span>
                                </div>
                            </div>
                        </div>

                    </div>

                </div>
            </main>

        </div>
    );
};

export default ProfileDesktop;
