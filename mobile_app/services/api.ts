import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../constants/Config';
export const BASE_URL = API_URL;

const API_BASE   = `${API_URL}/api/v1/user`;
const API_PLAYERS = `${API_URL}/api/v1/players`;
const API_TRADES  = `${API_URL}/api/v1/trades`;

// Helper to get headers with Auth token from SecureStore
const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
        const session = await SecureStore.getItemAsync('userSession');
        if (session) {
            const { token } = JSON.parse(session);
            if (token) headers['Authorization'] = `Bearer ${token}`;
        }
    } catch (e) {
        console.error('Error reading session from SecureStore', e);
    }
    return headers;
};

export const getPlayers = async (params: Record<string, any> = {}) => {
    const { page = 1, limit = 50, search = '', league_id = '', team_id = '', sort_by = '', sort_dir = '' } = params;

    const queryParams = new URLSearchParams();
    if (page)      queryParams.append('page', page);
    if (limit)     queryParams.append('limit', limit);
    if (search)    queryParams.append('search', search);
    if (league_id) queryParams.append('league_id', league_id);
    if (team_id)   queryParams.append('team_id', team_id);
    if (sort_by)   queryParams.append('sort_by', sort_by);
    if (sort_dir)  queryParams.append('sort_dir', sort_dir);

    const res = await fetch(`${API_PLAYERS}?${queryParams.toString()}`, {
        method: 'GET',
        headers: await getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Error fetching players');
    return data;
};

export const getPlayerById = async (id: number | string) => {
    const res = await fetch(`${API_PLAYERS}/${id}`, {
        method: 'GET',
        headers: await getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Error fetching player details');
    return data;
};

export const getLeagues = async () => {
    const res = await fetch(`${API_PLAYERS}/leagues`, {
        method: 'GET',
        headers: await getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Error fetching leagues');
    return data;
};

export const getPortfolio = async () => {
    const res = await fetch(`${API_URL}/api/v1/portfolio`, {
        method: 'GET',                          // was POST — backend now expects GET
        headers: await getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Error fetching portfolio');
    return data;
};

export const getPortfolioHistory = async (timeframe = '1D') => {
    const res = await fetch(`${API_URL}/api/v1/portfolio/history?timeframe=${timeframe}`, {
        method: 'GET',
        headers: await getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Error fetching portfolio history');
    return data;
};

export const loginUser = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
        const error: any = new Error(data.message || data.error || 'Error al iniciar sesión');
        error.status = res.status;
        error.data = data;
        throw error;
    }
    return data;
};

export const registerUser = async (username: string, email: string, password: string) => {
    const res = await fetch(`${API_BASE}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Error al registrarse');
    return data;
};

export const verifyEmail = async (email: string, code: string) => {
    const res = await fetch(`${API_BASE}/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Código inválido');
    return data;
};

export const getMe = async () => {
    const res = await fetch(`${API_BASE}/me`, {
        headers: await getAuthHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch user data');
    return res.json();
};

/**
 * Notifies the backend to invalidate the session.
 * Always call this before clearing local storage so the JWT is properly revoked.
 * Errors are intentionally ignored — the local session will be cleared regardless.
 */
export const logoutUser = async (): Promise<void> => {
    try {
        await fetch(`${API_BASE}/logout`, {
            method: 'POST',
            headers: await getAuthHeaders(),
        });
    } catch {
        // Network failure during logout is non-fatal
    }
};

export const getPlayerHistory = async (playerId: number | string) => {
    const res = await fetch(`${API_URL}/api/v1/players/${playerId}/history`, {
        method: 'GET',
        headers: await getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Error fetching player history');
    return data;
};

export const getTradeHistory = async (playerId: number | string) => {
    const res = await fetch(`${API_TRADES}/history/${playerId}`, {
        method: 'GET',
        headers: await getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Error fetching trade history');
    return data;
};

export const getUserTradeHistory = async () => {
    const res = await fetch(`${API_TRADES}/user/history`, {
        method: 'GET',
        headers: await getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Error fetching user trade history');
    return data;
};

export const marketBuy = async (
    playerId: number,
    quantity?: number,
    totalValue?: number,
    expectedPrice?: number
) => {
    const body: Record<string, any> = { playerId };
    if (quantity      != null) body.quantity      = quantity;
    if (totalValue    != null) body.totalValue    = totalValue;
    if (expectedPrice != null) body.expectedPrice = expectedPrice;

    const res = await fetch(`${API_TRADES}/market-buy`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Error executing buy');
    return data;
};

export const marketSell = async (
    playerId: number,
    quantity?: number,
    totalValue?: number,
    expectedPrice?: number
) => {
    const body: Record<string, any> = { playerId };
    if (quantity      != null) body.quantity      = quantity;
    if (totalValue    != null) body.totalValue    = totalValue;
    if (expectedPrice != null) body.expectedPrice = expectedPrice;

    const res = await fetch(`${API_TRADES}/market-sell`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Error executing sell');
    return data;
};

export const getLeaderboard = async () => {
    const res = await fetch(`${API_URL}/api/v1/leaderboard`, {
        method: 'GET',
        headers: await getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Error fetching leaderboard');
    return data;
};

export const getConfig = async () => {
    const res = await fetch(`${API_TRADES}/config`, {
        method: 'GET',
        headers: await getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || 'Error fetching config');
    return data;
};

// Team related functions
export const getTeamMarket = async (search = '', league_id = '') => {
    const queryParams = new URLSearchParams();
    if (search) queryParams.append('search', search);
    if (league_id) queryParams.append('league_id', league_id);

    const res = await fetch(`${API_URL}/api/v1/teams/market?${queryParams.toString()}`, {
        method: 'GET',
        headers: await getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error fetching team market');
    return data;
};

export const getTeamById = async (id: number | string) => {
    const res = await fetch(`${API_URL}/api/v1/teams/${id}`, {
        method: 'GET',
        headers: await getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error fetching team details');
    return data;
};

export const getTeamHistory = async (id: number | string) => {
    const res = await fetch(`${API_URL}/api/v1/teams/${id}/history`, {
        method: 'GET',
        headers: await getAuthHeaders(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error fetching team history');
    return data;
};

export const teamMarketBuy = async (teamId: number | string, totalValue: number) => {
    const res = await fetch(`${API_URL}/api/v1/trades/team-market-buy`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ teamId, totalValue }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error executing team buy');
    return data;
};

export const teamMarketSell = async (teamId: number | string, quantity: number) => {
    const res = await fetch(`${API_URL}/api/v1/trades/team-market-sell`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ teamId, quantity }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error executing team sell');
    return data;
};
