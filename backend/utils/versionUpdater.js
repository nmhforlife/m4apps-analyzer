const fs = require('fs').promises;
const path = require('path');
const { getWizardName } = require('./productMapping');

/**
 * Version Updater Utility
 * Helps import and update version data from More4apps community site
 * Enhanced with lightning table extractor integration
 */

/**
 * Process extracted data from the lightning table extractor
 * Converts the raw extracted data into the format needed for versionChecker.js
 */
function processLightningExtractorData(extractedData) {
  if (!extractedData || !extractedData.products || !Array.isArray(extractedData.products)) {
    throw new Error('Invalid extracted data format. Expected object with products array.');
  }

  const processed = {};
  const { products } = extractedData;

  console.log(`Processing ${products.length} products from lightning extractor data...`);

  products.forEach((product, index) => {
    try {
      const {
        productName,
        productCode,
        version,
        headerVersion,
        bodyVersion,
        minBodyVersion,
        releaseDate
      } = product;

      // Skip if no product name
      if (!productName || productName.trim() === '') {
        console.warn(`Skipping product at index ${index}: No product name`);
        return;
      }

      // Clean and normalize the product name
      let cleanProductName = productName.trim();
      
      // Map product code to wizard name if available
      const wizardName = productCode ? getWizardName(productCode) : cleanProductName;
      
      // Use the mapped wizard name, or fall back to cleaned product name
      const finalWizardName = wizardName !== productCode ? wizardName : cleanProductName;

      // Process versions - handle different formats and blank values
      let processedHeaderVersion = 'Not required';
      let processedBodyVersion = 'Not required';

      // Helper function to check if a version value is valid (not empty/blank)
      const isValidVersion = (ver) => {
        return ver && 
               typeof ver === 'string' && 
               ver.trim() !== '' && 
               ver.trim().toLowerCase() !== 'not required';
      };

      // Determine header version
      // If headerVersion is explicitly provided (even if blank), respect that
      if (headerVersion !== undefined && headerVersion !== null) {
        if (isValidVersion(headerVersion)) {
          processedHeaderVersion = headerVersion.trim();
        }
        // If headerVersion exists but is blank/empty, keep as 'Not required'
      } else if (isValidVersion(version)) {
        // Only fall back to version if headerVersion wasn't provided at all
        processedHeaderVersion = version.trim();
      }

      // Determine body version
      // If bodyVersion is explicitly provided (even if blank), respect that
      if (bodyVersion !== undefined && bodyVersion !== null) {
        if (isValidVersion(bodyVersion)) {
          processedBodyVersion = bodyVersion.trim();
        }
        // If bodyVersion exists but is blank/empty, keep as 'Not required'
      } else if (minBodyVersion !== undefined && minBodyVersion !== null) {
        if (isValidVersion(minBodyVersion)) {
          processedBodyVersion = minBodyVersion.trim();
        }
        // If minBodyVersion exists but is blank/empty, keep as 'Not required'
      } else if (isValidVersion(version)) {
        // Only fall back to version if neither bodyVersion nor minBodyVersion were provided
        processedBodyVersion = version.trim();
      }

      // Clean up release date
      let processedReleaseDate = 'Unknown';
      if (releaseDate && releaseDate.trim()) {
        processedReleaseDate = releaseDate.trim();
      }

      // Store the processed data
      processed[finalWizardName] = {
        header: processedHeaderVersion,
        body: processedBodyVersion,
        releaseDate: processedReleaseDate,
        downloadUrl: 'https://community.more4apps.com/s/ebs-toolbox-downloads'
      };

      console.log(`Processed: ${finalWizardName}`);
      console.log(`  Header: ${processedHeaderVersion}`);
      console.log(`  Body: ${processedBodyVersion}`);
      console.log(`  Release: ${processedReleaseDate}`);

    } catch (error) {
      console.error(`Error processing product at index ${index}:`, error);
      console.error('Product data:', product);
    }
  });

  return processed;
}

/**
 * Parse version data from community page content
 * Expected format could be HTML table, JSON, or structured text
 */
function parseVersionData(rawData, format = 'auto') {
  const versions = {};
  
  try {
    console.log('Parsing version data with format:', format);
    console.log('Data length:', rawData.length);
    console.log('First 200 characters:', rawData.substring(0, 200));
    
    if (format === 'json' || (format === 'auto' && rawData.trim().startsWith('{'))) {
      // Handle JSON format
      const jsonData = JSON.parse(rawData);
      return processJsonVersions(jsonData);
    }
    
    if (format === 'html' || (format === 'auto' && rawData.includes('<'))) {
      // Handle HTML table format
      return parseHtmlVersions(rawData);
    }
    
    if (format === 'csv' || (format === 'auto' && rawData.includes(',') && !rawData.includes('\t'))) {
      // Handle CSV format
      return parseCsvVersions(rawData);
    }
    
    // Default text parsing (includes tab-separated data)
    const result = parseTextVersions(rawData);
    console.log('Parsed versions count:', Object.keys(result).length);
    console.log('Sample parsed data:', Object.keys(result).slice(0, 5));
    return result;
    
  } catch (error) {
    console.error('Parser error:', error);
    throw new Error(`Failed to parse version data: ${error.message}`);
  }
}

/**
 * Parse JSON version data
 */
function processJsonVersions(jsonData) {
  const versions = {};
  
  // Handle different JSON structures
  if (Array.isArray(jsonData)) {
    jsonData.forEach(item => {
      if (item.name && item.version) {
        versions[item.name] = {
          header: item.version,
          body: item.version,
          releaseDate: item.releaseDate || new Date().toISOString().split('T')[0],
          downloadUrl: item.downloadUrl || 'https://community.more4apps.com/s/ebs-toolbox-downloads'
        };
      }
    });
  } else if (typeof jsonData === 'object') {
    Object.keys(jsonData).forEach(key => {
      const item = jsonData[key];
      versions[key] = {
        header: item.header || item.version,
        body: item.body || item.version,
        releaseDate: item.releaseDate || new Date().toISOString().split('T')[0],
        downloadUrl: item.downloadUrl || 'https://community.more4apps.com/s/ebs-toolbox-downloads'
      };
    });
  }
  
  return versions;
}

/**
 * Parse HTML table version data
 */
function parseHtmlVersions(htmlData) {
  const versions = {};
  
  // Extract table rows (this is a basic parser - may need refinement based on actual HTML structure)
  const tableRowRegex = /<tr[^>]*>(.*?)<\/tr>/gi;
  const cellRegex = /<t[dh][^>]*>(.*?)<\/t[dh]>/gi;
  
  let match;
  while ((match = tableRowRegex.exec(htmlData)) !== null) {
    const rowHtml = match[1];
    const cells = [];
    
    let cellMatch;
    while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
      // Clean HTML tags and get text content
      const cellText = cellMatch[1].replace(/<[^>]*>/g, '').trim();
      cells.push(cellText);
    }
    
    // Assuming format: [Wizard Name, Version, Release Date]
    if (cells.length >= 2 && cells[0] && cells[1]) {
      const wizardName = cells[0];
      const version = cells[1];
      const releaseDate = cells[2] || new Date().toISOString().split('T')[0];
      
      // Skip header rows
      if (!wizardName.toLowerCase().includes('wizard') && !wizardName.toLowerCase().includes('name')) {
        continue;
      }
      
      versions[wizardName] = {
        header: version,
        body: version,
        releaseDate: releaseDate,
        downloadUrl: 'https://community.more4apps.com/s/ebs-toolbox-downloads'
      };
    }
  }
  
  return versions;
}

/**
 * Parse CSV version data
 */
function parseCsvVersions(csvData) {
  const versions = {};
  const lines = csvData.split('\n');
  
  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const columns = line.split(',').map(col => col.trim().replace(/"/g, ''));
    
    if (columns.length >= 2) {
      const wizardName = columns[0];
      const version = columns[1];
      const releaseDate = columns[2] || new Date().toISOString().split('T')[0];
      
      versions[wizardName] = {
        header: version,
        body: version,
        releaseDate: releaseDate,
        downloadUrl: 'https://community.more4apps.com/s/ebs-toolbox-downloads'
      };
    }
  }
  
  return versions;
}

/**
 * Parse plain text version data
 */
function parseTextVersions(textData) {
  const versions = {};
  
  // Check if this is newline-separated data (each field on its own line)
  if (isNewlineSeparatedData(textData)) {
    return parseNewlineSeparatedData(textData);
  }
  
  const lines = textData.split('\n');
  
  console.log('=== PARSER DEBUG ===');
  console.log('Total lines:', lines.length);
  console.log('Raw data preview (first 500 chars):\n', textData.substring(0, 500));
  console.log('First 5 lines:');
  lines.slice(0, 5).forEach((line, i) => {
    console.log(`Line ${i}: "${line}" (length: ${line.length})`);
  });
  
  let headerSkipped = false;
  let processedLines = 0;
  
  lines.forEach((line, index) => {
    const originalLine = line;
    line = line.trim();
    
    if (!line) {
      console.log(`Line ${index}: EMPTY - skipping`);
      return;
    }
    
    // Check for header patterns - must be the actual header line, not data containing these words
    const isHeader = (line.includes('Product Code') && line.includes('Version') && line.includes('Release Date')) ||
                     (line.includes('File Download') && line.includes('Header Version') && line.includes('Body Version')) ||
                     line.toLowerCase().startsWith('wizard') ||
                     line.toLowerCase().startsWith('name');
    
    if (isHeader) {
      console.log(`Line ${index}: HEADER detected - "${line.substring(0, 50)}..."`);
      headerSkipped = true;
      return;
    }
    
    // Only process data lines after we've seen a header
    if (!headerSkipped) {
      console.log(`Line ${index}: BEFORE HEADER - skipping "${line.substring(0, 30)}..."`);
      return;
    }
    
    console.log(`Line ${index}: PROCESSING - "${line}"`);
    processedLines++;
    
    // Detect delimiter - check for tabs first, then multiple spaces
    let columns = [];
    let delimiter = 'unknown';
    
    if (originalLine.includes('\t')) {
      columns = originalLine.split('\t').map(col => col.trim()).filter(col => col);
      delimiter = 'tab';
    } else if (line.match(/\s{2,}/)) {
      columns = line.split(/\s{2,}/).map(col => col.trim()).filter(col => col);
      delimiter = 'multiple-spaces';
    } else {
      columns = line.split(/\s+/).filter(col => col);
      delimiter = 'single-spaces';
    }
    
    console.log(`Line ${index}: Delimiter=${delimiter}, Columns=${columns.length}:`, columns);
    
    if (columns.length < 2) {
      console.log(`Line ${index}: TOO FEW COLUMNS - skipping`);
      return;
    }
    
    const wizardName = columns[0]; // Full wizard name from first column
    const productCode = columns[1]; // Product code from second column
    const version = columns[2]; // Main version from third column
    const headerVersion = columns[3]; // Header version (might be "Not")
    const bodyVersion = columns[4]; // Body version or "required" if header was "Not"
    
    // Skip invalid entries
    if (!wizardName || 
        !version || 
        version === 'Release' || 
        version === 'Notes' ||
        wizardName === 'File' ||
        wizardName === 'Product') {
      console.log(`Line ${index}: INVALID ENTRY - wizardName="${wizardName}", version="${version}"`);
      return;
    }
    
    // Use the wizard name directly from the first column (it's already the full name)
    // We could map from product code, but the full name is more accurate
    const mappedFromProductCode = mapProductCodeToWizardName(productCode);
    console.log(`Line ${index}: Using wizard name "${wizardName}" from data (vs mapped "${mappedFromProductCode}")`);
    
    // Handle "Not required" values - properly detect split "Not" + "required" across columns
    let finalHeaderVersion = headerVersion;
    let finalBodyVersion = bodyVersion;
    
    // Check if "Not required" is split across columns for header (columns 3 & 4)
    if (columns[3] === 'Not' && columns[4] === 'required') {
      finalHeaderVersion = 'Not required';
      // Body version would be in column 5 if it exists, otherwise check for "Not required" split
      if (columns[5] === 'Not' && columns[6] === 'required') {
        finalBodyVersion = 'Not required';
      } else if (columns[5] && validateVersionFormat(columns[5])) {
        finalBodyVersion = columns[5];
      } else {
        finalBodyVersion = version; // Use main version as fallback
      }
    } 
    // Check if header is a normal version but body is "Not required" split (columns 4 & 5)
    else if (columns[4] === 'Not' && columns[5] === 'required') {
      finalBodyVersion = 'Not required';
    }
    // Handle single "Not required" values
    else {
      if (headerVersion === 'Not required' || headerVersion === 'Not' || headerVersion === 'required') {
        finalHeaderVersion = 'Not required';
      }
      if (bodyVersion === 'Not required' || bodyVersion === 'Not' || bodyVersion === 'required') {
        finalBodyVersion = 'Not required';
      }
    }
    
    console.log(`Line ${index}: Versions - main="${version}", header="${finalHeaderVersion}", body="${finalBodyVersion}"`);
    
    // Validate at least one version
    const versionValid = validateVersionFormat(version);
    const headerValid = validateVersionFormat(finalHeaderVersion);
    const bodyValid = validateVersionFormat(finalBodyVersion);
    
    console.log(`Line ${index}: Validation - main=${versionValid}, header=${headerValid}, body=${bodyValid}`);
    
    if (versionValid || headerValid || bodyValid) {
      const releaseDate = extractReleaseDate(columns);
      
      versions[wizardName] = {
        header: finalHeaderVersion,
        body: finalBodyVersion,
        releaseDate: releaseDate,
        downloadUrl: 'https://community.more4apps.com/s/ebs-toolbox-downloads',
        productCode: productCode
      };
      
      console.log(`Line ${index}: ✅ ADDED "${wizardName}" with versions H:${finalHeaderVersion} B:${finalBodyVersion}`);
    } else {
      console.log(`Line ${index}: ❌ REJECTED - no valid versions found`);
    }
  });
  
  console.log('=== PARSER SUMMARY ===');
  console.log('Processed lines:', processedLines);
  console.log('Successfully parsed:', Object.keys(versions).length);
  console.log('Parsed wizards:', Object.keys(versions));
  console.log('===================');
  
  return versions;
}

/**
 * Check if data is in newline-separated format (each field on its own line)
 */
function isNewlineSeparatedData(textData) {
  const lines = textData.split('\n').map(line => line.trim()).filter(line => line);
  
  // Look for the pattern where we have header fields followed by data
  const hasHeaderPattern = lines.some(line => 
    line === 'File Download' || 
    line === 'Product Code' || 
    line === 'Version' ||
    line === 'Header Version' ||
    line === 'Body Version'
  );
  
  // Check if we have wizard codes that would indicate this is newline-separated data
  const hasWizardCodes = lines.some(line => 
    /^(AFW|PIW|AIW|RIW|ARW|AW|BMW|BW|CW|EEW|EMW|EW|GLW|ICW|IW|MTW|PRW|POW|PLW|PMW|TW|PW|RW|RTW|SOW|SCW|SIW|SW|AIW_\w+)$/.test(line)
  );
  
  return hasHeaderPattern && hasWizardCodes;
}

/**
 * Parse newline-separated data format
 */
function parseNewlineSeparatedData(textData) {
  const versions = {};
  const lines = textData.split('\n').map(line => line.trim()).filter(line => line);
  
  console.log('=== NEWLINE-SEPARATED PARSER DEBUG ===');
  console.log('Total lines after filtering:', lines.length);
  console.log('First 30 lines:', lines.slice(0, 30));
  
  // Expected field order based on More4apps format
  const expectedFields = [
    'File Download', 'Product Code', 'Version', 'Header Version', 
    'Body Version', 'Min Body Version', 'Release Date', 'Release Notes'
  ];
  
  // Find where the header ends and data begins
  let headerEndIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (expectedFields.includes(lines[i])) {
      continue;
    } else {
      // First non-header line - this should be the start of data
      headerEndIndex = i;
      break;
    }
  }
  
  if (headerEndIndex === -1) {
    console.log('No data found after headers');
    return versions;
  }
  
  console.log('Header ends at line:', headerEndIndex);
  console.log('Data starts with:', lines[headerEndIndex]);
  
  // The data structure is actually:
  // AFW (product code)
  // 2.3.37 (version)  
  // Not required (header version)
  // Not required (body version)
  // Not required (min body version)
  // 10-Sep-2025 (release date)
  // Release Notes (literal text)
  // PIW (next product code)
  // ...
  
  const dataLines = lines.slice(headerEndIndex);
  
  // Process each wizard record - they are separated by "Release Notes"
  let i = 0;
  while (i < dataLines.length) {
    const productCode = dataLines[i];
    
    // Skip if we've run out of data or hit another header field
    if (!productCode || expectedFields.includes(productCode)) {
      i++;
      continue;
    }
    
    // Skip "Release Notes" entries  
    if (productCode === 'Release' || productCode.includes('Notes')) {
      i++;
      continue;
    }
    
    // Look ahead to find the next "Release Notes" marker to determine record length
    let recordEndIndex = -1;
    for (let j = i + 1; j < Math.min(i + 10, dataLines.length); j++) {
      if (dataLines[j] === 'Release Notes') {
        recordEndIndex = j;
        break;
      }
    }
    
    // If no "Release Notes" found, try to use a fixed length or skip
    if (recordEndIndex === -1) {
      console.log(`No "Release Notes" marker found for record starting at ${i} with product code "${productCode}"`);
      i++;
      continue;
    }
    
    const recordLength = recordEndIndex - i;
    console.log(`Record starting at ${i} (${productCode}) has length ${recordLength}`);
    
    // Handle different record lengths
    let version, headerVersion, bodyVersion, minBodyVersion, releaseDate;
    
    if (recordLength === 6) {
      // Standard format: ProductCode, Version, HeaderVersion, BodyVersion, MinBodyVersion, ReleaseDate, "Release Notes"
      version = dataLines[i + 1];
      headerVersion = dataLines[i + 2];
      bodyVersion = dataLines[i + 3];
      minBodyVersion = dataLines[i + 4];
      releaseDate = dataLines[i + 5];
    } else if (recordLength === 4) {
      // Short format: ProductCode, Version, ReleaseDate, "Release Notes"
      version = dataLines[i + 1];
      headerVersion = 'Not required';
      bodyVersion = 'Not required';
      minBodyVersion = 'Not required';
      releaseDate = dataLines[i + 2];
    } else if (recordLength === 3) {
      // Very short format: ProductCode, Version, "Release Notes" (assume current date)
      version = dataLines[i + 1];
      headerVersion = 'Not required';
      bodyVersion = 'Not required';
      minBodyVersion = 'Not required';
      releaseDate = new Date().toISOString().split('T')[0];
    } else {
      console.log(`Unsupported record length ${recordLength} for ${productCode}`);
      i = recordEndIndex + 1;
      continue;
    }
    
    console.log(`Processing record: ${productCode}, ${version}, ${headerVersion}, ${bodyVersion}, ${minBodyVersion}, ${releaseDate}`);
    
    // Skip if this doesn't look like a valid record
    if (!version || version === 'Release') {
      console.log(`Invalid version for ${productCode}: ${version}`);
      i = recordEndIndex + 1;
      continue;
    }
    
    // Map product code to wizard name
    const wizardName = mapProductCodeToWizardName(productCode);
    console.log(`Mapped "${productCode}" to "${wizardName}"`);
    
    // Handle "Not required" values
    const finalHeaderVersion = (headerVersion === 'Not required' || !headerVersion) ? version : headerVersion;
    const finalBodyVersion = (bodyVersion === 'Not required' || !bodyVersion) ? version : bodyVersion;
    
    // Validate at least one version
    const versionValid = validateVersionFormat(version);
    const headerValid = validateVersionFormat(finalHeaderVersion);
    const bodyValid = validateVersionFormat(finalBodyVersion);
    
    console.log(`Validation - main=${versionValid}, header=${headerValid}, body=${bodyValid}`);
    
    if (versionValid || headerValid || bodyValid) {
      const formattedReleaseDate = convertDateFormat(releaseDate);
      
      versions[wizardName] = {
        header: finalHeaderVersion,
        body: finalBodyVersion,
        releaseDate: formattedReleaseDate,
        downloadUrl: 'https://community.more4apps.com/s/ebs-toolbox-downloads',
        productCode: productCode
      };
      
      console.log(`✅ ADDED "${wizardName}" with versions H:${finalHeaderVersion} B:${finalBodyVersion}`);
    } else {
      console.log(`❌ REJECTED - no valid versions found for ${productCode}`);
    }
    
    // Move to next record (position after "Release Notes")
    i = recordEndIndex + 1;
  }
  
  console.log('=== NEWLINE-SEPARATED PARSER SUMMARY ===');
  console.log('Successfully parsed:', Object.keys(versions).length);
  console.log('Parsed wizards:', Object.keys(versions));
  console.log('======================================');
  
  return versions;
}

/**
 * Map product codes to wizard names
 */
function mapProductCodeToWizardName(productCode) {
  const codeMapping = {
    'AFW': 'Agreement & Funding Wizard',
    'PIW': 'Payables Invoice Wizard',
    'AIW': 'Application Interface Wizard',
    'RIW': 'Receivables Invoice Wizard',
    'AIW_ARNL': 'AR Netting and Lockbox Interface',
    'ARW': 'AR Receipt Wizard',
    'AW': 'Asset Wizard',
    'AIW_BSL': 'Bank Statement Loader',
    'AIW_BBL': 'Budget Balance Loader',
    'BMW': 'Bill of Materials Wizard',
    'BW': 'Budget Wizard',
    'CW': 'Customer Wizard',
    'AIW_EAMWKMGMT': 'EAM Work Management Interface',
    'EEW': 'Employee Expense Wizard',
    'EMW': 'Employee Wizard',
    'EW': 'Event Wizard',
    'AIW_GLDRL': 'GL Daily Rates Loader',
    'GLW': 'GL Wizard',
    'AIW_iSUL': 'iSupplier User Loader',
    'ICW': 'Item Cost Wizard',
    'IW': 'Item Wizard',
    'AIW_JBPS': 'Job/Position Synchronizer',
    'AIW_PALCR': 'PA Labor Cost Redistributor',
    'MTW': 'Material Transaction Wizard',
    'AIW_OPMRFL': 'OPM Recipe Formula Loader',
    'AIW_INVPSTL': 'Inventory Posting Loader',
    'PRW': 'PO Receiving Wizard',
    'POW': 'Purchase Order Wizard',
    'PLW': 'Price List Wizard',
    'PMW': 'Pricing Modifiers Wizard',
    'TW': 'Project Transaction Wizard',
    'PW': 'Project Wizard',
    'RW': 'Requisition Wizard',
    'AIW_RLML': 'Rapid Learning Module Loader',
    'RTW': 'Routing Wizard',
    'SOW': 'Sales Order Wizard',
    'SCW': 'Sourcing Wizard',
    'SIW': 'Special Information Wizard',
    'SW': 'Supplier Wizard',
    'AIW_SYSAD': 'System Administrator Interface',
    'AIW_PAUAL': 'PA User Access Loader',
    'AIW_WIP': 'WIP Interface'
  };
  
  return codeMapping[productCode] || `${productCode} Wizard`;
}

/**
 * Extract release date from columns array
 */
function extractReleaseDate(columns) {
  // Look for date pattern in the columns (typically near the end)
  for (let i = columns.length - 1; i >= 0; i--) {
    const col = columns[i];
    // Match dates like "10-Sep-2025", "29-Sep-2020", etc.
    if (col.match(/^\d{1,2}-[A-Za-z]{3}-\d{4}$/)) {
      return convertDateFormat(col);
    }
  }
  return new Date().toISOString().split('T')[0];
}

/**
 * Convert date from "10-Sep-2025" format to "2025-09-10" format
 */
function convertDateFormat(dateStr) {
  try {
    const months = {
      'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
      'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
      'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
    };
    
    const parts = dateStr.split('-');
    const day = parts[0].padStart(2, '0');
    const month = months[parts[1]];
    const year = parts[2];
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    return new Date().toISOString().split('T')[0];
  }
}

/**
 * Update the versionChecker.js file with new version data
 */
function updateVersionFile(newVersions) {
  const versionFilePath = path.join(__dirname, 'versionChecker.js');
  
  try {
    // Read current file
    let fileContent = fs.readFileSync(versionFilePath, 'utf8');
    
    // Create backup
    const backupPath = versionFilePath + '.backup.' + Date.now();
    fs.writeFileSync(backupPath, fileContent);
    
    // Find the latestVersions object
    const startMarker = 'const latestVersions = {';
    const endMarker = '};';
    
    const startIndex = fileContent.indexOf(startMarker);
    const endIndex = fileContent.indexOf(endMarker, startIndex) + endMarker.length;
    
    if (startIndex === -1 || endIndex === -1) {
      throw new Error('Could not find latestVersions object in versionChecker.js');
    }
    
    // Generate new versions object
    const newVersionsObject = generateVersionsObject(newVersions);
    
    // Replace the content
    const newFileContent = 
      fileContent.substring(0, startIndex) + 
      newVersionsObject + 
      fileContent.substring(endIndex);
    
    // Write updated file
    fs.writeFileSync(versionFilePath, newFileContent);
    
    return {
      success: true,
      message: `Updated ${Object.keys(newVersions).length} wizard versions`,
      backupPath: backupPath,
      updatedWizards: Object.keys(newVersions)
    };
    
  } catch (error) {
    throw new Error(`Failed to update version file: ${error.message}`);
  }
}

/**
 * Generate the JavaScript object string for versions
 */
function generateVersionsObject(versions) {
  // Wizards that don't require separate header versions
  const noHeaderRequired = [
    'Budget Wizard',
    'Application Interface Wizard',
    'EAM Work Management Interface',
    'GL Daily Rates Loader',
    'iSupplier User Loader',
    'Job/Position Synchronizer',
    'PA Labor Cost Redistributor',
    'OPM Recipe Formula Loader',
    'Inventory Posting Loader'
  ];

  // Wizards that don't require body versions either (both header and body should be "Not required")
  const noBodyRequired = [
    'Budget Wizard'
  ];
  
  let content = 'const latestVersions = {\n';
  
  Object.keys(versions).forEach(wizardName => {
    const version = versions[wizardName];
    const headerValue = noHeaderRequired.includes(wizardName) ? 'Not required' : version.header;
    const bodyValue = noBodyRequired.includes(wizardName) ? 'Not required' : version.body;
    
    content += `  '${wizardName}': {\n`;
    content += `    header: '${headerValue}',\n`;
    content += `    body: '${bodyValue}',\n`;
    content += `    releaseDate: '${version.releaseDate}',\n`;
    content += `    downloadUrl: '${version.downloadUrl}'\n`;
    content += `  },\n`;
  });
  
  content += '};\n';
  return content;
}

/**
 * Validate version format
 */
function validateVersionFormat(version) {
  if (!version || version === 'required') return false;
  
  // Accept "Not required" as a valid value
  if (version === 'Not required') return true;
  
  // Support various version formats found in More4apps data
  const versionPatterns = [
    /^[0-9]+\.[0-9]+\.[0-9]+$/,        // 1.2.3
    /^[0-9]+\.[0-9]+$/,                // 1.2
    /^[0-9]+\.[0-9]{2}\.[0-9]+$/,      // 3.03.00
    /^[0-9]+\.[0-9]+\.[0-9]{2,3}$/,    // 10.4.39, 1.05.11
    /^[0-9]+\.[0-9]{2}$/,              // 1.00
    /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/ // 1.0.0.0 (rare)
  ];
  
  return versionPatterns.some(pattern => pattern.test(version));
}

/**
 * Update the versionChecker.js file with new version data
 */
async function updateVersionChecker(newVersionData) {
  try {
    const versionCheckerPath = path.join(__dirname, 'versionChecker.js');
    
    // Read the current file
    const currentContent = await fs.readFile(versionCheckerPath, 'utf-8');
    
    // Find the latestVersions object
    const startMarker = 'const latestVersions = {';
    const endMarker = '};';
    
    const startIndex = currentContent.indexOf(startMarker);
    if (startIndex === -1) {
      throw new Error('Could not find latestVersions object in versionChecker.js');
    }
    
    // Find the matching closing brace
    let braceCount = 0;
    let endIndex = -1;
    let inString = false;
    let stringChar = '';
    
    for (let i = startIndex + startMarker.length; i < currentContent.length; i++) {
      const char = currentContent[i];
      
      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar && currentContent[i-1] !== '\\') {
        inString = false;
      } else if (!inString) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          if (braceCount === 0) {
            endIndex = i;
            break;
          }
          braceCount--;
        }
      }
    }
    
    if (endIndex === -1) {
      throw new Error('Could not find closing brace for latestVersions object');
    }
    
    // Generate new latestVersions content
    const timestamp = new Date().toISOString().split('T')[0];
    let newLatestVersions = `const latestVersions = {\n  // Core wizards - Updated automatically on ${timestamp}\n`;
    
    // Sort wizard names alphabetically
    const sortedWizards = Object.keys(newVersionData).sort();
    
    sortedWizards.forEach((wizardName, index) => {
      const data = newVersionData[wizardName];
      newLatestVersions += `  '${wizardName}': {\n`;
      newLatestVersions += `    header: '${data.header}',\n`;
      newLatestVersions += `    body: '${data.body}',\n`;
      newLatestVersions += `    releaseDate: '${data.releaseDate}',\n`;
      newLatestVersions += `    downloadUrl: '${data.downloadUrl}'\n`;
      newLatestVersions += `  }`;
      
      if (index < sortedWizards.length - 1) {
        newLatestVersions += ',';
      }
      newLatestVersions += '\n';
    });
    
    newLatestVersions += '}';
    
    // Replace the latestVersions object in the file content
    const beforeLatestVersions = currentContent.substring(0, startIndex);
    const afterLatestVersions = currentContent.substring(endIndex + 1);
    
    const newContent = beforeLatestVersions + newLatestVersions + afterLatestVersions;
    
    // Check if content actually changed
    if (currentContent === newContent) {
      console.log('No changes detected - version data is already up to date');
      return {
        success: true,
        updatedWizards: 0,
        backupPath: null,
        message: 'No changes detected - version data is already up to date'
      };
    }
    
    // Parse existing version data to compare individual wizards
    let currentVersions = {};
    let changedWizards = [];
    let newWizards = [];
    
    try {
      // Extract current latestVersions object
      const currentLatestVersionsMatch = currentContent.match(/const latestVersions = \{([\s\S]*?)\n\};/);
      if (currentLatestVersionsMatch) {
        // This is a simple approach - we could make it more sophisticated
        // For now, we'll compare the raw content sections
        const currentLatestVersionsContent = currentLatestVersionsMatch[0];
        
        // Compare each wizard in the new data
        Object.keys(newVersionData).forEach(wizardName => {
          const newData = newVersionData[wizardName];
          
          // Check if this wizard exists in current content
          const wizardRegex = new RegExp(`'${wizardName}':\\s*\\{[^}]*\\}`, 's');
          const currentWizardMatch = currentLatestVersionsContent.match(wizardRegex);
          
          if (!currentWizardMatch) {
            newWizards.push(wizardName);
          } else {
            // Check if the version data changed
            const currentWizardData = currentWizardMatch[0];
            const hasHeaderChange = !currentWizardData.includes(`header: '${newData.header}'`);
            const hasBodyChange = !currentWizardData.includes(`body: '${newData.body}'`);
            const hasDateChange = !currentWizardData.includes(`releaseDate: '${newData.releaseDate}'`);
            
            if (hasHeaderChange || hasBodyChange || hasDateChange) {
              changedWizards.push(wizardName);
            }
          }
        });
      }
    } catch (parseError) {
      console.warn('Could not parse current version data for comparison:', parseError.message);
      // Fall back to treating all as changed
      changedWizards = Object.keys(newVersionData);
    }
    
    const totalChanges = changedWizards.length + newWizards.length;
    
    if (totalChanges === 0) {
      console.log('No actual version changes detected - all wizard versions are already current');
      return {
        success: true,
        updatedWizards: 0,
        backupPath: null,
        message: 'No version changes detected - all wizard versions are already current'
      };
    }
    
    // Create backup only if there are actual changes
    const backupPath = `${versionCheckerPath}.backup.${Date.now()}`;
    await fs.writeFile(backupPath, currentContent);
    console.log(`Created backup: ${backupPath}`);
    
    // Write updated content
    await fs.writeFile(versionCheckerPath, newContent);
    
    // Log the changes
    if (newWizards.length > 0) {
      console.log(`Added new wizards: ${newWizards.join(', ')}`);
    }
    if (changedWizards.length > 0) {
      console.log(`Updated existing wizards: ${changedWizards.join(', ')}`);
    }
    console.log('Successfully updated versionChecker.js');
    
    return {
      success: true,
      updatedWizards: totalChanges,
      backupPath,
      newWizards,
      changedWizards,
      message: `Updated ${totalChanges} wizards (${newWizards.length} new, ${changedWizards.length} changed)`
    };
    
  } catch (error) {
    console.error('Error updating versionChecker.js:', error);
    throw error;
  }
}

/**
 * Main function to process extracted data and update version checker
 */
async function updateVersionsFromLightningExtractor(extractedDataPath) {
  try {
    console.log('Reading lightning extractor data from:', extractedDataPath);
    
    // Read the extracted JSON data
    const rawData = await fs.readFile(extractedDataPath, 'utf-8');
    const extractedData = JSON.parse(rawData);
    
    console.log('Lightning extractor data loaded successfully');
    console.log(`Extraction date: ${extractedData.extractedAt}`);
    console.log(`Total products: ${extractedData.totalProducts}`);
    
    // Process the data
    const processedVersions = processLightningExtractorData(extractedData);
    
    console.log(`\nProcessed ${Object.keys(processedVersions).length} wizard versions`);
    
    // Update the version checker
    const result = await updateVersionChecker(processedVersions);
    
    console.log('\n=== UPDATE COMPLETE ===');
    console.log(`Updated ${result.updatedWizards} wizard versions`);
    console.log(`Backup created at: ${result.backupPath}`);
    
    return result;
    
  } catch (error) {
    console.error('Error in updateVersionsFromLightningExtractor:', error);
    throw error;
  }
}

/**
 * CLI interface for lightning extractor updates
 */
async function runLightningExtractorCLI() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help') {
    console.log(`
More4Apps Lightning Extractor Version Updater

Usage:
  node versionUpdater.js <path-to-extracted-data.json>
  node versionUpdater.js --help

Example:
  node versionUpdater.js ./more4apps_catalog.json

Instructions:
1. Go to https://community.more4apps.com/s/ebs-toolbox-downloads
2. Open Developer Tools (F12)
3. Paste and run the lightning table extractor script in the console
4. The script will automatically download a JSON file
5. Run this command with the path to that JSON file

The script will:
- Parse the extracted product data
- Map product codes to wizard names
- Update the versionChecker.js file with latest versions
- Create a backup of the original file
    `);
    return;
  }
  
  const extractedDataPath = args[0];
  
  try {
    await updateVersionsFromLightningExtractor(extractedDataPath);
    console.log('\nVersion update completed successfully!');
  } catch (error) {
    console.error('\nFailed to update versions:', error.message);
    process.exit(1);
  }
}

module.exports = {
  parseVersionData,
  updateVersionFile,
  validateVersionFormat,
  processJsonVersions,
  parseHtmlVersions,
  parseCsvVersions,
  parseTextVersions,
  isNewlineSeparatedData,
  parseNewlineSeparatedData,
  // New lightning extractor functions
  processLightningExtractorData,
  updateVersionChecker,
  updateVersionsFromLightningExtractor,
  runLightningExtractorCLI
};

// Run CLI if this file is executed directly
if (require.main === module) {
  runLightningExtractorCLI();
}