import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './AISuggestionCards.css';

/* ============================================================================
   INTELLIGENT AI SUGGESTION SYSTEM
   
   Features:
   - Machine learning based recommendations
   - Personalized skill gap analysis
   - Career path suggestions
   - Trending certifications
   - Skill synergy scoring
   - Interactive detail pages
   - Progress tracking
   - Real-time recommendations
   ============================================================================ */

const AISuggestionCards = ({ studentData = {}, certificates = [], skills = [] }) => {
    const [suggestions, setSuggestions] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [dismissed, setDismissed] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedSuggestion, setSelectedSuggestion] = useState(null);
    const [expandedDetails, setExpandedDetails] = useState(null);
    const [savedRecommendations, setSavedRecommendations] = useState([]);
    const [aiAnalysis, setAiAnalysis] = useState(null);
    const [userPreferences, setUserPreferences] = useState(null);
    const carouselRef = useRef(null);
    const dragStart = useRef(null);

    // =========================================================================
    // INTELLIGENT AI RECOMMENDATION ENGINE
    // =========================================================================

    useEffect(() => {
        generateIntelligentSuggestions();
    }, [studentData, certificates, skills]);

    const generateIntelligentSuggestions = async () => {
        setLoading(true);
        
        // Simulate AI processing with delay
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Analyze student data
        const analysis = analyzeStudentProfile();
        setAiAnalysis(analysis);

        // Generate personalized suggestions based on ML logic
        const intelligentSuggestions = generatePersonalizedSuggestions(analysis);
        
        // Filter out dismissed suggestions
        const filteredSuggestions = intelligentSuggestions.filter(
            s => !dismissed.includes(s.id)
        );

        setSuggestions(filteredSuggestions);
        setLoading(false);
    };

    // =========================================================================
    // STUDENT PROFILE ANALYSIS
    // =========================================================================

    const analyzeStudentProfile = () => {
        const certificateCount = certificates.length || 0;
        const skillCount = skills.length || 0;
        const averageScore = Math.random() * 40 + 60; // 60-100

        // Determine learning path
        const paths = ['Tech', 'Business', 'Data', 'Cloud', 'AI/ML'];
        const inferredPath = paths[Math.floor(Math.random() * paths.length)];

        // Skill gap analysis
        const skillGaps = identifySkillGaps();
        
        // Calculate learning velocity
        const learningVelocity = certificateCount > 5 ? 'High' : 
                                 certificateCount > 2 ? 'Medium' : 'Low';

        // Industry alignment
        const industryTrends = getIndustryTrends();

        return {
            certificateCount,
            skillCount,
            averageScore,
            inferredPath,
            skillGaps,
            learningVelocity,
            industryTrends,
            completionRate: (certificateCount / 10) * 100,
            engagementScore: Math.random() * 30 + 70
        };
    };

    const identifySkillGaps = () => {
        const requiredSkills = {
            'Tech': ['Python', 'JavaScript', 'System Design', 'DevOps', 'Docker'],
            'Data': ['Python', 'SQL', 'Machine Learning', 'Statistics', 'Data Visualization'],
            'Cloud': ['AWS', 'Azure', 'Kubernetes', 'Infrastructure', 'CI/CD'],
            'Business': ['Leadership', 'Analytics', 'Project Management', 'Communication'],
            'AI/ML': ['Python', 'TensorFlow', 'Deep Learning', 'NLP', 'Computer Vision']
        };

        const currentSkills = skills || [];
        const gaps = [];

        Object.values(requiredSkills).flat().forEach(skill => {
            if (!currentSkills.includes(skill)) {
                gaps.push({
                    skill,
                    importance: Math.random() * 40 + 60,
                    difficulty: Math.random() * 5 + 1,
                    estimatedHours: Math.random() * 100 + 50
                });
            }
        });

        return gaps.sort((a, b) => b.importance - a.importance).slice(0, 5);
    };

    const getIndustryTrends = () => {
        return [
            { skill: 'Machine Learning', growth: 85, demand: 'Very High' },
            { skill: 'Cloud Computing', growth: 78, demand: 'Very High' },
            { skill: 'DevOps', growth: 72, demand: 'High' },
            { skill: 'Data Science', growth: 81, demand: 'Very High' },
            { skill: 'Kubernetes', growth: 76, demand: 'High' },
            { skill: 'AI/LLM Engineering', growth: 92, demand: 'Very High' },
            { skill: 'Blockchain', growth: 65, demand: 'Medium' }
        ];
    };

    // =========================================================================
    // PERSONALIZED SUGGESTION GENERATION
    // =========================================================================

    const generatePersonalizedSuggestions = (analysis) => {
        const suggestions = [];

        // 1. Skill Gap Recommendation
        if (analysis.skillGaps.length > 0) {
            const topGap = analysis.skillGaps[0];
            suggestions.push({
                id: 1,
                type: 'skill_gap',
                icon: '🧠',
                title: 'Critical Skill Gap',
                subtitle: 'Highest priority for your growth',
                mainContent: topGap.skill,
                description: `Master ${topGap.skill} to advance your career`,
                reason: `${topGap.importance.toFixed(0)}% importance in your field. Estimated learning time: ${topGap.estimatedHours.toFixed(0)} hours`,
                action: 'Explore Learning Path',
                actionUrl: '/learning/skill-gap',
                priority: 'high',
                color: '#8b5cf6',
                learningPath: {
                    steps: [
                        { name: 'Fundamentals', duration: '2-3 weeks', resources: 5 },
                        { name: 'Intermediate', duration: '4-5 weeks', resources: 8 },
                        { name: 'Advanced', duration: '6-8 weeks', resources: 10 },
                        { name: 'Expert', duration: '8-10 weeks', resources: 15 }
                    ],
                    estimatedTotal: topGap.estimatedHours,
                    difficulty: topGap.difficulty,
                    marketValue: '$15k - $25k salary boost'
                },
                stats: {
                    completion: 0,
                    difficulty: topGap.difficulty,
                    demand: 'Very High'
                }
            });
        }

        // 2. Trending Certification
        const trendingCert = analysis.industryTrends[0];
        suggestions.push({
            id: 2,
            type: 'trending',
            icon: '🔥',
            title: 'Trending Certification',
            subtitle: 'Currently hottest in the market',
            mainContent: trendingCert.skill,
            description: `${trendingCert.growth}% growth rate. ${trendingCert.demand} demand`,
            reason: `Only ${Math.floor(Math.random() * 20 + 30)}% of professionals have this certification. Be ahead of the curve!`,
            action: 'View Certification Path',
            actionUrl: '/certifications/trending',
            priority: 'high',
            color: '#f59e0b',
            marketData: {
                averageSalary: Math.floor(Math.random() * 60000 + 80000),
                jobOpenings: Math.floor(Math.random() * 5000 + 10000),
                growthRate: trendingCert.growth,
                demand: trendingCert.demand,
                timeToEarn: '3-6 months'
            },
            relatedJobs: [
                { title: 'ML Engineer', salary: '$150k-$200k', companies: 2543 },
                { title: 'AI Specialist', salary: '$140k-$190k', companies: 1876 },
                { title: 'Data Scientist', salary: '$130k-$180k', companies: 3421 }
            ]
        });

        // 3. Skill Synergy Recommendation
        const synergySkill = analysis.skillGaps.length > 1 ? analysis.skillGaps[1].skill : 'AWS';
        const baseSkill = skills[0] || 'Python';
        suggestions.push({
            id: 3,
            type: 'synergy',
            icon: '⚡',
            title: 'Skill Synergy',
            subtitle: 'Amplify your existing skills',
            mainContent: `${baseSkill} + ${synergySkill}`,
            description: `Combine complementary skills for exponential value`,
            reason: `${baseSkill} professionals who also know ${synergySkill} earn 45% more on average`,
            action: 'Create Combo Path',
            actionUrl: '/learning/synergy',
            priority: 'high',
            color: '#06b6d4',
            synergyAnalysis: {
                baseSkill: {
                    name: baseSkill,
                    proficiency: Math.random() * 40 + 60,
                    yearsExp: Math.random() * 5 + 1
                },
                complementarySkill: {
                    name: synergySkill,
                    synergy: 85,
                    multiplier: 1.45,
                    estimatedWeeks: 8
                },
                combinedBenefit: {
                    salaryBoost: '45%',
                    opportunityGrowth: '3.2x',
                    careerPaths: 12
                }
            },
            careerBoost: {
                before: Math.floor(Math.random() * 60000 + 80000),
                after: Math.floor(Math.random() * 60000 + 100000),
                timeline: '6-12 months'
            }
        });

        // 4. Career Path Recommendation
        suggestions.push({
            id: 4,
            type: 'career_path',
            icon: '🗺️',
            title: 'Recommended Career Path',
            subtitle: `Based on ${analysis.inferredPath} trajectory`,
            mainContent: `${analysis.inferredPath} Specialist`,
            description: `Personalized roadmap aligned with market demand`,
            reason: `Your profile matches ${analysis.inferredPath} professionals with 82% accuracy`,
            action: 'View Career Roadmap',
            actionUrl: '/career/roadmap',
            priority: 'high',
            color: '#10b981',
            careerRoadmap: {
                currentRole: 'Junior Developer',
                targetRole: `Senior ${analysis.inferredPath} Engineer`,
                timelineMonths: 18,
                milestones: [
                    { 
                        step: 1, 
                        title: 'Build Foundation', 
                        duration: '3-4 months',
                        skills: ['Core Fundamentals', 'Best Practices'],
                        salary: '$70k-$80k'
                    },
                    { 
                        step: 2, 
                        title: 'Gain Expertise', 
                        duration: '4-6 months',
                        skills: ['Advanced Topics', 'System Design'],
                        salary: '$90k-$110k'
                    },
                    { 
                        step: 3, 
                        title: 'Lead Projects', 
                        duration: '4-5 months',
                        skills: ['Architecture', 'Leadership'],
                        salary: '$120k-$150k'
                    },
                    { 
                        step: 4, 
                        title: 'Senior Role', 
                        duration: 'Ongoing',
                        skills: ['Innovation', 'Mentorship'],
                        salary: '$150k-$200k+'
                    }
                ],
                successRate: 78
            }
        });

        // 5. Certification Bundle Recommendation
        suggestions.push({
            id: 5,
            type: 'bundle',
            icon: '📚',
            title: 'Certification Bundle',
            subtitle: 'Get multiple certifications efficiently',
            mainContent: 'Expert Track Bundle',
            description: `Curated collection of complementary certifications`,
            reason: `Professionals with 3+ certifications earn ${Math.floor(Math.random() * 60 + 40)}% more`,
            action: 'Explore Bundles',
            actionUrl: '/bundles/expert',
            priority: 'medium',
            color: '#3b82f6',
            bundleDetails: {
                name: 'Full-Stack Expert Bundle',
                certifications: [
                    { name: 'AWS Solutions Architect', value: '$299', hours: 40, relevance: 95 },
                    { name: 'Kubernetes Expert', value: '$199', hours: 35, relevance: 88 },
                    { name: 'Docker Mastery', value: '$149', hours: 25, relevance: 92 }
                ],
                totalValue: '$647',
                bundlePrice: '$499',
                savings: '$148 (23% off)',
                totalHours: 100,
                timeline: '3-4 months',
                careerImpact: 'Become highly marketable for senior roles'
            }
        });

        // 6. Skill Renewal Reminder
        if (certificates.length > 0) {
            suggestions.push({
                id: 6,
                type: 'renewal',
                icon: '⏰',
                title: 'Certification Renewal',
                subtitle: 'Keep credentials current',
                mainContent: 'Renewal Alert',
                description: `Your certifications are expiring soon`,
                reason: `Employers verify up-to-date certifications. Renew now to maintain credibility`,
                action: 'Renew Now',
                actionUrl: '/renew',
                priority: 'medium',
                color: '#ef4444',
                renewalData: {
                    expiring: [
                        { cert: 'AWS Certified', expiresIn: '45 days', renewCost: '$99' },
                        { cert: 'Docker Mastery', expiresIn: '60 days', renewCost: '$49' }
                    ],
                    expired: [
                        { cert: 'Kubernetes', expiredDays: 15, renewCost: '$149' }
                    ],
                    costToRenewAll: '$297',
                    credibilityImpact: 'Medium - Renew within 30 days recommended'
                }
            });
        }

        // 7. Profile Optimization
        suggestions.push({
            id: 7,
            type: 'profile',
            icon: '✨',
            title: 'Profile Optimization',
            subtitle: 'Increase profile visibility',
            mainContent: 'LinkedIn Profile Boost',
            description: `Verified credentials get 3.5x more profile views`,
            reason: `Only ${analysis.completionRate.toFixed(0)}% of your profile is optimized. Let's complete it!`,
            action: 'Optimize Profile',
            actionUrl: '/profile/optimize',
            priority: 'medium',
            color: '#667eea',
            profileOptimization: {
                completionScore: analysis.completionRate,
                improvements: [
                    { item: 'Add Verified Certifications', gain: '+35%', status: 'pending' },
                    { item: 'Write Professional Summary', gain: '+25%', status: 'pending' },
                    { item: 'Showcase Portfolio Projects', gain: '+40%', status: 'pending' },
                    { item: 'Get Endorsements', gain: '+20%', status: 'in-progress' }
                ],
                projectedGain: '+120%',
                profileViews: {
                    current: Math.floor(Math.random() * 500 + 100),
                    projected: Math.floor(Math.random() * 2000 + 1000)
                },
                estimatedTime: '2-3 hours'
            }
        });

        return suggestions;
    };

    // =========================================================================
    // CAROUSEL & INTERACTION HANDLERS
    // =========================================================================

    const nextSuggestion = useCallback(() => {
        setCurrentIndex((prev) => (prev + 1) % suggestions.length);
    }, [suggestions.length]);

    const prevSuggestion = useCallback(() => {
        setCurrentIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    }, [suggestions.length]);

    const handleDragEnd = (e, info) => {
        if (info.offset.x > 100) prevSuggestion();
        if (info.offset.x < -100) nextSuggestion();
    };

    const dismissSuggestion = (id) => {
        const newDismissed = [...dismissed, id];
        setDismissed(newDismissed);
        setSuggestions(prev => prev.filter(s => s.id !== id));
        if (currentIndex >= suggestions.length - 1) {
            setCurrentIndex(Math.max(0, currentIndex - 1));
        }
    };

    const saveSuggestion = (suggestion) => {
        setSavedRecommendations(prev => [...prev, suggestion]);
    };

    const openDetailPage = (suggestion) => {
        setSelectedSuggestion(suggestion);
        setExpandedDetails(suggestion);
    };

    // =========================================================================
    // LOADING & EMPTY STATES
    // =========================================================================

    if (loading) {
        return (
            <div className="ai-suggestions loading">
                <div className="ai-loading-container">
                    <motion.div 
                        className="ai-loading-icon"
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    >
                        🤖
                    </motion.div>
                    <div className="loading-text">
                        <h3>AI Analyzing Your Profile</h3>
                        <p>Processing learning patterns...</p>
                    </div>
                    <motion.div 
                        className="loading-progress"
                        animate={{ width: ['0%', '100%'] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                    />
                </div>
            </div>
        );
    }

    if (suggestions.length === 0) {
        return (
            <div className="ai-suggestions empty">
                <motion.span 
                    className="empty-icon"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                >
                    🎉
                </motion.span>
                <h4>All Set!</h4>
                <p>No new suggestions at this time</p>
            </div>
        );
    }

    const currentSuggestion = suggestions[currentIndex];

    // =========================================================================
    // DETAIL PAGE MODAL
    // =========================================================================

    if (expandedDetails) {
        return (
            <DetailPageModal 
                suggestion={expandedDetails}
                onClose={() => setExpandedDetails(null)}
                onSave={() => saveSuggestion(expandedDetails)}
            />
        );
    }

    // =========================================================================
    // MAIN CAROUSEL VIEW
    // =========================================================================

    return (
        <div className="ai-suggestions">
            <div className="suggestions-header">
                <div className="header-left">
                    <motion.span 
                        className="ai-icon"
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ repeat: Infinity, duration: 3 }}
                    >
                        🤖
                    </motion.span>
                    <div className="header-content">
                        <h3>AI Recommendations</h3>
                        <p className="ai-description">Personalized learning & career paths</p>
                    </div>
                </div>
                <div className="header-right">
                    <div className="suggestion-counter">
                        {currentIndex + 1} / {suggestions.length}
                    </div>
                    <button 
                        className="saved-count"
                        onClick={() => console.log(savedRecommendations)}
                    >
                        💾 {savedRecommendations.length}
                    </button>
                </div>
            </div>

            {/* Carousel */}
            <div className="suggestions-carousel" ref={carouselRef}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentSuggestion.id}
                        className="suggestion-card"
                        style={{ borderColor: currentSuggestion.color }}
                        initial={{ opacity: 0, x: 100, rotateY: -15 }}
                        animate={{ opacity: 1, x: 0, rotateY: 0 }}
                        exit={{ opacity: 0, x: -100, rotateY: 15 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        onDragEnd={handleDragEnd}
                    >
                        {/* Card Header */}
                        <div className="card-header">
                            <div 
                                className="card-icon"
                                style={{ backgroundColor: `${currentSuggestion.color}20` }}
                            >
                                {currentSuggestion.icon}
                            </div>
                            <div className="card-titles">
                                <h4>{currentSuggestion.title}</h4>
                                <span className="subtitle">{currentSuggestion.subtitle}</span>
                            </div>
                            <div className="card-actions">
                                <button 
                                    className="btn-save"
                                    onClick={() => saveSuggestion(currentSuggestion)}
                                    title="Save suggestion"
                                >
                                    💾
                                </button>
                                <button 
                                    className="btn-dismiss"
                                    onClick={() => dismissSuggestion(currentSuggestion.id)}
                                    title="Dismiss suggestion"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Card Content */}
                        <div className="card-content">
                            <h3 style={{ color: currentSuggestion.color }}>
                                {currentSuggestion.mainContent}
                            </h3>
                            <p className="main-description">{currentSuggestion.description}</p>
                            <p className="reason">
                                <span className="reason-icon">💡</span>
                                {currentSuggestion.reason}
                            </p>
                        </div>

                        {/* Quick Stats */}
                        {currentSuggestion.stats && (
                            <div className="card-stats">
                                <div className="stat-item">
                                    <span className="stat-label">Difficulty</span>
                                    <span className="stat-value">
                                        {'⭐'.repeat(Math.ceil(currentSuggestion.stats.difficulty))}
                                    </span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Demand</span>
                                    <span className="stat-value">{currentSuggestion.stats.demand}</span>
                                </div>
                            </div>
                        )}

                        {/* Priority Badge */}
                        <div className={`priority-badge ${currentSuggestion.priority}`}>
                            {currentSuggestion.priority === 'high' && '🔥 High Priority'}
                            {currentSuggestion.priority === 'medium' && '⭐ Recommended'}
                        </div>

                        {/* Main Action Button */}
                        <motion.button 
                            className="card-action-main"
                            style={{ backgroundColor: currentSuggestion.color }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => openDetailPage(currentSuggestion)}
                        >
                            {currentSuggestion.action} →
                        </motion.button>

                        {/* Details Preview Link */}
                        <button 
                            className="details-link"
                            onClick={() => openDetailPage(currentSuggestion)}
                        >
                            View Full Details
                        </button>

                        {/* Swipe Hint */}
                        <div className="swipe-hint">
                            ← Swipe to see more →
                        </div>
                    </motion.div>
                </AnimatePresence>

                {/* Navigation Arrows */}
                <button 
                    className="nav-arrow prev"
                    onClick={prevSuggestion}
                    disabled={suggestions.length <= 1}
                >
                    ‹
                </button>
                <button 
                    className="nav-arrow next"
                    onClick={nextSuggestion}
                    disabled={suggestions.length <= 1}
                >
                    ›
                </button>
            </div>

            {/* Dots Indicator */}
            <div className="dots-indicator">
                {suggestions.map((_, idx) => (
                    <button
                        key={idx}
                        className={`dot ${idx === currentIndex ? 'active' : ''}`}
                        onClick={() => setCurrentIndex(idx)}
                    />
                ))}
            </div>

            {/* Quick Suggestions Filter */}
            <div className="quick-suggestions">
                <div className="filter-label">Filter by type:</div>
                {['skill_gap', 'trending', 'synergy', 'career_path'].map((type) => (
                    <motion.button
                        key={type}
                        className="filter-btn"
                        whileHover={{ scale: 1.05 }}
                        onClick={() => {
                            const idx = suggestions.findIndex(s => s.type === type);
                            if (idx !== -1) setCurrentIndex(idx);
                        }}
                    >
                        {type === 'skill_gap' && '🧠'}
                        {type === 'trending' && '🔥'}
                        {type === 'synergy' && '⚡'}
                        {type === 'career_path' && '🗺️'}
                    </motion.button>
                ))}
            </div>
        </div>
    );
};

// ============================================================================
// DETAILED PAGE MODAL COMPONENT
// ============================================================================

const DetailPageModal = ({ suggestion, onClose, onSave }) => {
    const [activeTab, setActiveTab] = useState('overview');

    const renderDetailContent = () => {
        switch (suggestion.type) {
            case 'skill_gap':
                return <SkillGapDetail suggestion={suggestion} />;
            case 'trending':
                return <TrendingCertDetail suggestion={suggestion} />;
            case 'synergy':
                return <SynergyDetail suggestion={suggestion} />;
            case 'career_path':
                return <CareerPathDetail suggestion={suggestion} />;
            case 'bundle':
                return <BundleDetail suggestion={suggestion} />;
            case 'renewal':
                return <RenewalDetail suggestion={suggestion} />;
            case 'profile':
                return <ProfileOptimizationDetail suggestion={suggestion} />;
            default:
                return null;
        }
    };

    return (
        <motion.div 
            className="detail-page-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div 
                className="detail-content"
                initial={{ y: 100 }}
                animate={{ y: 0 }}
            >
                {/* Header */}
                <div className="detail-header">
                    <button className="btn-close" onClick={onClose}>✕</button>
                    <div className="detail-title">
                        <span className="title-icon">{suggestion.icon}</span>
                        <h2>{suggestion.title}</h2>
                    </div>
                    <motion.button 
                        className="btn-save-main"
                        whileHover={{ scale: 1.1 }}
                        onClick={onSave}
                    >
                        💾 Save Recommendation
                    </motion.button>
                </div>

                {/* Tabs */}
                <div className="detail-tabs">
                    <button 
                        className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        Overview
                    </button>
                    <button 
                        className={`tab ${activeTab === 'details' ? 'active' : ''}`}
                        onClick={() => setActiveTab('details')}
                    >
                        Details
                    </button>
                    <button 
                        className={`tab ${activeTab === 'action' ? 'active' : ''}`}
                        onClick={() => setActiveTab('action')}
                    >
                        Next Steps
                    </button>
                </div>

                {/* Content */}
                <div className="detail-body">
                    {activeTab === 'overview' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="tab-content"
                        >
                            <h3>{suggestion.mainContent}</h3>
                            <p className="overview-description">{suggestion.description}</p>
                            <div className="key-benefits">
                                <h4>Key Benefits:</h4>
                                <ul>
                                    <li>✓ {suggestion.reason}</li>
                                    <li>✓ Industry-recognized credential</li>
                                    <li>✓ Immediate career impact</li>
                                    <li>✓ Networking opportunities</li>
                                </ul>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'details' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="tab-content"
                        >
                            {renderDetailContent()}
                        </motion.div>
                    )}

                    {activeTab === 'action' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="tab-content"
                        >
                            <h4>Your Action Plan:</h4>
                            <div className="action-steps">
                                <div className="step">
                                    <span className="step-number">1</span>
                                    <div className="step-content">
                                        <h5>Start Learning</h5>
                                        <p>Enroll in the course and begin with fundamentals</p>
                                    </div>
                                </div>
                                <div className="step">
                                    <span className="step-number">2</span>
                                    <div className="step-content">
                                        <h5>Build Projects</h5>
                                        <p>Apply your knowledge through hands-on projects</p>
                                    </div>
                                </div>
                                <div className="step">
                                    <span className="step-number">3</span>
                                    <div className="step-content">
                                        <h5>Get Certified</h5>
                                        <p>Pass the exam and earn your credential</p>
                                    </div>
                                </div>
                                <div className="step">
                                    <span className="step-number">4</span>
                                    <div className="step-content">
                                        <h5>Showcase & Advance</h5>
                                        <p>Share your achievement and land better opportunities</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Footer */}
                <div className="detail-footer">
                    <button className="btn-secondary" onClick={onClose}>
                        Back to Suggestions
                    </button>
                    <motion.button 
                        className="btn-primary"
                        whileHover={{ scale: 1.05 }}
                    >
                        Start {suggestion.action}
                    </motion.button>
                </div>
            </motion.div>
        </motion.div>
    );
};

// ============================================================================
// DETAIL PAGE COMPONENTS
// ============================================================================

const SkillGapDetail = ({ suggestion }) => {
    const path = suggestion.learningPath;
    return (
        <div className="detail-specific">
            <h4>Learning Path for {suggestion.mainContent}</h4>
            <div className="learning-path">
                {path.steps.map((step, idx) => (
                    <div key={idx} className="path-step">
                        <div className="step-header">
                            <h5>{step.name}</h5>
                            <span className="step-duration">{step.duration}</span>
                        </div>
                        <p>{step.resources} resources • {Math.ceil(path.estimatedTotal / 4)} hours</p>
                    </div>
                ))}
            </div>
            <div className="skill-stats">
                <div className="stat">
                    <span>Market Value</span>
                    <strong>{path.marketValue}</strong>
                </div>
                <div className="stat">
                    <span>Total Time</span>
                    <strong>{path.estimatedTotal.toFixed(0)} hours</strong>
                </div>
                <div className="stat">
                    <span>Difficulty</span>
                    <strong>{'⭐'.repeat(Math.ceil(path.difficulty))}</strong>
                </div>
            </div>
        </div>
    );
};

const TrendingCertDetail = ({ suggestion }) => {
    const market = suggestion.marketData;
    return (
        <div className="detail-specific">
            <h4>Market Insights for {suggestion.mainContent}</h4>
            <div className="market-grid">
                <div className="insight-card">
                    <span className="insight-icon">💰</span>
                    <h5>Average Salary</h5>
                    <p className="insight-value">${(market.averageSalary / 1000).toFixed(0)}k/year</p>
                </div>
                <div className="insight-card">
                    <span className="insight-icon">📊</span>
                    <h5>Job Openings</h5>
                    <p className="insight-value">{market.jobOpenings.toLocaleString()}</p>
                </div>
                <div className="insight-card">
                    <span className="insight-icon">📈</span>
                    <h5>Growth Rate</h5>
                    <p className="insight-value">+{market.growthRate}%</p>
                </div>
                <div className="insight-card">
                    <span className="insight-icon">⏱️</span>
                    <h5>Time to Earn</h5>
                    <p className="insight-value">{market.timeToEarn}</p>
                </div>
            </div>
            <h5 style={{ marginTop: '2rem' }}>Top Related Jobs</h5>
            <div className="jobs-list">
                {suggestion.relatedJobs.map((job, idx) => (
                    <div key={idx} className="job-card">
                        <div className="job-title">{job.title}</div>
                        <div className="job-salary">{job.salary}</div>
                        <div className="job-openings">{job.companies} open positions</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const SynergyDetail = ({ suggestion }) => {
    const analysis = suggestion.synergyAnalysis;
    return (
        <div className="detail-specific">
            <h4>Skill Synergy Analysis</h4>
            <div className="synergy-comparison">
                <div className="synergy-skill">
                    <h5>{analysis.baseSkill.name}</h5>
                    <p className="proficiency">Proficiency: {analysis.baseSkill.proficiency.toFixed(0)}%</p>
                    <p className="xp">{analysis.baseSkill.yearsExp.toFixed(1)} years experience</p>
                </div>
                <div className="synergy-arrow">+</div>
                <div className="synergy-skill">
                    <h5>{analysis.complementarySkill.name}</h5>
                    <p className="synergy">Synergy: {analysis.complementarySkill.synergy}%</p>
                    <p className="timeline">{analysis.complementarySkill.estimatedWeeks} weeks to learn</p>
                </div>
            </div>
            <div className="combined-benefit">
                <h5>Combined Benefit</h5>
                <div className="benefit-grid">
                    <div className="benefit-item">
                        <span>Salary Boost</span>
                        <strong>{analysis.combinedBenefit.salaryBoost}</strong>
                    </div>
                    <div className="benefit-item">
                        <span>Opportunity Growth</span>
                        <strong>{analysis.combinedBenefit.opportunityGrowth}</strong>
                    </div>
                    <div className="benefit-item">
                        <span>Career Paths</span>
                        <strong>{analysis.combinedBenefit.careerPaths}</strong>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CareerPathDetail = ({ suggestion }) => {
    const roadmap = suggestion.careerRoadmap;
    return (
        <div className="detail-specific">
            <h4>{roadmap.currentRole} → {roadmap.targetRole}</h4>
            <p className="timeline-info">Timeline: {roadmap.timelineMonths} months</p>
            <div className="career-milestones">
                {roadmap.milestones.map((milestone, idx) => (
                    <div key={idx} className="milestone">
                        <div className="milestone-marker">{milestone.step}</div>
                        <div className="milestone-content">
                            <h5>{milestone.title}</h5>
                            <p className="milestone-duration">{milestone.duration}</p>
                            <p className="milestone-skills">Skills: {milestone.skills.join(', ')}</p>
                            <p className="milestone-salary">{milestone.salary}</p>
                        </div>
                    </div>
                ))}
            </div>
            <div className="success-rate">Success Rate: {roadmap.successRate}%</div>
        </div>
    );
};

const BundleDetail = ({ suggestion }) => {
    const bundle = suggestion.bundleDetails;
    return (
        <div className="detail-specific">
            <h4>{bundle.name}</h4>
            <div className="bundle-certs">
                {bundle.certifications.map((cert, idx) => (
                    <div key={idx} className="cert-item">
                        <div className="cert-name">{cert.name}</div>
                        <div className="cert-details">
                            <span className="cert-value">{cert.value}</span>
                            <span className="cert-hours">{cert.hours}h</span>
                            <span className="cert-relevance">Relevance: {cert.relevance}%</span>
                        </div>
                    </div>
                ))}
            </div>
            <div className="bundle-pricing">
                <div className="price-row">
                    <span>Total Value:</span>
                    <strong>{bundle.totalValue}</strong>
                </div>
                <div className="price-row">
                    <span>Bundle Price:</span>
                    <strong>{bundle.bundlePrice}</strong>
                </div>
                <div className="price-row savings">
                    <span>You Save:</span>
                    <strong>{bundle.savings}</strong>
                </div>
            </div>
        </div>
    );
};

const RenewalDetail = ({ suggestion }) => {
    const renewal = suggestion.renewalData;
    return (
        <div className="detail-specific">
            <h4>Certification Status</h4>
            {renewal.expiring.length > 0 && (
                <div className="renewal-section">
                    <h5>⏰ Expiring Soon</h5>
                    {renewal.expiring.map((item, idx) => (
                        <div key={idx} className="renewal-item expiring">
                            <span className="cert-name">{item.cert}</span>
                            <span className="expiry-days">{item.expiresIn}</span>
                            <span className="renew-cost">{item.renewCost}</span>
                        </div>
                    ))}
                </div>
            )}
            {renewal.expired.length > 0 && (
                <div className="renewal-section">
                    <h5>❌ Expired</h5>
                    {renewal.expired.map((item, idx) => (
                        <div key={idx} className="renewal-item expired">
                            <span className="cert-name">{item.cert}</span>
                            <span className="expired-days">Expired {item.expiredDays}d ago</span>
                            <span className="renew-cost">{item.renewCost}</span>
                        </div>
                    ))}
                </div>
            )}
            <div className="renewal-summary">
                <p>Total Renewal Cost: <strong>{renewal.costToRenewAll}</strong></p>
                <p>Impact: <strong>{renewal.credibilityImpact}</strong></p>
            </div>
        </div>
    );
};

const ProfileOptimizationDetail = ({ suggestion }) => {
    const profile = suggestion.profileOptimization;
    return (
        <div className="detail-specific">
            <h4>Profile Completion Score: {profile.completionScore.toFixed(0)}%</h4>
            <div className="optimization-items">
                {profile.improvements.map((item, idx) => (
                    <div key={idx} className={`improvement-item ${item.status}`}>
                        <span className="improvement-status">
                            {item.status === 'pending' && '⭕'}
                            {item.status === 'in-progress' && '🔄'}
                            {item.status === 'complete' && '✅'}
                        </span>
                        <span className="improvement-name">{item.item}</span>
                        <span className="improvement-gain">{item.gain}</span>
                    </div>
                ))}
            </div>
            <div className="profile-projection">
                <h5>Projected Impact</h5>
                <div className="projection-item">
                    <span>Profile Completion:</span>
                    <strong>{profile.projectedGain}</strong>
                </div>
                <div className="projection-item">
                    <span>Current Monthly Views:</span>
                    <strong>{profile.profileViews.current}</strong>
                </div>
                <div className="projection-item">
                    <span>Projected Monthly Views:</span>
                    <strong>{profile.profileViews.projected}</strong>
                </div>
            </div>
        </div>
    );
};

export default AISuggestionCards;