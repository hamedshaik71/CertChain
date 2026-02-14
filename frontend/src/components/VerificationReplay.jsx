import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './VerificationReplay.css';

const VerificationReplay = ({ verificationHistory, certificateHash }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const timelineRef = useRef(null);
    const playbackRef = useRef(null);

    useEffect(() => {
        if (isPlaying && currentIndex < verificationHistory.length - 1) {
            playbackRef.current = setTimeout(() => {
                setCurrentIndex(prev => prev + 1);
            }, 2000 / playbackSpeed);
        } else if (currentIndex >= verificationHistory.length - 1) {
            setIsPlaying(false);
        }

        return () => clearTimeout(playbackRef.current);
    }, [isPlaying, currentIndex, playbackSpeed, verificationHistory.length]);

    const togglePlayback = () => {
        if (currentIndex >= verificationHistory.length - 1) {
            setCurrentIndex(0);
        }
        setIsPlaying(!isPlaying);
    };

    const seekTo = (index) => {
        setIsPlaying(false);
        setCurrentIndex(index);
    };

    const currentEvent = verificationHistory[currentIndex];

    const getEventTypeStyle = (type) => {
        switch (type) {
            case 'ISSUED': return { bg: '#10b981', icon: '📜' };
            case 'VERIFIED': return { bg: '#3b82f6', icon: '✅' };
            case 'DOWNLOADED': return { bg: '#8b5cf6', icon: '📥' };
            case 'SHARED': return { bg: '#06b6d4', icon: '🔗' };
            case 'BLOCKCHAIN_VERIFIED': return { bg: '#f59e0b', icon: '⛓️' };
            default: return { bg: '#6b7280', icon: '📌' };
        }
    };

    return (
        <div className="verification-replay">
            <div className="replay-header">
                <h3>⏯️ Verification Replay</h3>
                <span className="total-events">{verificationHistory.length} events</span>
            </div>

            {/* Current Event Display */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    className="current-event"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    style={{ 
                        borderColor: getEventTypeStyle(currentEvent?.action).bg 
                    }}
                >
                    <motion.div 
                        className="event-icon"
                        style={{ backgroundColor: getEventTypeStyle(currentEvent?.action).bg }}
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ repeat: isPlaying ? Infinity : 0, duration: 1 }}
                    >
                        {getEventTypeStyle(currentEvent?.action).icon}
                    </motion.div>

                    <div className="event-details">
                        <h4>{currentEvent?.action?.replace(/_/g, ' ')}</h4>
                        <p className="event-timestamp">
                            {new Date(currentEvent?.timestamp).toLocaleString()}
                        </p>

                        <div className="event-meta">
                            {currentEvent?.actor && (
                                <div className="meta-item">
                                    <span className="meta-icon">👤</span>
                                    <span className="meta-value">{currentEvent.actor}</span>
                                </div>
                            )}
                            {currentEvent?.ipAddress && (
                                <div className="meta-item">
                                    <span className="meta-icon">🌐</span>
                                    <span className="meta-value">{currentEvent.ipAddress}</span>
                                </div>
                            )}
                            {currentEvent?.location && (
                                <div className="meta-item">
                                    <span className="meta-icon">📍</span>
                                    <span className="meta-value">{currentEvent.location}</span>
                                </div>
                            )}
                            {currentEvent?.userAgent && (
                                <div className="meta-item">
                                    <span className="meta-icon">💻</span>
                                    <span className="meta-value">
                                        {currentEvent.userAgent.includes('Mobile') ? '📱 Mobile' : '🖥️ Desktop'}
                                    </span>
                                </div>
                            )}
                        </div>

                        {currentEvent?.reason && (
                            <div className="event-reason">
                                <span>💬</span> {currentEvent.reason}
                            </div>
                        )}
                    </div>

                    <div className="event-counter">
                        {currentIndex + 1} / {verificationHistory.length}
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Playback Controls */}
            <div className="playback-controls">
                <button 
                    className="control-btn"
                    onClick={() => seekTo(Math.max(0, currentIndex - 1))}
                    disabled={currentIndex === 0}
                >
                    ⏮️
                </button>
                
                <motion.button 
                    className={`control-btn play ${isPlaying ? 'playing' : ''}`}
                    onClick={togglePlayback}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                >
                    {isPlaying ? '⏸️' : '▶️'}
                </motion.button>
                
                <button 
                    className="control-btn"
                    onClick={() => seekTo(Math.min(verificationHistory.length - 1, currentIndex + 1))}
                    disabled={currentIndex >= verificationHistory.length - 1}
                >
                    ⏭️
                </button>

                <div className="speed-control">
                    <span>Speed:</span>
                    <select 
                        value={playbackSpeed} 
                        onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                    >
                        <option value={0.5}>0.5x</option>
                        <option value={1}>1x</option>
                        <option value={2}>2x</option>
                        <option value={4}>4x</option>
                    </select>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="progress-container">
                <div 
                    className="progress-bar"
                    ref={timelineRef}
                    onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const percent = (e.clientX - rect.left) / rect.width;
                        const index = Math.round(percent * (verificationHistory.length - 1));
                        seekTo(index);
                    }}
                >
                    <motion.div 
                        className="progress-fill"
                        animate={{ width: `${(currentIndex / (verificationHistory.length - 1)) * 100}%` }}
                    />
                    <motion.div 
                        className="progress-thumb"
                        animate={{ left: `${(currentIndex / (verificationHistory.length - 1)) * 100}%` }}
                    />
                    
                    {/* Event Markers */}
                    {verificationHistory.map((event, idx) => (
                        <div
                            key={idx}
                            className={`event-marker ${idx === currentIndex ? 'active' : ''}`}
                            style={{ 
                                left: `${(idx / (verificationHistory.length - 1)) * 100}%`,
                                backgroundColor: getEventTypeStyle(event.action).bg
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                seekTo(idx);
                            }}
                        />
                    ))}
                </div>
            </div>

            {/* Timeline List */}
            <div className="timeline-list">
                {verificationHistory.map((event, idx) => (
                    <motion.div
                        key={idx}
                        className={`timeline-item ${idx === currentIndex ? 'current' : ''} ${idx < currentIndex ? 'past' : ''}`}
                        onClick={() => seekTo(idx)}
                        whileHover={{ x: 5 }}
                    >
                        <div 
                            className="timeline-dot"
                            style={{ backgroundColor: getEventTypeStyle(event.action).bg }}
                        >
                            {getEventTypeStyle(event.action).icon}
                        </div>
                        <div className="timeline-content">
                            <span className="timeline-action">{event.action?.replace(/_/g, ' ')}</span>
                            <span className="timeline-time">
                                {new Date(event.timestamp).toLocaleString()}
                            </span>
                        </div>
                        {idx === currentIndex && (
                            <motion.span 
                                className="now-indicator"
                                animate={{ opacity: [1, 0.5, 1] }}
                                transition={{ repeat: Infinity, duration: 1 }}
                            >
                                NOW
                            </motion.span>
                        )}
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default VerificationReplay;