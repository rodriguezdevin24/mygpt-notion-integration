// debug-notion-task.js
require('dotenv').config();
const { Client } = require('@notionhq/client');

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

const TASKS_DATABASE_ID = process.env.NOTION_TASKS_DATABASE_ID;

async function debugNotionTask() {
  try {
    // Query the database to get one task
    const response = await notion.databases.query({
      database_id: TASKS_DATABASE_ID,
      page_size: 1, // Just get one task for debugging
    });

    if (response.results.length === 0) {
      console.log('No tasks found in the database');
      return;
    }

    const page = response.results[0];
    
    // Log the entire page object to see its structure
    console.log('Complete Notion page object:');
    console.log(JSON.stringify(page, null, 2));
    
    // Log just the properties for a cleaner view
    console.log('\n\nPage Properties:');
    console.log(JSON.stringify(page.properties, null, 2));
    
    // Log all property names for quick reference
    console.log('\n\nProperty Names:');
    console.log(Object.keys(page.properties));
    
    // Try to locate the occurrence property specifically
    console.log('\n\nSearching for occurrence/Occurrence property:');
    const occurrenceProps = Object.keys(page.properties).filter(key => 
      key.toLowerCase() === 'occurrence'
    );
    
    if (occurrenceProps.length > 0) {
      console.log('Found occurrence property with name(s):', occurrenceProps);
      occurrenceProps.forEach(propName => {
        console.log(`\nProperty "${propName}" details:`, JSON.stringify(page.properties[propName], null, 2));
      });
    } else {
      console.log('No property matching "occurrence" found. Showing all property types:');
      Object.keys(page.properties).forEach(key => {
        const type = page.properties[key].type;
        console.log(`- ${key}: ${type}`);
      });
    }
    
  } catch (error) {
    console.error('Error in debug script:', error);
  }
}

debugNotionTask();