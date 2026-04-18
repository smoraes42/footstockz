export const Side = {
    BUY: 'Buy',
    SELL: 'Sell'
};

export const OrderType = {
    GOOD_TILL_CANCEL: 'GoodTillCancel',
    FILL_AND_KILL: 'FillAndKill'
};

/**
 * Represents a single order in the order book.
 */
export class Order {
    constructor(orderType, orderId, side, price, initialQuantity) {
        this.orderType = orderType;
        this.orderId = orderId;
        this.side = side;
        this.price = price;
        this.initialQuantity = initialQuantity;
        this.remainingQuantity = initialQuantity;
        this.timestamp = Date.now(); // Used to determine priority (FIFO)
    }

    getOrderId() {
        return this.orderId;
    }

    getSide() {
        return this.side;
    }

    getPrice() {
        return this.price;
    }

    getOrderType() {
        return this.orderType;
    }

    getInitialQuantity() {
        return this.initialQuantity;
    }

    getRemainingQuantity() {
        return this.remainingQuantity;
    }

    getFilledQuantity() {
        return this.initialQuantity - this.remainingQuantity;
    }

    isFilled() {
        return this.remainingQuantity === 0;
    }

    fill(quantity) {
        if (quantity <= this.remainingQuantity) {
            this.remainingQuantity -= quantity;
        } else {
            throw new Error("Cannot fill more than remaining quantity");
        }
    }
}

export class OrderModify {
    constructor(orderId, side, price, quantity) {
        this.orderId = orderId;
        this.side = side;
        this.price = price;
        this.quantity = quantity;
    }
}

export class TradeInfo {
    constructor(orderId, price, quantity) {
        this.orderId = orderId;
        this.price = price;
        this.quantity = quantity;
    }
}

export class Trade {
    constructor(bidTrade, askTrade) {
        this.bidTrade = bidTrade;
        this.askTrade = askTrade;
    }
}

export class OrderBookLevelInfo {
    constructor(price, quantity) {
        this.price = price;
        this.quantity = quantity; // Aggregate quantity for this price level
    }
}

/**
 * The core matching engine order book limit mechanism.
 */
export class OrderBook {
    constructor() {
        // Array of price levels { price: number, orders: Order[] }
        // Bids are sorted descending (highest price first to match worst case asks)
        this.bids = [];
        // Asks are sorted ascending (lowest price first to match worst case bids)
        this.asks = [];

        // Quick lookup mapping orderId -> Order
        this.orders = new Map();
    }

    // Internal helper to insert order maintaining correct price sorting
    _insertOrder(order, levels, isDescending) {
        let level = levels.find(l => l.price === order.price);

        if (!level) {
            // Create new price level if none exists
            level = { price: order.price, orders: [] };
            levels.push(level);
            // Re-sort array
            levels.sort((a, b) => isDescending ? b.price - a.price : a.price - b.price);
        }
        // Append at the end (FIFO priority within same price level)
        level.orders.push(order);
    }

    // Internal helper to clear a cancelled order from the sorted arrays
    _removeOrderFromLevel(order, levels) {
        const levelIndex = levels.findIndex(l => l.price === order.price);
        if (levelIndex !== -1) {
            const level = levels[levelIndex];
            // Filter out the cancelled order by ID
            level.orders = level.orders.filter(o => o.orderId !== order.orderId);
            // Clean up the price level if it becomes empty
            if (level.orders.length === 0) {
                levels.splice(levelIndex, 1);
            }
        }
    }

    /**
     * Evaluates if a given price can be instantly matched against current liquidity
     */
    canMatch(side, price) {
        if (side === Side.BUY) {
            if (this.asks.length === 0) return false;
            const bestAsk = this.asks[0].price;
            return price >= bestAsk;
        } else {
            if (this.bids.length === 0) return false;
            const bestBid = this.bids[0].price;
            return price <= bestBid;
        }
    }

    /**
     * Adds an order to the book and immediately attempts to match it
     */
    addOrder(orderType, orderId, side, price, quantity) {
        if (this.orders.has(orderId)) {
            return []; // Replaced throwing Error for empty return to match C++ behavior
        }

        if (orderType === OrderType.FILL_AND_KILL && !this.canMatch(side, price)) {
            return [];
        }

        const order = new Order(orderType, orderId, side, price, quantity);
        this.orders.set(orderId, order);

        if (side === Side.BUY) {
            this._insertOrder(order, this.bids, true);
        } else {
            this._insertOrder(order, this.asks, false);
        }

        return this.matchOrders();
    }

    /**
     * Modifies an existing order (equivalent to MatchOrder(OrderModify) in C++)
     */
    modifyOrder(orderModify) {
        if (!this.orders.has(orderModify.orderId)) {
            return [];
        }

        const existingOrder = this.orders.get(orderModify.orderId);
        this.cancelOrder(orderModify.orderId);

        return this.addOrder(
            existingOrder.getOrderType(),
            orderModify.orderId,
            orderModify.side,
            orderModify.price,
            orderModify.quantity
        );
    }

    /**
     * Returns the total amount of active orders
     */
    size() {
        return this.orders.size;
    }

    /**
     * Removes an order from the order book by its ID
     */
    cancelOrder(orderId) {
        const order = this.orders.get(orderId);
        if (!order) return false;

        if (order.side === Side.BUY) {
            this._removeOrderFromLevel(order, this.bids);
        } else {
            this._removeOrderFromLevel(order, this.asks);
        }

        this.orders.delete(orderId);
        return true;
    }

    /**
     * Core order matching algorithm processing both bid and ask queues
     */
    matchOrders() {
        const trades = [];

        while (true) {
            if (this.bids.length === 0 || this.asks.length === 0) {
                break; // Stop if either side doesn't have liquidity
            }

            const bestBidLevel = this.bids[0];
            const bestAskLevel = this.asks[0];

            // If the highest bid is below the lowest ask, no crossover/matches can occur
            if (bestBidLevel.price < bestAskLevel.price) {
                break;
            }

            // Keep matching at the current best price levels while orders exist inside them
            while (bestBidLevel.orders.length > 0 && bestAskLevel.orders.length > 0) {
                const bid = bestBidLevel.orders[0];
                const ask = bestAskLevel.orders[0];

                const quantity = Math.min(bid.getRemainingQuantity(), ask.getRemainingQuantity());

                // Execute trade at the standing (maker) order's price
                const price = bid.timestamp < ask.timestamp ? bid.price : ask.price;

                bid.fill(quantity);
                ask.fill(quantity);

                // Remove fully filled orders from their respective levels
                if (bid.isFilled()) {
                    bestBidLevel.orders.shift();
                    this.orders.delete(bid.orderId);
                }

                if (ask.isFilled()) {
                    bestAskLevel.orders.shift();
                    this.orders.delete(ask.orderId);
                }

                trades.push(
                    new Trade(
                        new TradeInfo(bid.orderId, price, quantity),
                        new TradeInfo(ask.orderId, price, quantity)
                    )
                );
            }

            // Cleanup fully depleted price levels
            if (bestBidLevel.orders.length === 0) {
                this.bids.shift();
            }

            if (bestAskLevel.orders.length === 0) {
                this.asks.shift();
            }
        }

        // Process FillAndKill logic: cancel partial/unfilled FOK orders remaining at the top
        if (this.bids.length > 0) {
            const bestBid = this.bids[0].orders[0];
            if (bestBid && bestBid.getOrderType() === OrderType.FILL_AND_KILL) {
                this.cancelOrder(bestBid.orderId);
            }
        }

        if (this.asks.length > 0) {
            const bestAsk = this.asks[0].orders[0];
            if (bestAsk && bestAsk.getOrderType() === OrderType.FILL_AND_KILL) {
                this.cancelOrder(bestAsk.orderId);
            }
        }

        return trades;
    }

    /**
     * Helper to retrieve current aggregated order book state (grouped by price levels)
     */
    getOrderInfos() {
        const getInfos = (levels) => {
            return levels.map(level => {
                const totalQuantity = level.orders.reduce((sum, order) => sum + order.getRemainingQuantity(), 0);
                return new OrderBookLevelInfo(level.price, totalQuantity);
            });
        };

        return {
            asks: getInfos(this.asks), // Lowest prices first
            bids: getInfos(this.bids)  // Highest prices first
        };
    }
}
