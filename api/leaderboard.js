// Stable version with better error handling and data persistence
// This file should be at: /api/leaderboard.js

const { Redis } = require('@upstash/redis');

module.exports = async (req, res) => {
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

    // Initialize Redis client
    let redis;
    try {
        if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
            throw new Error('Missing Redis configuration');
        }

        redis = new Redis({
            url: process.env.UPSTASH_REDIS_REST_URL,
            token: process.env.UPSTASH_REDIS_REST_TOKEN,
        });
    } catch (error) {
        console.error('Redis initialization error:', error);
        return res.status(500).json({ error: 'Database configuration error' });
    }

    if (req.method === 'GET') {
        try {
            const { date } = req.query;
            if (!date) {
                return res.status(400).json({ error: 'Date parameter required' });
            }

            const key = `leaderboard:${date}`;
            console.log('Fetching leaderboard for:', key);
            
            // Get the data
            const data = await redis.get(key);
            console.log('Raw data from Redis:', data);
            
            // Parse the data - handle both string and object responses
            let scores = [];
            if (data) {
                if (typeof data === 'string') {
                    try {
                        scores = JSON.parse(data);
                    } catch (e) {
                        console.error('Failed to parse string data:', e);
                        scores = [];
                    }
                } else if (Array.isArray(data)) {
                    scores = data;
                } else {
                    console.error('Unexpected data type:', typeof data);
                    scores = [];
                }
            }
            
            // Ensure scores is an array
            if (!Array.isArray(scores)) {
                console.error('Scores is not an array:', scores);
                scores = [];
            }
            
            // Sort by score (ascending, since lower is better)
            scores.sort((a, b) => a.score - b.score);
            
            console.log('Returning scores:', scores.length, 'entries');
            return res.status(200).json(scores);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            return res.status(500).json({ error: 'Failed to fetch leaderboard' });
        }
    }

    if (req.method === 'POST') {
        try {
            const { name, score, date } = req.body;
            
            console.log('Received submission:', { name, score, date });
            
            if (!name || typeof score !== 'number' || !date) {
                return res.status(400).json({ error: 'Name (string), score (number), and date (string) required' });
            }

            const key = `leaderboard:${date}`;
            
            // Get existing scores
            const existingData = await redis.get(key);
            let scores = [];
            
            // Parse existing data
            if (existingData) {
                if (typeof existingData === 'string') {
                    try {
                        scores = JSON.parse(existingData);
                    } catch (e) {
                        console.error('Failed to parse existing data:', e);
                        scores = [];
                    }
                } else if (Array.isArray(existingData)) {
                    scores = existingData;
                }
            }
            
            // Ensure scores is an array
            if (!Array.isArray(scores)) {
                console.error('Existing scores is not an array, resetting');
                scores = [];
            }
            
            // Check if player already submitted today
            const existingEntryIndex = scores.findIndex(entry => entry.name === name);
            
            if (existingEntryIndex !== -1) {
                // Update if new score is better
                if (score < scores[existingEntryIndex].score) {
                    scores[existingEntryIndex].score = score;
                    scores[existingEntryIndex].timestamp = new Date().toISOString();
                    console.log('Updated existing entry for:', name);
                } else {
                    console.log('Existing score is better, not updating');
                }
            } else {
                // Add new entry
                const newEntry = {
                    name: name.substring(0, 50), // Limit name length
                    score: score,
                    timestamp: new Date().toISOString()
                };
                scores.push(newEntry);
                console.log('Added new entry for:', name);
            }
            
            // Sort scores
            scores.sort((a, b) => a.score - b.score);
            
            // Limit to top 100 scores to prevent data from growing too large
            if (scores.length > 100) {
                scores = scores.slice(0, 100);
            }
            
            // Save back to Redis
            // Use JSON.stringify to ensure consistent storage format
            const dataToStore = JSON.stringify(scores);
            console.log('Storing data, length:', dataToStore.length);
            
            // Set with 7 day expiration (604800 seconds) instead of 30 days
            // This ensures data doesn't disappear during the day but doesn't accumulate forever
            await redis.set(key, dataToStore, { ex: 604800 });
            
            console.log('Successfully saved scores, total entries:', scores.length);
            
            return res.status(200).json({ 
                success: true, 
                leaderboard: scores,
                totalEntries: scores.length 
            });
        } catch (error) {
            console.error('Error saving score:', error);
            return res.status(500).json({ error: 'Failed to save score' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
};