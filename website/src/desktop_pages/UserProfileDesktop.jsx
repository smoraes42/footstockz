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
            <div className={styles.notFound}>
                Usuario no encontrado.
            </div>
        );
    }

    const { user, holdings, totalHoldingsValue } = profileData;

    return (
        <div className={styles.container}>

            <Navbar />

            {/* Main Content */}
            <main className={styles.mainContent}>
                <header className={styles.header}>
                    <button onClick={() => navigate(-1)} className={styles.backBtn}>
                        ←
                    </button>
                    <div className={styles.headerText}>
                        <h1 className={styles.title}>Perfil de {user.username}</h1>
                        <p className={styles.subtitle}>Revisa la cartera de este usuario</p>
                    </div>
                </header>

                <div className={styles.contentGrid}>

                    {/* User Info Card */}
                    <div className={`${styles.profileCard} glass-panel`}>
                        <div className={styles.userAvatar}>
                            {user?.avatar_url ? (
                                <img src={user.avatar_url} alt="Avatar" className={styles.avatarImg} />
                            ) : (
                                user?.username?.charAt(0).toUpperCase() || 'U'
                            )}
                        </div>
                        <h2 className={styles.profileName}>{user.username}</h2>
                        <div className={styles.statsBox}>
                            <p className={styles.statsLabel}>Valor en Acciones</p>
                            <p className={styles.statsValue}>{totalHoldingsValue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
                        </div>
                        <p className={styles.joinDate}>
                            Miembro desde {new Date(user.created_at).toLocaleDateString()}
                        </p>
                    </div>

                    {/* Holdings Table */}
                    <div className={styles.tableSection}>
                        <h3 className={styles.tableTitle}>Portafolio de Activos</h3>
                        <div className={`${styles.tableContainer} glass-panel`}>
                            <table className={styles.table}>
                                <thead>
                                    <tr className={styles.tableHead}>
                                        <th className={styles.tableHeadCell}>Jugador</th>
                                        <th className={styles.tableHeadCell}>Acciones</th>
                                        <th className={styles.tableHeadCell}>Precio</th>
                                        <th className={styles.tableHeadCell}>Valor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {holdings.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className={styles.emptyState}>
                                                Este usuario no tiene acciones actualmente.
                                            </td>
                                        </tr>
                                    ) : (
                                        holdings.map((h, i) => (
                                            <tr
                                                key={i}
                                                className={styles.tableRow}
                                                onClick={() => navigate(`/market/player/${h.player_id}`)}
                                            >
                                                <td className={`${styles.tableCell} ${styles.tableCellBold}`}>{h.player_name}</td>
                                                <td className={styles.tableCell}>{h.shares_owned.toLocaleString()}</td>
                                                <td className={styles.tableCell}>{h.current_price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
                                                <td className={`${styles.tableCell} ${styles.tableCellBold} ${styles.accentValue}`}>{h.position_value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</td>
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
