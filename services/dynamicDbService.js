//dynamicDBSetup.js

const { notion } = require('../config/notion');
const { validateSpec } = require('../utils/schemaValidator');
const { toNotionProperties } = require('../utils/schemaMapper');
const databaseRegistry = require('../config/databaseRegistry');

const dynamicDbService = {
    /**
   * Create a new Notion database based on the incoming spec
   * @param {Object} spec - Validated dynamic DB spec from client
   * @returns {Object} Created database schema
   */

async createDatabase(spec) {
    // 1. Validate incoming spec against JSON schema 
    validateSpec(spec);
    // 2. Map spec properties to Notion API format 
    const properties = toNotionProperties(spec.properties);
    // 3. Build options for registry(including parent pade it)
    const  options = {
        name: spec.name,
        properties,
        parent: {
            type: 'page_id',
            page_id: process.env.SUPERPOSITION_PAGE_ID
        },
        icon: spec.icon,
        cover: spec.cover 
    };
    // 4. Call registry to create in NOTION and save locally
    const schema = await databaseRegistry.createDatabase(options);
    return schema; 
},

    /**
     * Get all registered dynamic databases 
     * @returns {Array} Array of databases 
     */

    getAllDatabases() {
        return databaseRegistry.getAllDatabases();
    },
    /**
     * Get a single database schema by ID
     * @param {string} id - Database ID
     * @returns {Object[null]} Database schema or null
     */
    getDatabaseById(id) {
        return databaseRegistry.getDatabaseSchema(id);
    },
   /**
 * Rename or update schema properties of an existing database
 * @param {string} dbId
 * @param {Object} updates   // { name?: string, properties?: {...} }
 */
   async updateDatabase(dbId, updates) {
    const patch = { database_id: dbId };
    
    // 1) Rename if requested
    if (updates.name) {
      patch.title = [{ type: 'text', text: { content: updates.name } }];

    }
    
    // 2) Schema changes if provided
    if (updates.properties) {
      // Only validate when properties are actually passed
      validateSpec({ name: 'ignored', properties: updates.properties });
      
      // Convert to Notion format for the API call
      patch.properties = toNotionProperties(updates.properties);
      console.log('→ PATCH payload to Notion:', JSON.stringify(patch, null, 2));
    }
        
    // 3) Send the patch to Notion
    const response = await notion.databases.update(patch);
    console.log('← Notion responded with:', JSON.stringify(response, null, 2));
    
    // 4) Update our local registry
    const current = this.getDatabaseById(dbId);
    if (!current) throw new Error(`Database ${dbId} not found in registry`);
    
    // For properties, merge the ORIGINAL properties with updates
    // (not the Notion API formatted properties)
    const mergedProps = updates.properties
      ? { ...current.properties, ...updates.properties }
      : current.properties;
    
    const updatedSchema = {
      ...current,
      ...(updates.name ? { name: updates.name } : {}),
      properties: mergedProps,
      lastEditedTime: response.last_edited_time
    };
    
    // 5) Persist it
    await databaseRegistry.updateDatabaseSchema(dbId, updatedSchema);
    return updatedSchema;
  },
};

module.exports = dynamicDbService;