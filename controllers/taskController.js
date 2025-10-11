// controllers/taskController.js
const TaskModel = require('../models/taskModel');

const taskController = {
  /**
   * Get all tasks with optional filters
   */
  async getAllTasks(req, res, next) {
    try {
      const filters = {
        completed: req.query.completed === 'true' ? true : 
                   req.query.completed === 'false' ? false : undefined,
        dueDate: req.query.dueDate,
        timeOfDay: req.query.timeOfDay || req.query.tod,
        priority: req.query.priority,
        occurrence: req.query.occurrence
      };

      // Remove undefined filters
      Object.keys(filters).forEach(key => 
        filters[key] === undefined && delete filters[key]
      );

      const tasks = await TaskModel.getAll(filters);
      
      res.json({
        success: true,
        count: tasks.length,
        tasks
      });
    } catch (error) {
      console.error('Error getting tasks:', error);
      next(error);
    }
  },

  /**
   * Get today's tasks
   */
  async getTodaysTasks(req, res, next) {
    try {
      const includeCompleted = req.query.includeCompleted === 'true';
      const result = await TaskModel.getTodaysTasks(includeCompleted);
      
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error getting today\'s tasks:', error);
      next(error);
    }
  },

  /**
   * Get a single task by ID
   */
  async getTaskById(req, res, next) {
    try {
      const { id } = req.params;
      const task = await TaskModel.getById(id);
      
      res.json({
        success: true,
        task
      });
    } catch (error) {
      console.error('Error getting task:', error);
      next(error);
    }
  },

  /**
   * Create a new task
   */
  async createTask(req, res, next) {
    try {
      const taskData = req.body;
      
      // Validate required fields
      if (!taskData.title && !taskData.name) {
        return res.status(400).json({
          success: false,
          message: 'Task title is required'
        });
      }

      const task = await TaskModel.create(taskData);
      
      res.status(201).json({
        success: true,
        task,
        message: 'Task created successfully'
      });
    } catch (error) {
      console.error('Error creating task:', error);
      next(error);
    }
  },

  /**
   * Create multiple tasks (batch operation)
   */
  async createBatch(req, res, next) {
    try {
      const { tasks } = req.body;
      
      if (!Array.isArray(tasks) || tasks.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Tasks array is required and must not be empty'
        });
      }

      // Validate all tasks have titles
      const invalidTasks = tasks.filter((t, i) => !t.title && !t.name)
        .map((t, i) => i);
      
      if (invalidTasks.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Tasks at indices ${invalidTasks.join(', ')} are missing titles`
        });
      }

      const result = await TaskModel.createBatch(tasks);
      
      const status = result.failed === 0 ? 201 : 207; // 207 = Multi-Status
      
      res.status(status).json({
        success: result.success,
        message: `Created ${result.created} tasks${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
        created: result.created,
        failed: result.failed,
        tasks: result.tasks,
        errors: result.errors.length > 0 ? result.errors : undefined
      });
    } catch (error) {
      console.error('Error in batch creation:', error);
      next(error);
    }
  },

  /**
   * Update an existing task
   */
  async updateTask(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No updates provided'
        });
      }

      const task = await TaskModel.update(id, updates);
      
      res.json({
        success: true,
        task,
        message: 'Task updated successfully'
      });
    } catch (error) {
      console.error('Error updating task:', error);
      next(error);
    }
  },

  /**
   * Delete (archive) a task
   */
  async deleteTask(req, res, next) {
    try {
      const { id } = req.params;
      const result = await TaskModel.delete(id);
      
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      next(error);
    }
  },

  /**
   * Mark task as complete
   */
  async completeTask(req, res, next) {
    try {
      const { id } = req.params;
      const task = await TaskModel.complete(id);
      
      res.json({
        success: true,
        task,
        message: 'Task marked as complete'
      });
    } catch (error) {
      console.error('Error completing task:', error);
      next(error);
    }
  },

  /**
   * Mark task as incomplete
   */
  async uncompleteTask(req, res, next) {
    try {
      const { id } = req.params;
      const task = await TaskModel.uncomplete(id);
      
      res.json({
        success: true,
        task,
        message: 'Task marked as incomplete'
      });
    } catch (error) {
      console.error('Error uncompleting task:', error);
      next(error);
    }
  }
};

module.exports = taskController;