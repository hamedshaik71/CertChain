import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import './NFTViewer.css';

const NFTViewer = () => {
    const { tokenId } = useParams();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [nftData, setNftData] = useState(null);

    // Default fallback values from URL while loading
    const urlCourseName = searchParams.get('name') || "Academic Credential";
    const urlOrgName = searchParams.get('org') || "Tech University";

    // ✅ USE YOUR DEPLOYED BACKEND URL
    const API_BASE_URL = "https://certchain-api.onrender.com"; 

    useEffect(() => {
        if (!tokenId) {
            setError('No Token ID provided');
            setLoading(false);
            return;
        }

        const fetchNFT = async () => {
            try {
                console.log(`Fetching NFT #${tokenId} from ${API_BASE_URL}...`);
                
                // Fetch from your backend route
                const response = await fetch(`${API_BASE_URL}/api/nft/${tokenId}`);
                const data = await response.json();

                if (data.success && data.nft) {
                    setNftData(data.nft);
                } else {
                    // If not found in DB, we keep loading false but might show fallback data
                    console.warn("NFT not found in DB, using URL params");
                }
            } catch (err) {
                console.error("Error fetching NFT:", err);
                // Don't block the UI, just log error
            } finally {
                setLoading(false);
            }
        };

        fetchNFT();
    }, [tokenId]);

    if (loading) {
        return (
            <div className="loader-container">
                <div className="scanner"></div>
                <h2>Retrieving Asset #{tokenId}...</h2>
            </div>
        );
    }

    if (error) {
        return <div className="error-container">{error}</div>;
    }

    // Use Data from Backend OR Fallback to URL Params
    const displayCourse = nftData?.metadata?.attributes?.find(a => a.trait_type === "Course")?.value || urlCourseName;
    const displayOrg = nftData?.metadata?.attributes?.find(a => a.trait_type === "Institution")?.value || urlOrgName;
    const displayGrade = nftData?.metadata?.attributes?.find(a => a.trait_type === "Grade")?.value || "Completed";
    const ownerAddress = nftData?.walletAddress || "0x...";

    return (
        <div className="nft-page">
            <div className="nft-container">
                {/* LEFT SIDE: 3D CARD */}
                <div className="nft-visual-section">
                    <div className="card-3d-wrapper">
                        <div className="card-3d">
                            <div className="card-front">
                                <div className="card-content">
                                    <div className="card-header">
                                        <span className="chain-badge">ETH</span>
                                        <span className="sbt-badge">SBT</span>
                                    </div>
                                    <div className="card-art">🎓</div>
                                    <div className="card-footer">
                                        <h3>{displayCourse}</h3>
                                        <p>#{tokenId}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDE: DATA */}
                <motion.div className="nft-data-section" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }}>
                    <div className="collection-info">
                        <span className="chain-icon">🔹</span>
                        <span>CertChain Academic Collection</span>
                        <span className="verified-tick">✓</span>
                    </div>

                    <h1 className="nft-title">{displayCourse} #{tokenId}</h1>
                    
                    <div className="owner-box">
                        <div className="avatar">👤</div>
                        <div className="owner-info">
                            <span>Owned by</span>
                            <span className="owner-address">{ownerAddress.substring(0, 6)}...{ownerAddress.substring(ownerAddress.length - 4)}</span>
                        </div>
                    </div>

                    <div className="glass-panel traits-panel">
                        <h3>⚡ On-Chain Attributes</h3>
                        <div className="traits-grid">
                            <TraitBox type="Institution" value={displayOrg} rarity="Issuer" />
                            <TraitBox type="Grade" value={displayGrade} rarity="Rare" />
                            <TraitBox type="Status" value="Soulbound" rarity="Legendary" />
                        </div>
                    </div>

                    {/* OpenSea Button */}
                    <button className="opensea-btn" onClick={() => window.open(`https://testnets.opensea.io/assets/${nftData?.contractAddress || '0x'}/${tokenId}`, '_blank')}>
                        🌊 View on OpenSea
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