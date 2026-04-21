import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import fsLogo from '../assets/fs-logo.png';
import styles from '../styles/MobileHeader.module.css';

const MobileHeader = ({ 
    showLogo = true, 
    backLink, 
    onBack, 
    title, 
    rightContent, 
    showLogout,
    onLogout,
    walletBalance
}) => {
    const navigate = useNavigate();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else if (backLink) {
            navigate(backLink);
        } else {
            navigate(-1);
        }
    };

    return (
        <header className={styles['mobile-header']}>
            <div className={styles['left-section']}>
                {(backLink || onBack) ? (
                    <button onClick={handleBack} className={styles['back-btn']}>
                        <span className={styles['back-icon']}>←</span>
                        {!showLogo && <span>VOLVER</span>}
                    </button>
                ) : (
                    showLogo && (
                        <Link to="/home" className={styles['logo-link']}>
                            <img src={fsLogo} alt="Futstocks Logo" className={styles['mobile-logo']} />
                        </Link>
                    )
                )}
            </div>

            {title && <h3 className={styles['header-title']}>{title}</h3>}

            <div className={styles['right-section']}>
                {rightContent ? (
                    rightContent
                ) : walletBalance !== undefined ? (
                    <div className={styles['wallet-box']}>
                        <p className={styles['wallet-value']}>€{Number(walletBalance).toFixed(2)}</p>
                    </div>
                ) : showLogout ? (
                    <button onClick={onLogout} className={styles['logout-btn']}>SALIR</button>
                ) : (
                    <div className={styles['nav-spacer']} />
                )}
            </div>
        </header>
    );
};

export default MobileHeader;
