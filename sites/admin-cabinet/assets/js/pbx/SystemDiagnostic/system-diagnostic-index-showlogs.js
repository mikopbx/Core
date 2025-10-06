"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

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

/* global ace, PbxApi, SyslogAPI, updateLogViewWorker, Ace, UserMessage */

/**
 * Represents the system diagnostic logs object.
 *
 * @module systemDiagnosticLogs
 */
var systemDiagnosticLogs = {
  /**
   * jQuery object for the "Show Last Log" button.
   * @type {jQuery}
   */
  $showBtn: $('#show-last-log'),

  /**
   * jQuery object for the "Download File" button.
   * @type {jQuery}
   */
  $downloadBtn: $('#download-file'),

  /**
   * jQuery object for the "Show Last Log (Auto)" button.
   * @type {jQuery}
   */
  $showAutoBtn: $('#show-last-log-auto'),

  /**
   * jQuery object for the "Erase current file content" button.
   * @type {jQuery}
   */
  $eraseBtn: $('#erase-file'),

  /**
   * jQuery object for the log content.
   * @type {jQuery}
   */
  $logContent: $('#log-content-readonly'),

  /**
   * The viewer for displaying the log content.
   * @type {Ace}
   */
  viewer: '',

  /**
   * jQuery object for the file select dropdown.
   * @type {jQuery}
   */
  $fileSelectDropDown: null,

  /**
   * Array of log items.
   * @type {Array}
   */
  logsItems: [],

  /**
   * jQuery object for the dimmer.
   * @type {jQuery}
   */
  $dimmer: $('#get-logs-dimmer'),

  /**
   * jQuery object for the form.
   * @type {jQuery}
   */
  $formObj: $('#system-diagnostic-form'),

  /**
   * Flag to prevent duplicate API calls during initialization
   * @type {boolean}
   */
  isInitializing: true,

  /**
   * Initializes the system diagnostic logs.
   */
  initialize: function initialize() {
    var aceHeight = window.innerHeight - 250; // Set the minimum height of the log container

    systemDiagnosticLogs.$dimmer.closest('div').css('min-height', "".concat(aceHeight, "px")); // Create dropdown UI from hidden input (V5.0 pattern)

    systemDiagnosticLogs.createDropdownFromHiddenInput(); // Initialize the dropdown menu for log files with tree support
    // Initialize Semantic UI dropdown with custom menu generation

    systemDiagnosticLogs.$fileSelectDropDown.dropdown({
      onChange: systemDiagnosticLogs.cbOnChangeFile,
      ignoreCase: true,
      fullTextSearch: true,
      forceSelection: false,
      preserveHTML: true,
      allowCategorySelection: false,
      match: 'text',
      filterRemoteData: false,
      action: 'activate',
      templates: {
        menu: systemDiagnosticLogs.customDropdownMenu
      }
    }); // Initialize the ACE editor for log content

    systemDiagnosticLogs.initializeAce(); // Fetch the list of log files

    SyslogAPI.getLogsList(systemDiagnosticLogs.cbFormatDropdownResults); // Event listener for "Show Log" button click

    systemDiagnosticLogs.$showBtn.on('click', function (e) {
      e.preventDefault();
      systemDiagnosticLogs.updateLogFromServer();
    }); // Listen for hash changes to update selected file

    $(window).on('hashchange', function () {
      systemDiagnosticLogs.handleHashChange();
    }); // Event listener for "Download Log" button click

    systemDiagnosticLogs.$downloadBtn.on('click', function (e) {
      e.preventDefault();
      var data = systemDiagnosticLogs.$formObj.form('get values');
      SyslogAPI.downloadLogFile(data.filename, true, systemDiagnosticLogs.cbDownloadFile);
    }); // Event listener for "Auto Refresh" button click

    systemDiagnosticLogs.$showAutoBtn.on('click', function (e) {
      e.preventDefault();
      var $reloadIcon = systemDiagnosticLogs.$showAutoBtn.find('i.refresh');

      if ($reloadIcon.hasClass('loading')) {
        $reloadIcon.removeClass('loading');
        updateLogViewWorker.stop();
      } else {
        $reloadIcon.addClass('loading');
        updateLogViewWorker.initialize();
      }
    }); // Event listener for the "Erase file" button click

    systemDiagnosticLogs.$eraseBtn.on('click', function (e) {
      e.preventDefault();
      systemDiagnosticLogs.eraseCurrentFileContent();
    }); // Event listener for Enter keypress on input fields

    $('input').keyup(function (event) {
      if (event.keyCode === 13) {
        systemDiagnosticLogs.updateLogFromServer();
      }
    }); // Event listener for Fullscreen button click

    $('.fullscreen-toggle-btn').on('click', systemDiagnosticLogs.toggleFullScreen); // Listening for the fullscreen change event

    document.addEventListener('fullscreenchange', systemDiagnosticLogs.adjustLogHeight); // Initial height calculation

    systemDiagnosticLogs.adjustLogHeight();
  },

  /**
   * Toggles the full-screen mode of the 'system-logs-segment' element.
   * If the element is not in full-screen mode, it requests full-screen mode.
   * If the element is already in full-screen mode, it exits full-screen mode.
   * Logs an error message to the console if there is an issue enabling full-screen mode.
   *
   * @return {void}
   */
  toggleFullScreen: function toggleFullScreen() {
    var logContainer = document.getElementById('system-logs-segment');

    if (!document.fullscreenElement) {
      logContainer.requestFullscreen()["catch"](function (err) {
        console.error("Error attempting to enable full-screen mode: ".concat(err.message));
      });
    } else {
      document.exitFullscreen();
    }
  },

  /**
   * Function to adjust the height of the logs depending on the screen mode.
   */
  adjustLogHeight: function adjustLogHeight() {
    setTimeout(function () {
      var aceHeight = window.innerHeight - systemDiagnosticLogs.$logContent.offset().top - 55;

      if (document.fullscreenElement) {
        // If fullscreen mode is active
        aceHeight = window.innerHeight - 80;
      } // Recalculate the size of the ACE editor


      $('.log-content-readonly').css('min-height', "".concat(aceHeight, "px"));
      systemDiagnosticLogs.viewer.resize();
    }, 300);
  },

  /**
   * Creates dropdown UI element from hidden input field (V5.0 pattern)
   */
  createDropdownFromHiddenInput: function createDropdownFromHiddenInput() {
    var $hiddenInput = $('#filenames');

    if (!$hiddenInput.length) {
      console.error('Hidden input #filenames not found');
      return;
    }

    var $dropdown = $('<div>', {
      id: 'filenames-dropdown',
      "class": 'ui selection dropdown filenames-select fluid'
    });
    $dropdown.append($('<i>', {
      "class": 'dropdown icon'
    }), $('<div>', {
      "class": 'default text'
    }).text('Select log file'), $('<div>', {
      "class": 'menu'
    }));
    $hiddenInput.before($dropdown);
    $hiddenInput.hide();
    systemDiagnosticLogs.$fileSelectDropDown = $dropdown;
  },

  /**
   * Initializes the ACE editor for log viewing.
   */
  initializeAce: function initializeAce() {
    systemDiagnosticLogs.viewer = ace.edit('log-content-readonly'); // Check if the Julia mode is available

    var julia = ace.require('ace/mode/julia');

    if (julia !== undefined) {
      // Set the mode to Julia if available
      var IniMode = julia.Mode;
      systemDiagnosticLogs.viewer.session.setMode(new IniMode());
    } // Set the theme and options for the ACE editor


    systemDiagnosticLogs.viewer.setTheme('ace/theme/monokai');
    systemDiagnosticLogs.viewer.renderer.setShowGutter(false);
    systemDiagnosticLogs.viewer.setOptions({
      showLineNumbers: false,
      showPrintMargin: false,
      readOnly: true
    });
  },

  /**
   * Builds a hierarchical tree structure from flat file paths
   * @param {Object} files - The files object from API response
   * @param {string} defaultPath - The default selected file path
   * @returns {Array} Tree structure for the dropdown
   */
  buildTreeStructure: function buildTreeStructure(files, defaultPath) {
    var tree = {}; // Build the tree structure

    Object.entries(files).forEach(function (_ref) {
      var _ref2 = _slicedToArray(_ref, 2),
          key = _ref2[0],
          fileData = _ref2[1];

      // Use fileData.path as the actual file path
      var filePath = fileData.path || key;
      var parts = filePath.split('/');
      var current = tree;
      parts.forEach(function (part, index) {
        if (index === parts.length - 1) {
          // This is a file
          current[part] = {
            type: 'file',
            path: filePath,
            size: fileData.size,
            "default": defaultPath && defaultPath === filePath || !defaultPath && fileData["default"]
          };
        } else {
          // This is a directory
          if (!current[part]) {
            current[part] = {
              type: 'folder',
              children: {}
            };
          }

          current = current[part].children;
        }
      });
    }); // Convert tree to dropdown items

    return this.treeToDropdownItems(tree, '');
  },

  /**
   * Converts tree structure to dropdown items with proper formatting
   * @param {Object} tree - The tree structure
   * @param {string} prefix - Prefix for indentation
   * @returns {Array} Formatted dropdown items
   */
  treeToDropdownItems: function treeToDropdownItems(tree, prefix) {
    var _this = this;

    var items = []; // Sort entries: folders first, then files

    var entries = Object.entries(tree).sort(function (_ref3, _ref4) {
      var _ref5 = _slicedToArray(_ref3, 2),
          aKey = _ref5[0],
          aVal = _ref5[1];

      var _ref6 = _slicedToArray(_ref4, 2),
          bKey = _ref6[0],
          bVal = _ref6[1];

      if (aVal.type === 'folder' && bVal.type === 'file') return -1;
      if (aVal.type === 'file' && bVal.type === 'folder') return 1;
      return aKey.localeCompare(bKey);
    });
    entries.forEach(function (_ref7) {
      var _ref8 = _slicedToArray(_ref7, 2),
          key = _ref8[0],
          value = _ref8[1];

      if (value.type === 'folder') {
        // Add folder header
        items.push({
          name: "".concat(prefix, "<i class=\"folder icon\"></i> ").concat(key),
          value: '',
          disabled: true,
          type: 'folder'
        }); // Add children with increased indentation

        var childItems = _this.treeToDropdownItems(value.children, prefix + '&nbsp;&nbsp;&nbsp;&nbsp;');

        items.push.apply(items, _toConsumableArray(childItems));
      } else {
        // Add file item
        items.push({
          name: "".concat(prefix, "<i class=\"file outline icon\"></i> ").concat(key, " (").concat(value.size, ")"),
          value: value.path,
          selected: value["default"],
          type: 'file'
        });
      }
    });
    return items;
  },

  /**
   * Creates custom dropdown menu HTML for log files
   * @param {Object} response - The response containing dropdown menu options
   * @param {Object} fields - The fields in the response to use for the menu options
   * @returns {string} The HTML string for the custom dropdown menu
   */
  customDropdownMenu: function customDropdownMenu(response, fields) {
    var values = response[fields.values] || {};
    var html = '';
    $.each(values, function (index, option) {
      // For tree structure items
      if (systemDiagnosticLogs.logsItems && systemDiagnosticLogs.logsItems[index]) {
        var item = systemDiagnosticLogs.logsItems[index];

        if (item.type === 'folder') {
          // Folder item - disabled and with folder icon
          html += "<div class=\"disabled item\" data-value=\"\">".concat(item.name, "</div>");
        } else {
          // File item with proper value
          var selected = item.selected ? 'selected active' : '';
          html += "<div class=\"item ".concat(selected, "\" data-value=\"").concat(option[fields.value], "\">").concat(item.name, "</div>");
        }
      } else {
        // Fallback to regular item
        var maybeDisabled = option[fields.disabled] ? 'disabled ' : '';
        html += "<div class=\"".concat(maybeDisabled, "item\" data-value=\"").concat(option[fields.value], "\">").concat(option[fields.name], "</div>");
      }
    });
    return html;
  },

  /**
   * Handles hash changes to update the selected file
   */
  handleHashChange: function handleHashChange() {
    // Skip during initialization to prevent duplicate API calls
    if (systemDiagnosticLogs.isInitializing) {
      return;
    }

    var hash = window.location.hash;

    if (hash && hash.startsWith('#file=')) {
      var filePath = decodeURIComponent(hash.substring(6));

      if (filePath && systemDiagnosticLogs.$fileSelectDropDown.dropdown('get value') !== filePath) {
        // Check if the file exists in dropdown items
        var fileExists = systemDiagnosticLogs.logsItems.some(function (item) {
          return item.type === 'file' && item.value === filePath;
        });

        if (fileExists) {
          systemDiagnosticLogs.$fileSelectDropDown.dropdown('set selected', filePath);
          systemDiagnosticLogs.$fileSelectDropDown.dropdown('set text', filePath);
          systemDiagnosticLogs.$formObj.form('set value', 'filename', filePath);
          systemDiagnosticLogs.updateLogFromServer();
        }
      }
    }
  },

  /**
   * Gets the file path from URL hash if present
   */
  getFileFromHash: function getFileFromHash() {
    var hash = window.location.hash;

    if (hash && hash.startsWith('#file=')) {
      return decodeURIComponent(hash.substring(6));
    }

    return '';
  },

  /**
   * Callback function to format the dropdown menu structure based on the response.
   * @param {Object} response - The response data.
   */
  cbFormatDropdownResults: function cbFormatDropdownResults(response) {
    // Check if response is valid
    if (!response || !response.result || !response.data || !response.data.files) {
      systemDiagnosticLogs.$dimmer.removeClass('active');
      return;
    }

    var files = response.data.files; // Check for file from hash first

    var defVal = systemDiagnosticLogs.getFileFromHash(); // If no hash value, check if there is a default value set for the filename input field

    if (!defVal) {
      var fileName = systemDiagnosticLogs.$formObj.form('get value', 'filename');

      if (fileName !== '') {
        defVal = fileName.trim();
      }
    } // Build tree structure from files


    systemDiagnosticLogs.logsItems = systemDiagnosticLogs.buildTreeStructure(files, defVal); // Create values array for dropdown with all items (including folders)

    var dropdownValues = systemDiagnosticLogs.logsItems.map(function (item, index) {
      if (item.type === 'folder') {
        return {
          name: item.name.replace(/<[^>]*>/g, ''),
          // Remove HTML tags for search
          value: '',
          disabled: true
        };
      } else {
        return {
          name: item.name.replace(/<[^>]*>/g, ''),
          // Remove HTML tags for search
          value: item.value,
          selected: item.selected
        };
      }
    }); // Update dropdown with values

    systemDiagnosticLogs.$fileSelectDropDown.dropdown('setup menu', {
      values: dropdownValues
    }); // Set the default selected value if any

    var selectedItem = systemDiagnosticLogs.logsItems.find(function (item) {
      return item.selected;
    });

    if (selectedItem) {
      // Use setTimeout to ensure dropdown is fully initialized
      setTimeout(function () {
        // Setting selected value will trigger onChange callback which calls updateLogFromServer()
        systemDiagnosticLogs.$fileSelectDropDown.dropdown('set selected', selectedItem.value); // Force refresh the dropdown to show the selected value

        systemDiagnosticLogs.$fileSelectDropDown.dropdown('refresh'); // Also set the text to show full path

        systemDiagnosticLogs.$fileSelectDropDown.dropdown('set text', selectedItem.value);
        systemDiagnosticLogs.$formObj.form('set value', 'filename', selectedItem.value);
      }, 100);
    } else if (defVal) {
      // If we have a default value but no item was marked as selected,
      // try to find and select it manually
      var itemToSelect = systemDiagnosticLogs.logsItems.find(function (item) {
        return item.type === 'file' && item.value === defVal;
      });

      if (itemToSelect) {
        setTimeout(function () {
          // Setting selected value will trigger onChange callback which calls updateLogFromServer()
          systemDiagnosticLogs.$fileSelectDropDown.dropdown('set selected', itemToSelect.value);
          systemDiagnosticLogs.$fileSelectDropDown.dropdown('refresh');
          systemDiagnosticLogs.$fileSelectDropDown.dropdown('set text', itemToSelect.value);
          systemDiagnosticLogs.$formObj.form('set value', 'filename', itemToSelect.value);
        }, 100);
      } else {
        // Hide the dimmer after loading only if no file is selected
        systemDiagnosticLogs.$dimmer.removeClass('active');
      }
    } else {
      // Hide the dimmer after loading only if no file is selected
      systemDiagnosticLogs.$dimmer.removeClass('active');
    } // Mark initialization as complete to allow hashchange handler to work


    setTimeout(function () {
      systemDiagnosticLogs.isInitializing = false;
    }, 200);
  },

  /**
   * Callback after changing the log file in the select dropdown.
   * @param {string} value - The selected value.
   */
  cbOnChangeFile: function cbOnChangeFile(value) {
    if (value.length === 0) {
      return;
    } // Set dropdown text to show the full file path


    systemDiagnosticLogs.$fileSelectDropDown.dropdown('set text', value);
    systemDiagnosticLogs.$formObj.form('set value', 'filename', value); // Update URL hash with the selected file

    window.location.hash = 'file=' + encodeURIComponent(value);
    systemDiagnosticLogs.updateLogFromServer();
  },

  /**
   * Fetches the log file content from the server.
   */
  updateLogFromServer: function updateLogFromServer() {
    var params = systemDiagnosticLogs.$formObj.form('get values');
    SyslogAPI.getLogFromFile(params, systemDiagnosticLogs.cbUpdateLogText);
  },

  /**
   * Updates the log view.
   * @param {Object} response - The response from API.
   */
  cbUpdateLogText: function cbUpdateLogText(response) {
    var _response$data;

    systemDiagnosticLogs.$dimmer.removeClass('active'); // Handle v3 API response structure

    if (!response || !response.result) {
      if (response && response.messages) {
        UserMessage.showMultiString(response.messages);
      }

      return;
    }

    var content = ((_response$data = response.data) === null || _response$data === void 0 ? void 0 : _response$data.content) || '';
    systemDiagnosticLogs.viewer.getSession().setValue(content);
    var row = systemDiagnosticLogs.viewer.session.getLength() - 1;
    var column = systemDiagnosticLogs.viewer.session.getLine(row).length;
    systemDiagnosticLogs.viewer.gotoLine(row + 1, column);
  },

  /**
   * Callback after clicking the "Download File" button.
   * @param {Object} response - The response data.
   */
  cbDownloadFile: function cbDownloadFile(response) {
    // Handle v3 API response structure
    if (response && response.result && response.data) {
      window.location = response.data.filename || response.data;
    } else if (response && response.messages) {
      UserMessage.showMultiString(response.messages);
    }
  },

  /**
   * Callback after clicking the "Erase File" button.
   */
  eraseCurrentFileContent: function eraseCurrentFileContent() {
    var fileName = systemDiagnosticLogs.$formObj.form('get value', 'filename');

    if (fileName.length > 0) {
      SyslogAPI.eraseFile(fileName, systemDiagnosticLogs.cbAfterFileErased);
    }
  },

  /**
   * Callback after clicking the "Erase File" button and calling REST API command
   * @param {Object} response - The response data.
   */
  cbAfterFileErased: function cbAfterFileErased(response) {
    if (response.result === false && response.messages !== undefined) {
      UserMessage.showMultiString(response.messages);
    } else {
      systemDiagnosticLogs.updateLogFromServer();
    }
  }
}; // When the document is ready, initialize the show system logs tab

$(document).ready(function () {
  systemDiagnosticLogs.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TeXN0ZW1EaWFnbm9zdGljL3N5c3RlbS1kaWFnbm9zdGljLWluZGV4LXNob3dsb2dzLmpzIl0sIm5hbWVzIjpbInN5c3RlbURpYWdub3N0aWNMb2dzIiwiJHNob3dCdG4iLCIkIiwiJGRvd25sb2FkQnRuIiwiJHNob3dBdXRvQnRuIiwiJGVyYXNlQnRuIiwiJGxvZ0NvbnRlbnQiLCJ2aWV3ZXIiLCIkZmlsZVNlbGVjdERyb3BEb3duIiwibG9nc0l0ZW1zIiwiJGRpbW1lciIsIiRmb3JtT2JqIiwiaXNJbml0aWFsaXppbmciLCJpbml0aWFsaXplIiwiYWNlSGVpZ2h0Iiwid2luZG93IiwiaW5uZXJIZWlnaHQiLCJjbG9zZXN0IiwiY3NzIiwiY3JlYXRlRHJvcGRvd25Gcm9tSGlkZGVuSW5wdXQiLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwiY2JPbkNoYW5nZUZpbGUiLCJpZ25vcmVDYXNlIiwiZnVsbFRleHRTZWFyY2giLCJmb3JjZVNlbGVjdGlvbiIsInByZXNlcnZlSFRNTCIsImFsbG93Q2F0ZWdvcnlTZWxlY3Rpb24iLCJtYXRjaCIsImZpbHRlclJlbW90ZURhdGEiLCJhY3Rpb24iLCJ0ZW1wbGF0ZXMiLCJtZW51IiwiY3VzdG9tRHJvcGRvd25NZW51IiwiaW5pdGlhbGl6ZUFjZSIsIlN5c2xvZ0FQSSIsImdldExvZ3NMaXN0IiwiY2JGb3JtYXREcm9wZG93blJlc3VsdHMiLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInVwZGF0ZUxvZ0Zyb21TZXJ2ZXIiLCJoYW5kbGVIYXNoQ2hhbmdlIiwiZGF0YSIsImZvcm0iLCJkb3dubG9hZExvZ0ZpbGUiLCJmaWxlbmFtZSIsImNiRG93bmxvYWRGaWxlIiwiJHJlbG9hZEljb24iLCJmaW5kIiwiaGFzQ2xhc3MiLCJyZW1vdmVDbGFzcyIsInVwZGF0ZUxvZ1ZpZXdXb3JrZXIiLCJzdG9wIiwiYWRkQ2xhc3MiLCJlcmFzZUN1cnJlbnRGaWxlQ29udGVudCIsImtleXVwIiwiZXZlbnQiLCJrZXlDb2RlIiwidG9nZ2xlRnVsbFNjcmVlbiIsImRvY3VtZW50IiwiYWRkRXZlbnRMaXN0ZW5lciIsImFkanVzdExvZ0hlaWdodCIsImxvZ0NvbnRhaW5lciIsImdldEVsZW1lbnRCeUlkIiwiZnVsbHNjcmVlbkVsZW1lbnQiLCJyZXF1ZXN0RnVsbHNjcmVlbiIsImVyciIsImNvbnNvbGUiLCJlcnJvciIsIm1lc3NhZ2UiLCJleGl0RnVsbHNjcmVlbiIsInNldFRpbWVvdXQiLCJvZmZzZXQiLCJ0b3AiLCJyZXNpemUiLCIkaGlkZGVuSW5wdXQiLCJsZW5ndGgiLCIkZHJvcGRvd24iLCJpZCIsImFwcGVuZCIsInRleHQiLCJiZWZvcmUiLCJoaWRlIiwiYWNlIiwiZWRpdCIsImp1bGlhIiwicmVxdWlyZSIsInVuZGVmaW5lZCIsIkluaU1vZGUiLCJNb2RlIiwic2Vzc2lvbiIsInNldE1vZGUiLCJzZXRUaGVtZSIsInJlbmRlcmVyIiwic2V0U2hvd0d1dHRlciIsInNldE9wdGlvbnMiLCJzaG93TGluZU51bWJlcnMiLCJzaG93UHJpbnRNYXJnaW4iLCJyZWFkT25seSIsImJ1aWxkVHJlZVN0cnVjdHVyZSIsImZpbGVzIiwiZGVmYXVsdFBhdGgiLCJ0cmVlIiwiT2JqZWN0IiwiZW50cmllcyIsImZvckVhY2giLCJrZXkiLCJmaWxlRGF0YSIsImZpbGVQYXRoIiwicGF0aCIsInBhcnRzIiwic3BsaXQiLCJjdXJyZW50IiwicGFydCIsImluZGV4IiwidHlwZSIsInNpemUiLCJjaGlsZHJlbiIsInRyZWVUb0Ryb3Bkb3duSXRlbXMiLCJwcmVmaXgiLCJpdGVtcyIsInNvcnQiLCJhS2V5IiwiYVZhbCIsImJLZXkiLCJiVmFsIiwibG9jYWxlQ29tcGFyZSIsInZhbHVlIiwicHVzaCIsIm5hbWUiLCJkaXNhYmxlZCIsImNoaWxkSXRlbXMiLCJzZWxlY3RlZCIsInJlc3BvbnNlIiwiZmllbGRzIiwidmFsdWVzIiwiaHRtbCIsImVhY2giLCJvcHRpb24iLCJpdGVtIiwibWF5YmVEaXNhYmxlZCIsImhhc2giLCJsb2NhdGlvbiIsInN0YXJ0c1dpdGgiLCJkZWNvZGVVUklDb21wb25lbnQiLCJzdWJzdHJpbmciLCJmaWxlRXhpc3RzIiwic29tZSIsImdldEZpbGVGcm9tSGFzaCIsInJlc3VsdCIsImRlZlZhbCIsImZpbGVOYW1lIiwidHJpbSIsImRyb3Bkb3duVmFsdWVzIiwibWFwIiwicmVwbGFjZSIsInNlbGVjdGVkSXRlbSIsIml0ZW1Ub1NlbGVjdCIsImVuY29kZVVSSUNvbXBvbmVudCIsInBhcmFtcyIsImdldExvZ0Zyb21GaWxlIiwiY2JVcGRhdGVMb2dUZXh0IiwibWVzc2FnZXMiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsImNvbnRlbnQiLCJnZXRTZXNzaW9uIiwic2V0VmFsdWUiLCJyb3ciLCJnZXRMZW5ndGgiLCJjb2x1bW4iLCJnZXRMaW5lIiwiZ290b0xpbmUiLCJlcmFzZUZpbGUiLCJjYkFmdGVyRmlsZUVyYXNlZCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsb0JBQW9CLEdBQUc7QUFDekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMsZ0JBQUQsQ0FMYzs7QUFPekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsWUFBWSxFQUFFRCxDQUFDLENBQUMsZ0JBQUQsQ0FYVTs7QUFhekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUUsRUFBQUEsWUFBWSxFQUFFRixDQUFDLENBQUMscUJBQUQsQ0FqQlU7O0FBbUJ6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJRyxFQUFBQSxTQUFTLEVBQUVILENBQUMsQ0FBQyxhQUFELENBdkJhOztBQXlCekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUksRUFBQUEsV0FBVyxFQUFF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O0FBQ3BCaEwsRUFBQUEsb0JBQW9CLENBQUNhLFVBQXJCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG4vKiBnbG9iYWwgYWNlLCBQYnhBcGksIFN5c2xvZ0FQSSwgdXBkYXRlTG9nVmlld1dvcmtlciwgQWNlLCBVc2VyTWVzc2FnZSAqL1xuIFxuLyoqXG4gKiBSZXByZXNlbnRzIHRoZSBzeXN0ZW0gZGlhZ25vc3RpYyBsb2dzIG9iamVjdC5cbiAqXG4gKiBAbW9kdWxlIHN5c3RlbURpYWdub3N0aWNMb2dzXG4gKi9cbmNvbnN0IHN5c3RlbURpYWdub3N0aWNMb2dzID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBcIlNob3cgTGFzdCBMb2dcIiBidXR0b24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc2hvd0J0bjogJCgnI3Nob3ctbGFzdC1sb2cnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBcIkRvd25sb2FkIEZpbGVcIiBidXR0b24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZG93bmxvYWRCdG46ICQoJyNkb3dubG9hZC1maWxlJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgXCJTaG93IExhc3QgTG9nIChBdXRvKVwiIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzaG93QXV0b0J0bjogJCgnI3Nob3ctbGFzdC1sb2ctYXV0bycpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIFwiRXJhc2UgY3VycmVudCBmaWxlIGNvbnRlbnRcIiBidXR0b24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZXJhc2VCdG46ICQoJyNlcmFzZS1maWxlJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgbG9nIGNvbnRlbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbG9nQ29udGVudDogJCgnI2xvZy1jb250ZW50LXJlYWRvbmx5JyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgdmlld2VyIGZvciBkaXNwbGF5aW5nIHRoZSBsb2cgY29udGVudC5cbiAgICAgKiBAdHlwZSB7QWNlfVxuICAgICAqL1xuICAgIHZpZXdlcjogJycsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZmlsZSBzZWxlY3QgZHJvcGRvd24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZmlsZVNlbGVjdERyb3BEb3duOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogQXJyYXkgb2YgbG9nIGl0ZW1zLlxuICAgICAqIEB0eXBlIHtBcnJheX1cbiAgICAgKi9cbiAgICBsb2dzSXRlbXM6IFtdLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGRpbW1lci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkaW1tZXI6ICQoJyNnZXQtbG9ncy1kaW1tZXInKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNzeXN0ZW0tZGlhZ25vc3RpYy1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBGbGFnIHRvIHByZXZlbnQgZHVwbGljYXRlIEFQSSBjYWxscyBkdXJpbmcgaW5pdGlhbGl6YXRpb25cbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBpc0luaXRpYWxpemluZzogdHJ1ZSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBzeXN0ZW0gZGlhZ25vc3RpYyBsb2dzLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIGNvbnN0IGFjZUhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCAtIDI1MDtcblxuICAgICAgICAvLyBTZXQgdGhlIG1pbmltdW0gaGVpZ2h0IG9mIHRoZSBsb2cgY29udGFpbmVyXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIuY2xvc2VzdCgnZGl2JykuY3NzKCdtaW4taGVpZ2h0JywgYCR7YWNlSGVpZ2h0fXB4YCk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIGRyb3Bkb3duIFVJIGZyb20gaGlkZGVuIGlucHV0IChWNS4wIHBhdHRlcm4pXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmNyZWF0ZURyb3Bkb3duRnJvbUhpZGRlbklucHV0KCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZHJvcGRvd24gbWVudSBmb3IgbG9nIGZpbGVzIHdpdGggdHJlZSBzdXBwb3J0XG4gICAgICAgIC8vIEluaXRpYWxpemUgU2VtYW50aWMgVUkgZHJvcGRvd24gd2l0aCBjdXN0b20gbWVudSBnZW5lcmF0aW9uXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jYk9uQ2hhbmdlRmlsZSxcbiAgICAgICAgICAgICAgICBpZ25vcmVDYXNlOiB0cnVlLFxuICAgICAgICAgICAgICAgIGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuICAgICAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBwcmVzZXJ2ZUhUTUw6IHRydWUsXG4gICAgICAgICAgICAgICAgYWxsb3dDYXRlZ29yeVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICAgICAgbWF0Y2g6ICd0ZXh0JyxcbiAgICAgICAgICAgICAgICBmaWx0ZXJSZW1vdGVEYXRhOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBhY3Rpb246ICdhY3RpdmF0ZScsXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgICAgIG1lbnU6IHN5c3RlbURpYWdub3N0aWNMb2dzLmN1c3RvbURyb3Bkb3duTWVudVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgQUNFIGVkaXRvciBmb3IgbG9nIGNvbnRlbnRcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaW5pdGlhbGl6ZUFjZSgpO1xuXG4gICAgICAgIC8vIEZldGNoIHRoZSBsaXN0IG9mIGxvZyBmaWxlc1xuICAgICAgICBTeXNsb2dBUEkuZ2V0TG9nc0xpc3Qoc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY2JGb3JtYXREcm9wZG93blJlc3VsdHMpO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciBcIlNob3cgTG9nXCIgYnV0dG9uIGNsaWNrXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRzaG93QnRuLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy51cGRhdGVMb2dGcm9tU2VydmVyKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIExpc3RlbiBmb3IgaGFzaCBjaGFuZ2VzIHRvIHVwZGF0ZSBzZWxlY3RlZCBmaWxlXG4gICAgICAgICQod2luZG93KS5vbignaGFzaGNoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmhhbmRsZUhhc2hDaGFuZ2UoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIFwiRG93bmxvYWQgTG9nXCIgYnV0dG9uIGNsaWNrXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkb3dubG9hZEJ0bi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgICAgIFN5c2xvZ0FQSS5kb3dubG9hZExvZ0ZpbGUoZGF0YS5maWxlbmFtZSwgdHJ1ZSwgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY2JEb3dubG9hZEZpbGUpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgXCJBdXRvIFJlZnJlc2hcIiBidXR0b24gY2xpY2tcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJHNob3dBdXRvQnRuLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkcmVsb2FkSWNvbiA9IHN5c3RlbURpYWdub3N0aWNMb2dzLiRzaG93QXV0b0J0bi5maW5kKCdpLnJlZnJlc2gnKTtcbiAgICAgICAgICAgIGlmICgkcmVsb2FkSWNvbi5oYXNDbGFzcygnbG9hZGluZycpKSB7XG4gICAgICAgICAgICAgICAgJHJlbG9hZEljb24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICB1cGRhdGVMb2dWaWV3V29ya2VyLnN0b3AoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHJlbG9hZEljb24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICB1cGRhdGVMb2dWaWV3V29ya2VyLmluaXRpYWxpemUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIHRoZSBcIkVyYXNlIGZpbGVcIiBidXR0b24gY2xpY2tcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGVyYXNlQnRuLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5lcmFzZUN1cnJlbnRGaWxlQ29udGVudCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgRW50ZXIga2V5cHJlc3Mgb24gaW5wdXQgZmllbGRzXG4gICAgICAgICQoJ2lucHV0Jykua2V5dXAoKGV2ZW50KSA9PiB7XG4gICAgICAgICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMTMpIHtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy51cGRhdGVMb2dGcm9tU2VydmVyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciBGdWxsc2NyZWVuIGJ1dHRvbiBjbGlja1xuICAgICAgICAkKCcuZnVsbHNjcmVlbi10b2dnbGUtYnRuJykub24oJ2NsaWNrJywgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudG9nZ2xlRnVsbFNjcmVlbik7XG5cbiAgICAgICAgLy8gTGlzdGVuaW5nIGZvciB0aGUgZnVsbHNjcmVlbiBjaGFuZ2UgZXZlbnRcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignZnVsbHNjcmVlbmNoYW5nZScsIHN5c3RlbURpYWdub3N0aWNMb2dzLmFkanVzdExvZ0hlaWdodCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbCBoZWlnaHQgY2FsY3VsYXRpb25cbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuYWRqdXN0TG9nSGVpZ2h0KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZXMgdGhlIGZ1bGwtc2NyZWVuIG1vZGUgb2YgdGhlICdzeXN0ZW0tbG9ncy1zZWdtZW50JyBlbGVtZW50LlxuICAgICAqIElmIHRoZSBlbGVtZW50IGlzIG5vdCBpbiBmdWxsLXNjcmVlbiBtb2RlLCBpdCByZXF1ZXN0cyBmdWxsLXNjcmVlbiBtb2RlLlxuICAgICAqIElmIHRoZSBlbGVtZW50IGlzIGFscmVhZHkgaW4gZnVsbC1zY3JlZW4gbW9kZSwgaXQgZXhpdHMgZnVsbC1zY3JlZW4gbW9kZS5cbiAgICAgKiBMb2dzIGFuIGVycm9yIG1lc3NhZ2UgdG8gdGhlIGNvbnNvbGUgaWYgdGhlcmUgaXMgYW4gaXNzdWUgZW5hYmxpbmcgZnVsbC1zY3JlZW4gbW9kZS5cbiAgICAgKlxuICAgICAqIEByZXR1cm4ge3ZvaWR9XG4gICAgICovXG4gICAgdG9nZ2xlRnVsbFNjcmVlbigpIHtcbiAgICAgICAgY29uc3QgbG9nQ29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3N5c3RlbS1sb2dzLXNlZ21lbnQnKTtcblxuICAgICAgICBpZiAoIWRvY3VtZW50LmZ1bGxzY3JlZW5FbGVtZW50KSB7XG4gICAgICAgICAgICBsb2dDb250YWluZXIucmVxdWVzdEZ1bGxzY3JlZW4oKS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgYXR0ZW1wdGluZyB0byBlbmFibGUgZnVsbC1zY3JlZW4gbW9kZTogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZG9jdW1lbnQuZXhpdEZ1bGxzY3JlZW4oKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGdW5jdGlvbiB0byBhZGp1c3QgdGhlIGhlaWdodCBvZiB0aGUgbG9ncyBkZXBlbmRpbmcgb24gdGhlIHNjcmVlbiBtb2RlLlxuICAgICAqL1xuICAgIGFkanVzdExvZ0hlaWdodCgpIHtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBsZXQgYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGxvZ0NvbnRlbnQub2Zmc2V0KCkudG9wIC0gNTU7XG4gICAgICAgICAgICBpZiAoZG9jdW1lbnQuZnVsbHNjcmVlbkVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiBmdWxsc2NyZWVuIG1vZGUgaXMgYWN0aXZlXG4gICAgICAgICAgICAgICAgYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gODA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBSZWNhbGN1bGF0ZSB0aGUgc2l6ZSBvZiB0aGUgQUNFIGVkaXRvclxuICAgICAgICAgICAgJCgnLmxvZy1jb250ZW50LXJlYWRvbmx5JykuY3NzKCdtaW4taGVpZ2h0JywgIGAke2FjZUhlaWdodH1weGApO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnJlc2l6ZSgpO1xuICAgICAgICB9LCAzMDApO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBkcm9wZG93biBVSSBlbGVtZW50IGZyb20gaGlkZGVuIGlucHV0IGZpZWxkIChWNS4wIHBhdHRlcm4pXG4gICAgICovXG4gICAgY3JlYXRlRHJvcGRvd25Gcm9tSGlkZGVuSW5wdXQoKSB7XG4gICAgICAgIGNvbnN0ICRoaWRkZW5JbnB1dCA9ICQoJyNmaWxlbmFtZXMnKTtcblxuICAgICAgICBpZiAoISRoaWRkZW5JbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0hpZGRlbiBpbnB1dCAjZmlsZW5hbWVzIG5vdCBmb3VuZCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJCgnPGRpdj4nLCB7XG4gICAgICAgICAgICBpZDogJ2ZpbGVuYW1lcy1kcm9wZG93bicsXG4gICAgICAgICAgICBjbGFzczogJ3VpIHNlbGVjdGlvbiBkcm9wZG93biBmaWxlbmFtZXMtc2VsZWN0IGZsdWlkJ1xuICAgICAgICB9KTtcblxuICAgICAgICAkZHJvcGRvd24uYXBwZW5kKFxuICAgICAgICAgICAgJCgnPGk+JywgeyBjbGFzczogJ2Ryb3Bkb3duIGljb24nIH0pLFxuICAgICAgICAgICAgJCgnPGRpdj4nLCB7IGNsYXNzOiAnZGVmYXVsdCB0ZXh0JyB9KS50ZXh0KCdTZWxlY3QgbG9nIGZpbGUnKSxcbiAgICAgICAgICAgICQoJzxkaXY+JywgeyBjbGFzczogJ21lbnUnIH0pXG4gICAgICAgICk7XG5cbiAgICAgICAgJGhpZGRlbklucHV0LmJlZm9yZSgkZHJvcGRvd24pO1xuICAgICAgICAkaGlkZGVuSW5wdXQuaGlkZSgpO1xuXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24gPSAkZHJvcGRvd247XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBBQ0UgZWRpdG9yIGZvciBsb2cgdmlld2luZy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplQWNlKCkge1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIgPSBhY2UuZWRpdCgnbG9nLWNvbnRlbnQtcmVhZG9ubHknKTtcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgSnVsaWEgbW9kZSBpcyBhdmFpbGFibGVcbiAgICAgICAgY29uc3QganVsaWEgPSBhY2UucmVxdWlyZSgnYWNlL21vZGUvanVsaWEnKTtcbiAgICAgICAgaWYgKGp1bGlhICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIFNldCB0aGUgbW9kZSB0byBKdWxpYSBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgIGNvbnN0IEluaU1vZGUgPSBqdWxpYS5Nb2RlO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnNlc3Npb24uc2V0TW9kZShuZXcgSW5pTW9kZSgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCB0aGUgdGhlbWUgYW5kIG9wdGlvbnMgZm9yIHRoZSBBQ0UgZWRpdG9yXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlci5zZXRUaGVtZSgnYWNlL3RoZW1lL21vbm9rYWknKTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnJlbmRlcmVyLnNldFNob3dHdXR0ZXIoZmFsc2UpO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIuc2V0T3B0aW9ucyh7XG4gICAgICAgICAgICBzaG93TGluZU51bWJlcnM6IGZhbHNlLFxuICAgICAgICAgICAgc2hvd1ByaW50TWFyZ2luOiBmYWxzZSxcbiAgICAgICAgICAgIHJlYWRPbmx5OiB0cnVlLFxuICAgICAgICB9KTtcblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCdWlsZHMgYSBoaWVyYXJjaGljYWwgdHJlZSBzdHJ1Y3R1cmUgZnJvbSBmbGF0IGZpbGUgcGF0aHNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZmlsZXMgLSBUaGUgZmlsZXMgb2JqZWN0IGZyb20gQVBJIHJlc3BvbnNlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGRlZmF1bHRQYXRoIC0gVGhlIGRlZmF1bHQgc2VsZWN0ZWQgZmlsZSBwYXRoXG4gICAgICogQHJldHVybnMge0FycmF5fSBUcmVlIHN0cnVjdHVyZSBmb3IgdGhlIGRyb3Bkb3duXG4gICAgICovXG4gICAgYnVpbGRUcmVlU3RydWN0dXJlKGZpbGVzLCBkZWZhdWx0UGF0aCkge1xuICAgICAgICBjb25zdCB0cmVlID0ge307XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCB0aGUgdHJlZSBzdHJ1Y3R1cmVcbiAgICAgICAgT2JqZWN0LmVudHJpZXMoZmlsZXMpLmZvckVhY2goKFtrZXksIGZpbGVEYXRhXSkgPT4ge1xuICAgICAgICAgICAgLy8gVXNlIGZpbGVEYXRhLnBhdGggYXMgdGhlIGFjdHVhbCBmaWxlIHBhdGhcbiAgICAgICAgICAgIGNvbnN0IGZpbGVQYXRoID0gZmlsZURhdGEucGF0aCB8fCBrZXk7XG4gICAgICAgICAgICBjb25zdCBwYXJ0cyA9IGZpbGVQYXRoLnNwbGl0KCcvJyk7XG4gICAgICAgICAgICBsZXQgY3VycmVudCA9IHRyZWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHBhcnRzLmZvckVhY2goKHBhcnQsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGluZGV4ID09PSBwYXJ0cy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgaXMgYSBmaWxlXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRbcGFydF0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZmlsZScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBmaWxlUGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpemU6IGZpbGVEYXRhLnNpemUsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAoZGVmYXVsdFBhdGggJiYgZGVmYXVsdFBhdGggPT09IGZpbGVQYXRoKSB8fCAoIWRlZmF1bHRQYXRoICYmIGZpbGVEYXRhLmRlZmF1bHQpXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBpcyBhIGRpcmVjdG9yeVxuICAgICAgICAgICAgICAgICAgICBpZiAoIWN1cnJlbnRbcGFydF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRbcGFydF0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ZvbGRlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW46IHt9XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnQgPSBjdXJyZW50W3BhcnRdLmNoaWxkcmVuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbnZlcnQgdHJlZSB0byBkcm9wZG93biBpdGVtc1xuICAgICAgICByZXR1cm4gdGhpcy50cmVlVG9Ecm9wZG93bkl0ZW1zKHRyZWUsICcnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENvbnZlcnRzIHRyZWUgc3RydWN0dXJlIHRvIGRyb3Bkb3duIGl0ZW1zIHdpdGggcHJvcGVyIGZvcm1hdHRpbmdcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gdHJlZSAtIFRoZSB0cmVlIHN0cnVjdHVyZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcmVmaXggLSBQcmVmaXggZm9yIGluZGVudGF0aW9uXG4gICAgICogQHJldHVybnMge0FycmF5fSBGb3JtYXR0ZWQgZHJvcGRvd24gaXRlbXNcbiAgICAgKi9cbiAgICB0cmVlVG9Ecm9wZG93bkl0ZW1zKHRyZWUsIHByZWZpeCkge1xuICAgICAgICBjb25zdCBpdGVtcyA9IFtdO1xuICAgICAgICBcbiAgICAgICAgLy8gU29ydCBlbnRyaWVzOiBmb2xkZXJzIGZpcnN0LCB0aGVuIGZpbGVzXG4gICAgICAgIGNvbnN0IGVudHJpZXMgPSBPYmplY3QuZW50cmllcyh0cmVlKS5zb3J0KChbYUtleSwgYVZhbF0sIFtiS2V5LCBiVmFsXSkgPT4ge1xuICAgICAgICAgICAgaWYgKGFWYWwudHlwZSA9PT0gJ2ZvbGRlcicgJiYgYlZhbC50eXBlID09PSAnZmlsZScpIHJldHVybiAtMTtcbiAgICAgICAgICAgIGlmIChhVmFsLnR5cGUgPT09ICdmaWxlJyAmJiBiVmFsLnR5cGUgPT09ICdmb2xkZXInKSByZXR1cm4gMTtcbiAgICAgICAgICAgIHJldHVybiBhS2V5LmxvY2FsZUNvbXBhcmUoYktleSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgZW50cmllcy5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcbiAgICAgICAgICAgIGlmICh2YWx1ZS50eXBlID09PSAnZm9sZGVyJykge1xuICAgICAgICAgICAgICAgIC8vIEFkZCBmb2xkZXIgaGVhZGVyXG4gICAgICAgICAgICAgICAgaXRlbXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGAke3ByZWZpeH08aSBjbGFzcz1cImZvbGRlciBpY29uXCI+PC9pPiAke2tleX1gLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJycsXG4gICAgICAgICAgICAgICAgICAgIGRpc2FibGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZm9sZGVyJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEFkZCBjaGlsZHJlbiB3aXRoIGluY3JlYXNlZCBpbmRlbnRhdGlvblxuICAgICAgICAgICAgICAgIGNvbnN0IGNoaWxkSXRlbXMgPSB0aGlzLnRyZWVUb0Ryb3Bkb3duSXRlbXModmFsdWUuY2hpbGRyZW4sIHByZWZpeCArICcmbmJzcDsmbmJzcDsmbmJzcDsmbmJzcDsnKTtcbiAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKC4uLmNoaWxkSXRlbXMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBBZGQgZmlsZSBpdGVtXG4gICAgICAgICAgICAgICAgaXRlbXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGAke3ByZWZpeH08aSBjbGFzcz1cImZpbGUgb3V0bGluZSBpY29uXCI+PC9pPiAke2tleX0gKCR7dmFsdWUuc2l6ZX0pYCxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlLnBhdGgsXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkOiB2YWx1ZS5kZWZhdWx0LFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZmlsZSdcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaXRlbXM7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGN1c3RvbSBkcm9wZG93biBtZW51IEhUTUwgZm9yIGxvZyBmaWxlc1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBjb250YWluaW5nIGRyb3Bkb3duIG1lbnUgb3B0aW9uc1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBmaWVsZHMgLSBUaGUgZmllbGRzIGluIHRoZSByZXNwb25zZSB0byB1c2UgZm9yIHRoZSBtZW51IG9wdGlvbnNcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgSFRNTCBzdHJpbmcgZm9yIHRoZSBjdXN0b20gZHJvcGRvd24gbWVudVxuICAgICAqL1xuICAgIGN1c3RvbURyb3Bkb3duTWVudShyZXNwb25zZSwgZmllbGRzKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlcyA9IHJlc3BvbnNlW2ZpZWxkcy52YWx1ZXNdIHx8IHt9O1xuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuICAgICAgICBcbiAgICAgICAgJC5lYWNoKHZhbHVlcywgKGluZGV4LCBvcHRpb24pID0+IHtcbiAgICAgICAgICAgIC8vIEZvciB0cmVlIHN0cnVjdHVyZSBpdGVtc1xuICAgICAgICAgICAgaWYgKHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtcyAmJiBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXNbaW5kZXhdKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXRlbSA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtc1tpbmRleF07XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGl0ZW0udHlwZSA9PT0gJ2ZvbGRlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRm9sZGVyIGl0ZW0gLSBkaXNhYmxlZCBhbmQgd2l0aCBmb2xkZXIgaWNvblxuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiZGlzYWJsZWQgaXRlbVwiIGRhdGEtdmFsdWU9XCJcIj4ke2l0ZW0ubmFtZX08L2Rpdj5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZpbGUgaXRlbSB3aXRoIHByb3BlciB2YWx1ZVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RlZCA9IGl0ZW0uc2VsZWN0ZWQgPyAnc2VsZWN0ZWQgYWN0aXZlJyA6ICcnO1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbSAke3NlbGVjdGVkfVwiIGRhdGEtdmFsdWU9XCIke29wdGlvbltmaWVsZHMudmFsdWVdfVwiPiR7aXRlbS5uYW1lfTwvZGl2PmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBGYWxsYmFjayB0byByZWd1bGFyIGl0ZW1cbiAgICAgICAgICAgICAgICBjb25zdCBtYXliZURpc2FibGVkID0gKG9wdGlvbltmaWVsZHMuZGlzYWJsZWRdKSA/ICdkaXNhYmxlZCAnIDogJyc7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIiR7bWF5YmVEaXNhYmxlZH1pdGVtXCIgZGF0YS12YWx1ZT1cIiR7b3B0aW9uW2ZpZWxkcy52YWx1ZV19XCI+JHtvcHRpb25bZmllbGRzLm5hbWVdfTwvZGl2PmA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgaGFzaCBjaGFuZ2VzIHRvIHVwZGF0ZSB0aGUgc2VsZWN0ZWQgZmlsZVxuICAgICAqL1xuICAgIGhhbmRsZUhhc2hDaGFuZ2UoKSB7XG4gICAgICAgIC8vIFNraXAgZHVyaW5nIGluaXRpYWxpemF0aW9uIHRvIHByZXZlbnQgZHVwbGljYXRlIEFQSSBjYWxsc1xuICAgICAgICBpZiAoc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNJbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGhhc2ggPSB3aW5kb3cubG9jYXRpb24uaGFzaDtcbiAgICAgICAgaWYgKGhhc2ggJiYgaGFzaC5zdGFydHNXaXRoKCcjZmlsZT0nKSkge1xuICAgICAgICAgICAgY29uc3QgZmlsZVBhdGggPSBkZWNvZGVVUklDb21wb25lbnQoaGFzaC5zdWJzdHJpbmcoNikpO1xuICAgICAgICAgICAgaWYgKGZpbGVQYXRoICYmIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ2dldCB2YWx1ZScpICE9PSBmaWxlUGF0aCkge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBmaWxlIGV4aXN0cyBpbiBkcm9wZG93biBpdGVtc1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVFeGlzdHMgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXMuc29tZShpdGVtID0+XG4gICAgICAgICAgICAgICAgICAgIGl0ZW0udHlwZSA9PT0gJ2ZpbGUnICYmIGl0ZW0udmFsdWUgPT09IGZpbGVQYXRoXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBpZiAoZmlsZUV4aXN0cykge1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBmaWxlUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldCB0ZXh0JywgZmlsZVBhdGgpO1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZmlsZW5hbWUnLCBmaWxlUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgZmlsZSBwYXRoIGZyb20gVVJMIGhhc2ggaWYgcHJlc2VudFxuICAgICAqL1xuICAgIGdldEZpbGVGcm9tSGFzaCgpIHtcbiAgICAgICAgY29uc3QgaGFzaCA9IHdpbmRvdy5sb2NhdGlvbi5oYXNoO1xuICAgICAgICBpZiAoaGFzaCAmJiBoYXNoLnN0YXJ0c1dpdGgoJyNmaWxlPScpKSB7XG4gICAgICAgICAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KGhhc2guc3Vic3RyaW5nKDYpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGZvcm1hdCB0aGUgZHJvcGRvd24gbWVudSBzdHJ1Y3R1cmUgYmFzZWQgb24gdGhlIHJlc3BvbnNlLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBkYXRhLlxuICAgICAqL1xuICAgIGNiRm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIHJlc3BvbnNlIGlzIHZhbGlkXG4gICAgICAgIGlmICghcmVzcG9uc2UgfHwgIXJlc3BvbnNlLnJlc3VsdCB8fCAhcmVzcG9uc2UuZGF0YSB8fCAhcmVzcG9uc2UuZGF0YS5maWxlcykge1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBmaWxlcyA9IHJlc3BvbnNlLmRhdGEuZmlsZXM7XG5cbiAgICAgICAgLy8gQ2hlY2sgZm9yIGZpbGUgZnJvbSBoYXNoIGZpcnN0XG4gICAgICAgIGxldCBkZWZWYWwgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5nZXRGaWxlRnJvbUhhc2goKTtcblxuICAgICAgICAvLyBJZiBubyBoYXNoIHZhbHVlLCBjaGVjayBpZiB0aGVyZSBpcyBhIGRlZmF1bHQgdmFsdWUgc2V0IGZvciB0aGUgZmlsZW5hbWUgaW5wdXQgZmllbGRcbiAgICAgICAgaWYgKCFkZWZWYWwpIHtcbiAgICAgICAgICAgIGNvbnN0IGZpbGVOYW1lID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2ZpbGVuYW1lJyk7XG4gICAgICAgICAgICBpZiAoZmlsZU5hbWUgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgZGVmVmFsID0gZmlsZU5hbWUudHJpbSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQnVpbGQgdHJlZSBzdHJ1Y3R1cmUgZnJvbSBmaWxlc1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXMgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5idWlsZFRyZWVTdHJ1Y3R1cmUoZmlsZXMsIGRlZlZhbCk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIHZhbHVlcyBhcnJheSBmb3IgZHJvcGRvd24gd2l0aCBhbGwgaXRlbXMgKGluY2x1ZGluZyBmb2xkZXJzKVxuICAgICAgICBjb25zdCBkcm9wZG93blZhbHVlcyA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtcy5tYXAoKGl0ZW0sIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBpZiAoaXRlbS50eXBlID09PSAnZm9sZGVyJykge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGl0ZW0ubmFtZS5yZXBsYWNlKC88W14+XSo+L2csICcnKSwgLy8gUmVtb3ZlIEhUTUwgdGFncyBmb3Igc2VhcmNoXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ6IHRydWVcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBpdGVtLm5hbWUucmVwbGFjZSgvPFtePl0qPi9nLCAnJyksIC8vIFJlbW92ZSBIVE1MIHRhZ3MgZm9yIHNlYXJjaFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogaXRlbS52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWQ6IGl0ZW0uc2VsZWN0ZWRcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBkcm9wZG93biB3aXRoIHZhbHVlc1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXR1cCBtZW51Jywge1xuICAgICAgICAgICAgdmFsdWVzOiBkcm9wZG93blZhbHVlc1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCB0aGUgZGVmYXVsdCBzZWxlY3RlZCB2YWx1ZSBpZiBhbnlcbiAgICAgICAgY29uc3Qgc2VsZWN0ZWRJdGVtID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zLmZpbmQoaXRlbSA9PiBpdGVtLnNlbGVjdGVkKTtcbiAgICAgICAgaWYgKHNlbGVjdGVkSXRlbSkge1xuICAgICAgICAgICAgLy8gVXNlIHNldFRpbWVvdXQgdG8gZW5zdXJlIGRyb3Bkb3duIGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBTZXR0aW5nIHNlbGVjdGVkIHZhbHVlIHdpbGwgdHJpZ2dlciBvbkNoYW5nZSBjYWxsYmFjayB3aGljaCBjYWxscyB1cGRhdGVMb2dGcm9tU2VydmVyKClcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBzZWxlY3RlZEl0ZW0udmFsdWUpO1xuICAgICAgICAgICAgICAgIC8vIEZvcmNlIHJlZnJlc2ggdGhlIGRyb3Bkb3duIHRvIHNob3cgdGhlIHNlbGVjdGVkIHZhbHVlXG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bigncmVmcmVzaCcpO1xuICAgICAgICAgICAgICAgIC8vIEFsc28gc2V0IHRoZSB0ZXh0IHRvIHNob3cgZnVsbCBwYXRoXG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignc2V0IHRleHQnLCBzZWxlY3RlZEl0ZW0udmFsdWUpO1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmaWxlbmFtZScsIHNlbGVjdGVkSXRlbS52YWx1ZSk7XG4gICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICB9IGVsc2UgaWYgKGRlZlZhbCkge1xuICAgICAgICAgICAgLy8gSWYgd2UgaGF2ZSBhIGRlZmF1bHQgdmFsdWUgYnV0IG5vIGl0ZW0gd2FzIG1hcmtlZCBhcyBzZWxlY3RlZCxcbiAgICAgICAgICAgIC8vIHRyeSB0byBmaW5kIGFuZCBzZWxlY3QgaXQgbWFudWFsbHlcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1Ub1NlbGVjdCA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtcy5maW5kKGl0ZW0gPT5cbiAgICAgICAgICAgICAgICBpdGVtLnR5cGUgPT09ICdmaWxlJyAmJiBpdGVtLnZhbHVlID09PSBkZWZWYWxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBpZiAoaXRlbVRvU2VsZWN0KSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNldHRpbmcgc2VsZWN0ZWQgdmFsdWUgd2lsbCB0cmlnZ2VyIG9uQ2hhbmdlIGNhbGxiYWNrIHdoaWNoIGNhbGxzIHVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKVxuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBpdGVtVG9TZWxlY3QudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdyZWZyZXNoJyk7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldCB0ZXh0JywgaXRlbVRvU2VsZWN0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2ZpbGVuYW1lJywgaXRlbVRvU2VsZWN0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBIaWRlIHRoZSBkaW1tZXIgYWZ0ZXIgbG9hZGluZyBvbmx5IGlmIG5vIGZpbGUgaXMgc2VsZWN0ZWRcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEhpZGUgdGhlIGRpbW1lciBhZnRlciBsb2FkaW5nIG9ubHkgaWYgbm8gZmlsZSBpcyBzZWxlY3RlZFxuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBNYXJrIGluaXRpYWxpemF0aW9uIGFzIGNvbXBsZXRlIHRvIGFsbG93IGhhc2hjaGFuZ2UgaGFuZGxlciB0byB3b3JrXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNJbml0aWFsaXppbmcgPSBmYWxzZTtcbiAgICAgICAgfSwgMjAwKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgY2hhbmdpbmcgdGhlIGxvZyBmaWxlIGluIHRoZSBzZWxlY3QgZHJvcGRvd24uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHNlbGVjdGVkIHZhbHVlLlxuICAgICAqL1xuICAgIGNiT25DaGFuZ2VGaWxlKHZhbHVlKSB7XG4gICAgICAgIGlmICh2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBkcm9wZG93biB0ZXh0IHRvIHNob3cgdGhlIGZ1bGwgZmlsZSBwYXRoXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldCB0ZXh0JywgdmFsdWUpO1xuXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmaWxlbmFtZScsIHZhbHVlKTtcblxuICAgICAgICAvLyBVcGRhdGUgVVJMIGhhc2ggd2l0aCB0aGUgc2VsZWN0ZWQgZmlsZVxuICAgICAgICB3aW5kb3cubG9jYXRpb24uaGFzaCA9ICdmaWxlPScgKyBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpO1xuXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRmV0Y2hlcyB0aGUgbG9nIGZpbGUgY29udGVudCBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAgICovXG4gICAgdXBkYXRlTG9nRnJvbVNlcnZlcigpIHtcbiAgICAgICAgY29uc3QgcGFyYW1zID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBTeXNsb2dBUEkuZ2V0TG9nRnJvbUZpbGUocGFyYW1zLCBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jYlVwZGF0ZUxvZ1RleHQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSBsb2cgdmlldy5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSBBUEkuXG4gICAgICovXG4gICAgY2JVcGRhdGVMb2dUZXh0KHJlc3BvbnNlKSB7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuXG4gICAgICAgIC8vIEhhbmRsZSB2MyBBUEkgcmVzcG9uc2Ugc3RydWN0dXJlXG4gICAgICAgIGlmICghcmVzcG9uc2UgfHwgIXJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLm1lc3NhZ2VzKSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNvbnRlbnQgPSByZXNwb25zZS5kYXRhPy5jb250ZW50IHx8ICcnO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIuZ2V0U2Vzc2lvbigpLnNldFZhbHVlKGNvbnRlbnQpO1xuICAgICAgICBjb25zdCByb3cgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIuc2Vzc2lvbi5nZXRMZW5ndGgoKSAtIDE7XG4gICAgICAgIGNvbnN0IGNvbHVtbiA9IHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlci5zZXNzaW9uLmdldExpbmUocm93KS5sZW5ndGg7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlci5nb3RvTGluZShyb3cgKyAxLCBjb2x1bW4pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBjbGlja2luZyB0aGUgXCJEb3dubG9hZCBGaWxlXCIgYnV0dG9uLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBkYXRhLlxuICAgICAqL1xuICAgIGNiRG93bmxvYWRGaWxlKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIEhhbmRsZSB2MyBBUEkgcmVzcG9uc2Ugc3RydWN0dXJlXG4gICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gcmVzcG9uc2UuZGF0YS5maWxlbmFtZSB8fCByZXNwb25zZS5kYXRhO1xuICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLm1lc3NhZ2VzKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGNsaWNraW5nIHRoZSBcIkVyYXNlIEZpbGVcIiBidXR0b24uXG4gICAgICovXG4gICAgZXJhc2VDdXJyZW50RmlsZUNvbnRlbnQoKXtcbiAgICAgICAgY29uc3QgZmlsZU5hbWUgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZmlsZW5hbWUnKTtcbiAgICAgICAgaWYgKGZpbGVOYW1lLmxlbmd0aD4wKXtcbiAgICAgICAgICAgIFN5c2xvZ0FQSS5lcmFzZUZpbGUoZmlsZU5hbWUsIHN5c3RlbURpYWdub3N0aWNMb2dzLmNiQWZ0ZXJGaWxlRXJhc2VkKVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGNsaWNraW5nIHRoZSBcIkVyYXNlIEZpbGVcIiBidXR0b24gYW5kIGNhbGxpbmcgUkVTVCBBUEkgY29tbWFuZFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBkYXRhLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJGaWxlRXJhc2VkKHJlc3BvbnNlKXtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdD09PWZhbHNlICYmIHJlc3BvbnNlLm1lc3NhZ2VzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy51cGRhdGVMb2dGcm9tU2VydmVyKCk7XG4gICAgICAgIH1cbiAgICB9LFxufTtcblxuLy8gV2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHksIGluaXRpYWxpemUgdGhlIHNob3cgc3lzdGVtIGxvZ3MgdGFiXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaW5pdGlhbGl6ZSgpO1xufSk7Il19