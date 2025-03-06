/**
 * Helper functions for working with the Notion API
 */

/**
 * Format task data from Notion's API response to a cleaner structure
 * @param {Object} page - Notion page object
 * @returns {Object} - Formatted task object
 */
const formatTaskFromNotion = (page) => {
    const properties = page.properties;
    
    return {
      id: page.id,
      title: properties.Task?.title?.[0]?.plain_text || '',
      completed: properties.c?.checkbox || false,  // Using the new property name "c"
      dueDate: properties['Due Date']?.date?.start || null,
      note: properties.Note?.rich_text?.[0]?.plain_text || '',
      occurrence: properties.Occurrence?.select?.name || null,
      timeOfDay: properties['Time of Day']?.multi_select?.map(option => option.name) || [],
      goals: properties.Goals?.relation?.map(rel => rel.id) || [],
      priority: properties.Priority?.select?.name || null,
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time,
    };
  };
  
  /**
   * Convert API request data to Notion properties format
   * @param {Object} data - API request data
   * @returns {Object} - Notion properties object
   */
  const formatTaskForNotion = (data) => {
    const properties = {};
  
    // Handle title property (Task)
    if (data.title !== undefined) {
      properties.Task = {
        title: [{ text: { content: data.title } }]
      };
    }
  
    // Handle completed property with the new property name "c"
    if (data.completed !== undefined) {
      // Ensure completed is a boolean, not a string
      const completedValue = typeof data.completed === 'string' 
        ? data.completed.toLowerCase() === 'true' 
        : Boolean(data.completed);
      
      properties.c = {
        checkbox: completedValue
      };
    }
  
    // Handle due date property
    if (data.dueDate !== undefined) {
      properties['Due Date'] = data.dueDate 
        ? { date: { start: data.dueDate } } 
        : { date: null };
    }
  
    // Handle note property
    if (data.note !== undefined) {
      properties.Note = {
        rich_text: data.note ? [{ text: { content: data.note } }] : []
      };
    }
  
    // Handle occurrence property
    if (data.occurrence !== undefined) {
      properties.Occurrence = data.occurrence 
        ? { select: { name: data.occurrence } } 
        : { select: null };
    }
  
    // Handle time of day property
    if (data.timeOfDay !== undefined) {
      properties['Time of Day'] = {
        multi_select: Array.isArray(data.timeOfDay) 
          ? data.timeOfDay.map(time => ({ name: time })) 
          : []
      };
    }
  
    // Handle goals relation
    if (data.goals !== undefined) {
      properties.Goals = {
        relation: Array.isArray(data.goals) 
          ? data.goals.map(goalId => ({ id: goalId })) 
          : []
      };
    }
  
    // Handle priority property
    if (data.priority !== undefined) {
      properties.Priority = data.priority 
        ? { select: { name: data.priority } } 
        : { select: null };
    }
  
    return properties;
  };
  
  /**
   * Debug function to log the exact properties being sent to Notion
   * @param {Object} properties - Notion properties object
   */
  const debugNotionProperties = (properties) => {
    console.log('Properties being sent to Notion:');
    console.log(JSON.stringify(properties, null, 2));
  };
  
  module.exports = {
    formatTaskFromNotion,
    formatTaskForNotion,
    debugNotionProperties
  };