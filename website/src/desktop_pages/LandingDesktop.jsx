import React from 'react';
import { Link } from 'react-router-dom';
import fsLogo from '../assets/fs-logo.png';
import fsSlogan from '../assets/fs-slogan.png';

const LandingDesktop = () => {
    return (
        <div style={{ backgroundColor: 'var(--bg-main)', width: '100%' }}>

            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

                {/* Navbar */}
                <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 4rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <img src={fsLogo} alt="Futstocks Logo" style={{ height: '40px' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                        <Link to="/login" className="neon-button" style={{ padding: '8px 20px', borderRadius: '6px', textDecoration: 'none', display: 'inline-block' }}>Iniciar Sesión</Link>
                    </div>
                </nav>

                {/* Hero Section */}
                <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem', position: 'relative' }}>
                    {/* Glow effect background */}
                    <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%, -50%)', width: '60vw', height: '60vw', background: 'radial-gradient(circle, rgba(57,255,20,0.08) 0%, rgba(16,16,16,0) 70%)', zIndex: 0, pointerEvents: 'none' }}></div>

                    <div style={{ position: 'relative', zIndex: 1, maxWidth: '800px' }}>


                        <div className="fade-in-up delay-1" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                            <img src={fsSlogan} alt="El Mercado de Valores del Fútbol" style={{ maxWidth: '100%', height: 'auto', maxHeight: '200px' }} />
                        </div>

                        <p className="fade-in-up delay-2" style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '3rem', maxWidth: '600px', margin: '0 auto 3rem', lineHeight: 1.6 }}>
                            Ficha a tus jugadores favoritos y especula con su valor. El precio sube o baja según la <strong>oferta y demanda</strong> del mercado.
                        </p>

                        <div className="fade-in-up delay-3" style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <Link to="/register" className="neon-button" style={{ padding: '16px 32px', borderRadius: '8px', fontSize: '1.1rem', textDecoration: 'none' }}>
                                Empezar a Jugar
                            </Link>
                        </div>
                    </div>
                </main>
            </div>



            {/* Footer */}
            <footer style={{ padding: '3rem 4rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img src={fsLogo} alt="Futstocks Logo" style={{ height: '30px', opacity: 0.5 }} />
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>© 2026 Futstocks. Todos los derechos reservados.</span>
                </div>
                <div style={{ display: 'flex', gap: '2rem' }}>
                    <a href="#" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textDecoration: 'none' }}>Términos</a>
                    <a href="#" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textDecoration: 'none' }}>Privacidad</a>
                    <a href="#" style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textDecoration: 'none' }}>Contacto</a>
                </div>
            </footer>
        </div>
    );
};

export default LandingDesktop;
