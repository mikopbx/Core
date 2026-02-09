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
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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
    }); // Initialize folder collapse/expand handlers (uses event delegation)

    systemDiagnosticLogs.initializeFolderHandlers(); // Initialize the ACE editor for log content

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
      if (event.key === 'Enter') {
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
      "class": 'ui search selection dropdown filenames-select fluid'
    });
    $dropdown.append($('<i>', {
      "class": 'dropdown icon'
    }), $('<input>', {
      type: 'text',
      "class": 'search',
      tabindex: 0
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
   * @param {string} parentFolder - Parent folder name for grouping
   * @returns {Array} Formatted dropdown items
   */
  treeToDropdownItems: function treeToDropdownItems(tree, prefix) {
    var _this = this;

    var parentFolder = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
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
        // Add folder header with toggle capability
        items.push({
          name: "<i class=\"caret down icon folder-toggle\"></i><i class=\"folder icon\"></i> ".concat(key),
          value: '',
          disabled: true,
          type: 'folder',
          folderName: key
        }); // Add children with increased indentation and parent folder reference

        var childItems = _this.treeToDropdownItems(value.children, prefix + '&nbsp;&nbsp;&nbsp;&nbsp;', key);

        items.push.apply(items, _toConsumableArray(childItems));
      } else {
        // Add file item with parent folder reference
        items.push({
          name: "".concat(prefix, "<i class=\"file outline icon\"></i> ").concat(key, " (").concat(value.size, ")"),
          value: value.path,
          selected: value["default"],
          type: 'file',
          parentFolder: parentFolder
        });
      }
    });
    return items;
  },

  /**
   * Creates custom dropdown menu HTML for log files with collapsible folders
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
          // Folder item - clickable header for collapse/expand
          // Not using 'disabled' class as it blocks pointer events
          html += "<div class=\"folder-header item\" data-folder=\"".concat(item.folderName, "\" data-value=\"\" style=\"pointer-events: auto !important; cursor: pointer; font-weight: bold; background: #f9f9f9;\">").concat(item.name, "</div>");
        } else {
          // File item with parent folder reference for collapse
          var selected = item.selected ? 'selected active' : '';
          var parentAttr = item.parentFolder ? "data-parent=\"".concat(item.parentFolder, "\"") : '';
          html += "<div class=\"item file-item ".concat(selected, "\" data-value=\"").concat(option[fields.value], "\" ").concat(parentAttr, ">").concat(item.name, "</div>");
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
   * Initializes folder collapse/expand handlers and search behavior
   */
  initializeFolderHandlers: function initializeFolderHandlers() {
    var $dropdown = systemDiagnosticLogs.$fileSelectDropDown; // Handle folder header clicks for collapse/expand
    // Use document-level handler with capture phase to intercept before Fomantic

    document.addEventListener('click', function (e) {
      // Check if click is inside our dropdown's folder-header
      var folderHeader = e.target.closest('#filenames-dropdown .folder-header');
      if (!folderHeader) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      var $folder = $(folderHeader);
      var folderName = $folder.data('folder');
      var $toggle = $folder.find('.folder-toggle');
      var $menu = $dropdown.find('.menu');
      var $files = $menu.find(".file-item[data-parent=\"".concat(folderName, "\"]")); // Toggle folder state

      var isCollapsed = $toggle.hasClass('right');

      if (isCollapsed) {
        // Expand folder
        $toggle.removeClass('right').addClass('down');
        $files.show();
      } else {
        // Collapse folder
        $toggle.removeClass('down').addClass('right');
        $files.hide();
      }
    }, true); // capture phase - fires before bubbling
    // Handle search input - show all items when searching

    $dropdown.on('input', 'input.search', function (e) {
      var searchValue = $(e.target).val().trim();
      var $menu = $dropdown.find('.menu');

      if (searchValue.length > 0) {
        // Show all items and expand all folders during search
        $menu.find('.file-item').show();
        $menu.find('.folder-toggle').removeClass('right').addClass('down');
      } else {
        // Restore collapsed state when search is cleared
        $menu.find('.folder-header').each(function (_, folder) {
          var $folder = $(folder);
          var folderName = $folder.data('folder');
          var isCollapsed = $folder.find('.folder-toggle').hasClass('right');

          if (isCollapsed) {
            $menu.find(".file-item[data-parent=\"".concat(folderName, "\"]")).hide();
          }
        });
      }
    });
  },

  /**
   * Expands the folder containing the specified file
   * @param {string} filePath - The file path to find and expand its parent folder
   */
  expandFolderForFile: function expandFolderForFile(filePath) {
    if (!filePath) return;
    var $menu = systemDiagnosticLogs.$fileSelectDropDown.find('.menu');
    var $fileItem = $menu.find(".file-item[data-value=\"".concat(filePath, "\"]"));

    if ($fileItem.length) {
      var parentFolder = $fileItem.data('parent');

      if (parentFolder) {
        var $folder = $menu.find(".folder-header[data-folder=\"".concat(parentFolder, "\"]"));
        var $toggle = $folder.find('.folder-toggle'); // Expand if collapsed

        if ($toggle.hasClass('right')) {
          $toggle.removeClass('right').addClass('down');
          $menu.find(".file-item[data-parent=\"".concat(parentFolder, "\"]")).show();
        }
      }
    }
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
          // Expand parent folder before selecting file
          systemDiagnosticLogs.expandFolderForFile(filePath);
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
        // Expand parent folder before selecting file
        systemDiagnosticLogs.expandFolderForFile(selectedItem.value); // Setting selected value will trigger onChange callback which calls updateLogFromServer()

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
          // Expand parent folder before selecting file
          systemDiagnosticLogs.expandFolderForFile(itemToSelect.value); // Setting selected value will trigger onChange callback which calls updateLogFromServer()

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
    } // Hide auto-refresh button for rotated log files (they don't change)


    systemDiagnosticLogs.updateAutoRefreshVisibility(value); // Check if time range is available for this file

    systemDiagnosticLogs.checkTimeRangeAvailability(value);
  },

  /**
   * Check if file is a rotated log file (archived, no longer being written to)
   * Rotated files have suffixes like: .0, .1, .2, .gz, .1.gz, .2.gz, etc.
   * @param {string} filename - Log file path
   * @returns {boolean} True if file is rotated/archived
   */
  isRotatedLogFile: function isRotatedLogFile(filename) {
    if (!filename) {
      return false;
    } // Match patterns: .0, .1, .2, ..., .gz, .0.gz, .1.gz, etc.


    return /\.\d+($|\.gz$)|\.gz$/.test(filename);
  },

  /**
   * Update auto-refresh button visibility based on file type
   * Hide for rotated files, show for active log files
   * @param {string} filename - Log file path
   */
  updateAutoRefreshVisibility: function updateAutoRefreshVisibility(filename) {
    var $autoBtn = $('#show-last-log-auto');
    var isRotated = systemDiagnosticLogs.isRotatedLogFile(filename);

    if (isRotated) {
      // Stop auto-refresh if it was active
      if (systemDiagnosticLogs.isAutoUpdateActive) {
        $autoBtn.find('.icons i.refresh').removeClass('loading');
        systemDiagnosticLogs.isAutoUpdateActive = false;
        updateLogViewWorker.stop();
      }

      $autoBtn.hide();
    } else {
      $autoBtn.show();
    }
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
   * Update period buttons visibility based on log file duration
   * Shows only buttons for periods that are <= log file duration
   * Hides entire container if no buttons are visible
   * @param {number} logDuration - Log file duration in seconds
   */
  updatePeriodButtonsVisibility: function updatePeriodButtonsVisibility(logDuration) {
    var $periodButtons = $('.period-btn');
    var $periodContainer = $('#period-buttons');
    var largestVisiblePeriod = 0;
    var $largestVisibleButton = null;
    var visibleCount = 0;
    $periodButtons.each(function (index, button) {
      var $button = $(button);
      var period = parseInt($button.data('period'), 10); // Show button if period is less than or equal to log duration
      // Add 10% tolerance for rounding/edge cases

      if (period <= logDuration * 1.1) {
        $button.show();
        visibleCount++; // Track the largest visible period for default selection

        if (period > largestVisiblePeriod) {
          largestVisiblePeriod = period;
          $largestVisibleButton = $button;
        }
      } else {
        $button.hide();
      }
    }); // Hide entire container if no buttons are visible
    // Also toggle class on parent to remove gap for proper alignment

    var $timeControlsInline = $('.time-controls-inline');

    if (visibleCount === 0) {
      $periodContainer.hide();
      $timeControlsInline.addClass('no-period-buttons');
    } else {
      $periodContainer.show();
      $timeControlsInline.removeClass('no-period-buttons');
    } // Set largest visible button as active (if no button is currently active)


    if ($largestVisibleButton && !$periodButtons.filter('.active').is(':visible')) {
      $periodButtons.removeClass('active');
      $largestVisibleButton.addClass('active');
    }
  },

  /**
   * Check if time range is available for the selected log file
   * @param {string} filename - Log file path
   */
  checkTimeRangeAvailability: function checkTimeRangeAvailability(filename) {
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
    // Check if we have valid time range with actual timestamps (not null)
    var hasValidTimeRange = timeRangeData && timeRangeData.time_range && typeof timeRangeData.time_range.start === 'number' && typeof timeRangeData.time_range.end === 'number'; // Check if time range is meaningful (more than 1 second of data)

    var hasMultipleTimestamps = hasValidTimeRange && timeRangeData.time_range.end - timeRangeData.time_range.start > 1;

    if (hasValidTimeRange && hasMultipleTimestamps) {
      // Time-based mode
      this.timeSliderEnabled = true;
      this.currentTimeRange = timeRangeData.time_range; // Calculate log file duration and update period buttons visibility

      var logDuration = this.currentTimeRange.end - this.currentTimeRange.start;
      this.updatePeriodButtonsVisibility(logDuration); // Show period buttons for time-based navigation

      $('#period-buttons').show(); // Set server timezone offset

      if (timeRangeData.server_timezone_offset !== undefined) {
        SVGTimeline.serverTimezoneOffset = timeRangeData.server_timezone_offset;
      } // Initialize SVG timeline with time range


      SVGTimeline.initialize('#time-slider-container', this.currentTimeRange); // Set callback for time window changes
      // Always use latest=true so the most recent log entries are displayed
      // Truncation (if any) happens on the left side, which is less disruptive

      SVGTimeline.onRangeChange = function (start, end, draggedHandle) {
        systemDiagnosticLogs.loadLogByTimeRange(start, end, true);
      }; // Set callback for truncated zone clicks
      // Left zones (timeline-truncated-left): data was cut from beginning, load with latest=true
      // Right zones (timeline-truncated-right): data was cut from end, load with latest=false


      SVGTimeline.onTruncatedZoneClick = function (start, end, isLeftZone) {
        systemDiagnosticLogs.loadLogByTimeRange(start, end, isLeftZone);
      }; // Load initial chunk with latest=true to show newest entries
      // Pass isInitialLoad=true to suppress truncated zone display on first load
      // Use the largest visible period button or 1 hour as fallback


      var $activeButton = $('.period-btn.active:visible');
      var initialPeriod = $activeButton.length > 0 ? parseInt($activeButton.data('period'), 10) : Math.min(3600, logDuration);
      var initialStart = Math.max(this.currentTimeRange.end - initialPeriod, this.currentTimeRange.start);
      this.loadLogByTimeRange(initialStart, this.currentTimeRange.end, true, true);
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
   * @param {boolean} latest - If true, return newest lines first (for initial load)
   * @param {boolean} isInitialLoad - If true, suppress truncated zone display
   * @param {boolean} isAutoUpdate - If true, skip timeline recalculation (only update content)
   */
  loadLogByTimeRange: function loadLogByTimeRange(startTimestamp, endTimestamp) {
    var _this3 = this;

    var latest = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    var isInitialLoad = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;
    var isAutoUpdate = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : false;

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
      lines: 5000,
      // Maximum lines to load
      latest: latest // If true, return newest lines (tail | tac)

    };

    try {
      SyslogAPI.getLogFromFile(params, function (response) {
        if (response && response.result && response.data && 'content' in response.data) {
          var newContent = response.data.content || '';

          if (isAutoUpdate && newContent.length > 0) {
            // Auto-update mode: append only new lines
            var currentContent = _this3.viewer.getValue();

            var newLines = _this3.findNewLines(currentContent, newContent);

            if (newLines.length > 0) {
              // Append new lines at the end
              var session = _this3.viewer.session;
              var lastRow = session.getLength();
              session.insert({
                row: lastRow,
                column: 0
              }, '\n' + newLines.join('\n')); // Go to the last line to follow new entries

              var finalRow = session.getLength() - 1;
              var finalColumn = session.getLine(finalRow).length;

              _this3.viewer.gotoLine(finalRow + 1, finalColumn);
            }
          } else {
            // Normal mode: set content and go to end
            _this3.viewer.setValue(newContent, -1); // Go to the end of the log


            var row = _this3.viewer.session.getLength() - 1;

            var column = _this3.viewer.session.getLine(row).length;

            _this3.viewer.gotoLine(row + 1, column);
          } // Adjust slider to actual loaded time range (silently)


          if (response.data.actual_range) {
            var actual = response.data.actual_range; // Always update fullRange boundary based on actual data from server
            // This ensures no-data zones display correctly after refresh

            if (actual.end) {
              SVGTimeline.updateDataBoundary(actual.end);
            } // Always update timeline with server response (except during auto-update)
            // updateFromServerResponse() handles:
            // - Updating selectedRange to actual data boundaries
            // - Preserving visibleRange.end if it was extended to current time (for no-data zones)
            // - Managing truncation zones display


            if (!isAutoUpdate) {
              SVGTimeline.updateFromServerResponse(actual, startTimestamp, endTimestamp, isInitialLoad);
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
        var oneHour = 3600; // Get current filename to check if it's a rotated log file

        var filename = this.$formObj.form('get value', 'filename');
        var isRotated = this.isRotatedLogFile(filename);
        var endTimestamp;
        var startTimestamp;

        if (isRotated) {
          // For rotated files: use the file's actual time range
          // Rotated files don't receive new data, so currentTimeRange is fixed
          endTimestamp = this.currentTimeRange.end;
          startTimestamp = Math.max(this.currentTimeRange.end - oneHour, this.currentTimeRange.start);
        } else {
          // For active log files: use current time to capture new entries
          endTimestamp = Math.floor(Date.now() / 1000);
          startTimestamp = endTimestamp - oneHour; // Update currentTimeRange.end to reflect new data availability

          this.currentTimeRange.end = endTimestamp; // FORCE update the SVG timeline visible range to current time
          // force=true ensures visibleRange.end is set even if it was already >= endTimestamp
          // This handles timezone differences where server time might appear "in the future"

          SVGTimeline.extendRange(endTimestamp, true);
        } // Use latest=true to show newest entries (for show-last-log / auto-update buttons)
        // Pass isAutoUpdate=true when auto-refresh is active to prevent timeline flickering


        this.loadLogByTimeRange(startTimestamp, endTimestamp, true, false, this.isAutoUpdateActive);
      }
    } else {
      // Line number mode
      var params = systemDiagnosticLogs.$formObj.form('get values');
      params.lines = 5000; // Max lines

      SyslogAPI.getLogFromFile(params, systemDiagnosticLogs.cbUpdateLogText);
    }
  },

  /**
   * Find new lines that are not in current content
   * Compares last lines of current content with new content to find overlap
   * @param {string} currentContent - Current editor content
   * @param {string} newContent - New content from server
   * @returns {Array} Array of new lines to append
   */
  findNewLines: function findNewLines(currentContent, newContent) {
    if (!currentContent || currentContent.trim().length === 0) {
      // If editor is empty, all lines are new
      return newContent.split('\n').filter(function (line) {
        return line.trim().length > 0;
      });
    }

    var currentLines = currentContent.split('\n');
    var newLines = newContent.split('\n'); // Get last non-empty line from current content as anchor

    var anchorLine = '';

    for (var i = currentLines.length - 1; i >= 0; i--) {
      if (currentLines[i].trim().length > 0) {
        anchorLine = currentLines[i];
        break;
      }
    }

    if (!anchorLine) {
      return newLines.filter(function (line) {
        return line.trim().length > 0;
      });
    } // Find anchor line in new content


    var anchorIndex = -1;

    for (var _i2 = newLines.length - 1; _i2 >= 0; _i2--) {
      if (newLines[_i2] === anchorLine) {
        anchorIndex = _i2;
        break;
      }
    }

    if (anchorIndex === -1) {
      // Anchor not found - content changed significantly, return empty
      // This prevents duplicates when log rotates or filter changes
      return [];
    } // Return lines after anchor


    var result = newLines.slice(anchorIndex + 1).filter(function (line) {
      return line.trim().length > 0;
    });
    return result;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TeXN0ZW1EaWFnbm9zdGljL3N5c3RlbS1kaWFnbm9zdGljLWluZGV4LXNob3dsb2dzLmpzIl0sIm5hbWVzIjpbInN5c3RlbURpYWdub3N0aWNMb2dzIiwiJHNob3dCdG4iLCIkIiwiJGRvd25sb2FkQnRuIiwiJHNob3dBdXRvQnRuIiwiJGVyYXNlQnRuIiwiJGxvZ0NvbnRlbnQiLCJ2aWV3ZXIiLCIkZmlsZVNlbGVjdERyb3BEb3duIiwibG9nc0l0ZW1zIiwiJGRpbW1lciIsIiRmb3JtT2JqIiwiaXNJbml0aWFsaXppbmciLCJ0aW1lU2xpZGVyRW5hYmxlZCIsImN1cnJlbnRUaW1lUmFuZ2UiLCJpc0F1dG9VcGRhdGVBY3RpdmUiLCJpbml0aWFsaXplIiwiYWNlSGVpZ2h0Iiwid2luZG93IiwiaW5uZXJIZWlnaHQiLCJjbG9zZXN0IiwiY3NzIiwiY3JlYXRlRHJvcGRvd25Gcm9tSGlkZGVuSW5wdXQiLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwiY2JPbkNoYW5nZUZpbGUiLCJpZ25vcmVDYXNlIiwiZnVsbFRleHRTZWFyY2giLCJmb3JjZVNlbGVjdGlvbiIsInByZXNlcnZlSFRNTCIsImFsbG93Q2F0ZWdvcnlTZWxlY3Rpb24iLCJtYXRjaCIsImZpbHRlclJlbW90ZURhdGEiLCJhY3Rpb24iLCJ0ZW1wbGF0ZXMiLCJtZW51IiwiY3VzdG9tRHJvcGRvd25NZW51IiwiaW5pdGlhbGl6ZUZvbGRlckhhbmRsZXJzIiwiaW5pdGlhbGl6ZUFjZSIsIlN5c2xvZ0FQSSIsImdldExvZ3NMaXN0IiwiY2JGb3JtYXREcm9wZG93blJlc3VsdHMiLCJpbml0aWFsaXplTG9nTGV2ZWxEcm9wZG93biIsImRvY3VtZW50Iiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCIkYnRuIiwiY3VycmVudFRhcmdldCIsInBlcmlvZCIsImRhdGEiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiYXBwbHlRdWlja1BlcmlvZCIsImVuZCIsIm9uZUhvdXIiLCJzdGFydCIsIk1hdGgiLCJtYXgiLCJTVkdUaW1lbGluZSIsInNldFJhbmdlIiwibG9hZExvZ0J5VGltZVJhbmdlIiwibGV2ZWwiLCJhcHBseUxvZ0xldmVsRmlsdGVyIiwidXBkYXRlTG9nRnJvbVNlcnZlciIsImhhbmRsZUhhc2hDaGFuZ2UiLCJmb3JtIiwiZG93bmxvYWRMb2dGaWxlIiwiZmlsZW5hbWUiLCJjYkRvd25sb2FkRmlsZSIsIiRidXR0b24iLCIkcmVsb2FkSWNvbiIsImZpbmQiLCJoYXNDbGFzcyIsInVwZGF0ZUxvZ1ZpZXdXb3JrZXIiLCJzdG9wIiwiZXJhc2VDdXJyZW50RmlsZUNvbnRlbnQiLCJldmVudCIsImtleSIsInRvZ2dsZUZ1bGxTY3JlZW4iLCJhZGRFdmVudExpc3RlbmVyIiwiYWRqdXN0TG9nSGVpZ2h0IiwibG9nQ29udGFpbmVyIiwiZ2V0RWxlbWVudEJ5SWQiLCJmdWxsc2NyZWVuRWxlbWVudCIsInJlcXVlc3RGdWxsc2NyZWVuIiwiZXJyIiwiY29uc29sZSIsImVycm9yIiwibWVzc2FnZSIsImV4aXRGdWxsc2NyZWVuIiwic2V0VGltZW91dCIsIm9mZnNldCIsInRvcCIsInJlc2l6ZSIsIiRoaWRkZW5JbnB1dCIsImxlbmd0aCIsIiRkcm9wZG93biIsImlkIiwiJHRleHQiLCJ0ZXh0IiwiZ2xvYmFsVHJhbnNsYXRlIiwic2RfQWxsTGV2ZWxzIiwiJGljb24iLCIkbWVudSIsIml0ZW1zIiwidmFsdWUiLCJpY29uIiwic2RfRXJyb3IiLCJzZF9XYXJuaW5nIiwic2RfTm90aWNlIiwic2RfSW5mbyIsInNkX0RlYnVnIiwiZm9yRWFjaCIsIml0ZW0iLCIkaXRlbSIsImh0bWwiLCJhcHBlbmQiLCJhZnRlciIsInZhbCIsInRyaWdnZXIiLCJ0eXBlIiwidGFiaW5kZXgiLCJiZWZvcmUiLCJoaWRlIiwiYWNlIiwiZWRpdCIsImp1bGlhIiwicmVxdWlyZSIsInVuZGVmaW5lZCIsIkluaU1vZGUiLCJNb2RlIiwic2Vzc2lvbiIsInNldE1vZGUiLCJzZXRUaGVtZSIsInJlbmRlcmVyIiwic2V0U2hvd0d1dHRlciIsInNldE9wdGlvbnMiLCJzaG93TGluZU51bWJlcnMiLCJzaG93UHJpbnRNYXJnaW4iLCJyZWFkT25seSIsImJ1aWxkVHJlZVN0cnVjdHVyZSIsImZpbGVzIiwiZGVmYXVsdFBhdGgiLCJ0cmVlIiwiT2JqZWN0IiwiZW50cmllcyIsImZpbGVEYXRhIiwiZmlsZVBhdGgiLCJwYXRoIiwicGFydHMiLCJzcGxpdCIsImN1cnJlbnQiLCJwYXJ0IiwiaW5kZXgiLCJzaXplIiwiY2hpbGRyZW4iLCJ0cmVlVG9Ecm9wZG93bkl0ZW1zIiwicHJlZml4IiwicGFyZW50Rm9sZGVyIiwic29ydCIsImFLZXkiLCJhVmFsIiwiYktleSIsImJWYWwiLCJsb2NhbGVDb21wYXJlIiwicHVzaCIsIm5hbWUiLCJkaXNhYmxlZCIsImZvbGRlck5hbWUiLCJjaGlsZEl0ZW1zIiwic2VsZWN0ZWQiLCJyZXNwb25zZSIsImZpZWxkcyIsInZhbHVlcyIsImVhY2giLCJvcHRpb24iLCJwYXJlbnRBdHRyIiwibWF5YmVEaXNhYmxlZCIsImZvbGRlckhlYWRlciIsInRhcmdldCIsInN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbiIsIiRmb2xkZXIiLCIkdG9nZ2xlIiwiJGZpbGVzIiwiaXNDb2xsYXBzZWQiLCJzaG93Iiwic2VhcmNoVmFsdWUiLCJ0cmltIiwiXyIsImZvbGRlciIsImV4cGFuZEZvbGRlckZvckZpbGUiLCIkZmlsZUl0ZW0iLCJoYXNoIiwibG9jYXRpb24iLCJzdGFydHNXaXRoIiwiZGVjb2RlVVJJQ29tcG9uZW50Iiwic3Vic3RyaW5nIiwiZmlsZUV4aXN0cyIsInNvbWUiLCJnZXRGaWxlRnJvbUhhc2giLCJyZXN1bHQiLCJkZWZWYWwiLCJmaWxlTmFtZSIsImRyb3Bkb3duVmFsdWVzIiwibWFwIiwicmVwbGFjZSIsInNlbGVjdGVkSXRlbSIsIml0ZW1Ub1NlbGVjdCIsImVuY29kZVVSSUNvbXBvbmVudCIsInJlc2V0RmlsdGVycyIsInVwZGF0ZUF1dG9SZWZyZXNoVmlzaWJpbGl0eSIsImNoZWNrVGltZVJhbmdlQXZhaWxhYmlsaXR5IiwiaXNSb3RhdGVkTG9nRmlsZSIsInRlc3QiLCIkYXV0b0J0biIsImlzUm90YXRlZCIsInVwZGF0ZVBlcmlvZEJ1dHRvbnNWaXNpYmlsaXR5IiwibG9nRHVyYXRpb24iLCIkcGVyaW9kQnV0dG9ucyIsIiRwZXJpb2RDb250YWluZXIiLCJsYXJnZXN0VmlzaWJsZVBlcmlvZCIsIiRsYXJnZXN0VmlzaWJsZUJ1dHRvbiIsInZpc2libGVDb3VudCIsImJ1dHRvbiIsInBhcnNlSW50IiwiJHRpbWVDb250cm9sc0lubGluZSIsImZpbHRlciIsImlzIiwiZ2V0TG9nVGltZVJhbmdlIiwidGltZV9yYW5nZSIsImluaXRpYWxpemVOYXZpZ2F0aW9uIiwidGltZVJhbmdlRGF0YSIsImhhc1ZhbGlkVGltZVJhbmdlIiwiaGFzTXVsdGlwbGVUaW1lc3RhbXBzIiwic2VydmVyX3RpbWV6b25lX29mZnNldCIsInNlcnZlclRpbWV6b25lT2Zmc2V0Iiwib25SYW5nZUNoYW5nZSIsImRyYWdnZWRIYW5kbGUiLCJvblRydW5jYXRlZFpvbmVDbGljayIsImlzTGVmdFpvbmUiLCIkYWN0aXZlQnV0dG9uIiwiaW5pdGlhbFBlcmlvZCIsIm1pbiIsImluaXRpYWxTdGFydCIsImxpbmVSYW5nZSIsImxvYWRMb2dCeUxpbmVzIiwiZmxvb3IiLCJjZWlsIiwibGluZXMiLCJwYXJhbXMiLCJsb2dMZXZlbCIsImdldExvZ0Zyb21GaWxlIiwic2V0VmFsdWUiLCJjb250ZW50IiwiZ290b0xpbmUiLCJzY3JvbGxUb0xpbmUiLCJzdGFydFRpbWVzdGFtcCIsImVuZFRpbWVzdGFtcCIsImxhdGVzdCIsImlzSW5pdGlhbExvYWQiLCJpc0F1dG9VcGRhdGUiLCJkYXRlRnJvbSIsImRhdGVUbyIsIm5ld0NvbnRlbnQiLCJjdXJyZW50Q29udGVudCIsImdldFZhbHVlIiwibmV3TGluZXMiLCJmaW5kTmV3TGluZXMiLCJsYXN0Um93IiwiZ2V0TGVuZ3RoIiwiaW5zZXJ0Iiwicm93IiwiY29sdW1uIiwiam9pbiIsImZpbmFsUm93IiwiZmluYWxDb2x1bW4iLCJnZXRMaW5lIiwiYWN0dWFsX3JhbmdlIiwiYWN0dWFsIiwidXBkYXRlRGF0YUJvdW5kYXJ5IiwidXBkYXRlRnJvbVNlcnZlclJlc3BvbnNlIiwicGVyaW9kU2Vjb25kcyIsImFwcGx5UGVyaW9kIiwiZmlsdGVyUGF0dGVybiIsIkRhdGUiLCJub3ciLCJleHRlbmRSYW5nZSIsImNiVXBkYXRlTG9nVGV4dCIsImxpbmUiLCJjdXJyZW50TGluZXMiLCJhbmNob3JMaW5lIiwiaSIsImFuY2hvckluZGV4Iiwic2xpY2UiLCJtZXNzYWdlcyIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwiZ2V0U2Vzc2lvbiIsImVyYXNlRmlsZSIsImNiQWZ0ZXJGaWxlRXJhc2VkIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxvQkFBb0IsR0FBRztBQUN6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxnQkFBRCxDQUxjOztBQU96QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxZQUFZLEVBQUVELENBQUMsQ0FBQyxnQkFBRCxDQVhVOztBQWF6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxZQUFZLEVBQUVGLENBQUMsQ0FBQyxxQkFBRCxDQWpCVTs7QUFtQnpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lHLEVBQUFBLFNBQVMsRUFBRUgsQ0FBQyxDQUFDLGFBQUQsQ0F2QmE7O0FBeUJ6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJSSxFQUFBQSxXQUFXLEVBQUVKLENBQUMsQ0FBQyx1QkFBRCxDQTdCVzs7QUErQnpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lLLEVBQUFBLE1B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Z0IsVUFBckI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cbi8qIGdsb2JhbCBhY2UsIFBieEFwaSwgU3lzbG9nQVBJLCB1cGRhdGVMb2dWaWV3V29ya2VyLCBBY2UsIFVzZXJNZXNzYWdlLCBTVkdUaW1lbGluZSAqL1xuXG4vKipcbiAqIFJlcHJlc2VudHMgdGhlIHN5c3RlbSBkaWFnbm9zdGljIGxvZ3Mgb2JqZWN0LlxuICpcbiAqIEBtb2R1bGUgc3lzdGVtRGlhZ25vc3RpY0xvZ3NcbiAqL1xuY29uc3Qgc3lzdGVtRGlhZ25vc3RpY0xvZ3MgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIFwiU2hvdyBMYXN0IExvZ1wiIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzaG93QnRuOiAkKCcjc2hvdy1sYXN0LWxvZycpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIFwiRG93bmxvYWQgRmlsZVwiIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkb3dubG9hZEJ0bjogJCgnI2Rvd25sb2FkLWZpbGUnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBcIlNob3cgTGFzdCBMb2cgKEF1dG8pXCIgYnV0dG9uLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNob3dBdXRvQnRuOiAkKCcjc2hvdy1sYXN0LWxvZy1hdXRvJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgXCJFcmFzZSBjdXJyZW50IGZpbGUgY29udGVudFwiIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRlcmFzZUJ0bjogJCgnI2VyYXNlLWZpbGUnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBsb2cgY29udGVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRsb2dDb250ZW50OiAkKCcjbG9nLWNvbnRlbnQtcmVhZG9ubHknKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSB2aWV3ZXIgZm9yIGRpc3BsYXlpbmcgdGhlIGxvZyBjb250ZW50LlxuICAgICAqIEB0eXBlIHtBY2V9XG4gICAgICovXG4gICAgdmlld2VyOiAnJyxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmaWxlIHNlbGVjdCBkcm9wZG93bi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmaWxlU2VsZWN0RHJvcERvd246IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBBcnJheSBvZiBsb2cgaXRlbXMuXG4gICAgICogQHR5cGUge0FycmF5fVxuICAgICAqL1xuICAgIGxvZ3NJdGVtczogW10sXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZGltbWVyLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRpbW1lcjogJCgnI2dldC1sb2dzLWRpbW1lcicpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI3N5c3RlbS1kaWFnbm9zdGljLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIEZsYWcgdG8gcHJldmVudCBkdXBsaWNhdGUgQVBJIGNhbGxzIGR1cmluZyBpbml0aWFsaXphdGlvblxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGlzSW5pdGlhbGl6aW5nOiB0cnVlLFxuXG4gICAgLyoqXG4gICAgICogRmxhZyBpbmRpY2F0aW5nIGlmIHRpbWUgc2xpZGVyIG1vZGUgaXMgZW5hYmxlZFxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIHRpbWVTbGlkZXJFbmFibGVkOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIEN1cnJlbnQgdGltZSByYW5nZSBmb3IgdGhlIHNlbGVjdGVkIGxvZyBmaWxlXG4gICAgICogQHR5cGUge29iamVjdHxudWxsfVxuICAgICAqL1xuICAgIGN1cnJlbnRUaW1lUmFuZ2U6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBGbGFnIGluZGljYXRpbmcgaWYgYXV0by11cGRhdGUgbW9kZSBpcyBhY3RpdmVcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBpc0F1dG9VcGRhdGVBY3RpdmU6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIHN5c3RlbSBkaWFnbm9zdGljIGxvZ3MuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgY29uc3QgYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gMjUwO1xuXG4gICAgICAgIC8vIFNldCB0aGUgbWluaW11bSBoZWlnaHQgb2YgdGhlIGxvZyBjb250YWluZXJcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5jbG9zZXN0KCdkaXYnKS5jc3MoJ21pbi1oZWlnaHQnLCBgJHthY2VIZWlnaHR9cHhgKTtcblxuICAgICAgICAvLyBDcmVhdGUgZHJvcGRvd24gVUkgZnJvbSBoaWRkZW4gaW5wdXQgKFY1LjAgcGF0dGVybilcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY3JlYXRlRHJvcGRvd25Gcm9tSGlkZGVuSW5wdXQoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBkcm9wZG93biBtZW51IGZvciBsb2cgZmlsZXMgd2l0aCB0cmVlIHN1cHBvcnRcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTZW1hbnRpYyBVSSBkcm9wZG93biB3aXRoIGN1c3RvbSBtZW51IGdlbmVyYXRpb25cbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6IHN5c3RlbURpYWdub3N0aWNMb2dzLmNiT25DaGFuZ2VGaWxlLFxuICAgICAgICAgICAgICAgIGlnbm9yZUNhc2U6IHRydWUsXG4gICAgICAgICAgICAgICAgZnVsbFRleHRTZWFyY2g6IHRydWUsXG4gICAgICAgICAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgICAgIHByZXNlcnZlSFRNTDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBhbGxvd0NhdGVnb3J5U2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBtYXRjaDogJ3RleHQnLFxuICAgICAgICAgICAgICAgIGZpbHRlclJlbW90ZURhdGE6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGFjdGlvbjogJ2FjdGl2YXRlJyxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgbWVudTogc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY3VzdG9tRHJvcGRvd25NZW51XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGZvbGRlciBjb2xsYXBzZS9leHBhbmQgaGFuZGxlcnMgKHVzZXMgZXZlbnQgZGVsZWdhdGlvbilcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaW5pdGlhbGl6ZUZvbGRlckhhbmRsZXJzKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgQUNFIGVkaXRvciBmb3IgbG9nIGNvbnRlbnRcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaW5pdGlhbGl6ZUFjZSgpO1xuXG4gICAgICAgIC8vIEZldGNoIHRoZSBsaXN0IG9mIGxvZyBmaWxlc1xuICAgICAgICBTeXNsb2dBUEkuZ2V0TG9nc0xpc3Qoc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY2JGb3JtYXREcm9wZG93blJlc3VsdHMpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgbG9nIGxldmVsIGRyb3Bkb3duIC0gVjUuMCBwYXR0ZXJuIHdpdGggRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pbml0aWFsaXplTG9nTGV2ZWxEcm9wZG93bigpO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciBxdWljayBwZXJpb2QgYnV0dG9uc1xuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnLnBlcmlvZC1idG4nLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgJGJ0biA9ICQoZS5jdXJyZW50VGFyZ2V0KTtcbiAgICAgICAgICAgIGNvbnN0IHBlcmlvZCA9ICRidG4uZGF0YSgncGVyaW9kJyk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBhY3RpdmUgc3RhdGVcbiAgICAgICAgICAgICQoJy5wZXJpb2QtYnRuJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgJGJ0bi5hZGRDbGFzcygnYWN0aXZlJyk7XG5cbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmFwcGx5UXVpY2tQZXJpb2QocGVyaW9kKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIFwiTm93XCIgYnV0dG9uXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcubm93LWJ0bicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBpZiAoc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY3VycmVudFRpbWVSYW5nZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGVuZCA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmN1cnJlbnRUaW1lUmFuZ2UuZW5kO1xuICAgICAgICAgICAgICAgIGNvbnN0IG9uZUhvdXIgPSAzNjAwO1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gTWF0aC5tYXgoZW5kIC0gb25lSG91ciwgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY3VycmVudFRpbWVSYW5nZS5zdGFydCk7XG4gICAgICAgICAgICAgICAgU1ZHVGltZWxpbmUuc2V0UmFuZ2Uoc3RhcnQsIGVuZCk7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9hZExvZ0J5VGltZVJhbmdlKHN0YXJ0LCBlbmQpO1xuICAgICAgICAgICAgICAgICQoJy5wZXJpb2QtYnRuJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgICAgICQoJy5wZXJpb2QtYnRuW2RhdGEtcGVyaW9kPVwiMzYwMFwiXScpLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIGxvZyBsZXZlbCBmaWx0ZXIgYnV0dG9uc1xuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnLmxldmVsLWJ0bicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkYnRuID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICAgICAgY29uc3QgbGV2ZWwgPSAkYnRuLmRhdGEoJ2xldmVsJyk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBhY3RpdmUgc3RhdGVcbiAgICAgICAgICAgICQoJy5sZXZlbC1idG4nKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAkYnRuLmFkZENsYXNzKCdhY3RpdmUnKTtcblxuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuYXBwbHlMb2dMZXZlbEZpbHRlcihsZXZlbCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciBcIlNob3cgTG9nXCIgYnV0dG9uIGNsaWNrIChkZWxlZ2F0ZWQpXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcjc2hvdy1sYXN0LWxvZycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy51cGRhdGVMb2dGcm9tU2VydmVyKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIExpc3RlbiBmb3IgaGFzaCBjaGFuZ2VzIHRvIHVwZGF0ZSBzZWxlY3RlZCBmaWxlXG4gICAgICAgICQod2luZG93KS5vbignaGFzaGNoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmhhbmRsZUhhc2hDaGFuZ2UoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIFwiRG93bmxvYWQgTG9nXCIgYnV0dG9uIGNsaWNrIChkZWxlZ2F0ZWQpXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcjZG93bmxvYWQtZmlsZScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCBkYXRhID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICAgICAgU3lzbG9nQVBJLmRvd25sb2FkTG9nRmlsZShkYXRhLmZpbGVuYW1lLCB0cnVlLCBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jYkRvd25sb2FkRmlsZSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciBcIkF1dG8gUmVmcmVzaFwiIGJ1dHRvbiBjbGljayAoZGVsZWdhdGVkKVxuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnI3Nob3ctbGFzdC1sb2ctYXV0bycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkYnV0dG9uID0gJCgnI3Nob3ctbGFzdC1sb2ctYXV0bycpO1xuICAgICAgICAgICAgY29uc3QgJHJlbG9hZEljb24gPSAkYnV0dG9uLmZpbmQoJy5pY29ucyBpLnJlZnJlc2gnKTtcbiAgICAgICAgICAgIGlmICgkcmVsb2FkSWNvbi5oYXNDbGFzcygnbG9hZGluZycpKSB7XG4gICAgICAgICAgICAgICAgJHJlbG9hZEljb24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB1cGRhdGVMb2dWaWV3V29ya2VyLnN0b3AoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHJlbG9hZEljb24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHVwZGF0ZUxvZ1ZpZXdXb3JrZXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgdGhlIFwiRXJhc2UgZmlsZVwiIGJ1dHRvbiBjbGljayAoZGVsZWdhdGVkKVxuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnI2VyYXNlLWZpbGUnLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuZXJhc2VDdXJyZW50RmlsZUNvbnRlbnQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIFwiQ2xlYXIgRmlsdGVyXCIgYnV0dG9uIGNsaWNrIChkZWxlZ2F0ZWQpXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcjY2xlYXItZmlsdGVyLWJ0bicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZmlsdGVyJywgJycpO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudXBkYXRlTG9nRnJvbVNlcnZlcigpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgRW50ZXIga2V5cHJlc3Mgb25seSBvbiBmaWx0ZXIgaW5wdXQgZmllbGRcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2tleXVwJywgJyNmaWx0ZXInLCAoZXZlbnQpID0+IHtcbiAgICAgICAgICAgIGlmIChldmVudC5rZXkgPT09ICdFbnRlcicpIHtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy51cGRhdGVMb2dGcm9tU2VydmVyKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciBGdWxsc2NyZWVuIGJ1dHRvbiBjbGlja1xuICAgICAgICAkKCcuZnVsbHNjcmVlbi10b2dnbGUtYnRuJykub24oJ2NsaWNrJywgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudG9nZ2xlRnVsbFNjcmVlbik7XG5cbiAgICAgICAgLy8gTGlzdGVuaW5nIGZvciB0aGUgZnVsbHNjcmVlbiBjaGFuZ2UgZXZlbnRcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignZnVsbHNjcmVlbmNoYW5nZScsIHN5c3RlbURpYWdub3N0aWNMb2dzLmFkanVzdExvZ0hlaWdodCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbCBoZWlnaHQgY2FsY3VsYXRpb25cbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuYWRqdXN0TG9nSGVpZ2h0KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZXMgdGhlIGZ1bGwtc2NyZWVuIG1vZGUgb2YgdGhlICdzeXN0ZW0tbG9ncy1zZWdtZW50JyBlbGVtZW50LlxuICAgICAqIElmIHRoZSBlbGVtZW50IGlzIG5vdCBpbiBmdWxsLXNjcmVlbiBtb2RlLCBpdCByZXF1ZXN0cyBmdWxsLXNjcmVlbiBtb2RlLlxuICAgICAqIElmIHRoZSBlbGVtZW50IGlzIGFscmVhZHkgaW4gZnVsbC1zY3JlZW4gbW9kZSwgaXQgZXhpdHMgZnVsbC1zY3JlZW4gbW9kZS5cbiAgICAgKiBMb2dzIGFuIGVycm9yIG1lc3NhZ2UgdG8gdGhlIGNvbnNvbGUgaWYgdGhlcmUgaXMgYW4gaXNzdWUgZW5hYmxpbmcgZnVsbC1zY3JlZW4gbW9kZS5cbiAgICAgKlxuICAgICAqIEByZXR1cm4ge3ZvaWR9XG4gICAgICovXG4gICAgdG9nZ2xlRnVsbFNjcmVlbigpIHtcbiAgICAgICAgY29uc3QgbG9nQ29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3N5c3RlbS1sb2dzLXNlZ21lbnQnKTtcblxuICAgICAgICBpZiAoIWRvY3VtZW50LmZ1bGxzY3JlZW5FbGVtZW50KSB7XG4gICAgICAgICAgICBsb2dDb250YWluZXIucmVxdWVzdEZ1bGxzY3JlZW4oKS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgYXR0ZW1wdGluZyB0byBlbmFibGUgZnVsbC1zY3JlZW4gbW9kZTogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZG9jdW1lbnQuZXhpdEZ1bGxzY3JlZW4oKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGdW5jdGlvbiB0byBhZGp1c3QgdGhlIGhlaWdodCBvZiB0aGUgbG9ncyBkZXBlbmRpbmcgb24gdGhlIHNjcmVlbiBtb2RlLlxuICAgICAqL1xuICAgIGFkanVzdExvZ0hlaWdodCgpIHtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBsZXQgYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGxvZ0NvbnRlbnQub2Zmc2V0KCkudG9wIC0gNTU7XG4gICAgICAgICAgICBpZiAoZG9jdW1lbnQuZnVsbHNjcmVlbkVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiBmdWxsc2NyZWVuIG1vZGUgaXMgYWN0aXZlXG4gICAgICAgICAgICAgICAgYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gODA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBSZWNhbGN1bGF0ZSB0aGUgc2l6ZSBvZiB0aGUgQUNFIGVkaXRvclxuICAgICAgICAgICAgJCgnLmxvZy1jb250ZW50LXJlYWRvbmx5JykuY3NzKCdtaW4taGVpZ2h0JywgIGAke2FjZUhlaWdodH1weGApO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnJlc2l6ZSgpO1xuICAgICAgICB9LCAzMDApO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBsb2cgbGV2ZWwgZHJvcGRvd24gLSBWNS4wIHBhdHRlcm4gd2l0aCBIVE1MIGljb25zXG4gICAgICogU3RhdGljIGRyb3Bkb3duIHdpdGggY29sb3JlZCBpY29ucyBhbmQgdHJhbnNsYXRpb25zXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUxvZ0xldmVsRHJvcGRvd24oKSB7XG4gICAgICAgIGNvbnN0ICRoaWRkZW5JbnB1dCA9ICQoJyNsb2dMZXZlbCcpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGRyb3Bkb3duIGFscmVhZHkgZXhpc3RzXG4gICAgICAgIGlmICgkKCcjbG9nTGV2ZWwtZHJvcGRvd24nKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENyZWF0ZSBkcm9wZG93biBIVE1MIHdpdGggY29sb3JlZCBpY29uc1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCc8ZGl2PicsIHtcbiAgICAgICAgICAgIGlkOiAnbG9nTGV2ZWwtZHJvcGRvd24nLFxuICAgICAgICAgICAgY2xhc3M6ICd1aSBzZWxlY3Rpb24gZHJvcGRvd24nXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0ICR0ZXh0ID0gJCgnPGRpdj4nLCB7IGNsYXNzOiAndGV4dCcgfSkudGV4dChnbG9iYWxUcmFuc2xhdGUuc2RfQWxsTGV2ZWxzKTtcbiAgICAgICAgY29uc3QgJGljb24gPSAkKCc8aT4nLCB7IGNsYXNzOiAnZHJvcGRvd24gaWNvbicgfSk7XG4gICAgICAgIGNvbnN0ICRtZW51ID0gJCgnPGRpdj4nLCB7IGNsYXNzOiAnbWVudScgfSk7XG5cbiAgICAgICAgLy8gQnVpbGQgbWVudSBpdGVtcyB3aXRoIGNvbG9yZWQgaWNvbnNcbiAgICAgICAgY29uc3QgaXRlbXMgPSBbXG4gICAgICAgICAgICB7IHZhbHVlOiAnJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnNkX0FsbExldmVscywgaWNvbjogJycgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdFUlJPUicsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5zZF9FcnJvciwgaWNvbjogJzxpIGNsYXNzPVwiZXhjbGFtYXRpb24gY2lyY2xlIHJlZCBpY29uXCI+PC9pPicgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdXQVJOSU5HJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnNkX1dhcm5pbmcsIGljb246ICc8aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIG9yYW5nZSBpY29uXCI+PC9pPicgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdOT1RJQ0UnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc2RfTm90aWNlLCBpY29uOiAnPGkgY2xhc3M9XCJpbmZvIGNpcmNsZSBibHVlIGljb25cIj48L2k+JyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ0lORk8nLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc2RfSW5mbywgaWNvbjogJzxpIGNsYXNzPVwiY2lyY2xlIGdyZXkgaWNvblwiPjwvaT4nIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAnREVCVUcnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc2RfRGVidWcsIGljb246ICc8aSBjbGFzcz1cImJ1ZyBwdXJwbGUgaWNvblwiPjwvaT4nIH1cbiAgICAgICAgXTtcblxuICAgICAgICBpdGVtcy5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICAgICAgY29uc3QgJGl0ZW0gPSAkKCc8ZGl2PicsIHtcbiAgICAgICAgICAgICAgICBjbGFzczogJ2l0ZW0nLFxuICAgICAgICAgICAgICAgICdkYXRhLXZhbHVlJzogaXRlbS52YWx1ZVxuICAgICAgICAgICAgfSkuaHRtbChpdGVtLmljb24gKyBpdGVtLnRleHQpO1xuICAgICAgICAgICAgJG1lbnUuYXBwZW5kKCRpdGVtKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJGRyb3Bkb3duLmFwcGVuZCgkdGV4dCwgJGljb24sICRtZW51KTtcbiAgICAgICAgJGhpZGRlbklucHV0LmFmdGVyKCRkcm9wZG93bik7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTZW1hbnRpYyBVSSBkcm9wZG93blxuICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICRoaWRkZW5JbnB1dC52YWwodmFsdWUpLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgZHJvcGRvd24gVUkgZWxlbWVudCBmcm9tIGhpZGRlbiBpbnB1dCBmaWVsZCAoVjUuMCBwYXR0ZXJuKVxuICAgICAqL1xuICAgIGNyZWF0ZURyb3Bkb3duRnJvbUhpZGRlbklucHV0KCkge1xuICAgICAgICBjb25zdCAkaGlkZGVuSW5wdXQgPSAkKCcjZmlsZW5hbWVzJyk7XG5cbiAgICAgICAgaWYgKCEkaGlkZGVuSW5wdXQubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdIaWRkZW4gaW5wdXQgI2ZpbGVuYW1lcyBub3QgZm91bmQnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJzxkaXY+Jywge1xuICAgICAgICAgICAgaWQ6ICdmaWxlbmFtZXMtZHJvcGRvd24nLFxuICAgICAgICAgICAgY2xhc3M6ICd1aSBzZWFyY2ggc2VsZWN0aW9uIGRyb3Bkb3duIGZpbGVuYW1lcy1zZWxlY3QgZmx1aWQnXG4gICAgICAgIH0pO1xuXG4gICAgICAgICRkcm9wZG93bi5hcHBlbmQoXG4gICAgICAgICAgICAkKCc8aT4nLCB7IGNsYXNzOiAnZHJvcGRvd24gaWNvbicgfSksXG4gICAgICAgICAgICAkKCc8aW5wdXQ+JywgeyB0eXBlOiAndGV4dCcsIGNsYXNzOiAnc2VhcmNoJywgdGFiaW5kZXg6IDAgfSksXG4gICAgICAgICAgICAkKCc8ZGl2PicsIHsgY2xhc3M6ICdkZWZhdWx0IHRleHQnIH0pLnRleHQoJ1NlbGVjdCBsb2cgZmlsZScpLFxuICAgICAgICAgICAgJCgnPGRpdj4nLCB7IGNsYXNzOiAnbWVudScgfSlcbiAgICAgICAgKTtcblxuICAgICAgICAkaGlkZGVuSW5wdXQuYmVmb3JlKCRkcm9wZG93bik7XG4gICAgICAgICRoaWRkZW5JbnB1dC5oaWRlKCk7XG5cbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93biA9ICRkcm9wZG93bjtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIEFDRSBlZGl0b3IgZm9yIGxvZyB2aWV3aW5nLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVBY2UoKSB7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlciA9IGFjZS5lZGl0KCdsb2ctY29udGVudC1yZWFkb25seScpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIHRoZSBKdWxpYSBtb2RlIGlzIGF2YWlsYWJsZVxuICAgICAgICBjb25zdCBqdWxpYSA9IGFjZS5yZXF1aXJlKCdhY2UvbW9kZS9qdWxpYScpO1xuICAgICAgICBpZiAoanVsaWEgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgLy8gU2V0IHRoZSBtb2RlIHRvIEp1bGlhIGlmIGF2YWlsYWJsZVxuICAgICAgICAgICAgY29uc3QgSW5pTW9kZSA9IGp1bGlhLk1vZGU7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIuc2Vzc2lvbi5zZXRNb2RlKG5ldyBJbmlNb2RlKCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0IHRoZSB0aGVtZSBhbmQgb3B0aW9ucyBmb3IgdGhlIEFDRSBlZGl0b3JcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIucmVuZGVyZXIuc2V0U2hvd0d1dHRlcihmYWxzZSk7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlci5zZXRPcHRpb25zKHtcbiAgICAgICAgICAgIHNob3dMaW5lTnVtYmVyczogZmFsc2UsXG4gICAgICAgICAgICBzaG93UHJpbnRNYXJnaW46IGZhbHNlLFxuICAgICAgICAgICAgcmVhZE9ubHk6IHRydWUsXG4gICAgICAgIH0pO1xuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJ1aWxkcyBhIGhpZXJhcmNoaWNhbCB0cmVlIHN0cnVjdHVyZSBmcm9tIGZsYXQgZmlsZSBwYXRoc1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBmaWxlcyAtIFRoZSBmaWxlcyBvYmplY3QgZnJvbSBBUEkgcmVzcG9uc2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZGVmYXVsdFBhdGggLSBUaGUgZGVmYXVsdCBzZWxlY3RlZCBmaWxlIHBhdGhcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IFRyZWUgc3RydWN0dXJlIGZvciB0aGUgZHJvcGRvd25cbiAgICAgKi9cbiAgICBidWlsZFRyZWVTdHJ1Y3R1cmUoZmlsZXMsIGRlZmF1bHRQYXRoKSB7XG4gICAgICAgIGNvbnN0IHRyZWUgPSB7fTtcbiAgICAgICAgXG4gICAgICAgIC8vIEJ1aWxkIHRoZSB0cmVlIHN0cnVjdHVyZVxuICAgICAgICBPYmplY3QuZW50cmllcyhmaWxlcykuZm9yRWFjaCgoW2tleSwgZmlsZURhdGFdKSA9PiB7XG4gICAgICAgICAgICAvLyBVc2UgZmlsZURhdGEucGF0aCBhcyB0aGUgYWN0dWFsIGZpbGUgcGF0aFxuICAgICAgICAgICAgY29uc3QgZmlsZVBhdGggPSBmaWxlRGF0YS5wYXRoIHx8IGtleTtcbiAgICAgICAgICAgIGNvbnN0IHBhcnRzID0gZmlsZVBhdGguc3BsaXQoJy8nKTtcbiAgICAgICAgICAgIGxldCBjdXJyZW50ID0gdHJlZTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgcGFydHMuZm9yRWFjaCgocGFydCwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoaW5kZXggPT09IHBhcnRzLmxlbmd0aCAtIDEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBpcyBhIGZpbGVcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudFtwYXJ0XSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdmaWxlJyxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhdGg6IGZpbGVQYXRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgc2l6ZTogZmlsZURhdGEuc2l6ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6IChkZWZhdWx0UGF0aCAmJiBkZWZhdWx0UGF0aCA9PT0gZmlsZVBhdGgpIHx8ICghZGVmYXVsdFBhdGggJiYgZmlsZURhdGEuZGVmYXVsdClcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBUaGlzIGlzIGEgZGlyZWN0b3J5XG4gICAgICAgICAgICAgICAgICAgIGlmICghY3VycmVudFtwYXJ0XSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudFtwYXJ0XSA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZm9sZGVyJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjoge31cbiAgICAgICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY3VycmVudCA9IGN1cnJlbnRbcGFydF0uY2hpbGRyZW47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29udmVydCB0cmVlIHRvIGRyb3Bkb3duIGl0ZW1zXG4gICAgICAgIHJldHVybiB0aGlzLnRyZWVUb0Ryb3Bkb3duSXRlbXModHJlZSwgJycpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ29udmVydHMgdHJlZSBzdHJ1Y3R1cmUgdG8gZHJvcGRvd24gaXRlbXMgd2l0aCBwcm9wZXIgZm9ybWF0dGluZ1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSB0cmVlIC0gVGhlIHRyZWUgc3RydWN0dXJlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHByZWZpeCAtIFByZWZpeCBmb3IgaW5kZW50YXRpb25cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyZW50Rm9sZGVyIC0gUGFyZW50IGZvbGRlciBuYW1lIGZvciBncm91cGluZ1xuICAgICAqIEByZXR1cm5zIHtBcnJheX0gRm9ybWF0dGVkIGRyb3Bkb3duIGl0ZW1zXG4gICAgICovXG4gICAgdHJlZVRvRHJvcGRvd25JdGVtcyh0cmVlLCBwcmVmaXgsIHBhcmVudEZvbGRlciA9ICcnKSB7XG4gICAgICAgIGNvbnN0IGl0ZW1zID0gW107XG5cbiAgICAgICAgLy8gU29ydCBlbnRyaWVzOiBmb2xkZXJzIGZpcnN0LCB0aGVuIGZpbGVzXG4gICAgICAgIGNvbnN0IGVudHJpZXMgPSBPYmplY3QuZW50cmllcyh0cmVlKS5zb3J0KChbYUtleSwgYVZhbF0sIFtiS2V5LCBiVmFsXSkgPT4ge1xuICAgICAgICAgICAgaWYgKGFWYWwudHlwZSA9PT0gJ2ZvbGRlcicgJiYgYlZhbC50eXBlID09PSAnZmlsZScpIHJldHVybiAtMTtcbiAgICAgICAgICAgIGlmIChhVmFsLnR5cGUgPT09ICdmaWxlJyAmJiBiVmFsLnR5cGUgPT09ICdmb2xkZXInKSByZXR1cm4gMTtcbiAgICAgICAgICAgIHJldHVybiBhS2V5LmxvY2FsZUNvbXBhcmUoYktleSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGVudHJpZXMuZm9yRWFjaCgoW2tleSwgdmFsdWVdKSA9PiB7XG4gICAgICAgICAgICBpZiAodmFsdWUudHlwZSA9PT0gJ2ZvbGRlcicpIHtcbiAgICAgICAgICAgICAgICAvLyBBZGQgZm9sZGVyIGhlYWRlciB3aXRoIHRvZ2dsZSBjYXBhYmlsaXR5XG4gICAgICAgICAgICAgICAgaXRlbXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGA8aSBjbGFzcz1cImNhcmV0IGRvd24gaWNvbiBmb2xkZXItdG9nZ2xlXCI+PC9pPjxpIGNsYXNzPVwiZm9sZGVyIGljb25cIj48L2k+ICR7a2V5fWAsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdmb2xkZXInLFxuICAgICAgICAgICAgICAgICAgICBmb2xkZXJOYW1lOiBrZXlcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIEFkZCBjaGlsZHJlbiB3aXRoIGluY3JlYXNlZCBpbmRlbnRhdGlvbiBhbmQgcGFyZW50IGZvbGRlciByZWZlcmVuY2VcbiAgICAgICAgICAgICAgICBjb25zdCBjaGlsZEl0ZW1zID0gdGhpcy50cmVlVG9Ecm9wZG93bkl0ZW1zKHZhbHVlLmNoaWxkcmVuLCBwcmVmaXggKyAnJm5ic3A7Jm5ic3A7Jm5ic3A7Jm5ic3A7Jywga2V5KTtcbiAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKC4uLmNoaWxkSXRlbXMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBBZGQgZmlsZSBpdGVtIHdpdGggcGFyZW50IGZvbGRlciByZWZlcmVuY2VcbiAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogYCR7cHJlZml4fTxpIGNsYXNzPVwiZmlsZSBvdXRsaW5lIGljb25cIj48L2k+ICR7a2V5fSAoJHt2YWx1ZS5zaXplfSlgLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWUucGF0aCxcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWQ6IHZhbHVlLmRlZmF1bHQsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdmaWxlJyxcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50Rm9sZGVyOiBwYXJlbnRGb2xkZXJcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIGl0ZW1zO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBjdXN0b20gZHJvcGRvd24gbWVudSBIVE1MIGZvciBsb2cgZmlsZXMgd2l0aCBjb2xsYXBzaWJsZSBmb2xkZXJzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGNvbnRhaW5pbmcgZHJvcGRvd24gbWVudSBvcHRpb25zXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGZpZWxkcyAtIFRoZSBmaWVsZHMgaW4gdGhlIHJlc3BvbnNlIHRvIHVzZSBmb3IgdGhlIG1lbnUgb3B0aW9uc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBIVE1MIHN0cmluZyBmb3IgdGhlIGN1c3RvbSBkcm9wZG93biBtZW51XG4gICAgICovXG4gICAgY3VzdG9tRHJvcGRvd25NZW51KHJlc3BvbnNlLCBmaWVsZHMpIHtcbiAgICAgICAgY29uc3QgdmFsdWVzID0gcmVzcG9uc2VbZmllbGRzLnZhbHVlc10gfHwge307XG4gICAgICAgIGxldCBodG1sID0gJyc7XG5cbiAgICAgICAgJC5lYWNoKHZhbHVlcywgKGluZGV4LCBvcHRpb24pID0+IHtcbiAgICAgICAgICAgIC8vIEZvciB0cmVlIHN0cnVjdHVyZSBpdGVtc1xuICAgICAgICAgICAgaWYgKHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtcyAmJiBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXNbaW5kZXhdKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXRlbSA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtc1tpbmRleF07XG5cbiAgICAgICAgICAgICAgICBpZiAoaXRlbS50eXBlID09PSAnZm9sZGVyJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBGb2xkZXIgaXRlbSAtIGNsaWNrYWJsZSBoZWFkZXIgZm9yIGNvbGxhcHNlL2V4cGFuZFxuICAgICAgICAgICAgICAgICAgICAvLyBOb3QgdXNpbmcgJ2Rpc2FibGVkJyBjbGFzcyBhcyBpdCBibG9ja3MgcG9pbnRlciBldmVudHNcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImZvbGRlci1oZWFkZXIgaXRlbVwiIGRhdGEtZm9sZGVyPVwiJHtpdGVtLmZvbGRlck5hbWV9XCIgZGF0YS12YWx1ZT1cIlwiIHN0eWxlPVwicG9pbnRlci1ldmVudHM6IGF1dG8gIWltcG9ydGFudDsgY3Vyc29yOiBwb2ludGVyOyBmb250LXdlaWdodDogYm9sZDsgYmFja2dyb3VuZDogI2Y5ZjlmOTtcIj4ke2l0ZW0ubmFtZX08L2Rpdj5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZpbGUgaXRlbSB3aXRoIHBhcmVudCBmb2xkZXIgcmVmZXJlbmNlIGZvciBjb2xsYXBzZVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RlZCA9IGl0ZW0uc2VsZWN0ZWQgPyAnc2VsZWN0ZWQgYWN0aXZlJyA6ICcnO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJlbnRBdHRyID0gaXRlbS5wYXJlbnRGb2xkZXIgPyBgZGF0YS1wYXJlbnQ9XCIke2l0ZW0ucGFyZW50Rm9sZGVyfVwiYCA6ICcnO1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbSBmaWxlLWl0ZW0gJHtzZWxlY3RlZH1cIiBkYXRhLXZhbHVlPVwiJHtvcHRpb25bZmllbGRzLnZhbHVlXX1cIiAke3BhcmVudEF0dHJ9PiR7aXRlbS5uYW1lfTwvZGl2PmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBGYWxsYmFjayB0byByZWd1bGFyIGl0ZW1cbiAgICAgICAgICAgICAgICBjb25zdCBtYXliZURpc2FibGVkID0gKG9wdGlvbltmaWVsZHMuZGlzYWJsZWRdKSA/ICdkaXNhYmxlZCAnIDogJyc7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIiR7bWF5YmVEaXNhYmxlZH1pdGVtXCIgZGF0YS12YWx1ZT1cIiR7b3B0aW9uW2ZpZWxkcy52YWx1ZV19XCI+JHtvcHRpb25bZmllbGRzLm5hbWVdfTwvZGl2PmA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyBmb2xkZXIgY29sbGFwc2UvZXhwYW5kIGhhbmRsZXJzIGFuZCBzZWFyY2ggYmVoYXZpb3JcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9sZGVySGFuZGxlcnMoKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9IHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd247XG5cbiAgICAgICAgLy8gSGFuZGxlIGZvbGRlciBoZWFkZXIgY2xpY2tzIGZvciBjb2xsYXBzZS9leHBhbmRcbiAgICAgICAgLy8gVXNlIGRvY3VtZW50LWxldmVsIGhhbmRsZXIgd2l0aCBjYXB0dXJlIHBoYXNlIHRvIGludGVyY2VwdCBiZWZvcmUgRm9tYW50aWNcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgY2xpY2sgaXMgaW5zaWRlIG91ciBkcm9wZG93bidzIGZvbGRlci1oZWFkZXJcbiAgICAgICAgICAgIGNvbnN0IGZvbGRlckhlYWRlciA9IGUudGFyZ2V0LmNsb3Nlc3QoJyNmaWxlbmFtZXMtZHJvcGRvd24gLmZvbGRlci1oZWFkZXInKTtcbiAgICAgICAgICAgIGlmICghZm9sZGVySGVhZGVyKSByZXR1cm47XG5cbiAgICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgIGNvbnN0ICRmb2xkZXIgPSAkKGZvbGRlckhlYWRlcik7XG4gICAgICAgICAgICBjb25zdCBmb2xkZXJOYW1lID0gJGZvbGRlci5kYXRhKCdmb2xkZXInKTtcbiAgICAgICAgICAgIGNvbnN0ICR0b2dnbGUgPSAkZm9sZGVyLmZpbmQoJy5mb2xkZXItdG9nZ2xlJyk7XG4gICAgICAgICAgICBjb25zdCAkbWVudSA9ICRkcm9wZG93bi5maW5kKCcubWVudScpO1xuICAgICAgICAgICAgY29uc3QgJGZpbGVzID0gJG1lbnUuZmluZChgLmZpbGUtaXRlbVtkYXRhLXBhcmVudD1cIiR7Zm9sZGVyTmFtZX1cIl1gKTtcblxuICAgICAgICAgICAgLy8gVG9nZ2xlIGZvbGRlciBzdGF0ZVxuICAgICAgICAgICAgY29uc3QgaXNDb2xsYXBzZWQgPSAkdG9nZ2xlLmhhc0NsYXNzKCdyaWdodCcpO1xuXG4gICAgICAgICAgICBpZiAoaXNDb2xsYXBzZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBFeHBhbmQgZm9sZGVyXG4gICAgICAgICAgICAgICAgJHRvZ2dsZS5yZW1vdmVDbGFzcygncmlnaHQnKS5hZGRDbGFzcygnZG93bicpO1xuICAgICAgICAgICAgICAgICRmaWxlcy5zaG93KCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIENvbGxhcHNlIGZvbGRlclxuICAgICAgICAgICAgICAgICR0b2dnbGUucmVtb3ZlQ2xhc3MoJ2Rvd24nKS5hZGRDbGFzcygncmlnaHQnKTtcbiAgICAgICAgICAgICAgICAkZmlsZXMuaGlkZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTsgLy8gY2FwdHVyZSBwaGFzZSAtIGZpcmVzIGJlZm9yZSBidWJibGluZ1xuXG4gICAgICAgIC8vIEhhbmRsZSBzZWFyY2ggaW5wdXQgLSBzaG93IGFsbCBpdGVtcyB3aGVuIHNlYXJjaGluZ1xuICAgICAgICAkZHJvcGRvd24ub24oJ2lucHV0JywgJ2lucHV0LnNlYXJjaCcsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBzZWFyY2hWYWx1ZSA9ICQoZS50YXJnZXQpLnZhbCgpLnRyaW0oKTtcbiAgICAgICAgICAgIGNvbnN0ICRtZW51ID0gJGRyb3Bkb3duLmZpbmQoJy5tZW51Jyk7XG5cbiAgICAgICAgICAgIGlmIChzZWFyY2hWYWx1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBhbGwgaXRlbXMgYW5kIGV4cGFuZCBhbGwgZm9sZGVycyBkdXJpbmcgc2VhcmNoXG4gICAgICAgICAgICAgICAgJG1lbnUuZmluZCgnLmZpbGUtaXRlbScpLnNob3coKTtcbiAgICAgICAgICAgICAgICAkbWVudS5maW5kKCcuZm9sZGVyLXRvZ2dsZScpLnJlbW92ZUNsYXNzKCdyaWdodCcpLmFkZENsYXNzKCdkb3duJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFJlc3RvcmUgY29sbGFwc2VkIHN0YXRlIHdoZW4gc2VhcmNoIGlzIGNsZWFyZWRcbiAgICAgICAgICAgICAgICAkbWVudS5maW5kKCcuZm9sZGVyLWhlYWRlcicpLmVhY2goKF8sIGZvbGRlcikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkZm9sZGVyID0gJChmb2xkZXIpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmb2xkZXJOYW1lID0gJGZvbGRlci5kYXRhKCdmb2xkZXInKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNDb2xsYXBzZWQgPSAkZm9sZGVyLmZpbmQoJy5mb2xkZXItdG9nZ2xlJykuaGFzQ2xhc3MoJ3JpZ2h0Jyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0NvbGxhcHNlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJG1lbnUuZmluZChgLmZpbGUtaXRlbVtkYXRhLXBhcmVudD1cIiR7Zm9sZGVyTmFtZX1cIl1gKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEV4cGFuZHMgdGhlIGZvbGRlciBjb250YWluaW5nIHRoZSBzcGVjaWZpZWQgZmlsZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlUGF0aCAtIFRoZSBmaWxlIHBhdGggdG8gZmluZCBhbmQgZXhwYW5kIGl0cyBwYXJlbnQgZm9sZGVyXG4gICAgICovXG4gICAgZXhwYW5kRm9sZGVyRm9yRmlsZShmaWxlUGF0aCkge1xuICAgICAgICBpZiAoIWZpbGVQYXRoKSByZXR1cm47XG5cbiAgICAgICAgY29uc3QgJG1lbnUgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmZpbmQoJy5tZW51Jyk7XG4gICAgICAgIGNvbnN0ICRmaWxlSXRlbSA9ICRtZW51LmZpbmQoYC5maWxlLWl0ZW1bZGF0YS12YWx1ZT1cIiR7ZmlsZVBhdGh9XCJdYCk7XG5cbiAgICAgICAgaWYgKCRmaWxlSXRlbS5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IHBhcmVudEZvbGRlciA9ICRmaWxlSXRlbS5kYXRhKCdwYXJlbnQnKTtcbiAgICAgICAgICAgIGlmIChwYXJlbnRGb2xkZXIpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkZm9sZGVyID0gJG1lbnUuZmluZChgLmZvbGRlci1oZWFkZXJbZGF0YS1mb2xkZXI9XCIke3BhcmVudEZvbGRlcn1cIl1gKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkdG9nZ2xlID0gJGZvbGRlci5maW5kKCcuZm9sZGVyLXRvZ2dsZScpO1xuXG4gICAgICAgICAgICAgICAgLy8gRXhwYW5kIGlmIGNvbGxhcHNlZFxuICAgICAgICAgICAgICAgIGlmICgkdG9nZ2xlLmhhc0NsYXNzKCdyaWdodCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICR0b2dnbGUucmVtb3ZlQ2xhc3MoJ3JpZ2h0JykuYWRkQ2xhc3MoJ2Rvd24nKTtcbiAgICAgICAgICAgICAgICAgICAgJG1lbnUuZmluZChgLmZpbGUtaXRlbVtkYXRhLXBhcmVudD1cIiR7cGFyZW50Rm9sZGVyfVwiXWApLnNob3coKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlcyBoYXNoIGNoYW5nZXMgdG8gdXBkYXRlIHRoZSBzZWxlY3RlZCBmaWxlXG4gICAgICovXG4gICAgaGFuZGxlSGFzaENoYW5nZSgpIHtcbiAgICAgICAgLy8gU2tpcCBkdXJpbmcgaW5pdGlhbGl6YXRpb24gdG8gcHJldmVudCBkdXBsaWNhdGUgQVBJIGNhbGxzXG4gICAgICAgIGlmIChzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0luaXRpYWxpemluZykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaGFzaCA9IHdpbmRvdy5sb2NhdGlvbi5oYXNoO1xuICAgICAgICBpZiAoaGFzaCAmJiBoYXNoLnN0YXJ0c1dpdGgoJyNmaWxlPScpKSB7XG4gICAgICAgICAgICBjb25zdCBmaWxlUGF0aCA9IGRlY29kZVVSSUNvbXBvbmVudChoYXNoLnN1YnN0cmluZyg2KSk7XG4gICAgICAgICAgICBpZiAoZmlsZVBhdGggJiYgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignZ2V0IHZhbHVlJykgIT09IGZpbGVQYXRoKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIGZpbGUgZXhpc3RzIGluIGRyb3Bkb3duIGl0ZW1zXG4gICAgICAgICAgICAgICAgY29uc3QgZmlsZUV4aXN0cyA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtcy5zb21lKGl0ZW0gPT5cbiAgICAgICAgICAgICAgICAgICAgaXRlbS50eXBlID09PSAnZmlsZScgJiYgaXRlbS52YWx1ZSA9PT0gZmlsZVBhdGhcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIGlmIChmaWxlRXhpc3RzKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEV4cGFuZCBwYXJlbnQgZm9sZGVyIGJlZm9yZSBzZWxlY3RpbmcgZmlsZVxuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5leHBhbmRGb2xkZXJGb3JGaWxlKGZpbGVQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgZmlsZVBhdGgpO1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXQgdGV4dCcsIGZpbGVQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2ZpbGVuYW1lJywgZmlsZVBhdGgpO1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy51cGRhdGVMb2dGcm9tU2VydmVyKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIGZpbGUgcGF0aCBmcm9tIFVSTCBoYXNoIGlmIHByZXNlbnRcbiAgICAgKi9cbiAgICBnZXRGaWxlRnJvbUhhc2goKSB7XG4gICAgICAgIGNvbnN0IGhhc2ggPSB3aW5kb3cubG9jYXRpb24uaGFzaDtcbiAgICAgICAgaWYgKGhhc2ggJiYgaGFzaC5zdGFydHNXaXRoKCcjZmlsZT0nKSkge1xuICAgICAgICAgICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChoYXNoLnN1YnN0cmluZyg2KSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICcnO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBmb3JtYXQgdGhlIGRyb3Bkb3duIG1lbnUgc3RydWN0dXJlIGJhc2VkIG9uIHRoZSByZXNwb25zZS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZGF0YS5cbiAgICAgKi9cbiAgICBjYkZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSkge1xuICAgICAgICAvLyBDaGVjayBpZiByZXNwb25zZSBpcyB2YWxpZFxuICAgICAgICBpZiAoIXJlc3BvbnNlIHx8ICFyZXNwb25zZS5yZXN1bHQgfHwgIXJlc3BvbnNlLmRhdGEgfHwgIXJlc3BvbnNlLmRhdGEuZmlsZXMpIHtcbiAgICAgICAgICAgIC8vIEhpZGUgZGltbWVyIG9ubHkgaWYgbm90IGluIGF1dG8tdXBkYXRlIG1vZGVcbiAgICAgICAgICAgIGlmICghc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBmaWxlcyA9IHJlc3BvbnNlLmRhdGEuZmlsZXM7XG5cbiAgICAgICAgLy8gQ2hlY2sgZm9yIGZpbGUgZnJvbSBoYXNoIGZpcnN0XG4gICAgICAgIGxldCBkZWZWYWwgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5nZXRGaWxlRnJvbUhhc2goKTtcblxuICAgICAgICAvLyBJZiBubyBoYXNoIHZhbHVlLCBjaGVjayBpZiB0aGVyZSBpcyBhIGRlZmF1bHQgdmFsdWUgc2V0IGZvciB0aGUgZmlsZW5hbWUgaW5wdXQgZmllbGRcbiAgICAgICAgaWYgKCFkZWZWYWwpIHtcbiAgICAgICAgICAgIGNvbnN0IGZpbGVOYW1lID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2ZpbGVuYW1lJyk7XG4gICAgICAgICAgICBpZiAoZmlsZU5hbWUgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgZGVmVmFsID0gZmlsZU5hbWUudHJpbSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQnVpbGQgdHJlZSBzdHJ1Y3R1cmUgZnJvbSBmaWxlc1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXMgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5idWlsZFRyZWVTdHJ1Y3R1cmUoZmlsZXMsIGRlZlZhbCk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIHZhbHVlcyBhcnJheSBmb3IgZHJvcGRvd24gd2l0aCBhbGwgaXRlbXMgKGluY2x1ZGluZyBmb2xkZXJzKVxuICAgICAgICBjb25zdCBkcm9wZG93blZhbHVlcyA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtcy5tYXAoKGl0ZW0sIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBpZiAoaXRlbS50eXBlID09PSAnZm9sZGVyJykge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGl0ZW0ubmFtZS5yZXBsYWNlKC88W14+XSo+L2csICcnKSwgLy8gUmVtb3ZlIEhUTUwgdGFncyBmb3Igc2VhcmNoXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ6IHRydWVcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBpdGVtLm5hbWUucmVwbGFjZSgvPFtePl0qPi9nLCAnJyksIC8vIFJlbW92ZSBIVE1MIHRhZ3MgZm9yIHNlYXJjaFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogaXRlbS52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWQ6IGl0ZW0uc2VsZWN0ZWRcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBkcm9wZG93biB3aXRoIHZhbHVlc1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXR1cCBtZW51Jywge1xuICAgICAgICAgICAgdmFsdWVzOiBkcm9wZG93blZhbHVlc1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdGhlIGRlZmF1bHQgc2VsZWN0ZWQgdmFsdWUgaWYgYW55XG4gICAgICAgIGNvbnN0IHNlbGVjdGVkSXRlbSA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtcy5maW5kKGl0ZW0gPT4gaXRlbS5zZWxlY3RlZCk7XG4gICAgICAgIGlmIChzZWxlY3RlZEl0ZW0pIHtcbiAgICAgICAgICAgIC8vIFVzZSBzZXRUaW1lb3V0IHRvIGVuc3VyZSBkcm9wZG93biBpcyBmdWxseSBpbml0aWFsaXplZFxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gRXhwYW5kIHBhcmVudCBmb2xkZXIgYmVmb3JlIHNlbGVjdGluZyBmaWxlXG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuZXhwYW5kRm9sZGVyRm9yRmlsZShzZWxlY3RlZEl0ZW0udmFsdWUpO1xuICAgICAgICAgICAgICAgIC8vIFNldHRpbmcgc2VsZWN0ZWQgdmFsdWUgd2lsbCB0cmlnZ2VyIG9uQ2hhbmdlIGNhbGxiYWNrIHdoaWNoIGNhbGxzIHVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKVxuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHNlbGVjdGVkSXRlbS52YWx1ZSk7XG4gICAgICAgICAgICAgICAgLy8gRm9yY2UgcmVmcmVzaCB0aGUgZHJvcGRvd24gdG8gc2hvdyB0aGUgc2VsZWN0ZWQgdmFsdWVcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdyZWZyZXNoJyk7XG4gICAgICAgICAgICAgICAgLy8gQWxzbyBzZXQgdGhlIHRleHQgdG8gc2hvdyBmdWxsIHBhdGhcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXQgdGV4dCcsIHNlbGVjdGVkSXRlbS52YWx1ZSk7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2ZpbGVuYW1lJywgc2VsZWN0ZWRJdGVtLnZhbHVlKTtcbiAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZGVmVmFsKSB7XG4gICAgICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgZGVmYXVsdCB2YWx1ZSBidXQgbm8gaXRlbSB3YXMgbWFya2VkIGFzIHNlbGVjdGVkLFxuICAgICAgICAgICAgLy8gdHJ5IHRvIGZpbmQgYW5kIHNlbGVjdCBpdCBtYW51YWxseVxuICAgICAgICAgICAgY29uc3QgaXRlbVRvU2VsZWN0ID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zLmZpbmQoaXRlbSA9PlxuICAgICAgICAgICAgICAgIGl0ZW0udHlwZSA9PT0gJ2ZpbGUnICYmIGl0ZW0udmFsdWUgPT09IGRlZlZhbFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGlmIChpdGVtVG9TZWxlY3QpIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRXhwYW5kIHBhcmVudCBmb2xkZXIgYmVmb3JlIHNlbGVjdGluZyBmaWxlXG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmV4cGFuZEZvbGRlckZvckZpbGUoaXRlbVRvU2VsZWN0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0dGluZyBzZWxlY3RlZCB2YWx1ZSB3aWxsIHRyaWdnZXIgb25DaGFuZ2UgY2FsbGJhY2sgd2hpY2ggY2FsbHMgdXBkYXRlTG9nRnJvbVNlcnZlcigpXG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGl0ZW1Ub1NlbGVjdC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3JlZnJlc2gnKTtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignc2V0IHRleHQnLCBpdGVtVG9TZWxlY3QudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZmlsZW5hbWUnLCBpdGVtVG9TZWxlY3QudmFsdWUpO1xuICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEhpZGUgdGhlIGRpbW1lciBhZnRlciBsb2FkaW5nIG9ubHkgaWYgbm8gZmlsZSBpcyBzZWxlY3RlZFxuICAgICAgICAgICAgICAgIGlmICghc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEhpZGUgdGhlIGRpbW1lciBhZnRlciBsb2FkaW5nIG9ubHkgaWYgbm8gZmlsZSBpcyBzZWxlY3RlZFxuICAgICAgICAgICAgaWYgKCFzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1hcmsgaW5pdGlhbGl6YXRpb24gYXMgY29tcGxldGUgdG8gYWxsb3cgaGFzaGNoYW5nZSBoYW5kbGVyIHRvIHdvcmtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0luaXRpYWxpemluZyA9IGZhbHNlO1xuICAgICAgICB9LCAyMDApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBjaGFuZ2luZyB0aGUgbG9nIGZpbGUgaW4gdGhlIHNlbGVjdCBkcm9wZG93bi5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgc2VsZWN0ZWQgdmFsdWUuXG4gICAgICovXG4gICAgY2JPbkNoYW5nZUZpbGUodmFsdWUpIHtcbiAgICAgICAgaWYgKHZhbHVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0IGRyb3Bkb3duIHRleHQgdG8gc2hvdyB0aGUgZnVsbCBmaWxlIHBhdGhcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignc2V0IHRleHQnLCB2YWx1ZSk7XG5cbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2ZpbGVuYW1lJywgdmFsdWUpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBVUkwgaGFzaCB3aXRoIHRoZSBzZWxlY3RlZCBmaWxlXG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gJ2ZpbGU9JyArIGVuY29kZVVSSUNvbXBvbmVudCh2YWx1ZSk7XG5cbiAgICAgICAgLy8gUmVzZXQgZmlsdGVycyBvbmx5IGlmIHVzZXIgbWFudWFsbHkgY2hhbmdlZCB0aGUgZmlsZSAobm90IGR1cmluZyBpbml0aWFsaXphdGlvbilcbiAgICAgICAgaWYgKCFzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0luaXRpYWxpemluZykge1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MucmVzZXRGaWx0ZXJzKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBIaWRlIGF1dG8tcmVmcmVzaCBidXR0b24gZm9yIHJvdGF0ZWQgbG9nIGZpbGVzICh0aGV5IGRvbid0IGNoYW5nZSlcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudXBkYXRlQXV0b1JlZnJlc2hWaXNpYmlsaXR5KHZhbHVlKTtcblxuICAgICAgICAvLyBDaGVjayBpZiB0aW1lIHJhbmdlIGlzIGF2YWlsYWJsZSBmb3IgdGhpcyBmaWxlXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmNoZWNrVGltZVJhbmdlQXZhaWxhYmlsaXR5KHZhbHVlKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgZmlsZSBpcyBhIHJvdGF0ZWQgbG9nIGZpbGUgKGFyY2hpdmVkLCBubyBsb25nZXIgYmVpbmcgd3JpdHRlbiB0bylcbiAgICAgKiBSb3RhdGVkIGZpbGVzIGhhdmUgc3VmZml4ZXMgbGlrZTogLjAsIC4xLCAuMiwgLmd6LCAuMS5neiwgLjIuZ3osIGV0Yy5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZW5hbWUgLSBMb2cgZmlsZSBwYXRoXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgZmlsZSBpcyByb3RhdGVkL2FyY2hpdmVkXG4gICAgICovXG4gICAgaXNSb3RhdGVkTG9nRmlsZShmaWxlbmFtZSkge1xuICAgICAgICBpZiAoIWZpbGVuYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgLy8gTWF0Y2ggcGF0dGVybnM6IC4wLCAuMSwgLjIsIC4uLiwgLmd6LCAuMC5neiwgLjEuZ3osIGV0Yy5cbiAgICAgICAgcmV0dXJuIC9cXC5cXGQrKCR8XFwuZ3okKXxcXC5neiQvLnRlc3QoZmlsZW5hbWUpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgYXV0by1yZWZyZXNoIGJ1dHRvbiB2aXNpYmlsaXR5IGJhc2VkIG9uIGZpbGUgdHlwZVxuICAgICAqIEhpZGUgZm9yIHJvdGF0ZWQgZmlsZXMsIHNob3cgZm9yIGFjdGl2ZSBsb2cgZmlsZXNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZW5hbWUgLSBMb2cgZmlsZSBwYXRoXG4gICAgICovXG4gICAgdXBkYXRlQXV0b1JlZnJlc2hWaXNpYmlsaXR5KGZpbGVuYW1lKSB7XG4gICAgICAgIGNvbnN0ICRhdXRvQnRuID0gJCgnI3Nob3ctbGFzdC1sb2ctYXV0bycpO1xuICAgICAgICBjb25zdCBpc1JvdGF0ZWQgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc1JvdGF0ZWRMb2dGaWxlKGZpbGVuYW1lKTtcblxuICAgICAgICBpZiAoaXNSb3RhdGVkKSB7XG4gICAgICAgICAgICAvLyBTdG9wIGF1dG8tcmVmcmVzaCBpZiBpdCB3YXMgYWN0aXZlXG4gICAgICAgICAgICBpZiAoc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgJGF1dG9CdG4uZmluZCgnLmljb25zIGkucmVmcmVzaCcpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdXBkYXRlTG9nVmlld1dvcmtlci5zdG9wKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkYXV0b0J0bi5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkYXV0b0J0bi5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVzZXQgYWxsIGZpbHRlcnMgd2hlbiBjaGFuZ2luZyBsb2cgZmlsZXNcbiAgICAgKi9cbiAgICByZXNldEZpbHRlcnMoKSB7XG4gICAgICAgIC8vIERlYWN0aXZhdGUgYWxsIHF1aWNrLXBlcmlvZCBidXR0b25zXG4gICAgICAgICQoJy5wZXJpb2QtYnRuJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuXG4gICAgICAgIC8vIFJlc2V0IGxvZ0xldmVsIGRyb3Bkb3duIHRvIGRlZmF1bHQgKEFsbCBMZXZlbHMgLSBlbXB0eSB2YWx1ZSlcbiAgICAgICAgJCgnI2xvZ0xldmVsLWRyb3Bkb3duJykuZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsICcnKTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2xvZ0xldmVsJywgJycpO1xuXG4gICAgICAgIC8vIENsZWFyIGZpbHRlciBpbnB1dCBmaWVsZFxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZmlsdGVyJywgJycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcGVyaW9kIGJ1dHRvbnMgdmlzaWJpbGl0eSBiYXNlZCBvbiBsb2cgZmlsZSBkdXJhdGlvblxuICAgICAqIFNob3dzIG9ubHkgYnV0dG9ucyBmb3IgcGVyaW9kcyB0aGF0IGFyZSA8PSBsb2cgZmlsZSBkdXJhdGlvblxuICAgICAqIEhpZGVzIGVudGlyZSBjb250YWluZXIgaWYgbm8gYnV0dG9ucyBhcmUgdmlzaWJsZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBsb2dEdXJhdGlvbiAtIExvZyBmaWxlIGR1cmF0aW9uIGluIHNlY29uZHNcbiAgICAgKi9cbiAgICB1cGRhdGVQZXJpb2RCdXR0b25zVmlzaWJpbGl0eShsb2dEdXJhdGlvbikge1xuICAgICAgICBjb25zdCAkcGVyaW9kQnV0dG9ucyA9ICQoJy5wZXJpb2QtYnRuJyk7XG4gICAgICAgIGNvbnN0ICRwZXJpb2RDb250YWluZXIgPSAkKCcjcGVyaW9kLWJ1dHRvbnMnKTtcbiAgICAgICAgbGV0IGxhcmdlc3RWaXNpYmxlUGVyaW9kID0gMDtcbiAgICAgICAgbGV0ICRsYXJnZXN0VmlzaWJsZUJ1dHRvbiA9IG51bGw7XG4gICAgICAgIGxldCB2aXNpYmxlQ291bnQgPSAwO1xuXG4gICAgICAgICRwZXJpb2RCdXR0b25zLmVhY2goKGluZGV4LCBidXR0b24pID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRidXR0b24gPSAkKGJ1dHRvbik7XG4gICAgICAgICAgICBjb25zdCBwZXJpb2QgPSBwYXJzZUludCgkYnV0dG9uLmRhdGEoJ3BlcmlvZCcpLCAxMCk7XG5cbiAgICAgICAgICAgIC8vIFNob3cgYnV0dG9uIGlmIHBlcmlvZCBpcyBsZXNzIHRoYW4gb3IgZXF1YWwgdG8gbG9nIGR1cmF0aW9uXG4gICAgICAgICAgICAvLyBBZGQgMTAlIHRvbGVyYW5jZSBmb3Igcm91bmRpbmcvZWRnZSBjYXNlc1xuICAgICAgICAgICAgaWYgKHBlcmlvZCA8PSBsb2dEdXJhdGlvbiAqIDEuMSkge1xuICAgICAgICAgICAgICAgICRidXR0b24uc2hvdygpO1xuICAgICAgICAgICAgICAgIHZpc2libGVDb3VudCsrO1xuICAgICAgICAgICAgICAgIC8vIFRyYWNrIHRoZSBsYXJnZXN0IHZpc2libGUgcGVyaW9kIGZvciBkZWZhdWx0IHNlbGVjdGlvblxuICAgICAgICAgICAgICAgIGlmIChwZXJpb2QgPiBsYXJnZXN0VmlzaWJsZVBlcmlvZCkge1xuICAgICAgICAgICAgICAgICAgICBsYXJnZXN0VmlzaWJsZVBlcmlvZCA9IHBlcmlvZDtcbiAgICAgICAgICAgICAgICAgICAgJGxhcmdlc3RWaXNpYmxlQnV0dG9uID0gJGJ1dHRvbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRidXR0b24uaGlkZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIaWRlIGVudGlyZSBjb250YWluZXIgaWYgbm8gYnV0dG9ucyBhcmUgdmlzaWJsZVxuICAgICAgICAvLyBBbHNvIHRvZ2dsZSBjbGFzcyBvbiBwYXJlbnQgdG8gcmVtb3ZlIGdhcCBmb3IgcHJvcGVyIGFsaWdubWVudFxuICAgICAgICBjb25zdCAkdGltZUNvbnRyb2xzSW5saW5lID0gJCgnLnRpbWUtY29udHJvbHMtaW5saW5lJyk7XG4gICAgICAgIGlmICh2aXNpYmxlQ291bnQgPT09IDApIHtcbiAgICAgICAgICAgICRwZXJpb2RDb250YWluZXIuaGlkZSgpO1xuICAgICAgICAgICAgJHRpbWVDb250cm9sc0lubGluZS5hZGRDbGFzcygnbm8tcGVyaW9kLWJ1dHRvbnMnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRwZXJpb2RDb250YWluZXIuc2hvdygpO1xuICAgICAgICAgICAgJHRpbWVDb250cm9sc0lubGluZS5yZW1vdmVDbGFzcygnbm8tcGVyaW9kLWJ1dHRvbnMnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBsYXJnZXN0IHZpc2libGUgYnV0dG9uIGFzIGFjdGl2ZSAoaWYgbm8gYnV0dG9uIGlzIGN1cnJlbnRseSBhY3RpdmUpXG4gICAgICAgIGlmICgkbGFyZ2VzdFZpc2libGVCdXR0b24gJiYgISRwZXJpb2RCdXR0b25zLmZpbHRlcignLmFjdGl2ZScpLmlzKCc6dmlzaWJsZScpKSB7XG4gICAgICAgICAgICAkcGVyaW9kQnV0dG9ucy5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAkbGFyZ2VzdFZpc2libGVCdXR0b24uYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIHRpbWUgcmFuZ2UgaXMgYXZhaWxhYmxlIGZvciB0aGUgc2VsZWN0ZWQgbG9nIGZpbGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZW5hbWUgLSBMb2cgZmlsZSBwYXRoXG4gICAgICovXG4gICAgY2hlY2tUaW1lUmFuZ2VBdmFpbGFiaWxpdHkoZmlsZW5hbWUpIHtcbiAgICAgICAgLy8gU2hvdyBkaW1tZXIgb25seSBpZiBub3QgaW4gYXV0by11cGRhdGUgbW9kZVxuICAgICAgICBpZiAoIXN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gVHJ5IHRvIGdldCB0aW1lIHJhbmdlIGZvciB0aGlzIGZpbGVcbiAgICAgICAgICAgIFN5c2xvZ0FQSS5nZXRMb2dUaW1lUmFuZ2UoZmlsZW5hbWUsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLnRpbWVfcmFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVGltZSByYW5nZSBpcyBhdmFpbGFibGUgLSB1c2UgdGltZS1iYXNlZCBuYXZpZ2F0aW9uXG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmluaXRpYWxpemVOYXZpZ2F0aW9uKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRpbWUgcmFuZ2Ugbm90IGF2YWlsYWJsZSAtIHVzZSBsaW5lIG51bWJlciBmYWxsYmFja1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pbml0aWFsaXplTmF2aWdhdGlvbihudWxsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGNoZWNraW5nIHRpbWUgcmFuZ2U6JywgZXJyb3IpO1xuICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gbGluZSBudW1iZXIgbW9kZVxuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaW5pdGlhbGl6ZU5hdmlnYXRpb24obnVsbCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB1bml2ZXJzYWwgbmF2aWdhdGlvbiB3aXRoIHRpbWUgb3IgbGluZSBudW1iZXIgbW9kZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSB0aW1lUmFuZ2VEYXRhIC0gVGltZSByYW5nZSBkYXRhIGZyb20gQVBJIChvcHRpb25hbClcbiAgICAgKi9cbiAgICBpbml0aWFsaXplTmF2aWdhdGlvbih0aW1lUmFuZ2VEYXRhKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIHdlIGhhdmUgdmFsaWQgdGltZSByYW5nZSB3aXRoIGFjdHVhbCB0aW1lc3RhbXBzIChub3QgbnVsbClcbiAgICAgICAgY29uc3QgaGFzVmFsaWRUaW1lUmFuZ2UgPSB0aW1lUmFuZ2VEYXRhICYmXG4gICAgICAgICAgICB0aW1lUmFuZ2VEYXRhLnRpbWVfcmFuZ2UgJiZcbiAgICAgICAgICAgIHR5cGVvZiB0aW1lUmFuZ2VEYXRhLnRpbWVfcmFuZ2Uuc3RhcnQgPT09ICdudW1iZXInICYmXG4gICAgICAgICAgICB0eXBlb2YgdGltZVJhbmdlRGF0YS50aW1lX3JhbmdlLmVuZCA9PT0gJ251bWJlcic7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGltZSByYW5nZSBpcyBtZWFuaW5nZnVsIChtb3JlIHRoYW4gMSBzZWNvbmQgb2YgZGF0YSlcbiAgICAgICAgY29uc3QgaGFzTXVsdGlwbGVUaW1lc3RhbXBzID0gaGFzVmFsaWRUaW1lUmFuZ2UgJiZcbiAgICAgICAgICAgICh0aW1lUmFuZ2VEYXRhLnRpbWVfcmFuZ2UuZW5kIC0gdGltZVJhbmdlRGF0YS50aW1lX3JhbmdlLnN0YXJ0KSA+IDE7XG5cbiAgICAgICAgaWYgKGhhc1ZhbGlkVGltZVJhbmdlICYmIGhhc011bHRpcGxlVGltZXN0YW1wcykge1xuICAgICAgICAgICAgLy8gVGltZS1iYXNlZCBtb2RlXG4gICAgICAgICAgICB0aGlzLnRpbWVTbGlkZXJFbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFRpbWVSYW5nZSA9IHRpbWVSYW5nZURhdGEudGltZV9yYW5nZTtcblxuICAgICAgICAgICAgLy8gQ2FsY3VsYXRlIGxvZyBmaWxlIGR1cmF0aW9uIGFuZCB1cGRhdGUgcGVyaW9kIGJ1dHRvbnMgdmlzaWJpbGl0eVxuICAgICAgICAgICAgY29uc3QgbG9nRHVyYXRpb24gPSB0aGlzLmN1cnJlbnRUaW1lUmFuZ2UuZW5kIC0gdGhpcy5jdXJyZW50VGltZVJhbmdlLnN0YXJ0O1xuICAgICAgICAgICAgdGhpcy51cGRhdGVQZXJpb2RCdXR0b25zVmlzaWJpbGl0eShsb2dEdXJhdGlvbik7XG5cbiAgICAgICAgICAgIC8vIFNob3cgcGVyaW9kIGJ1dHRvbnMgZm9yIHRpbWUtYmFzZWQgbmF2aWdhdGlvblxuICAgICAgICAgICAgJCgnI3BlcmlvZC1idXR0b25zJykuc2hvdygpO1xuXG4gICAgICAgICAgICAvLyBTZXQgc2VydmVyIHRpbWV6b25lIG9mZnNldFxuICAgICAgICAgICAgaWYgKHRpbWVSYW5nZURhdGEuc2VydmVyX3RpbWV6b25lX29mZnNldCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgU1ZHVGltZWxpbmUuc2VydmVyVGltZXpvbmVPZmZzZXQgPSB0aW1lUmFuZ2VEYXRhLnNlcnZlcl90aW1lem9uZV9vZmZzZXQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgU1ZHIHRpbWVsaW5lIHdpdGggdGltZSByYW5nZVxuICAgICAgICAgICAgU1ZHVGltZWxpbmUuaW5pdGlhbGl6ZSgnI3RpbWUtc2xpZGVyLWNvbnRhaW5lcicsIHRoaXMuY3VycmVudFRpbWVSYW5nZSk7XG5cbiAgICAgICAgICAgIC8vIFNldCBjYWxsYmFjayBmb3IgdGltZSB3aW5kb3cgY2hhbmdlc1xuICAgICAgICAgICAgLy8gQWx3YXlzIHVzZSBsYXRlc3Q9dHJ1ZSBzbyB0aGUgbW9zdCByZWNlbnQgbG9nIGVudHJpZXMgYXJlIGRpc3BsYXllZFxuICAgICAgICAgICAgLy8gVHJ1bmNhdGlvbiAoaWYgYW55KSBoYXBwZW5zIG9uIHRoZSBsZWZ0IHNpZGUsIHdoaWNoIGlzIGxlc3MgZGlzcnVwdGl2ZVxuICAgICAgICAgICAgU1ZHVGltZWxpbmUub25SYW5nZUNoYW5nZSA9IChzdGFydCwgZW5kLCBkcmFnZ2VkSGFuZGxlKSA9PiB7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9hZExvZ0J5VGltZVJhbmdlKHN0YXJ0LCBlbmQsIHRydWUpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gU2V0IGNhbGxiYWNrIGZvciB0cnVuY2F0ZWQgem9uZSBjbGlja3NcbiAgICAgICAgICAgIC8vIExlZnQgem9uZXMgKHRpbWVsaW5lLXRydW5jYXRlZC1sZWZ0KTogZGF0YSB3YXMgY3V0IGZyb20gYmVnaW5uaW5nLCBsb2FkIHdpdGggbGF0ZXN0PXRydWVcbiAgICAgICAgICAgIC8vIFJpZ2h0IHpvbmVzICh0aW1lbGluZS10cnVuY2F0ZWQtcmlnaHQpOiBkYXRhIHdhcyBjdXQgZnJvbSBlbmQsIGxvYWQgd2l0aCBsYXRlc3Q9ZmFsc2VcbiAgICAgICAgICAgIFNWR1RpbWVsaW5lLm9uVHJ1bmNhdGVkWm9uZUNsaWNrID0gKHN0YXJ0LCBlbmQsIGlzTGVmdFpvbmUpID0+IHtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2FkTG9nQnlUaW1lUmFuZ2Uoc3RhcnQsIGVuZCwgaXNMZWZ0Wm9uZSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBMb2FkIGluaXRpYWwgY2h1bmsgd2l0aCBsYXRlc3Q9dHJ1ZSB0byBzaG93IG5ld2VzdCBlbnRyaWVzXG4gICAgICAgICAgICAvLyBQYXNzIGlzSW5pdGlhbExvYWQ9dHJ1ZSB0byBzdXBwcmVzcyB0cnVuY2F0ZWQgem9uZSBkaXNwbGF5IG9uIGZpcnN0IGxvYWRcbiAgICAgICAgICAgIC8vIFVzZSB0aGUgbGFyZ2VzdCB2aXNpYmxlIHBlcmlvZCBidXR0b24gb3IgMSBob3VyIGFzIGZhbGxiYWNrXG4gICAgICAgICAgICBjb25zdCAkYWN0aXZlQnV0dG9uID0gJCgnLnBlcmlvZC1idG4uYWN0aXZlOnZpc2libGUnKTtcbiAgICAgICAgICAgIGNvbnN0IGluaXRpYWxQZXJpb2QgPSAkYWN0aXZlQnV0dG9uLmxlbmd0aCA+IDBcbiAgICAgICAgICAgICAgICA/IHBhcnNlSW50KCRhY3RpdmVCdXR0b24uZGF0YSgncGVyaW9kJyksIDEwKVxuICAgICAgICAgICAgICAgIDogTWF0aC5taW4oMzYwMCwgbG9nRHVyYXRpb24pO1xuICAgICAgICAgICAgY29uc3QgaW5pdGlhbFN0YXJ0ID0gTWF0aC5tYXgodGhpcy5jdXJyZW50VGltZVJhbmdlLmVuZCAtIGluaXRpYWxQZXJpb2QsIHRoaXMuY3VycmVudFRpbWVSYW5nZS5zdGFydCk7XG4gICAgICAgICAgICB0aGlzLmxvYWRMb2dCeVRpbWVSYW5nZShpbml0aWFsU3RhcnQsIHRoaXMuY3VycmVudFRpbWVSYW5nZS5lbmQsIHRydWUsIHRydWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTGluZSBudW1iZXIgZmFsbGJhY2sgbW9kZVxuICAgICAgICAgICAgdGhpcy50aW1lU2xpZGVyRW5hYmxlZCA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VGltZVJhbmdlID0gbnVsbDtcblxuICAgICAgICAgICAgLy8gSGlkZSBwZXJpb2QgYnV0dG9ucyBpbiBsaW5lIG51bWJlciBtb2RlXG4gICAgICAgICAgICAkKCcjcGVyaW9kLWJ1dHRvbnMnKS5oaWRlKCk7XG5cbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgU1ZHIHRpbWVsaW5lIHdpdGggbGluZSBudW1iZXJzXG4gICAgICAgICAgICAvLyBGb3Igbm93LCB1c2UgZGVmYXVsdCByYW5nZSB1bnRpbCB3ZSBnZXQgdG90YWwgbGluZSBjb3VudFxuICAgICAgICAgICAgY29uc3QgbGluZVJhbmdlID0geyBzdGFydDogMCwgZW5kOiAxMDAwMCB9O1xuICAgICAgICAgICAgU1ZHVGltZWxpbmUuaW5pdGlhbGl6ZSgnI3RpbWUtc2xpZGVyLWNvbnRhaW5lcicsIGxpbmVSYW5nZSwgJ2xpbmVzJyk7XG5cbiAgICAgICAgICAgIC8vIFNldCBjYWxsYmFjayBmb3IgbGluZSByYW5nZSBjaGFuZ2VzXG4gICAgICAgICAgICBTVkdUaW1lbGluZS5vblJhbmdlQ2hhbmdlID0gKHN0YXJ0LCBlbmQpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBMb2FkIGJ5IGxpbmUgbnVtYmVycyAob2Zmc2V0L2xpbmVzKVxuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmxvYWRMb2dCeUxpbmVzKE1hdGguZmxvb3Ioc3RhcnQpLCBNYXRoLmNlaWwoZW5kIC0gc3RhcnQpKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIExvYWQgaW5pdGlhbCBsaW5lc1xuICAgICAgICAgICAgdGhpcy51cGRhdGVMb2dGcm9tU2VydmVyKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBsb2cgYnkgbGluZSBudW1iZXJzIChmb3IgZmlsZXMgd2l0aG91dCB0aW1lc3RhbXBzKVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBvZmZzZXQgLSBTdGFydGluZyBsaW5lIG51bWJlclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBsaW5lcyAtIE51bWJlciBvZiBsaW5lcyB0byBsb2FkXG4gICAgICovXG4gICAgbG9hZExvZ0J5TGluZXMob2Zmc2V0LCBsaW5lcykge1xuICAgICAgICAvLyBTaG93IGRpbW1lciBvbmx5IGlmIG5vdCBpbiBhdXRvLXVwZGF0ZSBtb2RlXG4gICAgICAgIGlmICghc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlKSB7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IHtcbiAgICAgICAgICAgIGZpbGVuYW1lOiB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmaWxlbmFtZScpLFxuICAgICAgICAgICAgZmlsdGVyOiB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmaWx0ZXInKSB8fCAnJyxcbiAgICAgICAgICAgIGxvZ0xldmVsOiB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdsb2dMZXZlbCcpIHx8ICcnLFxuICAgICAgICAgICAgb2Zmc2V0OiBNYXRoLm1heCgwLCBvZmZzZXQpLFxuICAgICAgICAgICAgbGluZXM6IE1hdGgubWluKDUwMDAsIE1hdGgubWF4KDEwMCwgbGluZXMpKVxuICAgICAgICB9O1xuXG4gICAgICAgIFN5c2xvZ0FQSS5nZXRMb2dGcm9tRmlsZShwYXJhbXMsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgLy8gSGlkZSBkaW1tZXIgb25seSBpZiBub3QgaW4gYXV0by11cGRhdGUgbW9kZVxuICAgICAgICAgICAgaWYgKCFzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiAnY29udGVudCcgaW4gcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIC8vIFNldCBjb250ZW50IGluIGVkaXRvciAoZXZlbiBpZiBlbXB0eSlcbiAgICAgICAgICAgICAgICB0aGlzLnZpZXdlci5zZXRWYWx1ZShyZXNwb25zZS5kYXRhLmNvbnRlbnQgfHwgJycsIC0xKTtcblxuICAgICAgICAgICAgICAgIC8vIEdvIHRvIHRoZSBiZWdpbm5pbmdcbiAgICAgICAgICAgICAgICB0aGlzLnZpZXdlci5nb3RvTGluZSgxKTtcbiAgICAgICAgICAgICAgICB0aGlzLnZpZXdlci5zY3JvbGxUb0xpbmUoMCwgdHJ1ZSwgdHJ1ZSwgKCkgPT4ge30pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBsb2cgYnkgdGltZSByYW5nZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzdGFydFRpbWVzdGFtcCAtIFN0YXJ0IHRpbWVzdGFtcFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBlbmRUaW1lc3RhbXAgLSBFbmQgdGltZXN0YW1wXG4gICAgICogQHBhcmFtIHtib29sZWFufSBsYXRlc3QgLSBJZiB0cnVlLCByZXR1cm4gbmV3ZXN0IGxpbmVzIGZpcnN0IChmb3IgaW5pdGlhbCBsb2FkKVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNJbml0aWFsTG9hZCAtIElmIHRydWUsIHN1cHByZXNzIHRydW5jYXRlZCB6b25lIGRpc3BsYXlcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGlzQXV0b1VwZGF0ZSAtIElmIHRydWUsIHNraXAgdGltZWxpbmUgcmVjYWxjdWxhdGlvbiAob25seSB1cGRhdGUgY29udGVudClcbiAgICAgKi9cbiAgICBsb2FkTG9nQnlUaW1lUmFuZ2Uoc3RhcnRUaW1lc3RhbXAsIGVuZFRpbWVzdGFtcCwgbGF0ZXN0ID0gZmFsc2UsIGlzSW5pdGlhbExvYWQgPSBmYWxzZSwgaXNBdXRvVXBkYXRlID0gZmFsc2UpIHtcbiAgICAgICAgLy8gU2hvdyBkaW1tZXIgb25seSBpZiBub3QgaW4gYXV0by11cGRhdGUgbW9kZVxuICAgICAgICBpZiAoIXN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwYXJhbXMgPSB7XG4gICAgICAgICAgICBmaWxlbmFtZTogdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZmlsZW5hbWUnKSxcbiAgICAgICAgICAgIGZpbHRlcjogdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZmlsdGVyJykgfHwgJycsXG4gICAgICAgICAgICBsb2dMZXZlbDogdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnbG9nTGV2ZWwnKSB8fCAnJyxcbiAgICAgICAgICAgIGRhdGVGcm9tOiBzdGFydFRpbWVzdGFtcCxcbiAgICAgICAgICAgIGRhdGVUbzogZW5kVGltZXN0YW1wLFxuICAgICAgICAgICAgbGluZXM6IDUwMDAsIC8vIE1heGltdW0gbGluZXMgdG8gbG9hZFxuICAgICAgICAgICAgbGF0ZXN0OiBsYXRlc3QgLy8gSWYgdHJ1ZSwgcmV0dXJuIG5ld2VzdCBsaW5lcyAodGFpbCB8IHRhYylcbiAgICAgICAgfTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgU3lzbG9nQVBJLmdldExvZ0Zyb21GaWxlKHBhcmFtcywgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhICYmICdjb250ZW50JyBpbiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0NvbnRlbnQgPSByZXNwb25zZS5kYXRhLmNvbnRlbnQgfHwgJyc7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzQXV0b1VwZGF0ZSAmJiBuZXdDb250ZW50Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEF1dG8tdXBkYXRlIG1vZGU6IGFwcGVuZCBvbmx5IG5ldyBsaW5lc1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY3VycmVudENvbnRlbnQgPSB0aGlzLnZpZXdlci5nZXRWYWx1ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3TGluZXMgPSB0aGlzLmZpbmROZXdMaW5lcyhjdXJyZW50Q29udGVudCwgbmV3Q29udGVudCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXdMaW5lcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQXBwZW5kIG5ldyBsaW5lcyBhdCB0aGUgZW5kXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2Vzc2lvbiA9IHRoaXMudmlld2VyLnNlc3Npb247XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbGFzdFJvdyA9IHNlc3Npb24uZ2V0TGVuZ3RoKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Vzc2lvbi5pbnNlcnQoeyByb3c6IGxhc3RSb3csIGNvbHVtbjogMCB9LCAnXFxuJyArIG5ld0xpbmVzLmpvaW4oJ1xcbicpKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdvIHRvIHRoZSBsYXN0IGxpbmUgdG8gZm9sbG93IG5ldyBlbnRyaWVzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmluYWxSb3cgPSBzZXNzaW9uLmdldExlbmd0aCgpIC0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaW5hbENvbHVtbiA9IHNlc3Npb24uZ2V0TGluZShmaW5hbFJvdykubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudmlld2VyLmdvdG9MaW5lKGZpbmFsUm93ICsgMSwgZmluYWxDb2x1bW4pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gTm9ybWFsIG1vZGU6IHNldCBjb250ZW50IGFuZCBnbyB0byBlbmRcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudmlld2VyLnNldFZhbHVlKG5ld0NvbnRlbnQsIC0xKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gR28gdG8gdGhlIGVuZCBvZiB0aGUgbG9nXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByb3cgPSB0aGlzLnZpZXdlci5zZXNzaW9uLmdldExlbmd0aCgpIC0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbHVtbiA9IHRoaXMudmlld2VyLnNlc3Npb24uZ2V0TGluZShyb3cpLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudmlld2VyLmdvdG9MaW5lKHJvdyArIDEsIGNvbHVtbik7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBBZGp1c3Qgc2xpZGVyIHRvIGFjdHVhbCBsb2FkZWQgdGltZSByYW5nZSAoc2lsZW50bHkpXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmFjdHVhbF9yYW5nZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYWN0dWFsID0gcmVzcG9uc2UuZGF0YS5hY3R1YWxfcmFuZ2U7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFsd2F5cyB1cGRhdGUgZnVsbFJhbmdlIGJvdW5kYXJ5IGJhc2VkIG9uIGFjdHVhbCBkYXRhIGZyb20gc2VydmVyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGlzIGVuc3VyZXMgbm8tZGF0YSB6b25lcyBkaXNwbGF5IGNvcnJlY3RseSBhZnRlciByZWZyZXNoXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0dWFsLmVuZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFNWR1RpbWVsaW5lLnVwZGF0ZURhdGFCb3VuZGFyeShhY3R1YWwuZW5kKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQWx3YXlzIHVwZGF0ZSB0aW1lbGluZSB3aXRoIHNlcnZlciByZXNwb25zZSAoZXhjZXB0IGR1cmluZyBhdXRvLXVwZGF0ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHVwZGF0ZUZyb21TZXJ2ZXJSZXNwb25zZSgpIGhhbmRsZXM6XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAtIFVwZGF0aW5nIHNlbGVjdGVkUmFuZ2UgdG8gYWN0dWFsIGRhdGEgYm91bmRhcmllc1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gLSBQcmVzZXJ2aW5nIHZpc2libGVSYW5nZS5lbmQgaWYgaXQgd2FzIGV4dGVuZGVkIHRvIGN1cnJlbnQgdGltZSAoZm9yIG5vLWRhdGEgem9uZXMpXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAtIE1hbmFnaW5nIHRydW5jYXRpb24gem9uZXMgZGlzcGxheVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpc0F1dG9VcGRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBTVkdUaW1lbGluZS51cGRhdGVGcm9tU2VydmVyUmVzcG9uc2UoYWN0dWFsLCBzdGFydFRpbWVzdGFtcCwgZW5kVGltZXN0YW1wLCBpc0luaXRpYWxMb2FkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEhpZGUgZGltbWVyIG9ubHkgaWYgbm90IGluIGF1dG8tdXBkYXRlIG1vZGVcbiAgICAgICAgICAgICAgICBpZiAoIXN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGxvYWRpbmcgbG9nIGJ5IHRpbWUgcmFuZ2U6JywgZXJyb3IpO1xuICAgICAgICAgICAgLy8gSGlkZSBkaW1tZXIgb25seSBpZiBub3QgaW4gYXV0by11cGRhdGUgbW9kZVxuICAgICAgICAgICAgaWYgKCFzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBcHBseSBxdWljayBwZXJpb2Qgc2VsZWN0aW9uIChZYW5kZXggQ2xvdWQgTG9nVmlld2VyIHN0eWxlKVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBwZXJpb2RTZWNvbmRzIC0gUGVyaW9kIGluIHNlY29uZHNcbiAgICAgKi9cbiAgICBhcHBseVF1aWNrUGVyaW9kKHBlcmlvZFNlY29uZHMpIHtcbiAgICAgICAgaWYgKCF0aGlzLmN1cnJlbnRUaW1lUmFuZ2UpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVzZSBuZXcgYXBwbHlQZXJpb2QgbWV0aG9kIHRoYXQgaGFuZGxlcyB2aXNpYmxlIHJhbmdlIGFuZCBhdXRvLWNlbnRlcmluZ1xuICAgICAgICBTVkdUaW1lbGluZS5hcHBseVBlcmlvZChwZXJpb2RTZWNvbmRzKTtcbiAgICAgICAgLy8gQ2FsbGJhY2sgd2lsbCBiZSB0cmlnZ2VyZWQgYXV0b21hdGljYWxseSBieSBTVkdUaW1lbGluZVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBcHBseSBsb2cgbGV2ZWwgZmlsdGVyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGxldmVsIC0gTG9nIGxldmVsIChhbGwsIGVycm9yLCB3YXJuaW5nLCBpbmZvLCBkZWJ1ZylcbiAgICAgKi9cbiAgICBhcHBseUxvZ0xldmVsRmlsdGVyKGxldmVsKSB7XG4gICAgICAgIGxldCBmaWx0ZXJQYXR0ZXJuID0gJyc7XG5cbiAgICAgICAgLy8gQ3JlYXRlIHJlZ2V4IHBhdHRlcm4gYmFzZWQgb24gbGV2ZWxcbiAgICAgICAgc3dpdGNoIChsZXZlbCkge1xuICAgICAgICAgICAgY2FzZSAnZXJyb3InOlxuICAgICAgICAgICAgICAgIGZpbHRlclBhdHRlcm4gPSAnRVJST1J8Q1JJVElDQUx8RkFUQUwnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnd2FybmluZyc6XG4gICAgICAgICAgICAgICAgZmlsdGVyUGF0dGVybiA9ICdXQVJOSU5HfFdBUk4nO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnaW5mbyc6XG4gICAgICAgICAgICAgICAgZmlsdGVyUGF0dGVybiA9ICdJTkZPJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2RlYnVnJzpcbiAgICAgICAgICAgICAgICBmaWx0ZXJQYXR0ZXJuID0gJ0RFQlVHJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2FsbCc6XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGZpbHRlclBhdHRlcm4gPSAnJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBmaWx0ZXIgZmllbGRcbiAgICAgICAgdGhpcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZmlsdGVyJywgZmlsdGVyUGF0dGVybik7XG5cbiAgICAgICAgLy8gUmVsb2FkIGxvZ3Mgd2l0aCBuZXcgZmlsdGVyXG4gICAgICAgIHRoaXMudXBkYXRlTG9nRnJvbVNlcnZlcigpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGZXRjaGVzIHRoZSBsb2cgZmlsZSBjb250ZW50IGZyb20gdGhlIHNlcnZlci5cbiAgICAgKi9cbiAgICB1cGRhdGVMb2dGcm9tU2VydmVyKCkge1xuICAgICAgICBpZiAodGhpcy50aW1lU2xpZGVyRW5hYmxlZCkge1xuICAgICAgICAgICAgLy8gSW4gdGltZSBzbGlkZXIgbW9kZSwgcmVsb2FkIGN1cnJlbnQgd2luZG93XG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50VGltZVJhbmdlKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb25lSG91ciA9IDM2MDA7XG5cbiAgICAgICAgICAgICAgICAvLyBHZXQgY3VycmVudCBmaWxlbmFtZSB0byBjaGVjayBpZiBpdCdzIGEgcm90YXRlZCBsb2cgZmlsZVxuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVuYW1lID0gdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZmlsZW5hbWUnKTtcbiAgICAgICAgICAgICAgICBjb25zdCBpc1JvdGF0ZWQgPSB0aGlzLmlzUm90YXRlZExvZ0ZpbGUoZmlsZW5hbWUpO1xuXG4gICAgICAgICAgICAgICAgbGV0IGVuZFRpbWVzdGFtcDtcbiAgICAgICAgICAgICAgICBsZXQgc3RhcnRUaW1lc3RhbXA7XG5cbiAgICAgICAgICAgICAgICBpZiAoaXNSb3RhdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZvciByb3RhdGVkIGZpbGVzOiB1c2UgdGhlIGZpbGUncyBhY3R1YWwgdGltZSByYW5nZVxuICAgICAgICAgICAgICAgICAgICAvLyBSb3RhdGVkIGZpbGVzIGRvbid0IHJlY2VpdmUgbmV3IGRhdGEsIHNvIGN1cnJlbnRUaW1lUmFuZ2UgaXMgZml4ZWRcbiAgICAgICAgICAgICAgICAgICAgZW5kVGltZXN0YW1wID0gdGhpcy5jdXJyZW50VGltZVJhbmdlLmVuZDtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnRUaW1lc3RhbXAgPSBNYXRoLm1heCh0aGlzLmN1cnJlbnRUaW1lUmFuZ2UuZW5kIC0gb25lSG91ciwgdGhpcy5jdXJyZW50VGltZVJhbmdlLnN0YXJ0KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBGb3IgYWN0aXZlIGxvZyBmaWxlczogdXNlIGN1cnJlbnQgdGltZSB0byBjYXB0dXJlIG5ldyBlbnRyaWVzXG4gICAgICAgICAgICAgICAgICAgIGVuZFRpbWVzdGFtcCA9IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApO1xuICAgICAgICAgICAgICAgICAgICBzdGFydFRpbWVzdGFtcCA9IGVuZFRpbWVzdGFtcCAtIG9uZUhvdXI7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIGN1cnJlbnRUaW1lUmFuZ2UuZW5kIHRvIHJlZmxlY3QgbmV3IGRhdGEgYXZhaWxhYmlsaXR5XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFRpbWVSYW5nZS5lbmQgPSBlbmRUaW1lc3RhbXA7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRk9SQ0UgdXBkYXRlIHRoZSBTVkcgdGltZWxpbmUgdmlzaWJsZSByYW5nZSB0byBjdXJyZW50IHRpbWVcbiAgICAgICAgICAgICAgICAgICAgLy8gZm9yY2U9dHJ1ZSBlbnN1cmVzIHZpc2libGVSYW5nZS5lbmQgaXMgc2V0IGV2ZW4gaWYgaXQgd2FzIGFscmVhZHkgPj0gZW5kVGltZXN0YW1wXG4gICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgaGFuZGxlcyB0aW1lem9uZSBkaWZmZXJlbmNlcyB3aGVyZSBzZXJ2ZXIgdGltZSBtaWdodCBhcHBlYXIgXCJpbiB0aGUgZnV0dXJlXCJcbiAgICAgICAgICAgICAgICAgICAgU1ZHVGltZWxpbmUuZXh0ZW5kUmFuZ2UoZW5kVGltZXN0YW1wLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBVc2UgbGF0ZXN0PXRydWUgdG8gc2hvdyBuZXdlc3QgZW50cmllcyAoZm9yIHNob3ctbGFzdC1sb2cgLyBhdXRvLXVwZGF0ZSBidXR0b25zKVxuICAgICAgICAgICAgICAgIC8vIFBhc3MgaXNBdXRvVXBkYXRlPXRydWUgd2hlbiBhdXRvLXJlZnJlc2ggaXMgYWN0aXZlIHRvIHByZXZlbnQgdGltZWxpbmUgZmxpY2tlcmluZ1xuICAgICAgICAgICAgICAgIHRoaXMubG9hZExvZ0J5VGltZVJhbmdlKHN0YXJ0VGltZXN0YW1wLCBlbmRUaW1lc3RhbXAsIHRydWUsIGZhbHNlLCB0aGlzLmlzQXV0b1VwZGF0ZUFjdGl2ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBMaW5lIG51bWJlciBtb2RlXG4gICAgICAgICAgICBjb25zdCBwYXJhbXMgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgICAgICBwYXJhbXMubGluZXMgPSA1MDAwOyAvLyBNYXggbGluZXNcbiAgICAgICAgICAgIFN5c2xvZ0FQSS5nZXRMb2dGcm9tRmlsZShwYXJhbXMsIHN5c3RlbURpYWdub3N0aWNMb2dzLmNiVXBkYXRlTG9nVGV4dCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRmluZCBuZXcgbGluZXMgdGhhdCBhcmUgbm90IGluIGN1cnJlbnQgY29udGVudFxuICAgICAqIENvbXBhcmVzIGxhc3QgbGluZXMgb2YgY3VycmVudCBjb250ZW50IHdpdGggbmV3IGNvbnRlbnQgdG8gZmluZCBvdmVybGFwXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGN1cnJlbnRDb250ZW50IC0gQ3VycmVudCBlZGl0b3IgY29udGVudFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuZXdDb250ZW50IC0gTmV3IGNvbnRlbnQgZnJvbSBzZXJ2ZXJcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IEFycmF5IG9mIG5ldyBsaW5lcyB0byBhcHBlbmRcbiAgICAgKi9cbiAgICBmaW5kTmV3TGluZXMoY3VycmVudENvbnRlbnQsIG5ld0NvbnRlbnQpIHtcbiAgICAgICAgaWYgKCFjdXJyZW50Q29udGVudCB8fCBjdXJyZW50Q29udGVudC50cmltKCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAvLyBJZiBlZGl0b3IgaXMgZW1wdHksIGFsbCBsaW5lcyBhcmUgbmV3XG4gICAgICAgICAgICByZXR1cm4gbmV3Q29udGVudC5zcGxpdCgnXFxuJykuZmlsdGVyKGxpbmUgPT4gbGluZS50cmltKCkubGVuZ3RoID4gMCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjdXJyZW50TGluZXMgPSBjdXJyZW50Q29udGVudC5zcGxpdCgnXFxuJyk7XG4gICAgICAgIGNvbnN0IG5ld0xpbmVzID0gbmV3Q29udGVudC5zcGxpdCgnXFxuJyk7XG5cbiAgICAgICAgLy8gR2V0IGxhc3Qgbm9uLWVtcHR5IGxpbmUgZnJvbSBjdXJyZW50IGNvbnRlbnQgYXMgYW5jaG9yXG4gICAgICAgIGxldCBhbmNob3JMaW5lID0gJyc7XG4gICAgICAgIGZvciAobGV0IGkgPSBjdXJyZW50TGluZXMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50TGluZXNbaV0udHJpbSgpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBhbmNob3JMaW5lID0gY3VycmVudExpbmVzW2ldO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFhbmNob3JMaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3TGluZXMuZmlsdGVyKGxpbmUgPT4gbGluZS50cmltKCkubGVuZ3RoID4gMCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGaW5kIGFuY2hvciBsaW5lIGluIG5ldyBjb250ZW50XG4gICAgICAgIGxldCBhbmNob3JJbmRleCA9IC0xO1xuICAgICAgICBmb3IgKGxldCBpID0gbmV3TGluZXMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgIGlmIChuZXdMaW5lc1tpXSA9PT0gYW5jaG9yTGluZSkge1xuICAgICAgICAgICAgICAgIGFuY2hvckluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChhbmNob3JJbmRleCA9PT0gLTEpIHtcbiAgICAgICAgICAgIC8vIEFuY2hvciBub3QgZm91bmQgLSBjb250ZW50IGNoYW5nZWQgc2lnbmlmaWNhbnRseSwgcmV0dXJuIGVtcHR5XG4gICAgICAgICAgICAvLyBUaGlzIHByZXZlbnRzIGR1cGxpY2F0ZXMgd2hlbiBsb2cgcm90YXRlcyBvciBmaWx0ZXIgY2hhbmdlc1xuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmV0dXJuIGxpbmVzIGFmdGVyIGFuY2hvclxuICAgICAgICBjb25zdCByZXN1bHQgPSBuZXdMaW5lcy5zbGljZShhbmNob3JJbmRleCArIDEpLmZpbHRlcihsaW5lID0+IGxpbmUudHJpbSgpLmxlbmd0aCA+IDApO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSBsb2cgdmlldy5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSBBUEkuXG4gICAgICovXG4gICAgY2JVcGRhdGVMb2dUZXh0KHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIEhpZGUgZGltbWVyIG9ubHkgaWYgbm90IGluIGF1dG8tdXBkYXRlIG1vZGVcbiAgICAgICAgaWYgKCFzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUpIHtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSGFuZGxlIHYzIEFQSSByZXNwb25zZSBzdHJ1Y3R1cmVcbiAgICAgICAgaWYgKCFyZXNwb25zZSB8fCAhcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UubWVzc2FnZXMpIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY29udGVudCA9IHJlc3BvbnNlLmRhdGE/LmNvbnRlbnQgfHwgJyc7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlci5nZXRTZXNzaW9uKCkuc2V0VmFsdWUoY29udGVudCk7XG4gICAgICAgIGNvbnN0IHJvdyA9IHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlci5zZXNzaW9uLmdldExlbmd0aCgpIC0gMTtcbiAgICAgICAgY29uc3QgY29sdW1uID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnNlc3Npb24uZ2V0TGluZShyb3cpLmxlbmd0aDtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLmdvdG9MaW5lKHJvdyArIDEsIGNvbHVtbik7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGNsaWNraW5nIHRoZSBcIkRvd25sb2FkIEZpbGVcIiBidXR0b24uXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGRhdGEuXG4gICAgICovXG4gICAgY2JEb3dubG9hZEZpbGUocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gSGFuZGxlIHYzIEFQSSByZXNwb25zZSBzdHJ1Y3R1cmVcbiAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSByZXNwb25zZS5kYXRhLmZpbGVuYW1lIHx8IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UubWVzc2FnZXMpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgY2xpY2tpbmcgdGhlIFwiRXJhc2UgRmlsZVwiIGJ1dHRvbi5cbiAgICAgKi9cbiAgICBlcmFzZUN1cnJlbnRGaWxlQ29udGVudCgpe1xuICAgICAgICBjb25zdCBmaWxlTmFtZSA9IHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmaWxlbmFtZScpO1xuICAgICAgICBpZiAoZmlsZU5hbWUubGVuZ3RoPjApe1xuICAgICAgICAgICAgU3lzbG9nQVBJLmVyYXNlRmlsZShmaWxlTmFtZSwgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY2JBZnRlckZpbGVFcmFzZWQpXG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgY2xpY2tpbmcgdGhlIFwiRXJhc2UgRmlsZVwiIGJ1dHRvbiBhbmQgY2FsbGluZyBSRVNUIEFQSSBjb21tYW5kXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGRhdGEuXG4gICAgICovXG4gICAgY2JBZnRlckZpbGVFcmFzZWQocmVzcG9uc2Upe1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0PT09ZmFsc2UgJiYgcmVzcG9uc2UubWVzc2FnZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKTtcbiAgICAgICAgfVxuICAgIH0sXG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgc2hvdyBzeXN0ZW0gbG9ncyB0YWJcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pbml0aWFsaXplKCk7XG59KTsiXX0=