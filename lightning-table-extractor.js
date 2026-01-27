// More4Apps Product Catalog Extractor for Salesforce Lightning Web Components
// This script extracts product data from the Lightning table structure

(function() {
    'use strict';

    console.log('More4Apps Product Catalog Extractor - Starting...');

    // Function to extract text content from Lightning components
    function extractTextContent(element) {
        if (!element) return '';
        
        // Look for lightning-base-formatted-text content
        const formattedText = element.querySelector('lightning-base-formatted-text');
        if (formattedText) {
            return formattedText.textContent.trim();
        }
        
        // Look for button text (for product names)
        const button = element.querySelector('button');
        if (button) {
            return button.textContent.trim();
        }
        
        // Look for link text and URL
        const link = element.querySelector('a');
        if (link) {
            return {
                text: link.textContent.trim(),
                url: link.href
            };
        }
        
        // Fallback to regular text content
        return element.textContent.trim();
    }

    // Function to extract product data from a table row
    function extractProductFromRow(row) {
        const cells = row.querySelectorAll('th, td');
        
        if (cells.length < 8) {
            console.warn(`Row does not have enough cells (found ${cells.length}), skipping...`);
            console.log('Row HTML:', row.outerHTML.substring(0, 200) + '...');
            return null;
        }

        const product = {
            productName: extractTextContent(cells[0]),
            productCode: extractTextContent(cells[1]),
            version: extractTextContent(cells[2]),
            headerVersion: extractTextContent(cells[3]),
            bodyVersion: extractTextContent(cells[4]),
            minBodyVersion: extractTextContent(cells[5]),
            releaseDate: extractTextContent(cells[6]),
            releaseNotes: extractTextContent(cells[7])
        };

        // Clean up empty values
        Object.keys(product).forEach(key => {
            if (typeof product[key] === 'string') {
                product[key] = product[key].replace(/\s+/g, ' ').trim();
                if (product[key] === '' || product[key] === 'Not required') {
                    product[key] = null;
                }
            }
        });

        return product;
    }

    // Main extraction function
    function extractProductCatalog() {
        const products = [];
        
        // Start from the main wrapper and search within it
        const mainWrapper = document.querySelector('body > div.themeLayoutStarterWrapper.isHeroUnderHeader-false.isHeaderPinned-false.siteforceThemeLayoutStarter');
        
        if (!mainWrapper) {
            console.error('Could not find main Salesforce wrapper element');
            return [];
        }
        
        console.log('Found main wrapper:', mainWrapper);
        
        // Try multiple selectors to find the tbody element within the wrapper
        let tbody = null;
        
        // Search within the main wrapper for various tbody patterns
        tbody = mainWrapper.querySelector('tbody[data-rowgroup-body]') ||
                mainWrapper.querySelector('lightning-datatable tbody') ||
                mainWrapper.querySelector('c-products-for-download-tree-grid tbody') ||
                mainWrapper.querySelector('table tbody') ||
                mainWrapper.querySelector('tbody');
        
        if (!tbody) {
            console.error('Could not find product table body within main wrapper');
            console.log('Available tbodies in wrapper:', mainWrapper.querySelectorAll('tbody'));
            console.log('Available tables in wrapper:', mainWrapper.querySelectorAll('table'));
            console.log('Available lightning-datatables in wrapper:', mainWrapper.querySelectorAll('lightning-datatable'));
            return [];
        }

        console.log('Found tbody:', tbody);

        // Get all rows - try different selectors
        let rows = tbody.querySelectorAll('tr[role="row"]');
        
        // If no rows with role="row", try regular tr elements
        if (rows.length === 0) {
            rows = tbody.querySelectorAll('tr');
        }
        
        console.log(`Found ${rows.length} product rows`);

        rows.forEach((row, index) => {
            try {
                const product = extractProductFromRow(row);
                if (product && product.productName) {
                    products.push({
                        id: index + 1,
                        ...product
                    });
                    console.log(`Extracted: ${product.productName} (${product.productCode})`);
                }
            } catch (error) {
                console.error(`Error extracting row ${index + 1}:`, error);
            }
        });

        return products;
    }



    // Function to export data as JSON
    function exportToJSON(products) {
        return JSON.stringify({
            extractedAt: new Date().toISOString(),
            totalProducts: products.length,
            products: products
        }, null, 2);
    }

    // Function to download JSON file
    function downloadJSON(jsonContent, filename = 'more4apps_catalog.json') {
        const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

})();

// Global functions for manual use
window.more4AppsExtractor = {
    // Debug function to analyze table structure
    debug: function() {
        console.log('=== DEBUG: Analyzing table structure ===');
        
        // Find all tbodies
        const tbodies = document.querySelectorAll('tbody');
        console.log(`Found ${tbodies.length} tbody elements:`);
        
        tbodies.forEach((tbody, index) => {
            console.log(`tbody ${index + 1}:`, tbody);
            console.log(`  - Parent:`, tbody.parentElement);
            console.log(`  - Rows:`, tbody.querySelectorAll('tr').length);
            console.log(`  - First row cells:`, tbody.querySelector('tr') ? tbody.querySelector('tr').querySelectorAll('th, td').length : 0);
            
            // Check first row structure
            const firstRow = tbody.querySelector('tr');
            if (firstRow) {
                console.log(`  - First row HTML snippet:`, firstRow.outerHTML.substring(0, 300) + '...');
            }
        });
        
        // Also check all tables and rows
        const tables = document.querySelectorAll('table');
        console.log(`Found ${tables.length} table elements`);
        
        const allRows = document.querySelectorAll('tr');
        console.log(`Found ${allRows.length} tr elements total`);
        
        // Check for Lightning components
        console.log('Lightning datatable elements:', document.querySelectorAll('lightning-datatable').length);
        console.log('Products component:', document.querySelectorAll('c-products-for-download-tree-grid').length);
        
        // Look for rows with button elements (likely product rows)
        const rowsWithButtons = document.querySelectorAll('tr:has(button)');
        console.log(`Rows with buttons: ${rowsWithButtons.length}`);
        
        return {
            tbodies,
            tables,
            allRows,
            rowsWithButtons
        };
    },

    // Debug the specific tbody structure
    debugTbody: function() {
        console.log('=== DEBUGGING TBODY STRUCTURE ===');
        
        const mainWrapper = document.querySelector('body > div.themeLayoutStarterWrapper.isHeroUnderHeader-false.isHeaderPinned-false.siteforceThemeLayoutStarter');
        
        if (!mainWrapper) {
            console.log('Main wrapper not found');
            return;
        }
        
        const tbody = mainWrapper.querySelector('tbody[data-rowgroup-body]');
        
        if (!tbody) {
            console.log('No tbody[data-rowgroup-body] found');
            const allTbodies = mainWrapper.querySelectorAll('tbody');
            console.log(`Found ${allTbodies.length} tbody elements in wrapper`);
            
            allTbodies.forEach((tb, i) => {
                console.log(`tbody ${i + 1}:`, tb);
                console.log(`  - Attributes:`, tb.attributes);
                console.log(`  - Rows:`, tb.querySelectorAll('tr').length);
            });
            return;
        }
        
        console.log('Found tbody:', tbody);
        const rows = tbody.querySelectorAll('tr');
        console.log(`Rows in tbody: ${rows.length}`);
        
        // Examine first 3 rows in detail
        for (let i = 0; i < Math.min(3, rows.length); i++) {
            const row = rows[i];
            const cells = row.querySelectorAll('th, td');
            
            console.log(`\nRow ${i + 1}:`);
            console.log(`  - Tag: ${row.tagName}`);
            console.log(`  - Attributes:`, Array.from(row.attributes).map(a => `${a.name}="${a.value}"`));
            console.log(`  - Cells: ${cells.length}`);
            
            cells.forEach((cell, j) => {
                if (j < 8) { // Only show first 8 cells
                    const text = cell.textContent.trim();
                    console.log(`    Cell ${j + 1}: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}" (${cell.tagName})`);
                    
                    // Check for Lightning components
                    const formatted = cell.querySelector('lightning-base-formatted-text');
                    const button = cell.querySelector('button');
                    const link = cell.querySelector('a');
                    
                    if (formatted) console.log(`      - Has lightning-base-formatted-text`);
                    if (button) console.log(`      - Has button: "${button.textContent.trim()}"`);
                    if (link) console.log(`      - Has link: "${link.textContent.trim()}"`);
                }
            });
        }
    },

    // Deep debug of Shadow DOM and Lightning components
    debugShadowDOM: function() {
        console.log('=== DEBUGGING SHADOW DOM & LIGHTNING COMPONENTS ===');
        
        const mainWrapper = document.querySelector('body > div.themeLayoutStarterWrapper.isHeroUnderHeader-false.isHeaderPinned-false.siteforceThemeLayoutStarter');
        
        if (!mainWrapper) {
            console.log('Main wrapper not found');
            return;
        }
        
        // Find the lightning datatable
        const lightningDatatable = mainWrapper.querySelector('lightning-datatable');
        console.log('Lightning datatable found:', !!lightningDatatable);
        
        if (lightningDatatable) {
            console.log('Lightning datatable element:', lightningDatatable);
            
            // Check if it has a shadow root
            if (lightningDatatable.shadowRoot) {
                console.log('Lightning datatable has shadow root');
                const shadowTable = lightningDatatable.shadowRoot.querySelector('table');
                console.log('Table in shadow root:', !!shadowTable);
                
                if (shadowTable) {
                    const shadowTbody = shadowTable.querySelector('tbody');
                    const shadowRows = shadowTable.querySelectorAll('tr');
                    console.log('Shadow tbody found:', !!shadowTbody);
                    console.log('Shadow rows found:', shadowRows.length);
                    
                    // Examine first shadow row
                    if (shadowRows.length > 0) {
                        const firstRow = shadowRows[0];
                        const shadowCells = firstRow.querySelectorAll('th, td');
                        console.log('First shadow row cells:', shadowCells.length);
                        
                        shadowCells.forEach((cell, i) => {
                            if (i < 4) {
                                console.log(`Shadow cell ${i + 1}:`, cell.textContent.trim());
                            }
                        });
                    }
                }
            } else {
                console.log('No shadow root on lightning-datatable');
            }
        }
        
        // Also check for any elements with shadow roots
        const allElements = mainWrapper.querySelectorAll('*');
        let shadowRootCount = 0;
        
        allElements.forEach(el => {
            if (el.shadowRoot) {
                shadowRootCount++;
                console.log(`Element with shadow root: ${el.tagName.toLowerCase()}`);
            }
        });
        
        console.log(`Total elements with shadow roots: ${shadowRootCount}`);
        
        // Try to find any accessible table data through different methods
        console.log('\n=== TRYING ALTERNATIVE ACCESS METHODS ===');
        
        // Method 1: Check for data attributes
        const tbody = mainWrapper.querySelector('tbody[data-rowgroup-body]');
        if (tbody) {
            console.log('Tbody data attributes:', Array.from(tbody.attributes).map(a => `${a.name}="${a.value}"`));
            
            const firstRow = tbody.querySelector('tr');
            if (firstRow) {
                console.log('First row data attributes:', Array.from(firstRow.attributes).map(a => `${a.name}="${a.value}"`));
                
                const firstCell = firstRow.querySelector('th, td');
                if (firstCell) {
                    console.log('First cell data attributes:', Array.from(firstCell.attributes).map(a => `${a.name}="${a.value}"`));
                    console.log('First cell innerHTML snippet:', firstCell.innerHTML.substring(0, 200));
                }
            }
        }
    },

    // Extract from within the Salesforce wrapper
    extractFromWrapper: function() {
        console.log('=== Trying to extract from Salesforce wrapper ===');
        
        // Find the main Salesforce wrapper
        const mainWrapper = document.querySelector('body > div.themeLayoutStarterWrapper.isHeroUnderHeader-false.isHeaderPinned-false.siteforceThemeLayoutStarter');
        
        if (!mainWrapper) {
            console.log('Main wrapper not found');
            return [];
        }
        
        // Try to find tbody first
        const tbody = mainWrapper.querySelector('tbody[data-rowgroup-body]');
        let allRows;
        
        if (tbody) {
            console.log('Found tbody with data-rowgroup-body');
            allRows = tbody.querySelectorAll('tr');
        } else {
            console.log('No tbody found, searching all rows in wrapper');
            allRows = mainWrapper.querySelectorAll('tr');
        }
        
        console.log(`Found ${allRows.length} rows within wrapper`);
        
        const products = [];
        
        allRows.forEach((row, index) => {
            const cells = row.querySelectorAll('th, td');
            
            console.log(`Row ${index + 1}: ${cells.length} cells`);
            
            // Log first few cells to understand structure
            if (index < 5) {
                console.log(`  Row ${index + 1} cell contents:`);
                for (let i = 0; i < Math.min(cells.length, 4); i++) {
                    const cell = cells[i];
                    const cellText = cell.textContent.trim();
                    console.log(`    Cell ${i + 1}: "${cellText.substring(0, 50)}${cellText.length > 50 ? '...' : ''}"`);
                    
                    // Debug: Check for nested elements and their content
                    const nestedElements = cell.querySelectorAll('*');
                    console.log(`      - Nested elements: ${nestedElements.length}`);
                    
                    // Check for common Lightning component patterns
                    const lightningText = cell.querySelector('lightning-base-formatted-text');
                    const lightningButton = cell.querySelector('lightning-button, button');
                    const lightningLink = cell.querySelector('a');
                    const spans = cell.querySelectorAll('span');
                    const divs = cell.querySelectorAll('div');
                    
                    if (lightningText) console.log(`      - Lightning text: "${lightningText.textContent.trim()}"`);
                    if (lightningButton) console.log(`      - Button: "${lightningButton.textContent.trim()}"`);
                    if (lightningLink) console.log(`      - Link: "${lightningLink.textContent.trim()}"`);
                    if (spans.length > 0) {
                        spans.forEach((span, si) => {
                            const spanText = span.textContent.trim();
                            if (spanText) console.log(`      - Span ${si + 1}: "${spanText}"`);
                        });
                    }
                    if (divs.length > 0) {
                        divs.forEach((div, di) => {
                            const divText = div.textContent.trim();
                            if (divText && divText.length < 100) console.log(`      - Div ${di + 1}: "${divText}"`);
                        });
                    }
                    
                    // Try to access shadow root if it exists
                    if (cell.shadowRoot) {
                        console.log(`      - Has shadow root`);
                        const shadowText = cell.shadowRoot.textContent;
                        if (shadowText) console.log(`      - Shadow text: "${shadowText.trim()}"`);
                    }
                }
            }
            
            // Be more flexible with cell count - try with any row that has at least 4 cells
            if (cells.length >= 4) {
                const extractText = (cell) => {
                    // Try multiple extraction methods
                    
                    // Method 1: Lightning components
                    const formatted = cell.querySelector('lightning-base-formatted-text');
                    if (formatted && formatted.textContent.trim()) {
                        return formatted.textContent.trim();
                    }
                    
                    // Method 2: Buttons
                    const button = cell.querySelector('lightning-button, button');
                    if (button && button.textContent.trim()) {
                        return button.textContent.trim();
                    }
                    
                    // Method 3: Links
                    const link = cell.querySelector('a');
                    if (link && link.textContent.trim()) {
                        return { text: link.textContent.trim(), url: link.href };
                    }
                    
                    // Method 4: Look for spans with actual content
                    const spans = cell.querySelectorAll('span');
                    for (let span of spans) {
                        const spanText = span.textContent.trim();
                        if (spanText && spanText.length > 0 && !spanText.includes('slds-')) {
                            return spanText;
                        }
                    }
                    
                    // Method 5: Look for divs with content
                    const divs = cell.querySelectorAll('div');
                    for (let div of divs) {
                        const divText = div.textContent.trim();
                        if (divText && divText.length > 0 && divText.length < 200 && !divText.includes('slds-')) {
                            return divText;
                        }
                    }
                    
                    // Method 6: Try to get any text node directly
                    const walker = document.createTreeWalker(
                        cell,
                        NodeFilter.SHOW_TEXT,
                        null,
                        false
                    );
                    
                    let textContent = '';
                    let node;
                    while (node = walker.nextNode()) {
                        const text = node.textContent.trim();
                        if (text && text.length > 0) {
                            textContent += text + ' ';
                        }
                    }
                    
                    if (textContent.trim()) {
                        return textContent.trim();
                    }
                    
                    // Method 7: Fallback to innerText and textContent
                    if (cell.innerText && cell.innerText.trim()) {
                        return cell.innerText.trim();
                    }
                    
                    return cell.textContent.trim();
                };
                
                const productName = extractText(cells[0]);
                
                // More flexible product name detection - look for any meaningful text, not just specific keywords
                if (productName && 
                    productName.length > 2 && 
                    !productName.includes('File Download') &&
                    !productName.toLowerCase().includes('product') &&
                    !productName.toLowerCase().includes('version') &&
                    productName !== 'Actions') {
                    
                    const product = {
                        rowIndex: index,
                        productName: productName,
                        productCode: cells.length > 1 ? extractText(cells[1]) : '',
                        version: cells.length > 2 ? extractText(cells[2]) : '',
                        headerVersion: cells.length > 3 ? extractText(cells[3]) : '',
                        bodyVersion: cells.length > 4 ? extractText(cells[4]) : '',
                        minBodyVersion: cells.length > 5 ? extractText(cells[5]) : '',
                        releaseDate: cells.length > 6 ? extractText(cells[6]) : ''
                    };
                    
                    products.push(product);
                    console.log(`Found product: ${productName} (${cells.length} cells)`);
                }
            }
        });
        
        console.log(`\n=== EXTRACTION SUMMARY ===`);
        console.log(`Total rows processed: ${allRows.length}`);
        console.log(`Products found: ${products.length}`);
        console.table(products);
        return products;
    },

    // Extract from any rows, not just tbody
    extractFromAllRows: function() {
        console.log('=== Trying to extract from all available rows ===');
        
        // Find all rows that might contain product data
        const allRows = document.querySelectorAll('tr');
        const products = [];
        
        allRows.forEach((row, index) => {
            const cells = row.querySelectorAll('th, td');
            
            // Skip header rows and rows with too few cells
            if (cells.length >= 8) {
                const extractText = (cell) => {
                    const formatted = cell.querySelector('lightning-base-formatted-text');
                    const button = cell.querySelector('button');
                    const link = cell.querySelector('a');
                    
                    if (formatted) return formatted.textContent.trim();
                    if (button) return button.textContent.trim();
                    if (link) return { text: link.textContent.trim(), url: link.href };
                    return cell.textContent.trim();
                };
                
                const productName = extractText(cells[0]);
                
                // Only include rows that look like product rows (have a product name)
                if (productName && productName.length > 3 && !productName.includes('File Download')) {
                    products.push({
                        rowIndex: index,
                        productName: productName,
                        productCode: extractText(cells[1]),
                        version: extractText(cells[2]),
                        headerVersion: extractText(cells[3]),
                        bodyVersion: extractText(cells[4]),
                        minBodyVersion: extractText(cells[5]),
                        releaseDate: extractText(cells[6])
                    });
                    
                    console.log(`Found product: ${productName}`);
                }
            }
        });
        
        console.table(products);
        return products;
    },

    // Wait for table to load and then extract
    waitAndExtract: function(maxAttempts = 10, delay = 1000) {
        console.log('=== Waiting for table to load ===');
        let attempts = 0;
        
        const checkForTable = () => {
            attempts++;
            console.log(`Attempt ${attempts}/${maxAttempts}`);
            
            const mainWrapper = document.querySelector('body > div.themeLayoutStarterWrapper.isHeroUnderHeader-false.isHeaderPinned-false.siteforceThemeLayoutStarter');
            
            if (mainWrapper) {
                const rows = mainWrapper.querySelectorAll('tr');
                console.log(`Found ${rows.length} rows`);
                
                if (rows.length > 5) { // Assume we need at least a few rows
                    console.log('Table appears to be loaded, extracting...');
                    return this.extractFromWrapper();
                }
            }
            
            if (attempts < maxAttempts) {
                console.log(`No table found yet, waiting ${delay}ms...`);
                setTimeout(checkForTable, delay);
            } else {
                console.log('Max attempts reached, table may not be available');
                return [];
            }
        };
        
        return checkForTable();
    },

    // Main execution function
    runFullExtraction: function() {
        try {
            // First run debug to see what's available
            console.log('=== INITIAL DEBUG ===');
            const tbodies = document.querySelectorAll('tbody');
            console.log(`Found ${tbodies.length} tbody elements`);
            
            if (tbodies.length === 0) {
                console.log('No tbody found. Let\'s analyze the page structure...');
                
                // Check if main wrapper exists
                const mainWrapper = document.querySelector('body > div.themeLayoutStarterWrapper.isHeroUnderHeader-false.isHeaderPinned-false.siteforceThemeLayoutStarter');
                console.log('Main Salesforce wrapper found:', !!mainWrapper);
                
                if (mainWrapper) {
                    console.log('Elements within wrapper:');
                    console.log('  - Tables:', mainWrapper.querySelectorAll('table').length);
                    console.log('  - Lightning datatables:', mainWrapper.querySelectorAll('lightning-datatable').length);
                    console.log('  - Products components:', mainWrapper.querySelectorAll('c-products-for-download-tree-grid').length);
                    console.log('  - All rows:', mainWrapper.querySelectorAll('tr').length);
                    
                    // Try the alternative extraction on wrapper content
                    console.log('Trying alternative extraction...');
                    const products = this.extractFromWrapper();
                    if (products.length > 0) {
                        console.log(`Found ${products.length} products with alternative method!`);
                        console.table(products);
                        
                        const jsonContent = this.exportToJSON(products);
                        this.downloadJSON(jsonContent);
                        console.log('JSON file downloaded');
                        
                        alert(`Successfully extracted ${products.length} products using alternative method!`);
                        return products;
                    }
                }
                
                console.log('All table elements:', document.querySelectorAll('table'));
                console.log('Lightning datatables:', document.querySelectorAll('lightning-datatable'));
                console.log('Products component:', document.querySelectorAll('c-products-for-download-tree-grid'));
                
                // Look for any tr elements that might contain product data
                const allRows = document.querySelectorAll('tr');
                console.log(`Found ${allRows.length} tr elements total`);
                
                if (allRows.length > 0) {
                    console.log('First few rows:');
                    Array.from(allRows).slice(0, 5).forEach((row, i) => {
                        console.log(`Row ${i + 1}:`, row.outerHTML.substring(0, 200) + '...');
                    });
                }
                
                alert('No tbody elements found. The table might still be loading or use a different structure. Try more4AppsExtractor.extractFromWrapper() manually.');
                return [];
            }
            
            // Try standard extraction if tbody found
            const products = this.extractToConsole();
            
            if (products.length === 0) {
                console.error('No products found. Make sure the Lightning table is loaded.');
                alert('No products found. Make sure the Lightning table is loaded.');
                return [];
            }

            console.log(`Successfully extracted ${products.length} products`);
            console.table(products);

            // Download JSON file
            const jsonContent = this.exportToJSON(products);
            this.downloadJSON(jsonContent);
            console.log('JSON file downloaded');

            // Also copy to clipboard as JSON for immediate use
            if (navigator.clipboard) {
                navigator.clipboard.writeText(jsonContent).then(() => {
                    console.log('Product data copied to clipboard as JSON');
                });
            }

            alert(`Successfully extracted ${products.length} products! Check console and downloads.`);
            return products;

        } catch (error) {
            console.error('Error during extraction:', error);
            alert('Error during extraction. Check console for details.');
            return [];
        }
    },

    extract: function() {
        return this.runFullExtraction();
    },
    
    // Quick extraction without UI prompts
    extractToConsole: function() {
        // Try multiple selectors to find tbody
        let tbody = document.querySelector('tbody[data-rowgroup-body]') ||
                   document.querySelector('lightning-datatable tbody') ||
                   document.querySelector('c-products-for-download-tree-grid tbody') ||
                   document.querySelector('body > div.themeLayoutStarterWrapper.isHeroUnderHeader-false.isHeaderPinned-false.siteforceThemeLayoutStarter > div.body.isPageWidthFixed-true > div > div.slds-col--padded.contentRegion.comm-layout-column > div > div > c-products-for-download-tree-grid > div > lightning-datatable > div.dt-outer-container > div > div > table > tbody') ||
                   document.querySelector('tbody');
                   
        if (!tbody) {
            console.log('No tbody found. Available tbodies:', document.querySelectorAll('tbody'));
            return [];
        }
        
        let rows = tbody.querySelectorAll('tr[role="row"]');
        if (rows.length === 0) {
            rows = tbody.querySelectorAll('tr');
        }
        
        const products = [];
        
        rows.forEach((row, index) => {
            const cells = row.querySelectorAll('th, td');
            if (cells.length >= 8) {
                const extractText = (cell) => {
                    const formatted = cell.querySelector('lightning-base-formatted-text');
                    const button = cell.querySelector('button');
                    const link = cell.querySelector('a');
                    
                    if (formatted) return formatted.textContent.trim();
                    if (button) return button.textContent.trim();
                    if (link) return { text: link.textContent.trim(), url: link.href };
                    return cell.textContent.trim();
                };
                
                products.push({
                    productName: extractText(cells[0]),
                    productCode: extractText(cells[1]),
                    version: extractText(cells[2]),
                    headerVersion: extractText(cells[3]),
                    bodyVersion: extractText(cells[4]),
                    minBodyVersion: extractText(cells[5]),
                    releaseDate: extractText(cells[6])
                });
            }
        });
        
        console.table(products);
        return products;
    },

    // Export functions
    exportToJSON: function(products) {
        return JSON.stringify({
            extractedAt: new Date().toISOString(),
            totalProducts: products.length,
            products: products
        }, null, 2);
    },

    downloadJSON: function(jsonContent, filename = 'more4apps_catalog.json') {
        const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

// Run the extraction automatically when script loads
console.log('More4Apps Product Catalog Extractor - Starting...');
more4AppsExtractor.runFullExtraction();

console.log('More4Apps extractor ready! Use more4AppsExtractor.extract() to run again.');