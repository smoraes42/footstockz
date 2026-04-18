export const API_URL = import.meta.env.VITE_API_URL;
const API_BASE = `${API_URL}/v1/user`;
const API_PLAYERS = `${API_URL}/v1/players`;

export const getPlayers = async (params = {}) => {
    const { page = 1, limit = 50, search = '', league_id = '', team_id = '', sort_by = '', sort_dir = '' } = params;

    // Build query string dynamically to avoid trailing & or empty params
    const queryParams = new URLSearchParams();
    if (page) queryParams.append('page', page);
    if (limit) queryParams.append('limit', limit);
    if (search) queryParams.append('search', search);
    if (league_id) queryParams.append('league_id', league_id);
    if (team_id) queryParams.append('team_id', team_id);
    if (sort_by) queryParams.append('sort_by', sort_by);
    if (sort_dir) queryParams.append('sort_dir', sort_dir);

    const res = await fetch(`${API_PLAYERS}?${queryParams.toString()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.message || data.error || 'Error fetching players');
    }
    return data;
};

export const getPlayerById = async (id) => {
    const res = await fetch(`${API_PLAYERS}/${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.message || data.error || 'Error fetching player details');
    }
    return data;
};

export const getLeagues = async () => {
    const res = await fetch(`${API_PLAYERS}/leagues`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.message || data.error || 'Error fetching leagues');
    }
    return data;
};

export const getPortfolio = async () => {
    const res = await fetch(`${API_URL}/v1/portfolio`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.message || data.error || 'Error fetching portfolio');
    }
    return data;
};

export const getPortfolioHistory = async (timeframe = '1D') => {
    const res = await fetch(`${API_URL}/v1/portfolio/history?timeframe=${timeframe}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.message || data.error || 'Error fetching portfolio history');
    }
    return data;
};

export const loginUser = async (email, password) => {
    const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
        const error = new Error(data.message || data.error || 'Error al iniciar sesión');
        error.status = res.status;
        error.data = data;
        throw error;
    }
    return data;
};

export const registerUser = async (username, email, password) => {
    const res = await fetch(`${API_BASE}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.message || data.error || 'Error al registrarse');
    }
    return data;
};

export const verifyEmail = async (email, code) => {
    const res = await fetch(`${API_BASE}/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, code }),
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.message || data.error || 'Código inválido');
    }
    return data;
};

export const googleLogin = async (idToken) => {
    const res = await fetch(`${API_BASE}/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ idToken }),
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.message || data.error || 'Error con Google');
    }
    return data;
};

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

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
    const res = await fetch(`${API_BASE}/me`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
    });
    if (!res.ok) {
        const err = new Error('Failed to fetch user data');
        err.status = res.status;
        throw err;
    }
    return res.json();
};

export const logout = async () => {
    await fetch(`${API_BASE}/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
    });
};

export const getPublicProfile = async (userId) => {
    const res = await fetch(`${API_BASE}/${userId}/public-profile`, {
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
    });
    if (!res.ok) throw new Error('Failed to fetch public profile');
    return res.json();
};

export const getTeamMarket = async (search = '', league_id = null) => {
    const queryParams = new URLSearchParams();
    if (search) queryParams.append('search', search);
    if (league_id) queryParams.append('league_id', league_id);
    
    const url = `${API_URL}/v1/teams/market?${queryParams.toString()}`;
    const res = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error fetching team market');
    return data;
};

export const getTeamById = async (id) => {
    const res = await fetch(`${API_URL}/v1/teams/${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error fetching team details');
    return data;
};

export const getTeamHistory = async (id) => {
    const res = await fetch(`${API_URL}/v1/teams/${id}/history`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error fetching team history');
    return data;
};


export const teamMarketBuy = async (teamId, totalValue) => {
    const res = await fetch(`${API_URL}/v1/trades/team-market-buy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ teamId, totalValue }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error executing team buy');
    return data;
};

export const teamMarketSell = async (teamId, quantity) => {
    const res = await fetch(`${API_URL}/v1/trades/team-market-sell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ teamId, quantity }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error executing team sell');
    return data;
};

export const getUserTradeHistory = async () => {
    const res = await fetch(`${API_URL}/v1/trades/user/history`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error fetching user trade history');
    return data;
};
