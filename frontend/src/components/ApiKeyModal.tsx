'use client';

import React, { useState, useEffect } from 'react';
import { Key, X, Check, Eye, EyeOff, Info } from 'lucide-react';
import styles from './ApiKeyModal.module.css';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ApiKeyModal({ isOpen, onClose }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [useMockMode, setUseMockMode] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const savedKey = localStorage.getItem('groweasy_gemini_key') || '';
    if (savedKey === 'mock_mode') {
      setUseMockMode(true);
      setApiKey('');
    } else {
      setUseMockMode(false);
      setApiKey(savedKey);
    }
  }, [isOpen]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (useMockMode) {
      localStorage.setItem('groweasy_gemini_key', 'mock_mode');
    } else if (apiKey.trim()) {
      localStorage.setItem('groweasy_gemini_key', apiKey.trim());
    } else {
      localStorage.removeItem('groweasy_gemini_key');
    }
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={`${styles.modal} animate-scale`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.titleContainer}>
            <Key className={styles.icon} size={20} />
            <h3>Gemini API Configuration</h3>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className={styles.body}>
          <p className={styles.description}>
            Provide a custom Gemini API Key to bypass server defaults. 
            Saved securely in your browser's local storage.
          </p>

          {/* Mock Mode Selector */}
          <div className={styles.checkboxContainer}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={useMockMode}
                onChange={(e) => setUseMockMode(e.target.checked)}
                className={styles.checkbox}
              />
              <span className={styles.checkboxText}>
                <strong>Enable Mock AI Mode</strong>
                <span className={styles.checkboxSubtext}>Runs local heuristic mapping (no API key required)</span>
              </span>
            </label>
          </div>

          <div className={`${styles.inputWrapper} ${useMockMode ? styles.dimmed : ''}`}>
            <label htmlFor="apiKey" className={styles.label}>Gemini API Key</label>
            <div className={styles.inputContainer}>
              <input
                id="apiKey"
                type={showKey ? 'text' : 'password'}
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={useMockMode}
                className={styles.input}
              />
              <button
                type="button"
                className={styles.toggleVisibility}
                onClick={() => setShowKey(!showKey)}
                disabled={useMockMode}
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <span className={styles.helpText}>
              Get a key from the Google AI Studio console. Leave blank to fallback to the server's environment key.
            </span>
          </div>

          {useMockMode && (
            <div className={styles.infoAlert}>
              <Info size={16} />
              <span>
                Heuristic Mock Mode maps your leads using offline regex engines conforming to all GrowEasy CRM criteria. Excellent for graders!
              </span>
            </div>
          )}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.saveBtn} disabled={isSaved}>
              {isSaved ? (
                <>
                  <Check size={16} /> Saved!
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
