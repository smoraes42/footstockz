import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import fsLogo from '../assets/fs-logo.png';
import { getPortfolio, getUserTradeHistory } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';


const formatCompactNumber = (number) => {
    if (number >= 1000000) {
        return (number / 1000000).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'M €';
    }
    if (number >= 1000) {
        return (number / 1000).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'K €';
    }
    return number.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
};

const PortfolioDesktop = () => {
    const navigate = useNavigate();
    const [portfolio, setPortfolio] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('players'); // 'players' | 'teams'
    const [tradeHistory, setTradeHistory] = useState([]);
    const [loadingTrades, setLoadingTrades] = useState(true);
    const [showActivity, setShowActivity] = useState(true);
    const { socket, connected, subscribeToUser, unsubscribeFromUser } = useSocket();
    const { user } = useAuth();


    const [sortConfig, setSortConfig] = useState({ key: 'player_name', direction: 'asc' });

    const fetchPortfolioData = async () => {
        try {
            const data = await getPortfolio();
            setPortfolio(data);
        } catch (error) {
            console.error('Failed to load portfolio:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTradeHistory = async () => {
        try {
            const data = await getUserTradeHistory();
            setTradeHistory(data);
        } catch (error) {
            console.error('Failed to load trade history:', error);
        } finally {
            setLoadingTrades(false);
        }
    };

    useEffect(() => {
        fetchPortfolioData();
        fetchTradeHistory();
    }, []);

    // WebSocket Listeners
    useEffect(() => {
        if (!socket || !connected) return;

        const handlePriceUpdate = (data) => {
            setPortfolio(prev => {
                if (!prev) return prev;
                const k = 0.0001; // CONFIG.PRICE_IMPACT_FACTOR
                const updatedHoldings = (prev.holdings || []).map(h => {
                    if (h.player_id === data.playerId) {
                        const newPrice = data.price;
                        if (h.type === 'team') {
                            const newValue = h.shares_owned * newPrice;
                            return { ...h, current_price: newPrice, position_value: newValue };
                        } else {
                            const shares = parseFloat(h.shares_owned) || 0;
                            // AMM liquidation value
                            const newValue = (newPrice / k) * (1 - Math.exp(-k * shares));
                            return { ...h, current_price: newPrice, position_value: newValue };
                        }
                    }
                    return h;
                });
                return { ...prev, holdings: updatedHoldings };
            });
        };

        const handlePortfolioUpdate = () => {
            // Re-fetch everything to ensure consistency after a buy/sell
            fetchPortfolioData();
        };

        socket.on('price_update', handlePriceUpdate);
        socket.on('portfolio_update', handlePortfolioUpdate);

        return () => {
            socket.off('price_update', handlePriceUpdate);
            socket.off('portfolio_update', handlePortfolioUpdate);
        };
    }, [socket, connected]);




    useEffect(() => {
        if (user && user.id) {
            subscribeToUser(user.id);
            return () => unsubscribeFromUser(user.id);
        }
    }, [user, subscribeToUser, unsubscribeFromUser]);

    const walletBalance = portfolio ? portfolio.walletBalance : 0;
    const holdings = portfolio ? portfolio.holdings || [] : [];
    const openOrders = portfolio ? portfolio.openOrders || [] : [];

    const holdingsValue = holdings.reduce((acc, h) => acc + h.position_value, 0);
    const totalEquity = walletBalance + holdingsValue;

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedHoldings = [...holdings].sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
            return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
            return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    const getSortIndicator = (key) => {
        if (sortConfig.key !== key) return '↕';
        return sortConfig.direction === 'asc' ? '↑' : '↓';
    };

    return (
        <div style={{ backgroundColor: 'var(--bg-main)', height: '100vh', width: '100%', display: 'flex' }}>

            {/* Sidebar Left */}
            <aside style={{
                width: '250px',
                backgroundColor: 'rgba(28,28,28,0.7)',
                borderRight: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                flexDirection: 'column',
                padding: '2rem 1.5rem',
                position: 'fixed',
                height: '100vh',
                top: 0,
                left: 0
            }}>
                <div style={{ marginBottom: '3rem', paddingLeft: '0.5rem' }}>
                    <img src={fsLogo} alt="Futstocks Logo" style={{ height: '32px' }} />
                </div>

                <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                    <Link to="/home" className="sidebar-link" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '12px 16px', borderRadius: '8px', color: 'var(--text-muted)', textDecoration: 'none', transition: 'all 0.2s' }}>
                        <span style={{ fontWeight: '500' }}>Inicio</span>
                    </Link>
                    <Link to="/portfolio" className="sidebar-link active" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '12px 16px', borderRadius: '8px', color: 'var(--text-main)', textDecoration: 'none', backgroundColor: 'rgba(57,255,20,0.1)', borderLeft: '3px solid var(--accent-neon)' }}>
                        <span style={{ fontWeight: '600' }}>Portfolio</span>
                    </Link>
                    <Link to="/market" className="sidebar-link" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '12px 16px', borderRadius: '8px', color: 'var(--text-muted)', textDecoration: 'none', transition: 'all 0.2s' }}>
                        <span style={{ fontWeight: '500' }}>Mercado</span>
                    </Link>
                    <Link to="/leaderboard" className="sidebar-link" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '12px 16px', borderRadius: '8px', color: 'var(--text-muted)', textDecoration: 'none', transition: 'all 0.2s' }}>
                        <span style={{ fontWeight: '500' }}>Leaderboard</span>
                    </Link>
                </nav>

                <div
                    onClick={() => navigate('/profile')}
                    style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--surface-lighter)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>
                            {user?.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                            <p style={{ fontSize: '0.9rem', fontWeight: '600', margin: 0 }}>{user?.username || 'Usuario'}</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Ver perfil</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main style={{ marginLeft: '250px', flex: 1, padding: '2rem 3rem', overflowY: 'auto', height: '100vh' }}>



                {/* Global Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>

                    <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
                        <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: '500' }}>Capital Total</h3>
                        <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '0' }}>
                            {loading ? '---' : totalEquity.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </p>
                    </div>

                    <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
                        <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: '500' }}>Poder de Compra (Cash)</h3>
                        <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '0', color: 'var(--accent-neon)' }}>
                            {loading ? '---' : walletBalance.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </p>
                    </div>

                    <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
                        <h3 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: '500' }}>Invertido</h3>
                        <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '0' }}>
                            {loading ? '---' : holdingsValue.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                        </p>
                    </div>


                </div>

                {/* Tab Selection Toggle */}
                <div style={{ display: 'flex', backgroundColor: 'var(--surface-dark)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', width: 'fit-content', marginBottom: '2.5rem' }}>
                    <button
                        onClick={() => setActiveTab('players')}
                        style={{
                            padding: '8px 20px',
                            border: 'none',
                            background: activeTab === 'players' ? 'var(--bg-main)' : 'transparent',
                            color: activeTab === 'players' ? 'var(--text-main)' : 'var(--text-muted)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '0.9rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            transition: 'all 0.2s'
                        }}
                    >
                        Jugadores
                    </button>
                    <button
                        onClick={() => setActiveTab('teams')}
                        style={{
                            padding: '8px 20px',
                            border: 'none',
                            background: activeTab === 'teams' ? 'var(--bg-main)' : 'transparent',
                            color: activeTab === 'teams' ? 'var(--text-main)' : 'var(--text-muted)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '0.9rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            transition: 'all 0.2s'
                        }}
                    >
                        Índices
                    </button>
                </div>

                {/* Tab Content */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Cargando portfolio...</div>
                ) : (
                    <div>
                        <div className="glass-panel" style={{ borderRadius: '12px', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <th 
                                            style={{ padding: '1.5rem', color: 'var(--text-muted)', fontWeight: '500', cursor: 'pointer' }}
                                            onClick={() => requestSort('player_name')}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {activeTab === 'teams' ? 'Equipo (Índice)' : 'Jugador'}
                                                <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>{getSortIndicator('player_name')}</span>
                                            </div>

                                        </th>
                                        <th 
                                            style={{ padding: '1.5rem', color: 'var(--text-muted)', fontWeight: '500', cursor: 'pointer' }}
                                            onClick={() => requestSort('shares_owned')}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                Acciones
                                                <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>{getSortIndicator('shares_owned')}</span>
                                            </div>
                                        </th>
                                        <th 
                                            style={{ padding: '1.5rem', color: 'var(--text-muted)', fontWeight: '500', cursor: 'pointer' }}
                                            onClick={() => requestSort('current_price')}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                Precio
                                                <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>{getSortIndicator('current_price')}</span>
                                            </div>
                                        </th>
                                        <th 
                                            style={{ padding: '1.5rem', color: 'var(--text-muted)', fontWeight: '500', cursor: 'pointer' }}
                                            onClick={() => requestSort('position_value')}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                Valor Total
                                                <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>{getSortIndicator('position_value')}</span>
                                            </div>
                                        </th>
                                        <th 
                                            style={{ padding: '1.5rem', color: 'var(--text-muted)', fontWeight: '500', cursor: 'pointer' }}
                                            onClick={() => requestSort('variation_24h')}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                Variación (24h)
                                                <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>{getSortIndicator('variation_24h')}</span>
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        let displayData = sortedHoldings.filter(h => {
                                            if (activeTab === 'teams') return h.type === 'team';
                                            return h.type !== 'team';
                                        });

                                        if (displayData.length === 0) {
                                            return (
                                                <tr>
                                                    <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                        No tienes inversiones en este mercado. ¡Explora!
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return displayData.map((position, idx) => (
                                            <tr
                                                key={idx}
                                                style={{
                                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                    cursor: 'pointer',
                                                    transition: 'background-color 0.2s'
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                                onClick={() => {
                                                    if (position.type === 'team') {
                                                        navigate(`/market/team/${position.team_id}`);
                                                    } else {
                                                        navigate(`/market/player/${position.player_id}`);
                                                    }
                                                }}
                                            >
                                                <td style={{ padding: '1.5rem', fontWeight: 'bold' }}>
                                                    {position.type === 'team' ? `🏟️ ${position.player_name}` : position.player_name}
                                                </td>

                                                <td style={{ padding: '1.5rem' }}>
                                                    {position.type === 'team' ? `${parseFloat(position.shares_owned).toFixed(4)} Shares` : position.shares_owned.toLocaleString()}
                                                </td>

                                                <td style={{ padding: '1.5rem' }}>
                                                    {`${position.current_price.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`}
                                                </td>
                                                <td style={{ padding: '1.5rem', fontWeight: 'bold' }}>
                                                    {position.position_value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                                </td>
                                                <td style={{ padding: '1.5rem', fontWeight: 'bold', color: position.variation_24h >= 0 ? 'var(--accent-neon)' : 'var(--error-red)' }}>
                                                    {position.variation_24h >= 0 ? '+' : ''}{position.variation_24h.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                                                </td>
                                            </tr>
                                        ));
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Recent Activity Section */}
                <div style={{ marginTop: '4rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>Actividad Reciente</h2>
                        <button 
                            onClick={() => setShowActivity(!showActivity)}
                            style={{
                                background: 'var(--surface-dark)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'var(--text-main)',
                                padding: '6px 12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            {showActivity ? 'Ocultar' : 'Mostrar'}
                            <span style={{ transition: 'transform 0.3s', transform: showActivity ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                        </button>
                    </div>

                    {showActivity && (
                        <div className="glass-panel" style={{ borderRadius: '12px', overflow: 'hidden' }}>
                            {loadingTrades ? (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando actividad...</div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>Activo</th>
                                            <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>Tipo</th>
                                            <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>Cantidad</th>
                                            <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>Valor Total</th>
                                            <th style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontWeight: '500' }}>Fecha</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tradeHistory.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                                    No hay actividad reciente para mostrar.
                                                </td>
                                            </tr>
                                        ) : (
                                            tradeHistory.slice(0, 10).map((trade, idx) => (
                                                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <td style={{ padding: '1.2rem 1.5rem', fontWeight: '600' }}>
                                                        {trade.player_name || 'Desconocido'}
                                                    </td>
                                                    <td style={{ padding: '1.2rem 1.5rem' }}>
                                                        <span style={{ 
                                                            padding: '4px 10px', 
                                                            borderRadius: '4px', 
                                                            fontSize: '0.8rem', 
                                                            fontWeight: 'bold',
                                                            backgroundColor: trade.side === 'buy' ? 'rgba(57,255,20,0.1)' : 'rgba(255,77,77,0.1)',
                                                            color: trade.side === 'buy' ? 'var(--accent-neon)' : 'var(--error-red)'
                                                        }}>
                                                            {trade.side === 'buy' ? 'COMPRA' : 'VENTA'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1.2rem 1.5rem' }}>
                                                        {parseFloat(trade.quantity).toFixed(4)}
                                                    </td>
                                                    <td style={{ padding: '1.2rem 1.5rem', fontWeight: 'bold' }}>
                                                        {parseFloat(trade.total_value).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                                                    </td>
                                                    <td style={{ padding: '1.2rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                                        {new Date(trade.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
};

export default PortfolioDesktop;
