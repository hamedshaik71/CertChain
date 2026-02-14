// src/components/AchievementBadge.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Confetti from 'react-confetti';
import './AchievementBadge.css';

// Simple sound player using Web Audio API (no external dependencies)
class SoundPlayer {
    static play(soundType) {
        // Sounds disabled due to external URL restrictions
        // In production, use local sound files
        console.log(`Sound would play: ${soundType}`);
        
        // Example for local sounds:
        // const audio = new Audio(`/sounds/${soundType}.mp3`);
        // audio.volume = 0.3;
        // audio.play().catch(e => console.log('Audio blocked:', e));
    }
}

const badgeIcons = {
    first_certificate: '🎓',
    verified_5: '✅',
    verified_25: '⭐',
    verified_100: '🏆',
    blockchain_pioneer: '⛓️',
    quick_verifier: '⚡',
    trusted_issuer: '🏛️',
    global_reach: '🌍',
    skill_master: '🧠',
    top_performer: '👑'
};

const AchievementBadge = ({ badge, isNew = false, onClose }) => {
    const [showConfetti, setShowConfetti] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    useEffect(() => {
        if (isNew) {
            setShowConfetti(true);
            SoundPlayer.play('unlock');

            const timer = setTimeout(() => {
                setShowConfetti(false);
            }, 4000);

            return () => clearTimeout(timer);
        }
    }, [isNew]);

    const handleClick = () => {
        SoundPlayer.play('click');
    };

    return (
        <AnimatePresence>
            <motion.div
                className={`achievement-badge ${isNew ? 'is-new' : ''} ${badge.unlocked ? 'unlocked' : 'locked'}`}
                initial={isNew ? { scale: 0, rotate: -180 } : { opacity: 0, y: 20 }}
                animate={isNew ? { scale: 1, rotate: 0 } : { opacity: 1, y: 0 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ 
                    type: "spring", 
                    duration: isNew ? 0.8 : 0.5,
                    bounce: 0.5
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={handleClick}
            >
                {showConfetti && (
                    <Confetti
                        width={300}
                        height={300}
                        recycle={false}
                        numberOfPieces={100}
                        gravity={0.3}
                        style={{ 
                            position: 'absolute', 
                            top: -50, 
                            left: -50,
                            pointerEvents: 'none'
                        }}
                    />
                )}

                <motion.div 
                    className="badge-glow"
                    animate={badge.unlocked ? {
                        opacity: [0.3, 0.6, 0.3],
                        scale: [1, 1.2, 1]
                    } : {}}
                    transition={{ duration: 2, repeat: Infinity }}
                />

                <motion.div 
                    className="badge-icon-container"
                    animate={isNew ? {
                        boxShadow: [
                            '0 0 20px rgba(102, 126, 234, 0.5)',
                            '0 0 40px rgba(102, 126, 234, 0.8)',
                            '0 0 20px rgba(102, 126, 234, 0.5)'
                        ]
                    } : {}}
                    transition={{ duration: 1, repeat: isNew ? 3 : 0 }}
                >
                    <span className="badge-icon">
                        {badgeIcons[badge.type] || '🏅'}
                    </span>
                    
                    {!badge.unlocked && (
                        <div className="badge-lock">🔒</div>
                    )}
                </motion.div>

                <div className="badge-info">
                    <h4 className="badge-name">{badge.name}</h4>
                    <p className="badge-description">{badge.description}</p>
                    
                    {badge.progress !== undefined && !badge.unlocked && (
                        <div className="badge-progress">
                            <div className="progress-bar">
                                <motion.div 
                                    className="progress-fill"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${badge.progress}%` }}
                                    transition={{ duration: 1, delay: 0.5 }}
                                />
                            </div>
                            <span className="progress-text">
                                {badge.current}/{badge.target}
                            </span>
                        </div>
                    )}

                    {badge.unlocked && (
                        <motion.div 
                            className="badge-unlocked-date"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            Unlocked {new Date(badge.unlockedAt).toLocaleDateString()}
                        </motion.div>
                    )}
                </div>

                {badge.rarity && (
                    <div className={`badge-rarity ${badge.rarity}`}>
                        {badge.rarity}
                    </div>
                )}

                {isNew && (
                    <motion.div 
                        className="new-badge-banner"
                        initial={{ x: 100 }}
                        animate={{ x: 0 }}
                        transition={{ type: "spring" }}
                    >
                        ✨ NEW!
                    </motion.div>
                )}

                <AnimatePresence>
                    {isHovered && badge.unlocked && (
                        <motion.div 
                            className="badge-tooltip"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                        >
                            <div className="tooltip-stat">
                                <span>🎯 Achievement Rate</span>
                                <strong>{badge.achievementRate || '15%'}</strong>
                            </div>
                            <div className="tooltip-stat">
                                <span>👥 Users Earned</span>
                                <strong>{badge.totalEarned || '1,234'}</strong>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </AnimatePresence>
    );
};

// Badge Grid Component
const BadgeGrid = ({ badges, onBadgeClick }) => {
    return (
        <div className="badge-grid">
            <div className="badge-grid-header">
                <h2>🏆 Achievements</h2>
                <span className="badge-count">
                    {badges.filter(b => b.unlocked).length}/{badges.length} Unlocked
                </span>
            </div>
            <div className="badges-container">
                {badges.map((badge, index) => (
                    <AchievementBadge
                        key={badge.id}
                        badge={badge}
                        style={{ animationDelay: `${index * 0.1}s` }}
                    />
                ))}
            </div>
        </div>
    );
};

export { AchievementBadge, BadgeGrid };
export default AchievementBadge;