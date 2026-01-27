const moment = require('moment');
const _ = require('lodash');
const { getWizardName, getInstalledWizards, isInformationalPackage } = require('./productMapping');

class AnalysisEngine {
  constructor() {
    this.versionMatrix = this.loadVersionMatrix();
    this.recommendationRules = this.loadRecommendationRules();
  }

  // Filter out packages containing "Core", "Extension", "Custom" (but not "Customer")
  // Also filter out informational packages like XML shared packages
  // Also filter out _MISCDIST and _EXT entries
  filterRelevantPackages(packages) {
    if (!packages || packages.length === 0) {
      return [];
    }

    return packages.filter(pkg => {
      const packageName = pkg.packageName || '';
      
      // Check for exact word matches, considering underscores as separators
      // Use word boundaries that account for underscores and start/end of string
      const containsCore = /(^|_)core(_|$)/i.test(packageName);
      const containsExtension = /(^|_)extension(_|$)/i.test(packageName);
      
      // Check for "custom" but not "customer" - handle both underscore-separated and compound words
      // This will match "CUSTOM", "_CUSTOM_", "ITEMWIZARDCUSTOM" but not "CUSTOMER" or "CUSTOMERWIZARD"
      const containsCustom = /(^|_)custom(_|$)|custom(?!er)/i.test(packageName);
      
      // Check for _MISCDIST and _EXT patterns
      const containsMiscDist = /_miscdist/i.test(packageName);
      const containsExt = /_ext($|_)/i.test(packageName);
      
      // Check if it's an informational package (XML shared packages)
      const isInformational = isInformationalPackage(packageName);
      
      return !(containsCore || containsExtension || containsCustom || containsMiscDist || containsExt || isInformational);
    });
  }

  analyze(catalogData) {
    const filteredPackages = this.filterRelevantPackages(catalogData.m4apsPackages || []);
    
    return {
      healthScore: this.calculateHealthScore(catalogData),
      packageAnalysis: this.analyzePackages(catalogData.m4apsPackages),
      systemHealth: this.analyzeSystemHealth(catalogData),
      versionAnalysis: this.analyzeVersions(catalogData),
      versionComparison: this.analyzeVersionComparison(catalogData.m4apsPackages),
      usageAnalysis: this.analyzeUsage(catalogData.wizardConnections),
      securityAnalysis: this.analyzeSecurityIssues(catalogData),
      summary: this.generateSummary(catalogData)
    };
  }

  calculateHealthScore(catalogData) {
    let score = 100;
    const issues = [];

    // Deduct points for invalid objects
    if (catalogData.invalidObjects && catalogData.invalidObjects.length > 0) {
      const deduction = Math.min(catalogData.invalidObjects.length * 5, 20);
      score -= deduction;
      issues.push(`Invalid objects detected: -${deduction} points`);
    }

    // Deduct points for compilation errors
    if (catalogData.compilationErrors && catalogData.compilationErrors.length > 0) {
      const deduction = Math.min(catalogData.compilationErrors.length * 10, 30);
      score -= deduction;
      issues.push(`Compilation errors detected: -${deduction} points`);
    }

    // Deduct points for outdated packages
    const outdatedPackages = this.findOutdatedPackages(this.filterRelevantPackages(catalogData.m4apsPackages || []));
    if (outdatedPackages.length > 0) {
      const deduction = Math.min(outdatedPackages.length * 3, 15);
      score -= deduction;
      issues.push(`Outdated packages detected: -${deduction} points`);
    }

    // Deduct points for security violations
    if (catalogData.securityViolations && catalogData.securityViolations.length > 0) {
      const deduction = Math.min(catalogData.securityViolations.length * 15, 40);
      score -= deduction;
      issues.push(`Security violations detected: -${deduction} points`);
    }

    return {
      score: Math.max(score, 0),
      rating: this.getHealthRating(score),
      issues,
      recommendations: this.getHealthRecommendations(score, issues)
    };
  }

  getHealthRating(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 60) return 'Poor';
    return 'Critical';
  }

  getHealthRecommendations(score, issues) {
    const recommendations = [];
    
    if (score < 70) {
      recommendations.push('Immediate attention required - multiple issues detected');
    }
    
    if (issues.some(issue => issue.includes('Invalid objects'))) {
      recommendations.push('Recompile invalid objects to resolve database inconsistencies');
    }
    
    if (issues.some(issue => issue.includes('Compilation errors'))) {
      recommendations.push('Fix compilation errors to ensure proper functionality');
    }
    
    if (issues.some(issue => issue.includes('Outdated packages'))) {
      recommendations.push('Consider upgrading outdated More4apps packages');
    }
    
    if (issues.some(issue => issue.includes('Security violations'))) {
      recommendations.push('Address security violations immediately');
    }

    return recommendations;
  }

  analyzePackages(packages) {
    if (!packages || packages.length === 0) {
      return {
        packages: [],
        installedWizards: [],
        summary: {
          message: 'No More4apps packages found',
          explanation: 'This catalog appears to be from a baseline Oracle E-Business Suite environment without More4apps solutions installed.',
          recommendation: 'More4apps packages would appear here after installation and licensing.'
        }
      };
    }

    // Filter out packages containing "Core", "Extension", and "Custom" (but not "Customer")
    const filteredPackages = this.filterRelevantPackages(packages);

    const analysis = filteredPackages.map(pkg => {
      const packageAnalysis = {
        ...pkg,
        wizardName: getWizardName(pkg.packageName),
        isValid: pkg.bodyStatus === 'VALID',
        hasVersionMismatch: false, // No longer comparing header vs body
        isOutdated: this.isPackageOutdated(pkg),
        recommendations: []
      };

      if (!packageAnalysis.isValid) {
        packageAnalysis.recommendations.push('Package has invalid status - requires recompilation');
      }

      if (packageAnalysis.isOutdated) {
        packageAnalysis.recommendations.push('Package version is outdated - consider upgrading');
      }

      return packageAnalysis;
    });

    const installedWizards = getInstalledWizards(filteredPackages);

    const summary = {
      total: filteredPackages.length,
      valid: analysis.filter(p => p.isValid).length,
      invalid: analysis.filter(p => !p.isValid).length,
      outdated: analysis.filter(p => p.isOutdated).length,
      versionMismatches: analysis.filter(p => p.hasVersionMismatch).length,
      wizardCount: installedWizards.length
    };

    return { 
      packages: analysis, 
      installedWizards,
      summary 
    };
  }

  analyzeSystemHealth(catalogData) {
    const health = {
      database: this.analyzeDatabaseHealth(catalogData),
      nodes: this.analyzeNodeHealth(catalogData.nodes, catalogData.dbNodes),
      packages: this.analyzePackageHealth(catalogData.m4apsPackages),
      overall: 'Good'
    };

    // Determine overall health
    const healthScores = [health.database.score, health.nodes.score, health.packages.score];
    const avgScore = healthScores.reduce((a, b) => a + b, 0) / healthScores.length;
    
    if (avgScore >= 80) health.overall = 'Excellent';
    else if (avgScore >= 60) health.overall = 'Good';
    else if (avgScore >= 40) health.overall = 'Fair';
    else health.overall = 'Poor';

    return health;
  }

  analyzeDatabaseHealth(catalogData) {
    let score = 100;
    const issues = [];

    // Check for invalid objects
    if (catalogData.invalidObjects && catalogData.invalidObjects.length > 0) {
      score -= Math.min(catalogData.invalidObjects.length * 10, 30);
      issues.push(`${catalogData.invalidObjects.length} invalid objects`);
    }

    // Check for compilation errors
    if (catalogData.compilationErrors && catalogData.compilationErrors.length > 0) {
      score -= Math.min(catalogData.compilationErrors.length * 15, 40);
      issues.push(`${catalogData.compilationErrors.length} compilation errors`);
    }

    // Analyze database parameters
    if (catalogData.initParameters) {
      const paramAnalysis = this.analyzeInitParameters(catalogData.initParameters);
      score -= paramAnalysis.deduction;
      issues.push(...paramAnalysis.issues);
    }

    // Check database version
    if (catalogData.generalInfo && catalogData.generalInfo['DB Version']) {
      const dbVersion = catalogData.generalInfo['DB Version'];
      const versionAnalysis = this.analyzeDbVersion(dbVersion);
      if (versionAnalysis.isOld) {
        score -= 10;
        issues.push(versionAnalysis.message);
      }
    }

    return {
      score: Math.max(score, 0),
      issues,
      status: score >= 80 ? 'Healthy' : score >= 60 ? 'Warning' : 'Critical',
      details: {
        invalidObjects: catalogData.invalidObjects?.length || 0,
        compilationErrors: catalogData.compilationErrors?.length || 0,
        dbVersion: catalogData.generalInfo?.['DB Version'] || 'Unknown',
        characterSet: catalogData.databaseInfo?.['NLS_CHARACTERSET'] || 'Unknown'
      }
    };
  }

  analyzeNodeHealth(nodes, dbNodes) {
    let score = 100;
    const issues = [];

    if (dbNodes) {
      const inactiveNodes = dbNodes.filter(node => node.active !== 'NORMAL');
      if (inactiveNodes.length > 0) {
        score -= inactiveNodes.length * 20;
        issues.push(`${inactiveNodes.length} inactive database nodes`);
      }

      const downInstances = dbNodes.filter(node => node.status !== 'OPEN');
      if (downInstances.length > 0) {
        score -= downInstances.length * 25;
        issues.push(`${downInstances.length} database instances not open`);
      }
    }

    return {
      score: Math.max(score, 0),
      issues,
      status: score >= 80 ? 'Healthy' : score >= 60 ? 'Warning' : 'Critical'
    };
  }

  analyzePackageHealth(packages) {
    const filteredPackages = this.filterRelevantPackages(packages);
    
    if (!filteredPackages || filteredPackages.length === 0) {
      return { score: 0, issues: ['No More4apps packages installed'], status: 'Warning' };
    }

    let score = 100;
    const issues = [];

    const invalidPackages = filteredPackages.filter(pkg => 
      pkg.bodyStatus !== 'VALID'
    );

    if (invalidPackages.length > 0) {
      score -= Math.min(invalidPackages.length * 15, 50);
      issues.push(`${invalidPackages.length} invalid packages`);
    }

    return {
      score: Math.max(score, 0),
      issues,
      status: score >= 80 ? 'Healthy' : score >= 60 ? 'Warning' : 'Critical'
    };
  }

  analyzeVersions(catalogData) {
    const packages = this.filterRelevantPackages(catalogData.m4apsPackages || []);
    const versionMap = {};
    
    packages.forEach(pkg => {
      const wizardType = this.extractWizardType(pkg.packageName);
      if (wizardType) {
        versionMap[wizardType] = {
          package: pkg.packageName,
          version: pkg.body,
          status: pkg.bodyStatus
        };
      }
    });

    return {
      installedVersions: versionMap,
      recommendations: this.getVersionRecommendations(versionMap),
      compatibility: this.checkVersionCompatibility(versionMap)
    };
  }

  analyzeUsage(wizardConnections) {
    if (!wizardConnections || wizardConnections.length === 0) {
      return { summary: 'No wizard connections recorded', usage: [] };
    }

    const usage = {};
    const userActivity = {};

    wizardConnections.forEach(connection => {
      const wizardCode = connection.wizardVersion.split(' ')[0]; // Extract wizard type
      const wizardName = getWizardName(wizardCode);
      const user = connection.username;
      const date = moment(connection.connectionDate, 'DD-MMM-YY HH:mm');

      if (!usage[wizardCode]) {
        usage[wizardCode] = { 
          code: wizardCode,
          name: wizardName,
          connections: 0, 
          users: new Set(), 
          lastUsed: null 
        };
      }

      usage[wizardCode].connections++;
      usage[wizardCode].users.add(user);
      
      if (!usage[wizardCode].lastUsed || date.isAfter(usage[wizardCode].lastUsed)) {
        usage[wizardCode].lastUsed = date;
      }

      if (!userActivity[user]) {
        userActivity[user] = { connections: 0, wizards: new Set(), lastConnection: null };
      }

      userActivity[user].connections++;
      userActivity[user].wizards.add(wizardCode);
      
      if (!userActivity[user].lastConnection || date.isAfter(userActivity[user].lastConnection)) {
        userActivity[user].lastConnection = date;
      }
    });

    // Convert Sets to arrays for JSON serialization
    Object.keys(usage).forEach(wizardCode => {
      usage[wizardCode].users = Array.from(usage[wizardCode].users);
      usage[wizardCode].userCount = usage[wizardCode].users.length;
      usage[wizardCode].lastUsedFormatted = usage[wizardCode].lastUsed ? 
        usage[wizardCode].lastUsed.format('DD-MMM-YY HH:mm') : 'Never';
    });

    Object.keys(userActivity).forEach(user => {
      userActivity[user].wizards = Array.from(userActivity[user].wizards);
      userActivity[user].wizardCount = userActivity[user].wizards.length;
      userActivity[user].lastConnectionFormatted = userActivity[user].lastConnection ? 
        userActivity[user].lastConnection.format('DD-MMM-YY HH:mm') : 'Never';
    });

    return {
      summary: `${wizardConnections.length} total connections across ${Object.keys(usage).length} wizards`,
      wizardUsage: usage,
      userActivity,
      mostUsedWizards: this.getMostUsedWizards(usage),
      activeUsers: this.getActiveUsers(userActivity)
    };
  }

  analyzeVersionComparison(packages) {
    try {
      const filteredPackages = this.filterRelevantPackages(packages);
      
      if (!filteredPackages || filteredPackages.length === 0) {
        return {
          summary: {
            total: 0,
            current: 0,
            outdated: 0,
            newer: 0,
            unknown: 0
          },
          packages: [],
          outdatedPackages: [],
          recommendations: []
        };
      }

      // Import the function here to avoid module loading issues
      const { analyzePackageVersions } = require('./versionChecker');
      return analyzePackageVersions(filteredPackages);
    } catch (error) {
      console.error('Error in version comparison analysis:', error);
      // Return empty result instead of crashing
      return {
        summary: {
          total: 0,
          current: 0,
          outdated: 0,
          newer: 0,
          unknown: 0
        },
        packages: [],
        outdatedPackages: [],
        recommendations: [],
        error: error.message
      };
    }
  }

  analyzeSecurityIssues(catalogData) {
    const issues = [];
    let riskLevel = 'Low';

    if (catalogData.securityViolations && catalogData.securityViolations.length > 0) {
      issues.push(`${catalogData.securityViolations.length} security violations detected`);
      riskLevel = 'High';
    }

    if (catalogData.invalidObjects && catalogData.invalidObjects.length > 0) {
      issues.push(`${catalogData.invalidObjects.length} invalid objects (potential security risk)`);
      if (riskLevel === 'Low') riskLevel = 'Medium';
    }

    return {
      riskLevel,
      issues,
      recommendations: this.getSecurityRecommendations(issues)
    };
  }

  generateSummary(catalogData) {
    const filteredPackages = this.filterRelevantPackages(catalogData.m4apsPackages || []);
    
    const summary = {
      environment: catalogData.generalInfo?.Instance || 'Unknown',
      databaseVersion: catalogData.generalInfo?.['DB Version'] || 'Unknown',
      release: catalogData.generalInfo?.Release || 'Unknown',
      packagesInstalled: filteredPackages.length,
      totalConnections: catalogData.wizardConnections?.length || 0,
      healthIssues: (catalogData.invalidObjects?.length || 0) + (catalogData.compilationErrors?.length || 0),
      lastActivity: this.getLastActivity(catalogData.wizardConnections),
      nodeCount: catalogData.nodes?.length || 0,
      characterSet: catalogData.databaseInfo?.['NLS_CHARACTERSET'] || 'Unknown',
      language: catalogData.databaseInfo?.['NLS_LANGUAGE'] || 'Unknown',
      recommendations: this.generateSystemRecommendations(catalogData)
    };

    return summary;
  }

  generateSystemRecommendations(catalogData) {
    const recommendations = [];

    // Check if M4APS packages are installed
    if (!catalogData.m4apsPackages || catalogData.m4apsPackages.length === 0) {
      recommendations.push({
        type: 'info',
        message: 'No More4apps packages detected. This appears to be a baseline Oracle E-Business Suite environment.',
        action: 'Consider installing More4apps solutions to enhance data loading capabilities.'
      });
    }

    // Database version recommendations
    if (catalogData.generalInfo?.['DB Version']) {
      const version = parseFloat(catalogData.generalInfo['DB Version']);
      if (version < 19) {
        recommendations.push({
          type: 'warning',
          message: `Database version ${catalogData.generalInfo['DB Version']} could be upgraded.`,
          action: 'Consider upgrading to Oracle 19c or higher for better performance and security.'
        });
      }
    }

    // Character set recommendations
    if (catalogData.databaseInfo?.['NLS_CHARACTERSET'] === 'US7ASCII') {
      recommendations.push({
        type: 'warning',
        message: 'Database uses US7ASCII character set which has limited international support.',
        action: 'Consider migrating to AL32UTF8 for better Unicode support.'
      });
    }

    // Node configuration
    if (catalogData.nodes && catalogData.nodes.length > 1) {
      recommendations.push({
        type: 'info',
        message: `Multi-node configuration detected (${catalogData.nodes.length} nodes).`,
        action: 'Ensure load balancing is properly configured across all nodes.'
      });
    }

    return recommendations;
  }

  getLastActivity(wizardConnections) {
    if (!wizardConnections || wizardConnections.length === 0) {
      return 'No activity recorded';
    }

    const dates = wizardConnections
      .map(conn => moment(conn.connectionDate, 'DD-MMM-YY HH:mm'))
      .filter(date => date.isValid())
      .sort((a, b) => b.diff(a));

    if (dates.length === 0) return 'No valid dates found';

    return dates[0].fromNow();
  }

  compare(catalogs) {
    if (catalogs.length < 2) {
      throw new Error('At least two catalogs required for comparison');
    }

    const comparison = {
      environments: catalogs.map(cat => ({
        name: cat.generalInfo?.Instance || cat.filename,
        filename: cat.filename,
        databaseVersion: cat.generalInfo?.['DB Version'],
        packagesCount: this.filterRelevantPackages(cat.m4apsPackages || []).length
      })),
      packageComparison: this.comparePackages(catalogs),
      versionDifferences: this.compareVersions(catalogs),
      healthComparison: this.compareHealth(catalogs),
      recommendations: this.generateComparisonRecommendations(catalogs)
    };

    return comparison;
  }

  comparePackages(catalogs) {
    const allPackages = new Set();
    catalogs.forEach(catalog => {
      if (catalog.m4apsPackages) {
        const filteredPackages = this.filterRelevantPackages(catalog.m4apsPackages);
        filteredPackages.forEach(pkg => allPackages.add(pkg.packageName));
      }
    });

    const comparison = {};
    Array.from(allPackages).forEach(packageName => {
      comparison[packageName] = catalogs.map(catalog => {
        const filteredPackages = this.filterRelevantPackages(catalog.m4apsPackages || []);
        const pkg = filteredPackages.find(p => p.packageName === packageName);
        return pkg ? {
          version: pkg.body,
          status: pkg.bodyStatus,
          environment: catalog.generalInfo?.Instance || catalog.filename
        } : {
          version: 'Not Installed',
          status: 'N/A',
          environment: catalog.generalInfo?.Instance || catalog.filename
        };
      });
    });

    return comparison;
  }

  compareVersions(catalogs) {
    const versionDiffs = [];
    
    // Compare each pair of catalogs
    for (let i = 0; i < catalogs.length - 1; i++) {
      for (let j = i + 1; j < catalogs.length; j++) {
        const cat1 = catalogs[i];
        const cat2 = catalogs[j];
        
        const diff = this.findVersionDifferences(cat1, cat2);
        if (diff.differences.length > 0) {
          versionDiffs.push(diff);
        }
      }
    }

    return versionDiffs;
  }

  compareHealth(catalogs) {
    return catalogs.map(catalog => {
      const analysis = this.analyze(catalog);
      return {
        environment: catalog.generalInfo?.Instance || catalog.filename,
        healthScore: analysis.healthScore.score,
        rating: analysis.healthScore.rating,
        issues: analysis.healthScore.issues
      };
    });
  }

  getRecommendations(catalogData) {
    const recommendations = [];
    const analysis = this.analyze(catalogData);

    // Health-based recommendations
    if (analysis.healthScore.score < 80) {
      recommendations.push({
        type: 'health',
        priority: 'high',
        title: 'System Health Issues',
        description: 'Multiple health issues detected that require attention',
        actions: analysis.healthScore.recommendations
      });
    }

    // Package recommendations
    const outdatedPackages = this.findOutdatedPackages(this.filterRelevantPackages(catalogData.m4apsPackages || []));
    if (outdatedPackages.length > 0) {
      recommendations.push({
        type: 'packages',
        priority: 'medium',
        title: 'Package Updates Available',
        description: `${outdatedPackages.length} packages have newer versions available`,
        actions: outdatedPackages.map(pkg => `Update ${pkg.packageName} to latest version`)
      });
    }

    // Security recommendations
    if (analysis.securityAnalysis.riskLevel !== 'Low') {
      recommendations.push({
        type: 'security',
        priority: analysis.securityAnalysis.riskLevel === 'High' ? 'high' : 'medium',
        title: 'Security Concerns',
        description: 'Security issues require attention',
        actions: analysis.securityAnalysis.recommendations
      });
    }

    // Usage recommendations
    const inactiveWizards = this.findInactiveWizards(catalogData.wizardConnections);
    if (inactiveWizards.length > 0) {
      recommendations.push({
        type: 'usage',
        priority: 'low',
        title: 'Unused Wizards',
        description: `${inactiveWizards.length} wizards have not been used recently`,
        actions: ['Consider removing unused wizard licenses', 'Review user training needs']
      });
    }

    return recommendations;
  }

  getVersionMatrix() {
    return this.versionMatrix;
  }

  // Helper methods
  isPackageOutdated(pkg) {
    // This would normally check against a version database
    // For now, implement basic logic
    const wizardType = this.extractWizardType(pkg.packageName);
    const currentVersion = this.parseVersion(pkg.body);
    const latestVersion = this.versionMatrix[wizardType]?.latest;
    
    if (!latestVersion) return false;
    
    return this.compareVersionObjects(currentVersion, this.parseVersion(latestVersion)) < 0;
  }

  extractWizardType(packageName) {
    const wizardMap = {
      'M4APS_PAYINVWIZARD': 'PIW',
      'M4APS_SUPPLIERWIZARD': 'SW',
      'M4APS_RECEIPTWIZARD': 'RW',
      'M4APS_ARW_EXTENSION': 'ARW',
      'M4APS_ITEMWIZARD': 'IW',
      'M4APS_BUDGETWIZARD': 'BW',
      'M4APS_EMPLOYEEWIZARD': 'EMW',
      'M4APS_PROJECTWIZARD': 'PW',
      'M4APS_ASSETWIZARD': 'AW'
    };

    for (const [key, value] of Object.entries(wizardMap)) {
      if (packageName.includes(key)) return value;
    }

    return null;
  }

  parseVersion(versionString) {
    if (!versionString || versionString === '?') return { major: 0, minor: 0, patch: 0 };
    
    const match = versionString.match(/(\d+)\.(\d+)\.?(\d+)?/);
    if (!match) return { major: 0, minor: 0, patch: 0 };
    
    return {
      major: parseInt(match[1]) || 0,
      minor: parseInt(match[2]) || 0,
      patch: parseInt(match[3]) || 0
    };
  }

  // Compare two version objects, returns -1 if v1 < v2, 0 if equal, 1 if v1 > v2
  compareVersionObjects(version1, version2) {
    if (version1.major !== version2.major) {
      return version1.major < version2.major ? -1 : 1;
    }
    if (version1.minor !== version2.minor) {
      return version1.minor < version2.minor ? -1 : 1;
    }
    if (version1.patch !== version2.patch) {
      return version1.patch < version2.patch ? -1 : 1;
    }
    return 0;
  }

  findOutdatedPackages(packages) {
    if (!packages) return [];
    return packages.filter(pkg => this.isPackageOutdated(pkg));
  }

  getMostUsedWizards(usage) {
    return Object.entries(usage)
      .sort(([,a], [,b]) => b.connections - a.connections)
      .slice(0, 5)
      .map(([wizardCode, data]) => ({ 
        code: wizardCode,
        name: data.name,
        wizard: `${data.name} (${wizardCode})`,
        connections: data.connections,
        userCount: data.userCount
      }));
  }

  getActiveUsers(userActivity) {
    return Object.entries(userActivity)
      .sort(([,a], [,b]) => b.connections - a.connections)
      .slice(0, 10)
      .map(([user, data]) => ({ user, connections: data.connections }));
  }

  getSecurityRecommendations(issues) {
    const recommendations = [];
    
    if (issues.some(issue => issue.includes('security violations'))) {
      recommendations.push('Review and resolve all security violations immediately');
      recommendations.push('Audit user access and permissions');
    }
    
    if (issues.some(issue => issue.includes('invalid objects'))) {
      recommendations.push('Recompile invalid objects to ensure system integrity');
    }

    return recommendations;
  }

  findInactiveWizards(wizardConnections) {
    // Logic to find wizards not used in the last 90 days
    const cutoffDate = moment().subtract(90, 'days');
    const activeWizards = new Set();
    
    if (wizardConnections) {
      wizardConnections.forEach(conn => {
        const connectionDate = moment(conn.connectionDate, 'DD-MMM-YY HH:mm');
        if (connectionDate.isAfter(cutoffDate)) {
          const wizard = conn.wizardVersion.split(' ')[0];
          activeWizards.add(wizard);
        }
      });
    }

    // This would normally compare against a list of all installed wizards
    // For now, return empty array
    return [];
  }

  generateComparisonRecommendations(catalogs) {
    const recommendations = [];
    
    // Find environments with different package versions
    const packageComparison = this.comparePackages(catalogs);
    const versionMismatches = Object.entries(packageComparison).filter(([pkg, versions]) => {
      const uniqueVersions = new Set(versions.map(v => v.version));
      return uniqueVersions.size > 1;
    });

    if (versionMismatches.length > 0) {
      recommendations.push({
        type: 'consistency',
        priority: 'medium',
        title: 'Version Inconsistencies',
        description: `${versionMismatches.length} packages have different versions across environments`,
        actions: ['Standardize package versions across environments', 'Plan coordinated upgrades']
      });
    }

    return recommendations;
  }

  findVersionDifferences(cat1, cat2) {
    const differences = [];
    const env1 = cat1.generalInfo?.Instance || cat1.filename;
    const env2 = cat2.generalInfo?.Instance || cat2.filename;

    // Compare package versions
    if (cat1.m4apsPackages && cat2.m4apsPackages) {
      const filteredPackages1 = this.filterRelevantPackages(cat1.m4apsPackages);
      const filteredPackages2 = this.filterRelevantPackages(cat2.m4apsPackages);
      const packages1 = new Map(filteredPackages1.map(pkg => [pkg.packageName, pkg]));
      const packages2 = new Map(filteredPackages2.map(pkg => [pkg.packageName, pkg]));

      // Check packages in both environments
      packages1.forEach((pkg1, packageName) => {
        const pkg2 = packages2.get(packageName);
        if (pkg2 && pkg1.body !== pkg2.body) {
          differences.push({
            package: packageName,
            env1Version: pkg1.body,
            env2Version: pkg2.body,
            type: 'version_mismatch'
          });
        } else if (!pkg2) {
          differences.push({
            package: packageName,
            env1Version: pkg1.body,
            env2Version: 'Not Installed',
            type: 'missing_package'
          });
        }
      });

      // Check for packages only in environment 2
      packages2.forEach((pkg2, packageName) => {
        if (!packages1.has(packageName)) {
          differences.push({
            package: packageName,
            env1Version: 'Not Installed',
            env2Version: pkg2.body,
            type: 'missing_package'
          });
        }
      });
    }

    return {
      environment1: env1,
      environment2: env2,
      differences
    };
  }

  getVersionRecommendations(versionMap) {
    const recommendations = [];
    const versionMatrix = this.versionMatrix;

    Object.keys(versionMap).forEach(packageType => {
      const installedVersion = versionMap[packageType];
      const matrixInfo = versionMatrix[packageType];

      if (matrixInfo) {
        if (installedVersion !== matrixInfo.recommended) {
          recommendations.push({
            package: packageType,
            current: installedVersion,
            recommended: matrixInfo.recommended,
            latest: matrixInfo.latest,
            type: installedVersion === matrixInfo.latest ? 'downgrade_recommended' : 'upgrade_available'
          });
        }
      } else {
        recommendations.push({
          package: packageType,
          current: installedVersion,
          type: 'unknown_package',
          message: 'Package not found in compatibility matrix'
        });
      }
    });

    return recommendations;
  }

  analyzeInitParameters(initParameters) {
    let deduction = 0;
    const issues = [];

    if (!initParameters || initParameters.length === 0) {
      return { deduction: 0, issues: [] };
    }

    // Analyze critical parameters
    const criticalParams = {
      'open_cursors': { min: 300, recommended: 600 },
      'processes': { min: 150, recommended: 500 },
      'session_cached_cursors': { min: 50, recommended: 200 }
    };

    initParameters.forEach(param => {
      const paramName = param.parameter;
      const currentValue = parseInt(param.currentValue) || 0;
      
      if (criticalParams[paramName]) {
        const config = criticalParams[paramName];
        if (currentValue < config.min) {
          deduction += 15;
          issues.push(`${paramName} is too low (${currentValue}, recommended: ${config.recommended})`);
        } else if (currentValue < config.recommended) {
          deduction += 5;
          issues.push(`${paramName} could be optimized (${currentValue}, recommended: ${config.recommended})`);
        }
      }
    });

    return { deduction: Math.min(deduction, 40), issues };
  }

  analyzeDbVersion(version) {
    const versionNumber = parseFloat(version);
    
    if (versionNumber < 12) {
      return { isOld: true, message: `Database version ${version} is very old and unsupported` };
    } else if (versionNumber < 18) {
      return { isOld: true, message: `Database version ${version} is outdated, consider upgrading` };
    }
    
    return { isOld: false, message: `Database version ${version} is current` };
  }

  checkVersionCompatibility(versionMap) {
    // This would check against known compatibility matrices
    // For now, return basic compatibility info
    return {
      compatible: true,
      warnings: [],
      incompatibilities: []
    };
  }

  loadVersionMatrix() {
    // This would normally load from a database or configuration file
    return {
      PIW: { latest: '10.4.40', recommended: '10.4.39' },
      SW: { latest: '5.03.30', recommended: '5.03.30' },
      ARW: { latest: '3.4.32', recommended: '3.4.32' },
      CW: { latest: '3.2.80', recommended: '3.2.80' },
      IW: { latest: '3.1.26', recommended: '3.1.26' },
      BW: { latest: '12.1.28', recommended: '12.1.28' },
      EMW: { latest: '4.01.112', recommended: '4.01.112' },
      AW: { latest: '3.4.14', recommended: '3.4.14' },
      PW: { latest: '9.5.30', recommended: '9.5.30' }
    };
  }

  loadRecommendationRules() {
    // This would normally load recommendation rules from configuration
    return {};
  }
}

module.exports = new AnalysisEngine();