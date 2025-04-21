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
      var translation = target[prop]; // For lists of months and other arrays used in the calendar configuration,
      // return strings directly

      if (['months', 'monthsShort', 'days', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'ShortDaySunday', 'ShortDayMonday', 'ShortDayTuesday', 'ShortDayWednesday', 'ShortDayThursday', 'ShortDayFriday', 'ShortDaySaturday', 'Today', 'Now'].includes(prop)) {
        return translation;
      } // Create a function that handles parameter substitution


      var translationFn = function translationFn() {
        var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {}; // If no parameters or translation doesn't have placeholders, return original translation

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2dsb2JhbC10cmFuc2xhdGUuanMiXSwibmFtZXMiOlsiZ2xvYmFsVHJhbnNsYXRlIiwiUHJveHkiLCJnbG9iYWxUcmFuc2xhdGVBcnJheSIsImdldCIsInRhcmdldCIsInByb3AiLCJyZWNlaXZlciIsInRyYW5zbGF0aW9uIiwiaW5jbHVkZXMiLCJ0cmFuc2xhdGlvbkZuIiwicGFyYW1zIiwiYXJndW1lbnRzIiwibGVuZ3RoIiwidW5kZWZpbmVkIiwicmVzdWx0Iiwia2V5IiwicmVwbGFjZSIsImNvbmNhdCIsInRvU3RyaW5nIiwibWlzc2luZ0ZuIl0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBRUFBLGVBQWUsR0FBRyxJQUFJQyxLQUFKLENBQVVDLG9CQUFWLEVBQWdDO0FBQ2hEQyxFQUFBQSxHQUFHLEVBQUUsU0FBU0EsR0FBVCxDQUFhQyxNQUFiLEVBQXFCQyxJQUFyQixFQUEyQkMsUUFBM0IsRUFBcUM7QUFDeEM7QUFDQSxRQUFJRCxJQUFJLElBQUlELE1BQVosRUFBb0I7QUFDbEI7QUFDQSxVQUFJRyxXQUFXLEdBQUdILE1BQU0sQ0FBQ0MsSUFBRCxDQUF4QixDQUZrQixDQUlsQjtBQUNBOztBQUNBLFVBQUksQ0FBQyxRQUFELEVBQVcsYUFBWCxFQUEwQixNQUExQixFQUFrQyxTQUFsQyxFQUE2QyxVQUE3QyxFQUF5RCxPQUF6RCxFQUFrRSxPQUFsRSxFQUEyRSxLQUEzRSxFQUNDLE1BREQsRUFDUyxNQURULEVBQ2lCLFFBRGpCLEVBQzJCLFdBRDNCLEVBQ3dDLFNBRHhDLEVBQ21ELFVBRG5ELEVBQytELFVBRC9ELEVBRUMsS0FGRCxFQUVRLEtBRlIsRUFFZSxLQUZmLEVBRXNCLEtBRnRCLEVBRTZCLEtBRjdCLEVBRW9DLEtBRnBDLEVBRTJDLEtBRjNDLEVBRWtELEtBRmxELEVBRXlELEtBRnpELEVBRWdFLEtBRmhFLEVBRXVFLEtBRnZFLEVBRThFLEtBRjlFLEVBR0MsZ0JBSEQsRUFHbUIsZ0JBSG5CLEVBR3FDLGlCQUhyQyxFQUd3RCxtQkFIeEQsRUFJQyxrQkFKRCxFQUlxQixnQkFKckIsRUFJdUMsa0JBSnZDLEVBS0MsT0FMRCxFQUtVLEtBTFYsRUFLaUJHLFFBTGpCLENBSzBCSCxJQUwxQixDQUFKLEVBS3FDO0FBQ25DLGVBQU9FLFdBQVA7QUFDRCxPQWJpQixDQWVsQjs7O0FBQ0EsVUFBSUUsYUFBYSxHQUFHLFNBQVNBLGFBQVQsR0FBeUI7QUFDM0MsWUFBSUMsTUFBTSxHQUFHQyxTQUFTLENBQUNDLE1BQVYsR0FBbUIsQ0FBbkIsSUFBd0JELFNBQVMsQ0FBQyxDQUFELENBQVQsS0FBaUJFLFNBQXpDLEdBQXFERixTQUFTLENBQUMsQ0FBRCxDQUE5RCxHQUFvRSxFQUFqRixDQUQyQyxDQUczQzs7QUFDQSxZQUFJQSxTQUFTLENBQUNDLE1BQVYsS0FBcUIsQ0FBckIsSUFBMEIsQ0FBQ0wsV0FBVyxDQUFDQyxRQUFaLENBQXFCLEdBQXJCLENBQS9CLEVBQTBEO0FBQ3hELGlCQUFPRCxXQUFQO0FBQ0QsU0FOMEMsQ0FRM0M7OztBQUNBLFlBQUlPLE1BQU0sR0FBR1AsV0FBYjs7QUFDQSxhQUFLLElBQUlRLEdBQVQsSUFBZ0JMLE1BQWhCLEVBQXdCO0FBQ3RCSSxVQUFBQSxNQUFNLEdBQUdBLE1BQU0sQ0FBQ0UsT0FBUCxDQUFlLElBQUlDLE1BQUosQ0FBV0YsR0FBWCxFQUFnQixHQUFoQixDQUFmLEVBQXFDTCxNQUFNLENBQUNLLEdBQUQsQ0FBM0MsQ0FBVDtBQUNEOztBQUNELGVBQU9ELE1BQVA7QUFDRCxPQWRELENBaEJrQixDQWdDbEI7OztBQUNBTCxNQUFBQSxhQUFhLENBQUNTLFFBQWQsR0FBeUIsWUFBWTtBQUNuQyxlQUFPWCxXQUFQO0FBQ0QsT0FGRDs7QUFJQSxhQUFPRSxhQUFQO0FBQ0QsS0F4Q3VDLENBMEN4Qzs7O0FBQ0EsUUFBSVUsU0FBUyxHQUFHLFNBQVNBLFNBQVQsR0FBcUI7QUFDbkMsYUFBT2QsSUFBUDtBQUNELEtBRkQ7O0FBSUFjLElBQUFBLFNBQVMsQ0FBQ0QsUUFBVixHQUFxQixZQUFZO0FBQy9CLGFBQU9iLElBQVA7QUFDRCxLQUZEOztBQUlBLFdBQU9jLFNBQVA7QUFDRDtBQXJEK0MsQ0FBaEMsQ0FBbEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEVuaGFuY2VkIHRyYW5zbGF0aW9uIHByb3h5IGZvciBNaWtvUEJYIG11bHRpbGluZ3VhbCBpbnRlcmZhY2UuXG4gKiBcbiAqIFRoaXMgbWVjaGFuaXNtIHByb3ZpZGVzIGxvY2FsaXplZCBzdHJpbmdzIHdpdGggc3VwcG9ydCBmb3IgcGFyYW1ldGVyIHN1YnN0aXR1dGlvblxuICogd2hpY2ggaXMgcGFydGljdWxhcmx5IHVzZWZ1bCBmb3IgZHluYW1pYyBtZXNzYWdlcyBsaWtlIHN5c3RlbSBub3RpZmljYXRpb25zLFxuICogd2FybmluZ3MsIGFuZCBhZHZpY2UgbWVzc2FnZXMuXG4gKiBcbiAqIFRoZSBwcm94eSBzdXBwb3J0cyB0d28gdXNhZ2UgcGF0dGVybnM6XG4gKiAxLiBEaXJlY3QgYWNjZXNzIChiYWNrd2FyZCBjb21wYXRpYmxlKTogZ2xvYmFsVHJhbnNsYXRlLmtleU5hbWVcbiAqIDIuIFBhcmFtZXRlciBzdWJzdGl0dXRpb246IGdsb2JhbFRyYW5zbGF0ZS5rZXlOYW1lKHsgcGFyYW0xOiAndmFsdWUxJywgcGFyYW0yOiAndmFsdWUyJyB9KVxuICogXG4gKiBGb3IgdHJhbnNsYXRpb24gc3RyaW5ncyBjb250YWluaW5nIHBsYWNlaG9sZGVycyBsaWtlICcldXJsJScsIHRoZSBwcm94eSByZXR1cm5zXG4gKiBhIGZ1bmN0aW9uIHRoYXQgYWNjZXB0cyBhbiBvYmplY3Qgd2l0aCBwYXJhbWV0ZXIgdmFsdWVzIGZvciBzdWJzdGl0dXRpb24uXG4gKiBcbiAqIEBleGFtcGxlXG4gKiAvLyBEaXJlY3QgYWNjZXNzIGZvciBzaW1wbGUgdHJhbnNsYXRpb25zXG4gKiBnbG9iYWxUcmFuc2xhdGUuSmFudWFyeSAgICAgICAgICAgICAgICAgICAgIC8vIFJldHVybnMgXCLQr9C90LLQsNGA0YxcIlxuICogZ2xvYmFsVHJhbnNsYXRlWydleF9Va3JhaW5pYW4nXSAgICAgICAgICAgICAvLyBSZXR1cm5zIFwi0KPQutGA0LDRl9C90YHRjNC60LBcIlxuICogXG4gKiAvLyBXaXRoIHBhcmFtZXRlciBzdWJzdGl0dXRpb24gZm9yIGR5bmFtaWMgbWVzc2FnZXNcbiAqIGdsb2JhbFRyYW5zbGF0ZS5hZHZfRmlyZXdhbGxEaXNhYmxlZCAgICAgICAgLy8gUmV0dXJucyBcIkZpcmV3YWxsIGRpc2FibGVkICV1cmwlXCIgKHRlbXBsYXRlKVxuICogZ2xvYmFsVHJhbnNsYXRlLmFkdl9GaXJld2FsbERpc2FibGVkKHsgICAgICAvLyBSZXR1cm5zIFwiRmlyZXdhbGwgZGlzYWJsZWQgL2FkbWluLWNhYmluZXQvZmlyZXdhbGwvaW5kZXgvXCJcbiAqICAgdXJsOiAnL2FkbWluLWNhYmluZXQvZmlyZXdhbGwvaW5kZXgvJ1xuICogfSlcbiAqIFxuICogLy8gRXhhbXBsZSBmcm9tIGFkdmljZSBzeXN0ZW1cbiAqIGdsb2JhbFRyYW5zbGF0ZVt2YWx1ZS5tZXNzYWdlVHBsXSh2YWx1ZS5tZXNzYWdlUGFyYW1zKSAgLy8gRm9yIGR5bmFtaWMgc3lzdGVtIG1lc3NhZ2VzXG4gKiBcbiAqIC8vIElmIG5vIHRyYW5zbGF0aW9uIGV4aXN0cywgcmV0dXJucyB0aGUga2V5IGl0c2VsZlxuICogZ2xvYmFsVHJhbnNsYXRlLlVua25vd25LZXkgICAgICAgICAgICAgICAgICAvLyBSZXR1cm5zIFwiVW5rbm93bktleVwiXG4gKiBcbiAqIEBub3RlIFBsYWNlIHRoaXMgcHJveHkgaW1wbGVtZW50YXRpb24gYWZ0ZXIgeW91ciBnbG9iYWxUcmFuc2xhdGVBcnJheSBkZWZpbml0aW9uXG4gKiBAbm90ZSBQbGFjZWhvbGRlcnMgaW4gdHJhbnNsYXRpb24gc3RyaW5ncyBtdXN0IGJlIGZvcm1hdHRlZCBhcyAlcGFyYW1OYW1lJVxuICovXG4gICAgICAgICAgICAgICAgXG5nbG9iYWxUcmFuc2xhdGUgPSBuZXcgUHJveHkoZ2xvYmFsVHJhbnNsYXRlQXJyYXksIHtcbiAgZ2V0OiBmdW5jdGlvbiBnZXQodGFyZ2V0LCBwcm9wLCByZWNlaXZlcikge1xuICAgIC8vIENoZWNrIGlmIHRoZSBwcm9wZXJ0eSBleGlzdHMgaW4gdGhlIHRyYW5zbGF0aW9uIGFycmF5XG4gICAgaWYgKHByb3AgaW4gdGFyZ2V0KSB7XG4gICAgICAvLyBHZXQgdGhlIHRyYW5zbGF0aW9uIHN0cmluZ1xuICAgICAgdmFyIHRyYW5zbGF0aW9uID0gdGFyZ2V0W3Byb3BdO1xuICAgICAgXG4gICAgICAvLyBGb3IgbGlzdHMgb2YgbW9udGhzIGFuZCBvdGhlciBhcnJheXMgdXNlZCBpbiB0aGUgY2FsZW5kYXIgY29uZmlndXJhdGlvbixcbiAgICAgIC8vIHJldHVybiBzdHJpbmdzIGRpcmVjdGx5XG4gICAgICBpZiAoWydtb250aHMnLCAnbW9udGhzU2hvcnQnLCAnZGF5cycsICdKYW51YXJ5JywgJ0ZlYnJ1YXJ5JywgJ01hcmNoJywgJ0FwcmlsJywgJ01heScsIFxuICAgICAgICAgICAnSnVuZScsICdKdWx5JywgJ0F1Z3VzdCcsICdTZXB0ZW1iZXInLCAnT2N0b2JlcicsICdOb3ZlbWJlcicsICdEZWNlbWJlcicsXG4gICAgICAgICAgICdKYW4nLCAnRmViJywgJ01hcicsICdBcHInLCAnTWF5JywgJ0p1bicsICdKdWwnLCAnQXVnJywgJ1NlcCcsICdPY3QnLCAnTm92JywgJ0RlYycsXG4gICAgICAgICAgICdTaG9ydERheVN1bmRheScsICdTaG9ydERheU1vbmRheScsICdTaG9ydERheVR1ZXNkYXknLCAnU2hvcnREYXlXZWRuZXNkYXknLCBcbiAgICAgICAgICAgJ1Nob3J0RGF5VGh1cnNkYXknLCAnU2hvcnREYXlGcmlkYXknLCAnU2hvcnREYXlTYXR1cmRheScsIFxuICAgICAgICAgICAnVG9kYXknLCAnTm93J10uaW5jbHVkZXMocHJvcCkpIHtcbiAgICAgICAgcmV0dXJuIHRyYW5zbGF0aW9uO1xuICAgICAgfVxuXG4gICAgICAvLyBDcmVhdGUgYSBmdW5jdGlvbiB0aGF0IGhhbmRsZXMgcGFyYW1ldGVyIHN1YnN0aXR1dGlvblxuICAgICAgdmFyIHRyYW5zbGF0aW9uRm4gPSBmdW5jdGlvbiB0cmFuc2xhdGlvbkZuKCkge1xuICAgICAgICB2YXIgcGFyYW1zID0gYXJndW1lbnRzLmxlbmd0aCA+IDAgJiYgYXJndW1lbnRzWzBdICE9PSB1bmRlZmluZWQgPyBhcmd1bWVudHNbMF0gOiB7fTtcblxuICAgICAgICAvLyBJZiBubyBwYXJhbWV0ZXJzIG9yIHRyYW5zbGF0aW9uIGRvZXNuJ3QgaGF2ZSBwbGFjZWhvbGRlcnMsIHJldHVybiBvcmlnaW5hbCB0cmFuc2xhdGlvblxuICAgICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCB8fCAhdHJhbnNsYXRpb24uaW5jbHVkZXMoJyUnKSkge1xuICAgICAgICAgIHJldHVybiB0cmFuc2xhdGlvbjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlcGxhY2UgYWxsIHBsYWNlaG9sZGVycyB3aXRoIGNvcnJlc3BvbmRpbmcgdmFsdWVzIGZyb20gcGFyYW1zXG4gICAgICAgIHZhciByZXN1bHQgPSB0cmFuc2xhdGlvbjtcbiAgICAgICAgZm9yICh2YXIga2V5IGluIHBhcmFtcykge1xuICAgICAgICAgIHJlc3VsdCA9IHJlc3VsdC5yZXBsYWNlKFwiJVwiLmNvbmNhdChrZXksIFwiJVwiKSwgcGFyYW1zW2tleV0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICB9O1xuXG4gICAgICAvLyBNYWtlIHRoZSBmdW5jdGlvbiBhbHNvIGJlaGF2ZSBsaWtlIGEgc3RyaW5nIHdoZW4gbm90IGNhbGxlZCBhcyBhIGZ1bmN0aW9uXG4gICAgICB0cmFuc2xhdGlvbkZuLnRvU3RyaW5nID0gZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gdHJhbnNsYXRpb247XG4gICAgICB9O1xuXG4gICAgICByZXR1cm4gdHJhbnNsYXRpb25GbjtcbiAgICB9XG5cbiAgICAvLyBGb3IgbWlzc2luZyB0cmFuc2xhdGlvbnMsIHJldHVybiBhIHNpbWlsYXIgZnVuY3Rpb24gdGhhdCByZXR1cm5zIHRoZSBrZXlcbiAgICB2YXIgbWlzc2luZ0ZuID0gZnVuY3Rpb24gbWlzc2luZ0ZuKCkge1xuICAgICAgcmV0dXJuIHByb3A7XG4gICAgfTtcblxuICAgIG1pc3NpbmdGbi50b1N0cmluZyA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIHJldHVybiBwcm9wO1xuICAgIH07XG5cbiAgICByZXR1cm4gbWlzc2luZ0ZuO1xuICB9XG59KTsiXX0=