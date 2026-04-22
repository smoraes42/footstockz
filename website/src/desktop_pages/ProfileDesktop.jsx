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
                            <span className={styles['mobile-user-id']}>#{user?.id}</span>

                            <div className={`${styles['desktop-referral-card']} glass-panel`} style={{ marginTop: '2rem' }}>
                                <div className={styles['mobile-card-header']}>
                                    <span className={styles['mobile-card-title']}>Nivel de Cuenta</span>
                                    <span className={styles['mobile-level-badge']}>Nivel 1</span>
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
                        </div>
                    </div>

                    {/* Right Column: Menu Sections */}
                    <div className={styles['right-col']}>

                        {/* History Section */}
                        <div className={styles['desktop-menu-section']}>
                            <h3 className={styles['desktop-section-label']}>Actividad y Transacciones</h3>
                            <div className={styles['desktop-menu-list']}>
                                <Link to="/portfolio" className={styles['desktop-menu-item']}>
                                    <span className={styles['desktop-menu-text']}>Historial de Operaciones</span>
                                    <span className={styles['mobile-menu-arrow']}>›</span>
                                </Link>
                                <div className={styles['desktop-menu-item']}>
                                    <span className={styles['desktop-menu-text']}>Historial de Depósitos y Retiros</span>
                                    <span className={styles['mobile-menu-arrow']}>›</span>
                                </div>
                                <div className={styles['desktop-menu-item']}>
                                    <span className={styles['desktop-menu-text']}>Estado de Referidos</span>
                                    <span className={styles['mobile-menu-arrow']}>›</span>
                                </div>
                            </div>
                        </div>

                        {/* Security Section */}
                        <div className={styles['desktop-menu-section']}>
                            <h3 className={styles['desktop-section-label']}>Seguridad y Privacidad</h3>
                            <div className={styles['desktop-menu-list']}>
                                <div className={styles['desktop-menu-item']}>
                                    <span className={styles['desktop-menu-text']}>Cambiar Contraseña</span>
                                    <span className={styles['mobile-menu-arrow']}>›</span>
                                </div>
                                <div className={styles['desktop-menu-item']}>
                                    <span className={styles['desktop-menu-text']}>Autenticación en Dos Pasos (2FA)</span>
                                    <span className={styles['mobile-menu-arrow']}>›</span>
                                </div>
                                <div className={styles['desktop-menu-item']}>
                                    <span className={styles['desktop-menu-text']}>Sesiones Activas</span>
                                    <span className={styles['mobile-menu-arrow']}>›</span>
                                </div>
                            </div>
                        </div>

                        {/* Settings Section */}
                        <div className={styles['desktop-menu-section']}>
                            <h3 className={styles['desktop-section-label']}>Preferencias del Sistema</h3>
                            <div className={styles['desktop-menu-list']}>
                                <div className={styles['desktop-menu-item']} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span className={styles['desktop-menu-text']}>Zona Horaria</span>
                                    <select 
                                        value={timezone} 
                                        onChange={(e) => setTimezone(e.target.value)}
                                        style={{ backgroundColor: '#0a0a0a', color: '#fff', border: '1px solid #333', padding: '4px 8px', borderRadius: '4px' }}
                                    >
                                        <option value={defaultTimezone}>Local ({defaultTimezone})</option>
                                        <option value="UTC">UTC</option>
                                        <option value="America/New_York">New York (EST/EDT)</option>
                                        <option value="Europe/London">London (GMT/BST)</option>
                                        <option value="Europe/Paris">Paris (CET/CEST)</option>
                                        <option value="Asia/Tokyo">Tokyo (JST)</option>
                                        <option value="Australia/Sydney">Sydney (AEST/AEDT)</option>
                                    </select>
                                </div>
                                <div className={styles['desktop-menu-item']}>
                                    <span className={styles['desktop-menu-text']}>Configuración de Notificaciones</span>
                                    <span className={styles['mobile-menu-arrow']}>›</span>
                                </div>
                                <div className={styles['desktop-menu-item']}>
                                    <span className={styles['desktop-menu-text']}>Temas y Apariencia</span>
                                    <span className={styles['mobile-menu-arrow']}>›</span>
                                </div>
                            </div>
                        </div>

                        <button onClick={handleLogout} className={styles['desktop-logout-btn']}>
                            Cerrar Sesión
                        </button>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default ProfileDesktop;
