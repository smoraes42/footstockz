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
    walletBalance,
    showSearchIcon,
    onSearchClick
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


            <div className={styles['right-section']}>
                {rightContent ? (
                    rightContent
                ) : walletBalance !== undefined ? (
                    <div className={styles['wallet-box']}>
                        <p className={styles['wallet-value']}>€{Number(walletBalance).toFixed(2)}</p>
                    </div>
                ) : showLogout ? (
                    <button onClick={onLogout} className={styles['logout-btn']}>SALIR</button>
                ) : showSearchIcon ? (
                    <button onClick={onSearchClick} className={styles['search-btn']}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    </button>
                ) : (
                    <div className={styles['nav-spacer']} />
                )}
            </div>
        </header>
    );
};

export default MobileHeader;
