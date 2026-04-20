import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPortfolio, logout } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import styles from '../styles/ProfileDesktop.module.css';

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
            <div className={styles.loadingContainer}>
                Cargando perfil...
            </div>
        );
    }

    return (
        <div className={styles.container}>

            {/* Navbar */}
            <Navbar />

            {/* Main Content */}
            <main className={styles.mainContent}>
                <header className={styles.header}>
                    <h1 className={styles.title}>Mi Perfil</h1>
                    <p className={styles.subtitle}>Gestiona tu cuenta y revisa tus estadísticas</p>
                </header>

                {portfolioError && (
                    <div className={styles.errorBanner}>
                        {portfolioError}
                    </div>
                )}

                <div className={styles.contentGrid}>

                    {/* User Info Card */}
                    <div className={`${styles.userCard} glass-panel`}>
                        <div className={styles.avatarContainer}>
                            {user?.avatar_url ? (
                                <img src={user.avatar_url} alt="Avatar" className={styles.avatarImg} />
                            ) : (
                                user?.username?.charAt(0).toUpperCase() || 'U'
                            )}
                        </div>
                        <h2 className={styles.userName}>{user?.username}</h2>
                        <p className={styles.userEmail}>{user?.email}</p>

                        <div className={styles.levelExpGrid}>
                            <div className={styles.statBox}>
                                <p className={styles.statLabel}>NIVEL</p>
                                <p className={styles.statValue}>1</p>
                            </div>
                            <div className={styles.statBox}>
                                <p className={styles.statLabel}>EXP</p>
                                <p className={styles.statValue}>150</p>
                            </div>
                        </div>

                        <button className={styles.logoutBtn} onClick={async () => {
                            await logout();
                            clearUser();
                            navigate('/login');
                        }}>
                            Cerrar Sesión
                        </button>
                    </div>

                    {/* Stats & Details */}
                    <div className={styles.detailsCol}>

                        {/* Wallet Summary */}
                        <div className={`${styles.summaryCard} glass-panel`}>
                            <h3 className={styles.cardTitle}>Resumen de Cuenta</h3>
                            <div className={styles.summaryGrid}>
                                <div className={styles.summaryItem}>
                                    <p className={styles.summaryLabel}>Balance de Wallet</p>
                                    <p className={`${styles.summaryValue} ${styles.summaryValueAccent}`}>{portfolio?.walletBalance?.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0,00'} €</p>
                                </div>
                                <div className={styles.summaryItem}>
                                    <p className={styles.summaryLabel}>Valor en Acciones</p>
                                    <p className={styles.summaryValue}>{(portfolio?.holdings?.reduce((acc, h) => acc + h.position_value, 0) || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
                                </div>
                                <div className={styles.summaryItem}>
                                    <p className={styles.summaryLabel}>Valor Total</p>
                                    <p className={styles.summaryValue}>{((portfolio?.walletBalance || 0) + (portfolio?.holdings?.reduce((acc, h) => acc + h.position_value, 0) || 0)).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
                                </div>
                            </div>
                        </div>

                        {/* Account Details */}
                        <div className={`${styles.detailsCard} glass-panel`}>
                            <h3 className={styles.cardTitle}>Detalles de la Cuenta</h3>
                            <div className={styles.detailsList}>
                                <div className={styles.detailsItem}>
                                    <span className={styles.detailsLabel}>Fecha de registro</span>
                                    <span className={styles.detailsValue}>{user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
                                </div>
                                <div className={styles.detailsItem}>
                                    <span className={styles.detailsLabel}>Estado de la cuenta</span>
                                    <span className={styles.detailsValueAccent}>Verificada</span>
                                </div>
                                <div className={styles.detailsItem}>
                                    <span className={styles.detailsLabel}>ID de Usuario</span>
                                    <span className={styles.detailsValueMuted}>#{user?.id}</span>
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
