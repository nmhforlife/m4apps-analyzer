// Script to update versionChecker.js with minBodyVersion data
const fs = require('fs');
const path = require('path');

// Load the catalog data
const catalogData = require('./more4apps_catalog (5).json');

// Create the updated latestVersions object
const updatedVersions = {};

catalogData.products.forEach(product => {
  const wizardName = product.productName;
  const bodyVersion = product.bodyVersion || 'Not required';
  const minBodyVersion = product.minBodyVersion || 'Not required';
  const releaseDate = product.releaseDate;
  
  // Handle empty body versions for loaders
  const finalBodyVersion = bodyVersion === '' ? 'Not required' : bodyVersion;
  const finalMinBodyVersion = minBodyVersion === '' ? 'Not required' : minBodyVersion;
  
  updatedVersions[wizardName] = {
    body: finalBodyVersion,
    minBodyVersion: finalMinBodyVersion,
    releaseDate: releaseDate,
    downloadUrl: 'https://community.more4apps.com/s/ebs-toolbox-downloads'
  };
});

// Generate the JavaScript code for the latestVersions object
let jsCode = '// Latest available versions from More4apps community site (Updated October 2025)\nconst latestVersions = {\n';

Object.entries(updatedVersions).forEach(([wizardName, versionInfo], index, array) => {
  jsCode += `  '${wizardName}': {\n`;
  jsCode += `    body: '${versionInfo.body}',\n`;
  jsCode += `    minBodyVersion: '${versionInfo.minBodyVersion}',\n`;
  jsCode += `    releaseDate: '${versionInfo.releaseDate}',\n`;
  jsCode += `    downloadUrl: '${versionInfo.downloadUrl}'\n`;
  jsCode += `  }${index < array.length - 1 ? ',' : ''}\n`;
});

jsCode += '};\n';

console.log('Updated latestVersions object:');
console.log(jsCode);

// Also save to file for easy copying
fs.writeFileSync('updated-versions.js', jsCode);
console.log('\nSaved to updated-versions.js file');

console.log(`\nTotal products updated: ${Object.keys(updatedVersions).length}`);