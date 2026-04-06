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
    // Ensure filter type popup starts hidden with clean styles
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TeXN0ZW1EaWFnbm9zdGljL3N5c3RlbS1kaWFnbm9zdGljLWluZGV4LXNob3dsb2dzLmpzIl0sIm5hbWVzIjpbInN5c3RlbURpYWdub3N0aWNMb2dzIiwiJHNob3dCdG4iLCIkIiwiJGRvd25sb2FkQnRuIiwiJHNob3dBdXRvQnRuIiwiJGVyYXNlQnRuIiwiJGxvZ0NvbnRlbnQiLCJ2aWV3ZXIiLCIkZmlsZVNlbGVjdERyb3BEb3duIiwibG9nc0l0ZW1zIiwiJGRpbW1lciIsIiRmb3JtT2JqIiwiaXNJbml0aWFsaXppbmciLCJ0aW1lU2xpZGVyRW5hYmxlZCIsImN1cnJlbnRUaW1lUmFuZ2UiLCJpc0F1dG9VcGRhdGVBY3RpdmUiLCJmaWx0ZXJDb25kaXRpb25zIiwicGVuZGluZ0ZpbHRlclRleHQiLCJsYXN0S25vd25EYXRhRW5kIiwiaW5pdGlhbGl6ZSIsImFkZENsYXNzIiwiaGlkZSIsImNzcyIsInRvcCIsImxlZnQiLCJhY2VIZWlnaHQiLCJ3aW5kb3ciLCJpbm5lckhlaWdodCIsImNsb3Nlc3QiLCJjcmVhdGVEcm9wZG93bkZyb21IaWRkZW5JbnB1dCIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJjYk9uQ2hhbmdlRmlsZSIsImlnbm9yZUNhc2UiLCJmdWxsVGV4dFNlYXJjaCIsImZvcmNlU2VsZWN0aW9uIiwicHJlc2VydmVIVE1MIiwiYWxsb3dDYXRlZ29yeVNlbGVjdGlvbiIsIm1hdGNoIiwiZmlsdGVyUmVtb3RlRGF0YSIsImFjdGlvbiIsInRlbXBsYXRlcyIsIm1lbnUiLCJjdXN0b21Ecm9wZG93bk1lbnUiLCJpbml0aWFsaXplRm9sZGVySGFuZGxlcnMiLCJpbml0aWFsaXplQWNlIiwiU3lzbG9nQVBJIiwiZ2V0TG9nc0xpc3QiLCJjYkZvcm1hdERyb3Bkb3duUmVzdWx0cyIsImluaXRpYWxpemVMb2dMZXZlbERyb3Bkb3duIiwiaW5pdGlhbGl6ZUZpbHRlckZyb21VcmwiLCJkb2N1bWVudCIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwiJGJ0biIsImN1cnJlbnRUYXJnZXQiLCJwZXJpb2QiLCJkYXRhIiwicmVtb3ZlQ2xhc3MiLCJhcHBseVF1aWNrUGVyaW9kIiwiZW5kIiwib25lSG91ciIsInN0YXJ0IiwiTWF0aCIsIm1heCIsIlNWR1RpbWVsaW5lIiwic2V0UmFuZ2UiLCJsb2FkTG9nQnlUaW1lUmFuZ2UiLCJsZXZlbCIsImFwcGx5TG9nTGV2ZWxGaWx0ZXIiLCJ1cGRhdGVMb2dGcm9tU2VydmVyIiwiaGFuZGxlSGFzaENoYW5nZSIsImZvcm0iLCJkb3dubG9hZExvZ0ZpbGUiLCJmaWxlbmFtZSIsImNiRG93bmxvYWRGaWxlIiwiJGJ1dHRvbiIsIiRyZWxvYWRJY29uIiwiZmluZCIsImhhc0NsYXNzIiwidXBkYXRlTG9nVmlld1dvcmtlciIsInN0b3AiLCJlcmFzZUN1cnJlbnRGaWxlQ29udGVudCIsImV2ZW50IiwiJHBvcHVwIiwiaXNQb3B1cFZpc2libGUiLCJpcyIsImtleSIsIm5hdmlnYXRlRmlsdGVyUG9wdXAiLCIkZm9jdXNlZCIsImxlbmd0aCIsInRyaWdnZXIiLCJ0ZXh0IiwidmFsIiwidHJpbSIsInNob3dGaWx0ZXJUeXBlUG9wdXAiLCJoaWRlRmlsdGVyVHlwZVBvcHVwIiwicmVtb3ZlRmlsdGVyQ29uZGl0aW9uIiwic2V0VGltZW91dCIsImFkZEZpbHRlckNvbmRpdGlvbiIsInR5cGUiLCJzdG9wUHJvcGFnYXRpb24iLCJpbmRleCIsImNsZWFyQWxsRmlsdGVyQ29uZGl0aW9ucyIsInRhcmdldCIsImZvY3VzIiwidG9nZ2xlRnVsbFNjcmVlbiIsImFkZEV2ZW50TGlzdGVuZXIiLCJhZGp1c3RMb2dIZWlnaHQiLCJsb2dDb250YWluZXIiLCJnZXRFbGVtZW50QnlJZCIsImZ1bGxzY3JlZW5FbGVtZW50IiwicmVxdWVzdEZ1bGxzY3JlZW4iLCJlcnIiLCJjb25zb2xlIiwiZXJyb3IiLCJtZXNzYWdlIiwiZXhpdEZ1bGxzY3JlZW4iLCJvZmZzZXQiLCJyZXNpemUiLCIkaGlkZGVuSW5wdXQiLCIkZHJvcGRvd24iLCJpZCIsIiR0ZXh0IiwiZ2xvYmFsVHJhbnNsYXRlIiwic2RfQWxsTGV2ZWxzIiwiJGljb24iLCIkbWVudSIsIml0ZW1zIiwidmFsdWUiLCJpY29uIiwic2RfRXJyb3IiLCJzZF9XYXJuaW5nIiwic2RfTm90aWNlIiwic2RfSW5mbyIsInNkX0RlYnVnIiwiZm9yRWFjaCIsIml0ZW0iLCIkaXRlbSIsImh0bWwiLCJhcHBlbmQiLCJhZnRlciIsInRhYmluZGV4IiwiYmVmb3JlIiwiYWNlIiwiZWRpdCIsImp1bGlhIiwicmVxdWlyZSIsInVuZGVmaW5lZCIsIkluaU1vZGUiLCJNb2RlIiwic2Vzc2lvbiIsInNldE1vZGUiLCJzZXRUaGVtZSIsInJlbmRlcmVyIiwic2V0U2hvd0d1dHRlciIsInNldE9wdGlvbnMiLCJzaG93TGluZU51bWJlcnMiLCJzaG93UHJpbnRNYXJnaW4iLCJyZWFkT25seSIsImJ1aWxkVHJlZVN0cnVjdHVyZSIsImZpbGVzIiwiZGVmYXVsdFBhdGgiLCJ0cmVlIiwiT2JqZWN0IiwiZW50cmllcyIsImZpbGVEYXRhIiwiZmlsZVBhdGgiLCJwYXRoIiwicGFydHMiLCJzcGxpdCIsImN1cnJlbnQiLCJwYXJ0Iiwic2l6ZSIsImNoaWxkcmVuIiwidHJlZVRvRHJvcGRvd25JdGVtcyIsInByZWZpeCIsInBhcmVudEZvbGRlclBhdGgiLCJzb3J0IiwiYUtleSIsImFWYWwiLCJiS2V5IiwiYlZhbCIsImxvY2FsZUNvbXBhcmUiLCJmb2xkZXJQYXRoIiwicHVzaCIsIm5hbWUiLCJkaXNhYmxlZCIsImZvbGRlck5hbWUiLCJwYXJlbnRGb2xkZXIiLCJjaGlsZEl0ZW1zIiwic2VsZWN0ZWQiLCJyZXNwb25zZSIsImZpZWxkcyIsInZhbHVlcyIsImVhY2giLCJvcHRpb24iLCJmb2xkZXJQYXJlbnRBdHRyIiwicGFyZW50QXR0ciIsIm1heWJlRGlzYWJsZWQiLCJmb2xkZXJIZWFkZXIiLCJzdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24iLCIkZm9sZGVyIiwiJHRvZ2dsZSIsImlzQ29sbGFwc2VkIiwic2hvdyIsImNvbGxhcHNlRGVzY2VuZGFudHMiLCJzZWFyY2hWYWx1ZSIsIl8iLCJmb2xkZXIiLCJjaGlsZEZvbGRlciIsIiRjaGlsZEZvbGRlciIsImNoaWxkUGF0aCIsImV4cGFuZEZvbGRlckZvckZpbGUiLCIkZmlsZUl0ZW0iLCJwYXJlbnRQYXRoIiwiaGFzaCIsImxvY2F0aW9uIiwic3RhcnRzV2l0aCIsImRlY29kZVVSSUNvbXBvbmVudCIsInN1YnN0cmluZyIsImZpbGVFeGlzdHMiLCJzb21lIiwiZ2V0RmlsZUZyb21IYXNoIiwicmVzdWx0IiwiZGVmVmFsIiwiZmlsZU5hbWUiLCJkcm9wZG93blZhbHVlcyIsIm1hcCIsInJlcGxhY2UiLCJzZWxlY3RlZEl0ZW0iLCJpdGVtVG9TZWxlY3QiLCJlbmNvZGVVUklDb21wb25lbnQiLCJyZXNldEZpbHRlcnMiLCJ1cGRhdGVBdXRvUmVmcmVzaFZpc2liaWxpdHkiLCJjaGVja1RpbWVSYW5nZUF2YWlsYWJpbGl0eSIsImlzUm90YXRlZExvZ0ZpbGUiLCJ0ZXN0IiwiJGF1dG9CdG4iLCJpc1JvdGF0ZWQiLCJkaXNwbGF5IiwiZmlyc3QiLCJkaXJlY3Rpb24iLCIkb3B0aW9ucyIsImZpbHRlciIsImVxIiwic3luY0ZpbHRlckNvbmRpdGlvbnNUb0Zvcm0iLCJyZW5kZXJGaWx0ZXJMYWJlbHMiLCJzcGxpY2UiLCJKU09OIiwic3RyaW5naWZ5IiwiJGNvbnRhaW5lciIsImVtcHR5IiwiY29uZGl0aW9uIiwiY3NzQ2xhc3MiLCJpY29uQ2xhc3MiLCJpY29uQ29sb3IiLCIkbGFiZWwiLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJzZWFyY2giLCJmaWx0ZXJQYXJhbSIsImdldCIsInRyaW1tZWQiLCJwYXJzZWQiLCJwYXJzZSIsIkFycmF5IiwiaXNBcnJheSIsImMiLCJwIiwidXBkYXRlUGVyaW9kQnV0dG9uc1Zpc2liaWxpdHkiLCJsb2dEdXJhdGlvbiIsIiRwZXJpb2RCdXR0b25zIiwiJHBlcmlvZENvbnRhaW5lciIsImxhcmdlc3RWaXNpYmxlUGVyaW9kIiwiJGxhcmdlc3RWaXNpYmxlQnV0dG9uIiwidmlzaWJsZUNvdW50IiwiYnV0dG9uIiwicGFyc2VJbnQiLCIkdGltZUNvbnRyb2xzSW5saW5lIiwiZ2V0TG9nVGltZVJhbmdlIiwidGltZV9yYW5nZSIsImluaXRpYWxpemVOYXZpZ2F0aW9uIiwidGltZVJhbmdlRGF0YSIsImhhc1ZhbGlkVGltZVJhbmdlIiwiaGFzTXVsdGlwbGVUaW1lc3RhbXBzIiwic2VydmVyX3RpbWV6b25lX29mZnNldCIsInNlcnZlclRpbWV6b25lT2Zmc2V0Iiwib25SYW5nZUNoYW5nZSIsImRyYWdnZWRIYW5kbGUiLCJvblRydW5jYXRlZFpvbmVDbGljayIsImlzTGVmdFpvbmUiLCIkYWN0aXZlQnV0dG9uIiwiaW5pdGlhbFBlcmlvZCIsIm1pbiIsImluaXRpYWxTdGFydCIsImxpbmVSYW5nZSIsImxvYWRMb2dCeUxpbmVzIiwiZmxvb3IiLCJjZWlsIiwibGluZXMiLCJwYXJhbXMiLCJsb2dMZXZlbCIsImdldExvZ0Zyb21GaWxlIiwic2V0VmFsdWUiLCJjb250ZW50IiwiZ290b0xpbmUiLCJzY3JvbGxUb0xpbmUiLCJzdGFydFRpbWVzdGFtcCIsImVuZFRpbWVzdGFtcCIsImxhdGVzdCIsImlzSW5pdGlhbExvYWQiLCJpc0F1dG9VcGRhdGUiLCJkYXRlRnJvbSIsImRhdGVUbyIsIm5ld0NvbnRlbnQiLCJjdXJyZW50Q29udGVudCIsImdldFZhbHVlIiwibmV3TGluZXMiLCJmaW5kTmV3TGluZXMiLCJsYXN0Um93IiwiZ2V0TGVuZ3RoIiwiaW5zZXJ0Iiwicm93IiwiY29sdW1uIiwiam9pbiIsImZpbmFsUm93IiwiZmluYWxDb2x1bW4iLCJnZXRMaW5lIiwiYWN0dWFsX3JhbmdlIiwiYWN0dWFsIiwidXBkYXRlRGF0YUJvdW5kYXJ5IiwidXBkYXRlRnJvbVNlcnZlclJlc3BvbnNlIiwicGVyaW9kU2Vjb25kcyIsImFwcGx5UGVyaW9kIiwiZmlsdGVyUGF0dGVybiIsInByZXNlcnZlUmFuZ2UiLCJzZWxlY3RlZFJhbmdlIiwiRGF0ZSIsIm5vdyIsImRhdGFFbmQiLCJleHRlbmRSYW5nZSIsImNiVXBkYXRlTG9nVGV4dCIsImxpbmUiLCJjdXJyZW50TGluZXMiLCJhbmNob3JMaW5lIiwiaSIsImFuY2hvckluZGV4Iiwic2xpY2UiLCJtZXNzYWdlcyIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwiZ2V0U2Vzc2lvbiIsImVyYXNlRmlsZSIsImNiQWZ0ZXJGaWxlRXJhc2VkIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxvQkFBb0IsR0FBRztBQUN6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxnQkFBRCxDQUxjOztBQU96QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxZQUFZLEVBQUVELENBQUMsQ0FBQyxnQkFBRCxDQVhVOztBQWF6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxZQUFZLEVBQUVGLENBQUMsQ0FBQyxxQkFBRCxDQWpCVTs7QUFtQnpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lHLEVBQUFBLFNBQVMsRUFBRUgsQ0FBQyxDQUFDLGFBQUQsQ0F2QmE7O0FBeUJ6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJSSxFQUFBQSxXQUFXLEVBQUVKLENBQUMsQ0FBQyx1QkFBRCxDQTdCVzs7QUErQnpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lLLEVBQUFBLE1BQU0sRUFBRSxFQW5DaUI7O0FBcUN6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxtQkFBbUIsRUFBRSxJQXpDSTs7QUEyQ3pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFNBQVMsRUFBRSxFQS9DYzs7QUFpRHpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLE9BQU8sRUFBRVIsQ0FBQyxDQUFDLGtCQUFELENBckRlOztBQXVEekI7QUFDSjtBQUNBO0FBQ0E7QUFDSVMsRUFBQUEsUUFBUSxFQUFFVCxDQUFDLENBQUMseUJBQUQsQ0EzRGM7O0FBNkR6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJVSxFQUFBQSxjQUFjLEVBQUUsSUFqRVM7O0FBbUV6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxpQkFBaUIsRUFBRSxLQXZFTTs7QUF5RXpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGdCQUFnQixFQUFFLElBN0VPOztBQStFekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsa0JBQWtCLEVBQUUsS0FuRks7O0FBcUZ6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxnQkFBZ0IsRUFBRSxFQXpGTzs7QUEyRnpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGlCQUFpQixFQUFFLEVBL0ZNOztBQWlHekI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsZ0JBQWdCLEVBQUUsSUF4R087O0FBMEd6QjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUE3R3lCLHdCQTZHWjtBQUNUO0FBQ0FqQixJQUFBQSxDQUFDLENBQUMsb0JBQUQsQ0FBRCxDQUF3QmtCLFFBQXhCLENBQWlDLFFBQWpDLEVBQTJDQyxJQUEzQyxHQUFrREMsR0FBbEQsQ0FBc0Q7QUFBQ0MsTUFBQUEsR0FBRyxFQUFFLEVBQU47QUFBVUMsTUFBQUEsSUFBSSxFQUFFO0FBQWhCLEtBQXREO0FBRUEsUUFBTUMsU0FBUyxHQUFHQyxNQUFNLENBQUNDLFdBQVAsR0FBcUIsR0FBdkMsQ0FKUyxDQU1UOztBQUNBM0IsSUFBQUEsb0JBQW9CLENBQUNVLE9BQXJCLENBQTZCa0IsT0FBN0IsQ0FBcUMsS0FBckMsRUFBNENOLEdBQTVDLENBQWdELFlBQWhELFlBQWlFRyxTQUFqRSxTQVBTLENBU1Q7O0FBQ0F6QixJQUFBQSxvQkFBb0IsQ0FBQzZCLDZCQUFyQixHQVZTLENBWVQ7QUFDQTs7QUFDQTdCLElBQUFBLG9CQUFvQixDQUFDUSxtQkFBckIsQ0FBeUNzQixRQUF6QyxDQUFrRDtBQUMxQ0MsTUFBQUEsUUFBUSxFQUFFL0Isb0JBQW9CLENBQUNnQyxjQURXO0FBRTFDQyxNQUFBQSxVQUFVLEVBQUUsSUFGOEI7QUFHMUNDLE1BQUFBLGNBQWMsRUFBRSxJQUgwQjtBQUkxQ0MsTUFBQUEsY0FBYyxFQUFFLEtBSjBCO0FBSzFDQyxNQUFBQSxZQUFZLEVBQUUsSUFMNEI7QUFNMUNDLE1BQUFBLHNCQUFzQixFQUFFLEtBTmtCO0FBTzFDQyxNQUFBQSxLQUFLLEVBQUUsTUFQbUM7QUFRMUNDLE1BQUFBLGdCQUFnQixFQUFFLEtBUndCO0FBUzFDQyxNQUFBQSxNQUFNLEVBQUUsVUFUa0M7QUFVMUNDLE1BQUFBLFNBQVMsRUFBRTtBQUNQQyxRQUFBQSxJQUFJLEVBQUUxQyxvQkFBb0IsQ0FBQzJDO0FBRHBCO0FBVitCLEtBQWxELEVBZFMsQ0E2QlQ7O0FBQ0EzQyxJQUFBQSxvQkFBb0IsQ0FBQzRDLHdCQUFyQixHQTlCUyxDQWdDVDs7QUFDQTVDLElBQUFBLG9CQUFvQixDQUFDNkMsYUFBckIsR0FqQ1MsQ0FtQ1Q7O0FBQ0FDLElBQUFBLFNBQVMsQ0FBQ0MsV0FBVixDQUFzQi9DLG9CQUFvQixDQUFDZ0QsdUJBQTNDLEVBcENTLENBc0NUOztBQUNBaEQsSUFBQUEsb0JBQW9CLENBQUNpRCwwQkFBckIsR0F2Q1MsQ0F5Q1Q7O0FBQ0FqRCxJQUFBQSxvQkFBb0IsQ0FBQ2tELHVCQUFyQixHQTFDUyxDQTRDVDs7QUFDQWhELElBQUFBLENBQUMsQ0FBQ2lELFFBQUQsQ0FBRCxDQUFZQyxFQUFaLENBQWUsT0FBZixFQUF3QixhQUF4QixFQUF1QyxVQUFDQyxDQUFELEVBQU87QUFDMUNBLE1BQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNBLFVBQU1DLElBQUksR0FBR3JELENBQUMsQ0FBQ21ELENBQUMsQ0FBQ0csYUFBSCxDQUFkO0FBQ0EsVUFBTUMsTUFBTSxHQUFHRixJQUFJLENBQUNHLElBQUwsQ0FBVSxRQUFWLENBQWYsQ0FIMEMsQ0FLMUM7O0FBQ0F4RCxNQUFBQSxDQUFDLENBQUMsYUFBRCxDQUFELENBQWlCeUQsV0FBakIsQ0FBNkIsUUFBN0I7QUFDQUosTUFBQUEsSUFBSSxDQUFDbkMsUUFBTCxDQUFjLFFBQWQ7QUFFQXBCLE1BQUFBLG9CQUFvQixDQUFDNEQsZ0JBQXJCLENBQXNDSCxNQUF0QztBQUNILEtBVkQsRUE3Q1MsQ0F5RFQ7O0FBQ0F2RCxJQUFBQSxDQUFDLENBQUNpRCxRQUFELENBQUQsQ0FBWUMsRUFBWixDQUFlLE9BQWYsRUFBd0IsVUFBeEIsRUFBb0MsVUFBQ0MsQ0FBRCxFQUFPO0FBQ3ZDQSxNQUFBQSxDQUFDLENBQUNDLGNBQUY7O0FBQ0EsVUFBSXRELG9CQUFvQixDQUFDYyxnQkFBekIsRUFBMkM7QUFDdkMsWUFBTStDLEdBQUcsR0FBRzdELG9CQUFvQixDQUFDYyxnQkFBckIsQ0FBc0MrQyxHQUFsRDtBQUNBLFlBQU1DLE9BQU8sR0FBRyxJQUFoQjtBQUNBLFlBQU1DLEtBQUssR0FBR0MsSUFBSSxDQUFDQyxHQUFMLENBQVNKLEdBQUcsR0FBR0MsT0FBZixFQUF3QjlELG9CQUFvQixDQUFDYyxnQkFBckIsQ0FBc0NpRCxLQUE5RCxDQUFkO0FBQ0FHLFFBQUFBLFdBQVcsQ0FBQ0MsUUFBWixDQUFxQkosS0FBckIsRUFBNEJGLEdBQTVCO0FBQ0E3RCxRQUFBQSxvQkFBb0IsQ0FBQ29FLGtCQUFyQixDQUF3Q0wsS0FBeEMsRUFBK0NGLEdBQS9DO0FBQ0EzRCxRQUFBQSxDQUFDLENBQUMsYUFBRCxDQUFELENBQWlCeUQsV0FBakIsQ0FBNkIsUUFBN0I7QUFDQXpELFFBQUFBLENBQUMsQ0FBQyxpQ0FBRCxDQUFELENBQXFDa0IsUUFBckMsQ0FBOEMsUUFBOUM7QUFDSDtBQUNKLEtBWEQsRUExRFMsQ0F1RVQ7O0FBQ0FsQixJQUFBQSxDQUFDLENBQUNpRCxRQUFELENBQUQsQ0FBWUMsRUFBWixDQUFlLE9BQWYsRUFBd0IsWUFBeEIsRUFBc0MsVUFBQ0MsQ0FBRCxFQUFPO0FBQ3pDQSxNQUFBQSxDQUFDLENBQUNDLGNBQUY7QUFDQSxVQUFNQyxJQUFJLEdBQUdyRCxDQUFDLENBQUNtRCxDQUFDLENBQUNHLGFBQUgsQ0FBZDtBQUNBLFVBQU1hLEtBQUssR0FBR2QsSUFBSSxDQUFDRyxJQUFMLENBQVUsT0FBVixDQUFkLENBSHlDLENBS3pDOztBQUNBeEQsTUFBQUEsQ0FBQyxDQUFDLFlBQUQsQ0FBRCxDQUFnQnlELFdBQWhCLENBQTRCLFFBQTVCO0FBQ0FKLE1BQUFBLElBQUksQ0FBQ25DLFFBQUwsQ0FBYyxRQUFkO0FBRUFwQixNQUFBQSxvQkFBb0IsQ0FBQ3NFLG1CQUFyQixDQUF5Q0QsS0FBekM7QUFDSCxLQVZELEVBeEVTLENBb0ZUOztBQUNBbkUsSUFBQUEsQ0FBQyxDQUFDaUQsUUFBRCxDQUFELENBQVlDLEVBQVosQ0FBZSxPQUFmLEVBQXdCLGdCQUF4QixFQUEwQyxVQUFDQyxDQUFELEVBQU87QUFDN0NBLE1BQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNBdEQsTUFBQUEsb0JBQW9CLENBQUN1RSxtQkFBckI7QUFDSCxLQUhELEVBckZTLENBMEZUOztBQUNBckUsSUFBQUEsQ0FBQyxDQUFDd0IsTUFBRCxDQUFELENBQVUwQixFQUFWLENBQWEsWUFBYixFQUEyQixZQUFNO0FBQzdCcEQsTUFBQUEsb0JBQW9CLENBQUN3RSxnQkFBckI7QUFDSCxLQUZELEVBM0ZTLENBK0ZUOztBQUNBdEUsSUFBQUEsQ0FBQyxDQUFDaUQsUUFBRCxDQUFELENBQVlDLEVBQVosQ0FBZSxPQUFmLEVBQXdCLGdCQUF4QixFQUEwQyxVQUFDQyxDQUFELEVBQU87QUFDN0NBLE1BQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNBLFVBQU1JLElBQUksR0FBRzFELG9CQUFvQixDQUFDVyxRQUFyQixDQUE4QjhELElBQTlCLENBQW1DLFlBQW5DLENBQWI7QUFDQTNCLE1BQUFBLFNBQVMsQ0FBQzRCLGVBQVYsQ0FBMEJoQixJQUFJLENBQUNpQixRQUEvQixFQUF5QyxJQUF6QyxFQUErQzNFLG9CQUFvQixDQUFDNEUsY0FBcEU7QUFDSCxLQUpELEVBaEdTLENBc0dUOztBQUNBMUUsSUFBQUEsQ0FBQyxDQUFDaUQsUUFBRCxDQUFELENBQVlDLEVBQVosQ0FBZSxPQUFmLEVBQXdCLHFCQUF4QixFQUErQyxVQUFDQyxDQUFELEVBQU87QUFDbERBLE1BQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNBLFVBQU11QixPQUFPLEdBQUczRSxDQUFDLENBQUMscUJBQUQsQ0FBakI7QUFDQSxVQUFNNEUsV0FBVyxHQUFHRCxPQUFPLENBQUNFLElBQVIsQ0FBYSxrQkFBYixDQUFwQjs7QUFDQSxVQUFJRCxXQUFXLENBQUNFLFFBQVosQ0FBcUIsU0FBckIsQ0FBSixFQUFxQztBQUNqQ0YsUUFBQUEsV0FBVyxDQUFDbkIsV0FBWixDQUF3QixTQUF4QjtBQUNBM0QsUUFBQUEsb0JBQW9CLENBQUNlLGtCQUFyQixHQUEwQyxLQUExQztBQUNBa0UsUUFBQUEsbUJBQW1CLENBQUNDLElBQXBCO0FBQ0gsT0FKRCxNQUlPO0FBQ0hKLFFBQUFBLFdBQVcsQ0FBQzFELFFBQVosQ0FBcUIsU0FBckI7QUFDQXBCLFFBQUFBLG9CQUFvQixDQUFDZSxrQkFBckIsR0FBMEMsSUFBMUM7QUFDQWtFLFFBQUFBLG1CQUFtQixDQUFDOUQsVUFBcEI7QUFDSDtBQUNKLEtBYkQsRUF2R1MsQ0FzSFQ7O0FBQ0FqQixJQUFBQSxDQUFDLENBQUNpRCxRQUFELENBQUQsQ0FBWUMsRUFBWixDQUFlLE9BQWYsRUFBd0IsYUFBeEIsRUFBdUMsVUFBQ0MsQ0FBRCxFQUFPO0FBQzFDQSxNQUFBQSxDQUFDLENBQUNDLGNBQUY7QUFDQXRELE1BQUFBLG9CQUFvQixDQUFDbUYsdUJBQXJCO0FBQ0gsS0FIRCxFQXZIUyxDQTRIVDs7QUFDQWpGLElBQUFBLENBQUMsQ0FBQ2lELFFBQUQsQ0FBRCxDQUFZQyxFQUFaLENBQWUsU0FBZixFQUEwQixlQUExQixFQUEyQyxVQUFDZ0MsS0FBRCxFQUFXO0FBQ2xELFVBQU1DLE1BQU0sR0FBR25GLENBQUMsQ0FBQyxvQkFBRCxDQUFoQjtBQUNBLFVBQU1vRixjQUFjLEdBQUdELE1BQU0sQ0FBQ0UsRUFBUCxDQUFVLFVBQVYsS0FBeUIsQ0FBQ0YsTUFBTSxDQUFDTCxRQUFQLENBQWdCLFFBQWhCLENBQWpELENBRmtELENBSWxEOztBQUNBLFVBQUlNLGNBQUosRUFBb0I7QUFDaEIsWUFBSUYsS0FBSyxDQUFDSSxHQUFOLEtBQWMsV0FBZCxJQUE2QkosS0FBSyxDQUFDSSxHQUFOLEtBQWMsU0FBL0MsRUFBMEQ7QUFDdERKLFVBQUFBLEtBQUssQ0FBQzlCLGNBQU47QUFDQXRELFVBQUFBLG9CQUFvQixDQUFDeUYsbUJBQXJCLENBQXlDTCxLQUFLLENBQUNJLEdBQU4sS0FBYyxXQUFkLEdBQTRCLENBQTVCLEdBQWdDLENBQUMsQ0FBMUU7QUFDQTtBQUNIOztBQUNELFlBQUlKLEtBQUssQ0FBQ0ksR0FBTixLQUFjLE9BQWxCLEVBQTJCO0FBQ3ZCSixVQUFBQSxLQUFLLENBQUM5QixjQUFOO0FBQ0EsY0FBTW9DLFFBQVEsR0FBR0wsTUFBTSxDQUFDTixJQUFQLENBQVksNkJBQVosQ0FBakI7O0FBQ0EsY0FBSVcsUUFBUSxDQUFDQyxNQUFiLEVBQXFCO0FBQ2pCRCxZQUFBQSxRQUFRLENBQUNFLE9BQVQsQ0FBaUIsT0FBakI7QUFDSDs7QUFDRDtBQUNIO0FBQ0o7O0FBRUQsVUFBSVIsS0FBSyxDQUFDSSxHQUFOLEtBQWMsT0FBbEIsRUFBMkI7QUFDdkJKLFFBQUFBLEtBQUssQ0FBQzlCLGNBQU47QUFDQSxZQUFNdUMsSUFBSSxHQUFHM0YsQ0FBQyxDQUFDLGVBQUQsQ0FBRCxDQUFtQjRGLEdBQW5CLEdBQXlCQyxJQUF6QixFQUFiOztBQUNBLFlBQUlGLElBQUksS0FBSyxFQUFiLEVBQWlCO0FBQ2I3RixVQUFBQSxvQkFBb0IsQ0FBQ2lCLGlCQUFyQixHQUF5QzRFLElBQXpDO0FBQ0E3RixVQUFBQSxvQkFBb0IsQ0FBQ2dHLG1CQUFyQjtBQUNIO0FBQ0osT0FQRCxNQU9PLElBQUlaLEtBQUssQ0FBQ0ksR0FBTixLQUFjLFFBQWxCLEVBQTRCO0FBQy9CeEYsUUFBQUEsb0JBQW9CLENBQUNpRyxtQkFBckI7QUFDSCxPQUZNLE1BRUEsSUFBSWIsS0FBSyxDQUFDSSxHQUFOLEtBQWMsV0FBZCxJQUE2QnRGLENBQUMsQ0FBQyxlQUFELENBQUQsQ0FBbUI0RixHQUFuQixPQUE2QixFQUE5RCxFQUFrRTtBQUNyRTtBQUNBLFlBQUk5RixvQkFBb0IsQ0FBQ2dCLGdCQUFyQixDQUFzQzJFLE1BQXRDLEdBQStDLENBQW5ELEVBQXNEO0FBQ2xEM0YsVUFBQUEsb0JBQW9CLENBQUNrRyxxQkFBckIsQ0FDSWxHLG9CQUFvQixDQUFDZ0IsZ0JBQXJCLENBQXNDMkUsTUFBdEMsR0FBK0MsQ0FEbkQ7QUFHSDtBQUNKO0FBQ0osS0F0Q0QsRUE3SFMsQ0FxS1Q7O0FBQ0F6RixJQUFBQSxDQUFDLENBQUNpRCxRQUFELENBQUQsQ0FBWUMsRUFBWixDQUFlLE1BQWYsRUFBdUIsZUFBdkIsRUFBd0MsWUFBTTtBQUMxQztBQUNBK0MsTUFBQUEsVUFBVSxDQUFDLFlBQU07QUFDYixZQUFNZCxNQUFNLEdBQUduRixDQUFDLENBQUMsb0JBQUQsQ0FBaEI7O0FBQ0EsWUFBSW1GLE1BQU0sQ0FBQ0UsRUFBUCxDQUFVLFVBQVYsQ0FBSixFQUEyQjtBQUN2QjtBQUNBO0FBQ0g7O0FBQ0QsWUFBTU0sSUFBSSxHQUFHM0YsQ0FBQyxDQUFDLGVBQUQsQ0FBRCxDQUFtQjRGLEdBQW5CLEdBQXlCQyxJQUF6QixFQUFiOztBQUNBLFlBQUlGLElBQUksS0FBSyxFQUFiLEVBQWlCO0FBQ2I3RixVQUFBQSxvQkFBb0IsQ0FBQ29HLGtCQUFyQixDQUF3QyxVQUF4QyxFQUFvRFAsSUFBcEQ7QUFDSDtBQUNKLE9BVlMsRUFVUCxHQVZPLENBQVY7QUFXSCxLQWJELEVBdEtTLENBcUxUOztBQUNBM0YsSUFBQUEsQ0FBQyxDQUFDaUQsUUFBRCxDQUFELENBQVlDLEVBQVosQ0FBZSxPQUFmLEVBQXdCLHFCQUF4QixFQUErQyxVQUFDQyxDQUFELEVBQU87QUFDbEQsVUFBTWdELElBQUksR0FBR25HLENBQUMsQ0FBQ21ELENBQUMsQ0FBQ0csYUFBSCxDQUFELENBQW1CRSxJQUFuQixDQUF3QixNQUF4QixDQUFiO0FBQ0ExRCxNQUFBQSxvQkFBb0IsQ0FBQ29HLGtCQUFyQixDQUF3Q0MsSUFBeEMsRUFBOENyRyxvQkFBb0IsQ0FBQ2lCLGlCQUFuRTtBQUNBakIsTUFBQUEsb0JBQW9CLENBQUNpQixpQkFBckIsR0FBeUMsRUFBekM7QUFDQWpCLE1BQUFBLG9CQUFvQixDQUFDaUcsbUJBQXJCO0FBQ0gsS0FMRCxFQXRMUyxDQTZMVDs7QUFDQS9GLElBQUFBLENBQUMsQ0FBQ2lELFFBQUQsQ0FBRCxDQUFZQyxFQUFaLENBQWUsT0FBZixFQUF3Qiw2QkFBeEIsRUFBdUQsVUFBQ0MsQ0FBRCxFQUFPO0FBQzFEQSxNQUFBQSxDQUFDLENBQUNpRCxlQUFGO0FBQ0EsVUFBTUMsS0FBSyxHQUFHckcsQ0FBQyxDQUFDbUQsQ0FBQyxDQUFDRyxhQUFILENBQUQsQ0FBbUI1QixPQUFuQixDQUEyQix5QkFBM0IsRUFBc0Q4QixJQUF0RCxDQUEyRCxPQUEzRCxDQUFkO0FBQ0ExRCxNQUFBQSxvQkFBb0IsQ0FBQ2tHLHFCQUFyQixDQUEyQ0ssS0FBM0M7QUFDSCxLQUpELEVBOUxTLENBb01UOztBQUNBckcsSUFBQUEsQ0FBQyxDQUFDaUQsUUFBRCxDQUFELENBQVlDLEVBQVosQ0FBZSxPQUFmLEVBQXdCLG1CQUF4QixFQUE2QyxVQUFDQyxDQUFELEVBQU87QUFDaERBLE1BQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNBdEQsTUFBQUEsb0JBQW9CLENBQUN3Ryx3QkFBckI7QUFDSCxLQUhELEVBck1TLENBME1UOztBQUNBdEcsSUFBQUEsQ0FBQyxDQUFDaUQsUUFBRCxDQUFELENBQVlDLEVBQVosQ0FBZSxPQUFmLEVBQXdCLDhCQUF4QixFQUF3RCxVQUFDQyxDQUFELEVBQU87QUFDM0QsVUFBSW5ELENBQUMsQ0FBQ21ELENBQUMsQ0FBQ29ELE1BQUgsQ0FBRCxDQUFZbEIsRUFBWixDQUFlLDhCQUFmLEtBQWtEckYsQ0FBQyxDQUFDbUQsQ0FBQyxDQUFDb0QsTUFBSCxDQUFELENBQVlsQixFQUFaLENBQWUsZ0JBQWYsQ0FBdEQsRUFBd0Y7QUFDcEZyRixRQUFBQSxDQUFDLENBQUMsZUFBRCxDQUFELENBQW1Cd0csS0FBbkI7QUFDSDtBQUNKLEtBSkQsRUEzTVMsQ0FpTlQ7O0FBQ0F4RyxJQUFBQSxDQUFDLENBQUNpRCxRQUFELENBQUQsQ0FBWUMsRUFBWixDQUFlLE9BQWYsRUFBd0IsVUFBQ0MsQ0FBRCxFQUFPO0FBQzNCLFVBQUksQ0FBQ25ELENBQUMsQ0FBQ21ELENBQUMsQ0FBQ29ELE1BQUgsQ0FBRCxDQUFZN0UsT0FBWixDQUFvQixtQ0FBcEIsRUFBeUQrRCxNQUE5RCxFQUFzRTtBQUNsRTNGLFFBQUFBLG9CQUFvQixDQUFDaUcsbUJBQXJCO0FBQ0g7QUFDSixLQUpELEVBbE5TLENBd05UOztBQUNBL0YsSUFBQUEsQ0FBQyxDQUFDLHdCQUFELENBQUQsQ0FBNEJrRCxFQUE1QixDQUErQixPQUEvQixFQUF3Q3BELG9CQUFvQixDQUFDMkcsZ0JBQTdELEVBek5TLENBMk5UOztBQUNBeEQsSUFBQUEsUUFBUSxDQUFDeUQsZ0JBQVQsQ0FBMEIsa0JBQTFCLEVBQThDNUcsb0JBQW9CLENBQUM2RyxlQUFuRSxFQTVOUyxDQThOVDs7QUFDQTdHLElBQUFBLG9CQUFvQixDQUFDNkcsZUFBckI7QUFDSCxHQTdVd0I7O0FBK1V6QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lGLEVBQUFBLGdCQXZWeUIsOEJBdVZOO0FBQ2YsUUFBTUcsWUFBWSxHQUFHM0QsUUFBUSxDQUFDNEQsY0FBVCxDQUF3QixxQkFBeEIsQ0FBckI7O0FBRUEsUUFBSSxDQUFDNUQsUUFBUSxDQUFDNkQsaUJBQWQsRUFBaUM7QUFDN0JGLE1BQUFBLFlBQVksQ0FBQ0csaUJBQWIsWUFBdUMsVUFBQ0MsR0FBRCxFQUFTO0FBQzVDQyxRQUFBQSxPQUFPLENBQUNDLEtBQVIsd0RBQThERixHQUFHLENBQUNHLE9BQWxFO0FBQ0gsT0FGRDtBQUdILEtBSkQsTUFJTztBQUNIbEUsTUFBQUEsUUFBUSxDQUFDbUUsY0FBVDtBQUNIO0FBQ0osR0FqV3dCOztBQW1XekI7QUFDSjtBQUNBO0FBQ0lULEVBQUFBLGVBdFd5Qiw2QkFzV1A7QUFDZFYsSUFBQUEsVUFBVSxDQUFDLFlBQU07QUFDYixVQUFJMUUsU0FBUyxHQUFHQyxNQUFNLENBQUNDLFdBQVAsR0FBcUIzQixvQkFBb0IsQ0FBQ00sV0FBckIsQ0FBaUNpSCxNQUFqQyxHQUEwQ2hHLEdBQS9ELEdBQXFFLEVBQXJGOztBQUNBLFVBQUk0QixRQUFRLENBQUM2RCxpQkFBYixFQUFnQztBQUM1QjtBQUNBdkYsUUFBQUEsU0FBUyxHQUFHQyxNQUFNLENBQUNDLFdBQVAsR0FBcUIsRUFBakM7QUFDSCxPQUxZLENBTWI7OztBQUNBekIsTUFBQUEsQ0FBQyxDQUFDLHVCQUFELENBQUQsQ0FBMkJvQixHQUEzQixDQUErQixZQUEvQixZQUFpREcsU0FBakQ7QUFDQXpCLE1BQUFBLG9CQUFvQixDQUFDTyxNQUFyQixDQUE0QmlILE1BQTVCO0FBQ0gsS0FUUyxFQVNQLEdBVE8sQ0FBVjtBQVVILEdBalh3Qjs7QUFrWHpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0l2RSxFQUFBQSwwQkF0WHlCLHdDQXNYSTtBQUN6QixRQUFNd0UsWUFBWSxHQUFHdkgsQ0FBQyxDQUFDLFdBQUQsQ0FBdEIsQ0FEeUIsQ0FHekI7O0FBQ0EsUUFBSUEsQ0FBQyxDQUFDLG9CQUFELENBQUQsQ0FBd0J5RixNQUE1QixFQUFvQztBQUNoQztBQUNILEtBTndCLENBUXpCOzs7QUFDQSxRQUFNK0IsU0FBUyxHQUFHeEgsQ0FBQyxDQUFDLE9BQUQsRUFBVTtBQUN6QnlILE1BQUFBLEVBQUUsRUFBRSxtQkFEcUI7QUFFekIsZUFBTztBQUZrQixLQUFWLENBQW5CO0FBS0EsUUFBTUMsS0FBSyxHQUFHMUgsQ0FBQyxDQUFDLE9BQUQsRUFBVTtBQUFFLGVBQU87QUFBVCxLQUFWLENBQUQsQ0FBOEIyRixJQUE5QixDQUFtQ2dDLGVBQWUsQ0FBQ0MsWUFBbkQsQ0FBZDtBQUNBLFFBQU1DLEtBQUssR0FBRzdILENBQUMsQ0FBQyxLQUFELEVBQVE7QUFBRSxlQUFPO0FBQVQsS0FBUixDQUFmO0FBQ0EsUUFBTThILEtBQUssR0FBRzlILENBQUMsQ0FBQyxPQUFELEVBQVU7QUFBRSxlQUFPO0FBQVQsS0FBVixDQUFmLENBaEJ5QixDQWtCekI7O0FBQ0EsUUFBTStILEtBQUssR0FBRyxDQUNWO0FBQUVDLE1BQUFBLEtBQUssRUFBRSxFQUFUO0FBQWFyQyxNQUFBQSxJQUFJLEVBQUVnQyxlQUFlLENBQUNDLFlBQW5DO0FBQWlESyxNQUFBQSxJQUFJLEVBQUU7QUFBdkQsS0FEVSxFQUVWO0FBQUVELE1BQUFBLEtBQUssRUFBRSxPQUFUO0FBQWtCckMsTUFBQUEsSUFBSSxFQUFFZ0MsZUFBZSxDQUFDTyxRQUF4QztBQUFrREQsTUFBQUEsSUFBSSxFQUFFO0FBQXhELEtBRlUsRUFHVjtBQUFFRCxNQUFBQSxLQUFLLEVBQUUsU0FBVDtBQUFvQnJDLE1BQUFBLElBQUksRUFBRWdDLGVBQWUsQ0FBQ1EsVUFBMUM7QUFBc0RGLE1BQUFBLElBQUksRUFBRTtBQUE1RCxLQUhVLEVBSVY7QUFBRUQsTUFBQUEsS0FBSyxFQUFFLFFBQVQ7QUFBbUJyQyxNQUFBQSxJQUFJLEVBQUVnQyxlQUFlLENBQUNTLFNBQXpDO0FBQW9ESCxNQUFBQSxJQUFJLEVBQUU7QUFBMUQsS0FKVSxFQUtWO0FBQUVELE1BQUFBLEtBQUssRUFBRSxNQUFUO0FBQWlCckMsTUFBQUEsSUFBSSxFQUFFZ0MsZUFBZSxDQUFDVSxPQUF2QztBQUFnREosTUFBQUEsSUFBSSxFQUFFO0FBQXRELEtBTFUsRUFNVjtBQUFFRCxNQUFBQSxLQUFLLEVBQUUsT0FBVDtBQUFrQnJDLE1BQUFBLElBQUksRUFBRWdDLGVBQWUsQ0FBQ1csUUFBeEM7QUFBa0RMLE1BQUFBLElBQUksRUFBRTtBQUF4RCxLQU5VLENBQWQ7QUFTQUYsSUFBQUEsS0FBSyxDQUFDUSxPQUFOLENBQWMsVUFBQUMsSUFBSSxFQUFJO0FBQ2xCLFVBQU1DLEtBQUssR0FBR3pJLENBQUMsQ0FBQyxPQUFELEVBQVU7QUFDckIsaUJBQU8sTUFEYztBQUVyQixzQkFBY3dJLElBQUksQ0FBQ1I7QUFGRSxPQUFWLENBQUQsQ0FHWFUsSUFIVyxDQUdORixJQUFJLENBQUNQLElBQUwsR0FBWU8sSUFBSSxDQUFDN0MsSUFIWCxDQUFkO0FBSUFtQyxNQUFBQSxLQUFLLENBQUNhLE1BQU4sQ0FBYUYsS0FBYjtBQUNILEtBTkQ7QUFRQWpCLElBQUFBLFNBQVMsQ0FBQ21CLE1BQVYsQ0FBaUJqQixLQUFqQixFQUF3QkcsS0FBeEIsRUFBK0JDLEtBQS9CO0FBQ0FQLElBQUFBLFlBQVksQ0FBQ3FCLEtBQWIsQ0FBbUJwQixTQUFuQixFQXJDeUIsQ0F1Q3pCOztBQUNBQSxJQUFBQSxTQUFTLENBQUM1RixRQUFWLENBQW1CO0FBQ2ZDLE1BQUFBLFFBQVEsRUFBRSxrQkFBQ21HLEtBQUQsRUFBVztBQUNqQlQsUUFBQUEsWUFBWSxDQUFDM0IsR0FBYixDQUFpQm9DLEtBQWpCLEVBQXdCdEMsT0FBeEIsQ0FBZ0MsUUFBaEM7QUFDQTVGLFFBQUFBLG9CQUFvQixDQUFDdUUsbUJBQXJCLENBQXlDLElBQXpDO0FBQ0g7QUFKYyxLQUFuQjtBQU1ILEdBcGF3Qjs7QUFzYXpCO0FBQ0o7QUFDQTtBQUNJMUMsRUFBQUEsNkJBemF5QiwyQ0F5YU87QUFDNUIsUUFBTTRGLFlBQVksR0FBR3ZILENBQUMsQ0FBQyxZQUFELENBQXRCOztBQUVBLFFBQUksQ0FBQ3VILFlBQVksQ0FBQzlCLE1BQWxCLEVBQTBCO0FBQ3RCd0IsTUFBQUEsT0FBTyxDQUFDQyxLQUFSLENBQWMsbUNBQWQ7QUFDQTtBQUNIOztBQUVELFFBQU1NLFNBQVMsR0FBR3hILENBQUMsQ0FBQyxPQUFELEVBQVU7QUFDekJ5SCxNQUFBQSxFQUFFLEVBQUUsb0JBRHFCO0FBRXpCLGVBQU87QUFGa0IsS0FBVixDQUFuQjtBQUtBRCxJQUFBQSxTQUFTLENBQUNtQixNQUFWLENBQ0kzSSxDQUFDLENBQUMsS0FBRCxFQUFRO0FBQUUsZUFBTztBQUFULEtBQVIsQ0FETCxFQUVJQSxDQUFDLENBQUMsU0FBRCxFQUFZO0FBQUVtRyxNQUFBQSxJQUFJLEVBQUUsTUFBUjtBQUFnQixlQUFPLFFBQXZCO0FBQWlDMEMsTUFBQUEsUUFBUSxFQUFFO0FBQTNDLEtBQVosQ0FGTCxFQUdJN0ksQ0FBQyxDQUFDLE9BQUQsRUFBVTtBQUFFLGVBQU87QUFBVCxLQUFWLENBQUQsQ0FBc0MyRixJQUF0QyxDQUEyQyxpQkFBM0MsQ0FISixFQUlJM0YsQ0FBQyxDQUFDLE9BQUQsRUFBVTtBQUFFLGVBQU87QUFBVCxLQUFWLENBSkw7QUFPQXVILElBQUFBLFlBQVksQ0FBQ3VCLE1BQWIsQ0FBb0J0QixTQUFwQjtBQUNBRCxJQUFBQSxZQUFZLENBQUNwRyxJQUFiO0FBRUFyQixJQUFBQSxvQkFBb0IsQ0FBQ1EsbUJBQXJCLEdBQTJDa0gsU0FBM0M7QUFDSCxHQWpjd0I7O0FBbWN6QjtBQUNKO0FBQ0E7QUFDSTdFLEVBQUFBLGFBdGN5QiwyQkFzY1Q7QUFDWjdDLElBQUFBLG9CQUFvQixDQUFDTyxNQUFyQixHQUE4QjBJLEdBQUcsQ0FBQ0MsSUFBSixDQUFTLHNCQUFULENBQTlCLENBRFksQ0FHWjs7QUFDQSxRQUFNQyxLQUFLLEdBQUdGLEdBQUcsQ0FBQ0csT0FBSixDQUFZLGdCQUFaLENBQWQ7O0FBQ0EsUUFBSUQsS0FBSyxLQUFLRSxTQUFkLEVBQXlCO0FBQ3JCO0FBQ0EsVUFBTUMsT0FBTyxHQUFHSCxLQUFLLENBQUNJLElBQXRCO0FBQ0F2SixNQUFBQSxvQkFBb0IsQ0FBQ08sTUFBckIsQ0FBNEJpSixPQUE1QixDQUFvQ0MsT0FBcEMsQ0FBNEMsSUFBSUgsT0FBSixFQUE1QztBQUNILEtBVFcsQ0FXWjs7O0FBQ0F0SixJQUFBQSxvQkFBb0IsQ0FBQ08sTUFBckIsQ0FBNEJtSixRQUE1QixDQUFxQyxtQkFBckM7QUFDQTFKLElBQUFBLG9CQUFvQixDQUFDTyxNQUFyQixDQUE0Qm9KLFFBQTVCLENBQXFDQyxhQUFyQyxDQUFtRCxLQUFuRDtBQUNBNUosSUFBQUEsb0JBQW9CLENBQUNPLE1BQXJCLENBQTRCc0osVUFBNUIsQ0FBdUM7QUFDbkNDLE1BQUFBLGVBQWUsRUFBRSxLQURrQjtBQUVuQ0MsTUFBQUEsZUFBZSxFQUFFLEtBRmtCO0FBR25DQyxNQUFBQSxRQUFRLEVBQUU7QUFIeUIsS0FBdkM7QUFNSCxHQTFkd0I7O0FBNGR6QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsa0JBbGV5Qiw4QkFrZU5DLEtBbGVNLEVBa2VDQyxXQWxlRCxFQWtlYztBQUNuQyxRQUFNQyxJQUFJLEdBQUcsRUFBYixDQURtQyxDQUduQzs7QUFDQUMsSUFBQUEsTUFBTSxDQUFDQyxPQUFQLENBQWVKLEtBQWYsRUFBc0J6QixPQUF0QixDQUE4QixnQkFBcUI7QUFBQTtBQUFBLFVBQW5CakQsR0FBbUI7QUFBQSxVQUFkK0UsUUFBYzs7QUFDL0M7QUFDQSxVQUFNQyxRQUFRLEdBQUdELFFBQVEsQ0FBQ0UsSUFBVCxJQUFpQmpGLEdBQWxDO0FBQ0EsVUFBTWtGLEtBQUssR0FBR0YsUUFBUSxDQUFDRyxLQUFULENBQWUsR0FBZixDQUFkO0FBQ0EsVUFBSUMsT0FBTyxHQUFHUixJQUFkO0FBRUFNLE1BQUFBLEtBQUssQ0FBQ2pDLE9BQU4sQ0FBYyxVQUFDb0MsSUFBRCxFQUFPdEUsS0FBUCxFQUFpQjtBQUMzQixZQUFJQSxLQUFLLEtBQUttRSxLQUFLLENBQUMvRSxNQUFOLEdBQWUsQ0FBN0IsRUFBZ0M7QUFDNUI7QUFDQWlGLFVBQUFBLE9BQU8sQ0FBQ0MsSUFBRCxDQUFQLEdBQWdCO0FBQ1p4RSxZQUFBQSxJQUFJLEVBQUUsTUFETTtBQUVab0UsWUFBQUEsSUFBSSxFQUFFRCxRQUZNO0FBR1pNLFlBQUFBLElBQUksRUFBRVAsUUFBUSxDQUFDTyxJQUhIO0FBSVosdUJBQVVYLFdBQVcsSUFBSUEsV0FBVyxLQUFLSyxRQUFoQyxJQUE4QyxDQUFDTCxXQUFELElBQWdCSSxRQUFRO0FBSm5FLFdBQWhCO0FBTUgsU0FSRCxNQVFPO0FBQ0g7QUFDQSxjQUFJLENBQUNLLE9BQU8sQ0FBQ0MsSUFBRCxDQUFaLEVBQW9CO0FBQ2hCRCxZQUFBQSxPQUFPLENBQUNDLElBQUQsQ0FBUCxHQUFnQjtBQUNaeEUsY0FBQUEsSUFBSSxFQUFFLFFBRE07QUFFWjBFLGNBQUFBLFFBQVEsRUFBRTtBQUZFLGFBQWhCO0FBSUg7O0FBQ0RILFVBQUFBLE9BQU8sR0FBR0EsT0FBTyxDQUFDQyxJQUFELENBQVAsQ0FBY0UsUUFBeEI7QUFDSDtBQUNKLE9BbkJEO0FBb0JILEtBMUJELEVBSm1DLENBZ0NuQzs7QUFDQSxXQUFPLEtBQUtDLG1CQUFMLENBQXlCWixJQUF6QixFQUErQixFQUEvQixDQUFQO0FBQ0gsR0FwZ0J3Qjs7QUFzZ0J6QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJWSxFQUFBQSxtQkE3Z0J5QiwrQkE2Z0JMWixJQTdnQkssRUE2Z0JDYSxNQTdnQkQsRUE2Z0JnQztBQUFBOztBQUFBLFFBQXZCQyxnQkFBdUIsdUVBQUosRUFBSTtBQUNyRCxRQUFNakQsS0FBSyxHQUFHLEVBQWQsQ0FEcUQsQ0FHckQ7O0FBQ0EsUUFBTXFDLE9BQU8sR0FBR0QsTUFBTSxDQUFDQyxPQUFQLENBQWVGLElBQWYsRUFBcUJlLElBQXJCLENBQTBCLHdCQUFnQztBQUFBO0FBQUEsVUFBOUJDLElBQThCO0FBQUEsVUFBeEJDLElBQXdCOztBQUFBO0FBQUEsVUFBaEJDLElBQWdCO0FBQUEsVUFBVkMsSUFBVTs7QUFDdEUsVUFBSUYsSUFBSSxDQUFDaEYsSUFBTCxLQUFjLFFBQWQsSUFBMEJrRixJQUFJLENBQUNsRixJQUFMLEtBQWMsTUFBNUMsRUFBb0QsT0FBTyxDQUFDLENBQVI7QUFDcEQsVUFBSWdGLElBQUksQ0FBQ2hGLElBQUwsS0FBYyxNQUFkLElBQXdCa0YsSUFBSSxDQUFDbEYsSUFBTCxLQUFjLFFBQTFDLEVBQW9ELE9BQU8sQ0FBUDtBQUNwRCxhQUFPK0UsSUFBSSxDQUFDSSxhQUFMLENBQW1CRixJQUFuQixDQUFQO0FBQ0gsS0FKZSxDQUFoQjtBQU1BaEIsSUFBQUEsT0FBTyxDQUFDN0IsT0FBUixDQUFnQixpQkFBa0I7QUFBQTtBQUFBLFVBQWhCakQsR0FBZ0I7QUFBQSxVQUFYMEMsS0FBVzs7QUFDOUIsVUFBSUEsS0FBSyxDQUFDN0IsSUFBTixLQUFlLFFBQW5CLEVBQTZCO0FBQ3pCO0FBQ0EsWUFBTW9GLFVBQVUsR0FBR1AsZ0JBQWdCLGFBQU1BLGdCQUFOLGNBQTBCMUYsR0FBMUIsSUFBa0NBLEdBQXJFLENBRnlCLENBSXpCOztBQUNBeUMsUUFBQUEsS0FBSyxDQUFDeUQsSUFBTixDQUFXO0FBQ1BDLFVBQUFBLElBQUksWUFBS1YsTUFBTCwwRkFBdUZ6RixHQUF2RixDQURHO0FBRVAwQyxVQUFBQSxLQUFLLEVBQUUsRUFGQTtBQUdQMEQsVUFBQUEsUUFBUSxFQUFFLElBSEg7QUFJUHZGLFVBQUFBLElBQUksRUFBRSxRQUpDO0FBS1B3RixVQUFBQSxVQUFVLEVBQUVKLFVBTEw7QUFNUEssVUFBQUEsWUFBWSxFQUFFWjtBQU5QLFNBQVgsRUFMeUIsQ0FjekI7O0FBQ0EsWUFBTWEsVUFBVSxHQUFHLEtBQUksQ0FBQ2YsbUJBQUwsQ0FBeUI5QyxLQUFLLENBQUM2QyxRQUEvQixFQUF5Q0UsTUFBTSxHQUFHLDBCQUFsRCxFQUE4RVEsVUFBOUUsQ0FBbkI7O0FBQ0F4RCxRQUFBQSxLQUFLLENBQUN5RCxJQUFOLE9BQUF6RCxLQUFLLHFCQUFTOEQsVUFBVCxFQUFMO0FBQ0gsT0FqQkQsTUFpQk87QUFDSDtBQUNBOUQsUUFBQUEsS0FBSyxDQUFDeUQsSUFBTixDQUFXO0FBQ1BDLFVBQUFBLElBQUksWUFBS1YsTUFBTCxpREFBZ0R6RixHQUFoRCxlQUF3RDBDLEtBQUssQ0FBQzRDLElBQTlELE1BREc7QUFFUDVDLFVBQUFBLEtBQUssRUFBRUEsS0FBSyxDQUFDdUMsSUFGTjtBQUdQdUIsVUFBQUEsUUFBUSxFQUFFOUQsS0FBSyxXQUhSO0FBSVA3QixVQUFBQSxJQUFJLEVBQUUsTUFKQztBQUtQeUYsVUFBQUEsWUFBWSxFQUFFWjtBQUxQLFNBQVg7QUFPSDtBQUNKLEtBNUJEO0FBOEJBLFdBQU9qRCxLQUFQO0FBQ0gsR0F0akJ3Qjs7QUF3akJ6QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSXRGLEVBQUFBLGtCQTlqQnlCLDhCQThqQk5zSixRQTlqQk0sRUE4akJJQyxNQTlqQkosRUE4akJZO0FBQ2pDLFFBQU1DLE1BQU0sR0FBR0YsUUFBUSxDQUFDQyxNQUFNLENBQUNDLE1BQVIsQ0FBUixJQUEyQixFQUExQztBQUNBLFFBQUl2RCxJQUFJLEdBQUcsRUFBWDtBQUVBMUksSUFBQUEsQ0FBQyxDQUFDa00sSUFBRixDQUFPRCxNQUFQLEVBQWUsVUFBQzVGLEtBQUQsRUFBUThGLE1BQVIsRUFBbUI7QUFDOUI7QUFDQSxVQUFJck0sb0JBQW9CLENBQUNTLFNBQXJCLElBQWtDVCxvQkFBb0IsQ0FBQ1MsU0FBckIsQ0FBK0I4RixLQUEvQixDQUF0QyxFQUE2RTtBQUN6RSxZQUFNbUMsSUFBSSxHQUFHMUksb0JBQW9CLENBQUNTLFNBQXJCLENBQStCOEYsS0FBL0IsQ0FBYjs7QUFFQSxZQUFJbUMsSUFBSSxDQUFDckMsSUFBTCxLQUFjLFFBQWxCLEVBQTRCO0FBQ3hCO0FBQ0E7QUFDQSxjQUFNaUcsZ0JBQWdCLEdBQUc1RCxJQUFJLENBQUNvRCxZQUFMLDJCQUFvQ3BELElBQUksQ0FBQ29ELFlBQXpDLFVBQTJELEVBQXBGO0FBQ0FsRCxVQUFBQSxJQUFJLDhEQUFvREYsSUFBSSxDQUFDbUQsVUFBekQsZ0JBQXdFUyxnQkFBeEUsMENBQXFINUQsSUFBSSxDQUFDbUQsVUFBMUgsb0hBQTJPbkQsSUFBSSxDQUFDaUQsSUFBaFAsV0FBSjtBQUNILFNBTEQsTUFLTztBQUNIO0FBQ0E7QUFDQSxjQUFNSyxRQUFRLEdBQUd0RCxJQUFJLENBQUNzRCxRQUFMLEdBQWdCLGlCQUFoQixHQUFvQyxFQUFyRDtBQUNBLGNBQU1PLFVBQVUsR0FBRzdELElBQUksQ0FBQ29ELFlBQUwsMkJBQW9DcEQsSUFBSSxDQUFDb0QsWUFBekMsVUFBMkQsRUFBOUU7QUFDQWxELFVBQUFBLElBQUksMENBQWtDb0QsUUFBbEMsNkJBQTJESyxNQUFNLENBQUNILE1BQU0sQ0FBQ2hFLEtBQVIsQ0FBakUsNEJBQStGbUUsTUFBTSxDQUFDSCxNQUFNLENBQUNoRSxLQUFSLENBQXJHLGdCQUF3SHFFLFVBQXhILGNBQXNJN0QsSUFBSSxDQUFDaUQsSUFBM0ksV0FBSjtBQUNIO0FBQ0osT0FmRCxNQWVPO0FBQ0g7QUFDQSxZQUFNYSxhQUFhLEdBQUlILE1BQU0sQ0FBQ0gsTUFBTSxDQUFDTixRQUFSLENBQVAsR0FBNEIsV0FBNUIsR0FBMEMsRUFBaEU7QUFDQWhELFFBQUFBLElBQUksMkJBQW1CNEQsYUFBbkIsaUNBQXFESCxNQUFNLENBQUNILE1BQU0sQ0FBQ2hFLEtBQVIsQ0FBM0QsZ0JBQThFbUUsTUFBTSxDQUFDSCxNQUFNLENBQUNQLElBQVIsQ0FBcEYsV0FBSjtBQUNIO0FBQ0osS0F0QkQ7QUF3QkEsV0FBTy9DLElBQVA7QUFDSCxHQTNsQndCOztBQTZsQnpCO0FBQ0o7QUFDQTtBQUNJaEcsRUFBQUEsd0JBaG1CeUIsc0NBZ21CRTtBQUN2QixRQUFNOEUsU0FBUyxHQUFHMUgsb0JBQW9CLENBQUNRLG1CQUF2QyxDQUR1QixDQUd2QjtBQUNBOztBQUNBMkMsSUFBQUEsUUFBUSxDQUFDeUQsZ0JBQVQsQ0FBMEIsT0FBMUIsRUFBbUMsVUFBQ3ZELENBQUQsRUFBTztBQUN0QztBQUNBLFVBQU1vSixZQUFZLEdBQUdwSixDQUFDLENBQUNvRCxNQUFGLENBQVM3RSxPQUFULENBQWlCLG9DQUFqQixDQUFyQjtBQUNBLFVBQUksQ0FBQzZLLFlBQUwsRUFBbUI7QUFFbkJwSixNQUFBQSxDQUFDLENBQUNxSix3QkFBRjtBQUNBckosTUFBQUEsQ0FBQyxDQUFDQyxjQUFGO0FBRUEsVUFBTXFKLE9BQU8sR0FBR3pNLENBQUMsQ0FBQ3VNLFlBQUQsQ0FBakI7QUFDQSxVQUFNaEIsVUFBVSxHQUFHa0IsT0FBTyxDQUFDakosSUFBUixDQUFhLFFBQWIsQ0FBbkI7QUFDQSxVQUFNa0osT0FBTyxHQUFHRCxPQUFPLENBQUM1SCxJQUFSLENBQWEsZ0JBQWIsQ0FBaEI7QUFDQSxVQUFNaUQsS0FBSyxHQUFHTixTQUFTLENBQUMzQyxJQUFWLENBQWUsT0FBZixDQUFkLENBWHNDLENBYXRDOztBQUNBLFVBQU04SCxXQUFXLEdBQUdELE9BQU8sQ0FBQzVILFFBQVIsQ0FBaUIsT0FBakIsQ0FBcEI7O0FBRUEsVUFBSTZILFdBQUosRUFBaUI7QUFDYjtBQUNBRCxRQUFBQSxPQUFPLENBQUNqSixXQUFSLENBQW9CLE9BQXBCLEVBQTZCdkMsUUFBN0IsQ0FBc0MsTUFBdEMsRUFGYSxDQUdiOztBQUNBNEcsUUFBQUEsS0FBSyxDQUFDakQsSUFBTixvQ0FBc0MwRyxVQUF0QyxVQUFzRHFCLElBQXREO0FBQ0E5RSxRQUFBQSxLQUFLLENBQUNqRCxJQUFOLHdDQUEwQzBHLFVBQTFDLFVBQTBEcUIsSUFBMUQ7QUFDSCxPQU5ELE1BTU87QUFDSDtBQUNBRixRQUFBQSxPQUFPLENBQUNqSixXQUFSLENBQW9CLE1BQXBCLEVBQTRCdkMsUUFBNUIsQ0FBcUMsT0FBckM7QUFDQXBCLFFBQUFBLG9CQUFvQixDQUFDK00sbUJBQXJCLENBQXlDL0UsS0FBekMsRUFBZ0R5RCxVQUFoRDtBQUNIO0FBQ0osS0EzQkQsRUEyQkcsSUEzQkgsRUFMdUIsQ0FnQ2I7QUFFVjs7QUFDQS9ELElBQUFBLFNBQVMsQ0FBQ3RFLEVBQVYsQ0FBYSxPQUFiLEVBQXNCLGNBQXRCLEVBQXNDLFVBQUNDLENBQUQsRUFBTztBQUN6QyxVQUFNMkosV0FBVyxHQUFHOU0sQ0FBQyxDQUFDbUQsQ0FBQyxDQUFDb0QsTUFBSCxDQUFELENBQVlYLEdBQVosR0FBa0JDLElBQWxCLEVBQXBCO0FBQ0EsVUFBTWlDLEtBQUssR0FBR04sU0FBUyxDQUFDM0MsSUFBVixDQUFlLE9BQWYsQ0FBZDs7QUFFQSxVQUFJaUksV0FBVyxDQUFDckgsTUFBWixHQUFxQixDQUF6QixFQUE0QjtBQUN4QjtBQUNBcUMsUUFBQUEsS0FBSyxDQUFDakQsSUFBTixDQUFXLFlBQVgsRUFBeUIrSCxJQUF6QjtBQUNBOUUsUUFBQUEsS0FBSyxDQUFDakQsSUFBTixDQUFXLGdCQUFYLEVBQTZCK0gsSUFBN0I7QUFDQTlFLFFBQUFBLEtBQUssQ0FBQ2pELElBQU4sQ0FBVyxnQkFBWCxFQUE2QnBCLFdBQTdCLENBQXlDLE9BQXpDLEVBQWtEdkMsUUFBbEQsQ0FBMkQsTUFBM0Q7QUFDSCxPQUxELE1BS087QUFDSDtBQUNBNEcsUUFBQUEsS0FBSyxDQUFDakQsSUFBTixDQUFXLGdCQUFYLEVBQTZCcUgsSUFBN0IsQ0FBa0MsVUFBQ2EsQ0FBRCxFQUFJQyxNQUFKLEVBQWU7QUFDN0MsY0FBTVAsT0FBTyxHQUFHek0sQ0FBQyxDQUFDZ04sTUFBRCxDQUFqQjtBQUNBLGNBQU16QixVQUFVLEdBQUdrQixPQUFPLENBQUNqSixJQUFSLENBQWEsUUFBYixDQUFuQjtBQUNBLGNBQU1tSixXQUFXLEdBQUdGLE9BQU8sQ0FBQzVILElBQVIsQ0FBYSxnQkFBYixFQUErQkMsUUFBL0IsQ0FBd0MsT0FBeEMsQ0FBcEI7O0FBQ0EsY0FBSTZILFdBQUosRUFBaUI7QUFDYjdNLFlBQUFBLG9CQUFvQixDQUFDK00sbUJBQXJCLENBQXlDL0UsS0FBekMsRUFBZ0R5RCxVQUFoRDtBQUNIO0FBQ0osU0FQRDtBQVFIO0FBQ0osS0FwQkQ7QUFxQkgsR0F4cEJ3Qjs7QUEwcEJ6QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSXNCLEVBQUFBLG1CQWhxQnlCLCtCQWdxQkwvRSxLQWhxQkssRUFncUJFeUQsVUFocUJGLEVBZ3FCYztBQUNuQztBQUNBekQsSUFBQUEsS0FBSyxDQUFDakQsSUFBTixvQ0FBc0MwRyxVQUF0QyxVQUFzRHBLLElBQXRELEdBRm1DLENBSW5DOztBQUNBMkcsSUFBQUEsS0FBSyxDQUFDakQsSUFBTix3Q0FBMEMwRyxVQUExQyxVQUEwRFcsSUFBMUQsQ0FBK0QsVUFBQ2EsQ0FBRCxFQUFJRSxXQUFKLEVBQW9CO0FBQy9FLFVBQU1DLFlBQVksR0FBR2xOLENBQUMsQ0FBQ2lOLFdBQUQsQ0FBdEI7QUFDQSxVQUFNRSxTQUFTLEdBQUdELFlBQVksQ0FBQzFKLElBQWIsQ0FBa0IsUUFBbEIsQ0FBbEIsQ0FGK0UsQ0FJL0U7O0FBQ0EwSixNQUFBQSxZQUFZLENBQUNySSxJQUFiLENBQWtCLGdCQUFsQixFQUFvQ3BCLFdBQXBDLENBQWdELE1BQWhELEVBQXdEdkMsUUFBeEQsQ0FBaUUsT0FBakUsRUFMK0UsQ0FPL0U7O0FBQ0FwQixNQUFBQSxvQkFBb0IsQ0FBQytNLG1CQUFyQixDQUF5Qy9FLEtBQXpDLEVBQWdEcUYsU0FBaEQsRUFSK0UsQ0FVL0U7O0FBQ0FELE1BQUFBLFlBQVksQ0FBQy9MLElBQWI7QUFDSCxLQVpEO0FBYUgsR0FsckJ3Qjs7QUFvckJ6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJaU0sRUFBQUEsbUJBeHJCeUIsK0JBd3JCTDlDLFFBeHJCSyxFQXdyQks7QUFDMUIsUUFBSSxDQUFDQSxRQUFMLEVBQWU7QUFFZixRQUFNeEMsS0FBSyxHQUFHaEksb0JBQW9CLENBQUNRLG1CQUFyQixDQUF5Q3VFLElBQXpDLENBQThDLE9BQTlDLENBQWQ7QUFDQSxRQUFNd0ksU0FBUyxHQUFHdkYsS0FBSyxDQUFDakQsSUFBTixtQ0FBcUN5RixRQUFyQyxTQUFsQjs7QUFFQSxRQUFJK0MsU0FBUyxDQUFDNUgsTUFBZCxFQUFzQjtBQUNsQjtBQUNBLFVBQUk2SCxVQUFVLEdBQUdELFNBQVMsQ0FBQzdKLElBQVYsQ0FBZSxRQUFmLENBQWpCOztBQUNBLGFBQU84SixVQUFQLEVBQW1CO0FBQ2YsWUFBTWIsT0FBTyxHQUFHM0UsS0FBSyxDQUFDakQsSUFBTix3Q0FBMEN5SSxVQUExQyxTQUFoQjtBQUNBLFlBQUksQ0FBQ2IsT0FBTyxDQUFDaEgsTUFBYixFQUFxQjtBQUVyQixZQUFNaUgsT0FBTyxHQUFHRCxPQUFPLENBQUM1SCxJQUFSLENBQWEsZ0JBQWIsQ0FBaEIsQ0FKZSxDQU1mOztBQUNBNEgsUUFBQUEsT0FBTyxDQUFDRyxJQUFSLEdBUGUsQ0FTZjs7QUFDQSxZQUFJRixPQUFPLENBQUM1SCxRQUFSLENBQWlCLE9BQWpCLENBQUosRUFBK0I7QUFDM0I0SCxVQUFBQSxPQUFPLENBQUNqSixXQUFSLENBQW9CLE9BQXBCLEVBQTZCdkMsUUFBN0IsQ0FBc0MsTUFBdEM7QUFDQTRHLFVBQUFBLEtBQUssQ0FBQ2pELElBQU4sb0NBQXNDeUksVUFBdEMsVUFBc0RWLElBQXREO0FBQ0E5RSxVQUFBQSxLQUFLLENBQUNqRCxJQUFOLHdDQUEwQ3lJLFVBQTFDLFVBQTBEVixJQUExRDtBQUNILFNBZGMsQ0FnQmY7OztBQUNBVSxRQUFBQSxVQUFVLEdBQUdiLE9BQU8sQ0FBQ2pKLElBQVIsQ0FBYSxRQUFiLENBQWI7QUFDSDtBQUNKO0FBQ0osR0FydEJ3Qjs7QUF1dEJ6QjtBQUNKO0FBQ0E7QUFDSWMsRUFBQUEsZ0JBMXRCeUIsOEJBMHRCTjtBQUNmO0FBQ0EsUUFBSXhFLG9CQUFvQixDQUFDWSxjQUF6QixFQUF5QztBQUNyQztBQUNIOztBQUVELFFBQU02TSxJQUFJLEdBQUcvTCxNQUFNLENBQUNnTSxRQUFQLENBQWdCRCxJQUE3Qjs7QUFDQSxRQUFJQSxJQUFJLElBQUlBLElBQUksQ0FBQ0UsVUFBTCxDQUFnQixRQUFoQixDQUFaLEVBQXVDO0FBQ25DLFVBQU1uRCxRQUFRLEdBQUdvRCxrQkFBa0IsQ0FBQ0gsSUFBSSxDQUFDSSxTQUFMLENBQWUsQ0FBZixDQUFELENBQW5DOztBQUNBLFVBQUlyRCxRQUFRLElBQUl4SyxvQkFBb0IsQ0FBQ1EsbUJBQXJCLENBQXlDc0IsUUFBekMsQ0FBa0QsV0FBbEQsTUFBbUUwSSxRQUFuRixFQUE2RjtBQUN6RjtBQUNBLFlBQU1zRCxVQUFVLEdBQUc5TixvQkFBb0IsQ0FBQ1MsU0FBckIsQ0FBK0JzTixJQUEvQixDQUFvQyxVQUFBckYsSUFBSTtBQUFBLGlCQUN2REEsSUFBSSxDQUFDckMsSUFBTCxLQUFjLE1BQWQsSUFBd0JxQyxJQUFJLENBQUNSLEtBQUwsS0FBZXNDLFFBRGdCO0FBQUEsU0FBeEMsQ0FBbkI7O0FBR0EsWUFBSXNELFVBQUosRUFBZ0I7QUFDWjtBQUNBOU4sVUFBQUEsb0JBQW9CLENBQUNzTixtQkFBckIsQ0FBeUM5QyxRQUF6QztBQUNBeEssVUFBQUEsb0JBQW9CLENBQUNRLG1CQUFyQixDQUF5Q3NCLFFBQXpDLENBQWtELGNBQWxELEVBQWtFMEksUUFBbEU7QUFDQXhLLFVBQUFBLG9CQUFvQixDQUFDUSxtQkFBckIsQ0FBeUNzQixRQUF6QyxDQUFrRCxVQUFsRCxFQUE4RDBJLFFBQTlEO0FBQ0F4SyxVQUFBQSxvQkFBb0IsQ0FBQ1csUUFBckIsQ0FBOEI4RCxJQUE5QixDQUFtQyxXQUFuQyxFQUFnRCxVQUFoRCxFQUE0RCtGLFFBQTVEO0FBQ0F4SyxVQUFBQSxvQkFBb0IsQ0FBQ3VFLG1CQUFyQjtBQUNIO0FBQ0o7QUFDSjtBQUNKLEdBbHZCd0I7O0FBb3ZCekI7QUFDSjtBQUNBO0FBQ0l5SixFQUFBQSxlQXZ2QnlCLDZCQXV2QlA7QUFDZCxRQUFNUCxJQUFJLEdBQUcvTCxNQUFNLENBQUNnTSxRQUFQLENBQWdCRCxJQUE3Qjs7QUFDQSxRQUFJQSxJQUFJLElBQUlBLElBQUksQ0FBQ0UsVUFBTCxDQUFnQixRQUFoQixDQUFaLEVBQXVDO0FBQ25DLGFBQU9DLGtCQUFrQixDQUFDSCxJQUFJLENBQUNJLFNBQUwsQ0FBZSxDQUFmLENBQUQsQ0FBekI7QUFDSDs7QUFDRCxXQUFPLEVBQVA7QUFDSCxHQTd2QndCOztBQSt2QnpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0k3SyxFQUFBQSx1QkFud0J5QixtQ0Ftd0JEaUosUUFud0JDLEVBbXdCUztBQUM5QjtBQUNBLFFBQUksQ0FBQ0EsUUFBRCxJQUFhLENBQUNBLFFBQVEsQ0FBQ2dDLE1BQXZCLElBQWlDLENBQUNoQyxRQUFRLENBQUN2SSxJQUEzQyxJQUFtRCxDQUFDdUksUUFBUSxDQUFDdkksSUFBVCxDQUFjd0csS0FBdEUsRUFBNkU7QUFDekU7QUFDQSxVQUFJLENBQUNsSyxvQkFBb0IsQ0FBQ2Usa0JBQTFCLEVBQThDO0FBQzFDZixRQUFBQSxvQkFBb0IsQ0FBQ1UsT0FBckIsQ0FBNkJpRCxXQUE3QixDQUF5QyxRQUF6QztBQUNIOztBQUNEO0FBQ0g7O0FBRUQsUUFBTXVHLEtBQUssR0FBRytCLFFBQVEsQ0FBQ3ZJLElBQVQsQ0FBY3dHLEtBQTVCLENBVjhCLENBWTlCOztBQUNBLFFBQUlnRSxNQUFNLEdBQUdsTyxvQkFBb0IsQ0FBQ2dPLGVBQXJCLEVBQWIsQ0FiOEIsQ0FlOUI7O0FBQ0EsUUFBSSxDQUFDRSxNQUFMLEVBQWE7QUFDVCxVQUFNQyxRQUFRLEdBQUduTyxvQkFBb0IsQ0FBQ1csUUFBckIsQ0FBOEI4RCxJQUE5QixDQUFtQyxXQUFuQyxFQUFnRCxVQUFoRCxDQUFqQjs7QUFDQSxVQUFJMEosUUFBUSxLQUFLLEVBQWpCLEVBQXFCO0FBQ2pCRCxRQUFBQSxNQUFNLEdBQUdDLFFBQVEsQ0FBQ3BJLElBQVQsRUFBVDtBQUNIO0FBQ0osS0FyQjZCLENBdUI5Qjs7O0FBQ0EvRixJQUFBQSxvQkFBb0IsQ0FBQ1MsU0FBckIsR0FBaUNULG9CQUFvQixDQUFDaUssa0JBQXJCLENBQXdDQyxLQUF4QyxFQUErQ2dFLE1BQS9DLENBQWpDLENBeEI4QixDQTBCOUI7O0FBQ0EsUUFBTUUsY0FBYyxHQUFHcE8sb0JBQW9CLENBQUNTLFNBQXJCLENBQStCNE4sR0FBL0IsQ0FBbUMsVUFBQzNGLElBQUQsRUFBT25DLEtBQVAsRUFBaUI7QUFDdkUsVUFBSW1DLElBQUksQ0FBQ3JDLElBQUwsS0FBYyxRQUFsQixFQUE0QjtBQUN4QixlQUFPO0FBQ0hzRixVQUFBQSxJQUFJLEVBQUVqRCxJQUFJLENBQUNpRCxJQUFMLENBQVUyQyxPQUFWLENBQWtCLFVBQWxCLEVBQThCLEVBQTlCLENBREg7QUFDc0M7QUFDekNwRyxVQUFBQSxLQUFLLEVBQUUsRUFGSjtBQUdIMEQsVUFBQUEsUUFBUSxFQUFFO0FBSFAsU0FBUDtBQUtILE9BTkQsTUFNTztBQUNILGVBQU87QUFDSEQsVUFBQUEsSUFBSSxFQUFFakQsSUFBSSxDQUFDaUQsSUFBTCxDQUFVMkMsT0FBVixDQUFrQixVQUFsQixFQUE4QixFQUE5QixDQURIO0FBQ3NDO0FBQ3pDcEcsVUFBQUEsS0FBSyxFQUFFUSxJQUFJLENBQUNSLEtBRlQ7QUFHSDhELFVBQUFBLFFBQVEsRUFBRXRELElBQUksQ0FBQ3NEO0FBSFosU0FBUDtBQUtIO0FBQ0osS0Fkc0IsQ0FBdkIsQ0EzQjhCLENBMkM5Qjs7QUFDQWhNLElBQUFBLG9CQUFvQixDQUFDUSxtQkFBckIsQ0FBeUNzQixRQUF6QyxDQUFrRCxZQUFsRCxFQUFnRTtBQUM1RHFLLE1BQUFBLE1BQU0sRUFBRWlDO0FBRG9ELEtBQWhFLEVBNUM4QixDQWdEOUI7O0FBQ0EsUUFBTUcsWUFBWSxHQUFHdk8sb0JBQW9CLENBQUNTLFNBQXJCLENBQStCc0UsSUFBL0IsQ0FBb0MsVUFBQTJELElBQUk7QUFBQSxhQUFJQSxJQUFJLENBQUNzRCxRQUFUO0FBQUEsS0FBeEMsQ0FBckI7O0FBQ0EsUUFBSXVDLFlBQUosRUFBa0I7QUFDZDtBQUNBcEksTUFBQUEsVUFBVSxDQUFDLFlBQU07QUFDYjtBQUNBbkcsUUFBQUEsb0JBQW9CLENBQUNzTixtQkFBckIsQ0FBeUNpQixZQUFZLENBQUNyRyxLQUF0RCxFQUZhLENBR2I7O0FBQ0FsSSxRQUFBQSxvQkFBb0IsQ0FBQ1EsbUJBQXJCLENBQXlDc0IsUUFBekMsQ0FBa0QsY0FBbEQsRUFBa0V5TSxZQUFZLENBQUNyRyxLQUEvRSxFQUphLENBS2I7O0FBQ0FsSSxRQUFBQSxvQkFBb0IsQ0FBQ1EsbUJBQXJCLENBQXlDc0IsUUFBekMsQ0FBa0QsU0FBbEQsRUFOYSxDQU9iOztBQUNBOUIsUUFBQUEsb0JBQW9CLENBQUNRLG1CQUFyQixDQUF5Q3NCLFFBQXpDLENBQWtELFVBQWxELEVBQThEeU0sWUFBWSxDQUFDckcsS0FBM0U7QUFDQWxJLFFBQUFBLG9CQUFvQixDQUFDVyxRQUFyQixDQUE4QjhELElBQTlCLENBQW1DLFdBQW5DLEVBQWdELFVBQWhELEVBQTREOEosWUFBWSxDQUFDckcsS0FBekU7QUFDSCxPQVZTLEVBVVAsR0FWTyxDQUFWO0FBV0gsS0FiRCxNQWFPLElBQUlnRyxNQUFKLEVBQVk7QUFDZjtBQUNBO0FBQ0EsVUFBTU0sWUFBWSxHQUFHeE8sb0JBQW9CLENBQUNTLFNBQXJCLENBQStCc0UsSUFBL0IsQ0FBb0MsVUFBQTJELElBQUk7QUFBQSxlQUN6REEsSUFBSSxDQUFDckMsSUFBTCxLQUFjLE1BQWQsSUFBd0JxQyxJQUFJLENBQUNSLEtBQUwsS0FBZWdHLE1BRGtCO0FBQUEsT0FBeEMsQ0FBckI7O0FBR0EsVUFBSU0sWUFBSixFQUFrQjtBQUNkckksUUFBQUEsVUFBVSxDQUFDLFlBQU07QUFDYjtBQUNBbkcsVUFBQUEsb0JBQW9CLENBQUNzTixtQkFBckIsQ0FBeUNrQixZQUFZLENBQUN0RyxLQUF0RCxFQUZhLENBR2I7O0FBQ0FsSSxVQUFBQSxvQkFBb0IsQ0FBQ1EsbUJBQXJCLENBQXlDc0IsUUFBekMsQ0FBa0QsY0FBbEQsRUFBa0UwTSxZQUFZLENBQUN0RyxLQUEvRTtBQUNBbEksVUFBQUEsb0JBQW9CLENBQUNRLG1CQUFyQixDQUF5Q3NCLFFBQXpDLENBQWtELFNBQWxEO0FBQ0E5QixVQUFBQSxvQkFBb0IsQ0FBQ1EsbUJBQXJCLENBQXlDc0IsUUFBekMsQ0FBa0QsVUFBbEQsRUFBOEQwTSxZQUFZLENBQUN0RyxLQUEzRTtBQUNBbEksVUFBQUEsb0JBQW9CLENBQUNXLFFBQXJCLENBQThCOEQsSUFBOUIsQ0FBbUMsV0FBbkMsRUFBZ0QsVUFBaEQsRUFBNEQrSixZQUFZLENBQUN0RyxLQUF6RTtBQUNILFNBUlMsRUFRUCxHQVJPLENBQVY7QUFTSCxPQVZELE1BVU87QUFDSDtBQUNBLFlBQUksQ0FBQ2xJLG9CQUFvQixDQUFDZSxrQkFBMUIsRUFBOEM7QUFDMUNmLFVBQUFBLG9CQUFvQixDQUFDVSxPQUFyQixDQUE2QmlELFdBQTdCLENBQXlDLFFBQXpDO0FBQ0g7QUFDSjtBQUNKLEtBdEJNLE1Bc0JBO0FBQ0g7QUFDQSxVQUFJLENBQUMzRCxvQkFBb0IsQ0FBQ2Usa0JBQTFCLEVBQThDO0FBQzFDZixRQUFBQSxvQkFBb0IsQ0FBQ1UsT0FBckIsQ0FBNkJpRCxXQUE3QixDQUF5QyxRQUF6QztBQUNIO0FBQ0osS0ExRjZCLENBNEY5Qjs7O0FBQ0F3QyxJQUFBQSxVQUFVLENBQUMsWUFBTTtBQUNibkcsTUFBQUEsb0JBQW9CLENBQUNZLGNBQXJCLEdBQXNDLEtBQXRDO0FBQ0gsS0FGUyxFQUVQLEdBRk8sQ0FBVjtBQUdILEdBbjJCd0I7O0FBcTJCekI7QUFDSjtBQUNBO0FBQ0E7QUFDSW9CLEVBQUFBLGNBejJCeUIsMEJBeTJCVmtHLEtBejJCVSxFQXkyQkg7QUFDbEIsUUFBSUEsS0FBSyxDQUFDdkMsTUFBTixLQUFpQixDQUFyQixFQUF3QjtBQUNwQjtBQUNILEtBSGlCLENBS2xCOzs7QUFDQTNGLElBQUFBLG9CQUFvQixDQUFDUSxtQkFBckIsQ0FBeUNzQixRQUF6QyxDQUFrRCxVQUFsRCxFQUE4RG9HLEtBQTlEO0FBRUFsSSxJQUFBQSxvQkFBb0IsQ0FBQ1csUUFBckIsQ0FBOEI4RCxJQUE5QixDQUFtQyxXQUFuQyxFQUFnRCxVQUFoRCxFQUE0RHlELEtBQTVELEVBUmtCLENBVWxCOztBQUNBeEcsSUFBQUEsTUFBTSxDQUFDZ00sUUFBUCxDQUFnQkQsSUFBaEIsR0FBdUIsVUFBVWdCLGtCQUFrQixDQUFDdkcsS0FBRCxDQUFuRCxDQVhrQixDQWFsQjs7QUFDQSxRQUFJLENBQUNsSSxvQkFBb0IsQ0FBQ1ksY0FBMUIsRUFBMEM7QUFDdENaLE1BQUFBLG9CQUFvQixDQUFDME8sWUFBckI7QUFDSCxLQWhCaUIsQ0FrQmxCOzs7QUFDQTFPLElBQUFBLG9CQUFvQixDQUFDMk8sMkJBQXJCLENBQWlEekcsS0FBakQsRUFuQmtCLENBcUJsQjs7QUFDQWxJLElBQUFBLG9CQUFvQixDQUFDa0IsZ0JBQXJCLEdBQXdDLElBQXhDLENBdEJrQixDQXdCbEI7O0FBQ0FsQixJQUFBQSxvQkFBb0IsQ0FBQzRPLDBCQUFyQixDQUFnRDFHLEtBQWhEO0FBQ0gsR0FuNEJ3Qjs7QUFxNEJ6QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSTJHLEVBQUFBLGdCQTM0QnlCLDRCQTI0QlJsSyxRQTM0QlEsRUEyNEJFO0FBQ3ZCLFFBQUksQ0FBQ0EsUUFBTCxFQUFlO0FBQ1gsYUFBTyxLQUFQO0FBQ0gsS0FIc0IsQ0FJdkI7OztBQUNBLFdBQU8sdUJBQXVCbUssSUFBdkIsQ0FBNEJuSyxRQUE1QixDQUFQO0FBQ0gsR0FqNUJ3Qjs7QUFtNUJ6QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lnSyxFQUFBQSwyQkF4NUJ5Qix1Q0F3NUJHaEssUUF4NUJILEVBdzVCYTtBQUNsQyxRQUFNb0ssUUFBUSxHQUFHN08sQ0FBQyxDQUFDLHFCQUFELENBQWxCO0FBQ0EsUUFBTThPLFNBQVMsR0FBR2hQLG9CQUFvQixDQUFDNk8sZ0JBQXJCLENBQXNDbEssUUFBdEMsQ0FBbEI7O0FBRUEsUUFBSXFLLFNBQUosRUFBZTtBQUNYO0FBQ0EsVUFBSWhQLG9CQUFvQixDQUFDZSxrQkFBekIsRUFBNkM7QUFDekNnTyxRQUFBQSxRQUFRLENBQUNoSyxJQUFULENBQWMsa0JBQWQsRUFBa0NwQixXQUFsQyxDQUE4QyxTQUE5QztBQUNBM0QsUUFBQUEsb0JBQW9CLENBQUNlLGtCQUFyQixHQUEwQyxLQUExQztBQUNBa0UsUUFBQUEsbUJBQW1CLENBQUNDLElBQXBCO0FBQ0g7O0FBQ0Q2SixNQUFBQSxRQUFRLENBQUMxTixJQUFUO0FBQ0gsS0FSRCxNQVFPO0FBQ0gwTixNQUFBQSxRQUFRLENBQUNqQyxJQUFUO0FBQ0g7QUFDSixHQXY2QndCOztBQXk2QnpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0k5RyxFQUFBQSxtQkE3NkJ5QixpQ0E2NkJIO0FBQ2xCLFFBQU1YLE1BQU0sR0FBR25GLENBQUMsQ0FBQyxvQkFBRCxDQUFoQjtBQUNBbUYsSUFBQUEsTUFBTSxDQUFDMUIsV0FBUCxDQUFtQixRQUFuQixFQUNLckMsR0FETCxDQUNTO0FBQUNDLE1BQUFBLEdBQUcsRUFBRSxFQUFOO0FBQVVDLE1BQUFBLElBQUksRUFBRSxFQUFoQjtBQUFvQnlOLE1BQUFBLE9BQU8sRUFBRTtBQUE3QixLQURULEVBRUtuQyxJQUZMLEdBRmtCLENBS2xCOztBQUNBekgsSUFBQUEsTUFBTSxDQUFDTixJQUFQLENBQVkscUJBQVosRUFBbUNwQixXQUFuQyxDQUErQyxTQUEvQztBQUNBMEIsSUFBQUEsTUFBTSxDQUFDTixJQUFQLENBQVkscUJBQVosRUFBbUNtSyxLQUFuQyxHQUEyQzlOLFFBQTNDLENBQW9ELFNBQXBEO0FBQ0gsR0FyN0J3Qjs7QUF1N0J6QjtBQUNKO0FBQ0E7QUFDSTZFLEVBQUFBLG1CQTE3QnlCLGlDQTA3Qkg7QUFDbEIsUUFBTVosTUFBTSxHQUFHbkYsQ0FBQyxDQUFDLG9CQUFELENBQWhCO0FBQ0FtRixJQUFBQSxNQUFNLENBQUNOLElBQVAsQ0FBWSxxQkFBWixFQUFtQ3BCLFdBQW5DLENBQStDLFNBQS9DO0FBQ0EwQixJQUFBQSxNQUFNLENBQUNqRSxRQUFQLENBQWdCLFFBQWhCLEVBQTBCQyxJQUExQjtBQUNILEdBOTdCd0I7O0FBZzhCekI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJb0UsRUFBQUEsbUJBcjhCeUIsK0JBcThCTDBKLFNBcjhCSyxFQXE4Qk07QUFDM0IsUUFBTTlKLE1BQU0sR0FBR25GLENBQUMsQ0FBQyxvQkFBRCxDQUFoQjtBQUNBLFFBQU1rUCxRQUFRLEdBQUcvSixNQUFNLENBQUNOLElBQVAsQ0FBWSxxQkFBWixDQUFqQjtBQUNBLFFBQU1XLFFBQVEsR0FBRzBKLFFBQVEsQ0FBQ0MsTUFBVCxDQUFnQixVQUFoQixDQUFqQjtBQUVBLFFBQUk5SSxLQUFLLEdBQUc2SSxRQUFRLENBQUM3SSxLQUFULENBQWViLFFBQWYsQ0FBWjtBQUNBYSxJQUFBQSxLQUFLLElBQUk0SSxTQUFULENBTjJCLENBUTNCOztBQUNBLFFBQUk1SSxLQUFLLEdBQUcsQ0FBWixFQUFlO0FBQ1hBLE1BQUFBLEtBQUssR0FBRzZJLFFBQVEsQ0FBQ3pKLE1BQVQsR0FBa0IsQ0FBMUI7QUFDSDs7QUFDRCxRQUFJWSxLQUFLLElBQUk2SSxRQUFRLENBQUN6SixNQUF0QixFQUE4QjtBQUMxQlksTUFBQUEsS0FBSyxHQUFHLENBQVI7QUFDSDs7QUFFRDZJLElBQUFBLFFBQVEsQ0FBQ3pMLFdBQVQsQ0FBcUIsU0FBckI7QUFDQXlMLElBQUFBLFFBQVEsQ0FBQ0UsRUFBVCxDQUFZL0ksS0FBWixFQUFtQm5GLFFBQW5CLENBQTRCLFNBQTVCO0FBQ0gsR0F2OUJ3Qjs7QUF5OUJ6QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lnRixFQUFBQSxrQkE5OUJ5Qiw4QkE4OUJOQyxJQTk5Qk0sRUE4OUJBNkIsS0E5OUJBLEVBODlCTztBQUM1QixRQUFJLENBQUNBLEtBQUQsSUFBVUEsS0FBSyxDQUFDbkMsSUFBTixPQUFpQixFQUEvQixFQUFtQztBQUMvQjtBQUNIOztBQUNEL0YsSUFBQUEsb0JBQW9CLENBQUNnQixnQkFBckIsQ0FBc0MwSyxJQUF0QyxDQUEyQztBQUFDckYsTUFBQUEsSUFBSSxFQUFKQSxJQUFEO0FBQU82QixNQUFBQSxLQUFLLEVBQUVBLEtBQUssQ0FBQ25DLElBQU47QUFBZCxLQUEzQztBQUNBL0YsSUFBQUEsb0JBQW9CLENBQUN1UCwwQkFBckI7QUFDQXZQLElBQUFBLG9CQUFvQixDQUFDd1Asa0JBQXJCO0FBQ0F0UCxJQUFBQSxDQUFDLENBQUMsZUFBRCxDQUFELENBQW1CNEYsR0FBbkIsQ0FBdUIsRUFBdkI7QUFDQTlGLElBQUFBLG9CQUFvQixDQUFDdUUsbUJBQXJCLENBQXlDLElBQXpDO0FBQ0gsR0F2K0J3Qjs7QUF5K0J6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJMkIsRUFBQUEscUJBNytCeUIsaUNBNitCSEssS0E3K0JHLEVBNitCSTtBQUN6QnZHLElBQUFBLG9CQUFvQixDQUFDZ0IsZ0JBQXJCLENBQXNDeU8sTUFBdEMsQ0FBNkNsSixLQUE3QyxFQUFvRCxDQUFwRDtBQUNBdkcsSUFBQUEsb0JBQW9CLENBQUN1UCwwQkFBckI7QUFDQXZQLElBQUFBLG9CQUFvQixDQUFDd1Asa0JBQXJCO0FBQ0F4UCxJQUFBQSxvQkFBb0IsQ0FBQ3VFLG1CQUFyQixDQUF5QyxJQUF6QztBQUNILEdBbC9Cd0I7O0FBby9CekI7QUFDSjtBQUNBO0FBQ0lpQyxFQUFBQSx3QkF2L0J5QixzQ0F1L0JFO0FBQ3ZCeEcsSUFBQUEsb0JBQW9CLENBQUNnQixnQkFBckIsR0FBd0MsRUFBeEM7QUFDQWhCLElBQUFBLG9CQUFvQixDQUFDdVAsMEJBQXJCO0FBQ0F2UCxJQUFBQSxvQkFBb0IsQ0FBQ3dQLGtCQUFyQjtBQUNBdFAsSUFBQUEsQ0FBQyxDQUFDLGVBQUQsQ0FBRCxDQUFtQjRGLEdBQW5CLENBQXVCLEVBQXZCO0FBQ0E5RixJQUFBQSxvQkFBb0IsQ0FBQ3VFLG1CQUFyQixDQUF5QyxJQUF6QztBQUNILEdBNy9Cd0I7O0FBKy9CekI7QUFDSjtBQUNBO0FBQ0lnTCxFQUFBQSwwQkFsZ0N5Qix3Q0FrZ0NJO0FBQ3pCLFFBQU1ySCxLQUFLLEdBQUdsSSxvQkFBb0IsQ0FBQ2dCLGdCQUFyQixDQUFzQzJFLE1BQXRDLEdBQStDLENBQS9DLEdBQ1IrSixJQUFJLENBQUNDLFNBQUwsQ0FBZTNQLG9CQUFvQixDQUFDZ0IsZ0JBQXBDLENBRFEsR0FFUixFQUZOO0FBR0FoQixJQUFBQSxvQkFBb0IsQ0FBQ1csUUFBckIsQ0FBOEI4RCxJQUE5QixDQUFtQyxXQUFuQyxFQUFnRCxRQUFoRCxFQUEwRHlELEtBQTFEO0FBQ0gsR0F2Z0N3Qjs7QUF5Z0N6QjtBQUNKO0FBQ0E7QUFDSXNILEVBQUFBLGtCQTVnQ3lCLGdDQTRnQ0o7QUFDakIsUUFBTUksVUFBVSxHQUFHMVAsQ0FBQyxDQUFDLGdCQUFELENBQXBCO0FBQ0EwUCxJQUFBQSxVQUFVLENBQUNDLEtBQVg7QUFFQTdQLElBQUFBLG9CQUFvQixDQUFDZ0IsZ0JBQXJCLENBQXNDeUgsT0FBdEMsQ0FBOEMsVUFBQ3FILFNBQUQsRUFBWXZKLEtBQVosRUFBc0I7QUFDaEUsVUFBTXdKLFFBQVEsR0FBR0QsU0FBUyxDQUFDekosSUFBVixLQUFtQixhQUFuQixHQUFtQyxjQUFuQyxHQUFvRCxVQUFyRTtBQUNBLFVBQU0ySixTQUFTLEdBQUdGLFNBQVMsQ0FBQ3pKLElBQVYsS0FBbUIsYUFBbkIsR0FBbUMsS0FBbkMsR0FBMkMsY0FBN0Q7QUFDQSxVQUFNNEosU0FBUyxHQUFHSCxTQUFTLENBQUN6SixJQUFWLEtBQW1CLGFBQW5CLEdBQW1DLEtBQW5DLEdBQTJDLE1BQTdEO0FBQ0EsVUFBTTZKLE1BQU0sR0FBR2hRLENBQUMsZ0RBQXdDNlAsUUFBeEMsNkJBQWlFeEosS0FBakUsZ0JBQWhCO0FBQ0EySixNQUFBQSxNQUFNLENBQUNySCxNQUFQLHNCQUEyQm1ILFNBQTNCLG1CQUE2Q0MsU0FBN0M7QUFDQUMsTUFBQUEsTUFBTSxDQUFDckgsTUFBUCxpQkFBdUIzSSxDQUFDLENBQUMsUUFBRCxDQUFELENBQVkyRixJQUFaLENBQWlCaUssU0FBUyxDQUFDNUgsS0FBM0IsRUFBa0NVLElBQWxDLEVBQXZCO0FBQ0FzSCxNQUFBQSxNQUFNLENBQUNySCxNQUFQLENBQWMsNkJBQWQ7QUFDQStHLE1BQUFBLFVBQVUsQ0FBQy9HLE1BQVgsQ0FBa0JxSCxNQUFsQjtBQUNILEtBVEQ7QUFVSCxHQTFoQ3dCOztBQTRoQ3pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSWhOLEVBQUFBLHVCQWppQ3lCLHFDQWlpQ0M7QUFDdEIsUUFBTWlOLFNBQVMsR0FBRyxJQUFJQyxlQUFKLENBQW9CMU8sTUFBTSxDQUFDZ00sUUFBUCxDQUFnQjJDLE1BQXBDLENBQWxCO0FBQ0EsUUFBTUMsV0FBVyxHQUFHSCxTQUFTLENBQUNJLEdBQVYsQ0FBYyxRQUFkLENBQXBCOztBQUVBLFFBQUlELFdBQVcsSUFBSUEsV0FBVyxDQUFDdkssSUFBWixPQUF1QixFQUExQyxFQUE4QztBQUMxQyxVQUFNeUssT0FBTyxHQUFHRixXQUFXLENBQUN2SyxJQUFaLEVBQWhCLENBRDBDLENBRzFDOztBQUNBLFVBQUl5SyxPQUFPLENBQUM3QyxVQUFSLENBQW1CLEdBQW5CLENBQUosRUFBNkI7QUFDekIsWUFBSTtBQUNBLGNBQU04QyxNQUFNLEdBQUdmLElBQUksQ0FBQ2dCLEtBQUwsQ0FBV0YsT0FBWCxDQUFmOztBQUNBLGNBQUlHLEtBQUssQ0FBQ0MsT0FBTixDQUFjSCxNQUFkLENBQUosRUFBMkI7QUFDdkJ6USxZQUFBQSxvQkFBb0IsQ0FBQ2dCLGdCQUFyQixHQUF3Q3lQLE1BQU0sQ0FBQ3BCLE1BQVAsQ0FDcEMsVUFBQ3dCLENBQUQ7QUFBQSxxQkFBT0EsQ0FBQyxJQUFJQSxDQUFDLENBQUMzSSxLQUFQLElBQWdCMkksQ0FBQyxDQUFDeEssSUFBekI7QUFBQSxhQURvQyxDQUF4QztBQUdIO0FBQ0osU0FQRCxDQU9FLE9BQU9oRCxDQUFQLEVBQVU7QUFDUjtBQUNBckQsVUFBQUEsb0JBQW9CLENBQUNnQixnQkFBckIsR0FBd0N3UCxPQUFPLENBQzFDN0YsS0FEbUMsQ0FDN0IsR0FENkIsRUFFbkMwRCxHQUZtQyxDQUUvQixVQUFDeUMsQ0FBRDtBQUFBLG1CQUFPQSxDQUFDLENBQUMvSyxJQUFGLEVBQVA7QUFBQSxXQUYrQixFQUduQ3NKLE1BSG1DLENBRzVCLFVBQUN5QixDQUFEO0FBQUEsbUJBQU9BLENBQUMsS0FBSyxFQUFiO0FBQUEsV0FINEIsRUFJbkN6QyxHQUptQyxDQUkvQixVQUFDeUMsQ0FBRDtBQUFBLG1CQUFRO0FBQUN6SyxjQUFBQSxJQUFJLEVBQUUsVUFBUDtBQUFtQjZCLGNBQUFBLEtBQUssRUFBRTRJO0FBQTFCLGFBQVI7QUFBQSxXQUorQixDQUF4QztBQUtIO0FBQ0osT0FoQkQsTUFnQk87QUFDSDtBQUNBOVEsUUFBQUEsb0JBQW9CLENBQUNnQixnQkFBckIsR0FBd0N3UCxPQUFPLENBQzFDN0YsS0FEbUMsQ0FDN0IsR0FENkIsRUFFbkMwRCxHQUZtQyxDQUUvQixVQUFDeUMsQ0FBRDtBQUFBLGlCQUFPQSxDQUFDLENBQUMvSyxJQUFGLEVBQVA7QUFBQSxTQUYrQixFQUduQ3NKLE1BSG1DLENBRzVCLFVBQUN5QixDQUFEO0FBQUEsaUJBQU9BLENBQUMsS0FBSyxFQUFiO0FBQUEsU0FINEIsRUFJbkN6QyxHQUptQyxDQUkvQixVQUFDeUMsQ0FBRDtBQUFBLGlCQUFRO0FBQUN6SyxZQUFBQSxJQUFJLEVBQUUsVUFBUDtBQUFtQjZCLFlBQUFBLEtBQUssRUFBRTRJO0FBQTFCLFdBQVI7QUFBQSxTQUorQixDQUF4QztBQUtIOztBQUVEOVEsTUFBQUEsb0JBQW9CLENBQUN1UCwwQkFBckI7QUFDQXZQLE1BQUFBLG9CQUFvQixDQUFDd1Asa0JBQXJCO0FBQ0g7QUFDSixHQXJrQ3dCOztBQXVrQ3pCO0FBQ0o7QUFDQTtBQUNJZCxFQUFBQSxZQTFrQ3lCLDBCQTBrQ1Y7QUFDWDtBQUNBeE8sSUFBQUEsQ0FBQyxDQUFDLGFBQUQsQ0FBRCxDQUFpQnlELFdBQWpCLENBQTZCLFFBQTdCLEVBRlcsQ0FJWDs7QUFDQXpELElBQUFBLENBQUMsQ0FBQyxvQkFBRCxDQUFELENBQXdCNEIsUUFBeEIsQ0FBaUMsY0FBakMsRUFBaUQsRUFBakQ7QUFDQTlCLElBQUFBLG9CQUFvQixDQUFDVyxRQUFyQixDQUE4QjhELElBQTlCLENBQW1DLFdBQW5DLEVBQWdELFVBQWhELEVBQTRELEVBQTVELEVBTlcsQ0FRWDtBQUNBO0FBQ0E7QUFDSCxHQXJsQ3dCOztBQXVsQ3pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJc00sRUFBQUEsNkJBN2xDeUIseUNBNmxDS0MsV0E3bENMLEVBNmxDa0I7QUFDdkMsUUFBTUMsY0FBYyxHQUFHL1EsQ0FBQyxDQUFDLGFBQUQsQ0FBeEI7QUFDQSxRQUFNZ1IsZ0JBQWdCLEdBQUdoUixDQUFDLENBQUMsaUJBQUQsQ0FBMUI7QUFDQSxRQUFJaVIsb0JBQW9CLEdBQUcsQ0FBM0I7QUFDQSxRQUFJQyxxQkFBcUIsR0FBRyxJQUE1QjtBQUNBLFFBQUlDLFlBQVksR0FBRyxDQUFuQjtBQUVBSixJQUFBQSxjQUFjLENBQUM3RSxJQUFmLENBQW9CLFVBQUM3RixLQUFELEVBQVErSyxNQUFSLEVBQW1CO0FBQ25DLFVBQU16TSxPQUFPLEdBQUczRSxDQUFDLENBQUNvUixNQUFELENBQWpCO0FBQ0EsVUFBTTdOLE1BQU0sR0FBRzhOLFFBQVEsQ0FBQzFNLE9BQU8sQ0FBQ25CLElBQVIsQ0FBYSxRQUFiLENBQUQsRUFBeUIsRUFBekIsQ0FBdkIsQ0FGbUMsQ0FJbkM7QUFDQTs7QUFDQSxVQUFJRCxNQUFNLElBQUl1TixXQUFXLEdBQUcsR0FBNUIsRUFBaUM7QUFDN0JuTSxRQUFBQSxPQUFPLENBQUNpSSxJQUFSO0FBQ0F1RSxRQUFBQSxZQUFZLEdBRmlCLENBRzdCOztBQUNBLFlBQUk1TixNQUFNLEdBQUcwTixvQkFBYixFQUFtQztBQUMvQkEsVUFBQUEsb0JBQW9CLEdBQUcxTixNQUF2QjtBQUNBMk4sVUFBQUEscUJBQXFCLEdBQUd2TSxPQUF4QjtBQUNIO0FBQ0osT0FSRCxNQVFPO0FBQ0hBLFFBQUFBLE9BQU8sQ0FBQ3hELElBQVI7QUFDSDtBQUNKLEtBakJELEVBUHVDLENBMEJ2QztBQUNBOztBQUNBLFFBQU1tUSxtQkFBbUIsR0FBR3RSLENBQUMsQ0FBQyx1QkFBRCxDQUE3Qjs7QUFDQSxRQUFJbVIsWUFBWSxLQUFLLENBQXJCLEVBQXdCO0FBQ3BCSCxNQUFBQSxnQkFBZ0IsQ0FBQzdQLElBQWpCO0FBQ0FtUSxNQUFBQSxtQkFBbUIsQ0FBQ3BRLFFBQXBCLENBQTZCLG1CQUE3QjtBQUNILEtBSEQsTUFHTztBQUNIOFAsTUFBQUEsZ0JBQWdCLENBQUNwRSxJQUFqQjtBQUNBMEUsTUFBQUEsbUJBQW1CLENBQUM3TixXQUFwQixDQUFnQyxtQkFBaEM7QUFDSCxLQW5Dc0MsQ0FxQ3ZDOzs7QUFDQSxRQUFJeU4scUJBQXFCLElBQUksQ0FBQ0gsY0FBYyxDQUFDNUIsTUFBZixDQUFzQixTQUF0QixFQUFpQzlKLEVBQWpDLENBQW9DLFVBQXBDLENBQTlCLEVBQStFO0FBQzNFMEwsTUFBQUEsY0FBYyxDQUFDdE4sV0FBZixDQUEyQixRQUEzQjtBQUNBeU4sTUFBQUEscUJBQXFCLENBQUNoUSxRQUF0QixDQUErQixRQUEvQjtBQUNIO0FBQ0osR0F2b0N3Qjs7QUF5b0N6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJd04sRUFBQUEsMEJBN29DeUIsc0NBNm9DRWpLLFFBN29DRixFQTZvQ1k7QUFDakM7QUFDQSxRQUFJLENBQUMzRSxvQkFBb0IsQ0FBQ2Usa0JBQTFCLEVBQThDO0FBQzFDZixNQUFBQSxvQkFBb0IsQ0FBQ1UsT0FBckIsQ0FBNkJVLFFBQTdCLENBQXNDLFFBQXRDO0FBQ0g7O0FBRUQsUUFBSTtBQUNBO0FBQ0EwQixNQUFBQSxTQUFTLENBQUMyTyxlQUFWLENBQTBCOU0sUUFBMUIsRUFBb0MsVUFBQ3NILFFBQUQsRUFBYztBQUM5QyxZQUFJQSxRQUFRLElBQUlBLFFBQVEsQ0FBQ2dDLE1BQXJCLElBQStCaEMsUUFBUSxDQUFDdkksSUFBeEMsSUFBZ0R1SSxRQUFRLENBQUN2SSxJQUFULENBQWNnTyxVQUFsRSxFQUE4RTtBQUMxRTtBQUNBMVIsVUFBQUEsb0JBQW9CLENBQUMyUixvQkFBckIsQ0FBMEMxRixRQUFRLENBQUN2SSxJQUFuRDtBQUNILFNBSEQsTUFHTztBQUNIO0FBQ0ExRCxVQUFBQSxvQkFBb0IsQ0FBQzJSLG9CQUFyQixDQUEwQyxJQUExQztBQUNIO0FBQ0osT0FSRDtBQVNILEtBWEQsQ0FXRSxPQUFPdkssS0FBUCxFQUFjO0FBQ1pELE1BQUFBLE9BQU8sQ0FBQ0MsS0FBUixDQUFjLDRCQUFkLEVBQTRDQSxLQUE1QyxFQURZLENBRVo7O0FBQ0FwSCxNQUFBQSxvQkFBb0IsQ0FBQzJSLG9CQUFyQixDQUEwQyxJQUExQztBQUNIO0FBQ0osR0FucUN3Qjs7QUFxcUN6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQSxFQUFBQSxvQkF6cUN5QixnQ0F5cUNKQyxhQXpxQ0ksRUF5cUNXO0FBQ2hDO0FBQ0EsUUFBTUMsaUJBQWlCLEdBQUdELGFBQWEsSUFDbkNBLGFBQWEsQ0FBQ0YsVUFEUSxJQUV0QixPQUFPRSxhQUFhLENBQUNGLFVBQWQsQ0FBeUIzTixLQUFoQyxLQUEwQyxRQUZwQixJQUd0QixPQUFPNk4sYUFBYSxDQUFDRixVQUFkLENBQXlCN04sR0FBaEMsS0FBd0MsUUFINUMsQ0FGZ0MsQ0FPaEM7O0FBQ0EsUUFBTWlPLHFCQUFxQixHQUFHRCxpQkFBaUIsSUFDMUNELGFBQWEsQ0FBQ0YsVUFBZCxDQUF5QjdOLEdBQXpCLEdBQStCK04sYUFBYSxDQUFDRixVQUFkLENBQXlCM04sS0FBekQsR0FBa0UsQ0FEdEU7O0FBR0EsUUFBSThOLGlCQUFpQixJQUFJQyxxQkFBekIsRUFBZ0Q7QUFDNUM7QUFDQSxXQUFLalIsaUJBQUwsR0FBeUIsSUFBekI7QUFDQSxXQUFLQyxnQkFBTCxHQUF3QjhRLGFBQWEsQ0FBQ0YsVUFBdEMsQ0FINEMsQ0FLNUM7O0FBQ0EsVUFBTVYsV0FBVyxHQUFHLEtBQUtsUSxnQkFBTCxDQUFzQitDLEdBQXRCLEdBQTRCLEtBQUsvQyxnQkFBTCxDQUFzQmlELEtBQXRFO0FBQ0EsV0FBS2dOLDZCQUFMLENBQW1DQyxXQUFuQyxFQVA0QyxDQVM1Qzs7QUFDQTlRLE1BQUFBLENBQUMsQ0FBQyxpQkFBRCxDQUFELENBQXFCNE0sSUFBckIsR0FWNEMsQ0FZNUM7O0FBQ0EsVUFBSThFLGFBQWEsQ0FBQ0csc0JBQWQsS0FBeUMxSSxTQUE3QyxFQUF3RDtBQUNwRG5GLFFBQUFBLFdBQVcsQ0FBQzhOLG9CQUFaLEdBQW1DSixhQUFhLENBQUNHLHNCQUFqRDtBQUNILE9BZjJDLENBaUI1Qzs7O0FBQ0E3TixNQUFBQSxXQUFXLENBQUMvQyxVQUFaLENBQXVCLHdCQUF2QixFQUFpRCxLQUFLTCxnQkFBdEQsRUFsQjRDLENBb0I1QztBQUNBO0FBQ0E7O0FBQ0FvRCxNQUFBQSxXQUFXLENBQUMrTixhQUFaLEdBQTRCLFVBQUNsTyxLQUFELEVBQVFGLEdBQVIsRUFBYXFPLGFBQWIsRUFBK0I7QUFDdkRsUyxRQUFBQSxvQkFBb0IsQ0FBQ29FLGtCQUFyQixDQUF3Q0wsS0FBeEMsRUFBK0NGLEdBQS9DLEVBQW9ELElBQXBEO0FBQ0gsT0FGRCxDQXZCNEMsQ0EyQjVDO0FBQ0E7QUFDQTs7O0FBQ0FLLE1BQUFBLFdBQVcsQ0FBQ2lPLG9CQUFaLEdBQW1DLFVBQUNwTyxLQUFELEVBQVFGLEdBQVIsRUFBYXVPLFVBQWIsRUFBNEI7QUFDM0RwUyxRQUFBQSxvQkFBb0IsQ0FBQ29FLGtCQUFyQixDQUF3Q0wsS0FBeEMsRUFBK0NGLEdBQS9DLEVBQW9EdU8sVUFBcEQ7QUFDSCxPQUZELENBOUI0QyxDQWtDNUM7QUFDQTtBQUNBOzs7QUFDQSxVQUFNQyxhQUFhLEdBQUduUyxDQUFDLENBQUMsNEJBQUQsQ0FBdkI7QUFDQSxVQUFNb1MsYUFBYSxHQUFHRCxhQUFhLENBQUMxTSxNQUFkLEdBQXVCLENBQXZCLEdBQ2hCNEwsUUFBUSxDQUFDYyxhQUFhLENBQUMzTyxJQUFkLENBQW1CLFFBQW5CLENBQUQsRUFBK0IsRUFBL0IsQ0FEUSxHQUVoQk0sSUFBSSxDQUFDdU8sR0FBTCxDQUFTLElBQVQsRUFBZXZCLFdBQWYsQ0FGTjtBQUdBLFVBQU13QixZQUFZLEdBQUd4TyxJQUFJLENBQUNDLEdBQUwsQ0FBUyxLQUFLbkQsZ0JBQUwsQ0FBc0IrQyxHQUF0QixHQUE0QnlPLGFBQXJDLEVBQW9ELEtBQUt4UixnQkFBTCxDQUFzQmlELEtBQTFFLENBQXJCO0FBQ0EsV0FBS0ssa0JBQUwsQ0FBd0JvTyxZQUF4QixFQUFzQyxLQUFLMVIsZ0JBQUwsQ0FBc0IrQyxHQUE1RCxFQUFpRSxJQUFqRSxFQUF1RSxJQUF2RTtBQUNILEtBM0NELE1BMkNPO0FBQ0g7QUFDQSxXQUFLaEQsaUJBQUwsR0FBeUIsS0FBekI7QUFDQSxXQUFLQyxnQkFBTCxHQUF3QixJQUF4QixDQUhHLENBS0g7O0FBQ0FaLE1BQUFBLENBQUMsQ0FBQyxpQkFBRCxDQUFELENBQXFCbUIsSUFBckIsR0FORyxDQVFIO0FBQ0E7O0FBQ0EsVUFBTW9SLFNBQVMsR0FBRztBQUFFMU8sUUFBQUEsS0FBSyxFQUFFLENBQVQ7QUFBWUYsUUFBQUEsR0FBRyxFQUFFO0FBQWpCLE9BQWxCO0FBQ0FLLE1BQUFBLFdBQVcsQ0FBQy9DLFVBQVosQ0FBdUIsd0JBQXZCLEVBQWlEc1IsU0FBakQsRUFBNEQsT0FBNUQsRUFYRyxDQWFIOztBQUNBdk8sTUFBQUEsV0FBVyxDQUFDK04sYUFBWixHQUE0QixVQUFDbE8sS0FBRCxFQUFRRixHQUFSLEVBQWdCO0FBQ3hDO0FBQ0E3RCxRQUFBQSxvQkFBb0IsQ0FBQzBTLGNBQXJCLENBQW9DMU8sSUFBSSxDQUFDMk8sS0FBTCxDQUFXNU8sS0FBWCxDQUFwQyxFQUF1REMsSUFBSSxDQUFDNE8sSUFBTCxDQUFVL08sR0FBRyxHQUFHRSxLQUFoQixDQUF2RDtBQUNILE9BSEQsQ0FkRyxDQW1CSDs7O0FBQ0EsV0FBS1EsbUJBQUw7QUFDSDtBQUNKLEdBcnZDd0I7O0FBdXZDekI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJbU8sRUFBQUEsY0E1dkN5QiwwQkE0dkNWbkwsTUE1dkNVLEVBNHZDRnNMLEtBNXZDRSxFQTR2Q0s7QUFBQTs7QUFDMUI7QUFDQSxRQUFJLENBQUM3UyxvQkFBb0IsQ0FBQ2Usa0JBQTFCLEVBQThDO0FBQzFDZixNQUFBQSxvQkFBb0IsQ0FBQ1UsT0FBckIsQ0FBNkJVLFFBQTdCLENBQXNDLFFBQXRDO0FBQ0g7O0FBRUQsUUFBTTBSLE1BQU0sR0FBRztBQUNYbk8sTUFBQUEsUUFBUSxFQUFFLEtBQUtoRSxRQUFMLENBQWM4RCxJQUFkLENBQW1CLFdBQW5CLEVBQWdDLFVBQWhDLENBREM7QUFFWDRLLE1BQUFBLE1BQU0sRUFBRSxLQUFLMU8sUUFBTCxDQUFjOEQsSUFBZCxDQUFtQixXQUFuQixFQUFnQyxRQUFoQyxLQUE2QyxFQUYxQztBQUdYc08sTUFBQUEsUUFBUSxFQUFFLEtBQUtwUyxRQUFMLENBQWM4RCxJQUFkLENBQW1CLFdBQW5CLEVBQWdDLFVBQWhDLEtBQStDLEVBSDlDO0FBSVg4QyxNQUFBQSxNQUFNLEVBQUV2RCxJQUFJLENBQUNDLEdBQUwsQ0FBUyxDQUFULEVBQVlzRCxNQUFaLENBSkc7QUFLWHNMLE1BQUFBLEtBQUssRUFBRTdPLElBQUksQ0FBQ3VPLEdBQUwsQ0FBUyxJQUFULEVBQWV2TyxJQUFJLENBQUNDLEdBQUwsQ0FBUyxHQUFULEVBQWM0TyxLQUFkLENBQWY7QUFMSSxLQUFmO0FBUUEvUCxJQUFBQSxTQUFTLENBQUNrUSxjQUFWLENBQXlCRixNQUF6QixFQUFpQyxVQUFDN0csUUFBRCxFQUFjO0FBQzNDO0FBQ0EsVUFBSSxDQUFDak0sb0JBQW9CLENBQUNlLGtCQUExQixFQUE4QztBQUMxQ2YsUUFBQUEsb0JBQW9CLENBQUNVLE9BQXJCLENBQTZCaUQsV0FBN0IsQ0FBeUMsUUFBekM7QUFDSDs7QUFDRCxVQUFJc0ksUUFBUSxJQUFJQSxRQUFRLENBQUNnQyxNQUFyQixJQUErQmhDLFFBQVEsQ0FBQ3ZJLElBQXhDLElBQWdELGFBQWF1SSxRQUFRLENBQUN2SSxJQUExRSxFQUFnRjtBQUM1RTtBQUNBLFFBQUEsTUFBSSxDQUFDbkQsTUFBTCxDQUFZMFMsUUFBWixDQUFxQmhILFFBQVEsQ0FBQ3ZJLElBQVQsQ0FBY3dQLE9BQWQsSUFBeUIsRUFBOUMsRUFBa0QsQ0FBQyxDQUFuRCxFQUY0RSxDQUk1RTs7O0FBQ0EsUUFBQSxNQUFJLENBQUMzUyxNQUFMLENBQVk0UyxRQUFaLENBQXFCLENBQXJCOztBQUNBLFFBQUEsTUFBSSxDQUFDNVMsTUFBTCxDQUFZNlMsWUFBWixDQUF5QixDQUF6QixFQUE0QixJQUE1QixFQUFrQyxJQUFsQyxFQUF3QyxZQUFNLENBQUUsQ0FBaEQ7QUFDSDtBQUNKLEtBYkQ7QUFjSCxHQXh4Q3dCOztBQTB4Q3pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSWhQLEVBQUFBLGtCQWx5Q3lCLDhCQWt5Q05pUCxjQWx5Q00sRUFreUNVQyxZQWx5Q1YsRUFreUNxRjtBQUFBOztBQUFBLFFBQTdEQyxNQUE2RCx1RUFBcEQsS0FBb0Q7QUFBQSxRQUE3Q0MsYUFBNkMsdUVBQTdCLEtBQTZCO0FBQUEsUUFBdEJDLFlBQXNCLHVFQUFQLEtBQU87O0FBQzFHO0FBQ0EsUUFBSSxDQUFDelQsb0JBQW9CLENBQUNlLGtCQUExQixFQUE4QztBQUMxQ2YsTUFBQUEsb0JBQW9CLENBQUNVLE9BQXJCLENBQTZCVSxRQUE3QixDQUFzQyxRQUF0QztBQUNIOztBQUVELFFBQU0wUixNQUFNLEdBQUc7QUFDWG5PLE1BQUFBLFFBQVEsRUFBRSxLQUFLaEUsUUFBTCxDQUFjOEQsSUFBZCxDQUFtQixXQUFuQixFQUFnQyxVQUFoQyxDQURDO0FBRVg0SyxNQUFBQSxNQUFNLEVBQUUsS0FBSzFPLFFBQUwsQ0FBYzhELElBQWQsQ0FBbUIsV0FBbkIsRUFBZ0MsUUFBaEMsS0FBNkMsRUFGMUM7QUFHWHNPLE1BQUFBLFFBQVEsRUFBRSxLQUFLcFMsUUFBTCxDQUFjOEQsSUFBZCxDQUFtQixXQUFuQixFQUFnQyxVQUFoQyxLQUErQyxFQUg5QztBQUlYaVAsTUFBQUEsUUFBUSxFQUFFTCxjQUpDO0FBS1hNLE1BQUFBLE1BQU0sRUFBRUwsWUFMRztBQU1YVCxNQUFBQSxLQUFLLEVBQUUsSUFOSTtBQU1FO0FBQ2JVLE1BQUFBLE1BQU0sRUFBRUEsTUFQRyxDQU9JOztBQVBKLEtBQWY7O0FBVUEsUUFBSTtBQUNBelEsTUFBQUEsU0FBUyxDQUFDa1EsY0FBVixDQUF5QkYsTUFBekIsRUFBaUMsVUFBQzdHLFFBQUQsRUFBYztBQUMzQyxZQUFJQSxRQUFRLElBQUlBLFFBQVEsQ0FBQ2dDLE1BQXJCLElBQStCaEMsUUFBUSxDQUFDdkksSUFBeEMsSUFBZ0QsYUFBYXVJLFFBQVEsQ0FBQ3ZJLElBQTFFLEVBQWdGO0FBQzVFLGNBQU1rUSxVQUFVLEdBQUczSCxRQUFRLENBQUN2SSxJQUFULENBQWN3UCxPQUFkLElBQXlCLEVBQTVDOztBQUVBLGNBQUlPLFlBQVksSUFBSUcsVUFBVSxDQUFDak8sTUFBWCxHQUFvQixDQUF4QyxFQUEyQztBQUN2QztBQUNBLGdCQUFNa08sY0FBYyxHQUFHLE1BQUksQ0FBQ3RULE1BQUwsQ0FBWXVULFFBQVosRUFBdkI7O0FBQ0EsZ0JBQU1DLFFBQVEsR0FBRyxNQUFJLENBQUNDLFlBQUwsQ0FBa0JILGNBQWxCLEVBQWtDRCxVQUFsQyxDQUFqQjs7QUFFQSxnQkFBSUcsUUFBUSxDQUFDcE8sTUFBVCxHQUFrQixDQUF0QixFQUF5QjtBQUNyQjtBQUNBLGtCQUFNNkQsT0FBTyxHQUFHLE1BQUksQ0FBQ2pKLE1BQUwsQ0FBWWlKLE9BQTVCO0FBQ0Esa0JBQU15SyxPQUFPLEdBQUd6SyxPQUFPLENBQUMwSyxTQUFSLEVBQWhCO0FBQ0ExSyxjQUFBQSxPQUFPLENBQUMySyxNQUFSLENBQWU7QUFBRUMsZ0JBQUFBLEdBQUcsRUFBRUgsT0FBUDtBQUFnQkksZ0JBQUFBLE1BQU0sRUFBRTtBQUF4QixlQUFmLEVBQTRDLE9BQU9OLFFBQVEsQ0FBQ08sSUFBVCxDQUFjLElBQWQsQ0FBbkQsRUFKcUIsQ0FNckI7O0FBQ0Esa0JBQU1DLFFBQVEsR0FBRy9LLE9BQU8sQ0FBQzBLLFNBQVIsS0FBc0IsQ0FBdkM7QUFDQSxrQkFBTU0sV0FBVyxHQUFHaEwsT0FBTyxDQUFDaUwsT0FBUixDQUFnQkYsUUFBaEIsRUFBMEI1TyxNQUE5Qzs7QUFDQSxjQUFBLE1BQUksQ0FBQ3BGLE1BQUwsQ0FBWTRTLFFBQVosQ0FBcUJvQixRQUFRLEdBQUcsQ0FBaEMsRUFBbUNDLFdBQW5DO0FBQ0g7QUFDSixXQWhCRCxNQWdCTztBQUNIO0FBQ0EsWUFBQSxNQUFJLENBQUNqVSxNQUFMLENBQVkwUyxRQUFaLENBQXFCVyxVQUFyQixFQUFpQyxDQUFDLENBQWxDLEVBRkcsQ0FJSDs7O0FBQ0EsZ0JBQU1RLEdBQUcsR0FBRyxNQUFJLENBQUM3VCxNQUFMLENBQVlpSixPQUFaLENBQW9CMEssU0FBcEIsS0FBa0MsQ0FBOUM7O0FBQ0EsZ0JBQU1HLE1BQU0sR0FBRyxNQUFJLENBQUM5VCxNQUFMLENBQVlpSixPQUFaLENBQW9CaUwsT0FBcEIsQ0FBNEJMLEdBQTVCLEVBQWlDek8sTUFBaEQ7O0FBQ0EsWUFBQSxNQUFJLENBQUNwRixNQUFMLENBQVk0UyxRQUFaLENBQXFCaUIsR0FBRyxHQUFHLENBQTNCLEVBQThCQyxNQUE5QjtBQUNILFdBM0IyRSxDQTZCNUU7OztBQUNBLGNBQUlwSSxRQUFRLENBQUN2SSxJQUFULENBQWNnUixZQUFsQixFQUFnQztBQUM1QixnQkFBTUMsTUFBTSxHQUFHMUksUUFBUSxDQUFDdkksSUFBVCxDQUFjZ1IsWUFBN0IsQ0FENEIsQ0FHNUI7QUFDQTs7QUFDQSxnQkFBSUMsTUFBTSxDQUFDOVEsR0FBWCxFQUFnQjtBQUNaSyxjQUFBQSxXQUFXLENBQUMwUSxrQkFBWixDQUErQkQsTUFBTSxDQUFDOVEsR0FBdEMsRUFEWSxDQUVaOztBQUNBN0QsY0FBQUEsb0JBQW9CLENBQUNrQixnQkFBckIsR0FBd0N5VCxNQUFNLENBQUM5USxHQUEvQztBQUNILGFBVDJCLENBVzVCO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQUNBLGdCQUFJLENBQUM0UCxZQUFMLEVBQW1CO0FBQ2Z2UCxjQUFBQSxXQUFXLENBQUMyUSx3QkFBWixDQUFxQ0YsTUFBckMsRUFBNkN0QixjQUE3QyxFQUE2REMsWUFBN0QsRUFBMkVFLGFBQTNFO0FBQ0g7QUFDSjtBQUNKLFNBbkQwQyxDQXFEM0M7OztBQUNBLFlBQUksQ0FBQ3hULG9CQUFvQixDQUFDZSxrQkFBMUIsRUFBOEM7QUFDMUNmLFVBQUFBLG9CQUFvQixDQUFDVSxPQUFyQixDQUE2QmlELFdBQTdCLENBQXlDLFFBQXpDO0FBQ0g7QUFDSixPQXpERDtBQTBESCxLQTNERCxDQTJERSxPQUFPeUQsS0FBUCxFQUFjO0FBQ1pELE1BQUFBLE9BQU8sQ0FBQ0MsS0FBUixDQUFjLGtDQUFkLEVBQWtEQSxLQUFsRCxFQURZLENBRVo7O0FBQ0EsVUFBSSxDQUFDcEgsb0JBQW9CLENBQUNlLGtCQUExQixFQUE4QztBQUMxQ2YsUUFBQUEsb0JBQW9CLENBQUNVLE9BQXJCLENBQTZCaUQsV0FBN0IsQ0FBeUMsUUFBekM7QUFDSDtBQUNKO0FBQ0osR0FwM0N3Qjs7QUFzM0N6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxnQkExM0N5Qiw0QkEwM0NSa1IsYUExM0NRLEVBMDNDTztBQUM1QixRQUFJLENBQUMsS0FBS2hVLGdCQUFWLEVBQTRCO0FBQ3hCO0FBQ0gsS0FIMkIsQ0FLNUI7OztBQUNBb0QsSUFBQUEsV0FBVyxDQUFDNlEsV0FBWixDQUF3QkQsYUFBeEIsRUFONEIsQ0FPNUI7QUFDSCxHQWw0Q3dCOztBQW80Q3pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0l4USxFQUFBQSxtQkF4NEN5QiwrQkF3NENMRCxLQXg0Q0ssRUF3NENFO0FBQ3ZCLFFBQUkyUSxhQUFhLEdBQUcsRUFBcEIsQ0FEdUIsQ0FHdkI7O0FBQ0EsWUFBUTNRLEtBQVI7QUFDSSxXQUFLLE9BQUw7QUFDSTJRLFFBQUFBLGFBQWEsR0FBRyxzQkFBaEI7QUFDQTs7QUFDSixXQUFLLFNBQUw7QUFDSUEsUUFBQUEsYUFBYSxHQUFHLGNBQWhCO0FBQ0E7O0FBQ0osV0FBSyxNQUFMO0FBQ0lBLFFBQUFBLGFBQWEsR0FBRyxNQUFoQjtBQUNBOztBQUNKLFdBQUssT0FBTDtBQUNJQSxRQUFBQSxhQUFhLEdBQUcsT0FBaEI7QUFDQTs7QUFDSixXQUFLLEtBQUw7QUFDQTtBQUNJQSxRQUFBQSxhQUFhLEdBQUcsRUFBaEI7QUFDQTtBQWhCUixLQUp1QixDQXVCdkI7OztBQUNBLFNBQUtyVSxRQUFMLENBQWM4RCxJQUFkLENBQW1CLFdBQW5CLEVBQWdDLFFBQWhDLEVBQTBDdVEsYUFBMUMsRUF4QnVCLENBMEJ2Qjs7QUFDQSxTQUFLelEsbUJBQUw7QUFDSCxHQXA2Q3dCOztBQXM2Q3pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUEsRUFBQUEsbUJBMzZDeUIsaUNBMjZDa0I7QUFBQSxRQUF2QjBRLGFBQXVCLHVFQUFQLEtBQU87O0FBQ3ZDLFFBQUksS0FBS3BVLGlCQUFULEVBQTRCO0FBQ3hCO0FBQ0EsVUFBSSxLQUFLQyxnQkFBVCxFQUEyQjtBQUV2QjtBQUNBO0FBQ0E7QUFDQSxZQUFJbVUsYUFBYSxJQUFJL1EsV0FBVyxDQUFDZ1IsYUFBakMsRUFBZ0Q7QUFDNUMsZUFBSzlRLGtCQUFMLENBQ0lGLFdBQVcsQ0FBQ2dSLGFBQVosQ0FBMEJuUixLQUQ5QixFQUVJRyxXQUFXLENBQUNnUixhQUFaLENBQTBCclIsR0FGOUIsRUFHSSxJQUhKLEVBR1UsS0FIVixFQUdpQixLQUFLOUMsa0JBSHRCO0FBS0E7QUFDSDs7QUFFRCxZQUFNK0MsT0FBTyxHQUFHLElBQWhCLENBZHVCLENBZ0J2Qjs7QUFDQSxZQUFNYSxRQUFRLEdBQUcsS0FBS2hFLFFBQUwsQ0FBYzhELElBQWQsQ0FBbUIsV0FBbkIsRUFBZ0MsVUFBaEMsQ0FBakI7QUFDQSxZQUFNdUssU0FBUyxHQUFHLEtBQUtILGdCQUFMLENBQXNCbEssUUFBdEIsQ0FBbEI7QUFFQSxZQUFJMk8sWUFBSjtBQUNBLFlBQUlELGNBQUo7O0FBRUEsWUFBSXJFLFNBQUosRUFBZTtBQUNYO0FBQ0E7QUFDQXNFLFVBQUFBLFlBQVksR0FBRyxLQUFLeFMsZ0JBQUwsQ0FBc0IrQyxHQUFyQztBQUNBd1AsVUFBQUEsY0FBYyxHQUFHclAsSUFBSSxDQUFDQyxHQUFMLENBQVMsS0FBS25ELGdCQUFMLENBQXNCK0MsR0FBdEIsR0FBNEJDLE9BQXJDLEVBQThDLEtBQUtoRCxnQkFBTCxDQUFzQmlELEtBQXBFLENBQWpCO0FBQ0gsU0FMRCxNQUtPO0FBQ0g7QUFDQXVQLFVBQUFBLFlBQVksR0FBR3RQLElBQUksQ0FBQzJPLEtBQUwsQ0FBV3dDLElBQUksQ0FBQ0MsR0FBTCxLQUFhLElBQXhCLENBQWYsQ0FGRyxDQUlIO0FBQ0E7QUFDQTtBQUNBOztBQUNBLGNBQU1DLE9BQU8sR0FBRyxLQUFLblUsZ0JBQUwsSUFBeUIsS0FBS0osZ0JBQUwsQ0FBc0IrQyxHQUEvRDtBQUNBd1AsVUFBQUEsY0FBYyxHQUFHclAsSUFBSSxDQUFDQyxHQUFMLENBQVNvUixPQUFPLEdBQUd2UixPQUFuQixFQUE0QixLQUFLaEQsZ0JBQUwsQ0FBc0JpRCxLQUFsRCxDQUFqQixDQVRHLENBV0g7O0FBQ0EsZUFBS2pELGdCQUFMLENBQXNCK0MsR0FBdEIsR0FBNEJ5UCxZQUE1QixDQVpHLENBY0g7QUFDQTtBQUNBOztBQUNBcFAsVUFBQUEsV0FBVyxDQUFDb1IsV0FBWixDQUF3QmhDLFlBQXhCLEVBQXNDLElBQXRDO0FBQ0gsU0E5Q3NCLENBZ0R2QjtBQUNBOzs7QUFDQSxhQUFLbFAsa0JBQUwsQ0FBd0JpUCxjQUF4QixFQUF3Q0MsWUFBeEMsRUFBc0QsSUFBdEQsRUFBNEQsS0FBNUQsRUFBbUUsS0FBS3ZTLGtCQUF4RTtBQUNIO0FBQ0osS0F0REQsTUFzRE87QUFDSDtBQUNBLFVBQU0rUixNQUFNLEdBQUc5UyxvQkFBb0IsQ0FBQ1csUUFBckIsQ0FBOEI4RCxJQUE5QixDQUFtQyxZQUFuQyxDQUFmO0FBQ0FxTyxNQUFBQSxNQUFNLENBQUNELEtBQVAsR0FBZSxJQUFmLENBSEcsQ0FHa0I7O0FBQ3JCL1AsTUFBQUEsU0FBUyxDQUFDa1EsY0FBVixDQUF5QkYsTUFBekIsRUFBaUM5UyxvQkFBb0IsQ0FBQ3VWLGVBQXREO0FBQ0g7QUFDSixHQXgrQ3dCOztBQTArQ3pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0l2QixFQUFBQSxZQWovQ3lCLHdCQWkvQ1pILGNBai9DWSxFQWkvQ0lELFVBai9DSixFQWkvQ2dCO0FBQ3JDLFFBQUksQ0FBQ0MsY0FBRCxJQUFtQkEsY0FBYyxDQUFDOU4sSUFBZixHQUFzQkosTUFBdEIsS0FBaUMsQ0FBeEQsRUFBMkQ7QUFDdkQ7QUFDQSxhQUFPaU8sVUFBVSxDQUFDakosS0FBWCxDQUFpQixJQUFqQixFQUF1QjBFLE1BQXZCLENBQThCLFVBQUFtRyxJQUFJO0FBQUEsZUFBSUEsSUFBSSxDQUFDelAsSUFBTCxHQUFZSixNQUFaLEdBQXFCLENBQXpCO0FBQUEsT0FBbEMsQ0FBUDtBQUNIOztBQUVELFFBQU04UCxZQUFZLEdBQUc1QixjQUFjLENBQUNsSixLQUFmLENBQXFCLElBQXJCLENBQXJCO0FBQ0EsUUFBTW9KLFFBQVEsR0FBR0gsVUFBVSxDQUFDakosS0FBWCxDQUFpQixJQUFqQixDQUFqQixDQVBxQyxDQVNyQzs7QUFDQSxRQUFJK0ssVUFBVSxHQUFHLEVBQWpCOztBQUNBLFNBQUssSUFBSUMsQ0FBQyxHQUFHRixZQUFZLENBQUM5UCxNQUFiLEdBQXNCLENBQW5DLEVBQXNDZ1EsQ0FBQyxJQUFJLENBQTNDLEVBQThDQSxDQUFDLEVBQS9DLEVBQW1EO0FBQy9DLFVBQUlGLFlBQVksQ0FBQ0UsQ0FBRCxDQUFaLENBQWdCNVAsSUFBaEIsR0FBdUJKLE1BQXZCLEdBQWdDLENBQXBDLEVBQXVDO0FBQ25DK1AsUUFBQUEsVUFBVSxHQUFHRCxZQUFZLENBQUNFLENBQUQsQ0FBekI7QUFDQTtBQUNIO0FBQ0o7O0FBRUQsUUFBSSxDQUFDRCxVQUFMLEVBQWlCO0FBQ2IsYUFBTzNCLFFBQVEsQ0FBQzFFLE1BQVQsQ0FBZ0IsVUFBQW1HLElBQUk7QUFBQSxlQUFJQSxJQUFJLENBQUN6UCxJQUFMLEdBQVlKLE1BQVosR0FBcUIsQ0FBekI7QUFBQSxPQUFwQixDQUFQO0FBQ0gsS0FwQm9DLENBc0JyQzs7O0FBQ0EsUUFBSWlRLFdBQVcsR0FBRyxDQUFDLENBQW5COztBQUNBLFNBQUssSUFBSUQsR0FBQyxHQUFHNUIsUUFBUSxDQUFDcE8sTUFBVCxHQUFrQixDQUEvQixFQUFrQ2dRLEdBQUMsSUFBSSxDQUF2QyxFQUEwQ0EsR0FBQyxFQUEzQyxFQUErQztBQUMzQyxVQUFJNUIsUUFBUSxDQUFDNEIsR0FBRCxDQUFSLEtBQWdCRCxVQUFwQixFQUFnQztBQUM1QkUsUUFBQUEsV0FBVyxHQUFHRCxHQUFkO0FBQ0E7QUFDSDtBQUNKOztBQUVELFFBQUlDLFdBQVcsS0FBSyxDQUFDLENBQXJCLEVBQXdCO0FBQ3BCO0FBQ0E7QUFDQSxhQUFPLEVBQVA7QUFDSCxLQW5Db0MsQ0FxQ3JDOzs7QUFDQSxRQUFNM0gsTUFBTSxHQUFHOEYsUUFBUSxDQUFDOEIsS0FBVCxDQUFlRCxXQUFXLEdBQUcsQ0FBN0IsRUFBZ0N2RyxNQUFoQyxDQUF1QyxVQUFBbUcsSUFBSTtBQUFBLGFBQUlBLElBQUksQ0FBQ3pQLElBQUwsR0FBWUosTUFBWixHQUFxQixDQUF6QjtBQUFBLEtBQTNDLENBQWY7QUFDQSxXQUFPc0ksTUFBUDtBQUNILEdBemhEd0I7O0FBMmhEekI7QUFDSjtBQUNBO0FBQ0E7QUFDSXNILEVBQUFBLGVBL2hEeUIsMkJBK2hEVHRKLFFBL2hEUyxFQStoREM7QUFBQTs7QUFDdEI7QUFDQSxRQUFJLENBQUNqTSxvQkFBb0IsQ0FBQ2Usa0JBQTFCLEVBQThDO0FBQzFDZixNQUFBQSxvQkFBb0IsQ0FBQ1UsT0FBckIsQ0FBNkJpRCxXQUE3QixDQUF5QyxRQUF6QztBQUNILEtBSnFCLENBTXRCOzs7QUFDQSxRQUFJLENBQUNzSSxRQUFELElBQWEsQ0FBQ0EsUUFBUSxDQUFDZ0MsTUFBM0IsRUFBbUM7QUFDL0IsVUFBSWhDLFFBQVEsSUFBSUEsUUFBUSxDQUFDNkosUUFBekIsRUFBbUM7QUFDL0JDLFFBQUFBLFdBQVcsQ0FBQ0MsZUFBWixDQUE0Qi9KLFFBQVEsQ0FBQzZKLFFBQXJDO0FBQ0g7O0FBQ0Q7QUFDSDs7QUFFRCxRQUFNNUMsT0FBTyxHQUFHLG1CQUFBakgsUUFBUSxDQUFDdkksSUFBVCxrRUFBZXdQLE9BQWYsS0FBMEIsRUFBMUM7QUFDQWxULElBQUFBLG9CQUFvQixDQUFDTyxNQUFyQixDQUE0QjBWLFVBQTVCLEdBQXlDaEQsUUFBekMsQ0FBa0RDLE9BQWxEO0FBQ0EsUUFBTWtCLEdBQUcsR0FBR3BVLG9CQUFvQixDQUFDTyxNQUFyQixDQUE0QmlKLE9BQTVCLENBQW9DMEssU0FBcEMsS0FBa0QsQ0FBOUQ7QUFDQSxRQUFNRyxNQUFNLEdBQUdyVSxvQkFBb0IsQ0FBQ08sTUFBckIsQ0FBNEJpSixPQUE1QixDQUFvQ2lMLE9BQXBDLENBQTRDTCxHQUE1QyxFQUFpRHpPLE1BQWhFO0FBQ0EzRixJQUFBQSxvQkFBb0IsQ0FBQ08sTUFBckIsQ0FBNEI0UyxRQUE1QixDQUFxQ2lCLEdBQUcsR0FBRyxDQUEzQyxFQUE4Q0MsTUFBOUM7QUFDSCxHQWxqRHdCOztBQW9qRHpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0l6UCxFQUFBQSxjQXhqRHlCLDBCQXdqRFZxSCxRQXhqRFUsRUF3akRBO0FBQ3JCO0FBQ0EsUUFBSUEsUUFBUSxJQUFJQSxRQUFRLENBQUNnQyxNQUFyQixJQUErQmhDLFFBQVEsQ0FBQ3ZJLElBQTVDLEVBQWtEO0FBQzlDaEMsTUFBQUEsTUFBTSxDQUFDZ00sUUFBUCxHQUFrQnpCLFFBQVEsQ0FBQ3ZJLElBQVQsQ0FBY2lCLFFBQWQsSUFBMEJzSCxRQUFRLENBQUN2SSxJQUFyRDtBQUNILEtBRkQsTUFFTyxJQUFJdUksUUFBUSxJQUFJQSxRQUFRLENBQUM2SixRQUF6QixFQUFtQztBQUN0Q0MsTUFBQUEsV0FBVyxDQUFDQyxlQUFaLENBQTRCL0osUUFBUSxDQUFDNkosUUFBckM7QUFDSDtBQUNKLEdBL2pEd0I7O0FBaWtEekI7QUFDSjtBQUNBO0FBQ0kzUSxFQUFBQSx1QkFwa0R5QixxQ0Fva0RBO0FBQ3JCLFFBQU1nSixRQUFRLEdBQUduTyxvQkFBb0IsQ0FBQ1csUUFBckIsQ0FBOEI4RCxJQUE5QixDQUFtQyxXQUFuQyxFQUFnRCxVQUFoRCxDQUFqQjs7QUFDQSxRQUFJMEosUUFBUSxDQUFDeEksTUFBVCxHQUFnQixDQUFwQixFQUFzQjtBQUNsQjdDLE1BQUFBLFNBQVMsQ0FBQ29ULFNBQVYsQ0FBb0IvSCxRQUFwQixFQUE4Qm5PLG9CQUFvQixDQUFDbVcsaUJBQW5EO0FBQ0g7QUFDSixHQXprRHdCOztBQTJrRHpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lBLEVBQUFBLGlCQS9rRHlCLDZCQStrRFBsSyxRQS9rRE8sRUEra0RFO0FBQ3ZCLFFBQUlBLFFBQVEsQ0FBQ2dDLE1BQVQsS0FBa0IsS0FBbEIsSUFBMkJoQyxRQUFRLENBQUM2SixRQUFULEtBQXNCek0sU0FBckQsRUFBZ0U7QUFDNUQwTSxNQUFBQSxXQUFXLENBQUNDLGVBQVosQ0FBNEIvSixRQUFRLENBQUM2SixRQUFyQztBQUNILEtBRkQsTUFFTztBQUNIOVYsTUFBQUEsb0JBQW9CLENBQUN1RSxtQkFBckI7QUFDSDtBQUNKO0FBcmxEd0IsQ0FBN0IsQyxDQXdsREE7O0FBQ0FyRSxDQUFDLENBQUNpRCxRQUFELENBQUQsQ0FBWWlULEtBQVosQ0FBa0IsWUFBTTtBQUNwQnBXLEVBQUFBLG9CQUFvQixDQUFDbUIsVUFBckI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cbi8qIGdsb2JhbCBhY2UsIFBieEFwaSwgU3lzbG9nQVBJLCB1cGRhdGVMb2dWaWV3V29ya2VyLCBBY2UsIFVzZXJNZXNzYWdlLCBTVkdUaW1lbGluZSAqL1xuXG4vKipcbiAqIFJlcHJlc2VudHMgdGhlIHN5c3RlbSBkaWFnbm9zdGljIGxvZ3Mgb2JqZWN0LlxuICpcbiAqIEBtb2R1bGUgc3lzdGVtRGlhZ25vc3RpY0xvZ3NcbiAqL1xuY29uc3Qgc3lzdGVtRGlhZ25vc3RpY0xvZ3MgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIFwiU2hvdyBMYXN0IExvZ1wiIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzaG93QnRuOiAkKCcjc2hvdy1sYXN0LWxvZycpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIFwiRG93bmxvYWQgRmlsZVwiIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkb3dubG9hZEJ0bjogJCgnI2Rvd25sb2FkLWZpbGUnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBcIlNob3cgTGFzdCBMb2cgKEF1dG8pXCIgYnV0dG9uLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNob3dBdXRvQnRuOiAkKCcjc2hvdy1sYXN0LWxvZy1hdXRvJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgXCJFcmFzZSBjdXJyZW50IGZpbGUgY29udGVudFwiIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRlcmFzZUJ0bjogJCgnI2VyYXNlLWZpbGUnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBsb2cgY29udGVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRsb2dDb250ZW50OiAkKCcjbG9nLWNvbnRlbnQtcmVhZG9ubHknKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSB2aWV3ZXIgZm9yIGRpc3BsYXlpbmcgdGhlIGxvZyBjb250ZW50LlxuICAgICAqIEB0eXBlIHtBY2V9XG4gICAgICovXG4gICAgdmlld2VyOiAnJyxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmaWxlIHNlbGVjdCBkcm9wZG93bi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmaWxlU2VsZWN0RHJvcERvd246IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBBcnJheSBvZiBsb2cgaXRlbXMuXG4gICAgICogQHR5cGUge0FycmF5fVxuICAgICAqL1xuICAgIGxvZ3NJdGVtczogW10sXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZGltbWVyLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRpbW1lcjogJCgnI2dldC1sb2dzLWRpbW1lcicpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI3N5c3RlbS1kaWFnbm9zdGljLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIEZsYWcgdG8gcHJldmVudCBkdXBsaWNhdGUgQVBJIGNhbGxzIGR1cmluZyBpbml0aWFsaXphdGlvblxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGlzSW5pdGlhbGl6aW5nOiB0cnVlLFxuXG4gICAgLyoqXG4gICAgICogRmxhZyBpbmRpY2F0aW5nIGlmIHRpbWUgc2xpZGVyIG1vZGUgaXMgZW5hYmxlZFxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIHRpbWVTbGlkZXJFbmFibGVkOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIEN1cnJlbnQgdGltZSByYW5nZSBmb3IgdGhlIHNlbGVjdGVkIGxvZyBmaWxlXG4gICAgICogQHR5cGUge29iamVjdHxudWxsfVxuICAgICAqL1xuICAgIGN1cnJlbnRUaW1lUmFuZ2U6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBGbGFnIGluZGljYXRpbmcgaWYgYXV0by11cGRhdGUgbW9kZSBpcyBhY3RpdmVcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBpc0F1dG9VcGRhdGVBY3RpdmU6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogQXJyYXkgb2YgY2FzY2FkaW5nIGZpbHRlciBjb25kaXRpb25zIFt7dHlwZTogJ2NvbnRhaW5zJ3wnbm90Q29udGFpbnMnLCB2YWx1ZTogc3RyaW5nfV1cbiAgICAgKiBAdHlwZSB7QXJyYXl9XG4gICAgICovXG4gICAgZmlsdGVyQ29uZGl0aW9uczogW10sXG5cbiAgICAvKipcbiAgICAgKiBQZW5kaW5nIGZpbHRlciB0ZXh0IHdhaXRpbmcgZm9yIHR5cGUgc2VsZWN0aW9uIGluIHBvcHVwXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBwZW5kaW5nRmlsdGVyVGV4dDogJycsXG5cbiAgICAvKipcbiAgICAgKiBMYXN0IGtub3duIGFjdHVhbCBkYXRhIGVuZCB0aW1lc3RhbXAgZnJvbSBBUEkgcmVzcG9uc2UuXG4gICAgICogVXNlZCB0byBhbmNob3IgcmVmcmVzaCB0aW1lIHJhbmdlIHRvIHJlYWwgZGF0YSBpbnN0ZWFkIG9mIHdhbGwgY2xvY2sgdGltZS5cbiAgICAgKiBXSFk6IElmIGEgbG9nIGZpbGUgaGFzbid0IGJlZW4gd3JpdHRlbiB0byByZWNlbnRseSAoZS5nLiwgaWRsZSBtb2R1bGUgbG9nKSxcbiAgICAgKiB1c2luZyBcIm5vdyAtIHBlcmlvZFwiIGFzIHN0YXJ0VGltZXN0YW1wIHByb2R1Y2VzIGFuIGVtcHR5IHJhbmdlIHdpdGggbm8gZGF0YS5cbiAgICAgKiBAdHlwZSB7bnVtYmVyfG51bGx9XG4gICAgICovXG4gICAgbGFzdEtub3duRGF0YUVuZDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBzeXN0ZW0gZGlhZ25vc3RpYyBsb2dzLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEVuc3VyZSBmaWx0ZXIgdHlwZSBwb3B1cCBzdGFydHMgaGlkZGVuIHdpdGggY2xlYW4gc3R5bGVzXG4gICAgICAgICQoJyNmaWx0ZXItdHlwZS1wb3B1cCcpLmFkZENsYXNzKCdoaWRkZW4nKS5oaWRlKCkuY3NzKHt0b3A6ICcnLCBsZWZ0OiAnJ30pO1xuXG4gICAgICAgIGNvbnN0IGFjZUhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCAtIDI1MDtcblxuICAgICAgICAvLyBTZXQgdGhlIG1pbmltdW0gaGVpZ2h0IG9mIHRoZSBsb2cgY29udGFpbmVyXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIuY2xvc2VzdCgnZGl2JykuY3NzKCdtaW4taGVpZ2h0JywgYCR7YWNlSGVpZ2h0fXB4YCk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIGRyb3Bkb3duIFVJIGZyb20gaGlkZGVuIGlucHV0IChWNS4wIHBhdHRlcm4pXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmNyZWF0ZURyb3Bkb3duRnJvbUhpZGRlbklucHV0KCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZHJvcGRvd24gbWVudSBmb3IgbG9nIGZpbGVzIHdpdGggdHJlZSBzdXBwb3J0XG4gICAgICAgIC8vIEluaXRpYWxpemUgU2VtYW50aWMgVUkgZHJvcGRvd24gd2l0aCBjdXN0b20gbWVudSBnZW5lcmF0aW9uXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jYk9uQ2hhbmdlRmlsZSxcbiAgICAgICAgICAgICAgICBpZ25vcmVDYXNlOiB0cnVlLFxuICAgICAgICAgICAgICAgIGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuICAgICAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBwcmVzZXJ2ZUhUTUw6IHRydWUsXG4gICAgICAgICAgICAgICAgYWxsb3dDYXRlZ29yeVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICAgICAgbWF0Y2g6ICd0ZXh0JyxcbiAgICAgICAgICAgICAgICBmaWx0ZXJSZW1vdGVEYXRhOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBhY3Rpb246ICdhY3RpdmF0ZScsXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgICAgIG1lbnU6IHN5c3RlbURpYWdub3N0aWNMb2dzLmN1c3RvbURyb3Bkb3duTWVudVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb2xkZXIgY29sbGFwc2UvZXhwYW5kIGhhbmRsZXJzICh1c2VzIGV2ZW50IGRlbGVnYXRpb24pXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmluaXRpYWxpemVGb2xkZXJIYW5kbGVycygpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIEFDRSBlZGl0b3IgZm9yIGxvZyBjb250ZW50XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmluaXRpYWxpemVBY2UoKTtcblxuICAgICAgICAvLyBGZXRjaCB0aGUgbGlzdCBvZiBsb2cgZmlsZXNcbiAgICAgICAgU3lzbG9nQVBJLmdldExvZ3NMaXN0KHN5c3RlbURpYWdub3N0aWNMb2dzLmNiRm9ybWF0RHJvcGRvd25SZXN1bHRzKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGxvZyBsZXZlbCBkcm9wZG93biAtIFY1LjAgcGF0dGVybiB3aXRoIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaW5pdGlhbGl6ZUxvZ0xldmVsRHJvcGRvd24oKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGZpbHRlciBjb25kaXRpb25zIGZyb20gVVJMIHBhcmFtZXRlciAoZS5nLiBDRFIgbGlua3Mgd2l0aCA/ZmlsdGVyPS4uLilcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaW5pdGlhbGl6ZUZpbHRlckZyb21VcmwoKTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgcXVpY2sgcGVyaW9kIGJ1dHRvbnNcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJy5wZXJpb2QtYnRuJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0ICRidG4gPSAkKGUuY3VycmVudFRhcmdldCk7XG4gICAgICAgICAgICBjb25zdCBwZXJpb2QgPSAkYnRuLmRhdGEoJ3BlcmlvZCcpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgYWN0aXZlIHN0YXRlXG4gICAgICAgICAgICAkKCcucGVyaW9kLWJ0bicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgICRidG4uYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuXG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5hcHBseVF1aWNrUGVyaW9kKHBlcmlvZCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciBcIk5vd1wiIGJ1dHRvblxuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnLm5vdy1idG4nLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgaWYgKHN5c3RlbURpYWdub3N0aWNMb2dzLmN1cnJlbnRUaW1lUmFuZ2UpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBlbmQgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jdXJyZW50VGltZVJhbmdlLmVuZDtcbiAgICAgICAgICAgICAgICBjb25zdCBvbmVIb3VyID0gMzYwMDtcbiAgICAgICAgICAgICAgICBjb25zdCBzdGFydCA9IE1hdGgubWF4KGVuZCAtIG9uZUhvdXIsIHN5c3RlbURpYWdub3N0aWNMb2dzLmN1cnJlbnRUaW1lUmFuZ2Uuc3RhcnQpO1xuICAgICAgICAgICAgICAgIFNWR1RpbWVsaW5lLnNldFJhbmdlKHN0YXJ0LCBlbmQpO1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmxvYWRMb2dCeVRpbWVSYW5nZShzdGFydCwgZW5kKTtcbiAgICAgICAgICAgICAgICAkKCcucGVyaW9kLWJ0bicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgICAgICAkKCcucGVyaW9kLWJ0bltkYXRhLXBlcmlvZD1cIjM2MDBcIl0nKS5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciBsb2cgbGV2ZWwgZmlsdGVyIGJ1dHRvbnNcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJy5sZXZlbC1idG4nLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgJGJ0biA9ICQoZS5jdXJyZW50VGFyZ2V0KTtcbiAgICAgICAgICAgIGNvbnN0IGxldmVsID0gJGJ0bi5kYXRhKCdsZXZlbCcpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgYWN0aXZlIHN0YXRlXG4gICAgICAgICAgICAkKCcubGV2ZWwtYnRuJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgJGJ0bi5hZGRDbGFzcygnYWN0aXZlJyk7XG5cbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmFwcGx5TG9nTGV2ZWxGaWx0ZXIobGV2ZWwpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgXCJTaG93IExvZ1wiIGJ1dHRvbiBjbGljayAoZGVsZWdhdGVkKVxuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnI3Nob3ctbGFzdC1sb2cnLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudXBkYXRlTG9nRnJvbVNlcnZlcigpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBMaXN0ZW4gZm9yIGhhc2ggY2hhbmdlcyB0byB1cGRhdGUgc2VsZWN0ZWQgZmlsZVxuICAgICAgICAkKHdpbmRvdykub24oJ2hhc2hjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5oYW5kbGVIYXNoQ2hhbmdlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciBcIkRvd25sb2FkIExvZ1wiIGJ1dHRvbiBjbGljayAoZGVsZWdhdGVkKVxuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnI2Rvd25sb2FkLWZpbGUnLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgICAgIFN5c2xvZ0FQSS5kb3dubG9hZExvZ0ZpbGUoZGF0YS5maWxlbmFtZSwgdHJ1ZSwgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY2JEb3dubG9hZEZpbGUpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgXCJBdXRvIFJlZnJlc2hcIiBidXR0b24gY2xpY2sgKGRlbGVnYXRlZClcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJyNzaG93LWxhc3QtbG9nLWF1dG8nLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQoJyNzaG93LWxhc3QtbG9nLWF1dG8nKTtcbiAgICAgICAgICAgIGNvbnN0ICRyZWxvYWRJY29uID0gJGJ1dHRvbi5maW5kKCcuaWNvbnMgaS5yZWZyZXNoJyk7XG4gICAgICAgICAgICBpZiAoJHJlbG9hZEljb24uaGFzQ2xhc3MoJ2xvYWRpbmcnKSkge1xuICAgICAgICAgICAgICAgICRyZWxvYWRJY29uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdXBkYXRlTG9nVmlld1dvcmtlci5zdG9wKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRyZWxvYWRJY29uLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB1cGRhdGVMb2dWaWV3V29ya2VyLmluaXRpYWxpemUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIHRoZSBcIkVyYXNlIGZpbGVcIiBidXR0b24gY2xpY2sgKGRlbGVnYXRlZClcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJyNlcmFzZS1maWxlJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmVyYXNlQ3VycmVudEZpbGVDb250ZW50KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciBFbnRlciBrZXlwcmVzcyBvbiBmaWx0ZXIgaW5wdXQg4oCUIHNob3cgdHlwZSBwb3B1cFxuICAgICAgICAkKGRvY3VtZW50KS5vbigna2V5ZG93bicsICcjZmlsdGVyLWlucHV0JywgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkcG9wdXAgPSAkKCcjZmlsdGVyLXR5cGUtcG9wdXAnKTtcbiAgICAgICAgICAgIGNvbnN0IGlzUG9wdXBWaXNpYmxlID0gJHBvcHVwLmlzKCc6dmlzaWJsZScpICYmICEkcG9wdXAuaGFzQ2xhc3MoJ2hpZGRlbicpO1xuXG4gICAgICAgICAgICAvLyBXaGVuIHBvcHVwIGlzIG9wZW4sIGhhbmRsZSBhcnJvdyBrZXlzIGFuZCBFbnRlciBmb3Iga2V5Ym9hcmQgbmF2aWdhdGlvblxuICAgICAgICAgICAgaWYgKGlzUG9wdXBWaXNpYmxlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50LmtleSA9PT0gJ0Fycm93RG93bicgfHwgZXZlbnQua2V5ID09PSAnQXJyb3dVcCcpIHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MubmF2aWdhdGVGaWx0ZXJQb3B1cChldmVudC5rZXkgPT09ICdBcnJvd0Rvd24nID8gMSA6IC0xKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZXZlbnQua2V5ID09PSAnRW50ZXInKSB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRmb2N1c2VkID0gJHBvcHVwLmZpbmQoJy5maWx0ZXItdHlwZS1vcHRpb24uZm9jdXNlZCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoJGZvY3VzZWQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkZm9jdXNlZC50cmlnZ2VyKCdjbGljaycpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChldmVudC5rZXkgPT09ICdFbnRlcicpIHtcbiAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSAkKCcjZmlsdGVyLWlucHV0JykudmFsKCkudHJpbSgpO1xuICAgICAgICAgICAgICAgIGlmICh0ZXh0ICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5wZW5kaW5nRmlsdGVyVGV4dCA9IHRleHQ7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnNob3dGaWx0ZXJUeXBlUG9wdXAoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGV2ZW50LmtleSA9PT0gJ0VzY2FwZScpIHtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5oaWRlRmlsdGVyVHlwZVBvcHVwKCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGV2ZW50LmtleSA9PT0gJ0JhY2tzcGFjZScgJiYgJCgnI2ZpbHRlci1pbnB1dCcpLnZhbCgpID09PSAnJykge1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBsYXN0IGNoaXAgb24gQmFja3NwYWNlIGluIGVtcHR5IGlucHV0XG4gICAgICAgICAgICAgICAgaWYgKHN5c3RlbURpYWdub3N0aWNMb2dzLmZpbHRlckNvbmRpdGlvbnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5yZW1vdmVGaWx0ZXJDb25kaXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5maWx0ZXJDb25kaXRpb25zLmxlbmd0aCAtIDFcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIE9uIGJsdXI6IGF1dG8tYWRkIHRleHQgYXMgXCJjb250YWluc1wiIGZpbHRlciBpZiBwb3B1cCBpcyBub3Qgb3BlblxuICAgICAgICAkKGRvY3VtZW50KS5vbignYmx1cicsICcjZmlsdGVyLWlucHV0JywgKCkgPT4ge1xuICAgICAgICAgICAgLy8gRGVsYXkgdG8gYWxsb3cgY2xpY2sgb24gcG9wdXAgb3B0aW9uIHRvIGZpcmUgZmlyc3RcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRwb3B1cCA9ICQoJyNmaWx0ZXItdHlwZS1wb3B1cCcpO1xuICAgICAgICAgICAgICAgIGlmICgkcG9wdXAuaXMoJzp2aXNpYmxlJykpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gUG9wdXAgaXMgb3BlbiAodXNlciBwcmVzc2VkIEVudGVyKSDigJQgbGV0IHBvcHVwIGhhbmRsZSBpdFxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSAkKCcjZmlsdGVyLWlucHV0JykudmFsKCkudHJpbSgpO1xuICAgICAgICAgICAgICAgIGlmICh0ZXh0ICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5hZGRGaWx0ZXJDb25kaXRpb24oJ2NvbnRhaW5zJywgdGV4dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgMTUwKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIGZpbHRlciB0eXBlIG9wdGlvbiBjbGlja1xuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnLmZpbHRlci10eXBlLW9wdGlvbicsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0eXBlID0gJChlLmN1cnJlbnRUYXJnZXQpLmRhdGEoJ3R5cGUnKTtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmFkZEZpbHRlckNvbmRpdGlvbih0eXBlLCBzeXN0ZW1EaWFnbm9zdGljTG9ncy5wZW5kaW5nRmlsdGVyVGV4dCk7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5wZW5kaW5nRmlsdGVyVGV4dCA9ICcnO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaGlkZUZpbHRlclR5cGVQb3B1cCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgcmVtb3ZpbmcgaW5kaXZpZHVhbCBmaWx0ZXIgY2hpcFxuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnI2ZpbHRlci1sYWJlbHMgLmRlbGV0ZS5pY29uJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICBjb25zdCBpbmRleCA9ICQoZS5jdXJyZW50VGFyZ2V0KS5jbG9zZXN0KCcuZmlsdGVyLWNvbmRpdGlvbi1sYWJlbCcpLmRhdGEoJ2luZGV4Jyk7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5yZW1vdmVGaWx0ZXJDb25kaXRpb24oaW5kZXgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgXCJDbGVhciBGaWx0ZXJcIiBidXR0b24gY2xpY2tcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJyNjbGVhci1maWx0ZXItYnRuJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmNsZWFyQWxsRmlsdGVyQ29uZGl0aW9ucygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDbGljayBvbiBjb250YWluZXIgZm9jdXNlcyBpbnB1dFxuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnI2ZpbHRlci1jb25kaXRpb25zLWNvbnRhaW5lcicsIChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoJChlLnRhcmdldCkuaXMoJyNmaWx0ZXItY29uZGl0aW9ucy1jb250YWluZXInKSB8fCAkKGUudGFyZ2V0KS5pcygnI2ZpbHRlci1sYWJlbHMnKSkge1xuICAgICAgICAgICAgICAgICQoJyNmaWx0ZXItaW5wdXQnKS5mb2N1cygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIaWRlIHBvcHVwIHdoZW4gY2xpY2tpbmcgb3V0c2lkZVxuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgaWYgKCEkKGUudGFyZ2V0KS5jbG9zZXN0KCcjZmlsdGVyLXR5cGUtcG9wdXAsICNmaWx0ZXItaW5wdXQnKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5oaWRlRmlsdGVyVHlwZVBvcHVwKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciBGdWxsc2NyZWVuIGJ1dHRvbiBjbGlja1xuICAgICAgICAkKCcuZnVsbHNjcmVlbi10b2dnbGUtYnRuJykub24oJ2NsaWNrJywgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudG9nZ2xlRnVsbFNjcmVlbik7XG5cbiAgICAgICAgLy8gTGlzdGVuaW5nIGZvciB0aGUgZnVsbHNjcmVlbiBjaGFuZ2UgZXZlbnRcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignZnVsbHNjcmVlbmNoYW5nZScsIHN5c3RlbURpYWdub3N0aWNMb2dzLmFkanVzdExvZ0hlaWdodCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbCBoZWlnaHQgY2FsY3VsYXRpb25cbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuYWRqdXN0TG9nSGVpZ2h0KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZXMgdGhlIGZ1bGwtc2NyZWVuIG1vZGUgb2YgdGhlICdzeXN0ZW0tbG9ncy1zZWdtZW50JyBlbGVtZW50LlxuICAgICAqIElmIHRoZSBlbGVtZW50IGlzIG5vdCBpbiBmdWxsLXNjcmVlbiBtb2RlLCBpdCByZXF1ZXN0cyBmdWxsLXNjcmVlbiBtb2RlLlxuICAgICAqIElmIHRoZSBlbGVtZW50IGlzIGFscmVhZHkgaW4gZnVsbC1zY3JlZW4gbW9kZSwgaXQgZXhpdHMgZnVsbC1zY3JlZW4gbW9kZS5cbiAgICAgKiBMb2dzIGFuIGVycm9yIG1lc3NhZ2UgdG8gdGhlIGNvbnNvbGUgaWYgdGhlcmUgaXMgYW4gaXNzdWUgZW5hYmxpbmcgZnVsbC1zY3JlZW4gbW9kZS5cbiAgICAgKlxuICAgICAqIEByZXR1cm4ge3ZvaWR9XG4gICAgICovXG4gICAgdG9nZ2xlRnVsbFNjcmVlbigpIHtcbiAgICAgICAgY29uc3QgbG9nQ29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3N5c3RlbS1sb2dzLXNlZ21lbnQnKTtcblxuICAgICAgICBpZiAoIWRvY3VtZW50LmZ1bGxzY3JlZW5FbGVtZW50KSB7XG4gICAgICAgICAgICBsb2dDb250YWluZXIucmVxdWVzdEZ1bGxzY3JlZW4oKS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgYXR0ZW1wdGluZyB0byBlbmFibGUgZnVsbC1zY3JlZW4gbW9kZTogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZG9jdW1lbnQuZXhpdEZ1bGxzY3JlZW4oKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGdW5jdGlvbiB0byBhZGp1c3QgdGhlIGhlaWdodCBvZiB0aGUgbG9ncyBkZXBlbmRpbmcgb24gdGhlIHNjcmVlbiBtb2RlLlxuICAgICAqL1xuICAgIGFkanVzdExvZ0hlaWdodCgpIHtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBsZXQgYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGxvZ0NvbnRlbnQub2Zmc2V0KCkudG9wIC0gNTU7XG4gICAgICAgICAgICBpZiAoZG9jdW1lbnQuZnVsbHNjcmVlbkVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiBmdWxsc2NyZWVuIG1vZGUgaXMgYWN0aXZlXG4gICAgICAgICAgICAgICAgYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gODA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBSZWNhbGN1bGF0ZSB0aGUgc2l6ZSBvZiB0aGUgQUNFIGVkaXRvclxuICAgICAgICAgICAgJCgnLmxvZy1jb250ZW50LXJlYWRvbmx5JykuY3NzKCdtaW4taGVpZ2h0JywgIGAke2FjZUhlaWdodH1weGApO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnJlc2l6ZSgpO1xuICAgICAgICB9LCAzMDApO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBsb2cgbGV2ZWwgZHJvcGRvd24gLSBWNS4wIHBhdHRlcm4gd2l0aCBIVE1MIGljb25zXG4gICAgICogU3RhdGljIGRyb3Bkb3duIHdpdGggY29sb3JlZCBpY29ucyBhbmQgdHJhbnNsYXRpb25zXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUxvZ0xldmVsRHJvcGRvd24oKSB7XG4gICAgICAgIGNvbnN0ICRoaWRkZW5JbnB1dCA9ICQoJyNsb2dMZXZlbCcpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGRyb3Bkb3duIGFscmVhZHkgZXhpc3RzXG4gICAgICAgIGlmICgkKCcjbG9nTGV2ZWwtZHJvcGRvd24nKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENyZWF0ZSBkcm9wZG93biBIVE1MIHdpdGggY29sb3JlZCBpY29uc1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCc8ZGl2PicsIHtcbiAgICAgICAgICAgIGlkOiAnbG9nTGV2ZWwtZHJvcGRvd24nLFxuICAgICAgICAgICAgY2xhc3M6ICd1aSBzZWxlY3Rpb24gZHJvcGRvd24nXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0ICR0ZXh0ID0gJCgnPGRpdj4nLCB7IGNsYXNzOiAndGV4dCcgfSkudGV4dChnbG9iYWxUcmFuc2xhdGUuc2RfQWxsTGV2ZWxzKTtcbiAgICAgICAgY29uc3QgJGljb24gPSAkKCc8aT4nLCB7IGNsYXNzOiAnZHJvcGRvd24gaWNvbicgfSk7XG4gICAgICAgIGNvbnN0ICRtZW51ID0gJCgnPGRpdj4nLCB7IGNsYXNzOiAnbWVudScgfSk7XG5cbiAgICAgICAgLy8gQnVpbGQgbWVudSBpdGVtcyB3aXRoIGNvbG9yZWQgaWNvbnNcbiAgICAgICAgY29uc3QgaXRlbXMgPSBbXG4gICAgICAgICAgICB7IHZhbHVlOiAnJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnNkX0FsbExldmVscywgaWNvbjogJycgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdFUlJPUicsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5zZF9FcnJvciwgaWNvbjogJzxpIGNsYXNzPVwiZXhjbGFtYXRpb24gY2lyY2xlIHJlZCBpY29uXCI+PC9pPicgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdXQVJOSU5HJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnNkX1dhcm5pbmcsIGljb246ICc8aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIG9yYW5nZSBpY29uXCI+PC9pPicgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdOT1RJQ0UnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc2RfTm90aWNlLCBpY29uOiAnPGkgY2xhc3M9XCJpbmZvIGNpcmNsZSBibHVlIGljb25cIj48L2k+JyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ0lORk8nLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc2RfSW5mbywgaWNvbjogJzxpIGNsYXNzPVwiY2lyY2xlIGdyZXkgaWNvblwiPjwvaT4nIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAnREVCVUcnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc2RfRGVidWcsIGljb246ICc8aSBjbGFzcz1cImJ1ZyBwdXJwbGUgaWNvblwiPjwvaT4nIH1cbiAgICAgICAgXTtcblxuICAgICAgICBpdGVtcy5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICAgICAgY29uc3QgJGl0ZW0gPSAkKCc8ZGl2PicsIHtcbiAgICAgICAgICAgICAgICBjbGFzczogJ2l0ZW0nLFxuICAgICAgICAgICAgICAgICdkYXRhLXZhbHVlJzogaXRlbS52YWx1ZVxuICAgICAgICAgICAgfSkuaHRtbChpdGVtLmljb24gKyBpdGVtLnRleHQpO1xuICAgICAgICAgICAgJG1lbnUuYXBwZW5kKCRpdGVtKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJGRyb3Bkb3duLmFwcGVuZCgkdGV4dCwgJGljb24sICRtZW51KTtcbiAgICAgICAgJGhpZGRlbklucHV0LmFmdGVyKCRkcm9wZG93bik7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTZW1hbnRpYyBVSSBkcm9wZG93blxuICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICRoaWRkZW5JbnB1dC52YWwodmFsdWUpLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIodHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGRyb3Bkb3duIFVJIGVsZW1lbnQgZnJvbSBoaWRkZW4gaW5wdXQgZmllbGQgKFY1LjAgcGF0dGVybilcbiAgICAgKi9cbiAgICBjcmVhdGVEcm9wZG93bkZyb21IaWRkZW5JbnB1dCgpIHtcbiAgICAgICAgY29uc3QgJGhpZGRlbklucHV0ID0gJCgnI2ZpbGVuYW1lcycpO1xuXG4gICAgICAgIGlmICghJGhpZGRlbklucHV0Lmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignSGlkZGVuIGlucHV0ICNmaWxlbmFtZXMgbm90IGZvdW5kJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCc8ZGl2PicsIHtcbiAgICAgICAgICAgIGlkOiAnZmlsZW5hbWVzLWRyb3Bkb3duJyxcbiAgICAgICAgICAgIGNsYXNzOiAndWkgc2VhcmNoIHNlbGVjdGlvbiBkcm9wZG93biBmaWxlbmFtZXMtc2VsZWN0IGZsdWlkJ1xuICAgICAgICB9KTtcblxuICAgICAgICAkZHJvcGRvd24uYXBwZW5kKFxuICAgICAgICAgICAgJCgnPGk+JywgeyBjbGFzczogJ2Ryb3Bkb3duIGljb24nIH0pLFxuICAgICAgICAgICAgJCgnPGlucHV0PicsIHsgdHlwZTogJ3RleHQnLCBjbGFzczogJ3NlYXJjaCcsIHRhYmluZGV4OiAwIH0pLFxuICAgICAgICAgICAgJCgnPGRpdj4nLCB7IGNsYXNzOiAnZGVmYXVsdCB0ZXh0JyB9KS50ZXh0KCdTZWxlY3QgbG9nIGZpbGUnKSxcbiAgICAgICAgICAgICQoJzxkaXY+JywgeyBjbGFzczogJ21lbnUnIH0pXG4gICAgICAgICk7XG5cbiAgICAgICAgJGhpZGRlbklucHV0LmJlZm9yZSgkZHJvcGRvd24pO1xuICAgICAgICAkaGlkZGVuSW5wdXQuaGlkZSgpO1xuXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24gPSAkZHJvcGRvd247XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBBQ0UgZWRpdG9yIGZvciBsb2cgdmlld2luZy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplQWNlKCkge1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIgPSBhY2UuZWRpdCgnbG9nLWNvbnRlbnQtcmVhZG9ubHknKTtcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgSnVsaWEgbW9kZSBpcyBhdmFpbGFibGVcbiAgICAgICAgY29uc3QganVsaWEgPSBhY2UucmVxdWlyZSgnYWNlL21vZGUvanVsaWEnKTtcbiAgICAgICAgaWYgKGp1bGlhICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIFNldCB0aGUgbW9kZSB0byBKdWxpYSBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgIGNvbnN0IEluaU1vZGUgPSBqdWxpYS5Nb2RlO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnNlc3Npb24uc2V0TW9kZShuZXcgSW5pTW9kZSgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCB0aGUgdGhlbWUgYW5kIG9wdGlvbnMgZm9yIHRoZSBBQ0UgZWRpdG9yXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlci5zZXRUaGVtZSgnYWNlL3RoZW1lL21vbm9rYWknKTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnJlbmRlcmVyLnNldFNob3dHdXR0ZXIoZmFsc2UpO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIuc2V0T3B0aW9ucyh7XG4gICAgICAgICAgICBzaG93TGluZU51bWJlcnM6IGZhbHNlLFxuICAgICAgICAgICAgc2hvd1ByaW50TWFyZ2luOiBmYWxzZSxcbiAgICAgICAgICAgIHJlYWRPbmx5OiB0cnVlLFxuICAgICAgICB9KTtcblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCdWlsZHMgYSBoaWVyYXJjaGljYWwgdHJlZSBzdHJ1Y3R1cmUgZnJvbSBmbGF0IGZpbGUgcGF0aHNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZmlsZXMgLSBUaGUgZmlsZXMgb2JqZWN0IGZyb20gQVBJIHJlc3BvbnNlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGRlZmF1bHRQYXRoIC0gVGhlIGRlZmF1bHQgc2VsZWN0ZWQgZmlsZSBwYXRoXG4gICAgICogQHJldHVybnMge0FycmF5fSBUcmVlIHN0cnVjdHVyZSBmb3IgdGhlIGRyb3Bkb3duXG4gICAgICovXG4gICAgYnVpbGRUcmVlU3RydWN0dXJlKGZpbGVzLCBkZWZhdWx0UGF0aCkge1xuICAgICAgICBjb25zdCB0cmVlID0ge307XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCB0aGUgdHJlZSBzdHJ1Y3R1cmVcbiAgICAgICAgT2JqZWN0LmVudHJpZXMoZmlsZXMpLmZvckVhY2goKFtrZXksIGZpbGVEYXRhXSkgPT4ge1xuICAgICAgICAgICAgLy8gVXNlIGZpbGVEYXRhLnBhdGggYXMgdGhlIGFjdHVhbCBmaWxlIHBhdGhcbiAgICAgICAgICAgIGNvbnN0IGZpbGVQYXRoID0gZmlsZURhdGEucGF0aCB8fCBrZXk7XG4gICAgICAgICAgICBjb25zdCBwYXJ0cyA9IGZpbGVQYXRoLnNwbGl0KCcvJyk7XG4gICAgICAgICAgICBsZXQgY3VycmVudCA9IHRyZWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHBhcnRzLmZvckVhY2goKHBhcnQsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGluZGV4ID09PSBwYXJ0cy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgaXMgYSBmaWxlXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRbcGFydF0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZmlsZScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBmaWxlUGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpemU6IGZpbGVEYXRhLnNpemUsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAoZGVmYXVsdFBhdGggJiYgZGVmYXVsdFBhdGggPT09IGZpbGVQYXRoKSB8fCAoIWRlZmF1bHRQYXRoICYmIGZpbGVEYXRhLmRlZmF1bHQpXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBpcyBhIGRpcmVjdG9yeVxuICAgICAgICAgICAgICAgICAgICBpZiAoIWN1cnJlbnRbcGFydF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRbcGFydF0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ZvbGRlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW46IHt9XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnQgPSBjdXJyZW50W3BhcnRdLmNoaWxkcmVuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbnZlcnQgdHJlZSB0byBkcm9wZG93biBpdGVtc1xuICAgICAgICByZXR1cm4gdGhpcy50cmVlVG9Ecm9wZG93bkl0ZW1zKHRyZWUsICcnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENvbnZlcnRzIHRyZWUgc3RydWN0dXJlIHRvIGRyb3Bkb3duIGl0ZW1zIHdpdGggcHJvcGVyIGZvcm1hdHRpbmdcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gdHJlZSAtIFRoZSB0cmVlIHN0cnVjdHVyZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcmVmaXggLSBQcmVmaXggZm9yIGluZGVudGF0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmVudEZvbGRlciAtIFBhcmVudCBmb2xkZXIgbmFtZSBmb3IgZ3JvdXBpbmdcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IEZvcm1hdHRlZCBkcm9wZG93biBpdGVtc1xuICAgICAqL1xuICAgIHRyZWVUb0Ryb3Bkb3duSXRlbXModHJlZSwgcHJlZml4LCBwYXJlbnRGb2xkZXJQYXRoID0gJycpIHtcbiAgICAgICAgY29uc3QgaXRlbXMgPSBbXTtcblxuICAgICAgICAvLyBTb3J0IGVudHJpZXM6IGZvbGRlcnMgZmlyc3QsIHRoZW4gZmlsZXNcbiAgICAgICAgY29uc3QgZW50cmllcyA9IE9iamVjdC5lbnRyaWVzKHRyZWUpLnNvcnQoKFthS2V5LCBhVmFsXSwgW2JLZXksIGJWYWxdKSA9PiB7XG4gICAgICAgICAgICBpZiAoYVZhbC50eXBlID09PSAnZm9sZGVyJyAmJiBiVmFsLnR5cGUgPT09ICdmaWxlJykgcmV0dXJuIC0xO1xuICAgICAgICAgICAgaWYgKGFWYWwudHlwZSA9PT0gJ2ZpbGUnICYmIGJWYWwudHlwZSA9PT0gJ2ZvbGRlcicpIHJldHVybiAxO1xuICAgICAgICAgICAgcmV0dXJuIGFLZXkubG9jYWxlQ29tcGFyZShiS2V5KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZW50cmllcy5mb3JFYWNoKChba2V5LCB2YWx1ZV0pID0+IHtcbiAgICAgICAgICAgIGlmICh2YWx1ZS50eXBlID09PSAnZm9sZGVyJykge1xuICAgICAgICAgICAgICAgIC8vIEJ1aWxkIHVuaXF1ZSBmb2xkZXIgcGF0aCBmb3IgaGllcmFyY2hpY2FsIGNvbGxhcHNlXG4gICAgICAgICAgICAgICAgY29uc3QgZm9sZGVyUGF0aCA9IHBhcmVudEZvbGRlclBhdGggPyBgJHtwYXJlbnRGb2xkZXJQYXRofS8ke2tleX1gIDoga2V5O1xuXG4gICAgICAgICAgICAgICAgLy8gQWRkIGZvbGRlciBoZWFkZXIgd2l0aCB0b2dnbGUgY2FwYWJpbGl0eSBhbmQgaW5kZW50YXRpb24gZm9yIG5lc3RlZCBmb2xkZXJzXG4gICAgICAgICAgICAgICAgaXRlbXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGAke3ByZWZpeH08aSBjbGFzcz1cImNhcmV0IGRvd24gaWNvbiBmb2xkZXItdG9nZ2xlXCI+PC9pPjxpIGNsYXNzPVwiZm9sZGVyIGljb25cIj48L2k+ICR7a2V5fWAsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdmb2xkZXInLFxuICAgICAgICAgICAgICAgICAgICBmb2xkZXJOYW1lOiBmb2xkZXJQYXRoLFxuICAgICAgICAgICAgICAgICAgICBwYXJlbnRGb2xkZXI6IHBhcmVudEZvbGRlclBhdGhcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIEFkZCBjaGlsZHJlbiB3aXRoIGluY3JlYXNlZCBpbmRlbnRhdGlvbiBhbmQgcGFyZW50IGZvbGRlciBwYXRoXG4gICAgICAgICAgICAgICAgY29uc3QgY2hpbGRJdGVtcyA9IHRoaXMudHJlZVRvRHJvcGRvd25JdGVtcyh2YWx1ZS5jaGlsZHJlbiwgcHJlZml4ICsgJyZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOycsIGZvbGRlclBhdGgpO1xuICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goLi4uY2hpbGRJdGVtcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEFkZCBmaWxlIGl0ZW0gd2l0aCBwYXJlbnQgZm9sZGVyIHJlZmVyZW5jZVxuICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBgJHtwcmVmaXh9PGkgY2xhc3M9XCJmaWxlIG91dGxpbmUgaWNvblwiPjwvaT4gJHtrZXl9ICgke3ZhbHVlLnNpemV9KWAsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiB2YWx1ZS5wYXRoLFxuICAgICAgICAgICAgICAgICAgICBzZWxlY3RlZDogdmFsdWUuZGVmYXVsdCxcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ZpbGUnLFxuICAgICAgICAgICAgICAgICAgICBwYXJlbnRGb2xkZXI6IHBhcmVudEZvbGRlclBhdGhcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgcmV0dXJuIGl0ZW1zO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ3JlYXRlcyBjdXN0b20gZHJvcGRvd24gbWVudSBIVE1MIGZvciBsb2cgZmlsZXMgd2l0aCBjb2xsYXBzaWJsZSBmb2xkZXJzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGNvbnRhaW5pbmcgZHJvcGRvd24gbWVudSBvcHRpb25zXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGZpZWxkcyAtIFRoZSBmaWVsZHMgaW4gdGhlIHJlc3BvbnNlIHRvIHVzZSBmb3IgdGhlIG1lbnUgb3B0aW9uc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFRoZSBIVE1MIHN0cmluZyBmb3IgdGhlIGN1c3RvbSBkcm9wZG93biBtZW51XG4gICAgICovXG4gICAgY3VzdG9tRHJvcGRvd25NZW51KHJlc3BvbnNlLCBmaWVsZHMpIHtcbiAgICAgICAgY29uc3QgdmFsdWVzID0gcmVzcG9uc2VbZmllbGRzLnZhbHVlc10gfHwge307XG4gICAgICAgIGxldCBodG1sID0gJyc7XG5cbiAgICAgICAgJC5lYWNoKHZhbHVlcywgKGluZGV4LCBvcHRpb24pID0+IHtcbiAgICAgICAgICAgIC8vIEZvciB0cmVlIHN0cnVjdHVyZSBpdGVtc1xuICAgICAgICAgICAgaWYgKHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtcyAmJiBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXNbaW5kZXhdKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaXRlbSA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtc1tpbmRleF07XG5cbiAgICAgICAgICAgICAgICBpZiAoaXRlbS50eXBlID09PSAnZm9sZGVyJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBGb2xkZXIgaXRlbSAtIGNsaWNrYWJsZSBoZWFkZXIgZm9yIGNvbGxhcHNlL2V4cGFuZFxuICAgICAgICAgICAgICAgICAgICAvLyBOb3QgdXNpbmcgJ2Rpc2FibGVkJyBjbGFzcyBhcyBpdCBibG9ja3MgcG9pbnRlciBldmVudHNcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZm9sZGVyUGFyZW50QXR0ciA9IGl0ZW0ucGFyZW50Rm9sZGVyID8gYGRhdGEtcGFyZW50PVwiJHtpdGVtLnBhcmVudEZvbGRlcn1cImAgOiAnJztcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImZvbGRlci1oZWFkZXIgaXRlbVwiIGRhdGEtZm9sZGVyPVwiJHtpdGVtLmZvbGRlck5hbWV9XCIgJHtmb2xkZXJQYXJlbnRBdHRyfSBkYXRhLXZhbHVlPVwiXCIgZGF0YS10ZXh0PVwiJHtpdGVtLmZvbGRlck5hbWV9XCIgc3R5bGU9XCJwb2ludGVyLWV2ZW50czogYXV0byAhaW1wb3J0YW50OyBjdXJzb3I6IHBvaW50ZXI7IGZvbnQtd2VpZ2h0OiBib2xkOyBiYWNrZ3JvdW5kOiAjZjlmOWY5O1wiPiR7aXRlbS5uYW1lfTwvZGl2PmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRmlsZSBpdGVtIHdpdGggcGFyZW50IGZvbGRlciByZWZlcmVuY2UgZm9yIGNvbGxhcHNlXG4gICAgICAgICAgICAgICAgICAgIC8vIGRhdGEtdGV4dCBjb250YWlucyBmdWxsIHBhdGggc28gRm9tYW50aWMgc2VhcmNoIG1hdGNoZXMgYnkgZm9sZGVyIG5hbWUgdG9vXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlbGVjdGVkID0gaXRlbS5zZWxlY3RlZCA/ICdzZWxlY3RlZCBhY3RpdmUnIDogJyc7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhcmVudEF0dHIgPSBpdGVtLnBhcmVudEZvbGRlciA/IGBkYXRhLXBhcmVudD1cIiR7aXRlbS5wYXJlbnRGb2xkZXJ9XCJgIDogJyc7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtIGZpbGUtaXRlbSAke3NlbGVjdGVkfVwiIGRhdGEtdmFsdWU9XCIke29wdGlvbltmaWVsZHMudmFsdWVdfVwiIGRhdGEtdGV4dD1cIiR7b3B0aW9uW2ZpZWxkcy52YWx1ZV19XCIgJHtwYXJlbnRBdHRyfT4ke2l0ZW0ubmFtZX08L2Rpdj5gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gcmVndWxhciBpdGVtXG4gICAgICAgICAgICAgICAgY29uc3QgbWF5YmVEaXNhYmxlZCA9IChvcHRpb25bZmllbGRzLmRpc2FibGVkXSkgPyAnZGlzYWJsZWQgJyA6ICcnO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCIke21heWJlRGlzYWJsZWR9aXRlbVwiIGRhdGEtdmFsdWU9XCIke29wdGlvbltmaWVsZHMudmFsdWVdfVwiPiR7b3B0aW9uW2ZpZWxkcy5uYW1lXX08L2Rpdj5gO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgZm9sZGVyIGNvbGxhcHNlL2V4cGFuZCBoYW5kbGVycyBhbmQgc2VhcmNoIGJlaGF2aW9yXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvbGRlckhhbmRsZXJzKCkge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duO1xuXG4gICAgICAgIC8vIEhhbmRsZSBmb2xkZXIgaGVhZGVyIGNsaWNrcyBmb3IgY29sbGFwc2UvZXhwYW5kXG4gICAgICAgIC8vIFVzZSBkb2N1bWVudC1sZXZlbCBoYW5kbGVyIHdpdGggY2FwdHVyZSBwaGFzZSB0byBpbnRlcmNlcHQgYmVmb3JlIEZvbWFudGljXG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIGNsaWNrIGlzIGluc2lkZSBvdXIgZHJvcGRvd24ncyBmb2xkZXItaGVhZGVyXG4gICAgICAgICAgICBjb25zdCBmb2xkZXJIZWFkZXIgPSBlLnRhcmdldC5jbG9zZXN0KCcjZmlsZW5hbWVzLWRyb3Bkb3duIC5mb2xkZXItaGVhZGVyJyk7XG4gICAgICAgICAgICBpZiAoIWZvbGRlckhlYWRlcikgcmV0dXJuO1xuXG4gICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICBjb25zdCAkZm9sZGVyID0gJChmb2xkZXJIZWFkZXIpO1xuICAgICAgICAgICAgY29uc3QgZm9sZGVyUGF0aCA9ICRmb2xkZXIuZGF0YSgnZm9sZGVyJyk7XG4gICAgICAgICAgICBjb25zdCAkdG9nZ2xlID0gJGZvbGRlci5maW5kKCcuZm9sZGVyLXRvZ2dsZScpO1xuICAgICAgICAgICAgY29uc3QgJG1lbnUgPSAkZHJvcGRvd24uZmluZCgnLm1lbnUnKTtcblxuICAgICAgICAgICAgLy8gVG9nZ2xlIGZvbGRlciBzdGF0ZVxuICAgICAgICAgICAgY29uc3QgaXNDb2xsYXBzZWQgPSAkdG9nZ2xlLmhhc0NsYXNzKCdyaWdodCcpO1xuXG4gICAgICAgICAgICBpZiAoaXNDb2xsYXBzZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBFeHBhbmQgZm9sZGVyIC0gc2hvdyBvbmx5IGRpcmVjdCBjaGlsZHJlblxuICAgICAgICAgICAgICAgICR0b2dnbGUucmVtb3ZlQ2xhc3MoJ3JpZ2h0JykuYWRkQ2xhc3MoJ2Rvd24nKTtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGRpcmVjdCBjaGlsZCBmaWxlcyBhbmQgY2hpbGQgZm9sZGVyIGhlYWRlcnNcbiAgICAgICAgICAgICAgICAkbWVudS5maW5kKGAuZmlsZS1pdGVtW2RhdGEtcGFyZW50PVwiJHtmb2xkZXJQYXRofVwiXWApLnNob3coKTtcbiAgICAgICAgICAgICAgICAkbWVudS5maW5kKGAuZm9sZGVyLWhlYWRlcltkYXRhLXBhcmVudD1cIiR7Zm9sZGVyUGF0aH1cIl1gKS5zaG93KCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIENvbGxhcHNlIGZvbGRlciAtIGhpZGUgYWxsIGRlc2NlbmRhbnRzIHJlY3Vyc2l2ZWx5XG4gICAgICAgICAgICAgICAgJHRvZ2dsZS5yZW1vdmVDbGFzcygnZG93bicpLmFkZENsYXNzKCdyaWdodCcpO1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmNvbGxhcHNlRGVzY2VuZGFudHMoJG1lbnUsIGZvbGRlclBhdGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTsgLy8gY2FwdHVyZSBwaGFzZSAtIGZpcmVzIGJlZm9yZSBidWJibGluZ1xuXG4gICAgICAgIC8vIEhhbmRsZSBzZWFyY2ggaW5wdXQgLSBzaG93IGFsbCBpdGVtcyB3aGVuIHNlYXJjaGluZ1xuICAgICAgICAkZHJvcGRvd24ub24oJ2lucHV0JywgJ2lucHV0LnNlYXJjaCcsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBzZWFyY2hWYWx1ZSA9ICQoZS50YXJnZXQpLnZhbCgpLnRyaW0oKTtcbiAgICAgICAgICAgIGNvbnN0ICRtZW51ID0gJGRyb3Bkb3duLmZpbmQoJy5tZW51Jyk7XG5cbiAgICAgICAgICAgIGlmIChzZWFyY2hWYWx1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBhbGwgaXRlbXMgYW5kIGV4cGFuZCBhbGwgZm9sZGVycyBkdXJpbmcgc2VhcmNoXG4gICAgICAgICAgICAgICAgJG1lbnUuZmluZCgnLmZpbGUtaXRlbScpLnNob3coKTtcbiAgICAgICAgICAgICAgICAkbWVudS5maW5kKCcuZm9sZGVyLWhlYWRlcicpLnNob3coKTtcbiAgICAgICAgICAgICAgICAkbWVudS5maW5kKCcuZm9sZGVyLXRvZ2dsZScpLnJlbW92ZUNsYXNzKCdyaWdodCcpLmFkZENsYXNzKCdkb3duJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFJlc3RvcmUgY29sbGFwc2VkIHN0YXRlIHdoZW4gc2VhcmNoIGlzIGNsZWFyZWRcbiAgICAgICAgICAgICAgICAkbWVudS5maW5kKCcuZm9sZGVyLWhlYWRlcicpLmVhY2goKF8sIGZvbGRlcikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkZm9sZGVyID0gJChmb2xkZXIpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmb2xkZXJQYXRoID0gJGZvbGRlci5kYXRhKCdmb2xkZXInKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNDb2xsYXBzZWQgPSAkZm9sZGVyLmZpbmQoJy5mb2xkZXItdG9nZ2xlJykuaGFzQ2xhc3MoJ3JpZ2h0Jyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0NvbGxhcHNlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY29sbGFwc2VEZXNjZW5kYW50cygkbWVudSwgZm9sZGVyUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlY3Vyc2l2ZWx5IGhpZGVzIGFsbCBkZXNjZW5kYW50cyAoZmlsZXMgYW5kIHN1YmZvbGRlcnMpIG9mIGEgZ2l2ZW4gZm9sZGVyXG4gICAgICogYW5kIG1hcmtzIGNoaWxkIGZvbGRlcnMgYXMgY29sbGFwc2VkXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRtZW51IC0gVGhlIGRyb3Bkb3duIG1lbnUgZWxlbWVudFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmb2xkZXJQYXRoIC0gVGhlIGZvbGRlciBwYXRoIHdob3NlIGRlc2NlbmRhbnRzIHRvIGhpZGVcbiAgICAgKi9cbiAgICBjb2xsYXBzZURlc2NlbmRhbnRzKCRtZW51LCBmb2xkZXJQYXRoKSB7XG4gICAgICAgIC8vIEhpZGUgZGlyZWN0IGNoaWxkIGZpbGVzXG4gICAgICAgICRtZW51LmZpbmQoYC5maWxlLWl0ZW1bZGF0YS1wYXJlbnQ9XCIke2ZvbGRlclBhdGh9XCJdYCkuaGlkZSgpO1xuXG4gICAgICAgIC8vIEZpbmQgZGlyZWN0IGNoaWxkIGZvbGRlcnMsIGNvbGxhcHNlIHRoZW0gcmVjdXJzaXZlbHksIHRoZW4gaGlkZVxuICAgICAgICAkbWVudS5maW5kKGAuZm9sZGVyLWhlYWRlcltkYXRhLXBhcmVudD1cIiR7Zm9sZGVyUGF0aH1cIl1gKS5lYWNoKChfLCBjaGlsZEZvbGRlcikgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGNoaWxkRm9sZGVyID0gJChjaGlsZEZvbGRlcik7XG4gICAgICAgICAgICBjb25zdCBjaGlsZFBhdGggPSAkY2hpbGRGb2xkZXIuZGF0YSgnZm9sZGVyJyk7XG5cbiAgICAgICAgICAgIC8vIE1hcmsgY2hpbGQgZm9sZGVyIGFzIGNvbGxhcHNlZFxuICAgICAgICAgICAgJGNoaWxkRm9sZGVyLmZpbmQoJy5mb2xkZXItdG9nZ2xlJykucmVtb3ZlQ2xhc3MoJ2Rvd24nKS5hZGRDbGFzcygncmlnaHQnKTtcblxuICAgICAgICAgICAgLy8gUmVjdXJzaXZlbHkgY29sbGFwc2UgaXRzIGRlc2NlbmRhbnRzXG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jb2xsYXBzZURlc2NlbmRhbnRzKCRtZW51LCBjaGlsZFBhdGgpO1xuXG4gICAgICAgICAgICAvLyBIaWRlIHRoZSBjaGlsZCBmb2xkZXIgaGVhZGVyIGl0c2VsZlxuICAgICAgICAgICAgJGNoaWxkRm9sZGVyLmhpZGUoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEV4cGFuZHMgdGhlIGZvbGRlciBjb250YWluaW5nIHRoZSBzcGVjaWZpZWQgZmlsZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlUGF0aCAtIFRoZSBmaWxlIHBhdGggdG8gZmluZCBhbmQgZXhwYW5kIGl0cyBwYXJlbnQgZm9sZGVyXG4gICAgICovXG4gICAgZXhwYW5kRm9sZGVyRm9yRmlsZShmaWxlUGF0aCkge1xuICAgICAgICBpZiAoIWZpbGVQYXRoKSByZXR1cm47XG5cbiAgICAgICAgY29uc3QgJG1lbnUgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmZpbmQoJy5tZW51Jyk7XG4gICAgICAgIGNvbnN0ICRmaWxlSXRlbSA9ICRtZW51LmZpbmQoYC5maWxlLWl0ZW1bZGF0YS12YWx1ZT1cIiR7ZmlsZVBhdGh9XCJdYCk7XG5cbiAgICAgICAgaWYgKCRmaWxlSXRlbS5sZW5ndGgpIHtcbiAgICAgICAgICAgIC8vIFdhbGsgdXAgdGhlIGFuY2VzdG9yIGNoYWluIGV4cGFuZGluZyBlYWNoIGZvbGRlclxuICAgICAgICAgICAgbGV0IHBhcmVudFBhdGggPSAkZmlsZUl0ZW0uZGF0YSgncGFyZW50Jyk7XG4gICAgICAgICAgICB3aGlsZSAocGFyZW50UGF0aCkge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRmb2xkZXIgPSAkbWVudS5maW5kKGAuZm9sZGVyLWhlYWRlcltkYXRhLWZvbGRlcj1cIiR7cGFyZW50UGF0aH1cIl1gKTtcbiAgICAgICAgICAgICAgICBpZiAoISRmb2xkZXIubGVuZ3RoKSBicmVhaztcblxuICAgICAgICAgICAgICAgIGNvbnN0ICR0b2dnbGUgPSAkZm9sZGVyLmZpbmQoJy5mb2xkZXItdG9nZ2xlJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBTaG93IHRoZSBmb2xkZXIgaGVhZGVyIGl0c2VsZiAobWF5IGJlIGhpZGRlbiBpZiBwYXJlbnQgd2FzIGNvbGxhcHNlZClcbiAgICAgICAgICAgICAgICAkZm9sZGVyLnNob3coKTtcblxuICAgICAgICAgICAgICAgIC8vIEV4cGFuZCBpZiBjb2xsYXBzZWRcbiAgICAgICAgICAgICAgICBpZiAoJHRvZ2dsZS5oYXNDbGFzcygncmlnaHQnKSkge1xuICAgICAgICAgICAgICAgICAgICAkdG9nZ2xlLnJlbW92ZUNsYXNzKCdyaWdodCcpLmFkZENsYXNzKCdkb3duJyk7XG4gICAgICAgICAgICAgICAgICAgICRtZW51LmZpbmQoYC5maWxlLWl0ZW1bZGF0YS1wYXJlbnQ9XCIke3BhcmVudFBhdGh9XCJdYCkuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICAkbWVudS5maW5kKGAuZm9sZGVyLWhlYWRlcltkYXRhLXBhcmVudD1cIiR7cGFyZW50UGF0aH1cIl1gKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gTW92ZSB0byBncmFuZHBhcmVudFxuICAgICAgICAgICAgICAgIHBhcmVudFBhdGggPSAkZm9sZGVyLmRhdGEoJ3BhcmVudCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgaGFzaCBjaGFuZ2VzIHRvIHVwZGF0ZSB0aGUgc2VsZWN0ZWQgZmlsZVxuICAgICAqL1xuICAgIGhhbmRsZUhhc2hDaGFuZ2UoKSB7XG4gICAgICAgIC8vIFNraXAgZHVyaW5nIGluaXRpYWxpemF0aW9uIHRvIHByZXZlbnQgZHVwbGljYXRlIEFQSSBjYWxsc1xuICAgICAgICBpZiAoc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNJbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGhhc2ggPSB3aW5kb3cubG9jYXRpb24uaGFzaDtcbiAgICAgICAgaWYgKGhhc2ggJiYgaGFzaC5zdGFydHNXaXRoKCcjZmlsZT0nKSkge1xuICAgICAgICAgICAgY29uc3QgZmlsZVBhdGggPSBkZWNvZGVVUklDb21wb25lbnQoaGFzaC5zdWJzdHJpbmcoNikpO1xuICAgICAgICAgICAgaWYgKGZpbGVQYXRoICYmIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ2dldCB2YWx1ZScpICE9PSBmaWxlUGF0aCkge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBmaWxlIGV4aXN0cyBpbiBkcm9wZG93biBpdGVtc1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVFeGlzdHMgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXMuc29tZShpdGVtID0+XG4gICAgICAgICAgICAgICAgICAgIGl0ZW0udHlwZSA9PT0gJ2ZpbGUnICYmIGl0ZW0udmFsdWUgPT09IGZpbGVQYXRoXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBpZiAoZmlsZUV4aXN0cykge1xuICAgICAgICAgICAgICAgICAgICAvLyBFeHBhbmQgcGFyZW50IGZvbGRlciBiZWZvcmUgc2VsZWN0aW5nIGZpbGVcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuZXhwYW5kRm9sZGVyRm9yRmlsZShmaWxlUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGZpbGVQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignc2V0IHRleHQnLCBmaWxlUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmaWxlbmFtZScsIGZpbGVQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudXBkYXRlTG9nRnJvbVNlcnZlcigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSBmaWxlIHBhdGggZnJvbSBVUkwgaGFzaCBpZiBwcmVzZW50XG4gICAgICovXG4gICAgZ2V0RmlsZUZyb21IYXNoKCkge1xuICAgICAgICBjb25zdCBoYXNoID0gd2luZG93LmxvY2F0aW9uLmhhc2g7XG4gICAgICAgIGlmIChoYXNoICYmIGhhc2guc3RhcnRzV2l0aCgnI2ZpbGU9JykpIHtcbiAgICAgICAgICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoaGFzaC5zdWJzdHJpbmcoNikpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gZm9ybWF0IHRoZSBkcm9wZG93biBtZW51IHN0cnVjdHVyZSBiYXNlZCBvbiB0aGUgcmVzcG9uc2UuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGRhdGEuXG4gICAgICovXG4gICAgY2JGb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgcmVzcG9uc2UgaXMgdmFsaWRcbiAgICAgICAgaWYgKCFyZXNwb25zZSB8fCAhcmVzcG9uc2UucmVzdWx0IHx8ICFyZXNwb25zZS5kYXRhIHx8ICFyZXNwb25zZS5kYXRhLmZpbGVzKSB7XG4gICAgICAgICAgICAvLyBIaWRlIGRpbW1lciBvbmx5IGlmIG5vdCBpbiBhdXRvLXVwZGF0ZSBtb2RlXG4gICAgICAgICAgICBpZiAoIXN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZmlsZXMgPSByZXNwb25zZS5kYXRhLmZpbGVzO1xuXG4gICAgICAgIC8vIENoZWNrIGZvciBmaWxlIGZyb20gaGFzaCBmaXJzdFxuICAgICAgICBsZXQgZGVmVmFsID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuZ2V0RmlsZUZyb21IYXNoKCk7XG5cbiAgICAgICAgLy8gSWYgbm8gaGFzaCB2YWx1ZSwgY2hlY2sgaWYgdGhlcmUgaXMgYSBkZWZhdWx0IHZhbHVlIHNldCBmb3IgdGhlIGZpbGVuYW1lIGlucHV0IGZpZWxkXG4gICAgICAgIGlmICghZGVmVmFsKSB7XG4gICAgICAgICAgICBjb25zdCBmaWxlTmFtZSA9IHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmaWxlbmFtZScpO1xuICAgICAgICAgICAgaWYgKGZpbGVOYW1lICE9PSAnJykge1xuICAgICAgICAgICAgICAgIGRlZlZhbCA9IGZpbGVOYW1lLnRyaW0oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEJ1aWxkIHRyZWUgc3RydWN0dXJlIGZyb20gZmlsZXNcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuYnVpbGRUcmVlU3RydWN0dXJlKGZpbGVzLCBkZWZWYWwpO1xuXG4gICAgICAgIC8vIENyZWF0ZSB2YWx1ZXMgYXJyYXkgZm9yIGRyb3Bkb3duIHdpdGggYWxsIGl0ZW1zIChpbmNsdWRpbmcgZm9sZGVycylcbiAgICAgICAgY29uc3QgZHJvcGRvd25WYWx1ZXMgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXMubWFwKChpdGVtLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgaWYgKGl0ZW0udHlwZSA9PT0gJ2ZvbGRlcicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBpdGVtLm5hbWUucmVwbGFjZSgvPFtePl0qPi9nLCAnJyksIC8vIFJlbW92ZSBIVE1MIHRhZ3MgZm9yIHNlYXJjaFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJycsXG4gICAgICAgICAgICAgICAgICAgIGRpc2FibGVkOiB0cnVlXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogaXRlbS5uYW1lLnJlcGxhY2UoLzxbXj5dKj4vZywgJycpLCAvLyBSZW1vdmUgSFRNTCB0YWdzIGZvciBzZWFyY2hcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGl0ZW0udmFsdWUsXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkOiBpdGVtLnNlbGVjdGVkXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgZHJvcGRvd24gd2l0aCB2YWx1ZXNcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignc2V0dXAgbWVudScsIHtcbiAgICAgICAgICAgIHZhbHVlczogZHJvcGRvd25WYWx1ZXNcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHRoZSBkZWZhdWx0IHNlbGVjdGVkIHZhbHVlIGlmIGFueVxuICAgICAgICBjb25zdCBzZWxlY3RlZEl0ZW0gPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXMuZmluZChpdGVtID0+IGl0ZW0uc2VsZWN0ZWQpO1xuICAgICAgICBpZiAoc2VsZWN0ZWRJdGVtKSB7XG4gICAgICAgICAgICAvLyBVc2Ugc2V0VGltZW91dCB0byBlbnN1cmUgZHJvcGRvd24gaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEV4cGFuZCBwYXJlbnQgZm9sZGVyIGJlZm9yZSBzZWxlY3RpbmcgZmlsZVxuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmV4cGFuZEZvbGRlckZvckZpbGUoc2VsZWN0ZWRJdGVtLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAvLyBTZXR0aW5nIHNlbGVjdGVkIHZhbHVlIHdpbGwgdHJpZ2dlciBvbkNoYW5nZSBjYWxsYmFjayB3aGljaCBjYWxscyB1cGRhdGVMb2dGcm9tU2VydmVyKClcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBzZWxlY3RlZEl0ZW0udmFsdWUpO1xuICAgICAgICAgICAgICAgIC8vIEZvcmNlIHJlZnJlc2ggdGhlIGRyb3Bkb3duIHRvIHNob3cgdGhlIHNlbGVjdGVkIHZhbHVlXG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bigncmVmcmVzaCcpO1xuICAgICAgICAgICAgICAgIC8vIEFsc28gc2V0IHRoZSB0ZXh0IHRvIHNob3cgZnVsbCBwYXRoXG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignc2V0IHRleHQnLCBzZWxlY3RlZEl0ZW0udmFsdWUpO1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmaWxlbmFtZScsIHNlbGVjdGVkSXRlbS52YWx1ZSk7XG4gICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICB9IGVsc2UgaWYgKGRlZlZhbCkge1xuICAgICAgICAgICAgLy8gSWYgd2UgaGF2ZSBhIGRlZmF1bHQgdmFsdWUgYnV0IG5vIGl0ZW0gd2FzIG1hcmtlZCBhcyBzZWxlY3RlZCxcbiAgICAgICAgICAgIC8vIHRyeSB0byBmaW5kIGFuZCBzZWxlY3QgaXQgbWFudWFsbHlcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1Ub1NlbGVjdCA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtcy5maW5kKGl0ZW0gPT5cbiAgICAgICAgICAgICAgICBpdGVtLnR5cGUgPT09ICdmaWxlJyAmJiBpdGVtLnZhbHVlID09PSBkZWZWYWxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBpZiAoaXRlbVRvU2VsZWN0KSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEV4cGFuZCBwYXJlbnQgZm9sZGVyIGJlZm9yZSBzZWxlY3RpbmcgZmlsZVxuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5leHBhbmRGb2xkZXJGb3JGaWxlKGl0ZW1Ub1NlbGVjdC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNldHRpbmcgc2VsZWN0ZWQgdmFsdWUgd2lsbCB0cmlnZ2VyIG9uQ2hhbmdlIGNhbGxiYWNrIHdoaWNoIGNhbGxzIHVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKVxuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBpdGVtVG9TZWxlY3QudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdyZWZyZXNoJyk7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldCB0ZXh0JywgaXRlbVRvU2VsZWN0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2ZpbGVuYW1lJywgaXRlbVRvU2VsZWN0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBIaWRlIHRoZSBkaW1tZXIgYWZ0ZXIgbG9hZGluZyBvbmx5IGlmIG5vIGZpbGUgaXMgc2VsZWN0ZWRcbiAgICAgICAgICAgICAgICBpZiAoIXN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBIaWRlIHRoZSBkaW1tZXIgYWZ0ZXIgbG9hZGluZyBvbmx5IGlmIG5vIGZpbGUgaXMgc2VsZWN0ZWRcbiAgICAgICAgICAgIGlmICghc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBNYXJrIGluaXRpYWxpemF0aW9uIGFzIGNvbXBsZXRlIHRvIGFsbG93IGhhc2hjaGFuZ2UgaGFuZGxlciB0byB3b3JrXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNJbml0aWFsaXppbmcgPSBmYWxzZTtcbiAgICAgICAgfSwgMjAwKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgY2hhbmdpbmcgdGhlIGxvZyBmaWxlIGluIHRoZSBzZWxlY3QgZHJvcGRvd24uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHNlbGVjdGVkIHZhbHVlLlxuICAgICAqL1xuICAgIGNiT25DaGFuZ2VGaWxlKHZhbHVlKSB7XG4gICAgICAgIGlmICh2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBkcm9wZG93biB0ZXh0IHRvIHNob3cgdGhlIGZ1bGwgZmlsZSBwYXRoXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldCB0ZXh0JywgdmFsdWUpO1xuXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmaWxlbmFtZScsIHZhbHVlKTtcblxuICAgICAgICAvLyBVcGRhdGUgVVJMIGhhc2ggd2l0aCB0aGUgc2VsZWN0ZWQgZmlsZVxuICAgICAgICB3aW5kb3cubG9jYXRpb24uaGFzaCA9ICdmaWxlPScgKyBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpO1xuXG4gICAgICAgIC8vIFJlc2V0IGZpbHRlcnMgb25seSBpZiB1c2VyIG1hbnVhbGx5IGNoYW5nZWQgdGhlIGZpbGUgKG5vdCBkdXJpbmcgaW5pdGlhbGl6YXRpb24pXG4gICAgICAgIGlmICghc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNJbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnJlc2V0RmlsdGVycygpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSGlkZSBhdXRvLXJlZnJlc2ggYnV0dG9uIGZvciByb3RhdGVkIGxvZyBmaWxlcyAodGhleSBkb24ndCBjaGFuZ2UpXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUF1dG9SZWZyZXNoVmlzaWJpbGl0eSh2YWx1ZSk7XG5cbiAgICAgICAgLy8gUmVzZXQgbGFzdCBrbm93biBkYXRhIGVuZCBmb3IgbmV3IGZpbGVcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MubGFzdEtub3duRGF0YUVuZCA9IG51bGw7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGltZSByYW5nZSBpcyBhdmFpbGFibGUgZm9yIHRoaXMgZmlsZVxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jaGVja1RpbWVSYW5nZUF2YWlsYWJpbGl0eSh2YWx1ZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGZpbGUgaXMgYSByb3RhdGVkIGxvZyBmaWxlIChhcmNoaXZlZCwgbm8gbG9uZ2VyIGJlaW5nIHdyaXR0ZW4gdG8pXG4gICAgICogUm90YXRlZCBmaWxlcyBoYXZlIHN1ZmZpeGVzIGxpa2U6IC4wLCAuMSwgLjIsIC5neiwgLjEuZ3osIC4yLmd6LCBldGMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVuYW1lIC0gTG9nIGZpbGUgcGF0aFxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGZpbGUgaXMgcm90YXRlZC9hcmNoaXZlZFxuICAgICAqL1xuICAgIGlzUm90YXRlZExvZ0ZpbGUoZmlsZW5hbWUpIHtcbiAgICAgICAgaWYgKCFmaWxlbmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIC8vIE1hdGNoIHBhdHRlcm5zOiAuMCwgLjEsIC4yLCAuLi4sIC5neiwgLjAuZ3osIC4xLmd6LCBldGMuXG4gICAgICAgIHJldHVybiAvXFwuXFxkKygkfFxcLmd6JCl8XFwuZ3okLy50ZXN0KGZpbGVuYW1lKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGF1dG8tcmVmcmVzaCBidXR0b24gdmlzaWJpbGl0eSBiYXNlZCBvbiBmaWxlIHR5cGVcbiAgICAgKiBIaWRlIGZvciByb3RhdGVkIGZpbGVzLCBzaG93IGZvciBhY3RpdmUgbG9nIGZpbGVzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVuYW1lIC0gTG9nIGZpbGUgcGF0aFxuICAgICAqL1xuICAgIHVwZGF0ZUF1dG9SZWZyZXNoVmlzaWJpbGl0eShmaWxlbmFtZSkge1xuICAgICAgICBjb25zdCAkYXV0b0J0biA9ICQoJyNzaG93LWxhc3QtbG9nLWF1dG8nKTtcbiAgICAgICAgY29uc3QgaXNSb3RhdGVkID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNSb3RhdGVkTG9nRmlsZShmaWxlbmFtZSk7XG5cbiAgICAgICAgaWYgKGlzUm90YXRlZCkge1xuICAgICAgICAgICAgLy8gU3RvcCBhdXRvLXJlZnJlc2ggaWYgaXQgd2FzIGFjdGl2ZVxuICAgICAgICAgICAgaWYgKHN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgICAgICRhdXRvQnRuLmZpbmQoJy5pY29ucyBpLnJlZnJlc2gnKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHVwZGF0ZUxvZ1ZpZXdXb3JrZXIuc3RvcCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJGF1dG9CdG4uaGlkZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJGF1dG9CdG4uc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3cgZmlsdGVyIHR5cGUgcG9wdXAgYmVsb3cgdGhlIGZpbHRlciBpbnB1dC5cbiAgICAgKiBQcmUtc2VsZWN0cyB0aGUgZmlyc3Qgb3B0aW9uIGZvciBpbW1lZGlhdGUga2V5Ym9hcmQgbmF2aWdhdGlvbi5cbiAgICAgKi9cbiAgICBzaG93RmlsdGVyVHlwZVBvcHVwKCkge1xuICAgICAgICBjb25zdCAkcG9wdXAgPSAkKCcjZmlsdGVyLXR5cGUtcG9wdXAnKTtcbiAgICAgICAgJHBvcHVwLnJlbW92ZUNsYXNzKCdoaWRkZW4nKVxuICAgICAgICAgICAgLmNzcyh7dG9wOiAnJywgbGVmdDogJycsIGRpc3BsYXk6ICcnfSlcbiAgICAgICAgICAgIC5zaG93KCk7XG4gICAgICAgIC8vIFByZS1zZWxlY3QgZmlyc3Qgb3B0aW9uIGZvciBrZXlib2FyZCBuYXZpZ2F0aW9uXG4gICAgICAgICRwb3B1cC5maW5kKCcuZmlsdGVyLXR5cGUtb3B0aW9uJykucmVtb3ZlQ2xhc3MoJ2ZvY3VzZWQnKTtcbiAgICAgICAgJHBvcHVwLmZpbmQoJy5maWx0ZXItdHlwZS1vcHRpb24nKS5maXJzdCgpLmFkZENsYXNzKCdmb2N1c2VkJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhpZGUgdGhlIGZpbHRlciB0eXBlIHBvcHVwXG4gICAgICovXG4gICAgaGlkZUZpbHRlclR5cGVQb3B1cCgpIHtcbiAgICAgICAgY29uc3QgJHBvcHVwID0gJCgnI2ZpbHRlci10eXBlLXBvcHVwJyk7XG4gICAgICAgICRwb3B1cC5maW5kKCcuZmlsdGVyLXR5cGUtb3B0aW9uJykucmVtb3ZlQ2xhc3MoJ2ZvY3VzZWQnKTtcbiAgICAgICAgJHBvcHVwLmFkZENsYXNzKCdoaWRkZW4nKS5oaWRlKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIE5hdmlnYXRlIGZpbHRlciB0eXBlIHBvcHVwIG9wdGlvbnMgd2l0aCBhcnJvdyBrZXlzLlxuICAgICAqIFdyYXBzIGFyb3VuZCBhdCBib3VuZGFyaWVzLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBkaXJlY3Rpb24gLSAxIGZvciBkb3duLCAtMSBmb3IgdXBcbiAgICAgKi9cbiAgICBuYXZpZ2F0ZUZpbHRlclBvcHVwKGRpcmVjdGlvbikge1xuICAgICAgICBjb25zdCAkcG9wdXAgPSAkKCcjZmlsdGVyLXR5cGUtcG9wdXAnKTtcbiAgICAgICAgY29uc3QgJG9wdGlvbnMgPSAkcG9wdXAuZmluZCgnLmZpbHRlci10eXBlLW9wdGlvbicpO1xuICAgICAgICBjb25zdCAkZm9jdXNlZCA9ICRvcHRpb25zLmZpbHRlcignLmZvY3VzZWQnKTtcblxuICAgICAgICBsZXQgaW5kZXggPSAkb3B0aW9ucy5pbmRleCgkZm9jdXNlZCk7XG4gICAgICAgIGluZGV4ICs9IGRpcmVjdGlvbjtcblxuICAgICAgICAvLyBXcmFwIGFyb3VuZFxuICAgICAgICBpZiAoaW5kZXggPCAwKSB7XG4gICAgICAgICAgICBpbmRleCA9ICRvcHRpb25zLmxlbmd0aCAtIDE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGluZGV4ID49ICRvcHRpb25zLmxlbmd0aCkge1xuICAgICAgICAgICAgaW5kZXggPSAwO1xuICAgICAgICB9XG5cbiAgICAgICAgJG9wdGlvbnMucmVtb3ZlQ2xhc3MoJ2ZvY3VzZWQnKTtcbiAgICAgICAgJG9wdGlvbnMuZXEoaW5kZXgpLmFkZENsYXNzKCdmb2N1c2VkJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZCBhIGZpbHRlciBjb25kaXRpb24sIHN5bmMgdG8gZm9ybSwgcmVuZGVyIGxhYmVscywgYW5kIHJlbG9hZCBsb2dcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZSAtICdjb250YWlucycgb3IgJ25vdENvbnRhaW5zJ1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIHRoZSBmaWx0ZXIgdGV4dFxuICAgICAqL1xuICAgIGFkZEZpbHRlckNvbmRpdGlvbih0eXBlLCB2YWx1ZSkge1xuICAgICAgICBpZiAoIXZhbHVlIHx8IHZhbHVlLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5maWx0ZXJDb25kaXRpb25zLnB1c2goe3R5cGUsIHZhbHVlOiB2YWx1ZS50cmltKCl9KTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Muc3luY0ZpbHRlckNvbmRpdGlvbnNUb0Zvcm0oKTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MucmVuZGVyRmlsdGVyTGFiZWxzKCk7XG4gICAgICAgICQoJyNmaWx0ZXItaW5wdXQnKS52YWwoJycpO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy51cGRhdGVMb2dGcm9tU2VydmVyKHRydWUpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmUgYSBmaWx0ZXIgY29uZGl0aW9uIGJ5IGluZGV4XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGluZGV4IC0gY29uZGl0aW9uIGluZGV4IHRvIHJlbW92ZVxuICAgICAqL1xuICAgIHJlbW92ZUZpbHRlckNvbmRpdGlvbihpbmRleCkge1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5maWx0ZXJDb25kaXRpb25zLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnN5bmNGaWx0ZXJDb25kaXRpb25zVG9Gb3JtKCk7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnJlbmRlckZpbHRlckxhYmVscygpO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy51cGRhdGVMb2dGcm9tU2VydmVyKHRydWUpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDbGVhciBhbGwgZmlsdGVyIGNvbmRpdGlvbnNcbiAgICAgKi9cbiAgICBjbGVhckFsbEZpbHRlckNvbmRpdGlvbnMoKSB7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmZpbHRlckNvbmRpdGlvbnMgPSBbXTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Muc3luY0ZpbHRlckNvbmRpdGlvbnNUb0Zvcm0oKTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MucmVuZGVyRmlsdGVyTGFiZWxzKCk7XG4gICAgICAgICQoJyNmaWx0ZXItaW5wdXQnKS52YWwoJycpO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy51cGRhdGVMb2dGcm9tU2VydmVyKHRydWUpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXJpYWxpemUgZmlsdGVyQ29uZGl0aW9ucyBhcnJheSBhcyBKU09OIGludG8gaGlkZGVuICNmaWx0ZXIgZmllbGRcbiAgICAgKi9cbiAgICBzeW5jRmlsdGVyQ29uZGl0aW9uc1RvRm9ybSgpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5maWx0ZXJDb25kaXRpb25zLmxlbmd0aCA+IDBcbiAgICAgICAgICAgID8gSlNPTi5zdHJpbmdpZnkoc3lzdGVtRGlhZ25vc3RpY0xvZ3MuZmlsdGVyQ29uZGl0aW9ucylcbiAgICAgICAgICAgIDogJyc7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmaWx0ZXInLCB2YWx1ZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbmRlciBsYWJlbCBjaGlwcyBpbnNpZGUgI2ZpbHRlci1sYWJlbHMgZnJvbSBmaWx0ZXJDb25kaXRpb25zXG4gICAgICovXG4gICAgcmVuZGVyRmlsdGVyTGFiZWxzKCkge1xuICAgICAgICBjb25zdCAkY29udGFpbmVyID0gJCgnI2ZpbHRlci1sYWJlbHMnKTtcbiAgICAgICAgJGNvbnRhaW5lci5lbXB0eSgpO1xuXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmZpbHRlckNvbmRpdGlvbnMuZm9yRWFjaCgoY29uZGl0aW9uLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY3NzQ2xhc3MgPSBjb25kaXRpb24udHlwZSA9PT0gJ25vdENvbnRhaW5zJyA/ICdub3QtY29udGFpbnMnIDogJ2NvbnRhaW5zJztcbiAgICAgICAgICAgIGNvbnN0IGljb25DbGFzcyA9IGNvbmRpdGlvbi50eXBlID09PSAnbm90Q29udGFpbnMnID8gJ2JhbicgOiAnY2hlY2sgY2lyY2xlJztcbiAgICAgICAgICAgIGNvbnN0IGljb25Db2xvciA9IGNvbmRpdGlvbi50eXBlID09PSAnbm90Q29udGFpbnMnID8gJ3JlZCcgOiAndGVhbCc7XG4gICAgICAgICAgICBjb25zdCAkbGFiZWwgPSAkKGA8c3BhbiBjbGFzcz1cImZpbHRlci1jb25kaXRpb24tbGFiZWwgJHtjc3NDbGFzc31cIiBkYXRhLWluZGV4PVwiJHtpbmRleH1cIj48L3NwYW4+YCk7XG4gICAgICAgICAgICAkbGFiZWwuYXBwZW5kKGA8aSBjbGFzcz1cIiR7aWNvbkNsYXNzfSBpY29uICR7aWNvbkNvbG9yfVwiPjwvaT5gKTtcbiAgICAgICAgICAgICRsYWJlbC5hcHBlbmQoYDxzcGFuPiR7JCgnPHNwYW4+JykudGV4dChjb25kaXRpb24udmFsdWUpLmh0bWwoKX08L3NwYW4+YCk7XG4gICAgICAgICAgICAkbGFiZWwuYXBwZW5kKCc8aSBjbGFzcz1cImRlbGV0ZSBpY29uXCI+PC9pPicpO1xuICAgICAgICAgICAgJGNvbnRhaW5lci5hcHBlbmQoJGxhYmVsKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZmlsdGVyIGNvbmRpdGlvbnMgZnJvbSBVUkwgcGFyYW1ldGVyIG9yIGV4aXN0aW5nIGhpZGRlbiBmaWVsZCB2YWx1ZS5cbiAgICAgKiBIYW5kbGVzIGxlZ2FjeSBwbGFpbi1zdHJpbmcgZm9ybWF0IChlLmcuIFwiW0MtMDAwMDQ3MjFdJltDLTAwMDA0NzIzXVwiIGZyb20gQ0RSIGxpbmtzKVxuICAgICAqIGJ5IGNvbnZlcnRpbmcgJi1zZXBhcmF0ZWQgcGFydHMgaW50byBpbmRpdmlkdWFsIFwiY29udGFpbnNcIiBjb25kaXRpb25zLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVGaWx0ZXJGcm9tVXJsKCkge1xuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICBjb25zdCBmaWx0ZXJQYXJhbSA9IHVybFBhcmFtcy5nZXQoJ2ZpbHRlcicpO1xuXG4gICAgICAgIGlmIChmaWx0ZXJQYXJhbSAmJiBmaWx0ZXJQYXJhbS50cmltKCkgIT09ICcnKSB7XG4gICAgICAgICAgICBjb25zdCB0cmltbWVkID0gZmlsdGVyUGFyYW0udHJpbSgpO1xuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiBpdCdzIEpTT04gZm9ybWF0XG4gICAgICAgICAgICBpZiAodHJpbW1lZC5zdGFydHNXaXRoKCdbJykpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKHRyaW1tZWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShwYXJzZWQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5maWx0ZXJDb25kaXRpb25zID0gcGFyc2VkLmZpbHRlcihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoYykgPT4gYyAmJiBjLnZhbHVlICYmIGMudHlwZVxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSW52YWxpZCBKU09OLCB0cmVhdCBhcyBsZWdhY3lcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuZmlsdGVyQ29uZGl0aW9ucyA9IHRyaW1tZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zcGxpdCgnJicpXG4gICAgICAgICAgICAgICAgICAgICAgICAubWFwKChwKSA9PiBwLnRyaW0oKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoKHApID0+IHAgIT09ICcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLm1hcCgocCkgPT4gKHt0eXBlOiAnY29udGFpbnMnLCB2YWx1ZTogcH0pKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIExlZ2FjeSBwbGFpbiBzdHJpbmc6IHNwbGl0IGJ5ICYgaW50byBjb250YWlucyBjb25kaXRpb25zXG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuZmlsdGVyQ29uZGl0aW9ucyA9IHRyaW1tZWRcbiAgICAgICAgICAgICAgICAgICAgLnNwbGl0KCcmJylcbiAgICAgICAgICAgICAgICAgICAgLm1hcCgocCkgPT4gcC50cmltKCkpXG4gICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoKHApID0+IHAgIT09ICcnKVxuICAgICAgICAgICAgICAgICAgICAubWFwKChwKSA9PiAoe3R5cGU6ICdjb250YWlucycsIHZhbHVlOiBwfSkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5zeW5jRmlsdGVyQ29uZGl0aW9uc1RvRm9ybSgpO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MucmVuZGVyRmlsdGVyTGFiZWxzKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVzZXQgYWxsIGZpbHRlcnMgd2hlbiBjaGFuZ2luZyBsb2cgZmlsZXNcbiAgICAgKi9cbiAgICByZXNldEZpbHRlcnMoKSB7XG4gICAgICAgIC8vIERlYWN0aXZhdGUgYWxsIHF1aWNrLXBlcmlvZCBidXR0b25zXG4gICAgICAgICQoJy5wZXJpb2QtYnRuJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuXG4gICAgICAgIC8vIFJlc2V0IGxvZ0xldmVsIGRyb3Bkb3duIHRvIGRlZmF1bHQgKEFsbCBMZXZlbHMgLSBlbXB0eSB2YWx1ZSlcbiAgICAgICAgJCgnI2xvZ0xldmVsLWRyb3Bkb3duJykuZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsICcnKTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2xvZ0xldmVsJywgJycpO1xuXG4gICAgICAgIC8vIE5PVEU6IEZpbHRlciBjb25kaXRpb25zIGFyZSBpbnRlbnRpb25hbGx5IHByZXNlcnZlZCB3aGVuIGNoYW5naW5nIGZpbGVzLlxuICAgICAgICAvLyBXaGVuIHVzZXIgbmF2aWdhdGVzIGZyb20gQ0RSIHdpdGggZmlsdGVyIHBhcmFtcyAoZS5nLiA/ZmlsdGVyPVtDLTAwMDA0NzIxXSksXG4gICAgICAgIC8vIHRoZSBmaWx0ZXJzIHNob3VsZCBwZXJzaXN0IGFjcm9zcyBmaWxlIGNoYW5nZXMgKHZlcmJvc2Ug4oaSIHZlcmJvc2UuMCkuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwZXJpb2QgYnV0dG9ucyB2aXNpYmlsaXR5IGJhc2VkIG9uIGxvZyBmaWxlIGR1cmF0aW9uXG4gICAgICogU2hvd3Mgb25seSBidXR0b25zIGZvciBwZXJpb2RzIHRoYXQgYXJlIDw9IGxvZyBmaWxlIGR1cmF0aW9uXG4gICAgICogSGlkZXMgZW50aXJlIGNvbnRhaW5lciBpZiBubyBidXR0b25zIGFyZSB2aXNpYmxlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGxvZ0R1cmF0aW9uIC0gTG9nIGZpbGUgZHVyYXRpb24gaW4gc2Vjb25kc1xuICAgICAqL1xuICAgIHVwZGF0ZVBlcmlvZEJ1dHRvbnNWaXNpYmlsaXR5KGxvZ0R1cmF0aW9uKSB7XG4gICAgICAgIGNvbnN0ICRwZXJpb2RCdXR0b25zID0gJCgnLnBlcmlvZC1idG4nKTtcbiAgICAgICAgY29uc3QgJHBlcmlvZENvbnRhaW5lciA9ICQoJyNwZXJpb2QtYnV0dG9ucycpO1xuICAgICAgICBsZXQgbGFyZ2VzdFZpc2libGVQZXJpb2QgPSAwO1xuICAgICAgICBsZXQgJGxhcmdlc3RWaXNpYmxlQnV0dG9uID0gbnVsbDtcbiAgICAgICAgbGV0IHZpc2libGVDb3VudCA9IDA7XG5cbiAgICAgICAgJHBlcmlvZEJ1dHRvbnMuZWFjaCgoaW5kZXgsIGJ1dHRvbikgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQoYnV0dG9uKTtcbiAgICAgICAgICAgIGNvbnN0IHBlcmlvZCA9IHBhcnNlSW50KCRidXR0b24uZGF0YSgncGVyaW9kJyksIDEwKTtcblxuICAgICAgICAgICAgLy8gU2hvdyBidXR0b24gaWYgcGVyaW9kIGlzIGxlc3MgdGhhbiBvciBlcXVhbCB0byBsb2cgZHVyYXRpb25cbiAgICAgICAgICAgIC8vIEFkZCAxMCUgdG9sZXJhbmNlIGZvciByb3VuZGluZy9lZGdlIGNhc2VzXG4gICAgICAgICAgICBpZiAocGVyaW9kIDw9IGxvZ0R1cmF0aW9uICogMS4xKSB7XG4gICAgICAgICAgICAgICAgJGJ1dHRvbi5zaG93KCk7XG4gICAgICAgICAgICAgICAgdmlzaWJsZUNvdW50Kys7XG4gICAgICAgICAgICAgICAgLy8gVHJhY2sgdGhlIGxhcmdlc3QgdmlzaWJsZSBwZXJpb2QgZm9yIGRlZmF1bHQgc2VsZWN0aW9uXG4gICAgICAgICAgICAgICAgaWYgKHBlcmlvZCA+IGxhcmdlc3RWaXNpYmxlUGVyaW9kKSB7XG4gICAgICAgICAgICAgICAgICAgIGxhcmdlc3RWaXNpYmxlUGVyaW9kID0gcGVyaW9kO1xuICAgICAgICAgICAgICAgICAgICAkbGFyZ2VzdFZpc2libGVCdXR0b24gPSAkYnV0dG9uO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJGJ1dHRvbi5oaWRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhpZGUgZW50aXJlIGNvbnRhaW5lciBpZiBubyBidXR0b25zIGFyZSB2aXNpYmxlXG4gICAgICAgIC8vIEFsc28gdG9nZ2xlIGNsYXNzIG9uIHBhcmVudCB0byByZW1vdmUgZ2FwIGZvciBwcm9wZXIgYWxpZ25tZW50XG4gICAgICAgIGNvbnN0ICR0aW1lQ29udHJvbHNJbmxpbmUgPSAkKCcudGltZS1jb250cm9scy1pbmxpbmUnKTtcbiAgICAgICAgaWYgKHZpc2libGVDb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgJHBlcmlvZENvbnRhaW5lci5oaWRlKCk7XG4gICAgICAgICAgICAkdGltZUNvbnRyb2xzSW5saW5lLmFkZENsYXNzKCduby1wZXJpb2QtYnV0dG9ucycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJHBlcmlvZENvbnRhaW5lci5zaG93KCk7XG4gICAgICAgICAgICAkdGltZUNvbnRyb2xzSW5saW5lLnJlbW92ZUNsYXNzKCduby1wZXJpb2QtYnV0dG9ucycpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0IGxhcmdlc3QgdmlzaWJsZSBidXR0b24gYXMgYWN0aXZlIChpZiBubyBidXR0b24gaXMgY3VycmVudGx5IGFjdGl2ZSlcbiAgICAgICAgaWYgKCRsYXJnZXN0VmlzaWJsZUJ1dHRvbiAmJiAhJHBlcmlvZEJ1dHRvbnMuZmlsdGVyKCcuYWN0aXZlJykuaXMoJzp2aXNpYmxlJykpIHtcbiAgICAgICAgICAgICRwZXJpb2RCdXR0b25zLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgICRsYXJnZXN0VmlzaWJsZUJ1dHRvbi5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgdGltZSByYW5nZSBpcyBhdmFpbGFibGUgZm9yIHRoZSBzZWxlY3RlZCBsb2cgZmlsZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlbmFtZSAtIExvZyBmaWxlIHBhdGhcbiAgICAgKi9cbiAgICBjaGVja1RpbWVSYW5nZUF2YWlsYWJpbGl0eShmaWxlbmFtZSkge1xuICAgICAgICAvLyBTaG93IGRpbW1lciBvbmx5IGlmIG5vdCBpbiBhdXRvLXVwZGF0ZSBtb2RlXG4gICAgICAgIGlmICghc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlKSB7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBUcnkgdG8gZ2V0IHRpbWUgcmFuZ2UgZm9yIHRoaXMgZmlsZVxuICAgICAgICAgICAgU3lzbG9nQVBJLmdldExvZ1RpbWVSYW5nZShmaWxlbmFtZSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEudGltZV9yYW5nZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBUaW1lIHJhbmdlIGlzIGF2YWlsYWJsZSAtIHVzZSB0aW1lLWJhc2VkIG5hdmlnYXRpb25cbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaW5pdGlhbGl6ZU5hdmlnYXRpb24ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVGltZSByYW5nZSBub3QgYXZhaWxhYmxlIC0gdXNlIGxpbmUgbnVtYmVyIGZhbGxiYWNrXG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmluaXRpYWxpemVOYXZpZ2F0aW9uKG51bGwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgY2hlY2tpbmcgdGltZSByYW5nZTonLCBlcnJvcik7XG4gICAgICAgICAgICAvLyBGYWxsYmFjayB0byBsaW5lIG51bWJlciBtb2RlXG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pbml0aWFsaXplTmF2aWdhdGlvbihudWxsKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHVuaXZlcnNhbCBuYXZpZ2F0aW9uIHdpdGggdGltZSBvciBsaW5lIG51bWJlciBtb2RlXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHRpbWVSYW5nZURhdGEgLSBUaW1lIHJhbmdlIGRhdGEgZnJvbSBBUEkgKG9wdGlvbmFsKVxuICAgICAqL1xuICAgIGluaXRpYWxpemVOYXZpZ2F0aW9uKHRpbWVSYW5nZURhdGEpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgd2UgaGF2ZSB2YWxpZCB0aW1lIHJhbmdlIHdpdGggYWN0dWFsIHRpbWVzdGFtcHMgKG5vdCBudWxsKVxuICAgICAgICBjb25zdCBoYXNWYWxpZFRpbWVSYW5nZSA9IHRpbWVSYW5nZURhdGEgJiZcbiAgICAgICAgICAgIHRpbWVSYW5nZURhdGEudGltZV9yYW5nZSAmJlxuICAgICAgICAgICAgdHlwZW9mIHRpbWVSYW5nZURhdGEudGltZV9yYW5nZS5zdGFydCA9PT0gJ251bWJlcicgJiZcbiAgICAgICAgICAgIHR5cGVvZiB0aW1lUmFuZ2VEYXRhLnRpbWVfcmFuZ2UuZW5kID09PSAnbnVtYmVyJztcblxuICAgICAgICAvLyBDaGVjayBpZiB0aW1lIHJhbmdlIGlzIG1lYW5pbmdmdWwgKG1vcmUgdGhhbiAxIHNlY29uZCBvZiBkYXRhKVxuICAgICAgICBjb25zdCBoYXNNdWx0aXBsZVRpbWVzdGFtcHMgPSBoYXNWYWxpZFRpbWVSYW5nZSAmJlxuICAgICAgICAgICAgKHRpbWVSYW5nZURhdGEudGltZV9yYW5nZS5lbmQgLSB0aW1lUmFuZ2VEYXRhLnRpbWVfcmFuZ2Uuc3RhcnQpID4gMTtcblxuICAgICAgICBpZiAoaGFzVmFsaWRUaW1lUmFuZ2UgJiYgaGFzTXVsdGlwbGVUaW1lc3RhbXBzKSB7XG4gICAgICAgICAgICAvLyBUaW1lLWJhc2VkIG1vZGVcbiAgICAgICAgICAgIHRoaXMudGltZVNsaWRlckVuYWJsZWQgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VGltZVJhbmdlID0gdGltZVJhbmdlRGF0YS50aW1lX3JhbmdlO1xuXG4gICAgICAgICAgICAvLyBDYWxjdWxhdGUgbG9nIGZpbGUgZHVyYXRpb24gYW5kIHVwZGF0ZSBwZXJpb2QgYnV0dG9ucyB2aXNpYmlsaXR5XG4gICAgICAgICAgICBjb25zdCBsb2dEdXJhdGlvbiA9IHRoaXMuY3VycmVudFRpbWVSYW5nZS5lbmQgLSB0aGlzLmN1cnJlbnRUaW1lUmFuZ2Uuc3RhcnQ7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVBlcmlvZEJ1dHRvbnNWaXNpYmlsaXR5KGxvZ0R1cmF0aW9uKTtcblxuICAgICAgICAgICAgLy8gU2hvdyBwZXJpb2QgYnV0dG9ucyBmb3IgdGltZS1iYXNlZCBuYXZpZ2F0aW9uXG4gICAgICAgICAgICAkKCcjcGVyaW9kLWJ1dHRvbnMnKS5zaG93KCk7XG5cbiAgICAgICAgICAgIC8vIFNldCBzZXJ2ZXIgdGltZXpvbmUgb2Zmc2V0XG4gICAgICAgICAgICBpZiAodGltZVJhbmdlRGF0YS5zZXJ2ZXJfdGltZXpvbmVfb2Zmc2V0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBTVkdUaW1lbGluZS5zZXJ2ZXJUaW1lem9uZU9mZnNldCA9IHRpbWVSYW5nZURhdGEuc2VydmVyX3RpbWV6b25lX29mZnNldDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBTVkcgdGltZWxpbmUgd2l0aCB0aW1lIHJhbmdlXG4gICAgICAgICAgICBTVkdUaW1lbGluZS5pbml0aWFsaXplKCcjdGltZS1zbGlkZXItY29udGFpbmVyJywgdGhpcy5jdXJyZW50VGltZVJhbmdlKTtcblxuICAgICAgICAgICAgLy8gU2V0IGNhbGxiYWNrIGZvciB0aW1lIHdpbmRvdyBjaGFuZ2VzXG4gICAgICAgICAgICAvLyBBbHdheXMgdXNlIGxhdGVzdD10cnVlIHNvIHRoZSBtb3N0IHJlY2VudCBsb2cgZW50cmllcyBhcmUgZGlzcGxheWVkXG4gICAgICAgICAgICAvLyBUcnVuY2F0aW9uIChpZiBhbnkpIGhhcHBlbnMgb24gdGhlIGxlZnQgc2lkZSwgd2hpY2ggaXMgbGVzcyBkaXNydXB0aXZlXG4gICAgICAgICAgICBTVkdUaW1lbGluZS5vblJhbmdlQ2hhbmdlID0gKHN0YXJ0LCBlbmQsIGRyYWdnZWRIYW5kbGUpID0+IHtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2FkTG9nQnlUaW1lUmFuZ2Uoc3RhcnQsIGVuZCwgdHJ1ZSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBTZXQgY2FsbGJhY2sgZm9yIHRydW5jYXRlZCB6b25lIGNsaWNrc1xuICAgICAgICAgICAgLy8gTGVmdCB6b25lcyAodGltZWxpbmUtdHJ1bmNhdGVkLWxlZnQpOiBkYXRhIHdhcyBjdXQgZnJvbSBiZWdpbm5pbmcsIGxvYWQgd2l0aCBsYXRlc3Q9dHJ1ZVxuICAgICAgICAgICAgLy8gUmlnaHQgem9uZXMgKHRpbWVsaW5lLXRydW5jYXRlZC1yaWdodCk6IGRhdGEgd2FzIGN1dCBmcm9tIGVuZCwgbG9hZCB3aXRoIGxhdGVzdD1mYWxzZVxuICAgICAgICAgICAgU1ZHVGltZWxpbmUub25UcnVuY2F0ZWRab25lQ2xpY2sgPSAoc3RhcnQsIGVuZCwgaXNMZWZ0Wm9uZSkgPT4ge1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmxvYWRMb2dCeVRpbWVSYW5nZShzdGFydCwgZW5kLCBpc0xlZnRab25lKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIExvYWQgaW5pdGlhbCBjaHVuayB3aXRoIGxhdGVzdD10cnVlIHRvIHNob3cgbmV3ZXN0IGVudHJpZXNcbiAgICAgICAgICAgIC8vIFBhc3MgaXNJbml0aWFsTG9hZD10cnVlIHRvIHN1cHByZXNzIHRydW5jYXRlZCB6b25lIGRpc3BsYXkgb24gZmlyc3QgbG9hZFxuICAgICAgICAgICAgLy8gVXNlIHRoZSBsYXJnZXN0IHZpc2libGUgcGVyaW9kIGJ1dHRvbiBvciAxIGhvdXIgYXMgZmFsbGJhY2tcbiAgICAgICAgICAgIGNvbnN0ICRhY3RpdmVCdXR0b24gPSAkKCcucGVyaW9kLWJ0bi5hY3RpdmU6dmlzaWJsZScpO1xuICAgICAgICAgICAgY29uc3QgaW5pdGlhbFBlcmlvZCA9ICRhY3RpdmVCdXR0b24ubGVuZ3RoID4gMFxuICAgICAgICAgICAgICAgID8gcGFyc2VJbnQoJGFjdGl2ZUJ1dHRvbi5kYXRhKCdwZXJpb2QnKSwgMTApXG4gICAgICAgICAgICAgICAgOiBNYXRoLm1pbigzNjAwLCBsb2dEdXJhdGlvbik7XG4gICAgICAgICAgICBjb25zdCBpbml0aWFsU3RhcnQgPSBNYXRoLm1heCh0aGlzLmN1cnJlbnRUaW1lUmFuZ2UuZW5kIC0gaW5pdGlhbFBlcmlvZCwgdGhpcy5jdXJyZW50VGltZVJhbmdlLnN0YXJ0KTtcbiAgICAgICAgICAgIHRoaXMubG9hZExvZ0J5VGltZVJhbmdlKGluaXRpYWxTdGFydCwgdGhpcy5jdXJyZW50VGltZVJhbmdlLmVuZCwgdHJ1ZSwgdHJ1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBMaW5lIG51bWJlciBmYWxsYmFjayBtb2RlXG4gICAgICAgICAgICB0aGlzLnRpbWVTbGlkZXJFbmFibGVkID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRUaW1lUmFuZ2UgPSBudWxsO1xuXG4gICAgICAgICAgICAvLyBIaWRlIHBlcmlvZCBidXR0b25zIGluIGxpbmUgbnVtYmVyIG1vZGVcbiAgICAgICAgICAgICQoJyNwZXJpb2QtYnV0dG9ucycpLmhpZGUoKTtcblxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBTVkcgdGltZWxpbmUgd2l0aCBsaW5lIG51bWJlcnNcbiAgICAgICAgICAgIC8vIEZvciBub3csIHVzZSBkZWZhdWx0IHJhbmdlIHVudGlsIHdlIGdldCB0b3RhbCBsaW5lIGNvdW50XG4gICAgICAgICAgICBjb25zdCBsaW5lUmFuZ2UgPSB7IHN0YXJ0OiAwLCBlbmQ6IDEwMDAwIH07XG4gICAgICAgICAgICBTVkdUaW1lbGluZS5pbml0aWFsaXplKCcjdGltZS1zbGlkZXItY29udGFpbmVyJywgbGluZVJhbmdlLCAnbGluZXMnKTtcblxuICAgICAgICAgICAgLy8gU2V0IGNhbGxiYWNrIGZvciBsaW5lIHJhbmdlIGNoYW5nZXNcbiAgICAgICAgICAgIFNWR1RpbWVsaW5lLm9uUmFuZ2VDaGFuZ2UgPSAoc3RhcnQsIGVuZCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIExvYWQgYnkgbGluZSBudW1iZXJzIChvZmZzZXQvbGluZXMpXG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9hZExvZ0J5TGluZXMoTWF0aC5mbG9vcihzdGFydCksIE1hdGguY2VpbChlbmQgLSBzdGFydCkpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gTG9hZCBpbml0aWFsIGxpbmVzXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGxvZyBieSBsaW5lIG51bWJlcnMgKGZvciBmaWxlcyB3aXRob3V0IHRpbWVzdGFtcHMpXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IG9mZnNldCAtIFN0YXJ0aW5nIGxpbmUgbnVtYmVyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGxpbmVzIC0gTnVtYmVyIG9mIGxpbmVzIHRvIGxvYWRcbiAgICAgKi9cbiAgICBsb2FkTG9nQnlMaW5lcyhvZmZzZXQsIGxpbmVzKSB7XG4gICAgICAgIC8vIFNob3cgZGltbWVyIG9ubHkgaWYgbm90IGluIGF1dG8tdXBkYXRlIG1vZGVcbiAgICAgICAgaWYgKCFzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUpIHtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcGFyYW1zID0ge1xuICAgICAgICAgICAgZmlsZW5hbWU6IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2ZpbGVuYW1lJyksXG4gICAgICAgICAgICBmaWx0ZXI6IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2ZpbHRlcicpIHx8ICcnLFxuICAgICAgICAgICAgbG9nTGV2ZWw6IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2xvZ0xldmVsJykgfHwgJycsXG4gICAgICAgICAgICBvZmZzZXQ6IE1hdGgubWF4KDAsIG9mZnNldCksXG4gICAgICAgICAgICBsaW5lczogTWF0aC5taW4oNTAwMCwgTWF0aC5tYXgoMTAwLCBsaW5lcykpXG4gICAgICAgIH07XG5cbiAgICAgICAgU3lzbG9nQVBJLmdldExvZ0Zyb21GaWxlKHBhcmFtcywgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAvLyBIaWRlIGRpbW1lciBvbmx5IGlmIG5vdCBpbiBhdXRvLXVwZGF0ZSBtb2RlXG4gICAgICAgICAgICBpZiAoIXN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhICYmICdjb250ZW50JyBpbiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgLy8gU2V0IGNvbnRlbnQgaW4gZWRpdG9yIChldmVuIGlmIGVtcHR5KVxuICAgICAgICAgICAgICAgIHRoaXMudmlld2VyLnNldFZhbHVlKHJlc3BvbnNlLmRhdGEuY29udGVudCB8fCAnJywgLTEpO1xuXG4gICAgICAgICAgICAgICAgLy8gR28gdG8gdGhlIGJlZ2lubmluZ1xuICAgICAgICAgICAgICAgIHRoaXMudmlld2VyLmdvdG9MaW5lKDEpO1xuICAgICAgICAgICAgICAgIHRoaXMudmlld2VyLnNjcm9sbFRvTGluZSgwLCB0cnVlLCB0cnVlLCAoKSA9PiB7fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGxvZyBieSB0aW1lIHJhbmdlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHN0YXJ0VGltZXN0YW1wIC0gU3RhcnQgdGltZXN0YW1wXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGVuZFRpbWVzdGFtcCAtIEVuZCB0aW1lc3RhbXBcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGxhdGVzdCAtIElmIHRydWUsIHJldHVybiBuZXdlc3QgbGluZXMgZmlyc3QgKGZvciBpbml0aWFsIGxvYWQpXG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc0luaXRpYWxMb2FkIC0gSWYgdHJ1ZSwgc3VwcHJlc3MgdHJ1bmNhdGVkIHpvbmUgZGlzcGxheVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNBdXRvVXBkYXRlIC0gSWYgdHJ1ZSwgc2tpcCB0aW1lbGluZSByZWNhbGN1bGF0aW9uIChvbmx5IHVwZGF0ZSBjb250ZW50KVxuICAgICAqL1xuICAgIGxvYWRMb2dCeVRpbWVSYW5nZShzdGFydFRpbWVzdGFtcCwgZW5kVGltZXN0YW1wLCBsYXRlc3QgPSBmYWxzZSwgaXNJbml0aWFsTG9hZCA9IGZhbHNlLCBpc0F1dG9VcGRhdGUgPSBmYWxzZSkge1xuICAgICAgICAvLyBTaG93IGRpbW1lciBvbmx5IGlmIG5vdCBpbiBhdXRvLXVwZGF0ZSBtb2RlXG4gICAgICAgIGlmICghc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlKSB7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IHtcbiAgICAgICAgICAgIGZpbGVuYW1lOiB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmaWxlbmFtZScpLFxuICAgICAgICAgICAgZmlsdGVyOiB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmaWx0ZXInKSB8fCAnJyxcbiAgICAgICAgICAgIGxvZ0xldmVsOiB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdsb2dMZXZlbCcpIHx8ICcnLFxuICAgICAgICAgICAgZGF0ZUZyb206IHN0YXJ0VGltZXN0YW1wLFxuICAgICAgICAgICAgZGF0ZVRvOiBlbmRUaW1lc3RhbXAsXG4gICAgICAgICAgICBsaW5lczogNTAwMCwgLy8gTWF4aW11bSBsaW5lcyB0byBsb2FkXG4gICAgICAgICAgICBsYXRlc3Q6IGxhdGVzdCAvLyBJZiB0cnVlLCByZXR1cm4gbmV3ZXN0IGxpbmVzICh0YWlsIHwgdGFjKVxuICAgICAgICB9O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBTeXNsb2dBUEkuZ2V0TG9nRnJvbUZpbGUocGFyYW1zLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEgJiYgJ2NvbnRlbnQnIGluIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3Q29udGVudCA9IHJlc3BvbnNlLmRhdGEuY29udGVudCB8fCAnJztcblxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNBdXRvVXBkYXRlICYmIG5ld0NvbnRlbnQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQXV0by11cGRhdGUgbW9kZTogYXBwZW5kIG9ubHkgbmV3IGxpbmVzXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50Q29udGVudCA9IHRoaXMudmlld2VyLmdldFZhbHVlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdMaW5lcyA9IHRoaXMuZmluZE5ld0xpbmVzKGN1cnJlbnRDb250ZW50LCBuZXdDb250ZW50KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5ld0xpbmVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBcHBlbmQgbmV3IGxpbmVzIGF0IHRoZSBlbmRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZXNzaW9uID0gdGhpcy52aWV3ZXIuc2Vzc2lvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBsYXN0Um93ID0gc2Vzc2lvbi5nZXRMZW5ndGgoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXNzaW9uLmluc2VydCh7IHJvdzogbGFzdFJvdywgY29sdW1uOiAwIH0sICdcXG4nICsgbmV3TGluZXMuam9pbignXFxuJykpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gR28gdG8gdGhlIGxhc3QgbGluZSB0byBmb2xsb3cgbmV3IGVudHJpZXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaW5hbFJvdyA9IHNlc3Npb24uZ2V0TGVuZ3RoKCkgLSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbmFsQ29sdW1uID0gc2Vzc2lvbi5nZXRMaW5lKGZpbmFsUm93KS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy52aWV3ZXIuZ290b0xpbmUoZmluYWxSb3cgKyAxLCBmaW5hbENvbHVtbik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBOb3JtYWwgbW9kZTogc2V0IGNvbnRlbnQgYW5kIGdvIHRvIGVuZFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy52aWV3ZXIuc2V0VmFsdWUobmV3Q29udGVudCwgLTEpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBHbyB0byB0aGUgZW5kIG9mIHRoZSBsb2dcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJvdyA9IHRoaXMudmlld2VyLnNlc3Npb24uZ2V0TGVuZ3RoKCkgLSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29sdW1uID0gdGhpcy52aWV3ZXIuc2Vzc2lvbi5nZXRMaW5lKHJvdykubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy52aWV3ZXIuZ290b0xpbmUocm93ICsgMSwgY29sdW1uKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIEFkanVzdCBzbGlkZXIgdG8gYWN0dWFsIGxvYWRlZCB0aW1lIHJhbmdlIChzaWxlbnRseSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEuYWN0dWFsX3JhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhY3R1YWwgPSByZXNwb25zZS5kYXRhLmFjdHVhbF9yYW5nZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQWx3YXlzIHVwZGF0ZSBmdWxsUmFuZ2UgYm91bmRhcnkgYmFzZWQgb24gYWN0dWFsIGRhdGEgZnJvbSBzZXJ2ZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgZW5zdXJlcyBuby1kYXRhIHpvbmVzIGRpc3BsYXkgY29ycmVjdGx5IGFmdGVyIHJlZnJlc2hcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3R1YWwuZW5kKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgU1ZHVGltZWxpbmUudXBkYXRlRGF0YUJvdW5kYXJ5KGFjdHVhbC5lbmQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRyYWNrIGxhc3Qga25vd24gZGF0YSBlbmQgZm9yIHJlZnJlc2ggYW5jaG9yaW5nXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MubGFzdEtub3duRGF0YUVuZCA9IGFjdHVhbC5lbmQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFsd2F5cyB1cGRhdGUgdGltZWxpbmUgd2l0aCBzZXJ2ZXIgcmVzcG9uc2UgKGV4Y2VwdCBkdXJpbmcgYXV0by11cGRhdGUpXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB1cGRhdGVGcm9tU2VydmVyUmVzcG9uc2UoKSBoYW5kbGVzOlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gLSBVcGRhdGluZyBzZWxlY3RlZFJhbmdlIHRvIGFjdHVhbCBkYXRhIGJvdW5kYXJpZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIC0gUHJlc2VydmluZyB2aXNpYmxlUmFuZ2UuZW5kIGlmIGl0IHdhcyBleHRlbmRlZCB0byBjdXJyZW50IHRpbWUgKGZvciBuby1kYXRhIHpvbmVzKVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gLSBNYW5hZ2luZyB0cnVuY2F0aW9uIHpvbmVzIGRpc3BsYXlcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXNBdXRvVXBkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgU1ZHVGltZWxpbmUudXBkYXRlRnJvbVNlcnZlclJlc3BvbnNlKGFjdHVhbCwgc3RhcnRUaW1lc3RhbXAsIGVuZFRpbWVzdGFtcCwgaXNJbml0aWFsTG9hZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBIaWRlIGRpbW1lciBvbmx5IGlmIG5vdCBpbiBhdXRvLXVwZGF0ZSBtb2RlXG4gICAgICAgICAgICAgICAgaWYgKCFzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBsb2FkaW5nIGxvZyBieSB0aW1lIHJhbmdlOicsIGVycm9yKTtcbiAgICAgICAgICAgIC8vIEhpZGUgZGltbWVyIG9ubHkgaWYgbm90IGluIGF1dG8tdXBkYXRlIG1vZGVcbiAgICAgICAgICAgIGlmICghc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXBwbHkgcXVpY2sgcGVyaW9kIHNlbGVjdGlvbiAoWWFuZGV4IENsb3VkIExvZ1ZpZXdlciBzdHlsZSlcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcGVyaW9kU2Vjb25kcyAtIFBlcmlvZCBpbiBzZWNvbmRzXG4gICAgICovXG4gICAgYXBwbHlRdWlja1BlcmlvZChwZXJpb2RTZWNvbmRzKSB7XG4gICAgICAgIGlmICghdGhpcy5jdXJyZW50VGltZVJhbmdlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2UgbmV3IGFwcGx5UGVyaW9kIG1ldGhvZCB0aGF0IGhhbmRsZXMgdmlzaWJsZSByYW5nZSBhbmQgYXV0by1jZW50ZXJpbmdcbiAgICAgICAgU1ZHVGltZWxpbmUuYXBwbHlQZXJpb2QocGVyaW9kU2Vjb25kcyk7XG4gICAgICAgIC8vIENhbGxiYWNrIHdpbGwgYmUgdHJpZ2dlcmVkIGF1dG9tYXRpY2FsbHkgYnkgU1ZHVGltZWxpbmVcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXBwbHkgbG9nIGxldmVsIGZpbHRlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBsZXZlbCAtIExvZyBsZXZlbCAoYWxsLCBlcnJvciwgd2FybmluZywgaW5mbywgZGVidWcpXG4gICAgICovXG4gICAgYXBwbHlMb2dMZXZlbEZpbHRlcihsZXZlbCkge1xuICAgICAgICBsZXQgZmlsdGVyUGF0dGVybiA9ICcnO1xuXG4gICAgICAgIC8vIENyZWF0ZSByZWdleCBwYXR0ZXJuIGJhc2VkIG9uIGxldmVsXG4gICAgICAgIHN3aXRjaCAobGV2ZWwpIHtcbiAgICAgICAgICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgICAgICAgICAgICBmaWx0ZXJQYXR0ZXJuID0gJ0VSUk9SfENSSVRJQ0FMfEZBVEFMJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3dhcm5pbmcnOlxuICAgICAgICAgICAgICAgIGZpbHRlclBhdHRlcm4gPSAnV0FSTklOR3xXQVJOJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2luZm8nOlxuICAgICAgICAgICAgICAgIGZpbHRlclBhdHRlcm4gPSAnSU5GTyc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdkZWJ1Zyc6XG4gICAgICAgICAgICAgICAgZmlsdGVyUGF0dGVybiA9ICdERUJVRyc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdhbGwnOlxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBmaWx0ZXJQYXR0ZXJuID0gJyc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgZmlsdGVyIGZpZWxkXG4gICAgICAgIHRoaXMuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2ZpbHRlcicsIGZpbHRlclBhdHRlcm4pO1xuXG4gICAgICAgIC8vIFJlbG9hZCBsb2dzIHdpdGggbmV3IGZpbHRlclxuICAgICAgICB0aGlzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRmV0Y2hlcyB0aGUgbG9nIGZpbGUgY29udGVudCBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBwcmVzZXJ2ZVJhbmdlIC0gSWYgdHJ1ZSwgdXNlIGN1cnJlbnQgU1ZHIHRpbWVsaW5lIHNlbGVjdGlvbiBpbnN0ZWFkIG9mXG4gICAgICogICByZWNhbGN1bGF0aW5nIHRvIFwibGFzdCAxIGhvdXJcIi4gVXNlZCB3aGVuIGZpbHRlci9sZXZlbCBjaGFuZ2VzIHRvIGtlZXAgdGhlIHNhbWUgdmlldy5cbiAgICAgKi9cbiAgICB1cGRhdGVMb2dGcm9tU2VydmVyKHByZXNlcnZlUmFuZ2UgPSBmYWxzZSkge1xuICAgICAgICBpZiAodGhpcy50aW1lU2xpZGVyRW5hYmxlZCkge1xuICAgICAgICAgICAgLy8gSW4gdGltZSBzbGlkZXIgbW9kZSwgcmVsb2FkIGN1cnJlbnQgd2luZG93XG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50VGltZVJhbmdlKSB7XG5cbiAgICAgICAgICAgICAgICAvLyBXaGVuIHByZXNlcnZlUmFuZ2UgaXMgdHJ1ZSAoZmlsdGVyL2xldmVsIGNoYW5nZSksIHVzZSBjdXJyZW50IHRpbWVsaW5lIHNlbGVjdGlvblxuICAgICAgICAgICAgICAgIC8vIFdIWTogQ2hhbmdpbmcgZmlsdGVycyBzaG91bGQgbm90IHJlc2V0IHRoZSB0aW1lIHdpbmRvdyDigJQgdXNlciBleHBlY3RzIHRvIHNlZVxuICAgICAgICAgICAgICAgIC8vIHRoZSBzYW1lIHBlcmlvZCB3aXRoIGRpZmZlcmVudCBmaWx0ZXJpbmcgYXBwbGllZFxuICAgICAgICAgICAgICAgIGlmIChwcmVzZXJ2ZVJhbmdlICYmIFNWR1RpbWVsaW5lLnNlbGVjdGVkUmFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2FkTG9nQnlUaW1lUmFuZ2UoXG4gICAgICAgICAgICAgICAgICAgICAgICBTVkdUaW1lbGluZS5zZWxlY3RlZFJhbmdlLnN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICAgICAgU1ZHVGltZWxpbmUuc2VsZWN0ZWRSYW5nZS5lbmQsXG4gICAgICAgICAgICAgICAgICAgICAgICB0cnVlLCBmYWxzZSwgdGhpcy5pc0F1dG9VcGRhdGVBY3RpdmVcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IG9uZUhvdXIgPSAzNjAwO1xuXG4gICAgICAgICAgICAgICAgLy8gR2V0IGN1cnJlbnQgZmlsZW5hbWUgdG8gY2hlY2sgaWYgaXQncyBhIHJvdGF0ZWQgbG9nIGZpbGVcbiAgICAgICAgICAgICAgICBjb25zdCBmaWxlbmFtZSA9IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2ZpbGVuYW1lJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNSb3RhdGVkID0gdGhpcy5pc1JvdGF0ZWRMb2dGaWxlKGZpbGVuYW1lKTtcblxuICAgICAgICAgICAgICAgIGxldCBlbmRUaW1lc3RhbXA7XG4gICAgICAgICAgICAgICAgbGV0IHN0YXJ0VGltZXN0YW1wO1xuXG4gICAgICAgICAgICAgICAgaWYgKGlzUm90YXRlZCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBGb3Igcm90YXRlZCBmaWxlczogdXNlIHRoZSBmaWxlJ3MgYWN0dWFsIHRpbWUgcmFuZ2VcbiAgICAgICAgICAgICAgICAgICAgLy8gUm90YXRlZCBmaWxlcyBkb24ndCByZWNlaXZlIG5ldyBkYXRhLCBzbyBjdXJyZW50VGltZVJhbmdlIGlzIGZpeGVkXG4gICAgICAgICAgICAgICAgICAgIGVuZFRpbWVzdGFtcCA9IHRoaXMuY3VycmVudFRpbWVSYW5nZS5lbmQ7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0VGltZXN0YW1wID0gTWF0aC5tYXgodGhpcy5jdXJyZW50VGltZVJhbmdlLmVuZCAtIG9uZUhvdXIsIHRoaXMuY3VycmVudFRpbWVSYW5nZS5zdGFydCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRm9yIGFjdGl2ZSBsb2cgZmlsZXM6IHVzZSBjdXJyZW50IHRpbWUgdG8gY2FwdHVyZSBuZXcgZW50cmllc1xuICAgICAgICAgICAgICAgICAgICBlbmRUaW1lc3RhbXAgPSBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBXSFk6IEFuY2hvciBzdGFydFRpbWVzdGFtcCB0byB0aGUgbGFzdCBrbm93biBkYXRhIGVuZCwgbm90IHdhbGwgY2xvY2sgdGltZS5cbiAgICAgICAgICAgICAgICAgICAgLy8gVXNpbmcgXCJub3cgLSBwZXJpb2RcIiBwcm9kdWNlcyBhbiBlbXB0eSByYW5nZSB3aGVuIHRoZSBmaWxlIGhhc24ndCBiZWVuXG4gICAgICAgICAgICAgICAgICAgIC8vIHdyaXR0ZW4gdG8gcmVjZW50bHkgKGUuZy4sIGlkbGUgbW9kdWxlIGxvZ3MgbGlrZSBNb2R1bGVBdXRvQ1JNL1NhbG9uU3luY2VyLmxvZykuXG4gICAgICAgICAgICAgICAgICAgIC8vIGxhc3RLbm93bkRhdGFFbmQgaG9sZHMgdGhlIGFjdHVhbCB0aW1lc3RhbXAgb2YgdGhlIGxhc3QgbGluZSBmcm9tIHRoZSBBUEkgcmVzcG9uc2UuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGFFbmQgPSB0aGlzLmxhc3RLbm93bkRhdGFFbmQgfHwgdGhpcy5jdXJyZW50VGltZVJhbmdlLmVuZDtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnRUaW1lc3RhbXAgPSBNYXRoLm1heChkYXRhRW5kIC0gb25lSG91ciwgdGhpcy5jdXJyZW50VGltZVJhbmdlLnN0YXJ0KTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgY3VycmVudFRpbWVSYW5nZS5lbmQgdG8gcmVmbGVjdCBuZXcgZGF0YSBhdmFpbGFiaWxpdHlcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50VGltZVJhbmdlLmVuZCA9IGVuZFRpbWVzdGFtcDtcblxuICAgICAgICAgICAgICAgICAgICAvLyBGT1JDRSB1cGRhdGUgdGhlIFNWRyB0aW1lbGluZSB2aXNpYmxlIHJhbmdlIHRvIGN1cnJlbnQgdGltZVxuICAgICAgICAgICAgICAgICAgICAvLyBmb3JjZT10cnVlIGVuc3VyZXMgdmlzaWJsZVJhbmdlLmVuZCBpcyBzZXQgZXZlbiBpZiBpdCB3YXMgYWxyZWFkeSA+PSBlbmRUaW1lc3RhbXBcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBoYW5kbGVzIHRpbWV6b25lIGRpZmZlcmVuY2VzIHdoZXJlIHNlcnZlciB0aW1lIG1pZ2h0IGFwcGVhciBcImluIHRoZSBmdXR1cmVcIlxuICAgICAgICAgICAgICAgICAgICBTVkdUaW1lbGluZS5leHRlbmRSYW5nZShlbmRUaW1lc3RhbXAsIHRydWUpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFVzZSBsYXRlc3Q9dHJ1ZSB0byBzaG93IG5ld2VzdCBlbnRyaWVzIChmb3Igc2hvdy1sYXN0LWxvZyAvIGF1dG8tdXBkYXRlIGJ1dHRvbnMpXG4gICAgICAgICAgICAgICAgLy8gUGFzcyBpc0F1dG9VcGRhdGU9dHJ1ZSB3aGVuIGF1dG8tcmVmcmVzaCBpcyBhY3RpdmUgdG8gcHJldmVudCB0aW1lbGluZSBmbGlja2VyaW5nXG4gICAgICAgICAgICAgICAgdGhpcy5sb2FkTG9nQnlUaW1lUmFuZ2Uoc3RhcnRUaW1lc3RhbXAsIGVuZFRpbWVzdGFtcCwgdHJ1ZSwgZmFsc2UsIHRoaXMuaXNBdXRvVXBkYXRlQWN0aXZlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIExpbmUgbnVtYmVyIG1vZGVcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgICAgIHBhcmFtcy5saW5lcyA9IDUwMDA7IC8vIE1heCBsaW5lc1xuICAgICAgICAgICAgU3lzbG9nQVBJLmdldExvZ0Zyb21GaWxlKHBhcmFtcywgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY2JVcGRhdGVMb2dUZXh0KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGaW5kIG5ldyBsaW5lcyB0aGF0IGFyZSBub3QgaW4gY3VycmVudCBjb250ZW50XG4gICAgICogQ29tcGFyZXMgbGFzdCBsaW5lcyBvZiBjdXJyZW50IGNvbnRlbnQgd2l0aCBuZXcgY29udGVudCB0byBmaW5kIG92ZXJsYXBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY3VycmVudENvbnRlbnQgLSBDdXJyZW50IGVkaXRvciBjb250ZW50XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5ld0NvbnRlbnQgLSBOZXcgY29udGVudCBmcm9tIHNlcnZlclxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gQXJyYXkgb2YgbmV3IGxpbmVzIHRvIGFwcGVuZFxuICAgICAqL1xuICAgIGZpbmROZXdMaW5lcyhjdXJyZW50Q29udGVudCwgbmV3Q29udGVudCkge1xuICAgICAgICBpZiAoIWN1cnJlbnRDb250ZW50IHx8IGN1cnJlbnRDb250ZW50LnRyaW0oKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIC8vIElmIGVkaXRvciBpcyBlbXB0eSwgYWxsIGxpbmVzIGFyZSBuZXdcbiAgICAgICAgICAgIHJldHVybiBuZXdDb250ZW50LnNwbGl0KCdcXG4nKS5maWx0ZXIobGluZSA9PiBsaW5lLnRyaW0oKS5sZW5ndGggPiAwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGN1cnJlbnRMaW5lcyA9IGN1cnJlbnRDb250ZW50LnNwbGl0KCdcXG4nKTtcbiAgICAgICAgY29uc3QgbmV3TGluZXMgPSBuZXdDb250ZW50LnNwbGl0KCdcXG4nKTtcblxuICAgICAgICAvLyBHZXQgbGFzdCBub24tZW1wdHkgbGluZSBmcm9tIGN1cnJlbnQgY29udGVudCBhcyBhbmNob3JcbiAgICAgICAgbGV0IGFuY2hvckxpbmUgPSAnJztcbiAgICAgICAgZm9yIChsZXQgaSA9IGN1cnJlbnRMaW5lcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRMaW5lc1tpXS50cmltKCkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGFuY2hvckxpbmUgPSBjdXJyZW50TGluZXNbaV07XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWFuY2hvckxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXdMaW5lcy5maWx0ZXIobGluZSA9PiBsaW5lLnRyaW0oKS5sZW5ndGggPiAwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZpbmQgYW5jaG9yIGxpbmUgaW4gbmV3IGNvbnRlbnRcbiAgICAgICAgbGV0IGFuY2hvckluZGV4ID0gLTE7XG4gICAgICAgIGZvciAobGV0IGkgPSBuZXdMaW5lcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgaWYgKG5ld0xpbmVzW2ldID09PSBhbmNob3JMaW5lKSB7XG4gICAgICAgICAgICAgICAgYW5jaG9ySW5kZXggPSBpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGFuY2hvckluZGV4ID09PSAtMSkge1xuICAgICAgICAgICAgLy8gQW5jaG9yIG5vdCBmb3VuZCAtIGNvbnRlbnQgY2hhbmdlZCBzaWduaWZpY2FudGx5LCByZXR1cm4gZW1wdHlcbiAgICAgICAgICAgIC8vIFRoaXMgcHJldmVudHMgZHVwbGljYXRlcyB3aGVuIGxvZyByb3RhdGVzIG9yIGZpbHRlciBjaGFuZ2VzXG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZXR1cm4gbGluZXMgYWZ0ZXIgYW5jaG9yXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IG5ld0xpbmVzLnNsaWNlKGFuY2hvckluZGV4ICsgMSkuZmlsdGVyKGxpbmUgPT4gbGluZS50cmltKCkubGVuZ3RoID4gMCk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhlIGxvZyB2aWV3LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIEFQSS5cbiAgICAgKi9cbiAgICBjYlVwZGF0ZUxvZ1RleHQocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gSGlkZSBkaW1tZXIgb25seSBpZiBub3QgaW4gYXV0by11cGRhdGUgbW9kZVxuICAgICAgICBpZiAoIXN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBIYW5kbGUgdjMgQVBJIHJlc3BvbnNlIHN0cnVjdHVyZVxuICAgICAgICBpZiAoIXJlc3BvbnNlIHx8ICFyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5tZXNzYWdlcykge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjb250ZW50ID0gcmVzcG9uc2UuZGF0YT8uY29udGVudCB8fCAnJztcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLmdldFNlc3Npb24oKS5zZXRWYWx1ZShjb250ZW50KTtcbiAgICAgICAgY29uc3Qgcm93ID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnNlc3Npb24uZ2V0TGVuZ3RoKCkgLSAxO1xuICAgICAgICBjb25zdCBjb2x1bW4gPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIuc2Vzc2lvbi5nZXRMaW5lKHJvdykubGVuZ3RoO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIuZ290b0xpbmUocm93ICsgMSwgY29sdW1uKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgY2xpY2tpbmcgdGhlIFwiRG93bmxvYWQgRmlsZVwiIGJ1dHRvbi5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZGF0YS5cbiAgICAgKi9cbiAgICBjYkRvd25sb2FkRmlsZShyZXNwb25zZSkge1xuICAgICAgICAvLyBIYW5kbGUgdjMgQVBJIHJlc3BvbnNlIHN0cnVjdHVyZVxuICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IHJlc3BvbnNlLmRhdGEuZmlsZW5hbWUgfHwgcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5tZXNzYWdlcykge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBjbGlja2luZyB0aGUgXCJFcmFzZSBGaWxlXCIgYnV0dG9uLlxuICAgICAqL1xuICAgIGVyYXNlQ3VycmVudEZpbGVDb250ZW50KCl7XG4gICAgICAgIGNvbnN0IGZpbGVOYW1lID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2ZpbGVuYW1lJyk7XG4gICAgICAgIGlmIChmaWxlTmFtZS5sZW5ndGg+MCl7XG4gICAgICAgICAgICBTeXNsb2dBUEkuZXJhc2VGaWxlKGZpbGVOYW1lLCBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jYkFmdGVyRmlsZUVyYXNlZClcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBjbGlja2luZyB0aGUgXCJFcmFzZSBGaWxlXCIgYnV0dG9uIGFuZCBjYWxsaW5nIFJFU1QgQVBJIGNvbW1hbmRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZGF0YS5cbiAgICAgKi9cbiAgICBjYkFmdGVyRmlsZUVyYXNlZChyZXNwb25zZSl7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQ9PT1mYWxzZSAmJiByZXNwb25zZS5tZXNzYWdlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudXBkYXRlTG9nRnJvbVNlcnZlcigpO1xuICAgICAgICB9XG4gICAgfSxcbn07XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBzaG93IHN5c3RlbSBsb2dzIHRhYlxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==