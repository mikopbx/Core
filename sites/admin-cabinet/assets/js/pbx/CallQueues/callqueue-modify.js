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

/* global globalRootUrl, globalTranslate, Extensions,Form, SoundFilesSelector */

/**
 * callQueue module.
 * @module callQueue
 */
var callQueue = {
  // Default extension number
  defaultExtension: '',
  // The input field for the extension number
  $extension: $('#extension'),
  // List of available members for this call queue
  AvailableMembersList: [],

  /**
   * jQuery object for the form.
   * @type {jQuery}
   */
  $formObj: $('#queue-form'),
  // The accordion UI components in the form
  $accordions: $('#queue-form .ui.accordion'),
  // The dropdown UI components in the form
  $dropDowns: $('#queue-form .dropdown'),
  // The field for form error messages
  $errorMessages: $('#form-error-messages'),
  // The checkbox UI components in the form
  $checkBoxes: $('#queue-form .checkbox'),
  // The select for forwarding in the form
  forwardingSelect: '#queue-form .forwarding-select',
  // The button to delete a row
  $deleteRowButton: $('.delete-row-button'),
  // The dropdown for periodic announce sound selection
  $periodicAnnounceDropdown: $('#queue-form .periodic-announce-sound-id-select'),
  // The row of the member
  memberRow: '#queue-form .member-row',
  // The dropdown for extension selection
  $extensionSelectDropdown: $('#extensionselect'),
  // The table of extensions
  $extensionsTable: $('#extensionsTable'),

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
        prompt: globalTranslate.cq_ValidateNameEmpty
      }]
    },
    extension: {
      identifier: 'extension',
      rules: [{
        type: 'number',
        prompt: globalTranslate.cq_ValidateExtensionNumber
      }, {
        type: 'empty',
        prompt: globalTranslate.cq_ValidateExtensionEmpty
      }, {
        type: 'existRule[extension-error]',
        prompt: globalTranslate.cq_ValidateExtensionDouble
      }]
    }
  },

  /**
   * Initialize the call queue form
   */
  initialize: function initialize() {
    // Get phone extensions and set available queue members
    Extensions.getPhoneExtensions(callQueue.setAvailableQueueMembers); // Initialize UI components

    callQueue.$accordions.accordion();
    callQueue.$dropDowns.dropdown();
    callQueue.$checkBoxes.checkbox(); // Set up periodic announce dropdown behaviour

    callQueue.$periodicAnnounceDropdown.dropdown({
      onChange: function onChange(value) {
        if (parseInt(value, 10) === -1) {
          callQueue.$periodicAnnounceDropdown.dropdown('clear');
        }
      }
    }); // Initialize forwarding select

    $(callQueue.forwardingSelect).dropdown(Extensions.getDropdownSettingsWithEmpty()); // Set up dynamic availability check for extension number

    callQueue.$extension.on('change', function () {
      var newNumber = callQueue.$formObj.form('get value', 'extension');
      Extensions.checkAvailability(callQueue.defaultNumber, newNumber);
    }); // Initialize drag and drop for extension table rows

    callQueue.initializeDragAndDropExtensionTableRows(); // Set up row deletion from queue members table

    callQueue.$deleteRowButton.on('click', function (e) {
      e.preventDefault();
      $(e.target).closest('tr').remove();
      callQueue.reinitializeExtensionSelect();
      callQueue.updateExtensionTableView();
      Form.dataChanged();
      return false;
    }); // Initialize audio message select

    $('#queue-form .audio-message-select').dropdown(SoundFilesSelector.getDropdownSettingsWithEmpty()); // Initialize the form

    callQueue.initializeForm(); // Initialize tooltips for advanced settings

    callQueue.initializeTooltips(); // Set the default extension number

    callQueue.defaultExtension = callQueue.$formObj.form('get value', 'extension');
  },

  /**
   * Set available members for the call queue
   * @param {Object} arrResult - The list of available members
   */
  setAvailableQueueMembers: function setAvailableQueueMembers(arrResult) {
    // Loop through the result and populate AvailableMembersList
    $.each(arrResult.results, function (index, extension) {
      callQueue.AvailableMembersList.push({
        number: extension.value,
        callerid: extension.name
      });
    }); // Reinitialize the extension select and update the view

    callQueue.reinitializeExtensionSelect();
    callQueue.updateExtensionTableView();
  },

  /**
   * Return the list of available members for the queue
   * @returns {Array} - The list of available members
   */
  getAvailableQueueMembers: function getAvailableQueueMembers() {
    var result = []; // Loop through available members and add to result if not already selected

    callQueue.AvailableMembersList.forEach(function (member) {
      if ($(".member-row#".concat(member.number)).length === 0) {
        result.push({
          name: member.callerid,
          value: member.number
        });
      }
    }); // result.sort((a, b) => ((a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0)));

    return result;
  },

  /**
   * Reinitialize extension select with consideration for already selected members
   */
  reinitializeExtensionSelect: function reinitializeExtensionSelect() {
    // Setup dropdown with available queue members
    callQueue.$extensionSelectDropdown.dropdown({
      action: 'hide',
      forceSelection: false,
      onChange: function onChange(value, text) {
        // If a value is selected
        if (value) {
          // Get the last template row, clone it and populate with the selected member data
          var $tr = $('.member-row-tpl').last();
          var $clone = $tr.clone(true);
          $clone.removeClass('member-row-tpl').addClass('member-row').show();
          $clone.attr('id', value);
          $clone.find('.number').html(value);
          $clone.find('.callerid').html(text); // Insert the new member row into the table

          if ($(callQueue.memberRow).last().length === 0) {
            $tr.after($clone);
          } else {
            $(callQueue.memberRow).last().after($clone);
          } // Reinitialize the extension select and update the view


          callQueue.reinitializeExtensionSelect();
          callQueue.updateExtensionTableView();
          Form.dataChanged();
        }
      },
      // Set the values for the dropdown
      values: callQueue.getAvailableQueueMembers()
    });
  },

  /**
   * Initialize Drag and Drop functionality for the extension table rows
   */
  initializeDragAndDropExtensionTableRows: function initializeDragAndDropExtensionTableRows() {
    callQueue.$extensionsTable.tableDnD({
      onDragClass: 'hoveringRow',
      // CSS class to be applied while a row is being dragged
      dragHandle: '.dragHandle',
      // Class of the handler to initiate the drag action
      onDrop: function onDrop() {
        // Callback to be executed after a row has been dropped
        // Trigger change event to acknowledge the modification
        Form.dataChanged();
      }
    });
  },

  /**
   * Display a placeholder if the table has zero rows
   */
  updateExtensionTableView: function updateExtensionTableView() {
    // Placeholder to be displayed
    var dummy = "<tr class=\"dummy\"><td colspan=\"4\" class=\"center aligned\">".concat(globalTranslate.cq_AddQueueMembers, "</td></tr>");

    if ($(callQueue.memberRow).length === 0) {
      $('#extensionsTable tbody').append(dummy); // Add the placeholder if there are no rows
    } else {
      $('#extensionsTable tbody .dummy').remove(); // Remove the placeholder if rows are present
    }
  },

  /**
   * Callback function to be called before the form is sent
   * @param {Object} settings - The current settings of the form
   * @returns {Object} - The updated settings of the form
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    var result = settings; // Retrieve form values

    result.data = callQueue.$formObj.form('get values');
    var arrMembers = []; // Iterate through each member row and add to arrMembers

    $(callQueue.memberRow).each(function (index, obj) {
      if ($(obj).attr('id')) {
        arrMembers.push({
          number: $(obj).attr('id'),
          priority: index
        });
      }
    }); // Validate if any members exist

    if (arrMembers.length === 0) {
      result = false;
      callQueue.$errorMessages.html(globalTranslate.cq_ValidateNoExtensions);
      callQueue.$formObj.addClass('error');
    } else {
      result.data.members = JSON.stringify(arrMembers);
    }

    return result;
  },

  /**
   * Callback function to be called after the form has been sent.
   * @param {Object} response - The response from the server after the form is sent
   */
  cbAfterSendForm: function cbAfterSendForm(response) {
    callQueue.defaultNumber = callQueue.$formObj.form('get value', 'extension');
  },

  /**
   * Build HTML content for tooltip popup
   * @param {Object} config - Configuration object for tooltip content
   * @returns {string} - HTML string for tooltip content
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
        // Old format - object with key-value pairs
        html += '<ul>';
        Object.entries(config.list).forEach(function (_ref) {
          var _ref2 = _slicedToArray(_ref, 2),
              term = _ref2[0],
              definition = _ref2[1];

          html += "<li><strong>".concat(term, ":</strong> ").concat(definition, "</li>");
        });
        html += '</ul>';
      }
    } // Add additional lists (list2, list3, etc.)


    for (var i = 2; i <= 10; i++) {
      var listName = "list".concat(i);

      if (config[listName] && config[listName].length > 0) {
        html += '<ul>';
        config[listName].forEach(function (item) {
          if (typeof item === 'string') {
            html += "<li>".concat(item, "</li>");
          } else if (item.term && item.definition === null) {
            html += "</ul><p><strong>".concat(item.term, "</strong></p><ul>");
          } else if (item.term && item.definition) {
            html += "<li><strong>".concat(item.term, ":</strong> ").concat(item.definition, "</li>");
          }
        });
        html += '</ul>';
      }
    } // Add warning if exists


    if (config.warning) {
      html += '<div class="ui small orange message">';

      if (config.warning.header) {
        html += "<div class=\"header\">";
        html += "<i class=\"exclamation triangle icon\"></i> ";
        html += config.warning.header;
        html += "</div>";
      }

      html += config.warning.text;
      html += '</div>';
    } // Add code examples if exist


    if (config.examples && config.examples.length > 0) {
      if (config.examplesHeader) {
        html += "<p><strong>".concat(config.examplesHeader, ":</strong></p>");
      }

      html += '<div class="ui segment" style="background-color: #f8f8f8; border: 1px solid #e0e0e0;">';
      html += '<pre style="margin: 0; font-size: 0.9em; line-height: 1.4em;">'; // Process examples with syntax highlighting for sections

      config.examples.forEach(function (line, index) {
        if (line.trim().startsWith('[') && line.trim().endsWith(']')) {
          // Section header
          if (index > 0) html += '\n';
          html += "<span style=\"color: #0084b4; font-weight: bold;\">".concat(line, "</span>");
        } else if (line.includes('=')) {
          // Parameter line
          var _line$split = line.split('=', 2),
              _line$split2 = _slicedToArray(_line$split, 2),
              param = _line$split2[0],
              value = _line$split2[1];

          html += "\n<span style=\"color: #7a3e9d;\">".concat(param, "</span>=<span style=\"color: #cf4a4c;\">").concat(value, "</span>");
        } else {
          // Regular line
          html += line ? "\n".concat(line) : '';
        }
      });
      html += '</pre>';
      html += '</div>';
    } // Add note if exists


    if (config.note) {
      html += "<p class=\"ui small\"><i class=\"info circle icon\"></i> ".concat(config.note, "</p>");
    }

    return html;
  },

  /**
   * Initialize tooltips for form fields
   */
  initializeTooltips: function initializeTooltips() {
    // Define tooltip configurations for each field
    var tooltipConfigs = {
      callerid_prefix: callQueue.buildTooltipContent({
        header: globalTranslate.cq_CallerIDPrefixTooltip_header,
        description: globalTranslate.cq_CallerIDPrefixTooltip_desc,
        list: [{
          term: globalTranslate.cq_CallerIDPrefixTooltip_how_it_works,
          definition: null
        }, globalTranslate.cq_CallerIDPrefixTooltip_example, {
          term: globalTranslate.cq_CallerIDPrefixTooltip_purposes,
          definition: null
        }, globalTranslate.cq_CallerIDPrefixTooltip_purpose_identify, globalTranslate.cq_CallerIDPrefixTooltip_purpose_priority, globalTranslate.cq_CallerIDPrefixTooltip_purpose_stats],
        examplesHeader: globalTranslate.cq_CallerIDPrefixTooltip_examples_header,
        examples: globalTranslate.cq_CallerIDPrefixTooltip_examples ? globalTranslate.cq_CallerIDPrefixTooltip_examples.split('|') : [],
        note: globalTranslate.cq_CallerIDPrefixTooltip_note
      }),
      seconds_to_ring_each_member: callQueue.buildTooltipContent({
        header: globalTranslate.cq_SecondsToRingEachMemberTooltip_header,
        description: globalTranslate.cq_SecondsToRingEachMemberTooltip_desc,
        list: [{
          term: globalTranslate.cq_SecondsToRingEachMemberTooltip_strategies_header,
          definition: null
        }, {
          term: globalTranslate.cq_SecondsToRingEachMemberTooltip_ringall,
          definition: globalTranslate.cq_SecondsToRingEachMemberTooltip_ringall_desc
        }, {
          term: globalTranslate.cq_SecondsToRingEachMemberTooltip_linear,
          definition: globalTranslate.cq_SecondsToRingEachMemberTooltip_linear_desc
        }, {
          term: globalTranslate.cq_SecondsToRingEachMemberTooltip_recommendations_header,
          definition: null
        }, globalTranslate.cq_SecondsToRingEachMemberTooltip_rec_short, globalTranslate.cq_SecondsToRingEachMemberTooltip_rec_medium, globalTranslate.cq_SecondsToRingEachMemberTooltip_rec_long],
        note: globalTranslate.cq_SecondsToRingEachMemberTooltip_note
      }),
      seconds_for_wrapup: callQueue.buildTooltipContent({
        header: globalTranslate.cq_SecondsForWrapupTooltip_header,
        description: globalTranslate.cq_SecondsForWrapupTooltip_desc,
        list: [{
          term: globalTranslate.cq_SecondsForWrapupTooltip_purposes_header,
          definition: null
        }, globalTranslate.cq_SecondsForWrapupTooltip_purpose_notes, globalTranslate.cq_SecondsForWrapupTooltip_purpose_crm, globalTranslate.cq_SecondsForWrapupTooltip_purpose_prepare, globalTranslate.cq_SecondsForWrapupTooltip_purpose_break, {
          term: globalTranslate.cq_SecondsForWrapupTooltip_recommendations_header,
          definition: null
        }, globalTranslate.cq_SecondsForWrapupTooltip_rec_none, globalTranslate.cq_SecondsForWrapupTooltip_rec_short, globalTranslate.cq_SecondsForWrapupTooltip_rec_medium, globalTranslate.cq_SecondsForWrapupTooltip_rec_long],
        note: globalTranslate.cq_SecondsForWrapupTooltip_note
      })
    }; // Initialize tooltip for each field info icon

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
   * Initialize the form with custom settings
   */
  initializeForm: function initializeForm() {
    Form.$formObj = callQueue.$formObj;
    Form.url = "".concat(globalRootUrl, "call-queues/save"); // Form submission URL

    Form.validateRules = callQueue.validateRules; // Form validation rules

    Form.cbBeforeSendForm = callQueue.cbBeforeSendForm; // Callback before form is sent

    Form.cbAfterSendForm = callQueue.cbAfterSendForm; // Callback after form is sent

    Form.initialize();
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
 *  Initialize Call Queues modify form on document ready
 */


$(document).ready(function () {
  callQueue.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DYWxsUXVldWVzL2NhbGxxdWV1ZS1tb2RpZnkuanMiXSwibmFtZXMiOlsiY2FsbFF1ZXVlIiwiZGVmYXVsdEV4dGVuc2lvbiIsIiRleHRlbnNpb24iLCIkIiwiQXZhaWxhYmxlTWVtYmVyc0xpc3QiLCIkZm9ybU9iaiIsIiRhY2NvcmRpb25zIiwiJGRyb3BEb3ducyIsIiRlcnJvck1lc3NhZ2VzIiwiJGNoZWNrQm94ZXMiLCJmb3J3YXJkaW5nU2VsZWN0IiwiJGRlbGV0ZVJvd0J1dHRvbiIsIiRwZXJpb2RpY0Fubm91bmNlRHJvcGRvd24iLCJtZW1iZXJSb3ciLCIkZXh0ZW5zaW9uU2VsZWN0RHJvcGRvd24iLCIkZXh0ZW5zaW9uc1RhYmxlIiwidmFsaWRhdGVSdWxlcyIsIm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiY3FfVmFsaWRhdGVOYW1lRW1wdHkiLCJleHRlbnNpb24iLCJjcV9WYWxpZGF0ZUV4dGVuc2lvbk51bWJlciIsImNxX1ZhbGlkYXRlRXh0ZW5zaW9uRW1wdHkiLCJjcV9WYWxpZGF0ZUV4dGVuc2lvbkRvdWJsZSIsImluaXRpYWxpemUiLCJFeHRlbnNpb25zIiwiZ2V0UGhvbmVFeHRlbnNpb25zIiwic2V0QXZhaWxhYmxlUXVldWVNZW1iZXJzIiwiYWNjb3JkaW9uIiwiZHJvcGRvd24iLCJjaGVja2JveCIsIm9uQ2hhbmdlIiwidmFsdWUiLCJwYXJzZUludCIsImdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkiLCJvbiIsIm5ld051bWJlciIsImZvcm0iLCJjaGVja0F2YWlsYWJpbGl0eSIsImRlZmF1bHROdW1iZXIiLCJpbml0aWFsaXplRHJhZ0FuZERyb3BFeHRlbnNpb25UYWJsZVJvd3MiLCJlIiwicHJldmVudERlZmF1bHQiLCJ0YXJnZXQiLCJjbG9zZXN0IiwicmVtb3ZlIiwicmVpbml0aWFsaXplRXh0ZW5zaW9uU2VsZWN0IiwidXBkYXRlRXh0ZW5zaW9uVGFibGVWaWV3IiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwiU291bmRGaWxlc1NlbGVjdG9yIiwiaW5pdGlhbGl6ZUZvcm0iLCJpbml0aWFsaXplVG9vbHRpcHMiLCJhcnJSZXN1bHQiLCJlYWNoIiwicmVzdWx0cyIsImluZGV4IiwicHVzaCIsIm51bWJlciIsImNhbGxlcmlkIiwiZ2V0QXZhaWxhYmxlUXVldWVNZW1iZXJzIiwicmVzdWx0IiwiZm9yRWFjaCIsIm1lbWJlciIsImxlbmd0aCIsImFjdGlvbiIsImZvcmNlU2VsZWN0aW9uIiwidGV4dCIsIiR0ciIsImxhc3QiLCIkY2xvbmUiLCJjbG9uZSIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJzaG93IiwiYXR0ciIsImZpbmQiLCJodG1sIiwiYWZ0ZXIiLCJ2YWx1ZXMiLCJ0YWJsZURuRCIsIm9uRHJhZ0NsYXNzIiwiZHJhZ0hhbmRsZSIsIm9uRHJvcCIsImR1bW15IiwiY3FfQWRkUXVldWVNZW1iZXJzIiwiYXBwZW5kIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwiZGF0YSIsImFyck1lbWJlcnMiLCJvYmoiLCJwcmlvcml0eSIsImNxX1ZhbGlkYXRlTm9FeHRlbnNpb25zIiwibWVtYmVycyIsIkpTT04iLCJzdHJpbmdpZnkiLCJjYkFmdGVyU2VuZEZvcm0iLCJyZXNwb25zZSIsImJ1aWxkVG9vbHRpcENvbnRlbnQiLCJjb25maWciLCJoZWFkZXIiLCJkZXNjcmlwdGlvbiIsImxpc3QiLCJBcnJheSIsImlzQXJyYXkiLCJpdGVtIiwidGVybSIsImRlZmluaXRpb24iLCJPYmplY3QiLCJlbnRyaWVzIiwiaSIsImxpc3ROYW1lIiwid2FybmluZyIsImV4YW1wbGVzIiwiZXhhbXBsZXNIZWFkZXIiLCJsaW5lIiwidHJpbSIsInN0YXJ0c1dpdGgiLCJlbmRzV2l0aCIsImluY2x1ZGVzIiwic3BsaXQiLCJwYXJhbSIsIm5vdGUiLCJ0b29sdGlwQ29uZmlncyIsImNhbGxlcmlkX3ByZWZpeCIsImNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9oZWFkZXIiLCJjcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfZGVzYyIsImNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9ob3dfaXRfd29ya3MiLCJjcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfZXhhbXBsZSIsImNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9wdXJwb3NlcyIsImNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9wdXJwb3NlX2lkZW50aWZ5IiwiY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX3B1cnBvc2VfcHJpb3JpdHkiLCJjcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfcHVycG9zZV9zdGF0cyIsImNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9leGFtcGxlc19oZWFkZXIiLCJjcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfZXhhbXBsZXMiLCJjcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfbm90ZSIsInNlY29uZHNfdG9fcmluZ19lYWNoX21lbWJlciIsImNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9oZWFkZXIiLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfZGVzYyIsImNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9zdHJhdGVnaWVzX2hlYWRlciIsImNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9yaW5nYWxsIiwiY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX3JpbmdhbGxfZGVzYyIsImNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9saW5lYXIiLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfbGluZWFyX2Rlc2MiLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfcmVjb21tZW5kYXRpb25zX2hlYWRlciIsImNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9yZWNfc2hvcnQiLCJjcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfcmVjX21lZGl1bSIsImNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9yZWNfbG9uZyIsImNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9ub3RlIiwic2Vjb25kc19mb3Jfd3JhcHVwIiwiY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfaGVhZGVyIiwiY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfZGVzYyIsImNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3B1cnBvc2VzX2hlYWRlciIsImNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3B1cnBvc2Vfbm90ZXMiLCJjcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9wdXJwb3NlX2NybSIsImNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3B1cnBvc2VfcHJlcGFyZSIsImNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3B1cnBvc2VfYnJlYWsiLCJjcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9yZWNvbW1lbmRhdGlvbnNfaGVhZGVyIiwiY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcmVjX25vbmUiLCJjcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9yZWNfc2hvcnQiLCJjcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9yZWNfbWVkaXVtIiwiY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcmVjX2xvbmciLCJjcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9ub3RlIiwiZWxlbWVudCIsIiRpY29uIiwiZmllbGROYW1lIiwiY29udGVudCIsInBvcHVwIiwicG9zaXRpb24iLCJob3ZlcmFibGUiLCJkZWxheSIsImhpZGUiLCJ2YXJpYXRpb24iLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwiZm4iLCJleGlzdFJ1bGUiLCJwYXJhbWV0ZXIiLCJoYXNDbGFzcyIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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RCxJQUFBQSxJQUFJLENBQUN4QixVQUFMO0FBQ0g7QUFuZ0JhLENBQWxCO0FBc2dCQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQXpCLENBQUMsQ0FBQ2lMLEVBQUYsQ0FBSzNJLElBQUwsQ0FBVW1ELFFBQVYsQ0FBbUJ6RSxLQUFuQixDQUF5QmtLLFNBQXpCLEdBQXFDLFVBQUNqSixLQUFELEVBQVFrSixTQUFSO0FBQUEsU0FBc0JuTCxDQUFDLFlBQUttTCxTQUFMLEVBQUQsQ0FBbUJDLFFBQW5CLENBQTRCLFFBQTVCLENBQXRCO0FBQUEsQ0FBckM7QUFHQTtBQUNBO0FBQ0E7OztBQUNBcEwsQ0FBQyxDQUFDcUwsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnpMLEVBQUFBLFNBQVMsQ0FBQzRCLFVBQVY7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRXh0ZW5zaW9ucyxGb3JtLCBTb3VuZEZpbGVzU2VsZWN0b3IgKi9cblxuXG4vKipcbiAqIGNhbGxRdWV1ZSBtb2R1bGUuXG4gKiBAbW9kdWxlIGNhbGxRdWV1ZVxuICovXG5jb25zdCBjYWxsUXVldWUgPSB7XG5cbiAgICAvLyBEZWZhdWx0IGV4dGVuc2lvbiBudW1iZXJcbiAgICBkZWZhdWx0RXh0ZW5zaW9uOiAnJyxcblxuICAgIC8vIFRoZSBpbnB1dCBmaWVsZCBmb3IgdGhlIGV4dGVuc2lvbiBudW1iZXJcbiAgICAkZXh0ZW5zaW9uOiAkKCcjZXh0ZW5zaW9uJyksXG5cbiAgICAvLyBMaXN0IG9mIGF2YWlsYWJsZSBtZW1iZXJzIGZvciB0aGlzIGNhbGwgcXVldWVcbiAgICBBdmFpbGFibGVNZW1iZXJzTGlzdDogW10sXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjcXVldWUtZm9ybScpLFxuXG4gICAgLy8gVGhlIGFjY29yZGlvbiBVSSBjb21wb25lbnRzIGluIHRoZSBmb3JtXG4gICAgJGFjY29yZGlvbnM6ICQoJyNxdWV1ZS1mb3JtIC51aS5hY2NvcmRpb24nKSxcblxuICAgIC8vIFRoZSBkcm9wZG93biBVSSBjb21wb25lbnRzIGluIHRoZSBmb3JtXG4gICAgJGRyb3BEb3duczogJCgnI3F1ZXVlLWZvcm0gLmRyb3Bkb3duJyksXG5cbiAgICAvLyBUaGUgZmllbGQgZm9yIGZvcm0gZXJyb3IgbWVzc2FnZXNcbiAgICAkZXJyb3JNZXNzYWdlczogJCgnI2Zvcm0tZXJyb3ItbWVzc2FnZXMnKSxcblxuICAgIC8vIFRoZSBjaGVja2JveCBVSSBjb21wb25lbnRzIGluIHRoZSBmb3JtXG4gICAgJGNoZWNrQm94ZXM6ICQoJyNxdWV1ZS1mb3JtIC5jaGVja2JveCcpLFxuXG4gICAgLy8gVGhlIHNlbGVjdCBmb3IgZm9yd2FyZGluZyBpbiB0aGUgZm9ybVxuICAgIGZvcndhcmRpbmdTZWxlY3Q6ICcjcXVldWUtZm9ybSAuZm9yd2FyZGluZy1zZWxlY3QnLFxuXG4gICAgLy8gVGhlIGJ1dHRvbiB0byBkZWxldGUgYSByb3dcbiAgICAkZGVsZXRlUm93QnV0dG9uOiAkKCcuZGVsZXRlLXJvdy1idXR0b24nKSxcblxuICAgIC8vIFRoZSBkcm9wZG93biBmb3IgcGVyaW9kaWMgYW5ub3VuY2Ugc291bmQgc2VsZWN0aW9uXG4gICAgJHBlcmlvZGljQW5ub3VuY2VEcm9wZG93bjogJCgnI3F1ZXVlLWZvcm0gLnBlcmlvZGljLWFubm91bmNlLXNvdW5kLWlkLXNlbGVjdCcpLFxuXG4gICAgLy8gVGhlIHJvdyBvZiB0aGUgbWVtYmVyXG4gICAgbWVtYmVyUm93OiAnI3F1ZXVlLWZvcm0gLm1lbWJlci1yb3cnLFxuXG4gICAgLy8gVGhlIGRyb3Bkb3duIGZvciBleHRlbnNpb24gc2VsZWN0aW9uXG4gICAgJGV4dGVuc2lvblNlbGVjdERyb3Bkb3duOiAkKCcjZXh0ZW5zaW9uc2VsZWN0JyksXG5cbiAgICAvLyBUaGUgdGFibGUgb2YgZXh0ZW5zaW9uc1xuICAgICRleHRlbnNpb25zVGFibGU6ICQoJyNleHRlbnNpb25zVGFibGUnKSxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBuYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnbmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuY3FfVmFsaWRhdGVOYW1lRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIGV4dGVuc2lvbjoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2V4dGVuc2lvbicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ251bWJlcicsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmNxX1ZhbGlkYXRlRXh0ZW5zaW9uTnVtYmVyLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5jcV9WYWxpZGF0ZUV4dGVuc2lvbkVtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXhpc3RSdWxlW2V4dGVuc2lvbi1lcnJvcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5jcV9WYWxpZGF0ZUV4dGVuc2lvbkRvdWJsZSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgY2FsbCBxdWV1ZSBmb3JtXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gR2V0IHBob25lIGV4dGVuc2lvbnMgYW5kIHNldCBhdmFpbGFibGUgcXVldWUgbWVtYmVyc1xuICAgICAgICBFeHRlbnNpb25zLmdldFBob25lRXh0ZW5zaW9ucyhjYWxsUXVldWUuc2V0QXZhaWxhYmxlUXVldWVNZW1iZXJzKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIFVJIGNvbXBvbmVudHNcbiAgICAgICAgY2FsbFF1ZXVlLiRhY2NvcmRpb25zLmFjY29yZGlvbigpO1xuICAgICAgICBjYWxsUXVldWUuJGRyb3BEb3ducy5kcm9wZG93bigpO1xuICAgICAgICBjYWxsUXVldWUuJGNoZWNrQm94ZXMuY2hlY2tib3goKTtcblxuICAgICAgICAvLyBTZXQgdXAgcGVyaW9kaWMgYW5ub3VuY2UgZHJvcGRvd24gYmVoYXZpb3VyXG4gICAgICAgIGNhbGxRdWV1ZS4kcGVyaW9kaWNBbm5vdW5jZURyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHBhcnNlSW50KHZhbHVlLCAxMCkgPT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZS4kcGVyaW9kaWNBbm5vdW5jZURyb3Bkb3duLmRyb3Bkb3duKCdjbGVhcicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZm9yd2FyZGluZyBzZWxlY3RcbiAgICAgICAgJChjYWxsUXVldWUuZm9yd2FyZGluZ1NlbGVjdCkuZHJvcGRvd24oRXh0ZW5zaW9ucy5nZXREcm9wZG93blNldHRpbmdzV2l0aEVtcHR5KCkpO1xuXG4gICAgICAgIC8vIFNldCB1cCBkeW5hbWljIGF2YWlsYWJpbGl0eSBjaGVjayBmb3IgZXh0ZW5zaW9uIG51bWJlclxuICAgICAgICBjYWxsUXVldWUuJGV4dGVuc2lvbi5vbignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbmV3TnVtYmVyID0gY2FsbFF1ZXVlLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRlbnNpb24nKTtcbiAgICAgICAgICAgIEV4dGVuc2lvbnMuY2hlY2tBdmFpbGFiaWxpdHkoY2FsbFF1ZXVlLmRlZmF1bHROdW1iZXIsIG5ld051bWJlcik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJhZyBhbmQgZHJvcCBmb3IgZXh0ZW5zaW9uIHRhYmxlIHJvd3NcbiAgICAgICAgY2FsbFF1ZXVlLmluaXRpYWxpemVEcmFnQW5kRHJvcEV4dGVuc2lvblRhYmxlUm93cygpO1xuXG4gICAgICAgIC8vIFNldCB1cCByb3cgZGVsZXRpb24gZnJvbSBxdWV1ZSBtZW1iZXJzIHRhYmxlXG4gICAgICAgIGNhbGxRdWV1ZS4kZGVsZXRlUm93QnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkKGUudGFyZ2V0KS5jbG9zZXN0KCd0cicpLnJlbW92ZSgpO1xuICAgICAgICAgICAgY2FsbFF1ZXVlLnJlaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdCgpO1xuICAgICAgICAgICAgY2FsbFF1ZXVlLnVwZGF0ZUV4dGVuc2lvblRhYmxlVmlldygpO1xuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgYXVkaW8gbWVzc2FnZSBzZWxlY3RcbiAgICAgICAgJCgnI3F1ZXVlLWZvcm0gLmF1ZGlvLW1lc3NhZ2Utc2VsZWN0JykuZHJvcGRvd24oU291bmRGaWxlc1NlbGVjdG9yLmdldERyb3Bkb3duU2V0dGluZ3NXaXRoRW1wdHkoKSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZm9ybVxuICAgICAgICBjYWxsUXVldWUuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGFkdmFuY2VkIHNldHRpbmdzXG4gICAgICAgIGNhbGxRdWV1ZS5pbml0aWFsaXplVG9vbHRpcHMoKTtcblxuICAgICAgICAvLyBTZXQgdGhlIGRlZmF1bHQgZXh0ZW5zaW9uIG51bWJlclxuICAgICAgICBjYWxsUXVldWUuZGVmYXVsdEV4dGVuc2lvbiA9IGNhbGxRdWV1ZS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCdleHRlbnNpb24nKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2V0IGF2YWlsYWJsZSBtZW1iZXJzIGZvciB0aGUgY2FsbCBxdWV1ZVxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBhcnJSZXN1bHQgLSBUaGUgbGlzdCBvZiBhdmFpbGFibGUgbWVtYmVyc1xuICAgICAqL1xuICAgIHNldEF2YWlsYWJsZVF1ZXVlTWVtYmVycyhhcnJSZXN1bHQpIHtcbiAgICAgICAgLy8gTG9vcCB0aHJvdWdoIHRoZSByZXN1bHQgYW5kIHBvcHVsYXRlIEF2YWlsYWJsZU1lbWJlcnNMaXN0XG4gICAgICAgICQuZWFjaChhcnJSZXN1bHQucmVzdWx0cywgKGluZGV4LCBleHRlbnNpb24pID0+IHtcbiAgICAgICAgICAgIGNhbGxRdWV1ZS5BdmFpbGFibGVNZW1iZXJzTGlzdC5wdXNoKHtcbiAgICAgICAgICAgICAgICBudW1iZXI6IGV4dGVuc2lvbi52YWx1ZSxcbiAgICAgICAgICAgICAgICBjYWxsZXJpZDogZXh0ZW5zaW9uLm5hbWUsXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gUmVpbml0aWFsaXplIHRoZSBleHRlbnNpb24gc2VsZWN0IGFuZCB1cGRhdGUgdGhlIHZpZXdcbiAgICAgICAgY2FsbFF1ZXVlLnJlaW5pdGlhbGl6ZUV4dGVuc2lvblNlbGVjdCgpO1xuICAgICAgICBjYWxsUXVldWUudXBkYXRlRXh0ZW5zaW9uVGFibGVWaWV3KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHVybiB0aGUgbGlzdCBvZiBhdmFpbGFibGUgbWVtYmVycyBmb3IgdGhlIHF1ZXVlXG4gICAgICogQHJldHVybnMge0FycmF5fSAtIFRoZSBsaXN0IG9mIGF2YWlsYWJsZSBtZW1iZXJzXG4gICAgICovXG4gICAgZ2V0QXZhaWxhYmxlUXVldWVNZW1iZXJzKCkge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBbXTtcblxuICAgICAgICAvLyBMb29wIHRocm91Z2ggYXZhaWxhYmxlIG1lbWJlcnMgYW5kIGFkZCB0byByZXN1bHQgaWYgbm90IGFscmVhZHkgc2VsZWN0ZWRcbiAgICAgICAgY2FsbFF1ZXVlLkF2YWlsYWJsZU1lbWJlcnNMaXN0LmZvckVhY2goKG1lbWJlcikgPT4ge1xuICAgICAgICAgICAgaWYgKCQoYC5tZW1iZXItcm93IyR7bWVtYmVyLm51bWJlcn1gKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICByZXN1bHQucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IG1lbWJlci5jYWxsZXJpZCxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IG1lbWJlci5udW1iZXIsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICAvLyByZXN1bHQuc29ydCgoYSwgYikgPT4gKChhLm5hbWUgPiBiLm5hbWUpID8gMSA6ICgoYi5uYW1lID4gYS5uYW1lKSA/IC0xIDogMCkpKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVpbml0aWFsaXplIGV4dGVuc2lvbiBzZWxlY3Qgd2l0aCBjb25zaWRlcmF0aW9uIGZvciBhbHJlYWR5IHNlbGVjdGVkIG1lbWJlcnNcbiAgICAgKi9cbiAgICByZWluaXRpYWxpemVFeHRlbnNpb25TZWxlY3QoKSB7XG4gICAgICAgIC8vIFNldHVwIGRyb3Bkb3duIHdpdGggYXZhaWxhYmxlIHF1ZXVlIG1lbWJlcnNcbiAgICAgICAgY2FsbFF1ZXVlLiRleHRlbnNpb25TZWxlY3REcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICBhY3Rpb246ICdoaWRlJyxcbiAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgIG9uQ2hhbmdlKHZhbHVlLCB0ZXh0KSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgYSB2YWx1ZSBpcyBzZWxlY3RlZFxuICAgICAgICAgICAgICAgIGlmICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBHZXQgdGhlIGxhc3QgdGVtcGxhdGUgcm93LCBjbG9uZSBpdCBhbmQgcG9wdWxhdGUgd2l0aCB0aGUgc2VsZWN0ZWQgbWVtYmVyIGRhdGFcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgJHRyID0gJCgnLm1lbWJlci1yb3ctdHBsJykubGFzdCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkY2xvbmUgPSAkdHIuY2xvbmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICRjbG9uZVxuICAgICAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdtZW1iZXItcm93LXRwbCcpXG4gICAgICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ21lbWJlci1yb3cnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgJGNsb25lLmF0dHIoJ2lkJywgdmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAkY2xvbmUuZmluZCgnLm51bWJlcicpLmh0bWwodmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAkY2xvbmUuZmluZCgnLmNhbGxlcmlkJykuaHRtbCh0ZXh0KTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBJbnNlcnQgdGhlIG5ldyBtZW1iZXIgcm93IGludG8gdGhlIHRhYmxlXG4gICAgICAgICAgICAgICAgICAgIGlmICgkKGNhbGxRdWV1ZS5tZW1iZXJSb3cpLmxhc3QoKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICR0ci5hZnRlcigkY2xvbmUpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgJChjYWxsUXVldWUubWVtYmVyUm93KS5sYXN0KCkuYWZ0ZXIoJGNsb25lKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlaW5pdGlhbGl6ZSB0aGUgZXh0ZW5zaW9uIHNlbGVjdCBhbmQgdXBkYXRlIHRoZSB2aWV3XG4gICAgICAgICAgICAgICAgICAgIGNhbGxRdWV1ZS5yZWluaXRpYWxpemVFeHRlbnNpb25TZWxlY3QoKTtcbiAgICAgICAgICAgICAgICAgICAgY2FsbFF1ZXVlLnVwZGF0ZUV4dGVuc2lvblRhYmxlVmlldygpO1xuXG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgLy8gU2V0IHRoZSB2YWx1ZXMgZm9yIHRoZSBkcm9wZG93blxuICAgICAgICAgICAgdmFsdWVzOiBjYWxsUXVldWUuZ2V0QXZhaWxhYmxlUXVldWVNZW1iZXJzKCksXG5cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgRHJhZyBhbmQgRHJvcCBmdW5jdGlvbmFsaXR5IGZvciB0aGUgZXh0ZW5zaW9uIHRhYmxlIHJvd3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRHJhZ0FuZERyb3BFeHRlbnNpb25UYWJsZVJvd3MoKSB7XG4gICAgICAgIGNhbGxRdWV1ZS4kZXh0ZW5zaW9uc1RhYmxlLnRhYmxlRG5EKHtcbiAgICAgICAgICAgIG9uRHJhZ0NsYXNzOiAnaG92ZXJpbmdSb3cnLCAgLy8gQ1NTIGNsYXNzIHRvIGJlIGFwcGxpZWQgd2hpbGUgYSByb3cgaXMgYmVpbmcgZHJhZ2dlZFxuICAgICAgICAgICAgZHJhZ0hhbmRsZTogJy5kcmFnSGFuZGxlJywgIC8vIENsYXNzIG9mIHRoZSBoYW5kbGVyIHRvIGluaXRpYXRlIHRoZSBkcmFnIGFjdGlvblxuICAgICAgICAgICAgb25Ecm9wOiAoKSA9PiB7IC8vIENhbGxiYWNrIHRvIGJlIGV4ZWN1dGVkIGFmdGVyIGEgcm93IGhhcyBiZWVuIGRyb3BwZWRcbiAgICAgICAgICAgICAgICAvLyBUcmlnZ2VyIGNoYW5nZSBldmVudCB0byBhY2tub3dsZWRnZSB0aGUgbW9kaWZpY2F0aW9uXG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERpc3BsYXkgYSBwbGFjZWhvbGRlciBpZiB0aGUgdGFibGUgaGFzIHplcm8gcm93c1xuICAgICAqL1xuICAgIHVwZGF0ZUV4dGVuc2lvblRhYmxlVmlldygpIHtcbiAgICAgICAgLy8gUGxhY2Vob2xkZXIgdG8gYmUgZGlzcGxheWVkXG4gICAgICAgIGNvbnN0IGR1bW15ID0gYDx0ciBjbGFzcz1cImR1bW15XCI+PHRkIGNvbHNwYW49XCI0XCIgY2xhc3M9XCJjZW50ZXIgYWxpZ25lZFwiPiR7Z2xvYmFsVHJhbnNsYXRlLmNxX0FkZFF1ZXVlTWVtYmVyc308L3RkPjwvdHI+YDtcblxuICAgICAgICBpZiAoJChjYWxsUXVldWUubWVtYmVyUm93KS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICQoJyNleHRlbnNpb25zVGFibGUgdGJvZHknKS5hcHBlbmQoZHVtbXkpOyAvLyBBZGQgdGhlIHBsYWNlaG9sZGVyIGlmIHRoZXJlIGFyZSBubyByb3dzXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcjZXh0ZW5zaW9uc1RhYmxlIHRib2R5IC5kdW1teScpLnJlbW92ZSgpOyAvLyBSZW1vdmUgdGhlIHBsYWNlaG9sZGVyIGlmIHJvd3MgYXJlIHByZXNlbnRcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGxldCByZXN1bHQgPSBzZXR0aW5ncztcblxuICAgICAgICAvLyBSZXRyaWV2ZSBmb3JtIHZhbHVlc1xuICAgICAgICByZXN1bHQuZGF0YSA9IGNhbGxRdWV1ZS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cbiAgICAgICAgY29uc3QgYXJyTWVtYmVycyA9IFtdO1xuXG4gICAgICAgIC8vIEl0ZXJhdGUgdGhyb3VnaCBlYWNoIG1lbWJlciByb3cgYW5kIGFkZCB0byBhcnJNZW1iZXJzXG4gICAgICAgICQoY2FsbFF1ZXVlLm1lbWJlclJvdykuZWFjaCgoaW5kZXgsIG9iaikgPT4ge1xuICAgICAgICAgICAgaWYgKCQob2JqKS5hdHRyKCdpZCcpKSB7XG4gICAgICAgICAgICAgICAgYXJyTWVtYmVycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbnVtYmVyOiAkKG9iaikuYXR0cignaWQnKSxcbiAgICAgICAgICAgICAgICAgICAgcHJpb3JpdHk6IGluZGV4LFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBWYWxpZGF0ZSBpZiBhbnkgbWVtYmVycyBleGlzdFxuICAgICAgICBpZiAoYXJyTWVtYmVycy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZhbHNlO1xuICAgICAgICAgICAgY2FsbFF1ZXVlLiRlcnJvck1lc3NhZ2VzLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLmNxX1ZhbGlkYXRlTm9FeHRlbnNpb25zKTtcbiAgICAgICAgICAgIGNhbGxRdWV1ZS4kZm9ybU9iai5hZGRDbGFzcygnZXJyb3InKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLm1lbWJlcnMgPSBKU09OLnN0cmluZ2lmeShhcnJNZW1iZXJzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBjYWxsUXVldWUuZGVmYXVsdE51bWJlciA9IGNhbGxRdWV1ZS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCdleHRlbnNpb24nKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQnVpbGQgSFRNTCBjb250ZW50IGZvciB0b29sdGlwIHBvcHVwXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZyAtIENvbmZpZ3VyYXRpb24gb2JqZWN0IGZvciB0b29sdGlwIGNvbnRlbnRcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSAtIEhUTUwgc3RyaW5nIGZvciB0b29sdGlwIGNvbnRlbnRcbiAgICAgKi9cbiAgICBidWlsZFRvb2x0aXBDb250ZW50KGNvbmZpZykge1xuICAgICAgICBpZiAoIWNvbmZpZykgcmV0dXJuICcnO1xuICAgICAgICBcbiAgICAgICAgbGV0IGh0bWwgPSAnJztcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBoZWFkZXIgaWYgZXhpc3RzXG4gICAgICAgIGlmIChjb25maWcuaGVhZGVyKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+PHN0cm9uZz4ke2NvbmZpZy5oZWFkZXJ9PC9zdHJvbmc+PC9kaXY+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSBkaXZpZGVyXCI+PC9kaXY+JztcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGRlc2NyaXB0aW9uIGlmIGV4aXN0c1xuICAgICAgICBpZiAoY29uZmlnLmRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8cD4ke2NvbmZpZy5kZXNjcmlwdGlvbn08L3A+YDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGxpc3QgaXRlbXMgaWYgZXhpc3RcbiAgICAgICAgaWYgKGNvbmZpZy5saXN0KSB7XG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShjb25maWcubGlzdCkgJiYgY29uZmlnLmxpc3QubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzx1bD4nO1xuICAgICAgICAgICAgICAgIGNvbmZpZy5saXN0LmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT4ke2l0ZW19PC9saT5gO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0udGVybSAmJiBpdGVtLmRlZmluaXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEhlYWRlciBpdGVtIHdpdGhvdXQgZGVmaW5pdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPC91bD48cD48c3Ryb25nPiR7aXRlbS50ZXJtfTwvc3Ryb25nPjwvcD48dWw+YDtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpdGVtLnRlcm0gJiYgaXRlbS5kZWZpbml0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+PHN0cm9uZz4ke2l0ZW0udGVybX06PC9zdHJvbmc+ICR7aXRlbS5kZWZpbml0aW9ufTwvbGk+YDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzwvdWw+JztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGNvbmZpZy5saXN0ID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIC8vIE9sZCBmb3JtYXQgLSBvYmplY3Qgd2l0aCBrZXktdmFsdWUgcGFpcnNcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8dWw+JztcbiAgICAgICAgICAgICAgICBPYmplY3QuZW50cmllcyhjb25maWcubGlzdCkuZm9yRWFjaCgoW3Rlcm0sIGRlZmluaXRpb25dKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT48c3Ryb25nPiR7dGVybX06PC9zdHJvbmc+ICR7ZGVmaW5pdGlvbn08L2xpPmA7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPC91bD4nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgYWRkaXRpb25hbCBsaXN0cyAobGlzdDIsIGxpc3QzLCBldGMuKVxuICAgICAgICBmb3IgKGxldCBpID0gMjsgaSA8PSAxMDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBsaXN0TmFtZSA9IGBsaXN0JHtpfWA7XG4gICAgICAgICAgICBpZiAoY29uZmlnW2xpc3ROYW1lXSAmJiBjb25maWdbbGlzdE5hbWVdLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8dWw+JztcbiAgICAgICAgICAgICAgICBjb25maWdbbGlzdE5hbWVdLmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT4ke2l0ZW19PC9saT5gO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0udGVybSAmJiBpdGVtLmRlZmluaXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDwvdWw+PHA+PHN0cm9uZz4ke2l0ZW0udGVybX08L3N0cm9uZz48L3A+PHVsPmA7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXRlbS50ZXJtICYmIGl0ZW0uZGVmaW5pdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGxpPjxzdHJvbmc+JHtpdGVtLnRlcm19Ojwvc3Ryb25nPiAke2l0ZW0uZGVmaW5pdGlvbn08L2xpPmA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8L3VsPic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCB3YXJuaW5nIGlmIGV4aXN0c1xuICAgICAgICBpZiAoY29uZmlnLndhcm5pbmcpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSBzbWFsbCBvcmFuZ2UgbWVzc2FnZVwiPic7XG4gICAgICAgICAgICBpZiAoY29uZmlnLndhcm5pbmcuaGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPmA7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBpY29uXCI+PC9pPiBgO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gY29uZmlnLndhcm5pbmcuaGVhZGVyO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDwvZGl2PmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9IGNvbmZpZy53YXJuaW5nLnRleHQ7XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgY29kZSBleGFtcGxlcyBpZiBleGlzdFxuICAgICAgICBpZiAoY29uZmlnLmV4YW1wbGVzICYmIGNvbmZpZy5leGFtcGxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpZiAoY29uZmlnLmV4YW1wbGVzSGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPHA+PHN0cm9uZz4ke2NvbmZpZy5leGFtcGxlc0hlYWRlcn06PC9zdHJvbmc+PC9wPmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgc2VnbWVudFwiIHN0eWxlPVwiYmFja2dyb3VuZC1jb2xvcjogI2Y4ZjhmODsgYm9yZGVyOiAxcHggc29saWQgI2UwZTBlMDtcIj4nO1xuICAgICAgICAgICAgaHRtbCArPSAnPHByZSBzdHlsZT1cIm1hcmdpbjogMDsgZm9udC1zaXplOiAwLjllbTsgbGluZS1oZWlnaHQ6IDEuNGVtO1wiPic7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFByb2Nlc3MgZXhhbXBsZXMgd2l0aCBzeW50YXggaGlnaGxpZ2h0aW5nIGZvciBzZWN0aW9uc1xuICAgICAgICAgICAgY29uZmlnLmV4YW1wbGVzLmZvckVhY2goKGxpbmUsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGxpbmUudHJpbSgpLnN0YXJ0c1dpdGgoJ1snKSAmJiBsaW5lLnRyaW0oKS5lbmRzV2l0aCgnXScpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNlY3Rpb24gaGVhZGVyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbmRleCA+IDApIGh0bWwgKz0gJ1xcbic7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxzcGFuIHN0eWxlPVwiY29sb3I6ICMwMDg0YjQ7IGZvbnQtd2VpZ2h0OiBib2xkO1wiPiR7bGluZX08L3NwYW4+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGxpbmUuaW5jbHVkZXMoJz0nKSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBQYXJhbWV0ZXIgbGluZVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBbcGFyYW0sIHZhbHVlXSA9IGxpbmUuc3BsaXQoJz0nLCAyKTtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgXFxuPHNwYW4gc3R5bGU9XCJjb2xvcjogIzdhM2U5ZDtcIj4ke3BhcmFtfTwvc3Bhbj49PHNwYW4gc3R5bGU9XCJjb2xvcjogI2NmNGE0YztcIj4ke3ZhbHVlfTwvc3Bhbj5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFJlZ3VsYXIgbGluZVxuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGxpbmUgPyBgXFxuJHtsaW5lfWAgOiAnJztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaHRtbCArPSAnPC9wcmU+JztcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBub3RlIGlmIGV4aXN0c1xuICAgICAgICBpZiAoY29uZmlnLm5vdGUpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxwIGNsYXNzPVwidWkgc21hbGxcIj48aSBjbGFzcz1cImluZm8gY2lyY2xlIGljb25cIj48L2k+ICR7Y29uZmlnLm5vdGV9PC9wPmA7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVUb29sdGlwcygpIHtcbiAgICAgICAgLy8gRGVmaW5lIHRvb2x0aXAgY29uZmlndXJhdGlvbnMgZm9yIGVhY2ggZmllbGRcbiAgICAgICAgY29uc3QgdG9vbHRpcENvbmZpZ3MgPSB7XG4gICAgICAgICAgICBjYWxsZXJpZF9wcmVmaXg6IGNhbGxRdWV1ZS5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5jcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX2hvd19pdF93b3JrcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IG51bGxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9leGFtcGxlLFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX3B1cnBvc2VzLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfQ2FsbGVySURQcmVmaXhUb29sdGlwX3B1cnBvc2VfaWRlbnRpZnksXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfcHVycG9zZV9wcmlvcml0eSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9wdXJwb3NlX3N0YXRzXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBleGFtcGxlc0hlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9leGFtcGxlc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgZXhhbXBsZXM6IGdsb2JhbFRyYW5zbGF0ZS5jcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfZXhhbXBsZXMgXG4gICAgICAgICAgICAgICAgICAgID8gZ2xvYmFsVHJhbnNsYXRlLmNxX0NhbGxlcklEUHJlZml4VG9vbHRpcF9leGFtcGxlcy5zcGxpdCgnfCcpIFxuICAgICAgICAgICAgICAgICAgICA6IFtdLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5jcV9DYWxsZXJJRFByZWZpeFRvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHNlY29uZHNfdG9fcmluZ19lYWNoX21lbWJlcjogY2FsbFF1ZXVlLmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfc3RyYXRlZ2llc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfcmluZ2FsbCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmluaXRpb246IGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfcmluZ2FsbF9kZXNjXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRlcm06IGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfbGluZWFyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNUb1JpbmdFYWNoTWVtYmVyVG9vbHRpcF9saW5lYXJfZGVzY1xuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX3JlY29tbWVuZGF0aW9uc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfcmVjX3Nob3J0LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc1RvUmluZ0VhY2hNZW1iZXJUb29sdGlwX3JlY19tZWRpdW0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfcmVjX2xvbmdcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzVG9SaW5nRWFjaE1lbWJlclRvb2x0aXBfbm90ZVxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHNlY29uZHNfZm9yX3dyYXB1cDogY2FsbFF1ZXVlLmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0ZXJtOiBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcHVycG9zZXNfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmaW5pdGlvbjogbnVsbFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcHVycG9zZV9ub3RlcyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3B1cnBvc2VfY3JtLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcHVycG9zZV9wcmVwYXJlLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuY3FfU2Vjb25kc0ZvcldyYXB1cFRvb2x0aXBfcHVycG9zZV9icmVhayxcbiAgICAgICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGVybTogZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3JlY29tbWVuZGF0aW9uc19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZpbml0aW9uOiBudWxsXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9yZWNfbm9uZSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3JlY19zaG9ydCxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX3JlY19tZWRpdW0sXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5jcV9TZWNvbmRzRm9yV3JhcHVwVG9vbHRpcF9yZWNfbG9uZ1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLmNxX1NlY29uZHNGb3JXcmFwdXBUb29sdGlwX25vdGVcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXAgZm9yIGVhY2ggZmllbGQgaW5mbyBpY29uXG4gICAgICAgICQoJy5maWVsZC1pbmZvLWljb24nKS5lYWNoKChpbmRleCwgZWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGljb24gPSAkKGVsZW1lbnQpO1xuICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0gJGljb24uZGF0YSgnZmllbGQnKTtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSB0b29sdGlwQ29uZmlnc1tmaWVsZE5hbWVdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoY29udGVudCkge1xuICAgICAgICAgICAgICAgICRpY29uLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbDogY29udGVudCxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnLFxuICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRlbGF5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaG93OiAzMDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBoaWRlOiAxMDBcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgdmFyaWF0aW9uOiAnZmxvd2luZydcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBjdXN0b20gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGNhbGxRdWV1ZS4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfWNhbGwtcXVldWVzL3NhdmVgOyAgLy8gRm9ybSBzdWJtaXNzaW9uIFVSTFxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBjYWxsUXVldWUudmFsaWRhdGVSdWxlczsgLy8gRm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGNhbGxRdWV1ZS5jYkJlZm9yZVNlbmRGb3JtOyAgLy8gQ2FsbGJhY2sgYmVmb3JlIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGNhbGxRdWV1ZS5jYkFmdGVyU2VuZEZvcm07ICAvLyBDYWxsYmFjayBhZnRlciBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcbn07XG5cbi8qKlxuICogQ2hlY2tzIGlmIHRoZSBudW1iZXIgaXMgdGFrZW4gYnkgYW5vdGhlciBhY2NvdW50XG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiB0aGUgcGFyYW1ldGVyIGhhcyB0aGUgJ2hpZGRlbicgY2xhc3MsIGZhbHNlIG90aGVyd2lzZVxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXhpc3RSdWxlID0gKHZhbHVlLCBwYXJhbWV0ZXIpID0+ICQoYCMke3BhcmFtZXRlcn1gKS5oYXNDbGFzcygnaGlkZGVuJyk7XG5cblxuLyoqXG4gKiAgSW5pdGlhbGl6ZSBDYWxsIFF1ZXVlcyBtb2RpZnkgZm9ybSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgY2FsbFF1ZXVlLmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=