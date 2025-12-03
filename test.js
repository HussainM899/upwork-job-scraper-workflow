// Example: Test the scraper locally
const { scrapeJobs } = require('./scraper');

async function test() {
    try {
        console.log('Starting test scrape...\n');
        
        // Option 1: Use keywords (recommended)
        const keywords = 'n8n automation';
        
        // Option 2: Or use full URL
        // const upworkUrl = 'https://www.upwork.com/nx/search/jobs/?q=nodejs&sort=recency';
        
        // Set headless to false to see the browser in action
        // Set headless to TRUE to test like n8n does
        const jobs = await scrapeJobs(keywords, true, 5); // Test with headless=true like n8n
        
        console.log('\n=== SCRAPING RESULTS ===\n');
        console.log(`Total jobs found: ${jobs.length}\n`);
        
        // Display first job as example
        if (jobs.length > 0) {
            console.log('First job details:');
            console.log(JSON.stringify(jobs[0], null, 2));
            console.log('\n');
        }
        
        // Display titles of all jobs
        console.log('All job titles:');
        jobs.forEach((job, index) => {
            console.log(`${index + 1}. ${job.title}`);
        });
        
        // Save to file for inspection
        const fs = require('fs');
        fs.writeFileSync('test-results.json', JSON.stringify(jobs, null, 2));
        console.log('\n✅ Full results saved to test-results.json');
        
    } catch (error) {
        console.error('Test failed:', error.message);
        console.error(error);
    }
}

// Run the test
test();
