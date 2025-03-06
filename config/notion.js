require('dotenv').config();
const { Client } = require('@notionhq/client');

// Initialize Notion client with API key from environment variables
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

// Database IDs from environment variables
const TASKS_DATABASE_ID = process.env.NOTION_TASKS_DATABASE_ID;

module.exports = {
  notion,
  TASKS_DATABASE_ID,
};