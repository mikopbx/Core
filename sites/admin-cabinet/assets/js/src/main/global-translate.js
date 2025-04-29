/**
 * MikoPBX multilingual interface translation system.
 * 
 * This implementation consists of two main components:
 * 1. globalTranslate - Simple proxy for direct access to translations (backward compatible)
 * 2. i18n - Advanced function with parameter substitution capabilities
 * 
 * BASIC USAGE (globalTranslate):
 * Provides direct access to translation strings. This is fully backward compatible
 * with all existing code.
 * 
 * @example
 * // Direct access for simple translations
 * globalTranslate.January                     // Returns "Январь"
 * globalTranslate['ex_Ukrainian']             // Returns "Українська"
 * 
 * // Usage in existing UI components
 * { title: globalTranslate.ex_SearchByExtension, value: 'number:' }
 * 
 * // If no translation exists, returns the key itself
 * globalTranslate.UnknownKey                  // Returns "UnknownKey"
 * 
 * ADVANCED USAGE (i18n function):
 * Provides parameter substitution for dynamic messages like system notifications,
 * warnings, and advice messages.
 * 
 * @example
 * // With parameter substitution for dynamic messages
 * i18n('adv_FirewallDisabled')                // Returns "Firewall disabled %url%" (template)
 * i18n('adv_FirewallDisabled', {              // Returns "Firewall disabled /admin-cabinet/firewall/index/"
 *   url: '/admin-cabinet/firewall/index/'
 * })
 * 
 * // Example from advice system
 * i18n(value.messageTpl, value.messageParams)  // For dynamic system messages
 * 
 * // If no translation exists, returns the key itself (with parameters if provided)
 * i18n('UnknownKey')                          // Returns "UnknownKey"
 * i18n('UnknownKey', {param: 'test'})         // Returns "UnknownKey" with parameter replacements if needed
 * 
 * @note Placeholders in translation strings must be formatted as %paramName%
 */

// Basic translation proxy (backward compatible)
globalTranslate = new Proxy(globalTranslateArray, {
  get: function(target, prop, receiver) {
      // Check if the property exists in the target
      if (prop in target) {
          return target[prop];
      }
      // Return the key itself if no translation is found
      return prop;
  }
});

/**
* Advanced translation function with parameter substitution.
* 
* @param {string} key - The translation key to look up
* @param {Object} params - Optional object with parameters for substitution
* @returns {string} - The translated string with parameter substitution
*/
function i18n(key, params = null) {
  // Get the translation or the key itself if translation doesn't exist
  const translation = key in globalTranslateArray ? globalTranslateArray[key] : key;
  
  // If no parameters or translation doesn't have placeholders, return original translation
  if (params === null || typeof params !== 'object' || !translation.includes('%')) {
      return translation;
  }
  
  // Replace all placeholders with corresponding values from params
  let result = translation;
  for (let paramKey in params) {
      const placeholder = `%${paramKey}%`;
      if (result.includes(placeholder)) {
          result = result.replace(new RegExp(placeholder, 'g'), params[paramKey]);
      }
  }
  
  return result;
}