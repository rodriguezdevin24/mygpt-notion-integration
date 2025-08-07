// controllers/dynamicController.js
const dynamicDbService = require('../services/dynamicDbService');

// POST /api/dynamic/databases
async function createDatabase(req, res, next) {
  try {
    const database = await dynamicDbService.createDatabase(req.body);
    res.status(201).json({ success: true, database });
  } catch (err) {
    next(err);
  }
}

// GET /api/dynamic/databases
function getAllDatabases(req, res, next) {
  try {
    const databases = dynamicDbService.getAllDatabases();
    res.json({ success: true, databases });
  } catch (err) {
    next(err);
  }
}

// GET /api/dynamic/databases/:id
function getDatabaseById(req, res, next) {
  try {
    const { id } = req.params;
    const database = dynamicDbService.getDatabaseById(id);
    if (!database) {
      return res.status(404).json({ success: false, message: 'Database not found.' });
    }
    res.json({ success: true, database });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/dynamic/databases/:id
async function updateDatabase(req, res, next) {
  try {
    const { id: dbId } = req.params;
    const schema = await dynamicDbService.updateDatabase(dbId, {
      name: req.body.name,
      properties: req.body.properties
    });
    res.json({ success: true, database: schema });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createDatabase,
  getAllDatabases,
  getDatabaseById,
  updateDatabase,
};