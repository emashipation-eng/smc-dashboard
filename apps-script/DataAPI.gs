/**
 * DataAPI.gs — SMC Dashboard Data Proxy
 * Deployed as a standalone Web App under Umang's Google account.
 * Reads private sheets, remaps columns to dashboard schema, returns JSON.
 *
 * Deploy settings:
 *   Execute as: Me (Umang's account)
 *   Who has access: Anyone
 *
 * CONTRACT: Each sheet key in the JSON response includes a schema header row
 * as row[0], followed by data rows. This matches the raw Sheets API contract
 * expected by the dashboard's dataTransform layer (skipHeader).
 */

// ─── CONFIG ────────────────────────────────────────────────────────────────
/**
 * SHEET_CONFIG — one entry per sheet key.
 *
 * spreadsheetId: Umang's spreadsheet ID (from the URL: /spreadsheets/d/<ID>/edit)
 *                Multiple entries can use different spreadsheet IDs.
 * tabName:       Exact tab name (case-sensitive) inside that spreadsheet
 * schemaHeaders: Column names to use as the header row[0] in the output
 *                (must match the order in src/config/sheets.ts COL definitions)
 * columns:       Total number of columns in the schema for this sheet
 * map:           { "Umang's actual column header": ourSchemaColumnIndex }
 *                Fill in after running inspectHeaders() — see bottom of file.
 */
const SHEET_CONFIG = {
  INVENTORY: {
    spreadsheetId: 'REPLACE_WITH_SPREADSHEET_ID',
    tabName: 'Master_Inventory',
    columns: 8,
    schemaHeaders: ['Item ID', 'Item Name', 'Category', 'Dimensions', 'Current Stock', 'UOM', 'Min Alert Level', 'Location Bin'],
    map: {
      'Item ID':         0,
      'Item Name':       1,
      'Category':        2,
      'Dimensions':      3,
      'Current Stock':   4,
      'UOM':             5,
      'Min Alert Level': 6,
      'Location Bin':    7,
    }
  },
  ENQUIRY: {
    spreadsheetId: 'REPLACE_WITH_SPREADSHEET_ID',
    tabName: 'Enquiry_Master',
    columns: 9,
    schemaHeaders: ['Enquiry ID', 'Timestamp', 'Client Name', 'Item Desc', 'Quantity', 'Unit Cost', 'Margin %', 'Total Quote', 'Status'],
    map: {
      'Enquiry ID':  0,
      'Timestamp':   1,
      'Client Name': 2,
      'Item Desc':   3,
      'Quantity':    4,
      'Unit Cost':   5,
      'Margin %':    6,
      'Total Quote': 7,
      'Status':      8,
    }
  },
  PRODUCTION: {
    spreadsheetId: 'REPLACE_WITH_SPREADSHEET_ID',
    tabName: 'Production_Queue',
    columns: 10,
    schemaHeaders: ['Job ID', 'Client Name', 'Stage', 'Assigned To', 'Status', 'Start Date', 'Due Date', 'Est. Hours', 'Actual Hours', 'Weight (kg)'],
    map: {
      'Job ID':       0,
      'Client Name':  1,
      'Stage':        2,
      'Assigned To':  3,
      'Status':       4,
      'Start Date':   5,
      'Due Date':     6,
      'Est. Hours':   7,
      'Actual Hours': 8,
      'Weight (kg)':  9,
    }
  },
  PURCHASE: {
    spreadsheetId: 'REPLACE_WITH_SPREADSHEET_ID',
    tabName: 'Purchase_Register',
    columns: 16,
    schemaHeaders: ['Purchase ID', 'Date', 'Supplier', 'Item ID', 'Item Desc', 'Quantity', 'Rate', 'Amount', 'GST %', 'GST Amount', 'Total', 'Invoice No', 'Invoice Date', 'Payment Status', 'Paid Amount', 'Job Ref'],
    map: {
      'Purchase ID':    0,
      'Date':           1,
      'Supplier':       2,
      'Item ID':        3,
      'Item Desc':      4,
      'Quantity':       5,
      'Rate':           6,
      'Amount':         7,
      'GST %':          8,
      'GST Amount':     9,
      'Total':         10,
      'Invoice No':    11,
      'Invoice Date':  12,
      'Payment Status':13,
      'Paid Amount':   14,
      'Job Ref':       15,
    }
  },
  PAYMENT: {
    spreadsheetId: 'REPLACE_WITH_SPREADSHEET_ID',
    tabName: 'Payment_Tracker',
    columns: 10,
    schemaHeaders: ['Payment ID', 'Date', 'Type', 'Enquiry Ref', 'Client Name', 'Amount', 'Mode', 'Reference', 'Receipt No', 'Notes'],
    map: {
      'Payment ID':  0,
      'Date':        1,
      'Type':        2,
      'Enquiry Ref': 3,
      'Client Name': 4,
      'Amount':      5,
      'Mode':        6,
      'Reference':   7,
      'Receipt No':  8,
      'Notes':       9,
    }
  },
  EXPENSE: {
    spreadsheetId: 'REPLACE_WITH_SPREADSHEET_ID',
    tabName: 'Expense_Ledger',
    columns: 11,
    schemaHeaders: ['Expense ID', 'Date', 'Category', 'Description', 'Amount', 'GST Applicable', 'GST Amount', 'Paid To', 'Job Ref', 'Payment Mode', 'Approved By'],
    map: {
      'Expense ID':    0,
      'Date':          1,
      'Category':      2,
      'Description':   3,
      'Amount':        4,
      'GST Applicable':5,
      'GST Amount':    6,
      'Paid To':       7,
      'Job Ref':       8,
      'Payment Mode':  9,
      'Approved By':  10,
    }
  },
  DISPATCH: {
    spreadsheetId: 'REPLACE_WITH_SPREADSHEET_ID',
    tabName: 'Dispatch_Log',
    columns: 16,
    schemaHeaders: ['Dispatch ID', 'Date', 'Job Ref', 'Client Name', 'Delivery Mode', 'Delivery Address', 'Challan No', 'Vehicle No', 'Transporter', 'Freight Cost', 'Weight (kg)', 'No of Packages', 'Received By', 'Receipt Date', 'POD Link', 'Status'],
    map: {
      'Dispatch ID':      0,
      'Date':             1,
      'Job Ref':          2,
      'Client Name':      3,
      'Delivery Mode':    4,
      'Delivery Address': 5,
      'Challan No':       6,
      'Vehicle No':       7,
      'Transporter':      8,
      'Freight Cost':     9,
      'Weight (kg)':     10,
      'No of Packages':  11,
      'Received By':     12,
      'Receipt Date':    13,
      'POD Link':        14,
      'Status':          15,
    }
  },
  FOLLOWUP: {
    spreadsheetId: 'REPLACE_WITH_SPREADSHEET_ID',
    tabName: 'Followup_Log',
    columns: 11,
    schemaHeaders: ['Followup ID', 'Enquiry Ref', 'Client Name', 'Followup Date', 'Method', 'Assigned To', 'Notes', 'Outcome', 'Next Action', 'Next Date', 'Created At'],
    map: {
      'Followup ID':  0,
      'Enquiry Ref':  1,
      'Client Name':  2,
      'Followup Date':3,
      'Method':       4,
      'Assigned To':  5,
      'Notes':        6,
      'Outcome':      7,
      'Next Action':  8,
      'Next Date':    9,
      'Created At':  10,
    }
  },
  PRICING: {
    spreadsheetId: 'REPLACE_WITH_SPREADSHEET_ID',
    tabName: 'Price_Registry',
    columns: 5,
    schemaHeaders: ['Material Code', 'Supplier', 'Current Rate', 'Last Updated', 'Tax %'],
    map: {
      'Material Code': 0,
      'Supplier':      1,
      'Current Rate':  2,
      'Last Updated':  3,
      'Tax %':         4,
    }
  },
};
// ─── END CONFIG ────────────────────────────────────────────────────────────

/**
 * HTTP GET handler — entry point for the Web App.
 * Returns all sheet data as JSON. Each key contains:
 *   row[0]: schema header row (skipped by dashboard's dataTransform)
 *   row[1+]: actual data rows in schema column order
 */
function doGet(e) {
  try {
    const result = {};
    // Cache opened spreadsheets to avoid redundant openById calls
    const ssCache = {};

    for (const [key, config] of Object.entries(SHEET_CONFIG)) {
      try {
        if (!ssCache[config.spreadsheetId]) {
          ssCache[config.spreadsheetId] = SpreadsheetApp.openById(config.spreadsheetId);
        }
        const ss    = ssCache[config.spreadsheetId];
        const sheet = ss.getSheetByName(config.tabName);

        if (!sheet) {
          Logger.log('[DataAPI] Tab not found: ' + config.tabName + ' in ' + config.spreadsheetId);
          result[key] = [config.schemaHeaders];  // header only, no data rows
          continue;
        }

        const data = sheet.getDataRange().getValues();

        if (data.length < 2) {
          result[key] = [config.schemaHeaders];  // header only, no data rows
          continue;
        }

        const headers  = data[0].map(function(h) { return String(h).trim(); });
        const dataRows = data.slice(1);

        const remapped = dataRows
          .filter(function(row) { return row.some(function(cell) { return cell !== ''; }); })
          .map(function(row) { return remapRow(row, headers, config.map, config.columns); });

        // Prepend schema header row so dashboard's skipHeader works correctly
        result[key] = [config.schemaHeaders].concat(remapped);

      } catch (sheetErr) {
        Logger.log('[DataAPI] Error reading ' + key + ': ' + sheetErr);
        result[key] = [SHEET_CONFIG[key].schemaHeaders];  // header only on error
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log('[DataAPI] Fatal error: ' + err);
    // Return valid shape so dashboard receives expected keys (all empty after skipHeader)
    var fallback = { _error: String(err) };
    Object.keys(SHEET_CONFIG).forEach(function(key) {
      fallback[key] = [SHEET_CONFIG[key].schemaHeaders];
    });
    return ContentService
      .createTextOutput(JSON.stringify(fallback))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Remaps a row from Umang's column order to our schema column order.
 * Unknown columns are silently dropped; missing schema columns stay ''.
 * Dates are formatted as 'yyyy-MM-dd' strings.
 */
function remapRow(row, headers, columnMap, totalCols) {
  var output = new Array(totalCols).fill('');
  for (var headerName in columnMap) {
    var targetIndex  = columnMap[headerName];
    var sourceIndex  = headers.indexOf(headerName);
    if (sourceIndex !== -1 && sourceIndex < row.length) {
      var val = row[sourceIndex];
      output[targetIndex] = val instanceof Date
        ? Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd')
        : String(val === null || val === undefined ? '' : val);
    }
  }
  return output;
}

/**
 * inspectHeaders — run manually in Apps Script editor (Run > inspectHeaders).
 * Prints all tab names and column headers for a spreadsheet to the log.
 * Use the output to fill in SHEET_CONFIG.map entries and tabName values.
 *
 * Usage: set inspectSpreadsheetId to the ID you want to inspect, then run.
 */
function inspectHeaders() {
  var inspectSpreadsheetId = 'REPLACE_WITH_SPREADSHEET_ID_TO_INSPECT';
  var ss = SpreadsheetApp.openById(inspectSpreadsheetId);
  ss.getSheets().forEach(function(sheet) {
    var name     = sheet.getName();
    var lastCol  = sheet.getLastColumn();
    if (lastCol === 0) {
      Logger.log('\n=== ' + name + ' === (empty)');
      return;
    }
    var firstRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    Logger.log('\n=== ' + name + ' ===');
    firstRow.forEach(function(h, i) {
      Logger.log('  [' + i + '] "' + h + '"');
    });
  });
}
