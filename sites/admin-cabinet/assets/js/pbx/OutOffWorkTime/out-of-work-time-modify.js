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
 *  Initialize out of work form on document ready
 */


$(document).ready(function () {
  outOfWorkTimeRecord.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9PdXRPZmZXb3JrVGltZS9vdXQtb2Ytd29yay10aW1lLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJvdXRPZldvcmtUaW1lUmVjb3JkIiwiJGZvcm1PYmoiLCIkIiwiJGRlZmF1bHREcm9wZG93biIsIiRyYW5nZURheXNTdGFydCIsIiRyYW5nZURheXNFbmQiLCIkcmFuZ2VUaW1lU3RhcnQiLCIkcmFuZ2VUaW1lRW5kIiwiJGRhdGVfZnJvbSIsIiRkYXRlX3RvIiwiJHRpbWVfdG8iLCIkZm9yd2FyZGluZ1NlbGVjdERyb3Bkb3duIiwidmFsaWRhdGVSdWxlcyIsImF1ZGlvX21lc3NhZ2VfaWQiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwidGZfVmFsaWRhdGVBdWRpb01lc3NhZ2VFbXB0eSIsImV4dGVuc2lvbiIsInRmX1ZhbGlkYXRlRXh0ZW5zaW9uRW1wdHkiLCJ0aW1lZnJvbSIsIm9wdGlvbmFsIiwidmFsdWUiLCJ0Zl9WYWxpZGF0ZUNoZWNrVGltZUludGVydmFsIiwidGltZXRvIiwiaW5pdGlhbGl6ZSIsInRhYiIsImRyb3Bkb3duIiwiY2FsZW5kYXIiLCJmaXJzdERheU9mV2VlayIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiY2FsZW5kYXJGaXJzdERheU9mV2VlayIsInRleHQiLCJjYWxlbmRhclRleHQiLCJlbmRDYWxlbmRhciIsImlubGluZSIsIm1vbnRoRmlyc3QiLCJyZWdFeHAiLCJzdGFydENhbGVuZGFyIiwib25DaGFuZ2UiLCJuZXdEYXRlVG8iLCJvbGREYXRlVG8iLCJhdHRyIiwiRGF0ZSIsInRyaWdnZXIiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJkaXNhYmxlTWludXRlIiwiYW1wbSIsIm5ld1RpbWVUbyIsIm9sZFRpbWVUbyIsInRvZ2dsZURpc2FibGVkRmllbGRDbGFzcyIsImZyb20iLCJmb3JtIiwidG8iLCJvbiIsImUiLCJkYXRlX2Zyb20iLCJkYXRlX3RvIiwicHJldmVudERlZmF1bHQiLCJ3ZWVrZGF5X2Zyb20iLCJ3ZWVrZGF5X3RvIiwiU291bmRGaWxlc1NlbGVjdG9yIiwiZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eSIsImNoYW5nZURhdGVGb3JtYXQiLCJpbml0aWFsaXplRm9ybSIsIkV4dGVuc2lvbnMiLCJnZXREcm9wZG93blNldHRpbmdzV2l0aG91dEVtcHR5IiwiY2hlY2tib3giLCJuZXdTdGF0ZSIsInBhcmVudCIsImRpZCIsImZpbHRlciIsImNoYW5nZVJlc3RyaWN0aW9uIiwic2hvdyIsImhpZGUiLCJkYXRlRnJvbSIsImRhdGVUbyIsImN1cnJlbnRPZmZzZXQiLCJnZXRUaW1lem9uZU9mZnNldCIsInNlcnZlck9mZnNldCIsInBhcnNlSW50Iiwib2Zmc2V0RGlmZiIsInVuZGVmaW5lZCIsImxlbmd0aCIsImRhdGVGcm9tSW5Ccm93c2VyVFoiLCJkYXRlVG9JbkJyb3dzZXJUWiIsImN1c3RvbVZhbGlkYXRlRm9ybSIsInJlc3VsdCIsImRhdGEiLCJodG1sIiwidGZfVmFsaWRhdGVDaGVja0RhdGVJbnRlcnZhbCIsIiRzdWJtaXRCdXR0b24iLCJ0cmFuc2l0aW9uIiwicmVtb3ZlQ2xhc3MiLCJ0Zl9WYWxpZGF0ZUNoZWNrV2Vla0RheUludGVydmFsIiwidGltZV9mcm9tIiwidGltZV90byIsInRmX1ZhbGlkYXRlTm9SdWxlc1NlbGVjdGVkIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwic2V0SG91cnMiLCJNYXRoIiwiZmxvb3IiLCJnZXRUaW1lIiwiY2JBZnRlclNlbmRGb3JtIiwicmVzcG9uc2UiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwiZm4iLCJjdXN0b21Ob3RFbXB0eUlmQWN0aW9uUnVsZSIsImFjdGlvbiIsInZhbCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7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LENBQWpCLElBQXNCcEYsQ0FBQyxDQUFDLFNBQUQsQ0FBRCxDQUFhZ0gsR0FBYixPQUF1QkQsTUFBakQsRUFBeUQ7QUFDckQsV0FBTyxLQUFQO0FBQ0g7O0FBQ0QsU0FBTyxJQUFQO0FBQ0gsQ0FMRDtBQU9BO0FBQ0E7QUFDQTs7O0FBQ0EvRyxDQUFDLENBQUNpSCxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCcEgsRUFBQUEsbUJBQW1CLENBQUMyQixVQUFwQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIEV4dGVuc2lvbnMsIEZvcm0sIFNlbWFudGljTG9jYWxpemF0aW9uLCBTb3VuZEZpbGVzU2VsZWN0b3IgKi9cblxuXG4vKipcbiAqIE9iamVjdCBmb3IgbWFuYWdpbmcgT3V0LW9mLVdvcmsgVGltZSBzZXR0aW5nc1xuICpcbiAqIEBtb2R1bGUgb3V0T2ZXb3JrVGltZVJlY29yZFxuICovXG5jb25zdCBvdXRPZldvcmtUaW1lUmVjb3JkID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNzYXZlLW91dG9mZndvcmstZm9ybScpLFxuXG4gICAgJGRlZmF1bHREcm9wZG93bjogJCgnI3NhdmUtb3V0b2Zmd29yay1mb3JtIC5kcm9wZG93bi1kZWZhdWx0JyksXG4gICAgJHJhbmdlRGF5c1N0YXJ0OiAkKCcjcmFuZ2UtZGF5cy1zdGFydCcpLFxuICAgICRyYW5nZURheXNFbmQ6ICQoJyNyYW5nZS1kYXlzLWVuZCcpLFxuICAgICRyYW5nZVRpbWVTdGFydDogJCgnI3JhbmdlLXRpbWUtc3RhcnQnKSxcbiAgICAkcmFuZ2VUaW1lRW5kOiAkKCcjcmFuZ2UtdGltZS1lbmQnKSxcbiAgICAkZGF0ZV9mcm9tOiAkKCcjZGF0ZV9mcm9tJyksXG4gICAgJGRhdGVfdG86ICQoJyNkYXRlX3RvJyksXG4gICAgJHRpbWVfdG86ICQoJyN0aW1lX3RvJyksXG4gICAgJGZvcndhcmRpbmdTZWxlY3REcm9wZG93bjogJCgnI3NhdmUtb3V0b2Zmd29yay1mb3JtIC5mb3J3YXJkaW5nLXNlbGVjdCcpLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGF1ZGlvX21lc3NhZ2VfaWQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdhdWRpb19tZXNzYWdlX2lkJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY3VzdG9tTm90RW1wdHlJZkFjdGlvblJ1bGVbcGxheW1lc3NhZ2VdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVBdWRpb01lc3NhZ2VFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZXh0ZW5zaW9uOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZXh0ZW5zaW9uJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY3VzdG9tTm90RW1wdHlJZkFjdGlvblJ1bGVbZXh0ZW5zaW9uXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlRXh0ZW5zaW9uRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHRpbWVmcm9tOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd0aW1lX2Zyb20nLFxuICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgdmFsdWU6IC9eKDJbMC0zXXwxP1swLTldKTooWzAtNV0/WzAtOV0pJC8sXG4gICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja1RpbWVJbnRlcnZhbCxcbiAgICAgICAgICAgIH1dLFxuICAgICAgICB9LFxuICAgICAgICB0aW1ldG86IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd0aW1lX3RvJyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgdmFsdWU6IC9eKDJbMC0zXXwxP1swLTldKTooWzAtNV0/WzAtOV0pJC8sXG4gICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja1RpbWVJbnRlcnZhbCxcbiAgICAgICAgICAgIH1dLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgb3V0IG9mIHdvcmsgdGltZSByZWNvcmQgZm9ybS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIHRhYiBiZWhhdmlvciBmb3IgdGhlIG91dC10aW1lLW1vZGlmeS1tZW51XG4gICAgICAgICQoJyNvdXQtdGltZS1tb2RpZnktbWVudSAuaXRlbScpLnRhYigpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGRlZmF1bHQgZHJvcGRvd25cbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZGVmYXVsdERyb3Bkb3duLmRyb3Bkb3duKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgY2FsZW5kYXIgZm9yIHJhbmdlIGRheXMgc3RhcnRcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQuY2FsZW5kYXIoe1xuICAgICAgICAgICAgLy8gQ2FsZW5kYXIgY29uZmlndXJhdGlvbiBvcHRpb25zXG4gICAgICAgICAgICBmaXJzdERheU9mV2VlazogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJGaXJzdERheU9mV2VlayxcbiAgICAgICAgICAgIHRleHQ6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dCxcbiAgICAgICAgICAgIGVuZENhbGVuZGFyOiBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNFbmQsXG4gICAgICAgICAgICB0eXBlOiAnZGF0ZScsXG4gICAgICAgICAgICBpbmxpbmU6IGZhbHNlLFxuICAgICAgICAgICAgbW9udGhGaXJzdDogZmFsc2UsXG4gICAgICAgICAgICByZWdFeHA6IFNlbWFudGljTG9jYWxpemF0aW9uLnJlZ0V4cCxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgY2FsZW5kYXIgZm9yIHJhbmdlIGRheXMgZW5kXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c0VuZC5jYWxlbmRhcih7XG4gICAgICAgICAgICAvLyBDYWxlbmRhciBjb25maWd1cmF0aW9uIG9wdGlvbnNcbiAgICAgICAgICAgIGZpcnN0RGF5T2ZXZWVrOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhckZpcnN0RGF5T2ZXZWVrLFxuICAgICAgICAgICAgdGV4dDogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJUZXh0LFxuICAgICAgICAgICAgc3RhcnRDYWxlbmRhcjogb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQsXG4gICAgICAgICAgICB0eXBlOiAnZGF0ZScsXG4gICAgICAgICAgICBpbmxpbmU6IGZhbHNlLFxuICAgICAgICAgICAgbW9udGhGaXJzdDogZmFsc2UsXG4gICAgICAgICAgICByZWdFeHA6IFNlbWFudGljTG9jYWxpemF0aW9uLnJlZ0V4cCxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAobmV3RGF0ZVRvKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIHRoZSBjaGFuZ2UgZXZlbnQgZm9yIHJhbmdlIHRpbWUgZW5kXG4gICAgICAgICAgICAgICAgbGV0IG9sZERhdGVUbyA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGRhdGVfdG8uYXR0cigndmFsdWUnKTtcbiAgICAgICAgICAgICAgICBpZiAobmV3RGF0ZVRvICE9PSBudWxsICYmIG9sZERhdGVUbyAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgb2xkRGF0ZVRvID0gbmV3IERhdGUob2xkRGF0ZVRvICogMTAwMCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICgobmV3RGF0ZVRvIC0gb2xkRGF0ZVRvKSAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZGF0ZV9mcm9tLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgY2FsZW5kYXIgZm9yIHJhbmdlIHRpbWUgc3RhcnRcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lU3RhcnQuY2FsZW5kYXIoe1xuICAgICAgICAgICAgLy8gQ2FsZW5kYXIgY29uZmlndXJhdGlvbiBvcHRpb25zXG4gICAgICAgICAgICBmaXJzdERheU9mV2VlazogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJGaXJzdERheU9mV2VlayxcbiAgICAgICAgICAgIHRleHQ6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dCxcbiAgICAgICAgICAgIGVuZENhbGVuZGFyOiBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZVRpbWVFbmQsXG4gICAgICAgICAgICB0eXBlOiAndGltZScsXG4gICAgICAgICAgICBpbmxpbmU6IGZhbHNlLFxuICAgICAgICAgICAgZGlzYWJsZU1pbnV0ZTogdHJ1ZSxcbiAgICAgICAgICAgIGFtcG06IGZhbHNlLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBjYWxlbmRhciBmb3IgcmFuZ2UgdGltZSBlbmRcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lRW5kLmNhbGVuZGFyKHtcbiAgICAgICAgICAgIC8vIENhbGVuZGFyIGNvbmZpZ3VyYXRpb24gb3B0aW9uc1xuICAgICAgICAgICAgZmlyc3REYXlPZldlZWs6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyRmlyc3REYXlPZldlZWssXG4gICAgICAgICAgICB0ZXh0OiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQsXG4gICAgICAgICAgICB0eXBlOiAndGltZScsXG4gICAgICAgICAgICBpbmxpbmU6IGZhbHNlLFxuICAgICAgICAgICAgZGlzYWJsZU1pbnV0ZTogdHJ1ZSxcbiAgICAgICAgICAgIGFtcG06IGZhbHNlLFxuICAgICAgICAgICAgb25DaGFuZ2U6IChuZXdUaW1lVG8pID0+IHtcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgdGhlIGNoYW5nZSBldmVudCBmb3IgcmFuZ2UgdGltZSBlbmRcbiAgICAgICAgICAgICAgICBsZXQgb2xkVGltZVRvID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kdGltZV90by5hdHRyKCd2YWx1ZScpO1xuICAgICAgICAgICAgICAgIGlmIChuZXdUaW1lVG8gIT09IG51bGwgJiYgb2xkVGltZVRvICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICBvbGRUaW1lVG8gPSBuZXcgRGF0ZShvbGRUaW1lVG8gKiAxMDAwKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKChuZXdUaW1lVG8gLSBvbGRUaW1lVG8pICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR0aW1lX3RvLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgYWN0aW9uIGRyb3Bkb3duXG4gICAgICAgICQoJyNhY3Rpb24nKVxuICAgICAgICAgICAgLmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICBvbkNoYW5nZSgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSGFuZGxlIHRoZSBjaGFuZ2UgZXZlbnQgZm9yIHRoZSBhY3Rpb24gZHJvcGRvd25cbiAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgd2Vla2RheV9mcm9tIGRyb3Bkb3duXG4gICAgICAgICQoJyN3ZWVrZGF5X2Zyb20nKVxuICAgICAgICAgICAgLmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICBvbkNoYW5nZSgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSGFuZGxlIHRoZSBjaGFuZ2UgZXZlbnQgZm9yIHRoZSB3ZWVrZGF5X2Zyb20gZHJvcGRvd25cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZnJvbSA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3dlZWtkYXlfZnJvbScpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0byA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3dlZWtkYXlfdG8nKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZyb20gPCB0byB8fCB0byA9PT0gLTEgfHwgZnJvbSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ3dlZWtkYXlfdG8nLCBmcm9tKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSB3ZWVrZGF5X3RvIGRyb3Bkb3duXG4gICAgICAgICQoJyN3ZWVrZGF5X3RvJylcbiAgICAgICAgICAgIC5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2UoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEhhbmRsZSB0aGUgY2hhbmdlIGV2ZW50IGZvciB0aGUgd2Vla2RheV90byBkcm9wZG93blxuICAgICAgICAgICAgICAgICAgICBjb25zdCBmcm9tID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnd2Vla2RheV9mcm9tJyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRvID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnd2Vla2RheV90bycpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodG8gPCBmcm9tIHx8IGZyb20gPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICd3ZWVrZGF5X2Zyb20nLCB0byk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQmluZCBjbGljayBldmVudCB0byBlcmFzZS1kYXRlcyBidXR0b25cbiAgICAgICAgJCgnI2VyYXNlLWRhdGVzJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIC8vIEhhbmRsZSB0aGUgY2xpY2sgZXZlbnQgZm9yIGVyYXNlLWRhdGVzIGJ1dHRvblxuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQuY2FsZW5kYXIoJ2NsZWFyJyk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNFbmQuY2FsZW5kYXIoJ2NsZWFyJyk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqXG4gICAgICAgICAgICAgICAgLmZvcm0oJ3NldCB2YWx1ZXMnLCB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGVfZnJvbTogJycsXG4gICAgICAgICAgICAgICAgICAgIGRhdGVfdG86ICcnLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBCaW5kIGNsaWNrIGV2ZW50IHRvIGVyYXNlLXdlZWtkYXlzIGJ1dHRvblxuICAgICAgICAkKCcjZXJhc2Utd2Vla2RheXMnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgLy8gSGFuZGxlIHRoZSBjbGljayBldmVudCBmb3IgZXJhc2Utd2Vla2RheXMgYnV0dG9uXG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqXG4gICAgICAgICAgICAgICAgLmZvcm0oJ3NldCB2YWx1ZXMnLCB7XG4gICAgICAgICAgICAgICAgICAgIHdlZWtkYXlfZnJvbTogLTEsXG4gICAgICAgICAgICAgICAgICAgIHdlZWtkYXlfdG86IC0xLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEJpbmQgY2xpY2sgZXZlbnQgdG8gZXJhc2UtdGltZXBlcmlvZCBidXR0b25cbiAgICAgICAgJCgnI2VyYXNlLXRpbWVwZXJpb2QnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgLy8gSGFuZGxlIHRoZSBjbGljayBldmVudCBmb3IgZXJhc2UtdGltZXBlcmlvZCBidXR0b25cbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlVGltZVN0YXJ0LmNhbGVuZGFyKCdjbGVhcicpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lRW5kLmNhbGVuZGFyKCdjbGVhcicpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kdGltZV90by50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBhdWRpby1tZXNzYWdlLXNlbGVjdCBkcm9wZG93blxuICAgICAgICAkKCcjc2F2ZS1vdXRvZmZ3b3JrLWZvcm0gLmF1ZGlvLW1lc3NhZ2Utc2VsZWN0JykuZHJvcGRvd24oU291bmRGaWxlc1NlbGVjdG9yLmdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkoKSk7XG5cbiAgICAgICAgLy8gQ2hhbmdlIHRoZSBkYXRlIGZvcm1hdCBmcm9tIGxpbnV4dGltZSB0byBsb2NhbCByZXByZXNlbnRhdGlvblxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmNoYW5nZURhdGVGb3JtYXQoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBmb3JtXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBmb3J3YXJkaW5nU2VsZWN0RHJvcGRvd25cbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9yd2FyZGluZ1NlbGVjdERyb3Bkb3duLmRyb3Bkb3duKEV4dGVuc2lvbnMuZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhvdXRFbXB0eSgpKTtcblxuICAgICAgICAvLyBUb2dnbGUgZGlzYWJsZWQgZmllbGQgY2xhc3MgYmFzZWQgb24gYWN0aW9uIHZhbHVlXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG5cbiAgICAgICAgLy8gQmluZCBjaGVja2JveCBjaGFuZ2UgZXZlbnQgZm9yIGluYm91bmQgcnVsZXMgdGFibGVcbiAgICAgICAgJCgnI2luYm91bmQtcnVsZXMtdGFibGUgLnVpLmNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBsZXQgbmV3U3RhdGUgPSAndW5jaGVja2VkJztcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgdGhlIGNoYW5nZSBldmVudCBmb3IgaW5ib3VuZCBydWxlcyB0YWJsZSBjaGVja2JveFxuICAgICAgICAgICAgICAgIGlmICgkKHRoaXMpLnBhcmVudCgpLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgbmV3U3RhdGUgPSAnY2hlY2tlZCc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGxldCBkaWQgPSAkKHRoaXMpLnBhcmVudCgpLmF0dHIoJ2RhdGEtZGlkJyk7XG4gICAgICAgICAgICAgICAgbGV0IGZpbHRlciA9ICcjaW5ib3VuZC1ydWxlcy10YWJsZSAudWkuY2hlY2tib3hbZGF0YS1jb250ZXh0LWlkPScgKyAkKHRoaXMpLnBhcmVudCgpLmF0dHIoJ2RhdGEtY29udGV4dC1pZCcpICsgJ10nO1xuICAgICAgICAgICAgICAgIGlmKGRpZCAhPT0gJycgJiYgbmV3U3RhdGUgPT09ICdjaGVja2VkJyl7XG4gICAgICAgICAgICAgICAgICAgIGZpbHRlciA9IGZpbHRlciArICcudWkuY2hlY2tib3hbZGF0YS1kaWQ9JytkaWQrJ10nO1xuICAgICAgICAgICAgICAgIH1lbHNlIGlmKGRpZCA9PT0gJycgJiYgbmV3U3RhdGUgPT09ICd1bmNoZWNrZWQnKXtcbiAgICAgICAgICAgICAgICAgICAgZmlsdGVyID0gZmlsdGVyICsgJy51aS5jaGVja2JveFtkYXRhLWRpZD1cIlwiXSc7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICQoZmlsdGVyKS5jaGVja2JveCgnc2V0ICcrbmV3U3RhdGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBCaW5kIGNoZWNrYm94IGNoYW5nZSBldmVudCBmb3IgYWxsb3dSZXN0cmljdGlvbiBjaGVja2JveFxuICAgICAgICAkKCcjYWxsb3dSZXN0cmljdGlvbicpLnBhcmVudCgpLmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBvdXRPZldvcmtUaW1lUmVjb3JkLmNoYW5nZVJlc3RyaWN0aW9uXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIENhbGwgY2hhbmdlUmVzdHJpY3Rpb24gbWV0aG9kXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuY2hhbmdlUmVzdHJpY3Rpb24oKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hhbmdlcyB0aGUgdmlzaWJpbGl0eSBvZiB0aGUgJ3J1bGVzJyB0YWIgYmFzZWQgb24gdGhlIGNoZWNrZWQgc3RhdHVzIG9mIHRoZSAnYWxsb3dSZXN0cmljdGlvbicgY2hlY2tib3guXG4gICAgICovXG4gICAgY2hhbmdlUmVzdHJpY3Rpb24oKSB7XG4gICAgICAgIGlmICgkKCcjYWxsb3dSZXN0cmljdGlvbicpLnBhcmVudCgpLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgICQoXCJhW2RhdGEtdGFiPSdydWxlcyddXCIpLnNob3coKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoXCJhW2RhdGEtdGFiPSdydWxlcyddXCIpLmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDb252ZXJ0cyB0aGUgZGF0ZSBmb3JtYXQgZnJvbSBsaW51eHRpbWUgdG8gdGhlIGxvY2FsIHJlcHJlc2VudGF0aW9uLlxuICAgICAqL1xuICAgIGNoYW5nZURhdGVGb3JtYXQoKSB7XG4gICAgICAgIGNvbnN0IGRhdGVGcm9tID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZGF0ZV9mcm9tLmF0dHIoJ3ZhbHVlJyk7XG4gICAgICAgIGNvbnN0IGRhdGVUbyA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGRhdGVfdG8uYXR0cigndmFsdWUnKTtcbiAgICAgICAgY29uc3QgY3VycmVudE9mZnNldCA9IG5ldyBEYXRlKCkuZ2V0VGltZXpvbmVPZmZzZXQoKTtcbiAgICAgICAgY29uc3Qgc2VydmVyT2Zmc2V0ID0gcGFyc2VJbnQob3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnc2VydmVyT2Zmc2V0JykpO1xuICAgICAgICBjb25zdCBvZmZzZXREaWZmID0gc2VydmVyT2Zmc2V0ICsgY3VycmVudE9mZnNldDtcbiAgICAgICAgaWYgKGRhdGVGcm9tICE9PSB1bmRlZmluZWQgJiYgZGF0ZUZyb20ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgZGF0ZUZyb21JbkJyb3dzZXJUWiA9IGRhdGVGcm9tICogMTAwMCArIG9mZnNldERpZmYgKiA2MCAqIDEwMDA7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNTdGFydC5jYWxlbmRhcignc2V0IGRhdGUnLCBuZXcgRGF0ZShkYXRlRnJvbUluQnJvd3NlclRaKSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGVUbyAhPT0gdW5kZWZpbmVkICYmIGRhdGVUby5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBkYXRlVG9JbkJyb3dzZXJUWiA9IGRhdGVUbyAqIDEwMDAgKyBvZmZzZXREaWZmICogNjAgKiAxMDAwO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzRW5kLmNhbGVuZGFyKCdzZXQgZGF0ZScsIG5ldyBEYXRlKGRhdGVUb0luQnJvd3NlclRaKSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlcyB0aGUgdmlzaWJpbGl0eSBvZiBjZXJ0YWluIGZpZWxkIGdyb3VwcyBiYXNlZCBvbiB0aGUgc2VsZWN0ZWQgYWN0aW9uIHZhbHVlLlxuICAgICAqL1xuICAgIHRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpIHtcbiAgICAgICAgaWYgKG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2FjdGlvbicpID09PSAnZXh0ZW5zaW9uJykge1xuICAgICAgICAgICAgJCgnI2V4dGVuc2lvbi1ncm91cCcpLnNob3coKTtcbiAgICAgICAgICAgICQoJyNhdWRpby1maWxlLWdyb3VwJykuaGlkZSgpO1xuICAgICAgICAgICAgJCgnI2F1ZGlvX21lc3NhZ2VfaWQnKS5kcm9wZG93bignY2xlYXInKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICQoJyNleHRlbnNpb24tZ3JvdXAnKS5oaWRlKCk7XG4gICAgICAgICAgICAkKCcjYXVkaW8tZmlsZS1ncm91cCcpLnNob3coKTtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2V4dGVuc2lvbicsIC0xKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIGZvciB2YWxpZGF0aW5nIHNwZWNpZmljIGZpZWxkcyBpbiBhIGZvcm0uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzdWx0IC0gVGhlIHJlc3VsdCBvYmplY3QgY29udGFpbmluZyBmb3JtIGRhdGEuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW58T2JqZWN0fSBSZXR1cm5zIGZhbHNlIGlmIHZhbGlkYXRpb24gZmFpbHMsIG9yIHRoZSByZXN1bHQgb2JqZWN0IGlmIHZhbGlkYXRpb24gcGFzc2VzLlxuICAgICAqL1xuICAgIGN1c3RvbVZhbGlkYXRlRm9ybShyZXN1bHQpIHtcbiAgICAgICAgLy8gQ2hlY2sgZGF0ZSBmaWVsZHNcbiAgICAgICAgaWYgKChyZXN1bHQuZGF0YS5kYXRlX2Zyb20gIT09ICcnICYmIHJlc3VsdC5kYXRhLmRhdGVfdG8gPT09ICcnKVxuICAgICAgICAgICAgfHwgKHJlc3VsdC5kYXRhLmRhdGVfdG8gIT09ICcnICYmIHJlc3VsdC5kYXRhLmRhdGVfZnJvbSA9PT0gJycpKSB7XG4gICAgICAgICAgICAkKCcuZm9ybSAuZXJyb3IubWVzc2FnZScpLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQ2hlY2tEYXRlSW50ZXJ2YWwpLnNob3coKTtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi50cmFuc2l0aW9uKCdzaGFrZScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayB3ZWVrZGF5IGZpZWxkc1xuICAgICAgICBpZiAoKHJlc3VsdC5kYXRhLndlZWtkYXlfZnJvbSA+IDAgJiYgcmVzdWx0LmRhdGEud2Vla2RheV90byA9PT0gJy0xJylcbiAgICAgICAgICAgIHx8IChyZXN1bHQuZGF0YS53ZWVrZGF5X3RvID4gMCAmJiByZXN1bHQuZGF0YS53ZWVrZGF5X2Zyb20gPT09ICctMScpKSB7XG4gICAgICAgICAgICAkKCcuZm9ybSAuZXJyb3IubWVzc2FnZScpLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQ2hlY2tXZWVrRGF5SW50ZXJ2YWwpLnNob3coKTtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi50cmFuc2l0aW9uKCdzaGFrZScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayB0aW1lIGZpZWxkc1xuICAgICAgICBpZiAoKHJlc3VsdC5kYXRhLnRpbWVfZnJvbS5sZW5ndGggPiAwICYmIHJlc3VsdC5kYXRhLnRpbWVfdG8ubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgfHwgKHJlc3VsdC5kYXRhLnRpbWVfdG8ubGVuZ3RoID4gMCAmJiByZXN1bHQuZGF0YS50aW1lX2Zyb20ubGVuZ3RoID09PSAwKSkge1xuICAgICAgICAgICAgJCgnLmZvcm0gLmVycm9yLm1lc3NhZ2UnKS5odG1sKGdsb2JhbFRyYW5zbGF0ZS50Zl9WYWxpZGF0ZUNoZWNrVGltZUludGVydmFsKS5zaG93KCk7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24udHJhbnNpdGlvbignc2hha2UnKS5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayB0aW1lIGZpZWxkIGZvcm1hdFxuICAgICAgICBpZiAoKHJlc3VsdC5kYXRhLnRpbWVfZnJvbS5sZW5ndGggPiAwICYmIHJlc3VsdC5kYXRhLnRpbWVfdG8ubGVuZ3RoID09PSAwKVxuICAgICAgICAgICAgfHwgKHJlc3VsdC5kYXRhLnRpbWVfdG8ubGVuZ3RoID4gMCAmJiByZXN1bHQuZGF0YS50aW1lX2Zyb20ubGVuZ3RoID09PSAwKSkge1xuICAgICAgICAgICAgJCgnLmZvcm0gLmVycm9yLm1lc3NhZ2UnKS5odG1sKGdsb2JhbFRyYW5zbGF0ZS50Zl9WYWxpZGF0ZUNoZWNrVGltZUludGVydmFsKS5zaG93KCk7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24udHJhbnNpdGlvbignc2hha2UnKS5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBhbGwgZmllbGRzXG4gICAgICAgIGlmIChyZXN1bHQuZGF0YS50aW1lX2Zyb20gPT09ICcnXG4gICAgICAgICAgICAmJiByZXN1bHQuZGF0YS50aW1lX3RvID09PSAnJ1xuICAgICAgICAgICAgJiYgcmVzdWx0LmRhdGEud2Vla2RheV9mcm9tID09PSAnLTEnXG4gICAgICAgICAgICAmJiByZXN1bHQuZGF0YS53ZWVrZGF5X3RvID09PSAnLTEnXG4gICAgICAgICAgICAmJiByZXN1bHQuZGF0YS5kYXRlX2Zyb20gPT09ICcnXG4gICAgICAgICAgICAmJiByZXN1bHQuZGF0YS5kYXRlX3RvID09PSAnJykge1xuICAgICAgICAgICAgJCgnLmZvcm0gLmVycm9yLm1lc3NhZ2UnKS5odG1sKGdsb2JhbFRyYW5zbGF0ZS50Zl9WYWxpZGF0ZU5vUnVsZXNTZWxlY3RlZCkuc2hvdygpO1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICAkKCcuZm9ybSAuZXJyb3IubWVzc2FnZScpLmh0bWwoJycpLmhpZGUoKTtcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgY29uc3QgZGF0ZUZyb20gPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNTdGFydC5jYWxlbmRhcignZ2V0IGRhdGUnKTtcbiAgICAgICAgY29uc3QgZGF0ZVRvID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzRW5kLmNhbGVuZGFyKCdnZXQgZGF0ZScpO1xuICAgICAgICBjb25zdCBjdXJyZW50T2Zmc2V0ID0gbmV3IERhdGUoKS5nZXRUaW1lem9uZU9mZnNldCgpO1xuICAgICAgICBjb25zdCBzZXJ2ZXJPZmZzZXQgPSBwYXJzZUludChvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdzZXJ2ZXJPZmZzZXQnKSk7XG4gICAgICAgIGNvbnN0IG9mZnNldERpZmYgPSBzZXJ2ZXJPZmZzZXQgKyBjdXJyZW50T2Zmc2V0O1xuICAgICAgICBpZiAoZGF0ZUZyb20pIHtcbiAgICAgICAgICAgIGRhdGVGcm9tLnNldEhvdXJzKDAsIDAsIDAsIDApO1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuZGF0ZV9mcm9tID0gTWF0aC5mbG9vcihkYXRlRnJvbS5nZXRUaW1lKCkvMTAwMCkgLSBvZmZzZXREaWZmICogNjA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGVUbykge1xuICAgICAgICAgICAgZGF0ZVRvLnNldEhvdXJzKDIzLCA1OSwgNTksIDApO1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuZGF0ZV90byA9IE1hdGguZmxvb3IoZGF0ZVRvLmdldFRpbWUoKS8xMDAwKSAtIG9mZnNldERpZmYgKiA2MDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3V0T2ZXb3JrVGltZVJlY29yZC5jdXN0b21WYWxpZGF0ZUZvcm0ocmVzdWx0KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfW91dC1vZmYtd29yay10aW1lL3NhdmVgOyAvLyBGb3JtIHN1Ym1pc3Npb24gVVJMXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IG91dE9mV29ya1RpbWVSZWNvcmQudmFsaWRhdGVSdWxlczsgLy8gRm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IG91dE9mV29ya1RpbWVSZWNvcmQuY2JCZWZvcmVTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYmVmb3JlIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IG91dE9mV29ya1RpbWVSZWNvcmQuY2JBZnRlclNlbmRGb3JtOyAvLyBDYWxsYmFjayBhZnRlciBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIHRoYXQgY2hlY2tzIGlmIGEgdmFsdWUgaXMgbm90IGVtcHR5IGJhc2VkIG9uIGEgc3BlY2lmaWMgYWN0aW9uLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBiZSB2YWxpZGF0ZWQuXG4gKiBAcGFyYW0ge3N0cmluZ30gYWN0aW9uIC0gVGhlIGFjdGlvbiB0byBjb21wYXJlIGFnYWluc3QuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyB0cnVlIGlmIHRoZSB2YWx1ZSBpcyBub3QgZW1wdHkgb3IgdGhlIGFjdGlvbiBkb2VzIG5vdCBtYXRjaCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuY3VzdG9tTm90RW1wdHlJZkFjdGlvblJ1bGUgPSAodmFsdWUsIGFjdGlvbikgPT4ge1xuICAgIGlmICh2YWx1ZS5sZW5ndGggPT09IDAgJiYgJCgnI2FjdGlvbicpLnZhbCgpID09PSBhY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogIEluaXRpYWxpemUgb3V0IG9mIHdvcmsgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgb3V0T2ZXb3JrVGltZVJlY29yZC5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==