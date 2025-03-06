const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');

/**
 * Task routes
 */

// GET all tasks (with optional filters)
router.get('/', taskController.getAllTasks);

// GET a single task by ID
router.get('/:id', taskController.getTaskById);

// POST create a new task
router.post('/', taskController.createTask);

// PATCH update an existing task
router.patch('/:id', taskController.updateTask);

// DELETE a task
router.delete('/:id', taskController.deleteTask);

module.exports = router;