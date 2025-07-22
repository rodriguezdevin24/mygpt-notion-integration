// const SchemaBuilder = require('./schemaBuilder');
// const databaseRegistry = require('../config/databaseRegistry');

// /**
//  * Factory for creating common database types
//  */
// const DatabaseFactory = {
//   /**
//    * Create a project database
//    * @param {string} name - Project name
//    * @param {Object} options - Additional options
//    * @returns {Promise<Object>} - Created database schema
//    */
//   createProjectDatabase: async (name, options = {}) => {
//     const builder = new SchemaBuilder(name)
//       .addTitle('Name', true)
//       .addRichText('Description')
//       .addSelect('Status', ['Not Started', 'In Progress', 'Completed', 'On Hold'])
//       .addDate('Start Date')
//       .addDate('Due Date')
//       .addMultiSelect('Tags', options.tags || ['Work', 'Personal', 'Important'])
//       .addSelect('Priority', ['Low', 'Medium', 'High', 'Urgent']);
    
//     // If there's a parent project, add a relation
//     if (options.parentProjectId) {
//       builder.addRelation('Parent Project', options.parentProjectId);
//     }
    
//     // Set up parent page if specified
//     const parent = options.parentPageId ? {
//       type: 'page_id',
//       page_id: options.parentPageId
//     } : undefined;
    
//     // Create the database in Notion
//     const schema = await databaseRegistry.createDatabase({
//       name,
//       parent,
//       properties: builder.toNotionProperties(),
//       icon: options.icon,
//       cover: options.cover
//     });
    
//     return schema;
//   },
  
//   /**
//    * Create a task tracking database (for a project)
//    * @param {string} name - Database name
//    * @param {string} projectId - Related project database ID
//    * @param {Object} options - Additional options
//    * @returns {Promise<Object>} - Created database schema
//    */
//   createTaskDatabase: async (name, projectId, options = {}) => {
//     const builder = new SchemaBuilder(name)
//       .addTitle('Task', true)
//       .addCheckbox('Completed')
//       .addRichText('Details')
//       .addDate('Due Date')
//       .addSelect('Priority', ['Low', 'Medium', 'High', 'Urgent'])
//       .addSelect('Status', ['To Do', 'In Progress', 'In Review', 'Done'])
//       .addMultiSelect('Tags', options.tags || []);
    
//     // Add relation to the project
//     if (projectId) {
//       builder.addRelation('Project', projectId);
//     }
    
//     // Add assignee if provided
//     if (options.hasAssignee) {
//       builder.addSelect('Assignee', options.assignees || []);
//     }
    
//     // Set up parent page if specified
//     const parent = options.parentPageId ? {
//       type: 'page_id',
//       page_id: options.parentPageId
//     } : undefined;
    
//     // Create the database in Notion
//     const schema = await databaseRegistry.createDatabase({
//       name,
//       parent,
//       properties: builder.toNotionProperties(),
//       icon: options.icon,
//       cover: options.cover
//     });
    
//     return schema;
//   },
  
//   /**
//    * Create a meeting notes database
//    * @param {string} name - Database name
//    * @param {Object} options - Additional options
//    * @returns {Promise<Object>} - Created database schema
//    */
//   createMeetingNotesDatabase: async (name, options = {}) => {
//     const builder = new SchemaBuilder(name)
//       .addTitle('Meeting Topic', true)
//       .addDate('Date')
//       .addRichText('Summary')
//       .addMultiSelect('Participants', options.participants || [])
//       .addMultiSelect('Tags', options.tags || [])
//       .addRichText('Action Items')
//       .addRichText('Notes');
    
//     // Add project relation if provided
//     if (options.projectId) {
//       builder.addRelation('Related Project', options.projectId);
//     }
    
//     // Create the database in Notion
//     const schema = await databaseRegistry.createDatabase({
//       name,
//       properties: builder.toNotionProperties(),
//       icon: options.icon,
//       cover: options.cover
//     });
    
//     return schema;
//   },
  
//   /**
//    * Create a contact database
//    * @param {string} name - Database name
//    * @param {Object} options - Additional options
//    * @returns {Promise<Object>} - Created database schema
//    */
//   createContactDatabase: async (name, options = {}) => {
//     const builder = new SchemaBuilder(name)
//       .addTitle('Name', true)
//       .addEmail('Email')
//       .addPhoneNumber('Phone')
//       .addUrl('Website')
//       .addRichText('Notes')
//       .addSelect('Category', options.categories || ['Client', 'Vendor', 'Team', 'Personal']);
    
//     // Create the database in Notion
//     const schema = await databaseRegistry.createDatabase({
//       name,
//       properties: builder.toNotionProperties(),
//       icon: options.icon,
//       cover: options.cover
//     });
    
//     return schema;
//   },
  
//   /**
//    * Create a custom database from a schema
//    * @param {Object} schemaData - Schema data with name and properties
//    * @returns {Promise<Object>} - Created database schema
//    */
//   createCustomDatabase: async (schemaData) => {
//     const { name, properties, icon, cover } = schemaData;
    
//     // Create the database in Notion
//     const schema = await databaseRegistry.createDatabase({
//       name,
//       properties,
//       icon,
//       cover
//     });
    
//     return schema;
//   }
// };

// module.exports = DatabaseFactory;