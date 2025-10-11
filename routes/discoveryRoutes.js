// routes/discoveryRoutes.js
const express = require('express');
const router = express.Router();
const discoveryController = require('../controllers/discoveryController');

/**
 * Discovery routes for finding existing Notion databases
 */

// GET all databases in the workspace (basic info)
router.get('/databases', discoveryController.discoverDatabases);

// GET complete schema for a specific database
router.get('/databases/:id/schema', discoveryController.getDatabaseSchema);

// GET all databases with complete schemas (comprehensive)
router.get('/databases/complete', discoveryController.discoverAllWithSchemas);

// Add this test route to routes/discoveryRoutes.js temporarily
// In routes/discoveryRoutes.js
router.get('/debug-schema-lookup/:dbId', (req, res) => {
  const { dbId } = req.params;
  const registry = require('../config/databaseRegistry');
  
  // Get all database IDs in registry
  const allDbs = registry.getAllDatabases();
  const allIds = allDbs.map(d => d.id);
  
  // Try different formats
  const variations = [
    dbId,
    dbId.toLowerCase(),
    dbId.replace(/-/g, ''),
    dbId.toUpperCase()
  ];
  
  const results = variations.map(v => ({
    variant: v,
    found: registry.getDatabaseSchema(v) ? true : false,
    exactMatch: allIds.includes(v)
  }));
  
  res.json({
    requestedId: dbId,
    registryHasIds: allIds,
    lookupResults: results,
    diagnosis: !allIds.includes(dbId) ? 
      "ID format mismatch - registry has different format" : 
      "getDatabaseSchema method is broken"
  });
});

module.exports = router;