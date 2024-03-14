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
    var dateTo = outOfWorkTimeRecord.$rangeDaysEnd.calendar('get date');
    var currentOffset = new Date().getTimezoneOffset();
    var serverOffset = parseInt(outOfWorkTimeRecord.$formObj.form('get value', 'serverOffset'));
    var offsetDiff = serverOffset + currentOffset;

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9PdXRPZmZXb3JrVGltZS9vdXQtb2Ytd29yay10aW1lLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJvdXRPZldvcmtUaW1lUmVjb3JkIiwiJGZvcm1PYmoiLCIkIiwiJGRlZmF1bHREcm9wZG93biIsIiRyYW5nZURheXNTdGFydCIsIiRyYW5nZURheXNFbmQiLCIkcmFuZ2VUaW1lU3RhcnQiLCIkcmFuZ2VUaW1lRW5kIiwiJGRhdGVfZnJvbSIsIiRkYXRlX3RvIiwiJHRpbWVfdG8iLCIkZm9yd2FyZGluZ1NlbGVjdERyb3Bkb3duIiwidmFsaWRhdGVSdWxlcyIsImF1ZGlvX21lc3NhZ2VfaWQiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwidGZfVmFsaWRhdGVBdWRpb01lc3NhZ2VFbXB0eSIsImNhbFVybCIsInRmX1ZhbGlkYXRlQ2FsVXJpIiwiZXh0ZW5zaW9uIiwidGZfVmFsaWRhdGVFeHRlbnNpb25FbXB0eSIsInRpbWVmcm9tIiwib3B0aW9uYWwiLCJ2YWx1ZSIsInRmX1ZhbGlkYXRlQ2hlY2tUaW1lSW50ZXJ2YWwiLCJ0aW1ldG8iLCJpbml0aWFsaXplIiwidGFiIiwiZHJvcGRvd24iLCJjYWxlbmRhciIsImZpcnN0RGF5T2ZXZWVrIiwiU2VtYW50aWNMb2NhbGl6YXRpb24iLCJjYWxlbmRhckZpcnN0RGF5T2ZXZWVrIiwidGV4dCIsImNhbGVuZGFyVGV4dCIsImVuZENhbGVuZGFyIiwiaW5saW5lIiwibW9udGhGaXJzdCIsInJlZ0V4cCIsInN0YXJ0Q2FsZW5kYXIiLCJvbkNoYW5nZSIsIm5ld0RhdGVUbyIsIm9sZERhdGVUbyIsImF0dHIiLCJEYXRlIiwidHJpZ2dlciIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImRpc2FibGVNaW51dGUiLCJhbXBtIiwibmV3VGltZVRvIiwib2xkVGltZVRvIiwidG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzIiwiZnJvbSIsImZvcm0iLCJ0byIsIm9uIiwiZSIsImRhdGVfZnJvbSIsImRhdGVfdG8iLCJwcmV2ZW50RGVmYXVsdCIsIndlZWtkYXlfZnJvbSIsIndlZWtkYXlfdG8iLCJTb3VuZEZpbGVzU2VsZWN0b3IiLCJnZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5IiwiY2hhbmdlRGF0ZUZvcm1hdCIsImluaXRpYWxpemVGb3JtIiwiRXh0ZW5zaW9ucyIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRob3V0RW1wdHkiLCJjaGVja2JveCIsIm5ld1N0YXRlIiwicGFyZW50IiwiZGlkIiwiZmlsdGVyIiwiY2hhbmdlUmVzdHJpY3Rpb24iLCJzaG93IiwiaGlkZSIsImRhdGVGcm9tIiwiZGF0ZVRvIiwiY3VycmVudE9mZnNldCIsImdldFRpbWV6b25lT2Zmc2V0Iiwic2VydmVyT2Zmc2V0IiwicGFyc2VJbnQiLCJvZmZzZXREaWZmIiwidW5kZWZpbmVkIiwibGVuZ3RoIiwiZGF0ZUZyb21JbkJyb3dzZXJUWiIsImRhdGVUb0luQnJvd3NlclRaIiwiY3VzdG9tVmFsaWRhdGVGb3JtIiwicmVzdWx0IiwiZGF0YSIsImh0bWwiLCJ0Zl9WYWxpZGF0ZUNoZWNrRGF0ZUludGVydmFsIiwiJHN1Ym1pdEJ1dHRvbiIsInRyYW5zaXRpb24iLCJyZW1vdmVDbGFzcyIsInRmX1ZhbGlkYXRlQ2hlY2tXZWVrRGF5SW50ZXJ2YWwiLCJ0aW1lX2Zyb20iLCJ0aW1lX3RvIiwidGZfVmFsaWRhdGVOb1J1bGVzU2VsZWN0ZWQiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJzZXRIb3VycyIsIk1hdGgiLCJmbG9vciIsImdldFRpbWUiLCJjYkFmdGVyU2VuZEZvcm0iLCJyZXNwb25zZSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJmbiIsImN1c3RvbU5vdEVtcHR5SWZBY3Rpb25SdWxlIiwiYWN0aW9uIiwidmFsIiwiY3VzdG9tTm90RW1wdHlJZkNhbFR5cGUiLCJVUkwiLCJfIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7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LEtBQUQsRUFBVztBQUMxRCxNQUFJeEIsQ0FBQyxDQUFDLFVBQUQsQ0FBRCxDQUFja0gsR0FBZCxPQUF3QixNQUE1QixFQUFvQztBQUNoQyxXQUFPLElBQVA7QUFDSDs7QUFDRCxNQUFJO0FBQ0EsUUFBSUwsR0FBRyxHQUFHLElBQUlPLEdBQUosQ0FBUTVGLEtBQVIsQ0FBVjtBQUNILEdBRkQsQ0FFRSxPQUFPNkYsQ0FBUCxFQUFVO0FBQ1IsV0FBTyxLQUFQO0FBQ0g7O0FBQ0QsU0FBTyxJQUFQO0FBQ0gsQ0FWRDtBQWFBO0FBQ0E7QUFDQTs7O0FBQ0FySCxDQUFDLENBQUNzSCxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCekgsRUFBQUEsbUJBQW1CLENBQUM2QixVQUFwQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIEV4dGVuc2lvbnMsIEZvcm0sIFNlbWFudGljTG9jYWxpemF0aW9uLCBTb3VuZEZpbGVzU2VsZWN0b3IgKi9cblxuXG4vKipcbiAqIE9iamVjdCBmb3IgbWFuYWdpbmcgT3V0LW9mLVdvcmsgVGltZSBzZXR0aW5nc1xuICpcbiAqIEBtb2R1bGUgb3V0T2ZXb3JrVGltZVJlY29yZFxuICovXG5jb25zdCBvdXRPZldvcmtUaW1lUmVjb3JkID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNzYXZlLW91dG9mZndvcmstZm9ybScpLFxuXG4gICAgJGRlZmF1bHREcm9wZG93bjogJCgnI3NhdmUtb3V0b2Zmd29yay1mb3JtIC5kcm9wZG93bi1kZWZhdWx0JyksXG4gICAgJHJhbmdlRGF5c1N0YXJ0OiAkKCcjcmFuZ2UtZGF5cy1zdGFydCcpLFxuICAgICRyYW5nZURheXNFbmQ6ICQoJyNyYW5nZS1kYXlzLWVuZCcpLFxuICAgICRyYW5nZVRpbWVTdGFydDogJCgnI3JhbmdlLXRpbWUtc3RhcnQnKSxcbiAgICAkcmFuZ2VUaW1lRW5kOiAkKCcjcmFuZ2UtdGltZS1lbmQnKSxcbiAgICAkZGF0ZV9mcm9tOiAkKCcjZGF0ZV9mcm9tJyksXG4gICAgJGRhdGVfdG86ICQoJyNkYXRlX3RvJyksXG4gICAgJHRpbWVfdG86ICQoJyN0aW1lX3RvJyksXG4gICAgJGZvcndhcmRpbmdTZWxlY3REcm9wZG93bjogJCgnI3NhdmUtb3V0b2Zmd29yay1mb3JtIC5mb3J3YXJkaW5nLXNlbGVjdCcpLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGF1ZGlvX21lc3NhZ2VfaWQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdhdWRpb19tZXNzYWdlX2lkJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY3VzdG9tTm90RW1wdHlJZkFjdGlvblJ1bGVbcGxheW1lc3NhZ2VdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVBdWRpb01lc3NhZ2VFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgY2FsVXJsOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnY2FsVXJsJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlICAgOiAnY3VzdG9tTm90RW1wdHlJZkNhbFR5cGUnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQgOiBnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDYWxVcmlcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIGV4dGVuc2lvbjoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2V4dGVuc2lvbicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2N1c3RvbU5vdEVtcHR5SWZBY3Rpb25SdWxlW2V4dGVuc2lvbl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS50Zl9WYWxpZGF0ZUV4dGVuc2lvbkVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICB0aW1lZnJvbToge1xuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBpZGVudGlmaWVyOiAndGltZV9mcm9tJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbe1xuICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgIHZhbHVlOiAvXigyWzAtM118MT9bMC05XSk6KFswLTVdP1swLTldKSQvLFxuICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQ2hlY2tUaW1lSW50ZXJ2YWwsXG4gICAgICAgICAgICB9XSxcbiAgICAgICAgfSxcbiAgICAgICAgdGltZXRvOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAndGltZV90bycsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbe1xuICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgIHZhbHVlOiAvXigyWzAtM118MT9bMC05XSk6KFswLTVdP1swLTldKSQvLFxuICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQ2hlY2tUaW1lSW50ZXJ2YWwsXG4gICAgICAgICAgICB9XSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIG91dCBvZiB3b3JrIHRpbWUgcmVjb3JkIGZvcm0uXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0YWIgYmVoYXZpb3IgZm9yIHRoZSBvdXQtdGltZS1tb2RpZnktbWVudVxuICAgICAgICAkKCcjb3V0LXRpbWUtbW9kaWZ5LW1lbnUgLml0ZW0nKS50YWIoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBkZWZhdWx0IGRyb3Bkb3duXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGRlZmF1bHREcm9wZG93bi5kcm9wZG93bigpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGNhbGVuZGFyIGZvciByYW5nZSBkYXlzIHN0YXJ0XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c1N0YXJ0LmNhbGVuZGFyKHtcbiAgICAgICAgICAgIC8vIENhbGVuZGFyIGNvbmZpZ3VyYXRpb24gb3B0aW9uc1xuICAgICAgICAgICAgZmlyc3REYXlPZldlZWs6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyRmlyc3REYXlPZldlZWssXG4gICAgICAgICAgICB0ZXh0OiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQsXG4gICAgICAgICAgICBlbmRDYWxlbmRhcjogb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzRW5kLFxuICAgICAgICAgICAgdHlwZTogJ2RhdGUnLFxuICAgICAgICAgICAgaW5saW5lOiBmYWxzZSxcbiAgICAgICAgICAgIG1vbnRoRmlyc3Q6IGZhbHNlLFxuICAgICAgICAgICAgcmVnRXhwOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5yZWdFeHAsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGNhbGVuZGFyIGZvciByYW5nZSBkYXlzIGVuZFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNFbmQuY2FsZW5kYXIoe1xuICAgICAgICAgICAgLy8gQ2FsZW5kYXIgY29uZmlndXJhdGlvbiBvcHRpb25zXG4gICAgICAgICAgICBmaXJzdERheU9mV2VlazogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJGaXJzdERheU9mV2VlayxcbiAgICAgICAgICAgIHRleHQ6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dCxcbiAgICAgICAgICAgIHN0YXJ0Q2FsZW5kYXI6IG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c1N0YXJ0LFxuICAgICAgICAgICAgdHlwZTogJ2RhdGUnLFxuICAgICAgICAgICAgaW5saW5lOiBmYWxzZSxcbiAgICAgICAgICAgIG1vbnRoRmlyc3Q6IGZhbHNlLFxuICAgICAgICAgICAgcmVnRXhwOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5yZWdFeHAsXG4gICAgICAgICAgICBvbkNoYW5nZTogKG5ld0RhdGVUbykgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSB0aGUgY2hhbmdlIGV2ZW50IGZvciByYW5nZSB0aW1lIGVuZFxuICAgICAgICAgICAgICAgIGxldCBvbGREYXRlVG8gPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRkYXRlX3RvLmF0dHIoJ3ZhbHVlJyk7XG4gICAgICAgICAgICAgICAgaWYgKG5ld0RhdGVUbyAhPT0gbnVsbCAmJiBvbGREYXRlVG8gIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIG9sZERhdGVUbyA9IG5ldyBEYXRlKG9sZERhdGVUbyAqIDEwMDApO1xuICAgICAgICAgICAgICAgICAgICBpZiAoKG5ld0RhdGVUbyAtIG9sZERhdGVUbykgIT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGRhdGVfZnJvbS50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGNhbGVuZGFyIGZvciByYW5nZSB0aW1lIHN0YXJ0XG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlVGltZVN0YXJ0LmNhbGVuZGFyKHtcbiAgICAgICAgICAgIC8vIENhbGVuZGFyIGNvbmZpZ3VyYXRpb24gb3B0aW9uc1xuICAgICAgICAgICAgZmlyc3REYXlPZldlZWs6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyRmlyc3REYXlPZldlZWssXG4gICAgICAgICAgICB0ZXh0OiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQsXG4gICAgICAgICAgICBlbmRDYWxlbmRhcjogb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lRW5kLFxuICAgICAgICAgICAgdHlwZTogJ3RpbWUnLFxuICAgICAgICAgICAgaW5saW5lOiBmYWxzZSxcbiAgICAgICAgICAgIGRpc2FibGVNaW51dGU6IHRydWUsXG4gICAgICAgICAgICBhbXBtOiBmYWxzZSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgY2FsZW5kYXIgZm9yIHJhbmdlIHRpbWUgZW5kXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlVGltZUVuZC5jYWxlbmRhcih7XG4gICAgICAgICAgICAvLyBDYWxlbmRhciBjb25maWd1cmF0aW9uIG9wdGlvbnNcbiAgICAgICAgICAgIGZpcnN0RGF5T2ZXZWVrOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhckZpcnN0RGF5T2ZXZWVrLFxuICAgICAgICAgICAgdGV4dDogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJUZXh0LFxuICAgICAgICAgICAgdHlwZTogJ3RpbWUnLFxuICAgICAgICAgICAgaW5saW5lOiBmYWxzZSxcbiAgICAgICAgICAgIGRpc2FibGVNaW51dGU6IHRydWUsXG4gICAgICAgICAgICBhbXBtOiBmYWxzZSxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAobmV3VGltZVRvKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIHRoZSBjaGFuZ2UgZXZlbnQgZm9yIHJhbmdlIHRpbWUgZW5kXG4gICAgICAgICAgICAgICAgbGV0IG9sZFRpbWVUbyA9IG91dE9mV29ya1RpbWVSZWNvcmQuJHRpbWVfdG8uYXR0cigndmFsdWUnKTtcbiAgICAgICAgICAgICAgICBpZiAobmV3VGltZVRvICE9PSBudWxsICYmIG9sZFRpbWVUbyAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgb2xkVGltZVRvID0gbmV3IERhdGUob2xkVGltZVRvICogMTAwMCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICgobmV3VGltZVRvIC0gb2xkVGltZVRvKSAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kdGltZV90by50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGFjdGlvbiBkcm9wZG93blxuICAgICAgICAkKCcjYWN0aW9uJylcbiAgICAgICAgICAgIC5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2UoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEhhbmRsZSB0aGUgY2hhbmdlIGV2ZW50IGZvciB0aGUgYWN0aW9uIGRyb3Bkb3duXG4gICAgICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBjYWxUeXBlIGRyb3Bkb3duXG4gICAgICAgICQoJyNjYWxUeXBlJylcbiAgICAgICAgICAgIC5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2UoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEhhbmRsZSB0aGUgY2hhbmdlIGV2ZW50IGZvciB0aGUgYWN0aW9uIGRyb3Bkb3duXG4gICAgICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIHdlZWtkYXlfZnJvbSBkcm9wZG93blxuICAgICAgICAkKCcjd2Vla2RheV9mcm9tJylcbiAgICAgICAgICAgIC5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2UoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEhhbmRsZSB0aGUgY2hhbmdlIGV2ZW50IGZvciB0aGUgd2Vla2RheV9mcm9tIGRyb3Bkb3duXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZyb20gPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICd3ZWVrZGF5X2Zyb20nKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdG8gPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICd3ZWVrZGF5X3RvJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmcm9tIDwgdG8gfHwgdG8gPT09IC0xIHx8IGZyb20gPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICd3ZWVrZGF5X3RvJywgZnJvbSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgd2Vla2RheV90byBkcm9wZG93blxuICAgICAgICAkKCcjd2Vla2RheV90bycpXG4gICAgICAgICAgICAuZHJvcGRvd24oe1xuICAgICAgICAgICAgICAgIG9uQ2hhbmdlKCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBIYW5kbGUgdGhlIGNoYW5nZSBldmVudCBmb3IgdGhlIHdlZWtkYXlfdG8gZHJvcGRvd25cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZnJvbSA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3dlZWtkYXlfZnJvbScpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0byA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3dlZWtkYXlfdG8nKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRvIDwgZnJvbSB8fCBmcm9tID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnd2Vla2RheV9mcm9tJywgdG8pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEJpbmQgY2xpY2sgZXZlbnQgdG8gZXJhc2UtZGF0ZXMgYnV0dG9uXG4gICAgICAgICQoJyNlcmFzZS1kYXRlcycpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICAvLyBIYW5kbGUgdGhlIGNsaWNrIGV2ZW50IGZvciBlcmFzZS1kYXRlcyBidXR0b25cbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c1N0YXJ0LmNhbGVuZGFyKCdjbGVhcicpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzRW5kLmNhbGVuZGFyKCdjbGVhcicpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9ialxuICAgICAgICAgICAgICAgIC5mb3JtKCdzZXQgdmFsdWVzJywge1xuICAgICAgICAgICAgICAgICAgICBkYXRlX2Zyb206ICcnLFxuICAgICAgICAgICAgICAgICAgICBkYXRlX3RvOiAnJyxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQmluZCBjbGljayBldmVudCB0byBlcmFzZS13ZWVrZGF5cyBidXR0b25cbiAgICAgICAgJCgnI2VyYXNlLXdlZWtkYXlzJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIC8vIEhhbmRsZSB0aGUgY2xpY2sgZXZlbnQgZm9yIGVyYXNlLXdlZWtkYXlzIGJ1dHRvblxuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9ialxuICAgICAgICAgICAgICAgIC5mb3JtKCdzZXQgdmFsdWVzJywge1xuICAgICAgICAgICAgICAgICAgICB3ZWVrZGF5X2Zyb206IC0xLFxuICAgICAgICAgICAgICAgICAgICB3ZWVrZGF5X3RvOiAtMSxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c1N0YXJ0LnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBCaW5kIGNsaWNrIGV2ZW50IHRvIGVyYXNlLXRpbWVwZXJpb2QgYnV0dG9uXG4gICAgICAgICQoJyNlcmFzZS10aW1lcGVyaW9kJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIC8vIEhhbmRsZSB0aGUgY2xpY2sgZXZlbnQgZm9yIGVyYXNlLXRpbWVwZXJpb2QgYnV0dG9uXG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZVRpbWVTdGFydC5jYWxlbmRhcignY2xlYXInKTtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlVGltZUVuZC5jYWxlbmRhcignY2xlYXInKTtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHRpbWVfdG8udHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgYXVkaW8tbWVzc2FnZS1zZWxlY3QgZHJvcGRvd25cbiAgICAgICAgJCgnI3NhdmUtb3V0b2Zmd29yay1mb3JtIC5hdWRpby1tZXNzYWdlLXNlbGVjdCcpLmRyb3Bkb3duKFNvdW5kRmlsZXNTZWxlY3Rvci5nZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5KCkpO1xuXG4gICAgICAgIC8vIENoYW5nZSB0aGUgZGF0ZSBmb3JtYXQgZnJvbSBsaW51eHRpbWUgdG8gbG9jYWwgcmVwcmVzZW50YXRpb25cbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5jaGFuZ2VEYXRlRm9ybWF0KCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZm9ybVxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZm9yd2FyZGluZ1NlbGVjdERyb3Bkb3duXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcndhcmRpbmdTZWxlY3REcm9wZG93bi5kcm9wZG93bihFeHRlbnNpb25zLmdldERyb3Bkb3duU2V0dGluZ3NXaXRob3V0RW1wdHkoKSk7XG5cbiAgICAgICAgLy8gVG9nZ2xlIGRpc2FibGVkIGZpZWxkIGNsYXNzIGJhc2VkIG9uIGFjdGlvbiB2YWx1ZVxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuXG4gICAgICAgIC8vIEJpbmQgY2hlY2tib3ggY2hhbmdlIGV2ZW50IGZvciBpbmJvdW5kIHJ1bGVzIHRhYmxlXG4gICAgICAgICQoJyNpbmJvdW5kLXJ1bGVzLXRhYmxlIC51aS5jaGVja2JveCcpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgbGV0IG5ld1N0YXRlID0gJ3VuY2hlY2tlZCc7XG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIHRoZSBjaGFuZ2UgZXZlbnQgZm9yIGluYm91bmQgcnVsZXMgdGFibGUgY2hlY2tib3hcbiAgICAgICAgICAgICAgICBpZiAoJCh0aGlzKS5wYXJlbnQoKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIG5ld1N0YXRlID0gJ2NoZWNrZWQnO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBsZXQgZGlkID0gJCh0aGlzKS5wYXJlbnQoKS5hdHRyKCdkYXRhLWRpZCcpO1xuICAgICAgICAgICAgICAgIGxldCBmaWx0ZXIgPSAnI2luYm91bmQtcnVsZXMtdGFibGUgLnVpLmNoZWNrYm94W2RhdGEtY29udGV4dC1pZD0nICsgJCh0aGlzKS5wYXJlbnQoKS5hdHRyKCdkYXRhLWNvbnRleHQtaWQnKSArICddJztcbiAgICAgICAgICAgICAgICBpZihkaWQgIT09ICcnICYmIG5ld1N0YXRlID09PSAnY2hlY2tlZCcpe1xuICAgICAgICAgICAgICAgICAgICBmaWx0ZXIgPSBmaWx0ZXIgKyAnLnVpLmNoZWNrYm94W2RhdGEtZGlkPScrZGlkKyddJztcbiAgICAgICAgICAgICAgICB9ZWxzZSBpZihkaWQgPT09ICcnICYmIG5ld1N0YXRlID09PSAndW5jaGVja2VkJyl7XG4gICAgICAgICAgICAgICAgICAgIGZpbHRlciA9IGZpbHRlciArICcudWkuY2hlY2tib3hbZGF0YS1kaWQ9XCJcIl0nO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAkKGZpbHRlcikuY2hlY2tib3goJ3NldCAnK25ld1N0YXRlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQmluZCBjaGVja2JveCBjaGFuZ2UgZXZlbnQgZm9yIGFsbG93UmVzdHJpY3Rpb24gY2hlY2tib3hcbiAgICAgICAgJCgnI2FsbG93UmVzdHJpY3Rpb24nKS5wYXJlbnQoKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZTogb3V0T2ZXb3JrVGltZVJlY29yZC5jaGFuZ2VSZXN0cmljdGlvblxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDYWxsIGNoYW5nZVJlc3RyaWN0aW9uIG1ldGhvZFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmNoYW5nZVJlc3RyaWN0aW9uKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoYW5nZXMgdGhlIHZpc2liaWxpdHkgb2YgdGhlICdydWxlcycgdGFiIGJhc2VkIG9uIHRoZSBjaGVja2VkIHN0YXR1cyBvZiB0aGUgJ2FsbG93UmVzdHJpY3Rpb24nIGNoZWNrYm94LlxuICAgICAqL1xuICAgIGNoYW5nZVJlc3RyaWN0aW9uKCkge1xuICAgICAgICBpZiAoJCgnI2FsbG93UmVzdHJpY3Rpb24nKS5wYXJlbnQoKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAkKFwiYVtkYXRhLXRhYj0ncnVsZXMnXVwiKS5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKFwiYVtkYXRhLXRhYj0ncnVsZXMnXVwiKS5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29udmVydHMgdGhlIGRhdGUgZm9ybWF0IGZyb20gbGludXh0aW1lIHRvIHRoZSBsb2NhbCByZXByZXNlbnRhdGlvbi5cbiAgICAgKi9cbiAgICBjaGFuZ2VEYXRlRm9ybWF0KCkge1xuICAgICAgICBjb25zdCBkYXRlRnJvbSA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGRhdGVfZnJvbS5hdHRyKCd2YWx1ZScpO1xuICAgICAgICBjb25zdCBkYXRlVG8gPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRkYXRlX3RvLmF0dHIoJ3ZhbHVlJyk7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRPZmZzZXQgPSBuZXcgRGF0ZSgpLmdldFRpbWV6b25lT2Zmc2V0KCk7XG4gICAgICAgIGNvbnN0IHNlcnZlck9mZnNldCA9IHBhcnNlSW50KG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3NlcnZlck9mZnNldCcpKTtcbiAgICAgICAgY29uc3Qgb2Zmc2V0RGlmZiA9IHNlcnZlck9mZnNldCArIGN1cnJlbnRPZmZzZXQ7XG4gICAgICAgIGlmIChkYXRlRnJvbSAhPT0gdW5kZWZpbmVkICYmIGRhdGVGcm9tLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGVGcm9tSW5Ccm93c2VyVFogPSBkYXRlRnJvbSAqIDEwMDAgKyBvZmZzZXREaWZmICogNjAgKiAxMDAwO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQuY2FsZW5kYXIoJ3NldCBkYXRlJywgbmV3IERhdGUoZGF0ZUZyb21JbkJyb3dzZXJUWikpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRlVG8gIT09IHVuZGVmaW5lZCAmJiBkYXRlVG8ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgZGF0ZVRvSW5Ccm93c2VyVFogPSBkYXRlVG8gKiAxMDAwICsgb2Zmc2V0RGlmZiAqIDYwICogMTAwMDtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c0VuZC5jYWxlbmRhcignc2V0IGRhdGUnLCBuZXcgRGF0ZShkYXRlVG9JbkJyb3dzZXJUWikpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZXMgdGhlIHZpc2liaWxpdHkgb2YgY2VydGFpbiBmaWVsZCBncm91cHMgYmFzZWQgb24gdGhlIHNlbGVjdGVkIGFjdGlvbiB2YWx1ZS5cbiAgICAgKi9cbiAgICB0b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKSB7XG4gICAgICAgIGlmKG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2FjdGlvbicpID09PSAnZXh0ZW5zaW9uJykge1xuICAgICAgICAgICAgJCgnI2V4dGVuc2lvbi1ncm91cCcpLnNob3coKTtcbiAgICAgICAgICAgICQoJyNhdWRpby1maWxlLWdyb3VwJykuaGlkZSgpO1xuICAgICAgICAgICAgJCgnI2F1ZGlvX21lc3NhZ2VfaWQnKS5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgfWVsc2V7XG4gICAgICAgICAgICAkKCcjZXh0ZW5zaW9uLWdyb3VwJykuaGlkZSgpO1xuICAgICAgICAgICAgJCgnI2F1ZGlvLWZpbGUtZ3JvdXAnKS5zaG93KCk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdleHRlbnNpb24nLCAtMSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYob3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnY2FsVHlwZScpID09PSAnbm9uZScpe1xuICAgICAgICAgICAgJCgnI2NhbGwtdHlwZS1tYWluLXRhYicpLnNob3coKTtcbiAgICAgICAgICAgICQoJyNjYWxsLXR5cGUtY2FsZW5kYXItdGFiJykuaGlkZSgpO1xuICAgICAgICB9ZWxzZXtcbiAgICAgICAgICAgICQoJyNjYWxsLXR5cGUtbWFpbi10YWInKS5oaWRlKCk7XG4gICAgICAgICAgICAkKCcjY2FsbC10eXBlLWNhbGVuZGFyLXRhYicpLnNob3coKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIGZvciB2YWxpZGF0aW5nIHNwZWNpZmljIGZpZWxkcyBpbiBhIGZvcm0uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzdWx0IC0gVGhlIHJlc3VsdCBvYmplY3QgY29udGFpbmluZyBmb3JtIGRhdGEuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW58T2JqZWN0fSBSZXR1cm5zIGZhbHNlIGlmIHZhbGlkYXRpb24gZmFpbHMsIG9yIHRoZSByZXN1bHQgb2JqZWN0IGlmIHZhbGlkYXRpb24gcGFzc2VzLlxuICAgICAqL1xuICAgIGN1c3RvbVZhbGlkYXRlRm9ybShyZXN1bHQpIHtcbiAgICAgICAgLy8gQ2hlY2sgZGF0ZSBmaWVsZHNcbiAgICAgICAgaWYgKChyZXN1bHQuZGF0YS5kYXRlX2Zyb20gIT09ICcnICYmIHJlc3VsdC5kYXRhLmRhdGVfdG8gPT09ICcnKVxuICAgICAgICAgICAgfHwgKHJlc3VsdC5kYXRhLmRhdGVfdG8gIT09ICcnICYmIHJlc3VsdC5kYXRhLmRhdGVfZnJvbSA9PT0gJycpKSB7XG4gICAgICAgICAgICAkKCcuZm9ybSAuZXJyb3IubWVzc2FnZScpLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQ2hlY2tEYXRlSW50ZXJ2YWwpLnNob3coKTtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi50cmFuc2l0aW9uKCdzaGFrZScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayB3ZWVrZGF5IGZpZWxkc1xuICAgICAgICBpZiAoKHJlc3VsdC5kYXRhLndlZWtkYXlfZnJvbSA+IDAgJiYgcmVzdWx0LmRhdGEud2Vla2RheV90byA9PT0gJy0xJylcbiAgICAgICAgICAgIHx8IChyZXN1bHQuZGF0YS53ZWVrZGF5X3RvID4gMCAmJiByZXN1bHQuZGF0YS53ZWVrZGF5X2Zyb20gPT09ICctMScpKSB7XG4gICAgICAgICAgICAkKCcuZm9ybSAuZXJyb3IubWVzc2FnZScpLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQ2hlY2tXZWVrRGF5SW50ZXJ2YWwpLnNob3coKTtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi50cmFuc2l0aW9uKCdzaGFrZScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayB0aW1lIGZpZWxkc1xuICAgICAgICBpZiAoKHJlc3VsdC5kYXRhLnRpbWVfZnJvbS5sZW5ndGggPiAwICYmIHJlc3VsdC5kYXRhLnRpbWVfdG8ubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgfHwgKHJlc3VsdC5kYXRhLnRpbWVfdG8ubGVuZ3RoID4gMCAmJiByZXN1bHQuZGF0YS50aW1lX2Zyb20ubGVuZ3RoID09PSAwKSkge1xuICAgICAgICAgICAgJCgnLmZvcm0gLmVycm9yLm1lc3NhZ2UnKS5odG1sKGdsb2JhbFRyYW5zbGF0ZS50Zl9WYWxpZGF0ZUNoZWNrVGltZUludGVydmFsKS5zaG93KCk7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24udHJhbnNpdGlvbignc2hha2UnKS5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayB0aW1lIGZpZWxkIGZvcm1hdFxuICAgICAgICBpZiAoKHJlc3VsdC5kYXRhLnRpbWVfZnJvbS5sZW5ndGggPiAwICYmIHJlc3VsdC5kYXRhLnRpbWVfdG8ubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgfHwgKHJlc3VsdC5kYXRhLnRpbWVfdG8ubGVuZ3RoID4gMCAmJiByZXN1bHQuZGF0YS50aW1lX2Zyb20ubGVuZ3RoID09PSAwKSkge1xuICAgICAgICAgICAgJCgnLmZvcm0gLmVycm9yLm1lc3NhZ2UnKS5odG1sKGdsb2JhbFRyYW5zbGF0ZS50Zl9WYWxpZGF0ZUNoZWNrVGltZUludGVydmFsKS5zaG93KCk7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24udHJhbnNpdGlvbignc2hha2UnKS5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBhbGwgZmllbGRzXG4gICAgICAgIGlmIChyZXN1bHQuZGF0YS50aW1lX2Zyb20gPT09ICcnXG4gICAgICAgICAgICAmJiByZXN1bHQuZGF0YS50aW1lX3RvID09PSAnJ1xuICAgICAgICAgICAgJiYgcmVzdWx0LmRhdGEud2Vla2RheV9mcm9tID09PSAnLTEnXG4gICAgICAgICAgICAmJiByZXN1bHQuZGF0YS53ZWVrZGF5X3RvID09PSAnLTEnXG4gICAgICAgICAgICAmJiByZXN1bHQuZGF0YS5kYXRlX2Zyb20gPT09ICcnXG4gICAgICAgICAgICAmJiByZXN1bHQuZGF0YS5kYXRlX3RvID09PSAnJykge1xuICAgICAgICAgICAgJCgnLmZvcm0gLmVycm9yLm1lc3NhZ2UnKS5odG1sKGdsb2JhbFRyYW5zbGF0ZS50Zl9WYWxpZGF0ZU5vUnVsZXNTZWxlY3RlZCkuc2hvdygpO1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICAkKCcuZm9ybSAuZXJyb3IubWVzc2FnZScpLmh0bWwoJycpLmhpZGUoKTtcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgY29uc3QgZGF0ZUZyb20gPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNTdGFydC5jYWxlbmRhcignZ2V0IGRhdGUnKTtcbiAgICAgICAgY29uc3QgZGF0ZVRvID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzRW5kLmNhbGVuZGFyKCdnZXQgZGF0ZScpO1xuICAgICAgICBjb25zdCBjdXJyZW50T2Zmc2V0ID0gbmV3IERhdGUoKS5nZXRUaW1lem9uZU9mZnNldCgpO1xuICAgICAgICBjb25zdCBzZXJ2ZXJPZmZzZXQgPSBwYXJzZUludChvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdzZXJ2ZXJPZmZzZXQnKSk7XG4gICAgICAgIGNvbnN0IG9mZnNldERpZmYgPSBzZXJ2ZXJPZmZzZXQgKyBjdXJyZW50T2Zmc2V0O1xuICAgICAgICBpZiAoZGF0ZUZyb20pIHtcbiAgICAgICAgICAgIGRhdGVGcm9tLnNldEhvdXJzKDAsIDAsIDAsIDApO1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuZGF0ZV9mcm9tID0gTWF0aC5mbG9vcihkYXRlRnJvbS5nZXRUaW1lKCkvMTAwMCkgLSBvZmZzZXREaWZmICogNjA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGVUbykge1xuICAgICAgICAgICAgZGF0ZVRvLnNldEhvdXJzKDIzLCA1OSwgNTksIDApO1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuZGF0ZV90byA9IE1hdGguZmxvb3IoZGF0ZVRvLmdldFRpbWUoKS8xMDAwKSAtIG9mZnNldERpZmYgKiA2MDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3V0T2ZXb3JrVGltZVJlY29yZC5jdXN0b21WYWxpZGF0ZUZvcm0ocmVzdWx0KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfW91dC1vZmYtd29yay10aW1lL3NhdmVgOyAvLyBGb3JtIHN1Ym1pc3Npb24gVVJMXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IG91dE9mV29ya1RpbWVSZWNvcmQudmFsaWRhdGVSdWxlczsgLy8gRm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IG91dE9mV29ya1RpbWVSZWNvcmQuY2JCZWZvcmVTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYmVmb3JlIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IG91dE9mV29ya1RpbWVSZWNvcmQuY2JBZnRlclNlbmRGb3JtOyAvLyBDYWxsYmFjayBhZnRlciBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIHRoYXQgY2hlY2tzIGlmIGEgdmFsdWUgaXMgbm90IGVtcHR5IGJhc2VkIG9uIGEgc3BlY2lmaWMgYWN0aW9uLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBiZSB2YWxpZGF0ZWQuXG4gKiBAcGFyYW0ge3N0cmluZ30gYWN0aW9uIC0gVGhlIGFjdGlvbiB0byBjb21wYXJlIGFnYWluc3QuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyB0cnVlIGlmIHRoZSB2YWx1ZSBpcyBub3QgZW1wdHkgb3IgdGhlIGFjdGlvbiBkb2VzIG5vdCBtYXRjaCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuY3VzdG9tTm90RW1wdHlJZkFjdGlvblJ1bGUgPSAodmFsdWUsIGFjdGlvbikgPT4ge1xuICAgIGlmICh2YWx1ZS5sZW5ndGggPT09IDAgJiYgJCgnI2FjdGlvbicpLnZhbCgpID09PSBhY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIHRoYXQgY2hlY2tzIGlmIGEgdmFsdWUgaXMgbm90IGVtcHR5IGJhc2VkIG9uIGEgc3BlY2lmaWMgYWN0aW9uLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBiZSB2YWxpZGF0ZWQuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyB0cnVlIGlmIHRoZSB2YWx1ZSBpcyBub3QgZW1wdHkgb3IgdGhlIGFjdGlvbiBkb2VzIG5vdCBtYXRjaCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuY3VzdG9tTm90RW1wdHlJZkNhbFR5cGUgPSAodmFsdWUpID0+IHtcbiAgICBpZiAoJCgnI2NhbFR5cGUnKS52YWwoKSA9PT0gJ25vbmUnKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgICBsZXQgdXJsID0gbmV3IFVSTCh2YWx1ZSk7XG4gICAgfSBjYXRjaCAoXykge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufTtcblxuXG4vKipcbiAqICBJbml0aWFsaXplIG91dCBvZiB3b3JrIGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIG91dE9mV29ya1RpbWVSZWNvcmQuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=