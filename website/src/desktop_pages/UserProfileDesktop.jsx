import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getPublicProfile } from '../services/api';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/UserProfile.module.css';

const UserProfileDesktop = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
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
                        <p className={styles.subtitle}>Revisa la cartera de este usuario</p>
                    </div>
                </header>

                <div className={styles['content-grid']}>

                    {/* User Info Card */}
                    <div className={`${styles['profile-card']} glass-panel`}>
                        <div className={styles['user-avatar']}>
                            {user?.avatar_url ? (
                                <img src={user.avatar_url} alt="Avatar" className={styles['avatar-img']} />
                            ) : (
                                user?.username?.charAt(0).toUpperCase() || 'U'
                            )}
                        </div>
                        <h2 className={styles['profile-name']}>{user.username}</h2>
                        <div className={styles['stats-box']}>
                            <p className={styles['stats-label']}>Valor en Acciones</p>
                            <p className={styles['stats-value']}>{totalHoldingsValue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
                        </div>
                        <p className={styles['join-date']}>
                            Miembro desde {new Date(user.created_at).toLocaleDateString()}
                        </p>
                    </div>

                    {/* Holdings Table */}
                    <div className={styles['table-section']}>
                        <h3 className={styles['table-title']}>Portafolio de Activos</h3>
                        <div className={`${styles['table-container']} glass-panel`}>
                            <table className={styles.table}>
                                <thead>
                                    <tr className={styles['table-head']}>
                                        <th className={styles['table-head-cell']}>Jugador</th>
                                        <th className={styles['table-head-cell']}>Acciones</th>
                                        <th className={styles['table-head-cell']}>Precio</th>
                                        <th className={styles['table-head-cell']}>Valor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {holdings.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className={styles['empty-state']}>
                                                Este usuario no tiene acciones actualmente.
                                            </td>
                                        </tr>
                                    ) : (
                                        holdings.map((h, i) => (
                                            <tr
                                                key={i}
                                                className={styles['table-row']}
                                                onClick={() => navigate(`/market/player/${h.player_id}`)}
                                            >
                                                <td className={`${styles['table-cell']} ${styles['table-cell-bold']}`}>{h.player_name}</td>
                                                <td className={styles['table-cell']}>{h.shares_owned.toLocaleString()}</td>
                                                <td className={styles['table-cell']}>{h.current_price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                                                <td className={`${styles['table-cell']} ${styles['table-cell-bold']} ${styles['accent-value']}`}>{h.position_value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </main>

        </div>
    );
};

export default UserProfileDesktop;
