import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/MobileNavbar.module.css';

const MobileNavbar = () => {
    const location = useLocation();
    const { user } = useAuth();
    const currentPath = location.pathname;

    const navItems = [
        { 
            path: '/home', 
            label: 'Inicio',
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        },
        { 
            path: '/portfolio', 
            label: 'Portfolio',
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
        },
        { 
            path: '/market', 
            label: 'Mercado',
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
        },
        { 
            path: '/leaderboard', 
            label: 'Ranking',
            icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
        },
        { 
            path: '/profile', 
            label: 'Perfil', 
            isAvatar: true 
        }
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
                            <>
                                {item.icon}
                                <span className={styles['mobile-nav-text']}>{item.label}</span>
                            </>
                        )}
                    </Link>
                );
            })}
        </nav>
    );
};

export default MobileNavbar;
