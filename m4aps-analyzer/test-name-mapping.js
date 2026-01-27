const { getWizardName } = require('./backend/utils/productMapping');

// Test some package name mappings
const testPackages = [
  'APPS.M4APS_ADFDI_DOWNLOAD_WIZARD',
  'APPS.M4APS_AR_RECEIPT_WIZARD',
  'APPS.M4APS_UPLOAD_WIZARD'
];

console.log('Package Name Mappings:');
testPackages.forEach(pkg => {
  const mapped = getWizardName(pkg);
  console.log(`${pkg} -> ${mapped}`);
});

// Also test our current versionChecker function
const versionChecker = require('./backend/utils/versionChecker');

console.log('\n\nTesting version checker with mapped names:');
const result1 = versionChecker.checkPackageVersion('APPS.M4APS_ADFDI_DOWNLOAD_WIZARD', '3.6.1');
console.log('Result for ADFdi Download:', result1);