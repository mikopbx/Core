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
      // Clean parameter value from quotes and escaping
      var paramValue = params[paramKey];

      if (typeof paramValue === 'string') {
        // Remove surrounding quotes (single or double) first
        paramValue = paramValue.replace(/^['"]|['"]$/g, '');
      }

      result = result.replace(new RegExp(placeholder, 'g'), paramValue);
    }
  } // Remove escaping from the final result (PHP adds \' and \" when creating JS localization file)


  result = result.replace(/\\'/g, "'").replace(/\\"/g, '"');
  return result;
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2dsb2JhbC10cmFuc2xhdGUuanMiXSwibmFtZXMiOlsiZ2xvYmFsVHJhbnNsYXRlIiwiUHJveHkiLCJnbG9iYWxUcmFuc2xhdGVBcnJheSIsImdldCIsInRhcmdldCIsInByb3AiLCJyZWNlaXZlciIsImkxOG4iLCJrZXkiLCJwYXJhbXMiLCJ0cmFuc2xhdGlvbiIsImluY2x1ZGVzIiwicmVzdWx0IiwicGFyYW1LZXkiLCJwbGFjZWhvbGRlciIsInBhcmFtVmFsdWUiLCJyZXBsYWNlIiwiUmVnRXhwIl0sIm1hcHBpbmdzIjoiOzs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUE7QUFDQUEsZUFBZSxHQUFHLElBQUlDLEtBQUosQ0FBVUMsb0JBQVYsRUFBZ0M7QUFDaERDLEVBQUFBLEdBQUcsRUFBRSxhQUFTQyxNQUFULEVBQWlCQyxJQUFqQixFQUF1QkMsUUFBdkIsRUFBaUM7QUFDbEM7QUFDQSxRQUFJRCxJQUFJLElBQUlELE1BQVosRUFBb0I7QUFDaEIsYUFBT0EsTUFBTSxDQUFDQyxJQUFELENBQWI7QUFDSCxLQUppQyxDQUtsQzs7O0FBQ0EsV0FBT0EsSUFBUDtBQUNIO0FBUitDLENBQWhDLENBQWxCO0FBV0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0EsU0FBU0UsSUFBVCxDQUFjQyxHQUFkLEVBQWtDO0FBQUEsTUFBZkMsTUFBZSx1RUFBTixJQUFNO0FBQ2hDO0FBQ0EsTUFBTUMsV0FBVyxHQUFHRixHQUFHLElBQUlOLG9CQUFQLEdBQThCQSxvQkFBb0IsQ0FBQ00sR0FBRCxDQUFsRCxHQUEwREEsR0FBOUUsQ0FGZ0MsQ0FJaEM7O0FBQ0EsTUFBSUMsTUFBTSxLQUFLLElBQVgsSUFBbUIsUUFBT0EsTUFBUCxNQUFrQixRQUFyQyxJQUFpRCxDQUFDQyxXQUFXLENBQUNDLFFBQVosQ0FBcUIsR0FBckIsQ0FBdEQsRUFBaUY7QUFDN0UsV0FBT0QsV0FBUDtBQUNILEdBUCtCLENBU2hDOzs7QUFDQSxNQUFJRSxNQUFNLEdBQUdGLFdBQWI7O0FBQ0EsT0FBSyxJQUFJRyxRQUFULElBQXFCSixNQUFyQixFQUE2QjtBQUN6QixRQUFNSyxXQUFXLGNBQU9ELFFBQVAsTUFBakI7O0FBQ0EsUUFBSUQsTUFBTSxDQUFDRCxRQUFQLENBQWdCRyxXQUFoQixDQUFKLEVBQWtDO0FBQzlCO0FBQ0EsVUFBSUMsVUFBVSxHQUFHTixNQUFNLENBQUNJLFFBQUQsQ0FBdkI7O0FBQ0EsVUFBSSxPQUFPRSxVQUFQLEtBQXNCLFFBQTFCLEVBQW9DO0FBQ2hDO0FBQ0FBLFFBQUFBLFVBQVUsR0FBR0EsVUFBVSxDQUFDQyxPQUFYLENBQW1CLGNBQW5CLEVBQW1DLEVBQW5DLENBQWI7QUFDSDs7QUFDREosTUFBQUEsTUFBTSxHQUFHQSxNQUFNLENBQUNJLE9BQVAsQ0FBZSxJQUFJQyxNQUFKLENBQVdILFdBQVgsRUFBd0IsR0FBeEIsQ0FBZixFQUE2Q0MsVUFBN0MsQ0FBVDtBQUNIO0FBQ0osR0F0QitCLENBd0JoQzs7O0FBQ0FILEVBQUFBLE1BQU0sR0FBR0EsTUFBTSxDQUFDSSxPQUFQLENBQWUsTUFBZixFQUF1QixHQUF2QixFQUE0QkEsT0FBNUIsQ0FBb0MsTUFBcEMsRUFBNEMsR0FBNUMsQ0FBVDtBQUVBLFNBQU9KLE1BQVA7QUFDRCIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogTWlrb1BCWCBtdWx0aWxpbmd1YWwgaW50ZXJmYWNlIHRyYW5zbGF0aW9uIHN5c3RlbS5cbiAqIFxuICogVGhpcyBpbXBsZW1lbnRhdGlvbiBjb25zaXN0cyBvZiB0d28gbWFpbiBjb21wb25lbnRzOlxuICogMS4gZ2xvYmFsVHJhbnNsYXRlIC0gU2ltcGxlIHByb3h5IGZvciBkaXJlY3QgYWNjZXNzIHRvIHRyYW5zbGF0aW9ucyAoYmFja3dhcmQgY29tcGF0aWJsZSlcbiAqIDIuIGkxOG4gLSBBZHZhbmNlZCBmdW5jdGlvbiB3aXRoIHBhcmFtZXRlciBzdWJzdGl0dXRpb24gY2FwYWJpbGl0aWVzXG4gKiBcbiAqIEJBU0lDIFVTQUdFIChnbG9iYWxUcmFuc2xhdGUpOlxuICogUHJvdmlkZXMgZGlyZWN0IGFjY2VzcyB0byB0cmFuc2xhdGlvbiBzdHJpbmdzLiBUaGlzIGlzIGZ1bGx5IGJhY2t3YXJkIGNvbXBhdGlibGVcbiAqIHdpdGggYWxsIGV4aXN0aW5nIGNvZGUuXG4gKiBcbiAqIEBleGFtcGxlXG4gKiAvLyBEaXJlY3QgYWNjZXNzIGZvciBzaW1wbGUgdHJhbnNsYXRpb25zXG4gKiBnbG9iYWxUcmFuc2xhdGUuSmFudWFyeSAgICAgICAgICAgICAgICAgICAgIC8vIFJldHVybnMgXCLQr9C90LLQsNGA0YxcIlxuICogZ2xvYmFsVHJhbnNsYXRlWydleF9Va3JhaW5pYW4nXSAgICAgICAgICAgICAvLyBSZXR1cm5zIFwi0KPQutGA0LDRl9C90YHRjNC60LBcIlxuICogXG4gKiAvLyBVc2FnZSBpbiBleGlzdGluZyBVSSBjb21wb25lbnRzXG4gKiB7IHRpdGxlOiBnbG9iYWxUcmFuc2xhdGUuZXhfU2VhcmNoQnlFeHRlbnNpb24sIHZhbHVlOiAnbnVtYmVyOicgfVxuICogXG4gKiAvLyBJZiBubyB0cmFuc2xhdGlvbiBleGlzdHMsIHJldHVybnMgdGhlIGtleSBpdHNlbGZcbiAqIGdsb2JhbFRyYW5zbGF0ZS5Vbmtub3duS2V5ICAgICAgICAgICAgICAgICAgLy8gUmV0dXJucyBcIlVua25vd25LZXlcIlxuICogXG4gKiBBRFZBTkNFRCBVU0FHRSAoaTE4biBmdW5jdGlvbik6XG4gKiBQcm92aWRlcyBwYXJhbWV0ZXIgc3Vic3RpdHV0aW9uIGZvciBkeW5hbWljIG1lc3NhZ2VzIGxpa2Ugc3lzdGVtIG5vdGlmaWNhdGlvbnMsXG4gKiB3YXJuaW5ncywgYW5kIGFkdmljZSBtZXNzYWdlcy5cbiAqIFxuICogQGV4YW1wbGVcbiAqIC8vIFdpdGggcGFyYW1ldGVyIHN1YnN0aXR1dGlvbiBmb3IgZHluYW1pYyBtZXNzYWdlc1xuICogaTE4bignYWR2X0ZpcmV3YWxsRGlzYWJsZWQnKSAgICAgICAgICAgICAgICAvLyBSZXR1cm5zIFwiRmlyZXdhbGwgZGlzYWJsZWQgJXVybCVcIiAodGVtcGxhdGUpXG4gKiBpMThuKCdhZHZfRmlyZXdhbGxEaXNhYmxlZCcsIHsgICAgICAgICAgICAgIC8vIFJldHVybnMgXCJGaXJld2FsbCBkaXNhYmxlZCAvYWRtaW4tY2FiaW5ldC9maXJld2FsbC9pbmRleC9cIlxuICogICB1cmw6ICcvYWRtaW4tY2FiaW5ldC9maXJld2FsbC9pbmRleC8nXG4gKiB9KVxuICogXG4gKiAvLyBFeGFtcGxlIGZyb20gYWR2aWNlIHN5c3RlbVxuICogaTE4bih2YWx1ZS5tZXNzYWdlVHBsLCB2YWx1ZS5tZXNzYWdlUGFyYW1zKSAgLy8gRm9yIGR5bmFtaWMgc3lzdGVtIG1lc3NhZ2VzXG4gKiBcbiAqIC8vIElmIG5vIHRyYW5zbGF0aW9uIGV4aXN0cywgcmV0dXJucyB0aGUga2V5IGl0c2VsZiAod2l0aCBwYXJhbWV0ZXJzIGlmIHByb3ZpZGVkKVxuICogaTE4bignVW5rbm93bktleScpICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBSZXR1cm5zIFwiVW5rbm93bktleVwiXG4gKiBpMThuKCdVbmtub3duS2V5Jywge3BhcmFtOiAndGVzdCd9KSAgICAgICAgIC8vIFJldHVybnMgXCJVbmtub3duS2V5XCIgd2l0aCBwYXJhbWV0ZXIgcmVwbGFjZW1lbnRzIGlmIG5lZWRlZFxuICogXG4gKiBAbm90ZSBQbGFjZWhvbGRlcnMgaW4gdHJhbnNsYXRpb24gc3RyaW5ncyBtdXN0IGJlIGZvcm1hdHRlZCBhcyAlcGFyYW1OYW1lJVxuICovXG5cbi8vIEJhc2ljIHRyYW5zbGF0aW9uIHByb3h5IChiYWNrd2FyZCBjb21wYXRpYmxlKVxuZ2xvYmFsVHJhbnNsYXRlID0gbmV3IFByb3h5KGdsb2JhbFRyYW5zbGF0ZUFycmF5LCB7XG4gIGdldDogZnVuY3Rpb24odGFyZ2V0LCBwcm9wLCByZWNlaXZlcikge1xuICAgICAgLy8gQ2hlY2sgaWYgdGhlIHByb3BlcnR5IGV4aXN0cyBpbiB0aGUgdGFyZ2V0XG4gICAgICBpZiAocHJvcCBpbiB0YXJnZXQpIHtcbiAgICAgICAgICByZXR1cm4gdGFyZ2V0W3Byb3BdO1xuICAgICAgfVxuICAgICAgLy8gUmV0dXJuIHRoZSBrZXkgaXRzZWxmIGlmIG5vIHRyYW5zbGF0aW9uIGlzIGZvdW5kXG4gICAgICByZXR1cm4gcHJvcDtcbiAgfVxufSk7XG5cbi8qKlxuKiBBZHZhbmNlZCB0cmFuc2xhdGlvbiBmdW5jdGlvbiB3aXRoIHBhcmFtZXRlciBzdWJzdGl0dXRpb24uXG4qIFxuKiBAcGFyYW0ge3N0cmluZ30ga2V5IC0gVGhlIHRyYW5zbGF0aW9uIGtleSB0byBsb29rIHVwXG4qIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgLSBPcHRpb25hbCBvYmplY3Qgd2l0aCBwYXJhbWV0ZXJzIGZvciBzdWJzdGl0dXRpb25cbiogQHJldHVybnMge3N0cmluZ30gLSBUaGUgdHJhbnNsYXRlZCBzdHJpbmcgd2l0aCBwYXJhbWV0ZXIgc3Vic3RpdHV0aW9uXG4qL1xuZnVuY3Rpb24gaTE4bihrZXksIHBhcmFtcyA9IG51bGwpIHtcbiAgLy8gR2V0IHRoZSB0cmFuc2xhdGlvbiBvciB0aGUga2V5IGl0c2VsZiBpZiB0cmFuc2xhdGlvbiBkb2Vzbid0IGV4aXN0XG4gIGNvbnN0IHRyYW5zbGF0aW9uID0ga2V5IGluIGdsb2JhbFRyYW5zbGF0ZUFycmF5ID8gZ2xvYmFsVHJhbnNsYXRlQXJyYXlba2V5XSA6IGtleTtcbiAgXG4gIC8vIElmIG5vIHBhcmFtZXRlcnMgb3IgdHJhbnNsYXRpb24gZG9lc24ndCBoYXZlIHBsYWNlaG9sZGVycywgcmV0dXJuIG9yaWdpbmFsIHRyYW5zbGF0aW9uXG4gIGlmIChwYXJhbXMgPT09IG51bGwgfHwgdHlwZW9mIHBhcmFtcyAhPT0gJ29iamVjdCcgfHwgIXRyYW5zbGF0aW9uLmluY2x1ZGVzKCclJykpIHtcbiAgICAgIHJldHVybiB0cmFuc2xhdGlvbjtcbiAgfVxuICBcbiAgLy8gUmVwbGFjZSBhbGwgcGxhY2Vob2xkZXJzIHdpdGggY29ycmVzcG9uZGluZyB2YWx1ZXMgZnJvbSBwYXJhbXNcbiAgbGV0IHJlc3VsdCA9IHRyYW5zbGF0aW9uO1xuICBmb3IgKGxldCBwYXJhbUtleSBpbiBwYXJhbXMpIHtcbiAgICAgIGNvbnN0IHBsYWNlaG9sZGVyID0gYCUke3BhcmFtS2V5fSVgO1xuICAgICAgaWYgKHJlc3VsdC5pbmNsdWRlcyhwbGFjZWhvbGRlcikpIHtcbiAgICAgICAgICAvLyBDbGVhbiBwYXJhbWV0ZXIgdmFsdWUgZnJvbSBxdW90ZXMgYW5kIGVzY2FwaW5nXG4gICAgICAgICAgbGV0IHBhcmFtVmFsdWUgPSBwYXJhbXNbcGFyYW1LZXldO1xuICAgICAgICAgIGlmICh0eXBlb2YgcGFyYW1WYWx1ZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgLy8gUmVtb3ZlIHN1cnJvdW5kaW5nIHF1b3RlcyAoc2luZ2xlIG9yIGRvdWJsZSkgZmlyc3RcbiAgICAgICAgICAgICAgcGFyYW1WYWx1ZSA9IHBhcmFtVmFsdWUucmVwbGFjZSgvXlsnXCJdfFsnXCJdJC9nLCAnJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlc3VsdCA9IHJlc3VsdC5yZXBsYWNlKG5ldyBSZWdFeHAocGxhY2Vob2xkZXIsICdnJyksIHBhcmFtVmFsdWUpO1xuICAgICAgfVxuICB9XG4gIFxuICAvLyBSZW1vdmUgZXNjYXBpbmcgZnJvbSB0aGUgZmluYWwgcmVzdWx0IChQSFAgYWRkcyBcXCcgYW5kIFxcXCIgd2hlbiBjcmVhdGluZyBKUyBsb2NhbGl6YXRpb24gZmlsZSlcbiAgcmVzdWx0ID0gcmVzdWx0LnJlcGxhY2UoL1xcXFwnL2csIFwiJ1wiKS5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJyk7XG4gIFxuICByZXR1cm4gcmVzdWx0O1xufSJdfQ==