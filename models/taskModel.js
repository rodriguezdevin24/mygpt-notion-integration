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
          property: 'c',  // Using the property name "c" for completed
          checkbox: {
            equals: filters.completed
          }
        });
      }
      
      // Add due date filter if specified
      if (filters.dueDate) {
        // Notion's date filter is tricky because it stores dates in multiple formats
        // Some entries have timezone info, some don't
        // We'll use the on_or_after and before filters to get just the specified date
        const targetDate = new Date(filters.dueDate);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        // Format dates to match Notion's expected format (YYYY-MM-DD)
        const formattedTargetDate = targetDate.toISOString().split('T')[0];
        const formattedNextDay = nextDay.toISOString().split('T')[0];
        
        filterConditions.push({
          and: [
            {
              property: 'Due Date',
              date: {
                on_or_after: formattedTargetDate
              }
            },
            {
              property: 'Due Date',
              date: {
                before: formattedNextDay
              }
            }
          ]
        });
        
        console.log(`Filtering tasks for date: ${formattedTargetDate} (before ${formattedNextDay})`);
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
      
      // Add time of day filter if specified
      if (filters.timeOfDay) {
        filterConditions.push({
          property: 'Time of Day',
          multi_select: {
            contains: filters.timeOfDay
          }
        });
      }
      
      // Create the filter object for the query
      const filter = filterConditions.length > 0 
        ? { and: filterConditions } 
        : undefined;
      
      // Set up sorting options
      let sorts = [
        {
          property: 'Due Date',
          direction: 'ascending',
        }
      ];
      
      // If timeOfDay is specified in filters, add secondary sort by Time of Day
      if (filters.timeOfDay) {
        sorts.push({
          property: 'Priority',
          direction: 'ascending',
        });
      }
      
      // Query the database
      const response = await notion.databases.query({
        database_id: TASKS_DATABASE_ID,
        filter,
        sorts,
      });
      
      // Format the results
      return response.results.map(page => formatTaskFromNotion(page));
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw error;
    }
  },
  
  /**
 * Get today's tasks (incomplete and due today)
 * @param {Object} options - Additional filters
 * @returns {Object} - Tasks grouped by time of day
 */
getTodaysTasks: async (options = {}) => {
    try {
      // Force use of America/New_York timezone (or whatever timezone your tasks are in)
      // This ensures consistency across all environments
      const nowInET = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
      
      // Format as YYYY-MM-DD in Eastern Time
      const todayStr = `${nowInET.getFullYear()}-${String(nowInET.getMonth() + 1).padStart(2, '0')}-${String(nowInET.getDate()).padStart(2, '0')}`;
      
      console.log(`Getting tasks for Eastern Time date: ${todayStr}`);
      console.log(`Raw date for reference: ${nowInET.toString()}`);
      
      // Query all tasks first (no date filter) - this is more reliable with Notion's date handling
      const filterConditions = [];
      
      // Add completed filter if specified (default to false if not specified)
      const completedValue = options.includeCompleted ? undefined : false;
      if (completedValue !== undefined) {
        filterConditions.push({
          property: 'c',
          checkbox: {
            equals: completedValue
          }
        });
      }
      
      // Add time of day filter if specified
      if (options.timeOfDay) {
        filterConditions.push({
          property: 'Time of Day',
          multi_select: {
            contains: options.timeOfDay
          }
        });
      }
      
      const filter = filterConditions.length > 0 ? { and: filterConditions } : undefined;
      
      // Set up sorting
      const sorts = [
        {
          property: 'Priority',
          direction: 'ascending',
        },
        {
          property: 'Time of Day',
          direction: 'ascending',
        }
      ];
      
      // Query the database 
      const response = await notion.databases.query({
        database_id: TASKS_DATABASE_ID,
        filter,
        sorts,
      });
      
      // Format all the results
      let allTasks = response.results.map(page => formatTaskFromNotion(page));
      
      // FILTER FOR TODAY'S TASKS CLIENT-SIDE
      // This is much more reliable than trying to use Notion's date filter
      allTasks = allTasks.filter(task => {
        if (!task.dueDate) return false;
        
        // Special handling for different date formats
        let taskDateStr;
        
        // If it's a simple YYYY-MM-DD format (like "2025-03-06"), use it directly
        if (/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)) {
          taskDateStr = task.dueDate;
        } else {
          // For dates with time/timezone, convert to Eastern Time zone
          // Note: we parse the date string to get a Date object in any timezone
          // Then convert that to Eastern Time
          const taskDateObj = new Date(task.dueDate);
          const taskDateET = new Date(taskDateObj.toLocaleString('en-US', { timeZone: 'America/New_York' }));
          taskDateStr = `${taskDateET.getFullYear()}-${String(taskDateET.getMonth() + 1).padStart(2, '0')}-${String(taskDateET.getDate()).padStart(2, '0')}`;
        }
        
        console.log(`Task: ${task.title}, Due: ${task.dueDate}, Extracted date in ET: ${taskDateStr}, Today in ET: ${todayStr}, Match: ${taskDateStr === todayStr}`);
        
        // Compare the date parts in Eastern Time
        return taskDateStr === todayStr;
      });
      
      console.log(`Found ${allTasks.length} tasks for today (${todayStr})`);
      
      // If groupByTimeOfDay is requested, organize tasks by time period
      if (options.groupByTimeOfDay) {
        const groupedTasks = {
          morning: [],
          afternoon: [],
          evening: [],
          night: [],
          unspecified: []
        };
        
        // Iterate through each task and assign to appropriate time groups
        allTasks.forEach(task => {
          if (!task.timeOfDay || task.timeOfDay.length === 0) {
            groupedTasks.unspecified.push(task);
          } else {
            // Check if the task belongs to each time group
            // A task can be in multiple time groups
            let assigned = false;
            
            for (const timeSlot of task.timeOfDay) {
              const normalizedTimeSlot = timeSlot.toLowerCase();
              if (groupedTasks[normalizedTimeSlot]) {
                groupedTasks[normalizedTimeSlot].push(task);
                assigned = true;
              }
            }
            
            // If the task has timeOfDay values but none match our groups,
            // add to unspecified
            if (!assigned) {
              groupedTasks.unspecified.push(task);
            }
          }
        });
        
        return {
          date: todayStr,
          groupedTasks,
          allTasks
        };
      }
      
      return {
        date: todayStr,
        tasks: allTasks
      };
    } catch (error) {
      console.error('Error fetching today\'s tasks:', error);
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