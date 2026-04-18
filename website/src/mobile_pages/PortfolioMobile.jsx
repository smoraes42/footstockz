import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import fsLogo from '../assets/fs-logo.png';
import { getPortfolio, getMe, getUserTradeHistory } from '../services/api';

const formatCompactNumber = (number) => {
    if (number >= 1000000) {
        return (number / 1000000).toFixed(1) + 'M';
    }
    if (number >= 1000) {
        return (number / 1000).toFixed(1) + 'K';
    }
    return Number(number).toFixed(2);
};

const PortfolioMobile = () => {
    const [portfolio, setPortfolio] = useState(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('players');
    const [tradeHistory, setTradeHistory] = useState([]);
    const [loadingTrades, setLoadingTrades] = useState(true);
    const [showActivity, setShowActivity] = useState(true);

    const [sortConfig, setSortConfig] = useState({ key: 'player_name', direction: 'asc' });

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key) => {
        if (sortConfig.key !== key) return '';
        return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [portData, userData, tradesData] = await Promise.all([
                    getPortfolio(),
                    getMe(),
                    getUserTradeHistory()
                ]);
                setPortfolio(portData);
                setUser(userData);
                setTradeHistory(tradesData);
            } catch (error) {
                console.error('Failed to load portfolio:', error);
            } finally {
                setLoading(false);
                setLoadingTrades(false);
            }
        };
        fetchData();
    }, []);

    const walletBalance = portfolio ? portfolio.walletBalance : 0;
    const rawHoldings = portfolio ? portfolio.holdings || [] : [];
    const holdingsValue = rawHoldings.reduce((acc, h) => acc + h.position_value, 0);
    const totalEquity = walletBalance + holdingsValue;

    const holdings = [...rawHoldings].sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    return (
        <div style={{ backgroundColor: 'var(--bg-main)', height: '100dvh', overflow: 'hidden', width: '100%', display: 'flex', flexDirection: 'column' }}>
            
            {/* Top Header */}
            <header style={{
                padding: '0 1.5rem',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                backgroundColor: 'rgba(16,16,16,0.9)',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                height: '60px',
                boxSizing: 'border-box'
            }}>
                <img src={fsLogo} alt="Futstocks Logo" style={{ height: '22px' }} />
                <div style={{ width: '22px' }} />
            </header>

            <main style={{ flex: 1, padding: '1.5rem', paddingBottom: '80px', overflowY: 'auto' }}>
                <h2 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--accent-neon)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1.5rem', marginTop: '0', textAlign: 'left' }}>Tu Portfolio</h2>

                {/* Equity Header */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Capital Total</span>
                    <span style={{ fontSize: '3.2rem', fontWeight: '900', letterSpacing: '-1.5px', lineHeight: 1 }}>
                        €{loading ? '---' : formatCompactNumber(totalEquity)}
                    </span>
                </div>

                {/* Wallet Breakdown Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2.5rem' }}>
                    <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', margin: '0 0 0.5rem 0' }}>Cash</p>
                        <p style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>€{loading ? '---' : formatCompactNumber(walletBalance)}</p>
                    </div>
                    <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', margin: '0 0 0.5rem 0' }}>Invertido</p>
                        <p style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>€{loading ? '---' : formatCompactNumber(holdingsValue)}</p>
                    </div>
                </div>
                {/* Tab Selection Toggle */}
                <div style={{ display: 'flex', backgroundColor: 'var(--surface-dark)', padding: '4px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '1.5rem', width: '100%' }}>
                    <button
                        onClick={() => setActiveTab('players')}
                        style={{ flex: 1, padding: '8px 0', border: 'none', background: activeTab === 'players' ? 'var(--bg-main)' : 'transparent', color: activeTab === 'players' ? 'var(--text-main)' : 'var(--text-muted)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                    >Jugadores</button>
                    <button
                        onClick={() => setActiveTab('teams')}
                        style={{ flex: 1, padding: '8px 0', border: 'none', background: activeTab === 'teams' ? 'var(--bg-main)' : 'transparent', color: activeTab === 'teams' ? 'var(--text-main)' : 'var(--text-muted)', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                    >Índices</button>
                </div>

                {/* Holdings List */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                            {activeTab === 'teams' ? 'Mis Índices' : 'Mis Jugadores'}
                        </h3>

                    </div>
                    
                    {/* Sorting Chips */}
                    {!loading && rawHoldings.length > 1 && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '5px' }}>
                            {[
                                { key: 'player_name', label: 'Nombre' },
                                { key: 'shares_owned', label: 'Acciones' },
                                { key: 'current_price', label: 'Precio' },
                                { key: 'position_value', label: 'Valor' }
                            ].map(chip => (
                                <button
                                    key={chip.key}
                                    onClick={() => requestSort(chip.key)}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '20px',
                                        backgroundColor: sortConfig.key === chip.key ? 'rgba(57,255,20,0.1)' : 'rgba(255,255,255,0.05)',
                                        color: sortConfig.key === chip.key ? 'var(--accent-neon)' : 'var(--text-muted)',
                                        border: sortConfig.key === chip.key ? '1px solid var(--accent-neon)' : '1px solid rgba(255,255,255,0.1)',
                                        fontSize: '0.75rem',
                                        fontWeight: '700',
                                        whiteSpace: 'nowrap',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {chip.label}{getSortIndicator(chip.key)}
                                </button>
                            ))}
                        </div>
                    )}
                    
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Cargando activos...</div>
                    ) : (() => {
                        const displayData = holdings.filter(h => {
                            if (activeTab === 'teams') return h.type === 'team';
                            return h.type !== 'team';
                        });


                        if (displayData.length === 0) {
                            return (
                                <div style={{ textAlign: 'center', padding: '3rem 1rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
                                        No tienes inversiones en este mercado.

                                    </p>
                                    <Link to="/market" style={{ color: 'var(--accent-neon)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '700', marginTop: '0.5rem', display: 'inline-block' }}>Ir al Mercado</Link>
                                </div>
                            );
                        }

                        return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {displayData.map(item => (
                                    <Link 
                                        to={item.type === 'team' ? `/market/team/${item.team_id}` : `/market/player/${item.player_id}`}
                                        key={item.type === 'team' ? `team-${item.team_id}` : `player-${item.player_id}`} 
                                        className="glass-panel" 
                                        style={{ padding: '1rem', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', color: 'inherit' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '10px', backgroundColor: 'var(--surface-lighter)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem' }}>
                                                {item.type === 'team' ? '🏟️' : '👤'}

                                            </div>
                                            <div>
                                                <p style={{ fontWeight: '700', fontSize: '0.95rem', margin: 0 }}>
                                                    {item.player_name}
                                                </p>
                                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                                                    {item.type === 'team' ? parseFloat(item.shares_owned).toFixed(4) : parseFloat(item.shares_owned).toFixed(2)} acciones

                                                </p>
                                            </div>
                                        </div>

                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ fontWeight: '800', fontSize: '1rem', margin: 0 }}>€{item.position_value.toFixed(2)}</p>
                                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>€{item.current_price.toFixed(2)}/u</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        );
                    })()}
                </div>

                {/* Recent Activity Section */}
                <div style={{ marginTop: '3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
                            Actividad Reciente
                        </h3>
                        <button 
                            onClick={() => setShowActivity(!showActivity)}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'var(--text-muted)',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            {showActivity ? 'Ocultar' : 'Ver'}
                            <span style={{ transition: 'transform 0.3s', transform: showActivity ? 'rotate(180deg)' : 'rotate(0deg)', fontSize: '0.6rem' }}>▼</span>
                        </button>
                    </div>
                    
                    {showActivity && (
                        loadingTrades ? (
                            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Cargando actividad...</div>
                        ) : tradeHistory.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>No hay actividad reciente.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {tradeHistory.slice(0, 10).map((trade, idx) => (
                                    <div key={idx} className="glass-panel" style={{ padding: '1rem', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ 
                                                width: '36px', 
                                                height: '36px', 
                                                borderRadius: '10px', 
                                                backgroundColor: 'rgba(255,255,255,0.05)', 
                                                display: 'flex', 
                                                justifyContent: 'center', 
                                                alignItems: 'center', 
                                                fontSize: '1rem',
                                                color: trade.side === 'buy' ? 'var(--accent-neon)' : 'var(--error-red)' 
                                            }}>
                                                {trade.side === 'buy' ? '↙' : '↗'}
                                            </div>
                                            <div>
                                                <p style={{ fontWeight: '700', fontSize: '0.9rem', margin: 0 }}>{trade.player_name || 'Desconocido'}</p>
                                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
                                                    {new Date(trade.created_at).toLocaleDateString()} • {trade.side === 'buy' ? 'Compra' : 'Venta'}
                                                </p>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ fontWeight: '800', fontSize: '0.9rem', margin: 0 }}>{parseFloat(trade.total_value).toFixed(2)} €</p>
                                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>{parseFloat(trade.quantity).toFixed(4)} Acc.</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            </main>

            {/* Bottom Navigation */}
            <nav style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                width: '100%',
                backgroundColor: 'rgba(28,28,28,0.95)',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                zIndex: 20,
                paddingBottom: 'env(safe-area-inset-bottom)'
            }}>
                <Link to="/home" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', padding: '12px 0', textDecoration: 'none', color: 'var(--text-muted)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>Inicio</span>
                </Link>
                <Link to="/portfolio" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', padding: '12px 0', textDecoration: 'none', color: 'var(--accent-neon)' }}>
                    <div style={{ width: '20px', height: '2px', backgroundColor: 'var(--accent-neon)', borderRadius: '2px', position: 'absolute', top: 0 }}></div>
                    <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>Portfolio</span>
                </Link>
                <Link to="/market" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', padding: '12px 0', textDecoration: 'none', color: 'var(--text-muted)' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '500' }}>Mercado</span>
                </Link>
                <div 
                    onClick={() => window.location.href = '/profile'}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '12px 0', color: 'var(--text-muted)' }}
                >
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: 'var(--surface-lighter)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '0.7rem' }}>
                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                </div>
            </nav>
        </div>
    );
};

export default PortfolioMobile;
