// services/dynamicDbService.js
'use strict';

const { notion } = require('../config/notion');
const databaseRegistry = require('../config/databaseRegistry');
const { validateSpec } = require('../utils/schemaValidator');
const { toNotionProperties } = require('../utils/schemaMapper');

/* ---------------- Helpers (loose normalization & mapping) ---------------- */

function ensureCanonicalTitle(properties) {
  properties = properties || {};
  const hasTitle = Object.entries(properties).some(([_, def]) => def && def.type === 'title');
  if (!hasTitle) properties.Title = { type: 'title' };
  return properties;
}

function coerceOptionsInCanonical(properties) {
  properties = properties || {};
  for (const def of Object.values(properties)) {
    if (!def || typeof def !== 'object') continue;
    if ((def.type === 'select' || def.type === 'multi_select') && Array.isArray(def.options)) {
      // Allow either ["A","B"] or [{name:"A"},{name:"B"}]
      if (def.options.every(o => o && typeof o === 'object' && 'name' in o)) {
        def.options = def.options.map(o => String(o.name));
      }
    }
  }
  return properties;
}

function normalizeCreateSpec(spec) {
  spec = spec || {};
  const normalized = {
    name: spec.name,
    icon: spec.icon,
    cover: spec.cover,
    properties: (spec.properties && typeof spec.properties === 'object') ? { ...spec.properties } : {}
  };
  ensureCanonicalTitle(normalized.properties);
  coerceOptionsInCanonical(normalized.properties);
  return normalized;
}

function normalizeUpdateProps(props) {
  if (!props || typeof props !== 'object') return undefined;
  const normalized = { ...props };
  coerceOptionsInCanonical(normalized);
  return normalized;
}

function ensureNotionSafeProps(notionProps) {
  const safe = { ...(notionProps || {}) };
  const hasTitle = Object.values(safe).some(v => v && typeof v === 'object' && Object.prototype.hasOwnProperty.call(v, 'title'));
  if (!hasTitle) safe.Title = { title: {} };
  return safe;
}

function notionToCanonicalProperties(notionProps) {
  const out = {};
  const entries = Object.entries(notionProps || {});
  for (const [name, prop] of entries) {
    const type = prop && prop.type;
    if (!type) continue;
    switch (type) {
      case 'select':
        out[name] = {
          type: 'select',
          options: (prop.select && prop.select.options ? prop.select.options : []).map(o => o.name).filter(Boolean)
        };
        break;
      case 'multi_select':
        out[name] = {
          type: 'multi_select',
          options: (prop.multi_select && prop.multi_select.options ? prop.multi_select.options : []).map(o => o.name).filter(Boolean)
        };
        break;
      case 'number':
        out[name] = { type: 'number', format: (prop.number && prop.number.format) || 'number' };
        break;
      case 'relation':
        out[name] = { type: 'relation', relation: { database_id: prop.relation && prop.relation.database_id } };
        break;
      case 'title':
      case 'rich_text':
      case 'date':
      case 'checkbox':
      case 'url':
      case 'email':
      case 'phone_number':
      case 'files':
        out[name] = { type };
        break;
      default:
        out[name] = { type: 'rich_text' };
        break;
    }
  }
  return out;
}

function tryValidate(spec) {
  try {
    validateSpec(spec);
    return { ok: true };
  } catch (e) {
    console.warn('[dynamicDbService] Spec validation warning:', e.message);
    return { ok: false, error: e };
  }
}

/* ------------------------------ Service API ------------------------------ */

const dynamicDbService = {
  /**
   * Create a new Notion database (loose input)
   * Accepts: { name, properties?, icon?, cover?, parent? }
   * - Auto-injects Title if missing
   * - Coerces select options
   * - Falls back to workspace if parent missing
   */
  async createDatabase(spec) {
    // 1) Normalize to canonical, forgiving input
    const normalized = normalizeCreateSpec(spec);

    // 2) Best-effort validate (non-fatal)
    tryValidate(normalized); // we proceed even if this warns

    // 3) Map canonical -> Notion properties
    const notionProps = toNotionProperties(normalized.properties);

    // 4) Ensure Notion has a Title property
    const safeNotionProps = ensureNotionSafeProps(notionProps);

    // 5) Resolve parent
    const parentOption = (spec && spec.parent) || {
      type: 'page_id',
      page_id: process.env.NOTION_PARENT_PAGE_ID || process.env.SUPERPOSITION_PAGE_ID
    };
    const finalParent = (parentOption && parentOption.page_id)
      ? parentOption
      : { type: 'workspace', workspace: true };

    // 6) Create via registry (which calls Notion and persists locally)
    const created = await databaseRegistry.createDatabase({
      name: normalized.name,
      properties: safeNotionProps,
      parent: finalParent,
      icon: normalized.icon,
      cover: normalized.cover
    });

    return created;
  },

  /** List all registered databases */
  getAllDatabases() {
    return databaseRegistry.getAllDatabases();
  },

  /** Get a single database schema by ID */
  getDatabaseById(id) {
    return databaseRegistry.getDatabaseSchema(id);
  },

  /**
   * Update database name and/or properties (loose)
   * Accepts: { name?, properties? }
   * - Coerces select/multi_select options
   * - Validates only when properties provided (non-fatal)
   * - Patches Notion, then re-syncs live schema back into registry (canonical)
   */
  async updateDatabase(dbId, updates) {
    updates = updates || {};
    const patch = { database_id: dbId };

    if (updates.name) {
      patch.title = [{ type: 'text', text: { content: updates.name } }];
    }

    if (updates.properties) {
      const normProps = normalizeUpdateProps(updates.properties);
      if (normProps) {
        // Try validation loosely
        tryValidate({ name: 'ignored', properties: normProps });

        const notionProps = toNotionProperties(normProps);
        patch.properties = notionProps;
        console.log('→ PATCH payload to Notion:', JSON.stringify({ ...patch, database_id: 'REDACTED' }, null, 2));
      }
    }

    // Send patch to Notion
    const response = await notion.databases.update(patch);
    console.log('← Notion responded with:', JSON.stringify({ id: response.id, last_edited_time: response.last_edited_time }, null, 2));

    // Re-sync from Notion to avoid drift
    const live = await notion.databases.retrieve({ database_id: dbId });
    const canonicalProps = notionToCanonicalProperties(live.properties);

    const current = this.getDatabaseById(dbId) || {};
    const updatedSchema = {
      id: live.id,
      name: (live.title && live.title[0] && live.title[0].plain_text) || updates.name || current.name || 'Untitled',
      properties: canonicalProps,
      lastEditedTime: live.last_edited_time,
      url: live.url,
      icon: live.icon,
      cover: live.cover
    };

    await databaseRegistry.updateDatabaseSchema(dbId, updatedSchema);
    if (typeof databaseRegistry.saveSchema === 'function') {
      await databaseRegistry.saveSchema(updatedSchema);
    }

    return updatedSchema;
  }
};

module.exports = dynamicDbService;