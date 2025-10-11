//databaseRegistry.js
const fs = require('fs').promises;
const path = require('path');
const { notion } = require('./notion');

// TASKS DATABASE ID TO EXCLUDE
const TASKS_DATABASE_ID = process.env.NOTION_TASKS_DATABASE_ID;

/**
 * Registry for managing Notion databases dynamically
 */
class DatabaseRegistry {
  constructor() {
    this.databases = new Map();
    this.schemaDir = path.join(__dirname, '..', 'schemas');
  }

  /**
   * Initialize the registry by loading all stored database schemas
   */
  async initialize() {
    try {
      // Check if schemas directory exists, create if not
      try {
        await fs.access(this.schemaDir);
      } catch (error) {
        await fs.mkdir(this.schemaDir, { recursive: true });
      }

      // Load all schema files
      const files = await fs.readdir(this.schemaDir);
      const schemaFiles = files.filter(file => file.endsWith('.json'));

      for (const file of schemaFiles) {
        const filePath = path.join(this.schemaDir, file);
        const content = await fs.readFile(filePath, 'utf8');
        const schema = JSON.parse(content);
        
        // SKIP TASKS DATABASE - IT'S HARDCODED NOW
        if (schema.id === TASKS_DATABASE_ID) {
          console.log(`Skipping Tasks database (${schema.id}) - using hardcoded system`);
          // Optionally delete the file
          await fs.unlink(filePath).catch(() => {});
          continue;
        }
        
        this.registerDatabase(schema);
      }

      console.log(`Loaded ${this.databases.size} database schemas from storage (excluding Tasks)`);
    } catch (error) {
      console.error('Error initializing database registry:', error);
    }
  }

  /**
   * Register a database with the registry
   * @param {Object} schema - Database schema object
   */
  registerDatabase(schema) {
    if (!schema.id || !schema.name) {
      throw new Error('Database schema must include id and name');
    }

    // SKIP TASKS DATABASE
    if (schema.id === TASKS_DATABASE_ID) {
      console.log('Skipping Tasks database registration - using hardcoded system');
      return;
    }

    this.databases.set(schema.id, schema);
    console.log(`Registered database: ${schema.name} (${schema.id})`);

    //Debug
    const verify = this.databases.get(schema.id);
  if (!verify) {
    console.error(`❌ FAILED TO REGISTER: ${schema.id} - Map.get returns null!`);
  }

  }

  /**
   * Get a database schema by ID
   * @param {string} id - Database ID
   * @returns {Object} - Database schema
   */
  getDatabaseSchema(id) {
    // Return null for Tasks database - it's hardcoded now
    if (id === TASKS_DATABASE_ID) {
      return null;
    }
    return this.databases.get(id);
  }

  /**
   * Get all registered databases
   * @returns {Array} - Array of database schemas
   */
  getAllDatabases() {
    return Array.from(this.databases.values());
  }

  /**
   * Save a database schema to storage
   * @param {Object} schema - Database schema
   */
  async saveSchema(schema) {
    try {
      // DON'T SAVE TASKS DATABASE
      if (schema.id === TASKS_DATABASE_ID) {
        console.log('Not saving Tasks database schema - using hardcoded system');
        return;
      }
      
      const filename = `${schema.id}.json`;
      const filePath = path.join(this.schemaDir, filename);
      await fs.writeFile(filePath, JSON.stringify(schema, null, 2));
      console.log(`Saved schema for ${schema.name} to ${filePath}`);
    } catch (error) {
      console.error(`Error saving schema for ${schema.id}:`, error);
      throw error;
    }
  }

  /**
   * Create a new Notion database and register it
   * @param {Object} options - Database creation options
   * @returns {Object} - Created database schema
   */
  async createDatabase(options) {
    try {
      const { name, parent, properties, icon, cover } = options;
      
      // Default to the Superposition Initiative page if no parent specified
      const parentOption = parent || { 
        type: 'page_id', 
        page_id: process.env.NOTION_PARENT_PAGE_ID || process.env.SUPERPOSITION_PAGE_ID 
      };
      
      // Fall back to workspace if no parent page ID is set
      const finalParent = parentOption.page_id 
        ? parentOption 
        : { type: 'workspace', workspace: true };
      
      // Create the database in Notion
      const response = await notion.databases.create({
        parent: finalParent,
        title: [{ type: 'text', text: { content: name } }],
        properties,
        icon,
        cover
      });

      // Create and save the schema
      const schema = {
        id: response.id,
        name,
        properties,
        createdTime: response.created_time,
        lastEditedTime: response.last_edited_time,
        url: response.url
      };

      this.registerDatabase(schema);
      await this.saveSchema(schema);

      return schema;
    } catch (error) {
      console.error('Error creating database:', error);
      throw error;
    }
  }

  /**
   * Update an existing database schema
   * @param {string} id - Database ID
   * @param {Object} updates - Schema updates
   * @returns {Object} - Updated schema
   */
  async updateDatabaseSchema(id, updates) {
    // Don't update Tasks database
    if (id === TASKS_DATABASE_ID) {
      throw new Error('Cannot update Tasks database through registry - it uses hardcoded system');
    }
    
    const schema = this.getDatabaseSchema(id);
    
    if (!schema) {
      throw new Error(`Database with ID ${id} not found in registry`);
    }

    // Update the schema
    const updatedSchema = { ...schema, ...updates };
    this.databases.set(id, updatedSchema);
    await this.saveSchema(updatedSchema);

    return updatedSchema;
  }

  /**
   * Remove a database from the registry (cleanup method)
   * @param {string} id - Database ID to remove
   */
  removeDatabase(id) {
    if (this.databases.has(id)) {
      this.databases.delete(id);
      console.log(`Removed database ${id} from registry`);
    }
  }
}

const databaseRegistry = new DatabaseRegistry();

module.exports = databaseRegistry;