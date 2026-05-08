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
   * Resolved in initialize() — must not call $() at module-load time.
   * @type {jQuery}
   */
  $showBtn: null,

  /**
   * jQuery object for the "Download File" button.
   * @type {jQuery}
   */
  $downloadBtn: null,

  /**
   * jQuery object for the "Show Last Log (Auto)" button.
   * @type {jQuery}
   */
  $showAutoBtn: null,

  /**
   * jQuery object for the "Erase current file content" button.
   * @type {jQuery}
   */
  $eraseBtn: null,

  /**
   * jQuery object for the log content.
   * @type {jQuery}
   */
  $logContent: null,

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
  $dimmer: null,

  /**
   * jQuery object for the form.
   * @type {jQuery}
   */
  $formObj: null,

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
   * Array of cascading filter conditions [{type: 'contains'|'notContains', value: string}]
   * @type {Array}
   */
  filterConditions: [],

  /**
   * Pending filter text waiting for type selection in popup
   * @type {string}
   */
  pendingFilterText: '',

  /**
   * Last known actual data end timestamp from API response.
   * Used to anchor refresh time range to real data instead of wall clock time.
   * WHY: If a log file hasn't been written to recently (e.g., idle module log),
   * using "now - period" as startTimestamp produces an empty range with no data.
   * @type {number|null}
   */
  lastKnownDataEnd: null,

  /**
   * Initializes the system diagnostic logs.
   */
  initialize: function initialize() {
    // Resolve jQuery wrappers here — at module-load time jQuery may
    // not yet be defined (Sentry MIKOPBX-MG9 pattern).
    systemDiagnosticLogs.$showBtn = $('#show-last-log');
    systemDiagnosticLogs.$downloadBtn = $('#download-file');
    systemDiagnosticLogs.$showAutoBtn = $('#show-last-log-auto');
    systemDiagnosticLogs.$eraseBtn = $('#erase-file');
    systemDiagnosticLogs.$logContent = $('#log-content-readonly');
    systemDiagnosticLogs.$dimmer = $('#get-logs-dimmer');
    systemDiagnosticLogs.$formObj = $('#system-diagnostic-form'); // Ensure filter type popup starts hidden with clean styles

    $('#filter-type-popup').addClass('hidden').hide().css({
      top: '',
      left: ''
    });
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

    systemDiagnosticLogs.initializeLogLevelDropdown(); // Initialize filter conditions from URL parameter (e.g. CDR links with ?filter=...)

    systemDiagnosticLogs.initializeFilterFromUrl(); // Event listener for quick period buttons

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
    }); // Event listener for Enter keypress on filter input — show type popup

    $(document).on('keydown', '#filter-input', function (event) {
      var $popup = $('#filter-type-popup');
      var isPopupVisible = $popup.is(':visible') && !$popup.hasClass('hidden'); // When popup is open, handle arrow keys and Enter for keyboard navigation

      if (isPopupVisible) {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          systemDiagnosticLogs.navigateFilterPopup(event.key === 'ArrowDown' ? 1 : -1);
          return;
        }

        if (event.key === 'Enter') {
          event.preventDefault();
          var $focused = $popup.find('.filter-type-option.focused');

          if ($focused.length) {
            $focused.trigger('click');
          }

          return;
        }
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        var text = $('#filter-input').val().trim();

        if (text !== '') {
          systemDiagnosticLogs.pendingFilterText = text;
          systemDiagnosticLogs.showFilterTypePopup();
        }
      } else if (event.key === 'Escape') {
        systemDiagnosticLogs.hideFilterTypePopup();
      } else if (event.key === 'Backspace' && $('#filter-input').val() === '') {
        // Remove last chip on Backspace in empty input
        if (systemDiagnosticLogs.filterConditions.length > 0) {
          systemDiagnosticLogs.removeFilterCondition(systemDiagnosticLogs.filterConditions.length - 1);
        }
      }
    }); // On blur: auto-add text as "contains" filter if popup is not open

    $(document).on('blur', '#filter-input', function () {
      // Delay to allow click on popup option to fire first
      setTimeout(function () {
        var $popup = $('#filter-type-popup');

        if ($popup.is(':visible')) {
          // Popup is open (user pressed Enter) — let popup handle it
          return;
        }

        var text = $('#filter-input').val().trim();

        if (text !== '') {
          systemDiagnosticLogs.addFilterCondition('contains', text);
        }
      }, 150);
    }); // Event listener for filter type option click

    $(document).on('click', '.filter-type-option', function (e) {
      var type = $(e.currentTarget).data('type');
      systemDiagnosticLogs.addFilterCondition(type, systemDiagnosticLogs.pendingFilterText);
      systemDiagnosticLogs.pendingFilterText = '';
      systemDiagnosticLogs.hideFilterTypePopup();
    }); // Event listener for removing individual filter chip

    $(document).on('click', '#filter-labels .delete.icon', function (e) {
      e.stopPropagation();
      var index = $(e.currentTarget).closest('.filter-condition-label').data('index');
      systemDiagnosticLogs.removeFilterCondition(index);
    }); // Event listener for "Clear Filter" button click

    $(document).on('click', '#clear-filter-btn', function (e) {
      e.preventDefault();
      systemDiagnosticLogs.clearAllFilterConditions();
    }); // Click on container focuses input

    $(document).on('click', '#filter-conditions-container', function (e) {
      if ($(e.target).is('#filter-conditions-container') || $(e.target).is('#filter-labels')) {
        $('#filter-input').focus();
      }
    }); // Hide popup when clicking outside

    $(document).on('click', function (e) {
      if (!$(e.target).closest('#filter-type-popup, #filter-input').length) {
        systemDiagnosticLogs.hideFilterTypePopup();
      }
    }); // Event listener for Fullscreen button click. Hides the toggle on
    // browsers without Fullscreen API for DOM elements (e.g. iPhone WebKit).

    var $fullscreenBtn = $('.fullscreen-toggle-btn');
    var logContainer = document.getElementById('system-logs-segment');

    if (FullscreenToggle.isSupported(logContainer)) {
      $fullscreenBtn.on('click', systemDiagnosticLogs.toggleFullScreen);
      FullscreenToggle.onChange(systemDiagnosticLogs.adjustLogHeight);
    } else {
      $fullscreenBtn.hide();
    } // Initial height calculation


    systemDiagnosticLogs.adjustLogHeight();
  },

  /**
   * Toggles the full-screen mode of the 'system-logs-segment' element.
   * Uses FullscreenToggle helper to handle prefixed APIs and unsupported
   * environments (iPhone WebKit has no Fullscreen API for DOM elements).
   *
   * @return {void}
   */
  toggleFullScreen: function toggleFullScreen() {
    var logContainer = document.getElementById('system-logs-segment');
    FullscreenToggle.toggle(logContainer)["catch"](function (err) {
      console.error("Error attempting to toggle full-screen mode: ".concat(err.message));
    });
  },

  /**
   * Function to adjust the height of the logs depending on the screen mode.
   */
  adjustLogHeight: function adjustLogHeight() {
    setTimeout(function () {
      var aceHeight = window.innerHeight - systemDiagnosticLogs.$logContent.offset().top - 55;

      if (FullscreenToggle.getActiveElement()) {
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
        systemDiagnosticLogs.updateLogFromServer(true);
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

    var parentFolderPath = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';
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
        // Build unique folder path for hierarchical collapse
        var folderPath = parentFolderPath ? "".concat(parentFolderPath, "/").concat(key) : key; // Add folder header with toggle capability and indentation for nested folders

        items.push({
          name: "".concat(prefix, "<i class=\"caret down icon folder-toggle\"></i><i class=\"folder icon\"></i> ").concat(key),
          value: '',
          disabled: true,
          type: 'folder',
          folderName: folderPath,
          parentFolder: parentFolderPath
        }); // Add children with increased indentation and parent folder path

        var childItems = _this.treeToDropdownItems(value.children, prefix + '&nbsp;&nbsp;&nbsp;&nbsp;', folderPath);

        items.push.apply(items, _toConsumableArray(childItems));
      } else {
        // Add file item with parent folder reference
        items.push({
          name: "".concat(prefix, "<i class=\"file outline icon\"></i> ").concat(key, " (").concat(value.size, ")"),
          value: value.path,
          selected: value["default"],
          type: 'file',
          parentFolder: parentFolderPath
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
          var folderParentAttr = item.parentFolder ? "data-parent=\"".concat(item.parentFolder, "\"") : '';
          html += "<div class=\"folder-header item\" data-folder=\"".concat(item.folderName, "\" ").concat(folderParentAttr, " data-value=\"\" data-text=\"").concat(item.folderName, "\" style=\"pointer-events: auto !important; cursor: pointer; font-weight: bold; background: #f9f9f9;\">").concat(item.name, "</div>");
        } else {
          // File item with parent folder reference for collapse
          // data-text contains full path so Fomantic search matches by folder name too
          var selected = item.selected ? 'selected active' : '';
          var parentAttr = item.parentFolder ? "data-parent=\"".concat(item.parentFolder, "\"") : '';
          html += "<div class=\"item file-item ".concat(selected, "\" data-value=\"").concat(option[fields.value], "\" data-text=\"").concat(option[fields.value], "\" ").concat(parentAttr, ">").concat(item.name, "</div>");
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
      var folderPath = $folder.data('folder');
      var $toggle = $folder.find('.folder-toggle');
      var $menu = $dropdown.find('.menu'); // Toggle folder state

      var isCollapsed = $toggle.hasClass('right');

      if (isCollapsed) {
        // Expand folder - show only direct children
        $toggle.removeClass('right').addClass('down'); // Show direct child files and child folder headers

        $menu.find(".file-item[data-parent=\"".concat(folderPath, "\"]")).show();
        $menu.find(".folder-header[data-parent=\"".concat(folderPath, "\"]")).show();
      } else {
        // Collapse folder - hide all descendants recursively
        $toggle.removeClass('down').addClass('right');
        systemDiagnosticLogs.collapseDescendants($menu, folderPath);
      }
    }, true); // capture phase - fires before bubbling
    // Handle search input - show all items when searching

    $dropdown.on('input', 'input.search', function (e) {
      var searchValue = $(e.target).val().trim();
      var $menu = $dropdown.find('.menu');

      if (searchValue.length > 0) {
        // Show all items and expand all folders during search
        $menu.find('.file-item').show();
        $menu.find('.folder-header').show();
        $menu.find('.folder-toggle').removeClass('right').addClass('down');
      } else {
        // Restore collapsed state when search is cleared
        $menu.find('.folder-header').each(function (_, folder) {
          var $folder = $(folder);
          var folderPath = $folder.data('folder');
          var isCollapsed = $folder.find('.folder-toggle').hasClass('right');

          if (isCollapsed) {
            systemDiagnosticLogs.collapseDescendants($menu, folderPath);
          }
        });
      }
    });
  },

  /**
   * Recursively hides all descendants (files and subfolders) of a given folder
   * and marks child folders as collapsed
   * @param {jQuery} $menu - The dropdown menu element
   * @param {string} folderPath - The folder path whose descendants to hide
   */
  collapseDescendants: function collapseDescendants($menu, folderPath) {
    // Hide direct child files
    $menu.find(".file-item[data-parent=\"".concat(folderPath, "\"]")).hide(); // Find direct child folders, collapse them recursively, then hide

    $menu.find(".folder-header[data-parent=\"".concat(folderPath, "\"]")).each(function (_, childFolder) {
      var $childFolder = $(childFolder);
      var childPath = $childFolder.data('folder'); // Mark child folder as collapsed

      $childFolder.find('.folder-toggle').removeClass('down').addClass('right'); // Recursively collapse its descendants

      systemDiagnosticLogs.collapseDescendants($menu, childPath); // Hide the child folder header itself

      $childFolder.hide();
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
      // Walk up the ancestor chain expanding each folder
      var parentPath = $fileItem.data('parent');

      while (parentPath) {
        var $folder = $menu.find(".folder-header[data-folder=\"".concat(parentPath, "\"]"));
        if (!$folder.length) break;
        var $toggle = $folder.find('.folder-toggle'); // Show the folder header itself (may be hidden if parent was collapsed)

        $folder.show(); // Expand if collapsed

        if ($toggle.hasClass('right')) {
          $toggle.removeClass('right').addClass('down');
          $menu.find(".file-item[data-parent=\"".concat(parentPath, "\"]")).show();
          $menu.find(".folder-header[data-parent=\"".concat(parentPath, "\"]")).show();
        } // Move to grandparent


        parentPath = $folder.data('parent');
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


    systemDiagnosticLogs.updateAutoRefreshVisibility(value); // Reset last known data end for new file

    systemDiagnosticLogs.lastKnownDataEnd = null; // Check if time range is available for this file

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
   * Show filter type popup below the filter input.
   * Pre-selects the first option for immediate keyboard navigation.
   */
  showFilterTypePopup: function showFilterTypePopup() {
    var $popup = $('#filter-type-popup');
    $popup.removeClass('hidden').css({
      top: '',
      left: '',
      display: ''
    }).show(); // Pre-select first option for keyboard navigation

    $popup.find('.filter-type-option').removeClass('focused');
    $popup.find('.filter-type-option').first().addClass('focused');
  },

  /**
   * Hide the filter type popup
   */
  hideFilterTypePopup: function hideFilterTypePopup() {
    var $popup = $('#filter-type-popup');
    $popup.find('.filter-type-option').removeClass('focused');
    $popup.addClass('hidden').hide();
  },

  /**
   * Navigate filter type popup options with arrow keys.
   * Wraps around at boundaries.
   * @param {number} direction - 1 for down, -1 for up
   */
  navigateFilterPopup: function navigateFilterPopup(direction) {
    var $popup = $('#filter-type-popup');
    var $options = $popup.find('.filter-type-option');
    var $focused = $options.filter('.focused');
    var index = $options.index($focused);
    index += direction; // Wrap around

    if (index < 0) {
      index = $options.length - 1;
    }

    if (index >= $options.length) {
      index = 0;
    }

    $options.removeClass('focused');
    $options.eq(index).addClass('focused');
  },

  /**
   * Add a filter condition, sync to form, render labels, and reload log
   * @param {string} type - 'contains' or 'notContains'
   * @param {string} value - the filter text
   */
  addFilterCondition: function addFilterCondition(type, value) {
    if (!value || value.trim() === '') {
      return;
    }

    systemDiagnosticLogs.filterConditions.push({
      type: type,
      value: value.trim()
    });
    systemDiagnosticLogs.syncFilterConditionsToForm();
    systemDiagnosticLogs.renderFilterLabels();
    $('#filter-input').val('');
    systemDiagnosticLogs.updateLogFromServer(true);
  },

  /**
   * Remove a filter condition by index
   * @param {number} index - condition index to remove
   */
  removeFilterCondition: function removeFilterCondition(index) {
    systemDiagnosticLogs.filterConditions.splice(index, 1);
    systemDiagnosticLogs.syncFilterConditionsToForm();
    systemDiagnosticLogs.renderFilterLabels();
    systemDiagnosticLogs.updateLogFromServer(true);
  },

  /**
   * Clear all filter conditions
   */
  clearAllFilterConditions: function clearAllFilterConditions() {
    systemDiagnosticLogs.filterConditions = [];
    systemDiagnosticLogs.syncFilterConditionsToForm();
    systemDiagnosticLogs.renderFilterLabels();
    $('#filter-input').val('');
    systemDiagnosticLogs.updateLogFromServer(true);
  },

  /**
   * Serialize filterConditions array as JSON into hidden #filter field
   */
  syncFilterConditionsToForm: function syncFilterConditionsToForm() {
    var value = systemDiagnosticLogs.filterConditions.length > 0 ? JSON.stringify(systemDiagnosticLogs.filterConditions) : '';
    systemDiagnosticLogs.$formObj.form('set value', 'filter', value);
  },

  /**
   * Render label chips inside #filter-labels from filterConditions
   */
  renderFilterLabels: function renderFilterLabels() {
    var $container = $('#filter-labels');
    $container.empty();
    systemDiagnosticLogs.filterConditions.forEach(function (condition, index) {
      var cssClass = condition.type === 'notContains' ? 'not-contains' : 'contains';
      var iconClass = condition.type === 'notContains' ? 'ban' : 'check circle';
      var iconColor = condition.type === 'notContains' ? 'red' : 'teal';
      var $label = $("<span class=\"filter-condition-label ".concat(cssClass, "\" data-index=\"").concat(index, "\"></span>"));
      $label.append("<i class=\"".concat(iconClass, " icon ").concat(iconColor, "\"></i>"));
      $label.append("<span>".concat($('<span>').text(condition.value).html(), "</span>"));
      $label.append('<i class="delete icon"></i>');
      $container.append($label);
    });
  },

  /**
   * Initialize filter conditions from URL parameter or existing hidden field value.
   * Handles legacy plain-string format (e.g. "[C-00004721]&[C-00004723]" from CDR links)
   * by converting &-separated parts into individual "contains" conditions.
   */
  initializeFilterFromUrl: function initializeFilterFromUrl() {
    var urlParams = new URLSearchParams(window.location.search);
    var filterParam = urlParams.get('filter');

    if (filterParam && filterParam.trim() !== '') {
      var trimmed = filterParam.trim(); // Check if it's JSON format

      if (trimmed.startsWith('[')) {
        try {
          var parsed = JSON.parse(trimmed);

          if (Array.isArray(parsed)) {
            systemDiagnosticLogs.filterConditions = parsed.filter(function (c) {
              return c && c.value && c.type;
            });
          }
        } catch (e) {
          // Invalid JSON, treat as legacy
          systemDiagnosticLogs.filterConditions = trimmed.split('&').map(function (p) {
            return p.trim();
          }).filter(function (p) {
            return p !== '';
          }).map(function (p) {
            return {
              type: 'contains',
              value: p
            };
          });
        }
      } else {
        // Legacy plain string: split by & into contains conditions
        systemDiagnosticLogs.filterConditions = trimmed.split('&').map(function (p) {
          return p.trim();
        }).filter(function (p) {
          return p !== '';
        }).map(function (p) {
          return {
            type: 'contains',
            value: p
          };
        });
      }

      systemDiagnosticLogs.syncFilterConditionsToForm();
      systemDiagnosticLogs.renderFilterLabels();
    }
  },

  /**
   * Reset all filters when changing log files
   */
  resetFilters: function resetFilters() {
    // Deactivate all quick-period buttons
    $('.period-btn').removeClass('active'); // Reset logLevel dropdown to default (All Levels - empty value)

    $('#logLevel-dropdown').dropdown('set selected', '');
    systemDiagnosticLogs.$formObj.form('set value', 'logLevel', ''); // NOTE: Filter conditions are intentionally preserved when changing files.
    // When user navigates from CDR with filter params (e.g. ?filter=[C-00004721]),
    // the filters should persist across file changes (verbose → verbose.0).
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
              SVGTimeline.updateDataBoundary(actual.end); // Track last known data end for refresh anchoring

              systemDiagnosticLogs.lastKnownDataEnd = actual.end;
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
   * @param {boolean} preserveRange - If true, use current SVG timeline selection instead of
   *   recalculating to "last 1 hour". Used when filter/level changes to keep the same view.
   */
  updateLogFromServer: function updateLogFromServer() {
    var preserveRange = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

    if (this.timeSliderEnabled) {
      // In time slider mode, reload current window
      if (this.currentTimeRange) {
        // When preserveRange is true (filter/level change), use current timeline selection
        // WHY: Changing filters should not reset the time window — user expects to see
        // the same period with different filtering applied
        if (preserveRange && SVGTimeline.selectedRange) {
          this.loadLogByTimeRange(SVGTimeline.selectedRange.start, SVGTimeline.selectedRange.end, true, false, this.isAutoUpdateActive);
          return;
        }

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
          endTimestamp = Math.floor(Date.now() / 1000); // WHY: Anchor startTimestamp to the last known data end, not wall clock time.
          // Using "now - period" produces an empty range when the file hasn't been
          // written to recently (e.g., idle module logs like ModuleAutoCRM/SalonSyncer.log).
          // lastKnownDataEnd holds the actual timestamp of the last line from the API response.

          var dataEnd = this.lastKnownDataEnd || this.currentTimeRange.end;
          startTimestamp = Math.max(dataEnd - oneHour, this.currentTimeRange.start); // Update currentTimeRange.end to reflect new data availability

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TeXN0ZW1EaWFnbm9zdGljL3N5c3RlbS1kaWFnbm9zdGljLWluZGV4LXNob3dsb2dzLmpzIl0sIm5hbWVzIjpbInN5c3RlbURpYWdub3N0aWNMb2dzIiwiJHNob3dCdG4iLCIkZG93bmxvYWRCdG4iLCIkc2hvd0F1dG9CdG4iLCIkZXJhc2VCdG4iLCIkbG9nQ29udGVudCIsInZpZXdlciIsIiRmaWxlU2VsZWN0RHJvcERvd24iLCJsb2dzSXRlbXMiLCIkZGltbWVyIiwiJGZvcm1PYmoiLCJpc0luaXRpYWxpemluZyIsInRpbWVTbGlkZXJFbmFibGVkIiwiY3VycmVudFRpbWVSYW5nZSIsImlzQXV0b1VwZGF0ZUFjdGl2ZSIsImZpbHRlckNvbmRpdGlvbnMiLCJwZW5kaW5nRmlsdGVyVGV4dCIsImxhc3RLbm93bkRhdGFFbmQiLCJpbml0aWFsaXplIiwiJCIsImFkZENsYXNzIiwiaGlkZSIsImNzcyIsInRvcCIsImxlZnQiLCJhY2VIZWlnaHQiLCJ3aW5kb3ciLCJpbm5lckhlaWdodCIsImNsb3Nlc3QiLCJjcmVhdGVEcm9wZG93bkZyb21IaWRkZW5JbnB1dCIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJjYk9uQ2hhbmdlRmlsZSIsImlnbm9yZUNhc2UiLCJmdWxsVGV4dFNlYXJjaCIsImZvcmNlU2VsZWN0aW9uIiwicHJlc2VydmVIVE1MIiwiYWxsb3dDYXRlZ29yeVNlbGVjdGlvbiIsIm1hdGNoIiwiZmlsdGVyUmVtb3RlRGF0YSIsImFjdGlvbiIsInRlbXBsYXRlcyIsIm1lbnUiLCJjdXN0b21Ecm9wZG93bk1lbnUiLCJpbml0aWFsaXplRm9sZGVySGFuZGxlcnMiLCJpbml0aWFsaXplQWNlIiwiU3lzbG9nQVBJIiwiZ2V0TG9nc0xpc3QiLCJjYkZvcm1hdERyb3Bkb3duUmVzdWx0cyIsImluaXRpYWxpemVMb2dMZXZlbERyb3Bkb3duIiwiaW5pdGlhbGl6ZUZpbHRlckZyb21VcmwiLCJkb2N1bWVudCIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwiJGJ0biIsImN1cnJlbnRUYXJnZXQiLCJwZXJpb2QiLCJkYXRhIiwicmVtb3ZlQ2xhc3MiLCJhcHBseVF1aWNrUGVyaW9kIiwiZW5kIiwib25lSG91ciIsInN0YXJ0IiwiTWF0aCIsIm1heCIsIlNWR1RpbWVsaW5lIiwic2V0UmFuZ2UiLCJsb2FkTG9nQnlUaW1lUmFuZ2UiLCJsZXZlbCIsImFwcGx5TG9nTGV2ZWxGaWx0ZXIiLCJ1cGRhdGVMb2dGcm9tU2VydmVyIiwiaGFuZGxlSGFzaENoYW5nZSIsImZvcm0iLCJkb3dubG9hZExvZ0ZpbGUiLCJmaWxlbmFtZSIsImNiRG93bmxvYWRGaWxlIiwiJGJ1dHRvbiIsIiRyZWxvYWRJY29uIiwiZmluZCIsImhhc0NsYXNzIiwidXBkYXRlTG9nVmlld1dvcmtlciIsInN0b3AiLCJlcmFzZUN1cnJlbnRGaWxlQ29udGVudCIsImV2ZW50IiwiJHBvcHVwIiwiaXNQb3B1cFZpc2libGUiLCJpcyIsImtleSIsIm5hdmlnYXRlRmlsdGVyUG9wdXAiLCIkZm9jdXNlZCIsImxlbmd0aCIsInRyaWdnZXIiLCJ0ZXh0IiwidmFsIiwidHJpbSIsInNob3dGaWx0ZXJUeXBlUG9wdXAiLCJoaWRlRmlsdGVyVHlwZVBvcHVwIiwicmVtb3ZlRmlsdGVyQ29uZGl0aW9uIiwic2V0VGltZW91dCIsImFkZEZpbHRlckNvbmRpdGlvbiIsInR5cGUiLCJzdG9wUHJvcGFnYXRpb24iLCJpbmRleCIsImNsZWFyQWxsRmlsdGVyQ29uZGl0aW9ucyIsInRhcmdldCIsImZvY3VzIiwiJGZ1bGxzY3JlZW5CdG4iLCJsb2dDb250YWluZXIiLCJnZXRFbGVtZW50QnlJZCIsIkZ1bGxzY3JlZW5Ub2dnbGUiLCJpc1N1cHBvcnRlZCIsInRvZ2dsZUZ1bGxTY3JlZW4iLCJhZGp1c3RMb2dIZWlnaHQiLCJ0b2dnbGUiLCJlcnIiLCJjb25zb2xlIiwiZXJyb3IiLCJtZXNzYWdlIiwib2Zmc2V0IiwiZ2V0QWN0aXZlRWxlbWVudCIsInJlc2l6ZSIsIiRoaWRkZW5JbnB1dCIsIiRkcm9wZG93biIsImlkIiwiJHRleHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJzZF9BbGxMZXZlbHMiLCIkaWNvbiIsIiRtZW51IiwiaXRlbXMiLCJ2YWx1ZSIsImljb24iLCJzZF9FcnJvciIsInNkX1dhcm5pbmciLCJzZF9Ob3RpY2UiLCJzZF9JbmZvIiwic2RfRGVidWciLCJmb3JFYWNoIiwiaXRlbSIsIiRpdGVtIiwiaHRtbCIsImFwcGVuZCIsImFmdGVyIiwidGFiaW5kZXgiLCJiZWZvcmUiLCJhY2UiLCJlZGl0IiwianVsaWEiLCJyZXF1aXJlIiwidW5kZWZpbmVkIiwiSW5pTW9kZSIsIk1vZGUiLCJzZXNzaW9uIiwic2V0TW9kZSIsInNldFRoZW1lIiwicmVuZGVyZXIiLCJzZXRTaG93R3V0dGVyIiwic2V0T3B0aW9ucyIsInNob3dMaW5lTnVtYmVycyIsInNob3dQcmludE1hcmdpbiIsInJlYWRPbmx5IiwiYnVpbGRUcmVlU3RydWN0dXJlIiwiZmlsZXMiLCJkZWZhdWx0UGF0aCIsInRyZWUiLCJPYmplY3QiLCJlbnRyaWVzIiwiZmlsZURhdGEiLCJmaWxlUGF0aCIsInBhdGgiLCJwYXJ0cyIsInNwbGl0IiwiY3VycmVudCIsInBhcnQiLCJzaXplIiwiY2hpbGRyZW4iLCJ0cmVlVG9Ecm9wZG93bkl0ZW1zIiwicHJlZml4IiwicGFyZW50Rm9sZGVyUGF0aCIsInNvcnQiLCJhS2V5IiwiYVZhbCIsImJLZXkiLCJiVmFsIiwibG9jYWxlQ29tcGFyZSIsImZvbGRlclBhdGgiLCJwdXNoIiwibmFtZSIsImRpc2FibGVkIiwiZm9sZGVyTmFtZSIsInBhcmVudEZvbGRlciIsImNoaWxkSXRlbXMiLCJzZWxlY3RlZCIsInJlc3BvbnNlIiwiZmllbGRzIiwidmFsdWVzIiwiZWFjaCIsIm9wdGlvbiIsImZvbGRlclBhcmVudEF0dHIiLCJwYXJlbnRBdHRyIiwibWF5YmVEaXNhYmxlZCIsImFkZEV2ZW50TGlzdGVuZXIiLCJmb2xkZXJIZWFkZXIiLCJzdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24iLCIkZm9sZGVyIiwiJHRvZ2dsZSIsImlzQ29sbGFwc2VkIiwic2hvdyIsImNvbGxhcHNlRGVzY2VuZGFudHMiLCJzZWFyY2hWYWx1ZSIsIl8iLCJmb2xkZXIiLCJjaGlsZEZvbGRlciIsIiRjaGlsZEZvbGRlciIsImNoaWxkUGF0aCIsImV4cGFuZEZvbGRlckZvckZpbGUiLCIkZmlsZUl0ZW0iLCJwYXJlbnRQYXRoIiwiaGFzaCIsImxvY2F0aW9uIiwic3RhcnRzV2l0aCIsImRlY29kZVVSSUNvbXBvbmVudCIsInN1YnN0cmluZyIsImZpbGVFeGlzdHMiLCJzb21lIiwiZ2V0RmlsZUZyb21IYXNoIiwicmVzdWx0IiwiZGVmVmFsIiwiZmlsZU5hbWUiLCJkcm9wZG93blZhbHVlcyIsIm1hcCIsInJlcGxhY2UiLCJzZWxlY3RlZEl0ZW0iLCJpdGVtVG9TZWxlY3QiLCJlbmNvZGVVUklDb21wb25lbnQiLCJyZXNldEZpbHRlcnMiLCJ1cGRhdGVBdXRvUmVmcmVzaFZpc2liaWxpdHkiLCJjaGVja1RpbWVSYW5nZUF2YWlsYWJpbGl0eSIsImlzUm90YXRlZExvZ0ZpbGUiLCJ0ZXN0IiwiJGF1dG9CdG4iLCJpc1JvdGF0ZWQiLCJkaXNwbGF5IiwiZmlyc3QiLCJkaXJlY3Rpb24iLCIkb3B0aW9ucyIsImZpbHRlciIsImVxIiwic3luY0ZpbHRlckNvbmRpdGlvbnNUb0Zvcm0iLCJyZW5kZXJGaWx0ZXJMYWJlbHMiLCJzcGxpY2UiLCJKU09OIiwic3RyaW5naWZ5IiwiJGNvbnRhaW5lciIsImVtcHR5IiwiY29uZGl0aW9uIiwiY3NzQ2xhc3MiLCJpY29uQ2xhc3MiLCJpY29uQ29sb3IiLCIkbGFiZWwiLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJzZWFyY2giLCJmaWx0ZXJQYXJhbSIsImdldCIsInRyaW1tZWQiLCJwYXJzZWQiLCJwYXJzZSIsIkFycmF5IiwiaXNBcnJheSIsImMiLCJwIiwidXBkYXRlUGVyaW9kQnV0dG9uc1Zpc2liaWxpdHkiLCJsb2dEdXJhdGlvbiIsIiRwZXJpb2RCdXR0b25zIiwiJHBlcmlvZENvbnRhaW5lciIsImxhcmdlc3RWaXNpYmxlUGVyaW9kIiwiJGxhcmdlc3RWaXNpYmxlQnV0dG9uIiwidmlzaWJsZUNvdW50IiwiYnV0dG9uIiwicGFyc2VJbnQiLCIkdGltZUNvbnRyb2xzSW5saW5lIiwiZ2V0TG9nVGltZVJhbmdlIiwidGltZV9yYW5nZSIsImluaXRpYWxpemVOYXZpZ2F0aW9uIiwidGltZVJhbmdlRGF0YSIsImhhc1ZhbGlkVGltZVJhbmdlIiwiaGFzTXVsdGlwbGVUaW1lc3RhbXBzIiwic2VydmVyX3RpbWV6b25lX29mZnNldCIsInNlcnZlclRpbWV6b25lT2Zmc2V0Iiwib25SYW5nZUNoYW5nZSIsImRyYWdnZWRIYW5kbGUiLCJvblRydW5jYXRlZFpvbmVDbGljayIsImlzTGVmdFpvbmUiLCIkYWN0aXZlQnV0dG9uIiwiaW5pdGlhbFBlcmlvZCIsIm1pbiIsImluaXRpYWxTdGFydCIsImxpbmVSYW5nZSIsImxvYWRMb2dCeUxpbmVzIiwiZmxvb3IiLCJjZWlsIiwibGluZXMiLCJwYXJhbXMiLCJsb2dMZXZlbCIsImdldExvZ0Zyb21GaWxlIiwic2V0VmFsdWUiLCJjb250ZW50IiwiZ290b0xpbmUiLCJzY3JvbGxUb0xpbmUiLCJzdGFydFRpbWVzdGFtcCIsImVuZFRpbWVzdGFtcCIsImxhdGVzdCIsImlzSW5pdGlhbExvYWQiLCJpc0F1dG9VcGRhdGUiLCJkYXRlRnJvbSIsImRhdGVUbyIsIm5ld0NvbnRlbnQiLCJjdXJyZW50Q29udGVudCIsImdldFZhbHVlIiwibmV3TGluZXMiLCJmaW5kTmV3TGluZXMiLCJsYXN0Um93IiwiZ2V0TGVuZ3RoIiwiaW5zZXJ0Iiwicm93IiwiY29sdW1uIiwiam9pbiIsImZpbmFsUm93IiwiZmluYWxDb2x1bW4iLCJnZXRMaW5lIiwiYWN0dWFsX3JhbmdlIiwiYWN0dWFsIiwidXBkYXRlRGF0YUJvdW5kYXJ5IiwidXBkYXRlRnJvbVNlcnZlclJlc3BvbnNlIiwicGVyaW9kU2Vjb25kcyIsImFwcGx5UGVyaW9kIiwiZmlsdGVyUGF0dGVybiIsInByZXNlcnZlUmFuZ2UiLCJzZWxlY3RlZFJhbmdlIiwiRGF0ZSIsIm5vdyIsImRhdGFFbmQiLCJleHRlbmRSYW5nZSIsImNiVXBkYXRlTG9nVGV4dCIsImxpbmUiLCJjdXJyZW50TGluZXMiLCJhbmNob3JMaW5lIiwiaSIsImFuY2hvckluZGV4Iiwic2xpY2UiLCJtZXNzYWdlcyIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwiZ2V0U2Vzc2lvbiIsImVyYXNlRmlsZSIsImNiQWZ0ZXJGaWxlRXJhc2VkIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxvQkFBb0IsR0FBRztBQUN6QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRSxJQU5lOztBQVF6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxZQUFZLEVBQUUsSUFaVzs7QUFjekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsWUFBWSxFQUFFLElBbEJXOztBQW9CekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFLElBeEJjOztBQTBCekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsV0FBVyxFQUFFLElBOUJZOztBQWdDekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsTUFBTSxFQUFFLEVBcENpQjs7QUFzQ3pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLG1CQUFtQixFQUFFLElBMUNJOztBQTRDekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFLEVBaERjOztBQWtEekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsT0FBTyxFQUFFLElBdERnQjs7QUF3RHpCO0FBQ0o7QUFDQTtBQUNB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TUFBQUEsV0FBVyxDQUFDQyxlQUFaLENBQTRCaEssUUFBUSxDQUFDOEosUUFBckM7QUFDSCxLQUZELE1BRU87QUFDSGhXLE1BQUFBLG9CQUFvQixDQUFDdUUsbUJBQXJCO0FBQ0g7QUFDSjtBQS9sRHdCLENBQTdCLEMsQ0FrbURBOztBQUNBcEQsQ0FBQyxDQUFDZ0MsUUFBRCxDQUFELENBQVltVCxLQUFaLENBQWtCLFlBQU07QUFDcEJ0VyxFQUFBQSxvQkFBb0IsQ0FBQ2tCLFVBQXJCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG4vKiBnbG9iYWwgYWNlLCBQYnhBcGksIFN5c2xvZ0FQSSwgdXBkYXRlTG9nVmlld1dvcmtlciwgQWNlLCBVc2VyTWVzc2FnZSwgU1ZHVGltZWxpbmUgKi9cblxuLyoqXG4gKiBSZXByZXNlbnRzIHRoZSBzeXN0ZW0gZGlhZ25vc3RpYyBsb2dzIG9iamVjdC5cbiAqXG4gKiBAbW9kdWxlIHN5c3RlbURpYWdub3N0aWNMb2dzXG4gKi9cbmNvbnN0IHN5c3RlbURpYWdub3N0aWNMb2dzID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBcIlNob3cgTGFzdCBMb2dcIiBidXR0b24uXG4gICAgICogUmVzb2x2ZWQgaW4gaW5pdGlhbGl6ZSgpIOKAlCBtdXN0IG5vdCBjYWxsICQoKSBhdCBtb2R1bGUtbG9hZCB0aW1lLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNob3dCdG46IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgXCJEb3dubG9hZCBGaWxlXCIgYnV0dG9uLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRvd25sb2FkQnRuOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIFwiU2hvdyBMYXN0IExvZyAoQXV0bylcIiBidXR0b24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc2hvd0F1dG9CdG46IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgXCJFcmFzZSBjdXJyZW50IGZpbGUgY29udGVudFwiIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRlcmFzZUJ0bjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBsb2cgY29udGVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRsb2dDb250ZW50OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVGhlIHZpZXdlciBmb3IgZGlzcGxheWluZyB0aGUgbG9nIGNvbnRlbnQuXG4gICAgICogQHR5cGUge0FjZX1cbiAgICAgKi9cbiAgICB2aWV3ZXI6ICcnLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZpbGUgc2VsZWN0IGRyb3Bkb3duLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZpbGVTZWxlY3REcm9wRG93bjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEFycmF5IG9mIGxvZyBpdGVtcy5cbiAgICAgKiBAdHlwZSB7QXJyYXl9XG4gICAgICovXG4gICAgbG9nc0l0ZW1zOiBbXSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBkaW1tZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGltbWVyOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEZsYWcgdG8gcHJldmVudCBkdXBsaWNhdGUgQVBJIGNhbGxzIGR1cmluZyBpbml0aWFsaXphdGlvblxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGlzSW5pdGlhbGl6aW5nOiB0cnVlLFxuXG4gICAgLyoqXG4gICAgICogRmxhZyBpbmRpY2F0aW5nIGlmIHRpbWUgc2xpZGVyIG1vZGUgaXMgZW5hYmxlZFxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIHRpbWVTbGlkZXJFbmFibGVkOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIEN1cnJlbnQgdGltZSByYW5nZSBmb3IgdGhlIHNlbGVjdGVkIGxvZyBmaWxlXG4gICAgICogQHR5cGUge29iamVjdHxudWxsfVxuICAgICAqL1xuICAgIGN1cnJlbnRUaW1lUmFuZ2U6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBGbGFnIGluZGljYXRpbmcgaWYgYXV0by11cGRhdGUgbW9kZSBpcyBhY3RpdmVcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBpc0F1dG9VcGRhdGVBY3RpdmU6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogQXJyYXkgb2YgY2FzY2FkaW5nIGZpbHRlciBjb25kaXRpb25zIFt7dHlwZTogJ2NvbnRhaW5zJ3wnbm90Q29udGFpbnMnLCB2YWx1ZTogc3RyaW5nfV1cbiAgICAgKiBAdHlwZSB7QXJyYXl9XG4gICAgICovXG4gICAgZmlsdGVyQ29uZGl0aW9uczogW10sXG5cbiAgICAvKipcbiAgICAgKiBQZW5kaW5nIGZpbHRlciB0ZXh0IHdhaXRpbmcgZm9yIHR5cGUgc2VsZWN0aW9uIGluIHBvcHVwXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBwZW5kaW5nRmlsdGVyVGV4dDogJycsXG5cbiAgICAvKipcbiAgICAgKiBMYXN0IGtub3duIGFjdHVhbCBkYXRhIGVuZCB0aW1lc3RhbXAgZnJvbSBBUEkgcmVzcG9uc2UuXG4gICAgICogVXNlZCB0byBhbmNob3IgcmVmcmVzaCB0aW1lIHJhbmdlIHRvIHJlYWwgZGF0YSBpbnN0ZWFkIG9mIHdhbGwgY2xvY2sgdGltZS5cbiAgICAgKiBXSFk6IElmIGEgbG9nIGZpbGUgaGFzbid0IGJlZW4gd3JpdHRlbiB0byByZWNlbnRseSAoZS5nLiwgaWRsZSBtb2R1bGUgbG9nKSxcbiAgICAgKiB1c2luZyBcIm5vdyAtIHBlcmlvZFwiIGFzIHN0YXJ0VGltZXN0YW1wIHByb2R1Y2VzIGFuIGVtcHR5IHJhbmdlIHdpdGggbm8gZGF0YS5cbiAgICAgKiBAdHlwZSB7bnVtYmVyfG51bGx9XG4gICAgICovXG4gICAgbGFzdEtub3duRGF0YUVuZDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBzeXN0ZW0gZGlhZ25vc3RpYyBsb2dzLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIFJlc29sdmUgalF1ZXJ5IHdyYXBwZXJzIGhlcmUg4oCUIGF0IG1vZHVsZS1sb2FkIHRpbWUgalF1ZXJ5IG1heVxuICAgICAgICAvLyBub3QgeWV0IGJlIGRlZmluZWQgKFNlbnRyeSBNSUtPUEJYLU1HOSBwYXR0ZXJuKS5cbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJHNob3dCdG4gPSAkKCcjc2hvdy1sYXN0LWxvZycpO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZG93bmxvYWRCdG4gPSAkKCcjZG93bmxvYWQtZmlsZScpO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kc2hvd0F1dG9CdG4gPSAkKCcjc2hvdy1sYXN0LWxvZy1hdXRvJyk7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRlcmFzZUJ0biA9ICQoJyNlcmFzZS1maWxlJyk7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRsb2dDb250ZW50ID0gJCgnI2xvZy1jb250ZW50LXJlYWRvbmx5Jyk7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIgPSAkKCcjZ2V0LWxvZ3MtZGltbWVyJyk7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqID0gJCgnI3N5c3RlbS1kaWFnbm9zdGljLWZvcm0nKTtcblxuICAgICAgICAvLyBFbnN1cmUgZmlsdGVyIHR5cGUgcG9wdXAgc3RhcnRzIGhpZGRlbiB3aXRoIGNsZWFuIHN0eWxlc1xuICAgICAgICAkKCcjZmlsdGVyLXR5cGUtcG9wdXAnKS5hZGRDbGFzcygnaGlkZGVuJykuaGlkZSgpLmNzcyh7dG9wOiAnJywgbGVmdDogJyd9KTtcblxuICAgICAgICBjb25zdCBhY2VIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSAyNTA7XG5cbiAgICAgICAgLy8gU2V0IHRoZSBtaW5pbXVtIGhlaWdodCBvZiB0aGUgbG9nIGNvbnRhaW5lclxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLmNsb3Nlc3QoJ2RpdicpLmNzcygnbWluLWhlaWdodCcsIGAke2FjZUhlaWdodH1weGApO1xuXG4gICAgICAgIC8vIENyZWF0ZSBkcm9wZG93biBVSSBmcm9tIGhpZGRlbiBpbnB1dCAoVjUuMCBwYXR0ZXJuKVxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jcmVhdGVEcm9wZG93bkZyb21IaWRkZW5JbnB1dCgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGRyb3Bkb3duIG1lbnUgZm9yIGxvZyBmaWxlcyB3aXRoIHRyZWUgc3VwcG9ydFxuICAgICAgICAvLyBJbml0aWFsaXplIFNlbWFudGljIFVJIGRyb3Bkb3duIHdpdGggY3VzdG9tIG1lbnUgZ2VuZXJhdGlvblxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY2JPbkNoYW5nZUZpbGUsXG4gICAgICAgICAgICAgICAgaWdub3JlQ2FzZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICAgICAgcHJlc2VydmVIVE1MOiB0cnVlLFxuICAgICAgICAgICAgICAgIGFsbG93Q2F0ZWdvcnlTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgICAgIG1hdGNoOiAndGV4dCcsXG4gICAgICAgICAgICAgICAgZmlsdGVyUmVtb3RlRGF0YTogZmFsc2UsXG4gICAgICAgICAgICAgICAgYWN0aW9uOiAnYWN0aXZhdGUnLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlczoge1xuICAgICAgICAgICAgICAgICAgICBtZW51OiBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jdXN0b21Ecm9wZG93bk1lbnVcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZm9sZGVyIGNvbGxhcHNlL2V4cGFuZCBoYW5kbGVycyAodXNlcyBldmVudCBkZWxlZ2F0aW9uKVxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pbml0aWFsaXplRm9sZGVySGFuZGxlcnMoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBBQ0UgZWRpdG9yIGZvciBsb2cgY29udGVudFxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pbml0aWFsaXplQWNlKCk7XG5cbiAgICAgICAgLy8gRmV0Y2ggdGhlIGxpc3Qgb2YgbG9nIGZpbGVzXG4gICAgICAgIFN5c2xvZ0FQSS5nZXRMb2dzTGlzdChzeXN0ZW1EaWFnbm9zdGljTG9ncy5jYkZvcm1hdERyb3Bkb3duUmVzdWx0cyk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBsb2cgbGV2ZWwgZHJvcGRvd24gLSBWNS4wIHBhdHRlcm4gd2l0aCBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmluaXRpYWxpemVMb2dMZXZlbERyb3Bkb3duKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmaWx0ZXIgY29uZGl0aW9ucyBmcm9tIFVSTCBwYXJhbWV0ZXIgKGUuZy4gQ0RSIGxpbmtzIHdpdGggP2ZpbHRlcj0uLi4pXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmluaXRpYWxpemVGaWx0ZXJGcm9tVXJsKCk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIHF1aWNrIHBlcmlvZCBidXR0b25zXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcucGVyaW9kLWJ0bicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkYnRuID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICAgICAgY29uc3QgcGVyaW9kID0gJGJ0bi5kYXRhKCdwZXJpb2QnKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIGFjdGl2ZSBzdGF0ZVxuICAgICAgICAgICAgJCgnLnBlcmlvZC1idG4nKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAkYnRuLmFkZENsYXNzKCdhY3RpdmUnKTtcblxuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuYXBwbHlRdWlja1BlcmlvZChwZXJpb2QpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgXCJOb3dcIiBidXR0b25cbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJy5ub3ctYnRuJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGlmIChzeXN0ZW1EaWFnbm9zdGljTG9ncy5jdXJyZW50VGltZVJhbmdlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZW5kID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY3VycmVudFRpbWVSYW5nZS5lbmQ7XG4gICAgICAgICAgICAgICAgY29uc3Qgb25lSG91ciA9IDM2MDA7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhcnQgPSBNYXRoLm1heChlbmQgLSBvbmVIb3VyLCBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jdXJyZW50VGltZVJhbmdlLnN0YXJ0KTtcbiAgICAgICAgICAgICAgICBTVkdUaW1lbGluZS5zZXRSYW5nZShzdGFydCwgZW5kKTtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2FkTG9nQnlUaW1lUmFuZ2Uoc3RhcnQsIGVuZCk7XG4gICAgICAgICAgICAgICAgJCgnLnBlcmlvZC1idG4nKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgJCgnLnBlcmlvZC1idG5bZGF0YS1wZXJpb2Q9XCIzNjAwXCJdJykuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgbG9nIGxldmVsIGZpbHRlciBidXR0b25zXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcubGV2ZWwtYnRuJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0ICRidG4gPSAkKGUuY3VycmVudFRhcmdldCk7XG4gICAgICAgICAgICBjb25zdCBsZXZlbCA9ICRidG4uZGF0YSgnbGV2ZWwnKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIGFjdGl2ZSBzdGF0ZVxuICAgICAgICAgICAgJCgnLmxldmVsLWJ0bicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgICRidG4uYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuXG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5hcHBseUxvZ0xldmVsRmlsdGVyKGxldmVsKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIFwiU2hvdyBMb2dcIiBidXR0b24gY2xpY2sgKGRlbGVnYXRlZClcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJyNzaG93LWxhc3QtbG9nJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gTGlzdGVuIGZvciBoYXNoIGNoYW5nZXMgdG8gdXBkYXRlIHNlbGVjdGVkIGZpbGVcbiAgICAgICAgJCh3aW5kb3cpLm9uKCdoYXNoY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaGFuZGxlSGFzaENoYW5nZSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgXCJEb3dubG9hZCBMb2dcIiBidXR0b24gY2xpY2sgKGRlbGVnYXRlZClcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJyNkb3dubG9hZC1maWxlJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgICAgICBTeXNsb2dBUEkuZG93bmxvYWRMb2dGaWxlKGRhdGEuZmlsZW5hbWUsIHRydWUsIHN5c3RlbURpYWdub3N0aWNMb2dzLmNiRG93bmxvYWRGaWxlKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIFwiQXV0byBSZWZyZXNoXCIgYnV0dG9uIGNsaWNrIChkZWxlZ2F0ZWQpXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcjc2hvdy1sYXN0LWxvZy1hdXRvJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0ICRidXR0b24gPSAkKCcjc2hvdy1sYXN0LWxvZy1hdXRvJyk7XG4gICAgICAgICAgICBjb25zdCAkcmVsb2FkSWNvbiA9ICRidXR0b24uZmluZCgnLmljb25zIGkucmVmcmVzaCcpO1xuICAgICAgICAgICAgaWYgKCRyZWxvYWRJY29uLmhhc0NsYXNzKCdsb2FkaW5nJykpIHtcbiAgICAgICAgICAgICAgICAkcmVsb2FkSWNvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHVwZGF0ZUxvZ1ZpZXdXb3JrZXIuc3RvcCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkcmVsb2FkSWNvbi5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgdXBkYXRlTG9nVmlld1dvcmtlci5pbml0aWFsaXplKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciB0aGUgXCJFcmFzZSBmaWxlXCIgYnV0dG9uIGNsaWNrIChkZWxlZ2F0ZWQpXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcjZXJhc2UtZmlsZScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5lcmFzZUN1cnJlbnRGaWxlQ29udGVudCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgRW50ZXIga2V5cHJlc3Mgb24gZmlsdGVyIGlucHV0IOKAlCBzaG93IHR5cGUgcG9wdXBcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2tleWRvd24nLCAnI2ZpbHRlci1pbnB1dCcsIChldmVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJHBvcHVwID0gJCgnI2ZpbHRlci10eXBlLXBvcHVwJyk7XG4gICAgICAgICAgICBjb25zdCBpc1BvcHVwVmlzaWJsZSA9ICRwb3B1cC5pcygnOnZpc2libGUnKSAmJiAhJHBvcHVwLmhhc0NsYXNzKCdoaWRkZW4nKTtcblxuICAgICAgICAgICAgLy8gV2hlbiBwb3B1cCBpcyBvcGVuLCBoYW5kbGUgYXJyb3cga2V5cyBhbmQgRW50ZXIgZm9yIGtleWJvYXJkIG5hdmlnYXRpb25cbiAgICAgICAgICAgIGlmIChpc1BvcHVwVmlzaWJsZSkge1xuICAgICAgICAgICAgICAgIGlmIChldmVudC5rZXkgPT09ICdBcnJvd0Rvd24nIHx8IGV2ZW50LmtleSA9PT0gJ0Fycm93VXAnKSB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLm5hdmlnYXRlRmlsdGVyUG9wdXAoZXZlbnQua2V5ID09PSAnQXJyb3dEb3duJyA/IDEgOiAtMSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50LmtleSA9PT0gJ0VudGVyJykge1xuICAgICAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkZm9jdXNlZCA9ICRwb3B1cC5maW5kKCcuZmlsdGVyLXR5cGUtb3B0aW9uLmZvY3VzZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCRmb2N1c2VkLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGZvY3VzZWQudHJpZ2dlcignY2xpY2snKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZXZlbnQua2V5ID09PSAnRW50ZXInKSB7XG4gICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gJCgnI2ZpbHRlci1pbnB1dCcpLnZhbCgpLnRyaW0oKTtcbiAgICAgICAgICAgICAgICBpZiAodGV4dCAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MucGVuZGluZ0ZpbHRlclRleHQgPSB0ZXh0O1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5zaG93RmlsdGVyVHlwZVBvcHVwKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChldmVudC5rZXkgPT09ICdFc2NhcGUnKSB7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaGlkZUZpbHRlclR5cGVQb3B1cCgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChldmVudC5rZXkgPT09ICdCYWNrc3BhY2UnICYmICQoJyNmaWx0ZXItaW5wdXQnKS52YWwoKSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgbGFzdCBjaGlwIG9uIEJhY2tzcGFjZSBpbiBlbXB0eSBpbnB1dFxuICAgICAgICAgICAgICAgIGlmIChzeXN0ZW1EaWFnbm9zdGljTG9ncy5maWx0ZXJDb25kaXRpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MucmVtb3ZlRmlsdGVyQ29uZGl0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuZmlsdGVyQ29uZGl0aW9ucy5sZW5ndGggLSAxXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBPbiBibHVyOiBhdXRvLWFkZCB0ZXh0IGFzIFwiY29udGFpbnNcIiBmaWx0ZXIgaWYgcG9wdXAgaXMgbm90IG9wZW5cbiAgICAgICAgJChkb2N1bWVudCkub24oJ2JsdXInLCAnI2ZpbHRlci1pbnB1dCcsICgpID0+IHtcbiAgICAgICAgICAgIC8vIERlbGF5IHRvIGFsbG93IGNsaWNrIG9uIHBvcHVwIG9wdGlvbiB0byBmaXJlIGZpcnN0XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCAkcG9wdXAgPSAkKCcjZmlsdGVyLXR5cGUtcG9wdXAnKTtcbiAgICAgICAgICAgICAgICBpZiAoJHBvcHVwLmlzKCc6dmlzaWJsZScpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFBvcHVwIGlzIG9wZW4gKHVzZXIgcHJlc3NlZCBFbnRlcikg4oCUIGxldCBwb3B1cCBoYW5kbGUgaXRcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gJCgnI2ZpbHRlci1pbnB1dCcpLnZhbCgpLnRyaW0oKTtcbiAgICAgICAgICAgICAgICBpZiAodGV4dCAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuYWRkRmlsdGVyQ29uZGl0aW9uKCdjb250YWlucycsIHRleHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIDE1MCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciBmaWx0ZXIgdHlwZSBvcHRpb24gY2xpY2tcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJy5maWx0ZXItdHlwZS1vcHRpb24nLCAoZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdHlwZSA9ICQoZS5jdXJyZW50VGFyZ2V0KS5kYXRhKCd0eXBlJyk7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5hZGRGaWx0ZXJDb25kaXRpb24odHlwZSwgc3lzdGVtRGlhZ25vc3RpY0xvZ3MucGVuZGluZ0ZpbHRlclRleHQpO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MucGVuZGluZ0ZpbHRlclRleHQgPSAnJztcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmhpZGVGaWx0ZXJUeXBlUG9wdXAoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIHJlbW92aW5nIGluZGl2aWR1YWwgZmlsdGVyIGNoaXBcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJyNmaWx0ZXItbGFiZWxzIC5kZWxldGUuaWNvbicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgY29uc3QgaW5kZXggPSAkKGUuY3VycmVudFRhcmdldCkuY2xvc2VzdCgnLmZpbHRlci1jb25kaXRpb24tbGFiZWwnKS5kYXRhKCdpbmRleCcpO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MucmVtb3ZlRmlsdGVyQ29uZGl0aW9uKGluZGV4KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIFwiQ2xlYXIgRmlsdGVyXCIgYnV0dG9uIGNsaWNrXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcjY2xlYXItZmlsdGVyLWJ0bicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jbGVhckFsbEZpbHRlckNvbmRpdGlvbnMoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ2xpY2sgb24gY29udGFpbmVyIGZvY3VzZXMgaW5wdXRcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJyNmaWx0ZXItY29uZGl0aW9ucy1jb250YWluZXInLCAoZSkgPT4ge1xuICAgICAgICAgICAgaWYgKCQoZS50YXJnZXQpLmlzKCcjZmlsdGVyLWNvbmRpdGlvbnMtY29udGFpbmVyJykgfHwgJChlLnRhcmdldCkuaXMoJyNmaWx0ZXItbGFiZWxzJykpIHtcbiAgICAgICAgICAgICAgICAkKCcjZmlsdGVyLWlucHV0JykuZm9jdXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGlkZSBwb3B1cCB3aGVuIGNsaWNraW5nIG91dHNpZGVcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGlmICghJChlLnRhcmdldCkuY2xvc2VzdCgnI2ZpbHRlci10eXBlLXBvcHVwLCAjZmlsdGVyLWlucHV0JykubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaGlkZUZpbHRlclR5cGVQb3B1cCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgRnVsbHNjcmVlbiBidXR0b24gY2xpY2suIEhpZGVzIHRoZSB0b2dnbGUgb25cbiAgICAgICAgLy8gYnJvd3NlcnMgd2l0aG91dCBGdWxsc2NyZWVuIEFQSSBmb3IgRE9NIGVsZW1lbnRzIChlLmcuIGlQaG9uZSBXZWJLaXQpLlxuICAgICAgICBjb25zdCAkZnVsbHNjcmVlbkJ0biA9ICQoJy5mdWxsc2NyZWVuLXRvZ2dsZS1idG4nKTtcbiAgICAgICAgY29uc3QgbG9nQ29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3N5c3RlbS1sb2dzLXNlZ21lbnQnKTtcbiAgICAgICAgaWYgKEZ1bGxzY3JlZW5Ub2dnbGUuaXNTdXBwb3J0ZWQobG9nQ29udGFpbmVyKSkge1xuICAgICAgICAgICAgJGZ1bGxzY3JlZW5CdG4ub24oJ2NsaWNrJywgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudG9nZ2xlRnVsbFNjcmVlbik7XG4gICAgICAgICAgICBGdWxsc2NyZWVuVG9nZ2xlLm9uQ2hhbmdlKHN5c3RlbURpYWdub3N0aWNMb2dzLmFkanVzdExvZ0hlaWdodCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkZnVsbHNjcmVlbkJ0bi5oaWRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsIGhlaWdodCBjYWxjdWxhdGlvblxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5hZGp1c3RMb2dIZWlnaHQoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlcyB0aGUgZnVsbC1zY3JlZW4gbW9kZSBvZiB0aGUgJ3N5c3RlbS1sb2dzLXNlZ21lbnQnIGVsZW1lbnQuXG4gICAgICogVXNlcyBGdWxsc2NyZWVuVG9nZ2xlIGhlbHBlciB0byBoYW5kbGUgcHJlZml4ZWQgQVBJcyBhbmQgdW5zdXBwb3J0ZWRcbiAgICAgKiBlbnZpcm9ubWVudHMgKGlQaG9uZSBXZWJLaXQgaGFzIG5vIEZ1bGxzY3JlZW4gQVBJIGZvciBET00gZWxlbWVudHMpLlxuICAgICAqXG4gICAgICogQHJldHVybiB7dm9pZH1cbiAgICAgKi9cbiAgICB0b2dnbGVGdWxsU2NyZWVuKCkge1xuICAgICAgICBjb25zdCBsb2dDb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc3lzdGVtLWxvZ3Mtc2VnbWVudCcpO1xuICAgICAgICBGdWxsc2NyZWVuVG9nZ2xlLnRvZ2dsZShsb2dDb250YWluZXIpLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGF0dGVtcHRpbmcgdG8gdG9nZ2xlIGZ1bGwtc2NyZWVuIG1vZGU6ICR7ZXJyLm1lc3NhZ2V9YCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGdW5jdGlvbiB0byBhZGp1c3QgdGhlIGhlaWdodCBvZiB0aGUgbG9ncyBkZXBlbmRpbmcgb24gdGhlIHNjcmVlbiBtb2RlLlxuICAgICAqL1xuICAgIGFkanVzdExvZ0hlaWdodCgpIHtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBsZXQgYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGxvZ0NvbnRlbnQub2Zmc2V0KCkudG9wIC0gNTU7XG4gICAgICAgICAgICBpZiAoRnVsbHNjcmVlblRvZ2dsZS5nZXRBY3RpdmVFbGVtZW50KCkpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiBmdWxsc2NyZWVuIG1vZGUgaXMgYWN0aXZlXG4gICAgICAgICAgICAgICAgYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gODA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBSZWNhbGN1bGF0ZSB0aGUgc2l6ZSBvZiB0aGUgQUNFIGVkaXRvclxuICAgICAgICAgICAgJCgnLmxvZy1jb250ZW50LXJlYWRvbmx5JykuY3NzKCdtaW4taGVpZ2h0JywgIGAke2FjZUhlaWdodH1weGApO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnJlc2l6ZSgpO1xuICAgICAgICB9LCAzMDApO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBsb2cgbGV2ZWwgZHJvcGRvd24gLSBWNS4wIHBhdHRlcm4gd2l0aCBIVE1MIGljb25zXG4gICAgICogU3RhdGljIGRyb3Bkb3duIHdpdGggY29sb3JlZCBpY29ucyBhbmQgdHJhbnNsYXRpb25zXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUxvZ0xldmVsRHJvcGRvd24oKSB7XG4gICAgICAgIGNvbnN0ICRoaWRkZW5JbnB1dCA9ICQoJyNsb2dMZXZlbCcpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGRyb3Bkb3duIGFscmVhZHkgZXhpc3RzXG4gICAgICAgIGlmICgkKCcjbG9nTGV2ZWwtZHJvcGRvd24nKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENyZWF0ZSBkcm9wZG93biBIVE1MIHdpdGggY29sb3JlZCBpY29uc1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCc8ZGl2PicsIHtcbiAgICAgICAgICAgIGlkOiAnbG9nTGV2ZWwtZHJvcGRvd24nLFxuICAgICAgICAgICAgY2xhc3M6ICd1aSBzZWxlY3Rpb24gZHJvcGRvd24nXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0ICR0ZXh0ID0gJCgnPGRpdj4nLCB7IGNsYXNzOiAndGV4dCcgfSkudGV4dChnbG9iYWxUcmFuc2xhdGUuc2RfQWxsTGV2ZWxzKTtcbiAgICAgICAgY29uc3QgJGljb24gPSAkKCc8aT4nLCB7IGNsYXNzOiAnZHJvcGRvd24gaWNvbicgfSk7XG4gICAgICAgIGNvbnN0ICRtZW51ID0gJCgnPGRpdj4nLCB7IGNsYXNzOiAnbWVudScgfSk7XG5cbiAgICAgICAgLy8gQnVpbGQgbWVudSBpdGVtcyB3aXRoIGNvbG9yZWQgaWNvbnNcbiAgICAgICAgY29uc3QgaXRlbXMgPSBbXG4gICAgICAgICAgICB7IHZhbHVlOiAnJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnNkX0FsbExldmVscywgaWNvbjogJycgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdFUlJPUicsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5zZF9FcnJvciwgaWNvbjogJzxpIGNsYXNzPVwiZXhjbGFtYXRpb24gY2lyY2xlIHJlZCBpY29uXCI+PC9pPicgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdXQVJOSU5HJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnNkX1dhcm5pbmcsIGljb246ICc8aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIG9yYW5nZSBpY29uXCI+PC9pPicgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdOT1RJQ0UnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc2RfTm90aWNlLCBpY29uOiAnPGkgY2xhc3M9XCJpbmZvIGNpcmNsZSBibHVlIGljb25cIj48L2k+JyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ0lORk8nLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc2RfSW5mbywgaWNvbjogJzxpIGNsYXNzPVwiY2lyY2xlIGdyZXkgaWNvblwiPjwvaT4nIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAnREVCVUcnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc2RfRGVidWcsIGljb246ICc8aSBjbGFzcz1cImJ1ZyBwdXJwbGUgaWNvblwiPjwvaT4nIH1cbiAgICAgICAgXTtcblxuICAgICAgICBpdGVtcy5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICAgICAgY29uc3QgJGl0ZW0gPSAkKCc8ZGl2PicsIHtcbiAgICAgICAgICAgICAgICBjbGFzczogJ2l0ZW0nLFxuICAgICAgICAgICAgICAgICdkYXRhLXZhbHVlJzogaXRlbS52YWx1ZVxuICAgICAgICAgICAgfSkuaHRtbChpdGVtLmljb24gKyBpdGVtLnRleHQpO1xuICAgICAgICAgICAgJG1lbnUuYXBwZW5kKCRpdGVtKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJGRyb3Bkb3duLmFwcGVuZCgkdGV4dCwgJGljb24sICRtZW51KTtcbiAgICAgICAgJGhpZGRlbklucHV0LmFmdGVyKCRkcm9wZG93bik7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTZW1hbnRpYyBVSSBkcm9wZG93blxuICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICRoaWRkZW5JbnB1dC52YWwodmFsdWUpLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIodHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGRyb3Bkb3duIFVJIGVsZW1lbnQgZnJvbSBoaWRkZW4gaW5wdXQgZmllbGQgKFY1LjAgcGF0dGVybilcbiAgICAgKi9cbiAgICBjcmVhdGVEcm9wZG93bkZyb21IaWRkZW5JbnB1dCgpIHtcbiAgICAgICAgY29uc3QgJGhpZGRlbklucHV0ID0gJCgnI2ZpbGVuYW1lcycpO1xuXG4gICAgICAgIGlmICghJGhpZGRlbklucHV0Lmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignSGlkZGVuIGlucHV0ICNmaWxlbmFtZXMgbm90IGZvdW5kJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCc8ZGl2PicsIHtcbiAgICAgICAgICAgIGlkOiAnZmlsZW5hbWVzLWRyb3Bkb3duJyxcbiAgICAgICAgICAgIGNsYXNzOiAndWkgc2VhcmNoIHNlbGVjdGlvbiBkcm9wZG93biBmaWxlbmFtZXMtc2VsZWN0IGZsdWlkJ1xuICAgICAgICB9KTtcblxuICAgICAgICAkZHJvcGRvd24uYXBwZW5kKFxuICAgICAgICAgICAgJCgnPGk+JywgeyBjbGFzczogJ2Ryb3Bkb3duIGljb24nIH0pLFxuICAgICAgICAgICAgJCgnPGlucHV0PicsIHsgdHlwZTogJ3RleHQnLCBjbGFzczogJ3NlYXJjaCcsIHRhYmluZGV4OiAwIH0pLFxuICAgICAgICAgICAgJCgnPGRpdj4nLCB7IGNsYXNzOiAnZGVmYXVsdCB0ZXh0JyB9KS50ZXh0KCdTZWxlY3QgbG9nIGZpbGUnKSxcbiAgICAgICAgICAgICQoJzxkaXY+JywgeyBjbGFzczogJ21lbnUnIH0pXG4gICAgICAgICk7XG5cbiAgICAgICAgJGhpZGRlbklucHV0LmJlZm9yZSgkZHJvcGRvd24pO1xuICAgICAgICAkaGlkZGVuSW5wdXQuaGlkZSgpO1xuXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24gPSAkZHJvcGRvd247XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBBQ0UgZWRpdG9yIGZvciBsb2cgdmlld2luZy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplQWNlKCkge1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIgPSBhY2UuZWRpdCgnbG9nLWNvbnRlbnQtcmVhZG9ubHknKTtcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgSnVsaWEgbW9kZSBpcyBhdmFpbGFibGVcbiAgICAgICAgY29uc3QganVsaWEgPSBhY2UucmVxdWlyZSgnYWNlL21vZGUvanVsaWEnKTtcbiAgICAgICAgaWYgKGp1bGlhICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIFNldCB0aGUgbW9kZSB0byBKdWxpYSBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgIGNvbnN0IEluaU1vZGUgPSBqdWxpYS5Nb2RlO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnNlc3Npb24uc2V0TW9kZShuZXcgSW5pTW9kZSgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCB0aGUgdGhlbWUgYW5kIG9wdGlvbnMgZm9yIHRoZSBBQ0UgZWRpdG9yXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlci5zZXRUaGVtZSgnYWNlL3RoZW1lL21vbm9rYWknKTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnJlbmRlcmVyLnNldFNob3dHdXR0ZXIoZmFsc2UpO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIuc2V0T3B0aW9ucyh7XG4gICAgICAgICAgICBzaG93TGluZU51bWJlcnM6IGZhbHNlLFxuICAgICAgICAgICAgc2hvd1ByaW50TWFyZ2luOiBmYWxzZSxcbiAgICAgICAgICAgIHJlYWRPbmx5OiB0cnVlLFxuICAgICAgICB9KTtcblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCdWlsZHMgYSBoaWVyYXJjaGljYWwgdHJlZSBzdHJ1Y3R1cmUgZnJvbSBmbGF0IGZpbGUgcGF0aHNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZmlsZXMgLSBUaGUgZmlsZXMgb2JqZWN0IGZyb20gQVBJIHJlc3BvbnNlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGRlZmF1bHRQYXRoIC0gVGhlIGRlZmF1bHQgc2VsZWN0ZWQgZmlsZSBwYXRoXG4gICAgICogQHJldHVybnMge0FycmF5fSBUcmVlIHN0cnVjdHVyZSBmb3IgdGhlIGRyb3Bkb3duXG4gICAgICovXG4gICAgYnVpbGRUcmVlU3RydWN0dXJlKGZpbGVzLCBkZWZhdWx0UGF0aCkge1xuICAgICAgICBjb25zdCB0cmVlID0ge307XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCB0aGUgdHJlZSBzdHJ1Y3R1cmVcbiAgICAgICAgT2JqZWN0LmVudHJpZXMoZmlsZXMpLmZvckVhY2goKFtrZXksIGZpbGVEYXRhXSkgPT4ge1xuICAgICAgICAgICAgLy8gVXNlIGZpbGVEYXRhLnBhdGggYXMgdGhlIGFjdHVhbCBmaWxlIHBhdGhcbiAgICAgICAgICAgIGNvbnN0IGZpbGVQYXRoID0gZmlsZURhdGEucGF0aCB8fCBrZXk7XG4gICAgICAgICAgICBjb25zdCBwYXJ0cyA9IGZpbGVQYXRoLnNwbGl0KCcvJyk7XG4gICAgICAgICAgICBsZXQgY3VycmVudCA9IHRyZWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHBhcnRzLmZvckVhY2goKHBhcnQsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGluZGV4ID09PSBwYXJ0cy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgaXMgYSBmaWxlXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRbcGFydF0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZmlsZScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBmaWxlUGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpemU6IGZpbGVEYXRhLnNpemUsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAoZGVmYXVsdFBhdGggJiYgZGVmYXVsdFBhdGggPT09IGZpbGVQYXRoKSB8fCAoIWRlZmF1bHRQYXRoICYmIGZpbGVEYXRhLmRlZmF1bHQpXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBpcyBhIGRpcmVjdG9yeVxuICAgICAgICAgICAgICAgICAgICBpZiAoIWN1cnJlbnRbcGFydF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRbcGFydF0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ZvbGRlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW46IHt9XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnQgPSBjdXJyZW50W3BhcnRdLmNoaWxkcmVuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbnZlcnQgdHJlZSB0byBkcm9wZG93biBpdGVtc1xuICAgICAgICByZXR1cm4gdGhpcy50cmVlVG9Ecm9wZG93bkl0ZW1zKHRyZWUsICcnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENvbnZlcnRzIHRyZWUgc3RydWN0dXJlIHRvIGRyb3Bkb3duIGl0ZW1zIHdpdGggcHJvcGVyIGZvcm1hdHRpbmdcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gdHJlZSAtIFRoZSB0cmVlIHN0cnVjdHVyZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcmVmaXggLSBQcmVmaXggZm9yIGluZGVudGF0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmVudEZvbGRlciAtIFBhcmVudCBmb2xkZXIgbmFtZSBmb3IgZ3JvdXBpbmdcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IEZvcm1hdHRlZCBkcm9wZG93biBpdGVtc1xuICAgICAqL1xuICAgIHRyZWVUb0Ryb3Bkb3duSXRlbXModHJlZSwgcHJlZml4LCBwYXJlbnRGb2xkZXJQYXRoID0gJycpIHtcbiAgICAgICAgY29uc3QgaXRlbXMgPSBbXTtcblxuICAgICAgICAvLyBTb3J0IGVudHJpZXM6IGZvbGRlcnMgZmlyc3QsIHRoZW4gZmlsZXNcbiAgICAgICAgY29uc3QgZW50cmllcyA9IE9iamVjdC5lbnRyaWVzKHRyZWUpLnNvcnQoKFthS2V5LCBhVmFsXSwgW2JLZXksIGJWYWxdKSA9PiB7XG4gICAgICAgICAgICBpZiAoYVZhbC50eXBlID09PSAnZm9sZGVyJyAmJiBiVmFsLnR5cGUgPT09ICdmaWxlJykgcmV0dXJuIC0xO1xuICAgICAgICAgICAgaWYgKGFWYWwudHlwZSA9PT0gJ2ZpbGUnICYmIGJWYWwudHlwZSA9PT0gJ2ZvbGRlcicpIHJldHVybiAxO1xuICAgICAgICAgICAgcmV0dXJuIGFLZXkubG9jYWxlQ29tcGFyZShiS2V5KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZW50cmllcy5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcbiAgICAgICAgICAgIGlmICh2YWx1ZS50eXBlID09PSAnZm9sZGVyJykge1xuICAgICAgICAgICAgICAgIC8vIEJ1aWxkIHVuaXF1ZSBmb2xkZXIgcGF0aCBmb3IgaGllcmFyY2hpY2FsIGNvbGxhcHNlXG4gICAgICAgICAgICAgICAgY29uc3QgZm9sZGVyUGF0aCA9IHBhcmVudEZvbGRlclBhdGggPyBgJHtwYXJlbnRGb2xkZXJQYXRofS8ke2tleX1gIDoga2V5O1xuXG4gICAgICAgICAgICAgICAgLy8gQWRkIGZvbGRlciBoZWFkZXIgd2l0aCB0b2dnbGUgY2FwYWJpbGl0eSBhbmQgaW5kZW50YXRpb24gZm9yIG5lc3RlZCBmb2xkZXJzXG4gICAgICAgICAgICAgICAgaXRlbXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGAke3ByZWZpeH08aSBjbGFzcz1cImNhcmV0IGRvd24gaWNvbiBmb2xkZXItdG9nZ2xlXCI+PC9pPjxpIGNsYXNzPVwiZm9sZGVyIGljb25cIj48L2k+ICR7a2V5fWAsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdmb2xkZXInLFxuICAgICAgICAgICAgICAgICAgICBmb2xkZXJOYW1lOiBmb2xkZXJQYXRoLFxuICAgICAgICAgICAgICAgICAgICBwYXJlbnRGb2xkZXI6IHBhcmVudEZvbGRlclBhdGhcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIEFkZCBjaGlsZHJlbiB3aXRoIGluY3JlYXNlZCBpbmRlbnRhdGlvbiBhbmQgcGFyZW50IGZvbGRlciBwYXRoXG4gICAgICAgICAgICAgICAgY29uc3QgY2hpbGRJdGVtcyA9IHRoaXMudHJlZVRvRHJvcGRvd25JdGVtcyh2YWx1ZS5jaGlsZHJlbiwgcHJlZml4ICsgJyZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOycsIGZvbGRlclBhdGgpO1xuICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goLi4uY2hpbGRJdGVtcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEFkZCBmaWxlIGl0ZW0gd2l0aCBwYXJlbnQgZm9sZGVyIHJlZmVyZW5jZVxuICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBgJHtwcmVmaXh9PGkgY2xhc3M9XCJmaWxlIG91dGxpbmUgaWNvblwiPjwvaT4gJHtrZXl9ICgke3ZhbHVlLnNpemV9KWAsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZS5wYXRoLFxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZDogdmFsdWUuZGVmYXVsdCxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ZpbGUnLFxuICAgICAgICAgICAgICAgICAgICBwYXJlbnRGb2xkZXI6IHBhcmVudEZvbGRlclBhdGhcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIGl0ZW1zO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBjdXN0b20gZHJvcGRvd24gbWVudSBIVE1MIGZvciBsb2cgZmlsZXMgd2l0aCBjb2xsYXBzaWJsZSBmb2xkZXJzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGNvbnRhaW5pbmcgZHJvcGRvd24gbWVudSBvcHRpb25zXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGZpZWxkcyAtIFRoZSBmaWVsZHMgaW4gdGhlIHJlc3BvbnNlIHRvIHVzZSBmb3IgdGhlIG1lbnUgb3B0aW9uc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBIVE1MIHN0cmluZyBmb3IgdGhlIGN1c3RvbSBkcm9wZG93biBtZW51XG4gICAgICovXG4gICAgY3VzdG9tRHJvcGRvd25NZW51KHJlc3BvbnNlLCBmaWVsZHMpIHtcbiAgICAgICAgY29uc3QgdmFsdWVzID0gcmVzcG9uc2VbZmllbGRzLnZhbHVlc10gfHwge307XG4gICAgICAgIGxldCBodG1sID0gJyc7XG5cbiAgICAgICAgJC5lYWNoKHZhbHVlcywgKGluZGV4LCBvcHRpb24pID0+IHtcbiAgICAgICAgICAgIC8vIEZvciB0cmVlIHN0cnVjdHVyZSBpdGVtc1xuICAgICAgICAgICAgaWYgKHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtcyAmJiBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXNbaW5kZXhdKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXRlbSA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtc1tpbmRleF07XG5cbiAgICAgICAgICAgICAgICBpZiAoaXRlbS50eXBlID09PSAnZm9sZGVyJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBGb2xkZXIgaXRlbSAtIGNsaWNrYWJsZSBoZWFkZXIgZm9yIGNvbGxhcHNlL2V4cGFuZFxuICAgICAgICAgICAgICAgICAgICAvLyBOb3QgdXNpbmcgJ2Rpc2FibGVkJyBjbGFzcyBhcyBpdCBibG9ja3MgcG9pbnRlciBldmVudHNcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZm9sZGVyUGFyZW50QXR0ciA9IGl0ZW0ucGFyZW50Rm9sZGVyID8gYGRhdGEtcGFyZW50PVwiJHtpdGVtLnBhcmVudEZvbGRlcn1cImAgOiAnJztcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImZvbGRlci1oZWFkZXIgaXRlbVwiIGRhdGEtZm9sZGVyPVwiJHtpdGVtLmZvbGRlck5hbWV9XCIgJHtmb2xkZXJQYXJlbnRBdHRyfSBkYXRhLXZhbHVlPVwiXCIgZGF0YS10ZXh0PVwiJHtpdGVtLmZvbGRlck5hbWV9XCIgc3R5bGU9XCJwb2ludGVyLWV2ZW50czogYXV0byAhaW1wb3J0YW50OyBjdXJzb3I6IHBvaW50ZXI7IGZvbnQtd2VpZ2h0OiBib2xkOyBiYWNrZ3JvdW5kOiAjZjlmOWY5O1wiPiR7aXRlbS5uYW1lfTwvZGl2PmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRmlsZSBpdGVtIHdpdGggcGFyZW50IGZvbGRlciByZWZlcmVuY2UgZm9yIGNvbGxhcHNlXG4gICAgICAgICAgICAgICAgICAgIC8vIGRhdGEtdGV4dCBjb250YWlucyBmdWxsIHBhdGggc28gRm9tYW50aWMgc2VhcmNoIG1hdGNoZXMgYnkgZm9sZGVyIG5hbWUgdG9vXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdGVkID0gaXRlbS5zZWxlY3RlZCA/ICdzZWxlY3RlZCBhY3RpdmUnIDogJyc7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhcmVudEF0dHIgPSBpdGVtLnBhcmVudEZvbGRlciA/IGBkYXRhLXBhcmVudD1cIiR7aXRlbS5wYXJlbnRGb2xkZXJ9XCJgIDogJyc7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtIGZpbGUtaXRlbSAke3NlbGVjdGVkfVwiIGRhdGEtdmFsdWU9XCIke29wdGlvbltmaWVsZHMudmFsdWVdfVwiIGRhdGEtdGV4dD1cIiR7b3B0aW9uW2ZpZWxkcy52YWx1ZV19XCIgJHtwYXJlbnRBdHRyfT4ke2l0ZW0ubmFtZX08L2Rpdj5gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gcmVndWxhciBpdGVtXG4gICAgICAgICAgICAgICAgY29uc3QgbWF5YmVEaXNhYmxlZCA9IChvcHRpb25bZmllbGRzLmRpc2FibGVkXSkgPyAnZGlzYWJsZWQgJyA6ICcnO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCIke21heWJlRGlzYWJsZWR9aXRlbVwiIGRhdGEtdmFsdWU9XCIke29wdGlvbltmaWVsZHMudmFsdWVdfVwiPiR7b3B0aW9uW2ZpZWxkcy5uYW1lXX08L2Rpdj5gO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgZm9sZGVyIGNvbGxhcHNlL2V4cGFuZCBoYW5kbGVycyBhbmQgc2VhcmNoIGJlaGF2aW9yXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvbGRlckhhbmRsZXJzKCkge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duO1xuXG4gICAgICAgIC8vIEhhbmRsZSBmb2xkZXIgaGVhZGVyIGNsaWNrcyBmb3IgY29sbGFwc2UvZXhwYW5kXG4gICAgICAgIC8vIFVzZSBkb2N1bWVudC1sZXZlbCBoYW5kbGVyIHdpdGggY2FwdHVyZSBwaGFzZSB0byBpbnRlcmNlcHQgYmVmb3JlIEZvbWFudGljXG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIGNsaWNrIGlzIGluc2lkZSBvdXIgZHJvcGRvd24ncyBmb2xkZXItaGVhZGVyXG4gICAgICAgICAgICBjb25zdCBmb2xkZXJIZWFkZXIgPSBlLnRhcmdldC5jbG9zZXN0KCcjZmlsZW5hbWVzLWRyb3Bkb3duIC5mb2xkZXItaGVhZGVyJyk7XG4gICAgICAgICAgICBpZiAoIWZvbGRlckhlYWRlcikgcmV0dXJuO1xuXG4gICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICBjb25zdCAkZm9sZGVyID0gJChmb2xkZXJIZWFkZXIpO1xuICAgICAgICAgICAgY29uc3QgZm9sZGVyUGF0aCA9ICRmb2xkZXIuZGF0YSgnZm9sZGVyJyk7XG4gICAgICAgICAgICBjb25zdCAkdG9nZ2xlID0gJGZvbGRlci5maW5kKCcuZm9sZGVyLXRvZ2dsZScpO1xuICAgICAgICAgICAgY29uc3QgJG1lbnUgPSAkZHJvcGRvd24uZmluZCgnLm1lbnUnKTtcblxuICAgICAgICAgICAgLy8gVG9nZ2xlIGZvbGRlciBzdGF0ZVxuICAgICAgICAgICAgY29uc3QgaXNDb2xsYXBzZWQgPSAkdG9nZ2xlLmhhc0NsYXNzKCdyaWdodCcpO1xuXG4gICAgICAgICAgICBpZiAoaXNDb2xsYXBzZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBFeHBhbmQgZm9sZGVyIC0gc2hvdyBvbmx5IGRpcmVjdCBjaGlsZHJlblxuICAgICAgICAgICAgICAgICR0b2dnbGUucmVtb3ZlQ2xhc3MoJ3JpZ2h0JykuYWRkQ2xhc3MoJ2Rvd24nKTtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGRpcmVjdCBjaGlsZCBmaWxlcyBhbmQgY2hpbGQgZm9sZGVyIGhlYWRlcnNcbiAgICAgICAgICAgICAgICAkbWVudS5maW5kKGAuZmlsZS1pdGVtW2RhdGEtcGFyZW50PVwiJHtmb2xkZXJQYXRofVwiXWApLnNob3coKTtcbiAgICAgICAgICAgICAgICAkbWVudS5maW5kKGAuZm9sZGVyLWhlYWRlcltkYXRhLXBhcmVudD1cIiR7Zm9sZGVyUGF0aH1cIl1gKS5zaG93KCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIENvbGxhcHNlIGZvbGRlciAtIGhpZGUgYWxsIGRlc2NlbmRhbnRzIHJlY3Vyc2l2ZWx5XG4gICAgICAgICAgICAgICAgJHRvZ2dsZS5yZW1vdmVDbGFzcygnZG93bicpLmFkZENsYXNzKCdyaWdodCcpO1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmNvbGxhcHNlRGVzY2VuZGFudHMoJG1lbnUsIGZvbGRlclBhdGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTsgLy8gY2FwdHVyZSBwaGFzZSAtIGZpcmVzIGJlZm9yZSBidWJibGluZ1xuXG4gICAgICAgIC8vIEhhbmRsZSBzZWFyY2ggaW5wdXQgLSBzaG93IGFsbCBpdGVtcyB3aGVuIHNlYXJjaGluZ1xuICAgICAgICAkZHJvcGRvd24ub24oJ2lucHV0JywgJ2lucHV0LnNlYXJjaCcsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBzZWFyY2hWYWx1ZSA9ICQoZS50YXJnZXQpLnZhbCgpLnRyaW0oKTtcbiAgICAgICAgICAgIGNvbnN0ICRtZW51ID0gJGRyb3Bkb3duLmZpbmQoJy5tZW51Jyk7XG5cbiAgICAgICAgICAgIGlmIChzZWFyY2hWYWx1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBhbGwgaXRlbXMgYW5kIGV4cGFuZCBhbGwgZm9sZGVycyBkdXJpbmcgc2VhcmNoXG4gICAgICAgICAgICAgICAgJG1lbnUuZmluZCgnLmZpbGUtaXRlbScpLnNob3coKTtcbiAgICAgICAgICAgICAgICAkbWVudS5maW5kKCcuZm9sZGVyLWhlYWRlcicpLnNob3coKTtcbiAgICAgICAgICAgICAgICAkbWVudS5maW5kKCcuZm9sZGVyLXRvZ2dsZScpLnJlbW92ZUNsYXNzKCdyaWdodCcpLmFkZENsYXNzKCdkb3duJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFJlc3RvcmUgY29sbGFwc2VkIHN0YXRlIHdoZW4gc2VhcmNoIGlzIGNsZWFyZWRcbiAgICAgICAgICAgICAgICAkbWVudS5maW5kKCcuZm9sZGVyLWhlYWRlcicpLmVhY2goKF8sIGZvbGRlcikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkZm9sZGVyID0gJChmb2xkZXIpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmb2xkZXJQYXRoID0gJGZvbGRlci5kYXRhKCdmb2xkZXInKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNDb2xsYXBzZWQgPSAkZm9sZGVyLmZpbmQoJy5mb2xkZXItdG9nZ2xlJykuaGFzQ2xhc3MoJ3JpZ2h0Jyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0NvbGxhcHNlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY29sbGFwc2VEZXNjZW5kYW50cygkbWVudSwgZm9sZGVyUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlY3Vyc2l2ZWx5IGhpZGVzIGFsbCBkZXNjZW5kYW50cyAoZmlsZXMgYW5kIHN1YmZvbGRlcnMpIG9mIGEgZ2l2ZW4gZm9sZGVyXG4gICAgICogYW5kIG1hcmtzIGNoaWxkIGZvbGRlcnMgYXMgY29sbGFwc2VkXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRtZW51IC0gVGhlIGRyb3Bkb3duIG1lbnUgZWxlbWVudFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmb2xkZXJQYXRoIC0gVGhlIGZvbGRlciBwYXRoIHdob3NlIGRlc2NlbmRhbnRzIHRvIGhpZGVcbiAgICAgKi9cbiAgICBjb2xsYXBzZURlc2NlbmRhbnRzKCRtZW51LCBmb2xkZXJQYXRoKSB7XG4gICAgICAgIC8vIEhpZGUgZGlyZWN0IGNoaWxkIGZpbGVzXG4gICAgICAgICRtZW51LmZpbmQoYC5maWxlLWl0ZW1bZGF0YS1wYXJlbnQ9XCIke2ZvbGRlclBhdGh9XCJdYCkuaGlkZSgpO1xuXG4gICAgICAgIC8vIEZpbmQgZGlyZWN0IGNoaWxkIGZvbGRlcnMsIGNvbGxhcHNlIHRoZW0gcmVjdXJzaXZlbHksIHRoZW4gaGlkZVxuICAgICAgICAkbWVudS5maW5kKGAuZm9sZGVyLWhlYWRlcltkYXRhLXBhcmVudD1cIiR7Zm9sZGVyUGF0aH1cIl1gKS5lYWNoKChfLCBjaGlsZEZvbGRlcikgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGNoaWxkRm9sZGVyID0gJChjaGlsZEZvbGRlcik7XG4gICAgICAgICAgICBjb25zdCBjaGlsZFBhdGggPSAkY2hpbGRGb2xkZXIuZGF0YSgnZm9sZGVyJyk7XG5cbiAgICAgICAgICAgIC8vIE1hcmsgY2hpbGQgZm9sZGVyIGFzIGNvbGxhcHNlZFxuICAgICAgICAgICAgJGNoaWxkRm9sZGVyLmZpbmQoJy5mb2xkZXItdG9nZ2xlJykucmVtb3ZlQ2xhc3MoJ2Rvd24nKS5hZGRDbGFzcygncmlnaHQnKTtcblxuICAgICAgICAgICAgLy8gUmVjdXJzaXZlbHkgY29sbGFwc2UgaXRzIGRlc2NlbmRhbnRzXG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jb2xsYXBzZURlc2NlbmRhbnRzKCRtZW51LCBjaGlsZFBhdGgpO1xuXG4gICAgICAgICAgICAvLyBIaWRlIHRoZSBjaGlsZCBmb2xkZXIgaGVhZGVyIGl0c2VsZlxuICAgICAgICAgICAgJGNoaWxkRm9sZGVyLmhpZGUoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEV4cGFuZHMgdGhlIGZvbGRlciBjb250YWluaW5nIHRoZSBzcGVjaWZpZWQgZmlsZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlUGF0aCAtIFRoZSBmaWxlIHBhdGggdG8gZmluZCBhbmQgZXhwYW5kIGl0cyBwYXJlbnQgZm9sZGVyXG4gICAgICovXG4gICAgZXhwYW5kRm9sZGVyRm9yRmlsZShmaWxlUGF0aCkge1xuICAgICAgICBpZiAoIWZpbGVQYXRoKSByZXR1cm47XG5cbiAgICAgICAgY29uc3QgJG1lbnUgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmZpbmQoJy5tZW51Jyk7XG4gICAgICAgIGNvbnN0ICRmaWxlSXRlbSA9ICRtZW51LmZpbmQoYC5maWxlLWl0ZW1bZGF0YS12YWx1ZT1cIiR7ZmlsZVBhdGh9XCJdYCk7XG5cbiAgICAgICAgaWYgKCRmaWxlSXRlbS5sZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIFdhbGsgdXAgdGhlIGFuY2VzdG9yIGNoYWluIGV4cGFuZGluZyBlYWNoIGZvbGRlclxuICAgICAgICAgICAgbGV0IHBhcmVudFBhdGggPSAkZmlsZUl0ZW0uZGF0YSgncGFyZW50Jyk7XG4gICAgICAgICAgICB3aGlsZSAocGFyZW50UGF0aCkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRmb2xkZXIgPSAkbWVudS5maW5kKGAuZm9sZGVyLWhlYWRlcltkYXRhLWZvbGRlcj1cIiR7cGFyZW50UGF0aH1cIl1gKTtcbiAgICAgICAgICAgICAgICBpZiAoISRmb2xkZXIubGVuZ3RoKSBicmVhaztcblxuICAgICAgICAgICAgICAgIGNvbnN0ICR0b2dnbGUgPSAkZm9sZGVyLmZpbmQoJy5mb2xkZXItdG9nZ2xlJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBTaG93IHRoZSBmb2xkZXIgaGVhZGVyIGl0c2VsZiAobWF5IGJlIGhpZGRlbiBpZiBwYXJlbnQgd2FzIGNvbGxhcHNlZClcbiAgICAgICAgICAgICAgICAkZm9sZGVyLnNob3coKTtcblxuICAgICAgICAgICAgICAgIC8vIEV4cGFuZCBpZiBjb2xsYXBzZWRcbiAgICAgICAgICAgICAgICBpZiAoJHRvZ2dsZS5oYXNDbGFzcygncmlnaHQnKSkge1xuICAgICAgICAgICAgICAgICAgICAkdG9nZ2xlLnJlbW92ZUNsYXNzKCdyaWdodCcpLmFkZENsYXNzKCdkb3duJyk7XG4gICAgICAgICAgICAgICAgICAgICRtZW51LmZpbmQoYC5maWxlLWl0ZW1bZGF0YS1wYXJlbnQ9XCIke3BhcmVudFBhdGh9XCJdYCkuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICAkbWVudS5maW5kKGAuZm9sZGVyLWhlYWRlcltkYXRhLXBhcmVudD1cIiR7cGFyZW50UGF0aH1cIl1gKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gTW92ZSB0byBncmFuZHBhcmVudFxuICAgICAgICAgICAgICAgIHBhcmVudFBhdGggPSAkZm9sZGVyLmRhdGEoJ3BhcmVudCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgaGFzaCBjaGFuZ2VzIHRvIHVwZGF0ZSB0aGUgc2VsZWN0ZWQgZmlsZVxuICAgICAqL1xuICAgIGhhbmRsZUhhc2hDaGFuZ2UoKSB7XG4gICAgICAgIC8vIFNraXAgZHVyaW5nIGluaXRpYWxpemF0aW9uIHRvIHByZXZlbnQgZHVwbGljYXRlIEFQSSBjYWxsc1xuICAgICAgICBpZiAoc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNJbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGhhc2ggPSB3aW5kb3cubG9jYXRpb24uaGFzaDtcbiAgICAgICAgaWYgKGhhc2ggJiYgaGFzaC5zdGFydHNXaXRoKCcjZmlsZT0nKSkge1xuICAgICAgICAgICAgY29uc3QgZmlsZVBhdGggPSBkZWNvZGVVUklDb21wb25lbnQoaGFzaC5zdWJzdHJpbmcoNikpO1xuICAgICAgICAgICAgaWYgKGZpbGVQYXRoICYmIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ2dldCB2YWx1ZScpICE9PSBmaWxlUGF0aCkge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBmaWxlIGV4aXN0cyBpbiBkcm9wZG93biBpdGVtc1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVFeGlzdHMgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXMuc29tZShpdGVtID0+XG4gICAgICAgICAgICAgICAgICAgIGl0ZW0udHlwZSA9PT0gJ2ZpbGUnICYmIGl0ZW0udmFsdWUgPT09IGZpbGVQYXRoXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBpZiAoZmlsZUV4aXN0cykge1xuICAgICAgICAgICAgICAgICAgICAvLyBFeHBhbmQgcGFyZW50IGZvbGRlciBiZWZvcmUgc2VsZWN0aW5nIGZpbGVcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuZXhwYW5kRm9sZGVyRm9yRmlsZShmaWxlUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGZpbGVQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignc2V0IHRleHQnLCBmaWxlUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmaWxlbmFtZScsIGZpbGVQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudXBkYXRlTG9nRnJvbVNlcnZlcigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSBmaWxlIHBhdGggZnJvbSBVUkwgaGFzaCBpZiBwcmVzZW50XG4gICAgICovXG4gICAgZ2V0RmlsZUZyb21IYXNoKCkge1xuICAgICAgICBjb25zdCBoYXNoID0gd2luZG93LmxvY2F0aW9uLmhhc2g7XG4gICAgICAgIGlmIChoYXNoICYmIGhhc2guc3RhcnRzV2l0aCgnI2ZpbGU9JykpIHtcbiAgICAgICAgICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoaGFzaC5zdWJzdHJpbmcoNikpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gZm9ybWF0IHRoZSBkcm9wZG93biBtZW51IHN0cnVjdHVyZSBiYXNlZCBvbiB0aGUgcmVzcG9uc2UuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGRhdGEuXG4gICAgICovXG4gICAgY2JGb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgcmVzcG9uc2UgaXMgdmFsaWRcbiAgICAgICAgaWYgKCFyZXNwb25zZSB8fCAhcmVzcG9uc2UucmVzdWx0IHx8ICFyZXNwb25zZS5kYXRhIHx8ICFyZXNwb25zZS5kYXRhLmZpbGVzKSB7XG4gICAgICAgICAgICAvLyBIaWRlIGRpbW1lciBvbmx5IGlmIG5vdCBpbiBhdXRvLXVwZGF0ZSBtb2RlXG4gICAgICAgICAgICBpZiAoIXN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZmlsZXMgPSByZXNwb25zZS5kYXRhLmZpbGVzO1xuXG4gICAgICAgIC8vIENoZWNrIGZvciBmaWxlIGZyb20gaGFzaCBmaXJzdFxuICAgICAgICBsZXQgZGVmVmFsID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuZ2V0RmlsZUZyb21IYXNoKCk7XG5cbiAgICAgICAgLy8gSWYgbm8gaGFzaCB2YWx1ZSwgY2hlY2sgaWYgdGhlcmUgaXMgYSBkZWZhdWx0IHZhbHVlIHNldCBmb3IgdGhlIGZpbGVuYW1lIGlucHV0IGZpZWxkXG4gICAgICAgIGlmICghZGVmVmFsKSB7XG4gICAgICAgICAgICBjb25zdCBmaWxlTmFtZSA9IHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmaWxlbmFtZScpO1xuICAgICAgICAgICAgaWYgKGZpbGVOYW1lICE9PSAnJykge1xuICAgICAgICAgICAgICAgIGRlZlZhbCA9IGZpbGVOYW1lLnRyaW0oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEJ1aWxkIHRyZWUgc3RydWN0dXJlIGZyb20gZmlsZXNcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuYnVpbGRUcmVlU3RydWN0dXJlKGZpbGVzLCBkZWZWYWwpO1xuXG4gICAgICAgIC8vIENyZWF0ZSB2YWx1ZXMgYXJyYXkgZm9yIGRyb3Bkb3duIHdpdGggYWxsIGl0ZW1zIChpbmNsdWRpbmcgZm9sZGVycylcbiAgICAgICAgY29uc3QgZHJvcGRvd25WYWx1ZXMgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXMubWFwKChpdGVtLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgaWYgKGl0ZW0udHlwZSA9PT0gJ2ZvbGRlcicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBpdGVtLm5hbWUucmVwbGFjZSgvPFtePl0qPi9nLCAnJyksIC8vIFJlbW92ZSBIVE1MIHRhZ3MgZm9yIHNlYXJjaFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJycsXG4gICAgICAgICAgICAgICAgICAgIGRpc2FibGVkOiB0cnVlXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogaXRlbS5uYW1lLnJlcGxhY2UoLzxbXj5dKj4vZywgJycpLCAvLyBSZW1vdmUgSFRNTCB0YWdzIGZvciBzZWFyY2hcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGl0ZW0udmFsdWUsXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkOiBpdGVtLnNlbGVjdGVkXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgZHJvcGRvd24gd2l0aCB2YWx1ZXNcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignc2V0dXAgbWVudScsIHtcbiAgICAgICAgICAgIHZhbHVlczogZHJvcGRvd25WYWx1ZXNcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHRoZSBkZWZhdWx0IHNlbGVjdGVkIHZhbHVlIGlmIGFueVxuICAgICAgICBjb25zdCBzZWxlY3RlZEl0ZW0gPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXMuZmluZChpdGVtID0+IGl0ZW0uc2VsZWN0ZWQpO1xuICAgICAgICBpZiAoc2VsZWN0ZWRJdGVtKSB7XG4gICAgICAgICAgICAvLyBVc2Ugc2V0VGltZW91dCB0byBlbnN1cmUgZHJvcGRvd24gaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEV4cGFuZCBwYXJlbnQgZm9sZGVyIGJlZm9yZSBzZWxlY3RpbmcgZmlsZVxuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmV4cGFuZEZvbGRlckZvckZpbGUoc2VsZWN0ZWRJdGVtLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAvLyBTZXR0aW5nIHNlbGVjdGVkIHZhbHVlIHdpbGwgdHJpZ2dlciBvbkNoYW5nZSBjYWxsYmFjayB3aGljaCBjYWxscyB1cGRhdGVMb2dGcm9tU2VydmVyKClcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBzZWxlY3RlZEl0ZW0udmFsdWUpO1xuICAgICAgICAgICAgICAgIC8vIEZvcmNlIHJlZnJlc2ggdGhlIGRyb3Bkb3duIHRvIHNob3cgdGhlIHNlbGVjdGVkIHZhbHVlXG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bigncmVmcmVzaCcpO1xuICAgICAgICAgICAgICAgIC8vIEFsc28gc2V0IHRoZSB0ZXh0IHRvIHNob3cgZnVsbCBwYXRoXG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignc2V0IHRleHQnLCBzZWxlY3RlZEl0ZW0udmFsdWUpO1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmaWxlbmFtZScsIHNlbGVjdGVkSXRlbS52YWx1ZSk7XG4gICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICB9IGVsc2UgaWYgKGRlZlZhbCkge1xuICAgICAgICAgICAgLy8gSWYgd2UgaGF2ZSBhIGRlZmF1bHQgdmFsdWUgYnV0IG5vIGl0ZW0gd2FzIG1hcmtlZCBhcyBzZWxlY3RlZCxcbiAgICAgICAgICAgIC8vIHRyeSB0byBmaW5kIGFuZCBzZWxlY3QgaXQgbWFudWFsbHlcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1Ub1NlbGVjdCA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtcy5maW5kKGl0ZW0gPT5cbiAgICAgICAgICAgICAgICBpdGVtLnR5cGUgPT09ICdmaWxlJyAmJiBpdGVtLnZhbHVlID09PSBkZWZWYWxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBpZiAoaXRlbVRvU2VsZWN0KSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEV4cGFuZCBwYXJlbnQgZm9sZGVyIGJlZm9yZSBzZWxlY3RpbmcgZmlsZVxuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5leHBhbmRGb2xkZXJGb3JGaWxlKGl0ZW1Ub1NlbGVjdC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNldHRpbmcgc2VsZWN0ZWQgdmFsdWUgd2lsbCB0cmlnZ2VyIG9uQ2hhbmdlIGNhbGxiYWNrIHdoaWNoIGNhbGxzIHVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKVxuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBpdGVtVG9TZWxlY3QudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdyZWZyZXNoJyk7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldCB0ZXh0JywgaXRlbVRvU2VsZWN0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2ZpbGVuYW1lJywgaXRlbVRvU2VsZWN0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBIaWRlIHRoZSBkaW1tZXIgYWZ0ZXIgbG9hZGluZyBvbmx5IGlmIG5vIGZpbGUgaXMgc2VsZWN0ZWRcbiAgICAgICAgICAgICAgICBpZiAoIXN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBIaWRlIHRoZSBkaW1tZXIgYWZ0ZXIgbG9hZGluZyBvbmx5IGlmIG5vIGZpbGUgaXMgc2VsZWN0ZWRcbiAgICAgICAgICAgIGlmICghc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBNYXJrIGluaXRpYWxpemF0aW9uIGFzIGNvbXBsZXRlIHRvIGFsbG93IGhhc2hjaGFuZ2UgaGFuZGxlciB0byB3b3JrXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNJbml0aWFsaXppbmcgPSBmYWxzZTtcbiAgICAgICAgfSwgMjAwKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgY2hhbmdpbmcgdGhlIGxvZyBmaWxlIGluIHRoZSBzZWxlY3QgZHJvcGRvd24uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHNlbGVjdGVkIHZhbHVlLlxuICAgICAqL1xuICAgIGNiT25DaGFuZ2VGaWxlKHZhbHVlKSB7XG4gICAgICAgIGlmICh2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBkcm9wZG93biB0ZXh0IHRvIHNob3cgdGhlIGZ1bGwgZmlsZSBwYXRoXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldCB0ZXh0JywgdmFsdWUpO1xuXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmaWxlbmFtZScsIHZhbHVlKTtcblxuICAgICAgICAvLyBVcGRhdGUgVVJMIGhhc2ggd2l0aCB0aGUgc2VsZWN0ZWQgZmlsZVxuICAgICAgICB3aW5kb3cubG9jYXRpb24uaGFzaCA9ICdmaWxlPScgKyBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpO1xuXG4gICAgICAgIC8vIFJlc2V0IGZpbHRlcnMgb25seSBpZiB1c2VyIG1hbnVhbGx5IGNoYW5nZWQgdGhlIGZpbGUgKG5vdCBkdXJpbmcgaW5pdGlhbGl6YXRpb24pXG4gICAgICAgIGlmICghc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNJbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnJlc2V0RmlsdGVycygpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSGlkZSBhdXRvLXJlZnJlc2ggYnV0dG9uIGZvciByb3RhdGVkIGxvZyBmaWxlcyAodGhleSBkb24ndCBjaGFuZ2UpXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUF1dG9SZWZyZXNoVmlzaWJpbGl0eSh2YWx1ZSk7XG5cbiAgICAgICAgLy8gUmVzZXQgbGFzdCBrbm93biBkYXRhIGVuZCBmb3IgbmV3IGZpbGVcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MubGFzdEtub3duRGF0YUVuZCA9IG51bGw7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGltZSByYW5nZSBpcyBhdmFpbGFibGUgZm9yIHRoaXMgZmlsZVxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jaGVja1RpbWVSYW5nZUF2YWlsYWJpbGl0eSh2YWx1ZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGZpbGUgaXMgYSByb3RhdGVkIGxvZyBmaWxlIChhcmNoaXZlZCwgbm8gbG9uZ2VyIGJlaW5nIHdyaXR0ZW4gdG8pXG4gICAgICogUm90YXRlZCBmaWxlcyBoYXZlIHN1ZmZpeGVzIGxpa2U6IC4wLCAuMSwgLjIsIC5neiwgLjEuZ3osIC4yLmd6LCBldGMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVuYW1lIC0gTG9nIGZpbGUgcGF0aFxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGZpbGUgaXMgcm90YXRlZC9hcmNoaXZlZFxuICAgICAqL1xuICAgIGlzUm90YXRlZExvZ0ZpbGUoZmlsZW5hbWUpIHtcbiAgICAgICAgaWYgKCFmaWxlbmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIC8vIE1hdGNoIHBhdHRlcm5zOiAuMCwgLjEsIC4yLCAuLi4sIC5neiwgLjAuZ3osIC4xLmd6LCBldGMuXG4gICAgICAgIHJldHVybiAvXFwuXFxkKygkfFxcLmd6JCl8XFwuZ3okLy50ZXN0KGZpbGVuYW1lKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGF1dG8tcmVmcmVzaCBidXR0b24gdmlzaWJpbGl0eSBiYXNlZCBvbiBmaWxlIHR5cGVcbiAgICAgKiBIaWRlIGZvciByb3RhdGVkIGZpbGVzLCBzaG93IGZvciBhY3RpdmUgbG9nIGZpbGVzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVuYW1lIC0gTG9nIGZpbGUgcGF0aFxuICAgICAqL1xuICAgIHVwZGF0ZUF1dG9SZWZyZXNoVmlzaWJpbGl0eShmaWxlbmFtZSkge1xuICAgICAgICBjb25zdCAkYXV0b0J0biA9ICQoJyNzaG93LWxhc3QtbG9nLWF1dG8nKTtcbiAgICAgICAgY29uc3QgaXNSb3RhdGVkID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNSb3RhdGVkTG9nRmlsZShmaWxlbmFtZSk7XG5cbiAgICAgICAgaWYgKGlzUm90YXRlZCkge1xuICAgICAgICAgICAgLy8gU3RvcCBhdXRvLXJlZnJlc2ggaWYgaXQgd2FzIGFjdGl2ZVxuICAgICAgICAgICAgaWYgKHN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgICAgICRhdXRvQnRuLmZpbmQoJy5pY29ucyBpLnJlZnJlc2gnKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHVwZGF0ZUxvZ1ZpZXdXb3JrZXIuc3RvcCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJGF1dG9CdG4uaGlkZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJGF1dG9CdG4uc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3cgZmlsdGVyIHR5cGUgcG9wdXAgYmVsb3cgdGhlIGZpbHRlciBpbnB1dC5cbiAgICAgKiBQcmUtc2VsZWN0cyB0aGUgZmlyc3Qgb3B0aW9uIGZvciBpbW1lZGlhdGUga2V5Ym9hcmQgbmF2aWdhdGlvbi5cbiAgICAgKi9cbiAgICBzaG93RmlsdGVyVHlwZVBvcHVwKCkge1xuICAgICAgICBjb25zdCAkcG9wdXAgPSAkKCcjZmlsdGVyLXR5cGUtcG9wdXAnKTtcbiAgICAgICAgJHBvcHVwLnJlbW92ZUNsYXNzKCdoaWRkZW4nKVxuICAgICAgICAgICAgLmNzcyh7dG9wOiAnJywgbGVmdDogJycsIGRpc3BsYXk6ICcnfSlcbiAgICAgICAgICAgIC5zaG93KCk7XG4gICAgICAgIC8vIFByZS1zZWxlY3QgZmlyc3Qgb3B0aW9uIGZvciBrZXlib2FyZCBuYXZpZ2F0aW9uXG4gICAgICAgICRwb3B1cC5maW5kKCcuZmlsdGVyLXR5cGUtb3B0aW9uJykucmVtb3ZlQ2xhc3MoJ2ZvY3VzZWQnKTtcbiAgICAgICAgJHBvcHVwLmZpbmQoJy5maWx0ZXItdHlwZS1vcHRpb24nKS5maXJzdCgpLmFkZENsYXNzKCdmb2N1c2VkJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhpZGUgdGhlIGZpbHRlciB0eXBlIHBvcHVwXG4gICAgICovXG4gICAgaGlkZUZpbHRlclR5cGVQb3B1cCgpIHtcbiAgICAgICAgY29uc3QgJHBvcHVwID0gJCgnI2ZpbHRlci10eXBlLXBvcHVwJyk7XG4gICAgICAgICRwb3B1cC5maW5kKCcuZmlsdGVyLXR5cGUtb3B0aW9uJykucmVtb3ZlQ2xhc3MoJ2ZvY3VzZWQnKTtcbiAgICAgICAgJHBvcHVwLmFkZENsYXNzKCdoaWRkZW4nKS5oaWRlKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIE5hdmlnYXRlIGZpbHRlciB0eXBlIHBvcHVwIG9wdGlvbnMgd2l0aCBhcnJvdyBrZXlzLlxuICAgICAqIFdyYXBzIGFyb3VuZCBhdCBib3VuZGFyaWVzLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBkaXJlY3Rpb24gLSAxIGZvciBkb3duLCAtMSBmb3IgdXBcbiAgICAgKi9cbiAgICBuYXZpZ2F0ZUZpbHRlclBvcHVwKGRpcmVjdGlvbikge1xuICAgICAgICBjb25zdCAkcG9wdXAgPSAkKCcjZmlsdGVyLXR5cGUtcG9wdXAnKTtcbiAgICAgICAgY29uc3QgJG9wdGlvbnMgPSAkcG9wdXAuZmluZCgnLmZpbHRlci10eXBlLW9wdGlvbicpO1xuICAgICAgICBjb25zdCAkZm9jdXNlZCA9ICRvcHRpb25zLmZpbHRlcignLmZvY3VzZWQnKTtcblxuICAgICAgICBsZXQgaW5kZXggPSAkb3B0aW9ucy5pbmRleCgkZm9jdXNlZCk7XG4gICAgICAgIGluZGV4ICs9IGRpcmVjdGlvbjtcblxuICAgICAgICAvLyBXcmFwIGFyb3VuZFxuICAgICAgICBpZiAoaW5kZXggPCAwKSB7XG4gICAgICAgICAgICBpbmRleCA9ICRvcHRpb25zLmxlbmd0aCAtIDE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGluZGV4ID49ICRvcHRpb25zLmxlbmd0aCkge1xuICAgICAgICAgICAgaW5kZXggPSAwO1xuICAgICAgICB9XG5cbiAgICAgICAgJG9wdGlvbnMucmVtb3ZlQ2xhc3MoJ2ZvY3VzZWQnKTtcbiAgICAgICAgJG9wdGlvbnMuZXEoaW5kZXgpLmFkZENsYXNzKCdmb2N1c2VkJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZCBhIGZpbHRlciBjb25kaXRpb24sIHN5bmMgdG8gZm9ybSwgcmVuZGVyIGxhYmVscywgYW5kIHJlbG9hZCBsb2dcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZSAtICdjb250YWlucycgb3IgJ25vdENvbnRhaW5zJ1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIHRoZSBmaWx0ZXIgdGV4dFxuICAgICAqL1xuICAgIGFkZEZpbHRlckNvbmRpdGlvbih0eXBlLCB2YWx1ZSkge1xuICAgICAgICBpZiAoIXZhbHVlIHx8IHZhbHVlLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5maWx0ZXJDb25kaXRpb25zLnB1c2goe3R5cGUsIHZhbHVlOiB2YWx1ZS50cmltKCl9KTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Muc3luY0ZpbHRlckNvbmRpdGlvbnNUb0Zvcm0oKTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MucmVuZGVyRmlsdGVyTGFiZWxzKCk7XG4gICAgICAgICQoJyNmaWx0ZXItaW5wdXQnKS52YWwoJycpO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy51cGRhdGVMb2dGcm9tU2VydmVyKHRydWUpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmUgYSBmaWx0ZXIgY29uZGl0aW9uIGJ5IGluZGV4XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGluZGV4IC0gY29uZGl0aW9uIGluZGV4IHRvIHJlbW92ZVxuICAgICAqL1xuICAgIHJlbW92ZUZpbHRlckNvbmRpdGlvbihpbmRleCkge1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5maWx0ZXJDb25kaXRpb25zLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnN5bmNGaWx0ZXJDb25kaXRpb25zVG9Gb3JtKCk7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnJlbmRlckZpbHRlckxhYmVscygpO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy51cGRhdGVMb2dGcm9tU2VydmVyKHRydWUpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDbGVhciBhbGwgZmlsdGVyIGNvbmRpdGlvbnNcbiAgICAgKi9cbiAgICBjbGVhckFsbEZpbHRlckNvbmRpdGlvbnMoKSB7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmZpbHRlckNvbmRpdGlvbnMgPSBbXTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Muc3luY0ZpbHRlckNvbmRpdGlvbnNUb0Zvcm0oKTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MucmVuZGVyRmlsdGVyTGFiZWxzKCk7XG4gICAgICAgICQoJyNmaWx0ZXItaW5wdXQnKS52YWwoJycpO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy51cGRhdGVMb2dGcm9tU2VydmVyKHRydWUpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXJpYWxpemUgZmlsdGVyQ29uZGl0aW9ucyBhcnJheSBhcyBKU09OIGludG8gaGlkZGVuICNmaWx0ZXIgZmllbGRcbiAgICAgKi9cbiAgICBzeW5jRmlsdGVyQ29uZGl0aW9uc1RvRm9ybSgpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5maWx0ZXJDb25kaXRpb25zLmxlbmd0aCA+IDBcbiAgICAgICAgICAgID8gSlNPTi5zdHJpbmdpZnkoc3lzdGVtRGlhZ25vc3RpY0xvZ3MuZmlsdGVyQ29uZGl0aW9ucylcbiAgICAgICAgICAgIDogJyc7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmaWx0ZXInLCB2YWx1ZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbmRlciBsYWJlbCBjaGlwcyBpbnNpZGUgI2ZpbHRlci1sYWJlbHMgZnJvbSBmaWx0ZXJDb25kaXRpb25zXG4gICAgICovXG4gICAgcmVuZGVyRmlsdGVyTGFiZWxzKCkge1xuICAgICAgICBjb25zdCAkY29udGFpbmVyID0gJCgnI2ZpbHRlci1sYWJlbHMnKTtcbiAgICAgICAgJGNvbnRhaW5lci5lbXB0eSgpO1xuXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmZpbHRlckNvbmRpdGlvbnMuZm9yRWFjaCgoY29uZGl0aW9uLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY3NzQ2xhc3MgPSBjb25kaXRpb24udHlwZSA9PT0gJ25vdENvbnRhaW5zJyA/ICdub3QtY29udGFpbnMnIDogJ2NvbnRhaW5zJztcbiAgICAgICAgICAgIGNvbnN0IGljb25DbGFzcyA9IGNvbmRpdGlvbi50eXBlID09PSAnbm90Q29udGFpbnMnID8gJ2JhbicgOiAnY2hlY2sgY2lyY2xlJztcbiAgICAgICAgICAgIGNvbnN0IGljb25Db2xvciA9IGNvbmRpdGlvbi50eXBlID09PSAnbm90Q29udGFpbnMnID8gJ3JlZCcgOiAndGVhbCc7XG4gICAgICAgICAgICBjb25zdCAkbGFiZWwgPSAkKGA8c3BhbiBjbGFzcz1cImZpbHRlci1jb25kaXRpb24tbGFiZWwgJHtjc3NDbGFzc31cIiBkYXRhLWluZGV4PVwiJHtpbmRleH1cIj48L3NwYW4+YCk7XG4gICAgICAgICAgICAkbGFiZWwuYXBwZW5kKGA8aSBjbGFzcz1cIiR7aWNvbkNsYXNzfSBpY29uICR7aWNvbkNvbG9yfVwiPjwvaT5gKTtcbiAgICAgICAgICAgICRsYWJlbC5hcHBlbmQoYDxzcGFuPiR7JCgnPHNwYW4+JykudGV4dChjb25kaXRpb24udmFsdWUpLmh0bWwoKX08L3NwYW4+YCk7XG4gICAgICAgICAgICAkbGFiZWwuYXBwZW5kKCc8aSBjbGFzcz1cImRlbGV0ZSBpY29uXCI+PC9pPicpO1xuICAgICAgICAgICAgJGNvbnRhaW5lci5hcHBlbmQoJGxhYmVsKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZmlsdGVyIGNvbmRpdGlvbnMgZnJvbSBVUkwgcGFyYW1ldGVyIG9yIGV4aXN0aW5nIGhpZGRlbiBmaWVsZCB2YWx1ZS5cbiAgICAgKiBIYW5kbGVzIGxlZ2FjeSBwbGFpbi1zdHJpbmcgZm9ybWF0IChlLmcuIFwiW0MtMDAwMDQ3MjFdJltDLTAwMDA0NzIzXVwiIGZyb20gQ0RSIGxpbmtzKVxuICAgICAqIGJ5IGNvbnZlcnRpbmcgJi1zZXBhcmF0ZWQgcGFydHMgaW50byBpbmRpdmlkdWFsIFwiY29udGFpbnNcIiBjb25kaXRpb25zLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVGaWx0ZXJGcm9tVXJsKCkge1xuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICBjb25zdCBmaWx0ZXJQYXJhbSA9IHVybFBhcmFtcy5nZXQoJ2ZpbHRlcicpO1xuXG4gICAgICAgIGlmIChmaWx0ZXJQYXJhbSAmJiBmaWx0ZXJQYXJhbS50cmltKCkgIT09ICcnKSB7XG4gICAgICAgICAgICBjb25zdCB0cmltbWVkID0gZmlsdGVyUGFyYW0udHJpbSgpO1xuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiBpdCdzIEpTT04gZm9ybWF0XG4gICAgICAgICAgICBpZiAodHJpbW1lZC5zdGFydHNXaXRoKCdbJykpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKHRyaW1tZWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShwYXJzZWQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5maWx0ZXJDb25kaXRpb25zID0gcGFyc2VkLmZpbHRlcihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoYykgPT4gYyAmJiBjLnZhbHVlICYmIGMudHlwZVxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSW52YWxpZCBKU09OLCB0cmVhdCBhcyBsZWdhY3lcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuZmlsdGVyQ29uZGl0aW9ucyA9IHRyaW1tZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zcGxpdCgnJicpXG4gICAgICAgICAgICAgICAgICAgICAgICAubWFwKChwKSA9PiBwLnRyaW0oKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoKHApID0+IHAgIT09ICcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLm1hcCgocCkgPT4gKHt0eXBlOiAnY29udGFpbnMnLCB2YWx1ZTogcH0pKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIExlZ2FjeSBwbGFpbiBzdHJpbmc6IHNwbGl0IGJ5ICYgaW50byBjb250YWlucyBjb25kaXRpb25zXG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuZmlsdGVyQ29uZGl0aW9ucyA9IHRyaW1tZWRcbiAgICAgICAgICAgICAgICAgICAgLnNwbGl0KCcmJylcbiAgICAgICAgICAgICAgICAgICAgLm1hcCgocCkgPT4gcC50cmltKCkpXG4gICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoKHApID0+IHAgIT09ICcnKVxuICAgICAgICAgICAgICAgICAgICAubWFwKChwKSA9PiAoe3R5cGU6ICdjb250YWlucycsIHZhbHVlOiBwfSkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5zeW5jRmlsdGVyQ29uZGl0aW9uc1RvRm9ybSgpO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MucmVuZGVyRmlsdGVyTGFiZWxzKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVzZXQgYWxsIGZpbHRlcnMgd2hlbiBjaGFuZ2luZyBsb2cgZmlsZXNcbiAgICAgKi9cbiAgICByZXNldEZpbHRlcnMoKSB7XG4gICAgICAgIC8vIERlYWN0aXZhdGUgYWxsIHF1aWNrLXBlcmlvZCBidXR0b25zXG4gICAgICAgICQoJy5wZXJpb2QtYnRuJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuXG4gICAgICAgIC8vIFJlc2V0IGxvZ0xldmVsIGRyb3Bkb3duIHRvIGRlZmF1bHQgKEFsbCBMZXZlbHMgLSBlbXB0eSB2YWx1ZSlcbiAgICAgICAgJCgnI2xvZ0xldmVsLWRyb3Bkb3duJykuZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsICcnKTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2xvZ0xldmVsJywgJycpO1xuXG4gICAgICAgIC8vIE5PVEU6IEZpbHRlciBjb25kaXRpb25zIGFyZSBpbnRlbnRpb25hbGx5IHByZXNlcnZlZCB3aGVuIGNoYW5naW5nIGZpbGVzLlxuICAgICAgICAvLyBXaGVuIHVzZXIgbmF2aWdhdGVzIGZyb20gQ0RSIHdpdGggZmlsdGVyIHBhcmFtcyAoZS5nLiA/ZmlsdGVyPVtDLTAwMDA0NzIxXSksXG4gICAgICAgIC8vIHRoZSBmaWx0ZXJzIHNob3VsZCBwZXJzaXN0IGFjcm9zcyBmaWxlIGNoYW5nZXMgKHZlcmJvc2Ug4oaSIHZlcmJvc2UuMCkuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwZXJpb2QgYnV0dG9ucyB2aXNpYmlsaXR5IGJhc2VkIG9uIGxvZyBmaWxlIGR1cmF0aW9uXG4gICAgICogU2hvd3Mgb25seSBidXR0b25zIGZvciBwZXJpb2RzIHRoYXQgYXJlIDw9IGxvZyBmaWxlIGR1cmF0aW9uXG4gICAgICogSGlkZXMgZW50aXJlIGNvbnRhaW5lciBpZiBubyBidXR0b25zIGFyZSB2aXNpYmxlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGxvZ0R1cmF0aW9uIC0gTG9nIGZpbGUgZHVyYXRpb24gaW4gc2Vjb25kc1xuICAgICAqL1xuICAgIHVwZGF0ZVBlcmlvZEJ1dHRvbnNWaXNpYmlsaXR5KGxvZ0R1cmF0aW9uKSB7XG4gICAgICAgIGNvbnN0ICRwZXJpb2RCdXR0b25zID0gJCgnLnBlcmlvZC1idG4nKTtcbiAgICAgICAgY29uc3QgJHBlcmlvZENvbnRhaW5lciA9ICQoJyNwZXJpb2QtYnV0dG9ucycpO1xuICAgICAgICBsZXQgbGFyZ2VzdFZpc2libGVQZXJpb2QgPSAwO1xuICAgICAgICBsZXQgJGxhcmdlc3RWaXNpYmxlQnV0dG9uID0gbnVsbDtcbiAgICAgICAgbGV0IHZpc2libGVDb3VudCA9IDA7XG5cbiAgICAgICAgJHBlcmlvZEJ1dHRvbnMuZWFjaCgoaW5kZXgsIGJ1dHRvbikgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQoYnV0dG9uKTtcbiAgICAgICAgICAgIGNvbnN0IHBlcmlvZCA9IHBhcnNlSW50KCRidXR0b24uZGF0YSgncGVyaW9kJyksIDEwKTtcblxuICAgICAgICAgICAgLy8gU2hvdyBidXR0b24gaWYgcGVyaW9kIGlzIGxlc3MgdGhhbiBvciBlcXVhbCB0byBsb2cgZHVyYXRpb25cbiAgICAgICAgICAgIC8vIEFkZCAxMCUgdG9sZXJhbmNlIGZvciByb3VuZGluZy9lZGdlIGNhc2VzXG4gICAgICAgICAgICBpZiAocGVyaW9kIDw9IGxvZ0R1cmF0aW9uICogMS4xKSB7XG4gICAgICAgICAgICAgICAgJGJ1dHRvbi5zaG93KCk7XG4gICAgICAgICAgICAgICAgdmlzaWJsZUNvdW50Kys7XG4gICAgICAgICAgICAgICAgLy8gVHJhY2sgdGhlIGxhcmdlc3QgdmlzaWJsZSBwZXJpb2QgZm9yIGRlZmF1bHQgc2VsZWN0aW9uXG4gICAgICAgICAgICAgICAgaWYgKHBlcmlvZCA+IGxhcmdlc3RWaXNpYmxlUGVyaW9kKSB7XG4gICAgICAgICAgICAgICAgICAgIGxhcmdlc3RWaXNpYmxlUGVyaW9kID0gcGVyaW9kO1xuICAgICAgICAgICAgICAgICAgICAkbGFyZ2VzdFZpc2libGVCdXR0b24gPSAkYnV0dG9uO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJGJ1dHRvbi5oaWRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhpZGUgZW50aXJlIGNvbnRhaW5lciBpZiBubyBidXR0b25zIGFyZSB2aXNpYmxlXG4gICAgICAgIC8vIEFsc28gdG9nZ2xlIGNsYXNzIG9uIHBhcmVudCB0byByZW1vdmUgZ2FwIGZvciBwcm9wZXIgYWxpZ25tZW50XG4gICAgICAgIGNvbnN0ICR0aW1lQ29udHJvbHNJbmxpbmUgPSAkKCcudGltZS1jb250cm9scy1pbmxpbmUnKTtcbiAgICAgICAgaWYgKHZpc2libGVDb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgJHBlcmlvZENvbnRhaW5lci5oaWRlKCk7XG4gICAgICAgICAgICAkdGltZUNvbnRyb2xzSW5saW5lLmFkZENsYXNzKCduby1wZXJpb2QtYnV0dG9ucycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJHBlcmlvZENvbnRhaW5lci5zaG93KCk7XG4gICAgICAgICAgICAkdGltZUNvbnRyb2xzSW5saW5lLnJlbW92ZUNsYXNzKCduby1wZXJpb2QtYnV0dG9ucycpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0IGxhcmdlc3QgdmlzaWJsZSBidXR0b24gYXMgYWN0aXZlIChpZiBubyBidXR0b24gaXMgY3VycmVudGx5IGFjdGl2ZSlcbiAgICAgICAgaWYgKCRsYXJnZXN0VmlzaWJsZUJ1dHRvbiAmJiAhJHBlcmlvZEJ1dHRvbnMuZmlsdGVyKCcuYWN0aXZlJykuaXMoJzp2aXNpYmxlJykpIHtcbiAgICAgICAgICAgICRwZXJpb2RCdXR0b25zLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgICRsYXJnZXN0VmlzaWJsZUJ1dHRvbi5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgdGltZSByYW5nZSBpcyBhdmFpbGFibGUgZm9yIHRoZSBzZWxlY3RlZCBsb2cgZmlsZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlbmFtZSAtIExvZyBmaWxlIHBhdGhcbiAgICAgKi9cbiAgICBjaGVja1RpbWVSYW5nZUF2YWlsYWJpbGl0eShmaWxlbmFtZSkge1xuICAgICAgICAvLyBTaG93IGRpbW1lciBvbmx5IGlmIG5vdCBpbiBhdXRvLXVwZGF0ZSBtb2RlXG4gICAgICAgIGlmICghc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlKSB7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBUcnkgdG8gZ2V0IHRpbWUgcmFuZ2UgZm9yIHRoaXMgZmlsZVxuICAgICAgICAgICAgU3lzbG9nQVBJLmdldExvZ1RpbWVSYW5nZShmaWxlbmFtZSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEudGltZV9yYW5nZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBUaW1lIHJhbmdlIGlzIGF2YWlsYWJsZSAtIHVzZSB0aW1lLWJhc2VkIG5hdmlnYXRpb25cbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaW5pdGlhbGl6ZU5hdmlnYXRpb24ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVGltZSByYW5nZSBub3QgYXZhaWxhYmxlIC0gdXNlIGxpbmUgbnVtYmVyIGZhbGxiYWNrXG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmluaXRpYWxpemVOYXZpZ2F0aW9uKG51bGwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgY2hlY2tpbmcgdGltZSByYW5nZTonLCBlcnJvcik7XG4gICAgICAgICAgICAvLyBGYWxsYmFjayB0byBsaW5lIG51bWJlciBtb2RlXG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pbml0aWFsaXplTmF2aWdhdGlvbihudWxsKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHVuaXZlcnNhbCBuYXZpZ2F0aW9uIHdpdGggdGltZSBvciBsaW5lIG51bWJlciBtb2RlXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHRpbWVSYW5nZURhdGEgLSBUaW1lIHJhbmdlIGRhdGEgZnJvbSBBUEkgKG9wdGlvbmFsKVxuICAgICAqL1xuICAgIGluaXRpYWxpemVOYXZpZ2F0aW9uKHRpbWVSYW5nZURhdGEpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgd2UgaGF2ZSB2YWxpZCB0aW1lIHJhbmdlIHdpdGggYWN0dWFsIHRpbWVzdGFtcHMgKG5vdCBudWxsKVxuICAgICAgICBjb25zdCBoYXNWYWxpZFRpbWVSYW5nZSA9IHRpbWVSYW5nZURhdGEgJiZcbiAgICAgICAgICAgIHRpbWVSYW5nZURhdGEudGltZV9yYW5nZSAmJlxuICAgICAgICAgICAgdHlwZW9mIHRpbWVSYW5nZURhdGEudGltZV9yYW5nZS5zdGFydCA9PT0gJ251bWJlcicgJiZcbiAgICAgICAgICAgIHR5cGVvZiB0aW1lUmFuZ2VEYXRhLnRpbWVfcmFuZ2UuZW5kID09PSAnbnVtYmVyJztcblxuICAgICAgICAvLyBDaGVjayBpZiB0aW1lIHJhbmdlIGlzIG1lYW5pbmdmdWwgKG1vcmUgdGhhbiAxIHNlY29uZCBvZiBkYXRhKVxuICAgICAgICBjb25zdCBoYXNNdWx0aXBsZVRpbWVzdGFtcHMgPSBoYXNWYWxpZFRpbWVSYW5nZSAmJlxuICAgICAgICAgICAgKHRpbWVSYW5nZURhdGEudGltZV9yYW5nZS5lbmQgLSB0aW1lUmFuZ2VEYXRhLnRpbWVfcmFuZ2Uuc3RhcnQpID4gMTtcblxuICAgICAgICBpZiAoaGFzVmFsaWRUaW1lUmFuZ2UgJiYgaGFzTXVsdGlwbGVUaW1lc3RhbXBzKSB7XG4gICAgICAgICAgICAvLyBUaW1lLWJhc2VkIG1vZGVcbiAgICAgICAgICAgIHRoaXMudGltZVNsaWRlckVuYWJsZWQgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VGltZVJhbmdlID0gdGltZVJhbmdlRGF0YS50aW1lX3JhbmdlO1xuXG4gICAgICAgICAgICAvLyBDYWxjdWxhdGUgbG9nIGZpbGUgZHVyYXRpb24gYW5kIHVwZGF0ZSBwZXJpb2QgYnV0dG9ucyB2aXNpYmlsaXR5XG4gICAgICAgICAgICBjb25zdCBsb2dEdXJhdGlvbiA9IHRoaXMuY3VycmVudFRpbWVSYW5nZS5lbmQgLSB0aGlzLmN1cnJlbnRUaW1lUmFuZ2Uuc3RhcnQ7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVBlcmlvZEJ1dHRvbnNWaXNpYmlsaXR5KGxvZ0R1cmF0aW9uKTtcblxuICAgICAgICAgICAgLy8gU2hvdyBwZXJpb2QgYnV0dG9ucyBmb3IgdGltZS1iYXNlZCBuYXZpZ2F0aW9uXG4gICAgICAgICAgICAkKCcjcGVyaW9kLWJ1dHRvbnMnKS5zaG93KCk7XG5cbiAgICAgICAgICAgIC8vIFNldCBzZXJ2ZXIgdGltZXpvbmUgb2Zmc2V0XG4gICAgICAgICAgICBpZiAodGltZVJhbmdlRGF0YS5zZXJ2ZXJfdGltZXpvbmVfb2Zmc2V0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBTVkdUaW1lbGluZS5zZXJ2ZXJUaW1lem9uZU9mZnNldCA9IHRpbWVSYW5nZURhdGEuc2VydmVyX3RpbWV6b25lX29mZnNldDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBTVkcgdGltZWxpbmUgd2l0aCB0aW1lIHJhbmdlXG4gICAgICAgICAgICBTVkdUaW1lbGluZS5pbml0aWFsaXplKCcjdGltZS1zbGlkZXItY29udGFpbmVyJywgdGhpcy5jdXJyZW50VGltZVJhbmdlKTtcblxuICAgICAgICAgICAgLy8gU2V0IGNhbGxiYWNrIGZvciB0aW1lIHdpbmRvdyBjaGFuZ2VzXG4gICAgICAgICAgICAvLyBBbHdheXMgdXNlIGxhdGVzdD10cnVlIHNvIHRoZSBtb3N0IHJlY2VudCBsb2cgZW50cmllcyBhcmUgZGlzcGxheWVkXG4gICAgICAgICAgICAvLyBUcnVuY2F0aW9uIChpZiBhbnkpIGhhcHBlbnMgb24gdGhlIGxlZnQgc2lkZSwgd2hpY2ggaXMgbGVzcyBkaXNydXB0aXZlXG4gICAgICAgICAgICBTVkdUaW1lbGluZS5vblJhbmdlQ2hhbmdlID0gKHN0YXJ0LCBlbmQsIGRyYWdnZWRIYW5kbGUpID0+IHtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2FkTG9nQnlUaW1lUmFuZ2Uoc3RhcnQsIGVuZCwgdHJ1ZSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBTZXQgY2FsbGJhY2sgZm9yIHRydW5jYXRlZCB6b25lIGNsaWNrc1xuICAgICAgICAgICAgLy8gTGVmdCB6b25lcyAodGltZWxpbmUtdHJ1bmNhdGVkLWxlZnQpOiBkYXRhIHdhcyBjdXQgZnJvbSBiZWdpbm5pbmcsIGxvYWQgd2l0aCBsYXRlc3Q9dHJ1ZVxuICAgICAgICAgICAgLy8gUmlnaHQgem9uZXMgKHRpbWVsaW5lLXRydW5jYXRlZC1yaWdodCk6IGRhdGEgd2FzIGN1dCBmcm9tIGVuZCwgbG9hZCB3aXRoIGxhdGVzdD1mYWxzZVxuICAgICAgICAgICAgU1ZHVGltZWxpbmUub25UcnVuY2F0ZWRab25lQ2xpY2sgPSAoc3RhcnQsIGVuZCwgaXNMZWZ0Wm9uZSkgPT4ge1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmxvYWRMb2dCeVRpbWVSYW5nZShzdGFydCwgZW5kLCBpc0xlZnRab25lKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIExvYWQgaW5pdGlhbCBjaHVuayB3aXRoIGxhdGVzdD10cnVlIHRvIHNob3cgbmV3ZXN0IGVudHJpZXNcbiAgICAgICAgICAgIC8vIFBhc3MgaXNJbml0aWFsTG9hZD10cnVlIHRvIHN1cHByZXNzIHRydW5jYXRlZCB6b25lIGRpc3BsYXkgb24gZmlyc3QgbG9hZFxuICAgICAgICAgICAgLy8gVXNlIHRoZSBsYXJnZXN0IHZpc2libGUgcGVyaW9kIGJ1dHRvbiBvciAxIGhvdXIgYXMgZmFsbGJhY2tcbiAgICAgICAgICAgIGNvbnN0ICRhY3RpdmVCdXR0b24gPSAkKCcucGVyaW9kLWJ0bi5hY3RpdmU6dmlzaWJsZScpO1xuICAgICAgICAgICAgY29uc3QgaW5pdGlhbFBlcmlvZCA9ICRhY3RpdmVCdXR0b24ubGVuZ3RoID4gMFxuICAgICAgICAgICAgICAgID8gcGFyc2VJbnQoJGFjdGl2ZUJ1dHRvbi5kYXRhKCdwZXJpb2QnKSwgMTApXG4gICAgICAgICAgICAgICAgOiBNYXRoLm1pbigzNjAwLCBsb2dEdXJhdGlvbik7XG4gICAgICAgICAgICBjb25zdCBpbml0aWFsU3RhcnQgPSBNYXRoLm1heCh0aGlzLmN1cnJlbnRUaW1lUmFuZ2UuZW5kIC0gaW5pdGlhbFBlcmlvZCwgdGhpcy5jdXJyZW50VGltZVJhbmdlLnN0YXJ0KTtcbiAgICAgICAgICAgIHRoaXMubG9hZExvZ0J5VGltZVJhbmdlKGluaXRpYWxTdGFydCwgdGhpcy5jdXJyZW50VGltZVJhbmdlLmVuZCwgdHJ1ZSwgdHJ1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBMaW5lIG51bWJlciBmYWxsYmFjayBtb2RlXG4gICAgICAgICAgICB0aGlzLnRpbWVTbGlkZXJFbmFibGVkID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRUaW1lUmFuZ2UgPSBudWxsO1xuXG4gICAgICAgICAgICAvLyBIaWRlIHBlcmlvZCBidXR0b25zIGluIGxpbmUgbnVtYmVyIG1vZGVcbiAgICAgICAgICAgICQoJyNwZXJpb2QtYnV0dG9ucycpLmhpZGUoKTtcblxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBTVkcgdGltZWxpbmUgd2l0aCBsaW5lIG51bWJlcnNcbiAgICAgICAgICAgIC8vIEZvciBub3csIHVzZSBkZWZhdWx0IHJhbmdlIHVudGlsIHdlIGdldCB0b3RhbCBsaW5lIGNvdW50XG4gICAgICAgICAgICBjb25zdCBsaW5lUmFuZ2UgPSB7IHN0YXJ0OiAwLCBlbmQ6IDEwMDAwIH07XG4gICAgICAgICAgICBTVkdUaW1lbGluZS5pbml0aWFsaXplKCcjdGltZS1zbGlkZXItY29udGFpbmVyJywgbGluZVJhbmdlLCAnbGluZXMnKTtcblxuICAgICAgICAgICAgLy8gU2V0IGNhbGxiYWNrIGZvciBsaW5lIHJhbmdlIGNoYW5nZXNcbiAgICAgICAgICAgIFNWR1RpbWVsaW5lLm9uUmFuZ2VDaGFuZ2UgPSAoc3RhcnQsIGVuZCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIExvYWQgYnkgbGluZSBudW1iZXJzIChvZmZzZXQvbGluZXMpXG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9hZExvZ0J5TGluZXMoTWF0aC5mbG9vcihzdGFydCksIE1hdGguY2VpbChlbmQgLSBzdGFydCkpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gTG9hZCBpbml0aWFsIGxpbmVzXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGxvZyBieSBsaW5lIG51bWJlcnMgKGZvciBmaWxlcyB3aXRob3V0IHRpbWVzdGFtcHMpXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IG9mZnNldCAtIFN0YXJ0aW5nIGxpbmUgbnVtYmVyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGxpbmVzIC0gTnVtYmVyIG9mIGxpbmVzIHRvIGxvYWRcbiAgICAgKi9cbiAgICBsb2FkTG9nQnlMaW5lcyhvZmZzZXQsIGxpbmVzKSB7XG4gICAgICAgIC8vIFNob3cgZGltbWVyIG9ubHkgaWYgbm90IGluIGF1dG8tdXBkYXRlIG1vZGVcbiAgICAgICAgaWYgKCFzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUpIHtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcGFyYW1zID0ge1xuICAgICAgICAgICAgZmlsZW5hbWU6IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2ZpbGVuYW1lJyksXG4gICAgICAgICAgICBmaWx0ZXI6IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2ZpbHRlcicpIHx8ICcnLFxuICAgICAgICAgICAgbG9nTGV2ZWw6IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2xvZ0xldmVsJykgfHwgJycsXG4gICAgICAgICAgICBvZmZzZXQ6IE1hdGgubWF4KDAsIG9mZnNldCksXG4gICAgICAgICAgICBsaW5lczogTWF0aC5taW4oNTAwMCwgTWF0aC5tYXgoMTAwLCBsaW5lcykpXG4gICAgICAgIH07XG5cbiAgICAgICAgU3lzbG9nQVBJLmdldExvZ0Zyb21GaWxlKHBhcmFtcywgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAvLyBIaWRlIGRpbW1lciBvbmx5IGlmIG5vdCBpbiBhdXRvLXVwZGF0ZSBtb2RlXG4gICAgICAgICAgICBpZiAoIXN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhICYmICdjb250ZW50JyBpbiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgLy8gU2V0IGNvbnRlbnQgaW4gZWRpdG9yIChldmVuIGlmIGVtcHR5KVxuICAgICAgICAgICAgICAgIHRoaXMudmlld2VyLnNldFZhbHVlKHJlc3BvbnNlLmRhdGEuY29udGVudCB8fCAnJywgLTEpO1xuXG4gICAgICAgICAgICAgICAgLy8gR28gdG8gdGhlIGJlZ2lubmluZ1xuICAgICAgICAgICAgICAgIHRoaXMudmlld2VyLmdvdG9MaW5lKDEpO1xuICAgICAgICAgICAgICAgIHRoaXMudmlld2VyLnNjcm9sbFRvTGluZSgwLCB0cnVlLCB0cnVlLCAoKSA9PiB7fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGxvZyBieSB0aW1lIHJhbmdlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHN0YXJ0VGltZXN0YW1wIC0gU3RhcnQgdGltZXN0YW1wXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGVuZFRpbWVzdGFtcCAtIEVuZCB0aW1lc3RhbXBcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGxhdGVzdCAtIElmIHRydWUsIHJldHVybiBuZXdlc3QgbGluZXMgZmlyc3QgKGZvciBpbml0aWFsIGxvYWQpXG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc0luaXRpYWxMb2FkIC0gSWYgdHJ1ZSwgc3VwcHJlc3MgdHJ1bmNhdGVkIHpvbmUgZGlzcGxheVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNBdXRvVXBkYXRlIC0gSWYgdHJ1ZSwgc2tpcCB0aW1lbGluZSByZWNhbGN1bGF0aW9uIChvbmx5IHVwZGF0ZSBjb250ZW50KVxuICAgICAqL1xuICAgIGxvYWRMb2dCeVRpbWVSYW5nZShzdGFydFRpbWVzdGFtcCwgZW5kVGltZXN0YW1wLCBsYXRlc3QgPSBmYWxzZSwgaXNJbml0aWFsTG9hZCA9IGZhbHNlLCBpc0F1dG9VcGRhdGUgPSBmYWxzZSkge1xuICAgICAgICAvLyBTaG93IGRpbW1lciBvbmx5IGlmIG5vdCBpbiBhdXRvLXVwZGF0ZSBtb2RlXG4gICAgICAgIGlmICghc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlKSB7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IHtcbiAgICAgICAgICAgIGZpbGVuYW1lOiB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmaWxlbmFtZScpLFxuICAgICAgICAgICAgZmlsdGVyOiB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmaWx0ZXInKSB8fCAnJyxcbiAgICAgICAgICAgIGxvZ0xldmVsOiB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdsb2dMZXZlbCcpIHx8ICcnLFxuICAgICAgICAgICAgZGF0ZUZyb206IHN0YXJ0VGltZXN0YW1wLFxuICAgICAgICAgICAgZGF0ZVRvOiBlbmRUaW1lc3RhbXAsXG4gICAgICAgICAgICBsaW5lczogNTAwMCwgLy8gTWF4aW11bSBsaW5lcyB0byBsb2FkXG4gICAgICAgICAgICBsYXRlc3Q6IGxhdGVzdCAvLyBJZiB0cnVlLCByZXR1cm4gbmV3ZXN0IGxpbmVzICh0YWlsIHwgdGFjKVxuICAgICAgICB9O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBTeXNsb2dBUEkuZ2V0TG9nRnJvbUZpbGUocGFyYW1zLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEgJiYgJ2NvbnRlbnQnIGluIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3Q29udGVudCA9IHJlc3BvbnNlLmRhdGEuY29udGVudCB8fCAnJztcblxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNBdXRvVXBkYXRlICYmIG5ld0NvbnRlbnQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQXV0by11cGRhdGUgbW9kZTogYXBwZW5kIG9ubHkgbmV3IGxpbmVzXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50Q29udGVudCA9IHRoaXMudmlld2VyLmdldFZhbHVlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdMaW5lcyA9IHRoaXMuZmluZE5ld0xpbmVzKGN1cnJlbnRDb250ZW50LCBuZXdDb250ZW50KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5ld0xpbmVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBcHBlbmQgbmV3IGxpbmVzIGF0IHRoZSBlbmRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZXNzaW9uID0gdGhpcy52aWV3ZXIuc2Vzc2lvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBsYXN0Um93ID0gc2Vzc2lvbi5nZXRMZW5ndGgoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXNzaW9uLmluc2VydCh7IHJvdzogbGFzdFJvdywgY29sdW1uOiAwIH0sICdcXG4nICsgbmV3TGluZXMuam9pbignXFxuJykpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gR28gdG8gdGhlIGxhc3QgbGluZSB0byBmb2xsb3cgbmV3IGVudHJpZXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaW5hbFJvdyA9IHNlc3Npb24uZ2V0TGVuZ3RoKCkgLSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbmFsQ29sdW1uID0gc2Vzc2lvbi5nZXRMaW5lKGZpbmFsUm93KS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy52aWV3ZXIuZ290b0xpbmUoZmluYWxSb3cgKyAxLCBmaW5hbENvbHVtbik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBOb3JtYWwgbW9kZTogc2V0IGNvbnRlbnQgYW5kIGdvIHRvIGVuZFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy52aWV3ZXIuc2V0VmFsdWUobmV3Q29udGVudCwgLTEpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBHbyB0byB0aGUgZW5kIG9mIHRoZSBsb2dcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJvdyA9IHRoaXMudmlld2VyLnNlc3Npb24uZ2V0TGVuZ3RoKCkgLSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29sdW1uID0gdGhpcy52aWV3ZXIuc2Vzc2lvbi5nZXRMaW5lKHJvdykubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy52aWV3ZXIuZ290b0xpbmUocm93ICsgMSwgY29sdW1uKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIEFkanVzdCBzbGlkZXIgdG8gYWN0dWFsIGxvYWRlZCB0aW1lIHJhbmdlIChzaWxlbnRseSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEuYWN0dWFsX3JhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhY3R1YWwgPSByZXNwb25zZS5kYXRhLmFjdHVhbF9yYW5nZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQWx3YXlzIHVwZGF0ZSBmdWxsUmFuZ2UgYm91bmRhcnkgYmFzZWQgb24gYWN0dWFsIGRhdGEgZnJvbSBzZXJ2ZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgZW5zdXJlcyBuby1kYXRhIHpvbmVzIGRpc3BsYXkgY29ycmVjdGx5IGFmdGVyIHJlZnJlc2hcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3R1YWwuZW5kKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgU1ZHVGltZWxpbmUudXBkYXRlRGF0YUJvdW5kYXJ5KGFjdHVhbC5lbmQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRyYWNrIGxhc3Qga25vd24gZGF0YSBlbmQgZm9yIHJlZnJlc2ggYW5jaG9yaW5nXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MubGFzdEtub3duRGF0YUVuZCA9IGFjdHVhbC5lbmQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFsd2F5cyB1cGRhdGUgdGltZWxpbmUgd2l0aCBzZXJ2ZXIgcmVzcG9uc2UgKGV4Y2VwdCBkdXJpbmcgYXV0by11cGRhdGUpXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB1cGRhdGVGcm9tU2VydmVyUmVzcG9uc2UoKSBoYW5kbGVzOlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gLSBVcGRhdGluZyBzZWxlY3RlZFJhbmdlIHRvIGFjdHVhbCBkYXRhIGJvdW5kYXJpZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIC0gUHJlc2VydmluZyB2aXNpYmxlUmFuZ2UuZW5kIGlmIGl0IHdhcyBleHRlbmRlZCB0byBjdXJyZW50IHRpbWUgKGZvciBuby1kYXRhIHpvbmVzKVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gLSBNYW5hZ2luZyB0cnVuY2F0aW9uIHpvbmVzIGRpc3BsYXlcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXNBdXRvVXBkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgU1ZHVGltZWxpbmUudXBkYXRlRnJvbVNlcnZlclJlc3BvbnNlKGFjdHVhbCwgc3RhcnRUaW1lc3RhbXAsIGVuZFRpbWVzdGFtcCwgaXNJbml0aWFsTG9hZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBIaWRlIGRpbW1lciBvbmx5IGlmIG5vdCBpbiBhdXRvLXVwZGF0ZSBtb2RlXG4gICAgICAgICAgICAgICAgaWYgKCFzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBsb2FkaW5nIGxvZyBieSB0aW1lIHJhbmdlOicsIGVycm9yKTtcbiAgICAgICAgICAgIC8vIEhpZGUgZGltbWVyIG9ubHkgaWYgbm90IGluIGF1dG8tdXBkYXRlIG1vZGVcbiAgICAgICAgICAgIGlmICghc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXBwbHkgcXVpY2sgcGVyaW9kIHNlbGVjdGlvbiAoWWFuZGV4IENsb3VkIExvZ1ZpZXdlciBzdHlsZSlcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcGVyaW9kU2Vjb25kcyAtIFBlcmlvZCBpbiBzZWNvbmRzXG4gICAgICovXG4gICAgYXBwbHlRdWlja1BlcmlvZChwZXJpb2RTZWNvbmRzKSB7XG4gICAgICAgIGlmICghdGhpcy5jdXJyZW50VGltZVJhbmdlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2UgbmV3IGFwcGx5UGVyaW9kIG1ldGhvZCB0aGF0IGhhbmRsZXMgdmlzaWJsZSByYW5nZSBhbmQgYXV0by1jZW50ZXJpbmdcbiAgICAgICAgU1ZHVGltZWxpbmUuYXBwbHlQZXJpb2QocGVyaW9kU2Vjb25kcyk7XG4gICAgICAgIC8vIENhbGxiYWNrIHdpbGwgYmUgdHJpZ2dlcmVkIGF1dG9tYXRpY2FsbHkgYnkgU1ZHVGltZWxpbmVcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXBwbHkgbG9nIGxldmVsIGZpbHRlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBsZXZlbCAtIExvZyBsZXZlbCAoYWxsLCBlcnJvciwgd2FybmluZywgaW5mbywgZGVidWcpXG4gICAgICovXG4gICAgYXBwbHlMb2dMZXZlbEZpbHRlcihsZXZlbCkge1xuICAgICAgICBsZXQgZmlsdGVyUGF0dGVybiA9ICcnO1xuXG4gICAgICAgIC8vIENyZWF0ZSByZWdleCBwYXR0ZXJuIGJhc2VkIG9uIGxldmVsXG4gICAgICAgIHN3aXRjaCAobGV2ZWwpIHtcbiAgICAgICAgICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgICAgICAgICAgICBmaWx0ZXJQYXR0ZXJuID0gJ0VSUk9SfENSSVRJQ0FMfEZBVEFMJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3dhcm5pbmcnOlxuICAgICAgICAgICAgICAgIGZpbHRlclBhdHRlcm4gPSAnV0FSTklOR3xXQVJOJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2luZm8nOlxuICAgICAgICAgICAgICAgIGZpbHRlclBhdHRlcm4gPSAnSU5GTyc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdkZWJ1Zyc6XG4gICAgICAgICAgICAgICAgZmlsdGVyUGF0dGVybiA9ICdERUJVRyc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdhbGwnOlxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBmaWx0ZXJQYXR0ZXJuID0gJyc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgZmlsdGVyIGZpZWxkXG4gICAgICAgIHRoaXMuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2ZpbHRlcicsIGZpbHRlclBhdHRlcm4pO1xuXG4gICAgICAgIC8vIFJlbG9hZCBsb2dzIHdpdGggbmV3IGZpbHRlclxuICAgICAgICB0aGlzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRmV0Y2hlcyB0aGUgbG9nIGZpbGUgY29udGVudCBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBwcmVzZXJ2ZVJhbmdlIC0gSWYgdHJ1ZSwgdXNlIGN1cnJlbnQgU1ZHIHRpbWVsaW5lIHNlbGVjdGlvbiBpbnN0ZWFkIG9mXG4gICAgICogICByZWNhbGN1bGF0aW5nIHRvIFwibGFzdCAxIGhvdXJcIi4gVXNlZCB3aGVuIGZpbHRlci9sZXZlbCBjaGFuZ2VzIHRvIGtlZXAgdGhlIHNhbWUgdmlldy5cbiAgICAgKi9cbiAgICB1cGRhdGVMb2dGcm9tU2VydmVyKHByZXNlcnZlUmFuZ2UgPSBmYWxzZSkge1xuICAgICAgICBpZiAodGhpcy50aW1lU2xpZGVyRW5hYmxlZCkge1xuICAgICAgICAgICAgLy8gSW4gdGltZSBzbGlkZXIgbW9kZSwgcmVsb2FkIGN1cnJlbnQgd2luZG93XG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50VGltZVJhbmdlKSB7XG5cbiAgICAgICAgICAgICAgICAvLyBXaGVuIHByZXNlcnZlUmFuZ2UgaXMgdHJ1ZSAoZmlsdGVyL2xldmVsIGNoYW5nZSksIHVzZSBjdXJyZW50IHRpbWVsaW5lIHNlbGVjdGlvblxuICAgICAgICAgICAgICAgIC8vIFdIWTogQ2hhbmdpbmcgZmlsdGVycyBzaG91bGQgbm90IHJlc2V0IHRoZSB0aW1lIHdpbmRvdyDigJQgdXNlciBleHBlY3RzIHRvIHNlZVxuICAgICAgICAgICAgICAgIC8vIHRoZSBzYW1lIHBlcmlvZCB3aXRoIGRpZmZlcmVudCBmaWx0ZXJpbmcgYXBwbGllZFxuICAgICAgICAgICAgICAgIGlmIChwcmVzZXJ2ZVJhbmdlICYmIFNWR1RpbWVsaW5lLnNlbGVjdGVkUmFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2FkTG9nQnlUaW1lUmFuZ2UoXG4gICAgICAgICAgICAgICAgICAgICAgICBTVkdUaW1lbGluZS5zZWxlY3RlZFJhbmdlLnN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICAgICAgU1ZHVGltZWxpbmUuc2VsZWN0ZWRSYW5nZS5lbmQsXG4gICAgICAgICAgICAgICAgICAgICAgICB0cnVlLCBmYWxzZSwgdGhpcy5pc0F1dG9VcGRhdGVBY3RpdmVcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IG9uZUhvdXIgPSAzNjAwO1xuXG4gICAgICAgICAgICAgICAgLy8gR2V0IGN1cnJlbnQgZmlsZW5hbWUgdG8gY2hlY2sgaWYgaXQncyBhIHJvdGF0ZWQgbG9nIGZpbGVcbiAgICAgICAgICAgICAgICBjb25zdCBmaWxlbmFtZSA9IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2ZpbGVuYW1lJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNSb3RhdGVkID0gdGhpcy5pc1JvdGF0ZWRMb2dGaWxlKGZpbGVuYW1lKTtcblxuICAgICAgICAgICAgICAgIGxldCBlbmRUaW1lc3RhbXA7XG4gICAgICAgICAgICAgICAgbGV0IHN0YXJ0VGltZXN0YW1wO1xuXG4gICAgICAgICAgICAgICAgaWYgKGlzUm90YXRlZCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBGb3Igcm90YXRlZCBmaWxlczogdXNlIHRoZSBmaWxlJ3MgYWN0dWFsIHRpbWUgcmFuZ2VcbiAgICAgICAgICAgICAgICAgICAgLy8gUm90YXRlZCBmaWxlcyBkb24ndCByZWNlaXZlIG5ldyBkYXRhLCBzbyBjdXJyZW50VGltZVJhbmdlIGlzIGZpeGVkXG4gICAgICAgICAgICAgICAgICAgIGVuZFRpbWVzdGFtcCA9IHRoaXMuY3VycmVudFRpbWVSYW5nZS5lbmQ7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0VGltZXN0YW1wID0gTWF0aC5tYXgodGhpcy5jdXJyZW50VGltZVJhbmdlLmVuZCAtIG9uZUhvdXIsIHRoaXMuY3VycmVudFRpbWVSYW5nZS5zdGFydCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRm9yIGFjdGl2ZSBsb2cgZmlsZXM6IHVzZSBjdXJyZW50IHRpbWUgdG8gY2FwdHVyZSBuZXcgZW50cmllc1xuICAgICAgICAgICAgICAgICAgICBlbmRUaW1lc3RhbXAgPSBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBXSFk6IEFuY2hvciBzdGFydFRpbWVzdGFtcCB0byB0aGUgbGFzdCBrbm93biBkYXRhIGVuZCwgbm90IHdhbGwgY2xvY2sgdGltZS5cbiAgICAgICAgICAgICAgICAgICAgLy8gVXNpbmcgXCJub3cgLSBwZXJpb2RcIiBwcm9kdWNlcyBhbiBlbXB0eSByYW5nZSB3aGVuIHRoZSBmaWxlIGhhc24ndCBiZWVuXG4gICAgICAgICAgICAgICAgICAgIC8vIHdyaXR0ZW4gdG8gcmVjZW50bHkgKGUuZy4sIGlkbGUgbW9kdWxlIGxvZ3MgbGlrZSBNb2R1bGVBdXRvQ1JNL1NhbG9uU3luY2VyLmxvZykuXG4gICAgICAgICAgICAgICAgICAgIC8vIGxhc3RLbm93bkRhdGFFbmQgaG9sZHMgdGhlIGFjdHVhbCB0aW1lc3RhbXAgb2YgdGhlIGxhc3QgbGluZSBmcm9tIHRoZSBBUEkgcmVzcG9uc2UuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGFFbmQgPSB0aGlzLmxhc3RLbm93bkRhdGFFbmQgfHwgdGhpcy5jdXJyZW50VGltZVJhbmdlLmVuZDtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnRUaW1lc3RhbXAgPSBNYXRoLm1heChkYXRhRW5kIC0gb25lSG91ciwgdGhpcy5jdXJyZW50VGltZVJhbmdlLnN0YXJ0KTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgY3VycmVudFRpbWVSYW5nZS5lbmQgdG8gcmVmbGVjdCBuZXcgZGF0YSBhdmFpbGFiaWxpdHlcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50VGltZVJhbmdlLmVuZCA9IGVuZFRpbWVzdGFtcDtcblxuICAgICAgICAgICAgICAgICAgICAvLyBGT1JDRSB1cGRhdGUgdGhlIFNWRyB0aW1lbGluZSB2aXNpYmxlIHJhbmdlIHRvIGN1cnJlbnQgdGltZVxuICAgICAgICAgICAgICAgICAgICAvLyBmb3JjZT10cnVlIGVuc3VyZXMgdmlzaWJsZVJhbmdlLmVuZCBpcyBzZXQgZXZlbiBpZiBpdCB3YXMgYWxyZWFkeSA+PSBlbmRUaW1lc3RhbXBcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBoYW5kbGVzIHRpbWV6b25lIGRpZmZlcmVuY2VzIHdoZXJlIHNlcnZlciB0aW1lIG1pZ2h0IGFwcGVhciBcImluIHRoZSBmdXR1cmVcIlxuICAgICAgICAgICAgICAgICAgICBTVkdUaW1lbGluZS5leHRlbmRSYW5nZShlbmRUaW1lc3RhbXAsIHRydWUpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFVzZSBsYXRlc3Q9dHJ1ZSB0byBzaG93IG5ld2VzdCBlbnRyaWVzIChmb3Igc2hvdy1sYXN0LWxvZyAvIGF1dG8tdXBkYXRlIGJ1dHRvbnMpXG4gICAgICAgICAgICAgICAgLy8gUGFzcyBpc0F1dG9VcGRhdGU9dHJ1ZSB3aGVuIGF1dG8tcmVmcmVzaCBpcyBhY3RpdmUgdG8gcHJldmVudCB0aW1lbGluZSBmbGlja2VyaW5nXG4gICAgICAgICAgICAgICAgdGhpcy5sb2FkTG9nQnlUaW1lUmFuZ2Uoc3RhcnRUaW1lc3RhbXAsIGVuZFRpbWVzdGFtcCwgdHJ1ZSwgZmFsc2UsIHRoaXMuaXNBdXRvVXBkYXRlQWN0aXZlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIExpbmUgbnVtYmVyIG1vZGVcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgICAgIHBhcmFtcy5saW5lcyA9IDUwMDA7IC8vIE1heCBsaW5lc1xuICAgICAgICAgICAgU3lzbG9nQVBJLmdldExvZ0Zyb21GaWxlKHBhcmFtcywgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY2JVcGRhdGVMb2dUZXh0KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGaW5kIG5ldyBsaW5lcyB0aGF0IGFyZSBub3QgaW4gY3VycmVudCBjb250ZW50XG4gICAgICogQ29tcGFyZXMgbGFzdCBsaW5lcyBvZiBjdXJyZW50IGNvbnRlbnQgd2l0aCBuZXcgY29udGVudCB0byBmaW5kIG92ZXJsYXBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY3VycmVudENvbnRlbnQgLSBDdXJyZW50IGVkaXRvciBjb250ZW50XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5ld0NvbnRlbnQgLSBOZXcgY29udGVudCBmcm9tIHNlcnZlclxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gQXJyYXkgb2YgbmV3IGxpbmVzIHRvIGFwcGVuZFxuICAgICAqL1xuICAgIGZpbmROZXdMaW5lcyhjdXJyZW50Q29udGVudCwgbmV3Q29udGVudCkge1xuICAgICAgICBpZiAoIWN1cnJlbnRDb250ZW50IHx8IGN1cnJlbnRDb250ZW50LnRyaW0oKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIC8vIElmIGVkaXRvciBpcyBlbXB0eSwgYWxsIGxpbmVzIGFyZSBuZXdcbiAgICAgICAgICAgIHJldHVybiBuZXdDb250ZW50LnNwbGl0KCdcXG4nKS5maWx0ZXIobGluZSA9PiBsaW5lLnRyaW0oKS5sZW5ndGggPiAwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGN1cnJlbnRMaW5lcyA9IGN1cnJlbnRDb250ZW50LnNwbGl0KCdcXG4nKTtcbiAgICAgICAgY29uc3QgbmV3TGluZXMgPSBuZXdDb250ZW50LnNwbGl0KCdcXG4nKTtcblxuICAgICAgICAvLyBHZXQgbGFzdCBub24tZW1wdHkgbGluZSBmcm9tIGN1cnJlbnQgY29udGVudCBhcyBhbmNob3JcbiAgICAgICAgbGV0IGFuY2hvckxpbmUgPSAnJztcbiAgICAgICAgZm9yIChsZXQgaSA9IGN1cnJlbnRMaW5lcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRMaW5lc1tpXS50cmltKCkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGFuY2hvckxpbmUgPSBjdXJyZW50TGluZXNbaV07XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWFuY2hvckxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXdMaW5lcy5maWx0ZXIobGluZSA9PiBsaW5lLnRyaW0oKS5sZW5ndGggPiAwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZpbmQgYW5jaG9yIGxpbmUgaW4gbmV3IGNvbnRlbnRcbiAgICAgICAgbGV0IGFuY2hvckluZGV4ID0gLTE7XG4gICAgICAgIGZvciAobGV0IGkgPSBuZXdMaW5lcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgaWYgKG5ld0xpbmVzW2ldID09PSBhbmNob3JMaW5lKSB7XG4gICAgICAgICAgICAgICAgYW5jaG9ySW5kZXggPSBpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGFuY2hvckluZGV4ID09PSAtMSkge1xuICAgICAgICAgICAgLy8gQW5jaG9yIG5vdCBmb3VuZCAtIGNvbnRlbnQgY2hhbmdlZCBzaWduaWZpY2FudGx5LCByZXR1cm4gZW1wdHlcbiAgICAgICAgICAgIC8vIFRoaXMgcHJldmVudHMgZHVwbGljYXRlcyB3aGVuIGxvZyByb3RhdGVzIG9yIGZpbHRlciBjaGFuZ2VzXG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZXR1cm4gbGluZXMgYWZ0ZXIgYW5jaG9yXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IG5ld0xpbmVzLnNsaWNlKGFuY2hvckluZGV4ICsgMSkuZmlsdGVyKGxpbmUgPT4gbGluZS50cmltKCkubGVuZ3RoID4gMCk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhlIGxvZyB2aWV3LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIEFQSS5cbiAgICAgKi9cbiAgICBjYlVwZGF0ZUxvZ1RleHQocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gSGlkZSBkaW1tZXIgb25seSBpZiBub3QgaW4gYXV0by11cGRhdGUgbW9kZVxuICAgICAgICBpZiAoIXN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBIYW5kbGUgdjMgQVBJIHJlc3BvbnNlIHN0cnVjdHVyZVxuICAgICAgICBpZiAoIXJlc3BvbnNlIHx8ICFyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5tZXNzYWdlcykge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjb250ZW50ID0gcmVzcG9uc2UuZGF0YT8uY29udGVudCB8fCAnJztcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLmdldFNlc3Npb24oKS5zZXRWYWx1ZShjb250ZW50KTtcbiAgICAgICAgY29uc3Qgcm93ID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnNlc3Npb24uZ2V0TGVuZ3RoKCkgLSAxO1xuICAgICAgICBjb25zdCBjb2x1bW4gPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIuc2Vzc2lvbi5nZXRMaW5lKHJvdykubGVuZ3RoO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIuZ290b0xpbmUocm93ICsgMSwgY29sdW1uKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgY2xpY2tpbmcgdGhlIFwiRG93bmxvYWQgRmlsZVwiIGJ1dHRvbi5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZGF0YS5cbiAgICAgKi9cbiAgICBjYkRvd25sb2FkRmlsZShyZXNwb25zZSkge1xuICAgICAgICAvLyBIYW5kbGUgdjMgQVBJIHJlc3BvbnNlIHN0cnVjdHVyZVxuICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IHJlc3BvbnNlLmRhdGEuZmlsZW5hbWUgfHwgcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5tZXNzYWdlcykge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBjbGlja2luZyB0aGUgXCJFcmFzZSBGaWxlXCIgYnV0dG9uLlxuICAgICAqL1xuICAgIGVyYXNlQ3VycmVudEZpbGVDb250ZW50KCl7XG4gICAgICAgIGNvbnN0IGZpbGVOYW1lID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2ZpbGVuYW1lJyk7XG4gICAgICAgIGlmIChmaWxlTmFtZS5sZW5ndGg+MCl7XG4gICAgICAgICAgICBTeXNsb2dBUEkuZXJhc2VGaWxlKGZpbGVOYW1lLCBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jYkFmdGVyRmlsZUVyYXNlZClcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBjbGlja2luZyB0aGUgXCJFcmFzZSBGaWxlXCIgYnV0dG9uIGFuZCBjYWxsaW5nIFJFU1QgQVBJIGNvbW1hbmRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZGF0YS5cbiAgICAgKi9cbiAgICBjYkFmdGVyRmlsZUVyYXNlZChyZXNwb25zZSl7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQ9PT1mYWxzZSAmJiByZXNwb25zZS5tZXNzYWdlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudXBkYXRlTG9nRnJvbVNlcnZlcigpO1xuICAgICAgICB9XG4gICAgfSxcbn07XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBzaG93IHN5c3RlbSBsb2dzIHRhYlxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==