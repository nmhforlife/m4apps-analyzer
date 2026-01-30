const fs = require('fs/promises');
const path = require('path');

const PRODUCT_MAP_PATH = path.join(__dirname, '..', 'data', 'productIdMap.json');
const HISTORY_PATH = path.join(__dirname, '..', 'data', 'productHistory.json');
const BASE_URL = 'https://horizon.more4apps.com/ords/hzadmin.m4a_website_pkg.prod_rn?p_id={productId}';

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

async function writeJson(filePath, data) {
  const content = JSON.stringify(data, null, 2);
  await fs.writeFile(filePath, content, 'utf8');
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim();
}

function extractVersion(text) {
  const match = text.match(/\b\d+(?:\.\d+){1,}\b/);
  return match ? match[0] : null;
}

function extractDate(text) {
  const match = text.match(/\b\d{1,2}[-\s][A-Za-z]{3}[-\s]\d{2,4}\b/);
  return match ? match[0] : null;
}

function parseReleaseHistory(html) {
  const rows = [];
  const seen = new Set();

  const headingPattern = /###\s*([0-9]+(?:\.[0-9]+)+)\s*\(([^)]+)\)/g;
  let headingMatch;
  while ((headingMatch = headingPattern.exec(html)) !== null) {
    const version = headingMatch[1];
    const releaseDate = headingMatch[2];
    const key = `${version}::${releaseDate}`;
    if (seen.has(key)) {
      continue;
    }

    rows.push({
      version,
      releaseDate,
      raw: normalizeWhitespace(headingMatch[0])
    });
    seen.add(key);
  }

  if (rows.length > 0) {
    return rows;
  }

  const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;
  while ((rowMatch = rowPattern.exec(html)) !== null) {
    const rowText = normalizeWhitespace(rowMatch[1].replace(/<[^>]*>/g, ' '));
    const version = extractVersion(rowText);
    const releaseDate = extractDate(rowText);
    if (!version || !releaseDate) {
      continue;
    }

    const key = `${version}::${releaseDate}`;
    if (seen.has(key)) {
      continue;
    }

    rows.push({
      version,
      releaseDate,
      raw: rowText
    });
    seen.add(key);
  }

  const fallbackPattern = /(\d+(?:\.\d+){1,}).{0,40}?(\d{1,2}[-\s][A-Za-z]{3}[-\s]\d{2,4})/g;
  let fallbackMatch;
  while ((fallbackMatch = fallbackPattern.exec(html)) !== null) {
    const version = fallbackMatch[1];
    const releaseDate = fallbackMatch[2];
    const key = `${version}::${releaseDate}`;
    if (seen.has(key)) {
      continue;
    }

    rows.push({
      version,
      releaseDate,
      raw: normalizeWhitespace(fallbackMatch[0])
    });
    seen.add(key);
  }

  return rows;
}

async function fetchProductHistory(productId) {
  const url = BASE_URL.replace('{productId}', productId);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url} (status ${response.status})`);
  }

  const html = await response.text();
  const versions = parseReleaseHistory(html);
  return { url, versions };
}

async function updateProductHistory() {
  console.log('[history] Loading product map and history...');
  const productMap = await readJson(PRODUCT_MAP_PATH);
  const history = await readJson(HISTORY_PATH);

  const productIds = Object.keys(productMap || {});
  console.log(`[history] Found ${productIds.length} product IDs to update.`);

  if (productIds.length === 0) {
    console.warn('[history] No product IDs found. Skipping history update.');
    return;
  }

  const updatedProducts = { ...history.products };

  const concurrencyLimit = 5;
  let index = 0;

  async function worker() {
    while (index < productIds.length) {
      const currentIndex = index;
      index += 1;

      const productId = productIds[currentIndex];
      const productInfo = productMap[productId];
      try {
        const { url, versions } = await fetchProductHistory(productId);
        updatedProducts[productId] = {
          name: productInfo.name,
          code: productInfo.code,
          sourceUrl: url,
          fetchedAt: new Date().toISOString(),
          versions
        };
        console.log(`[history] Fetched ${productId} (${productInfo.name}): ${versions.length} version(s)`);
      } catch (error) {
        updatedProducts[productId] = {
          name: productInfo.name,
          code: productInfo.code,
          sourceUrl: BASE_URL.replace('{productId}', productId),
          fetchedAt: new Date().toISOString(),
          versions: [],
          error: error.message
        };
        console.error(`[history] Failed ${productId} (${productInfo.name}): ${error.message}`);
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrencyLimit, productIds.length) }, () => worker());
  await Promise.all(workers);

  const updatedHistory = {
    ...history,
    source: BASE_URL,
    lastUpdated: new Date().toISOString(),
    products: updatedProducts
  };

  await writeJson(HISTORY_PATH, updatedHistory);
  console.log('[history] Product history saved.');
}

module.exports = {
  updateProductHistory
};

if (require.main === module) {
  updateProductHistory().catch(error => {
    console.error('Failed to update product history:', error);
    process.exitCode = 1;
  });
}
