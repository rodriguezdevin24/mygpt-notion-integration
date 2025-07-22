// routes/dynamicEntryRoutes.js
const express = require('express');
const router = express.Router();
const entryCtrl = require('../controllers/dynamicEntryController');

// List entries in a database
// GET  /api/dynamic/databases/:dbId/entries
router.get('/databases/:dbId/entries', entryCtrl.getAllEntries);

// Get a single entry
// GET  /api/dynamic/databases/:dbId/entries/:entryId
router.get('/databases/:dbId/entries/:entryId', entryCtrl.getEntryById);

// Create a new entry
// POST /api/dynamic/databases/:dbId/entries
router.post('/databases/:dbId/entries', entryCtrl.createEntry);

// Update an entry
// PATCH /api/dynamic/databases/:dbId/entries/:entryId
router.patch('/databases/:dbId/entries/:entryId', entryCtrl.updateEntry);

// Archive (delete) an entry
// DELETE /api/dynamic/databases/:dbId/entries/:entryId
router.delete('/databases/:dbId/entries/:entryId', entryCtrl.deleteEntry);

module.exports = router;