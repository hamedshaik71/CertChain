import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './AuthPages.css';

function RegisterPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [formData, setFormData] = useState({
        role: 'student',
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        organization: '',
        phone: ''
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Validation
            if (!formData.email || !formData.password || !formData.fullName) {
                throw new Error('Please fill in all required fields');
            }

            if (formData.password !== formData.confirmPassword) {
                throw new Error('Passwords do not match');
            }

            if (formData.password.length < 6) {
                throw new Error('Password must be at least 6 characters');
            }

            // Role-specific validation
            if (formData.role === 'college' && !formData.organization) {
                throw new Error('Please enter your institution name');
            }

            // Mock registration
            const response = {
                success: true,
                user: {
                    email: formData.email,
                    role: formData.role,
                    fullName: formData.fullName,
                    id: Math.random().toString(36).substr(2, 9)
                }
            };

            setSuccess(true);
            
            // Redirect to login after success
            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (err) {
            setError(err.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page register-page">
            <div className="auth-container">
                <div className="auth-card register-card">
                    <div className="auth-header">
                        <div className="logo-animation">
                            <span className="logo-icon">🎓</span>
                        </div>
                        <h1>Join CertChain</h1>
                        <p>Create Your Account</p>
                    </div>

                    {error && (
                        <div className="alert alert-error shake-animation">
                            <span className="alert-icon">⚠️</span>
                            <span>{error}</span>
                        </div>
                    )}

                    {success && (
                        <div className="alert alert-success pulse-animation">
                            <span className="alert-icon">✓</span>
                            <span>Registration successful! Redirecting...</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="form-group">
                            <label htmlFor="role">Register As</label>
                            <select
                                id="role"
                                name="role"
                                value={formData.role}
                                onChange={handleInputChange}
                                className="form-input"
                            >
                                <option value="student">Student</option>
                                <option value="college">College/Institution</option>
                                <option value="employer">Employer/Verifier</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="fullName">Full Name</label>
                            <div className="input-wrapper">
                                <input
                                    type="text"
                                    id="fullName"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleInputChange}
                                    placeholder="John Doe"
                                    className="form-input"
                                    required
                                />
                                <span className="input-icon">👤</span>
                            </div>
                        </div>

                        {formData.role === 'college' && (
                            <div className="form-group">
                                <label htmlFor="organization">Institution Name</label>
                                <div className="input-wrapper">
                                    <input
                                        type="text"
                                        id="organization"
                                        name="organization"
                                        value={formData.organization}
                                        onChange={handleInputChange}
                                        placeholder="University/College Name"
                                        className="form-input"
                                        required
                                    />
                                    <span className="input-icon">🏫</span>
                                </div>
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="email">Email Address</label>
                            <div className="input-wrapper">
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    placeholder="your@email.com"
                                    className="form-input"
                                    required
                                />
                                <span className="input-icon">✉️</span>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <div className="input-wrapper">
                                <input
                                    type="password"
                                    id="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    placeholder="••••••••"
                                    className="form-input"
                                    required
                                />
                                <span className="input-icon">🔐</span>
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirmPassword">Confirm Password</label>
                            <div className="input-wrapper">
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleInputChange}
                                    placeholder="••••••••"
                                    className="form-input"
                                    required
                                />
                                <span className="input-icon">✓</span>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className="btn-auth btn-register"
                            disabled={loading || success}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner-small"></span>
                                    Creating Account...
                                </>
                            ) : success ? (
                                '✓ Account Created!'
                            ) : (
                                'Create Account'
                            )}
                        </button>
                    </form>

                    <div className="auth-footer">
                        <p>Already have an account? 
                            <Link to="/login" className="auth-link">Sign in here</Link>
                        </p>
                    </div>
                </div>

                <div className="auth-info">
                    <div className="info-box info-slide-in">
                        <h3>For Students</h3>
                        <ul>
                            <li>✓ Store digital certificates</li>
                            <li>✓ Share with employers</li>
                            <li>✓ Verify instantly</li>
                        </ul>
                    </div>
                    <div className="info-box info-slide-in" style={{ animationDelay: '0.2s' }}>
                        <h3>For Institutions</h3>
                        <ul>
                            <li>✓ Issue certificates</li>
                            <li>✓ Manage records</li>
                            <li>✓ Track verification</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RegisterPage;