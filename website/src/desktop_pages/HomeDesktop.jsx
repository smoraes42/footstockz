import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Navbar from '../components/Navbar';
import { getPlayers, getPortfolio, getPortfolioHistory, getPlayerImageUrl } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import styles from '../styles/HomeDesktop.module.css';


const formatCompactNumber = (number) => {
  if (number >= 1000000) {
    return (number / 1000000).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'M €';
  }
  if (number >= 1000) {
    return (number / 1000).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'K €';
  }
  return Number(number).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
};

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


  const timeframes = ['D', 'W', 'M', 'Y', 'Max'];

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

  // Custom hover state for smooth chart tracking
  const [hoverInfo, setHoverInfo] = useState(null);

  const handleChartMouseMove = (e) => {
    if (!e || !e.activePayload || !e.activePayload.length) { setHoverInfo(null); return; }
    const payload = e.activePayload[0].payload;
    setHoverInfo({ timestamp: payload.timestamp, value: payload.value });
  };

  const formatHoverTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    if (activeTimeframe === 'D') {
      return d.toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
    }
    if (activeTimeframe === 'W' || activeTimeframe === 'M') {
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    }
    if (activeTimeframe === 'Y' || activeTimeframe === 'Max') {
      return d.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
    }
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className={styles.container}>

      <Navbar />

      {/* Main Content Area */}
      <main className={styles.mainContent}>

        {/* Cartera Chart Section */}
        <div className={styles.sectionHeader}>
          <div className={styles.portfolioHeader}>
            <h2 className={styles.sectionTitle}>Cartera</h2>
            <div className={styles.portfolioValueContainer}>
              <div className={styles.portfolioValueWrapper}>
                <span className={styles.portfolioValue}>
                  {loadingPortfolio ? '---' : formatCompactNumber(displayValue)}
                </span>
                <span className={`${styles.portfolioVariation} ${variation24h.amount >= 0 ? styles.variationUp : styles.variationDown}`}>
                  {variation24h.amount >= 0 ? '+' : '-'} {Math.abs(variation24h.amount).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € ({variation24h.percent.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)
                </span>
              </div>

              <div className={styles.timeframeContainer}>
                {timeframes.map(tf => (
                  <button
                    key={tf}
                    className={`${styles.timeframeBtn} ${activeTimeframe === tf ? styles.timeframeBtnActive : ''}`}
                    onClick={() => setActiveTimeframe(tf)}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} onMouseMove={handleChartMouseMove} onMouseLeave={() => setHoverInfo(null)}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-neon)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--accent-neon)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  stroke="var(--text-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                  tickFormatter={(unixTime) => {
                    const date = new Date(unixTime);
                    if (activeTimeframe === '1D') {
                      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
                    } else if (activeTimeframe === '1W') {
                      return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
                    } else if (activeTimeframe === '1Y') {
                      return date.toLocaleDateString('es-ES', { month: 'short' });
                    } else if (activeTimeframe === 'Max') {
                      return date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
                    }
                    return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
                  }}
                  ticks={(() => {
                    if (activeTimeframe === 'D') {
                      return chartData.filter((_, i) => i % 4 === 0).map(d => d.timestamp);
                    }
                    if (activeTimeframe === 'W') {
                      return chartData.map(d => d.timestamp);
                    }
                    if (activeTimeframe === 'M') {
                      // Show every 5 days for 1M
                      return chartData.filter((_, i) => i % 5 === 0).map(d => d.timestamp);
                    }
                    if (activeTimeframe === 'Y') {
                      // Show every 2 months for 1Y
                      return chartData.filter((_, i) => i % 2 === 0).map(d => d.timestamp);
                    }
                    if (activeTimeframe === 'Max') {
                      // Show every 3 or 6 months depending on length
                      const interval = chartData.length > 24 ? 6 : 3;
                      return chartData.filter((_, i) => i % interval === 0 || i === chartData.length - 1).map(d => d.timestamp);
                    }
                    return undefined;
                  })()}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  stroke="var(--text-muted)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `€${formatCompactNumber(val)}`}
                  dx={-10}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className={styles.tooltipContainer}>
                          <div className={styles.tooltipTime}>
                            {formatHoverTime(data.timestamp)}
                          </div>
                          <div className={styles.tooltipRow}>
                            <span className={styles.tooltipLabel}>VALOR:</span>
                              <span className={styles.tooltipValue}>
                                {Number(data.value).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                              </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                  cursor={{ stroke: 'rgba(57,255,20,0.3)', strokeWidth: 2, strokeDasharray: '4 4' }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--accent-neon)"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorValue)"
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0, fill: 'var(--accent-neon)' }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Players List Section */}
        <div>
          <div className={styles.playersHeader}>
            <h2 className={styles.sectionTitle}>Top Jugadores</h2>
            <Link to="/market" className={styles.viewAllLink}>Ver todos</Link>
          </div>

          {loadingPlayers ? (
            <div className={styles.loading}>Cargando jugadores...</div>
          ) : (
            <div className={styles.playersGrid}>
              {players.slice(0, 10).map((player, idx) => (
                <div 
                  key={player.id} 
                  onClick={() => navigate(`/market/player/${player.id}`)}
                  className={`${styles.playerCard} ${player.id === updatedPlayerId ? styles.playerCardUpdated : ''}`}
                >
                  <div className={styles.playerRank}>
                    #{idx + 1}
                  </div>
                  <div className={styles.playerInfo}>
                    <div className={styles.playerAvatar}>
                      <img 
                        src={getPlayerImageUrl(player.id)}
                        alt={player.name}
                        className={styles.playerAvatarImg}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                      <span className={styles.playerAvatarPlaceholder}>👤</span>
                    </div>
                    <div>
                      <p className={styles.playerName}>{player.name}</p>
                      <p className={styles.playerTeam}>{player.team}</p>
                    </div>
                  </div>
                  <div className={styles.playerStats}>
                    <p className={styles.playerPrice}>{Number(player.price).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</p>
                    <p className={`${styles.playerChange} ${player.change >= 0 ? styles.playerChangeUp : styles.playerChangeDown}`}>
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
