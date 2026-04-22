import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL;
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
export const getPlayerImageUrl = (playerId) => `${API_URL}/v1/players/${playerId}/image`;

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
});

export const getPlayers = async (params = {}) => {
    try {
        const response = await api.get('/v1/players', { params });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || error.response?.data?.error || 'Error fetching players');
    }
};

export const getPlayerById = async (id) => {
    try {
        const response = await api.get(`/v1/players/${id}`);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || error.response?.data?.error || 'Error fetching player details');
    }
};

export const getLeagues = async () => {
    try {
        const response = await api.get('/v1/players/leagues');
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || error.response?.data?.error || 'Error fetching leagues');
    }
};

export const getPortfolio = async () => {
    try {
        const response = await api.get('/v1/portfolio');
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || error.response?.data?.error || 'Error fetching portfolio');
    }
};

export const getPortfolioHistory = async (timeframe = '1D') => {
    try {
        const response = await api.get('/v1/portfolio/history', { params: { timeframe } });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || error.response?.data?.error || 'Error fetching portfolio history');
    }
};

export const loginUser = async (email, password) => {
    try {
        const response = await api.post('/v1/user/login', { email, password });
        return response.data;
    } catch (error) {
        const err = new Error(error.response?.data?.message || error.response?.data?.error || 'Error al iniciar sesión');
        err.status = error.response?.status;
        err.data = error.response?.data;
        throw err;
    }
};

export const registerUser = async (username, email, password) => {
    try {
        const response = await api.post('/v1/user/signup', { username, email, password });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || error.response?.data?.error || 'Error al registrarse');
    }
};

export const verifyEmail = async (email, code) => {
    try {
        const response = await api.post('/v1/user/verify-email', { email, code });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || error.response?.data?.error || 'Código inválido');
    }
};

export const googleLogin = async (idToken) => {
    try {
        const response = await api.post('/v1/user/google', { idToken });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || error.response?.data?.error || 'Error con Google');
    }
};


export const initGoogleSignIn = (callback) => {
    if (!window.google) {
        setTimeout(() => initGoogleSignIn(callback), 200);
        return;
    }
    window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: callback,
    });
};

export const getMe = async () => {
    try {
        const response = await api.get('/v1/user/me');
        return response.data;
    } catch (error) {
        const err = new Error('Failed to fetch user data');
        err.status = error.response?.status;
        throw err;
    }
};

export const logout = async () => {
    try {
        await api.post('/v1/user/logout');
    } catch (error) {
        console.error('Logout failed:', error);
    }
};

export const getPublicProfile = async (userId) => {
    try {
        const response = await api.get(`/v1/user/${userId}/public-profile`);
        return response.data;
    } catch (error) {
        throw new Error('Failed to fetch public profile');
    }
};

export const getTeamMarket = async (search = '', league_id = null) => {
    try {
        const response = await api.get('/v1/teams/market', {
            params: { search, league_id }
        });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || 'Error fetching team market');
    }
};

export const getTeamById = async (id) => {
    try {
        const response = await api.get(`/v1/teams/${id}`);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || 'Error fetching team details');
    }
};

export const getTeamHistory = async (id) => {
    try {
        const response = await api.get(`/v1/teams/${id}/history`);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || 'Error fetching team history');
    }
};

export const teamMarketBuy = async (teamId, totalValue) => {
    try {
        const response = await api.post('/v1/trades/team-market-buy', { teamId, totalValue });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || 'Error executing team buy');
    }
};

export const teamMarketSell = async (teamId, quantity) => {
    try {
        const response = await api.post('/v1/trades/team-market-sell', { teamId, quantity });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || 'Error executing team sell');
    }
};

export const getUserTradeHistory = async () => {
    try {
        const response = await api.get('/v1/trades/user/history');
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || 'Error fetching user trade history');
    }
};

export const getPlayerHistory = async (id, timeframe = 'line') => {
    try {
        const response = await api.get(`/v1/players/${id}/history`, {
            params: { timeframe }
        });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || 'Error fetching player history');
    }
};

export const getPlayerTradeHistory = async (id) => {
    try {
        const response = await api.get(`/v1/trades/history/${id}`);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || 'Error fetching player trade history');
    }
};

export const marketBuy = async (playerId, totalValue, expectedPrice) => {
    try {
        const response = await api.post('/v1/trades/market-buy', { playerId, totalValue, expectedPrice });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || 'Error executing market buy');
    }
};

export const marketSell = async (playerId, quantity, expectedPrice) => {
    try {
        const response = await api.post('/v1/trades/market-sell', { playerId, quantity, expectedPrice });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || 'Error executing market sell');
    }
};

export const getTradeConfig = async () => {
    try {
        const response = await api.get('/v1/trades/config');
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || 'Error fetching trade config');
    }
};

export const getLeaderboard = async () => {
    try {
        const response = await api.get('/v1/leaderboard');
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || 'Error fetching leaderboard');
    }
};

export const placeOrder = async (playerId, side, price, quantity) => {
    try {
        const response = await api.post('/v1/trades/order', { playerId, side, price, quantity });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || 'Error placing order');
    }
};

export const getTradeById = async (id) => {
    try {
        const response = await api.get(`/v1/trades/${id}`);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.error || 'Error fetching trade details');
    }
};
