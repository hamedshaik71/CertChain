import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './CertificateTimeline.css';

const CertificateTimeline = ({ events = [] }) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const containerRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);

    // Early return if no events
    if (!events || events.length === 0) {
        return (
            <div className="certificate-timeline">
                <div className="timeline-header">
                    <h3>📅 Certificate Timeline</h3>
                    <span className="event-count">No events yet</span>
                </div>
                <div className="empty-state">
                    <p>Timeline events will appear here when you interact with your certificates</p>
                </div>
            </div>
        );
    }

    const handleDragStart = (e) => {
        setIsDragging(true);
        setStartX(e.clientX || e.touches[0].clientX);
    };

    const handleDragEnd = (e) => {
        if (!isDragging) return;
        setIsDragging(false);

        const endX = e.clientX || e.changedTouches[0].clientX;
        const diff = startX - endX;

        if (diff > 50 && activeIndex < events.length - 1) {
            setActiveIndex(prev => prev + 1);
        } else if (diff < -50 && activeIndex > 0) {
            setActiveIndex(prev => prev - 1);
        }
    };

    const getEventIcon = (type) => {
        switch (type) {
            case 'ISSUED': return '📜';
            case 'VERIFIED': return '✅';
            case 'UPDATED': return '🔄';
            case 'RENEWED': return '♻️';
            case 'REVOKED': return '❌';
            case 'SHARED': return '🔗';
            case 'DOWNLOADED': return '📥';
            default: return '📌';
        }
    };

    const getEventColor = (type) => {
        switch (type) {
            case 'ISSUED': return '#10b981';
            case 'VERIFIED': return '#3b82f6';
            case 'UPDATED': return '#f59e0b';
            case 'RENEWED': return '#8b5cf6';
            case 'REVOKED': return '#ef4444';
            case 'SHARED': return '#06b6d4';
            case 'DOWNLOADED': return '#6366f1';
            default: return '#6b7280';
        }
    };

    return (
        <div className="certificate-timeline">
            <div className="timeline-header">
                <h3>📅 Certificate Timeline</h3>
                <span className="event-count">{events.length} events</span>
            </div>

            {/* Story-style indicator */}
            <div className="story-indicators">
                {events.map((_, idx) => (
                    <motion.div
                        key={idx}
                        className={`indicator ${idx === activeIndex ? 'active' : ''} ${idx < activeIndex ? 'viewed' : ''}`}
                        onClick={() => setActiveIndex(idx)}
                        whileHover={{ scale: 1.1 }}
                    />
                ))}
            </div>

            {/* Timeline Carousel */}
            <div 
                className="timeline-carousel"
                ref={containerRef}
                onMouseDown={handleDragStart}
                onMouseUp={handleDragEnd}
                onMouseLeave={() => setIsDragging(false)}
                onTouchStart={handleDragStart}
                onTouchEnd={handleDragEnd}
            >
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeIndex}
                        className="timeline-card"
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                        <div 
                            className="card-header"
                            style={{ backgroundColor: getEventColor(events[activeIndex].type) }}
                        >
                            <span className="event-icon">{getEventIcon(events[activeIndex].type)}</span>
                            <span className="event-type">{events[activeIndex].type}</span>
                        </div>

                        <div className="card-content">
                            <h4>{events[activeIndex].title}</h4>
                            <p className="event-description">{events[activeIndex].description}</p>

                            <div className="event-details">
                                <div className="detail">
                                    <span className="label">Date</span>
                                    <span className="value">
                                        {new Date(events[activeIndex].timestamp).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="detail">
                                    <span className="label">Time</span>
                                    <span className="value">
                                        {new Date(events[activeIndex].timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                                {events[activeIndex].actor && (
                                    <div className="detail">
                                        <span className="label">By</span>
                                        <span className="value">{events[activeIndex].actor}</span>
                                    </div>
                                )}
                                {events[activeIndex].location && (
                                    <div className="detail">
                                        <span className="label">Location</span>
                                        <span className="value">🌍 {events[activeIndex].location}</span>
                                    </div>
                                )}
                            </div>

                            {events[activeIndex].transactionHash && (
                                <div className="blockchain-proof">
                                    <span>⛓️ Blockchain TX:</span>
                                    <code>{events[activeIndex].transactionHash.slice(0, 20)}...</code>
                                </div>
                            )}
                        </div>

                        <div className="card-footer">
                            <span className="event-number">
                                {activeIndex + 1} of {events.length}
                            </span>
                            <span className="swipe-hint">← Swipe to navigate →</span>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Navigation Buttons */}
            <div className="timeline-nav">
                <button
                    className="nav-btn prev"
                    onClick={() => setActiveIndex(prev => Math.max(0, prev - 1))}
                    disabled={activeIndex === 0}
                >
                    ‹ Previous
                </button>
                <button
                    className="nav-btn next"
                    onClick={() => setActiveIndex(prev => Math.min(events.length - 1, prev + 1))}
                    disabled={activeIndex === events.length - 1}
                >
                    Next ›
                </button>
            </div>

            {/* Mini Timeline View */}
            <div className="mini-timeline">
                {events.map((event, idx) => (
                    <motion.div
                        key={idx}
                        className={`mini-event ${idx === activeIndex ? 'active' : ''}`}
                        onClick={() => setActiveIndex(idx)}
                        whileHover={{ scale: 1.2 }}
                    >
                        <div 
                            className="mini-dot"
                            style={{ backgroundColor: getEventColor(event.type) }}
                        />
                        <span className="mini-icon">{getEventIcon(event.type)}</span>
                        {idx < events.length - 1 && <div className="mini-line" />}
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default CertificateTimeline;