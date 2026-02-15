const SHEET_NAME = "records";
const HEADERS = ["id", "name", "date", "delta", "created_at"];

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || "list";
  if (action !== "list") {
    return jsonResponse({ ok: false, error: { code: "BAD_ACTION", message: "Invalid action." } });
  }
  return listRecords();
}

function doPost(e) {
  const payload = parseBody_(e);
  if (!payload.ok) {
    return jsonResponse(payload);
  }

  const pinCheck = validatePin_(payload.pin);
  if (!pinCheck.ok) {
    return jsonResponse(pinCheck);
  }

  if (payload.action !== "create" && payload.action !== "update") {
    return jsonResponse({ ok: false, error: { code: "BAD_ACTION", message: "Invalid action." } });
  }

  if (payload.action === "create") {
    const data = payload.data || {};
    const validation = validateRecord_(data);
    if (!validation.ok) {
      return jsonResponse(validation);
    }

    const record = saveRecord_(data);
    return jsonResponse({ ok: true, data: record });
  }

  const updateData = payload.data || {};
  const updateValidation = validateRecord_(updateData);
  if (!updateValidation.ok) {
    return jsonResponse(updateValidation);
  }

  if (!payload.id) {
    return jsonResponse({ ok: false, error: { code: "ID_REQUIRED", message: "ID is required." } });
  }

  const updated = updateRecord_(payload.id, updateData);
  if (!updated) {
    return jsonResponse({ ok: false, error: { code: "NOT_FOUND", message: "Record not found." } });
  }
  return jsonResponse({ ok: true, data: updated });
}

function doOptions() {
  return jsonResponse({ ok: true });
}

function listRecords() {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return jsonResponse({ ok: true, data: [] });
  }

  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  const data = values.map((row) => ({
    id: row[0],
    name: row[1],
    date: row[2],
    delta: row[3],
    created_at: row[4],
  }));

  return jsonResponse({ ok: true, data: data });
}

function saveRecord_(data) {
  const sheet = getSheet_();
  const record = {
    id: Utilities.getUuid(),
    name: data.name.trim(),
    date: data.date,
    delta: Number(data.delta),
    created_at: new Date().toISOString(),
  };

  sheet.appendRow([record.id, record.name, record.date, record.delta, record.created_at]);
  return record;
}

function validateRecord_(data) {
  if (!data.name || typeof data.name !== "string") {
    return { ok: false, error: { code: "NAME_REQUIRED", message: "Name is required." } };
  }
  if (!data.date || typeof data.date !== "string") {
    return { ok: false, error: { code: "DATE_REQUIRED", message: "Date is required." } };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    return { ok: false, error: { code: "DATE_INVALID", message: "Date must be YYYY-MM-DD." } };
  }
  const delta = Number(data.delta);
  if (Number.isNaN(delta)) {
    return { ok: false, error: { code: "DELTA_INVALID", message: "Delta must be a number." } };
  }
  return { ok: true };
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return { ok: false, error: { code: "NO_BODY", message: "Request body is missing." } };
  }

  try {
    const data = JSON.parse(e.postData.contents);
    return { ok: true, action: data.action, id: data.id, pin: data.pin, data: data.data };
  } catch (error) {
    return { ok: false, error: { code: "BAD_JSON", message: "Request body must be JSON." } };
  }
}

function validatePin_(pin) {
  const stored = PropertiesService.getScriptProperties().getProperty("APP_PIN");
  if (!stored) {
    return { ok: false, error: { code: "PIN_NOT_SET", message: "PIN is not configured." } };
  }
  if (!pin || String(pin).length !== 4) {
    return { ok: false, error: { code: "PIN_REQUIRED", message: "PIN is required." } };
  }
  if (String(pin) !== String(stored)) {
    return { ok: false, error: { code: "PIN_INVALID", message: "PIN is invalid." } };
  }
  return { ok: true };
}

function updateRecord_(recordId, data) {
  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return null;
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  let targetRow = null;
  for (let i = 0; i < values.length; i += 1) {
    if (values[i][0] === recordId) {
      targetRow = i + 2;
      break;
    }
  }

  if (!targetRow) {
    return null;
  }

  sheet.getRange(targetRow, 2, 1, 3).setValues([
    [data.name.trim(), data.date, Number(data.delta)],
  ]);

  const row = sheet.getRange(targetRow, 1, 1, HEADERS.length).getValues()[0];
  return {
    id: row[0],
    name: row[1],
    date: row[2],
    delta: row[3],
    created_at: row[4],
  };
}

function getSheet_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (sheet) {
    ensureHeaders_(sheet);
    return sheet;
  }

  const created = SpreadsheetApp.getActiveSpreadsheet().insertSheet(SHEET_NAME);
  created.appendRow(HEADERS);
  return created;
}

function ensureHeaders_(sheet) {
  const headerRow = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  if (headerRow.join() !== HEADERS.join()) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
}

function jsonResponse(payload) {
  const output = ContentService.createTextOutput(JSON.stringify(payload));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
