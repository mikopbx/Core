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

/* global ace, PbxApi, updateLogViewWorker, Ace, UserMessage */

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

    PbxApi.SyslogGetLogsList(systemDiagnosticLogs.cbFormatDropdownResults); // Event listener for "Show Log" button click

    systemDiagnosticLogs.$showBtn.on('click', function (e) {
      e.preventDefault();
      systemDiagnosticLogs.updateLogFromServer();
    }); // Event listener for "Download Log" button click

    systemDiagnosticLogs.$downloadBtn.on('click', function (e) {
      e.preventDefault();
      var data = systemDiagnosticLogs.$formObj.form('get values');
      PbxApi.SyslogDownloadLogFile(data.filename, systemDiagnosticLogs.cbDownloadFile);
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
            "default": fileData["default"] || defaultPath === filePath
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
   * Callback function to format the dropdown menu structure based on the response.
   * @param {Object} response - The response data.
   */
  cbFormatDropdownResults: function cbFormatDropdownResults(response) {
    if (response === false) {
      systemDiagnosticLogs.$dimmer.removeClass('active');
      return;
    } // Check if response has the expected structure


    if (!response.files) {
      systemDiagnosticLogs.$dimmer.removeClass('active');
      return;
    } // Check if there is a default value set for the filename input field


    var defVal = '';
    var fileName = systemDiagnosticLogs.$formObj.form('get value', 'filename');

    if (systemDiagnosticLogs.logsItems.length === 0 && fileName !== '') {
      defVal = fileName.trim();
    } // Build tree structure from files


    systemDiagnosticLogs.logsItems = systemDiagnosticLogs.buildTreeStructure(response.files, defVal); // Create values array for dropdown with all items (including folders)

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
      systemDiagnosticLogs.$fileSelectDropDown.dropdown('set selected', selectedItem.value); // Also set the text to show full path

      systemDiagnosticLogs.$fileSelectDropDown.dropdown('set text', selectedItem.value);
    } // Hide the dimmer after loading


    systemDiagnosticLogs.$dimmer.removeClass('active');
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
    systemDiagnosticLogs.$formObj.form('set value', 'filename', value);
    systemDiagnosticLogs.updateLogFromServer();
  },

  /**
   * Fetches the log file content from the server.
   */
  updateLogFromServer: function updateLogFromServer() {
    var params = systemDiagnosticLogs.$formObj.form('get values');
    PbxApi.SyslogGetLogFromFile(params, systemDiagnosticLogs.cbUpdateLogText);
  },

  /**
   * Updates the log view.
   * @param {Object} data - The log data.
   */
  cbUpdateLogText: function cbUpdateLogText(data) {
    systemDiagnosticLogs.viewer.getSession().setValue(data.content);
    var row = systemDiagnosticLogs.viewer.session.getLength() - 1;
    var column = systemDiagnosticLogs.viewer.session.getLine(row).length; // or simply Infinity

    systemDiagnosticLogs.viewer.gotoLine(row + 1, column);
    systemDiagnosticLogs.$dimmer.removeClass('active');
  },

  /**
   * Callback after clicking the "Download File" button.
   * @param {Object} response - The response data.
   */
  cbDownloadFile: function cbDownloadFile(response) {
    if (response !== false) {
      window.location = response.filename;
    }
  },

  /**
   * Callback after clicking the "Erase File" button.
   */
  eraseCurrentFileContent: function eraseCurrentFileContent() {
    var fileName = systemDiagnosticLogs.$formObj.form('get value', 'filename');

    if (fileName.length > 0) {
      PbxApi.SyslogEraseFile(fileName, systemDiagnosticLogs.cbAfterFileErased);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TeXN0ZW1EaWFnbm9zdGljL3N5c3RlbS1kaWFnbm9zdGljLWluZGV4LXNob3dsb2dzLmpzIl0sIm5hbWVzIjpbInN5c3RlbURpYWdub3N0aWNMb2dzIiwiJHNob3dCdG4iLCIkIiwiJGRvd25sb2FkQnRuIiwiJHNob3dBdXRvQnRuIiwiJGVyYXNlQnRuIiwiJGxvZ0NvbnRlbnQiLCJ2aWV3ZXIiLCIkZmlsZVNlbGVjdERyb3BEb3duIiwibG9nc0l0ZW1zIiwiZGVmYXVsdExvZ0l0ZW0iLCIkZGltbWVyIiwiJGZvcm1PYmoiLCIkZmlsZU5hbWUiLCJpbml0aWFsaXplIiwiYWNlSGVpZ2h0Iiwid2luZG93IiwiaW5uZXJIZWlnaHQiLCJjbG9zZXN0IiwiY3NzIiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsImNiT25DaGFuZ2VGaWxlIiwiaWdub3JlQ2FzZSIsImZ1bGxUZXh0U2VhcmNoIiwiZm9yY2VTZWxlY3Rpb24iLCJwcmVzZXJ2ZUhUTUwiLCJhbGxvd0NhdGVnb3J5U2VsZWN0aW9uIiwibWF0Y2giLCJmaWx0ZXJSZW1vdGVEYXRhIiwiYWN0aW9uIiwidGVtcGxhdGVzIiwibWVudSIsImN1c3RvbURyb3Bkb3duTWVudSIsImluaXRpYWxpemVBY2UiLCJQYnhBcGkiLCJTeXNsb2dHZXRMb2dzTGlzdCIsImNiRm9ybWF0RHJvcGRvd25SZXN1bHRzIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJ1cGRhdGVMb2dGcm9tU2VydmVyIiwiZGF0YSIsImZvcm0iLCJTeXNsb2dEb3dubG9hZExvZ0ZpbGUiLCJmaWxlbmFtZSIsImNiRG93bmxvYWRGaWxlIiwiJHJlbG9hZEljb24iLCJmaW5kIiwiaGFzQ2xhc3MiLCJyZW1vdmVDbGFzcyIsInVwZGF0ZUxvZ1ZpZXdXb3JrZXIiLCJzdG9wIiwiYWRkQ2xhc3MiLCJlcmFzZUN1cnJlbnRGaWxlQ29udGVudCIsImtleXVwIiwiZXZlbnQiLCJrZXlDb2RlIiwidG9nZ2xlRnVsbFNjcmVlbiIsImRvY3VtZW50IiwiYWRkRXZlbnRMaXN0ZW5lciIsImFkanVzdExvZ0hlaWdodCIsImxvZ0NvbnRhaW5lciIsImdldEVsZW1lbnRCeUlkIiwiZnVsbHNjcmVlbkVsZW1lbnQiLCJyZXF1ZXN0RnVsbHNjcmVlbiIsImVyciIsImNvbnNvbGUiLCJlcnJvciIsIm1lc3NhZ2UiLCJleGl0RnVsbHNjcmVlbiIsInNldFRpbWVvdXQiLCJvZmZzZXQiLCJ0b3AiLCJyZXNpemUiLCJhY2UiLCJlZGl0IiwianVsaWEiLCJyZXF1aXJlIiwidW5kZWZpbmVkIiwiSW5pTW9kZSIsIk1vZGUiLCJzZXNzaW9uIiwic2V0TW9kZSIsInNldFRoZW1lIiwicmVuZGVyZXIiLCJzZXRTaG93R3V0dGVyIiwic2V0T3B0aW9ucyIsInNob3dMaW5lTnVtYmVycyIsInNob3dQcmludE1hcmdpbiIsInJlYWRPbmx5IiwiYnVpbGRUcmVlU3RydWN0dXJlIiwiZmlsZXMiLCJkZWZhdWx0UGF0aCIsInRyZWUiLCJPYmplY3QiLCJlbnRyaWVzIiwiZm9yRWFjaCIsImtleSIsImZpbGVEYXRhIiwiZmlsZVBhdGgiLCJwYXRoIiwicGFydHMiLCJzcGxpdCIsImN1cnJlbnQiLCJwYXJ0IiwiaW5kZXgiLCJsZW5ndGgiLCJ0eXBlIiwic2l6ZSIsImNoaWxkcmVuIiwidHJlZVRvRHJvcGRvd25JdGVtcyIsInByZWZpeCIsIml0ZW1zIiwic29ydCIsImFLZXkiLCJhVmFsIiwiYktleSIsImJWYWwiLCJsb2NhbGVDb21wYXJlIiwidmFsdWUiLCJwdXNoIiwibmFtZSIsImRpc2FibGVkIiwiY2hpbGRJdGVtcyIsInNlbGVjdGVkIiwicmVzcG9uc2UiLCJmaWVsZHMiLCJ2YWx1ZXMiLCJodG1sIiwiZWFjaCIsIm9wdGlvbiIsIml0ZW0iLCJtYXliZURpc2FibGVkIiwiZGVmVmFsIiwiZmlsZU5hbWUiLCJ0cmltIiwiZHJvcGRvd25WYWx1ZXMiLCJtYXAiLCJyZXBsYWNlIiwic2VsZWN0ZWRJdGVtIiwicGFyYW1zIiwiU3lzbG9nR2V0TG9nRnJvbUZpbGUiLCJjYlVwZGF0ZUxvZ1RleHQiLCJnZXRTZXNzaW9uIiwic2V0VmFsdWUiLCJjb250ZW50Iiwicm93IiwiZ2V0TGVuZ3RoIiwiY29sdW1uIiwiZ2V0TGluZSIsImdvdG9MaW5lIiwibG9jYXRpb24iLCJTeXNsb2dFcmFzZUZpbGUiLCJjYkFmdGVyRmlsZUVyYXNlZCIsInJlc3VsdCIsIm1lc3NhZ2VzIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLG9CQUFvQixHQUFHO0FBQ3pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLGdCQUFELENBTGM7O0FBT3pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBQVksRUFBRUQsQ0FBQyxDQUFDLGdCQUFELENBWFU7O0FBYXpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLFlBQVksRUFBRUYsQ0FBQyxDQUFDLHFCQUFELENBakJVOztBQW1CekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUcsRUFBQUEsU0FBUyxFQUFFSCxDQUFDLENBQUMsYUFBRCxDQXZCYTs7QUF5QnpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lJLEVBQUFBLFdBQVcsRUFBRUosQ0FBQyxDQUFDLHVCQUFELENBN0JXOztBQStCekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUssRUFBQUEsTUFBTSxFQUFFLEVBbkNpQjs7QUFxQ3pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLG1CQUFtQixFQUFFTixDQUFDLENBQUMsMkNBQUQsQ0F6Q0c7O0FBMkN6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJTyxFQUFBQSxTQUFTLEVBQUUsRUEvQ2M7O0FBaUR6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxjQUFjLEVBQUUsSUFyRFM7O0FBdUR6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxPQUFPLEVBQUVULENBQUMsQ0FBQyxrQkFBRCxDQTNEZTs7QUE2RHpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lVLEVBQUFBLFFBQVEsRUFBRVYsQ0FBQyxDQUFDLHlCQUFELENBakVjOztBQW1FekI7QUFDSjtBQUNBO0FBQ0E7QUFDSVcsRUFBQUEsU0FBUyxFQUFFWCxDQUFDLENBQUMsbUNBQUQsQ0F2RWE7O0FBeUV6QjtBQUNKO0FBQ0E7QUFDSVksRUFBQUEsVUE1RXlCLHdCQTRFWjtBQUNULFFBQU1DLFNBQVMsR0FBR0MsTUFBTSxDQUFDQyxXQUFQLEdBQXFCLEdBQXZDLENBRFMsQ0FHVDs7QUFDQWpCLElBQUFBLG9CQUFvQixDQUFDVyxPQUFyQixDQUE2Qk8sT0FBN0IsQ0FBcUMsS0FBckMsRUFBNENDLEdBQTVDLENBQWdELFlBQWhELFlBQWlFSixTQUFqRSxTQUpTLENBTVQ7QUFDQTs7QUFDQWYsSUFBQUEsb0JBQW9CLENBQUNRLG1CQUFyQixDQUF5Q1ksUUFBekMsQ0FBa0Q7QUFDMUNDLE1BQUFBLFFBQVEsRUFBRXJCLG9CQUFvQixDQUFDc0IsY0FEVztBQUUxQ0MsTUFBQUEsVUFBVSxFQUFFLElBRjhCO0FBRzFDQyxNQUFBQSxjQUFjLEVBQUUsSUFIMEI7QUFJMUNDLE1BQUFBLGNBQWMsRUFBRSxLQUowQjtBQUsxQ0MsTUFBQUEsWUFBWSxFQUFFLElBTDRCO0FBTTFDQyxNQUFBQSxzQkFBc0IsRUFBRSxLQU5rQjtBQU8xQ0MsTUFBQUEsS0FBSyxFQUFFLE1BUG1DO0FBUTFDQyxNQUFBQSxnQkFBZ0IsRUFBRSxLQVJ3QjtBQVMxQ0MsTUFBQUEsTUFBTSxFQUFFLFVBVGtDO0FBVTFDQyxNQUFBQSxTQUFTLEVBQUU7QUFDUEMsUUFBQUEsSUFBSSxFQUFFaEMsb0JBQW9CLENBQUNpQztBQURwQjtBQVYrQixLQUFsRCxFQVJTLENBdUJUOztBQUNBakMsSUFBQUEsb0JBQW9CLENBQUNrQyxhQUFyQixHQXhCUyxDQTBCVDs7QUFDQUMsSUFBQUEsTUFBTSxDQUFDQyxpQkFBUCxDQUF5QnBDLG9CQUFvQixDQUFDcUMsdUJBQTlDLEVBM0JTLENBNkJUOztBQUNBckMsSUFBQUEsb0JBQW9CLENBQUNDLFFBQXJCLENBQThCcUMsRUFBOUIsQ0FBaUMsT0FBakMsRUFBMEMsVUFBQ0MsQ0FBRCxFQUFPO0FBQzdDQSxNQUFBQSxDQUFDLENBQUNDLGNBQUY7QUFDQXhDLE1BQUFBLG9CQUFvQixDQUFDeUMsbUJBQXJCO0FBQ0gsS0FIRCxFQTlCUyxDQW1DVDs7QUFDQXpDLElBQUFBLG9CQUFvQixDQUFDRyxZQUFyQixDQUFrQ21DLEVBQWxDLENBQXFDLE9BQXJDLEVBQThDLFVBQUNDLENBQUQsRUFBTztBQUNqREEsTUFBQUEsQ0FBQyxDQUFDQyxjQUFGO0FBQ0EsVUFBTUUsSUFBSSxHQUFHMUMsb0JBQW9CLENBQUNZLFFBQXJCLENBQThCK0IsSUFBOUIsQ0FBbUMsWUFBbkMsQ0FBYjtBQUNBUixNQUFBQSxNQUFNLENBQUNTLHFCQUFQLENBQTZCRixJQUFJLENBQUNHLFFBQWxDLEVBQTRDN0Msb0JBQW9CLENBQUM4QyxjQUFqRTtBQUNILEtBSkQsRUFwQ1MsQ0EwQ1Q7O0FBQ0E5QyxJQUFBQSxvQkFBb0IsQ0FBQ0ksWUFBckIsQ0FBa0NrQyxFQUFsQyxDQUFxQyxPQUFyQyxFQUE4QyxVQUFDQyxDQUFELEVBQU87QUFDakRBLE1BQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNBLFVBQU1PLFdBQVcsR0FBRy9DLG9CQUFvQixDQUFDSSxZQUFyQixDQUFrQzRDLElBQWxDLENBQXVDLFdBQXZDLENBQXBCOztBQUNBLFVBQUlELFdBQVcsQ0FBQ0UsUUFBWixDQUFxQixTQUFyQixDQUFKLEVBQXFDO0FBQ2pDRixRQUFBQSxXQUFXLENBQUNHLFdBQVosQ0FBd0IsU0FBeEI7QUFDQUMsUUFBQUEsbUJBQW1CLENBQUNDLElBQXBCO0FBQ0gsT0FIRCxNQUdPO0FBQ0hMLFFBQUFBLFdBQVcsQ0FBQ00sUUFBWixDQUFxQixTQUFyQjtBQUNBRixRQUFBQSxtQkFBbUIsQ0FBQ3JDLFVBQXBCO0FBQ0g7QUFDSixLQVZELEVBM0NTLENBdURUOztBQUNBZCxJQUFBQSxvQkFBb0IsQ0FBQ0ssU0FBckIsQ0FBK0JpQyxFQUEvQixDQUFrQyxPQUFsQyxFQUEyQyxVQUFDQyxDQUFELEVBQU87QUFDOUNBLE1BQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNBeEMsTUFBQUEsb0JBQW9CLENBQUNzRCx1QkFBckI7QUFDSCxLQUhELEVBeERTLENBNkRUOztBQUNBcEQsSUFBQUEsQ0FBQyxDQUFDLE9BQUQsQ0FBRCxDQUFXcUQsS0FBWCxDQUFpQixVQUFDQyxLQUFELEVBQVc7QUFDeEIsVUFBSUEsS0FBSyxDQUFDQyxPQUFOLEtBQWtCLEVBQXRCLEVBQTBCO0FBQ3RCekQsUUFBQUEsb0JBQW9CLENBQUN5QyxtQkFBckI7QUFDSDtBQUNKLEtBSkQsRUE5RFMsQ0FvRVQ7O0FBQ0F2QyxJQUFBQSxDQUFDLENBQUMsd0JBQUQsQ0FBRCxDQUE0Qm9DLEVBQTVCLENBQStCLE9BQS9CLEVBQXdDdEMsb0JBQW9CLENBQUMwRCxnQkFBN0QsRUFyRVMsQ0F1RVQ7O0FBQ0FDLElBQUFBLFFBQVEsQ0FBQ0MsZ0JBQVQsQ0FBMEIsa0JBQTFCLEVBQThDNUQsb0JBQW9CLENBQUM2RCxlQUFuRSxFQXhFUyxDQTBFVDs7QUFDQTdELElBQUFBLG9CQUFvQixDQUFDNkQsZUFBckI7QUFDSCxHQXhKd0I7O0FBMEp6QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lILEVBQUFBLGdCQWxLeUIsOEJBa0tOO0FBQ2YsUUFBTUksWUFBWSxHQUFHSCxRQUFRLENBQUNJLGNBQVQsQ0FBd0IscUJBQXhCLENBQXJCOztBQUVBLFFBQUksQ0FBQ0osUUFBUSxDQUFDSyxpQkFBZCxFQUFpQztBQUM3QkYsTUFBQUEsWUFBWSxDQUFDRyxpQkFBYixZQUF1QyxVQUFDQyxHQUFELEVBQVM7QUFDNUNDLFFBQUFBLE9BQU8sQ0FBQ0MsS0FBUix3REFBOERGLEdBQUcsQ0FBQ0csT0FBbEU7QUFDSCxPQUZEO0FBR0gsS0FKRCxNQUlPO0FBQ0hWLE1BQUFBLFFBQVEsQ0FBQ1csY0FBVDtBQUNIO0FBQ0osR0E1S3dCOztBQThLekI7QUFDSjtBQUNBO0FBQ0lULEVBQUFBLGVBakx5Qiw2QkFpTFA7QUFDZFUsSUFBQUEsVUFBVSxDQUFDLFlBQU07QUFDYixVQUFJeEQsU0FBUyxHQUFHQyxNQUFNLENBQUNDLFdBQVAsR0FBcUJqQixvQkFBb0IsQ0FBQ00sV0FBckIsQ0FBaUNrRSxNQUFqQyxHQUEwQ0MsR0FBL0QsR0FBcUUsRUFBckY7O0FBQ0EsVUFBSWQsUUFBUSxDQUFDSyxpQkFBYixFQUFnQztBQUM1QjtBQUNBakQsUUFBQUEsU0FBUyxHQUFHQyxNQUFNLENBQUNDLFdBQVAsR0FBcUIsRUFBakM7QUFDSCxPQUxZLENBTWI7OztBQUNBZixNQUFBQSxDQUFDLENBQUMsdUJBQUQsQ0FBRCxDQUEyQmlCLEdBQTNCLENBQStCLFlBQS9CLFlBQWlESixTQUFqRDtBQUNBZixNQUFBQSxvQkFBb0IsQ0FBQ08sTUFBckIsQ0FBNEJtRSxNQUE1QjtBQUNILEtBVFMsRUFTUCxHQVRPLENBQVY7QUFVSCxHQTVMd0I7O0FBNkx6QjtBQUNKO0FBQ0E7QUFDSXhDLEVBQUFBLGFBaE15QiwyQkFnTVQ7QUFDWmxDLElBQUFBLG9CQUFvQixDQUFDTyxNQUFyQixHQUE4Qm9FLEdBQUcsQ0FBQ0MsSUFBSixDQUFTLHNCQUFULENBQTlCLENBRFksQ0FHWjs7QUFDQSxRQUFNQyxLQUFLLEdBQUdGLEdBQUcsQ0FBQ0csT0FBSixDQUFZLGdCQUFaLENBQWQ7O0FBQ0EsUUFBSUQsS0FBSyxLQUFLRSxTQUFkLEVBQXlCO0FBQ3JCO0FBQ0EsVUFBTUMsT0FBTyxHQUFHSCxLQUFLLENBQUNJLElBQXRCO0FBQ0FqRixNQUFBQSxvQkFBb0IsQ0FBQ08sTUFBckIsQ0FBNEIyRSxPQUE1QixDQUFvQ0MsT0FBcEMsQ0FBNEMsSUFBSUgsT0FBSixFQUE1QztBQUNILEtBVFcsQ0FXWjs7O0FBQ0FoRixJQUFBQSxvQkFBb0IsQ0FBQ08sTUFBckIsQ0FBNEI2RSxRQUE1QixDQUFxQyxtQkFBckM7QUFDQXBGLElBQUFBLG9CQUFvQixDQUFDTyxNQUFyQixDQUE0QjhFLFFBQTVCLENBQXFDQyxhQUFyQyxDQUFtRCxLQUFuRDtBQUNBdEYsSUFBQUEsb0JBQW9CLENBQUNPLE1BQXJCLENBQTRCZ0YsVUFBNUIsQ0FBdUM7QUFDbkNDLE1BQUFBLGVBQWUsRUFBRSxLQURrQjtBQUVuQ0MsTUFBQUEsZUFBZSxFQUFFLEtBRmtCO0FBR25DQyxNQUFBQSxRQUFRLEVBQUU7QUFIeUIsS0FBdkM7QUFNSCxHQXBOd0I7O0FBc056QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsa0JBNU55Qiw4QkE0Tk5DLEtBNU5NLEVBNE5DQyxXQTVORCxFQTROYztBQUNuQyxRQUFNQyxJQUFJLEdBQUcsRUFBYixDQURtQyxDQUduQzs7QUFDQUMsSUFBQUEsTUFBTSxDQUFDQyxPQUFQLENBQWVKLEtBQWYsRUFBc0JLLE9BQXRCLENBQThCLGdCQUFxQjtBQUFBO0FBQUEsVUFBbkJDLEdBQW1CO0FBQUEsVUFBZEMsUUFBYzs7QUFDL0M7QUFDQSxVQUFNQyxRQUFRLEdBQUdELFFBQVEsQ0FBQ0UsSUFBVCxJQUFpQkgsR0FBbEM7QUFDQSxVQUFNSSxLQUFLLEdBQUdGLFFBQVEsQ0FBQ0csS0FBVCxDQUFlLEdBQWYsQ0FBZDtBQUNBLFVBQUlDLE9BQU8sR0FBR1YsSUFBZDtBQUVBUSxNQUFBQSxLQUFLLENBQUNMLE9BQU4sQ0FBYyxVQUFDUSxJQUFELEVBQU9DLEtBQVAsRUFBaUI7QUFDM0IsWUFBSUEsS0FBSyxLQUFLSixLQUFLLENBQUNLLE1BQU4sR0FBZSxDQUE3QixFQUFnQztBQUM1QjtBQUNBSCxVQUFBQSxPQUFPLENBQUNDLElBQUQsQ0FBUCxHQUFnQjtBQUNaRyxZQUFBQSxJQUFJLEVBQUUsTUFETTtBQUVaUCxZQUFBQSxJQUFJLEVBQUVELFFBRk07QUFHWlMsWUFBQUEsSUFBSSxFQUFFVixRQUFRLENBQUNVLElBSEg7QUFJWix1QkFBU1YsUUFBUSxXQUFSLElBQXFCTixXQUFXLEtBQUtPO0FBSmxDLFdBQWhCO0FBTUgsU0FSRCxNQVFPO0FBQ0g7QUFDQSxjQUFJLENBQUNJLE9BQU8sQ0FBQ0MsSUFBRCxDQUFaLEVBQW9CO0FBQ2hCRCxZQUFBQSxPQUFPLENBQUNDLElBQUQsQ0FBUCxHQUFnQjtBQUNaRyxjQUFBQSxJQUFJLEVBQUUsUUFETTtBQUVaRSxjQUFBQSxRQUFRLEVBQUU7QUFGRSxhQUFoQjtBQUlIOztBQUNETixVQUFBQSxPQUFPLEdBQUdBLE9BQU8sQ0FBQ0MsSUFBRCxDQUFQLENBQWNLLFFBQXhCO0FBQ0g7QUFDSixPQW5CRDtBQW9CSCxLQTFCRCxFQUptQyxDQWdDbkM7O0FBQ0EsV0FBTyxLQUFLQyxtQkFBTCxDQUF5QmpCLElBQXpCLEVBQStCLEVBQS9CLENBQVA7QUFDSCxHQTlQd0I7O0FBZ1F6QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSWlCLEVBQUFBLG1CQXRReUIsK0JBc1FMakIsSUF0UUssRUFzUUNrQixNQXRRRCxFQXNRUztBQUFBOztBQUM5QixRQUFNQyxLQUFLLEdBQUcsRUFBZCxDQUQ4QixDQUc5Qjs7QUFDQSxRQUFNakIsT0FBTyxHQUFHRCxNQUFNLENBQUNDLE9BQVAsQ0FBZUYsSUFBZixFQUFxQm9CLElBQXJCLENBQTBCLHdCQUFnQztBQUFBO0FBQUEsVUFBOUJDLElBQThCO0FBQUEsVUFBeEJDLElBQXdCOztBQUFBO0FBQUEsVUFBaEJDLElBQWdCO0FBQUEsVUFBVkMsSUFBVTs7QUFDdEUsVUFBSUYsSUFBSSxDQUFDUixJQUFMLEtBQWMsUUFBZCxJQUEwQlUsSUFBSSxDQUFDVixJQUFMLEtBQWMsTUFBNUMsRUFBb0QsT0FBTyxDQUFDLENBQVI7QUFDcEQsVUFBSVEsSUFBSSxDQUFDUixJQUFMLEtBQWMsTUFBZCxJQUF3QlUsSUFBSSxDQUFDVixJQUFMLEtBQWMsUUFBMUMsRUFBb0QsT0FBTyxDQUFQO0FBQ3BELGFBQU9PLElBQUksQ0FBQ0ksYUFBTCxDQUFtQkYsSUFBbkIsQ0FBUDtBQUNILEtBSmUsQ0FBaEI7QUFNQXJCLElBQUFBLE9BQU8sQ0FBQ0MsT0FBUixDQUFnQixpQkFBa0I7QUFBQTtBQUFBLFVBQWhCQyxHQUFnQjtBQUFBLFVBQVhzQixLQUFXOztBQUM5QixVQUFJQSxLQUFLLENBQUNaLElBQU4sS0FBZSxRQUFuQixFQUE2QjtBQUN6QjtBQUNBSyxRQUFBQSxLQUFLLENBQUNRLElBQU4sQ0FBVztBQUNQQyxVQUFBQSxJQUFJLFlBQUtWLE1BQUwsMkNBQTBDZCxHQUExQyxDQURHO0FBRVBzQixVQUFBQSxLQUFLLEVBQUUsRUFGQTtBQUdQRyxVQUFBQSxRQUFRLEVBQUUsSUFISDtBQUlQZixVQUFBQSxJQUFJLEVBQUU7QUFKQyxTQUFYLEVBRnlCLENBU3pCOztBQUNBLFlBQU1nQixVQUFVLEdBQUcsS0FBSSxDQUFDYixtQkFBTCxDQUF5QlMsS0FBSyxDQUFDVixRQUEvQixFQUF5Q0UsTUFBTSxHQUFHLDBCQUFsRCxDQUFuQjs7QUFDQUMsUUFBQUEsS0FBSyxDQUFDUSxJQUFOLE9BQUFSLEtBQUsscUJBQVNXLFVBQVQsRUFBTDtBQUNILE9BWkQsTUFZTztBQUNIO0FBQ0FYLFFBQUFBLEtBQUssQ0FBQ1EsSUFBTixDQUFXO0FBQ1BDLFVBQUFBLElBQUksWUFBS1YsTUFBTCxpREFBZ0RkLEdBQWhELGVBQXdEc0IsS0FBSyxDQUFDWCxJQUE5RCxNQURHO0FBRVBXLFVBQUFBLEtBQUssRUFBRUEsS0FBSyxDQUFDbkIsSUFGTjtBQUdQd0IsVUFBQUEsUUFBUSxFQUFFTCxLQUFLLFdBSFI7QUFJUFosVUFBQUEsSUFBSSxFQUFFO0FBSkMsU0FBWDtBQU1IO0FBQ0osS0F0QkQ7QUF3QkEsV0FBT0ssS0FBUDtBQUNILEdBelN3Qjs7QUEyU3pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJaEYsRUFBQUEsa0JBalR5Qiw4QkFpVE42RixRQWpUTSxFQWlUSUMsTUFqVEosRUFpVFk7QUFDakMsUUFBTUMsTUFBTSxHQUFHRixRQUFRLENBQUNDLE1BQU0sQ0FBQ0MsTUFBUixDQUFSLElBQTJCLEVBQTFDO0FBQ0EsUUFBSUMsSUFBSSxHQUFHLEVBQVg7QUFFQS9ILElBQUFBLENBQUMsQ0FBQ2dJLElBQUYsQ0FBT0YsTUFBUCxFQUFlLFVBQUN0QixLQUFELEVBQVF5QixNQUFSLEVBQW1CO0FBQzlCO0FBQ0EsVUFBSW5JLG9CQUFvQixDQUFDUyxTQUFyQixJQUFrQ1Qsb0JBQW9CLENBQUNTLFNBQXJCLENBQStCaUcsS0FBL0IsQ0FBdEMsRUFBNkU7QUFDekUsWUFBTTBCLElBQUksR0FBR3BJLG9CQUFvQixDQUFDUyxTQUFyQixDQUErQmlHLEtBQS9CLENBQWI7O0FBRUEsWUFBSTBCLElBQUksQ0FBQ3hCLElBQUwsS0FBYyxRQUFsQixFQUE0QjtBQUN4QjtBQUNBcUIsVUFBQUEsSUFBSSwyREFBZ0RHLElBQUksQ0FBQ1YsSUFBckQsV0FBSjtBQUNILFNBSEQsTUFHTztBQUNIO0FBQ0EsY0FBTUcsUUFBUSxHQUFHTyxJQUFJLENBQUNQLFFBQUwsR0FBZ0IsaUJBQWhCLEdBQW9DLEVBQXJEO0FBQ0FJLFVBQUFBLElBQUksZ0NBQXdCSixRQUF4Qiw2QkFBaURNLE1BQU0sQ0FBQ0osTUFBTSxDQUFDUCxLQUFSLENBQXZELGdCQUEwRVksSUFBSSxDQUFDVixJQUEvRSxXQUFKO0FBQ0g7QUFDSixPQVhELE1BV087QUFDSDtBQUNBLFlBQU1XLGFBQWEsR0FBSUYsTUFBTSxDQUFDSixNQUFNLENBQUNKLFFBQVIsQ0FBUCxHQUE0QixXQUE1QixHQUEwQyxFQUFoRTtBQUNBTSxRQUFBQSxJQUFJLDJCQUFtQkksYUFBbkIsaUNBQXFERixNQUFNLENBQUNKLE1BQU0sQ0FBQ1AsS0FBUixDQUEzRCxnQkFBOEVXLE1BQU0sQ0FBQ0osTUFBTSxDQUFDTCxJQUFSLENBQXBGLFdBQUo7QUFDSDtBQUNKLEtBbEJEO0FBb0JBLFdBQU9PLElBQVA7QUFDSCxHQTFVd0I7O0FBNFV6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJNUYsRUFBQUEsdUJBaFZ5QixtQ0FnVkR5RixRQWhWQyxFQWdWUztBQUM5QixRQUFJQSxRQUFRLEtBQUssS0FBakIsRUFBd0I7QUFDcEI5SCxNQUFBQSxvQkFBb0IsQ0FBQ1csT0FBckIsQ0FBNkJ1QyxXQUE3QixDQUF5QyxRQUF6QztBQUNBO0FBQ0gsS0FKNkIsQ0FNOUI7OztBQUNBLFFBQUksQ0FBQzRFLFFBQVEsQ0FBQ2xDLEtBQWQsRUFBcUI7QUFDakI1RixNQUFBQSxvQkFBb0IsQ0FBQ1csT0FBckIsQ0FBNkJ1QyxXQUE3QixDQUF5QyxRQUF6QztBQUNBO0FBQ0gsS0FWNkIsQ0FZOUI7OztBQUNBLFFBQUlvRixNQUFNLEdBQUcsRUFBYjtBQUNBLFFBQU1DLFFBQVEsR0FBR3ZJLG9CQUFvQixDQUFDWSxRQUFyQixDQUE4QitCLElBQTlCLENBQW1DLFdBQW5DLEVBQWdELFVBQWhELENBQWpCOztBQUNBLFFBQUkzQyxvQkFBb0IsQ0FBQ1MsU0FBckIsQ0FBK0JrRyxNQUEvQixLQUEwQyxDQUExQyxJQUErQzRCLFFBQVEsS0FBSyxFQUFoRSxFQUFvRTtBQUNoRUQsTUFBQUEsTUFBTSxHQUFHQyxRQUFRLENBQUNDLElBQVQsRUFBVDtBQUNILEtBakI2QixDQW1COUI7OztBQUNBeEksSUFBQUEsb0JBQW9CLENBQUNTLFNBQXJCLEdBQWlDVCxvQkFBb0IsQ0FBQzJGLGtCQUFyQixDQUF3Q21DLFFBQVEsQ0FBQ2xDLEtBQWpELEVBQXdEMEMsTUFBeEQsQ0FBakMsQ0FwQjhCLENBc0I5Qjs7QUFDQSxRQUFNRyxjQUFjLEdBQUd6SSxvQkFBb0IsQ0FBQ1MsU0FBckIsQ0FBK0JpSSxHQUEvQixDQUFtQyxVQUFDTixJQUFELEVBQU8xQixLQUFQLEVBQWlCO0FBQ3ZFLFVBQUkwQixJQUFJLENBQUN4QixJQUFMLEtBQWMsUUFBbEIsRUFBNEI7QUFDeEIsZUFBTztBQUNIYyxVQUFBQSxJQUFJLEVBQUVVLElBQUksQ0FBQ1YsSUFBTCxDQUFVaUIsT0FBVixDQUFrQixVQUFsQixFQUE4QixFQUE5QixDQURIO0FBQ3NDO0FBQ3pDbkIsVUFBQUEsS0FBSyxFQUFFLEVBRko7QUFHSEcsVUFBQUEsUUFBUSxFQUFFO0FBSFAsU0FBUDtBQUtILE9BTkQsTUFNTztBQUNILGVBQU87QUFDSEQsVUFBQUEsSUFBSSxFQUFFVSxJQUFJLENBQUNWLElBQUwsQ0FBVWlCLE9BQVYsQ0FBa0IsVUFBbEIsRUFBOEIsRUFBOUIsQ0FESDtBQUNzQztBQUN6Q25CLFVBQUFBLEtBQUssRUFBRVksSUFBSSxDQUFDWixLQUZUO0FBR0hLLFVBQUFBLFFBQVEsRUFBRU8sSUFBSSxDQUFDUDtBQUhaLFNBQVA7QUFLSDtBQUNKLEtBZHNCLENBQXZCLENBdkI4QixDQXVDOUI7O0FBQ0E3SCxJQUFBQSxvQkFBb0IsQ0FBQ1EsbUJBQXJCLENBQXlDWSxRQUF6QyxDQUFrRCxZQUFsRCxFQUFnRTtBQUM1RDRHLE1BQUFBLE1BQU0sRUFBRVM7QUFEb0QsS0FBaEUsRUF4QzhCLENBNEM5Qjs7QUFDQSxRQUFNRyxZQUFZLEdBQUc1SSxvQkFBb0IsQ0FBQ1MsU0FBckIsQ0FBK0J1QyxJQUEvQixDQUFvQyxVQUFBb0YsSUFBSTtBQUFBLGFBQUlBLElBQUksQ0FBQ1AsUUFBVDtBQUFBLEtBQXhDLENBQXJCOztBQUNBLFFBQUllLFlBQUosRUFBa0I7QUFDZDVJLE1BQUFBLG9CQUFvQixDQUFDUSxtQkFBckIsQ0FBeUNZLFFBQXpDLENBQWtELGNBQWxELEVBQWtFd0gsWUFBWSxDQUFDcEIsS0FBL0UsRUFEYyxDQUVkOztBQUNBeEgsTUFBQUEsb0JBQW9CLENBQUNRLG1CQUFyQixDQUF5Q1ksUUFBekMsQ0FBa0QsVUFBbEQsRUFBOER3SCxZQUFZLENBQUNwQixLQUEzRTtBQUNILEtBbEQ2QixDQW9EOUI7OztBQUNBeEgsSUFBQUEsb0JBQW9CLENBQUNXLE9BQXJCLENBQTZCdUMsV0FBN0IsQ0FBeUMsUUFBekM7QUFDSCxHQXRZd0I7O0FBd1l6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJNUIsRUFBQUEsY0E1WXlCLDBCQTRZVmtHLEtBNVlVLEVBNFlIO0FBQ2xCLFFBQUlBLEtBQUssQ0FBQ2IsTUFBTixLQUFpQixDQUFyQixFQUF3QjtBQUNwQjtBQUNILEtBSGlCLENBS2xCOzs7QUFDQTNHLElBQUFBLG9CQUFvQixDQUFDUSxtQkFBckIsQ0FBeUNZLFFBQXpDLENBQWtELFVBQWxELEVBQThEb0csS0FBOUQ7QUFFQXhILElBQUFBLG9CQUFvQixDQUFDWSxRQUFyQixDQUE4QitCLElBQTlCLENBQW1DLFdBQW5DLEVBQWdELFVBQWhELEVBQTRENkUsS0FBNUQ7QUFDQXhILElBQUFBLG9CQUFvQixDQUFDeUMsbUJBQXJCO0FBQ0gsR0F0WndCOztBQXdaekI7QUFDSjtBQUNBO0FBQ0lBLEVBQUFBLG1CQTNaeUIsaUNBMlpIO0FBQ2xCLFFBQU1vRyxNQUFNLEdBQUc3SSxvQkFBb0IsQ0FBQ1ksUUFBckIsQ0FBOEIrQixJQUE5QixDQUFtQyxZQUFuQyxDQUFmO0FBQ0FSLElBQUFBLE1BQU0sQ0FBQzJHLG9CQUFQLENBQTRCRCxNQUE1QixFQUFvQzdJLG9CQUFvQixDQUFDK0ksZUFBekQ7QUFDSCxHQTlad0I7O0FBZ2F6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQSxFQUFBQSxlQXBheUIsMkJBb2FUckcsSUFwYVMsRUFvYUg7QUFDbEIxQyxJQUFBQSxvQkFBb0IsQ0FBQ08sTUFBckIsQ0FBNEJ5SSxVQUE1QixHQUF5Q0MsUUFBekMsQ0FBa0R2RyxJQUFJLENBQUN3RyxPQUF2RDtBQUNBLFFBQU1DLEdBQUcsR0FBR25KLG9CQUFvQixDQUFDTyxNQUFyQixDQUE0QjJFLE9BQTVCLENBQW9Da0UsU0FBcEMsS0FBa0QsQ0FBOUQ7QUFDQSxRQUFNQyxNQUFNLEdBQUdySixvQkFBb0IsQ0FBQ08sTUFBckIsQ0FBNEIyRSxPQUE1QixDQUFvQ29FLE9BQXBDLENBQTRDSCxHQUE1QyxFQUFpRHhDLE1BQWhFLENBSGtCLENBR3NEOztBQUN4RTNHLElBQUFBLG9CQUFvQixDQUFDTyxNQUFyQixDQUE0QmdKLFFBQTVCLENBQXFDSixHQUFHLEdBQUcsQ0FBM0MsRUFBOENFLE1BQTlDO0FBQ0FySixJQUFBQSxvQkFBb0IsQ0FBQ1csT0FBckIsQ0FBNkJ1QyxXQUE3QixDQUF5QyxRQUF6QztBQUNILEdBMWF3Qjs7QUE0YXpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lKLEVBQUFBLGNBaGJ5QiwwQkFnYlZnRixRQWhiVSxFQWdiQTtBQUNyQixRQUFJQSxRQUFRLEtBQUssS0FBakIsRUFBd0I7QUFDcEI5RyxNQUFBQSxNQUFNLENBQUN3SSxRQUFQLEdBQWtCMUIsUUFBUSxDQUFDakYsUUFBM0I7QUFDSDtBQUNKLEdBcGJ3Qjs7QUFzYnpCO0FBQ0o7QUFDQTtBQUNJUyxFQUFBQSx1QkF6YnlCLHFDQXliQTtBQUNyQixRQUFNaUYsUUFBUSxHQUFHdkksb0JBQW9CLENBQUNZLFFBQXJCLENBQThCK0IsSUFBOUIsQ0FBbUMsV0FBbkMsRUFBZ0QsVUFBaEQsQ0FBakI7O0FBQ0EsUUFBSTRGLFFBQVEsQ0FBQzVCLE1BQVQsR0FBZ0IsQ0FBcEIsRUFBc0I7QUFDbEJ4RSxNQUFBQSxNQUFNLENBQUNzSCxlQUFQLENBQXVCbEIsUUFBdkIsRUFBaUN2SSxvQkFBb0IsQ0FBQzBKLGlCQUF0RDtBQUNIO0FBQ0osR0E5YndCOztBQWdjekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUEsRUFBQUEsaUJBcGN5Qiw2QkFvY1A1QixRQXBjTyxFQW9jRTtBQUN2QixRQUFJQSxRQUFRLENBQUM2QixNQUFULEtBQWtCLEtBQWxCLElBQTJCN0IsUUFBUSxDQUFDOEIsUUFBVCxLQUFzQjdFLFNBQXJELEVBQWdFO0FBQzVEOEUsTUFBQUEsV0FBVyxDQUFDQyxlQUFaLENBQTRCaEMsUUFBUSxDQUFDOEIsUUFBckM7QUFDSCxLQUZELE1BRU87QUFDSDVKLE1BQUFBLG9CQUFvQixDQUFDeUMsbUJBQXJCO0FBQ0g7QUFDSjtBQTFjd0IsQ0FBN0IsQyxDQTZjQTs7QUFDQXZDLENBQUMsQ0FBQ3lELFFBQUQsQ0FBRCxDQUFZb0csS0FBWixDQUFrQixZQUFNO0FBQ3BCL0osRUFBQUEsb0JBQW9CLENBQUNjLFVBQXJCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG4vKiBnbG9iYWwgYWNlLCBQYnhBcGksIHVwZGF0ZUxvZ1ZpZXdXb3JrZXIsIEFjZSwgVXNlck1lc3NhZ2UgKi9cblxuLyoqXG4gKiBSZXByZXNlbnRzIHRoZSBzeXN0ZW0gZGlhZ25vc3RpYyBsb2dzIG9iamVjdC5cbiAqXG4gKiBAbW9kdWxlIHN5c3RlbURpYWdub3N0aWNMb2dzXG4gKi9cbmNvbnN0IHN5c3RlbURpYWdub3N0aWNMb2dzID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBcIlNob3cgTGFzdCBMb2dcIiBidXR0b24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc2hvd0J0bjogJCgnI3Nob3ctbGFzdC1sb2cnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBcIkRvd25sb2FkIEZpbGVcIiBidXR0b24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZG93bmxvYWRCdG46ICQoJyNkb3dubG9hZC1maWxlJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgXCJTaG93IExhc3QgTG9nIChBdXRvKVwiIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzaG93QXV0b0J0bjogJCgnI3Nob3ctbGFzdC1sb2ctYXV0bycpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIFwiRXJhc2UgY3VycmVudCBmaWxlIGNvbnRlbnRcIiBidXR0b24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZXJhc2VCdG46ICQoJyNlcmFzZS1maWxlJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgbG9nIGNvbnRlbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbG9nQ29udGVudDogJCgnI2xvZy1jb250ZW50LXJlYWRvbmx5JyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgdmlld2VyIGZvciBkaXNwbGF5aW5nIHRoZSBsb2cgY29udGVudC5cbiAgICAgKiBAdHlwZSB7QWNlfVxuICAgICAqL1xuICAgIHZpZXdlcjogJycsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZmlsZSBzZWxlY3QgZHJvcGRvd24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZmlsZVNlbGVjdERyb3BEb3duOiAkKCcjc3lzdGVtLWRpYWdub3N0aWMtZm9ybSAuZmlsZW5hbWVzLXNlbGVjdCcpLFxuXG4gICAgLyoqXG4gICAgICogQXJyYXkgb2YgbG9nIGl0ZW1zLlxuICAgICAqIEB0eXBlIHtBcnJheX1cbiAgICAgKi9cbiAgICBsb2dzSXRlbXM6IFtdLFxuXG4gICAgLyoqXG4gICAgICogRGVmYXVsdCBsb2cgaXRlbS5cbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIGRlZmF1bHRMb2dJdGVtOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGRpbW1lci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkaW1tZXI6ICQoJyNnZXQtbG9ncy1kaW1tZXInKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNzeXN0ZW0tZGlhZ25vc3RpYy1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZmlsZW5hbWUuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZmlsZU5hbWU6ICQoJyNzeXN0ZW0tZGlhZ25vc3RpYy1mb3JtIC5maWxlbmFtZScpLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIHN5c3RlbSBkaWFnbm9zdGljIGxvZ3MuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgY29uc3QgYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gMjUwO1xuXG4gICAgICAgIC8vIFNldCB0aGUgbWluaW11bSBoZWlnaHQgb2YgdGhlIGxvZyBjb250YWluZXJcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5jbG9zZXN0KCdkaXYnKS5jc3MoJ21pbi1oZWlnaHQnLCBgJHthY2VIZWlnaHR9cHhgKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBkcm9wZG93biBtZW51IGZvciBsb2cgZmlsZXMgd2l0aCB0cmVlIHN1cHBvcnRcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTZW1hbnRpYyBVSSBkcm9wZG93biB3aXRoIGN1c3RvbSBtZW51IGdlbmVyYXRpb25cbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6IHN5c3RlbURpYWdub3N0aWNMb2dzLmNiT25DaGFuZ2VGaWxlLFxuICAgICAgICAgICAgICAgIGlnbm9yZUNhc2U6IHRydWUsXG4gICAgICAgICAgICAgICAgZnVsbFRleHRTZWFyY2g6IHRydWUsXG4gICAgICAgICAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgICAgIHByZXNlcnZlSFRNTDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBhbGxvd0NhdGVnb3J5U2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBtYXRjaDogJ3RleHQnLFxuICAgICAgICAgICAgICAgIGZpbHRlclJlbW90ZURhdGE6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGFjdGlvbjogJ2FjdGl2YXRlJyxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgbWVudTogc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY3VzdG9tRHJvcGRvd25NZW51XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBBQ0UgZWRpdG9yIGZvciBsb2cgY29udGVudFxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pbml0aWFsaXplQWNlKCk7XG5cbiAgICAgICAgLy8gRmV0Y2ggdGhlIGxpc3Qgb2YgbG9nIGZpbGVzXG4gICAgICAgIFBieEFwaS5TeXNsb2dHZXRMb2dzTGlzdChzeXN0ZW1EaWFnbm9zdGljTG9ncy5jYkZvcm1hdERyb3Bkb3duUmVzdWx0cyk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIFwiU2hvdyBMb2dcIiBidXR0b24gY2xpY2tcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJHNob3dCdG4ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIFwiRG93bmxvYWQgTG9nXCIgYnV0dG9uIGNsaWNrXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkb3dubG9hZEJ0bi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgICAgIFBieEFwaS5TeXNsb2dEb3dubG9hZExvZ0ZpbGUoZGF0YS5maWxlbmFtZSwgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY2JEb3dubG9hZEZpbGUpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgXCJBdXRvIFJlZnJlc2hcIiBidXR0b24gY2xpY2tcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJHNob3dBdXRvQnRuLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkcmVsb2FkSWNvbiA9IHN5c3RlbURpYWdub3N0aWNMb2dzLiRzaG93QXV0b0J0bi5maW5kKCdpLnJlZnJlc2gnKTtcbiAgICAgICAgICAgIGlmICgkcmVsb2FkSWNvbi5oYXNDbGFzcygnbG9hZGluZycpKSB7XG4gICAgICAgICAgICAgICAgJHJlbG9hZEljb24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICB1cGRhdGVMb2dWaWV3V29ya2VyLnN0b3AoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHJlbG9hZEljb24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICB1cGRhdGVMb2dWaWV3V29ya2VyLmluaXRpYWxpemUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIHRoZSBcIkVyYXNlIGZpbGVcIiBidXR0b24gY2xpY2tcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGVyYXNlQnRuLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5lcmFzZUN1cnJlbnRGaWxlQ29udGVudCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgRW50ZXIga2V5cHJlc3Mgb24gaW5wdXQgZmllbGRzXG4gICAgICAgICQoJ2lucHV0Jykua2V5dXAoKGV2ZW50KSA9PiB7XG4gICAgICAgICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMTMpIHtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy51cGRhdGVMb2dGcm9tU2VydmVyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciBGdWxsc2NyZWVuIGJ1dHRvbiBjbGlja1xuICAgICAgICAkKCcuZnVsbHNjcmVlbi10b2dnbGUtYnRuJykub24oJ2NsaWNrJywgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudG9nZ2xlRnVsbFNjcmVlbik7XG5cbiAgICAgICAgLy8gTGlzdGVuaW5nIGZvciB0aGUgZnVsbHNjcmVlbiBjaGFuZ2UgZXZlbnRcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignZnVsbHNjcmVlbmNoYW5nZScsIHN5c3RlbURpYWdub3N0aWNMb2dzLmFkanVzdExvZ0hlaWdodCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbCBoZWlnaHQgY2FsY3VsYXRpb25cbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuYWRqdXN0TG9nSGVpZ2h0KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZXMgdGhlIGZ1bGwtc2NyZWVuIG1vZGUgb2YgdGhlICdzeXN0ZW0tbG9ncy1zZWdtZW50JyBlbGVtZW50LlxuICAgICAqIElmIHRoZSBlbGVtZW50IGlzIG5vdCBpbiBmdWxsLXNjcmVlbiBtb2RlLCBpdCByZXF1ZXN0cyBmdWxsLXNjcmVlbiBtb2RlLlxuICAgICAqIElmIHRoZSBlbGVtZW50IGlzIGFscmVhZHkgaW4gZnVsbC1zY3JlZW4gbW9kZSwgaXQgZXhpdHMgZnVsbC1zY3JlZW4gbW9kZS5cbiAgICAgKiBMb2dzIGFuIGVycm9yIG1lc3NhZ2UgdG8gdGhlIGNvbnNvbGUgaWYgdGhlcmUgaXMgYW4gaXNzdWUgZW5hYmxpbmcgZnVsbC1zY3JlZW4gbW9kZS5cbiAgICAgKlxuICAgICAqIEByZXR1cm4ge3ZvaWR9XG4gICAgICovXG4gICAgdG9nZ2xlRnVsbFNjcmVlbigpIHtcbiAgICAgICAgY29uc3QgbG9nQ29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3N5c3RlbS1sb2dzLXNlZ21lbnQnKTtcblxuICAgICAgICBpZiAoIWRvY3VtZW50LmZ1bGxzY3JlZW5FbGVtZW50KSB7XG4gICAgICAgICAgICBsb2dDb250YWluZXIucmVxdWVzdEZ1bGxzY3JlZW4oKS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgYXR0ZW1wdGluZyB0byBlbmFibGUgZnVsbC1zY3JlZW4gbW9kZTogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZG9jdW1lbnQuZXhpdEZ1bGxzY3JlZW4oKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGdW5jdGlvbiB0byBhZGp1c3QgdGhlIGhlaWdodCBvZiB0aGUgbG9ncyBkZXBlbmRpbmcgb24gdGhlIHNjcmVlbiBtb2RlLlxuICAgICAqL1xuICAgIGFkanVzdExvZ0hlaWdodCgpIHtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBsZXQgYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGxvZ0NvbnRlbnQub2Zmc2V0KCkudG9wIC0gMjU7XG4gICAgICAgICAgICBpZiAoZG9jdW1lbnQuZnVsbHNjcmVlbkVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiBmdWxsc2NyZWVuIG1vZGUgaXMgYWN0aXZlXG4gICAgICAgICAgICAgICAgYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gODA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBSZWNhbGN1bGF0ZSB0aGUgc2l6ZSBvZiB0aGUgQUNFIGVkaXRvclxuICAgICAgICAgICAgJCgnLmxvZy1jb250ZW50LXJlYWRvbmx5JykuY3NzKCdtaW4taGVpZ2h0JywgIGAke2FjZUhlaWdodH1weGApO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnJlc2l6ZSgpO1xuICAgICAgICB9LCAzMDApO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIEFDRSBlZGl0b3IgZm9yIGxvZyB2aWV3aW5nLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVBY2UoKSB7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlciA9IGFjZS5lZGl0KCdsb2ctY29udGVudC1yZWFkb25seScpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBKdWxpYSBtb2RlIGlzIGF2YWlsYWJsZVxuICAgICAgICBjb25zdCBqdWxpYSA9IGFjZS5yZXF1aXJlKCdhY2UvbW9kZS9qdWxpYScpO1xuICAgICAgICBpZiAoanVsaWEgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gU2V0IHRoZSBtb2RlIHRvIEp1bGlhIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgY29uc3QgSW5pTW9kZSA9IGp1bGlhLk1vZGU7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIuc2Vzc2lvbi5zZXRNb2RlKG5ldyBJbmlNb2RlKCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0IHRoZSB0aGVtZSBhbmQgb3B0aW9ucyBmb3IgdGhlIEFDRSBlZGl0b3JcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIucmVuZGVyZXIuc2V0U2hvd0d1dHRlcihmYWxzZSk7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlci5zZXRPcHRpb25zKHtcbiAgICAgICAgICAgIHNob3dMaW5lTnVtYmVyczogZmFsc2UsXG4gICAgICAgICAgICBzaG93UHJpbnRNYXJnaW46IGZhbHNlLFxuICAgICAgICAgICAgcmVhZE9ubHk6IHRydWUsXG4gICAgICAgIH0pO1xuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJ1aWxkcyBhIGhpZXJhcmNoaWNhbCB0cmVlIHN0cnVjdHVyZSBmcm9tIGZsYXQgZmlsZSBwYXRoc1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBmaWxlcyAtIFRoZSBmaWxlcyBvYmplY3QgZnJvbSBBUEkgcmVzcG9uc2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZGVmYXVsdFBhdGggLSBUaGUgZGVmYXVsdCBzZWxlY3RlZCBmaWxlIHBhdGhcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFRyZWUgc3RydWN0dXJlIGZvciB0aGUgZHJvcGRvd25cbiAgICAgKi9cbiAgICBidWlsZFRyZWVTdHJ1Y3R1cmUoZmlsZXMsIGRlZmF1bHRQYXRoKSB7XG4gICAgICAgIGNvbnN0IHRyZWUgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIHRoZSB0cmVlIHN0cnVjdHVyZVxuICAgICAgICBPYmplY3QuZW50cmllcyhmaWxlcykuZm9yRWFjaCgoW2tleSwgZmlsZURhdGFdKSA9PiB7XG4gICAgICAgICAgICAvLyBVc2UgZmlsZURhdGEucGF0aCBhcyB0aGUgYWN0dWFsIGZpbGUgcGF0aFxuICAgICAgICAgICAgY29uc3QgZmlsZVBhdGggPSBmaWxlRGF0YS5wYXRoIHx8IGtleTtcbiAgICAgICAgICAgIGNvbnN0IHBhcnRzID0gZmlsZVBhdGguc3BsaXQoJy8nKTtcbiAgICAgICAgICAgIGxldCBjdXJyZW50ID0gdHJlZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcGFydHMuZm9yRWFjaCgocGFydCwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoaW5kZXggPT09IHBhcnRzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBpcyBhIGZpbGVcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudFtwYXJ0XSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdmaWxlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IGZpbGVQYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2l6ZTogZmlsZURhdGEuc2l6ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IGZpbGVEYXRhLmRlZmF1bHQgfHwgKGRlZmF1bHRQYXRoID09PSBmaWxlUGF0aClcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBUaGlzIGlzIGEgZGlyZWN0b3J5XG4gICAgICAgICAgICAgICAgICAgIGlmICghY3VycmVudFtwYXJ0XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudFtwYXJ0XSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZm9sZGVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjoge31cbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY3VycmVudCA9IGN1cnJlbnRbcGFydF0uY2hpbGRyZW47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29udmVydCB0cmVlIHRvIGRyb3Bkb3duIGl0ZW1zXG4gICAgICAgIHJldHVybiB0aGlzLnRyZWVUb0Ryb3Bkb3duSXRlbXModHJlZSwgJycpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ29udmVydHMgdHJlZSBzdHJ1Y3R1cmUgdG8gZHJvcGRvd24gaXRlbXMgd2l0aCBwcm9wZXIgZm9ybWF0dGluZ1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSB0cmVlIC0gVGhlIHRyZWUgc3RydWN0dXJlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHByZWZpeCAtIFByZWZpeCBmb3IgaW5kZW50YXRpb25cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IEZvcm1hdHRlZCBkcm9wZG93biBpdGVtc1xuICAgICAqL1xuICAgIHRyZWVUb0Ryb3Bkb3duSXRlbXModHJlZSwgcHJlZml4KSB7XG4gICAgICAgIGNvbnN0IGl0ZW1zID0gW107XG4gICAgICAgIFxuICAgICAgICAvLyBTb3J0IGVudHJpZXM6IGZvbGRlcnMgZmlyc3QsIHRoZW4gZmlsZXNcbiAgICAgICAgY29uc3QgZW50cmllcyA9IE9iamVjdC5lbnRyaWVzKHRyZWUpLnNvcnQoKFthS2V5LCBhVmFsXSwgW2JLZXksIGJWYWxdKSA9PiB7XG4gICAgICAgICAgICBpZiAoYVZhbC50eXBlID09PSAnZm9sZGVyJyAmJiBiVmFsLnR5cGUgPT09ICdmaWxlJykgcmV0dXJuIC0xO1xuICAgICAgICAgICAgaWYgKGFWYWwudHlwZSA9PT0gJ2ZpbGUnICYmIGJWYWwudHlwZSA9PT0gJ2ZvbGRlcicpIHJldHVybiAxO1xuICAgICAgICAgICAgcmV0dXJuIGFLZXkubG9jYWxlQ29tcGFyZShiS2V5KTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBlbnRyaWVzLmZvckVhY2goKFtrZXksIHZhbHVlXSkgPT4ge1xuICAgICAgICAgICAgaWYgKHZhbHVlLnR5cGUgPT09ICdmb2xkZXInKSB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIGZvbGRlciBoZWFkZXJcbiAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogYCR7cHJlZml4fTxpIGNsYXNzPVwiZm9sZGVyIGljb25cIj48L2k+ICR7a2V5fWAsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdmb2xkZXInXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQWRkIGNoaWxkcmVuIHdpdGggaW5jcmVhc2VkIGluZGVudGF0aW9uXG4gICAgICAgICAgICAgICAgY29uc3QgY2hpbGRJdGVtcyA9IHRoaXMudHJlZVRvRHJvcGRvd25JdGVtcyh2YWx1ZS5jaGlsZHJlbiwgcHJlZml4ICsgJyZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOycpO1xuICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goLi4uY2hpbGRJdGVtcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEFkZCBmaWxlIGl0ZW1cbiAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogYCR7cHJlZml4fTxpIGNsYXNzPVwiZmlsZSBvdXRsaW5lIGljb25cIj48L2k+ICR7a2V5fSAoJHt2YWx1ZS5zaXplfSlgLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWUucGF0aCxcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWQ6IHZhbHVlLmRlZmF1bHQsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdmaWxlJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBpdGVtcztcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgY3VzdG9tIGRyb3Bkb3duIG1lbnUgSFRNTCBmb3IgbG9nIGZpbGVzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGNvbnRhaW5pbmcgZHJvcGRvd24gbWVudSBvcHRpb25zXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGZpZWxkcyAtIFRoZSBmaWVsZHMgaW4gdGhlIHJlc3BvbnNlIHRvIHVzZSBmb3IgdGhlIG1lbnUgb3B0aW9uc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBIVE1MIHN0cmluZyBmb3IgdGhlIGN1c3RvbSBkcm9wZG93biBtZW51XG4gICAgICovXG4gICAgY3VzdG9tRHJvcGRvd25NZW51KHJlc3BvbnNlLCBmaWVsZHMpIHtcbiAgICAgICAgY29uc3QgdmFsdWVzID0gcmVzcG9uc2VbZmllbGRzLnZhbHVlc10gfHwge307XG4gICAgICAgIGxldCBodG1sID0gJyc7XG4gICAgICAgIFxuICAgICAgICAkLmVhY2godmFsdWVzLCAoaW5kZXgsIG9wdGlvbikgPT4ge1xuICAgICAgICAgICAgLy8gRm9yIHRyZWUgc3RydWN0dXJlIGl0ZW1zXG4gICAgICAgICAgICBpZiAoc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zICYmIHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtc1tpbmRleF0pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpdGVtID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zW2luZGV4XTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoaXRlbS50eXBlID09PSAnZm9sZGVyJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBGb2xkZXIgaXRlbSAtIGRpc2FibGVkIGFuZCB3aXRoIGZvbGRlciBpY29uXG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJkaXNhYmxlZCBpdGVtXCIgZGF0YS12YWx1ZT1cIlwiPiR7aXRlbS5uYW1lfTwvZGl2PmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRmlsZSBpdGVtIHdpdGggcHJvcGVyIHZhbHVlXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdGVkID0gaXRlbS5zZWxlY3RlZCA/ICdzZWxlY3RlZCBhY3RpdmUnIDogJyc7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtICR7c2VsZWN0ZWR9XCIgZGF0YS12YWx1ZT1cIiR7b3B0aW9uW2ZpZWxkcy52YWx1ZV19XCI+JHtpdGVtLm5hbWV9PC9kaXY+YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIHJlZ3VsYXIgaXRlbVxuICAgICAgICAgICAgICAgIGNvbnN0IG1heWJlRGlzYWJsZWQgPSAob3B0aW9uW2ZpZWxkcy5kaXNhYmxlZF0pID8gJ2Rpc2FibGVkICcgOiAnJztcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiJHttYXliZURpc2FibGVkfWl0ZW1cIiBkYXRhLXZhbHVlPVwiJHtvcHRpb25bZmllbGRzLnZhbHVlXX1cIj4ke29wdGlvbltmaWVsZHMubmFtZV19PC9kaXY+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gZm9ybWF0IHRoZSBkcm9wZG93biBtZW51IHN0cnVjdHVyZSBiYXNlZCBvbiB0aGUgcmVzcG9uc2UuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGRhdGEuXG4gICAgICovXG4gICAgY2JGb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlID09PSBmYWxzZSkge1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIHJlc3BvbnNlIGhhcyB0aGUgZXhwZWN0ZWQgc3RydWN0dXJlXG4gICAgICAgIGlmICghcmVzcG9uc2UuZmlsZXMpIHtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiB0aGVyZSBpcyBhIGRlZmF1bHQgdmFsdWUgc2V0IGZvciB0aGUgZmlsZW5hbWUgaW5wdXQgZmllbGRcbiAgICAgICAgbGV0IGRlZlZhbCA9ICcnO1xuICAgICAgICBjb25zdCBmaWxlTmFtZSA9IHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmaWxlbmFtZScpO1xuICAgICAgICBpZiAoc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zLmxlbmd0aCA9PT0gMCAmJiBmaWxlTmFtZSAhPT0gJycpIHtcbiAgICAgICAgICAgIGRlZlZhbCA9IGZpbGVOYW1lLnRyaW0oKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEJ1aWxkIHRyZWUgc3RydWN0dXJlIGZyb20gZmlsZXNcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuYnVpbGRUcmVlU3RydWN0dXJlKHJlc3BvbnNlLmZpbGVzLCBkZWZWYWwpO1xuXG4gICAgICAgIC8vIENyZWF0ZSB2YWx1ZXMgYXJyYXkgZm9yIGRyb3Bkb3duIHdpdGggYWxsIGl0ZW1zIChpbmNsdWRpbmcgZm9sZGVycylcbiAgICAgICAgY29uc3QgZHJvcGRvd25WYWx1ZXMgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXMubWFwKChpdGVtLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgaWYgKGl0ZW0udHlwZSA9PT0gJ2ZvbGRlcicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBpdGVtLm5hbWUucmVwbGFjZSgvPFtePl0qPi9nLCAnJyksIC8vIFJlbW92ZSBIVE1MIHRhZ3MgZm9yIHNlYXJjaFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJycsXG4gICAgICAgICAgICAgICAgICAgIGRpc2FibGVkOiB0cnVlXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogaXRlbS5uYW1lLnJlcGxhY2UoLzxbXj5dKj4vZywgJycpLCAvLyBSZW1vdmUgSFRNTCB0YWdzIGZvciBzZWFyY2hcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGl0ZW0udmFsdWUsXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkOiBpdGVtLnNlbGVjdGVkXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgZHJvcGRvd24gd2l0aCB2YWx1ZXNcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignc2V0dXAgbWVudScsIHtcbiAgICAgICAgICAgIHZhbHVlczogZHJvcGRvd25WYWx1ZXNcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgdGhlIGRlZmF1bHQgc2VsZWN0ZWQgdmFsdWUgaWYgYW55XG4gICAgICAgIGNvbnN0IHNlbGVjdGVkSXRlbSA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtcy5maW5kKGl0ZW0gPT4gaXRlbS5zZWxlY3RlZCk7XG4gICAgICAgIGlmIChzZWxlY3RlZEl0ZW0pIHtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHNlbGVjdGVkSXRlbS52YWx1ZSk7XG4gICAgICAgICAgICAvLyBBbHNvIHNldCB0aGUgdGV4dCB0byBzaG93IGZ1bGwgcGF0aFxuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignc2V0IHRleHQnLCBzZWxlY3RlZEl0ZW0udmFsdWUpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBIaWRlIHRoZSBkaW1tZXIgYWZ0ZXIgbG9hZGluZ1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgY2hhbmdpbmcgdGhlIGxvZyBmaWxlIGluIHRoZSBzZWxlY3QgZHJvcGRvd24uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHNlbGVjdGVkIHZhbHVlLlxuICAgICAqL1xuICAgIGNiT25DaGFuZ2VGaWxlKHZhbHVlKSB7XG4gICAgICAgIGlmICh2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgLy8gU2V0IGRyb3Bkb3duIHRleHQgdG8gc2hvdyB0aGUgZnVsbCBmaWxlIHBhdGhcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignc2V0IHRleHQnLCB2YWx1ZSk7XG4gICAgICAgIFxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZmlsZW5hbWUnLCB2YWx1ZSk7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRmV0Y2hlcyB0aGUgbG9nIGZpbGUgY29udGVudCBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAgICovXG4gICAgdXBkYXRlTG9nRnJvbVNlcnZlcigpIHtcbiAgICAgICAgY29uc3QgcGFyYW1zID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBQYnhBcGkuU3lzbG9nR2V0TG9nRnJvbUZpbGUocGFyYW1zLCBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jYlVwZGF0ZUxvZ1RleHQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSBsb2cgdmlldy5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZGF0YSAtIFRoZSBsb2cgZGF0YS5cbiAgICAgKi9cbiAgICBjYlVwZGF0ZUxvZ1RleHQoZGF0YSkge1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIuZ2V0U2Vzc2lvbigpLnNldFZhbHVlKGRhdGEuY29udGVudCk7XG4gICAgICAgIGNvbnN0IHJvdyA9IHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlci5zZXNzaW9uLmdldExlbmd0aCgpIC0gMTtcbiAgICAgICAgY29uc3QgY29sdW1uID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnNlc3Npb24uZ2V0TGluZShyb3cpLmxlbmd0aDsgLy8gb3Igc2ltcGx5IEluZmluaXR5XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlci5nb3RvTGluZShyb3cgKyAxLCBjb2x1bW4pO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgY2xpY2tpbmcgdGhlIFwiRG93bmxvYWQgRmlsZVwiIGJ1dHRvbi5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZGF0YS5cbiAgICAgKi9cbiAgICBjYkRvd25sb2FkRmlsZShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UgIT09IGZhbHNlKSB7XG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSByZXNwb25zZS5maWxlbmFtZTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBjbGlja2luZyB0aGUgXCJFcmFzZSBGaWxlXCIgYnV0dG9uLlxuICAgICAqL1xuICAgIGVyYXNlQ3VycmVudEZpbGVDb250ZW50KCl7XG4gICAgICAgIGNvbnN0IGZpbGVOYW1lID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2ZpbGVuYW1lJyk7XG4gICAgICAgIGlmIChmaWxlTmFtZS5sZW5ndGg+MCl7XG4gICAgICAgICAgICBQYnhBcGkuU3lzbG9nRXJhc2VGaWxlKGZpbGVOYW1lLCBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jYkFmdGVyRmlsZUVyYXNlZClcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBjbGlja2luZyB0aGUgXCJFcmFzZSBGaWxlXCIgYnV0dG9uIGFuZCBjYWxsaW5nIFJFU1QgQVBJIGNvbW1hbmRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZGF0YS5cbiAgICAgKi9cbiAgICBjYkFmdGVyRmlsZUVyYXNlZChyZXNwb25zZSl7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQ9PT1mYWxzZSAmJiByZXNwb25zZS5tZXNzYWdlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudXBkYXRlTG9nRnJvbVNlcnZlcigpO1xuICAgICAgICB9XG4gICAgfSxcbn07XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBzaG93IHN5c3RlbSBsb2dzIHRhYlxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==