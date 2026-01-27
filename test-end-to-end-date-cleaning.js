// Test the end-to-end flow with simulated catalog data that includes dates
const fs = require('fs');
const path = require('path');

// Simulate backend analysis with date-containing versions
const analysisEngine = require('./backend/utils/analysisEngine');

console.log('Testing End-to-End Date Removal');
console.log('='.repeat(40));

// Create sample catalog data that includes dates like real catalog
const sampleCatalogWithDates = {
  catalogInfo: {
    instance: 'TEST',
    release: '12.2.10'
  },
  m4apsPackages: [
    {
      packageName: 'APPS.M4APS_PAYINVWIZARD',
      header: '3.1.0 14-Jan-25',
      body: '3.7.0 16-Apr-25',
      headerStatus: 'VALID',
      bodyStatus: 'VALID'
    },
    {
      packageName: 'APPS.M4APS_RECEIPTWIZARD', 
      header: '2.1.9 13 Mar 2019',
      body: '2.1.9 13 Mar 2019',
      headerStatus: 'VALID',
      bodyStatus: 'VALID'
    },
    {
      packageName: 'APPS.M4APS_SUPPLIERWIZARD2',
      header: '2.1.03 04-Apr-18',
      body: '2.1.46 04-Apr-25',
      headerStatus: 'VALID',
      bodyStatus: 'VALID'
    }
  ]
};

console.log('\n1. INPUT DATA WITH DATES:');
console.log('=========================');
sampleCatalogWithDates.m4apsPackages.forEach(pkg => {
  console.log(`${pkg.packageName}:`);
  console.log(`  Body version with date: "${pkg.body}"`);
});

console.log('\n2. AFTER VERSION ANALYSIS:');
console.log('==========================');

try {
  const versionAnalysis = analysisEngine.analyzeVersionComparison(sampleCatalogWithDates.m4apsPackages);
  
  if (versionAnalysis && versionAnalysis.packages) {
    versionAnalysis.packages.forEach(pkg => {
      console.log(`${pkg.wizardName || 'Unknown'}:`);
      console.log(`  Cleaned body version: "${pkg.currentBody}"`);
      console.log(`  Status: ${pkg.status}`);
      console.log('');
    });
    
    console.log('\n3. SUMMARY:');
    console.log('===========');
    console.log(`Total packages: ${versionAnalysis.summary.total}`);
    console.log(`Current: ${versionAnalysis.summary.current}`);
    console.log(`Update Required: ${versionAnalysis.summary.outdated}`);
    console.log(`Update Recommended: ${versionAnalysis.summary.recommended}`);
    console.log(`Unknown: ${versionAnalysis.summary.unknown}`);
  } else {
    console.log('No packages returned from version analysis');
  }
  
} catch (error) {
  console.error('Error during analysis:', error.message);
}