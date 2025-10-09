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

    window.location.hash = 'file=' + encodeURIComponent(value); // Check if time range is available for this file

    systemDiagnosticLogs.checkTimeRangeAvailability(value);
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
        console.log('Time mode - Server timezone offset:', timeRangeData.server_timezone_offset, 'seconds');
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
            var actual = response.data.actual_range; // Update SVGTimeline selected range to match actual loaded data
            // This updates the slider to show the real time range that was loaded

            SVGTimeline.updateSelectedRange(actual.start, actual.end); // Log for debugging only

            if (actual.truncated) {
              console.log("Log data limited to ".concat(actual.lines_count, " lines. ") + "Showing time range: [".concat(actual.start, " - ").concat(actual.end, "]"));
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
   * Apply quick period selection
   * @param {string|number} period - Period identifier or seconds
   */
  applyQuickPeriod: function applyQuickPeriod(period) {
    if (!this.currentTimeRange) {
      return;
    }

    var start;
    var end = this.currentTimeRange.end;

    if (period === 'today') {
      // Today from 00:00
      var now = new Date(end * 1000);
      var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      start = Math.floor(todayStart.getTime() / 1000);
    } else {
      // Period in seconds
      var seconds = parseInt(period);
      start = Math.max(end - seconds, this.currentTimeRange.start);
    } // Update SVG timeline


    SVGTimeline.setRange(start, end);
    this.loadLogByTimeRange(start, end);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TeXN0ZW1EaWFnbm9zdGljL3N5c3RlbS1kaWFnbm9zdGljLWluZGV4LXNob3dsb2dzLmpzIl0sIm5hbWVzIjpbInN5c3RlbURpYWdub3N0aWNMb2dzIiwiJHNob3dCdG4iLCIkIiwiJGRvd25sb2FkQnRuIiwiJHNob3dBdXRvQnRuIiwiJGVyYXNlQnRuIiwiJGxvZ0NvbnRlbnQiLCJ2aWV3ZXIiLCIkZmlsZVNlbGVjdERyb3BEb3duIiwibG9nc0l0ZW1zIiwiJGRpbW1lciIsIiRmb3JtT2JqIiwiaXNJbml0aWFsaXppbmciLCJ0aW1lU2xpZGVyRW5hYmxlZCIsImN1cnJlbnRUaW1lUmFuZ2UiLCJpc0F1dG9VcGRhdGVBY3RpdmUiLCJpbml0aWFsaXplIiwiYWNlSGVpZ2h0Iiwid2luZG93IiwiaW5uZXJIZWlnaHQiLCJjbG9zZXN0IiwiY3NzIiwiY3JlYXRlRHJvcGRvd25Gcm9tSGlkZGVuSW5wdXQiLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwiY2JPbkNoYW5nZUZpbGUiLCJpZ25vcmVDYXNlIiwiZnVsbFRleHRTZWFyY2giLCJmb3JjZVNlbGVjdGlvbiIsInByZXNlcnZlSFRNTCIsImFsbG93Q2F0ZWdvcnlTZWxlY3Rpb24iLCJtYXRjaCIsImZpbHRlclJlbW90ZURhdGEiLCJhY3Rpb24iLCJ0ZW1wbGF0ZXMiLCJtZW51IiwiY3VzdG9tRHJvcGRvd25NZW51IiwiaW5pdGlhbGl6ZUFjZSIsIlN5c2xvZ0FQSSIsImdldExvZ3NMaXN0IiwiY2JGb3JtYXREcm9wZG93blJlc3VsdHMiLCJpbml0aWFsaXplTG9nTGV2ZWxEcm9wZG93biIsImRvY3VtZW50Iiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCIkYnRuIiwiY3VycmVudFRhcmdldCIsInBlcmlvZCIsImRhdGEiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiYXBwbHlRdWlja1BlcmlvZCIsImVuZCIsIm9uZUhvdXIiLCJzdGFydCIsIk1hdGgiLCJtYXgiLCJTVkdUaW1lbGluZSIsInNldFJhbmdlIiwibG9hZExvZ0J5VGltZVJhbmdlIiwibGV2ZWwiLCJhcHBseUxvZ0xldmVsRmlsdGVyIiwidXBkYXRlTG9nRnJvbVNlcnZlciIsImhhbmRsZUhhc2hDaGFuZ2UiLCJmb3JtIiwiZG93bmxvYWRMb2dGaWxlIiwiZmlsZW5hbWUiLCJjYkRvd25sb2FkRmlsZSIsIiRidXR0b24iLCIkcmVsb2FkSWNvbiIsImZpbmQiLCJoYXNDbGFzcyIsInVwZGF0ZUxvZ1ZpZXdXb3JrZXIiLCJzdG9wIiwiZXJhc2VDdXJyZW50RmlsZUNvbnRlbnQiLCJrZXl1cCIsImV2ZW50Iiwia2V5Q29kZSIsInRvZ2dsZUZ1bGxTY3JlZW4iLCJhZGRFdmVudExpc3RlbmVyIiwiYWRqdXN0TG9nSGVpZ2h0IiwibG9nQ29udGFpbmVyIiwiZ2V0RWxlbWVudEJ5SWQiLCJmdWxsc2NyZWVuRWxlbWVudCIsInJlcXVlc3RGdWxsc2NyZWVuIiwiZXJyIiwiY29uc29sZSIsImVycm9yIiwibWVzc2FnZSIsImV4aXRGdWxsc2NyZWVuIiwic2V0VGltZW91dCIsIm9mZnNldCIsInRvcCIsInJlc2l6ZSIsIiRoaWRkZW5JbnB1dCIsImxlbmd0aCIsIiRkcm9wZG93biIsImlkIiwiJHRleHQiLCJ0ZXh0IiwiZ2xvYmFsVHJhbnNsYXRlIiwic2RfQWxsTGV2ZWxzIiwiJGljb24iLCIkbWVudSIsIml0ZW1zIiwidmFsdWUiLCJpY29uIiwic2RfRXJyb3IiLCJzZF9XYXJuaW5nIiwic2RfTm90aWNlIiwic2RfSW5mbyIsInNkX0RlYnVnIiwiZm9yRWFjaCIsIml0ZW0iLCIkaXRlbSIsImh0bWwiLCJhcHBlbmQiLCJhZnRlciIsInZhbCIsInRyaWdnZXIiLCJiZWZvcmUiLCJoaWRlIiwiYWNlIiwiZWRpdCIsImp1bGlhIiwicmVxdWlyZSIsInVuZGVmaW5lZCIsIkluaU1vZGUiLCJNb2RlIiwic2Vzc2lvbiIsInNldE1vZGUiLCJzZXRUaGVtZSIsInJlbmRlcmVyIiwic2V0U2hvd0d1dHRlciIsInNldE9wdGlvbnMiLCJzaG93TGluZU51bWJlcnMiLCJzaG93UHJpbnRNYXJnaW4iLCJyZWFkT25seSIsImJ1aWxkVHJlZVN0cnVjdHVyZSIsImZpbGVzIiwiZGVmYXVsdFBhdGgiLCJ0cmVlIiwiT2JqZWN0IiwiZW50cmllcyIsImtleSIsImZpbGVEYXRhIiwiZmlsZVBhdGgiLCJwYXRoIiwicGFydHMiLCJzcGxpdCIsImN1cnJlbnQiLCJwYXJ0IiwiaW5kZXgiLCJ0eXBlIiwic2l6ZSIsImNoaWxkcmVuIiwidHJlZVRvRHJvcGRvd25JdGVtcyIsInByZWZpeCIsInNvcnQiLCJhS2V5IiwiYVZhbCIsImJLZXkiLCJiVmFsIiwibG9jYWxlQ29tcGFyZSIsInB1c2giLCJuYW1lIiwiZGlzYWJsZWQiLCJjaGlsZEl0ZW1zIiwic2VsZWN0ZWQiLCJyZXNwb25zZSIsImZpZWxkcyIsInZhbHVlcyIsImVhY2giLCJvcHRpb24iLCJtYXliZURpc2FibGVkIiwiaGFzaCIsImxvY2F0aW9uIiwic3RhcnRzV2l0aCIsImRlY29kZVVSSUNvbXBvbmVudCIsInN1YnN0cmluZyIsImZpbGVFeGlzdHMiLCJzb21lIiwiZ2V0RmlsZUZyb21IYXNoIiwicmVzdWx0IiwiZGVmVmFsIiwiZmlsZU5hbWUiLCJ0cmltIiwiZHJvcGRvd25WYWx1ZXMiLCJtYXAiLCJyZXBsYWNlIiwic2VsZWN0ZWRJdGVtIiwiaXRlbVRvU2VsZWN0IiwiZW5jb2RlVVJJQ29tcG9uZW50IiwiY2hlY2tUaW1lUmFuZ2VBdmFpbGFiaWxpdHkiLCJnZXRMb2dUaW1lUmFuZ2UiLCJ0aW1lX3JhbmdlIiwiaW5pdGlhbGl6ZU5hdmlnYXRpb24iLCJ0aW1lUmFuZ2VEYXRhIiwic2hvdyIsInNlcnZlcl90aW1lem9uZV9vZmZzZXQiLCJzZXJ2ZXJUaW1lem9uZU9mZnNldCIsImxvZyIsIm9uUmFuZ2VDaGFuZ2UiLCJpbml0aWFsU3RhcnQiLCJsaW5lUmFuZ2UiLCJsb2FkTG9nQnlMaW5lcyIsImZsb29yIiwiY2VpbCIsImxpbmVzIiwicGFyYW1zIiwiZmlsdGVyIiwibG9nTGV2ZWwiLCJtaW4iLCJnZXRMb2dGcm9tRmlsZSIsInNldFZhbHVlIiwiY29udGVudCIsImdvdG9MaW5lIiwic2Nyb2xsVG9MaW5lIiwic3RhcnRUaW1lc3RhbXAiLCJlbmRUaW1lc3RhbXAiLCJkYXRlRnJvbSIsImRhdGVUbyIsInJvdyIsImdldExlbmd0aCIsImNvbHVtbiIsImdldExpbmUiLCJhY3R1YWxfcmFuZ2UiLCJhY3R1YWwiLCJ1cGRhdGVTZWxlY3RlZFJhbmdlIiwidHJ1bmNhdGVkIiwibGluZXNfY291bnQiLCJub3ciLCJEYXRlIiwidG9kYXlTdGFydCIsImdldEZ1bGxZZWFyIiwiZ2V0TW9udGgiLCJnZXREYXRlIiwiZ2V0VGltZSIsInNlY29uZHMiLCJwYXJzZUludCIsImZpbHRlclBhdHRlcm4iLCJjYlVwZGF0ZUxvZ1RleHQiLCJtZXNzYWdlcyIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwiZ2V0U2Vzc2lvbiIsImVyYXNlRmlsZSIsImNiQWZ0ZXJGaWxlRXJhc2VkIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxvQkFBb0IsR0FBRztBQUN6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxnQkFBRCxDQUxjOztBQU96QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxZQUFZLEVBQUVELENBQUMsQ0FBQyxnQkFBRCxDQVhVOztBQWF6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxZQUFZLEVBQUVGLENBQUMsQ0FBQyxxQkFBRCxDQWpCVTs7QUFtQnpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lHLEVBQUFBLFNBQVMsRUFBRUgsQ0FBQyxDQUFDLGFBQUQsQ0F2QmE7O0FBeUJ6QjtBQUNK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ckI7QUFDSDtBQUNKO0FBLzdCd0IsQ0FBN0IsQyxDQWs4QkE7O0FBQ0E3RCxDQUFDLENBQUN3QyxRQUFELENBQUQsQ0FBWStNLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnpQLEVBQUFBLG9CQUFvQixDQUFDZ0IsVUFBckI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cbi8qIGdsb2JhbCBhY2UsIFBieEFwaSwgU3lzbG9nQVBJLCB1cGRhdGVMb2dWaWV3V29ya2VyLCBBY2UsIFVzZXJNZXNzYWdlLCBTVkdUaW1lbGluZSAqL1xuXG4vKipcbiAqIFJlcHJlc2VudHMgdGhlIHN5c3RlbSBkaWFnbm9zdGljIGxvZ3Mgb2JqZWN0LlxuICpcbiAqIEBtb2R1bGUgc3lzdGVtRGlhZ25vc3RpY0xvZ3NcbiAqL1xuY29uc3Qgc3lzdGVtRGlhZ25vc3RpY0xvZ3MgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIFwiU2hvdyBMYXN0IExvZ1wiIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzaG93QnRuOiAkKCcjc2hvdy1sYXN0LWxvZycpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIFwiRG93bmxvYWQgRmlsZVwiIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkb3dubG9hZEJ0bjogJCgnI2Rvd25sb2FkLWZpbGUnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBcIlNob3cgTGFzdCBMb2cgKEF1dG8pXCIgYnV0dG9uLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNob3dBdXRvQnRuOiAkKCcjc2hvdy1sYXN0LWxvZy1hdXRvJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgXCJFcmFzZSBjdXJyZW50IGZpbGUgY29udGVudFwiIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRlcmFzZUJ0bjogJCgnI2VyYXNlLWZpbGUnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBsb2cgY29udGVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRsb2dDb250ZW50OiAkKCcjbG9nLWNvbnRlbnQtcmVhZG9ubHknKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSB2aWV3ZXIgZm9yIGRpc3BsYXlpbmcgdGhlIGxvZyBjb250ZW50LlxuICAgICAqIEB0eXBlIHtBY2V9XG4gICAgICovXG4gICAgdmlld2VyOiAnJyxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmaWxlIHNlbGVjdCBkcm9wZG93bi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmaWxlU2VsZWN0RHJvcERvd246IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBBcnJheSBvZiBsb2cgaXRlbXMuXG4gICAgICogQHR5cGUge0FycmF5fVxuICAgICAqL1xuICAgIGxvZ3NJdGVtczogW10sXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZGltbWVyLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRpbW1lcjogJCgnI2dldC1sb2dzLWRpbW1lcicpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI3N5c3RlbS1kaWFnbm9zdGljLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIEZsYWcgdG8gcHJldmVudCBkdXBsaWNhdGUgQVBJIGNhbGxzIGR1cmluZyBpbml0aWFsaXphdGlvblxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGlzSW5pdGlhbGl6aW5nOiB0cnVlLFxuXG4gICAgLyoqXG4gICAgICogRmxhZyBpbmRpY2F0aW5nIGlmIHRpbWUgc2xpZGVyIG1vZGUgaXMgZW5hYmxlZFxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIHRpbWVTbGlkZXJFbmFibGVkOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIEN1cnJlbnQgdGltZSByYW5nZSBmb3IgdGhlIHNlbGVjdGVkIGxvZyBmaWxlXG4gICAgICogQHR5cGUge29iamVjdHxudWxsfVxuICAgICAqL1xuICAgIGN1cnJlbnRUaW1lUmFuZ2U6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBGbGFnIGluZGljYXRpbmcgaWYgYXV0by11cGRhdGUgbW9kZSBpcyBhY3RpdmVcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBpc0F1dG9VcGRhdGVBY3RpdmU6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIHN5c3RlbSBkaWFnbm9zdGljIGxvZ3MuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgY29uc3QgYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gMjUwO1xuXG4gICAgICAgIC8vIFNldCB0aGUgbWluaW11bSBoZWlnaHQgb2YgdGhlIGxvZyBjb250YWluZXJcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5jbG9zZXN0KCdkaXYnKS5jc3MoJ21pbi1oZWlnaHQnLCBgJHthY2VIZWlnaHR9cHhgKTtcblxuICAgICAgICAvLyBDcmVhdGUgZHJvcGRvd24gVUkgZnJvbSBoaWRkZW4gaW5wdXQgKFY1LjAgcGF0dGVybilcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY3JlYXRlRHJvcGRvd25Gcm9tSGlkZGVuSW5wdXQoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBkcm9wZG93biBtZW51IGZvciBsb2cgZmlsZXMgd2l0aCB0cmVlIHN1cHBvcnRcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTZW1hbnRpYyBVSSBkcm9wZG93biB3aXRoIGN1c3RvbSBtZW51IGdlbmVyYXRpb25cbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6IHN5c3RlbURpYWdub3N0aWNMb2dzLmNiT25DaGFuZ2VGaWxlLFxuICAgICAgICAgICAgICAgIGlnbm9yZUNhc2U6IHRydWUsXG4gICAgICAgICAgICAgICAgZnVsbFRleHRTZWFyY2g6IHRydWUsXG4gICAgICAgICAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgICAgIHByZXNlcnZlSFRNTDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBhbGxvd0NhdGVnb3J5U2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBtYXRjaDogJ3RleHQnLFxuICAgICAgICAgICAgICAgIGZpbHRlclJlbW90ZURhdGE6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGFjdGlvbjogJ2FjdGl2YXRlJyxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgbWVudTogc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY3VzdG9tRHJvcGRvd25NZW51XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBBQ0UgZWRpdG9yIGZvciBsb2cgY29udGVudFxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pbml0aWFsaXplQWNlKCk7XG5cbiAgICAgICAgLy8gRmV0Y2ggdGhlIGxpc3Qgb2YgbG9nIGZpbGVzXG4gICAgICAgIFN5c2xvZ0FQSS5nZXRMb2dzTGlzdChzeXN0ZW1EaWFnbm9zdGljTG9ncy5jYkZvcm1hdERyb3Bkb3duUmVzdWx0cyk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBsb2cgbGV2ZWwgZHJvcGRvd24gLSBWNS4wIHBhdHRlcm4gd2l0aCBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmluaXRpYWxpemVMb2dMZXZlbERyb3Bkb3duKCk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIHF1aWNrIHBlcmlvZCBidXR0b25zXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcucGVyaW9kLWJ0bicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkYnRuID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICAgICAgY29uc3QgcGVyaW9kID0gJGJ0bi5kYXRhKCdwZXJpb2QnKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIGFjdGl2ZSBzdGF0ZVxuICAgICAgICAgICAgJCgnLnBlcmlvZC1idG4nKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAkYnRuLmFkZENsYXNzKCdhY3RpdmUnKTtcblxuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuYXBwbHlRdWlja1BlcmlvZChwZXJpb2QpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgXCJOb3dcIiBidXR0b25cbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJy5ub3ctYnRuJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGlmIChzeXN0ZW1EaWFnbm9zdGljTG9ncy5jdXJyZW50VGltZVJhbmdlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZW5kID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY3VycmVudFRpbWVSYW5nZS5lbmQ7XG4gICAgICAgICAgICAgICAgY29uc3Qgb25lSG91ciA9IDM2MDA7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhcnQgPSBNYXRoLm1heChlbmQgLSBvbmVIb3VyLCBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jdXJyZW50VGltZVJhbmdlLnN0YXJ0KTtcbiAgICAgICAgICAgICAgICBTVkdUaW1lbGluZS5zZXRSYW5nZShzdGFydCwgZW5kKTtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2FkTG9nQnlUaW1lUmFuZ2Uoc3RhcnQsIGVuZCk7XG4gICAgICAgICAgICAgICAgJCgnLnBlcmlvZC1idG4nKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgJCgnLnBlcmlvZC1idG5bZGF0YS1wZXJpb2Q9XCIzNjAwXCJdJykuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgbG9nIGxldmVsIGZpbHRlciBidXR0b25zXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcubGV2ZWwtYnRuJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0ICRidG4gPSAkKGUuY3VycmVudFRhcmdldCk7XG4gICAgICAgICAgICBjb25zdCBsZXZlbCA9ICRidG4uZGF0YSgnbGV2ZWwnKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIGFjdGl2ZSBzdGF0ZVxuICAgICAgICAgICAgJCgnLmxldmVsLWJ0bicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgICRidG4uYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuXG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5hcHBseUxvZ0xldmVsRmlsdGVyKGxldmVsKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIFwiU2hvdyBMb2dcIiBidXR0b24gY2xpY2sgKGRlbGVnYXRlZClcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJyNzaG93LWxhc3QtbG9nJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gTGlzdGVuIGZvciBoYXNoIGNoYW5nZXMgdG8gdXBkYXRlIHNlbGVjdGVkIGZpbGVcbiAgICAgICAgJCh3aW5kb3cpLm9uKCdoYXNoY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaGFuZGxlSGFzaENoYW5nZSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgXCJEb3dubG9hZCBMb2dcIiBidXR0b24gY2xpY2sgKGRlbGVnYXRlZClcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJyNkb3dubG9hZC1maWxlJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgICAgICBTeXNsb2dBUEkuZG93bmxvYWRMb2dGaWxlKGRhdGEuZmlsZW5hbWUsIHRydWUsIHN5c3RlbURpYWdub3N0aWNMb2dzLmNiRG93bmxvYWRGaWxlKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIFwiQXV0byBSZWZyZXNoXCIgYnV0dG9uIGNsaWNrIChkZWxlZ2F0ZWQpXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcjc2hvdy1sYXN0LWxvZy1hdXRvJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0ICRidXR0b24gPSAkKCcjc2hvdy1sYXN0LWxvZy1hdXRvJyk7XG4gICAgICAgICAgICBjb25zdCAkcmVsb2FkSWNvbiA9ICRidXR0b24uZmluZCgnLmljb25zIGkucmVmcmVzaCcpO1xuICAgICAgICAgICAgaWYgKCRyZWxvYWRJY29uLmhhc0NsYXNzKCdsb2FkaW5nJykpIHtcbiAgICAgICAgICAgICAgICAkcmVsb2FkSWNvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHVwZGF0ZUxvZ1ZpZXdXb3JrZXIuc3RvcCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkcmVsb2FkSWNvbi5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgdXBkYXRlTG9nVmlld1dvcmtlci5pbml0aWFsaXplKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciB0aGUgXCJFcmFzZSBmaWxlXCIgYnV0dG9uIGNsaWNrIChkZWxlZ2F0ZWQpXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcjZXJhc2UtZmlsZScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5lcmFzZUN1cnJlbnRGaWxlQ29udGVudCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgRW50ZXIga2V5cHJlc3Mgb24gaW5wdXQgZmllbGRzXG4gICAgICAgICQoJ2lucHV0Jykua2V5dXAoKGV2ZW50KSA9PiB7XG4gICAgICAgICAgICBpZiAoZXZlbnQua2V5Q29kZSA9PT0gMTMpIHtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy51cGRhdGVMb2dGcm9tU2VydmVyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciBGdWxsc2NyZWVuIGJ1dHRvbiBjbGlja1xuICAgICAgICAkKCcuZnVsbHNjcmVlbi10b2dnbGUtYnRuJykub24oJ2NsaWNrJywgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudG9nZ2xlRnVsbFNjcmVlbik7XG5cbiAgICAgICAgLy8gTGlzdGVuaW5nIGZvciB0aGUgZnVsbHNjcmVlbiBjaGFuZ2UgZXZlbnRcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignZnVsbHNjcmVlbmNoYW5nZScsIHN5c3RlbURpYWdub3N0aWNMb2dzLmFkanVzdExvZ0hlaWdodCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbCBoZWlnaHQgY2FsY3VsYXRpb25cbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuYWRqdXN0TG9nSGVpZ2h0KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZXMgdGhlIGZ1bGwtc2NyZWVuIG1vZGUgb2YgdGhlICdzeXN0ZW0tbG9ncy1zZWdtZW50JyBlbGVtZW50LlxuICAgICAqIElmIHRoZSBlbGVtZW50IGlzIG5vdCBpbiBmdWxsLXNjcmVlbiBtb2RlLCBpdCByZXF1ZXN0cyBmdWxsLXNjcmVlbiBtb2RlLlxuICAgICAqIElmIHRoZSBlbGVtZW50IGlzIGFscmVhZHkgaW4gZnVsbC1zY3JlZW4gbW9kZSwgaXQgZXhpdHMgZnVsbC1zY3JlZW4gbW9kZS5cbiAgICAgKiBMb2dzIGFuIGVycm9yIG1lc3NhZ2UgdG8gdGhlIGNvbnNvbGUgaWYgdGhlcmUgaXMgYW4gaXNzdWUgZW5hYmxpbmcgZnVsbC1zY3JlZW4gbW9kZS5cbiAgICAgKlxuICAgICAqIEByZXR1cm4ge3ZvaWR9XG4gICAgICovXG4gICAgdG9nZ2xlRnVsbFNjcmVlbigpIHtcbiAgICAgICAgY29uc3QgbG9nQ29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3N5c3RlbS1sb2dzLXNlZ21lbnQnKTtcblxuICAgICAgICBpZiAoIWRvY3VtZW50LmZ1bGxzY3JlZW5FbGVtZW50KSB7XG4gICAgICAgICAgICBsb2dDb250YWluZXIucmVxdWVzdEZ1bGxzY3JlZW4oKS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgYXR0ZW1wdGluZyB0byBlbmFibGUgZnVsbC1zY3JlZW4gbW9kZTogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZG9jdW1lbnQuZXhpdEZ1bGxzY3JlZW4oKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGdW5jdGlvbiB0byBhZGp1c3QgdGhlIGhlaWdodCBvZiB0aGUgbG9ncyBkZXBlbmRpbmcgb24gdGhlIHNjcmVlbiBtb2RlLlxuICAgICAqL1xuICAgIGFkanVzdExvZ0hlaWdodCgpIHtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBsZXQgYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGxvZ0NvbnRlbnQub2Zmc2V0KCkudG9wIC0gNTU7XG4gICAgICAgICAgICBpZiAoZG9jdW1lbnQuZnVsbHNjcmVlbkVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiBmdWxsc2NyZWVuIG1vZGUgaXMgYWN0aXZlXG4gICAgICAgICAgICAgICAgYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gODA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBSZWNhbGN1bGF0ZSB0aGUgc2l6ZSBvZiB0aGUgQUNFIGVkaXRvclxuICAgICAgICAgICAgJCgnLmxvZy1jb250ZW50LXJlYWRvbmx5JykuY3NzKCdtaW4taGVpZ2h0JywgIGAke2FjZUhlaWdodH1weGApO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnJlc2l6ZSgpO1xuICAgICAgICB9LCAzMDApO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBsb2cgbGV2ZWwgZHJvcGRvd24gLSBWNS4wIHBhdHRlcm4gd2l0aCBIVE1MIGljb25zXG4gICAgICogU3RhdGljIGRyb3Bkb3duIHdpdGggY29sb3JlZCBpY29ucyBhbmQgdHJhbnNsYXRpb25zXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUxvZ0xldmVsRHJvcGRvd24oKSB7XG4gICAgICAgIGNvbnN0ICRoaWRkZW5JbnB1dCA9ICQoJyNsb2dMZXZlbCcpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGRyb3Bkb3duIGFscmVhZHkgZXhpc3RzXG4gICAgICAgIGlmICgkKCcjbG9nTGV2ZWwtZHJvcGRvd24nKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENyZWF0ZSBkcm9wZG93biBIVE1MIHdpdGggY29sb3JlZCBpY29uc1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCc8ZGl2PicsIHtcbiAgICAgICAgICAgIGlkOiAnbG9nTGV2ZWwtZHJvcGRvd24nLFxuICAgICAgICAgICAgY2xhc3M6ICd1aSBzZWxlY3Rpb24gZHJvcGRvd24nXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0ICR0ZXh0ID0gJCgnPGRpdj4nLCB7IGNsYXNzOiAndGV4dCcgfSkudGV4dChnbG9iYWxUcmFuc2xhdGUuc2RfQWxsTGV2ZWxzKTtcbiAgICAgICAgY29uc3QgJGljb24gPSAkKCc8aT4nLCB7IGNsYXNzOiAnZHJvcGRvd24gaWNvbicgfSk7XG4gICAgICAgIGNvbnN0ICRtZW51ID0gJCgnPGRpdj4nLCB7IGNsYXNzOiAnbWVudScgfSk7XG5cbiAgICAgICAgLy8gQnVpbGQgbWVudSBpdGVtcyB3aXRoIGNvbG9yZWQgaWNvbnNcbiAgICAgICAgY29uc3QgaXRlbXMgPSBbXG4gICAgICAgICAgICB7IHZhbHVlOiAnJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnNkX0FsbExldmVscywgaWNvbjogJycgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdFUlJPUicsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5zZF9FcnJvciwgaWNvbjogJzxpIGNsYXNzPVwiZXhjbGFtYXRpb24gY2lyY2xlIHJlZCBpY29uXCI+PC9pPicgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdXQVJOSU5HJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnNkX1dhcm5pbmcsIGljb246ICc8aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIG9yYW5nZSBpY29uXCI+PC9pPicgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdOT1RJQ0UnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc2RfTm90aWNlLCBpY29uOiAnPGkgY2xhc3M9XCJpbmZvIGNpcmNsZSBibHVlIGljb25cIj48L2k+JyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ0lORk8nLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc2RfSW5mbywgaWNvbjogJzxpIGNsYXNzPVwiY2lyY2xlIGdyZXkgaWNvblwiPjwvaT4nIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAnREVCVUcnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc2RfRGVidWcsIGljb246ICc8aSBjbGFzcz1cImJ1ZyBwdXJwbGUgaWNvblwiPjwvaT4nIH1cbiAgICAgICAgXTtcblxuICAgICAgICBpdGVtcy5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICAgICAgY29uc3QgJGl0ZW0gPSAkKCc8ZGl2PicsIHtcbiAgICAgICAgICAgICAgICBjbGFzczogJ2l0ZW0nLFxuICAgICAgICAgICAgICAgICdkYXRhLXZhbHVlJzogaXRlbS52YWx1ZVxuICAgICAgICAgICAgfSkuaHRtbChpdGVtLmljb24gKyBpdGVtLnRleHQpO1xuICAgICAgICAgICAgJG1lbnUuYXBwZW5kKCRpdGVtKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJGRyb3Bkb3duLmFwcGVuZCgkdGV4dCwgJGljb24sICRtZW51KTtcbiAgICAgICAgJGhpZGRlbklucHV0LmFmdGVyKCRkcm9wZG93bik7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTZW1hbnRpYyBVSSBkcm9wZG93blxuICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICRoaWRkZW5JbnB1dC52YWwodmFsdWUpLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgZHJvcGRvd24gVUkgZWxlbWVudCBmcm9tIGhpZGRlbiBpbnB1dCBmaWVsZCAoVjUuMCBwYXR0ZXJuKVxuICAgICAqL1xuICAgIGNyZWF0ZURyb3Bkb3duRnJvbUhpZGRlbklucHV0KCkge1xuICAgICAgICBjb25zdCAkaGlkZGVuSW5wdXQgPSAkKCcjZmlsZW5hbWVzJyk7XG5cbiAgICAgICAgaWYgKCEkaGlkZGVuSW5wdXQubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdIaWRkZW4gaW5wdXQgI2ZpbGVuYW1lcyBub3QgZm91bmQnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJzxkaXY+Jywge1xuICAgICAgICAgICAgaWQ6ICdmaWxlbmFtZXMtZHJvcGRvd24nLFxuICAgICAgICAgICAgY2xhc3M6ICd1aSBzZWxlY3Rpb24gZHJvcGRvd24gZmlsZW5hbWVzLXNlbGVjdCBmbHVpZCdcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJGRyb3Bkb3duLmFwcGVuZChcbiAgICAgICAgICAgICQoJzxpPicsIHsgY2xhc3M6ICdkcm9wZG93biBpY29uJyB9KSxcbiAgICAgICAgICAgICQoJzxkaXY+JywgeyBjbGFzczogJ2RlZmF1bHQgdGV4dCcgfSkudGV4dCgnU2VsZWN0IGxvZyBmaWxlJyksXG4gICAgICAgICAgICAkKCc8ZGl2PicsIHsgY2xhc3M6ICdtZW51JyB9KVxuICAgICAgICApO1xuXG4gICAgICAgICRoaWRkZW5JbnB1dC5iZWZvcmUoJGRyb3Bkb3duKTtcbiAgICAgICAgJGhpZGRlbklucHV0LmhpZGUoKTtcblxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duID0gJGRyb3Bkb3duO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgQUNFIGVkaXRvciBmb3IgbG9nIHZpZXdpbmcuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUFjZSgpIHtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyID0gYWNlLmVkaXQoJ2xvZy1jb250ZW50LXJlYWRvbmx5Jyk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIEp1bGlhIG1vZGUgaXMgYXZhaWxhYmxlXG4gICAgICAgIGNvbnN0IGp1bGlhID0gYWNlLnJlcXVpcmUoJ2FjZS9tb2RlL2p1bGlhJyk7XG4gICAgICAgIGlmIChqdWxpYSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAvLyBTZXQgdGhlIG1vZGUgdG8gSnVsaWEgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICBjb25zdCBJbmlNb2RlID0ganVsaWEuTW9kZTtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlci5zZXNzaW9uLnNldE1vZGUobmV3IEluaU1vZGUoKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgdGhlIHRoZW1lIGFuZCBvcHRpb25zIGZvciB0aGUgQUNFIGVkaXRvclxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIuc2V0VGhlbWUoJ2FjZS90aGVtZS9tb25va2FpJyk7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlci5yZW5kZXJlci5zZXRTaG93R3V0dGVyKGZhbHNlKTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnNldE9wdGlvbnMoe1xuICAgICAgICAgICAgc2hvd0xpbmVOdW1iZXJzOiBmYWxzZSxcbiAgICAgICAgICAgIHNob3dQcmludE1hcmdpbjogZmFsc2UsXG4gICAgICAgICAgICByZWFkT25seTogdHJ1ZSxcbiAgICAgICAgfSk7XG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQnVpbGRzIGEgaGllcmFyY2hpY2FsIHRyZWUgc3RydWN0dXJlIGZyb20gZmxhdCBmaWxlIHBhdGhzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGZpbGVzIC0gVGhlIGZpbGVzIG9iamVjdCBmcm9tIEFQSSByZXNwb25zZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBkZWZhdWx0UGF0aCAtIFRoZSBkZWZhdWx0IHNlbGVjdGVkIGZpbGUgcGF0aFxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gVHJlZSBzdHJ1Y3R1cmUgZm9yIHRoZSBkcm9wZG93blxuICAgICAqL1xuICAgIGJ1aWxkVHJlZVN0cnVjdHVyZShmaWxlcywgZGVmYXVsdFBhdGgpIHtcbiAgICAgICAgY29uc3QgdHJlZSA9IHt9O1xuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgdGhlIHRyZWUgc3RydWN0dXJlXG4gICAgICAgIE9iamVjdC5lbnRyaWVzKGZpbGVzKS5mb3JFYWNoKChba2V5LCBmaWxlRGF0YV0pID0+IHtcbiAgICAgICAgICAgIC8vIFVzZSBmaWxlRGF0YS5wYXRoIGFzIHRoZSBhY3R1YWwgZmlsZSBwYXRoXG4gICAgICAgICAgICBjb25zdCBmaWxlUGF0aCA9IGZpbGVEYXRhLnBhdGggfHwga2V5O1xuICAgICAgICAgICAgY29uc3QgcGFydHMgPSBmaWxlUGF0aC5zcGxpdCgnLycpO1xuICAgICAgICAgICAgbGV0IGN1cnJlbnQgPSB0cmVlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBwYXJ0cy5mb3JFYWNoKChwYXJ0LCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChpbmRleCA9PT0gcGFydHMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBUaGlzIGlzIGEgZmlsZVxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50W3BhcnRdID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ZpbGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogZmlsZVBhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBzaXplOiBmaWxlRGF0YS5zaXplLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogKGRlZmF1bHRQYXRoICYmIGRlZmF1bHRQYXRoID09PSBmaWxlUGF0aCkgfHwgKCFkZWZhdWx0UGF0aCAmJiBmaWxlRGF0YS5kZWZhdWx0KVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgaXMgYSBkaXJlY3RvcnlcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFjdXJyZW50W3BhcnRdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50W3BhcnRdID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdmb2xkZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiB7fVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50ID0gY3VycmVudFtwYXJ0XS5jaGlsZHJlbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDb252ZXJ0IHRyZWUgdG8gZHJvcGRvd24gaXRlbXNcbiAgICAgICAgcmV0dXJuIHRoaXMudHJlZVRvRHJvcGRvd25JdGVtcyh0cmVlLCAnJyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDb252ZXJ0cyB0cmVlIHN0cnVjdHVyZSB0byBkcm9wZG93biBpdGVtcyB3aXRoIHByb3BlciBmb3JtYXR0aW5nXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHRyZWUgLSBUaGUgdHJlZSBzdHJ1Y3R1cmVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcHJlZml4IC0gUHJlZml4IGZvciBpbmRlbnRhdGlvblxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gRm9ybWF0dGVkIGRyb3Bkb3duIGl0ZW1zXG4gICAgICovXG4gICAgdHJlZVRvRHJvcGRvd25JdGVtcyh0cmVlLCBwcmVmaXgpIHtcbiAgICAgICAgY29uc3QgaXRlbXMgPSBbXTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNvcnQgZW50cmllczogZm9sZGVycyBmaXJzdCwgdGhlbiBmaWxlc1xuICAgICAgICBjb25zdCBlbnRyaWVzID0gT2JqZWN0LmVudHJpZXModHJlZSkuc29ydCgoW2FLZXksIGFWYWxdLCBbYktleSwgYlZhbF0pID0+IHtcbiAgICAgICAgICAgIGlmIChhVmFsLnR5cGUgPT09ICdmb2xkZXInICYmIGJWYWwudHlwZSA9PT0gJ2ZpbGUnKSByZXR1cm4gLTE7XG4gICAgICAgICAgICBpZiAoYVZhbC50eXBlID09PSAnZmlsZScgJiYgYlZhbC50eXBlID09PSAnZm9sZGVyJykgcmV0dXJuIDE7XG4gICAgICAgICAgICByZXR1cm4gYUtleS5sb2NhbGVDb21wYXJlKGJLZXkpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGVudHJpZXMuZm9yRWFjaCgoW2tleSwgdmFsdWVdKSA9PiB7XG4gICAgICAgICAgICBpZiAodmFsdWUudHlwZSA9PT0gJ2ZvbGRlcicpIHtcbiAgICAgICAgICAgICAgICAvLyBBZGQgZm9sZGVyIGhlYWRlclxuICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBgJHtwcmVmaXh9PGkgY2xhc3M9XCJmb2xkZXIgaWNvblwiPjwvaT4gJHtrZXl9YCxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICcnLFxuICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ZvbGRlcidcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBZGQgY2hpbGRyZW4gd2l0aCBpbmNyZWFzZWQgaW5kZW50YXRpb25cbiAgICAgICAgICAgICAgICBjb25zdCBjaGlsZEl0ZW1zID0gdGhpcy50cmVlVG9Ecm9wZG93bkl0ZW1zKHZhbHVlLmNoaWxkcmVuLCBwcmVmaXggKyAnJm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7Jyk7XG4gICAgICAgICAgICAgICAgaXRlbXMucHVzaCguLi5jaGlsZEl0ZW1zKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIGZpbGUgaXRlbVxuICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBgJHtwcmVmaXh9PGkgY2xhc3M9XCJmaWxlIG91dGxpbmUgaWNvblwiPjwvaT4gJHtrZXl9ICgke3ZhbHVlLnNpemV9KWAsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZS5wYXRoLFxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZDogdmFsdWUuZGVmYXVsdCxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ZpbGUnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgcmV0dXJuIGl0ZW1zO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBjdXN0b20gZHJvcGRvd24gbWVudSBIVE1MIGZvciBsb2cgZmlsZXNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgY29udGFpbmluZyBkcm9wZG93biBtZW51IG9wdGlvbnNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZmllbGRzIC0gVGhlIGZpZWxkcyBpbiB0aGUgcmVzcG9uc2UgdG8gdXNlIGZvciB0aGUgbWVudSBvcHRpb25zXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIEhUTUwgc3RyaW5nIGZvciB0aGUgY3VzdG9tIGRyb3Bkb3duIG1lbnVcbiAgICAgKi9cbiAgICBjdXN0b21Ecm9wZG93bk1lbnUocmVzcG9uc2UsIGZpZWxkcykge1xuICAgICAgICBjb25zdCB2YWx1ZXMgPSByZXNwb25zZVtmaWVsZHMudmFsdWVzXSB8fCB7fTtcbiAgICAgICAgbGV0IGh0bWwgPSAnJztcbiAgICAgICAgXG4gICAgICAgICQuZWFjaCh2YWx1ZXMsIChpbmRleCwgb3B0aW9uKSA9PiB7XG4gICAgICAgICAgICAvLyBGb3IgdHJlZSBzdHJ1Y3R1cmUgaXRlbXNcbiAgICAgICAgICAgIGlmIChzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXMgJiYgc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zW2luZGV4XSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXNbaW5kZXhdO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGlmIChpdGVtLnR5cGUgPT09ICdmb2xkZXInKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZvbGRlciBpdGVtIC0gZGlzYWJsZWQgYW5kIHdpdGggZm9sZGVyIGljb25cbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImRpc2FibGVkIGl0ZW1cIiBkYXRhLXZhbHVlPVwiXCI+JHtpdGVtLm5hbWV9PC9kaXY+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBGaWxlIGl0ZW0gd2l0aCBwcm9wZXIgdmFsdWVcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0ZWQgPSBpdGVtLnNlbGVjdGVkID8gJ3NlbGVjdGVkIGFjdGl2ZScgOiAnJztcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW0gJHtzZWxlY3RlZH1cIiBkYXRhLXZhbHVlPVwiJHtvcHRpb25bZmllbGRzLnZhbHVlXX1cIj4ke2l0ZW0ubmFtZX08L2Rpdj5gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gcmVndWxhciBpdGVtXG4gICAgICAgICAgICAgICAgY29uc3QgbWF5YmVEaXNhYmxlZCA9IChvcHRpb25bZmllbGRzLmRpc2FibGVkXSkgPyAnZGlzYWJsZWQgJyA6ICcnO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCIke21heWJlRGlzYWJsZWR9aXRlbVwiIGRhdGEtdmFsdWU9XCIke29wdGlvbltmaWVsZHMudmFsdWVdfVwiPiR7b3B0aW9uW2ZpZWxkcy5uYW1lXX08L2Rpdj5gO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIGhhc2ggY2hhbmdlcyB0byB1cGRhdGUgdGhlIHNlbGVjdGVkIGZpbGVcbiAgICAgKi9cbiAgICBoYW5kbGVIYXNoQ2hhbmdlKCkge1xuICAgICAgICAvLyBTa2lwIGR1cmluZyBpbml0aWFsaXphdGlvbiB0byBwcmV2ZW50IGR1cGxpY2F0ZSBBUEkgY2FsbHNcbiAgICAgICAgaWYgKHN5c3RlbURpYWdub3N0aWNMb2dzLmlzSW5pdGlhbGl6aW5nKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBoYXNoID0gd2luZG93LmxvY2F0aW9uLmhhc2g7XG4gICAgICAgIGlmIChoYXNoICYmIGhhc2guc3RhcnRzV2l0aCgnI2ZpbGU9JykpIHtcbiAgICAgICAgICAgIGNvbnN0IGZpbGVQYXRoID0gZGVjb2RlVVJJQ29tcG9uZW50KGhhc2guc3Vic3RyaW5nKDYpKTtcbiAgICAgICAgICAgIGlmIChmaWxlUGF0aCAmJiBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdnZXQgdmFsdWUnKSAhPT0gZmlsZVBhdGgpIHtcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgZmlsZSBleGlzdHMgaW4gZHJvcGRvd24gaXRlbXNcbiAgICAgICAgICAgICAgICBjb25zdCBmaWxlRXhpc3RzID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zLnNvbWUoaXRlbSA9PlxuICAgICAgICAgICAgICAgICAgICBpdGVtLnR5cGUgPT09ICdmaWxlJyAmJiBpdGVtLnZhbHVlID09PSBmaWxlUGF0aFxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgaWYgKGZpbGVFeGlzdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgZmlsZVBhdGgpO1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXQgdGV4dCcsIGZpbGVQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2ZpbGVuYW1lJywgZmlsZVBhdGgpO1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy51cGRhdGVMb2dGcm9tU2VydmVyKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIGZpbGUgcGF0aCBmcm9tIFVSTCBoYXNoIGlmIHByZXNlbnRcbiAgICAgKi9cbiAgICBnZXRGaWxlRnJvbUhhc2goKSB7XG4gICAgICAgIGNvbnN0IGhhc2ggPSB3aW5kb3cubG9jYXRpb24uaGFzaDtcbiAgICAgICAgaWYgKGhhc2ggJiYgaGFzaC5zdGFydHNXaXRoKCcjZmlsZT0nKSkge1xuICAgICAgICAgICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChoYXNoLnN1YnN0cmluZyg2KSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICcnO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBmb3JtYXQgdGhlIGRyb3Bkb3duIG1lbnUgc3RydWN0dXJlIGJhc2VkIG9uIHRoZSByZXNwb25zZS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZGF0YS5cbiAgICAgKi9cbiAgICBjYkZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSkge1xuICAgICAgICAvLyBDaGVjayBpZiByZXNwb25zZSBpcyB2YWxpZFxuICAgICAgICBpZiAoIXJlc3BvbnNlIHx8ICFyZXNwb25zZS5yZXN1bHQgfHwgIXJlc3BvbnNlLmRhdGEgfHwgIXJlc3BvbnNlLmRhdGEuZmlsZXMpIHtcbiAgICAgICAgICAgIC8vIEhpZGUgZGltbWVyIG9ubHkgaWYgbm90IGluIGF1dG8tdXBkYXRlIG1vZGVcbiAgICAgICAgICAgIGlmICghc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBmaWxlcyA9IHJlc3BvbnNlLmRhdGEuZmlsZXM7XG5cbiAgICAgICAgLy8gQ2hlY2sgZm9yIGZpbGUgZnJvbSBoYXNoIGZpcnN0XG4gICAgICAgIGxldCBkZWZWYWwgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5nZXRGaWxlRnJvbUhhc2goKTtcblxuICAgICAgICAvLyBJZiBubyBoYXNoIHZhbHVlLCBjaGVjayBpZiB0aGVyZSBpcyBhIGRlZmF1bHQgdmFsdWUgc2V0IGZvciB0aGUgZmlsZW5hbWUgaW5wdXQgZmllbGRcbiAgICAgICAgaWYgKCFkZWZWYWwpIHtcbiAgICAgICAgICAgIGNvbnN0IGZpbGVOYW1lID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2ZpbGVuYW1lJyk7XG4gICAgICAgICAgICBpZiAoZmlsZU5hbWUgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgZGVmVmFsID0gZmlsZU5hbWUudHJpbSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQnVpbGQgdHJlZSBzdHJ1Y3R1cmUgZnJvbSBmaWxlc1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXMgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5idWlsZFRyZWVTdHJ1Y3R1cmUoZmlsZXMsIGRlZlZhbCk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIHZhbHVlcyBhcnJheSBmb3IgZHJvcGRvd24gd2l0aCBhbGwgaXRlbXMgKGluY2x1ZGluZyBmb2xkZXJzKVxuICAgICAgICBjb25zdCBkcm9wZG93blZhbHVlcyA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtcy5tYXAoKGl0ZW0sIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBpZiAoaXRlbS50eXBlID09PSAnZm9sZGVyJykge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGl0ZW0ubmFtZS5yZXBsYWNlKC88W14+XSo+L2csICcnKSwgLy8gUmVtb3ZlIEhUTUwgdGFncyBmb3Igc2VhcmNoXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ6IHRydWVcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBpdGVtLm5hbWUucmVwbGFjZSgvPFtePl0qPi9nLCAnJyksIC8vIFJlbW92ZSBIVE1MIHRhZ3MgZm9yIHNlYXJjaFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogaXRlbS52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWQ6IGl0ZW0uc2VsZWN0ZWRcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBkcm9wZG93biB3aXRoIHZhbHVlc1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXR1cCBtZW51Jywge1xuICAgICAgICAgICAgdmFsdWVzOiBkcm9wZG93blZhbHVlc1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCB0aGUgZGVmYXVsdCBzZWxlY3RlZCB2YWx1ZSBpZiBhbnlcbiAgICAgICAgY29uc3Qgc2VsZWN0ZWRJdGVtID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zLmZpbmQoaXRlbSA9PiBpdGVtLnNlbGVjdGVkKTtcbiAgICAgICAgaWYgKHNlbGVjdGVkSXRlbSkge1xuICAgICAgICAgICAgLy8gVXNlIHNldFRpbWVvdXQgdG8gZW5zdXJlIGRyb3Bkb3duIGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBTZXR0aW5nIHNlbGVjdGVkIHZhbHVlIHdpbGwgdHJpZ2dlciBvbkNoYW5nZSBjYWxsYmFjayB3aGljaCBjYWxscyB1cGRhdGVMb2dGcm9tU2VydmVyKClcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBzZWxlY3RlZEl0ZW0udmFsdWUpO1xuICAgICAgICAgICAgICAgIC8vIEZvcmNlIHJlZnJlc2ggdGhlIGRyb3Bkb3duIHRvIHNob3cgdGhlIHNlbGVjdGVkIHZhbHVlXG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bigncmVmcmVzaCcpO1xuICAgICAgICAgICAgICAgIC8vIEFsc28gc2V0IHRoZSB0ZXh0IHRvIHNob3cgZnVsbCBwYXRoXG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignc2V0IHRleHQnLCBzZWxlY3RlZEl0ZW0udmFsdWUpO1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmaWxlbmFtZScsIHNlbGVjdGVkSXRlbS52YWx1ZSk7XG4gICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICB9IGVsc2UgaWYgKGRlZlZhbCkge1xuICAgICAgICAgICAgLy8gSWYgd2UgaGF2ZSBhIGRlZmF1bHQgdmFsdWUgYnV0IG5vIGl0ZW0gd2FzIG1hcmtlZCBhcyBzZWxlY3RlZCxcbiAgICAgICAgICAgIC8vIHRyeSB0byBmaW5kIGFuZCBzZWxlY3QgaXQgbWFudWFsbHlcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1Ub1NlbGVjdCA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtcy5maW5kKGl0ZW0gPT5cbiAgICAgICAgICAgICAgICBpdGVtLnR5cGUgPT09ICdmaWxlJyAmJiBpdGVtLnZhbHVlID09PSBkZWZWYWxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBpZiAoaXRlbVRvU2VsZWN0KSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNldHRpbmcgc2VsZWN0ZWQgdmFsdWUgd2lsbCB0cmlnZ2VyIG9uQ2hhbmdlIGNhbGxiYWNrIHdoaWNoIGNhbGxzIHVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKVxuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBpdGVtVG9TZWxlY3QudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdyZWZyZXNoJyk7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldCB0ZXh0JywgaXRlbVRvU2VsZWN0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2ZpbGVuYW1lJywgaXRlbVRvU2VsZWN0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBIaWRlIHRoZSBkaW1tZXIgYWZ0ZXIgbG9hZGluZyBvbmx5IGlmIG5vIGZpbGUgaXMgc2VsZWN0ZWRcbiAgICAgICAgICAgICAgICBpZiAoIXN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBIaWRlIHRoZSBkaW1tZXIgYWZ0ZXIgbG9hZGluZyBvbmx5IGlmIG5vIGZpbGUgaXMgc2VsZWN0ZWRcbiAgICAgICAgICAgIGlmICghc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBNYXJrIGluaXRpYWxpemF0aW9uIGFzIGNvbXBsZXRlIHRvIGFsbG93IGhhc2hjaGFuZ2UgaGFuZGxlciB0byB3b3JrXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNJbml0aWFsaXppbmcgPSBmYWxzZTtcbiAgICAgICAgfSwgMjAwKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgY2hhbmdpbmcgdGhlIGxvZyBmaWxlIGluIHRoZSBzZWxlY3QgZHJvcGRvd24uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHNlbGVjdGVkIHZhbHVlLlxuICAgICAqL1xuICAgIGNiT25DaGFuZ2VGaWxlKHZhbHVlKSB7XG4gICAgICAgIGlmICh2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBkcm9wZG93biB0ZXh0IHRvIHNob3cgdGhlIGZ1bGwgZmlsZSBwYXRoXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldCB0ZXh0JywgdmFsdWUpO1xuXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmaWxlbmFtZScsIHZhbHVlKTtcblxuICAgICAgICAvLyBVcGRhdGUgVVJMIGhhc2ggd2l0aCB0aGUgc2VsZWN0ZWQgZmlsZVxuICAgICAgICB3aW5kb3cubG9jYXRpb24uaGFzaCA9ICdmaWxlPScgKyBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIHRpbWUgcmFuZ2UgaXMgYXZhaWxhYmxlIGZvciB0aGlzIGZpbGVcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY2hlY2tUaW1lUmFuZ2VBdmFpbGFiaWxpdHkodmFsdWUpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiB0aW1lIHJhbmdlIGlzIGF2YWlsYWJsZSBmb3IgdGhlIHNlbGVjdGVkIGxvZyBmaWxlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVuYW1lIC0gTG9nIGZpbGUgcGF0aFxuICAgICAqL1xuICAgIGFzeW5jIGNoZWNrVGltZVJhbmdlQXZhaWxhYmlsaXR5KGZpbGVuYW1lKSB7XG4gICAgICAgIC8vIFNob3cgZGltbWVyIG9ubHkgaWYgbm90IGluIGF1dG8tdXBkYXRlIG1vZGVcbiAgICAgICAgaWYgKCFzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUpIHtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFRyeSB0byBnZXQgdGltZSByYW5nZSBmb3IgdGhpcyBmaWxlXG4gICAgICAgICAgICBTeXNsb2dBUEkuZ2V0TG9nVGltZVJhbmdlKGZpbGVuYW1lLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS50aW1lX3JhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRpbWUgcmFuZ2UgaXMgYXZhaWxhYmxlIC0gdXNlIHRpbWUtYmFzZWQgbmF2aWdhdGlvblxuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pbml0aWFsaXplTmF2aWdhdGlvbihyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBUaW1lIHJhbmdlIG5vdCBhdmFpbGFibGUgLSB1c2UgbGluZSBudW1iZXIgZmFsbGJhY2tcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaW5pdGlhbGl6ZU5hdmlnYXRpb24obnVsbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBjaGVja2luZyB0aW1lIHJhbmdlOicsIGVycm9yKTtcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIGxpbmUgbnVtYmVyIG1vZGVcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmluaXRpYWxpemVOYXZpZ2F0aW9uKG51bGwpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdW5pdmVyc2FsIG5hdmlnYXRpb24gd2l0aCB0aW1lIG9yIGxpbmUgbnVtYmVyIG1vZGVcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gdGltZVJhbmdlRGF0YSAtIFRpbWUgcmFuZ2UgZGF0YSBmcm9tIEFQSSAob3B0aW9uYWwpXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZU5hdmlnYXRpb24odGltZVJhbmdlRGF0YSkge1xuICAgICAgICBpZiAodGltZVJhbmdlRGF0YSAmJiB0aW1lUmFuZ2VEYXRhLnRpbWVfcmFuZ2UpIHtcbiAgICAgICAgICAgIC8vIFRpbWUtYmFzZWQgbW9kZVxuICAgICAgICAgICAgdGhpcy50aW1lU2xpZGVyRW5hYmxlZCA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRUaW1lUmFuZ2UgPSB0aW1lUmFuZ2VEYXRhLnRpbWVfcmFuZ2U7XG5cbiAgICAgICAgICAgIC8vIFNob3cgcGVyaW9kIGJ1dHRvbnMgZm9yIHRpbWUtYmFzZWQgbmF2aWdhdGlvblxuICAgICAgICAgICAgJCgnI3BlcmlvZC1idXR0b25zJykuc2hvdygpO1xuXG4gICAgICAgICAgICAvLyBTZXQgc2VydmVyIHRpbWV6b25lIG9mZnNldFxuICAgICAgICAgICAgaWYgKHRpbWVSYW5nZURhdGEuc2VydmVyX3RpbWV6b25lX29mZnNldCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgU1ZHVGltZWxpbmUuc2VydmVyVGltZXpvbmVPZmZzZXQgPSB0aW1lUmFuZ2VEYXRhLnNlcnZlcl90aW1lem9uZV9vZmZzZXQ7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1RpbWUgbW9kZSAtIFNlcnZlciB0aW1lem9uZSBvZmZzZXQ6JywgdGltZVJhbmdlRGF0YS5zZXJ2ZXJfdGltZXpvbmVfb2Zmc2V0LCAnc2Vjb25kcycpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIFNWRyB0aW1lbGluZSB3aXRoIHRpbWUgcmFuZ2VcbiAgICAgICAgICAgIFNWR1RpbWVsaW5lLmluaXRpYWxpemUoJyN0aW1lLXNsaWRlci1jb250YWluZXInLCB0aGlzLmN1cnJlbnRUaW1lUmFuZ2UpO1xuXG4gICAgICAgICAgICAvLyBTZXQgY2FsbGJhY2sgZm9yIHRpbWUgd2luZG93IGNoYW5nZXNcbiAgICAgICAgICAgIFNWR1RpbWVsaW5lLm9uUmFuZ2VDaGFuZ2UgPSAoc3RhcnQsIGVuZCkgPT4ge1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmxvYWRMb2dCeVRpbWVSYW5nZShzdGFydCwgZW5kKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIExvYWQgaW5pdGlhbCBjaHVuayAobGFzdCBob3VyIGJ5IGRlZmF1bHQpXG4gICAgICAgICAgICBjb25zdCBvbmVIb3VyID0gMzYwMDtcbiAgICAgICAgICAgIGNvbnN0IGluaXRpYWxTdGFydCA9IE1hdGgubWF4KHRoaXMuY3VycmVudFRpbWVSYW5nZS5lbmQgLSBvbmVIb3VyLCB0aGlzLmN1cnJlbnRUaW1lUmFuZ2Uuc3RhcnQpO1xuICAgICAgICAgICAgdGhpcy5sb2FkTG9nQnlUaW1lUmFuZ2UoaW5pdGlhbFN0YXJ0LCB0aGlzLmN1cnJlbnRUaW1lUmFuZ2UuZW5kKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIExpbmUgbnVtYmVyIGZhbGxiYWNrIG1vZGVcbiAgICAgICAgICAgIHRoaXMudGltZVNsaWRlckVuYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFRpbWVSYW5nZSA9IG51bGw7XG5cbiAgICAgICAgICAgIC8vIEhpZGUgcGVyaW9kIGJ1dHRvbnMgaW4gbGluZSBudW1iZXIgbW9kZVxuICAgICAgICAgICAgJCgnI3BlcmlvZC1idXR0b25zJykuaGlkZSgpO1xuXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIFNWRyB0aW1lbGluZSB3aXRoIGxpbmUgbnVtYmVyc1xuICAgICAgICAgICAgLy8gRm9yIG5vdywgdXNlIGRlZmF1bHQgcmFuZ2UgdW50aWwgd2UgZ2V0IHRvdGFsIGxpbmUgY291bnRcbiAgICAgICAgICAgIGNvbnN0IGxpbmVSYW5nZSA9IHsgc3RhcnQ6IDAsIGVuZDogMTAwMDAgfTtcbiAgICAgICAgICAgIFNWR1RpbWVsaW5lLmluaXRpYWxpemUoJyN0aW1lLXNsaWRlci1jb250YWluZXInLCBsaW5lUmFuZ2UsICdsaW5lcycpO1xuXG4gICAgICAgICAgICAvLyBTZXQgY2FsbGJhY2sgZm9yIGxpbmUgcmFuZ2UgY2hhbmdlc1xuICAgICAgICAgICAgU1ZHVGltZWxpbmUub25SYW5nZUNoYW5nZSA9IChzdGFydCwgZW5kKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gTG9hZCBieSBsaW5lIG51bWJlcnMgKG9mZnNldC9saW5lcylcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2FkTG9nQnlMaW5lcyhNYXRoLmZsb29yKHN0YXJ0KSwgTWF0aC5jZWlsKGVuZCAtIHN0YXJ0KSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBMb2FkIGluaXRpYWwgbGluZXNcbiAgICAgICAgICAgIHRoaXMudXBkYXRlTG9nRnJvbVNlcnZlcigpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgbG9nIGJ5IGxpbmUgbnVtYmVycyAoZm9yIGZpbGVzIHdpdGhvdXQgdGltZXN0YW1wcylcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gb2Zmc2V0IC0gU3RhcnRpbmcgbGluZSBudW1iZXJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbGluZXMgLSBOdW1iZXIgb2YgbGluZXMgdG8gbG9hZFxuICAgICAqL1xuICAgIGxvYWRMb2dCeUxpbmVzKG9mZnNldCwgbGluZXMpIHtcbiAgICAgICAgLy8gU2hvdyBkaW1tZXIgb25seSBpZiBub3QgaW4gYXV0by11cGRhdGUgbW9kZVxuICAgICAgICBpZiAoIXN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwYXJhbXMgPSB7XG4gICAgICAgICAgICBmaWxlbmFtZTogdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZmlsZW5hbWUnKSxcbiAgICAgICAgICAgIGZpbHRlcjogdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZmlsdGVyJykgfHwgJycsXG4gICAgICAgICAgICBsb2dMZXZlbDogdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnbG9nTGV2ZWwnKSB8fCAnJyxcbiAgICAgICAgICAgIG9mZnNldDogTWF0aC5tYXgoMCwgb2Zmc2V0KSxcbiAgICAgICAgICAgIGxpbmVzOiBNYXRoLm1pbig1MDAwLCBNYXRoLm1heCgxMDAsIGxpbmVzKSlcbiAgICAgICAgfTtcblxuICAgICAgICBTeXNsb2dBUEkuZ2V0TG9nRnJvbUZpbGUocGFyYW1zLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIC8vIEhpZGUgZGltbWVyIG9ubHkgaWYgbm90IGluIGF1dG8tdXBkYXRlIG1vZGVcbiAgICAgICAgICAgIGlmICghc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEgJiYgJ2NvbnRlbnQnIGluIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBTZXQgY29udGVudCBpbiBlZGl0b3IgKGV2ZW4gaWYgZW1wdHkpXG4gICAgICAgICAgICAgICAgdGhpcy52aWV3ZXIuc2V0VmFsdWUocmVzcG9uc2UuZGF0YS5jb250ZW50IHx8ICcnLCAtMSk7XG5cbiAgICAgICAgICAgICAgICAvLyBHbyB0byB0aGUgYmVnaW5uaW5nXG4gICAgICAgICAgICAgICAgdGhpcy52aWV3ZXIuZ290b0xpbmUoMSk7XG4gICAgICAgICAgICAgICAgdGhpcy52aWV3ZXIuc2Nyb2xsVG9MaW5lKDAsIHRydWUsIHRydWUsICgpID0+IHt9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgbG9nIGJ5IHRpbWUgcmFuZ2VcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc3RhcnRUaW1lc3RhbXAgLSBTdGFydCB0aW1lc3RhbXBcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gZW5kVGltZXN0YW1wIC0gRW5kIHRpbWVzdGFtcFxuICAgICAqL1xuICAgIGFzeW5jIGxvYWRMb2dCeVRpbWVSYW5nZShzdGFydFRpbWVzdGFtcCwgZW5kVGltZXN0YW1wKSB7XG4gICAgICAgIC8vIFNob3cgZGltbWVyIG9ubHkgaWYgbm90IGluIGF1dG8tdXBkYXRlIG1vZGVcbiAgICAgICAgaWYgKCFzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUpIHtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcGFyYW1zID0ge1xuICAgICAgICAgICAgZmlsZW5hbWU6IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2ZpbGVuYW1lJyksXG4gICAgICAgICAgICBmaWx0ZXI6IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2ZpbHRlcicpIHx8ICcnLFxuICAgICAgICAgICAgbG9nTGV2ZWw6IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2xvZ0xldmVsJykgfHwgJycsXG4gICAgICAgICAgICBkYXRlRnJvbTogc3RhcnRUaW1lc3RhbXAsXG4gICAgICAgICAgICBkYXRlVG86IGVuZFRpbWVzdGFtcCxcbiAgICAgICAgICAgIGxpbmVzOiA1MDAwIC8vIE1heGltdW0gbGluZXMgdG8gbG9hZFxuICAgICAgICB9O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBTeXNsb2dBUEkuZ2V0TG9nRnJvbUZpbGUocGFyYW1zLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEgJiYgJ2NvbnRlbnQnIGluIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IGNvbnRlbnQgaW4gZWRpdG9yIChldmVuIGlmIGVtcHR5KVxuICAgICAgICAgICAgICAgICAgICB0aGlzLnZpZXdlci5zZXRWYWx1ZShyZXNwb25zZS5kYXRhLmNvbnRlbnQgfHwgJycsIC0xKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBHbyB0byB0aGUgZW5kIG9mIHRoZSBsb2dcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgcm93ID0gdGhpcy52aWV3ZXIuc2Vzc2lvbi5nZXRMZW5ndGgoKSAtIDE7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbHVtbiA9IHRoaXMudmlld2VyLnNlc3Npb24uZ2V0TGluZShyb3cpLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy52aWV3ZXIuZ290b0xpbmUocm93ICsgMSwgY29sdW1uKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBBZGp1c3Qgc2xpZGVyIHRvIGFjdHVhbCBsb2FkZWQgdGltZSByYW5nZSAoc2lsZW50bHkpXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmFjdHVhbF9yYW5nZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYWN0dWFsID0gcmVzcG9uc2UuZGF0YS5hY3R1YWxfcmFuZ2U7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBTVkdUaW1lbGluZSBzZWxlY3RlZCByYW5nZSB0byBtYXRjaCBhY3R1YWwgbG9hZGVkIGRhdGFcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgdXBkYXRlcyB0aGUgc2xpZGVyIHRvIHNob3cgdGhlIHJlYWwgdGltZSByYW5nZSB0aGF0IHdhcyBsb2FkZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIFNWR1RpbWVsaW5lLnVwZGF0ZVNlbGVjdGVkUmFuZ2UoYWN0dWFsLnN0YXJ0LCBhY3R1YWwuZW5kKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gTG9nIGZvciBkZWJ1Z2dpbmcgb25seVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdHVhbC50cnVuY2F0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYExvZyBkYXRhIGxpbWl0ZWQgdG8gJHthY3R1YWwubGluZXNfY291bnR9IGxpbmVzLiBgICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYFNob3dpbmcgdGltZSByYW5nZTogWyR7YWN0dWFsLnN0YXJ0fSAtICR7YWN0dWFsLmVuZH1dYFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBIaWRlIGRpbW1lciBvbmx5IGlmIG5vdCBpbiBhdXRvLXVwZGF0ZSBtb2RlXG4gICAgICAgICAgICAgICAgaWYgKCFzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBsb2FkaW5nIGxvZyBieSB0aW1lIHJhbmdlOicsIGVycm9yKTtcbiAgICAgICAgICAgIC8vIEhpZGUgZGltbWVyIG9ubHkgaWYgbm90IGluIGF1dG8tdXBkYXRlIG1vZGVcbiAgICAgICAgICAgIGlmICghc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXBwbHkgcXVpY2sgcGVyaW9kIHNlbGVjdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfG51bWJlcn0gcGVyaW9kIC0gUGVyaW9kIGlkZW50aWZpZXIgb3Igc2Vjb25kc1xuICAgICAqL1xuICAgIGFwcGx5UXVpY2tQZXJpb2QocGVyaW9kKSB7XG4gICAgICAgIGlmICghdGhpcy5jdXJyZW50VGltZVJhbmdlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgc3RhcnQ7XG4gICAgICAgIGxldCBlbmQgPSB0aGlzLmN1cnJlbnRUaW1lUmFuZ2UuZW5kO1xuXG4gICAgICAgIGlmIChwZXJpb2QgPT09ICd0b2RheScpIHtcbiAgICAgICAgICAgIC8vIFRvZGF5IGZyb20gMDA6MDBcbiAgICAgICAgICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKGVuZCAqIDEwMDApO1xuICAgICAgICAgICAgY29uc3QgdG9kYXlTdGFydCA9IG5ldyBEYXRlKG5vdy5nZXRGdWxsWWVhcigpLCBub3cuZ2V0TW9udGgoKSwgbm93LmdldERhdGUoKSk7XG4gICAgICAgICAgICBzdGFydCA9IE1hdGguZmxvb3IodG9kYXlTdGFydC5nZXRUaW1lKCkgLyAxMDAwKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFBlcmlvZCBpbiBzZWNvbmRzXG4gICAgICAgICAgICBjb25zdCBzZWNvbmRzID0gcGFyc2VJbnQocGVyaW9kKTtcbiAgICAgICAgICAgIHN0YXJ0ID0gTWF0aC5tYXgoZW5kIC0gc2Vjb25kcywgdGhpcy5jdXJyZW50VGltZVJhbmdlLnN0YXJ0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBTVkcgdGltZWxpbmVcbiAgICAgICAgU1ZHVGltZWxpbmUuc2V0UmFuZ2Uoc3RhcnQsIGVuZCk7XG4gICAgICAgIHRoaXMubG9hZExvZ0J5VGltZVJhbmdlKHN0YXJ0LCBlbmQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBcHBseSBsb2cgbGV2ZWwgZmlsdGVyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGxldmVsIC0gTG9nIGxldmVsIChhbGwsIGVycm9yLCB3YXJuaW5nLCBpbmZvLCBkZWJ1ZylcbiAgICAgKi9cbiAgICBhcHBseUxvZ0xldmVsRmlsdGVyKGxldmVsKSB7XG4gICAgICAgIGxldCBmaWx0ZXJQYXR0ZXJuID0gJyc7XG5cbiAgICAgICAgLy8gQ3JlYXRlIHJlZ2V4IHBhdHRlcm4gYmFzZWQgb24gbGV2ZWxcbiAgICAgICAgc3dpdGNoIChsZXZlbCkge1xuICAgICAgICAgICAgY2FzZSAnZXJyb3InOlxuICAgICAgICAgICAgICAgIGZpbHRlclBhdHRlcm4gPSAnRVJST1J8Q1JJVElDQUx8RkFUQUwnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnd2FybmluZyc6XG4gICAgICAgICAgICAgICAgZmlsdGVyUGF0dGVybiA9ICdXQVJOSU5HfFdBUk4nO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnaW5mbyc6XG4gICAgICAgICAgICAgICAgZmlsdGVyUGF0dGVybiA9ICdJTkZPJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2RlYnVnJzpcbiAgICAgICAgICAgICAgICBmaWx0ZXJQYXR0ZXJuID0gJ0RFQlVHJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2FsbCc6XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGZpbHRlclBhdHRlcm4gPSAnJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBmaWx0ZXIgZmllbGRcbiAgICAgICAgdGhpcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZmlsdGVyJywgZmlsdGVyUGF0dGVybik7XG5cbiAgICAgICAgLy8gUmVsb2FkIGxvZ3Mgd2l0aCBuZXcgZmlsdGVyXG4gICAgICAgIHRoaXMudXBkYXRlTG9nRnJvbVNlcnZlcigpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGZXRjaGVzIHRoZSBsb2cgZmlsZSBjb250ZW50IGZyb20gdGhlIHNlcnZlci5cbiAgICAgKi9cbiAgICB1cGRhdGVMb2dGcm9tU2VydmVyKCkge1xuICAgICAgICBpZiAodGhpcy50aW1lU2xpZGVyRW5hYmxlZCkge1xuICAgICAgICAgICAgLy8gSW4gdGltZSBzbGlkZXIgbW9kZSwgcmVsb2FkIGN1cnJlbnQgd2luZG93XG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50VGltZVJhbmdlKSB7XG4gICAgICAgICAgICAgICAgLy8gSW4gdGltZSBzbGlkZXIgbW9kZSwgcmVsb2FkIGxhc3QgaG91clxuICAgICAgICAgICAgICAgIGNvbnN0IG9uZUhvdXIgPSAzNjAwO1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXJ0VGltZXN0YW1wID0gTWF0aC5tYXgodGhpcy5jdXJyZW50VGltZVJhbmdlLmVuZCAtIG9uZUhvdXIsIHRoaXMuY3VycmVudFRpbWVSYW5nZS5zdGFydCk7XG4gICAgICAgICAgICAgICAgdGhpcy5sb2FkTG9nQnlUaW1lUmFuZ2UoXG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0VGltZXN0YW1wLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRUaW1lUmFuZ2UuZW5kXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIExpbmUgbnVtYmVyIG1vZGVcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgICAgIHBhcmFtcy5saW5lcyA9IDUwMDA7IC8vIE1heCBsaW5lc1xuICAgICAgICAgICAgU3lzbG9nQVBJLmdldExvZ0Zyb21GaWxlKHBhcmFtcywgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY2JVcGRhdGVMb2dUZXh0KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSBsb2cgdmlldy5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSBBUEkuXG4gICAgICovXG4gICAgY2JVcGRhdGVMb2dUZXh0KHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIEhpZGUgZGltbWVyIG9ubHkgaWYgbm90IGluIGF1dG8tdXBkYXRlIG1vZGVcbiAgICAgICAgaWYgKCFzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUpIHtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSGFuZGxlIHYzIEFQSSByZXNwb25zZSBzdHJ1Y3R1cmVcbiAgICAgICAgaWYgKCFyZXNwb25zZSB8fCAhcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UubWVzc2FnZXMpIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY29udGVudCA9IHJlc3BvbnNlLmRhdGE/LmNvbnRlbnQgfHwgJyc7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlci5nZXRTZXNzaW9uKCkuc2V0VmFsdWUoY29udGVudCk7XG4gICAgICAgIGNvbnN0IHJvdyA9IHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlci5zZXNzaW9uLmdldExlbmd0aCgpIC0gMTtcbiAgICAgICAgY29uc3QgY29sdW1uID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnNlc3Npb24uZ2V0TGluZShyb3cpLmxlbmd0aDtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLmdvdG9MaW5lKHJvdyArIDEsIGNvbHVtbik7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGNsaWNraW5nIHRoZSBcIkRvd25sb2FkIEZpbGVcIiBidXR0b24uXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGRhdGEuXG4gICAgICovXG4gICAgY2JEb3dubG9hZEZpbGUocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gSGFuZGxlIHYzIEFQSSByZXNwb25zZSBzdHJ1Y3R1cmVcbiAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSByZXNwb25zZS5kYXRhLmZpbGVuYW1lIHx8IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UubWVzc2FnZXMpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgY2xpY2tpbmcgdGhlIFwiRXJhc2UgRmlsZVwiIGJ1dHRvbi5cbiAgICAgKi9cbiAgICBlcmFzZUN1cnJlbnRGaWxlQ29udGVudCgpe1xuICAgICAgICBjb25zdCBmaWxlTmFtZSA9IHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmaWxlbmFtZScpO1xuICAgICAgICBpZiAoZmlsZU5hbWUubGVuZ3RoPjApe1xuICAgICAgICAgICAgU3lzbG9nQVBJLmVyYXNlRmlsZShmaWxlTmFtZSwgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY2JBZnRlckZpbGVFcmFzZWQpXG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgY2xpY2tpbmcgdGhlIFwiRXJhc2UgRmlsZVwiIGJ1dHRvbiBhbmQgY2FsbGluZyBSRVNUIEFQSSBjb21tYW5kXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGRhdGEuXG4gICAgICovXG4gICAgY2JBZnRlckZpbGVFcmFzZWQocmVzcG9uc2Upe1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0PT09ZmFsc2UgJiYgcmVzcG9uc2UubWVzc2FnZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKTtcbiAgICAgICAgfVxuICAgIH0sXG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgc2hvdyBzeXN0ZW0gbG9ncyB0YWJcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pbml0aWFsaXplKCk7XG59KTsiXX0=