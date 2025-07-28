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

/* global globalRootUrl, IvrMenuAPI, Form, globalTranslate, UserMessage, Extensions, SoundFilesSelector */

/**
 * IVR menu edit form management module
 */
var ivrMenuModify = {
  $formObj: $('#ivr-menu-form'),
  $number: $('#extension'),
  $actionsPlace: $('#actions-place'),
  $rowTemplate: $('#row-template'),
  actionsRowsCount: 0,
  defaultExtension: '',

  /**
   * Validation rules for the form fields before submission.
   *
   * @type {object}
   */
  validateRules: {
    name: {
      identifier: 'name',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.iv_ValidateNameIsEmpty
      }]
    },
    extension: {
      identifier: 'extension',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.iv_ValidateExtensionIsEmpty
      }, {
        type: 'regExp[/^[0-9]{2,8}$/]',
        prompt: globalTranslate.iv_ValidateExtensionFormat
      }, {
        type: 'existRule[extension-error]',
        prompt: globalTranslate.iv_ValidateExtensionDouble
      }]
    },
    timeout: {
      identifier: 'timeout',
      rules: [{
        type: 'integer[1..99]',
        prompt: globalTranslate.iv_ValidateTimeout
      }]
    },
    number_of_repeat: {
      identifier: 'number_of_repeat',
      rules: [{
        type: 'integer[1..99]',
        prompt: globalTranslate.iv_ValidateRepeatCount
      }]
    }
  },
  initialize: function initialize() {
    // Add handler to dynamically check if the input number is available
    var timeoutId;
    ivrMenuModify.$number.on('input', function () {
      // Clear the previous timer, if it exists
      if (timeoutId) {
        clearTimeout(timeoutId);
      } // Set a new timer with a delay of 0.5 seconds


      timeoutId = setTimeout(function () {
        // Get the newly entered number
        var newNumber = ivrMenuModify.$formObj.form('get value', 'extension'); // Execute the availability check for the number

        Extensions.checkAvailability(ivrMenuModify.defaultExtension, newNumber);
      }, 500);
    }); // Initialize sound file selector

    SoundFilesSelector.initialize('.audio-message-select', 'input[name="audio_message_id"]'); // Initialize actions table

    ivrMenuModify.initializeActionsTable(); // Configure Form.js

    Form.$formObj = ivrMenuModify.$formObj;
    Form.url = '#'; // Not used with REST API

    Form.validateRules = ivrMenuModify.validateRules;
    Form.cbBeforeSendForm = ivrMenuModify.cbBeforeSendForm;
    Form.cbAfterSendForm = ivrMenuModify.cbAfterSendForm; // Setup REST API

    Form.apiSettings.enabled = true;
    Form.apiSettings.apiObject = IvrMenuAPI;
    Form.apiSettings.saveMethod = 'saveRecord'; // Important settings for correct save modes operation

    Form.afterSubmitIndexUrl = "".concat(globalRootUrl, "ivr-menu/index/");
    Form.afterSubmitModifyUrl = "".concat(globalRootUrl, "ivr-menu/modify/"); // Initialize Form with all standard features:
    // - Dirty checking (change tracking)
    // - Dropdown submit (SaveSettings, SaveSettingsAndAddNew, SaveSettingsAndExit)
    // - Form validation
    // - AJAX response handling

    Form.initialize(); // Load form data

    ivrMenuModify.initializeForm();
  },

  /**
   * Load data into form
   */
  initializeForm: function initializeForm() {
    var recordId = ivrMenuModify.getRecordId();
    IvrMenuAPI.getRecord(recordId, function (response) {
      if (response.result) {
        ivrMenuModify.populateForm(response.data); // Get the default extension from the form

        ivrMenuModify.defaultExtension = ivrMenuModify.$formObj.form('get value', 'extension'); // Populate actions table

        ivrMenuModify.populateActionsTable(response.data.actions || []);
      } else {
        var _response$messages;

        UserMessage.showError(((_response$messages = response.messages) === null || _response$messages === void 0 ? void 0 : _response$messages.error) || 'Failed to load IVR menu data');
      }
    });
  },

  /**
   * Get record ID from URL
   */
  getRecordId: function getRecordId() {
    var urlParts = window.location.pathname.split('/');
    var modifyIndex = urlParts.indexOf('modify');

    if (modifyIndex !== -1 && urlParts[modifyIndex + 1]) {
      return urlParts[modifyIndex + 1];
    }

    return '';
  },

  /**
   * Initialize actions table
   */
  initializeActionsTable: function initializeActionsTable() {
    // Add new action button
    $('#add-new-ivr-action').on('click', function (e) {
      e.preventDefault();
      ivrMenuModify.addNewActionRow();
      ivrMenuModify.rebuildActionExtensionsDropdown();
    });
  },

  /**
   * Populate actions table
   */
  populateActionsTable: function populateActionsTable(actions) {
    // Clear existing actions except template
    $('.action-row:not(#row-template)').remove();
    ivrMenuModify.actionsRowsCount = 0;
    actions.forEach(function (action) {
      ivrMenuModify.addNewActionRow({
        digits: action.digits,
        extension: action.extension,
        extensionRepresent: action.extensionRepresent || ''
      });
    });
    ivrMenuModify.rebuildActionExtensionsDropdown();
  },

  /**
   * Add new action row using the existing template
   */
  addNewActionRow: function addNewActionRow() {
    var param = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var defaultParam = {
      digits: '',
      extension: '',
      extensionRepresent: ''
    };
    var rowParam = $.extend({}, defaultParam, param);
    ivrMenuModify.actionsRowsCount += 1; // Clone template

    var $actionTemplate = ivrMenuModify.$rowTemplate.clone();
    $actionTemplate.removeClass('hidden').attr('id', "row-".concat(ivrMenuModify.actionsRowsCount)).attr('data-value', ivrMenuModify.actionsRowsCount).attr('style', ''); // Set digits input

    $actionTemplate.find('input[name="digits-id"]').attr('id', "digits-".concat(ivrMenuModify.actionsRowsCount)).attr('name', "digits-".concat(ivrMenuModify.actionsRowsCount)).attr('value', rowParam.digits); // Set extension input

    $actionTemplate.find('input[name="extension-id"]').attr('id', "extension-".concat(ivrMenuModify.actionsRowsCount)).attr('name', "extension-".concat(ivrMenuModify.actionsRowsCount)).attr('value', rowParam.extension); // Set delete button data-value

    $actionTemplate.find('div.delete-action-row').attr('data-value', ivrMenuModify.actionsRowsCount); // Update extension represent text if available

    if (rowParam.extensionRepresent.length > 0) {
      $actionTemplate.find('div.default.text').removeClass('default').html(rowParam.extensionRepresent);
    } // Add validation rules for the new fields


    ivrMenuModify.validateRules["digits-".concat(ivrMenuModify.actionsRowsCount)] = {
      identifier: "digits-".concat(ivrMenuModify.actionsRowsCount),
      depends: "extension-".concat(ivrMenuModify.actionsRowsCount),
      rules: [{
        type: 'empty',
        prompt: globalTranslate.iv_ValidateDigitsIsEmpty
      }]
    };
    ivrMenuModify.validateRules["extension-".concat(ivrMenuModify.actionsRowsCount)] = {
      identifier: "extension-".concat(ivrMenuModify.actionsRowsCount),
      depends: "digits-".concat(ivrMenuModify.actionsRowsCount),
      rules: [{
        type: 'empty',
        prompt: globalTranslate.iv_ValidateExtensionIsEmpty
      }]
    }; // Append to actions place

    ivrMenuModify.$actionsPlace.append($actionTemplate); // Acknowledge form modification

    Form.dataChanged();
  },

  /**
   * Rebuild dropdown for action extensions
   */
  rebuildActionExtensionsDropdown: function rebuildActionExtensionsDropdown() {
    // Initialize dropdowns with routing settings
    $('#ivr-menu-form .forwarding-select').dropdown(Extensions.getDropdownSettingsForRouting(ivrMenuModify.cbOnExtensionSelect)); // Attach delete handlers

    $('.delete-action-row').off('click').on('click', function (e) {
      e.preventDefault();
      var id = $(this).attr('data-value'); // Remove validation rules

      delete ivrMenuModify.validateRules["digits-".concat(id)];
      delete ivrMenuModify.validateRules["extension-".concat(id)]; // Remove the row

      $("#row-".concat(id)).remove(); // Acknowledge form modification

      Form.dataChanged();
    });
  },

  /**
   * Callback when extension is selected in dropdown
   */
  cbOnExtensionSelect: function cbOnExtensionSelect(text, value, $element) {
    // Mark that data has changed
    Form.dataChanged();
  },

  /**
   * Callback function to be called before the form is sent
   * @param {Object} settings - The current settings of the form
   * @returns {Object} - The updated settings of the form
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    // Collect actions data
    var actions = []; // Iterate over each action row (excluding template)

    $('.action-row:not(#row-template)').each(function () {
      var rowId = $(this).attr('data-value'); // Skip template row

      if (rowId && parseInt(rowId) > 0) {
        var digits = ivrMenuModify.$formObj.form('get value', "digits-".concat(rowId));
        var extension = ivrMenuModify.$formObj.form('get value', "extension-".concat(rowId)); // Only add if both values exist

        if (digits && extension) {
          actions.push({
            digits: digits,
            extension: extension
          });
        }
      }
    }); // Add actions to form data

    var formData = ivrMenuModify.$formObj.form('get values');
    formData.actions = actions; // Pass as array, not JSON string

    settings.data = formData;
    return settings;
  },

  /**
   * Callback after form submission
   * Handles different save modes (SaveSettings, SaveSettingsAndAddNew, SaveSettingsAndExit)
   */
  cbAfterSendForm: function cbAfterSendForm(response) {
    if (response.result) {
      if (response.data) {
        ivrMenuModify.populateForm(response.data);
      } // Update URL for new records


      var currentId = $('#id').val();

      if (!currentId && response.data && response.data.uniqid) {
        var newUrl = window.location.href.replace(/modify\/?$/, "modify/".concat(response.data.uniqid));
        window.history.pushState(null, '', newUrl);
      }
    }
  },

  /**
   * Populate form with data
   */
  populateForm: function populateForm(data) {
    Form.$formObj.form('set values', data); // Initialize timeout_extension dropdown with routing settings

    ivrMenuModify.initializeTimeoutExtensionDropdown();

    if (Form.enableDirrity) {
      Form.saveInitialValues();
    }
  },

  /**
   * Initialize timeout extension dropdown with proper value from API
   */
  initializeTimeoutExtensionDropdown: function initializeTimeoutExtensionDropdown() {
    var $timeoutExtension = $('#timeout_extension');

    if ($timeoutExtension.length > 0) {
      // Get current value directly from the response data (not from HTML field)
      var formValues = ivrMenuModify.$formObj.form('get values');
      var currentValue = formValues.timeout_extension; // Get the routing dropdown settings

      var dropdownSettings = Extensions.getDropdownSettingsForRouting(function (value) {
        Form.dataChanged();
      }); // Always set callback to set value after data is loaded

      var originalOnResponse = dropdownSettings.apiSettings.onResponse;

      dropdownSettings.apiSettings.onResponse = function (response) {
        var result = originalOnResponse.call(this, response); // Set the value after options are loaded if we have a value

        if (currentValue) {
          setTimeout(function () {
            $timeoutExtension.dropdown('set value', currentValue);
          }, 50);
        }

        return result;
      }; // Clear existing options and initialize dropdown with AJAX settings


      $timeoutExtension.empty().append('<option value="">Выберите номер</option>');
      $timeoutExtension.dropdown(dropdownSettings); // If we have a value, trigger API load to populate dropdown

      if (currentValue) {
        $timeoutExtension.dropdown('show');
        setTimeout(function () {
          $timeoutExtension.dropdown('hide');
        }, 100);
      }
    }
  }
};
/**
 * Checks if the number is taken by another account
 * @returns {boolean} True if the parameter has the 'hidden' class, false otherwise
 */

$.fn.form.settings.rules.existRule = function (value, parameter) {
  return $("#".concat(parameter)).hasClass('hidden');
};
/**
 *  Initialize IVR menu modify form on document ready
 */


$(document).ready(function () {
  ivrMenuModify.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9JdnJNZW51L2l2cm1lbnUtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIml2ck1lbnVNb2RpZnkiLCIkZm9ybU9iaiIsIiQiLCIkbnVtYmVyIiwiJGFjdGlvbnNQbGFjZSIsIiRyb3dUZW1wbGF0ZSIsImFjdGlvbnNSb3dzQ291bnQiLCJkZWZhdWx0RXh0ZW5zaW9uIiwidmFsaWRhdGVSdWxlcyIsIm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiaXZfVmFsaWRhdGVOYW1lSXNFbXB0eSIsImV4dGVuc2lvbiIsIml2X1ZhbGlkYXRlRXh0ZW5zaW9uSXNFbXB0eSIsIml2X1ZhbGlkYXRlRXh0ZW5zaW9uRm9ybWF0IiwiaXZfVmFsaWRhdGVFeHRlbnNpb25Eb3VibGUiLCJ0aW1lb3V0IiwiaXZfVmFsaWRhdGVUaW1lb3V0IiwibnVtYmVyX29mX3JlcGVhdCIsIml2X1ZhbGlkYXRlUmVwZWF0Q291bnQiLCJpbml0aWFsaXplIiwidGltZW91dElkIiwib24iLCJjbGVhclRpbWVvdXQiLCJzZXRUaW1lb3V0IiwibmV3TnVtYmVyIiwiZm9ybSIsIkV4dGVuc2lvbnMiLCJjaGVja0F2YWlsYWJpbGl0eSIsIlNvdW5kRmlsZXNTZWxlY3RvciIsImluaXRpYWxpemVBY3Rpb25zVGFibGUiLCJGb3JtIiwidXJsIiwiY2JCZWZvcmVTZW5kRm9ybSIsImNiQWZ0ZXJTZW5kRm9ybSIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsIkl2ck1lbnVBUEkiLCJzYXZlTWV0aG9kIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImdsb2JhbFJvb3RVcmwiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsImluaXRpYWxpemVGb3JtIiwicmVjb3JkSWQiLCJnZXRSZWNvcmRJZCIsImdldFJlY29yZCIsInJlc3BvbnNlIiwicmVzdWx0IiwicG9wdWxhdGVGb3JtIiwiZGF0YSIsInBvcHVsYXRlQWN0aW9uc1RhYmxlIiwiYWN0aW9ucyIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwibWVzc2FnZXMiLCJlcnJvciIsInVybFBhcnRzIiwid2luZG93IiwibG9jYXRpb24iLCJwYXRobmFtZSIsInNwbGl0IiwibW9kaWZ5SW5kZXgiLCJpbmRleE9mIiwiZSIsInByZXZlbnREZWZhdWx0IiwiYWRkTmV3QWN0aW9uUm93IiwicmVidWlsZEFjdGlvbkV4dGVuc2lvbnNEcm9wZG93biIsInJlbW92ZSIsImZvckVhY2giLCJhY3Rpb24iLCJkaWdpdHMiLCJleHRlbnNpb25SZXByZXNlbnQiLCJwYXJhbSIsImRlZmF1bHRQYXJhbSIsInJvd1BhcmFtIiwiZXh0ZW5kIiwiJGFjdGlvblRlbXBsYXRlIiwiY2xvbmUiLCJyZW1vdmVDbGFzcyIsImF0dHIiLCJmaW5kIiwibGVuZ3RoIiwiaHRtbCIsImRlcGVuZHMiLCJpdl9WYWxpZGF0ZURpZ2l0c0lzRW1wdHkiLCJhcHBlbmQiLCJkYXRhQ2hhbmdlZCIsImRyb3Bkb3duIiwiZ2V0RHJvcGRvd25TZXR0aW5nc0ZvclJvdXRpbmciLCJjYk9uRXh0ZW5zaW9uU2VsZWN0Iiwib2ZmIiwiaWQiLCJ0ZXh0IiwidmFsdWUiLCIkZWxlbWVudCIsInNldHRpbmdzIiwiZWFjaCIsInJvd0lkIiwicGFyc2VJbnQiLCJwdXNoIiwiZm9ybURhdGEiLCJjdXJyZW50SWQiLCJ2YWwiLCJ1bmlxaWQiLCJuZXdVcmwiLCJocmVmIiwicmVwbGFjZSIsImhpc3RvcnkiLCJwdXNoU3RhdGUiLCJpbml0aWFsaXplVGltZW91dEV4dGVuc2lvbkRyb3Bkb3duIiwiZW5hYmxlRGlycml0eSIsInNhdmVJbml0aWFsVmFsdWVzIiwiJHRpbWVvdXRFeHRlbnNpb24iLCJmb3JtVmFsdWVzIiwiY3VycmVudFZhbHVlIiwidGltZW91dF9leHRlbnNpb24iLCJkcm9wZG93blNldHRpbmdzIiwib3JpZ2luYWxPblJlc3BvbnNlIiwib25SZXNwb25zZSIsImNhbGwiLCJlbXB0eSIsImZuIiwiZXhpc3RSdWxlIiwi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ZDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgSXZyTWVudUFQSSwgRm9ybSwgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSwgRXh0ZW5zaW9ucywgU291bmRGaWxlc1NlbGVjdG9yICovXG5cbi8qKlxuICogSVZSIG1lbnUgZWRpdCBmb3JtIG1hbmFnZW1lbnQgbW9kdWxlXG4gKi9cbmNvbnN0IGl2ck1lbnVNb2RpZnkgPSB7XG4gICAgJGZvcm1PYmo6ICQoJyNpdnItbWVudS1mb3JtJyksXG4gICAgJG51bWJlcjogJCgnI2V4dGVuc2lvbicpLFxuICAgICRhY3Rpb25zUGxhY2U6ICQoJyNhY3Rpb25zLXBsYWNlJyksXG4gICAgJHJvd1RlbXBsYXRlOiAkKCcjcm93LXRlbXBsYXRlJyksXG4gICAgYWN0aW9uc1Jvd3NDb3VudDogMCxcbiAgICBkZWZhdWx0RXh0ZW5zaW9uOiAnJyxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBuYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnbmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuaXZfVmFsaWRhdGVOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgZXh0ZW5zaW9uOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZXh0ZW5zaW9uJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pdl9WYWxpZGF0ZUV4dGVuc2lvbklzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHBbL15bMC05XXsyLDh9JC9dJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuaXZfVmFsaWRhdGVFeHRlbnNpb25Gb3JtYXRcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4aXN0UnVsZVtleHRlbnNpb24tZXJyb3JdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuaXZfVmFsaWRhdGVFeHRlbnNpb25Eb3VibGUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHRpbWVvdXQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd0aW1lb3V0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi45OV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pdl9WYWxpZGF0ZVRpbWVvdXRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIG51bWJlcl9vZl9yZXBlYXQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdudW1iZXJfb2ZfcmVwZWF0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclsxLi45OV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pdl9WYWxpZGF0ZVJlcGVhdENvdW50XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBBZGQgaGFuZGxlciB0byBkeW5hbWljYWxseSBjaGVjayBpZiB0aGUgaW5wdXQgbnVtYmVyIGlzIGF2YWlsYWJsZVxuICAgICAgICBsZXQgdGltZW91dElkO1xuICAgICAgICBpdnJNZW51TW9kaWZ5LiRudW1iZXIub24oJ2lucHV0JywgKCkgPT4ge1xuICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIHByZXZpb3VzIHRpbWVyLCBpZiBpdCBleGlzdHNcbiAgICAgICAgICAgIGlmICh0aW1lb3V0SWQpIHtcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dElkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFNldCBhIG5ldyB0aW1lciB3aXRoIGEgZGVsYXkgb2YgMC41IHNlY29uZHNcbiAgICAgICAgICAgIHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEdldCB0aGUgbmV3bHkgZW50ZXJlZCBudW1iZXJcbiAgICAgICAgICAgICAgICBjb25zdCBuZXdOdW1iZXIgPSBpdnJNZW51TW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRlbnNpb24nKTtcblxuICAgICAgICAgICAgICAgIC8vIEV4ZWN1dGUgdGhlIGF2YWlsYWJpbGl0eSBjaGVjayBmb3IgdGhlIG51bWJlclxuICAgICAgICAgICAgICAgIEV4dGVuc2lvbnMuY2hlY2tBdmFpbGFiaWxpdHkoaXZyTWVudU1vZGlmeS5kZWZhdWx0RXh0ZW5zaW9uLCBuZXdOdW1iZXIpO1xuICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHNvdW5kIGZpbGUgc2VsZWN0b3JcbiAgICAgICAgU291bmRGaWxlc1NlbGVjdG9yLmluaXRpYWxpemUoXG4gICAgICAgICAgICAnLmF1ZGlvLW1lc3NhZ2Utc2VsZWN0JyxcbiAgICAgICAgICAgICdpbnB1dFtuYW1lPVwiYXVkaW9fbWVzc2FnZV9pZFwiXSdcbiAgICAgICAgKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgYWN0aW9ucyB0YWJsZVxuICAgICAgICBpdnJNZW51TW9kaWZ5LmluaXRpYWxpemVBY3Rpb25zVGFibGUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyZSBGb3JtLmpzXG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBpdnJNZW51TW9kaWZ5LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBpdnJNZW51TW9kaWZ5LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGl2ck1lbnVNb2RpZnkuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBpdnJNZW51TW9kaWZ5LmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldHVwIFJFU1QgQVBJXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gSXZyTWVudUFQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVSZWNvcmQnO1xuICAgICAgICBcbiAgICAgICAgLy8gSW1wb3J0YW50IHNldHRpbmdzIGZvciBjb3JyZWN0IHNhdmUgbW9kZXMgb3BlcmF0aW9uXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9aXZyLW1lbnUvaW5kZXgvYDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9aXZyLW1lbnUvbW9kaWZ5L2A7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIEZvcm0gd2l0aCBhbGwgc3RhbmRhcmQgZmVhdHVyZXM6XG4gICAgICAgIC8vIC0gRGlydHkgY2hlY2tpbmcgKGNoYW5nZSB0cmFja2luZylcbiAgICAgICAgLy8gLSBEcm9wZG93biBzdWJtaXQgKFNhdmVTZXR0aW5ncywgU2F2ZVNldHRpbmdzQW5kQWRkTmV3LCBTYXZlU2V0dGluZ3NBbmRFeGl0KVxuICAgICAgICAvLyAtIEZvcm0gdmFsaWRhdGlvblxuICAgICAgICAvLyAtIEFKQVggcmVzcG9uc2UgaGFuZGxpbmdcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBMb2FkIGZvcm0gZGF0YVxuICAgICAgICBpdnJNZW51TW9kaWZ5LmluaXRpYWxpemVGb3JtKCk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBMb2FkIGRhdGEgaW50byBmb3JtXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIGNvbnN0IHJlY29yZElkID0gaXZyTWVudU1vZGlmeS5nZXRSZWNvcmRJZCgpO1xuICAgICAgICBcbiAgICAgICAgSXZyTWVudUFQSS5nZXRSZWNvcmQocmVjb3JkSWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIGl2ck1lbnVNb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIC8vIEdldCB0aGUgZGVmYXVsdCBleHRlbnNpb24gZnJvbSB0aGUgZm9ybVxuICAgICAgICAgICAgICAgIGl2ck1lbnVNb2RpZnkuZGVmYXVsdEV4dGVuc2lvbiA9IGl2ck1lbnVNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGVuc2lvbicpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFBvcHVsYXRlIGFjdGlvbnMgdGFibGVcbiAgICAgICAgICAgICAgICBpdnJNZW51TW9kaWZ5LnBvcHVsYXRlQWN0aW9uc1RhYmxlKHJlc3BvbnNlLmRhdGEuYWN0aW9ucyB8fCBbXSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihyZXNwb25zZS5tZXNzYWdlcz8uZXJyb3IgfHwgJ0ZhaWxlZCB0byBsb2FkIElWUiBtZW51IGRhdGEnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgcmVjb3JkIElEIGZyb20gVVJMXG4gICAgICovXG4gICAgZ2V0UmVjb3JkSWQoKSB7XG4gICAgICAgIGNvbnN0IHVybFBhcnRzID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnNwbGl0KCcvJyk7XG4gICAgICAgIGNvbnN0IG1vZGlmeUluZGV4ID0gdXJsUGFydHMuaW5kZXhPZignbW9kaWZ5Jyk7XG4gICAgICAgIGlmIChtb2RpZnlJbmRleCAhPT0gLTEgJiYgdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXSkge1xuICAgICAgICAgICAgcmV0dXJuIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICcnO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGFjdGlvbnMgdGFibGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQWN0aW9uc1RhYmxlKCkge1xuICAgICAgICAvLyBBZGQgbmV3IGFjdGlvbiBidXR0b25cbiAgICAgICAgJCgnI2FkZC1uZXctaXZyLWFjdGlvbicpLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBpdnJNZW51TW9kaWZ5LmFkZE5ld0FjdGlvblJvdygpO1xuICAgICAgICAgICAgaXZyTWVudU1vZGlmeS5yZWJ1aWxkQWN0aW9uRXh0ZW5zaW9uc0Ryb3Bkb3duKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBhY3Rpb25zIHRhYmxlXG4gICAgICovXG4gICAgcG9wdWxhdGVBY3Rpb25zVGFibGUoYWN0aW9ucykge1xuICAgICAgICAvLyBDbGVhciBleGlzdGluZyBhY3Rpb25zIGV4Y2VwdCB0ZW1wbGF0ZVxuICAgICAgICAkKCcuYWN0aW9uLXJvdzpub3QoI3Jvdy10ZW1wbGF0ZSknKS5yZW1vdmUoKTtcbiAgICAgICAgaXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50ID0gMDtcbiAgICAgICAgXG4gICAgICAgIGFjdGlvbnMuZm9yRWFjaChhY3Rpb24gPT4ge1xuICAgICAgICAgICAgaXZyTWVudU1vZGlmeS5hZGROZXdBY3Rpb25Sb3coe1xuICAgICAgICAgICAgICAgIGRpZ2l0czogYWN0aW9uLmRpZ2l0cyxcbiAgICAgICAgICAgICAgICBleHRlbnNpb246IGFjdGlvbi5leHRlbnNpb24sXG4gICAgICAgICAgICAgICAgZXh0ZW5zaW9uUmVwcmVzZW50OiBhY3Rpb24uZXh0ZW5zaW9uUmVwcmVzZW50IHx8ICcnXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBpdnJNZW51TW9kaWZ5LnJlYnVpbGRBY3Rpb25FeHRlbnNpb25zRHJvcGRvd24oKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEFkZCBuZXcgYWN0aW9uIHJvdyB1c2luZyB0aGUgZXhpc3RpbmcgdGVtcGxhdGVcbiAgICAgKi9cbiAgICBhZGROZXdBY3Rpb25Sb3cocGFyYW0gPSB7fSkge1xuICAgICAgICBjb25zdCBkZWZhdWx0UGFyYW0gPSB7XG4gICAgICAgICAgICBkaWdpdHM6ICcnLFxuICAgICAgICAgICAgZXh0ZW5zaW9uOiAnJyxcbiAgICAgICAgICAgIGV4dGVuc2lvblJlcHJlc2VudDogJydcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IHJvd1BhcmFtID0gJC5leHRlbmQoe30sIGRlZmF1bHRQYXJhbSwgcGFyYW0pO1xuICAgICAgICBpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnQgKz0gMTtcbiAgICAgICAgXG4gICAgICAgIC8vIENsb25lIHRlbXBsYXRlXG4gICAgICAgIGNvbnN0ICRhY3Rpb25UZW1wbGF0ZSA9IGl2ck1lbnVNb2RpZnkuJHJvd1RlbXBsYXRlLmNsb25lKCk7XG4gICAgICAgICRhY3Rpb25UZW1wbGF0ZVxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdoaWRkZW4nKVxuICAgICAgICAgICAgLmF0dHIoJ2lkJywgYHJvdy0ke2l2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudH1gKVxuICAgICAgICAgICAgLmF0dHIoJ2RhdGEtdmFsdWUnLCBpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnQpXG4gICAgICAgICAgICAuYXR0cignc3R5bGUnLCAnJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgLy8gU2V0IGRpZ2l0cyBpbnB1dFxuICAgICAgICAkYWN0aW9uVGVtcGxhdGUuZmluZCgnaW5wdXRbbmFtZT1cImRpZ2l0cy1pZFwiXScpXG4gICAgICAgICAgICAuYXR0cignaWQnLCBgZGlnaXRzLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWApXG4gICAgICAgICAgICAuYXR0cignbmFtZScsIGBkaWdpdHMtJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YClcbiAgICAgICAgICAgIC5hdHRyKCd2YWx1ZScsIHJvd1BhcmFtLmRpZ2l0cyk7XG4gICAgICAgICAgICBcbiAgICAgICAgLy8gU2V0IGV4dGVuc2lvbiBpbnB1dFxuICAgICAgICAkYWN0aW9uVGVtcGxhdGUuZmluZCgnaW5wdXRbbmFtZT1cImV4dGVuc2lvbi1pZFwiXScpXG4gICAgICAgICAgICAuYXR0cignaWQnLCBgZXh0ZW5zaW9uLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWApXG4gICAgICAgICAgICAuYXR0cignbmFtZScsIGBleHRlbnNpb24tJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YClcbiAgICAgICAgICAgIC5hdHRyKCd2YWx1ZScsIHJvd1BhcmFtLmV4dGVuc2lvbik7XG4gICAgICAgICAgICBcbiAgICAgICAgLy8gU2V0IGRlbGV0ZSBidXR0b24gZGF0YS12YWx1ZVxuICAgICAgICAkYWN0aW9uVGVtcGxhdGUuZmluZCgnZGl2LmRlbGV0ZS1hY3Rpb24tcm93JylcbiAgICAgICAgICAgIC5hdHRyKCdkYXRhLXZhbHVlJywgaXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50KTtcbiAgICAgICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgZXh0ZW5zaW9uIHJlcHJlc2VudCB0ZXh0IGlmIGF2YWlsYWJsZVxuICAgICAgICBpZiAocm93UGFyYW0uZXh0ZW5zaW9uUmVwcmVzZW50Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICRhY3Rpb25UZW1wbGF0ZS5maW5kKCdkaXYuZGVmYXVsdC50ZXh0JylcbiAgICAgICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2RlZmF1bHQnKVxuICAgICAgICAgICAgICAgIC5odG1sKHJvd1BhcmFtLmV4dGVuc2lvblJlcHJlc2VudCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCB2YWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgbmV3IGZpZWxkc1xuICAgICAgICBpdnJNZW51TW9kaWZ5LnZhbGlkYXRlUnVsZXNbYGRpZ2l0cy0ke2l2ck1lbnVNb2RpZnkuYWN0aW9uc1Jvd3NDb3VudH1gXSA9IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6IGBkaWdpdHMtJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YCxcbiAgICAgICAgICAgIGRlcGVuZHM6IGBleHRlbnNpb24tJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YCxcbiAgICAgICAgICAgIHJ1bGVzOiBbe1xuICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuaXZfVmFsaWRhdGVEaWdpdHNJc0VtcHR5XG4gICAgICAgICAgICB9XVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgaXZyTWVudU1vZGlmeS52YWxpZGF0ZVJ1bGVzW2BleHRlbnNpb24tJHtpdnJNZW51TW9kaWZ5LmFjdGlvbnNSb3dzQ291bnR9YF0gPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiBgZXh0ZW5zaW9uLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWAsXG4gICAgICAgICAgICBkZXBlbmRzOiBgZGlnaXRzLSR7aXZyTWVudU1vZGlmeS5hY3Rpb25zUm93c0NvdW50fWAsXG4gICAgICAgICAgICBydWxlczogW3tcbiAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLml2X1ZhbGlkYXRlRXh0ZW5zaW9uSXNFbXB0eVxuICAgICAgICAgICAgfV1cbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFwcGVuZCB0byBhY3Rpb25zIHBsYWNlXG4gICAgICAgIGl2ck1lbnVNb2RpZnkuJGFjdGlvbnNQbGFjZS5hcHBlbmQoJGFjdGlvblRlbXBsYXRlKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFja25vd2xlZGdlIGZvcm0gbW9kaWZpY2F0aW9uXG4gICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlYnVpbGQgZHJvcGRvd24gZm9yIGFjdGlvbiBleHRlbnNpb25zXG4gICAgICovXG4gICAgcmVidWlsZEFjdGlvbkV4dGVuc2lvbnNEcm9wZG93bigpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93bnMgd2l0aCByb3V0aW5nIHNldHRpbmdzXG4gICAgICAgICQoJyNpdnItbWVudS1mb3JtIC5mb3J3YXJkaW5nLXNlbGVjdCcpLmRyb3Bkb3duKFxuICAgICAgICAgICAgRXh0ZW5zaW9ucy5nZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZyhpdnJNZW51TW9kaWZ5LmNiT25FeHRlbnNpb25TZWxlY3QpXG4gICAgICAgICk7XG4gICAgICAgIFxuICAgICAgICAvLyBBdHRhY2ggZGVsZXRlIGhhbmRsZXJzXG4gICAgICAgICQoJy5kZWxldGUtYWN0aW9uLXJvdycpLm9mZignY2xpY2snKS5vbignY2xpY2snLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCBpZCA9ICQodGhpcykuYXR0cignZGF0YS12YWx1ZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZW1vdmUgdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICAgICAgZGVsZXRlIGl2ck1lbnVNb2RpZnkudmFsaWRhdGVSdWxlc1tgZGlnaXRzLSR7aWR9YF07XG4gICAgICAgICAgICBkZWxldGUgaXZyTWVudU1vZGlmeS52YWxpZGF0ZVJ1bGVzW2BleHRlbnNpb24tJHtpZH1gXTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIHRoZSByb3dcbiAgICAgICAgICAgICQoYCNyb3ctJHtpZH1gKS5yZW1vdmUoKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQWNrbm93bGVkZ2UgZm9ybSBtb2RpZmljYXRpb25cbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayB3aGVuIGV4dGVuc2lvbiBpcyBzZWxlY3RlZCBpbiBkcm9wZG93blxuICAgICAqL1xuICAgIGNiT25FeHRlbnNpb25TZWxlY3QodGV4dCwgdmFsdWUsICRlbGVtZW50KSB7XG4gICAgICAgIC8vIE1hcmsgdGhhdCBkYXRhIGhhcyBjaGFuZ2VkXG4gICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIC8vIENvbGxlY3QgYWN0aW9ucyBkYXRhXG4gICAgICAgIGNvbnN0IGFjdGlvbnMgPSBbXTtcbiAgICAgICAgXG4gICAgICAgIC8vIEl0ZXJhdGUgb3ZlciBlYWNoIGFjdGlvbiByb3cgKGV4Y2x1ZGluZyB0ZW1wbGF0ZSlcbiAgICAgICAgJCgnLmFjdGlvbi1yb3c6bm90KCNyb3ctdGVtcGxhdGUpJykuZWFjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0IHJvd0lkID0gJCh0aGlzKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFNraXAgdGVtcGxhdGUgcm93XG4gICAgICAgICAgICBpZiAocm93SWQgJiYgcGFyc2VJbnQocm93SWQpID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRpZ2l0cyA9IGl2ck1lbnVNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgYGRpZ2l0cy0ke3Jvd0lkfWApO1xuICAgICAgICAgICAgICAgIGNvbnN0IGV4dGVuc2lvbiA9IGl2ck1lbnVNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgYGV4dGVuc2lvbi0ke3Jvd0lkfWApO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIE9ubHkgYWRkIGlmIGJvdGggdmFsdWVzIGV4aXN0XG4gICAgICAgICAgICAgICAgaWYgKGRpZ2l0cyAmJiBleHRlbnNpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgYWN0aW9ucy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpZ2l0czogZGlnaXRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgZXh0ZW5zaW9uOiBleHRlbnNpb25cbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBhY3Rpb25zIHRvIGZvcm0gZGF0YVxuICAgICAgICBjb25zdCBmb3JtRGF0YSA9IGl2ck1lbnVNb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBmb3JtRGF0YS5hY3Rpb25zID0gYWN0aW9uczsgLy8gUGFzcyBhcyBhcnJheSwgbm90IEpTT04gc3RyaW5nXG4gICAgICAgIFxuICAgICAgICBzZXR0aW5ncy5kYXRhID0gZm9ybURhdGE7XG4gICAgICAgIHJldHVybiBzZXR0aW5ncztcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGZvcm0gc3VibWlzc2lvblxuICAgICAqIEhhbmRsZXMgZGlmZmVyZW50IHNhdmUgbW9kZXMgKFNhdmVTZXR0aW5ncywgU2F2ZVNldHRpbmdzQW5kQWRkTmV3LCBTYXZlU2V0dGluZ3NBbmRFeGl0KVxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIGl2ck1lbnVNb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgVVJMIGZvciBuZXcgcmVjb3Jkc1xuICAgICAgICAgICAgY29uc3QgY3VycmVudElkID0gJCgnI2lkJykudmFsKCk7XG4gICAgICAgICAgICBpZiAoIWN1cnJlbnRJZCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEudW5pcWlkKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbmV3VXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWYucmVwbGFjZSgvbW9kaWZ5XFwvPyQvLCBgbW9kaWZ5LyR7cmVzcG9uc2UuZGF0YS51bmlxaWR9YCk7XG4gICAgICAgICAgICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKG51bGwsICcnLCBuZXdVcmwpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWVzJywgZGF0YSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRpbWVvdXRfZXh0ZW5zaW9uIGRyb3Bkb3duIHdpdGggcm91dGluZyBzZXR0aW5nc1xuICAgICAgICBpdnJNZW51TW9kaWZ5LmluaXRpYWxpemVUaW1lb3V0RXh0ZW5zaW9uRHJvcGRvd24oKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgIEZvcm0uc2F2ZUluaXRpYWxWYWx1ZXMoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRpbWVvdXQgZXh0ZW5zaW9uIGRyb3Bkb3duIHdpdGggcHJvcGVyIHZhbHVlIGZyb20gQVBJXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRpbWVvdXRFeHRlbnNpb25Ecm9wZG93bigpIHtcbiAgICAgICAgY29uc3QgJHRpbWVvdXRFeHRlbnNpb24gPSAkKCcjdGltZW91dF9leHRlbnNpb24nKTtcbiAgICAgICAgaWYgKCR0aW1lb3V0RXh0ZW5zaW9uLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIC8vIEdldCBjdXJyZW50IHZhbHVlIGRpcmVjdGx5IGZyb20gdGhlIHJlc3BvbnNlIGRhdGEgKG5vdCBmcm9tIEhUTUwgZmllbGQpXG4gICAgICAgICAgICBjb25zdCBmb3JtVmFsdWVzID0gaXZyTWVudU1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgICAgICBjb25zdCBjdXJyZW50VmFsdWUgPSBmb3JtVmFsdWVzLnRpbWVvdXRfZXh0ZW5zaW9uO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBHZXQgdGhlIHJvdXRpbmcgZHJvcGRvd24gc2V0dGluZ3NcbiAgICAgICAgICAgIGNvbnN0IGRyb3Bkb3duU2V0dGluZ3MgPSBFeHRlbnNpb25zLmdldERyb3Bkb3duU2V0dGluZ3NGb3JSb3V0aW5nKCh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBBbHdheXMgc2V0IGNhbGxiYWNrIHRvIHNldCB2YWx1ZSBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxPblJlc3BvbnNlID0gZHJvcGRvd25TZXR0aW5ncy5hcGlTZXR0aW5ncy5vblJlc3BvbnNlO1xuICAgICAgICAgICAgZHJvcGRvd25TZXR0aW5ncy5hcGlTZXR0aW5ncy5vblJlc3BvbnNlID0gZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjb25zdCByZXN1bHQgPSBvcmlnaW5hbE9uUmVzcG9uc2UuY2FsbCh0aGlzLCByZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2V0IHRoZSB2YWx1ZSBhZnRlciBvcHRpb25zIGFyZSBsb2FkZWQgaWYgd2UgaGF2ZSBhIHZhbHVlXG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRWYWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICR0aW1lb3V0RXh0ZW5zaW9uLmRyb3Bkb3duKCdzZXQgdmFsdWUnLCBjdXJyZW50VmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICB9LCA1MCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDbGVhciBleGlzdGluZyBvcHRpb25zIGFuZCBpbml0aWFsaXplIGRyb3Bkb3duIHdpdGggQUpBWCBzZXR0aW5nc1xuICAgICAgICAgICAgJHRpbWVvdXRFeHRlbnNpb24uZW1wdHkoKS5hcHBlbmQoJzxvcHRpb24gdmFsdWU9XCJcIj7QktGL0LHQtdGA0LjRgtC1INC90L7QvNC10YA8L29wdGlvbj4nKTtcbiAgICAgICAgICAgICR0aW1lb3V0RXh0ZW5zaW9uLmRyb3Bkb3duKGRyb3Bkb3duU2V0dGluZ3MpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgdmFsdWUsIHRyaWdnZXIgQVBJIGxvYWQgdG8gcG9wdWxhdGUgZHJvcGRvd25cbiAgICAgICAgICAgIGlmIChjdXJyZW50VmFsdWUpIHtcbiAgICAgICAgICAgICAgICAkdGltZW91dEV4dGVuc2lvbi5kcm9wZG93bignc2hvdycpO1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAkdGltZW91dEV4dGVuc2lvbi5kcm9wZG93bignaGlkZScpO1xuICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG59O1xuXG4vKipcbiAqIENoZWNrcyBpZiB0aGUgbnVtYmVyIGlzIHRha2VuIGJ5IGFub3RoZXIgYWNjb3VudFxuICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgdGhlIHBhcmFtZXRlciBoYXMgdGhlICdoaWRkZW4nIGNsYXNzLCBmYWxzZSBvdGhlcndpc2VcbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4aXN0UnVsZSA9ICh2YWx1ZSwgcGFyYW1ldGVyKSA9PiAkKGAjJHtwYXJhbWV0ZXJ9YCkuaGFzQ2xhc3MoJ2hpZGRlbicpO1xuXG4vKipcbiAqICBJbml0aWFsaXplIElWUiBtZW51IG1vZGlmeSBmb3JtIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBpdnJNZW51TW9kaWZ5LmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=