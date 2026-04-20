import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import WalletChart from '../components/WalletChart';
import { getPlayers, getPortfolio, getPortfolioHistory, getPlayerImageUrl } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/Home.module.css';



const HomeDesktop = () => {
  const navigate = useNavigate();
  const [chartData, setChartData] = useState([]);
  const [activeTimeframe, setActiveTimeframe] = useState('D');
  const [players, setPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(true);
  const [updatedPlayerId, setUpdatedPlayerId] = useState(null);

  const [portfolio, setPortfolio] = useState(null);
  const [loadingPortfolio, setLoadingPortfolio] = useState(true);

  const { socket, connected, subscribeToUser, unsubscribeFromUser } = useSocket();
  const { user } = useAuth();



  const fetchPlayers = async () => {
    try {
      const data = await getPlayers({ sort_by: 'price', sort_dir: 'desc', limit: 50 });
      // Using actual prices from the database API
      const playersWithPrices = data.data.map(p => {
        const priceNum = parseFloat(p.price) || 0;
        const changeNum = parseFloat(p.change || 0);

        return { ...p, price: priceNum, change: changeNum };
      });
      setPlayers(playersWithPrices);
    } catch (error) {
      console.error('Failed to load players:', error);
    } finally {
      setLoadingPlayers(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  // WebSocket Price Updates
  useEffect(() => {
    if (!socket || !connected) return;

    let debounceTimer;
    const handlePriceUpdate = (data) => {
      // 1. Update existing players in state if found
      setPlayers(prev => {
        const updated = prev.map(p => 
          p.id === data.playerId ? { ...p, price: data.price, change: data.change } : p
        );
        // Re-sort players by price descending
        return [...updated].sort((a, b) => b.price - a.price);
      });

      // 2. Visual highlight
      setUpdatedPlayerId(data.playerId);
      setTimeout(() => setUpdatedPlayerId(null), 1000);

      // 3. Debounced re-fetch of the full top players list from API
      // This catches players that move into the top 10 from outside the current top 50 pool
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchPlayers();
      }, 3000);

      // 4. Recalculate portfolio value in real-time if the player is in holdings
      setPortfolio(prevPortfolio => {
        if (!prevPortfolio || !prevPortfolio.holdings) return prevPortfolio;
        
        const updatedHoldings = prevPortfolio.holdings.map(h => {
          if (h.player_id === data.playerId) {
            return { ...h, current_price: data.price, position_value: h.shares * data.price };
          }
          return h;
        });

        return { ...prevPortfolio, holdings: updatedHoldings };
      });
    };

    const handlePortfolioUpdate = (data) => {
      // When a trade happens, fetch fresh portfolio data to update balances and history
      fetchPortfolioData();
      fetchHistory();
    };

    socket.on('price_update', handlePriceUpdate);
    socket.on('portfolio_update', handlePortfolioUpdate);

    return () => {
      clearTimeout(debounceTimer);
      socket.off('price_update', handlePriceUpdate);
      socket.off('portfolio_update', handlePortfolioUpdate);
    };
  }, [socket, connected]);




  useEffect(() => {
    if (user && user.id) {
      subscribeToUser(user.id);
      return () => unsubscribeFromUser(user.id);
    }
  }, [user, subscribeToUser, unsubscribeFromUser]);

  const fetchPortfolioData = async () => {
    try {
      const data = await getPortfolio();
      setPortfolio(data);
    } catch (error) {
      console.error('Failed to load portfolio:', error);
    } finally {
      setLoadingPortfolio(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const historyData = await getPortfolioHistory(activeTimeframe);
      // Backend now appends a live sentinel, so just map timestamps
      // Create 24 hourly buckets for the '1D' timeframe
      let formattedData = historyData.map(point => ({
        timestamp: new Date(point.time).getTime(),
        value: point.value
      }));

      if (activeTimeframe === 'D') {
        const now = new Date();
        const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const normalized = [];
        
        for (let i = 0; i <= 24; i++) {
          const bucketTime = new Date(start.getTime() + i * 60 * 60 * 1000);
          const ts = bucketTime.getTime();
          
          const lastKnown = formattedData.reduce((prev, curr) => {
            if (curr.timestamp <= ts && (prev === null || curr.timestamp > prev.timestamp)) {
              return curr;
            }
            return prev;
          }, null);
          
          normalized.push({
            timestamp: ts,
            value: lastKnown ? lastKnown.value : (normalized.length > 0 ? normalized[normalized.length - 1].value : 0)
          });
        }
        formattedData = normalized;
      } else if (activeTimeframe === 'W') {
        const now = new Date();
        const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const normalized = [];
        
        for (let i = 0; i <= 7; i++) {
          const bucketTime = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
          const ts = bucketTime.getTime();
          
          const lastKnown = formattedData.reduce((prev, curr) => {
            if (curr.timestamp <= ts && (prev === null || curr.timestamp > prev.timestamp)) {
              return curr;
            }
            return prev;
          }, null);
          
          normalized.push({
            timestamp: ts,
            value: lastKnown ? lastKnown.value : (normalized.length > 0 ? normalized[normalized.length - 1].value : 0)
          });
        }
        formattedData = normalized;
      } else if (activeTimeframe === 'M') {
        const now = new Date();
        const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const normalized = [];
        
        for (let i = 0; i <= 30; i++) {
          const bucketTime = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
          const ts = bucketTime.getTime();
          
          const lastKnown = formattedData.reduce((prev, curr) => {
            if (curr.timestamp <= ts && (prev === null || curr.timestamp > prev.timestamp)) {
              return curr;
            }
            return prev;
          }, null);
          
          normalized.push({
            timestamp: ts,
            value: lastKnown ? lastKnown.value : (normalized.length > 0 ? normalized[normalized.length - 1].value : 0)
          });
        }
        formattedData = normalized;
      } else if (activeTimeframe === 'Y') {
        const now = new Date();
        const normalized = [];
        
        for (let i = 0; i <= 12; i++) {
          const bucketTime = new Date(now.getFullYear(), now.getMonth() - (12 - i), now.getDate(), now.getHours(), now.getMinutes());
          const ts = bucketTime.getTime();
          
          const lastKnown = formattedData.reduce((prev, curr) => {
            if (curr.timestamp <= ts && (prev === null || curr.timestamp > prev.timestamp)) {
              return curr;
            }
            return prev;
          }, null);
          
          normalized.push({
            timestamp: ts,
            value: lastKnown ? lastKnown.value : (normalized.length > 0 ? normalized[normalized.length - 1].value : 0)
          });
        }
        formattedData = normalized;
      } else if (activeTimeframe === 'Max') {
        if (portfolio && portfolio.walletCreatedAt) {
          const now = new Date();
          const walletStartTs = new Date(portfolio.walletCreatedAt).getTime();
          const normalized = [{ timestamp: walletStartTs, value: 0 }];
          
          let current = new Date(walletStartTs);
          current.setMonth(current.getMonth() + 1);
          current.setDate(1);
          current.setHours(0, 0, 0, 0);

          while (current <= now) {
            const ts = current.getTime();
            const lastKnown = formattedData.reduce((prev, curr) => {
              if (curr.timestamp <= ts && (prev === null || curr.timestamp > prev.timestamp)) {
                return curr;
              }
              return prev;
            }, null);
            
            normalized.push({
              timestamp: ts,
              value: lastKnown ? lastKnown.value : normalized[normalized.length - 1].value
            });
            
            current.setMonth(current.getMonth() + 1);
          }
          
          const finalPoint = formattedData.length > 0 ? formattedData[formattedData.length - 1] : { timestamp: now.getTime(), value: 0 };
          if (normalized[normalized.length - 1].timestamp < finalPoint.timestamp) {
              normalized.push(finalPoint);
          }
          
          formattedData = normalized;
        }
      }

      setChartData(formattedData);
    } catch (error) {
      console.error('Failed to load portfolio history:', error);
    }
  };

  useEffect(() => {
    fetchPortfolioData();
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [activeTimeframe, portfolio?.walletCreatedAt]);

  const [variation24h, setVariation24h] = useState({ amount: 0, percent: 0 });

  useEffect(() => {
    const fetch24hVariation = async () => {
      try {
        const history24h = await getPortfolioHistory('1D');
        if (history24h && history24h.length > 0 && portfolio) {
          const firstValue = history24h[0].value;
          const currentValue = portfolio.walletBalance + (portfolio.holdings?.reduce((acc, h) => acc + h.position_value, 0) || 0);
          const diff = currentValue - firstValue;
          const percent = firstValue !== 0 ? (diff / firstValue) * 100 : 0;
          setVariation24h({ amount: diff, percent });
        }
      } catch (error) {
        console.error('Failed to fetch 24h variation:', error);
      }
    };

    if (portfolio) {
      fetch24hVariation();
    }
  }, [portfolio]);

  const displayValue = portfolio ? portfolio.walletBalance + (portfolio.holdings?.reduce((acc, h) => acc + h.position_value, 0) || 0) : 0;


  return (
    <div className={styles.container}>

      <Navbar />

      {/* Main Content Area */}
      <main className={styles['main-content']}>

        {/* Wallet Evolution Chart Component */}
        <WalletChart 
          chartData={chartData}
          activeTimeframe={activeTimeframe}
          onTimeframeChange={setActiveTimeframe}
          displayValue={displayValue}
          variation24h={variation24h}
          loading={loadingPortfolio}
        />

        {/* Players List Section */}
        <div>
          <div className={styles['players-header']}>
            <h2 className={styles['section-title']}>Top Jugadores</h2>
            <Link to="/market" className={styles['view-all-link']}>Ver todos</Link>
          </div>

          {loadingPlayers ? (
            <div className={styles.loading}>Cargando jugadores...</div>
          ) : (
            <div className={styles['players-grid']}>
              {players.slice(0, 10).map((player, idx) => (
                <div 
                  key={player.id} 
                  onClick={() => navigate(`/market/player/${player.id}`)}
                  className={`${styles['player-card']} ${player.id === updatedPlayerId ? styles['player-card-updated'] : ''}`}
                >
                  <div className={styles['player-rank']}>
                    #{idx + 1}
                  </div>
                  <div className={styles['player-info']}>
                    <div className={styles['player-avatar']}>
                      <img 
                        src={getPlayerImageUrl(player.id)}
                        alt={player.name}
                        className={styles['player-avatar-img']}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <span className={styles['player-avatar-placeholder']}>👤</span>
                    </div>
                    <div>
                      <p className={styles['player-name']}>{player.name}</p>
                      <p className={styles['player-team']}>{player.team}</p>
                    </div>
                  </div>
                  <div className={styles['player-stats']}>
                    <p className={styles['player-price']}>{Number(player.price).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
                    <p className={`${styles['player-change']} ${player.change >= 0 ? styles['player-change-up'] : styles['player-change-down']}`}>
                      {player.change >= 0 ? '▲' : '▼'} {Math.abs(player.change)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
};

export default HomeDesktop;
