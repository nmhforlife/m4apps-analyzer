/**
 * More4apps Version Checker
 * Maps catalog package names to wizard names and tracks latest available versions
 */

const { getWizardName } = require('./productMapping');

// Package mappings are now handled by the centralized productMapping.js file

/**
 * Clean version string by removing date information
 * Examples: "3.7.0 16-Apr-25" -> "3.7.0", "2.1.9 13 Mar 2019" -> "2.1.9"
 */
function cleanVersionString(versionStr) {
  if (!versionStr || typeof versionStr !== 'string') {
    return versionStr;
  }

  const trimmed = versionStr.trim();
  if (/^not required$/i.test(trimmed) || /^n\/?a$/i.test(trimmed)) {
    return trimmed;
  }
  
  // Remove everything after the version number (dates, spaces, etc.)
  // Pattern: version number followed by space and date
  const cleaned = trimmed.split(' ')[0];
  return cleaned;
}

// Latest available versions from More4apps community site (Updated October 2025)
const latestVersions = {
  "Azure DevOps Wizard test": {
    "header": "4.6.78",
    "body": "4.6.78",
    "minBodyVersion": "4.6.78",
    "releaseDate": "27-Jan-2023",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "ADWT"
  },
  "Agreement & Funding Wizard": {
    "header": "Not required",
    "body": "Not required",
    "minBodyVersion": "Not required",
    "releaseDate": "10-Sep-2025",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "AFW"
  },
  "Application Interface Wizard": {
    "header": "Not required",
    "body": "Not required",
    "minBodyVersion": "Not required",
    "releaseDate": "10-Sep-2025",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "AIW"
  },
  "AR Notes Loader": {
    "header": "1.0.0",
    "body": "1.0.0",
    "minBodyVersion": "1.0.0",
    "releaseDate": "29-Sep-2020",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "AIW_ARNL"
  },
  "Banks and Branches Loader": {
    "header": "1.0.4",
    "body": "1.0.7",
    "minBodyVersion": "1.0.7",
    "releaseDate": "29-Sep-2020",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "AIW_BBL"
  },
  "Bank Statement Loader": {
    "header": "1.0.3",
    "body": "1.0.6",
    "minBodyVersion": "1.0.6",
    "releaseDate": "29-Sep-2020",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "AIW_BSL"
  },
  "EAM Work Management Loader": {
    "header": "1.00",
    "body": "1.08.0",
    "minBodyVersion": "1.08.0",
    "releaseDate": "12-May-2022",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "AIW_EAMWKMGMT"
  },
  "Engineering Change Order Loader": {
    "header": "1.0.3",
    "body": "1.0.4",
    "minBodyVersion": "1.0.4",
    "releaseDate": "20-Jun-2019",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "AIW_ECOL"
  },
  "EAM Work Management loader-not used anymore": {
    "header": "1.0.2",
    "body": "1.0.2",
    "minBodyVersion": "1.0.2",
    "releaseDate": "20-Jun-2019",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "AIW_EWOL"
  },
  "FND Flex Values Loader": {
    "header": "1.0.2",
    "body": "1.0.2",
    "minBodyVersion": "1.0.2",
    "releaseDate": "26-Jul-2018",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "AIW_FLVL"
  },
  "GL Daily Rates Loader": {
    "header": "1.05.0",
    "body": "1.05.0",
    "minBodyVersion": "1.05.0",
    "releaseDate": "29-Sep-2020",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "AIW_GLDRL"
  },
  "HR Job Loader": {
    "header": "1.0.1",
    "body": "1.0.4",
    "minBodyVersion": "1.0.4",
    "releaseDate": "28-Mar-2019",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "AIW_HRJ"
  },
  "Physical Stocktake Loader": {
    "header": "2.05.0",
    "body": "2.05.0",
    "minBodyVersion": "2.05.0",
    "releaseDate": "14-Sep-2022",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "AIW_INVPSTL"
  },
  "Job and Position Loader": {
    "header": "1.05.0",
    "body": "1.05.0",
    "minBodyVersion": "1.05.0",
    "releaseDate": "14-Sep-2022",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "AIW_JBPS"
  },
  "FND Menus Loader": {
    "header": "1.0.1",
    "body": "1.0.1",
    "minBodyVersion": "1.0.1",
    "releaseDate": "13-Dec-2018",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "AIW_MENL"
  },
  "OPM Master Data (No longer used)": {
    "header": "1.0.1",
    "body": "1.0.4",
    "minBodyVersion": "1.0.4",
    "releaseDate": "28-Mar-2019",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "AIW_OPMF"
  },
  "OPM Master Data Loader": {
    "header": "1.04.0",
    "body": "1.04.0",
    "minBodyVersion": "1.04.0",
    "releaseDate": "24-Dec-2021",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "AIW_OPMRFL"
  },
  "Labor Cost Rate Loader": {
    "header": "1.0.3",
    "body": "1.0.3",
    "minBodyVersion": "1.0.3",
    "releaseDate": "29-Sep-2020",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "AIW_PALCR"
  },
  "Unassigned Asset Lines Loader": {
    "header": "1.0.2",
    "body": "1.1.3",
    "minBodyVersion": "1.1.3",
    "releaseDate": "12-May-2022",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "AIW_PAUAL"
  },
  "PM Lease Loader": {
    "header": "1.0.2",
    "body": "1.0.5",
    "minBodyVersion": "1.0.5",
    "releaseDate": "20-Jun-2019",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "AIW_PML"
  },
  "FND Profile Option Values Loader": {
    "header": "1.0.4",
    "body": "1.0.4",
    "minBodyVersion": "1.0.4",
    "releaseDate": "06-Dec-2018",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "AIW_POL"
  },
  "FND Responsibilities Loader": {
    "header": "1.0.2",
    "body": "1.0.2",
    "minBodyVersion": "1.0.2",
    "releaseDate": "05-Jul-2017",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "AIW_RESPL"
  },
  "Resource List Members Loader": {
    "header": "1.04.0",
    "body": "1.04.0",
    "minBodyVersion": "1.04.0",
    "releaseDate": "29-Sep-2020",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "AIW_RLML"
  },
  "System Administration Loader": {
    "header": "1.05.0",
    "body": "1.05.0",
    "minBodyVersion": "1.05.0",
    "releaseDate": "12-May-2022",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "AIW_SYSAD"
  },
  "User Management Roles Loader": {
    "header": "N/A",
    "body": "N/A",
    "minBodyVersion": "N/A",
    "releaseDate": "14-Dec-2017",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "AIW_UMGMTL"
  },
  "FND User Loader": {
    "header": "1.0.2",
    "body": "1.0.1",
    "minBodyVersion": "1.0.1",
    "releaseDate": "31-Jan-2018",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "AIW_USERL"
  },
  "WIP Loader": {
    "header": "2.27.0",
    "body": "2.27.0",
    "minBodyVersion": "2.27.0",
    "releaseDate": "13-Feb-2024",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "AIW_WIP"
  },
  "WIP Discrete Job Loader": {
    "header": "N/A",
    "body": "N/A",
    "minBodyVersion": "N/A",
    "releaseDate": "05-Jul-2017",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "AIW_WIPDJL"
  },
  "WIP Move Transactions Loader": {
    "header": "N/A",
    "body": "N/A",
    "minBodyVersion": "N/A",
    "releaseDate": "05-Jul-2017",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "AIW_WIPMTL"
  },
  "iSupplier User Loader": {
    "header": "1.05.0",
    "body": "1.05.0",
    "minBodyVersion": "1.05.0",
    "releaseDate": "29-Sep-2020",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "AIW_iSUL"
  },
  "AR Receipt Wizard": {
    "header": "2.1.9",
    "body": "2.1.9",
    "minBodyVersion": "2.1.9",
    "releaseDate": "05-Dec-2025",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "ARW"
  },
  "Asset Wizard": {
    "header": "2.0.9",
    "body": "2.0.8",
    "minBodyVersion": "2.0.8",
    "releaseDate": "12-Sep-2025",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "AW"
  },
  "Bill of Materials Wizard": {
    "header": "3.0.6",
    "body": "3.0.7",
    "minBodyVersion": "3.0.6",
    "releaseDate": "10-Sep-2025",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "BMW"
  },
  "Budget Wizard": {
    "header": "Not required",
    "body": "Not required",
    "minBodyVersion": "Not required",
    "releaseDate": "16-Oct-2025",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "BW"
  },
  "ERP Cloud Toolbox Add-In": {
    "header": "19.2.0.0",
    "body": "19.2.0.0",
    "minBodyVersion": "19.2.0.0",
    "releaseDate": "09-Jan-2026",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "CLTBA"
  },
  "Customer Wizard": {
    "header": "Not required",
    "body": "Not required",
    "minBodyVersion": "Not required",
    "releaseDate": "20-Oct-2025",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "CW"
  },
  "Element Entry Wizard": {
    "header": "1.0.9",
    "body": "1.0.11",
    "minBodyVersion": "1.0.11",
    "releaseDate": "09-Sep-2025",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "EEW"
  },
  "Employee Wizard": {
    "header": "2.0.01",
    "body": "2.0.03",
    "minBodyVersion": "2.0.01",
    "releaseDate": "16-Apr-2025",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "EMW"
  },
  "Event Wizard": {
    "header": "Not required",
    "body": "Not required",
    "minBodyVersion": "Not required",
    "releaseDate": "09-Sep-2025",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "EW"
  },
  "GL Wizard": {
    "header": "Not required",
    "body": "Not required",
    "minBodyVersion": "Not required",
    "releaseDate": "10-Sep-2025",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "GLW"
  },
  "Item Cost Wizard": {
    "header": "2.0.00",
    "body": "1.05.11",
    "minBodyVersion": "1.05.11",
    "releaseDate": "12-Nov-2025",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "ICW"
  },
  "Item Extension Wizard": {
    "header": "1.2.6",
    "body": "1.3.17",
    "minBodyVersion": "1.3.13",
    "releaseDate": "20-Oct-2025",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "IEW"
  },
  "Wizard Infrastructure for 11i": {
    "header": "5.2.22  2 Mar 24",
    "body": "5.4.23  2 Mar 24",
    "minBodyVersion": "5.4.23  2 Mar 24",
    "releaseDate": "03-Mar-2024",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "INFRA 11i"
  },
  "Mobile Infrastructure": {
    "header": "0.1.12",
    "body": "0.1.12",
    "minBodyVersion": "0.1.12",
    "releaseDate": "25-Jul-2017",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "INFRA Mobile"
  },
  "Item Wizard": {
    "header": "1.2.6",
    "body": "1.3.17",
    "minBodyVersion": "1.3.17",
    "releaseDate": "20-Oct-2025",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "IW"
  },
  "Labor Cost Rate Wizard": {
    "header": "1.0.0 ",
    "body": "1.0.8",
    "minBodyVersion": "1.0.7",
    "releaseDate": "25-Jun-2019",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "LCW"
  },
  "Material Transaction Wizard": {
    "header": "1.2.03",
    "body": "2.4.08",
    "minBodyVersion": "2.4.08",
    "releaseDate": "10-Sep-2025",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "MTW"
  },
  "Oracle Cloud Example Product": {
    "header": "19.2.0.0",
    "body": "19.2.0.0",
    "minBodyVersion": "19.2.0.0",
    "releaseDate": "09-Jan-2026",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "OC-EXAMPLE"
  },
  "Cloud Finance": {
    "header": "19.10.8.1",
    "body": "19.10.8.1",
    "minBodyVersion": "19.10.8.1",
    "releaseDate": "19-Jan-2026",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "OC-FIN"
  },
  "Cloud Procurement": {
    "header": "19.3.11.0",
    "body": "19.3.11.0",
    "minBodyVersion": "19.3.11.0",
    "releaseDate": "29-Jan-2026",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "OC-PROC"
  },
  "Cloud Product Definition": {
    "header": "19.3.2.0",
    "body": "19.3.2.0",
    "minBodyVersion": "19.3.2.0",
    "releaseDate": "16-Jan-2026",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "OC-PRODUCTDEF"
  },
  "Cloud Projects": {
    "header": "19.2.8.0",
    "body": "19.2.8.0",
    "minBodyVersion": "19.2.8.0",
    "releaseDate": "16-Jan-2026",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "OC-PROJ"
  },
  "AP Invoice Wizard": {
    "header": "3.1.0",
    "body": "3.7.0",
    "minBodyVersion": "3.6.6",
    "releaseDate": "16-Oct-2025",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "PIW"
  },
  "Price List Wizard": {
    "header": "1.1.1",
    "body": "1.3.7",
    "minBodyVersion": "1.3.7",
    "releaseDate": "10-Sep-2025",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "PLW"
  },
  "Pricing Modifiers Wizard": {
    "header": "1.2.0",
    "body": "1.2.0",
    "minBodyVersion": "1.1.0",
    "releaseDate": "22-May-2025",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "PMW"
  },
  "PO Wizard": {
    "header": "2.0.00",
    "body": "2.0.01",
    "minBodyVersion": "2.0.01",
    "releaseDate": "04-Dec-2025",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "POW"
  },
  "PO Receiving Wizard": {
    "header": "1.0.1",
    "body": "1.1.2",
    "minBodyVersion": "1.1.1",
    "releaseDate": "14-Apr-2025",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "PRW"
  },
  "Project Wizard": {
    "header": "1.2.0",
    "body": "1.4.0",
    "minBodyVersion": "1.3.10",
    "releaseDate": "16-Oct-2025",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "PW"
  },
  "AR Invoice Wizard": {
    "header": "1.1.3",
    "body": "1.2.4",
    "minBodyVersion": "1.2.4",
    "releaseDate": "13-Jan-2026",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "RIW"
  },
  "AR Invoice Wizard - Interface": {
    "header": "1.1.2 ",
    "body": "1.2.4",
    "minBodyVersion": "1.1.7",
    "releaseDate": "14-Jul-2014",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "RIW-INT"
  },
  "Routing Wizard": {
    "header": "2.0.3",
    "body": "2.0.2",
    "minBodyVersion": "2.0.2",
    "releaseDate": "25-Nov-2025",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "RTW"
  },
  "Requisition Wizard": {
    "header": "5.1.00",
    "body": "5.1.00",
    "minBodyVersion": "5.1.00",
    "releaseDate": "09-Sep-2025",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "RW"
  },
  "Sourcing Wizard": {
    "header": "1.2.3",
    "body": "1.2.6",
    "minBodyVersion": "1.2.3",
    "releaseDate": "19-Jan-2026",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "SCW"
  },
  "Special Information Wizard": {
    "header": "1.0.0  ",
    "body": "1.0.5",
    "minBodyVersion": "1.0.5",
    "releaseDate": "14-Apr-2025",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "SIW"
  },
  "Sales Order Wizard": {
    "header": "2.2.0",
    "body": "2.2.0",
    "minBodyVersion": "2.1.0",
    "releaseDate": "16-Oct-2025",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "SOW"
  },
  "Sales Quote Wizard": {
    "header": "1.1.1",
    "body": "1.1.2",
    "minBodyVersion": "1.1.1",
    "releaseDate": "11-May-2018",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "SQW"
  },
  "Supplier Wizard": {
    "header": "2.1.03",
    "body": "2.1.49",
    "minBodyVersion": "2.1.49",
    "releaseDate": "22-Oct-2025",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "SW"
  },
  "Project Transaction Wizard": {
    "header": "4.1.4",
    "body": "4.1.8",
    "minBodyVersion": "4.1.8",
    "releaseDate": "15-Apr-2025",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "TW"
  },
  "Upload Wizard": {
    "header": "3.0.1 ",
    "body": "4.0.0 ",
    "minBodyVersion": "1.0.1",
    "releaseDate": "21-Mar-2013",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "UW"
  },
  "Wizard Infrastructure for R12 (XML package)": {
    "header": "12.1.8 29-Nov-25",
    "body": "12.1.17 29 Nov 25",
    "minBodyVersion": "12.1.8",
    "releaseDate": "21-Jan-2026",
    "downloadUrl": "https://community.more4apps.com/s/ebs-toolbox-downloads",
    "code": "INFRA R12"
  }
};

/**
 * Get wizard name from package name
 */
function getWizardNameFromPackage(packageName) {
  try {
    if (!packageName) return 'Unknown Package';

    if (/^(?:APPS|BOLINF)\.M4APS_XML$/i.test(packageName)) {
      return 'Wizard Infrastructure for R12 (XML package)';
    }

    if (/^SERVLET$/i.test(packageName)) {
      return 'More4apps Servlet';
    }
    
    // Use the centralized mapping from productMapping.js
    const wizardName = getWizardName(packageName);
    
    // If we got back the original input, it means no mapping was found
    if (wizardName === packageName) {
      // Try to extract and format a readable name
      const cleanPackageName = packageName.replace(/^[A-Z_]+\./, '');
      let humanReadable = cleanPackageName
        .replace(/^M4APS_/, '')  // Remove M4APS_ prefix
        .replace(/_/g, ' ')      // Replace underscores with spaces
        .toLowerCase()           // Convert to lowercase
        .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize first letter of each word
      
      // Add "Wizard" if not already present and it looks like a wizard
      if (!humanReadable.includes('Wizard') && !humanReadable.includes('Core') && !humanReadable.includes('XML')) {
        humanReadable += ' Wizard';
      }
      
      return humanReadable;
    }
    
    return wizardName;
  } catch (error) {
    console.error('Error mapping package name:', error);
    return packageName || 'Unknown Package';
  }
}

/**
 * Compare two version strings
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
function compareVersions(v1, v2) {
  // Handle special cases
  if (v1 === v2) return 0;
  if (v1 === 'Not required' || v1 === 'N/A') return 0;
  if (v2 === 'Not required' || v2 === 'N/A') return 0;
  if (!v1 || v1 === 'Unknown') return -1;
  if (!v2 || v2 === 'Unknown') return 1;
  
  try {
    // Normalize versions by removing leading zeros and splitting
    const normalize = (v) => {
      return v.split('.').map(part => {
        // Remove any non-numeric characters and convert to number
        const num = parseInt(part.replace(/[^0-9]/g, ''), 10);
        return isNaN(num) ? 0 : num;
      });
    };
    
    const parts1 = normalize(v1);
    const parts2 = normalize(v2);
    const maxLength = Math.max(parts1.length, parts2.length);
    
    // Pad arrays to same length
    while (parts1.length < maxLength) parts1.push(0);
    while (parts2.length < maxLength) parts2.push(0);
    
    // Compare each part
    for (let i = 0; i < maxLength; i++) {
      if (parts1[i] > parts2[i]) return 1;
      if (parts1[i] < parts2[i]) return -1;
    }
    
    return 0;
  } catch (error) {
    console.error('Error comparing versions:', error);
    return 0;
  }
}

/**
 * Check package version against latest available version
 */
function isSharedComponentWizard(wizardName, packageName) {
  if (wizardName === 'Wizard Infrastructure for R12 (XML package)' || wizardName === 'More4apps Servlet') {
    return true;
  }

  if (/^(?:APPS|BOLINF)\.M4APS_XML$/i.test(packageName)) {
    return true;
  }

  return /^SERVLET$/i.test(packageName);
}

function checkPackageVersion(packageName, currentVersions) {
  try {
    const wizardName = getWizardNameFromPackage(packageName);
    let latestInfo = latestVersions[wizardName];
    if (!latestInfo && wizardName === 'Wizard Infrastructure for R12 (XML package)') {
      latestInfo = latestVersions['Wizard Infrastructure for R12 (XML package and servlet)'];
    }
    
    // Handle both old format (string) and new format (object with header/body)
    let currentBody;
    if (typeof currentVersions === 'string') {
      currentBody = cleanVersionString(currentVersions);
    } else if (currentVersions && typeof currentVersions === 'object') {
      currentBody = cleanVersionString(currentVersions.body) || 'Unknown';
    } else {
      currentBody = 'Unknown';
    }
    
    if (!latestInfo) {
      return {
        wizardName,
        packageName,
        status: 'Unknown',
        currentBody: currentBody,
        latestBody: 'Unknown',
        recommendation: 'No version information available for this wizard.',
        downloadUrl: 'https://community.more4apps.com/s/ebs-toolbox-downloads'
      };
    }
    
    const latestBody = cleanVersionString(latestInfo.body);
    const minBodyVersion = cleanVersionString(latestInfo.minBodyVersion || latestInfo.body); // Fallback to body if no minBodyVersion
    
    const isSharedComponent = isSharedComponentWizard(wizardName, packageName);

    // Special handling for "Not required" packages
    if (latestBody === 'Not required') {
      return {
        wizardName,
        packageName,
        status: 'Current',
        currentBody: currentBody,
        latestBody: 'Not required',
        minBodyVersion: 'Not required',
        recommendation: 'This wizard does not require Oracle database packages.',
        downloadUrl: latestInfo.downloadUrl,
        releaseDate: latestInfo.releaseDate
      };
    }
    
    // Compare versions: current vs minimum and current vs recommended
    const minCompare = compareVersions(currentBody, minBodyVersion);
    const bodyCompare = compareVersions(currentBody, latestBody);
    
    let status, recommendation;
    
    // Three-tier comparison logic:
    // 1. If below minimum -> Update Required
    // 2. If meets minimum but below recommended -> Update Recommended  
    // 3. If meets recommended -> Current
    if (latestBody === 'Unknown') {
      status = 'Unknown';
      recommendation = 'No latest version information available for comparison.';
    } else if (currentBody === 'Unknown') {
      status = 'Unknown';
      recommendation = 'No installed version information available for comparison.';
    } else {
      if (minCompare < 0) {
        // Below minimum version
        status = 'Update Required';
        recommendation = `Critical update required - Current version ${currentBody} is below minimum supported version ${minBodyVersion}. Latest: ${latestBody}. Released: ${latestInfo.releaseDate}`;
      } else if (bodyCompare < 0) {
        // Meets minimum but below recommended
        status = 'Update Recommended';
        recommendation = `Update recommended - Current version ${currentBody} meets minimum (${minBodyVersion}) but newer version available: ${latestBody}. Released: ${latestInfo.releaseDate}`;
      } else {
        // Meets or exceeds recommended version
        status = 'Current';
        recommendation = 'You have the latest version installed.';
      }
    }
    
    if (isSharedComponent) {
      status = 'Update Recommended';
      if (latestBody === 'Unknown') {
        recommendation = 'Update recommended for shared components.';
      } else {
        recommendation = `Update recommended - Installed version ${currentBody}. Recommended: ${latestBody}. Released: ${latestInfo.releaseDate}`;
      }
    }

    return {
      wizardName,
      packageName,
      status,
      currentBody,
      latestBody,
      minBodyVersion,
      recommendation,
      downloadUrl: latestInfo.downloadUrl,
      releaseDate: latestInfo.releaseDate
    };
  } catch (error) {
    console.error('Error checking package version:', error);
    const wizardName = getWizardNameFromPackage(packageName);
    
    // Handle both old format (string) and new format (object with header/body)
    let currentBody;
    if (typeof currentVersions === 'string') {
      currentBody = cleanVersionString(currentVersions) || 'Unknown';
    } else if (currentVersions && typeof currentVersions === 'object') {
      currentBody = cleanVersionString(currentVersions.body) || 'Unknown';
    } else {
      currentBody = 'Unknown';
    }
    
    return {
      wizardName,
      packageName,
      status: 'Error',
      currentBody,
      latestBody: 'Unknown',
      minBodyVersion: 'Unknown',
      recommendation: 'Error checking version information.',
      downloadUrl: 'https://community.more4apps.com/s/ebs-toolbox-downloads'
    };
  }
}

/**
 * Analyze multiple packages and provide summary
 */
function analyzePackageVersions(packages, installedVersions = [], sharedComponentsOverride = null) {
  if (!packages || packages.length === 0) {
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
  
  const results = packages.map(pkg => 
    checkPackageVersion(pkg.packageName, {
      body: pkg.body
    })
  );
  
  const summary = {
    total: results.length,
    current: results.filter(r => r.status === 'Current').length,
    outdated: results.filter(r => r.status === 'Update Required').length,
    recommended: results.filter(r => r.status === 'Update Recommended').length,
    newer: 0, // We don't track newer versions in this implementation
    unknown: results.filter(r => r.status === 'Unknown' || r.status === 'Error').length
  };
  
  const recommendations = [];
  
  // Get outdated packages for the frontend
  const outdatedPackages = results.filter(r => r.status === 'Update Required');
  
  // Add recommendations for updates (both required and recommended)
  const updatesNeeded = results.filter(r => r.status === 'Update Required' || r.status === 'Update Recommended');
  if (updatesNeeded.length > 0) {
    // Generate detailed update message
    const wizardsNeedingUpdates = updatesNeeded
      .map(r => r.wizardName)
      .filter(name => name !== 'Wizard Infrastructure for R12 (XML package)' && name !== 'More4apps Servlet');
    const wizardsUpToDate = results.filter(r => r.status === 'Current').map(r => r.wizardName);
    const outdatedPackagesTable = updatesNeeded.map(pkg => ({
      wizardName: pkg.wizardName,
      packageName: pkg.packageName,
      currentBody: pkg.currentBody,
      minBodyVersion: pkg.minBodyVersion,
      latestBody: pkg.latestBody,
      status: pkg.status,
      releaseDate: pkg.releaseDate,
      downloadUrl: pkg.downloadUrl
    }));
    const upToDatePackagesTable = results
      .filter(pkg => pkg.status === 'Current')
      .map(pkg => ({
        wizardName: pkg.wizardName,
        packageName: pkg.packageName,
        currentBody: pkg.currentBody,
        minBodyVersion: pkg.minBodyVersion,
        latestBody: pkg.latestBody,
        status: pkg.status,
        releaseDate: pkg.releaseDate,
        downloadUrl: pkg.downloadUrl
      }));
    
    const sharedComponents = sharedComponentsOverride && sharedComponentsOverride.length > 0
      ? sharedComponentsOverride
      : getSharedComponents(results);
    const detailedMessage = generateDetailedUpdateMessage(
      wizardsNeedingUpdates,
      wizardsUpToDate,
      outdatedPackagesTable,
      upToDatePackagesTable,
      installedVersions,
      sharedComponents
    );
    
    recommendations.push({
      type: 'updates',
      priority: 'high',
      message: `${updatesNeeded.length} wizard(s) have updates available.`,
      packages: wizardsNeedingUpdates,
      detailedMessage: detailedMessage,
      outdatedPackagesTable: outdatedPackagesTable
    });
  }
  
  // Add recommendation for unknown packages
  const unknownPackages = results.filter(r => r.status === 'Unknown' || r.status === 'Error');
  if (unknownPackages.length > 0) {
    recommendations.push({
      type: 'unknown',
      priority: 'medium',
      message: `${unknownPackages.length} package(s) could not be identified or analyzed.`,
      packages: unknownPackages.map(r => r.wizardName)
    });
  }
  
  // Add general recommendation if everything is current
  if (summary.current === summary.total && summary.total > 0) {
    recommendations.push({
      type: 'current',
      priority: 'low',
      message: 'All More4apps wizards are up to date.',
      packages: []
    });
  }
  
  return {
    summary,
    packages: results,
    outdatedPackages,
    recommendations
  };
}

function getSharedComponents(results) {
  if (!results || results.length === 0) {
    return [];
  }

  const components = [];
  const servletEntry = results.find(pkg => pkg.wizardName === 'More4apps Servlet' || pkg.packageName === 'SERVLET');
  if (servletEntry) {
    components.push({
      name: 'More4apps Servlet',
      version: servletEntry.currentBody || 'Unknown'
    });
  }

  const sharedPackageEntry = results.find(pkg =>
    pkg.wizardName === 'Wizard Infrastructure for R12 (XML package)' ||
    /^(?:APPS|BOLINF)\.M4APS_XML$/i.test(pkg.packageName)
  );
  if (sharedPackageEntry) {
    components.push({
      name: 'Shared Package',
      version: sharedPackageEntry.currentBody || 'Unknown'
    });
  }

  return components;
}

/**
 * Generate detailed update message for customers
 */
function generateDetailedUpdateMessage(
  wizardsNeedingUpdates,
  wizardsUpToDate,
  outdatedPackagesTable = [],
  upToDatePackagesTable = [],
  installedVersions = [],
  sharedComponents = []
) {
  let message = `Dear Customer,

Based on our analysis of your installed packages, we have identified the following information about your More4apps Wizard installations:

`;

  if (sharedComponents && sharedComponents.length > 0) {
    message += `SHARED COMPONENTS (Currently Installed):
===============================

`;

    sharedComponents.forEach(component => {
      const nameLabel = component.name || 'Unknown Component';
      const versionLabel = component.version || 'Unknown';
      const releaseLabel = component.releaseDate ? ` (Released ${component.releaseDate})` : '';
      message += `• ${nameLabel}: ${versionLabel}${releaseLabel}\n`;
    });

    message += `\n`;
  }

  if (installedVersions && installedVersions.length > 0) {
    message += `CURRENT INSTALLED VERSIONS (Most Common - Past 6 Months):
===============================

`;

    installedVersions.forEach(item => {
      const wizardLabel = item.wizardName || 'Unknown Wizard';
      const codeLabel = item.wizardCode ? ` (${item.wizardCode})` : '';
      const versionLabel = item.version || 'Unknown';
      const releaseLabel = item.releaseDate ? ` (Released ${item.releaseDate})` : '';
      message += `• ${wizardLabel}${codeLabel}: ${versionLabel}${releaseLabel}\n`;
    });

    message += `\n`;
  }

  // Add section for update recommendations summary
  if (outdatedPackagesTable.length > 0 || upToDatePackagesTable.length > 0) {
    message += `UPDATE RECOMMENDATIONS (Installed vs. Recommended):
=======================================

`;

    let summaryIndex = 1;
    outdatedPackagesTable.forEach(pkg => {
      const isSharedComponent = isSharedComponentWizard(pkg.wizardName, pkg.packageName || '');
      const hasNoRequirements = pkg.latestBody === 'Not required' || pkg.minBodyVersion === 'Not required';
      message += `${summaryIndex}. ${pkg.wizardName || 'Unknown Wizard'}\n`;
      message += `   Status:                 ${pkg.status || 'Unknown'}\n`;
      if (hasNoRequirements) {
        message += `   Package Requirements:  This wizard does not have any package requirements.\n`;
      } else {
        message += `   Installed Body Version:      ${pkg.currentBody || 'Unknown'}\n`;
        if (!isSharedComponent) {
          message += `   Minimum Body Version:        ${pkg.minBodyVersion || 'Not specified'}\n`;
        }
        message += `   Recommended Body Version:    ${pkg.latestBody || 'Unknown'}\n`;
      }
      message += '\n';
      summaryIndex += 1;
    });

    upToDatePackagesTable.forEach(pkg => {
      const isSharedComponent = isSharedComponentWizard(pkg.wizardName, pkg.packageName || '');
      const hasNoRequirements = pkg.latestBody === 'Not required' || pkg.minBodyVersion === 'Not required';
      message += `${summaryIndex}. ${pkg.wizardName || 'Unknown Wizard'}\n`;
      message += `   Status:                 ${pkg.status || 'Unknown'}\n`;
      if (hasNoRequirements) {
        message += `   Package Requirements:  This wizard does not have any package requirements.\n`;
      } else {
        message += `   Installed Body Version:      ${pkg.currentBody || 'Unknown'}\n`;
        if (!isSharedComponent) {
          message += `   Minimum Body Version:        ${pkg.minBodyVersion || 'Not specified'}\n`;
        }
        message += `   Recommended Body Version:    ${pkg.latestBody || 'Unknown'}\n`;
      }
      if (summaryIndex < outdatedPackagesTable.length + upToDatePackagesTable.length) {
        message += '\n';
      }
      summaryIndex += 1;
    });

    message += '\n';
  }

  // Add download instructions
  message += `Download Instructions:
=====================

Please follow these steps to update your wizards:

1. Download the Shared Installation Script to update the Shared Packages and follow the manual steps to complete the Servlet installation for your version of EBS
  Navigate to "EBS Toolbox">"User Guides">"Installation Guide"
  Direct link to Installation Guide: https://doc.ebsinstall.more4apps.com/ebs-installation-guide/1.1/index.html
  Notes:
  - The instructions are geared for First time Installation and some steps may not be required for your Update
  - An appserver bounce is required to update the Servlet. This update should be planned to be done in Production during a scheduled EBS Maintenance window.

2. Download the latest versions from the More4apps Community portal
  Navigate to "EBS Toolbox">"Downloads" to find the latest wizard packages.
  Link: https://community.more4apps.com/s/

3. Follow the installation guide for detailed instructions
  Installation Guide: https://doc.ebsinstall.more4apps.com/ebs-installation-guide/1.1/index.html

4. After installation, verify the versions are up to date


Important Notes:
================

• Please test all updates in a non-production environment first
• Follow the installation guide for best practices and troubleshooting
• If you encounter any issues, please contact More4apps support


Helpful Resources:
==================

The following More4apps Community Articles provide tips that you should find helpful for the Wizard updates:

- How to Copy your Connection URLs to a new Wizard
  https://community.more4apps.com/s/article/How-to-Copy-Your-Connection-URLs-into-a-New-WIzard

- How to Move or Copy Sheets to New Wizard
  https://community.more4apps.com/s/article/How-to-Move-or-Copy-Sheets-to-New-Wizard


Please let us know if you require any further assistance and we will be happy to help!


Best regards,
The More4apps Support Team`;

  return message;
}

module.exports = {
  getWizardNameFromPackage,
  compareVersions,
  checkPackageVersion,
  analyzePackageVersions,
  generateDetailedUpdateMessage,
  latestVersions
};
