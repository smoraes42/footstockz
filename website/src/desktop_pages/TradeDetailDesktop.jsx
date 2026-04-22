import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTradeById, getPlayerImageUrl } from '../services/api';
import Navbar from '../components/Navbar';
import { useSettings } from '../context/SettingsContext';
import styles from '../styles/TradeDetail.module.css';

const TradeDetailDesktop = () => {
    const { tradeId } = useParams();
    const navigate = useNavigate();
    const { timezone } = useSettings();
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
                setError('No se pudo cargar la información de la operación.');
            } finally {
                setLoading(false);
            }
        };
        fetchTrade();
    }, [tradeId]);

    if (loading) {
        return (
            <div className={styles['container']}>
                <Navbar />
                <main className={styles['main-content']}>
                    <div className={styles['loading-state']}>Cargando detalles de la operación...</div>
                </main>
            </div>
        );
    }

    if (error || !trade) {
        return (
            <div className={styles['container']}>
                <Navbar />
                <main className={styles['main-content']}>
                    <div className={styles['error-state']}>
                        <p>{error || 'Operación no encontrada'}</p>
                        <button onClick={() => navigate('/portfolio')} className={styles['back-btn']}>Volver al Portfolio</button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className={styles['container']}>
            <Navbar />
            <main className={styles['main-content']}>
                <header className={styles['header']}>
                    <button onClick={() => navigate(-1)} className={styles['back-link']}>
                        ← Volver
                    </button>
                    <h1 className={styles['title']}>Detalle de Operación</h1>
                    <p className={styles['subtitle']}>ID: #{trade.id}</p>
                </header>

                <div className={styles['detail-grid']}>
                    <div className={`glass-panel ${styles['info-card']}`}>
                        <div className={styles['asset-preview']}>
                            {trade.type === 'team' ? (
                                <div className={styles['team-icon']}>🏟️</div>
                            ) : (
                                <img 
                                    src={getPlayerImageUrl(trade.player_id)} 
                                    alt={trade.player_name} 
                                    className={styles['player-img']}
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                />
                            )}
                            <div className={styles['asset-names']}>
                                <h2 className={styles['asset-name']}>{trade.player_name}</h2>
                                <p className={styles['asset-type']}>{trade.type === 'team' ? 'Índice de Equipo' : 'Jugador'}</p>
                            </div>
                        </div>

                        <div className={styles['stats-grid']}>
                            <div className={styles['stat-item']}>
                                <span className={styles['stat-label']}>Tipo</span>
                                <span className={`${styles['stat-value']} ${trade.side === 'buy' ? styles['buy-text'] : styles['sell-text']}`}>
                                    {trade.side === 'buy' ? 'COMPRA' : 'VENTA'}
                                </span>
                            </div>
                            <div className={styles['stat-item']}>
                                <span className={styles['stat-label']}>Fecha y Hora</span>
                                <span className={styles['stat-value']}>
                                    {new Date(trade.created_at).toLocaleString('es-ES', { 
                                        day: '2-digit', month: 'long', year: 'numeric',
                                        hour: '2-digit', minute: '2-digit', second: '2-digit',
                                        timeZone: timezone,
                                        hour12: false
                                    })}
                                </span>
                            </div>
                            <div className={styles['stat-item']}>
                                <span className={styles['stat-label']}>Cantidad</span>
                                <span className={styles['stat-value']}>{parseFloat(trade.quantity).toFixed(4)} unidades</span>
                            </div>
                            <div className={styles['stat-item']}>
                                <span className={styles['stat-label']}>Precio de ejecución</span>
                                <span className={styles['stat-value']}>{parseFloat(trade.price).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</span>
                            </div>
                            <div className={styles['stat-divider']}></div>
                            <div className={styles['stat-item']}>
                                <span className={styles['stat-label']}>Total de la operación</span>
                                <span className={`${styles['stat-value']} ${styles['total-value']}`}>
                                    {parseFloat(trade.total_value).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className={`glass-panel ${styles['blockchain-card']}`}>
                        <h3 className={styles['card-title']}>Información del Sistema</h3>
                        <div className={styles['system-info']}>
                            <div className={styles['info-row']}>
                                <span>Estado</span>
                                <span className={styles['status-badge']}>COMPLETADO</span>
                            </div>
                            <div className={styles['info-row']}>
                                <span>Red</span>
                                <span>Footstockz Mainnet</span>
                            </div>
                            <div className={styles['info-row']}>
                                <span>Comisión</span>
                                <span>0.00 €</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TradeDetailDesktop;
