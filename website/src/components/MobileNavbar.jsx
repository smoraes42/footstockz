import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/MobileNavbar.module.css';

const MobileNavbar = () => {
    const location = useLocation();
    const { user } = useAuth();
    const currentPath = location.pathname;

    const navItems = [
        { path: '/home', label: 'Inicio' },
        { path: '/portfolio', label: 'Portfolio' },
        { path: '/market', label: 'Mercado' },
        { path: '/profile', label: 'Perfil', isAvatar: true }
    ];

    return (
        <nav className={styles['mobile-bottom-nav']}>
            {navItems.map((item) => {
                const isActive = currentPath === item.path || (item.path === '/market' && currentPath.startsWith('/market'));
                
                return (
                    <Link 
                        key={item.path} 
                        to={item.path} 
                        className={`${styles['mobile-nav-link']} ${isActive ? styles['mobile-nav-link-active'] : ''}`}
                    >
                        {isActive && <div className={styles['mobile-nav-link-active-bar']}></div>}
                        
                        {item.isAvatar ? (
                            <div className={`${styles['mobile-nav-avatar']} ${!isActive ? styles['mobile-nav-avatar-inactive'] : ''}`}>
                                {user?.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                        ) : (
                            <span className={styles['mobile-nav-text']}>{item.label}</span>
                        )}
                    </Link>
                );
            })}
        </nav>
    );
};

export default MobileNavbar;
