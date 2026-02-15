import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import './NFTViewer.css';

const NFTViewer = () => {
    const { tokenId } = useParams();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ✅ READ DYNAMIC DATA FROM URL
    const courseName = searchParams.get('name') || "Academic Credential";
    const institutionName = searchParams.get('org') || "Tech University";
    const grade = searchParams.get('grade') || "Verified";

    useEffect(() => {
        // ✅ FIX: Check if tokenId exists
        if (!tokenId) {
            setError('No Token ID provided');
            setLoading(false);
            return;
        }

        // Simulate "Blockchain Query" delay
        setTimeout(() => setLoading(false), 2000);
    }, [tokenId]);

    // ✅ FIX: Show error state if no tokenId
    if (error) {
        return (
            <div className="loader-container">
                <div className="error-icon">❌</div>
                <h2>NFT Not Found</h2>
                <p>{error}</p>
                <button onClick={() => window.history.back()} className="back-btn">
                    ← Go Back
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="loader-container">
                <div className="scanner"></div>
                <h2>Retrieving Asset from Blockchain...</h2>
                <code className="loading-hash">0x{Math.random().toString(16).substr(2, 40)}</code>
            </div>
        );
    }

    return (
        <div className="nft-page">
            <div className="nft-container">
                
                {/* LEFT SIDE: 3D CARD */}
                <div className="nft-visual-section">
                    <div className="card-3d-wrapper">
                        <div className="card-3d">
                            <div className="card-front">
                                <div className="holographic-overlay"></div>
                                <div className="card-content">
                                    <div className="card-header">
                                        <span className="chain-badge">ETH</span>
                                        <span className="sbt-badge">SBT</span>
                                    </div>
                                    <div className="card-art">
                                        🎓
                                    </div>
                                    <div className="card-footer">
                                        <h3>{courseName}</h3>
                                        <p>#{tokenId}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="card-shadow"></div>
                    </div>
                </div>

                {/* RIGHT SIDE: DATA */}
                <motion.div 
                    className="nft-data-section"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <div className="collection-info">
                        <span className="chain-icon">🔹</span>
                        <span>CertChain Academic Collection</span>
                        <span className="verified-tick">✓</span>
                    </div>

                    <h1 className="nft-title">{courseName} #{tokenId}</h1>
                    
                    <div className="owner-box">
                        <div className="avatar">👤</div>
                        <div className="owner-info">
                            <span>Owned by</span>
                            <span className="owner-address">0x{Math.random().toString(16).substr(2, 40).substring(0,6)}...3f9a</span>
                        </div>
                    </div>

                    <div className="glass-panel traits-panel">
                        <h3>⚡ On-Chain Attributes</h3>
                        <div className="traits-grid">
                            <TraitBox type="Institution" value={institutionName} rarity="Issuer" />
                            <TraitBox type="Grade" value={grade} rarity="Rare" />
                            <TraitBox type="Year" value={new Date().getFullYear()} rarity="Common" />
                            <TraitBox type="Status" value="Soulbound" rarity="Legendary" />
                        </div>
                    </div>

                    <div className="glass-panel history-panel">
                        <h3>📜 History</h3>
                        <div className="history-row">
                            <span className="event">✨ Minted</span>
                            <span className="price">Gas (0.001 ETH)</span>
                            <span className="date">Just now</span>
                        </div>
                    </div>

                    <button className="opensea-btn">
                        🌊 View on OpenSea (Simulated)
                    </button>

                </motion.div>
            </div>
        </div>
    );
};

const TraitBox = ({ type, value, rarity }) => (
    <div className="trait-box">
        <div className="trait-type">{type}</div>
        <div className="trait-value">{value}</div>
        <div className="trait-rarity">{rarity}</div>
    </div>
);

export default NFTViewer;