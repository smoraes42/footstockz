import React from 'react';
import styles from '../styles/PriceDisplay.module.css';

export const PlayerPrice = ({ price, isUpdated, className = '' }) => {
    const formattedPrice = Number(price || 0).toLocaleString('es-ES', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });

    return (
        <span className={`${styles.price} ${isUpdated ? styles.pulse : ''} ${className}`}>
            {formattedPrice} €
        </span>
    );
};

export const PlayerChange = ({ change, indicatorType = 'sign', className = '' }) => {
    const changeNum = Number(change || 0);
    const isPositive = changeNum >= 0;
    
    const formattedChange = Math.abs(changeNum).toLocaleString('es-ES', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });

    const indicator = indicatorType === 'arrow' 
        ? (isPositive ? '▲ ' : '▼ ') 
        : (isPositive ? '+' : '-');

    const colorClass = isPositive ? styles.positive : styles.negative;

    return (
        <span className={`${styles.change} ${colorClass} ${className}`}>
            {indicator}{formattedChange}%
        </span>
    );
};
