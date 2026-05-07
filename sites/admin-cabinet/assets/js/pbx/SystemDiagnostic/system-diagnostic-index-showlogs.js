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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TeXN0ZW1EaWFnbm9zdGljL3N5c3RlbS1kaWFnbm9zdGljLWluZGV4LXNob3dsb2dzLmpzIl0sIm5hbWVzIjpbInN5c3RlbURpYWdub3N0aWNMb2dzIiwiJHNob3dCdG4iLCIkZG93bmxvYWRCdG4iLCIkc2hvd0F1dG9CdG4iLCIkZXJhc2VCdG4iLCIkbG9nQ29udGVudCIsInZpZXdlciIsIiRmaWxlU2VsZWN0RHJvcERvd24iLCJsb2dzSXRlbXMiLCIkZGltbWVyIiwiJGZvcm1PYmoiLCJpc0luaXRpYWxpemluZyIsInRpbWVTbGlkZXJFbmFibGVkIiwiY3VycmVudFRpbWVSYW5nZSIsImlzQXV0b1VwZGF0ZUFjdGl2ZSIsImZpbHRlckNvbmRpdGlvbnMiLCJwZW5kaW5nRmlsdGVyVGV4dCIsImxhc3RLbm93bkRhdGFFbmQiLCJpbml0aWFsaXplIiwiJCIsImFkZENsYXNzIiwiaGlkZSIsImNzcyIsInRvcCIsImxlZnQiLCJhY2VIZWlnaHQiLCJ3aW5kb3ciLCJpbm5lckhlaWdodCIsImNsb3Nlc3QiLCJjcmVhdGVEcm9wZG93bkZyb21IaWRkZW5JbnB1dCIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJjYk9uQ2hhbmdlRmlsZSIsImlnbm9yZUNhc2UiLCJmdWxsVGV4dFNlYXJjaCIsImZvcmNlU2VsZWN0aW9uIiwicHJlc2VydmVIVE1MIiwiYWxsb3dDYXRlZ29yeVNlbGVjdGlvbiIsIm1hdGNoIiwiZmlsdGVyUmVtb3RlRGF0YSIsImFjdGlvbiIsInRlbXBsYXRlcyIsIm1lbnUiLCJjdXN0b21Ecm9wZG93bk1lbnUiLCJpbml0aWFsaXplRm9sZGVySGFuZGxlcnMiLCJpbml0aWFsaXplQWNlIiwiU3lzbG9nQVBJIiwiZ2V0TG9nc0xpc3QiLCJjYkZvcm1hdERyb3Bkb3duUmVzdWx0cyIsImluaXRpYWxpemVMb2dMZXZlbERyb3Bkb3duIiwiaW5pdGlhbGl6ZUZpbHRlckZyb21VcmwiLCJkb2N1bWVudCIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwiJGJ0biIsImN1cnJlbnRUYXJnZXQiLCJwZXJpb2QiLCJkYXRhIiwicmVtb3ZlQ2xhc3MiLCJhcHBseVF1aWNrUGVyaW9kIiwiZW5kIiwib25lSG91ciIsInN0YXJ0IiwiTWF0aCIsIm1heCIsIlNWR1RpbWVsaW5lIiwic2V0UmFuZ2UiLCJsb2FkTG9nQnlUaW1lUmFuZ2UiLCJsZXZlbCIsImFwcGx5TG9nTGV2ZWxGaWx0ZXIiLCJ1cGRhdGVMb2dGcm9tU2VydmVyIiwiaGFuZGxlSGFzaENoYW5nZSIsImZvcm0iLCJkb3dubG9hZExvZ0ZpbGUiLCJmaWxlbmFtZSIsImNiRG93bmxvYWRGaWxlIiwiJGJ1dHRvbiIsIiRyZWxvYWRJY29uIiwiZmluZCIsImhhc0NsYXNzIiwidXBkYXRlTG9nVmlld1dvcmtlciIsInN0b3AiLCJlcmFzZUN1cnJlbnRGaWxlQ29udGVudCIsImV2ZW50IiwiJHBvcHVwIiwiaXNQb3B1cFZpc2libGUiLCJpcyIsImtleSIsIm5hdmlnYXRlRmlsdGVyUG9wdXAiLCIkZm9jdXNlZCIsImxlbmd0aCIsInRyaWdnZXIiLCJ0ZXh0IiwidmFsIiwidHJpbSIsInNob3dGaWx0ZXJUeXBlUG9wdXAiLCJoaWRlRmlsdGVyVHlwZVBvcHVwIiwicmVtb3ZlRmlsdGVyQ29uZGl0aW9uIiwic2V0VGltZW91dCIsImFkZEZpbHRlckNvbmRpdGlvbiIsInR5cGUiLCJzdG9wUHJvcGFnYXRpb24iLCJpbmRleCIsImNsZWFyQWxsRmlsdGVyQ29uZGl0aW9ucyIsInRhcmdldCIsImZvY3VzIiwidG9nZ2xlRnVsbFNjcmVlbiIsImFkZEV2ZW50TGlzdGVuZXIiLCJhZGp1c3RMb2dIZWlnaHQiLCJsb2dDb250YWluZXIiLCJnZXRFbGVtZW50QnlJZCIsImZ1bGxzY3JlZW5FbGVtZW50IiwicmVxdWVzdEZ1bGxzY3JlZW4iLCJlcnIiLCJjb25zb2xlIiwiZXJyb3IiLCJtZXNzYWdlIiwiZXhpdEZ1bGxzY3JlZW4iLCJvZmZzZXQiLCJyZXNpemUiLCIkaGlkZGVuSW5wdXQiLCIkZHJvcGRvd24iLCJpZCIsIiR0ZXh0IiwiZ2xvYmFsVHJhbnNsYXRlIiwic2RfQWxsTGV2ZWxzIiwiJGljb24iLCIkbWVudSIsIml0ZW1zIiwidmFsdWUiLCJpY29uIiwic2RfRXJyb3IiLCJzZF9XYXJuaW5nIiwic2RfTm90aWNlIiwic2RfSW5mbyIsInNkX0RlYnVnIiwiZm9yRWFjaCIsIml0ZW0iLCIkaXRlbSIsImh0bWwiLCJhcHBlbmQiLCJhZnRlciIsInRhYmluZGV4IiwiYmVmb3JlIiwiYWNlIiwiZWRpdCIsImp1bGlhIiwicmVxdWlyZSIsInVuZGVmaW5lZCIsIkluaU1vZGUiLCJNb2RlIiwic2Vzc2lvbiIsInNldE1vZGUiLCJzZXRUaGVtZSIsInJlbmRlcmVyIiwic2V0U2hvd0d1dHRlciIsInNldE9wdGlvbnMiLCJzaG93TGluZU51bWJlcnMiLCJzaG93UHJpbnRNYXJnaW4iLCJyZWFkT25seSIsImJ1aWxkVHJlZVN0cnVjdHVyZSIsImZpbGVzIiwiZGVmYXVsdFBhdGgiLCJ0cmVlIiwiT2JqZWN0IiwiZW50cmllcyIsImZpbGVEYXRhIiwiZmlsZVBhdGgiLCJwYXRoIiwicGFydHMiLCJzcGxpdCIsImN1cnJlbnQiLCJwYXJ0Iiwic2l6ZSIsImNoaWxkcmVuIiwidHJlZVRvRHJvcGRvd25JdGVtcyIsInByZWZpeCIsInBhcmVudEZvbGRlclBhdGgiLCJzb3J0IiwiYUtleSIsImFWYWwiLCJiS2V5IiwiYlZhbCIsImxvY2FsZUNvbXBhcmUiLCJmb2xkZXJQYXRoIiwicHVzaCIsIm5hbWUiLCJkaXNhYmxlZCIsImZvbGRlck5hbWUiLCJwYXJlbnRGb2xkZXIiLCJjaGlsZEl0ZW1zIiwic2VsZWN0ZWQiLCJyZXNwb25zZSIsImZpZWxkcyIsInZhbHVlcyIsImVhY2giLCJvcHRpb24iLCJmb2xkZXJQYXJlbnRBdHRyIiwicGFyZW50QXR0ciIsIm1heWJlRGlzYWJsZWQiLCJmb2xkZXJIZWFkZXIiLCJzdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24iLCIkZm9sZGVyIiwiJHRvZ2dsZSIsImlzQ29sbGFwc2VkIiwic2hvdyIsImNvbGxhcHNlRGVzY2VuZGFudHMiLCJzZWFyY2hWYWx1ZSIsIl8iLCJmb2xkZXIiLCJjaGlsZEZvbGRlciIsIiRjaGlsZEZvbGRlciIsImNoaWxkUGF0aCIsImV4cGFuZEZvbGRlckZvckZpbGUiLCIkZmlsZUl0ZW0iLCJwYXJlbnRQYXRoIiwiaGFzaCIsImxvY2F0aW9uIiwic3RhcnRzV2l0aCIsImRlY29kZVVSSUNvbXBvbmVudCIsInN1YnN0cmluZyIsImZpbGVFeGlzdHMiLCJzb21lIiwiZ2V0RmlsZUZyb21IYXNoIiwicmVzdWx0IiwiZGVmVmFsIiwiZmlsZU5hbWUiLCJkcm9wZG93blZhbHVlcyIsIm1hcCIsInJlcGxhY2UiLCJzZWxlY3RlZEl0ZW0iLCJpdGVtVG9TZWxlY3QiLCJlbmNvZGVVUklDb21wb25lbnQiLCJyZXNldEZpbHRlcnMiLCJ1cGRhdGVBdXRvUmVmcmVzaFZpc2liaWxpdHkiLCJjaGVja1RpbWVSYW5nZUF2YWlsYWJpbGl0eSIsImlzUm90YXRlZExvZ0ZpbGUiLCJ0ZXN0IiwiJGF1dG9CdG4iLCJpc1JvdGF0ZWQiLCJkaXNwbGF5IiwiZmlyc3QiLCJkaXJlY3Rpb24iLCIkb3B0aW9ucyIsImZpbHRlciIsImVxIiwic3luY0ZpbHRlckNvbmRpdGlvbnNUb0Zvcm0iLCJyZW5kZXJGaWx0ZXJMYWJlbHMiLCJzcGxpY2UiLCJKU09OIiwic3RyaW5naWZ5IiwiJGNvbnRhaW5lciIsImVtcHR5IiwiY29uZGl0aW9uIiwiY3NzQ2xhc3MiLCJpY29uQ2xhc3MiLCJpY29uQ29sb3IiLCIkbGFiZWwiLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJzZWFyY2giLCJmaWx0ZXJQYXJhbSIsImdldCIsInRyaW1tZWQiLCJwYXJzZWQiLCJwYXJzZSIsIkFycmF5IiwiaXNBcnJheSIsImMiLCJwIiwidXBkYXRlUGVyaW9kQnV0dG9uc1Zpc2liaWxpdHkiLCJsb2dEdXJhdGlvbiIsIiRwZXJpb2RCdXR0b25zIiwiJHBlcmlvZENvbnRhaW5lciIsImxhcmdlc3RWaXNpYmxlUGVyaW9kIiwiJGxhcmdlc3RWaXNpYmxlQnV0dG9uIiwidmlzaWJsZUNvdW50IiwiYnV0dG9uIiwicGFyc2VJbnQiLCIkdGltZUNvbnRyb2xzSW5saW5lIiwiZ2V0TG9nVGltZVJhbmdlIiwidGltZV9yYW5nZSIsImluaXRpYWxpemVOYXZpZ2F0aW9uIiwidGltZVJhbmdlRGF0YSIsImhhc1ZhbGlkVGltZVJhbmdlIiwiaGFzTXVsdGlwbGVUaW1lc3RhbXBzIiwic2VydmVyX3RpbWV6b25lX29mZnNldCIsInNlcnZlclRpbWV6b25lT2Zmc2V0Iiwib25SYW5nZUNoYW5nZSIsImRyYWdnZWRIYW5kbGUiLCJvblRydW5jYXRlZFpvbmVDbGljayIsImlzTGVmdFpvbmUiLCIkYWN0aXZlQnV0dG9uIiwiaW5pdGlhbFBlcmlvZCIsIm1pbiIsImluaXRpYWxTdGFydCIsImxpbmVSYW5nZSIsImxvYWRMb2dCeUxpbmVzIiwiZmxvb3IiLCJjZWlsIiwibGluZXMiLCJwYXJhbXMiLCJsb2dMZXZlbCIsImdldExvZ0Zyb21GaWxlIiwic2V0VmFsdWUiLCJjb250ZW50IiwiZ290b0xpbmUiLCJzY3JvbGxUb0xpbmUiLCJzdGFydFRpbWVzdGFtcCIsImVuZFRpbWVzdGFtcCIsImxhdGVzdCIsImlzSW5pdGlhbExvYWQiLCJpc0F1dG9VcGRhdGUiLCJkYXRlRnJvbSIsImRhdGVUbyIsIm5ld0NvbnRlbnQiLCJjdXJyZW50Q29udGVudCIsImdldFZhbHVlIiwibmV3TGluZXMiLCJmaW5kTmV3TGluZXMiLCJsYXN0Um93IiwiZ2V0TGVuZ3RoIiwiaW5zZXJ0Iiwicm93IiwiY29sdW1uIiwiam9pbiIsImZpbmFsUm93IiwiZmluYWxDb2x1bW4iLCJnZXRMaW5lIiwiYWN0dWFsX3JhbmdlIiwiYWN0dWFsIiwidXBkYXRlRGF0YUJvdW5kYXJ5IiwidXBkYXRlRnJvbVNlcnZlclJlc3BvbnNlIiwicGVyaW9kU2Vjb25kcyIsImFwcGx5UGVyaW9kIiwiZmlsdGVyUGF0dGVybiIsInByZXNlcnZlUmFuZ2UiLCJzZWxlY3RlZFJhbmdlIiwiRGF0ZSIsIm5vdyIsImRhdGFFbmQiLCJleHRlbmRSYW5nZSIsImNiVXBkYXRlTG9nVGV4dCIsImxpbmUiLCJjdXJyZW50TGluZXMiLCJhbmNob3JMaW5lIiwiaSIsImFuY2hvckluZGV4Iiwic2xpY2UiLCJtZXNzYWdlcyIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwiZ2V0U2Vzc2lvbiIsImVyYXNlRmlsZSIsImNiQWZ0ZXJGaWxlRXJhc2VkIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxvQkFBb0IsR0FBRztBQUN6QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRSxJQU5lOztBQVF6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxZQUFZLEVBQUUsSUFaVzs7QUFjekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsWUFBWSxFQUFFLElBbEJXOztBQW9CekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFLElBeEJjOztBQTBCekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsV0FBVyxFQUFFLElBOUJZOztBQWdDekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsTUFBTSxFQUFFLEVBcENpQjs7QUFzQ3pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLG1CQUFtQixFQUFFLElBMUNJOztBQTRDekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFLEVBaERjOztBQWtEekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsT0FBTyxFQUFFLElBdERnQjs7QUF3RHpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFB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QTdCLEMsQ0FtbURBOztBQUNBcEQsQ0FBQyxDQUFDZ0MsUUFBRCxDQUFELENBQVlpVCxLQUFaLENBQWtCLFlBQU07QUFDcEJwVyxFQUFBQSxvQkFBb0IsQ0FBQ2tCLFVBQXJCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG4vKiBnbG9iYWwgYWNlLCBQYnhBcGksIFN5c2xvZ0FQSSwgdXBkYXRlTG9nVmlld1dvcmtlciwgQWNlLCBVc2VyTWVzc2FnZSwgU1ZHVGltZWxpbmUgKi9cblxuLyoqXG4gKiBSZXByZXNlbnRzIHRoZSBzeXN0ZW0gZGlhZ25vc3RpYyBsb2dzIG9iamVjdC5cbiAqXG4gKiBAbW9kdWxlIHN5c3RlbURpYWdub3N0aWNMb2dzXG4gKi9cbmNvbnN0IHN5c3RlbURpYWdub3N0aWNMb2dzID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBcIlNob3cgTGFzdCBMb2dcIiBidXR0b24uXG4gICAgICogUmVzb2x2ZWQgaW4gaW5pdGlhbGl6ZSgpIOKAlCBtdXN0IG5vdCBjYWxsICQoKSBhdCBtb2R1bGUtbG9hZCB0aW1lLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNob3dCdG46IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgXCJEb3dubG9hZCBGaWxlXCIgYnV0dG9uLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRvd25sb2FkQnRuOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIFwiU2hvdyBMYXN0IExvZyAoQXV0bylcIiBidXR0b24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc2hvd0F1dG9CdG46IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgXCJFcmFzZSBjdXJyZW50IGZpbGUgY29udGVudFwiIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRlcmFzZUJ0bjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBsb2cgY29udGVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRsb2dDb250ZW50OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVGhlIHZpZXdlciBmb3IgZGlzcGxheWluZyB0aGUgbG9nIGNvbnRlbnQuXG4gICAgICogQHR5cGUge0FjZX1cbiAgICAgKi9cbiAgICB2aWV3ZXI6ICcnLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZpbGUgc2VsZWN0IGRyb3Bkb3duLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZpbGVTZWxlY3REcm9wRG93bjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEFycmF5IG9mIGxvZyBpdGVtcy5cbiAgICAgKiBAdHlwZSB7QXJyYXl9XG4gICAgICovXG4gICAgbG9nc0l0ZW1zOiBbXSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBkaW1tZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGltbWVyOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEZsYWcgdG8gcHJldmVudCBkdXBsaWNhdGUgQVBJIGNhbGxzIGR1cmluZyBpbml0aWFsaXphdGlvblxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGlzSW5pdGlhbGl6aW5nOiB0cnVlLFxuXG4gICAgLyoqXG4gICAgICogRmxhZyBpbmRpY2F0aW5nIGlmIHRpbWUgc2xpZGVyIG1vZGUgaXMgZW5hYmxlZFxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIHRpbWVTbGlkZXJFbmFibGVkOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIEN1cnJlbnQgdGltZSByYW5nZSBmb3IgdGhlIHNlbGVjdGVkIGxvZyBmaWxlXG4gICAgICogQHR5cGUge29iamVjdHxudWxsfVxuICAgICAqL1xuICAgIGN1cnJlbnRUaW1lUmFuZ2U6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBGbGFnIGluZGljYXRpbmcgaWYgYXV0by11cGRhdGUgbW9kZSBpcyBhY3RpdmVcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBpc0F1dG9VcGRhdGVBY3RpdmU6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogQXJyYXkgb2YgY2FzY2FkaW5nIGZpbHRlciBjb25kaXRpb25zIFt7dHlwZTogJ2NvbnRhaW5zJ3wnbm90Q29udGFpbnMnLCB2YWx1ZTogc3RyaW5nfV1cbiAgICAgKiBAdHlwZSB7QXJyYXl9XG4gICAgICovXG4gICAgZmlsdGVyQ29uZGl0aW9uczogW10sXG5cbiAgICAvKipcbiAgICAgKiBQZW5kaW5nIGZpbHRlciB0ZXh0IHdhaXRpbmcgZm9yIHR5cGUgc2VsZWN0aW9uIGluIHBvcHVwXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBwZW5kaW5nRmlsdGVyVGV4dDogJycsXG5cbiAgICAvKipcbiAgICAgKiBMYXN0IGtub3duIGFjdHVhbCBkYXRhIGVuZCB0aW1lc3RhbXAgZnJvbSBBUEkgcmVzcG9uc2UuXG4gICAgICogVXNlZCB0byBhbmNob3IgcmVmcmVzaCB0aW1lIHJhbmdlIHRvIHJlYWwgZGF0YSBpbnN0ZWFkIG9mIHdhbGwgY2xvY2sgdGltZS5cbiAgICAgKiBXSFk6IElmIGEgbG9nIGZpbGUgaGFzbid0IGJlZW4gd3JpdHRlbiB0byByZWNlbnRseSAoZS5nLiwgaWRsZSBtb2R1bGUgbG9nKSxcbiAgICAgKiB1c2luZyBcIm5vdyAtIHBlcmlvZFwiIGFzIHN0YXJ0VGltZXN0YW1wIHByb2R1Y2VzIGFuIGVtcHR5IHJhbmdlIHdpdGggbm8gZGF0YS5cbiAgICAgKiBAdHlwZSB7bnVtYmVyfG51bGx9XG4gICAgICovXG4gICAgbGFzdEtub3duRGF0YUVuZDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBzeXN0ZW0gZGlhZ25vc3RpYyBsb2dzLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIFJlc29sdmUgalF1ZXJ5IHdyYXBwZXJzIGhlcmUg4oCUIGF0IG1vZHVsZS1sb2FkIHRpbWUgalF1ZXJ5IG1heVxuICAgICAgICAvLyBub3QgeWV0IGJlIGRlZmluZWQgKFNlbnRyeSBNSUtPUEJYLU1HOSBwYXR0ZXJuKS5cbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJHNob3dCdG4gPSAkKCcjc2hvdy1sYXN0LWxvZycpO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZG93bmxvYWRCdG4gPSAkKCcjZG93bmxvYWQtZmlsZScpO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kc2hvd0F1dG9CdG4gPSAkKCcjc2hvdy1sYXN0LWxvZy1hdXRvJyk7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRlcmFzZUJ0biA9ICQoJyNlcmFzZS1maWxlJyk7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRsb2dDb250ZW50ID0gJCgnI2xvZy1jb250ZW50LXJlYWRvbmx5Jyk7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIgPSAkKCcjZ2V0LWxvZ3MtZGltbWVyJyk7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqID0gJCgnI3N5c3RlbS1kaWFnbm9zdGljLWZvcm0nKTtcblxuICAgICAgICAvLyBFbnN1cmUgZmlsdGVyIHR5cGUgcG9wdXAgc3RhcnRzIGhpZGRlbiB3aXRoIGNsZWFuIHN0eWxlc1xuICAgICAgICAkKCcjZmlsdGVyLXR5cGUtcG9wdXAnKS5hZGRDbGFzcygnaGlkZGVuJykuaGlkZSgpLmNzcyh7dG9wOiAnJywgbGVmdDogJyd9KTtcblxuICAgICAgICBjb25zdCBhY2VIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSAyNTA7XG5cbiAgICAgICAgLy8gU2V0IHRoZSBtaW5pbXVtIGhlaWdodCBvZiB0aGUgbG9nIGNvbnRhaW5lclxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLmNsb3Nlc3QoJ2RpdicpLmNzcygnbWluLWhlaWdodCcsIGAke2FjZUhlaWdodH1weGApO1xuXG4gICAgICAgIC8vIENyZWF0ZSBkcm9wZG93biBVSSBmcm9tIGhpZGRlbiBpbnB1dCAoVjUuMCBwYXR0ZXJuKVxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jcmVhdGVEcm9wZG93bkZyb21IaWRkZW5JbnB1dCgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGRyb3Bkb3duIG1lbnUgZm9yIGxvZyBmaWxlcyB3aXRoIHRyZWUgc3VwcG9ydFxuICAgICAgICAvLyBJbml0aWFsaXplIFNlbWFudGljIFVJIGRyb3Bkb3duIHdpdGggY3VzdG9tIG1lbnUgZ2VuZXJhdGlvblxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY2JPbkNoYW5nZUZpbGUsXG4gICAgICAgICAgICAgICAgaWdub3JlQ2FzZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBmdWxsVGV4dFNlYXJjaDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBmb3JjZVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICAgICAgcHJlc2VydmVIVE1MOiB0cnVlLFxuICAgICAgICAgICAgICAgIGFsbG93Q2F0ZWdvcnlTZWxlY3Rpb246IGZhbHNlLFxuICAgICAgICAgICAgICAgIG1hdGNoOiAndGV4dCcsXG4gICAgICAgICAgICAgICAgZmlsdGVyUmVtb3RlRGF0YTogZmFsc2UsXG4gICAgICAgICAgICAgICAgYWN0aW9uOiAnYWN0aXZhdGUnLFxuICAgICAgICAgICAgICAgIHRlbXBsYXRlczoge1xuICAgICAgICAgICAgICAgICAgICBtZW51OiBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jdXN0b21Ecm9wZG93bk1lbnVcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZm9sZGVyIGNvbGxhcHNlL2V4cGFuZCBoYW5kbGVycyAodXNlcyBldmVudCBkZWxlZ2F0aW9uKVxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pbml0aWFsaXplRm9sZGVySGFuZGxlcnMoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBBQ0UgZWRpdG9yIGZvciBsb2cgY29udGVudFxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pbml0aWFsaXplQWNlKCk7XG5cbiAgICAgICAgLy8gRmV0Y2ggdGhlIGxpc3Qgb2YgbG9nIGZpbGVzXG4gICAgICAgIFN5c2xvZ0FQSS5nZXRMb2dzTGlzdChzeXN0ZW1EaWFnbm9zdGljTG9ncy5jYkZvcm1hdERyb3Bkb3duUmVzdWx0cyk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBsb2cgbGV2ZWwgZHJvcGRvd24gLSBWNS4wIHBhdHRlcm4gd2l0aCBEeW5hbWljRHJvcGRvd25CdWlsZGVyXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmluaXRpYWxpemVMb2dMZXZlbERyb3Bkb3duKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmaWx0ZXIgY29uZGl0aW9ucyBmcm9tIFVSTCBwYXJhbWV0ZXIgKGUuZy4gQ0RSIGxpbmtzIHdpdGggP2ZpbHRlcj0uLi4pXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmluaXRpYWxpemVGaWx0ZXJGcm9tVXJsKCk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIHF1aWNrIHBlcmlvZCBidXR0b25zXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcucGVyaW9kLWJ0bicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkYnRuID0gJChlLmN1cnJlbnRUYXJnZXQpO1xuICAgICAgICAgICAgY29uc3QgcGVyaW9kID0gJGJ0bi5kYXRhKCdwZXJpb2QnKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIGFjdGl2ZSBzdGF0ZVxuICAgICAgICAgICAgJCgnLnBlcmlvZC1idG4nKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAkYnRuLmFkZENsYXNzKCdhY3RpdmUnKTtcblxuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuYXBwbHlRdWlja1BlcmlvZChwZXJpb2QpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgXCJOb3dcIiBidXR0b25cbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJy5ub3ctYnRuJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGlmIChzeXN0ZW1EaWFnbm9zdGljTG9ncy5jdXJyZW50VGltZVJhbmdlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZW5kID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY3VycmVudFRpbWVSYW5nZS5lbmQ7XG4gICAgICAgICAgICAgICAgY29uc3Qgb25lSG91ciA9IDM2MDA7XG4gICAgICAgICAgICAgICAgY29uc3Qgc3RhcnQgPSBNYXRoLm1heChlbmQgLSBvbmVIb3VyLCBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jdXJyZW50VGltZVJhbmdlLnN0YXJ0KTtcbiAgICAgICAgICAgICAgICBTVkdUaW1lbGluZS5zZXRSYW5nZShzdGFydCwgZW5kKTtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2FkTG9nQnlUaW1lUmFuZ2Uoc3RhcnQsIGVuZCk7XG4gICAgICAgICAgICAgICAgJCgnLnBlcmlvZC1idG4nKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgJCgnLnBlcmlvZC1idG5bZGF0YS1wZXJpb2Q9XCIzNjAwXCJdJykuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgbG9nIGxldmVsIGZpbHRlciBidXR0b25zXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcubGV2ZWwtYnRuJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0ICRidG4gPSAkKGUuY3VycmVudFRhcmdldCk7XG4gICAgICAgICAgICBjb25zdCBsZXZlbCA9ICRidG4uZGF0YSgnbGV2ZWwnKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIGFjdGl2ZSBzdGF0ZVxuICAgICAgICAgICAgJCgnLmxldmVsLWJ0bicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgICRidG4uYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuXG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5hcHBseUxvZ0xldmVsRmlsdGVyKGxldmVsKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIFwiU2hvdyBMb2dcIiBidXR0b24gY2xpY2sgKGRlbGVnYXRlZClcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJyNzaG93LWxhc3QtbG9nJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gTGlzdGVuIGZvciBoYXNoIGNoYW5nZXMgdG8gdXBkYXRlIHNlbGVjdGVkIGZpbGVcbiAgICAgICAgJCh3aW5kb3cpLm9uKCdoYXNoY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaGFuZGxlSGFzaENoYW5nZSgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgXCJEb3dubG9hZCBMb2dcIiBidXR0b24gY2xpY2sgKGRlbGVnYXRlZClcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJyNkb3dubG9hZC1maWxlJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgICAgICBTeXNsb2dBUEkuZG93bmxvYWRMb2dGaWxlKGRhdGEuZmlsZW5hbWUsIHRydWUsIHN5c3RlbURpYWdub3N0aWNMb2dzLmNiRG93bmxvYWRGaWxlKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIFwiQXV0byBSZWZyZXNoXCIgYnV0dG9uIGNsaWNrIChkZWxlZ2F0ZWQpXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcjc2hvdy1sYXN0LWxvZy1hdXRvJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0ICRidXR0b24gPSAkKCcjc2hvdy1sYXN0LWxvZy1hdXRvJyk7XG4gICAgICAgICAgICBjb25zdCAkcmVsb2FkSWNvbiA9ICRidXR0b24uZmluZCgnLmljb25zIGkucmVmcmVzaCcpO1xuICAgICAgICAgICAgaWYgKCRyZWxvYWRJY29uLmhhc0NsYXNzKCdsb2FkaW5nJykpIHtcbiAgICAgICAgICAgICAgICAkcmVsb2FkSWNvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHVwZGF0ZUxvZ1ZpZXdXb3JrZXIuc3RvcCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkcmVsb2FkSWNvbi5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgdXBkYXRlTG9nVmlld1dvcmtlci5pbml0aWFsaXplKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciB0aGUgXCJFcmFzZSBmaWxlXCIgYnV0dG9uIGNsaWNrIChkZWxlZ2F0ZWQpXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcjZXJhc2UtZmlsZScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5lcmFzZUN1cnJlbnRGaWxlQ29udGVudCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgRW50ZXIga2V5cHJlc3Mgb24gZmlsdGVyIGlucHV0IOKAlCBzaG93IHR5cGUgcG9wdXBcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2tleWRvd24nLCAnI2ZpbHRlci1pbnB1dCcsIChldmVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJHBvcHVwID0gJCgnI2ZpbHRlci10eXBlLXBvcHVwJyk7XG4gICAgICAgICAgICBjb25zdCBpc1BvcHVwVmlzaWJsZSA9ICRwb3B1cC5pcygnOnZpc2libGUnKSAmJiAhJHBvcHVwLmhhc0NsYXNzKCdoaWRkZW4nKTtcblxuICAgICAgICAgICAgLy8gV2hlbiBwb3B1cCBpcyBvcGVuLCBoYW5kbGUgYXJyb3cga2V5cyBhbmQgRW50ZXIgZm9yIGtleWJvYXJkIG5hdmlnYXRpb25cbiAgICAgICAgICAgIGlmIChpc1BvcHVwVmlzaWJsZSkge1xuICAgICAgICAgICAgICAgIGlmIChldmVudC5rZXkgPT09ICdBcnJvd0Rvd24nIHx8IGV2ZW50LmtleSA9PT0gJ0Fycm93VXAnKSB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLm5hdmlnYXRlRmlsdGVyUG9wdXAoZXZlbnQua2V5ID09PSAnQXJyb3dEb3duJyA/IDEgOiAtMSk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50LmtleSA9PT0gJ0VudGVyJykge1xuICAgICAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkZm9jdXNlZCA9ICRwb3B1cC5maW5kKCcuZmlsdGVyLXR5cGUtb3B0aW9uLmZvY3VzZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCRmb2N1c2VkLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGZvY3VzZWQudHJpZ2dlcignY2xpY2snKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoZXZlbnQua2V5ID09PSAnRW50ZXInKSB7XG4gICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gJCgnI2ZpbHRlci1pbnB1dCcpLnZhbCgpLnRyaW0oKTtcbiAgICAgICAgICAgICAgICBpZiAodGV4dCAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MucGVuZGluZ0ZpbHRlclRleHQgPSB0ZXh0O1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5zaG93RmlsdGVyVHlwZVBvcHVwKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIGlmIChldmVudC5rZXkgPT09ICdFc2NhcGUnKSB7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaGlkZUZpbHRlclR5cGVQb3B1cCgpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChldmVudC5rZXkgPT09ICdCYWNrc3BhY2UnICYmICQoJyNmaWx0ZXItaW5wdXQnKS52YWwoKSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAvLyBSZW1vdmUgbGFzdCBjaGlwIG9uIEJhY2tzcGFjZSBpbiBlbXB0eSBpbnB1dFxuICAgICAgICAgICAgICAgIGlmIChzeXN0ZW1EaWFnbm9zdGljTG9ncy5maWx0ZXJDb25kaXRpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MucmVtb3ZlRmlsdGVyQ29uZGl0aW9uKFxuICAgICAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuZmlsdGVyQ29uZGl0aW9ucy5sZW5ndGggLSAxXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBPbiBibHVyOiBhdXRvLWFkZCB0ZXh0IGFzIFwiY29udGFpbnNcIiBmaWx0ZXIgaWYgcG9wdXAgaXMgbm90IG9wZW5cbiAgICAgICAgJChkb2N1bWVudCkub24oJ2JsdXInLCAnI2ZpbHRlci1pbnB1dCcsICgpID0+IHtcbiAgICAgICAgICAgIC8vIERlbGF5IHRvIGFsbG93IGNsaWNrIG9uIHBvcHVwIG9wdGlvbiB0byBmaXJlIGZpcnN0XG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCAkcG9wdXAgPSAkKCcjZmlsdGVyLXR5cGUtcG9wdXAnKTtcbiAgICAgICAgICAgICAgICBpZiAoJHBvcHVwLmlzKCc6dmlzaWJsZScpKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFBvcHVwIGlzIG9wZW4gKHVzZXIgcHJlc3NlZCBFbnRlcikg4oCUIGxldCBwb3B1cCBoYW5kbGUgaXRcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCB0ZXh0ID0gJCgnI2ZpbHRlci1pbnB1dCcpLnZhbCgpLnRyaW0oKTtcbiAgICAgICAgICAgICAgICBpZiAodGV4dCAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuYWRkRmlsdGVyQ29uZGl0aW9uKCdjb250YWlucycsIHRleHQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sIDE1MCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciBmaWx0ZXIgdHlwZSBvcHRpb24gY2xpY2tcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJy5maWx0ZXItdHlwZS1vcHRpb24nLCAoZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgdHlwZSA9ICQoZS5jdXJyZW50VGFyZ2V0KS5kYXRhKCd0eXBlJyk7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5hZGRGaWx0ZXJDb25kaXRpb24odHlwZSwgc3lzdGVtRGlhZ25vc3RpY0xvZ3MucGVuZGluZ0ZpbHRlclRleHQpO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MucGVuZGluZ0ZpbHRlclRleHQgPSAnJztcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmhpZGVGaWx0ZXJUeXBlUG9wdXAoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIHJlbW92aW5nIGluZGl2aWR1YWwgZmlsdGVyIGNoaXBcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJyNmaWx0ZXItbGFiZWxzIC5kZWxldGUuaWNvbicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgY29uc3QgaW5kZXggPSAkKGUuY3VycmVudFRhcmdldCkuY2xvc2VzdCgnLmZpbHRlci1jb25kaXRpb24tbGFiZWwnKS5kYXRhKCdpbmRleCcpO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MucmVtb3ZlRmlsdGVyQ29uZGl0aW9uKGluZGV4KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIFwiQ2xlYXIgRmlsdGVyXCIgYnV0dG9uIGNsaWNrXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICcjY2xlYXItZmlsdGVyLWJ0bicsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jbGVhckFsbEZpbHRlckNvbmRpdGlvbnMoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQ2xpY2sgb24gY29udGFpbmVyIGZvY3VzZXMgaW5wdXRcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJyNmaWx0ZXItY29uZGl0aW9ucy1jb250YWluZXInLCAoZSkgPT4ge1xuICAgICAgICAgICAgaWYgKCQoZS50YXJnZXQpLmlzKCcjZmlsdGVyLWNvbmRpdGlvbnMtY29udGFpbmVyJykgfHwgJChlLnRhcmdldCkuaXMoJyNmaWx0ZXItbGFiZWxzJykpIHtcbiAgICAgICAgICAgICAgICAkKCcjZmlsdGVyLWlucHV0JykuZm9jdXMoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGlkZSBwb3B1cCB3aGVuIGNsaWNraW5nIG91dHNpZGVcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGlmICghJChlLnRhcmdldCkuY2xvc2VzdCgnI2ZpbHRlci10eXBlLXBvcHVwLCAjZmlsdGVyLWlucHV0JykubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaGlkZUZpbHRlclR5cGVQb3B1cCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgRnVsbHNjcmVlbiBidXR0b24gY2xpY2tcbiAgICAgICAgJCgnLmZ1bGxzY3JlZW4tdG9nZ2xlLWJ0bicpLm9uKCdjbGljaycsIHN5c3RlbURpYWdub3N0aWNMb2dzLnRvZ2dsZUZ1bGxTY3JlZW4pO1xuXG4gICAgICAgIC8vIExpc3RlbmluZyBmb3IgdGhlIGZ1bGxzY3JlZW4gY2hhbmdlIGV2ZW50XG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2Z1bGxzY3JlZW5jaGFuZ2UnLCBzeXN0ZW1EaWFnbm9zdGljTG9ncy5hZGp1c3RMb2dIZWlnaHQpO1xuXG4gICAgICAgIC8vIEluaXRpYWwgaGVpZ2h0IGNhbGN1bGF0aW9uXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmFkanVzdExvZ0hlaWdodCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGVzIHRoZSBmdWxsLXNjcmVlbiBtb2RlIG9mIHRoZSAnc3lzdGVtLWxvZ3Mtc2VnbWVudCcgZWxlbWVudC5cbiAgICAgKiBJZiB0aGUgZWxlbWVudCBpcyBub3QgaW4gZnVsbC1zY3JlZW4gbW9kZSwgaXQgcmVxdWVzdHMgZnVsbC1zY3JlZW4gbW9kZS5cbiAgICAgKiBJZiB0aGUgZWxlbWVudCBpcyBhbHJlYWR5IGluIGZ1bGwtc2NyZWVuIG1vZGUsIGl0IGV4aXRzIGZ1bGwtc2NyZWVuIG1vZGUuXG4gICAgICogTG9ncyBhbiBlcnJvciBtZXNzYWdlIHRvIHRoZSBjb25zb2xlIGlmIHRoZXJlIGlzIGFuIGlzc3VlIGVuYWJsaW5nIGZ1bGwtc2NyZWVuIG1vZGUuXG4gICAgICpcbiAgICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgICAqL1xuICAgIHRvZ2dsZUZ1bGxTY3JlZW4oKSB7XG4gICAgICAgIGNvbnN0IGxvZ0NvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzeXN0ZW0tbG9ncy1zZWdtZW50Jyk7XG5cbiAgICAgICAgaWYgKCFkb2N1bWVudC5mdWxsc2NyZWVuRWxlbWVudCkge1xuICAgICAgICAgICAgbG9nQ29udGFpbmVyLnJlcXVlc3RGdWxsc2NyZWVuKCkuY2F0Y2goKGVycikgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGF0dGVtcHRpbmcgdG8gZW5hYmxlIGZ1bGwtc2NyZWVuIG1vZGU6ICR7ZXJyLm1lc3NhZ2V9YCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRvY3VtZW50LmV4aXRGdWxsc2NyZWVuKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRnVuY3Rpb24gdG8gYWRqdXN0IHRoZSBoZWlnaHQgb2YgdGhlIGxvZ3MgZGVwZW5kaW5nIG9uIHRoZSBzY3JlZW4gbW9kZS5cbiAgICAgKi9cbiAgICBhZGp1c3RMb2dIZWlnaHQoKSB7XG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgbGV0IGFjZUhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCAtIHN5c3RlbURpYWdub3N0aWNMb2dzLiRsb2dDb250ZW50Lm9mZnNldCgpLnRvcCAtIDU1O1xuICAgICAgICAgICAgaWYgKGRvY3VtZW50LmZ1bGxzY3JlZW5FbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgZnVsbHNjcmVlbiBtb2RlIGlzIGFjdGl2ZVxuICAgICAgICAgICAgICAgIGFjZUhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCAtIDgwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gUmVjYWxjdWxhdGUgdGhlIHNpemUgb2YgdGhlIEFDRSBlZGl0b3JcbiAgICAgICAgICAgICQoJy5sb2ctY29udGVudC1yZWFkb25seScpLmNzcygnbWluLWhlaWdodCcsICBgJHthY2VIZWlnaHR9cHhgKTtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlci5yZXNpemUoKTtcbiAgICAgICAgfSwgMzAwKTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgbG9nIGxldmVsIGRyb3Bkb3duIC0gVjUuMCBwYXR0ZXJuIHdpdGggSFRNTCBpY29uc1xuICAgICAqIFN0YXRpYyBkcm9wZG93biB3aXRoIGNvbG9yZWQgaWNvbnMgYW5kIHRyYW5zbGF0aW9uc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVMb2dMZXZlbERyb3Bkb3duKCkge1xuICAgICAgICBjb25zdCAkaGlkZGVuSW5wdXQgPSAkKCcjbG9nTGV2ZWwnKTtcblxuICAgICAgICAvLyBDaGVjayBpZiBkcm9wZG93biBhbHJlYWR5IGV4aXN0c1xuICAgICAgICBpZiAoJCgnI2xvZ0xldmVsLWRyb3Bkb3duJykubGVuZ3RoKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDcmVhdGUgZHJvcGRvd24gSFRNTCB3aXRoIGNvbG9yZWQgaWNvbnNcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJCgnPGRpdj4nLCB7XG4gICAgICAgICAgICBpZDogJ2xvZ0xldmVsLWRyb3Bkb3duJyxcbiAgICAgICAgICAgIGNsYXNzOiAndWkgc2VsZWN0aW9uIGRyb3Bkb3duJ1xuICAgICAgICB9KTtcblxuICAgICAgICBjb25zdCAkdGV4dCA9ICQoJzxkaXY+JywgeyBjbGFzczogJ3RleHQnIH0pLnRleHQoZ2xvYmFsVHJhbnNsYXRlLnNkX0FsbExldmVscyk7XG4gICAgICAgIGNvbnN0ICRpY29uID0gJCgnPGk+JywgeyBjbGFzczogJ2Ryb3Bkb3duIGljb24nIH0pO1xuICAgICAgICBjb25zdCAkbWVudSA9ICQoJzxkaXY+JywgeyBjbGFzczogJ21lbnUnIH0pO1xuXG4gICAgICAgIC8vIEJ1aWxkIG1lbnUgaXRlbXMgd2l0aCBjb2xvcmVkIGljb25zXG4gICAgICAgIGNvbnN0IGl0ZW1zID0gW1xuICAgICAgICAgICAgeyB2YWx1ZTogJycsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5zZF9BbGxMZXZlbHMsIGljb246ICcnIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAnRVJST1InLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc2RfRXJyb3IsIGljb246ICc8aSBjbGFzcz1cImV4Y2xhbWF0aW9uIGNpcmNsZSByZWQgaWNvblwiPjwvaT4nIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAnV0FSTklORycsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5zZF9XYXJuaW5nLCBpY29uOiAnPGkgY2xhc3M9XCJleGNsYW1hdGlvbiB0cmlhbmdsZSBvcmFuZ2UgaWNvblwiPjwvaT4nIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAnTk9USUNFJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnNkX05vdGljZSwgaWNvbjogJzxpIGNsYXNzPVwiaW5mbyBjaXJjbGUgYmx1ZSBpY29uXCI+PC9pPicgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdJTkZPJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnNkX0luZm8sIGljb246ICc8aSBjbGFzcz1cImNpcmNsZSBncmV5IGljb25cIj48L2k+JyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ0RFQlVHJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnNkX0RlYnVnLCBpY29uOiAnPGkgY2xhc3M9XCJidWcgcHVycGxlIGljb25cIj48L2k+JyB9XG4gICAgICAgIF07XG5cbiAgICAgICAgaXRlbXMuZm9yRWFjaChpdGVtID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRpdGVtID0gJCgnPGRpdj4nLCB7XG4gICAgICAgICAgICAgICAgY2xhc3M6ICdpdGVtJyxcbiAgICAgICAgICAgICAgICAnZGF0YS12YWx1ZSc6IGl0ZW0udmFsdWVcbiAgICAgICAgICAgIH0pLmh0bWwoaXRlbS5pY29uICsgaXRlbS50ZXh0KTtcbiAgICAgICAgICAgICRtZW51LmFwcGVuZCgkaXRlbSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgICRkcm9wZG93bi5hcHBlbmQoJHRleHQsICRpY29uLCAkbWVudSk7XG4gICAgICAgICRoaWRkZW5JbnB1dC5hZnRlcigkZHJvcGRvd24pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgU2VtYW50aWMgVUkgZHJvcGRvd25cbiAgICAgICAgJGRyb3Bkb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiAodmFsdWUpID0+IHtcbiAgICAgICAgICAgICAgICAkaGlkZGVuSW5wdXQudmFsKHZhbHVlKS50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy51cGRhdGVMb2dGcm9tU2VydmVyKHRydWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBkcm9wZG93biBVSSBlbGVtZW50IGZyb20gaGlkZGVuIGlucHV0IGZpZWxkIChWNS4wIHBhdHRlcm4pXG4gICAgICovXG4gICAgY3JlYXRlRHJvcGRvd25Gcm9tSGlkZGVuSW5wdXQoKSB7XG4gICAgICAgIGNvbnN0ICRoaWRkZW5JbnB1dCA9ICQoJyNmaWxlbmFtZXMnKTtcblxuICAgICAgICBpZiAoISRoaWRkZW5JbnB1dC5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0hpZGRlbiBpbnB1dCAjZmlsZW5hbWVzIG5vdCBmb3VuZCcpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gJCgnPGRpdj4nLCB7XG4gICAgICAgICAgICBpZDogJ2ZpbGVuYW1lcy1kcm9wZG93bicsXG4gICAgICAgICAgICBjbGFzczogJ3VpIHNlYXJjaCBzZWxlY3Rpb24gZHJvcGRvd24gZmlsZW5hbWVzLXNlbGVjdCBmbHVpZCdcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJGRyb3Bkb3duLmFwcGVuZChcbiAgICAgICAgICAgICQoJzxpPicsIHsgY2xhc3M6ICdkcm9wZG93biBpY29uJyB9KSxcbiAgICAgICAgICAgICQoJzxpbnB1dD4nLCB7IHR5cGU6ICd0ZXh0JywgY2xhc3M6ICdzZWFyY2gnLCB0YWJpbmRleDogMCB9KSxcbiAgICAgICAgICAgICQoJzxkaXY+JywgeyBjbGFzczogJ2RlZmF1bHQgdGV4dCcgfSkudGV4dCgnU2VsZWN0IGxvZyBmaWxlJyksXG4gICAgICAgICAgICAkKCc8ZGl2PicsIHsgY2xhc3M6ICdtZW51JyB9KVxuICAgICAgICApO1xuXG4gICAgICAgICRoaWRkZW5JbnB1dC5iZWZvcmUoJGRyb3Bkb3duKTtcbiAgICAgICAgJGhpZGRlbklucHV0LmhpZGUoKTtcblxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duID0gJGRyb3Bkb3duO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgQUNFIGVkaXRvciBmb3IgbG9nIHZpZXdpbmcuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUFjZSgpIHtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyID0gYWNlLmVkaXQoJ2xvZy1jb250ZW50LXJlYWRvbmx5Jyk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIEp1bGlhIG1vZGUgaXMgYXZhaWxhYmxlXG4gICAgICAgIGNvbnN0IGp1bGlhID0gYWNlLnJlcXVpcmUoJ2FjZS9tb2RlL2p1bGlhJyk7XG4gICAgICAgIGlmIChqdWxpYSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAvLyBTZXQgdGhlIG1vZGUgdG8gSnVsaWEgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICBjb25zdCBJbmlNb2RlID0ganVsaWEuTW9kZTtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlci5zZXNzaW9uLnNldE1vZGUobmV3IEluaU1vZGUoKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgdGhlIHRoZW1lIGFuZCBvcHRpb25zIGZvciB0aGUgQUNFIGVkaXRvclxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIuc2V0VGhlbWUoJ2FjZS90aGVtZS9tb25va2FpJyk7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlci5yZW5kZXJlci5zZXRTaG93R3V0dGVyKGZhbHNlKTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnNldE9wdGlvbnMoe1xuICAgICAgICAgICAgc2hvd0xpbmVOdW1iZXJzOiBmYWxzZSxcbiAgICAgICAgICAgIHNob3dQcmludE1hcmdpbjogZmFsc2UsXG4gICAgICAgICAgICByZWFkT25seTogdHJ1ZSxcbiAgICAgICAgfSk7XG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQnVpbGRzIGEgaGllcmFyY2hpY2FsIHRyZWUgc3RydWN0dXJlIGZyb20gZmxhdCBmaWxlIHBhdGhzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGZpbGVzIC0gVGhlIGZpbGVzIG9iamVjdCBmcm9tIEFQSSByZXNwb25zZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBkZWZhdWx0UGF0aCAtIFRoZSBkZWZhdWx0IHNlbGVjdGVkIGZpbGUgcGF0aFxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gVHJlZSBzdHJ1Y3R1cmUgZm9yIHRoZSBkcm9wZG93blxuICAgICAqL1xuICAgIGJ1aWxkVHJlZVN0cnVjdHVyZShmaWxlcywgZGVmYXVsdFBhdGgpIHtcbiAgICAgICAgY29uc3QgdHJlZSA9IHt9O1xuICAgICAgICBcbiAgICAgICAgLy8gQnVpbGQgdGhlIHRyZWUgc3RydWN0dXJlXG4gICAgICAgIE9iamVjdC5lbnRyaWVzKGZpbGVzKS5mb3JFYWNoKChba2V5LCBmaWxlRGF0YV0pID0+IHtcbiAgICAgICAgICAgIC8vIFVzZSBmaWxlRGF0YS5wYXRoIGFzIHRoZSBhY3R1YWwgZmlsZSBwYXRoXG4gICAgICAgICAgICBjb25zdCBmaWxlUGF0aCA9IGZpbGVEYXRhLnBhdGggfHwga2V5O1xuICAgICAgICAgICAgY29uc3QgcGFydHMgPSBmaWxlUGF0aC5zcGxpdCgnLycpO1xuICAgICAgICAgICAgbGV0IGN1cnJlbnQgPSB0cmVlO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBwYXJ0cy5mb3JFYWNoKChwYXJ0LCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChpbmRleCA9PT0gcGFydHMubGVuZ3RoIC0gMSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBUaGlzIGlzIGEgZmlsZVxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50W3BhcnRdID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ZpbGUnLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aDogZmlsZVBhdGgsXG4gICAgICAgICAgICAgICAgICAgICAgICBzaXplOiBmaWxlRGF0YS5zaXplLFxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDogKGRlZmF1bHRQYXRoICYmIGRlZmF1bHRQYXRoID09PSBmaWxlUGF0aCkgfHwgKCFkZWZhdWx0UGF0aCAmJiBmaWxlRGF0YS5kZWZhdWx0KVxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgaXMgYSBkaXJlY3RvcnlcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFjdXJyZW50W3BhcnRdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXJyZW50W3BhcnRdID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU6ICdmb2xkZXInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoaWxkcmVuOiB7fVxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50ID0gY3VycmVudFtwYXJ0XS5jaGlsZHJlbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDb252ZXJ0IHRyZWUgdG8gZHJvcGRvd24gaXRlbXNcbiAgICAgICAgcmV0dXJuIHRoaXMudHJlZVRvRHJvcGRvd25JdGVtcyh0cmVlLCAnJyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDb252ZXJ0cyB0cmVlIHN0cnVjdHVyZSB0byBkcm9wZG93biBpdGVtcyB3aXRoIHByb3BlciBmb3JtYXR0aW5nXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHRyZWUgLSBUaGUgdHJlZSBzdHJ1Y3R1cmVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcHJlZml4IC0gUHJlZml4IGZvciBpbmRlbnRhdGlvblxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJlbnRGb2xkZXIgLSBQYXJlbnQgZm9sZGVyIG5hbWUgZm9yIGdyb3VwaW5nXG4gICAgICogQHJldHVybnMge0FycmF5fSBGb3JtYXR0ZWQgZHJvcGRvd24gaXRlbXNcbiAgICAgKi9cbiAgICB0cmVlVG9Ecm9wZG93bkl0ZW1zKHRyZWUsIHByZWZpeCwgcGFyZW50Rm9sZGVyUGF0aCA9ICcnKSB7XG4gICAgICAgIGNvbnN0IGl0ZW1zID0gW107XG5cbiAgICAgICAgLy8gU29ydCBlbnRyaWVzOiBmb2xkZXJzIGZpcnN0LCB0aGVuIGZpbGVzXG4gICAgICAgIGNvbnN0IGVudHJpZXMgPSBPYmplY3QuZW50cmllcyh0cmVlKS5zb3J0KChbYUtleSwgYVZhbF0sIFtiS2V5LCBiVmFsXSkgPT4ge1xuICAgICAgICAgICAgaWYgKGFWYWwudHlwZSA9PT0gJ2ZvbGRlcicgJiYgYlZhbC50eXBlID09PSAnZmlsZScpIHJldHVybiAtMTtcbiAgICAgICAgICAgIGlmIChhVmFsLnR5cGUgPT09ICdmaWxlJyAmJiBiVmFsLnR5cGUgPT09ICdmb2xkZXInKSByZXR1cm4gMTtcbiAgICAgICAgICAgIHJldHVybiBhS2V5LmxvY2FsZUNvbXBhcmUoYktleSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGVudHJpZXMuZm9yRWFjaCgoW2tleSwgdmFsdWVdKSA9PiB7XG4gICAgICAgICAgICBpZiAodmFsdWUudHlwZSA9PT0gJ2ZvbGRlcicpIHtcbiAgICAgICAgICAgICAgICAvLyBCdWlsZCB1bmlxdWUgZm9sZGVyIHBhdGggZm9yIGhpZXJhcmNoaWNhbCBjb2xsYXBzZVxuICAgICAgICAgICAgICAgIGNvbnN0IGZvbGRlclBhdGggPSBwYXJlbnRGb2xkZXJQYXRoID8gYCR7cGFyZW50Rm9sZGVyUGF0aH0vJHtrZXl9YCA6IGtleTtcblxuICAgICAgICAgICAgICAgIC8vIEFkZCBmb2xkZXIgaGVhZGVyIHdpdGggdG9nZ2xlIGNhcGFiaWxpdHkgYW5kIGluZGVudGF0aW9uIGZvciBuZXN0ZWQgZm9sZGVyc1xuICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBgJHtwcmVmaXh9PGkgY2xhc3M9XCJjYXJldCBkb3duIGljb24gZm9sZGVyLXRvZ2dsZVwiPjwvaT48aSBjbGFzcz1cImZvbGRlciBpY29uXCI+PC9pPiAke2tleX1gLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJycsXG4gICAgICAgICAgICAgICAgICAgIGRpc2FibGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZm9sZGVyJyxcbiAgICAgICAgICAgICAgICAgICAgZm9sZGVyTmFtZTogZm9sZGVyUGF0aCxcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50Rm9sZGVyOiBwYXJlbnRGb2xkZXJQYXRoXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBBZGQgY2hpbGRyZW4gd2l0aCBpbmNyZWFzZWQgaW5kZW50YXRpb24gYW5kIHBhcmVudCBmb2xkZXIgcGF0aFxuICAgICAgICAgICAgICAgIGNvbnN0IGNoaWxkSXRlbXMgPSB0aGlzLnRyZWVUb0Ryb3Bkb3duSXRlbXModmFsdWUuY2hpbGRyZW4sIHByZWZpeCArICcmbmJzcDsmbmJzcDsmbmJzcDsmbmJzcDsnLCBmb2xkZXJQYXRoKTtcbiAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKC4uLmNoaWxkSXRlbXMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBBZGQgZmlsZSBpdGVtIHdpdGggcGFyZW50IGZvbGRlciByZWZlcmVuY2VcbiAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogYCR7cHJlZml4fTxpIGNsYXNzPVwiZmlsZSBvdXRsaW5lIGljb25cIj48L2k+ICR7a2V5fSAoJHt2YWx1ZS5zaXplfSlgLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogdmFsdWUucGF0aCxcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWQ6IHZhbHVlLmRlZmF1bHQsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdmaWxlJyxcbiAgICAgICAgICAgICAgICAgICAgcGFyZW50Rm9sZGVyOiBwYXJlbnRGb2xkZXJQYXRoXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBpdGVtcztcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgY3VzdG9tIGRyb3Bkb3duIG1lbnUgSFRNTCBmb3IgbG9nIGZpbGVzIHdpdGggY29sbGFwc2libGUgZm9sZGVyc1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBjb250YWluaW5nIGRyb3Bkb3duIG1lbnUgb3B0aW9uc1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBmaWVsZHMgLSBUaGUgZmllbGRzIGluIHRoZSByZXNwb25zZSB0byB1c2UgZm9yIHRoZSBtZW51IG9wdGlvbnNcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgSFRNTCBzdHJpbmcgZm9yIHRoZSBjdXN0b20gZHJvcGRvd24gbWVudVxuICAgICAqL1xuICAgIGN1c3RvbURyb3Bkb3duTWVudShyZXNwb25zZSwgZmllbGRzKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlcyA9IHJlc3BvbnNlW2ZpZWxkcy52YWx1ZXNdIHx8IHt9O1xuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuXG4gICAgICAgICQuZWFjaCh2YWx1ZXMsIChpbmRleCwgb3B0aW9uKSA9PiB7XG4gICAgICAgICAgICAvLyBGb3IgdHJlZSBzdHJ1Y3R1cmUgaXRlbXNcbiAgICAgICAgICAgIGlmIChzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXMgJiYgc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zW2luZGV4XSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXNbaW5kZXhdO1xuXG4gICAgICAgICAgICAgICAgaWYgKGl0ZW0udHlwZSA9PT0gJ2ZvbGRlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRm9sZGVyIGl0ZW0gLSBjbGlja2FibGUgaGVhZGVyIGZvciBjb2xsYXBzZS9leHBhbmRcbiAgICAgICAgICAgICAgICAgICAgLy8gTm90IHVzaW5nICdkaXNhYmxlZCcgY2xhc3MgYXMgaXQgYmxvY2tzIHBvaW50ZXIgZXZlbnRzXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvbGRlclBhcmVudEF0dHIgPSBpdGVtLnBhcmVudEZvbGRlciA/IGBkYXRhLXBhcmVudD1cIiR7aXRlbS5wYXJlbnRGb2xkZXJ9XCJgIDogJyc7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJmb2xkZXItaGVhZGVyIGl0ZW1cIiBkYXRhLWZvbGRlcj1cIiR7aXRlbS5mb2xkZXJOYW1lfVwiICR7Zm9sZGVyUGFyZW50QXR0cn0gZGF0YS12YWx1ZT1cIlwiIGRhdGEtdGV4dD1cIiR7aXRlbS5mb2xkZXJOYW1lfVwiIHN0eWxlPVwicG9pbnRlci1ldmVudHM6IGF1dG8gIWltcG9ydGFudDsgY3Vyc29yOiBwb2ludGVyOyBmb250LXdlaWdodDogYm9sZDsgYmFja2dyb3VuZDogI2Y5ZjlmOTtcIj4ke2l0ZW0ubmFtZX08L2Rpdj5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZpbGUgaXRlbSB3aXRoIHBhcmVudCBmb2xkZXIgcmVmZXJlbmNlIGZvciBjb2xsYXBzZVxuICAgICAgICAgICAgICAgICAgICAvLyBkYXRhLXRleHQgY29udGFpbnMgZnVsbCBwYXRoIHNvIEZvbWFudGljIHNlYXJjaCBtYXRjaGVzIGJ5IGZvbGRlciBuYW1lIHRvb1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RlZCA9IGl0ZW0uc2VsZWN0ZWQgPyAnc2VsZWN0ZWQgYWN0aXZlJyA6ICcnO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJlbnRBdHRyID0gaXRlbS5wYXJlbnRGb2xkZXIgPyBgZGF0YS1wYXJlbnQ9XCIke2l0ZW0ucGFyZW50Rm9sZGVyfVwiYCA6ICcnO1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbSBmaWxlLWl0ZW0gJHtzZWxlY3RlZH1cIiBkYXRhLXZhbHVlPVwiJHtvcHRpb25bZmllbGRzLnZhbHVlXX1cIiBkYXRhLXRleHQ9XCIke29wdGlvbltmaWVsZHMudmFsdWVdfVwiICR7cGFyZW50QXR0cn0+JHtpdGVtLm5hbWV9PC9kaXY+YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIHJlZ3VsYXIgaXRlbVxuICAgICAgICAgICAgICAgIGNvbnN0IG1heWJlRGlzYWJsZWQgPSAob3B0aW9uW2ZpZWxkcy5kaXNhYmxlZF0pID8gJ2Rpc2FibGVkICcgOiAnJztcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiJHttYXliZURpc2FibGVkfWl0ZW1cIiBkYXRhLXZhbHVlPVwiJHtvcHRpb25bZmllbGRzLnZhbHVlXX1cIj4ke29wdGlvbltmaWVsZHMubmFtZV19PC9kaXY+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIGZvbGRlciBjb2xsYXBzZS9leHBhbmQgaGFuZGxlcnMgYW5kIHNlYXJjaCBiZWhhdmlvclxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb2xkZXJIYW5kbGVycygpIHtcbiAgICAgICAgY29uc3QgJGRyb3Bkb3duID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bjtcblxuICAgICAgICAvLyBIYW5kbGUgZm9sZGVyIGhlYWRlciBjbGlja3MgZm9yIGNvbGxhcHNlL2V4cGFuZFxuICAgICAgICAvLyBVc2UgZG9jdW1lbnQtbGV2ZWwgaGFuZGxlciB3aXRoIGNhcHR1cmUgcGhhc2UgdG8gaW50ZXJjZXB0IGJlZm9yZSBGb21hbnRpY1xuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICAvLyBDaGVjayBpZiBjbGljayBpcyBpbnNpZGUgb3VyIGRyb3Bkb3duJ3MgZm9sZGVyLWhlYWRlclxuICAgICAgICAgICAgY29uc3QgZm9sZGVySGVhZGVyID0gZS50YXJnZXQuY2xvc2VzdCgnI2ZpbGVuYW1lcy1kcm9wZG93biAuZm9sZGVyLWhlYWRlcicpO1xuICAgICAgICAgICAgaWYgKCFmb2xkZXJIZWFkZXIpIHJldHVybjtcblxuICAgICAgICAgICAgZS5zdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24oKTtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcblxuICAgICAgICAgICAgY29uc3QgJGZvbGRlciA9ICQoZm9sZGVySGVhZGVyKTtcbiAgICAgICAgICAgIGNvbnN0IGZvbGRlclBhdGggPSAkZm9sZGVyLmRhdGEoJ2ZvbGRlcicpO1xuICAgICAgICAgICAgY29uc3QgJHRvZ2dsZSA9ICRmb2xkZXIuZmluZCgnLmZvbGRlci10b2dnbGUnKTtcbiAgICAgICAgICAgIGNvbnN0ICRtZW51ID0gJGRyb3Bkb3duLmZpbmQoJy5tZW51Jyk7XG5cbiAgICAgICAgICAgIC8vIFRvZ2dsZSBmb2xkZXIgc3RhdGVcbiAgICAgICAgICAgIGNvbnN0IGlzQ29sbGFwc2VkID0gJHRvZ2dsZS5oYXNDbGFzcygncmlnaHQnKTtcblxuICAgICAgICAgICAgaWYgKGlzQ29sbGFwc2VkKSB7XG4gICAgICAgICAgICAgICAgLy8gRXhwYW5kIGZvbGRlciAtIHNob3cgb25seSBkaXJlY3QgY2hpbGRyZW5cbiAgICAgICAgICAgICAgICAkdG9nZ2xlLnJlbW92ZUNsYXNzKCdyaWdodCcpLmFkZENsYXNzKCdkb3duJyk7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBkaXJlY3QgY2hpbGQgZmlsZXMgYW5kIGNoaWxkIGZvbGRlciBoZWFkZXJzXG4gICAgICAgICAgICAgICAgJG1lbnUuZmluZChgLmZpbGUtaXRlbVtkYXRhLXBhcmVudD1cIiR7Zm9sZGVyUGF0aH1cIl1gKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgJG1lbnUuZmluZChgLmZvbGRlci1oZWFkZXJbZGF0YS1wYXJlbnQ9XCIke2ZvbGRlclBhdGh9XCJdYCkuc2hvdygpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBDb2xsYXBzZSBmb2xkZXIgLSBoaWRlIGFsbCBkZXNjZW5kYW50cyByZWN1cnNpdmVseVxuICAgICAgICAgICAgICAgICR0b2dnbGUucmVtb3ZlQ2xhc3MoJ2Rvd24nKS5hZGRDbGFzcygncmlnaHQnKTtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jb2xsYXBzZURlc2NlbmRhbnRzKCRtZW51LCBmb2xkZXJQYXRoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7IC8vIGNhcHR1cmUgcGhhc2UgLSBmaXJlcyBiZWZvcmUgYnViYmxpbmdcblxuICAgICAgICAvLyBIYW5kbGUgc2VhcmNoIGlucHV0IC0gc2hvdyBhbGwgaXRlbXMgd2hlbiBzZWFyY2hpbmdcbiAgICAgICAgJGRyb3Bkb3duLm9uKCdpbnB1dCcsICdpbnB1dC5zZWFyY2gnLCAoZSkgPT4ge1xuICAgICAgICAgICAgY29uc3Qgc2VhcmNoVmFsdWUgPSAkKGUudGFyZ2V0KS52YWwoKS50cmltKCk7XG4gICAgICAgICAgICBjb25zdCAkbWVudSA9ICRkcm9wZG93bi5maW5kKCcubWVudScpO1xuXG4gICAgICAgICAgICBpZiAoc2VhcmNoVmFsdWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgYWxsIGl0ZW1zIGFuZCBleHBhbmQgYWxsIGZvbGRlcnMgZHVyaW5nIHNlYXJjaFxuICAgICAgICAgICAgICAgICRtZW51LmZpbmQoJy5maWxlLWl0ZW0nKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgJG1lbnUuZmluZCgnLmZvbGRlci1oZWFkZXInKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgJG1lbnUuZmluZCgnLmZvbGRlci10b2dnbGUnKS5yZW1vdmVDbGFzcygncmlnaHQnKS5hZGRDbGFzcygnZG93bicpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBSZXN0b3JlIGNvbGxhcHNlZCBzdGF0ZSB3aGVuIHNlYXJjaCBpcyBjbGVhcmVkXG4gICAgICAgICAgICAgICAgJG1lbnUuZmluZCgnLmZvbGRlci1oZWFkZXInKS5lYWNoKChfLCBmb2xkZXIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgJGZvbGRlciA9ICQoZm9sZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZm9sZGVyUGF0aCA9ICRmb2xkZXIuZGF0YSgnZm9sZGVyJyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzQ29sbGFwc2VkID0gJGZvbGRlci5maW5kKCcuZm9sZGVyLXRvZ2dsZScpLmhhc0NsYXNzKCdyaWdodCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNDb2xsYXBzZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmNvbGxhcHNlRGVzY2VuZGFudHMoJG1lbnUsIGZvbGRlclBhdGgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZWN1cnNpdmVseSBoaWRlcyBhbGwgZGVzY2VuZGFudHMgKGZpbGVzIGFuZCBzdWJmb2xkZXJzKSBvZiBhIGdpdmVuIGZvbGRlclxuICAgICAqIGFuZCBtYXJrcyBjaGlsZCBmb2xkZXJzIGFzIGNvbGxhcHNlZFxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkbWVudSAtIFRoZSBkcm9wZG93biBtZW51IGVsZW1lbnRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZm9sZGVyUGF0aCAtIFRoZSBmb2xkZXIgcGF0aCB3aG9zZSBkZXNjZW5kYW50cyB0byBoaWRlXG4gICAgICovXG4gICAgY29sbGFwc2VEZXNjZW5kYW50cygkbWVudSwgZm9sZGVyUGF0aCkge1xuICAgICAgICAvLyBIaWRlIGRpcmVjdCBjaGlsZCBmaWxlc1xuICAgICAgICAkbWVudS5maW5kKGAuZmlsZS1pdGVtW2RhdGEtcGFyZW50PVwiJHtmb2xkZXJQYXRofVwiXWApLmhpZGUoKTtcblxuICAgICAgICAvLyBGaW5kIGRpcmVjdCBjaGlsZCBmb2xkZXJzLCBjb2xsYXBzZSB0aGVtIHJlY3Vyc2l2ZWx5LCB0aGVuIGhpZGVcbiAgICAgICAgJG1lbnUuZmluZChgLmZvbGRlci1oZWFkZXJbZGF0YS1wYXJlbnQ9XCIke2ZvbGRlclBhdGh9XCJdYCkuZWFjaCgoXywgY2hpbGRGb2xkZXIpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRjaGlsZEZvbGRlciA9ICQoY2hpbGRGb2xkZXIpO1xuICAgICAgICAgICAgY29uc3QgY2hpbGRQYXRoID0gJGNoaWxkRm9sZGVyLmRhdGEoJ2ZvbGRlcicpO1xuXG4gICAgICAgICAgICAvLyBNYXJrIGNoaWxkIGZvbGRlciBhcyBjb2xsYXBzZWRcbiAgICAgICAgICAgICRjaGlsZEZvbGRlci5maW5kKCcuZm9sZGVyLXRvZ2dsZScpLnJlbW92ZUNsYXNzKCdkb3duJykuYWRkQ2xhc3MoJ3JpZ2h0Jyk7XG5cbiAgICAgICAgICAgIC8vIFJlY3Vyc2l2ZWx5IGNvbGxhcHNlIGl0cyBkZXNjZW5kYW50c1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY29sbGFwc2VEZXNjZW5kYW50cygkbWVudSwgY2hpbGRQYXRoKTtcblxuICAgICAgICAgICAgLy8gSGlkZSB0aGUgY2hpbGQgZm9sZGVyIGhlYWRlciBpdHNlbGZcbiAgICAgICAgICAgICRjaGlsZEZvbGRlci5oaWRlKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFeHBhbmRzIHRoZSBmb2xkZXIgY29udGFpbmluZyB0aGUgc3BlY2lmaWVkIGZpbGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZVBhdGggLSBUaGUgZmlsZSBwYXRoIHRvIGZpbmQgYW5kIGV4cGFuZCBpdHMgcGFyZW50IGZvbGRlclxuICAgICAqL1xuICAgIGV4cGFuZEZvbGRlckZvckZpbGUoZmlsZVBhdGgpIHtcbiAgICAgICAgaWYgKCFmaWxlUGF0aCkgcmV0dXJuO1xuXG4gICAgICAgIGNvbnN0ICRtZW51ID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5maW5kKCcubWVudScpO1xuICAgICAgICBjb25zdCAkZmlsZUl0ZW0gPSAkbWVudS5maW5kKGAuZmlsZS1pdGVtW2RhdGEtdmFsdWU9XCIke2ZpbGVQYXRofVwiXWApO1xuXG4gICAgICAgIGlmICgkZmlsZUl0ZW0ubGVuZ3RoKSB7XG4gICAgICAgICAgICAvLyBXYWxrIHVwIHRoZSBhbmNlc3RvciBjaGFpbiBleHBhbmRpbmcgZWFjaCBmb2xkZXJcbiAgICAgICAgICAgIGxldCBwYXJlbnRQYXRoID0gJGZpbGVJdGVtLmRhdGEoJ3BhcmVudCcpO1xuICAgICAgICAgICAgd2hpbGUgKHBhcmVudFBhdGgpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkZm9sZGVyID0gJG1lbnUuZmluZChgLmZvbGRlci1oZWFkZXJbZGF0YS1mb2xkZXI9XCIke3BhcmVudFBhdGh9XCJdYCk7XG4gICAgICAgICAgICAgICAgaWYgKCEkZm9sZGVyLmxlbmd0aCkgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjb25zdCAkdG9nZ2xlID0gJGZvbGRlci5maW5kKCcuZm9sZGVyLXRvZ2dsZScpO1xuXG4gICAgICAgICAgICAgICAgLy8gU2hvdyB0aGUgZm9sZGVyIGhlYWRlciBpdHNlbGYgKG1heSBiZSBoaWRkZW4gaWYgcGFyZW50IHdhcyBjb2xsYXBzZWQpXG4gICAgICAgICAgICAgICAgJGZvbGRlci5zaG93KCk7XG5cbiAgICAgICAgICAgICAgICAvLyBFeHBhbmQgaWYgY29sbGFwc2VkXG4gICAgICAgICAgICAgICAgaWYgKCR0b2dnbGUuaGFzQ2xhc3MoJ3JpZ2h0JykpIHtcbiAgICAgICAgICAgICAgICAgICAgJHRvZ2dsZS5yZW1vdmVDbGFzcygncmlnaHQnKS5hZGRDbGFzcygnZG93bicpO1xuICAgICAgICAgICAgICAgICAgICAkbWVudS5maW5kKGAuZmlsZS1pdGVtW2RhdGEtcGFyZW50PVwiJHtwYXJlbnRQYXRofVwiXWApLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgJG1lbnUuZmluZChgLmZvbGRlci1oZWFkZXJbZGF0YS1wYXJlbnQ9XCIke3BhcmVudFBhdGh9XCJdYCkuc2hvdygpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIE1vdmUgdG8gZ3JhbmRwYXJlbnRcbiAgICAgICAgICAgICAgICBwYXJlbnRQYXRoID0gJGZvbGRlci5kYXRhKCdwYXJlbnQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIGhhc2ggY2hhbmdlcyB0byB1cGRhdGUgdGhlIHNlbGVjdGVkIGZpbGVcbiAgICAgKi9cbiAgICBoYW5kbGVIYXNoQ2hhbmdlKCkge1xuICAgICAgICAvLyBTa2lwIGR1cmluZyBpbml0aWFsaXphdGlvbiB0byBwcmV2ZW50IGR1cGxpY2F0ZSBBUEkgY2FsbHNcbiAgICAgICAgaWYgKHN5c3RlbURpYWdub3N0aWNMb2dzLmlzSW5pdGlhbGl6aW5nKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBoYXNoID0gd2luZG93LmxvY2F0aW9uLmhhc2g7XG4gICAgICAgIGlmIChoYXNoICYmIGhhc2guc3RhcnRzV2l0aCgnI2ZpbGU9JykpIHtcbiAgICAgICAgICAgIGNvbnN0IGZpbGVQYXRoID0gZGVjb2RlVVJJQ29tcG9uZW50KGhhc2guc3Vic3RyaW5nKDYpKTtcbiAgICAgICAgICAgIGlmIChmaWxlUGF0aCAmJiBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdnZXQgdmFsdWUnKSAhPT0gZmlsZVBhdGgpIHtcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiB0aGUgZmlsZSBleGlzdHMgaW4gZHJvcGRvd24gaXRlbXNcbiAgICAgICAgICAgICAgICBjb25zdCBmaWxlRXhpc3RzID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zLnNvbWUoaXRlbSA9PlxuICAgICAgICAgICAgICAgICAgICBpdGVtLnR5cGUgPT09ICdmaWxlJyAmJiBpdGVtLnZhbHVlID09PSBmaWxlUGF0aFxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgaWYgKGZpbGVFeGlzdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRXhwYW5kIHBhcmVudCBmb2xkZXIgYmVmb3JlIHNlbGVjdGluZyBmaWxlXG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmV4cGFuZEZvbGRlckZvckZpbGUoZmlsZVBhdGgpO1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBmaWxlUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldCB0ZXh0JywgZmlsZVBhdGgpO1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZmlsZW5hbWUnLCBmaWxlUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0cyB0aGUgZmlsZSBwYXRoIGZyb20gVVJMIGhhc2ggaWYgcHJlc2VudFxuICAgICAqL1xuICAgIGdldEZpbGVGcm9tSGFzaCgpIHtcbiAgICAgICAgY29uc3QgaGFzaCA9IHdpbmRvdy5sb2NhdGlvbi5oYXNoO1xuICAgICAgICBpZiAoaGFzaCAmJiBoYXNoLnN0YXJ0c1dpdGgoJyNmaWxlPScpKSB7XG4gICAgICAgICAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KGhhc2guc3Vic3RyaW5nKDYpKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGZvcm1hdCB0aGUgZHJvcGRvd24gbWVudSBzdHJ1Y3R1cmUgYmFzZWQgb24gdGhlIHJlc3BvbnNlLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBkYXRhLlxuICAgICAqL1xuICAgIGNiRm9ybWF0RHJvcGRvd25SZXN1bHRzKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIHJlc3BvbnNlIGlzIHZhbGlkXG4gICAgICAgIGlmICghcmVzcG9uc2UgfHwgIXJlc3BvbnNlLnJlc3VsdCB8fCAhcmVzcG9uc2UuZGF0YSB8fCAhcmVzcG9uc2UuZGF0YS5maWxlcykge1xuICAgICAgICAgICAgLy8gSGlkZSBkaW1tZXIgb25seSBpZiBub3QgaW4gYXV0by11cGRhdGUgbW9kZVxuICAgICAgICAgICAgaWYgKCFzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGZpbGVzID0gcmVzcG9uc2UuZGF0YS5maWxlcztcblxuICAgICAgICAvLyBDaGVjayBmb3IgZmlsZSBmcm9tIGhhc2ggZmlyc3RcbiAgICAgICAgbGV0IGRlZlZhbCA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmdldEZpbGVGcm9tSGFzaCgpO1xuXG4gICAgICAgIC8vIElmIG5vIGhhc2ggdmFsdWUsIGNoZWNrIGlmIHRoZXJlIGlzIGEgZGVmYXVsdCB2YWx1ZSBzZXQgZm9yIHRoZSBmaWxlbmFtZSBpbnB1dCBmaWVsZFxuICAgICAgICBpZiAoIWRlZlZhbCkge1xuICAgICAgICAgICAgY29uc3QgZmlsZU5hbWUgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZmlsZW5hbWUnKTtcbiAgICAgICAgICAgIGlmIChmaWxlTmFtZSAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICBkZWZWYWwgPSBmaWxlTmFtZS50cmltKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBCdWlsZCB0cmVlIHN0cnVjdHVyZSBmcm9tIGZpbGVzXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtcyA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmJ1aWxkVHJlZVN0cnVjdHVyZShmaWxlcywgZGVmVmFsKTtcblxuICAgICAgICAvLyBDcmVhdGUgdmFsdWVzIGFycmF5IGZvciBkcm9wZG93biB3aXRoIGFsbCBpdGVtcyAoaW5jbHVkaW5nIGZvbGRlcnMpXG4gICAgICAgIGNvbnN0IGRyb3Bkb3duVmFsdWVzID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zLm1hcCgoaXRlbSwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGlmIChpdGVtLnR5cGUgPT09ICdmb2xkZXInKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogaXRlbS5uYW1lLnJlcGxhY2UoLzxbXj5dKj4vZywgJycpLCAvLyBSZW1vdmUgSFRNTCB0YWdzIGZvciBzZWFyY2hcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICcnLFxuICAgICAgICAgICAgICAgICAgICBkaXNhYmxlZDogdHJ1ZVxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGl0ZW0ubmFtZS5yZXBsYWNlKC88W14+XSo+L2csICcnKSwgLy8gUmVtb3ZlIEhUTUwgdGFncyBmb3Igc2VhcmNoXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBpdGVtLnZhbHVlLFxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZDogaXRlbS5zZWxlY3RlZFxuICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGRyb3Bkb3duIHdpdGggdmFsdWVzXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldHVwIG1lbnUnLCB7XG4gICAgICAgICAgICB2YWx1ZXM6IGRyb3Bkb3duVmFsdWVzXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCB0aGUgZGVmYXVsdCBzZWxlY3RlZCB2YWx1ZSBpZiBhbnlcbiAgICAgICAgY29uc3Qgc2VsZWN0ZWRJdGVtID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zLmZpbmQoaXRlbSA9PiBpdGVtLnNlbGVjdGVkKTtcbiAgICAgICAgaWYgKHNlbGVjdGVkSXRlbSkge1xuICAgICAgICAgICAgLy8gVXNlIHNldFRpbWVvdXQgdG8gZW5zdXJlIGRyb3Bkb3duIGlzIGZ1bGx5IGluaXRpYWxpemVkXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBFeHBhbmQgcGFyZW50IGZvbGRlciBiZWZvcmUgc2VsZWN0aW5nIGZpbGVcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5leHBhbmRGb2xkZXJGb3JGaWxlKHNlbGVjdGVkSXRlbS52YWx1ZSk7XG4gICAgICAgICAgICAgICAgLy8gU2V0dGluZyBzZWxlY3RlZCB2YWx1ZSB3aWxsIHRyaWdnZXIgb25DaGFuZ2UgY2FsbGJhY2sgd2hpY2ggY2FsbHMgdXBkYXRlTG9nRnJvbVNlcnZlcigpXG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgc2VsZWN0ZWRJdGVtLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAvLyBGb3JjZSByZWZyZXNoIHRoZSBkcm9wZG93biB0byBzaG93IHRoZSBzZWxlY3RlZCB2YWx1ZVxuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3JlZnJlc2gnKTtcbiAgICAgICAgICAgICAgICAvLyBBbHNvIHNldCB0aGUgdGV4dCB0byBzaG93IGZ1bGwgcGF0aFxuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldCB0ZXh0Jywgc2VsZWN0ZWRJdGVtLnZhbHVlKTtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZmlsZW5hbWUnLCBzZWxlY3RlZEl0ZW0udmFsdWUpO1xuICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgfSBlbHNlIGlmIChkZWZWYWwpIHtcbiAgICAgICAgICAgIC8vIElmIHdlIGhhdmUgYSBkZWZhdWx0IHZhbHVlIGJ1dCBubyBpdGVtIHdhcyBtYXJrZWQgYXMgc2VsZWN0ZWQsXG4gICAgICAgICAgICAvLyB0cnkgdG8gZmluZCBhbmQgc2VsZWN0IGl0IG1hbnVhbGx5XG4gICAgICAgICAgICBjb25zdCBpdGVtVG9TZWxlY3QgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXMuZmluZChpdGVtID0+XG4gICAgICAgICAgICAgICAgaXRlbS50eXBlID09PSAnZmlsZScgJiYgaXRlbS52YWx1ZSA9PT0gZGVmVmFsXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgaWYgKGl0ZW1Ub1NlbGVjdCkge1xuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAvLyBFeHBhbmQgcGFyZW50IGZvbGRlciBiZWZvcmUgc2VsZWN0aW5nIGZpbGVcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuZXhwYW5kRm9sZGVyRm9yRmlsZShpdGVtVG9TZWxlY3QudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICAvLyBTZXR0aW5nIHNlbGVjdGVkIHZhbHVlIHdpbGwgdHJpZ2dlciBvbkNoYW5nZSBjYWxsYmFjayB3aGljaCBjYWxscyB1cGRhdGVMb2dGcm9tU2VydmVyKClcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgaXRlbVRvU2VsZWN0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bigncmVmcmVzaCcpO1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXQgdGV4dCcsIGl0ZW1Ub1NlbGVjdC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmaWxlbmFtZScsIGl0ZW1Ub1NlbGVjdC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gSGlkZSB0aGUgZGltbWVyIGFmdGVyIGxvYWRpbmcgb25seSBpZiBubyBmaWxlIGlzIHNlbGVjdGVkXG4gICAgICAgICAgICAgICAgaWYgKCFzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gSGlkZSB0aGUgZGltbWVyIGFmdGVyIGxvYWRpbmcgb25seSBpZiBubyBmaWxlIGlzIHNlbGVjdGVkXG4gICAgICAgICAgICBpZiAoIXN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gTWFyayBpbml0aWFsaXphdGlvbiBhcyBjb21wbGV0ZSB0byBhbGxvdyBoYXNoY2hhbmdlIGhhbmRsZXIgdG8gd29ya1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmlzSW5pdGlhbGl6aW5nID0gZmFsc2U7XG4gICAgICAgIH0sIDIwMCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGNoYW5naW5nIHRoZSBsb2cgZmlsZSBpbiB0aGUgc2VsZWN0IGRyb3Bkb3duLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSBzZWxlY3RlZCB2YWx1ZS5cbiAgICAgKi9cbiAgICBjYk9uQ2hhbmdlRmlsZSh2YWx1ZSkge1xuICAgICAgICBpZiAodmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgZHJvcGRvd24gdGV4dCB0byBzaG93IHRoZSBmdWxsIGZpbGUgcGF0aFxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXQgdGV4dCcsIHZhbHVlKTtcblxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZmlsZW5hbWUnLCB2YWx1ZSk7XG5cbiAgICAgICAgLy8gVXBkYXRlIFVSTCBoYXNoIHdpdGggdGhlIHNlbGVjdGVkIGZpbGVcbiAgICAgICAgd2luZG93LmxvY2F0aW9uLmhhc2ggPSAnZmlsZT0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlKTtcblxuICAgICAgICAvLyBSZXNldCBmaWx0ZXJzIG9ubHkgaWYgdXNlciBtYW51YWxseSBjaGFuZ2VkIHRoZSBmaWxlIChub3QgZHVyaW5nIGluaXRpYWxpemF0aW9uKVxuICAgICAgICBpZiAoIXN5c3RlbURpYWdub3N0aWNMb2dzLmlzSW5pdGlhbGl6aW5nKSB7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5yZXNldEZpbHRlcnMoKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEhpZGUgYXV0by1yZWZyZXNoIGJ1dHRvbiBmb3Igcm90YXRlZCBsb2cgZmlsZXMgKHRoZXkgZG9uJ3QgY2hhbmdlKVxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy51cGRhdGVBdXRvUmVmcmVzaFZpc2liaWxpdHkodmFsdWUpO1xuXG4gICAgICAgIC8vIFJlc2V0IGxhc3Qga25vd24gZGF0YSBlbmQgZm9yIG5ldyBmaWxlXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmxhc3RLbm93bkRhdGFFbmQgPSBudWxsO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIHRpbWUgcmFuZ2UgaXMgYXZhaWxhYmxlIGZvciB0aGlzIGZpbGVcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY2hlY2tUaW1lUmFuZ2VBdmFpbGFiaWxpdHkodmFsdWUpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiBmaWxlIGlzIGEgcm90YXRlZCBsb2cgZmlsZSAoYXJjaGl2ZWQsIG5vIGxvbmdlciBiZWluZyB3cml0dGVuIHRvKVxuICAgICAqIFJvdGF0ZWQgZmlsZXMgaGF2ZSBzdWZmaXhlcyBsaWtlOiAuMCwgLjEsIC4yLCAuZ3osIC4xLmd6LCAuMi5neiwgZXRjLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlbmFtZSAtIExvZyBmaWxlIHBhdGhcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gVHJ1ZSBpZiBmaWxlIGlzIHJvdGF0ZWQvYXJjaGl2ZWRcbiAgICAgKi9cbiAgICBpc1JvdGF0ZWRMb2dGaWxlKGZpbGVuYW1lKSB7XG4gICAgICAgIGlmICghZmlsZW5hbWUpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBNYXRjaCBwYXR0ZXJuczogLjAsIC4xLCAuMiwgLi4uLCAuZ3osIC4wLmd6LCAuMS5neiwgZXRjLlxuICAgICAgICByZXR1cm4gL1xcLlxcZCsoJHxcXC5neiQpfFxcLmd6JC8udGVzdChmaWxlbmFtZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBhdXRvLXJlZnJlc2ggYnV0dG9uIHZpc2liaWxpdHkgYmFzZWQgb24gZmlsZSB0eXBlXG4gICAgICogSGlkZSBmb3Igcm90YXRlZCBmaWxlcywgc2hvdyBmb3IgYWN0aXZlIGxvZyBmaWxlc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlbmFtZSAtIExvZyBmaWxlIHBhdGhcbiAgICAgKi9cbiAgICB1cGRhdGVBdXRvUmVmcmVzaFZpc2liaWxpdHkoZmlsZW5hbWUpIHtcbiAgICAgICAgY29uc3QgJGF1dG9CdG4gPSAkKCcjc2hvdy1sYXN0LWxvZy1hdXRvJyk7XG4gICAgICAgIGNvbnN0IGlzUm90YXRlZCA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmlzUm90YXRlZExvZ0ZpbGUoZmlsZW5hbWUpO1xuXG4gICAgICAgIGlmIChpc1JvdGF0ZWQpIHtcbiAgICAgICAgICAgIC8vIFN0b3AgYXV0by1yZWZyZXNoIGlmIGl0IHdhcyBhY3RpdmVcbiAgICAgICAgICAgIGlmIChzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAkYXV0b0J0bi5maW5kKCcuaWNvbnMgaS5yZWZyZXNoJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB1cGRhdGVMb2dWaWV3V29ya2VyLnN0b3AoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgICRhdXRvQnRuLmhpZGUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRhdXRvQnRuLnNob3coKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93IGZpbHRlciB0eXBlIHBvcHVwIGJlbG93IHRoZSBmaWx0ZXIgaW5wdXQuXG4gICAgICogUHJlLXNlbGVjdHMgdGhlIGZpcnN0IG9wdGlvbiBmb3IgaW1tZWRpYXRlIGtleWJvYXJkIG5hdmlnYXRpb24uXG4gICAgICovXG4gICAgc2hvd0ZpbHRlclR5cGVQb3B1cCgpIHtcbiAgICAgICAgY29uc3QgJHBvcHVwID0gJCgnI2ZpbHRlci10eXBlLXBvcHVwJyk7XG4gICAgICAgICRwb3B1cC5yZW1vdmVDbGFzcygnaGlkZGVuJylcbiAgICAgICAgICAgIC5jc3Moe3RvcDogJycsIGxlZnQ6ICcnLCBkaXNwbGF5OiAnJ30pXG4gICAgICAgICAgICAuc2hvdygpO1xuICAgICAgICAvLyBQcmUtc2VsZWN0IGZpcnN0IG9wdGlvbiBmb3Iga2V5Ym9hcmQgbmF2aWdhdGlvblxuICAgICAgICAkcG9wdXAuZmluZCgnLmZpbHRlci10eXBlLW9wdGlvbicpLnJlbW92ZUNsYXNzKCdmb2N1c2VkJyk7XG4gICAgICAgICRwb3B1cC5maW5kKCcuZmlsdGVyLXR5cGUtb3B0aW9uJykuZmlyc3QoKS5hZGRDbGFzcygnZm9jdXNlZCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIaWRlIHRoZSBmaWx0ZXIgdHlwZSBwb3B1cFxuICAgICAqL1xuICAgIGhpZGVGaWx0ZXJUeXBlUG9wdXAoKSB7XG4gICAgICAgIGNvbnN0ICRwb3B1cCA9ICQoJyNmaWx0ZXItdHlwZS1wb3B1cCcpO1xuICAgICAgICAkcG9wdXAuZmluZCgnLmZpbHRlci10eXBlLW9wdGlvbicpLnJlbW92ZUNsYXNzKCdmb2N1c2VkJyk7XG4gICAgICAgICRwb3B1cC5hZGRDbGFzcygnaGlkZGVuJykuaGlkZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBOYXZpZ2F0ZSBmaWx0ZXIgdHlwZSBwb3B1cCBvcHRpb25zIHdpdGggYXJyb3cga2V5cy5cbiAgICAgKiBXcmFwcyBhcm91bmQgYXQgYm91bmRhcmllcy5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gZGlyZWN0aW9uIC0gMSBmb3IgZG93biwgLTEgZm9yIHVwXG4gICAgICovXG4gICAgbmF2aWdhdGVGaWx0ZXJQb3B1cChkaXJlY3Rpb24pIHtcbiAgICAgICAgY29uc3QgJHBvcHVwID0gJCgnI2ZpbHRlci10eXBlLXBvcHVwJyk7XG4gICAgICAgIGNvbnN0ICRvcHRpb25zID0gJHBvcHVwLmZpbmQoJy5maWx0ZXItdHlwZS1vcHRpb24nKTtcbiAgICAgICAgY29uc3QgJGZvY3VzZWQgPSAkb3B0aW9ucy5maWx0ZXIoJy5mb2N1c2VkJyk7XG5cbiAgICAgICAgbGV0IGluZGV4ID0gJG9wdGlvbnMuaW5kZXgoJGZvY3VzZWQpO1xuICAgICAgICBpbmRleCArPSBkaXJlY3Rpb247XG5cbiAgICAgICAgLy8gV3JhcCBhcm91bmRcbiAgICAgICAgaWYgKGluZGV4IDwgMCkge1xuICAgICAgICAgICAgaW5kZXggPSAkb3B0aW9ucy5sZW5ndGggLSAxO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpbmRleCA+PSAkb3B0aW9ucy5sZW5ndGgpIHtcbiAgICAgICAgICAgIGluZGV4ID0gMDtcbiAgICAgICAgfVxuXG4gICAgICAgICRvcHRpb25zLnJlbW92ZUNsYXNzKCdmb2N1c2VkJyk7XG4gICAgICAgICRvcHRpb25zLmVxKGluZGV4KS5hZGRDbGFzcygnZm9jdXNlZCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGQgYSBmaWx0ZXIgY29uZGl0aW9uLCBzeW5jIHRvIGZvcm0sIHJlbmRlciBsYWJlbHMsIGFuZCByZWxvYWQgbG9nXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHR5cGUgLSAnY29udGFpbnMnIG9yICdub3RDb250YWlucydcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSB0aGUgZmlsdGVyIHRleHRcbiAgICAgKi9cbiAgICBhZGRGaWx0ZXJDb25kaXRpb24odHlwZSwgdmFsdWUpIHtcbiAgICAgICAgaWYgKCF2YWx1ZSB8fCB2YWx1ZS50cmltKCkgPT09ICcnKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuZmlsdGVyQ29uZGl0aW9ucy5wdXNoKHt0eXBlLCB2YWx1ZTogdmFsdWUudHJpbSgpfSk7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnN5bmNGaWx0ZXJDb25kaXRpb25zVG9Gb3JtKCk7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnJlbmRlckZpbHRlckxhYmVscygpO1xuICAgICAgICAkKCcjZmlsdGVyLWlucHV0JykudmFsKCcnKTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudXBkYXRlTG9nRnJvbVNlcnZlcih0cnVlKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVtb3ZlIGEgZmlsdGVyIGNvbmRpdGlvbiBieSBpbmRleFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBpbmRleCAtIGNvbmRpdGlvbiBpbmRleCB0byByZW1vdmVcbiAgICAgKi9cbiAgICByZW1vdmVGaWx0ZXJDb25kaXRpb24oaW5kZXgpIHtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuZmlsdGVyQ29uZGl0aW9ucy5zcGxpY2UoaW5kZXgsIDEpO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5zeW5jRmlsdGVyQ29uZGl0aW9uc1RvRm9ybSgpO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5yZW5kZXJGaWx0ZXJMYWJlbHMoKTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudXBkYXRlTG9nRnJvbVNlcnZlcih0cnVlKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xlYXIgYWxsIGZpbHRlciBjb25kaXRpb25zXG4gICAgICovXG4gICAgY2xlYXJBbGxGaWx0ZXJDb25kaXRpb25zKCkge1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5maWx0ZXJDb25kaXRpb25zID0gW107XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnN5bmNGaWx0ZXJDb25kaXRpb25zVG9Gb3JtKCk7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnJlbmRlckZpbHRlckxhYmVscygpO1xuICAgICAgICAkKCcjZmlsdGVyLWlucHV0JykudmFsKCcnKTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudXBkYXRlTG9nRnJvbVNlcnZlcih0cnVlKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2VyaWFsaXplIGZpbHRlckNvbmRpdGlvbnMgYXJyYXkgYXMgSlNPTiBpbnRvIGhpZGRlbiAjZmlsdGVyIGZpZWxkXG4gICAgICovXG4gICAgc3luY0ZpbHRlckNvbmRpdGlvbnNUb0Zvcm0oKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuZmlsdGVyQ29uZGl0aW9ucy5sZW5ndGggPiAwXG4gICAgICAgICAgICA/IEpTT04uc3RyaW5naWZ5KHN5c3RlbURpYWdub3N0aWNMb2dzLmZpbHRlckNvbmRpdGlvbnMpXG4gICAgICAgICAgICA6ICcnO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZmlsdGVyJywgdmFsdWUpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZW5kZXIgbGFiZWwgY2hpcHMgaW5zaWRlICNmaWx0ZXItbGFiZWxzIGZyb20gZmlsdGVyQ29uZGl0aW9uc1xuICAgICAqL1xuICAgIHJlbmRlckZpbHRlckxhYmVscygpIHtcbiAgICAgICAgY29uc3QgJGNvbnRhaW5lciA9ICQoJyNmaWx0ZXItbGFiZWxzJyk7XG4gICAgICAgICRjb250YWluZXIuZW1wdHkoKTtcblxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5maWx0ZXJDb25kaXRpb25zLmZvckVhY2goKGNvbmRpdGlvbiwgaW5kZXgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNzc0NsYXNzID0gY29uZGl0aW9uLnR5cGUgPT09ICdub3RDb250YWlucycgPyAnbm90LWNvbnRhaW5zJyA6ICdjb250YWlucyc7XG4gICAgICAgICAgICBjb25zdCBpY29uQ2xhc3MgPSBjb25kaXRpb24udHlwZSA9PT0gJ25vdENvbnRhaW5zJyA/ICdiYW4nIDogJ2NoZWNrIGNpcmNsZSc7XG4gICAgICAgICAgICBjb25zdCBpY29uQ29sb3IgPSBjb25kaXRpb24udHlwZSA9PT0gJ25vdENvbnRhaW5zJyA/ICdyZWQnIDogJ3RlYWwnO1xuICAgICAgICAgICAgY29uc3QgJGxhYmVsID0gJChgPHNwYW4gY2xhc3M9XCJmaWx0ZXItY29uZGl0aW9uLWxhYmVsICR7Y3NzQ2xhc3N9XCIgZGF0YS1pbmRleD1cIiR7aW5kZXh9XCI+PC9zcGFuPmApO1xuICAgICAgICAgICAgJGxhYmVsLmFwcGVuZChgPGkgY2xhc3M9XCIke2ljb25DbGFzc30gaWNvbiAke2ljb25Db2xvcn1cIj48L2k+YCk7XG4gICAgICAgICAgICAkbGFiZWwuYXBwZW5kKGA8c3Bhbj4keyQoJzxzcGFuPicpLnRleHQoY29uZGl0aW9uLnZhbHVlKS5odG1sKCl9PC9zcGFuPmApO1xuICAgICAgICAgICAgJGxhYmVsLmFwcGVuZCgnPGkgY2xhc3M9XCJkZWxldGUgaWNvblwiPjwvaT4nKTtcbiAgICAgICAgICAgICRjb250YWluZXIuYXBwZW5kKCRsYWJlbCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGZpbHRlciBjb25kaXRpb25zIGZyb20gVVJMIHBhcmFtZXRlciBvciBleGlzdGluZyBoaWRkZW4gZmllbGQgdmFsdWUuXG4gICAgICogSGFuZGxlcyBsZWdhY3kgcGxhaW4tc3RyaW5nIGZvcm1hdCAoZS5nLiBcIltDLTAwMDA0NzIxXSZbQy0wMDAwNDcyM11cIiBmcm9tIENEUiBsaW5rcylcbiAgICAgKiBieSBjb252ZXJ0aW5nICYtc2VwYXJhdGVkIHBhcnRzIGludG8gaW5kaXZpZHVhbCBcImNvbnRhaW5zXCIgY29uZGl0aW9ucy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRmlsdGVyRnJvbVVybCgpIHtcbiAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICAgICAgY29uc3QgZmlsdGVyUGFyYW0gPSB1cmxQYXJhbXMuZ2V0KCdmaWx0ZXInKTtcblxuICAgICAgICBpZiAoZmlsdGVyUGFyYW0gJiYgZmlsdGVyUGFyYW0udHJpbSgpICE9PSAnJykge1xuICAgICAgICAgICAgY29uc3QgdHJpbW1lZCA9IGZpbHRlclBhcmFtLnRyaW0oKTtcblxuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgaXQncyBKU09OIGZvcm1hdFxuICAgICAgICAgICAgaWYgKHRyaW1tZWQuc3RhcnRzV2l0aCgnWycpKSB7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZSh0cmltbWVkKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkocGFyc2VkKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuZmlsdGVyQ29uZGl0aW9ucyA9IHBhcnNlZC5maWx0ZXIoXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKGMpID0+IGMgJiYgYy52YWx1ZSAmJiBjLnR5cGVcbiAgICAgICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEludmFsaWQgSlNPTiwgdHJlYXQgYXMgbGVnYWN5XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmZpbHRlckNvbmRpdGlvbnMgPSB0cmltbWVkXG4gICAgICAgICAgICAgICAgICAgICAgICAuc3BsaXQoJyYnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLm1hcCgocCkgPT4gcC50cmltKCkpXG4gICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKChwKSA9PiBwICE9PSAnJylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoKHApID0+ICh7dHlwZTogJ2NvbnRhaW5zJywgdmFsdWU6IHB9KSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBMZWdhY3kgcGxhaW4gc3RyaW5nOiBzcGxpdCBieSAmIGludG8gY29udGFpbnMgY29uZGl0aW9uc1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmZpbHRlckNvbmRpdGlvbnMgPSB0cmltbWVkXG4gICAgICAgICAgICAgICAgICAgIC5zcGxpdCgnJicpXG4gICAgICAgICAgICAgICAgICAgIC5tYXAoKHApID0+IHAudHJpbSgpKVxuICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKChwKSA9PiBwICE9PSAnJylcbiAgICAgICAgICAgICAgICAgICAgLm1hcCgocCkgPT4gKHt0eXBlOiAnY29udGFpbnMnLCB2YWx1ZTogcH0pKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Muc3luY0ZpbHRlckNvbmRpdGlvbnNUb0Zvcm0oKTtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnJlbmRlckZpbHRlckxhYmVscygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlc2V0IGFsbCBmaWx0ZXJzIHdoZW4gY2hhbmdpbmcgbG9nIGZpbGVzXG4gICAgICovXG4gICAgcmVzZXRGaWx0ZXJzKCkge1xuICAgICAgICAvLyBEZWFjdGl2YXRlIGFsbCBxdWljay1wZXJpb2QgYnV0dG9uc1xuICAgICAgICAkKCcucGVyaW9kLWJ0bicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcblxuICAgICAgICAvLyBSZXNldCBsb2dMZXZlbCBkcm9wZG93biB0byBkZWZhdWx0IChBbGwgTGV2ZWxzIC0gZW1wdHkgdmFsdWUpXG4gICAgICAgICQoJyNsb2dMZXZlbC1kcm9wZG93bicpLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCAnJyk7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdsb2dMZXZlbCcsICcnKTtcblxuICAgICAgICAvLyBOT1RFOiBGaWx0ZXIgY29uZGl0aW9ucyBhcmUgaW50ZW50aW9uYWxseSBwcmVzZXJ2ZWQgd2hlbiBjaGFuZ2luZyBmaWxlcy5cbiAgICAgICAgLy8gV2hlbiB1c2VyIG5hdmlnYXRlcyBmcm9tIENEUiB3aXRoIGZpbHRlciBwYXJhbXMgKGUuZy4gP2ZpbHRlcj1bQy0wMDAwNDcyMV0pLFxuICAgICAgICAvLyB0aGUgZmlsdGVycyBzaG91bGQgcGVyc2lzdCBhY3Jvc3MgZmlsZSBjaGFuZ2VzICh2ZXJib3NlIOKGkiB2ZXJib3NlLjApLlxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgcGVyaW9kIGJ1dHRvbnMgdmlzaWJpbGl0eSBiYXNlZCBvbiBsb2cgZmlsZSBkdXJhdGlvblxuICAgICAqIFNob3dzIG9ubHkgYnV0dG9ucyBmb3IgcGVyaW9kcyB0aGF0IGFyZSA8PSBsb2cgZmlsZSBkdXJhdGlvblxuICAgICAqIEhpZGVzIGVudGlyZSBjb250YWluZXIgaWYgbm8gYnV0dG9ucyBhcmUgdmlzaWJsZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBsb2dEdXJhdGlvbiAtIExvZyBmaWxlIGR1cmF0aW9uIGluIHNlY29uZHNcbiAgICAgKi9cbiAgICB1cGRhdGVQZXJpb2RCdXR0b25zVmlzaWJpbGl0eShsb2dEdXJhdGlvbikge1xuICAgICAgICBjb25zdCAkcGVyaW9kQnV0dG9ucyA9ICQoJy5wZXJpb2QtYnRuJyk7XG4gICAgICAgIGNvbnN0ICRwZXJpb2RDb250YWluZXIgPSAkKCcjcGVyaW9kLWJ1dHRvbnMnKTtcbiAgICAgICAgbGV0IGxhcmdlc3RWaXNpYmxlUGVyaW9kID0gMDtcbiAgICAgICAgbGV0ICRsYXJnZXN0VmlzaWJsZUJ1dHRvbiA9IG51bGw7XG4gICAgICAgIGxldCB2aXNpYmxlQ291bnQgPSAwO1xuXG4gICAgICAgICRwZXJpb2RCdXR0b25zLmVhY2goKGluZGV4LCBidXR0b24pID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRidXR0b24gPSAkKGJ1dHRvbik7XG4gICAgICAgICAgICBjb25zdCBwZXJpb2QgPSBwYXJzZUludCgkYnV0dG9uLmRhdGEoJ3BlcmlvZCcpLCAxMCk7XG5cbiAgICAgICAgICAgIC8vIFNob3cgYnV0dG9uIGlmIHBlcmlvZCBpcyBsZXNzIHRoYW4gb3IgZXF1YWwgdG8gbG9nIGR1cmF0aW9uXG4gICAgICAgICAgICAvLyBBZGQgMTAlIHRvbGVyYW5jZSBmb3Igcm91bmRpbmcvZWRnZSBjYXNlc1xuICAgICAgICAgICAgaWYgKHBlcmlvZCA8PSBsb2dEdXJhdGlvbiAqIDEuMSkge1xuICAgICAgICAgICAgICAgICRidXR0b24uc2hvdygpO1xuICAgICAgICAgICAgICAgIHZpc2libGVDb3VudCsrO1xuICAgICAgICAgICAgICAgIC8vIFRyYWNrIHRoZSBsYXJnZXN0IHZpc2libGUgcGVyaW9kIGZvciBkZWZhdWx0IHNlbGVjdGlvblxuICAgICAgICAgICAgICAgIGlmIChwZXJpb2QgPiBsYXJnZXN0VmlzaWJsZVBlcmlvZCkge1xuICAgICAgICAgICAgICAgICAgICBsYXJnZXN0VmlzaWJsZVBlcmlvZCA9IHBlcmlvZDtcbiAgICAgICAgICAgICAgICAgICAgJGxhcmdlc3RWaXNpYmxlQnV0dG9uID0gJGJ1dHRvbjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRidXR0b24uaGlkZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIaWRlIGVudGlyZSBjb250YWluZXIgaWYgbm8gYnV0dG9ucyBhcmUgdmlzaWJsZVxuICAgICAgICAvLyBBbHNvIHRvZ2dsZSBjbGFzcyBvbiBwYXJlbnQgdG8gcmVtb3ZlIGdhcCBmb3IgcHJvcGVyIGFsaWdubWVudFxuICAgICAgICBjb25zdCAkdGltZUNvbnRyb2xzSW5saW5lID0gJCgnLnRpbWUtY29udHJvbHMtaW5saW5lJyk7XG4gICAgICAgIGlmICh2aXNpYmxlQ291bnQgPT09IDApIHtcbiAgICAgICAgICAgICRwZXJpb2RDb250YWluZXIuaGlkZSgpO1xuICAgICAgICAgICAgJHRpbWVDb250cm9sc0lubGluZS5hZGRDbGFzcygnbm8tcGVyaW9kLWJ1dHRvbnMnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRwZXJpb2RDb250YWluZXIuc2hvdygpO1xuICAgICAgICAgICAgJHRpbWVDb250cm9sc0lubGluZS5yZW1vdmVDbGFzcygnbm8tcGVyaW9kLWJ1dHRvbnMnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBsYXJnZXN0IHZpc2libGUgYnV0dG9uIGFzIGFjdGl2ZSAoaWYgbm8gYnV0dG9uIGlzIGN1cnJlbnRseSBhY3RpdmUpXG4gICAgICAgIGlmICgkbGFyZ2VzdFZpc2libGVCdXR0b24gJiYgISRwZXJpb2RCdXR0b25zLmZpbHRlcignLmFjdGl2ZScpLmlzKCc6dmlzaWJsZScpKSB7XG4gICAgICAgICAgICAkcGVyaW9kQnV0dG9ucy5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAkbGFyZ2VzdFZpc2libGVCdXR0b24uYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIHRpbWUgcmFuZ2UgaXMgYXZhaWxhYmxlIGZvciB0aGUgc2VsZWN0ZWQgbG9nIGZpbGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZW5hbWUgLSBMb2cgZmlsZSBwYXRoXG4gICAgICovXG4gICAgY2hlY2tUaW1lUmFuZ2VBdmFpbGFiaWxpdHkoZmlsZW5hbWUpIHtcbiAgICAgICAgLy8gU2hvdyBkaW1tZXIgb25seSBpZiBub3QgaW4gYXV0by11cGRhdGUgbW9kZVxuICAgICAgICBpZiAoIXN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgIH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gVHJ5IHRvIGdldCB0aW1lIHJhbmdlIGZvciB0aGlzIGZpbGVcbiAgICAgICAgICAgIFN5c2xvZ0FQSS5nZXRMb2dUaW1lUmFuZ2UoZmlsZW5hbWUsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLnRpbWVfcmFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVGltZSByYW5nZSBpcyBhdmFpbGFibGUgLSB1c2UgdGltZS1iYXNlZCBuYXZpZ2F0aW9uXG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmluaXRpYWxpemVOYXZpZ2F0aW9uKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRpbWUgcmFuZ2Ugbm90IGF2YWlsYWJsZSAtIHVzZSBsaW5lIG51bWJlciBmYWxsYmFja1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pbml0aWFsaXplTmF2aWdhdGlvbihudWxsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGNoZWNraW5nIHRpbWUgcmFuZ2U6JywgZXJyb3IpO1xuICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gbGluZSBudW1iZXIgbW9kZVxuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaW5pdGlhbGl6ZU5hdmlnYXRpb24obnVsbCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB1bml2ZXJzYWwgbmF2aWdhdGlvbiB3aXRoIHRpbWUgb3IgbGluZSBudW1iZXIgbW9kZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSB0aW1lUmFuZ2VEYXRhIC0gVGltZSByYW5nZSBkYXRhIGZyb20gQVBJIChvcHRpb25hbClcbiAgICAgKi9cbiAgICBpbml0aWFsaXplTmF2aWdhdGlvbih0aW1lUmFuZ2VEYXRhKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIHdlIGhhdmUgdmFsaWQgdGltZSByYW5nZSB3aXRoIGFjdHVhbCB0aW1lc3RhbXBzIChub3QgbnVsbClcbiAgICAgICAgY29uc3QgaGFzVmFsaWRUaW1lUmFuZ2UgPSB0aW1lUmFuZ2VEYXRhICYmXG4gICAgICAgICAgICB0aW1lUmFuZ2VEYXRhLnRpbWVfcmFuZ2UgJiZcbiAgICAgICAgICAgIHR5cGVvZiB0aW1lUmFuZ2VEYXRhLnRpbWVfcmFuZ2Uuc3RhcnQgPT09ICdudW1iZXInICYmXG4gICAgICAgICAgICB0eXBlb2YgdGltZVJhbmdlRGF0YS50aW1lX3JhbmdlLmVuZCA9PT0gJ251bWJlcic7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGltZSByYW5nZSBpcyBtZWFuaW5nZnVsIChtb3JlIHRoYW4gMSBzZWNvbmQgb2YgZGF0YSlcbiAgICAgICAgY29uc3QgaGFzTXVsdGlwbGVUaW1lc3RhbXBzID0gaGFzVmFsaWRUaW1lUmFuZ2UgJiZcbiAgICAgICAgICAgICh0aW1lUmFuZ2VEYXRhLnRpbWVfcmFuZ2UuZW5kIC0gdGltZVJhbmdlRGF0YS50aW1lX3JhbmdlLnN0YXJ0KSA+IDE7XG5cbiAgICAgICAgaWYgKGhhc1ZhbGlkVGltZVJhbmdlICYmIGhhc011bHRpcGxlVGltZXN0YW1wcykge1xuICAgICAgICAgICAgLy8gVGltZS1iYXNlZCBtb2RlXG4gICAgICAgICAgICB0aGlzLnRpbWVTbGlkZXJFbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFRpbWVSYW5nZSA9IHRpbWVSYW5nZURhdGEudGltZV9yYW5nZTtcblxuICAgICAgICAgICAgLy8gQ2FsY3VsYXRlIGxvZyBmaWxlIGR1cmF0aW9uIGFuZCB1cGRhdGUgcGVyaW9kIGJ1dHRvbnMgdmlzaWJpbGl0eVxuICAgICAgICAgICAgY29uc3QgbG9nRHVyYXRpb24gPSB0aGlzLmN1cnJlbnRUaW1lUmFuZ2UuZW5kIC0gdGhpcy5jdXJyZW50VGltZVJhbmdlLnN0YXJ0O1xuICAgICAgICAgICAgdGhpcy51cGRhdGVQZXJpb2RCdXR0b25zVmlzaWJpbGl0eShsb2dEdXJhdGlvbik7XG5cbiAgICAgICAgICAgIC8vIFNob3cgcGVyaW9kIGJ1dHRvbnMgZm9yIHRpbWUtYmFzZWQgbmF2aWdhdGlvblxuICAgICAgICAgICAgJCgnI3BlcmlvZC1idXR0b25zJykuc2hvdygpO1xuXG4gICAgICAgICAgICAvLyBTZXQgc2VydmVyIHRpbWV6b25lIG9mZnNldFxuICAgICAgICAgICAgaWYgKHRpbWVSYW5nZURhdGEuc2VydmVyX3RpbWV6b25lX29mZnNldCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgU1ZHVGltZWxpbmUuc2VydmVyVGltZXpvbmVPZmZzZXQgPSB0aW1lUmFuZ2VEYXRhLnNlcnZlcl90aW1lem9uZV9vZmZzZXQ7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgU1ZHIHRpbWVsaW5lIHdpdGggdGltZSByYW5nZVxuICAgICAgICAgICAgU1ZHVGltZWxpbmUuaW5pdGlhbGl6ZSgnI3RpbWUtc2xpZGVyLWNvbnRhaW5lcicsIHRoaXMuY3VycmVudFRpbWVSYW5nZSk7XG5cbiAgICAgICAgICAgIC8vIFNldCBjYWxsYmFjayBmb3IgdGltZSB3aW5kb3cgY2hhbmdlc1xuICAgICAgICAgICAgLy8gQWx3YXlzIHVzZSBsYXRlc3Q9dHJ1ZSBzbyB0aGUgbW9zdCByZWNlbnQgbG9nIGVudHJpZXMgYXJlIGRpc3BsYXllZFxuICAgICAgICAgICAgLy8gVHJ1bmNhdGlvbiAoaWYgYW55KSBoYXBwZW5zIG9uIHRoZSBsZWZ0IHNpZGUsIHdoaWNoIGlzIGxlc3MgZGlzcnVwdGl2ZVxuICAgICAgICAgICAgU1ZHVGltZWxpbmUub25SYW5nZUNoYW5nZSA9IChzdGFydCwgZW5kLCBkcmFnZ2VkSGFuZGxlKSA9PiB7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9hZExvZ0J5VGltZVJhbmdlKHN0YXJ0LCBlbmQsIHRydWUpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gU2V0IGNhbGxiYWNrIGZvciB0cnVuY2F0ZWQgem9uZSBjbGlja3NcbiAgICAgICAgICAgIC8vIExlZnQgem9uZXMgKHRpbWVsaW5lLXRydW5jYXRlZC1sZWZ0KTogZGF0YSB3YXMgY3V0IGZyb20gYmVnaW5uaW5nLCBsb2FkIHdpdGggbGF0ZXN0PXRydWVcbiAgICAgICAgICAgIC8vIFJpZ2h0IHpvbmVzICh0aW1lbGluZS10cnVuY2F0ZWQtcmlnaHQpOiBkYXRhIHdhcyBjdXQgZnJvbSBlbmQsIGxvYWQgd2l0aCBsYXRlc3Q9ZmFsc2VcbiAgICAgICAgICAgIFNWR1RpbWVsaW5lLm9uVHJ1bmNhdGVkWm9uZUNsaWNrID0gKHN0YXJ0LCBlbmQsIGlzTGVmdFpvbmUpID0+IHtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2FkTG9nQnlUaW1lUmFuZ2Uoc3RhcnQsIGVuZCwgaXNMZWZ0Wm9uZSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBMb2FkIGluaXRpYWwgY2h1bmsgd2l0aCBsYXRlc3Q9dHJ1ZSB0byBzaG93IG5ld2VzdCBlbnRyaWVzXG4gICAgICAgICAgICAvLyBQYXNzIGlzSW5pdGlhbExvYWQ9dHJ1ZSB0byBzdXBwcmVzcyB0cnVuY2F0ZWQgem9uZSBkaXNwbGF5IG9uIGZpcnN0IGxvYWRcbiAgICAgICAgICAgIC8vIFVzZSB0aGUgbGFyZ2VzdCB2aXNpYmxlIHBlcmlvZCBidXR0b24gb3IgMSBob3VyIGFzIGZhbGxiYWNrXG4gICAgICAgICAgICBjb25zdCAkYWN0aXZlQnV0dG9uID0gJCgnLnBlcmlvZC1idG4uYWN0aXZlOnZpc2libGUnKTtcbiAgICAgICAgICAgIGNvbnN0IGluaXRpYWxQZXJpb2QgPSAkYWN0aXZlQnV0dG9uLmxlbmd0aCA+IDBcbiAgICAgICAgICAgICAgICA/IHBhcnNlSW50KCRhY3RpdmVCdXR0b24uZGF0YSgncGVyaW9kJyksIDEwKVxuICAgICAgICAgICAgICAgIDogTWF0aC5taW4oMzYwMCwgbG9nRHVyYXRpb24pO1xuICAgICAgICAgICAgY29uc3QgaW5pdGlhbFN0YXJ0ID0gTWF0aC5tYXgodGhpcy5jdXJyZW50VGltZVJhbmdlLmVuZCAtIGluaXRpYWxQZXJpb2QsIHRoaXMuY3VycmVudFRpbWVSYW5nZS5zdGFydCk7XG4gICAgICAgICAgICB0aGlzLmxvYWRMb2dCeVRpbWVSYW5nZShpbml0aWFsU3RhcnQsIHRoaXMuY3VycmVudFRpbWVSYW5nZS5lbmQsIHRydWUsIHRydWUpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTGluZSBudW1iZXIgZmFsbGJhY2sgbW9kZVxuICAgICAgICAgICAgdGhpcy50aW1lU2xpZGVyRW5hYmxlZCA9IGZhbHNlO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VGltZVJhbmdlID0gbnVsbDtcblxuICAgICAgICAgICAgLy8gSGlkZSBwZXJpb2QgYnV0dG9ucyBpbiBsaW5lIG51bWJlciBtb2RlXG4gICAgICAgICAgICAkKCcjcGVyaW9kLWJ1dHRvbnMnKS5oaWRlKCk7XG5cbiAgICAgICAgICAgIC8vIEluaXRpYWxpemUgU1ZHIHRpbWVsaW5lIHdpdGggbGluZSBudW1iZXJzXG4gICAgICAgICAgICAvLyBGb3Igbm93LCB1c2UgZGVmYXVsdCByYW5nZSB1bnRpbCB3ZSBnZXQgdG90YWwgbGluZSBjb3VudFxuICAgICAgICAgICAgY29uc3QgbGluZVJhbmdlID0geyBzdGFydDogMCwgZW5kOiAxMDAwMCB9O1xuICAgICAgICAgICAgU1ZHVGltZWxpbmUuaW5pdGlhbGl6ZSgnI3RpbWUtc2xpZGVyLWNvbnRhaW5lcicsIGxpbmVSYW5nZSwgJ2xpbmVzJyk7XG5cbiAgICAgICAgICAgIC8vIFNldCBjYWxsYmFjayBmb3IgbGluZSByYW5nZSBjaGFuZ2VzXG4gICAgICAgICAgICBTVkdUaW1lbGluZS5vblJhbmdlQ2hhbmdlID0gKHN0YXJ0LCBlbmQpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBMb2FkIGJ5IGxpbmUgbnVtYmVycyAob2Zmc2V0L2xpbmVzKVxuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmxvYWRMb2dCeUxpbmVzKE1hdGguZmxvb3Ioc3RhcnQpLCBNYXRoLmNlaWwoZW5kIC0gc3RhcnQpKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIExvYWQgaW5pdGlhbCBsaW5lc1xuICAgICAgICAgICAgdGhpcy51cGRhdGVMb2dGcm9tU2VydmVyKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBsb2cgYnkgbGluZSBudW1iZXJzIChmb3IgZmlsZXMgd2l0aG91dCB0aW1lc3RhbXBzKVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBvZmZzZXQgLSBTdGFydGluZyBsaW5lIG51bWJlclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBsaW5lcyAtIE51bWJlciBvZiBsaW5lcyB0byBsb2FkXG4gICAgICovXG4gICAgbG9hZExvZ0J5TGluZXMob2Zmc2V0LCBsaW5lcykge1xuICAgICAgICAvLyBTaG93IGRpbW1lciBvbmx5IGlmIG5vdCBpbiBhdXRvLXVwZGF0ZSBtb2RlXG4gICAgICAgIGlmICghc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlKSB7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IHtcbiAgICAgICAgICAgIGZpbGVuYW1lOiB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmaWxlbmFtZScpLFxuICAgICAgICAgICAgZmlsdGVyOiB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmaWx0ZXInKSB8fCAnJyxcbiAgICAgICAgICAgIGxvZ0xldmVsOiB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdsb2dMZXZlbCcpIHx8ICcnLFxuICAgICAgICAgICAgb2Zmc2V0OiBNYXRoLm1heCgwLCBvZmZzZXQpLFxuICAgICAgICAgICAgbGluZXM6IE1hdGgubWluKDUwMDAsIE1hdGgubWF4KDEwMCwgbGluZXMpKVxuICAgICAgICB9O1xuXG4gICAgICAgIFN5c2xvZ0FQSS5nZXRMb2dGcm9tRmlsZShwYXJhbXMsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgLy8gSGlkZSBkaW1tZXIgb25seSBpZiBub3QgaW4gYXV0by11cGRhdGUgbW9kZVxuICAgICAgICAgICAgaWYgKCFzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiAnY29udGVudCcgaW4gcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIC8vIFNldCBjb250ZW50IGluIGVkaXRvciAoZXZlbiBpZiBlbXB0eSlcbiAgICAgICAgICAgICAgICB0aGlzLnZpZXdlci5zZXRWYWx1ZShyZXNwb25zZS5kYXRhLmNvbnRlbnQgfHwgJycsIC0xKTtcblxuICAgICAgICAgICAgICAgIC8vIEdvIHRvIHRoZSBiZWdpbm5pbmdcbiAgICAgICAgICAgICAgICB0aGlzLnZpZXdlci5nb3RvTGluZSgxKTtcbiAgICAgICAgICAgICAgICB0aGlzLnZpZXdlci5zY3JvbGxUb0xpbmUoMCwgdHJ1ZSwgdHJ1ZSwgKCkgPT4ge30pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBsb2cgYnkgdGltZSByYW5nZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBzdGFydFRpbWVzdGFtcCAtIFN0YXJ0IHRpbWVzdGFtcFxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBlbmRUaW1lc3RhbXAgLSBFbmQgdGltZXN0YW1wXG4gICAgICogQHBhcmFtIHtib29sZWFufSBsYXRlc3QgLSBJZiB0cnVlLCByZXR1cm4gbmV3ZXN0IGxpbmVzIGZpcnN0IChmb3IgaW5pdGlhbCBsb2FkKVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNJbml0aWFsTG9hZCAtIElmIHRydWUsIHN1cHByZXNzIHRydW5jYXRlZCB6b25lIGRpc3BsYXlcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGlzQXV0b1VwZGF0ZSAtIElmIHRydWUsIHNraXAgdGltZWxpbmUgcmVjYWxjdWxhdGlvbiAob25seSB1cGRhdGUgY29udGVudClcbiAgICAgKi9cbiAgICBsb2FkTG9nQnlUaW1lUmFuZ2Uoc3RhcnRUaW1lc3RhbXAsIGVuZFRpbWVzdGFtcCwgbGF0ZXN0ID0gZmFsc2UsIGlzSW5pdGlhbExvYWQgPSBmYWxzZSwgaXNBdXRvVXBkYXRlID0gZmFsc2UpIHtcbiAgICAgICAgLy8gU2hvdyBkaW1tZXIgb25seSBpZiBub3QgaW4gYXV0by11cGRhdGUgbW9kZVxuICAgICAgICBpZiAoIXN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwYXJhbXMgPSB7XG4gICAgICAgICAgICBmaWxlbmFtZTogdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZmlsZW5hbWUnKSxcbiAgICAgICAgICAgIGZpbHRlcjogdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZmlsdGVyJykgfHwgJycsXG4gICAgICAgICAgICBsb2dMZXZlbDogdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnbG9nTGV2ZWwnKSB8fCAnJyxcbiAgICAgICAgICAgIGRhdGVGcm9tOiBzdGFydFRpbWVzdGFtcCxcbiAgICAgICAgICAgIGRhdGVUbzogZW5kVGltZXN0YW1wLFxuICAgICAgICAgICAgbGluZXM6IDUwMDAsIC8vIE1heGltdW0gbGluZXMgdG8gbG9hZFxuICAgICAgICAgICAgbGF0ZXN0OiBsYXRlc3QgLy8gSWYgdHJ1ZSwgcmV0dXJuIG5ld2VzdCBsaW5lcyAodGFpbCB8IHRhYylcbiAgICAgICAgfTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgU3lzbG9nQVBJLmdldExvZ0Zyb21GaWxlKHBhcmFtcywgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhICYmICdjb250ZW50JyBpbiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0NvbnRlbnQgPSByZXNwb25zZS5kYXRhLmNvbnRlbnQgfHwgJyc7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKGlzQXV0b1VwZGF0ZSAmJiBuZXdDb250ZW50Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEF1dG8tdXBkYXRlIG1vZGU6IGFwcGVuZCBvbmx5IG5ldyBsaW5lc1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY3VycmVudENvbnRlbnQgPSB0aGlzLnZpZXdlci5nZXRWYWx1ZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3TGluZXMgPSB0aGlzLmZpbmROZXdMaW5lcyhjdXJyZW50Q29udGVudCwgbmV3Q29udGVudCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChuZXdMaW5lcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gQXBwZW5kIG5ldyBsaW5lcyBhdCB0aGUgZW5kXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2Vzc2lvbiA9IHRoaXMudmlld2VyLnNlc3Npb247XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbGFzdFJvdyA9IHNlc3Npb24uZ2V0TGVuZ3RoKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2Vzc2lvbi5pbnNlcnQoeyByb3c6IGxhc3RSb3csIGNvbHVtbjogMCB9LCAnXFxuJyArIG5ld0xpbmVzLmpvaW4oJ1xcbicpKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdvIHRvIHRoZSBsYXN0IGxpbmUgdG8gZm9sbG93IG5ldyBlbnRyaWVzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmluYWxSb3cgPSBzZXNzaW9uLmdldExlbmd0aCgpIC0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaW5hbENvbHVtbiA9IHNlc3Npb24uZ2V0TGluZShmaW5hbFJvdykubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudmlld2VyLmdvdG9MaW5lKGZpbmFsUm93ICsgMSwgZmluYWxDb2x1bW4pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gTm9ybWFsIG1vZGU6IHNldCBjb250ZW50IGFuZCBnbyB0byBlbmRcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudmlld2VyLnNldFZhbHVlKG5ld0NvbnRlbnQsIC0xKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gR28gdG8gdGhlIGVuZCBvZiB0aGUgbG9nXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCByb3cgPSB0aGlzLnZpZXdlci5zZXNzaW9uLmdldExlbmd0aCgpIC0gMTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbHVtbiA9IHRoaXMudmlld2VyLnNlc3Npb24uZ2V0TGluZShyb3cpLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudmlld2VyLmdvdG9MaW5lKHJvdyArIDEsIGNvbHVtbik7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBBZGp1c3Qgc2xpZGVyIHRvIGFjdHVhbCBsb2FkZWQgdGltZSByYW5nZSAoc2lsZW50bHkpXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmFjdHVhbF9yYW5nZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYWN0dWFsID0gcmVzcG9uc2UuZGF0YS5hY3R1YWxfcmFuZ2U7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFsd2F5cyB1cGRhdGUgZnVsbFJhbmdlIGJvdW5kYXJ5IGJhc2VkIG9uIGFjdHVhbCBkYXRhIGZyb20gc2VydmVyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGlzIGVuc3VyZXMgbm8tZGF0YSB6b25lcyBkaXNwbGF5IGNvcnJlY3RseSBhZnRlciByZWZyZXNoXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWN0dWFsLmVuZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFNWR1RpbWVsaW5lLnVwZGF0ZURhdGFCb3VuZGFyeShhY3R1YWwuZW5kKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBUcmFjayBsYXN0IGtub3duIGRhdGEgZW5kIGZvciByZWZyZXNoIGFuY2hvcmluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmxhc3RLbm93bkRhdGFFbmQgPSBhY3R1YWwuZW5kO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBBbHdheXMgdXBkYXRlIHRpbWVsaW5lIHdpdGggc2VydmVyIHJlc3BvbnNlIChleGNlcHQgZHVyaW5nIGF1dG8tdXBkYXRlKVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gdXBkYXRlRnJvbVNlcnZlclJlc3BvbnNlKCkgaGFuZGxlczpcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIC0gVXBkYXRpbmcgc2VsZWN0ZWRSYW5nZSB0byBhY3R1YWwgZGF0YSBib3VuZGFyaWVzXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAtIFByZXNlcnZpbmcgdmlzaWJsZVJhbmdlLmVuZCBpZiBpdCB3YXMgZXh0ZW5kZWQgdG8gY3VycmVudCB0aW1lIChmb3Igbm8tZGF0YSB6b25lcylcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIC0gTWFuYWdpbmcgdHJ1bmNhdGlvbiB6b25lcyBkaXNwbGF5XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWlzQXV0b1VwZGF0ZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFNWR1RpbWVsaW5lLnVwZGF0ZUZyb21TZXJ2ZXJSZXNwb25zZShhY3R1YWwsIHN0YXJ0VGltZXN0YW1wLCBlbmRUaW1lc3RhbXAsIGlzSW5pdGlhbExvYWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gSGlkZSBkaW1tZXIgb25seSBpZiBub3QgaW4gYXV0by11cGRhdGUgbW9kZVxuICAgICAgICAgICAgICAgIGlmICghc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgbG9hZGluZyBsb2cgYnkgdGltZSByYW5nZTonLCBlcnJvcik7XG4gICAgICAgICAgICAvLyBIaWRlIGRpbW1lciBvbmx5IGlmIG5vdCBpbiBhdXRvLXVwZGF0ZSBtb2RlXG4gICAgICAgICAgICBpZiAoIXN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFwcGx5IHF1aWNrIHBlcmlvZCBzZWxlY3Rpb24gKFlhbmRleCBDbG91ZCBMb2dWaWV3ZXIgc3R5bGUpXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHBlcmlvZFNlY29uZHMgLSBQZXJpb2QgaW4gc2Vjb25kc1xuICAgICAqL1xuICAgIGFwcGx5UXVpY2tQZXJpb2QocGVyaW9kU2Vjb25kcykge1xuICAgICAgICBpZiAoIXRoaXMuY3VycmVudFRpbWVSYW5nZSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlIG5ldyBhcHBseVBlcmlvZCBtZXRob2QgdGhhdCBoYW5kbGVzIHZpc2libGUgcmFuZ2UgYW5kIGF1dG8tY2VudGVyaW5nXG4gICAgICAgIFNWR1RpbWVsaW5lLmFwcGx5UGVyaW9kKHBlcmlvZFNlY29uZHMpO1xuICAgICAgICAvLyBDYWxsYmFjayB3aWxsIGJlIHRyaWdnZXJlZCBhdXRvbWF0aWNhbGx5IGJ5IFNWR1RpbWVsaW5lXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFwcGx5IGxvZyBsZXZlbCBmaWx0ZXJcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbGV2ZWwgLSBMb2cgbGV2ZWwgKGFsbCwgZXJyb3IsIHdhcm5pbmcsIGluZm8sIGRlYnVnKVxuICAgICAqL1xuICAgIGFwcGx5TG9nTGV2ZWxGaWx0ZXIobGV2ZWwpIHtcbiAgICAgICAgbGV0IGZpbHRlclBhdHRlcm4gPSAnJztcblxuICAgICAgICAvLyBDcmVhdGUgcmVnZXggcGF0dGVybiBiYXNlZCBvbiBsZXZlbFxuICAgICAgICBzd2l0Y2ggKGxldmVsKSB7XG4gICAgICAgICAgICBjYXNlICdlcnJvcic6XG4gICAgICAgICAgICAgICAgZmlsdGVyUGF0dGVybiA9ICdFUlJPUnxDUklUSUNBTHxGQVRBTCc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICd3YXJuaW5nJzpcbiAgICAgICAgICAgICAgICBmaWx0ZXJQYXR0ZXJuID0gJ1dBUk5JTkd8V0FSTic7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdpbmZvJzpcbiAgICAgICAgICAgICAgICBmaWx0ZXJQYXR0ZXJuID0gJ0lORk8nO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZGVidWcnOlxuICAgICAgICAgICAgICAgIGZpbHRlclBhdHRlcm4gPSAnREVCVUcnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnYWxsJzpcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgZmlsdGVyUGF0dGVybiA9ICcnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIGZpbHRlciBmaWVsZFxuICAgICAgICB0aGlzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmaWx0ZXInLCBmaWx0ZXJQYXR0ZXJuKTtcblxuICAgICAgICAvLyBSZWxvYWQgbG9ncyB3aXRoIG5ldyBmaWx0ZXJcbiAgICAgICAgdGhpcy51cGRhdGVMb2dGcm9tU2VydmVyKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZldGNoZXMgdGhlIGxvZyBmaWxlIGNvbnRlbnQgZnJvbSB0aGUgc2VydmVyLlxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gcHJlc2VydmVSYW5nZSAtIElmIHRydWUsIHVzZSBjdXJyZW50IFNWRyB0aW1lbGluZSBzZWxlY3Rpb24gaW5zdGVhZCBvZlxuICAgICAqICAgcmVjYWxjdWxhdGluZyB0byBcImxhc3QgMSBob3VyXCIuIFVzZWQgd2hlbiBmaWx0ZXIvbGV2ZWwgY2hhbmdlcyB0byBrZWVwIHRoZSBzYW1lIHZpZXcuXG4gICAgICovXG4gICAgdXBkYXRlTG9nRnJvbVNlcnZlcihwcmVzZXJ2ZVJhbmdlID0gZmFsc2UpIHtcbiAgICAgICAgaWYgKHRoaXMudGltZVNsaWRlckVuYWJsZWQpIHtcbiAgICAgICAgICAgIC8vIEluIHRpbWUgc2xpZGVyIG1vZGUsIHJlbG9hZCBjdXJyZW50IHdpbmRvd1xuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudFRpbWVSYW5nZSkge1xuXG4gICAgICAgICAgICAgICAgLy8gV2hlbiBwcmVzZXJ2ZVJhbmdlIGlzIHRydWUgKGZpbHRlci9sZXZlbCBjaGFuZ2UpLCB1c2UgY3VycmVudCB0aW1lbGluZSBzZWxlY3Rpb25cbiAgICAgICAgICAgICAgICAvLyBXSFk6IENoYW5naW5nIGZpbHRlcnMgc2hvdWxkIG5vdCByZXNldCB0aGUgdGltZSB3aW5kb3cg4oCUIHVzZXIgZXhwZWN0cyB0byBzZWVcbiAgICAgICAgICAgICAgICAvLyB0aGUgc2FtZSBwZXJpb2Qgd2l0aCBkaWZmZXJlbnQgZmlsdGVyaW5nIGFwcGxpZWRcbiAgICAgICAgICAgICAgICBpZiAocHJlc2VydmVSYW5nZSAmJiBTVkdUaW1lbGluZS5zZWxlY3RlZFJhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMubG9hZExvZ0J5VGltZVJhbmdlKFxuICAgICAgICAgICAgICAgICAgICAgICAgU1ZHVGltZWxpbmUuc2VsZWN0ZWRSYW5nZS5zdGFydCxcbiAgICAgICAgICAgICAgICAgICAgICAgIFNWR1RpbWVsaW5lLnNlbGVjdGVkUmFuZ2UuZW5kLFxuICAgICAgICAgICAgICAgICAgICAgICAgdHJ1ZSwgZmFsc2UsIHRoaXMuaXNBdXRvVXBkYXRlQWN0aXZlXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjb25zdCBvbmVIb3VyID0gMzYwMDtcblxuICAgICAgICAgICAgICAgIC8vIEdldCBjdXJyZW50IGZpbGVuYW1lIHRvIGNoZWNrIGlmIGl0J3MgYSByb3RhdGVkIGxvZyBmaWxlXG4gICAgICAgICAgICAgICAgY29uc3QgZmlsZW5hbWUgPSB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmaWxlbmFtZScpO1xuICAgICAgICAgICAgICAgIGNvbnN0IGlzUm90YXRlZCA9IHRoaXMuaXNSb3RhdGVkTG9nRmlsZShmaWxlbmFtZSk7XG5cbiAgICAgICAgICAgICAgICBsZXQgZW5kVGltZXN0YW1wO1xuICAgICAgICAgICAgICAgIGxldCBzdGFydFRpbWVzdGFtcDtcblxuICAgICAgICAgICAgICAgIGlmIChpc1JvdGF0ZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRm9yIHJvdGF0ZWQgZmlsZXM6IHVzZSB0aGUgZmlsZSdzIGFjdHVhbCB0aW1lIHJhbmdlXG4gICAgICAgICAgICAgICAgICAgIC8vIFJvdGF0ZWQgZmlsZXMgZG9uJ3QgcmVjZWl2ZSBuZXcgZGF0YSwgc28gY3VycmVudFRpbWVSYW5nZSBpcyBmaXhlZFxuICAgICAgICAgICAgICAgICAgICBlbmRUaW1lc3RhbXAgPSB0aGlzLmN1cnJlbnRUaW1lUmFuZ2UuZW5kO1xuICAgICAgICAgICAgICAgICAgICBzdGFydFRpbWVzdGFtcCA9IE1hdGgubWF4KHRoaXMuY3VycmVudFRpbWVSYW5nZS5lbmQgLSBvbmVIb3VyLCB0aGlzLmN1cnJlbnRUaW1lUmFuZ2Uuc3RhcnQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZvciBhY3RpdmUgbG9nIGZpbGVzOiB1c2UgY3VycmVudCB0aW1lIHRvIGNhcHR1cmUgbmV3IGVudHJpZXNcbiAgICAgICAgICAgICAgICAgICAgZW5kVGltZXN0YW1wID0gTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gV0hZOiBBbmNob3Igc3RhcnRUaW1lc3RhbXAgdG8gdGhlIGxhc3Qga25vd24gZGF0YSBlbmQsIG5vdCB3YWxsIGNsb2NrIHRpbWUuXG4gICAgICAgICAgICAgICAgICAgIC8vIFVzaW5nIFwibm93IC0gcGVyaW9kXCIgcHJvZHVjZXMgYW4gZW1wdHkgcmFuZ2Ugd2hlbiB0aGUgZmlsZSBoYXNuJ3QgYmVlblxuICAgICAgICAgICAgICAgICAgICAvLyB3cml0dGVuIHRvIHJlY2VudGx5IChlLmcuLCBpZGxlIG1vZHVsZSBsb2dzIGxpa2UgTW9kdWxlQXV0b0NSTS9TYWxvblN5bmNlci5sb2cpLlxuICAgICAgICAgICAgICAgICAgICAvLyBsYXN0S25vd25EYXRhRW5kIGhvbGRzIHRoZSBhY3R1YWwgdGltZXN0YW1wIG9mIHRoZSBsYXN0IGxpbmUgZnJvbSB0aGUgQVBJIHJlc3BvbnNlLlxuICAgICAgICAgICAgICAgICAgICBjb25zdCBkYXRhRW5kID0gdGhpcy5sYXN0S25vd25EYXRhRW5kIHx8IHRoaXMuY3VycmVudFRpbWVSYW5nZS5lbmQ7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0VGltZXN0YW1wID0gTWF0aC5tYXgoZGF0YUVuZCAtIG9uZUhvdXIsIHRoaXMuY3VycmVudFRpbWVSYW5nZS5zdGFydCk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIGN1cnJlbnRUaW1lUmFuZ2UuZW5kIHRvIHJlZmxlY3QgbmV3IGRhdGEgYXZhaWxhYmlsaXR5XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFRpbWVSYW5nZS5lbmQgPSBlbmRUaW1lc3RhbXA7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRk9SQ0UgdXBkYXRlIHRoZSBTVkcgdGltZWxpbmUgdmlzaWJsZSByYW5nZSB0byBjdXJyZW50IHRpbWVcbiAgICAgICAgICAgICAgICAgICAgLy8gZm9yY2U9dHJ1ZSBlbnN1cmVzIHZpc2libGVSYW5nZS5lbmQgaXMgc2V0IGV2ZW4gaWYgaXQgd2FzIGFscmVhZHkgPj0gZW5kVGltZXN0YW1wXG4gICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgaGFuZGxlcyB0aW1lem9uZSBkaWZmZXJlbmNlcyB3aGVyZSBzZXJ2ZXIgdGltZSBtaWdodCBhcHBlYXIgXCJpbiB0aGUgZnV0dXJlXCJcbiAgICAgICAgICAgICAgICAgICAgU1ZHVGltZWxpbmUuZXh0ZW5kUmFuZ2UoZW5kVGltZXN0YW1wLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBVc2UgbGF0ZXN0PXRydWUgdG8gc2hvdyBuZXdlc3QgZW50cmllcyAoZm9yIHNob3ctbGFzdC1sb2cgLyBhdXRvLXVwZGF0ZSBidXR0b25zKVxuICAgICAgICAgICAgICAgIC8vIFBhc3MgaXNBdXRvVXBkYXRlPXRydWUgd2hlbiBhdXRvLXJlZnJlc2ggaXMgYWN0aXZlIHRvIHByZXZlbnQgdGltZWxpbmUgZmxpY2tlcmluZ1xuICAgICAgICAgICAgICAgIHRoaXMubG9hZExvZ0J5VGltZVJhbmdlKHN0YXJ0VGltZXN0YW1wLCBlbmRUaW1lc3RhbXAsIHRydWUsIGZhbHNlLCB0aGlzLmlzQXV0b1VwZGF0ZUFjdGl2ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBMaW5lIG51bWJlciBtb2RlXG4gICAgICAgICAgICBjb25zdCBwYXJhbXMgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgICAgICBwYXJhbXMubGluZXMgPSA1MDAwOyAvLyBNYXggbGluZXNcbiAgICAgICAgICAgIFN5c2xvZ0FQSS5nZXRMb2dGcm9tRmlsZShwYXJhbXMsIHN5c3RlbURpYWdub3N0aWNMb2dzLmNiVXBkYXRlTG9nVGV4dCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRmluZCBuZXcgbGluZXMgdGhhdCBhcmUgbm90IGluIGN1cnJlbnQgY29udGVudFxuICAgICAqIENvbXBhcmVzIGxhc3QgbGluZXMgb2YgY3VycmVudCBjb250ZW50IHdpdGggbmV3IGNvbnRlbnQgdG8gZmluZCBvdmVybGFwXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGN1cnJlbnRDb250ZW50IC0gQ3VycmVudCBlZGl0b3IgY29udGVudFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBuZXdDb250ZW50IC0gTmV3IGNvbnRlbnQgZnJvbSBzZXJ2ZXJcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IEFycmF5IG9mIG5ldyBsaW5lcyB0byBhcHBlbmRcbiAgICAgKi9cbiAgICBmaW5kTmV3TGluZXMoY3VycmVudENvbnRlbnQsIG5ld0NvbnRlbnQpIHtcbiAgICAgICAgaWYgKCFjdXJyZW50Q29udGVudCB8fCBjdXJyZW50Q29udGVudC50cmltKCkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAvLyBJZiBlZGl0b3IgaXMgZW1wdHksIGFsbCBsaW5lcyBhcmUgbmV3XG4gICAgICAgICAgICByZXR1cm4gbmV3Q29udGVudC5zcGxpdCgnXFxuJykuZmlsdGVyKGxpbmUgPT4gbGluZS50cmltKCkubGVuZ3RoID4gMCk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjdXJyZW50TGluZXMgPSBjdXJyZW50Q29udGVudC5zcGxpdCgnXFxuJyk7XG4gICAgICAgIGNvbnN0IG5ld0xpbmVzID0gbmV3Q29udGVudC5zcGxpdCgnXFxuJyk7XG5cbiAgICAgICAgLy8gR2V0IGxhc3Qgbm9uLWVtcHR5IGxpbmUgZnJvbSBjdXJyZW50IGNvbnRlbnQgYXMgYW5jaG9yXG4gICAgICAgIGxldCBhbmNob3JMaW5lID0gJyc7XG4gICAgICAgIGZvciAobGV0IGkgPSBjdXJyZW50TGluZXMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50TGluZXNbaV0udHJpbSgpLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBhbmNob3JMaW5lID0gY3VycmVudExpbmVzW2ldO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFhbmNob3JMaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gbmV3TGluZXMuZmlsdGVyKGxpbmUgPT4gbGluZS50cmltKCkubGVuZ3RoID4gMCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGaW5kIGFuY2hvciBsaW5lIGluIG5ldyBjb250ZW50XG4gICAgICAgIGxldCBhbmNob3JJbmRleCA9IC0xO1xuICAgICAgICBmb3IgKGxldCBpID0gbmV3TGluZXMubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgIGlmIChuZXdMaW5lc1tpXSA9PT0gYW5jaG9yTGluZSkge1xuICAgICAgICAgICAgICAgIGFuY2hvckluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChhbmNob3JJbmRleCA9PT0gLTEpIHtcbiAgICAgICAgICAgIC8vIEFuY2hvciBub3QgZm91bmQgLSBjb250ZW50IGNoYW5nZWQgc2lnbmlmaWNhbnRseSwgcmV0dXJuIGVtcHR5XG4gICAgICAgICAgICAvLyBUaGlzIHByZXZlbnRzIGR1cGxpY2F0ZXMgd2hlbiBsb2cgcm90YXRlcyBvciBmaWx0ZXIgY2hhbmdlc1xuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmV0dXJuIGxpbmVzIGFmdGVyIGFuY2hvclxuICAgICAgICBjb25zdCByZXN1bHQgPSBuZXdMaW5lcy5zbGljZShhbmNob3JJbmRleCArIDEpLmZpbHRlcihsaW5lID0+IGxpbmUudHJpbSgpLmxlbmd0aCA+IDApO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSBsb2cgdmlldy5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSBBUEkuXG4gICAgICovXG4gICAgY2JVcGRhdGVMb2dUZXh0KHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIEhpZGUgZGltbWVyIG9ubHkgaWYgbm90IGluIGF1dG8tdXBkYXRlIG1vZGVcbiAgICAgICAgaWYgKCFzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUpIHtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSGFuZGxlIHYzIEFQSSByZXNwb25zZSBzdHJ1Y3R1cmVcbiAgICAgICAgaWYgKCFyZXNwb25zZSB8fCAhcmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UubWVzc2FnZXMpIHtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY29udGVudCA9IHJlc3BvbnNlLmRhdGE/LmNvbnRlbnQgfHwgJyc7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlci5nZXRTZXNzaW9uKCkuc2V0VmFsdWUoY29udGVudCk7XG4gICAgICAgIGNvbnN0IHJvdyA9IHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlci5zZXNzaW9uLmdldExlbmd0aCgpIC0gMTtcbiAgICAgICAgY29uc3QgY29sdW1uID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnNlc3Npb24uZ2V0TGluZShyb3cpLmxlbmd0aDtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLmdvdG9MaW5lKHJvdyArIDEsIGNvbHVtbik7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGNsaWNraW5nIHRoZSBcIkRvd25sb2FkIEZpbGVcIiBidXR0b24uXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGRhdGEuXG4gICAgICovXG4gICAgY2JEb3dubG9hZEZpbGUocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gSGFuZGxlIHYzIEFQSSByZXNwb25zZSBzdHJ1Y3R1cmVcbiAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSByZXNwb25zZS5kYXRhLmZpbGVuYW1lIHx8IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UubWVzc2FnZXMpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgY2xpY2tpbmcgdGhlIFwiRXJhc2UgRmlsZVwiIGJ1dHRvbi5cbiAgICAgKi9cbiAgICBlcmFzZUN1cnJlbnRGaWxlQ29udGVudCgpe1xuICAgICAgICBjb25zdCBmaWxlTmFtZSA9IHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmaWxlbmFtZScpO1xuICAgICAgICBpZiAoZmlsZU5hbWUubGVuZ3RoPjApe1xuICAgICAgICAgICAgU3lzbG9nQVBJLmVyYXNlRmlsZShmaWxlTmFtZSwgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY2JBZnRlckZpbGVFcmFzZWQpXG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgY2xpY2tpbmcgdGhlIFwiRXJhc2UgRmlsZVwiIGJ1dHRvbiBhbmQgY2FsbGluZyBSRVNUIEFQSSBjb21tYW5kXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGRhdGEuXG4gICAgICovXG4gICAgY2JBZnRlckZpbGVFcmFzZWQocmVzcG9uc2Upe1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0PT09ZmFsc2UgJiYgcmVzcG9uc2UubWVzc2FnZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKTtcbiAgICAgICAgfVxuICAgIH0sXG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgc2hvdyBzeXN0ZW0gbG9ncyB0YWJcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pbml0aWFsaXplKCk7XG59KTsiXX0=