let puppeteer;
try {
  puppeteer = require('puppeteer');
} catch (error) {
  console.log('Puppeteer not installed - web scraping features will be limited to browser script generation');
}

const { parseVersionData } = require('./versionUpdater');

/**
 * Web scraper for More4apps community downloads page
 * Note: This requires the user to have access to the community site
 */

/**
 * Scrape version data from More4apps community page
 * This is a template - you'll need to customize based on the actual page structure
 */
async function scrapeMore4appsVersions(url = 'https://community.more4apps.com/s/ebs-toolbox-downloads') {
  if (!puppeteer) {
    return {
      success: false,
      error: 'Puppeteer not installed',
      suggestions: [
        'Install puppeteer: npm install puppeteer',
        'Use the browser script method instead',
        'Copy data manually from the community site'
      ]
    };
  }

  let browser;
  
  try {
    // Launch browser
    browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set user agent to appear like a regular browser
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Navigate to the page
    console.log('Navigating to More4apps community page...');
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for content to load
    await page.waitForTimeout(3000);
    
    // Extract version information
    // This is a generic approach - you'll need to customize based on actual page structure
    const versionData = await page.evaluate(() => {
      const versions = {};
      
      // Look for tables containing version information
      const tables = document.querySelectorAll('table');
      
      tables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        
        rows.forEach(row => {
          const cells = row.querySelectorAll('td, th');
          if (cells.length >= 2) {
            const nameCell = cells[0].textContent.trim();
            const versionCell = cells[1].textContent.trim();
            
            // Look for wizard names and version patterns
            if (nameCell.toLowerCase().includes('wizard') && versionCell.match(/\\d+\\.\\d+\\.\\d+/)) {
              versions[nameCell] = versionCell;
            }
          }
        });
      });
      
      // Also look for divs or other elements containing version info
      const versionElements = document.querySelectorAll('[class*="version"], [class*="download"], [data-version]');
      
      versionElements.forEach(element => {
        const text = element.textContent;
        const versionMatch = text.match(/(\\w+\\s+Wizard).*?(\\d+\\.\\d+\\.\\d+)/);
        if (versionMatch) {
          versions[versionMatch[1]] = versionMatch[2];
        }
      });
      
      return versions;
    });
    
    console.log('Found version data:', versionData);
    
    if (Object.keys(versionData).length === 0) {
      throw new Error('No version data found on the page. The page structure may have changed.');
    }
    
    // Convert to standard format
    const formattedVersions = {};
    Object.keys(versionData).forEach(wizardName => {
      const version = versionData[wizardName];
      formattedVersions[wizardName] = {
        header: version,
        body: version,
        releaseDate: new Date().toISOString().split('T')[0],
        downloadUrl: url
      };
    });
    
    return {
      success: true,
      versions: formattedVersions,
      totalFound: Object.keys(formattedVersions).length,
      scrapedFrom: url,
      scrapedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error scraping versions:', error);
    return {
      success: false,
      error: error.message,
      suggestions: [
        'Check if you have access to the More4apps community site',
        'Verify the URL is correct',
        'The page structure may have changed',
        'Try manual copy/paste instead'
      ]
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Alternative: Extract version data from browser developer tools
 * This generates JavaScript code that users can run in their browser console
 */
function generateBrowserScript() {
  return `
// More4apps Version Extractor - Run this in your browser console on the community downloads page
(function() {
  const versions = {};
  
  // Method 1: Look for tables
  document.querySelectorAll('table tr').forEach(row => {
    const cells = row.querySelectorAll('td, th');
    if (cells.length >= 2) {
      const name = cells[0].textContent.trim();
      const version = cells[1].textContent.trim();
      
      if (name.toLowerCase().includes('wizard') && version.match(/\\d+\\.\\d+\\.\\d+/)) {
        versions[name] = version;
      }
    }
  });
  
  // Method 2: Look for specific patterns in text
  const allText = document.body.textContent;
  const matches = allText.match(/(\\w+\\s+Wizard).*?(\\d+\\.\\d+\\.\\d+)/g);
  if (matches) {
    matches.forEach(match => {
      const parts = match.match(/(\\w+\\s+Wizard).*?(\\d+\\.\\d+\\.\\d+)/);
      if (parts) {
        versions[parts[1]] = parts[2];
      }
    });
  }
  
  // Method 3: Look for download links with version info
  document.querySelectorAll('a[href*="download"]').forEach(link => {
    const text = link.textContent + ' ' + (link.getAttribute('title') || '');
    const versionMatch = text.match(/(\\w+\\s+Wizard).*?(\\d+\\.\\d+\\.\\d+)/);
    if (versionMatch) {
      versions[versionMatch[1]] = versionMatch[2];
    }
  });
  
  console.log('Found versions:', versions);
  
  // Format for easy copying
  const formatted = Object.keys(versions).map(name => \`\${name}: \${versions[name]}\`).join('\\n');
  
  console.log('\\nFormatted for import:');
  console.log(formatted);
  
  // Also copy to clipboard if possible
  if (navigator.clipboard) {
    navigator.clipboard.writeText(formatted).then(() => {
      console.log('\\nVersion data copied to clipboard!');
    });
  }
  
  return versions;
})();
`;
}

module.exports = {
  scrapeMore4appsVersions,
  generateBrowserScript
};