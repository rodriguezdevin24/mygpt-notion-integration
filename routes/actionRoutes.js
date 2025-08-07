// routes/actionsRoutes.js
const express = require('express');
const router = express.Router();
const dynamicDbService = require('../services/dynamicDbService');
const apiKeyAuth = require('../middleware/authMiddleware'); 

// Helper: fields[] -> properties{}
function fieldsToProperties(fields = []) {
  const out = {};
  for (const f of fields) {
    if (!f || typeof f !== 'object') continue;
    const name = String(f.name || f.property || f.key || '').trim();
    const type = String(f.type || '').trim();
    if (!name || !type) continue;
    const def = { type };
    if ((type === 'select' || type === 'multi_select') && Array.isArray(f.options)) {
      def.options = f.options.map(String);
    }
    if (type === 'relation' && f.database_id) {
      def.relation = { database_id: String(f.database_id) };
    }
    out[name] = def;
  }
  return out;
}

router.post('/actions/create-database', /*apiKeyAuth,*/ async (req, res, next) => {
  try {
    const { name, fields } = req.body || {};
    if (!name || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({ success: false, message: 'name and fields[] are required' });
    }
    const properties = fieldsToProperties(fields);
    const db = await dynamicDbService.createDatabase({ name, properties });
    res.status(201).json({ success: true, database: db });
  } catch (err) {
    next(err);
  }
});

module.exports = router;