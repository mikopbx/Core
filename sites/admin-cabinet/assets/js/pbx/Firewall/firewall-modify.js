"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

/* global globalRootUrl,globalTranslate, Form */

/**
 * The firewall object contains methods and variables for managing the Firewall form
 *
 * @module firewall
 */
var firewall = {
  /**
   * jQuery object for the form.
   * @type {jQuery}
   */
  $formObj: $('#firewall-form'),

  /**
   * Validation rules for the form fields before submission.
   *
   * @type {object}
   */
  validateRules: {
    network: {
      identifier: 'network',
      rules: [{
        type: 'ipaddr',
        prompt: globalTranslate.fw_ValidatePermitAddress
      }]
    },
    description: {
      identifier: 'description',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.fw_ValidateRuleName
      }]
    }
  },
  // Initialization function to set up form behavior
  initialize: function initialize() {
    $('#firewall-form .rules,#firewall-form .checkbox').checkbox();
    $('#firewall-form .dropdown').dropdown();
    firewall.initializeForm();
  },

  /**
   * Callback function to be called before the form is sent
   * @param {Object} settings - The current settings of the form
   * @returns {Object} - The updated settings of the form
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    var result = settings;
    result.data = firewall.$formObj.form('get values');
    return result;
  },

  /**
   * Callback function to be called after the form has been sent.
   * @param {Object} response - The response from the server after the form is sent
   */
  cbAfterSendForm: function cbAfterSendForm(response) {},

  /**
   * Initialize the form with custom settings
   */
  initializeForm: function initializeForm() {
    Form.$formObj = firewall.$formObj;
    Form.url = "".concat(globalRootUrl, "firewall/save"); // Form submission URL

    Form.validateRules = firewall.validateRules; // Form validation rules

    Form.cbBeforeSendForm = firewall.cbBeforeSendForm; // Callback before form is sent

    Form.cbAfterSendForm = firewall.cbAfterSendForm; // Callback after form is sent

    Form.initialize();
  }
}; // Custom form validation rule to check if a string is a valid IP address

$.fn.form.settings.rules.ipaddr = function (value) {
  var result = true;
  var f = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);

  if (f === null) {
    result = false;
  } else {
    for (var i = 1; i < 5; i += 1) {
      var a = f[i];

      if (a > 255) {
        result = false;
      }
    }

    if (f[5] > 32) {
      result = false;
    }
  }

  return result;
}; // Initialize the firewall form when the document is ready


$(document).ready(function () {
  firewall.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9GaXJld2FsbC9maXJld2FsbC1tb2RpZnkuanMiXSwibmFtZXMiOlsiZmlyZXdhbGwiLCIkZm9ybU9iaiIsIiQiLCJ2YWxpZGF0ZVJ1bGVzIiwibmV0d29yayIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJmd19WYWxpZGF0ZVBlcm1pdEFkZHJlc3MiLCJkZXNjcmlwdGlvbiIsImZ3X1ZhbGlkYXRlUnVsZU5hbWUiLCJpbml0aWFsaXplIiwiY2hlY2tib3giLCJkcm9wZG93biIsImluaXRpYWxpemVGb3JtIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwicmVzdWx0IiwiZGF0YSIsImZvcm0iLCJjYkFmdGVyU2VuZEZvcm0iLCJyZXNwb25zZSIsIkZvcm0iLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwiZm4iLCJpcGFkZHIiLCJ2YWx1ZSIsImYiLCJtYXRjaCIsImkiLCJhIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxRQUFRLEdBQUc7QUFDYjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxnQkFBRCxDQUxFOztBQU9iO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLE9BQU8sRUFBRTtBQUNMQyxNQUFBQSxVQUFVLEVBQUUsU0FEUDtBQUVMQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsUUFEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0M7QUFGNUIsT0FERztBQUZGLEtBREU7QUFVWEMsSUFBQUEsV0FBVyxFQUFFO0FBQ1ROLE1BQUFBLFVBQVUsRUFBRSxhQURIO0FBRVRDLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FBQ0lDLFFBQUFBLElBQUksRUFBRSxPQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDRztBQUY1QixPQURHO0FBRkU7QUFWRixHQVpGO0FBaUNiO0FBQ0FDLEVBQUFBLFVBbENhLHdCQWtDQTtBQUNUWCxJQUFBQSxDQUFDLENBQUMsZ0RBQUQsQ0FBRCxDQUFvRFksUUFBcEQ7QUFDQVosSUFBQUEsQ0FBQyxDQUFDLDBCQUFELENBQUQsQ0FBOEJhLFFBQTlCO0FBRUFmLElBQUFBLFFBQVEsQ0FBQ2dCLGNBQVQ7QUFDSCxHQXZDWTs7QUF5Q2I7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxnQkE5Q2EsNEJBOENJQyxRQTlDSixFQThDYztBQUN2QixRQUFNQyxNQUFNLEdBQUdELFFBQWY7QUFDQUMsSUFBQUEsTUFBTSxDQUFDQyxJQUFQLEdBQWNwQixRQUFRLENBQUNDLFFBQVQsQ0FBa0JvQixJQUFsQixDQUF1QixZQUF2QixDQUFkO0FBQ0EsV0FBT0YsTUFBUDtBQUNILEdBbERZOztBQW9EYjtBQUNKO0FBQ0E7QUFDQTtBQUNJRyxFQUFBQSxlQXhEYSwyQkF3REdDLFFBeERILEVBd0RhLENBRXpCLENBMURZOztBQTJEYjtBQUNKO0FBQ0E7QUFDSVAsRUFBQUEsY0E5RGEsNEJBOERJO0FBQ2JRLElBQUFBLElBQUksQ0FBQ3ZCLFFBQUwsR0FBZ0JELFFBQVEsQ0FBQ0MsUUFBekI7QUFDQXVCLElBQUFBLElBQUksQ0FBQ0MsR0FBTCxhQUFjQyxhQUFkLG1CQUZhLENBRStCOztBQUM1Q0YsSUFBQUEsSUFBSSxDQUFDckIsYUFBTCxHQUFxQkgsUUFBUSxDQUFDRyxhQUE5QixDQUhhLENBR2dDOztBQUM3Q3FCLElBQUFBLElBQUksQ0FBQ1AsZ0JBQUwsR0FBd0JqQixRQUFRLENBQUNpQixnQkFBakMsQ0FKYSxDQUlzQzs7QUFDbkRPLElBQUFBLElBQUksQ0FBQ0YsZUFBTCxHQUF1QnRCLFFBQVEsQ0FBQ3NCLGVBQWhDLENBTGEsQ0FLb0M7O0FBQ2pERSxJQUFBQSxJQUFJLENBQUNYLFVBQUw7QUFDSDtBQXJFWSxDQUFqQixDLENBd0VBOztBQUNBWCxDQUFDLENBQUN5QixFQUFGLENBQUtOLElBQUwsQ0FBVUgsUUFBVixDQUFtQlosS0FBbkIsQ0FBeUJzQixNQUF6QixHQUFrQyxVQUFVQyxLQUFWLEVBQWlCO0FBQy9DLE1BQUlWLE1BQU0sR0FBRyxJQUFiO0FBQ0EsTUFBTVcsQ0FBQyxHQUFHRCxLQUFLLENBQUNFLEtBQU4sQ0FBWSw4Q0FBWixDQUFWOztBQUNBLE1BQUlELENBQUMsS0FBSyxJQUFWLEVBQWdCO0FBQ1pYLElBQUFBLE1BQU0sR0FBRyxLQUFUO0FBQ0gsR0FGRCxNQUVPO0FBQ0gsU0FBSyxJQUFJYSxDQUFDLEdBQUcsQ0FBYixFQUFnQkEsQ0FBQyxHQUFHLENBQXBCLEVBQXVCQSxDQUFDLElBQUksQ0FBNUIsRUFBK0I7QUFDM0IsVUFBTUMsQ0FBQyxHQUFHSCxDQUFDLENBQUNFLENBQUQsQ0FBWDs7QUFDQSxVQUFJQyxDQUFDLEdBQUcsR0FBUixFQUFhO0FBQ1RkLFFBQUFBLE1BQU0sR0FBRyxLQUFUO0FBQ0g7QUFDSjs7QUFDRCxRQUFJVyxDQUFDLENBQUMsQ0FBRCxDQUFELEdBQU8sRUFBWCxFQUFlO0FBQ1hYLE1BQUFBLE1BQU0sR0FBRyxLQUFUO0FBQ0g7QUFDSjs7QUFDRCxTQUFPQSxNQUFQO0FBQ0gsQ0FqQkQsQyxDQW1CQTs7O0FBQ0FqQixDQUFDLENBQUNnQyxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCbkMsRUFBQUEsUUFBUSxDQUFDYSxVQUFUO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSAqL1xuXG4vKipcbiAqIFRoZSBmaXJld2FsbCBvYmplY3QgY29udGFpbnMgbWV0aG9kcyBhbmQgdmFyaWFibGVzIGZvciBtYW5hZ2luZyB0aGUgRmlyZXdhbGwgZm9ybVxuICpcbiAqIEBtb2R1bGUgZmlyZXdhbGxcbiAqL1xuY29uc3QgZmlyZXdhbGwgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI2ZpcmV3YWxsLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBuZXR3b3JrOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnbmV0d29yaycsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2lwYWRkcicsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmZ3X1ZhbGlkYXRlUGVybWl0QWRkcmVzcyxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZGVzY3JpcHRpb246IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdkZXNjcmlwdGlvbicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZndfVmFsaWRhdGVSdWxlTmFtZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLy8gSW5pdGlhbGl6YXRpb24gZnVuY3Rpb24gdG8gc2V0IHVwIGZvcm0gYmVoYXZpb3JcbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAkKCcjZmlyZXdhbGwtZm9ybSAucnVsZXMsI2ZpcmV3YWxsLWZvcm0gLmNoZWNrYm94JykuY2hlY2tib3goKTtcbiAgICAgICAgJCgnI2ZpcmV3YWxsLWZvcm0gLmRyb3Bkb3duJykuZHJvcGRvd24oKTtcblxuICAgICAgICBmaXJld2FsbC5pbml0aWFsaXplRm9ybSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IGZpcmV3YWxsLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG5cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBjdXN0b20gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGZpcmV3YWxsLiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9ZmlyZXdhbGwvc2F2ZWA7IC8vIEZvcm0gc3VibWlzc2lvbiBVUkxcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gZmlyZXdhbGwudmFsaWRhdGVSdWxlczsgLy8gRm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGZpcmV3YWxsLmNiQmVmb3JlU2VuZEZvcm07IC8vIENhbGxiYWNrIGJlZm9yZSBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBmaXJld2FsbC5jYkFmdGVyU2VuZEZvcm07IC8vIENhbGxiYWNrIGFmdGVyIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxufTtcblxuLy8gQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIHRvIGNoZWNrIGlmIGEgc3RyaW5nIGlzIGEgdmFsaWQgSVAgYWRkcmVzc1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmlwYWRkciA9IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgIGxldCByZXN1bHQgPSB0cnVlO1xuICAgIGNvbnN0IGYgPSB2YWx1ZS5tYXRjaCgvXihcXGR7MSwzfSlcXC4oXFxkezEsM30pXFwuKFxcZHsxLDN9KVxcLihcXGR7MSwzfSkkLyk7XG4gICAgaWYgKGYgPT09IG51bGwpIHtcbiAgICAgICAgcmVzdWx0ID0gZmFsc2U7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCA1OyBpICs9IDEpIHtcbiAgICAgICAgICAgIGNvbnN0IGEgPSBmW2ldO1xuICAgICAgICAgICAgaWYgKGEgPiAyNTUpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoZls1XSA+IDMyKSB7XG4gICAgICAgICAgICByZXN1bHQgPSBmYWxzZTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xufTtcblxuLy8gSW5pdGlhbGl6ZSB0aGUgZmlyZXdhbGwgZm9ybSB3aGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGZpcmV3YWxsLmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=