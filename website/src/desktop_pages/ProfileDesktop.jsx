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
    const [activeSection, setActiveSection] = useState(null);

    const handleLogout = async () => {
        await logout();
        clearUser();
        navigate('/login');
    };

  /* Iconos SVG de las secciones */
    const sections = [
        { id: 'referidos', label: 'Referidos', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> },
        { id: 'seguridad', label: 'Seguridad', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg> },
        { id: 'privacidad', label: 'Privacidad', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> },
        { id: 'apariencia', label: 'Apariencia', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg> },
        { id: 'timezone', label: 'Zona Horaria', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> },
        { id: 'notificaciones', label: 'Notificaciones', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg> },
        { id: 'soporte', label: 'Soporte', icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg> },
    ];

    const renderSectionContent = () => {
        if (activeSection === 'timezone') {
            return (
                <div className={`${styles['section-detail-card']} glass-panel`}>
                    <h3 className={styles['detail-title']}>Zona Horaria</h3>
                    <p className={styles['detail-desc']}>Ajusta la zona horaria para que todos los gráficos y transacciones se muestren en tu hora local.</p>
                    
                    <div className={styles['setting-row']}>
                        <label>Selecciona tu zona horaria:</label>
                        <select 
                            value={timezone} 
                            onChange={(e) => setTimezone(e.target.value)}
                            className={styles['detail-timezone-select']}
                        >
                            <option value={defaultTimezone}>Local (Detectada: {defaultTimezone})</option>
                            <option value="UTC">UTC (Universal)</option>
                            <option value="America/New_York">Nueva York (EST/EDT)</option>
                            <option value="Europe/London">Londres (GMT/BST)</option>
                            <option value="Europe/Paris">París (CET/CEST)</option>
                            <option value="Asia/Tokyo">Tokio (JST)</option>
                            <option value="Australia/Sydney">Sídney (AEST/AEDT)</option>
                            <option value="America/Argentina/Buenos_Aires">Buenos Aires (ART)</option>
                            <option value="America/Mexico_City">CDMX (CST/CDT)</option>
                        </select>
                    </div>

                    <div className={styles['timezone-info-box']}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        <span>Actualmente configurado en: <strong>{timezone}</strong></span>
                    </div>
                </div>
            );
        }

        const section = sections.find(s => s.id === activeSection);
        return (
            <div className={`${styles['coming-soon-card']} glass-panel`}>
                <div className={styles['coming-soon-icon']}>{section?.icon}</div>
                <h3 className={styles['detail-title']}>{section?.label}</h3>
                <p className={styles['coming-soon-text']}>Esta sección estará disponible próximamente.</p>
                <button className={styles['coming-soon-notify-btn']}>Notificarme al lanzamiento</button>
            </div>
        );
    };

    if (loading) {
        return <div className={styles['loading-container']}>Cargando perfil...</div>;
    }

    return (
        <div className={styles.container}>
            <Navbar />

            <main className={styles['main-content']}>
                <header className={styles.header}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {activeSection && (
                            <button onClick={() => setActiveSection(null)} className={styles['back-button-circle']}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                            </button>
                        )}
                        <div>
                            <h1 className={styles.title}>{activeSection ? sections.find(s => s.id === activeSection)?.label : 'Perfil'}</h1>
                            <p className={styles.subtitle}>
                                {activeSection ? `Configuración de ${sections.find(s => s.id === activeSection)?.label.toLowerCase()}` : 'Configuración de cuenta y programa de beneficios'}
                            </p>
                        </div>
                    </div>
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
                                    <span className={styles['mobile-card-title']}>Programa de Referidos</span>
                                    <span className={styles['mobile-level-badge']}>Nivel 1</span>
                                </div>
                                <div className={styles['mobile-exp-container']}>
                                    <div className={styles['mobile-exp-bar']}>
                                        <div className={styles['mobile-exp-fill']} style={{ width: '35%' }}></div>
                                    </div>
                                    <div className={styles['mobile-exp-text']}>
                                        <span>2 / 5</span>
                                        <span>Próximo Nivel: Bronce</span>
                                    </div>
                                </div>
                            </div>

                            <button onClick={handleLogout} className={styles['desktop-logout-btn-card']}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                                Cerrar Sesión
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Menu Grid or Active Section */}
                    <div className={styles['right-col']}>
                        {activeSection ? (
                            <div className="fade-in">
                                {renderSectionContent()}
                            </div>
                        ) : (
                            <div className={styles['menu-grid']}>
                                {sections.map(section => (
                                    section.link ? (
                                        <Link key={section.id} to={section.link} className={styles['menu-square-btn']}>
                                            <div className={styles['menu-icon-wrapper']}>{section.icon}</div>
                                            <span className={styles['menu-label']}>{section.label}</span>
                                        </Link>
                                    ) : (
                                        <div 
                                            key={section.id} 
                                            className={styles['menu-square-btn']}
                                            onClick={() => setActiveSection(section.id)}
                                        >
                                            <div className={styles['menu-icon-wrapper']}>{section.icon}</div>
                                            <span className={styles['menu-label']}>{section.label}</span>
                                        </div>
                                    )
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ProfileDesktop;
