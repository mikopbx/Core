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

/* global ace, PbxApi, SyslogAPI, updateLogViewWorker, Ace, UserMessage, SVGTimeline */

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
   * Flag indicating if time slider mode is enabled
   * @type {boolean}
   */
  timeSliderEnabled: false,

  /**
   * Current time range for the selected log file
   * @type {object|null}
   */
  currentTimeRange: null,

  /**
   * Flag indicating if auto-update mode is active
   * @type {boolean}
   */
  isAutoUpdateActive: false,

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

    SyslogAPI.getLogsList(systemDiagnosticLogs.cbFormatDropdownResults); // Initialize log level dropdown - V5.0 pattern with DynamicDropdownBuilder

    systemDiagnosticLogs.initializeLogLevelDropdown(); // Event listener for quick period buttons

    $(document).on('click', '.period-btn', function (e) {
      e.preventDefault();
      var $btn = $(e.currentTarget);
      var period = $btn.data('period'); // Update active state

      $('.period-btn').removeClass('active');
      $btn.addClass('active');
      systemDiagnosticLogs.applyQuickPeriod(period);
    }); // Event listener for "Now" button

    $(document).on('click', '.now-btn', function (e) {
      e.preventDefault();

      if (systemDiagnosticLogs.currentTimeRange) {
        var end = systemDiagnosticLogs.currentTimeRange.end;
        var oneHour = 3600;
        var start = Math.max(end - oneHour, systemDiagnosticLogs.currentTimeRange.start);
        SVGTimeline.setRange(start, end);
        systemDiagnosticLogs.loadLogByTimeRange(start, end);
        $('.period-btn').removeClass('active');
        $('.period-btn[data-period="3600"]').addClass('active');
      }
    }); // Event listener for log level filter buttons

    $(document).on('click', '.level-btn', function (e) {
      e.preventDefault();
      var $btn = $(e.currentTarget);
      var level = $btn.data('level'); // Update active state

      $('.level-btn').removeClass('active');
      $btn.addClass('active');
      systemDiagnosticLogs.applyLogLevelFilter(level);
    }); // Event listener for "Show Log" button click (delegated)

    $(document).on('click', '#show-last-log', function (e) {
      e.preventDefault();
      systemDiagnosticLogs.updateLogFromServer();
    }); // Listen for hash changes to update selected file

    $(window).on('hashchange', function () {
      systemDiagnosticLogs.handleHashChange();
    }); // Event listener for "Download Log" button click (delegated)

    $(document).on('click', '#download-file', function (e) {
      e.preventDefault();
      var data = systemDiagnosticLogs.$formObj.form('get values');
      SyslogAPI.downloadLogFile(data.filename, true, systemDiagnosticLogs.cbDownloadFile);
    }); // Event listener for "Auto Refresh" button click (delegated)

    $(document).on('click', '#show-last-log-auto', function (e) {
      e.preventDefault();
      var $button = $('#show-last-log-auto');
      var $reloadIcon = $button.find('.icons i.refresh');

      if ($reloadIcon.hasClass('loading')) {
        $reloadIcon.removeClass('loading');
        systemDiagnosticLogs.isAutoUpdateActive = false;
        updateLogViewWorker.stop();
      } else {
        $reloadIcon.addClass('loading');
        systemDiagnosticLogs.isAutoUpdateActive = true;
        updateLogViewWorker.initialize();
      }
    }); // Event listener for the "Erase file" button click (delegated)

    $(document).on('click', '#erase-file', function (e) {
      e.preventDefault();
      systemDiagnosticLogs.eraseCurrentFileContent();
    }); // Event listener for "Clear Filter" button click (delegated)

    $(document).on('click', '#clear-filter-btn', function (e) {
      e.preventDefault();
      systemDiagnosticLogs.$formObj.form('set value', 'filter', '');
      systemDiagnosticLogs.updateLogFromServer();
    }); // Event listener for Enter keypress only on filter input field

    $(document).on('keyup', '#filter', function (event) {
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
   * Initialize log level dropdown - V5.0 pattern with HTML icons
   * Static dropdown with colored icons and translations
   */
  initializeLogLevelDropdown: function initializeLogLevelDropdown() {
    var $hiddenInput = $('#logLevel'); // Check if dropdown already exists

    if ($('#logLevel-dropdown').length) {
      return;
    } // Create dropdown HTML with colored icons


    var $dropdown = $('<div>', {
      id: 'logLevel-dropdown',
      "class": 'ui selection dropdown'
    });
    var $text = $('<div>', {
      "class": 'text'
    }).text(globalTranslate.sd_AllLevels);
    var $icon = $('<i>', {
      "class": 'dropdown icon'
    });
    var $menu = $('<div>', {
      "class": 'menu'
    }); // Build menu items with colored icons

    var items = [{
      value: '',
      text: globalTranslate.sd_AllLevels,
      icon: ''
    }, {
      value: 'ERROR',
      text: globalTranslate.sd_Error,
      icon: '<i class="exclamation circle red icon"></i>'
    }, {
      value: 'WARNING',
      text: globalTranslate.sd_Warning,
      icon: '<i class="exclamation triangle orange icon"></i>'
    }, {
      value: 'NOTICE',
      text: globalTranslate.sd_Notice,
      icon: '<i class="info circle blue icon"></i>'
    }, {
      value: 'INFO',
      text: globalTranslate.sd_Info,
      icon: '<i class="circle grey icon"></i>'
    }, {
      value: 'DEBUG',
      text: globalTranslate.sd_Debug,
      icon: '<i class="bug purple icon"></i>'
    }];
    items.forEach(function (item) {
      var $item = $('<div>', {
        "class": 'item',
        'data-value': item.value
      }).html(item.icon + item.text);
      $menu.append($item);
    });
    $dropdown.append($text, $icon, $menu);
    $hiddenInput.after($dropdown); // Initialize Semantic UI dropdown

    $dropdown.dropdown({
      onChange: function onChange(value) {
        $hiddenInput.val(value).trigger('change');
        systemDiagnosticLogs.updateLogFromServer();
      }
    });
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
      // Hide dimmer only if not in auto-update mode
      if (!systemDiagnosticLogs.isAutoUpdateActive) {
        systemDiagnosticLogs.$dimmer.removeClass('active');
      }

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
        if (!systemDiagnosticLogs.isAutoUpdateActive) {
          systemDiagnosticLogs.$dimmer.removeClass('active');
        }
      }
    } else {
      // Hide the dimmer after loading only if no file is selected
      if (!systemDiagnosticLogs.isAutoUpdateActive) {
        systemDiagnosticLogs.$dimmer.removeClass('active');
      }
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

    window.location.hash = 'file=' + encodeURIComponent(value); // Reset filters only if user manually changed the file (not during initialization)

    if (!systemDiagnosticLogs.isInitializing) {
      systemDiagnosticLogs.resetFilters();
    } // Check if time range is available for this file


    systemDiagnosticLogs.checkTimeRangeAvailability(value);
  },

  /**
   * Reset all filters when changing log files
   */
  resetFilters: function resetFilters() {
    // Deactivate all quick-period buttons
    $('.period-btn').removeClass('active'); // Reset logLevel dropdown to default (All Levels - empty value)

    $('#logLevel-dropdown').dropdown('set selected', '');
    systemDiagnosticLogs.$formObj.form('set value', 'logLevel', ''); // Clear filter input field

    systemDiagnosticLogs.$formObj.form('set value', 'filter', '');
  },

  /**
   * Check if time range is available for the selected log file
   * @param {string} filename - Log file path
   */
  checkTimeRangeAvailability: async function checkTimeRangeAvailability(filename) {
    // Show dimmer only if not in auto-update mode
    if (!systemDiagnosticLogs.isAutoUpdateActive) {
      systemDiagnosticLogs.$dimmer.addClass('active');
    }

    try {
      // Try to get time range for this file
      SyslogAPI.getLogTimeRange(filename, function (response) {
        if (response && response.result && response.data && response.data.time_range) {
          // Time range is available - use time-based navigation
          systemDiagnosticLogs.initializeNavigation(response.data);
        } else {
          // Time range not available - use line number fallback
          systemDiagnosticLogs.initializeNavigation(null);
        }
      });
    } catch (error) {
      console.error('Error checking time range:', error); // Fallback to line number mode

      systemDiagnosticLogs.initializeNavigation(null);
    }
  },

  /**
   * Initialize universal navigation with time or line number mode
   * @param {object} timeRangeData - Time range data from API (optional)
   */
  initializeNavigation: function initializeNavigation(timeRangeData) {
    if (timeRangeData && timeRangeData.time_range) {
      // Time-based mode
      this.timeSliderEnabled = true;
      this.currentTimeRange = timeRangeData.time_range; // Show period buttons for time-based navigation

      $('#period-buttons').show(); // Set server timezone offset

      if (timeRangeData.server_timezone_offset !== undefined) {
        SVGTimeline.serverTimezoneOffset = timeRangeData.server_timezone_offset;
      } // Initialize SVG timeline with time range


      SVGTimeline.initialize('#time-slider-container', this.currentTimeRange); // Set callback for time window changes

      SVGTimeline.onRangeChange = function (start, end) {
        systemDiagnosticLogs.loadLogByTimeRange(start, end);
      }; // Load initial chunk (last hour by default)


      var oneHour = 3600;
      var initialStart = Math.max(this.currentTimeRange.end - oneHour, this.currentTimeRange.start);
      this.loadLogByTimeRange(initialStart, this.currentTimeRange.end);
    } else {
      // Line number fallback mode
      this.timeSliderEnabled = false;
      this.currentTimeRange = null; // Hide period buttons in line number mode

      $('#period-buttons').hide(); // Initialize SVG timeline with line numbers
      // For now, use default range until we get total line count

      var lineRange = {
        start: 0,
        end: 10000
      };
      SVGTimeline.initialize('#time-slider-container', lineRange, 'lines'); // Set callback for line range changes

      SVGTimeline.onRangeChange = function (start, end) {
        // Load by line numbers (offset/lines)
        systemDiagnosticLogs.loadLogByLines(Math.floor(start), Math.ceil(end - start));
      }; // Load initial lines


      this.updateLogFromServer();
    }
  },

  /**
   * Load log by line numbers (for files without timestamps)
   * @param {number} offset - Starting line number
   * @param {number} lines - Number of lines to load
   */
  loadLogByLines: function loadLogByLines(offset, lines) {
    var _this2 = this;

    // Show dimmer only if not in auto-update mode
    if (!systemDiagnosticLogs.isAutoUpdateActive) {
      systemDiagnosticLogs.$dimmer.addClass('active');
    }

    var params = {
      filename: this.$formObj.form('get value', 'filename'),
      filter: this.$formObj.form('get value', 'filter') || '',
      logLevel: this.$formObj.form('get value', 'logLevel') || '',
      offset: Math.max(0, offset),
      lines: Math.min(5000, Math.max(100, lines))
    };
    SyslogAPI.getLogFromFile(params, function (response) {
      // Hide dimmer only if not in auto-update mode
      if (!systemDiagnosticLogs.isAutoUpdateActive) {
        systemDiagnosticLogs.$dimmer.removeClass('active');
      }

      if (response && response.result && response.data && 'content' in response.data) {
        // Set content in editor (even if empty)
        _this2.viewer.setValue(response.data.content || '', -1); // Go to the beginning


        _this2.viewer.gotoLine(1);

        _this2.viewer.scrollToLine(0, true, true, function () {});
      }
    });
  },

  /**
   * Load log by time range
   * @param {number} startTimestamp - Start timestamp
   * @param {number} endTimestamp - End timestamp
   */
  loadLogByTimeRange: async function loadLogByTimeRange(startTimestamp, endTimestamp) {
    var _this3 = this;

    // Show dimmer only if not in auto-update mode
    if (!systemDiagnosticLogs.isAutoUpdateActive) {
      systemDiagnosticLogs.$dimmer.addClass('active');
    }

    var params = {
      filename: this.$formObj.form('get value', 'filename'),
      filter: this.$formObj.form('get value', 'filter') || '',
      logLevel: this.$formObj.form('get value', 'logLevel') || '',
      dateFrom: startTimestamp,
      dateTo: endTimestamp,
      lines: 5000 // Maximum lines to load

    };

    try {
      SyslogAPI.getLogFromFile(params, function (response) {
        if (response && response.result && response.data && 'content' in response.data) {
          // Set content in editor (even if empty)
          _this3.viewer.setValue(response.data.content || '', -1); // Go to the end of the log


          var row = _this3.viewer.session.getLength() - 1;

          var column = _this3.viewer.session.getLine(row).length;

          _this3.viewer.gotoLine(row + 1, column); // Adjust slider to actual loaded time range (silently)


          if (response.data.actual_range) {
            var actual = response.data.actual_range; // Only sync selectedRange if backend returned meaningful data
            // Don't sync if backend returned very short range (< 10% of requested)
            // because it means there's just little data in the log, not a 5000-line truncation

            var requestedDuration = endTimestamp - startTimestamp;
            var actualDuration = actual.end - actual.start;
            var durationRatio = actualDuration / requestedDuration;

            if (durationRatio >= 0.1 || actual.truncated) {
              // Backend returned substantial data OR explicitly truncated
              // Update SVGTimeline selected range to match actual loaded data
              SVGTimeline.updateSelectedRange(actual.start, actual.end); // Log for debugging only

              if (actual.truncated) {
                console.log("Log data limited to ".concat(actual.lines_count, " lines. ") + "Showing time range: [".concat(actual.start, " - ").concat(actual.end, "]"));
              }
            } else {
              // Backend returned very short range - keep user's selection
              console.debug('⚠️ Backend returned short range (' + actualDuration + 's / ' + requestedDuration + 's = ' + (durationRatio * 100).toFixed(1) + '%), keeping user selection');
            }
          }
        } // Hide dimmer only if not in auto-update mode


        if (!systemDiagnosticLogs.isAutoUpdateActive) {
          systemDiagnosticLogs.$dimmer.removeClass('active');
        }
      });
    } catch (error) {
      console.error('Error loading log by time range:', error); // Hide dimmer only if not in auto-update mode

      if (!systemDiagnosticLogs.isAutoUpdateActive) {
        systemDiagnosticLogs.$dimmer.removeClass('active');
      }
    }
  },

  /**
   * Apply quick period selection (Yandex Cloud LogViewer style)
   * @param {number} periodSeconds - Period in seconds
   */
  applyQuickPeriod: function applyQuickPeriod(periodSeconds) {
    if (!this.currentTimeRange) {
      return;
    } // Use new applyPeriod method that handles visible range and auto-centering


    SVGTimeline.applyPeriod(periodSeconds); // Callback will be triggered automatically by SVGTimeline
  },

  /**
   * Apply log level filter
   * @param {string} level - Log level (all, error, warning, info, debug)
   */
  applyLogLevelFilter: function applyLogLevelFilter(level) {
    var filterPattern = ''; // Create regex pattern based on level

    switch (level) {
      case 'error':
        filterPattern = 'ERROR|CRITICAL|FATAL';
        break;

      case 'warning':
        filterPattern = 'WARNING|WARN';
        break;

      case 'info':
        filterPattern = 'INFO';
        break;

      case 'debug':
        filterPattern = 'DEBUG';
        break;

      case 'all':
      default:
        filterPattern = '';
        break;
    } // Update filter field


    this.$formObj.form('set value', 'filter', filterPattern); // Reload logs with new filter

    this.updateLogFromServer();
  },

  /**
   * Fetches the log file content from the server.
   */
  updateLogFromServer: function updateLogFromServer() {
    if (this.timeSliderEnabled) {
      // In time slider mode, reload current window
      if (this.currentTimeRange) {
        // In time slider mode, reload last hour
        var oneHour = 3600;
        var startTimestamp = Math.max(this.currentTimeRange.end - oneHour, this.currentTimeRange.start);
        this.loadLogByTimeRange(startTimestamp, this.currentTimeRange.end);
      }
    } else {
      // Line number mode
      var params = systemDiagnosticLogs.$formObj.form('get values');
      params.lines = 5000; // Max lines

      SyslogAPI.getLogFromFile(params, systemDiagnosticLogs.cbUpdateLogText);
    }
  },

  /**
   * Updates the log view.
   * @param {Object} response - The response from API.
   */
  cbUpdateLogText: function cbUpdateLogText(response) {
    var _response$data;

    // Hide dimmer only if not in auto-update mode
    if (!systemDiagnosticLogs.isAutoUpdateActive) {
      systemDiagnosticLogs.$dimmer.removeClass('active');
    } // Handle v3 API response structure


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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TeXN0ZW1EaWFnbm9zdGljL3N5c3RlbS1kaWFnbm9zdGljLWluZGV4LXNob3dsb2dzLmpzIl0sIm5hbWVzIjpbInN5c3RlbURpYWdub3N0aWNMb2dzIiwiJHNob3dCdG4iLCIkIiwiJGRvd25sb2FkQnRuIiwiJHNob3dBdXRvQnRuIiwiJGVyYXNlQnRuIiwiJGxvZ0NvbnRlbnQiLCJ2aWV3ZXIiLCIkZmlsZVNlbGVjdERyb3BEb3duIiwibG9nc0l0ZW1zIiwiJGRpbW1lciIsIiRmb3JtT2JqIiwiaXNJbml0aWFsaXppbmciLCJ0aW1lU2xpZGVyRW5hYmxlZCIsImN1cnJlbnRUaW1lUmFuZ2UiLCJpc0F1dG9VcGRhdGVBY3RpdmUiLCJpbml0aWFsaXplIiwiYWNlSGVpZ2h0Iiwid2luZG93IiwiaW5uZXJIZWlnaHQiLCJjbG9zZXN0IiwiY3NzIiwiY3JlYXRlRHJvcGRvd25Gcm9tSGlkZGVuSW5wdXQiLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwiY2JPbkNoYW5nZUZpbGUiLCJpZ25vcmVDYXNlIiwiZnVsbFRleHRTZWFyY2giLCJmb3JjZVNlbGVjdGlvbiIsInByZXNlcnZlSFRNTCIsImFsbG93Q2F0ZWdvcnlTZWxlY3Rpb24iLCJtYXRjaCIsImZpbHRlclJlbW90ZURhdGEiLCJhY3Rpb24iLCJ0ZW1wbGF0ZXMiLCJtZW51IiwiY3VzdG9tRHJvcGRvd25NZW51IiwiaW5pdGlhbGl6ZUFjZSIsIlN5c2xvZ0FQSSIsImdldExvZ3NMaXN0IiwiY2JGb3JtYXREcm9wZG93blJlc3VsdHMiLCJpbml0aWFsaXplTG9nTGV2ZWxEcm9wZG93biIsImRvY3VtZW50Iiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCIkYnRuIiwiY3VycmVudFRhcmdldCIsInBlcmlvZCIsImRhdGEiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiYXBwbHlRdWlja1BlcmlvZCIsImVuZCIsIm9uZUhvdXIiLCJzdGFydCIsIk1hdGgiLCJtYXgiLCJTVkdUaW1lbGluZSIsInNldFJhbmdlIiwibG9hZExvZ0J5VGltZVJhbmdlIiwibGV2ZWwiLCJhcHBseUxvZ0xldmVsRmlsdGVyIiwidXBkYXRlTG9nRnJvbVNlcnZlciIsImhhbmRsZUhhc2hDaGFuZ2UiLCJmb3JtIiwiZG93bmxvYWRMb2dGaWxlIiwiZmlsZW5hbWUiLCJjYkRvd25sb2FkRmlsZSIsIiRidXR0b24iLCIkcmVsb2FkSWNvbiIsImZpbmQiLCJoYXNDbGFzcyIsInVwZGF0ZUxvZ1ZpZXdXb3JrZXIiLCJzdG9wIiwiZXJhc2VDdXJyZW50RmlsZUNvbnRlbnQiLCJldmVudCIsImtleUNvZGUiLCJ0b2dnbGVGdWxsU2NyZWVuIiwiYWRkRXZlbnRMaXN0ZW5lciIsImFkanVzdExvZ0hlaWdodCIsImxvZ0NvbnRhaW5lciIsImdldEVsZW1lbnRCeUlkIiwiZnVsbHNjcmVlbkVsZW1lbnQiLCJyZXF1ZXN0RnVsbHNjcmVlbiIsImVyciIsImNvbnNvbGUiLCJlcnJvciIsIm1lc3NhZ2UiLCJleGl0RnVsbHNjcmVlbiIsInNldFRpbWVvdXQiLCJvZmZzZXQiLCJ0b3AiLCJyZXNpemUiLCIkaGlkZGVuSW5wdXQiLCJsZW5ndGgiLCIkZHJvcGRvd24iLCJpZCIsIiR0ZXh0IiwidGV4dCIsImdsb2JhbFRyYW5zbGF0ZSIsInNkX0FsbExldmVscyIsIiRpY29uIiwiJG1lbnUiLCJpdGVtcyIsInZhbHVlIiwiaWNvbiIsInNkX0Vycm9yIiwic2RfV2FybmluZyIsInNkX05vdGljZSIsInNkX0luZm8iLCJzZF9EZWJ1ZyIsImZvckVhY2giLCJpdGVtIiwiJGl0ZW0iLCJodG1sIiwiYXBwZW5kIiwiYWZ0ZXIiLCJ2YWwiLCJ0cmlnZ2VyIiwiYmVmb3JlIiwiaGlkZSIsImFjZSIsImVkaXQiLCJqdWxpYSIsInJlcXVpcmUiLCJ1bmRlZmluZWQiLCJJbmlNb2RlIiwiTW9kZSIsInNlc3Npb24iLCJzZXRNb2RlIiwic2V0VGhlbWUiLCJyZW5kZXJlciIsInNldFNob3dHdXR0ZXIiLCJzZXRPcHRpb25zIiwic2hvd0xpbmVOdW1iZXJzIiwic2hvd1ByaW50TWFyZ2luIiwicmVhZE9ubHkiLCJidWlsZFRyZWVTdHJ1Y3R1cmUiLCJmaWxlcyIsImRlZmF1bHRQYXRoIiwidHJlZSIsIk9iamVjdCIsImVudHJpZXMiLCJrZXkiLCJmaWxlRGF0YSIsImZpbGVQYXRoIiwicGF0aCIsInBhcnRzIiwic3BsaXQiLCJjdXJyZW50IiwicGFydCIsImluZGV4IiwidHlwZSIsInNpemUiLCJjaGlsZHJlbiIsInRyZWVUb0Ryb3Bkb3duSXRlbXMiLCJwcmVmaXgiLCJzb3J0IiwiYUtleSIsImFWYWwiLCJiS2V5IiwiYlZhbCIsImxvY2FsZUNvbXBhcmUiLCJwdXNoIiwibmFtZSIsImRpc2FibGVkIiwiY2hpbGRJdGVtcyIsInNlbGVjdGVkIiwicmVzcG9uc2UiLCJmaWVsZHMiLCJ2YWx1ZXMiLCJlYWNoIiwib3B0aW9uIiwibWF5YmVEaXNhYmxlZCIsImhhc2giLCJsb2NhdGlvbiIsInN0YXJ0c1dpdGgiLCJkZWNvZGVVUklDb21wb25lbnQiLCJzdWJzdHJpbmciLCJmaWxlRXhpc3RzIiwic29tZSIsImdldEZpbGVGcm9tSGFzaCIsInJlc3VsdCIsImRlZlZhbCIsImZpbGVOYW1lIiwidHJpbSIsImRyb3Bkb3duVmFsdWVzIiwibWFwIiwicmVwbGFjZSIsInNlbGVjdGVkSXRlbSIsIml0ZW1Ub1NlbGVjdCIsImVuY29kZVVSSUNvbXBvbmVudCIsInJlc2V0RmlsdGVycyIsImNoZWNrVGltZVJhbmdlQXZhaWxhYmlsaXR5IiwiZ2V0TG9nVGltZVJhbmdlIiwidGltZV9yYW5nZSIsImluaXRpYWxpemVOYXZpZ2F0aW9uIiwidGltZVJhbmdlRGF0YSIsInNob3ciLCJzZXJ2ZXJfdGltZXpvbmVfb2Zmc2V0Iiwic2VydmVyVGltZXpvbmVPZmZzZXQiLCJvblJhbmdlQ2hhbmdlIiwiaW5pdGlhbFN0YXJ0IiwibGluZVJhbmdlIiwibG9hZExvZ0J5TGluZXMiLCJmbG9vciIsImNlaWwiLCJsaW5lcyIsInBhcmFtcyIsImZpbHRlciIsImxvZ0xldmVsIiwibWluIiwiZ2V0TG9nRnJvbUZpbGUiLCJzZXRWYWx1ZSIsImNvbnRlbnQiLCJnb3RvTGluZSIsInNjcm9sbFRvTGluZSIsInN0YXJ0VGltZXN0YW1wIiwiZW5kVGltZXN0YW1wIiwiZGF0ZUZyb20iLCJkYXRlVG8iLCJyb3ciLCJnZXRMZW5ndGgiLCJjb2x1bW4iLCJnZXRMaW5lIiwiYWN0dWFsX3JhbmdlIiwiYWN0dWFsIiwicmVxdWVzdGVkRHVyYXRpb24iLCJhY3R1YWxEdXJhdGlvbiIsImR1cmF0aW9uUmF0aW8iLCJ0cnVuY2F0ZWQiLCJ1cGRhdGVTZWxlY3RlZFJhbmdlIiwibG9nIiwibGluZXNfY291bnQiLCJkZWJ1ZyIsInRvRml4ZWQiLCJwZXJpb2RTZWNvbmRzIiwiYXBwbHlQZXJpb2QiLCJmaWx0ZXJQYXR0ZXJuIiwiY2JVcGRhdGVMb2dUZXh0IiwibWVzc2FnZXMiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsImdldFNlc3Npb24iLCJlcmFzZUZpbGUiLCJjYkFmdGVyRmlsZUVyYXNlZCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsb0JBQW9CLEdBQUc7QUFDekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMsZ0JBQUQsQ0FMYzs7QUFPekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsWUFBWSxFQUFFRCxDQUFDLENBQUMsZ0JBQUQsQ0FYVTs7QUFhekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUUsRUFBQUEsWUFBWSxFQUFFRixDQUFDLENBQUMscUJBQUQsQ0FqQlU7O0FBbUJ6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJRyxFQUFBQSxTQUFTLEVBQUVILENBQUMsQ0FBQyxhQUFELENB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bThCekI7QUFDSjtBQUNBO0FBQ0l0SyxFQUFBQSx1QkF0OEJ5QixxQ0FzOEJBO0FBQ3JCLFFBQU04RyxRQUFRLEdBQUd6TCxvQkFBb0IsQ0FBQ1csUUFBckIsQ0FBOEJzRCxJQUE5QixDQUFtQyxXQUFuQyxFQUFnRCxVQUFoRCxDQUFqQjs7QUFDQSxRQUFJd0gsUUFBUSxDQUFDMUYsTUFBVCxHQUFnQixDQUFwQixFQUFzQjtBQUNsQnpELE1BQUFBLFNBQVMsQ0FBQytNLFNBQVYsQ0FBb0I1RCxRQUFwQixFQUE4QnpMLG9CQUFvQixDQUFDc1AsaUJBQW5EO0FBQ0g7QUFDSixHQTM4QndCOztBQTY4QnpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lBLEVBQUFBLGlCQWo5QnlCLDZCQWk5QlA3RSxRQWo5Qk8sRUFpOUJFO0FBQ3ZCLFFBQUlBLFFBQVEsQ0FBQ2MsTUFBVCxLQUFrQixLQUFsQixJQUEyQmQsUUFBUSxDQUFDd0UsUUFBVCxLQUFzQm5ILFNBQXJELEVBQWdFO0FBQzVEb0gsTUFBQUEsV0FBVyxDQUFDQyxlQUFaLENBQTRCMUUsUUFBUSxDQUFDd0UsUUFBckM7QUFDSCxLQUZELE1BRU87QUFDSGpQLE1BQUFBLG9CQUFvQixDQUFDK0QsbUJBQXJCO0FBQ0g7QUFDSjtBQXY5QndCLENBQTdCLEMsQ0EwOUJBOztBQUNBN0QsQ0FBQyxDQUFDd0MsUUFBRCxDQUFELENBQVk2TSxLQUFaLENBQWtCLFlBQU07QUFDcEJ2UCxFQUFBQSxvQkFBb0IsQ0FBQ2dCLFVBQXJCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG4vKiBnbG9iYWwgYWNlLCBQYnhBcGksIFN5c2xvZ0FQSSwgdXBkYXRlTG9nVmlld1dvcmtlciwgQWNlLCBVc2VyTWVzc2FnZSwgU1ZHVGltZWxpbmUgKi9cblxuLyoqXG4gKiBSZXByZXNlbnRzIHRoZSBzeXN0ZW0gZGlhZ25vc3RpYyBsb2dzIG9iamVjdC5cbiAqXG4gKiBAbW9kdWxlIHN5c3RlbURpYWdub3N0aWNMb2dzXG4gKi9cbmNvbnN0IHN5c3RlbURpYWdub3N0aWNMb2dzID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBcIlNob3cgTGFzdCBMb2dcIiBidXR0b24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc2hvd0J0bjogJCgnI3Nob3ctbGFzdC1sb2cnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBcIkRvd25sb2FkIEZpbGVcIiBidXR0b24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZG93bmxvYWRCdG46ICQoJyNkb3dubG9hZC1maWxlJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgXCJTaG93IExhc3QgTG9nIChBdXRvKVwiIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzaG93QXV0b0J0bjogJCgnI3Nob3ctbGFzdC1sb2ctYXV0bycpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIFwiRXJhc2UgY3VycmVudCBmaWxlIGNvbnRlbnRcIiBidXR0b24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZXJhc2VCdG46ICQoJyNlcmFzZS1maWxlJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgbG9nIGNvbnRlbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbG9nQ29udGVudDogJCgnI2xvZy1jb250ZW50LXJlYWRvbmx5JyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgdmlld2VyIGZvciBkaXNwbGF5aW5nIHRoZSBsb2cgY29udGVudC5cbiAgICAgKiBAdHlwZSB7QWNlfVxuICAgICAqL1xuICAgIHZpZXdlcjogJycsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZmlsZSBzZWxlY3QgZHJvcGRvd24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZmlsZVNlbGVjdERyb3BEb3duOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogQXJyYXkgb2YgbG9nIGl0ZW1zLlxuICAgICAqIEB0eXBlIHtBcnJheX1cbiAgICAgKi9cbiAgICBsb2dzSXRlbXM6IFtdLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGRpbW1lci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkaW1tZXI6ICQoJyNnZXQtbG9ncy1kaW1tZXInKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNzeXN0ZW0tZGlhZ25vc3RpYy1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBGbGFnIHRvIHByZXZlbnQgZHVwbGljYXRlIEFQSSBjYWxscyBkdXJpbmcgaW5pdGlhbGl6YXRpb25cbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBpc0luaXRpYWxpemluZzogdHJ1ZSxcblxuICAgIC8qKlxuICAgICAqIEZsYWcgaW5kaWNhdGluZyBpZiB0aW1lIHNsaWRlciBtb2RlIGlzIGVuYWJsZWRcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICB0aW1lU2xpZGVyRW5hYmxlZDogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBDdXJyZW50IHRpbWUgcmFuZ2UgZm9yIHRoZSBzZWxlY3RlZCBsb2cgZmlsZVxuICAgICAqIEB0eXBlIHtvYmplY3R8bnVsbH1cbiAgICAgKi9cbiAgICBjdXJyZW50VGltZVJhbmdlOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogRmxhZyBpbmRpY2F0aW5nIGlmIGF1dG8tdXBkYXRlIG1vZGUgaXMgYWN0aXZlXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgaXNBdXRvVXBkYXRlQWN0aXZlOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBzeXN0ZW0gZGlhZ25vc3RpYyBsb2dzLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIGNvbnN0IGFjZUhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCAtIDI1MDtcblxuICAgICAgICAvLyBTZXQgdGhlIG1pbmltdW0gaGVpZ2h0IG9mIHRoZSBsb2cgY29udGFpbmVyXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIuY2xvc2VzdCgnZGl2JykuY3NzKCdtaW4taGVpZ2h0JywgYCR7YWNlSGVpZ2h0fXB4YCk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIGRyb3Bkb3duIFVJIGZyb20gaGlkZGVuIGlucHV0IChWNS4wIHBhdHRlcm4pXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmNyZWF0ZURyb3Bkb3duRnJvbUhpZGRlbklucHV0KCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZHJvcGRvd24gbWVudSBmb3IgbG9nIGZpbGVzIHdpdGggdHJlZSBzdXBwb3J0XG4gICAgICAgIC8vIEluaXRpYWxpemUgU2VtYW50aWMgVUkgZHJvcGRvd24gd2l0aCBjdXN0b20gbWVudSBnZW5lcmF0aW9uXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jYk9uQ2hhbmdlRmlsZSxcbiAgICAgICAgICAgICAgICBpZ25vcmVDYXNlOiB0cnVlLFxuICAgICAgICAgICAgICAgIGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuICAgICAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBwcmVzZXJ2ZUhUTUw6IHRydWUsXG4gICAgICAgICAgICAgICAgYWxsb3dDYXRlZ29yeVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICAgICAgbWF0Y2g6ICd0ZXh0JyxcbiAgICAgICAgICAgICAgICBmaWx0ZXJSZW1vdGVEYXRhOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBhY3Rpb246ICdhY3RpdmF0ZScsXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgICAgIG1lbnU6IHN5c3RlbURpYWdub3N0aWNMb2dzLmN1c3RvbURyb3Bkb3duTWVudVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgQUNFIGVkaXRvciBmb3IgbG9nIGNvbnRlbnRcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaW5pdGlhbGl6ZUFjZSgpO1xuXG4gICAgICAgIC8vIEZldGNoIHRoZSBsaXN0IG9mIGxvZyBmaWxlc1xuICAgICAgICBTeXNsb2dBUEkuZ2V0TG9nc0xpc3Qoc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY2JGb3JtYXREcm9wZG93blJlc3VsdHMpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgbG9nIGxldmVsIGRyb3Bkb3duIC0gVjUuMCBwYXR0ZXJuIHdpdGggRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pbml0aWFsaXplTG9nTGV2ZWxEcm9wZG93bigpO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciBxdWljayBwZXJpb2QgYnV0dG9uc1xuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnLnBlcmlvZC1idG4nLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgJGJ0biA9ICQoZS5jdXJyZW50VGFyZ2V0KTtcbiAgICAgICAgICAgIGNvbnN0IHBlcmlvZCA9ICRidG4uZGF0YSgncGVyaW9kJyk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBhY3RpdmUgc3RhdGVcbiAgICAgICAgICAgICQoJy5wZXJpb2QtYnRuJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgJGJ0bi5hZGRDbGFzcygnYWN0aXZlJyk7XG5cbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmFwcGx5UXVpY2tQZXJpb2QocGVyaW9kKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIFwiTm93XCIgYnV0dG9uXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcubm93LWJ0bicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBpZiAoc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY3VycmVudFRpbWVSYW5nZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGVuZCA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmN1cnJlbnRUaW1lUmFuZ2UuZW5kO1xuICAgICAgICAgICAgICAgIGNvbnN0IG9uZUhvdXIgPSAzNjAwO1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gTWF0aC5tYXgoZW5kIC0gb25lSG91ciwgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY3VycmVudFRpbWVSYW5nZS5zdGFydCk7XG4gICAgICAgICAgICAgICAgU1ZHVGltZWxpbmUuc2V0UmFuZ2Uoc3RhcnQsIGVuZCk7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9hZExvZ0J5VGltZVJhbmdlKHN0YXJ0LCBlbmQpO1xuICAgICAgICAgICAgICAgICQoJy5wZXJpb2QtYnRuJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgICAgICQoJy5wZXJpb2QtYnRuW2RhdGEtcGVyaW9kPVwiMzYwMFwiXScpLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIGxvZyBsZXZlbCBmaWx0ZXIgYnV0dG9uc1xuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnLmxldmVsLWJ0bicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkYnRuID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICAgICAgY29uc3QgbGV2ZWwgPSAkYnRuLmRhdGEoJ2xldmVsJyk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBhY3RpdmUgc3RhdGVcbiAgICAgICAgICAgICQoJy5sZXZlbC1idG4nKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAkYnRuLmFkZENsYXNzKCdhY3RpdmUnKTtcblxuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuYXBwbHlMb2dMZXZlbEZpbHRlcihsZXZlbCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciBcIlNob3cgTG9nXCIgYnV0dG9uIGNsaWNrIChkZWxlZ2F0ZWQpXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcjc2hvdy1sYXN0LWxvZycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy51cGRhdGVMb2dGcm9tU2VydmVyKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIExpc3RlbiBmb3IgaGFzaCBjaGFuZ2VzIHRvIHVwZGF0ZSBzZWxlY3RlZCBmaWxlXG4gICAgICAgICQod2luZG93KS5vbignaGFzaGNoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmhhbmRsZUhhc2hDaGFuZ2UoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIFwiRG93bmxvYWQgTG9nXCIgYnV0dG9uIGNsaWNrIChkZWxlZ2F0ZWQpXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcjZG93bmxvYWQtZmlsZScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCBkYXRhID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICAgICAgU3lzbG9nQVBJLmRvd25sb2FkTG9nRmlsZShkYXRhLmZpbGVuYW1lLCB0cnVlLCBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jYkRvd25sb2FkRmlsZSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciBcIkF1dG8gUmVmcmVzaFwiIGJ1dHRvbiBjbGljayAoZGVsZWdhdGVkKVxuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnI3Nob3ctbGFzdC1sb2ctYXV0bycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkYnV0dG9uID0gJCgnI3Nob3ctbGFzdC1sb2ctYXV0bycpO1xuICAgICAgICAgICAgY29uc3QgJHJlbG9hZEljb24gPSAkYnV0dG9uLmZpbmQoJy5pY29ucyBpLnJlZnJlc2gnKTtcbiAgICAgICAgICAgIGlmICgkcmVsb2FkSWNvbi5oYXNDbGFzcygnbG9hZGluZycpKSB7XG4gICAgICAgICAgICAgICAgJHJlbG9hZEljb24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB1cGRhdGVMb2dWaWV3V29ya2VyLnN0b3AoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHJlbG9hZEljb24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHVwZGF0ZUxvZ1ZpZXdXb3JrZXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgdGhlIFwiRXJhc2UgZmlsZVwiIGJ1dHRvbiBjbGljayAoZGVsZWdhdGVkKVxuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnI2VyYXNlLWZpbGUnLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuZXJhc2VDdXJyZW50RmlsZUNvbnRlbnQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIFwiQ2xlYXIgRmlsdGVyXCIgYnV0dG9uIGNsaWNrIChkZWxlZ2F0ZWQpXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcjY2xlYXItZmlsdGVyLWJ0bicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZmlsdGVyJywgJycpO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudXBkYXRlTG9nRnJvbVNlcnZlcigpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgRW50ZXIga2V5cHJlc3Mgb25seSBvbiBmaWx0ZXIgaW5wdXQgZmllbGRcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2tleXVwJywgJyNmaWx0ZXInLCAoZXZlbnQpID0+IHtcbiAgICAgICAgICAgIGlmIChldmVudC5rZXlDb2RlID09PSAxMykge1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIEZ1bGxzY3JlZW4gYnV0dG9uIGNsaWNrXG4gICAgICAgICQoJy5mdWxsc2NyZWVuLXRvZ2dsZS1idG4nKS5vbignY2xpY2snLCBzeXN0ZW1EaWFnbm9zdGljTG9ncy50b2dnbGVGdWxsU2NyZWVuKTtcblxuICAgICAgICAvLyBMaXN0ZW5pbmcgZm9yIHRoZSBmdWxsc2NyZWVuIGNoYW5nZSBldmVudFxuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdmdWxsc2NyZWVuY2hhbmdlJywgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuYWRqdXN0TG9nSGVpZ2h0KTtcblxuICAgICAgICAvLyBJbml0aWFsIGhlaWdodCBjYWxjdWxhdGlvblxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5hZGp1c3RMb2dIZWlnaHQoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlcyB0aGUgZnVsbC1zY3JlZW4gbW9kZSBvZiB0aGUgJ3N5c3RlbS1sb2dzLXNlZ21lbnQnIGVsZW1lbnQuXG4gICAgICogSWYgdGhlIGVsZW1lbnQgaXMgbm90IGluIGZ1bGwtc2NyZWVuIG1vZGUsIGl0IHJlcXVlc3RzIGZ1bGwtc2NyZWVuIG1vZGUuXG4gICAgICogSWYgdGhlIGVsZW1lbnQgaXMgYWxyZWFkeSBpbiBmdWxsLXNjcmVlbiBtb2RlLCBpdCBleGl0cyBmdWxsLXNjcmVlbiBtb2RlLlxuICAgICAqIExvZ3MgYW4gZXJyb3IgbWVzc2FnZSB0byB0aGUgY29uc29sZSBpZiB0aGVyZSBpcyBhbiBpc3N1ZSBlbmFibGluZyBmdWxsLXNjcmVlbiBtb2RlLlxuICAgICAqXG4gICAgICogQHJldHVybiB7dm9pZH1cbiAgICAgKi9cbiAgICB0b2dnbGVGdWxsU2NyZWVuKCkge1xuICAgICAgICBjb25zdCBsb2dDb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc3lzdGVtLWxvZ3Mtc2VnbWVudCcpO1xuXG4gICAgICAgIGlmICghZG9jdW1lbnQuZnVsbHNjcmVlbkVsZW1lbnQpIHtcbiAgICAgICAgICAgIGxvZ0NvbnRhaW5lci5yZXF1ZXN0RnVsbHNjcmVlbigpLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGBFcnJvciBhdHRlbXB0aW5nIHRvIGVuYWJsZSBmdWxsLXNjcmVlbiBtb2RlOiAke2Vyci5tZXNzYWdlfWApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkb2N1bWVudC5leGl0RnVsbHNjcmVlbigpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZ1bmN0aW9uIHRvIGFkanVzdCB0aGUgaGVpZ2h0IG9mIHRoZSBsb2dzIGRlcGVuZGluZyBvbiB0aGUgc2NyZWVuIG1vZGUuXG4gICAgICovXG4gICAgYWRqdXN0TG9nSGVpZ2h0KCkge1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIGxldCBhY2VIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kbG9nQ29udGVudC5vZmZzZXQoKS50b3AgLSA1NTtcbiAgICAgICAgICAgIGlmIChkb2N1bWVudC5mdWxsc2NyZWVuRWxlbWVudCkge1xuICAgICAgICAgICAgICAgIC8vIElmIGZ1bGxzY3JlZW4gbW9kZSBpcyBhY3RpdmVcbiAgICAgICAgICAgICAgICBhY2VIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSA4MDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFJlY2FsY3VsYXRlIHRoZSBzaXplIG9mIHRoZSBBQ0UgZWRpdG9yXG4gICAgICAgICAgICAkKCcubG9nLWNvbnRlbnQtcmVhZG9ubHknKS5jc3MoJ21pbi1oZWlnaHQnLCAgYCR7YWNlSGVpZ2h0fXB4YCk7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIucmVzaXplKCk7XG4gICAgICAgIH0sIDMwMCk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGxvZyBsZXZlbCBkcm9wZG93biAtIFY1LjAgcGF0dGVybiB3aXRoIEhUTUwgaWNvbnNcbiAgICAgKiBTdGF0aWMgZHJvcGRvd24gd2l0aCBjb2xvcmVkIGljb25zIGFuZCB0cmFuc2xhdGlvbnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplTG9nTGV2ZWxEcm9wZG93bigpIHtcbiAgICAgICAgY29uc3QgJGhpZGRlbklucHV0ID0gJCgnI2xvZ0xldmVsJyk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgZHJvcGRvd24gYWxyZWFkeSBleGlzdHNcbiAgICAgICAgaWYgKCQoJyNsb2dMZXZlbC1kcm9wZG93bicpLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ3JlYXRlIGRyb3Bkb3duIEhUTUwgd2l0aCBjb2xvcmVkIGljb25zXG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJzxkaXY+Jywge1xuICAgICAgICAgICAgaWQ6ICdsb2dMZXZlbC1kcm9wZG93bicsXG4gICAgICAgICAgICBjbGFzczogJ3VpIHNlbGVjdGlvbiBkcm9wZG93bidcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3QgJHRleHQgPSAkKCc8ZGl2PicsIHsgY2xhc3M6ICd0ZXh0JyB9KS50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5zZF9BbGxMZXZlbHMpO1xuICAgICAgICBjb25zdCAkaWNvbiA9ICQoJzxpPicsIHsgY2xhc3M6ICdkcm9wZG93biBpY29uJyB9KTtcbiAgICAgICAgY29uc3QgJG1lbnUgPSAkKCc8ZGl2PicsIHsgY2xhc3M6ICdtZW51JyB9KTtcblxuICAgICAgICAvLyBCdWlsZCBtZW51IGl0ZW1zIHdpdGggY29sb3JlZCBpY29uc1xuICAgICAgICBjb25zdCBpdGVtcyA9IFtcbiAgICAgICAgICAgIHsgdmFsdWU6ICcnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc2RfQWxsTGV2ZWxzLCBpY29uOiAnJyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ0VSUk9SJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnNkX0Vycm9yLCBpY29uOiAnPGkgY2xhc3M9XCJleGNsYW1hdGlvbiBjaXJjbGUgcmVkIGljb25cIj48L2k+JyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ1dBUk5JTkcnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc2RfV2FybmluZywgaWNvbjogJzxpIGNsYXNzPVwiZXhjbGFtYXRpb24gdHJpYW5nbGUgb3JhbmdlIGljb25cIj48L2k+JyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ05PVElDRScsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5zZF9Ob3RpY2UsIGljb246ICc8aSBjbGFzcz1cImluZm8gY2lyY2xlIGJsdWUgaWNvblwiPjwvaT4nIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAnSU5GTycsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5zZF9JbmZvLCBpY29uOiAnPGkgY2xhc3M9XCJjaXJjbGUgZ3JleSBpY29uXCI+PC9pPicgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdERUJVRycsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5zZF9EZWJ1ZywgaWNvbjogJzxpIGNsYXNzPVwiYnVnIHB1cnBsZSBpY29uXCI+PC9pPicgfVxuICAgICAgICBdO1xuXG4gICAgICAgIGl0ZW1zLmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkaXRlbSA9ICQoJzxkaXY+Jywge1xuICAgICAgICAgICAgICAgIGNsYXNzOiAnaXRlbScsXG4gICAgICAgICAgICAgICAgJ2RhdGEtdmFsdWUnOiBpdGVtLnZhbHVlXG4gICAgICAgICAgICB9KS5odG1sKGl0ZW0uaWNvbiArIGl0ZW0udGV4dCk7XG4gICAgICAgICAgICAkbWVudS5hcHBlbmQoJGl0ZW0pO1xuICAgICAgICB9KTtcblxuICAgICAgICAkZHJvcGRvd24uYXBwZW5kKCR0ZXh0LCAkaWNvbiwgJG1lbnUpO1xuICAgICAgICAkaGlkZGVuSW5wdXQuYWZ0ZXIoJGRyb3Bkb3duKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIFNlbWFudGljIFVJIGRyb3Bkb3duXG4gICAgICAgICRkcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgJGhpZGRlbklucHV0LnZhbCh2YWx1ZSkudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudXBkYXRlTG9nRnJvbVNlcnZlcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBkcm9wZG93biBVSSBlbGVtZW50IGZyb20gaGlkZGVuIGlucHV0IGZpZWxkIChWNS4wIHBhdHRlcm4pXG4gICAgICovXG4gICAgY3JlYXRlRHJvcGRvd25Gcm9tSGlkZGVuSW5wdXQoKSB7XG4gICAgICAgIGNvbnN0ICRoaWRkZW5JbnB1dCA9ICQoJyNmaWxlbmFtZXMnKTtcblxuICAgICAgICBpZiAoISRoaWRkZW5JbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0hpZGRlbiBpbnB1dCAjZmlsZW5hbWVzIG5vdCBmb3VuZCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJCgnPGRpdj4nLCB7XG4gICAgICAgICAgICBpZDogJ2ZpbGVuYW1lcy1kcm9wZG93bicsXG4gICAgICAgICAgICBjbGFzczogJ3VpIHNlbGVjdGlvbiBkcm9wZG93biBmaWxlbmFtZXMtc2VsZWN0IGZsdWlkJ1xuICAgICAgICB9KTtcblxuICAgICAgICAkZHJvcGRvd24uYXBwZW5kKFxuICAgICAgICAgICAgJCgnPGk+JywgeyBjbGFzczogJ2Ryb3Bkb3duIGljb24nIH0pLFxuICAgICAgICAgICAgJCgnPGRpdj4nLCB7IGNsYXNzOiAnZGVmYXVsdCB0ZXh0JyB9KS50ZXh0KCdTZWxlY3QgbG9nIGZpbGUnKSxcbiAgICAgICAgICAgICQoJzxkaXY+JywgeyBjbGFzczogJ21lbnUnIH0pXG4gICAgICAgICk7XG5cbiAgICAgICAgJGhpZGRlbklucHV0LmJlZm9yZSgkZHJvcGRvd24pO1xuICAgICAgICAkaGlkZGVuSW5wdXQuaGlkZSgpO1xuXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24gPSAkZHJvcGRvd247XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBBQ0UgZWRpdG9yIGZvciBsb2cgdmlld2luZy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplQWNlKCkge1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIgPSBhY2UuZWRpdCgnbG9nLWNvbnRlbnQtcmVhZG9ubHknKTtcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgSnVsaWEgbW9kZSBpcyBhdmFpbGFibGVcbiAgICAgICAgY29uc3QganVsaWEgPSBhY2UucmVxdWlyZSgnYWNlL21vZGUvanVsaWEnKTtcbiAgICAgICAgaWYgKGp1bGlhICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIFNldCB0aGUgbW9kZSB0byBKdWxpYSBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgIGNvbnN0IEluaU1vZGUgPSBqdWxpYS5Nb2RlO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnNlc3Npb24uc2V0TW9kZShuZXcgSW5pTW9kZSgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCB0aGUgdGhlbWUgYW5kIG9wdGlvbnMgZm9yIHRoZSBBQ0UgZWRpdG9yXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlci5zZXRUaGVtZSgnYWNlL3RoZW1lL21vbm9rYWknKTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnJlbmRlcmVyLnNldFNob3dHdXR0ZXIoZmFsc2UpO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIuc2V0T3B0aW9ucyh7XG4gICAgICAgICAgICBzaG93TGluZU51bWJlcnM6IGZhbHNlLFxuICAgICAgICAgICAgc2hvd1ByaW50TWFyZ2luOiBmYWxzZSxcbiAgICAgICAgICAgIHJlYWRPbmx5OiB0cnVlLFxuICAgICAgICB9KTtcblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCdWlsZHMgYSBoaWVyYXJjaGljYWwgdHJlZSBzdHJ1Y3R1cmUgZnJvbSBmbGF0IGZpbGUgcGF0aHNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZmlsZXMgLSBUaGUgZmlsZXMgb2JqZWN0IGZyb20gQVBJIHJlc3BvbnNlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGRlZmF1bHRQYXRoIC0gVGhlIGRlZmF1bHQgc2VsZWN0ZWQgZmlsZSBwYXRoXG4gICAgICogQHJldHVybnMge0FycmF5fSBUcmVlIHN0cnVjdHVyZSBmb3IgdGhlIGRyb3Bkb3duXG4gICAgICovXG4gICAgYnVpbGRUcmVlU3RydWN0dXJlKGZpbGVzLCBkZWZhdWx0UGF0aCkge1xuICAgICAgICBjb25zdCB0cmVlID0ge307XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCB0aGUgdHJlZSBzdHJ1Y3R1cmVcbiAgICAgICAgT2JqZWN0LmVudHJpZXMoZmlsZXMpLmZvckVhY2goKFtrZXksIGZpbGVEYXRhXSkgPT4ge1xuICAgICAgICAgICAgLy8gVXNlIGZpbGVEYXRhLnBhdGggYXMgdGhlIGFjdHVhbCBmaWxlIHBhdGhcbiAgICAgICAgICAgIGNvbnN0IGZpbGVQYXRoID0gZmlsZURhdGEucGF0aCB8fCBrZXk7XG4gICAgICAgICAgICBjb25zdCBwYXJ0cyA9IGZpbGVQYXRoLnNwbGl0KCcvJyk7XG4gICAgICAgICAgICBsZXQgY3VycmVudCA9IHRyZWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHBhcnRzLmZvckVhY2goKHBhcnQsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGluZGV4ID09PSBwYXJ0cy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgaXMgYSBmaWxlXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRbcGFydF0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZmlsZScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBmaWxlUGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpemU6IGZpbGVEYXRhLnNpemUsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAoZGVmYXVsdFBhdGggJiYgZGVmYXVsdFBhdGggPT09IGZpbGVQYXRoKSB8fCAoIWRlZmF1bHRQYXRoICYmIGZpbGVEYXRhLmRlZmF1bHQpXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBpcyBhIGRpcmVjdG9yeVxuICAgICAgICAgICAgICAgICAgICBpZiAoIWN1cnJlbnRbcGFydF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRbcGFydF0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ZvbGRlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW46IHt9XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnQgPSBjdXJyZW50W3BhcnRdLmNoaWxkcmVuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbnZlcnQgdHJlZSB0byBkcm9wZG93biBpdGVtc1xuICAgICAgICByZXR1cm4gdGhpcy50cmVlVG9Ecm9wZG93bkl0ZW1zKHRyZWUsICcnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENvbnZlcnRzIHRyZWUgc3RydWN0dXJlIHRvIGRyb3Bkb3duIGl0ZW1zIHdpdGggcHJvcGVyIGZvcm1hdHRpbmdcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gdHJlZSAtIFRoZSB0cmVlIHN0cnVjdHVyZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcmVmaXggLSBQcmVmaXggZm9yIGluZGVudGF0aW9uXG4gICAgICogQHJldHVybnMge0FycmF5fSBGb3JtYXR0ZWQgZHJvcGRvd24gaXRlbXNcbiAgICAgKi9cbiAgICB0cmVlVG9Ecm9wZG93bkl0ZW1zKHRyZWUsIHByZWZpeCkge1xuICAgICAgICBjb25zdCBpdGVtcyA9IFtdO1xuICAgICAgICBcbiAgICAgICAgLy8gU29ydCBlbnRyaWVzOiBmb2xkZXJzIGZpcnN0LCB0aGVuIGZpbGVzXG4gICAgICAgIGNvbnN0IGVudHJpZXMgPSBPYmplY3QuZW50cmllcyh0cmVlKS5zb3J0KChbYUtleSwgYVZhbF0sIFtiS2V5LCBiVmFsXSkgPT4ge1xuICAgICAgICAgICAgaWYgKGFWYWwudHlwZSA9PT0gJ2ZvbGRlcicgJiYgYlZhbC50eXBlID09PSAnZmlsZScpIHJldHVybiAtMTtcbiAgICAgICAgICAgIGlmIChhVmFsLnR5cGUgPT09ICdmaWxlJyAmJiBiVmFsLnR5cGUgPT09ICdmb2xkZXInKSByZXR1cm4gMTtcbiAgICAgICAgICAgIHJldHVybiBhS2V5LmxvY2FsZUNvbXBhcmUoYktleSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgZW50cmllcy5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcbiAgICAgICAgICAgIGlmICh2YWx1ZS50eXBlID09PSAnZm9sZGVyJykge1xuICAgICAgICAgICAgICAgIC8vIEFkZCBmb2xkZXIgaGVhZGVyXG4gICAgICAgICAgICAgICAgaXRlbXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGAke3ByZWZpeH08aSBjbGFzcz1cImZvbGRlciBpY29uXCI+PC9pPiAke2tleX1gLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJycsXG4gICAgICAgICAgICAgICAgICAgIGRpc2FibGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZm9sZGVyJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEFkZCBjaGlsZHJlbiB3aXRoIGluY3JlYXNlZCBpbmRlbnRhdGlvblxuICAgICAgICAgICAgICAgIGNvbnN0IGNoaWxkSXRlbXMgPSB0aGlzLnRyZWVUb0Ryb3Bkb3duSXRlbXModmFsdWUuY2hpbGRyZW4sIHByZWZpeCArICcmbmJzcDsmbmJzcDsmbmJzcDsmbmJzcDsnKTtcbiAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKC4uLmNoaWxkSXRlbXMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBBZGQgZmlsZSBpdGVtXG4gICAgICAgICAgICAgICAgaXRlbXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGAke3ByZWZpeH08aSBjbGFzcz1cImZpbGUgb3V0bGluZSBpY29uXCI+PC9pPiAke2tleX0gKCR7dmFsdWUuc2l6ZX0pYCxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlLnBhdGgsXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkOiB2YWx1ZS5kZWZhdWx0LFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZmlsZSdcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gaXRlbXM7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGN1c3RvbSBkcm9wZG93biBtZW51IEhUTUwgZm9yIGxvZyBmaWxlc1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBjb250YWluaW5nIGRyb3Bkb3duIG1lbnUgb3B0aW9uc1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBmaWVsZHMgLSBUaGUgZmllbGRzIGluIHRoZSByZXNwb25zZSB0byB1c2UgZm9yIHRoZSBtZW51IG9wdGlvbnNcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgSFRNTCBzdHJpbmcgZm9yIHRoZSBjdXN0b20gZHJvcGRvd24gbWVudVxuICAgICAqL1xuICAgIGN1c3RvbURyb3Bkb3duTWVudShyZXNwb25zZSwgZmllbGRzKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlcyA9IHJlc3BvbnNlW2ZpZWxkcy52YWx1ZXNdIHx8IHt9O1xuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuICAgICAgICBcbiAgICAgICAgJC5lYWNoKHZhbHVlcywgKGluZGV4LCBvcHRpb24pID0+IHtcbiAgICAgICAgICAgIC8vIEZvciB0cmVlIHN0cnVjdHVyZSBpdGVtc1xuICAgICAgICAgICAgaWYgKHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtcyAmJiBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXNbaW5kZXhdKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXRlbSA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtc1tpbmRleF07XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgaWYgKGl0ZW0udHlwZSA9PT0gJ2ZvbGRlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRm9sZGVyIGl0ZW0gLSBkaXNhYmxlZCBhbmQgd2l0aCBmb2xkZXIgaWNvblxuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiZGlzYWJsZWQgaXRlbVwiIGRhdGEtdmFsdWU9XCJcIj4ke2l0ZW0ubmFtZX08L2Rpdj5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZpbGUgaXRlbSB3aXRoIHByb3BlciB2YWx1ZVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RlZCA9IGl0ZW0uc2VsZWN0ZWQgPyAnc2VsZWN0ZWQgYWN0aXZlJyA6ICcnO1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbSAke3NlbGVjdGVkfVwiIGRhdGEtdmFsdWU9XCIke29wdGlvbltmaWVsZHMudmFsdWVdfVwiPiR7aXRlbS5uYW1lfTwvZGl2PmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBGYWxsYmFjayB0byByZWd1bGFyIGl0ZW1cbiAgICAgICAgICAgICAgICBjb25zdCBtYXliZURpc2FibGVkID0gKG9wdGlvbltmaWVsZHMuZGlzYWJsZWRdKSA/ICdkaXNhYmxlZCAnIDogJyc7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIiR7bWF5YmVEaXNhYmxlZH1pdGVtXCIgZGF0YS12YWx1ZT1cIiR7b3B0aW9uW2ZpZWxkcy52YWx1ZV19XCI+JHtvcHRpb25bZmllbGRzLm5hbWVdfTwvZGl2PmA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgaGFzaCBjaGFuZ2VzIHRvIHVwZGF0ZSB0aGUgc2VsZWN0ZWQgZmlsZVxuICAgICAqL1xuICAgIGhhbmRsZUhhc2hDaGFuZ2UoKSB7XG4gICAgICAgIC8vIFNraXAgZHVyaW5nIGluaXRpYWxpemF0aW9uIHRvIHByZXZlbnQgZHVwbGljYXRlIEFQSSBjYWxsc1xuICAgICAgICBpZiAoc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNJbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGhhc2ggPSB3aW5kb3cubG9jYXRpb24uaGFzaDtcbiAgICAgICAgaWYgKGhhc2ggJiYgaGFzaC5zdGFydHNXaXRoKCcjZmlsZT0nKSkge1xuICAgICAgICAgICAgY29uc3QgZmlsZVBhdGggPSBkZWNvZGVVUklDb21wb25lbnQoaGFzaC5zdWJzdHJpbmcoNikpO1xuICAgICAgICAgICAgaWYgKGZpbGVQYXRoICYmIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ2dldCB2YWx1ZScpICE9PSBmaWxlUGF0aCkge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBmaWxlIGV4aXN0cyBpbiBkcm9wZG93biBpdGVtc1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVFeGlzdHMgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXMuc29tZShpdGVtID0+XG4gICAgICAgICAgICAgICAgICAgIGl0ZW0udHlwZSA9PT0gJ2ZpbGUnICYmIGl0ZW0udmFsdWUgPT09IGZpbGVQYXRoXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBpZiAoZmlsZUV4aXN0cykge1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBmaWxlUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldCB0ZXh0JywgZmlsZVBhdGgpO1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZmlsZW5hbWUnLCBmaWxlUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgZmlsZSBwYXRoIGZyb20gVVJMIGhhc2ggaWYgcHJlc2VudFxuICAgICAqL1xuICAgIGdldEZpbGVGcm9tSGFzaCgpIHtcbiAgICAgICAgY29uc3QgaGFzaCA9IHdpbmRvdy5sb2NhdGlvbi5oYXNoO1xuICAgICAgICBpZiAoaGFzaCAmJiBoYXNoLnN0YXJ0c1dpdGgoJyNmaWxlPScpKSB7XG4gICAgICAgICAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KGhhc2guc3Vic3RyaW5nKDYpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGZvcm1hdCB0aGUgZHJvcGRvd24gbWVudSBzdHJ1Y3R1cmUgYmFzZWQgb24gdGhlIHJlc3BvbnNlLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBkYXRhLlxuICAgICAqL1xuICAgIGNiRm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIHJlc3BvbnNlIGlzIHZhbGlkXG4gICAgICAgIGlmICghcmVzcG9uc2UgfHwgIXJlc3BvbnNlLnJlc3VsdCB8fCAhcmVzcG9uc2UuZGF0YSB8fCAhcmVzcG9uc2UuZGF0YS5maWxlcykge1xuICAgICAgICAgICAgLy8gSGlkZSBkaW1tZXIgb25seSBpZiBub3QgaW4gYXV0by11cGRhdGUgbW9kZVxuICAgICAgICAgICAgaWYgKCFzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGZpbGVzID0gcmVzcG9uc2UuZGF0YS5maWxlcztcblxuICAgICAgICAvLyBDaGVjayBmb3IgZmlsZSBmcm9tIGhhc2ggZmlyc3RcbiAgICAgICAgbGV0IGRlZlZhbCA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmdldEZpbGVGcm9tSGFzaCgpO1xuXG4gICAgICAgIC8vIElmIG5vIGhhc2ggdmFsdWUsIGNoZWNrIGlmIHRoZXJlIGlzIGEgZGVmYXVsdCB2YWx1ZSBzZXQgZm9yIHRoZSBmaWxlbmFtZSBpbnB1dCBmaWVsZFxuICAgICAgICBpZiAoIWRlZlZhbCkge1xuICAgICAgICAgICAgY29uc3QgZmlsZU5hbWUgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZmlsZW5hbWUnKTtcbiAgICAgICAgICAgIGlmIChmaWxlTmFtZSAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICBkZWZWYWwgPSBmaWxlTmFtZS50cmltKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBCdWlsZCB0cmVlIHN0cnVjdHVyZSBmcm9tIGZpbGVzXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtcyA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmJ1aWxkVHJlZVN0cnVjdHVyZShmaWxlcywgZGVmVmFsKTtcblxuICAgICAgICAvLyBDcmVhdGUgdmFsdWVzIGFycmF5IGZvciBkcm9wZG93biB3aXRoIGFsbCBpdGVtcyAoaW5jbHVkaW5nIGZvbGRlcnMpXG4gICAgICAgIGNvbnN0IGRyb3Bkb3duVmFsdWVzID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zLm1hcCgoaXRlbSwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGlmIChpdGVtLnR5cGUgPT09ICdmb2xkZXInKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogaXRlbS5uYW1lLnJlcGxhY2UoLzxbXj5dKj4vZywgJycpLCAvLyBSZW1vdmUgSFRNTCB0YWdzIGZvciBzZWFyY2hcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICcnLFxuICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZDogdHJ1ZVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGl0ZW0ubmFtZS5yZXBsYWNlKC88W14+XSo+L2csICcnKSwgLy8gUmVtb3ZlIEhUTUwgdGFncyBmb3Igc2VhcmNoXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBpdGVtLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZDogaXRlbS5zZWxlY3RlZFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGRyb3Bkb3duIHdpdGggdmFsdWVzXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldHVwIG1lbnUnLCB7XG4gICAgICAgICAgICB2YWx1ZXM6IGRyb3Bkb3duVmFsdWVzXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gU2V0IHRoZSBkZWZhdWx0IHNlbGVjdGVkIHZhbHVlIGlmIGFueVxuICAgICAgICBjb25zdCBzZWxlY3RlZEl0ZW0gPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXMuZmluZChpdGVtID0+IGl0ZW0uc2VsZWN0ZWQpO1xuICAgICAgICBpZiAoc2VsZWN0ZWRJdGVtKSB7XG4gICAgICAgICAgICAvLyBVc2Ugc2V0VGltZW91dCB0byBlbnN1cmUgZHJvcGRvd24gaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFNldHRpbmcgc2VsZWN0ZWQgdmFsdWUgd2lsbCB0cmlnZ2VyIG9uQ2hhbmdlIGNhbGxiYWNrIHdoaWNoIGNhbGxzIHVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKVxuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHNlbGVjdGVkSXRlbS52YWx1ZSk7XG4gICAgICAgICAgICAgICAgLy8gRm9yY2UgcmVmcmVzaCB0aGUgZHJvcGRvd24gdG8gc2hvdyB0aGUgc2VsZWN0ZWQgdmFsdWVcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdyZWZyZXNoJyk7XG4gICAgICAgICAgICAgICAgLy8gQWxzbyBzZXQgdGhlIHRleHQgdG8gc2hvdyBmdWxsIHBhdGhcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXQgdGV4dCcsIHNlbGVjdGVkSXRlbS52YWx1ZSk7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2ZpbGVuYW1lJywgc2VsZWN0ZWRJdGVtLnZhbHVlKTtcbiAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZGVmVmFsKSB7XG4gICAgICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgZGVmYXVsdCB2YWx1ZSBidXQgbm8gaXRlbSB3YXMgbWFya2VkIGFzIHNlbGVjdGVkLFxuICAgICAgICAgICAgLy8gdHJ5IHRvIGZpbmQgYW5kIHNlbGVjdCBpdCBtYW51YWxseVxuICAgICAgICAgICAgY29uc3QgaXRlbVRvU2VsZWN0ID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zLmZpbmQoaXRlbSA9PlxuICAgICAgICAgICAgICAgIGl0ZW0udHlwZSA9PT0gJ2ZpbGUnICYmIGl0ZW0udmFsdWUgPT09IGRlZlZhbFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGlmIChpdGVtVG9TZWxlY3QpIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0dGluZyBzZWxlY3RlZCB2YWx1ZSB3aWxsIHRyaWdnZXIgb25DaGFuZ2UgY2FsbGJhY2sgd2hpY2ggY2FsbHMgdXBkYXRlTG9nRnJvbVNlcnZlcigpXG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGl0ZW1Ub1NlbGVjdC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3JlZnJlc2gnKTtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignc2V0IHRleHQnLCBpdGVtVG9TZWxlY3QudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZmlsZW5hbWUnLCBpdGVtVG9TZWxlY3QudmFsdWUpO1xuICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEhpZGUgdGhlIGRpbW1lciBhZnRlciBsb2FkaW5nIG9ubHkgaWYgbm8gZmlsZSBpcyBzZWxlY3RlZFxuICAgICAgICAgICAgICAgIGlmICghc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEhpZGUgdGhlIGRpbW1lciBhZnRlciBsb2FkaW5nIG9ubHkgaWYgbm8gZmlsZSBpcyBzZWxlY3RlZFxuICAgICAgICAgICAgaWYgKCFzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1hcmsgaW5pdGlhbGl6YXRpb24gYXMgY29tcGxldGUgdG8gYWxsb3cgaGFzaGNoYW5nZSBoYW5kbGVyIHRvIHdvcmtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0luaXRpYWxpemluZyA9IGZhbHNlO1xuICAgICAgICB9LCAyMDApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBjaGFuZ2luZyB0aGUgbG9nIGZpbGUgaW4gdGhlIHNlbGVjdCBkcm9wZG93bi5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgc2VsZWN0ZWQgdmFsdWUuXG4gICAgICovXG4gICAgY2JPbkNoYW5nZUZpbGUodmFsdWUpIHtcbiAgICAgICAgaWYgKHZhbHVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0IGRyb3Bkb3duIHRleHQgdG8gc2hvdyB0aGUgZnVsbCBmaWxlIHBhdGhcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignc2V0IHRleHQnLCB2YWx1ZSk7XG5cbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2ZpbGVuYW1lJywgdmFsdWUpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBVUkwgaGFzaCB3aXRoIHRoZSBzZWxlY3RlZCBmaWxlXG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gJ2ZpbGU9JyArIGVuY29kZVVSSUNvbXBvbmVudCh2YWx1ZSk7XG5cbiAgICAgICAgLy8gUmVzZXQgZmlsdGVycyBvbmx5IGlmIHVzZXIgbWFudWFsbHkgY2hhbmdlZCB0aGUgZmlsZSAobm90IGR1cmluZyBpbml0aWFsaXphdGlvbilcbiAgICAgICAgaWYgKCFzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0luaXRpYWxpemluZykge1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MucmVzZXRGaWx0ZXJzKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBpZiB0aW1lIHJhbmdlIGlzIGF2YWlsYWJsZSBmb3IgdGhpcyBmaWxlXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmNoZWNrVGltZVJhbmdlQXZhaWxhYmlsaXR5KHZhbHVlKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVzZXQgYWxsIGZpbHRlcnMgd2hlbiBjaGFuZ2luZyBsb2cgZmlsZXNcbiAgICAgKi9cbiAgICByZXNldEZpbHRlcnMoKSB7XG4gICAgICAgIC8vIERlYWN0aXZhdGUgYWxsIHF1aWNrLXBlcmlvZCBidXR0b25zXG4gICAgICAgICQoJy5wZXJpb2QtYnRuJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuXG4gICAgICAgIC8vIFJlc2V0IGxvZ0xldmVsIGRyb3Bkb3duIHRvIGRlZmF1bHQgKEFsbCBMZXZlbHMgLSBlbXB0eSB2YWx1ZSlcbiAgICAgICAgJCgnI2xvZ0xldmVsLWRyb3Bkb3duJykuZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsICcnKTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2xvZ0xldmVsJywgJycpO1xuXG4gICAgICAgIC8vIENsZWFyIGZpbHRlciBpbnB1dCBmaWVsZFxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZmlsdGVyJywgJycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiB0aW1lIHJhbmdlIGlzIGF2YWlsYWJsZSBmb3IgdGhlIHNlbGVjdGVkIGxvZyBmaWxlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVuYW1lIC0gTG9nIGZpbGUgcGF0aFxuICAgICAqL1xuICAgIGFzeW5jIGNoZWNrVGltZVJhbmdlQXZhaWxhYmlsaXR5KGZpbGVuYW1lKSB7XG4gICAgICAgIC8vIFNob3cgZGltbWVyIG9ubHkgaWYgbm90IGluIGF1dG8tdXBkYXRlIG1vZGVcbiAgICAgICAgaWYgKCFzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUpIHtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFRyeSB0byBnZXQgdGltZSByYW5nZSBmb3IgdGhpcyBmaWxlXG4gICAgICAgICAgICBTeXNsb2dBUEkuZ2V0TG9nVGltZVJhbmdlKGZpbGVuYW1lLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS50aW1lX3JhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRpbWUgcmFuZ2UgaXMgYXZhaWxhYmxlIC0gdXNlIHRpbWUtYmFzZWQgbmF2aWdhdGlvblxuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pbml0aWFsaXplTmF2aWdhdGlvbihyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBUaW1lIHJhbmdlIG5vdCBhdmFpbGFibGUgLSB1c2UgbGluZSBudW1iZXIgZmFsbGJhY2tcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaW5pdGlhbGl6ZU5hdmlnYXRpb24obnVsbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBjaGVja2luZyB0aW1lIHJhbmdlOicsIGVycm9yKTtcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIGxpbmUgbnVtYmVyIG1vZGVcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmluaXRpYWxpemVOYXZpZ2F0aW9uKG51bGwpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdW5pdmVyc2FsIG5hdmlnYXRpb24gd2l0aCB0aW1lIG9yIGxpbmUgbnVtYmVyIG1vZGVcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gdGltZVJhbmdlRGF0YSAtIFRpbWUgcmFuZ2UgZGF0YSBmcm9tIEFQSSAob3B0aW9uYWwpXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZU5hdmlnYXRpb24odGltZVJhbmdlRGF0YSkge1xuICAgICAgICBpZiAodGltZVJhbmdlRGF0YSAmJiB0aW1lUmFuZ2VEYXRhLnRpbWVfcmFuZ2UpIHtcbiAgICAgICAgICAgIC8vIFRpbWUtYmFzZWQgbW9kZVxuICAgICAgICAgICAgdGhpcy50aW1lU2xpZGVyRW5hYmxlZCA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRUaW1lUmFuZ2UgPSB0aW1lUmFuZ2VEYXRhLnRpbWVfcmFuZ2U7XG5cbiAgICAgICAgICAgIC8vIFNob3cgcGVyaW9kIGJ1dHRvbnMgZm9yIHRpbWUtYmFzZWQgbmF2aWdhdGlvblxuICAgICAgICAgICAgJCgnI3BlcmlvZC1idXR0b25zJykuc2hvdygpO1xuXG4gICAgICAgICAgICAvLyBTZXQgc2VydmVyIHRpbWV6b25lIG9mZnNldFxuICAgICAgICAgICAgaWYgKHRpbWVSYW5nZURhdGEuc2VydmVyX3RpbWV6b25lX29mZnNldCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgU1ZHVGltZWxpbmUuc2VydmVyVGltZXpvbmVPZmZzZXQgPSB0aW1lUmFuZ2VEYXRhLnNlcnZlcl90aW1lem9uZV9vZmZzZXQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgU1ZHIHRpbWVsaW5lIHdpdGggdGltZSByYW5nZVxuICAgICAgICAgICAgU1ZHVGltZWxpbmUuaW5pdGlhbGl6ZSgnI3RpbWUtc2xpZGVyLWNvbnRhaW5lcicsIHRoaXMuY3VycmVudFRpbWVSYW5nZSk7XG5cbiAgICAgICAgICAgIC8vIFNldCBjYWxsYmFjayBmb3IgdGltZSB3aW5kb3cgY2hhbmdlc1xuICAgICAgICAgICAgU1ZHVGltZWxpbmUub25SYW5nZUNoYW5nZSA9IChzdGFydCwgZW5kKSA9PiB7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9hZExvZ0J5VGltZVJhbmdlKHN0YXJ0LCBlbmQpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gTG9hZCBpbml0aWFsIGNodW5rIChsYXN0IGhvdXIgYnkgZGVmYXVsdClcbiAgICAgICAgICAgIGNvbnN0IG9uZUhvdXIgPSAzNjAwO1xuICAgICAgICAgICAgY29uc3QgaW5pdGlhbFN0YXJ0ID0gTWF0aC5tYXgodGhpcy5jdXJyZW50VGltZVJhbmdlLmVuZCAtIG9uZUhvdXIsIHRoaXMuY3VycmVudFRpbWVSYW5nZS5zdGFydCk7XG4gICAgICAgICAgICB0aGlzLmxvYWRMb2dCeVRpbWVSYW5nZShpbml0aWFsU3RhcnQsIHRoaXMuY3VycmVudFRpbWVSYW5nZS5lbmQpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTGluZSBudW1iZXIgZmFsbGJhY2sgbW9kZVxuICAgICAgICAgICAgdGhpcy50aW1lU2xpZGVyRW5hYmxlZCA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VGltZVJhbmdlID0gbnVsbDtcblxuICAgICAgICAgICAgLy8gSGlkZSBwZXJpb2QgYnV0dG9ucyBpbiBsaW5lIG51bWJlciBtb2RlXG4gICAgICAgICAgICAkKCcjcGVyaW9kLWJ1dHRvbnMnKS5oaWRlKCk7XG5cbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgU1ZHIHRpbWVsaW5lIHdpdGggbGluZSBudW1iZXJzXG4gICAgICAgICAgICAvLyBGb3Igbm93LCB1c2UgZGVmYXVsdCByYW5nZSB1bnRpbCB3ZSBnZXQgdG90YWwgbGluZSBjb3VudFxuICAgICAgICAgICAgY29uc3QgbGluZVJhbmdlID0geyBzdGFydDogMCwgZW5kOiAxMDAwMCB9O1xuICAgICAgICAgICAgU1ZHVGltZWxpbmUuaW5pdGlhbGl6ZSgnI3RpbWUtc2xpZGVyLWNvbnRhaW5lcicsIGxpbmVSYW5nZSwgJ2xpbmVzJyk7XG5cbiAgICAgICAgICAgIC8vIFNldCBjYWxsYmFjayBmb3IgbGluZSByYW5nZSBjaGFuZ2VzXG4gICAgICAgICAgICBTVkdUaW1lbGluZS5vblJhbmdlQ2hhbmdlID0gKHN0YXJ0LCBlbmQpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBMb2FkIGJ5IGxpbmUgbnVtYmVycyAob2Zmc2V0L2xpbmVzKVxuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmxvYWRMb2dCeUxpbmVzKE1hdGguZmxvb3Ioc3RhcnQpLCBNYXRoLmNlaWwoZW5kIC0gc3RhcnQpKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIExvYWQgaW5pdGlhbCBsaW5lc1xuICAgICAgICAgICAgdGhpcy51cGRhdGVMb2dGcm9tU2VydmVyKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBsb2cgYnkgbGluZSBudW1iZXJzIChmb3IgZmlsZXMgd2l0aG91dCB0aW1lc3RhbXBzKVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBvZmZzZXQgLSBTdGFydGluZyBsaW5lIG51bWJlclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBsaW5lcyAtIE51bWJlciBvZiBsaW5lcyB0byBsb2FkXG4gICAgICovXG4gICAgbG9hZExvZ0J5TGluZXMob2Zmc2V0LCBsaW5lcykge1xuICAgICAgICAvLyBTaG93IGRpbW1lciBvbmx5IGlmIG5vdCBpbiBhdXRvLXVwZGF0ZSBtb2RlXG4gICAgICAgIGlmICghc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlKSB7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IHtcbiAgICAgICAgICAgIGZpbGVuYW1lOiB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmaWxlbmFtZScpLFxuICAgICAgICAgICAgZmlsdGVyOiB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmaWx0ZXInKSB8fCAnJyxcbiAgICAgICAgICAgIGxvZ0xldmVsOiB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdsb2dMZXZlbCcpIHx8ICcnLFxuICAgICAgICAgICAgb2Zmc2V0OiBNYXRoLm1heCgwLCBvZmZzZXQpLFxuICAgICAgICAgICAgbGluZXM6IE1hdGgubWluKDUwMDAsIE1hdGgubWF4KDEwMCwgbGluZXMpKVxuICAgICAgICB9O1xuXG4gICAgICAgIFN5c2xvZ0FQSS5nZXRMb2dGcm9tRmlsZShwYXJhbXMsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgLy8gSGlkZSBkaW1tZXIgb25seSBpZiBub3QgaW4gYXV0by11cGRhdGUgbW9kZVxuICAgICAgICAgICAgaWYgKCFzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiAnY29udGVudCcgaW4gcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIC8vIFNldCBjb250ZW50IGluIGVkaXRvciAoZXZlbiBpZiBlbXB0eSlcbiAgICAgICAgICAgICAgICB0aGlzLnZpZXdlci5zZXRWYWx1ZShyZXNwb25zZS5kYXRhLmNvbnRlbnQgfHwgJycsIC0xKTtcblxuICAgICAgICAgICAgICAgIC8vIEdvIHRvIHRoZSBiZWdpbm5pbmdcbiAgICAgICAgICAgICAgICB0aGlzLnZpZXdlci5nb3RvTGluZSgxKTtcbiAgICAgICAgICAgICAgICB0aGlzLnZpZXdlci5zY3JvbGxUb0xpbmUoMCwgdHJ1ZSwgdHJ1ZSwgKCkgPT4ge30pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBsb2cgYnkgdGltZSByYW5nZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzdGFydFRpbWVzdGFtcCAtIFN0YXJ0IHRpbWVzdGFtcFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBlbmRUaW1lc3RhbXAgLSBFbmQgdGltZXN0YW1wXG4gICAgICovXG4gICAgYXN5bmMgbG9hZExvZ0J5VGltZVJhbmdlKHN0YXJ0VGltZXN0YW1wLCBlbmRUaW1lc3RhbXApIHtcbiAgICAgICAgLy8gU2hvdyBkaW1tZXIgb25seSBpZiBub3QgaW4gYXV0by11cGRhdGUgbW9kZVxuICAgICAgICBpZiAoIXN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwYXJhbXMgPSB7XG4gICAgICAgICAgICBmaWxlbmFtZTogdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZmlsZW5hbWUnKSxcbiAgICAgICAgICAgIGZpbHRlcjogdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZmlsdGVyJykgfHwgJycsXG4gICAgICAgICAgICBsb2dMZXZlbDogdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnbG9nTGV2ZWwnKSB8fCAnJyxcbiAgICAgICAgICAgIGRhdGVGcm9tOiBzdGFydFRpbWVzdGFtcCxcbiAgICAgICAgICAgIGRhdGVUbzogZW5kVGltZXN0YW1wLFxuICAgICAgICAgICAgbGluZXM6IDUwMDAgLy8gTWF4aW11bSBsaW5lcyB0byBsb2FkXG4gICAgICAgIH07XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIFN5c2xvZ0FQSS5nZXRMb2dGcm9tRmlsZShwYXJhbXMsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiAnY29udGVudCcgaW4gcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTZXQgY29udGVudCBpbiBlZGl0b3IgKGV2ZW4gaWYgZW1wdHkpXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudmlld2VyLnNldFZhbHVlKHJlc3BvbnNlLmRhdGEuY29udGVudCB8fCAnJywgLTEpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEdvIHRvIHRoZSBlbmQgb2YgdGhlIGxvZ1xuICAgICAgICAgICAgICAgICAgICBjb25zdCByb3cgPSB0aGlzLnZpZXdlci5zZXNzaW9uLmdldExlbmd0aCgpIC0gMTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29sdW1uID0gdGhpcy52aWV3ZXIuc2Vzc2lvbi5nZXRMaW5lKHJvdykubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLnZpZXdlci5nb3RvTGluZShyb3cgKyAxLCBjb2x1bW4pO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEFkanVzdCBzbGlkZXIgdG8gYWN0dWFsIGxvYWRlZCB0aW1lIHJhbmdlIChzaWxlbnRseSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEuYWN0dWFsX3JhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhY3R1YWwgPSByZXNwb25zZS5kYXRhLmFjdHVhbF9yYW5nZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gT25seSBzeW5jIHNlbGVjdGVkUmFuZ2UgaWYgYmFja2VuZCByZXR1cm5lZCBtZWFuaW5nZnVsIGRhdGFcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIERvbid0IHN5bmMgaWYgYmFja2VuZCByZXR1cm5lZCB2ZXJ5IHNob3J0IHJhbmdlICg8IDEwJSBvZiByZXF1ZXN0ZWQpXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBiZWNhdXNlIGl0IG1lYW5zIHRoZXJlJ3MganVzdCBsaXR0bGUgZGF0YSBpbiB0aGUgbG9nLCBub3QgYSA1MDAwLWxpbmUgdHJ1bmNhdGlvblxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVxdWVzdGVkRHVyYXRpb24gPSBlbmRUaW1lc3RhbXAgLSBzdGFydFRpbWVzdGFtcDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGFjdHVhbER1cmF0aW9uID0gYWN0dWFsLmVuZCAtIGFjdHVhbC5zdGFydDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGR1cmF0aW9uUmF0aW8gPSBhY3R1YWxEdXJhdGlvbiAvIHJlcXVlc3RlZER1cmF0aW9uO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZHVyYXRpb25SYXRpbyA+PSAwLjEgfHwgYWN0dWFsLnRydW5jYXRlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEJhY2tlbmQgcmV0dXJuZWQgc3Vic3RhbnRpYWwgZGF0YSBPUiBleHBsaWNpdGx5IHRydW5jYXRlZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBTVkdUaW1lbGluZSBzZWxlY3RlZCByYW5nZSB0byBtYXRjaCBhY3R1YWwgbG9hZGVkIGRhdGFcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBTVkdUaW1lbGluZS51cGRhdGVTZWxlY3RlZFJhbmdlKGFjdHVhbC5zdGFydCwgYWN0dWFsLmVuZCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBMb2cgZm9yIGRlYnVnZ2luZyBvbmx5XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdHVhbC50cnVuY2F0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBgTG9nIGRhdGEgbGltaXRlZCB0byAke2FjdHVhbC5saW5lc19jb3VudH0gbGluZXMuIGAgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYFNob3dpbmcgdGltZSByYW5nZTogWyR7YWN0dWFsLnN0YXJ0fSAtICR7YWN0dWFsLmVuZH1dYFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQmFja2VuZCByZXR1cm5lZCB2ZXJ5IHNob3J0IHJhbmdlIC0ga2VlcCB1c2VyJ3Mgc2VsZWN0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5kZWJ1Zygn4pqg77iPIEJhY2tlbmQgcmV0dXJuZWQgc2hvcnQgcmFuZ2UgKCcgKyBhY3R1YWxEdXJhdGlvbiArICdzIC8gJyArIHJlcXVlc3RlZER1cmF0aW9uICsgJ3MgPSAnICsgKGR1cmF0aW9uUmF0aW8gKiAxMDApLnRvRml4ZWQoMSkgKyAnJSksIGtlZXBpbmcgdXNlciBzZWxlY3Rpb24nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEhpZGUgZGltbWVyIG9ubHkgaWYgbm90IGluIGF1dG8tdXBkYXRlIG1vZGVcbiAgICAgICAgICAgICAgICBpZiAoIXN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGxvYWRpbmcgbG9nIGJ5IHRpbWUgcmFuZ2U6JywgZXJyb3IpO1xuICAgICAgICAgICAgLy8gSGlkZSBkaW1tZXIgb25seSBpZiBub3QgaW4gYXV0by11cGRhdGUgbW9kZVxuICAgICAgICAgICAgaWYgKCFzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBcHBseSBxdWljayBwZXJpb2Qgc2VsZWN0aW9uIChZYW5kZXggQ2xvdWQgTG9nVmlld2VyIHN0eWxlKVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBwZXJpb2RTZWNvbmRzIC0gUGVyaW9kIGluIHNlY29uZHNcbiAgICAgKi9cbiAgICBhcHBseVF1aWNrUGVyaW9kKHBlcmlvZFNlY29uZHMpIHtcbiAgICAgICAgaWYgKCF0aGlzLmN1cnJlbnRUaW1lUmFuZ2UpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVzZSBuZXcgYXBwbHlQZXJpb2QgbWV0aG9kIHRoYXQgaGFuZGxlcyB2aXNpYmxlIHJhbmdlIGFuZCBhdXRvLWNlbnRlcmluZ1xuICAgICAgICBTVkdUaW1lbGluZS5hcHBseVBlcmlvZChwZXJpb2RTZWNvbmRzKTtcbiAgICAgICAgLy8gQ2FsbGJhY2sgd2lsbCBiZSB0cmlnZ2VyZWQgYXV0b21hdGljYWxseSBieSBTVkdUaW1lbGluZVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBcHBseSBsb2cgbGV2ZWwgZmlsdGVyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGxldmVsIC0gTG9nIGxldmVsIChhbGwsIGVycm9yLCB3YXJuaW5nLCBpbmZvLCBkZWJ1ZylcbiAgICAgKi9cbiAgICBhcHBseUxvZ0xldmVsRmlsdGVyKGxldmVsKSB7XG4gICAgICAgIGxldCBmaWx0ZXJQYXR0ZXJuID0gJyc7XG5cbiAgICAgICAgLy8gQ3JlYXRlIHJlZ2V4IHBhdHRlcm4gYmFzZWQgb24gbGV2ZWxcbiAgICAgICAgc3dpdGNoIChsZXZlbCkge1xuICAgICAgICAgICAgY2FzZSAnZXJyb3InOlxuICAgICAgICAgICAgICAgIGZpbHRlclBhdHRlcm4gPSAnRVJST1J8Q1JJVElDQUx8RkFUQUwnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnd2FybmluZyc6XG4gICAgICAgICAgICAgICAgZmlsdGVyUGF0dGVybiA9ICdXQVJOSU5HfFdBUk4nO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnaW5mbyc6XG4gICAgICAgICAgICAgICAgZmlsdGVyUGF0dGVybiA9ICdJTkZPJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2RlYnVnJzpcbiAgICAgICAgICAgICAgICBmaWx0ZXJQYXR0ZXJuID0gJ0RFQlVHJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2FsbCc6XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGZpbHRlclBhdHRlcm4gPSAnJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBmaWx0ZXIgZmllbGRcbiAgICAgICAgdGhpcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZmlsdGVyJywgZmlsdGVyUGF0dGVybik7XG5cbiAgICAgICAgLy8gUmVsb2FkIGxvZ3Mgd2l0aCBuZXcgZmlsdGVyXG4gICAgICAgIHRoaXMudXBkYXRlTG9nRnJvbVNlcnZlcigpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGZXRjaGVzIHRoZSBsb2cgZmlsZSBjb250ZW50IGZyb20gdGhlIHNlcnZlci5cbiAgICAgKi9cbiAgICB1cGRhdGVMb2dGcm9tU2VydmVyKCkge1xuICAgICAgICBpZiAodGhpcy50aW1lU2xpZGVyRW5hYmxlZCkge1xuICAgICAgICAgICAgLy8gSW4gdGltZSBzbGlkZXIgbW9kZSwgcmVsb2FkIGN1cnJlbnQgd2luZG93XG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50VGltZVJhbmdlKSB7XG4gICAgICAgICAgICAgICAgLy8gSW4gdGltZSBzbGlkZXIgbW9kZSwgcmVsb2FkIGxhc3QgaG91clxuICAgICAgICAgICAgICAgIGNvbnN0IG9uZUhvdXIgPSAzNjAwO1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXJ0VGltZXN0YW1wID0gTWF0aC5tYXgodGhpcy5jdXJyZW50VGltZVJhbmdlLmVuZCAtIG9uZUhvdXIsIHRoaXMuY3VycmVudFRpbWVSYW5nZS5zdGFydCk7XG4gICAgICAgICAgICAgICAgdGhpcy5sb2FkTG9nQnlUaW1lUmFuZ2UoXG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0VGltZXN0YW1wLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRUaW1lUmFuZ2UuZW5kXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIExpbmUgbnVtYmVyIG1vZGVcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgICAgIHBhcmFtcy5saW5lcyA9IDUwMDA7IC8vIE1heCBsaW5lc1xuICAgICAgICAgICAgU3lzbG9nQVBJLmdldExvZ0Zyb21GaWxlKHBhcmFtcywgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY2JVcGRhdGVMb2dUZXh0KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSBsb2cgdmlldy5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSBBUEkuXG4gICAgICovXG4gICAgY2JVcGRhdGVMb2dUZXh0KHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIEhpZGUgZGltbWVyIG9ubHkgaWYgbm90IGluIGF1dG8tdXBkYXRlIG1vZGVcbiAgICAgICAgaWYgKCFzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUpIHtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSGFuZGxlIHYzIEFQSSByZXNwb25zZSBzdHJ1Y3R1cmVcbiAgICAgICAgaWYgKCFyZXNwb25zZSB8fCAhcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UubWVzc2FnZXMpIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY29udGVudCA9IHJlc3BvbnNlLmRhdGE/LmNvbnRlbnQgfHwgJyc7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlci5nZXRTZXNzaW9uKCkuc2V0VmFsdWUoY29udGVudCk7XG4gICAgICAgIGNvbnN0IHJvdyA9IHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlci5zZXNzaW9uLmdldExlbmd0aCgpIC0gMTtcbiAgICAgICAgY29uc3QgY29sdW1uID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnNlc3Npb24uZ2V0TGluZShyb3cpLmxlbmd0aDtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLmdvdG9MaW5lKHJvdyArIDEsIGNvbHVtbik7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGNsaWNraW5nIHRoZSBcIkRvd25sb2FkIEZpbGVcIiBidXR0b24uXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGRhdGEuXG4gICAgICovXG4gICAgY2JEb3dubG9hZEZpbGUocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gSGFuZGxlIHYzIEFQSSByZXNwb25zZSBzdHJ1Y3R1cmVcbiAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSByZXNwb25zZS5kYXRhLmZpbGVuYW1lIHx8IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UubWVzc2FnZXMpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgY2xpY2tpbmcgdGhlIFwiRXJhc2UgRmlsZVwiIGJ1dHRvbi5cbiAgICAgKi9cbiAgICBlcmFzZUN1cnJlbnRGaWxlQ29udGVudCgpe1xuICAgICAgICBjb25zdCBmaWxlTmFtZSA9IHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmaWxlbmFtZScpO1xuICAgICAgICBpZiAoZmlsZU5hbWUubGVuZ3RoPjApe1xuICAgICAgICAgICAgU3lzbG9nQVBJLmVyYXNlRmlsZShmaWxlTmFtZSwgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY2JBZnRlckZpbGVFcmFzZWQpXG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgY2xpY2tpbmcgdGhlIFwiRXJhc2UgRmlsZVwiIGJ1dHRvbiBhbmQgY2FsbGluZyBSRVNUIEFQSSBjb21tYW5kXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGRhdGEuXG4gICAgICovXG4gICAgY2JBZnRlckZpbGVFcmFzZWQocmVzcG9uc2Upe1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0PT09ZmFsc2UgJiYgcmVzcG9uc2UubWVzc2FnZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKTtcbiAgICAgICAgfVxuICAgIH0sXG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgc2hvdyBzeXN0ZW0gbG9ncyB0YWJcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pbml0aWFsaXplKCk7XG59KTsiXX0=