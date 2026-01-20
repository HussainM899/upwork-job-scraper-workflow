// Multiple Keywords Upwork Scraper
const { scrapeJobs } = require('./scraper');
const fs = require('fs');

// ===== CONFIGURE YOUR KEYWORDS HERE =====
const keywords = [
    'Manual CV formatting',
    'Resume blinding',
    'Anonymize resumes',
    'VMS data entry',
    'ATS data cleansing',
    'Sourcing and uploading profiles',
    'Excel to ATS migration',
    'Candidate ownership dispute',
    'Recruiting workflow automation',
    'ATS API integration',
    'Submission turnaround',
    'Recruiting Coordinator',
    'Resourcer',
    'Data entry specialist recruitment',
    'CV screening specialist'

];

const jobsPerKeyword = 30; // Number of jobs to scrape per keyword
const headlessMode = false; // Set to true to hide browser, false to see it

// ========================================

async function scrapeMultipleKeywords() {
    console.log('🚀 Starting Multiple Keyword Scraper\n');
    console.log(`📋 Keywords to search: ${keywords.length}`);
    console.log(`📊 Jobs per keyword: ${jobsPerKeyword}`);
    console.log(`👁️  Headless mode: ${headlessMode}\n`);
    console.log('━'.repeat(60));
    
    const allResults = [];
    let totalJobsScraped = 0;
    const maxAttempts = 3; // Maximum attempts per keyword if no jobs found
    
    for (let i = 0; i < keywords.length; i++) {
        const keyword = keywords[i];
        console.log(`\n\n[${ i + 1}/${keywords.length}] 🔍 Searching for: "${keyword}"`);
        console.log('━'.repeat(60));
        
        let attempts = 0;
        let jobs = [];
        let lastError = null;
        let shouldRetry = true;
        
        while (attempts < maxAttempts && shouldRetry) {
            attempts++;
            
            if (attempts > 1) {
                console.log(`\n🔄 Attempt ${attempts}/${maxAttempts} for "${keyword}"`);
            }
            
            try {
                jobs = await scrapeJobs(keyword, headlessMode, jobsPerKeyword);
                
                if (jobs.length > 0) {
                    console.log(`\n✅ Successfully scraped ${jobs.length} jobs for "${keyword}"`);
                    shouldRetry = false; // Got jobs, no need to retry
                } else {
                    console.log(`\n⚠️  No jobs found for "${keyword}" (Attempt ${attempts}/${maxAttempts})`);
                    
                    if (attempts < maxAttempts) {
                        console.log('⏳ Waiting 10 seconds before retry...');
                        await new Promise(resolve => setTimeout(resolve, 10000));
                    } else {
                        console.log(`\n❌ No jobs found after ${maxAttempts} attempts. Moving to next keyword.`);
                    }
                }
                
            } catch (error) {
                console.error(`\n❌ Error on attempt ${attempts} for "${keyword}": ${error.message}`);
                lastError = error;
                
                if (attempts < maxAttempts) {
                    console.log('⏳ Waiting 10 seconds before retry...');
                    await new Promise(resolve => setTimeout(resolve, 10000));
                }
            }
        }
        
        // Add keyword to each job for reference
        const jobsWithKeyword = jobs.map(job => ({
            searchKeyword: keyword,
            ...job
        }));
        
        allResults.push({
            keyword: keyword,
            jobCount: jobs.length,
            attempts: attempts,
            jobs: jobsWithKeyword,
            ...(lastError && jobs.length === 0 ? { error: lastError.message } : {})
        });
        
        totalJobsScraped += jobs.length;
        
        // Small delay between keywords to be respectful
        if (i < keywords.length - 1) {
            console.log('\n⏳ Waiting 5 seconds before next keyword...');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    
    console.log('\n\n' + '='.repeat(60));
    console.log('📊 SCRAPING COMPLETE - SUMMARY');
    console.log('='.repeat(60));
    
    // Display summary
    allResults.forEach((result, index) => {
        const status = result.error ? '❌ FAILED' : '✅ SUCCESS';
        const attemptsInfo = result.attempts > 1 ? ` (${result.attempts} attempts)` : '';
        console.log(`${index + 1}. ${status} "${result.keyword}" - ${result.jobCount} jobs${attemptsInfo}`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log(`🎯 Total jobs scraped: ${totalJobsScraped}`);
    console.log('='.repeat(60));
    
    // Save all results to files
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    
    // Save complete results as JSON
    const jsonFilename = `upwork-results-${timestamp}.json`;
    fs.writeFileSync(jsonFilename, JSON.stringify(allResults, null, 2));
    console.log(`\n💾 Complete results saved to: ${jsonFilename}`);
    
    // Create a CSV/Excel file for easy viewing
    const csvFilename = `upwork-results-${timestamp}.csv`;
    createCSV(allResults, csvFilename);
    console.log(`📊 Excel/CSV file saved to: ${csvFilename}`);
    
    console.log('\n✅ All done!\n');
}

function createCSV(results, filename) {
    const headers = [
        'Search Keyword',
        'Job ID',
        'Title',
        'Link',
        'Budget',
        'Posted Time',
        'Skills',
        'Proposals',
        'Client Location',
        'Description'
    ];
    
    let csvContent = headers.join(',') + '\n';
    
    results.forEach(result => {
        result.jobs.forEach(job => {
            const row = [
                escapeCSV(result.keyword),
                escapeCSV(job.jobId || ''),
                escapeCSV(job.title || ''),
                escapeCSV(job.link || ''),
                escapeCSV(job.budget || ''),
                escapeCSV(job.postedTime || ''),
                escapeCSV(job.skills ? job.skills.join('; ') : ''),
                escapeCSV(job.proposals || ''),
                escapeCSV(job.clientLocation || ''),
                escapeCSV(job.shortDescription || '')
            ];
            csvContent += row.join(',') + '\n';
        });
    });
    
    fs.writeFileSync(filename, csvContent);
}

function escapeCSV(text) {
    if (typeof text !== 'string') text = String(text);
    // Escape quotes and wrap in quotes if contains comma, quote, or newline
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
        return '"' + text.replace(/"/g, '""') + '"';
    }
    return text;
}

// Run the scraper
scrapeMultipleKeywords().catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
});
