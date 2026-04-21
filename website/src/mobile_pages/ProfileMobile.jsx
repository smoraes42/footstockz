import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getMe, getPublicProfile } from '../services/api';
import MobileHeader from '../components/MobileHeader';
import MobileNavbar from '../components/MobileNavbar';
import styles from '../styles/Profile.module.css';

const ProfileMobile = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const isOwnProfile = !userId;
    
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                if (isOwnProfile) {
                    const userData = await getMe();
                    setUser(userData);
                } else {
                    const pData = await getPublicProfile(userId);
                    setUser(pData.user);
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

    if (loading) return <div className={styles['loading-container']}>Cargando...</div>;

    return (
        <div className={styles['mobile-container']}>
            
            <MobileHeader 
                showLogo={true}
                onBack={!isOwnProfile ? () => navigate(-1) : null}
            />

            <main className={styles['mobile-main']}>
                
                {/* User Info Card */}
                <div className={`${styles['mobile-profile-card']} glass-panel`}>
                    <div className={styles['mobile-avatar']}>
                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className={styles['mobile-user-details']}>
                        <h2 className={styles['mobile-user-name']}>{user?.username}</h2>
                        <span className={styles['mobile-user-id']}>#{user?.id}</span>
                    </div>
                </div>

                {isOwnProfile && (
                    <>
                        {/* Demo/Real Switch */}
                        <div className={styles['mobile-mode-switch-container']}>
                            <div className={styles['mobile-mode-switch']}>
                                <button className={`${styles['mobile-mode-btn']} ${styles['mobile-mode-btn-active']}`}>
                                    DEMO
                                </button>
                                <button className={styles['mobile-mode-btn']} disabled>
                                    REAL
                                    <span className={styles['mobile-coming-soon']}>Próximamente</span>
                                </button>
                                <div className={styles['mobile-mode-slider']}></div>
                            </div>
                        </div>

                        {/* Referral / Level Card */}
                        <div className={`${styles['mobile-referral-card']} glass-panel`}>
                            <div className={styles['mobile-card-header']}>
                                <span className={styles['mobile-card-title']}>Programa de Referidos</span>
                                <span className={styles['mobile-level-badge']}>Nivel 1</span>
                            </div>
                            <div className={styles['mobile-exp-container']}>
                                <div className={styles['mobile-exp-bar']}>
                                    <div className={styles['mobile-exp-fill']} style={{ width: '35%' }}></div>
                                </div>
                                <div className={styles['mobile-exp-text']}>
                                    <span>350 / 1000 EXP</span>
                                    <span>Próximo Nivel: Bronce</span>
                                </div>
                            </div>
                        </div>

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
                                <div className={styles['mobile-menu-item']}>
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
                                <div className={styles['mobile-menu-item']}>
                                    <div className={styles['mobile-menu-item-left']}>
                                        <span className={styles['mobile-menu-text']}>Cambiar Contraseña</span>
                                    </div>
                                    <span className={styles['mobile-menu-arrow']}>›</span>
                                </div>
                                <div className={styles['mobile-menu-item']}>
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
                                <div className={styles['mobile-menu-item']}>
                                    <div className={styles['mobile-menu-item-left']}>
                                        <span className={styles['mobile-menu-text']}>Idioma y Moneda</span>
                                    </div>
                                    <span className={styles['mobile-menu-arrow']}>›</span>
                                </div>
                                <div className={styles['mobile-menu-item']}>
                                    <div className={styles['mobile-menu-item-left']}>
                                        <span className={styles['mobile-menu-text']}>Notificaciones</span>
                                    </div>
                                    <span className={styles['mobile-menu-arrow']}>›</span>
                                </div>
                                <div className={styles['mobile-menu-item']}>
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

            </main>

            {isOwnProfile && <MobileNavbar />}
        </div>
    );
};

export default ProfileMobile;
