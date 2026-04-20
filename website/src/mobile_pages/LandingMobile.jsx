import React from 'react';
import { Link } from 'react-router-dom';
import fsLogo from '../assets/fs-logo.png';
import fsSlogan from '../assets/fs-slogan.png';
import styles from '../styles/Landing.module.css';

const LandingMobile = () => {
    return (
        <div className={styles.mobileContainer}>

            <div className={styles.mobileWrapper}>

                {/* Navbar Mobile */}
                <nav className={styles.mobileNav}>
                    <div className={styles.mobileNavLogoBox}>
                        <img src={fsLogo} alt="Futstocks Logo" className={styles.mobileNavLogo} />
                    </div>
                    <Link to="/login" className={`${styles.mobileNavBtn} neon-button`}>Entrar</Link>
                </nav>

                {/* Hero Section Mobile */}
                <main className={styles.mobileHero}>
                    {/* Glow effect background */}
                    <div className={styles.mobileHeroGlow}></div>

                    <div className={styles.mobileHeroContent}>


                        <div className={`${styles.mobileSloganBox} fade-in-up delay-1`}>
                            <img src={fsSlogan} alt="El Mercado de Valores del Fútbol" className={styles.mobileSloganImg} />
                        </div>

                        <p className={`${styles.mobileHeroDescription} fade-in-up delay-2`}>
                            Ficha a tus jugadores favoritos y especula con su valor. El precio sube o baja según la <strong>oferta y demanda</strong> del mercado.
                        </p>

                        <div className={`${styles.mobileHeroCta} fade-in-up delay-3`}>
                            <Link to="/register" className={`${styles.mobileHeroBtn} neon-button`}>
                                Empezar a Jugar
                            </Link>
                        </div>
                    </div>
                </main>
            </div>



            {/* Footer Mobile */}
            <footer className={styles.mobileFooter}>
                <div className={styles.mobileFooterLeft}>
                    <img src={fsLogo} alt="Futstocks Logo" className={styles.mobileFooterLogo} />
                    <span className={styles.mobileCopyright}>© 2026 Futstocks.</span>
                </div>
                <div className={styles.mobileFooterRight}>
                    <a href="#" className={styles.mobileFooterLink}>Términos</a>
                    <a href="#" className={styles.mobileFooterLink}>Privacidad</a>
                    <a href="#" className={styles.mobileFooterLink}>Contacto</a>
                </div>
            </footer>
        </div>
    );
};

export default LandingMobile;
