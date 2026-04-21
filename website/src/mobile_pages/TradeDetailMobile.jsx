import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTradeById, getPlayerImageUrl } from '../services/api';
import MobileHeader from '../components/MobileHeader';
import MobileNavbar from '../components/MobileNavbar';
import styles from '../styles/TradeDetail.module.css';

const TradeDetailMobile = () => {
    const { tradeId } = useParams();
    const navigate = useNavigate();
    const [trade, setTrade] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchTrade = async () => {
            try {
                const data = await getTradeById(tradeId);
                setTrade(data);
            } catch (err) {
                console.error('Failed to fetch trade details:', err);
                setError('No se pudo cargar la operación.');
            } finally {
                setLoading(false);
            }
        };
        fetchTrade();
    }, [tradeId]);

    if (loading) {
        return (
            <div className={styles['mobile-container']}>
                <MobileHeader showLogo={true} onBack={() => navigate(-1)} />
                <div className={styles['mobile-loading']}>Cargando...</div>
                <MobileNavbar />
            </div>
        );
    }

    if (error || !trade) {
        return (
            <div className={styles['mobile-container']}>
                <MobileHeader showLogo={true} onBack={() => navigate(-1)} />
                <div className={styles['mobile-error']}>
                    <p>{error || 'Operación no encontrada'}</p>
                    <button onClick={() => navigate('/portfolio')} className={styles['mobile-back-btn']}>Volver</button>
                </div>
                <MobileNavbar />
            </div>
        );
    }

    return (
        <div className={styles['mobile-container']}>
            <MobileHeader 
                showLogo={true} 
                onBack={() => navigate(-1)}
            />

            <main className={styles['mobile-main']}>
                <div className={styles['mobile-detail-header']}>
                    <h1 className={styles['mobile-title']}>Detalle de Operación</h1>
                    <span className={styles['mobile-trade-id']}>#{trade.id}</span>
                </div>

                <div className={`glass-panel ${styles['mobile-asset-card']}`}>
                    <div className={styles['mobile-asset-row']}>
                        <div className={styles['mobile-asset-preview']}>
                            {trade.type === 'team' ? (
                                <div className={styles['mobile-team-icon']}>🏟️</div>
                            ) : (
                                <img 
                                    src={getPlayerImageUrl(trade.player_id)} 
                                    alt={trade.player_name} 
                                    className={styles['mobile-player-img']}
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                            )}
                        </div>
                        <div className={styles['mobile-asset-info']}>
                            <h2 className={styles['mobile-asset-name']}>{trade.player_name}</h2>
                            <p className={styles['mobile-asset-type']}>{trade.type === 'team' ? 'Índice de Equipo' : 'Jugador'}</p>
                        </div>
                    </div>
                </div>

                <div className={`glass-panel ${styles['mobile-stats-card']}`}>
                    <div className={styles['mobile-stat-row']}>
                        <span className={styles['mobile-stat-label']}>Tipo</span>
                        <span className={`${styles['mobile-stat-value']} ${trade.side === 'buy' ? styles['buy-text'] : styles['sell-text']}`}>
                            {trade.side === 'buy' ? 'COMPRA' : 'VENTA'}
                        </span>
                    </div>
                    <div className={styles['mobile-stat-row']}>
                        <span className={styles['mobile-stat-label']}>Cantidad</span>
                        <span className={styles['mobile-stat-value']}>{parseFloat(trade.quantity).toFixed(4)}</span>
                    </div>
                    <div className={styles['mobile-stat-row']}>
                        <span className={styles['mobile-stat-label']}>Precio Unitario</span>
                        <span className={styles['mobile-stat-value']}>{parseFloat(trade.price).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
                    </div>
                    <div className={styles['mobile-divider']}></div>
                    <div className={styles['mobile-stat-row']}>
                        <span className={styles['mobile-stat-label-total']}>Total</span>
                        <span className={styles['mobile-stat-value-total']}>
                            {parseFloat(trade.total_value).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                        </span>
                    </div>
                </div>

                <div className={`glass-panel ${styles['mobile-time-card']}`}>
                    <div className={styles['mobile-stat-row']}>
                        <span className={styles['mobile-stat-label']}>Fecha</span>
                        <span className={styles['mobile-stat-value']}>
                            {new Date(trade.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                    </div>
                    <div className={styles['mobile-stat-row']}>
                        <span className={styles['mobile-stat-label']}>Hora</span>
                        <span className={styles['mobile-stat-value']}>
                            {new Date(trade.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                    <div className={styles['mobile-stat-row']}>
                        <span className={styles['mobile-stat-label']}>Estado</span>
                        <span className={styles['mobile-status-badge']}>COMPLETADO</span>
                    </div>
                </div>
            </main>

            <MobileNavbar />
        </div>
    );
};

export default TradeDetailMobile;
