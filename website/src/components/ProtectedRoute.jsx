import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Wraps authenticated routes.
 * Redirects to /login if the session is expired or no user is found.
 * Shows nothing while the auth check is loading to prevent flash-of-content.
 */
const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        // Blank screen while verifying session — splash already covers this on first load
        return null;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
