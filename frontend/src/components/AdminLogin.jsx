import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './AdminLogin.css';

const AdminLogin = ({ onLogin, onClose }) => {
    const [step, setStep] = useState(1); // 1: Email, 2: Secret Code, 3: Mnemonic
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        email: '',
        secretCode: '',
        mnemonic: ''
    });
    const [mnemonicWords, setMnemonicWords] = useState(Array(12).fill(''));

    const handleEmailSubmit = (e) => {
        e.preventDefault();
        if (!formData.email.includes('@certchain.io')) {
            setError('Invalid admin email domain');
            return;
        }
        setError(null);
        setStep(2);
    };

    const handleSecretSubmit = (e) => {
        e.preventDefault();
        if (!formData.secretCode.startsWith('CHAIN_ADMIN_')) {
            setError('Invalid secret code format');
            return;
        }
        setError(null);
        setStep(3);
    };

    const handleMnemonicChange = (index, value) => {
        const newWords = [...mnemonicWords];
        newWords[index] = value.toLowerCase().trim();
        setMnemonicWords(newWords);
        setFormData({ ...formData, mnemonic: newWords.join(' ') });
    };

    const handleFinalSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // ✅ FIX: Use environment variable for API URL
            const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
            
            const response = await fetch(`${API_URL}/api/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    secretCode: formData.secretCode,
                    mnemonic12Words: formData.mnemonic
                })
            });

            let data;

            try {
                const text = await response.text();
                data = text ? JSON.parse(text) : {};
            } catch (err) {
                console.error("💀 Invalid JSON response:", err);
                data = { success: false, error: "INVALID_SERVER_RESPONSE" };
            }

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Login failed');
            }

            // ✅ FIX: Ensure token exists before storing
            if (!data.token) {
                throw new Error('No authentication token received from server');
            }

            // ✅ FIX: Store token and user data properly
            localStorage.setItem('token', data.token);
            localStorage.setItem('userRole', 'admin');
            localStorage.setItem('adminEmail', data.admin?.email || formData.email);
            localStorage.setItem('adminLevel', data.admin?.adminLevel || 'LEVEL_1');
            
            // Store complete user data as JSON
            if (data.admin) {
                localStorage.setItem('userData', JSON.stringify(data.admin));
            }

            // ✅ FIX: Log successful login for debugging
            console.log('✅ Admin login successful:', {
                email: data.admin?.email,
                level: data.admin?.adminLevel,
                tokenStored: !!localStorage.getItem('token')
            });

            // Call parent onLogin with complete data
            onLogin({
                ...data,
                userData: {
                    email: data.admin?.email || formData.email,
                    adminLevel: data.admin?.adminLevel || 'LEVEL_1',
                    wallet: data.admin?.wallet,
                    role: 'admin'
                }
            });

        } catch (err) {
            console.error('❌ Admin login error:', err);
            setError(err.message);
            
            // Shake animation on error
            document.querySelector('.admin-login-card')?.classList.add('shake');
            setTimeout(() => {
                document.querySelector('.admin-login-card')?.classList.remove('shake');
            }, 500);
        } finally {
            setLoading(false);
        }
    };

    const goBack = () => {
        setError(null);
        setStep(prev => prev - 1);
    };

    return (
        <div className="admin-login-overlay" onClick={onClose}>
            <motion.div 
                className="admin-login-card"
                onClick={(e) => e.stopPropagation()}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
            >
                <button className="close-btn" onClick={onClose}>✕</button>

                <div className="admin-login-header">
                    <div className="admin-icon">👑</div>
                    <h2>Admin Portal</h2>
                    <p>Secure Multi-Factor Authentication</p>
                </div>

                {/* Progress Steps */}
                <div className="login-steps">
                    <div className={`step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
                        <span className="step-number">{step > 1 ? '✓' : '1'}</span>
                        <span className="step-label">Email</span>
                    </div>
                    <div className="step-line" />
                    <div className={`step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
                        <span className="step-number">{step > 2 ? '✓' : '2'}</span>
                        <span className="step-label">Secret</span>
                    </div>
                    <div className="step-line" />
                    <div className={`step ${step >= 3 ? 'active' : ''}`}>
                        <span className="step-number">3</span>
                        <span className="step-label">Mnemonic</span>
                    </div>
                </div>

                {error && (
                    <motion.div 
                        className="error-message"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <span>⚠️</span> {error}
                    </motion.div>
                )}

                <AnimatePresence mode="wait">
                    {/* Step 1: Email */}
                    {step === 1 && (
                        <motion.form
                            key="step1"
                            onSubmit={handleEmailSubmit}
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="login-form"
                        >
                            <div className="form-group">
                                <label>Admin Email</label>
                                <div className="input-wrapper">
                                    <span className="input-icon">📧</span>
                                    <input
                                        type="email"
                                        placeholder="admin@certchain.io"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                        autoFocus
                                    />
                                </div>
                                <small>Use your assigned @certchain.io email</small>
                            </div>

                            <button type="submit" className="btn-next">
                                Continue <span>→</span>
                            </button>
                        </motion.form>
                    )}

                    {/* Step 2: Secret Code */}
                    {step === 2 && (
                        <motion.form
                            key="step2"
                            onSubmit={handleSecretSubmit}
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="login-form"
                        >
                            <div className="form-group">
                                <label>Secret Blockchain Code</label>
                                <div className="input-wrapper">
                                    <span className="input-icon">🔐</span>
                                    <input
                                        type="password"
                                        placeholder="CHAIN_ADMIN_XXX_XXXXXXXX"
                                        value={formData.secretCode}
                                        onChange={(e) => setFormData({ ...formData, secretCode: e.target.value.toUpperCase() })}
                                        required
                                        autoFocus
                                    />
                                </div>
                                <small>Enter your unique 32-character secret code</small>
                            </div>

                            <div className="btn-group">
                                <button type="button" className="btn-back" onClick={goBack}>
                                    <span>←</span> Back
                                </button>
                                <button type="submit" className="btn-next">
                                    Continue <span>→</span>
                                </button>
                            </div>
                        </motion.form>
                    )}

                    {/* Step 3: 12-Word Mnemonic */}
                    {step === 3 && (
                        <motion.form
                            key="step3"
                            onSubmit={handleFinalSubmit}
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="login-form"
                        >
                            <div className="form-group">
                                <label>12-Word Recovery Phrase</label>
                                <div className="mnemonic-grid">
                                    {mnemonicWords.map((word, index) => (
                                        <div key={index} className="mnemonic-input">
                                            <span className="word-number">{index + 1}</span>
                                            <input
                                                type="text"
                                                value={word}
                                                onChange={(e) => handleMnemonicChange(index, e.target.value)}
                                                placeholder="word"
                                                required
                                                autoFocus={index === 0}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <small>Enter each word of your 12-word phrase in order</small>
                            </div>

                            <div className="btn-group">
                                <button type="button" className="btn-back" onClick={goBack}>
                                    <span>←</span> Back
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn-submit"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <span className="spinner"></span>
                                            Authenticating...
                                        </>
                                    ) : (
                                        <>
                                            🔓 Authenticate
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.form>
                    )}
                </AnimatePresence>

                <div className="security-note">
                    <span>🛡️</span>
                    <p>Your credentials are encrypted and never stored. Authentication is verified against the secure admin registry.</p>
                </div>
            </motion.div>
        </div>
    );
};

export default AdminLogin;