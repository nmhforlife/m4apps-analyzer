const versionChecker = require('./backend/utils/versionChecker');

console.log('Testing Minimum Version Display in Table and Recommendations');
console.log('='.repeat(60));

// Test package data with different status scenarios
const testPackages = [
  { packageName: 'APPS.M4APS_ADFDI_DOWNLOAD_WIZARD', body: '3.6.1' }, // Below minimum - Update Required
  { packageName: 'APPS.M4APS_ADFDI_DOWNLOAD_WIZARD', body: '3.6.6' }, // At minimum - Update Recommended
  { packageName: 'APPS.M4APS_ADFDI_DOWNLOAD_WIZARD', body: '3.6.7' }  // At latest - Current
];

// Test the analysis function
const result = versionChecker.analyzePackageVersions(testPackages);

console.log('\n1. PACKAGE TABLE DATA (should include minBodyVersion):');
console.log('====================================================');
result.packages.forEach((pkg, index) => {
  console.log(`Package ${index + 1}:`);
  console.log(`  Wizard Name: ${pkg.wizardName}`);
  console.log(`  Status: ${pkg.status}`);
  console.log(`  Current Body: ${pkg.currentBody}`);
  console.log(`  Minimum Body: ${pkg.minBodyVersion || 'Not set'}`);
  console.log(`  Latest Body: ${pkg.latestBody}`);
  console.log('');
});

console.log('\n2. SUMMARY STATISTICS:');
console.log('=====================');
console.log(`Total: ${result.summary.total}`);
console.log(`Current: ${result.summary.current}`);
console.log(`Update Required: ${result.summary.outdated}`);
console.log(`Update Recommended: ${result.summary.recommended}`);
console.log(`Unknown: ${result.summary.unknown}`);

console.log('\n3. DETAILED RECOMMENDATIONS (should include minimum versions):');
console.log('==============================================================');
if (result.recommendations && result.recommendations.length > 0) {
  result.recommendations.forEach(rec => {
    console.log(`Priority: ${rec.priority}`);
    console.log(`Message: ${rec.message}`);
    if (rec.detailedMessage) {
      console.log('\nDetailed Message:');
      console.log(rec.detailedMessage);
    }
  });
} else {
  console.log('No recommendations generated.');
}

// Test individual checkPackageVersion to ensure it returns minBodyVersion
console.log('\n4. INDIVIDUAL VERSION CHECK:');
console.log('===========================');
const individualResult = versionChecker.checkPackageVersion('APPS.M4APS_ADFDI_DOWNLOAD_WIZARD', '3.6.1');
console.log('Individual check result:');
console.log(`  Wizard Name: ${individualResult.wizardName}`);
console.log(`  Status: ${individualResult.status}`);
console.log(`  Current Body: ${individualResult.currentBody}`);
console.log(`  Minimum Body: ${individualResult.minBodyVersion}`);
console.log(`  Latest Body: ${individualResult.latestBody}`);
console.log(`  Recommendation: ${individualResult.recommendation}`);