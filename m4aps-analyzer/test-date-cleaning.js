const versionChecker = require('./backend/utils/versionChecker');

console.log('Testing Date Removal from Installed Body Versions');
console.log('='.repeat(50));

// Test the cleanVersionString function directly (if exported)
console.log('\n1. TESTING VERSION CLEANING:');
console.log('============================');

// Simulate versions with dates like they appear in catalog
const testVersions = [
  '3.7.0 16-Apr-25',
  '2.1.9 13 Mar 2019',
  '12.1.15 30 Jun 24',
  '1.0.1 19-Oct-22',
  '3.1.0 14-Jan-25',
  '2.1.03 04-Apr-18',
  '3.6.7', // without date
  '', // empty
  null, // null
  undefined // undefined
];

// We need to test through the checkPackageVersion function since cleanVersionString is not exported
testVersions.forEach(version => {
  if (version !== null && version !== undefined) {
    console.log(`"${version}" should become "${version.split(' ')[0]}"`);
  } else {
    console.log(`${version} should remain ${version}`);
  }
});

console.log('\n2. TESTING THROUGH VERSION CHECKER:');
console.log('====================================');

// Test with versions that include dates
const testPackages = [
  { packageName: 'APPS.M4APS_ADFDI_DOWNLOAD_WIZARD', body: '3.6.1 16-Apr-25' },
  { packageName: 'APPS.M4APS_ADFDI_DOWNLOAD_WIZARD', body: '3.6.6 13 Mar 2019' },
  { packageName: 'APPS.M4APS_ADFDI_DOWNLOAD_WIZARD', body: '3.6.7' } // no date
];

testPackages.forEach((pkg, index) => {
  console.log(`\nTest ${index + 1}: Input body version = "${pkg.body}"`);
  const result = versionChecker.checkPackageVersion(pkg.packageName, pkg.body);
  console.log(`           Cleaned version = "${result.currentBody}"`);
  console.log(`           Status = ${result.status}`);
});

console.log('\n3. TESTING FULL ANALYSIS:');
console.log('==========================');

const result = versionChecker.analyzePackageVersions([
  { packageName: 'APPS.M4APS_ADFDI_DOWNLOAD_WIZARD', body: '3.6.1 16-Apr-25' },
  { packageName: 'APPS.M4APS_ADFDI_DOWNLOAD_WIZARD', body: '3.6.6 13 Mar 2019' }
]);

console.log('\nAnalysis results:');
result.packages.forEach((pkg, index) => {
  console.log(`Package ${index + 1}:`);
  console.log(`  Current Body (cleaned): ${pkg.currentBody}`);
  console.log(`  Status: ${pkg.status}`);
});