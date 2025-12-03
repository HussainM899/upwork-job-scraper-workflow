// Example POST request to test the API
// You can run this with: node test-api.js

async function testAPI() {
    try {
        const response = await fetch('http://localhost:3000/scrape', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: 'https://www.upwork.com/nx/search/jobs/?q=nodejs&sort=recency',
                headless: false  // Set to true in production
            })
        });

        const data = await response.json();
        
        console.log('API Response:');
        console.log(JSON.stringify(data, null, 2));
        
        if (data.success) {
            console.log(`\n✅ Successfully scraped ${data.count} jobs!`);
        }
    } catch (error) {
        console.error('Error testing API:', error.message);
        console.log('\n⚠️  Make sure the server is running with: npm start');
    }
}

testAPI();
