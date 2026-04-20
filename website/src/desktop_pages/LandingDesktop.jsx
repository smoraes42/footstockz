import React from 'react';
import { Link } from 'react-router-dom';
import fsLogo from '../assets/fs-logo.png';
import fsSlogan from '../assets/fs-slogan.png';
import styles from '../styles/Landing.module.css';
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
                    <div className={styles['glow-effect']}></div>

                    <div className={styles['hero-content']}>


                        <div className={`fade-in-up delay-1 ${styles['slogan-container']}`}>
                            <img src={fsSlogan} alt="El Mercado de Valores del Fútbol" className={styles['slogan-img']} />
                        </div>

                        <p className={`fade-in-up delay-2 ${styles['hero-description']}`}>
                            Ficha a tus jugadores favoritos y especula con su valor. El precio sube o baja según la <strong>oferta y demanda</strong> del mercado.
                        </p>

                        <div className={`fade-in-up delay-3 ${styles['cta-container']}`}>
                            <Link to="/register" className={`neon-button ${styles['cta-btn']}`}>
                                Empezar a Jugar
                            </Link>
                        </div>
                    </div>
                </main>
            </div>



            {/* Footer */}
            <footer className={styles.footer}>
                <div className={styles['footer-left']}>
                    <img src={fsLogo} alt="Futstocks Logo" className={styles['footer-logo']} />
                    <span className={styles.copyright}>© 2026 Futstocks. Todos los derechos reservados.</span>
                </div>
                <div className={styles['footer-right']}>
                    <a href="#" className={styles['footer-link']}>Términos</a>
                    <a href="#" className={styles['footer-link']}>Privacidad</a>
                    <a href="#" className={styles['footer-link']}>Contacto</a>
                </div>
            </footer>
        </div>
    );
};

export default LandingDesktop;
