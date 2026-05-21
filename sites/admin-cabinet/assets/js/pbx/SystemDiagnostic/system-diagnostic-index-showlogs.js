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
      } // Share TZ metadata with the global PbxDateTime helper so any
      // formatter on this page (slider tooltips, popups, future tables)
      // renders in PBX-server time regardless of browser locale.


      PbxDateTime.setServerMeta({
        server_timezone: timeRangeData.server_timezone,
        server_timezone_offset: timeRangeData.server_timezone_offset
      }); // Keep the time slider's local offset in sync with PbxDateTime
      // because TimeSlider.formatTimestamp now delegates to the helper.

      if (typeof TimeSlider !== 'undefined') {
        TimeSlider.serverTimezoneOffset = PbxDateTime.serverTimezoneOffset;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TeXN0ZW1EaWFnbm9zdGljL3N5c3RlbS1kaWFnbm9zdGljLWluZGV4LXNob3dsb2dzLmpzIl0sIm5hbWVzIjpbInN5c3RlbURpYWdub3N0aWNMb2dzIiwiJHNob3dCdG4iLCIkZG93bmxvYWRCdG4iLCIkc2hvd0F1dG9CdG4iLCIkZXJhc2VCdG4iLCIkbG9nQ29udGVudCIsInZpZXdlciIsIiRmaWxlU2VsZWN0RHJvcERvd24iLCJsb2dzSXRlbXMiLCIkZGltbWVyIiwiJGZvcm1PYmoiLCJpc0luaXRpYWxpemluZyIsInRpbWVTbGlkZXJFbmFibGVkIiwiY3VycmVudFRpbWVSYW5nZSIsImlzQXV0b1VwZGF0ZUFjdGl2ZSIsImZpbHRlckNvbmRpdGlvbnMiLCJwZW5kaW5nRmlsdGVyVGV4dCIsImxhc3RLbm93bkRhdGFFbmQiLCJpbml0aWFsaXplIiwiJCIsImFkZENsYXNzIiwiaGlkZSIsImNzcyIsInRvcCIsImxlZnQiLCJhY2VIZWlnaHQiLCJ3aW5kb3ciLCJpbm5lckhlaWdodCIsImNsb3Nlc3QiLCJjcmVhdGVEcm9wZG93bkZyb21IaWRkZW5JbnB1dCIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJjYk9uQ2hhbmdlRmlsZSIsImlnbm9yZUNhc2UiLCJmdWxsVGV4dFNlYXJjaCIsImZvcmNlU2VsZWN0aW9uIiwicHJlc2VydmVIVE1MIiwiYWxsb3dDYXRlZ29yeVNlbGVjdGlvbiIsIm1hdGNoIiwiZmlsdGVyUmVtb3RlRGF0YSIsImFjdGlvbiIsInRlbXBsYXRlcyIsIm1lbnUiLCJjdXN0b21Ecm9wZG93bk1lbnUiLCJpbml0aWFsaXplRm9sZGVySGFuZGxlcnMiLCJpbml0aWFsaXplQWNlIiwiU3lzbG9nQVBJIiwiZ2V0TG9nc0xpc3QiLCJjYkZvcm1hdERyb3Bkb3duUmVzdWx0cyIsImluaXRpYWxpemVMb2dMZXZlbERyb3Bkb3duIiwiaW5pdGlhbGl6ZUZpbHRlckZyb21VcmwiLCJkb2N1bWVudCIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwiJGJ0biIsImN1cnJlbnRUYXJnZXQiLCJwZXJpb2QiLCJkYXRhIiwicmVtb3ZlQ2xhc3MiLCJhcHBseVF1aWNrUGVyaW9kIiwiZW5kIiwib25lSG91ciIsInN0YXJ0IiwiTWF0aCIsIm1heCIsIlNWR1RpbWVsaW5lIiwic2V0UmFuZ2UiLCJsb2FkTG9nQnlUaW1lUmFuZ2UiLCJsZXZlbCIsImFwcGx5TG9nTGV2ZWxGaWx0ZXIiLCJ1cGRhdGVMb2dGcm9tU2VydmVyIiwiaGFuZGxlSGFzaENoYW5nZSIsImZvcm0iLCJkb3dubG9hZExvZ0ZpbGUiLCJmaWxlbmFtZSIsImNiRG93bmxvYWRGaWxlIiwiJGJ1dHRvbiIsIiRyZWxvYWRJY29uIiwiZmluZCIsImhhc0NsYXNzIiwidXBkYXRlTG9nVmlld1dvcmtlciIsInN0b3AiLCJlcmFzZUN1cnJlbnRGaWxlQ29udGVudCIsImV2ZW50IiwiJHBvcHVwIiwiaXNQb3B1cFZpc2libGUiLCJpcyIsImtleSIsIm5hdmlnYXRlRmlsdGVyUG9wdXAiLCIkZm9jdXNlZCIsImxlbmd0aCIsInRyaWdnZXIiLCJ0ZXh0IiwidmFsIiwidHJpbSIsInNob3dGaWx0ZXJUeXBlUG9wdXAiLCJoaWRlRmlsdGVyVHlwZVBvcHVwIiwicmVtb3ZlRmlsdGVyQ29uZGl0aW9uIiwic2V0VGltZW91dCIsImFkZEZpbHRlckNvbmRpdGlvbiIsInR5cGUiLCJzdG9wUHJvcGFnYXRpb24iLCJpbmRleCIsImNsZWFyQWxsRmlsdGVyQ29uZGl0aW9ucyIsInRhcmdldCIsImZvY3VzIiwiJGZ1bGxzY3JlZW5CdG4iLCJsb2dDb250YWluZXIiLCJnZXRFbGVtZW50QnlJZCIsIkZ1bGxzY3JlZW5Ub2dnbGUiLCJpc1N1cHBvcnRlZCIsInRvZ2dsZUZ1bGxTY3JlZW4iLCJhZGp1c3RMb2dIZWlnaHQiLCJ0b2dnbGUiLCJlcnIiLCJjb25zb2xlIiwiZXJyb3IiLCJtZXNzYWdlIiwib2Zmc2V0IiwiZ2V0QWN0aXZlRWxlbWVudCIsInJlc2l6ZSIsIiRoaWRkZW5JbnB1dCIsIiRkcm9wZG93biIsImlkIiwiJHRleHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJzZF9BbGxMZXZlbHMiLCIkaWNvbiIsIiRtZW51IiwiaXRlbXMiLCJ2YWx1ZSIsImljb24iLCJzZF9FcnJvciIsInNkX1dhcm5pbmciLCJzZF9Ob3RpY2UiLCJzZF9JbmZvIiwic2RfRGVidWciLCJmb3JFYWNoIiwiaXRlbSIsIiRpdGVtIiwiaHRtbCIsImFwcGVuZCIsImFmdGVyIiwidGFiaW5kZXgiLCJiZWZvcmUiLCJhY2UiLCJlZGl0IiwianVsaWEiLCJyZXF1aXJlIiwidW5kZWZpbmVkIiwiSW5pTW9kZSIsIk1vZGUiLCJzZXNzaW9uIiwic2V0TW9kZSIsInNldFRoZW1lIiwicmVuZGVyZXIiLCJzZXRTaG93R3V0dGVyIiwic2V0T3B0aW9ucyIsInNob3dMaW5lTnVtYmVycyIsInNob3dQcmludE1hcmdpbiIsInJlYWRPbmx5IiwiYnVpbGRUcmVlU3RydWN0dXJlIiwiZmlsZXMiLCJkZWZhdWx0UGF0aCIsInRyZWUiLCJPYmplY3QiLCJlbnRyaWVzIiwiZmlsZURhdGEiLCJmaWxlUGF0aCIsInBhdGgiLCJwYXJ0cyIsInNwbGl0IiwiY3VycmVudCIsInBhcnQiLCJzaXplIiwiY2hpbGRyZW4iLCJ0cmVlVG9Ecm9wZG93bkl0ZW1zIiwicHJlZml4IiwicGFyZW50Rm9sZGVyUGF0aCIsInNvcnQiLCJhS2V5IiwiYVZhbCIsImJLZXkiLCJiVmFsIiwibG9jYWxlQ29tcGFyZSIsImZvbGRlclBhdGgiLCJwdXNoIiwibmFtZSIsImRpc2FibGVkIiwiZm9sZGVyTmFtZSIsInBhcmVudEZvbGRlciIsImNoaWxkSXRlbXMiLCJzZWxlY3RlZCIsInJlc3BvbnNlIiwiZmllbGRzIiwidmFsdWVzIiwiZWFjaCIsIm9wdGlvbiIsImZvbGRlclBhcmVudEF0dHIiLCJwYXJlbnRBdHRyIiwibWF5YmVEaXNhYmxlZCIsImFkZEV2ZW50TGlzdGVuZXIiLCJmb2xkZXJIZWFkZXIiLCJzdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24iLCIkZm9sZGVyIiwiJHRvZ2dsZSIsImlzQ29sbGFwc2VkIiwic2hvdyIsImNvbGxhcHNlRGVzY2VuZGFudHMiLCJzZWFyY2hWYWx1ZSIsIl8iLCJmb2xkZXIiLCJjaGlsZEZvbGRlciIsIiRjaGlsZEZvbGRlciIsImNoaWxkUGF0aCIsImV4cGFuZEZvbGRlckZvckZpbGUiLCIkZmlsZUl0ZW0iLCJwYXJlbnRQYXRoIiwiaGFzaCIsImxvY2F0aW9uIiwic3RhcnRzV2l0aCIsImRlY29kZVVSSUNvbXBvbmVudCIsInN1YnN0cmluZyIsImZpbGVFeGlzdHMiLCJzb21lIiwiZ2V0RmlsZUZyb21IYXNoIiwicmVzdWx0IiwiZGVmVmFsIiwiZmlsZU5hbWUiLCJkcm9wZG93blZhbHVlcyIsIm1hcCIsInJlcGxhY2UiLCJzZWxlY3RlZEl0ZW0iLCJpdGVtVG9TZWxlY3QiLCJlbmNvZGVVUklDb21wb25lbnQiLCJyZXNldEZpbHRlcnMiLCJ1cGRhdGVBdXRvUmVmcmVzaFZpc2liaWxpdHkiLCJjaGVja1RpbWVSYW5nZUF2YWlsYWJpbGl0eSIsImlzUm90YXRlZExvZ0ZpbGUiLCJ0ZXN0IiwiJGF1dG9CdG4iLCJpc1JvdGF0ZWQiLCJkaXNwbGF5IiwiZmlyc3QiLCJkaXJlY3Rpb24iLCIkb3B0aW9ucyIsImZpbHRlciIsImVxIiwic3luY0ZpbHRlckNvbmRpdGlvbnNUb0Zvcm0iLCJyZW5kZXJGaWx0ZXJMYWJlbHMiLCJzcGxpY2UiLCJKU09OIiwic3RyaW5naWZ5IiwiJGNvbnRhaW5lciIsImVtcHR5IiwiY29uZGl0aW9uIiwiY3NzQ2xhc3MiLCJpY29uQ2xhc3MiLCJpY29uQ29sb3IiLCIkbGFiZWwiLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJzZWFyY2giLCJmaWx0ZXJQYXJhbSIsImdldCIsInRyaW1tZWQiLCJwYXJzZWQiLCJwYXJzZSIsIkFycmF5IiwiaXNBcnJheSIsImMiLCJwIiwidXBkYXRlUGVyaW9kQnV0dG9uc1Zpc2liaWxpdHkiLCJsb2dEdXJhdGlvbiIsIiRwZXJpb2RCdXR0b25zIiwiJHBlcmlvZENvbnRhaW5lciIsImxhcmdlc3RWaXNpYmxlUGVyaW9kIiwiJGxhcmdlc3RWaXNpYmxlQnV0dG9uIiwidmlzaWJsZUNvdW50IiwiYnV0dG9uIiwicGFyc2VJbnQiLCIkdGltZUNvbnRyb2xzSW5saW5lIiwiZ2V0TG9nVGltZVJhbmdlIiwidGltZV9yYW5nZSIsImluaXRpYWxpemVOYXZpZ2F0aW9uIiwidGltZVJhbmdlRGF0YSIsImhhc1ZhbGlkVGltZVJhbmdlIiwiaGFzTXVsdGlwbGVUaW1lc3RhbXBzIiwic2VydmVyX3RpbWV6b25lX29mZnNldCIsInNlcnZlclRpbWV6b25lT2Zmc2V0IiwiUGJ4RGF0ZVRpbWUiLCJzZXRTZXJ2ZXJNZXRhIiwic2VydmVyX3RpbWV6b25lIiwiVGltZVNsaWRlciIsIm9uUmFuZ2VDaGFuZ2UiLCJkcmFnZ2VkSGFuZGxlIiwib25UcnVuY2F0ZWRab25lQ2xpY2siLCJpc0xlZnRab25lIiwiJGFjdGl2ZUJ1dHRvbiIsImluaXRpYWxQZXJpb2QiLCJtaW4iLCJpbml0aWFsU3RhcnQiLCJsaW5lUmFuZ2UiLCJsb2FkTG9nQnlMaW5lcyIsImZsb29yIiwiY2VpbCIsImxpbmVzIiwicGFyYW1zIiwibG9nTGV2ZWwiLCJnZXRMb2dGcm9tRmlsZSIsInNldFZhbHVlIiwiY29udGVudCIsImdvdG9MaW5lIiwic2Nyb2xsVG9MaW5lIiwic3RhcnRUaW1lc3RhbXAiLCJlbmRUaW1lc3RhbXAiLCJsYXRlc3QiLCJpc0luaXRpYWxMb2FkIiwiaXNBdXRvVXBkYXRlIiwiZGF0ZUZyb20iLCJkYXRlVG8iLCJuZXdDb250ZW50IiwiY3VycmVudENvbnRlbnQiLCJnZXRWYWx1ZSIsIm5ld0xpbmVzIiwiZmluZE5ld0xpbmVzIiwibGFzdFJvdyIsImdldExlbmd0aCIsImluc2VydCIsInJvdyIsImNvbHVtbiIsImpvaW4iLCJmaW5hbFJvdyIsImZpbmFsQ29sdW1uIiwiZ2V0TGluZSIsImFjdHVhbF9yYW5nZSIsImFjdHVhbCIsInVwZGF0ZURhdGFCb3VuZGFyeSIsInVwZGF0ZUZyb21TZXJ2ZXJSZXNwb25zZSIsInBlcmlvZFNlY29uZHMiLCJhcHBseVBlcmlvZCIsImZpbHRlclBhdHRlcm4iLCJwcmVzZXJ2ZVJhbmdlIiwic2VsZWN0ZWRSYW5nZSIsIkRhdGUiLCJub3ciLCJkYXRhRW5kIiwiZXh0ZW5kUmFuZ2UiLCJjYlVwZGF0ZUxvZ1RleHQiLCJsaW5lIiwiY3VycmVudExpbmVzIiwiYW5jaG9yTGluZSIsImkiLCJhbmNob3JJbmRleCIsInNsaWNlIiwibWVzc2FnZXMiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsImdldFNlc3Npb24iLCJlcmFzZUZpbGUiLCJjYkFmdGVyRmlsZUVyYXNlZCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsb0JBQW9CLEdBQUc7QUFDekI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUUsSUFOZTs7QUFRekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsWUFBWSxFQUFFLElBWlc7O0FBY3pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBQVksRUFBRSxJQWxCVzs7QUFvQnpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFNBQVMsRUFBRSxJQXhCYzs7QUEwQnpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFdBQVcsRUFBRSxJQTlCWTs7QUFnQ3pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLE1BQU0sRUFBRSxFQXBDaUI7O0FBc0N6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxtQkFBbUIsRUFBRSxJQTFDSTs7QUE0Q3pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFNBQVMsRUFBRSxFQWhEYzs7QUFrRHpCO0FBQ0o7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bUMsV0FBbkMsRUFBZ0QsVUFBaEQsQ0FBakI7O0FBQ0EsUUFBSTRKLFFBQVEsQ0FBQzFJLE1BQVQsR0FBZ0IsQ0FBcEIsRUFBc0I7QUFDbEI3QyxNQUFBQSxTQUFTLENBQUMwVCxTQUFWLENBQW9CbkksUUFBcEIsRUFBOEJyTyxvQkFBb0IsQ0FBQ3lXLGlCQUFuRDtBQUNIO0FBQ0osR0EvbER3Qjs7QUFpbUR6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQSxFQUFBQSxpQkFybUR5Qiw2QkFxbURQdkssUUFybURPLEVBcW1ERTtBQUN2QixRQUFJQSxRQUFRLENBQUNpQyxNQUFULEtBQWtCLEtBQWxCLElBQTJCakMsUUFBUSxDQUFDa0ssUUFBVCxLQUFzQjlNLFNBQXJELEVBQWdFO0FBQzVEK00sTUFBQUEsV0FBVyxDQUFDQyxlQUFaLENBQTRCcEssUUFBUSxDQUFDa0ssUUFBckM7QUFDSCxLQUZELE1BRU87QUFDSHBXLE1BQUFBLG9CQUFvQixDQUFDdUUsbUJBQXJCO0FBQ0g7QUFDSjtBQTNtRHdCLENBQTdCLEMsQ0E4bURBOztBQUNBcEQsQ0FBQyxDQUFDZ0MsUUFBRCxDQUFELENBQVl1VCxLQUFaLENBQWtCLFlBQU07QUFDcEIxVyxFQUFBQSxvQkFBb0IsQ0FBQ2tCLFVBQXJCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG4vKiBnbG9iYWwgYWNlLCBQYnhBcGksIFN5c2xvZ0FQSSwgdXBkYXRlTG9nVmlld1dvcmtlciwgQWNlLCBVc2VyTWVzc2FnZSwgU1ZHVGltZWxpbmUgKi9cblxuLyoqXG4gKiBSZXByZXNlbnRzIHRoZSBzeXN0ZW0gZGlhZ25vc3RpYyBsb2dzIG9iamVjdC5cbiAqXG4gKiBAbW9kdWxlIHN5c3RlbURpYWdub3N0aWNMb2dzXG4gKi9cbmNvbnN0IHN5c3RlbURpYWdub3N0aWNMb2dzID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBcIlNob3cgTGFzdCBMb2dcIiBidXR0b24uXG4gICAgICogUmVzb2x2ZWQgaW4gaW5pdGlhbGl6ZSgpIOKAlCBtdXN0IG5vdCBjYWxsICQoKSBhdCBtb2R1bGUtbG9hZCB0aW1lLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNob3dCdG46IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgXCJEb3dubG9hZCBGaWxlXCIgYnV0dG9uLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRvd25sb2FkQnRuOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIFwiU2hvdyBMYXN0IExvZyAoQXV0bylcIiBidXR0b24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc2hvd0F1dG9CdG46IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgXCJFcmFzZSBjdXJyZW50IGZpbGUgY29udGVudFwiIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRlcmFzZUJ0bjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBsb2cgY29udGVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRsb2dDb250ZW50OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVGhlIHZpZXdlciBmb3IgZGlzcGxheWluZyB0aGUgbG9nIGNvbnRlbnQuXG4gICAgICogQHR5cGUge0FjZX1cbiAgICAgKi9cbiAgICB2aWV3ZXI6ICcnLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZpbGUgc2VsZWN0IGRyb3Bkb3duLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZpbGVTZWxlY3REcm9wRG93bjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEFycmF5IG9mIGxvZyBpdGVtcy5cbiAgICAgKiBAdHlwZSB7QXJyYXl9XG4gICAgICovXG4gICAgbG9nc0l0ZW1zOiBbXSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBkaW1tZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGltbWVyOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEZsYWcgdG8gcHJldmVudCBkdXBsaWNhdGUgQVBJIGNhbGxzIGR1cmluZyBpbml0aWFsaXphdGlvblxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGlzSW5pdGlhbGl6aW5nOiB0cnVlLFxuXG4gICAgLyoqXG4gICAgICogRmxhZyBpbmRpY2F0aW5nIGlmIHRpbWUgc2xpZGVyIG1vZGUgaXMgZW5hYmxlZFxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIHRpbWVTbGlkZXJFbmFibGVkOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIEN1cnJlbnQgdGltZSByYW5nZSBmb3IgdGhlIHNlbGVjdGVkIGxvZyBmaWxlXG4gICAgICogQHR5cGUge29iamVjdHxudWxsfVxuICAgICAqL1xuICAgIGN1cnJlbnRUaW1lUmFuZ2U6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBGbGFnIGluZGljYXRpbmcgaWYgYXV0by11cGRhdGUgbW9kZSBpcyBhY3RpdmVcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBpc0F1dG9VcGRhdGVBY3RpdmU6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogQXJyYXkgb2YgY2FzY2FkaW5nIGZpbHRlciBjb25kaXRpb25zIFt7dHlwZTogJ2NvbnRhaW5zJ3wnbm90Q29udGFpbnMnLCB2YWx1ZTogc3RyaW5nfV1cbiAgICAgKiBAdHlwZSB7QXJyYXl9XG4gICAgICovXG4gICAgZmlsdGVyQ29uZGl0aW9uczogW10sXG5cbiAgICAvKipcbiAgICAgKiBQZW5kaW5nIGZpbHRlciB0ZXh0IHdhaXRpbmcgZm9yIHR5cGUgc2VsZWN0aW9uIGluIHBvcHVwXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBwZW5kaW5nRmlsdGVyVGV4dDogJycsXG5cbiAgICAvKipcbiAgICAgKiBMYXN0IGtub3duIGFjdHVhbCBkYXRhIGVuZCB0aW1lc3RhbXAgZnJvbSBBUEkgcmVzcG9uc2UuXG4gICAgICogVXNlZCB0byBhbmNob3IgcmVmcmVzaCB0aW1lIHJhbmdlIHRvIHJlYWwgZGF0YSBpbnN0ZWFkIG9mIHdhbGwgY2xvY2sgdGltZS5cbiAgICAgKiBXSFk6IElmIGEgbG9nIGZpbGUgaGFzbid0IGJlZW4gd3JpdHRlbiB0byByZWNlbnRseSAoZS5nLiwgaWRsZSBtb2R1bGUgbG9nKSxcbiAgICAgKiB1c2luZyBcIm5vdyAtIHBlcmlvZFwiIGFzIHN0YXJ0VGltZXN0YW1wIHByb2R1Y2VzIGFuIGVtcHR5IHJhbmdlIHdpdGggbm8gZGF0YS5cbiAgICAgKiBAdHlwZSB7bnVtYmVyfG51bGx9XG4gICAgICovXG4gICAgbGFzdEtub3duRGF0YUVuZDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBzeXN0ZW0gZGlhZ25vc3RpYyBsb2dzLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIFJlc29sdmUgalF1ZXJ5IHdyYXBwZXJzIGhlcmUg4oCUIGF0IG1vZHVsZS1sb2FkIHRpbWUgalF1ZXJ5IG1heVxuICAgICAgICAvLyBub3QgeWV0IGJlIGRlZmluZWQgKFNlbnRyeSBNSUtPUEJYLU1HOSBwYXR0ZXJuKS5cbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJHNob3dCdG4gPSAkKCcjc2hvdy1sYXN0LWxvZycpO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZG93bmxvYWRCdG4gPSAkKCcjZG93bmxvYWQtZmlsZScpO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kc2hvd0F1dG9CdG4gPSAkKCcjc2hvdy1sYXN0LWxvZy1hdXRvJyk7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRlcmFzZUJ0biA9ICQoJyNlcmFzZS1maWxlJyk7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRsb2dDb250ZW50ID0gJCgnI2xvZy1jb250ZW50LXJlYWRvbmx5Jyk7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIgPSAkKCcjZ2V0LWxvZ3MtZGltbWVyJyk7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqID0gJCgnI3N5c3RlbS1kaWFnbm9zdGljLWZvcm0nKTtcblxuICAgICAgICAvLyBFbnN1cmUgZmlsdGVyIHR5cGUgcG9wdXAgc3RhcnRzIGhpZGRlbiB3aXRoIGNsZWFuIHN0eWxlc1xuICAgICAgICAkKCcjZmlsdGVyLXR5cGUtcG9wdXAnKS5hZGRDbGFzcygnaGlkZGVuJykuaGlkZSgpLmNzcyh7dG9wOiAnJywgbGVmdDogJyd9KTtcblxuICAgICAgICBjb25zdCBhY2VIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSAyNTA7XG5cbiAgICAgICAgLy8gU2V0IHRoZSBtaW5pbXVtIGhlaWdodCBvZiB0aGUgbG9nIGNvbnRhaW5lclxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLmNsb3Nlc3QoJ2RpdicpLmNzcygnbWluLWhlaWdodCcsIGAke2FjZUhlaWdodH1weGApO1xuXG4gICAgICAgIC8vIENyZWF0ZSBkcm9wZG93biBVSSBmcm9tIGhpZGRlbiBpbnB1dCAoVjUuMCBwYXR0ZXJuKVxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jcmVhdGVEcm9wZG93bkZyb21IaWRkZW5JbnB1dCgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGRyb3Bkb3duIG1lbnUgZm9yIGxvZyBmaWxlcyB3aXRoIHRyZWUgc3VwcG9ydFxuICAgICAgICAvLyBJbml0aWFsaXplIFNlbWFudGljIFVJIGRyb3Bkb3duIHdpdGggY3VzdG9tIG1lbnUgZ2VuZXJhdGlvblxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY2JPbkNoYW5nZUZpbGUsXG4gICAgICAgICAgICAgICAgaWdub3JlQ2FzZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICAgICAgcHJlc2VydmVIVE1MOiB0cnVlLFxuICAgICAgICAgICAgICAgIGFsbG93Q2F0ZWdvcnlTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgICAgIG1hdGNoOiAndGV4dCcsXG4gICAgICAgICAgICAgICAgZmlsdGVyUmVtb3RlRGF0YTogZmFsc2UsXG4gICAgICAgICAgICAgICAgYWN0aW9uOiAnYWN0aXZhdGUnLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlczoge1xuICAgICAgICAgICAgICAgICAgICBtZW51OiBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jdXN0b21Ecm9wZG93bk1lbnVcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZm9sZGVyIGNvbGxhcHNlL2V4cGFuZCBoYW5kbGVycyAodXNlcyBldmVudCBkZWxlZ2F0aW9uKVxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pbml0aWFsaXplRm9sZGVySGFuZGxlcnMoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBBQ0UgZWRpdG9yIGZvciBsb2cgY29udGVudFxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pbml0aWFsaXplQWNlKCk7XG5cbiAgICAgICAgLy8gRmV0Y2ggdGhlIGxpc3Qgb2YgbG9nIGZpbGVzXG4gICAgICAgIFN5c2xvZ0FQSS5nZXRMb2dzTGlzdChzeXN0ZW1EaWFnbm9zdGljTG9ncy5jYkZvcm1hdERyb3Bkb3duUmVzdWx0cyk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBsb2cgbGV2ZWwgZHJvcGRvd24gLSBWNS4wIHBhdHRlcm4gd2l0aCBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmluaXRpYWxpemVMb2dMZXZlbERyb3Bkb3duKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmaWx0ZXIgY29uZGl0aW9ucyBmcm9tIFVSTCBwYXJhbWV0ZXIgKGUuZy4gQ0RSIGxpbmtzIHdpdGggP2ZpbHRlcj0uLi4pXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmluaXRpYWxpemVGaWx0ZXJGcm9tVXJsKCk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIHF1aWNrIHBlcmlvZCBidXR0b25zXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcucGVyaW9kLWJ0bicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkYnRuID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICAgICAgY29uc3QgcGVyaW9kID0gJGJ0bi5kYXRhKCdwZXJpb2QnKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIGFjdGl2ZSBzdGF0ZVxuICAgICAgICAgICAgJCgnLnBlcmlvZC1idG4nKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAkYnRuLmFkZENsYXNzKCdhY3RpdmUnKTtcblxuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuYXBwbHlRdWlja1BlcmlvZChwZXJpb2QpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgXCJOb3dcIiBidXR0b25cbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJy5ub3ctYnRuJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGlmIChzeXN0ZW1EaWFnbm9zdGljTG9ncy5jdXJyZW50VGltZVJhbmdlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZW5kID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY3VycmVudFRpbWVSYW5nZS5lbmQ7XG4gICAgICAgICAgICAgICAgY29uc3Qgb25lSG91ciA9IDM2MDA7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhcnQgPSBNYXRoLm1heChlbmQgLSBvbmVIb3VyLCBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jdXJyZW50VGltZVJhbmdlLnN0YXJ0KTtcbiAgICAgICAgICAgICAgICBTVkdUaW1lbGluZS5zZXRSYW5nZShzdGFydCwgZW5kKTtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2FkTG9nQnlUaW1lUmFuZ2Uoc3RhcnQsIGVuZCk7XG4gICAgICAgICAgICAgICAgJCgnLnBlcmlvZC1idG4nKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgJCgnLnBlcmlvZC1idG5bZGF0YS1wZXJpb2Q9XCIzNjAwXCJdJykuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgbG9nIGxldmVsIGZpbHRlciBidXR0b25zXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcubGV2ZWwtYnRuJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0ICRidG4gPSAkKGUuY3VycmVudFRhcmdldCk7XG4gICAgICAgICAgICBjb25zdCBsZXZlbCA9ICRidG4uZGF0YSgnbGV2ZWwnKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIGFjdGl2ZSBzdGF0ZVxuICAgICAgICAgICAgJCgnLmxldmVsLWJ0bicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgICRidG4uYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuXG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5hcHBseUxvZ0xldmVsRmlsdGVyKGxldmVsKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIFwiU2hvdyBMb2dcIiBidXR0b24gY2xpY2sgKGRlbGVnYXRlZClcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJyNzaG93LWxhc3QtbG9nJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gTGlzdGVuIGZvciBoYXNoIGNoYW5nZXMgdG8gdXBkYXRlIHNlbGVjdGVkIGZpbGVcbiAgICAgICAgJCh3aW5kb3cpLm9uKCdoYXNoY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaGFuZGxlSGFzaENoYW5nZSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgXCJEb3dubG9hZCBMb2dcIiBidXR0b24gY2xpY2sgKGRlbGVnYXRlZClcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJyNkb3dubG9hZC1maWxlJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgICAgICBTeXNsb2dBUEkuZG93bmxvYWRMb2dGaWxlKGRhdGEuZmlsZW5hbWUsIHRydWUsIHN5c3RlbURpYWdub3N0aWNMb2dzLmNiRG93bmxvYWRGaWxlKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIFwiQXV0byBSZWZyZXNoXCIgYnV0dG9uIGNsaWNrIChkZWxlZ2F0ZWQpXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcjc2hvdy1sYXN0LWxvZy1hdXRvJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0ICRidXR0b24gPSAkKCcjc2hvdy1sYXN0LWxvZy1hdXRvJyk7XG4gICAgICAgICAgICBjb25zdCAkcmVsb2FkSWNvbiA9ICRidXR0b24uZmluZCgnLmljb25zIGkucmVmcmVzaCcpO1xuICAgICAgICAgICAgaWYgKCRyZWxvYWRJY29uLmhhc0NsYXNzKCdsb2FkaW5nJykpIHtcbiAgICAgICAgICAgICAgICAkcmVsb2FkSWNvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHVwZGF0ZUxvZ1ZpZXdXb3JrZXIuc3RvcCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkcmVsb2FkSWNvbi5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgdXBkYXRlTG9nVmlld1dvcmtlci5pbml0aWFsaXplKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciB0aGUgXCJFcmFzZSBmaWxlXCIgYnV0dG9uIGNsaWNrIChkZWxlZ2F0ZWQpXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcjZXJhc2UtZmlsZScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5lcmFzZUN1cnJlbnRGaWxlQ29udGVudCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgRW50ZXIga2V5cHJlc3Mgb24gZmlsdGVyIGlucHV0IOKAlCBzaG93IHR5cGUgcG9wdXBcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2tleWRvd24nLCAnI2ZpbHRlci1pbnB1dCcsIChldmVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJHBvcHVwID0gJCgnI2ZpbHRlci10eXBlLXBvcHVwJyk7XG4gICAgICAgICAgICBjb25zdCBpc1BvcHVwVmlzaWJsZSA9ICRwb3B1cC5pcygnOnZpc2libGUnKSAmJiAhJHBvcHVwLmhhc0NsYXNzKCdoaWRkZW4nKTtcblxuICAgICAgICAgICAgLy8gV2hlbiBwb3B1cCBpcyBvcGVuLCBoYW5kbGUgYXJyb3cga2V5cyBhbmQgRW50ZXIgZm9yIGtleWJvYXJkIG5hdmlnYXRpb25cbiAgICAgICAgICAgIGlmIChpc1BvcHVwVmlzaWJsZSkge1xuICAgICAgICAgICAgICAgIGlmIChldmVudC5rZXkgPT09ICdBcnJvd0Rvd24nIHx8IGV2ZW50LmtleSA9PT0gJ0Fycm93VXAnKSB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLm5hdmlnYXRlRmlsdGVyUG9wdXAoZXZlbnQua2V5ID09PSAnQXJyb3dEb3duJyA/IDEgOiAtMSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50LmtleSA9PT0gJ0VudGVyJykge1xuICAgICAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkZm9jdXNlZCA9ICRwb3B1cC5maW5kKCcuZmlsdGVyLXR5cGUtb3B0aW9uLmZvY3VzZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCRmb2N1c2VkLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGZvY3VzZWQudHJpZ2dlcignY2xpY2snKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZXZlbnQua2V5ID09PSAnRW50ZXInKSB7XG4gICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gJCgnI2ZpbHRlci1pbnB1dCcpLnZhbCgpLnRyaW0oKTtcbiAgICAgICAgICAgICAgICBpZiAodGV4dCAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MucGVuZGluZ0ZpbHRlclRleHQgPSB0ZXh0O1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5zaG93RmlsdGVyVHlwZVBvcHVwKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChldmVudC5rZXkgPT09ICdFc2NhcGUnKSB7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaGlkZUZpbHRlclR5cGVQb3B1cCgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChldmVudC5rZXkgPT09ICdCYWNrc3BhY2UnICYmICQoJyNmaWx0ZXItaW5wdXQnKS52YWwoKSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgbGFzdCBjaGlwIG9uIEJhY2tzcGFjZSBpbiBlbXB0eSBpbnB1dFxuICAgICAgICAgICAgICAgIGlmIChzeXN0ZW1EaWFnbm9zdGljTG9ncy5maWx0ZXJDb25kaXRpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MucmVtb3ZlRmlsdGVyQ29uZGl0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuZmlsdGVyQ29uZGl0aW9ucy5sZW5ndGggLSAxXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBPbiBibHVyOiBhdXRvLWFkZCB0ZXh0IGFzIFwiY29udGFpbnNcIiBmaWx0ZXIgaWYgcG9wdXAgaXMgbm90IG9wZW5cbiAgICAgICAgJChkb2N1bWVudCkub24oJ2JsdXInLCAnI2ZpbHRlci1pbnB1dCcsICgpID0+IHtcbiAgICAgICAgICAgIC8vIERlbGF5IHRvIGFsbG93IGNsaWNrIG9uIHBvcHVwIG9wdGlvbiB0byBmaXJlIGZpcnN0XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCAkcG9wdXAgPSAkKCcjZmlsdGVyLXR5cGUtcG9wdXAnKTtcbiAgICAgICAgICAgICAgICBpZiAoJHBvcHVwLmlzKCc6dmlzaWJsZScpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFBvcHVwIGlzIG9wZW4gKHVzZXIgcHJlc3NlZCBFbnRlcikg4oCUIGxldCBwb3B1cCBoYW5kbGUgaXRcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gJCgnI2ZpbHRlci1pbnB1dCcpLnZhbCgpLnRyaW0oKTtcbiAgICAgICAgICAgICAgICBpZiAodGV4dCAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuYWRkRmlsdGVyQ29uZGl0aW9uKCdjb250YWlucycsIHRleHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIDE1MCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciBmaWx0ZXIgdHlwZSBvcHRpb24gY2xpY2tcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJy5maWx0ZXItdHlwZS1vcHRpb24nLCAoZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdHlwZSA9ICQoZS5jdXJyZW50VGFyZ2V0KS5kYXRhKCd0eXBlJyk7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5hZGRGaWx0ZXJDb25kaXRpb24odHlwZSwgc3lzdGVtRGlhZ25vc3RpY0xvZ3MucGVuZGluZ0ZpbHRlclRleHQpO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MucGVuZGluZ0ZpbHRlclRleHQgPSAnJztcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmhpZGVGaWx0ZXJUeXBlUG9wdXAoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIHJlbW92aW5nIGluZGl2aWR1YWwgZmlsdGVyIGNoaXBcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJyNmaWx0ZXItbGFiZWxzIC5kZWxldGUuaWNvbicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgY29uc3QgaW5kZXggPSAkKGUuY3VycmVudFRhcmdldCkuY2xvc2VzdCgnLmZpbHRlci1jb25kaXRpb24tbGFiZWwnKS5kYXRhKCdpbmRleCcpO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MucmVtb3ZlRmlsdGVyQ29uZGl0aW9uKGluZGV4KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIFwiQ2xlYXIgRmlsdGVyXCIgYnV0dG9uIGNsaWNrXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcjY2xlYXItZmlsdGVyLWJ0bicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jbGVhckFsbEZpbHRlckNvbmRpdGlvbnMoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ2xpY2sgb24gY29udGFpbmVyIGZvY3VzZXMgaW5wdXRcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJyNmaWx0ZXItY29uZGl0aW9ucy1jb250YWluZXInLCAoZSkgPT4ge1xuICAgICAgICAgICAgaWYgKCQoZS50YXJnZXQpLmlzKCcjZmlsdGVyLWNvbmRpdGlvbnMtY29udGFpbmVyJykgfHwgJChlLnRhcmdldCkuaXMoJyNmaWx0ZXItbGFiZWxzJykpIHtcbiAgICAgICAgICAgICAgICAkKCcjZmlsdGVyLWlucHV0JykuZm9jdXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGlkZSBwb3B1cCB3aGVuIGNsaWNraW5nIG91dHNpZGVcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGlmICghJChlLnRhcmdldCkuY2xvc2VzdCgnI2ZpbHRlci10eXBlLXBvcHVwLCAjZmlsdGVyLWlucHV0JykubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaGlkZUZpbHRlclR5cGVQb3B1cCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgRnVsbHNjcmVlbiBidXR0b24gY2xpY2suIEhpZGVzIHRoZSB0b2dnbGUgb25cbiAgICAgICAgLy8gYnJvd3NlcnMgd2l0aG91dCBGdWxsc2NyZWVuIEFQSSBmb3IgRE9NIGVsZW1lbnRzIChlLmcuIGlQaG9uZSBXZWJLaXQpLlxuICAgICAgICBjb25zdCAkZnVsbHNjcmVlbkJ0biA9ICQoJy5mdWxsc2NyZWVuLXRvZ2dsZS1idG4nKTtcbiAgICAgICAgY29uc3QgbG9nQ29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3N5c3RlbS1sb2dzLXNlZ21lbnQnKTtcbiAgICAgICAgaWYgKEZ1bGxzY3JlZW5Ub2dnbGUuaXNTdXBwb3J0ZWQobG9nQ29udGFpbmVyKSkge1xuICAgICAgICAgICAgJGZ1bGxzY3JlZW5CdG4ub24oJ2NsaWNrJywgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudG9nZ2xlRnVsbFNjcmVlbik7XG4gICAgICAgICAgICBGdWxsc2NyZWVuVG9nZ2xlLm9uQ2hhbmdlKHN5c3RlbURpYWdub3N0aWNMb2dzLmFkanVzdExvZ0hlaWdodCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkZnVsbHNjcmVlbkJ0bi5oaWRlKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsIGhlaWdodCBjYWxjdWxhdGlvblxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5hZGp1c3RMb2dIZWlnaHQoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlcyB0aGUgZnVsbC1zY3JlZW4gbW9kZSBvZiB0aGUgJ3N5c3RlbS1sb2dzLXNlZ21lbnQnIGVsZW1lbnQuXG4gICAgICogVXNlcyBGdWxsc2NyZWVuVG9nZ2xlIGhlbHBlciB0byBoYW5kbGUgcHJlZml4ZWQgQVBJcyBhbmQgdW5zdXBwb3J0ZWRcbiAgICAgKiBlbnZpcm9ubWVudHMgKGlQaG9uZSBXZWJLaXQgaGFzIG5vIEZ1bGxzY3JlZW4gQVBJIGZvciBET00gZWxlbWVudHMpLlxuICAgICAqXG4gICAgICogQHJldHVybiB7dm9pZH1cbiAgICAgKi9cbiAgICB0b2dnbGVGdWxsU2NyZWVuKCkge1xuICAgICAgICBjb25zdCBsb2dDb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc3lzdGVtLWxvZ3Mtc2VnbWVudCcpO1xuICAgICAgICBGdWxsc2NyZWVuVG9nZ2xlLnRvZ2dsZShsb2dDb250YWluZXIpLmNhdGNoKChlcnIpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGF0dGVtcHRpbmcgdG8gdG9nZ2xlIGZ1bGwtc2NyZWVuIG1vZGU6ICR7ZXJyLm1lc3NhZ2V9YCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGdW5jdGlvbiB0byBhZGp1c3QgdGhlIGhlaWdodCBvZiB0aGUgbG9ncyBkZXBlbmRpbmcgb24gdGhlIHNjcmVlbiBtb2RlLlxuICAgICAqL1xuICAgIGFkanVzdExvZ0hlaWdodCgpIHtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBsZXQgYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGxvZ0NvbnRlbnQub2Zmc2V0KCkudG9wIC0gNTU7XG4gICAgICAgICAgICBpZiAoRnVsbHNjcmVlblRvZ2dsZS5nZXRBY3RpdmVFbGVtZW50KCkpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiBmdWxsc2NyZWVuIG1vZGUgaXMgYWN0aXZlXG4gICAgICAgICAgICAgICAgYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gODA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBSZWNhbGN1bGF0ZSB0aGUgc2l6ZSBvZiB0aGUgQUNFIGVkaXRvclxuICAgICAgICAgICAgJCgnLmxvZy1jb250ZW50LXJlYWRvbmx5JykuY3NzKCdtaW4taGVpZ2h0JywgIGAke2FjZUhlaWdodH1weGApO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnJlc2l6ZSgpO1xuICAgICAgICB9LCAzMDApO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBsb2cgbGV2ZWwgZHJvcGRvd24gLSBWNS4wIHBhdHRlcm4gd2l0aCBIVE1MIGljb25zXG4gICAgICogU3RhdGljIGRyb3Bkb3duIHdpdGggY29sb3JlZCBpY29ucyBhbmQgdHJhbnNsYXRpb25zXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUxvZ0xldmVsRHJvcGRvd24oKSB7XG4gICAgICAgIGNvbnN0ICRoaWRkZW5JbnB1dCA9ICQoJyNsb2dMZXZlbCcpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGRyb3Bkb3duIGFscmVhZHkgZXhpc3RzXG4gICAgICAgIGlmICgkKCcjbG9nTGV2ZWwtZHJvcGRvd24nKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENyZWF0ZSBkcm9wZG93biBIVE1MIHdpdGggY29sb3JlZCBpY29uc1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCc8ZGl2PicsIHtcbiAgICAgICAgICAgIGlkOiAnbG9nTGV2ZWwtZHJvcGRvd24nLFxuICAgICAgICAgICAgY2xhc3M6ICd1aSBzZWxlY3Rpb24gZHJvcGRvd24nXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0ICR0ZXh0ID0gJCgnPGRpdj4nLCB7IGNsYXNzOiAndGV4dCcgfSkudGV4dChnbG9iYWxUcmFuc2xhdGUuc2RfQWxsTGV2ZWxzKTtcbiAgICAgICAgY29uc3QgJGljb24gPSAkKCc8aT4nLCB7IGNsYXNzOiAnZHJvcGRvd24gaWNvbicgfSk7XG4gICAgICAgIGNvbnN0ICRtZW51ID0gJCgnPGRpdj4nLCB7IGNsYXNzOiAnbWVudScgfSk7XG5cbiAgICAgICAgLy8gQnVpbGQgbWVudSBpdGVtcyB3aXRoIGNvbG9yZWQgaWNvbnNcbiAgICAgICAgY29uc3QgaXRlbXMgPSBbXG4gICAgICAgICAgICB7IHZhbHVlOiAnJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnNkX0FsbExldmVscywgaWNvbjogJycgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdFUlJPUicsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5zZF9FcnJvciwgaWNvbjogJzxpIGNsYXNzPVwiZXhjbGFtYXRpb24gY2lyY2xlIHJlZCBpY29uXCI+PC9pPicgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdXQVJOSU5HJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnNkX1dhcm5pbmcsIGljb246ICc8aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIG9yYW5nZSBpY29uXCI+PC9pPicgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdOT1RJQ0UnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc2RfTm90aWNlLCBpY29uOiAnPGkgY2xhc3M9XCJpbmZvIGNpcmNsZSBibHVlIGljb25cIj48L2k+JyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ0lORk8nLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc2RfSW5mbywgaWNvbjogJzxpIGNsYXNzPVwiY2lyY2xlIGdyZXkgaWNvblwiPjwvaT4nIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAnREVCVUcnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc2RfRGVidWcsIGljb246ICc8aSBjbGFzcz1cImJ1ZyBwdXJwbGUgaWNvblwiPjwvaT4nIH1cbiAgICAgICAgXTtcblxuICAgICAgICBpdGVtcy5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICAgICAgY29uc3QgJGl0ZW0gPSAkKCc8ZGl2PicsIHtcbiAgICAgICAgICAgICAgICBjbGFzczogJ2l0ZW0nLFxuICAgICAgICAgICAgICAgICdkYXRhLXZhbHVlJzogaXRlbS52YWx1ZVxuICAgICAgICAgICAgfSkuaHRtbChpdGVtLmljb24gKyBpdGVtLnRleHQpO1xuICAgICAgICAgICAgJG1lbnUuYXBwZW5kKCRpdGVtKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJGRyb3Bkb3duLmFwcGVuZCgkdGV4dCwgJGljb24sICRtZW51KTtcbiAgICAgICAgJGhpZGRlbklucHV0LmFmdGVyKCRkcm9wZG93bik7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTZW1hbnRpYyBVSSBkcm9wZG93blxuICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICRoaWRkZW5JbnB1dC52YWwodmFsdWUpLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIodHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGRyb3Bkb3duIFVJIGVsZW1lbnQgZnJvbSBoaWRkZW4gaW5wdXQgZmllbGQgKFY1LjAgcGF0dGVybilcbiAgICAgKi9cbiAgICBjcmVhdGVEcm9wZG93bkZyb21IaWRkZW5JbnB1dCgpIHtcbiAgICAgICAgY29uc3QgJGhpZGRlbklucHV0ID0gJCgnI2ZpbGVuYW1lcycpO1xuXG4gICAgICAgIGlmICghJGhpZGRlbklucHV0Lmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignSGlkZGVuIGlucHV0ICNmaWxlbmFtZXMgbm90IGZvdW5kJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCc8ZGl2PicsIHtcbiAgICAgICAgICAgIGlkOiAnZmlsZW5hbWVzLWRyb3Bkb3duJyxcbiAgICAgICAgICAgIGNsYXNzOiAndWkgc2VhcmNoIHNlbGVjdGlvbiBkcm9wZG93biBmaWxlbmFtZXMtc2VsZWN0IGZsdWlkJ1xuICAgICAgICB9KTtcblxuICAgICAgICAkZHJvcGRvd24uYXBwZW5kKFxuICAgICAgICAgICAgJCgnPGk+JywgeyBjbGFzczogJ2Ryb3Bkb3duIGljb24nIH0pLFxuICAgICAgICAgICAgJCgnPGlucHV0PicsIHsgdHlwZTogJ3RleHQnLCBjbGFzczogJ3NlYXJjaCcsIHRhYmluZGV4OiAwIH0pLFxuICAgICAgICAgICAgJCgnPGRpdj4nLCB7IGNsYXNzOiAnZGVmYXVsdCB0ZXh0JyB9KS50ZXh0KCdTZWxlY3QgbG9nIGZpbGUnKSxcbiAgICAgICAgICAgICQoJzxkaXY+JywgeyBjbGFzczogJ21lbnUnIH0pXG4gICAgICAgICk7XG5cbiAgICAgICAgJGhpZGRlbklucHV0LmJlZm9yZSgkZHJvcGRvd24pO1xuICAgICAgICAkaGlkZGVuSW5wdXQuaGlkZSgpO1xuXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24gPSAkZHJvcGRvd247XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBBQ0UgZWRpdG9yIGZvciBsb2cgdmlld2luZy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplQWNlKCkge1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIgPSBhY2UuZWRpdCgnbG9nLWNvbnRlbnQtcmVhZG9ubHknKTtcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgSnVsaWEgbW9kZSBpcyBhdmFpbGFibGVcbiAgICAgICAgY29uc3QganVsaWEgPSBhY2UucmVxdWlyZSgnYWNlL21vZGUvanVsaWEnKTtcbiAgICAgICAgaWYgKGp1bGlhICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIFNldCB0aGUgbW9kZSB0byBKdWxpYSBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgIGNvbnN0IEluaU1vZGUgPSBqdWxpYS5Nb2RlO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnNlc3Npb24uc2V0TW9kZShuZXcgSW5pTW9kZSgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCB0aGUgdGhlbWUgYW5kIG9wdGlvbnMgZm9yIHRoZSBBQ0UgZWRpdG9yXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlci5zZXRUaGVtZSgnYWNlL3RoZW1lL21vbm9rYWknKTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnJlbmRlcmVyLnNldFNob3dHdXR0ZXIoZmFsc2UpO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIuc2V0T3B0aW9ucyh7XG4gICAgICAgICAgICBzaG93TGluZU51bWJlcnM6IGZhbHNlLFxuICAgICAgICAgICAgc2hvd1ByaW50TWFyZ2luOiBmYWxzZSxcbiAgICAgICAgICAgIHJlYWRPbmx5OiB0cnVlLFxuICAgICAgICB9KTtcblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCdWlsZHMgYSBoaWVyYXJjaGljYWwgdHJlZSBzdHJ1Y3R1cmUgZnJvbSBmbGF0IGZpbGUgcGF0aHNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZmlsZXMgLSBUaGUgZmlsZXMgb2JqZWN0IGZyb20gQVBJIHJlc3BvbnNlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGRlZmF1bHRQYXRoIC0gVGhlIGRlZmF1bHQgc2VsZWN0ZWQgZmlsZSBwYXRoXG4gICAgICogQHJldHVybnMge0FycmF5fSBUcmVlIHN0cnVjdHVyZSBmb3IgdGhlIGRyb3Bkb3duXG4gICAgICovXG4gICAgYnVpbGRUcmVlU3RydWN0dXJlKGZpbGVzLCBkZWZhdWx0UGF0aCkge1xuICAgICAgICBjb25zdCB0cmVlID0ge307XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCB0aGUgdHJlZSBzdHJ1Y3R1cmVcbiAgICAgICAgT2JqZWN0LmVudHJpZXMoZmlsZXMpLmZvckVhY2goKFtrZXksIGZpbGVEYXRhXSkgPT4ge1xuICAgICAgICAgICAgLy8gVXNlIGZpbGVEYXRhLnBhdGggYXMgdGhlIGFjdHVhbCBmaWxlIHBhdGhcbiAgICAgICAgICAgIGNvbnN0IGZpbGVQYXRoID0gZmlsZURhdGEucGF0aCB8fCBrZXk7XG4gICAgICAgICAgICBjb25zdCBwYXJ0cyA9IGZpbGVQYXRoLnNwbGl0KCcvJyk7XG4gICAgICAgICAgICBsZXQgY3VycmVudCA9IHRyZWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHBhcnRzLmZvckVhY2goKHBhcnQsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGluZGV4ID09PSBwYXJ0cy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgaXMgYSBmaWxlXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRbcGFydF0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZmlsZScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBmaWxlUGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpemU6IGZpbGVEYXRhLnNpemUsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAoZGVmYXVsdFBhdGggJiYgZGVmYXVsdFBhdGggPT09IGZpbGVQYXRoKSB8fCAoIWRlZmF1bHRQYXRoICYmIGZpbGVEYXRhLmRlZmF1bHQpXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBpcyBhIGRpcmVjdG9yeVxuICAgICAgICAgICAgICAgICAgICBpZiAoIWN1cnJlbnRbcGFydF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRbcGFydF0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ZvbGRlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW46IHt9XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnQgPSBjdXJyZW50W3BhcnRdLmNoaWxkcmVuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbnZlcnQgdHJlZSB0byBkcm9wZG93biBpdGVtc1xuICAgICAgICByZXR1cm4gdGhpcy50cmVlVG9Ecm9wZG93bkl0ZW1zKHRyZWUsICcnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENvbnZlcnRzIHRyZWUgc3RydWN0dXJlIHRvIGRyb3Bkb3duIGl0ZW1zIHdpdGggcHJvcGVyIGZvcm1hdHRpbmdcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gdHJlZSAtIFRoZSB0cmVlIHN0cnVjdHVyZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcmVmaXggLSBQcmVmaXggZm9yIGluZGVudGF0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmVudEZvbGRlciAtIFBhcmVudCBmb2xkZXIgbmFtZSBmb3IgZ3JvdXBpbmdcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IEZvcm1hdHRlZCBkcm9wZG93biBpdGVtc1xuICAgICAqL1xuICAgIHRyZWVUb0Ryb3Bkb3duSXRlbXModHJlZSwgcHJlZml4LCBwYXJlbnRGb2xkZXJQYXRoID0gJycpIHtcbiAgICAgICAgY29uc3QgaXRlbXMgPSBbXTtcblxuICAgICAgICAvLyBTb3J0IGVudHJpZXM6IGZvbGRlcnMgZmlyc3QsIHRoZW4gZmlsZXNcbiAgICAgICAgY29uc3QgZW50cmllcyA9IE9iamVjdC5lbnRyaWVzKHRyZWUpLnNvcnQoKFthS2V5LCBhVmFsXSwgW2JLZXksIGJWYWxdKSA9PiB7XG4gICAgICAgICAgICBpZiAoYVZhbC50eXBlID09PSAnZm9sZGVyJyAmJiBiVmFsLnR5cGUgPT09ICdmaWxlJykgcmV0dXJuIC0xO1xuICAgICAgICAgICAgaWYgKGFWYWwudHlwZSA9PT0gJ2ZpbGUnICYmIGJWYWwudHlwZSA9PT0gJ2ZvbGRlcicpIHJldHVybiAxO1xuICAgICAgICAgICAgcmV0dXJuIGFLZXkubG9jYWxlQ29tcGFyZShiS2V5KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZW50cmllcy5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcbiAgICAgICAgICAgIGlmICh2YWx1ZS50eXBlID09PSAnZm9sZGVyJykge1xuICAgICAgICAgICAgICAgIC8vIEJ1aWxkIHVuaXF1ZSBmb2xkZXIgcGF0aCBmb3IgaGllcmFyY2hpY2FsIGNvbGxhcHNlXG4gICAgICAgICAgICAgICAgY29uc3QgZm9sZGVyUGF0aCA9IHBhcmVudEZvbGRlclBhdGggPyBgJHtwYXJlbnRGb2xkZXJQYXRofS8ke2tleX1gIDoga2V5O1xuXG4gICAgICAgICAgICAgICAgLy8gQWRkIGZvbGRlciBoZWFkZXIgd2l0aCB0b2dnbGUgY2FwYWJpbGl0eSBhbmQgaW5kZW50YXRpb24gZm9yIG5lc3RlZCBmb2xkZXJzXG4gICAgICAgICAgICAgICAgaXRlbXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGAke3ByZWZpeH08aSBjbGFzcz1cImNhcmV0IGRvd24gaWNvbiBmb2xkZXItdG9nZ2xlXCI+PC9pPjxpIGNsYXNzPVwiZm9sZGVyIGljb25cIj48L2k+ICR7a2V5fWAsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdmb2xkZXInLFxuICAgICAgICAgICAgICAgICAgICBmb2xkZXJOYW1lOiBmb2xkZXJQYXRoLFxuICAgICAgICAgICAgICAgICAgICBwYXJlbnRGb2xkZXI6IHBhcmVudEZvbGRlclBhdGhcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIEFkZCBjaGlsZHJlbiB3aXRoIGluY3JlYXNlZCBpbmRlbnRhdGlvbiBhbmQgcGFyZW50IGZvbGRlciBwYXRoXG4gICAgICAgICAgICAgICAgY29uc3QgY2hpbGRJdGVtcyA9IHRoaXMudHJlZVRvRHJvcGRvd25JdGVtcyh2YWx1ZS5jaGlsZHJlbiwgcHJlZml4ICsgJyZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOycsIGZvbGRlclBhdGgpO1xuICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goLi4uY2hpbGRJdGVtcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEFkZCBmaWxlIGl0ZW0gd2l0aCBwYXJlbnQgZm9sZGVyIHJlZmVyZW5jZVxuICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBgJHtwcmVmaXh9PGkgY2xhc3M9XCJmaWxlIG91dGxpbmUgaWNvblwiPjwvaT4gJHtrZXl9ICgke3ZhbHVlLnNpemV9KWAsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZS5wYXRoLFxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZDogdmFsdWUuZGVmYXVsdCxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ZpbGUnLFxuICAgICAgICAgICAgICAgICAgICBwYXJlbnRGb2xkZXI6IHBhcmVudEZvbGRlclBhdGhcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIGl0ZW1zO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBjdXN0b20gZHJvcGRvd24gbWVudSBIVE1MIGZvciBsb2cgZmlsZXMgd2l0aCBjb2xsYXBzaWJsZSBmb2xkZXJzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGNvbnRhaW5pbmcgZHJvcGRvd24gbWVudSBvcHRpb25zXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGZpZWxkcyAtIFRoZSBmaWVsZHMgaW4gdGhlIHJlc3BvbnNlIHRvIHVzZSBmb3IgdGhlIG1lbnUgb3B0aW9uc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBIVE1MIHN0cmluZyBmb3IgdGhlIGN1c3RvbSBkcm9wZG93biBtZW51XG4gICAgICovXG4gICAgY3VzdG9tRHJvcGRvd25NZW51KHJlc3BvbnNlLCBmaWVsZHMpIHtcbiAgICAgICAgY29uc3QgdmFsdWVzID0gcmVzcG9uc2VbZmllbGRzLnZhbHVlc10gfHwge307XG4gICAgICAgIGxldCBodG1sID0gJyc7XG5cbiAgICAgICAgJC5lYWNoKHZhbHVlcywgKGluZGV4LCBvcHRpb24pID0+IHtcbiAgICAgICAgICAgIC8vIEZvciB0cmVlIHN0cnVjdHVyZSBpdGVtc1xuICAgICAgICAgICAgaWYgKHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtcyAmJiBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXNbaW5kZXhdKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXRlbSA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtc1tpbmRleF07XG5cbiAgICAgICAgICAgICAgICBpZiAoaXRlbS50eXBlID09PSAnZm9sZGVyJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBGb2xkZXIgaXRlbSAtIGNsaWNrYWJsZSBoZWFkZXIgZm9yIGNvbGxhcHNlL2V4cGFuZFxuICAgICAgICAgICAgICAgICAgICAvLyBOb3QgdXNpbmcgJ2Rpc2FibGVkJyBjbGFzcyBhcyBpdCBibG9ja3MgcG9pbnRlciBldmVudHNcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZm9sZGVyUGFyZW50QXR0ciA9IGl0ZW0ucGFyZW50Rm9sZGVyID8gYGRhdGEtcGFyZW50PVwiJHtpdGVtLnBhcmVudEZvbGRlcn1cImAgOiAnJztcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImZvbGRlci1oZWFkZXIgaXRlbVwiIGRhdGEtZm9sZGVyPVwiJHtpdGVtLmZvbGRlck5hbWV9XCIgJHtmb2xkZXJQYXJlbnRBdHRyfSBkYXRhLXZhbHVlPVwiXCIgZGF0YS10ZXh0PVwiJHtpdGVtLmZvbGRlck5hbWV9XCIgc3R5bGU9XCJwb2ludGVyLWV2ZW50czogYXV0byAhaW1wb3J0YW50OyBjdXJzb3I6IHBvaW50ZXI7IGZvbnQtd2VpZ2h0OiBib2xkOyBiYWNrZ3JvdW5kOiAjZjlmOWY5O1wiPiR7aXRlbS5uYW1lfTwvZGl2PmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRmlsZSBpdGVtIHdpdGggcGFyZW50IGZvbGRlciByZWZlcmVuY2UgZm9yIGNvbGxhcHNlXG4gICAgICAgICAgICAgICAgICAgIC8vIGRhdGEtdGV4dCBjb250YWlucyBmdWxsIHBhdGggc28gRm9tYW50aWMgc2VhcmNoIG1hdGNoZXMgYnkgZm9sZGVyIG5hbWUgdG9vXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdGVkID0gaXRlbS5zZWxlY3RlZCA/ICdzZWxlY3RlZCBhY3RpdmUnIDogJyc7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhcmVudEF0dHIgPSBpdGVtLnBhcmVudEZvbGRlciA/IGBkYXRhLXBhcmVudD1cIiR7aXRlbS5wYXJlbnRGb2xkZXJ9XCJgIDogJyc7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtIGZpbGUtaXRlbSAke3NlbGVjdGVkfVwiIGRhdGEtdmFsdWU9XCIke29wdGlvbltmaWVsZHMudmFsdWVdfVwiIGRhdGEtdGV4dD1cIiR7b3B0aW9uW2ZpZWxkcy52YWx1ZV19XCIgJHtwYXJlbnRBdHRyfT4ke2l0ZW0ubmFtZX08L2Rpdj5gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gcmVndWxhciBpdGVtXG4gICAgICAgICAgICAgICAgY29uc3QgbWF5YmVEaXNhYmxlZCA9IChvcHRpb25bZmllbGRzLmRpc2FibGVkXSkgPyAnZGlzYWJsZWQgJyA6ICcnO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCIke21heWJlRGlzYWJsZWR9aXRlbVwiIGRhdGEtdmFsdWU9XCIke29wdGlvbltmaWVsZHMudmFsdWVdfVwiPiR7b3B0aW9uW2ZpZWxkcy5uYW1lXX08L2Rpdj5gO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgZm9sZGVyIGNvbGxhcHNlL2V4cGFuZCBoYW5kbGVycyBhbmQgc2VhcmNoIGJlaGF2aW9yXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvbGRlckhhbmRsZXJzKCkge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duO1xuXG4gICAgICAgIC8vIEhhbmRsZSBmb2xkZXIgaGVhZGVyIGNsaWNrcyBmb3IgY29sbGFwc2UvZXhwYW5kXG4gICAgICAgIC8vIFVzZSBkb2N1bWVudC1sZXZlbCBoYW5kbGVyIHdpdGggY2FwdHVyZSBwaGFzZSB0byBpbnRlcmNlcHQgYmVmb3JlIEZvbWFudGljXG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIGNsaWNrIGlzIGluc2lkZSBvdXIgZHJvcGRvd24ncyBmb2xkZXItaGVhZGVyXG4gICAgICAgICAgICBjb25zdCBmb2xkZXJIZWFkZXIgPSBlLnRhcmdldC5jbG9zZXN0KCcjZmlsZW5hbWVzLWRyb3Bkb3duIC5mb2xkZXItaGVhZGVyJyk7XG4gICAgICAgICAgICBpZiAoIWZvbGRlckhlYWRlcikgcmV0dXJuO1xuXG4gICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICBjb25zdCAkZm9sZGVyID0gJChmb2xkZXJIZWFkZXIpO1xuICAgICAgICAgICAgY29uc3QgZm9sZGVyUGF0aCA9ICRmb2xkZXIuZGF0YSgnZm9sZGVyJyk7XG4gICAgICAgICAgICBjb25zdCAkdG9nZ2xlID0gJGZvbGRlci5maW5kKCcuZm9sZGVyLXRvZ2dsZScpO1xuICAgICAgICAgICAgY29uc3QgJG1lbnUgPSAkZHJvcGRvd24uZmluZCgnLm1lbnUnKTtcblxuICAgICAgICAgICAgLy8gVG9nZ2xlIGZvbGRlciBzdGF0ZVxuICAgICAgICAgICAgY29uc3QgaXNDb2xsYXBzZWQgPSAkdG9nZ2xlLmhhc0NsYXNzKCdyaWdodCcpO1xuXG4gICAgICAgICAgICBpZiAoaXNDb2xsYXBzZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBFeHBhbmQgZm9sZGVyIC0gc2hvdyBvbmx5IGRpcmVjdCBjaGlsZHJlblxuICAgICAgICAgICAgICAgICR0b2dnbGUucmVtb3ZlQ2xhc3MoJ3JpZ2h0JykuYWRkQ2xhc3MoJ2Rvd24nKTtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGRpcmVjdCBjaGlsZCBmaWxlcyBhbmQgY2hpbGQgZm9sZGVyIGhlYWRlcnNcbiAgICAgICAgICAgICAgICAkbWVudS5maW5kKGAuZmlsZS1pdGVtW2RhdGEtcGFyZW50PVwiJHtmb2xkZXJQYXRofVwiXWApLnNob3coKTtcbiAgICAgICAgICAgICAgICAkbWVudS5maW5kKGAuZm9sZGVyLWhlYWRlcltkYXRhLXBhcmVudD1cIiR7Zm9sZGVyUGF0aH1cIl1gKS5zaG93KCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIENvbGxhcHNlIGZvbGRlciAtIGhpZGUgYWxsIGRlc2NlbmRhbnRzIHJlY3Vyc2l2ZWx5XG4gICAgICAgICAgICAgICAgJHRvZ2dsZS5yZW1vdmVDbGFzcygnZG93bicpLmFkZENsYXNzKCdyaWdodCcpO1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmNvbGxhcHNlRGVzY2VuZGFudHMoJG1lbnUsIGZvbGRlclBhdGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTsgLy8gY2FwdHVyZSBwaGFzZSAtIGZpcmVzIGJlZm9yZSBidWJibGluZ1xuXG4gICAgICAgIC8vIEhhbmRsZSBzZWFyY2ggaW5wdXQgLSBzaG93IGFsbCBpdGVtcyB3aGVuIHNlYXJjaGluZ1xuICAgICAgICAkZHJvcGRvd24ub24oJ2lucHV0JywgJ2lucHV0LnNlYXJjaCcsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBzZWFyY2hWYWx1ZSA9ICQoZS50YXJnZXQpLnZhbCgpLnRyaW0oKTtcbiAgICAgICAgICAgIGNvbnN0ICRtZW51ID0gJGRyb3Bkb3duLmZpbmQoJy5tZW51Jyk7XG5cbiAgICAgICAgICAgIGlmIChzZWFyY2hWYWx1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBhbGwgaXRlbXMgYW5kIGV4cGFuZCBhbGwgZm9sZGVycyBkdXJpbmcgc2VhcmNoXG4gICAgICAgICAgICAgICAgJG1lbnUuZmluZCgnLmZpbGUtaXRlbScpLnNob3coKTtcbiAgICAgICAgICAgICAgICAkbWVudS5maW5kKCcuZm9sZGVyLWhlYWRlcicpLnNob3coKTtcbiAgICAgICAgICAgICAgICAkbWVudS5maW5kKCcuZm9sZGVyLXRvZ2dsZScpLnJlbW92ZUNsYXNzKCdyaWdodCcpLmFkZENsYXNzKCdkb3duJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFJlc3RvcmUgY29sbGFwc2VkIHN0YXRlIHdoZW4gc2VhcmNoIGlzIGNsZWFyZWRcbiAgICAgICAgICAgICAgICAkbWVudS5maW5kKCcuZm9sZGVyLWhlYWRlcicpLmVhY2goKF8sIGZvbGRlcikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkZm9sZGVyID0gJChmb2xkZXIpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmb2xkZXJQYXRoID0gJGZvbGRlci5kYXRhKCdmb2xkZXInKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNDb2xsYXBzZWQgPSAkZm9sZGVyLmZpbmQoJy5mb2xkZXItdG9nZ2xlJykuaGFzQ2xhc3MoJ3JpZ2h0Jyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0NvbGxhcHNlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY29sbGFwc2VEZXNjZW5kYW50cygkbWVudSwgZm9sZGVyUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlY3Vyc2l2ZWx5IGhpZGVzIGFsbCBkZXNjZW5kYW50cyAoZmlsZXMgYW5kIHN1YmZvbGRlcnMpIG9mIGEgZ2l2ZW4gZm9sZGVyXG4gICAgICogYW5kIG1hcmtzIGNoaWxkIGZvbGRlcnMgYXMgY29sbGFwc2VkXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRtZW51IC0gVGhlIGRyb3Bkb3duIG1lbnUgZWxlbWVudFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmb2xkZXJQYXRoIC0gVGhlIGZvbGRlciBwYXRoIHdob3NlIGRlc2NlbmRhbnRzIHRvIGhpZGVcbiAgICAgKi9cbiAgICBjb2xsYXBzZURlc2NlbmRhbnRzKCRtZW51LCBmb2xkZXJQYXRoKSB7XG4gICAgICAgIC8vIEhpZGUgZGlyZWN0IGNoaWxkIGZpbGVzXG4gICAgICAgICRtZW51LmZpbmQoYC5maWxlLWl0ZW1bZGF0YS1wYXJlbnQ9XCIke2ZvbGRlclBhdGh9XCJdYCkuaGlkZSgpO1xuXG4gICAgICAgIC8vIEZpbmQgZGlyZWN0IGNoaWxkIGZvbGRlcnMsIGNvbGxhcHNlIHRoZW0gcmVjdXJzaXZlbHksIHRoZW4gaGlkZVxuICAgICAgICAkbWVudS5maW5kKGAuZm9sZGVyLWhlYWRlcltkYXRhLXBhcmVudD1cIiR7Zm9sZGVyUGF0aH1cIl1gKS5lYWNoKChfLCBjaGlsZEZvbGRlcikgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGNoaWxkRm9sZGVyID0gJChjaGlsZEZvbGRlcik7XG4gICAgICAgICAgICBjb25zdCBjaGlsZFBhdGggPSAkY2hpbGRGb2xkZXIuZGF0YSgnZm9sZGVyJyk7XG5cbiAgICAgICAgICAgIC8vIE1hcmsgY2hpbGQgZm9sZGVyIGFzIGNvbGxhcHNlZFxuICAgICAgICAgICAgJGNoaWxkRm9sZGVyLmZpbmQoJy5mb2xkZXItdG9nZ2xlJykucmVtb3ZlQ2xhc3MoJ2Rvd24nKS5hZGRDbGFzcygncmlnaHQnKTtcblxuICAgICAgICAgICAgLy8gUmVjdXJzaXZlbHkgY29sbGFwc2UgaXRzIGRlc2NlbmRhbnRzXG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jb2xsYXBzZURlc2NlbmRhbnRzKCRtZW51LCBjaGlsZFBhdGgpO1xuXG4gICAgICAgICAgICAvLyBIaWRlIHRoZSBjaGlsZCBmb2xkZXIgaGVhZGVyIGl0c2VsZlxuICAgICAgICAgICAgJGNoaWxkRm9sZGVyLmhpZGUoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEV4cGFuZHMgdGhlIGZvbGRlciBjb250YWluaW5nIHRoZSBzcGVjaWZpZWQgZmlsZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlUGF0aCAtIFRoZSBmaWxlIHBhdGggdG8gZmluZCBhbmQgZXhwYW5kIGl0cyBwYXJlbnQgZm9sZGVyXG4gICAgICovXG4gICAgZXhwYW5kRm9sZGVyRm9yRmlsZShmaWxlUGF0aCkge1xuICAgICAgICBpZiAoIWZpbGVQYXRoKSByZXR1cm47XG5cbiAgICAgICAgY29uc3QgJG1lbnUgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmZpbmQoJy5tZW51Jyk7XG4gICAgICAgIGNvbnN0ICRmaWxlSXRlbSA9ICRtZW51LmZpbmQoYC5maWxlLWl0ZW1bZGF0YS12YWx1ZT1cIiR7ZmlsZVBhdGh9XCJdYCk7XG5cbiAgICAgICAgaWYgKCRmaWxlSXRlbS5sZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIFdhbGsgdXAgdGhlIGFuY2VzdG9yIGNoYWluIGV4cGFuZGluZyBlYWNoIGZvbGRlclxuICAgICAgICAgICAgbGV0IHBhcmVudFBhdGggPSAkZmlsZUl0ZW0uZGF0YSgncGFyZW50Jyk7XG4gICAgICAgICAgICB3aGlsZSAocGFyZW50UGF0aCkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRmb2xkZXIgPSAkbWVudS5maW5kKGAuZm9sZGVyLWhlYWRlcltkYXRhLWZvbGRlcj1cIiR7cGFyZW50UGF0aH1cIl1gKTtcbiAgICAgICAgICAgICAgICBpZiAoISRmb2xkZXIubGVuZ3RoKSBicmVhaztcblxuICAgICAgICAgICAgICAgIGNvbnN0ICR0b2dnbGUgPSAkZm9sZGVyLmZpbmQoJy5mb2xkZXItdG9nZ2xlJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBTaG93IHRoZSBmb2xkZXIgaGVhZGVyIGl0c2VsZiAobWF5IGJlIGhpZGRlbiBpZiBwYXJlbnQgd2FzIGNvbGxhcHNlZClcbiAgICAgICAgICAgICAgICAkZm9sZGVyLnNob3coKTtcblxuICAgICAgICAgICAgICAgIC8vIEV4cGFuZCBpZiBjb2xsYXBzZWRcbiAgICAgICAgICAgICAgICBpZiAoJHRvZ2dsZS5oYXNDbGFzcygncmlnaHQnKSkge1xuICAgICAgICAgICAgICAgICAgICAkdG9nZ2xlLnJlbW92ZUNsYXNzKCdyaWdodCcpLmFkZENsYXNzKCdkb3duJyk7XG4gICAgICAgICAgICAgICAgICAgICRtZW51LmZpbmQoYC5maWxlLWl0ZW1bZGF0YS1wYXJlbnQ9XCIke3BhcmVudFBhdGh9XCJdYCkuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICAkbWVudS5maW5kKGAuZm9sZGVyLWhlYWRlcltkYXRhLXBhcmVudD1cIiR7cGFyZW50UGF0aH1cIl1gKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gTW92ZSB0byBncmFuZHBhcmVudFxuICAgICAgICAgICAgICAgIHBhcmVudFBhdGggPSAkZm9sZGVyLmRhdGEoJ3BhcmVudCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgaGFzaCBjaGFuZ2VzIHRvIHVwZGF0ZSB0aGUgc2VsZWN0ZWQgZmlsZVxuICAgICAqL1xuICAgIGhhbmRsZUhhc2hDaGFuZ2UoKSB7XG4gICAgICAgIC8vIFNraXAgZHVyaW5nIGluaXRpYWxpemF0aW9uIHRvIHByZXZlbnQgZHVwbGljYXRlIEFQSSBjYWxsc1xuICAgICAgICBpZiAoc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNJbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGhhc2ggPSB3aW5kb3cubG9jYXRpb24uaGFzaDtcbiAgICAgICAgaWYgKGhhc2ggJiYgaGFzaC5zdGFydHNXaXRoKCcjZmlsZT0nKSkge1xuICAgICAgICAgICAgY29uc3QgZmlsZVBhdGggPSBkZWNvZGVVUklDb21wb25lbnQoaGFzaC5zdWJzdHJpbmcoNikpO1xuICAgICAgICAgICAgaWYgKGZpbGVQYXRoICYmIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ2dldCB2YWx1ZScpICE9PSBmaWxlUGF0aCkge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBmaWxlIGV4aXN0cyBpbiBkcm9wZG93biBpdGVtc1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVFeGlzdHMgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXMuc29tZShpdGVtID0+XG4gICAgICAgICAgICAgICAgICAgIGl0ZW0udHlwZSA9PT0gJ2ZpbGUnICYmIGl0ZW0udmFsdWUgPT09IGZpbGVQYXRoXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBpZiAoZmlsZUV4aXN0cykge1xuICAgICAgICAgICAgICAgICAgICAvLyBFeHBhbmQgcGFyZW50IGZvbGRlciBiZWZvcmUgc2VsZWN0aW5nIGZpbGVcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuZXhwYW5kRm9sZGVyRm9yRmlsZShmaWxlUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGZpbGVQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignc2V0IHRleHQnLCBmaWxlUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmaWxlbmFtZScsIGZpbGVQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudXBkYXRlTG9nRnJvbVNlcnZlcigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSBmaWxlIHBhdGggZnJvbSBVUkwgaGFzaCBpZiBwcmVzZW50XG4gICAgICovXG4gICAgZ2V0RmlsZUZyb21IYXNoKCkge1xuICAgICAgICBjb25zdCBoYXNoID0gd2luZG93LmxvY2F0aW9uLmhhc2g7XG4gICAgICAgIGlmIChoYXNoICYmIGhhc2guc3RhcnRzV2l0aCgnI2ZpbGU9JykpIHtcbiAgICAgICAgICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoaGFzaC5zdWJzdHJpbmcoNikpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gZm9ybWF0IHRoZSBkcm9wZG93biBtZW51IHN0cnVjdHVyZSBiYXNlZCBvbiB0aGUgcmVzcG9uc2UuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGRhdGEuXG4gICAgICovXG4gICAgY2JGb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgcmVzcG9uc2UgaXMgdmFsaWRcbiAgICAgICAgaWYgKCFyZXNwb25zZSB8fCAhcmVzcG9uc2UucmVzdWx0IHx8ICFyZXNwb25zZS5kYXRhIHx8ICFyZXNwb25zZS5kYXRhLmZpbGVzKSB7XG4gICAgICAgICAgICAvLyBIaWRlIGRpbW1lciBvbmx5IGlmIG5vdCBpbiBhdXRvLXVwZGF0ZSBtb2RlXG4gICAgICAgICAgICBpZiAoIXN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZmlsZXMgPSByZXNwb25zZS5kYXRhLmZpbGVzO1xuXG4gICAgICAgIC8vIENoZWNrIGZvciBmaWxlIGZyb20gaGFzaCBmaXJzdFxuICAgICAgICBsZXQgZGVmVmFsID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuZ2V0RmlsZUZyb21IYXNoKCk7XG5cbiAgICAgICAgLy8gSWYgbm8gaGFzaCB2YWx1ZSwgY2hlY2sgaWYgdGhlcmUgaXMgYSBkZWZhdWx0IHZhbHVlIHNldCBmb3IgdGhlIGZpbGVuYW1lIGlucHV0IGZpZWxkXG4gICAgICAgIGlmICghZGVmVmFsKSB7XG4gICAgICAgICAgICBjb25zdCBmaWxlTmFtZSA9IHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmaWxlbmFtZScpO1xuICAgICAgICAgICAgaWYgKGZpbGVOYW1lICE9PSAnJykge1xuICAgICAgICAgICAgICAgIGRlZlZhbCA9IGZpbGVOYW1lLnRyaW0oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEJ1aWxkIHRyZWUgc3RydWN0dXJlIGZyb20gZmlsZXNcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuYnVpbGRUcmVlU3RydWN0dXJlKGZpbGVzLCBkZWZWYWwpO1xuXG4gICAgICAgIC8vIENyZWF0ZSB2YWx1ZXMgYXJyYXkgZm9yIGRyb3Bkb3duIHdpdGggYWxsIGl0ZW1zIChpbmNsdWRpbmcgZm9sZGVycylcbiAgICAgICAgY29uc3QgZHJvcGRvd25WYWx1ZXMgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXMubWFwKChpdGVtLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgaWYgKGl0ZW0udHlwZSA9PT0gJ2ZvbGRlcicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBpdGVtLm5hbWUucmVwbGFjZSgvPFtePl0qPi9nLCAnJyksIC8vIFJlbW92ZSBIVE1MIHRhZ3MgZm9yIHNlYXJjaFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJycsXG4gICAgICAgICAgICAgICAgICAgIGRpc2FibGVkOiB0cnVlXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogaXRlbS5uYW1lLnJlcGxhY2UoLzxbXj5dKj4vZywgJycpLCAvLyBSZW1vdmUgSFRNTCB0YWdzIGZvciBzZWFyY2hcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGl0ZW0udmFsdWUsXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkOiBpdGVtLnNlbGVjdGVkXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgZHJvcGRvd24gd2l0aCB2YWx1ZXNcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignc2V0dXAgbWVudScsIHtcbiAgICAgICAgICAgIHZhbHVlczogZHJvcGRvd25WYWx1ZXNcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHRoZSBkZWZhdWx0IHNlbGVjdGVkIHZhbHVlIGlmIGFueVxuICAgICAgICBjb25zdCBzZWxlY3RlZEl0ZW0gPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXMuZmluZChpdGVtID0+IGl0ZW0uc2VsZWN0ZWQpO1xuICAgICAgICBpZiAoc2VsZWN0ZWRJdGVtKSB7XG4gICAgICAgICAgICAvLyBVc2Ugc2V0VGltZW91dCB0byBlbnN1cmUgZHJvcGRvd24gaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEV4cGFuZCBwYXJlbnQgZm9sZGVyIGJlZm9yZSBzZWxlY3RpbmcgZmlsZVxuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmV4cGFuZEZvbGRlckZvckZpbGUoc2VsZWN0ZWRJdGVtLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAvLyBTZXR0aW5nIHNlbGVjdGVkIHZhbHVlIHdpbGwgdHJpZ2dlciBvbkNoYW5nZSBjYWxsYmFjayB3aGljaCBjYWxscyB1cGRhdGVMb2dGcm9tU2VydmVyKClcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBzZWxlY3RlZEl0ZW0udmFsdWUpO1xuICAgICAgICAgICAgICAgIC8vIEZvcmNlIHJlZnJlc2ggdGhlIGRyb3Bkb3duIHRvIHNob3cgdGhlIHNlbGVjdGVkIHZhbHVlXG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bigncmVmcmVzaCcpO1xuICAgICAgICAgICAgICAgIC8vIEFsc28gc2V0IHRoZSB0ZXh0IHRvIHNob3cgZnVsbCBwYXRoXG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignc2V0IHRleHQnLCBzZWxlY3RlZEl0ZW0udmFsdWUpO1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmaWxlbmFtZScsIHNlbGVjdGVkSXRlbS52YWx1ZSk7XG4gICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICB9IGVsc2UgaWYgKGRlZlZhbCkge1xuICAgICAgICAgICAgLy8gSWYgd2UgaGF2ZSBhIGRlZmF1bHQgdmFsdWUgYnV0IG5vIGl0ZW0gd2FzIG1hcmtlZCBhcyBzZWxlY3RlZCxcbiAgICAgICAgICAgIC8vIHRyeSB0byBmaW5kIGFuZCBzZWxlY3QgaXQgbWFudWFsbHlcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1Ub1NlbGVjdCA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtcy5maW5kKGl0ZW0gPT5cbiAgICAgICAgICAgICAgICBpdGVtLnR5cGUgPT09ICdmaWxlJyAmJiBpdGVtLnZhbHVlID09PSBkZWZWYWxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBpZiAoaXRlbVRvU2VsZWN0KSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEV4cGFuZCBwYXJlbnQgZm9sZGVyIGJlZm9yZSBzZWxlY3RpbmcgZmlsZVxuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5leHBhbmRGb2xkZXJGb3JGaWxlKGl0ZW1Ub1NlbGVjdC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNldHRpbmcgc2VsZWN0ZWQgdmFsdWUgd2lsbCB0cmlnZ2VyIG9uQ2hhbmdlIGNhbGxiYWNrIHdoaWNoIGNhbGxzIHVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKVxuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBpdGVtVG9TZWxlY3QudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdyZWZyZXNoJyk7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldCB0ZXh0JywgaXRlbVRvU2VsZWN0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2ZpbGVuYW1lJywgaXRlbVRvU2VsZWN0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBIaWRlIHRoZSBkaW1tZXIgYWZ0ZXIgbG9hZGluZyBvbmx5IGlmIG5vIGZpbGUgaXMgc2VsZWN0ZWRcbiAgICAgICAgICAgICAgICBpZiAoIXN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBIaWRlIHRoZSBkaW1tZXIgYWZ0ZXIgbG9hZGluZyBvbmx5IGlmIG5vIGZpbGUgaXMgc2VsZWN0ZWRcbiAgICAgICAgICAgIGlmICghc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBNYXJrIGluaXRpYWxpemF0aW9uIGFzIGNvbXBsZXRlIHRvIGFsbG93IGhhc2hjaGFuZ2UgaGFuZGxlciB0byB3b3JrXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNJbml0aWFsaXppbmcgPSBmYWxzZTtcbiAgICAgICAgfSwgMjAwKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgY2hhbmdpbmcgdGhlIGxvZyBmaWxlIGluIHRoZSBzZWxlY3QgZHJvcGRvd24uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHNlbGVjdGVkIHZhbHVlLlxuICAgICAqL1xuICAgIGNiT25DaGFuZ2VGaWxlKHZhbHVlKSB7XG4gICAgICAgIGlmICh2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBkcm9wZG93biB0ZXh0IHRvIHNob3cgdGhlIGZ1bGwgZmlsZSBwYXRoXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldCB0ZXh0JywgdmFsdWUpO1xuXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmaWxlbmFtZScsIHZhbHVlKTtcblxuICAgICAgICAvLyBVcGRhdGUgVVJMIGhhc2ggd2l0aCB0aGUgc2VsZWN0ZWQgZmlsZVxuICAgICAgICB3aW5kb3cubG9jYXRpb24uaGFzaCA9ICdmaWxlPScgKyBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpO1xuXG4gICAgICAgIC8vIFJlc2V0IGZpbHRlcnMgb25seSBpZiB1c2VyIG1hbnVhbGx5IGNoYW5nZWQgdGhlIGZpbGUgKG5vdCBkdXJpbmcgaW5pdGlhbGl6YXRpb24pXG4gICAgICAgIGlmICghc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNJbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnJlc2V0RmlsdGVycygpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSGlkZSBhdXRvLXJlZnJlc2ggYnV0dG9uIGZvciByb3RhdGVkIGxvZyBmaWxlcyAodGhleSBkb24ndCBjaGFuZ2UpXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUF1dG9SZWZyZXNoVmlzaWJpbGl0eSh2YWx1ZSk7XG5cbiAgICAgICAgLy8gUmVzZXQgbGFzdCBrbm93biBkYXRhIGVuZCBmb3IgbmV3IGZpbGVcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MubGFzdEtub3duRGF0YUVuZCA9IG51bGw7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGltZSByYW5nZSBpcyBhdmFpbGFibGUgZm9yIHRoaXMgZmlsZVxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jaGVja1RpbWVSYW5nZUF2YWlsYWJpbGl0eSh2YWx1ZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGZpbGUgaXMgYSByb3RhdGVkIGxvZyBmaWxlIChhcmNoaXZlZCwgbm8gbG9uZ2VyIGJlaW5nIHdyaXR0ZW4gdG8pXG4gICAgICogUm90YXRlZCBmaWxlcyBoYXZlIHN1ZmZpeGVzIGxpa2U6IC4wLCAuMSwgLjIsIC5neiwgLjEuZ3osIC4yLmd6LCBldGMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVuYW1lIC0gTG9nIGZpbGUgcGF0aFxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGZpbGUgaXMgcm90YXRlZC9hcmNoaXZlZFxuICAgICAqL1xuICAgIGlzUm90YXRlZExvZ0ZpbGUoZmlsZW5hbWUpIHtcbiAgICAgICAgaWYgKCFmaWxlbmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIC8vIE1hdGNoIHBhdHRlcm5zOiAuMCwgLjEsIC4yLCAuLi4sIC5neiwgLjAuZ3osIC4xLmd6LCBldGMuXG4gICAgICAgIHJldHVybiAvXFwuXFxkKygkfFxcLmd6JCl8XFwuZ3okLy50ZXN0KGZpbGVuYW1lKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGF1dG8tcmVmcmVzaCBidXR0b24gdmlzaWJpbGl0eSBiYXNlZCBvbiBmaWxlIHR5cGVcbiAgICAgKiBIaWRlIGZvciByb3RhdGVkIGZpbGVzLCBzaG93IGZvciBhY3RpdmUgbG9nIGZpbGVzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVuYW1lIC0gTG9nIGZpbGUgcGF0aFxuICAgICAqL1xuICAgIHVwZGF0ZUF1dG9SZWZyZXNoVmlzaWJpbGl0eShmaWxlbmFtZSkge1xuICAgICAgICBjb25zdCAkYXV0b0J0biA9ICQoJyNzaG93LWxhc3QtbG9nLWF1dG8nKTtcbiAgICAgICAgY29uc3QgaXNSb3RhdGVkID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNSb3RhdGVkTG9nRmlsZShmaWxlbmFtZSk7XG5cbiAgICAgICAgaWYgKGlzUm90YXRlZCkge1xuICAgICAgICAgICAgLy8gU3RvcCBhdXRvLXJlZnJlc2ggaWYgaXQgd2FzIGFjdGl2ZVxuICAgICAgICAgICAgaWYgKHN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgICAgICRhdXRvQnRuLmZpbmQoJy5pY29ucyBpLnJlZnJlc2gnKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHVwZGF0ZUxvZ1ZpZXdXb3JrZXIuc3RvcCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJGF1dG9CdG4uaGlkZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJGF1dG9CdG4uc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3cgZmlsdGVyIHR5cGUgcG9wdXAgYmVsb3cgdGhlIGZpbHRlciBpbnB1dC5cbiAgICAgKiBQcmUtc2VsZWN0cyB0aGUgZmlyc3Qgb3B0aW9uIGZvciBpbW1lZGlhdGUga2V5Ym9hcmQgbmF2aWdhdGlvbi5cbiAgICAgKi9cbiAgICBzaG93RmlsdGVyVHlwZVBvcHVwKCkge1xuICAgICAgICBjb25zdCAkcG9wdXAgPSAkKCcjZmlsdGVyLXR5cGUtcG9wdXAnKTtcbiAgICAgICAgJHBvcHVwLnJlbW92ZUNsYXNzKCdoaWRkZW4nKVxuICAgICAgICAgICAgLmNzcyh7dG9wOiAnJywgbGVmdDogJycsIGRpc3BsYXk6ICcnfSlcbiAgICAgICAgICAgIC5zaG93KCk7XG4gICAgICAgIC8vIFByZS1zZWxlY3QgZmlyc3Qgb3B0aW9uIGZvciBrZXlib2FyZCBuYXZpZ2F0aW9uXG4gICAgICAgICRwb3B1cC5maW5kKCcuZmlsdGVyLXR5cGUtb3B0aW9uJykucmVtb3ZlQ2xhc3MoJ2ZvY3VzZWQnKTtcbiAgICAgICAgJHBvcHVwLmZpbmQoJy5maWx0ZXItdHlwZS1vcHRpb24nKS5maXJzdCgpLmFkZENsYXNzKCdmb2N1c2VkJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhpZGUgdGhlIGZpbHRlciB0eXBlIHBvcHVwXG4gICAgICovXG4gICAgaGlkZUZpbHRlclR5cGVQb3B1cCgpIHtcbiAgICAgICAgY29uc3QgJHBvcHVwID0gJCgnI2ZpbHRlci10eXBlLXBvcHVwJyk7XG4gICAgICAgICRwb3B1cC5maW5kKCcuZmlsdGVyLXR5cGUtb3B0aW9uJykucmVtb3ZlQ2xhc3MoJ2ZvY3VzZWQnKTtcbiAgICAgICAgJHBvcHVwLmFkZENsYXNzKCdoaWRkZW4nKS5oaWRlKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIE5hdmlnYXRlIGZpbHRlciB0eXBlIHBvcHVwIG9wdGlvbnMgd2l0aCBhcnJvdyBrZXlzLlxuICAgICAqIFdyYXBzIGFyb3VuZCBhdCBib3VuZGFyaWVzLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBkaXJlY3Rpb24gLSAxIGZvciBkb3duLCAtMSBmb3IgdXBcbiAgICAgKi9cbiAgICBuYXZpZ2F0ZUZpbHRlclBvcHVwKGRpcmVjdGlvbikge1xuICAgICAgICBjb25zdCAkcG9wdXAgPSAkKCcjZmlsdGVyLXR5cGUtcG9wdXAnKTtcbiAgICAgICAgY29uc3QgJG9wdGlvbnMgPSAkcG9wdXAuZmluZCgnLmZpbHRlci10eXBlLW9wdGlvbicpO1xuICAgICAgICBjb25zdCAkZm9jdXNlZCA9ICRvcHRpb25zLmZpbHRlcignLmZvY3VzZWQnKTtcblxuICAgICAgICBsZXQgaW5kZXggPSAkb3B0aW9ucy5pbmRleCgkZm9jdXNlZCk7XG4gICAgICAgIGluZGV4ICs9IGRpcmVjdGlvbjtcblxuICAgICAgICAvLyBXcmFwIGFyb3VuZFxuICAgICAgICBpZiAoaW5kZXggPCAwKSB7XG4gICAgICAgICAgICBpbmRleCA9ICRvcHRpb25zLmxlbmd0aCAtIDE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGluZGV4ID49ICRvcHRpb25zLmxlbmd0aCkge1xuICAgICAgICAgICAgaW5kZXggPSAwO1xuICAgICAgICB9XG5cbiAgICAgICAgJG9wdGlvbnMucmVtb3ZlQ2xhc3MoJ2ZvY3VzZWQnKTtcbiAgICAgICAgJG9wdGlvbnMuZXEoaW5kZXgpLmFkZENsYXNzKCdmb2N1c2VkJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZCBhIGZpbHRlciBjb25kaXRpb24sIHN5bmMgdG8gZm9ybSwgcmVuZGVyIGxhYmVscywgYW5kIHJlbG9hZCBsb2dcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZSAtICdjb250YWlucycgb3IgJ25vdENvbnRhaW5zJ1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIHRoZSBmaWx0ZXIgdGV4dFxuICAgICAqL1xuICAgIGFkZEZpbHRlckNvbmRpdGlvbih0eXBlLCB2YWx1ZSkge1xuICAgICAgICBpZiAoIXZhbHVlIHx8IHZhbHVlLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5maWx0ZXJDb25kaXRpb25zLnB1c2goe3R5cGUsIHZhbHVlOiB2YWx1ZS50cmltKCl9KTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Muc3luY0ZpbHRlckNvbmRpdGlvbnNUb0Zvcm0oKTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MucmVuZGVyRmlsdGVyTGFiZWxzKCk7XG4gICAgICAgICQoJyNmaWx0ZXItaW5wdXQnKS52YWwoJycpO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy51cGRhdGVMb2dGcm9tU2VydmVyKHRydWUpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmUgYSBmaWx0ZXIgY29uZGl0aW9uIGJ5IGluZGV4XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGluZGV4IC0gY29uZGl0aW9uIGluZGV4IHRvIHJlbW92ZVxuICAgICAqL1xuICAgIHJlbW92ZUZpbHRlckNvbmRpdGlvbihpbmRleCkge1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5maWx0ZXJDb25kaXRpb25zLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnN5bmNGaWx0ZXJDb25kaXRpb25zVG9Gb3JtKCk7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnJlbmRlckZpbHRlckxhYmVscygpO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy51cGRhdGVMb2dGcm9tU2VydmVyKHRydWUpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDbGVhciBhbGwgZmlsdGVyIGNvbmRpdGlvbnNcbiAgICAgKi9cbiAgICBjbGVhckFsbEZpbHRlckNvbmRpdGlvbnMoKSB7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmZpbHRlckNvbmRpdGlvbnMgPSBbXTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Muc3luY0ZpbHRlckNvbmRpdGlvbnNUb0Zvcm0oKTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MucmVuZGVyRmlsdGVyTGFiZWxzKCk7XG4gICAgICAgICQoJyNmaWx0ZXItaW5wdXQnKS52YWwoJycpO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy51cGRhdGVMb2dGcm9tU2VydmVyKHRydWUpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXJpYWxpemUgZmlsdGVyQ29uZGl0aW9ucyBhcnJheSBhcyBKU09OIGludG8gaGlkZGVuICNmaWx0ZXIgZmllbGRcbiAgICAgKi9cbiAgICBzeW5jRmlsdGVyQ29uZGl0aW9uc1RvRm9ybSgpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5maWx0ZXJDb25kaXRpb25zLmxlbmd0aCA+IDBcbiAgICAgICAgICAgID8gSlNPTi5zdHJpbmdpZnkoc3lzdGVtRGlhZ25vc3RpY0xvZ3MuZmlsdGVyQ29uZGl0aW9ucylcbiAgICAgICAgICAgIDogJyc7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmaWx0ZXInLCB2YWx1ZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbmRlciBsYWJlbCBjaGlwcyBpbnNpZGUgI2ZpbHRlci1sYWJlbHMgZnJvbSBmaWx0ZXJDb25kaXRpb25zXG4gICAgICovXG4gICAgcmVuZGVyRmlsdGVyTGFiZWxzKCkge1xuICAgICAgICBjb25zdCAkY29udGFpbmVyID0gJCgnI2ZpbHRlci1sYWJlbHMnKTtcbiAgICAgICAgJGNvbnRhaW5lci5lbXB0eSgpO1xuXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmZpbHRlckNvbmRpdGlvbnMuZm9yRWFjaCgoY29uZGl0aW9uLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY3NzQ2xhc3MgPSBjb25kaXRpb24udHlwZSA9PT0gJ25vdENvbnRhaW5zJyA/ICdub3QtY29udGFpbnMnIDogJ2NvbnRhaW5zJztcbiAgICAgICAgICAgIGNvbnN0IGljb25DbGFzcyA9IGNvbmRpdGlvbi50eXBlID09PSAnbm90Q29udGFpbnMnID8gJ2JhbicgOiAnY2hlY2sgY2lyY2xlJztcbiAgICAgICAgICAgIGNvbnN0IGljb25Db2xvciA9IGNvbmRpdGlvbi50eXBlID09PSAnbm90Q29udGFpbnMnID8gJ3JlZCcgOiAndGVhbCc7XG4gICAgICAgICAgICBjb25zdCAkbGFiZWwgPSAkKGA8c3BhbiBjbGFzcz1cImZpbHRlci1jb25kaXRpb24tbGFiZWwgJHtjc3NDbGFzc31cIiBkYXRhLWluZGV4PVwiJHtpbmRleH1cIj48L3NwYW4+YCk7XG4gICAgICAgICAgICAkbGFiZWwuYXBwZW5kKGA8aSBjbGFzcz1cIiR7aWNvbkNsYXNzfSBpY29uICR7aWNvbkNvbG9yfVwiPjwvaT5gKTtcbiAgICAgICAgICAgICRsYWJlbC5hcHBlbmQoYDxzcGFuPiR7JCgnPHNwYW4+JykudGV4dChjb25kaXRpb24udmFsdWUpLmh0bWwoKX08L3NwYW4+YCk7XG4gICAgICAgICAgICAkbGFiZWwuYXBwZW5kKCc8aSBjbGFzcz1cImRlbGV0ZSBpY29uXCI+PC9pPicpO1xuICAgICAgICAgICAgJGNvbnRhaW5lci5hcHBlbmQoJGxhYmVsKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZmlsdGVyIGNvbmRpdGlvbnMgZnJvbSBVUkwgcGFyYW1ldGVyIG9yIGV4aXN0aW5nIGhpZGRlbiBmaWVsZCB2YWx1ZS5cbiAgICAgKiBIYW5kbGVzIGxlZ2FjeSBwbGFpbi1zdHJpbmcgZm9ybWF0IChlLmcuIFwiW0MtMDAwMDQ3MjFdJltDLTAwMDA0NzIzXVwiIGZyb20gQ0RSIGxpbmtzKVxuICAgICAqIGJ5IGNvbnZlcnRpbmcgJi1zZXBhcmF0ZWQgcGFydHMgaW50byBpbmRpdmlkdWFsIFwiY29udGFpbnNcIiBjb25kaXRpb25zLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVGaWx0ZXJGcm9tVXJsKCkge1xuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICBjb25zdCBmaWx0ZXJQYXJhbSA9IHVybFBhcmFtcy5nZXQoJ2ZpbHRlcicpO1xuXG4gICAgICAgIGlmIChmaWx0ZXJQYXJhbSAmJiBmaWx0ZXJQYXJhbS50cmltKCkgIT09ICcnKSB7XG4gICAgICAgICAgICBjb25zdCB0cmltbWVkID0gZmlsdGVyUGFyYW0udHJpbSgpO1xuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiBpdCdzIEpTT04gZm9ybWF0XG4gICAgICAgICAgICBpZiAodHJpbW1lZC5zdGFydHNXaXRoKCdbJykpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKHRyaW1tZWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShwYXJzZWQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5maWx0ZXJDb25kaXRpb25zID0gcGFyc2VkLmZpbHRlcihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoYykgPT4gYyAmJiBjLnZhbHVlICYmIGMudHlwZVxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSW52YWxpZCBKU09OLCB0cmVhdCBhcyBsZWdhY3lcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuZmlsdGVyQ29uZGl0aW9ucyA9IHRyaW1tZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zcGxpdCgnJicpXG4gICAgICAgICAgICAgICAgICAgICAgICAubWFwKChwKSA9PiBwLnRyaW0oKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoKHApID0+IHAgIT09ICcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLm1hcCgocCkgPT4gKHt0eXBlOiAnY29udGFpbnMnLCB2YWx1ZTogcH0pKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIExlZ2FjeSBwbGFpbiBzdHJpbmc6IHNwbGl0IGJ5ICYgaW50byBjb250YWlucyBjb25kaXRpb25zXG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuZmlsdGVyQ29uZGl0aW9ucyA9IHRyaW1tZWRcbiAgICAgICAgICAgICAgICAgICAgLnNwbGl0KCcmJylcbiAgICAgICAgICAgICAgICAgICAgLm1hcCgocCkgPT4gcC50cmltKCkpXG4gICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoKHApID0+IHAgIT09ICcnKVxuICAgICAgICAgICAgICAgICAgICAubWFwKChwKSA9PiAoe3R5cGU6ICdjb250YWlucycsIHZhbHVlOiBwfSkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5zeW5jRmlsdGVyQ29uZGl0aW9uc1RvRm9ybSgpO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MucmVuZGVyRmlsdGVyTGFiZWxzKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVzZXQgYWxsIGZpbHRlcnMgd2hlbiBjaGFuZ2luZyBsb2cgZmlsZXNcbiAgICAgKi9cbiAgICByZXNldEZpbHRlcnMoKSB7XG4gICAgICAgIC8vIERlYWN0aXZhdGUgYWxsIHF1aWNrLXBlcmlvZCBidXR0b25zXG4gICAgICAgICQoJy5wZXJpb2QtYnRuJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuXG4gICAgICAgIC8vIFJlc2V0IGxvZ0xldmVsIGRyb3Bkb3duIHRvIGRlZmF1bHQgKEFsbCBMZXZlbHMgLSBlbXB0eSB2YWx1ZSlcbiAgICAgICAgJCgnI2xvZ0xldmVsLWRyb3Bkb3duJykuZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsICcnKTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2xvZ0xldmVsJywgJycpO1xuXG4gICAgICAgIC8vIE5PVEU6IEZpbHRlciBjb25kaXRpb25zIGFyZSBpbnRlbnRpb25hbGx5IHByZXNlcnZlZCB3aGVuIGNoYW5naW5nIGZpbGVzLlxuICAgICAgICAvLyBXaGVuIHVzZXIgbmF2aWdhdGVzIGZyb20gQ0RSIHdpdGggZmlsdGVyIHBhcmFtcyAoZS5nLiA/ZmlsdGVyPVtDLTAwMDA0NzIxXSksXG4gICAgICAgIC8vIHRoZSBmaWx0ZXJzIHNob3VsZCBwZXJzaXN0IGFjcm9zcyBmaWxlIGNoYW5nZXMgKHZlcmJvc2Ug4oaSIHZlcmJvc2UuMCkuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwZXJpb2QgYnV0dG9ucyB2aXNpYmlsaXR5IGJhc2VkIG9uIGxvZyBmaWxlIGR1cmF0aW9uXG4gICAgICogU2hvd3Mgb25seSBidXR0b25zIGZvciBwZXJpb2RzIHRoYXQgYXJlIDw9IGxvZyBmaWxlIGR1cmF0aW9uXG4gICAgICogSGlkZXMgZW50aXJlIGNvbnRhaW5lciBpZiBubyBidXR0b25zIGFyZSB2aXNpYmxlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGxvZ0R1cmF0aW9uIC0gTG9nIGZpbGUgZHVyYXRpb24gaW4gc2Vjb25kc1xuICAgICAqL1xuICAgIHVwZGF0ZVBlcmlvZEJ1dHRvbnNWaXNpYmlsaXR5KGxvZ0R1cmF0aW9uKSB7XG4gICAgICAgIGNvbnN0ICRwZXJpb2RCdXR0b25zID0gJCgnLnBlcmlvZC1idG4nKTtcbiAgICAgICAgY29uc3QgJHBlcmlvZENvbnRhaW5lciA9ICQoJyNwZXJpb2QtYnV0dG9ucycpO1xuICAgICAgICBsZXQgbGFyZ2VzdFZpc2libGVQZXJpb2QgPSAwO1xuICAgICAgICBsZXQgJGxhcmdlc3RWaXNpYmxlQnV0dG9uID0gbnVsbDtcbiAgICAgICAgbGV0IHZpc2libGVDb3VudCA9IDA7XG5cbiAgICAgICAgJHBlcmlvZEJ1dHRvbnMuZWFjaCgoaW5kZXgsIGJ1dHRvbikgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQoYnV0dG9uKTtcbiAgICAgICAgICAgIGNvbnN0IHBlcmlvZCA9IHBhcnNlSW50KCRidXR0b24uZGF0YSgncGVyaW9kJyksIDEwKTtcblxuICAgICAgICAgICAgLy8gU2hvdyBidXR0b24gaWYgcGVyaW9kIGlzIGxlc3MgdGhhbiBvciBlcXVhbCB0byBsb2cgZHVyYXRpb25cbiAgICAgICAgICAgIC8vIEFkZCAxMCUgdG9sZXJhbmNlIGZvciByb3VuZGluZy9lZGdlIGNhc2VzXG4gICAgICAgICAgICBpZiAocGVyaW9kIDw9IGxvZ0R1cmF0aW9uICogMS4xKSB7XG4gICAgICAgICAgICAgICAgJGJ1dHRvbi5zaG93KCk7XG4gICAgICAgICAgICAgICAgdmlzaWJsZUNvdW50Kys7XG4gICAgICAgICAgICAgICAgLy8gVHJhY2sgdGhlIGxhcmdlc3QgdmlzaWJsZSBwZXJpb2QgZm9yIGRlZmF1bHQgc2VsZWN0aW9uXG4gICAgICAgICAgICAgICAgaWYgKHBlcmlvZCA+IGxhcmdlc3RWaXNpYmxlUGVyaW9kKSB7XG4gICAgICAgICAgICAgICAgICAgIGxhcmdlc3RWaXNpYmxlUGVyaW9kID0gcGVyaW9kO1xuICAgICAgICAgICAgICAgICAgICAkbGFyZ2VzdFZpc2libGVCdXR0b24gPSAkYnV0dG9uO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJGJ1dHRvbi5oaWRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhpZGUgZW50aXJlIGNvbnRhaW5lciBpZiBubyBidXR0b25zIGFyZSB2aXNpYmxlXG4gICAgICAgIC8vIEFsc28gdG9nZ2xlIGNsYXNzIG9uIHBhcmVudCB0byByZW1vdmUgZ2FwIGZvciBwcm9wZXIgYWxpZ25tZW50XG4gICAgICAgIGNvbnN0ICR0aW1lQ29udHJvbHNJbmxpbmUgPSAkKCcudGltZS1jb250cm9scy1pbmxpbmUnKTtcbiAgICAgICAgaWYgKHZpc2libGVDb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgJHBlcmlvZENvbnRhaW5lci5oaWRlKCk7XG4gICAgICAgICAgICAkdGltZUNvbnRyb2xzSW5saW5lLmFkZENsYXNzKCduby1wZXJpb2QtYnV0dG9ucycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJHBlcmlvZENvbnRhaW5lci5zaG93KCk7XG4gICAgICAgICAgICAkdGltZUNvbnRyb2xzSW5saW5lLnJlbW92ZUNsYXNzKCduby1wZXJpb2QtYnV0dG9ucycpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0IGxhcmdlc3QgdmlzaWJsZSBidXR0b24gYXMgYWN0aXZlIChpZiBubyBidXR0b24gaXMgY3VycmVudGx5IGFjdGl2ZSlcbiAgICAgICAgaWYgKCRsYXJnZXN0VmlzaWJsZUJ1dHRvbiAmJiAhJHBlcmlvZEJ1dHRvbnMuZmlsdGVyKCcuYWN0aXZlJykuaXMoJzp2aXNpYmxlJykpIHtcbiAgICAgICAgICAgICRwZXJpb2RCdXR0b25zLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgICRsYXJnZXN0VmlzaWJsZUJ1dHRvbi5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgdGltZSByYW5nZSBpcyBhdmFpbGFibGUgZm9yIHRoZSBzZWxlY3RlZCBsb2cgZmlsZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlbmFtZSAtIExvZyBmaWxlIHBhdGhcbiAgICAgKi9cbiAgICBjaGVja1RpbWVSYW5nZUF2YWlsYWJpbGl0eShmaWxlbmFtZSkge1xuICAgICAgICAvLyBTaG93IGRpbW1lciBvbmx5IGlmIG5vdCBpbiBhdXRvLXVwZGF0ZSBtb2RlXG4gICAgICAgIGlmICghc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlKSB7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBUcnkgdG8gZ2V0IHRpbWUgcmFuZ2UgZm9yIHRoaXMgZmlsZVxuICAgICAgICAgICAgU3lzbG9nQVBJLmdldExvZ1RpbWVSYW5nZShmaWxlbmFtZSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEudGltZV9yYW5nZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBUaW1lIHJhbmdlIGlzIGF2YWlsYWJsZSAtIHVzZSB0aW1lLWJhc2VkIG5hdmlnYXRpb25cbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaW5pdGlhbGl6ZU5hdmlnYXRpb24ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVGltZSByYW5nZSBub3QgYXZhaWxhYmxlIC0gdXNlIGxpbmUgbnVtYmVyIGZhbGxiYWNrXG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmluaXRpYWxpemVOYXZpZ2F0aW9uKG51bGwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgY2hlY2tpbmcgdGltZSByYW5nZTonLCBlcnJvcik7XG4gICAgICAgICAgICAvLyBGYWxsYmFjayB0byBsaW5lIG51bWJlciBtb2RlXG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pbml0aWFsaXplTmF2aWdhdGlvbihudWxsKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHVuaXZlcnNhbCBuYXZpZ2F0aW9uIHdpdGggdGltZSBvciBsaW5lIG51bWJlciBtb2RlXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHRpbWVSYW5nZURhdGEgLSBUaW1lIHJhbmdlIGRhdGEgZnJvbSBBUEkgKG9wdGlvbmFsKVxuICAgICAqL1xuICAgIGluaXRpYWxpemVOYXZpZ2F0aW9uKHRpbWVSYW5nZURhdGEpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgd2UgaGF2ZSB2YWxpZCB0aW1lIHJhbmdlIHdpdGggYWN0dWFsIHRpbWVzdGFtcHMgKG5vdCBudWxsKVxuICAgICAgICBjb25zdCBoYXNWYWxpZFRpbWVSYW5nZSA9IHRpbWVSYW5nZURhdGEgJiZcbiAgICAgICAgICAgIHRpbWVSYW5nZURhdGEudGltZV9yYW5nZSAmJlxuICAgICAgICAgICAgdHlwZW9mIHRpbWVSYW5nZURhdGEudGltZV9yYW5nZS5zdGFydCA9PT0gJ251bWJlcicgJiZcbiAgICAgICAgICAgIHR5cGVvZiB0aW1lUmFuZ2VEYXRhLnRpbWVfcmFuZ2UuZW5kID09PSAnbnVtYmVyJztcblxuICAgICAgICAvLyBDaGVjayBpZiB0aW1lIHJhbmdlIGlzIG1lYW5pbmdmdWwgKG1vcmUgdGhhbiAxIHNlY29uZCBvZiBkYXRhKVxuICAgICAgICBjb25zdCBoYXNNdWx0aXBsZVRpbWVzdGFtcHMgPSBoYXNWYWxpZFRpbWVSYW5nZSAmJlxuICAgICAgICAgICAgKHRpbWVSYW5nZURhdGEudGltZV9yYW5nZS5lbmQgLSB0aW1lUmFuZ2VEYXRhLnRpbWVfcmFuZ2Uuc3RhcnQpID4gMTtcblxuICAgICAgICBpZiAoaGFzVmFsaWRUaW1lUmFuZ2UgJiYgaGFzTXVsdGlwbGVUaW1lc3RhbXBzKSB7XG4gICAgICAgICAgICAvLyBUaW1lLWJhc2VkIG1vZGVcbiAgICAgICAgICAgIHRoaXMudGltZVNsaWRlckVuYWJsZWQgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VGltZVJhbmdlID0gdGltZVJhbmdlRGF0YS50aW1lX3JhbmdlO1xuXG4gICAgICAgICAgICAvLyBDYWxjdWxhdGUgbG9nIGZpbGUgZHVyYXRpb24gYW5kIHVwZGF0ZSBwZXJpb2QgYnV0dG9ucyB2aXNpYmlsaXR5XG4gICAgICAgICAgICBjb25zdCBsb2dEdXJhdGlvbiA9IHRoaXMuY3VycmVudFRpbWVSYW5nZS5lbmQgLSB0aGlzLmN1cnJlbnRUaW1lUmFuZ2Uuc3RhcnQ7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVBlcmlvZEJ1dHRvbnNWaXNpYmlsaXR5KGxvZ0R1cmF0aW9uKTtcblxuICAgICAgICAgICAgLy8gU2hvdyBwZXJpb2QgYnV0dG9ucyBmb3IgdGltZS1iYXNlZCBuYXZpZ2F0aW9uXG4gICAgICAgICAgICAkKCcjcGVyaW9kLWJ1dHRvbnMnKS5zaG93KCk7XG5cbiAgICAgICAgICAgIC8vIFNldCBzZXJ2ZXIgdGltZXpvbmUgb2Zmc2V0XG4gICAgICAgICAgICBpZiAodGltZVJhbmdlRGF0YS5zZXJ2ZXJfdGltZXpvbmVfb2Zmc2V0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBTVkdUaW1lbGluZS5zZXJ2ZXJUaW1lem9uZU9mZnNldCA9IHRpbWVSYW5nZURhdGEuc2VydmVyX3RpbWV6b25lX29mZnNldDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIFNoYXJlIFRaIG1ldGFkYXRhIHdpdGggdGhlIGdsb2JhbCBQYnhEYXRlVGltZSBoZWxwZXIgc28gYW55XG4gICAgICAgICAgICAvLyBmb3JtYXR0ZXIgb24gdGhpcyBwYWdlIChzbGlkZXIgdG9vbHRpcHMsIHBvcHVwcywgZnV0dXJlIHRhYmxlcylcbiAgICAgICAgICAgIC8vIHJlbmRlcnMgaW4gUEJYLXNlcnZlciB0aW1lIHJlZ2FyZGxlc3Mgb2YgYnJvd3NlciBsb2NhbGUuXG4gICAgICAgICAgICBQYnhEYXRlVGltZS5zZXRTZXJ2ZXJNZXRhKHtcbiAgICAgICAgICAgICAgICBzZXJ2ZXJfdGltZXpvbmU6IHRpbWVSYW5nZURhdGEuc2VydmVyX3RpbWV6b25lLFxuICAgICAgICAgICAgICAgIHNlcnZlcl90aW1lem9uZV9vZmZzZXQ6IHRpbWVSYW5nZURhdGEuc2VydmVyX3RpbWV6b25lX29mZnNldCxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgLy8gS2VlcCB0aGUgdGltZSBzbGlkZXIncyBsb2NhbCBvZmZzZXQgaW4gc3luYyB3aXRoIFBieERhdGVUaW1lXG4gICAgICAgICAgICAvLyBiZWNhdXNlIFRpbWVTbGlkZXIuZm9ybWF0VGltZXN0YW1wIG5vdyBkZWxlZ2F0ZXMgdG8gdGhlIGhlbHBlci5cbiAgICAgICAgICAgIGlmICh0eXBlb2YgVGltZVNsaWRlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBUaW1lU2xpZGVyLnNlcnZlclRpbWV6b25lT2Zmc2V0ID0gUGJ4RGF0ZVRpbWUuc2VydmVyVGltZXpvbmVPZmZzZXQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgU1ZHIHRpbWVsaW5lIHdpdGggdGltZSByYW5nZVxuICAgICAgICAgICAgU1ZHVGltZWxpbmUuaW5pdGlhbGl6ZSgnI3RpbWUtc2xpZGVyLWNvbnRhaW5lcicsIHRoaXMuY3VycmVudFRpbWVSYW5nZSk7XG5cbiAgICAgICAgICAgIC8vIFNldCBjYWxsYmFjayBmb3IgdGltZSB3aW5kb3cgY2hhbmdlc1xuICAgICAgICAgICAgLy8gQWx3YXlzIHVzZSBsYXRlc3Q9dHJ1ZSBzbyB0aGUgbW9zdCByZWNlbnQgbG9nIGVudHJpZXMgYXJlIGRpc3BsYXllZFxuICAgICAgICAgICAgLy8gVHJ1bmNhdGlvbiAoaWYgYW55KSBoYXBwZW5zIG9uIHRoZSBsZWZ0IHNpZGUsIHdoaWNoIGlzIGxlc3MgZGlzcnVwdGl2ZVxuICAgICAgICAgICAgU1ZHVGltZWxpbmUub25SYW5nZUNoYW5nZSA9IChzdGFydCwgZW5kLCBkcmFnZ2VkSGFuZGxlKSA9PiB7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9hZExvZ0J5VGltZVJhbmdlKHN0YXJ0LCBlbmQsIHRydWUpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gU2V0IGNhbGxiYWNrIGZvciB0cnVuY2F0ZWQgem9uZSBjbGlja3NcbiAgICAgICAgICAgIC8vIExlZnQgem9uZXMgKHRpbWVsaW5lLXRydW5jYXRlZC1sZWZ0KTogZGF0YSB3YXMgY3V0IGZyb20gYmVnaW5uaW5nLCBsb2FkIHdpdGggbGF0ZXN0PXRydWVcbiAgICAgICAgICAgIC8vIFJpZ2h0IHpvbmVzICh0aW1lbGluZS10cnVuY2F0ZWQtcmlnaHQpOiBkYXRhIHdhcyBjdXQgZnJvbSBlbmQsIGxvYWQgd2l0aCBsYXRlc3Q9ZmFsc2VcbiAgICAgICAgICAgIFNWR1RpbWVsaW5lLm9uVHJ1bmNhdGVkWm9uZUNsaWNrID0gKHN0YXJ0LCBlbmQsIGlzTGVmdFpvbmUpID0+IHtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2FkTG9nQnlUaW1lUmFuZ2Uoc3RhcnQsIGVuZCwgaXNMZWZ0Wm9uZSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBMb2FkIGluaXRpYWwgY2h1bmsgd2l0aCBsYXRlc3Q9dHJ1ZSB0byBzaG93IG5ld2VzdCBlbnRyaWVzXG4gICAgICAgICAgICAvLyBQYXNzIGlzSW5pdGlhbExvYWQ9dHJ1ZSB0byBzdXBwcmVzcyB0cnVuY2F0ZWQgem9uZSBkaXNwbGF5IG9uIGZpcnN0IGxvYWRcbiAgICAgICAgICAgIC8vIFVzZSB0aGUgbGFyZ2VzdCB2aXNpYmxlIHBlcmlvZCBidXR0b24gb3IgMSBob3VyIGFzIGZhbGxiYWNrXG4gICAgICAgICAgICBjb25zdCAkYWN0aXZlQnV0dG9uID0gJCgnLnBlcmlvZC1idG4uYWN0aXZlOnZpc2libGUnKTtcbiAgICAgICAgICAgIGNvbnN0IGluaXRpYWxQZXJpb2QgPSAkYWN0aXZlQnV0dG9uLmxlbmd0aCA+IDBcbiAgICAgICAgICAgICAgICA/IHBhcnNlSW50KCRhY3RpdmVCdXR0b24uZGF0YSgncGVyaW9kJyksIDEwKVxuICAgICAgICAgICAgICAgIDogTWF0aC5taW4oMzYwMCwgbG9nRHVyYXRpb24pO1xuICAgICAgICAgICAgY29uc3QgaW5pdGlhbFN0YXJ0ID0gTWF0aC5tYXgodGhpcy5jdXJyZW50VGltZVJhbmdlLmVuZCAtIGluaXRpYWxQZXJpb2QsIHRoaXMuY3VycmVudFRpbWVSYW5nZS5zdGFydCk7XG4gICAgICAgICAgICB0aGlzLmxvYWRMb2dCeVRpbWVSYW5nZShpbml0aWFsU3RhcnQsIHRoaXMuY3VycmVudFRpbWVSYW5nZS5lbmQsIHRydWUsIHRydWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTGluZSBudW1iZXIgZmFsbGJhY2sgbW9kZVxuICAgICAgICAgICAgdGhpcy50aW1lU2xpZGVyRW5hYmxlZCA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VGltZVJhbmdlID0gbnVsbDtcblxuICAgICAgICAgICAgLy8gSGlkZSBwZXJpb2QgYnV0dG9ucyBpbiBsaW5lIG51bWJlciBtb2RlXG4gICAgICAgICAgICAkKCcjcGVyaW9kLWJ1dHRvbnMnKS5oaWRlKCk7XG5cbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgU1ZHIHRpbWVsaW5lIHdpdGggbGluZSBudW1iZXJzXG4gICAgICAgICAgICAvLyBGb3Igbm93LCB1c2UgZGVmYXVsdCByYW5nZSB1bnRpbCB3ZSBnZXQgdG90YWwgbGluZSBjb3VudFxuICAgICAgICAgICAgY29uc3QgbGluZVJhbmdlID0geyBzdGFydDogMCwgZW5kOiAxMDAwMCB9O1xuICAgICAgICAgICAgU1ZHVGltZWxpbmUuaW5pdGlhbGl6ZSgnI3RpbWUtc2xpZGVyLWNvbnRhaW5lcicsIGxpbmVSYW5nZSwgJ2xpbmVzJyk7XG5cbiAgICAgICAgICAgIC8vIFNldCBjYWxsYmFjayBmb3IgbGluZSByYW5nZSBjaGFuZ2VzXG4gICAgICAgICAgICBTVkdUaW1lbGluZS5vblJhbmdlQ2hhbmdlID0gKHN0YXJ0LCBlbmQpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBMb2FkIGJ5IGxpbmUgbnVtYmVycyAob2Zmc2V0L2xpbmVzKVxuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmxvYWRMb2dCeUxpbmVzKE1hdGguZmxvb3Ioc3RhcnQpLCBNYXRoLmNlaWwoZW5kIC0gc3RhcnQpKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIExvYWQgaW5pdGlhbCBsaW5lc1xuICAgICAgICAgICAgdGhpcy51cGRhdGVMb2dGcm9tU2VydmVyKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBsb2cgYnkgbGluZSBudW1iZXJzIChmb3IgZmlsZXMgd2l0aG91dCB0aW1lc3RhbXBzKVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBvZmZzZXQgLSBTdGFydGluZyBsaW5lIG51bWJlclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBsaW5lcyAtIE51bWJlciBvZiBsaW5lcyB0byBsb2FkXG4gICAgICovXG4gICAgbG9hZExvZ0J5TGluZXMob2Zmc2V0LCBsaW5lcykge1xuICAgICAgICAvLyBTaG93IGRpbW1lciBvbmx5IGlmIG5vdCBpbiBhdXRvLXVwZGF0ZSBtb2RlXG4gICAgICAgIGlmICghc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlKSB7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IHtcbiAgICAgICAgICAgIGZpbGVuYW1lOiB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmaWxlbmFtZScpLFxuICAgICAgICAgICAgZmlsdGVyOiB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmaWx0ZXInKSB8fCAnJyxcbiAgICAgICAgICAgIGxvZ0xldmVsOiB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdsb2dMZXZlbCcpIHx8ICcnLFxuICAgICAgICAgICAgb2Zmc2V0OiBNYXRoLm1heCgwLCBvZmZzZXQpLFxuICAgICAgICAgICAgbGluZXM6IE1hdGgubWluKDUwMDAsIE1hdGgubWF4KDEwMCwgbGluZXMpKVxuICAgICAgICB9O1xuXG4gICAgICAgIFN5c2xvZ0FQSS5nZXRMb2dGcm9tRmlsZShwYXJhbXMsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgLy8gSGlkZSBkaW1tZXIgb25seSBpZiBub3QgaW4gYXV0by11cGRhdGUgbW9kZVxuICAgICAgICAgICAgaWYgKCFzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiAnY29udGVudCcgaW4gcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIC8vIFNldCBjb250ZW50IGluIGVkaXRvciAoZXZlbiBpZiBlbXB0eSlcbiAgICAgICAgICAgICAgICB0aGlzLnZpZXdlci5zZXRWYWx1ZShyZXNwb25zZS5kYXRhLmNvbnRlbnQgfHwgJycsIC0xKTtcblxuICAgICAgICAgICAgICAgIC8vIEdvIHRvIHRoZSBiZWdpbm5pbmdcbiAgICAgICAgICAgICAgICB0aGlzLnZpZXdlci5nb3RvTGluZSgxKTtcbiAgICAgICAgICAgICAgICB0aGlzLnZpZXdlci5zY3JvbGxUb0xpbmUoMCwgdHJ1ZSwgdHJ1ZSwgKCkgPT4ge30pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBsb2cgYnkgdGltZSByYW5nZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzdGFydFRpbWVzdGFtcCAtIFN0YXJ0IHRpbWVzdGFtcFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBlbmRUaW1lc3RhbXAgLSBFbmQgdGltZXN0YW1wXG4gICAgICogQHBhcmFtIHtib29sZWFufSBsYXRlc3QgLSBJZiB0cnVlLCByZXR1cm4gbmV3ZXN0IGxpbmVzIGZpcnN0IChmb3IgaW5pdGlhbCBsb2FkKVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNJbml0aWFsTG9hZCAtIElmIHRydWUsIHN1cHByZXNzIHRydW5jYXRlZCB6b25lIGRpc3BsYXlcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGlzQXV0b1VwZGF0ZSAtIElmIHRydWUsIHNraXAgdGltZWxpbmUgcmVjYWxjdWxhdGlvbiAob25seSB1cGRhdGUgY29udGVudClcbiAgICAgKi9cbiAgICBsb2FkTG9nQnlUaW1lUmFuZ2Uoc3RhcnRUaW1lc3RhbXAsIGVuZFRpbWVzdGFtcCwgbGF0ZXN0ID0gZmFsc2UsIGlzSW5pdGlhbExvYWQgPSBmYWxzZSwgaXNBdXRvVXBkYXRlID0gZmFsc2UpIHtcbiAgICAgICAgLy8gU2hvdyBkaW1tZXIgb25seSBpZiBub3QgaW4gYXV0by11cGRhdGUgbW9kZVxuICAgICAgICBpZiAoIXN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwYXJhbXMgPSB7XG4gICAgICAgICAgICBmaWxlbmFtZTogdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZmlsZW5hbWUnKSxcbiAgICAgICAgICAgIGZpbHRlcjogdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZmlsdGVyJykgfHwgJycsXG4gICAgICAgICAgICBsb2dMZXZlbDogdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnbG9nTGV2ZWwnKSB8fCAnJyxcbiAgICAgICAgICAgIGRhdGVGcm9tOiBzdGFydFRpbWVzdGFtcCxcbiAgICAgICAgICAgIGRhdGVUbzogZW5kVGltZXN0YW1wLFxuICAgICAgICAgICAgbGluZXM6IDUwMDAsIC8vIE1heGltdW0gbGluZXMgdG8gbG9hZFxuICAgICAgICAgICAgbGF0ZXN0OiBsYXRlc3QgLy8gSWYgdHJ1ZSwgcmV0dXJuIG5ld2VzdCBsaW5lcyAodGFpbCB8IHRhYylcbiAgICAgICAgfTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgU3lzbG9nQVBJLmdldExvZ0Zyb21GaWxlKHBhcmFtcywgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhICYmICdjb250ZW50JyBpbiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0NvbnRlbnQgPSByZXNwb25zZS5kYXRhLmNvbnRlbnQgfHwgJyc7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzQXV0b1VwZGF0ZSAmJiBuZXdDb250ZW50Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEF1dG8tdXBkYXRlIG1vZGU6IGFwcGVuZCBvbmx5IG5ldyBsaW5lc1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY3VycmVudENvbnRlbnQgPSB0aGlzLnZpZXdlci5nZXRWYWx1ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3TGluZXMgPSB0aGlzLmZpbmROZXdMaW5lcyhjdXJyZW50Q29udGVudCwgbmV3Q29udGVudCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXdMaW5lcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQXBwZW5kIG5ldyBsaW5lcyBhdCB0aGUgZW5kXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2Vzc2lvbiA9IHRoaXMudmlld2VyLnNlc3Npb247XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbGFzdFJvdyA9IHNlc3Npb24uZ2V0TGVuZ3RoKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Vzc2lvbi5pbnNlcnQoeyByb3c6IGxhc3RSb3csIGNvbHVtbjogMCB9LCAnXFxuJyArIG5ld0xpbmVzLmpvaW4oJ1xcbicpKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdvIHRvIHRoZSBsYXN0IGxpbmUgdG8gZm9sbG93IG5ldyBlbnRyaWVzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmluYWxSb3cgPSBzZXNzaW9uLmdldExlbmd0aCgpIC0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaW5hbENvbHVtbiA9IHNlc3Npb24uZ2V0TGluZShmaW5hbFJvdykubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudmlld2VyLmdvdG9MaW5lKGZpbmFsUm93ICsgMSwgZmluYWxDb2x1bW4pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gTm9ybWFsIG1vZGU6IHNldCBjb250ZW50IGFuZCBnbyB0byBlbmRcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudmlld2VyLnNldFZhbHVlKG5ld0NvbnRlbnQsIC0xKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gR28gdG8gdGhlIGVuZCBvZiB0aGUgbG9nXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByb3cgPSB0aGlzLnZpZXdlci5zZXNzaW9uLmdldExlbmd0aCgpIC0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbHVtbiA9IHRoaXMudmlld2VyLnNlc3Npb24uZ2V0TGluZShyb3cpLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudmlld2VyLmdvdG9MaW5lKHJvdyArIDEsIGNvbHVtbik7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBBZGp1c3Qgc2xpZGVyIHRvIGFjdHVhbCBsb2FkZWQgdGltZSByYW5nZSAoc2lsZW50bHkpXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmFjdHVhbF9yYW5nZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYWN0dWFsID0gcmVzcG9uc2UuZGF0YS5hY3R1YWxfcmFuZ2U7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFsd2F5cyB1cGRhdGUgZnVsbFJhbmdlIGJvdW5kYXJ5IGJhc2VkIG9uIGFjdHVhbCBkYXRhIGZyb20gc2VydmVyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGlzIGVuc3VyZXMgbm8tZGF0YSB6b25lcyBkaXNwbGF5IGNvcnJlY3RseSBhZnRlciByZWZyZXNoXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0dWFsLmVuZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFNWR1RpbWVsaW5lLnVwZGF0ZURhdGFCb3VuZGFyeShhY3R1YWwuZW5kKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUcmFjayBsYXN0IGtub3duIGRhdGEgZW5kIGZvciByZWZyZXNoIGFuY2hvcmluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmxhc3RLbm93bkRhdGFFbmQgPSBhY3R1YWwuZW5kO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBBbHdheXMgdXBkYXRlIHRpbWVsaW5lIHdpdGggc2VydmVyIHJlc3BvbnNlIChleGNlcHQgZHVyaW5nIGF1dG8tdXBkYXRlKVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdXBkYXRlRnJvbVNlcnZlclJlc3BvbnNlKCkgaGFuZGxlczpcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIC0gVXBkYXRpbmcgc2VsZWN0ZWRSYW5nZSB0byBhY3R1YWwgZGF0YSBib3VuZGFyaWVzXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAtIFByZXNlcnZpbmcgdmlzaWJsZVJhbmdlLmVuZCBpZiBpdCB3YXMgZXh0ZW5kZWQgdG8gY3VycmVudCB0aW1lIChmb3Igbm8tZGF0YSB6b25lcylcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIC0gTWFuYWdpbmcgdHJ1bmNhdGlvbiB6b25lcyBkaXNwbGF5XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWlzQXV0b1VwZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFNWR1RpbWVsaW5lLnVwZGF0ZUZyb21TZXJ2ZXJSZXNwb25zZShhY3R1YWwsIHN0YXJ0VGltZXN0YW1wLCBlbmRUaW1lc3RhbXAsIGlzSW5pdGlhbExvYWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gSGlkZSBkaW1tZXIgb25seSBpZiBub3QgaW4gYXV0by11cGRhdGUgbW9kZVxuICAgICAgICAgICAgICAgIGlmICghc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgbG9hZGluZyBsb2cgYnkgdGltZSByYW5nZTonLCBlcnJvcik7XG4gICAgICAgICAgICAvLyBIaWRlIGRpbW1lciBvbmx5IGlmIG5vdCBpbiBhdXRvLXVwZGF0ZSBtb2RlXG4gICAgICAgICAgICBpZiAoIXN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFwcGx5IHF1aWNrIHBlcmlvZCBzZWxlY3Rpb24gKFlhbmRleCBDbG91ZCBMb2dWaWV3ZXIgc3R5bGUpXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHBlcmlvZFNlY29uZHMgLSBQZXJpb2QgaW4gc2Vjb25kc1xuICAgICAqL1xuICAgIGFwcGx5UXVpY2tQZXJpb2QocGVyaW9kU2Vjb25kcykge1xuICAgICAgICBpZiAoIXRoaXMuY3VycmVudFRpbWVSYW5nZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlIG5ldyBhcHBseVBlcmlvZCBtZXRob2QgdGhhdCBoYW5kbGVzIHZpc2libGUgcmFuZ2UgYW5kIGF1dG8tY2VudGVyaW5nXG4gICAgICAgIFNWR1RpbWVsaW5lLmFwcGx5UGVyaW9kKHBlcmlvZFNlY29uZHMpO1xuICAgICAgICAvLyBDYWxsYmFjayB3aWxsIGJlIHRyaWdnZXJlZCBhdXRvbWF0aWNhbGx5IGJ5IFNWR1RpbWVsaW5lXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFwcGx5IGxvZyBsZXZlbCBmaWx0ZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbGV2ZWwgLSBMb2cgbGV2ZWwgKGFsbCwgZXJyb3IsIHdhcm5pbmcsIGluZm8sIGRlYnVnKVxuICAgICAqL1xuICAgIGFwcGx5TG9nTGV2ZWxGaWx0ZXIobGV2ZWwpIHtcbiAgICAgICAgbGV0IGZpbHRlclBhdHRlcm4gPSAnJztcblxuICAgICAgICAvLyBDcmVhdGUgcmVnZXggcGF0dGVybiBiYXNlZCBvbiBsZXZlbFxuICAgICAgICBzd2l0Y2ggKGxldmVsKSB7XG4gICAgICAgICAgICBjYXNlICdlcnJvcic6XG4gICAgICAgICAgICAgICAgZmlsdGVyUGF0dGVybiA9ICdFUlJPUnxDUklUSUNBTHxGQVRBTCc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICd3YXJuaW5nJzpcbiAgICAgICAgICAgICAgICBmaWx0ZXJQYXR0ZXJuID0gJ1dBUk5JTkd8V0FSTic7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdpbmZvJzpcbiAgICAgICAgICAgICAgICBmaWx0ZXJQYXR0ZXJuID0gJ0lORk8nO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZGVidWcnOlxuICAgICAgICAgICAgICAgIGZpbHRlclBhdHRlcm4gPSAnREVCVUcnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnYWxsJzpcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgZmlsdGVyUGF0dGVybiA9ICcnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIGZpbHRlciBmaWVsZFxuICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmaWx0ZXInLCBmaWx0ZXJQYXR0ZXJuKTtcblxuICAgICAgICAvLyBSZWxvYWQgbG9ncyB3aXRoIG5ldyBmaWx0ZXJcbiAgICAgICAgdGhpcy51cGRhdGVMb2dGcm9tU2VydmVyKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZldGNoZXMgdGhlIGxvZyBmaWxlIGNvbnRlbnQgZnJvbSB0aGUgc2VydmVyLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gcHJlc2VydmVSYW5nZSAtIElmIHRydWUsIHVzZSBjdXJyZW50IFNWRyB0aW1lbGluZSBzZWxlY3Rpb24gaW5zdGVhZCBvZlxuICAgICAqICAgcmVjYWxjdWxhdGluZyB0byBcImxhc3QgMSBob3VyXCIuIFVzZWQgd2hlbiBmaWx0ZXIvbGV2ZWwgY2hhbmdlcyB0byBrZWVwIHRoZSBzYW1lIHZpZXcuXG4gICAgICovXG4gICAgdXBkYXRlTG9nRnJvbVNlcnZlcihwcmVzZXJ2ZVJhbmdlID0gZmFsc2UpIHtcbiAgICAgICAgaWYgKHRoaXMudGltZVNsaWRlckVuYWJsZWQpIHtcbiAgICAgICAgICAgIC8vIEluIHRpbWUgc2xpZGVyIG1vZGUsIHJlbG9hZCBjdXJyZW50IHdpbmRvd1xuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudFRpbWVSYW5nZSkge1xuXG4gICAgICAgICAgICAgICAgLy8gV2hlbiBwcmVzZXJ2ZVJhbmdlIGlzIHRydWUgKGZpbHRlci9sZXZlbCBjaGFuZ2UpLCB1c2UgY3VycmVudCB0aW1lbGluZSBzZWxlY3Rpb25cbiAgICAgICAgICAgICAgICAvLyBXSFk6IENoYW5naW5nIGZpbHRlcnMgc2hvdWxkIG5vdCByZXNldCB0aGUgdGltZSB3aW5kb3cg4oCUIHVzZXIgZXhwZWN0cyB0byBzZWVcbiAgICAgICAgICAgICAgICAvLyB0aGUgc2FtZSBwZXJpb2Qgd2l0aCBkaWZmZXJlbnQgZmlsdGVyaW5nIGFwcGxpZWRcbiAgICAgICAgICAgICAgICBpZiAocHJlc2VydmVSYW5nZSAmJiBTVkdUaW1lbGluZS5zZWxlY3RlZFJhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubG9hZExvZ0J5VGltZVJhbmdlKFxuICAgICAgICAgICAgICAgICAgICAgICAgU1ZHVGltZWxpbmUuc2VsZWN0ZWRSYW5nZS5zdGFydCxcbiAgICAgICAgICAgICAgICAgICAgICAgIFNWR1RpbWVsaW5lLnNlbGVjdGVkUmFuZ2UuZW5kLFxuICAgICAgICAgICAgICAgICAgICAgICAgdHJ1ZSwgZmFsc2UsIHRoaXMuaXNBdXRvVXBkYXRlQWN0aXZlXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBvbmVIb3VyID0gMzYwMDtcblxuICAgICAgICAgICAgICAgIC8vIEdldCBjdXJyZW50IGZpbGVuYW1lIHRvIGNoZWNrIGlmIGl0J3MgYSByb3RhdGVkIGxvZyBmaWxlXG4gICAgICAgICAgICAgICAgY29uc3QgZmlsZW5hbWUgPSB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmaWxlbmFtZScpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzUm90YXRlZCA9IHRoaXMuaXNSb3RhdGVkTG9nRmlsZShmaWxlbmFtZSk7XG5cbiAgICAgICAgICAgICAgICBsZXQgZW5kVGltZXN0YW1wO1xuICAgICAgICAgICAgICAgIGxldCBzdGFydFRpbWVzdGFtcDtcblxuICAgICAgICAgICAgICAgIGlmIChpc1JvdGF0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRm9yIHJvdGF0ZWQgZmlsZXM6IHVzZSB0aGUgZmlsZSdzIGFjdHVhbCB0aW1lIHJhbmdlXG4gICAgICAgICAgICAgICAgICAgIC8vIFJvdGF0ZWQgZmlsZXMgZG9uJ3QgcmVjZWl2ZSBuZXcgZGF0YSwgc28gY3VycmVudFRpbWVSYW5nZSBpcyBmaXhlZFxuICAgICAgICAgICAgICAgICAgICBlbmRUaW1lc3RhbXAgPSB0aGlzLmN1cnJlbnRUaW1lUmFuZ2UuZW5kO1xuICAgICAgICAgICAgICAgICAgICBzdGFydFRpbWVzdGFtcCA9IE1hdGgubWF4KHRoaXMuY3VycmVudFRpbWVSYW5nZS5lbmQgLSBvbmVIb3VyLCB0aGlzLmN1cnJlbnRUaW1lUmFuZ2Uuc3RhcnQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZvciBhY3RpdmUgbG9nIGZpbGVzOiB1c2UgY3VycmVudCB0aW1lIHRvIGNhcHR1cmUgbmV3IGVudHJpZXNcbiAgICAgICAgICAgICAgICAgICAgZW5kVGltZXN0YW1wID0gTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gV0hZOiBBbmNob3Igc3RhcnRUaW1lc3RhbXAgdG8gdGhlIGxhc3Qga25vd24gZGF0YSBlbmQsIG5vdCB3YWxsIGNsb2NrIHRpbWUuXG4gICAgICAgICAgICAgICAgICAgIC8vIFVzaW5nIFwibm93IC0gcGVyaW9kXCIgcHJvZHVjZXMgYW4gZW1wdHkgcmFuZ2Ugd2hlbiB0aGUgZmlsZSBoYXNuJ3QgYmVlblxuICAgICAgICAgICAgICAgICAgICAvLyB3cml0dGVuIHRvIHJlY2VudGx5IChlLmcuLCBpZGxlIG1vZHVsZSBsb2dzIGxpa2UgTW9kdWxlQXV0b0NSTS9TYWxvblN5bmNlci5sb2cpLlxuICAgICAgICAgICAgICAgICAgICAvLyBsYXN0S25vd25EYXRhRW5kIGhvbGRzIHRoZSBhY3R1YWwgdGltZXN0YW1wIG9mIHRoZSBsYXN0IGxpbmUgZnJvbSB0aGUgQVBJIHJlc3BvbnNlLlxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhRW5kID0gdGhpcy5sYXN0S25vd25EYXRhRW5kIHx8IHRoaXMuY3VycmVudFRpbWVSYW5nZS5lbmQ7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0VGltZXN0YW1wID0gTWF0aC5tYXgoZGF0YUVuZCAtIG9uZUhvdXIsIHRoaXMuY3VycmVudFRpbWVSYW5nZS5zdGFydCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIGN1cnJlbnRUaW1lUmFuZ2UuZW5kIHRvIHJlZmxlY3QgbmV3IGRhdGEgYXZhaWxhYmlsaXR5XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFRpbWVSYW5nZS5lbmQgPSBlbmRUaW1lc3RhbXA7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRk9SQ0UgdXBkYXRlIHRoZSBTVkcgdGltZWxpbmUgdmlzaWJsZSByYW5nZSB0byBjdXJyZW50IHRpbWVcbiAgICAgICAgICAgICAgICAgICAgLy8gZm9yY2U9dHJ1ZSBlbnN1cmVzIHZpc2libGVSYW5nZS5lbmQgaXMgc2V0IGV2ZW4gaWYgaXQgd2FzIGFscmVhZHkgPj0gZW5kVGltZXN0YW1wXG4gICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgaGFuZGxlcyB0aW1lem9uZSBkaWZmZXJlbmNlcyB3aGVyZSBzZXJ2ZXIgdGltZSBtaWdodCBhcHBlYXIgXCJpbiB0aGUgZnV0dXJlXCJcbiAgICAgICAgICAgICAgICAgICAgU1ZHVGltZWxpbmUuZXh0ZW5kUmFuZ2UoZW5kVGltZXN0YW1wLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBVc2UgbGF0ZXN0PXRydWUgdG8gc2hvdyBuZXdlc3QgZW50cmllcyAoZm9yIHNob3ctbGFzdC1sb2cgLyBhdXRvLXVwZGF0ZSBidXR0b25zKVxuICAgICAgICAgICAgICAgIC8vIFBhc3MgaXNBdXRvVXBkYXRlPXRydWUgd2hlbiBhdXRvLXJlZnJlc2ggaXMgYWN0aXZlIHRvIHByZXZlbnQgdGltZWxpbmUgZmxpY2tlcmluZ1xuICAgICAgICAgICAgICAgIHRoaXMubG9hZExvZ0J5VGltZVJhbmdlKHN0YXJ0VGltZXN0YW1wLCBlbmRUaW1lc3RhbXAsIHRydWUsIGZhbHNlLCB0aGlzLmlzQXV0b1VwZGF0ZUFjdGl2ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBMaW5lIG51bWJlciBtb2RlXG4gICAgICAgICAgICBjb25zdCBwYXJhbXMgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgICAgICBwYXJhbXMubGluZXMgPSA1MDAwOyAvLyBNYXggbGluZXNcbiAgICAgICAgICAgIFN5c2xvZ0FQSS5nZXRMb2dGcm9tRmlsZShwYXJhbXMsIHN5c3RlbURpYWdub3N0aWNMb2dzLmNiVXBkYXRlTG9nVGV4dCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRmluZCBuZXcgbGluZXMgdGhhdCBhcmUgbm90IGluIGN1cnJlbnQgY29udGVudFxuICAgICAqIENvbXBhcmVzIGxhc3QgbGluZXMgb2YgY3VycmVudCBjb250ZW50IHdpdGggbmV3IGNvbnRlbnQgdG8gZmluZCBvdmVybGFwXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGN1cnJlbnRDb250ZW50IC0gQ3VycmVudCBlZGl0b3IgY29udGVudFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuZXdDb250ZW50IC0gTmV3IGNvbnRlbnQgZnJvbSBzZXJ2ZXJcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IEFycmF5IG9mIG5ldyBsaW5lcyB0byBhcHBlbmRcbiAgICAgKi9cbiAgICBmaW5kTmV3TGluZXMoY3VycmVudENvbnRlbnQsIG5ld0NvbnRlbnQpIHtcbiAgICAgICAgaWYgKCFjdXJyZW50Q29udGVudCB8fCBjdXJyZW50Q29udGVudC50cmltKCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAvLyBJZiBlZGl0b3IgaXMgZW1wdHksIGFsbCBsaW5lcyBhcmUgbmV3XG4gICAgICAgICAgICByZXR1cm4gbmV3Q29udGVudC5zcGxpdCgnXFxuJykuZmlsdGVyKGxpbmUgPT4gbGluZS50cmltKCkubGVuZ3RoID4gMCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjdXJyZW50TGluZXMgPSBjdXJyZW50Q29udGVudC5zcGxpdCgnXFxuJyk7XG4gICAgICAgIGNvbnN0IG5ld0xpbmVzID0gbmV3Q29udGVudC5zcGxpdCgnXFxuJyk7XG5cbiAgICAgICAgLy8gR2V0IGxhc3Qgbm9uLWVtcHR5IGxpbmUgZnJvbSBjdXJyZW50IGNvbnRlbnQgYXMgYW5jaG9yXG4gICAgICAgIGxldCBhbmNob3JMaW5lID0gJyc7XG4gICAgICAgIGZvciAobGV0IGkgPSBjdXJyZW50TGluZXMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50TGluZXNbaV0udHJpbSgpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBhbmNob3JMaW5lID0gY3VycmVudExpbmVzW2ldO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFhbmNob3JMaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3TGluZXMuZmlsdGVyKGxpbmUgPT4gbGluZS50cmltKCkubGVuZ3RoID4gMCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGaW5kIGFuY2hvciBsaW5lIGluIG5ldyBjb250ZW50XG4gICAgICAgIGxldCBhbmNob3JJbmRleCA9IC0xO1xuICAgICAgICBmb3IgKGxldCBpID0gbmV3TGluZXMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgIGlmIChuZXdMaW5lc1tpXSA9PT0gYW5jaG9yTGluZSkge1xuICAgICAgICAgICAgICAgIGFuY2hvckluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChhbmNob3JJbmRleCA9PT0gLTEpIHtcbiAgICAgICAgICAgIC8vIEFuY2hvciBub3QgZm91bmQgLSBjb250ZW50IGNoYW5nZWQgc2lnbmlmaWNhbnRseSwgcmV0dXJuIGVtcHR5XG4gICAgICAgICAgICAvLyBUaGlzIHByZXZlbnRzIGR1cGxpY2F0ZXMgd2hlbiBsb2cgcm90YXRlcyBvciBmaWx0ZXIgY2hhbmdlc1xuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmV0dXJuIGxpbmVzIGFmdGVyIGFuY2hvclxuICAgICAgICBjb25zdCByZXN1bHQgPSBuZXdMaW5lcy5zbGljZShhbmNob3JJbmRleCArIDEpLmZpbHRlcihsaW5lID0+IGxpbmUudHJpbSgpLmxlbmd0aCA+IDApO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSBsb2cgdmlldy5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSBBUEkuXG4gICAgICovXG4gICAgY2JVcGRhdGVMb2dUZXh0KHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIEhpZGUgZGltbWVyIG9ubHkgaWYgbm90IGluIGF1dG8tdXBkYXRlIG1vZGVcbiAgICAgICAgaWYgKCFzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUpIHtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSGFuZGxlIHYzIEFQSSByZXNwb25zZSBzdHJ1Y3R1cmVcbiAgICAgICAgaWYgKCFyZXNwb25zZSB8fCAhcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UubWVzc2FnZXMpIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY29udGVudCA9IHJlc3BvbnNlLmRhdGE/LmNvbnRlbnQgfHwgJyc7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlci5nZXRTZXNzaW9uKCkuc2V0VmFsdWUoY29udGVudCk7XG4gICAgICAgIGNvbnN0IHJvdyA9IHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlci5zZXNzaW9uLmdldExlbmd0aCgpIC0gMTtcbiAgICAgICAgY29uc3QgY29sdW1uID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnNlc3Npb24uZ2V0TGluZShyb3cpLmxlbmd0aDtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLmdvdG9MaW5lKHJvdyArIDEsIGNvbHVtbik7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGNsaWNraW5nIHRoZSBcIkRvd25sb2FkIEZpbGVcIiBidXR0b24uXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGRhdGEuXG4gICAgICovXG4gICAgY2JEb3dubG9hZEZpbGUocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gSGFuZGxlIHYzIEFQSSByZXNwb25zZSBzdHJ1Y3R1cmVcbiAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSByZXNwb25zZS5kYXRhLmZpbGVuYW1lIHx8IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UubWVzc2FnZXMpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgY2xpY2tpbmcgdGhlIFwiRXJhc2UgRmlsZVwiIGJ1dHRvbi5cbiAgICAgKi9cbiAgICBlcmFzZUN1cnJlbnRGaWxlQ29udGVudCgpe1xuICAgICAgICBjb25zdCBmaWxlTmFtZSA9IHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmaWxlbmFtZScpO1xuICAgICAgICBpZiAoZmlsZU5hbWUubGVuZ3RoPjApe1xuICAgICAgICAgICAgU3lzbG9nQVBJLmVyYXNlRmlsZShmaWxlTmFtZSwgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY2JBZnRlckZpbGVFcmFzZWQpXG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgY2xpY2tpbmcgdGhlIFwiRXJhc2UgRmlsZVwiIGJ1dHRvbiBhbmQgY2FsbGluZyBSRVNUIEFQSSBjb21tYW5kXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGRhdGEuXG4gICAgICovXG4gICAgY2JBZnRlckZpbGVFcmFzZWQocmVzcG9uc2Upe1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0PT09ZmFsc2UgJiYgcmVzcG9uc2UubWVzc2FnZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKTtcbiAgICAgICAgfVxuICAgIH0sXG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgc2hvdyBzeXN0ZW0gbG9ncyB0YWJcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pbml0aWFsaXplKCk7XG59KTsiXX0=