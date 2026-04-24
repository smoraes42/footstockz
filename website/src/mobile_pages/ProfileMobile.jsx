import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getMe, getPublicProfile, getPortfolio } from '../services/api';
import MobileHeader from '../components/MobileHeader';
import MobileNavbar from '../components/MobileNavbar';
import { useSettings } from '../context/SettingsContext';
import styles from '../styles/Profile.module.css';

const ProfileMobile = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const isOwnProfile = !userId;
    const { timezone, setTimezone, defaultTimezone } = useSettings();

    const [user, setUser] = useState(null);
    const [holdings, setHoldings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (isOwnProfile) {
                    const userData = await getMe();
                    setUser(userData);

                    const portfolioData = await getPortfolio();
                    setHoldings(portfolioData.holdings || []);
                } else {
                    const pData = await getPublicProfile(userId);
                    setUser(pData.user);
                    setHoldings(pData.holdings || []);
                }
            } catch (error) {
                console.error('Failed to load profile:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [userId, isOwnProfile]);

    const handleLogout = () => {
        document.cookie = "jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        window.location.href = "/login";
    };

    const renderSectionContent = () => {
        if (activeSection === 'timezone') {
            return (
                <div className={`${styles['mobile-detail-view']} fade-in`}>
                    <div className={`${styles['section-detail-card']} glass-panel`}>
                        <h3 className={styles['detail-title']}>Zona Horaria</h3>
                        <p className={styles['detail-desc']}>Ajusta la zona horaria para ver los gráficos en tu hora local.</p>
                        
                        <div className={styles['setting-row']}>
                            <label>Selecciona zona:</label>
                            <select 
                                value={timezone} 
                                onChange={(e) => setTimezone(e.target.value)}
                                className={styles['detail-timezone-select']}
                            >
                                <option value={defaultTimezone}>Local (Detectada)</option>
                                <option value="UTC">UTC</option>
                                <option value="America/New_York">NY (EST)</option>
                                <option value="Europe/London">Londres (GMT)</option>
                                <option value="Europe/Paris">París (CET)</option>
                                <option value="Asia/Tokyo">Tokio (JST)</option>
                                <option value="America/Argentina/Buenos_Aires">Bs.As. (ART)</option>
                                <option value="America/Mexico_City">CDMX (CST)</option>
                            </select>
                        </div>

                        <div className={styles['timezone-info-box']} style={{ fontSize: '0.8rem' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                            <span>Configurado: <strong>{timezone}</strong></span>
                        </div>
                    </div>
                </div>
            );
        }

        const labels = {
            'depositos': 'Depósitos',
            'password': 'Contraseña',
            '2fa': 'Seguridad 2FA',
            'notificaciones': 'Notificaciones',
            'apariencia': 'Apariencia'
        };

        return (
            <div className={`${styles['mobile-detail-view']} fade-in`}>
                <div className={`${styles['coming-soon-card']} glass-panel`} style={{ minHeight: '300px', padding: '3rem 1.5rem' }}>
                    <div className={styles['coming-soon-icon']} style={{ width: '60px', height: '60px' }}>
                         <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                    </div>
                    <h3 className={styles['detail-title']} style={{ fontSize: '1.4rem' }}>{labels[activeSection] || 'Próximamente'}</h3>
                    <p className={styles['coming-soon-text']} style={{ fontSize: '0.9rem' }}>Esta sección estará disponible en la próxima actualización.</p>
                    <button className={styles['coming-soon-notify-btn']} style={{ width: '100%' }}>Avisarme</button>
                </div>
            </div>
        );
    };

    if (loading) return <div className={styles['loading-container']}>Cargando...</div>;

    return (
        <div className={styles['mobile-container']}>

            <MobileHeader
                showLogo={!activeSection}
                title={activeSection ? 'Ajustes' : null}
                onBack={activeSection ? () => setActiveSection(null) : (!isOwnProfile ? () => navigate(-1) : null)}
            />

            <main className={styles['mobile-main']}>

                {activeSection ? (
                    renderSectionContent()
                ) : (
                    <>
                        {/* User Info Card */}
                        <div className={`${styles['mobile-profile-card']} glass-panel`}>
                            <div className={styles['mobile-avatar']}>
                                {user?.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className={styles['mobile-user-details']}>
                                <h2 className={styles['mobile-user-name']}>{user?.username}</h2>
                                <p className={styles['mobile-user-email']} style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>{user?.email}</p>
                            </div>
                        </div>

                        {isOwnProfile && (
                            <>
                                {/* Referral Program Enhancement Mobile */}
                                <div className={`${styles['mobile-referral-card']} glass-panel`} style={{ marginTop: '1.5rem' }}>
                                    <div className={styles['referral-header']}>
                                        <div className={styles['referral-title-box']}>
                                            <span className={styles['mobile-card-title']}>Programa de Referidos</span>
                                            <p className={styles['referral-desc']}>Gana 10% de comisiones</p>
                                        </div>
                                        <div className={styles['referral-stats-mini']}>
                                            <div className={styles['ref-stat']}>
                                                <span className={styles['ref-stat-val']} style={{ fontSize: '1rem' }}>0</span>
                                                <span className={styles['ref-stat-lab']}>Amigos</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles['referral-link-box']}>
                                        <input 
                                            type="text" 
                                            readOnly 
                                            value={`https://footstockz.com/register?ref=${user?.username}`} 
                                            className={styles['referral-input']}
                                        />
                                        <button 
                                            className={styles['copy-referral-btn']}
                                            onClick={() => {
                                                navigator.clipboard.writeText(`https://footstockz.com/register?ref=${user?.username}`);
                                            }}
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                        </button>
                                    </div>

                                    <div className={styles['mobile-exp-container']}>
                                        <div className={styles['mobile-exp-bar']}>
                                            <div className={styles['mobile-exp-fill']} style={{ width: '10%' }}></div>
                                        </div>
                                        <div className={styles['mobile-exp-text']}>
                                            <span>Novato</span>
                                            <span>Próximo: Bronce</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Demo/Real Switch */}
                                <div className={styles['mobile-mode-switch-container']}>

                                {/* History Section */}
                                <div className={styles['mobile-menu-section']}>
                                    <h3 className={styles['mobile-section-label']}>Actividad</h3>
                                    <div className={styles['mobile-menu-list']}>
                                        <Link to="/portfolio" className={styles['mobile-menu-item']}>
                                            <div className={styles['mobile-menu-item-left']}>
                                                <span className={styles['mobile-menu-text']}>Historial de Operaciones</span>
                                            </div>
                                            <span className={styles['mobile-menu-arrow']}>›</span>
                                        </Link>
                                        <div className={styles['mobile-menu-item']} onClick={() => setActiveSection('depositos')}>
                                            <div className={styles['mobile-menu-item-left']}>
                                                <span className={styles['mobile-menu-text']}>Historial de Depósitos</span>
                                            </div>
                                            <span className={styles['mobile-menu-arrow']}>›</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Security Section */}
                                <div className={styles['mobile-menu-section']}>
                                    <h3 className={styles['mobile-section-label']}>Seguridad</h3>
                                    <div className={styles['mobile-menu-list']}>
                                        <div className={styles['mobile-menu-item']} onClick={() => setActiveSection('password')}>
                                            <div className={styles['mobile-menu-item-left']}>
                                                <span className={styles['mobile-menu-text']}>Cambiar Contraseña</span>
                                            </div>
                                            <span className={styles['mobile-menu-arrow']}>›</span>
                                        </div>
                                        <div className={styles['mobile-menu-item']} onClick={() => setActiveSection('2fa')}>
                                            <div className={styles['mobile-menu-item-left']}>
                                                <span className={styles['mobile-menu-text']}>Autenticación en Dos Pasos</span>
                                            </div>
                                            <span className={styles['mobile-menu-arrow']}>›</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Settings Section */}
                                <div className={styles['mobile-menu-section']}>
                                    <h3 className={styles['mobile-section-label']}>Ajustes</h3>
                                    <div className={styles['mobile-menu-list']}>
                                        <div className={styles['mobile-menu-item']} onClick={() => setActiveSection('timezone')}>
                                            <div className={styles['mobile-menu-item-left']}>
                                                <span className={styles['mobile-menu-text']}>Zona Horaria</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{timezone}</span>
                                                <span className={styles['mobile-menu-arrow']}>›</span>
                                            </div>
                                        </div>
                                        <div className={styles['mobile-menu-item']} onClick={() => setActiveSection('notificaciones')}>
                                            <div className={styles['mobile-menu-item-left']}>
                                                <span className={styles['mobile-menu-text']}>Notificaciones</span>
                                            </div>
                                            <span className={styles['mobile-menu-arrow']}>›</span>
                                        </div>
                                        <div className={styles['mobile-menu-item']} onClick={() => setActiveSection('apariencia')}>
                                            <div className={styles['mobile-menu-item-left']}>
                                                <span className={styles['mobile-menu-text']}>Apariencia</span>
                                            </div>
                                            <span className={styles['mobile-menu-arrow']}>›</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Logout Button */}
                                <div className={styles['mobile-logout-btn-container']}>
                                    <button onClick={handleLogout} className={styles['mobile-logout-full-btn']}>
                                        Cerrar Sesión
                                    </button>
                                </div>
                            </>
                        )}
                    </>
                )}

            </main>

            {isOwnProfile && <MobileNavbar />}
        </div>
    );
};

export default ProfileMobile;
