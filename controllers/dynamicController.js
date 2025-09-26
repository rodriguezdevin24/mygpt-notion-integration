// controllers/dynamicController.js
const dynamicDbService = require('../services/dynamicDbService');
const databaseRegistry = require('../config/databaseRegistry');

/**
 * Convert fields array to properties object
 * @param {Array} fields - Array of field objects
 * @returns {Object} Properties object for dynamicDbService
 */
function fieldsToProperties(fields = []) {
  const properties = {};
  
  for (const field of fields) {
    if (!field || !field.name || !field.type) continue;
    
    const { name, type, ...rest } = field;
    properties[name] = { type, ...rest };
  }
  
  return properties;
}

// POST /api/dynamic/databases
async function createDatabase(req, res, next) {
  try {
    let spec = { ...req.body };
    
    // Transform fields array to properties object if needed
    if (spec.fields && Array.isArray(spec.fields)) {
      spec.properties = fieldsToProperties(spec.fields);
      delete spec.fields; // Remove fields after transformation
    }
    
    console.log('Creating database with spec:', JSON.stringify(spec, null, 2));
    
    const database = await dynamicDbService.createDatabase(spec);
    res.status(201).json({ success: true, database });
  } catch (err) {
    console.error('Error in createDatabase controller:', err);
    next(err);
  }
}

// GET /api/dynamic/databases
function getAllDatabases(req, res, next) {
  try {
    const databases = databaseRegistry.getAllDatabases();
    res.json({ success: true, databases });
  } catch (err) {
    next(err);
  }
}

// GET /api/dynamic/databases/:id
function getDatabaseById(req, res, next) {
  try {
    const { id } = req.params;
    const database = databaseRegistry.getDatabaseSchema(id);
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
    
    let updates = {};
    if (req.body.name) updates.name = req.body.name;
    
    // Handle both fields and properties formats
    if (req.body.fields && Array.isArray(req.body.fields)) {
      updates.properties = fieldsToProperties(req.body.fields);
    } else if (req.body.properties) {
      updates.properties = req.body.properties;
    }
    
    console.log('Updating database with:', JSON.stringify(updates, null, 2));
    
    const schema = await dynamicDbService.updateDatabase(dbId, updates);
    res.json({ success: true, database: schema });
  } catch (err) {
    console.error('Error in updateDatabase controller:', err);
    next(err);
  }
}

module.exports = {
  createDatabase,
  getAllDatabases,
  getDatabaseById,
  updateDatabase,
};