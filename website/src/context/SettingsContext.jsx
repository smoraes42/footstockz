import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export const useSettings = () => useContext(SettingsContext);

export const SettingsProvider = ({ children }) => {
    // Default to the browser's timezone if not set
    const defaultTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const [timezone, setTimezone] = useState(
        localStorage.getItem('user_timezone') || defaultTimezone
    );

    useEffect(() => {
        if (timezone) {
            localStorage.setItem('user_timezone', timezone);
        }
    }, [timezone]);

    const value = {
        timezone,
        setTimezone,
        defaultTimezone
    };

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
};
