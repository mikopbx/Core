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
   * Additional condition for the time interval
   * @type {array}
   */
  additionalTimeIntervalRules: [{
    type: 'regExp',
    value: /^(2[0-3]|1?[0-9]):([0-5]?[0-9])$/,
    prompt: globalTranslate.tf_ValidateCheckTimeInterval
  }],

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
    calUrl: {
      identifier: 'calUrl',
      rules: [{
        type: 'customNotEmptyIfCalType',
        prompt: globalTranslate.tf_ValidateCalUri
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
    }); // Initialize the calType dropdown

    $('#calType').dropdown({
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
        var newState = 'unchecked'; // Handle the change event for inbound rules table checkbox

        if ($(this).parent().checkbox('is checked')) {
          newState = 'checked';
        }

        var did = $(this).parent().attr('data-did');
        var filter = '#inbound-rules-table .ui.checkbox[data-context-id=' + $(this).parent().attr('data-context-id') + ']';

        if (did !== '' && newState === 'checked') {
          filter = filter + '.ui.checkbox[data-did=' + did + ']';
        } else if (did === '' && newState === 'unchecked') {
          filter = filter + '.ui.checkbox[data-did=""]';
        }

        $(filter).checkbox('set ' + newState);
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

    if (outOfWorkTimeRecord.$formObj.form('get value', 'calType') === 'none') {
      $('#call-type-main-tab').show();
      $('#call-type-calendar-tab').hide();
    } else {
      $('#call-type-main-tab').hide();
      $('#call-type-calendar-tab').show();
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


    if ($('#calType').parent().dropdown('get value') === 'none' && result.data.time_from === '' && result.data.time_to === '' && result.data.weekday_from === '-1' && result.data.weekday_to === '-1' && result.data.date_from === '' && result.data.date_to === '') {
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
    var dateTo = outOfWorkTimeRecord.$rangeDaysEnd.calendar('get date');
    var currentOffset = new Date().getTimezoneOffset();
    var serverOffset = parseInt(outOfWorkTimeRecord.$formObj.form('get value', 'serverOffset'));
    var offsetDiff = serverOffset + currentOffset;

    if ($('#calType').parent().dropdown('get value') === 'none') {
      Form.validateRules.timefrom.rules = outOfWorkTimeRecord.additionalTimeIntervalRules;
      Form.validateRules.timeto.rules = outOfWorkTimeRecord.additionalTimeIntervalRules;
    } else {
      Form.validateRules.timefrom.rules = [];
      Form.validateRules.timeto.rules = [];
    }

    if (dateFrom) {
      dateFrom.setHours(0, 0, 0, 0);
      result.data.date_from = Math.floor(dateFrom.getTime() / 1000) - offsetDiff * 60;
    }

    if (dateTo) {
      dateTo.setHours(23, 59, 59, 0);
      result.data.date_to = Math.floor(dateTo.getTime() / 1000) - offsetDiff * 60;
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
 * Custom form validation rule that checks if a value is not empty based on a specific action.
 *
 * @param {string} value - The value to be validated.
 * @returns {boolean} Returns true if the value is not empty or the action does not match, false otherwise.
 */


$.fn.form.settings.rules.customNotEmptyIfCalType = function (value) {
  if ($('#calType').val() === 'none') {
    return true;
  }

  try {
    var url = new URL(value);
  } catch (_) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9PdXRPZmZXb3JrVGltZS9vdXQtb2Ytd29yay10aW1lLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJvdXRPZldvcmtUaW1lUmVjb3JkIiwiJGZvcm1PYmoiLCIkIiwiJGRlZmF1bHREcm9wZG93biIsIiRyYW5nZURheXNTdGFydCIsIiRyYW5nZURheXNFbmQiLCIkcmFuZ2VUaW1lU3RhcnQiLCIkcmFuZ2VUaW1lRW5kIiwiJGRhdGVfZnJvbSIsIiRkYXRlX3RvIiwiJHRpbWVfdG8iLCIkZm9yd2FyZGluZ1NlbGVjdERyb3Bkb3duIiwiYWRkaXRpb25hbFRpbWVJbnRlcnZhbFJ1bGVzIiwidHlwZSIsInZhbHVlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwidGZfVmFsaWRhdGVDaGVja1RpbWVJbnRlcnZhbCIsInZhbGlkYXRlUnVsZXMiLCJhdWRpb19tZXNzYWdlX2lkIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidGZfVmFsaWRhdGVBdWRpb01lc3NhZ2VFbXB0eSIsImNhbFVybCIsInRmX1ZhbGlkYXRlQ2FsVXJpIiwiZXh0ZW5zaW9uIiwidGZfVmFsaWRhdGVFeHRlbnNpb25FbXB0eSIsInRpbWVmcm9tIiwib3B0aW9uYWwiLCJ0aW1ldG8iLCJpbml0aWFsaXplIiwidGFiIiwiZHJvcGRvd24iLCJjYWxlbmRhciIsImZpcnN0RGF5T2ZXZWVrIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJjYWxlbmRhckZpcnN0RGF5T2ZXZWVrIiwidGV4dCIsImNhbGVuZGFyVGV4dCIsImVuZENhbGVuZGFyIiwiaW5saW5lIiwibW9udGhGaXJzdCIsInJlZ0V4cCIsInN0YXJ0Q2FsZW5kYXIiLCJvbkNoYW5nZSIsIm5ld0RhdGVUbyIsIm9sZERhdGVUbyIsImF0dHIiLCJEYXRlIiwidHJpZ2dlciIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImRpc2FibGVNaW51dGUiLCJhbXBtIiwibmV3VGltZVRvIiwib2xkVGltZVRvIiwidG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzIiwiZnJvbSIsImZvcm0iLCJ0byIsIm9uIiwiZSIsImRhdGVfZnJvbSIsImRhdGVfdG8iLCJwcmV2ZW50RGVmYXVsdCIsIndlZWtkYXlfZnJvbSIsIndlZWtkYXlfdG8iLCJTb3VuZEZpbGVzU2VsZWN0b3IiLCJnZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5IiwiY2hhbmdlRGF0ZUZvcm1hdCIsImluaXRpYWxpemVGb3JtIiwiRXh0ZW5zaW9ucyIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRob3V0RW1wdHkiLCJjaGVja2JveCIsIm5ld1N0YXRlIiwicGFyZW50IiwiZGlkIiwiZmlsdGVyIiwiY2hhbmdlUmVzdHJpY3Rpb24iLCJzaG93IiwiaGlkZSIsImRhdGVGcm9tIiwiZGF0ZVRvIiwiY3VycmVudE9mZnNldCIsImdldFRpbWV6b25lT2Zmc2V0Iiwic2VydmVyT2Zmc2V0IiwicGFyc2VJbnQiLCJvZmZzZXREaWZmIiwidW5kZWZpbmVkIiwibGVuZ3RoIiwiZGF0ZUZyb21JbkJyb3dzZXJUWiIsImRhdGVUb0luQnJvd3NlclRaIiwiY3VzdG9tVmFsaWRhdGVGb3JtIiwicmVzdWx0IiwiZGF0YSIsImh0bWwiLCJ0Zl9WYWxpZGF0ZUNoZWNrRGF0ZUludGVydmFsIiwiJHN1Ym1pdEJ1dHRvbiIsInRyYW5zaXRpb24iLCJyZW1vdmVDbGFzcyIsInRmX1ZhbGlkYXRlQ2hlY2tXZWVrRGF5SW50ZXJ2YWwiLCJ0aW1lX2Zyb20iLCJ0aW1lX3RvIiwidGZfVmFsaWRhdGVOb1J1bGVzU2VsZWN0ZWQiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJzZXRIb3VycyIsIk1hdGgiLCJmbG9vciIsImdldFRpbWUiLCJjYkFmdGVyU2VuZEZvcm0iLCJyZXNwb25zZSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJmbiIsImN1c3RvbU5vdEVtcHR5SWZBY3Rpb25SdWxlIiwiYWN0aW9uIiwidmFsIiwiY3VzdG9tTm90RW1wdHlJZkNhbFR5cGUiLCJVUkwiLCJfIiwiZG9jdW1lbnQiLCJyZWFkeSJd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QUFPLElBQVA7QUFDSCxDQVZEO0FBYUE7QUFDQTtBQUNBOzs7QUFDQXRILENBQUMsQ0FBQ3VILFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEIxSCxFQUFBQSxtQkFBbUIsQ0FBQzhCLFVBQXBCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLGdsb2JhbFRyYW5zbGF0ZSwgRXh0ZW5zaW9ucywgRm9ybSwgU2VtYW50aWNMb2NhbGl6YXRpb24sIFNvdW5kRmlsZXNTZWxlY3RvciAqL1xuXG5cbi8qKlxuICogT2JqZWN0IGZvciBtYW5hZ2luZyBPdXQtb2YtV29yayBUaW1lIHNldHRpbmdzXG4gKlxuICogQG1vZHVsZSBvdXRPZldvcmtUaW1lUmVjb3JkXG4gKi9cbmNvbnN0IG91dE9mV29ya1RpbWVSZWNvcmQgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI3NhdmUtb3V0b2Zmd29yay1mb3JtJyksXG5cbiAgICAkZGVmYXVsdERyb3Bkb3duOiAkKCcjc2F2ZS1vdXRvZmZ3b3JrLWZvcm0gLmRyb3Bkb3duLWRlZmF1bHQnKSxcbiAgICAkcmFuZ2VEYXlzU3RhcnQ6ICQoJyNyYW5nZS1kYXlzLXN0YXJ0JyksXG4gICAgJHJhbmdlRGF5c0VuZDogJCgnI3JhbmdlLWRheXMtZW5kJyksXG4gICAgJHJhbmdlVGltZVN0YXJ0OiAkKCcjcmFuZ2UtdGltZS1zdGFydCcpLFxuICAgICRyYW5nZVRpbWVFbmQ6ICQoJyNyYW5nZS10aW1lLWVuZCcpLFxuICAgICRkYXRlX2Zyb206ICQoJyNkYXRlX2Zyb20nKSxcbiAgICAkZGF0ZV90bzogJCgnI2RhdGVfdG8nKSxcbiAgICAkdGltZV90bzogJCgnI3RpbWVfdG8nKSxcbiAgICAkZm9yd2FyZGluZ1NlbGVjdERyb3Bkb3duOiAkKCcjc2F2ZS1vdXRvZmZ3b3JrLWZvcm0gLmZvcndhcmRpbmctc2VsZWN0JyksXG5cblxuICAgIC8qKlxuICAgICAqIEFkZGl0aW9uYWwgY29uZGl0aW9uIGZvciB0aGUgdGltZSBpbnRlcnZhbFxuICAgICAqIEB0eXBlIHthcnJheX1cbiAgICAgKi9cbiAgICBhZGRpdGlvbmFsVGltZUludGVydmFsUnVsZXM6IFt7XG4gICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICB2YWx1ZTogL14oMlswLTNdfDE/WzAtOV0pOihbMC01XT9bMC05XSkkLyxcbiAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja1RpbWVJbnRlcnZhbCxcbiAgICB9XSxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBhdWRpb19tZXNzYWdlX2lkOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnYXVkaW9fbWVzc2FnZV9pZCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2N1c3RvbU5vdEVtcHR5SWZBY3Rpb25SdWxlW3BsYXltZXNzYWdlXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQXVkaW9NZXNzYWdlRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGNhbFVybDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2NhbFVybCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZSAgIDogJ2N1c3RvbU5vdEVtcHR5SWZDYWxUeXBlJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0IDogZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQ2FsVXJpXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBleHRlbnNpb246IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdleHRlbnNpb24nLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjdXN0b21Ob3RFbXB0eUlmQWN0aW9uUnVsZVtleHRlbnNpb25dJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVFeHRlbnNpb25FbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgdGltZWZyb206IHtcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3RpbWVfZnJvbScsXG4gICAgICAgICAgICBydWxlczogW3tcbiAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICB2YWx1ZTogL14oMlswLTNdfDE/WzAtOV0pOihbMC01XT9bMC05XSkkLyxcbiAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS50Zl9WYWxpZGF0ZUNoZWNrVGltZUludGVydmFsLFxuICAgICAgICAgICAgfV0sXG4gICAgICAgIH0sXG4gICAgICAgIHRpbWV0bzoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3RpbWVfdG8nLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW3tcbiAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICB2YWx1ZTogL14oMlswLTNdfDE/WzAtOV0pOihbMC01XT9bMC05XSkkLyxcbiAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS50Zl9WYWxpZGF0ZUNoZWNrVGltZUludGVydmFsLFxuICAgICAgICAgICAgfV0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBvdXQgb2Ygd29yayB0aW1lIHJlY29yZCBmb3JtLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgdGFiIGJlaGF2aW9yIGZvciB0aGUgb3V0LXRpbWUtbW9kaWZ5LW1lbnVcbiAgICAgICAgJCgnI291dC10aW1lLW1vZGlmeS1tZW51IC5pdGVtJykudGFiKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZGVmYXVsdCBkcm9wZG93blxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRkZWZhdWx0RHJvcGRvd24uZHJvcGRvd24oKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBjYWxlbmRhciBmb3IgcmFuZ2UgZGF5cyBzdGFydFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNTdGFydC5jYWxlbmRhcih7XG4gICAgICAgICAgICAvLyBDYWxlbmRhciBjb25maWd1cmF0aW9uIG9wdGlvbnNcbiAgICAgICAgICAgIGZpcnN0RGF5T2ZXZWVrOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhckZpcnN0RGF5T2ZXZWVrLFxuICAgICAgICAgICAgdGV4dDogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJUZXh0LFxuICAgICAgICAgICAgZW5kQ2FsZW5kYXI6IG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c0VuZCxcbiAgICAgICAgICAgIHR5cGU6ICdkYXRlJyxcbiAgICAgICAgICAgIGlubGluZTogZmFsc2UsXG4gICAgICAgICAgICBtb250aEZpcnN0OiBmYWxzZSxcbiAgICAgICAgICAgIHJlZ0V4cDogU2VtYW50aWNMb2NhbGl6YXRpb24ucmVnRXhwLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBjYWxlbmRhciBmb3IgcmFuZ2UgZGF5cyBlbmRcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzRW5kLmNhbGVuZGFyKHtcbiAgICAgICAgICAgIC8vIENhbGVuZGFyIGNvbmZpZ3VyYXRpb24gb3B0aW9uc1xuICAgICAgICAgICAgZmlyc3REYXlPZldlZWs6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyRmlyc3REYXlPZldlZWssXG4gICAgICAgICAgICB0ZXh0OiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQsXG4gICAgICAgICAgICBzdGFydENhbGVuZGFyOiBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNTdGFydCxcbiAgICAgICAgICAgIHR5cGU6ICdkYXRlJyxcbiAgICAgICAgICAgIGlubGluZTogZmFsc2UsXG4gICAgICAgICAgICBtb250aEZpcnN0OiBmYWxzZSxcbiAgICAgICAgICAgIHJlZ0V4cDogU2VtYW50aWNMb2NhbGl6YXRpb24ucmVnRXhwLFxuICAgICAgICAgICAgb25DaGFuZ2U6IChuZXdEYXRlVG8pID0+IHtcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgdGhlIGNoYW5nZSBldmVudCBmb3IgcmFuZ2UgdGltZSBlbmRcbiAgICAgICAgICAgICAgICBsZXQgb2xkRGF0ZVRvID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZGF0ZV90by5hdHRyKCd2YWx1ZScpO1xuICAgICAgICAgICAgICAgIGlmIChuZXdEYXRlVG8gIT09IG51bGwgJiYgb2xkRGF0ZVRvICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICBvbGREYXRlVG8gPSBuZXcgRGF0ZShvbGREYXRlVG8gKiAxMDAwKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKChuZXdEYXRlVG8gLSBvbGREYXRlVG8pICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRkYXRlX2Zyb20udHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBjYWxlbmRhciBmb3IgcmFuZ2UgdGltZSBzdGFydFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZVRpbWVTdGFydC5jYWxlbmRhcih7XG4gICAgICAgICAgICAvLyBDYWxlbmRhciBjb25maWd1cmF0aW9uIG9wdGlvbnNcbiAgICAgICAgICAgIGZpcnN0RGF5T2ZXZWVrOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhckZpcnN0RGF5T2ZXZWVrLFxuICAgICAgICAgICAgdGV4dDogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJUZXh0LFxuICAgICAgICAgICAgZW5kQ2FsZW5kYXI6IG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlVGltZUVuZCxcbiAgICAgICAgICAgIHR5cGU6ICd0aW1lJyxcbiAgICAgICAgICAgIGlubGluZTogZmFsc2UsXG4gICAgICAgICAgICBkaXNhYmxlTWludXRlOiB0cnVlLFxuICAgICAgICAgICAgYW1wbTogZmFsc2UsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGNhbGVuZGFyIGZvciByYW5nZSB0aW1lIGVuZFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZVRpbWVFbmQuY2FsZW5kYXIoe1xuICAgICAgICAgICAgLy8gQ2FsZW5kYXIgY29uZmlndXJhdGlvbiBvcHRpb25zXG4gICAgICAgICAgICBmaXJzdERheU9mV2VlazogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJGaXJzdERheU9mV2VlayxcbiAgICAgICAgICAgIHRleHQ6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dCxcbiAgICAgICAgICAgIHR5cGU6ICd0aW1lJyxcbiAgICAgICAgICAgIGlubGluZTogZmFsc2UsXG4gICAgICAgICAgICBkaXNhYmxlTWludXRlOiB0cnVlLFxuICAgICAgICAgICAgYW1wbTogZmFsc2UsXG4gICAgICAgICAgICBvbkNoYW5nZTogKG5ld1RpbWVUbykgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSB0aGUgY2hhbmdlIGV2ZW50IGZvciByYW5nZSB0aW1lIGVuZFxuICAgICAgICAgICAgICAgIGxldCBvbGRUaW1lVG8gPSBvdXRPZldvcmtUaW1lUmVjb3JkLiR0aW1lX3RvLmF0dHIoJ3ZhbHVlJyk7XG4gICAgICAgICAgICAgICAgaWYgKG5ld1RpbWVUbyAhPT0gbnVsbCAmJiBvbGRUaW1lVG8gIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIG9sZFRpbWVUbyA9IG5ldyBEYXRlKG9sZFRpbWVUbyAqIDEwMDApO1xuICAgICAgICAgICAgICAgICAgICBpZiAoKG5ld1RpbWVUbyAtIG9sZFRpbWVUbykgIT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHRpbWVfdG8udHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBhY3Rpb24gZHJvcGRvd25cbiAgICAgICAgJCgnI2FjdGlvbicpXG4gICAgICAgICAgICAuZHJvcGRvd24oe1xuICAgICAgICAgICAgICAgIG9uQ2hhbmdlKCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBIYW5kbGUgdGhlIGNoYW5nZSBldmVudCBmb3IgdGhlIGFjdGlvbiBkcm9wZG93blxuICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgY2FsVHlwZSBkcm9wZG93blxuICAgICAgICAkKCcjY2FsVHlwZScpXG4gICAgICAgICAgICAuZHJvcGRvd24oe1xuICAgICAgICAgICAgICAgIG9uQ2hhbmdlKCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBIYW5kbGUgdGhlIGNoYW5nZSBldmVudCBmb3IgdGhlIGFjdGlvbiBkcm9wZG93blxuICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSB3ZWVrZGF5X2Zyb20gZHJvcGRvd25cbiAgICAgICAgJCgnI3dlZWtkYXlfZnJvbScpXG4gICAgICAgICAgICAuZHJvcGRvd24oe1xuICAgICAgICAgICAgICAgIG9uQ2hhbmdlKCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBIYW5kbGUgdGhlIGNoYW5nZSBldmVudCBmb3IgdGhlIHdlZWtkYXlfZnJvbSBkcm9wZG93blxuICAgICAgICAgICAgICAgICAgICBjb25zdCBmcm9tID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnd2Vla2RheV9mcm9tJyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRvID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnd2Vla2RheV90bycpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZnJvbSA8IHRvIHx8IHRvID09PSAtMSB8fCBmcm9tID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnd2Vla2RheV90bycsIGZyb20pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIHdlZWtkYXlfdG8gZHJvcGRvd25cbiAgICAgICAgJCgnI3dlZWtkYXlfdG8nKVxuICAgICAgICAgICAgLmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICBvbkNoYW5nZSgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSGFuZGxlIHRoZSBjaGFuZ2UgZXZlbnQgZm9yIHRoZSB3ZWVrZGF5X3RvIGRyb3Bkb3duXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZyb20gPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICd3ZWVrZGF5X2Zyb20nKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdG8gPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICd3ZWVrZGF5X3RvJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0byA8IGZyb20gfHwgZnJvbSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ3dlZWtkYXlfZnJvbScsIHRvKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAvLyBCaW5kIGNsaWNrIGV2ZW50IHRvIGVyYXNlLWRhdGVzIGJ1dHRvblxuICAgICAgICAkKCcjZXJhc2UtZGF0ZXMnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgLy8gSGFuZGxlIHRoZSBjbGljayBldmVudCBmb3IgZXJhc2UtZGF0ZXMgYnV0dG9uXG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNTdGFydC5jYWxlbmRhcignY2xlYXInKTtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c0VuZC5jYWxlbmRhcignY2xlYXInKTtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmpcbiAgICAgICAgICAgICAgICAuZm9ybSgnc2V0IHZhbHVlcycsIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZV9mcm9tOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgZGF0ZV90bzogJycsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEJpbmQgY2xpY2sgZXZlbnQgdG8gZXJhc2Utd2Vla2RheXMgYnV0dG9uXG4gICAgICAgICQoJyNlcmFzZS13ZWVrZGF5cycpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICAvLyBIYW5kbGUgdGhlIGNsaWNrIGV2ZW50IGZvciBlcmFzZS13ZWVrZGF5cyBidXR0b25cbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmpcbiAgICAgICAgICAgICAgICAuZm9ybSgnc2V0IHZhbHVlcycsIHtcbiAgICAgICAgICAgICAgICAgICAgd2Vla2RheV9mcm9tOiAtMSxcbiAgICAgICAgICAgICAgICAgICAgd2Vla2RheV90bzogLTEsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNTdGFydC50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQmluZCBjbGljayBldmVudCB0byBlcmFzZS10aW1lcGVyaW9kIGJ1dHRvblxuICAgICAgICAkKCcjZXJhc2UtdGltZXBlcmlvZCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICAvLyBIYW5kbGUgdGhlIGNsaWNrIGV2ZW50IGZvciBlcmFzZS10aW1lcGVyaW9kIGJ1dHRvblxuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lU3RhcnQuY2FsZW5kYXIoJ2NsZWFyJyk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZVRpbWVFbmQuY2FsZW5kYXIoJ2NsZWFyJyk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR0aW1lX3RvLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGF1ZGlvLW1lc3NhZ2Utc2VsZWN0IGRyb3Bkb3duXG4gICAgICAgICQoJyNzYXZlLW91dG9mZndvcmstZm9ybSAuYXVkaW8tbWVzc2FnZS1zZWxlY3QnKS5kcm9wZG93bihTb3VuZEZpbGVzU2VsZWN0b3IuZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eSgpKTtcblxuICAgICAgICAvLyBDaGFuZ2UgdGhlIGRhdGUgZm9ybWF0IGZyb20gbGludXh0aW1lIHRvIGxvY2FsIHJlcHJlc2VudGF0aW9uXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuY2hhbmdlRGF0ZUZvcm1hdCgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGZvcm1cbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5pbml0aWFsaXplRm9ybSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGZvcndhcmRpbmdTZWxlY3REcm9wZG93blxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3J3YXJkaW5nU2VsZWN0RHJvcGRvd24uZHJvcGRvd24oRXh0ZW5zaW9ucy5nZXREcm9wZG93blNldHRpbmdzV2l0aG91dEVtcHR5KCkpO1xuXG4gICAgICAgIC8vIFRvZ2dsZSBkaXNhYmxlZCBmaWVsZCBjbGFzcyBiYXNlZCBvbiBhY3Rpb24gdmFsdWVcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcblxuICAgICAgICAvLyBCaW5kIGNoZWNrYm94IGNoYW5nZSBldmVudCBmb3IgaW5ib3VuZCBydWxlcyB0YWJsZVxuICAgICAgICAkKCcjaW5ib3VuZC1ydWxlcy10YWJsZSAudWkuY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGxldCBuZXdTdGF0ZSA9ICd1bmNoZWNrZWQnO1xuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSB0aGUgY2hhbmdlIGV2ZW50IGZvciBpbmJvdW5kIHJ1bGVzIHRhYmxlIGNoZWNrYm94XG4gICAgICAgICAgICAgICAgaWYgKCQodGhpcykucGFyZW50KCkuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgICAgICAgICBuZXdTdGF0ZSA9ICdjaGVja2VkJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgbGV0IGRpZCA9ICQodGhpcykucGFyZW50KCkuYXR0cignZGF0YS1kaWQnKTtcbiAgICAgICAgICAgICAgICBsZXQgZmlsdGVyID0gJyNpbmJvdW5kLXJ1bGVzLXRhYmxlIC51aS5jaGVja2JveFtkYXRhLWNvbnRleHQtaWQ9JyArICQodGhpcykucGFyZW50KCkuYXR0cignZGF0YS1jb250ZXh0LWlkJykgKyAnXSc7XG4gICAgICAgICAgICAgICAgaWYoZGlkICE9PSAnJyAmJiBuZXdTdGF0ZSA9PT0gJ2NoZWNrZWQnKXtcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyID0gZmlsdGVyICsgJy51aS5jaGVja2JveFtkYXRhLWRpZD0nK2RpZCsnXSc7XG4gICAgICAgICAgICAgICAgfWVsc2UgaWYoZGlkID09PSAnJyAmJiBuZXdTdGF0ZSA9PT0gJ3VuY2hlY2tlZCcpe1xuICAgICAgICAgICAgICAgICAgICBmaWx0ZXIgPSBmaWx0ZXIgKyAnLnVpLmNoZWNrYm94W2RhdGEtZGlkPVwiXCJdJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgJChmaWx0ZXIpLmNoZWNrYm94KCdzZXQgJytuZXdTdGF0ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEJpbmQgY2hlY2tib3ggY2hhbmdlIGV2ZW50IGZvciBhbGxvd1Jlc3RyaWN0aW9uIGNoZWNrYm94XG4gICAgICAgICQoJyNhbGxvd1Jlc3RyaWN0aW9uJykucGFyZW50KCkuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6IG91dE9mV29ya1RpbWVSZWNvcmQuY2hhbmdlUmVzdHJpY3Rpb25cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ2FsbCBjaGFuZ2VSZXN0cmljdGlvbiBtZXRob2RcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5jaGFuZ2VSZXN0cmljdGlvbigpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGFuZ2VzIHRoZSB2aXNpYmlsaXR5IG9mIHRoZSAncnVsZXMnIHRhYiBiYXNlZCBvbiB0aGUgY2hlY2tlZCBzdGF0dXMgb2YgdGhlICdhbGxvd1Jlc3RyaWN0aW9uJyBjaGVja2JveC5cbiAgICAgKi9cbiAgICBjaGFuZ2VSZXN0cmljdGlvbigpIHtcbiAgICAgICAgaWYgKCQoJyNhbGxvd1Jlc3RyaWN0aW9uJykucGFyZW50KCkuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgJChcImFbZGF0YS10YWI9J3J1bGVzJ11cIikuc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJChcImFbZGF0YS10YWI9J3J1bGVzJ11cIikuaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnRzIHRoZSBkYXRlIGZvcm1hdCBmcm9tIGxpbnV4dGltZSB0byB0aGUgbG9jYWwgcmVwcmVzZW50YXRpb24uXG4gICAgICovXG4gICAgY2hhbmdlRGF0ZUZvcm1hdCgpIHtcbiAgICAgICAgY29uc3QgZGF0ZUZyb20gPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRkYXRlX2Zyb20uYXR0cigndmFsdWUnKTtcbiAgICAgICAgY29uc3QgZGF0ZVRvID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZGF0ZV90by5hdHRyKCd2YWx1ZScpO1xuICAgICAgICBjb25zdCBjdXJyZW50T2Zmc2V0ID0gbmV3IERhdGUoKS5nZXRUaW1lem9uZU9mZnNldCgpO1xuICAgICAgICBjb25zdCBzZXJ2ZXJPZmZzZXQgPSBwYXJzZUludChvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdzZXJ2ZXJPZmZzZXQnKSk7XG4gICAgICAgIGNvbnN0IG9mZnNldERpZmYgPSBzZXJ2ZXJPZmZzZXQgKyBjdXJyZW50T2Zmc2V0O1xuICAgICAgICBpZiAoZGF0ZUZyb20gIT09IHVuZGVmaW5lZCAmJiBkYXRlRnJvbS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBkYXRlRnJvbUluQnJvd3NlclRaID0gZGF0ZUZyb20gKiAxMDAwICsgb2Zmc2V0RGlmZiAqIDYwICogMTAwMDtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c1N0YXJ0LmNhbGVuZGFyKCdzZXQgZGF0ZScsIG5ldyBEYXRlKGRhdGVGcm9tSW5Ccm93c2VyVFopKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0ZVRvICE9PSB1bmRlZmluZWQgJiYgZGF0ZVRvLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGVUb0luQnJvd3NlclRaID0gZGF0ZVRvICogMTAwMCArIG9mZnNldERpZmYgKiA2MCAqIDEwMDA7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNFbmQuY2FsZW5kYXIoJ3NldCBkYXRlJywgbmV3IERhdGUoZGF0ZVRvSW5Ccm93c2VyVFopKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGVzIHRoZSB2aXNpYmlsaXR5IG9mIGNlcnRhaW4gZmllbGQgZ3JvdXBzIGJhc2VkIG9uIHRoZSBzZWxlY3RlZCBhY3Rpb24gdmFsdWUuXG4gICAgICovXG4gICAgdG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCkge1xuICAgICAgICBpZihvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdhY3Rpb24nKSA9PT0gJ2V4dGVuc2lvbicpIHtcbiAgICAgICAgICAgICQoJyNleHRlbnNpb24tZ3JvdXAnKS5zaG93KCk7XG4gICAgICAgICAgICAkKCcjYXVkaW8tZmlsZS1ncm91cCcpLmhpZGUoKTtcbiAgICAgICAgICAgICQoJyNhdWRpb19tZXNzYWdlX2lkJykuZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgIH1lbHNle1xuICAgICAgICAgICAgJCgnI2V4dGVuc2lvbi1ncm91cCcpLmhpZGUoKTtcbiAgICAgICAgICAgICQoJyNhdWRpby1maWxlLWdyb3VwJykuc2hvdygpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZXh0ZW5zaW9uJywgLTEpO1xuICAgICAgICB9XG4gICAgICAgIGlmKG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2NhbFR5cGUnKSA9PT0gJ25vbmUnKXtcbiAgICAgICAgICAgICQoJyNjYWxsLXR5cGUtbWFpbi10YWInKS5zaG93KCk7XG4gICAgICAgICAgICAkKCcjY2FsbC10eXBlLWNhbGVuZGFyLXRhYicpLmhpZGUoKTtcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAkKCcjY2FsbC10eXBlLW1haW4tdGFiJykuaGlkZSgpO1xuICAgICAgICAgICAgJCgnI2NhbGwtdHlwZS1jYWxlbmRhci10YWInKS5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBmb3IgdmFsaWRhdGluZyBzcGVjaWZpYyBmaWVsZHMgaW4gYSBmb3JtLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3VsdCAtIFRoZSByZXN1bHQgb2JqZWN0IGNvbnRhaW5pbmcgZm9ybSBkYXRhLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufE9iamVjdH0gUmV0dXJucyBmYWxzZSBpZiB2YWxpZGF0aW9uIGZhaWxzLCBvciB0aGUgcmVzdWx0IG9iamVjdCBpZiB2YWxpZGF0aW9uIHBhc3Nlcy5cbiAgICAgKi9cbiAgICBjdXN0b21WYWxpZGF0ZUZvcm0ocmVzdWx0KSB7XG4gICAgICAgIC8vIENoZWNrIGRhdGUgZmllbGRzXG4gICAgICAgIGlmICgocmVzdWx0LmRhdGEuZGF0ZV9mcm9tICE9PSAnJyAmJiByZXN1bHQuZGF0YS5kYXRlX3RvID09PSAnJylcbiAgICAgICAgICAgIHx8IChyZXN1bHQuZGF0YS5kYXRlX3RvICE9PSAnJyAmJiByZXN1bHQuZGF0YS5kYXRlX2Zyb20gPT09ICcnKSkge1xuICAgICAgICAgICAgJCgnLmZvcm0gLmVycm9yLm1lc3NhZ2UnKS5odG1sKGdsb2JhbFRyYW5zbGF0ZS50Zl9WYWxpZGF0ZUNoZWNrRGF0ZUludGVydmFsKS5zaG93KCk7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24udHJhbnNpdGlvbignc2hha2UnKS5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgd2Vla2RheSBmaWVsZHNcbiAgICAgICAgaWYgKChyZXN1bHQuZGF0YS53ZWVrZGF5X2Zyb20gPiAwICYmIHJlc3VsdC5kYXRhLndlZWtkYXlfdG8gPT09ICctMScpXG4gICAgICAgICAgICB8fCAocmVzdWx0LmRhdGEud2Vla2RheV90byA+IDAgJiYgcmVzdWx0LmRhdGEud2Vla2RheV9mcm9tID09PSAnLTEnKSkge1xuICAgICAgICAgICAgJCgnLmZvcm0gLmVycm9yLm1lc3NhZ2UnKS5odG1sKGdsb2JhbFRyYW5zbGF0ZS50Zl9WYWxpZGF0ZUNoZWNrV2Vla0RheUludGVydmFsKS5zaG93KCk7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24udHJhbnNpdGlvbignc2hha2UnKS5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgdGltZSBmaWVsZHNcbiAgICAgICAgaWYgKChyZXN1bHQuZGF0YS50aW1lX2Zyb20ubGVuZ3RoID4gMCAmJiByZXN1bHQuZGF0YS50aW1lX3RvLmxlbmd0aCA9PT0gMClcbiAgICAgICAgICAgIHx8IChyZXN1bHQuZGF0YS50aW1lX3RvLmxlbmd0aCA+IDAgJiYgcmVzdWx0LmRhdGEudGltZV9mcm9tLmxlbmd0aCA9PT0gMCkpIHtcbiAgICAgICAgICAgICQoJy5mb3JtIC5lcnJvci5tZXNzYWdlJykuaHRtbChnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja1RpbWVJbnRlcnZhbCkuc2hvdygpO1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgdGltZSBmaWVsZCBmb3JtYXRcbiAgICAgICAgaWYgKChyZXN1bHQuZGF0YS50aW1lX2Zyb20ubGVuZ3RoID4gMCAmJiByZXN1bHQuZGF0YS50aW1lX3RvLmxlbmd0aCA9PT0gMClcbiAgICAgICAgICAgIHx8IChyZXN1bHQuZGF0YS50aW1lX3RvLmxlbmd0aCA+IDAgJiYgcmVzdWx0LmRhdGEudGltZV9mcm9tLmxlbmd0aCA9PT0gMCkpIHtcbiAgICAgICAgICAgICQoJy5mb3JtIC5lcnJvci5tZXNzYWdlJykuaHRtbChnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja1RpbWVJbnRlcnZhbCkuc2hvdygpO1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgYWxsIGZpZWxkc1xuICAgICAgICBpZiAoJCgnI2NhbFR5cGUnKS5wYXJlbnQoKS5kcm9wZG93bignZ2V0IHZhbHVlJykgPT09ICdub25lJ1xuICAgICAgICAgICAgJiYgcmVzdWx0LmRhdGEudGltZV9mcm9tID09PSAnJ1xuICAgICAgICAgICAgJiYgcmVzdWx0LmRhdGEudGltZV90byA9PT0gJydcbiAgICAgICAgICAgICYmIHJlc3VsdC5kYXRhLndlZWtkYXlfZnJvbSA9PT0gJy0xJ1xuICAgICAgICAgICAgJiYgcmVzdWx0LmRhdGEud2Vla2RheV90byA9PT0gJy0xJ1xuICAgICAgICAgICAgJiYgcmVzdWx0LmRhdGEuZGF0ZV9mcm9tID09PSAnJ1xuICAgICAgICAgICAgJiYgcmVzdWx0LmRhdGEuZGF0ZV90byA9PT0gJycpIHtcbiAgICAgICAgICAgICQoJy5mb3JtIC5lcnJvci5tZXNzYWdlJykuaHRtbChnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVOb1J1bGVzU2VsZWN0ZWQpLnNob3coKTtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi50cmFuc2l0aW9uKCdzaGFrZScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgJCgnLmZvcm0gLmVycm9yLm1lc3NhZ2UnKS5odG1sKCcnKS5oaWRlKCk7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIGNvbnN0IGRhdGVGcm9tID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQuY2FsZW5kYXIoJ2dldCBkYXRlJyk7XG4gICAgICAgIGNvbnN0IGRhdGVUbyA9IG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c0VuZC5jYWxlbmRhcignZ2V0IGRhdGUnKTtcbiAgICAgICAgY29uc3QgY3VycmVudE9mZnNldCA9IG5ldyBEYXRlKCkuZ2V0VGltZXpvbmVPZmZzZXQoKTtcbiAgICAgICAgY29uc3Qgc2VydmVyT2Zmc2V0ID0gcGFyc2VJbnQob3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnc2VydmVyT2Zmc2V0JykpO1xuICAgICAgICBjb25zdCBvZmZzZXREaWZmID0gc2VydmVyT2Zmc2V0ICsgY3VycmVudE9mZnNldDtcblxuICAgICAgICBpZigkKCcjY2FsVHlwZScpLnBhcmVudCgpLmRyb3Bkb3duKCdnZXQgdmFsdWUnKSA9PT0gJ25vbmUnKXtcbiAgICAgICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcy50aW1lZnJvbS5ydWxlcyA9IG91dE9mV29ya1RpbWVSZWNvcmQuYWRkaXRpb25hbFRpbWVJbnRlcnZhbFJ1bGVzO1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLnRpbWV0by5ydWxlcyA9IG91dE9mV29ya1RpbWVSZWNvcmQuYWRkaXRpb25hbFRpbWVJbnRlcnZhbFJ1bGVzO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzLnRpbWVmcm9tLnJ1bGVzID0gW107XG4gICAgICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMudGltZXRvLnJ1bGVzID0gW107XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoZGF0ZUZyb20pIHtcbiAgICAgICAgICAgIGRhdGVGcm9tLnNldEhvdXJzKDAsIDAsIDAsIDApO1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuZGF0ZV9mcm9tID0gTWF0aC5mbG9vcihkYXRlRnJvbS5nZXRUaW1lKCkvMTAwMCkgLSBvZmZzZXREaWZmICogNjA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGVUbykge1xuICAgICAgICAgICAgZGF0ZVRvLnNldEhvdXJzKDIzLCA1OSwgNTksIDApO1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuZGF0ZV90byA9IE1hdGguZmxvb3IoZGF0ZVRvLmdldFRpbWUoKS8xMDAwKSAtIG9mZnNldERpZmYgKiA2MDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3V0T2ZXb3JrVGltZVJlY29yZC5jdXN0b21WYWxpZGF0ZUZvcm0ocmVzdWx0KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfW91dC1vZmYtd29yay10aW1lL3NhdmVgOyAvLyBGb3JtIHN1Ym1pc3Npb24gVVJMXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IG91dE9mV29ya1RpbWVSZWNvcmQudmFsaWRhdGVSdWxlczsgLy8gRm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IG91dE9mV29ya1RpbWVSZWNvcmQuY2JCZWZvcmVTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYmVmb3JlIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IG91dE9mV29ya1RpbWVSZWNvcmQuY2JBZnRlclNlbmRGb3JtOyAvLyBDYWxsYmFjayBhZnRlciBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIHRoYXQgY2hlY2tzIGlmIGEgdmFsdWUgaXMgbm90IGVtcHR5IGJhc2VkIG9uIGEgc3BlY2lmaWMgYWN0aW9uLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBiZSB2YWxpZGF0ZWQuXG4gKiBAcGFyYW0ge3N0cmluZ30gYWN0aW9uIC0gVGhlIGFjdGlvbiB0byBjb21wYXJlIGFnYWluc3QuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyB0cnVlIGlmIHRoZSB2YWx1ZSBpcyBub3QgZW1wdHkgb3IgdGhlIGFjdGlvbiBkb2VzIG5vdCBtYXRjaCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuY3VzdG9tTm90RW1wdHlJZkFjdGlvblJ1bGUgPSAodmFsdWUsIGFjdGlvbikgPT4ge1xuICAgIGlmICh2YWx1ZS5sZW5ndGggPT09IDAgJiYgJCgnI2FjdGlvbicpLnZhbCgpID09PSBhY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIHRoYXQgY2hlY2tzIGlmIGEgdmFsdWUgaXMgbm90IGVtcHR5IGJhc2VkIG9uIGEgc3BlY2lmaWMgYWN0aW9uLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBiZSB2YWxpZGF0ZWQuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyB0cnVlIGlmIHRoZSB2YWx1ZSBpcyBub3QgZW1wdHkgb3IgdGhlIGFjdGlvbiBkb2VzIG5vdCBtYXRjaCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuY3VzdG9tTm90RW1wdHlJZkNhbFR5cGUgPSAodmFsdWUpID0+IHtcbiAgICBpZiAoJCgnI2NhbFR5cGUnKS52YWwoKSA9PT0gJ25vbmUnKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBsZXQgdXJsID0gbmV3IFVSTCh2YWx1ZSk7XG4gICAgfSBjYXRjaCAoXykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufTtcblxuXG4vKipcbiAqICBJbml0aWFsaXplIG91dCBvZiB3b3JrIGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIG91dE9mV29ya1RpbWVSZWNvcmQuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=