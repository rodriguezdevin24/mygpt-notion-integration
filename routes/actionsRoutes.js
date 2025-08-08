// routes/actionsRoutes.js
'use strict';

const express = require('express');
const router = express.Router();
const dynamicDbService = require('../services/dynamicDbService');
const DynamicModel = require('../models/dynamicModel'); // for entries
const NotionDiscoveryService = require('../services/notionDiscoveryService');

// Convert fields[] -> properties{} (for database creation)
function fieldsToProperties(fields = []) {
  const out = {};
  for (const f of fields) {
    if (!f || typeof f !== 'object') continue;
    const name = String(f.name || f.property || f.key || '').trim();
    const type = String(f.type || '').trim();
    if (!name || !type) continue;

    const def = { type };
    if ((type === 'select' || type === 'multi_select') && Array.isArray(f.options)) {
      def.options = f.options.map(String);
    }
    if (type === 'relation' && f.database_id) {
      def.relation = { database_id: String(f.database_id) };
    }
    out[name] = def;
  }
  return out;
}

// Convert values[] -> { propName: value } (for entry creation)
function valuesToData(values = []) {
  const out = {};
  for (const v of values) {
    if (!v || typeof v !== 'object') continue;
    const key = String(v.name || v.property || v.key || '').trim();
    if (!key) continue;

    // Prefer explicit value(s); fallbacks for common shapes
    let val = v.value;
    if (val === undefined && Array.isArray(v.values)) val = v.values;
    if (val === undefined && typeof v.text === 'string') val = v.text;

    // Gentle coercions
    if (typeof val === 'string') {
      const lower = val.toLowerCase();
      if (lower === 'true' || lower === 'false') val = (lower === 'true');
      else if (!isNaN(Number(val)) && val.trim() !== '') val = Number(val);
    }

    // If the field type says multi_select but value is a string, split on comma
    if ((v.type === 'multi_select' || v.kind === 'multi_select') && typeof val === 'string') {
      val = val.split(',').map(s => s.trim()).filter(Boolean);
    }

    out[key] = val;
  }
  return out;
}

/** -------------------- Actions shims -------------------- **/

// POST /api/actions/create-database
router.post('/actions/create-database', async (req, res, next) => {
  try {
    const { name, fields } = req.body || {};
    if (!name || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({ success: false, message: 'name and fields[] are required' });
    }
    const properties = fieldsToProperties(fields);
    const db = await dynamicDbService.createDatabase({ name, properties });
    res.status(201).json({ success: true, database: db });
  } catch (err) {
    next(err);
  }
});

// POST /api/actions/create-entry
router.post('/actions/create-entry', async (req, res, next) => {
  try {
    const { dbId, values } = req.body || {};
    if (!dbId || !Array.isArray(values) || values.length === 0) {
      return res.status(400).json({ success: false, message: 'dbId and values[] are required' });
    }
    const data = valuesToData(values);
    const model = new DynamicModel(dbId);
    const entry = await model.create(data);
    res.status(201).json({ success: true, entry });
  } catch (err) {
    next(err);
  }
});

// --- Add/modify DB properties (PATCH via POST shim) ---
router.post('/actions/add-properties', async (req, res, next) => {
  try {
    const { dbId, fields } = req.body || {};
    if (!dbId || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({ success: false, message: 'dbId and fields[] are required' });
    }
    const properties = fieldsToProperties(fields); // converts [{name,type,options}] -> { Name: {type,options}, ... }
    const updated = await dynamicDbService.updateDatabase(dbId, { properties });
    res.json({ success: true, database: updated });
  } catch (err) {
    next(err);
  }
});

// --- Update an entry (PATCH via POST shim) ---
router.post('/actions/update-entry', async (req, res, next) => {
  try {
    const { dbId, entryId, values } = req.body || {};
    if (!dbId || !entryId || !Array.isArray(values) || values.length === 0) {
      return res.status(400).json({ success: false, message: 'dbId, entryId and values[] are required' });
    }
    const data = valuesToData(values); // converts [{name,value,...}] -> { Name: value, ... }
    const model = new DynamicModel(dbId);
    const entry = await model.update(entryId, data);
    res.json({ success: true, entry });
  } catch (err) {
    next(err);
  }
});

router.get('/actions/list-databases', async (req, res, next) => {
  try {
    const dbs = await NotionDiscoveryService.discoverDatabases();
    res.json({ success: true, count: dbs.length, databases: dbs });
  } catch (err) {
    next(err);
  }
});

// POST /api/actions/list-entries
// Body: { dbId, filters?: [{name, op, value}], pageSize?, startCursor? }
router.post('/actions/list-entries', async (req, res, next) => {
  try {
    const { dbId, filters = [], pageSize, startCursor } = req.body || {};
    if (!dbId) return res.status(400).json({ success: false, message: 'dbId is required' });

    // Convert array -> DynamicModel.getAll({ filters: {...} }) shape
    // Supported ops: contains (text), equals (text/select/checkbox), date_equals
    const fobj = {};
    for (const f of filters) {
      if (!f || !f.name) continue;
      const name = String(f.name);
      const op = String(f.op || '').toLowerCase();
      const val = f.value;

      if (op === 'contains') {
        fobj[name] = String(val || '');
      } else if (op === 'equals') {
        // allow boolean/number/string
        fobj[name] = val;
      } else if (op === 'date_equals') {
        fobj[name] = { equals: String(val) };
      }
    }

    const model = new DynamicModel(dbId);
    const result = await model.getAll({
      filters: fobj,
      pageSize: pageSize || 50,
      startCursor
    });

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});


module.exports = router;