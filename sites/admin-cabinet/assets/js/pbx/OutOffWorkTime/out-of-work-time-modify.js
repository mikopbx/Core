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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9PdXRPZmZXb3JrVGltZS9vdXQtb2Ytd29yay10aW1lLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJvdXRPZldvcmtUaW1lUmVjb3JkIiwiJGZvcm1PYmoiLCIkIiwiJGRlZmF1bHREcm9wZG93biIsIiRyYW5nZURheXNTdGFydCIsIiRyYW5nZURheXNFbmQiLCIkcmFuZ2VUaW1lU3RhcnQiLCIkcmFuZ2VUaW1lRW5kIiwiJGRhdGVfZnJvbSIsIiRkYXRlX3RvIiwiJHRpbWVfdG8iLCIkZm9yd2FyZGluZ1NlbGVjdERyb3Bkb3duIiwidmFsaWRhdGVSdWxlcyIsImF1ZGlvX21lc3NhZ2VfaWQiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwidGZfVmFsaWRhdGVBdWRpb01lc3NhZ2VFbXB0eSIsImV4dGVuc2lvbiIsInRmX1ZhbGlkYXRlRXh0ZW5zaW9uRW1wdHkiLCJ0aW1lZnJvbSIsIm9wdGlvbmFsIiwidmFsdWUiLCJ0Zl9WYWxpZGF0ZUNoZWNrVGltZUludGVydmFsIiwidGltZXRvIiwiaW5pdGlhbGl6ZSIsInRhYiIsImRyb3Bkb3duIiwiY2FsZW5kYXIiLCJmaXJzdERheU9mV2VlayIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiY2FsZW5kYXJGaXJzdERheU9mV2VlayIsInRleHQiLCJjYWxlbmRhclRleHQiLCJlbmRDYWxlbmRhciIsImlubGluZSIsIm1vbnRoRmlyc3QiLCJyZWdFeHAiLCJzdGFydENhbGVuZGFyIiwib25DaGFuZ2UiLCJuZXdEYXRlVG8iLCJvbGREYXRlVG8iLCJhdHRyIiwiRGF0ZSIsInRyaWdnZXIiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJkaXNhYmxlTWludXRlIiwiYW1wbSIsIm5ld1RpbWVUbyIsIm9sZFRpbWVUbyIsInRvZ2dsZURpc2FibGVkRmllbGRDbGFzcyIsImZyb20iLCJmb3JtIiwidG8iLCJvbiIsImUiLCJkYXRlX2Zyb20iLCJkYXRlX3RvIiwicHJldmVudERlZmF1bHQiLCJ3ZWVrZGF5X2Zyb20iLCJ3ZWVrZGF5X3RvIiwiU291bmRGaWxlc1NlbGVjdG9yIiwiZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eSIsImNoYW5nZURhdGVGb3JtYXQiLCJpbml0aWFsaXplRm9ybSIsIkV4dGVuc2lvbnMiLCJnZXREcm9wZG93blNldHRpbmdzV2l0aG91dEVtcHR5IiwiY2hlY2tib3giLCJwYXJlbnQiLCJjaGFuZ2VSZXN0cmljdGlvbiIsInNob3ciLCJoaWRlIiwiZGF0ZUZyb20iLCJkYXRlVG8iLCJjdXJyZW50T2Zmc2V0IiwiZ2V0VGltZXpvbmVPZmZzZXQiLCJzZXJ2ZXJPZmZzZXQiLCJwYXJzZUludCIsIm9mZnNldERpZmYiLCJ1bmRlZmluZWQiLCJsZW5ndGgiLCJkYXRlRnJvbUluQnJvd3NlclRaIiwiZGF0ZVRvSW5Ccm93c2VyVFoiLCJjdXN0b21WYWxpZGF0ZUZvcm0iLCJyZXN1bHQiLCJkYXRhIiwiaHRtbCIsInRmX1ZhbGlkYXRlQ2hlY2tEYXRlSW50ZXJ2YWwiLCIkc3VibWl0QnV0dG9uIiwidHJhbnNpdGlvbiIsInJlbW92ZUNsYXNzIiwidGZfVmFsaWRhdGVDaGVja1dlZWtEYXlJbnRlcnZhbCIsInRpbWVfZnJvbSIsInRpbWVfdG8iLCJ0Zl9WYWxpZGF0ZU5vUnVsZXNTZWxlY3RlZCIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsInNldEhvdXJzIiwiTWF0aCIsImZsb29yIiwiZ2V0VGltZSIsImNiQWZ0ZXJTZW5kRm9ybSIsInJlc3BvbnNlIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsImZuIiwiY3VzdG9tTm90RW1wdHlJZkFjdGlvblJ1bGUiLCJhY3Rpb24iLCJ2YWwiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBR0E7QUFDQTtBQUNB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bCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIEV4dGVuc2lvbnMsIEZvcm0sIFNlbWFudGljTG9jYWxpemF0aW9uLCBTb3VuZEZpbGVzU2VsZWN0b3IgKi9cblxuXG4vKipcbiAqIE9iamVjdCBmb3IgbWFuYWdpbmcgT3V0LW9mLVdvcmsgVGltZSBzZXR0aW5nc1xuICpcbiAqIEBtb2R1bGUgb3V0T2ZXb3JrVGltZVJlY29yZFxuICovXG5jb25zdCBvdXRPZldvcmtUaW1lUmVjb3JkID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNzYXZlLW91dG9mZndvcmstZm9ybScpLFxuXG4gICAgJGRlZmF1bHREcm9wZG93bjogJCgnI3NhdmUtb3V0b2Zmd29yay1mb3JtIC5kcm9wZG93bi1kZWZhdWx0JyksXG4gICAgJHJhbmdlRGF5c1N0YXJ0OiAkKCcjcmFuZ2UtZGF5cy1zdGFydCcpLFxuICAgICRyYW5nZURheXNFbmQ6ICQoJyNyYW5nZS1kYXlzLWVuZCcpLFxuICAgICRyYW5nZVRpbWVTdGFydDogJCgnI3JhbmdlLXRpbWUtc3RhcnQnKSxcbiAgICAkcmFuZ2VUaW1lRW5kOiAkKCcjcmFuZ2UtdGltZS1lbmQnKSxcbiAgICAkZGF0ZV9mcm9tOiAkKCcjZGF0ZV9mcm9tJyksXG4gICAgJGRhdGVfdG86ICQoJyNkYXRlX3RvJyksXG4gICAgJHRpbWVfdG86ICQoJyN0aW1lX3RvJyksXG4gICAgJGZvcndhcmRpbmdTZWxlY3REcm9wZG93bjogJCgnI3NhdmUtb3V0b2Zmd29yay1mb3JtIC5mb3J3YXJkaW5nLXNlbGVjdCcpLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGF1ZGlvX21lc3NhZ2VfaWQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdhdWRpb19tZXNzYWdlX2lkJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY3VzdG9tTm90RW1wdHlJZkFjdGlvblJ1bGVbcGxheW1lc3NhZ2VdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVBdWRpb01lc3NhZ2VFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZXh0ZW5zaW9uOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZXh0ZW5zaW9uJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY3VzdG9tTm90RW1wdHlJZkFjdGlvblJ1bGVbZXh0ZW5zaW9uXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlRXh0ZW5zaW9uRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHRpbWVmcm9tOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd0aW1lX2Zyb20nLFxuICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgdmFsdWU6IC9eKDJbMC0zXXwxP1swLTldKTooWzAtNV0/WzAtOV0pJC8sXG4gICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja1RpbWVJbnRlcnZhbCxcbiAgICAgICAgICAgIH1dLFxuICAgICAgICB9LFxuICAgICAgICB0aW1ldG86IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd0aW1lX3RvJyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgdmFsdWU6IC9eKDJbMC0zXXwxP1swLTldKTooWzAtNV0/WzAtOV0pJC8sXG4gICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja1RpbWVJbnRlcnZhbCxcbiAgICAgICAgICAgIH1dLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgb3V0IG9mIHdvcmsgdGltZSByZWNvcmQgZm9ybS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIHRhYiBiZWhhdmlvciBmb3IgdGhlIG91dC10aW1lLW1vZGlmeS1tZW51XG4gICAgICAgICQoJyNvdXQtdGltZS1tb2RpZnktbWVudSAuaXRlbScpLnRhYigpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGRlZmF1bHQgZHJvcGRvd25cbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZGVmYXVsdERyb3Bkb3duLmRyb3Bkb3duKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgY2FsZW5kYXIgZm9yIHJhbmdlIGRheXMgc3RhcnRcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQuY2FsZW5kYXIoe1xuICAgICAgICAgICAgLy8gQ2FsZW5kYXIgY29uZmlndXJhdGlvbiBvcHRpb25zXG4gICAgICAgICAgICBmaXJzdERheU9mV2VlazogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJGaXJzdERheU9mV2VlayxcbiAgICAgICAgICAgIHRleHQ6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dCxcbiAgICAgICAgICAgIGVuZENhbGVuZGFyOiBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNFbmQsXG4gICAgICAgICAgICB0eXBlOiAnZGF0ZScsXG4gICAgICAgICAgICBpbmxpbmU6IGZhbHNlLFxuICAgICAgICAgICAgbW9udGhGaXJzdDogZmFsc2UsXG4gICAgICAgICAgICByZWdFeHA6IFNlbWFudGljTG9jYWxpemF0aW9uLnJlZ0V4cCxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgY2FsZW5kYXIgZm9yIHJhbmdlIGRheXMgZW5kXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c0VuZC5jYWxlbmRhcih7XG4gICAgICAgICAgICAvLyBDYWxlbmRhciBjb25maWd1cmF0aW9uIG9wdGlvbnNcbiAgICAgICAgICAgIGZpcnN0RGF5T2ZXZWVrOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhckZpcnN0RGF5T2ZXZWVrLFxuICAgICAgICAgICAgdGV4dDogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJUZXh0LFxuICAgICAgICAgICAgc3RhcnRDYWxlbmRhcjogb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQsXG4gICAgICAgICAgICB0eXBlOiAnZGF0ZScsXG4gICAgICAgICAgICBpbmxpbmU6IGZhbHNlLFxuICAgICAgICAgICAgbW9udGhGaXJzdDogZmFsc2UsXG4gICAgICAgICAgICByZWdFeHA6IFNlbWFudGljTG9jYWxpemF0aW9uLnJlZ0V4cCxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAobmV3RGF0ZVRvKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIHRoZSBjaGFuZ2UgZXZlbnQgZm9yIHJhbmdlIHRpbWUgZW5kXG4gICAgICAgICAgICAgICAgbGV0IG9sZERhdGVUbyA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGRhdGVfdG8uYXR0cigndmFsdWUnKTtcbiAgICAgICAgICAgICAgICBpZiAobmV3RGF0ZVRvICE9PSBudWxsICYmIG9sZERhdGVUbyAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgb2xkRGF0ZVRvID0gbmV3IERhdGUob2xkRGF0ZVRvICogMTAwMCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICgobmV3RGF0ZVRvIC0gb2xkRGF0ZVRvKSAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZGF0ZV9mcm9tLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgY2FsZW5kYXIgZm9yIHJhbmdlIHRpbWUgc3RhcnRcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lU3RhcnQuY2FsZW5kYXIoe1xuICAgICAgICAgICAgLy8gQ2FsZW5kYXIgY29uZmlndXJhdGlvbiBvcHRpb25zXG4gICAgICAgICAgICBmaXJzdERheU9mV2VlazogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJGaXJzdERheU9mV2VlayxcbiAgICAgICAgICAgIHRleHQ6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dCxcbiAgICAgICAgICAgIGVuZENhbGVuZGFyOiBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZVRpbWVFbmQsXG4gICAgICAgICAgICB0eXBlOiAndGltZScsXG4gICAgICAgICAgICBpbmxpbmU6IGZhbHNlLFxuICAgICAgICAgICAgZGlzYWJsZU1pbnV0ZTogdHJ1ZSxcbiAgICAgICAgICAgIGFtcG06IGZhbHNlLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBjYWxlbmRhciBmb3IgcmFuZ2UgdGltZSBlbmRcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lRW5kLmNhbGVuZGFyKHtcbiAgICAgICAgICAgIC8vIENhbGVuZGFyIGNvbmZpZ3VyYXRpb24gb3B0aW9uc1xuICAgICAgICAgICAgZmlyc3REYXlPZldlZWs6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyRmlyc3REYXlPZldlZWssXG4gICAgICAgICAgICB0ZXh0OiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQsXG4gICAgICAgICAgICB0eXBlOiAndGltZScsXG4gICAgICAgICAgICBpbmxpbmU6IGZhbHNlLFxuICAgICAgICAgICAgZGlzYWJsZU1pbnV0ZTogdHJ1ZSxcbiAgICAgICAgICAgIGFtcG06IGZhbHNlLFxuICAgICAgICAgICAgb25DaGFuZ2U6IChuZXdUaW1lVG8pID0+IHtcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgdGhlIGNoYW5nZSBldmVudCBmb3IgcmFuZ2UgdGltZSBlbmRcbiAgICAgICAgICAgICAgICBsZXQgb2xkVGltZVRvID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kdGltZV90by5hdHRyKCd2YWx1ZScpO1xuICAgICAgICAgICAgICAgIGlmIChuZXdUaW1lVG8gIT09IG51bGwgJiYgb2xkVGltZVRvICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICBvbGRUaW1lVG8gPSBuZXcgRGF0ZShvbGRUaW1lVG8gKiAxMDAwKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKChuZXdUaW1lVG8gLSBvbGRUaW1lVG8pICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR0aW1lX3RvLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgYWN0aW9uIGRyb3Bkb3duXG4gICAgICAgICQoJyNhY3Rpb24nKVxuICAgICAgICAgICAgLmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICBvbkNoYW5nZSgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSGFuZGxlIHRoZSBjaGFuZ2UgZXZlbnQgZm9yIHRoZSBhY3Rpb24gZHJvcGRvd25cbiAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgd2Vla2RheV9mcm9tIGRyb3Bkb3duXG4gICAgICAgICQoJyN3ZWVrZGF5X2Zyb20nKVxuICAgICAgICAgICAgLmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICBvbkNoYW5nZSgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSGFuZGxlIHRoZSBjaGFuZ2UgZXZlbnQgZm9yIHRoZSB3ZWVrZGF5X2Zyb20gZHJvcGRvd25cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZnJvbSA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3dlZWtkYXlfZnJvbScpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0byA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3dlZWtkYXlfdG8nKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZyb20gPCB0byB8fCB0byA9PT0gLTEgfHwgZnJvbSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ3dlZWtkYXlfdG8nLCBmcm9tKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSB3ZWVrZGF5X3RvIGRyb3Bkb3duXG4gICAgICAgICQoJyN3ZWVrZGF5X3RvJylcbiAgICAgICAgICAgIC5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2UoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEhhbmRsZSB0aGUgY2hhbmdlIGV2ZW50IGZvciB0aGUgd2Vla2RheV90byBkcm9wZG93blxuICAgICAgICAgICAgICAgICAgICBjb25zdCBmcm9tID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnd2Vla2RheV9mcm9tJyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRvID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnd2Vla2RheV90bycpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodG8gPCBmcm9tIHx8IGZyb20gPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICd3ZWVrZGF5X2Zyb20nLCB0byk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQmluZCBjbGljayBldmVudCB0byBlcmFzZS1kYXRlcyBidXR0b25cbiAgICAgICAgJCgnI2VyYXNlLWRhdGVzJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIC8vIEhhbmRsZSB0aGUgY2xpY2sgZXZlbnQgZm9yIGVyYXNlLWRhdGVzIGJ1dHRvblxuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQuY2FsZW5kYXIoJ2NsZWFyJyk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNFbmQuY2FsZW5kYXIoJ2NsZWFyJyk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqXG4gICAgICAgICAgICAgICAgLmZvcm0oJ3NldCB2YWx1ZXMnLCB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGVfZnJvbTogJycsXG4gICAgICAgICAgICAgICAgICAgIGRhdGVfdG86ICcnLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBCaW5kIGNsaWNrIGV2ZW50IHRvIGVyYXNlLXdlZWtkYXlzIGJ1dHRvblxuICAgICAgICAkKCcjZXJhc2Utd2Vla2RheXMnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgLy8gSGFuZGxlIHRoZSBjbGljayBldmVudCBmb3IgZXJhc2Utd2Vla2RheXMgYnV0dG9uXG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqXG4gICAgICAgICAgICAgICAgLmZvcm0oJ3NldCB2YWx1ZXMnLCB7XG4gICAgICAgICAgICAgICAgICAgIHdlZWtkYXlfZnJvbTogLTEsXG4gICAgICAgICAgICAgICAgICAgIHdlZWtkYXlfdG86IC0xLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEJpbmQgY2xpY2sgZXZlbnQgdG8gZXJhc2UtdGltZXBlcmlvZCBidXR0b25cbiAgICAgICAgJCgnI2VyYXNlLXRpbWVwZXJpb2QnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgLy8gSGFuZGxlIHRoZSBjbGljayBldmVudCBmb3IgZXJhc2UtdGltZXBlcmlvZCBidXR0b25cbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlVGltZVN0YXJ0LmNhbGVuZGFyKCdjbGVhcicpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lRW5kLmNhbGVuZGFyKCdjbGVhcicpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kdGltZV90by50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBhdWRpby1tZXNzYWdlLXNlbGVjdCBkcm9wZG93blxuICAgICAgICAkKCcjc2F2ZS1vdXRvZmZ3b3JrLWZvcm0gLmF1ZGlvLW1lc3NhZ2Utc2VsZWN0JykuZHJvcGRvd24oU291bmRGaWxlc1NlbGVjdG9yLmdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkoKSk7XG5cbiAgICAgICAgLy8gQ2hhbmdlIHRoZSBkYXRlIGZvcm1hdCBmcm9tIGxpbnV4dGltZSB0byBsb2NhbCByZXByZXNlbnRhdGlvblxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmNoYW5nZURhdGVGb3JtYXQoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBmb3JtXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBmb3J3YXJkaW5nU2VsZWN0RHJvcGRvd25cbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9yd2FyZGluZ1NlbGVjdERyb3Bkb3duLmRyb3Bkb3duKEV4dGVuc2lvbnMuZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhvdXRFbXB0eSgpKTtcblxuICAgICAgICAvLyBUb2dnbGUgZGlzYWJsZWQgZmllbGQgY2xhc3MgYmFzZWQgb24gYWN0aW9uIHZhbHVlXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQudG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCk7XG5cbiAgICAgICAgLy8gQmluZCBjaGVja2JveCBjaGFuZ2UgZXZlbnQgZm9yIGluYm91bmQgcnVsZXMgdGFibGVcbiAgICAgICAgJCgnI2luYm91bmQtcnVsZXMtdGFibGUgLnVpLmNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgdGhlIGNoYW5nZSBldmVudCBmb3IgaW5ib3VuZCBydWxlcyB0YWJsZSBjaGVja2JveFxuICAgICAgICAgICAgICAgIGlmICgkKHRoaXMpLnBhcmVudCgpLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2luYm91bmQtcnVsZXMtdGFibGUgLnVpLmNoZWNrYm94W2RhdGEtZGlkPScgKyAkKHRoaXMpLnBhcmVudCgpLmF0dHIoJ2RhdGEtZGlkJykgKyAnXScpLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2luYm91bmQtcnVsZXMtdGFibGUgLnVpLmNoZWNrYm94W2RhdGEtZGlkPScgKyAkKHRoaXMpLnBhcmVudCgpLmF0dHIoJ2RhdGEtZGlkJykgKyAnXScpLmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJylcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEJpbmQgY2hlY2tib3ggY2hhbmdlIGV2ZW50IGZvciBhbGxvd1Jlc3RyaWN0aW9uIGNoZWNrYm94XG4gICAgICAgICQoJyNhbGxvd1Jlc3RyaWN0aW9uJykucGFyZW50KCkuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6IG91dE9mV29ya1RpbWVSZWNvcmQuY2hhbmdlUmVzdHJpY3Rpb25cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ2FsbCBjaGFuZ2VSZXN0cmljdGlvbiBtZXRob2RcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5jaGFuZ2VSZXN0cmljdGlvbigpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGFuZ2VzIHRoZSB2aXNpYmlsaXR5IG9mIHRoZSAncnVsZXMnIHRhYiBiYXNlZCBvbiB0aGUgY2hlY2tlZCBzdGF0dXMgb2YgdGhlICdhbGxvd1Jlc3RyaWN0aW9uJyBjaGVja2JveC5cbiAgICAgKi9cbiAgICBjaGFuZ2VSZXN0cmljdGlvbigpIHtcbiAgICAgICAgaWYgKCQoJyNhbGxvd1Jlc3RyaWN0aW9uJykucGFyZW50KCkuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgJChcImFbZGF0YS10YWI9J3J1bGVzJ11cIikuc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJChcImFbZGF0YS10YWI9J3J1bGVzJ11cIikuaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnRzIHRoZSBkYXRlIGZvcm1hdCBmcm9tIGxpbnV4dGltZSB0byB0aGUgbG9jYWwgcmVwcmVzZW50YXRpb24uXG4gICAgICovXG4gICAgY2hhbmdlRGF0ZUZvcm1hdCgpIHtcbiAgICAgICAgY29uc3QgZGF0ZUZyb20gPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRkYXRlX2Zyb20uYXR0cigndmFsdWUnKTtcbiAgICAgICAgY29uc3QgZGF0ZVRvID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZGF0ZV90by5hdHRyKCd2YWx1ZScpO1xuICAgICAgICBjb25zdCBjdXJyZW50T2Zmc2V0ID0gbmV3IERhdGUoKS5nZXRUaW1lem9uZU9mZnNldCgpO1xuICAgICAgICBjb25zdCBzZXJ2ZXJPZmZzZXQgPSBwYXJzZUludChvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdzZXJ2ZXJPZmZzZXQnKSk7XG4gICAgICAgIGNvbnN0IG9mZnNldERpZmYgPSBzZXJ2ZXJPZmZzZXQgKyBjdXJyZW50T2Zmc2V0O1xuICAgICAgICBpZiAoZGF0ZUZyb20gIT09IHVuZGVmaW5lZCAmJiBkYXRlRnJvbS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBkYXRlRnJvbUluQnJvd3NlclRaID0gZGF0ZUZyb20gKiAxMDAwICsgb2Zmc2V0RGlmZiAqIDYwICogMTAwMDtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c1N0YXJ0LmNhbGVuZGFyKCdzZXQgZGF0ZScsIG5ldyBEYXRlKGRhdGVGcm9tSW5Ccm93c2VyVFopKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0ZVRvICE9PSB1bmRlZmluZWQgJiYgZGF0ZVRvLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGVUb0luQnJvd3NlclRaID0gZGF0ZVRvICogMTAwMCArIG9mZnNldERpZmYgKiA2MCAqIDEwMDA7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNFbmQuY2FsZW5kYXIoJ3NldCBkYXRlJywgbmV3IERhdGUoZGF0ZVRvSW5Ccm93c2VyVFopKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGVzIHRoZSB2aXNpYmlsaXR5IG9mIGNlcnRhaW4gZmllbGQgZ3JvdXBzIGJhc2VkIG9uIHRoZSBzZWxlY3RlZCBhY3Rpb24gdmFsdWUuXG4gICAgICovXG4gICAgdG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCkge1xuICAgICAgICBpZiAob3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnYWN0aW9uJykgPT09ICdleHRlbnNpb24nKSB7XG4gICAgICAgICAgICAkKCcjZXh0ZW5zaW9uLWdyb3VwJykuc2hvdygpO1xuICAgICAgICAgICAgJCgnI2F1ZGlvLWZpbGUtZ3JvdXAnKS5oaWRlKCk7XG4gICAgICAgICAgICAkKCcjYXVkaW9fbWVzc2FnZV9pZCcpLmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCgnI2V4dGVuc2lvbi1ncm91cCcpLmhpZGUoKTtcbiAgICAgICAgICAgICQoJyNhdWRpby1maWxlLWdyb3VwJykuc2hvdygpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZXh0ZW5zaW9uJywgLTEpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gZm9yIHZhbGlkYXRpbmcgc3BlY2lmaWMgZmllbGRzIGluIGEgZm9ybS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXN1bHQgLSBUaGUgcmVzdWx0IG9iamVjdCBjb250YWluaW5nIGZvcm0gZGF0YS5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbnxPYmplY3R9IFJldHVybnMgZmFsc2UgaWYgdmFsaWRhdGlvbiBmYWlscywgb3IgdGhlIHJlc3VsdCBvYmplY3QgaWYgdmFsaWRhdGlvbiBwYXNzZXMuXG4gICAgICovXG4gICAgY3VzdG9tVmFsaWRhdGVGb3JtKHJlc3VsdCkge1xuICAgICAgICAvLyBDaGVjayBkYXRlIGZpZWxkc1xuICAgICAgICBpZiAoKHJlc3VsdC5kYXRhLmRhdGVfZnJvbSAhPT0gJycgJiYgcmVzdWx0LmRhdGEuZGF0ZV90byA9PT0gJycpXG4gICAgICAgICAgICB8fCAocmVzdWx0LmRhdGEuZGF0ZV90byAhPT0gJycgJiYgcmVzdWx0LmRhdGEuZGF0ZV9mcm9tID09PSAnJykpIHtcbiAgICAgICAgICAgICQoJy5mb3JtIC5lcnJvci5tZXNzYWdlJykuaHRtbChnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja0RhdGVJbnRlcnZhbCkuc2hvdygpO1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIHdlZWtkYXkgZmllbGRzXG4gICAgICAgIGlmICgocmVzdWx0LmRhdGEud2Vla2RheV9mcm9tID4gMCAmJiByZXN1bHQuZGF0YS53ZWVrZGF5X3RvID09PSAnLTEnKVxuICAgICAgICAgICAgfHwgKHJlc3VsdC5kYXRhLndlZWtkYXlfdG8gPiAwICYmIHJlc3VsdC5kYXRhLndlZWtkYXlfZnJvbSA9PT0gJy0xJykpIHtcbiAgICAgICAgICAgICQoJy5mb3JtIC5lcnJvci5tZXNzYWdlJykuaHRtbChnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja1dlZWtEYXlJbnRlcnZhbCkuc2hvdygpO1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIHRpbWUgZmllbGRzXG4gICAgICAgIGlmICgocmVzdWx0LmRhdGEudGltZV9mcm9tLmxlbmd0aCA+IDAgJiYgcmVzdWx0LmRhdGEudGltZV90by5sZW5ndGggPT09IDApXG4gICAgICAgICAgICB8fCAocmVzdWx0LmRhdGEudGltZV90by5sZW5ndGggPiAwICYmIHJlc3VsdC5kYXRhLnRpbWVfZnJvbS5sZW5ndGggPT09IDApKSB7XG4gICAgICAgICAgICAkKCcuZm9ybSAuZXJyb3IubWVzc2FnZScpLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQ2hlY2tUaW1lSW50ZXJ2YWwpLnNob3coKTtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi50cmFuc2l0aW9uKCdzaGFrZScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIHRpbWUgZmllbGQgZm9ybWF0XG4gICAgICAgIGlmICgocmVzdWx0LmRhdGEudGltZV9mcm9tLmxlbmd0aCA+IDAgJiYgcmVzdWx0LmRhdGEudGltZV90by5sZW5ndGggPT09IDApXG4gICAgICAgICAgICB8fCAocmVzdWx0LmRhdGEudGltZV90by5sZW5ndGggPiAwICYmIHJlc3VsdC5kYXRhLnRpbWVfZnJvbS5sZW5ndGggPT09IDApKSB7XG4gICAgICAgICAgICAkKCcuZm9ybSAuZXJyb3IubWVzc2FnZScpLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQ2hlY2tUaW1lSW50ZXJ2YWwpLnNob3coKTtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi50cmFuc2l0aW9uKCdzaGFrZScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGFsbCBmaWVsZHNcbiAgICAgICAgaWYgKHJlc3VsdC5kYXRhLnRpbWVfZnJvbSA9PT0gJydcbiAgICAgICAgICAgICYmIHJlc3VsdC5kYXRhLnRpbWVfdG8gPT09ICcnXG4gICAgICAgICAgICAmJiByZXN1bHQuZGF0YS53ZWVrZGF5X2Zyb20gPT09ICctMSdcbiAgICAgICAgICAgICYmIHJlc3VsdC5kYXRhLndlZWtkYXlfdG8gPT09ICctMSdcbiAgICAgICAgICAgICYmIHJlc3VsdC5kYXRhLmRhdGVfZnJvbSA9PT0gJydcbiAgICAgICAgICAgICYmIHJlc3VsdC5kYXRhLmRhdGVfdG8gPT09ICcnKSB7XG4gICAgICAgICAgICAkKCcuZm9ybSAuZXJyb3IubWVzc2FnZScpLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlTm9SdWxlc1NlbGVjdGVkKS5zaG93KCk7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24udHJhbnNpdGlvbignc2hha2UnKS5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgICQoJy5mb3JtIC5lcnJvci5tZXNzYWdlJykuaHRtbCgnJykuaGlkZSgpO1xuICAgICAgICByZXN1bHQuZGF0YSA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBjb25zdCBkYXRlRnJvbSA9IG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c1N0YXJ0LmNhbGVuZGFyKCdnZXQgZGF0ZScpO1xuICAgICAgICBjb25zdCBkYXRlVG8gPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNFbmQuY2FsZW5kYXIoJ2dldCBkYXRlJyk7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRPZmZzZXQgPSBuZXcgRGF0ZSgpLmdldFRpbWV6b25lT2Zmc2V0KCk7XG4gICAgICAgIGNvbnN0IHNlcnZlck9mZnNldCA9IHBhcnNlSW50KG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3NlcnZlck9mZnNldCcpKTtcbiAgICAgICAgY29uc3Qgb2Zmc2V0RGlmZiA9IHNlcnZlck9mZnNldCArIGN1cnJlbnRPZmZzZXQ7XG4gICAgICAgIGlmIChkYXRlRnJvbSkge1xuICAgICAgICAgICAgZGF0ZUZyb20uc2V0SG91cnMoMCwgMCwgMCwgMCk7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5kYXRlX2Zyb20gPSBNYXRoLmZsb29yKGRhdGVGcm9tLmdldFRpbWUoKS8xMDAwKSAtIG9mZnNldERpZmYgKiA2MDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0ZVRvKSB7XG4gICAgICAgICAgICBkYXRlVG8uc2V0SG91cnMoMjMsIDU5LCA1OSwgMCk7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5kYXRlX3RvID0gTWF0aC5mbG9vcihkYXRlVG8uZ2V0VGltZSgpLzEwMDApIC0gb2Zmc2V0RGlmZiAqIDYwO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvdXRPZldvcmtUaW1lUmVjb3JkLmN1c3RvbVZhbGlkYXRlRm9ybShyZXN1bHQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9b3V0LW9mZi13b3JrLXRpbWUvc2F2ZWA7IC8vIEZvcm0gc3VibWlzc2lvbiBVUkxcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gb3V0T2ZXb3JrVGltZVJlY29yZC52YWxpZGF0ZVJ1bGVzOyAvLyBGb3JtIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gb3V0T2ZXb3JrVGltZVJlY29yZC5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gb3V0T2ZXb3JrVGltZVJlY29yZC5jYkFmdGVyU2VuZEZvcm07IC8vIENhbGxiYWNrIGFmdGVyIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxufTtcblxuLyoqXG4gKiBDdXN0b20gZm9ybSB2YWxpZGF0aW9uIHJ1bGUgdGhhdCBjaGVja3MgaWYgYSB2YWx1ZSBpcyBub3QgZW1wdHkgYmFzZWQgb24gYSBzcGVjaWZpYyBhY3Rpb24uXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIGJlIHZhbGlkYXRlZC5cbiAqIEBwYXJhbSB7c3RyaW5nfSBhY3Rpb24gLSBUaGUgYWN0aW9uIHRvIGNvbXBhcmUgYWdhaW5zdC5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIHRydWUgaWYgdGhlIHZhbHVlIGlzIG5vdCBlbXB0eSBvciB0aGUgYWN0aW9uIGRvZXMgbm90IG1hdGNoLCBmYWxzZSBvdGhlcndpc2UuXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5jdXN0b21Ob3RFbXB0eUlmQWN0aW9uUnVsZSA9ICh2YWx1ZSwgYWN0aW9uKSA9PiB7XG4gICAgaWYgKHZhbHVlLmxlbmd0aCA9PT0gMCAmJiAkKCcjYWN0aW9uJykudmFsKCkgPT09IGFjdGlvbikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xufTtcblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBvdXQgb2Ygd29yayBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmluaXRpYWxpemUoKTtcbn0pO1xuIl19