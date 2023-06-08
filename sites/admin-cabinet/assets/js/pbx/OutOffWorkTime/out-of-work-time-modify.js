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

/* global globalRootUrl,globalTranslate, Extensions, Form, SemanticLocalization, SoundFilesSelector */

/**
 * Object for managing Out-of-Work Time settings
 *
 * @module outOfWorkTimeRecord
 */
var outOfWorkTimeRecord = {
  /**
   * jQuery object for the form.
   * @type {jQuery}
   */
  $formObj: $('#save-outoffwork-form'),
  $defaultDropdown: $('#save-outoffwork-form .dropdown-default'),
  $rangeDaysStart: $('#range-days-start'),
  $rangeDaysEnd: $('#range-days-end'),
  $rangeTimeStart: $('#range-time-start'),
  $rangeTimeEnd: $('#range-time-end'),
  $date_from: $('#date_from'),
  $date_to: $('#date_to'),
  $time_to: $('#time_to'),
  $forwardingSelectDropdown: $('#save-outoffwork-form .forwarding-select'),

  /**
   * Validation rules for the form fields before submission.
   *
   * @type {object}
   */
  validateRules: {
    audio_message_id: {
      identifier: 'audio_message_id',
      rules: [{
        type: 'customNotEmptyIfActionRule[playmessage]',
        prompt: globalTranslate.tf_ValidateAudioMessageEmpty
      }]
    },
    extension: {
      identifier: 'extension',
      rules: [{
        type: 'customNotEmptyIfActionRule[extension]',
        prompt: globalTranslate.tf_ValidateExtensionEmpty
      }]
    },
    timefrom: {
      optional: true,
      identifier: 'time_from',
      rules: [{
        type: 'regExp',
        value: /^(2[0-3]|1?[0-9]):([0-5]?[0-9])$/,
        prompt: globalTranslate.tf_ValidateCheckTimeInterval
      }]
    },
    timeto: {
      identifier: 'time_to',
      optional: true,
      rules: [{
        type: 'regExp',
        value: /^(2[0-3]|1?[0-9]):([0-5]?[0-9])$/,
        prompt: globalTranslate.tf_ValidateCheckTimeInterval
      }]
    }
  },

  /**
   * Initializes the out of work time record form.
   */
  initialize: function initialize() {
    // Initialize tab behavior for the out-time-modify-menu
    $('#out-time-modify-menu .item').tab(); // Initialize the default dropdown

    outOfWorkTimeRecord.$defaultDropdown.dropdown(); // Initialize the calendar for range days start

    outOfWorkTimeRecord.$rangeDaysStart.calendar({
      // Calendar configuration options
      firstDayOfWeek: SemanticLocalization.calendarFirstDayOfWeek,
      text: SemanticLocalization.calendarText,
      endCalendar: outOfWorkTimeRecord.$rangeDaysEnd,
      type: 'date',
      inline: false,
      monthFirst: false,
      regExp: SemanticLocalization.regExp
    }); // Initialize the calendar for range days end

    outOfWorkTimeRecord.$rangeDaysEnd.calendar({
      // Calendar configuration options
      firstDayOfWeek: SemanticLocalization.calendarFirstDayOfWeek,
      text: SemanticLocalization.calendarText,
      startCalendar: outOfWorkTimeRecord.$rangeDaysStart,
      type: 'date',
      inline: false,
      monthFirst: false,
      regExp: SemanticLocalization.regExp,
      onChange: function onChange(newDateTo) {
        // Handle the change event for range time end
        var oldDateTo = outOfWorkTimeRecord.$date_to.attr('value');

        if (newDateTo !== null && oldDateTo !== '') {
          oldDateTo = new Date(oldDateTo * 1000);

          if (newDateTo - oldDateTo !== 0) {
            outOfWorkTimeRecord.$date_from.trigger('change');
          }
        }
      }
    }); // Initialize the calendar for range time start

    outOfWorkTimeRecord.$rangeTimeStart.calendar({
      // Calendar configuration options
      firstDayOfWeek: SemanticLocalization.calendarFirstDayOfWeek,
      text: SemanticLocalization.calendarText,
      endCalendar: outOfWorkTimeRecord.$rangeTimeEnd,
      type: 'time',
      inline: false,
      disableMinute: true,
      ampm: false
    }); // Initialize the calendar for range time end

    outOfWorkTimeRecord.$rangeTimeEnd.calendar({
      // Calendar configuration options
      firstDayOfWeek: SemanticLocalization.calendarFirstDayOfWeek,
      text: SemanticLocalization.calendarText,
      type: 'time',
      inline: false,
      disableMinute: true,
      ampm: false,
      onChange: function onChange(newTimeTo) {
        // Handle the change event for range time end
        var oldTimeTo = outOfWorkTimeRecord.$time_to.attr('value');

        if (newTimeTo !== null && oldTimeTo !== '') {
          oldTimeTo = new Date(oldTimeTo * 1000);

          if (newTimeTo - oldTimeTo !== 0) {
            outOfWorkTimeRecord.$time_to.trigger('change');
          }
        }
      }
    }); // Initialize the action dropdown

    $('#action').dropdown({
      onChange: function onChange() {
        // Handle the change event for the action dropdown
        outOfWorkTimeRecord.toggleDisabledFieldClass();
      }
    }); // Initialize the weekday_from dropdown

    $('#weekday_from').dropdown({
      onChange: function onChange() {
        // Handle the change event for the weekday_from dropdown
        var from = outOfWorkTimeRecord.$formObj.form('get value', 'weekday_from');
        var to = outOfWorkTimeRecord.$formObj.form('get value', 'weekday_to');

        if (from < to || to === -1 || from === -1) {
          outOfWorkTimeRecord.$formObj.form('set value', 'weekday_to', from);
        }
      }
    }); // Initialize the weekday_to dropdown

    $('#weekday_to').dropdown({
      onChange: function onChange() {
        // Handle the change event for the weekday_to dropdown
        var from = outOfWorkTimeRecord.$formObj.form('get value', 'weekday_from');
        var to = outOfWorkTimeRecord.$formObj.form('get value', 'weekday_to');

        if (to < from || from === -1) {
          outOfWorkTimeRecord.$formObj.form('set value', 'weekday_from', to);
        }
      }
    }); // Bind click event to erase-dates button

    $('#erase-dates').on('click', function (e) {
      // Handle the click event for erase-dates button
      outOfWorkTimeRecord.$rangeDaysStart.calendar('clear');
      outOfWorkTimeRecord.$rangeDaysEnd.calendar('clear');
      outOfWorkTimeRecord.$formObj.form('set values', {
        date_from: '',
        date_to: ''
      });
      e.preventDefault();
    }); // Bind click event to erase-weekdays button

    $('#erase-weekdays').on('click', function (e) {
      // Handle the click event for erase-weekdays button
      outOfWorkTimeRecord.$formObj.form('set values', {
        weekday_from: -1,
        weekday_to: -1
      });
      outOfWorkTimeRecord.$rangeDaysStart.trigger('change');
      e.preventDefault();
    }); // Bind click event to erase-timeperiod button

    $('#erase-timeperiod').on('click', function (e) {
      // Handle the click event for erase-timeperiod button
      outOfWorkTimeRecord.$rangeTimeStart.calendar('clear');
      outOfWorkTimeRecord.$rangeTimeEnd.calendar('clear');
      outOfWorkTimeRecord.$time_to.trigger('change');
      e.preventDefault();
    }); // Initialize audio-message-select dropdown

    $('#save-outoffwork-form .audio-message-select').dropdown(SoundFilesSelector.getDropdownSettingsWithEmpty()); // Change the date format from linuxtime to local representation

    outOfWorkTimeRecord.changeDateFormat(); // Initialize the form

    outOfWorkTimeRecord.initializeForm(); // Initialize the forwardingSelectDropdown

    outOfWorkTimeRecord.$forwardingSelectDropdown.dropdown(Extensions.getDropdownSettingsWithoutEmpty()); // Toggle disabled field class based on action value

    outOfWorkTimeRecord.toggleDisabledFieldClass(); // Bind checkbox change event for inbound rules table

    $('#inbound-rules-table .ui.checkbox').checkbox({
      onChange: function onChange() {
        // Handle the change event for inbound rules table checkbox
        if ($(this).parent().checkbox('is checked')) {
          $('#inbound-rules-table .ui.checkbox[data-did=' + $(this).parent().attr('data-did') + ']').checkbox('set checked');
        } else {
          $('#inbound-rules-table .ui.checkbox[data-did=' + $(this).parent().attr('data-did') + ']').checkbox('set unchecked');
        }
      }
    }); // Bind checkbox change event for allowRestriction checkbox

    $('#allowRestriction').parent().checkbox({
      onChange: outOfWorkTimeRecord.changeRestriction
    }); // Call changeRestriction method

    outOfWorkTimeRecord.changeRestriction();
  },

  /**
   * Changes the visibility of the 'rules' tab based on the checked status of the 'allowRestriction' checkbox.
   */
  changeRestriction: function changeRestriction() {
    if ($('#allowRestriction').parent().checkbox('is checked')) {
      $("a[data-tab='rules']").show();
    } else {
      $("a[data-tab='rules']").hide();
    }
  },

  /**
   * Converts the date format from linuxtime to the local representation.
   */
  changeDateFormat: function changeDateFormat() {
    var dateFrom = outOfWorkTimeRecord.$date_from.attr('value');
    var dateTo = outOfWorkTimeRecord.$date_to.attr('value');
    var currentOffset = new Date().getTimezoneOffset();
    var serverOffset = parseInt(outOfWorkTimeRecord.$formObj.form('get value', 'serverOffset'));
    var offsetDiff = serverOffset + currentOffset;

    if (dateFrom !== undefined && dateFrom.length > 0) {
      var dateFromInBrowserTZ = dateFrom * 1000 + offsetDiff * 60 * 1000;
      outOfWorkTimeRecord.$rangeDaysStart.calendar('set date', new Date(dateFromInBrowserTZ));
    }

    if (dateTo !== undefined && dateTo.length > 0) {
      var dateToInBrowserTZ = dateTo * 1000 + offsetDiff * 60 * 1000;
      outOfWorkTimeRecord.$rangeDaysEnd.calendar('set date', new Date(dateToInBrowserTZ));
    }
  },

  /**
   * Toggles the visibility of certain field groups based on the selected action value.
   */
  toggleDisabledFieldClass: function toggleDisabledFieldClass() {
    if (outOfWorkTimeRecord.$formObj.form('get value', 'action') === 'extension') {
      $('#extension-group').show();
      $('#audio-file-group').hide();
      $('#audio_message_id').dropdown('clear');
    } else {
      $('#extension-group').hide();
      $('#audio-file-group').show();
      outOfWorkTimeRecord.$formObj.form('set value', 'extension', -1);
    }
  },

  /**
   * Custom form validation for validating specific fields in a form.
   *
   * @param {Object} result - The result object containing form data.
   * @returns {boolean|Object} Returns false if validation fails, or the result object if validation passes.
   */
  customValidateForm: function customValidateForm(result) {
    // Check date fields
    if (result.data.date_from !== '' && result.data.date_to === '' || result.data.date_to !== '' && result.data.date_from === '') {
      $('.form .error.message').html(globalTranslate.tf_ValidateCheckDateInterval).show();
      Form.$submitButton.transition('shake').removeClass('loading disabled');
      return false;
    } // Check weekday fields


    if (result.data.weekday_from > 0 && result.data.weekday_to === '-1' || result.data.weekday_to > 0 && result.data.weekday_from === '-1') {
      $('.form .error.message').html(globalTranslate.tf_ValidateCheckWeekDayInterval).show();
      Form.$submitButton.transition('shake').removeClass('loading disabled');
      return false;
    } // Check time fields


    if (result.data.time_from.length > 0 && result.data.time_to.length === 0 || result.data.time_to.length > 0 && result.data.time_from.length === 0) {
      $('.form .error.message').html(globalTranslate.tf_ValidateCheckTimeInterval).show();
      Form.$submitButton.transition('shake').removeClass('loading disabled');
      return false;
    } // Check time field format


    if (result.data.time_from.length > 0 && result.data.time_to.length === 0 || result.data.time_to.length > 0 && result.data.time_from.length === 0) {
      $('.form .error.message').html(globalTranslate.tf_ValidateCheckTimeInterval).show();
      Form.$submitButton.transition('shake').removeClass('loading disabled');
      return false;
    } // Check all fields


    if (result.data.time_from === '' && result.data.time_to === '' && result.data.weekday_from === '-1' && result.data.weekday_to === '-1' && result.data.date_from === '' && result.data.date_to === '') {
      $('.form .error.message').html(globalTranslate.tf_ValidateNoRulesSelected).show();
      Form.$submitButton.transition('shake').removeClass('loading disabled');
      return false;
    }

    return result;
  },

  /**
   * Callback function to be called before the form is sent
   * @param {Object} settings - The current settings of the form
   * @returns {Object} - The updated settings of the form
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    var result = settings;
    $('.form .error.message').html('').hide();
    result.data = outOfWorkTimeRecord.$formObj.form('get values');
    var dateFrom = outOfWorkTimeRecord.$rangeDaysStart.calendar('get date');

    if (dateFrom !== null) {
      dateFrom.setHours(0, 0, 0, 0);
      result.data.date_from = outOfWorkTimeRecord.$rangeDaysStart.calendar('get date');
    }

    var dateTo = outOfWorkTimeRecord.$rangeDaysEnd.calendar('get date');

    if (dateTo !== null) {
      dateTo.setHours(23, 59, 59, 0);
      result.data.date_to = outOfWorkTimeRecord.$rangeDaysEnd.calendar('get date');
    }

    return outOfWorkTimeRecord.customValidateForm(result);
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
    Form.$formObj = outOfWorkTimeRecord.$formObj;
    Form.url = "".concat(globalRootUrl, "out-off-work-time/save"); // Form submission URL

    Form.validateRules = outOfWorkTimeRecord.validateRules; // Form validation rules

    Form.cbBeforeSendForm = outOfWorkTimeRecord.cbBeforeSendForm; // Callback before form is sent

    Form.cbAfterSendForm = outOfWorkTimeRecord.cbAfterSendForm; // Callback after form is sent

    Form.initialize();
  }
};
/**
 * Custom form validation rule that checks if a value is not empty based on a specific action.
 *
 * @param {string} value - The value to be validated.
 * @param {string} action - The action to compare against.
 * @returns {boolean} Returns true if the value is not empty or the action does not match, false otherwise.
 */

$.fn.form.settings.rules.customNotEmptyIfActionRule = function (value, action) {
  if (value.length === 0 && $('#action').val() === action) {
    return false;
  }

  return true;
};
/**
 *  Initialize out of work form on document ready
 */


$(document).ready(function () {
  outOfWorkTimeRecord.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9PdXRPZmZXb3JrVGltZS9vdXQtb2Ytd29yay10aW1lLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJvdXRPZldvcmtUaW1lUmVjb3JkIiwiJGZvcm1PYmoiLCIkIiwiJGRlZmF1bHREcm9wZG93biIsIiRyYW5nZURheXNTdGFydCIsIiRyYW5nZURheXNFbmQiLCIkcmFuZ2VUaW1lU3RhcnQiLCIkcmFuZ2VUaW1lRW5kIiwiJGRhdGVfZnJvbSIsIiRkYXRlX3RvIiwiJHRpbWVfdG8iLCIkZm9yd2FyZGluZ1NlbGVjdERyb3Bkb3duIiwidmFsaWRhdGVSdWxlcyIsImF1ZGlvX21lc3NhZ2VfaWQiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwidGZfVmFsaWRhdGVBdWRpb01lc3NhZ2VFbXB0eSIsImV4dGVuc2lvbiIsInRmX1ZhbGlkYXRlRXh0ZW5zaW9uRW1wdHkiLCJ0aW1lZnJvbSIsIm9wdGlvbmFsIiwidmFsdWUiLCJ0Zl9WYWxpZGF0ZUNoZWNrVGltZUludGVydmFsIiwidGltZXRvIiwiaW5pdGlhbGl6ZSIsInRhYiIsImRyb3Bkb3duIiwiY2FsZW5kYXIiLCJmaXJzdERheU9mV2VlayIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiY2FsZW5kYXJGaXJzdERheU9mV2VlayIsInRleHQiLCJjYWxlbmRhclRleHQiLCJlbmRDYWxlbmRhciIsImlubGluZSIsIm1vbnRoRmlyc3QiLCJyZWdFeHAiLCJzdGFydENhbGVuZGFyIiwib25DaGFuZ2UiLCJuZXdEYXRlVG8iLCJvbGREYXRlVG8iLCJhdHRyIiwiRGF0ZSIsInRyaWdnZXIiLCJkaXNhYmxlTWludXRlIiwiYW1wbSIsIm5ld1RpbWVUbyIsIm9sZFRpbWVUbyIsInRvZ2dsZURpc2FibGVkRmllbGRDbGFzcyIsImZyb20iLCJmb3JtIiwidG8iLCJvbiIsImUiLCJkYXRlX2Zyb20iLCJkYXRlX3RvIiwicHJldmVudERlZmF1bHQiLCJ3ZWVrZGF5X2Zyb20iLCJ3ZWVrZGF5X3RvIiwiU291bmRGaWxlc1NlbGVjdG9yIiwiZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eSIsImNoYW5nZURhdGVGb3JtYXQiLCJpbml0aWFsaXplRm9ybSIsIkV4dGVuc2lvbnMiLCJnZXREcm9wZG93blNldHRpbmdzV2l0aG91dEVtcHR5IiwiY2hlY2tib3giLCJwYXJlbnQiLCJjaGFuZ2VSZXN0cmljdGlvbiIsInNob3ciLCJoaWRlIiwiZGF0ZUZyb20iLCJkYXRlVG8iLCJjdXJyZW50T2Zmc2V0IiwiZ2V0VGltZXpvbmVPZmZzZXQiLCJzZXJ2ZXJPZmZzZXQiLCJwYXJzZUludCIsIm9mZnNldERpZmYiLCJ1bmRlZmluZWQiLCJsZW5ndGgiLCJkYXRlRnJvbUluQnJvd3NlclRaIiwiZGF0ZVRvSW5Ccm93c2VyVFoiLCJjdXN0b21WYWxpZGF0ZUZvcm0iLCJyZXN1bHQiLCJkYXRhIiwiaHRtbCIsInRmX1ZhbGlkYXRlQ2hlY2tEYXRlSW50ZXJ2YWwiLCJGb3JtIiwiJHN1Ym1pdEJ1dHRvbiIsInRyYW5zaXRpb24iLCJyZW1vdmVDbGFzcyIsInRmX1ZhbGlkYXRlQ2hlY2tXZWVrRGF5SW50ZXJ2YWwiLCJ0aW1lX2Zyb20iLCJ0aW1lX3RvIiwidGZfVmFsaWRhdGVOb1J1bGVzU2VsZWN0ZWQiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJzZXRIb3VycyIsImNiQWZ0ZXJTZW5kRm9ybSIsInJlc3BvbnNlIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsImZuIiwiY3VzdG9tTm90RW1wdHlJZkFjdGlvblJ1bGUiLCJhY3Rpb24iLCJ2YWwiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLG1CQUFtQixHQUFHO0FBQ3hC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QUFJLENBQUNXLGVBQUwsR0FBdUJwRyxtQkFBbUIsQ0FBQ29HLGVBQTNDLENBTGEsQ0FLK0M7O0FBQzVEWCxJQUFBQSxJQUFJLENBQUM5RCxVQUFMO0FBQ0g7QUEvWHVCLENBQTVCO0FBa1lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBekIsQ0FBQyxDQUFDc0csRUFBRixDQUFLbkQsSUFBTCxDQUFVNkMsUUFBVixDQUFtQm5GLEtBQW5CLENBQXlCMEYsMEJBQXpCLEdBQXNELFVBQUNqRixLQUFELEVBQVFrRixNQUFSLEVBQW1CO0FBQ3JFLE1BQUlsRixLQUFLLENBQUN5RCxNQUFOLEtBQWlCLENBQWpCLElBQXNCL0UsQ0FBQyxDQUFDLFNBQUQsQ0FBRCxDQUFheUcsR0FBYixPQUF1QkQsTUFBakQsRUFBeUQ7QUFDckQsV0FBTyxLQUFQO0FBQ0g7O0FBQ0QsU0FBTyxJQUFQO0FBQ0gsQ0FMRDtBQU9BO0FBQ0E7QUFDQTs7O0FBQ0F4RyxDQUFDLENBQUMwRyxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCN0csRUFBQUEsbUJBQW1CLENBQUMyQixVQUFwQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIEV4dGVuc2lvbnMsIEZvcm0sIFNlbWFudGljTG9jYWxpemF0aW9uLCBTb3VuZEZpbGVzU2VsZWN0b3IgKi9cblxuXG4vKipcbiAqIE9iamVjdCBmb3IgbWFuYWdpbmcgT3V0LW9mLVdvcmsgVGltZSBzZXR0aW5nc1xuICpcbiAqIEBtb2R1bGUgb3V0T2ZXb3JrVGltZVJlY29yZFxuICovXG5jb25zdCBvdXRPZldvcmtUaW1lUmVjb3JkID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNzYXZlLW91dG9mZndvcmstZm9ybScpLFxuXG4gICAgJGRlZmF1bHREcm9wZG93bjogJCgnI3NhdmUtb3V0b2Zmd29yay1mb3JtIC5kcm9wZG93bi1kZWZhdWx0JyksXG4gICAgJHJhbmdlRGF5c1N0YXJ0OiAkKCcjcmFuZ2UtZGF5cy1zdGFydCcpLFxuICAgICRyYW5nZURheXNFbmQ6ICQoJyNyYW5nZS1kYXlzLWVuZCcpLFxuICAgICRyYW5nZVRpbWVTdGFydDogJCgnI3JhbmdlLXRpbWUtc3RhcnQnKSxcbiAgICAkcmFuZ2VUaW1lRW5kOiAkKCcjcmFuZ2UtdGltZS1lbmQnKSxcbiAgICAkZGF0ZV9mcm9tOiAkKCcjZGF0ZV9mcm9tJyksXG4gICAgJGRhdGVfdG86ICQoJyNkYXRlX3RvJyksXG4gICAgJHRpbWVfdG86ICQoJyN0aW1lX3RvJyksXG4gICAgJGZvcndhcmRpbmdTZWxlY3REcm9wZG93bjogJCgnI3NhdmUtb3V0b2Zmd29yay1mb3JtIC5mb3J3YXJkaW5nLXNlbGVjdCcpLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGF1ZGlvX21lc3NhZ2VfaWQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdhdWRpb19tZXNzYWdlX2lkJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY3VzdG9tTm90RW1wdHlJZkFjdGlvblJ1bGVbcGxheW1lc3NhZ2VdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVBdWRpb01lc3NhZ2VFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZXh0ZW5zaW9uOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZXh0ZW5zaW9uJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY3VzdG9tTm90RW1wdHlJZkFjdGlvblJ1bGVbZXh0ZW5zaW9uXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlRXh0ZW5zaW9uRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHRpbWVmcm9tOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd0aW1lX2Zyb20nLFxuICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgdmFsdWU6IC9eKDJbMC0zXXwxP1swLTldKTooWzAtNV0/WzAtOV0pJC8sXG4gICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja1RpbWVJbnRlcnZhbCxcbiAgICAgICAgICAgIH1dLFxuICAgICAgICB9LFxuICAgICAgICB0aW1ldG86IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd0aW1lX3RvJyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgdmFsdWU6IC9eKDJbMC0zXXwxP1swLTldKTooWzAtNV0/WzAtOV0pJC8sXG4gICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja1RpbWVJbnRlcnZhbCxcbiAgICAgICAgICAgIH1dLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgb3V0IG9mIHdvcmsgdGltZSByZWNvcmQgZm9ybS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIHRhYiBiZWhhdmlvciBmb3IgdGhlIG91dC10aW1lLW1vZGlmeS1tZW51XG4gICAgICAgICQoJyNvdXQtdGltZS1tb2RpZnktbWVudSAuaXRlbScpLnRhYigpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGRlZmF1bHQgZHJvcGRvd25cbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZGVmYXVsdERyb3Bkb3duLmRyb3Bkb3duKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgY2FsZW5kYXIgZm9yIHJhbmdlIGRheXMgc3RhcnRcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQuY2FsZW5kYXIoe1xuICAgICAgICAgICAgLy8gQ2FsZW5kYXIgY29uZmlndXJhdGlvbiBvcHRpb25zXG4gICAgICAgICAgICBmaXJzdERheU9mV2VlazogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJGaXJzdERheU9mV2VlayxcbiAgICAgICAgICAgIHRleHQ6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dCxcbiAgICAgICAgICAgIGVuZENhbGVuZGFyOiBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNFbmQsXG4gICAgICAgICAgICB0eXBlOiAnZGF0ZScsXG4gICAgICAgICAgICBpbmxpbmU6IGZhbHNlLFxuICAgICAgICAgICAgbW9udGhGaXJzdDogZmFsc2UsXG4gICAgICAgICAgICByZWdFeHA6IFNlbWFudGljTG9jYWxpemF0aW9uLnJlZ0V4cCxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgY2FsZW5kYXIgZm9yIHJhbmdlIGRheXMgZW5kXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c0VuZC5jYWxlbmRhcih7XG4gICAgICAgICAgICAvLyBDYWxlbmRhciBjb25maWd1cmF0aW9uIG9wdGlvbnNcbiAgICAgICAgICAgIGZpcnN0RGF5T2ZXZWVrOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhckZpcnN0RGF5T2ZXZWVrLFxuICAgICAgICAgICAgdGV4dDogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJUZXh0LFxuICAgICAgICAgICAgc3RhcnRDYWxlbmRhcjogb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQsXG4gICAgICAgICAgICB0eXBlOiAnZGF0ZScsXG4gICAgICAgICAgICBpbmxpbmU6IGZhbHNlLFxuICAgICAgICAgICAgbW9udGhGaXJzdDogZmFsc2UsXG4gICAgICAgICAgICByZWdFeHA6IFNlbWFudGljTG9jYWxpemF0aW9uLnJlZ0V4cCxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAobmV3RGF0ZVRvKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIHRoZSBjaGFuZ2UgZXZlbnQgZm9yIHJhbmdlIHRpbWUgZW5kXG4gICAgICAgICAgICAgICAgbGV0IG9sZERhdGVUbyA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGRhdGVfdG8uYXR0cigndmFsdWUnKTtcbiAgICAgICAgICAgICAgICBpZiAobmV3RGF0ZVRvICE9PSBudWxsICYmIG9sZERhdGVUbyAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgb2xkRGF0ZVRvID0gbmV3IERhdGUob2xkRGF0ZVRvICogMTAwMCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICgobmV3RGF0ZVRvIC0gb2xkRGF0ZVRvKSAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZGF0ZV9mcm9tLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgY2FsZW5kYXIgZm9yIHJhbmdlIHRpbWUgc3RhcnRcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lU3RhcnQuY2FsZW5kYXIoe1xuICAgICAgICAgICAgLy8gQ2FsZW5kYXIgY29uZmlndXJhdGlvbiBvcHRpb25zXG4gICAgICAgICAgICBmaXJzdERheU9mV2VlazogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJGaXJzdERheU9mV2VlayxcbiAgICAgICAgICAgIHRleHQ6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dCxcbiAgICAgICAgICAgIGVuZENhbGVuZGFyOiBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZVRpbWVFbmQsXG4gICAgICAgICAgICB0eXBlOiAndGltZScsXG4gICAgICAgICAgICBpbmxpbmU6IGZhbHNlLFxuICAgICAgICAgICAgZGlzYWJsZU1pbnV0ZTogdHJ1ZSxcbiAgICAgICAgICAgIGFtcG06IGZhbHNlLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBjYWxlbmRhciBmb3IgcmFuZ2UgdGltZSBlbmRcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lRW5kLmNhbGVuZGFyKHtcbiAgICAgICAgICAgIC8vIENhbGVuZGFyIGNvbmZpZ3VyYXRpb24gb3B0aW9uc1xuICAgICAgICAgICAgZmlyc3REYXlPZldlZWs6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyRmlyc3REYXlPZldlZWssXG4gICAgICAgICAgICB0ZXh0OiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQsXG4gICAgICAgICAgICB0eXBlOiAndGltZScsXG4gICAgICAgICAgICBpbmxpbmU6IGZhbHNlLFxuICAgICAgICAgICAgZGlzYWJsZU1pbnV0ZTogdHJ1ZSxcbiAgICAgICAgICAgIGFtcG06IGZhbHNlLFxuICAgICAgICAgICAgb25DaGFuZ2U6IChuZXdUaW1lVG8pID0+IHtcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgdGhlIGNoYW5nZSBldmVudCBmb3IgcmFuZ2UgdGltZSBlbmRcbiAgICAgICAgICAgICAgICBsZXQgb2xkVGltZVRvID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kdGltZV90by5hdHRyKCd2YWx1ZScpO1xuICAgICAgICAgICAgICAgIGlmIChuZXdUaW1lVG8gIT09IG51bGwgJiYgb2xkVGltZVRvICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICBvbGRUaW1lVG8gPSBuZXcgRGF0ZShvbGRUaW1lVG8gKiAxMDAwKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKChuZXdUaW1lVG8gLSBvbGRUaW1lVG8pICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR0aW1lX3RvLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgYWN0aW9uIGRyb3Bkb3duXG4gICAgICAgICQoJyNhY3Rpb24nKVxuICAgICAgICAgICAgLmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICBvbkNoYW5nZSgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSGFuZGxlIHRoZSBjaGFuZ2UgZXZlbnQgZm9yIHRoZSBhY3Rpb24gZHJvcGRvd25cbiAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgd2Vla2RheV9mcm9tIGRyb3Bkb3duXG4gICAgICAgICQoJyN3ZWVrZGF5X2Zyb20nKVxuICAgICAgICAgICAgLmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICBvbkNoYW5nZSgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSGFuZGxlIHRoZSBjaGFuZ2UgZXZlbnQgZm9yIHRoZSB3ZWVrZGF5X2Zyb20gZHJvcGRvd25cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZnJvbSA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3dlZWtkYXlfZnJvbScpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0byA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3dlZWtkYXlfdG8nKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZyb20gPCB0byB8fCB0byA9PT0gLTEgfHwgZnJvbSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ3dlZWtkYXlfdG8nLCBmcm9tKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSB3ZWVrZGF5X3RvIGRyb3Bkb3duXG4gICAgICAgICQoJyN3ZWVrZGF5X3RvJylcbiAgICAgICAgICAgIC5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2UoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEhhbmRsZSB0aGUgY2hhbmdlIGV2ZW50IGZvciB0aGUgd2Vla2RheV90byBkcm9wZG93blxuICAgICAgICAgICAgICAgICAgICBjb25zdCBmcm9tID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnd2Vla2RheV9mcm9tJyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRvID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnd2Vla2RheV90bycpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodG8gPCBmcm9tIHx8IGZyb20gPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICd3ZWVrZGF5X2Zyb20nLCB0byk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQmluZCBjbGljayBldmVudCB0byBlcmFzZS1kYXRlcyBidXR0b25cbiAgICAgICAgJCgnI2VyYXNlLWRhdGVzJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIC8vIEhhbmRsZSB0aGUgY2xpY2sgZXZlbnQgZm9yIGVyYXNlLWRhdGVzIGJ1dHRvblxuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQuY2FsZW5kYXIoJ2NsZWFyJyk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNFbmQuY2FsZW5kYXIoJ2NsZWFyJyk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqXG4gICAgICAgICAgICAgICAgLmZvcm0oJ3NldCB2YWx1ZXMnLCB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGVfZnJvbTogJycsXG4gICAgICAgICAgICAgICAgICAgIGRhdGVfdG86ICcnLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBCaW5kIGNsaWNrIGV2ZW50IHRvIGVyYXNlLXdlZWtkYXlzIGJ1dHRvblxuICAgICAgICAkKCcjZXJhc2Utd2Vla2RheXMnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgLy8gSGFuZGxlIHRoZSBjbGljayBldmVudCBmb3IgZXJhc2Utd2Vla2RheXMgYnV0dG9uXG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqXG4gICAgICAgICAgICAgICAgLmZvcm0oJ3NldCB2YWx1ZXMnLCB7XG4gICAgICAgICAgICAgICAgICAgIHdlZWtkYXlfZnJvbTogLTEsXG4gICAgICAgICAgICAgICAgICAgIHdlZWtkYXlfdG86IC0xLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEJpbmQgY2xpY2sgZXZlbnQgdG8gZXJhc2UtdGltZXBlcmlvZCBidXR0b25cbiAgICAgICAgJCgnI2VyYXNlLXRpbWVwZXJpb2QnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgLy8gSGFuZGxlIHRoZSBjbGljayBldmVudCBmb3IgZXJhc2UtdGltZXBlcmlvZCBidXR0b25cbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlVGltZVN0YXJ0LmNhbGVuZGFyKCdjbGVhcicpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lRW5kLmNhbGVuZGFyKCdjbGVhcicpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kdGltZV90by50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBhdWRpby1tZXNzYWdlLXNlbGVjdCBkcm9wZG93blxuICAgICAgICAkKCcjc2F2ZS1vdXRvZmZ3b3JrLWZvcm0gLmF1ZGlvLW1lc3NhZ2Utc2VsZWN0JykuZHJvcGRvd24oU291bmRGaWxlc1NlbGVjdG9yLmdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkoKSk7XG5cbiAgICAgICAgLy8gQ2hhbmdlIHRoZSBkYXRlIGZvcm1hdCBmcm9tIGxpbnV4dGltZSB0byBsb2NhbCByZXByZXNlbnRhdGlvblxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmNoYW5nZURhdGVGb3JtYXQoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBmb3JtXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBmb3J3YXJkaW5nU2VsZWN0RHJvcGRvd25cbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9yd2FyZGluZ1NlbGVjdERyb3Bkb3duLmRyb3Bkb3duKEV4dGVuc2lvbnMuZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhvdXRFbXB0eSgpKTtcblxuICAgICAgICAvLyBUb2dnbGUgZGlzYWJsZWQgZmllbGQgY2xhc3MgYmFzZWQgb24gYWN0aW9uIHZhbHVlXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG5cbiAgICAgICAgLy8gQmluZCBjaGVja2JveCBjaGFuZ2UgZXZlbnQgZm9yIGluYm91bmQgcnVsZXMgdGFibGVcbiAgICAgICAgJCgnI2luYm91bmQtcnVsZXMtdGFibGUgLnVpLmNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgdGhlIGNoYW5nZSBldmVudCBmb3IgaW5ib3VuZCBydWxlcyB0YWJsZSBjaGVja2JveFxuICAgICAgICAgICAgICAgIGlmICgkKHRoaXMpLnBhcmVudCgpLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2luYm91bmQtcnVsZXMtdGFibGUgLnVpLmNoZWNrYm94W2RhdGEtZGlkPScgKyAkKHRoaXMpLnBhcmVudCgpLmF0dHIoJ2RhdGEtZGlkJykgKyAnXScpLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2luYm91bmQtcnVsZXMtdGFibGUgLnVpLmNoZWNrYm94W2RhdGEtZGlkPScgKyAkKHRoaXMpLnBhcmVudCgpLmF0dHIoJ2RhdGEtZGlkJykgKyAnXScpLmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJylcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEJpbmQgY2hlY2tib3ggY2hhbmdlIGV2ZW50IGZvciBhbGxvd1Jlc3RyaWN0aW9uIGNoZWNrYm94XG4gICAgICAgICQoJyNhbGxvd1Jlc3RyaWN0aW9uJykucGFyZW50KCkuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6IG91dE9mV29ya1RpbWVSZWNvcmQuY2hhbmdlUmVzdHJpY3Rpb25cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ2FsbCBjaGFuZ2VSZXN0cmljdGlvbiBtZXRob2RcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5jaGFuZ2VSZXN0cmljdGlvbigpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGFuZ2VzIHRoZSB2aXNpYmlsaXR5IG9mIHRoZSAncnVsZXMnIHRhYiBiYXNlZCBvbiB0aGUgY2hlY2tlZCBzdGF0dXMgb2YgdGhlICdhbGxvd1Jlc3RyaWN0aW9uJyBjaGVja2JveC5cbiAgICAgKi9cbiAgICBjaGFuZ2VSZXN0cmljdGlvbigpIHtcbiAgICAgICAgaWYgKCQoJyNhbGxvd1Jlc3RyaWN0aW9uJykucGFyZW50KCkuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgJChcImFbZGF0YS10YWI9J3J1bGVzJ11cIikuc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJChcImFbZGF0YS10YWI9J3J1bGVzJ11cIikuaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnRzIHRoZSBkYXRlIGZvcm1hdCBmcm9tIGxpbnV4dGltZSB0byB0aGUgbG9jYWwgcmVwcmVzZW50YXRpb24uXG4gICAgICovXG4gICAgY2hhbmdlRGF0ZUZvcm1hdCgpIHtcbiAgICAgICAgY29uc3QgZGF0ZUZyb20gPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRkYXRlX2Zyb20uYXR0cigndmFsdWUnKTtcbiAgICAgICAgY29uc3QgZGF0ZVRvID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZGF0ZV90by5hdHRyKCd2YWx1ZScpO1xuICAgICAgICBjb25zdCBjdXJyZW50T2Zmc2V0ID0gbmV3IERhdGUoKS5nZXRUaW1lem9uZU9mZnNldCgpO1xuICAgICAgICBjb25zdCBzZXJ2ZXJPZmZzZXQgPSBwYXJzZUludChvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdzZXJ2ZXJPZmZzZXQnKSk7XG4gICAgICAgIGNvbnN0IG9mZnNldERpZmYgPSBzZXJ2ZXJPZmZzZXQgKyBjdXJyZW50T2Zmc2V0O1xuICAgICAgICBpZiAoZGF0ZUZyb20gIT09IHVuZGVmaW5lZCAmJiBkYXRlRnJvbS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBkYXRlRnJvbUluQnJvd3NlclRaID0gZGF0ZUZyb20gKiAxMDAwICsgb2Zmc2V0RGlmZiAqIDYwICogMTAwMDtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c1N0YXJ0LmNhbGVuZGFyKCdzZXQgZGF0ZScsIG5ldyBEYXRlKGRhdGVGcm9tSW5Ccm93c2VyVFopKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0ZVRvICE9PSB1bmRlZmluZWQgJiYgZGF0ZVRvLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGVUb0luQnJvd3NlclRaID0gZGF0ZVRvICogMTAwMCArIG9mZnNldERpZmYgKiA2MCAqIDEwMDA7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNFbmQuY2FsZW5kYXIoJ3NldCBkYXRlJywgbmV3IERhdGUoZGF0ZVRvSW5Ccm93c2VyVFopKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGVzIHRoZSB2aXNpYmlsaXR5IG9mIGNlcnRhaW4gZmllbGQgZ3JvdXBzIGJhc2VkIG9uIHRoZSBzZWxlY3RlZCBhY3Rpb24gdmFsdWUuXG4gICAgICovXG4gICAgdG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCkge1xuICAgICAgICBpZiAob3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnYWN0aW9uJykgPT09ICdleHRlbnNpb24nKSB7XG4gICAgICAgICAgICAkKCcjZXh0ZW5zaW9uLWdyb3VwJykuc2hvdygpO1xuICAgICAgICAgICAgJCgnI2F1ZGlvLWZpbGUtZ3JvdXAnKS5oaWRlKCk7XG4gICAgICAgICAgICAkKCcjYXVkaW9fbWVzc2FnZV9pZCcpLmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCgnI2V4dGVuc2lvbi1ncm91cCcpLmhpZGUoKTtcbiAgICAgICAgICAgICQoJyNhdWRpby1maWxlLWdyb3VwJykuc2hvdygpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZXh0ZW5zaW9uJywgLTEpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gZm9yIHZhbGlkYXRpbmcgc3BlY2lmaWMgZmllbGRzIGluIGEgZm9ybS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXN1bHQgLSBUaGUgcmVzdWx0IG9iamVjdCBjb250YWluaW5nIGZvcm0gZGF0YS5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbnxPYmplY3R9IFJldHVybnMgZmFsc2UgaWYgdmFsaWRhdGlvbiBmYWlscywgb3IgdGhlIHJlc3VsdCBvYmplY3QgaWYgdmFsaWRhdGlvbiBwYXNzZXMuXG4gICAgICovXG4gICAgY3VzdG9tVmFsaWRhdGVGb3JtKHJlc3VsdCkge1xuICAgICAgICAvLyBDaGVjayBkYXRlIGZpZWxkc1xuICAgICAgICBpZiAoKHJlc3VsdC5kYXRhLmRhdGVfZnJvbSAhPT0gJycgJiYgcmVzdWx0LmRhdGEuZGF0ZV90byA9PT0gJycpXG4gICAgICAgICAgICB8fCAocmVzdWx0LmRhdGEuZGF0ZV90byAhPT0gJycgJiYgcmVzdWx0LmRhdGEuZGF0ZV9mcm9tID09PSAnJykpIHtcbiAgICAgICAgICAgICQoJy5mb3JtIC5lcnJvci5tZXNzYWdlJykuaHRtbChnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja0RhdGVJbnRlcnZhbCkuc2hvdygpO1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIHdlZWtkYXkgZmllbGRzXG4gICAgICAgIGlmICgocmVzdWx0LmRhdGEud2Vla2RheV9mcm9tID4gMCAmJiByZXN1bHQuZGF0YS53ZWVrZGF5X3RvID09PSAnLTEnKVxuICAgICAgICAgICAgfHwgKHJlc3VsdC5kYXRhLndlZWtkYXlfdG8gPiAwICYmIHJlc3VsdC5kYXRhLndlZWtkYXlfZnJvbSA9PT0gJy0xJykpIHtcbiAgICAgICAgICAgICQoJy5mb3JtIC5lcnJvci5tZXNzYWdlJykuaHRtbChnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja1dlZWtEYXlJbnRlcnZhbCkuc2hvdygpO1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIHRpbWUgZmllbGRzXG4gICAgICAgIGlmICgocmVzdWx0LmRhdGEudGltZV9mcm9tLmxlbmd0aCA+IDAgJiYgcmVzdWx0LmRhdGEudGltZV90by5sZW5ndGggPT09IDApXG4gICAgICAgICAgICB8fCAocmVzdWx0LmRhdGEudGltZV90by5sZW5ndGggPiAwICYmIHJlc3VsdC5kYXRhLnRpbWVfZnJvbS5sZW5ndGggPT09IDApKSB7XG4gICAgICAgICAgICAkKCcuZm9ybSAuZXJyb3IubWVzc2FnZScpLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQ2hlY2tUaW1lSW50ZXJ2YWwpLnNob3coKTtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi50cmFuc2l0aW9uKCdzaGFrZScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIHRpbWUgZmllbGQgZm9ybWF0XG4gICAgICAgIGlmICgocmVzdWx0LmRhdGEudGltZV9mcm9tLmxlbmd0aCA+IDAgJiYgcmVzdWx0LmRhdGEudGltZV90by5sZW5ndGggPT09IDApXG4gICAgICAgICAgICB8fCAocmVzdWx0LmRhdGEudGltZV90by5sZW5ndGggPiAwICYmIHJlc3VsdC5kYXRhLnRpbWVfZnJvbS5sZW5ndGggPT09IDApKSB7XG4gICAgICAgICAgICAkKCcuZm9ybSAuZXJyb3IubWVzc2FnZScpLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQ2hlY2tUaW1lSW50ZXJ2YWwpLnNob3coKTtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi50cmFuc2l0aW9uKCdzaGFrZScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGFsbCBmaWVsZHNcbiAgICAgICAgaWYgKHJlc3VsdC5kYXRhLnRpbWVfZnJvbSA9PT0gJydcbiAgICAgICAgICAgICYmIHJlc3VsdC5kYXRhLnRpbWVfdG8gPT09ICcnXG4gICAgICAgICAgICAmJiByZXN1bHQuZGF0YS53ZWVrZGF5X2Zyb20gPT09ICctMSdcbiAgICAgICAgICAgICYmIHJlc3VsdC5kYXRhLndlZWtkYXlfdG8gPT09ICctMSdcbiAgICAgICAgICAgICYmIHJlc3VsdC5kYXRhLmRhdGVfZnJvbSA9PT0gJydcbiAgICAgICAgICAgICYmIHJlc3VsdC5kYXRhLmRhdGVfdG8gPT09ICcnKSB7XG4gICAgICAgICAgICAkKCcuZm9ybSAuZXJyb3IubWVzc2FnZScpLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlTm9SdWxlc1NlbGVjdGVkKS5zaG93KCk7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24udHJhbnNpdGlvbignc2hha2UnKS5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgICQoJy5mb3JtIC5lcnJvci5tZXNzYWdlJykuaHRtbCgnJykuaGlkZSgpO1xuICAgICAgICByZXN1bHQuZGF0YSA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBjb25zdCBkYXRlRnJvbSA9IG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c1N0YXJ0LmNhbGVuZGFyKCdnZXQgZGF0ZScpO1xuICAgICAgICBpZiAoZGF0ZUZyb20gIT09IG51bGwpIHtcbiAgICAgICAgICAgIGRhdGVGcm9tLnNldEhvdXJzKDAsIDAsIDAsIDApO1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuZGF0ZV9mcm9tID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQuY2FsZW5kYXIoJ2dldCBkYXRlJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZGF0ZVRvID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzRW5kLmNhbGVuZGFyKCdnZXQgZGF0ZScpO1xuICAgICAgICBpZiAoZGF0ZVRvICE9PSBudWxsKSB7XG4gICAgICAgICAgICBkYXRlVG8uc2V0SG91cnMoMjMsIDU5LCA1OSwgMCk7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5kYXRlX3RvID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzRW5kLmNhbGVuZGFyKCdnZXQgZGF0ZScpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvdXRPZldvcmtUaW1lUmVjb3JkLmN1c3RvbVZhbGlkYXRlRm9ybShyZXN1bHQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9b3V0LW9mZi13b3JrLXRpbWUvc2F2ZWA7IC8vIEZvcm0gc3VibWlzc2lvbiBVUkxcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gb3V0T2ZXb3JrVGltZVJlY29yZC52YWxpZGF0ZVJ1bGVzOyAvLyBGb3JtIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gb3V0T2ZXb3JrVGltZVJlY29yZC5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gb3V0T2ZXb3JrVGltZVJlY29yZC5jYkFmdGVyU2VuZEZvcm07IC8vIENhbGxiYWNrIGFmdGVyIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxufTtcblxuLyoqXG4gKiBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgdGhhdCBjaGVja3MgaWYgYSB2YWx1ZSBpcyBub3QgZW1wdHkgYmFzZWQgb24gYSBzcGVjaWZpYyBhY3Rpb24uXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIGJlIHZhbGlkYXRlZC5cbiAqIEBwYXJhbSB7c3RyaW5nfSBhY3Rpb24gLSBUaGUgYWN0aW9uIHRvIGNvbXBhcmUgYWdhaW5zdC5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIHRydWUgaWYgdGhlIHZhbHVlIGlzIG5vdCBlbXB0eSBvciB0aGUgYWN0aW9uIGRvZXMgbm90IG1hdGNoLCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5jdXN0b21Ob3RFbXB0eUlmQWN0aW9uUnVsZSA9ICh2YWx1ZSwgYWN0aW9uKSA9PiB7XG4gICAgaWYgKHZhbHVlLmxlbmd0aCA9PT0gMCAmJiAkKCcjYWN0aW9uJykudmFsKCkgPT09IGFjdGlvbikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBvdXQgb2Ygd29yayBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmluaXRpYWxpemUoKTtcbn0pO1xuIl19