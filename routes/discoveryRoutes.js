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

module.exports = router;