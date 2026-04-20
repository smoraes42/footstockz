import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import fsLogo from '../assets/fs-logo.png';
import css from '../styles/Navbar.module.css';

const Navbar = ({ type = 'sidebar' }) => {
    const navigate = useNavigate();
    const { user } = useAuth();

    if (type === 'top') {
        return (
            <nav className={css['top-navbar']}>
                <Link to="/">
                    <img src={fsLogo} alt="Futstocks Logo" className={css['top-nav-logo']} />
                </Link>
                <div className={css['top-nav-links']}>
                    <Link to="/login" className={`neon-button ${css['top-nav-login-btn']}`}>Iniciar Sesión</Link>
                </div>
            </nav>
        );
    }

    const linkClass = (isActive) => {
        return `${css['sidebar-link']} ${isActive ? css['sidebar-link-active'] : ''}`;
    }

    return (
        <aside className={css.sidebar}>
            <div className={css['logo-container']}>
                <Link to="/home">
                    <img src={fsLogo} alt="Futstocks Logo" className={css.logo} />
                </Link>
            </div>

            <nav className={css.nav}>
                <NavLink to="/home" className={({ isActive }) => linkClass(isActive)}>
                    <span>Inicio</span>
                </NavLink>
                <NavLink to="/portfolio" className={({ isActive }) => linkClass(isActive)}>
                    <span>Portfolio</span>
                </NavLink>
                <NavLink to="/watchlist" className={({ isActive }) => linkClass(isActive)}>
                    <span>Watchlist</span>
                </NavLink>
                <NavLink to="/market" className={({ isActive }) => linkClass(isActive)}>
                    <span>Mercado</span>
                </NavLink>
                <NavLink to="/leaderboard" className={({ isActive }) => linkClass(isActive)}>
                    <span>Leaderboard</span>
                </NavLink>
            </nav>

            <div className={css['mode-switch-container']}>
                <div className={css['mode-switch']}>
                    <button className={`${css['mode-btn']} ${css.active}`}>
                        DEMO
                    </button>
                    <button className={css['mode-btn']} disabled>
                        REAL
                        <span className={css['coming-soon']}>Próximamente</span>
                    </button>
                    <div className={css['mode-slider']}></div>
                </div>
            </div>

            <div
                onClick={() => navigate('/profile')}
                className={css['sidebar-profile']}
            >
                <div className={css['sidebar-profile-content']}>
                    <div className={css['sidebar-profile-avatar']}>
                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                        <p className={css['sidebar-profile-name']}>{user?.username || 'Usuario'}</p>
                        <p className={css['sidebar-profile-subtext']}>Ver perfil</p>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Navbar;
