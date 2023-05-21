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

    $('#save-outoffwork-form .audio-message-select').dropdown(SoundFilesSelector.getDropdownSettingsWithEmpty()); // Initialize the form

    outOfWorkTimeRecord.initializeForm(); // Initialize the forwardingSelectDropdown

    outOfWorkTimeRecord.$forwardingSelectDropdown.dropdown(Extensions.getDropdownSettingsWithoutEmpty()); // Toggle disabled field class based on action value

    outOfWorkTimeRecord.toggleDisabledFieldClass(); // Change the date format from linuxtime to local representation

    outOfWorkTimeRecord.changeDateFormat(); // Bind checkbox change event for inbound rules table

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

    if (dateFrom !== undefined && dateFrom.length > 0) {
      outOfWorkTimeRecord.$rangeDaysStart.calendar('set date', new Date(dateFrom * 1000)); // outOfWorkTimeRecord.$formObj.form('set value', 'date_from', dateFrom);
    }

    if (dateTo !== undefined && dateTo.length > 0) {
      outOfWorkTimeRecord.$rangeDaysEnd.calendar('set date', new Date(dateTo * 1000)); // outOfWorkTimeRecord.$formObj.form('set value', 'date_to', dateTo);
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
      result.data.date_from = Math.round(dateFrom.getTime() / 1000);
    }

    var dateTo = outOfWorkTimeRecord.$rangeDaysEnd.calendar('get date');

    if (dateTo !== null) {
      dateTo.setHours(23, 59, 59, 0);
      result.data.date_to = Math.round(dateTo.getTime() / 1000);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9PdXRPZmZXb3JrVGltZS9vdXQtb2Ytd29yay10aW1lLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJvdXRPZldvcmtUaW1lUmVjb3JkIiwiJGZvcm1PYmoiLCIkIiwiJGRlZmF1bHREcm9wZG93biIsIiRyYW5nZURheXNTdGFydCIsIiRyYW5nZURheXNFbmQiLCIkcmFuZ2VUaW1lU3RhcnQiLCIkcmFuZ2VUaW1lRW5kIiwiJGRhdGVfZnJvbSIsIiRkYXRlX3RvIiwiJHRpbWVfdG8iLCIkZm9yd2FyZGluZ1NlbGVjdERyb3Bkb3duIiwidmFsaWRhdGVSdWxlcyIsImF1ZGlvX21lc3NhZ2VfaWQiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwidGZfVmFsaWRhdGVBdWRpb01lc3NhZ2VFbXB0eSIsImV4dGVuc2lvbiIsInRmX1ZhbGlkYXRlRXh0ZW5zaW9uRW1wdHkiLCJ0aW1lZnJvbSIsIm9wdGlvbmFsIiwidmFsdWUiLCJ0Zl9WYWxpZGF0ZUNoZWNrVGltZUludGVydmFsIiwidGltZXRvIiwiaW5pdGlhbGl6ZSIsInRhYiIsImRyb3Bkb3duIiwiY2FsZW5kYXIiLCJmaXJzdERheU9mV2VlayIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiY2FsZW5kYXJGaXJzdERheU9mV2VlayIsInRleHQiLCJjYWxlbmRhclRleHQiLCJlbmRDYWxlbmRhciIsImlubGluZSIsIm1vbnRoRmlyc3QiLCJyZWdFeHAiLCJzdGFydENhbGVuZGFyIiwib25DaGFuZ2UiLCJuZXdEYXRlVG8iLCJvbGREYXRlVG8iLCJhdHRyIiwiRGF0ZSIsInRyaWdnZXIiLCJkaXNhYmxlTWludXRlIiwiYW1wbSIsIm5ld1RpbWVUbyIsIm9sZFRpbWVUbyIsInRvZ2dsZURpc2FibGVkRmllbGRDbGFzcyIsImZyb20iLCJmb3JtIiwidG8iLCJvbiIsImUiLCJkYXRlX2Zyb20iLCJkYXRlX3RvIiwicHJldmVudERlZmF1bHQiLCJ3ZWVrZGF5X2Zyb20iLCJ3ZWVrZGF5X3RvIiwiU291bmRGaWxlc1NlbGVjdG9yIiwiZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eSIsImluaXRpYWxpemVGb3JtIiwiRXh0ZW5zaW9ucyIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRob3V0RW1wdHkiLCJjaGFuZ2VEYXRlRm9ybWF0IiwiY2hlY2tib3giLCJwYXJlbnQiLCJjaGFuZ2VSZXN0cmljdGlvbiIsInNob3ciLCJoaWRlIiwiZGF0ZUZyb20iLCJkYXRlVG8iLCJ1bmRlZmluZWQiLCJsZW5ndGgiLCJjdXN0b21WYWxpZGF0ZUZvcm0iLCJyZXN1bHQiLCJkYXRhIiwiaHRtbCIsInRmX1ZhbGlkYXRlQ2hlY2tEYXRlSW50ZXJ2YWwiLCJGb3JtIiwiJHN1Ym1pdEJ1dHRvbiIsInRyYW5zaXRpb24iLCJyZW1vdmVDbGFzcyIsInRmX1ZhbGlkYXRlQ2hlY2tXZWVrRGF5SW50ZXJ2YWwiLCJ0aW1lX2Zyb20iLCJ0aW1lX3RvIiwidGZfVmFsaWRhdGVOb1J1bGVzU2VsZWN0ZWQiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJzZXRIb3VycyIsIk1hdGgiLCJyb3VuZCIsImdldFRpbWUiLCJjYkFmdGVyU2VuZEZvcm0iLCJyZXNwb25zZSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJmbiIsImN1c3RvbU5vdEVtcHR5SWZBY3Rpb25SdWxlIiwiYWN0aW9uIiwidmFsIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxtQkFBbUIsR0FBRztBQUN4QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyx1QkFBRCxDQUxhO0FBT3hCQyxFQUFBQSxnQkFBZ0IsRUFBRUQsQ0FBQyxD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Q0QsU0FBTyxJQUFQO0FBQ0gsQ0FMRDtBQU9BO0FBQ0E7QUFDQTs7O0FBQ0FwRyxDQUFDLENBQUNzRyxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCekcsRUFBQUEsbUJBQW1CLENBQUMyQixVQUFwQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIEV4dGVuc2lvbnMsIEZvcm0sIFNlbWFudGljTG9jYWxpemF0aW9uLCBTb3VuZEZpbGVzU2VsZWN0b3IgKi9cblxuXG4vKipcbiAqIE9iamVjdCBmb3IgbWFuYWdpbmcgT3V0LW9mLVdvcmsgVGltZSBzZXR0aW5nc1xuICpcbiAqIEBtb2R1bGUgb3V0T2ZXb3JrVGltZVJlY29yZFxuICovXG5jb25zdCBvdXRPZldvcmtUaW1lUmVjb3JkID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNzYXZlLW91dG9mZndvcmstZm9ybScpLFxuXG4gICAgJGRlZmF1bHREcm9wZG93bjogJCgnI3NhdmUtb3V0b2Zmd29yay1mb3JtIC5kcm9wZG93bi1kZWZhdWx0JyksXG4gICAgJHJhbmdlRGF5c1N0YXJ0OiAkKCcjcmFuZ2UtZGF5cy1zdGFydCcpLFxuICAgICRyYW5nZURheXNFbmQ6ICQoJyNyYW5nZS1kYXlzLWVuZCcpLFxuICAgICRyYW5nZVRpbWVTdGFydDogJCgnI3JhbmdlLXRpbWUtc3RhcnQnKSxcbiAgICAkcmFuZ2VUaW1lRW5kOiAkKCcjcmFuZ2UtdGltZS1lbmQnKSxcbiAgICAkZGF0ZV9mcm9tOiAkKCcjZGF0ZV9mcm9tJyksXG4gICAgJGRhdGVfdG86ICQoJyNkYXRlX3RvJyksXG4gICAgJHRpbWVfdG86ICQoJyN0aW1lX3RvJyksXG4gICAgJGZvcndhcmRpbmdTZWxlY3REcm9wZG93bjogJCgnI3NhdmUtb3V0b2Zmd29yay1mb3JtIC5mb3J3YXJkaW5nLXNlbGVjdCcpLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIGF1ZGlvX21lc3NhZ2VfaWQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdhdWRpb19tZXNzYWdlX2lkJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY3VzdG9tTm90RW1wdHlJZkFjdGlvblJ1bGVbcGxheW1lc3NhZ2VdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVBdWRpb01lc3NhZ2VFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZXh0ZW5zaW9uOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZXh0ZW5zaW9uJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnY3VzdG9tTm90RW1wdHlJZkFjdGlvblJ1bGVbZXh0ZW5zaW9uXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlRXh0ZW5zaW9uRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHRpbWVmcm9tOiB7XG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd0aW1lX2Zyb20nLFxuICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgdmFsdWU6IC9eKDJbMC0zXXwxP1swLTldKTooWzAtNV0/WzAtOV0pJC8sXG4gICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja1RpbWVJbnRlcnZhbCxcbiAgICAgICAgICAgIH1dLFxuICAgICAgICB9LFxuICAgICAgICB0aW1ldG86IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd0aW1lX3RvJyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFt7XG4gICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgdmFsdWU6IC9eKDJbMC0zXXwxP1swLTldKTooWzAtNV0/WzAtOV0pJC8sXG4gICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja1RpbWVJbnRlcnZhbCxcbiAgICAgICAgICAgIH1dLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgb3V0IG9mIHdvcmsgdGltZSByZWNvcmQgZm9ybS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIHRhYiBiZWhhdmlvciBmb3IgdGhlIG91dC10aW1lLW1vZGlmeS1tZW51XG4gICAgICAgICQoJyNvdXQtdGltZS1tb2RpZnktbWVudSAuaXRlbScpLnRhYigpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGRlZmF1bHQgZHJvcGRvd25cbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZGVmYXVsdERyb3Bkb3duLmRyb3Bkb3duKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgY2FsZW5kYXIgZm9yIHJhbmdlIGRheXMgc3RhcnRcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQuY2FsZW5kYXIoe1xuICAgICAgICAgICAgLy8gQ2FsZW5kYXIgY29uZmlndXJhdGlvbiBvcHRpb25zXG4gICAgICAgICAgICBmaXJzdERheU9mV2VlazogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJGaXJzdERheU9mV2VlayxcbiAgICAgICAgICAgIHRleHQ6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dCxcbiAgICAgICAgICAgIGVuZENhbGVuZGFyOiBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNFbmQsXG4gICAgICAgICAgICB0eXBlOiAnZGF0ZScsXG4gICAgICAgICAgICBpbmxpbmU6IGZhbHNlLFxuICAgICAgICAgICAgbW9udGhGaXJzdDogZmFsc2UsXG4gICAgICAgICAgICByZWdFeHA6IFNlbWFudGljTG9jYWxpemF0aW9uLnJlZ0V4cCxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgY2FsZW5kYXIgZm9yIHJhbmdlIGRheXMgZW5kXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c0VuZC5jYWxlbmRhcih7XG4gICAgICAgICAgICAvLyBDYWxlbmRhciBjb25maWd1cmF0aW9uIG9wdGlvbnNcbiAgICAgICAgICAgIGZpcnN0RGF5T2ZXZWVrOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhckZpcnN0RGF5T2ZXZWVrLFxuICAgICAgICAgICAgdGV4dDogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJUZXh0LFxuICAgICAgICAgICAgc3RhcnRDYWxlbmRhcjogb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQsXG4gICAgICAgICAgICB0eXBlOiAnZGF0ZScsXG4gICAgICAgICAgICBpbmxpbmU6IGZhbHNlLFxuICAgICAgICAgICAgbW9udGhGaXJzdDogZmFsc2UsXG4gICAgICAgICAgICByZWdFeHA6IFNlbWFudGljTG9jYWxpemF0aW9uLnJlZ0V4cCxcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAobmV3RGF0ZVRvKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIHRoZSBjaGFuZ2UgZXZlbnQgZm9yIHJhbmdlIHRpbWUgZW5kXG4gICAgICAgICAgICAgICAgbGV0IG9sZERhdGVUbyA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGRhdGVfdG8uYXR0cigndmFsdWUnKTtcbiAgICAgICAgICAgICAgICBpZiAobmV3RGF0ZVRvICE9PSBudWxsICYmIG9sZERhdGVUbyAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgb2xkRGF0ZVRvID0gbmV3IERhdGUob2xkRGF0ZVRvICogMTAwMCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICgobmV3RGF0ZVRvIC0gb2xkRGF0ZVRvKSAhPT0gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZGF0ZV9mcm9tLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgY2FsZW5kYXIgZm9yIHJhbmdlIHRpbWUgc3RhcnRcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lU3RhcnQuY2FsZW5kYXIoe1xuICAgICAgICAgICAgLy8gQ2FsZW5kYXIgY29uZmlndXJhdGlvbiBvcHRpb25zXG4gICAgICAgICAgICBmaXJzdERheU9mV2VlazogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJGaXJzdERheU9mV2VlayxcbiAgICAgICAgICAgIHRleHQ6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dCxcbiAgICAgICAgICAgIGVuZENhbGVuZGFyOiBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZVRpbWVFbmQsXG4gICAgICAgICAgICB0eXBlOiAndGltZScsXG4gICAgICAgICAgICBpbmxpbmU6IGZhbHNlLFxuICAgICAgICAgICAgZGlzYWJsZU1pbnV0ZTogdHJ1ZSxcbiAgICAgICAgICAgIGFtcG06IGZhbHNlLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBjYWxlbmRhciBmb3IgcmFuZ2UgdGltZSBlbmRcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lRW5kLmNhbGVuZGFyKHtcbiAgICAgICAgICAgIC8vIENhbGVuZGFyIGNvbmZpZ3VyYXRpb24gb3B0aW9uc1xuICAgICAgICAgICAgZmlyc3REYXlPZldlZWs6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyRmlyc3REYXlPZldlZWssXG4gICAgICAgICAgICB0ZXh0OiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQsXG4gICAgICAgICAgICB0eXBlOiAndGltZScsXG4gICAgICAgICAgICBpbmxpbmU6IGZhbHNlLFxuICAgICAgICAgICAgZGlzYWJsZU1pbnV0ZTogdHJ1ZSxcbiAgICAgICAgICAgIGFtcG06IGZhbHNlLFxuICAgICAgICAgICAgb25DaGFuZ2U6IChuZXdUaW1lVG8pID0+IHtcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgdGhlIGNoYW5nZSBldmVudCBmb3IgcmFuZ2UgdGltZSBlbmRcbiAgICAgICAgICAgICAgICBsZXQgb2xkVGltZVRvID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kdGltZV90by5hdHRyKCd2YWx1ZScpO1xuICAgICAgICAgICAgICAgIGlmIChuZXdUaW1lVG8gIT09IG51bGwgJiYgb2xkVGltZVRvICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICBvbGRUaW1lVG8gPSBuZXcgRGF0ZShvbGRUaW1lVG8gKiAxMDAwKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKChuZXdUaW1lVG8gLSBvbGRUaW1lVG8pICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR0aW1lX3RvLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgYWN0aW9uIGRyb3Bkb3duXG4gICAgICAgICQoJyNhY3Rpb24nKVxuICAgICAgICAgICAgLmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICBvbkNoYW5nZSgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSGFuZGxlIHRoZSBjaGFuZ2UgZXZlbnQgZm9yIHRoZSBhY3Rpb24gZHJvcGRvd25cbiAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgd2Vla2RheV9mcm9tIGRyb3Bkb3duXG4gICAgICAgICQoJyN3ZWVrZGF5X2Zyb20nKVxuICAgICAgICAgICAgLmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICBvbkNoYW5nZSgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSGFuZGxlIHRoZSBjaGFuZ2UgZXZlbnQgZm9yIHRoZSB3ZWVrZGF5X2Zyb20gZHJvcGRvd25cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZnJvbSA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3dlZWtkYXlfZnJvbScpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0byA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3dlZWtkYXlfdG8nKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZyb20gPCB0byB8fCB0byA9PT0gLTEgfHwgZnJvbSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ3dlZWtkYXlfdG8nLCBmcm9tKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSB3ZWVrZGF5X3RvIGRyb3Bkb3duXG4gICAgICAgICQoJyN3ZWVrZGF5X3RvJylcbiAgICAgICAgICAgIC5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2UoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEhhbmRsZSB0aGUgY2hhbmdlIGV2ZW50IGZvciB0aGUgd2Vla2RheV90byBkcm9wZG93blxuICAgICAgICAgICAgICAgICAgICBjb25zdCBmcm9tID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnd2Vla2RheV9mcm9tJyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRvID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnd2Vla2RheV90bycpO1xuICAgICAgICAgICAgICAgICAgICBpZiAodG8gPCBmcm9tIHx8IGZyb20gPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICd3ZWVrZGF5X2Zyb20nLCB0byk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQmluZCBjbGljayBldmVudCB0byBlcmFzZS1kYXRlcyBidXR0b25cbiAgICAgICAgJCgnI2VyYXNlLWRhdGVzJykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIC8vIEhhbmRsZSB0aGUgY2xpY2sgZXZlbnQgZm9yIGVyYXNlLWRhdGVzIGJ1dHRvblxuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQuY2FsZW5kYXIoJ2NsZWFyJyk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNFbmQuY2FsZW5kYXIoJ2NsZWFyJyk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqXG4gICAgICAgICAgICAgICAgLmZvcm0oJ3NldCB2YWx1ZXMnLCB7XG4gICAgICAgICAgICAgICAgICAgIGRhdGVfZnJvbTogJycsXG4gICAgICAgICAgICAgICAgICAgIGRhdGVfdG86ICcnLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBCaW5kIGNsaWNrIGV2ZW50IHRvIGVyYXNlLXdlZWtkYXlzIGJ1dHRvblxuICAgICAgICAkKCcjZXJhc2Utd2Vla2RheXMnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgLy8gSGFuZGxlIHRoZSBjbGljayBldmVudCBmb3IgZXJhc2Utd2Vla2RheXMgYnV0dG9uXG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqXG4gICAgICAgICAgICAgICAgLmZvcm0oJ3NldCB2YWx1ZXMnLCB7XG4gICAgICAgICAgICAgICAgICAgIHdlZWtkYXlfZnJvbTogLTEsXG4gICAgICAgICAgICAgICAgICAgIHdlZWtkYXlfdG86IC0xLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEJpbmQgY2xpY2sgZXZlbnQgdG8gZXJhc2UtdGltZXBlcmlvZCBidXR0b25cbiAgICAgICAgJCgnI2VyYXNlLXRpbWVwZXJpb2QnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgLy8gSGFuZGxlIHRoZSBjbGljayBldmVudCBmb3IgZXJhc2UtdGltZXBlcmlvZCBidXR0b25cbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlVGltZVN0YXJ0LmNhbGVuZGFyKCdjbGVhcicpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lRW5kLmNhbGVuZGFyKCdjbGVhcicpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kdGltZV90by50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBhdWRpby1tZXNzYWdlLXNlbGVjdCBkcm9wZG93blxuICAgICAgICAkKCcjc2F2ZS1vdXRvZmZ3b3JrLWZvcm0gLmF1ZGlvLW1lc3NhZ2Utc2VsZWN0JykuZHJvcGRvd24oU291bmRGaWxlc1NlbGVjdG9yLmdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkoKSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZm9ybVxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZm9yd2FyZGluZ1NlbGVjdERyb3Bkb3duXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcndhcmRpbmdTZWxlY3REcm9wZG93bi5kcm9wZG93bihFeHRlbnNpb25zLmdldERyb3Bkb3duU2V0dGluZ3NXaXRob3V0RW1wdHkoKSk7XG5cbiAgICAgICAgLy8gVG9nZ2xlIGRpc2FibGVkIGZpZWxkIGNsYXNzIGJhc2VkIG9uIGFjdGlvbiB2YWx1ZVxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuXG4gICAgICAgIC8vIENoYW5nZSB0aGUgZGF0ZSBmb3JtYXQgZnJvbSBsaW51eHRpbWUgdG8gbG9jYWwgcmVwcmVzZW50YXRpb25cbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5jaGFuZ2VEYXRlRm9ybWF0KCk7XG5cbiAgICAgICAgLy8gQmluZCBjaGVja2JveCBjaGFuZ2UgZXZlbnQgZm9yIGluYm91bmQgcnVsZXMgdGFibGVcbiAgICAgICAgJCgnI2luYm91bmQtcnVsZXMtdGFibGUgLnVpLmNoZWNrYm94JykuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgdGhlIGNoYW5nZSBldmVudCBmb3IgaW5ib3VuZCBydWxlcyB0YWJsZSBjaGVja2JveFxuICAgICAgICAgICAgICAgIGlmICgkKHRoaXMpLnBhcmVudCgpLmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2luYm91bmQtcnVsZXMtdGFibGUgLnVpLmNoZWNrYm94W2RhdGEtZGlkPScgKyAkKHRoaXMpLnBhcmVudCgpLmF0dHIoJ2RhdGEtZGlkJykgKyAnXScpLmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJCgnI2luYm91bmQtcnVsZXMtdGFibGUgLnVpLmNoZWNrYm94W2RhdGEtZGlkPScgKyAkKHRoaXMpLnBhcmVudCgpLmF0dHIoJ2RhdGEtZGlkJykgKyAnXScpLmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJylcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEJpbmQgY2hlY2tib3ggY2hhbmdlIGV2ZW50IGZvciBhbGxvd1Jlc3RyaWN0aW9uIGNoZWNrYm94XG4gICAgICAgICQoJyNhbGxvd1Jlc3RyaWN0aW9uJykucGFyZW50KCkuY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6IG91dE9mV29ya1RpbWVSZWNvcmQuY2hhbmdlUmVzdHJpY3Rpb25cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ2FsbCBjaGFuZ2VSZXN0cmljdGlvbiBtZXRob2RcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5jaGFuZ2VSZXN0cmljdGlvbigpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGFuZ2VzIHRoZSB2aXNpYmlsaXR5IG9mIHRoZSAncnVsZXMnIHRhYiBiYXNlZCBvbiB0aGUgY2hlY2tlZCBzdGF0dXMgb2YgdGhlICdhbGxvd1Jlc3RyaWN0aW9uJyBjaGVja2JveC5cbiAgICAgKi9cbiAgICBjaGFuZ2VSZXN0cmljdGlvbigpIHtcbiAgICAgICAgaWYgKCQoJyNhbGxvd1Jlc3RyaWN0aW9uJykucGFyZW50KCkuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgJChcImFbZGF0YS10YWI9J3J1bGVzJ11cIikuc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJChcImFbZGF0YS10YWI9J3J1bGVzJ11cIikuaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENvbnZlcnRzIHRoZSBkYXRlIGZvcm1hdCBmcm9tIGxpbnV4dGltZSB0byB0aGUgbG9jYWwgcmVwcmVzZW50YXRpb24uXG4gICAgICovXG4gICAgY2hhbmdlRGF0ZUZvcm1hdCgpIHtcbiAgICAgICAgY29uc3QgZGF0ZUZyb20gPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRkYXRlX2Zyb20uYXR0cigndmFsdWUnKTtcbiAgICAgICAgY29uc3QgZGF0ZVRvID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZGF0ZV90by5hdHRyKCd2YWx1ZScpO1xuICAgICAgICBpZiAoZGF0ZUZyb20gIT09IHVuZGVmaW5lZCAmJiBkYXRlRnJvbS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNTdGFydC5jYWxlbmRhcignc2V0IGRhdGUnLCBuZXcgRGF0ZShkYXRlRnJvbSAqIDEwMDApKTtcbiAgICAgICAgICAgIC8vIG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2RhdGVfZnJvbScsIGRhdGVGcm9tKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoZGF0ZVRvICE9PSB1bmRlZmluZWQgJiYgZGF0ZVRvLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c0VuZC5jYWxlbmRhcignc2V0IGRhdGUnLCBuZXcgRGF0ZShkYXRlVG8gKiAxMDAwKSk7XG4gICAgICAgICAgICAvLyBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdkYXRlX3RvJywgZGF0ZVRvKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGVzIHRoZSB2aXNpYmlsaXR5IG9mIGNlcnRhaW4gZmllbGQgZ3JvdXBzIGJhc2VkIG9uIHRoZSBzZWxlY3RlZCBhY3Rpb24gdmFsdWUuXG4gICAgICovXG4gICAgdG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzKCkge1xuICAgICAgICBpZiAob3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnYWN0aW9uJykgPT09ICdleHRlbnNpb24nKSB7XG4gICAgICAgICAgICAkKCcjZXh0ZW5zaW9uLWdyb3VwJykuc2hvdygpO1xuICAgICAgICAgICAgJCgnI2F1ZGlvLWZpbGUtZ3JvdXAnKS5oaWRlKCk7XG4gICAgICAgICAgICAkKCcjYXVkaW9fbWVzc2FnZV9pZCcpLmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCgnI2V4dGVuc2lvbi1ncm91cCcpLmhpZGUoKTtcbiAgICAgICAgICAgICQoJyNhdWRpby1maWxlLWdyb3VwJykuc2hvdygpO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZXh0ZW5zaW9uJywgLTEpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gZm9yIHZhbGlkYXRpbmcgc3BlY2lmaWMgZmllbGRzIGluIGEgZm9ybS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXN1bHQgLSBUaGUgcmVzdWx0IG9iamVjdCBjb250YWluaW5nIGZvcm0gZGF0YS5cbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbnxPYmplY3R9IFJldHVybnMgZmFsc2UgaWYgdmFsaWRhdGlvbiBmYWlscywgb3IgdGhlIHJlc3VsdCBvYmplY3QgaWYgdmFsaWRhdGlvbiBwYXNzZXMuXG4gICAgICovXG4gICAgY3VzdG9tVmFsaWRhdGVGb3JtKHJlc3VsdCkge1xuICAgICAgICAvLyBDaGVjayBkYXRlIGZpZWxkc1xuICAgICAgICBpZiAoKHJlc3VsdC5kYXRhLmRhdGVfZnJvbSAhPT0gJycgJiYgcmVzdWx0LmRhdGEuZGF0ZV90byA9PT0gJycpXG4gICAgICAgICAgICB8fCAocmVzdWx0LmRhdGEuZGF0ZV90byAhPT0gJycgJiYgcmVzdWx0LmRhdGEuZGF0ZV9mcm9tID09PSAnJykpIHtcbiAgICAgICAgICAgICQoJy5mb3JtIC5lcnJvci5tZXNzYWdlJykuaHRtbChnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja0RhdGVJbnRlcnZhbCkuc2hvdygpO1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIHdlZWtkYXkgZmllbGRzXG4gICAgICAgIGlmICgocmVzdWx0LmRhdGEud2Vla2RheV9mcm9tID4gMCAmJiByZXN1bHQuZGF0YS53ZWVrZGF5X3RvID09PSAnLTEnKVxuICAgICAgICAgICAgfHwgKHJlc3VsdC5kYXRhLndlZWtkYXlfdG8gPiAwICYmIHJlc3VsdC5kYXRhLndlZWtkYXlfZnJvbSA9PT0gJy0xJykpIHtcbiAgICAgICAgICAgICQoJy5mb3JtIC5lcnJvci5tZXNzYWdlJykuaHRtbChnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja1dlZWtEYXlJbnRlcnZhbCkuc2hvdygpO1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIHRpbWUgZmllbGRzXG4gICAgICAgIGlmICgocmVzdWx0LmRhdGEudGltZV9mcm9tLmxlbmd0aCA+IDAgJiYgcmVzdWx0LmRhdGEudGltZV90by5sZW5ndGggPT09IDApXG4gICAgICAgICAgICB8fCAocmVzdWx0LmRhdGEudGltZV90by5sZW5ndGggPiAwICYmIHJlc3VsdC5kYXRhLnRpbWVfZnJvbS5sZW5ndGggPT09IDApKSB7XG4gICAgICAgICAgICAkKCcuZm9ybSAuZXJyb3IubWVzc2FnZScpLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQ2hlY2tUaW1lSW50ZXJ2YWwpLnNob3coKTtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi50cmFuc2l0aW9uKCdzaGFrZScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIHRpbWUgZmllbGQgZm9ybWF0XG4gICAgICAgIGlmICgocmVzdWx0LmRhdGEudGltZV9mcm9tLmxlbmd0aCA+IDAgJiYgcmVzdWx0LmRhdGEudGltZV90by5sZW5ndGggPT09IDApXG4gICAgICAgICAgICB8fCAocmVzdWx0LmRhdGEudGltZV90by5sZW5ndGggPiAwICYmIHJlc3VsdC5kYXRhLnRpbWVfZnJvbS5sZW5ndGggPT09IDApKSB7XG4gICAgICAgICAgICAkKCcuZm9ybSAuZXJyb3IubWVzc2FnZScpLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlQ2hlY2tUaW1lSW50ZXJ2YWwpLnNob3coKTtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi50cmFuc2l0aW9uKCdzaGFrZScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGFsbCBmaWVsZHNcbiAgICAgICAgaWYgKHJlc3VsdC5kYXRhLnRpbWVfZnJvbSA9PT0gJydcbiAgICAgICAgICAgICYmIHJlc3VsdC5kYXRhLnRpbWVfdG8gPT09ICcnXG4gICAgICAgICAgICAmJiByZXN1bHQuZGF0YS53ZWVrZGF5X2Zyb20gPT09ICctMSdcbiAgICAgICAgICAgICYmIHJlc3VsdC5kYXRhLndlZWtkYXlfdG8gPT09ICctMSdcbiAgICAgICAgICAgICYmIHJlc3VsdC5kYXRhLmRhdGVfZnJvbSA9PT0gJydcbiAgICAgICAgICAgICYmIHJlc3VsdC5kYXRhLmRhdGVfdG8gPT09ICcnKSB7XG4gICAgICAgICAgICAkKCcuZm9ybSAuZXJyb3IubWVzc2FnZScpLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLnRmX1ZhbGlkYXRlTm9SdWxlc1NlbGVjdGVkKS5zaG93KCk7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24udHJhbnNpdGlvbignc2hha2UnKS5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgICQoJy5mb3JtIC5lcnJvci5tZXNzYWdlJykuaHRtbCgnJykuaGlkZSgpO1xuICAgICAgICByZXN1bHQuZGF0YSA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBjb25zdCBkYXRlRnJvbSA9IG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c1N0YXJ0LmNhbGVuZGFyKCdnZXQgZGF0ZScpO1xuICAgICAgICBpZiAoZGF0ZUZyb20gIT09IG51bGwpIHtcbiAgICAgICAgICAgIGRhdGVGcm9tLnNldEhvdXJzKDAsIDAsIDAsIDApO1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuZGF0ZV9mcm9tID0gTWF0aC5yb3VuZChkYXRlRnJvbS5nZXRUaW1lKCkgLyAxMDAwKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkYXRlVG8gPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNFbmQuY2FsZW5kYXIoJ2dldCBkYXRlJyk7XG4gICAgICAgIGlmIChkYXRlVG8gIT09IG51bGwpIHtcbiAgICAgICAgICAgIGRhdGVUby5zZXRIb3VycygyMywgNTksIDU5LCAwKTtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmRhdGVfdG8gPSBNYXRoLnJvdW5kKGRhdGVUby5nZXRUaW1lKCkgLyAxMDAwKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3V0T2ZXb3JrVGltZVJlY29yZC5jdXN0b21WYWxpZGF0ZUZvcm0ocmVzdWx0KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfW91dC1vZmYtd29yay10aW1lL3NhdmVgOyAvLyBGb3JtIHN1Ym1pc3Npb24gVVJMXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IG91dE9mV29ya1RpbWVSZWNvcmQudmFsaWRhdGVSdWxlczsgLy8gRm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IG91dE9mV29ya1RpbWVSZWNvcmQuY2JCZWZvcmVTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYmVmb3JlIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IG91dE9mV29ya1RpbWVSZWNvcmQuY2JBZnRlclNlbmRGb3JtOyAvLyBDYWxsYmFjayBhZnRlciBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcbn07XG5cbi8qKlxuICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBydWxlIHRoYXQgY2hlY2tzIGlmIGEgdmFsdWUgaXMgbm90IGVtcHR5IGJhc2VkIG9uIGEgc3BlY2lmaWMgYWN0aW9uLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSB2YWx1ZSB0byBiZSB2YWxpZGF0ZWQuXG4gKiBAcGFyYW0ge3N0cmluZ30gYWN0aW9uIC0gVGhlIGFjdGlvbiB0byBjb21wYXJlIGFnYWluc3QuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyB0cnVlIGlmIHRoZSB2YWx1ZSBpcyBub3QgZW1wdHkgb3IgdGhlIGFjdGlvbiBkb2VzIG5vdCBtYXRjaCwgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuY3VzdG9tTm90RW1wdHlJZkFjdGlvblJ1bGUgPSAodmFsdWUsIGFjdGlvbikgPT4ge1xuICAgIGlmICh2YWx1ZS5sZW5ndGggPT09IDAgJiYgJCgnI2FjdGlvbicpLnZhbCgpID09PSBhY3Rpb24pIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbn07XG5cbi8qKlxuICogIEluaXRpYWxpemUgb3V0IG9mIHdvcmsgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgb3V0T2ZXb3JrVGltZVJlY29yZC5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==