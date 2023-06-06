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
      formatter: {
        time: 'H:mm',
        cellTime: 'H:mm'
      }
    }); // Initialize the calendar for range time end

    outOfWorkTimeRecord.$rangeTimeEnd.calendar({
      // Calendar configuration options
      firstDayOfWeek: SemanticLocalization.calendarFirstDayOfWeek,
      text: SemanticLocalization.calendarText,
      type: 'time',
      inline: false,
      disableMinute: true,
      formatter: {
        time: 'H:mm',
        cellTime: 'H:mm'
      },
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9PdXRPZmZXb3JrVGltZS9vdXQtb2Ytd29yay10aW1lLW1vZGlmeS5qcyJdLCJuYW1lcyI6WyJvdXRPZldvcmtUaW1lUmVjb3JkIiwiJGZvcm1PYmoiLCIkIiwiJGRlZmF1bHREcm9wZG93biIsIiRyYW5nZURheXNTdGFydCIsIiRyYW5nZURheXNFbmQiLCIkcmFuZ2VUaW1lU3RhcnQiLCIkcmFuZ2VUaW1lRW5kIiwiJGRhdGVfZnJvbSIsIiRkYXRlX3RvIiwiJHRpbWVfdG8iLCIkZm9yd2FyZGluZ1NlbGVjdERyb3Bkb3duIiwidmFsaWRhdGVSdWxlcyIsImF1ZGlvX21lc3NhZ2VfaWQiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwidGZfVmFsaWRhdGVBdWRpb01lc3NhZ2VFbXB0eSIsImV4dGVuc2lvbiIsInRmX1ZhbGlkYXRlRXh0ZW5zaW9uRW1wdHkiLCJ0aW1lZnJvbSIsIm9wdGlvbmFsIiwidmFsdWUiLCJ0Zl9WYWxpZGF0ZUNoZWNrVGltZUludGVydmFsIiwidGltZXRvIiwiaW5pdGlhbGl6ZSIsInRhYiIsImRyb3Bkb3duIiwiY2FsZW5kYXIiLCJmaXJzdERheU9mV2VlayIsIlNlbWFudGljTG9jYWxpemF0aW9uIiwiY2FsZW5kYXJGaXJzdERheU9mV2VlayIsInRleHQiLCJjYWxlbmRhclRleHQiLCJlbmRDYWxlbmRhciIsImlubGluZSIsIm1vbnRoRmlyc3QiLCJyZWdFeHAiLCJzdGFydENhbGVuZGFyIiwib25DaGFuZ2UiLCJuZXdEYXRlVG8iLCJvbGREYXRlVG8iLCJhdHRyIiwiRGF0ZSIsInRyaWdnZXIiLCJkaXNhYmxlTWludXRlIiwiZm9ybWF0dGVyIiwidGltZSIsImNlbGxUaW1lIiwibmV3VGltZVRvIiwib2xkVGltZVRvIiwidG9nZ2xlRGlzYWJsZWRGaWVsZENsYXNzIiwiZnJvbSIsImZvcm0iLCJ0byIsIm9uIiwiZSIsImRhdGVfZnJvbSIsImRhdGVfdG8iLCJwcmV2ZW50RGVmYXVsdCIsIndlZWtkYXlfZnJvbSIsIndlZWtkYXlfdG8iLCJTb3VuZEZpbGVzU2VsZWN0b3IiLCJnZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5IiwiY2hhbmdlRGF0ZUZvcm1hdCIsImluaXRpYWxpemVGb3JtIiwiRXh0ZW5zaW9ucyIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRob3V0RW1wdHkiLCJjaGVja2JveCIsInBhcmVudCIsImNoYW5nZVJlc3RyaWN0aW9uIiwic2hvdyIsImhpZGUiLCJkYXRlRnJvbSIsImRhdGVUbyIsImN1cnJlbnRPZmZzZXQiLCJnZXRUaW1lem9uZU9mZnNldCIsInNlcnZlck9mZnNldCIsInBhcnNlSW50Iiwib2Zmc2V0RGlmZiIsInVuZGVmaW5lZCIsImxlbmd0aCIsImRhdGVGcm9tSW5Ccm93c2VyVFoiLCJkYXRlVG9JbkJyb3dzZXJUWiIsImN1c3RvbVZhbGlkYXRlRm9ybSIsInJlc3VsdCIsImRhdGEiLCJodG1sIiwidGZfVmFsaWRhdGVDaGVja0RhdGVJbnRlcnZhbCIsIkZvcm0iLCIkc3VibWl0QnV0dG9uIiwidHJhbnNpdGlvbiIsInJlbW92ZUNsYXNzIiwidGZfVmFsaWRhdGVDaGVja1dlZWtEYXlJbnRlcnZhbCIsInRpbWVfZnJvbSIsInRpbWVfdG8iLCJ0Zl9WYWxpZGF0ZU5vUnVsZXNTZWxlY3RlZCIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsInNldEhvdXJzIiwiY2JBZnRlclNlbmRGb3JtIiwicmVzcG9uc2UiLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwiZm4iLCJjdXN0b21Ob3RFbXB0eUlmQWN0aW9uUnVsZSIsImFjdGlvbiIsInZhbCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0Es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RSxhQUFMLEdBQXFCWixtQkFBbUIsQ0FBQ1ksYUFBekMsQ0FIYSxDQUcyQzs7QUFDeEQrRSxJQUFBQSxJQUFJLENBQUNRLGdCQUFMLEdBQXdCbkcsbUJBQW1CLENBQUNtRyxnQkFBNUMsQ0FKYSxDQUlpRDs7QUFDOURSLElBQUFBLElBQUksQ0FBQ1csZUFBTCxHQUF1QnRHLG1CQUFtQixDQUFDc0csZUFBM0MsQ0FMYSxDQUsrQzs7QUFDNURYLElBQUFBLElBQUksQ0FBQ2hFLFVBQUw7QUFDSDtBQXJZdUIsQ0FBNUI7QUF3WUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0F6QixDQUFDLENBQUN3RyxFQUFGLENBQUtuRCxJQUFMLENBQVU2QyxRQUFWLENBQW1CckYsS0FBbkIsQ0FBeUI0RiwwQkFBekIsR0FBc0QsVUFBQ25GLEtBQUQsRUFBUW9GLE1BQVIsRUFBbUI7QUFDckUsTUFBSXBGLEtBQUssQ0FBQzJELE1BQU4sS0FBaUIsQ0FBakIsSUFBc0JqRixDQUFDLENBQUMsU0FBRCxDQUFELENBQWEyRyxHQUFiLE9BQXVCRCxNQUFqRCxFQUF5RDtBQUNyRCxXQUFPLEtBQVA7QUFDSDs7QUFDRCxTQUFPLElBQVA7QUFDSCxDQUxEO0FBT0E7QUFDQTtBQUNBOzs7QUFDQTFHLENBQUMsQ0FBQzRHLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEIvRyxFQUFBQSxtQkFBbUIsQ0FBQzJCLFVBQXBCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLGdsb2JhbFRyYW5zbGF0ZSwgRXh0ZW5zaW9ucywgRm9ybSwgU2VtYW50aWNMb2NhbGl6YXRpb24sIFNvdW5kRmlsZXNTZWxlY3RvciAqL1xuXG5cbi8qKlxuICogT2JqZWN0IGZvciBtYW5hZ2luZyBPdXQtb2YtV29yayBUaW1lIHNldHRpbmdzXG4gKlxuICogQG1vZHVsZSBvdXRPZldvcmtUaW1lUmVjb3JkXG4gKi9cbmNvbnN0IG91dE9mV29ya1RpbWVSZWNvcmQgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI3NhdmUtb3V0b2Zmd29yay1mb3JtJyksXG5cbiAgICAkZGVmYXVsdERyb3Bkb3duOiAkKCcjc2F2ZS1vdXRvZmZ3b3JrLWZvcm0gLmRyb3Bkb3duLWRlZmF1bHQnKSxcbiAgICAkcmFuZ2VEYXlzU3RhcnQ6ICQoJyNyYW5nZS1kYXlzLXN0YXJ0JyksXG4gICAgJHJhbmdlRGF5c0VuZDogJCgnI3JhbmdlLWRheXMtZW5kJyksXG4gICAgJHJhbmdlVGltZVN0YXJ0OiAkKCcjcmFuZ2UtdGltZS1zdGFydCcpLFxuICAgICRyYW5nZVRpbWVFbmQ6ICQoJyNyYW5nZS10aW1lLWVuZCcpLFxuICAgICRkYXRlX2Zyb206ICQoJyNkYXRlX2Zyb20nKSxcbiAgICAkZGF0ZV90bzogJCgnI2RhdGVfdG8nKSxcbiAgICAkdGltZV90bzogJCgnI3RpbWVfdG8nKSxcbiAgICAkZm9yd2FyZGluZ1NlbGVjdERyb3Bkb3duOiAkKCcjc2F2ZS1vdXRvZmZ3b3JrLWZvcm0gLmZvcndhcmRpbmctc2VsZWN0JyksXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgYXVkaW9fbWVzc2FnZV9pZDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2F1ZGlvX21lc3NhZ2VfaWQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjdXN0b21Ob3RFbXB0eUlmQWN0aW9uUnVsZVtwbGF5bWVzc2FnZV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS50Zl9WYWxpZGF0ZUF1ZGlvTWVzc2FnZUVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBleHRlbnNpb246IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdleHRlbnNpb24nLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjdXN0b21Ob3RFbXB0eUlmQWN0aW9uUnVsZVtleHRlbnNpb25dJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVFeHRlbnNpb25FbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgdGltZWZyb206IHtcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3RpbWVfZnJvbScsXG4gICAgICAgICAgICBydWxlczogW3tcbiAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICB2YWx1ZTogL14oMlswLTNdfDE/WzAtOV0pOihbMC01XT9bMC05XSkkLyxcbiAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS50Zl9WYWxpZGF0ZUNoZWNrVGltZUludGVydmFsLFxuICAgICAgICAgICAgfV0sXG4gICAgICAgIH0sXG4gICAgICAgIHRpbWV0bzoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3RpbWVfdG8nLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW3tcbiAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICB2YWx1ZTogL14oMlswLTNdfDE/WzAtOV0pOihbMC01XT9bMC05XSkkLyxcbiAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS50Zl9WYWxpZGF0ZUNoZWNrVGltZUludGVydmFsLFxuICAgICAgICAgICAgfV0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBvdXQgb2Ygd29yayB0aW1lIHJlY29yZCBmb3JtLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgdGFiIGJlaGF2aW9yIGZvciB0aGUgb3V0LXRpbWUtbW9kaWZ5LW1lbnVcbiAgICAgICAgJCgnI291dC10aW1lLW1vZGlmeS1tZW51IC5pdGVtJykudGFiKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZGVmYXVsdCBkcm9wZG93blxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRkZWZhdWx0RHJvcGRvd24uZHJvcGRvd24oKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBjYWxlbmRhciBmb3IgcmFuZ2UgZGF5cyBzdGFydFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNTdGFydC5jYWxlbmRhcih7XG4gICAgICAgICAgICAvLyBDYWxlbmRhciBjb25maWd1cmF0aW9uIG9wdGlvbnNcbiAgICAgICAgICAgIGZpcnN0RGF5T2ZXZWVrOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhckZpcnN0RGF5T2ZXZWVrLFxuICAgICAgICAgICAgdGV4dDogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJUZXh0LFxuICAgICAgICAgICAgZW5kQ2FsZW5kYXI6IG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c0VuZCxcbiAgICAgICAgICAgIHR5cGU6ICdkYXRlJyxcbiAgICAgICAgICAgIGlubGluZTogZmFsc2UsXG4gICAgICAgICAgICBtb250aEZpcnN0OiBmYWxzZSxcbiAgICAgICAgICAgIHJlZ0V4cDogU2VtYW50aWNMb2NhbGl6YXRpb24ucmVnRXhwLFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBjYWxlbmRhciBmb3IgcmFuZ2UgZGF5cyBlbmRcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzRW5kLmNhbGVuZGFyKHtcbiAgICAgICAgICAgIC8vIENhbGVuZGFyIGNvbmZpZ3VyYXRpb24gb3B0aW9uc1xuICAgICAgICAgICAgZmlyc3REYXlPZldlZWs6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyRmlyc3REYXlPZldlZWssXG4gICAgICAgICAgICB0ZXh0OiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhclRleHQsXG4gICAgICAgICAgICBzdGFydENhbGVuZGFyOiBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNTdGFydCxcbiAgICAgICAgICAgIHR5cGU6ICdkYXRlJyxcbiAgICAgICAgICAgIGlubGluZTogZmFsc2UsXG4gICAgICAgICAgICBtb250aEZpcnN0OiBmYWxzZSxcbiAgICAgICAgICAgIHJlZ0V4cDogU2VtYW50aWNMb2NhbGl6YXRpb24ucmVnRXhwLFxuICAgICAgICAgICAgb25DaGFuZ2U6IChuZXdEYXRlVG8pID0+IHtcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgdGhlIGNoYW5nZSBldmVudCBmb3IgcmFuZ2UgdGltZSBlbmRcbiAgICAgICAgICAgICAgICBsZXQgb2xkRGF0ZVRvID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZGF0ZV90by5hdHRyKCd2YWx1ZScpO1xuICAgICAgICAgICAgICAgIGlmIChuZXdEYXRlVG8gIT09IG51bGwgJiYgb2xkRGF0ZVRvICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICBvbGREYXRlVG8gPSBuZXcgRGF0ZShvbGREYXRlVG8gKiAxMDAwKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKChuZXdEYXRlVG8gLSBvbGREYXRlVG8pICE9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRkYXRlX2Zyb20udHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBjYWxlbmRhciBmb3IgcmFuZ2UgdGltZSBzdGFydFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZVRpbWVTdGFydC5jYWxlbmRhcih7XG4gICAgICAgICAgICAvLyBDYWxlbmRhciBjb25maWd1cmF0aW9uIG9wdGlvbnNcbiAgICAgICAgICAgIGZpcnN0RGF5T2ZXZWVrOiBTZW1hbnRpY0xvY2FsaXphdGlvbi5jYWxlbmRhckZpcnN0RGF5T2ZXZWVrLFxuICAgICAgICAgICAgdGV4dDogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJUZXh0LFxuICAgICAgICAgICAgZW5kQ2FsZW5kYXI6IG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlVGltZUVuZCxcbiAgICAgICAgICAgIHR5cGU6ICd0aW1lJyxcbiAgICAgICAgICAgIGlubGluZTogZmFsc2UsXG4gICAgICAgICAgICBkaXNhYmxlTWludXRlOiB0cnVlLFxuICAgICAgICAgICAgZm9ybWF0dGVyOiB7XG4gICAgICAgICAgICAgICAgdGltZTogJ0g6bW0nLFxuICAgICAgICAgICAgICAgIGNlbGxUaW1lOiAnSDptbSdcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGNhbGVuZGFyIGZvciByYW5nZSB0aW1lIGVuZFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZVRpbWVFbmQuY2FsZW5kYXIoe1xuICAgICAgICAgICAgLy8gQ2FsZW5kYXIgY29uZmlndXJhdGlvbiBvcHRpb25zXG4gICAgICAgICAgICBmaXJzdERheU9mV2VlazogU2VtYW50aWNMb2NhbGl6YXRpb24uY2FsZW5kYXJGaXJzdERheU9mV2VlayxcbiAgICAgICAgICAgIHRleHQ6IFNlbWFudGljTG9jYWxpemF0aW9uLmNhbGVuZGFyVGV4dCxcbiAgICAgICAgICAgIHR5cGU6ICd0aW1lJyxcbiAgICAgICAgICAgIGlubGluZTogZmFsc2UsXG4gICAgICAgICAgICBkaXNhYmxlTWludXRlOiB0cnVlLFxuICAgICAgICAgICAgZm9ybWF0dGVyOiB7XG4gICAgICAgICAgICAgICAgdGltZTogJ0g6bW0nLFxuICAgICAgICAgICAgICAgIGNlbGxUaW1lOiAnSDptbSdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkNoYW5nZTogKG5ld1RpbWVUbykgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSB0aGUgY2hhbmdlIGV2ZW50IGZvciByYW5nZSB0aW1lIGVuZFxuICAgICAgICAgICAgICAgIGxldCBvbGRUaW1lVG8gPSBvdXRPZldvcmtUaW1lUmVjb3JkLiR0aW1lX3RvLmF0dHIoJ3ZhbHVlJyk7XG4gICAgICAgICAgICAgICAgaWYgKG5ld1RpbWVUbyAhPT0gbnVsbCAmJiBvbGRUaW1lVG8gIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIG9sZFRpbWVUbyA9IG5ldyBEYXRlKG9sZFRpbWVUbyAqIDEwMDApO1xuICAgICAgICAgICAgICAgICAgICBpZiAoKG5ld1RpbWVUbyAtIG9sZFRpbWVUbykgIT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHRpbWVfdG8udHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBhY3Rpb24gZHJvcGRvd25cbiAgICAgICAgJCgnI2FjdGlvbicpXG4gICAgICAgICAgICAuZHJvcGRvd24oe1xuICAgICAgICAgICAgICAgIG9uQ2hhbmdlKCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBIYW5kbGUgdGhlIGNoYW5nZSBldmVudCBmb3IgdGhlIGFjdGlvbiBkcm9wZG93blxuICAgICAgICAgICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLnRvZ2dsZURpc2FibGVkRmllbGRDbGFzcygpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSB3ZWVrZGF5X2Zyb20gZHJvcGRvd25cbiAgICAgICAgJCgnI3dlZWtkYXlfZnJvbScpXG4gICAgICAgICAgICAuZHJvcGRvd24oe1xuICAgICAgICAgICAgICAgIG9uQ2hhbmdlKCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBIYW5kbGUgdGhlIGNoYW5nZSBldmVudCBmb3IgdGhlIHdlZWtkYXlfZnJvbSBkcm9wZG93blxuICAgICAgICAgICAgICAgICAgICBjb25zdCBmcm9tID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnd2Vla2RheV9mcm9tJyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRvID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnd2Vla2RheV90bycpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZnJvbSA8IHRvIHx8IHRvID09PSAtMSB8fCBmcm9tID09PSAtMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnd2Vla2RheV90bycsIGZyb20pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIHdlZWtkYXlfdG8gZHJvcGRvd25cbiAgICAgICAgJCgnI3dlZWtkYXlfdG8nKVxuICAgICAgICAgICAgLmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICBvbkNoYW5nZSgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSGFuZGxlIHRoZSBjaGFuZ2UgZXZlbnQgZm9yIHRoZSB3ZWVrZGF5X3RvIGRyb3Bkb3duXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZyb20gPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICd3ZWVrZGF5X2Zyb20nKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdG8gPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICd3ZWVrZGF5X3RvJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0byA8IGZyb20gfHwgZnJvbSA9PT0gLTEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ3dlZWtkYXlfZnJvbScsIHRvKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAvLyBCaW5kIGNsaWNrIGV2ZW50IHRvIGVyYXNlLWRhdGVzIGJ1dHRvblxuICAgICAgICAkKCcjZXJhc2UtZGF0ZXMnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgLy8gSGFuZGxlIHRoZSBjbGljayBldmVudCBmb3IgZXJhc2UtZGF0ZXMgYnV0dG9uXG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNTdGFydC5jYWxlbmRhcignY2xlYXInKTtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c0VuZC5jYWxlbmRhcignY2xlYXInKTtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmpcbiAgICAgICAgICAgICAgICAuZm9ybSgnc2V0IHZhbHVlcycsIHtcbiAgICAgICAgICAgICAgICAgICAgZGF0ZV9mcm9tOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgZGF0ZV90bzogJycsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEJpbmQgY2xpY2sgZXZlbnQgdG8gZXJhc2Utd2Vla2RheXMgYnV0dG9uXG4gICAgICAgICQoJyNlcmFzZS13ZWVrZGF5cycpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICAvLyBIYW5kbGUgdGhlIGNsaWNrIGV2ZW50IGZvciBlcmFzZS13ZWVrZGF5cyBidXR0b25cbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmpcbiAgICAgICAgICAgICAgICAuZm9ybSgnc2V0IHZhbHVlcycsIHtcbiAgICAgICAgICAgICAgICAgICAgd2Vla2RheV9mcm9tOiAtMSxcbiAgICAgICAgICAgICAgICAgICAgd2Vla2RheV90bzogLTEsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNTdGFydC50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQmluZCBjbGljayBldmVudCB0byBlcmFzZS10aW1lcGVyaW9kIGJ1dHRvblxuICAgICAgICAkKCcjZXJhc2UtdGltZXBlcmlvZCcpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICAvLyBIYW5kbGUgdGhlIGNsaWNrIGV2ZW50IGZvciBlcmFzZS10aW1lcGVyaW9kIGJ1dHRvblxuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VUaW1lU3RhcnQuY2FsZW5kYXIoJ2NsZWFyJyk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZVRpbWVFbmQuY2FsZW5kYXIoJ2NsZWFyJyk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiR0aW1lX3RvLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGF1ZGlvLW1lc3NhZ2Utc2VsZWN0IGRyb3Bkb3duXG4gICAgICAgICQoJyNzYXZlLW91dG9mZndvcmstZm9ybSAuYXVkaW8tbWVzc2FnZS1zZWxlY3QnKS5kcm9wZG93bihTb3VuZEZpbGVzU2VsZWN0b3IuZ2V0RHJvcGRvd25TZXR0aW5nc1dpdGhFbXB0eSgpKTtcblxuICAgICAgICAvLyBDaGFuZ2UgdGhlIGRhdGUgZm9ybWF0IGZyb20gbGludXh0aW1lIHRvIGxvY2FsIHJlcHJlc2VudGF0aW9uXG4gICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuY2hhbmdlRGF0ZUZvcm1hdCgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGZvcm1cbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC5pbml0aWFsaXplRm9ybSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGZvcndhcmRpbmdTZWxlY3REcm9wZG93blxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3J3YXJkaW5nU2VsZWN0RHJvcGRvd24uZHJvcGRvd24oRXh0ZW5zaW9ucy5nZXREcm9wZG93blNldHRpbmdzV2l0aG91dEVtcHR5KCkpO1xuXG4gICAgICAgIC8vIFRvZ2dsZSBkaXNhYmxlZCBmaWVsZCBjbGFzcyBiYXNlZCBvbiBhY3Rpb24gdmFsdWVcbiAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC50b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKTtcblxuICAgICAgICAvLyBCaW5kIGNoZWNrYm94IGNoYW5nZSBldmVudCBmb3IgaW5ib3VuZCBydWxlcyB0YWJsZVxuICAgICAgICAkKCcjaW5ib3VuZC1ydWxlcy10YWJsZSAudWkuY2hlY2tib3gnKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZTogZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSB0aGUgY2hhbmdlIGV2ZW50IGZvciBpbmJvdW5kIHJ1bGVzIHRhYmxlIGNoZWNrYm94XG4gICAgICAgICAgICAgICAgaWYgKCQodGhpcykucGFyZW50KCkuY2hlY2tib3goJ2lzIGNoZWNrZWQnKSkge1xuICAgICAgICAgICAgICAgICAgICAkKCcjaW5ib3VuZC1ydWxlcy10YWJsZSAudWkuY2hlY2tib3hbZGF0YS1kaWQ9JyArICQodGhpcykucGFyZW50KCkuYXR0cignZGF0YS1kaWQnKSArICddJykuY2hlY2tib3goJ3NldCBjaGVja2VkJylcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAkKCcjaW5ib3VuZC1ydWxlcy10YWJsZSAudWkuY2hlY2tib3hbZGF0YS1kaWQ9JyArICQodGhpcykucGFyZW50KCkuYXR0cignZGF0YS1kaWQnKSArICddJykuY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQmluZCBjaGVja2JveCBjaGFuZ2UgZXZlbnQgZm9yIGFsbG93UmVzdHJpY3Rpb24gY2hlY2tib3hcbiAgICAgICAgJCgnI2FsbG93UmVzdHJpY3Rpb24nKS5wYXJlbnQoKS5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZTogb3V0T2ZXb3JrVGltZVJlY29yZC5jaGFuZ2VSZXN0cmljdGlvblxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDYWxsIGNoYW5nZVJlc3RyaWN0aW9uIG1ldGhvZFxuICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLmNoYW5nZVJlc3RyaWN0aW9uKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoYW5nZXMgdGhlIHZpc2liaWxpdHkgb2YgdGhlICdydWxlcycgdGFiIGJhc2VkIG9uIHRoZSBjaGVja2VkIHN0YXR1cyBvZiB0aGUgJ2FsbG93UmVzdHJpY3Rpb24nIGNoZWNrYm94LlxuICAgICAqL1xuICAgIGNoYW5nZVJlc3RyaWN0aW9uKCkge1xuICAgICAgICBpZiAoJCgnI2FsbG93UmVzdHJpY3Rpb24nKS5wYXJlbnQoKS5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICAkKFwiYVtkYXRhLXRhYj0ncnVsZXMnXVwiKS5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKFwiYVtkYXRhLXRhYj0ncnVsZXMnXVwiKS5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ29udmVydHMgdGhlIGRhdGUgZm9ybWF0IGZyb20gbGludXh0aW1lIHRvIHRoZSBsb2NhbCByZXByZXNlbnRhdGlvbi5cbiAgICAgKi9cbiAgICBjaGFuZ2VEYXRlRm9ybWF0KCkge1xuICAgICAgICBjb25zdCBkYXRlRnJvbSA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGRhdGVfZnJvbS5hdHRyKCd2YWx1ZScpO1xuICAgICAgICBjb25zdCBkYXRlVG8gPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRkYXRlX3RvLmF0dHIoJ3ZhbHVlJyk7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRPZmZzZXQgPSBuZXcgRGF0ZSgpLmdldFRpbWV6b25lT2Zmc2V0KCk7XG4gICAgICAgIGNvbnN0IHNlcnZlck9mZnNldCA9IHBhcnNlSW50KG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3NlcnZlck9mZnNldCcpKTtcbiAgICAgICAgY29uc3Qgb2Zmc2V0RGlmZiA9IHNlcnZlck9mZnNldCArIGN1cnJlbnRPZmZzZXQ7XG4gICAgICAgIGlmIChkYXRlRnJvbSAhPT0gdW5kZWZpbmVkICYmIGRhdGVGcm9tLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IGRhdGVGcm9tSW5Ccm93c2VyVFogPSBkYXRlRnJvbSAqIDEwMDAgKyBvZmZzZXREaWZmICogNjAgKiAxMDAwO1xuICAgICAgICAgICAgb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQuY2FsZW5kYXIoJ3NldCBkYXRlJywgbmV3IERhdGUoZGF0ZUZyb21JbkJyb3dzZXJUWikpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRlVG8gIT09IHVuZGVmaW5lZCAmJiBkYXRlVG8ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc3QgZGF0ZVRvSW5Ccm93c2VyVFogPSBkYXRlVG8gKiAxMDAwICsgb2Zmc2V0RGlmZiAqIDYwICogMTAwMDtcbiAgICAgICAgICAgIG91dE9mV29ya1RpbWVSZWNvcmQuJHJhbmdlRGF5c0VuZC5jYWxlbmRhcignc2V0IGRhdGUnLCBuZXcgRGF0ZShkYXRlVG9JbkJyb3dzZXJUWikpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZXMgdGhlIHZpc2liaWxpdHkgb2YgY2VydGFpbiBmaWVsZCBncm91cHMgYmFzZWQgb24gdGhlIHNlbGVjdGVkIGFjdGlvbiB2YWx1ZS5cbiAgICAgKi9cbiAgICB0b2dnbGVEaXNhYmxlZEZpZWxkQ2xhc3MoKSB7XG4gICAgICAgIGlmIChvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdhY3Rpb24nKSA9PT0gJ2V4dGVuc2lvbicpIHtcbiAgICAgICAgICAgICQoJyNleHRlbnNpb24tZ3JvdXAnKS5zaG93KCk7XG4gICAgICAgICAgICAkKCcjYXVkaW8tZmlsZS1ncm91cCcpLmhpZGUoKTtcbiAgICAgICAgICAgICQoJyNhdWRpb19tZXNzYWdlX2lkJykuZHJvcGRvd24oJ2NsZWFyJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcjZXh0ZW5zaW9uLWdyb3VwJykuaGlkZSgpO1xuICAgICAgICAgICAgJCgnI2F1ZGlvLWZpbGUtZ3JvdXAnKS5zaG93KCk7XG4gICAgICAgICAgICBvdXRPZldvcmtUaW1lUmVjb3JkLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdleHRlbnNpb24nLCAtMSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3VzdG9tIGZvcm0gdmFsaWRhdGlvbiBmb3IgdmFsaWRhdGluZyBzcGVjaWZpYyBmaWVsZHMgaW4gYSBmb3JtLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3VsdCAtIFRoZSByZXN1bHQgb2JqZWN0IGNvbnRhaW5pbmcgZm9ybSBkYXRhLlxuICAgICAqIEByZXR1cm5zIHtib29sZWFufE9iamVjdH0gUmV0dXJucyBmYWxzZSBpZiB2YWxpZGF0aW9uIGZhaWxzLCBvciB0aGUgcmVzdWx0IG9iamVjdCBpZiB2YWxpZGF0aW9uIHBhc3Nlcy5cbiAgICAgKi9cbiAgICBjdXN0b21WYWxpZGF0ZUZvcm0ocmVzdWx0KSB7XG4gICAgICAgIC8vIENoZWNrIGRhdGUgZmllbGRzXG4gICAgICAgIGlmICgocmVzdWx0LmRhdGEuZGF0ZV9mcm9tICE9PSAnJyAmJiByZXN1bHQuZGF0YS5kYXRlX3RvID09PSAnJylcbiAgICAgICAgICAgIHx8IChyZXN1bHQuZGF0YS5kYXRlX3RvICE9PSAnJyAmJiByZXN1bHQuZGF0YS5kYXRlX2Zyb20gPT09ICcnKSkge1xuICAgICAgICAgICAgJCgnLmZvcm0gLmVycm9yLm1lc3NhZ2UnKS5odG1sKGdsb2JhbFRyYW5zbGF0ZS50Zl9WYWxpZGF0ZUNoZWNrRGF0ZUludGVydmFsKS5zaG93KCk7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24udHJhbnNpdGlvbignc2hha2UnKS5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgd2Vla2RheSBmaWVsZHNcbiAgICAgICAgaWYgKChyZXN1bHQuZGF0YS53ZWVrZGF5X2Zyb20gPiAwICYmIHJlc3VsdC5kYXRhLndlZWtkYXlfdG8gPT09ICctMScpXG4gICAgICAgICAgICB8fCAocmVzdWx0LmRhdGEud2Vla2RheV90byA+IDAgJiYgcmVzdWx0LmRhdGEud2Vla2RheV9mcm9tID09PSAnLTEnKSkge1xuICAgICAgICAgICAgJCgnLmZvcm0gLmVycm9yLm1lc3NhZ2UnKS5odG1sKGdsb2JhbFRyYW5zbGF0ZS50Zl9WYWxpZGF0ZUNoZWNrV2Vla0RheUludGVydmFsKS5zaG93KCk7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24udHJhbnNpdGlvbignc2hha2UnKS5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgdGltZSBmaWVsZHNcbiAgICAgICAgaWYgKChyZXN1bHQuZGF0YS50aW1lX2Zyb20ubGVuZ3RoID4gMCAmJiByZXN1bHQuZGF0YS50aW1lX3RvLmxlbmd0aCA9PT0gMClcbiAgICAgICAgICAgIHx8IChyZXN1bHQuZGF0YS50aW1lX3RvLmxlbmd0aCA+IDAgJiYgcmVzdWx0LmRhdGEudGltZV9mcm9tLmxlbmd0aCA9PT0gMCkpIHtcbiAgICAgICAgICAgICQoJy5mb3JtIC5lcnJvci5tZXNzYWdlJykuaHRtbChnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja1RpbWVJbnRlcnZhbCkuc2hvdygpO1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgdGltZSBmaWVsZCBmb3JtYXRcbiAgICAgICAgaWYgKChyZXN1bHQuZGF0YS50aW1lX2Zyb20ubGVuZ3RoID4gMCAmJiByZXN1bHQuZGF0YS50aW1lX3RvLmxlbmd0aCA9PT0gMClcbiAgICAgICAgICAgIHx8IChyZXN1bHQuZGF0YS50aW1lX3RvLmxlbmd0aCA+IDAgJiYgcmVzdWx0LmRhdGEudGltZV9mcm9tLmxlbmd0aCA9PT0gMCkpIHtcbiAgICAgICAgICAgICQoJy5mb3JtIC5lcnJvci5tZXNzYWdlJykuaHRtbChnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVDaGVja1RpbWVJbnRlcnZhbCkuc2hvdygpO1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnRyYW5zaXRpb24oJ3NoYWtlJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgYWxsIGZpZWxkc1xuICAgICAgICBpZiAocmVzdWx0LmRhdGEudGltZV9mcm9tID09PSAnJ1xuICAgICAgICAgICAgJiYgcmVzdWx0LmRhdGEudGltZV90byA9PT0gJydcbiAgICAgICAgICAgICYmIHJlc3VsdC5kYXRhLndlZWtkYXlfZnJvbSA9PT0gJy0xJ1xuICAgICAgICAgICAgJiYgcmVzdWx0LmRhdGEud2Vla2RheV90byA9PT0gJy0xJ1xuICAgICAgICAgICAgJiYgcmVzdWx0LmRhdGEuZGF0ZV9mcm9tID09PSAnJ1xuICAgICAgICAgICAgJiYgcmVzdWx0LmRhdGEuZGF0ZV90byA9PT0gJycpIHtcbiAgICAgICAgICAgICQoJy5mb3JtIC5lcnJvci5tZXNzYWdlJykuaHRtbChnbG9iYWxUcmFuc2xhdGUudGZfVmFsaWRhdGVOb1J1bGVzU2VsZWN0ZWQpLnNob3coKTtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi50cmFuc2l0aW9uKCdzaGFrZScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgJCgnLmZvcm0gLmVycm9yLm1lc3NhZ2UnKS5odG1sKCcnKS5oaWRlKCk7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIGNvbnN0IGRhdGVGcm9tID0gb3V0T2ZXb3JrVGltZVJlY29yZC4kcmFuZ2VEYXlzU3RhcnQuY2FsZW5kYXIoJ2dldCBkYXRlJyk7XG4gICAgICAgIGlmIChkYXRlRnJvbSAhPT0gbnVsbCkge1xuICAgICAgICAgICAgZGF0ZUZyb20uc2V0SG91cnMoMCwgMCwgMCwgMCk7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5kYXRlX2Zyb20gPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNTdGFydC5jYWxlbmRhcignZ2V0IGRhdGUnKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBkYXRlVG8gPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNFbmQuY2FsZW5kYXIoJ2dldCBkYXRlJyk7XG4gICAgICAgIGlmIChkYXRlVG8gIT09IG51bGwpIHtcbiAgICAgICAgICAgIGRhdGVUby5zZXRIb3VycygyMywgNTksIDU5LCAwKTtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmRhdGVfdG8gPSBvdXRPZldvcmtUaW1lUmVjb3JkLiRyYW5nZURheXNFbmQuY2FsZW5kYXIoJ2dldCBkYXRlJyk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG91dE9mV29ya1RpbWVSZWNvcmQuY3VzdG9tVmFsaWRhdGVGb3JtKHJlc3VsdCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBjdXN0b20gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IG91dE9mV29ya1RpbWVSZWNvcmQuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1vdXQtb2ZmLXdvcmstdGltZS9zYXZlYDsgLy8gRm9ybSBzdWJtaXNzaW9uIFVSTFxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBvdXRPZldvcmtUaW1lUmVjb3JkLnZhbGlkYXRlUnVsZXM7IC8vIEZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBvdXRPZldvcmtUaW1lUmVjb3JkLmNiQmVmb3JlU2VuZEZvcm07IC8vIENhbGxiYWNrIGJlZm9yZSBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBvdXRPZldvcmtUaW1lUmVjb3JkLmNiQWZ0ZXJTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG59O1xuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHZhbGlkYXRpb24gcnVsZSB0aGF0IGNoZWNrcyBpZiBhIHZhbHVlIGlzIG5vdCBlbXB0eSBiYXNlZCBvbiBhIHNwZWNpZmljIGFjdGlvbi5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgdmFsdWUgdG8gYmUgdmFsaWRhdGVkLlxuICogQHBhcmFtIHtzdHJpbmd9IGFjdGlvbiAtIFRoZSBhY3Rpb24gdG8gY29tcGFyZSBhZ2FpbnN0LlxuICogQHJldHVybnMge2Jvb2xlYW59IFJldHVybnMgdHJ1ZSBpZiB0aGUgdmFsdWUgaXMgbm90IGVtcHR5IG9yIHRoZSBhY3Rpb24gZG9lcyBub3QgbWF0Y2gsIGZhbHNlIG90aGVyd2lzZS5cbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmN1c3RvbU5vdEVtcHR5SWZBY3Rpb25SdWxlID0gKHZhbHVlLCBhY3Rpb24pID0+IHtcbiAgICBpZiAodmFsdWUubGVuZ3RoID09PSAwICYmICQoJyNhY3Rpb24nKS52YWwoKSA9PT0gYWN0aW9uKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG59O1xuXG4vKipcbiAqICBJbml0aWFsaXplIG91dCBvZiB3b3JrIGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIG91dE9mV29ya1RpbWVSZWNvcmQuaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=