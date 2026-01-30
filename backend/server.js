const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

const catalogParser = require('./utils/catalogParser');
const AnalysisEngine = require('./utils/analysisEngine');
const versionUpdater = require('./utils/versionUpdater');
const webScraper = require('./utils/webScraper');
const { updateProductHistory } = require('./utils/updateProductHistory');

let productHistoryUpdateInProgress = false;

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for rate limiting (fixes X-Forwarded-For header issues)
app.set('trust proxy', 1);


// Allow Referer from any path under localhost:3000
app.use((req, res, next) => {
  const referer = req.headers['referer'];
  if (referer && referer.startsWith('http://localhost:3000')) {
    // Accept request
    return next();
  }
  // If no referer or not from localhost:3000, still allow (for flexibility)
  return next();
});

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// CORS configuration - Allow all origins during development
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : true, // Allow all origins during development
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow text files
    if (file.mimetype === 'text/plain' || file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Only .txt files are allowed'), false);
    }
  }
});

// Routes
// Route to trigger updateVersionChecker.js script
const { exec } = require('child_process');
app.post('/api/update-latest-versions', async (req, res) => {
  console.log('Starting version update process...');

  try {
    // Run the update script as a child process with timeout
    await new Promise((resolve, reject) => {
      const child = exec('node ./utils/updateVersionChecker.js', { timeout: 30000 }, (error, stdout, stderr) => {
        if (error) {
          console.error('Version update error:', error);
          reject(error);
          return;
        }
        console.log('Version update process completed successfully');
        console.log('stdout:', stdout);
        resolve({ stdout, stderr });
      });
    });

    res.json({ success: true, message: 'Version update completed successfully' });
  } catch (error) {
    console.error('Version update failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
// Proxy More4apps version data to avoid CORS issues
// Proxy client license info to avoid CORS issues
app.get('/api/client-license/:code', async (req, res) => {
  const clientCode = req.params.code;
  if (!clientCode) return res.status(400).json({ error: 'Missing client code' });
  try {
    let allItems = [];
    let offset = 0;
    let hasMore = true;
    let limit = 200; // Use a high limit if supported, else default to 25
    while (hasMore) {
      const url = `https://horizon.more4apps.com/ords/horizon/keys/latest/${clientCode}?offset=${offset}&limit=${limit}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch license info');
      const data = await response.json();
      if (Array.isArray(data.items)) {
        allItems = allItems.concat(data.items);
      }
      hasMore = data.hasMore === true && data.items && data.items.length > 0;
      offset += limit;
    }
    // Return all items in the same format as original, but with all items
    res.json({ ...allItems.length ? { items: allItems } : {}, ...(!allItems.length ? { error: 'No license items found' } : {}) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// const fetch = require('node-fetch');
app.get('/api/more4apps-versions', async (req, res) => {
  try {
    const response = await fetch('https://horizon.more4apps.com/ords/horizon/product/release');
    if (!response.ok) throw new Error('Failed to fetch More4apps version data');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const handleCatalogUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('[upload] Catalog upload received.');

    const fileContent = req.file.buffer.toString('utf-8');
    const filename = req.file.originalname;

    setImmediate(() => {
      console.log('[history] Queueing product history update...');
      if (productHistoryUpdateInProgress) {
        console.warn('Product history update already in progress. Skipping new request.');
        return;
      }

      productHistoryUpdateInProgress = true;
      console.log('Starting product history update...');
      updateProductHistory()
        .then(() => {
          console.log('Product history update completed successfully.');
        })
        .catch(historyError => {
          console.error('Product history update failed:', historyError);
        })
        .finally(() => {
          productHistoryUpdateInProgress = false;
        });
    });

    // Parse the catalog file
    const parsedData = catalogParser.parse(fileContent, filename);
    
    // Run analysis
    const analysis = AnalysisEngine.analyze(parsedData);

    // Create catalog object for persistent storage
    const catalogId = Date.now();
    const catalogData = {
      id: catalogId,
      filename,
      data: parsedData,
      analysis,
      uploadTimestamp: new Date().toISOString(),
      lastAnalyzed: new Date().toISOString()
    };

    // Save catalog to persistent storage
    const catalogsFile = path.join(__dirname, 'data', 'catalogs.json');
    let catalogs = [];
    
    // Read existing catalogs
    if (fsSync.existsSync(catalogsFile)) {
      try {
        catalogs = JSON.parse(fsSync.readFileSync(catalogsFile, 'utf8'));
      } catch (error) {
        console.warn('Error reading catalogs file, creating new one:', error);
        catalogs = [];
      }
    }
    
    // Add new catalog (keep only last 10 catalogs to prevent file from growing too large)
    catalogs.push(catalogData);
    catalogs = catalogs.slice(-10);
    
    // Save updated catalogs
    try {
      fsSync.writeFileSync(catalogsFile, JSON.stringify(catalogs, null, 2));
    } catch (error) {
      console.error('Error saving catalog to file:', error);
      // Continue anyway - the analysis still works without persistence
    }

    res.json({
      success: true,
      data: {
        id: catalogId,
        ...parsedData,
        analysis,
        uploadTimestamp: catalogData.uploadTimestamp,
        filename
      }
    });

  } catch (error) {
    console.error('Error processing catalog file:', error);
    res.status(500).json({ 
      error: 'Failed to process catalog file', 
      details: error.message 
    });
  }
};

// Upload and parse catalog file
app.post('/api/catalog/upload', upload.single('catalogFile'), handleCatalogUpload);
app.post('/catalog/upload', upload.single('catalogFile'), handleCatalogUpload);

// Get recommendations for a specific catalog
app.post('/api/catalog/recommendations', async (req, res) => {
  try {
    const { catalogData } = req.body;
    
    if (!catalogData) {
      return res.status(400).json({ error: 'Catalog data required' });
    }

    const recommendations = AnalysisEngine.getRecommendations(catalogData);
    
    res.json({
      success: true,
      recommendations
    });

  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ 
      error: 'Failed to generate recommendations', 
      details: error.message 
    });
  }
});

// Get version compatibility matrix
app.get('/api/version-matrix', async (req, res) => {
  try {
    const versionMatrix = AnalysisEngine.getVersionMatrix();
    res.json({
      success: true,
      versionMatrix
    });
  } catch (error) {
    console.error('Error getting version matrix:', error);
    res.status(500).json({ 
      error: 'Failed to get version matrix', 
      details: error.message 
    });
  }
});

// Update version data endpoint
app.post('/api/update-versions', async (req, res) => {
  try {
    const { data, format = 'auto' } = req.body;
    
    if (!data) {
      return res.status(400).json({ 
        error: 'No data provided', 
        message: 'Please provide version data to import' 
      });
    }
    
    // Parse the version data
    const parsedVersions = versionUpdater.parseVersionData(data, format);
    
    if (Object.keys(parsedVersions).length === 0) {
      return res.status(400).json({ 
        error: 'No valid version data found', 
        message: 'Could not parse any wizard versions from the provided data' 
      });
    }
    
    // Validate versions
    const invalidVersions = [];
    Object.keys(parsedVersions).forEach(wizardName => {
      const version = parsedVersions[wizardName];
      if (!versionUpdater.validateVersionFormat(version.header)) {
        invalidVersions.push(`${wizardName} header: ${version.header}`);
      }
      if (!versionUpdater.validateVersionFormat(version.body)) {
        invalidVersions.push(`${wizardName} body: ${version.body}`);
      }
    });
    
    if (invalidVersions.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid version formats found', 
        invalidVersions,
        message: 'Version numbers must be in format X.Y.Z (e.g., 3.4.16) or "Not required"' 
      });
    }
    
    // Update the version file
    const updateResult = versionUpdater.updateVersionFile(parsedVersions);
    
    // Automatically refresh all catalog analyses with updated version data
    try {
      const catalogsFile = path.join(__dirname, 'data', 'catalogs.json');
      if (fsSync.existsSync(catalogsFile)) {
        let catalogs = JSON.parse(fsSync.readFileSync(catalogsFile, 'utf8'));
        let updatedCount = 0;
        
        catalogs.forEach(catalog => {
          try {
            catalog.analysis = AnalysisEngine.analyze(catalog.data);
            catalog.lastAnalyzed = new Date().toISOString();
            updatedCount++;
          } catch (error) {
            console.error(`Error refreshing analysis for catalog ${catalog.id}:`, error);
          }
        });
        
        if (updatedCount > 0) {
          fsSync.writeFileSync(catalogsFile, JSON.stringify(catalogs, null, 2));
          console.log(`Automatically refreshed analysis for ${updatedCount} catalogs after version update`);
        }
      }
    } catch (error) {
      console.error('Error auto-refreshing catalog analyses:', error);
      // Don't fail the version update if refresh fails
    }
    
    res.json({
      success: true,
      message: updateResult.message,
      updatedWizards: updateResult.updatedWizards,
      backupPath: updateResult.backupPath,
      totalUpdated: Object.keys(parsedVersions).length,
      catalogsRefreshed: true
    });
    
  } catch (error) {
    console.error('Error updating versions:', error);
    res.status(500).json({ 
      error: 'Failed to update versions', 
      details: error.message 
    });
  }
});

// Get current version data endpoint
app.get('/api/get-current-versions', async (req, res) => {
  try {
    // Import the current latestVersions from versionChecker
    delete require.cache[require.resolve('./utils/versionChecker')];
    const { latestVersions } = require('./utils/versionChecker');
    
    res.json({
      success: true,
      versions: latestVersions
    });
  } catch (error) {
    console.error('Error getting current versions:', error);
    res.status(500).json({ 
      error: 'Failed to get current versions', 
      details: error.message 
    });
  }
});

// Manual version update endpoint (for direct version object updates)
app.post('/api/manual-update-versions', async (req, res) => {
  try {
    const { versions } = req.body;
    
    if (!versions || typeof versions !== 'object') {
      return res.status(400).json({ 
        error: 'Invalid data format', 
        message: 'Please provide versions as an object' 
      });
    }
    
    // Validate version formats
    const invalidVersions = [];
    Object.keys(versions).forEach(wizardName => {
      const version = versions[wizardName];
      if (version.header && version.header !== 'Not required' && version.header !== 'Unknown' && 
          !version.header.match(/^\d+\.\d+(\.\d+)?$/)) {
        invalidVersions.push(`${wizardName} header: ${version.header}`);
      }
      if (version.body && version.body !== 'Not required' && version.body !== 'Unknown' &&
          !version.body.match(/^\d+\.\d+(\.\d+)?$/)) {
        invalidVersions.push(`${wizardName} body: ${version.body}`);
      }
    });
    
    if (invalidVersions.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid version formats found', 
        invalidVersions,
        message: 'Version numbers must be in format X.Y.Z (e.g., 3.4.16) or "Not required"' 
      });
    }
    
    // Create backup of current version file
    const versionCheckerPath = path.join(__dirname, 'utils', 'versionChecker.js');
    const backupPath = `${versionCheckerPath}.backup.${Date.now()}`;
    
    try {
      await fs.copyFile(versionCheckerPath, backupPath);
    } catch (error) {
      console.error('Failed to create backup:', error);
      return res.status(500).json({ 
        error: 'Failed to create backup before updating versions',
        details: error.message 
      });
    }
    
    // Read and update the version checker file
    try {
      let fileContent = await fs.readFile(versionCheckerPath, 'utf8');
      
      // Update each wizard in the latestVersions object
      Object.keys(versions).forEach(wizardName => {
        const version = versions[wizardName];
        const escapedWizardName = wizardName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        // Find and replace the wizard's version block
        const wizardRegex = new RegExp(
          `('${escapedWizardName}'\\s*:\\s*{[^}]*})`,
          'g'
        );
        
        const newVersionBlock = `'${wizardName}': {
    header: '${version.header || 'Not required'}',
    body: '${version.body || 'Not required'}',
    releaseDate: '${version.releaseDate || new Date().toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'}).replace(/ /g, '-')}',
    downloadUrl: 'https://community.more4apps.com/s/ebs-toolbox-downloads'
  }`;
        
        fileContent = fileContent.replace(wizardRegex, newVersionBlock);
      });
      
      // Write the updated file
      await fs.writeFile(versionCheckerPath, fileContent, 'utf8');
      
    } catch (error) {
      // Restore from backup if update failed
      try {
        await fs.copyFile(backupPath, versionCheckerPath);
      } catch (restoreError) {
        console.error('Failed to restore from backup:', restoreError);
      }
      throw error;
    }
    
    res.json({
      success: true,
      message: 'Version information updated successfully',
      updatedWizards: Object.keys(versions),
      backupPath: backupPath,
      totalUpdated: Object.keys(versions).length
    });
    
  } catch (error) {
    console.error('Error manually updating versions:', error);
    res.status(500).json({ 
      error: 'Failed to update versions manually', 
      details: error.message 
    });
  }
});

// Preview version data endpoint (parse without updating)
app.post('/api/parse-versions', async (req, res) => {
  try {
    const { data, format = 'auto' } = req.body;
    
    console.log('=== PARSE-VERSIONS DEBUG ===');
    console.log('Data received length:', data ? data.length : 'null');
    console.log('Data contains tabs:', data ? data.includes('\t') : 'null');
    console.log('Data contains newlines:', data ? data.includes('\n') : 'null');
    console.log('First 200 chars:', data ? data.substring(0, 200) : 'null');
    console.log('Format:', format);
    console.log('========================');
    
    if (!data) {
      return res.status(400).json({ 
        error: 'No data provided', 
        message: 'Please provide version data to preview' 
      });
    }
    
    // Parse the version data
    const parsedVersions = versionUpdater.parseVersionData(data, format);
    
    if (Object.keys(parsedVersions).length === 0) {
      return res.status(400).json({ 
        error: 'No valid version data found', 
        message: 'Could not parse any wizard versions from the provided data' 
      });
    }
    
    // Validate versions
    const invalidVersions = [];
    const validVersions = {};
    
    Object.keys(parsedVersions).forEach(wizardName => {
      const version = parsedVersions[wizardName];
      if (versionUpdater.validateVersionFormat(version.header) && 
          versionUpdater.validateVersionFormat(version.body)) {
        validVersions[wizardName] = version;
      } else {
        if (!versionUpdater.validateVersionFormat(version.header)) {
          invalidVersions.push(`${wizardName}: ${version.header}`);
        }
        if (!versionUpdater.validateVersionFormat(version.body)) {
          invalidVersions.push(`${wizardName}: ${version.body}`);
        }
      }
    });
    
    res.json({
      success: true,
      versions: validVersions,
      totalFound: Object.keys(parsedVersions).length,
      totalValid: Object.keys(validVersions).length,
      invalidVersions: invalidVersions.length > 0 ? invalidVersions : undefined
    });
    
  } catch (error) {
    console.error('Error parsing versions:', error);
    res.status(500).json({ 
      error: 'Failed to parse versions', 
      details: error.message 
    });
  }
});

// Get current version data endpoint
app.get('/api/current-versions', async (req, res) => {
  try {
    const { latestVersions } = require('./utils/versionChecker');
    res.json({
      success: true,
      versions: latestVersions,
      totalWizards: Object.keys(latestVersions).length
    });
  } catch (error) {
    console.error('Error getting current versions:', error);
    res.status(500).json({ 
      error: 'Failed to get current versions', 
      details: error.message 
    });
  }
});

// Get browser script for manual scraping
app.get('/api/browser-script', async (req, res) => {
  try {
    const script = webScraper.generateBrowserScript();
    res.json({
      success: true,
      script: script,
      instructions: [
        '1. Open the More4apps community downloads page in your browser',
        '2. Open browser developer tools (F12)',
        '3. Go to the Console tab',
        '4. Paste and run this script',
        '5. Copy the formatted output and import it using the Version Importer'
      ]
    });
  } catch (error) {
    console.error('Error generating browser script:', error);
    res.status(500).json({ 
      error: 'Failed to generate browser script', 
      details: error.message 
    });
  }
});

// Lightning extractor version update endpoint
app.post('/api/update-versions-from-extractor', async (req, res) => {
  try {
    const { extractedData } = req.body;
    
    console.log('=== LIGHTNING EXTRACTOR VERSION UPDATE ===');
    
    if (!extractedData) {
      return res.status(400).json({ 
        success: false, 
        error: 'No extracted data provided' 
      });
    }

    // Validate the extracted data structure
    if (!extractedData.products || !Array.isArray(extractedData.products)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid data format. Expected object with products array.' 
      });
    }

    console.log(`Processing ${extractedData.products.length} products from lightning extractor...`);

    // Process the lightning extractor data
    const processedVersions = versionUpdater.processLightningExtractorData(extractedData);
    
    console.log(`Processed ${Object.keys(processedVersions).length} wizard versions`);

    // Update the version checker
    const result = await versionUpdater.updateVersionChecker(processedVersions);
    
    console.log('Version checker updated successfully');
    console.log(`Updated ${result.updatedWizards} wizard versions`);

    res.json({
      success: true,
      message: result.message || `Successfully updated ${result.updatedWizards} wizard versions`,
      updatedCount: result.updatedWizards,
      backupPath: result.backupPath,
      newWizards: result.newWizards || [],
      changedWizards: result.changedWizards || [],
      extractedAt: extractedData.extractedAt,
      totalProducts: extractedData.totalProducts,
      noChangesDetected: result.updatedWizards === 0
    });

  } catch (error) {
    console.error('Lightning extractor version update failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update versions from lightning extractor data', 
      details: error.message 
    });
  }
});

// Generate lightning extractor script for browser
app.get('/api/lightning-extractor-script', async (req, res) => {
  try {
    // Read the lightning table extractor script
    const scriptPath = path.join(__dirname, '..', '..', 'lightning-table-extractor.js');
    const scriptContent = await fs.readFile(scriptPath, 'utf-8');
    
    // Add instructions for automated updating
    const instructions = `
/**
 * AUTOMATED VERSION UPDATE INSTRUCTIONS
 * ====================================
 * 
 * 1. Navigate to: https://community.more4apps.com/s/ebs-toolbox-downloads
 * 2. Open Developer Tools (F12)
 * 3. Paste this entire script in the console and press Enter
 * 4. Wait for the extraction to complete and JSON file to download
 * 5. Return to your dashboard and use the "Update from Lightning Extractor" button
 * 6. Upload or paste the extracted JSON data
 * 
 * The script will automatically extract all product version data and your dashboard
 * will update the version checker with the latest information.
 */

${scriptContent}

// Additional instructions after extraction
console.log('%c=== EXTRACTION COMPLETE ===', 'color: green; font-weight: bold; font-size: 16px;');
console.log('%cNext steps:', 'color: blue; font-weight: bold;');
console.log('1. Check your Downloads folder for more4apps_catalog.json');
console.log('2. Return to your More4Apps Dashboard');
console.log('3. Click "Update from Lightning Extractor" button');
console.log('4. Upload the JSON file or paste the data');
console.log('%cThis will automatically update all version information!', 'color: green;');
`;

    res.json({
      success: true,
      script: instructions
    });

  } catch (error) {
    console.error('Failed to generate lightning extractor script:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate lightning extractor script', 
      details: error.message 
    });
  }
});

// Test parser endpoint for debugging
app.post('/api/test-parser', async (req, res) => {
  try {
    const { data } = req.body;
    
    console.log('=== TEST-PARSER DEBUG ===');
    console.log('Data received length:', data ? data.length : 'null');
    console.log('Data contains tabs:', data ? data.includes('\t') : 'null');
    console.log('Data contains newlines:', data ? data.includes('\n') : 'null');
    console.log('Lines count:', data ? data.split('\n').length : 'null');
    console.log('First 300 chars:', data ? data.substring(0, 300) : 'null');
    console.log('Raw bytes of first line:', data ? Buffer.from(data.split('\n')[0]).toString('hex') : 'null');
    console.log('====================');
    
    if (!data) {
      return res.status(400).json({ error: 'No data provided' });
    }
    
    const result = versionUpdater.parseVersionData(data, 'text');
    
    res.json({
      success: true,
      parsedCount: Object.keys(result).length,
      parsedVersions: result,
      sampleEntries: Object.keys(result).slice(0, 5).map(key => ({
        wizard: key,
        version: result[key]
      }))
    });
  } catch (error) {
    console.error('Parser test error:', error);
    res.status(500).json({ 
      error: 'Parser test failed', 
      details: error.message 
    });
  }
});

// Get catalog data by ID
app.get('/api/catalog/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Catalog ID is required' });
    }

    // Read the existing catalog data
    const catalogsFile = path.join(__dirname, 'data', 'catalogs.json');
    let catalogs = [];
    
    if (fsSync.existsSync(catalogsFile)) {
      catalogs = JSON.parse(fsSync.readFileSync(catalogsFile, 'utf8'));
    }
    
    const catalog = catalogs.find(cat => cat.id === parseInt(id));
    if (!catalog) {
      return res.status(404).json({ error: 'Catalog not found' });
    }
    
    res.json({
      success: true,
      data: {
        id: catalog.id,
        ...catalog.data,
        analysis: catalog.analysis,
        uploadTimestamp: catalog.uploadTimestamp,
        lastAnalyzed: catalog.lastAnalyzed,
        filename: catalog.filename
      }
    });
    
  } catch (error) {
    console.error('Error getting catalog:', error);
    res.status(500).json({ 
      error: 'Failed to get catalog', 
      details: error.message 
    });
  }
});

// Refresh analysis for existing catalogs
app.post('/api/catalog/refresh-analysis', async (req, res) => {
  try {
    const { catalogId } = req.body;
    
    if (!catalogId) {
      return res.status(400).json({ error: 'Catalog ID is required' });
    }

    // Read the existing catalog data
    const catalogsFile = path.join(__dirname, 'data', 'catalogs.json');
    let catalogs = [];
    
    if (fsSync.existsSync(catalogsFile)) {
      catalogs = JSON.parse(fsSync.readFileSync(catalogsFile, 'utf8'));
    }
    
    const catalogIndex = catalogs.findIndex(cat => cat.id === parseInt(catalogId));
    if (catalogIndex === -1) {
      return res.status(404).json({ error: 'Catalog not found' });
    }
    
    const catalog = catalogs[catalogIndex];
    
    // Re-run the analysis with current version data
    const updatedAnalysis = AnalysisEngine.analyze(catalog.data);
    
    // Update the catalog with new analysis
    catalog.analysis = updatedAnalysis;
    catalog.lastAnalyzed = new Date().toISOString();
    
    // Save updated catalog
    catalogs[catalogIndex] = catalog;
    fsSync.writeFileSync(catalogsFile, JSON.stringify(catalogs, null, 2));
    
    console.log(`Refreshed analysis for catalog ${catalogId}`);
    
    res.json({
      success: true,
      message: 'Analysis refreshed successfully',
      catalogId: catalogId,
      analysisTimestamp: catalog.lastAnalyzed
    });
    
  } catch (error) {
    console.error('Error refreshing analysis:', error);
    res.status(500).json({ 
      error: 'Failed to refresh analysis', 
      details: error.message 
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
  }
  
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;