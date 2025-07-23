// dynamicEntryController.js

const DynamicModel = require('../models/dynamicModel')

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
            next(err)
        }
    },

    //GET /api/dynamic/databases/:dbId/entries/:entryId
    async getEntryById(req, res, next) { 
        try {
            const { dbId, entryId } = req.params;
            const model = new DynamicModel(dbId);
            const entry = await model.create(req.body);
            res.status(201).json({ success: true, entry });
        } catch (err) {
            next(err);
        }
    },

    //POST /api/dynamic/databases/:dbId/entries
    async createEntry (req, res, next) {
        try {
            const { dbId } = req.params;
            const model = new DynamicModel(dbId);
            const entry = await model.create(req.body);
            res.status(201).json({ success: true, entry })
        } catch (err) {
            next(err);
        }
    },

    //PATCH /api/dynamic/databases/:dbId/entries/:entryId
    async updateEntry (req, res, next) {
        try {
            const { dbId, entryId } = req.params;
            const model = new DynamicModel(dbId);
            const entry = await model.update(entryId, req.body);
            res.json({ success: true, entry });
        } catch(err) {
            next(err)
        }
    },

    async deleteEntry(req, res, next) {
        try {
            const { dbId, entryId } = req.params;
            const model = new DynamicModel(dbId);
            const result = await model.delete(entryId);
            res.json({ success: true, result})
        } catch(err) {
            next (err)
        }
    }
}
module.exports = dynamicEntryController;
