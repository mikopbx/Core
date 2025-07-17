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

    if (fileName !== '') {
      defVal = fileName.trim();
    } // Build tree structure from files


    systemDiagnosticLogs.logsItems = systemDiagnosticLogs.buildTreeStructure(response.files, defVal); // Debug: log the filename and items to see what's happening

    if (defVal) {
      console.log('Looking for file:', defVal);
      console.log('Available files:', Object.keys(response.files));
    } // Create values array for dropdown with all items (including folders)


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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TeXN0ZW1EaWFnbm9zdGljL3N5c3RlbS1kaWFnbm9zdGljLWluZGV4LXNob3dsb2dzLmpzIl0sIm5hbWVzIjpbInN5c3RlbURpYWdub3N0aWNMb2dzIiwiJHNob3dCdG4iLCIkIiwiJGRvd25sb2FkQnRuIiwiJHNob3dBdXRvQnRuIiwiJGVyYXNlQnRuIiwiJGxvZ0NvbnRlbnQiLCJ2aWV3ZXIiLCIkZmlsZVNlbGVjdERyb3BEb3duIiwibG9nc0l0ZW1zIiwiZGVmYXVsdExvZ0l0ZW0iLCIkZGltbWVyIiwiJGZvcm1PYmoiLCIkZmlsZU5hbWUiLCJpbml0aWFsaXplIiwiYWNlSGVpZ2h0Iiwid2luZG93IiwiaW5uZXJIZWlnaHQiLCJjbG9zZXN0IiwiY3NzIiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsImNiT25DaGFuZ2VGaWxlIiwiaWdub3JlQ2FzZSIsImZ1bGxUZXh0U2VhcmNoIiwiZm9yY2VTZWxlY3Rpb24iLCJwcmVzZXJ2ZUhUTUwiLCJhbGxvd0NhdGVnb3J5U2VsZWN0aW9uIiwibWF0Y2giLCJmaWx0ZXJSZW1vdGVEYXRhIiwiYWN0aW9uIiwidGVtcGxhdGVzIiwibWVudSIsImN1c3RvbURyb3Bkb3duTWVudSIsImluaXRpYWxpemVBY2UiLCJQYnhBcGkiLCJTeXNsb2dHZXRMb2dzTGlzdCIsImNiRm9ybWF0RHJvcGRvd25SZXN1bHRzIiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCJ1cGRhdGVMb2dGcm9tU2VydmVyIiwiZGF0YSIsImZvcm0iLCJTeXNsb2dEb3dubG9hZExvZ0ZpbGUiLCJmaWxlbmFtZSIsImNiRG93bmxvYWRGaWxlIiwiJHJlbG9hZEljb24iLCJmaW5kIiwiaGFzQ2xhc3MiLCJyZW1vdmVDbGFzcyIsInVwZGF0ZUxvZ1ZpZXdXb3JrZXIiLCJzdG9wIiwiYWRkQ2xhc3MiLCJlcmFzZUN1cnJlbnRGaWxlQ29udGVudCIsImtleXVwIiwiZXZlbnQiLCJrZXlDb2RlIiwidG9nZ2xlRnVsbFNjcmVlbiIsImRvY3VtZW50IiwiYWRkRXZlbnRMaXN0ZW5lciIsImFkanVzdExvZ0hlaWdodCIsImxvZ0NvbnRhaW5lciIsImdldEVsZW1lbnRCeUlkIiwiZnVsbHNjcmVlbkVsZW1lbnQiLCJyZXF1ZXN0RnVsbHNjcmVlbiIsImVyciIsImNvbnNvbGUiLCJlcnJvciIsIm1lc3NhZ2UiLCJleGl0RnVsbHNjcmVlbiIsInNldFRpbWVvdXQiLCJvZmZzZXQiLCJ0b3AiLCJyZXNpemUiLCJhY2UiLCJlZGl0IiwianVsaWEiLCJyZXF1aXJlIiwidW5kZWZpbmVkIiwiSW5pTW9kZSIsIk1vZGUiLCJzZXNzaW9uIiwic2V0TW9kZSIsInNldFRoZW1lIiwicmVuZGVyZXIiLCJzZXRTaG93R3V0dGVyIiwic2V0T3B0aW9ucyIsInNob3dMaW5lTnVtYmVycyIsInNob3dQcmludE1hcmdpbiIsInJlYWRPbmx5IiwiYnVpbGRUcmVlU3RydWN0dXJlIiwiZmlsZXMiLCJkZWZhdWx0UGF0aCIsInRyZWUiLCJPYmplY3QiLCJlbnRyaWVzIiwiZm9yRWFjaCIsImtleSIsImZpbGVEYXRhIiwiZmlsZVBhdGgiLCJwYXRoIiwicGFydHMiLCJzcGxpdCIsImN1cnJlbnQiLCJwYXJ0IiwiaW5kZXgiLCJsZW5ndGgiLCJ0eXBlIiwic2l6ZSIsImNoaWxkcmVuIiwidHJlZVRvRHJvcGRvd25JdGVtcyIsInByZWZpeCIsIml0ZW1zIiwic29ydCIsImFLZXkiLCJhVmFsIiwiYktleSIsImJWYWwiLCJsb2NhbGVDb21wYXJlIiwidmFsdWUiLCJwdXNoIiwibmFtZSIsImRpc2FibGVkIiwiY2hpbGRJdGVtcyIsInNlbGVjdGVkIiwicmVzcG9uc2UiLCJmaWVsZHMiLCJ2YWx1ZXMiLCJodG1sIiwiZWFjaCIsIm9wdGlvbiIsIml0ZW0iLCJtYXliZURpc2FibGVkIiwiZGVmVmFsIiwiZmlsZU5hbWUiLCJ0cmltIiwibG9nIiwia2V5cyIsImRyb3Bkb3duVmFsdWVzIiwibWFwIiwicmVwbGFjZSIsInNlbGVjdGVkSXRlbSIsIml0ZW1Ub1NlbGVjdCIsInBhcmFtcyIsIlN5c2xvZ0dldExvZ0Zyb21GaWxlIiwiY2JVcGRhdGVMb2dUZXh0IiwiZ2V0U2Vzc2lvbiIsInNldFZhbHVlIiwiY29udGVudCIsInJvdyIsImdldExlbmd0aCIsImNvbHVtbiIsImdldExpbmUiLCJnb3RvTGluZSIsImxvY2F0aW9uIiwiU3lzbG9nRXJhc2VGaWxlIiwiY2JBZnRlckZpbGVFcmFzZWQiLCJyZXN1bHQiLCJtZXNzYWdlcyIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxvQkFBb0IsR0FBRztBQUN6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxnQkFBRCxDQUxjOztBQU96QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxZQUFZLEVBQUVELENBQUMsQ0FBQyxnQkFBRCxDQVhVOztBQWF6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxZQUFZLEVBQUVGLENBQUMsQ0FBQyxxQkFBRCxDQWpCVTs7QUFtQnpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lHLEVBQUFBLFNBQVMsRUFBRUgsQ0FBQyxDQUFDLGFBQUQsQ0F2QmE7O0FBeUJ6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJSSxFQUFBQSxXQUFXLEVBQUVKLENBQUMsQ0FBQyx1QkFBRCxDQTdCVzs7QUErQnpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lLLEVBQUFBLE1BQU0sRUFBRSxFQW5DaUI7O0FBcUN6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxtQkFBbUIsRUFBRU4sQ0FBQyxDQUFDLDJDQUFELENBekNHOztBQTJDekI7QUFDSjtBQUNBO0FBQ0E7QUFDSU8sRUFBQUEs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QUFBQSxXQUFXLENBQUNDLGVBQVosQ0FBNEJuQyxRQUFRLENBQUNpQyxRQUFyQztBQUNILEtBRkQsTUFFTztBQUNIL0osTUFBQUEsb0JBQW9CLENBQUN5QyxtQkFBckI7QUFDSDtBQUNKO0FBMWV3QixDQUE3QixDLENBNmVBOztBQUNBdkMsQ0FBQyxDQUFDeUQsUUFBRCxDQUFELENBQVl1RyxLQUFaLENBQWtCLFlBQU07QUFDcEJsSyxFQUFBQSxvQkFBb0IsQ0FBQ2MsVUFBckI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cbi8qIGdsb2JhbCBhY2UsIFBieEFwaSwgdXBkYXRlTG9nVmlld1dvcmtlciwgQWNlLCBVc2VyTWVzc2FnZSAqL1xuIFxuLyoqXG4gKiBSZXByZXNlbnRzIHRoZSBzeXN0ZW0gZGlhZ25vc3RpYyBsb2dzIG9iamVjdC5cbiAqXG4gKiBAbW9kdWxlIHN5c3RlbURpYWdub3N0aWNMb2dzXG4gKi9cbmNvbnN0IHN5c3RlbURpYWdub3N0aWNMb2dzID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBcIlNob3cgTGFzdCBMb2dcIiBidXR0b24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc2hvd0J0bjogJCgnI3Nob3ctbGFzdC1sb2cnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBcIkRvd25sb2FkIEZpbGVcIiBidXR0b24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZG93bmxvYWRCdG46ICQoJyNkb3dubG9hZC1maWxlJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgXCJTaG93IExhc3QgTG9nIChBdXRvKVwiIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzaG93QXV0b0J0bjogJCgnI3Nob3ctbGFzdC1sb2ctYXV0bycpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIFwiRXJhc2UgY3VycmVudCBmaWxlIGNvbnRlbnRcIiBidXR0b24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZXJhc2VCdG46ICQoJyNlcmFzZS1maWxlJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgbG9nIGNvbnRlbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbG9nQ29udGVudDogJCgnI2xvZy1jb250ZW50LXJlYWRvbmx5JyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgdmlld2VyIGZvciBkaXNwbGF5aW5nIHRoZSBsb2cgY29udGVudC5cbiAgICAgKiBAdHlwZSB7QWNlfVxuICAgICAqL1xuICAgIHZpZXdlcjogJycsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZmlsZSBzZWxlY3QgZHJvcGRvd24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZmlsZVNlbGVjdERyb3BEb3duOiAkKCcjc3lzdGVtLWRpYWdub3N0aWMtZm9ybSAuZmlsZW5hbWVzLXNlbGVjdCcpLFxuXG4gICAgLyoqXG4gICAgICogQXJyYXkgb2YgbG9nIGl0ZW1zLlxuICAgICAqIEB0eXBlIHtBcnJheX1cbiAgICAgKi9cbiAgICBsb2dzSXRlbXM6IFtdLFxuXG4gICAgLyoqXG4gICAgICogRGVmYXVsdCBsb2cgaXRlbS5cbiAgICAgKiBAdHlwZSB7T2JqZWN0fVxuICAgICAqL1xuICAgIGRlZmF1bHRMb2dJdGVtOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGRpbW1lci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkaW1tZXI6ICQoJyNnZXQtbG9ncy1kaW1tZXInKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNzeXN0ZW0tZGlhZ25vc3RpYy1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZmlsZW5hbWUuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZmlsZU5hbWU6ICQoJyNzeXN0ZW0tZGlhZ25vc3RpYy1mb3JtIC5maWxlbmFtZScpLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIHN5c3RlbSBkaWFnbm9zdGljIGxvZ3MuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgY29uc3QgYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gMjUwO1xuXG4gICAgICAgIC8vIFNldCB0aGUgbWluaW11bSBoZWlnaHQgb2YgdGhlIGxvZyBjb250YWluZXJcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5jbG9zZXN0KCdkaXYnKS5jc3MoJ21pbi1oZWlnaHQnLCBgJHthY2VIZWlnaHR9cHhgKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBkcm9wZG93biBtZW51IGZvciBsb2cgZmlsZXMgd2l0aCB0cmVlIHN1cHBvcnRcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTZW1hbnRpYyBVSSBkcm9wZG93biB3aXRoIGN1c3RvbSBtZW51IGdlbmVyYXRpb25cbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6IHN5c3RlbURpYWdub3N0aWNMb2dzLmNiT25DaGFuZ2VGaWxlLFxuICAgICAgICAgICAgICAgIGlnbm9yZUNhc2U6IHRydWUsXG4gICAgICAgICAgICAgICAgZnVsbFRleHRTZWFyY2g6IHRydWUsXG4gICAgICAgICAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgICAgIHByZXNlcnZlSFRNTDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBhbGxvd0NhdGVnb3J5U2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBtYXRjaDogJ3RleHQnLFxuICAgICAgICAgICAgICAgIGZpbHRlclJlbW90ZURhdGE6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGFjdGlvbjogJ2FjdGl2YXRlJyxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgbWVudTogc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY3VzdG9tRHJvcGRvd25NZW51XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBBQ0UgZWRpdG9yIGZvciBsb2cgY29udGVudFxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pbml0aWFsaXplQWNlKCk7XG5cbiAgICAgICAgLy8gRmV0Y2ggdGhlIGxpc3Qgb2YgbG9nIGZpbGVzXG4gICAgICAgIFBieEFwaS5TeXNsb2dHZXRMb2dzTGlzdChzeXN0ZW1EaWFnbm9zdGljTG9ncy5jYkZvcm1hdERyb3Bkb3duUmVzdWx0cyk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIFwiU2hvdyBMb2dcIiBidXR0b24gY2xpY2tcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJHNob3dCdG4ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIFwiRG93bmxvYWQgTG9nXCIgYnV0dG9uIGNsaWNrXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkb3dubG9hZEJ0bi5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgICAgIFBieEFwaS5TeXNsb2dEb3dubG9hZExvZ0ZpbGUoZGF0YS5maWxlbmFtZSwgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY2JEb3dubG9hZEZpbGUpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgXCJBdXRvIFJlZnJlc2hcIiBidXR0b24gY2xpY2tcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJHNob3dBdXRvQnRuLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkcmVsb2FkSWNvbiA9IHN5c3RlbURpYWdub3N0aWNMb2dzLiRzaG93QXV0b0J0bi5maW5kKCdpLnJlZnJlc2gnKTtcbiAgICAgICAgICAgIGlmICgkcmVsb2FkSWNvbi5oYXNDbGFzcygnbG9hZGluZycpKSB7XG4gICAgICAgICAgICAgICAgJHJlbG9hZEljb24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICB1cGRhdGVMb2dWaWV3V29ya2VyLnN0b3AoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHJlbG9hZEljb24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICB1cGRhdGVMb2dWaWV3V29ya2VyLmluaXRpYWxpemUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIHRoZSBcIkVyYXNlIGZpbGVcIiBidXR0b24gY2xpY2tcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGVyYXNlQnRuLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5lcmFzZUN1cnJlbnRGaWxlQ29udGVudCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgRW50ZXIga2V5cHJlc3Mgb24gaW5wdXQgZmllbGRzXG4gICAgICAgICQoJ2lucHV0Jykua2V5dXAoKGV2ZW50KSA9PiB7XG4gICAgICAgICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMTMpIHtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy51cGRhdGVMb2dGcm9tU2VydmVyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciBGdWxsc2NyZWVuIGJ1dHRvbiBjbGlja1xuICAgICAgICAkKCcuZnVsbHNjcmVlbi10b2dnbGUtYnRuJykub24oJ2NsaWNrJywgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudG9nZ2xlRnVsbFNjcmVlbik7XG5cbiAgICAgICAgLy8gTGlzdGVuaW5nIGZvciB0aGUgZnVsbHNjcmVlbiBjaGFuZ2UgZXZlbnRcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignZnVsbHNjcmVlbmNoYW5nZScsIHN5c3RlbURpYWdub3N0aWNMb2dzLmFkanVzdExvZ0hlaWdodCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbCBoZWlnaHQgY2FsY3VsYXRpb25cbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuYWRqdXN0TG9nSGVpZ2h0KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZXMgdGhlIGZ1bGwtc2NyZWVuIG1vZGUgb2YgdGhlICdzeXN0ZW0tbG9ncy1zZWdtZW50JyBlbGVtZW50LlxuICAgICAqIElmIHRoZSBlbGVtZW50IGlzIG5vdCBpbiBmdWxsLXNjcmVlbiBtb2RlLCBpdCByZXF1ZXN0cyBmdWxsLXNjcmVlbiBtb2RlLlxuICAgICAqIElmIHRoZSBlbGVtZW50IGlzIGFscmVhZHkgaW4gZnVsbC1zY3JlZW4gbW9kZSwgaXQgZXhpdHMgZnVsbC1zY3JlZW4gbW9kZS5cbiAgICAgKiBMb2dzIGFuIGVycm9yIG1lc3NhZ2UgdG8gdGhlIGNvbnNvbGUgaWYgdGhlcmUgaXMgYW4gaXNzdWUgZW5hYmxpbmcgZnVsbC1zY3JlZW4gbW9kZS5cbiAgICAgKlxuICAgICAqIEByZXR1cm4ge3ZvaWR9XG4gICAgICovXG4gICAgdG9nZ2xlRnVsbFNjcmVlbigpIHtcbiAgICAgICAgY29uc3QgbG9nQ29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3N5c3RlbS1sb2dzLXNlZ21lbnQnKTtcblxuICAgICAgICBpZiAoIWRvY3VtZW50LmZ1bGxzY3JlZW5FbGVtZW50KSB7XG4gICAgICAgICAgICBsb2dDb250YWluZXIucmVxdWVzdEZ1bGxzY3JlZW4oKS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgYXR0ZW1wdGluZyB0byBlbmFibGUgZnVsbC1zY3JlZW4gbW9kZTogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZG9jdW1lbnQuZXhpdEZ1bGxzY3JlZW4oKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGdW5jdGlvbiB0byBhZGp1c3QgdGhlIGhlaWdodCBvZiB0aGUgbG9ncyBkZXBlbmRpbmcgb24gdGhlIHNjcmVlbiBtb2RlLlxuICAgICAqL1xuICAgIGFkanVzdExvZ0hlaWdodCgpIHtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBsZXQgYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGxvZ0NvbnRlbnQub2Zmc2V0KCkudG9wIC0gMjU7XG4gICAgICAgICAgICBpZiAoZG9jdW1lbnQuZnVsbHNjcmVlbkVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiBmdWxsc2NyZWVuIG1vZGUgaXMgYWN0aXZlXG4gICAgICAgICAgICAgICAgYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gODA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBSZWNhbGN1bGF0ZSB0aGUgc2l6ZSBvZiB0aGUgQUNFIGVkaXRvclxuICAgICAgICAgICAgJCgnLmxvZy1jb250ZW50LXJlYWRvbmx5JykuY3NzKCdtaW4taGVpZ2h0JywgIGAke2FjZUhlaWdodH1weGApO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnJlc2l6ZSgpO1xuICAgICAgICB9LCAzMDApO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIEFDRSBlZGl0b3IgZm9yIGxvZyB2aWV3aW5nLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVBY2UoKSB7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlciA9IGFjZS5lZGl0KCdsb2ctY29udGVudC1yZWFkb25seScpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBKdWxpYSBtb2RlIGlzIGF2YWlsYWJsZVxuICAgICAgICBjb25zdCBqdWxpYSA9IGFjZS5yZXF1aXJlKCdhY2UvbW9kZS9qdWxpYScpO1xuICAgICAgICBpZiAoanVsaWEgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gU2V0IHRoZSBtb2RlIHRvIEp1bGlhIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgY29uc3QgSW5pTW9kZSA9IGp1bGlhLk1vZGU7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIuc2Vzc2lvbi5zZXRNb2RlKG5ldyBJbmlNb2RlKCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0IHRoZSB0aGVtZSBhbmQgb3B0aW9ucyBmb3IgdGhlIEFDRSBlZGl0b3JcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIucmVuZGVyZXIuc2V0U2hvd0d1dHRlcihmYWxzZSk7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlci5zZXRPcHRpb25zKHtcbiAgICAgICAgICAgIHNob3dMaW5lTnVtYmVyczogZmFsc2UsXG4gICAgICAgICAgICBzaG93UHJpbnRNYXJnaW46IGZhbHNlLFxuICAgICAgICAgICAgcmVhZE9ubHk6IHRydWUsXG4gICAgICAgIH0pO1xuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJ1aWxkcyBhIGhpZXJhcmNoaWNhbCB0cmVlIHN0cnVjdHVyZSBmcm9tIGZsYXQgZmlsZSBwYXRoc1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBmaWxlcyAtIFRoZSBmaWxlcyBvYmplY3QgZnJvbSBBUEkgcmVzcG9uc2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZGVmYXVsdFBhdGggLSBUaGUgZGVmYXVsdCBzZWxlY3RlZCBmaWxlIHBhdGhcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFRyZWUgc3RydWN0dXJlIGZvciB0aGUgZHJvcGRvd25cbiAgICAgKi9cbiAgICBidWlsZFRyZWVTdHJ1Y3R1cmUoZmlsZXMsIGRlZmF1bHRQYXRoKSB7XG4gICAgICAgIGNvbnN0IHRyZWUgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIHRoZSB0cmVlIHN0cnVjdHVyZVxuICAgICAgICBPYmplY3QuZW50cmllcyhmaWxlcykuZm9yRWFjaCgoW2tleSwgZmlsZURhdGFdKSA9PiB7XG4gICAgICAgICAgICAvLyBVc2UgZmlsZURhdGEucGF0aCBhcyB0aGUgYWN0dWFsIGZpbGUgcGF0aFxuICAgICAgICAgICAgY29uc3QgZmlsZVBhdGggPSBmaWxlRGF0YS5wYXRoIHx8IGtleTtcbiAgICAgICAgICAgIGNvbnN0IHBhcnRzID0gZmlsZVBhdGguc3BsaXQoJy8nKTtcbiAgICAgICAgICAgIGxldCBjdXJyZW50ID0gdHJlZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcGFydHMuZm9yRWFjaCgocGFydCwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoaW5kZXggPT09IHBhcnRzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBpcyBhIGZpbGVcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudFtwYXJ0XSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdmaWxlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IGZpbGVQYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2l6ZTogZmlsZURhdGEuc2l6ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IChkZWZhdWx0UGF0aCAmJiBkZWZhdWx0UGF0aCA9PT0gZmlsZVBhdGgpIHx8ICghZGVmYXVsdFBhdGggJiYgZmlsZURhdGEuZGVmYXVsdClcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBUaGlzIGlzIGEgZGlyZWN0b3J5XG4gICAgICAgICAgICAgICAgICAgIGlmICghY3VycmVudFtwYXJ0XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudFtwYXJ0XSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZm9sZGVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjoge31cbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY3VycmVudCA9IGN1cnJlbnRbcGFydF0uY2hpbGRyZW47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29udmVydCB0cmVlIHRvIGRyb3Bkb3duIGl0ZW1zXG4gICAgICAgIHJldHVybiB0aGlzLnRyZWVUb0Ryb3Bkb3duSXRlbXModHJlZSwgJycpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ29udmVydHMgdHJlZSBzdHJ1Y3R1cmUgdG8gZHJvcGRvd24gaXRlbXMgd2l0aCBwcm9wZXIgZm9ybWF0dGluZ1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSB0cmVlIC0gVGhlIHRyZWUgc3RydWN0dXJlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHByZWZpeCAtIFByZWZpeCBmb3IgaW5kZW50YXRpb25cbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IEZvcm1hdHRlZCBkcm9wZG93biBpdGVtc1xuICAgICAqL1xuICAgIHRyZWVUb0Ryb3Bkb3duSXRlbXModHJlZSwgcHJlZml4KSB7XG4gICAgICAgIGNvbnN0IGl0ZW1zID0gW107XG4gICAgICAgIFxuICAgICAgICAvLyBTb3J0IGVudHJpZXM6IGZvbGRlcnMgZmlyc3QsIHRoZW4gZmlsZXNcbiAgICAgICAgY29uc3QgZW50cmllcyA9IE9iamVjdC5lbnRyaWVzKHRyZWUpLnNvcnQoKFthS2V5LCBhVmFsXSwgW2JLZXksIGJWYWxdKSA9PiB7XG4gICAgICAgICAgICBpZiAoYVZhbC50eXBlID09PSAnZm9sZGVyJyAmJiBiVmFsLnR5cGUgPT09ICdmaWxlJykgcmV0dXJuIC0xO1xuICAgICAgICAgICAgaWYgKGFWYWwudHlwZSA9PT0gJ2ZpbGUnICYmIGJWYWwudHlwZSA9PT0gJ2ZvbGRlcicpIHJldHVybiAxO1xuICAgICAgICAgICAgcmV0dXJuIGFLZXkubG9jYWxlQ29tcGFyZShiS2V5KTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBlbnRyaWVzLmZvckVhY2goKFtrZXksIHZhbHVlXSkgPT4ge1xuICAgICAgICAgICAgaWYgKHZhbHVlLnR5cGUgPT09ICdmb2xkZXInKSB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIGZvbGRlciBoZWFkZXJcbiAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogYCR7cHJlZml4fTxpIGNsYXNzPVwiZm9sZGVyIGljb25cIj48L2k+ICR7a2V5fWAsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdmb2xkZXInXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQWRkIGNoaWxkcmVuIHdpdGggaW5jcmVhc2VkIGluZGVudGF0aW9uXG4gICAgICAgICAgICAgICAgY29uc3QgY2hpbGRJdGVtcyA9IHRoaXMudHJlZVRvRHJvcGRvd25JdGVtcyh2YWx1ZS5jaGlsZHJlbiwgcHJlZml4ICsgJyZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOycpO1xuICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goLi4uY2hpbGRJdGVtcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEFkZCBmaWxlIGl0ZW1cbiAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogYCR7cHJlZml4fTxpIGNsYXNzPVwiZmlsZSBvdXRsaW5lIGljb25cIj48L2k+ICR7a2V5fSAoJHt2YWx1ZS5zaXplfSlgLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWUucGF0aCxcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWQ6IHZhbHVlLmRlZmF1bHQsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdmaWxlJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBpdGVtcztcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgY3VzdG9tIGRyb3Bkb3duIG1lbnUgSFRNTCBmb3IgbG9nIGZpbGVzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGNvbnRhaW5pbmcgZHJvcGRvd24gbWVudSBvcHRpb25zXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGZpZWxkcyAtIFRoZSBmaWVsZHMgaW4gdGhlIHJlc3BvbnNlIHRvIHVzZSBmb3IgdGhlIG1lbnUgb3B0aW9uc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBIVE1MIHN0cmluZyBmb3IgdGhlIGN1c3RvbSBkcm9wZG93biBtZW51XG4gICAgICovXG4gICAgY3VzdG9tRHJvcGRvd25NZW51KHJlc3BvbnNlLCBmaWVsZHMpIHtcbiAgICAgICAgY29uc3QgdmFsdWVzID0gcmVzcG9uc2VbZmllbGRzLnZhbHVlc10gfHwge307XG4gICAgICAgIGxldCBodG1sID0gJyc7XG4gICAgICAgIFxuICAgICAgICAkLmVhY2godmFsdWVzLCAoaW5kZXgsIG9wdGlvbikgPT4ge1xuICAgICAgICAgICAgLy8gRm9yIHRyZWUgc3RydWN0dXJlIGl0ZW1zXG4gICAgICAgICAgICBpZiAoc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zICYmIHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtc1tpbmRleF0pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpdGVtID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zW2luZGV4XTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBpZiAoaXRlbS50eXBlID09PSAnZm9sZGVyJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBGb2xkZXIgaXRlbSAtIGRpc2FibGVkIGFuZCB3aXRoIGZvbGRlciBpY29uXG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJkaXNhYmxlZCBpdGVtXCIgZGF0YS12YWx1ZT1cIlwiPiR7aXRlbS5uYW1lfTwvZGl2PmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRmlsZSBpdGVtIHdpdGggcHJvcGVyIHZhbHVlXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdGVkID0gaXRlbS5zZWxlY3RlZCA/ICdzZWxlY3RlZCBhY3RpdmUnIDogJyc7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtICR7c2VsZWN0ZWR9XCIgZGF0YS12YWx1ZT1cIiR7b3B0aW9uW2ZpZWxkcy52YWx1ZV19XCI+JHtpdGVtLm5hbWV9PC9kaXY+YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIHJlZ3VsYXIgaXRlbVxuICAgICAgICAgICAgICAgIGNvbnN0IG1heWJlRGlzYWJsZWQgPSAob3B0aW9uW2ZpZWxkcy5kaXNhYmxlZF0pID8gJ2Rpc2FibGVkICcgOiAnJztcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiJHttYXliZURpc2FibGVkfWl0ZW1cIiBkYXRhLXZhbHVlPVwiJHtvcHRpb25bZmllbGRzLnZhbHVlXX1cIj4ke29wdGlvbltmaWVsZHMubmFtZV19PC9kaXY+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gZm9ybWF0IHRoZSBkcm9wZG93biBtZW51IHN0cnVjdHVyZSBiYXNlZCBvbiB0aGUgcmVzcG9uc2UuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGRhdGEuXG4gICAgICovXG4gICAgY2JGb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlID09PSBmYWxzZSkge1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIHJlc3BvbnNlIGhhcyB0aGUgZXhwZWN0ZWQgc3RydWN0dXJlXG4gICAgICAgIGlmICghcmVzcG9uc2UuZmlsZXMpIHtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBpZiB0aGVyZSBpcyBhIGRlZmF1bHQgdmFsdWUgc2V0IGZvciB0aGUgZmlsZW5hbWUgaW5wdXQgZmllbGRcbiAgICAgICAgbGV0IGRlZlZhbCA9ICcnO1xuICAgICAgICBjb25zdCBmaWxlTmFtZSA9IHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmaWxlbmFtZScpO1xuICAgICAgICBpZiAoZmlsZU5hbWUgIT09ICcnKSB7XG4gICAgICAgICAgICBkZWZWYWwgPSBmaWxlTmFtZS50cmltKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBCdWlsZCB0cmVlIHN0cnVjdHVyZSBmcm9tIGZpbGVzXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtcyA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmJ1aWxkVHJlZVN0cnVjdHVyZShyZXNwb25zZS5maWxlcywgZGVmVmFsKTtcbiAgICAgICAgXG4gICAgICAgIC8vIERlYnVnOiBsb2cgdGhlIGZpbGVuYW1lIGFuZCBpdGVtcyB0byBzZWUgd2hhdCdzIGhhcHBlbmluZ1xuICAgICAgICBpZiAoZGVmVmFsKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnTG9va2luZyBmb3IgZmlsZTonLCBkZWZWYWwpO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0F2YWlsYWJsZSBmaWxlczonLCBPYmplY3Qua2V5cyhyZXNwb25zZS5maWxlcykpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ3JlYXRlIHZhbHVlcyBhcnJheSBmb3IgZHJvcGRvd24gd2l0aCBhbGwgaXRlbXMgKGluY2x1ZGluZyBmb2xkZXJzKVxuICAgICAgICBjb25zdCBkcm9wZG93blZhbHVlcyA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtcy5tYXAoKGl0ZW0sIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBpZiAoaXRlbS50eXBlID09PSAnZm9sZGVyJykge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGl0ZW0ubmFtZS5yZXBsYWNlKC88W14+XSo+L2csICcnKSwgLy8gUmVtb3ZlIEhUTUwgdGFncyBmb3Igc2VhcmNoXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ6IHRydWVcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBpdGVtLm5hbWUucmVwbGFjZSgvPFtePl0qPi9nLCAnJyksIC8vIFJlbW92ZSBIVE1MIHRhZ3MgZm9yIHNlYXJjaFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogaXRlbS52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWQ6IGl0ZW0uc2VsZWN0ZWRcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBkcm9wZG93biB3aXRoIHZhbHVlc1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXR1cCBtZW51Jywge1xuICAgICAgICAgICAgdmFsdWVzOiBkcm9wZG93blZhbHVlc1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCB0aGUgZGVmYXVsdCBzZWxlY3RlZCB2YWx1ZSBpZiBhbnlcbiAgICAgICAgY29uc3Qgc2VsZWN0ZWRJdGVtID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zLmZpbmQoaXRlbSA9PiBpdGVtLnNlbGVjdGVkKTtcbiAgICAgICAgaWYgKHNlbGVjdGVkSXRlbSkge1xuICAgICAgICAgICAgLy8gVXNlIHNldFRpbWVvdXQgdG8gZW5zdXJlIGRyb3Bkb3duIGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBzZWxlY3RlZEl0ZW0udmFsdWUpO1xuICAgICAgICAgICAgICAgIC8vIEZvcmNlIHJlZnJlc2ggdGhlIGRyb3Bkb3duIHRvIHNob3cgdGhlIHNlbGVjdGVkIHZhbHVlXG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bigncmVmcmVzaCcpO1xuICAgICAgICAgICAgICAgIC8vIEFsc28gc2V0IHRoZSB0ZXh0IHRvIHNob3cgZnVsbCBwYXRoXG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignc2V0IHRleHQnLCBzZWxlY3RlZEl0ZW0udmFsdWUpO1xuICAgICAgICAgICAgICAgIC8vIEF1dG9tYXRpY2FsbHkgbG9hZCB0aGUgbG9nIGNvbnRlbnQgd2hlbiBhIGZpbGUgaXMgcHJlLXNlbGVjdGVkXG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2ZpbGVuYW1lJywgc2VsZWN0ZWRJdGVtLnZhbHVlKTtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy51cGRhdGVMb2dGcm9tU2VydmVyKCk7XG4gICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICB9IGVsc2UgaWYgKGRlZlZhbCkge1xuICAgICAgICAgICAgLy8gSWYgd2UgaGF2ZSBhIGRlZmF1bHQgdmFsdWUgYnV0IG5vIGl0ZW0gd2FzIG1hcmtlZCBhcyBzZWxlY3RlZCxcbiAgICAgICAgICAgIC8vIHRyeSB0byBmaW5kIGFuZCBzZWxlY3QgaXQgbWFudWFsbHlcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1Ub1NlbGVjdCA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtcy5maW5kKGl0ZW0gPT4gXG4gICAgICAgICAgICAgICAgaXRlbS50eXBlID09PSAnZmlsZScgJiYgaXRlbS52YWx1ZSA9PT0gZGVmVmFsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgaWYgKGl0ZW1Ub1NlbGVjdCkge1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBpdGVtVG9TZWxlY3QudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdyZWZyZXNoJyk7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldCB0ZXh0JywgaXRlbVRvU2VsZWN0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2ZpbGVuYW1lJywgaXRlbVRvU2VsZWN0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudXBkYXRlTG9nRnJvbVNlcnZlcigpO1xuICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEhpZGUgdGhlIGRpbW1lciBhZnRlciBsb2FkaW5nIG9ubHkgaWYgbm8gZmlsZSBpcyBzZWxlY3RlZFxuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSGlkZSB0aGUgZGltbWVyIGFmdGVyIGxvYWRpbmcgb25seSBpZiBubyBmaWxlIGlzIHNlbGVjdGVkXG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBjaGFuZ2luZyB0aGUgbG9nIGZpbGUgaW4gdGhlIHNlbGVjdCBkcm9wZG93bi5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgc2VsZWN0ZWQgdmFsdWUuXG4gICAgICovXG4gICAgY2JPbkNoYW5nZUZpbGUodmFsdWUpIHtcbiAgICAgICAgaWYgKHZhbHVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBTZXQgZHJvcGRvd24gdGV4dCB0byBzaG93IHRoZSBmdWxsIGZpbGUgcGF0aFxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXQgdGV4dCcsIHZhbHVlKTtcbiAgICAgICAgXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmaWxlbmFtZScsIHZhbHVlKTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudXBkYXRlTG9nRnJvbVNlcnZlcigpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGZXRjaGVzIHRoZSBsb2cgZmlsZSBjb250ZW50IGZyb20gdGhlIHNlcnZlci5cbiAgICAgKi9cbiAgICB1cGRhdGVMb2dGcm9tU2VydmVyKCkge1xuICAgICAgICBjb25zdCBwYXJhbXMgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIFBieEFwaS5TeXNsb2dHZXRMb2dGcm9tRmlsZShwYXJhbXMsIHN5c3RlbURpYWdub3N0aWNMb2dzLmNiVXBkYXRlTG9nVGV4dCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhlIGxvZyB2aWV3LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBkYXRhIC0gVGhlIGxvZyBkYXRhLlxuICAgICAqL1xuICAgIGNiVXBkYXRlTG9nVGV4dChkYXRhKSB7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlci5nZXRTZXNzaW9uKCkuc2V0VmFsdWUoZGF0YS5jb250ZW50KTtcbiAgICAgICAgY29uc3Qgcm93ID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnNlc3Npb24uZ2V0TGVuZ3RoKCkgLSAxO1xuICAgICAgICBjb25zdCBjb2x1bW4gPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIuc2Vzc2lvbi5nZXRMaW5lKHJvdykubGVuZ3RoOyAvLyBvciBzaW1wbHkgSW5maW5pdHlcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLmdvdG9MaW5lKHJvdyArIDEsIGNvbHVtbik7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBjbGlja2luZyB0aGUgXCJEb3dubG9hZCBGaWxlXCIgYnV0dG9uLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBkYXRhLlxuICAgICAqL1xuICAgIGNiRG93bmxvYWRGaWxlKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZSAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IHJlc3BvbnNlLmZpbGVuYW1lO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGNsaWNraW5nIHRoZSBcIkVyYXNlIEZpbGVcIiBidXR0b24uXG4gICAgICovXG4gICAgZXJhc2VDdXJyZW50RmlsZUNvbnRlbnQoKXtcbiAgICAgICAgY29uc3QgZmlsZU5hbWUgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZmlsZW5hbWUnKTtcbiAgICAgICAgaWYgKGZpbGVOYW1lLmxlbmd0aD4wKXtcbiAgICAgICAgICAgIFBieEFwaS5TeXNsb2dFcmFzZUZpbGUoZmlsZU5hbWUsIHN5c3RlbURpYWdub3N0aWNMb2dzLmNiQWZ0ZXJGaWxlRXJhc2VkKVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGNsaWNraW5nIHRoZSBcIkVyYXNlIEZpbGVcIiBidXR0b24gYW5kIGNhbGxpbmcgUkVTVCBBUEkgY29tbWFuZFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBkYXRhLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJGaWxlRXJhc2VkKHJlc3BvbnNlKXtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdD09PWZhbHNlICYmIHJlc3BvbnNlLm1lc3NhZ2VzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy51cGRhdGVMb2dGcm9tU2VydmVyKCk7XG4gICAgICAgIH1cbiAgICB9LFxufTtcblxuLy8gV2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHksIGluaXRpYWxpemUgdGhlIHNob3cgc3lzdGVtIGxvZ3MgdGFiXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaW5pdGlhbGl6ZSgpO1xufSk7Il19