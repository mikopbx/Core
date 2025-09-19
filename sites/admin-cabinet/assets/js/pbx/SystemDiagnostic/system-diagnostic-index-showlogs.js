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
  $fileSelectDropDown: $('#system-diagnostic-form .filenames-select'),

  /**
   * Array of log items.
   * @type {Array}
   */
  logsItems: [],

  /**
   * Default log item.
   * @type {Object}
   */
  defaultLogItem: null,

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
   * jQuery object for the filename.
   * @type {jQuery}
   */
  $fileName: $('#system-diagnostic-form .filename'),

  /**
   * Initializes the system diagnostic logs.
   */
  initialize: function initialize() {
    var aceHeight = window.innerHeight - 250; // Set the minimum height of the log container

    systemDiagnosticLogs.$dimmer.closest('div').css('min-height', "".concat(aceHeight, "px")); // Initialize the dropdown menu for log files with tree support
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
    var column = systemDiagnosticLogs.viewer.session.getLine(row).length; // or simply Infinity

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TeXN0ZW1EaWFnbm9zdGljL3N5c3RlbS1kaWFnbm9zdGljLWluZGV4LXNob3dsb2dzLmpzIl0sIm5hbWVzIjpbInN5c3RlbURpYWdub3N0aWNMb2dzIiwiJHNob3dCdG4iLCIkIiwiJGRvd25sb2FkQnRuIiwiJHNob3dBdXRvQnRuIiwiJGVyYXNlQnRuIiwiJGxvZ0NvbnRlbnQiLCJ2aWV3ZXIiLCIkZmlsZVNlbGVjdERyb3BEb3duIiwibG9nc0l0ZW1zIiwiZGVmYXVsdExvZ0l0ZW0iLCIkZGltbWVyIiwiJGZvcm1PYmoiLCIkZmlsZU5hbWUiLCJpbml0aWFsaXplIiwiYWNlSGVpZ2h0Iiwid2luZG93IiwiaW5uZXJIZWlnaHQiLCJjbG9zZXN0IiwiY3NzIiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsImNiT25DaGFuZ2VGaWxlIiwiaWdub3JlQ2FzZSIsImZ1bGxUZXh0U2VhcmNoIiwiZm9yY2VTZWxlY3Rpb24iLCJwcmVzZXJ2ZUhUTUwiLCJhbGxvd0NhdGVnb3J5U2VsZWN0aW9uIiwibWF0Y2giLCJmaWx0ZXJSZW1vdGVEYXRhIiwiYWN0aW9uIiwidGVtcGxhdGVzIiwibWVudSIsImN1c3RvbURyb3Bkb3duTWVudSIsImluaXRpYWxpemVBY2UiLCJTeXNsb2dBUEkiLCJnZXRMb2dzTGlzdCIsImNiRm9ybWF0RHJvcGRvd25SZXN1bHRzIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJ1cGRhdGVMb2dGcm9tU2VydmVyIiwiaGFuZGxlSGFzaENoYW5nZSIsImRhdGEiLCJmb3JtIiwiZG93bmxvYWRMb2dGaWxlIiwiZmlsZW5hbWUiLCJjYkRvd25sb2FkRmlsZSIsIiRyZWxvYWRJY29uIiwiZmluZCIsImhhc0NsYXNzIiwicmVtb3ZlQ2xhc3MiLCJ1cGRhdGVMb2dWaWV3V29ya2VyIiwic3RvcCIsImFkZENsYXNzIiwiZXJhc2VDdXJyZW50RmlsZUNvbnRlbnQiLCJrZXl1cCIsImV2ZW50Iiwia2V5Q29kZSIsInRvZ2dsZUZ1bGxTY3JlZW4iLCJkb2N1bWVudCIsImFkZEV2ZW50TGlzdGVuZXIiLCJhZGp1c3RMb2dIZWlnaHQiLCJsb2dDb250YWluZXIiLCJnZXRFbGVtZW50QnlJZCIsImZ1bGxzY3JlZW5FbGVtZW50IiwicmVxdWVzdEZ1bGxzY3JlZW4iLCJlcnIiLCJjb25zb2xlIiwiZXJyb3IiLCJtZXNzYWdlIiwiZXhpdEZ1bGxzY3JlZW4iLCJzZXRUaW1lb3V0Iiwib2Zmc2V0IiwidG9wIiwicmVzaXplIiwiYWNlIiwiZWRpdCIsImp1bGlhIiwicmVxdWlyZSIsInVuZGVmaW5lZCIsIkluaU1vZGUiLCJNb2RlIiwic2Vzc2lvbiIsInNldE1vZGUiLCJzZXRUaGVtZSIsInJlbmRlcmVyIiwic2V0U2hvd0d1dHRlciIsInNldE9wdGlvbnMiLCJzaG93TGluZU51bWJlcnMiLCJzaG93UHJpbnRNYXJnaW4iLCJyZWFkT25seSIsImJ1aWxkVHJlZVN0cnVjdHVyZSIsImZpbGVzIiwiZGVmYXVsdFBhdGgiLCJ0cmVlIiwiT2JqZWN0IiwiZW50cmllcyIsImZvckVhY2giLCJrZXkiLCJmaWxlRGF0YSIsImZpbGVQYXRoIiwicGF0aCIsInBhcnRzIiwic3BsaXQiLCJjdXJyZW50IiwicGFydCIsImluZGV4IiwibGVuZ3RoIiwidHlwZSIsInNpemUiLCJjaGlsZHJlbiIsInRyZWVUb0Ryb3Bkb3duSXRlbXMiLCJwcmVmaXgiLCJpdGVtcyIsInNvcnQiLCJhS2V5IiwiYVZhbCIsImJLZXkiLCJiVmFsIiwibG9jYWxlQ29tcGFyZSIsInZhbHVlIiwicHVzaCIsIm5hbWUiLCJkaXNhYmxlZCIsImNoaWxkSXRlbXMiLCJzZWxlY3RlZCIsInJlc3BvbnNlIiwiZmllbGRzIiwidmFsdWVzIiwiaHRtbCIsImVhY2giLCJvcHRpb24iLCJpdGVtIiwibWF5YmVEaXNhYmxlZCIsImhhc2giLCJsb2NhdGlvbiIsInN0YXJ0c1dpdGgiLCJkZWNvZGVVUklDb21wb25lbnQiLCJzdWJzdHJpbmciLCJmaWxlRXhpc3RzIiwic29tZSIsImdldEZpbGVGcm9tSGFzaCIsInJlc3VsdCIsImRlZlZhbCIsImZpbGVOYW1lIiwidHJpbSIsImRyb3Bkb3duVmFsdWVzIiwibWFwIiwicmVwbGFjZSIsInNlbGVjdGVkSXRlbSIsIml0ZW1Ub1NlbGVjdCIsImVuY29kZVVSSUNvbXBvbmVudCIsInBhcmFtcyIsImdldExvZ0Zyb21GaWxlIiwiY2JVcGRhdGVMb2dUZXh0IiwibWVzc2FnZXMiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsImNvbnRlbnQiLCJnZXRTZXNzaW9uIiwic2V0VmFsdWUiLCJyb3ciLCJnZXRMZW5ndGgiLCJjb2x1bW4iLCJnZXRMaW5lIiwiZ290b0xpbmUiLCJlcmFzZUZpbGUiLCJjYkFmdGVyRmlsZUVyYXNlZCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsb0JBQW9CLEdBQUc7QUFDekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMsZ0JBQUQsQ0FMYzs7QUFPekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsWUFBWSxFQUFFRCxDQUFDLENBQUMsZ0JBQUQsQ0FYVTs7QUFhekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUUsRUFBQUEsWUFBWSxFQUFFRixDQUFDLENBQUMscUJBQUQsQ0FqQlU7O0FBbUJ6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJRyxFQUFBQSxTQUFTLEVBQUVILENBQUMsQ0FBQyxhQUFELENBdkJhOztBQXlCekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUksRUFBQUEsV0FBVyxFQUFFSixDQUFDLENBQUMsdUJBQUQsQ0E3Qlc7O0FBK0J6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJSyxFQUFBQSxNQUFNLEVBQUUsRUFuQ2lCOztBQXFDekI7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RkQsTUFFTztBQUNINUosTUFBQUEsb0JBQW9CLENBQUN5QyxtQkFBckI7QUFDSDtBQUNKO0FBNWhCd0IsQ0FBN0IsQyxDQStoQkE7O0FBQ0F2QyxDQUFDLENBQUMwRCxRQUFELENBQUQsQ0FBWTZHLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnpLLEVBQUFBLG9CQUFvQixDQUFDYyxVQUFyQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuLyogZ2xvYmFsIGFjZSwgUGJ4QXBpLCBTeXNsb2dBUEksIHVwZGF0ZUxvZ1ZpZXdXb3JrZXIsIEFjZSwgVXNlck1lc3NhZ2UgKi9cbiBcbi8qKlxuICogUmVwcmVzZW50cyB0aGUgc3lzdGVtIGRpYWdub3N0aWMgbG9ncyBvYmplY3QuXG4gKlxuICogQG1vZHVsZSBzeXN0ZW1EaWFnbm9zdGljTG9nc1xuICovXG5jb25zdCBzeXN0ZW1EaWFnbm9zdGljTG9ncyA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgXCJTaG93IExhc3QgTG9nXCIgYnV0dG9uLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNob3dCdG46ICQoJyNzaG93LWxhc3QtbG9nJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgXCJEb3dubG9hZCBGaWxlXCIgYnV0dG9uLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRvd25sb2FkQnRuOiAkKCcjZG93bmxvYWQtZmlsZScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIFwiU2hvdyBMYXN0IExvZyAoQXV0bylcIiBidXR0b24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc2hvd0F1dG9CdG46ICQoJyNzaG93LWxhc3QtbG9nLWF1dG8nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBcIkVyYXNlIGN1cnJlbnQgZmlsZSBjb250ZW50XCIgYnV0dG9uLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGVyYXNlQnRuOiAkKCcjZXJhc2UtZmlsZScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGxvZyBjb250ZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGxvZ0NvbnRlbnQ6ICQoJyNsb2ctY29udGVudC1yZWFkb25seScpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIHZpZXdlciBmb3IgZGlzcGxheWluZyB0aGUgbG9nIGNvbnRlbnQuXG4gICAgICogQHR5cGUge0FjZX1cbiAgICAgKi9cbiAgICB2aWV3ZXI6ICcnLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZpbGUgc2VsZWN0IGRyb3Bkb3duLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZpbGVTZWxlY3REcm9wRG93bjogJCgnI3N5c3RlbS1kaWFnbm9zdGljLWZvcm0gLmZpbGVuYW1lcy1zZWxlY3QnKSxcblxuICAgIC8qKlxuICAgICAqIEFycmF5IG9mIGxvZyBpdGVtcy5cbiAgICAgKiBAdHlwZSB7QXJyYXl9XG4gICAgICovXG4gICAgbG9nc0l0ZW1zOiBbXSxcblxuICAgIC8qKlxuICAgICAqIERlZmF1bHQgbG9nIGl0ZW0uXG4gICAgICogQHR5cGUge09iamVjdH1cbiAgICAgKi9cbiAgICBkZWZhdWx0TG9nSXRlbTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBkaW1tZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGltbWVyOiAkKCcjZ2V0LWxvZ3MtZGltbWVyJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjc3lzdGVtLWRpYWdub3N0aWMtZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZpbGVuYW1lLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZpbGVOYW1lOiAkKCcjc3lzdGVtLWRpYWdub3N0aWMtZm9ybSAuZmlsZW5hbWUnKSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBzeXN0ZW0gZGlhZ25vc3RpYyBsb2dzLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIGNvbnN0IGFjZUhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCAtIDI1MDtcblxuICAgICAgICAvLyBTZXQgdGhlIG1pbmltdW0gaGVpZ2h0IG9mIHRoZSBsb2cgY29udGFpbmVyXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIuY2xvc2VzdCgnZGl2JykuY3NzKCdtaW4taGVpZ2h0JywgYCR7YWNlSGVpZ2h0fXB4YCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZHJvcGRvd24gbWVudSBmb3IgbG9nIGZpbGVzIHdpdGggdHJlZSBzdXBwb3J0XG4gICAgICAgIC8vIEluaXRpYWxpemUgU2VtYW50aWMgVUkgZHJvcGRvd24gd2l0aCBjdXN0b20gbWVudSBnZW5lcmF0aW9uXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jYk9uQ2hhbmdlRmlsZSxcbiAgICAgICAgICAgICAgICBpZ25vcmVDYXNlOiB0cnVlLFxuICAgICAgICAgICAgICAgIGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuICAgICAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBwcmVzZXJ2ZUhUTUw6IHRydWUsXG4gICAgICAgICAgICAgICAgYWxsb3dDYXRlZ29yeVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICAgICAgbWF0Y2g6ICd0ZXh0JyxcbiAgICAgICAgICAgICAgICBmaWx0ZXJSZW1vdGVEYXRhOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBhY3Rpb246ICdhY3RpdmF0ZScsXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgICAgIG1lbnU6IHN5c3RlbURpYWdub3N0aWNMb2dzLmN1c3RvbURyb3Bkb3duTWVudVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgQUNFIGVkaXRvciBmb3IgbG9nIGNvbnRlbnRcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaW5pdGlhbGl6ZUFjZSgpO1xuXG4gICAgICAgIC8vIEZldGNoIHRoZSBsaXN0IG9mIGxvZyBmaWxlc1xuICAgICAgICBTeXNsb2dBUEkuZ2V0TG9nc0xpc3Qoc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY2JGb3JtYXREcm9wZG93blJlc3VsdHMpO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciBcIlNob3cgTG9nXCIgYnV0dG9uIGNsaWNrXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRzaG93QnRuLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy51cGRhdGVMb2dGcm9tU2VydmVyKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIExpc3RlbiBmb3IgaGFzaCBjaGFuZ2VzIHRvIHVwZGF0ZSBzZWxlY3RlZCBmaWxlXG4gICAgICAgICQod2luZG93KS5vbignaGFzaGNoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmhhbmRsZUhhc2hDaGFuZ2UoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIFwiRG93bmxvYWQgTG9nXCIgYnV0dG9uIGNsaWNrXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkb3dubG9hZEJ0bi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgICAgIFN5c2xvZ0FQSS5kb3dubG9hZExvZ0ZpbGUoZGF0YS5maWxlbmFtZSwgdHJ1ZSwgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY2JEb3dubG9hZEZpbGUpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgXCJBdXRvIFJlZnJlc2hcIiBidXR0b24gY2xpY2tcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJHNob3dBdXRvQnRuLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkcmVsb2FkSWNvbiA9IHN5c3RlbURpYWdub3N0aWNMb2dzLiRzaG93QXV0b0J0bi5maW5kKCdpLnJlZnJlc2gnKTtcbiAgICAgICAgICAgIGlmICgkcmVsb2FkSWNvbi5oYXNDbGFzcygnbG9hZGluZycpKSB7XG4gICAgICAgICAgICAgICAgJHJlbG9hZEljb24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICB1cGRhdGVMb2dWaWV3V29ya2VyLnN0b3AoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHJlbG9hZEljb24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICB1cGRhdGVMb2dWaWV3V29ya2VyLmluaXRpYWxpemUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIHRoZSBcIkVyYXNlIGZpbGVcIiBidXR0b24gY2xpY2tcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGVyYXNlQnRuLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5lcmFzZUN1cnJlbnRGaWxlQ29udGVudCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgRW50ZXIga2V5cHJlc3Mgb24gaW5wdXQgZmllbGRzXG4gICAgICAgICQoJ2lucHV0Jykua2V5dXAoKGV2ZW50KSA9PiB7XG4gICAgICAgICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMTMpIHtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy51cGRhdGVMb2dGcm9tU2VydmVyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciBGdWxsc2NyZWVuIGJ1dHRvbiBjbGlja1xuICAgICAgICAkKCcuZnVsbHNjcmVlbi10b2dnbGUtYnRuJykub24oJ2NsaWNrJywgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudG9nZ2xlRnVsbFNjcmVlbik7XG5cbiAgICAgICAgLy8gTGlzdGVuaW5nIGZvciB0aGUgZnVsbHNjcmVlbiBjaGFuZ2UgZXZlbnRcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignZnVsbHNjcmVlbmNoYW5nZScsIHN5c3RlbURpYWdub3N0aWNMb2dzLmFkanVzdExvZ0hlaWdodCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbCBoZWlnaHQgY2FsY3VsYXRpb25cbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuYWRqdXN0TG9nSGVpZ2h0KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZXMgdGhlIGZ1bGwtc2NyZWVuIG1vZGUgb2YgdGhlICdzeXN0ZW0tbG9ncy1zZWdtZW50JyBlbGVtZW50LlxuICAgICAqIElmIHRoZSBlbGVtZW50IGlzIG5vdCBpbiBmdWxsLXNjcmVlbiBtb2RlLCBpdCByZXF1ZXN0cyBmdWxsLXNjcmVlbiBtb2RlLlxuICAgICAqIElmIHRoZSBlbGVtZW50IGlzIGFscmVhZHkgaW4gZnVsbC1zY3JlZW4gbW9kZSwgaXQgZXhpdHMgZnVsbC1zY3JlZW4gbW9kZS5cbiAgICAgKiBMb2dzIGFuIGVycm9yIG1lc3NhZ2UgdG8gdGhlIGNvbnNvbGUgaWYgdGhlcmUgaXMgYW4gaXNzdWUgZW5hYmxpbmcgZnVsbC1zY3JlZW4gbW9kZS5cbiAgICAgKlxuICAgICAqIEByZXR1cm4ge3ZvaWR9XG4gICAgICovXG4gICAgdG9nZ2xlRnVsbFNjcmVlbigpIHtcbiAgICAgICAgY29uc3QgbG9nQ29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3N5c3RlbS1sb2dzLXNlZ21lbnQnKTtcblxuICAgICAgICBpZiAoIWRvY3VtZW50LmZ1bGxzY3JlZW5FbGVtZW50KSB7XG4gICAgICAgICAgICBsb2dDb250YWluZXIucmVxdWVzdEZ1bGxzY3JlZW4oKS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgYXR0ZW1wdGluZyB0byBlbmFibGUgZnVsbC1zY3JlZW4gbW9kZTogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZG9jdW1lbnQuZXhpdEZ1bGxzY3JlZW4oKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGdW5jdGlvbiB0byBhZGp1c3QgdGhlIGhlaWdodCBvZiB0aGUgbG9ncyBkZXBlbmRpbmcgb24gdGhlIHNjcmVlbiBtb2RlLlxuICAgICAqL1xuICAgIGFkanVzdExvZ0hlaWdodCgpIHtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBsZXQgYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGxvZ0NvbnRlbnQub2Zmc2V0KCkudG9wIC0gMjU7XG4gICAgICAgICAgICBpZiAoZG9jdW1lbnQuZnVsbHNjcmVlbkVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiBmdWxsc2NyZWVuIG1vZGUgaXMgYWN0aXZlXG4gICAgICAgICAgICAgICAgYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gODA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBSZWNhbGN1bGF0ZSB0aGUgc2l6ZSBvZiB0aGUgQUNFIGVkaXRvclxuICAgICAgICAgICAgJCgnLmxvZy1jb250ZW50LXJlYWRvbmx5JykuY3NzKCdtaW4taGVpZ2h0JywgIGAke2FjZUhlaWdodH1weGApO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnJlc2l6ZSgpO1xuICAgICAgICB9LCAzMDApO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIEFDRSBlZGl0b3IgZm9yIGxvZyB2aWV3aW5nLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVBY2UoKSB7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlciA9IGFjZS5lZGl0KCdsb2ctY29udGVudC1yZWFkb25seScpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBKdWxpYSBtb2RlIGlzIGF2YWlsYWJsZVxuICAgICAgICBjb25zdCBqdWxpYSA9IGFjZS5yZXF1aXJlKCdhY2UvbW9kZS9qdWxpYScpO1xuICAgICAgICBpZiAoanVsaWEgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gU2V0IHRoZSBtb2RlIHRvIEp1bGlhIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgY29uc3QgSW5pTW9kZSA9IGp1bGlhLk1vZGU7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIuc2Vzc2lvbi5zZXRNb2RlKG5ldyBJbmlNb2RlKCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0IHRoZSB0aGVtZSBhbmQgb3B0aW9ucyBmb3IgdGhlIEFDRSBlZGl0b3JcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIucmVuZGVyZXIuc2V0U2hvd0d1dHRlcihmYWxzZSk7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlci5zZXRPcHRpb25zKHtcbiAgICAgICAgICAgIHNob3dMaW5lTnVtYmVyczogZmFsc2UsXG4gICAgICAgICAgICBzaG93UHJpbnRNYXJnaW46IGZhbHNlLFxuICAgICAgICAgICAgcmVhZE9ubHk6IHRydWUsXG4gICAgICAgIH0pO1xuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJ1aWxkcyBhIGhpZXJhcmNoaWNhbCB0cmVlIHN0cnVjdHVyZSBmcm9tIGZsYXQgZmlsZSBwYXRoc1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBmaWxlcyAtIFRoZSBmaWxlcyBvYmplY3QgZnJvbSBBUEkgcmVzcG9uc2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZGVmYXVsdFBhdGggLSBUaGUgZGVmYXVsdCBzZWxlY3RlZCBmaWxlIHBhdGhcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFRyZWUgc3RydWN0dXJlIGZvciB0aGUgZHJvcGRvd25cbiAgICAgKi9cbiAgICBidWlsZFRyZWVTdHJ1Y3R1cmUoZmlsZXMsIGRlZmF1bHRQYXRoKSB7XG4gICAgICAgIGNvbnN0IHRyZWUgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIHRoZSB0cmVlIHN0cnVjdHVyZVxuICAgICAgICBPYmplY3QuZW50cmllcyhmaWxlcykuZm9yRWFjaCgoW2tleSwgZmlsZURhdGFdKSA9PiB7XG4gICAgICAgICAgICAvLyBVc2UgZmlsZURhdGEucGF0aCBhcyB0aGUgYWN0dWFsIGZpbGUgcGF0aFxuICAgICAgICAgICAgY29uc3QgZmlsZVBhdGggPSBmaWxlRGF0YS5wYXRoIHx8IGtleTtcbiAgICAgICAgICAgIGNvbnN0IHBhcnRzID0gZmlsZVBhdGguc3BsaXQoJy8nKTtcbiAgICAgICAgICAgIGxldCBjdXJyZW50ID0gdHJlZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcGFydHMuZm9yRWFjaCgocGFydCwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoaW5kZXggPT09IHBhcnRzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBpcyBhIGZpbGVcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudFtwYXJ0XSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdmaWxlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IGZpbGVQYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2l6ZTogZmlsZURhdGEuc2l6ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IChkZWZhdWx0UGF0aCAmJiBkZWZhdWx0UGF0aCA9PT0gZmlsZVBhdGgpIHx8ICghZGVmYXVsdFBhdGggJiYgZmlsZURhdGEuZGVmYXVsdClcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBUaGlzIGlzIGEgZGlyZWN0b3J5XG4gICAgICAgICAgICAgICAgICAgIGlmICghY3VycmVudFtwYXJ0XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudFtwYXJ0XSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZm9sZGVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjoge31cbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY3VycmVudCA9IGN1cnJlbnRbcGFydF0uY2hpbGRyZW47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29udmVydCB0cmVlIHRvIGRyb3Bkb3duIGl0ZW1zXG4gICAgICAgIHJldHVybiB0aGlzLnRyZWVUb0Ryb3Bkb3duSXRlbXModHJlZSwgJycpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ29udmVydHMgdHJlZSBzdHJ1Y3R1cmUgdG8gZHJvcGRvd24gaXRlbXMgd2l0aCBwcm9wZXIgZm9ybWF0dGluZ1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSB0cmVlIC0gVGhlIHRyZWUgc3RydWN0dXJlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHByZWZpeCAtIFByZWZpeCBmb3IgaW5kZW50YXRpb25cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IEZvcm1hdHRlZCBkcm9wZG93biBpdGVtc1xuICAgICAqL1xuICAgIHRyZWVUb0Ryb3Bkb3duSXRlbXModHJlZSwgcHJlZml4KSB7XG4gICAgICAgIGNvbnN0IGl0ZW1zID0gW107XG4gICAgICAgIFxuICAgICAgICAvLyBTb3J0IGVudHJpZXM6IGZvbGRlcnMgZmlyc3QsIHRoZW4gZmlsZXNcbiAgICAgICAgY29uc3QgZW50cmllcyA9IE9iamVjdC5lbnRyaWVzKHRyZWUpLnNvcnQoKFthS2V5LCBhVmFsXSwgW2JLZXksIGJWYWxdKSA9PiB7XG4gICAgICAgICAgICBpZiAoYVZhbC50eXBlID09PSAnZm9sZGVyJyAmJiBiVmFsLnR5cGUgPT09ICdmaWxlJykgcmV0dXJuIC0xO1xuICAgICAgICAgICAgaWYgKGFWYWwudHlwZSA9PT0gJ2ZpbGUnICYmIGJWYWwudHlwZSA9PT0gJ2ZvbGRlcicpIHJldHVybiAxO1xuICAgICAgICAgICAgcmV0dXJuIGFLZXkubG9jYWxlQ29tcGFyZShiS2V5KTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBlbnRyaWVzLmZvckVhY2goKFtrZXksIHZhbHVlXSkgPT4ge1xuICAgICAgICAgICAgaWYgKHZhbHVlLnR5cGUgPT09ICdmb2xkZXInKSB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIGZvbGRlciBoZWFkZXJcbiAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogYCR7cHJlZml4fTxpIGNsYXNzPVwiZm9sZGVyIGljb25cIj48L2k+ICR7a2V5fWAsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdmb2xkZXInXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQWRkIGNoaWxkcmVuIHdpdGggaW5jcmVhc2VkIGluZGVudGF0aW9uXG4gICAgICAgICAgICAgICAgY29uc3QgY2hpbGRJdGVtcyA9IHRoaXMudHJlZVRvRHJvcGRvd25JdGVtcyh2YWx1ZS5jaGlsZHJlbiwgcHJlZml4ICsgJyZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOycpO1xuICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goLi4uY2hpbGRJdGVtcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEFkZCBmaWxlIGl0ZW1cbiAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogYCR7cHJlZml4fTxpIGNsYXNzPVwiZmlsZSBvdXRsaW5lIGljb25cIj48L2k+ICR7a2V5fSAoJHt2YWx1ZS5zaXplfSlgLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWUucGF0aCxcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWQ6IHZhbHVlLmRlZmF1bHQsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdmaWxlJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBpdGVtcztcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgY3VzdG9tIGRyb3Bkb3duIG1lbnUgSFRNTCBmb3IgbG9nIGZpbGVzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGNvbnRhaW5pbmcgZHJvcGRvd24gbWVudSBvcHRpb25zXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGZpZWxkcyAtIFRoZSBmaWVsZHMgaW4gdGhlIHJlc3BvbnNlIHRvIHVzZSBmb3IgdGhlIG1lbnUgb3B0aW9uc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBIVE1MIHN0cmluZyBmb3IgdGhlIGN1c3RvbSBkcm9wZG93biBtZW51XG4gICAgICovXG4gICAgY3VzdG9tRHJvcGRvd25NZW51KHJlc3BvbnNlLCBmaWVsZHMpIHtcbiAgICAgICAgY29uc3QgdmFsdWVzID0gcmVzcG9uc2VbZmllbGRzLnZhbHVlc10gfHwge307XG4gICAgICAgIGxldCBodG1sID0gJyc7XG4gICAgICAgIFxuICAgICAgICAkLmVhY2godmFsdWVzLCAoaW5kZXgsIG9wdGlvbikgPT4ge1xuICAgICAgICAgICAgLy8gRm9yIHRyZWUgc3RydWN0dXJlIGl0ZW1zXG4gICAgICAgICAgICBpZiAoc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zICYmIHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtc1tpbmRleF0pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpdGVtID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zW2luZGV4XTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoaXRlbS50eXBlID09PSAnZm9sZGVyJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBGb2xkZXIgaXRlbSAtIGRpc2FibGVkIGFuZCB3aXRoIGZvbGRlciBpY29uXG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJkaXNhYmxlZCBpdGVtXCIgZGF0YS12YWx1ZT1cIlwiPiR7aXRlbS5uYW1lfTwvZGl2PmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRmlsZSBpdGVtIHdpdGggcHJvcGVyIHZhbHVlXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdGVkID0gaXRlbS5zZWxlY3RlZCA/ICdzZWxlY3RlZCBhY3RpdmUnIDogJyc7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtICR7c2VsZWN0ZWR9XCIgZGF0YS12YWx1ZT1cIiR7b3B0aW9uW2ZpZWxkcy52YWx1ZV19XCI+JHtpdGVtLm5hbWV9PC9kaXY+YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIHJlZ3VsYXIgaXRlbVxuICAgICAgICAgICAgICAgIGNvbnN0IG1heWJlRGlzYWJsZWQgPSAob3B0aW9uW2ZpZWxkcy5kaXNhYmxlZF0pID8gJ2Rpc2FibGVkICcgOiAnJztcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiJHttYXliZURpc2FibGVkfWl0ZW1cIiBkYXRhLXZhbHVlPVwiJHtvcHRpb25bZmllbGRzLnZhbHVlXX1cIj4ke29wdGlvbltmaWVsZHMubmFtZV19PC9kaXY+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlcyBoYXNoIGNoYW5nZXMgdG8gdXBkYXRlIHRoZSBzZWxlY3RlZCBmaWxlXG4gICAgICovXG4gICAgaGFuZGxlSGFzaENoYW5nZSgpIHtcbiAgICAgICAgY29uc3QgaGFzaCA9IHdpbmRvdy5sb2NhdGlvbi5oYXNoO1xuICAgICAgICBpZiAoaGFzaCAmJiBoYXNoLnN0YXJ0c1dpdGgoJyNmaWxlPScpKSB7XG4gICAgICAgICAgICBjb25zdCBmaWxlUGF0aCA9IGRlY29kZVVSSUNvbXBvbmVudChoYXNoLnN1YnN0cmluZyg2KSk7XG4gICAgICAgICAgICBpZiAoZmlsZVBhdGggJiYgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignZ2V0IHZhbHVlJykgIT09IGZpbGVQYXRoKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIGZpbGUgZXhpc3RzIGluIGRyb3Bkb3duIGl0ZW1zXG4gICAgICAgICAgICAgICAgY29uc3QgZmlsZUV4aXN0cyA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtcy5zb21lKGl0ZW0gPT5cbiAgICAgICAgICAgICAgICAgICAgaXRlbS50eXBlID09PSAnZmlsZScgJiYgaXRlbS52YWx1ZSA9PT0gZmlsZVBhdGhcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIGlmIChmaWxlRXhpc3RzKSB7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGZpbGVQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignc2V0IHRleHQnLCBmaWxlUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmaWxlbmFtZScsIGZpbGVQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudXBkYXRlTG9nRnJvbVNlcnZlcigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSBmaWxlIHBhdGggZnJvbSBVUkwgaGFzaCBpZiBwcmVzZW50XG4gICAgICovXG4gICAgZ2V0RmlsZUZyb21IYXNoKCkge1xuICAgICAgICBjb25zdCBoYXNoID0gd2luZG93LmxvY2F0aW9uLmhhc2g7XG4gICAgICAgIGlmIChoYXNoICYmIGhhc2guc3RhcnRzV2l0aCgnI2ZpbGU9JykpIHtcbiAgICAgICAgICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoaGFzaC5zdWJzdHJpbmcoNikpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gZm9ybWF0IHRoZSBkcm9wZG93biBtZW51IHN0cnVjdHVyZSBiYXNlZCBvbiB0aGUgcmVzcG9uc2UuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGRhdGEuXG4gICAgICovXG4gICAgY2JGb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgcmVzcG9uc2UgaXMgdmFsaWRcbiAgICAgICAgaWYgKCFyZXNwb25zZSB8fCAhcmVzcG9uc2UucmVzdWx0IHx8ICFyZXNwb25zZS5kYXRhIHx8ICFyZXNwb25zZS5kYXRhLmZpbGVzKSB7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGZpbGVzID0gcmVzcG9uc2UuZGF0YS5maWxlcztcblxuICAgICAgICAvLyBDaGVjayBmb3IgZmlsZSBmcm9tIGhhc2ggZmlyc3RcbiAgICAgICAgbGV0IGRlZlZhbCA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmdldEZpbGVGcm9tSGFzaCgpO1xuXG4gICAgICAgIC8vIElmIG5vIGhhc2ggdmFsdWUsIGNoZWNrIGlmIHRoZXJlIGlzIGEgZGVmYXVsdCB2YWx1ZSBzZXQgZm9yIHRoZSBmaWxlbmFtZSBpbnB1dCBmaWVsZFxuICAgICAgICBpZiAoIWRlZlZhbCkge1xuICAgICAgICAgICAgY29uc3QgZmlsZU5hbWUgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZmlsZW5hbWUnKTtcbiAgICAgICAgICAgIGlmIChmaWxlTmFtZSAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICBkZWZWYWwgPSBmaWxlTmFtZS50cmltKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBCdWlsZCB0cmVlIHN0cnVjdHVyZSBmcm9tIGZpbGVzXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtcyA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmJ1aWxkVHJlZVN0cnVjdHVyZShmaWxlcywgZGVmVmFsKTtcblxuICAgICAgICAvLyBDcmVhdGUgdmFsdWVzIGFycmF5IGZvciBkcm9wZG93biB3aXRoIGFsbCBpdGVtcyAoaW5jbHVkaW5nIGZvbGRlcnMpXG4gICAgICAgIGNvbnN0IGRyb3Bkb3duVmFsdWVzID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zLm1hcCgoaXRlbSwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGlmIChpdGVtLnR5cGUgPT09ICdmb2xkZXInKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogaXRlbS5uYW1lLnJlcGxhY2UoLzxbXj5dKj4vZywgJycpLCAvLyBSZW1vdmUgSFRNTCB0YWdzIGZvciBzZWFyY2hcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICcnLFxuICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZDogdHJ1ZVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGl0ZW0ubmFtZS5yZXBsYWNlKC88W14+XSo+L2csICcnKSwgLy8gUmVtb3ZlIEhUTUwgdGFncyBmb3Igc2VhcmNoXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBpdGVtLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZDogaXRlbS5zZWxlY3RlZFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGRyb3Bkb3duIHdpdGggdmFsdWVzXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldHVwIG1lbnUnLCB7XG4gICAgICAgICAgICB2YWx1ZXM6IGRyb3Bkb3duVmFsdWVzXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHRoZSBkZWZhdWx0IHNlbGVjdGVkIHZhbHVlIGlmIGFueVxuICAgICAgICBjb25zdCBzZWxlY3RlZEl0ZW0gPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXMuZmluZChpdGVtID0+IGl0ZW0uc2VsZWN0ZWQpO1xuICAgICAgICBpZiAoc2VsZWN0ZWRJdGVtKSB7XG4gICAgICAgICAgICAvLyBVc2Ugc2V0VGltZW91dCB0byBlbnN1cmUgZHJvcGRvd24gaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHNlbGVjdGVkSXRlbS52YWx1ZSk7XG4gICAgICAgICAgICAgICAgLy8gRm9yY2UgcmVmcmVzaCB0aGUgZHJvcGRvd24gdG8gc2hvdyB0aGUgc2VsZWN0ZWQgdmFsdWVcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdyZWZyZXNoJyk7XG4gICAgICAgICAgICAgICAgLy8gQWxzbyBzZXQgdGhlIHRleHQgdG8gc2hvdyBmdWxsIHBhdGhcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXQgdGV4dCcsIHNlbGVjdGVkSXRlbS52YWx1ZSk7XG4gICAgICAgICAgICAgICAgLy8gQXV0b21hdGljYWxseSBsb2FkIHRoZSBsb2cgY29udGVudCB3aGVuIGEgZmlsZSBpcyBwcmUtc2VsZWN0ZWRcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZmlsZW5hbWUnLCBzZWxlY3RlZEl0ZW0udmFsdWUpO1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKTtcbiAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZGVmVmFsKSB7XG4gICAgICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgZGVmYXVsdCB2YWx1ZSBidXQgbm8gaXRlbSB3YXMgbWFya2VkIGFzIHNlbGVjdGVkLFxuICAgICAgICAgICAgLy8gdHJ5IHRvIGZpbmQgYW5kIHNlbGVjdCBpdCBtYW51YWxseVxuICAgICAgICAgICAgY29uc3QgaXRlbVRvU2VsZWN0ID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zLmZpbmQoaXRlbSA9PiBcbiAgICAgICAgICAgICAgICBpdGVtLnR5cGUgPT09ICdmaWxlJyAmJiBpdGVtLnZhbHVlID09PSBkZWZWYWxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBpZiAoaXRlbVRvU2VsZWN0KSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGl0ZW1Ub1NlbGVjdC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3JlZnJlc2gnKTtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignc2V0IHRleHQnLCBpdGVtVG9TZWxlY3QudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZmlsZW5hbWUnLCBpdGVtVG9TZWxlY3QudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy51cGRhdGVMb2dGcm9tU2VydmVyKCk7XG4gICAgICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gSGlkZSB0aGUgZGltbWVyIGFmdGVyIGxvYWRpbmcgb25seSBpZiBubyBmaWxlIGlzIHNlbGVjdGVkXG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBIaWRlIHRoZSBkaW1tZXIgYWZ0ZXIgbG9hZGluZyBvbmx5IGlmIG5vIGZpbGUgaXMgc2VsZWN0ZWRcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGNoYW5naW5nIHRoZSBsb2cgZmlsZSBpbiB0aGUgc2VsZWN0IGRyb3Bkb3duLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSBzZWxlY3RlZCB2YWx1ZS5cbiAgICAgKi9cbiAgICBjYk9uQ2hhbmdlRmlsZSh2YWx1ZSkge1xuICAgICAgICBpZiAodmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgZHJvcGRvd24gdGV4dCB0byBzaG93IHRoZSBmdWxsIGZpbGUgcGF0aFxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXQgdGV4dCcsIHZhbHVlKTtcblxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZmlsZW5hbWUnLCB2YWx1ZSk7XG5cbiAgICAgICAgLy8gVXBkYXRlIFVSTCBoYXNoIHdpdGggdGhlIHNlbGVjdGVkIGZpbGVcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLmhhc2ggPSAnZmlsZT0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlKTtcblxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy51cGRhdGVMb2dGcm9tU2VydmVyKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZldGNoZXMgdGhlIGxvZyBmaWxlIGNvbnRlbnQgZnJvbSB0aGUgc2VydmVyLlxuICAgICAqL1xuICAgIHVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKSB7XG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgU3lzbG9nQVBJLmdldExvZ0Zyb21GaWxlKHBhcmFtcywgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY2JVcGRhdGVMb2dUZXh0KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlcyB0aGUgbG9nIHZpZXcuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gQVBJLlxuICAgICAqL1xuICAgIGNiVXBkYXRlTG9nVGV4dChyZXNwb25zZSkge1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcblxuICAgICAgICAvLyBIYW5kbGUgdjMgQVBJIHJlc3BvbnNlIHN0cnVjdHVyZVxuICAgICAgICBpZiAoIXJlc3BvbnNlIHx8ICFyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5tZXNzYWdlcykge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjb250ZW50ID0gcmVzcG9uc2UuZGF0YT8uY29udGVudCB8fCAnJztcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLmdldFNlc3Npb24oKS5zZXRWYWx1ZShjb250ZW50KTtcbiAgICAgICAgY29uc3Qgcm93ID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnNlc3Npb24uZ2V0TGVuZ3RoKCkgLSAxO1xuICAgICAgICBjb25zdCBjb2x1bW4gPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIuc2Vzc2lvbi5nZXRMaW5lKHJvdykubGVuZ3RoOyAvLyBvciBzaW1wbHkgSW5maW5pdHlcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLmdvdG9MaW5lKHJvdyArIDEsIGNvbHVtbik7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGNsaWNraW5nIHRoZSBcIkRvd25sb2FkIEZpbGVcIiBidXR0b24uXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGRhdGEuXG4gICAgICovXG4gICAgY2JEb3dubG9hZEZpbGUocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gSGFuZGxlIHYzIEFQSSByZXNwb25zZSBzdHJ1Y3R1cmVcbiAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSByZXNwb25zZS5kYXRhLmZpbGVuYW1lIHx8IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UubWVzc2FnZXMpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgY2xpY2tpbmcgdGhlIFwiRXJhc2UgRmlsZVwiIGJ1dHRvbi5cbiAgICAgKi9cbiAgICBlcmFzZUN1cnJlbnRGaWxlQ29udGVudCgpe1xuICAgICAgICBjb25zdCBmaWxlTmFtZSA9IHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmaWxlbmFtZScpO1xuICAgICAgICBpZiAoZmlsZU5hbWUubGVuZ3RoPjApe1xuICAgICAgICAgICAgU3lzbG9nQVBJLmVyYXNlRmlsZShmaWxlTmFtZSwgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY2JBZnRlckZpbGVFcmFzZWQpXG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgY2xpY2tpbmcgdGhlIFwiRXJhc2UgRmlsZVwiIGJ1dHRvbiBhbmQgY2FsbGluZyBSRVNUIEFQSSBjb21tYW5kXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGRhdGEuXG4gICAgICovXG4gICAgY2JBZnRlckZpbGVFcmFzZWQocmVzcG9uc2Upe1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0PT09ZmFsc2UgJiYgcmVzcG9uc2UubWVzc2FnZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKTtcbiAgICAgICAgfVxuICAgIH0sXG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgc2hvdyBzeXN0ZW0gbG9ncyB0YWJcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pbml0aWFsaXplKCk7XG59KTsiXX0=