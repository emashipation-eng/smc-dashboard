/**
 * DataAPI.gs — SMC Dashboard Data Proxy v2
 * Maps Umang's actual Google Sheets to dashboard schema.
 *
 * Deploy as Web App:
 *   Execute as: Me (Umang's account)
 *   Who has access: Anyone
 *
 * CONTRACT: Each key in the JSON response includes a schema header row as row[0],
 * followed by data rows. Required by dashboard's dataTransform skipHeader.
 */

// ─── DATE FILTER ─────────────────────────────────────────────────────────────
// Only return data from October 2025 onwards
const CUTOFF_DATE = '2025-10-01';

function afterCutoff(dateStr) {
  if (!dateStr) return false;
  return String(dateStr).slice(0, 10) >= CUTOFF_DATE;
}

// ─── STATUS MAPPING ──────────────────────────────────────────────────────────
// Maps Umang's quotation status values to dashboard schema values
function mapEnquiryStatus(raw) {
  const s = String(raw || '').trim().toUpperCase();
  if (!s) return 'Quoted';
  if (s.includes('CONFIRM') || s.includes('PO')   || s.includes('WON'))    return 'PO Received';
  if (s.includes('CLOSED')  || s.includes('CLOSE'))                         return 'PO Received'; // closed = order completed
  if (s.includes('LOST')    || s.includes('REJECT') || s.includes('CANCEL') || s.includes('EXPIR')) return 'Expired';
  return 'Quoted';
}

// Maps production status to dashboard schema values
function mapProductionStatus(prod, process, dispatchDate) {
  if (dispatchDate) return 'Complete';
  if (String(prod || '').toUpperCase()    === 'OK') return 'Complete';
  if (String(process || '').toUpperCase() === 'OK') return 'In-Progress';
  return 'Pending';
}

// Derives production stage from dispatch/prod/process flags and material type
function mapProductionStage(prod, process, dispatchDate, thick) {
  if (dispatchDate)                                       return 'Dispatch';
  if (String(prod || '').toUpperCase()    === 'OK')       return 'QC';
  if (String(process || '').toUpperCase() === 'OK')       return 'Welding';
  const t = String(thick || '').toUpperCase();
  if (t.includes('GP') || t.includes('PAINT'))            return 'Paint';
  return 'Cutting';
}

// ─── SPREADSHEET IDs ─────────────────────────────────────────────────────────
const SS = {
  SHEET_STOCK:     '1JNiqcBlkk0Ay4HPcPgm04HeQAe65MlaPT2v1daI7eGI',
  QUOTATION_DIARY: '1oT7p6imRNspBaVOcb96p8XyQs-p8S7Ch9QR-AZEoG9g',
  ORDER_BOOK:      '1pxR0owvYY8BsAdqwdPHfwTet1nFrSPvI9BsvILuo-1I',
  RAW_MATERIAL:    '1wH9_0Ao2ayGR1XY_LaZ6e9Lmg00qGWUqm0mXBg-fFMY',
  DEBIT_CREDIT:    '1Sy0Yd8nt6OyEXCKkGVfx1Wi8o_rOXnoIlemxBblrzwE',
};

// ─── SCHEMA HEADERS ──────────────────────────────────────────────────────────
const HEADERS = {
  INVENTORY:  ['Item ID', 'Item Name', 'Category', 'Dimensions', 'Current Stock', 'UOM', 'Min Alert Level', 'Location Bin'],
  ENQUIRY:    ['Enquiry ID', 'Timestamp', 'Client Name', 'Item Desc', 'Quantity', 'Unit Cost', 'Margin %', 'Total Quote', 'Status'],
  PRODUCTION: ['Job ID', 'Client Name', 'Stage', 'Assigned To', 'Status', 'Start Date', 'Due Date', 'Est. Hours', 'Actual Hours', 'Weight (kg)'],
  PURCHASE:   ['Purchase ID', 'Date', 'Supplier', 'Item ID', 'Item Desc', 'Quantity', 'Rate', 'Amount', 'GST %', 'GST Amount', 'Total', 'Invoice No', 'Invoice Date', 'Payment Status', 'Paid Amount', 'Job Ref'],
  PAYMENT:    ['Payment ID', 'Date', 'Type', 'Enquiry Ref', 'Client Name', 'Amount', 'Mode', 'Reference', 'Receipt No', 'Notes'],
  EXPENSE:    ['Expense ID', 'Date', 'Category', 'Description', 'Amount', 'GST Applicable', 'GST Amount', 'Paid To', 'Job Ref', 'Payment Mode', 'Approved By'],
  DISPATCH:   ['Dispatch ID', 'Date', 'Job Ref', 'Client Name', 'Delivery Mode', 'Delivery Address', 'Challan No', 'Vehicle No', 'Transporter', 'Freight Cost', 'Weight (kg)', 'No of Packages', 'Received By', 'Receipt Date', 'POD Link', 'Status'],
  FOLLOWUP:   ['Followup ID', 'Enquiry Ref', 'Client Name', 'Followup Date', 'Method', 'Assigned To', 'Notes', 'Outcome', 'Next Action', 'Next Date', 'Created At'],
  PRICING:    ['Material Code', 'Supplier', 'Current Rate', 'Last Updated', 'Tax %'],
};

// ─── ENTRY POINT ─────────────────────────────────────────────────────────────
function doGet(e) {
  try {
    const result = {};
    result.INVENTORY  = [HEADERS.INVENTORY].concat(buildInventory());
    result.ENQUIRY    = [HEADERS.ENQUIRY].concat(buildEnquiry());
    result.PRODUCTION = [HEADERS.PRODUCTION].concat(buildProduction());
    result.PURCHASE   = [HEADERS.PURCHASE].concat(buildPurchase());
    result.PAYMENT    = [HEADERS.PAYMENT].concat(buildPayment());
    result.EXPENSE    = [HEADERS.EXPENSE];   // not in Umang's sheets yet
    result.DISPATCH   = [HEADERS.DISPATCH].concat(buildDispatch());
    result.FOLLOWUP   = [HEADERS.FOLLOWUP];  // not in Umang's sheets yet
    result.PRICING    = [HEADERS.PRICING].concat(buildPricing());

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log('[DataAPI] Fatal: ' + err);
    const fallback = { _error: String(err) };
    Object.keys(HEADERS).forEach(function(k) { fallback[k] = [HEADERS[k]]; });
    return ContentService
      .createTextOutput(JSON.stringify(fallback))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ─── INVENTORY ───────────────────────────────────────────────────────────────
// Source: SHEET STOCK — each tab is one material type (MS 1MM, GP 1.4MM, etc.)
// One output row per tab: latest Balance kg = current stock
function buildInventory() {
  const ss   = SpreadsheetApp.openById(SS.SHEET_STOCK);
  const rows = [];
  let idx = 1;

  ss.getSheets().forEach(function(sheet) {
    try {
      const tabName = sheet.getName().trim();
      const data    = sheet.getDataRange().getValues();
      if (data.length < 2) return;

      const headers    = data[0].map(function(h) { return String(h).trim().toLowerCase(); });
      const balanceCol = findCol(headers, ['balance kg', 'balance']);
      const priceCol   = findCol(headers, ['price', 'price ']);

      if (balanceCol === -1) return;

      // Latest stock: scan bottom-up for first numeric balance value
      let currentStock = '';
      for (let i = data.length - 1; i >= 1; i--) {
        const v = data[i][balanceCol];
        if (v !== '' && v !== null && !isNaN(Number(v)) && Number(v) >= 0) {
          currentStock = String(v);
          break;
        }
      }

      // Latest price: scan top-down for first numeric price
      let currentPrice = '';
      if (priceCol !== -1) {
        for (let i = 1; i < data.length; i++) {
          const v = data[i][priceCol];
          if (v !== '' && v !== null && !isNaN(Number(v)) && Number(v) > 0) {
            currentPrice = String(v);
            break;
          }
        }
      }

      // Derive category from tab name prefix
      const upper = tabName.toUpperCase();
      let category = 'Sheet Metal';
      if      (upper.startsWith('GPSP')) category = 'GP Special';
      else if (upper.startsWith('GP'))   category = 'GP Sheet';
      else if (upper.startsWith('MS'))   category = 'MS Sheet';
      else if (upper.startsWith('CR'))   category = 'CR Sheet';

      // [Item ID, Item Name, Category, Dimensions, Current Stock, UOM, Min Alert Level, Location Bin]
      rows.push([
        'INV' + String(idx).padStart(3, '0'),
        tabName,
        category,
        tabName,      // tab name contains thickness (e.g. "MS 1.6mm")
        currentStock,
        'kg',
        '500',        // default alert threshold — adjust per material if needed
        '',
      ]);
      idx++;
    } catch (err) {
      Logger.log('[Inventory] Tab ' + sheet.getName() + ': ' + err);
    }
  });

  return rows;
}

// ─── ENQUIRY ─────────────────────────────────────────────────────────────────
// Source: QUOTATION DIARY — all monthly tabs combined
// Columns: SR NO/S.N0, DATE, CUST NAME/ORGNIZATION NAME, DESCRIPTION, STATUS
function buildEnquiry() {
  const ss   = SpreadsheetApp.openById(SS.QUOTATION_DIARY);
  const rows = [];
  const seen = {};
  let autoId = 1;

  ss.getSheets().forEach(function(sheet) {
    try {
      const data = sheet.getDataRange().getValues();
      if (data.length < 2) return;

      const headers   = data[0].map(function(h) { return String(h).trim().toLowerCase(); });
      const idCol     = findCol(headers, ['sr no', 's.n0', 's.no', 'sr. no', 'sr.no']);
      const dateCol   = findCol(headers, ['date']);
      const clientCol = findCol(headers, ['cust name', 'orgnization  name', 'orgnization name', 'organization name', 'client name', 'customer name']);
      const descCol   = findCol(headers, ['description', 'desription', 'desc']);
      const statusCol = findCol(headers, ['status']);

      for (let i = 1; i < data.length; i++) {
        const row    = data[i];
        const client = cellStr(row, clientCol);
        if (!client) continue;

        const dateVal = row[dateCol];
        const dateStr = dateVal instanceof Date ? fmtDate(dateVal) : cellStr(row, dateCol);
        const desc    = cellStr(row, descCol);

        // De-duplicate across tabs (same enquiry may appear in multiple months)
        const key = dateStr + '|' + client + '|' + desc;
        if (seen[key]) continue;
        seen[key] = true;

        // Apply Oct 2025 date filter
        if (!afterCutoff(dateStr)) continue;

        const idVal = (idCol !== -1 && row[idCol]) ? String(row[idCol]).trim() : ('ENQ' + String(autoId).padStart(4, '0'));
        const status = mapEnquiryStatus(cellStr(row, statusCol));

        // [Enquiry ID, Timestamp, Client Name, Item Desc, Qty, Unit Cost, Margin%, Total Quote, Status]
        rows.push([
          idVal,
          dateStr,
          client,
          desc,
          '',   // Quantity — not in Quotation Diary
          '',   // Unit Cost — not in Quotation Diary (add "AMOUNT" column to get revenue)
          '',   // Margin % — not in Quotation Diary
          '',   // Total Quote — not in Quotation Diary (add "AMOUNT" column to get revenue)
          status,
        ]);
        autoId++;
      }
    } catch (err) {
      Logger.log('[Enquiry] Tab ' + sheet.getName() + ': ' + err);
    }
  });

  return rows;
}

// ─── PRODUCTION ──────────────────────────────────────────────────────────────
// Source: NEW ORDER BOOK — all monthly tabs
// Structure: alternating row types —
//   CLIENT ROW: DATE is set, DESCRIPTION = company name, no QTY
//   ITEM ROW:   no DATE, DESCRIPTION = product spec, has THICK/QTY/WEIGHT
function buildProduction() {
  const ss   = SpreadsheetApp.openById(SS.ORDER_BOOK);
  const rows = [];
  let jobIdx = 1;

  ss.getSheets().forEach(function(sheet) {
    try {
      const data = sheet.getDataRange().getValues();
      if (data.length < 3) return;

      // Find header row: first row with 3+ non-empty text cells
      let headerRow = -1;
      for (let i = 0; i < Math.min(data.length, 5); i++) {
        const textCells = data[i].filter(function(c) {
          return c && String(c).trim() && isNaN(Number(c)) && !(c instanceof Date);
        });
        if (textCells.length >= 3) { headerRow = i; break; }
      }
      if (headerRow === -1) return;

      const headers     = data[headerRow].map(function(h) { return String(h).trim().toLowerCase(); });
      const dateCol     = findCol(headers, ['date', 'date ']);
      const descCol     = findCol(headers, ['description', 'desription', 'description ']);
      const qtyCol      = findCol(headers, ['qty', 'qty ']);
      const weightCol   = findCol(headers, ['wt', 'weight .1', 'weight ']);
      const thickCol    = findCol(headers, ['thick', 'thick ']);
      const processCol  = findCol(headers, ['process', 'process ']);
      const prodCol     = findCol(headers, ['prod', 'prod ']);
      const dispatchCol = findCol(headers, ['dispatch', 'dispacth', 'dispatch ']);

      let currentClient   = '';
      let currentDate     = '';
      let currentStatus   = '';
      let currentDispatch = '';
      let currentProd     = '';
      let currentProcess  = '';
      let currentInCutoff = false;

      for (let i = headerRow + 1; i < data.length; i++) {
        const row   = data[i];
        const desc  = cellStr(row, descCol);
        if (!desc) continue;

        const dateVal = row[dateCol];
        const hasDate = dateVal instanceof Date || (dateVal && String(dateVal).trim() !== '');
        const qty     = qtyCol !== -1 ? row[qtyCol] : '';
        const hasQty  = qty !== '' && qty !== null && !isNaN(Number(qty)) && Number(qty) > 0;

        if (hasDate && !hasQty) {
          // CLIENT ROW — update running state
          currentClient   = desc;
          currentDate     = dateVal instanceof Date ? fmtDate(dateVal) : String(dateVal);
          currentInCutoff = afterCutoff(currentDate);
          currentProd     = cellStr(row, prodCol);
          currentProcess  = cellStr(row, processCol);
          const dv        = dispatchCol !== -1 ? row[dispatchCol] : null;
          currentDispatch = dv instanceof Date ? fmtDate(dv) : (dv ? String(dv) : '');
          currentStatus   = mapProductionStatus(currentProd, currentProcess, currentDispatch);

        } else if (!hasDate && currentClient) {
          // ITEM ROW — skip if client date is before cutoff
          if (!currentInCutoff) continue;

          const thick = cellStr(row, thickCol);
          const stage = mapProductionStage(currentProd, currentProcess, currentDispatch, thick);

          // [Job ID, Client, Stage, Assigned To, Status, Start Date, Due Date, Est Hrs, Actual Hrs, Weight]
          rows.push([
            'JOB' + String(jobIdx).padStart(4, '0'),
            currentClient,
            stage,
            '',
            currentStatus,
            currentDate,
            currentDispatch,
            '',
            '',
            cellStr(row, weightCol),
          ]);
          jobIdx++;
        }
      }
    } catch (err) {
      Logger.log('[Production] Tab ' + sheet.getName() + ': ' + err);
    }
  });

  return rows;
}

// ─── PURCHASE ────────────────────────────────────────────────────────────────
// Source: RAW MATERIAL — Sheet1
// Columns: Quote (date), M.T, Qty (Kg), Thich, [supplier prices...], Amount, Supplier, Received
function buildPurchase() {
  const ss    = SpreadsheetApp.openById(SS.RAW_MATERIAL);
  const sheet = ss.getSheets()[0];
  const data  = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers     = data[0].map(function(h) { return String(h).trim().toLowerCase(); });
  const dateCol     = findCol(headers, ['quote', 'date']);
  const materialCol = findCol(headers, ['m.t', 'material', 'mt']);
  const qtyCol      = findCol(headers, ['qty (kg)', 'qty(kg)', 'qty', 'quantity']);
  const thickCol    = findCol(headers, ['thich', 'thick', 'thickness']);
  const amountCol   = findCol(headers, ['amount']);
  const supplierCol = findCol(headers, ['supplier']);
  const receivedCol = findCol(headers, ['received']);

  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const row      = data[i];
    const material = cellStr(row, materialCol);
    const supplier = cellStr(row, supplierCol);
    if (!material || !supplier) continue;

    const dateVal  = row[dateCol];
    const dateStr  = dateVal instanceof Date ? fmtDate(dateVal) : cellStr(row, dateCol);

    // Apply Oct 2025 date filter
    if (!afterCutoff(dateStr)) continue;

    const recvVal  = receivedCol !== -1 ? row[receivedCol] : null;
    const recvStr  = recvVal instanceof Date ? fmtDate(recvVal) : (recvVal ? String(recvVal) : '');
    const qty      = cellStr(row, qtyCol);
    const amount   = cellStr(row, amountCol);
    const thick    = thickCol !== -1 ? cellStr(row, thickCol) : '';

    const qtyNum = parseFloat(qty) || 0;
    const amtNum = parseFloat(amount) || 0;
    const rate   = (qtyNum > 0 && amtNum > 0) ? String(Math.round(amtNum / qtyNum)) : '';

    // [PurchaseID, Date, Supplier, ItemID, ItemDesc, Qty, Rate, Amount, GST%, GSTAmt, Total, InvNo, InvDate, PayStatus, PaidAmt, JobRef]
    rows.push([
      'PUR' + String(i).padStart(4, '0'),
      dateStr,
      supplier,
      '',
      material + (thick ? ' ' + thick : ''),
      qty,
      rate,
      amount,
      '18',    // default GST — update if tracked separately
      '',
      amount,
      '',
      recvStr,
      'Paid',
      amount,
      '',
    ]);
  }

  return rows;
}

// ─── PAYMENT ─────────────────────────────────────────────────────────────────
// Source: DEBIT CREDIT — Sheet1 (Sundry Debtors outstanding summary)
// Columns: PARTY NAME, AMOUNT, DUE DATE, STATUS
function buildPayment() {
  const ss    = SpreadsheetApp.openById(SS.DEBIT_CREDIT);
  let sheet   = ss.getSheetByName('Sheet1');
  if (!sheet) sheet = ss.getSheets()[0];

  const data = sheet.getDataRange().getValues();

  // Locate header row by finding row that contains 'PARTY NAME'
  let headerRow = -1;
  for (let i = 0; i < Math.min(data.length, 12); i++) {
    const joined = data[i].map(function(c) { return String(c).toUpperCase(); }).join('|');
    if (joined.includes('PARTY NAME') || joined.includes('PARTY  NAME')) {
      headerRow = i;
      break;
    }
  }
  if (headerRow === -1) return [];

  const headers    = data[headerRow].map(function(h) { return String(h).trim().toLowerCase(); });
  const partyCol   = findCol(headers, ['party name', 'party  name', 'name']);
  const amountCol  = findCol(headers, ['amount']);
  const dueDateCol = findCol(headers, ['due date', 'due  date', 'duedate']);
  const statusCol  = findCol(headers, ['status']);

  const rows = [];
  let idx = 1;

  for (let i = headerRow + 1; i < data.length; i++) {
    const row    = data[i];
    const party  = cellStr(row, partyCol);
    const amount = cellStr(row, amountCol);
    if (!party || !amount) continue;

    const dv     = dueDateCol !== -1 ? row[dueDateCol] : null;
    const dueStr = dv instanceof Date ? fmtDate(dv) : (dv ? String(dv) : '');

    // [Payment ID, Date, Type, Enquiry Ref, Client Name, Amount, Mode, Reference, Receipt No, Notes]
    rows.push([
      'PAY' + String(idx).padStart(4, '0'),
      dueStr,
      'Receivable',
      '',
      party,
      amount,
      cellStr(row, statusCol),  // CHQ, etc.
      '',
      '',
      '',
    ]);
    idx++;
  }

  return rows;
}

// ─── DISPATCH ────────────────────────────────────────────────────────────────
// Source: NEW ORDER BOOK — client rows where DISPATCH column has a date
function buildDispatch() {
  const ss   = SpreadsheetApp.openById(SS.ORDER_BOOK);
  const rows = [];
  let dispIdx = 1;

  ss.getSheets().forEach(function(sheet) {
    try {
      const data = sheet.getDataRange().getValues();
      if (data.length < 3) return;

      let headerRow = -1;
      for (let i = 0; i < Math.min(data.length, 5); i++) {
        const textCells = data[i].filter(function(c) {
          return c && String(c).trim() && isNaN(Number(c)) && !(c instanceof Date);
        });
        if (textCells.length >= 3) { headerRow = i; break; }
      }
      if (headerRow === -1) return;

      const headers     = data[headerRow].map(function(h) { return String(h).trim().toLowerCase(); });
      const dateCol     = findCol(headers, ['date', 'date ']);
      const descCol     = findCol(headers, ['description', 'desription', 'description ']);
      const qtyCol      = findCol(headers, ['qty', 'qty ']);
      const dispatchCol = findCol(headers, ['dispatch', 'dispacth', 'dispatch ']);

      for (let i = headerRow + 1; i < data.length; i++) {
        const row     = data[i];
        const desc    = cellStr(row, descCol);
        if (!desc) continue;

        const dateVal = row[dateCol];
        const hasDate = dateVal instanceof Date || (dateVal && String(dateVal).trim() !== '');
        const qty     = qtyCol !== -1 ? row[qtyCol] : '';
        const hasQty  = qty !== '' && qty !== null && !isNaN(Number(qty)) && Number(qty) > 0;
        if (!hasDate || hasQty) continue; // only process client rows

        const dispVal = dispatchCol !== -1 ? row[dispatchCol] : null;
        if (!(dispVal instanceof Date)) continue; // only rows with actual dispatch dates

        // Apply Oct 2025 date filter
        if (!afterCutoff(fmtDate(dispVal))) continue;

        // [Dispatch ID, Date, Job Ref, Client Name, DelivMode, DelivAddr, ChallanNo, VehicleNo,
        //  Transporter, Freight, Weight, NoPkgs, ReceivedBy, ReceiptDate, PODLink, Status]
        rows.push([
          'DSP' + String(dispIdx).padStart(4, '0'),
          fmtDate(dispVal),
          '',
          desc,
          '', '', '', '', '', '', '', '', '', '', '',
          'Dispatched',
        ]);
        dispIdx++;
      }
    } catch (err) {
      Logger.log('[Dispatch] Tab ' + sheet.getName() + ': ' + err);
    }
  });

  return rows;
}

// ─── PRICING ─────────────────────────────────────────────────────────────────
// Source: RAW MATERIAL — per-kg rate derived from Amount / Qty per purchase row
function buildPricing() {
  const ss    = SpreadsheetApp.openById(SS.RAW_MATERIAL);
  const sheet = ss.getSheets()[0];
  const data  = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers     = data[0].map(function(h) { return String(h).trim().toLowerCase(); });
  const materialCol = findCol(headers, ['m.t', 'material', 'mt']);
  const thickCol    = findCol(headers, ['thich', 'thick', 'thickness']);
  const supplierCol = findCol(headers, ['supplier']);
  const amountCol   = findCol(headers, ['amount']);
  const qtyCol      = findCol(headers, ['qty (kg)', 'qty(kg)', 'qty']);
  const dateCol     = findCol(headers, ['quote', 'date']);

  const rows = [];
  for (let i = 1; i < data.length; i++) {
    const row      = data[i];
    const material = cellStr(row, materialCol);
    const supplier = cellStr(row, supplierCol);
    if (!material || !supplier) continue;

    const qty    = parseFloat(cellStr(row, qtyCol)) || 0;
    const amount = parseFloat(cellStr(row, amountCol)) || 0;
    const rate   = (qty > 0 && amount > 0) ? String(Math.round(amount / qty)) : '';
    const thick  = thickCol !== -1 ? cellStr(row, thickCol) : '';
    const dateVal = row[dateCol];
    const dateStr = dateVal instanceof Date ? fmtDate(dateVal) : cellStr(row, dateCol);
    const code    = material.replace(/\s+/g, '_').toUpperCase() + (thick ? '_' + thick : '');

    // [Material Code, Supplier, Current Rate, Last Updated, Tax %]
    rows.push([code, supplier, rate, dateStr, '18']);
  }

  return rows;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function findCol(headers, candidates) {
  for (let c = 0; c < candidates.length; c++) {
    const idx = headers.indexOf(candidates[c]);
    if (idx !== -1) return idx;
  }
  // Partial match fallback
  for (let c = 0; c < candidates.length; c++) {
    for (let h = 0; h < headers.length; h++) {
      if (headers[h].length > 0 &&
          (headers[h].includes(candidates[c]) || candidates[c].includes(headers[h]))) {
        return h;
      }
    }
  }
  return -1;
}

function cellStr(row, col) {
  if (col === -1 || col >= row.length) return '';
  const v = row[col];
  if (v === null || v === undefined || v === '') return '';
  if (v instanceof Date) return fmtDate(v);
  return String(v).trim();
}

function fmtDate(d) {
  try {
    return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  } catch (e) {
    return String(d);
  }
}

function deriveStage(thick, process) {
  if (process && process.toUpperCase() === 'OK') return 'Dispatch';
  if (!thick) return 'Cutting';
  const t = thick.toUpperCase();
  if (t.includes('GP')) return 'Paint';
  if (t.includes('MS')) return 'Welding';
  return 'Cutting';
}

// ─── INSPECT HELPER ──────────────────────────────────────────────────────────
/**
 * Run manually in Apps Script editor to inspect tab names and column headers.
 * Change inspectId to SS.QUOTATION_DIARY, SS.ORDER_BOOK etc. to inspect each file.
 * Run → View Execution Log to see output.
 */
function inspectHeaders() {
  const inspectId = SS.SHEET_STOCK; // ← change to any SS.* value
  const ss = SpreadsheetApp.openById(inspectId);
  ss.getSheets().forEach(function(sheet) {
    const name    = sheet.getName();
    const lastCol = sheet.getLastColumn();
    if (lastCol === 0) { Logger.log('=== ' + name + ' === (empty)'); return; }
    const firstRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    Logger.log('=== ' + name + ' ===');
    firstRow.forEach(function(h, i) { Logger.log('  [' + i + '] "' + h + '"'); });
  });
}
