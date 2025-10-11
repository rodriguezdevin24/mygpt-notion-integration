// routes/taskRoutes.js
const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');

/**
 * Task Routes - Optimized hardcoded endpoints
 */

router.get('/schema', async (req, res) => {
  const { notion } = require('../config/notion');
  const TASKS_DB_ID = process.env.NOTION_TASKS_DATABASE_ID;
  
  try {
    const db = await notion.databases.retrieve({
      database_id: TASKS_DB_ID
    });
    
    // Show all property names
    const properties = Object.keys(db.properties);
    
    res.json({
      message: "Your Tasks DB properties:",
      properties: properties,
      detailed: Object.entries(db.properties).map(([name, prop]) => ({
        name: name,
        type: prop.type
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tasks/today - Get today's tasks
router.get('/today', taskController.getTodaysTasks);

// GET /api/tasks - Get all tasks with optional filters
router.get('/', taskController.getAllTasks);

// GET /api/tasks/:id - Get a single task
router.get('/:id', taskController.getTaskById);

// POST /api/tasks - Create a single task
router.post('/', taskController.createTask);

// POST /api/tasks/batch - Create multiple tasks
router.post('/batch', taskController.createBatch);

// PATCH /api/tasks/:id - Update a task
router.patch('/:id', taskController.updateTask);

// PUT /api/tasks/:id - Update a task (alias for PATCH)
router.put('/:id', taskController.updateTask);

// DELETE /api/tasks/:id - Delete (archive) a task
router.delete('/:id', taskController.deleteTask);

// POST /api/tasks/:id/complete - Mark task as complete
router.post('/:id/complete', taskController.completeTask);

// POST /api/tasks/:id/uncomplete - Mark task as incomplete
router.post('/:id/uncomplete', taskController.uncompleteTask);

// Temporary debug route - DELETE AFTER FIXING


module.exports = router;