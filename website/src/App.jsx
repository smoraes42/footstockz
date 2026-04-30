import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingDesktop from './desktop_pages/LandingDesktop';
import LandingMobile from './mobile_pages/LandingMobile';
import LoginDesktop from './desktop_pages/LoginDesktop';
import RegisterDesktop from './desktop_pages/RegisterDesktop';
import HomeDesktop from './desktop_pages/HomeDesktop';
import MarketDesktop from './desktop_pages/MarketDesktop';
import VerifyDesktop from './desktop_pages/VerifyDesktop';
import PlayerMarketDesktop from './desktop_pages/PlayerMarketDesktop';
import TeamMarketDetailDesktop from './desktop_pages/TeamMarketDetailDesktop';
import PortfolioDesktop from './desktop_pages/PortfolioDesktop';
import LeaderboardDesktop from './desktop_pages/LeaderboardDesktop';
import ProfileDesktop from './desktop_pages/ProfileDesktop';
import UserProfileDesktop from './desktop_pages/UserProfileDesktop';
import TradeDetailDesktop from './desktop_pages/TradeDetailDesktop';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import fsLogo from './assets/fs-logo.png';

import { SocketProvider } from './context/SocketContext';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
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
            <SettingsProvider>
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
                    {isMobile ? (
                      <>
                        <Route path="/" element={<LandingMobile />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </>
                    ) : (
                      <>
                        {/* Public routes */}
                        <Route path="/" element={<LandingDesktop />} />
                        <Route path="/login" element={<LoginDesktop />} />
                        <Route path="/register" element={<RegisterDesktop />} />
                        <Route path="/verify" element={<VerifyDesktop />} />

                        {/* Protected routes */}
                        <Route path="/home" element={<ProtectedRoute><HomeDesktop /></ProtectedRoute>} />
                        <Route path="/market" element={<ProtectedRoute><MarketDesktop /></ProtectedRoute>} />
                        <Route path="/market/player/:playerId" element={<ProtectedRoute><PlayerMarketDesktop /></ProtectedRoute>} />
                        <Route path="/market/team/:teamId" element={<ProtectedRoute><TeamMarketDetailDesktop /></ProtectedRoute>} />
                        <Route path="/portfolio" element={<ProtectedRoute><PortfolioDesktop /></ProtectedRoute>} />
                        <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardDesktop /></ProtectedRoute>} />
                        <Route path="/profile" element={<ProtectedRoute><ProfileDesktop /></ProtectedRoute>} />
                        <Route path="/profile/:userId" element={<ProtectedRoute><UserProfileDesktop /></ProtectedRoute>} />
                        <Route path="/trades/:tradeId" element={<ProtectedRoute><TradeDetailDesktop /></ProtectedRoute>} />

                        {/* 404 fallback */}
                        <Route path="*" element={<Navigate to="/home" replace />} />
                      </>
                    )}
                  </Routes>
                </div>
              </Router>
            </SettingsProvider>
          </SocketProvider>
        </AuthProvider>
      )}
    </div>
  );
}

export default App;
