import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import './TrustMeter.css';

const TrustMeter = ({ score, label, breakdown, animate = true }) => {
    const [displayScore, setDisplayScore] = useState(0);
    const [showBreakdown, setShowBreakdown] = useState(false);

    useEffect(() => {
        if (animate) {
            // Animate score from 0 to target
            const duration = 2000;
            const steps = 60;
            const increment = score / steps;
            let current = 0;

            const timer = setInterval(() => {
                current += increment;
                if (current >= score) {
                    setDisplayScore(score);
                    clearInterval(timer);
                } else {
                    setDisplayScore(Math.round(current));
                }
            }, duration / steps);

            return () => clearInterval(timer);
        } else {
            setDisplayScore(score);
        }
    }, [score, animate]);

    const getColor = (value) => {
        if (value >= 90) return '#10b981';
        if (value >= 70) return '#3b82f6';
        if (value >= 50) return '#f59e0b';
        if (value >= 25) return '#f97316';
        return '#ef4444';
    };

    const getGradient = (value) => {
        if (value >= 90) return 'linear-gradient(135deg, #10b981, #059669)';
        if (value >= 70) return 'linear-gradient(135deg, #3b82f6, #1d4ed8)';
        if (value >= 50) return 'linear-gradient(135deg, #f59e0b, #d97706)';
        if (value >= 25) return 'linear-gradient(135deg, #f97316, #ea580c)';
        return 'linear-gradient(135deg, #ef4444, #dc2626)';
    };

    const circumference = 2 * Math.PI * 90;
    const strokeDashoffset = circumference - (displayScore / 100) * circumference;

    return (
        <div className="trust-meter">
            <div className="meter-container">
                <svg className="meter-svg" viewBox="0 0 200 200">
                    {/* Background Circle */}
                    <circle
                        cx="100"
                        cy="100"
                        r="90"
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.1)"
                        strokeWidth="12"
                    />
                    
                    {/* Progress Circle */}
                    <motion.circle
                        cx="100"
                        cy="100"
                        r="90"
                        fill="none"
                        stroke={getColor(displayScore)}
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        transform="rotate(-90 100 100)"
                        style={{
                            filter: `drop-shadow(0 0 10px ${getColor(displayScore)})`
                        }}
                    />

                    {/* Glow Effect */}
                    <motion.circle
                        cx="100"
                        cy="100"
                        r="90"
                        fill="none"
                        stroke={getColor(displayScore)}
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        transform="rotate(-90 100 100)"
                        opacity="0.3"
                        style={{
                            filter: `blur(8px)`
                        }}
                    />
                </svg>

                <div className="meter-content">
                    <motion.span 
                        className="meter-score"
                        style={{ color: getColor(displayScore) }}
                        animate={{ 
                            textShadow: `0 0 30px ${getColor(displayScore)}`
                        }}
                    >
                        {displayScore}
                    </motion.span>
                    <span className="meter-label">{label || 'Trust Score'}</span>
                    
                    <motion.div 
                        className="meter-badge"
                        style={{ background: getGradient(displayScore) }}
                        initial={{ scale: 0 }}
                        animate={{ scale: displayScore === score ? 1 : 0 }}
                        transition={{ type: "spring", delay: 0.5 }}
                    >
                        {displayScore >= 90 && '🏆 Excellent'}
                        {displayScore >= 70 && displayScore < 90 && '✅ Good'}
                        {displayScore >= 50 && displayScore < 70 && '⚠️ Moderate'}
                        {displayScore >= 25 && displayScore < 50 && '🔶 Low'}
                        {displayScore < 25 && '🚫 Critical'}
                    </motion.div>
                </div>

                {/* Particle Effects on High Scores */}
                {displayScore >= 90 && (
                    <div className="meter-particles">
                        {[...Array(8)].map((_, i) => (
                            <motion.span
                                key={i}
                                className="particle"
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{
                                    opacity: [0, 1, 0],
                                    scale: [0, 1, 0],
                                    x: Math.cos((i * 45) * Math.PI / 180) * 100,
                                    y: Math.sin((i * 45) * Math.PI / 180) * 100
                                }}
                                transition={{
                                    duration: 1.5,
                                    delay: i * 0.1,
                                    repeat: Infinity,
                                    repeatDelay: 2
                                }}
                            >
                                ✨
                            </motion.span>
                        ))}
                    </div>
                )}
            </div>

            {breakdown && (
                <div className="breakdown-section">
                    <button 
                        className="breakdown-toggle"
                        onClick={() => setShowBreakdown(!showBreakdown)}
                    >
                        {showBreakdown ? '▲ Hide Details' : '▼ View Breakdown'}
                    </button>

                    <motion.div 
                        className="breakdown-content"
                        initial={false}
                        animate={{ 
                            height: showBreakdown ? 'auto' : 0,
                            opacity: showBreakdown ? 1 : 0
                        }}
                    >
                        {Object.entries(breakdown).map(([key, value]) => (
                            <div key={key} className="breakdown-item">
                                <div className="breakdown-header">
                                    <span className="breakdown-label">
                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                    </span>
                                    <span 
                                        className="breakdown-value"
                                        style={{ color: getColor(value) }}
                                    >
                                        {value}
                                    </span>
                                </div>
                                <div className="breakdown-bar">
                                    <motion.div 
                                        className="breakdown-fill"
                                        style={{ background: getGradient(value) }}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${value}%` }}
                                        transition={{ duration: 1, delay: 0.5 }}
                                    />
                                </div>
                            </div>
                        ))}
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default TrustMeter;