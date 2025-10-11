// models/taskModel.js
const { notion } = require('../config/notion');

// Your Tasks Database ID (you'll need to set this)
const TASKS_DATABASE_ID = process.env.NOTION_TASKS_DATABASE_ID;

// Property mappings - Your exact schema
const PROPERTY_MAPPINGS = {
  // API name -> Notion property name
  'title': 'Name',           // Accept both 'title' and 'name' from API
  'name': 'Name',            // Alias for title
  'dueDate': 'Due Date',
  'completed': 'Done',        // The checkbox
  'done': 'Done',            // Alias
  'tod': 'Time of Day',      // Short alias
  'timeOfDay': 'Time of Day',
  'priority': 'Priority',
  'notes': 'Notes',
  'occurrence': 'Occurrence'
};

// Valid values for select properties
const TOD_VALUES = new Set(['start', 'any', 'end']);
const OCCURRENCE_VALUES = new Set(['daily', 'weekly', 'recurring', 'future', 'once']);

// Priority mapping - Handle both symbols and words
const PRIORITY_MAP = {
  '!': '!',
  '!!': '!!',
  '!!!': '!!!',
  'low': '!',
  'medium': '!!',
  'high': '!!!',
  '1': '!',
  '2': '!!',
  '3': '!!!'
};

class TaskModel {
  /**
   * Format task from Notion response to clean API response
   */
  static formatFromNotion(page) {
    const props = page.properties;
    
    return {
      id: page.id,
      title: props.Task?.title?.[0]?.plain_text || '',
      completed: props.C?.checkbox || false,
      dueDate: props['Due Date']?.date?.start || null,
      timeOfDay: props['Time of Day']?.select?.name || null,
      priority: props.Priority?.select?.name || null,
      notes: props.Note?.rich_text?.[0]?.plain_text || '',
      occurrence: props.Occurrence?.select?.name || null,
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time
    };
  }

  /**
   * Format API input to Notion properties
   */
  static formatForNotion(data) {
    const properties = {};
    
    // Title (required) - YOUR PROPERTY IS CALLED "Task"
    const title = data.title || data.name || data.task;
    if (title !== undefined) {
      properties.Task = {
        title: [{ text: { content: String(title) } }]
      };
    }

    // Completed/Done checkbox - YOUR PROPERTY IS CALLED "C"
    if (data.completed !== undefined || data.done !== undefined || data.c !== undefined) {
      const isCompleted = data.completed ?? data.done ?? data.c;
      properties.C = { 
        checkbox: Boolean(isCompleted) 
      };
    }

    // Due Date
    if (data.dueDate !== undefined) {
      properties['Due Date'] = data.dueDate 
        ? { date: { start: data.dueDate } }
        : { date: null };
    }

    // Time of Day
    const tod = data.tod || data.timeOfDay;
    if (tod !== undefined) {
      if (tod && TOD_VALUES.has(tod.toLowerCase())) {
        properties['Time of Day'] = { 
          select: { name: tod.toLowerCase() } 
        };
      } else if (tod === null) {
        properties['Time of Day'] = { select: null };
      }
    }

    // Priority
    if (data.priority !== undefined) {
      const mappedPriority = PRIORITY_MAP[String(data.priority).toLowerCase()] || data.priority;
      properties.Priority = mappedPriority
        ? { select: { name: mappedPriority } }
        : { select: null };
    }

    // Notes - YOUR PROPERTY IS CALLED "Note" (no 's')
    if (data.notes !== undefined || data.note !== undefined) {
      const noteContent = data.notes ?? data.note;
      properties.Note = {
        rich_text: noteContent 
          ? [{ text: { content: String(noteContent) } }]
          : []
      };
    }

    // Occurrence
    if (data.occurrence !== undefined) {
      if (data.occurrence && OCCURRENCE_VALUES.has(data.occurrence.toLowerCase())) {
        properties.Occurrence = { 
          select: { name: data.occurrence.toLowerCase() } 
        };
      } else if (data.occurrence === null) {
        properties.Occurrence = { select: null };
      }
    }

    return properties;
  }

  /**
   * Get all tasks with optional filters
   */
  static async getAll(filters = {}) {
    const queryFilters = [];
    
    // Build filters
    if (filters.completed !== undefined) {
      queryFilters.push({
        property: 'C',
        checkbox: { equals: Boolean(filters.completed) }
      });
    }

    if (filters.dueDate) {
      queryFilters.push({
        property: 'Due Date',
        date: { equals: filters.dueDate }
      });
    }

    if (filters.timeOfDay) {
      queryFilters.push({
        property: 'Time of Day',
        select: { equals: filters.timeOfDay.toLowerCase() }
      });
    }

    if (filters.priority) {
      const mappedPriority = PRIORITY_MAP[String(filters.priority).toLowerCase()] || filters.priority;
      queryFilters.push({
        property: 'Priority',
        select: { equals: mappedPriority }
      });
    }

    if (filters.occurrence) {
      queryFilters.push({
        property: 'Occurrence',
        select: { equals: filters.occurrence.toLowerCase() }
      });
    }

    const response = await notion.databases.query({
      database_id: TASKS_DATABASE_ID,
      filter: queryFilters.length > 0 
        ? { and: queryFilters }
        : undefined,
      sorts: [
        { property: 'Due Date', direction: 'ascending' },
        { property: 'Priority', direction: 'descending' }
      ]
    });

    return response.results.map(page => this.formatFromNotion(page));
  }

  /**
   * Get today's tasks
   */
  static async getTodaysTasks(includeCompleted = false) {
    const today = new Date().toISOString().split('T')[0];
    
    const filters = {
      property: 'Due Date',
      date: { equals: today }
    };

    const queryFilters = [filters];
    
    if (!includeCompleted) {
      queryFilters.push({
        property: 'C',
        checkbox: { equals: false }
      });
    }

    const response = await notion.databases.query({
      database_id: TASKS_DATABASE_ID,
      filter: { and: queryFilters },
      sorts: [
        { property: 'Time of Day', direction: 'ascending' },
        { property: 'Priority', direction: 'descending' }
      ]
    });

    const tasks = response.results.map(page => this.formatFromNotion(page));
    
    // Group by time of day
   const grouped = {
  start: tasks.filter(t => t.timeOfDay?.toLowerCase() === 'start'),
  any: tasks.filter(t => t.timeOfDay?.toLowerCase() === 'any'),  
  end: tasks.filter(t => t.timeOfDay?.toLowerCase() === 'end'),
  unscheduled: tasks.filter(t => !t.timeOfDay)
};

    return {
      date: today,
      total: tasks.length,
      grouped,
      tasks
    };
  }

  /**
   * Get a single task by ID
   */
  static async getById(taskId) {
    const page = await notion.pages.retrieve({ 
      page_id: taskId 
    });
    return this.formatFromNotion(page);
  }

  /**
   * Create a new task
   */
  static async create(data) {
    const properties = this.formatForNotion(data);
    
    // Ensure we have at least a title - CHECK FOR "Task" not "Name"!
    if (!properties.Task) {
      throw new Error('Task title is required');
    }

    const page = await notion.pages.create({
      parent: { database_id: TASKS_DATABASE_ID },
      properties
    });

    return this.formatFromNotion(page);
  }

  /**
   * Create multiple tasks at once (batch)
   */
  static async createBatch(tasksData) {
    console.log(`Creating batch of ${tasksData.length} tasks...`);
    
    // Use Promise.allSettled to handle partial failures
    const results = await Promise.allSettled(
      tasksData.map(data => this.create(data))
    );

    const successful = [];
    const failed = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful.push(result.value);
      } else {
        failed.push({
          index,
          data: tasksData[index],
          error: result.reason.message
        });
      }
    });

    return {
      success: failed.length === 0,
      created: successful.length,
      failed: failed.length,
      tasks: successful,
      errors: failed
    };
  }

  /**
   * Update an existing task
   */
  static async update(taskId, data) {
    const properties = this.formatForNotion(data);
    
    const page = await notion.pages.update({
      page_id: taskId,
      properties
    });

    return this.formatFromNotion(page);
  }

  /**
   * Delete (archive) a task
   */
  static async delete(taskId) {
    await notion.pages.update({
      page_id: taskId,
      archived: true
    });

    return {
      id: taskId,
      archived: true,
      message: 'Task archived successfully'
    };
  }

  /**
   * Mark task as complete
   */
  static async complete(taskId) {
    return this.update(taskId, { completed: true });
  }

  /**
   * Mark task as incomplete
   */
  static async uncomplete(taskId) {
    return this.update(taskId, { completed: false });
  }
}

module.exports = TaskModel;
