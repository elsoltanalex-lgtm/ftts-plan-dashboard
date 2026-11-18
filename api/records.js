// api/records.js
// Vercel Serverless Function: Cloud records provider with zero-caching guarantee

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export default async function handler(req, res) {
  // Anti-caching and CORS headers for mobile and desktop consistency
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Pragma, Cache-Control');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const dataPath = join(process.cwd(), 'server', 'data', 'We.json');
    if (existsSync(dataPath)) {
      const content = readFileSync(dataPath, 'utf-8');
      const records = JSON.parse(content);
      return res.status(200).json({
        success: true,
        count: Array.isArray(records) ? records.length : 0,
        records: Array.isArray(records) ? records : [],
        timestamp: new Date().toISOString(),
      });
    }

    return res.status(200).json({
      success: true,
      count: 0,
      records: [],
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Error fetching records',
    });
  }
}
