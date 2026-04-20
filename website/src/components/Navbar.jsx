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
            <nav className={css.topNavbar}>
                <Link to="/">
                    <img src={fsLogo} alt="Futstocks Logo" className={css.topNavLogo} />
                </Link>
                <div className={css.topNavLinks}>
                    <Link to="/login" className={`neon-button ${css.topNavLoginBtn}`}>Iniciar Sesión</Link>
                </div>
            </nav>
        );
    }

    const linkClass = (isActive) => {
        return `${css.sidebarLink} ${isActive ? css.sidebarLinkActive : ''}`;
    }

    return (
        <aside className={css.sidebar}>
            <div className={css.logoContainer}>
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

            <div className={css.modeSwitchContainer}>
                <div className={css.modeSwitch}>
                    <button className={`${css.modeBtn} ${css.active}`}>
                        DEMO
                    </button>
                    <button className={css.modeBtn} disabled>
                        REAL
                        <span className={css.comingSoon}>Próximamente</span>
                    </button>
                    <div className={css.modeSlider}></div>
                </div>
            </div>

            <div
                onClick={() => navigate('/profile')}
                className={css.sidebarProfile}
            >
                <div className={css.sidebarProfileContent}>
                    <div className={css.sidebarProfileAvatar}>
                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                        <p className={css.sidebarProfileName}>{user?.username || 'Usuario'}</p>
                        <p className={css.sidebarProfileSubtext}>Ver perfil</p>
                    </div>
                </div>
            </div>
        </aside>
    );
};

export default Navbar;
