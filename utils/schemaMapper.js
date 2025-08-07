/**
 * utils/schemaMapper.js
 * Convert validated dynamic DB spec JSON into Notion API properties format
 */

/**
 * Maps a dynamic DB spec properties object into Notion API-compatible properties
 * @param {Object} propSpec - The 'properties' object from a validated spec
 * @returns {Object} Notion API properties
 */
function toNotionProperties(propSpec) {
    const result = {};
  
    for (const [propName, config] of Object.entries(propSpec)) {
      switch (config.type) {
        case 'title':
          result[propName] = { title: {} };
          break;
        case 'rich_text':
          result[propName] = { rich_text: {} };
          break;
        case 'checkbox':
          result[propName] = { checkbox: {} };
          break;
        case 'date':
          result[propName] = { date: {} };
          break;
        case 'number':
          result[propName] = { number: { format: config.format || 'number' } };
          break;
        case 'url':
          result[propName] = { url: {} };
          break;
        case 'email':
          result[propName] = { email: {} };
          break;
        case 'phone_number':
          result[propName] = { phone_number: {} };
          break;
        case 'select':
          result[propName] = {
            select: {
              options: (config.options || []).map(name => ({ name }))
            }
          };
          break;
        case 'multi_select':
          result[propName] = {
            multi_select: {
              options: (config.options || []).map(name => ({ name }))
            }
          };
          break;
        case 'relation':
          result[propName] = {
            relation: { database_id: config.relation.database_id }
          };
          break;
        case 'files':
          result[propName] = { files: {} };
          break;
        default:
          throw new Error(`Unsupported property type: ${config.type}`);
      }
    }
  
    return result;
  }
  
  module.exports = { toNotionProperties };
  