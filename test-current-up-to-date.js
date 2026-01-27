// Clear the require cache first
delete require.cache[require.resolve('./backend/utils/versionChecker.js')];

const versionChecker = require('./backend/utils/versionChecker');

console.log('Testing Current "PACKAGES UP TO DATE" Section');
console.log('='.repeat(45));

// Test with mixed packages: some needing updates and some up to date
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
    } else {
      console.log(`Message: ${rec.message}`);
    }
  });
} else {
  console.log('No detailed recommendations generated.');
}