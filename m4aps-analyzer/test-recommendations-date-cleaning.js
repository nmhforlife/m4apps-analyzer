const versionChecker = require('./backend/utils/versionChecker');

console.log('Testing Date Removal in Detailed Recommendations');
console.log('='.repeat(50));

// Test with versions that include dates and trigger recommendations
const testPackages = [
  { packageName: 'APPS.M4APS_ADFDI_DOWNLOAD_WIZARD', body: '3.6.1 16-Apr-25' }, // Below minimum - Update Required
  { packageName: 'APPS.M4APS_ADFDI_DOWNLOAD_WIZARD', body: '3.6.6 13 Mar 2019' } // At minimum - Update Recommended
];

console.log('\nINPUT DATA WITH DATES:');
console.log('======================');
testPackages.forEach(pkg => {
  console.log(`Package: ${pkg.packageName}`);
  console.log(`Body with date: "${pkg.body}"`);
});

const result = versionChecker.analyzePackageVersions(testPackages);

console.log('\nCLEANED PACKAGE DATA:');
console.log('====================');
result.packages.forEach((pkg, index) => {
  console.log(`Package ${index + 1}:`);
  console.log(`  Wizard: ${pkg.wizardName}`);
  console.log(`  Current Body (cleaned): "${pkg.currentBody}"`);
  console.log(`  Status: ${pkg.status}`);
});

console.log('\nDETAILED RECOMMENDATIONS:');
console.log('========================');
if (result.recommendations && result.recommendations.length > 0) {
  result.recommendations.forEach(rec => {
    if (rec.detailedMessage) {
      console.log(rec.detailedMessage);
    }
  });
} else {
  console.log('No detailed recommendations generated.');
}