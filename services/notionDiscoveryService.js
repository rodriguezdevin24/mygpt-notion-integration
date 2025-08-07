// services/notionDiscoveryService.js
const { notion } = require('../config/notion');

/**
 * Service for discovering existing databases in Notion workspace
 */
const NotionDiscoveryService = {
  /**
   * Search for all databases in the Notion workspace
   * Note: This requires the integration to have access to the pages/databases
   * @returns {Array} - Array of database objects with basic info
   */
  discoverDatabases: async () => {
    try {
      console.log('Discovering databases in Notion workspace...');
      
      // Search for all databases the integration has access to
      const response = await notion.search({
        filter: {
          value: 'database',
          property: 'object'
        },
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time'
        }
      });
      
      console.log(`Found ${response.results.length} databases`);
      
      const databases = response.results.map(db => ({
        id: db.id,
        name: db.title?.[0]?.plain_text || 'Untitled Database',
        url: db.url,
        created_time: db.created_time,
        last_edited_time: db.last_edited_time,
        icon: db.icon,
        cover: db.cover
      }));
      
      return databases;
    } catch (error) {
      console.error('Error discovering databases:', error);
      throw error;
    }
  },

  /**
   * Get complete schema for a specific database
   * @param {string} databaseId - The database ID
   * @returns {Object} - Complete database schema
   */
  getDatabaseSchema: async (databaseId) => {
    try {
      console.log(`Getting schema for database: ${databaseId}`);
      
      const response = await notion.databases.retrieve({
        database_id: databaseId
      });
      
      // Extract and format all properties
      const properties = {};
      
      Object.entries(response.properties).forEach(([name, prop]) => {
        properties[name] = {
          type: prop.type,
          id: prop.id,
          name: prop.name || name
        };
        
        // Add type-specific details
        switch (prop.type) {
          case 'select':
            properties[name].options = prop.select?.options?.map(opt => opt.name) || [];
            break;
          case 'multi_select':
            properties[name].options = prop.multi_select?.options?.map(opt => opt.name) || [];
            break;
          case 'relation':
            properties[name].database_id = prop.relation?.database_id;
            properties[name].synced_property_name = prop.relation?.synced_property_name;
            break;
          case 'rollup':
            properties[name].rollup_property_name = prop.rollup?.rollup_property_name;
            properties[name].relation_property_name = prop.rollup?.relation_property_name;
            properties[name].function = prop.rollup?.function;
            break;
          case 'formula':
            properties[name].expression = prop.formula?.expression;
            break;
          case 'number':
            properties[name].format = prop.number?.format;
            break;
        }
      });
      
      return {
        id: response.id,
        name: response.title?.[0]?.plain_text || 'Untitled Database',
        description: response.description?.[0]?.plain_text || '',
        properties,
        url: response.url,
        created_time: response.created_time,
        last_edited_time: response.last_edited_time,
        icon: response.icon,
        cover: response.cover,
        is_inline: response.is_inline,
        parent: response.parent
      };
    } catch (error) {
      console.error(`Error getting schema for database ${databaseId}:`, error);
      throw error;
    }
  },

  /**
   * Get all databases with their complete schemas
   * @returns {Array} - Array of databases with full schema information
   */
  discoverAllDatabasesWithSchemas: async () => {
    try {
      const databases = await NotionDiscoveryService.discoverDatabases();
      
      console.log(`Getting schemas for ${databases.length} databases...`);
      
      const databasesWithSchemas = await Promise.all(
        databases.map(async (db) => {
          try {
            const schema = await NotionDiscoveryService.getDatabaseSchema(db.id);
            return schema;
          } catch (error) {
            console.error(`Failed to get schema for database ${db.id}:`, error.message);
            // Return basic info if schema retrieval fails
            return {
              ...db,
              properties: {},
              error: 'Failed to retrieve schema'
            };
          }
        })
      );
      
      return databasesWithSchemas;
    } catch (error) {
      console.error('Error discovering databases with schemas:', error);
      throw error;
    }
  }
};

module.exports = NotionDiscoveryService;