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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TeXN0ZW1EaWFnbm9zdGljL3N5c3RlbS1kaWFnbm9zdGljLWluZGV4LXNob3dsb2dzLmpzIl0sIm5hbWVzIjpbInN5c3RlbURpYWdub3N0aWNMb2dzIiwiJHNob3dCdG4iLCIkIiwiJGRvd25sb2FkQnRuIiwiJHNob3dBdXRvQnRuIiwiJGVyYXNlQnRuIiwiJGxvZ0NvbnRlbnQiLCJ2aWV3ZXIiLCIkZmlsZVNlbGVjdERyb3BEb3duIiwibG9nc0l0ZW1zIiwiJGRpbW1lciIsIiRmb3JtT2JqIiwiaXNJbml0aWFsaXppbmciLCJ0aW1lU2xpZGVyRW5hYmxlZCIsImN1cnJlbnRUaW1lUmFuZ2UiLCJpc0F1dG9VcGRhdGVBY3RpdmUiLCJmaWx0ZXJDb25kaXRpb25zIiwicGVuZGluZ0ZpbHRlclRleHQiLCJsYXN0S25vd25EYXRhRW5kIiwiaW5pdGlhbGl6ZSIsImFkZENsYXNzIiwiaGlkZSIsImNzcyIsInRvcCIsImxlZnQiLCJhY2VIZWlnaHQiLCJ3aW5kb3ciLCJpbm5lckhlaWdodCIsImNsb3Nlc3QiLCJjcmVhdGVEcm9wZG93bkZyb21IaWRkZW5JbnB1dCIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJjYk9uQ2hhbmdlRmlsZSIsImlnbm9yZUNhc2UiLCJmdWxsVGV4dFNlYXJjaCIsImZvcmNlU2VsZWN0aW9uIiwicHJlc2VydmVIVE1MIiwiYWxsb3dDYXRlZ29yeVNlbGVjdGlvbiIsIm1hdGNoIiwiZmlsdGVyUmVtb3RlRGF0YSIsImFjdGlvbiIsInRlbXBsYXRlcyIsIm1lbnUiLCJjdXN0b21Ecm9wZG93bk1lbnUiLCJpbml0aWFsaXplRm9sZGVySGFuZGxlcnMiLCJpbml0aWFsaXplQWNlIiwiU3lzbG9nQVBJIiwiZ2V0TG9nc0xpc3QiLCJjYkZvcm1hdERyb3Bkb3duUmVzdWx0cyIsImluaXRpYWxpemVMb2dMZXZlbERyb3Bkb3duIiwiaW5pdGlhbGl6ZUZpbHRlckZyb21VcmwiLCJkb2N1bWVudCIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwiJGJ0biIsImN1cnJlbnRUYXJnZXQiLCJwZXJpb2QiLCJkYXRhIiwicmVtb3ZlQ2xhc3MiLCJhcHBseVF1aWNrUGVyaW9kIiwiZW5kIiwib25lSG91ciIsInN0YXJ0IiwiTWF0aCIsIm1heCIsIlNWR1RpbWVsaW5lIiwic2V0UmFuZ2UiLCJsb2FkTG9nQnlUaW1lUmFuZ2UiLCJsZXZlbCIsImFwcGx5TG9nTGV2ZWxGaWx0ZXIiLCJ1cGRhdGVMb2dGcm9tU2VydmVyIiwiaGFuZGxlSGFzaENoYW5nZSIsImZvcm0iLCJkb3dubG9hZExvZ0ZpbGUiLCJmaWxlbmFtZSIsImNiRG93bmxvYWRGaWxlIiwiJGJ1dHRvbiIsIiRyZWxvYWRJY29uIiwiZmluZCIsImhhc0NsYXNzIiwidXBkYXRlTG9nVmlld1dvcmtlciIsInN0b3AiLCJlcmFzZUN1cnJlbnRGaWxlQ29udGVudCIsImV2ZW50IiwiJHBvcHVwIiwiaXNQb3B1cFZpc2libGUiLCJpcyIsImtleSIsIm5hdmlnYXRlRmlsdGVyUG9wdXAiLCIkZm9jdXNlZCIsImxlbmd0aCIsInRyaWdnZXIiLCJ0ZXh0IiwidmFsIiwidHJpbSIsInNob3dGaWx0ZXJUeXBlUG9wdXAiLCJoaWRlRmlsdGVyVHlwZVBvcHVwIiwicmVtb3ZlRmlsdGVyQ29uZGl0aW9uIiwic2V0VGltZW91dCIsImFkZEZpbHRlckNvbmRpdGlvbiIsInR5cGUiLCJzdG9wUHJvcGFnYXRpb24iLCJpbmRleCIsImNsZWFyQWxsRmlsdGVyQ29uZGl0aW9ucyIsInRhcmdldCIsImZvY3VzIiwidG9nZ2xlRnVsbFNjcmVlbiIsImFkZEV2ZW50TGlzdGVuZXIiLCJhZGp1c3RMb2dIZWlnaHQiLCJsb2dDb250YWluZXIiLCJnZXRFbGVtZW50QnlJZCIsImZ1bGxzY3JlZW5FbGVtZW50IiwicmVxdWVzdEZ1bGxzY3JlZW4iLCJlcnIiLCJjb25zb2xlIiwiZXJyb3IiLCJtZXNzYWdlIiwiZXhpdEZ1bGxzY3JlZW4iLCJvZmZzZXQiLCJyZXNpemUiLCIkaGlkZGVuSW5wdXQiLCIkZHJvcGRvd24iLCJpZCIsIiR0ZXh0IiwiZ2xvYmFsVHJhbnNsYXRlIiwic2RfQWxsTGV2ZWxzIiwiJGljb24iLCIkbWVudSIsIml0ZW1zIiwidmFsdWUiLCJpY29uIiwic2RfRXJyb3IiLCJzZF9XYXJuaW5nIiwic2RfTm90aWNlIiwic2RfSW5mbyIsInNkX0RlYnVnIiwiZm9yRWFjaCIsIml0ZW0iLCIkaXRlbSIsImh0bWwiLCJhcHBlbmQiLCJhZnRlciIsInRhYmluZGV4IiwiYmVmb3JlIiwiYWNlIiwiZWRpdCIsImp1bGlhIiwicmVxdWlyZSIsInVuZGVmaW5lZCIsIkluaU1vZGUiLCJNb2RlIiwic2Vzc2lvbiIsInNldE1vZGUiLCJzZXRUaGVtZSIsInJlbmRlcmVyIiwic2V0U2hvd0d1dHRlciIsInNldE9wdGlvbnMiLCJzaG93TGluZU51bWJlcnMiLCJzaG93UHJpbnRNYXJnaW4iLCJyZWFkT25seSIsImJ1aWxkVHJlZVN0cnVjdHVyZSIsImZpbGVzIiwiZGVmYXVsdFBhdGgiLCJ0cmVlIiwiT2JqZWN0IiwiZW50cmllcyIsImZpbGVEYXRhIiwiZmlsZVBhdGgiLCJwYXRoIiwicGFydHMiLCJzcGxpdCIsImN1cnJlbnQiLCJwYXJ0Iiwic2l6ZSIsImNoaWxkcmVuIiwidHJlZVRvRHJvcGRvd25JdGVtcyIsInByZWZpeCIsInBhcmVudEZvbGRlciIsInNvcnQiLCJhS2V5IiwiYVZhbCIsImJLZXkiLCJiVmFsIiwibG9jYWxlQ29tcGFyZSIsInB1c2giLCJuYW1lIiwiZGlzYWJsZWQiLCJmb2xkZXJOYW1lIiwiY2hpbGRJdGVtcyIsInNlbGVjdGVkIiwicmVzcG9uc2UiLCJmaWVsZHMiLCJ2YWx1ZXMiLCJlYWNoIiwib3B0aW9uIiwicGFyZW50QXR0ciIsIm1heWJlRGlzYWJsZWQiLCJmb2xkZXJIZWFkZXIiLCJzdG9wSW1tZWRpYXRlUHJvcGFnYXRpb24iLCIkZm9sZGVyIiwiJHRvZ2dsZSIsIiRmaWxlcyIsImlzQ29sbGFwc2VkIiwic2hvdyIsInNlYXJjaFZhbHVlIiwiXyIsImZvbGRlciIsImV4cGFuZEZvbGRlckZvckZpbGUiLCIkZmlsZUl0ZW0iLCJoYXNoIiwibG9jYXRpb24iLCJzdGFydHNXaXRoIiwiZGVjb2RlVVJJQ29tcG9uZW50Iiwic3Vic3RyaW5nIiwiZmlsZUV4aXN0cyIsInNvbWUiLCJnZXRGaWxlRnJvbUhhc2giLCJyZXN1bHQiLCJkZWZWYWwiLCJmaWxlTmFtZSIsImRyb3Bkb3duVmFsdWVzIiwibWFwIiwicmVwbGFjZSIsInNlbGVjdGVkSXRlbSIsIml0ZW1Ub1NlbGVjdCIsImVuY29kZVVSSUNvbXBvbmVudCIsInJlc2V0RmlsdGVycyIsInVwZGF0ZUF1dG9SZWZyZXNoVmlzaWJpbGl0eSIsImNoZWNrVGltZVJhbmdlQXZhaWxhYmlsaXR5IiwiaXNSb3RhdGVkTG9nRmlsZSIsInRlc3QiLCIkYXV0b0J0biIsImlzUm90YXRlZCIsImRpc3BsYXkiLCJmaXJzdCIsImRpcmVjdGlvbiIsIiRvcHRpb25zIiwiZmlsdGVyIiwiZXEiLCJzeW5jRmlsdGVyQ29uZGl0aW9uc1RvRm9ybSIsInJlbmRlckZpbHRlckxhYmVscyIsInNwbGljZSIsIkpTT04iLCJzdHJpbmdpZnkiLCIkY29udGFpbmVyIiwiZW1wdHkiLCJjb25kaXRpb24iLCJjc3NDbGFzcyIsImljb25DbGFzcyIsImljb25Db2xvciIsIiRsYWJlbCIsInVybFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsInNlYXJjaCIsImZpbHRlclBhcmFtIiwiZ2V0IiwidHJpbW1lZCIsInBhcnNlZCIsInBhcnNlIiwiQXJyYXkiLCJpc0FycmF5IiwiYyIsInAiLCJ1cGRhdGVQZXJpb2RCdXR0b25zVmlzaWJpbGl0eSIsImxvZ0R1cmF0aW9uIiwiJHBlcmlvZEJ1dHRvbnMiLCIkcGVyaW9kQ29udGFpbmVyIiwibGFyZ2VzdFZpc2libGVQZXJpb2QiLCIkbGFyZ2VzdFZpc2libGVCdXR0b24iLCJ2aXNpYmxlQ291bnQiLCJidXR0b24iLCJwYXJzZUludCIsIiR0aW1lQ29udHJvbHNJbmxpbmUiLCJnZXRMb2dUaW1lUmFuZ2UiLCJ0aW1lX3JhbmdlIiwiaW5pdGlhbGl6ZU5hdmlnYXRpb24iLCJ0aW1lUmFuZ2VEYXRhIiwiaGFzVmFsaWRUaW1lUmFuZ2UiLCJoYXNNdWx0aXBsZVRpbWVzdGFtcHMiLCJzZXJ2ZXJfdGltZXpvbmVfb2Zmc2V0Iiwic2VydmVyVGltZXpvbmVPZmZzZXQiLCJvblJhbmdlQ2hhbmdlIiwiZHJhZ2dlZEhhbmRsZSIsIm9uVHJ1bmNhdGVkWm9uZUNsaWNrIiwiaXNMZWZ0Wm9uZSIsIiRhY3RpdmVCdXR0b24iLCJpbml0aWFsUGVyaW9kIiwibWluIiwiaW5pdGlhbFN0YXJ0IiwibGluZVJhbmdlIiwibG9hZExvZ0J5TGluZXMiLCJmbG9vciIsImNlaWwiLCJsaW5lcyIsInBhcmFtcyIsImxvZ0xldmVsIiwiZ2V0TG9nRnJvbUZpbGUiLCJzZXRWYWx1ZSIsImNvbnRlbnQiLCJnb3RvTGluZSIsInNjcm9sbFRvTGluZSIsInN0YXJ0VGltZXN0YW1wIiwiZW5kVGltZXN0YW1wIiwibGF0ZXN0IiwiaXNJbml0aWFsTG9hZCIsImlzQXV0b1VwZGF0ZSIsImRhdGVGcm9tIiwiZGF0ZVRvIiwibmV3Q29udGVudCIsImN1cnJlbnRDb250ZW50IiwiZ2V0VmFsdWUiLCJuZXdMaW5lcyIsImZpbmROZXdMaW5lcyIsImxhc3RSb3ciLCJnZXRMZW5ndGgiLCJpbnNlcnQiLCJyb3ciLCJjb2x1bW4iLCJqb2luIiwiZmluYWxSb3ciLCJmaW5hbENvbHVtbiIsImdldExpbmUiLCJhY3R1YWxfcmFuZ2UiLCJhY3R1YWwiLCJ1cGRhdGVEYXRhQm91bmRhcnkiLCJ1cGRhdGVGcm9tU2VydmVyUmVzcG9uc2UiLCJwZXJpb2RTZWNvbmRzIiwiYXBwbHlQZXJpb2QiLCJmaWx0ZXJQYXR0ZXJuIiwicHJlc2VydmVSYW5nZSIsInNlbGVjdGVkUmFuZ2UiLCJEYXRlIiwibm93IiwiZGF0YUVuZCIsImV4dGVuZFJhbmdlIiwiY2JVcGRhdGVMb2dUZXh0IiwibGluZSIsImN1cnJlbnRMaW5lcyIsImFuY2hvckxpbmUiLCJpIiwiYW5jaG9ySW5kZXgiLCJzbGljZSIsIm1lc3NhZ2VzIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJnZXRTZXNzaW9uIiwiZXJhc2VGaWxlIiwiY2JBZnRlckZpbGVFcmFzZWQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLG9CQUFvQixHQUFHO0FBQ3pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLGdCQUFELENBTGM7O0FBT3pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBQVksRUFBRUQsQ0FBQyxDQUFDLGdCQUFELENBWFU7O0FBYXpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLFlBQVksRUFBRUYsQ0FBQyxDQUFDLHFCQUFELENBakJVOztBQW1CekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUcsRUFBQUEsU0FBUyxFQUFFSCxDQUFDLENBQUMsYUFBRCxDQXZCYTs7QUF5QnpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lJLEVBQUFBLFdBQVcsRUFBRUosQ0FBQyxDQUFDLHVCQUFELENBN0JXOztBQStCekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUssRUFBQUEsTUFBTSxFQUFFLEVBbkNpQjs7QUFxQ3pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLG1CQUFtQixFQUFFLElBekNJOztBQTJDekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFLEVBL0NjOztBQWlEekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsT0FBTyxFQUFFUixDQUFDLENBQUMsa0JBQUQsQ0FyRGU7O0FBdUR6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJUyxFQUFBQSxRQUFRLEVBQUVULENBQUMsQ0FBQyx5QkFBRCxDQTNE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QUFBQSxXQUFXLENBQUNDLGVBQVosQ0FBNEIxSixRQUFRLENBQUN3SixRQUFyQztBQUNILEtBRkQsTUFFTztBQUNIdlYsTUFBQUEsb0JBQW9CLENBQUN1RSxtQkFBckI7QUFDSDtBQUNKO0FBemlEd0IsQ0FBN0IsQyxDQTRpREE7O0FBQ0FyRSxDQUFDLENBQUNpRCxRQUFELENBQUQsQ0FBWTBTLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjdWLEVBQUFBLG9CQUFvQixDQUFDbUIsVUFBckI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cbi8qIGdsb2JhbCBhY2UsIFBieEFwaSwgU3lzbG9nQVBJLCB1cGRhdGVMb2dWaWV3V29ya2VyLCBBY2UsIFVzZXJNZXNzYWdlLCBTVkdUaW1lbGluZSAqL1xuXG4vKipcbiAqIFJlcHJlc2VudHMgdGhlIHN5c3RlbSBkaWFnbm9zdGljIGxvZ3Mgb2JqZWN0LlxuICpcbiAqIEBtb2R1bGUgc3lzdGVtRGlhZ25vc3RpY0xvZ3NcbiAqL1xuY29uc3Qgc3lzdGVtRGlhZ25vc3RpY0xvZ3MgPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIFwiU2hvdyBMYXN0IExvZ1wiIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzaG93QnRuOiAkKCcjc2hvdy1sYXN0LWxvZycpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIFwiRG93bmxvYWQgRmlsZVwiIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkb3dubG9hZEJ0bjogJCgnI2Rvd25sb2FkLWZpbGUnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBcIlNob3cgTGFzdCBMb2cgKEF1dG8pXCIgYnV0dG9uLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNob3dBdXRvQnRuOiAkKCcjc2hvdy1sYXN0LWxvZy1hdXRvJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgXCJFcmFzZSBjdXJyZW50IGZpbGUgY29udGVudFwiIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRlcmFzZUJ0bjogJCgnI2VyYXNlLWZpbGUnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBsb2cgY29udGVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRsb2dDb250ZW50OiAkKCcjbG9nLWNvbnRlbnQtcmVhZG9ubHknKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSB2aWV3ZXIgZm9yIGRpc3BsYXlpbmcgdGhlIGxvZyBjb250ZW50LlxuICAgICAqIEB0eXBlIHtBY2V9XG4gICAgICovXG4gICAgdmlld2VyOiAnJyxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmaWxlIHNlbGVjdCBkcm9wZG93bi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmaWxlU2VsZWN0RHJvcERvd246IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBBcnJheSBvZiBsb2cgaXRlbXMuXG4gICAgICogQHR5cGUge0FycmF5fVxuICAgICAqL1xuICAgIGxvZ3NJdGVtczogW10sXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZGltbWVyLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRpbW1lcjogJCgnI2dldC1sb2dzLWRpbW1lcicpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI3N5c3RlbS1kaWFnbm9zdGljLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIEZsYWcgdG8gcHJldmVudCBkdXBsaWNhdGUgQVBJIGNhbGxzIGR1cmluZyBpbml0aWFsaXphdGlvblxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGlzSW5pdGlhbGl6aW5nOiB0cnVlLFxuXG4gICAgLyoqXG4gICAgICogRmxhZyBpbmRpY2F0aW5nIGlmIHRpbWUgc2xpZGVyIG1vZGUgaXMgZW5hYmxlZFxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIHRpbWVTbGlkZXJFbmFibGVkOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIEN1cnJlbnQgdGltZSByYW5nZSBmb3IgdGhlIHNlbGVjdGVkIGxvZyBmaWxlXG4gICAgICogQHR5cGUge29iamVjdHxudWxsfVxuICAgICAqL1xuICAgIGN1cnJlbnRUaW1lUmFuZ2U6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBGbGFnIGluZGljYXRpbmcgaWYgYXV0by11cGRhdGUgbW9kZSBpcyBhY3RpdmVcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBpc0F1dG9VcGRhdGVBY3RpdmU6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogQXJyYXkgb2YgY2FzY2FkaW5nIGZpbHRlciBjb25kaXRpb25zIFt7dHlwZTogJ2NvbnRhaW5zJ3wnbm90Q29udGFpbnMnLCB2YWx1ZTogc3RyaW5nfV1cbiAgICAgKiBAdHlwZSB7QXJyYXl9XG4gICAgICovXG4gICAgZmlsdGVyQ29uZGl0aW9uczogW10sXG5cbiAgICAvKipcbiAgICAgKiBQZW5kaW5nIGZpbHRlciB0ZXh0IHdhaXRpbmcgZm9yIHR5cGUgc2VsZWN0aW9uIGluIHBvcHVwXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBwZW5kaW5nRmlsdGVyVGV4dDogJycsXG5cbiAgICAvKipcbiAgICAgKiBMYXN0IGtub3duIGFjdHVhbCBkYXRhIGVuZCB0aW1lc3RhbXAgZnJvbSBBUEkgcmVzcG9uc2UuXG4gICAgICogVXNlZCB0byBhbmNob3IgcmVmcmVzaCB0aW1lIHJhbmdlIHRvIHJlYWwgZGF0YSBpbnN0ZWFkIG9mIHdhbGwgY2xvY2sgdGltZS5cbiAgICAgKiBXSFk6IElmIGEgbG9nIGZpbGUgaGFzbid0IGJlZW4gd3JpdHRlbiB0byByZWNlbnRseSAoZS5nLiwgaWRsZSBtb2R1bGUgbG9nKSxcbiAgICAgKiB1c2luZyBcIm5vdyAtIHBlcmlvZFwiIGFzIHN0YXJ0VGltZXN0YW1wIHByb2R1Y2VzIGFuIGVtcHR5IHJhbmdlIHdpdGggbm8gZGF0YS5cbiAgICAgKiBAdHlwZSB7bnVtYmVyfG51bGx9XG4gICAgICovXG4gICAgbGFzdEtub3duRGF0YUVuZDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBzeXN0ZW0gZGlhZ25vc3RpYyBsb2dzLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEVuc3VyZSBmaWx0ZXIgdHlwZSBwb3B1cCBzdGFydHMgaGlkZGVuIHdpdGggY2xlYW4gc3R5bGVzXG4gICAgICAgICQoJyNmaWx0ZXItdHlwZS1wb3B1cCcpLmFkZENsYXNzKCdoaWRkZW4nKS5oaWRlKCkuY3NzKHt0b3A6ICcnLCBsZWZ0OiAnJ30pO1xuXG4gICAgICAgIGNvbnN0IGFjZUhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCAtIDI1MDtcblxuICAgICAgICAvLyBTZXQgdGhlIG1pbmltdW0gaGVpZ2h0IG9mIHRoZSBsb2cgY29udGFpbmVyXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIuY2xvc2VzdCgnZGl2JykuY3NzKCdtaW4taGVpZ2h0JywgYCR7YWNlSGVpZ2h0fXB4YCk7XG5cbiAgICAgICAgLy8gQ3JlYXRlIGRyb3Bkb3duIFVJIGZyb20gaGlkZGVuIGlucHV0IChWNS4wIHBhdHRlcm4pXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmNyZWF0ZURyb3Bkb3duRnJvbUhpZGRlbklucHV0KCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZHJvcGRvd24gbWVudSBmb3IgbG9nIGZpbGVzIHdpdGggdHJlZSBzdXBwb3J0XG4gICAgICAgIC8vIEluaXRpYWxpemUgU2VtYW50aWMgVUkgZHJvcGRvd24gd2l0aCBjdXN0b20gbWVudSBnZW5lcmF0aW9uXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jYk9uQ2hhbmdlRmlsZSxcbiAgICAgICAgICAgICAgICBpZ25vcmVDYXNlOiB0cnVlLFxuICAgICAgICAgICAgICAgIGZ1bGxUZXh0U2VhcmNoOiB0cnVlLFxuICAgICAgICAgICAgICAgIGZvcmNlU2VsZWN0aW9uOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBwcmVzZXJ2ZUhUTUw6IHRydWUsXG4gICAgICAgICAgICAgICAgYWxsb3dDYXRlZ29yeVNlbGVjdGlvbjogZmFsc2UsXG4gICAgICAgICAgICAgICAgbWF0Y2g6ICd0ZXh0JyxcbiAgICAgICAgICAgICAgICBmaWx0ZXJSZW1vdGVEYXRhOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBhY3Rpb246ICdhY3RpdmF0ZScsXG4gICAgICAgICAgICAgICAgdGVtcGxhdGVzOiB7XG4gICAgICAgICAgICAgICAgICAgIG1lbnU6IHN5c3RlbURpYWdub3N0aWNMb2dzLmN1c3RvbURyb3Bkb3duTWVudVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb2xkZXIgY29sbGFwc2UvZXhwYW5kIGhhbmRsZXJzICh1c2VzIGV2ZW50IGRlbGVnYXRpb24pXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmluaXRpYWxpemVGb2xkZXJIYW5kbGVycygpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIEFDRSBlZGl0b3IgZm9yIGxvZyBjb250ZW50XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmluaXRpYWxpemVBY2UoKTtcblxuICAgICAgICAvLyBGZXRjaCB0aGUgbGlzdCBvZiBsb2cgZmlsZXNcbiAgICAgICAgU3lzbG9nQVBJLmdldExvZ3NMaXN0KHN5c3RlbURpYWdub3N0aWNMb2dzLmNiRm9ybWF0RHJvcGRvd25SZXN1bHRzKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGxvZyBsZXZlbCBkcm9wZG93biAtIFY1LjAgcGF0dGVybiB3aXRoIER5bmFtaWNEcm9wZG93bkJ1aWxkZXJcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaW5pdGlhbGl6ZUxvZ0xldmVsRHJvcGRvd24oKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGZpbHRlciBjb25kaXRpb25zIGZyb20gVVJMIHBhcmFtZXRlciAoZS5nLiBDRFIgbGlua3Mgd2l0aCA/ZmlsdGVyPS4uLilcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaW5pdGlhbGl6ZUZpbHRlckZyb21VcmwoKTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgcXVpY2sgcGVyaW9kIGJ1dHRvbnNcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJy5wZXJpb2QtYnRuJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0ICRidG4gPSAkKGUuY3VycmVudFRhcmdldCk7XG4gICAgICAgICAgICBjb25zdCBwZXJpb2QgPSAkYnRuLmRhdGEoJ3BlcmlvZCcpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgYWN0aXZlIHN0YXRlXG4gICAgICAgICAgICAkKCcucGVyaW9kLWJ0bicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgICRidG4uYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuXG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5hcHBseVF1aWNrUGVyaW9kKHBlcmlvZCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciBcIk5vd1wiIGJ1dHRvblxuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnLm5vdy1idG4nLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgaWYgKHN5c3RlbURpYWdub3N0aWNMb2dzLmN1cnJlbnRUaW1lUmFuZ2UpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBlbmQgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jdXJyZW50VGltZVJhbmdlLmVuZDtcbiAgICAgICAgICAgICAgICBjb25zdCBvbmVIb3VyID0gMzYwMDtcbiAgICAgICAgICAgICAgICBjb25zdCBzdGFydCA9IE1hdGgubWF4KGVuZCAtIG9uZUhvdXIsIHN5c3RlbURpYWdub3N0aWNMb2dzLmN1cnJlbnRUaW1lUmFuZ2Uuc3RhcnQpO1xuICAgICAgICAgICAgICAgIFNWR1RpbWVsaW5lLnNldFJhbmdlKHN0YXJ0LCBlbmQpO1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmxvYWRMb2dCeVRpbWVSYW5nZShzdGFydCwgZW5kKTtcbiAgICAgICAgICAgICAgICAkKCcucGVyaW9kLWJ0bicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgICAgICAkKCcucGVyaW9kLWJ0bltkYXRhLXBlcmlvZD1cIjM2MDBcIl0nKS5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciBsb2cgbGV2ZWwgZmlsdGVyIGJ1dHRvbnNcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJy5sZXZlbC1idG4nLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgJGJ0biA9ICQoZS5jdXJyZW50VGFyZ2V0KTtcbiAgICAgICAgICAgIGNvbnN0IGxldmVsID0gJGJ0bi5kYXRhKCdsZXZlbCcpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgYWN0aXZlIHN0YXRlXG4gICAgICAgICAgICAkKCcubGV2ZWwtYnRuJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgJGJ0bi5hZGRDbGFzcygnYWN0aXZlJyk7XG5cbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmFwcGx5TG9nTGV2ZWxGaWx0ZXIobGV2ZWwpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgXCJTaG93IExvZ1wiIGJ1dHRvbiBjbGljayAoZGVsZWdhdGVkKVxuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnI3Nob3ctbGFzdC1sb2cnLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudXBkYXRlTG9nRnJvbVNlcnZlcigpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBMaXN0ZW4gZm9yIGhhc2ggY2hhbmdlcyB0byB1cGRhdGUgc2VsZWN0ZWQgZmlsZVxuICAgICAgICAkKHdpbmRvdykub24oJ2hhc2hjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5oYW5kbGVIYXNoQ2hhbmdlKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciBcIkRvd25sb2FkIExvZ1wiIGJ1dHRvbiBjbGljayAoZGVsZWdhdGVkKVxuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnI2Rvd25sb2FkLWZpbGUnLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgZGF0YSA9IHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgICAgIFN5c2xvZ0FQSS5kb3dubG9hZExvZ0ZpbGUoZGF0YS5maWxlbmFtZSwgdHJ1ZSwgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY2JEb3dubG9hZEZpbGUpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgXCJBdXRvIFJlZnJlc2hcIiBidXR0b24gY2xpY2sgKGRlbGVnYXRlZClcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJyNzaG93LWxhc3QtbG9nLWF1dG8nLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQoJyNzaG93LWxhc3QtbG9nLWF1dG8nKTtcbiAgICAgICAgICAgIGNvbnN0ICRyZWxvYWRJY29uID0gJGJ1dHRvbi5maW5kKCcuaWNvbnMgaS5yZWZyZXNoJyk7XG4gICAgICAgICAgICBpZiAoJHJlbG9hZEljb24uaGFzQ2xhc3MoJ2xvYWRpbmcnKSkge1xuICAgICAgICAgICAgICAgICRyZWxvYWRJY29uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdXBkYXRlTG9nVmlld1dvcmtlci5zdG9wKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRyZWxvYWRJY29uLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB1cGRhdGVMb2dWaWV3V29ya2VyLmluaXRpYWxpemUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIHRoZSBcIkVyYXNlIGZpbGVcIiBidXR0b24gY2xpY2sgKGRlbGVnYXRlZClcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJyNlcmFzZS1maWxlJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmVyYXNlQ3VycmVudEZpbGVDb250ZW50KCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciBFbnRlciBrZXlwcmVzcyBvbiBmaWx0ZXIgaW5wdXQg4oCUIHNob3cgdHlwZSBwb3B1cFxuICAgICAgICAkKGRvY3VtZW50KS5vbigna2V5ZG93bicsICcjZmlsdGVyLWlucHV0JywgKGV2ZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkcG9wdXAgPSAkKCcjZmlsdGVyLXR5cGUtcG9wdXAnKTtcbiAgICAgICAgICAgIGNvbnN0IGlzUG9wdXBWaXNpYmxlID0gJHBvcHVwLmlzKCc6dmlzaWJsZScpICYmICEkcG9wdXAuaGFzQ2xhc3MoJ2hpZGRlbicpO1xuXG4gICAgICAgICAgICAvLyBXaGVuIHBvcHVwIGlzIG9wZW4sIGhhbmRsZSBhcnJvdyBrZXlzIGFuZCBFbnRlciBmb3Iga2V5Ym9hcmQgbmF2aWdhdGlvblxuICAgICAgICAgICAgaWYgKGlzUG9wdXBWaXNpYmxlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50LmtleSA9PT0gJ0Fycm93RG93bicgfHwgZXZlbnQua2V5ID09PSAnQXJyb3dVcCcpIHtcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MubmF2aWdhdGVGaWx0ZXJQb3B1cChldmVudC5rZXkgPT09ICdBcnJvd0Rvd24nID8gMSA6IC0xKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoZXZlbnQua2V5ID09PSAnRW50ZXInKSB7XG4gICAgICAgICAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRmb2N1c2VkID0gJHBvcHVwLmZpbmQoJy5maWx0ZXItdHlwZS1vcHRpb24uZm9jdXNlZCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoJGZvY3VzZWQubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkZm9jdXNlZC50cmlnZ2VyKCdjbGljaycpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChldmVudC5rZXkgPT09ICdFbnRlcicpIHtcbiAgICAgICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSAkKCcjZmlsdGVyLWlucHV0JykudmFsKCkudHJpbSgpO1xuICAgICAgICAgICAgICAgIGlmICh0ZXh0ICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5wZW5kaW5nRmlsdGVyVGV4dCA9IHRleHQ7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnNob3dGaWx0ZXJUeXBlUG9wdXAoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGV2ZW50LmtleSA9PT0gJ0VzY2FwZScpIHtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5oaWRlRmlsdGVyVHlwZVBvcHVwKCk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGV2ZW50LmtleSA9PT0gJ0JhY2tzcGFjZScgJiYgJCgnI2ZpbHRlci1pbnB1dCcpLnZhbCgpID09PSAnJykge1xuICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBsYXN0IGNoaXAgb24gQmFja3NwYWNlIGluIGVtcHR5IGlucHV0XG4gICAgICAgICAgICAgICAgaWYgKHN5c3RlbURpYWdub3N0aWNMb2dzLmZpbHRlckNvbmRpdGlvbnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5yZW1vdmVGaWx0ZXJDb25kaXRpb24oXG4gICAgICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5maWx0ZXJDb25kaXRpb25zLmxlbmd0aCAtIDFcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIE9uIGJsdXI6IGF1dG8tYWRkIHRleHQgYXMgXCJjb250YWluc1wiIGZpbHRlciBpZiBwb3B1cCBpcyBub3Qgb3BlblxuICAgICAgICAkKGRvY3VtZW50KS5vbignYmx1cicsICcjZmlsdGVyLWlucHV0JywgKCkgPT4ge1xuICAgICAgICAgICAgLy8gRGVsYXkgdG8gYWxsb3cgY2xpY2sgb24gcG9wdXAgb3B0aW9uIHRvIGZpcmUgZmlyc3RcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0ICRwb3B1cCA9ICQoJyNmaWx0ZXItdHlwZS1wb3B1cCcpO1xuICAgICAgICAgICAgICAgIGlmICgkcG9wdXAuaXMoJzp2aXNpYmxlJykpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gUG9wdXAgaXMgb3BlbiAodXNlciBwcmVzc2VkIEVudGVyKSDigJQgbGV0IHBvcHVwIGhhbmRsZSBpdFxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGNvbnN0IHRleHQgPSAkKCcjZmlsdGVyLWlucHV0JykudmFsKCkudHJpbSgpO1xuICAgICAgICAgICAgICAgIGlmICh0ZXh0ICE9PSAnJykge1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5hZGRGaWx0ZXJDb25kaXRpb24oJ2NvbnRhaW5zJywgdGV4dCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSwgMTUwKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gRXZlbnQgbGlzdGVuZXIgZm9yIGZpbHRlciB0eXBlIG9wdGlvbiBjbGlja1xuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnLmZpbHRlci10eXBlLW9wdGlvbicsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB0eXBlID0gJChlLmN1cnJlbnRUYXJnZXQpLmRhdGEoJ3R5cGUnKTtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmFkZEZpbHRlckNvbmRpdGlvbih0eXBlLCBzeXN0ZW1EaWFnbm9zdGljTG9ncy5wZW5kaW5nRmlsdGVyVGV4dCk7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5wZW5kaW5nRmlsdGVyVGV4dCA9ICcnO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaGlkZUZpbHRlclR5cGVQb3B1cCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgcmVtb3ZpbmcgaW5kaXZpZHVhbCBmaWx0ZXIgY2hpcFxuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnI2ZpbHRlci1sYWJlbHMgLmRlbGV0ZS5pY29uJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgICAgICBjb25zdCBpbmRleCA9ICQoZS5jdXJyZW50VGFyZ2V0KS5jbG9zZXN0KCcuZmlsdGVyLWNvbmRpdGlvbi1sYWJlbCcpLmRhdGEoJ2luZGV4Jyk7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5yZW1vdmVGaWx0ZXJDb25kaXRpb24oaW5kZXgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBFdmVudCBsaXN0ZW5lciBmb3IgXCJDbGVhciBGaWx0ZXJcIiBidXR0b24gY2xpY2tcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJyNjbGVhci1maWx0ZXItYnRuJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmNsZWFyQWxsRmlsdGVyQ29uZGl0aW9ucygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBDbGljayBvbiBjb250YWluZXIgZm9jdXNlcyBpbnB1dFxuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnI2ZpbHRlci1jb25kaXRpb25zLWNvbnRhaW5lcicsIChlKSA9PiB7XG4gICAgICAgICAgICBpZiAoJChlLnRhcmdldCkuaXMoJyNmaWx0ZXItY29uZGl0aW9ucy1jb250YWluZXInKSB8fCAkKGUudGFyZ2V0KS5pcygnI2ZpbHRlci1sYWJlbHMnKSkge1xuICAgICAgICAgICAgICAgICQoJyNmaWx0ZXItaW5wdXQnKS5mb2N1cygpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIaWRlIHBvcHVwIHdoZW4gY2xpY2tpbmcgb3V0c2lkZVxuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgaWYgKCEkKGUudGFyZ2V0KS5jbG9zZXN0KCcjZmlsdGVyLXR5cGUtcG9wdXAsICNmaWx0ZXItaW5wdXQnKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5oaWRlRmlsdGVyVHlwZVBvcHVwKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEV2ZW50IGxpc3RlbmVyIGZvciBGdWxsc2NyZWVuIGJ1dHRvbiBjbGlja1xuICAgICAgICAkKCcuZnVsbHNjcmVlbi10b2dnbGUtYnRuJykub24oJ2NsaWNrJywgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudG9nZ2xlRnVsbFNjcmVlbik7XG5cbiAgICAgICAgLy8gTGlzdGVuaW5nIGZvciB0aGUgZnVsbHNjcmVlbiBjaGFuZ2UgZXZlbnRcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignZnVsbHNjcmVlbmNoYW5nZScsIHN5c3RlbURpYWdub3N0aWNMb2dzLmFkanVzdExvZ0hlaWdodCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbCBoZWlnaHQgY2FsY3VsYXRpb25cbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuYWRqdXN0TG9nSGVpZ2h0KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRvZ2dsZXMgdGhlIGZ1bGwtc2NyZWVuIG1vZGUgb2YgdGhlICdzeXN0ZW0tbG9ncy1zZWdtZW50JyBlbGVtZW50LlxuICAgICAqIElmIHRoZSBlbGVtZW50IGlzIG5vdCBpbiBmdWxsLXNjcmVlbiBtb2RlLCBpdCByZXF1ZXN0cyBmdWxsLXNjcmVlbiBtb2RlLlxuICAgICAqIElmIHRoZSBlbGVtZW50IGlzIGFscmVhZHkgaW4gZnVsbC1zY3JlZW4gbW9kZSwgaXQgZXhpdHMgZnVsbC1zY3JlZW4gbW9kZS5cbiAgICAgKiBMb2dzIGFuIGVycm9yIG1lc3NhZ2UgdG8gdGhlIGNvbnNvbGUgaWYgdGhlcmUgaXMgYW4gaXNzdWUgZW5hYmxpbmcgZnVsbC1zY3JlZW4gbW9kZS5cbiAgICAgKlxuICAgICAqIEByZXR1cm4ge3ZvaWR9XG4gICAgICovXG4gICAgdG9nZ2xlRnVsbFNjcmVlbigpIHtcbiAgICAgICAgY29uc3QgbG9nQ29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3N5c3RlbS1sb2dzLXNlZ21lbnQnKTtcblxuICAgICAgICBpZiAoIWRvY3VtZW50LmZ1bGxzY3JlZW5FbGVtZW50KSB7XG4gICAgICAgICAgICBsb2dDb250YWluZXIucmVxdWVzdEZ1bGxzY3JlZW4oKS5jYXRjaCgoZXJyKSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgYXR0ZW1wdGluZyB0byBlbmFibGUgZnVsbC1zY3JlZW4gbW9kZTogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZG9jdW1lbnQuZXhpdEZ1bGxzY3JlZW4oKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGdW5jdGlvbiB0byBhZGp1c3QgdGhlIGhlaWdodCBvZiB0aGUgbG9ncyBkZXBlbmRpbmcgb24gdGhlIHNjcmVlbiBtb2RlLlxuICAgICAqL1xuICAgIGFkanVzdExvZ0hlaWdodCgpIHtcbiAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBsZXQgYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGxvZ0NvbnRlbnQub2Zmc2V0KCkudG9wIC0gNTU7XG4gICAgICAgICAgICBpZiAoZG9jdW1lbnQuZnVsbHNjcmVlbkVsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAvLyBJZiBmdWxsc2NyZWVuIG1vZGUgaXMgYWN0aXZlXG4gICAgICAgICAgICAgICAgYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gODA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBSZWNhbGN1bGF0ZSB0aGUgc2l6ZSBvZiB0aGUgQUNFIGVkaXRvclxuICAgICAgICAgICAgJCgnLmxvZy1jb250ZW50LXJlYWRvbmx5JykuY3NzKCdtaW4taGVpZ2h0JywgIGAke2FjZUhlaWdodH1weGApO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnJlc2l6ZSgpO1xuICAgICAgICB9LCAzMDApO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBsb2cgbGV2ZWwgZHJvcGRvd24gLSBWNS4wIHBhdHRlcm4gd2l0aCBIVE1MIGljb25zXG4gICAgICogU3RhdGljIGRyb3Bkb3duIHdpdGggY29sb3JlZCBpY29ucyBhbmQgdHJhbnNsYXRpb25zXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUxvZ0xldmVsRHJvcGRvd24oKSB7XG4gICAgICAgIGNvbnN0ICRoaWRkZW5JbnB1dCA9ICQoJyNsb2dMZXZlbCcpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGRyb3Bkb3duIGFscmVhZHkgZXhpc3RzXG4gICAgICAgIGlmICgkKCcjbG9nTGV2ZWwtZHJvcGRvd24nKS5sZW5ndGgpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENyZWF0ZSBkcm9wZG93biBIVE1MIHdpdGggY29sb3JlZCBpY29uc1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCc8ZGl2PicsIHtcbiAgICAgICAgICAgIGlkOiAnbG9nTGV2ZWwtZHJvcGRvd24nLFxuICAgICAgICAgICAgY2xhc3M6ICd1aSBzZWxlY3Rpb24gZHJvcGRvd24nXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0ICR0ZXh0ID0gJCgnPGRpdj4nLCB7IGNsYXNzOiAndGV4dCcgfSkudGV4dChnbG9iYWxUcmFuc2xhdGUuc2RfQWxsTGV2ZWxzKTtcbiAgICAgICAgY29uc3QgJGljb24gPSAkKCc8aT4nLCB7IGNsYXNzOiAnZHJvcGRvd24gaWNvbicgfSk7XG4gICAgICAgIGNvbnN0ICRtZW51ID0gJCgnPGRpdj4nLCB7IGNsYXNzOiAnbWVudScgfSk7XG5cbiAgICAgICAgLy8gQnVpbGQgbWVudSBpdGVtcyB3aXRoIGNvbG9yZWQgaWNvbnNcbiAgICAgICAgY29uc3QgaXRlbXMgPSBbXG4gICAgICAgICAgICB7IHZhbHVlOiAnJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnNkX0FsbExldmVscywgaWNvbjogJycgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdFUlJPUicsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5zZF9FcnJvciwgaWNvbjogJzxpIGNsYXNzPVwiZXhjbGFtYXRpb24gY2lyY2xlIHJlZCBpY29uXCI+PC9pPicgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdXQVJOSU5HJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnNkX1dhcm5pbmcsIGljb246ICc8aSBjbGFzcz1cImV4Y2xhbWF0aW9uIHRyaWFuZ2xlIG9yYW5nZSBpY29uXCI+PC9pPicgfSxcbiAgICAgICAgICAgIHsgdmFsdWU6ICdOT1RJQ0UnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc2RfTm90aWNlLCBpY29uOiAnPGkgY2xhc3M9XCJpbmZvIGNpcmNsZSBibHVlIGljb25cIj48L2k+JyB9LFxuICAgICAgICAgICAgeyB2YWx1ZTogJ0lORk8nLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc2RfSW5mbywgaWNvbjogJzxpIGNsYXNzPVwiY2lyY2xlIGdyZXkgaWNvblwiPjwvaT4nIH0sXG4gICAgICAgICAgICB7IHZhbHVlOiAnREVCVUcnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc2RfRGVidWcsIGljb246ICc8aSBjbGFzcz1cImJ1ZyBwdXJwbGUgaWNvblwiPjwvaT4nIH1cbiAgICAgICAgXTtcblxuICAgICAgICBpdGVtcy5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICAgICAgY29uc3QgJGl0ZW0gPSAkKCc8ZGl2PicsIHtcbiAgICAgICAgICAgICAgICBjbGFzczogJ2l0ZW0nLFxuICAgICAgICAgICAgICAgICdkYXRhLXZhbHVlJzogaXRlbS52YWx1ZVxuICAgICAgICAgICAgfSkuaHRtbChpdGVtLmljb24gKyBpdGVtLnRleHQpO1xuICAgICAgICAgICAgJG1lbnUuYXBwZW5kKCRpdGVtKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJGRyb3Bkb3duLmFwcGVuZCgkdGV4dCwgJGljb24sICRtZW51KTtcbiAgICAgICAgJGhpZGRlbklucHV0LmFmdGVyKCRkcm9wZG93bik7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTZW1hbnRpYyBVSSBkcm9wZG93blxuICAgICAgICAkZHJvcGRvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6ICh2YWx1ZSkgPT4ge1xuICAgICAgICAgICAgICAgICRoaWRkZW5JbnB1dC52YWwodmFsdWUpLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIodHJ1ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDcmVhdGVzIGRyb3Bkb3duIFVJIGVsZW1lbnQgZnJvbSBoaWRkZW4gaW5wdXQgZmllbGQgKFY1LjAgcGF0dGVybilcbiAgICAgKi9cbiAgICBjcmVhdGVEcm9wZG93bkZyb21IaWRkZW5JbnB1dCgpIHtcbiAgICAgICAgY29uc3QgJGhpZGRlbklucHV0ID0gJCgnI2ZpbGVuYW1lcycpO1xuXG4gICAgICAgIGlmICghJGhpZGRlbklucHV0Lmxlbmd0aCkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignSGlkZGVuIGlucHV0ICNmaWxlbmFtZXMgbm90IGZvdW5kJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSAkKCc8ZGl2PicsIHtcbiAgICAgICAgICAgIGlkOiAnZmlsZW5hbWVzLWRyb3Bkb3duJyxcbiAgICAgICAgICAgIGNsYXNzOiAndWkgc2VhcmNoIHNlbGVjdGlvbiBkcm9wZG93biBmaWxlbmFtZXMtc2VsZWN0IGZsdWlkJ1xuICAgICAgICB9KTtcblxuICAgICAgICAkZHJvcGRvd24uYXBwZW5kKFxuICAgICAgICAgICAgJCgnPGk+JywgeyBjbGFzczogJ2Ryb3Bkb3duIGljb24nIH0pLFxuICAgICAgICAgICAgJCgnPGlucHV0PicsIHsgdHlwZTogJ3RleHQnLCBjbGFzczogJ3NlYXJjaCcsIHRhYmluZGV4OiAwIH0pLFxuICAgICAgICAgICAgJCgnPGRpdj4nLCB7IGNsYXNzOiAnZGVmYXVsdCB0ZXh0JyB9KS50ZXh0KCdTZWxlY3QgbG9nIGZpbGUnKSxcbiAgICAgICAgICAgICQoJzxkaXY+JywgeyBjbGFzczogJ21lbnUnIH0pXG4gICAgICAgICk7XG5cbiAgICAgICAgJGhpZGRlbklucHV0LmJlZm9yZSgkZHJvcGRvd24pO1xuICAgICAgICAkaGlkZGVuSW5wdXQuaGlkZSgpO1xuXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24gPSAkZHJvcGRvd247XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBBQ0UgZWRpdG9yIGZvciBsb2cgdmlld2luZy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplQWNlKCkge1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIgPSBhY2UuZWRpdCgnbG9nLWNvbnRlbnQtcmVhZG9ubHknKTtcblxuICAgICAgICAvLyBDaGVjayBpZiB0aGUgSnVsaWEgbW9kZSBpcyBhdmFpbGFibGVcbiAgICAgICAgY29uc3QganVsaWEgPSBhY2UucmVxdWlyZSgnYWNlL21vZGUvanVsaWEnKTtcbiAgICAgICAgaWYgKGp1bGlhICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIFNldCB0aGUgbW9kZSB0byBKdWxpYSBpZiBhdmFpbGFibGVcbiAgICAgICAgICAgIGNvbnN0IEluaU1vZGUgPSBqdWxpYS5Nb2RlO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnNlc3Npb24uc2V0TW9kZShuZXcgSW5pTW9kZSgpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCB0aGUgdGhlbWUgYW5kIG9wdGlvbnMgZm9yIHRoZSBBQ0UgZWRpdG9yXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnZpZXdlci5zZXRUaGVtZSgnYWNlL3RoZW1lL21vbm9rYWknKTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnJlbmRlcmVyLnNldFNob3dHdXR0ZXIoZmFsc2UpO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIuc2V0T3B0aW9ucyh7XG4gICAgICAgICAgICBzaG93TGluZU51bWJlcnM6IGZhbHNlLFxuICAgICAgICAgICAgc2hvd1ByaW50TWFyZ2luOiBmYWxzZSxcbiAgICAgICAgICAgIHJlYWRPbmx5OiB0cnVlLFxuICAgICAgICB9KTtcblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCdWlsZHMgYSBoaWVyYXJjaGljYWwgdHJlZSBzdHJ1Y3R1cmUgZnJvbSBmbGF0IGZpbGUgcGF0aHNcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gZmlsZXMgLSBUaGUgZmlsZXMgb2JqZWN0IGZyb20gQVBJIHJlc3BvbnNlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGRlZmF1bHRQYXRoIC0gVGhlIGRlZmF1bHQgc2VsZWN0ZWQgZmlsZSBwYXRoXG4gICAgICogQHJldHVybnMge0FycmF5fSBUcmVlIHN0cnVjdHVyZSBmb3IgdGhlIGRyb3Bkb3duXG4gICAgICovXG4gICAgYnVpbGRUcmVlU3RydWN0dXJlKGZpbGVzLCBkZWZhdWx0UGF0aCkge1xuICAgICAgICBjb25zdCB0cmVlID0ge307XG4gICAgICAgIFxuICAgICAgICAvLyBCdWlsZCB0aGUgdHJlZSBzdHJ1Y3R1cmVcbiAgICAgICAgT2JqZWN0LmVudHJpZXMoZmlsZXMpLmZvckVhY2goKFtrZXksIGZpbGVEYXRhXSkgPT4ge1xuICAgICAgICAgICAgLy8gVXNlIGZpbGVEYXRhLnBhdGggYXMgdGhlIGFjdHVhbCBmaWxlIHBhdGhcbiAgICAgICAgICAgIGNvbnN0IGZpbGVQYXRoID0gZmlsZURhdGEucGF0aCB8fCBrZXk7XG4gICAgICAgICAgICBjb25zdCBwYXJ0cyA9IGZpbGVQYXRoLnNwbGl0KCcvJyk7XG4gICAgICAgICAgICBsZXQgY3VycmVudCA9IHRyZWU7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHBhcnRzLmZvckVhY2goKHBhcnQsIGluZGV4KSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGluZGV4ID09PSBwYXJ0cy5sZW5ndGggLSAxKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgaXMgYSBmaWxlXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRbcGFydF0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZmlsZScsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoOiBmaWxlUGF0aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIHNpemU6IGZpbGVEYXRhLnNpemUsXG4gICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OiAoZGVmYXVsdFBhdGggJiYgZGVmYXVsdFBhdGggPT09IGZpbGVQYXRoKSB8fCAoIWRlZmF1bHRQYXRoICYmIGZpbGVEYXRhLmRlZmF1bHQpXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBpcyBhIGRpcmVjdG9yeVxuICAgICAgICAgICAgICAgICAgICBpZiAoIWN1cnJlbnRbcGFydF0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRbcGFydF0gPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2ZvbGRlcicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hpbGRyZW46IHt9XG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnQgPSBjdXJyZW50W3BhcnRdLmNoaWxkcmVuO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbnZlcnQgdHJlZSB0byBkcm9wZG93biBpdGVtc1xuICAgICAgICByZXR1cm4gdGhpcy50cmVlVG9Ecm9wZG93bkl0ZW1zKHRyZWUsICcnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENvbnZlcnRzIHRyZWUgc3RydWN0dXJlIHRvIGRyb3Bkb3duIGl0ZW1zIHdpdGggcHJvcGVyIGZvcm1hdHRpbmdcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gdHJlZSAtIFRoZSB0cmVlIHN0cnVjdHVyZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcmVmaXggLSBQcmVmaXggZm9yIGluZGVudGF0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmVudEZvbGRlciAtIFBhcmVudCBmb2xkZXIgbmFtZSBmb3IgZ3JvdXBpbmdcbiAgICAgKiBAcmV0dXJucyB7QXJyYXl9IEZvcm1hdHRlZCBkcm9wZG93biBpdGVtc1xuICAgICAqL1xuICAgIHRyZWVUb0Ryb3Bkb3duSXRlbXModHJlZSwgcHJlZml4LCBwYXJlbnRGb2xkZXIgPSAnJykge1xuICAgICAgICBjb25zdCBpdGVtcyA9IFtdO1xuXG4gICAgICAgIC8vIFNvcnQgZW50cmllczogZm9sZGVycyBmaXJzdCwgdGhlbiBmaWxlc1xuICAgICAgICBjb25zdCBlbnRyaWVzID0gT2JqZWN0LmVudHJpZXModHJlZSkuc29ydCgoW2FLZXksIGFWYWxdLCBbYktleSwgYlZhbF0pID0+IHtcbiAgICAgICAgICAgIGlmIChhVmFsLnR5cGUgPT09ICdmb2xkZXInICYmIGJWYWwudHlwZSA9PT0gJ2ZpbGUnKSByZXR1cm4gLTE7XG4gICAgICAgICAgICBpZiAoYVZhbC50eXBlID09PSAnZmlsZScgJiYgYlZhbC50eXBlID09PSAnZm9sZGVyJykgcmV0dXJuIDE7XG4gICAgICAgICAgICByZXR1cm4gYUtleS5sb2NhbGVDb21wYXJlKGJLZXkpO1xuICAgICAgICB9KTtcblxuICAgICAgICBlbnRyaWVzLmZvckVhY2goKFtrZXksIHZhbHVlXSkgPT4ge1xuICAgICAgICAgICAgaWYgKHZhbHVlLnR5cGUgPT09ICdmb2xkZXInKSB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIGZvbGRlciBoZWFkZXIgd2l0aCB0b2dnbGUgY2FwYWJpbGl0eVxuICAgICAgICAgICAgICAgIGl0ZW1zLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBgPGkgY2xhc3M9XCJjYXJldCBkb3duIGljb24gZm9sZGVyLXRvZ2dsZVwiPjwvaT48aSBjbGFzcz1cImZvbGRlciBpY29uXCI+PC9pPiAke2tleX1gLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJycsXG4gICAgICAgICAgICAgICAgICAgIGRpc2FibGVkOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZm9sZGVyJyxcbiAgICAgICAgICAgICAgICAgICAgZm9sZGVyTmFtZToga2V5XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBBZGQgY2hpbGRyZW4gd2l0aCBpbmNyZWFzZWQgaW5kZW50YXRpb24gYW5kIHBhcmVudCBmb2xkZXIgcmVmZXJlbmNlXG4gICAgICAgICAgICAgICAgY29uc3QgY2hpbGRJdGVtcyA9IHRoaXMudHJlZVRvRHJvcGRvd25JdGVtcyh2YWx1ZS5jaGlsZHJlbiwgcHJlZml4ICsgJyZuYnNwOyZuYnNwOyZuYnNwOyZuYnNwOycsIGtleSk7XG4gICAgICAgICAgICAgICAgaXRlbXMucHVzaCguLi5jaGlsZEl0ZW1zKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gQWRkIGZpbGUgaXRlbSB3aXRoIHBhcmVudCBmb2xkZXIgcmVmZXJlbmNlXG4gICAgICAgICAgICAgICAgaXRlbXMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIG5hbWU6IGAke3ByZWZpeH08aSBjbGFzcz1cImZpbGUgb3V0bGluZSBpY29uXCI+PC9pPiAke2tleX0gKCR7dmFsdWUuc2l6ZX0pYCxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IHZhbHVlLnBhdGgsXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkOiB2YWx1ZS5kZWZhdWx0LFxuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZmlsZScsXG4gICAgICAgICAgICAgICAgICAgIHBhcmVudEZvbGRlcjogcGFyZW50Rm9sZGVyXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiBpdGVtcztcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENyZWF0ZXMgY3VzdG9tIGRyb3Bkb3duIG1lbnUgSFRNTCBmb3IgbG9nIGZpbGVzIHdpdGggY29sbGFwc2libGUgZm9sZGVyc1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBjb250YWluaW5nIGRyb3Bkb3duIG1lbnUgb3B0aW9uc1xuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBmaWVsZHMgLSBUaGUgZmllbGRzIGluIHRoZSByZXNwb25zZSB0byB1c2UgZm9yIHRoZSBtZW51IG9wdGlvbnNcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBUaGUgSFRNTCBzdHJpbmcgZm9yIHRoZSBjdXN0b20gZHJvcGRvd24gbWVudVxuICAgICAqL1xuICAgIGN1c3RvbURyb3Bkb3duTWVudShyZXNwb25zZSwgZmllbGRzKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlcyA9IHJlc3BvbnNlW2ZpZWxkcy52YWx1ZXNdIHx8IHt9O1xuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuXG4gICAgICAgICQuZWFjaCh2YWx1ZXMsIChpbmRleCwgb3B0aW9uKSA9PiB7XG4gICAgICAgICAgICAvLyBGb3IgdHJlZSBzdHJ1Y3R1cmUgaXRlbXNcbiAgICAgICAgICAgIGlmIChzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXMgJiYgc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zW2luZGV4XSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXNbaW5kZXhdO1xuXG4gICAgICAgICAgICAgICAgaWYgKGl0ZW0udHlwZSA9PT0gJ2ZvbGRlcicpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRm9sZGVyIGl0ZW0gLSBjbGlja2FibGUgaGVhZGVyIGZvciBjb2xsYXBzZS9leHBhbmRcbiAgICAgICAgICAgICAgICAgICAgLy8gTm90IHVzaW5nICdkaXNhYmxlZCcgY2xhc3MgYXMgaXQgYmxvY2tzIHBvaW50ZXIgZXZlbnRzXG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJmb2xkZXItaGVhZGVyIGl0ZW1cIiBkYXRhLWZvbGRlcj1cIiR7aXRlbS5mb2xkZXJOYW1lfVwiIGRhdGEtdmFsdWU9XCJcIiBzdHlsZT1cInBvaW50ZXItZXZlbnRzOiBhdXRvICFpbXBvcnRhbnQ7IGN1cnNvcjogcG9pbnRlcjsgZm9udC13ZWlnaHQ6IGJvbGQ7IGJhY2tncm91bmQ6ICNmOWY5Zjk7XCI+JHtpdGVtLm5hbWV9PC9kaXY+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBGaWxlIGl0ZW0gd2l0aCBwYXJlbnQgZm9sZGVyIHJlZmVyZW5jZSBmb3IgY29sbGFwc2VcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0ZWQgPSBpdGVtLnNlbGVjdGVkID8gJ3NlbGVjdGVkIGFjdGl2ZScgOiAnJztcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFyZW50QXR0ciA9IGl0ZW0ucGFyZW50Rm9sZGVyID8gYGRhdGEtcGFyZW50PVwiJHtpdGVtLnBhcmVudEZvbGRlcn1cImAgOiAnJztcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW0gZmlsZS1pdGVtICR7c2VsZWN0ZWR9XCIgZGF0YS12YWx1ZT1cIiR7b3B0aW9uW2ZpZWxkcy52YWx1ZV19XCIgJHtwYXJlbnRBdHRyfT4ke2l0ZW0ubmFtZX08L2Rpdj5gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gcmVndWxhciBpdGVtXG4gICAgICAgICAgICAgICAgY29uc3QgbWF5YmVEaXNhYmxlZCA9IChvcHRpb25bZmllbGRzLmRpc2FibGVkXSkgPyAnZGlzYWJsZWQgJyA6ICcnO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCIke21heWJlRGlzYWJsZWR9aXRlbVwiIGRhdGEtdmFsdWU9XCIke29wdGlvbltmaWVsZHMudmFsdWVdfVwiPiR7b3B0aW9uW2ZpZWxkcy5uYW1lXX08L2Rpdj5gO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgZm9sZGVyIGNvbGxhcHNlL2V4cGFuZCBoYW5kbGVycyBhbmQgc2VhcmNoIGJlaGF2aW9yXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvbGRlckhhbmRsZXJzKCkge1xuICAgICAgICBjb25zdCAkZHJvcGRvd24gPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duO1xuXG4gICAgICAgIC8vIEhhbmRsZSBmb2xkZXIgaGVhZGVyIGNsaWNrcyBmb3IgY29sbGFwc2UvZXhwYW5kXG4gICAgICAgIC8vIFVzZSBkb2N1bWVudC1sZXZlbCBoYW5kbGVyIHdpdGggY2FwdHVyZSBwaGFzZSB0byBpbnRlcmNlcHQgYmVmb3JlIEZvbWFudGljXG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIGNsaWNrIGlzIGluc2lkZSBvdXIgZHJvcGRvd24ncyBmb2xkZXItaGVhZGVyXG4gICAgICAgICAgICBjb25zdCBmb2xkZXJIZWFkZXIgPSBlLnRhcmdldC5jbG9zZXN0KCcjZmlsZW5hbWVzLWRyb3Bkb3duIC5mb2xkZXItaGVhZGVyJyk7XG4gICAgICAgICAgICBpZiAoIWZvbGRlckhlYWRlcikgcmV0dXJuO1xuXG4gICAgICAgICAgICBlLnN0b3BJbW1lZGlhdGVQcm9wYWdhdGlvbigpO1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICBjb25zdCAkZm9sZGVyID0gJChmb2xkZXJIZWFkZXIpO1xuICAgICAgICAgICAgY29uc3QgZm9sZGVyTmFtZSA9ICRmb2xkZXIuZGF0YSgnZm9sZGVyJyk7XG4gICAgICAgICAgICBjb25zdCAkdG9nZ2xlID0gJGZvbGRlci5maW5kKCcuZm9sZGVyLXRvZ2dsZScpO1xuICAgICAgICAgICAgY29uc3QgJG1lbnUgPSAkZHJvcGRvd24uZmluZCgnLm1lbnUnKTtcbiAgICAgICAgICAgIGNvbnN0ICRmaWxlcyA9ICRtZW51LmZpbmQoYC5maWxlLWl0ZW1bZGF0YS1wYXJlbnQ9XCIke2ZvbGRlck5hbWV9XCJdYCk7XG5cbiAgICAgICAgICAgIC8vIFRvZ2dsZSBmb2xkZXIgc3RhdGVcbiAgICAgICAgICAgIGNvbnN0IGlzQ29sbGFwc2VkID0gJHRvZ2dsZS5oYXNDbGFzcygncmlnaHQnKTtcblxuICAgICAgICAgICAgaWYgKGlzQ29sbGFwc2VkKSB7XG4gICAgICAgICAgICAgICAgLy8gRXhwYW5kIGZvbGRlclxuICAgICAgICAgICAgICAgICR0b2dnbGUucmVtb3ZlQ2xhc3MoJ3JpZ2h0JykuYWRkQ2xhc3MoJ2Rvd24nKTtcbiAgICAgICAgICAgICAgICAkZmlsZXMuc2hvdygpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBDb2xsYXBzZSBmb2xkZXJcbiAgICAgICAgICAgICAgICAkdG9nZ2xlLnJlbW92ZUNsYXNzKCdkb3duJykuYWRkQ2xhc3MoJ3JpZ2h0Jyk7XG4gICAgICAgICAgICAgICAgJGZpbGVzLmhpZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgdHJ1ZSk7IC8vIGNhcHR1cmUgcGhhc2UgLSBmaXJlcyBiZWZvcmUgYnViYmxpbmdcblxuICAgICAgICAvLyBIYW5kbGUgc2VhcmNoIGlucHV0IC0gc2hvdyBhbGwgaXRlbXMgd2hlbiBzZWFyY2hpbmdcbiAgICAgICAgJGRyb3Bkb3duLm9uKCdpbnB1dCcsICdpbnB1dC5zZWFyY2gnLCAoZSkgPT4ge1xuICAgICAgICAgICAgY29uc3Qgc2VhcmNoVmFsdWUgPSAkKGUudGFyZ2V0KS52YWwoKS50cmltKCk7XG4gICAgICAgICAgICBjb25zdCAkbWVudSA9ICRkcm9wZG93bi5maW5kKCcubWVudScpO1xuXG4gICAgICAgICAgICBpZiAoc2VhcmNoVmFsdWUubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgYWxsIGl0ZW1zIGFuZCBleHBhbmQgYWxsIGZvbGRlcnMgZHVyaW5nIHNlYXJjaFxuICAgICAgICAgICAgICAgICRtZW51LmZpbmQoJy5maWxlLWl0ZW0nKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgJG1lbnUuZmluZCgnLmZvbGRlci10b2dnbGUnKS5yZW1vdmVDbGFzcygncmlnaHQnKS5hZGRDbGFzcygnZG93bicpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBSZXN0b3JlIGNvbGxhcHNlZCBzdGF0ZSB3aGVuIHNlYXJjaCBpcyBjbGVhcmVkXG4gICAgICAgICAgICAgICAgJG1lbnUuZmluZCgnLmZvbGRlci1oZWFkZXInKS5lYWNoKChfLCBmb2xkZXIpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgJGZvbGRlciA9ICQoZm9sZGVyKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZm9sZGVyTmFtZSA9ICRmb2xkZXIuZGF0YSgnZm9sZGVyJyk7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGlzQ29sbGFwc2VkID0gJGZvbGRlci5maW5kKCcuZm9sZGVyLXRvZ2dsZScpLmhhc0NsYXNzKCdyaWdodCcpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoaXNDb2xsYXBzZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRtZW51LmZpbmQoYC5maWxlLWl0ZW1bZGF0YS1wYXJlbnQ9XCIke2ZvbGRlck5hbWV9XCJdYCkuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFeHBhbmRzIHRoZSBmb2xkZXIgY29udGFpbmluZyB0aGUgc3BlY2lmaWVkIGZpbGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZVBhdGggLSBUaGUgZmlsZSBwYXRoIHRvIGZpbmQgYW5kIGV4cGFuZCBpdHMgcGFyZW50IGZvbGRlclxuICAgICAqL1xuICAgIGV4cGFuZEZvbGRlckZvckZpbGUoZmlsZVBhdGgpIHtcbiAgICAgICAgaWYgKCFmaWxlUGF0aCkgcmV0dXJuO1xuXG4gICAgICAgIGNvbnN0ICRtZW51ID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5maW5kKCcubWVudScpO1xuICAgICAgICBjb25zdCAkZmlsZUl0ZW0gPSAkbWVudS5maW5kKGAuZmlsZS1pdGVtW2RhdGEtdmFsdWU9XCIke2ZpbGVQYXRofVwiXWApO1xuXG4gICAgICAgIGlmICgkZmlsZUl0ZW0ubGVuZ3RoKSB7XG4gICAgICAgICAgICBjb25zdCBwYXJlbnRGb2xkZXIgPSAkZmlsZUl0ZW0uZGF0YSgncGFyZW50Jyk7XG4gICAgICAgICAgICBpZiAocGFyZW50Rm9sZGVyKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJGZvbGRlciA9ICRtZW51LmZpbmQoYC5mb2xkZXItaGVhZGVyW2RhdGEtZm9sZGVyPVwiJHtwYXJlbnRGb2xkZXJ9XCJdYCk7XG4gICAgICAgICAgICAgICAgY29uc3QgJHRvZ2dsZSA9ICRmb2xkZXIuZmluZCgnLmZvbGRlci10b2dnbGUnKTtcblxuICAgICAgICAgICAgICAgIC8vIEV4cGFuZCBpZiBjb2xsYXBzZWRcbiAgICAgICAgICAgICAgICBpZiAoJHRvZ2dsZS5oYXNDbGFzcygncmlnaHQnKSkge1xuICAgICAgICAgICAgICAgICAgICAkdG9nZ2xlLnJlbW92ZUNsYXNzKCdyaWdodCcpLmFkZENsYXNzKCdkb3duJyk7XG4gICAgICAgICAgICAgICAgICAgICRtZW51LmZpbmQoYC5maWxlLWl0ZW1bZGF0YS1wYXJlbnQ9XCIke3BhcmVudEZvbGRlcn1cIl1gKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgaGFzaCBjaGFuZ2VzIHRvIHVwZGF0ZSB0aGUgc2VsZWN0ZWQgZmlsZVxuICAgICAqL1xuICAgIGhhbmRsZUhhc2hDaGFuZ2UoKSB7XG4gICAgICAgIC8vIFNraXAgZHVyaW5nIGluaXRpYWxpemF0aW9uIHRvIHByZXZlbnQgZHVwbGljYXRlIEFQSSBjYWxsc1xuICAgICAgICBpZiAoc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNJbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGhhc2ggPSB3aW5kb3cubG9jYXRpb24uaGFzaDtcbiAgICAgICAgaWYgKGhhc2ggJiYgaGFzaC5zdGFydHNXaXRoKCcjZmlsZT0nKSkge1xuICAgICAgICAgICAgY29uc3QgZmlsZVBhdGggPSBkZWNvZGVVUklDb21wb25lbnQoaGFzaC5zdWJzdHJpbmcoNikpO1xuICAgICAgICAgICAgaWYgKGZpbGVQYXRoICYmIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ2dldCB2YWx1ZScpICE9PSBmaWxlUGF0aCkge1xuICAgICAgICAgICAgICAgIC8vIENoZWNrIGlmIHRoZSBmaWxlIGV4aXN0cyBpbiBkcm9wZG93biBpdGVtc1xuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVFeGlzdHMgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXMuc29tZShpdGVtID0+XG4gICAgICAgICAgICAgICAgICAgIGl0ZW0udHlwZSA9PT0gJ2ZpbGUnICYmIGl0ZW0udmFsdWUgPT09IGZpbGVQYXRoXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICBpZiAoZmlsZUV4aXN0cykge1xuICAgICAgICAgICAgICAgICAgICAvLyBFeHBhbmQgcGFyZW50IGZvbGRlciBiZWZvcmUgc2VsZWN0aW5nIGZpbGVcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuZXhwYW5kRm9sZGVyRm9yRmlsZShmaWxlUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGZpbGVQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignc2V0IHRleHQnLCBmaWxlUGF0aCk7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmaWxlbmFtZScsIGZpbGVQYXRoKTtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudXBkYXRlTG9nRnJvbVNlcnZlcigpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIHRoZSBmaWxlIHBhdGggZnJvbSBVUkwgaGFzaCBpZiBwcmVzZW50XG4gICAgICovXG4gICAgZ2V0RmlsZUZyb21IYXNoKCkge1xuICAgICAgICBjb25zdCBoYXNoID0gd2luZG93LmxvY2F0aW9uLmhhc2g7XG4gICAgICAgIGlmIChoYXNoICYmIGhhc2guc3RhcnRzV2l0aCgnI2ZpbGU9JykpIHtcbiAgICAgICAgICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoaGFzaC5zdWJzdHJpbmcoNikpO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gZm9ybWF0IHRoZSBkcm9wZG93biBtZW51IHN0cnVjdHVyZSBiYXNlZCBvbiB0aGUgcmVzcG9uc2UuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGRhdGEuXG4gICAgICovXG4gICAgY2JGb3JtYXREcm9wZG93blJlc3VsdHMocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgcmVzcG9uc2UgaXMgdmFsaWRcbiAgICAgICAgaWYgKCFyZXNwb25zZSB8fCAhcmVzcG9uc2UucmVzdWx0IHx8ICFyZXNwb25zZS5kYXRhIHx8ICFyZXNwb25zZS5kYXRhLmZpbGVzKSB7XG4gICAgICAgICAgICAvLyBIaWRlIGRpbW1lciBvbmx5IGlmIG5vdCBpbiBhdXRvLXVwZGF0ZSBtb2RlXG4gICAgICAgICAgICBpZiAoIXN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZmlsZXMgPSByZXNwb25zZS5kYXRhLmZpbGVzO1xuXG4gICAgICAgIC8vIENoZWNrIGZvciBmaWxlIGZyb20gaGFzaCBmaXJzdFxuICAgICAgICBsZXQgZGVmVmFsID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuZ2V0RmlsZUZyb21IYXNoKCk7XG5cbiAgICAgICAgLy8gSWYgbm8gaGFzaCB2YWx1ZSwgY2hlY2sgaWYgdGhlcmUgaXMgYSBkZWZhdWx0IHZhbHVlIHNldCBmb3IgdGhlIGZpbGVuYW1lIGlucHV0IGZpZWxkXG4gICAgICAgIGlmICghZGVmVmFsKSB7XG4gICAgICAgICAgICBjb25zdCBmaWxlTmFtZSA9IHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmaWxlbmFtZScpO1xuICAgICAgICAgICAgaWYgKGZpbGVOYW1lICE9PSAnJykge1xuICAgICAgICAgICAgICAgIGRlZlZhbCA9IGZpbGVOYW1lLnRyaW0oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEJ1aWxkIHRyZWUgc3RydWN0dXJlIGZyb20gZmlsZXNcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9nc0l0ZW1zID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuYnVpbGRUcmVlU3RydWN0dXJlKGZpbGVzLCBkZWZWYWwpO1xuXG4gICAgICAgIC8vIENyZWF0ZSB2YWx1ZXMgYXJyYXkgZm9yIGRyb3Bkb3duIHdpdGggYWxsIGl0ZW1zIChpbmNsdWRpbmcgZm9sZGVycylcbiAgICAgICAgY29uc3QgZHJvcGRvd25WYWx1ZXMgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXMubWFwKChpdGVtLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgaWYgKGl0ZW0udHlwZSA9PT0gJ2ZvbGRlcicpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBuYW1lOiBpdGVtLm5hbWUucmVwbGFjZSgvPFtePl0qPi9nLCAnJyksIC8vIFJlbW92ZSBIVE1MIHRhZ3MgZm9yIHNlYXJjaFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJycsXG4gICAgICAgICAgICAgICAgICAgIGRpc2FibGVkOiB0cnVlXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogaXRlbS5uYW1lLnJlcGxhY2UoLzxbXj5dKj4vZywgJycpLCAvLyBSZW1vdmUgSFRNTCB0YWdzIGZvciBzZWFyY2hcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGl0ZW0udmFsdWUsXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkOiBpdGVtLnNlbGVjdGVkXG4gICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgZHJvcGRvd24gd2l0aCB2YWx1ZXNcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignc2V0dXAgbWVudScsIHtcbiAgICAgICAgICAgIHZhbHVlczogZHJvcGRvd25WYWx1ZXNcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IHRoZSBkZWZhdWx0IHNlbGVjdGVkIHZhbHVlIGlmIGFueVxuICAgICAgICBjb25zdCBzZWxlY3RlZEl0ZW0gPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2dzSXRlbXMuZmluZChpdGVtID0+IGl0ZW0uc2VsZWN0ZWQpO1xuICAgICAgICBpZiAoc2VsZWN0ZWRJdGVtKSB7XG4gICAgICAgICAgICAvLyBVc2Ugc2V0VGltZW91dCB0byBlbnN1cmUgZHJvcGRvd24gaXMgZnVsbHkgaW5pdGlhbGl6ZWRcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEV4cGFuZCBwYXJlbnQgZm9sZGVyIGJlZm9yZSBzZWxlY3RpbmcgZmlsZVxuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmV4cGFuZEZvbGRlckZvckZpbGUoc2VsZWN0ZWRJdGVtLnZhbHVlKTtcbiAgICAgICAgICAgICAgICAvLyBTZXR0aW5nIHNlbGVjdGVkIHZhbHVlIHdpbGwgdHJpZ2dlciBvbkNoYW5nZSBjYWxsYmFjayB3aGljaCBjYWxscyB1cGRhdGVMb2dGcm9tU2VydmVyKClcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBzZWxlY3RlZEl0ZW0udmFsdWUpO1xuICAgICAgICAgICAgICAgIC8vIEZvcmNlIHJlZnJlc2ggdGhlIGRyb3Bkb3duIHRvIHNob3cgdGhlIHNlbGVjdGVkIHZhbHVlXG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bigncmVmcmVzaCcpO1xuICAgICAgICAgICAgICAgIC8vIEFsc28gc2V0IHRoZSB0ZXh0IHRvIHNob3cgZnVsbCBwYXRoXG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZpbGVTZWxlY3REcm9wRG93bi5kcm9wZG93bignc2V0IHRleHQnLCBzZWxlY3RlZEl0ZW0udmFsdWUpO1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmaWxlbmFtZScsIHNlbGVjdGVkSXRlbS52YWx1ZSk7XG4gICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICB9IGVsc2UgaWYgKGRlZlZhbCkge1xuICAgICAgICAgICAgLy8gSWYgd2UgaGF2ZSBhIGRlZmF1bHQgdmFsdWUgYnV0IG5vIGl0ZW0gd2FzIG1hcmtlZCBhcyBzZWxlY3RlZCxcbiAgICAgICAgICAgIC8vIHRyeSB0byBmaW5kIGFuZCBzZWxlY3QgaXQgbWFudWFsbHlcbiAgICAgICAgICAgIGNvbnN0IGl0ZW1Ub1NlbGVjdCA9IHN5c3RlbURpYWdub3N0aWNMb2dzLmxvZ3NJdGVtcy5maW5kKGl0ZW0gPT5cbiAgICAgICAgICAgICAgICBpdGVtLnR5cGUgPT09ICdmaWxlJyAmJiBpdGVtLnZhbHVlID09PSBkZWZWYWxcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBpZiAoaXRlbVRvU2VsZWN0KSB7XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEV4cGFuZCBwYXJlbnQgZm9sZGVyIGJlZm9yZSBzZWxlY3RpbmcgZmlsZVxuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5leHBhbmRGb2xkZXJGb3JGaWxlKGl0ZW1Ub1NlbGVjdC52YWx1ZSk7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNldHRpbmcgc2VsZWN0ZWQgdmFsdWUgd2lsbCB0cmlnZ2VyIG9uQ2hhbmdlIGNhbGxiYWNrIHdoaWNoIGNhbGxzIHVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKVxuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBpdGVtVG9TZWxlY3QudmFsdWUpO1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZmlsZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdyZWZyZXNoJyk7XG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldCB0ZXh0JywgaXRlbVRvU2VsZWN0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2ZpbGVuYW1lJywgaXRlbVRvU2VsZWN0LnZhbHVlKTtcbiAgICAgICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBIaWRlIHRoZSBkaW1tZXIgYWZ0ZXIgbG9hZGluZyBvbmx5IGlmIG5vIGZpbGUgaXMgc2VsZWN0ZWRcbiAgICAgICAgICAgICAgICBpZiAoIXN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBIaWRlIHRoZSBkaW1tZXIgYWZ0ZXIgbG9hZGluZyBvbmx5IGlmIG5vIGZpbGUgaXMgc2VsZWN0ZWRcbiAgICAgICAgICAgIGlmICghc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBNYXJrIGluaXRpYWxpemF0aW9uIGFzIGNvbXBsZXRlIHRvIGFsbG93IGhhc2hjaGFuZ2UgaGFuZGxlciB0byB3b3JrXG4gICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNJbml0aWFsaXppbmcgPSBmYWxzZTtcbiAgICAgICAgfSwgMjAwKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgY2hhbmdpbmcgdGhlIGxvZyBmaWxlIGluIHRoZSBzZWxlY3QgZHJvcGRvd24uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHNlbGVjdGVkIHZhbHVlLlxuICAgICAqL1xuICAgIGNiT25DaGFuZ2VGaWxlKHZhbHVlKSB7XG4gICAgICAgIGlmICh2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFNldCBkcm9wZG93biB0ZXh0IHRvIHNob3cgdGhlIGZ1bGwgZmlsZSBwYXRoXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmaWxlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldCB0ZXh0JywgdmFsdWUpO1xuXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmaWxlbmFtZScsIHZhbHVlKTtcblxuICAgICAgICAvLyBVcGRhdGUgVVJMIGhhc2ggd2l0aCB0aGUgc2VsZWN0ZWQgZmlsZVxuICAgICAgICB3aW5kb3cubG9jYXRpb24uaGFzaCA9ICdmaWxlPScgKyBlbmNvZGVVUklDb21wb25lbnQodmFsdWUpO1xuXG4gICAgICAgIC8vIFJlc2V0IGZpbHRlcnMgb25seSBpZiB1c2VyIG1hbnVhbGx5IGNoYW5nZWQgdGhlIGZpbGUgKG5vdCBkdXJpbmcgaW5pdGlhbGl6YXRpb24pXG4gICAgICAgIGlmICghc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNJbml0aWFsaXppbmcpIHtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnJlc2V0RmlsdGVycygpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSGlkZSBhdXRvLXJlZnJlc2ggYnV0dG9uIGZvciByb3RhdGVkIGxvZyBmaWxlcyAodGhleSBkb24ndCBjaGFuZ2UpXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnVwZGF0ZUF1dG9SZWZyZXNoVmlzaWJpbGl0eSh2YWx1ZSk7XG5cbiAgICAgICAgLy8gUmVzZXQgbGFzdCBrbm93biBkYXRhIGVuZCBmb3IgbmV3IGZpbGVcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MubGFzdEtub3duRGF0YUVuZCA9IG51bGw7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgdGltZSByYW5nZSBpcyBhdmFpbGFibGUgZm9yIHRoaXMgZmlsZVxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jaGVja1RpbWVSYW5nZUF2YWlsYWJpbGl0eSh2YWx1ZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrIGlmIGZpbGUgaXMgYSByb3RhdGVkIGxvZyBmaWxlIChhcmNoaXZlZCwgbm8gbG9uZ2VyIGJlaW5nIHdyaXR0ZW4gdG8pXG4gICAgICogUm90YXRlZCBmaWxlcyBoYXZlIHN1ZmZpeGVzIGxpa2U6IC4wLCAuMSwgLjIsIC5neiwgLjEuZ3osIC4yLmd6LCBldGMuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVuYW1lIC0gTG9nIGZpbGUgcGF0aFxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSBUcnVlIGlmIGZpbGUgaXMgcm90YXRlZC9hcmNoaXZlZFxuICAgICAqL1xuICAgIGlzUm90YXRlZExvZ0ZpbGUoZmlsZW5hbWUpIHtcbiAgICAgICAgaWYgKCFmaWxlbmFtZSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIC8vIE1hdGNoIHBhdHRlcm5zOiAuMCwgLjEsIC4yLCAuLi4sIC5neiwgLjAuZ3osIC4xLmd6LCBldGMuXG4gICAgICAgIHJldHVybiAvXFwuXFxkKygkfFxcLmd6JCl8XFwuZ3okLy50ZXN0KGZpbGVuYW1lKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGF1dG8tcmVmcmVzaCBidXR0b24gdmlzaWJpbGl0eSBiYXNlZCBvbiBmaWxlIHR5cGVcbiAgICAgKiBIaWRlIGZvciByb3RhdGVkIGZpbGVzLCBzaG93IGZvciBhY3RpdmUgbG9nIGZpbGVzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVuYW1lIC0gTG9nIGZpbGUgcGF0aFxuICAgICAqL1xuICAgIHVwZGF0ZUF1dG9SZWZyZXNoVmlzaWJpbGl0eShmaWxlbmFtZSkge1xuICAgICAgICBjb25zdCAkYXV0b0J0biA9ICQoJyNzaG93LWxhc3QtbG9nLWF1dG8nKTtcbiAgICAgICAgY29uc3QgaXNSb3RhdGVkID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNSb3RhdGVkTG9nRmlsZShmaWxlbmFtZSk7XG5cbiAgICAgICAgaWYgKGlzUm90YXRlZCkge1xuICAgICAgICAgICAgLy8gU3RvcCBhdXRvLXJlZnJlc2ggaWYgaXQgd2FzIGFjdGl2ZVxuICAgICAgICAgICAgaWYgKHN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgICAgICRhdXRvQnRuLmZpbmQoJy5pY29ucyBpLnJlZnJlc2gnKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHVwZGF0ZUxvZ1ZpZXdXb3JrZXIuc3RvcCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgJGF1dG9CdG4uaGlkZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJGF1dG9CdG4uc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3cgZmlsdGVyIHR5cGUgcG9wdXAgYmVsb3cgdGhlIGZpbHRlciBpbnB1dC5cbiAgICAgKiBQcmUtc2VsZWN0cyB0aGUgZmlyc3Qgb3B0aW9uIGZvciBpbW1lZGlhdGUga2V5Ym9hcmQgbmF2aWdhdGlvbi5cbiAgICAgKi9cbiAgICBzaG93RmlsdGVyVHlwZVBvcHVwKCkge1xuICAgICAgICBjb25zdCAkcG9wdXAgPSAkKCcjZmlsdGVyLXR5cGUtcG9wdXAnKTtcbiAgICAgICAgJHBvcHVwLnJlbW92ZUNsYXNzKCdoaWRkZW4nKVxuICAgICAgICAgICAgLmNzcyh7dG9wOiAnJywgbGVmdDogJycsIGRpc3BsYXk6ICcnfSlcbiAgICAgICAgICAgIC5zaG93KCk7XG4gICAgICAgIC8vIFByZS1zZWxlY3QgZmlyc3Qgb3B0aW9uIGZvciBrZXlib2FyZCBuYXZpZ2F0aW9uXG4gICAgICAgICRwb3B1cC5maW5kKCcuZmlsdGVyLXR5cGUtb3B0aW9uJykucmVtb3ZlQ2xhc3MoJ2ZvY3VzZWQnKTtcbiAgICAgICAgJHBvcHVwLmZpbmQoJy5maWx0ZXItdHlwZS1vcHRpb24nKS5maXJzdCgpLmFkZENsYXNzKCdmb2N1c2VkJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhpZGUgdGhlIGZpbHRlciB0eXBlIHBvcHVwXG4gICAgICovXG4gICAgaGlkZUZpbHRlclR5cGVQb3B1cCgpIHtcbiAgICAgICAgY29uc3QgJHBvcHVwID0gJCgnI2ZpbHRlci10eXBlLXBvcHVwJyk7XG4gICAgICAgICRwb3B1cC5maW5kKCcuZmlsdGVyLXR5cGUtb3B0aW9uJykucmVtb3ZlQ2xhc3MoJ2ZvY3VzZWQnKTtcbiAgICAgICAgJHBvcHVwLmFkZENsYXNzKCdoaWRkZW4nKS5oaWRlKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIE5hdmlnYXRlIGZpbHRlciB0eXBlIHBvcHVwIG9wdGlvbnMgd2l0aCBhcnJvdyBrZXlzLlxuICAgICAqIFdyYXBzIGFyb3VuZCBhdCBib3VuZGFyaWVzLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBkaXJlY3Rpb24gLSAxIGZvciBkb3duLCAtMSBmb3IgdXBcbiAgICAgKi9cbiAgICBuYXZpZ2F0ZUZpbHRlclBvcHVwKGRpcmVjdGlvbikge1xuICAgICAgICBjb25zdCAkcG9wdXAgPSAkKCcjZmlsdGVyLXR5cGUtcG9wdXAnKTtcbiAgICAgICAgY29uc3QgJG9wdGlvbnMgPSAkcG9wdXAuZmluZCgnLmZpbHRlci10eXBlLW9wdGlvbicpO1xuICAgICAgICBjb25zdCAkZm9jdXNlZCA9ICRvcHRpb25zLmZpbHRlcignLmZvY3VzZWQnKTtcblxuICAgICAgICBsZXQgaW5kZXggPSAkb3B0aW9ucy5pbmRleCgkZm9jdXNlZCk7XG4gICAgICAgIGluZGV4ICs9IGRpcmVjdGlvbjtcblxuICAgICAgICAvLyBXcmFwIGFyb3VuZFxuICAgICAgICBpZiAoaW5kZXggPCAwKSB7XG4gICAgICAgICAgICBpbmRleCA9ICRvcHRpb25zLmxlbmd0aCAtIDE7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGluZGV4ID49ICRvcHRpb25zLmxlbmd0aCkge1xuICAgICAgICAgICAgaW5kZXggPSAwO1xuICAgICAgICB9XG5cbiAgICAgICAgJG9wdGlvbnMucmVtb3ZlQ2xhc3MoJ2ZvY3VzZWQnKTtcbiAgICAgICAgJG9wdGlvbnMuZXEoaW5kZXgpLmFkZENsYXNzKCdmb2N1c2VkJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkZCBhIGZpbHRlciBjb25kaXRpb24sIHN5bmMgdG8gZm9ybSwgcmVuZGVyIGxhYmVscywgYW5kIHJlbG9hZCBsb2dcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdHlwZSAtICdjb250YWlucycgb3IgJ25vdENvbnRhaW5zJ1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIHRoZSBmaWx0ZXIgdGV4dFxuICAgICAqL1xuICAgIGFkZEZpbHRlckNvbmRpdGlvbih0eXBlLCB2YWx1ZSkge1xuICAgICAgICBpZiAoIXZhbHVlIHx8IHZhbHVlLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5maWx0ZXJDb25kaXRpb25zLnB1c2goe3R5cGUsIHZhbHVlOiB2YWx1ZS50cmltKCl9KTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Muc3luY0ZpbHRlckNvbmRpdGlvbnNUb0Zvcm0oKTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MucmVuZGVyRmlsdGVyTGFiZWxzKCk7XG4gICAgICAgICQoJyNmaWx0ZXItaW5wdXQnKS52YWwoJycpO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy51cGRhdGVMb2dGcm9tU2VydmVyKHRydWUpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZW1vdmUgYSBmaWx0ZXIgY29uZGl0aW9uIGJ5IGluZGV4XG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGluZGV4IC0gY29uZGl0aW9uIGluZGV4IHRvIHJlbW92ZVxuICAgICAqL1xuICAgIHJlbW92ZUZpbHRlckNvbmRpdGlvbihpbmRleCkge1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5maWx0ZXJDb25kaXRpb25zLnNwbGljZShpbmRleCwgMSk7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnN5bmNGaWx0ZXJDb25kaXRpb25zVG9Gb3JtKCk7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLnJlbmRlckZpbHRlckxhYmVscygpO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy51cGRhdGVMb2dGcm9tU2VydmVyKHRydWUpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDbGVhciBhbGwgZmlsdGVyIGNvbmRpdGlvbnNcbiAgICAgKi9cbiAgICBjbGVhckFsbEZpbHRlckNvbmRpdGlvbnMoKSB7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmZpbHRlckNvbmRpdGlvbnMgPSBbXTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Muc3luY0ZpbHRlckNvbmRpdGlvbnNUb0Zvcm0oKTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MucmVuZGVyRmlsdGVyTGFiZWxzKCk7XG4gICAgICAgICQoJyNmaWx0ZXItaW5wdXQnKS52YWwoJycpO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy51cGRhdGVMb2dGcm9tU2VydmVyKHRydWUpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXJpYWxpemUgZmlsdGVyQ29uZGl0aW9ucyBhcnJheSBhcyBKU09OIGludG8gaGlkZGVuICNmaWx0ZXIgZmllbGRcbiAgICAgKi9cbiAgICBzeW5jRmlsdGVyQ29uZGl0aW9uc1RvRm9ybSgpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy5maWx0ZXJDb25kaXRpb25zLmxlbmd0aCA+IDBcbiAgICAgICAgICAgID8gSlNPTi5zdHJpbmdpZnkoc3lzdGVtRGlhZ25vc3RpY0xvZ3MuZmlsdGVyQ29uZGl0aW9ucylcbiAgICAgICAgICAgIDogJyc7XG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdmaWx0ZXInLCB2YWx1ZSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbmRlciBsYWJlbCBjaGlwcyBpbnNpZGUgI2ZpbHRlci1sYWJlbHMgZnJvbSBmaWx0ZXJDb25kaXRpb25zXG4gICAgICovXG4gICAgcmVuZGVyRmlsdGVyTGFiZWxzKCkge1xuICAgICAgICBjb25zdCAkY29udGFpbmVyID0gJCgnI2ZpbHRlci1sYWJlbHMnKTtcbiAgICAgICAgJGNvbnRhaW5lci5lbXB0eSgpO1xuXG4gICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmZpbHRlckNvbmRpdGlvbnMuZm9yRWFjaCgoY29uZGl0aW9uLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY3NzQ2xhc3MgPSBjb25kaXRpb24udHlwZSA9PT0gJ25vdENvbnRhaW5zJyA/ICdub3QtY29udGFpbnMnIDogJ2NvbnRhaW5zJztcbiAgICAgICAgICAgIGNvbnN0IGljb25DbGFzcyA9IGNvbmRpdGlvbi50eXBlID09PSAnbm90Q29udGFpbnMnID8gJ2JhbicgOiAnY2hlY2sgY2lyY2xlJztcbiAgICAgICAgICAgIGNvbnN0IGljb25Db2xvciA9IGNvbmRpdGlvbi50eXBlID09PSAnbm90Q29udGFpbnMnID8gJ3JlZCcgOiAndGVhbCc7XG4gICAgICAgICAgICBjb25zdCAkbGFiZWwgPSAkKGA8c3BhbiBjbGFzcz1cImZpbHRlci1jb25kaXRpb24tbGFiZWwgJHtjc3NDbGFzc31cIiBkYXRhLWluZGV4PVwiJHtpbmRleH1cIj48L3NwYW4+YCk7XG4gICAgICAgICAgICAkbGFiZWwuYXBwZW5kKGA8aSBjbGFzcz1cIiR7aWNvbkNsYXNzfSBpY29uICR7aWNvbkNvbG9yfVwiPjwvaT5gKTtcbiAgICAgICAgICAgICRsYWJlbC5hcHBlbmQoYDxzcGFuPiR7JCgnPHNwYW4+JykudGV4dChjb25kaXRpb24udmFsdWUpLmh0bWwoKX08L3NwYW4+YCk7XG4gICAgICAgICAgICAkbGFiZWwuYXBwZW5kKCc8aSBjbGFzcz1cImRlbGV0ZSBpY29uXCI+PC9pPicpO1xuICAgICAgICAgICAgJGNvbnRhaW5lci5hcHBlbmQoJGxhYmVsKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZmlsdGVyIGNvbmRpdGlvbnMgZnJvbSBVUkwgcGFyYW1ldGVyIG9yIGV4aXN0aW5nIGhpZGRlbiBmaWVsZCB2YWx1ZS5cbiAgICAgKiBIYW5kbGVzIGxlZ2FjeSBwbGFpbi1zdHJpbmcgZm9ybWF0IChlLmcuIFwiW0MtMDAwMDQ3MjFdJltDLTAwMDA0NzIzXVwiIGZyb20gQ0RSIGxpbmtzKVxuICAgICAqIGJ5IGNvbnZlcnRpbmcgJi1zZXBhcmF0ZWQgcGFydHMgaW50byBpbmRpdmlkdWFsIFwiY29udGFpbnNcIiBjb25kaXRpb25zLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVGaWx0ZXJGcm9tVXJsKCkge1xuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICBjb25zdCBmaWx0ZXJQYXJhbSA9IHVybFBhcmFtcy5nZXQoJ2ZpbHRlcicpO1xuXG4gICAgICAgIGlmIChmaWx0ZXJQYXJhbSAmJiBmaWx0ZXJQYXJhbS50cmltKCkgIT09ICcnKSB7XG4gICAgICAgICAgICBjb25zdCB0cmltbWVkID0gZmlsdGVyUGFyYW0udHJpbSgpO1xuXG4gICAgICAgICAgICAvLyBDaGVjayBpZiBpdCdzIEpTT04gZm9ybWF0XG4gICAgICAgICAgICBpZiAodHJpbW1lZC5zdGFydHNXaXRoKCdbJykpIHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKHRyaW1tZWQpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShwYXJzZWQpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5maWx0ZXJDb25kaXRpb25zID0gcGFyc2VkLmZpbHRlcihcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoYykgPT4gYyAmJiBjLnZhbHVlICYmIGMudHlwZVxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSW52YWxpZCBKU09OLCB0cmVhdCBhcyBsZWdhY3lcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuZmlsdGVyQ29uZGl0aW9ucyA9IHRyaW1tZWRcbiAgICAgICAgICAgICAgICAgICAgICAgIC5zcGxpdCgnJicpXG4gICAgICAgICAgICAgICAgICAgICAgICAubWFwKChwKSA9PiBwLnRyaW0oKSlcbiAgICAgICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoKHApID0+IHAgIT09ICcnKVxuICAgICAgICAgICAgICAgICAgICAgICAgLm1hcCgocCkgPT4gKHt0eXBlOiAnY29udGFpbnMnLCB2YWx1ZTogcH0pKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIExlZ2FjeSBwbGFpbiBzdHJpbmc6IHNwbGl0IGJ5ICYgaW50byBjb250YWlucyBjb25kaXRpb25zXG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuZmlsdGVyQ29uZGl0aW9ucyA9IHRyaW1tZWRcbiAgICAgICAgICAgICAgICAgICAgLnNwbGl0KCcmJylcbiAgICAgICAgICAgICAgICAgICAgLm1hcCgocCkgPT4gcC50cmltKCkpXG4gICAgICAgICAgICAgICAgICAgIC5maWx0ZXIoKHApID0+IHAgIT09ICcnKVxuICAgICAgICAgICAgICAgICAgICAubWFwKChwKSA9PiAoe3R5cGU6ICdjb250YWlucycsIHZhbHVlOiBwfSkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5zeW5jRmlsdGVyQ29uZGl0aW9uc1RvRm9ybSgpO1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MucmVuZGVyRmlsdGVyTGFiZWxzKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVzZXQgYWxsIGZpbHRlcnMgd2hlbiBjaGFuZ2luZyBsb2cgZmlsZXNcbiAgICAgKi9cbiAgICByZXNldEZpbHRlcnMoKSB7XG4gICAgICAgIC8vIERlYWN0aXZhdGUgYWxsIHF1aWNrLXBlcmlvZCBidXR0b25zXG4gICAgICAgICQoJy5wZXJpb2QtYnRuJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuXG4gICAgICAgIC8vIFJlc2V0IGxvZ0xldmVsIGRyb3Bkb3duIHRvIGRlZmF1bHQgKEFsbCBMZXZlbHMgLSBlbXB0eSB2YWx1ZSlcbiAgICAgICAgJCgnI2xvZ0xldmVsLWRyb3Bkb3duJykuZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsICcnKTtcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2xvZ0xldmVsJywgJycpO1xuXG4gICAgICAgIC8vIE5PVEU6IEZpbHRlciBjb25kaXRpb25zIGFyZSBpbnRlbnRpb25hbGx5IHByZXNlcnZlZCB3aGVuIGNoYW5naW5nIGZpbGVzLlxuICAgICAgICAvLyBXaGVuIHVzZXIgbmF2aWdhdGVzIGZyb20gQ0RSIHdpdGggZmlsdGVyIHBhcmFtcyAoZS5nLiA/ZmlsdGVyPVtDLTAwMDA0NzIxXSksXG4gICAgICAgIC8vIHRoZSBmaWx0ZXJzIHNob3VsZCBwZXJzaXN0IGFjcm9zcyBmaWxlIGNoYW5nZXMgKHZlcmJvc2Ug4oaSIHZlcmJvc2UuMCkuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBwZXJpb2QgYnV0dG9ucyB2aXNpYmlsaXR5IGJhc2VkIG9uIGxvZyBmaWxlIGR1cmF0aW9uXG4gICAgICogU2hvd3Mgb25seSBidXR0b25zIGZvciBwZXJpb2RzIHRoYXQgYXJlIDw9IGxvZyBmaWxlIGR1cmF0aW9uXG4gICAgICogSGlkZXMgZW50aXJlIGNvbnRhaW5lciBpZiBubyBidXR0b25zIGFyZSB2aXNpYmxlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGxvZ0R1cmF0aW9uIC0gTG9nIGZpbGUgZHVyYXRpb24gaW4gc2Vjb25kc1xuICAgICAqL1xuICAgIHVwZGF0ZVBlcmlvZEJ1dHRvbnNWaXNpYmlsaXR5KGxvZ0R1cmF0aW9uKSB7XG4gICAgICAgIGNvbnN0ICRwZXJpb2RCdXR0b25zID0gJCgnLnBlcmlvZC1idG4nKTtcbiAgICAgICAgY29uc3QgJHBlcmlvZENvbnRhaW5lciA9ICQoJyNwZXJpb2QtYnV0dG9ucycpO1xuICAgICAgICBsZXQgbGFyZ2VzdFZpc2libGVQZXJpb2QgPSAwO1xuICAgICAgICBsZXQgJGxhcmdlc3RWaXNpYmxlQnV0dG9uID0gbnVsbDtcbiAgICAgICAgbGV0IHZpc2libGVDb3VudCA9IDA7XG5cbiAgICAgICAgJHBlcmlvZEJ1dHRvbnMuZWFjaCgoaW5kZXgsIGJ1dHRvbikgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGJ1dHRvbiA9ICQoYnV0dG9uKTtcbiAgICAgICAgICAgIGNvbnN0IHBlcmlvZCA9IHBhcnNlSW50KCRidXR0b24uZGF0YSgncGVyaW9kJyksIDEwKTtcblxuICAgICAgICAgICAgLy8gU2hvdyBidXR0b24gaWYgcGVyaW9kIGlzIGxlc3MgdGhhbiBvciBlcXVhbCB0byBsb2cgZHVyYXRpb25cbiAgICAgICAgICAgIC8vIEFkZCAxMCUgdG9sZXJhbmNlIGZvciByb3VuZGluZy9lZGdlIGNhc2VzXG4gICAgICAgICAgICBpZiAocGVyaW9kIDw9IGxvZ0R1cmF0aW9uICogMS4xKSB7XG4gICAgICAgICAgICAgICAgJGJ1dHRvbi5zaG93KCk7XG4gICAgICAgICAgICAgICAgdmlzaWJsZUNvdW50Kys7XG4gICAgICAgICAgICAgICAgLy8gVHJhY2sgdGhlIGxhcmdlc3QgdmlzaWJsZSBwZXJpb2QgZm9yIGRlZmF1bHQgc2VsZWN0aW9uXG4gICAgICAgICAgICAgICAgaWYgKHBlcmlvZCA+IGxhcmdlc3RWaXNpYmxlUGVyaW9kKSB7XG4gICAgICAgICAgICAgICAgICAgIGxhcmdlc3RWaXNpYmxlUGVyaW9kID0gcGVyaW9kO1xuICAgICAgICAgICAgICAgICAgICAkbGFyZ2VzdFZpc2libGVCdXR0b24gPSAkYnV0dG9uO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJGJ1dHRvbi5oaWRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhpZGUgZW50aXJlIGNvbnRhaW5lciBpZiBubyBidXR0b25zIGFyZSB2aXNpYmxlXG4gICAgICAgIC8vIEFsc28gdG9nZ2xlIGNsYXNzIG9uIHBhcmVudCB0byByZW1vdmUgZ2FwIGZvciBwcm9wZXIgYWxpZ25tZW50XG4gICAgICAgIGNvbnN0ICR0aW1lQ29udHJvbHNJbmxpbmUgPSAkKCcudGltZS1jb250cm9scy1pbmxpbmUnKTtcbiAgICAgICAgaWYgKHZpc2libGVDb3VudCA9PT0gMCkge1xuICAgICAgICAgICAgJHBlcmlvZENvbnRhaW5lci5oaWRlKCk7XG4gICAgICAgICAgICAkdGltZUNvbnRyb2xzSW5saW5lLmFkZENsYXNzKCduby1wZXJpb2QtYnV0dG9ucycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJHBlcmlvZENvbnRhaW5lci5zaG93KCk7XG4gICAgICAgICAgICAkdGltZUNvbnRyb2xzSW5saW5lLnJlbW92ZUNsYXNzKCduby1wZXJpb2QtYnV0dG9ucycpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gU2V0IGxhcmdlc3QgdmlzaWJsZSBidXR0b24gYXMgYWN0aXZlIChpZiBubyBidXR0b24gaXMgY3VycmVudGx5IGFjdGl2ZSlcbiAgICAgICAgaWYgKCRsYXJnZXN0VmlzaWJsZUJ1dHRvbiAmJiAhJHBlcmlvZEJ1dHRvbnMuZmlsdGVyKCcuYWN0aXZlJykuaXMoJzp2aXNpYmxlJykpIHtcbiAgICAgICAgICAgICRwZXJpb2RCdXR0b25zLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgICRsYXJnZXN0VmlzaWJsZUJ1dHRvbi5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgdGltZSByYW5nZSBpcyBhdmFpbGFibGUgZm9yIHRoZSBzZWxlY3RlZCBsb2cgZmlsZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlbmFtZSAtIExvZyBmaWxlIHBhdGhcbiAgICAgKi9cbiAgICBjaGVja1RpbWVSYW5nZUF2YWlsYWJpbGl0eShmaWxlbmFtZSkge1xuICAgICAgICAvLyBTaG93IGRpbW1lciBvbmx5IGlmIG5vdCBpbiBhdXRvLXVwZGF0ZSBtb2RlXG4gICAgICAgIGlmICghc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlKSB7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBUcnkgdG8gZ2V0IHRpbWUgcmFuZ2UgZm9yIHRoaXMgZmlsZVxuICAgICAgICAgICAgU3lzbG9nQVBJLmdldExvZ1RpbWVSYW5nZShmaWxlbmFtZSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEudGltZV9yYW5nZSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBUaW1lIHJhbmdlIGlzIGF2YWlsYWJsZSAtIHVzZSB0aW1lLWJhc2VkIG5hdmlnYXRpb25cbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaW5pdGlhbGl6ZU5hdmlnYXRpb24ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVGltZSByYW5nZSBub3QgYXZhaWxhYmxlIC0gdXNlIGxpbmUgbnVtYmVyIGZhbGxiYWNrXG4gICAgICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmluaXRpYWxpemVOYXZpZ2F0aW9uKG51bGwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgY2hlY2tpbmcgdGltZSByYW5nZTonLCBlcnJvcik7XG4gICAgICAgICAgICAvLyBGYWxsYmFjayB0byBsaW5lIG51bWJlciBtb2RlXG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5pbml0aWFsaXplTmF2aWdhdGlvbihudWxsKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHVuaXZlcnNhbCBuYXZpZ2F0aW9uIHdpdGggdGltZSBvciBsaW5lIG51bWJlciBtb2RlXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHRpbWVSYW5nZURhdGEgLSBUaW1lIHJhbmdlIGRhdGEgZnJvbSBBUEkgKG9wdGlvbmFsKVxuICAgICAqL1xuICAgIGluaXRpYWxpemVOYXZpZ2F0aW9uKHRpbWVSYW5nZURhdGEpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgd2UgaGF2ZSB2YWxpZCB0aW1lIHJhbmdlIHdpdGggYWN0dWFsIHRpbWVzdGFtcHMgKG5vdCBudWxsKVxuICAgICAgICBjb25zdCBoYXNWYWxpZFRpbWVSYW5nZSA9IHRpbWVSYW5nZURhdGEgJiZcbiAgICAgICAgICAgIHRpbWVSYW5nZURhdGEudGltZV9yYW5nZSAmJlxuICAgICAgICAgICAgdHlwZW9mIHRpbWVSYW5nZURhdGEudGltZV9yYW5nZS5zdGFydCA9PT0gJ251bWJlcicgJiZcbiAgICAgICAgICAgIHR5cGVvZiB0aW1lUmFuZ2VEYXRhLnRpbWVfcmFuZ2UuZW5kID09PSAnbnVtYmVyJztcblxuICAgICAgICAvLyBDaGVjayBpZiB0aW1lIHJhbmdlIGlzIG1lYW5pbmdmdWwgKG1vcmUgdGhhbiAxIHNlY29uZCBvZiBkYXRhKVxuICAgICAgICBjb25zdCBoYXNNdWx0aXBsZVRpbWVzdGFtcHMgPSBoYXNWYWxpZFRpbWVSYW5nZSAmJlxuICAgICAgICAgICAgKHRpbWVSYW5nZURhdGEudGltZV9yYW5nZS5lbmQgLSB0aW1lUmFuZ2VEYXRhLnRpbWVfcmFuZ2Uuc3RhcnQpID4gMTtcblxuICAgICAgICBpZiAoaGFzVmFsaWRUaW1lUmFuZ2UgJiYgaGFzTXVsdGlwbGVUaW1lc3RhbXBzKSB7XG4gICAgICAgICAgICAvLyBUaW1lLWJhc2VkIG1vZGVcbiAgICAgICAgICAgIHRoaXMudGltZVNsaWRlckVuYWJsZWQgPSB0cnVlO1xuICAgICAgICAgICAgdGhpcy5jdXJyZW50VGltZVJhbmdlID0gdGltZVJhbmdlRGF0YS50aW1lX3JhbmdlO1xuXG4gICAgICAgICAgICAvLyBDYWxjdWxhdGUgbG9nIGZpbGUgZHVyYXRpb24gYW5kIHVwZGF0ZSBwZXJpb2QgYnV0dG9ucyB2aXNpYmlsaXR5XG4gICAgICAgICAgICBjb25zdCBsb2dEdXJhdGlvbiA9IHRoaXMuY3VycmVudFRpbWVSYW5nZS5lbmQgLSB0aGlzLmN1cnJlbnRUaW1lUmFuZ2Uuc3RhcnQ7XG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVBlcmlvZEJ1dHRvbnNWaXNpYmlsaXR5KGxvZ0R1cmF0aW9uKTtcblxuICAgICAgICAgICAgLy8gU2hvdyBwZXJpb2QgYnV0dG9ucyBmb3IgdGltZS1iYXNlZCBuYXZpZ2F0aW9uXG4gICAgICAgICAgICAkKCcjcGVyaW9kLWJ1dHRvbnMnKS5zaG93KCk7XG5cbiAgICAgICAgICAgIC8vIFNldCBzZXJ2ZXIgdGltZXpvbmUgb2Zmc2V0XG4gICAgICAgICAgICBpZiAodGltZVJhbmdlRGF0YS5zZXJ2ZXJfdGltZXpvbmVfb2Zmc2V0ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICBTVkdUaW1lbGluZS5zZXJ2ZXJUaW1lem9uZU9mZnNldCA9IHRpbWVSYW5nZURhdGEuc2VydmVyX3RpbWV6b25lX29mZnNldDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBTVkcgdGltZWxpbmUgd2l0aCB0aW1lIHJhbmdlXG4gICAgICAgICAgICBTVkdUaW1lbGluZS5pbml0aWFsaXplKCcjdGltZS1zbGlkZXItY29udGFpbmVyJywgdGhpcy5jdXJyZW50VGltZVJhbmdlKTtcblxuICAgICAgICAgICAgLy8gU2V0IGNhbGxiYWNrIGZvciB0aW1lIHdpbmRvdyBjaGFuZ2VzXG4gICAgICAgICAgICAvLyBBbHdheXMgdXNlIGxhdGVzdD10cnVlIHNvIHRoZSBtb3N0IHJlY2VudCBsb2cgZW50cmllcyBhcmUgZGlzcGxheWVkXG4gICAgICAgICAgICAvLyBUcnVuY2F0aW9uIChpZiBhbnkpIGhhcHBlbnMgb24gdGhlIGxlZnQgc2lkZSwgd2hpY2ggaXMgbGVzcyBkaXNydXB0aXZlXG4gICAgICAgICAgICBTVkdUaW1lbGluZS5vblJhbmdlQ2hhbmdlID0gKHN0YXJ0LCBlbmQsIGRyYWdnZWRIYW5kbGUpID0+IHtcbiAgICAgICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy5sb2FkTG9nQnlUaW1lUmFuZ2Uoc3RhcnQsIGVuZCwgdHJ1ZSk7XG4gICAgICAgICAgICB9O1xuXG4gICAgICAgICAgICAvLyBTZXQgY2FsbGJhY2sgZm9yIHRydW5jYXRlZCB6b25lIGNsaWNrc1xuICAgICAgICAgICAgLy8gTGVmdCB6b25lcyAodGltZWxpbmUtdHJ1bmNhdGVkLWxlZnQpOiBkYXRhIHdhcyBjdXQgZnJvbSBiZWdpbm5pbmcsIGxvYWQgd2l0aCBsYXRlc3Q9dHJ1ZVxuICAgICAgICAgICAgLy8gUmlnaHQgem9uZXMgKHRpbWVsaW5lLXRydW5jYXRlZC1yaWdodCk6IGRhdGEgd2FzIGN1dCBmcm9tIGVuZCwgbG9hZCB3aXRoIGxhdGVzdD1mYWxzZVxuICAgICAgICAgICAgU1ZHVGltZWxpbmUub25UcnVuY2F0ZWRab25lQ2xpY2sgPSAoc3RhcnQsIGVuZCwgaXNMZWZ0Wm9uZSkgPT4ge1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmxvYWRMb2dCeVRpbWVSYW5nZShzdGFydCwgZW5kLCBpc0xlZnRab25lKTtcbiAgICAgICAgICAgIH07XG5cbiAgICAgICAgICAgIC8vIExvYWQgaW5pdGlhbCBjaHVuayB3aXRoIGxhdGVzdD10cnVlIHRvIHNob3cgbmV3ZXN0IGVudHJpZXNcbiAgICAgICAgICAgIC8vIFBhc3MgaXNJbml0aWFsTG9hZD10cnVlIHRvIHN1cHByZXNzIHRydW5jYXRlZCB6b25lIGRpc3BsYXkgb24gZmlyc3QgbG9hZFxuICAgICAgICAgICAgLy8gVXNlIHRoZSBsYXJnZXN0IHZpc2libGUgcGVyaW9kIGJ1dHRvbiBvciAxIGhvdXIgYXMgZmFsbGJhY2tcbiAgICAgICAgICAgIGNvbnN0ICRhY3RpdmVCdXR0b24gPSAkKCcucGVyaW9kLWJ0bi5hY3RpdmU6dmlzaWJsZScpO1xuICAgICAgICAgICAgY29uc3QgaW5pdGlhbFBlcmlvZCA9ICRhY3RpdmVCdXR0b24ubGVuZ3RoID4gMFxuICAgICAgICAgICAgICAgID8gcGFyc2VJbnQoJGFjdGl2ZUJ1dHRvbi5kYXRhKCdwZXJpb2QnKSwgMTApXG4gICAgICAgICAgICAgICAgOiBNYXRoLm1pbigzNjAwLCBsb2dEdXJhdGlvbik7XG4gICAgICAgICAgICBjb25zdCBpbml0aWFsU3RhcnQgPSBNYXRoLm1heCh0aGlzLmN1cnJlbnRUaW1lUmFuZ2UuZW5kIC0gaW5pdGlhbFBlcmlvZCwgdGhpcy5jdXJyZW50VGltZVJhbmdlLnN0YXJ0KTtcbiAgICAgICAgICAgIHRoaXMubG9hZExvZ0J5VGltZVJhbmdlKGluaXRpYWxTdGFydCwgdGhpcy5jdXJyZW50VGltZVJhbmdlLmVuZCwgdHJ1ZSwgdHJ1ZSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBMaW5lIG51bWJlciBmYWxsYmFjayBtb2RlXG4gICAgICAgICAgICB0aGlzLnRpbWVTbGlkZXJFbmFibGVkID0gZmFsc2U7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRUaW1lUmFuZ2UgPSBudWxsO1xuXG4gICAgICAgICAgICAvLyBIaWRlIHBlcmlvZCBidXR0b25zIGluIGxpbmUgbnVtYmVyIG1vZGVcbiAgICAgICAgICAgICQoJyNwZXJpb2QtYnV0dG9ucycpLmhpZGUoKTtcblxuICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBTVkcgdGltZWxpbmUgd2l0aCBsaW5lIG51bWJlcnNcbiAgICAgICAgICAgIC8vIEZvciBub3csIHVzZSBkZWZhdWx0IHJhbmdlIHVudGlsIHdlIGdldCB0b3RhbCBsaW5lIGNvdW50XG4gICAgICAgICAgICBjb25zdCBsaW5lUmFuZ2UgPSB7IHN0YXJ0OiAwLCBlbmQ6IDEwMDAwIH07XG4gICAgICAgICAgICBTVkdUaW1lbGluZS5pbml0aWFsaXplKCcjdGltZS1zbGlkZXItY29udGFpbmVyJywgbGluZVJhbmdlLCAnbGluZXMnKTtcblxuICAgICAgICAgICAgLy8gU2V0IGNhbGxiYWNrIGZvciBsaW5lIHJhbmdlIGNoYW5nZXNcbiAgICAgICAgICAgIFNWR1RpbWVsaW5lLm9uUmFuZ2VDaGFuZ2UgPSAoc3RhcnQsIGVuZCkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIExvYWQgYnkgbGluZSBudW1iZXJzIChvZmZzZXQvbGluZXMpXG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MubG9hZExvZ0J5TGluZXMoTWF0aC5mbG9vcihzdGFydCksIE1hdGguY2VpbChlbmQgLSBzdGFydCkpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgLy8gTG9hZCBpbml0aWFsIGxpbmVzXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGxvZyBieSBsaW5lIG51bWJlcnMgKGZvciBmaWxlcyB3aXRob3V0IHRpbWVzdGFtcHMpXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IG9mZnNldCAtIFN0YXJ0aW5nIGxpbmUgbnVtYmVyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGxpbmVzIC0gTnVtYmVyIG9mIGxpbmVzIHRvIGxvYWRcbiAgICAgKi9cbiAgICBsb2FkTG9nQnlMaW5lcyhvZmZzZXQsIGxpbmVzKSB7XG4gICAgICAgIC8vIFNob3cgZGltbWVyIG9ubHkgaWYgbm90IGluIGF1dG8tdXBkYXRlIG1vZGVcbiAgICAgICAgaWYgKCFzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUpIHtcbiAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgcGFyYW1zID0ge1xuICAgICAgICAgICAgZmlsZW5hbWU6IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2ZpbGVuYW1lJyksXG4gICAgICAgICAgICBmaWx0ZXI6IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2ZpbHRlcicpIHx8ICcnLFxuICAgICAgICAgICAgbG9nTGV2ZWw6IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2xvZ0xldmVsJykgfHwgJycsXG4gICAgICAgICAgICBvZmZzZXQ6IE1hdGgubWF4KDAsIG9mZnNldCksXG4gICAgICAgICAgICBsaW5lczogTWF0aC5taW4oNTAwMCwgTWF0aC5tYXgoMTAwLCBsaW5lcykpXG4gICAgICAgIH07XG5cbiAgICAgICAgU3lzbG9nQVBJLmdldExvZ0Zyb21GaWxlKHBhcmFtcywgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAvLyBIaWRlIGRpbW1lciBvbmx5IGlmIG5vdCBpbiBhdXRvLXVwZGF0ZSBtb2RlXG4gICAgICAgICAgICBpZiAoIXN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLiRkaW1tZXIucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhICYmICdjb250ZW50JyBpbiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgLy8gU2V0IGNvbnRlbnQgaW4gZWRpdG9yIChldmVuIGlmIGVtcHR5KVxuICAgICAgICAgICAgICAgIHRoaXMudmlld2VyLnNldFZhbHVlKHJlc3BvbnNlLmRhdGEuY29udGVudCB8fCAnJywgLTEpO1xuXG4gICAgICAgICAgICAgICAgLy8gR28gdG8gdGhlIGJlZ2lubmluZ1xuICAgICAgICAgICAgICAgIHRoaXMudmlld2VyLmdvdG9MaW5lKDEpO1xuICAgICAgICAgICAgICAgIHRoaXMudmlld2VyLnNjcm9sbFRvTGluZSgwLCB0cnVlLCB0cnVlLCAoKSA9PiB7fSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGxvZyBieSB0aW1lIHJhbmdlXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHN0YXJ0VGltZXN0YW1wIC0gU3RhcnQgdGltZXN0YW1wXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGVuZFRpbWVzdGFtcCAtIEVuZCB0aW1lc3RhbXBcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IGxhdGVzdCAtIElmIHRydWUsIHJldHVybiBuZXdlc3QgbGluZXMgZmlyc3QgKGZvciBpbml0aWFsIGxvYWQpXG4gICAgICogQHBhcmFtIHtib29sZWFufSBpc0luaXRpYWxMb2FkIC0gSWYgdHJ1ZSwgc3VwcHJlc3MgdHJ1bmNhdGVkIHpvbmUgZGlzcGxheVxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gaXNBdXRvVXBkYXRlIC0gSWYgdHJ1ZSwgc2tpcCB0aW1lbGluZSByZWNhbGN1bGF0aW9uIChvbmx5IHVwZGF0ZSBjb250ZW50KVxuICAgICAqL1xuICAgIGxvYWRMb2dCeVRpbWVSYW5nZShzdGFydFRpbWVzdGFtcCwgZW5kVGltZXN0YW1wLCBsYXRlc3QgPSBmYWxzZSwgaXNJbml0aWFsTG9hZCA9IGZhbHNlLCBpc0F1dG9VcGRhdGUgPSBmYWxzZSkge1xuICAgICAgICAvLyBTaG93IGRpbW1lciBvbmx5IGlmIG5vdCBpbiBhdXRvLXVwZGF0ZSBtb2RlXG4gICAgICAgIGlmICghc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlKSB7XG4gICAgICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy4kZGltbWVyLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IHtcbiAgICAgICAgICAgIGZpbGVuYW1lOiB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmaWxlbmFtZScpLFxuICAgICAgICAgICAgZmlsdGVyOiB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmaWx0ZXInKSB8fCAnJyxcbiAgICAgICAgICAgIGxvZ0xldmVsOiB0aGlzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdsb2dMZXZlbCcpIHx8ICcnLFxuICAgICAgICAgICAgZGF0ZUZyb206IHN0YXJ0VGltZXN0YW1wLFxuICAgICAgICAgICAgZGF0ZVRvOiBlbmRUaW1lc3RhbXAsXG4gICAgICAgICAgICBsaW5lczogNTAwMCwgLy8gTWF4aW11bSBsaW5lcyB0byBsb2FkXG4gICAgICAgICAgICBsYXRlc3Q6IGxhdGVzdCAvLyBJZiB0cnVlLCByZXR1cm4gbmV3ZXN0IGxpbmVzICh0YWlsIHwgdGFjKVxuICAgICAgICB9O1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBTeXNsb2dBUEkuZ2V0TG9nRnJvbUZpbGUocGFyYW1zLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEgJiYgJ2NvbnRlbnQnIGluIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3Q29udGVudCA9IHJlc3BvbnNlLmRhdGEuY29udGVudCB8fCAnJztcblxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNBdXRvVXBkYXRlICYmIG5ld0NvbnRlbnQubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQXV0by11cGRhdGUgbW9kZTogYXBwZW5kIG9ubHkgbmV3IGxpbmVzXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50Q29udGVudCA9IHRoaXMudmlld2VyLmdldFZhbHVlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdMaW5lcyA9IHRoaXMuZmluZE5ld0xpbmVzKGN1cnJlbnRDb250ZW50LCBuZXdDb250ZW50KTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5ld0xpbmVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBBcHBlbmQgbmV3IGxpbmVzIGF0IHRoZSBlbmRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZXNzaW9uID0gdGhpcy52aWV3ZXIuc2Vzc2lvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBsYXN0Um93ID0gc2Vzc2lvbi5nZXRMZW5ndGgoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzZXNzaW9uLmluc2VydCh7IHJvdzogbGFzdFJvdywgY29sdW1uOiAwIH0sICdcXG4nICsgbmV3TGluZXMuam9pbignXFxuJykpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gR28gdG8gdGhlIGxhc3QgbGluZSB0byBmb2xsb3cgbmV3IGVudHJpZXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaW5hbFJvdyA9IHNlc3Npb24uZ2V0TGVuZ3RoKCkgLSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbmFsQ29sdW1uID0gc2Vzc2lvbi5nZXRMaW5lKGZpbmFsUm93KS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy52aWV3ZXIuZ290b0xpbmUoZmluYWxSb3cgKyAxLCBmaW5hbENvbHVtbik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBOb3JtYWwgbW9kZTogc2V0IGNvbnRlbnQgYW5kIGdvIHRvIGVuZFxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy52aWV3ZXIuc2V0VmFsdWUobmV3Q29udGVudCwgLTEpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBHbyB0byB0aGUgZW5kIG9mIHRoZSBsb2dcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJvdyA9IHRoaXMudmlld2VyLnNlc3Npb24uZ2V0TGVuZ3RoKCkgLSAxO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29sdW1uID0gdGhpcy52aWV3ZXIuc2Vzc2lvbi5nZXRMaW5lKHJvdykubGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy52aWV3ZXIuZ290b0xpbmUocm93ICsgMSwgY29sdW1uKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIEFkanVzdCBzbGlkZXIgdG8gYWN0dWFsIGxvYWRlZCB0aW1lIHJhbmdlIChzaWxlbnRseSlcbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEuYWN0dWFsX3JhbmdlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhY3R1YWwgPSByZXNwb25zZS5kYXRhLmFjdHVhbF9yYW5nZTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQWx3YXlzIHVwZGF0ZSBmdWxsUmFuZ2UgYm91bmRhcnkgYmFzZWQgb24gYWN0dWFsIGRhdGEgZnJvbSBzZXJ2ZXJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRoaXMgZW5zdXJlcyBuby1kYXRhIHpvbmVzIGRpc3BsYXkgY29ycmVjdGx5IGFmdGVyIHJlZnJlc2hcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3R1YWwuZW5kKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgU1ZHVGltZWxpbmUudXBkYXRlRGF0YUJvdW5kYXJ5KGFjdHVhbC5lbmQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFRyYWNrIGxhc3Qga25vd24gZGF0YSBlbmQgZm9yIHJlZnJlc2ggYW5jaG9yaW5nXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MubGFzdEtub3duRGF0YUVuZCA9IGFjdHVhbC5lbmQ7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEFsd2F5cyB1cGRhdGUgdGltZWxpbmUgd2l0aCBzZXJ2ZXIgcmVzcG9uc2UgKGV4Y2VwdCBkdXJpbmcgYXV0by11cGRhdGUpXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB1cGRhdGVGcm9tU2VydmVyUmVzcG9uc2UoKSBoYW5kbGVzOlxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gLSBVcGRhdGluZyBzZWxlY3RlZFJhbmdlIHRvIGFjdHVhbCBkYXRhIGJvdW5kYXJpZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIC0gUHJlc2VydmluZyB2aXNpYmxlUmFuZ2UuZW5kIGlmIGl0IHdhcyBleHRlbmRlZCB0byBjdXJyZW50IHRpbWUgKGZvciBuby1kYXRhIHpvbmVzKVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gLSBNYW5hZ2luZyB0cnVuY2F0aW9uIHpvbmVzIGRpc3BsYXlcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghaXNBdXRvVXBkYXRlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgU1ZHVGltZWxpbmUudXBkYXRlRnJvbVNlcnZlclJlc3BvbnNlKGFjdHVhbCwgc3RhcnRUaW1lc3RhbXAsIGVuZFRpbWVzdGFtcCwgaXNJbml0aWFsTG9hZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBIaWRlIGRpbW1lciBvbmx5IGlmIG5vdCBpbiBhdXRvLXVwZGF0ZSBtb2RlXG4gICAgICAgICAgICAgICAgaWYgKCFzeXN0ZW1EaWFnbm9zdGljTG9ncy5pc0F1dG9VcGRhdGVBY3RpdmUpIHtcbiAgICAgICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBsb2FkaW5nIGxvZyBieSB0aW1lIHJhbmdlOicsIGVycm9yKTtcbiAgICAgICAgICAgIC8vIEhpZGUgZGltbWVyIG9ubHkgaWYgbm90IGluIGF1dG8tdXBkYXRlIG1vZGVcbiAgICAgICAgICAgIGlmICghc3lzdGVtRGlhZ25vc3RpY0xvZ3MuaXNBdXRvVXBkYXRlQWN0aXZlKSB7XG4gICAgICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXBwbHkgcXVpY2sgcGVyaW9kIHNlbGVjdGlvbiAoWWFuZGV4IENsb3VkIExvZ1ZpZXdlciBzdHlsZSlcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gcGVyaW9kU2Vjb25kcyAtIFBlcmlvZCBpbiBzZWNvbmRzXG4gICAgICovXG4gICAgYXBwbHlRdWlja1BlcmlvZChwZXJpb2RTZWNvbmRzKSB7XG4gICAgICAgIGlmICghdGhpcy5jdXJyZW50VGltZVJhbmdlKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2UgbmV3IGFwcGx5UGVyaW9kIG1ldGhvZCB0aGF0IGhhbmRsZXMgdmlzaWJsZSByYW5nZSBhbmQgYXV0by1jZW50ZXJpbmdcbiAgICAgICAgU1ZHVGltZWxpbmUuYXBwbHlQZXJpb2QocGVyaW9kU2Vjb25kcyk7XG4gICAgICAgIC8vIENhbGxiYWNrIHdpbGwgYmUgdHJpZ2dlcmVkIGF1dG9tYXRpY2FsbHkgYnkgU1ZHVGltZWxpbmVcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQXBwbHkgbG9nIGxldmVsIGZpbHRlclxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBsZXZlbCAtIExvZyBsZXZlbCAoYWxsLCBlcnJvciwgd2FybmluZywgaW5mbywgZGVidWcpXG4gICAgICovXG4gICAgYXBwbHlMb2dMZXZlbEZpbHRlcihsZXZlbCkge1xuICAgICAgICBsZXQgZmlsdGVyUGF0dGVybiA9ICcnO1xuXG4gICAgICAgIC8vIENyZWF0ZSByZWdleCBwYXR0ZXJuIGJhc2VkIG9uIGxldmVsXG4gICAgICAgIHN3aXRjaCAobGV2ZWwpIHtcbiAgICAgICAgICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgICAgICAgICAgICBmaWx0ZXJQYXR0ZXJuID0gJ0VSUk9SfENSSVRJQ0FMfEZBVEFMJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3dhcm5pbmcnOlxuICAgICAgICAgICAgICAgIGZpbHRlclBhdHRlcm4gPSAnV0FSTklOR3xXQVJOJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2luZm8nOlxuICAgICAgICAgICAgICAgIGZpbHRlclBhdHRlcm4gPSAnSU5GTyc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdkZWJ1Zyc6XG4gICAgICAgICAgICAgICAgZmlsdGVyUGF0dGVybiA9ICdERUJVRyc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdhbGwnOlxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBmaWx0ZXJQYXR0ZXJuID0gJyc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGUgZmlsdGVyIGZpZWxkXG4gICAgICAgIHRoaXMuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ2ZpbHRlcicsIGZpbHRlclBhdHRlcm4pO1xuXG4gICAgICAgIC8vIFJlbG9hZCBsb2dzIHdpdGggbmV3IGZpbHRlclxuICAgICAgICB0aGlzLnVwZGF0ZUxvZ0Zyb21TZXJ2ZXIoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRmV0Y2hlcyB0aGUgbG9nIGZpbGUgY29udGVudCBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAgICogQHBhcmFtIHtib29sZWFufSBwcmVzZXJ2ZVJhbmdlIC0gSWYgdHJ1ZSwgdXNlIGN1cnJlbnQgU1ZHIHRpbWVsaW5lIHNlbGVjdGlvbiBpbnN0ZWFkIG9mXG4gICAgICogICByZWNhbGN1bGF0aW5nIHRvIFwibGFzdCAxIGhvdXJcIi4gVXNlZCB3aGVuIGZpbHRlci9sZXZlbCBjaGFuZ2VzIHRvIGtlZXAgdGhlIHNhbWUgdmlldy5cbiAgICAgKi9cbiAgICB1cGRhdGVMb2dGcm9tU2VydmVyKHByZXNlcnZlUmFuZ2UgPSBmYWxzZSkge1xuICAgICAgICBpZiAodGhpcy50aW1lU2xpZGVyRW5hYmxlZCkge1xuICAgICAgICAgICAgLy8gSW4gdGltZSBzbGlkZXIgbW9kZSwgcmVsb2FkIGN1cnJlbnQgd2luZG93XG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50VGltZVJhbmdlKSB7XG5cbiAgICAgICAgICAgICAgICAvLyBXaGVuIHByZXNlcnZlUmFuZ2UgaXMgdHJ1ZSAoZmlsdGVyL2xldmVsIGNoYW5nZSksIHVzZSBjdXJyZW50IHRpbWVsaW5lIHNlbGVjdGlvblxuICAgICAgICAgICAgICAgIC8vIFdIWTogQ2hhbmdpbmcgZmlsdGVycyBzaG91bGQgbm90IHJlc2V0IHRoZSB0aW1lIHdpbmRvdyDigJQgdXNlciBleHBlY3RzIHRvIHNlZVxuICAgICAgICAgICAgICAgIC8vIHRoZSBzYW1lIHBlcmlvZCB3aXRoIGRpZmZlcmVudCBmaWx0ZXJpbmcgYXBwbGllZFxuICAgICAgICAgICAgICAgIGlmIChwcmVzZXJ2ZVJhbmdlICYmIFNWR1RpbWVsaW5lLnNlbGVjdGVkUmFuZ2UpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2FkTG9nQnlUaW1lUmFuZ2UoXG4gICAgICAgICAgICAgICAgICAgICAgICBTVkdUaW1lbGluZS5zZWxlY3RlZFJhbmdlLnN0YXJ0LFxuICAgICAgICAgICAgICAgICAgICAgICAgU1ZHVGltZWxpbmUuc2VsZWN0ZWRSYW5nZS5lbmQsXG4gICAgICAgICAgICAgICAgICAgICAgICB0cnVlLCBmYWxzZSwgdGhpcy5pc0F1dG9VcGRhdGVBY3RpdmVcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNvbnN0IG9uZUhvdXIgPSAzNjAwO1xuXG4gICAgICAgICAgICAgICAgLy8gR2V0IGN1cnJlbnQgZmlsZW5hbWUgdG8gY2hlY2sgaWYgaXQncyBhIHJvdGF0ZWQgbG9nIGZpbGVcbiAgICAgICAgICAgICAgICBjb25zdCBmaWxlbmFtZSA9IHRoaXMuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2ZpbGVuYW1lJyk7XG4gICAgICAgICAgICAgICAgY29uc3QgaXNSb3RhdGVkID0gdGhpcy5pc1JvdGF0ZWRMb2dGaWxlKGZpbGVuYW1lKTtcblxuICAgICAgICAgICAgICAgIGxldCBlbmRUaW1lc3RhbXA7XG4gICAgICAgICAgICAgICAgbGV0IHN0YXJ0VGltZXN0YW1wO1xuXG4gICAgICAgICAgICAgICAgaWYgKGlzUm90YXRlZCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBGb3Igcm90YXRlZCBmaWxlczogdXNlIHRoZSBmaWxlJ3MgYWN0dWFsIHRpbWUgcmFuZ2VcbiAgICAgICAgICAgICAgICAgICAgLy8gUm90YXRlZCBmaWxlcyBkb24ndCByZWNlaXZlIG5ldyBkYXRhLCBzbyBjdXJyZW50VGltZVJhbmdlIGlzIGZpeGVkXG4gICAgICAgICAgICAgICAgICAgIGVuZFRpbWVzdGFtcCA9IHRoaXMuY3VycmVudFRpbWVSYW5nZS5lbmQ7XG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0VGltZXN0YW1wID0gTWF0aC5tYXgodGhpcy5jdXJyZW50VGltZVJhbmdlLmVuZCAtIG9uZUhvdXIsIHRoaXMuY3VycmVudFRpbWVSYW5nZS5zdGFydCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRm9yIGFjdGl2ZSBsb2cgZmlsZXM6IHVzZSBjdXJyZW50IHRpbWUgdG8gY2FwdHVyZSBuZXcgZW50cmllc1xuICAgICAgICAgICAgICAgICAgICBlbmRUaW1lc3RhbXAgPSBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBXSFk6IEFuY2hvciBzdGFydFRpbWVzdGFtcCB0byB0aGUgbGFzdCBrbm93biBkYXRhIGVuZCwgbm90IHdhbGwgY2xvY2sgdGltZS5cbiAgICAgICAgICAgICAgICAgICAgLy8gVXNpbmcgXCJub3cgLSBwZXJpb2RcIiBwcm9kdWNlcyBhbiBlbXB0eSByYW5nZSB3aGVuIHRoZSBmaWxlIGhhc24ndCBiZWVuXG4gICAgICAgICAgICAgICAgICAgIC8vIHdyaXR0ZW4gdG8gcmVjZW50bHkgKGUuZy4sIGlkbGUgbW9kdWxlIGxvZ3MgbGlrZSBNb2R1bGVBdXRvQ1JNL1NhbG9uU3luY2VyLmxvZykuXG4gICAgICAgICAgICAgICAgICAgIC8vIGxhc3RLbm93bkRhdGFFbmQgaG9sZHMgdGhlIGFjdHVhbCB0aW1lc3RhbXAgb2YgdGhlIGxhc3QgbGluZSBmcm9tIHRoZSBBUEkgcmVzcG9uc2UuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGRhdGFFbmQgPSB0aGlzLmxhc3RLbm93bkRhdGFFbmQgfHwgdGhpcy5jdXJyZW50VGltZVJhbmdlLmVuZDtcbiAgICAgICAgICAgICAgICAgICAgc3RhcnRUaW1lc3RhbXAgPSBNYXRoLm1heChkYXRhRW5kIC0gb25lSG91ciwgdGhpcy5jdXJyZW50VGltZVJhbmdlLnN0YXJ0KTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgY3VycmVudFRpbWVSYW5nZS5lbmQgdG8gcmVmbGVjdCBuZXcgZGF0YSBhdmFpbGFiaWxpdHlcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50VGltZVJhbmdlLmVuZCA9IGVuZFRpbWVzdGFtcDtcblxuICAgICAgICAgICAgICAgICAgICAvLyBGT1JDRSB1cGRhdGUgdGhlIFNWRyB0aW1lbGluZSB2aXNpYmxlIHJhbmdlIHRvIGN1cnJlbnQgdGltZVxuICAgICAgICAgICAgICAgICAgICAvLyBmb3JjZT10cnVlIGVuc3VyZXMgdmlzaWJsZVJhbmdlLmVuZCBpcyBzZXQgZXZlbiBpZiBpdCB3YXMgYWxyZWFkeSA+PSBlbmRUaW1lc3RhbXBcbiAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBoYW5kbGVzIHRpbWV6b25lIGRpZmZlcmVuY2VzIHdoZXJlIHNlcnZlciB0aW1lIG1pZ2h0IGFwcGVhciBcImluIHRoZSBmdXR1cmVcIlxuICAgICAgICAgICAgICAgICAgICBTVkdUaW1lbGluZS5leHRlbmRSYW5nZShlbmRUaW1lc3RhbXAsIHRydWUpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFVzZSBsYXRlc3Q9dHJ1ZSB0byBzaG93IG5ld2VzdCBlbnRyaWVzIChmb3Igc2hvdy1sYXN0LWxvZyAvIGF1dG8tdXBkYXRlIGJ1dHRvbnMpXG4gICAgICAgICAgICAgICAgLy8gUGFzcyBpc0F1dG9VcGRhdGU9dHJ1ZSB3aGVuIGF1dG8tcmVmcmVzaCBpcyBhY3RpdmUgdG8gcHJldmVudCB0aW1lbGluZSBmbGlja2VyaW5nXG4gICAgICAgICAgICAgICAgdGhpcy5sb2FkTG9nQnlUaW1lUmFuZ2Uoc3RhcnRUaW1lc3RhbXAsIGVuZFRpbWVzdGFtcCwgdHJ1ZSwgZmFsc2UsIHRoaXMuaXNBdXRvVXBkYXRlQWN0aXZlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIExpbmUgbnVtYmVyIG1vZGVcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtcyA9IHN5c3RlbURpYWdub3N0aWNMb2dzLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgICAgIHBhcmFtcy5saW5lcyA9IDUwMDA7IC8vIE1heCBsaW5lc1xuICAgICAgICAgICAgU3lzbG9nQVBJLmdldExvZ0Zyb21GaWxlKHBhcmFtcywgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuY2JVcGRhdGVMb2dUZXh0KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGaW5kIG5ldyBsaW5lcyB0aGF0IGFyZSBub3QgaW4gY3VycmVudCBjb250ZW50XG4gICAgICogQ29tcGFyZXMgbGFzdCBsaW5lcyBvZiBjdXJyZW50IGNvbnRlbnQgd2l0aCBuZXcgY29udGVudCB0byBmaW5kIG92ZXJsYXBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY3VycmVudENvbnRlbnQgLSBDdXJyZW50IGVkaXRvciBjb250ZW50XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG5ld0NvbnRlbnQgLSBOZXcgY29udGVudCBmcm9tIHNlcnZlclxuICAgICAqIEByZXR1cm5zIHtBcnJheX0gQXJyYXkgb2YgbmV3IGxpbmVzIHRvIGFwcGVuZFxuICAgICAqL1xuICAgIGZpbmROZXdMaW5lcyhjdXJyZW50Q29udGVudCwgbmV3Q29udGVudCkge1xuICAgICAgICBpZiAoIWN1cnJlbnRDb250ZW50IHx8IGN1cnJlbnRDb250ZW50LnRyaW0oKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIC8vIElmIGVkaXRvciBpcyBlbXB0eSwgYWxsIGxpbmVzIGFyZSBuZXdcbiAgICAgICAgICAgIHJldHVybiBuZXdDb250ZW50LnNwbGl0KCdcXG4nKS5maWx0ZXIobGluZSA9PiBsaW5lLnRyaW0oKS5sZW5ndGggPiAwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGN1cnJlbnRMaW5lcyA9IGN1cnJlbnRDb250ZW50LnNwbGl0KCdcXG4nKTtcbiAgICAgICAgY29uc3QgbmV3TGluZXMgPSBuZXdDb250ZW50LnNwbGl0KCdcXG4nKTtcblxuICAgICAgICAvLyBHZXQgbGFzdCBub24tZW1wdHkgbGluZSBmcm9tIGN1cnJlbnQgY29udGVudCBhcyBhbmNob3JcbiAgICAgICAgbGV0IGFuY2hvckxpbmUgPSAnJztcbiAgICAgICAgZm9yIChsZXQgaSA9IGN1cnJlbnRMaW5lcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRMaW5lc1tpXS50cmltKCkubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGFuY2hvckxpbmUgPSBjdXJyZW50TGluZXNbaV07XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWFuY2hvckxpbmUpIHtcbiAgICAgICAgICAgIHJldHVybiBuZXdMaW5lcy5maWx0ZXIobGluZSA9PiBsaW5lLnRyaW0oKS5sZW5ndGggPiAwKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZpbmQgYW5jaG9yIGxpbmUgaW4gbmV3IGNvbnRlbnRcbiAgICAgICAgbGV0IGFuY2hvckluZGV4ID0gLTE7XG4gICAgICAgIGZvciAobGV0IGkgPSBuZXdMaW5lcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgaWYgKG5ld0xpbmVzW2ldID09PSBhbmNob3JMaW5lKSB7XG4gICAgICAgICAgICAgICAgYW5jaG9ySW5kZXggPSBpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGFuY2hvckluZGV4ID09PSAtMSkge1xuICAgICAgICAgICAgLy8gQW5jaG9yIG5vdCBmb3VuZCAtIGNvbnRlbnQgY2hhbmdlZCBzaWduaWZpY2FudGx5LCByZXR1cm4gZW1wdHlcbiAgICAgICAgICAgIC8vIFRoaXMgcHJldmVudHMgZHVwbGljYXRlcyB3aGVuIGxvZyByb3RhdGVzIG9yIGZpbHRlciBjaGFuZ2VzXG4gICAgICAgICAgICByZXR1cm4gW107XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZXR1cm4gbGluZXMgYWZ0ZXIgYW5jaG9yXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IG5ld0xpbmVzLnNsaWNlKGFuY2hvckluZGV4ICsgMSkuZmlsdGVyKGxpbmUgPT4gbGluZS50cmltKCkubGVuZ3RoID4gMCk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhlIGxvZyB2aWV3LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIEFQSS5cbiAgICAgKi9cbiAgICBjYlVwZGF0ZUxvZ1RleHQocmVzcG9uc2UpIHtcbiAgICAgICAgLy8gSGlkZSBkaW1tZXIgb25seSBpZiBub3QgaW4gYXV0by11cGRhdGUgbW9kZVxuICAgICAgICBpZiAoIXN5c3RlbURpYWdub3N0aWNMb2dzLmlzQXV0b1VwZGF0ZUFjdGl2ZSkge1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGRpbW1lci5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBIYW5kbGUgdjMgQVBJIHJlc3BvbnNlIHN0cnVjdHVyZVxuICAgICAgICBpZiAoIXJlc3BvbnNlIHx8ICFyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5tZXNzYWdlcykge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjb250ZW50ID0gcmVzcG9uc2UuZGF0YT8uY29udGVudCB8fCAnJztcbiAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLmdldFNlc3Npb24oKS5zZXRWYWx1ZShjb250ZW50KTtcbiAgICAgICAgY29uc3Qgcm93ID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3Mudmlld2VyLnNlc3Npb24uZ2V0TGVuZ3RoKCkgLSAxO1xuICAgICAgICBjb25zdCBjb2x1bW4gPSBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIuc2Vzc2lvbi5nZXRMaW5lKHJvdykubGVuZ3RoO1xuICAgICAgICBzeXN0ZW1EaWFnbm9zdGljTG9ncy52aWV3ZXIuZ290b0xpbmUocm93ICsgMSwgY29sdW1uKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgY2xpY2tpbmcgdGhlIFwiRG93bmxvYWQgRmlsZVwiIGJ1dHRvbi5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZGF0YS5cbiAgICAgKi9cbiAgICBjYkRvd25sb2FkRmlsZShyZXNwb25zZSkge1xuICAgICAgICAvLyBIYW5kbGUgdjMgQVBJIHJlc3BvbnNlIHN0cnVjdHVyZVxuICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IHJlc3BvbnNlLmRhdGEuZmlsZW5hbWUgfHwgcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5tZXNzYWdlcykge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBjbGlja2luZyB0aGUgXCJFcmFzZSBGaWxlXCIgYnV0dG9uLlxuICAgICAqL1xuICAgIGVyYXNlQ3VycmVudEZpbGVDb250ZW50KCl7XG4gICAgICAgIGNvbnN0IGZpbGVOYW1lID0gc3lzdGVtRGlhZ25vc3RpY0xvZ3MuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2ZpbGVuYW1lJyk7XG4gICAgICAgIGlmIChmaWxlTmFtZS5sZW5ndGg+MCl7XG4gICAgICAgICAgICBTeXNsb2dBUEkuZXJhc2VGaWxlKGZpbGVOYW1lLCBzeXN0ZW1EaWFnbm9zdGljTG9ncy5jYkFmdGVyRmlsZUVyYXNlZClcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBjbGlja2luZyB0aGUgXCJFcmFzZSBGaWxlXCIgYnV0dG9uIGFuZCBjYWxsaW5nIFJFU1QgQVBJIGNvbW1hbmRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZGF0YS5cbiAgICAgKi9cbiAgICBjYkFmdGVyRmlsZUVyYXNlZChyZXNwb25zZSl7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQ9PT1mYWxzZSAmJiByZXNwb25zZS5tZXNzYWdlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc3lzdGVtRGlhZ25vc3RpY0xvZ3MudXBkYXRlTG9nRnJvbVNlcnZlcigpO1xuICAgICAgICB9XG4gICAgfSxcbn07XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBzaG93IHN5c3RlbSBsb2dzIHRhYlxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIHN5c3RlbURpYWdub3N0aWNMb2dzLmluaXRpYWxpemUoKTtcbn0pOyJdfQ==