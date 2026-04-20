import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingDesktop from './desktop_pages/LandingDesktop';
import LandingMobile from './mobile_pages/LandingMobile';
import LoginDesktop from './desktop_pages/LoginDesktop';
import LoginMobile from './mobile_pages/LoginMobile';
import RegisterDesktop from './desktop_pages/RegisterDesktop';
import RegisterMobile from './mobile_pages/RegisterMobile';
import HomeDesktop from './desktop_pages/HomeDesktop';
import HomeMobile from './mobile_pages/HomeMobile';
import MarketDesktop from './desktop_pages/MarketDesktop';
import MarketMobile from './mobile_pages/MarketMobile';
import VerifyDesktop from './desktop_pages/VerifyDesktop';
import VerifyMobile from './mobile_pages/VerifyMobile';
import PlayerMarketDesktop from './desktop_pages/PlayerMarketDesktop';
import PlayerMarketMobile from './mobile_pages/PlayerMarketMobile';
import TeamMarketDetailDesktop from './desktop_pages/TeamMarketDetailDesktop';
import TeamMarketDetailMobile from './mobile_pages/TeamMarketDetailMobile';
import PortfolioDesktop from './desktop_pages/PortfolioDesktop';
import PortfolioMobile from './mobile_pages/PortfolioMobile';
import LeaderboardDesktop from './desktop_pages/LeaderboardDesktop';
import LeaderboardMobile from './mobile_pages/LeaderboardMobile';
import ProfileDesktop from './desktop_pages/ProfileDesktop';
import ProfileMobile from './mobile_pages/ProfileMobile';
import UserProfileDesktop from './desktop_pages/UserProfileDesktop';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import fsLogo from './assets/fs-logo.png';

import { SocketProvider } from './context/SocketContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [loading, setLoading] = useState(true);
  const [fadeLogo, setFadeLogo] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);

    const fadeTimer = setTimeout(() => setFadeLogo(true), 1500);
    const removeTimer = setTimeout(() => setLoading(false), 2100);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  return (
    <div style={{ backgroundColor: 'var(--bg-main)', minHeight: '100dvh', width: '100vw', maxWidth: '100vw', overflowX: 'hidden' }}>
      {loading && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: '#0a0a0a',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          zIndex: 9999,
          transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
          opacity: fadeLogo ? 0 : 1,
          transform: fadeLogo ? 'scale(1.05)' : 'scale(1)',
          visibility: loading ? 'visible' : 'hidden'
        }}>
          <img src={fsLogo} alt="Futstocks Logo" className="splash-logo" style={{ height: isMobile ? '60px' : '90px' }} />
        </div>
      )}

      {!loading && (
        <AuthProvider>
          <SocketProvider>
            <Router>
              <div className="landing-appear">
                <ToastContainer
                  position="top-center"
                  autoClose={3000}
                  hideProgressBar={true}
                  closeButton={false}
                  closeOnClick={true}
                  pauseOnHover={true}
                  draggable={false}
                  theme="dark"
                  icon={false}
                />
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={isMobile ? <LandingMobile /> : <LandingDesktop />} />
                  <Route path="/login" element={isMobile ? <LoginMobile /> : <LoginDesktop />} />
                  <Route path="/register" element={isMobile ? <RegisterMobile /> : <RegisterDesktop />} />
                  <Route path="/verify" element={isMobile ? <VerifyMobile /> : <VerifyDesktop />} />

                  {/* Protected routes */}
                  <Route path="/home" element={<ProtectedRoute>{isMobile ? <HomeMobile /> : <HomeDesktop />}</ProtectedRoute>} />
                  <Route path="/market" element={<ProtectedRoute>{isMobile ? <MarketMobile /> : <MarketDesktop />}</ProtectedRoute>} />
                  <Route path="/market/player/:playerId" element={<ProtectedRoute>{isMobile ? <PlayerMarketMobile /> : <PlayerMarketDesktop />}</ProtectedRoute>} />
                  <Route path="/market/team/:teamId" element={<ProtectedRoute>{isMobile ? <TeamMarketDetailMobile /> : <TeamMarketDetailDesktop />}</ProtectedRoute>} />
                  <Route path="/portfolio" element={<ProtectedRoute>{isMobile ? <PortfolioMobile /> : <PortfolioDesktop />}</ProtectedRoute>} />
                  <Route path="/leaderboard" element={<ProtectedRoute>{isMobile ? <LeaderboardMobile /> : <LeaderboardDesktop />}</ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute>{isMobile ? <ProfileMobile /> : <ProfileDesktop />}</ProtectedRoute>} />
                  <Route path="/profile/:userId" element={<ProtectedRoute>{isMobile ? <ProfileMobile /> : <UserProfileDesktop />}</ProtectedRoute>} />

                  {/* 404 fallback */}
                  <Route path="*" element={<Navigate to="/home" replace />} />
                </Routes>
              </div>
            </Router>
          </SocketProvider>
        </AuthProvider>
      )}
    </div>
  );
}

export default App;
