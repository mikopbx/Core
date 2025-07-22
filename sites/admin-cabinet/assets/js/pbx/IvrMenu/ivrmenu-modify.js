"use strict";

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

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

/* global globalRootUrl, ivrActions, globalTranslate, Form, Extensions, SoundFilesSelector */
var ivrMenu = {
  /**
   * jQuery object for the form.
   * @type {jQuery}
   */
  $formObj: $('#ivr-menu-form'),
  $dropDowns: $('#ivr-menu-form .ui.dropdown'),
  $number: $('#extension'),
  $errorMessages: $('#form-error-messages'),
  $rowTemplate: $('#row-template'),
  defaultExtension: '',
  actionsRowsCount: 0,

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
        type: 'existRule',
        prompt: globalTranslate.iv_ValidateExtensionIsDouble
      }]
    },
    timeout_extension: {
      identifier: 'timeout_extension',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.iv_ValidateTimeoutExtensionIsEmpty
      }]
    },
    audio_message_id: {
      identifier: 'audio_message_id',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.iv_ValidateAudioFileIsEmpty
      }]
    },
    timeout: {
      identifier: 'timeout',
      rules: [{
        type: 'integer[0..99]',
        prompt: globalTranslate.iv_ValidateTimeoutOutOfRange
      }]
    },
    number_of_repeat: {
      identifier: 'number_of_repeat',
      rules: [{
        type: 'integer[0..99]',
        prompt: globalTranslate.iv_ValidateRepeatNumberOutOfRange
      }]
    }
  },
  initialize: function initialize() {
    // Initialize dropdowns
    ivrMenu.$dropDowns.dropdown(); // Dynamic check to see if the selected number is available

    ivrMenu.$number.on('change', function () {
      var newNumber = ivrMenu.$formObj.form('get value', 'extension');
      Extensions.checkAvailability(ivrMenu.defaultNumber, newNumber);
    }); // Add event listener for adding a new IVR action row

    $('#add-new-ivr-action').on('click', function (el) {
      ivrMenu.addNewActionRow();
      ivrMenu.rebuildActionExtensionsDropdown(); // Trigger change event to acknowledge the modification

      Form.dataChanged();
      el.preventDefault();
    }); // Initialize audio message dropdowns

    $('#ivr-menu-form .audio-message-select').dropdown(SoundFilesSelector.getDropdownSettingsWithEmpty()); // Initialize the form

    ivrMenu.initializeForm(); // Build IVR menu actions

    ivrMenu.buildIvrMenuActions(); // Get the default extension value

    ivrMenu.defaultExtension = ivrMenu.$formObj.form('get value', 'extension'); // Initialize tooltips

    ivrMenu.initializeTooltips();
  },

  /**
   * Create ivr menu items on the form
   */
  buildIvrMenuActions: function buildIvrMenuActions() {
    var objActions = JSON.parse(ivrActions);
    objActions.forEach(function (element) {
      ivrMenu.addNewActionRow(element);
    });
    if (objActions.length === 0) ivrMenu.addNewActionRow();
    ivrMenu.rebuildActionExtensionsDropdown();
  },

  /**
   * Adds new form validation rules for a newly added action row.
   * @param {string} newRowId - The ID of the newly added action row.
   */
  addNewFormRules: function addNewFormRules(newRowId) {
    // Create the identifier for the digits field of the new row
    var $digitsClass = "digits-".concat(newRowId); // Define the validation rules for the digits field

    ivrMenu.validateRules[$digitsClass] = {
      identifier: $digitsClass,
      rules: [{
        type: 'regExp[/^[0-9]{1,7}$/]',
        prompt: globalTranslate.iv_ValidateDigitsIsNotCorrect
      }, {
        type: 'checkDoublesDigits',
        prompt: globalTranslate.iv_ValidateDigitsIsNotCorrect
      }]
    }; // Create the identifier for the extension field of the new row

    var $extensionClass = "extension-".concat(newRowId); // Define the validation rules for the extension field

    ivrMenu.validateRules[$extensionClass] = {
      identifier: $extensionClass,
      rules: [{
        type: 'empty',
        prompt: globalTranslate.iv_ValidateExtensionIsNotCorrect
      }]
    };
  },

  /**
   * Adds a new action row to the IVR menu form.
   * @param {Object} paramObj - Optional parameter object with initial values for the action row.
   *                            If not provided, default values will be used.
   */
  addNewActionRow: function addNewActionRow(paramObj) {
    // Default parameter values
    var param = {
      id: '',
      extension: '',
      extensionRepresent: '',
      digits: ''
    }; // Override default values with the provided parameter object

    if (paramObj !== undefined) {
      param = paramObj;
    } // Increment the actionsRowsCount


    ivrMenu.actionsRowsCount += 1; // Clone the row template and modify its attributes and content

    var $actionTemplate = ivrMenu.$rowTemplate.clone();
    $actionTemplate.removeClass('hidden').attr('id', "row-".concat(ivrMenu.actionsRowsCount)).attr('data-value', ivrMenu.actionsRowsCount).attr('style', ''); // Set the attributes and values for digits input field

    $actionTemplate.find('input[name="digits-id"]').attr('id', "digits-".concat(ivrMenu.actionsRowsCount)).attr('name', "digits-".concat(ivrMenu.actionsRowsCount)).attr('value', param.digits); // Set the attributes and values for extension input field

    $actionTemplate.find('input[name="extension-id"]').attr('id', "extension-".concat(ivrMenu.actionsRowsCount)).attr('name', "extension-".concat(ivrMenu.actionsRowsCount)).attr('value', param.extension); // Set the data-value attribute for the delete-action-row element

    $actionTemplate.find('div.delete-action-row').attr('data-value', ivrMenu.actionsRowsCount); // Update the extensionRepresent content based on the provided value or default text

    if (param.extensionRepresent.length > 0) {
      $actionTemplate.find('div.default.text').removeClass('default').html(param.extensionRepresent);
    } else {
      $actionTemplate.find('div.default.text').html(globalTranslate.ex_SelectNumber);
    } // Append the action template to the actions-place element


    $('#actions-place').append($actionTemplate); // Add new form rules for the newly added action row

    ivrMenu.addNewFormRules(ivrMenu.actionsRowsCount);
  },

  /**
   * Rebuilds the action extensions dropdown by initializing the dropdown settings for routing
   * and attaching the cbOnExtensionSelect callback function to handle the extension selection event.
   */
  rebuildActionExtensionsDropdown: function rebuildActionExtensionsDropdown() {
    // Initialize the dropdown settings for routing with cbOnExtensionSelect callback function
    $('#ivr-menu-form .forwarding-select').dropdown(Extensions.getDropdownSettingsForRouting(ivrMenu.cbOnExtensionSelect)); // Attach a click event handler to the delete-action-row elements

    $('.delete-action-row').on('click', function (e) {
      e.preventDefault(); // Get the 'data-value' attribute of the clicked element

      var id = $(this).attr('data-value'); // Remove the corresponding rules from validateRules object

      delete ivrMenu.validateRules["digits-".concat(id)];
      delete ivrMenu.validateRules["extension-".concat(id)]; // Remove the row with the corresponding id

      $("#row-".concat(id)).remove(); // Trigger change event to acknowledge the modification

      Form.dataChanged();
    });
  },

  /**
   * Callback function to be called before the form is sent
   * @param {Object} settings - The current settings of the form
   * @returns {Object} - The updated settings of the form
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    // Copy the settings object to a new variable to avoid modifying the original
    var result = settings; // Get the form values from $formObj of ivrMenu

    result.data = ivrMenu.$formObj.form('get values'); // Initialize an array to store actions

    var arrActions = []; // Iterate over each action row

    $('.action-row').each(function (index, obj) {
      var rowId = $(obj).attr('data-value'); // If rowId is greater than 0, get the 'digits' and 'extension' values from the form and push them into the arrActions array

      if (rowId > 0) {
        arrActions.push({
          digits: ivrMenu.$formObj.form('get value', "digits-".concat(rowId)),
          extension: ivrMenu.$formObj.form('get value', "extension-".concat(rowId))
        });
      }
    }); // If there are no action rows, set the result to false, display an error message and add error class to the form

    if (arrActions.length === 0) {
      result = false;
      ivrMenu.$errorMessages.html(globalTranslate.iv_ValidateNoIVRExtensions);
      ivrMenu.$formObj.addClass('error');
    } else {
      // Convert the arrActions array into a JSON string and assign it to 'actions' key in the result data object
      result.data.actions = JSON.stringify(arrActions);
    } // Return the modified settings object or false


    return result;
  },

  /**
   * Callback function that triggers when a number is selected from the dropdown menu.
   * It generates a random number and triggers a change event.
   */
  cbOnExtensionSelect: function cbOnExtensionSelect() {
    // Trigger change event to acknowledge the modification
    Form.dataChanged();
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
    Form.$formObj = ivrMenu.$formObj;
    Form.url = "".concat(globalRootUrl, "ivr-menu/save"); // Form submission URL

    Form.validateRules = ivrMenu.validateRules; // Form validation rules

    Form.cbBeforeSendForm = ivrMenu.cbBeforeSendForm; // Callback before form is sent

    Form.cbAfterSendForm = ivrMenu.cbAfterSendForm; // Callback after form is sent

    Form.initialize();
  },

  /**
   * Initialize tooltips for form fields
   */
  initializeTooltips: function initializeTooltips() {
    // Define tooltip configurations for each field
    var tooltipConfigs = {
      number_of_repeat: ivrMenu.buildTooltipContent({
        header: globalTranslate.iv_NumberOfRepeatTooltip_header,
        description: globalTranslate.iv_NumberOfRepeatTooltip_desc,
        note: globalTranslate.iv_NumberOfRepeatTooltip_note
      }),
      timeout: ivrMenu.buildTooltipContent({
        header: globalTranslate.iv_TimeoutTooltip_header,
        description: globalTranslate.iv_TimeoutTooltip_desc,
        list: [globalTranslate.iv_TimeoutTooltip_list1, globalTranslate.iv_TimeoutTooltip_list2, globalTranslate.iv_TimeoutTooltip_list3],
        note: globalTranslate.iv_TimeoutTooltip_note
      }),
      timeout_extension: ivrMenu.buildTooltipContent({
        header: globalTranslate.iv_TimeoutExtensionTooltip_header,
        description: globalTranslate.iv_TimeoutExtensionTooltip_desc,
        list: [globalTranslate.iv_TimeoutExtensionTooltip_list1, globalTranslate.iv_TimeoutExtensionTooltip_list2, globalTranslate.iv_TimeoutExtensionTooltip_list3],
        note: globalTranslate.iv_TimeoutExtensionTooltip_note
      }),
      allow_enter_any_internal_extension: ivrMenu.buildTooltipContent({
        header: globalTranslate.iv_AllowEnterAnyInternalExtensionTooltip_header,
        description: globalTranslate.iv_AllowEnterAnyInternalExtensionTooltip_desc,
        list: [{
          term: globalTranslate.iv_AllowEnterAnyInternalExtensionTooltip_list_header,
          definition: null
        }, globalTranslate.iv_AllowEnterAnyInternalExtensionTooltip_list1, globalTranslate.iv_AllowEnterAnyInternalExtensionTooltip_list2, globalTranslate.iv_AllowEnterAnyInternalExtensionTooltip_list3, globalTranslate.iv_AllowEnterAnyInternalExtensionTooltip_list4],
        note: globalTranslate.iv_AllowEnterAnyInternalExtensionTooltip_note
      }),
      extension: ivrMenu.buildTooltipContent({
        header: globalTranslate.iv_ExtensionTooltip_header,
        description: globalTranslate.iv_ExtensionTooltip_desc,
        note: globalTranslate.iv_ExtensionTooltip_note
      })
    }; // Initialize popup for each icon

    $('.field-info-icon').each(function (index, element) {
      var $icon = $(element);
      var fieldName = $icon.data('field');
      var content = tooltipConfigs[fieldName];

      if (content) {
        $icon.popup({
          html: content,
          position: 'top right',
          hoverable: true,
          delay: {
            show: 300,
            hide: 100
          },
          variation: 'flowing'
        });
      }
    });
  },

  /**
   * Build HTML content for tooltip popup
   * @param {Object} config - The configuration object for the tooltip
   * @returns {string} - The HTML content for the tooltip
   */
  buildTooltipContent: function buildTooltipContent(config) {
    if (!config) return '';
    var html = ''; // Add header if exists

    if (config.header) {
      html += "<div class=\"header\"><strong>".concat(config.header, "</strong></div>");
      html += '<div class="ui divider"></div>';
    } // Add description if exists


    if (config.description) {
      html += "<p>".concat(config.description, "</p>");
    } // Add list items if exist


    if (config.list) {
      if (Array.isArray(config.list) && config.list.length > 0) {
        html += '<ul>';
        config.list.forEach(function (item) {
          if (typeof item === 'string') {
            html += "<li>".concat(item, "</li>");
          } else if (item.term && item.definition === null) {
            // Header item without definition
            html += "</ul><p><strong>".concat(item.term, "</strong></p><ul>");
          } else if (item.term && item.definition) {
            html += "<li><strong>".concat(item.term, ":</strong> ").concat(item.definition, "</li>");
          }
        });
        html += '</ul>';
      } else if (_typeof(config.list) === 'object') {
        // Handle key-value pairs for list
        html += '<dl>';
        Object.entries(config.list).forEach(function (_ref) {
          var _ref2 = _slicedToArray(_ref, 2),
              key = _ref2[0],
              value = _ref2[1];

          html += "<dt><strong>".concat(key, ":</strong></dt>");
          html += "<dd>".concat(value, "</dd>");
        });
        html += '</dl>';
      }
    } // Add additional lists (list2-list10) if exist


    for (var i = 2; i <= 10; i++) {
      var listKey = "list".concat(i);

      if (config[listKey] && Array.isArray(config[listKey]) && config[listKey].length > 0) {
        html += '<ul>';
        config[listKey].forEach(function (item) {
          html += "<li>".concat(item, "</li>");
        });
        html += '</ul>';
      }
    } // Add warning if exists


    if (config.warning) {
      html += '<div class="ui small orange message">';

      if (config.warning.header) {
        html += "<div class=\"header\">".concat(config.warning.header, "</div>");
      }

      html += "<p>".concat(config.warning.text, "</p>");
      html += '</div>';
    } // Add examples if exist


    if (config.examples && Array.isArray(config.examples) && config.examples.length > 0) {
      if (config.examplesHeader) {
        html += "<p><strong>".concat(config.examplesHeader, ":</strong></p>");
      }

      html += '<pre style="background-color: #f4f4f4; padding: 5px; border-radius: 3px;">';
      html += config.examples.join('\n');
      html += '</pre>';
    } // Add note if exists


    if (config.note) {
      html += "<p><em>".concat(config.note, "</em></p>");
    }

    return html;
  }
};
/**
 * Custom form rule to check if an element with id 'extension-error' has the class 'hidden'.
 */

$.fn.form.settings.rules.existRule = function () {
  return $('#extension-error').hasClass('hidden');
};
/**
 * Custom form rule to check for duplicate digits values.
 * @param {string} value - The value to check for duplicates.
 * @returns {boolean} - True if there are no duplicates, false otherwise.
 */


$.fn.form.settings.rules.checkDoublesDigits = function (value) {
  var count = 0;
  $("input[id^='digits']").each(function (index, obj) {
    if (ivrMenu.$formObj.form('get value', "".concat(obj.id)) === value) count += 1;
  });
  return count === 1;
};
/**
 *  Initialize IVR menu modify form on document ready
 */


$(document).ready(function () {
  ivrMenu.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9JdnJNZW51L2l2cm1lbnUtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbIml2ck1lbnUiLCIkZm9ybU9iaiIsIiQiLCIkZHJvcERvd25zIiwiJG51bWJlciIsIiRlcnJvck1lc3NhZ2VzIiwiJHJvd1RlbXBsYXRlIiwiZGVmYXVsdEV4dGVuc2lvbiIsImFjdGlvbnNSb3dzQ291bnQiLCJ2YWxpZGF0ZVJ1bGVzIiwibmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJpdl9WYWxpZGF0ZU5hbWVJc0VtcHR5IiwiZXh0ZW5zaW9uIiwiaXZfVmFsaWRhdGVFeHRlbnNpb25Jc0VtcHR5IiwiaXZfVmFsaWRhdGVFeHRlbnNpb25Jc0RvdWJsZSIsInRpbWVvdXRfZXh0ZW5zaW9uIiwiaXZfVmFsaWRhdGVUaW1lb3V0RXh0ZW5zaW9uSXNFbXB0eSIsImF1ZGlvX21lc3NhZ2VfaWQiLCJpdl9WYWxpZGF0ZUF1ZGlvRmlsZUlzRW1wdHkiLCJ0aW1lb3V0IiwiaXZfVmFsaWRhdGVUaW1lb3V0T3V0T2ZSYW5nZSIsIm51bWJlcl9vZl9yZXBlYXQiLCJpdl9WYWxpZGF0ZVJlcGVhdE51bWJlck91dE9mUmFuZ2UiLCJpbml0aWFsaXplIiwiZHJvcGRvd24iLCJvbiIsIm5ld051bWJlciIsImZvcm0iLCJFeHRlbnNpb25zIiwiY2hlY2tBdmFpbGFiaWxpdHkiLCJkZWZhdWx0TnVtYmVyIiwiZWwiLCJhZGROZXdBY3Rpb25Sb3ciLCJyZWJ1aWxkQWN0aW9uRXh0ZW5zaW9uc0Ryb3Bkb3duIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwicHJldmVudERlZmF1bHQiLCJTb3VuZEZpbGVzU2VsZWN0b3IiLCJnZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5IiwiaW5pdGlhbGl6ZUZvcm0iLCJidWlsZEl2ck1lbnVBY3Rpb25zIiwiaW5pdGlhbGl6ZVRvb2x0aXBzIiwib2JqQWN0aW9ucyIsIkpTT04iLCJwYXJzZSIsIml2ckFjdGlvbnMiLCJmb3JFYWNoIiwiZWxlbWVudCIsImxlbmd0aCIsImFkZE5ld0Zvcm1SdWxlcyIsIm5ld1Jvd0lkIiwiJGRpZ2l0c0NsYXNzIiwiaXZfVmFsaWRhdGVEaWdpdHNJc05vdENvcnJlY3QiLCIkZXh0ZW5zaW9uQ2xhc3MiLCJpdl9WYWxpZGF0ZUV4dGVuc2lvbklzTm90Q29ycmVjdCIsInBhcmFtT2JqIiwicGFyYW0iLCJpZCIsImV4dGVuc2lvblJlcHJlc2VudCIsImRpZ2l0cyIsInVuZGVmaW5lZCIsIiRhY3Rpb25UZW1wbGF0ZSIsImNsb25lIiwicmVtb3ZlQ2xhc3MiLCJhdHRyIiwiZmluZCIsImh0bWwiLCJleF9TZWxlY3ROdW1iZXIiLCJhcHBlbmQiLCJnZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZyIsImNiT25FeHRlbnNpb25TZWxlY3QiLCJlIiwicmVtb3ZlIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwicmVzdWx0IiwiZGF0YSIsImFyckFjdGlvbnMiLCJlYWNoIiwiaW5kZXgiLCJvYmoiLCJyb3dJZCIsInB1c2giLCJpdl9WYWxpZGF0ZU5vSVZSRXh0ZW5zaW9ucyIsImFkZENsYXNzIiwiYWN0aW9ucyIsInN0cmluZ2lmeSIsImNiQWZ0ZXJTZW5kRm9ybSIsInJlc3BvbnNlIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsInRvb2x0aXBDb25maWdzIiwiYnVpbGRUb29sdGlwQ29udGVudCIsImhlYWRlciIsIml2X051bWJlck9mUmVwZWF0VG9vbHRpcF9oZWFkZXIiLCJkZXNjcmlwdGlvbiIsIml2X051bWJlck9mUmVwZWF0VG9vbHRpcF9kZXNjIiwibm90ZSIsIml2X051bWJlck9mUmVwZWF0VG9vbHRpcF9ub3RlIiwiaXZfVGltZW91dFRvb2x0aXBfaGVhZGVyIiwiaXZfVGltZW91dFRvb2x0aXBfZGVzYyIsImxpc3QiLCJpdl9UaW1lb3V0VG9vbHRpcF9saXN0MSIsIml2X1RpbWVvdXRUb29sdGlwX2xpc3QyIiwiaXZfVGltZW91dFRvb2x0aXBfbGlzdDMiLCJpdl9UaW1lb3V0VG9vbHRpcF9ub3RlIiwiaXZfVGltZW91dEV4dGVuc2lvblRvb2x0aXBfaGVhZGVyIiwiaXZfVGltZW91dEV4dGVuc2lvblRvb2x0aXBfZGVzYyIsIml2X1RpbWVvdXRFeHRlbnNpb25Ub29sdGlwX2xpc3QxIiwiaXZfVGltZW91dEV4dGVuc2lvblRvb2x0aXBfbGlzdDIiLCJpdl9UaW1lb3V0RXh0ZW5zaW9uVG9vbHRpcF9saXN0MyIsIml2X1RpbWVvdXRFeHRlbnNpb25Ub29sdGlwX25vdGUiLCJhbGxvd19lbnRlcl9hbnlfaW50ZXJuYWxfZXh0ZW5zaW9uIiwiaXZfQWxsb3dFbnRlckFueUludGVybmFsRXh0ZW5zaW9uVG9vbHRpcF9oZWFkZXIiLCJpdl9BbGxvd0VudGVyQW55SW50ZXJuYWxFeHRlbnNpb25Ub29sdGlwX2Rlc2MiLCJ0ZXJtIiwiaXZfQWxsb3dFbnRlckFueUludGVybmFsRXh0ZW5zaW9uVG9vbHRpcF9saXN0X2hlYWRlciIsImRlZmluaXRpb24iLCJpdl9BbGxvd0VudGVyQW55SW50ZXJuYWxFeHRlbnNpb25Ub29sdGlwX2xpc3QxIiwiaXZfQWxsb3dFbnRlckFueUludGVybmFsRXh0ZW5zaW9uVG9vbHRpcF9saXN0MiIsIml2X0FsbG93RW50ZXJBbnlJbnRlcm5hbEV4dGVuc2lvblRvb2x0aXBfbGlzdDMiLCJpdl9BbGxvd0VudGVyQW55SW50ZXJuYWxFeHRlbnNpb25Ub29sdGlwX2xpc3Q0IiwiaXZfQWxsb3dFbnRlckFueUludGVybmFsRXh0ZW5zaW9uVG9vbHRpcF9ub3RlIiwiaXZfRXh0ZW5zaW9uVG9vbHRpcF9oZWFkZXIiLCJpdl9FeHRlbnNpb25Ub29sdGlwX2Rlc2MiLCJpdl9FeHRlbnNpb25Ub29sdGlwX25vdGUiLCIkaWNvbiIsImZpZWxkTmFtZSIsImNvbnRlbnQiLCJwb3B1cCIsInBvc2l0aW9uIiwiaG92ZXJhYmxlIiwiZGVsYXkiLCJzaG93IiwiaGlkZSIsInZhcmlhdGlvbiIsImNvbmZpZyIsIkFycmF5IiwiaXNBcnJheSIsIml0ZW0iLCJPYmplY3QiLCJlbnRyaWVzIiwia2V5IiwidmFsdWUiLCJpIiwibGlzdEtleSIsIndhcm5pbmciLCJ0ZXh0IiwiZXhhbXBsZXMiLCJleGFtcGxlc0hlYWRlciIsImpvaW4iLCJmbiIsImV4aXN0UnVsZSIsImhhc0NsYXNzIiwiY2hlY2tEb3VibGVzRGlnaXRzIiwiY291bnQiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUdBLElBQU1BLE9BQU8sR0FBRztBQUNaO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLGdCQUFELENBTEM7QUFPWkMsRUFBQUEsVUFBVSxFQUFFRCxDQUFDLENBQUMsNkJBQUQsQ0FQRDtBQVFaRSxFQUFBQSxPQUFPLEVBQUVGLENBQUMsQ0FBQyxZQUFELENBUkU7QUFVWkcsRUFBQUEsY0FBYyxFQUFFSCxDQUFDLENBQUMsc0JBQUQsQ0FWTDtBQVdaSSxFQUFBQSxZQUFZLEVBQUVKLENBQUMsQ0FBQyxlQUFELENBWEg7QUFZWkssRUFBQUEsZ0JBQWdCLEVBQUUsRUFaTjtBQWFaQyxFQUFBQSxnQkFBZ0IsRUFBRSxDQWJOOztBQWVaO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLElBQUksRUFBRTtBQUNGQyxNQUFBQSxVQUFVLEVBQUUsTUFEVjtBQUVGQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsT0FEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0M7QUFGNUIsT0FERztBQUZMLEtBREs7QUFVWEMsSUFBQUEsU0FBUyxFQUFFO0FBQ1BOLE1BQUFBLFVBQVUsRUFBRSxXQURMO0FBRVBDLE1BQUFBLEtBQUssRUFBRSxDQUNIO0FB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bEssRUFBQUEsT0FBTyxDQUFDNEIsVUFBUjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgaXZyQWN0aW9ucywgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBFeHRlbnNpb25zLCBTb3VuZEZpbGVzU2VsZWN0b3IgKi9cblxuXG5jb25zdCBpdnJNZW51ID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNpdnItbWVudS1mb3JtJyksXG5cbiAgICAkZHJvcERvd25zOiAkKCcjaXZyLW1lbnUtZm9ybSAudWkuZHJvcGRvd24nKSxcbiAgICAkbnVtYmVyOiAkKCcjZXh0ZW5zaW9uJyksXG5cbiAgICAkZXJyb3JNZXNzYWdlczogJCgnI2Zvcm0tZXJyb3ItbWVzc2FnZXMnKSxcbiAgICAkcm93VGVtcGxhdGU6ICQoJyNyb3ctdGVtcGxhdGUnKSxcbiAgICBkZWZhdWx0RXh0ZW5zaW9uOiAnJyxcbiAgICBhY3Rpb25zUm93c0NvdW50OiAwLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIG5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICduYW1lJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pdl9WYWxpZGF0ZU5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBleHRlbnNpb246IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdleHRlbnNpb24nLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLml2X1ZhbGlkYXRlRXh0ZW5zaW9uSXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4aXN0UnVsZScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLml2X1ZhbGlkYXRlRXh0ZW5zaW9uSXNEb3VibGUsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHRpbWVvdXRfZXh0ZW5zaW9uOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAndGltZW91dF9leHRlbnNpb24nLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLml2X1ZhbGlkYXRlVGltZW91dEV4dGVuc2lvbklzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGF1ZGlvX21lc3NhZ2VfaWQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdhdWRpb19tZXNzYWdlX2lkJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pdl9WYWxpZGF0ZUF1ZGlvRmlsZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHRpbWVvdXQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICd0aW1lb3V0JyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaW50ZWdlclswLi45OV0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pdl9WYWxpZGF0ZVRpbWVvdXRPdXRPZlJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBudW1iZXJfb2ZfcmVwZWF0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnbnVtYmVyX29mX3JlcGVhdCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ludGVnZXJbMC4uOTldJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuaXZfVmFsaWRhdGVSZXBlYXROdW1iZXJPdXRPZlJhbmdlLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3duc1xuICAgICAgICBpdnJNZW51LiRkcm9wRG93bnMuZHJvcGRvd24oKTtcblxuICAgICAgICAvLyBEeW5hbWljIGNoZWNrIHRvIHNlZSBpZiB0aGUgc2VsZWN0ZWQgbnVtYmVyIGlzIGF2YWlsYWJsZVxuICAgICAgICBpdnJNZW51LiRudW1iZXIub24oJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IG5ld051bWJlciA9IGl2ck1lbnUuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGVuc2lvbicpO1xuICAgICAgICAgICAgRXh0ZW5zaW9ucy5jaGVja0F2YWlsYWJpbGl0eShpdnJNZW51LmRlZmF1bHROdW1iZXIsIG5ld051bWJlcik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBldmVudCBsaXN0ZW5lciBmb3IgYWRkaW5nIGEgbmV3IElWUiBhY3Rpb24gcm93XG4gICAgICAgICQoJyNhZGQtbmV3LWl2ci1hY3Rpb24nKS5vbignY2xpY2snLCAoZWwpID0+IHtcbiAgICAgICAgICAgIGl2ck1lbnUuYWRkTmV3QWN0aW9uUm93KCk7XG4gICAgICAgICAgICBpdnJNZW51LnJlYnVpbGRBY3Rpb25FeHRlbnNpb25zRHJvcGRvd24oKTtcblxuICAgICAgICAgICAgLy8gVHJpZ2dlciBjaGFuZ2UgZXZlbnQgdG8gYWNrbm93bGVkZ2UgdGhlIG1vZGlmaWNhdGlvblxuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuXG4gICAgICAgICAgICBlbC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICB9KVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgYXVkaW8gbWVzc2FnZSBkcm9wZG93bnNcbiAgICAgICAgJCgnI2l2ci1tZW51LWZvcm0gLmF1ZGlvLW1lc3NhZ2Utc2VsZWN0JykuZHJvcGRvd24oU291bmRGaWxlc1NlbGVjdG9yLmdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkoKSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZm9ybVxuICAgICAgICBpdnJNZW51LmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gQnVpbGQgSVZSIG1lbnUgYWN0aW9uc1xuICAgICAgICBpdnJNZW51LmJ1aWxkSXZyTWVudUFjdGlvbnMoKTtcblxuICAgICAgICAvLyBHZXQgdGhlIGRlZmF1bHQgZXh0ZW5zaW9uIHZhbHVlXG4gICAgICAgIGl2ck1lbnUuZGVmYXVsdEV4dGVuc2lvbiA9IGl2ck1lbnUuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGVuc2lvbicpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwc1xuICAgICAgICBpdnJNZW51LmluaXRpYWxpemVUb29sdGlwcygpO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogQ3JlYXRlIGl2ciBtZW51IGl0ZW1zIG9uIHRoZSBmb3JtXG4gICAgICovXG4gICAgYnVpbGRJdnJNZW51QWN0aW9ucygpIHtcbiAgICAgICAgY29uc3Qgb2JqQWN0aW9ucyA9IEpTT04ucGFyc2UoaXZyQWN0aW9ucyk7XG4gICAgICAgIG9iakFjdGlvbnMuZm9yRWFjaCgoZWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgaXZyTWVudS5hZGROZXdBY3Rpb25Sb3coZWxlbWVudCk7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAob2JqQWN0aW9ucy5sZW5ndGggPT09IDApIGl2ck1lbnUuYWRkTmV3QWN0aW9uUm93KCk7XG5cbiAgICAgICAgaXZyTWVudS5yZWJ1aWxkQWN0aW9uRXh0ZW5zaW9uc0Ryb3Bkb3duKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZHMgbmV3IGZvcm0gdmFsaWRhdGlvbiBydWxlcyBmb3IgYSBuZXdseSBhZGRlZCBhY3Rpb24gcm93LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuZXdSb3dJZCAtIFRoZSBJRCBvZiB0aGUgbmV3bHkgYWRkZWQgYWN0aW9uIHJvdy5cbiAgICAgKi9cbiAgICBhZGROZXdGb3JtUnVsZXMobmV3Um93SWQpIHtcblxuICAgICAgICAvLyBDcmVhdGUgdGhlIGlkZW50aWZpZXIgZm9yIHRoZSBkaWdpdHMgZmllbGQgb2YgdGhlIG5ldyByb3dcbiAgICAgICAgY29uc3QgJGRpZ2l0c0NsYXNzID0gYGRpZ2l0cy0ke25ld1Jvd0lkfWA7XG5cbiAgICAgICAgLy8gRGVmaW5lIHRoZSB2YWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZGlnaXRzIGZpZWxkXG4gICAgICAgIGl2ck1lbnUudmFsaWRhdGVSdWxlc1skZGlnaXRzQ2xhc3NdID0ge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJGRpZ2l0c0NsYXNzLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHBbL15bMC05XXsxLDd9JC9dJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuaXZfVmFsaWRhdGVEaWdpdHNJc05vdENvcnJlY3QsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdjaGVja0RvdWJsZXNEaWdpdHMnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5pdl9WYWxpZGF0ZURpZ2l0c0lzTm90Q29ycmVjdCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcblxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIENyZWF0ZSB0aGUgaWRlbnRpZmllciBmb3IgdGhlIGV4dGVuc2lvbiBmaWVsZCBvZiB0aGUgbmV3IHJvd1xuICAgICAgICBjb25zdCAkZXh0ZW5zaW9uQ2xhc3MgPSBgZXh0ZW5zaW9uLSR7bmV3Um93SWR9YDtcblxuICAgICAgICAvLyBEZWZpbmUgdGhlIHZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBleHRlbnNpb24gZmllbGRcbiAgICAgICAgaXZyTWVudS52YWxpZGF0ZVJ1bGVzWyRleHRlbnNpb25DbGFzc10gPSB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAkZXh0ZW5zaW9uQ2xhc3MsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuaXZfVmFsaWRhdGVFeHRlbnNpb25Jc05vdENvcnJlY3QsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG5cbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkcyBhIG5ldyBhY3Rpb24gcm93IHRvIHRoZSBJVlIgbWVudSBmb3JtLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbU9iaiAtIE9wdGlvbmFsIHBhcmFtZXRlciBvYmplY3Qgd2l0aCBpbml0aWFsIHZhbHVlcyBmb3IgdGhlIGFjdGlvbiByb3cuXG4gICAgICogICAgICAgICAgICAgICAgICAgICAgICAgICAgSWYgbm90IHByb3ZpZGVkLCBkZWZhdWx0IHZhbHVlcyB3aWxsIGJlIHVzZWQuXG4gICAgICovXG4gICAgYWRkTmV3QWN0aW9uUm93KHBhcmFtT2JqKSB7XG4gICAgICAgIC8vIERlZmF1bHQgcGFyYW1ldGVyIHZhbHVlc1xuICAgICAgICBsZXQgcGFyYW0gPSB7XG4gICAgICAgICAgICBpZDogJycsXG4gICAgICAgICAgICBleHRlbnNpb246ICcnLFxuICAgICAgICAgICAgZXh0ZW5zaW9uUmVwcmVzZW50OiAnJyxcbiAgICAgICAgICAgIGRpZ2l0czogJycsXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gT3ZlcnJpZGUgZGVmYXVsdCB2YWx1ZXMgd2l0aCB0aGUgcHJvdmlkZWQgcGFyYW1ldGVyIG9iamVjdFxuICAgICAgICBpZiAocGFyYW1PYmogIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgcGFyYW0gPSBwYXJhbU9iajtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluY3JlbWVudCB0aGUgYWN0aW9uc1Jvd3NDb3VudFxuICAgICAgICBpdnJNZW51LmFjdGlvbnNSb3dzQ291bnQgKz0gMTtcblxuICAgICAgICAvLyBDbG9uZSB0aGUgcm93IHRlbXBsYXRlIGFuZCBtb2RpZnkgaXRzIGF0dHJpYnV0ZXMgYW5kIGNvbnRlbnRcbiAgICAgICAgY29uc3QgJGFjdGlvblRlbXBsYXRlID0gaXZyTWVudS4kcm93VGVtcGxhdGUuY2xvbmUoKTtcbiAgICAgICAgJGFjdGlvblRlbXBsYXRlXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpXG4gICAgICAgICAgICAuYXR0cignaWQnLCBgcm93LSR7aXZyTWVudS5hY3Rpb25zUm93c0NvdW50fWApXG4gICAgICAgICAgICAuYXR0cignZGF0YS12YWx1ZScsIGl2ck1lbnUuYWN0aW9uc1Jvd3NDb3VudClcbiAgICAgICAgICAgIC5hdHRyKCdzdHlsZScsICcnKTtcblxuICAgICAgICAvLyBTZXQgdGhlIGF0dHJpYnV0ZXMgYW5kIHZhbHVlcyBmb3IgZGlnaXRzIGlucHV0IGZpZWxkXG4gICAgICAgICRhY3Rpb25UZW1wbGF0ZS5maW5kKCdpbnB1dFtuYW1lPVwiZGlnaXRzLWlkXCJdJylcbiAgICAgICAgICAgIC5hdHRyKCdpZCcsIGBkaWdpdHMtJHtpdnJNZW51LmFjdGlvbnNSb3dzQ291bnR9YClcbiAgICAgICAgICAgIC5hdHRyKCduYW1lJywgYGRpZ2l0cy0ke2l2ck1lbnUuYWN0aW9uc1Jvd3NDb3VudH1gKVxuICAgICAgICAgICAgLmF0dHIoJ3ZhbHVlJywgcGFyYW0uZGlnaXRzKTtcblxuICAgICAgICAvLyBTZXQgdGhlIGF0dHJpYnV0ZXMgYW5kIHZhbHVlcyBmb3IgZXh0ZW5zaW9uIGlucHV0IGZpZWxkXG4gICAgICAgICRhY3Rpb25UZW1wbGF0ZS5maW5kKCdpbnB1dFtuYW1lPVwiZXh0ZW5zaW9uLWlkXCJdJylcbiAgICAgICAgICAgIC5hdHRyKCdpZCcsIGBleHRlbnNpb24tJHtpdnJNZW51LmFjdGlvbnNSb3dzQ291bnR9YClcbiAgICAgICAgICAgIC5hdHRyKCduYW1lJywgYGV4dGVuc2lvbi0ke2l2ck1lbnUuYWN0aW9uc1Jvd3NDb3VudH1gKVxuICAgICAgICAgICAgLmF0dHIoJ3ZhbHVlJywgcGFyYW0uZXh0ZW5zaW9uKTtcblxuICAgICAgICAvLyBTZXQgdGhlIGRhdGEtdmFsdWUgYXR0cmlidXRlIGZvciB0aGUgZGVsZXRlLWFjdGlvbi1yb3cgZWxlbWVudFxuICAgICAgICAkYWN0aW9uVGVtcGxhdGUuZmluZCgnZGl2LmRlbGV0ZS1hY3Rpb24tcm93JylcbiAgICAgICAgICAgIC5hdHRyKCdkYXRhLXZhbHVlJywgaXZyTWVudS5hY3Rpb25zUm93c0NvdW50KTtcblxuICAgICAgICAvLyBVcGRhdGUgdGhlIGV4dGVuc2lvblJlcHJlc2VudCBjb250ZW50IGJhc2VkIG9uIHRoZSBwcm92aWRlZCB2YWx1ZSBvciBkZWZhdWx0IHRleHRcbiAgICAgICAgaWYgKHBhcmFtLmV4dGVuc2lvblJlcHJlc2VudC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAkYWN0aW9uVGVtcGxhdGUuZmluZCgnZGl2LmRlZmF1bHQudGV4dCcpLnJlbW92ZUNsYXNzKCdkZWZhdWx0JykuaHRtbChwYXJhbS5leHRlbnNpb25SZXByZXNlbnQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJGFjdGlvblRlbXBsYXRlLmZpbmQoJ2Rpdi5kZWZhdWx0LnRleHQnKS5odG1sKGdsb2JhbFRyYW5zbGF0ZS5leF9TZWxlY3ROdW1iZXIpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQXBwZW5kIHRoZSBhY3Rpb24gdGVtcGxhdGUgdG8gdGhlIGFjdGlvbnMtcGxhY2UgZWxlbWVudFxuICAgICAgICAkKCcjYWN0aW9ucy1wbGFjZScpLmFwcGVuZCgkYWN0aW9uVGVtcGxhdGUpO1xuXG4gICAgICAgIC8vIEFkZCBuZXcgZm9ybSBydWxlcyBmb3IgdGhlIG5ld2x5IGFkZGVkIGFjdGlvbiByb3dcbiAgICAgICAgaXZyTWVudS5hZGROZXdGb3JtUnVsZXMoaXZyTWVudS5hY3Rpb25zUm93c0NvdW50KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVidWlsZHMgdGhlIGFjdGlvbiBleHRlbnNpb25zIGRyb3Bkb3duIGJ5IGluaXRpYWxpemluZyB0aGUgZHJvcGRvd24gc2V0dGluZ3MgZm9yIHJvdXRpbmdcbiAgICAgKiBhbmQgYXR0YWNoaW5nIHRoZSBjYk9uRXh0ZW5zaW9uU2VsZWN0IGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgZXh0ZW5zaW9uIHNlbGVjdGlvbiBldmVudC5cbiAgICAgKi9cbiAgICByZWJ1aWxkQWN0aW9uRXh0ZW5zaW9uc0Ryb3Bkb3duKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBkcm9wZG93biBzZXR0aW5ncyBmb3Igcm91dGluZyB3aXRoIGNiT25FeHRlbnNpb25TZWxlY3QgY2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgICAgJCgnI2l2ci1tZW51LWZvcm0gLmZvcndhcmRpbmctc2VsZWN0JykuZHJvcGRvd24oRXh0ZW5zaW9ucy5nZXREcm9wZG93blNldHRpbmdzRm9yUm91dGluZyhpdnJNZW51LmNiT25FeHRlbnNpb25TZWxlY3QpKTtcblxuICAgICAgICAvLyBBdHRhY2ggYSBjbGljayBldmVudCBoYW5kbGVyIHRvIHRoZSBkZWxldGUtYWN0aW9uLXJvdyBlbGVtZW50c1xuICAgICAgICAkKCcuZGVsZXRlLWFjdGlvbi1yb3cnKS5vbignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICAvLyBHZXQgdGhlICdkYXRhLXZhbHVlJyBhdHRyaWJ1dGUgb2YgdGhlIGNsaWNrZWQgZWxlbWVudFxuICAgICAgICAgICAgY29uc3QgaWQgPSAkKHRoaXMpLmF0dHIoJ2RhdGEtdmFsdWUnKTtcblxuICAgICAgICAgICAgLy8gUmVtb3ZlIHRoZSBjb3JyZXNwb25kaW5nIHJ1bGVzIGZyb20gdmFsaWRhdGVSdWxlcyBvYmplY3RcbiAgICAgICAgICAgIGRlbGV0ZSBpdnJNZW51LnZhbGlkYXRlUnVsZXNbYGRpZ2l0cy0ke2lkfWBdO1xuICAgICAgICAgICAgZGVsZXRlIGl2ck1lbnUudmFsaWRhdGVSdWxlc1tgZXh0ZW5zaW9uLSR7aWR9YF07XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSB0aGUgcm93IHdpdGggdGhlIGNvcnJlc3BvbmRpbmcgaWRcbiAgICAgICAgICAgICQoYCNyb3ctJHtpZH1gKS5yZW1vdmUoKTtcblxuICAgICAgICAgICAgLy8gVHJpZ2dlciBjaGFuZ2UgZXZlbnQgdG8gYWNrbm93bGVkZ2UgdGhlIG1vZGlmaWNhdGlvblxuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICAvLyBDb3B5IHRoZSBzZXR0aW5ncyBvYmplY3QgdG8gYSBuZXcgdmFyaWFibGUgdG8gYXZvaWQgbW9kaWZ5aW5nIHRoZSBvcmlnaW5hbFxuICAgICAgICBsZXQgcmVzdWx0ID0gc2V0dGluZ3M7XG5cbiAgICAgICAgLy8gR2V0IHRoZSBmb3JtIHZhbHVlcyBmcm9tICRmb3JtT2JqIG9mIGl2ck1lbnVcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBpdnJNZW51LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGFuIGFycmF5IHRvIHN0b3JlIGFjdGlvbnNcbiAgICAgICAgY29uc3QgYXJyQWN0aW9ucyA9IFtdO1xuXG4gICAgICAgIC8vIEl0ZXJhdGUgb3ZlciBlYWNoIGFjdGlvbiByb3dcbiAgICAgICAgJCgnLmFjdGlvbi1yb3cnKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgICAgICBjb25zdCByb3dJZCA9ICQob2JqKS5hdHRyKCdkYXRhLXZhbHVlJyk7XG5cbiAgICAgICAgICAgIC8vIElmIHJvd0lkIGlzIGdyZWF0ZXIgdGhhbiAwLCBnZXQgdGhlICdkaWdpdHMnIGFuZCAnZXh0ZW5zaW9uJyB2YWx1ZXMgZnJvbSB0aGUgZm9ybSBhbmQgcHVzaCB0aGVtIGludG8gdGhlIGFyckFjdGlvbnMgYXJyYXlcbiAgICAgICAgICAgIGlmIChyb3dJZCA+IDApIHtcbiAgICAgICAgICAgICAgICBhcnJBY3Rpb25zLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBkaWdpdHM6IGl2ck1lbnUuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgYGRpZ2l0cy0ke3Jvd0lkfWApLFxuICAgICAgICAgICAgICAgICAgICBleHRlbnNpb246IGl2ck1lbnUuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgYGV4dGVuc2lvbi0ke3Jvd0lkfWApLFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJZiB0aGVyZSBhcmUgbm8gYWN0aW9uIHJvd3MsIHNldCB0aGUgcmVzdWx0IHRvIGZhbHNlLCBkaXNwbGF5IGFuIGVycm9yIG1lc3NhZ2UgYW5kIGFkZCBlcnJvciBjbGFzcyB0byB0aGUgZm9ybVxuICAgICAgICBpZiAoYXJyQWN0aW9ucy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgaXZyTWVudS4kZXJyb3JNZXNzYWdlcy5odG1sKGdsb2JhbFRyYW5zbGF0ZS5pdl9WYWxpZGF0ZU5vSVZSRXh0ZW5zaW9ucyk7XG4gICAgICAgICAgICBpdnJNZW51LiRmb3JtT2JqLmFkZENsYXNzKCdlcnJvcicpO1xuICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICAvLyBDb252ZXJ0IHRoZSBhcnJBY3Rpb25zIGFycmF5IGludG8gYSBKU09OIHN0cmluZyBhbmQgYXNzaWduIGl0IHRvICdhY3Rpb25zJyBrZXkgaW4gdGhlIHJlc3VsdCBkYXRhIG9iamVjdFxuICAgICAgICAgICAgcmVzdWx0LmRhdGEuYWN0aW9ucyA9IEpTT04uc3RyaW5naWZ5KGFyckFjdGlvbnMpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmV0dXJuIHRoZSBtb2RpZmllZCBzZXR0aW5ncyBvYmplY3Qgb3IgZmFsc2VcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgdHJpZ2dlcnMgd2hlbiBhIG51bWJlciBpcyBzZWxlY3RlZCBmcm9tIHRoZSBkcm9wZG93biBtZW51LlxuICAgICAqIEl0IGdlbmVyYXRlcyBhIHJhbmRvbSBudW1iZXIgYW5kIHRyaWdnZXJzIGEgY2hhbmdlIGV2ZW50LlxuICAgICAqL1xuICAgIGNiT25FeHRlbnNpb25TZWxlY3QoKSB7XG4gICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50IHRvIGFja25vd2xlZGdlIHRoZSBtb2RpZmljYXRpb25cbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBpdnJNZW51LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9aXZyLW1lbnUvc2F2ZWA7IC8vIEZvcm0gc3VibWlzc2lvbiBVUkxcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gaXZyTWVudS52YWxpZGF0ZVJ1bGVzOyAvLyBGb3JtIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gaXZyTWVudS5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gaXZyTWVudS5jYkFmdGVyU2VuZEZvcm07IC8vIENhbGxiYWNrIGFmdGVyIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRvb2x0aXBzKCkge1xuICAgICAgICAvLyBEZWZpbmUgdG9vbHRpcCBjb25maWd1cmF0aW9ucyBmb3IgZWFjaCBmaWVsZFxuICAgICAgICBjb25zdCB0b29sdGlwQ29uZmlncyA9IHtcbiAgICAgICAgICAgIG51bWJlcl9vZl9yZXBlYXQ6IGl2ck1lbnUuYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaXZfTnVtYmVyT2ZSZXBlYXRUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLml2X051bWJlck9mUmVwZWF0VG9vbHRpcF9kZXNjLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5pdl9OdW1iZXJPZlJlcGVhdFRvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRpbWVvdXQ6IGl2ck1lbnUuYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaXZfVGltZW91dFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaXZfVGltZW91dFRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pdl9UaW1lb3V0VG9vbHRpcF9saXN0MSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLml2X1RpbWVvdXRUb29sdGlwX2xpc3QyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXZfVGltZW91dFRvb2x0aXBfbGlzdDNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5pdl9UaW1lb3V0VG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGltZW91dF9leHRlbnNpb246IGl2ck1lbnUuYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuaXZfVGltZW91dEV4dGVuc2lvblRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuaXZfVGltZW91dEV4dGVuc2lvblRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pdl9UaW1lb3V0RXh0ZW5zaW9uVG9vbHRpcF9saXN0MSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLml2X1RpbWVvdXRFeHRlbnNpb25Ub29sdGlwX2xpc3QyLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXZfVGltZW91dEV4dGVuc2lvblRvb2x0aXBfbGlzdDNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5pdl9UaW1lb3V0RXh0ZW5zaW9uVG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgYWxsb3dfZW50ZXJfYW55X2ludGVybmFsX2V4dGVuc2lvbjogaXZyTWVudS5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5pdl9BbGxvd0VudGVyQW55SW50ZXJuYWxFeHRlbnNpb25Ub29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLml2X0FsbG93RW50ZXJBbnlJbnRlcm5hbEV4dGVuc2lvblRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5pdl9BbGxvd0VudGVyQW55SW50ZXJuYWxFeHRlbnNpb25Ub29sdGlwX2xpc3RfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXZfQWxsb3dFbnRlckFueUludGVybmFsRXh0ZW5zaW9uVG9vbHRpcF9saXN0MSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLml2X0FsbG93RW50ZXJBbnlJbnRlcm5hbEV4dGVuc2lvblRvb2x0aXBfbGlzdDIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5pdl9BbGxvd0VudGVyQW55SW50ZXJuYWxFeHRlbnNpb25Ub29sdGlwX2xpc3QzLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuaXZfQWxsb3dFbnRlckFueUludGVybmFsRXh0ZW5zaW9uVG9vbHRpcF9saXN0NFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLml2X0FsbG93RW50ZXJBbnlJbnRlcm5hbEV4dGVuc2lvblRvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGV4dGVuc2lvbjogaXZyTWVudS5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5pdl9FeHRlbnNpb25Ub29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLml2X0V4dGVuc2lvblRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuaXZfRXh0ZW5zaW9uVG9vbHRpcF9ub3RlXG4gICAgICAgICAgICB9KVxuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBwb3B1cCBmb3IgZWFjaCBpY29uXG4gICAgICAgICQoJy5maWVsZC1pbmZvLWljb24nKS5lYWNoKChpbmRleCwgZWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGljb24gPSAkKGVsZW1lbnQpO1xuICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0gJGljb24uZGF0YSgnZmllbGQnKTtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSB0b29sdGlwQ29uZmlnc1tmaWVsZE5hbWVdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoY29udGVudCkge1xuICAgICAgICAgICAgICAgICRpY29uLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbDogY29udGVudCxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnLFxuICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRlbGF5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaG93OiAzMDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBoaWRlOiAxMDBcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgdmFyaWF0aW9uOiAnZmxvd2luZydcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXAgcG9wdXBcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIC0gVGhlIGNvbmZpZ3VyYXRpb24gb2JqZWN0IGZvciB0aGUgdG9vbHRpcFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IC0gVGhlIEhUTUwgY29udGVudCBmb3IgdGhlIHRvb2x0aXBcbiAgICAgKi9cbiAgICBidWlsZFRvb2x0aXBDb250ZW50KGNvbmZpZykge1xuICAgICAgICBpZiAoIWNvbmZpZykgcmV0dXJuICcnO1xuICAgICAgICBcbiAgICAgICAgbGV0IGh0bWwgPSAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBoZWFkZXIgaWYgZXhpc3RzXG4gICAgICAgIGlmIChjb25maWcuaGVhZGVyKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+PHN0cm9uZz4ke2NvbmZpZy5oZWFkZXJ9PC9zdHJvbmc+PC9kaXY+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGRlc2NyaXB0aW9uIGlmIGV4aXN0c1xuICAgICAgICBpZiAoY29uZmlnLmRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8cD4ke2NvbmZpZy5kZXNjcmlwdGlvbn08L3A+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGxpc3QgaXRlbXMgaWYgZXhpc3RcbiAgICAgICAgaWYgKGNvbmZpZy5saXN0KSB7XG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShjb25maWcubGlzdCkgJiYgY29uZmlnLmxpc3QubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzx1bD4nO1xuICAgICAgICAgICAgICAgIGNvbmZpZy5saXN0LmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT4ke2l0ZW19PC9saT5gO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0udGVybSAmJiBpdGVtLmRlZmluaXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEhlYWRlciBpdGVtIHdpdGhvdXQgZGVmaW5pdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPC91bD48cD48c3Ryb25nPiR7aXRlbS50ZXJtfTwvc3Ryb25nPjwvcD48dWw+YDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpdGVtLnRlcm0gJiYgaXRlbS5kZWZpbml0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+PHN0cm9uZz4ke2l0ZW0udGVybX06PC9zdHJvbmc+ICR7aXRlbS5kZWZpbml0aW9ufTwvbGk+YDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzwvdWw+JztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGNvbmZpZy5saXN0ID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBrZXktdmFsdWUgcGFpcnMgZm9yIGxpc3RcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8ZGw+JztcbiAgICAgICAgICAgICAgICBPYmplY3QuZW50cmllcyhjb25maWcubGlzdCkuZm9yRWFjaCgoW2tleSwgdmFsdWVdKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkdD48c3Ryb25nPiR7a2V5fTo8L3N0cm9uZz48L2R0PmA7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkZD4ke3ZhbHVlfTwvZGQ+YDtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8L2RsPic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBhZGRpdGlvbmFsIGxpc3RzIChsaXN0Mi1saXN0MTApIGlmIGV4aXN0XG4gICAgICAgIGZvciAobGV0IGkgPSAyOyBpIDw9IDEwOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGxpc3RLZXkgPSBgbGlzdCR7aX1gO1xuICAgICAgICAgICAgaWYgKGNvbmZpZ1tsaXN0S2V5XSAmJiBBcnJheS5pc0FycmF5KGNvbmZpZ1tsaXN0S2V5XSkgJiYgY29uZmlnW2xpc3RLZXldLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8dWw+JztcbiAgICAgICAgICAgICAgICBjb25maWdbbGlzdEtleV0uZm9yRWFjaChpdGVtID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGxpPiR7aXRlbX08L2xpPmA7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPC91bD4nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgd2FybmluZyBpZiBleGlzdHNcbiAgICAgICAgaWYgKGNvbmZpZy53YXJuaW5nKSB7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgc21hbGwgb3JhbmdlIG1lc3NhZ2VcIj4nO1xuICAgICAgICAgICAgaWYgKGNvbmZpZy53YXJuaW5nLmhlYWRlcikge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2NvbmZpZy53YXJuaW5nLmhlYWRlcn08L2Rpdj5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaHRtbCArPSBgPHA+JHtjb25maWcud2FybmluZy50ZXh0fTwvcD5gO1xuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGV4YW1wbGVzIGlmIGV4aXN0XG4gICAgICAgIGlmIChjb25maWcuZXhhbXBsZXMgJiYgQXJyYXkuaXNBcnJheShjb25maWcuZXhhbXBsZXMpICYmIGNvbmZpZy5leGFtcGxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpZiAoY29uZmlnLmV4YW1wbGVzSGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPHA+PHN0cm9uZz4ke2NvbmZpZy5leGFtcGxlc0hlYWRlcn06PC9zdHJvbmc+PC9wPmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9ICc8cHJlIHN0eWxlPVwiYmFja2dyb3VuZC1jb2xvcjogI2Y0ZjRmNDsgcGFkZGluZzogNXB4OyBib3JkZXItcmFkaXVzOiAzcHg7XCI+JztcbiAgICAgICAgICAgIGh0bWwgKz0gY29uZmlnLmV4YW1wbGVzLmpvaW4oJ1xcbicpO1xuICAgICAgICAgICAgaHRtbCArPSAnPC9wcmU+JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIG5vdGUgaWYgZXhpc3RzXG4gICAgICAgIGlmIChjb25maWcubm90ZSkge1xuICAgICAgICAgICAgaHRtbCArPSBgPHA+PGVtPiR7Y29uZmlnLm5vdGV9PC9lbT48L3A+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfVxufTtcblxuLyoqXG4gKiBDdXN0b20gZm9ybSBydWxlIHRvIGNoZWNrIGlmIGFuIGVsZW1lbnQgd2l0aCBpZCAnZXh0ZW5zaW9uLWVycm9yJyBoYXMgdGhlIGNsYXNzICdoaWRkZW4nLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXhpc3RSdWxlID0gKCkgPT4gJCgnI2V4dGVuc2lvbi1lcnJvcicpLmhhc0NsYXNzKCdoaWRkZW4nKTtcblxuXG4vKipcbiAqIEN1c3RvbSBmb3JtIHJ1bGUgdG8gY2hlY2sgZm9yIGR1cGxpY2F0ZSBkaWdpdHMgdmFsdWVzLlxuICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHZhbHVlIHRvIGNoZWNrIGZvciBkdXBsaWNhdGVzLlxuICogQHJldHVybnMge2Jvb2xlYW59IC0gVHJ1ZSBpZiB0aGVyZSBhcmUgbm8gZHVwbGljYXRlcywgZmFsc2Ugb3RoZXJ3aXNlLlxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuY2hlY2tEb3VibGVzRGlnaXRzID0gKHZhbHVlKSA9PiB7XG4gICAgbGV0IGNvdW50ID0gMDtcbiAgICAkKFwiaW5wdXRbaWRePSdkaWdpdHMnXVwiKS5lYWNoKChpbmRleCwgb2JqKSA9PiB7XG4gICAgICAgIGlmIChpdnJNZW51LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsIGAke29iai5pZH1gKSA9PT0gdmFsdWUpIGNvdW50ICs9IDE7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gKGNvdW50ID09PSAxKTtcbn07XG5cbi8qKlxuICogIEluaXRpYWxpemUgSVZSIG1lbnUgbW9kaWZ5IGZvcm0gb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGl2ck1lbnUuaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==