import pool from '../database/db1.js';
import { CONFIG } from '../config.js';
import socketService from './socketService.js';


class TradeEngine {
    constructor() {
        this.PRICE_IMPACT_FACTOR = CONFIG.PRICE_IMPACT_FACTOR;
        this.MAX_PRICE_IMPACT_LIMIT = CONFIG.MAX_PRICE_IMPACT_LIMIT;
        console.log('TradeEngine initialized (House Pool AMM Model with Continuous Pricing)');
    }

    /**
     * Records a snapshot of the user's portfolio into portfolio_history.
     * Must be called inside an open transaction, using the same connection.
     */
    async _recordPortfolioSnapshot(connection, userId) {
        const [walletRows] = await connection.query('SELECT value FROM wallets WHERE user_id = ?', [userId]);
        const walletValue = parseFloat(walletRows[0]?.value) || 0;

        const [holdingsRows] = await connection.query(`
            SELECT pp.proportion as shares, p.initial_price as p0
            FROM player_positions pp
            JOIN players p ON pp.player_id = p.id
            WHERE pp.user_id = ? AND pp.proportion > 0
        `, [userId]);

        const [teamHoldingsRows] = await connection.query(`
            SELECT tp.proportion as shares, t.id as team_id
            FROM team_positions tp
            JOIN teams t ON tp.team_id = t.id
            WHERE tp.user_id = ? AND tp.proportion > 0
        `, [userId]);

        let holdingsValue = 0;
        const k = this.PRICE_IMPACT_FACTOR;
        
        // Player holdings value
        holdingsRows.forEach(row => {
            const p0 = parseFloat(row.p0) || 0;
            const shares = parseFloat(row.shares) || 0;
            const v = (p0 / k) * (1 - Math.exp(-k * shares));
            holdingsValue += v;
        });

        // Team holdings value
        for (const row of teamHoldingsRows) {
            const [teamPlayers] = await connection.query('SELECT initial_price FROM players WHERE team_id = ?', [row.team_id]);
            const teamPriceSpot = teamPlayers.reduce((sum, p) => sum + (parseFloat(p.initial_price) || 0), 0);
            const shares = parseFloat(row.shares) || 0;
            const v = (teamPriceSpot / k) * (1 - Math.exp(-k * shares));
            holdingsValue += v;
        }

        const totalEquity = walletValue + holdingsValue;

        await connection.query(
            'INSERT INTO portfolio_history (user_id, wallet_value, holdings_value, total_equity) VALUES (?, ?, ?, ?)',
            [userId, walletValue, holdingsValue, totalEquity]
        );
    }

    /**
     * Validates that the current price is within the user's slippage tolerance.
     */
    _validateSlippage(currentPrice, side, slippageParams) {
        if (!slippageParams || !slippageParams.expectedPrice || !slippageParams.maxSlippage) return;

        const { expectedPrice, maxSlippage } = slippageParams;
        if (side === 'buy') {
            const maxAllowedPrice = expectedPrice * (1 + maxSlippage);
            if (currentPrice > maxAllowedPrice) {
                throw new Error(`Slippage exceeded: Current price ${currentPrice.toFixed(4)} is above your limit of ${maxAllowedPrice.toFixed(4)}`);
            }
        } else if (side === 'sell') {
            const minAllowedPrice = expectedPrice * (1 - maxSlippage);
            if (currentPrice < minAllowedPrice) {
                throw new Error(`Slippage exceeded: Current price ${currentPrice.toFixed(4)} is below your limit of ${minAllowedPrice.toFixed(4)}`);
            }
        }
    }

    /**
     * Validates that the order doesn't exceed the maximum allowed price impact.
     */
    _validatePriceImpact(quantity) {
        const impact = Math.abs(this.PRICE_IMPACT_FACTOR * quantity);
        if (impact > this.MAX_PRICE_IMPACT_LIMIT) {
            throw new Error(`Order size too large: Price impact (${(impact * 100).toFixed(2)}%) exceeds the ${(this.MAX_PRICE_IMPACT_LIMIT * 100).toFixed(0)}% limit.`);
        }
    }

    /**
     * Limit orders are deprecated in the House Pool model.
     */
    async placeOrder(userId, playerId, side, price, quantity, type) {
        throw new Error('Limit orders are disabled in the House Pool model. Please use Market Buy/Sell.');
    }

    /**
     * Limit orders are deprecated in the House Pool model.
     */
    async cancelOrder(orderId, userId) {
        throw new Error('Limit orders are disabled in the House Pool model.');
    }

    /**
     * Executes a market buy order for a fixed total Euro value directly from the House.
     */
    async placeMarketBuyByValue(userId, playerId, totalValue, slippageParams) {
        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            // 1. Get current price and reference price
            const [playerRows] = await connection.query('SELECT initial_price, reference_price FROM players WHERE id = ? FOR UPDATE', [playerId]);
            if (playerRows.length === 0) throw new Error('Player not found.');
            const currentPrice = parseFloat(playerRows[0].initial_price);
            const referencePrice = parseFloat(playerRows[0].reference_price) || currentPrice;

            // 1.1 Validate Slippage
            this._validateSlippage(currentPrice, 'buy', slippageParams);

            const k = this.PRICE_IMPACT_FACTOR;

            // 2. Solve for quantity: V = (P0 / k) * (e^(kQ) - 1)
            // e^(kQ) = (V * k / P0) + 1
            // Q = ln(V * k / P0 + 1) / k
            const quantity = Math.log((totalValue * k / currentPrice) + 1) / k;

            // 2.1 Validate Price Impact
            this._validatePriceImpact(quantity);

            // 3. Check wallet
            const [walletRows] = await connection.query('SELECT value FROM wallets WHERE user_id = ? FOR UPDATE', [userId]);
            const walletBalance = parseFloat(walletRows[0]?.value) || 0;
            if (walletRows.length === 0 || walletBalance < totalValue) {
                throw new Error('Insufficient wallet balance to complete this trade.');
            }

            // 4. Deduct from wallet
            await connection.query('UPDATE wallets SET value = value - ? WHERE user_id = ?', [totalValue, userId]);

            // 5. Add to player positions
            const [positionRows] = await connection.query('SELECT id FROM player_positions WHERE user_id = ? AND player_id = ?', [userId, playerId]);
            if (positionRows.length > 0) {
                await connection.query('UPDATE player_positions SET proportion = proportion + ? WHERE user_id = ? AND player_id = ?', [quantity, userId, playerId]);
            } else {
                await connection.query('INSERT INTO player_positions (user_id, player_id, proportion) VALUES (?, ?, ?)', [userId, playerId, quantity]);
            }

            // 6. Update player metrics (Exponential Pricing)
            const newPrice = currentPrice * Math.exp(quantity * k); // Corrected from instruction: Math.exp(-quantity * k) would decrease price on buy
            await connection.query(`
                UPDATE players 
                SET initial_price = ?, 
                    total_stock = total_stock + ?,
                    pool_amount = pool_amount + ?
                WHERE id = ?
            `, [newPrice, quantity, totalValue, playerId]);
            
            await connection.query('INSERT INTO player_prices (player_id, price) VALUES (?, ?)', [playerId, newPrice]);

            // 7. Log Trade
            const avgPrice = totalValue / quantity;
            await connection.query('INSERT INTO trades (user_id, player_id, side, price, quantity, total_value) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, playerId, 'buy', avgPrice, quantity, totalValue]);

            // 8. Record portfolio snapshot
            await this._recordPortfolioSnapshot(connection, userId);

            await connection.commit();

            // 9. Emit real-time updates
            const change = ((newPrice - referencePrice) / referencePrice) * 100;
            socketService.emitPriceUpdate(playerId, newPrice, change);
            socketService.emitTradeExecuted(playerId, {
                side: 'buy',
                price: avgPrice,
                quantity: quantity,
                totalValue: totalValue,
                username: 'You'
            });
            socketService.emitPortfolioUpdate(userId, { type: 'TRADE_EXECUTED' });

            return {
                status: 'success',
                sharesBought: quantity,
                totalSpent: totalValue,
                avgPrice: avgPrice,
                spotPriceBefore: currentPrice,
                spotPriceAfter: newPrice
            };

        } catch (error) {
            if (connection) await connection.rollback();
            throw error;
        } finally {
            if (connection) connection.release();
        }
    }

    /**
     * Executes a market buy order for a fixed quantity of shares directly from the House.
     */
    async placeMarketBuyByQuantity(userId, playerId, quantity, slippageParams) {
        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            const [playerRows] = await connection.query('SELECT initial_price, reference_price FROM players WHERE id = ? FOR UPDATE', [playerId]);
            if (playerRows.length === 0) throw new Error('Player not found.');
            const currentPrice = parseFloat(playerRows[0].initial_price);
            const referencePrice = parseFloat(playerRows[0].reference_price) || currentPrice;

            // 1. Validate Slippage
            this._validateSlippage(currentPrice, 'buy', slippageParams);

            // 1.1 Validate Price Impact
            this._validatePriceImpact(quantity);

            const k = this.PRICE_IMPACT_FACTOR;

            // 1. Calculate total cost using integral: Cost = (P0 / k) * (e^(kQ) - 1)
            const totalCost = (currentPrice / k) * (Math.exp(k * quantity) - 1);

            const [walletRows] = await connection.query('SELECT value FROM wallets WHERE user_id = ? FOR UPDATE', [userId]);
            const walletBalance = parseFloat(walletRows[0]?.value) || 0;
            if (walletRows.length === 0 || walletBalance < totalCost) {
                throw new Error('Insufficient wallet balance to complete this trade.');
            }

            await connection.query('UPDATE wallets SET value = value - ? WHERE user_id = ?', [totalCost, userId]);

            const [positionRows] = await connection.query('SELECT id FROM player_positions WHERE user_id = ? AND player_id = ?', [userId, playerId]);
            if (positionRows.length > 0) {
                await connection.query('UPDATE player_positions SET proportion = proportion + ? WHERE user_id = ? AND player_id = ?', [quantity, userId, playerId]);
            } else {
                await connection.query('INSERT INTO player_positions (user_id, player_id, proportion) VALUES (?, ?, ?)', [userId, playerId, quantity]);
            }

            // Update price and supply
            const newPrice = currentPrice * Math.exp(quantity * k);

            await connection.query(`
                UPDATE players 
                SET initial_price = ?, 
                    total_stock = total_stock + ?,
                    pool_amount = pool_amount + ?
                WHERE id = ?
            `, [newPrice, quantity, totalCost, playerId]);

            await connection.query('INSERT INTO player_prices (player_id, price) VALUES (?, ?)', [playerId, newPrice]);

            // Log Trade
            const avgPrice = totalCost / quantity;
            await connection.query('INSERT INTO trades (user_id, player_id, side, price, quantity, total_value) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, playerId, 'buy', avgPrice, quantity, totalCost]);

            // Record portfolio snapshot
            await this._recordPortfolioSnapshot(connection, userId);

            await connection.commit();

            // 9. Emit real-time updates
            const change = ((newPrice - referencePrice) / referencePrice) * 100;
            socketService.emitPriceUpdate(playerId, newPrice, change);
            socketService.emitTradeExecuted(playerId, {
                side: 'buy',
                price: avgPrice,
                quantity: quantity,
                totalValue: totalCost,
                username: 'You'
            });
            socketService.emitPortfolioUpdate(userId, { type: 'TRADE_EXECUTED' });

            return {
                status: 'success',
                sharesBought: quantity,
                totalSpent: totalCost,
                avgPrice: avgPrice,
                spotPriceBefore: currentPrice,
                spotPriceAfter: newPrice
            };

        } catch (error) {
            if (connection) await connection.rollback();
            throw error;
        } finally {
            if (connection) connection.release();
        }
    }

    /**
     * Executes a market sell order for a fixed quantity of shares directly to the House.
     */
    async placeMarketSell(userId, playerId, quantity, slippageParams) {
        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            const [playerRows] = await connection.query('SELECT initial_price, reference_price FROM players WHERE id = ? FOR UPDATE', [playerId]);
            if (playerRows.length === 0) throw new Error('Player not found.');
            const currentPrice = parseFloat(playerRows[0].initial_price);
            const referencePrice = parseFloat(playerRows[0].reference_price) || currentPrice;

            // 1. Validate Slippage
            this._validateSlippage(currentPrice, 'sell', slippageParams);

            // 1.1 Validate Price Impact
            this._validatePriceImpact(quantity);

            const k = this.PRICE_IMPACT_FACTOR;

            // 1. Calculate total value received using integral: Value = (P0 / k) * (1 - e^(-kQ))
            const totalValueReceived = (currentPrice / k) * (1 - Math.exp(-k * quantity));

            const [positionRows] = await connection.query('SELECT proportion FROM player_positions WHERE user_id = ? AND player_id = ? FOR UPDATE', [userId, playerId]);
            const currentProportion = parseFloat(positionRows[0]?.proportion) || 0;
            const epsilon = 1e-6;
            if (positionRows.length === 0 || currentProportion < (quantity - epsilon)) {
                throw new Error('Insufficient player stock.');
            }

            await connection.query('UPDATE player_positions SET proportion = proportion - ? WHERE user_id = ? AND player_id = ?', [quantity, userId, playerId]);
            await connection.query('UPDATE wallets SET value = value + ? WHERE user_id = ?', [totalValueReceived, userId]);

            // 2. Update price and supply (decrement)
            const newPrice = currentPrice * (1 - (quantity * k));
            // Ensure price doesn't drop below a minimum threshold, e.g. 0.01
            const finalPrice = Math.max(0.01, newPrice);

            await connection.query(`
                UPDATE players 
                SET initial_price = ?, 
                    total_stock = total_stock - ?,
                    pool_amount = pool_amount - ?
                WHERE id = ?
            `, [finalPrice, quantity, totalValueReceived, playerId]);

            await connection.query('INSERT INTO player_prices (player_id, price) VALUES (?, ?)', [playerId, finalPrice]);

            // Log Trade
            const avgPrice = totalValueReceived / quantity;
            await connection.query('INSERT INTO trades (user_id, player_id, side, price, quantity, total_value) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, playerId, 'sell', avgPrice, quantity, totalValueReceived]);

            // Record portfolio snapshot
            await this._recordPortfolioSnapshot(connection, userId);

            await connection.commit();

            // 9. Emit real-time updates
            const change = ((finalPrice - referencePrice) / referencePrice) * 100;
            socketService.emitPriceUpdate(playerId, finalPrice, change);
            socketService.emitTradeExecuted(playerId, {
                side: 'sell',
                price: avgPrice,
                quantity: quantity,
                totalValue: totalValueReceived,
                username: 'You'
            });
            socketService.emitPortfolioUpdate(userId, { type: 'TRADE_EXECUTED' });

            return {
                status: 'success',
                sharesSold: quantity,
                totalReceived: totalValueReceived,
                avgPrice: avgPrice,
                spotPriceBefore: currentPrice,
                spotPriceAfter: finalPrice
            };

        } catch (error) {
            if (connection) await connection.rollback();
            throw error;
        } finally {
            if (connection) connection.release();
        }
    }

    /**
     * Executes a market sell order for a fixed total Euro value directly to the House.
     */
    async placeMarketSellByValue(userId, playerId, totalValue, slippageParams) {
        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            const [playerRows] = await connection.query('SELECT initial_price, reference_price FROM players WHERE id = ? FOR UPDATE', [playerId]);
            if (playerRows.length === 0) throw new Error('Player not found.');
            const currentPrice = parseFloat(playerRows[0].initial_price);
            const referencePrice = parseFloat(playerRows[0].reference_price) || currentPrice;

            // 1. Validate Slippage
            this._validateSlippage(currentPrice, 'sell', slippageParams);

            const k = this.PRICE_IMPACT_FACTOR;

            // 1. Solve for quantity: V = (P0 / k) * (1 - e^(-kQ))
            // 1 - V*k/P0 = e^(-kQ)
            // -kQ = ln(1 - V*k/P0)
            // Q = -ln(1 - V*k/P0) / k
            const inner = 1 - (totalValue * k / currentPrice);
            if (inner <= 0) {
                throw new Error('Order too large for available liquidity pool.');
            }
            const quantity = -Math.log(inner) / k;

            // 1.1 Validate Price Impact
            this._validatePriceImpact(quantity);

            const [positionRows] = await connection.query('SELECT proportion FROM player_positions WHERE user_id = ? AND player_id = ? FOR UPDATE', [userId, playerId]);
            const currentProportion = parseFloat(positionRows[0]?.proportion) || 0;
            const epsilon = 1e-6;
            if (positionRows.length === 0 || currentProportion < (quantity - epsilon)) {
                throw new Error('Insufficient player stock.');
            }

            await connection.query('UPDATE player_positions SET proportion = proportion - ? WHERE user_id = ? AND player_id = ?', [quantity, userId, playerId]);
            await connection.query('UPDATE wallets SET value = value + ? WHERE user_id = ?', [totalValue, userId]);

            // 2. Update price and supply
            const newPrice = currentPrice * Math.exp(-quantity * k);
            const finalPrice = Math.max(0.01, newPrice);

            await connection.query(`
                UPDATE players 
                SET initial_price = ?, 
                    total_stock = total_stock - ?,
                    pool_amount = pool_amount - ?
                WHERE id = ?
            `, [finalPrice, quantity, parseFloat(totalValue), playerId]);

            await connection.query('INSERT INTO player_prices (player_id, price) VALUES (?, ?)', [playerId, finalPrice]);

            // Log Trade
            const avgPrice = totalValue / quantity;
            await connection.query('INSERT INTO trades (user_id, player_id, side, price, quantity, total_value) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, playerId, 'sell', avgPrice, quantity, totalValue]);

            // Record portfolio snapshot
            await this._recordPortfolioSnapshot(connection, userId);

            await connection.commit();

            // 9. Emit real-time updates
            const change = ((finalPrice - referencePrice) / referencePrice) * 100;
            socketService.emitPriceUpdate(playerId, finalPrice, change);
            socketService.emitTradeExecuted(playerId, {
                side: 'sell',
                price: avgPrice,
                quantity: quantity,
                totalValue: totalValue,
                username: 'You'
            });
            socketService.emitPortfolioUpdate(userId, { type: 'TRADE_EXECUTED' });

            return {
                status: 'success',
                sharesSold: quantity,
                totalReceived: totalValue,
                avgPrice: avgPrice,
                spotPriceBefore: currentPrice,
                spotPriceAfter: finalPrice
            };

        } catch (error) {
            if (connection) await connection.rollback();
            throw error;
        } finally {
            if (connection) connection.release();
        }
    }

    /**
     * Executes a market buy order for a whole team for a fixed total Euro value.
     */
    async placeTeamMarketBuyByValue(userId, teamId, totalValue, slippageParams) {
        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            // 1. Get all players in the team
            const [players] = await connection.query(`
                SELECT id, initial_price, reference_price 
                FROM players 
                WHERE team_id = ? 
                FOR UPDATE
            `, [teamId]);

            if (players.length === 0) throw new Error('Team not found or has no players.');
            
            // Explicitly parse initial_price as float to avoid string concatenation in reduce
            const teamPriceSpot = players.reduce((sum, p) => sum + (parseFloat(p.initial_price) || 0), 0);
            const k = this.PRICE_IMPACT_FACTOR;

            // 2. Solve for team shares N: V = (S/k) * (e^kN - 1) => N = ln(1 + Vk/S) / k
            const quantity = Math.log((totalValue * k / teamPriceSpot) + 1) / k;

            // 2.1 Validate Price Impact (on the aggregate position)
            this._validatePriceImpact(quantity);

            // 3. Check wallet
            const [walletRows] = await connection.query('SELECT value FROM wallets WHERE user_id = ? FOR UPDATE', [userId]);
            const walletBalance = parseFloat(walletRows[0]?.value) || 0;
            if (walletRows.length === 0 || walletBalance < totalValue) {
                throw new Error('Insufficient wallet balance.');
            }

            // 4. Deduct from wallet
            await connection.query('UPDATE wallets SET value = value - ? WHERE user_id = ?', [totalValue, userId]);

            // 5. Execute purchase: Update Team Position and individual Player Prices
            const [teamPos] = await connection.query('SELECT id FROM team_positions WHERE user_id = ? AND team_id = ?', [userId, teamId]);
            if (teamPos.length > 0) {
                await connection.query('UPDATE team_positions SET proportion = proportion + ? WHERE id = ?', [quantity, teamPos[0].id]);
            } else {
                await connection.query('INSERT INTO team_positions (user_id, team_id, proportion) VALUES (?, ?, ?)', [userId, teamId, quantity]);
            }

            for (const player of players) {
                const p0 = parseFloat(player.initial_price) || 0;
                const pRef = parseFloat(player.reference_price) || p0;
                
                // Individual player impact for N shares: c = (p0/k) * (e^kN - 1)
                const playerCost = (p0 / k) * (Math.exp(k * quantity) - 1);
                const newPrice = p0 * Math.exp(quantity * k);

                // Update player (No individual position update here anymore)
                await connection.query(`
                    UPDATE players 
                    SET initial_price = ?, total_stock = total_stock + ?, pool_amount = pool_amount + ?
                    WHERE id = ?
                `, [newPrice, quantity, playerCost, player.id]);

                await connection.query('INSERT INTO player_prices (player_id, price) VALUES (?, ?)', [player.id, newPrice]);

                // Emit updates
                socketService.emitPriceUpdate(player.id, newPrice, ((newPrice - pRef) / pRef) * 100);
            }

            // Record a single trade entry with team_id
            const avgPrice = totalValue / quantity;
            await connection.query('INSERT INTO trades (user_id, team_id, side, price, quantity, total_value) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, teamId, 'buy', avgPrice, quantity, totalValue]);

            // 6. Record portfolio snapshot
            await this._recordPortfolioSnapshot(connection, userId);

            await connection.commit();

            socketService.emitPortfolioUpdate(userId, { type: 'TEAM_TRADE_EXECUTED', teamId });

            return {
                status: 'success',
                teamSharesBought: quantity,
                totalSpent: totalValue,
                teamSpotPriceBefore: teamPriceSpot
            };

        } catch (error) {
            if (connection) await connection.rollback();
            throw error;
        } finally {
            if (connection) connection.release();
        }
    }

    /**
     * Executes a market sell order for a whole team for a fixed quantity of team shares.
     */
    async placeTeamMarketSell(userId, teamId, quantity, slippageParams) {
        let connection;
        try {
            connection = await pool.getConnection();
            await connection.beginTransaction();

            const [players] = await connection.query(`
                SELECT id, initial_price, reference_price 
                FROM players 
                WHERE team_id = ? 
                FOR UPDATE
            `, [teamId]);

            if (players.length === 0) throw new Error('Team not found.');

            // Explicitly parse initial_price as float to avoid string concatenation in reduce
            const teamPriceSpot = players.reduce((sum, p) => sum + (parseFloat(p.initial_price) || 0), 0);
            const k = this.PRICE_IMPACT_FACTOR;
            let totalValueReceived = 0;

            // 1. Check if user has enough of the TEAM
            const epsilon = 1e-6;
            const [teamPos] = await connection.query('SELECT id, proportion FROM team_positions WHERE user_id = ? AND team_id = ? FOR UPDATE', [userId, teamId]);
            const currentProportion = parseFloat(teamPos[0]?.proportion) || 0;
            if (!teamPos.length || currentProportion < (quantity - epsilon)) {
                throw new Error('Insufficient team shares.');
            }

            // 2. Execute sell for each player to update prices
            for (const player of players) {
                const p0 = parseFloat(player.initial_price) || 0;
                const pRef = parseFloat(player.reference_price) || p0;
                
                // Value received: v = (p0/k) * (1 - e^-kN)
                const playerValue = (p0 / k) * (1 - Math.exp(-k * quantity));
                totalValueReceived += playerValue;

                const newPrice = Math.max(0.01, p0 * Math.exp(-quantity * k));

                await connection.query(`
                    UPDATE players SET initial_price = ?, total_stock = total_stock - ?, pool_amount = pool_amount - ?
                    WHERE id = ?
                `, [newPrice, quantity, playerValue, player.id]);

                await connection.query('INSERT INTO player_prices (player_id, price) VALUES (?, ?)', [player.id, newPrice]);

                socketService.emitPriceUpdate(player.id, newPrice, ((newPrice - pRef) / pRef) * 100);
            }

            // 3. Update Team Position and Wallet
            await connection.query('UPDATE team_positions SET proportion = proportion - ? WHERE id = ?', [quantity, teamPos[0].id]);
            await connection.query('UPDATE wallets SET value = value + ? WHERE user_id = ?', [totalValueReceived, userId]);

            // 4. Log Trade
            const avgPrice = totalValueReceived / quantity;
            await connection.query('INSERT INTO trades (user_id, team_id, side, price, quantity, total_value) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, teamId, 'sell', avgPrice, quantity, totalValueReceived]);

            await this._recordPortfolioSnapshot(connection, userId);

            await connection.commit();

            socketService.emitPortfolioUpdate(userId, { type: 'TEAM_TRADE_EXECUTED', teamId });

            return {
                status: 'success',
                teamSharesSold: quantity,
                totalReceived: totalValueReceived,
                teamSpotPriceBefore: teamPriceSpot
            };

        } catch (error) {
            if (connection) await connection.rollback();
            throw error;
        } finally {
            if (connection) connection.release();
        }
    }

    /**
     * Depth chart is empty in a House Pool model.
     */
    getDepthChart(playerId) {
        return {
            asks: [],
            bids: []
        };
    }
}

const tradeEngineInstance = new TradeEngine();
export default tradeEngineInstance;
