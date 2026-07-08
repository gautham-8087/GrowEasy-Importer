'use client';

import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, Table } from 'lucide-react';
import styles from './CsvPreviewTable.module.css';

interface CsvPreviewTableProps {
  headers: string[];
  rows: any[];
  filename: string;
}

export default function CsvPreviewTable({ headers, rows, filename }: CsvPreviewTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter rows based on search query
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const lowerQuery = searchQuery.toLowerCase();
    return rows.filter((row) =>
      Object.values(row).some(
        (value) => value !== null && String(value).toLowerCase().includes(lowerQuery)
      )
    );
  }, [rows, searchQuery]);

  // Reset page when search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, pageSize]);

  // Calculate pagination
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRows = useMemo(() => {
    return filteredRows.slice(startIndex, startIndex + pageSize);
  }, [filteredRows, startIndex, pageSize]);

  return (
    <div className={`${styles.card} animate-slide`}>
      <div className={styles.header}>
        <div className={styles.titleInfo}>
          <Table className={styles.titleIcon} size={20} />
          <div>
            <h4>File Preview: {filename}</h4>
            <p className={styles.subtitle}>
              Showing {filteredRows.length} of {rows.length} rows parsed
            </p>
          </div>
        </div>

        <div className={styles.controls}>
          <div className={styles.searchWrapper}>
            <Search className={styles.searchIcon} size={16} />
            <input
              type="text"
              placeholder="Search CSV data..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.pageSizeSelect}>
            <span>Show</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className={styles.select}
            >
              <option value={10}>10 rows</option>
              <option value={25}>25 rows</option>
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
            </select>
          </div>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.rowNumberCol}>#</th>
              {headers.map((hdr, idx) => (
                <th key={idx} title={hdr}>
                  {hdr}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length > 0 ? (
              paginatedRows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  <td className={styles.rowNumberCell}>{startIndex + rowIndex + 1}</td>
                  {headers.map((hdr, colIndex) => {
                    const cellValue = row[hdr];
                    return (
                      <td key={colIndex} title={cellValue !== undefined ? String(cellValue) : ''}>
                        {cellValue !== undefined && cellValue !== null ? String(cellValue) : '-'}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={headers.length + 1} className={styles.emptyCell}>
                  No matching records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className={styles.footer}>
          <div className={styles.pageInfo}>
            Page {currentPage} of {totalPages}
          </div>
          <div className={styles.paginationButtons}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={styles.pageBtn}
            >
              <ChevronLeft size={16} />
              Prev
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={styles.pageBtn}
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
