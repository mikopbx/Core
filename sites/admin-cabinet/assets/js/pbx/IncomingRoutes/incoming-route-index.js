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

/* global globalRootUrl,globalTranslate, Extensions, Form */

/**
 * Object for managing incoming routes table
 *
 * @module incomingRoutes
 */
var incomingRoutes = {
  /**
   * jQuery object for the form.
   * @type {jQuery}
   */
  $formObj: $('#default-rule-form'),
  $actionDropdown: $('#action'),

  /**
   * Validation rules for the form fields before submission.
   *
   * @type {object}
   */
  validateRules: {
    extension: {
      identifier: 'extension',
      rules: [{
        type: 'extensionRule',
        prompt: globalTranslate.ir_ValidateForwardingToBeFilled
      }]
    }
  },

  /**
   * Initialize the object
   */
  initialize: function initialize() {
    // Initialize table drag-and-drop with the appropriate callbacks
    $('#routingTable').tableDnD({
      onDrop: incomingRoutes.cbOnDrop,
      // Callback on dropping an item
      onDragClass: 'hoveringRow',
      // CSS class while dragging
      dragHandle: '.dragHandle' // Handle for dragging

    }); // Setup the dropdown with callback on change

    incomingRoutes.$actionDropdown.dropdown({
      onChange: incomingRoutes.toggleDisabledFieldClass
    }); // Apply initial class change based on dropdown selection

    incomingRoutes.toggleDisabledFieldClass(); // Initialize the form

    incomingRoutes.initializeForm(); // Setup the dropdown for forwarding select with options

    $('.forwarding-select').dropdown(Extensions.getDropdownSettingsForRouting()); // Initialize audio message dropdowns

    $('.audio-message-select').dropdown(SoundFilesSelector.getDropdownSettingsWithEmpty()); // Add double click listener to table cells

    $('.rule-row td').on('dblclick', function (e) {
      // When cell is double clicked, navigate to corresponding modify page
      var id = $(e.target).closest('tr').attr('id');
      window.location = "".concat(globalRootUrl, "incoming-routes/modify/").concat(id);
    });
  },

  /**
   * Callback to execute after dropping an element
   */
  cbOnDrop: function cbOnDrop() {
    var priorityWasChanged = false;
    var priorityData = {};
    $('.rule-row').each(function (index, obj) {
      var ruleId = $(obj).attr('id');
      var oldPriority = parseInt($(obj).attr('data-value'), 10);
      var newPriority = obj.rowIndex;

      if (oldPriority !== newPriority) {
        priorityWasChanged = true;
        priorityData[ruleId] = newPriority;
      }
    });

    if (priorityWasChanged) {
      $.api({
        on: 'now',
        url: "".concat(globalRootUrl, "incoming-routes/changePriority"),
        method: 'POST',
        data: priorityData
      });
    }
  },

  /**
   * Toggle class for disabled field based on dropdown selection
   */
  toggleDisabledFieldClass: function toggleDisabledFieldClass() {
    var $action = incomingRoutes.$formObj.form('get value', 'action');

    if ($action === 'extension') {
      $('#extension-group').show();
      $('#audio-group').hide();
      $('#audio_message_id').dropdown('clear');
    } else if ($action === 'playback') {
      $('#extension-group').hide();
      $('#audio-group').show();
      $('#extension').dropdown('clear');
    } else {
      $('#audio-group').hide();
      $('#extension-group').hide();
      $('#extension').dropdown('clear');
      $('#audio_message_id').dropdown('clear');
    }
  },

  /**
   * Callback function to be called before the form is sent
   * @param {Object} settings - The current settings of the form
   * @returns {Object} - The updated settings of the form
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    var result = settings;
    result.data = incomingRoutes.$formObj.form('get values');
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
    Form.$formObj = incomingRoutes.$formObj;
    Form.url = "".concat(globalRootUrl, "incoming-routes/save"); // Form submission URL

    Form.validateRules = incomingRoutes.validateRules; // Form validation rules

    Form.cbBeforeSendForm = incomingRoutes.cbBeforeSendForm; // Callback before form is sent

    Form.cbAfterSendForm = incomingRoutes.cbAfterSendForm; // Callback after form is sent

    Form.initialize();
  }
};
/**
 * Form validation rule for checking if the 'extension' option is chosen and a number is selected.
 *
 * @param {string} value - The value to be checked
 * @returns {boolean} - Returns false if 'extension' is selected but no number is provided. Otherwise, returns true.
 */

$.fn.form.settings.rules.extensionRule = function (value) {
  // If 'extension' is selected and no number is provided (-1 or empty string), return false.
  if ($('#action').val() === 'extension' && (value === -1 || value === '')) {
    return false;
  } // If conditions aren't met, return true.


  return true;
};
/**
 *  Initialize incoming routes on document ready
 */


$(document).ready(function () {
  incomingRoutes.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9JbmNvbWluZ1JvdXRlcy9pbmNvbWluZy1yb3V0ZS1pbmRleC5qcyJdLCJuYW1lcyI6WyJpbmNvbWluZ1JvdXRlcyIsIiRmb3JtT2JqIiwiJCIsIiRhY3Rpb25Ecm9wZG93biIsInZhbGlkYXRlUnVsZXMiLCJleHRlbnNpb24iLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiaXJfVmFsaWRhdGVGb3J3YXJkaW5nVG9CZUZpbGxlZCIsImluaXRpYWxpemUiLCJ0YWJsZURuRCIsIm9uRHJvcCIsImNiT25Ecm9wIiwib25EcmFnQ2xhc3MiLCJkcmFnSGFuZGxlIiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsInRvZ2dsZURpc2FibGVkRmllbGRDbGFzcyIsImluaXRpYWxpemVGb3JtIiwiRXh0ZW5zaW9ucyIsImdldERyb3Bkb3duU2V0dGluZ3NGb3JSb3V0aW5nIiwiU291bmRGaWxlc1NlbGVjdG9yIiwiZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eSIsIm9uIiwiZSIsImlkIiwidGFyZ2V0IiwiY2xvc2VzdCIsImF0dHIiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImdsb2JhbFJvb3RVcmwiLCJwcmlvcml0eVdhc0NoYW5nZWQiLCJwcmlvcml0eURhdGEiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJydWxlSWQiLCJvbGRQcmlvcml0eSIsInBhcnNlSW50IiwibmV3UHJpb3JpdHkiLCJyb3dJbmRleCIsImFwaSIsInVybCIsIm1ldGhvZCIsImRhdGEiLCIkYWN0aW9uIiwiZm9ybSIsInNob3ciLCJoaWRlIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwicmVzdWx0IiwiY2JBZnRlclNlbmRGb3JtIiwicmVzcG9uc2UiLCJGb3JtIiwiZm4iLCJleHRlbnNpb25SdWxlIiwidmFsdWUiLCJ2YWwiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNB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QXlDLFVBQVVDLEtBQVYsRUFBaUI7QUFDdEQ7QUFDQSxNQUFLM0QsQ0FBQyxDQUFDLFNBQUQsQ0FBRCxDQUFhNEQsR0FBYixPQUF1QixXQUF4QixLQUNDRCxLQUFLLEtBQUssQ0FBQyxDQUFYLElBQWdCQSxLQUFLLEtBQUssRUFEM0IsQ0FBSixFQUNvQztBQUNoQyxXQUFPLEtBQVA7QUFDSCxHQUxxRCxDQU90RDs7O0FBQ0EsU0FBTyxJQUFQO0FBQ0gsQ0FURDtBQVlBO0FBQ0E7QUFDQTs7O0FBQ0EzRCxDQUFDLENBQUM2RCxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCaEUsRUFBQUEsY0FBYyxDQUFDWSxVQUFmO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLGdsb2JhbFRyYW5zbGF0ZSwgRXh0ZW5zaW9ucywgRm9ybSAqL1xuXG5cbi8qKlxuICogT2JqZWN0IGZvciBtYW5hZ2luZyBpbmNvbWluZyByb3V0ZXMgdGFibGVcbiAqXG4gKiBAbW9kdWxlIGluY29taW5nUm91dGVzXG4gKi9cbmNvbnN0IGluY29taW5nUm91dGVzID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNkZWZhdWx0LXJ1bGUtZm9ybScpLFxuXG4gICAgJGFjdGlvbkRyb3Bkb3duOiAkKCcjYWN0aW9uJyksXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgZXh0ZW5zaW9uOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZXh0ZW5zaW9uJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXh0ZW5zaW9uUnVsZScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmlyX1ZhbGlkYXRlRm9yd2FyZGluZ1RvQmVGaWxsZWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIG9iamVjdFxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgdGFibGUgZHJhZy1hbmQtZHJvcCB3aXRoIHRoZSBhcHByb3ByaWF0ZSBjYWxsYmFja3NcbiAgICAgICAgJCgnI3JvdXRpbmdUYWJsZScpLnRhYmxlRG5EKHtcbiAgICAgICAgICAgIG9uRHJvcDogaW5jb21pbmdSb3V0ZXMuY2JPbkRyb3AsIC8vIENhbGxiYWNrIG9uIGRyb3BwaW5nIGFuIGl0ZW1cbiAgICAgICAgICAgIG9uRHJhZ0NsYXNzOiAnaG92ZXJpbmdSb3cnLCAvLyBDU1MgY2xhc3Mgd2hpbGUgZHJhZ2dpbmdcbiAgICAgICAgICAgIGRyYWdIYW5kbGU6ICcuZHJhZ0hhbmRsZScsICAvLyBIYW5kbGUgZm9yIGRyYWdnaW5nXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldHVwIHRoZSBkcm9wZG93biB3aXRoIGNhbGxiYWNrIG9uIGNoYW5nZVxuICAgICAgICBpbmNvbWluZ1JvdXRlcy4kYWN0aW9uRHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGluY29taW5nUm91dGVzLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzc1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBcHBseSBpbml0aWFsIGNsYXNzIGNoYW5nZSBiYXNlZCBvbiBkcm9wZG93biBzZWxlY3Rpb25cbiAgICAgICAgaW5jb21pbmdSb3V0ZXMudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZm9ybVxuICAgICAgICBpbmNvbWluZ1JvdXRlcy5pbml0aWFsaXplRm9ybSgpO1xuXG4gICAgICAgIC8vIFNldHVwIHRoZSBkcm9wZG93biBmb3IgZm9yd2FyZGluZyBzZWxlY3Qgd2l0aCBvcHRpb25zXG4gICAgICAgICQoJy5mb3J3YXJkaW5nLXNlbGVjdCcpLmRyb3Bkb3duKEV4dGVuc2lvbnMuZ2V0RHJvcGRvd25TZXR0aW5nc0ZvclJvdXRpbmcoKSk7XG4gICAgICAgIC8vIEluaXRpYWxpemUgYXVkaW8gbWVzc2FnZSBkcm9wZG93bnNcbiAgICAgICAgJCgnLmF1ZGlvLW1lc3NhZ2Utc2VsZWN0JykuZHJvcGRvd24oU291bmRGaWxlc1NlbGVjdG9yLmdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkoKSk7XG5cbiAgICAgICAgLy8gQWRkIGRvdWJsZSBjbGljayBsaXN0ZW5lciB0byB0YWJsZSBjZWxsc1xuICAgICAgICAkKCcucnVsZS1yb3cgdGQnKS5vbignZGJsY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgLy8gV2hlbiBjZWxsIGlzIGRvdWJsZSBjbGlja2VkLCBuYXZpZ2F0ZSB0byBjb3JyZXNwb25kaW5nIG1vZGlmeSBwYWdlXG4gICAgICAgICAgICBjb25zdCBpZCA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ3RyJykuYXR0cignaWQnKTtcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9aW5jb21pbmctcm91dGVzL21vZGlmeS8ke2lkfWA7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayB0byBleGVjdXRlIGFmdGVyIGRyb3BwaW5nIGFuIGVsZW1lbnRcbiAgICAgKi9cbiAgICBjYk9uRHJvcCgpIHtcbiAgICAgICAgbGV0IHByaW9yaXR5V2FzQ2hhbmdlZCA9IGZhbHNlO1xuICAgICAgICBjb25zdCBwcmlvcml0eURhdGEgPSB7fTtcbiAgICAgICAgJCgnLnJ1bGUtcm93JykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgY29uc3QgcnVsZUlkID0gJChvYmopLmF0dHIoJ2lkJyk7XG4gICAgICAgICAgICBjb25zdCBvbGRQcmlvcml0eSA9IHBhcnNlSW50KCQob2JqKS5hdHRyKCdkYXRhLXZhbHVlJyksIDEwKTtcbiAgICAgICAgICAgIGNvbnN0IG5ld1ByaW9yaXR5ID0gb2JqLnJvd0luZGV4O1xuICAgICAgICAgICAgaWYgKG9sZFByaW9yaXR5ICE9PSBuZXdQcmlvcml0eSkge1xuICAgICAgICAgICAgICAgIHByaW9yaXR5V2FzQ2hhbmdlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgcHJpb3JpdHlEYXRhW3J1bGVJZF0gPSBuZXdQcmlvcml0eTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChwcmlvcml0eVdhc0NoYW5nZWQpIHtcbiAgICAgICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICAgICAgdXJsOiBgJHtnbG9iYWxSb290VXJsfWluY29taW5nLXJvdXRlcy9jaGFuZ2VQcmlvcml0eWAsXG4gICAgICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICAgICAgZGF0YTogcHJpb3JpdHlEYXRhLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIGNsYXNzIGZvciBkaXNhYmxlZCBmaWVsZCBiYXNlZCBvbiBkcm9wZG93biBzZWxlY3Rpb25cbiAgICAgKi9cbiAgICB0b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKSB7XG4gICAgICAgIGxldCAkYWN0aW9uID0gaW5jb21pbmdSb3V0ZXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2FjdGlvbicpO1xuICAgICAgICBpZiAoJGFjdGlvbiA9PT0gJ2V4dGVuc2lvbicpIHtcbiAgICAgICAgICAgICQoJyNleHRlbnNpb24tZ3JvdXAnKS5zaG93KCk7XG4gICAgICAgICAgICAkKCcjYXVkaW8tZ3JvdXAnKS5oaWRlKCk7XG4gICAgICAgICAgICAkKCcjYXVkaW9fbWVzc2FnZV9pZCcpLmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICB9IGVsc2UgaWYoJGFjdGlvbiA9PT0gJ3BsYXliYWNrJyl7XG4gICAgICAgICAgICAkKCcjZXh0ZW5zaW9uLWdyb3VwJykuaGlkZSgpO1xuICAgICAgICAgICAgJCgnI2F1ZGlvLWdyb3VwJykuc2hvdygpO1xuICAgICAgICAgICAgJCgnI2V4dGVuc2lvbicpLmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCgnI2F1ZGlvLWdyb3VwJykuaGlkZSgpO1xuICAgICAgICAgICAgJCgnI2V4dGVuc2lvbi1ncm91cCcpLmhpZGUoKTtcbiAgICAgICAgICAgICQoJyNleHRlbnNpb24nKS5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgICAgICQoJyNhdWRpb19tZXNzYWdlX2lkJykuZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBpbmNvbWluZ1JvdXRlcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBjdXN0b20gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGluY29taW5nUm91dGVzLiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9aW5jb21pbmctcm91dGVzL3NhdmVgOyAvLyBGb3JtIHN1Ym1pc3Npb24gVVJMXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGluY29taW5nUm91dGVzLnZhbGlkYXRlUnVsZXM7IC8vIEZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBpbmNvbWluZ1JvdXRlcy5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gaW5jb21pbmdSb3V0ZXMuY2JBZnRlclNlbmRGb3JtOyAvLyBDYWxsYmFjayBhZnRlciBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcbn07XG5cbi8qKlxuICogRm9ybSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGNoZWNraW5nIGlmIHRoZSAnZXh0ZW5zaW9uJyBvcHRpb24gaXMgY2hvc2VuIGFuZCBhIG51bWJlciBpcyBzZWxlY3RlZC5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gYmUgY2hlY2tlZFxuICogQHJldHVybnMge2Jvb2xlYW59IC0gUmV0dXJucyBmYWxzZSBpZiAnZXh0ZW5zaW9uJyBpcyBzZWxlY3RlZCBidXQgbm8gbnVtYmVyIGlzIHByb3ZpZGVkLiBPdGhlcndpc2UsIHJldHVybnMgdHJ1ZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4dGVuc2lvblJ1bGUgPSBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAvLyBJZiAnZXh0ZW5zaW9uJyBpcyBzZWxlY3RlZCBhbmQgbm8gbnVtYmVyIGlzIHByb3ZpZGVkICgtMSBvciBlbXB0eSBzdHJpbmcpLCByZXR1cm4gZmFsc2UuXG4gICAgaWYgKCgkKCcjYWN0aW9uJykudmFsKCkgPT09ICdleHRlbnNpb24nKSAmJlxuICAgICAgICAodmFsdWUgPT09IC0xIHx8IHZhbHVlID09PSAnJykpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIElmIGNvbmRpdGlvbnMgYXJlbid0IG1ldCwgcmV0dXJuIHRydWUuXG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG5cbi8qKlxuICogIEluaXRpYWxpemUgaW5jb21pbmcgcm91dGVzIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBpbmNvbWluZ1JvdXRlcy5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==