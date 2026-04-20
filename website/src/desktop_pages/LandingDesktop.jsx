import React from 'react';
import { Link } from 'react-router-dom';
import fsLogo from '../assets/fs-logo.png';
import fsSlogan from '../assets/fs-slogan.png';
import styles from '../styles/LandingDesktop.module.css';
import Navbar from '../components/Navbar';

const LandingDesktop = () => {
    return (
        <div className={styles.container}>

            <div className={styles.wrapper}>

                {/* Navbar */}
                <Navbar type="top" />

                {/* Hero Section */}
                <main className={styles.hero}>
                    {/* Glow effect background */}
                    <div className={styles.glowEffect}></div>

                    <div className={styles.heroContent}>


                        <div className={`fade-in-up delay-1 ${styles.sloganContainer}`}>
                            <img src={fsSlogan} alt="El Mercado de Valores del Fútbol" className={styles.sloganImg} />
                        </div>

                        <p className={`fade-in-up delay-2 ${styles.heroDescription}`}>
                            Ficha a tus jugadores favoritos y especula con su valor. El precio sube o baja según la <strong>oferta y demanda</strong> del mercado.
                        </p>

                        <div className={`fade-in-up delay-3 ${styles.ctaContainer}`}>
                            <Link to="/register" className={`neon-button ${styles.ctaBtn}`}>
                                Empezar a Jugar
                            </Link>
                        </div>
                    </div>
                </main>
            </div>



            {/* Footer */}
            <footer className={styles.footer}>
                <div className={styles.footerLeft}>
                    <img src={fsLogo} alt="Futstocks Logo" className={styles.footerLogo} />
                    <span className={styles.copyright}>© 2026 Futstocks. Todos los derechos reservados.</span>
                </div>
                <div className={styles.footerRight}>
                    <a href="#" className={styles.footerLink}>Términos</a>
                    <a href="#" className={styles.footerLink}>Privacidad</a>
                    <a href="#" className={styles.footerLink}>Contacto</a>
                </div>
            </footer>
        </div>
    );
};

export default LandingDesktop;
