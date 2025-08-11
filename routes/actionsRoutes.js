// routes/actionsRoutes.js
const express = require('express');
const router = express.Router();

const DynamicModel = require('../models/dynamicModel');
const databaseRegistry = require('../config/databaseRegistry');
const NotionDiscoveryService = require('../services/notionDiscoveryService');

/* ===================== helpers: name + value mapping ===================== */

function findTitlePropName(schema) {
  if (!schema?.properties) return null;
  for (const [name, def] of Object.entries(schema.properties)) {
    const t1 = def?.type;
    const t2 = def && typeof def === 'object' ? Object.keys(def)[0] : undefined;
    if (t1 === 'title' || t2 === 'title') return name;
  }
  return null;
}

function resolvePropName(inputName, schema) {
  if (!schema?.properties || !inputName) return inputName;
  const keys = Object.keys(schema.properties);
  const hit = keys.find(k => k.toLowerCase() === String(inputName).toLowerCase());
  if (hit) return hit;

  // alias "title"/"name" -> actual title property
  if (['title', 'name'].includes(String(inputName).toLowerCase())) {
    const t = findTitlePropName(schema);
    if (t) return t;
  }
  return inputName;
}

function coerceFieldValue(field, typeHint) {
  const hint = (typeHint || field.type || '').toLowerCase();
  switch (hint) {
    case 'multi_select': {
      if (Array.isArray(field.values) && field.values.length) return field.values.map(String);
      if (Array.isArray(field.value)) return field.value.map(String);
      if (typeof field.value === 'string' && field.value.trim()) return [field.value.trim()];
      return []; // clear
    }
    case 'select': {
      if (typeof field.value === 'string' && field.value.trim()) return field.value.trim();
      if (Array.isArray(field.values) && field.values.length) return String(field.values[0]);
      return null; // clear
    }
    case 'checkbox': {
      if (typeof field.value === 'boolean') return field.value;
      if (typeof field.value === 'string') return field.value.toLowerCase() === 'true';
      return false;
    }
    case 'number': {
      if (typeof field.value === 'number') return field.value;
      if (typeof field.value === 'string' && field.value.trim() !== '') {
        const n = Number(field.value);
        return Number.isFinite(n) ? n : null;
      }
      return null;
    }
    case 'date': {
      return field.value || field.text || null; // accept either
    }
    case 'rich_text': {
      if (typeof field.text === 'string') return field.text;
      if (typeof field.value === 'string') return field.value;
      return ''; // clear
    }
    case 'title': {
      return field.value ?? field.text ?? '';
    }
    default: {
      // fallback: prefer value -> text -> values
      if (field.value !== undefined) return field.value;
      if (field.text !== undefined) return field.text;
      if (field.values !== undefined) return field.values;
      return null;
    }
  }
}

function valuesArrayToUpdate(values, schema) {
  const out = {};
  for (const f of values || []) {
    if (!f || !f.name) continue;
    const canonical = resolvePropName(f.name, schema);
    const def = schema?.properties?.[canonical];
    const typeHint = def?.type || (def && Object.keys(def)[0]) || f.type;
    out[canonical] = coerceFieldValue(f, typeHint);
  }
  return out;
}

async function getSchemaEnsure(dbId) {
  let schema = databaseRegistry.getDatabaseSchema(dbId);
  if (!schema) {
    // hydrate from live discovery and normalize to registry format
    const live = await NotionDiscoveryService.getDatabaseSchema(dbId);
    const props = {};
    for (const [name, def] of Object.entries(live.properties || {})) {
      props[name] = { type: def.type };
      if ((def.type === 'select' || def.type === 'multi_select') && def.options) {
        props[name].options = def.options;
      }
      if (def.type === 'relation' && def.database_id) {
        props[name].relation = { database_id: def.database_id };
      }
    }
    schema = { id: live.id, name: live.name, properties: props, url: live.url };
    databaseRegistry.registerDatabase(schema);
    await databaseRegistry.saveSchema(schema);
  }
  return schema;
}

function pickVisible(entry, changedKeys) {
  const out = {
    id: entry.id,
    createdTime: entry.createdTime,
    lastEditedTime: entry.lastEditedTime
  };
  for (const k of changedKeys || []) {
    if (entry[k] !== undefined) out[k] = entry[k];
  }
  return out;
}

/* ===================== Actions: create / update entry ===================== */

// POST /api/actions/create-entry
router.post('/actions/create-entry', async (req, res, next) => {
  try {
    const { dbId, values } = req.body || {};
    if (!dbId || !Array.isArray(values)) {
      return res.status(400).json({ success: false, message: 'dbId and values[] required' });
    }

    const schema = await getSchemaEnsure(dbId);
    const data = valuesArrayToUpdate(values, schema);

    const model = new DynamicModel(dbId);
    const entry = await model.create(data);

    // trim the response to avoid huge payloads
    res.status(201).json({ success: true, entry: pickVisible(entry, Object.keys(data)) });
  } catch (err) { next(err); }
});

// POST /api/actions/update-entry
router.post('/actions/update-entry', async (req, res, next) => {
  try {
    const { dbId, entryId, values } = req.body || {};
    if (!dbId || !entryId || !Array.isArray(values)) {
      return res.status(400).json({ success: false, message: 'dbId, entryId and values[] required' });
    }

    const schema = await getSchemaEnsure(dbId);
    const data = valuesArrayToUpdate(values, schema);

    const model = new DynamicModel(dbId);
    const entry = await model.update(entryId, data);

    res.json({ success: true, entry: pickVisible(entry, Object.keys(data)) });
  } catch (err) { next(err); }
});

module.exports = router;