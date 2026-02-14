import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import html2canvas from 'html2canvas';
import './SharePreview.css';

const SharePreview = ({ certificate, onClose }) => {
    const [platform, setPlatform] = useState('linkedin');
    const [copied, setCopied] = useState(false);
    const [generating, setGenerating] = useState(false);
    const previewRef = useRef(null);

    const shareUrl = `${window.location.origin}/verify/${certificate.certificateHash}`;

    const platforms = [
        { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: '#0077b5' },
        { id: 'twitter', name: 'Twitter', icon: '🐦', color: '#1da1f2' },
        { id: 'email', name: 'Email', icon: '📧', color: '#ea4335' },
        { id: 'whatsapp', name: 'WhatsApp', icon: '💬', color: '#25d366' }
    ];

    const shareMessages = {
        linkedin: `🎓 I'm excited to share that I've earned a verified certificate in ${certificate.courseName} from ${certificate.institutionName}! 

This credential is blockchain-verified and tamper-proof. Check it out:`,
        twitter: `🎓 Just earned my blockchain-verified certificate in ${certificate.courseName}! 

✅ Verified by ${certificate.institutionName}
⛓️ Secured on blockchain

#BlockchainCertificate #Education`,
        email: `Subject: My Verified Certificate - ${certificate.courseName}

I'm pleased to share my blockchain-verified certificate:

Course: ${certificate.courseName}
Institution: ${certificate.institutionName}
Grade: ${certificate.grade}

Verify it here:`,
        whatsapp: `🎓 Check out my blockchain-verified certificate!

📜 ${certificate.courseName}
🏛️ ${certificate.institutionName}
🏆 Grade: ${certificate.grade}

Verify:`
    };

    const handleShare = async () => {
        const message = shareMessages[platform];
        const fullMessage = `${message}\n${shareUrl}`;

        switch (platform) {
            case 'linkedin':
                window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
                break;
            case 'twitter':
                window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
                break;
            case 'email':
                window.location.href = `mailto:?subject=${encodeURIComponent(`My Verified Certificate - ${certificate.courseName}`)}&body=${encodeURIComponent(fullMessage)}`;
                break;
            case 'whatsapp':
                window.open(`https://wa.me/?text=${encodeURIComponent(fullMessage)}`, '_blank');
                break;
        }
    };

    const copyLink = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const downloadPreview = async () => {
        if (!previewRef.current) return;
        
        setGenerating(true);
        try {
            const canvas = await html2canvas(previewRef.current, {
                backgroundColor: null,
                scale: 2
            });
            const link = document.createElement('a');
            link.download = `certificate-${certificate.certificateHash.slice(0, 8)}.png`;
            link.href = canvas.toDataURL();
            link.click();
        } catch (error) {
            console.error('Error generating preview:', error);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="share-preview-overlay" onClick={onClose}>
            <motion.div 
                className="share-preview-modal"
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
            >
                <button className="close-btn" onClick={onClose}>✕</button>
                
                <h2>🔗 Share Certificate</h2>
                <p>Preview how your certificate will appear when shared</p>

                {/* Platform Selector */}
                <div className="platform-selector">
                    {platforms.map(p => (
                        <motion.button
                            key={p.id}
                            className={`platform-btn ${platform === p.id ? 'active' : ''}`}
                            style={{ 
                                borderColor: platform === p.id ? p.color : 'transparent',
                                backgroundColor: platform === p.id ? `${p.color}20` : 'transparent'
                            }}
                            onClick={() => setPlatform(p.id)}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <span className="platform-icon">{p.icon}</span>
                            <span className="platform-name">{p.name}</span>
                        </motion.button>
                    ))}
                </div>

                {/* Live Preview */}
                <div className="preview-section">
                    <h4>Preview on {platforms.find(p => p.id === platform)?.name}</h4>
                    
                    <div ref={previewRef} className={`social-preview ${platform}`}>
                        {/* Social Card Preview */}
                        <div className="preview-card">
                            <div className="preview-header">
                                <div className="preview-logo">🎓</div>
                                <div className="preview-source">
                                    <span className="source-name">CertChain</span>
                                    <span className="source-url">certchain.io</span>
                                </div>
                            </div>
                            
                            <div className="preview-image">
                                <div className="cert-preview-content">
                                    <span className="cert-icon">📜</span>
                                    <h3>{certificate.courseName}</h3>
                                    <p>Awarded to {certificate.studentName}</p>
                                    <div className="cert-badges">
                                        <span className="badge verified">✅ Verified</span>
                                        <span className="badge blockchain">⛓️ Blockchain</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="preview-details">
                                <h5>Verified Certificate - {certificate.courseName}</h5>
                                <p>Blockchain-verified credential from {certificate.institutionName}</p>
                            </div>
                        </div>

                        {/* Message Preview */}
                        <div className="message-preview">
                            <p>{shareMessages[platform]}</p>
                            <span className="link-preview">{shareUrl}</span>
                        </div>
                    </div>
                </div>

                {/* Share Link */}
                <div className="share-link-section">
                    <label>Verification Link</label>
                    <div className="link-input-wrapper">
                        <input type="text" value={shareUrl} readOnly />
                        <motion.button 
                            className="btn-copy"
                            onClick={copyLink}
                            whileTap={{ scale: 0.95 }}
                        >
                            {copied ? '✅ Copied!' : '📋 Copy'}
                        </motion.button>
                    </div>
                </div>

                {/* Actions */}
                <div className="share-actions">
                    <button 
                        className="btn-download"
                        onClick={downloadPreview}
                        disabled={generating}
                    >
                        {generating ? '⏳ Generating...' : '📥 Download Preview'}
                    </button>
                    <button 
                        className="btn-share"
                        onClick={handleShare}
                        style={{ 
                            background: `linear-gradient(135deg, ${platforms.find(p => p.id === platform)?.color}, ${platforms.find(p => p.id === platform)?.color}cc)` 
                        }}
                    >
                        {platforms.find(p => p.id === platform)?.icon} Share on {platforms.find(p => p.id === platform)?.name}
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

export default SharePreview;