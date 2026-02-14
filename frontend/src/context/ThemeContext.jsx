import React, { createContext, useContext, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

const themes = {
    dark: {
        '--bg-primary': '#0f172a',
        '--bg-secondary': '#1e293b',
        '--bg-card': 'rgba(30, 41, 59, 0.8)',
        '--text-primary': '#ffffff',
        '--text-secondary': '#94a3b8',
        '--border-color': 'rgba(148, 163, 184, 0.1)',
        '--shadow': '0 10px 30px rgba(0, 0, 0, 0.3)'
    },
    light: {
        '--bg-primary': '#f8fafc',
        '--bg-secondary': '#ffffff',
        '--bg-card': 'rgba(255, 255, 255, 0.9)',
        '--text-primary': '#0f172a',
        '--text-secondary': '#64748b',
        '--border-color': 'rgba(0, 0, 0, 0.1)',
        '--shadow': '0 10px 30px rgba(0, 0, 0, 0.1)'
    }
};

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(() => {
        const saved = localStorage.getItem('theme');
        return saved || 'dark';
    });
    const [isTransitioning, setIsTransitioning] = useState(false);

    useEffect(() => {
        const root = document.documentElement;
        const themeVars = themes[theme];

        Object.entries(themeVars).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });

        document.body.classList.remove('theme-dark', 'theme-light');
        document.body.classList.add(`theme-${theme}`);

        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setIsTransitioning(true);

        setTimeout(() => {
            setTheme(prev => prev === 'dark' ? 'light' : 'dark');
        }, 150);

        setTimeout(() => {
            setIsTransitioning(false);
        }, 500);
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, isTransitioning }}>
            <AnimatePresence>
                {isTransitioning && (
                    <motion.div
                        className="theme-transition-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    />
                )}
            </AnimatePresence>
            {children}
        </ThemeContext.Provider>
    );
};

export const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <motion.button
            className="theme-toggle"
            onClick={toggleTheme}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
        >
            <motion.div
                className="toggle-track"
                animate={{
                    background: theme === 'dark'
                        ? 'linear-gradient(135deg, #1e293b, #334155)'
                        : 'linear-gradient(135deg, #fcd34d, #fbbf24)'
                }}
            >
                <motion.div
                    className="toggle-thumb"
                    animate={{
                        x: theme === 'dark' ? 0 : 24,
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                    <motion.span
                        key={theme}
                        initial={{ rotate: -180, opacity: 0 }}
                        animate={{ rotate: 0, opacity: 1 }}
                        exit={{ rotate: 180, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {theme === 'dark' ? '🌙' : '☀️'}
                    </motion.span>
                </motion.div>
            </motion.div>
        </motion.button>
    );
};