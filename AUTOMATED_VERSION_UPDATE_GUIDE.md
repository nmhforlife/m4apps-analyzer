# More4Apps Automated Version Updater

## Overview

This automated workflow allows you to easily update the version checker data by extracting the latest product information directly from the More4Apps community site using a browser script.

## How It Works

1. **Lightning Table Extractor Script**: A JavaScript script that runs in your browser console to extract product data from the More4Apps community downloads page.
2. **Automated Processing**: The extracted JSON data is processed and automatically mapped to wizard names using the existing product mapping.
3. **Version Checker Update**: The `versionChecker.js` file is automatically updated with the latest version information.
4. **Backup Creation**: Original version checker file is backed up before any changes.

## Step-by-Step Instructions

### Method 1: Using the Dashboard UI (Recommended)

1. **Open Your Dashboard**
   - Navigate to your More4Apps Dashboard
   - The Version Updater component will be visible at the top

2. **Get the Extraction Script**
   - Click the "📜 Get Extractor Script" button
   - Copy the provided script to your clipboard

3. **Extract Data from Community Site**
   - Open a new browser tab and go to: https://community.more4apps.com/s/ebs-toolbox-downloads
   - Open Developer Tools (F12)
   - Go to the Console tab
   - Paste the script and press Enter
   - Wait for the JSON file to download automatically

4. **Upload and Process**
   - Return to your dashboard
   - Click "📥 Upload Extracted Data"
   - Either upload the JSON file or paste the JSON content
   - Click "🚀 Update Versions"
   - Wait for processing to complete

### Method 2: Command Line (Advanced)

1. **Extract Data**
   - Follow steps 2-3 from Method 1 to get the JSON file

2. **Run Version Updater**
   ```bash
   cd backend/utils
   node versionUpdater.js path/to/more4apps_catalog.json
   ```

## What Gets Updated

The automation updates the following version information:
- **Product Names**: Mapped to standardized wizard names
- **Header Versions**: Latest header package versions
- **Body Versions**: Latest body package versions  
- **Release Dates**: When each version was released
- **Download URLs**: Links to the community downloads page

## File Changes

- **Target File**: `backend/utils/versionChecker.js`
- **Backup Created**: `versionChecker.js.backup.[timestamp]`
- **Update Location**: The `latestVersions` object is replaced with new data

## Error Handling

### Common Issues

1. **"No tbody elements found"**
   - The table may still be loading
   - Try waiting a few seconds and running the script again

2. **"Invalid JSON format"**
   - Ensure you copied the entire JSON content
   - Check that the file downloaded completely

3. **"Could not find latestVersions object"**
   - The versionChecker.js file structure may have changed
   - Check that the file contains the expected `const latestVersions = {` declaration

### Troubleshooting

1. **Script Not Working in Browser**
   - Ensure you're on the correct More4Apps downloads page
   - Check that JavaScript is enabled
   - Try refreshing the page and running again

2. **Processing Fails**
   - Check the console logs for detailed error messages
   - Verify the JSON structure is valid
   - Ensure the backend server is running

3. **Backup and Recovery**
   - Backups are automatically created with timestamps
   - To restore: `cp versionChecker.js.backup.[timestamp] versionChecker.js`

## Manual Verification

After updating, you can verify the changes by:

1. **Check the Updated File**
   ```bash
   grep -A 5 "Updated automatically" backend/utils/versionChecker.js
   ```

2. **Test the Version Checker**
   - Upload a catalog to your dashboard
   - Check that version recommendations reflect the new data

3. **Compare Versions**
   - Look at the recommendations to see updated version comparisons
   - Verify that release dates are current

## Automation Frequency

- **Recommended**: Update monthly or when new versions are announced
- **Monitor**: More4Apps community announcements for new releases
- **Validate**: Always test in a development environment first

## Benefits

- ✅ **Accurate Data**: Direct extraction from official source
- ✅ **Time Saving**: Eliminates manual data entry
- ✅ **Consistent Format**: Automated mapping and formatting
- ✅ **Safe Updates**: Automatic backups before changes
- ✅ **Easy Integration**: Works with existing dashboard workflow

## Support

If you encounter issues:
1. Check the console logs for detailed error messages
2. Verify you're following the steps correctly
3. Ensure your browser allows the script to run
4. Check that the More4Apps community site structure hasn't changed

## Technical Details

### Script Components
- **Lightning Table Extractor**: Handles Salesforce Lightning Web Components
- **Version Processor**: Maps product codes to wizard names
- **File Updater**: Safely updates the version checker file

### Data Flow
```
Community Site → Browser Script → JSON Data → Version Processor → Updated Version Checker
```

### Security
- No sensitive data is transmitted
- All processing happens locally
- Backups ensure data safety
- Read-only access to community site