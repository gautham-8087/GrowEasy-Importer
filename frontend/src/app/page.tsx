'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Sun, Moon, Database, Play, RotateCcw, AlertTriangle, CheckCircle2, RefreshCw } from 'lucide-react';
import FileUpload from '@/components/FileUpload';
import CsvPreviewTable from '@/components/CsvPreviewTable';
import CrmResultTable from '@/components/CrmResultTable';
import ApiKeyModal from '@/components/ApiKeyModal';
import styles from './page.module.css';

const BATCH_SIZE = 15;
const MAX_RETRIES = 3;

interface CrmLead {
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: string;
  crm_note: string;
  data_source: string;
  possession_time: string;
  description: string;
}

interface ExtractionResult {
  is_skipped: boolean;
  mapped_record: CrmLead | null;
  raw_record?: any;
}

type Step = 'UPLOAD' | 'PREVIEW' | 'IMPORTING' | 'RESULTS';

export default function Home() {
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  
  // CSV source data
  const [csvData, setCsvData] = useState<{
    headers: string[];
    rows: any[];
    filename: string;
    rowCount: number;
  } | null>(null);

  // App step flow
  const [step, setStep] = useState<Step>('UPLOAD');
  
  // Modal toggle
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Processing states
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [totalBatches, setTotalBatches] = useState(0);
  const [processedRows, setProcessedRows] = useState(0);
  const [batchStatuses, setBatchStatuses] = useState<('pending' | 'processing' | 'success' | 'failed' | 'retrying')[]>([]);
  const [batchRetryAttempts, setBatchRetryAttempts] = useState<number[]>([]);
  const [extractedResults, setExtractedResults] = useState<ExtractionResult[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  // Initialize theme from system preference or local storage
  useEffect(() => {
    const savedTheme = localStorage.getItem('groweasy_theme') as 'light' | 'dark';
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialTheme = prefersDark ? 'dark' : 'light';
      setTheme(initialTheme);
      document.documentElement.setAttribute('data-theme', initialTheme);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('groweasy_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const handleUploadSuccess = (data: {
    headers: string[];
    rows: any[];
    filename: string;
    rowCount: number;
  }) => {
    setCsvData(data);
    setStep('PREVIEW');
  };

  const resetImporter = () => {
    setCsvData(null);
    setStep('UPLOAD');
    setCurrentBatchIndex(0);
    setProcessedRows(0);
    setExtractedResults([]);
    setImportErrors([]);
    setBatchStatuses([]);
    setBatchRetryAttempts([]);
  };

  // Helper with exponential backoff delay
  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Process a single batch with retry logic
  const processBatchWithRetry = async (
    batchRows: any[],
    batchIdx: number,
    customApiKey: string | null,
    attempt = 1
  ): Promise<ExtractionResult[]> => {
    try {
      if (attempt > 1) {
        setBatchStatuses((prev) => {
          const next = [...prev];
          next[batchIdx] = 'retrying';
          return next;
        });
        setBatchRetryAttempts((prev) => {
          const next = [...prev];
          next[batchIdx] = attempt - 1;
          return next;
        });
        // Exponential backoff: 1s, 2s, 4s...
        await wait(1000 * Math.pow(2, attempt - 2));
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (customApiKey) {
        headers['x-gemini-api-key'] = customApiKey;
      }

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

      const response = await fetch(`${apiBaseUrl}/api/extract-batch`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ records: batchRows }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || `Server returned error status ${response.status}`);
      }

      setBatchStatuses((prev) => {
        const next = [...prev];
        next[batchIdx] = 'success';
        return next;
      });

      // Attach the original raw record context to matches for statistics/skipped logs
      return resData.results.map((res: ExtractionResult, idx: number) => ({
        ...res,
        raw_record: batchRows[idx],
      }));
    } catch (err: any) {
      console.warn(`Attempt ${attempt} for batch ${batchIdx + 1} failed:`, err.message);
      if (attempt < MAX_RETRIES) {
        return processBatchWithRetry(batchRows, batchIdx, customApiKey, attempt + 1);
      } else {
        setBatchStatuses((prev) => {
          const next = [...prev];
          next[batchIdx] = 'failed';
          return next;
        });
        throw new Error(err.message || 'Batch failed after maximum retry attempts');
      }
    }
  };

  // Start the batch extraction sequence
  const startImport = async () => {
    if (!csvData) return;
    setStep('IMPORTING');

    const rows = csvData.rows;
    const numRows = rows.length;
    const numBatches = Math.ceil(numRows / BATCH_SIZE);
    
    setTotalBatches(numBatches);
    setCurrentBatchIndex(0);
    setProcessedRows(0);
    setBatchStatuses(Array(numBatches).fill('pending'));
    setBatchRetryAttempts(Array(numBatches).fill(0));
    setImportErrors([]);

    const customKey = localStorage.getItem('groweasy_gemini_key');
    const allExtracted: ExtractionResult[] = [];
    const errors: string[] = [];

    // Loop through each batch sequentially to avoid hitting model rate limits too heavily
    for (let i = 0; i < numBatches; i++) {
      setCurrentBatchIndex(i);
      setBatchStatuses((prev) => {
        const next = [...prev];
        next[i] = 'processing';
        return next;
      });

      const start = i * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, numRows);
      const batchRows = rows.slice(start, end);

      try {
        const batchResults = await processBatchWithRetry(batchRows, i, customKey);
        allExtracted.push(...batchResults);
      } catch (err: any) {
        console.error(err);
        errors.push(`Batch ${i + 1} (Rows ${start + 1}-${end}) failed: ${err.message}`);
        
        // Even if the batch completely failed, treat it as skipped so we can proceed with other rows
        const failedPlaceholders = batchRows.map((row) => ({
          is_skipped: true,
          mapped_record: null,
          raw_record: { ...row, _error: 'AI Mapping failed' },
        }));
        allExtracted.push(...failedPlaceholders);
      }

      setProcessedRows(end);
    }

    setExtractedResults(allExtracted);
    setImportErrors(errors);
    setStep('RESULTS');
  };

  // Compute progress percentage
  const importProgressPercent = csvData && csvData.rows.length > 0 
    ? Math.round((processedRows / csvData.rows.length) * 100) 
    : 0;

  return (
    <div className={styles.appContainer}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logoContainer}>
          <div className={styles.logoIcon}>
            <Database size={24} />
          </div>
          <div>
            <h1>GrowEasy Importer</h1>
            <p className={styles.logoTagline}>AI-Powered CRM Lead Extractor</p>
          </div>
        </div>

        <div className={styles.headerActions}>
          <button 
            className={styles.themeToggle} 
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          
          <button 
            className={styles.settingsBtn} 
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Open settings"
            title="API Key Configuration"
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Content */}
      <main className={styles.main}>
        {step === 'UPLOAD' && (
          <div className={`${styles.section} ${styles.centerSection} animate-fade`}>
            <div className={styles.introText}>
              <h2>Upload Your Lead CSV</h2>
              <p>
                Our AI maps headers from raw sheets (Facebook Ads, Google Ads, spreadsheets, etc.) 
                and formats them into standard GrowEasy CRM records automatically.
              </p>
            </div>
            <FileUpload onUploadSuccess={handleUploadSuccess} />
          </div>
        )}

        {step === 'PREVIEW' && csvData && (
          <div className={`${styles.section} animate-fade`}>
            <div className={styles.sectionHeader}>
              <div>
                <h2>Verify File Preview</h2>
                <p>Ensure your CSV headers and rows loaded correctly before launching AI processing.</p>
              </div>
              <div className={styles.actionRow}>
                <button onClick={resetImporter} className={styles.secondaryBtn}>
                  <RotateCcw size={16} />
                  Choose Different File
                </button>
                <button onClick={startImport} className={styles.primaryBtn}>
                  <Play size={16} />
                  Confirm & Import Leads
                </button>
              </div>
            </div>

            <CsvPreviewTable 
              headers={csvData.headers} 
              rows={csvData.rows} 
              filename={csvData.filename} 
            />
          </div>
        )}

        {step === 'IMPORTING' && csvData && (
          <div className={`${styles.section} ${styles.centerSection} animate-fade`}>
            <div className={styles.progressCard}>
              <div className={styles.progressCardHeader}>
                <RefreshCw className={styles.syncSpinner} size={28} />
                <div>
                  <h2>Extracting CRM Information</h2>
                  <p>Gemini is mapping fields and validating lead statuses in batches...</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className={styles.progressMeterContainer}>
                <div className={styles.progressMeterHeader}>
                  <span>Progress ({processedRows} / {csvData.rows.length} rows)</span>
                  <span className={styles.percentText}>{importProgressPercent}%</span>
                </div>
                <div className={styles.progressMeterTrack}>
                  <div 
                    className={styles.progressMeterBar} 
                    style={{ width: `${importProgressPercent}%` }}
                  ></div>
                </div>
              </div>

              {/* Batch Nodes Display */}
              <div className={styles.batchGridContainer}>
                <h4 className={styles.batchGridTitle}>AI Processing Batches ({totalBatches})</h4>
                <div className={styles.batchGrid}>
                  {batchStatuses.map((status, idx) => {
                    const attempts = batchRetryAttempts[idx];
                    let nodeClass = styles.batchNodePending;
                    let tooltip = `Batch ${idx + 1}: Pending`;

                    if (status === 'processing') {
                      nodeClass = styles.batchNodeProcessing;
                      tooltip = `Batch ${idx + 1}: Processing...`;
                    } else if (status === 'success') {
                      nodeClass = styles.batchNodeSuccess;
                      tooltip = `Batch ${idx + 1}: Mapped successfully`;
                    } else if (status === 'failed') {
                      nodeClass = styles.batchNodeFailed;
                      tooltip = `Batch ${idx + 1}: Failed to map`;
                    } else if (status === 'retrying') {
                      nodeClass = styles.batchNodeRetrying;
                      tooltip = `Batch ${idx + 1}: Retrying (Attempt ${attempts + 1})...`;
                    }

                    return (
                      <div 
                        key={idx} 
                        className={`${styles.batchNode} ${nodeClass}`}
                        title={tooltip}
                      >
                        {idx + 1}
                        {attempts > 0 && status !== 'success' && status !== 'failed' && (
                          <span className={styles.retryBadge}>r{attempts}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={styles.importStatusFooter}>
                <p>Do not close this browser window. Sequencing batch calls sequentially to optimize rate limits.</p>
              </div>
            </div>
          </div>
        )}

        {step === 'RESULTS' && (
          <div className={`${styles.section} animate-fade`}>
            <div className={styles.sectionHeader}>
              <div>
                <h2>Import Completed</h2>
                <p>AI extraction successfully finished. Review the results below.</p>
              </div>
              <div>
                <button onClick={resetImporter} className={styles.primaryBtn}>
                  <RotateCcw size={16} />
                  Import Another File
                </button>
              </div>
            </div>

            {/* Error notifications if any batch failed */}
            {importErrors.length > 0 && (
              <div className={styles.errorAlertCard}>
                <div className={styles.errorAlertTitle}>
                  <AlertTriangle size={18} />
                  <span>Some batches encountered issues</span>
                </div>
                <ul className={styles.errorList}>
                  {importErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <CrmResultTable results={extractedResults} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={styles.appFooter}>
        <p>© 2026 GrowEasy. All rights reserved. Developed for CRM Data Importer Assignment.</p>
      </footer>

      {/* Settings Modal */}
      <ApiKeyModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </div>
  );
}
