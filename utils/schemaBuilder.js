/** utils/schemaBuilder.js
 * Utility to help build Notion database schemas
 */
class SchemaBuilder {
    /**
     * Create a new schema builder
     * @param {string} name - Database name
     */
    constructor(name) {
      this.schema = {
        name,
        properties: {}
      };
    }
  
    /**
     * Add a title property (required for Notion databases)
     * @param {string} name - Property name
     * @param {boolean} required - Whether the property is required
     * @returns {SchemaBuilder} - For method chaining
     */
    addTitle(name, required = true) {
      this.schema.properties[name] = {
        type: 'title',
        required
      };
      return this;
    }
  
    /**
     * Add a rich text property
     * @param {string} name - Property name
     * @param {boolean} required - Whether the property is required
     * @returns {SchemaBuilder} - For method chaining
     */
    addRichText(name, required = false) {
      this.schema.properties[name] = {
        type: 'rich_text',
        required
      };
      return this;
    }
  
    /**
     * Add a checkbox property
     * @param {string} name - Property name
     * @returns {SchemaBuilder} - For method chaining
     */
    addCheckbox(name) {
      this.schema.properties[name] = {
        type: 'checkbox'
      };
      return this;
    }
  
    /**
     * Add a select property
     * @param {string} name - Property name
     * @param {Array} options - Select options
     * @returns {SchemaBuilder} - For method chaining
     */
    addSelect(name, options = []) {
      this.schema.properties[name] = {
        type: 'select',
        options: options.map(option => ({
          name: option,
          // Add color property if needed
          color: 'default'
        }))
      };
      return this;
    }
  
    /**
     * Add a multi-select property
     * @param {string} name - Property name
     * @param {Array} options - Multi-select options
     * @returns {SchemaBuilder} - For method chaining
     */
    addMultiSelect(name, options = []) {
      this.schema.properties[name] = {
        type: 'multi_select',
        options: options.map(option => ({
          name: option,
          // Add color property if needed
          color: 'default'
        }))
      };
      return this;
    }
  
    /**
     * Add a date property
     * @param {string} name - Property name
     * @returns {SchemaBuilder} - For method chaining
     */
    addDate(name) {
      this.schema.properties[name] = {
        type: 'date'
      };
      return this;
    }
  
    /**
     * Add a number property
     * @param {string} name - Property name
     * @param {string} format - Number format ('number', 'dollar', 'percent', etc.)
     * @returns {SchemaBuilder} - For method chaining
     */
    addNumber(name, format = 'number') {
      this.schema.properties[name] = {
        type: 'number',
        format
      };
      return this;
    }
  
    /**
     * Add a URL property
     * @param {string} name - Property name
     * @returns {SchemaBuilder} - For method chaining
     */
    addUrl(name) {
      this.schema.properties[name] = {
        type: 'url'
      };
      return this;
    }
  
    /**
     * Add an email property
     * @param {string} name - Property name
     * @returns {SchemaBuilder} - For method chaining
     */
    addEmail(name) {
      this.schema.properties[name] = {
        type: 'email'
      };
      return this;
    }
  
    /**
     * Add a phone number property
     * @param {string} name - Property name
     * @returns {SchemaBuilder} - For method chaining
     */
    addPhoneNumber(name) {
      this.schema.properties[name] = {
        type: 'phone_number'
      };
      return this;
    }
  
    /**
     * Add a relation property
     * @param {string} name - Property name
     * @param {string} databaseId - ID of the related database
     * @returns {SchemaBuilder} - For method chaining
     */
    addRelation(name, databaseId) {
      this.schema.properties[name] = {
        type: 'relation',
        relation: {
          database_id: databaseId
        }
      };
      return this;
    }
  
    /**
     * Add a files property
     * @param {string} name - Property name
     * @returns {SchemaBuilder} - For method chaining
     */
    addFiles(name) {
      this.schema.properties[name] = {
        type: 'files'
      };
      return this;
    }
  
    /**
     * Convert the schema to Notion API format for database creation
     * @returns {Object} - Notion API compatible properties object
     */
    toNotionProperties() {
      const result = {};
      
      for (const [name, config] of Object.entries(this.schema.properties)) {
        switch (config.type) {
          case 'title':
            result[name] = { title: {} };
            break;
          case 'rich_text':
            result[name] = { rich_text: {} };
            break;
          case 'checkbox':
            result[name] = { checkbox: {} };
            break;
          case 'select':
            result[name] = { 
              select: { 
                options: config.options || [] 
              } 
            };
            break;
          case 'multi_select':
            result[name] = { 
              multi_select: { 
                options: config.options || [] 
              } 
            };
            break;
          case 'date':
            result[name] = { date: {} };
            break;
          case 'number':
            result[name] = { 
              number: { 
                format: config.format || 'number' 
              } 
            };
            break;
          case 'url':
            result[name] = { url: {} };
            break;
          case 'email':
            result[name] = { email: {} };
            break;
          case 'phone_number':
            result[name] = { phone_number: {} };
            break;
          case 'relation':
            result[name] = { 
              relation: { 
                database_id: config.relation.database_id 
              } 
            };
            break;
          case 'files':
            result[name] = { files: {} };
            break;
          // Add more property types as needed
        }
      }
      
      return result;
    }
  
    /**
     * Get the complete schema
     * @returns {Object} - Schema object
     */
    getSchema() {
      return this.schema;
    }
  }
  
  module.exports = SchemaBuilder;