// controllers/discoveryController.js
const NotionDiscoveryService = require('../services/notionDiscoveryService');

/**
 * Controller for discovering existing Notion databases
 */
const discoveryController = {
  /**
   * Discover all databases in the Notion workspace
   */
  discoverDatabases: async (req, res) => {
    try {
      console.log('Starting database discovery...');
      
      const databases = await NotionDiscoveryService.discoverDatabases();
      
      res.json({
        success: true,
        count: databases.length,
        databases,
        message: `Found ${databases.length} databases in your Notion workspace`
      });
    } catch (error) {
      console.error('Error in discoverDatabases:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to discover databases',
        error: error.message
      });
    }
  },

  /**
   * Get complete schema for a specific database
   */
  getDatabaseSchema: async (req, res) => {
    try {
      const { id } = req.params;
      
      console.log(`Getting schema for database: ${id}`);
      
      const schema = await NotionDiscoveryService.getDatabaseSchema(id);
      
      res.json({
        success: true,
        database: schema
      });
    } catch (error) {
      console.error('Error in getDatabaseSchema:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get database schema',
        error: error.message
      });
    }
  },

  /**
   * Discover all databases with their complete schemas
   */
  discoverAllWithSchemas: async (req, res) => {
    try {
      console.log('Starting complete database discovery with schemas...');
      
      const databases = await NotionDiscoveryService.discoverAllDatabasesWithSchemas();
      
      res.json({
        success: true,
        count: databases.length,
        databases,
        message: `Found ${databases.length} databases with complete schemas`
      });
    } catch (error) {
      console.error('Error in discoverAllWithSchemas:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to discover databases with schemas',
        error: error.message
      });
    }
  }
};

module.exports = discoveryController;