import { Readable } from 'stream';
import csvParser from 'csv-parser';

/**
 * Parses a CSV buffer into an array of objects.
 * Handles BOM characters and returns clean headers/rows.
 * @param {Buffer} buffer 
 * @returns {Promise<{headers: string[], rows: object[]}>}
 */
export function parseCSVFromBuffer(buffer) {
  return new Promise((resolve, reject) => {
    const results = [];
    let headers = null;

    const stream = Readable.from(buffer.toString('utf-8'));

    stream
      .pipe(csvParser({
        // Strip BOM characters if present
        mapHeaders: ({ header }) => header.trim().replace(/^\uFEFF/, '')
      }))
      .on('headers', (hdrList) => {
        headers = hdrList;
      })
      .on('data', (data) => {
        results.push(data);
      })
      .on('end', () => {
        // If csv-parser didn't trigger headers event (e.g. empty file)
        if (!headers && results.length > 0) {
          headers = Object.keys(results[0]);
        }
        resolve({
          headers: headers || [],
          rows: results
        });
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}
