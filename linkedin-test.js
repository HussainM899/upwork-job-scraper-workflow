// Test LinkedIn Profile Scraper
const { scrapeLinkedInProfiles } = require('./linkedin-scraper');
const fs = require('fs');

async function testLinkedInScraper() {
    try {
        console.log('🔍 Starting LinkedIn profile scraper test...\n');
        console.log('⚠️  IMPORTANT: You will need to log in to LinkedIn manually');
        console.log('   when the browser opens. The scraper will wait for you.\n');
        
        // Test with sample profile URLs (replace with real ones)
        const testUrls = [
            'https://www.linkedin.com/in/williamhgates/',
            // Add more test URLs here - they'll use the same login session
        ];
        
        // Set headless to FALSE to see the browser and log in manually
        const results = await scrapeLinkedInProfiles(testUrls, false);
        
        console.log('\n=== TEST RESULTS ===\n');
        
        results.forEach((profile, index) => {
            console.log(`\n--- Profile ${index + 1} ---`);
            if (profile.success) {
                console.log(`Name: ${profile.name}`);
                console.log(`Headline: ${profile.headline}`);
                console.log(`Location: ${profile.location}`);
                console.log(`About: ${profile.about ? profile.about.substring(0, 100) + '...' : 'N/A'}`);
                console.log(`Experience entries: ${profile.experience?.length || 0}`);
                console.log(`Education entries: ${profile.education?.length || 0}`);
                console.log(`Skills: ${profile.skills?.length || 0}`);
            } else {
                console.log(`❌ Failed: ${profile.error}`);
            }
        });
        
        // Save to file for inspection
        fs.writeFileSync('linkedin-test-results.json', JSON.stringify(results, null, 2));
        console.log('\n✅ Full results saved to linkedin-test-results.json');
        
    } catch (error) {
        console.error('Test failed:', error.message);
        console.error(error);
    }
}

// Run the test
testLinkedInScraper();
