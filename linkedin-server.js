const express = require('express');
const { scrapeLinkedInProfiles } = require('./linkedin-scraper');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware to parse JSON bodies
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'ok',
        message: 'LinkedIn Profile Scraper API is running',
        endpoints: {
            scrape: 'POST /scrape - Scrape LinkedIn profiles',
            scrapeGet: 'GET /scrape?urls=url1,url2 - Scrape via GET request'
        }
    });
});

// Main scraping endpoint (POST)
app.post('/scrape', async (req, res) => {
    try {
        const { urls, profileUrls, headless = true } = req.body;
        
        // Accept either 'urls' or 'profileUrls' parameter
        const urlsToScrape = urls || profileUrls;
        
        if (!urlsToScrape || !Array.isArray(urlsToScrape) || urlsToScrape.length === 0) {
            return res.status(400).json({
                error: 'Missing or invalid parameter: urls or profileUrls must be an array',
                example: {
                    urls: [
                        'https://www.linkedin.com/in/example-profile-1/',
                        'https://www.linkedin.com/in/example-profile-2/'
                    ],
                    headless: true
                }
            });
        }
        
        console.log(`\n📋 Received scraping request`);
        console.log(`   Profiles: ${urlsToScrape.length}`);
        console.log(`   Headless: ${headless}\n`);
        
        // Start scraping
        const profiles = await scrapeLinkedInProfiles(urlsToScrape, headless);
        
        const successCount = profiles.filter(p => p.success).length;
        
        // Return results
        res.json({
            success: true,
            totalProfiles: profiles.length,
            successfullyScraped: successCount,
            failed: profiles.length - successCount,
            timestamp: new Date().toISOString(),
            profiles: profiles
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

// GET endpoint for query parameters (useful for webhooks)
app.get('/scrape', async (req, res) => {
    try {
        const { urls, headless = 'true' } = req.query;
        
        if (!urls) {
            return res.status(400).json({
                error: 'Missing required parameter: urls (comma-separated LinkedIn profile URLs)',
                example: 'GET /scrape?urls=https://linkedin.com/in/profile1,https://linkedin.com/in/profile2'
            });
        }
        
        // Split comma-separated URLs
        const urlsToScrape = urls.split(',').map(url => url.trim());
        const isHeadless = headless === 'true' || headless === true;
        
        console.log(`\n📋 Received GET scraping request`);
        console.log(`   Profiles: ${urlsToScrape.length}`);
        console.log(`   Headless: ${isHeadless}\n`);
        
        // Start scraping
        const profiles = await scrapeLinkedInProfiles(urlsToScrape, isHeadless);
        
        const successCount = profiles.filter(p => p.success).length;
        
        // Return results
        res.json({
            success: true,
            totalProfiles: profiles.length,
            successfullyScraped: successCount,
            failed: profiles.length - successCount,
            timestamp: new Date().toISOString(),
            profiles: profiles
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
    console.log(`\n🚀 LinkedIn Profile Scraper API is running!`);
    console.log(`📡 Server listening on http://localhost:${PORT}`);
    console.log(`\n💡 Test the API with:`);
    console.log(`   POST http://localhost:${PORT}/scrape`);
    console.log(`   Body: { "urls": ["https://linkedin.com/in/profile1/"], "headless": false }\n`);
});

module.exports = app;
