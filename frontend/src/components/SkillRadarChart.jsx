import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import './SkillRadarChart.css';

const SkillRadarChart = ({ skills, badges, recommendations }) => {
    const [activeSkill, setActiveSkill] = useState(null);

    // Transform skills to radar data
    const radarData = skills.map(skill => ({
        skill: skill.name,
        current: skill.level,
        target: skill.targetLevel || 100,
        fullMark: 100
    }));

    const getSkillColor = (level) => {
        if (level >= 80) return '#10b981';
        if (level >= 60) return '#3b82f6';
        if (level >= 40) return '#f59e0b';
        return '#ef4444';
    };

    return (
        <div className="skill-radar">
            <div className="radar-header">
                <h3>🧠 Skill Assessment</h3>
                <div className="skill-summary">
                    <span className="total-skills">{skills.length} Skills</span>
                    <span className="avg-level">
                        Avg: {Math.round(skills.reduce((sum, s) => sum + s.level, 0) / skills.length)}%
                    </span>
                </div>
            </div>

            <div className="radar-container">
                <ResponsiveContainer width="100%" height={350}>
                    <RadarChart data={radarData}>
                        <PolarGrid stroke="rgba(255,255,255,0.1)" />
                        <PolarAngleAxis 
                            dataKey="skill" 
                            tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                        />
                        <PolarRadiusAxis 
                            angle={90} 
                            domain={[0, 100]}
                            tick={{ fill: 'rgba(255,255,255,0.5)' }}
                        />
                        <Radar
                            name="Target"
                            dataKey="target"
                            stroke="#667eea"
                            fill="rgba(102, 126, 234, 0.1)"
                            strokeWidth={1}
                            strokeDasharray="5 5"
                        />
                        <Radar
                            name="Current"
                            dataKey="current"
                            stroke="#10b981"
                            fill="rgba(16, 185, 129, 0.3)"
                            strokeWidth={2}
                            animationDuration={1500}
                        />
                        <Tooltip content={<CustomTooltip />} />
                    </RadarChart>
                </ResponsiveContainer>
            </div>

            {/* Skill Details List */}
            <div className="skills-list">
                {skills.map((skill, idx) => (
                    <motion.div
                        key={skill.name}
                        className={`skill-item ${activeSkill === idx ? 'active' : ''}`}
                        onClick={() => setActiveSkill(activeSkill === idx ? null : idx)}
                        whileHover={{ scale: 1.02 }}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                    >
                        <div className="skill-main">
                            <span className="skill-icon">{skill.icon || '📊'}</span>
                            <div className="skill-info">
                                <span className="skill-name">{skill.name}</span>
                                <div className="skill-bar">
                                    <motion.div
                                        className="skill-fill"
                                        style={{ backgroundColor: getSkillColor(skill.level) }}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${skill.level}%` }}
                                        transition={{ duration: 1, delay: idx * 0.1 }}
                                    />
                                </div>
                            </div>
                            <span 
                                className="skill-level"
                                style={{ color: getSkillColor(skill.level) }}
                            >
                                {skill.level}%
                            </span>
                        </div>

                        {activeSkill === idx && (
                            <motion.div
                                className="skill-details"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                            >
                                <p>{skill.description}</p>
                                <div className="skill-meta">
                                    <span>📜 {skill.certificates} Certificates</span>
                                    <span>🏆 {skill.badges} Badges</span>
                                    <span>⏱️ {skill.hoursLearned || 0} Hours</span>
                                </div>
                                {skill.gap > 0 && (
                                    <div className="skill-gap">
                                        <span>Gap to target: {skill.gap}%</span>
                                        <button className="btn-improve">Improve →</button>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* AI Recommendations */}
            {recommendations && recommendations.length > 0 && (
                <div className="ai-recommendations">
                    <h4>🤖 AI Skill Gap Analysis</h4>
                    <div className="recommendations-list">
                        {recommendations.map((rec, idx) => (
                            <motion.div
                                key={idx}
                                className="recommendation-card"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                            >
                                <span className="rec-icon">{rec.icon || '💡'}</span>
                                <div className="rec-content">
                                    <h5>{rec.title}</h5>
                                    <p>{rec.description}</p>
                                </div>
                                <button className="btn-action">{rec.action || 'Learn More'}</button>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// Custom Tooltip Component
const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        return (
            <div className="custom-tooltip">
                <p className="tooltip-skill">{payload[0].payload.skill}</p>
                <p className="tooltip-current">
                    Current: <strong>{payload[0].payload.current}%</strong>
                </p>
                <p className="tooltip-target">
                    Target: <strong>{payload[0].payload.target}%</strong>
                </p>
            </div>
        );
    }
    return null;
};

export default SkillRadarChart;