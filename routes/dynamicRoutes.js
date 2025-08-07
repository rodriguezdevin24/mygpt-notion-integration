// routes/dynamicRoutes.js
const express = require('express');
const router = express.Router();
const dynamicController = require('../controllers/dynamicController');


/**
 * Dynamic database routes
 */

// Database management routes
router.get('/databases', dynamicController.getAllDatabases);
router.get('/databases/:id', dynamicController. getDatabaseById);
router.post('/databases', dynamicController.createDatabase);
router.patch('/databases/:id', dynamicController.updateDatabase);


// Entry management routes
// router.get('/databases/:dbId/entries', dynamicController.getAllEntries);
// router.get('/databases/:dbId/entries/:entryId', dynamicController.getEntryById);
// router.post('/databases/:dbId/entries', dynamicController.createEntry);
// router.patch('/databases/:dbId/entries/:entryId', dynamicController.updateEntry);
// router.delete('/databases/:dbId/entries/:entryId', dynamicController.deleteEntry);

module.exports = router;