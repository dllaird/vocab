// Vercel serverless function using Upstash Redis
// Place this file in /api/leaderboard.js

import { Redis } from '@upstash/redis';

// Initialize Redis client
const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method === 'GET') {
        try {
            const { date } = req.query;
            if (!date) {
                return res.status(400).json({ error: 'Date parameter required' });
            }

            const key = `leaderboard:${date}`;
            const scores = await redis.get(key) || [];
            
            // Sort by score (ascending, since lower is better)
            scores.sort((a, b) => a.score - b.score);
            
            return res.status(200).json(scores);
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            return res.status(500).json({ error: 'Failed to fetch leaderboard' });
        }
    }

    if (req.method === 'POST') {
        try {
            const { name, score, date } = req.body;
            
            if (!name || !score || !date) {
                return res.status(400).json({ error: 'Name, score, and date required' });
            }

            const key = `leaderboard:${date}`;
            let scores = await redis.get(key) || [];
            
            // Check if player already submitted today
            const existingEntry = scores.find(entry => entry.name === name);
            if (existingEntry) {
                // Update if new score is better
                if (score < existingEntry.score) {
                    existingEntry.score = score;
                    existingEntry.timestamp = new Date().toISOString();
                }
            } else {
                // Add new entry
                scores.push({
                    name,
                    score,
                    timestamp: new Date().toISOString()
                });
            }
            
            // Save back to Redis with 30 day expiration (2592000 seconds)
            await redis.set(key, scores, { ex: 2592000 });
            
            // Sort and return updated leaderboard
            scores.sort((a, b) => a.score - b.score);
            
            return res.status(200).json({ success: true, leaderboard: scores });
        } catch (error) {
            console.error('Error saving score:', error);
            return res.status(500).json({ error: 'Failed to save score' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}