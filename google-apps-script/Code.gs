const SHEET_NAME = 'Events';
const SPREADSHEET_NAME = 'Jane Birthday Data';
const HEADERS = [
  'receivedAt',
  'eventId',
  'eventAt',
  'type',
  'visitorId',
  'sessionId',
  'detail',
  'url',
  'title',
  'screen',
  'language',
  'platform',
  'timezone',
  'referrer',
  'online',
  'userAgent'
];

function doGet(e) {
  const event = parseEvent_(e);
  const saved = event ? saveEvents_([event]) : { saved: 0, duplicated: 0 };
  const spreadsheet = getSpreadsheet_();
  const sheet = getEventSheet_();
  return json_({
    ok: true,
    message: 'Birthday data collector is ready',
    spreadsheetUrl: spreadsheet.getUrl(),
    sheetName: SHEET_NAME,
    rows: Math.max(0, sheet.getLastRow() - 1),
    saved: saved.saved,
    duplicated: saved.duplicated
  });
}

function doPost(e) {
  try {
    const raw = (e && e.parameter && e.parameter.data)
      || (e && e.postData && e.postData.contents)
      || '{}';
    const payload = JSON.parse(raw);
    const events = Array.isArray(payload) ? payload : [payload];
    const result = saveEvents_(events);
    return json_({ ok: true, saved: result.saved, duplicated: result.duplicated });
  } catch (error) {
    return json_({ ok: false, error: String(error && error.message || error) });
  }
}

function parseEvent_(e) {
  try {
    const raw = e && e.parameter && e.parameter.data;
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function saveEvents_(events) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getEventSheet_();
    const existingIds = getExistingEventIds_(sheet, events);
    const rows = events
      .filter(event => event && event.eventId && !existingIds.has(event.eventId))
      .map(toRow_);

    if (rows.length) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, HEADERS.length).setValues(rows);
    }

    return { saved: rows.length, duplicated: events.length - rows.length };
  } finally {
    lock.releaseLock();
  }
}

function getSpreadsheet_() {
  const properties = PropertiesService.getScriptProperties();
  let spreadsheetId = properties.getProperty('SPREADSHEET_ID');
  let spreadsheet;

  if (spreadsheetId) {
    spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  } else {
    spreadsheet = SpreadsheetApp.create(SPREADSHEET_NAME);
    properties.setProperty('SPREADSHEET_ID', spreadsheet.getId());
  }

  return spreadsheet;
}

function getEventSheet_() {
  const spreadsheet = getSpreadsheet_();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    const sheets = spreadsheet.getSheets();
    const blankSheet = sheets.length === 1 && sheets[0].getLastRow() === 0 ? sheets[0] : null;
    if (blankSheet) {
      blankSheet.setName(SHEET_NAME);
      sheet = blankSheet;
    } else {
      sheet = spreadsheet.insertSheet(SHEET_NAME);
    }
  }

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#e75480')
      .setFontColor('#ffffff');
  }

  return sheet;
}

function getExistingEventIds_(sheet, events) {
  const requested = new Set(events.map(event => event && event.eventId).filter(Boolean));
  const existing = new Set();
  const lastRow = sheet.getLastRow();

  if (!requested.size || lastRow < 2) return existing;

  const firstRow = Math.max(2, lastRow - 4999);
  const values = sheet.getRange(firstRow, 2, lastRow - firstRow + 1, 1).getDisplayValues();
  values.forEach(row => {
    if (requested.has(row[0])) existing.add(row[0]);
  });
  return existing;
}

function toRow_(event) {
  return [
    new Date(),
    event.eventId || '',
    event.at || '',
    event.type || '',
    event.visitorId || '',
    event.sessionId || '',
    JSON.stringify(event.detail || {}),
    event.url || '',
    event.title || '',
    JSON.stringify(event.screen || []),
    event.language || '',
    event.platform || '',
    event.timezone || '',
    event.referrer || '',
    event.online === true,
    event.ua || ''
  ];
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
