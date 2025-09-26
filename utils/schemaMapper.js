/**
 * utils/schemaMapper.js
 * Convert validated dynamic DB spec JSON into Notion API properties format
 * FIXED: Added support for relations, formulas, and rollups with proper Notion API formatting
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
        result[propName] = { 
          number: { 
            format: config.format || 'number' 
          } 
        };
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
            options: (config.options || []).map(opt => {
              // Handle both string and object formats
              if (typeof opt === 'string') {
                return { name: opt };
              }
              return { 
                name: opt.name || opt,
                color: opt.color || 'default'
              };
            })
          }
        };
        break;
        
      case 'multi_select':
        result[propName] = {
          multi_select: {
            options: (config.options || []).map(opt => {
              // Handle both string and object formats
              if (typeof opt === 'string') {
                return { name: opt };
              }
              return { 
                name: opt.name || opt,
                color: opt.color || 'default'
              };
            })
          }
        };
        break;
        
      case 'relation':
        // FIX: Proper relation formatting with required properties
        if (!config.relation || !config.relation.database_id) {
          throw new Error(`Relation property "${propName}" requires database_id`);
        }
        
        result[propName] = {
          relation: {
            database_id: config.relation.database_id,
            // Use single_property by default (one-way relation)
            // If synced_property_name is provided, use dual_property
            ...(config.relation.synced_property_name 
              ? {
                  type: 'dual_property',
                  dual_property: {
                    synced_property_name: config.relation.synced_property_name
                  }
                }
              : {
                  type: 'single_property',
                  single_property: {}
                }
            )
          }
        };
        break;
        
      case 'formula':
        // NEW: Formula property support
        if (!config.expression) {
          throw new Error(`Formula property "${propName}" requires expression`);
        }
        
        result[propName] = {
          formula: {
            expression: config.expression
          }
        };
        break;
        
      case 'rollup':
        // NEW: Rollup property support
        if (!config.rollup) {
          throw new Error(`Rollup property "${propName}" requires rollup configuration`);
        }
        
        const rollup = config.rollup;
        if (!rollup.relation_property_name || !rollup.rollup_property_name || !rollup.function) {
          throw new Error(
            `Rollup property "${propName}" requires relation_property_name, rollup_property_name, and function`
          );
        }
        
        result[propName] = {
          rollup: {
            relation_property_name: rollup.relation_property_name,
            rollup_property_name: rollup.rollup_property_name,
            function: rollup.function // e.g., 'count', 'sum', 'average', 'min', 'max', etc.
          }
        };
        break;
        
      case 'files':
        result[propName] = { files: {} };
        break;
        
      case 'people':
        // Additional property type support
        result[propName] = { people: {} };
        break;
        
      case 'created_time':
        result[propName] = { created_time: {} };
        break;
        
      case 'last_edited_time':
        result[propName] = { last_edited_time: {} };
        break;
        
      case 'created_by':
        result[propName] = { created_by: {} };
        break;
        
      case 'last_edited_by':
        result[propName] = { last_edited_by: {} };
        break;
        
      default:
        console.warn(`Unsupported property type: ${config.type} for property: ${propName}`);
        // Don't throw error - just skip unsupported types
        break;
    }
  }

  return result;
}

/**
 * Convert Notion API properties back to canonical format for storage
 * Used when syncing schemas from Notion back to local registry
 */
function fromNotionProperties(notionProps) {
  const result = {};
  
  for (const [propName, prop] of Object.entries(notionProps || {})) {
    const type = prop.type;
    if (!type) continue;
    
    switch (type) {
      case 'title':
        result[propName] = { type: 'title' };
        break;
        
      case 'rich_text':
        result[propName] = { type: 'rich_text' };
        break;
        
      case 'checkbox':
        result[propName] = { type: 'checkbox' };
        break;
        
      case 'date':
        result[propName] = { type: 'date' };
        break;
        
      case 'number':
        result[propName] = { 
          type: 'number',
          format: prop.number?.format || 'number'
        };
        break;
        
      case 'select':
        result[propName] = {
          type: 'select',
          options: (prop.select?.options || []).map(opt => opt.name)
        };
        break;
        
      case 'multi_select':
        result[propName] = {
          type: 'multi_select',
          options: (prop.multi_select?.options || []).map(opt => opt.name)
        };
        break;
        
      case 'relation':
        result[propName] = {
          type: 'relation',
          relation: {
            database_id: prop.relation?.database_id,
            ...(prop.relation?.dual_property?.synced_property_name && {
              synced_property_name: prop.relation.dual_property.synced_property_name
            })
          }
        };
        break;
        
      case 'formula':
        result[propName] = {
          type: 'formula',
          expression: prop.formula?.expression
        };
        break;
        
      case 'rollup':
        result[propName] = {
          type: 'rollup',
          rollup: {
            relation_property_name: prop.rollup?.relation_property_name,
            rollup_property_name: prop.rollup?.rollup_property_name,
            function: prop.rollup?.function
          }
        };
        break;
        
      case 'url':
        result[propName] = { type: 'url' };
        break;
        
      case 'email':
        result[propName] = { type: 'email' };
        break;
        
      case 'phone_number':
        result[propName] = { type: 'phone_number' };
        break;
        
      case 'files':
        result[propName] = { type: 'files' };
        break;
        
      case 'people':
        result[propName] = { type: 'people' };
        break;
        
      case 'created_time':
        result[propName] = { type: 'created_time' };
        break;
        
      case 'last_edited_time':
        result[propName] = { type: 'last_edited_time' };
        break;
        
      case 'created_by':
        result[propName] = { type: 'created_by' };
        break;
        
      case 'last_edited_by':
        result[propName] = { type: 'last_edited_by' };
        break;
        
      default:
        // Store unknown types as-is for forward compatibility
        result[propName] = { type };
        break;
    }
  }
  
  return result;
}

module.exports = { 
  toNotionProperties,
  fromNotionProperties 
};