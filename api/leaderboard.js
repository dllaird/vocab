// This is a Vercel serverless function
// Place this file in /api/leaderboard.js

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

    // For this simple implementation, we'll use Vercel KV (Redis)
    // You'll need to set this up in your Vercel dashboard
    const kv = require('@vercel/kv');

    if (req.method === 'GET') {
        try {
            const { date } = req.query;
            if (!date) {
                return res.status(400).json({ error: 'Date parameter required' });
            }

            const key = `leaderboard:${date}`;
            const scores = await kv.get(key) || [];
            
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
            let scores = await kv.get(key) || [];
            
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
            
            // Save back to KV store with 30 day expiration
            await kv.set(key, scores, { ex: 60 * 60 * 24 * 30 });
            
            // Sort and return updated leaderboard
            scores.sort((a, b) => a.score - b.score);
            
            return res.status(200).json({ success: true, leaderboard: scores });
        } catch (error) {
            console.error('Error saving score:', error);
            return res.status(500).json({ error: 'Failed to save score' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}// JavaScript Document