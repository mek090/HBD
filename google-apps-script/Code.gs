const SHEET_NAME = 'Play Summary';
const SPREADSHEET_NAME = 'Jane Birthday Data';
const HEADERS = [
  'อัปเดตล่าสุด',
  'เริ่มเล่น',
  'Visitor ID',
  'Session ID',
  'ด่านล่าสุด',
  'สถานะ',
  'เพลงที่เลือก',
  'เป่าเทียน',
  'คำอวยพรที่เปิด',
  'คำตอบ Quiz',
  'คะแนนหัวใจ',
  'ขูดคูปอง',
  'ของขวัญ',
  'ราคา',
  'ข้อความถึงเมฆ',
  'ดูพลุ',
  'เวลาเล่น (วินาที)',
  'อุปกรณ์',
  'มาจาก'
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
    let saved = 0;
    events.forEach(event => {
      if (!event || event.type !== 'journey_update' || !event.sessionId) return;
      upsertJourney_(sheet, event);
      saved++;
    });
    return { saved: saved, duplicated: events.length - saved };
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

function findSessionRow_(sheet, sessionId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const values = sheet.getRange(2, 4, lastRow - 1, 1).getDisplayValues();
  for (let i = values.length - 1; i >= 0; i--) {
    if (values[i][0] === sessionId) return i + 2;
  }
  return 0;
}

function upsertJourney_(sheet, event) {
  const detail = event.detail || {};
  const row = [
    new Date(),
    detail.startedAt || event.at || '',
    event.visitorId || '',
    event.sessionId || '',
    detail.currentStage || '',
    detail.status || '',
    detail.song || '',
    detail.candles || '0/5',
    (detail.envelopes || []).join('\n'),
    formatQuiz_(detail.quizAnswers || []),
    Number(detail.heartScore || 0),
    detail.scratch ? 'สำเร็จ' : 'ยัง',
    detail.gift || '',
    detail.giftPrice === '' ? '' : Number(detail.giftPrice || 0),
    detail.messageToMek || '',
    detail.fireworks ? 'ดูแล้ว' : 'ยัง',
    Number(detail.durationSeconds || 0),
    `${event.platform || ''} | ${event.ua || ''}`,
    event.referrer || '',
  ];
  const targetRow = findSessionRow_(sheet, event.sessionId) || sheet.getLastRow() + 1;
  sheet.getRange(targetRow, 1, 1, HEADERS.length).setValues([row]);
  sheet.getRange(targetRow, 9, 1, 2).setWrap(true);
  sheet.getRange(targetRow, 15).setWrap(true);
}

function formatQuiz_(answers) {
  return answers.map((answer, index) =>
    `${index + 1}. ${answer.answer || '-'} ${answer.correct ? '✓' : '✗'}`
  ).join('\n');
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
