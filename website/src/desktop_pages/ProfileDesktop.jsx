import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { logout } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { useSettings } from '../context/SettingsContext';
import styles from '../styles/Profile.module.css';

const ProfileDesktop = () => {
    const navigate = useNavigate();
    const { user, clearUser } = useAuth();
    const { timezone, setTimezone, defaultTimezone } = useSettings();
    const [loading, setLoading] = useState(false);

    const handleLogout = async () => {
        await logout();
        clearUser();
        navigate('/login');
    };

    if (loading) {
        return <div className={styles['loading-container']}>Cargando perfil...</div>;
    }

    return (
        <div className={styles.container}>
            <Navbar />

            <main className={styles['main-content']}>
                <header className={styles.header}>
                    <h1 className={styles.title}>Perfil</h1>
                    <p className={styles.subtitle}>Configuración de cuenta y programa de beneficios</p>
                </header>

                <div className={styles['content-grid']}>
                    {/* Left Column: Profile & Referral */}
                    <div className={styles['left-col']}>
                        <div className={`${styles['user-card']} glass-panel`}>
                            <div className={styles['avatar-container']}>
                                {user?.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <h2 className={styles['user-name']}>{user?.username}</h2>
                            <p className={styles['user-email']}>{user?.email}</p>
                            
                            <div className={styles['user-stats-row']}>
                                <div className={styles['user-stat-item']}>
                                    <span className={styles['stat-value']}>Nivel 1</span>
                                    <span className={styles['stat-label']}>Rango</span>
                                </div>
                                <div className={styles['user-stat-item']}>
                                    <span className={styles['stat-value']}>#{user?.id}</span>
                                    <span className={styles['stat-label']}>ID Usuario</span>
                                </div>
                            </div>

                            <div className={`${styles['desktop-referral-card']} glass-panel`}>
                                <div className={styles['mobile-card-header']}>
                                    <span className={styles['mobile-card-title']}>Nivel de Cuenta</span>
                                    <span className={styles['mobile-level-badge']}>35%</span>
                                </div>
                                <div className={styles['mobile-exp-container']}>
                                    <div className={styles['mobile-exp-bar']}>
                                        <div className={styles['mobile-exp-fill']} style={{ width: '35%' }}></div>
                                    </div>
                                    <div className={styles['mobile-exp-text']}>
                                        <span>350 / 1000 EXP</span>
                                    </div>
                                </div>
                            </div>

                            <button onClick={handleLogout} className={styles['desktop-logout-btn-card']}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                                Cerrar Sesión
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Menu Grid */}
                    <div className={styles['right-col']}>
                        <div className={styles['menu-grid']}>
                            {/* Actividad */}
                            <Link to="/portfolio" className={styles['menu-square-btn']}>
                                <div className={styles['menu-icon-wrapper']}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                                </div>
                                <span className={styles['menu-label']}>Operaciones</span>
                            </Link>

                            <div className={styles['menu-square-btn']}>
                                <div className={styles['menu-icon-wrapper']}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>
                                </div>
                                <span className={styles['menu-label']}>Transacciones</span>
                            </div>

                            <div className={styles['menu-square-btn']}>
                                <div className={styles['menu-icon-wrapper']}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                </div>
                                <span className={styles['menu-label']}>Referidos</span>
                            </div>

                            {/* Seguridad */}
                            <div className={styles['menu-square-btn']}>
                                <div className={styles['menu-icon-wrapper']}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                </div>
                                <span className={styles['menu-label']}>Seguridad</span>
                            </div>

                            <div className={styles['menu-square-btn']}>
                                <div className={styles['menu-icon-wrapper']}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                                </div>
                                <span className={styles['menu-label']}>Privacidad</span>
                            </div>

                            <div className={styles['menu-square-btn']}>
                                <div className={styles['menu-icon-wrapper']}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                                </div>
                                <span className={styles['menu-label']}>Apariencia</span>
                            </div>

                            {/* Settings (Mixed in) */}
                            <div className={`${styles['menu-square-btn']} ${styles['menu-square-settings']}`}>
                                <div className={styles['menu-icon-wrapper']}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                </div>
                                <select 
                                    value={timezone} 
                                    onChange={(e) => setTimezone(e.target.value)}
                                    className={styles['timezone-select']}
                                >
                                    <option value={defaultTimezone}>Local</option>
                                    <option value="UTC">UTC</option>
                                    <option value="America/New_York">NY</option>
                                    <option value="Europe/London">LDN</option>
                                    <option value="Europe/Paris">PAR</option>
                                    <option value="Asia/Tokyo">TKY</option>
                                </select>
                                <span className={styles['menu-label']}>Zona Horaria</span>
                            </div>

                            <div className={styles['menu-square-btn']}>
                                <div className={styles['menu-icon-wrapper']}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                                </div>
                                <span className={styles['menu-label']}>Notificaciones</span>
                            </div>

                            <div className={styles['menu-square-btn']}>
                                <div className={styles['menu-icon-wrapper']}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                                </div>
                                <span className={styles['menu-label']}>Soporte</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ProfileDesktop;
