const versionChecker = require('./backend/utils/versionChecker');

console.log('Testing "PACKAGES UP TO DATE" Section Display');
console.log('='.repeat(45));

// Test with a mix: some packages needing updates and some up to date
const testPackages = [
  { packageName: 'APPS.M4APS_ADFDI_DOWNLOAD_WIZARD', body: '3.6.1' }, // Below minimum - Update Required
  { packageName: 'APPS.M4APS_ADFDI_DOWNLOAD_WIZARD', body: '3.6.7' }  // At latest - Current
];

const result = versionChecker.analyzePackageVersions(testPackages);

console.log('\nPackage Status:');
console.log('==============');
result.packages.forEach((pkg, index) => {
  console.log(`Package ${index + 1}: ${pkg.wizardName} - Status: ${pkg.status}`);
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