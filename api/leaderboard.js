// Debug version with extensive logging
// This file should be at: /api/leaderboard.js

module.exports = async (req, res) => {
    console.log('Leaderboard function called:', req.method);
    console.log('Environment check:', {
        hasUrl: !!process.env.UPSTASH_REDIS_REST_URL,
        hasToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
        urlPrefix: process.env.UPSTASH_REDIS_REST_URL?.substring(0, 20)
    });

    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Try a simple in-memory storage first to test if the function works at all
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        console.log('WARNING: Redis not configured, using in-memory storage');
        
        // Simple in-memory fallback for testing
        global.leaderboardData = global.leaderboardData || {};
        
        if (req.method === 'GET') {
            const { date } = req.query;
            const scores = global.leaderboardData[date] || [];
            return res.status(200).json(scores);
        }
        
        if (req.method === 'POST') {
            const { name, score, date } = req.body;
            console.log('POST data received:', { name, score, date });
            
            if (!name || !score || !date) {
                return res.status(400).json({ error: 'Name, score, and date required' });
            }
            
            if (!global.leaderboardData[date]) {
                global.leaderboardData[date] = [];
            }
            
            const scores = global.leaderboardData[date];
            const existingEntry = scores.find(entry => entry.name === name);
            
            if (existingEntry) {
                if (score < existingEntry.score) {
                    existingEntry.score = score;
                    existingEntry.timestamp = new Date().toISOString();
                }
            } else {
                scores.push({
                    name,
                    score,
                    timestamp: new Date().toISOString()
                });
            }
            
            scores.sort((a, b) => a.score - b.score);
            return res.status(200).json({ success: true, leaderboard: scores });
        }
        
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // If Redis is configured, use it
    try {
        const { Redis } = require('@upstash/redis');
        
        const redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });

        if (req.method === 'GET') {
            const { date } = req.query;
            if (!date) {
                return res.status(400).json({ error: 'Date parameter required' });
            }

            const key = `leaderboard:${date}`;
            console.log('GET request for key:', key);
            
            try {
                const scores = await redis.get(key) || [];
                scores.sort((a, b) => a.score - b.score);
                return res.status(200).json(scores);
            } catch (redisError) {
                console.error('Redis GET error:', redisError);
                return res.status(500).json({ error: 'Database read error', details: redisError.message });
            }
        }

        if (req.method === 'POST') {
            const { name, score, date } = req.body;
            console.log('POST request:', { name, score, date });
            
            if (!name || !score || !date) {
                return res.status(400).json({ error: 'Name, score, and date required' });
            }

            const key = `leaderboard:${date}`;
            
            try {
                let scores = await redis.get(key) || [];
                
                const existingEntry = scores.find(entry => entry.name === name);
                if (existingEntry) {
                    if (score < existingEntry.score) {
                        existingEntry.score = score;
                        existingEntry.timestamp = new Date().toISOString();
                    }
                } else {
                    scores.push({
                        name,
                        score,
                        timestamp: new Date().toISOString()
                    });
                }
                
                await redis.set(key, scores, { ex: 2592000 });
                scores.sort((a, b) => a.score - b.score);
                
                return res.status(200).json({ success: true, leaderboard: scores });
            } catch (redisError) {
                console.error('Redis SET error:', redisError);
                return res.status(500).json({ error: 'Database write error', details: redisError.message });
            }
        }

        return res.status(405).json({ error: 'Method not allowed' });
        
    } catch (error) {
        console.error('Function error:', error);
        return res.status(500).json({ 
            error: 'Server error', 
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};