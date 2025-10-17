//models/dynamicModel.js
const { notion } = require('../config/notion');
const databaseRegistry = require('../config/databaseRegistry');
const batchService = require('../services/batchService');

/**
 * Generic model for interacting with any Notion database,
 * now with BATCH SUPPORT!
 */
class DynamicModel {
  constructor(databaseId) {
    this.databaseId = databaseId;
    this.schema = databaseRegistry.getDatabaseSchema(databaseId);
    if (!this.schema) {
      throw new Error(`No schema found for database ID: ${databaseId}`);
    }
  }

  debugProperties(properties) {
    console.log(`Properties for database ${this.schema.name}:`);
    console.log(JSON.stringify(properties, null, 2));
  }

  formatFromNotion(page) {
    const result = {
      id: page.id,
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time
    };

    for (const [propName, propValue] of Object.entries(page.properties)) {
      if (!propValue) continue;
      switch (propValue.type) {
        case 'title':
          result[propName] = propValue.title?.[0]?.plain_text || '';
          break;
        case 'rich_text':
          result[propName] = propValue.rich_text?.[0]?.plain_text || '';
          break;
        case 'checkbox':
          result[propName] = propValue.checkbox;
          break;
        case 'select':
          result[propName] = propValue.select?.name || null;
          break;
        case 'multi_select':
          result[propName] = propValue.multi_select?.map(o => o.name) || [];
          break;
        case 'date':
          result[propName] = propValue.date?.start || null;
          break;
        case 'number':
          result[propName] = propValue.number;
          break;
        case 'url':
          result[propName] = propValue.url || '';
          break;
        case 'email':
          result[propName] = propValue.email || '';
          break;
        case 'phone_number':
          result[propName] = propValue.phone_number || '';
          break;
        case 'relation':
          result[propName] = propValue.relation?.map(r => r.id) || [];
          break;
        case 'files':
          result[propName] = propValue.files?.map(f => (f.file ? f.file.url : f.external.url)) || [];
          break;
        default:
          console.log(`Unhandled property type: ${propValue.type} for ${propName}`);
      }
    }

    return result;
  }

  formatForNotion(data) {
    console.log('🔍 SCHEMA FORMAT CHECK:');
    console.log('Sample property:', JSON.stringify(Object.entries(this.schema.properties)[0], null, 2));
    const properties = {};
    
    for (const [propName, propDef] of Object.entries(this.schema.properties)) {
      if (data[propName] === undefined) continue;
      
      const value = data[propName];
      let propType;
      
      if (propDef.type) {
        propType = propDef.type;
      } else if (typeof propDef === 'object' && Object.keys(propDef).length > 0) {
        propType = Object.keys(propDef)[0];
      } else {
        propType = 'rich_text'; // Default fallback
      }
      
      try {
        switch (propType) {
          case 'title':
            properties[propName] = {
              title: value ? [{ text: { content: String(value) } }] : []
            };
            break;
          case 'rich_text':
            properties[propName] = {
              rich_text: value ? [{ text: { content: String(value) } }] : []
            };
            break;
          case 'checkbox':
            properties[propName] = { checkbox: Boolean(value) };
            break;
          case 'select':
            properties[propName] = value
              ? { select: { name: String(value) } }
              : { select: null };
            break;
          case 'multi_select':
            properties[propName] = Array.isArray(value)
              ? { multi_select: value.map(name => ({ name: String(name) })) }
              : { multi_select: [] };
            break;
          case 'date':
            properties[propName] = value
              ? { date: { start: String(value) } }
              : { date: null };
            break;
          case 'number':
            properties[propName] = {
              number: typeof value === 'number' ? value : 
                      (value && !isNaN(Number(value)) ? Number(value) : null)
            };
            break;
          case 'url':
            properties[propName] = { url: value ? String(value) : null };
            break;
          case 'email':
            properties[propName] = { email: value ? String(value) : null };
            break;
          case 'phone_number':
            properties[propName] = { phone_number: value ? String(value) : null };
            break;
          case 'relation':
            properties[propName] = {
              relation: Array.isArray(value)
                ? value.map(id => ({ id: String(id) }))
                : []
            };
            break;
          case 'files':
            properties[propName] = { files: [] };
            break;
          default:
            properties[propName] = {
              rich_text: value ? [{ text: { content: String(value) } }] : []
            };
        }
      } catch (error) {
        console.error(`Error formatting property ${propName}:`, error);
      }
    }
    
    return properties;
  }

  buildFilterConditions(filters) {
    const filterConditions = [];

    for (const [key, value] of Object.entries(filters)) {
      if (['sorts', 'pageSize', 'startCursor'].includes(key)) continue;
      const propConfig = this.schema.properties[key];
      if (!propConfig) continue;

      const typeKey = Object.keys(propConfig)[0];
      switch (typeKey) {
        case 'checkbox':
          if (typeof value === 'boolean') filterConditions.push({ property: key, checkbox: { equals: value } });
          break;
        case 'select':
          if (value) filterConditions.push({ property: key, select: { equals: value } });
          break;
        case 'multi_select':
          if (value) filterConditions.push({ property: key, multi_select: { contains: value } });
          break;
        case 'date':
          if (value) {
            const dateFilter = { property: key, date: {} };
            if (value.equals) dateFilter.date.equals = value.equals;
            if (value.after) dateFilter.date.after = value.after;
            if (value.before) dateFilter.date.before = value.before;
            filterConditions.push(dateFilter);
          }
          break;
        case 'number':
          if (value && typeof value === 'object') {
            const nf = { property: key, number: {} };
            if (value.equals !== undefined) nf.number.equals = value.equals;
            if (value.greater_than !== undefined) nf.number.greater_than = value.greater_than;
            if (value.less_than !== undefined) nf.number.less_than = value.less_than;
            filterConditions.push(nf);
          }
          break;
        case 'title':
        case 'rich_text':
          if (value) filterConditions.push({ property: key, [typeKey]: { contains: value } });
          break;
      }
    }

    return filterConditions;
  }

  async getAll(options = {}) {
    const filterArr = this.buildFilterConditions(options.filters || {});
    const filter = filterArr.length ? { and: filterArr } : undefined;
    const sorts = options.sorts || [{ timestamp: 'created_time', direction: 'descending' }];

    const response = await notion.databases.query({
      database_id: this.databaseId,
      filter,
      sorts,
      page_size: options.pageSize || 100,
      start_cursor: options.startCursor
    });

    return {
      results: response.results.map(p => this.formatFromNotion(p)),
      has_more: response.has_more,
      next_cursor: response.next_cursor
    };
  }

  async getById(id) {
    const page = await notion.pages.retrieve({ page_id: id });
    return this.formatFromNotion(page);
  }

  async create(data) {
    const properties = this.formatForNotion(data);
    const page = await notion.pages.create({
      parent: { database_id: this.databaseId },
      properties
    });
    return this.formatFromNotion(page);
  }

  /**
   * CREATE BATCH - New method using batch service!
   * @param {Array} dataArray - Array of data objects to create
   * @returns {Object} Batch results
   */
  async createBatch(dataArray) {
    console.log(`Creating batch of ${dataArray.length} entries for ${this.schema.name}...`);
    
    // Format all entries for Notion
    const formattedEntries = dataArray.map(data => this.formatForNotion(data));
    
    // Use batch service to create entries
    const results = await batchService.createEntries(this.databaseId, formattedEntries);
    
    // Format the response
    return {
      success: results.failed.length === 0,
      created: results.successful.length,
      failed: results.failed.length,
      entries: results.successful.map(r => ({
        ...r.result,
        data: dataArray[r.index]
      })),
      errors: results.failed.map(f => ({
        index: f.index,
        data: dataArray[f.index],
        error: f.error
      })),
      duration: results.duration
    };
  }

  /**
   * UPDATE BATCH - New method!
   * @param {Array} updates - Array of {id, data} objects
   * @returns {Object} Batch results
   */
  async updateBatch(updates) {
    console.log(`Updating batch of ${updates.length} entries for ${this.schema.name}...`);
    
    // Format all updates for Notion
    const formattedUpdates = updates.map(update => ({
      id: update.id,
      properties: this.formatForNotion(update.data)
    }));
    
    // Use batch service to update entries
    const results = await batchService.updateEntries(formattedUpdates);
    
    return {
      success: results.failed.length === 0,
      updated: results.successful.length,
      failed: results.failed.length,
      entries: results.successful,
      errors: results.failed,
      duration: results.duration
    };
  }

  /**
   * DELETE BATCH - Archive multiple entries
   * @param {Array} ids - Array of entry IDs to archive
   * @returns {Object} Batch results
   */
  async deleteBatch(ids) {
    console.log(`Archiving batch of ${ids.length} entries from ${this.schema.name}...`);
    
    const results = await batchService.archiveEntries(ids);
    
    return {
      success: results.failed.length === 0,
      archived: results.successful.length,
      failed: results.failed.length,
      results: results.successful,
      errors: results.failed,
      duration: results.duration
    };
  }

  async update(id, data) {
    const properties = this.formatForNotion(data);
    const page = await notion.pages.update({
      page_id: id,
      properties
    });
    return this.formatFromNotion(page);
  }

  async delete(id) {
    const page = await notion.pages.update({
      page_id: id,
      archived: true
    });
    return { id, archived: page.archived };
  }
}

module.exports = DynamicModel;