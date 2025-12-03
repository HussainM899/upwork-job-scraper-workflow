const express = require('express');
const { scrapeJobs } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Upwork Scraper API is running',
        endpoints: {
            scrape: 'POST /scrape - Scrape jobs from Upwork URL'
        }
    });
});

// Main scraping endpoint
app.post('/scrape', async (req, res) => {
    try {
        const { url, keywords, headless = true, maxJobs = 100 } = req.body;
        
        // Need either URL or keywords
        if (!url && !keywords) {
            return res.status(400).json({
                error: 'Missing required parameter: url or keywords',
                examples: {
                    example1: {
                        keywords: 'nodejs developer',
                        maxJobs: 100,
                        headless: true
                    },
                    example2: {
                        url: 'https://www.upwork.com/nx/search/jobs/?q=nodejs&sort=recency',
                        maxJobs: 50,
                        headless: true
                    }
                }
            });
        }
        
        // Use keywords if provided, otherwise use URL
        const searchParam = keywords || url;
        
        // Validate if URL is provided that it's an Upwork URL
        if (url && !keywords && !url.includes('upwork.com')) {
            return res.status(400).json({
                error: 'Invalid URL. Must be an Upwork search URL or use keywords parameter instead',
                example: 'https://www.upwork.com/nx/search/jobs/?q=nodejs'
            });
        }
        
        console.log(`\n📋 Received scraping request`);
        console.log(`   Search: ${searchParam}`);
        console.log(`   Max Jobs: ${maxJobs}`);
        console.log(`   Headless: ${headless}\n`);
        
        // Start scraping
        const jobs = await scrapeJobs(searchParam, headless, maxJobs);
        
        // Return results
        res.json({
            success: true,
            count: jobs.length,
            maxJobs: maxJobs,
            timestamp: new Date().toISOString(),
            search: searchParam,
            jobs: jobs
        });
        
    } catch (error) {
        console.error('Error in /scrape endpoint:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// GET endpoint for query parameters (useful for n8n webhook triggers)
app.get('/scrape', async (req, res) => {
    try {
        const { keywords, url, headless = 'true', maxJobs = '100' } = req.query;
        
        // Need either URL or keywords
        if (!url && !keywords) {
            return res.status(400).json({
                error: 'Missing required parameter: url or keywords in query string',
                examples: {
                    example1: 'GET /scrape?keywords=nodejs+developer&maxJobs=100',
                    example2: 'GET /scrape?url=https://www.upwork.com/nx/search/jobs/?q=nodejs'
                }
            });
        }
        
        const searchParam = keywords || url;
        const isHeadless = headless === 'true' || headless === true;
        const maxJobsNum = parseInt(maxJobs) || 100;
        
        console.log(`\n📋 Received GET scraping request`);
        console.log(`   Search: ${searchParam}`);
        console.log(`   Max Jobs: ${maxJobsNum}`);
        console.log(`   Headless: ${isHeadless}\n`);
        
        // Start scraping
        const jobs = await scrapeJobs(searchParam, isHeadless, maxJobsNum);
        
        // Return results
        res.json({
            success: true,
            count: jobs.length,
            maxJobs: maxJobsNum,
            timestamp: new Date().toISOString(),
            search: searchParam,
            jobs: jobs
        });
        
    } catch (error) {
        console.error('Error in /scrape endpoint:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🚀 Upwork Scraper API is running!`);
    console.log(`📡 Server listening on http://localhost:${PORT}`);
    console.log(`\n💡 Test the API with:`);
    console.log(`   POST http://localhost:${PORT}/scrape`);
    console.log(`   Body: { "url": "YOUR_UPWORK_SEARCH_URL", "headless": false }\n`);
});

module.exports = app;
