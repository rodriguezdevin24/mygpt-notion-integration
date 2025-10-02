// controllers/dynamicEntryController.js

const DynamicModel = require('../models/dynamicModel');

const dynamicEntryController = {
    // GET /api/dynamic/databases/:dbId/entries
    async getAllEntries(req, res, next) {
        try {
            const { dbId } = req.params;
            const filters = req.query || {};
            const model = new DynamicModel(dbId);
            const entries = await model.getAll(filters);
            res.json({ success: true, ...entries });
        } catch (err) {
            next(err);
        }
    },

    // GET /api/dynamic/databases/:dbId/entries/:entryId
    async getEntryById(req, res, next) { 
        try {
            const { dbId, entryId } = req.params;
            const model = new DynamicModel(dbId);
            const entry = await model.getById(entryId);
            res.json({ success: true, entry });
        } catch (err) {
            next(err);
        }
    },

    // POST /api/dynamic/databases/:dbId/entries
    async createEntry(req, res, next) {
        try {
            const { dbId } = req.params;
            const model = new DynamicModel(dbId);
            const entry = await model.create(req.body);
            res.status(201).json({ success: true, entry });
        } catch (err) {
            next(err);
        }
    },

    // POST /api/dynamic/databases/:dbId/entries/batch
    async createBatch(req, res, next) {
        try {
            const { dbId } = req.params;
            const { entries } = req.body;
            
            if (!Array.isArray(entries) || entries.length === 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Entries array is required' 
                });
            }
            
            const model = new DynamicModel(dbId);
            const result = await model.createBatch(entries);
            
            const status = result.failed === 0 ? 201 : 207;
            res.status(status).json(result);
        } catch (err) {
            next(err);
        }
    },

    // PATCH /api/dynamic/databases/:dbId/entries/:entryId
    async updateEntry(req, res, next) {
        try {
            const { dbId, entryId } = req.params;
            const model = new DynamicModel(dbId);
            const entry = await model.update(entryId, req.body);
            res.json({ success: true, entry });
        } catch(err) {
            next(err);
        }
    },

    // PATCH /api/dynamic/databases/:dbId/entries/batch
    async updateBatch(req, res, next) {
        try {
            const { dbId } = req.params;
            const { updates } = req.body;
            
            if (!Array.isArray(updates) || updates.length === 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Updates array is required' 
                });
            }
            
            const model = new DynamicModel(dbId);
            const result = await model.updateBatch(updates);
            
            res.json(result);
        } catch (err) {
            next(err);
        }
    },

    // DELETE /api/dynamic/databases/:dbId/entries/:entryId
    async deleteEntry(req, res, next) {
        try {
            const { dbId, entryId } = req.params;
            const model = new DynamicModel(dbId);
            const result = await model.delete(entryId);
            res.json({ success: true, result });
        } catch(err) {
            next(err);
        }
    },

    // DELETE /api/dynamic/databases/:dbId/entries/batch
    async deleteBatch(req, res, next) {
        try {
            const { dbId } = req.params;
            const { ids } = req.body;
            
            if (!Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'IDs array is required' 
                });
            }
            
            const model = new DynamicModel(dbId);
            const result = await model.deleteBatch(ids);
            
            res.json(result);
        } catch (err) {
            next(err);
        }
    }
};

module.exports = dynamicEntryController;