import React from 'react';
import { Link } from 'react-router-dom';
import fsLogo from '../assets/fs-logo.png';
import fsSlogan from '../assets/fs-slogan.png';
import styles from '../styles/Landing.module.css';

const LandingMobile = () => {
    return (
        <div className={styles['mobile-container']}>

            <div className={styles['mobile-wrapper']}>

                {/* Navbar Mobile */}
                <nav className={styles['mobile-nav']}>
                    <div className={styles['mobile-nav-logo-box']}>
                        <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
                            <img src={fsLogo} alt="Futstocks Logo" className={styles['mobile-nav-logo']} />
                        </Link>
                    </div>
                </nav>

                {/* Hero Section Mobile */}
                <main className={styles['mobile-hero']}>
                    {/* Glow effect background */}
                    <div className={styles['mobile-hero-glow']}></div>

                    <div className={styles['mobile-hero-content']}>


                        <div className={`${styles['mobile-slogan-box']} fade-in-up delay-1`}>
                            <img src={fsSlogan} alt="El Mercado de Valores del Fútbol" className={styles['mobile-slogan-img']} />
                        </div>

                        <p className={`${styles['mobile-hero-description']} fade-in-up delay-2`}>
                            La experiencia de Futstocks está diseñada exclusivamente para móviles. Descarga nuestra App Oficial para fichar a tus jugadores favoritos y empezar a jugar.
                        </p>

                        <div className={`${styles['mobile-hero-cta']} fade-in-up delay-3`} style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center', width: '100%' }}>
                            <a href="#" className={`${styles['mobile-hero-btn']} neon-button`} style={{ width: '85%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '1.2em' }}>🍏</span> App Store
                            </a>
                            <a href="#" className={`${styles['mobile-hero-btn']} neon-button`} style={{ width: '85%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '1.2em' }}>▶️</span> Google Play
                            </a>
                        </div>
                    </div>
                </main>
            </div>



            {/* Footer Mobile */}
            <footer className={styles['mobile-footer']}>
                <div className={styles['mobile-footer-left']}>
                    <Link to="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={fsLogo} alt="Futstocks Logo" className={styles['mobile-footer-logo']} />
                    </Link>
                    <span className={styles['mobile-copyright']}>© 2026 Futstocks.</span>
                </div>
                <div className={styles['mobile-footer-right']}>
                    <a href="#" className={styles['mobile-footer-link']}>Términos</a>
                    <a href="#" className={styles['mobile-footer-link']}>Privacidad</a>
                    <a href="#" className={styles['mobile-footer-link']}>Contacto</a>
                </div>
            </footer>
        </div>
    );
};

export default LandingMobile;
