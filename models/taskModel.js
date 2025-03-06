const { notion, TASKS_DATABASE_ID } = require('../config/notion');
const { formatTaskFromNotion, formatTaskForNotion, debugNotionProperties } = require('../utils/notionHelpers');

/**
 * Task model for interacting with Notion Tasks database
 */
const TaskModel = {
  /**
   * Get all tasks from the database
   * @param {Object} filters - Optional filters for the query
   * @returns {Array} - Array of task objects
   */
  getAllTasks: async (filters = {}) => {
    try {
      // Build filter conditions if provided
      const filterConditions = [];
      
      // Add completed filter if specified
      if (filters.completed !== undefined) {
        filterConditions.push({
          property: 'c',  // Updated to use the new property name
          checkbox: {
            equals: filters.completed
          }
        });
      }
      
      // Add due date filter if specified
      if (filters.dueDate) {
        filterConditions.push({
          property: 'Due Date',
          date: {
            equals: filters.dueDate
          }
        });
      }
      
      // Add priority filter if specified
      if (filters.priority) {
        filterConditions.push({
          property: 'Priority',
          select: {
            equals: filters.priority
          }
        });
      }
      
      // Add occurrence filter if specified
      if (filters.occurrence) {
        filterConditions.push({
          property: 'Occurrence',
          select: {
            equals: filters.occurrence
          }
        });
      }
      
      // Create the filter object for the query
      const filter = filterConditions.length > 0 
        ? { and: filterConditions } 
        : undefined;
      
      // Query the database
      const response = await notion.databases.query({
        database_id: TASKS_DATABASE_ID,
        filter,
        sorts: [
          {
            property: 'Due Date',
            direction: 'ascending',
          },
        ],
      });
      
      // Format the results
      return response.results.map(page => formatTaskFromNotion(page));
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  },
  
  /**
   * Get a single task by its ID
   * @param {string} taskId - The ID of the task to retrieve
   * @returns {Object} - Task object
   */
  getTaskById: async (taskId) => {
    try {
      const response = await notion.pages.retrieve({ page_id: taskId });
      return formatTaskFromNotion(response);
    } catch (error) {
      console.error(`Error fetching task ${taskId}:`, error);
      throw error;
    }
  },
  
  /**
   * Create a new task
   * @param {Object} taskData - Task data
   * @returns {Object} - Created task object
   */
  createTask: async (taskData) => {
    try {
      const properties = formatTaskForNotion(taskData);
      
      // Log the properties for debugging
      debugNotionProperties(properties);
      
      const response = await notion.pages.create({
        parent: { database_id: TASKS_DATABASE_ID },
        properties
      });
      
      return formatTaskFromNotion(response);
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  },
  
  /**
   * Update an existing task
   * @param {string} taskId - The ID of the task to update
   * @param {Object} taskData - Updated task data
   * @returns {Object} - Updated task object
   */
  updateTask: async (taskId, taskData) => {
    try {
      const properties = formatTaskForNotion(taskData);
      
      // Log the properties for debugging
      console.log(`Updating task ${taskId}`);
      debugNotionProperties(properties);
      
      const response = await notion.pages.update({
        page_id: taskId,
        properties
      });
      
      return formatTaskFromNotion(response);
    } catch (error) {
      console.error(`Error updating task ${taskId}:`, error);
      // Log the detailed error for debugging
      if (error.body) {
        console.error('Notion API error details:', error.body);
      }
      throw error;
    }
  },
  
  /**
   * Delete a task (archive it in Notion)
   * @param {string} taskId - The ID of the task to delete
   * @returns {Object} - Response with archive status
   */
  deleteTask: async (taskId) => {
    try {
      // In Notion, pages are archived rather than deleted
      const response = await notion.pages.update({
        page_id: taskId,
        archived: true
      });
      
      return {
        id: taskId,
        archived: response.archived,
        message: 'Task archived in Notion (Notion does not allow permanent deletion via API)'
      };
    } catch (error) {
      console.error(`Error archiving task ${taskId}:`, error);
      throw error;
    }
  }
};

module.exports = TaskModel;