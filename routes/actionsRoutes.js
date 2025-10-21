// routes/actionsRoutes.js
const express = require("express");
const router = express.Router();

const DynamicModel = require("../models/dynamicModel");
const databaseRegistry = require("../config/databaseRegistry");
const NotionDiscoveryService = require("../services/notionDiscoveryService");
const dynamicDbService = require("../services/dynamicDbService");

const TASKS_DATABASE_ID = process.env.NOTION_TASKS_DATABASE_ID

const { validateFormulaBasics } = require('../utils/notionFormulas');

/* ===== helpers: name + value mapping (for multi_select, rich_text, etc.) ===== */

function findTitlePropName(schema) {
  if (!schema?.properties) return null;
  for (const [name, def] of Object.entries(schema.properties)) {
    const t1 = def?.type;
    const t2 = def && typeof def === "object" ? Object.keys(def)[0] : undefined;
    if (t1 === "title" || t2 === "title") return name;
  }
  return null;
}

function resolvePropName(inputName, schema) {
  if (!schema?.properties || !inputName) return inputName;
  const keys = Object.keys(schema.properties);
  const hit = keys.find(
    (k) => k.toLowerCase() === String(inputName).toLowerCase()
  );
  if (hit) return hit;
  if (["title", "name"].includes(String(inputName).toLowerCase())) {
    const t = findTitlePropName(schema);
    if (t) return t;
  }
  return inputName;
}

function coerceFieldValue(field, typeHint) {
  const hint = (typeHint || field.type || "").toLowerCase();
  switch (hint) {
    case "multi_select":
      if (Array.isArray(field.values) && field.values.length)
        return field.values.map(String);
      if (Array.isArray(field.value)) return field.value.map(String);
      if (typeof field.value === "string" && field.value.trim())
        return [field.value.trim()];
      return [];
    case "select":
      if (typeof field.value === "string" && field.value.trim())
        return field.value.trim();
      if (Array.isArray(field.values) && field.values.length)
        return String(field.values[0]);
      return null;
    case "checkbox":
      if (typeof field.value === "boolean") return field.value;
      if (typeof field.value === "string")
        return field.value.toLowerCase() === "true";
      return false;
    case "number":
      if (typeof field.value === "number") return field.value;
      if (typeof field.value === "string" && field.value.trim() !== "") {
        const n = Number(field.value);
        return Number.isFinite(n) ? n : null;
      }
      return null;
    case "date":
      return field.value || field.text || null;
    case "rich_text":
      if (typeof field.value === "string" && field.value.trim())
        return field.value;
      if (typeof field.text === "string") return field.text;
      return "";
    case "title":
      if (typeof field.value === "string" && field.value.trim())
        return field.value;
      if (typeof field.text === "string" && field.text.trim())
        return field.text;
      return "";
    case "relation":
      if (Array.isArray(field.values) && field.values.length) 
        return field.values.map(String);
      if (Array.isArray(field.value)) 
        return field.value.map(String);
      if (typeof field.value === "string" && field.value.trim()) 
        return [field.value.trim()];
      if (typeof field.text === "string" && field.text.trim()) 
        return [field.text.trim()];
      return [];
    case "formula":
      // Formulas are read-only, shouldn't be set via values
      return null;
    case "rollup":
      // Rollups are read-only, shouldn't be set via values
      return null;
    default:
      if (field.value !== undefined) return field.value;
      if (field.text !== undefined) return field.text;
      if (field.values !== undefined) return field.values;
      return null;
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


function fieldsToProperties(fields = []) {
  const out = {};
  for (const f of fields) {
    if (!f || typeof f !== "object") continue;
    const name = String(f.name || "").trim();
    const type = String(f.type || "").trim();
    if (!name || !type) continue;

    const def = { type };

    // Handle select/multi_select options
    if (
      (type === "select" || type === "multi_select") &&
      Array.isArray(f.options)
    ) {
      def.options = f.options.map((opt) =>
        typeof opt === "string" ? opt : String(opt)
      );
    }

    // Handle relation properties (one-way and two-way)
    if (type === "relation" && f.database_id) {
      def.relation = {
        database_id: String(f.database_id),
      };

      // Handle two-way relations
      if (f.synced_property_name) {
        def.relation.synced_property_name = String(f.synced_property_name);
      }
    }

    // Handle formula properties with validation
    if (type === "formula" && f.expression) {
      const issues = validateFormulaBasics(f.expression);
      if (issues.length > 0) {
        console.warn(`⚠️  Formula validation warnings for "${name}":`, issues);
        // Log but don't block - let Notion give the final verdict
      }
      def.expression = String(f.expression);
    }

    // Handle rollup properties
    if (
      type === "rollup" &&
      f.relation_property_name &&
      f.rollup_property_name &&
      f.function
    ) {
      def.rollup = {
        relation_property_name: String(f.relation_property_name),
        rollup_property_name: String(f.rollup_property_name),
        function: String(f.function),
      };
    }

    // Handle number format if provided
    if (type === "number" && f.format) {
      def.format = f.format;
    }
    out[name] = def;
  }
  return out;
}
async function getSchemaEnsure(dbId) {
  let schema = databaseRegistry.getDatabaseSchema(dbId);
  if (!schema) {
    const live = await NotionDiscoveryService.getDatabaseSchema(dbId);
    const props = {};
    for (const [name, def] of Object.entries(live.properties || {})) {
      props[name] = { type: def.type };
      if (
        (def.type === "select" || def.type === "multi_select") &&
        def.options
      ) {
        props[name].options = def.options;
      }
      if (def.type === "relation" && def.database_id) {
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
    lastEditedTime: entry.lastEditedTime,
  };
  for (const k of changedKeys || []) {
    if (entry[k] !== undefined) out[k] = entry[k];
  }
  return out;
}

/* ====================== actions endpoints ====================== */

// LIVE discovery list
router.get("/actions/list-databases", async (req, res, next) => {
  try {
    const all = await NotionDiscoveryService.discoverDatabases();
    // filter out trashed/archived if present
    const filtered = all.filter((d) => !(d.in_trash || d.archived));
    res.json({ success: true, count: filtered.length, databases: filtered });
  } catch (err) {
    console.error("Error listing databases:", err);
    next(err);
  }
});

// GET /api/actions/list-entries?dbId=...&pageSize=..&startCursor=..
router.get("/actions/list-entries", async (req, res, next) => {
  try {
    const { dbId, pageSize, startCursor } = req.query || {};
    if (!dbId)
      return res.status(400).json({ success: false, message: "dbId required" });

    await getSchemaEnsure(dbId);

    const model = new DynamicModel(dbId);
    const results = await model.getAll({
      pageSize: pageSize ? Number(pageSize) : undefined,
      startCursor: startCursor || undefined,
    });

    res.json({ success: true, ...results });
  } catch (err) {
    console.error("Error listing entries:", err);
    next(err);
  }
});

// create entry
router.post("/actions/create-entry", async (req, res, next) => {
  try {
    const { dbId, values } = req.body || {};
    if (!dbId || !Array.isArray(values)) {
      return res
        .status(400)
        .json({ success: false, message: "dbId and values[] required" });
    }
    const schema = await getSchemaEnsure(dbId);
    const data = valuesArrayToUpdate(values, schema);

    console.log("Creating entry with data:", JSON.stringify(data, null, 2));

    const model = new DynamicModel(dbId);
    const entry = await model.create(data);
    res
      .status(201)
      .json({ success: true, entry: pickVisible(entry, Object.keys(data)) });
  } catch (err) {
    console.error("Error creating entry:", err);
    next(err);
  }
});

// update entry
router.post("/actions/update-entry", async (req, res, next) => {
  try {
    const { dbId, entryId, values } = req.body || {};
    if (!dbId || !entryId || !Array.isArray(values)) {
      return res
        .status(400)
        .json({
          success: false,
          message: "dbId, entryId and values[] required",
        });
    }
    const schema = await getSchemaEnsure(dbId);
    const data = valuesArrayToUpdate(values, schema);

    console.log("Updating entry with data:", JSON.stringify(data, null, 2));

    const model = new DynamicModel(dbId);
    const entry = await model.update(entryId, data);
    res.json({ success: true, entry: pickVisible(entry, Object.keys(data)) });
  } catch (err) {
    console.error("Error updating entry:", err);
    next(err);
  }
});


//delete an entry api/actions/delete-entry 
router.post('/actions/delete-entry', async (req, res, next) => {
  try {
    const { dbId, entryId } = req.body || {};
    if (!dbId || !entryId) {
      return res.status(400).json({ 
        success: false, 
        message: 'dbId and entryId required' 
      });
    }
    
    await getSchemaEnsure(dbId);
    const model = new DynamicModel(dbId);
    
    const result = await model.delete(entryId);
    res.json({ success: true, result });
  } catch (err) {
    console.error('Error deleting entry:', err);
    next(err);
  }
});

// POST /api/actions/create-database
router.post("/actions/create-database", async (req, res, next) => {
  try {
    const { name, fields } = req.body || {};
    if (!name || !Array.isArray(fields) || !fields.length) {
      return res
        .status(400)
        .json({ success: false, message: "name and fields[] required" });
    }

    // ensure a title exists
    const hasTitle = fields.some(
      (f) => String(f?.type).toLowerCase() === "title"
    );
    const fieldsNorm = hasTitle
      ? fields
      : [{ name: "Title", type: "title" }, ...fields];

    const properties = fieldsToProperties(fieldsNorm);

    console.log(
      "Creating database with properties:",
      JSON.stringify(properties, null, 2)
    );

    const db = await dynamicDbService.createDatabase({ name, properties });
    res.status(201).json({ success: true, database: db });
  } catch (err) {
    console.error("Error creating database:", err);
    next(err);
  }
});

// POST /api/actions/add-properties
router.post("/actions/add-properties", async (req, res, next) => {
  try {
    const { dbId, fields } = req.body || {};
    if (!dbId || !Array.isArray(fields) || !fields.length) {
      return res
        .status(400)
        .json({ success: false, message: "dbId and fields[] required" });
    }

    const properties = fieldsToProperties(fields);

    console.log(
      "Adding properties to database:",
      JSON.stringify(properties, null, 2)
    );

    const updated = await dynamicDbService.updateDatabase(dbId, { properties });
    res.json({ success: true, database: updated });
  } catch (err) {
    console.error("Error adding properties:", err);
    next(err);
  }
});









// BATCH ENDPOINTS! //


// BATCH CREATE
router.post('/actions/batch-create', async (req, res, next) => {
  try {
    const { dbId, entries } = req.body || {};
    if (!dbId || !Array.isArray(entries)) {
      return res.status(400).json({ success: false, message: 'dbId and entries[] required' });
    }

    // Use optimized batch for Tasks database
    if (dbId === TASKS_DATABASE_ID) {
      const tasks = entries.map(e => convertValuesToTaskData(e.values || []));
      const result = await TaskModel.createBatch(tasks);
      return res.status(result.success ? 201 : 207).json({
        ...result,
        optimized: true
      });
    }

    // For other databases, create entries one by one (or use batch if available)
    const schema = await getSchemaEnsure(dbId);
    const model = new DynamicModel(dbId);
    
    // Check if model has batch support
    if (model.createBatch) {
      const dataArray = entries.map(e => valuesArrayToUpdate(e.values || [], schema));
      const result = await model.createBatch(dataArray);
      return res.status(result.success ? 201 : 207).json(result);
    }
    
    // Fallback: create one by one
    const results = [];
    const errors = [];
    
    for (let i = 0; i < entries.length; i++) {
      try {
        const data = valuesArrayToUpdate(entries[i].values || [], schema);
        const entry = await model.create(data);
        results.push(entry);
      } catch (err) {
        errors.push({ index: i, error: err.message });
      }
    }

    res.status(errors.length === 0 ? 201 : 207).json({
      success: errors.length === 0,
      created: results.length,
      failed: errors.length,
      entries: results,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (err) {
    console.error('Error in batch create:', err);
    next(err);
  }
});

//BATCH UPDATE ENTRIES 

router.post('/actions/batch-update', async (req, res, next) => {
  try {
    const { dbId, updates } = req.body || {};
    if (!dbId || !Array.isArray(updates) || !updates.length) {
      return res.status(400).json({ 
        success: false, 
        message: 'dbId and updates[] required' 
      });
    }
    
    const schema = await getSchemaEnsure(dbId);
    const model = new DynamicModel(dbId);
    
    // Convert each update from values[] format to data format
    const formattedUpdates = updates.map(update => {
      if (!update.entryId) {
        throw new Error('Each update must have entryId');
      }
      return {
        id: update.entryId,
        data: valuesArrayToUpdate(update.values || [], schema)
      };
    });
    
    const result = await model.updateBatch(formattedUpdates);
    res.json(result);
  } catch (err) {
    console.error('Error in batch update:', err);
    next(err);
  }
});

// BATCH DELETE ENDPOINT(ARCHIVE)
router.post('/actions/batch-delete', async (req, res, next) => {
  try {
    const { dbId, entryIds } = req.body || {};
    if (!dbId || !Array.isArray(entryIds) || !entryIds.length) {
      return res.status(400).json({ 
        success: false, 
        message: 'dbId and entryIds[] required' 
      });
    }
    
    await getSchemaEnsure(dbId);
    const model = new DynamicModel(dbId);
    
    const result = await model.deleteBatch(entryIds);
    res.json(result);
  } catch (err) {
    console.error('Error in batch delete:', err);
    next(err);
  }
});





module.exports = router;
