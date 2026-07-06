/**
 * csv.js — minimal, dependency-free CSV parser.
 *
 * Handles quoted fields, embedded commas, embedded newlines inside quotes,
 * and escaped double-quotes ("" -> "). Returns an array of plain objects
 * keyed by the CSV's own header row, so column order in the source file
 * never matters and renamed/reordered columns are picked up automatically.
 */
(function (global) {
  function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;

    // Normalize line endings up front, but keep parsing newline-aware
    // in case a quoted field legitimately contains one.
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const next = text[i + 1];

      if (inQuotes) {
        if (char === '"' && next === '"') {
          field += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          field += char;
        }
        continue;
      }

      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(field);
        field = "";
      } else if (char === "\r") {
        // skip, handled by \n
      } else if (char === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else {
        field += char;
      }
    }
    // final field/row (files may or may not end with a trailing newline)
    if (field.length > 0 || row.length > 0) {
      row.push(field);
      rows.push(row);
    }

    // Drop any fully-empty trailing rows
    while (rows.length && rows[rows.length - 1].every((c) => c === "")) {
      rows.pop();
    }

    if (rows.length === 0) return [];

    const headers = rows[0].map((h) => h.trim());
    const records = [];

    for (let r = 1; r < rows.length; r++) {
      const raw = rows[r];
      if (raw.length === 1 && raw[0] === "") continue;
      const obj = {};
      for (let c = 0; c < headers.length; c++) {
        obj[headers[c]] = raw[c] !== undefined ? raw[c].trim() : "";
      }
      records.push(obj);
    }
    return records;
  }

  async function fetchCSV(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
    }
    const text = await res.text();
    return parseCSV(text);
  }

  global.CSVUtil = { parseCSV, fetchCSV };
})(window);
