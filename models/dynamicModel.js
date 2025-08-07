//models/dynamicModel.js
const { notion } = require('../config/notion');
const databaseRegistry = require('../config/databaseRegistry');

/**
 * Generic model for interacting with any Notion database,
 * with filter building and debug support
 */
class DynamicModel {
  /**
   * Create a new DynamicModel instance
   * @param {string} databaseId - Notion database ID
   */
  constructor(databaseId) {
    this.databaseId = databaseId;
    this.schema = databaseRegistry.getDatabaseSchema(databaseId);
    if (!this.schema) {
      throw new Error(`No schema found for database ID: ${databaseId}`);
    }
  }

  /**
   * Debug helper to log Notion properties
   * @param {Object} properties
   */
  debugProperties(properties) {
    console.log(`Properties for database ${this.schema.name}:`);
    console.log(JSON.stringify(properties, null, 2));
  }

  /**
   * Convert a Notion page to a plain JS object based on the schema
   * @param {Object} page - Notion page object
   * @returns {Object}
   */
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

  /**
   * Convert a JS object into Notion properties based on the schema
   * @param {Object} data - Key/value pairs of property data
   * @returns {Object} Notion-formatted properties
   */
  formatForNotion(data) {
    const properties = {};
    
    console.log('Input data:', JSON.stringify(data, null, 2));
    console.log('Schema properties:', JSON.stringify(this.schema.properties, null, 2));
    
    for (const [propName, propDef] of Object.entries(this.schema.properties)) {
      if (data[propName] === undefined) {
        console.log(`Property ${propName} not in input data, skipping`);
        continue;
      }
      
      const value = data[propName];
      console.log(`Processing property: ${propName}, value:`, value);
      console.log(`Property definition:`, JSON.stringify(propDef, null, 2));
      
      // Try different ways to get the property type
      let propType;
      
      if (propDef.type) {
        // If schema stores type directly
        propType = propDef.type;
      } else if (typeof propDef === 'object' && Object.keys(propDef).length > 0) {
        // If schema stores type as first key
        propType = Object.keys(propDef)[0];
      } else {
        // Fall back to inferring from property name
        if (propName === 'Title' || propName.toLowerCase().includes('name')) {
          propType = 'title';
        } else if (propName.toLowerCase().includes('date')) {
          propType = 'date';
        } else if (propName === 'Status' || propName.toLowerCase().includes('status')) {
          propType = 'select';
        } else if (propName.toLowerCase().includes('checkbox') || 
                  propName.toLowerCase().includes('completed')) {
          propType = 'checkbox';
        } else {
          propType = 'rich_text'; // Default fallback
        }
      }
      
      console.log(`Using property type: ${propType} for ${propName}`);
      
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
            console.log(`Unhandled property type: ${propType} for ${propName}`);
            // Default to rich_text as fallback
            properties[propName] = {
              rich_text: value ? [{ text: { content: String(value) } }] : []
            };
        }
      } catch (error) {
        console.error(`Error formatting property ${propName}:`, error);
      }
    }
    
    console.log('Final properties:', JSON.stringify(properties, null, 2));
    return properties;
  }
  /**
   * Build Notion filter conditions from high-level filter params
   * @param {Object} filters - e.g. { Completed: true, Status: 'Done', DueDate: { after: '2025-05-01' } }
   * @returns {Array} Array of Notion filter objects
   */
  buildFilterConditions(filters) {
    const filterConditions = [];

    for (const [key, value] of Object.entries(filters)) {
      if (['sorts', 'pageSize', 'startCursor'].includes(key)) continue;
      const propConfig = this.schema.properties[key];
      if (!propConfig) continue;

      // propConfig originally saved in registerDatabase is Notion API shape
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

  /**
   * Get all entries with optional high-level filters
   * @param {Object} options - { filters, sorts, pageSize, startCursor }
   */
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

  /**
   * Get a single entry by ID
   */
  async getById(id) {
    const page = await notion.pages.retrieve({ page_id: id });
    return this.formatFromNotion(page);
  }

  /**
   * Create a new entry
   */
  async create(data) {
    const properties = this.formatForNotion(data);
    const page = await notion.pages.create({
      parent: { database_id: this.databaseId },
      properties
    });
    return this.formatFromNotion(page);
  }

  /**
   * Update an entry
   */
  async update(id, data) {
    const properties = this.formatForNotion(data);
    const page = await notion.pages.update({
      page_id: id,
      properties
    });
    return this.formatFromNotion(page);
  }

  /**
   * Archive (delete) an entry
   */
  async delete(id) {
    const page = await notion.pages.update({
      page_id: id,
      archived: true
    });
    return { id, archived: page.archived };
  }
}

module.exports = DynamicModel;