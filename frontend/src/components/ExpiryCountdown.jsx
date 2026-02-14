import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CountdownCircleTimer } from 'react-countdown-circle-timer';
import './ExpiryCountdown.css';

const ExpiryCountdown = ({ expiryDate, compact = false }) => {
    const [timeLeft, setTimeLeft] = useState({});
    const [urgencyLevel, setUrgencyLevel] = useState('normal');

    useEffect(() => {
        const calculateTimeLeft = () => {
            const expiry = new Date(expiryDate);
            const now = new Date();
            const diff = expiry - now;

            if (diff <= 0) {
                return { expired: true };
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            // Set urgency level
            if (days <= 7) setUrgencyLevel('critical');
            else if (days <= 30) setUrgencyLevel('warning');
            else if (days <= 90) setUrgencyLevel('caution');
            else setUrgencyLevel('normal');

            return { days, hours, minutes, seconds, expired: false };
        };

        setTimeLeft(calculateTimeLeft());

        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, [expiryDate]);

    const getColor = () => {
        switch (urgencyLevel) {
            case 'critical': return ['#ef4444', '#dc2626'];
            case 'warning': return ['#f59e0b', '#d97706'];
            case 'caution': return ['#3b82f6', '#2563eb'];
            default: return ['#10b981', '#059669'];
        }
    };

    if (timeLeft.expired) {
        return (
            <motion.div 
                className="expiry-countdown expired"
                initial={{ scale: 0.9 }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
            >
                <div className="expired-badge">
                    <span className="expired-icon">⏰</span>
                    <span className="expired-text">EXPIRED</span>
                </div>
            </motion.div>
        );
    }

    if (compact) {
        return (
            <motion.div 
                className={`expiry-countdown compact ${urgencyLevel}`}
                whileHover={{ scale: 1.05 }}
            >
                <span className="countdown-icon">⏳</span>
                <span className="countdown-text">
                    {timeLeft.days}d {timeLeft.hours}h remaining
                </span>
            </motion.div>
        );
    }

    const totalSeconds = timeLeft.days * 86400 + timeLeft.hours * 3600 + 
                         timeLeft.minutes * 60 + timeLeft.seconds;
    const totalDuration = 365 * 86400; // 1 year in seconds

    return (
        <div className={`expiry-countdown full ${urgencyLevel}`}>
            <div className="countdown-header">
                <span className="countdown-title">Certificate Expires In</span>
                {urgencyLevel === 'critical' && (
                    <motion.span 
                        className="urgency-badge critical"
                        animate={{ opacity: [1, 0.5, 1] }}
                        transition={{ repeat: Infinity, duration: 0.5 }}
                    >
                        ⚠️ Expiring Soon!
                    </motion.span>
                )}
            </div>

            <div className="countdown-timer">
                <CountdownCircleTimer
                    isPlaying
                    duration={totalDuration}
                    initialRemainingTime={totalSeconds}
                    colors={getColor()}
                    colorsTime={[totalDuration, totalDuration * 0.25, 0]}
                    size={120}
                    strokeWidth={8}
                    trailColor="rgba(255,255,255,0.1)"
                >
                    {() => (
                        <div className="timer-content">
                            <span className="timer-days">{timeLeft.days}</span>
                            <span className="timer-label">days</span>
                        </div>
                    )}
                </CountdownCircleTimer>

                <div className="countdown-units">
                    <div className="unit">
                        <motion.span 
                            className="unit-value"
                            key={timeLeft.hours}
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                        >
                            {String(timeLeft.hours).padStart(2, '0')}
                        </motion.span>
                        <span className="unit-label">Hours</span>
                    </div>
                    <span className="unit-separator">:</span>
                    <div className="unit">
                        <motion.span 
                            className="unit-value"
                            key={timeLeft.minutes}
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                        >
                            {String(timeLeft.minutes).padStart(2, '0')}
                        </motion.span>
                        <span className="unit-label">Minutes</span>
                    </div>
                    <span className="unit-separator">:</span>
                    <div className="unit">
                        <motion.span 
                            className="unit-value"
                            key={timeLeft.seconds}
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                        >
                            {String(timeLeft.seconds).padStart(2, '0')}
                        </motion.span>
                        <span className="unit-label">Seconds</span>
                    </div>
                </div>
            </div>

            {urgencyLevel !== 'normal' && (
                <motion.button 
                    className="renew-btn"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    🔄 Request Renewal
                </motion.button>
            )}
        </div>
    );
};

export default ExpiryCountdown;