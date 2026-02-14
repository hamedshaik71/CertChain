// server/routes/badgeRoutes.js
const express = require('express');
const router = express.Router();
const Student = require('../models/Student'); // Adjust path if needed

// Get badges for a student
router.get('/student/:studentCode', async (req, res) => {
    try {
        const { studentCode } = req.params;
        
        // Mock data logic - Replace with real DB call if you have a Badge model
        // For now, we return empty or mock badges to stop the 404 error
        const badges = [
            {
                id: 1,
                name: 'Early Adopter',
                icon: '🚀',
                description: 'First 100 students on the platform',
                date: new Date()
            },
            {
                id: 2,
                name: 'Fast Learner',
                icon: '⚡',
                description: 'Completed a course in record time',
                date: new Date()
            }
        ];

        console.log(`🏅 Fetching badges for: ${studentCode}`);
        
        res.json({
            success: true,
            badges: badges 
        });

    } catch (error) {
        console.error('Badge fetch error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;