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
            Form.dataChanged();
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
            Form.dataChanged();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9PdXRPZmZXb3JrVGltZS9vdXQtb2Ytd29yay10aW1lLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJvdXRPZldvcmtUaW1lUmVjb3JkIiwiJGZvcm1PYmoiLCIkIiwiJGRlZmF1bHREcm9wZG93biIsIiRyYW5nZURheXNTdGFydCIsIiRyYW5nZURheXNFbmQiLCIkcmFuZ2VUaW1lU3RhcnQiLCIkcmFuZ2VUaW1lRW5kIiwiJGRhdGVfZnJvbSIsIiRkYXRlX3RvIiwiJHRpbWVfdG8iLCIkZm9yd2FyZGluZ1NlbGVjdERyb3Bkb3duIiwidmFsaWRhdGVSdWxlcyIsImF1ZGlvX21lc3NhZ2VfaWQiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwidGZfVmFsaWRhdGVBdWRpb01lc3NhZ2VFbXB0eSIsImV4dGVuc2lvbiIsInRmX1ZhbGlkYXRlRXh0ZW5zaW9uRW1wdHkiLCJ0aW1lZnJvbSIsIm9wdGlvbmFsIiwidmFsdWUiLCJ0Zl9WYWxpZGF0ZUNoZWNrVGltZUludGVydmFsIiwidGltZXRvIiwiaW5pdGlhbGl6ZSIsInRhYiIsImRyb3Bkb3duIiwiY2FsZW5kYXIiLCJmaXJzdERheU9mV2VlayIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiY2FsZW5kYXJGaXJzdERheU9mV2VlayIsInRleHQiLCJjYWxlbmRhclRleHQiLCJlbmRDYWxlbmRhciIsImlubGluZSIsIm1vbnRoRmlyc3QiLCJyZWdFeHAiLCJzdGFydENhbGVuZGFyIiwib25DaGFuZ2UiLCJuZXdEYXRlVG8iLCJvbGREYXRlVG8iLCJhdHRyIiwiRGF0ZSIsInRyaWdnZXIiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJkaXNhYmxlTWludXRlIiwiYW1wbSIsIm5ld1RpbWVUbyIsIm9sZFRpbWVUbyIsInRvZ2dsZURpc2FibGVkRmllbGRDbGFzcyIsImZyb20iLCJmb3JtIiwidG8iLCJvbiIsImUiLCJkYXRlX2Zyb20iLCJkYXRlX3RvIiwicHJldmVudERlZmF1bHQiLCJ3ZWVrZGF5X2Zyb20iLCJ3ZWVrZGF5X3RvIiwiU291bmRGaWxlc1NlbGVjdG9yIiwiZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eSIsImNoYW5nZURhdGVGb3JtYXQiLCJpbml0aWFsaXplRm9ybSIsIkV4dGVuc2lvbnMiLCJnZXREcm9wZG93blNldHRpbmdzV2l0aG91dEVtcHR5IiwiY2hlY2tib3giLCJwYXJlbnQiLCJjaGFuZ2VSZXN0cmljdGlvbiIsInNob3ciLCJoaWRlIiwiZGF0ZUZyb20iLCJkYXRlVG8iLCJjdXJyZW50T2Zmc2V0IiwiZ2V0VGltZXpvbmVPZmZzZXQiLCJzZXJ2ZXJPZmZzZXQiLCJwYXJzZUludCIsIm9mZnNldERpZmYiLCJ1bmRlZmluZWQiLCJsZW5ndGgiLCJkYXRlRnJvbUluQnJvd3NlclRaIiwiZGF0ZVRvSW5Ccm93c2VyVFoiLCJjdXN0b21WYWxpZGF0ZUZvcm0iLCJyZXN1bHQiLCJkYXRhIiwiaHRtbCIsInRmX1ZhbGlkYXRlQ2hlY2tEYXRlSW50ZXJ2YWwiLCIkc3VibWl0QnV0dG9uIiwidHJhbnNpdGlvbiIsInJlbW92ZUNsYXNzIiwidGZfVmFsaWRhdGVDaGVja1dlZWtEYXlJbnRlcnZhbCIsInRpbWVfZnJvbSIsInRpbWVfdG8iLCJ0Zl9WYWxpZGF0ZU5vUnVsZXNTZWxlY3RlZCIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsInNldEhvdXJzIiwiY2JBZnRlclNlbmRGb3JtIiwicmVzcG9uc2UiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwiZm4iLCJjdXN0b21Ob3RFbXB0eUlmQWN0aW9uUnVsZSIsImFjdGlvbiIsInZhbCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsbUJB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QUFBQSxJQUFJLENBQUNtRCxnQkFBTCxHQUF3QmxHLG1CQUFtQixDQUFDa0csZ0JBQTVDLENBSmEsQ0FJaUQ7O0FBQzlEbkQsSUFBQUEsSUFBSSxDQUFDc0QsZUFBTCxHQUF1QnJHLG1CQUFtQixDQUFDcUcsZUFBM0MsQ0FMYSxDQUsrQzs7QUFDNUR0RCxJQUFBQSxJQUFJLENBQUNwQixVQUFMO0FBQ0g7QUFqWXVCLENBQTVCO0FBb1lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBekIsQ0FBQyxDQUFDdUcsRUFBRixDQUFLbEQsSUFBTCxDQUFVNEMsUUFBVixDQUFtQnBGLEtBQW5CLENBQXlCMkYsMEJBQXpCLEdBQXNELFVBQUNsRixLQUFELEVBQVFtRixNQUFSLEVBQW1CO0FBQ3JFLE1BQUluRixLQUFLLENBQUMyRCxNQUFOLEtBQWlCLENBQWpCLElBQXNCakYsQ0FBQyxDQUFDLFNBQUQsQ0FBRCxDQUFhMEcsR0FBYixPQUF1QkQsTUFBakQsRUFBeUQ7QUFDckQsV0FBTyxLQUFQO0FBQ0g7O0FBQ0QsU0FBTyxJQUFQO0FBQ0gsQ0FMRDtBQU9BO0FBQ0E7QUFDQTs7O0FBQ0F6RyxDQUFDLENBQUMyRyxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCOUcsRUFBQUEsbUJBQW1CLENBQUMyQixVQUFwQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIEV4dGVuc2lvbnMsIEZvcm0sIFNlbWFudGljTG9jYWxpemF0aW9uLCBTb3VuZEZpbGVzU2VsZWN0b3IgKi9cblxuXG4vKipcbiAqIE9iamVjdCBmb3IgbWFuYWdpbmcgT3V0LW9mLVdvcmsgVGltZSBzZXR0aW5nc1xuICpcbiAqIEBtb2R1bGUgb3V0T2ZXb3JrVGltZVJlY29yZFxuICovXG5jb25zdCBvdXRPZldvcmtUaW1lUmVjb3JkID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNzYXZlLW91dG9mZndvcmstZm9ybScpLFxuXG4gICAgJGRlZmF1bHREcm9wZG93bjogJCgnI3NhdmUtb3V0b2Zmd29yay1mb3JtIC5kcm9wZG93bi1kZWZhdWx0JyksXG4gICAgJHJhbmdlRGF5c1N0YXJ0OiAkKCcjcmFuZ2UtZGF5cy1zdGFydCcpLFxuICAgICRyYW5nZURheXNFbmQ6ICQoJyNyYW5nZS1kYXlzLWVuZCcpLFxuICAgICRyYW5nZVRpbWVTdGFydDogJCgnI3JhbmdlLXRpbWUtc3RhcnQnKSxcbiAgICAkcmFuZ2VUaW1lRW5kOiAkKCcjcmFuZ2UtdGltZS1lbmQnKSxcbiAgICAkZGF0ZV9mcm9tOiAkKCcjZGF0ZV9mcm9tJyksXG4gICAgJGRhdGVfdG86ICQoJyNkYXRlX3RvJyksXG4gICAgJHRpbWVfdG86ICQoJyN0aW1lX3RvJyksXG4gICAgJGZvcndhcmRpbmdTZWxlY3REcm9wZG93bjogJCgnI3NhdmUtb3V0b2Zmd29yay1mb3JtIC5mb3J3YXJkaW5nLXNlbGVjdCcpLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGF1ZGlvX21lc3NhZ2VfaWQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdhdWRpb19tZXNzYWdlX2lkJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY3VzdG9tTm90RW1wdHlJZkFjdGlvblJ1bGVbcGxheW1lc3NhZ2VdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVBdWRpb01lc3NhZ2VFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZXh0ZW5zaW9uOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZXh0ZW5zaW9uJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY3VzdG9tTm90RW1wdHlJZkFjdGlvblJ1bGVbZXh0ZW5zaW9uXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlRXh0ZW5zaW9uRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHRpbWVmcm9tOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd0aW1lX2Zyb20nLFxuICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgdmFsdWU6IC9eKDJbMC0zXXwxP1swLTldKTooWzAtNV0/WzAtOV0pJC8sXG4gICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja1RpbWVJbnRlcnZhbCxcbiAgICAgICAgICAgIH1dLFxuICAgICAgICB9LFxuICAgICAgICB0aW1ldG86IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd0aW1lX3RvJyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgdmFsdWU6IC9eKDJbMC0zXXwxP1swLTldKTooWzAtNV0/WzAtOV0pJC8sXG4gICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja1RpbWVJbnRlcnZhbCxcbiAgICAgICAgICAgIH1dLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgb3V0IG9mIHdvcmsgdGltZSByZWNvcmQgZm9ybS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIHRhYiBiZWhhdmlvciBmb3IgdGhlIG91dC10aW1lLW1vZGlmeS1tZW51XG4gICAgICAgICQoJyNvdXQtdGltZS1tb2RpZnktbWVudSAuaXRlbScpLnRhYigpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGRlZmF1bHQgZHJvcGRvd25cbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZGVmYXVsdERyb3Bkb3duLmRyb3Bkb3duKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgY2FsZW5kYXIgZm9yIHJhbmdlIGRheXMgc3RhcnRcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQuY2FsZW5kYXIoe1xuICAgICAgICAgICAgLy8gQ2FsZW5kYXIgY29uZmlndXJhdGlvbiBvcHRpb25zXG4gICAgICAgICAgICBmaXJzdERheU9mV2VlazogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJGaXJzdERheU9mV2VlayxcbiAgICAgICAgICAgIHRleHQ6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dCxcbiAgICAgICAgICAgIGVuZENhbGVuZGFyOiBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNFbmQsXG4gICAgICAgICAgICB0eXBlOiAnZGF0ZScsXG4gICAgICAgICAgICBpbmxpbmU6IGZhbHNlLFxuICAgICAgICAgICAgbW9udGhGaXJzdDogZmFsc2UsXG4gICAgICAgICAgICByZWdFeHA6IFNlbWFudGljTG9jYWxpemF0aW9uLnJlZ0V4cCxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgY2FsZW5kYXIgZm9yIHJhbmdlIGRheXMgZW5kXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c0VuZC5jYWxlbmRhcih7XG4gICAgICAgICAgICAvLyBDYWxlbmRhciBjb25maWd1cmF0aW9uIG9wdGlvbnNcbiAgICAgICAgICAgIGZpcnN0RGF5T2ZXZWVrOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhckZpcnN0RGF5T2ZXZWVrLFxuICAgICAgICAgICAgdGV4dDogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJUZXh0LFxuICAgICAgICAgICAgc3RhcnRDYWxlbmRhcjogb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQsXG4gICAgICAgICAgICB0eXBlOiAnZGF0ZScsXG4gICAgICAgICAgICBpbmxpbmU6IGZhbHNlLFxuICAgICAgICAgICAgbW9udGhGaXJzdDogZmFsc2UsXG4gICAgICAgICAgICByZWdFeHA6IFNlbWFudGljTG9jYWxpemF0aW9uLnJlZ0V4cCxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAobmV3RGF0ZVRvKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIHRoZSBjaGFuZ2UgZXZlbnQgZm9yIHJhbmdlIHRpbWUgZW5kXG4gICAgICAgICAgICAgICAgbGV0IG9sZERhdGVUbyA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGRhdGVfdG8uYXR0cigndmFsdWUnKTtcbiAgICAgICAgICAgICAgICBpZiAobmV3RGF0ZVRvICE9PSBudWxsICYmIG9sZERhdGVUbyAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgb2xkRGF0ZVRvID0gbmV3IERhdGUob2xkRGF0ZVRvICogMTAwMCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICgobmV3RGF0ZVRvIC0gb2xkRGF0ZVRvKSAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZGF0ZV9mcm9tLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgY2FsZW5kYXIgZm9yIHJhbmdlIHRpbWUgc3RhcnRcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lU3RhcnQuY2FsZW5kYXIoe1xuICAgICAgICAgICAgLy8gQ2FsZW5kYXIgY29uZmlndXJhdGlvbiBvcHRpb25zXG4gICAgICAgICAgICBmaXJzdERheU9mV2VlazogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJGaXJzdERheU9mV2VlayxcbiAgICAgICAgICAgIHRleHQ6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dCxcbiAgICAgICAgICAgIGVuZENhbGVuZGFyOiBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZVRpbWVFbmQsXG4gICAgICAgICAgICB0eXBlOiAndGltZScsXG4gICAgICAgICAgICBpbmxpbmU6IGZhbHNlLFxuICAgICAgICAgICAgZGlzYWJsZU1pbnV0ZTogdHJ1ZSxcbiAgICAgICAgICAgIGFtcG06IGZhbHNlLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBjYWxlbmRhciBmb3IgcmFuZ2UgdGltZSBlbmRcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lRW5kLmNhbGVuZGFyKHtcbiAgICAgICAgICAgIC8vIENhbGVuZGFyIGNvbmZpZ3VyYXRpb24gb3B0aW9uc1xuICAgICAgICAgICAgZmlyc3REYXlPZldlZWs6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyRmlyc3REYXlPZldlZWssXG4gICAgICAgICAgICB0ZXh0OiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQsXG4gICAgICAgICAgICB0eXBlOiAndGltZScsXG4gICAgICAgICAgICBpbmxpbmU6IGZhbHNlLFxuICAgICAgICAgICAgZGlzYWJsZU1pbnV0ZTogdHJ1ZSxcbiAgICAgICAgICAgIGFtcG06IGZhbHNlLFxuICAgICAgICAgICAgb25DaGFuZ2U6IChuZXdUaW1lVG8pID0+IHtcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgdGhlIGNoYW5nZSBldmVudCBmb3IgcmFuZ2UgdGltZSBlbmRcbiAgICAgICAgICAgICAgICBsZXQgb2xkVGltZVRvID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kdGltZV90by5hdHRyKCd2YWx1ZScpO1xuICAgICAgICAgICAgICAgIGlmIChuZXdUaW1lVG8gIT09IG51bGwgJiYgb2xkVGltZVRvICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICBvbGRUaW1lVG8gPSBuZXcgRGF0ZShvbGRUaW1lVG8gKiAxMDAwKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKChuZXdUaW1lVG8gLSBvbGRUaW1lVG8pICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR0aW1lX3RvLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgYWN0aW9uIGRyb3Bkb3duXG4gICAgICAgICQoJyNhY3Rpb24nKVxuICAgICAgICAgICAgLmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICBvbkNoYW5nZSgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSGFuZGxlIHRoZSBjaGFuZ2UgZXZlbnQgZm9yIHRoZSBhY3Rpb24gZHJvcGRvd25cbiAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgd2Vla2RheV9mcm9tIGRyb3Bkb3duXG4gICAgICAgICQoJyN3ZWVrZGF5X2Zyb20nKVxuICAgICAgICAgICAgLmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICBvbkNoYW5nZSgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSGFuZGxlIHRoZSBjaGFuZ2UgZXZlbnQgZm9yIHRoZSB3ZWVrZGF5X2Zyb20gZHJvcGRvd25cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZnJvbSA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3dlZWtkYXlfZnJvbScpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0byA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3dlZWtkYXlfdG8nKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZyb20gPCB0byB8fCB0byA9PT0gLTEgfHwgZnJvbSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ3dlZWtkYXlfdG8nLCBmcm9tKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSB3ZWVrZGF5X3RvIGRyb3Bkb3duXG4gICAgICAgICQoJyN3ZWVrZGF5X3RvJylcbiAgICAgICAgICAgIC5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2UoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEhhbmRsZSB0aGUgY2hhbmdlIGV2ZW50IGZvciB0aGUgd2Vla2RheV90byBkcm9wZG93blxuICAgICAgICAgICAgICAgICAgICBjb25zdCBmcm9tID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnd2Vla2RheV9mcm9tJyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRvID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnd2Vla2RheV90bycpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodG8gPCBmcm9tIHx8IGZyb20gPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICd3ZWVrZGF5X2Zyb20nLCB0byk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQmluZCBjbGljayBldmVudCB0byBlcmFzZS1kYXRlcyBidXR0b25cbiAgICAgICAgJCgnI2VyYXNlLWRhdGVzJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIC8vIEhhbmRsZSB0aGUgY2xpY2sgZXZlbnQgZm9yIGVyYXNlLWRhdGVzIGJ1dHRvblxuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQuY2FsZW5kYXIoJ2NsZWFyJyk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNFbmQuY2FsZW5kYXIoJ2NsZWFyJyk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqXG4gICAgICAgICAgICAgICAgLmZvcm0oJ3NldCB2YWx1ZXMnLCB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGVfZnJvbTogJycsXG4gICAgICAgICAgICAgICAgICAgIGRhdGVfdG86ICcnLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBCaW5kIGNsaWNrIGV2ZW50IHRvIGVyYXNlLXdlZWtkYXlzIGJ1dHRvblxuICAgICAgICAkKCcjZXJhc2Utd2Vla2RheXMnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgLy8gSGFuZGxlIHRoZSBjbGljayBldmVudCBmb3IgZXJhc2Utd2Vla2RheXMgYnV0dG9uXG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqXG4gICAgICAgICAgICAgICAgLmZvcm0oJ3NldCB2YWx1ZXMnLCB7XG4gICAgICAgICAgICAgICAgICAgIHdlZWtkYXlfZnJvbTogLTEsXG4gICAgICAgICAgICAgICAgICAgIHdlZWtkYXlfdG86IC0xLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEJpbmQgY2xpY2sgZXZlbnQgdG8gZXJhc2UtdGltZXBlcmlvZCBidXR0b25cbiAgICAgICAgJCgnI2VyYXNlLXRpbWVwZXJpb2QnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgLy8gSGFuZGxlIHRoZSBjbGljayBldmVudCBmb3IgZXJhc2UtdGltZXBlcmlvZCBidXR0b25cbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlVGltZVN0YXJ0LmNhbGVuZGFyKCdjbGVhcicpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lRW5kLmNhbGVuZGFyKCdjbGVhcicpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kdGltZV90by50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBhdWRpby1tZXNzYWdlLXNlbGVjdCBkcm9wZG93blxuICAgICAgICAkKCcjc2F2ZS1vdXRvZmZ3b3JrLWZvcm0gLmF1ZGlvLW1lc3NhZ2Utc2VsZWN0JykuZHJvcGRvd24oU291bmRGaWxlc1NlbGVjdG9yLmdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkoKSk7XG5cbiAgICAgICAgLy8gQ2hhbmdlIHRoZSBkYXRlIGZvcm1hdCBmcm9tIGxpbnV4dGltZSB0byBsb2NhbCByZXByZXNlbnRhdGlvblxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmNoYW5nZURhdGVGb3JtYXQoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBmb3JtXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBmb3J3YXJkaW5nU2VsZWN0RHJvcGRvd25cbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9yd2FyZGluZ1NlbGVjdERyb3Bkb3duLmRyb3Bkb3duKEV4dGVuc2lvbnMuZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhvdXRFbXB0eSgpKTtcblxuICAgICAgICAvLyBUb2dnbGUgZGlzYWJsZWQgZmllbGQgY2xhc3MgYmFzZWQgb24gYWN0aW9uIHZhbHVlXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG5cbiAgICAgICAgLy8gQmluZCBjaGVja2JveCBjaGFuZ2UgZXZlbnQgZm9yIGluYm91bmQgcnVsZXMgdGFibGVcbiAgICAgICAgJCgnI2luYm91bmQtcnVsZXMtdGFibGUgLnVpLmNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgdGhlIGNoYW5nZSBldmVudCBmb3IgaW5ib3VuZCBydWxlcyB0YWJsZSBjaGVja2JveFxuICAgICAgICAgICAgICAgIGlmICgkKHRoaXMpLnBhcmVudCgpLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2luYm91bmQtcnVsZXMtdGFibGUgLnVpLmNoZWNrYm94W2RhdGEtZGlkPScgKyAkKHRoaXMpLnBhcmVudCgpLmF0dHIoJ2RhdGEtZGlkJykgKyAnXScpLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2luYm91bmQtcnVsZXMtdGFibGUgLnVpLmNoZWNrYm94W2RhdGEtZGlkPScgKyAkKHRoaXMpLnBhcmVudCgpLmF0dHIoJ2RhdGEtZGlkJykgKyAnXScpLmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJylcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEJpbmQgY2hlY2tib3ggY2hhbmdlIGV2ZW50IGZvciBhbGxvd1Jlc3RyaWN0aW9uIGNoZWNrYm94XG4gICAgICAgICQoJyNhbGxvd1Jlc3RyaWN0aW9uJykucGFyZW50KCkuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6IG91dE9mV29ya1RpbWVSZWNvcmQuY2hhbmdlUmVzdHJpY3Rpb25cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ2FsbCBjaGFuZ2VSZXN0cmljdGlvbiBtZXRob2RcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5jaGFuZ2VSZXN0cmljdGlvbigpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGFuZ2VzIHRoZSB2aXNpYmlsaXR5IG9mIHRoZSAncnVsZXMnIHRhYiBiYXNlZCBvbiB0aGUgY2hlY2tlZCBzdGF0dXMgb2YgdGhlICdhbGxvd1Jlc3RyaWN0aW9uJyBjaGVja2JveC5cbiAgICAgKi9cbiAgICBjaGFuZ2VSZXN0cmljdGlvbigpIHtcbiAgICAgICAgaWYgKCQoJyNhbGxvd1Jlc3RyaWN0aW9uJykucGFyZW50KCkuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgJChcImFbZGF0YS10YWI9J3J1bGVzJ11cIikuc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJChcImFbZGF0YS10YWI9J3J1bGVzJ11cIikuaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnRzIHRoZSBkYXRlIGZvcm1hdCBmcm9tIGxpbnV4dGltZSB0byB0aGUgbG9jYWwgcmVwcmVzZW50YXRpb24uXG4gICAgICovXG4gICAgY2hhbmdlRGF0ZUZvcm1hdCgpIHtcbiAgICAgICAgY29uc3QgZGF0ZUZyb20gPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRkYXRlX2Zyb20uYXR0cigndmFsdWUnKTtcbiAgICAgICAgY29uc3QgZGF0ZVRvID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZGF0ZV90by5hdHRyKCd2YWx1ZScpO1xuICAgICAgICBjb25zdCBjdXJyZW50T2Zmc2V0ID0gbmV3IERhdGUoKS5nZXRUaW1lem9uZU9mZnNldCgpO1xuICAgICAgICBjb25zdCBzZXJ2ZXJPZmZzZXQgPSBwYXJzZUludChvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdzZXJ2ZXJPZmZzZXQnKSk7XG4gICAgICAgIGNvbnN0IG9mZnNldERpZmYgPSBzZXJ2ZXJPZmZzZXQgKyBjdXJyZW50T2Zmc2V0O1xuICAgICAgICBpZiAoZGF0ZUZyb20gIT09IHVuZGVmaW5lZCAmJiBkYXRlRnJvbS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBkYXRlRnJvbUluQnJvd3NlclRaID0gZGF0ZUZyb20gKiAxMDAwICsgb2Zmc2V0RGlmZiAqIDYwICogMTAwMDtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c1N0YXJ0LmNhbGVuZGFyKCdzZXQgZGF0ZScsIG5ldyBEYXRlKGRhdGVGcm9tSW5Ccm93c2VyVFopKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0ZVRvICE9PSB1bmRlZmluZWQgJiYgZGF0ZVRvLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGVUb0luQnJvd3NlclRaID0gZGF0ZVRvICogMTAwMCArIG9mZnNldERpZmYgKiA2MCAqIDEwMDA7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNFbmQuY2FsZW5kYXIoJ3NldCBkYXRlJywgbmV3IERhdGUoZGF0ZVRvSW5Ccm93c2VyVFopKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGVzIHRoZSB2aXNpYmlsaXR5IG9mIGNlcnRhaW4gZmllbGQgZ3JvdXBzIGJhc2VkIG9uIHRoZSBzZWxlY3RlZCBhY3Rpb24gdmFsdWUuXG4gICAgICovXG4gICAgdG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCkge1xuICAgICAgICBpZiAob3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnYWN0aW9uJykgPT09ICdleHRlbnNpb24nKSB7XG4gICAgICAgICAgICAkKCcjZXh0ZW5zaW9uLWdyb3VwJykuc2hvdygpO1xuICAgICAgICAgICAgJCgnI2F1ZGlvLWZpbGUtZ3JvdXAnKS5oaWRlKCk7XG4gICAgICAgICAgICAkKCcjYXVkaW9fbWVzc2FnZV9pZCcpLmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCgnI2V4dGVuc2lvbi1ncm91cCcpLmhpZGUoKTtcbiAgICAgICAgICAgICQoJyNhdWRpby1maWxlLWdyb3VwJykuc2hvdygpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZXh0ZW5zaW9uJywgLTEpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gZm9yIHZhbGlkYXRpbmcgc3BlY2lmaWMgZmllbGRzIGluIGEgZm9ybS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXN1bHQgLSBUaGUgcmVzdWx0IG9iamVjdCBjb250YWluaW5nIGZvcm0gZGF0YS5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbnxPYmplY3R9IFJldHVybnMgZmFsc2UgaWYgdmFsaWRhdGlvbiBmYWlscywgb3IgdGhlIHJlc3VsdCBvYmplY3QgaWYgdmFsaWRhdGlvbiBwYXNzZXMuXG4gICAgICovXG4gICAgY3VzdG9tVmFsaWRhdGVGb3JtKHJlc3VsdCkge1xuICAgICAgICAvLyBDaGVjayBkYXRlIGZpZWxkc1xuICAgICAgICBpZiAoKHJlc3VsdC5kYXRhLmRhdGVfZnJvbSAhPT0gJycgJiYgcmVzdWx0LmRhdGEuZGF0ZV90byA9PT0gJycpXG4gICAgICAgICAgICB8fCAocmVzdWx0LmRhdGEuZGF0ZV90byAhPT0gJycgJiYgcmVzdWx0LmRhdGEuZGF0ZV9mcm9tID09PSAnJykpIHtcbiAgICAgICAgICAgICQoJy5mb3JtIC5lcnJvci5tZXNzYWdlJykuaHRtbChnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja0RhdGVJbnRlcnZhbCkuc2hvdygpO1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIHdlZWtkYXkgZmllbGRzXG4gICAgICAgIGlmICgocmVzdWx0LmRhdGEud2Vla2RheV9mcm9tID4gMCAmJiByZXN1bHQuZGF0YS53ZWVrZGF5X3RvID09PSAnLTEnKVxuICAgICAgICAgICAgfHwgKHJlc3VsdC5kYXRhLndlZWtkYXlfdG8gPiAwICYmIHJlc3VsdC5kYXRhLndlZWtkYXlfZnJvbSA9PT0gJy0xJykpIHtcbiAgICAgICAgICAgICQoJy5mb3JtIC5lcnJvci5tZXNzYWdlJykuaHRtbChnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja1dlZWtEYXlJbnRlcnZhbCkuc2hvdygpO1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIHRpbWUgZmllbGRzXG4gICAgICAgIGlmICgocmVzdWx0LmRhdGEudGltZV9mcm9tLmxlbmd0aCA+IDAgJiYgcmVzdWx0LmRhdGEudGltZV90by5sZW5ndGggPT09IDApXG4gICAgICAgICAgICB8fCAocmVzdWx0LmRhdGEudGltZV90by5sZW5ndGggPiAwICYmIHJlc3VsdC5kYXRhLnRpbWVfZnJvbS5sZW5ndGggPT09IDApKSB7XG4gICAgICAgICAgICAkKCcuZm9ybSAuZXJyb3IubWVzc2FnZScpLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQ2hlY2tUaW1lSW50ZXJ2YWwpLnNob3coKTtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi50cmFuc2l0aW9uKCdzaGFrZScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIHRpbWUgZmllbGQgZm9ybWF0XG4gICAgICAgIGlmICgocmVzdWx0LmRhdGEudGltZV9mcm9tLmxlbmd0aCA+IDAgJiYgcmVzdWx0LmRhdGEudGltZV90by5sZW5ndGggPT09IDApXG4gICAgICAgICAgICB8fCAocmVzdWx0LmRhdGEudGltZV90by5sZW5ndGggPiAwICYmIHJlc3VsdC5kYXRhLnRpbWVfZnJvbS5sZW5ndGggPT09IDApKSB7XG4gICAgICAgICAgICAkKCcuZm9ybSAuZXJyb3IubWVzc2FnZScpLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQ2hlY2tUaW1lSW50ZXJ2YWwpLnNob3coKTtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi50cmFuc2l0aW9uKCdzaGFrZScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGFsbCBmaWVsZHNcbiAgICAgICAgaWYgKHJlc3VsdC5kYXRhLnRpbWVfZnJvbSA9PT0gJydcbiAgICAgICAgICAgICYmIHJlc3VsdC5kYXRhLnRpbWVfdG8gPT09ICcnXG4gICAgICAgICAgICAmJiByZXN1bHQuZGF0YS53ZWVrZGF5X2Zyb20gPT09ICctMSdcbiAgICAgICAgICAgICYmIHJlc3VsdC5kYXRhLndlZWtkYXlfdG8gPT09ICctMSdcbiAgICAgICAgICAgICYmIHJlc3VsdC5kYXRhLmRhdGVfZnJvbSA9PT0gJydcbiAgICAgICAgICAgICYmIHJlc3VsdC5kYXRhLmRhdGVfdG8gPT09ICcnKSB7XG4gICAgICAgICAgICAkKCcuZm9ybSAuZXJyb3IubWVzc2FnZScpLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlTm9SdWxlc1NlbGVjdGVkKS5zaG93KCk7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24udHJhbnNpdGlvbignc2hha2UnKS5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgICQoJy5mb3JtIC5lcnJvci5tZXNzYWdlJykuaHRtbCgnJykuaGlkZSgpO1xuICAgICAgICByZXN1bHQuZGF0YSA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBjb25zdCBkYXRlRnJvbSA9IG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c1N0YXJ0LmNhbGVuZGFyKCdnZXQgZGF0ZScpO1xuICAgICAgICBpZiAoZGF0ZUZyb20gIT09IG51bGwpIHtcbiAgICAgICAgICAgIGRhdGVGcm9tLnNldEhvdXJzKDAsIDAsIDAsIDApO1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuZGF0ZV9mcm9tID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQuY2FsZW5kYXIoJ2dldCBkYXRlJyk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZGF0ZVRvID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzRW5kLmNhbGVuZGFyKCdnZXQgZGF0ZScpO1xuICAgICAgICBpZiAoZGF0ZVRvICE9PSBudWxsKSB7XG4gICAgICAgICAgICBkYXRlVG8uc2V0SG91cnMoMjMsIDU5LCA1OSwgMCk7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5kYXRlX3RvID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzRW5kLmNhbGVuZGFyKCdnZXQgZGF0ZScpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvdXRPZldvcmtUaW1lUmVjb3JkLmN1c3RvbVZhbGlkYXRlRm9ybShyZXN1bHQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9b3V0LW9mZi13b3JrLXRpbWUvc2F2ZWA7IC8vIEZvcm0gc3VibWlzc2lvbiBVUkxcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gb3V0T2ZXb3JrVGltZVJlY29yZC52YWxpZGF0ZVJ1bGVzOyAvLyBGb3JtIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gb3V0T2ZXb3JrVGltZVJlY29yZC5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gb3V0T2ZXb3JrVGltZVJlY29yZC5jYkFmdGVyU2VuZEZvcm07IC8vIENhbGxiYWNrIGFmdGVyIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxufTtcblxuLyoqXG4gKiBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgdGhhdCBjaGVja3MgaWYgYSB2YWx1ZSBpcyBub3QgZW1wdHkgYmFzZWQgb24gYSBzcGVjaWZpYyBhY3Rpb24uXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIGJlIHZhbGlkYXRlZC5cbiAqIEBwYXJhbSB7c3RyaW5nfSBhY3Rpb24gLSBUaGUgYWN0aW9uIHRvIGNvbXBhcmUgYWdhaW5zdC5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIHRydWUgaWYgdGhlIHZhbHVlIGlzIG5vdCBlbXB0eSBvciB0aGUgYWN0aW9uIGRvZXMgbm90IG1hdGNoLCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5jdXN0b21Ob3RFbXB0eUlmQWN0aW9uUnVsZSA9ICh2YWx1ZSwgYWN0aW9uKSA9PiB7XG4gICAgaWYgKHZhbHVlLmxlbmd0aCA9PT0gMCAmJiAkKCcjYWN0aW9uJykudmFsKCkgPT09IGFjdGlvbikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBvdXQgb2Ygd29yayBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmluaXRpYWxpemUoKTtcbn0pO1xuIl19