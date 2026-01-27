// Script to add minBodyVersion to existing entries in versionChecker.js
const fs = require('path');

// Load the catalog data  
const catalogData = require('./more4apps_catalog (5).json');

// Create mapping from product name to minBodyVersion
const minVersionMap = {};
catalogData.products.forEach(product => {
  const minBodyVersion = product.minBodyVersion || 'Not required';
  const finalMinBodyVersion = minBodyVersion === '' ? 'Not required' : minBodyVersion;
  minVersionMap[product.productName] = finalMinBodyVersion;
});

console.log('Minimum Body Version mappings:');
Object.entries(minVersionMap).forEach(([name, version]) => {
  console.log(`'${name}': '${version}'`);
});

console.log('\n=== Missing minBodyVersion entries to add ===');
console.log("Replace each wizard entry by adding minBodyVersion field:");

Object.entries(minVersionMap).forEach(([name, minVersion]) => {
  console.log(`\n'${name}': {`);
  console.log(`  body: 'existing_value',`);
  console.log(`  minBodyVersion: '${minVersion}',`);
  console.log(`  releaseDate: 'existing_date',`);
  console.log(`  downloadUrl: 'existing_url'`);
  console.log(`},`);
});