/**
 * Global Configuration for FutStocks Trading Engine
 */
export const CONFIG = {
    // k in the bonding curve model P = P0 * (1 + kQ)
    PRICE_IMPACT_FACTOR: 0.0001,
    
    // Default max slippage as a multiplier (0.005 = 0.5%)
    DEFAULT_MAX_SLIPPAGE: 0.005,
    
    // Maximum price impact allowed per order
    MAX_PRICE_IMPACT_LIMIT: 999 
};
