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
          html += "<div class=\"folder-header item\" data-folder=\"".concat(item.folderName, "\" data-value=\"\" data-text=\"").concat(item.folderName, "\" style=\"pointer-events: auto !important; cursor: pointer; font-weight: bold; background: #f9f9f9;\">").concat(item.name, "</div>");
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TeXN0ZW1EaWFnbm9zdGljL3N5c3RlbS1kaWFnbm9zdGljLWluZGV4LXNob3dsb2dzLmpzIl0sIm5hbWVzIjpbInN5c3RlbURpYWdub3N0aWNMb2dzIiwiJHNob3dCdG4iLCIkIiwiJGRvd25sb2FkQnRuIiwiJHNob3dBdXRvQnRuIiwiJGVyYXNlQnRuIiwiJGxvZ0NvbnRlbnQiLCJ2aWV3ZXIiLCIkZmlsZVNlbGVjdERyb3BEb3duIiwibG9nc0l0ZW1zIiwiJGRpbW1lciIsIiRmb3JtT2JqIiwiaXNJbml0aWFsaXppbmciLCJ0aW1lU2xpZGVyRW5hYmxlZCIsImN1cnJlbnRUaW1lUmFuZ2UiLCJpc0F1dG9VcGRhdGVBY3RpdmUiLCJmaWx0ZXJDb25kaXRpb25zIiwicGVuZGluZ0ZpbHRlclRleHQiLCJsYXN0S25vd25EYXRhRW5kIiwiaW5pdGlhbGl6ZSIsImFkZENsYXNzIiwiaGlkZSIsImNzcyIsInRvcCIsImxlZnQiLCJhY2VIZWlnaHQiLCJ3aW5kb3ciLCJpbm5lckhlaWdodCIsImNsb3Nlc3QiLCJjcmVhdGVEcm9wZG93bkZyb21IaWRkZW5JbnB1dCIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJjYk9uQ2hhbmdlRmlsZSIsImlnbm9yZUNhc2UiLCJmdWxsVGV4dFNlYXJjaCIsImZvcmNlU2VsZWN0aW9uIiwicHJlc2VydmVIVE1MIiwiYWxsb3dDYXRlZ29yeVNlbGVjdGlvbiIsIm1hdGNoIiwiZmlsdGVyUmVtb3RlRGF0YSIsImFjdGlvbiIsInRlbXBsYXRlcyIsIm1lbnUiLCJjdXN0b21Ecm9wZG93bk1lbnUiLCJpbml0aWFsaXplRm9sZGVySGFuZGxlcnMiLCJpbml0aWFsaXplQWNlIiwiU3lzbG9nQVBJIiwiZ2V0TG9nc0xpc3QiLCJjYkZvcm1hdERyb3Bkb3duUmVzdWx0cyIsImluaXRpYWxpemVMb2dMZXZlbERyb3Bkb3duIiwiaW5pdGlhbGl6ZUZpbHRlckZyb21VcmwiLCJkb2N1bWVudCIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwiJGJ0biIsImN1cnJlbnRUYXJnZXQiLCJwZXJpb2QiLCJkYXRhIiwicmVtb3ZlQ2xhc3MiLCJhcHBseVF1aWNrUGVyaW9kIiwiZW5kIiwib25lSG91ciIsInN0YXJ0IiwiTWF0aCIsIm1heCIsIlNWR1RpbWVsaW5lIiwic2V0UmFuZ2UiLCJsb2FkTG9nQnlUaW1lUmFuZ2UiLCJsZXZlbCIsImFwcGx5TG9nTGV2ZWxGaWx0ZXIiLCJ1cGRhdGVMb2dGcm9tU2VydmVyIiwiaGFuZGxlSGFzaENoYW5nZSIsImZvcm0iLCJkb3dubG9hZExvZ0ZpbGUiLCJmaWxlbmFtZSIsImNiRG93bmxvYWRGaWxlIiwiJGJ1dHRvbiIsIiRyZWxvYWRJY29uIiwiZmluZCIsImhhc0NsYXNzIiwidXBkYXRlTG9nVmlld1dvcmtlciIsInN0b3AiLCJlcmFzZUN1cnJlbnRGaWxlQ29udGVudCIsImV2ZW50IiwiJHBvcHVwIiwiaXNQb3B1cFZpc2libGUiLCJpcyIsImtleSIsIm5hdmlnYXRlRmlsdGVyUG9wdXAiLCIkZm9jdXNlZCIsImxlbmd0aCIsInRyaWdnZXIiLCJ0ZXh0IiwidmFsIiwidHJpbSIsInNob3dGaWx0ZXJUeXBlUG9wdXAiLCJoaWRlRmlsdGVyVHlwZVBvcHVwIiwicmVtb3ZlRmlsdGVyQ29uZGl0aW9uIiwic2V0VGltZW91dCIsImFkZEZpbHRlckNvbmRpdGlvbiIsInR5cGUiLCJzdG9wUHJvcGFnYXRpb24iLCJpbmRleCIsImNsZWFyQWxsRmlsdGVyQ29uZGl0aW9ucyIsInRhcmdldCIsImZvY3VzIiwidG9nZ2xlRnVsbFNjcmVlbiIsImFkZEV2ZW50TGlzdGVuZXIiLCJhZGp1c3RMb2dIZWlnaHQiLCJsb2dDb250YWluZXIiLCJnZXRFbGVtZW50QnlJZCIsImZ1bGxzY3JlZW5FbGVtZW50IiwicmVxdWVzdEZ1bGxzY3JlZW4iLCJlcnIiLCJjb25zb2xlIiwiZXJyb3IiLCJtZXNzYWdlIiwiZXhpdEZ1bGxzY3JlZW4iLCJvZmZzZXQiLCJyZXNpemUiLCIkaGlkZGVuSW5wdXQiLCIkZHJvcGRvd24iLCJpZCIsIiR0ZXh0IiwiZ2xvYmFsVHJhbnNsYXRlIiwic2RfQWxsTGV2ZWxzIiwiJGljb24iLCIkbWVudSIsIml0ZW1zIiwidmFsdWUiLCJpY29uIiwic2RfRXJyb3IiLCJzZF9XYXJuaW5nIiwic2RfTm90aWNlIiwic2RfSW5mbyIsInNkX0RlYnVnIiwiZm9yRWFjaCIsIml0ZW0iLCIkaXRlbSIsImh0bWwiLCJhcHBlbmQiLCJhZnRlciIsInRhYmluZGV4IiwiYmVmb3JlIiwiYWNlIiwiZWRpdCIsImp1bGlhIiwicmVxdWlyZSIsInVuZGVmaW5lZCIsIkluaU1vZGUiLCJNb2RlIiwic2Vzc2lvbiIsInNldE1vZGUiLCJzZXRUaGVtZSIsInJlbmRlcmVyIiwic2V0U2hvd0d1dHRlciIsInNldE9wdGlvbnMiLCJzaG93TGluZU51bWJlcnMiLCJzaG93UHJpbnRNYXJnaW4iLCJyZWFkT25seSIsImJ1aWxkVHJlZVN0cnVjdHVyZSIsImZpbGVzIiwiZGVmYXVsdFBhdGgiLCJ0cmVlIiwiT2JqZWN0IiwiZW50cmllcyIsImZpbGVEYXRhIiwiZmlsZVBhdGgiLCJwYXRoIiwicGFydHMiLCJzcGxpdCIsImN1cnJlbnQiLCJwYXJ0Iiwic2l6ZSIsImNoaWxkcmVuIiwidHJlZVRvRHJvcGRvd25JdGVtcyIsInByZWZpeCIsInBhcmVudEZvbGRlciIsInNvcnQiLCJhS2V5IiwiYVZhbCIsImJLZXkiLCJiVmFsIiwibG9jYWxlQ29tcGFyZSIsInB1c2giLCJuYW1lIiwiZGlzYWJsZWQiLCJmb2xkZXJOYW1lIiwiY2hpbGRJdGVtcyIsInNlbGVjdGVkIiwicmVzcG9uc2UiLCJmaWVsZHMiLCJ2YWx1ZXMiLCJlYWNoIiwib3B0aW9uIiwicGFyZW50QXR0ciIsIm1heWJlRGlzYWJsZWQiLCJmb2xkZXJIZWFkZXIiLCJzdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24iLCIkZm9sZGVyIiwiJHRvZ2dsZSIsIiRmaWxlcyIsImlzQ29sbGFwc2VkIiwic2hvdyIsInNlYXJjaFZhbHVlIiwiXyIsImZvbGRlciIsImV4cGFuZEZvbGRlckZvckZpbGUiLCIkZmlsZUl0ZW0iLCJoYXNoIiwibG9jYXRpb24iLCJzdGFydHNXaXRoIiwiZGVjb2RlVVJJQ29tcG9uZW50Iiwic3Vic3RyaW5nIiwiZmlsZUV4aXN0cyIsInNvbWUiLCJnZXRGaWxlRnJvbUhhc2giLCJyZXN1bHQiLCJkZWZWYWwiLCJmaWxlTmFtZSIsImRyb3Bkb3duVmFsdWVzIiwibWFwIiwicmVwbGFjZSIsInNlbGVjdGVkSXRlbSIsIml0ZW1Ub1NlbGVjdCIsImVuY29kZVVSSUNvbXBvbmVudCIsInJlc2V0RmlsdGVycyIsInVwZGF0ZUF1dG9SZWZyZXNoVmlzaWJpbGl0eSIsImNoZWNrVGltZVJhbmdlQXZhaWxhYmlsaXR5IiwiaXNSb3RhdGVkTG9nRmlsZSIsInRlc3QiLCIkYXV0b0J0biIsImlzUm90YXRlZCIsImRpc3BsYXkiLCJmaXJzdCIsImRpcmVjdGlvbiIsIiRvcHRpb25zIiwiZmlsdGVyIiwiZXEiLCJzeW5jRmlsdGVyQ29uZGl0aW9uc1RvRm9ybSIsInJlbmRlckZpbHRlckxhYmVscyIsInNwbGljZSIsIkpTT04iLCJzdHJpbmdpZnkiLCIkY29udGFpbmVyIiwiZW1wdHkiLCJjb25kaXRpb24iLCJjc3NDbGFzcyIsImljb25DbGFzcyIsImljb25Db2xvciIsIiRsYWJlbCIsInVybFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsInNlYXJjaCIsImZpbHRlclBhcmFtIiwiZ2V0IiwidHJpbW1lZCIsInBhcnNlZCIsInBhcnNlIiwiQXJyYXkiLCJpc0FycmF5IiwiYyIsInAiLCJ1cGRhdGVQZXJpb2RCdXR0b25zVmlzaWJpbGl0eSIsImxvZ0R1cmF0aW9uIiwiJHBlcmlvZEJ1dHRvbnMiLCIkcGVyaW9kQ29udGFpbmVyIiwibGFyZ2VzdFZpc2libGVQZXJpb2QiLCIkbGFyZ2VzdFZpc2libGVCdXR0b24iLCJ2aXNpYmxlQ291bnQiLCJidXR0b24iLCJwYXJzZUludCIsIiR0aW1lQ29udHJvbHNJbmxpbmUiLCJnZXRMb2dUaW1lUmFuZ2UiLCJ0aW1lX3JhbmdlIiwiaW5pdGlhbGl6ZU5hdmlnYXRpb24iLCJ0aW1lUmFuZ2VEYXRhIiwiaGFzVmFsaWRUaW1lUmFuZ2UiLCJoYXNNdWx0aXBsZVRpbWVzdGFtcHMiLCJzZXJ2ZXJfdGltZXpvbmVfb2Zmc2V0Iiwic2VydmVyVGltZXpvbmVPZmZzZXQiLCJvblJhbmdlQ2hhbmdlIiwiZHJhZ2dlZEhhbmRsZSIsIm9uVHJ1bmNhdGVkWm9uZUNsaWNrIiwiaXNMZWZ0Wm9uZSIsIiRhY3RpdmVCdXR0b24iLCJpbml0aWFsUGVyaW9kIiwibWluIiwiaW5pdGlhbFN0YXJ0IiwibGluZVJhbmdlIiwibG9hZExvZ0J5TGluZXMiLCJmbG9vciIsImNlaWwiLCJsaW5lcyIsInBhcmFtcyIsImxvZ0xldmVsIiwiZ2V0TG9nRnJvbUZpbGUiLCJzZXRWYWx1ZSIsImNvbnRlbnQiLCJnb3RvTGluZSIsInNjcm9sbFRvTGluZSIsInN0YXJ0VGltZXN0YW1wIiwiZW5kVGltZXN0YW1wIiwibGF0ZXN0IiwiaXNJbml0aWFsTG9hZCIsImlzQXV0b1VwZGF0ZSIsImRhdGVGcm9tIiwiZGF0ZVRvIiwibmV3Q29udGVudCIsImN1cnJlbnRDb250ZW50IiwiZ2V0VmFsdWUiLCJuZXdMaW5lcyIsImZpbmROZXdMaW5lcyIsImxhc3RSb3ciLCJnZXRMZW5ndGgiLCJpbnNlcnQiLCJyb3ciLCJjb2x1bW4iLCJqb2luIiwiZmluYWxSb3ciLCJmaW5hbENvbHVtbiIsImdldExpbmUiLCJhY3R1YWxfcmFuZ2UiLCJhY3R1YWwiLCJ1cGRhdGVEYXRhQm91bmRhcnkiLCJ1cGRhdGVGcm9tU2VydmVyUmVzcG9uc2UiLCJwZXJpb2RTZWNvbmRzIiwiYXBwbHlQZXJpb2QiLCJmaWx0ZXJQYXR0ZXJuIiwicHJlc2VydmVSYW5nZSIsInNlbGVjdGVkUmFuZ2UiLCJEYXRlIiwibm93IiwiZGF0YUVuZCIsImV4dGVuZFJhbmdlIiwiY2JVcGRhdGVMb2dUZXh0IiwibGluZSIsImN1cnJlbnRMaW5lcyIsImFuY2hvckxpbmUiLCJpIiwiYW5jaG9ySW5kZXgiLCJzbGljZSIsIm1lc3NhZ2VzIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJnZXRTZXNzaW9uIiwiZXJhc2VGaWxlIiwiY2JBZnRlckZpbGVFcmFzZWQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLG9CQUFvQixHQUFHO0FBQ3pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLGdCQUFELENBTGM7O0FBT3pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBQVksRUFBRUQsQ0FBQyxDQUFDLGdCQUFELENBWFU7O0FBYXpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLFlBQVksRUFBRUYsQ0FBQyxDQUFDLHFCQUFELENBakJVOztBQW1CekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUcsRUFBQUEsU0FBUyxFQUFFSCxDQUFDLENBQUMsYUFBRCxDQXZCYTs7QUF5QnpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lJLEVBQUFBLFdBQVcsRUFBRUosQ0FBQyxDQUFDLHVCQUFELENBN0JXOztBQStCekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUssRUFBQUEsTUFBTSxFQUFFLEVBbkNpQjs7QUFxQ3pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLG1CQUFtQixFQUFFLElBekNJOztBQTJDekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFLEVBL0NjOztBQWlEekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsT0FBTyxFQUFFUixDQUFDLENBQUMsa0JBQUQsQ0FyRGU7O0FBdUR6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJUyxFQUFBQSxRQUFRLEVBQUVULENBQUMsQ0FBQyx5QkFBRCxDQTNE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QzJCLE1BQVQsS0FBa0IsS0FBbEIsSUFBMkIzQixRQUFRLENBQUN3SixRQUFULEtBQXNCbE0sU0FBckQsRUFBZ0U7QUFDNURtTSxNQUFBQSxXQUFXLENBQUNDLGVBQVosQ0FBNEIxSixRQUFRLENBQUN3SixRQUFyQztBQUNILEtBRkQsTUFFTztBQUNIdlYsTUFBQUEsb0JBQW9CLENBQUN1RSxtQkFBckI7QUFDSDtBQUNKO0FBMWlEd0IsQ0FBN0IsQyxDQTZpREE7O0FBQ0FyRSxDQUFDLENBQUNpRCxRQUFELENBQUQsQ0FBWTBTLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjdWLEVBQUFBLG9CQUFvQixDQUFDbUIsVUFBckI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cbi8qIGdsb2JhbCBhY2UsIFBieEFwaSwgU3lzbG9nQVBJLCB1cGRhdGVMb2dWaWV3V29ya2VyLCBBY2UsIFVzZXJNZXNzYWdlLCBTVkdUaW1lbGluZSAqL1xuXG4vKipcbiAqIFJlcHJlc2VudHMgdGhlIHN5c3RlbSBkaWFnbm9zdGljIGxvZ3Mgb2JqZWN0LlxuICpcbiAqIEBtb2R1bGUgc3lzdGVtRGlhZ25vc3RpY0xvZ3NcbiAqL1xuY29uc3Qgc3lzdGVtRGlhZ25vc3RpY0xvZ3MgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIFwiU2hvdyBMYXN0IExvZ1wiIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzaG93QnRuOiAkKCcjc2hvdy1sYXN0LWxvZycpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIFwiRG93bmxvYWQgRmlsZVwiIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkb3dubG9hZEJ0bjogJCgnI2Rvd25sb2FkLWZpbGUnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBcIlNob3cgTGFzdCBMb2cgKEF1dG8pXCIgYnV0dG9uLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNob3dBdXRvQnRuOiAkKCcjc2hvdy1sYXN0LWxvZy1hdXRvJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgXCJFcmFzZSBjdXJyZW50IGZpbGUgY29udGVudFwiIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRlcmFzZUJ0bjogJCgnI2VyYXNlLWZpbGUnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBsb2cgY29udGVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRsb2dDb250ZW50OiAkKCcjbG9nLWNvbnRlbnQtcmVhZG9ubHknKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSB2aWV3ZXIgZm9yIGRpc3BsYXlpbmcgdGhlIGxvZyBjb250ZW50LlxuICAgICAqIEB0eXBlIHtBY2V9XG4gICAgICovXG4gICAgdmlld2VyOiAnJyxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmaWxlIHNlbGVjdCBkcm9wZG93bi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmaWxlU2VsZWN0RHJvcERvd246IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBBcnJheSBvZiBsb2cgaXRlbXMuXG4gICAgICogQHR5cGUge0FycmF5fVxuICAgICAqL1xuICAgIGxvZ3NJdGVtczogW10sXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZGltbWVyLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRpbW1lcjogJCgnI2dldC1sb2dzLWRpbW1lcicpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI3N5c3RlbS1kaWFnbm9zdGljLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIEZsYWcgdG8gcHJldmVudCBkdXBsaWNhdGUgQVBJIGNhbGxzIGR1cmluZyBpbml0aWFsaXphdGlvblxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGlzSW5pdGlhbGl6aW5nOiB0cnVlLFxuXG4gICAgLyoqXG4gICAgICogRmxhZyBpbmRpY2F0aW5nIGlmIHRpbWUgc2xpZGVyIG1vZGUgaXMgZW5hYmxlZFxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIHRpbWVTbGlkZXJFbmFibGVkOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIEN1cnJlbnQgdGltZSByYW5nZSBmb3IgdGhlIHNlbGVjdGVkIGxvZyBmaWxlXG4gICAgICogQHR5cGUge29iamVjdHxudWxsfVxuICAgICAqL1xuICAgIGN1cnJlbnRUaW1lUmFuZ2U6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBGbGFnIGluZGljYXRpbmcgaWYgYXV0by11cGRhdGUgbW9kZSBpcyBhY3RpdmVcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBpc0F1dG9VcGRhdGVBY3RpdmU6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogQXJyYXkgb2YgY2FzY2FkaW5nIGZpbHRlciBjb25kaXRpb25zIFt7dHlwZTogJ2NvbnRhaW5zJ3wnbm90Q29udGFpbnMnLCB2YWx1ZTogc3RyaW5nfV1cbiAgICAgKiBAdHlwZSB7QXJyYXl9XG4gICAgICovXG4gICAgZmlsdGVyQ29uZGl0aW9uczogW10sXG5cbiAgICAvKipcbiAgICAgKiBQZW5kaW5nIGZpbHRlciB0ZXh0IHdhaXRpbmcgZm9yIHR5cGUgc2VsZWN0aW9uIGluIHBvcHVwXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBwZW5kaW5nRmlsdGVyVGV4dDogJycsXG5cbiAgICAvKipcbiAgICAgKiBMYXN0IGtub3duIGFjdHVhbCBkYXRhIGVuZCB0aW1lc3RhbXAgZnJvbSBBUEkgcmVzcG9uc2UuXG4gICAgICogVXNlZCB0byBhbmNob3IgcmVmcmVzaCB0aW1lIHJhbmdlIHRvIHJlYWwgZGF0YSBpbnN0ZWFkIG9mIHdhbGwgY2xvY2sgdGltZS5cbiAgICAgKiBXSFk6IElmIGEgbG9nIGZpbGUgaGFzbid0IGJlZW4gd3JpdHRlbiB0byByZWNlbnRseSAoZS5nLiwgaWRsZSBtb2R1bGUgbG9nKSxcbiAgICAgKiB1c2luZyBcIm5vdyAtIHBlcmlvZFwiIGFzIHN0YXJ0VGltZXN0YW1wIHByb2R1Y2VzIGFuIGVtcHR5IHJhbmdlIHdpdGggbm8gZGF0YS5cbiAgICAgKiBAdHlwZSB7bnVtYmVyfG51bGx9XG4gICAgICovXG4gICAgbGFzdEtub3duRGF0YUVuZDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBzeXN0ZW0gZGlhZ25vc3RpYyBsb2dzLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEVuc3VyZSBmaWx0ZXIgdHlwZSBwb3B1cCBzdGFydHMgaGlkZGVuIHdpdGggY2xlYW4gc3R5bGVzXG4gICAgICAgICQoJyNmaWx0ZXItdHlwZS1wb3B1cCcpLmFkZENsYXNzKCdoaWRkZW4nKS5oaWRlKCkuY3NzKHt0b3A6ICcnLCBsZWZ0OiAnJ30pO1xuXG4gICAgICAgIGNvbnN0IGFjZUhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCAtIDI1MDtcblxuICAgICAgICAvLyBTZXQgdGhlIG1pbmltdW0gaGVpZ2h0IG9mIHRoZSBsb2cgY29udGFpbmVyXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIuY2xvc2VzdCgnZGl2JykuY3NzKCdtaW4taGVpZ2h0JywgYCR7YWNlSGVpZ2h0fXB4YCk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIGRyb3Bkb3duIFVJIGZyb20gaGlkZGVuIGlucHV0IChWNS4wIHBhdHRlcm4pXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmNyZWF0ZURyb3Bkb3duRnJvbUhpZGRlbklucHV0KCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZHJvcGRvd24gbWVudSBmb3IgbG9nIGZpbGVzIHdpdGggdHJlZSBzdXBwb3J0XG4gICAgICAgIC8vIEluaXRpYWxpemUgU2VtYW50aWMgVUkgZHJvcGRvd24gd2l0aCBjdXN0b20gbWVudSBnZW5lcmF0aW9uXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jYk9uQ2hhbmdlRmlsZSxcbiAgICAgICAgICAgICAgICBpZ25vcmVDYXNlOiB0cnVlLFxuICAgICAgICAgICAgICAgIGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuICAgICAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBwcmVzZXJ2ZUhUTUw6IHRydWUsXG4gICAgICAgICAgICAgICAgYWxsb3dDYXRlZ29yeVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICAgICAgbWF0Y2g6ICd0ZXh0JyxcbiAgICAgICAgICAgICAgICBmaWx0ZXJSZW1vdGVEYXRhOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBhY3Rpb246ICdhY3RpdmF0ZScsXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgICAgIG1lbnU6IHN5c3RlbURpYWdub3N0aWNMb2dzLmN1c3RvbURyb3Bkb3duTWVudVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb2xkZXIgY29sbGFwc2UvZXhwYW5kIGhhbmRsZXJzICh1c2VzIGV2ZW50IGRlbGVnYXRpb24pXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmluaXRpYWxpemVGb2xkZXJIYW5kbGVycygpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIEFDRSBlZGl0b3IgZm9yIGxvZyBjb250ZW50XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmluaXRpYWxpemVBY2UoKTtcblxuICAgICAgICAvLyBGZXRjaCB0aGUgbGlzdCBvZiBsb2cgZmlsZXNcbiAgICAgICAgU3lzbG9nQVBJLmdldExvZ3NMaXN0KHN5c3RlbURpYWdub3N0aWNMb2dzLmNiRm9ybWF0RHJvcGRvd25SZXN1bHRzKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGxvZyBsZXZlbCBkcm9wZG93biAtIFY1LjAgcGF0dGVybiB3aXRoIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaW5pdGlhbGl6ZUxvZ0xldmVsRHJvcGRvd24oKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGZpbHRlciBjb25kaXRpb25zIGZyb20gVVJMIHBhcmFtZXRlciAoZS5nLiBDRFIgbGlua3Mgd2l0aCA/ZmlsdGVyPS4uLilcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaW5pdGlhbGl6ZUZpbHRlckZyb21VcmwoKTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgcXVpY2sgcGVyaW9kIGJ1dHRvbnNcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJy5wZXJpb2QtYnRuJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0ICRidG4gPSAkKGUuY3VycmVudFRhcmdldCk7XG4gICAgICAgICAgICBjb25zdCBwZXJpb2QgPSAkYnRuLmRhdGEoJ3BlcmlvZCcpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgYWN0aXZlIHN0YXRlXG4gICAgICAgICAgICAkKCcucGVyaW9kLWJ0bicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgICRidG4uYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuXG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5hcHBseVF1aWNrUGVyaW9kKHBlcmlvZCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciBcIk5vd1wiIGJ1dHRvblxuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnLm5vdy1idG4nLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgaWYgKHN5c3RlbURpYWdub3N0aWNMb2dzLmN1cnJlbnRUaW1lUmFuZ2UpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBlbmQgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jdXJyZW50VGltZVJhbmdlLmVuZDtcbiAgICAgICAgICAgICAgICBjb25zdCBvbmVIb3VyID0gMzYwMDtcbiAgICAgICAgICAgICAgICBjb25zdCBzdGFydCA9IE1hdGgubWF4KGVuZCAtIG9uZUhvdXIsIHN5c3RlbURpYWdub3N0aWNMb2dzLmN1cnJlbnRUaW1lUmFuZ2Uuc3RhcnQpO1xuICAgICAgICAgICAgICAgIFNWR1RpbWVsaW5lLnNldFJhbmdlKHN0YXJ0LCBlbmQpO1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmxvYWRMb2dCeVRpbWVSYW5nZShzdGFydCwgZW5kKTtcbiAgICAgICAgICAgICAgICAkKCcucGVyaW9kLWJ0bicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgICAgICAkKCcucGVyaW9kLWJ0bltkYXRhLXBlcmlvZD1cIjM2MDBcIl0nKS5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciBsb2cgbGV2ZWwgZmlsdGVyIGJ1dHRvbnNcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJy5sZXZlbC1idG4nLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgJGJ0biA9ICQoZS5jdXJyZW50VGFyZ2V0KTtcbiAgICAgICAgICAgIGNvbnN0IGxldmVsID0gJGJ0bi5kYXRhKCdsZXZlbCcpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgYWN0aXZlIHN0YXRlXG4gICAgICAgICAgICAkKCcubGV2ZWwtYnRuJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgJGJ0bi5hZGRDbGFzcygnYWN0aXZlJyk7XG5cbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmFwcGx5TG9nTGV2ZWxGaWx0ZXIobGV2ZWwpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgXCJTaG93IExvZ1wiIGJ1dHRvbiBjbGljayAoZGVsZWdhdGVkKVxuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnI3Nob3ctbGFzdC1sb2cnLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudXBkYXRlTG9nRnJvbVNlcnZlcigpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBMaXN0ZW4gZm9yIGhhc2ggY2hhbmdlcyB0byB1cGRhdGUgc2VsZWN0ZWQgZmlsZVxuICAgICAgICAkKHdpbmRvdykub24oJ2hhc2hjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5oYW5kbGVIYXNoQ2hhbmdlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciBcIkRvd25sb2FkIExvZ1wiIGJ1dHRvbiBjbGljayAoZGVsZWdhdGVkKVxuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnI2Rvd25sb2FkLWZpbGUnLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgICAgIFN5c2xvZ0FQSS5kb3dubG9hZExvZ0ZpbGUoZGF0YS5maWxlbmFtZSwgdHJ1ZSwgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY2JEb3dubG9hZEZpbGUpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgXCJBdXRvIFJlZnJlc2hcIiBidXR0b24gY2xpY2sgKGRlbGVnYXRlZClcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJyNzaG93LWxhc3QtbG9nLWF1dG8nLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQoJyNzaG93LWxhc3QtbG9nLWF1dG8nKTtcbiAgICAgICAgICAgIGNvbnN0ICRyZWxvYWRJY29uID0gJGJ1dHRvbi5maW5kKCcuaWNvbnMgaS5yZWZyZXNoJyk7XG4gICAgICAgICAgICBpZiAoJHJlbG9hZEljb24uaGFzQ2xhc3MoJ2xvYWRpbmcnKSkge1xuICAgICAgICAgICAgICAgICRyZWxvYWRJY29uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdXBkYXRlTG9nVmlld1dvcmtlci5zdG9wKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRyZWxvYWRJY29uLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB1cGRhdGVMb2dWaWV3V29ya2VyLmluaXRpYWxpemUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIHRoZSBcIkVyYXNlIGZpbGVcIiBidXR0b24gY2xpY2sgKGRlbGVnYXRlZClcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJyNlcmFzZS1maWxlJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmVyYXNlQ3VycmVudEZpbGVDb250ZW50KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciBFbnRlciBrZXlwcmVzcyBvbiBmaWx0ZXIgaW5wdXQg4oCUIHNob3cgdHlwZSBwb3B1cFxuICAgICAgICAkKGRvY3VtZW50KS5vbigna2V5ZG93bicsICcjZmlsdGVyLWlucHV0JywgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkcG9wdXAgPSAkKCcjZmlsdGVyLXR5cGUtcG9wdXAnKTtcbiAgICAgICAgICAgIGNvbnN0IGlzUG9wdXBWaXNpYmxlID0gJHBvcHVwLmlzKCc6dmlzaWJsZScpICYmICEkcG9wdXAuaGFzQ2xhc3MoJ2hpZGRlbicpO1xuXG4gICAgICAgICAgICAvLyBXaGVuIHBvcHVwIGlzIG9wZW4sIGhhbmRsZSBhcnJvdyBrZXlzIGFuZCBFbnRlciBmb3Iga2V5Ym9hcmQgbmF2aWdhdGlvblxuICAgICAgICAgICAgaWYgKGlzUG9wdXBWaXNpYmxlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50LmtleSA9PT0gJ0Fycm93RG93bicgfHwgZXZlbnQua2V5ID09PSAnQXJyb3dVcCcpIHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MubmF2aWdhdGVGaWx0ZXJQb3B1cChldmVudC5rZXkgPT09ICdBcnJvd0Rvd24nID8gMSA6IC0xKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZXZlbnQua2V5ID09PSAnRW50ZXInKSB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRmb2N1c2VkID0gJHBvcHVwLmZpbmQoJy5maWx0ZXItdHlwZS1vcHRpb24uZm9jdXNlZCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoJGZvY3VzZWQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkZm9jdXNlZC50cmlnZ2VyKCdjbGljaycpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChldmVudC5rZXkgPT09ICdFbnRlcicpIHtcbiAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSAkKCcjZmlsdGVyLWlucHV0JykudmFsKCkudHJpbSgpO1xuICAgICAgICAgICAgICAgIGlmICh0ZXh0ICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5wZW5kaW5nRmlsdGVyVGV4dCA9IHRleHQ7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnNob3dGaWx0ZXJUeXBlUG9wdXAoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGV2ZW50LmtleSA9PT0gJ0VzY2FwZScpIHtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5oaWRlRmlsdGVyVHlwZVBvcHVwKCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGV2ZW50LmtleSA9PT0gJ0JhY2tzcGFjZScgJiYgJCgnI2ZpbHRlci1pbnB1dCcpLnZhbCgpID09PSAnJykge1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBsYXN0IGNoaXAgb24gQmFja3NwYWNlIGluIGVtcHR5IGlucHV0XG4gICAgICAgICAgICAgICAgaWYgKHN5c3RlbURpYWdub3N0aWNMb2dzLmZpbHRlckNvbmRpdGlvbnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5yZW1vdmVGaWx0ZXJDb25kaXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5maWx0ZXJDb25kaXRpb25zLmxlbmd0aCAtIDFcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIE9uIGJsdXI6IGF1dG8tYWRkIHRleHQgYXMgXCJjb250YWluc1wiIGZpbHRlciBpZiBwb3B1cCBpcyBub3Qgb3BlblxuICAgICAgICAkKGRvY3VtZW50KS5vbignYmx1cicsICcjZmlsdGVyLWlucHV0JywgKCkgPT4ge1xuICAgICAgICAgICAgLy8gRGVsYXkgdG8gYWxsb3cgY2xpY2sgb24gcG9wdXAgb3B0aW9uIHRvIGZpcmUgZmlyc3RcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRwb3B1cCA9ICQoJyNmaWx0ZXItdHlwZS1wb3B1cCcpO1xuICAgICAgICAgICAgICAgIGlmICgkcG9wdXAuaXMoJzp2aXNpYmxlJykpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gUG9wdXAgaXMgb3BlbiAodXNlciBwcmVzc2VkIEVudGVyKSDigJQgbGV0IHBvcHVwIGhhbmRsZSBpdFxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSAkKCcjZmlsdGVyLWlucHV0JykudmFsKCkudHJpbSgpO1xuICAgICAgICAgICAgICAgIGlmICh0ZXh0ICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5hZGRGaWx0ZXJDb25kaXRpb24oJ2NvbnRhaW5zJywgdGV4dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgMTUwKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIGZpbHRlciB0eXBlIG9wdGlvbiBjbGlja1xuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnLmZpbHRlci10eXBlLW9wdGlvbicsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0eXBlID0gJChlLmN1cnJlbnRUYXJnZXQpLmRhdGEoJ3R5cGUnKTtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmFkZEZpbHRlckNvbmRpdGlvbih0eXBlLCBzeXN0ZW1EaWFnbm9zdGljTG9ncy5wZW5kaW5nRmlsdGVyVGV4dCk7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5wZW5kaW5nRmlsdGVyVGV4dCA9ICcnO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaGlkZUZpbHRlclR5cGVQb3B1cCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgcmVtb3ZpbmcgaW5kaXZpZHVhbCBmaWx0ZXIgY2hpcFxuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnI2ZpbHRlci1sYWJlbHMgLmRlbGV0ZS5pY29uJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICBjb25zdCBpbmRleCA9ICQoZS5jdXJyZW50VGFyZ2V0KS5jbG9zZXN0KCcuZmlsdGVyLWNvbmRpdGlvbi1sYWJlbCcpLmRhdGEoJ2luZGV4Jyk7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5yZW1vdmVGaWx0ZXJDb25kaXRpb24oaW5kZXgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgXCJDbGVhciBGaWx0ZXJcIiBidXR0b24gY2xpY2tcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJyNjbGVhci1maWx0ZXItYnRuJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmNsZWFyQWxsRmlsdGVyQ29uZGl0aW9ucygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDbGljayBvbiBjb250YWluZXIgZm9jdXNlcyBpbnB1dFxuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnI2ZpbHRlci1jb25kaXRpb25zLWNvbnRhaW5lcicsIChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoJChlLnRhcmdldCkuaXMoJyNmaWx0ZXItY29uZGl0aW9ucy1jb250YWluZXInKSB8fCAkKGUudGFyZ2V0KS5pcygnI2ZpbHRlci1sYWJlbHMnKSkge1xuICAgICAgICAgICAgICAgICQoJyNmaWx0ZXItaW5wdXQnKS5mb2N1cygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIaWRlIHBvcHVwIHdoZW4gY2xpY2tpbmcgb3V0c2lkZVxuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgaWYgKCEkKGUudGFyZ2V0KS5jbG9zZXN0KCcjZmlsdGVyLXR5cGUtcG9wdXAsICNmaWx0ZXItaW5wdXQnKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5oaWRlRmlsdGVyVHlwZVBvcHVwKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciBGdWxsc2NyZWVuIGJ1dHRvbiBjbGlja1xuICAgICAgICAkKCcuZnVsbHNjcmVlbi10b2dnbGUtYnRuJykub24oJ2NsaWNrJywgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudG9nZ2xlRnVsbFNjcmVlbik7XG5cbiAgICAgICAgLy8gTGlzdGVuaW5nIGZvciB0aGUgZnVsbHNjcmVlbiBjaGFuZ2UgZXZlbnRcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignZnVsbHNjcmVlbmNoYW5nZScsIHN5c3RlbURpYWdub3N0aWNMb2dzLmFkanVzdExvZ0hlaWdodCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbCBoZWlnaHQgY2FsY3VsYXRpb25cbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuYWRqdXN0TG9nSGVpZ2h0KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZXMgdGhlIGZ1bGwtc2NyZWVuIG1vZGUgb2YgdGhlICdzeXN0ZW0tbG9ncy1zZWdtZW50JyBlbGVtZW50LlxuICAgICAqIElmIHRoZSBlbGVtZW50IGlzIG5vdCBpbiBmdWxsLXNjcmVlbiBtb2RlLCBpdCByZXF1ZXN0cyBmdWxsLXNjcmVlbiBtb2RlLlxuICAgICAqIElmIHRoZSBlbGVtZW50IGlzIGFscmVhZHkgaW4gZnVsbC1zY3JlZW4gbW9kZSwgaXQgZXhpdHMgZnVsbC1zY3JlZW4gbW9kZS5cbiAgICAgKiBMb2dzIGFuIGVycm9yIG1lc3NhZ2UgdG8gdGhlIGNvbnNvbGUgaWYgdGhlcmUgaXMgYW4gaXNzdWUgZW5hYmxpbmcgZnVsbC1zY3JlZW4gbW9kZS5cbiAgICAgKlxuICAgICAqIEByZXR1cm4ge3ZvaWR9XG4gICAgICovXG4gICAgdG9nZ2xlRnVsbFNjcmVlbigpIHtcbiAgICAgICAgY29uc3QgbG9nQ29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3N5c3RlbS1sb2dzLXNlZ21lbnQnKTtcblxuICAgICAgICBpZiAoIWRvY3VtZW50LmZ1bGxzY3JlZW5FbGVtZW50KSB7XG4gICAgICAgICAgICBsb2dDb250YWluZXIucmVxdWVzdEZ1bGxzY3JlZW4oKS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgYXR0ZW1wdGluZyB0byBlbmFibGUgZnVsbC1zY3JlZW4gbW9kZTogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZG9jdW1lbnQuZXhpdEZ1bGxzY3JlZW4oKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGdW5jdGlvbiB0byBhZGp1c3QgdGhlIGhlaWdodCBvZiB0aGUgbG9ncyBkZXBlbmRpbmcgb24gdGhlIHNjcmVlbiBtb2RlLlxuICAgICAqL1xuICAgIGFkanVzdExvZ0hlaWdodCgpIHtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBsZXQgYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGxvZ0NvbnRlbnQub2Zmc2V0KCkudG9wIC0gNTU7XG4gICAgICAgICAgICBpZiAoZG9jdW1lbnQuZnVsbHNjcmVlbkVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiBmdWxsc2NyZWVuIG1vZGUgaXMgYWN0aXZlXG4gICAgICAgICAgICAgICAgYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gODA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBSZWNhbGN1bGF0ZSB0aGUgc2l6ZSBvZiB0aGUgQUNFIGVkaXRvclxuICAgICAgICAgICAgJCgnLmxvZy1jb250ZW50LXJlYWRvbmx5JykuY3NzKCdtaW4taGVpZ2h0JywgIGAke2FjZUhlaWdodH1weGApO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnJlc2l6ZSgpO1xuICAgICAgICB9LCAzMDApO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBsb2cgbGV2ZWwgZHJvcGRvd24gLSBWNS4wIHBhdHRlcm4gd2l0aCBIVE1MIGljb25zXG4gICAgICogU3RhdGljIGRyb3Bkb3duIHdpdGggY29sb3JlZCBpY29ucyBhbmQgdHJhbnNsYXRpb25zXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUxvZ0xldmVsRHJvcGRvd24oKSB7XG4gICAgICAgIGNvbnN0ICRoaWRkZW5JbnB1dCA9ICQoJyNsb2dMZXZlbCcpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGRyb3Bkb3duIGFscmVhZHkgZXhpc3RzXG4gICAgICAgIGlmICgkKCcjbG9nTGV2ZWwtZHJvcGRvd24nKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENyZWF0ZSBkcm9wZG93biBIVE1MIHdpdGggY29sb3JlZCBpY29uc1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCc8ZGl2PicsIHtcbiAgICAgICAgICAgIGlkOiAnbG9nTGV2ZWwtZHJvcGRvd24nLFxuICAgICAgICAgICAgY2xhc3M6ICd1aSBzZWxlY3Rpb24gZHJvcGRvd24nXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0ICR0ZXh0ID0gJCgnPGRpdj4nLCB7IGNsYXNzOiAndGV4dCcgfSkudGV4dChnbG9iYWxUcmFuc2xhdGUuc2RfQWxsTGV2ZWxzKTtcbiAgICAgICAgY29uc3QgJGljb24gPSAkKCc8aT4nLCB7IGNsYXNzOiAnZHJvcGRvd24gaWNvbicgfSk7XG4gICAgICAgIGNvbnN0ICRtZW51ID0gJCgnPGRpdj4nLCB7IGNsYXNzOiAnbWVudScgfSk7XG5cbiAgICAgICAgLy8gQnVpbGQgbWVudSBpdGVtcyB3aXRoIGNvbG9yZWQgaWNvbnNcbiAgICAgICAgY29uc3QgaXRlbXMgPSBbXG4gICAgICAgICAgICB7IHZhbHVlOiAnJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnNkX0FsbExldmVscywgaWNvbjogJycgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdFUlJPUicsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5zZF9FcnJvciwgaWNvbjogJzxpIGNsYXNzPVwiZXhjbGFtYXRpb24gY2lyY2xlIHJlZCBpY29uXCI+PC9pPicgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdXQVJOSU5HJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnNkX1dhcm5pbmcsIGljb246ICc8aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIG9yYW5nZSBpY29uXCI+PC9pPicgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdOT1RJQ0UnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc2RfTm90aWNlLCBpY29uOiAnPGkgY2xhc3M9XCJpbmZvIGNpcmNsZSBibHVlIGljb25cIj48L2k+JyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ0lORk8nLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc2RfSW5mbywgaWNvbjogJzxpIGNsYXNzPVwiY2lyY2xlIGdyZXkgaWNvblwiPjwvaT4nIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAnREVCVUcnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc2RfRGVidWcsIGljb246ICc8aSBjbGFzcz1cImJ1ZyBwdXJwbGUgaWNvblwiPjwvaT4nIH1cbiAgICAgICAgXTtcblxuICAgICAgICBpdGVtcy5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICAgICAgY29uc3QgJGl0ZW0gPSAkKCc8ZGl2PicsIHtcbiAgICAgICAgICAgICAgICBjbGFzczogJ2l0ZW0nLFxuICAgICAgICAgICAgICAgICdkYXRhLXZhbHVlJzogaXRlbS52YWx1ZVxuICAgICAgICAgICAgfSkuaHRtbChpdGVtLmljb24gKyBpdGVtLnRleHQpO1xuICAgICAgICAgICAgJG1lbnUuYXBwZW5kKCRpdGVtKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJGRyb3Bkb3duLmFwcGVuZCgkdGV4dCwgJGljb24sICRtZW51KTtcbiAgICAgICAgJGhpZGRlbklucHV0LmFmdGVyKCRkcm9wZG93bik7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTZW1hbnRpYyBVSSBkcm9wZG93blxuICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICRoaWRkZW5JbnB1dC52YWwodmFsdWUpLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIodHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGRyb3Bkb3duIFVJIGVsZW1lbnQgZnJvbSBoaWRkZW4gaW5wdXQgZmllbGQgKFY1LjAgcGF0dGVybilcbiAgICAgKi9cbiAgICBjcmVhdGVEcm9wZG93bkZyb21IaWRkZW5JbnB1dCgpIHtcbiAgICAgICAgY29uc3QgJGhpZGRlbklucHV0ID0gJCgnI2ZpbGVuYW1lcycpO1xuXG4gICAgICAgIGlmICghJGhpZGRlbklucHV0Lmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignSGlkZGVuIGlucHV0ICNmaWxlbmFtZXMgbm90IGZvdW5kJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCc8ZGl2PicsIHtcbiAgICAgICAgICAgIGlkOiAnZmlsZW5hbWVzLWRyb3Bkb3duJyxcbiAgICAgICAgICAgIGNsYXNzOiAndWkgc2VhcmNoIHNlbGVjdGlvbiBkcm9wZG93biBmaWxlbmFtZXMtc2VsZWN0IGZsdWlkJ1xuICAgICAgICB9KTtcblxuICAgICAgICAkZHJvcGRvd24uYXBwZW5kKFxuICAgICAgICAgICAgJCgnPGk+JywgeyBjbGFzczogJ2Ryb3Bkb3duIGljb24nIH0pLFxuICAgICAgICAgICAgJCgnPGlucHV0PicsIHsgdHlwZTogJ3RleHQnLCBjbGFzczogJ3NlYXJjaCcsIHRhYmluZGV4OiAwIH0pLFxuICAgICAgICAgICAgJCgnPGRpdj4nLCB7IGNsYXNzOiAnZGVmYXVsdCB0ZXh0JyB9KS50ZXh0KCdTZWxlY3QgbG9nIGZpbGUnKSxcbiAgICAgICAgICAgICQoJzxkaXY+JywgeyBjbGFzczogJ21lbnUnIH0pXG4gICAgICAgICk7XG5cbiAgICAgICAgJGhpZGRlbklucHV0LmJlZm9yZSgkZHJvcGRvd24pO1xuICAgICAgICAkaGlkZGVuSW5wdXQuaGlkZSgpO1xuXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24gPSAkZHJvcGRvd247XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBBQ0UgZWRpdG9yIGZvciBsb2cgdmlld2luZy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplQWNlKCkge1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIgPSBhY2UuZWRpdCgnbG9nLWNvbnRlbnQtcmVhZG9ubHknKTtcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgSnVsaWEgbW9kZSBpcyBhdmFpbGFibGVcbiAgICAgICAgY29uc3QganVsaWEgPSBhY2UucmVxdWlyZSgnYWNlL21vZGUvanVsaWEnKTtcbiAgICAgICAgaWYgKGp1bGlhICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIFNldCB0aGUgbW9kZSB0byBKdWxpYSBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgIGNvbnN0IEluaU1vZGUgPSBqdWxpYS5Nb2RlO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnNlc3Npb24uc2V0TW9kZShuZXcgSW5pTW9kZSgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCB0aGUgdGhlbWUgYW5kIG9wdGlvbnMgZm9yIHRoZSBBQ0UgZWRpdG9yXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlci5zZXRUaGVtZSgnYWNlL3RoZW1lL21vbm9rYWknKTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnJlbmRlcmVyLnNldFNob3dHdXR0ZXIoZmFsc2UpO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIuc2V0T3B0aW9ucyh7XG4gICAgICAgICAgICBzaG93TGluZU51bWJlcnM6IGZhbHNlLFxuICAgICAgICAgICAgc2hvd1ByaW50TWFyZ2luOiBmYWxzZSxcbiAgICAgICAgICAgIHJlYWRPbmx5OiB0cnVlLFxuICAgICAgICB9KTtcblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCdWlsZHMgYSBoaWVyYXJjaGljYWwgdHJlZSBzdHJ1Y3R1cmUgZnJvbSBmbGF0IGZpbGUgcGF0aHNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZmlsZXMgLSBUaGUgZmlsZXMgb2JqZWN0IGZyb20gQVBJIHJlc3BvbnNlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGRlZmF1bHRQYXRoIC0gVGhlIGRlZmF1bHQgc2VsZWN0ZWQgZmlsZSBwYXRoXG4gICAgICogQHJldHVybnMge0FycmF5fSBUcmVlIHN0cnVjdHVyZSBmb3IgdGhlIGRyb3Bkb3duXG4gICAgICovXG4gICAgYnVpbGRUcmVlU3RydWN0dXJlKGZpbGVzLCBkZWZhdWx0UGF0aCkge1xuICAgICAgICBjb25zdCB0cmVlID0ge307XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCB0aGUgdHJlZSBzdHJ1Y3R1cmVcbiAgICAgICAgT2JqZWN0LmVudHJpZXMoZmlsZXMpLmZvckVhY2goKFtrZXksIGZpbGVEYXRhXSkgPT4ge1xuICAgICAgICAgICAgLy8gVXNlIGZpbGVEYXRhLnBhdGggYXMgdGhlIGFjdHVhbCBmaWxlIHBhdGhcbiAgICAgICAgICAgIGNvbnN0IGZpbGVQYXRoID0gZmlsZURhdGEucGF0aCB8fCBrZXk7XG4gICAgICAgICAgICBjb25zdCBwYXJ0cyA9IGZpbGVQYXRoLnNwbGl0KCcvJyk7XG4gICAgICAgICAgICBsZXQgY3VycmVudCA9IHRyZWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHBhcnRzLmZvckVhY2goKHBhcnQsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGluZGV4ID09PSBwYXJ0cy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgaXMgYSBmaWxlXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRbcGFydF0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZmlsZScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBmaWxlUGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpemU6IGZpbGVEYXRhLnNpemUsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAoZGVmYXVsdFBhdGggJiYgZGVmYXVsdFBhdGggPT09IGZpbGVQYXRoKSB8fCAoIWRlZmF1bHRQYXRoICYmIGZpbGVEYXRhLmRlZmF1bHQpXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBpcyBhIGRpcmVjdG9yeVxuICAgICAgICAgICAgICAgICAgICBpZiAoIWN1cnJlbnRbcGFydF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRbcGFydF0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ZvbGRlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW46IHt9XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnQgPSBjdXJyZW50W3BhcnRdLmNoaWxkcmVuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbnZlcnQgdHJlZSB0byBkcm9wZG93biBpdGVtc1xuICAgICAgICByZXR1cm4gdGhpcy50cmVlVG9Ecm9wZG93bkl0ZW1zKHRyZWUsICcnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENvbnZlcnRzIHRyZWUgc3RydWN0dXJlIHRvIGRyb3Bkb3duIGl0ZW1zIHdpdGggcHJvcGVyIGZvcm1hdHRpbmdcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gdHJlZSAtIFRoZSB0cmVlIHN0cnVjdHVyZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcmVmaXggLSBQcmVmaXggZm9yIGluZGVudGF0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmVudEZvbGRlciAtIFBhcmVudCBmb2xkZXIgbmFtZSBmb3IgZ3JvdXBpbmdcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IEZvcm1hdHRlZCBkcm9wZG93biBpdGVtc1xuICAgICAqL1xuICAgIHRyZWVUb0Ryb3Bkb3duSXRlbXModHJlZSwgcHJlZml4LCBwYXJlbnRGb2xkZXIgPSAnJykge1xuICAgICAgICBjb25zdCBpdGVtcyA9IFtdO1xuXG4gICAgICAgIC8vIFNvcnQgZW50cmllczogZm9sZGVycyBmaXJzdCwgdGhlbiBmaWxlc1xuICAgICAgICBjb25zdCBlbnRyaWVzID0gT2JqZWN0LmVudHJpZXModHJlZSkuc29ydCgoW2FLZXksIGFWYWxdLCBbYktleSwgYlZhbF0pID0+IHtcbiAgICAgICAgICAgIGlmIChhVmFsLnR5cGUgPT09ICdmb2xkZXInICYmIGJWYWwudHlwZSA9PT0gJ2ZpbGUnKSByZXR1cm4gLTE7XG4gICAgICAgICAgICBpZiAoYVZhbC50eXBlID09PSAnZmlsZScgJiYgYlZhbC50eXBlID09PSAnZm9sZGVyJykgcmV0dXJuIDE7XG4gICAgICAgICAgICByZXR1cm4gYUtleS5sb2NhbGVDb21wYXJlKGJLZXkpO1xuICAgICAgICB9KTtcblxuICAgICAgICBlbnRyaWVzLmZvckVhY2goKFtrZXksIHZhbHVlXSkgPT4ge1xuICAgICAgICAgICAgaWYgKHZhbHVlLnR5cGUgPT09ICdmb2xkZXInKSB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIGZvbGRlciBoZWFkZXIgd2l0aCB0b2dnbGUgY2FwYWJpbGl0eVxuICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBgPGkgY2xhc3M9XCJjYXJldCBkb3duIGljb24gZm9sZGVyLXRvZ2dsZVwiPjwvaT48aSBjbGFzcz1cImZvbGRlciBpY29uXCI+PC9pPiAke2tleX1gLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJycsXG4gICAgICAgICAgICAgICAgICAgIGRpc2FibGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZm9sZGVyJyxcbiAgICAgICAgICAgICAgICAgICAgZm9sZGVyTmFtZToga2V5XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBBZGQgY2hpbGRyZW4gd2l0aCBpbmNyZWFzZWQgaW5kZW50YXRpb24gYW5kIHBhcmVudCBmb2xkZXIgcmVmZXJlbmNlXG4gICAgICAgICAgICAgICAgY29uc3QgY2hpbGRJdGVtcyA9IHRoaXMudHJlZVRvRHJvcGRvd25JdGVtcyh2YWx1ZS5jaGlsZHJlbiwgcHJlZml4ICsgJyZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOycsIGtleSk7XG4gICAgICAgICAgICAgICAgaXRlbXMucHVzaCguLi5jaGlsZEl0ZW1zKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIGZpbGUgaXRlbSB3aXRoIHBhcmVudCBmb2xkZXIgcmVmZXJlbmNlXG4gICAgICAgICAgICAgICAgaXRlbXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGAke3ByZWZpeH08aSBjbGFzcz1cImZpbGUgb3V0bGluZSBpY29uXCI+PC9pPiAke2tleX0gKCR7dmFsdWUuc2l6ZX0pYCxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlLnBhdGgsXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkOiB2YWx1ZS5kZWZhdWx0LFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZmlsZScsXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudEZvbGRlcjogcGFyZW50Rm9sZGVyXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBpdGVtcztcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgY3VzdG9tIGRyb3Bkb3duIG1lbnUgSFRNTCBmb3IgbG9nIGZpbGVzIHdpdGggY29sbGFwc2libGUgZm9sZGVyc1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBjb250YWluaW5nIGRyb3Bkb3duIG1lbnUgb3B0aW9uc1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBmaWVsZHMgLSBUaGUgZmllbGRzIGluIHRoZSByZXNwb25zZSB0byB1c2UgZm9yIHRoZSBtZW51IG9wdGlvbnNcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgSFRNTCBzdHJpbmcgZm9yIHRoZSBjdXN0b20gZHJvcGRvd24gbWVudVxuICAgICAqL1xuICAgIGN1c3RvbURyb3Bkb3duTWVudShyZXNwb25zZSwgZmllbGRzKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlcyA9IHJlc3BvbnNlW2ZpZWxkcy52YWx1ZXNdIHx8IHt9O1xuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuXG4gICAgICAgICQuZWFjaCh2YWx1ZXMsIChpbmRleCwgb3B0aW9uKSA9PiB7XG4gICAgICAgICAgICAvLyBGb3IgdHJlZSBzdHJ1Y3R1cmUgaXRlbXNcbiAgICAgICAgICAgIGlmIChzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXMgJiYgc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zW2luZGV4XSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXNbaW5kZXhdO1xuXG4gICAgICAgICAgICAgICAgaWYgKGl0ZW0udHlwZSA9PT0gJ2ZvbGRlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRm9sZGVyIGl0ZW0gLSBjbGlja2FibGUgaGVhZGVyIGZvciBjb2xsYXBzZS9leHBhbmRcbiAgICAgICAgICAgICAgICAgICAgLy8gTm90IHVzaW5nICdkaXNhYmxlZCcgY2xhc3MgYXMgaXQgYmxvY2tzIHBvaW50ZXIgZXZlbnRzXG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJmb2xkZXItaGVhZGVyIGl0ZW1cIiBkYXRhLWZvbGRlcj1cIiR7aXRlbS5mb2xkZXJOYW1lfVwiIGRhdGEtdmFsdWU9XCJcIiBkYXRhLXRleHQ9XCIke2l0ZW0uZm9sZGVyTmFtZX1cIiBzdHlsZT1cInBvaW50ZXItZXZlbnRzOiBhdXRvICFpbXBvcnRhbnQ7IGN1cnNvcjogcG9pbnRlcjsgZm9udC13ZWlnaHQ6IGJvbGQ7IGJhY2tncm91bmQ6ICNmOWY5Zjk7XCI+JHtpdGVtLm5hbWV9PC9kaXY+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBGaWxlIGl0ZW0gd2l0aCBwYXJlbnQgZm9sZGVyIHJlZmVyZW5jZSBmb3IgY29sbGFwc2VcbiAgICAgICAgICAgICAgICAgICAgLy8gZGF0YS10ZXh0IGNvbnRhaW5zIGZ1bGwgcGF0aCBzbyBGb21hbnRpYyBzZWFyY2ggbWF0Y2hlcyBieSBmb2xkZXIgbmFtZSB0b29cbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0ZWQgPSBpdGVtLnNlbGVjdGVkID8gJ3NlbGVjdGVkIGFjdGl2ZScgOiAnJztcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFyZW50QXR0ciA9IGl0ZW0ucGFyZW50Rm9sZGVyID8gYGRhdGEtcGFyZW50PVwiJHtpdGVtLnBhcmVudEZvbGRlcn1cImAgOiAnJztcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW0gZmlsZS1pdGVtICR7c2VsZWN0ZWR9XCIgZGF0YS12YWx1ZT1cIiR7b3B0aW9uW2ZpZWxkcy52YWx1ZV19XCIgZGF0YS10ZXh0PVwiJHtvcHRpb25bZmllbGRzLnZhbHVlXX1cIiAke3BhcmVudEF0dHJ9PiR7aXRlbS5uYW1lfTwvZGl2PmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBGYWxsYmFjayB0byByZWd1bGFyIGl0ZW1cbiAgICAgICAgICAgICAgICBjb25zdCBtYXliZURpc2FibGVkID0gKG9wdGlvbltmaWVsZHMuZGlzYWJsZWRdKSA/ICdkaXNhYmxlZCAnIDogJyc7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIiR7bWF5YmVEaXNhYmxlZH1pdGVtXCIgZGF0YS12YWx1ZT1cIiR7b3B0aW9uW2ZpZWxkcy52YWx1ZV19XCI+JHtvcHRpb25bZmllbGRzLm5hbWVdfTwvZGl2PmA7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyBmb2xkZXIgY29sbGFwc2UvZXhwYW5kIGhhbmRsZXJzIGFuZCBzZWFyY2ggYmVoYXZpb3JcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9sZGVySGFuZGxlcnMoKSB7XG4gICAgICAgIGNvbnN0ICRkcm9wZG93biA9IHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd247XG5cbiAgICAgICAgLy8gSGFuZGxlIGZvbGRlciBoZWFkZXIgY2xpY2tzIGZvciBjb2xsYXBzZS9leHBhbmRcbiAgICAgICAgLy8gVXNlIGRvY3VtZW50LWxldmVsIGhhbmRsZXIgd2l0aCBjYXB0dXJlIHBoYXNlIHRvIGludGVyY2VwdCBiZWZvcmUgRm9tYW50aWNcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgLy8gQ2hlY2sgaWYgY2xpY2sgaXMgaW5zaWRlIG91ciBkcm9wZG93bidzIGZvbGRlci1oZWFkZXJcbiAgICAgICAgICAgIGNvbnN0IGZvbGRlckhlYWRlciA9IGUudGFyZ2V0LmNsb3Nlc3QoJyNmaWxlbmFtZXMtZHJvcGRvd24gLmZvbGRlci1oZWFkZXInKTtcbiAgICAgICAgICAgIGlmICghZm9sZGVySGVhZGVyKSByZXR1cm47XG5cbiAgICAgICAgICAgIGUuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgIGNvbnN0ICRmb2xkZXIgPSAkKGZvbGRlckhlYWRlcik7XG4gICAgICAgICAgICBjb25zdCBmb2xkZXJOYW1lID0gJGZvbGRlci5kYXRhKCdmb2xkZXInKTtcbiAgICAgICAgICAgIGNvbnN0ICR0b2dnbGUgPSAkZm9sZGVyLmZpbmQoJy5mb2xkZXItdG9nZ2xlJyk7XG4gICAgICAgICAgICBjb25zdCAkbWVudSA9ICRkcm9wZG93bi5maW5kKCcubWVudScpO1xuICAgICAgICAgICAgY29uc3QgJGZpbGVzID0gJG1lbnUuZmluZChgLmZpbGUtaXRlbVtkYXRhLXBhcmVudD1cIiR7Zm9sZGVyTmFtZX1cIl1gKTtcblxuICAgICAgICAgICAgLy8gVG9nZ2xlIGZvbGRlciBzdGF0ZVxuICAgICAgICAgICAgY29uc3QgaXNDb2xsYXBzZWQgPSAkdG9nZ2xlLmhhc0NsYXNzKCdyaWdodCcpO1xuXG4gICAgICAgICAgICBpZiAoaXNDb2xsYXBzZWQpIHtcbiAgICAgICAgICAgICAgICAvLyBFeHBhbmQgZm9sZGVyXG4gICAgICAgICAgICAgICAgJHRvZ2dsZS5yZW1vdmVDbGFzcygncmlnaHQnKS5hZGRDbGFzcygnZG93bicpO1xuICAgICAgICAgICAgICAgICRmaWxlcy5zaG93KCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIENvbGxhcHNlIGZvbGRlclxuICAgICAgICAgICAgICAgICR0b2dnbGUucmVtb3ZlQ2xhc3MoJ2Rvd24nKS5hZGRDbGFzcygncmlnaHQnKTtcbiAgICAgICAgICAgICAgICAkZmlsZXMuaGlkZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCB0cnVlKTsgLy8gY2FwdHVyZSBwaGFzZSAtIGZpcmVzIGJlZm9yZSBidWJibGluZ1xuXG4gICAgICAgIC8vIEhhbmRsZSBzZWFyY2ggaW5wdXQgLSBzaG93IGFsbCBpdGVtcyB3aGVuIHNlYXJjaGluZ1xuICAgICAgICAkZHJvcGRvd24ub24oJ2lucHV0JywgJ2lucHV0LnNlYXJjaCcsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBzZWFyY2hWYWx1ZSA9ICQoZS50YXJnZXQpLnZhbCgpLnRyaW0oKTtcbiAgICAgICAgICAgIGNvbnN0ICRtZW51ID0gJGRyb3Bkb3duLmZpbmQoJy5tZW51Jyk7XG5cbiAgICAgICAgICAgIGlmIChzZWFyY2hWYWx1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBhbGwgaXRlbXMgYW5kIGV4cGFuZCBhbGwgZm9sZGVycyBkdXJpbmcgc2VhcmNoXG4gICAgICAgICAgICAgICAgJG1lbnUuZmluZCgnLmZpbGUtaXRlbScpLnNob3coKTtcbiAgICAgICAgICAgICAgICAkbWVudS5maW5kKCcuZm9sZGVyLXRvZ2dsZScpLnJlbW92ZUNsYXNzKCdyaWdodCcpLmFkZENsYXNzKCdkb3duJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIFJlc3RvcmUgY29sbGFwc2VkIHN0YXRlIHdoZW4gc2VhcmNoIGlzIGNsZWFyZWRcbiAgICAgICAgICAgICAgICAkbWVudS5maW5kKCcuZm9sZGVyLWhlYWRlcicpLmVhY2goKF8sIGZvbGRlcikgPT4ge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkZm9sZGVyID0gJChmb2xkZXIpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmb2xkZXJOYW1lID0gJGZvbGRlci5kYXRhKCdmb2xkZXInKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgaXNDb2xsYXBzZWQgPSAkZm9sZGVyLmZpbmQoJy5mb2xkZXItdG9nZ2xlJykuaGFzQ2xhc3MoJ3JpZ2h0Jyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0NvbGxhcHNlZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJG1lbnUuZmluZChgLmZpbGUtaXRlbVtkYXRhLXBhcmVudD1cIiR7Zm9sZGVyTmFtZX1cIl1gKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEV4cGFuZHMgdGhlIGZvbGRlciBjb250YWluaW5nIHRoZSBzcGVjaWZpZWQgZmlsZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlUGF0aCAtIFRoZSBmaWxlIHBhdGggdG8gZmluZCBhbmQgZXhwYW5kIGl0cyBwYXJlbnQgZm9sZGVyXG4gICAgICovXG4gICAgZXhwYW5kRm9sZGVyRm9yRmlsZShmaWxlUGF0aCkge1xuICAgICAgICBpZiAoIWZpbGVQYXRoKSByZXR1cm47XG5cbiAgICAgICAgY29uc3QgJG1lbnUgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmZpbmQoJy5tZW51Jyk7XG4gICAgICAgIGNvbnN0ICRmaWxlSXRlbSA9ICRtZW51LmZpbmQoYC5maWxlLWl0ZW1bZGF0YS12YWx1ZT1cIiR7ZmlsZVBhdGh9XCJdYCk7XG5cbiAgICAgICAgaWYgKCRmaWxlSXRlbS5sZW5ndGgpIHtcbiAgICAgICAgICAgIGNvbnN0IHBhcmVudEZvbGRlciA9ICRmaWxlSXRlbS5kYXRhKCdwYXJlbnQnKTtcbiAgICAgICAgICAgIGlmIChwYXJlbnRGb2xkZXIpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkZm9sZGVyID0gJG1lbnUuZmluZChgLmZvbGRlci1oZWFkZXJbZGF0YS1mb2xkZXI9XCIke3BhcmVudEZvbGRlcn1cIl1gKTtcbiAgICAgICAgICAgICAgICBjb25zdCAkdG9nZ2xlID0gJGZvbGRlci5maW5kKCcuZm9sZGVyLXRvZ2dsZScpO1xuXG4gICAgICAgICAgICAgICAgLy8gRXhwYW5kIGlmIGNvbGxhcHNlZFxuICAgICAgICAgICAgICAgIGlmICgkdG9nZ2xlLmhhc0NsYXNzKCdyaWdodCcpKSB7XG4gICAgICAgICAgICAgICAgICAgICR0b2dnbGUucmVtb3ZlQ2xhc3MoJ3JpZ2h0JykuYWRkQ2xhc3MoJ2Rvd24nKTtcbiAgICAgICAgICAgICAgICAgICAgJG1lbnUuZmluZChgLmZpbGUtaXRlbVtkYXRhLXBhcmVudD1cIiR7cGFyZW50Rm9sZGVyfVwiXWApLnNob3coKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlcyBoYXNoIGNoYW5nZXMgdG8gdXBkYXRlIHRoZSBzZWxlY3RlZCBmaWxlXG4gICAgICovXG4gICAgaGFuZGxlSGFzaENoYW5nZSgpIHtcbiAgICAgICAgLy8gU2tpcCBkdXJpbmcgaW5pdGlhbGl6YXRpb24gdG8gcHJldmVudCBkdXBsaWNhdGUgQVBJIGNhbGxzXG4gICAgICAgIGlmIChzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0luaXRpYWxpemluZykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgaGFzaCA9IHdpbmRvdy5sb2NhdGlvbi5oYXNoO1xuICAgICAgICBpZiAoaGFzaCAmJiBoYXNoLnN0YXJ0c1dpdGgoJyNmaWxlPScpKSB7XG4gICAgICAgICAgICBjb25zdCBmaWxlUGF0aCA9IGRlY29kZVVSSUNvbXBvbmVudChoYXNoLnN1YnN0cmluZyg2KSk7XG4gICAgICAgICAgICBpZiAoZmlsZVBhdGggJiYgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignZ2V0IHZhbHVlJykgIT09IGZpbGVQYXRoKSB7XG4gICAgICAgICAgICAgICAgLy8gQ2hlY2sgaWYgdGhlIGZpbGUgZXhpc3RzIGluIGRyb3Bkb3duIGl0ZW1zXG4gICAgICAgICAgICAgICAgY29uc3QgZmlsZUV4aXN0cyA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtcy5zb21lKGl0ZW0gPT5cbiAgICAgICAgICAgICAgICAgICAgaXRlbS50eXBlID09PSAnZmlsZScgJiYgaXRlbS52YWx1ZSA9PT0gZmlsZVBhdGhcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIGlmIChmaWxlRXhpc3RzKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEV4cGFuZCBwYXJlbnQgZm9sZGVyIGJlZm9yZSBzZWxlY3RpbmcgZmlsZVxuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5leHBhbmRGb2xkZXJGb3JGaWxlKGZpbGVQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgZmlsZVBhdGgpO1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXQgdGV4dCcsIGZpbGVQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2ZpbGVuYW1lJywgZmlsZVBhdGgpO1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy51cGRhdGVMb2dGcm9tU2VydmVyKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldHMgdGhlIGZpbGUgcGF0aCBmcm9tIFVSTCBoYXNoIGlmIHByZXNlbnRcbiAgICAgKi9cbiAgICBnZXRGaWxlRnJvbUhhc2goKSB7XG4gICAgICAgIGNvbnN0IGhhc2ggPSB3aW5kb3cubG9jYXRpb24uaGFzaDtcbiAgICAgICAgaWYgKGhhc2ggJiYgaGFzaC5zdGFydHNXaXRoKCcjZmlsZT0nKSkge1xuICAgICAgICAgICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChoYXNoLnN1YnN0cmluZyg2KSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICcnO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBmb3JtYXQgdGhlIGRyb3Bkb3duIG1lbnUgc3RydWN0dXJlIGJhc2VkIG9uIHRoZSByZXNwb25zZS5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZGF0YS5cbiAgICAgKi9cbiAgICBjYkZvcm1hdERyb3Bkb3duUmVzdWx0cyhyZXNwb25zZSkge1xuICAgICAgICAvLyBDaGVjayBpZiByZXNwb25zZSBpcyB2YWxpZFxuICAgICAgICBpZiAoIXJlc3BvbnNlIHx8ICFyZXNwb25zZS5yZXN1bHQgfHwgIXJlc3BvbnNlLmRhdGEgfHwgIXJlc3BvbnNlLmRhdGEuZmlsZXMpIHtcbiAgICAgICAgICAgIC8vIEhpZGUgZGltbWVyIG9ubHkgaWYgbm90IGluIGF1dG8tdXBkYXRlIG1vZGVcbiAgICAgICAgICAgIGlmICghc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBmaWxlcyA9IHJlc3BvbnNlLmRhdGEuZmlsZXM7XG5cbiAgICAgICAgLy8gQ2hlY2sgZm9yIGZpbGUgZnJvbSBoYXNoIGZpcnN0XG4gICAgICAgIGxldCBkZWZWYWwgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5nZXRGaWxlRnJvbUhhc2goKTtcblxuICAgICAgICAvLyBJZiBubyBoYXNoIHZhbHVlLCBjaGVjayBpZiB0aGVyZSBpcyBhIGRlZmF1bHQgdmFsdWUgc2V0IGZvciB0aGUgZmlsZW5hbWUgaW5wdXQgZmllbGRcbiAgICAgICAgaWYgKCFkZWZWYWwpIHtcbiAgICAgICAgICAgIGNvbnN0IGZpbGVOYW1lID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2ZpbGVuYW1lJyk7XG4gICAgICAgICAgICBpZiAoZmlsZU5hbWUgIT09ICcnKSB7XG4gICAgICAgICAgICAgICAgZGVmVmFsID0gZmlsZU5hbWUudHJpbSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQnVpbGQgdHJlZSBzdHJ1Y3R1cmUgZnJvbSBmaWxlc1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXMgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5idWlsZFRyZWVTdHJ1Y3R1cmUoZmlsZXMsIGRlZlZhbCk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIHZhbHVlcyBhcnJheSBmb3IgZHJvcGRvd24gd2l0aCBhbGwgaXRlbXMgKGluY2x1ZGluZyBmb2xkZXJzKVxuICAgICAgICBjb25zdCBkcm9wZG93blZhbHVlcyA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtcy5tYXAoKGl0ZW0sIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBpZiAoaXRlbS50eXBlID09PSAnZm9sZGVyJykge1xuICAgICAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGl0ZW0ubmFtZS5yZXBsYWNlKC88W14+XSo+L2csICcnKSwgLy8gUmVtb3ZlIEhUTUwgdGFncyBmb3Igc2VhcmNoXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnJyxcbiAgICAgICAgICAgICAgICAgICAgZGlzYWJsZWQ6IHRydWVcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBpdGVtLm5hbWUucmVwbGFjZSgvPFtePl0qPi9nLCAnJyksIC8vIFJlbW92ZSBIVE1MIHRhZ3MgZm9yIHNlYXJjaFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogaXRlbS52YWx1ZSxcbiAgICAgICAgICAgICAgICAgICAgc2VsZWN0ZWQ6IGl0ZW0uc2VsZWN0ZWRcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBkcm9wZG93biB3aXRoIHZhbHVlc1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXR1cCBtZW51Jywge1xuICAgICAgICAgICAgdmFsdWVzOiBkcm9wZG93blZhbHVlc1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgdGhlIGRlZmF1bHQgc2VsZWN0ZWQgdmFsdWUgaWYgYW55XG4gICAgICAgIGNvbnN0IHNlbGVjdGVkSXRlbSA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtcy5maW5kKGl0ZW0gPT4gaXRlbS5zZWxlY3RlZCk7XG4gICAgICAgIGlmIChzZWxlY3RlZEl0ZW0pIHtcbiAgICAgICAgICAgIC8vIFVzZSBzZXRUaW1lb3V0IHRvIGVuc3VyZSBkcm9wZG93biBpcyBmdWxseSBpbml0aWFsaXplZFxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gRXhwYW5kIHBhcmVudCBmb2xkZXIgYmVmb3JlIHNlbGVjdGluZyBmaWxlXG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuZXhwYW5kRm9sZGVyRm9yRmlsZShzZWxlY3RlZEl0ZW0udmFsdWUpO1xuICAgICAgICAgICAgICAgIC8vIFNldHRpbmcgc2VsZWN0ZWQgdmFsdWUgd2lsbCB0cmlnZ2VyIG9uQ2hhbmdlIGNhbGxiYWNrIHdoaWNoIGNhbGxzIHVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKVxuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIHNlbGVjdGVkSXRlbS52YWx1ZSk7XG4gICAgICAgICAgICAgICAgLy8gRm9yY2UgcmVmcmVzaCB0aGUgZHJvcGRvd24gdG8gc2hvdyB0aGUgc2VsZWN0ZWQgdmFsdWVcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdyZWZyZXNoJyk7XG4gICAgICAgICAgICAgICAgLy8gQWxzbyBzZXQgdGhlIHRleHQgdG8gc2hvdyBmdWxsIHBhdGhcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXQgdGV4dCcsIHNlbGVjdGVkSXRlbS52YWx1ZSk7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2ZpbGVuYW1lJywgc2VsZWN0ZWRJdGVtLnZhbHVlKTtcbiAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZGVmVmFsKSB7XG4gICAgICAgICAgICAvLyBJZiB3ZSBoYXZlIGEgZGVmYXVsdCB2YWx1ZSBidXQgbm8gaXRlbSB3YXMgbWFya2VkIGFzIHNlbGVjdGVkLFxuICAgICAgICAgICAgLy8gdHJ5IHRvIGZpbmQgYW5kIHNlbGVjdCBpdCBtYW51YWxseVxuICAgICAgICAgICAgY29uc3QgaXRlbVRvU2VsZWN0ID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zLmZpbmQoaXRlbSA9PlxuICAgICAgICAgICAgICAgIGl0ZW0udHlwZSA9PT0gJ2ZpbGUnICYmIGl0ZW0udmFsdWUgPT09IGRlZlZhbFxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGlmIChpdGVtVG9TZWxlY3QpIHtcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRXhwYW5kIHBhcmVudCBmb2xkZXIgYmVmb3JlIHNlbGVjdGluZyBmaWxlXG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmV4cGFuZEZvbGRlckZvckZpbGUoaXRlbVRvU2VsZWN0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0dGluZyBzZWxlY3RlZCB2YWx1ZSB3aWxsIHRyaWdnZXIgb25DaGFuZ2UgY2FsbGJhY2sgd2hpY2ggY2FsbHMgdXBkYXRlTG9nRnJvbVNlcnZlcigpXG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGl0ZW1Ub1NlbGVjdC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3JlZnJlc2gnKTtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignc2V0IHRleHQnLCBpdGVtVG9TZWxlY3QudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZmlsZW5hbWUnLCBpdGVtVG9TZWxlY3QudmFsdWUpO1xuICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEhpZGUgdGhlIGRpbW1lciBhZnRlciBsb2FkaW5nIG9ubHkgaWYgbm8gZmlsZSBpcyBzZWxlY3RlZFxuICAgICAgICAgICAgICAgIGlmICghc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEhpZGUgdGhlIGRpbW1lciBhZnRlciBsb2FkaW5nIG9ubHkgaWYgbm8gZmlsZSBpcyBzZWxlY3RlZFxuICAgICAgICAgICAgaWYgKCFzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1hcmsgaW5pdGlhbGl6YXRpb24gYXMgY29tcGxldGUgdG8gYWxsb3cgaGFzaGNoYW5nZSBoYW5kbGVyIHRvIHdvcmtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0luaXRpYWxpemluZyA9IGZhbHNlO1xuICAgICAgICB9LCAyMDApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBjaGFuZ2luZyB0aGUgbG9nIGZpbGUgaW4gdGhlIHNlbGVjdCBkcm9wZG93bi5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgc2VsZWN0ZWQgdmFsdWUuXG4gICAgICovXG4gICAgY2JPbkNoYW5nZUZpbGUodmFsdWUpIHtcbiAgICAgICAgaWYgKHZhbHVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0IGRyb3Bkb3duIHRleHQgdG8gc2hvdyB0aGUgZnVsbCBmaWxlIHBhdGhcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignc2V0IHRleHQnLCB2YWx1ZSk7XG5cbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2ZpbGVuYW1lJywgdmFsdWUpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBVUkwgaGFzaCB3aXRoIHRoZSBzZWxlY3RlZCBmaWxlXG4gICAgICAgIHdpbmRvdy5sb2NhdGlvbi5oYXNoID0gJ2ZpbGU9JyArIGVuY29kZVVSSUNvbXBvbmVudCh2YWx1ZSk7XG5cbiAgICAgICAgLy8gUmVzZXQgZmlsdGVycyBvbmx5IGlmIHVzZXIgbWFudWFsbHkgY2hhbmdlZCB0aGUgZmlsZSAobm90IGR1cmluZyBpbml0aWFsaXphdGlvbilcbiAgICAgICAgaWYgKCFzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0luaXRpYWxpemluZykge1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MucmVzZXRGaWx0ZXJzKCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBIaWRlIGF1dG8tcmVmcmVzaCBidXR0b24gZm9yIHJvdGF0ZWQgbG9nIGZpbGVzICh0aGV5IGRvbid0IGNoYW5nZSlcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudXBkYXRlQXV0b1JlZnJlc2hWaXNpYmlsaXR5KHZhbHVlKTtcblxuICAgICAgICAvLyBSZXNldCBsYXN0IGtub3duIGRhdGEgZW5kIGZvciBuZXcgZmlsZVxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sYXN0S25vd25EYXRhRW5kID0gbnVsbDtcblxuICAgICAgICAvLyBDaGVjayBpZiB0aW1lIHJhbmdlIGlzIGF2YWlsYWJsZSBmb3IgdGhpcyBmaWxlXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmNoZWNrVGltZVJhbmdlQXZhaWxhYmlsaXR5KHZhbHVlKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgZmlsZSBpcyBhIHJvdGF0ZWQgbG9nIGZpbGUgKGFyY2hpdmVkLCBubyBsb25nZXIgYmVpbmcgd3JpdHRlbiB0bylcbiAgICAgKiBSb3RhdGVkIGZpbGVzIGhhdmUgc3VmZml4ZXMgbGlrZTogLjAsIC4xLCAuMiwgLmd6LCAuMS5neiwgLjIuZ3osIGV0Yy5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZW5hbWUgLSBMb2cgZmlsZSBwYXRoXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IFRydWUgaWYgZmlsZSBpcyByb3RhdGVkL2FyY2hpdmVkXG4gICAgICovXG4gICAgaXNSb3RhdGVkTG9nRmlsZShmaWxlbmFtZSkge1xuICAgICAgICBpZiAoIWZpbGVuYW1lKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgLy8gTWF0Y2ggcGF0dGVybnM6IC4wLCAuMSwgLjIsIC4uLiwgLmd6LCAuMC5neiwgLjEuZ3osIGV0Yy5cbiAgICAgICAgcmV0dXJuIC9cXC5cXGQrKCR8XFwuZ3okKXxcXC5neiQvLnRlc3QoZmlsZW5hbWUpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgYXV0by1yZWZyZXNoIGJ1dHRvbiB2aXNpYmlsaXR5IGJhc2VkIG9uIGZpbGUgdHlwZVxuICAgICAqIEhpZGUgZm9yIHJvdGF0ZWQgZmlsZXMsIHNob3cgZm9yIGFjdGl2ZSBsb2cgZmlsZXNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZW5hbWUgLSBMb2cgZmlsZSBwYXRoXG4gICAgICovXG4gICAgdXBkYXRlQXV0b1JlZnJlc2hWaXNpYmlsaXR5KGZpbGVuYW1lKSB7XG4gICAgICAgIGNvbnN0ICRhdXRvQnRuID0gJCgnI3Nob3ctbGFzdC1sb2ctYXV0bycpO1xuICAgICAgICBjb25zdCBpc1JvdGF0ZWQgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc1JvdGF0ZWRMb2dGaWxlKGZpbGVuYW1lKTtcblxuICAgICAgICBpZiAoaXNSb3RhdGVkKSB7XG4gICAgICAgICAgICAvLyBTdG9wIGF1dG8tcmVmcmVzaCBpZiBpdCB3YXMgYWN0aXZlXG4gICAgICAgICAgICBpZiAoc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgJGF1dG9CdG4uZmluZCgnLmljb25zIGkucmVmcmVzaCcpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdXBkYXRlTG9nVmlld1dvcmtlci5zdG9wKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAkYXV0b0J0bi5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkYXV0b0J0bi5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvdyBmaWx0ZXIgdHlwZSBwb3B1cCBiZWxvdyB0aGUgZmlsdGVyIGlucHV0LlxuICAgICAqIFByZS1zZWxlY3RzIHRoZSBmaXJzdCBvcHRpb24gZm9yIGltbWVkaWF0ZSBrZXlib2FyZCBuYXZpZ2F0aW9uLlxuICAgICAqL1xuICAgIHNob3dGaWx0ZXJUeXBlUG9wdXAoKSB7XG4gICAgICAgIGNvbnN0ICRwb3B1cCA9ICQoJyNmaWx0ZXItdHlwZS1wb3B1cCcpO1xuICAgICAgICAkcG9wdXAucmVtb3ZlQ2xhc3MoJ2hpZGRlbicpXG4gICAgICAgICAgICAuY3NzKHt0b3A6ICcnLCBsZWZ0OiAnJywgZGlzcGxheTogJyd9KVxuICAgICAgICAgICAgLnNob3coKTtcbiAgICAgICAgLy8gUHJlLXNlbGVjdCBmaXJzdCBvcHRpb24gZm9yIGtleWJvYXJkIG5hdmlnYXRpb25cbiAgICAgICAgJHBvcHVwLmZpbmQoJy5maWx0ZXItdHlwZS1vcHRpb24nKS5yZW1vdmVDbGFzcygnZm9jdXNlZCcpO1xuICAgICAgICAkcG9wdXAuZmluZCgnLmZpbHRlci10eXBlLW9wdGlvbicpLmZpcnN0KCkuYWRkQ2xhc3MoJ2ZvY3VzZWQnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGlkZSB0aGUgZmlsdGVyIHR5cGUgcG9wdXBcbiAgICAgKi9cbiAgICBoaWRlRmlsdGVyVHlwZVBvcHVwKCkge1xuICAgICAgICBjb25zdCAkcG9wdXAgPSAkKCcjZmlsdGVyLXR5cGUtcG9wdXAnKTtcbiAgICAgICAgJHBvcHVwLmZpbmQoJy5maWx0ZXItdHlwZS1vcHRpb24nKS5yZW1vdmVDbGFzcygnZm9jdXNlZCcpO1xuICAgICAgICAkcG9wdXAuYWRkQ2xhc3MoJ2hpZGRlbicpLmhpZGUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTmF2aWdhdGUgZmlsdGVyIHR5cGUgcG9wdXAgb3B0aW9ucyB3aXRoIGFycm93IGtleXMuXG4gICAgICogV3JhcHMgYXJvdW5kIGF0IGJvdW5kYXJpZXMuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGRpcmVjdGlvbiAtIDEgZm9yIGRvd24sIC0xIGZvciB1cFxuICAgICAqL1xuICAgIG5hdmlnYXRlRmlsdGVyUG9wdXAoZGlyZWN0aW9uKSB7XG4gICAgICAgIGNvbnN0ICRwb3B1cCA9ICQoJyNmaWx0ZXItdHlwZS1wb3B1cCcpO1xuICAgICAgICBjb25zdCAkb3B0aW9ucyA9ICRwb3B1cC5maW5kKCcuZmlsdGVyLXR5cGUtb3B0aW9uJyk7XG4gICAgICAgIGNvbnN0ICRmb2N1c2VkID0gJG9wdGlvbnMuZmlsdGVyKCcuZm9jdXNlZCcpO1xuXG4gICAgICAgIGxldCBpbmRleCA9ICRvcHRpb25zLmluZGV4KCRmb2N1c2VkKTtcbiAgICAgICAgaW5kZXggKz0gZGlyZWN0aW9uO1xuXG4gICAgICAgIC8vIFdyYXAgYXJvdW5kXG4gICAgICAgIGlmIChpbmRleCA8IDApIHtcbiAgICAgICAgICAgIGluZGV4ID0gJG9wdGlvbnMubGVuZ3RoIC0gMTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaW5kZXggPj0gJG9wdGlvbnMubGVuZ3RoKSB7XG4gICAgICAgICAgICBpbmRleCA9IDA7XG4gICAgICAgIH1cblxuICAgICAgICAkb3B0aW9ucy5yZW1vdmVDbGFzcygnZm9jdXNlZCcpO1xuICAgICAgICAkb3B0aW9ucy5lcShpbmRleCkuYWRkQ2xhc3MoJ2ZvY3VzZWQnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkIGEgZmlsdGVyIGNvbmRpdGlvbiwgc3luYyB0byBmb3JtLCByZW5kZXIgbGFiZWxzLCBhbmQgcmVsb2FkIGxvZ1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0eXBlIC0gJ2NvbnRhaW5zJyBvciAnbm90Q29udGFpbnMnXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gdGhlIGZpbHRlciB0ZXh0XG4gICAgICovXG4gICAgYWRkRmlsdGVyQ29uZGl0aW9uKHR5cGUsIHZhbHVlKSB7XG4gICAgICAgIGlmICghdmFsdWUgfHwgdmFsdWUudHJpbSgpID09PSAnJykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmZpbHRlckNvbmRpdGlvbnMucHVzaCh7dHlwZSwgdmFsdWU6IHZhbHVlLnRyaW0oKX0pO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5zeW5jRmlsdGVyQ29uZGl0aW9uc1RvRm9ybSgpO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5yZW5kZXJGaWx0ZXJMYWJlbHMoKTtcbiAgICAgICAgJCgnI2ZpbHRlci1pbnB1dCcpLnZhbCgnJyk7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIodHJ1ZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbW92ZSBhIGZpbHRlciBjb25kaXRpb24gYnkgaW5kZXhcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gaW5kZXggLSBjb25kaXRpb24gaW5kZXggdG8gcmVtb3ZlXG4gICAgICovXG4gICAgcmVtb3ZlRmlsdGVyQ29uZGl0aW9uKGluZGV4KSB7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmZpbHRlckNvbmRpdGlvbnMuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Muc3luY0ZpbHRlckNvbmRpdGlvbnNUb0Zvcm0oKTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MucmVuZGVyRmlsdGVyTGFiZWxzKCk7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIodHJ1ZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENsZWFyIGFsbCBmaWx0ZXIgY29uZGl0aW9uc1xuICAgICAqL1xuICAgIGNsZWFyQWxsRmlsdGVyQ29uZGl0aW9ucygpIHtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuZmlsdGVyQ29uZGl0aW9ucyA9IFtdO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5zeW5jRmlsdGVyQ29uZGl0aW9uc1RvRm9ybSgpO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5yZW5kZXJGaWx0ZXJMYWJlbHMoKTtcbiAgICAgICAgJCgnI2ZpbHRlci1pbnB1dCcpLnZhbCgnJyk7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIodHJ1ZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNlcmlhbGl6ZSBmaWx0ZXJDb25kaXRpb25zIGFycmF5IGFzIEpTT04gaW50byBoaWRkZW4gI2ZpbHRlciBmaWVsZFxuICAgICAqL1xuICAgIHN5bmNGaWx0ZXJDb25kaXRpb25zVG9Gb3JtKCkge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmZpbHRlckNvbmRpdGlvbnMubGVuZ3RoID4gMFxuICAgICAgICAgICAgPyBKU09OLnN0cmluZ2lmeShzeXN0ZW1EaWFnbm9zdGljTG9ncy5maWx0ZXJDb25kaXRpb25zKVxuICAgICAgICAgICAgOiAnJztcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2ZpbHRlcicsIHZhbHVlKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVuZGVyIGxhYmVsIGNoaXBzIGluc2lkZSAjZmlsdGVyLWxhYmVscyBmcm9tIGZpbHRlckNvbmRpdGlvbnNcbiAgICAgKi9cbiAgICByZW5kZXJGaWx0ZXJMYWJlbHMoKSB7XG4gICAgICAgIGNvbnN0ICRjb250YWluZXIgPSAkKCcjZmlsdGVyLWxhYmVscycpO1xuICAgICAgICAkY29udGFpbmVyLmVtcHR5KCk7XG5cbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuZmlsdGVyQ29uZGl0aW9ucy5mb3JFYWNoKChjb25kaXRpb24sIGluZGV4KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjc3NDbGFzcyA9IGNvbmRpdGlvbi50eXBlID09PSAnbm90Q29udGFpbnMnID8gJ25vdC1jb250YWlucycgOiAnY29udGFpbnMnO1xuICAgICAgICAgICAgY29uc3QgaWNvbkNsYXNzID0gY29uZGl0aW9uLnR5cGUgPT09ICdub3RDb250YWlucycgPyAnYmFuJyA6ICdjaGVjayBjaXJjbGUnO1xuICAgICAgICAgICAgY29uc3QgaWNvbkNvbG9yID0gY29uZGl0aW9uLnR5cGUgPT09ICdub3RDb250YWlucycgPyAncmVkJyA6ICd0ZWFsJztcbiAgICAgICAgICAgIGNvbnN0ICRsYWJlbCA9ICQoYDxzcGFuIGNsYXNzPVwiZmlsdGVyLWNvbmRpdGlvbi1sYWJlbCAke2Nzc0NsYXNzfVwiIGRhdGEtaW5kZXg9XCIke2luZGV4fVwiPjwvc3Bhbj5gKTtcbiAgICAgICAgICAgICRsYWJlbC5hcHBlbmQoYDxpIGNsYXNzPVwiJHtpY29uQ2xhc3N9IGljb24gJHtpY29uQ29sb3J9XCI+PC9pPmApO1xuICAgICAgICAgICAgJGxhYmVsLmFwcGVuZChgPHNwYW4+JHskKCc8c3Bhbj4nKS50ZXh0KGNvbmRpdGlvbi52YWx1ZSkuaHRtbCgpfTwvc3Bhbj5gKTtcbiAgICAgICAgICAgICRsYWJlbC5hcHBlbmQoJzxpIGNsYXNzPVwiZGVsZXRlIGljb25cIj48L2k+Jyk7XG4gICAgICAgICAgICAkY29udGFpbmVyLmFwcGVuZCgkbGFiZWwpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBmaWx0ZXIgY29uZGl0aW9ucyBmcm9tIFVSTCBwYXJhbWV0ZXIgb3IgZXhpc3RpbmcgaGlkZGVuIGZpZWxkIHZhbHVlLlxuICAgICAqIEhhbmRsZXMgbGVnYWN5IHBsYWluLXN0cmluZyBmb3JtYXQgKGUuZy4gXCJbQy0wMDAwNDcyMV0mW0MtMDAwMDQ3MjNdXCIgZnJvbSBDRFIgbGlua3MpXG4gICAgICogYnkgY29udmVydGluZyAmLXNlcGFyYXRlZCBwYXJ0cyBpbnRvIGluZGl2aWR1YWwgXCJjb250YWluc1wiIGNvbmRpdGlvbnMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZpbHRlckZyb21VcmwoKSB7XG4gICAgICAgIGNvbnN0IHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG4gICAgICAgIGNvbnN0IGZpbHRlclBhcmFtID0gdXJsUGFyYW1zLmdldCgnZmlsdGVyJyk7XG5cbiAgICAgICAgaWYgKGZpbHRlclBhcmFtICYmIGZpbHRlclBhcmFtLnRyaW0oKSAhPT0gJycpIHtcbiAgICAgICAgICAgIGNvbnN0IHRyaW1tZWQgPSBmaWx0ZXJQYXJhbS50cmltKCk7XG5cbiAgICAgICAgICAgIC8vIENoZWNrIGlmIGl0J3MgSlNPTiBmb3JtYXRcbiAgICAgICAgICAgIGlmICh0cmltbWVkLnN0YXJ0c1dpdGgoJ1snKSkge1xuICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UodHJpbW1lZCk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHBhcnNlZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmZpbHRlckNvbmRpdGlvbnMgPSBwYXJzZWQuZmlsdGVyKFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIChjKSA9PiBjICYmIGMudmFsdWUgJiYgYy50eXBlXG4gICAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBJbnZhbGlkIEpTT04sIHRyZWF0IGFzIGxlZ2FjeVxuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5maWx0ZXJDb25kaXRpb25zID0gdHJpbW1lZFxuICAgICAgICAgICAgICAgICAgICAgICAgLnNwbGl0KCcmJylcbiAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoKHApID0+IHAudHJpbSgpKVxuICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcigocCkgPT4gcCAhPT0gJycpXG4gICAgICAgICAgICAgICAgICAgICAgICAubWFwKChwKSA9PiAoe3R5cGU6ICdjb250YWlucycsIHZhbHVlOiBwfSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gTGVnYWN5IHBsYWluIHN0cmluZzogc3BsaXQgYnkgJiBpbnRvIGNvbnRhaW5zIGNvbmRpdGlvbnNcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5maWx0ZXJDb25kaXRpb25zID0gdHJpbW1lZFxuICAgICAgICAgICAgICAgICAgICAuc3BsaXQoJyYnKVxuICAgICAgICAgICAgICAgICAgICAubWFwKChwKSA9PiBwLnRyaW0oKSlcbiAgICAgICAgICAgICAgICAgICAgLmZpbHRlcigocCkgPT4gcCAhPT0gJycpXG4gICAgICAgICAgICAgICAgICAgIC5tYXAoKHApID0+ICh7dHlwZTogJ2NvbnRhaW5zJywgdmFsdWU6IHB9KSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnN5bmNGaWx0ZXJDb25kaXRpb25zVG9Gb3JtKCk7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5yZW5kZXJGaWx0ZXJMYWJlbHMoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXNldCBhbGwgZmlsdGVycyB3aGVuIGNoYW5naW5nIGxvZyBmaWxlc1xuICAgICAqL1xuICAgIHJlc2V0RmlsdGVycygpIHtcbiAgICAgICAgLy8gRGVhY3RpdmF0ZSBhbGwgcXVpY2stcGVyaW9kIGJ1dHRvbnNcbiAgICAgICAgJCgnLnBlcmlvZC1idG4nKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG5cbiAgICAgICAgLy8gUmVzZXQgbG9nTGV2ZWwgZHJvcGRvd24gdG8gZGVmYXVsdCAoQWxsIExldmVscyAtIGVtcHR5IHZhbHVlKVxuICAgICAgICAkKCcjbG9nTGV2ZWwtZHJvcGRvd24nKS5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgJycpO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnbG9nTGV2ZWwnLCAnJyk7XG5cbiAgICAgICAgLy8gTk9URTogRmlsdGVyIGNvbmRpdGlvbnMgYXJlIGludGVudGlvbmFsbHkgcHJlc2VydmVkIHdoZW4gY2hhbmdpbmcgZmlsZXMuXG4gICAgICAgIC8vIFdoZW4gdXNlciBuYXZpZ2F0ZXMgZnJvbSBDRFIgd2l0aCBmaWx0ZXIgcGFyYW1zIChlLmcuID9maWx0ZXI9W0MtMDAwMDQ3MjFdKSxcbiAgICAgICAgLy8gdGhlIGZpbHRlcnMgc2hvdWxkIHBlcnNpc3QgYWNyb3NzIGZpbGUgY2hhbmdlcyAodmVyYm9zZSDihpIgdmVyYm9zZS4wKS5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHBlcmlvZCBidXR0b25zIHZpc2liaWxpdHkgYmFzZWQgb24gbG9nIGZpbGUgZHVyYXRpb25cbiAgICAgKiBTaG93cyBvbmx5IGJ1dHRvbnMgZm9yIHBlcmlvZHMgdGhhdCBhcmUgPD0gbG9nIGZpbGUgZHVyYXRpb25cbiAgICAgKiBIaWRlcyBlbnRpcmUgY29udGFpbmVyIGlmIG5vIGJ1dHRvbnMgYXJlIHZpc2libGVcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbG9nRHVyYXRpb24gLSBMb2cgZmlsZSBkdXJhdGlvbiBpbiBzZWNvbmRzXG4gICAgICovXG4gICAgdXBkYXRlUGVyaW9kQnV0dG9uc1Zpc2liaWxpdHkobG9nRHVyYXRpb24pIHtcbiAgICAgICAgY29uc3QgJHBlcmlvZEJ1dHRvbnMgPSAkKCcucGVyaW9kLWJ0bicpO1xuICAgICAgICBjb25zdCAkcGVyaW9kQ29udGFpbmVyID0gJCgnI3BlcmlvZC1idXR0b25zJyk7XG4gICAgICAgIGxldCBsYXJnZXN0VmlzaWJsZVBlcmlvZCA9IDA7XG4gICAgICAgIGxldCAkbGFyZ2VzdFZpc2libGVCdXR0b24gPSBudWxsO1xuICAgICAgICBsZXQgdmlzaWJsZUNvdW50ID0gMDtcblxuICAgICAgICAkcGVyaW9kQnV0dG9ucy5lYWNoKChpbmRleCwgYnV0dG9uKSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkYnV0dG9uID0gJChidXR0b24pO1xuICAgICAgICAgICAgY29uc3QgcGVyaW9kID0gcGFyc2VJbnQoJGJ1dHRvbi5kYXRhKCdwZXJpb2QnKSwgMTApO1xuXG4gICAgICAgICAgICAvLyBTaG93IGJ1dHRvbiBpZiBwZXJpb2QgaXMgbGVzcyB0aGFuIG9yIGVxdWFsIHRvIGxvZyBkdXJhdGlvblxuICAgICAgICAgICAgLy8gQWRkIDEwJSB0b2xlcmFuY2UgZm9yIHJvdW5kaW5nL2VkZ2UgY2FzZXNcbiAgICAgICAgICAgIGlmIChwZXJpb2QgPD0gbG9nRHVyYXRpb24gKiAxLjEpIHtcbiAgICAgICAgICAgICAgICAkYnV0dG9uLnNob3coKTtcbiAgICAgICAgICAgICAgICB2aXNpYmxlQ291bnQrKztcbiAgICAgICAgICAgICAgICAvLyBUcmFjayB0aGUgbGFyZ2VzdCB2aXNpYmxlIHBlcmlvZCBmb3IgZGVmYXVsdCBzZWxlY3Rpb25cbiAgICAgICAgICAgICAgICBpZiAocGVyaW9kID4gbGFyZ2VzdFZpc2libGVQZXJpb2QpIHtcbiAgICAgICAgICAgICAgICAgICAgbGFyZ2VzdFZpc2libGVQZXJpb2QgPSBwZXJpb2Q7XG4gICAgICAgICAgICAgICAgICAgICRsYXJnZXN0VmlzaWJsZUJ1dHRvbiA9ICRidXR0b247XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkYnV0dG9uLmhpZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSGlkZSBlbnRpcmUgY29udGFpbmVyIGlmIG5vIGJ1dHRvbnMgYXJlIHZpc2libGVcbiAgICAgICAgLy8gQWxzbyB0b2dnbGUgY2xhc3Mgb24gcGFyZW50IHRvIHJlbW92ZSBnYXAgZm9yIHByb3BlciBhbGlnbm1lbnRcbiAgICAgICAgY29uc3QgJHRpbWVDb250cm9sc0lubGluZSA9ICQoJy50aW1lLWNvbnRyb2xzLWlubGluZScpO1xuICAgICAgICBpZiAodmlzaWJsZUNvdW50ID09PSAwKSB7XG4gICAgICAgICAgICAkcGVyaW9kQ29udGFpbmVyLmhpZGUoKTtcbiAgICAgICAgICAgICR0aW1lQ29udHJvbHNJbmxpbmUuYWRkQ2xhc3MoJ25vLXBlcmlvZC1idXR0b25zJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkcGVyaW9kQ29udGFpbmVyLnNob3coKTtcbiAgICAgICAgICAgICR0aW1lQ29udHJvbHNJbmxpbmUucmVtb3ZlQ2xhc3MoJ25vLXBlcmlvZC1idXR0b25zJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBTZXQgbGFyZ2VzdCB2aXNpYmxlIGJ1dHRvbiBhcyBhY3RpdmUgKGlmIG5vIGJ1dHRvbiBpcyBjdXJyZW50bHkgYWN0aXZlKVxuICAgICAgICBpZiAoJGxhcmdlc3RWaXNpYmxlQnV0dG9uICYmICEkcGVyaW9kQnV0dG9ucy5maWx0ZXIoJy5hY3RpdmUnKS5pcygnOnZpc2libGUnKSkge1xuICAgICAgICAgICAgJHBlcmlvZEJ1dHRvbnMucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgJGxhcmdlc3RWaXNpYmxlQnV0dG9uLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiB0aW1lIHJhbmdlIGlzIGF2YWlsYWJsZSBmb3IgdGhlIHNlbGVjdGVkIGxvZyBmaWxlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVuYW1lIC0gTG9nIGZpbGUgcGF0aFxuICAgICAqL1xuICAgIGNoZWNrVGltZVJhbmdlQXZhaWxhYmlsaXR5KGZpbGVuYW1lKSB7XG4gICAgICAgIC8vIFNob3cgZGltbWVyIG9ubHkgaWYgbm90IGluIGF1dG8tdXBkYXRlIG1vZGVcbiAgICAgICAgaWYgKCFzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUpIHtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIFRyeSB0byBnZXQgdGltZSByYW5nZSBmb3IgdGhpcyBmaWxlXG4gICAgICAgICAgICBTeXNsb2dBUEkuZ2V0TG9nVGltZVJhbmdlKGZpbGVuYW1lLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS50aW1lX3JhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRpbWUgcmFuZ2UgaXMgYXZhaWxhYmxlIC0gdXNlIHRpbWUtYmFzZWQgbmF2aWdhdGlvblxuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pbml0aWFsaXplTmF2aWdhdGlvbihyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBUaW1lIHJhbmdlIG5vdCBhdmFpbGFibGUgLSB1c2UgbGluZSBudW1iZXIgZmFsbGJhY2tcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaW5pdGlhbGl6ZU5hdmlnYXRpb24obnVsbCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBjaGVja2luZyB0aW1lIHJhbmdlOicsIGVycm9yKTtcbiAgICAgICAgICAgIC8vIEZhbGxiYWNrIHRvIGxpbmUgbnVtYmVyIG1vZGVcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmluaXRpYWxpemVOYXZpZ2F0aW9uKG51bGwpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdW5pdmVyc2FsIG5hdmlnYXRpb24gd2l0aCB0aW1lIG9yIGxpbmUgbnVtYmVyIG1vZGVcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gdGltZVJhbmdlRGF0YSAtIFRpbWUgcmFuZ2UgZGF0YSBmcm9tIEFQSSAob3B0aW9uYWwpXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZU5hdmlnYXRpb24odGltZVJhbmdlRGF0YSkge1xuICAgICAgICAvLyBDaGVjayBpZiB3ZSBoYXZlIHZhbGlkIHRpbWUgcmFuZ2Ugd2l0aCBhY3R1YWwgdGltZXN0YW1wcyAobm90IG51bGwpXG4gICAgICAgIGNvbnN0IGhhc1ZhbGlkVGltZVJhbmdlID0gdGltZVJhbmdlRGF0YSAmJlxuICAgICAgICAgICAgdGltZVJhbmdlRGF0YS50aW1lX3JhbmdlICYmXG4gICAgICAgICAgICB0eXBlb2YgdGltZVJhbmdlRGF0YS50aW1lX3JhbmdlLnN0YXJ0ID09PSAnbnVtYmVyJyAmJlxuICAgICAgICAgICAgdHlwZW9mIHRpbWVSYW5nZURhdGEudGltZV9yYW5nZS5lbmQgPT09ICdudW1iZXInO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIHRpbWUgcmFuZ2UgaXMgbWVhbmluZ2Z1bCAobW9yZSB0aGFuIDEgc2Vjb25kIG9mIGRhdGEpXG4gICAgICAgIGNvbnN0IGhhc011bHRpcGxlVGltZXN0YW1wcyA9IGhhc1ZhbGlkVGltZVJhbmdlICYmXG4gICAgICAgICAgICAodGltZVJhbmdlRGF0YS50aW1lX3JhbmdlLmVuZCAtIHRpbWVSYW5nZURhdGEudGltZV9yYW5nZS5zdGFydCkgPiAxO1xuXG4gICAgICAgIGlmIChoYXNWYWxpZFRpbWVSYW5nZSAmJiBoYXNNdWx0aXBsZVRpbWVzdGFtcHMpIHtcbiAgICAgICAgICAgIC8vIFRpbWUtYmFzZWQgbW9kZVxuICAgICAgICAgICAgdGhpcy50aW1lU2xpZGVyRW5hYmxlZCA9IHRydWU7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRUaW1lUmFuZ2UgPSB0aW1lUmFuZ2VEYXRhLnRpbWVfcmFuZ2U7XG5cbiAgICAgICAgICAgIC8vIENhbGN1bGF0ZSBsb2cgZmlsZSBkdXJhdGlvbiBhbmQgdXBkYXRlIHBlcmlvZCBidXR0b25zIHZpc2liaWxpdHlcbiAgICAgICAgICAgIGNvbnN0IGxvZ0R1cmF0aW9uID0gdGhpcy5jdXJyZW50VGltZVJhbmdlLmVuZCAtIHRoaXMuY3VycmVudFRpbWVSYW5nZS5zdGFydDtcbiAgICAgICAgICAgIHRoaXMudXBkYXRlUGVyaW9kQnV0dG9uc1Zpc2liaWxpdHkobG9nRHVyYXRpb24pO1xuXG4gICAgICAgICAgICAvLyBTaG93IHBlcmlvZCBidXR0b25zIGZvciB0aW1lLWJhc2VkIG5hdmlnYXRpb25cbiAgICAgICAgICAgICQoJyNwZXJpb2QtYnV0dG9ucycpLnNob3coKTtcblxuICAgICAgICAgICAgLy8gU2V0IHNlcnZlciB0aW1lem9uZSBvZmZzZXRcbiAgICAgICAgICAgIGlmICh0aW1lUmFuZ2VEYXRhLnNlcnZlcl90aW1lem9uZV9vZmZzZXQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIFNWR1RpbWVsaW5lLnNlcnZlclRpbWV6b25lT2Zmc2V0ID0gdGltZVJhbmdlRGF0YS5zZXJ2ZXJfdGltZXpvbmVfb2Zmc2V0O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIFNWRyB0aW1lbGluZSB3aXRoIHRpbWUgcmFuZ2VcbiAgICAgICAgICAgIFNWR1RpbWVsaW5lLmluaXRpYWxpemUoJyN0aW1lLXNsaWRlci1jb250YWluZXInLCB0aGlzLmN1cnJlbnRUaW1lUmFuZ2UpO1xuXG4gICAgICAgICAgICAvLyBTZXQgY2FsbGJhY2sgZm9yIHRpbWUgd2luZG93IGNoYW5nZXNcbiAgICAgICAgICAgIC8vIEFsd2F5cyB1c2UgbGF0ZXN0PXRydWUgc28gdGhlIG1vc3QgcmVjZW50IGxvZyBlbnRyaWVzIGFyZSBkaXNwbGF5ZWRcbiAgICAgICAgICAgIC8vIFRydW5jYXRpb24gKGlmIGFueSkgaGFwcGVucyBvbiB0aGUgbGVmdCBzaWRlLCB3aGljaCBpcyBsZXNzIGRpc3J1cHRpdmVcbiAgICAgICAgICAgIFNWR1RpbWVsaW5lLm9uUmFuZ2VDaGFuZ2UgPSAoc3RhcnQsIGVuZCwgZHJhZ2dlZEhhbmRsZSkgPT4ge1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmxvYWRMb2dCeVRpbWVSYW5nZShzdGFydCwgZW5kLCB0cnVlKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIFNldCBjYWxsYmFjayBmb3IgdHJ1bmNhdGVkIHpvbmUgY2xpY2tzXG4gICAgICAgICAgICAvLyBMZWZ0IHpvbmVzICh0aW1lbGluZS10cnVuY2F0ZWQtbGVmdCk6IGRhdGEgd2FzIGN1dCBmcm9tIGJlZ2lubmluZywgbG9hZCB3aXRoIGxhdGVzdD10cnVlXG4gICAgICAgICAgICAvLyBSaWdodCB6b25lcyAodGltZWxpbmUtdHJ1bmNhdGVkLXJpZ2h0KTogZGF0YSB3YXMgY3V0IGZyb20gZW5kLCBsb2FkIHdpdGggbGF0ZXN0PWZhbHNlXG4gICAgICAgICAgICBTVkdUaW1lbGluZS5vblRydW5jYXRlZFpvbmVDbGljayA9IChzdGFydCwgZW5kLCBpc0xlZnRab25lKSA9PiB7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9hZExvZ0J5VGltZVJhbmdlKHN0YXJ0LCBlbmQsIGlzTGVmdFpvbmUpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gTG9hZCBpbml0aWFsIGNodW5rIHdpdGggbGF0ZXN0PXRydWUgdG8gc2hvdyBuZXdlc3QgZW50cmllc1xuICAgICAgICAgICAgLy8gUGFzcyBpc0luaXRpYWxMb2FkPXRydWUgdG8gc3VwcHJlc3MgdHJ1bmNhdGVkIHpvbmUgZGlzcGxheSBvbiBmaXJzdCBsb2FkXG4gICAgICAgICAgICAvLyBVc2UgdGhlIGxhcmdlc3QgdmlzaWJsZSBwZXJpb2QgYnV0dG9uIG9yIDEgaG91ciBhcyBmYWxsYmFja1xuICAgICAgICAgICAgY29uc3QgJGFjdGl2ZUJ1dHRvbiA9ICQoJy5wZXJpb2QtYnRuLmFjdGl2ZTp2aXNpYmxlJyk7XG4gICAgICAgICAgICBjb25zdCBpbml0aWFsUGVyaW9kID0gJGFjdGl2ZUJ1dHRvbi5sZW5ndGggPiAwXG4gICAgICAgICAgICAgICAgPyBwYXJzZUludCgkYWN0aXZlQnV0dG9uLmRhdGEoJ3BlcmlvZCcpLCAxMClcbiAgICAgICAgICAgICAgICA6IE1hdGgubWluKDM2MDAsIGxvZ0R1cmF0aW9uKTtcbiAgICAgICAgICAgIGNvbnN0IGluaXRpYWxTdGFydCA9IE1hdGgubWF4KHRoaXMuY3VycmVudFRpbWVSYW5nZS5lbmQgLSBpbml0aWFsUGVyaW9kLCB0aGlzLmN1cnJlbnRUaW1lUmFuZ2Uuc3RhcnQpO1xuICAgICAgICAgICAgdGhpcy5sb2FkTG9nQnlUaW1lUmFuZ2UoaW5pdGlhbFN0YXJ0LCB0aGlzLmN1cnJlbnRUaW1lUmFuZ2UuZW5kLCB0cnVlLCB0cnVlKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIExpbmUgbnVtYmVyIGZhbGxiYWNrIG1vZGVcbiAgICAgICAgICAgIHRoaXMudGltZVNsaWRlckVuYWJsZWQgPSBmYWxzZTtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFRpbWVSYW5nZSA9IG51bGw7XG5cbiAgICAgICAgICAgIC8vIEhpZGUgcGVyaW9kIGJ1dHRvbnMgaW4gbGluZSBudW1iZXIgbW9kZVxuICAgICAgICAgICAgJCgnI3BlcmlvZC1idXR0b25zJykuaGlkZSgpO1xuXG4gICAgICAgICAgICAvLyBJbml0aWFsaXplIFNWRyB0aW1lbGluZSB3aXRoIGxpbmUgbnVtYmVyc1xuICAgICAgICAgICAgLy8gRm9yIG5vdywgdXNlIGRlZmF1bHQgcmFuZ2UgdW50aWwgd2UgZ2V0IHRvdGFsIGxpbmUgY291bnRcbiAgICAgICAgICAgIGNvbnN0IGxpbmVSYW5nZSA9IHsgc3RhcnQ6IDAsIGVuZDogMTAwMDAgfTtcbiAgICAgICAgICAgIFNWR1RpbWVsaW5lLmluaXRpYWxpemUoJyN0aW1lLXNsaWRlci1jb250YWluZXInLCBsaW5lUmFuZ2UsICdsaW5lcycpO1xuXG4gICAgICAgICAgICAvLyBTZXQgY2FsbGJhY2sgZm9yIGxpbmUgcmFuZ2UgY2hhbmdlc1xuICAgICAgICAgICAgU1ZHVGltZWxpbmUub25SYW5nZUNoYW5nZSA9IChzdGFydCwgZW5kKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gTG9hZCBieSBsaW5lIG51bWJlcnMgKG9mZnNldC9saW5lcylcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2FkTG9nQnlMaW5lcyhNYXRoLmZsb29yKHN0YXJ0KSwgTWF0aC5jZWlsKGVuZCAtIHN0YXJ0KSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBMb2FkIGluaXRpYWwgbGluZXNcbiAgICAgICAgICAgIHRoaXMudXBkYXRlTG9nRnJvbVNlcnZlcigpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgbG9nIGJ5IGxpbmUgbnVtYmVycyAoZm9yIGZpbGVzIHdpdGhvdXQgdGltZXN0YW1wcylcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gb2Zmc2V0IC0gU3RhcnRpbmcgbGluZSBudW1iZXJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbGluZXMgLSBOdW1iZXIgb2YgbGluZXMgdG8gbG9hZFxuICAgICAqL1xuICAgIGxvYWRMb2dCeUxpbmVzKG9mZnNldCwgbGluZXMpIHtcbiAgICAgICAgLy8gU2hvdyBkaW1tZXIgb25seSBpZiBub3QgaW4gYXV0by11cGRhdGUgbW9kZVxuICAgICAgICBpZiAoIXN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwYXJhbXMgPSB7XG4gICAgICAgICAgICBmaWxlbmFtZTogdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZmlsZW5hbWUnKSxcbiAgICAgICAgICAgIGZpbHRlcjogdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZmlsdGVyJykgfHwgJycsXG4gICAgICAgICAgICBsb2dMZXZlbDogdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnbG9nTGV2ZWwnKSB8fCAnJyxcbiAgICAgICAgICAgIG9mZnNldDogTWF0aC5tYXgoMCwgb2Zmc2V0KSxcbiAgICAgICAgICAgIGxpbmVzOiBNYXRoLm1pbig1MDAwLCBNYXRoLm1heCgxMDAsIGxpbmVzKSlcbiAgICAgICAgfTtcblxuICAgICAgICBTeXNsb2dBUEkuZ2V0TG9nRnJvbUZpbGUocGFyYW1zLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIC8vIEhpZGUgZGltbWVyIG9ubHkgaWYgbm90IGluIGF1dG8tdXBkYXRlIG1vZGVcbiAgICAgICAgICAgIGlmICghc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEgJiYgJ2NvbnRlbnQnIGluIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBTZXQgY29udGVudCBpbiBlZGl0b3IgKGV2ZW4gaWYgZW1wdHkpXG4gICAgICAgICAgICAgICAgdGhpcy52aWV3ZXIuc2V0VmFsdWUocmVzcG9uc2UuZGF0YS5jb250ZW50IHx8ICcnLCAtMSk7XG5cbiAgICAgICAgICAgICAgICAvLyBHbyB0byB0aGUgYmVnaW5uaW5nXG4gICAgICAgICAgICAgICAgdGhpcy52aWV3ZXIuZ290b0xpbmUoMSk7XG4gICAgICAgICAgICAgICAgdGhpcy52aWV3ZXIuc2Nyb2xsVG9MaW5lKDAsIHRydWUsIHRydWUsICgpID0+IHt9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgbG9nIGJ5IHRpbWUgcmFuZ2VcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gc3RhcnRUaW1lc3RhbXAgLSBTdGFydCB0aW1lc3RhbXBcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gZW5kVGltZXN0YW1wIC0gRW5kIHRpbWVzdGFtcFxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gbGF0ZXN0IC0gSWYgdHJ1ZSwgcmV0dXJuIG5ld2VzdCBsaW5lcyBmaXJzdCAoZm9yIGluaXRpYWwgbG9hZClcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGlzSW5pdGlhbExvYWQgLSBJZiB0cnVlLCBzdXBwcmVzcyB0cnVuY2F0ZWQgem9uZSBkaXNwbGF5XG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc0F1dG9VcGRhdGUgLSBJZiB0cnVlLCBza2lwIHRpbWVsaW5lIHJlY2FsY3VsYXRpb24gKG9ubHkgdXBkYXRlIGNvbnRlbnQpXG4gICAgICovXG4gICAgbG9hZExvZ0J5VGltZVJhbmdlKHN0YXJ0VGltZXN0YW1wLCBlbmRUaW1lc3RhbXAsIGxhdGVzdCA9IGZhbHNlLCBpc0luaXRpYWxMb2FkID0gZmFsc2UsIGlzQXV0b1VwZGF0ZSA9IGZhbHNlKSB7XG4gICAgICAgIC8vIFNob3cgZGltbWVyIG9ubHkgaWYgbm90IGluIGF1dG8tdXBkYXRlIG1vZGVcbiAgICAgICAgaWYgKCFzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUpIHtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcGFyYW1zID0ge1xuICAgICAgICAgICAgZmlsZW5hbWU6IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2ZpbGVuYW1lJyksXG4gICAgICAgICAgICBmaWx0ZXI6IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2ZpbHRlcicpIHx8ICcnLFxuICAgICAgICAgICAgbG9nTGV2ZWw6IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2xvZ0xldmVsJykgfHwgJycsXG4gICAgICAgICAgICBkYXRlRnJvbTogc3RhcnRUaW1lc3RhbXAsXG4gICAgICAgICAgICBkYXRlVG86IGVuZFRpbWVzdGFtcCxcbiAgICAgICAgICAgIGxpbmVzOiA1MDAwLCAvLyBNYXhpbXVtIGxpbmVzIHRvIGxvYWRcbiAgICAgICAgICAgIGxhdGVzdDogbGF0ZXN0IC8vIElmIHRydWUsIHJldHVybiBuZXdlc3QgbGluZXMgKHRhaWwgfCB0YWMpXG4gICAgICAgIH07XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIFN5c2xvZ0FQSS5nZXRMb2dGcm9tRmlsZShwYXJhbXMsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSAmJiAnY29udGVudCcgaW4gcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdDb250ZW50ID0gcmVzcG9uc2UuZGF0YS5jb250ZW50IHx8ICcnO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0F1dG9VcGRhdGUgJiYgbmV3Q29udGVudC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBBdXRvLXVwZGF0ZSBtb2RlOiBhcHBlbmQgb25seSBuZXcgbGluZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRDb250ZW50ID0gdGhpcy52aWV3ZXIuZ2V0VmFsdWUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld0xpbmVzID0gdGhpcy5maW5kTmV3TGluZXMoY3VycmVudENvbnRlbnQsIG5ld0NvbnRlbnQpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV3TGluZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFwcGVuZCBuZXcgbGluZXMgYXQgdGhlIGVuZFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHNlc3Npb24gPSB0aGlzLnZpZXdlci5zZXNzaW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGxhc3RSb3cgPSBzZXNzaW9uLmdldExlbmd0aCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlc3Npb24uaW5zZXJ0KHsgcm93OiBsYXN0Um93LCBjb2x1bW46IDAgfSwgJ1xcbicgKyBuZXdMaW5lcy5qb2luKCdcXG4nKSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBHbyB0byB0aGUgbGFzdCBsaW5lIHRvIGZvbGxvdyBuZXcgZW50cmllc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbmFsUm93ID0gc2Vzc2lvbi5nZXRMZW5ndGgoKSAtIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmluYWxDb2x1bW4gPSBzZXNzaW9uLmdldExpbmUoZmluYWxSb3cpLmxlbmd0aDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnZpZXdlci5nb3RvTGluZShmaW5hbFJvdyArIDEsIGZpbmFsQ29sdW1uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIE5vcm1hbCBtb2RlOiBzZXQgY29udGVudCBhbmQgZ28gdG8gZW5kXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnZpZXdlci5zZXRWYWx1ZShuZXdDb250ZW50LCAtMSk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdvIHRvIHRoZSBlbmQgb2YgdGhlIGxvZ1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgcm93ID0gdGhpcy52aWV3ZXIuc2Vzc2lvbi5nZXRMZW5ndGgoKSAtIDE7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb2x1bW4gPSB0aGlzLnZpZXdlci5zZXNzaW9uLmdldExpbmUocm93KS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnZpZXdlci5nb3RvTGluZShyb3cgKyAxLCBjb2x1bW4pO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gQWRqdXN0IHNsaWRlciB0byBhY3R1YWwgbG9hZGVkIHRpbWUgcmFuZ2UgKHNpbGVudGx5KVxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5hY3R1YWxfcmFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGFjdHVhbCA9IHJlc3BvbnNlLmRhdGEuYWN0dWFsX3JhbmdlO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBBbHdheXMgdXBkYXRlIGZ1bGxSYW5nZSBib3VuZGFyeSBiYXNlZCBvbiBhY3R1YWwgZGF0YSBmcm9tIHNlcnZlclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBlbnN1cmVzIG5vLWRhdGEgem9uZXMgZGlzcGxheSBjb3JyZWN0bHkgYWZ0ZXIgcmVmcmVzaFxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdHVhbC5lbmQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBTVkdUaW1lbGluZS51cGRhdGVEYXRhQm91bmRhcnkoYWN0dWFsLmVuZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVHJhY2sgbGFzdCBrbm93biBkYXRhIGVuZCBmb3IgcmVmcmVzaCBhbmNob3JpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sYXN0S25vd25EYXRhRW5kID0gYWN0dWFsLmVuZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQWx3YXlzIHVwZGF0ZSB0aW1lbGluZSB3aXRoIHNlcnZlciByZXNwb25zZSAoZXhjZXB0IGR1cmluZyBhdXRvLXVwZGF0ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIHVwZGF0ZUZyb21TZXJ2ZXJSZXNwb25zZSgpIGhhbmRsZXM6XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAtIFVwZGF0aW5nIHNlbGVjdGVkUmFuZ2UgdG8gYWN0dWFsIGRhdGEgYm91bmRhcmllc1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gLSBQcmVzZXJ2aW5nIHZpc2libGVSYW5nZS5lbmQgaWYgaXQgd2FzIGV4dGVuZGVkIHRvIGN1cnJlbnQgdGltZSAoZm9yIG5vLWRhdGEgem9uZXMpXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAtIE1hbmFnaW5nIHRydW5jYXRpb24gem9uZXMgZGlzcGxheVxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFpc0F1dG9VcGRhdGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBTVkdUaW1lbGluZS51cGRhdGVGcm9tU2VydmVyUmVzcG9uc2UoYWN0dWFsLCBzdGFydFRpbWVzdGFtcCwgZW5kVGltZXN0YW1wLCBpc0luaXRpYWxMb2FkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEhpZGUgZGltbWVyIG9ubHkgaWYgbm90IGluIGF1dG8tdXBkYXRlIG1vZGVcbiAgICAgICAgICAgICAgICBpZiAoIXN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGxvYWRpbmcgbG9nIGJ5IHRpbWUgcmFuZ2U6JywgZXJyb3IpO1xuICAgICAgICAgICAgLy8gSGlkZSBkaW1tZXIgb25seSBpZiBub3QgaW4gYXV0by11cGRhdGUgbW9kZVxuICAgICAgICAgICAgaWYgKCFzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBcHBseSBxdWljayBwZXJpb2Qgc2VsZWN0aW9uIChZYW5kZXggQ2xvdWQgTG9nVmlld2VyIHN0eWxlKVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBwZXJpb2RTZWNvbmRzIC0gUGVyaW9kIGluIHNlY29uZHNcbiAgICAgKi9cbiAgICBhcHBseVF1aWNrUGVyaW9kKHBlcmlvZFNlY29uZHMpIHtcbiAgICAgICAgaWYgKCF0aGlzLmN1cnJlbnRUaW1lUmFuZ2UpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVzZSBuZXcgYXBwbHlQZXJpb2QgbWV0aG9kIHRoYXQgaGFuZGxlcyB2aXNpYmxlIHJhbmdlIGFuZCBhdXRvLWNlbnRlcmluZ1xuICAgICAgICBTVkdUaW1lbGluZS5hcHBseVBlcmlvZChwZXJpb2RTZWNvbmRzKTtcbiAgICAgICAgLy8gQ2FsbGJhY2sgd2lsbCBiZSB0cmlnZ2VyZWQgYXV0b21hdGljYWxseSBieSBTVkdUaW1lbGluZVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBcHBseSBsb2cgbGV2ZWwgZmlsdGVyXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGxldmVsIC0gTG9nIGxldmVsIChhbGwsIGVycm9yLCB3YXJuaW5nLCBpbmZvLCBkZWJ1ZylcbiAgICAgKi9cbiAgICBhcHBseUxvZ0xldmVsRmlsdGVyKGxldmVsKSB7XG4gICAgICAgIGxldCBmaWx0ZXJQYXR0ZXJuID0gJyc7XG5cbiAgICAgICAgLy8gQ3JlYXRlIHJlZ2V4IHBhdHRlcm4gYmFzZWQgb24gbGV2ZWxcbiAgICAgICAgc3dpdGNoIChsZXZlbCkge1xuICAgICAgICAgICAgY2FzZSAnZXJyb3InOlxuICAgICAgICAgICAgICAgIGZpbHRlclBhdHRlcm4gPSAnRVJST1J8Q1JJVElDQUx8RkFUQUwnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnd2FybmluZyc6XG4gICAgICAgICAgICAgICAgZmlsdGVyUGF0dGVybiA9ICdXQVJOSU5HfFdBUk4nO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnaW5mbyc6XG4gICAgICAgICAgICAgICAgZmlsdGVyUGF0dGVybiA9ICdJTkZPJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2RlYnVnJzpcbiAgICAgICAgICAgICAgICBmaWx0ZXJQYXR0ZXJuID0gJ0RFQlVHJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2FsbCc6XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGZpbHRlclBhdHRlcm4gPSAnJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBmaWx0ZXIgZmllbGRcbiAgICAgICAgdGhpcy4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnZmlsdGVyJywgZmlsdGVyUGF0dGVybik7XG5cbiAgICAgICAgLy8gUmVsb2FkIGxvZ3Mgd2l0aCBuZXcgZmlsdGVyXG4gICAgICAgIHRoaXMudXBkYXRlTG9nRnJvbVNlcnZlcigpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGZXRjaGVzIHRoZSBsb2cgZmlsZSBjb250ZW50IGZyb20gdGhlIHNlcnZlci5cbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IHByZXNlcnZlUmFuZ2UgLSBJZiB0cnVlLCB1c2UgY3VycmVudCBTVkcgdGltZWxpbmUgc2VsZWN0aW9uIGluc3RlYWQgb2ZcbiAgICAgKiAgIHJlY2FsY3VsYXRpbmcgdG8gXCJsYXN0IDEgaG91clwiLiBVc2VkIHdoZW4gZmlsdGVyL2xldmVsIGNoYW5nZXMgdG8ga2VlcCB0aGUgc2FtZSB2aWV3LlxuICAgICAqL1xuICAgIHVwZGF0ZUxvZ0Zyb21TZXJ2ZXIocHJlc2VydmVSYW5nZSA9IGZhbHNlKSB7XG4gICAgICAgIGlmICh0aGlzLnRpbWVTbGlkZXJFbmFibGVkKSB7XG4gICAgICAgICAgICAvLyBJbiB0aW1lIHNsaWRlciBtb2RlLCByZWxvYWQgY3VycmVudCB3aW5kb3dcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRUaW1lUmFuZ2UpIHtcblxuICAgICAgICAgICAgICAgIC8vIFdoZW4gcHJlc2VydmVSYW5nZSBpcyB0cnVlIChmaWx0ZXIvbGV2ZWwgY2hhbmdlKSwgdXNlIGN1cnJlbnQgdGltZWxpbmUgc2VsZWN0aW9uXG4gICAgICAgICAgICAgICAgLy8gV0hZOiBDaGFuZ2luZyBmaWx0ZXJzIHNob3VsZCBub3QgcmVzZXQgdGhlIHRpbWUgd2luZG93IOKAlCB1c2VyIGV4cGVjdHMgdG8gc2VlXG4gICAgICAgICAgICAgICAgLy8gdGhlIHNhbWUgcGVyaW9kIHdpdGggZGlmZmVyZW50IGZpbHRlcmluZyBhcHBsaWVkXG4gICAgICAgICAgICAgICAgaWYgKHByZXNlcnZlUmFuZ2UgJiYgU1ZHVGltZWxpbmUuc2VsZWN0ZWRSYW5nZSkge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvYWRMb2dCeVRpbWVSYW5nZShcbiAgICAgICAgICAgICAgICAgICAgICAgIFNWR1RpbWVsaW5lLnNlbGVjdGVkUmFuZ2Uuc3RhcnQsXG4gICAgICAgICAgICAgICAgICAgICAgICBTVkdUaW1lbGluZS5zZWxlY3RlZFJhbmdlLmVuZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHRydWUsIGZhbHNlLCB0aGlzLmlzQXV0b1VwZGF0ZUFjdGl2ZVxuICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY29uc3Qgb25lSG91ciA9IDM2MDA7XG5cbiAgICAgICAgICAgICAgICAvLyBHZXQgY3VycmVudCBmaWxlbmFtZSB0byBjaGVjayBpZiBpdCdzIGEgcm90YXRlZCBsb2cgZmlsZVxuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVuYW1lID0gdGhpcy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZmlsZW5hbWUnKTtcbiAgICAgICAgICAgICAgICBjb25zdCBpc1JvdGF0ZWQgPSB0aGlzLmlzUm90YXRlZExvZ0ZpbGUoZmlsZW5hbWUpO1xuXG4gICAgICAgICAgICAgICAgbGV0IGVuZFRpbWVzdGFtcDtcbiAgICAgICAgICAgICAgICBsZXQgc3RhcnRUaW1lc3RhbXA7XG5cbiAgICAgICAgICAgICAgICBpZiAoaXNSb3RhdGVkKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZvciByb3RhdGVkIGZpbGVzOiB1c2UgdGhlIGZpbGUncyBhY3R1YWwgdGltZSByYW5nZVxuICAgICAgICAgICAgICAgICAgICAvLyBSb3RhdGVkIGZpbGVzIGRvbid0IHJlY2VpdmUgbmV3IGRhdGEsIHNvIGN1cnJlbnRUaW1lUmFuZ2UgaXMgZml4ZWRcbiAgICAgICAgICAgICAgICAgICAgZW5kVGltZXN0YW1wID0gdGhpcy5jdXJyZW50VGltZVJhbmdlLmVuZDtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnRUaW1lc3RhbXAgPSBNYXRoLm1heCh0aGlzLmN1cnJlbnRUaW1lUmFuZ2UuZW5kIC0gb25lSG91ciwgdGhpcy5jdXJyZW50VGltZVJhbmdlLnN0YXJ0KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBGb3IgYWN0aXZlIGxvZyBmaWxlczogdXNlIGN1cnJlbnQgdGltZSB0byBjYXB0dXJlIG5ldyBlbnRyaWVzXG4gICAgICAgICAgICAgICAgICAgIGVuZFRpbWVzdGFtcCA9IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFdIWTogQW5jaG9yIHN0YXJ0VGltZXN0YW1wIHRvIHRoZSBsYXN0IGtub3duIGRhdGEgZW5kLCBub3Qgd2FsbCBjbG9jayB0aW1lLlxuICAgICAgICAgICAgICAgICAgICAvLyBVc2luZyBcIm5vdyAtIHBlcmlvZFwiIHByb2R1Y2VzIGFuIGVtcHR5IHJhbmdlIHdoZW4gdGhlIGZpbGUgaGFzbid0IGJlZW5cbiAgICAgICAgICAgICAgICAgICAgLy8gd3JpdHRlbiB0byByZWNlbnRseSAoZS5nLiwgaWRsZSBtb2R1bGUgbG9ncyBsaWtlIE1vZHVsZUF1dG9DUk0vU2Fsb25TeW5jZXIubG9nKS5cbiAgICAgICAgICAgICAgICAgICAgLy8gbGFzdEtub3duRGF0YUVuZCBob2xkcyB0aGUgYWN0dWFsIHRpbWVzdGFtcCBvZiB0aGUgbGFzdCBsaW5lIGZyb20gdGhlIEFQSSByZXNwb25zZS5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZGF0YUVuZCA9IHRoaXMubGFzdEtub3duRGF0YUVuZCB8fCB0aGlzLmN1cnJlbnRUaW1lUmFuZ2UuZW5kO1xuICAgICAgICAgICAgICAgICAgICBzdGFydFRpbWVzdGFtcCA9IE1hdGgubWF4KGRhdGFFbmQgLSBvbmVIb3VyLCB0aGlzLmN1cnJlbnRUaW1lUmFuZ2Uuc3RhcnQpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBjdXJyZW50VGltZVJhbmdlLmVuZCB0byByZWZsZWN0IG5ldyBkYXRhIGF2YWlsYWJpbGl0eVxuICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRUaW1lUmFuZ2UuZW5kID0gZW5kVGltZXN0YW1wO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEZPUkNFIHVwZGF0ZSB0aGUgU1ZHIHRpbWVsaW5lIHZpc2libGUgcmFuZ2UgdG8gY3VycmVudCB0aW1lXG4gICAgICAgICAgICAgICAgICAgIC8vIGZvcmNlPXRydWUgZW5zdXJlcyB2aXNpYmxlUmFuZ2UuZW5kIGlzIHNldCBldmVuIGlmIGl0IHdhcyBhbHJlYWR5ID49IGVuZFRpbWVzdGFtcFxuICAgICAgICAgICAgICAgICAgICAvLyBUaGlzIGhhbmRsZXMgdGltZXpvbmUgZGlmZmVyZW5jZXMgd2hlcmUgc2VydmVyIHRpbWUgbWlnaHQgYXBwZWFyIFwiaW4gdGhlIGZ1dHVyZVwiXG4gICAgICAgICAgICAgICAgICAgIFNWR1RpbWVsaW5lLmV4dGVuZFJhbmdlKGVuZFRpbWVzdGFtcCwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gVXNlIGxhdGVzdD10cnVlIHRvIHNob3cgbmV3ZXN0IGVudHJpZXMgKGZvciBzaG93LWxhc3QtbG9nIC8gYXV0by11cGRhdGUgYnV0dG9ucylcbiAgICAgICAgICAgICAgICAvLyBQYXNzIGlzQXV0b1VwZGF0ZT10cnVlIHdoZW4gYXV0by1yZWZyZXNoIGlzIGFjdGl2ZSB0byBwcmV2ZW50IHRpbWVsaW5lIGZsaWNrZXJpbmdcbiAgICAgICAgICAgICAgICB0aGlzLmxvYWRMb2dCeVRpbWVSYW5nZShzdGFydFRpbWVzdGFtcCwgZW5kVGltZXN0YW1wLCB0cnVlLCBmYWxzZSwgdGhpcy5pc0F1dG9VcGRhdGVBY3RpdmUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTGluZSBudW1iZXIgbW9kZVxuICAgICAgICAgICAgY29uc3QgcGFyYW1zID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICAgICAgcGFyYW1zLmxpbmVzID0gNTAwMDsgLy8gTWF4IGxpbmVzXG4gICAgICAgICAgICBTeXNsb2dBUEkuZ2V0TG9nRnJvbUZpbGUocGFyYW1zLCBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jYlVwZGF0ZUxvZ1RleHQpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZpbmQgbmV3IGxpbmVzIHRoYXQgYXJlIG5vdCBpbiBjdXJyZW50IGNvbnRlbnRcbiAgICAgKiBDb21wYXJlcyBsYXN0IGxpbmVzIG9mIGN1cnJlbnQgY29udGVudCB3aXRoIG5ldyBjb250ZW50IHRvIGZpbmQgb3ZlcmxhcFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjdXJyZW50Q29udGVudCAtIEN1cnJlbnQgZWRpdG9yIGNvbnRlbnRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbmV3Q29udGVudCAtIE5ldyBjb250ZW50IGZyb20gc2VydmVyXG4gICAgICogQHJldHVybnMge0FycmF5fSBBcnJheSBvZiBuZXcgbGluZXMgdG8gYXBwZW5kXG4gICAgICovXG4gICAgZmluZE5ld0xpbmVzKGN1cnJlbnRDb250ZW50LCBuZXdDb250ZW50KSB7XG4gICAgICAgIGlmICghY3VycmVudENvbnRlbnQgfHwgY3VycmVudENvbnRlbnQudHJpbSgpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgLy8gSWYgZWRpdG9yIGlzIGVtcHR5LCBhbGwgbGluZXMgYXJlIG5ld1xuICAgICAgICAgICAgcmV0dXJuIG5ld0NvbnRlbnQuc3BsaXQoJ1xcbicpLmZpbHRlcihsaW5lID0+IGxpbmUudHJpbSgpLmxlbmd0aCA+IDApO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY3VycmVudExpbmVzID0gY3VycmVudENvbnRlbnQuc3BsaXQoJ1xcbicpO1xuICAgICAgICBjb25zdCBuZXdMaW5lcyA9IG5ld0NvbnRlbnQuc3BsaXQoJ1xcbicpO1xuXG4gICAgICAgIC8vIEdldCBsYXN0IG5vbi1lbXB0eSBsaW5lIGZyb20gY3VycmVudCBjb250ZW50IGFzIGFuY2hvclxuICAgICAgICBsZXQgYW5jaG9yTGluZSA9ICcnO1xuICAgICAgICBmb3IgKGxldCBpID0gY3VycmVudExpbmVzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgICBpZiAoY3VycmVudExpbmVzW2ldLnRyaW0oKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgYW5jaG9yTGluZSA9IGN1cnJlbnRMaW5lc1tpXTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGlmICghYW5jaG9yTGluZSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ld0xpbmVzLmZpbHRlcihsaW5lID0+IGxpbmUudHJpbSgpLmxlbmd0aCA+IDApO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRmluZCBhbmNob3IgbGluZSBpbiBuZXcgY29udGVudFxuICAgICAgICBsZXQgYW5jaG9ySW5kZXggPSAtMTtcbiAgICAgICAgZm9yIChsZXQgaSA9IG5ld0xpbmVzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgICBpZiAobmV3TGluZXNbaV0gPT09IGFuY2hvckxpbmUpIHtcbiAgICAgICAgICAgICAgICBhbmNob3JJbmRleCA9IGk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoYW5jaG9ySW5kZXggPT09IC0xKSB7XG4gICAgICAgICAgICAvLyBBbmNob3Igbm90IGZvdW5kIC0gY29udGVudCBjaGFuZ2VkIHNpZ25pZmljYW50bHksIHJldHVybiBlbXB0eVxuICAgICAgICAgICAgLy8gVGhpcyBwcmV2ZW50cyBkdXBsaWNhdGVzIHdoZW4gbG9nIHJvdGF0ZXMgb3IgZmlsdGVyIGNoYW5nZXNcbiAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJldHVybiBsaW5lcyBhZnRlciBhbmNob3JcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gbmV3TGluZXMuc2xpY2UoYW5jaG9ySW5kZXggKyAxKS5maWx0ZXIobGluZSA9PiBsaW5lLnRyaW0oKS5sZW5ndGggPiAwKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlcyB0aGUgbG9nIHZpZXcuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gQVBJLlxuICAgICAqL1xuICAgIGNiVXBkYXRlTG9nVGV4dChyZXNwb25zZSkge1xuICAgICAgICAvLyBIaWRlIGRpbW1lciBvbmx5IGlmIG5vdCBpbiBhdXRvLXVwZGF0ZSBtb2RlXG4gICAgICAgIGlmICghc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlKSB7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEhhbmRsZSB2MyBBUEkgcmVzcG9uc2Ugc3RydWN0dXJlXG4gICAgICAgIGlmICghcmVzcG9uc2UgfHwgIXJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLm1lc3NhZ2VzKSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGNvbnRlbnQgPSByZXNwb25zZS5kYXRhPy5jb250ZW50IHx8ICcnO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIuZ2V0U2Vzc2lvbigpLnNldFZhbHVlKGNvbnRlbnQpO1xuICAgICAgICBjb25zdCByb3cgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIuc2Vzc2lvbi5nZXRMZW5ndGgoKSAtIDE7XG4gICAgICAgIGNvbnN0IGNvbHVtbiA9IHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlci5zZXNzaW9uLmdldExpbmUocm93KS5sZW5ndGg7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlci5nb3RvTGluZShyb3cgKyAxLCBjb2x1bW4pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBjbGlja2luZyB0aGUgXCJEb3dubG9hZCBGaWxlXCIgYnV0dG9uLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBkYXRhLlxuICAgICAqL1xuICAgIGNiRG93bmxvYWRGaWxlKHJlc3BvbnNlKSB7XG4gICAgICAgIC8vIEhhbmRsZSB2MyBBUEkgcmVzcG9uc2Ugc3RydWN0dXJlXG4gICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gcmVzcG9uc2UuZGF0YS5maWxlbmFtZSB8fCByZXNwb25zZS5kYXRhO1xuICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLm1lc3NhZ2VzKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGNsaWNraW5nIHRoZSBcIkVyYXNlIEZpbGVcIiBidXR0b24uXG4gICAgICovXG4gICAgZXJhc2VDdXJyZW50RmlsZUNvbnRlbnQoKXtcbiAgICAgICAgY29uc3QgZmlsZU5hbWUgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZmlsZW5hbWUnKTtcbiAgICAgICAgaWYgKGZpbGVOYW1lLmxlbmd0aD4wKXtcbiAgICAgICAgICAgIFN5c2xvZ0FQSS5lcmFzZUZpbGUoZmlsZU5hbWUsIHN5c3RlbURpYWdub3N0aWNMb2dzLmNiQWZ0ZXJGaWxlRXJhc2VkKVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGNsaWNraW5nIHRoZSBcIkVyYXNlIEZpbGVcIiBidXR0b24gYW5kIGNhbGxpbmcgUkVTVCBBUEkgY29tbWFuZFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBkYXRhLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJGaWxlRXJhc2VkKHJlc3BvbnNlKXtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdD09PWZhbHNlICYmIHJlc3BvbnNlLm1lc3NhZ2VzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy51cGRhdGVMb2dGcm9tU2VydmVyKCk7XG4gICAgICAgIH1cbiAgICB9LFxufTtcblxuLy8gV2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHksIGluaXRpYWxpemUgdGhlIHNob3cgc3lzdGVtIGxvZ3MgdGFiXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaW5pdGlhbGl6ZSgpO1xufSk7Il19