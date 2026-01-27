import React, { useState } from 'react';
import './VersionUpdater.css';

const VersionUpdater = ({ onVersionsUpdated, onManualEditClick }) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [extractorData, setExtractorData] = useState('');
  const [showExtractorModal, setShowExtractorModal] = useState(false);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [extractorScript, setExtractorScript] = useState('');
  const [updateResult, setUpdateResult] = useState(null);

  // Load the lightning extractor script
  const loadExtractorScript = async () => {
    try {
      const response = await fetch('/api/lightning-extractor-script');
      const result = await response.json();
      
      if (result.success) {
        setExtractorScript(result.script);
        setShowScriptModal(true);
      } else {
        alert('Failed to load extractor script: ' + result.error);
      }
    } catch (error) {
      console.error('Error loading extractor script:', error);
      alert('Error loading extractor script');
    }
  };

  // Copy script to clipboard
  const copyScriptToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(extractorScript);
      alert('Script copied to clipboard! Now paste it in the browser console at the More4Apps community site.');
    } catch (error) {
      console.error('Failed to copy script:', error);
      alert('Failed to copy script. Please select all and copy manually.');
    }
  };

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setExtractorData(e.target.result);
      };
      reader.readAsText(file);
    }
  };

  // Update versions from extractor data
  const updateVersionsFromExtractor = async () => {
    if (!extractorData) {
      alert('Please provide extracted data');
      return;
    }

    setIsUpdating(true);
    setUpdateResult(null);

    try {
      let parsedData;
      try {
        parsedData = JSON.parse(extractorData);
      } catch (parseError) {
        throw new Error('Invalid JSON format. Please ensure you uploaded the correct file.');
      }

      const response = await fetch('/api/update-versions-from-extractor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ extractedData: parsedData }),
      });

      const result = await response.json();

      if (result.success) {
        setUpdateResult({
          success: true,
          message: result.message,
          details: {
            updatedCount: result.updatedCount,
            totalProducts: result.totalProducts,
            extractedAt: result.extractedAt,
            backupPath: result.backupPath
          }
        });

        // Notify parent component
        if (onVersionsUpdated) {
          onVersionsUpdated(result);
        }

        // Clear the data
        setExtractorData('');
        
      } else {
        setUpdateResult({
          success: false,
          message: result.error,
          details: result.details
        });
      }
    } catch (error) {
      console.error('Error updating versions:', error);
      setUpdateResult({
        success: false,
        message: 'Failed to update versions',
        details: error.message
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="version-updater">
      <div className="updater-header">
        <h3>🔄 Version Management</h3>
        <p>Update version data automatically or manually edit individual versions</p>
      </div>

      <div className="updater-actions">
        <button
          className="action-btn primary"
          onClick={loadExtractorScript}
          disabled={isUpdating}
        >
          📜 Get Extractor Script
        </button>
        
        <button
          className="action-btn secondary"
          onClick={() => setShowExtractorModal(true)}
          disabled={isUpdating}
        >
          📥 Upload Extracted Data
        </button>
        
        <button
          className="action-btn manual"
          onClick={onManualEditClick}
          disabled={isUpdating}
          title="Manually edit version information"
        >
          ✏️ Manual Edit
        </button>
      </div>

      {/* Script Modal */}
      {showScriptModal && (
        <div className="modal-overlay" onClick={() => setShowScriptModal(false)}>
          <div className="modal-content script-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h4>Lightning Table Extractor Script</h4>
              <button className="close-btn" onClick={() => setShowScriptModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="instructions">
                <h5>📋 Instructions:</h5>
                <ol>
                  <li>Open <a href="https://community.more4apps.com/s/ebs-toolbox-downloads" target="_blank" rel="noopener noreferrer">More4Apps Downloads Page</a></li>
                  <li>Open Developer Tools (F12)</li>
                  <li>Go to the Console tab</li>
                  <li>Copy the script below and paste it in the console</li>
                  <li>Press Enter and wait for the JSON file to download</li>
                  <li>Return here and upload the JSON file</li>
                </ol>
              </div>
              
              <div className="script-container">
                <textarea
                  value={extractorScript}
                  readOnly
                  rows={15}
                  className="script-textarea"
                />
              </div>
              
              <div className="modal-actions">
                <button className="copy-btn" onClick={copyScriptToClipboard}>
                  📋 Copy Script to Clipboard
                </button>
                <button className="secondary-btn" onClick={() => setShowScriptModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Upload Modal */}
      {showExtractorModal && (
        <div className="modal-overlay" onClick={() => setShowExtractorModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h4>Upload Extracted Data</h4>
              <button className="close-btn" onClick={() => setShowExtractorModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="upload-section">
                <h5>📁 Upload JSON File:</h5>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="file-input"
                />
              </div>
              
              <div className="text-section">
                <h5>📝 Or Paste JSON Data:</h5>
                <textarea
                  value={extractorData}
                  onChange={(e) => setExtractorData(e.target.value)}
                  placeholder="Paste your extracted JSON data here..."
                  rows={10}
                  className="data-textarea"
                />
              </div>
              
              <div className="modal-actions">
                <button
                  className="update-btn"
                  onClick={updateVersionsFromExtractor}
                  disabled={!extractorData || isUpdating}
                >
                  {isUpdating ? '🔄 Updating...' : '🚀 Update Versions'}
                </button>
                <button className="secondary-btn" onClick={() => setShowExtractorModal(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Update Result */}
      {updateResult && (
        <div className={`update-result ${updateResult.success ? 'success' : 'error'}`}>
          <div className="result-header">
            <span className="result-icon">
              {updateResult.success ? '✅' : '❌'}
            </span>
            <span className="result-message">{updateResult.message}</span>
          </div>
          
          {updateResult.success && updateResult.details && (
            <div className="result-details">
              <p><strong>Updated Wizards:</strong> {updateResult.details.updatedCount}</p>
              <p><strong>Total Products:</strong> {updateResult.details.totalProducts}</p>
              <p><strong>Extracted At:</strong> {new Date(updateResult.details.extractedAt).toLocaleString()}</p>
              {updateResult.details.backupPath ? (
                <p><strong>Backup Created:</strong> {updateResult.details.backupPath.split('/').pop()}</p>
              ) : (
                <p><strong>Backup:</strong> No backup needed (no changes detected)</p>
              )}
              {updateResult.details.noChangesDetected && (
                <p><strong>Status:</strong> All version data is already current</p>
              )}
              {updateResult.details.newWizards && updateResult.details.newWizards.length > 0 && (
                <p><strong>New Wizards:</strong> {updateResult.details.newWizards.join(', ')}</p>
              )}
              {updateResult.details.changedWizards && updateResult.details.changedWizards.length > 0 && (
                <p><strong>Changed Wizards:</strong> {updateResult.details.changedWizards.join(', ')}</p>
              )}
            </div>
          )}
          
          {!updateResult.success && updateResult.details && (
            <div className="error-details">
              <p><strong>Error Details:</strong> {updateResult.details}</p>
            </div>
          )}
          
          <button 
            className="close-result-btn" 
            onClick={() => setUpdateResult(null)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default VersionUpdater;