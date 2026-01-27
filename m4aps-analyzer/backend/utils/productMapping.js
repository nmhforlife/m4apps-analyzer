/**
 * More4apps Product Code Mappings
 * Maps wizard abbreviations to full product names
 */

/**
 * More4apps Product Code Mappings
 * Maps wizard abbreviations to full product names
 */

const productMapping = {
  // Core Wizards
  "UW": "Upload Wizard",
  "UW_EXT": "Upload Wizard Extension",
  "AIW": "Application Interface Wizard",
  "AIW_JBPS": "Job and Position Loader",
  "CW": "Customer Wizard",
  "IW": "Item Wizard",
  "RW": "Requisition Wizard",
  "RW_EXT": "Requisition Wizard Extension",
  "SW": "Supplier Wizard",
  "SW_EXT": "Supplier Wizard Extension",
  "AFW": "Agreement & Funding Wizard",
  "AFW_EXT": "Agreement & Funding Wizard Extension",
  "AW": "Asset Wizard",
  "BW": "Budget Wizard",
  "EEW": "Element Entry Wizard",
  "EMW": "Employee Wizard",
  "PIW": "AP Invoice Wizard",
  "PIW_CUSTOM": "AP Invoice Wizard Custom",
  "PIW_EXT": "AP Invoice Wizard Extension",
  "PLW": "Price List Wizard",
  "POW": "PO Wizard",
  "POW_EXT": "PO Wizard Extension",
  "PW": "Project Wizard",
  "PW_EXT": "Project Wizard Extension",
  "RIW": "AR Invoice Wizard",
  "SIW": "Special Information Wizard",
  "SOW": "Sales Order Wizard",
  "SOW_EXT": "Sales Order Wizard Extension",
  
  // Specialized AIW Loaders
  "AIW_INVPSTL": "Physical Stocktake Loader",
  "AIW_INVPSTL_EXT": "Physical Stocktake Loader Extension",
  "AIW_RLML": "Resource List Members Loader",
  "AIW_WIP": "WIP Loader",
  "AIW_WIP_EXT": "WIP Loader Extension",
  "AIW_PAUAL": "Unassigned Asset Lines Loader",
  "AIW_BSL": "Bank Statement Loader",
  "AIW_iSUL": "iSupplier User Loader",
  "AIW_EAMWKMGMT": "EAM Work Management Loader",
  "AIW_BBL": "Banks and Branches Loader",
  "AIW_GLDRL": "GL Daily Rates Loader",
  "AIW_ARNL": "AR Notes Loader",
  "AIW_PALCR": "Labor Cost Rate Loader",
  
  // Additional Wizards
  "BMW": "Bill of Materials Wizard",
  "BMW_EXT": "Bill of Materials Wizard Extension",
  "ICW": "Item Cost Wizard",
  "PMW": "Pricing Modifiers Wizard",
  "PMW_EXT": "Pricing Modifiers Wizard Extension",
  "SCW": "Sourcing Wizard",
  "GLW": "GL Wizard",
  "IEW": "Item Extension Wizard",
  "PRW": "PO Receiving Wizard",
  "MTW": "Material Transaction Wizard",
  "CW_EXT": "Customer Wizard Extension",
  "EW": "Event Wizard",
  "IW_CUSTOM": "Item Wizard Customer",
  "ARW": "AR Receipt Wizard",
  "TW": "Project Transaction Wizard",
  "TW_EXT": "Project Transaction Wizard Extension",
  "RTW": "Routing Wizard",
  
  // Shared/Information packages
  "XML": "Shared Package",
  "XML_ENCODING": "Shared Package (Encoding)",
  
  // Legacy codes for backward compatibility
  "EO": "Excel-Out" // Legacy code
};

/**
 * Get the full wizard name from a package name or wizard code
 * @param {string} input - Package name (e.g., "APPS.M4APS_ITEMWIZARD") or wizard code (e.g., "IW")
 * @returns {string} Full wizard name
 */
function getWizardName(input) {
  if (!input) return 'Unknown Wizard';
  
  // Handle package names like "APPS.M4APS_ITEMWIZARD" or "BOLINF.M4APS_ITEMWIZARD"
  const m4apsMatch = input.match(/^(?:APPS|BOLINF)\.M4APS_(.+)$/);
  if (m4apsMatch) {
    const packagePart = m4apsMatch[1];
    
    // Map common package suffixes to codes
    const packageMappings = {
      'UPLOADWIZARD': 'UW',
      'UW_EXTENSION': 'UW_EXT',
      'AIW_HR_JOBS': 'AIW_JBPS',
      'CUSTOMERWIZARD': 'CW',
      'ITEMWIZARD': 'IW',
      'ITEMWIZARDCUSTOM': 'IW_CUSTOM',
      'RW_EXTENSION': 'RW_EXT',
      'SW_EXTENSION': 'SW_EXT',
      'AGREEMENTWIZARD': 'AFW',
      'AFW_EXTENSION': 'AFW_EXT',
      'AIW_PHY_STOCKTAKE': 'AIW_INVPSTL',
      'AIW_PHY_STOCKTAKE_EXT': 'AIW_INVPSTL_EXT',
      'AIW_PLAN_RESOURCES': 'AIW_RLML',
      'AIW_WIP_DISCRETE_JOB': 'AIW_WIP',
      'AIW_WIP_DISCRETE_JOB_EXT': 'AIW_WIP_EXT',
      'SALESORDERWIZARD': 'SOW',
      'SOW_EXTENSION': 'SOW_EXT',
      'AIW_PA_UNASSIGNED_ASSET': 'AIW_PAUAL',
      'BOMWIZARD': 'BMW',
      'BMW_EXTENSION': 'BMW_EXT',
      'ITEMCOSTWIZARD': 'ICW',
      'PRICINGMODIFIERSWIZARD': 'PMW',
      'PMW_EXTENSION': 'PMW_EXT',
      'PROJECTWIZARD': 'PW',
      'PW_EXTENSION': 'PW_EXT',
      'REQWIZARD': 'RW',
      'AIW_CE_BANK_STATEMENTS': 'AIW_BSL',
      'AIW_HR_POSITION': 'AIW_JBPS',
      'AIW_SUPPLIER_USER_REG': 'AIW_iSUL',
      'BUDGETWIZARD': 'BW',
      'EMPLOYEEWIZARD': 'EMW',
      'GLWIZARD': 'GLW',
      'PAYINVWIZARD': 'PIW',
      'PIW_CUSTOM': 'PIW_CUSTOM',
      'PIW_EXTENSION': 'PIW_EXT',
      'SCW_PACKAGE': 'SCW',
      'AIW_EAM_WORK_ORDER': 'AIW_EAMWKMGMT',
      'AIW_LOAD_BANKS_BRANCHES': 'AIW_BBL',
      'IEW_EXTENSION': 'IEW',
      'PORECEIVINGWIZARD': 'PRW',
      'AIW_GL_DAILY_RATE_EXT': 'AIW_GLDRL',
      'AIW_JTF_NOTES': 'AIW_ARNL',
      'AIW_LABOR_COST': 'AIW_PALCR',
      'EEWWIZARD': 'EEW',
      'MATTXNWIZARD': 'MTW',
      'POWIZARD': 'POW',
      'POW_EXTENSION': 'POW_EXT',
      'TW_EXTENSION': 'TW_EXT',
      'ASSETWIZARD': 'AW',
      'CW_EXTENSION': 'CW_EXT',
      'EVENTWIZARD': 'EW',
      'GENERAL_LEDGER_WIZARD': 'GLW',
      'RECEIPTWIZARD': 'ARW',
      'TRANSWIZARD': 'TW',
      'PRICELISTWIZARD': 'PLW',
      'RECINVWIZARD': 'RIW',
      'ROUTINGWIZARD': 'RTW',
      'SOURCING_WIZARD': 'SCW',
      'SPECIALINFOWIZARD': 'SIW',
      'SUPPLIERWIZARD2': 'SW',
      'XML': 'XML',
      'XML_ENCODING': 'XML_ENCODING'
    };
    
    const code = packageMappings[packagePart];
    if (code && productMapping[code]) {
      return productMapping[code];
    }
  }
  
  // Handle direct wizard codes from connections (e.g., "PIW 10.4.40")
  const wizardCode = input.split(' ')[0]; // Extract just the code part
  if (productMapping[wizardCode]) {
    return productMapping[wizardCode];
  }
  
  // Fallback: try to extract known patterns
  for (const [code, name] of Object.entries(productMapping)) {
    if (input.toUpperCase().includes(code)) {
      return name;
    }
  }
  
  return input; // Return original if no mapping found
}

/**
 * Get installed wizards from package list
 * @param {Array} packages - Array of M4APS package objects
 * @returns {Array} Array of installed wizard objects with codes and names
 */
function getInstalledWizards(packages) {
  if (!packages || packages.length === 0) {
    return [];
  }
  
  const wizardSet = new Set();
  const wizards = [];
  
  packages.forEach(pkg => {
    const wizardName = getWizardName(pkg.packageName);
    const wizardCode = extractWizardCode(pkg.packageName);
    
    if (wizardCode && !wizardSet.has(wizardCode)) {
      wizardSet.add(wizardCode);
      wizards.push({
        code: wizardCode,
        name: wizardName,
        packageName: pkg.packageName,
        status: pkg.headerStatus === 'VALID' && pkg.bodyStatus === 'VALID' ? 'Valid' : 'Invalid',
        version: pkg.header || 'Unknown'
      });
    }
  });
  
  return wizards.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Extract wizard code from package name
 * @param {string} packageName - Package name like "APPS.M4APS_ITEMWIZARD"
 * @returns {string} Wizard code like "IW"
 */
function extractWizardCode(packageName) {
  if (!packageName) return null;
  const m4apsMatch = packageName.match(/^(?:APPS|BOLINF)\.M4APS_(.+)$/);
  if (!m4apsMatch) return null;
  const packagePart = m4apsMatch[1];
  
  const packageMappings = {
    'UPLOADWIZARD': 'UW',
    'UW_EXTENSION': 'UW_EXT',
    'AIW_HR_JOBS': 'AIW_JBPS',
    'CUSTOMERWIZARD': 'CW',
    'ITEMWIZARD': 'IW',
    'ITEMWIZARDCUSTOM': 'IW_CUSTOM',
    'RW_EXTENSION': 'RW_EXT',
    'SW_EXTENSION': 'SW_EXT',
    'AGREEMENTWIZARD': 'AFW',
    'AFW_EXTENSION': 'AFW_EXT',
    'AIW_PHY_STOCKTAKE': 'AIW_INVPSTL',
    'AIW_PHY_STOCKTAKE_EXT': 'AIW_INVPSTL_EXT',
    'AIW_PLAN_RESOURCES': 'AIW_RLML',
    'AIW_WIP_DISCRETE_JOB': 'AIW_WIP',
    'AIW_WIP_DISCRETE_JOB_EXT': 'AIW_WIP_EXT',
    'SALESORDERWIZARD': 'SOW',
    'SOW_EXTENSION': 'SOW_EXT',
    'AIW_PA_UNASSIGNED_ASSET': 'AIW_PAUAL',
    'BOMWIZARD': 'BMW',
    'BMW_EXTENSION': 'BMW_EXT',
    'ITEMCOSTWIZARD': 'ICW',
    'PRICINGMODIFIERSWIZARD': 'PMW',
    'PMW_EXTENSION': 'PMW_EXT',
    'PROJECTWIZARD': 'PW',
    'PW_EXTENSION': 'PW_EXT',
    'REQWIZARD': 'RW',
    'AIW_CE_BANK_STATEMENTS': 'AIW_BSL',
    'AIW_HR_POSITION': 'AIW_JBPS',
    'AIW_SUPPLIER_USER_REG': 'AIW_iSUL',
    'BUDGETWIZARD': 'BW',
    'EMPLOYEEWIZARD': 'EMW',
    'GLWIZARD': 'GLW',
    'PAYINVWIZARD': 'PIW',
    'PIW_CUSTOM': 'PIW_CUSTOM',
    'PIW_EXTENSION': 'PIW_EXT',
    'SCW_PACKAGE': 'SCW',
    'AIW_EAM_WORK_ORDER': 'AIW_EAMWKMGMT',
    'AIW_LOAD_BANKS_BRANCHES': 'AIW_BBL',
    'IEW_EXTENSION': 'IEW',
    'PORECEIVINGWIZARD': 'PRW',
    'AIW_GL_DAILY_RATE_EXT': 'AIW_GLDRL',
    'AIW_JTF_NOTES': 'AIW_ARNL',
    'AIW_LABOR_COST': 'AIW_PALCR',
    'EEWWIZARD': 'EEW',
    'MATTXNWIZARD': 'MTW',
    'POWIZARD': 'POW',
    'POW_EXTENSION': 'POW_EXT',
    'TW_EXTENSION': 'TW_EXT',
    'ASSETWIZARD': 'AW',
    'CW_EXTENSION': 'CW_EXT',
    'EVENTWIZARD': 'EW',
    'GENERAL_LEDGER_WIZARD': 'GLW',
    'RECEIPTWIZARD': 'ARW',
    'TRANSWIZARD': 'TW',
    'PRICELISTWIZARD': 'PLW',
    'RECINVWIZARD': 'RIW',
    'ROUTINGWIZARD': 'RTW',
    'SOURCING_WIZARD': 'SCW',
    'SPECIALINFOWIZARD': 'SIW',
    'SUPPLIERWIZARD2': 'SW',
    'SUPPLIERWIZARD_EXTENSION': 'SW_EXT',
    'XML': 'XML',
    'XML_ENCODING': 'XML_ENCODING'
  };
  
  return packageMappings[packagePart] || null;
}

/**
 * Check if a package is informational only (shared packages)
 * @param {string} packageName - Package name or wizard code
 * @returns {boolean} True if the package is informational only
 */
function isInformationalPackage(packageName) {
  if (!packageName) return false;
  
  const wizardCode = extractWizardCode(packageName);
  const informationalCodes = ['XML', 'XML_ENCODING'];
  
  return informationalCodes.includes(wizardCode);
}

module.exports = {
  productMapping,
  getWizardName,
  getInstalledWizards,
  extractWizardCode,
  isInformationalPackage
};