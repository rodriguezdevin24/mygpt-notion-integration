//dynamicController.js

const dynamicDbService = require('../services/dynamicDbService');


//Controller for the dynamic database operations

const dynamicController = {
  /**
   * POST api/dynamic/databses
   * Create a new database based on a spec
   */
  async createDatabase(req, res, next) {
    try {
      // Pass the request body straight through as the spec
      const database = await dynamicDbService.createDatabase(req.body);
      // Respond with the newly created database schema
      res.status(201).json({ success: true, databases });
    } catch (err) {
      next(err)
    }
  },

  /**
   * Get /api/dynamic/databases
   * List all registered databases
   */
  getAllDatabases(req, res, next) {
    console.log('🔍 GET /api/dynamic/databases called');
    try {
      const databases = dynamicDbService.getAllDatabases();
      console.log('➡️ dynamicDbService returned:', databases);
      res.json({ success: true. databases });
    } catch (err) {
      next (err)
    }
  },

  /**
   * GET api/dynamic/databases/:id
   * Retrieve schema for a single database
   */

  getDatabaseById(req, res, next) {
    try {
      const { id } = req.params;
      const database = dynamicDbService.getDatabaseById(id);
      if (!database) {
        return res.status(404).json({ success: false, message: 'Database not found. tell dev whats good'})
      }
      res.json ({ success: true, database });
    } catch (err) {
      next(err);
    }
  },


  async updateDatabase(req, res, next) {
    try {
      const { id: dbId } = req.params;
      // Make sure this is correctly structured
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      const propertyUpdates = req.body.properties;
      const schema = await dynamicDbService.updateDatabase(dbId, {
        name: req.body.name,  // Include this if you want to allow name updates
        properties: propertyUpdates
      });
      
      res.json({ success: true, database: schema });
    } catch (err) {
      next(err);
    }
  },
};

module.exports = dynamicController;
