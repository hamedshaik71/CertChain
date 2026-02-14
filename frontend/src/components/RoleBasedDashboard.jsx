import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import './RoleBasedDashboard.css';

// Animation Variants
const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
};

// --- STUDENT LAYOUT ---
const StudentDashboardLayout = ({ children }) => (
    <motion.div 
        className="dashboard-layout student-layout"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
    >
        {/* Removed duplicate Hero/Sidebar. 
            The StudentDashboard in App.js handles the header and content. */}
        <motion.div className="dashboard-main" variants={itemVariants}>
            {children}
        </motion.div>
    </motion.div>
);

// --- INSTITUTION LAYOUT ---
const InstitutionDashboardLayout = ({ children }) => (
    <motion.div 
        className="dashboard-layout institution-layout"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
    >
        {/* 
            ✅ FIX: Removed the hardcoded 'dashboard-hero' section. 
            This prevents the duplicate header issue since InstitutionDashboard 
            in App.js has its own 'modern-hero-container'.
        */}
        <motion.div className="dashboard-content-wrapper" variants={itemVariants}>
            {children}
        </motion.div>
    </motion.div>
);

// --- EMPLOYER LAYOUT ---
const EmployerDashboardLayout = ({ children }) => (
    <motion.div 
        className="dashboard-layout employer-layout"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
    >
        {/* Kept minimal structure for potential future use */}
        <motion.div className="dashboard-hero employer-hero" variants={itemVariants}>
            <div className="hero-content">
                <span className="hero-emoji">🧑‍💼</span>
                <h1>Verification Dashboard</h1>
                <p>Instant Candidate Check</p>
            </div>
        </motion.div>

        <div className="employer-content-row">
            <motion.div className="dashboard-grid employer-grid" variants={itemVariants}>
                {children}
            </motion.div>
        </div>
    </motion.div>
);

// --- ADMIN LAYOUT ---
const AdminDashboardLayout = ({ children }) => (
    <motion.div 
        className="dashboard-layout admin-layout"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
    >
        {/* Removed duplicate Hero/Nav. 
            The AdminDashboard in App.js handles the header and tabs. */}
        <motion.div className="dashboard-grid admin-grid" variants={itemVariants}>
            {children}
        </motion.div>
    </motion.div>
);

// Main Role-Based Dashboard Component
const RoleBasedDashboard = ({ role, userData, children }) => {
    const DashboardComponent = useMemo(() => {
        switch (role) {
            case 'student': return StudentDashboardLayout;
            case 'institution': return InstitutionDashboardLayout;
            case 'employer': return EmployerDashboardLayout;
            case 'admin': return AdminDashboardLayout;
            default: return StudentDashboardLayout;
        }
    }, [role]);

    return (
        <DashboardComponent userData={userData}>
            {children}
        </DashboardComponent>
    );
};

export default RoleBasedDashboard;