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
      var aceHeight = window.innerHeight - systemDiagnosticLogs.$logContent.offset().top - 25;

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
        systemDiagnosticLogs.$fileSelectDropDown.dropdown('set selected', selectedItem.value); // Force refresh the dropdown to show the selected value

        systemDiagnosticLogs.$fileSelectDropDown.dropdown('refresh'); // Also set the text to show full path

        systemDiagnosticLogs.$fileSelectDropDown.dropdown('set text', selectedItem.value); // Automatically load the log content when a file is pre-selected

        systemDiagnosticLogs.$formObj.form('set value', 'filename', selectedItem.value);
        systemDiagnosticLogs.updateLogFromServer();
      }, 100);
    } else if (defVal) {
      // If we have a default value but no item was marked as selected,
      // try to find and select it manually
      var itemToSelect = systemDiagnosticLogs.logsItems.find(function (item) {
        return item.type === 'file' && item.value === defVal;
      });

      if (itemToSelect) {
        setTimeout(function () {
          systemDiagnosticLogs.$fileSelectDropDown.dropdown('set selected', itemToSelect.value);
          systemDiagnosticLogs.$fileSelectDropDown.dropdown('refresh');
          systemDiagnosticLogs.$fileSelectDropDown.dropdown('set text', itemToSelect.value);
          systemDiagnosticLogs.$formObj.form('set value', 'filename', itemToSelect.value);
          systemDiagnosticLogs.updateLogFromServer();
        }, 100);
      } else {
        // Hide the dimmer after loading only if no file is selected
        systemDiagnosticLogs.$dimmer.removeClass('active');
      }
    } else {
      // Hide the dimmer after loading only if no file is selected
      systemDiagnosticLogs.$dimmer.removeClass('active');
    }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TeXN0ZW1EaWFnbm9zdGljL3N5c3RlbS1kaWFnbm9zdGljLWluZGV4LXNob3dsb2dzLmpzIl0sIm5hbWVzIjpbInN5c3RlbURpYWdub3N0aWNMb2dzIiwiJHNob3dCdG4iLCIkIiwiJGRvd25sb2FkQnRuIiwiJHNob3dBdXRvQnRuIiwiJGVyYXNlQnRuIiwiJGxvZ0NvbnRlbnQiLCJ2aWV3ZXIiLCIkZmlsZVNlbGVjdERyb3BEb3duIiwibG9nc0l0ZW1zIiwiJGRpbW1lciIsIiRmb3JtT2JqIiwiaW5pdGlhbGl6ZSIsImFjZUhlaWdodCIsIndpbmRvdyIsImlubmVySGVpZ2h0IiwiY2xvc2VzdCIsImNzcyIsImNyZWF0ZURyb3Bkb3duRnJvbUhpZGRlbklucHV0IiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsImNiT25DaGFuZ2VGaWxlIiwiaWdub3JlQ2FzZSIsImZ1bGxUZXh0U2VhcmNoIiwiZm9yY2VTZWxlY3Rpb24iLCJwcmVzZXJ2ZUhUTUwiLCJhbGxvd0NhdGVnb3J5U2VsZWN0aW9uIiwibWF0Y2giLCJmaWx0ZXJSZW1vdGVEYXRhIiwiYWN0aW9uIiwidGVtcGxhdGVzIiwibWVudSIsImN1c3RvbURyb3Bkb3duTWVudSIsImluaXRpYWxpemVBY2UiLCJTeXNsb2dBUEkiLCJnZXRMb2dzTGlzdCIsImNiRm9ybWF0RHJvcGRvd25SZXN1bHRzIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJ1cGRhdGVMb2dGcm9tU2VydmVyIiwiaGFuZGxlSGFzaENoYW5nZSIsImRhdGEiLCJmb3JtIiwiZG93bmxvYWRMb2dGaWxlIiwiZmlsZW5hbWUiLCJjYkRvd25sb2FkRmlsZSIsIiRyZWxvYWRJY29uIiwiZmluZCIsImhhc0NsYXNzIiwicmVtb3ZlQ2xhc3MiLCJ1cGRhdGVMb2dWaWV3V29ya2VyIiwic3RvcCIsImFkZENsYXNzIiwiZXJhc2VDdXJyZW50RmlsZUNvbnRlbnQiLCJrZXl1cCIsImV2ZW50Iiwia2V5Q29kZSIsInRvZ2dsZUZ1bGxTY3JlZW4iLCJkb2N1bWVudCIsImFkZEV2ZW50TGlzdGVuZXIiLCJhZGp1c3RMb2dIZWlnaHQiLCJsb2dDb250YWluZXIiLCJnZXRFbGVtZW50QnlJZCIsImZ1bGxzY3JlZW5FbGVtZW50IiwicmVxdWVzdEZ1bGxzY3JlZW4iLCJlcnIiLCJjb25zb2xlIiwiZXJyb3IiLCJtZXNzYWdlIiwiZXhpdEZ1bGxzY3JlZW4iLCJzZXRUaW1lb3V0Iiwib2Zmc2V0IiwidG9wIiwicmVzaXplIiwiJGhpZGRlbklucHV0IiwibGVuZ3RoIiwiJGRyb3Bkb3duIiwiaWQiLCJhcHBlbmQiLCJ0ZXh0IiwiYmVmb3JlIiwiaGlkZSIsImFjZSIsImVkaXQiLCJqdWxpYSIsInJlcXVpcmUiLCJ1bmRlZmluZWQiLCJJbmlNb2RlIiwiTW9kZSIsInNlc3Npb24iLCJzZXRNb2RlIiwic2V0VGhlbWUiLCJyZW5kZXJlciIsInNldFNob3dHdXR0ZXIiLCJzZXRPcHRpb25zIiwic2hvd0xpbmVOdW1iZXJzIiwic2hvd1ByaW50TWFyZ2luIiwicmVhZE9ubHkiLCJidWlsZFRyZWVTdHJ1Y3R1cmUiLCJmaWxlcyIsImRlZmF1bHRQYXRoIiwidHJlZSIsIk9iamVjdCIsImVudHJpZXMiLCJmb3JFYWNoIiwia2V5IiwiZmlsZURhdGEiLCJmaWxlUGF0aCIsInBhdGgiLCJwYXJ0cyIsInNwbGl0IiwiY3VycmVudCIsInBhcnQiLCJpbmRleCIsInR5cGUiLCJzaXplIiwiY2hpbGRyZW4iLCJ0cmVlVG9Ecm9wZG93bkl0ZW1zIiwicHJlZml4IiwiaXRlbXMiLCJzb3J0IiwiYUtleSIsImFWYWwiLCJiS2V5IiwiYlZhbCIsImxvY2FsZUNvbXBhcmUiLCJ2YWx1ZSIsInB1c2giLCJuYW1lIiwiZGlzYWJsZWQiLCJjaGlsZEl0ZW1zIiwic2VsZWN0ZWQiLCJyZXNwb25zZSIsImZpZWxkcyIsInZhbHVlcyIsImh0bWwiLCJlYWNoIiwib3B0aW9uIiwiaXRlbSIsIm1heWJlRGlzYWJsZWQiLCJoYXNoIiwibG9jYXRpb24iLCJzdGFydHNXaXRoIiwiZGVjb2RlVVJJQ29tcG9uZW50Iiwic3Vic3RyaW5nIiwiZmlsZUV4aXN0cyIsInNvbWUiLCJnZXRGaWxlRnJvbUhhc2giLCJyZXN1bHQiLCJkZWZWYWwiLCJmaWxlTmFtZSIsInRyaW0iLCJkcm9wZG93blZhbHVlcyIsIm1hcCIsInJlcGxhY2UiLCJzZWxlY3RlZEl0ZW0iLCJpdGVtVG9TZWxlY3QiLCJlbmNvZGVVUklDb21wb25lbnQiLCJwYXJhbXMiLCJnZXRMb2dGcm9tRmlsZSIsImNiVXBkYXRlTG9nVGV4dCIsIm1lc3NhZ2VzIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJjb250ZW50IiwiZ2V0U2Vzc2lvbiIsInNldFZhbHVlIiwicm93IiwiZ2V0TGVuZ3RoIiwiY29sdW1uIiwiZ2V0TGluZSIsImdvdG9MaW5lIiwiZXJhc2VGaWxlIiwiY2JBZnRlckZpbGVFcmFzZWQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLG9CQUFvQixHQUFHO0FBQ3pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLGdCQUFELENBTGM7O0FBT3pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBQVksRUFBRUQsQ0FBQyxDQUFDLGdCQUFELENBWFU7O0FBYXpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLFlBQVksRUFBRUYsQ0FBQyxDQUFDLHFCQUFELENBakJVOztBQW1CekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUcsRUFBQUEsU0FBUyxFQUFFSCxDQUFDLENBQUMsYUFBRCxDQXZCYTs7QUF5QnpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lJLEVBQUFBLFdBQVcsRUFBRUosQ0FBQyxDQUFDLHVCQUFE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QUFJQSxRQUFRLENBQUM2QixRQUF6QixFQUFtQztBQUN0Q0MsTUFBQUEsV0FBVyxDQUFDQyxlQUFaLENBQTRCL0IsUUFBUSxDQUFDNkIsUUFBckM7QUFDSDtBQUNKLEdBemhCd0I7O0FBMmhCekI7QUFDSjtBQUNBO0FBQ0k1RyxFQUFBQSx1QkE5aEJ5QixxQ0E4aEJBO0FBQ3JCLFFBQU1pRyxRQUFRLEdBQUd2SixvQkFBb0IsQ0FBQ1csUUFBckIsQ0FBOEJnQyxJQUE5QixDQUFtQyxXQUFuQyxFQUFnRCxVQUFoRCxDQUFqQjs7QUFDQSxRQUFJNEcsUUFBUSxDQUFDM0UsTUFBVCxHQUFnQixDQUFwQixFQUFzQjtBQUNsQjFDLE1BQUFBLFNBQVMsQ0FBQzJJLFNBQVYsQ0FBb0J0QixRQUFwQixFQUE4QnZKLG9CQUFvQixDQUFDOEssaUJBQW5EO0FBQ0g7QUFDSixHQW5pQndCOztBQXFpQnpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lBLEVBQUFBLGlCQXppQnlCLDZCQXlpQlB6QyxRQXppQk8sRUF5aUJFO0FBQ3ZCLFFBQUlBLFFBQVEsQ0FBQ2dCLE1BQVQsS0FBa0IsS0FBbEIsSUFBMkJoQixRQUFRLENBQUM2QixRQUFULEtBQXNCM0UsU0FBckQsRUFBZ0U7QUFDNUQ0RSxNQUFBQSxXQUFXLENBQUNDLGVBQVosQ0FBNEIvQixRQUFRLENBQUM2QixRQUFyQztBQUNILEtBRkQsTUFFTztBQUNIbEssTUFBQUEsb0JBQW9CLENBQUN3QyxtQkFBckI7QUFDSDtBQUNKO0FBL2lCd0IsQ0FBN0IsQyxDQWtqQkE7O0FBQ0F0QyxDQUFDLENBQUN5RCxRQUFELENBQUQsQ0FBWW9ILEtBQVosQ0FBa0IsWUFBTTtBQUNwQi9LLEVBQUFBLG9CQUFvQixDQUFDWSxVQUFyQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuLyogZ2xvYmFsIGFjZSwgUGJ4QXBpLCBTeXNsb2dBUEksIHVwZGF0ZUxvZ1ZpZXdXb3JrZXIsIEFjZSwgVXNlck1lc3NhZ2UgKi9cbiBcbi8qKlxuICogUmVwcmVzZW50cyB0aGUgc3lzdGVtIGRpYWdub3N0aWMgbG9ncyBvYmplY3QuXG4gKlxuICogQG1vZHVsZSBzeXN0ZW1EaWFnbm9zdGljTG9nc1xuICovXG5jb25zdCBzeXN0ZW1EaWFnbm9zdGljTG9ncyA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgXCJTaG93IExhc3QgTG9nXCIgYnV0dG9uLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNob3dCdG46ICQoJyNzaG93LWxhc3QtbG9nJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgXCJEb3dubG9hZCBGaWxlXCIgYnV0dG9uLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRvd25sb2FkQnRuOiAkKCcjZG93bmxvYWQtZmlsZScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIFwiU2hvdyBMYXN0IExvZyAoQXV0bylcIiBidXR0b24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc2hvd0F1dG9CdG46ICQoJyNzaG93LWxhc3QtbG9nLWF1dG8nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBcIkVyYXNlIGN1cnJlbnQgZmlsZSBjb250ZW50XCIgYnV0dG9uLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGVyYXNlQnRuOiAkKCcjZXJhc2UtZmlsZScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGxvZyBjb250ZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGxvZ0NvbnRlbnQ6ICQoJyNsb2ctY29udGVudC1yZWFkb25seScpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIHZpZXdlciBmb3IgZGlzcGxheWluZyB0aGUgbG9nIGNvbnRlbnQuXG4gICAgICogQHR5cGUge0FjZX1cbiAgICAgKi9cbiAgICB2aWV3ZXI6ICcnLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZpbGUgc2VsZWN0IGRyb3Bkb3duLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZpbGVTZWxlY3REcm9wRG93bjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEFycmF5IG9mIGxvZyBpdGVtcy5cbiAgICAgKiBAdHlwZSB7QXJyYXl9XG4gICAgICovXG4gICAgbG9nc0l0ZW1zOiBbXSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBkaW1tZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGltbWVyOiAkKCcjZ2V0LWxvZ3MtZGltbWVyJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjc3lzdGVtLWRpYWdub3N0aWMtZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIHN5c3RlbSBkaWFnbm9zdGljIGxvZ3MuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgY29uc3QgYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gMjUwO1xuXG4gICAgICAgIC8vIFNldCB0aGUgbWluaW11bSBoZWlnaHQgb2YgdGhlIGxvZyBjb250YWluZXJcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5jbG9zZXN0KCdkaXYnKS5jc3MoJ21pbi1oZWlnaHQnLCBgJHthY2VIZWlnaHR9cHhgKTtcblxuICAgICAgICAvLyBDcmVhdGUgZHJvcGRvd24gVUkgZnJvbSBoaWRkZW4gaW5wdXQgKFY1LjAgcGF0dGVybilcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY3JlYXRlRHJvcGRvd25Gcm9tSGlkZGVuSW5wdXQoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBkcm9wZG93biBtZW51IGZvciBsb2cgZmlsZXMgd2l0aCB0cmVlIHN1cHBvcnRcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTZW1hbnRpYyBVSSBkcm9wZG93biB3aXRoIGN1c3RvbSBtZW51IGdlbmVyYXRpb25cbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6IHN5c3RlbURpYWdub3N0aWNMb2dzLmNiT25DaGFuZ2VGaWxlLFxuICAgICAgICAgICAgICAgIGlnbm9yZUNhc2U6IHRydWUsXG4gICAgICAgICAgICAgICAgZnVsbFRleHRTZWFyY2g6IHRydWUsXG4gICAgICAgICAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgICAgIHByZXNlcnZlSFRNTDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBhbGxvd0NhdGVnb3J5U2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBtYXRjaDogJ3RleHQnLFxuICAgICAgICAgICAgICAgIGZpbHRlclJlbW90ZURhdGE6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGFjdGlvbjogJ2FjdGl2YXRlJyxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgbWVudTogc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY3VzdG9tRHJvcGRvd25NZW51XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBBQ0UgZWRpdG9yIGZvciBsb2cgY29udGVudFxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pbml0aWFsaXplQWNlKCk7XG5cbiAgICAgICAgLy8gRmV0Y2ggdGhlIGxpc3Qgb2YgbG9nIGZpbGVzXG4gICAgICAgIFN5c2xvZ0FQSS5nZXRMb2dzTGlzdChzeXN0ZW1EaWFnbm9zdGljTG9ncy5jYkZvcm1hdERyb3Bkb3duUmVzdWx0cyk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIFwiU2hvdyBMb2dcIiBidXR0b24gY2xpY2tcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJHNob3dCdG4ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gTGlzdGVuIGZvciBoYXNoIGNoYW5nZXMgdG8gdXBkYXRlIHNlbGVjdGVkIGZpbGVcbiAgICAgICAgJCh3aW5kb3cpLm9uKCdoYXNoY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaGFuZGxlSGFzaENoYW5nZSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgXCJEb3dubG9hZCBMb2dcIiBidXR0b24gY2xpY2tcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRvd25sb2FkQnRuLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCBkYXRhID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICAgICAgU3lzbG9nQVBJLmRvd25sb2FkTG9nRmlsZShkYXRhLmZpbGVuYW1lLCB0cnVlLCBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jYkRvd25sb2FkRmlsZSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciBcIkF1dG8gUmVmcmVzaFwiIGJ1dHRvbiBjbGlja1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kc2hvd0F1dG9CdG4ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0ICRyZWxvYWRJY29uID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJHNob3dBdXRvQnRuLmZpbmQoJ2kucmVmcmVzaCcpO1xuICAgICAgICAgICAgaWYgKCRyZWxvYWRJY29uLmhhc0NsYXNzKCdsb2FkaW5nJykpIHtcbiAgICAgICAgICAgICAgICAkcmVsb2FkSWNvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIHVwZGF0ZUxvZ1ZpZXdXb3JrZXIuc3RvcCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkcmVsb2FkSWNvbi5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIHVwZGF0ZUxvZ1ZpZXdXb3JrZXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgdGhlIFwiRXJhc2UgZmlsZVwiIGJ1dHRvbiBjbGlja1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZXJhc2VCdG4ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmVyYXNlQ3VycmVudEZpbGVDb250ZW50KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciBFbnRlciBrZXlwcmVzcyBvbiBpbnB1dCBmaWVsZHNcbiAgICAgICAgJCgnaW5wdXQnKS5rZXl1cCgoZXZlbnQpID0+IHtcbiAgICAgICAgICAgIGlmIChldmVudC5rZXlDb2RlID09PSAxMykge1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIEZ1bGxzY3JlZW4gYnV0dG9uIGNsaWNrXG4gICAgICAgICQoJy5mdWxsc2NyZWVuLXRvZ2dsZS1idG4nKS5vbignY2xpY2snLCBzeXN0ZW1EaWFnbm9zdGljTG9ncy50b2dnbGVGdWxsU2NyZWVuKTtcblxuICAgICAgICAvLyBMaXN0ZW5pbmcgZm9yIHRoZSBmdWxsc2NyZWVuIGNoYW5nZSBldmVudFxuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdmdWxsc2NyZWVuY2hhbmdlJywgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuYWRqdXN0TG9nSGVpZ2h0KTtcblxuICAgICAgICAvLyBJbml0aWFsIGhlaWdodCBjYWxjdWxhdGlvblxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5hZGp1c3RMb2dIZWlnaHQoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlcyB0aGUgZnVsbC1zY3JlZW4gbW9kZSBvZiB0aGUgJ3N5c3RlbS1sb2dzLXNlZ21lbnQnIGVsZW1lbnQuXG4gICAgICogSWYgdGhlIGVsZW1lbnQgaXMgbm90IGluIGZ1bGwtc2NyZWVuIG1vZGUsIGl0IHJlcXVlc3RzIGZ1bGwtc2NyZWVuIG1vZGUuXG4gICAgICogSWYgdGhlIGVsZW1lbnQgaXMgYWxyZWFkeSBpbiBmdWxsLXNjcmVlbiBtb2RlLCBpdCBleGl0cyBmdWxsLXNjcmVlbiBtb2RlLlxuICAgICAqIExvZ3MgYW4gZXJyb3IgbWVzc2FnZSB0byB0aGUgY29uc29sZSBpZiB0aGVyZSBpcyBhbiBpc3N1ZSBlbmFibGluZyBmdWxsLXNjcmVlbiBtb2RlLlxuICAgICAqXG4gICAgICogQHJldHVybiB7dm9pZH1cbiAgICAgKi9cbiAgICB0b2dnbGVGdWxsU2NyZWVuKCkge1xuICAgICAgICBjb25zdCBsb2dDb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc3lzdGVtLWxvZ3Mtc2VnbWVudCcpO1xuXG4gICAgICAgIGlmICghZG9jdW1lbnQuZnVsbHNjcmVlbkVsZW1lbnQpIHtcbiAgICAgICAgICAgIGxvZ0NvbnRhaW5lci5yZXF1ZXN0RnVsbHNjcmVlbigpLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGBFcnJvciBhdHRlbXB0aW5nIHRvIGVuYWJsZSBmdWxsLXNjcmVlbiBtb2RlOiAke2Vyci5tZXNzYWdlfWApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkb2N1bWVudC5leGl0RnVsbHNjcmVlbigpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZ1bmN0aW9uIHRvIGFkanVzdCB0aGUgaGVpZ2h0IG9mIHRoZSBsb2dzIGRlcGVuZGluZyBvbiB0aGUgc2NyZWVuIG1vZGUuXG4gICAgICovXG4gICAgYWRqdXN0TG9nSGVpZ2h0KCkge1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIGxldCBhY2VIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kbG9nQ29udGVudC5vZmZzZXQoKS50b3AgLSAyNTtcbiAgICAgICAgICAgIGlmIChkb2N1bWVudC5mdWxsc2NyZWVuRWxlbWVudCkge1xuICAgICAgICAgICAgICAgIC8vIElmIGZ1bGxzY3JlZW4gbW9kZSBpcyBhY3RpdmVcbiAgICAgICAgICAgICAgICBhY2VIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSA4MDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFJlY2FsY3VsYXRlIHRoZSBzaXplIG9mIHRoZSBBQ0UgZWRpdG9yXG4gICAgICAgICAgICAkKCcubG9nLWNvbnRlbnQtcmVhZG9ubHknKS5jc3MoJ21pbi1oZWlnaHQnLCAgYCR7YWNlSGVpZ2h0fXB4YCk7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIucmVzaXplKCk7XG4gICAgICAgIH0sIDMwMCk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGRyb3Bkb3duIFVJIGVsZW1lbnQgZnJvbSBoaWRkZW4gaW5wdXQgZmllbGQgKFY1LjAgcGF0dGVybilcbiAgICAgKi9cbiAgICBjcmVhdGVEcm9wZG93bkZyb21IaWRkZW5JbnB1dCgpIHtcbiAgICAgICAgY29uc3QgJGhpZGRlbklucHV0ID0gJCgnI2ZpbGVuYW1lcycpO1xuXG4gICAgICAgIGlmICghJGhpZGRlbklucHV0Lmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignSGlkZGVuIGlucHV0ICNmaWxlbmFtZXMgbm90IGZvdW5kJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCc8ZGl2PicsIHtcbiAgICAgICAgICAgIGlkOiAnZmlsZW5hbWVzLWRyb3Bkb3duJyxcbiAgICAgICAgICAgIGNsYXNzOiAndWkgc2VsZWN0aW9uIGRyb3Bkb3duIGZpbGVuYW1lcy1zZWxlY3QgZmx1aWQnXG4gICAgICAgIH0pO1xuXG4gICAgICAgICRkcm9wZG93bi5hcHBlbmQoXG4gICAgICAgICAgICAkKCc8aT4nLCB7IGNsYXNzOiAnZHJvcGRvd24gaWNvbicgfSksXG4gICAgICAgICAgICAkKCc8ZGl2PicsIHsgY2xhc3M6ICdkZWZhdWx0IHRleHQnIH0pLnRleHQoJ1NlbGVjdCBsb2cgZmlsZScpLFxuICAgICAgICAgICAgJCgnPGRpdj4nLCB7IGNsYXNzOiAnbWVudScgfSlcbiAgICAgICAgKTtcblxuICAgICAgICAkaGlkZGVuSW5wdXQuYmVmb3JlKCRkcm9wZG93bik7XG4gICAgICAgICRoaWRkZW5JbnB1dC5oaWRlKCk7XG5cbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93biA9ICRkcm9wZG93bjtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIEFDRSBlZGl0b3IgZm9yIGxvZyB2aWV3aW5nLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVBY2UoKSB7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlciA9IGFjZS5lZGl0KCdsb2ctY29udGVudC1yZWFkb25seScpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBKdWxpYSBtb2RlIGlzIGF2YWlsYWJsZVxuICAgICAgICBjb25zdCBqdWxpYSA9IGFjZS5yZXF1aXJlKCdhY2UvbW9kZS9qdWxpYScpO1xuICAgICAgICBpZiAoanVsaWEgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gU2V0IHRoZSBtb2RlIHRvIEp1bGlhIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgY29uc3QgSW5pTW9kZSA9IGp1bGlhLk1vZGU7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIuc2Vzc2lvbi5zZXRNb2RlKG5ldyBJbmlNb2RlKCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0IHRoZSB0aGVtZSBhbmQgb3B0aW9ucyBmb3IgdGhlIEFDRSBlZGl0b3JcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIucmVuZGVyZXIuc2V0U2hvd0d1dHRlcihmYWxzZSk7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlci5zZXRPcHRpb25zKHtcbiAgICAgICAgICAgIHNob3dMaW5lTnVtYmVyczogZmFsc2UsXG4gICAgICAgICAgICBzaG93UHJpbnRNYXJnaW46IGZhbHNlLFxuICAgICAgICAgICAgcmVhZE9ubHk6IHRydWUsXG4gICAgICAgIH0pO1xuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJ1aWxkcyBhIGhpZXJhcmNoaWNhbCB0cmVlIHN0cnVjdHVyZSBmcm9tIGZsYXQgZmlsZSBwYXRoc1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBmaWxlcyAtIFRoZSBmaWxlcyBvYmplY3QgZnJvbSBBUEkgcmVzcG9uc2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZGVmYXVsdFBhdGggLSBUaGUgZGVmYXVsdCBzZWxlY3RlZCBmaWxlIHBhdGhcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFRyZWUgc3RydWN0dXJlIGZvciB0aGUgZHJvcGRvd25cbiAgICAgKi9cbiAgICBidWlsZFRyZWVTdHJ1Y3R1cmUoZmlsZXMsIGRlZmF1bHRQYXRoKSB7XG4gICAgICAgIGNvbnN0IHRyZWUgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIHRoZSB0cmVlIHN0cnVjdHVyZVxuICAgICAgICBPYmplY3QuZW50cmllcyhmaWxlcykuZm9yRWFjaCgoW2tleSwgZmlsZURhdGFdKSA9PiB7XG4gICAgICAgICAgICAvLyBVc2UgZmlsZURhdGEucGF0aCBhcyB0aGUgYWN0dWFsIGZpbGUgcGF0aFxuICAgICAgICAgICAgY29uc3QgZmlsZVBhdGggPSBmaWxlRGF0YS5wYXRoIHx8IGtleTtcbiAgICAgICAgICAgIGNvbnN0IHBhcnRzID0gZmlsZVBhdGguc3BsaXQoJy8nKTtcbiAgICAgICAgICAgIGxldCBjdXJyZW50ID0gdHJlZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcGFydHMuZm9yRWFjaCgocGFydCwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoaW5kZXggPT09IHBhcnRzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBpcyBhIGZpbGVcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudFtwYXJ0XSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdmaWxlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IGZpbGVQYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2l6ZTogZmlsZURhdGEuc2l6ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IChkZWZhdWx0UGF0aCAmJiBkZWZhdWx0UGF0aCA9PT0gZmlsZVBhdGgpIHx8ICghZGVmYXVsdFBhdGggJiYgZmlsZURhdGEuZGVmYXVsdClcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBUaGlzIGlzIGEgZGlyZWN0b3J5XG4gICAgICAgICAgICAgICAgICAgIGlmICghY3VycmVudFtwYXJ0XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudFtwYXJ0XSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZm9sZGVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjoge31cbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY3VycmVudCA9IGN1cnJlbnRbcGFydF0uY2hpbGRyZW47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29udmVydCB0cmVlIHRvIGRyb3Bkb3duIGl0ZW1zXG4gICAgICAgIHJldHVybiB0aGlzLnRyZWVUb0Ryb3Bkb3duSXRlbXModHJlZSwgJycpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ29udmVydHMgdHJlZSBzdHJ1Y3R1cmUgdG8gZHJvcGRvd24gaXRlbXMgd2l0aCBwcm9wZXIgZm9ybWF0dGluZ1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSB0cmVlIC0gVGhlIHRyZWUgc3RydWN0dXJlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHByZWZpeCAtIFByZWZpeCBmb3IgaW5kZW50YXRpb25cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IEZvcm1hdHRlZCBkcm9wZG93biBpdGVtc1xuICAgICAqL1xuICAgIHRyZWVUb0Ryb3Bkb3duSXRlbXModHJlZSwgcHJlZml4KSB7XG4gICAgICAgIGNvbnN0IGl0ZW1zID0gW107XG4gICAgICAgIFxuICAgICAgICAvLyBTb3J0IGVudHJpZXM6IGZvbGRlcnMgZmlyc3QsIHRoZW4gZmlsZXNcbiAgICAgICAgY29uc3QgZW50cmllcyA9IE9iamVjdC5lbnRyaWVzKHRyZWUpLnNvcnQoKFthS2V5LCBhVmFsXSwgW2JLZXksIGJWYWxdKSA9PiB7XG4gICAgICAgICAgICBpZiAoYVZhbC50eXBlID09PSAnZm9sZGVyJyAmJiBiVmFsLnR5cGUgPT09ICdmaWxlJykgcmV0dXJuIC0xO1xuICAgICAgICAgICAgaWYgKGFWYWwudHlwZSA9PT0gJ2ZpbGUnICYmIGJWYWwudHlwZSA9PT0gJ2ZvbGRlcicpIHJldHVybiAxO1xuICAgICAgICAgICAgcmV0dXJuIGFLZXkubG9jYWxlQ29tcGFyZShiS2V5KTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBlbnRyaWVzLmZvckVhY2goKFtrZXksIHZhbHVlXSkgPT4ge1xuICAgICAgICAgICAgaWYgKHZhbHVlLnR5cGUgPT09ICdmb2xkZXInKSB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIGZvbGRlciBoZWFkZXJcbiAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogYCR7cHJlZml4fTxpIGNsYXNzPVwiZm9sZGVyIGljb25cIj48L2k+ICR7a2V5fWAsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdmb2xkZXInXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQWRkIGNoaWxkcmVuIHdpdGggaW5jcmVhc2VkIGluZGVudGF0aW9uXG4gICAgICAgICAgICAgICAgY29uc3QgY2hpbGRJdGVtcyA9IHRoaXMudHJlZVRvRHJvcGRvd25JdGVtcyh2YWx1ZS5jaGlsZHJlbiwgcHJlZml4ICsgJyZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOycpO1xuICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goLi4uY2hpbGRJdGVtcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEFkZCBmaWxlIGl0ZW1cbiAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogYCR7cHJlZml4fTxpIGNsYXNzPVwiZmlsZSBvdXRsaW5lIGljb25cIj48L2k+ICR7a2V5fSAoJHt2YWx1ZS5zaXplfSlgLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWUucGF0aCxcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWQ6IHZhbHVlLmRlZmF1bHQsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdmaWxlJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBpdGVtcztcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgY3VzdG9tIGRyb3Bkb3duIG1lbnUgSFRNTCBmb3IgbG9nIGZpbGVzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGNvbnRhaW5pbmcgZHJvcGRvd24gbWVudSBvcHRpb25zXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGZpZWxkcyAtIFRoZSBmaWVsZHMgaW4gdGhlIHJlc3BvbnNlIHRvIHVzZSBmb3IgdGhlIG1lbnUgb3B0aW9uc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBIVE1MIHN0cmluZyBmb3IgdGhlIGN1c3RvbSBkcm9wZG93biBtZW51XG4gICAgICovXG4gICAgY3VzdG9tRHJvcGRvd25NZW51KHJlc3BvbnNlLCBmaWVsZHMpIHtcbiAgICAgICAgY29uc3QgdmFsdWVzID0gcmVzcG9uc2VbZmllbGRzLnZhbHVlc10gfHwge307XG4gICAgICAgIGxldCBodG1sID0gJyc7XG4gICAgICAgIFxuICAgICAgICAkLmVhY2godmFsdWVzLCAoaW5kZXgsIG9wdGlvbikgPT4ge1xuICAgICAgICAgICAgLy8gRm9yIHRyZWUgc3RydWN0dXJlIGl0ZW1zXG4gICAgICAgICAgICBpZiAoc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zICYmIHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtc1tpbmRleF0pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpdGVtID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zW2luZGV4XTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoaXRlbS50eXBlID09PSAnZm9sZGVyJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBGb2xkZXIgaXRlbSAtIGRpc2FibGVkIGFuZCB3aXRoIGZvbGRlciBpY29uXG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJkaXNhYmxlZCBpdGVtXCIgZGF0YS12YWx1ZT1cIlwiPiR7aXRlbS5uYW1lfTwvZGl2PmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRmlsZSBpdGVtIHdpdGggcHJvcGVyIHZhbHVlXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdGVkID0gaXRlbS5zZWxlY3RlZCA/ICdzZWxlY3RlZCBhY3RpdmUnIDogJyc7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtICR7c2VsZWN0ZWR9XCIgZGF0YS12YWx1ZT1cIiR7b3B0aW9uW2ZpZWxkcy52YWx1ZV19XCI+JHtpdGVtLm5hbWV9PC9kaXY+YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIHJlZ3VsYXIgaXRlbVxuICAgICAgICAgICAgICAgIGNvbnN0IG1heWJlRGlzYWJsZWQgPSAob3B0aW9uW2ZpZWxkcy5kaXNhYmxlZF0pID8gJ2Rpc2FibGVkICcgOiAnJztcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiJHttYXliZURpc2FibGVkfWl0ZW1cIiBkYXRhLXZhbHVlPVwiJHtvcHRpb25bZmllbGRzLnZhbHVlXX1cIj4ke29wdGlvbltmaWVsZHMubmFtZV19PC9kaXY+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlcyBoYXNoIGNoYW5nZXMgdG8gdXBkYXRlIHRoZSBzZWxlY3RlZCBmaWxlXG4gICAgICovXG4gICAgaGFuZGxlSGFzaENoYW5nZSgpIHtcbiAgICAgICAgY29uc3QgaGFzaCA9IHdpbmRvdy5sb2NhdGlvbi5oYXNoO1xuICAgICAgICBpZiAoaGFzaCAmJiBoYXNoLnN0YXJ0c1dpdGgoJyNmaWxlPScpKSB7XG4gICAgICAgICAgICBjb25zdCBmaWxlUGF0aCA9IGRlY29kZVVSSUNvbXBvbmVudChoYXNoLnN1YnN0cmluZyg2KSk7XG4gICAgICAgICAgICBpZiAoZmlsZVBhdGggJiYgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignZ2V0IHZhbHVlJykgIT09IGZpbGVQYXRoKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIGZpbGUgZXhpc3RzIGluIGRyb3Bkb3duIGl0ZW1zXG4gICAgICAgICAgICAgICAgY29uc3QgZmlsZUV4aXN0cyA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtcy5zb21lKGl0ZW0gPT5cbiAgICAgICAgICAgICAgICAgICAgaXRlbS50eXBlID09PSAnZmlsZScgJiYgaXRlbS52YWx1ZSA9PT0gZmlsZVBhdGhcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIGlmIChmaWxlRXhpc3RzKSB7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGZpbGVQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignc2V0IHRleHQnLCBmaWxlUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmaWxlbmFtZScsIGZpbGVQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudXBkYXRlTG9nRnJvbVNlcnZlcigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSBmaWxlIHBhdGggZnJvbSBVUkwgaGFzaCBpZiBwcmVzZW50XG4gICAgICovXG4gICAgZ2V0RmlsZUZyb21IYXNoKCkge1xuICAgICAgICBjb25zdCBoYXNoID0gd2luZG93LmxvY2F0aW9uLmhhc2g7XG4gICAgICAgIGlmIChoYXNoICYmIGhhc2guc3RhcnRzV2l0aCgnI2ZpbGU9JykpIHtcbiAgICAgICAgICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoaGFzaC5zdWJzdHJpbmcoNikpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gZm9ybWF0IHRoZSBkcm9wZG93biBtZW51IHN0cnVjdHVyZSBiYXNlZCBvbiB0aGUgcmVzcG9uc2UuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGRhdGEuXG4gICAgICovXG4gICAgY2JGb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgcmVzcG9uc2UgaXMgdmFsaWRcbiAgICAgICAgaWYgKCFyZXNwb25zZSB8fCAhcmVzcG9uc2UucmVzdWx0IHx8ICFyZXNwb25zZS5kYXRhIHx8ICFyZXNwb25zZS5kYXRhLmZpbGVzKSB7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGZpbGVzID0gcmVzcG9uc2UuZGF0YS5maWxlcztcblxuICAgICAgICAvLyBDaGVjayBmb3IgZmlsZSBmcm9tIGhhc2ggZmlyc3RcbiAgICAgICAgbGV0IGRlZlZhbCA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmdldEZpbGVGcm9tSGFzaCgpO1xuXG4gICAgICAgIC8vIElmIG5vIGhhc2ggdmFsdWUsIGNoZWNrIGlmIHRoZXJlIGlzIGEgZGVmYXVsdCB2YWx1ZSBzZXQgZm9yIHRoZSBmaWxlbmFtZSBpbnB1dCBmaWVsZFxuICAgICAgICBpZiAoIWRlZlZhbCkge1xuICAgICAgICAgICAgY29uc3QgZmlsZU5hbWUgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZmlsZW5hbWUnKTtcbiAgICAgICAgICAgIGlmIChmaWxlTmFtZSAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICBkZWZWYWwgPSBmaWxlTmFtZS50cmltKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBCdWlsZCB0cmVlIHN0cnVjdHVyZSBmcm9tIGZpbGVzXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtcyA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmJ1aWxkVHJlZVN0cnVjdHVyZShmaWxlcywgZGVmVmFsKTtcblxuICAgICAgICAvLyBDcmVhdGUgdmFsdWVzIGFycmF5IGZvciBkcm9wZG93biB3aXRoIGFsbCBpdGVtcyAoaW5jbHVkaW5nIGZvbGRlcnMpXG4gICAgICAgIGNvbnN0IGRyb3Bkb3duVmFsdWVzID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zLm1hcCgoaXRlbSwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGlmIChpdGVtLnR5cGUgPT09ICdmb2xkZXInKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogaXRlbS5uYW1lLnJlcGxhY2UoLzxbXj5dKj4vZywgJycpLCAvLyBSZW1vdmUgSFRNTCB0YWdzIGZvciBzZWFyY2hcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICcnLFxuICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZDogdHJ1ZVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGl0ZW0ubmFtZS5yZXBsYWNlKC88W14+XSo+L2csICcnKSwgLy8gUmVtb3ZlIEhUTUwgdGFncyBmb3Igc2VhcmNoXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBpdGVtLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZDogaXRlbS5zZWxlY3RlZFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGRyb3Bkb3duIHdpdGggdmFsdWVzXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldHVwIG1lbnUnLCB7XG4gICAgICAgICAgICB2YWx1ZXM6IGRyb3Bkb3duVmFsdWVzXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHRoZSBkZWZhdWx0IHNlbGVjdGVkIHZhbHVlIGlmIGFueVxuICAgICAgICBjb25zdCBzZWxlY3RlZEl0ZW0gPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXMuZmluZChpdGVtID0+IGl0ZW0uc2VsZWN0ZWQpO1xuICAgICAgICBpZiAoc2VsZWN0ZWRJdGVtKSB7XG4gICAgICAgICAgICAvLyBVc2Ugc2V0VGltZW91dCB0byBlbnN1cmUgZHJvcGRvd24gaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHNlbGVjdGVkSXRlbS52YWx1ZSk7XG4gICAgICAgICAgICAgICAgLy8gRm9yY2UgcmVmcmVzaCB0aGUgZHJvcGRvd24gdG8gc2hvdyB0aGUgc2VsZWN0ZWQgdmFsdWVcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdyZWZyZXNoJyk7XG4gICAgICAgICAgICAgICAgLy8gQWxzbyBzZXQgdGhlIHRleHQgdG8gc2hvdyBmdWxsIHBhdGhcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXQgdGV4dCcsIHNlbGVjdGVkSXRlbS52YWx1ZSk7XG4gICAgICAgICAgICAgICAgLy8gQXV0b21hdGljYWxseSBsb2FkIHRoZSBsb2cgY29udGVudCB3aGVuIGEgZmlsZSBpcyBwcmUtc2VsZWN0ZWRcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZmlsZW5hbWUnLCBzZWxlY3RlZEl0ZW0udmFsdWUpO1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKTtcbiAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZGVmVmFsKSB7XG4gICAgICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgZGVmYXVsdCB2YWx1ZSBidXQgbm8gaXRlbSB3YXMgbWFya2VkIGFzIHNlbGVjdGVkLFxuICAgICAgICAgICAgLy8gdHJ5IHRvIGZpbmQgYW5kIHNlbGVjdCBpdCBtYW51YWxseVxuICAgICAgICAgICAgY29uc3QgaXRlbVRvU2VsZWN0ID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zLmZpbmQoaXRlbSA9PiBcbiAgICAgICAgICAgICAgICBpdGVtLnR5cGUgPT09ICdmaWxlJyAmJiBpdGVtLnZhbHVlID09PSBkZWZWYWxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBpZiAoaXRlbVRvU2VsZWN0KSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGl0ZW1Ub1NlbGVjdC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3JlZnJlc2gnKTtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignc2V0IHRleHQnLCBpdGVtVG9TZWxlY3QudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZmlsZW5hbWUnLCBpdGVtVG9TZWxlY3QudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy51cGRhdGVMb2dGcm9tU2VydmVyKCk7XG4gICAgICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gSGlkZSB0aGUgZGltbWVyIGFmdGVyIGxvYWRpbmcgb25seSBpZiBubyBmaWxlIGlzIHNlbGVjdGVkXG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBIaWRlIHRoZSBkaW1tZXIgYWZ0ZXIgbG9hZGluZyBvbmx5IGlmIG5vIGZpbGUgaXMgc2VsZWN0ZWRcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGNoYW5naW5nIHRoZSBsb2cgZmlsZSBpbiB0aGUgc2VsZWN0IGRyb3Bkb3duLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSBzZWxlY3RlZCB2YWx1ZS5cbiAgICAgKi9cbiAgICBjYk9uQ2hhbmdlRmlsZSh2YWx1ZSkge1xuICAgICAgICBpZiAodmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgZHJvcGRvd24gdGV4dCB0byBzaG93IHRoZSBmdWxsIGZpbGUgcGF0aFxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXQgdGV4dCcsIHZhbHVlKTtcblxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZmlsZW5hbWUnLCB2YWx1ZSk7XG5cbiAgICAgICAgLy8gVXBkYXRlIFVSTCBoYXNoIHdpdGggdGhlIHNlbGVjdGVkIGZpbGVcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLmhhc2ggPSAnZmlsZT0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlKTtcblxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy51cGRhdGVMb2dGcm9tU2VydmVyKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZldGNoZXMgdGhlIGxvZyBmaWxlIGNvbnRlbnQgZnJvbSB0aGUgc2VydmVyLlxuICAgICAqL1xuICAgIHVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKSB7XG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgU3lzbG9nQVBJLmdldExvZ0Zyb21GaWxlKHBhcmFtcywgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY2JVcGRhdGVMb2dUZXh0KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlcyB0aGUgbG9nIHZpZXcuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gQVBJLlxuICAgICAqL1xuICAgIGNiVXBkYXRlTG9nVGV4dChyZXNwb25zZSkge1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcblxuICAgICAgICAvLyBIYW5kbGUgdjMgQVBJIHJlc3BvbnNlIHN0cnVjdHVyZVxuICAgICAgICBpZiAoIXJlc3BvbnNlIHx8ICFyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5tZXNzYWdlcykge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjb250ZW50ID0gcmVzcG9uc2UuZGF0YT8uY29udGVudCB8fCAnJztcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLmdldFNlc3Npb24oKS5zZXRWYWx1ZShjb250ZW50KTtcbiAgICAgICAgY29uc3Qgcm93ID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnNlc3Npb24uZ2V0TGVuZ3RoKCkgLSAxO1xuICAgICAgICBjb25zdCBjb2x1bW4gPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIuc2Vzc2lvbi5nZXRMaW5lKHJvdykubGVuZ3RoO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIuZ290b0xpbmUocm93ICsgMSwgY29sdW1uKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgY2xpY2tpbmcgdGhlIFwiRG93bmxvYWQgRmlsZVwiIGJ1dHRvbi5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZGF0YS5cbiAgICAgKi9cbiAgICBjYkRvd25sb2FkRmlsZShyZXNwb25zZSkge1xuICAgICAgICAvLyBIYW5kbGUgdjMgQVBJIHJlc3BvbnNlIHN0cnVjdHVyZVxuICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IHJlc3BvbnNlLmRhdGEuZmlsZW5hbWUgfHwgcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5tZXNzYWdlcykge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBjbGlja2luZyB0aGUgXCJFcmFzZSBGaWxlXCIgYnV0dG9uLlxuICAgICAqL1xuICAgIGVyYXNlQ3VycmVudEZpbGVDb250ZW50KCl7XG4gICAgICAgIGNvbnN0IGZpbGVOYW1lID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2ZpbGVuYW1lJyk7XG4gICAgICAgIGlmIChmaWxlTmFtZS5sZW5ndGg+MCl7XG4gICAgICAgICAgICBTeXNsb2dBUEkuZXJhc2VGaWxlKGZpbGVOYW1lLCBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jYkFmdGVyRmlsZUVyYXNlZClcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBjbGlja2luZyB0aGUgXCJFcmFzZSBGaWxlXCIgYnV0dG9uIGFuZCBjYWxsaW5nIFJFU1QgQVBJIGNvbW1hbmRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZGF0YS5cbiAgICAgKi9cbiAgICBjYkFmdGVyRmlsZUVyYXNlZChyZXNwb25zZSl7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQ9PT1mYWxzZSAmJiByZXNwb25zZS5tZXNzYWdlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudXBkYXRlTG9nRnJvbVNlcnZlcigpO1xuICAgICAgICB9XG4gICAgfSxcbn07XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBzaG93IHN5c3RlbSBsb2dzIHRhYlxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==