"use strict";

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

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
  get: function get(target, prop, receiver) {
    // Check if the property exists in the target
    if (prop in target) {
      return target[prop];
    } // Return the key itself if no translation is found


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

function i18n(key) {
  var params = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
  // Get the translation or the key itself if translation doesn't exist
  var translation = key in globalTranslateArray ? globalTranslateArray[key] : key; // If no parameters or translation doesn't have placeholders, return original translation

  if (params === null || _typeof(params) !== 'object' || !translation.includes('%')) {
    return translation;
  } // Replace all placeholders with corresponding values from params


  var result = translation;

  for (var paramKey in params) {
    var placeholder = "%".concat(paramKey, "%");

    if (result.includes(placeholder)) {
      result = result.replace(new RegExp(placeholder, 'g'), params[paramKey]);
    }
  }

  return result;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2dsb2JhbC10cmFuc2xhdGUuanMiXSwibmFtZXMiOlsiZ2xvYmFsVHJhbnNsYXRlIiwiUHJveHkiLCJnbG9iYWxUcmFuc2xhdGVBcnJheSIsImdldCIsInRhcmdldCIsInByb3AiLCJyZWNlaXZlciIsImkxOG4iLCJrZXkiLCJwYXJhbXMiLCJ0cmFuc2xhdGlvbiIsImluY2x1ZGVzIiwicmVzdWx0IiwicGFyYW1LZXkiLCJwbGFjZWhvbGRlciIsInJlcGxhY2UiLCJSZWdFeHAiXSwibWFwcGluZ3MiOiI7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFFQTtBQUNBQSxlQUFlLEdBQUcsSUFBSUMsS0FBSixDQUFVQyxvQkFBVixFQUFnQztBQUNoREMsRUFBQUEsR0FBRyxFQUFFLGFBQVNDLE1BQVQsRUFBaUJDLElBQWpCLEVBQXVCQyxRQUF2QixFQUFpQztBQUNsQztBQUNBLFFBQUlELElBQUksSUFBSUQsTUFBWixFQUFvQjtBQUNoQixhQUFPQSxNQUFNLENBQUNDLElBQUQsQ0FBYjtBQUNILEtBSmlDLENBS2xDOzs7QUFDQSxXQUFPQSxJQUFQO0FBQ0g7QUFSK0MsQ0FBaEMsQ0FBbEI7QUFXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQSxTQUFTRSxJQUFULENBQWNDLEdBQWQsRUFBa0M7QUFBQSxNQUFmQyxNQUFlLHVFQUFOLElBQU07QUFDaEM7QUFDQSxNQUFNQyxXQUFXLEdBQUdGLEdBQUcsSUFBSU4sb0JBQVAsR0FBOEJBLG9CQUFvQixDQUFDTSxHQUFELENBQWxELEdBQTBEQSxHQUE5RSxDQUZnQyxDQUloQzs7QUFDQSxNQUFJQyxNQUFNLEtBQUssSUFBWCxJQUFtQixRQUFPQSxNQUFQLE1BQWtCLFFBQXJDLElBQWlELENBQUNDLFdBQVcsQ0FBQ0MsUUFBWixDQUFxQixHQUFyQixDQUF0RCxFQUFpRjtBQUM3RSxXQUFPRCxXQUFQO0FBQ0gsR0FQK0IsQ0FTaEM7OztBQUNBLE1BQUlFLE1BQU0sR0FBR0YsV0FBYjs7QUFDQSxPQUFLLElBQUlHLFFBQVQsSUFBcUJKLE1BQXJCLEVBQTZCO0FBQ3pCLFFBQU1LLFdBQVcsY0FBT0QsUUFBUCxNQUFqQjs7QUFDQSxRQUFJRCxNQUFNLENBQUNELFFBQVAsQ0FBZ0JHLFdBQWhCLENBQUosRUFBa0M7QUFDOUJGLE1BQUFBLE1BQU0sR0FBR0EsTUFBTSxDQUFDRyxPQUFQLENBQWUsSUFBSUMsTUFBSixDQUFXRixXQUFYLEVBQXdCLEdBQXhCLENBQWYsRUFBNkNMLE1BQU0sQ0FBQ0ksUUFBRCxDQUFuRCxDQUFUO0FBQ0g7QUFDSjs7QUFFRCxTQUFPRCxNQUFQO0FBQ0QiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIE1pa29QQlggbXVsdGlsaW5ndWFsIGludGVyZmFjZSB0cmFuc2xhdGlvbiBzeXN0ZW0uXG4gKiBcbiAqIFRoaXMgaW1wbGVtZW50YXRpb24gY29uc2lzdHMgb2YgdHdvIG1haW4gY29tcG9uZW50czpcbiAqIDEuIGdsb2JhbFRyYW5zbGF0ZSAtIFNpbXBsZSBwcm94eSBmb3IgZGlyZWN0IGFjY2VzcyB0byB0cmFuc2xhdGlvbnMgKGJhY2t3YXJkIGNvbXBhdGlibGUpXG4gKiAyLiBpMThuIC0gQWR2YW5jZWQgZnVuY3Rpb24gd2l0aCBwYXJhbWV0ZXIgc3Vic3RpdHV0aW9uIGNhcGFiaWxpdGllc1xuICogXG4gKiBCQVNJQyBVU0FHRSAoZ2xvYmFsVHJhbnNsYXRlKTpcbiAqIFByb3ZpZGVzIGRpcmVjdCBhY2Nlc3MgdG8gdHJhbnNsYXRpb24gc3RyaW5ncy4gVGhpcyBpcyBmdWxseSBiYWNrd2FyZCBjb21wYXRpYmxlXG4gKiB3aXRoIGFsbCBleGlzdGluZyBjb2RlLlxuICogXG4gKiBAZXhhbXBsZVxuICogLy8gRGlyZWN0IGFjY2VzcyBmb3Igc2ltcGxlIHRyYW5zbGF0aW9uc1xuICogZ2xvYmFsVHJhbnNsYXRlLkphbnVhcnkgICAgICAgICAgICAgICAgICAgICAvLyBSZXR1cm5zIFwi0K/QvdCy0LDRgNGMXCJcbiAqIGdsb2JhbFRyYW5zbGF0ZVsnZXhfVWtyYWluaWFuJ10gICAgICAgICAgICAgLy8gUmV0dXJucyBcItCj0LrRgNCw0ZfQvdGB0YzQutCwXCJcbiAqIFxuICogLy8gVXNhZ2UgaW4gZXhpc3RpbmcgVUkgY29tcG9uZW50c1xuICogeyB0aXRsZTogZ2xvYmFsVHJhbnNsYXRlLmV4X1NlYXJjaEJ5RXh0ZW5zaW9uLCB2YWx1ZTogJ251bWJlcjonIH1cbiAqIFxuICogLy8gSWYgbm8gdHJhbnNsYXRpb24gZXhpc3RzLCByZXR1cm5zIHRoZSBrZXkgaXRzZWxmXG4gKiBnbG9iYWxUcmFuc2xhdGUuVW5rbm93bktleSAgICAgICAgICAgICAgICAgIC8vIFJldHVybnMgXCJVbmtub3duS2V5XCJcbiAqIFxuICogQURWQU5DRUQgVVNBR0UgKGkxOG4gZnVuY3Rpb24pOlxuICogUHJvdmlkZXMgcGFyYW1ldGVyIHN1YnN0aXR1dGlvbiBmb3IgZHluYW1pYyBtZXNzYWdlcyBsaWtlIHN5c3RlbSBub3RpZmljYXRpb25zLFxuICogd2FybmluZ3MsIGFuZCBhZHZpY2UgbWVzc2FnZXMuXG4gKiBcbiAqIEBleGFtcGxlXG4gKiAvLyBXaXRoIHBhcmFtZXRlciBzdWJzdGl0dXRpb24gZm9yIGR5bmFtaWMgbWVzc2FnZXNcbiAqIGkxOG4oJ2Fkdl9GaXJld2FsbERpc2FibGVkJykgICAgICAgICAgICAgICAgLy8gUmV0dXJucyBcIkZpcmV3YWxsIGRpc2FibGVkICV1cmwlXCIgKHRlbXBsYXRlKVxuICogaTE4bignYWR2X0ZpcmV3YWxsRGlzYWJsZWQnLCB7ICAgICAgICAgICAgICAvLyBSZXR1cm5zIFwiRmlyZXdhbGwgZGlzYWJsZWQgL2FkbWluLWNhYmluZXQvZmlyZXdhbGwvaW5kZXgvXCJcbiAqICAgdXJsOiAnL2FkbWluLWNhYmluZXQvZmlyZXdhbGwvaW5kZXgvJ1xuICogfSlcbiAqIFxuICogLy8gRXhhbXBsZSBmcm9tIGFkdmljZSBzeXN0ZW1cbiAqIGkxOG4odmFsdWUubWVzc2FnZVRwbCwgdmFsdWUubWVzc2FnZVBhcmFtcykgIC8vIEZvciBkeW5hbWljIHN5c3RlbSBtZXNzYWdlc1xuICogXG4gKiAvLyBJZiBubyB0cmFuc2xhdGlvbiBleGlzdHMsIHJldHVybnMgdGhlIGtleSBpdHNlbGYgKHdpdGggcGFyYW1ldGVycyBpZiBwcm92aWRlZClcbiAqIGkxOG4oJ1Vua25vd25LZXknKSAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmV0dXJucyBcIlVua25vd25LZXlcIlxuICogaTE4bignVW5rbm93bktleScsIHtwYXJhbTogJ3Rlc3QnfSkgICAgICAgICAvLyBSZXR1cm5zIFwiVW5rbm93bktleVwiIHdpdGggcGFyYW1ldGVyIHJlcGxhY2VtZW50cyBpZiBuZWVkZWRcbiAqIFxuICogQG5vdGUgUGxhY2Vob2xkZXJzIGluIHRyYW5zbGF0aW9uIHN0cmluZ3MgbXVzdCBiZSBmb3JtYXR0ZWQgYXMgJXBhcmFtTmFtZSVcbiAqL1xuXG4vLyBCYXNpYyB0cmFuc2xhdGlvbiBwcm94eSAoYmFja3dhcmQgY29tcGF0aWJsZSlcbmdsb2JhbFRyYW5zbGF0ZSA9IG5ldyBQcm94eShnbG9iYWxUcmFuc2xhdGVBcnJheSwge1xuICBnZXQ6IGZ1bmN0aW9uKHRhcmdldCwgcHJvcCwgcmVjZWl2ZXIpIHtcbiAgICAgIC8vIENoZWNrIGlmIHRoZSBwcm9wZXJ0eSBleGlzdHMgaW4gdGhlIHRhcmdldFxuICAgICAgaWYgKHByb3AgaW4gdGFyZ2V0KSB7XG4gICAgICAgICAgcmV0dXJuIHRhcmdldFtwcm9wXTtcbiAgICAgIH1cbiAgICAgIC8vIFJldHVybiB0aGUga2V5IGl0c2VsZiBpZiBubyB0cmFuc2xhdGlvbiBpcyBmb3VuZFxuICAgICAgcmV0dXJuIHByb3A7XG4gIH1cbn0pO1xuXG4vKipcbiogQWR2YW5jZWQgdHJhbnNsYXRpb24gZnVuY3Rpb24gd2l0aCBwYXJhbWV0ZXIgc3Vic3RpdHV0aW9uLlxuKiBcbiogQHBhcmFtIHtzdHJpbmd9IGtleSAtIFRoZSB0cmFuc2xhdGlvbiBrZXkgdG8gbG9vayB1cFxuKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gT3B0aW9uYWwgb2JqZWN0IHdpdGggcGFyYW1ldGVycyBmb3Igc3Vic3RpdHV0aW9uXG4qIEByZXR1cm5zIHtzdHJpbmd9IC0gVGhlIHRyYW5zbGF0ZWQgc3RyaW5nIHdpdGggcGFyYW1ldGVyIHN1YnN0aXR1dGlvblxuKi9cbmZ1bmN0aW9uIGkxOG4oa2V5LCBwYXJhbXMgPSBudWxsKSB7XG4gIC8vIEdldCB0aGUgdHJhbnNsYXRpb24gb3IgdGhlIGtleSBpdHNlbGYgaWYgdHJhbnNsYXRpb24gZG9lc24ndCBleGlzdFxuICBjb25zdCB0cmFuc2xhdGlvbiA9IGtleSBpbiBnbG9iYWxUcmFuc2xhdGVBcnJheSA/IGdsb2JhbFRyYW5zbGF0ZUFycmF5W2tleV0gOiBrZXk7XG4gIFxuICAvLyBJZiBubyBwYXJhbWV0ZXJzIG9yIHRyYW5zbGF0aW9uIGRvZXNuJ3QgaGF2ZSBwbGFjZWhvbGRlcnMsIHJldHVybiBvcmlnaW5hbCB0cmFuc2xhdGlvblxuICBpZiAocGFyYW1zID09PSBudWxsIHx8IHR5cGVvZiBwYXJhbXMgIT09ICdvYmplY3QnIHx8ICF0cmFuc2xhdGlvbi5pbmNsdWRlcygnJScpKSB7XG4gICAgICByZXR1cm4gdHJhbnNsYXRpb247XG4gIH1cbiAgXG4gIC8vIFJlcGxhY2UgYWxsIHBsYWNlaG9sZGVycyB3aXRoIGNvcnJlc3BvbmRpbmcgdmFsdWVzIGZyb20gcGFyYW1zXG4gIGxldCByZXN1bHQgPSB0cmFuc2xhdGlvbjtcbiAgZm9yIChsZXQgcGFyYW1LZXkgaW4gcGFyYW1zKSB7XG4gICAgICBjb25zdCBwbGFjZWhvbGRlciA9IGAlJHtwYXJhbUtleX0lYDtcbiAgICAgIGlmIChyZXN1bHQuaW5jbHVkZXMocGxhY2Vob2xkZXIpKSB7XG4gICAgICAgICAgcmVzdWx0ID0gcmVzdWx0LnJlcGxhY2UobmV3IFJlZ0V4cChwbGFjZWhvbGRlciwgJ2cnKSwgcGFyYW1zW3BhcmFtS2V5XSk7XG4gICAgICB9XG4gIH1cbiAgXG4gIHJldHVybiByZXN1bHQ7XG59Il19