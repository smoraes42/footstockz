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

                <div className={styles['content-grid']}>
                    {/* Left Column: User Info Card */}
                    <div className={styles['profile-sidebar']}>
                        <div className={`${styles['profile-card']} glass-panel`}>
                            <div className={styles['user-avatar']}>
                                {user?.avatar_url ? (
                                    <img src={user.avatar_url} alt="Avatar" className={styles['avatar-img']} />
                                ) : (
                                    user?.username?.charAt(0).toUpperCase() || 'U'
                                )}
                            </div>
                            <h2 className={styles['profile-name']}>{user.username}</h2>
                            <p className={styles['join-date']}>
                                Miembro desde {new Date(user.created_at).toLocaleDateString('es-ES', { 
                                    day: '2-digit', month: 'long', year: 'numeric',
                                    timeZone: timezone
                                })}
                            </p>
                            <div className={styles['stats-box']}>
                                <p className={styles['stats-label']}>ID de Usuario</p>
                                <p className={styles['stats-value']}>#{user.id}</p>
                            </div>
                            <div className={styles['stats-box']} style={{ marginTop: '1.5rem' }}>
                                <p className={styles['stats-label']}>Valor Total de Acciones</p>
                                <p className={styles['stats-value']}>
                                    {Number(totalHoldingsValue || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Holdings Table */}
                    <div className={styles['table-section']}>
                        <h3 className={styles['table-title']}>Portafolio Público</h3>
                        <div className={`${styles['table-container']} glass-panel`}>
                            {holdings && holdings.length > 0 ? (
                                <table className={styles.table}>
                                    <thead className={styles['table-head']}>
                                        <tr>
                                            <th className={styles['table-head-cell']}>Activo</th>
                                            <th className={styles['table-head-cell']}>Cantidad</th>
                                            <th className={styles['table-head-cell']}>Precio Actual</th>
                                            <th className={styles['table-head-cell']}>Valor</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {holdings.map((h, idx) => (
                                            <tr key={idx} className={styles['table-row']} onClick={() => {
                                                if (h.player_id) navigate(`/market/player/${h.player_id}`);
                                                else if (h.team_id) navigate(`/market/team/${h.team_id}`);
                                            }}>
                                                <td className={styles['table-cell']}>
                                                    <div className={styles['asset-cell']}>
                                                        <span className={styles['table-cell-bold']}>
                                                            {h.player_name || h.team_name}
                                                        </span>
                                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>
                                                            {h.player_id ? 'Jugador' : 'Equipo'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className={styles['table-cell']}>
                                                    {Number(h.shares_owned || h.proportion).toLocaleString('es-ES', { 
                                                        minimumFractionDigits: 0, 
                                                        maximumFractionDigits: 4 
                                                    })}
                                                </td>
                                                <td className={styles['table-cell']}>
                                                    {Number(h.current_price).toLocaleString('es-ES', { 
                                                        minimumFractionDigits: 2, 
                                                        maximumFractionDigits: 2 
                                                    })} €
                                                </td>
                                                <td className={`${styles['table-cell']} ${styles['accent-value']} ${styles['table-cell-bold']}`}>
                                                    {Number(h.value).toLocaleString('es-ES', { 
                                                        minimumFractionDigits: 2, 
                                                        maximumFractionDigits: 2 
                                                    })} €
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className={styles['empty-state']}>
                                    Este usuario no posee acciones actualmente.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

        </div>
    );
};

export default UserProfileDesktop;
