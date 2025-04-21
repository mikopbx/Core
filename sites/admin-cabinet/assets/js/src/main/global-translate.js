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
      var translation = target[prop];
      
      // For lists of months and other arrays used in the calendar configuration,
      // return strings directly
      if (['months', 'monthsShort', 'days', 'January', 'February', 'March', 'April', 'May', 
           'June', 'July', 'August', 'September', 'October', 'November', 'December',
           'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
           'ShortDaySunday', 'ShortDayMonday', 'ShortDayTuesday', 'ShortDayWednesday', 
           'ShortDayThursday', 'ShortDayFriday', 'ShortDaySaturday', 
           'Today', 'Now'].includes(prop)) {
        return translation;
      }

      // Create a function that handles parameter substitution
      var translationFn = function translationFn() {
        var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        // If no parameters or translation doesn't have placeholders, return original translation
        if (arguments.length === 0 || !translation.includes('%')) {
          return translation;
        }

        // Replace all placeholders with corresponding values from params
        var result = translation;
        for (var key in params) {
          result = result.replace("%".concat(key, "%"), params[key]);
        }
        return result;
      };

      // Make the function also behave like a string when not called as a function
      translationFn.toString = function () {
        return translation;
      };

      return translationFn;
    }

    // For missing translations, return a similar function that returns the key
    var missingFn = function missingFn() {
      return prop;
    };

    missingFn.toString = function () {
      return prop;
    };

    return missingFn;
  }
});