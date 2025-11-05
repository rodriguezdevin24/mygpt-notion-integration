# LUMEN: Custom GPT Dynamic Planner API

A flexible Node.js API that connects to Notion databases, providing both task-specific and dynamic database management capabilities. Built to work seamlessly with AI assistants and custom GPTs for intelligent task and project management.

## What This Does

This API acts as a bridge between your Notion workspace and external applications. It handles two main things:

1. **Task Management** - Direct access to your Tasks database with smart filtering and scheduling
2. **Dynamic Database Operations** - Generic CRUD operations for any Notion database in your workspace

The system automatically discovers your databases, understands their schemas, and lets you interact with them through a clean REST API.

## Project Structure

```
├── app.js                      # Main application entry point
├── config/
│   ├── notion.js              # Notion client initialization
│   └── databaseRegistry.js    # Schema management and caching
├── controllers/
│   ├── taskController.js      # Task-specific logic
│   ├── dynamicController.js   # Generic database operations
│   ├── dynamicEntryController.js  # Entry CRUD operations
│   └── discoveryController.js # Database discovery
├── models/
│   ├── taskModel.js           # Task database interactions
│   └── dynamicModel.js        # Generic database model
├── routes/
│   ├── taskRoutes.js          # /api/tasks endpoints
│   ├── dynamicRoutes.js       # /api/dynamic/databases endpoints
│   ├── dynamicEntryRoutes.js  # /api/dynamic/databases/:id/entries
│   ├── discoveryRoutes.js     # /api/discovery endpoints
│   ├── actionsRoutes.js       # /api/actions (GPT Actions format)
│   └── privacyRoutes.js       # Privacy policy page
├── services/
│   ├── dynamicDbService.js    # Database creation and updates
│   └── notionDiscoveryService.js  # Schema introspection
├── middleware/
│   └── authMiddleware.js      # API key authentication
├── utils/
│   ├── notionHelpers.js       # Format conversion utilities
│   └── databaseFactory.js     # Pre-built database templates (commented out)
├── schemas/                    # Cached database schemas (JSON files)
└── public/
    └── privacy-policy.html    # Privacy policy for OpenAI GPT directory

```

## How It Works

### Database Registry System

The core innovation here is the **database registry**. When the app starts, it:

1. Loads any previously saved database schemas from the `schemas/` directory
2. Registers your main Tasks database automatically
3. Caches schema information to avoid repeated API calls

When you interact with a database for the first time, the system:
- Fetches its schema from Notion
- Saves it locally as JSON
- Uses that schema to handle property type conversions going forward

This means the API understands what types of fields each database has (text, select, multi-select, dates, etc.) and handles the conversion between simple JSON and Notion's property format automatically.

### Dynamic Model Pattern

The `DynamicModel` class is the workhorse. You give it a database ID, and it:

- Loads the schema from the registry
- Provides methods for CRUD operations
- Automatically converts between Notion's complex property format and simple key-value pairs

For example, Notion stores a checkbox as:
```json
{
  "completed": {
    "type": "checkbox",
    "checkbox": true
  }
}
```

But you can just send:
```json
{
  "completed": true
}
```

The model handles the translation both ways.

## Key Features

### 1. Task Management

Specialized endpoints for your Tasks database with built-in intelligence:

- **Smart date filtering** - Handles timezone complexities in Notion's date storage
- **Time of day grouping** - Organizes today's tasks by morning/afternoon/evening
- **Flexible queries** - Filter by completed status, priority, occurrence, etc.

### 2. Database Discovery

Live introspection of your Notion workspace:

- Lists all accessible databases
- Retrieves complete schemas including property types and options
- Discovers select/multi-select options automatically

### 3. Generic Database Operations

Works with any database structure:

- Create new databases with custom schemas
- Add properties to existing databases
- Full CRUD on database entries
- Automatic type validation and conversion

### 4. GPT Actions Integration

The `/api/actions/*` endpoints are specifically designed for OpenAI's GPT Actions:

- `list-databases` - Discover available databases
- `list-entries` - Query database with pagination
- `create-entry` - Add new entries
- `update-entry` - Modify existing entries
- `create-database` - Scaffold new databases
- `add-properties` - Extend database schemas

**The Shim Layer Pattern:**

These endpoints act as a "shim" - a translation layer that sits between GPT Actions and the core dynamic model. GPT Actions send data in an inconsistent format that doesn't directly match Notion's API structure. The shim endpoints accept GPT's simplified output format and transform it into the proper structure our dynamic model expects.

Without this layer, GPT Actions would send malformed data that breaks the API. With it, the integration just works.

These endpoints accept a simplified field format:
```json
{
  "name": "Property Name",
  "value": "simple value",
  "type": "select"
}
```

The shim handles name resolution (case-insensitive), type coercion, and property mapping automatically before passing clean data to the dynamic model.

## Configuration

### Environment Variables

Create a `.env` file:

```env
# Notion Integration
NOTION_API_KEY=secret_xxx
NOTION_TASKS_DATABASE_ID=xxx
NOTION_PARENT_PAGE_ID=xxx  # Optional: default parent for new databases

# API Security
API_KEY=your_secure_api_key

# Server
PORT=3000
NODE_ENV=development
```

### Getting Your Notion Credentials

1. Create an integration at https://www.notion.so/my-integrations
2. Copy the Internal Integration Token (this is your `NOTION_API_KEY`)
3. Share your databases with the integration
4. Copy database IDs from their URLs

Database ID is the part after the workspace name and before the `?`:
```
https://www.notion.so/workspace/DATABASE_ID?v=...
```

## API Authentication

All requests require an API key in the header:
```
x-api-key: your_secure_api_key
```

If missing or invalid, you'll get a 401 or 403 response.

## Installation and Running

```bash
# Install dependencies
npm install

# Development with auto-reload
npm run dev

# Production
npm start
```

The server runs on port 3000 by default.

## API Endpoints

### Task Endpoints

```
GET  /api/tasks/           # Get all tasks (with filters)
GET  /api/tasks/today      # Get today's tasks (grouped by time)
GET  /api/tasks/:id        # Get specific task
POST /api/tasks/           # Create new task
PATCH /api/tasks/:id       # Update task
DELETE /api/tasks/:id      # Archive task
```

Query parameters for filtering:
- `completed` - true/false
- `dueDate` - YYYY-MM-DD
- `priority` - Priority level
- `occurrence` - Occurrence type
- `timeOfDay` - Morning/Afternoon/Evening
- `grouped` - true/false (for today endpoint)

### Dynamic Database Endpoints

```
POST  /api/dynamic/databases/              # Create new database
GET   /api/dynamic/databases/              # List all registered databases
GET   /api/dynamic/databases/:id           # Get database schema
PATCH /api/dynamic/databases/:id           # Update database

GET   /api/dynamic/databases/:id/entries   # List all entries
GET   /api/dynamic/databases/:id/entries/:entryId   # Get specific entry
POST  /api/dynamic/databases/:id/entries   # Create entry
PATCH /api/dynamic/databases/:id/entries/:entryId  # Update entry
DELETE /api/dynamic/databases/:id/entries/:entryId # Archive entry
```

### Discovery Endpoints

```
GET /api/discovery/databases          # Discover all databases
GET /api/discovery/databases/:id      # Get database schema
GET /api/discovery/all-schemas        # Get all databases with schemas
```

### GPT Actions Endpoints

```
GET  /api/actions/list-databases       # List accessible databases
GET  /api/actions/list-entries         # List entries with pagination
POST /api/actions/create-entry         # Create database entry
POST /api/actions/update-entry         # Update database entry
POST /api/actions/create-database      # Create new database
POST /api/actions/add-properties       # Add properties to database
```

## Example Usage

### Creating a Task

```bash
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_key" \
  -d '{
    "title": "Review API documentation",
    "completed": false,
    "dueDate": "2025-11-04",
    "priority": "High",
    "note": "Make sure examples are clear"
  }'
```

### Getting Today's Tasks

```bash
curl -X GET "http://localhost:3000/api/tasks/today?grouped=true" \
  -H "x-api-key: your_api_key"
```

Returns tasks organized by time of day:
```json
{
  "success": true,
  "date": "2025-11-03",
  "groupedTasks": {
    "morning": [...],
    "afternoon": [...],
    "evening": [...],
    "unspecified": [...]
  }
}
```

### Creating a New Database

```bash
curl -X POST http://localhost:3000/api/actions/create-database \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_key" \
  -d '{
    "name": "Project Tracker",
    "fields": [
      { "name": "Project Name", "type": "title" },
      { "name": "Status", "type": "select", "options": ["Planning", "Active", "Complete"] },
      { "name": "Due Date", "type": "date" },
      { "name": "Priority", "type": "select", "options": ["Low", "Medium", "High"] }
    ]
  }'
```

### Querying a Database

```bash
curl -X GET "http://localhost:3000/api/actions/list-entries?dbId=xxx&pageSize=20" \
  -H "x-api-key: your_api_key"
```

## Property Type Handling

The system supports all Notion property types:

| Type | Description | Example Value |
|------|-------------|---------------|
| `title` | Main title (one per database) | `"My Task"` |
| `rich_text` | Text with formatting | `"Some notes"` |
| `checkbox` | Boolean value | `true` |
| `select` | Single selection | `"In Progress"` |
| `multi_select` | Multiple selections | `["Tag1", "Tag2"]` |
| `date` | Date or date range | `"2025-11-03"` |
| `number` | Numeric value | `42` |
| `url` | Web link | `"https://example.com"` |
| `email` | Email address | `"test@example.com"` |
| `phone_number` | Phone number | `"+1234567890"` |
| `relation` | Link to another database | `["page-id-1", "page-id-2"]` |
| `files` | File attachments | (automatically handled) |

## Error Handling

The API uses consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error message"
}
```

Common status codes:
- `200` - Success
- `201` - Created
- `400` - Bad request (missing required fields)
- `401` - Missing API key
- `403` - Invalid API key
- `404` - Resource not found
- `500` - Server error

## Middleware and Security

### Authentication Middleware

The `authMiddleware.js` checks for the `x-api-key` header on every request. This is a simple but effective approach for a personal API.

### Security Headers

Using `helmet` to set security headers:
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- etc.

### CORS

CORS is enabled for all origins in the current setup. For production, you'd want to restrict this to specific domains.

### Logging

Using `morgan` for HTTP request logging in development mode. There's also custom logging middleware that logs request/response details for debugging.

## Database Schema Files

Schemas are cached in the `schemas/` directory as JSON files. Each file is named with the database ID:

```
schemas/
├── 14f459ef-f3eb-80fb-b9d8-cd348070eaa1.json  # Tasks database
└── 238459ef-f3eb-812c-95a7-e15c130ac041.json  # Projects Hub
```

These files include:
- Database ID and name
- Property definitions with types
- Select/multi-select options
- Creation and edit timestamps
- Notion URL

The system automatically updates these when databases are created or modified through the API.

## OpenAI GPT Integration

The API includes an OpenAPI specification (`/mnt/project/OpenAI_Spec`) that defines the GPT Actions schema. This allows custom GPTs to:

- Discover available databases dynamically
- Query and filter entries
- Create and update records
- Build new databases on the fly

The spec includes detailed parameter definitions and JSON schemas for complex types like relations, formulas, and rollups.

## Debugging

There's a `debug-notion-task.js` script that helps inspect the raw Notion API responses. Run it to see:

- Complete page object structure
- Property names and types
- How Notion stores different field types

This is useful when adding support for new databases or troubleshooting property mapping issues.

## Things to Note

### Date Handling

Notion stores dates in ISO format but sometimes includes timezone information. The API normalizes this to YYYY-MM-DD format for consistency. When filtering by date, it uses range queries to handle timezone edge cases.

### Multi-Select Values

Multi-select fields always return arrays, even if empty. When setting values, you can provide either:
- An array: `["Option1", "Option2"]`
- A single string: `"Option1"` (converted to array automatically)

### Property Name Matching

The system does case-insensitive property name matching. It also handles common aliases like "title" or "name" mapping to whatever the actual title property is called.

### Pagination

Large result sets are automatically paginated by Notion. The API includes `has_more` and `next_cursor` in responses. You can use `startCursor` to get the next page.

### Relation Properties

Relations return arrays of page IDs. To get the actual related entries, you'd need to fetch those pages separately. The API doesn't automatically expand relations (though it could be extended to do so).

## Extending the System

### Adding New Database Templates

The `databaseFactory.js` file (currently commented out) contains templates for common database types:
- Project databases
- Task tracking
- Meeting notes
- Contact management

You can uncomment and customize these, or create your own templates following the same pattern.

### Custom Property Types

To add support for new Notion property types:

1. Update `formatFromNotion()` in `dynamicModel.js` to handle reading the type
2. Update `formatForNotion()` to handle writing the type
3. Add validation in `services/dynamicDbService.js` if needed

### Adding Business Logic

For domain-specific logic, create new controllers that use the existing models. For example, you could add:

- Recurring task generation
- Automatic priority assignment
- Report generation
- Integration with external services

## Deployment

The API is deployed on Render (based on the OpenAPI spec URL). For your own deployment:

1. Set environment variables in your hosting platform
2. Ensure the `schemas/` directory is writable (or use a database for schema storage)
3. Set `NODE_ENV=production`
4. Consider adding rate limiting for public-facing deployments
5. Restrict CORS to your application's domain

## Privacy and Data

The API only accesses databases that your Notion integration has been explicitly shared with. It doesn't store any task or entry data - everything lives in Notion. The only persistent data is the schema cache files.

The privacy policy in `public/privacy-policy.html` explains that this is a single-user tool, not a multi-tenant service.

## Future Enhancements

Some ideas for extending this:

- **Webhook support** - React to Notion changes in real-time
- **Batch operations** - Update multiple entries at once
- **Advanced filtering** - More complex query builders
- **Relation expansion** - Automatically fetch related entries
- **Schema versioning** - Track database schema changes over time
- **Backup system** - Export all database contents
- **Analytics** - Track task completion rates, time estimates, etc.

## Troubleshooting

### "No schema found for database ID"

The database hasn't been registered yet. Either:
1. Restart the server to trigger discovery
2. Hit the `/api/discovery/databases/:id` endpoint
3. Create an entry in the database to force schema loading

### "Invalid API key"

Check that your `x-api-key` header matches the `API_KEY` in `.env`.

### "Notion API Error: Object not found"

The integration doesn't have access to that database. Go to Notion and share the database with your integration.

### Properties not updating

Make sure property names match exactly (though the system is case-insensitive). Check the schema file to see the exact property names Notion uses.

## License

MIT - Do whatever you want with this. No attribution required.

---

Built for seamless integration between Notion and AI assistants. The goal was to make Notion databases feel like simple REST APIs without losing any of the power and flexibility of Notion's data model.
