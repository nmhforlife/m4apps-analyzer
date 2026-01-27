const moment = require('moment');

class CatalogParser {
  parse(fileContent, filename) {
    const lines = fileContent.split('\n').map(line => line.trim());
    
    const result = {
      filename,
      parseTimestamp: new Date().toISOString(),
      generalInfo: this.parseGeneralInfo(lines),
      databaseInfo: this.parseDatabaseInfo(lines),
      sessionLanguage: this.parseSessionLanguage(lines),
      initParameters: this.parseInitParameters(lines),
      installedLanguages: this.parseInstalledLanguages(lines),
      nodes: this.parseNodes(lines),
      dbNodes: this.parseDbNodes(lines),
      traceFiles: this.parseTraceFiles(lines),
      familyPacks: this.parseFamilyPacks(lines),
      m4apsPackages: this.parseM4apsPackages(lines),
      invalidObjects: this.parseInvalidObjects(lines),
      compilationErrors: this.parseCompilationErrors(lines),
      oodSynonyms: this.parseOodSynonyms(lines),
      servletVersion: this.parseServletVersion(lines),
      wizardConnections: this.parseWizardConnections(lines),
      securityViolations: this.parseSecurityViolations(lines),
      licenseKeys: this.parseLicenseKeys(lines)
    };

    return result;
  }

  parseGeneralInfo(lines) {
    const info = {};
    const startIndex = lines.findIndex(line => line === 'General Information');
    
    if (startIndex === -1) return info;

    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip empty lines but continue processing
      if (line === '') continue;
      
      // Stop when we reach the next section
      if (line.includes('Database Characterset')) break;
      
      // Match pattern like "     Instance:  AMRUTCDB"
      const match = line.match(/^\s*([^:]+):\s*(.+)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        if (key && value) {
          info[key] = value;
        }
      }
    }

    return info;
  }

  parseDatabaseInfo(lines) {
    const info = {};
    const startIndex = lines.findIndex(line => line.includes('Database Characterset'));
    
    if (startIndex === -1) return info;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('Session Language')) break;
      
      const parts = line.split('|');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts[1].trim();
        if (key && value) {
          info[key] = value;
        }
      }
    }

    return info;
  }

  parseSessionLanguage(lines) {
    const info = {};
    const startIndex = lines.findIndex(line => line.includes('Session Language'));
    
    if (startIndex === -1) return info;

    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('Initialization Parameters')) break;
      
      const parts = line.split('|');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts[1].trim();
        if (key && value) {
          info[key] = value;
        }
      }
    }

    return info;
  }

  parseInitParameters(lines) {
    const params = [];
    const startIndex = lines.findIndex(line => line.includes('Initialization Parameters'));
    
    if (startIndex === -1) return params;

    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('Installed Languages')) break;
      
      const parts = line.split('|');
      if (parts.length >= 3) {
        const param = parts[0].trim();
        const currentValue = parts[1].trim();
        const defaultValue = parts[2].trim();
        
        if (param && param !== '' && !param.includes('-')) {
          params.push({
            parameter: param,
            currentValue,
            defaultValue
          });
        }
      }
    }

    return params;
  }

  parseInstalledLanguages(lines) {
    const languages = [];
    const startIndex = lines.findIndex(line => line.includes('Language Code'));
    
    if (startIndex === -1) return languages;

    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line === '' || line.includes('Node') || line.includes('-----')) break;
      
      const parts = line.split('|');
      if (parts.length >= 3) {
        const code = parts[0].trim();
        const language = parts[1].trim();
        const flag = parts[2].trim();
        
        if (code && language) {
          languages.push({
            code,
            language,
            installedFlag: flag
          });
        }
      }
    }

    return languages;
  }

  parseNodes(lines) {
    const nodes = [];
    const startIndex = lines.findIndex(line => line.includes('Node') && line.includes('CP'));
    
    if (startIndex === -1) return nodes;

    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('DB Nodes') || line === '') break;
      
      const parts = line.split('|');
      if (parts.length >= 9) {
        const nodeName = parts[0].trim();
        if (nodeName && !nodeName.includes('-')) {
          nodes.push({
            node: nodeName,
            cp: parts[1].trim(),
            admin: parts[2].trim(),
            forms: parts[3].trim(),
            web: parts[4].trim(),
            db: parts[5].trim(),
            host: parts[6].trim(),
            webhost: parts[7].trim(),
            serverAddress: parts[8].trim(),
            mode: parts[9] ? parts[9].trim() : ''
          });
        }
      }
    }

    return nodes;
  }

  parseDbNodes(lines) {
    const nodes = [];
    const startIndex = lines.findIndex(line => line.includes('DB Nodes'));
    const headerIndex = lines.findIndex((line, index) => 
      index > startIndex && line.includes('HOST') && line.includes('Active')
    );
    
    if (headerIndex === -1) return nodes;

    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('Trace File') || line === '' || line.includes('-----')) break;
      
      const parts = line.split('|');
      if (parts.length >= 5) {
        const host = parts[0].trim();
        if (host && host !== '') {
          nodes.push({
            host,
            active: parts[1].trim(),
            dbStatus: parts[2].trim(),
            instance: parts[3].trim(),
            status: parts[4].trim(),
            version: parts[5] ? parts[5].trim() : ''
          });
        }
      }
    }

    return nodes;
  }

  parseTraceFiles(lines) {
    const traceFiles = [];
    const startIndex = lines.findIndex(line => line.includes('Trace File Locations'));
    const headerIndex = lines.findIndex((line, index) => 
      index > startIndex && line.includes('HOST') && line.includes('Trace File')
    );
    
    if (headerIndex === -1) return traceFiles;

    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('Family Packs') || line === '' || line.includes('-----')) break;
      
      const parts = line.split('|');
      if (parts.length >= 2) {
        const host = parts[0].trim();
        const location = parts[1].trim();
        if (host && location) {
          traceFiles.push({
            host,
            location
          });
        }
      }
    }

    return traceFiles;
  }

  parseFamilyPacks(lines) {
    const packs = [];
    const startIndex = lines.findIndex(line => line.includes('Family Packs'));
    const headerIndex = lines.findIndex((line, index) => 
      index > startIndex && line.includes('Abbreviation') && line.includes('Name')
    );
    
    if (headerIndex === -1) return packs;

    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('More4apps Package') || line === '' || line.includes('-----')) break;
      
      const parts = line.split('|');
      if (parts.length >= 3) {
        const abbr = parts[0].trim();
        const name = parts[1].trim();
        const codeLevel = parts[2].trim();
        
        if (abbr && name) {
          packs.push({
            abbreviation: abbr,
            name,
            codeLevel
          });
        }
      }
    }

    return packs;
  }

  parseM4apsPackages(lines) {
    const packages = [];
    const startIndex = lines.findIndex(line => line.includes('More4apps Package Versions'));
    
    if (startIndex === -1) {
      return packages;
    }

    const headerIndex = lines.findIndex((line, index) => 
      index > startIndex && line.includes('Package Name') && line.includes('Header')
    );
    
    if (headerIndex === -1) {
      return packages;
    }

    for (let i = headerIndex + 2; i < lines.length; i++) { // Skip header and separator line
      const line = lines[i];
      
      if (line.includes('rows selected') || line.includes('Invalid Objects') || line === '' || line.includes('-----')) {
        break;
      }
      
      const parts = line.split('|');
      if (parts.length >= 4) {
        const packageName = parts[0].trim();
        const header = parts[1].trim();
        const body = parts[2].trim();
        const hStatus = parts[3].trim();
        const bStatus = parts[4] ? parts[4].trim() : '';
        
          if (packageName && (packageName.startsWith('APPS.M4APS_') || packageName.startsWith('BOLINF.M4APS_'))) {
          packages.push({
            packageName,
            header,
            body,
            headerStatus: hStatus,
            bodyStatus: bStatus
          });
        }
      }
    }

    return packages;
  }

  parseInvalidObjects(lines) {
    const objects = [];
    const startIndex = lines.findIndex(line => line.includes('Invalid Objects'));
    
    if (startIndex === -1) return objects;

    const noRowsCheck = lines.find((line, index) => 
      index > startIndex && line.includes('no rows selected')
    );
    
    if (noRowsCheck) return objects;

    const headerIndex = lines.findIndex((line, index) => 
      index > startIndex && line.includes('OWNER') && line.includes('OBJECT_NAME')
    );
    
    if (headerIndex === -1) return objects;

    for (let i = headerIndex + 2; i < lines.length; i++) { // Skip header and separator line
      const line = lines[i];
      if (line.includes('Compilation Errors') || line === '' || line.includes('-----')) break;
      
      const parts = line.split('|');
      if (parts.length >= 3) {
        const owner = parts[0].trim();
        const objectName = parts[1].trim();
        const objectType = parts[2].trim();
        
        if (owner && objectName) {
          objects.push({
            owner,
            objectName,
            objectType
          });
        }
      }
    }

    return objects;
  }

  parseCompilationErrors(lines) {
    const errors = [];
    const startIndex = lines.findIndex(line => line.includes('Compilation Errors'));
    
    if (startIndex === -1) return errors;

    const noRowsCheck = lines.find((line, index) => 
      index > startIndex && line.includes('no rows selected')
    );
    
    if (noRowsCheck) return errors;

    const headerIndex = lines.findIndex((line, index) => 
      index > startIndex && line.includes('Package') && line.includes('Type')
    );
    
    if (headerIndex === -1) return errors;

    for (let i = headerIndex + 2; i < lines.length; i++) { // Skip header and separator line
      const line = lines[i];
      if (line.includes('OOD Synonyms') || line === '' || line.includes('-----')) break;
      
      const parts = line.split('|');
      if (parts.length >= 4) {
        const packageName = parts[0].trim();
        const type = parts[1].trim();
        const lineNum = parts[2].trim();
        const error = parts[3].trim();
        
        if (packageName && error) {
          errors.push({
            package: packageName,
            type,
            line: lineNum,
            error
          });
        }
      }
    }

    return errors;
  }

  parseOodSynonyms(lines) {
    const synonyms = [];
    const startIndex = lines.findIndex(line => line.includes('OOD Synonyms'));
    
    // Check for "no rows selected"
    const noRowsCheck = lines.find((line, index) => 
      index > startIndex && line.includes('no rows selected')
    );
    
    if (noRowsCheck) return synonyms;

    // If there are rows, parse them (implementation would go here)
    return synonyms;
  }

  parseServletVersion(lines) {
    const startIndex = lines.findIndex(line => line.includes('Servlet Version'));
    
    if (startIndex === -1) return null;

    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('-----')) continue;
      if (line.includes('Wizard Connections') || line === '') break;
      
      if (line.trim() !== '') {
        return line.trim();
      }
    }

    return null;
  }

  parseWizardConnections(lines) {
    const connections = [];
    const startIndex = lines.findIndex(line => line.includes('Wizard Connections'));
    
    if (startIndex === -1) return connections;
    
    const headerIndex = lines.findIndex((line, index) => 
      index > startIndex && line.includes('Wizard Version') && line.includes('Servlet Version')
    );
    
    if (headerIndex === -1) return connections;

    for (let i = headerIndex + 2; i < lines.length; i++) { // Skip header and separator line
      const line = lines[i];
      if (line.includes('rows selected') || line.includes('Security Violations') || line === '' || line.includes('-----')) break;
      
      const parts = line.split('|');
      if (parts.length >= 4) {
        const wizardVersion = parts[0].trim();
        const servletVersion = parts[1].trim();
        const connectionDate = parts[2].trim();
        const username = parts[3].trim();
        const responsibility = parts[4] ? parts[4].trim() : '';
        
        if (wizardVersion && username) {
          connections.push({
            wizardVersion,
            servletVersion,
            connectionDate,
            username,
            responsibility
          });
        }
      }
    }

    return connections;
  }

  parseSecurityViolations(lines) {
    const violations = [];
    const startIndex = lines.findIndex(line => line.includes('Security Violations'));
    
    // Check for "no rows selected"
    const noRowsCheck = lines.find((line, index) => 
      index > startIndex && line.includes('no rows selected')
    );
    
    if (noRowsCheck) return violations;

    // If there are rows, parse them (implementation would go here)
    return violations;
  }

  parseLicenseKeys(lines) {
    const keys = [];
    const startIndex = lines.findIndex(line => line.trim().includes('License KEYS'));
    
    if (startIndex === -1) return keys;

    // Look for lines that contain M4APS license information
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Stop if we hit another major section
      if (line.includes('Database') || line.includes('Instance Info') || line.includes('Node Configuration')) {
        break;
      }
      
      // Skip headers and separators
      if (line.includes('License Name') || line.includes('---') || line === '') continue;
      
      const parts = line.split('|');
      if (parts.length >= 2) {
        const licenseName = parts[0].trim();
        const key = parts[1].trim();
        
        // Only include lines that have a complete license name ending with _KEY
        if (licenseName && key && licenseName.includes('M4APS') && licenseName.includes('_KEY')) {
          keys.push({
            licenseName,
            key
          });
        }
      }
    }

    return keys;
  }
}

module.exports = new CatalogParser();