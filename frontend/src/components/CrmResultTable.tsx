'use client';

import React, { useState, useMemo } from 'react';
import { Download, Search, CheckCircle, XCircle, BarChart2, ShieldAlert } from 'lucide-react';
import styles from './CrmResultTable.module.css';

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

interface CrmResultTableProps {
  results: {
    is_skipped: boolean;
    mapped_record: CrmLead | null;
    raw_record?: any; // context from source
  }[];
}

export default function CrmResultTable({ results }: CrmResultTableProps) {
  const [activeTab, setActiveTab] = useState<'imported' | 'skipped'>('imported');
  const [searchQuery, setSearchQuery] = useState('');

  // Partition results into imported vs skipped
  const { importedLeads, skippedLeads } = useMemo(() => {
    const imported: CrmLead[] = [];
    const skipped: any[] = [];

    results.forEach((item) => {
      if (item.is_skipped || !item.mapped_record) {
        skipped.push(item.raw_record || { error: 'No email or mobile number found' });
      } else {
        imported.push(item.mapped_record);
      }
    });

    return { importedLeads: imported, skippedLeads: skipped };
  }, [results]);

  // Statistics calculations
  const totalUploaded = results.length;
  const totalImported = importedLeads.length;
  const totalSkipped = skippedLeads.length;
  const successRate = totalUploaded > 0 ? Math.round((totalImported / totalUploaded) * 100) : 0;

  // Filter imported leads based on search
  const filteredImportedLeads = useMemo(() => {
    if (!searchQuery.trim()) return importedLeads;
    const lowerQuery = searchQuery.toLowerCase();
    return importedLeads.filter((lead) =>
      Object.entries(lead).some(([key, value]) =>
        String(value).toLowerCase().includes(lowerQuery)
      )
    );
  }, [importedLeads, searchQuery]);

  // Convert imported leads to GrowEasy CRM CSV format and trigger download
  const handleExportCSV = () => {
    if (importedLeads.length === 0) return;

    const headers = [
      'created_at',
      'name',
      'email',
      'country_code',
      'mobile_without_country_code',
      'company',
      'city',
      'state',
      'country',
      'lead_owner',
      'crm_status',
      'crm_note',
      'data_source',
      'possession_time',
      'description',
    ];

    // Helper to escape values and wrap in quotes
    const escapeCsvValue = (val: any) => {
      if (val === undefined || val === null) return '';
      let str = String(val).trim();
      // Replace double quotes with escaped double quotes
      str = str.replace(/"/g, '""');
      // Escape line breaks
      str = str.replace(/\n/g, '\\n');
      return `"${str}"`;
    };

    const csvRows = [];
    // Add header row
    csvRows.push(headers.join(','));

    // Add content rows
    importedLeads.forEach((lead) => {
      const values = headers.map((header) => escapeCsvValue((lead as any)[header]));
      csvRows.push(values.join(','));
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `groweasy_crm_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'GOOD_LEAD_FOLLOW_UP':
        return styles.statusGood;
      case 'SALE_DONE':
        return styles.statusSale;
      case 'DID_NOT_CONNECT':
        return styles.statusDNC;
      case 'BAD_LEAD':
        return styles.statusBad;
      default:
        return '';
    }
  };

  return (
    <div className={`${styles.container} animate-slide`}>
      {/* Metrics Section */}
      <div className={styles.metricsGrid}>
        <div className={`${styles.metricCard} ${styles.blueCard}`}>
          <div className={styles.metricHeader}>
            <span>Total Uploaded</span>
            <BarChart2 className={styles.metricIcon} size={20} />
          </div>
          <h3>{totalUploaded}</h3>
          <p className={styles.metricFooter}>Total rows processed by AI</p>
        </div>

        <div className={`${styles.metricCard} ${styles.greenCard}`}>
          <div className={styles.metricHeader}>
            <span>Successfully Imported</span>
            <CheckCircle className={styles.metricIcon} size={20} />
          </div>
          <h3>{totalImported}</h3>
          <p className={styles.metricFooter}>Mapped to GrowEasy CRM</p>
        </div>

        <div className={`${styles.metricCard} ${styles.redCard}`}>
          <div className={styles.metricHeader}>
            <span>Skipped Records</span>
            <XCircle className={styles.metricIcon} size={20} />
          </div>
          <h3>{totalSkipped}</h3>
          <p className={styles.metricFooter}>Missing email or mobile</p>
        </div>

        <div className={`${styles.metricCard} ${styles.purpleCard}`}>
          <div className={styles.metricHeader}>
            <span>Success Rate</span>
            <div className={styles.progressCircleContainer}>
              <span className={styles.rateValue}>{successRate}%</span>
            </div>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressBar} style={{ width: `${successRate}%` }}></div>
          </div>
          <p className={styles.metricFooter}>AI extraction efficiency</p>
        </div>
      </div>

      {/* Leads Table Card */}
      <div className={styles.tableCard}>
        <div className={styles.tableCardHeader}>
          {/* Tabs */}
          <div className={styles.tabs}>
            <button
              onClick={() => setActiveTab('imported')}
              className={`${styles.tabBtn} ${activeTab === 'imported' ? styles.activeTab : ''}`}
            >
              Imported Leads ({totalImported})
            </button>
            <button
              onClick={() => setActiveTab('skipped')}
              className={`${styles.tabBtn} ${activeTab === 'skipped' ? styles.activeTab : ''}`}
            >
              Skipped Leads ({totalSkipped})
            </button>
          </div>

          {/* Controls */}
          {activeTab === 'imported' && (
            <div className={styles.controls}>
              <div className={styles.searchWrapper}>
                <Search className={styles.searchIcon} size={16} />
                <input
                  type="text"
                  placeholder="Search extracted leads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                />
              </div>
              <button onClick={handleExportCSV} className={styles.exportBtn}>
                <Download size={16} />
                Export CRM CSV
              </button>
            </div>
          )}
        </div>

        {/* Tab Content: Mapped Leads */}
        {activeTab === 'imported' ? (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.stickyCol}>Name</th>
                  <th>Status</th>
                  <th>Email</th>
                  <th>Mobile</th>
                  <th>Created At</th>
                  <th>Company</th>
                  <th>Location</th>
                  <th>Lead Owner</th>
                  <th>Notes</th>
                  <th>Data Source</th>
                  <th>Possession Time</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {filteredImportedLeads.length > 0 ? (
                  filteredImportedLeads.map((lead, index) => (
                    <tr key={index}>
                      <td className={`${styles.leadNameCell} ${styles.stickyCol}`}>
                        {lead.name || 'Unknown'}
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${getStatusClass(lead.crm_status)}`}>
                          {lead.crm_status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td title={lead.email}>{lead.email || '-'}</td>
                      <td>
                        {lead.country_code ? `${lead.country_code} ` : ''}
                        {lead.mobile_without_country_code || '-'}
                      </td>
                      <td>{lead.created_at}</td>
                      <td>{lead.company || '-'}</td>
                      <td>
                        {[lead.city, lead.state, lead.country].filter(Boolean).join(', ') || '-'}
                      </td>
                      <td title={lead.lead_owner}>{lead.lead_owner || '-'}</td>
                      <td className={styles.notesCell} title={lead.crm_note}>
                        {lead.crm_note || '-'}
                      </td>
                      <td>{lead.data_source || '-'}</td>
                      <td>{lead.possession_time || '-'}</td>
                      <td className={styles.descCell} title={lead.description}>
                        {lead.description || '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={12} className={styles.emptyCell}>
                      No matching records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Tab Content: Skipped Leads */
          <div className={styles.tableWrapper}>
            <div className={styles.skippedAlert}>
              <ShieldAlert size={18} />
              <span>
                These records were skipped because they lacked both a valid **email** address and **mobile number**, 
                which is the baseline requirement for GrowEasy CRM leads.
              </span>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.rowNumberCol}>#</th>
                  <th>Raw Record Data (JSON Structure)</th>
                </tr>
              </thead>
              <tbody>
                {skippedLeads.length > 0 ? (
                  skippedLeads.map((raw, index) => (
                    <tr key={index}>
                      <td className={styles.rowNumberCell}>{index + 1}</td>
                      <td className={styles.codeCell}>
                        <pre>{JSON.stringify(raw, null, 2)}</pre>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className={styles.emptyCell}>
                      No skipped records.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
