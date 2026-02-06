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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TeXN0ZW1EaWFnbm9zdGljL3N5c3RlbS1kaWFnbm9zdGljLWluZGV4LXNob3dsb2dzLmpzIl0sIm5hbWVzIjpbInN5c3RlbURpYWdub3N0aWNMb2dzIiwiJHNob3dCdG4iLCIkIiwiJGRvd25sb2FkQnRuIiwiJHNob3dBdXRvQnRuIiwiJGVyYXNlQnRuIiwiJGxvZ0NvbnRlbnQiLCJ2aWV3ZXIiLCIkZmlsZVNlbGVjdERyb3BEb3duIiwibG9nc0l0ZW1zIiwiJGRpbW1lciIsIiRmb3JtT2JqIiwiaXNJbml0aWFsaXppbmciLCJ0aW1lU2xpZGVyRW5hYmxlZCIsImN1cnJlbnRUaW1lUmFuZ2UiLCJpc0F1dG9VcGRhdGVBY3RpdmUiLCJpbml0aWFsaXplIiwiYWNlSGVpZ2h0Iiwid2luZG93IiwiaW5uZXJIZWlnaHQiLCJjbG9zZXN0IiwiY3NzIiwiY3JlYXRlRHJvcGRvd25Gcm9tSGlkZGVuSW5wdXQiLCJkcm9wZG93biIsIm9uQ2hhbmdlIiwiY2JPbkNoYW5nZUZpbGUiLCJpZ25vcmVDYXNlIiwiZnVsbFRleHRTZWFyY2giLCJmb3JjZVNlbGVjdGlvbiIsInByZXNlcnZlSFRNTCIsImFsbG93Q2F0ZWdvcnlTZWxlY3Rpb24iLCJtYXRjaCIsImZpbHRlclJlbW90ZURhdGEiLCJhY3Rpb24iLCJ0ZW1wbGF0ZXMiLCJtZW51IiwiY3VzdG9tRHJvcGRvd25NZW51IiwiaW5pdGlhbGl6ZUZvbGRlckhhbmRsZXJzIiwiaW5pdGlhbGl6ZUFjZSIsIlN5c2xvZ0FQSSIsImdldExvZ3NMaXN0IiwiY2JGb3JtYXREcm9wZG93blJlc3VsdHMiLCJpbml0aWFsaXplTG9nTGV2ZWxEcm9wZG93biIsImRvY3VtZW50Iiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCIkYnRuIiwiY3VycmVudFRhcmdldCIsInBlcmlvZCIsImRhdGEiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwiYXBwbHlRdWlja1BlcmlvZCIsImVuZCIsIm9uZUhvdXIiLCJzdGFydCIsIk1hdGgiLCJtYXgiLCJTVkdUaW1lbGluZSIsInNldFJhbmdlIiwibG9hZExvZ0J5VGltZVJhbmdlIiwibGV2ZWwiLCJhcHBseUxvZ0xldmVsRmlsdGVyIiwidXBkYXRlTG9nRnJvbVNlcnZlciIsImhhbmRsZUhhc2hDaGFuZ2UiLCJmb3JtIiwiZG93bmxvYWRMb2dGaWxlIiwiZmlsZW5hbWUiLCJjYkRvd25sb2FkRmlsZSIsIiRidXR0b24iLCIkcmVsb2FkSWNvbiIsImZpbmQiLCJoYXNDbGFzcyIsInVwZGF0ZUxvZ1ZpZXdXb3JrZXIiLCJzdG9wIiwiZXJhc2VDdXJyZW50RmlsZUNvbnRlbnQiLCJldmVudCIsImtleUNvZGUiLCJ0b2dnbGVGdWxsU2NyZWVuIiwiYWRkRXZlbnRMaXN0ZW5lciIsImFkanVzdExvZ0hlaWdodCIsImxvZ0NvbnRhaW5lciIsImdldEVsZW1lbnRCeUlkIiwiZnVsbHNjcmVlbkVsZW1lbnQiLCJyZXF1ZXN0RnVsbHNjcmVlbiIsImVyciIsImNvbnNvbGUiLCJlcnJvciIsIm1lc3NhZ2UiLCJleGl0RnVsbHNjcmVlbiIsInNldFRpbWVvdXQiLCJvZmZzZXQiLCJ0b3AiLCJyZXNpemUiLCIkaGlkZGVuSW5wdXQiLCJsZW5ndGgiLCIkZHJvcGRvd24iLCJpZCIsIiR0ZXh0IiwidGV4dCIsImdsb2JhbFRyYW5zbGF0ZSIsInNkX0FsbExldmVscyIsIiRpY29uIiwiJG1lbnUiLCJpdGVtcyIsInZhbHVlIiwiaWNvbiIsInNkX0Vycm9yIiwic2RfV2FybmluZyIsInNkX05vdGljZSIsInNkX0luZm8iLCJzZF9EZWJ1ZyIsImZvckVhY2giLCJpdGVtIiwiJGl0ZW0iLCJodG1sIiwiYXBwZW5kIiwiYWZ0ZXIiLCJ2YWwiLCJ0cmlnZ2VyIiwidHlwZSIsInRhYmluZGV4IiwiYmVmb3JlIiwiaGlkZSIsImFjZSIsImVkaXQiLCJqdWxpYSIsInJlcXVpcmUiLCJ1bmRlZmluZWQiLCJJbmlNb2RlIiwiTW9kZSIsInNlc3Npb24iLCJzZXRNb2RlIiwic2V0VGhlbWUiLCJyZW5kZXJlciIsInNldFNob3dHdXR0ZXIiLCJzZXRPcHRpb25zIiwic2hvd0xpbmVOdW1iZXJzIiwic2hvd1ByaW50TWFyZ2luIiwicmVhZE9ubHkiLCJidWlsZFRyZWVTdHJ1Y3R1cmUiLCJmaWxlcyIsImRlZmF1bHRQYXRoIiwidHJlZSIsIk9iamVjdCIsImVudHJpZXMiLCJrZXkiLCJmaWxlRGF0YSIsImZpbGVQYXRoIiwicGF0aCIsInBhcnRzIiwic3BsaXQiLCJjdXJyZW50IiwicGFydCIsImluZGV4Iiwic2l6ZSIsImNoaWxkcmVuIiwidHJlZVRvRHJvcGRvd25JdGVtcyIsInByZWZpeCIsInBhcmVudEZvbGRlciIsInNvcnQiLCJhS2V5IiwiYVZhbCIsImJLZXkiLCJiVmFsIiwibG9jYWxlQ29tcGFyZSIsInB1c2giLCJuYW1lIiwiZGlzYWJsZWQiLCJmb2xkZXJOYW1lIiwiY2hpbGRJdGVtcyIsInNlbGVjdGVkIiwicmVzcG9uc2UiLCJmaWVsZHMiLCJ2YWx1ZXMiLCJlYWNoIiwib3B0aW9uIiwicGFyZW50QXR0ciIsIm1heWJlRGlzYWJsZWQiLCJmb2xkZXJIZWFkZXIiLCJ0YXJnZXQiLCJzdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24iLCIkZm9sZGVyIiwiJHRvZ2dsZSIsIiRmaWxlcyIsImlzQ29sbGFwc2VkIiwic2hvdyIsInNlYXJjaFZhbHVlIiwidHJpbSIsIl8iLCJmb2xkZXIiLCJleHBhbmRGb2xkZXJGb3JGaWxlIiwiJGZpbGVJdGVtIiwiaGFzaCIsImxvY2F0aW9uIiwic3RhcnRzV2l0aCIsImRlY29kZVVSSUNvbXBvbmVudCIsInN1YnN0cmluZyIsImZpbGVFeGlzdHMiLCJzb21lIiwiZ2V0RmlsZUZyb21IYXNoIiwicmVzdWx0IiwiZGVmVmFsIiwiZmlsZU5hbWUiLCJkcm9wZG93blZhbHVlcyIsIm1hcCIsInJlcGxhY2UiLCJzZWxlY3RlZEl0ZW0iLCJpdGVtVG9TZWxlY3QiLCJlbmNvZGVVUklDb21wb25lbnQiLCJyZXNldEZpbHRlcnMiLCJjaGVja1RpbWVSYW5nZUF2YWlsYWJpbGl0eSIsImdldExvZ1RpbWVSYW5nZSIsInRpbWVfcmFuZ2UiLCJpbml0aWFsaXplTmF2aWdhdGlvbiIsInRpbWVSYW5nZURhdGEiLCJzZXJ2ZXJfdGltZXpvbmVfb2Zmc2V0Iiwic2VydmVyVGltZXpvbmVPZmZzZXQiLCJvblJhbmdlQ2hhbmdlIiwiaW5pdGlhbFN0YXJ0IiwibGluZVJhbmdlIiwibG9hZExvZ0J5TGluZXMiLCJmbG9vciIsImNlaWwiLCJsaW5lcyIsInBhcmFtcyIsImZpbHRlciIsImxvZ0xldmVsIiwibWluIiwiZ2V0TG9nRnJvbUZpbGUiLCJzZXRWYWx1ZSIsImNvbnRlbnQiLCJnb3RvTGluZSIsInNjcm9sbFRvTGluZSIsInN0YXJ0VGltZXN0YW1wIiwiZW5kVGltZXN0YW1wIiwiZGF0ZUZyb20iLCJkYXRlVG8iLCJyb3ciLCJnZXRMZW5ndGgiLCJjb2x1bW4iLCJnZXRMaW5lIiwiYWN0dWFsX3JhbmdlIiwiYWN0dWFsIiwicmVxdWVzdGVkRHVyYXRpb24iLCJhY3R1YWxEdXJhdGlvbiIsImR1cmF0aW9uUmF0aW8iLCJ0cnVuY2F0ZWQiLCJ1cGRhdGVTZWxlY3RlZFJhbmdlIiwibG9nIiwibGluZXNfY291bnQiLCJkZWJ1ZyIsInRvRml4ZWQiLCJwZXJpb2RTZWNvbmRzIiwiYXBwbHlQZXJpb2QiLCJmaWx0ZXJQYXR0ZXJuIiwiY2JVcGRhdGVMb2dUZXh0IiwibWVzc2FnZXMiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsImdldFNlc3Npb24iLCJlcmFzZUZpbGUiLCJjYkFmdGVyRmlsZUVyYXNlZCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsb0JBQW9CLEdBQUc7QUFDekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMs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SixHQTlpQ3dCOztBQWdqQ3pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lBLEVBQUFBLGlCQXBqQ3lCLDZCQW9qQ1AxRixRQXBqQ08sRUFvakNFO0FBQ3ZCLFFBQUlBLFFBQVEsQ0FBQzZCLE1BQVQsS0FBa0IsS0FBbEIsSUFBMkI3QixRQUFRLENBQUNxRixRQUFULEtBQXNCakksU0FBckQsRUFBZ0U7QUFDNURrSSxNQUFBQSxXQUFXLENBQUNDLGVBQVosQ0FBNEJ2RixRQUFRLENBQUNxRixRQUFyQztBQUNILEtBRkQsTUFFTztBQUNIbFEsTUFBQUEsb0JBQW9CLENBQUNnRSxtQkFBckI7QUFDSDtBQUNKO0FBMWpDd0IsQ0FBN0IsQyxDQTZqQ0E7O0FBQ0E5RCxDQUFDLENBQUN5QyxRQUFELENBQUQsQ0FBWTZOLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnhRLEVBQUFBLG9CQUFvQixDQUFDZ0IsVUFBckI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cbi8qIGdsb2JhbCBhY2UsIFBieEFwaSwgU3lzbG9nQVBJLCB1cGRhdGVMb2dWaWV3V29ya2VyLCBBY2UsIFVzZXJNZXNzYWdlLCBTVkdUaW1lbGluZSAqL1xuXG4vKipcbiAqIFJlcHJlc2VudHMgdGhlIHN5c3RlbSBkaWFnbm9zdGljIGxvZ3Mgb2JqZWN0LlxuICpcbiAqIEBtb2R1bGUgc3lzdGVtRGlhZ25vc3RpY0xvZ3NcbiAqL1xuY29uc3Qgc3lzdGVtRGlhZ25vc3RpY0xvZ3MgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIFwiU2hvdyBMYXN0IExvZ1wiIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzaG93QnRuOiAkKCcjc2hvdy1sYXN0LWxvZycpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIFwiRG93bmxvYWQgRmlsZVwiIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkb3dubG9hZEJ0bjogJCgnI2Rvd25sb2FkLWZpbGUnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBcIlNob3cgTGFzdCBMb2cgKEF1dG8pXCIgYnV0dG9uLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNob3dBdXRvQnRuOiAkKCcjc2hvdy1sYXN0LWxvZy1hdXRvJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgXCJFcmFzZSBjdXJyZW50IGZpbGUgY29udGVudFwiIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRlcmFzZUJ0bjogJCgnI2VyYXNlLWZpbGUnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBsb2cgY29udGVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRsb2dDb250ZW50OiAkKCcjbG9nLWNvbnRlbnQtcmVhZG9ubHknKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSB2aWV3ZXIgZm9yIGRpc3BsYXlpbmcgdGhlIGxvZyBjb250ZW50LlxuICAgICAqIEB0eXBlIHtBY2V9XG4gICAgICovXG4gICAgdmlld2VyOiAnJyxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmaWxlIHNlbGVjdCBkcm9wZG93bi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmaWxlU2VsZWN0RHJvcERvd246IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBBcnJheSBvZiBsb2cgaXRlbXMuXG4gICAgICogQHR5cGUge0FycmF5fVxuICAgICAqL1xuICAgIGxvZ3NJdGVtczogW10sXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZGltbWVyLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRpbW1lcjogJCgnI2dldC1sb2dzLWRpbW1lcicpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI3N5c3RlbS1kaWFnbm9zdGljLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIEZsYWcgdG8gcHJldmVudCBkdXBsaWNhdGUgQVBJIGNhbGxzIGR1cmluZyBpbml0aWFsaXphdGlvblxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGlzSW5pdGlhbGl6aW5nOiB0cnVlLFxuXG4gICAgLyoqXG4gICAgICogRmxhZyBpbmRpY2F0aW5nIGlmIHRpbWUgc2xpZGVyIG1vZGUgaXMgZW5hYmxlZFxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIHRpbWVTbGlkZXJFbmFibGVkOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIEN1cnJlbnQgdGltZSByYW5nZSBmb3IgdGhlIHNlbGVjdGVkIGxvZyBmaWxlXG4gICAgICogQHR5cGUge29iamVjdHxudWxsfVxuICAgICAqL1xuICAgIGN1cnJlbnRUaW1lUmFuZ2U6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBGbGFnIGluZGljYXRpbmcgaWYgYXV0by11cGRhdGUgbW9kZSBpcyBhY3RpdmVcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBpc0F1dG9VcGRhdGVBY3RpdmU6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIHN5c3RlbSBkaWFnbm9zdGljIGxvZ3MuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgY29uc3QgYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gMjUwO1xuXG4gICAgICAgIC8vIFNldCB0aGUgbWluaW11bSBoZWlnaHQgb2YgdGhlIGxvZyBjb250YWluZXJcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5jbG9zZXN0KCdkaXYnKS5jc3MoJ21pbi1oZWlnaHQnLCBgJHthY2VIZWlnaHR9cHhgKTtcblxuICAgICAgICAvLyBDcmVhdGUgZHJvcGRvd24gVUkgZnJvbSBoaWRkZW4gaW5wdXQgKFY1LjAgcGF0dGVybilcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY3JlYXRlRHJvcGRvd25Gcm9tSGlkZGVuSW5wdXQoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBkcm9wZG93biBtZW51IGZvciBsb2cgZmlsZXMgd2l0aCB0cmVlIHN1cHBvcnRcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTZW1hbnRpYyBVSSBkcm9wZG93biB3aXRoIGN1c3RvbSBtZW51IGdlbmVyYXRpb25cbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6IHN5c3RlbURpYWdub3N0aWNMb2dzLmNiT25DaGFuZ2VGaWxlLFxuICAgICAgICAgICAgICAgIGlnbm9yZUNhc2U6IHRydWUsXG4gICAgICAgICAgICAgICAgZnVsbFRleHRTZWFyY2g6IHRydWUsXG4gICAgICAgICAgICAgICAgZm9yY2VTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgICAgIHByZXNlcnZlSFRNTDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBhbGxvd0NhdGVnb3J5U2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBtYXRjaDogJ3RleHQnLFxuICAgICAgICAgICAgICAgIGZpbHRlclJlbW90ZURhdGE6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGFjdGlvbjogJ2FjdGl2YXRlJyxcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZXM6IHtcbiAgICAgICAgICAgICAgICAgICAgbWVudTogc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY3VzdG9tRHJvcGRvd25NZW51XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGZvbGRlciBjb2xsYXBzZS9leHBhbmQgaGFuZGxlcnMgKHVzZXMgZXZlbnQgZGVsZWdhdGlvbilcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaW5pdGlhbGl6ZUZvbGRlckhhbmRsZXJzKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgQUNFIGVkaXRvciBmb3IgbG9nIGNvbnRlbnRcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaW5pdGlhbGl6ZUFjZSgpO1xuXG4gICAgICAgIC8vIEZldGNoIHRoZSBsaXN0IG9mIGxvZyBmaWxlc1xuICAgICAgICBTeXNsb2dBUEkuZ2V0TG9nc0xpc3Qoc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY2JGb3JtYXREcm9wZG93blJlc3VsdHMpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgbG9nIGxldmVsIGRyb3Bkb3duIC0gVjUuMCBwYXR0ZXJuIHdpdGggRHluYW1pY0Ryb3Bkb3duQnVpbGRlclxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pbml0aWFsaXplTG9nTGV2ZWxEcm9wZG93bigpO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciBxdWljayBwZXJpb2QgYnV0dG9uc1xuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnLnBlcmlvZC1idG4nLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgJGJ0biA9ICQoZS5jdXJyZW50VGFyZ2V0KTtcbiAgICAgICAgICAgIGNvbnN0IHBlcmlvZCA9ICRidG4uZGF0YSgncGVyaW9kJyk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBhY3RpdmUgc3RhdGVcbiAgICAgICAgICAgICQoJy5wZXJpb2QtYnRuJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgJGJ0bi5hZGRDbGFzcygnYWN0aXZlJyk7XG5cbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmFwcGx5UXVpY2tQZXJpb2QocGVyaW9kKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIFwiTm93XCIgYnV0dG9uXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcubm93LWJ0bicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBpZiAoc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY3VycmVudFRpbWVSYW5nZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGVuZCA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmN1cnJlbnRUaW1lUmFuZ2UuZW5kO1xuICAgICAgICAgICAgICAgIGNvbnN0IG9uZUhvdXIgPSAzNjAwO1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0YXJ0ID0gTWF0aC5tYXgoZW5kIC0gb25lSG91ciwgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY3VycmVudFRpbWVSYW5nZS5zdGFydCk7XG4gICAgICAgICAgICAgICAgU1ZHVGltZWxpbmUuc2V0UmFuZ2Uoc3RhcnQsIGVuZCk7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9hZExvZ0J5VGltZVJhbmdlKHN0YXJ0LCBlbmQpO1xuICAgICAgICAgICAgICAgICQoJy5wZXJpb2QtYnRuJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgICAgICQoJy5wZXJpb2QtYnRuW2RhdGEtcGVyaW9kPVwiMzYwMFwiXScpLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIGxvZyBsZXZlbCBmaWx0ZXIgYnV0dG9uc1xuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnLmxldmVsLWJ0bicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkYnRuID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICAgICAgY29uc3QgbGV2ZWwgPSAkYnRuLmRhdGEoJ2xldmVsJyk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBhY3RpdmUgc3RhdGVcbiAgICAgICAgICAgICQoJy5sZXZlbC1idG4nKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAkYnRuLmFkZENsYXNzKCdhY3RpdmUnKTtcblxuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuYXBwbHlMb2dMZXZlbEZpbHRlcihsZXZlbCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciBcIlNob3cgTG9nXCIgYnV0dG9uIGNsaWNrIChkZWxlZ2F0ZWQpXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcjc2hvdy1sYXN0LWxvZycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy51cGRhdGVMb2dGcm9tU2VydmVyKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIExpc3RlbiBmb3IgaGFzaCBjaGFuZ2VzIHRvIHVwZGF0ZSBzZWxlY3RlZCBmaWxlXG4gICAgICAgICQod2luZG93KS5vbignaGFzaGNoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmhhbmRsZUhhc2hDaGFuZ2UoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIFwiRG93bmxvYWQgTG9nXCIgYnV0dG9uIGNsaWNrIChkZWxlZ2F0ZWQpXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcjZG93bmxvYWQtZmlsZScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCBkYXRhID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICAgICAgU3lzbG9nQVBJLmRvd25sb2FkTG9nRmlsZShkYXRhLmZpbGVuYW1lLCB0cnVlLCBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jYkRvd25sb2FkRmlsZSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciBcIkF1dG8gUmVmcmVzaFwiIGJ1dHRvbiBjbGljayAoZGVsZWdhdGVkKVxuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnI3Nob3ctbGFzdC1sb2ctYXV0bycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkYnV0dG9uID0gJCgnI3Nob3ctbGFzdC1sb2ctYXV0bycpO1xuICAgICAgICAgICAgY29uc3QgJHJlbG9hZEljb24gPSAkYnV0dG9uLmZpbmQoJy5pY29ucyBpLnJlZnJlc2gnKTtcbiAgICAgICAgICAgIGlmICgkcmVsb2FkSWNvbi5oYXNDbGFzcygnbG9hZGluZycpKSB7XG4gICAgICAgICAgICAgICAgJHJlbG9hZEljb24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB1cGRhdGVMb2dWaWV3V29ya2VyLnN0b3AoKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHJlbG9hZEljb24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHVwZGF0ZUxvZ1ZpZXdXb3JrZXIuaW5pdGlhbGl6ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgdGhlIFwiRXJhc2UgZmlsZVwiIGJ1dHRvbiBjbGljayAoZGVsZWdhdGVkKVxuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnI2VyYXNlLWZpbGUnLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuZXJhc2VDdXJyZW50RmlsZUNvbnRlbnQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIFwiQ2xlYXIgRmlsdGVyXCIgYnV0dG9uIGNsaWNrIChkZWxlZ2F0ZWQpXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcjY2xlYXItZmlsdGVyLWJ0bicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZmlsdGVyJywgJycpO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudXBkYXRlTG9nRnJvbVNlcnZlcigpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgRW50ZXIga2V5cHJlc3Mgb25seSBvbiBmaWx0ZXIgaW5wdXQgZmllbGRcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2tleXVwJywgJyNmaWx0ZXInLCAoZXZlbnQpID0+IHtcbiAgICAgICAgICAgIGlmIChldmVudC5rZXlDb2RlID09PSAxMykge1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIEZ1bGxzY3JlZW4gYnV0dG9uIGNsaWNrXG4gICAgICAgICQoJy5mdWxsc2NyZWVuLXRvZ2dsZS1idG4nKS5vbignY2xpY2snLCBzeXN0ZW1EaWFnbm9zdGljTG9ncy50b2dnbGVGdWxsU2NyZWVuKTtcblxuICAgICAgICAvLyBMaXN0ZW5pbmcgZm9yIHRoZSBmdWxsc2NyZWVuIGNoYW5nZSBldmVudFxuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdmdWxsc2NyZWVuY2hhbmdlJywgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuYWRqdXN0TG9nSGVpZ2h0KTtcblxuICAgICAgICAvLyBJbml0aWFsIGhlaWdodCBjYWxjdWxhdGlvblxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5hZGp1c3RMb2dIZWlnaHQoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlcyB0aGUgZnVsbC1zY3JlZW4gbW9kZSBvZiB0aGUgJ3N5c3RlbS1sb2dzLXNlZ21lbnQnIGVsZW1lbnQuXG4gICAgICogSWYgdGhlIGVsZW1lbnQgaXMgbm90IGluIGZ1bGwtc2NyZWVuIG1vZGUsIGl0IHJlcXVlc3RzIGZ1bGwtc2NyZWVuIG1vZGUuXG4gICAgICogSWYgdGhlIGVsZW1lbnQgaXMgYWxyZWFkeSBpbiBmdWxsLXNjcmVlbiBtb2RlLCBpdCBleGl0cyBmdWxsLXNjcmVlbiBtb2RlLlxuICAgICAqIExvZ3MgYW4gZXJyb3IgbWVzc2FnZSB0byB0aGUgY29uc29sZSBpZiB0aGVyZSBpcyBhbiBpc3N1ZSBlbmFibGluZyBmdWxsLXNjcmVlbiBtb2RlLlxuICAgICAqXG4gICAgICogQHJldHVybiB7dm9pZH1cbiAgICAgKi9cbiAgICB0b2dnbGVGdWxsU2NyZWVuKCkge1xuICAgICAgICBjb25zdCBsb2dDb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc3lzdGVtLWxvZ3Mtc2VnbWVudCcpO1xuXG4gICAgICAgIGlmICghZG9jdW1lbnQuZnVsbHNjcmVlbkVsZW1lbnQpIHtcbiAgICAgICAgICAgIGxvZ0NvbnRhaW5lci5yZXF1ZXN0RnVsbHNjcmVlbigpLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGBFcnJvciBhdHRlbXB0aW5nIHRvIGVuYWJsZSBmdWxsLXNjcmVlbiBtb2RlOiAke2Vyci5tZXNzYWdlfWApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkb2N1bWVudC5leGl0RnVsbHNjcmVlbigpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZ1bmN0aW9uIHRvIGFkanVzdCB0aGUgaGVpZ2h0IG9mIHRoZSBsb2dzIGRlcGVuZGluZyBvbiB0aGUgc2NyZWVuIG1vZGUuXG4gICAgICovXG4gICAgYWRqdXN0TG9nSGVpZ2h0KCkge1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIGxldCBhY2VIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kbG9nQ29udGVudC5vZmZzZXQoKS50b3AgLSA1NTtcbiAgICAgICAgICAgIGlmIChkb2N1bWVudC5mdWxsc2NyZWVuRWxlbWVudCkge1xuICAgICAgICAgICAgICAgIC8vIElmIGZ1bGxzY3JlZW4gbW9kZSBpcyBhY3RpdmVcbiAgICAgICAgICAgICAgICBhY2VIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSA4MDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFJlY2FsY3VsYXRlIHRoZSBzaXplIG9mIHRoZSBBQ0UgZWRpdG9yXG4gICAgICAgICAgICAkKCcubG9nLWNvbnRlbnQtcmVhZG9ubHknKS5jc3MoJ21pbi1oZWlnaHQnLCAgYCR7YWNlSGVpZ2h0fXB4YCk7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIucmVzaXplKCk7XG4gICAgICAgIH0sIDMwMCk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGxvZyBsZXZlbCBkcm9wZG93biAtIFY1LjAgcGF0dGVybiB3aXRoIEhUTUwgaWNvbnNcbiAgICAgKiBTdGF0aWMgZHJvcGRvd24gd2l0aCBjb2xvcmVkIGljb25zIGFuZCB0cmFuc2xhdGlvbnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplTG9nTGV2ZWxEcm9wZG93bigpIHtcbiAgICAgICAgY29uc3QgJGhpZGRlbklucHV0ID0gJCgnI2xvZ0xldmVsJyk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgZHJvcGRvd24gYWxyZWFkeSBleGlzdHNcbiAgICAgICAgaWYgKCQoJyNsb2dMZXZlbC1kcm9wZG93bicpLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ3JlYXRlIGRyb3Bkb3duIEhUTUwgd2l0aCBjb2xvcmVkIGljb25zXG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9ICQoJzxkaXY+Jywge1xuICAgICAgICAgICAgaWQ6ICdsb2dMZXZlbC1kcm9wZG93bicsXG4gICAgICAgICAgICBjbGFzczogJ3VpIHNlbGVjdGlvbiBkcm9wZG93bidcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3QgJHRleHQgPSAkKCc8ZGl2PicsIHsgY2xhc3M6ICd0ZXh0JyB9KS50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5zZF9BbGxMZXZlbHMpO1xuICAgICAgICBjb25zdCAkaWNvbiA9ICQoJzxpPicsIHsgY2xhc3M6ICdkcm9wZG93biBpY29uJyB9KTtcbiAgICAgICAgY29uc3QgJG1lbnUgPSAkKCc8ZGl2PicsIHsgY2xhc3M6ICdtZW51JyB9KTtcblxuICAgICAgICAvLyBCdWlsZCBtZW51IGl0ZW1zIHdpdGggY29sb3JlZCBpY29uc1xuICAgICAgICBjb25zdCBpdGVtcyA9IFtcbiAgICAgICAgICAgIHsgdmFsdWU6ICcnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc2RfQWxsTGV2ZWxzLCBpY29uOiAnJyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ0VSUk9SJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnNkX0Vycm9yLCBpY29uOiAnPGkgY2xhc3M9XCJleGNsYW1hdGlvbiBjaXJjbGUgcmVkIGljb25cIj48L2k+JyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ1dBUk5JTkcnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc2RfV2FybmluZywgaWNvbjogJzxpIGNsYXNzPVwiZXhjbGFtYXRpb24gdHJpYW5nbGUgb3JhbmdlIGljb25cIj48L2k+JyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ05PVElDRScsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5zZF9Ob3RpY2UsIGljb246ICc8aSBjbGFzcz1cImluZm8gY2lyY2xlIGJsdWUgaWNvblwiPjwvaT4nIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAnSU5GTycsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5zZF9JbmZvLCBpY29uOiAnPGkgY2xhc3M9XCJjaXJjbGUgZ3JleSBpY29uXCI+PC9pPicgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdERUJVRycsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5zZF9EZWJ1ZywgaWNvbjogJzxpIGNsYXNzPVwiYnVnIHB1cnBsZSBpY29uXCI+PC9pPicgfVxuICAgICAgICBdO1xuXG4gICAgICAgIGl0ZW1zLmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkaXRlbSA9ICQoJzxkaXY+Jywge1xuICAgICAgICAgICAgICAgIGNsYXNzOiAnaXRlbScsXG4gICAgICAgICAgICAgICAgJ2RhdGEtdmFsdWUnOiBpdGVtLnZhbHVlXG4gICAgICAgICAgICB9KS5odG1sKGl0ZW0uaWNvbiArIGl0ZW0udGV4dCk7XG4gICAgICAgICAgICAkbWVudS5hcHBlbmQoJGl0ZW0pO1xuICAgICAgICB9KTtcblxuICAgICAgICAkZHJvcGRvd24uYXBwZW5kKCR0ZXh0LCAkaWNvbiwgJG1lbnUpO1xuICAgICAgICAkaGlkZGVuSW5wdXQuYWZ0ZXIoJGRyb3Bkb3duKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIFNlbWFudGljIFVJIGRyb3Bkb3duXG4gICAgICAgICRkcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogKHZhbHVlKSA9PiB7XG4gICAgICAgICAgICAgICAgJGhpZGRlbklucHV0LnZhbCh2YWx1ZSkudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudXBkYXRlTG9nRnJvbVNlcnZlcigpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBkcm9wZG93biBVSSBlbGVtZW50IGZyb20gaGlkZGVuIGlucHV0IGZpZWxkIChWNS4wIHBhdHRlcm4pXG4gICAgICovXG4gICAgY3JlYXRlRHJvcGRvd25Gcm9tSGlkZGVuSW5wdXQoKSB7XG4gICAgICAgIGNvbnN0ICRoaWRkZW5JbnB1dCA9ICQoJyNmaWxlbmFtZXMnKTtcblxuICAgICAgICBpZiAoISRoaWRkZW5JbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0hpZGRlbiBpbnB1dCAjZmlsZW5hbWVzIG5vdCBmb3VuZCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJCgnPGRpdj4nLCB7XG4gICAgICAgICAgICBpZDogJ2ZpbGVuYW1lcy1kcm9wZG93bicsXG4gICAgICAgICAgICBjbGFzczogJ3VpIHNlYXJjaCBzZWxlY3Rpb24gZHJvcGRvd24gZmlsZW5hbWVzLXNlbGVjdCBmbHVpZCdcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJGRyb3Bkb3duLmFwcGVuZChcbiAgICAgICAgICAgICQoJzxpPicsIHsgY2xhc3M6ICdkcm9wZG93biBpY29uJyB9KSxcbiAgICAgICAgICAgICQoJzxpbnB1dD4nLCB7IHR5cGU6ICd0ZXh0JywgY2xhc3M6ICdzZWFyY2gnLCB0YWJpbmRleDogMCB9KSxcbiAgICAgICAgICAgICQoJzxkaXY+JywgeyBjbGFzczogJ2RlZmF1bHQgdGV4dCcgfSkudGV4dCgnU2VsZWN0IGxvZyBmaWxlJyksXG4gICAgICAgICAgICAkKCc8ZGl2PicsIHsgY2xhc3M6ICdtZW51JyB9KVxuICAgICAgICApO1xuXG4gICAgICAgICRoaWRkZW5JbnB1dC5iZWZvcmUoJGRyb3Bkb3duKTtcbiAgICAgICAgJGhpZGRlbklucHV0LmhpZGUoKTtcblxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duID0gJGRyb3Bkb3duO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgQUNFIGVkaXRvciBmb3IgbG9nIHZpZXdpbmcuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUFjZSgpIHtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyID0gYWNlLmVkaXQoJ2xvZy1jb250ZW50LXJlYWRvbmx5Jyk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIEp1bGlhIG1vZGUgaXMgYXZhaWxhYmxlXG4gICAgICAgIGNvbnN0IGp1bGlhID0gYWNlLnJlcXVpcmUoJ2FjZS9tb2RlL2p1bGlhJyk7XG4gICAgICAgIGlmIChqdWxpYSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAvLyBTZXQgdGhlIG1vZGUgdG8gSnVsaWEgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICBjb25zdCBJbmlNb2RlID0ganVsaWEuTW9kZTtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlci5zZXNzaW9uLnNldE1vZGUobmV3IEluaU1vZGUoKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgdGhlIHRoZW1lIGFuZCBvcHRpb25zIGZvciB0aGUgQUNFIGVkaXRvclxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIuc2V0VGhlbWUoJ2FjZS90aGVtZS9tb25va2FpJyk7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlci5yZW5kZXJlci5zZXRTaG93R3V0dGVyKGZhbHNlKTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnNldE9wdGlvbnMoe1xuICAgICAgICAgICAgc2hvd0xpbmVOdW1iZXJzOiBmYWxzZSxcbiAgICAgICAgICAgIHNob3dQcmludE1hcmdpbjogZmFsc2UsXG4gICAgICAgICAgICByZWFkT25seTogdHJ1ZSxcbiAgICAgICAgfSk7XG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQnVpbGRzIGEgaGllcmFyY2hpY2FsIHRyZWUgc3RydWN0dXJlIGZyb20gZmxhdCBmaWxlIHBhdGhzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGZpbGVzIC0gVGhlIGZpbGVzIG9iamVjdCBmcm9tIEFQSSByZXNwb25zZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBkZWZhdWx0UGF0aCAtIFRoZSBkZWZhdWx0IHNlbGVjdGVkIGZpbGUgcGF0aFxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gVHJlZSBzdHJ1Y3R1cmUgZm9yIHRoZSBkcm9wZG93blxuICAgICAqL1xuICAgIGJ1aWxkVHJlZVN0cnVjdHVyZShmaWxlcywgZGVmYXVsdFBhdGgpIHtcbiAgICAgICAgY29uc3QgdHJlZSA9IHt9O1xuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgdGhlIHRyZWUgc3RydWN0dXJlXG4gICAgICAgIE9iamVjdC5lbnRyaWVzKGZpbGVzKS5mb3JFYWNoKChba2V5LCBmaWxlRGF0YV0pID0+IHtcbiAgICAgICAgICAgIC8vIFVzZSBmaWxlRGF0YS5wYXRoIGFzIHRoZSBhY3R1YWwgZmlsZSBwYXRoXG4gICAgICAgICAgICBjb25zdCBmaWxlUGF0aCA9IGZpbGVEYXRhLnBhdGggfHwga2V5O1xuICAgICAgICAgICAgY29uc3QgcGFydHMgPSBmaWxlUGF0aC5zcGxpdCgnLycpO1xuICAgICAgICAgICAgbGV0IGN1cnJlbnQgPSB0cmVlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBwYXJ0cy5mb3JFYWNoKChwYXJ0LCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChpbmRleCA9PT0gcGFydHMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBUaGlzIGlzIGEgZmlsZVxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50W3BhcnRdID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ZpbGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogZmlsZVBhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBzaXplOiBmaWxlRGF0YS5zaXplLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogKGRlZmF1bHRQYXRoICYmIGRlZmF1bHRQYXRoID09PSBmaWxlUGF0aCkgfHwgKCFkZWZhdWx0UGF0aCAmJiBmaWxlRGF0YS5kZWZhdWx0KVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgaXMgYSBkaXJlY3RvcnlcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFjdXJyZW50W3BhcnRdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50W3BhcnRdID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdmb2xkZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiB7fVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50ID0gY3VycmVudFtwYXJ0XS5jaGlsZHJlbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDb252ZXJ0IHRyZWUgdG8gZHJvcGRvd24gaXRlbXNcbiAgICAgICAgcmV0dXJuIHRoaXMudHJlZVRvRHJvcGRvd25JdGVtcyh0cmVlLCAnJyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDb252ZXJ0cyB0cmVlIHN0cnVjdHVyZSB0byBkcm9wZG93biBpdGVtcyB3aXRoIHByb3BlciBmb3JtYXR0aW5nXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHRyZWUgLSBUaGUgdHJlZSBzdHJ1Y3R1cmVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcHJlZml4IC0gUHJlZml4IGZvciBpbmRlbnRhdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJlbnRGb2xkZXIgLSBQYXJlbnQgZm9sZGVyIG5hbWUgZm9yIGdyb3VwaW5nXG4gICAgICogQHJldHVybnMge0FycmF5fSBGb3JtYXR0ZWQgZHJvcGRvd24gaXRlbXNcbiAgICAgKi9cbiAgICB0cmVlVG9Ecm9wZG93bkl0ZW1zKHRyZWUsIHByZWZpeCwgcGFyZW50Rm9sZGVyID0gJycpIHtcbiAgICAgICAgY29uc3QgaXRlbXMgPSBbXTtcblxuICAgICAgICAvLyBTb3J0IGVudHJpZXM6IGZvbGRlcnMgZmlyc3QsIHRoZW4gZmlsZXNcbiAgICAgICAgY29uc3QgZW50cmllcyA9IE9iamVjdC5lbnRyaWVzKHRyZWUpLnNvcnQoKFthS2V5LCBhVmFsXSwgW2JLZXksIGJWYWxdKSA9PiB7XG4gICAgICAgICAgICBpZiAoYVZhbC50eXBlID09PSAnZm9sZGVyJyAmJiBiVmFsLnR5cGUgPT09ICdmaWxlJykgcmV0dXJuIC0xO1xuICAgICAgICAgICAgaWYgKGFWYWwudHlwZSA9PT0gJ2ZpbGUnICYmIGJWYWwudHlwZSA9PT0gJ2ZvbGRlcicpIHJldHVybiAxO1xuICAgICAgICAgICAgcmV0dXJuIGFLZXkubG9jYWxlQ29tcGFyZShiS2V5KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZW50cmllcy5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcbiAgICAgICAgICAgIGlmICh2YWx1ZS50eXBlID09PSAnZm9sZGVyJykge1xuICAgICAgICAgICAgICAgIC8vIEFkZCBmb2xkZXIgaGVhZGVyIHdpdGggdG9nZ2xlIGNhcGFiaWxpdHlcbiAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogYDxpIGNsYXNzPVwiY2FyZXQgZG93biBpY29uIGZvbGRlci10b2dnbGVcIj48L2k+PGkgY2xhc3M9XCJmb2xkZXIgaWNvblwiPjwvaT4gJHtrZXl9YCxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICcnLFxuICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ZvbGRlcicsXG4gICAgICAgICAgICAgICAgICAgIGZvbGRlck5hbWU6IGtleVxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gQWRkIGNoaWxkcmVuIHdpdGggaW5jcmVhc2VkIGluZGVudGF0aW9uIGFuZCBwYXJlbnQgZm9sZGVyIHJlZmVyZW5jZVxuICAgICAgICAgICAgICAgIGNvbnN0IGNoaWxkSXRlbXMgPSB0aGlzLnRyZWVUb0Ryb3Bkb3duSXRlbXModmFsdWUuY2hpbGRyZW4sIHByZWZpeCArICcmbmJzcDsmbmJzcDsmbmJzcDsmbmJzcDsnLCBrZXkpO1xuICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goLi4uY2hpbGRJdGVtcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEFkZCBmaWxlIGl0ZW0gd2l0aCBwYXJlbnQgZm9sZGVyIHJlZmVyZW5jZVxuICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBgJHtwcmVmaXh9PGkgY2xhc3M9XCJmaWxlIG91dGxpbmUgaWNvblwiPjwvaT4gJHtrZXl9ICgke3ZhbHVlLnNpemV9KWAsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZS5wYXRoLFxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZDogdmFsdWUuZGVmYXVsdCxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ZpbGUnLFxuICAgICAgICAgICAgICAgICAgICBwYXJlbnRGb2xkZXI6IHBhcmVudEZvbGRlclxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gaXRlbXM7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGN1c3RvbSBkcm9wZG93biBtZW51IEhUTUwgZm9yIGxvZyBmaWxlcyB3aXRoIGNvbGxhcHNpYmxlIGZvbGRlcnNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgY29udGFpbmluZyBkcm9wZG93biBtZW51IG9wdGlvbnNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZmllbGRzIC0gVGhlIGZpZWxkcyBpbiB0aGUgcmVzcG9uc2UgdG8gdXNlIGZvciB0aGUgbWVudSBvcHRpb25zXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVGhlIEhUTUwgc3RyaW5nIGZvciB0aGUgY3VzdG9tIGRyb3Bkb3duIG1lbnVcbiAgICAgKi9cbiAgICBjdXN0b21Ecm9wZG93bk1lbnUocmVzcG9uc2UsIGZpZWxkcykge1xuICAgICAgICBjb25zdCB2YWx1ZXMgPSByZXNwb25zZVtmaWVsZHMudmFsdWVzXSB8fCB7fTtcbiAgICAgICAgbGV0IGh0bWwgPSAnJztcblxuICAgICAgICAkLmVhY2godmFsdWVzLCAoaW5kZXgsIG9wdGlvbikgPT4ge1xuICAgICAgICAgICAgLy8gRm9yIHRyZWUgc3RydWN0dXJlIGl0ZW1zXG4gICAgICAgICAgICBpZiAoc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zICYmIHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtc1tpbmRleF0pIHtcbiAgICAgICAgICAgICAgICBjb25zdCBpdGVtID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zW2luZGV4XTtcblxuICAgICAgICAgICAgICAgIGlmIChpdGVtLnR5cGUgPT09ICdmb2xkZXInKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZvbGRlciBpdGVtIC0gY2xpY2thYmxlIGhlYWRlciBmb3IgY29sbGFwc2UvZXhwYW5kXG4gICAgICAgICAgICAgICAgICAgIC8vIE5vdCB1c2luZyAnZGlzYWJsZWQnIGNsYXNzIGFzIGl0IGJsb2NrcyBwb2ludGVyIGV2ZW50c1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiZm9sZGVyLWhlYWRlciBpdGVtXCIgZGF0YS1mb2xkZXI9XCIke2l0ZW0uZm9sZGVyTmFtZX1cIiBkYXRhLXZhbHVlPVwiXCIgc3R5bGU9XCJwb2ludGVyLWV2ZW50czogYXV0byAhaW1wb3J0YW50OyBjdXJzb3I6IHBvaW50ZXI7IGZvbnQtd2VpZ2h0OiBib2xkOyBiYWNrZ3JvdW5kOiAjZjlmOWY5O1wiPiR7aXRlbS5uYW1lfTwvZGl2PmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRmlsZSBpdGVtIHdpdGggcGFyZW50IGZvbGRlciByZWZlcmVuY2UgZm9yIGNvbGxhcHNlXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdGVkID0gaXRlbS5zZWxlY3RlZCA/ICdzZWxlY3RlZCBhY3RpdmUnIDogJyc7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhcmVudEF0dHIgPSBpdGVtLnBhcmVudEZvbGRlciA/IGBkYXRhLXBhcmVudD1cIiR7aXRlbS5wYXJlbnRGb2xkZXJ9XCJgIDogJyc7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtIGZpbGUtaXRlbSAke3NlbGVjdGVkfVwiIGRhdGEtdmFsdWU9XCIke29wdGlvbltmaWVsZHMudmFsdWVdfVwiICR7cGFyZW50QXR0cn0+JHtpdGVtLm5hbWV9PC9kaXY+YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIHJlZ3VsYXIgaXRlbVxuICAgICAgICAgICAgICAgIGNvbnN0IG1heWJlRGlzYWJsZWQgPSAob3B0aW9uW2ZpZWxkcy5kaXNhYmxlZF0pID8gJ2Rpc2FibGVkICcgOiAnJztcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiJHttYXliZURpc2FibGVkfWl0ZW1cIiBkYXRhLXZhbHVlPVwiJHtvcHRpb25bZmllbGRzLnZhbHVlXX1cIj4ke29wdGlvbltmaWVsZHMubmFtZV19PC9kaXY+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIGZvbGRlciBjb2xsYXBzZS9leHBhbmQgaGFuZGxlcnMgYW5kIHNlYXJjaCBiZWhhdmlvclxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb2xkZXJIYW5kbGVycygpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bjtcblxuICAgICAgICAvLyBIYW5kbGUgZm9sZGVyIGhlYWRlciBjbGlja3MgZm9yIGNvbGxhcHNlL2V4cGFuZFxuICAgICAgICAvLyBVc2UgZG9jdW1lbnQtbGV2ZWwgaGFuZGxlciB3aXRoIGNhcHR1cmUgcGhhc2UgdG8gaW50ZXJjZXB0IGJlZm9yZSBGb21hbnRpY1xuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiBjbGljayBpcyBpbnNpZGUgb3VyIGRyb3Bkb3duJ3MgZm9sZGVyLWhlYWRlclxuICAgICAgICAgICAgY29uc3QgZm9sZGVySGVhZGVyID0gZS50YXJnZXQuY2xvc2VzdCgnI2ZpbGVuYW1lcy1kcm9wZG93biAuZm9sZGVyLWhlYWRlcicpO1xuICAgICAgICAgICAgaWYgKCFmb2xkZXJIZWFkZXIpIHJldHVybjtcblxuICAgICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICAgICAgY29uc3QgJGZvbGRlciA9ICQoZm9sZGVySGVhZGVyKTtcbiAgICAgICAgICAgIGNvbnN0IGZvbGRlck5hbWUgPSAkZm9sZGVyLmRhdGEoJ2ZvbGRlcicpO1xuICAgICAgICAgICAgY29uc3QgJHRvZ2dsZSA9ICRmb2xkZXIuZmluZCgnLmZvbGRlci10b2dnbGUnKTtcbiAgICAgICAgICAgIGNvbnN0ICRtZW51ID0gJGRyb3Bkb3duLmZpbmQoJy5tZW51Jyk7XG4gICAgICAgICAgICBjb25zdCAkZmlsZXMgPSAkbWVudS5maW5kKGAuZmlsZS1pdGVtW2RhdGEtcGFyZW50PVwiJHtmb2xkZXJOYW1lfVwiXWApO1xuXG4gICAgICAgICAgICAvLyBUb2dnbGUgZm9sZGVyIHN0YXRlXG4gICAgICAgICAgICBjb25zdCBpc0NvbGxhcHNlZCA9ICR0b2dnbGUuaGFzQ2xhc3MoJ3JpZ2h0Jyk7XG5cbiAgICAgICAgICAgIGlmIChpc0NvbGxhcHNlZCkge1xuICAgICAgICAgICAgICAgIC8vIEV4cGFuZCBmb2xkZXJcbiAgICAgICAgICAgICAgICAkdG9nZ2xlLnJlbW92ZUNsYXNzKCdyaWdodCcpLmFkZENsYXNzKCdkb3duJyk7XG4gICAgICAgICAgICAgICAgJGZpbGVzLnNob3coKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gQ29sbGFwc2UgZm9sZGVyXG4gICAgICAgICAgICAgICAgJHRvZ2dsZS5yZW1vdmVDbGFzcygnZG93bicpLmFkZENsYXNzKCdyaWdodCcpO1xuICAgICAgICAgICAgICAgICRmaWxlcy5oaWRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHRydWUpOyAvLyBjYXB0dXJlIHBoYXNlIC0gZmlyZXMgYmVmb3JlIGJ1YmJsaW5nXG5cbiAgICAgICAgLy8gSGFuZGxlIHNlYXJjaCBpbnB1dCAtIHNob3cgYWxsIGl0ZW1zIHdoZW4gc2VhcmNoaW5nXG4gICAgICAgICRkcm9wZG93bi5vbignaW5wdXQnLCAnaW5wdXQuc2VhcmNoJywgKGUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHNlYXJjaFZhbHVlID0gJChlLnRhcmdldCkudmFsKCkudHJpbSgpO1xuICAgICAgICAgICAgY29uc3QgJG1lbnUgPSAkZHJvcGRvd24uZmluZCgnLm1lbnUnKTtcblxuICAgICAgICAgICAgaWYgKHNlYXJjaFZhbHVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGFsbCBpdGVtcyBhbmQgZXhwYW5kIGFsbCBmb2xkZXJzIGR1cmluZyBzZWFyY2hcbiAgICAgICAgICAgICAgICAkbWVudS5maW5kKCcuZmlsZS1pdGVtJykuc2hvdygpO1xuICAgICAgICAgICAgICAgICRtZW51LmZpbmQoJy5mb2xkZXItdG9nZ2xlJykucmVtb3ZlQ2xhc3MoJ3JpZ2h0JykuYWRkQ2xhc3MoJ2Rvd24nKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gUmVzdG9yZSBjb2xsYXBzZWQgc3RhdGUgd2hlbiBzZWFyY2ggaXMgY2xlYXJlZFxuICAgICAgICAgICAgICAgICRtZW51LmZpbmQoJy5mb2xkZXItaGVhZGVyJykuZWFjaCgoXywgZm9sZGVyKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRmb2xkZXIgPSAkKGZvbGRlcik7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvbGRlck5hbWUgPSAkZm9sZGVyLmRhdGEoJ2ZvbGRlcicpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBpc0NvbGxhcHNlZCA9ICRmb2xkZXIuZmluZCgnLmZvbGRlci10b2dnbGUnKS5oYXNDbGFzcygncmlnaHQnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzQ29sbGFwc2VkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkbWVudS5maW5kKGAuZmlsZS1pdGVtW2RhdGEtcGFyZW50PVwiJHtmb2xkZXJOYW1lfVwiXWApLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRXhwYW5kcyB0aGUgZm9sZGVyIGNvbnRhaW5pbmcgdGhlIHNwZWNpZmllZCBmaWxlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVQYXRoIC0gVGhlIGZpbGUgcGF0aCB0byBmaW5kIGFuZCBleHBhbmQgaXRzIHBhcmVudCBmb2xkZXJcbiAgICAgKi9cbiAgICBleHBhbmRGb2xkZXJGb3JGaWxlKGZpbGVQYXRoKSB7XG4gICAgICAgIGlmICghZmlsZVBhdGgpIHJldHVybjtcblxuICAgICAgICBjb25zdCAkbWVudSA9IHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZmluZCgnLm1lbnUnKTtcbiAgICAgICAgY29uc3QgJGZpbGVJdGVtID0gJG1lbnUuZmluZChgLmZpbGUtaXRlbVtkYXRhLXZhbHVlPVwiJHtmaWxlUGF0aH1cIl1gKTtcblxuICAgICAgICBpZiAoJGZpbGVJdGVtLmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc3QgcGFyZW50Rm9sZGVyID0gJGZpbGVJdGVtLmRhdGEoJ3BhcmVudCcpO1xuICAgICAgICAgICAgaWYgKHBhcmVudEZvbGRlcikge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRmb2xkZXIgPSAkbWVudS5maW5kKGAuZm9sZGVyLWhlYWRlcltkYXRhLWZvbGRlcj1cIiR7cGFyZW50Rm9sZGVyfVwiXWApO1xuICAgICAgICAgICAgICAgIGNvbnN0ICR0b2dnbGUgPSAkZm9sZGVyLmZpbmQoJy5mb2xkZXItdG9nZ2xlJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBFeHBhbmQgaWYgY29sbGFwc2VkXG4gICAgICAgICAgICAgICAgaWYgKCR0b2dnbGUuaGFzQ2xhc3MoJ3JpZ2h0JykpIHtcbiAgICAgICAgICAgICAgICAgICAgJHRvZ2dsZS5yZW1vdmVDbGFzcygncmlnaHQnKS5hZGRDbGFzcygnZG93bicpO1xuICAgICAgICAgICAgICAgICAgICAkbWVudS5maW5kKGAuZmlsZS1pdGVtW2RhdGEtcGFyZW50PVwiJHtwYXJlbnRGb2xkZXJ9XCJdYCkuc2hvdygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIGhhc2ggY2hhbmdlcyB0byB1cGRhdGUgdGhlIHNlbGVjdGVkIGZpbGVcbiAgICAgKi9cbiAgICBoYW5kbGVIYXNoQ2hhbmdlKCkge1xuICAgICAgICAvLyBTa2lwIGR1cmluZyBpbml0aWFsaXphdGlvbiB0byBwcmV2ZW50IGR1cGxpY2F0ZSBBUEkgY2FsbHNcbiAgICAgICAgaWYgKHN5c3RlbURpYWdub3N0aWNMb2dzLmlzSW5pdGlhbGl6aW5nKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBoYXNoID0gd2luZG93LmxvY2F0aW9uLmhhc2g7XG4gICAgICAgIGlmIChoYXNoICYmIGhhc2guc3RhcnRzV2l0aCgnI2ZpbGU9JykpIHtcbiAgICAgICAgICAgIGNvbnN0IGZpbGVQYXRoID0gZGVjb2RlVVJJQ29tcG9uZW50KGhhc2guc3Vic3RyaW5nKDYpKTtcbiAgICAgICAgICAgIGlmIChmaWxlUGF0aCAmJiBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdnZXQgdmFsdWUnKSAhPT0gZmlsZVBhdGgpIHtcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgZmlsZSBleGlzdHMgaW4gZHJvcGRvd24gaXRlbXNcbiAgICAgICAgICAgICAgICBjb25zdCBmaWxlRXhpc3RzID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zLnNvbWUoaXRlbSA9PlxuICAgICAgICAgICAgICAgICAgICBpdGVtLnR5cGUgPT09ICdmaWxlJyAmJiBpdGVtLnZhbHVlID09PSBmaWxlUGF0aFxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgaWYgKGZpbGVFeGlzdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRXhwYW5kIHBhcmVudCBmb2xkZXIgYmVmb3JlIHNlbGVjdGluZyBmaWxlXG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmV4cGFuZEZvbGRlckZvckZpbGUoZmlsZVBhdGgpO1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBmaWxlUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldCB0ZXh0JywgZmlsZVBhdGgpO1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZmlsZW5hbWUnLCBmaWxlUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgZmlsZSBwYXRoIGZyb20gVVJMIGhhc2ggaWYgcHJlc2VudFxuICAgICAqL1xuICAgIGdldEZpbGVGcm9tSGFzaCgpIHtcbiAgICAgICAgY29uc3QgaGFzaCA9IHdpbmRvdy5sb2NhdGlvbi5oYXNoO1xuICAgICAgICBpZiAoaGFzaCAmJiBoYXNoLnN0YXJ0c1dpdGgoJyNmaWxlPScpKSB7XG4gICAgICAgICAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KGhhc2guc3Vic3RyaW5nKDYpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGZvcm1hdCB0aGUgZHJvcGRvd24gbWVudSBzdHJ1Y3R1cmUgYmFzZWQgb24gdGhlIHJlc3BvbnNlLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBkYXRhLlxuICAgICAqL1xuICAgIGNiRm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIHJlc3BvbnNlIGlzIHZhbGlkXG4gICAgICAgIGlmICghcmVzcG9uc2UgfHwgIXJlc3BvbnNlLnJlc3VsdCB8fCAhcmVzcG9uc2UuZGF0YSB8fCAhcmVzcG9uc2UuZGF0YS5maWxlcykge1xuICAgICAgICAgICAgLy8gSGlkZSBkaW1tZXIgb25seSBpZiBub3QgaW4gYXV0by11cGRhdGUgbW9kZVxuICAgICAgICAgICAgaWYgKCFzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGZpbGVzID0gcmVzcG9uc2UuZGF0YS5maWxlcztcblxuICAgICAgICAvLyBDaGVjayBmb3IgZmlsZSBmcm9tIGhhc2ggZmlyc3RcbiAgICAgICAgbGV0IGRlZlZhbCA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmdldEZpbGVGcm9tSGFzaCgpO1xuXG4gICAgICAgIC8vIElmIG5vIGhhc2ggdmFsdWUsIGNoZWNrIGlmIHRoZXJlIGlzIGEgZGVmYXVsdCB2YWx1ZSBzZXQgZm9yIHRoZSBmaWxlbmFtZSBpbnB1dCBmaWVsZFxuICAgICAgICBpZiAoIWRlZlZhbCkge1xuICAgICAgICAgICAgY29uc3QgZmlsZU5hbWUgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZmlsZW5hbWUnKTtcbiAgICAgICAgICAgIGlmIChmaWxlTmFtZSAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICBkZWZWYWwgPSBmaWxlTmFtZS50cmltKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBCdWlsZCB0cmVlIHN0cnVjdHVyZSBmcm9tIGZpbGVzXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtcyA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmJ1aWxkVHJlZVN0cnVjdHVyZShmaWxlcywgZGVmVmFsKTtcblxuICAgICAgICAvLyBDcmVhdGUgdmFsdWVzIGFycmF5IGZvciBkcm9wZG93biB3aXRoIGFsbCBpdGVtcyAoaW5jbHVkaW5nIGZvbGRlcnMpXG4gICAgICAgIGNvbnN0IGRyb3Bkb3duVmFsdWVzID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zLm1hcCgoaXRlbSwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGlmIChpdGVtLnR5cGUgPT09ICdmb2xkZXInKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogaXRlbS5uYW1lLnJlcGxhY2UoLzxbXj5dKj4vZywgJycpLCAvLyBSZW1vdmUgSFRNTCB0YWdzIGZvciBzZWFyY2hcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICcnLFxuICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZDogdHJ1ZVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGl0ZW0ubmFtZS5yZXBsYWNlKC88W14+XSo+L2csICcnKSwgLy8gUmVtb3ZlIEhUTUwgdGFncyBmb3Igc2VhcmNoXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBpdGVtLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZDogaXRlbS5zZWxlY3RlZFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGRyb3Bkb3duIHdpdGggdmFsdWVzXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldHVwIG1lbnUnLCB7XG4gICAgICAgICAgICB2YWx1ZXM6IGRyb3Bkb3duVmFsdWVzXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCB0aGUgZGVmYXVsdCBzZWxlY3RlZCB2YWx1ZSBpZiBhbnlcbiAgICAgICAgY29uc3Qgc2VsZWN0ZWRJdGVtID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zLmZpbmQoaXRlbSA9PiBpdGVtLnNlbGVjdGVkKTtcbiAgICAgICAgaWYgKHNlbGVjdGVkSXRlbSkge1xuICAgICAgICAgICAgLy8gVXNlIHNldFRpbWVvdXQgdG8gZW5zdXJlIGRyb3Bkb3duIGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBFeHBhbmQgcGFyZW50IGZvbGRlciBiZWZvcmUgc2VsZWN0aW5nIGZpbGVcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5leHBhbmRGb2xkZXJGb3JGaWxlKHNlbGVjdGVkSXRlbS52YWx1ZSk7XG4gICAgICAgICAgICAgICAgLy8gU2V0dGluZyBzZWxlY3RlZCB2YWx1ZSB3aWxsIHRyaWdnZXIgb25DaGFuZ2UgY2FsbGJhY2sgd2hpY2ggY2FsbHMgdXBkYXRlTG9nRnJvbVNlcnZlcigpXG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgc2VsZWN0ZWRJdGVtLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAvLyBGb3JjZSByZWZyZXNoIHRoZSBkcm9wZG93biB0byBzaG93IHRoZSBzZWxlY3RlZCB2YWx1ZVxuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3JlZnJlc2gnKTtcbiAgICAgICAgICAgICAgICAvLyBBbHNvIHNldCB0aGUgdGV4dCB0byBzaG93IGZ1bGwgcGF0aFxuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldCB0ZXh0Jywgc2VsZWN0ZWRJdGVtLnZhbHVlKTtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZmlsZW5hbWUnLCBzZWxlY3RlZEl0ZW0udmFsdWUpO1xuICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgfSBlbHNlIGlmIChkZWZWYWwpIHtcbiAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgYSBkZWZhdWx0IHZhbHVlIGJ1dCBubyBpdGVtIHdhcyBtYXJrZWQgYXMgc2VsZWN0ZWQsXG4gICAgICAgICAgICAvLyB0cnkgdG8gZmluZCBhbmQgc2VsZWN0IGl0IG1hbnVhbGx5XG4gICAgICAgICAgICBjb25zdCBpdGVtVG9TZWxlY3QgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXMuZmluZChpdGVtID0+XG4gICAgICAgICAgICAgICAgaXRlbS50eXBlID09PSAnZmlsZScgJiYgaXRlbS52YWx1ZSA9PT0gZGVmVmFsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgaWYgKGl0ZW1Ub1NlbGVjdCkge1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyBFeHBhbmQgcGFyZW50IGZvbGRlciBiZWZvcmUgc2VsZWN0aW5nIGZpbGVcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuZXhwYW5kRm9sZGVyRm9yRmlsZShpdGVtVG9TZWxlY3QudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAvLyBTZXR0aW5nIHNlbGVjdGVkIHZhbHVlIHdpbGwgdHJpZ2dlciBvbkNoYW5nZSBjYWxsYmFjayB3aGljaCBjYWxscyB1cGRhdGVMb2dGcm9tU2VydmVyKClcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgaXRlbVRvU2VsZWN0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bigncmVmcmVzaCcpO1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXQgdGV4dCcsIGl0ZW1Ub1NlbGVjdC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmaWxlbmFtZScsIGl0ZW1Ub1NlbGVjdC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gSGlkZSB0aGUgZGltbWVyIGFmdGVyIGxvYWRpbmcgb25seSBpZiBubyBmaWxlIGlzIHNlbGVjdGVkXG4gICAgICAgICAgICAgICAgaWYgKCFzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSGlkZSB0aGUgZGltbWVyIGFmdGVyIGxvYWRpbmcgb25seSBpZiBubyBmaWxlIGlzIHNlbGVjdGVkXG4gICAgICAgICAgICBpZiAoIXN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gTWFyayBpbml0aWFsaXphdGlvbiBhcyBjb21wbGV0ZSB0byBhbGxvdyBoYXNoY2hhbmdlIGhhbmRsZXIgdG8gd29ya1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmlzSW5pdGlhbGl6aW5nID0gZmFsc2U7XG4gICAgICAgIH0sIDIwMCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGNoYW5naW5nIHRoZSBsb2cgZmlsZSBpbiB0aGUgc2VsZWN0IGRyb3Bkb3duLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSBzZWxlY3RlZCB2YWx1ZS5cbiAgICAgKi9cbiAgICBjYk9uQ2hhbmdlRmlsZSh2YWx1ZSkge1xuICAgICAgICBpZiAodmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgZHJvcGRvd24gdGV4dCB0byBzaG93IHRoZSBmdWxsIGZpbGUgcGF0aFxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXQgdGV4dCcsIHZhbHVlKTtcblxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZmlsZW5hbWUnLCB2YWx1ZSk7XG5cbiAgICAgICAgLy8gVXBkYXRlIFVSTCBoYXNoIHdpdGggdGhlIHNlbGVjdGVkIGZpbGVcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLmhhc2ggPSAnZmlsZT0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlKTtcblxuICAgICAgICAvLyBSZXNldCBmaWx0ZXJzIG9ubHkgaWYgdXNlciBtYW51YWxseSBjaGFuZ2VkIHRoZSBmaWxlIChub3QgZHVyaW5nIGluaXRpYWxpemF0aW9uKVxuICAgICAgICBpZiAoIXN5c3RlbURpYWdub3N0aWNMb2dzLmlzSW5pdGlhbGl6aW5nKSB7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5yZXNldEZpbHRlcnMoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIHRpbWUgcmFuZ2UgaXMgYXZhaWxhYmxlIGZvciB0aGlzIGZpbGVcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY2hlY2tUaW1lUmFuZ2VBdmFpbGFiaWxpdHkodmFsdWUpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXNldCBhbGwgZmlsdGVycyB3aGVuIGNoYW5naW5nIGxvZyBmaWxlc1xuICAgICAqL1xuICAgIHJlc2V0RmlsdGVycygpIHtcbiAgICAgICAgLy8gRGVhY3RpdmF0ZSBhbGwgcXVpY2stcGVyaW9kIGJ1dHRvbnNcbiAgICAgICAgJCgnLnBlcmlvZC1idG4nKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG5cbiAgICAgICAgLy8gUmVzZXQgbG9nTGV2ZWwgZHJvcGRvd24gdG8gZGVmYXVsdCAoQWxsIExldmVscyAtIGVtcHR5IHZhbHVlKVxuICAgICAgICAkKCcjbG9nTGV2ZWwtZHJvcGRvd24nKS5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgJycpO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbG9nTGV2ZWwnLCAnJyk7XG5cbiAgICAgICAgLy8gQ2xlYXIgZmlsdGVyIGlucHV0IGZpZWxkXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmaWx0ZXInLCAnJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIHRpbWUgcmFuZ2UgaXMgYXZhaWxhYmxlIGZvciB0aGUgc2VsZWN0ZWQgbG9nIGZpbGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZW5hbWUgLSBMb2cgZmlsZSBwYXRoXG4gICAgICovXG4gICAgYXN5bmMgY2hlY2tUaW1lUmFuZ2VBdmFpbGFiaWxpdHkoZmlsZW5hbWUpIHtcbiAgICAgICAgLy8gU2hvdyBkaW1tZXIgb25seSBpZiBub3QgaW4gYXV0by11cGRhdGUgbW9kZVxuICAgICAgICBpZiAoIXN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gVHJ5IHRvIGdldCB0aW1lIHJhbmdlIGZvciB0aGlzIGZpbGVcbiAgICAgICAgICAgIFN5c2xvZ0FQSS5nZXRMb2dUaW1lUmFuZ2UoZmlsZW5hbWUsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLnRpbWVfcmFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVGltZSByYW5nZSBpcyBhdmFpbGFibGUgLSB1c2UgdGltZS1iYXNlZCBuYXZpZ2F0aW9uXG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmluaXRpYWxpemVOYXZpZ2F0aW9uKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRpbWUgcmFuZ2Ugbm90IGF2YWlsYWJsZSAtIHVzZSBsaW5lIG51bWJlciBmYWxsYmFja1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pbml0aWFsaXplTmF2aWdhdGlvbihudWxsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGNoZWNraW5nIHRpbWUgcmFuZ2U6JywgZXJyb3IpO1xuICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gbGluZSBudW1iZXIgbW9kZVxuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaW5pdGlhbGl6ZU5hdmlnYXRpb24obnVsbCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB1bml2ZXJzYWwgbmF2aWdhdGlvbiB3aXRoIHRpbWUgb3IgbGluZSBudW1iZXIgbW9kZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSB0aW1lUmFuZ2VEYXRhIC0gVGltZSByYW5nZSBkYXRhIGZyb20gQVBJIChvcHRpb25hbClcbiAgICAgKi9cbiAgICBpbml0aWFsaXplTmF2aWdhdGlvbih0aW1lUmFuZ2VEYXRhKSB7XG4gICAgICAgIGlmICh0aW1lUmFuZ2VEYXRhICYmIHRpbWVSYW5nZURhdGEudGltZV9yYW5nZSkge1xuICAgICAgICAgICAgLy8gVGltZS1iYXNlZCBtb2RlXG4gICAgICAgICAgICB0aGlzLnRpbWVTbGlkZXJFbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFRpbWVSYW5nZSA9IHRpbWVSYW5nZURhdGEudGltZV9yYW5nZTtcblxuICAgICAgICAgICAgLy8gU2hvdyBwZXJpb2QgYnV0dG9ucyBmb3IgdGltZS1iYXNlZCBuYXZpZ2F0aW9uXG4gICAgICAgICAgICAkKCcjcGVyaW9kLWJ1dHRvbnMnKS5zaG93KCk7XG5cbiAgICAgICAgICAgIC8vIFNldCBzZXJ2ZXIgdGltZXpvbmUgb2Zmc2V0XG4gICAgICAgICAgICBpZiAodGltZVJhbmdlRGF0YS5zZXJ2ZXJfdGltZXpvbmVfb2Zmc2V0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBTVkdUaW1lbGluZS5zZXJ2ZXJUaW1lem9uZU9mZnNldCA9IHRpbWVSYW5nZURhdGEuc2VydmVyX3RpbWV6b25lX29mZnNldDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBTVkcgdGltZWxpbmUgd2l0aCB0aW1lIHJhbmdlXG4gICAgICAgICAgICBTVkdUaW1lbGluZS5pbml0aWFsaXplKCcjdGltZS1zbGlkZXItY29udGFpbmVyJywgdGhpcy5jdXJyZW50VGltZVJhbmdlKTtcblxuICAgICAgICAgICAgLy8gU2V0IGNhbGxiYWNrIGZvciB0aW1lIHdpbmRvdyBjaGFuZ2VzXG4gICAgICAgICAgICBTVkdUaW1lbGluZS5vblJhbmdlQ2hhbmdlID0gKHN0YXJ0LCBlbmQpID0+IHtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2FkTG9nQnlUaW1lUmFuZ2Uoc3RhcnQsIGVuZCk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBMb2FkIGluaXRpYWwgY2h1bmsgKGxhc3QgaG91ciBieSBkZWZhdWx0KVxuICAgICAgICAgICAgY29uc3Qgb25lSG91ciA9IDM2MDA7XG4gICAgICAgICAgICBjb25zdCBpbml0aWFsU3RhcnQgPSBNYXRoLm1heCh0aGlzLmN1cnJlbnRUaW1lUmFuZ2UuZW5kIC0gb25lSG91ciwgdGhpcy5jdXJyZW50VGltZVJhbmdlLnN0YXJ0KTtcbiAgICAgICAgICAgIHRoaXMubG9hZExvZ0J5VGltZVJhbmdlKGluaXRpYWxTdGFydCwgdGhpcy5jdXJyZW50VGltZVJhbmdlLmVuZCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBMaW5lIG51bWJlciBmYWxsYmFjayBtb2RlXG4gICAgICAgICAgICB0aGlzLnRpbWVTbGlkZXJFbmFibGVkID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRUaW1lUmFuZ2UgPSBudWxsO1xuXG4gICAgICAgICAgICAvLyBIaWRlIHBlcmlvZCBidXR0b25zIGluIGxpbmUgbnVtYmVyIG1vZGVcbiAgICAgICAgICAgICQoJyNwZXJpb2QtYnV0dG9ucycpLmhpZGUoKTtcblxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBTVkcgdGltZWxpbmUgd2l0aCBsaW5lIG51bWJlcnNcbiAgICAgICAgICAgIC8vIEZvciBub3csIHVzZSBkZWZhdWx0IHJhbmdlIHVudGlsIHdlIGdldCB0b3RhbCBsaW5lIGNvdW50XG4gICAgICAgICAgICBjb25zdCBsaW5lUmFuZ2UgPSB7IHN0YXJ0OiAwLCBlbmQ6IDEwMDAwIH07XG4gICAgICAgICAgICBTVkdUaW1lbGluZS5pbml0aWFsaXplKCcjdGltZS1zbGlkZXItY29udGFpbmVyJywgbGluZVJhbmdlLCAnbGluZXMnKTtcblxuICAgICAgICAgICAgLy8gU2V0IGNhbGxiYWNrIGZvciBsaW5lIHJhbmdlIGNoYW5nZXNcbiAgICAgICAgICAgIFNWR1RpbWVsaW5lLm9uUmFuZ2VDaGFuZ2UgPSAoc3RhcnQsIGVuZCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIExvYWQgYnkgbGluZSBudW1iZXJzIChvZmZzZXQvbGluZXMpXG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9hZExvZ0J5TGluZXMoTWF0aC5mbG9vcihzdGFydCksIE1hdGguY2VpbChlbmQgLSBzdGFydCkpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gTG9hZCBpbml0aWFsIGxpbmVzXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGxvZyBieSBsaW5lIG51bWJlcnMgKGZvciBmaWxlcyB3aXRob3V0IHRpbWVzdGFtcHMpXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IG9mZnNldCAtIFN0YXJ0aW5nIGxpbmUgbnVtYmVyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGxpbmVzIC0gTnVtYmVyIG9mIGxpbmVzIHRvIGxvYWRcbiAgICAgKi9cbiAgICBsb2FkTG9nQnlMaW5lcyhvZmZzZXQsIGxpbmVzKSB7XG4gICAgICAgIC8vIFNob3cgZGltbWVyIG9ubHkgaWYgbm90IGluIGF1dG8tdXBkYXRlIG1vZGVcbiAgICAgICAgaWYgKCFzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUpIHtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcGFyYW1zID0ge1xuICAgICAgICAgICAgZmlsZW5hbWU6IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2ZpbGVuYW1lJyksXG4gICAgICAgICAgICBmaWx0ZXI6IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2ZpbHRlcicpIHx8ICcnLFxuICAgICAgICAgICAgbG9nTGV2ZWw6IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2xvZ0xldmVsJykgfHwgJycsXG4gICAgICAgICAgICBvZmZzZXQ6IE1hdGgubWF4KDAsIG9mZnNldCksXG4gICAgICAgICAgICBsaW5lczogTWF0aC5taW4oNTAwMCwgTWF0aC5tYXgoMTAwLCBsaW5lcykpXG4gICAgICAgIH07XG5cbiAgICAgICAgU3lzbG9nQVBJLmdldExvZ0Zyb21GaWxlKHBhcmFtcywgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAvLyBIaWRlIGRpbW1lciBvbmx5IGlmIG5vdCBpbiBhdXRvLXVwZGF0ZSBtb2RlXG4gICAgICAgICAgICBpZiAoIXN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhICYmICdjb250ZW50JyBpbiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgLy8gU2V0IGNvbnRlbnQgaW4gZWRpdG9yIChldmVuIGlmIGVtcHR5KVxuICAgICAgICAgICAgICAgIHRoaXMudmlld2VyLnNldFZhbHVlKHJlc3BvbnNlLmRhdGEuY29udGVudCB8fCAnJywgLTEpO1xuXG4gICAgICAgICAgICAgICAgLy8gR28gdG8gdGhlIGJlZ2lubmluZ1xuICAgICAgICAgICAgICAgIHRoaXMudmlld2VyLmdvdG9MaW5lKDEpO1xuICAgICAgICAgICAgICAgIHRoaXMudmlld2VyLnNjcm9sbFRvTGluZSgwLCB0cnVlLCB0cnVlLCAoKSA9PiB7fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGxvZyBieSB0aW1lIHJhbmdlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHN0YXJ0VGltZXN0YW1wIC0gU3RhcnQgdGltZXN0YW1wXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGVuZFRpbWVzdGFtcCAtIEVuZCB0aW1lc3RhbXBcbiAgICAgKi9cbiAgICBhc3luYyBsb2FkTG9nQnlUaW1lUmFuZ2Uoc3RhcnRUaW1lc3RhbXAsIGVuZFRpbWVzdGFtcCkge1xuICAgICAgICAvLyBTaG93IGRpbW1lciBvbmx5IGlmIG5vdCBpbiBhdXRvLXVwZGF0ZSBtb2RlXG4gICAgICAgIGlmICghc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlKSB7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IHtcbiAgICAgICAgICAgIGZpbGVuYW1lOiB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmaWxlbmFtZScpLFxuICAgICAgICAgICAgZmlsdGVyOiB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmaWx0ZXInKSB8fCAnJyxcbiAgICAgICAgICAgIGxvZ0xldmVsOiB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdsb2dMZXZlbCcpIHx8ICcnLFxuICAgICAgICAgICAgZGF0ZUZyb206IHN0YXJ0VGltZXN0YW1wLFxuICAgICAgICAgICAgZGF0ZVRvOiBlbmRUaW1lc3RhbXAsXG4gICAgICAgICAgICBsaW5lczogNTAwMCAvLyBNYXhpbXVtIGxpbmVzIHRvIGxvYWRcbiAgICAgICAgfTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgU3lzbG9nQVBJLmdldExvZ0Zyb21GaWxlKHBhcmFtcywgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhICYmICdjb250ZW50JyBpbiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCBjb250ZW50IGluIGVkaXRvciAoZXZlbiBpZiBlbXB0eSlcbiAgICAgICAgICAgICAgICAgICAgdGhpcy52aWV3ZXIuc2V0VmFsdWUocmVzcG9uc2UuZGF0YS5jb250ZW50IHx8ICcnLCAtMSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gR28gdG8gdGhlIGVuZCBvZiB0aGUgbG9nXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHJvdyA9IHRoaXMudmlld2VyLnNlc3Npb24uZ2V0TGVuZ3RoKCkgLSAxO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb2x1bW4gPSB0aGlzLnZpZXdlci5zZXNzaW9uLmdldExpbmUocm93KS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMudmlld2VyLmdvdG9MaW5lKHJvdyArIDEsIGNvbHVtbik7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gQWRqdXN0IHNsaWRlciB0byBhY3R1YWwgbG9hZGVkIHRpbWUgcmFuZ2UgKHNpbGVudGx5KVxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5hY3R1YWxfcmFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGFjdHVhbCA9IHJlc3BvbnNlLmRhdGEuYWN0dWFsX3JhbmdlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IHN5bmMgc2VsZWN0ZWRSYW5nZSBpZiBiYWNrZW5kIHJldHVybmVkIG1lYW5pbmdmdWwgZGF0YVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRG9uJ3Qgc3luYyBpZiBiYWNrZW5kIHJldHVybmVkIHZlcnkgc2hvcnQgcmFuZ2UgKDwgMTAlIG9mIHJlcXVlc3RlZClcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGJlY2F1c2UgaXQgbWVhbnMgdGhlcmUncyBqdXN0IGxpdHRsZSBkYXRhIGluIHRoZSBsb2csIG5vdCBhIDUwMDAtbGluZSB0cnVuY2F0aW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByZXF1ZXN0ZWREdXJhdGlvbiA9IGVuZFRpbWVzdGFtcCAtIHN0YXJ0VGltZXN0YW1wO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYWN0dWFsRHVyYXRpb24gPSBhY3R1YWwuZW5kIC0gYWN0dWFsLnN0YXJ0O1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZHVyYXRpb25SYXRpbyA9IGFjdHVhbER1cmF0aW9uIC8gcmVxdWVzdGVkRHVyYXRpb247XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChkdXJhdGlvblJhdGlvID49IDAuMSB8fCBhY3R1YWwudHJ1bmNhdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQmFja2VuZCByZXR1cm5lZCBzdWJzdGFudGlhbCBkYXRhIE9SIGV4cGxpY2l0bHkgdHJ1bmNhdGVkXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIFNWR1RpbWVsaW5lIHNlbGVjdGVkIHJhbmdlIHRvIG1hdGNoIGFjdHVhbCBsb2FkZWQgZGF0YVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFNWR1RpbWVsaW5lLnVwZGF0ZVNlbGVjdGVkUmFuZ2UoYWN0dWFsLnN0YXJ0LCBhY3R1YWwuZW5kKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIExvZyBmb3IgZGVidWdnaW5nIG9ubHlcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0dWFsLnRydW5jYXRlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGBMb2cgZGF0YSBsaW1pdGVkIHRvICR7YWN0dWFsLmxpbmVzX2NvdW50fSBsaW5lcy4gYCArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBgU2hvd2luZyB0aW1lIHJhbmdlOiBbJHthY3R1YWwuc3RhcnR9IC0gJHthY3R1YWwuZW5kfV1gXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBCYWNrZW5kIHJldHVybmVkIHZlcnkgc2hvcnQgcmFuZ2UgLSBrZWVwIHVzZXIncyBzZWxlY3Rpb25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmRlYnVnKCfimqDvuI8gQmFja2VuZCByZXR1cm5lZCBzaG9ydCByYW5nZSAoJyArIGFjdHVhbER1cmF0aW9uICsgJ3MgLyAnICsgcmVxdWVzdGVkRHVyYXRpb24gKyAncyA9ICcgKyAoZHVyYXRpb25SYXRpbyAqIDEwMCkudG9GaXhlZCgxKSArICclKSwga2VlcGluZyB1c2VyIHNlbGVjdGlvbicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gSGlkZSBkaW1tZXIgb25seSBpZiBub3QgaW4gYXV0by11cGRhdGUgbW9kZVxuICAgICAgICAgICAgICAgIGlmICghc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgbG9hZGluZyBsb2cgYnkgdGltZSByYW5nZTonLCBlcnJvcik7XG4gICAgICAgICAgICAvLyBIaWRlIGRpbW1lciBvbmx5IGlmIG5vdCBpbiBhdXRvLXVwZGF0ZSBtb2RlXG4gICAgICAgICAgICBpZiAoIXN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFwcGx5IHF1aWNrIHBlcmlvZCBzZWxlY3Rpb24gKFlhbmRleCBDbG91ZCBMb2dWaWV3ZXIgc3R5bGUpXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHBlcmlvZFNlY29uZHMgLSBQZXJpb2QgaW4gc2Vjb25kc1xuICAgICAqL1xuICAgIGFwcGx5UXVpY2tQZXJpb2QocGVyaW9kU2Vjb25kcykge1xuICAgICAgICBpZiAoIXRoaXMuY3VycmVudFRpbWVSYW5nZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlIG5ldyBhcHBseVBlcmlvZCBtZXRob2QgdGhhdCBoYW5kbGVzIHZpc2libGUgcmFuZ2UgYW5kIGF1dG8tY2VudGVyaW5nXG4gICAgICAgIFNWR1RpbWVsaW5lLmFwcGx5UGVyaW9kKHBlcmlvZFNlY29uZHMpO1xuICAgICAgICAvLyBDYWxsYmFjayB3aWxsIGJlIHRyaWdnZXJlZCBhdXRvbWF0aWNhbGx5IGJ5IFNWR1RpbWVsaW5lXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFwcGx5IGxvZyBsZXZlbCBmaWx0ZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbGV2ZWwgLSBMb2cgbGV2ZWwgKGFsbCwgZXJyb3IsIHdhcm5pbmcsIGluZm8sIGRlYnVnKVxuICAgICAqL1xuICAgIGFwcGx5TG9nTGV2ZWxGaWx0ZXIobGV2ZWwpIHtcbiAgICAgICAgbGV0IGZpbHRlclBhdHRlcm4gPSAnJztcblxuICAgICAgICAvLyBDcmVhdGUgcmVnZXggcGF0dGVybiBiYXNlZCBvbiBsZXZlbFxuICAgICAgICBzd2l0Y2ggKGxldmVsKSB7XG4gICAgICAgICAgICBjYXNlICdlcnJvcic6XG4gICAgICAgICAgICAgICAgZmlsdGVyUGF0dGVybiA9ICdFUlJPUnxDUklUSUNBTHxGQVRBTCc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICd3YXJuaW5nJzpcbiAgICAgICAgICAgICAgICBmaWx0ZXJQYXR0ZXJuID0gJ1dBUk5JTkd8V0FSTic7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdpbmZvJzpcbiAgICAgICAgICAgICAgICBmaWx0ZXJQYXR0ZXJuID0gJ0lORk8nO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZGVidWcnOlxuICAgICAgICAgICAgICAgIGZpbHRlclBhdHRlcm4gPSAnREVCVUcnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnYWxsJzpcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgZmlsdGVyUGF0dGVybiA9ICcnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIGZpbHRlciBmaWVsZFxuICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmaWx0ZXInLCBmaWx0ZXJQYXR0ZXJuKTtcblxuICAgICAgICAvLyBSZWxvYWQgbG9ncyB3aXRoIG5ldyBmaWx0ZXJcbiAgICAgICAgdGhpcy51cGRhdGVMb2dGcm9tU2VydmVyKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZldGNoZXMgdGhlIGxvZyBmaWxlIGNvbnRlbnQgZnJvbSB0aGUgc2VydmVyLlxuICAgICAqL1xuICAgIHVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKSB7XG4gICAgICAgIGlmICh0aGlzLnRpbWVTbGlkZXJFbmFibGVkKSB7XG4gICAgICAgICAgICAvLyBJbiB0aW1lIHNsaWRlciBtb2RlLCByZWxvYWQgY3VycmVudCB3aW5kb3dcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRUaW1lUmFuZ2UpIHtcbiAgICAgICAgICAgICAgICAvLyBJbiB0aW1lIHNsaWRlciBtb2RlLCByZWxvYWQgbGFzdCBob3VyXG4gICAgICAgICAgICAgICAgY29uc3Qgb25lSG91ciA9IDM2MDA7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhcnRUaW1lc3RhbXAgPSBNYXRoLm1heCh0aGlzLmN1cnJlbnRUaW1lUmFuZ2UuZW5kIC0gb25lSG91ciwgdGhpcy5jdXJyZW50VGltZVJhbmdlLnN0YXJ0KTtcbiAgICAgICAgICAgICAgICB0aGlzLmxvYWRMb2dCeVRpbWVSYW5nZShcbiAgICAgICAgICAgICAgICAgICAgc3RhcnRUaW1lc3RhbXAsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFRpbWVSYW5nZS5lbmRcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTGluZSBudW1iZXIgbW9kZVxuICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICAgICAgcGFyYW1zLmxpbmVzID0gNTAwMDsgLy8gTWF4IGxpbmVzXG4gICAgICAgICAgICBTeXNsb2dBUEkuZ2V0TG9nRnJvbUZpbGUocGFyYW1zLCBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jYlVwZGF0ZUxvZ1RleHQpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhlIGxvZyB2aWV3LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIEFQSS5cbiAgICAgKi9cbiAgICBjYlVwZGF0ZUxvZ1RleHQocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gSGlkZSBkaW1tZXIgb25seSBpZiBub3QgaW4gYXV0by11cGRhdGUgbW9kZVxuICAgICAgICBpZiAoIXN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBIYW5kbGUgdjMgQVBJIHJlc3BvbnNlIHN0cnVjdHVyZVxuICAgICAgICBpZiAoIXJlc3BvbnNlIHx8ICFyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5tZXNzYWdlcykge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjb250ZW50ID0gcmVzcG9uc2UuZGF0YT8uY29udGVudCB8fCAnJztcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLmdldFNlc3Npb24oKS5zZXRWYWx1ZShjb250ZW50KTtcbiAgICAgICAgY29uc3Qgcm93ID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnNlc3Npb24uZ2V0TGVuZ3RoKCkgLSAxO1xuICAgICAgICBjb25zdCBjb2x1bW4gPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIuc2Vzc2lvbi5nZXRMaW5lKHJvdykubGVuZ3RoO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIuZ290b0xpbmUocm93ICsgMSwgY29sdW1uKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgY2xpY2tpbmcgdGhlIFwiRG93bmxvYWQgRmlsZVwiIGJ1dHRvbi5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZGF0YS5cbiAgICAgKi9cbiAgICBjYkRvd25sb2FkRmlsZShyZXNwb25zZSkge1xuICAgICAgICAvLyBIYW5kbGUgdjMgQVBJIHJlc3BvbnNlIHN0cnVjdHVyZVxuICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IHJlc3BvbnNlLmRhdGEuZmlsZW5hbWUgfHwgcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5tZXNzYWdlcykge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBjbGlja2luZyB0aGUgXCJFcmFzZSBGaWxlXCIgYnV0dG9uLlxuICAgICAqL1xuICAgIGVyYXNlQ3VycmVudEZpbGVDb250ZW50KCl7XG4gICAgICAgIGNvbnN0IGZpbGVOYW1lID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2ZpbGVuYW1lJyk7XG4gICAgICAgIGlmIChmaWxlTmFtZS5sZW5ndGg+MCl7XG4gICAgICAgICAgICBTeXNsb2dBUEkuZXJhc2VGaWxlKGZpbGVOYW1lLCBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jYkFmdGVyRmlsZUVyYXNlZClcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBjbGlja2luZyB0aGUgXCJFcmFzZSBGaWxlXCIgYnV0dG9uIGFuZCBjYWxsaW5nIFJFU1QgQVBJIGNvbW1hbmRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZGF0YS5cbiAgICAgKi9cbiAgICBjYkFmdGVyRmlsZUVyYXNlZChyZXNwb25zZSl7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQ9PT1mYWxzZSAmJiByZXNwb25zZS5tZXNzYWdlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudXBkYXRlTG9nRnJvbVNlcnZlcigpO1xuICAgICAgICB9XG4gICAgfSxcbn07XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBzaG93IHN5c3RlbSBsb2dzIHRhYlxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==