import React from 'react';
import { Link } from 'react-router-dom';
import fsLogo from '../assets/fs-logo.png';
import fsSlogan from '../assets/fs-slogan.png';

const LandingMobile = () => {
    return (
        <div style={{ backgroundColor: 'var(--bg-main)', width: '100%' }}>

            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

                {/* Navbar Mobile */}
                <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(16,16,16,0.9)', position: 'sticky', top: 0, zIndex: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <img src={fsLogo} alt="Futstocks Logo" style={{ height: '30px' }} />
                    </div>
                    <Link to="/login" className="neon-button" style={{ padding: '6px 16px', borderRadius: '6px', fontSize: '0.9rem', textDecoration: 'none' }}>Entrar</Link>
                </nav>

                {/* Hero Section Mobile */}
                <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem 1.5rem', position: 'relative', overflow: 'hidden' }}>
                    {/* Glow effect background */}
                    <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%, -50%)', width: '150vw', height: '150vw', background: 'radial-gradient(circle, rgba(57,255,20,0.1) 0%, rgba(16,16,16,0) 60%)', zIndex: 0, pointerEvents: 'none' }}></div>

                    <div style={{ position: 'relative', zIndex: 1, width: '100%' }}>


                        <div className="fade-in-up delay-1" style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'center', padding: '0 10px' }}>
                            <img src={fsSlogan} alt="El Mercado de Valores del Fútbol" style={{ maxWidth: '100%', height: 'auto', maxHeight: '140px' }} />
                        </div>

                        <p className="fade-in-up delay-2" style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '2.5rem', lineHeight: 1.5 }}>
                            Ficha a tus jugadores favoritos y especula con su valor. El precio sube o baja según la <strong>oferta y demanda</strong> del mercado.
                        </p>

                        <div className="fade-in-up delay-3" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                            <Link to="/register" className="neon-button" style={{ padding: '16px', borderRadius: '8px', fontSize: '1.1rem', width: '100%', textDecoration: 'none', display: 'inline-block', boxSizing: 'border-box' }}>
                                Empezar a Jugar
                            </Link>
                        </div>
                    </div>
                </main>
            </div>



            {/* Footer Mobile */}
            <footer style={{ padding: '2rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <img src={fsLogo} alt="Futstocks Logo" style={{ height: '24px', opacity: 0.5 }} />
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>© 2026 Futstocks.</span>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem' }}>
                    <a href="#" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textDecoration: 'none' }}>Términos</a>
                    <a href="#" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textDecoration: 'none' }}>Privacidad</a>
                    <a href="#" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textDecoration: 'none' }}>Contacto</a>
                </div>
            </footer>
        </div>
    );
};

export default LandingMobile;
