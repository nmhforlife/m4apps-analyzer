// Script to automatically update latestVersions in versionChecker.js from More4apps endpoint
const fs = require('fs');
const path = require('path');
// const fetch = require('node-fetch'); // Removed - using built-in fetch (Node 18+)

const VERSION_CHECKER_PATH = path.join(__dirname, 'versionChecker.js');
const ENDPOINT = 'https://horizon.more4apps.com/ords/horizon/product/release';

function readExistingLatestVersions() {
  const file = fs.readFileSync(VERSION_CHECKER_PATH, 'utf-8');
  const start = file.indexOf('const latestVersions = ');
  if (start === -1) {
    return {};
  }

  const objectStart = start + 'const latestVersions = '.length;
  const objectEnd = file.indexOf('};', objectStart);
  if (objectEnd === -1) {
    return {};
  }

  const objectText = file.substring(objectStart, objectEnd + 1);
  try {
    return JSON.parse(objectText);
  } catch (error) {
    console.warn('Could not parse existing latestVersions. Falling back to empty overrides.');
    return {};
  }
}

async function fetchLatestVersions() {
  console.log('Fetching latest versions from:', ENDPOINT);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const response = await fetch(ENDPOINT, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; M4APS-Analyzer/1.0)'
      }
    });
    clearTimeout(timeoutId);
    console.log('Fetch response status:', response.status);
    if (!response.ok) throw new Error(`Failed to fetch More4apps version data: ${response.status} ${response.statusText}`);
    const json = await response.json();
    console.log('Fetched', json.items?.length || 0, 'items');
    return json.items;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out after 10 seconds');
    }
    throw error;
  }
}

function buildLatestVersionsObject(items) {
  const obj = {};
  items.forEach(item => {
    if (item.name && item.tag_template) {
      let keyName = item.name;
      if (keyName === 'Supplier Wizard (R12)') {
        keyName = 'Supplier Wizard';
      }
      obj[keyName] = {
        header: item.tag_pkg_header || item.tag_template || 'Unknown',
        body: item.tag_pkg_body || item.tag_template || 'Unknown',
        minBodyVersion: item.min_pkg_version || item.tag_pkg_body || item.tag_template || 'Unknown',
        releaseDate: item.release_date || '',
        downloadUrl: 'https://community.more4apps.com/s/ebs-toolbox-downloads',
        code: item.code || ''
      };
    }
  });
  return obj;
}

function applyOverrides(latestVersionsObj, existingVersions) {
  const merged = { ...latestVersionsObj };

  if (merged['Wizard Infrastructure for R12 (XML package and servlet)'] && !merged['Wizard Infrastructure for R12 (XML package)']) {
    merged['Wizard Infrastructure for R12 (XML package)'] = merged['Wizard Infrastructure for R12 (XML package and servlet)'];
  }
  delete merged['Wizard Infrastructure for R12 (XML package and servlet)'];

  if (existingVersions['Wizard Infrastructure for R12 (XML package)']) {
    merged['Wizard Infrastructure for R12 (XML package)'] = existingVersions['Wizard Infrastructure for R12 (XML package)'];
  }

  if (existingVersions['More4apps Servlet']) {
    merged['More4apps Servlet'] = existingVersions['More4apps Servlet'];
  }

  return merged;
}

function updateVersionCheckerFile(latestVersionsObj) {
  const file = fs.readFileSync(VERSION_CHECKER_PATH, 'utf-8');
  const start = file.indexOf('const latestVersions = {');
  if (start === -1) throw new Error('Could not find latestVersions object in versionChecker.js');
  const before = file.substring(0, start);
  const after = file.substring(file.indexOf('};', start) + 2);
  const latestVersionsStr = JSON.stringify(latestVersionsObj, null, 2);
  const newContent = `${before}const latestVersions = ${latestVersionsStr};${after}`;
  fs.writeFileSync(VERSION_CHECKER_PATH, newContent, 'utf-8');
}

(async () => {
  try {
    const items = await fetchLatestVersions();
    const latestVersionsObj = buildLatestVersionsObject(items);
    const existingVersions = readExistingLatestVersions();
    const mergedVersions = applyOverrides(latestVersionsObj, existingVersions);
    updateVersionCheckerFile(mergedVersions);
    console.log('versionChecker.js updated successfully!');
  } catch (err) {
    console.error('Error updating versionChecker.js:', err);
    throw err; // Re-throw so the caller can handle it
  }
})();
