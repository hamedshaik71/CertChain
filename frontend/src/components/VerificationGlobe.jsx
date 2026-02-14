import React, { useRef, useEffect, useState, useMemo } from 'react';
import Globe from 'react-globe.gl';
import { motion } from 'framer-motion';
import './VerificationGlobe.css';

const VerificationGlobe = ({ verifications = [] }) => {
    const globeRef = useRef();
    const [selectedPoint, setSelectedPoint] = useState(null);
    const [liveCount, setLiveCount] = useState(0);

    // Convert verifications to points
    const points = useMemo(() => {
        return verifications.map(v => ({
            lat: v.latitude || Math.random() * 180 - 90,
            lng: v.longitude || Math.random() * 360 - 180,
            size: 0.5 + Math.random() * 0.5,
            color: v.verified ? '#10b981' : '#ef4444',
            ...v
        }));
    }, [verifications]);

    // Arcs for recent verifications
    const arcs = useMemo(() => {
        return verifications.slice(0, 5).map((v, i) => ({
            startLat: v.latitude || 0,
            startLng: v.longitude || 0,
            endLat: 37.7749, // CertChain HQ
            endLng: -122.4194,
            color: ['#667eea', '#764ba2'][i % 2]
        }));
    }, [verifications]);

    useEffect(() => {
        // Auto-rotate globe
        if (globeRef.current) {
            globeRef.current.controls().autoRotate = true;
            globeRef.current.controls().autoRotateSpeed = 0.5;
        }
    }, []);

    useEffect(() => {
        // Simulate live verification count
        const interval = setInterval(() => {
            setLiveCount(prev => prev + Math.floor(Math.random() * 3));
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="verification-globe">
            <div className="globe-header">
                <h3>🌍 Global Verification Activity</h3>
                <div className="live-indicator">
                    <motion.span 
                        className="live-dot"
                        animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                    />
                    <span>LIVE</span>
                </div>
            </div>

            <div className="globe-container">
                <Globe
                    ref={globeRef}
                    width={400}
                    height={400}
                    backgroundColor="rgba(0,0,0,0)"
                    globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
                    bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
                    
                    // Points
                    pointsData={points}
                    pointAltitude={0.01}
                    pointColor="color"
                    pointRadius="size"
                    pointsMerge={false}
                    onPointClick={(point) => setSelectedPoint(point)}
                    
                    // Arcs
                    arcsData={arcs}
                    arcColor="color"
                    arcDashLength={0.4}
                    arcDashGap={0.2}
                    arcDashAnimateTime={2000}
                    arcAltitudeAutoScale={0.4}
                    
                    // Rings (pulsating effect)
                    ringsData={points.slice(0, 10)}
                    ringLat={(d) => d.lat}
                    ringLng={(d) => d.lng}
                    ringColor={() => (t) => `rgba(102, 126, 234, ${1 - t})`}
                    ringMaxRadius={3}
                    ringPropagationSpeed={2}
                    ringRepeatPeriod={1000}
                />

                {/* Pulsing dots overlay */}
                <div className="pulse-overlay">
                    {points.slice(0, 5).map((point, i) => (
                        <motion.div
                            key={i}
                            className="pulse-point"
                            style={{
                                left: `${50 + point.lng / 4}%`,
                                top: `${50 - point.lat / 4}%`,
                                backgroundColor: point.color
                            }}
                            animate={{
                                scale: [1, 1.5, 1],
                                opacity: [0.8, 0.3, 0.8]
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                delay: i * 0.3
                            }}
                        />
                    ))}
                </div>
            </div>

            <div className="globe-stats">
                <div className="stat">
                    <motion.span 
                        className="stat-value"
                        key={liveCount}
                        initial={{ scale: 1.2 }}
                        animate={{ scale: 1 }}
                    >
                        {liveCount.toLocaleString()}
                    </motion.span>
                    <span className="stat-label">Verifications Today</span>
                </div>
                <div className="stat">
                    <span className="stat-value">{points.length}</span>
                    <span className="stat-label">Active Locations</span>
                </div>
                <div className="stat">
                    <span className="stat-value">99.8%</span>
                    <span className="stat-label">Success Rate</span>
                </div>
            </div>

            {/* Selected Point Info */}
            {selectedPoint && (
                <motion.div 
                    className="point-info"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <button className="close-info" onClick={() => setSelectedPoint(null)}>✕</button>
                    <h4>Verification Details</h4>
                    <div className="info-row">
                        <span>Location</span>
                        <strong>{selectedPoint.city || 'Unknown'}, {selectedPoint.country || 'Unknown'}</strong>
                    </div>
                    <div className="info-row">
                        <span>Time</span>
                        <strong>{new Date(selectedPoint.timestamp).toLocaleString()}</strong>
                    </div>
                    <div className="info-row">
                        <span>Status</span>
                        <strong className={selectedPoint.verified ? 'success' : 'failed'}>
                            {selectedPoint.verified ? '✅ Verified' : '❌ Failed'}
                        </strong>
                    </div>
                </motion.div>
            )}

            {/* Recent Activity Feed */}
            <div className="activity-feed">
                <h4>Recent Activity</h4>
                <div className="feed-list">
                    {verifications.slice(0, 5).map((v, i) => (
                        <motion.div 
                            key={i}
                            className="feed-item"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                        >
                            <span className="feed-icon">{v.verified ? '✅' : '❌'}</span>
                            <div className="feed-content">
                                <span className="feed-location">
                                    {v.city || 'Unknown'}, {v.country || '??'}
                                </span>
                                <span className="feed-time">
                                    {new Date(v.timestamp).toLocaleTimeString()}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default VerificationGlobe;