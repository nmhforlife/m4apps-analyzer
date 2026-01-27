import React, { useState, useCallback, useMemo } from 'react';
import { 
    Box, Card, CardContent, Collapse, Typography, IconButton, 
    Alert, Snackbar, Button, Grid, Chip, Paper, 
    TableContainer, Table, TableHead, TableBody, TableRow, TableCell 
} from '@mui/material';

// --- MUI Icon Imports ---
import {
    Info as InfoIcon,
    CloudUpload as CloudUploadIcon,
    Close as CloseIcon,
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    Error as ErrorIcon,
    Warning as WarningIcon,
    BugReport as BugReportIcon,
    ContentCopy as ContentCopyIcon,
    Settings as SettingsIcon,
    AccessTime as AccessTimeIcon,
    BarChart as BarChartIcon
} from '@mui/icons-material';

// =========================================================================
// 1. IMPROVED HELPER FUNCTIONS (PARSING & CLASSIFICATION)
// =========================================================================

/**
 * Classifies an error/log detail based on content heuristics.
 * Now explicitly looks for Oracle errors found in the sample data.
 * @param {string} details
 * @param {string} action
 * @returns {{hasErrors: boolean, severity: 'error'|'warning'|'info', errorTypes: string[]}}
 */
const classifyError = (details, action) => {
    let hasErrors = false;
    let severity = 'info';
    const errorTypes = [];

    // Explicitly check for critical Oracle PL/SQL errors
    if (/ORA-\d+|PLS-\d+/i.test(details)) {
        hasErrors = true;
        severity = 'error';
        errorTypes.push('Database/PLSQL Error');
        const oraMatch = details.match(/(ORA-\d+)/i);
        if (oraMatch) errorTypes.push(oraMatch[1]);
        const plsMatch = details.match(/(PLS-\d+)/i);
        if (plsMatch) errorTypes.push(plsMatch[1]);
    }
    // Check for XML/Parse Errors
    else if (/XML Parse Error/i.test(action) || /Parse Error|Compilation Errors/i.test(details)) {
        hasErrors = true;
        severity = 'error';
        errorTypes.push('Data/Parse Error');
    }
    // Check for Session/Authentication issues
    else if (/Session Expired|NOT Logged in/i.test(action) || /Guest user/i.test(details)) {
        hasErrors = true;
        severity = 'warning';
        errorTypes.push('Session/Auth Issue');
    }
    // General runtime errors (often less severe than database)
    else if (/runtime error/i.test(details) || /error\s*\d+/i.test(details)) {
        hasErrors = true;
        severity = 'warning';
        errorTypes.push('Runtime Error');
    }
    
    // Add specific component errors (M4APS_SOW)
    if (details.includes('M4APS_SOW')) {
        errorTypes.push('More4apps SOW');
    }

    return { hasErrors, severity, errorTypes: [...new Set(errorTypes)] };
};

/**
 * Robustly splits a tab-separated line, respecting quotes for multi-line details.
 * NOTE: This is a simplified split and is still the most brittle part of the component.
 * @param {string} row - The raw log line.
 * @returns {string[]} - Array of 3 parts: [Timestamp, Action, Details].
 */
const splitLogLine = (row) => {
    const parts = row.split('\t');
    if (parts.length < 3) return null;

    let [timestamp, action, details] = [parts[0], parts[1], parts.slice(2).join('\t')];
    
    // Clean up quotes from the details block if present
    if (details.startsWith('"') && details.endsWith('"')) {
        details = details.slice(1, -1);
    }
    
    return [timestamp.trim(), action.trim(), details.trim()];
};

/**
 * Parses the raw log data into an array of structured entries.
 * @param {string} data - Raw pasted log data.
 * @returns {Array} - Parsed log entries.
 */
const parseErrorLogData = (data) => {
    if (!data.trim()) return [];

    const lines = data.split(/\r?\n/).filter(l => l.trim() !== '');
    const parsedRows = [];
    let id = 1;

    // Skip header and look for the first line that looks like a log entry
    let startIndex = lines.findIndex(l => /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(l.trim()));
    if (startIndex === -1) return [];

    let currentEntry = [];
    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];
        const isNewEntry = /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(line.trim());
        
        if (isNewEntry) {
            // Process the previous entry buffer
            if (currentEntry.length > 0) {
                const parts = splitLogLine(currentEntry.join('\n'));
                if (parts) {
                    const [timestamp, action, details] = parts;
                    const errorInfo = classifyError(details, action);
                    parsedRows.push({
                        id: id++,
                        timestamp: new Date(timestamp) || new Date(),
                        action,
                        details,
                        errorInfo
                    });
                }
            }
            // Start new entry buffer
            currentEntry = [line];
        } else if (currentEntry.length > 0) {
            // Append continuation lines to the current entry (for multiline details)
            currentEntry.push(line);
        }
    }

    // Process the final entry
    if (currentEntry.length > 0) {
        const parts = splitLogLine(currentEntry.join('\n'));
        if (parts) {
            const [timestamp, action, details] = parts;
            const errorInfo = classifyError(details, action);
            parsedRows.push({
                id: id++,
                timestamp: new Date(timestamp) || new Date(),
                action,
                details,
                errorInfo
            });
        }
    }

    return parsedRows;
};


/**
 * Extracts and structures the Installation & Connection Details block from raw text.
 * @param {Array} parsedErrors - The array of parsed log entries.
 * @returns {{timestamp: string, action: string, sections: Object}|null}
 */
const extractInstallationDetails = (parsedErrors) => {
    // 1. Find the entry containing the Installation Details text
    const installationEntry = parsedErrors.find(e => /Installation\s*&\s*Connection Details/i.test(e.details));

    if (!installationEntry) return null;

    const rawBlock = installationEntry.details;
    const sections = {};
    let currentSection = 'General';

    // 2. Parse the block into sections and key-value pairs
    for (const line of rawBlock.split(/\r?\n/)) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        // Check for section headers (lines ending with dashes, or specific header titles)
        if (/^-{3,}\s*$/i.test(trimmedLine) || /details|information/i.test(trimmedLine)) {
            // New section header
            // Use line before dashes for title, or specific words like 'Licence Information'
            const sectionMatch = trimmedLine.match(/([A-Z][\w\s&]+?)\s*-{3,}/i);
            currentSection = sectionMatch ? sectionMatch[1].trim() : trimmedLine.replace(/[-]+/g, '').trim() || 'General';
            
            // Normalize common headers
            if (currentSection.toLowerCase().includes('installation')) currentSection = 'Installation & Connection Details';
            if (currentSection.toLowerCase().includes('licence')) currentSection = 'Licence Information';
            if (currentSection.toLowerCase().includes('windows')) currentSection = 'Windows / Excel Versions';
            if (currentSection.toLowerCase().includes('catalog')) currentSection = 'Catalog Information';
            
            if (!sections[currentSection]) sections[currentSection] = {}; 
            continue;
        }

        // Parse Key-Value pair (look for the first colon or tab)
        const parts = trimmedLine.split(/:\s*|\t/, 2).map(p => p.trim());
        if (parts.length === 2 && parts[0].length > 0) {
            sections[currentSection][parts[0]] = parts[1];
        } else if (parts.length === 1 && trimmedLine.includes('=>')) {
             // Handle PL/SQL initialization strings like "user_id=> 5624"
             const plsqlMatch = trimmedLine.match(/(\w+)\s*=>\s*(.*)/i);
             if (plsqlMatch) {
                 sections[currentSection][plsqlMatch[1]] = plsqlMatch[2];
             }
        } else {
            // Handle lists or block text that isn't key-value (e.g., Initialise Session String block)
            if (!sections[currentSection]['Raw_Text']) sections[currentSection]['Raw_Text'] = [];
            sections[currentSection]['Raw_Text'].push(trimmedLine);
        }
    }

    return {
        timestamp: installationEntry.timestamp.toLocaleString(),
        action: installationEntry.action,
        sections
    };
};


/**
 * Calculates statistics based on parsed errors.
 * @param {Array} parsedErrors
 * @returns {Object} Statistics summary.
 */
const getErrorStatistics = (parsedErrors) => {
    if (!parsedErrors || parsedErrors.length === 0) return {};

    const actions = new Set();
    const typeCounts = { error: 0, warning: 0, info: 0 };
    const errorTypeCounts = {};

    let minTime = parsedErrors[0].timestamp;
    let maxTime = parsedErrors[0].timestamp;

    for (const error of parsedErrors) {
        actions.add(error.action);
        const time = error.timestamp;
        
        if (time < minTime) minTime = time;
        if (time > maxTime) maxTime = time;

        const severity = error.errorInfo?.severity || 'info';
        typeCounts[severity] = (typeCounts[severity] || 0) + 1;
        
        for (const type of error.errorInfo?.errorTypes || []) {
            errorTypeCounts[type] = (errorTypeCounts[type] || 0) + 1;
        }
    }

    const durationMs = maxTime.getTime() - minTime.getTime();
    const durationMinutes = Math.round(durationMs / (1000 * 60));
    const totalEntries = parsedErrors.length;
    const avgEntriesPerMinute = durationMinutes > 0 ? (totalEntries / durationMinutes).toFixed(2) : totalEntries;

    return {
        totalEntries,
        uniqueActions: actions.size,
        durationMinutes,
        avgEntriesPerMinute,
        typeCounts,
        errorTypeCounts,
        timeRange: { start: minTime, end: maxTime }
    };
};


// =========================================================================
// 2. MAIN REACT COMPONENT
// =========================================================================

function ErrorLogAnalyzer() {
    const [errorLogData, setErrorLogData] = useState('');
    const [parsedErrors, setParsedErrors] = useState([]);
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [copySuccess, setCopySuccess] = useState(false);
    const [copiedText, setCopiedText] = useState('');
    const [errorAnalysisOpen, setErrorAnalysisOpen] = useState(true);
    const [installationDetails, setInstallationDetails] = useState(null);
    const [visibleErrorTypes, setVisibleErrorTypes] = useState(new Set(['error', 'warning', 'info'])); // New state for filtering

    // Helper function to toggle row expansion (using useCallback for performance)
    const toggleRowExpansion = useCallback((errorId) => {
        setExpandedRows(prev => {
            const newSet = new Set(prev);
            if (newSet.has(errorId)) {
                newSet.delete(errorId);
            } else {
                newSet.add(errorId);
            }
            return newSet;
        });
    }, []);

    // Helper function to copy text to clipboard (using useCallback for performance)
    const copyToClipboard = useCallback(async (text, id) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedText(`Details for ID ${id} copied`);
            setCopySuccess(true);
        } catch (error) {
            console.error('Failed to copy text:', error);
            setCopiedText('Failed to copy');
            setCopySuccess(true);
        }
    }, []);

    // Export errors to CSV (using useCallback for performance)
    const exportErrorsToCSV = useCallback(() => {
        if (!parsedErrors.length) return;
        
        const headers = ['Timestamp', 'Action', 'Details', 'Error Types', 'Severity'];
        const csvData = [
            headers.join('\t'), // Use tab delimiter for better compatibility with Excel
            ...parsedErrors.map(error => [
                error.timestamp.toLocaleString('en-US', { timeZoneName: 'short' }),
                // Escape quotes within fields and wrap in quotes (TSV standard)
                `"${error.action.replace(/"/g, '""')}"`,
                `"${error.details.replace(/"/g, '""')}"`,
                `"${error.errorInfo?.errorTypes.join('; ').replace(/"/g, '""') || ''}"`,
                error.errorInfo?.severity || 'info'
            ].join('\t'))
        ].join('\n');
        
        const blob = new Blob([csvData], { type: 'text/tab-separated-values;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `error_log_analysis_${new Date().toISOString().split('T')[0]}.tsv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [parsedErrors]);

    // Handle error log paste (using useCallback for performance)
    const handleErrorLogPaste = useCallback((event) => {
        const pastedData = event.target.value;
        setErrorLogData(pastedData);

        if (pastedData.trim()) {
            const parsed = parseErrorLogData(pastedData);
            setParsedErrors(parsed);
            
            // Extract installation details only after successful parsing
            const installation = extractInstallationDetails(parsed);
            setInstallationDetails(installation);
        } else {
            setParsedErrors([]);
            setInstallationDetails(null);
        }
    }, []);

    // Get statistics (useMemo to only re-calculate when parsedErrors changes)
    const stats = useMemo(() => {
        if (!parsedErrors || parsedErrors.length === 0) {
            return {
                totalEntries: 0,
                uniqueActions: 0,
                durationMinutes: 0,
                avgEntriesPerMinute: 0,
                typeCounts: { error: 0, warning: 0, info: 0 },
                errorTypeCounts: {},
                timeRange: { start: new Date(), end: new Date() }
            };
        }
        return getErrorStatistics(parsedErrors);
    }, [parsedErrors]);
    
    // --- Render Helpers ---
    const getSeverityIcon = (severity) => {
        switch (severity) {
            case 'error': return <ErrorIcon color="error" fontSize="small" />;
            case 'warning': return <WarningIcon color="warning" fontSize="small" />;
            default: return <InfoIcon color="info" fontSize="small" />;
        }
    };
    
    // MUI color map utility
    const getMuiColor = (severity) => {
        if (severity === 'error') return 'error';
        if (severity === 'warning') return 'warning';
        return 'info';
    };

    // Helper function to toggle visibility of error types
    const toggleErrorTypeVisibility = useCallback((type) => {
        setVisibleErrorTypes(prev => {
            const newSet = new Set(prev);
            if (newSet.has(type)) {
                newSet.delete(type);
            } else {
                newSet.add(type);
            }
            return newSet;
        });
    }, []);

    return (
        <Box sx={{ p: 3, maxWidth: '100%', mx: 'auto' }}>
            <Card elevation={3}>
                <CardContent>
                    {/* Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <BugReportIcon color="primary" sx={{ fontSize: 28 }} />
                            <Typography variant="h5" component="h1" fontWeight="bold">
                                Error Log Analyzer
                            </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button
                                variant="outlined"
                                onClick={() => setErrorAnalysisOpen(!errorAnalysisOpen)}
                                startIcon={errorAnalysisOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                            >
                                {errorAnalysisOpen ? 'Hide' : 'Show'} Analyzer
                            </Button>
                        </Box>
                    </Box>

                    <Collapse in={errorAnalysisOpen}>
                        <Box>
                            {/* Log Paste Area */}
                            <Box sx={{ padding: 2, mb: 2 }}>
                                <Typography variant="subtitle1" color="textSecondary" gutterBottom>
                                    Paste your error log data below: Expected format: Timestamp, Action, Details
                                </Typography>
                                <Card variant="outlined">
                                    <CardContent>
                                        <Typography variant="body2" color="textSecondary">
                                            Supports **tab-separated** data. Data should start with a timestamp column.
                                        </Typography>
                                        <Box sx={{ marginTop: 2 }}>
                                            <textarea
                                                placeholder="Paste your error log data here (tab-separated: Timestamp, Action, Details)..."
                                                style={{ 
                                                    width: '100%', 
                                                    height: '150px', 
                                                    padding: '10px', 
                                                    borderRadius: '4px', 
                                                    border: '1px solid #ccc',
                                                    fontFamily: 'monospace'
                                                }}
                                                value={errorLogData}
                                                onChange={handleErrorLogPaste}
                                            />
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Box>

                            {/* Action Buttons & Statistics Overview */}
                            {parsedErrors.length > 0 && (
                                <Box sx={{ mb: 3 }}>
                                    <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={exportErrorsToCSV}
                                            startIcon={<CloudUploadIcon />}
                                        >
                                            Export TSV ({parsedErrors.length} rows)
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={() => {
                                                setErrorLogData('');
                                                setParsedErrors([]);
                                                setInstallationDetails(null);
                                                setExpandedRows(new Set());
                                            }}
                                            startIcon={<CloseIcon />}
                                            color="error"
                                        >
                                            Clear Data
                                        </Button>
                                    </Box>

                                    {/* Statistics Card (IMPROVEMENT 3) */}
                                    <Card variant="outlined" sx={{ bgcolor: 'action.hover' }}>
                                        <CardContent>
                                            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}><BarChartIcon fontSize="small" /> Analysis Summary</Typography>
                                            <Grid container spacing={2}>
                                                <Grid item xs={6} md={3}>
                                                    <Typography variant="body2" color="textSecondary">Total Entries</Typography>
                                                    <Typography variant="h5" fontWeight="bold">{stats.totalEntries}</Typography>
                                                </Grid>
                                                <Grid item xs={6} md={3}>
                                                    <Typography variant="body2" color="textSecondary">Log Duration</Typography>
                                                    <Typography variant="h5" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <AccessTimeIcon fontSize="small" />
                                                        {stats.durationMinutes > 0 ? `${stats.durationMinutes} min` : 'N/A'}
                                                    </Typography>
                                                </Grid>
                                                <Grid item xs={12} md={6}>
                                                    <Typography variant="body2" color="textSecondary">Error Breakdown</Typography>
                                                    <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                                                        <Chip 
                                                          label={`Errors: ${stats.typeCounts.error}`} 
                                                          size="small" 
                                                          color="error" 
                                                          variant={visibleErrorTypes.has('error') ? "filled" : "outlined"} 
                                                          onClick={() => toggleErrorTypeVisibility('error')} 
                                                          clickable 
                                                        />
                                                        <Chip 
                                                          label={`Warnings: ${stats.typeCounts.warning}`} 
                                                          size="small" 
                                                          color="warning" 
                                                          variant={visibleErrorTypes.has('warning') ? "filled" : "outlined"} 
                                                          onClick={() => toggleErrorTypeVisibility('warning')} 
                                                          clickable 
                                                        />
                                                        <Chip 
                                                          label={`Info: ${stats.typeCounts.info}`} 
                                                          size="small" 
                                                          color="info" 
                                                          variant={visibleErrorTypes.has('info') ? "filled" : "outlined"} 
                                                          onClick={() => toggleErrorTypeVisibility('info')} 
                                                          clickable 
                                                        />
                                                    </Box>
                                                </Grid>
                                            </Grid>
                                        </CardContent>
                                    </Card>
                                </Box>
                            )}

                            {/* Installation & Connection Details */}
                            {installationDetails && (
                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><SettingsIcon fontSize="small" /> Installation & Connection Details</Typography>
                                    <Card variant="outlined">
                                        <CardContent>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                                <Typography variant="subtitle2" color="text.secondary">
                                                    Detected at: {installationDetails.timestamp}
                                                </Typography>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => copyToClipboard(JSON.stringify(installationDetails.sections, null, 2), 'installation')}
                                                    title="Copy installation details to clipboard"
                                                >
                                                    <ContentCopyIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                            
                                            <Grid container spacing={2}>
                                                {Object.entries(installationDetails.sections).map(([sectionName, sectionData]) => (
                                                    <Grid item xs={12} md={6} key={sectionName}>
                                                        <Box sx={{ mb: 2 }}>
                                                            <Typography variant="h6" sx={{ borderBottom: '1px solid', borderColor: 'divider', pb: 0.5, fontSize: '1.05rem' }}>
                                                                {sectionName}
                                                            </Typography>
                                                            <Box sx={{ pl: 1 }}>
                                                                {/* Map properties/key-value pairs */}
                                                                {Object.entries(sectionData).map(([key, value]) => (
                                                                    <Typography 
                                                                        key={key} 
                                                                        variant="body2" 
                                                                        sx={{ 
                                                                            fontFamily: 'monospace',
                                                                            fontSize: '11px',
                                                                            mb: 0.5,
                                                                            wordBreak: 'break-word',
                                                                            whiteSpace: 'pre-wrap' // Preserve formatting
                                                                        }}
                                                                    >
                                                                        **{key}:** {Array.isArray(value) ? value.join('\n') : value}
                                                                    </Typography>
                                                                ))}
                                                            </Box>
                                                        </Box>
                                                    </Grid>
                                                ))}
                                            </Grid>
                                        </CardContent>
                                    </Card>
                                </Box>
                            )}

                            {/* Error Details Table */}
                            {parsedErrors.length > 0 && (
                                <Box>
                                    <Typography variant="subtitle1" gutterBottom>
                                        Error Details ({parsedErrors.length} entries)
                                    </Typography>
                                    <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
                                        <Table stickyHeader size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ width: '15%' }}>Timestamp</TableCell>
                                                    <TableCell sx={{ width: '25%' }}>Action</TableCell>
                                                    <TableCell sx={{ width: '50%' }}>Details</TableCell>
                                                    <TableCell sx={{ width: '10%' }}>Severity</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {parsedErrors.filter(error => visibleErrorTypes.has(error.errorInfo?.severity || 'info')).map((error) => {
                                                    const hasClassification = error.errorInfo && error.errorInfo.hasErrors;
                                                    const errorSeverity = error.errorInfo?.severity || 'info';
                                                    
                                                    return (
                                                        <TableRow key={error.id} hover>
                                                            <TableCell>
                                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                    {getSeverityIcon(errorSeverity)}
                                                                    <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                                                                        {error.timestamp.toLocaleString()}
                                                                    </Typography>
                                                                </Box>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                                                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                                                                        {error.action}
                                                                    </Typography>
                                                                    {error.errorInfo.errorTypes.length > 0 && (
                                                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                                            {error.errorInfo.errorTypes.map((errorType, idx) => (
                                                                                <Chip
                                                                                    key={idx}
                                                                                    label={errorType}
                                                                                    size="small"
                                                                                    variant="outlined"
                                                                                    color={getMuiColor(errorSeverity)}
                                                                                    sx={{ fontSize: '10px', height: 18 }}
                                                                                />
                                                                            ))}
                                                                        </Box>
                                                                    )}
                                                                </Box>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Box sx={{ maxWidth: 500 }}>
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                                        <IconButton
                                                                            size="small"
                                                                            onClick={() => toggleRowExpansion(error.id)}
                                                                            sx={{ p: 0.5 }}
                                                                            title={expandedRows.has(error.id) ? 'Collapse Details' : 'Expand Details'}
                                                                        >
                                                                            {expandedRows.has(error.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                                                                        </IconButton>
                                                                        <IconButton
                                                                            size="small"
                                                                            onClick={() => copyToClipboard(error.details, error.id)}
                                                                            sx={{ p: 0.5 }}
                                                                            title="Copy details to clipboard"
                                                                        >
                                                                            <ContentCopyIcon fontSize="small" />
                                                                        </IconButton>
                                                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
                                                                            {error.details.length} chars
                                                                        </Typography>
                                                                    </Box>
                                                                    
                                                                    {/* Shortened preview (when collapsed) */}
                                                                    {!expandedRows.has(error.id) && (
                                                                        <Typography 
                                                                            variant="caption" 
                                                                            sx={{ 
                                                                                fontFamily: 'monospace', 
                                                                                fontSize: '11px',
                                                                                display: '-webkit-box',
                                                                                WebkitLineClamp: 3,
                                                                                WebkitBoxOrient: 'vertical',
                                                                                overflow: 'hidden',
                                                                                wordBreak: 'break-word'
                                                                            }}
                                                                        >
                                                                            {error.details}
                                                                        </Typography>
                                                                    )}

                                                                    {/* Full detail view (IMPROVEMENT 4 - uses Collapse) */}
                                                                    <Collapse in={expandedRows.has(error.id)}>
                                                                        <Typography 
                                                                            variant="caption" 
                                                                            component="pre" // Use pre to ensure line breaks are respected
                                                                            sx={{ 
                                                                                fontFamily: 'monospace', 
                                                                                fontSize: '11px',
                                                                                whiteSpace: 'pre-wrap', // Preserve line breaks and wraps
                                                                                wordBreak: 'break-word'
                                                                            }}
                                                                        >
                                                                            {error.details}
                                                                        </Typography>
                                                                    </Collapse>
                                                                </Box>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Chip
                                                                    label={errorSeverity.toUpperCase()}
                                                                    size="small"
                                                                    color={getMuiColor(errorSeverity)}
                                                                    variant="filled"
                                                                />
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>
                            )}

                            {/* No data message */}
                            {parsedErrors.length === 0 && errorLogData.trim() === '' && (
                                <Alert severity="info" sx={{ mt: 2 }}>
                                    <Typography variant="body2">
                                        Paste your error log data above to begin analysis. The tool will automatically detect error patterns, 
                                        classify severity levels, and extract configuration details.
                                    </Typography>
                                </Alert>
                            )}

                            {/* Parse error message */}
                            {parsedErrors.length === 0 && errorLogData.trim() !== '' && (
                                <Alert severity="warning" sx={{ mt: 2 }}>
                                    <Typography variant="body2">
                                        Unable to parse the provided data. Please ensure your data follows the expected format:
                                        <br />
                                        <code>Timestamp &lt;tab&gt; Action &lt;tab&gt; Details</code>. Ensure multi-line details are quoted correctly.
                                    </Typography>
                                </Alert>
                            )}
                        </Box>
                    </Collapse>
                </CardContent>
            </Card>

            {/* Copy Success Notification */}
            <Snackbar
                open={copySuccess}
                autoHideDuration={2000}
                onClose={() => setCopySuccess(false)}
                message={copiedText}
                action={
                    <IconButton
                        size="small"
                        aria-label="close"
                        color="inherit"
                        onClick={() => setCopySuccess(false)}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                }
            />
        </Box>
    );
    
}

export default ErrorLogAnalyzer;