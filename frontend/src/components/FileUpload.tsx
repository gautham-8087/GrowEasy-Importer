'use client';

import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import styles from './FileUpload.module.css';

interface FileUploadProps {
  onUploadSuccess: (data: {
    headers: string[];
    rows: any[];
    filename: string;
    rowCount: number;
  }) => void;
}

const sampleCSVData = {
  filename: "sample_leads_messy.csv",
  rowCount: 7,
  headers: ["Creation Date", "Full Name", "e-mail", "Phone No.", "Organization", "Remarks", "source"],
  rows: [
    {
      "Creation Date": "2026/05/13 14:20:48",
      "Full Name": "John Doe",
      "e-mail": "john.doe@example.com",
      "Phone No.": "+91 98765 43210",
      "Organization": "GrowEasy",
      "Remarks": "reschedule demo please",
      "source": "leads_on_demand"
    },
    {
      "Creation Date": "2026/05/13 14:25:30",
      "Full Name": "Sarah Johnson",
      "e-mail": "sarah.johnson@example.com",
      "Phone No.": "9876543211",
      "Organization": "Tech Solutions",
      "Remarks": "busy right now. Call next week.",
      "source": "meridian_tower"
    },
    {
      "Creation Date": "2026-05-13 14:30:15",
      "Full Name": "Raj Patel",
      "e-mail": "raj.patel@example.com",
      "Phone No.": "+919876543212",
      "Organization": "Startup Inc",
      "Remarks": "Not interested",
      "source": "eden_park"
    },
    {
      "Creation Date": "2026/05/13",
      "Full Name": "Priya Singh",
      "e-mail": "priya.singh@example.com, priya.work@example.com",
      "Phone No.": "9876543213, 9876543214",
      "Organization": "Enterprise Corp",
      "Remarks": "deal closed! onboarding",
      "source": "sarjapur_plots"
    },
    {
      "Creation Date": "2026-05-13",
      "Full Name": "No Contact Info",
      "e-mail": "",
      "Phone No.": "",
      "Organization": "No Contact LLC",
      "Remarks": "This should be skipped because no email and no phone",
      "source": "varah_swamy"
    },
    {
      "Creation Date": "2026-05-13 14:40:00",
      "Full Name": "Only Email",
      "e-mail": "only.email@example.com",
      "Phone No.": "",
      "Organization": "Email Co",
      "Remarks": "No phone, should import successfully",
      "source": "eden_park"
    },
    {
      "Creation Date": "2026-05-13 14:45:00",
      "Full Name": "Only Mobile",
      "e-mail": "",
      "Phone No.": "9876543219",
      "Organization": "Phone Co",
      "Remarks": "No email, should import successfully",
      "source": "leads_on_demand"
    }
  ]
};

export default function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError('Please upload a valid CSV file.');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:5000/api/upload', {
        method: 'POST',
        body: formData,
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to parse CSV file');
      }

      onUploadSuccess({
        headers: resData.headers,
        rows: resData.rows,
        filename: resData.filename,
        rowCount: resData.rowCount,
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Server error. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const loadSampleLeads = (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent triggering file input click
    setError(null);
    setLoading(true);
    
    // Simulate short network delay for nice UX loader state
    setTimeout(() => {
      onUploadSuccess(sampleCSVData);
      setLoading(false);
    }, 800);
  };

  return (
    <div className={styles.container}>
      <div
        className={`${styles.dropZone} ${isDragActive ? styles.dragActive : ''} ${
          loading ? styles.disabled : ''
        }`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={loading ? undefined : onButtonClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          className={styles.fileInput}
          accept=".csv"
          onChange={handleChange}
          disabled={loading}
        />

        {loading ? (
          <div className={styles.loadingState}>
            <Loader2 className={styles.spinner} size={48} />
            <p className={styles.title}>Parsing CSV file...</p>
            <p className={styles.subtitle}>Reading structure and data rows</p>
          </div>
        ) : (
          <div className={styles.idleState}>
            <UploadCloud className={styles.uploadIcon} size={48} />
            <p className={styles.title}>
              {selectedFile ? selectedFile.name : 'Drag & drop your CSV file here'}
            </p>
            <p className={styles.subtitle}>
              Or <span className={styles.browseLink}>browse files</span> from your computer
            </p>
            <p className={styles.hint}>Supports standard CRM exports, excel CSVs, ads reports</p>
            
            <button 
              type="button" 
              className={styles.sampleBtn} 
              onClick={loadSampleLeads}
            >
              <Sparkles size={14} />
              Try with Sample Leads (Messy CSV)
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className={`${styles.errorCard} animate-slide`}>
          <AlertCircle size={20} className={styles.errorIcon} />
          <div className={styles.errorTextContainer}>
            <p className={styles.errorTitle}>Import Error</p>
            <p className={styles.errorDesc}>{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
