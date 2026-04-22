import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getPublicProfile } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import styles from '../styles/UserProfile.module.css';

const UserProfileDesktop = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { timezone } = useSettings();
    const [profileData, setProfileData] = useState(null);
    const { user: currentUser } = useAuth();  // current logged-in user from global context
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const pData = await getPublicProfile(userId);
                setProfileData(pData);
            } catch (error) {
                console.error('Failed to load user profile:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [userId]);

    if (loading) {
        return (
            <div className={styles.loading}>
                Cargando perfil de usuario...
            </div>
        );
    }

    if (!profileData) {
        return (
            <div className={styles['not-found']}>
                Usuario no encontrado.
            </div>
        );
    }

    const { user, holdings, totalHoldingsValue } = profileData;

    return (
        <div className={styles.container}>

            <Navbar />

            {/* Main Content */}
            <main className={styles['main-content']}>
                <header className={styles.header}>
                    <button onClick={() => navigate(-1)} className={styles['back-btn']}>
                        ←
                    </button>
                    <div className={styles['header-text']}>
                        <h1 className={styles.title}>Perfil de {user.username}</h1>
                        <p className={styles.subtitle}>Información pública del usuario</p>
                    </div>
                </header>

                <div className={styles['content-grid']} style={{ gridTemplateColumns: '1fr' }}>

                    {/* User Info Card */}
                    <div className={`${styles['profile-card']} glass-panel`} style={{ maxWidth: '600px', margin: '0 auto' }}>
                        <div className={styles['user-avatar']}>
                            {user?.avatar_url ? (
                                <img src={user.avatar_url} alt="Avatar" className={styles['avatar-img']} />
                            ) : (
                                user?.username?.charAt(0).toUpperCase() || 'U'
                            )}
                        </div>
                        <h2 className={styles['profile-name']}>{user.username}</h2>
                        <p className={styles['join-date']} style={{ fontSize: '1.1rem', marginTop: '1rem' }}>
                            Miembro desde {new Date(user.created_at).toLocaleDateString('es-ES', { 
                                day: '2-digit', month: 'long', year: 'numeric',
                                timeZone: timezone
                            })}
                        </p>
                        <div className={styles['stats-box']} style={{ marginTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem' }}>
                            <p className={styles['stats-label']}>ID de Usuario</p>
                            <p className={styles['stats-value']} style={{ fontSize: '1.5rem' }}>#{user.id}</p>
                        </div>
                    </div>

                </div>
            </main>

        </div>
    );
};

export default UserProfileDesktop;
