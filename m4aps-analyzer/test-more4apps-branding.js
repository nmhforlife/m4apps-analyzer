// Test that More4Apps has been changed to More4apps throughout the system
const versionChecker = require('./backend/utils/versionChecker');

console.log('Testing More4apps Branding Changes');
console.log('='.repeat(40));

// Test with mixed packages to generate detailed recommendations
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

console.log('\nChecking for More4Apps vs More4apps in recommendations:');
console.log('======================================================');
if (result.recommendations && result.recommendations.length > 0) {
  result.recommendations.forEach(rec => {
    if (rec.detailedMessage) {
      const message = rec.detailedMessage;
      
      // Check for capital A instances
      const capitalAMatches = (message.match(/More4Apps/g) || []).length;
      const lowercaseAMatches = (message.match(/More4apps/g) || []).length;
      
      console.log(`Capital A instances (More4Apps): ${capitalAMatches}`);
      console.log(`Lowercase A instances (More4apps): ${lowercaseAMatches}`);
      
      if (capitalAMatches > 0) {
        console.log('❌ Still found instances with capital A');
        // Show where they are
        const lines = message.split('\n');
        lines.forEach((line, index) => {
          if (line.includes('More4Apps')) {
            console.log(`  Line ${index + 1}: ${line.trim()}`);
          }
        });
      } else {
        console.log('✅ All instances now use lowercase "a" in More4apps');
      }
    }
  });
} else {
  console.log('No detailed recommendations to check.');
}