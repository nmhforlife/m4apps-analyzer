const fs = require('fs');
const path = require('path');

// Load the versionChecker module
const versionChecker = require('./backend/utils/versionChecker');

// Test cases for three-tier version comparison
const testCases = [
  {
    name: 'Package below minimum version',
    packageName: 'APPS.M4APS_ADFDI_DOWNLOAD_WIZARD',
    currentBody: '3.6.1', // Below minimum 3.6.6
    expectedStatus: 'Update Required',
    description: 'Should require update when below minimum version'
  },
  {
    name: 'Package at minimum but below recommended',
    packageName: 'APPS.M4APS_ADFDI_DOWNLOAD_WIZARD', 
    currentBody: '3.6.6', // At minimum but below recommended 3.6.7
    expectedStatus: 'Update Recommended',
    description: 'Should recommend update when at minimum but below latest'
  },
  {
    name: 'Package at recommended version',
    packageName: 'APPS.M4APS_ADFDI_DOWNLOAD_WIZARD',
    currentBody: '3.6.7', // At recommended version
    expectedStatus: 'Current',
    description: 'Should be current when at recommended version'
  },
  {
    name: 'Package with AR Receipt Wizard',
    packageName: 'APPS.M4APS_AR_RECEIPT_WIZARD',
    currentBody: '2.1.5', // Below minimum and recommended
    expectedStatus: 'Update Required',
    description: 'Should handle AR Receipt Wizard package correctly'
  }
];

console.log('Testing Three-Tier Version Comparison System');
console.log('='.repeat(50));

// Test the checkPackageVersion function
testCases.forEach((testCase, index) => {
  console.log(`\nTest ${index + 1}: ${testCase.name}`);
  console.log(`Description: ${testCase.description}`);
  console.log(`Package: ${testCase.packageName}`);
  console.log(`Current Body Version: ${testCase.currentBody}`);
  
  // Use the package name from the test case
  const result = versionChecker.checkPackageVersion(testCase.packageName, testCase.currentBody);
  
  console.log(`Expected Status: ${testCase.expectedStatus}`);
  console.log(`Actual Status: ${result.status}`);
  console.log(`Latest Body: ${result.latestBody}`);
  console.log(`Min Body: ${result.minBodyVersion || 'Not set'}`);
  
  if (result.status === testCase.expectedStatus) {
    console.log('✅ Test PASSED');
  } else {
    console.log('❌ Test FAILED');
  }
});

console.log('\n' + '='.repeat(50));
console.log('Testing Summary Statistics');

// Test the analyzePackageVersions function with a sample package list
const samplePackages = [
  { packageName: 'APPS.M4APS_ADFDI_DOWNLOAD_WIZARD', body: '3.6.1' }, // Below minimum
  { packageName: 'APPS.M4APS_ADFDI_DOWNLOAD_WIZARD', body: '3.6.6' }, // At minimum
  { packageName: 'APPS.M4APS_ADFDI_DOWNLOAD_WIZARD', body: '3.6.7' }  // At recommended
];

const analysisResult = versionChecker.analyzePackageVersions(samplePackages);

console.log('\nAnalysis Results:');
console.log(`Total packages: ${analysisResult.summary.total}`);
console.log(`Current: ${analysisResult.summary.current}`);
console.log(`Update Required: ${analysisResult.summary.outdated}`);
console.log(`Update Recommended: ${analysisResult.summary.recommended}`);
console.log(`Unknown: ${analysisResult.summary.unknown}`);

console.log('\nDetailed Results:');
analysisResult.packages.forEach(pkg => {
  console.log(`- ${pkg.packageName}: ${pkg.currentBody} → ${pkg.status}`);
});