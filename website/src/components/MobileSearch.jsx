import React from 'react';
import styles from '../styles/MobileSearch.module.css';

const MobileSearch = ({ isOpen, onClose, searchTerm, setSearchTerm, onSearch }) => {
    if (!isOpen) return null;

    const handleDone = () => {
        onClose();
        if (onSearch) onSearch(searchTerm);
    };

    return (
        <div className={styles['mobile-search-overlay']}>
            <div className={styles['mobile-search-input-box']}>
                <div className={styles['mobile-search-icon-box']}>
                    <input
                        autoFocus
                        type="text"
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleDone()}
                        className={styles['mobile-search-input']}
                    />
                    {searchTerm && (
                        <button 
                            className={styles['mobile-search-clear-btn']}
                            onClick={() => setSearchTerm('')}
                        >
                            ✕
                        </button>
                    )}
                </div>
                <button
                    onClick={handleDone}
                    className={styles['mobile-search-close-btn']}
                >
                    LISTO
                </button>
            </div>
            <p className={styles['mobile-search-subtext']}>
                Presiona "LISTO" o Enter para buscar.
            </p>
            <div
                onClick={onClose}
                className={styles['mobile-search-overlay-backdrop']}
            />
        </div>
    );
};

export default MobileSearch;
