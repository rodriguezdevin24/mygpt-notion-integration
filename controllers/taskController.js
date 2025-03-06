const TaskModel = require('../models/taskModel');

/**
 * Controller for task-related operations
 */
const taskController = {
  /**
   * Get all tasks
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getAllTasks: async (req, res) => {
    try {
      // Extract filter parameters from query string
      const filters = {
        completed: req.query.completed === 'true' ? true : 
                   req.query.completed === 'false' ? false : undefined,
        dueDate: req.query.dueDate,
        priority: req.query.priority,
        occurrence: req.query.occurrence
      };
      
      // Remove undefined filters
      Object.keys(filters).forEach(key => 
        filters[key] === undefined && delete filters[key]
      );
      
      console.log('Fetching tasks with filters:', filters);
      const tasks = await TaskModel.getAllTasks(filters);
      res.json({ success: true, tasks });
    } catch (error) {
      console.error('Controller error in getAllTasks:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch tasks',
        error: error.message
      });
    }
  },
  
  /**
   * Get a single task by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  getTaskById: async (req, res) => {
    try {
      const taskId = req.params.id;
      const task = await TaskModel.getTaskById(taskId);
      
      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }
      
      res.json({ success: true, task });
    } catch (error) {
      console.error('Controller error in getTaskById:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to fetch task',
        error: error.message
      });
    }
  },
  
  /**
   * Create a new task
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  createTask: async (req, res) => {
    try {
      let taskData = req.body;
      
      // Validate required fields
      if (!taskData.title) {
        return res.status(400).json({
          success: false,
          message: 'Task title is required'
        });
      }
      
      // Convert string 'true'/'false' to boolean for completed field
      if (typeof taskData.completed === 'string') {
        taskData.completed = taskData.completed.toLowerCase() === 'true';
        console.log(`Converted completed string to boolean: ${taskData.completed}`);
      }
      
      // Log the task data being created
      console.log('Creating task with data:', JSON.stringify(taskData));
      
      const task = await TaskModel.createTask(taskData);
      res.status(201).json({ success: true, task });
    } catch (error) {
      console.error('Controller error in createTask:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create task',
        error: error.message
      });
    }
  },
  
  /**
   * Update an existing task
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  updateTask: async (req, res) => {
    try {
      const taskId = req.params.id;
      let taskData = req.body;
      
      // Convert string 'true'/'false' to boolean for completed field
      if (typeof taskData.completed === 'string') {
        taskData.completed = taskData.completed.toLowerCase() === 'true';
        console.log(`Converted completed string to boolean: ${taskData.completed}`);
      }
      
      // Log the incoming data for debugging
      console.log('Update task request:', {
        method: req.method,
        taskId,
        bodyData: JSON.stringify(taskData)
      });
      
      const task = await TaskModel.updateTask(taskId, taskData);
      res.json({ success: true, task });
    } catch (error) {
      console.error('Controller error in updateTask:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update task',
        error: error.message
      });
    }
  },
  
  /**
   * Delete a task (archives it in Notion)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  deleteTask: async (req, res) => {
    try {
      const taskId = req.params.id;
      const result = await TaskModel.deleteTask(taskId);
      
      res.json({ 
        success: true, 
        message: 'Task archived successfully',
        result
      });
    } catch (error) {
      console.error('Controller error in deleteTask:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Failed to archive task',
        error: error.message
      });
    }
  }
};

module.exports = taskController;