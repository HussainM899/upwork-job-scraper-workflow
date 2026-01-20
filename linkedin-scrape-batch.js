// Batch LinkedIn Profile Scraper
const { scrapeLinkedInProfiles } = require('./linkedin-scraper');
const fs = require('fs');

// ===== CONFIGURE YOUR PROFILE URLS HERE =====
const profileUrls = [
    'https://www.linkedin.com/in/example-profile-1/',
    'https://www.linkedin.com/in/example-profile-2/',
    'https://www.linkedin.com/in/example-profile-3/',
    // Add more profile URLs here...
];

const headlessMode = false; // Set to true to hide browser, false to see it

// ============================================

async function scrapeProfilesBatch() {
    try {
        console.log('🚀 Starting LinkedIn Profile Batch Scraper\n');
        
        // Run the scraper
        const results = await scrapeLinkedInProfiles(profileUrls, headlessMode);
        
        // Save results to files
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        
        // Save complete results as JSON
        const jsonFilename = `linkedin-profiles-${timestamp}.json`;
        fs.writeFileSync(jsonFilename, JSON.stringify(results, null, 2));
        console.log(`\n💾 Complete results saved to: ${jsonFilename}`);
        
        // Create a CSV file for easy viewing
        const csvFilename = `linkedin-profiles-${timestamp}.csv`;
        createCSV(results, csvFilename);
        console.log(`📊 Excel/CSV file saved to: ${csvFilename}`);
        
        console.log('\n✅ All done!\n');
        
    } catch (error) {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }
}

function createCSV(results, filename) {
    const headers = [
        'Success',
        'Name',
        'Headline',
        'Location',
        'About',
        'Experience Count',
        'Education Count',
        'Skills Count',
        'Profile URL',
        'Error'
    ];
    
    let csvContent = headers.join(',') + '\n';
    
    results.forEach(profile => {
        const row = [
            profile.success ? 'Yes' : 'No',
            escapeCSV(profile.name || ''),
            escapeCSV(profile.headline || ''),
            escapeCSV(profile.location || ''),
            escapeCSV(profile.about ? profile.about.substring(0, 500) : ''),
            profile.experience ? profile.experience.length : 0,
            profile.education ? profile.education.length : 0,
            profile.skills ? profile.skills.length : 0,
            escapeCSV(profile.url || ''),
            escapeCSV(profile.error || '')
        ];
        csvContent += row.join(',') + '\n';
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
scrapeProfilesBatch();
