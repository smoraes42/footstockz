import { Server } from 'socket.io';

class SocketService {
    constructor() {
        this.io = null;
    }

    init(server) {
        this.io = new Server(server, {
            cors: {
                origin: "*", // Adjust this in production
                methods: ["GET", "POST"],
                credentials: true
            }
        });

        this.io.on('connection', (socket) => {
            console.log(`[Socket] New client connected: ${socket.id}`);

            socket.on('subscribe', (playerId) => {
                const room = `player_${playerId}`;
                socket.join(room);
                console.log(`[Socket] Client ${socket.id} subscribed to ${room}`);
            });

            socket.on('unsubscribe', (playerId) => {
                const room = `player_${playerId}`;
                socket.leave(room);
                console.log(`[Socket] Client ${socket.id} unsubscribed from ${room}`);
            });

            socket.on('subscribe_user', (userId) => {
                const room = `user_${userId}`;
                socket.join(room);
                console.log(`[Socket] Client ${socket.id} subscribed to ${room}`);
            });

            socket.on('unsubscribe_user', (userId) => {
                const room = `user_${userId}`;
                socket.leave(room);
                console.log(`[Socket] Client ${socket.id} unsubscribed from ${room}`);
            });

            socket.on('disconnect', () => {
                console.log(`[Socket] Client disconnected: ${socket.id}`);
            });
        });

        console.log('[Socket] Socket.io initialized');
    }

    // Emit price update to all clients
    emitPriceUpdate(playerId, newPrice, change) {
        if (!this.io) return;
        
        const data = {
            playerId: parseInt(playerId),
            price: parseFloat(newPrice),
            change: parseFloat(change || 0),
            timestamp: new Date().toISOString()
        };

        // Emit to general channel for marketplace list
        this.io.emit('price_update', data);
        
        // Also emit to specific player room for detail pages
        this.io.to(`player_${playerId}`).emit('price_update', data);
    }

    // Emit trade event to the specific player room
    emitTradeExecuted(playerId, trade) {
        if (!this.io) return;
        
        const data = {
            ...trade,
            playerId: parseInt(playerId),
            timestamp: new Date().toISOString()
        };

        this.io.to(`player_${playerId}`).emit('trade_executed', data);
    }

    // Emit portfolio update to a specific user
    emitPortfolioUpdate(userId, portfolioData) {
        if (!this.io) return;
        // We could use rooms based on userId for this
        this.io.to(`user_${userId}`).emit('portfolio_update', portfolioData);
    }
}

const socketService = new SocketService();
export default socketService;
