"use strict";

/**
 * Enhanced translation proxy for MikoPBX multilingual interface.
 * 
 * This mechanism provides localized strings with support for parameter substitution
 * which is particularly useful for dynamic messages like system notifications,
 * warnings, and advice messages.
 * 
 * The proxy supports two usage patterns:
 * 1. Direct access (backward compatible): globalTranslate.keyName
 * 2. Parameter substitution: globalTranslate.keyName({ param1: 'value1', param2: 'value2' })
 * 
 * For translation strings containing placeholders like '%url%', the proxy returns
 * a function that accepts an object with parameter values for substitution.
 * 
 * @example
 * // Direct access for simple translations
 * globalTranslate.January                     // Returns "Январь"
 * globalTranslate['ex_Ukrainian']             // Returns "Українська"
 * 
 * // With parameter substitution for dynamic messages
 * globalTranslate.adv_FirewallDisabled        // Returns "Firewall disabled %url%" (template)
 * globalTranslate.adv_FirewallDisabled({      // Returns "Firewall disabled /admin-cabinet/firewall/index/"
 *   url: '/admin-cabinet/firewall/index/'
 * })
 * 
 * // Example from advice system
 * globalTranslate[value.messageTpl](value.messageParams)  // For dynamic system messages
 * 
 * // If no translation exists, returns the key itself
 * globalTranslate.UnknownKey                  // Returns "UnknownKey"
 * 
 * @note Place this proxy implementation after your globalTranslateArray definition
 * @note Placeholders in translation strings must be formatted as %paramName%
 */
globalTranslate = new Proxy(globalTranslateArray, {
  get: function get(target, prop, receiver) {
    // Check if the property exists in the translation array
    if (prop in target) {
      // Get the translation string
      var translation = target[prop]; // Create a function that handles parameter substitution

      var translationFn = function translationFn() {
        var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        // If no parameters or translation doesn't have placeholders, return original translation
        if (arguments.length === 0 || !translation.includes('%')) {
          return translation;
        } // Replace all placeholders with corresponding values from params


        var result = translation;

        for (var key in params) {
          result = result.replace("%".concat(key, "%"), params[key]);
        }

        return result;
      }; // Make the function also behave like a string when not called as a function


      translationFn.toString = function () {
        return translation;
      };

      return translationFn;
    } // For missing translations, return a similar function that returns the key


    var missingFn = function missingFn() {
      return prop;
    };

    missingFn.toString = function () {
      return prop;
    };

    return missingFn;
  }
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2dsb2JhbC10cmFuc2xhdGUuanMiXSwibmFtZXMiOlsiZ2xvYmFsVHJhbnNsYXRlIiwiUHJveHkiLCJnbG9iYWxUcmFuc2xhdGVBcnJheSIsImdldCIsInRhcmdldCIsInByb3AiLCJyZWNlaXZlciIsInRyYW5zbGF0aW9uIiwidHJhbnNsYXRpb25GbiIsInBhcmFtcyIsImFyZ3VtZW50cyIsImxlbmd0aCIsImluY2x1ZGVzIiwicmVzdWx0Iiwia2V5IiwicmVwbGFjZSIsInRvU3RyaW5nIiwibWlzc2luZ0ZuIl0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUFBLGVBQWUsR0FBRyxJQUFJQyxLQUFKLENBQVVDLG9CQUFWLEVBQWdDO0FBQzlDQyxFQUFBQSxHQUFHLEVBQUUsYUFBU0MsTUFBVCxFQUFpQkMsSUFBakIsRUFBdUJDLFFBQXZCLEVBQWlDO0FBQ3BDO0FBQ0EsUUFBSUQsSUFBSSxJQUFJRCxNQUFaLEVBQW9CO0FBQ2xCO0FBQ0EsVUFBSUcsV0FBVyxHQUFHSCxNQUFNLENBQUNDLElBQUQsQ0FBeEIsQ0FGa0IsQ0FJbEI7O0FBQ0EsVUFBTUcsYUFBYSxHQUFHLFNBQWhCQSxhQUFnQixHQUFzQjtBQUFBLFlBQWJDLE1BQWEsdUVBQUosRUFBSTs7QUFDMUM7QUFDQSxZQUFJQyxTQUFTLENBQUNDLE1BQVYsS0FBcUIsQ0FBckIsSUFBMEIsQ0FBQ0osV0FBVyxDQUFDSyxRQUFaLENBQXFCLEdBQXJCLENBQS9CLEVBQTBEO0FBQ3hELGlCQUFPTCxXQUFQO0FBQ0QsU0FKeUMsQ0FNMUM7OztBQUNBLFlBQUlNLE1BQU0sR0FBR04sV0FBYjs7QUFDQSxhQUFLLElBQUlPLEdBQVQsSUFBZ0JMLE1BQWhCLEVBQXdCO0FBQ3RCSSxVQUFBQSxNQUFNLEdBQUdBLE1BQU0sQ0FBQ0UsT0FBUCxZQUFtQkQsR0FBbkIsUUFBMkJMLE1BQU0sQ0FBQ0ssR0FBRCxDQUFqQyxDQUFUO0FBQ0Q7O0FBQ0QsZUFBT0QsTUFBUDtBQUNELE9BWkQsQ0FMa0IsQ0FtQmxCOzs7QUFDQUwsTUFBQUEsYUFBYSxDQUFDUSxRQUFkLEdBQXlCLFlBQVc7QUFDbEMsZUFBT1QsV0FBUDtBQUNELE9BRkQ7O0FBSUEsYUFBT0MsYUFBUDtBQUNELEtBM0JtQyxDQTZCcEM7OztBQUNBLFFBQU1TLFNBQVMsR0FBRyxTQUFaQSxTQUFZLEdBQVc7QUFDM0IsYUFBT1osSUFBUDtBQUNELEtBRkQ7O0FBR0FZLElBQUFBLFNBQVMsQ0FBQ0QsUUFBVixHQUFxQixZQUFXO0FBQzlCLGFBQU9YLElBQVA7QUFDRCxLQUZEOztBQUlBLFdBQU9ZLFNBQVA7QUFDRDtBQXZDNkMsQ0FBaEMsQ0FBbEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEVuaGFuY2VkIHRyYW5zbGF0aW9uIHByb3h5IGZvciBNaWtvUEJYIG11bHRpbGluZ3VhbCBpbnRlcmZhY2UuXG4gKiBcbiAqIFRoaXMgbWVjaGFuaXNtIHByb3ZpZGVzIGxvY2FsaXplZCBzdHJpbmdzIHdpdGggc3VwcG9ydCBmb3IgcGFyYW1ldGVyIHN1YnN0aXR1dGlvblxuICogd2hpY2ggaXMgcGFydGljdWxhcmx5IHVzZWZ1bCBmb3IgZHluYW1pYyBtZXNzYWdlcyBsaWtlIHN5c3RlbSBub3RpZmljYXRpb25zLFxuICogd2FybmluZ3MsIGFuZCBhZHZpY2UgbWVzc2FnZXMuXG4gKiBcbiAqIFRoZSBwcm94eSBzdXBwb3J0cyB0d28gdXNhZ2UgcGF0dGVybnM6XG4gKiAxLiBEaXJlY3QgYWNjZXNzIChiYWNrd2FyZCBjb21wYXRpYmxlKTogZ2xvYmFsVHJhbnNsYXRlLmtleU5hbWVcbiAqIDIuIFBhcmFtZXRlciBzdWJzdGl0dXRpb246IGdsb2JhbFRyYW5zbGF0ZS5rZXlOYW1lKHsgcGFyYW0xOiAndmFsdWUxJywgcGFyYW0yOiAndmFsdWUyJyB9KVxuICogXG4gKiBGb3IgdHJhbnNsYXRpb24gc3RyaW5ncyBjb250YWluaW5nIHBsYWNlaG9sZGVycyBsaWtlICcldXJsJScsIHRoZSBwcm94eSByZXR1cm5zXG4gKiBhIGZ1bmN0aW9uIHRoYXQgYWNjZXB0cyBhbiBvYmplY3Qgd2l0aCBwYXJhbWV0ZXIgdmFsdWVzIGZvciBzdWJzdGl0dXRpb24uXG4gKiBcbiAqIEBleGFtcGxlXG4gKiAvLyBEaXJlY3QgYWNjZXNzIGZvciBzaW1wbGUgdHJhbnNsYXRpb25zXG4gKiBnbG9iYWxUcmFuc2xhdGUuSmFudWFyeSAgICAgICAgICAgICAgICAgICAgIC8vIFJldHVybnMgXCLQr9C90LLQsNGA0YxcIlxuICogZ2xvYmFsVHJhbnNsYXRlWydleF9Va3JhaW5pYW4nXSAgICAgICAgICAgICAvLyBSZXR1cm5zIFwi0KPQutGA0LDRl9C90YHRjNC60LBcIlxuICogXG4gKiAvLyBXaXRoIHBhcmFtZXRlciBzdWJzdGl0dXRpb24gZm9yIGR5bmFtaWMgbWVzc2FnZXNcbiAqIGdsb2JhbFRyYW5zbGF0ZS5hZHZfRmlyZXdhbGxEaXNhYmxlZCAgICAgICAgLy8gUmV0dXJucyBcIkZpcmV3YWxsIGRpc2FibGVkICV1cmwlXCIgKHRlbXBsYXRlKVxuICogZ2xvYmFsVHJhbnNsYXRlLmFkdl9GaXJld2FsbERpc2FibGVkKHsgICAgICAvLyBSZXR1cm5zIFwiRmlyZXdhbGwgZGlzYWJsZWQgL2FkbWluLWNhYmluZXQvZmlyZXdhbGwvaW5kZXgvXCJcbiAqICAgdXJsOiAnL2FkbWluLWNhYmluZXQvZmlyZXdhbGwvaW5kZXgvJ1xuICogfSlcbiAqIFxuICogLy8gRXhhbXBsZSBmcm9tIGFkdmljZSBzeXN0ZW1cbiAqIGdsb2JhbFRyYW5zbGF0ZVt2YWx1ZS5tZXNzYWdlVHBsXSh2YWx1ZS5tZXNzYWdlUGFyYW1zKSAgLy8gRm9yIGR5bmFtaWMgc3lzdGVtIG1lc3NhZ2VzXG4gKiBcbiAqIC8vIElmIG5vIHRyYW5zbGF0aW9uIGV4aXN0cywgcmV0dXJucyB0aGUga2V5IGl0c2VsZlxuICogZ2xvYmFsVHJhbnNsYXRlLlVua25vd25LZXkgICAgICAgICAgICAgICAgICAvLyBSZXR1cm5zIFwiVW5rbm93bktleVwiXG4gKiBcbiAqIEBub3RlIFBsYWNlIHRoaXMgcHJveHkgaW1wbGVtZW50YXRpb24gYWZ0ZXIgeW91ciBnbG9iYWxUcmFuc2xhdGVBcnJheSBkZWZpbml0aW9uXG4gKiBAbm90ZSBQbGFjZWhvbGRlcnMgaW4gdHJhbnNsYXRpb24gc3RyaW5ncyBtdXN0IGJlIGZvcm1hdHRlZCBhcyAlcGFyYW1OYW1lJVxuICovXG4gICAgICAgICAgICAgICAgXG5nbG9iYWxUcmFuc2xhdGUgPSBuZXcgUHJveHkoZ2xvYmFsVHJhbnNsYXRlQXJyYXksIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKHRhcmdldCwgcHJvcCwgcmVjZWl2ZXIpIHtcbiAgICAgIC8vIENoZWNrIGlmIHRoZSBwcm9wZXJ0eSBleGlzdHMgaW4gdGhlIHRyYW5zbGF0aW9uIGFycmF5XG4gICAgICBpZiAocHJvcCBpbiB0YXJnZXQpIHtcbiAgICAgICAgLy8gR2V0IHRoZSB0cmFuc2xhdGlvbiBzdHJpbmdcbiAgICAgICAgbGV0IHRyYW5zbGF0aW9uID0gdGFyZ2V0W3Byb3BdO1xuICAgICAgICBcbiAgICAgICAgLy8gQ3JlYXRlIGEgZnVuY3Rpb24gdGhhdCBoYW5kbGVzIHBhcmFtZXRlciBzdWJzdGl0dXRpb25cbiAgICAgICAgY29uc3QgdHJhbnNsYXRpb25GbiA9IGZ1bmN0aW9uKHBhcmFtcyA9IHt9KSB7XG4gICAgICAgICAgLy8gSWYgbm8gcGFyYW1ldGVycyBvciB0cmFuc2xhdGlvbiBkb2Vzbid0IGhhdmUgcGxhY2Vob2xkZXJzLCByZXR1cm4gb3JpZ2luYWwgdHJhbnNsYXRpb25cbiAgICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCB8fCAhdHJhbnNsYXRpb24uaW5jbHVkZXMoJyUnKSkge1xuICAgICAgICAgICAgcmV0dXJuIHRyYW5zbGF0aW9uO1xuICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgICAvLyBSZXBsYWNlIGFsbCBwbGFjZWhvbGRlcnMgd2l0aCBjb3JyZXNwb25kaW5nIHZhbHVlcyBmcm9tIHBhcmFtc1xuICAgICAgICAgIGxldCByZXN1bHQgPSB0cmFuc2xhdGlvbjtcbiAgICAgICAgICBmb3IgKGxldCBrZXkgaW4gcGFyYW1zKSB7XG4gICAgICAgICAgICByZXN1bHQgPSByZXN1bHQucmVwbGFjZShgJSR7a2V5fSVgLCBwYXJhbXNba2V5XSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBNYWtlIHRoZSBmdW5jdGlvbiBhbHNvIGJlaGF2ZSBsaWtlIGEgc3RyaW5nIHdoZW4gbm90IGNhbGxlZCBhcyBhIGZ1bmN0aW9uXG4gICAgICAgIHRyYW5zbGF0aW9uRm4udG9TdHJpbmcgPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICByZXR1cm4gdHJhbnNsYXRpb247XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gdHJhbnNsYXRpb25GbjtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gRm9yIG1pc3NpbmcgdHJhbnNsYXRpb25zLCByZXR1cm4gYSBzaW1pbGFyIGZ1bmN0aW9uIHRoYXQgcmV0dXJucyB0aGUga2V5XG4gICAgICBjb25zdCBtaXNzaW5nRm4gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHByb3A7XG4gICAgICB9O1xuICAgICAgbWlzc2luZ0ZuLnRvU3RyaW5nID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBwcm9wO1xuICAgICAgfTtcbiAgICAgIFxuICAgICAgcmV0dXJuIG1pc3NpbmdGbjtcbiAgICB9XG4gIH0pOyJdfQ==