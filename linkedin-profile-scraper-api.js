const { connect } = require('puppeteer-real-browser');
const fs = require('fs');

/**
 * Delay helper function
 * @param {number} ms - Milliseconds to wait
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Scrape LinkedIn profiles using the public API endpoint
 * This approach doesn't require login for publicly available profile data
 * @param {Array<string>} profileUrls - Array of LinkedIn profile URLs
 * @param {boolean} headless - Run browser in headless mode
 */
async function scrapeLinkedInProfilesAPI(profileUrls, headless = true) {
    let browser;
    let page;
    
    try {
        console.log('🚀 Starting LinkedIn Profile Scraper (API Method)\n');
        console.log(`📋 Profiles to scrape: ${profileUrls.length}`);
        console.log(`👁️  Headless mode: ${headless}`);
        console.log(`✨ No login required - using public API!\n`);
        console.log('━'.repeat(60));
        
        console.log('\n🌐 Launching browser...');
        
        // Connect to Puppeteer Real Browser
        const { browser: browserInstance, page: pageInstance } = await connect({
            headless: headless,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--disable-blink-features=AutomationControlled',
                '--window-size=1920,1080'
            ],
            turnstile: true,
            disableXvfb: false,
            ignoreAllFlags: false,
            customConfig: {},
        });
        
        browser = browserInstance;
        page = pageInstance;
        
        console.log('✓ Browser launched successfully\n');
        
        const results = [];
        
        // Scrape each profile
        for (let i = 0; i < profileUrls.length; i++) {
            const profileUrl = profileUrls[i].trim();
            
            console.log(`\n[${i + 1}/${profileUrls.length}] Processing profile...`);
            
            if (!profileUrl || !profileUrl.includes('linkedin.com')) {
                console.log('  ⚠️  Invalid LinkedIn URL, skipping...');
                results.push({
                    url: profileUrl,
                    error: 'Invalid LinkedIn URL',
                    success: false
                });
                continue;
            }
            
            try {
                console.log(`📄 Navigating to: ${profileUrl}`);
                
                // Navigate to the profile page
                await page.goto(profileUrl, { 
                    waitUntil: 'domcontentloaded', 
                    timeout: 30000 
                });
                
                await delay(3000);
                
                // Extract the profile username from URL
                const usernameMatch = profileUrl.match(/linkedin\.com\/in\/([^/]+)/);
                const username = usernameMatch ? usernameMatch[1] : null;
                
                if (!username) {
                    console.log('  ⚠️  Could not extract username from URL');
                    results.push({
                        url: profileUrl,
                        error: 'Could not extract username',
                        success: false
                    });
                    continue;
                }
                
                console.log(`  Extracting public data for: ${username}`);
                
                // Try to intercept API calls or extract data from page source
                const profileData = await page.evaluate(() => {
                    const data = {
                        name: '',
                        headline: '',
                        location: '',
                        about: '',
                        experience: [],
                        education: [],
                        skills: []
                    };
                    
                    // Extract name
                    const nameEl = document.querySelector('h1');
                    if (nameEl) data.name = nameEl.textContent.trim();
                    
                    // Extract headline
                    const headlineEl = document.querySelector('.text-body-medium');
                    if (headlineEl) data.headline = headlineEl.textContent.trim();
                    
                    // Extract location
                    const locationEl = document.querySelector('.text-body-small.inline.t-black--light.break-words');
                    if (locationEl) data.location = locationEl.textContent.trim();
                    
                    // Try to find JSON-LD data (LinkedIn often includes structured data)
                    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
                    scripts.forEach(script => {
                        try {
                            const jsonData = JSON.parse(script.textContent);
                            if (jsonData['@type'] === 'Person') {
                                if (jsonData.name) data.name = jsonData.name;
                                if (jsonData.description) data.headline = jsonData.description;
                                if (jsonData.address) data.location = jsonData.address;
                            }
                        } catch (e) {
                            // Ignore parsing errors
                        }
                    });
                    
                    return data;
                });
                
                if (profileData.name) {
                    console.log(`  ✓ Successfully scraped: ${profileData.name}`);
                    results.push({
                        url: profileUrl,
                        username: username,
                        ...profileData,
                        scrapedAt: new Date().toISOString(),
                        success: true
                    });
                } else {
                    console.log('  ⚠️  Limited data available (profile may be private or require login)');
                    results.push({
                        url: profileUrl,
                        username: username,
                        error: 'Limited public data available',
                        success: false
                    });
                }
                
            } catch (error) {
                console.error(`  ❌ Error scraping profile: ${error.message}`);
                results.push({
                    url: profileUrl,
                    error: error.message,
                    success: false
                });
            }
            
            // Small delay between profiles
            if (i < profileUrls.length - 1) {
                console.log('  ⏳ Waiting 3 seconds before next profile...');
                await delay(3000);
            }
        }
        
        console.log('\n\n' + '='.repeat(60));
        console.log('📊 SCRAPING COMPLETE - SUMMARY');
        console.log('='.repeat(60));
        
        const successCount = results.filter(r => r.success).length;
        const failureCount = results.length - successCount;
        
        console.log(`✅ Successfully scraped: ${successCount}`);
        console.log(`❌ Failed: ${failureCount}`);
        console.log('='.repeat(60));
        
        return results;
        
    } catch (error) {
        console.error('\n❌ Fatal error during scraping:', error.message);
        throw error;
    } finally {
        // Close browser
        if (browser) {
            await browser.close();
            console.log('\n🔒 Browser closed');
        }
    }
}

module.exports = { scrapeLinkedInProfilesAPI };
