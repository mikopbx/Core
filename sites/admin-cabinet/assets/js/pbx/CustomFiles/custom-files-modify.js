"use strict";

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

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

/* global globalRootUrl,globalTranslate, ace, Form, FilesAPI, customFilesAPI, PbxApiClient, TooltipBuilder */

/**
 * Module customFile
 * This module manages file interactions in a UI, such as loading file content from a server and handling user input.
 * @module customFile
 */
var customFile = {
  /**
   * jQuery object for the form.
   * @type {jQuery}
   */
  $formObj: $('#custom-file-form'),

  /**
   * jQuery object for the tab menu.
   * @type {jQuery}
   */
  $tabMenu: $('#custom-files-menu .item'),

  /**
   * jQuery object for the mode select.
   * @type {jQuery}
   */
  $modeDropDown: $('#mode-dropdown'),

  /**
   * jQuery object for the hidden custom mode input.
   * @type {jQuery}
   */
  $modeCustomInput: $('#mode-custom-value'),

  /**
   * jQuery object for the tab with original file content.
   * @type {jQuery}
   */
  $originalTab: $('a[data-tab="original"]'),

  /**
   * jQuery object for the tab with user content/script editor.
   * @type {jQuery}
   */
  $editorTab: $('a[data-tab="editor"]'),

  /**
   * jQuery object for the tab with resulted file content.
   * @type {jQuery}
   */
  $resultTab: $('a[data-tab="result"]'),

  /**
   * jQuery element for the main content container.
   * @type {jQuery}
   */
  $mainContainer: $('#main-content-container'),

  /**
   * jQuery object for the filepath input field.
   * @type {jQuery}
   */
  $filepathInput: $('#filepath'),

  /**
   * jQuery object for the filepath field container.
   * @type {jQuery}
   */
  $filepathField: $('#filepath-field'),

  /**
   * jQuery object for the tooltip icon in filepath field.
   * @type {jQuery}
   */
  $filepathTooltipIcon: $('#filepath-field .field-info-icon'),

  /**
   * Cached allowed directories from server
   * @type {Array|null}
   */
  allowedDirectories: null,

  /**
   * Ace editor instances
   * `editor` is for input and `viewers` is for display code from server
   */
  editor: '',
  viewerOriginal: '',
  viewerResult: '',

  /**
   * Validation rules for the form fields before submission.
   *
   * @type {object}
   */
  validateRules: {
    name: {
      identifier: 'filepath',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.cf_ValidateNameIsEmpty
      }]
    }
  },

  /**
   * Decode base64 string to UTF-8
   * Handles Unicode characters (Russian, Chinese, etc.)
   *
   * @param {string} base64Str - Base64 encoded string
   * @returns {string} UTF-8 decoded string
   */
  base64ToUtf8: function base64ToUtf8(base64Str) {
    try {
      // Decode base64 to binary string
      var binaryString = atob(base64Str); // Use TextDecoder for modern browsers

      if (typeof TextDecoder !== 'undefined') {
        var bytes = new Uint8Array(binaryString.length);

        for (var i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        return new TextDecoder().decode(bytes);
      } else {
        // Fallback for older browsers
        return decodeURIComponent(escape(binaryString));
      }
    } catch (e) {
      console.error('Failed to decode base64:', e);
      return base64Str; // Return as-is if decode fails
    }
  },

  /**
   * Get current mode value (from dropdown or hidden input for custom mode)
   * @returns {string} Current mode value
   */
  getCurrentMode: function getCurrentMode() {
    // Check if custom mode is active (hidden input has value)
    var customModeValue = customFile.$modeCustomInput.val();

    if (customModeValue === 'custom') {
      return 'custom';
    } // Otherwise return dropdown value


    return customFile.$formObj.form('get value', 'mode');
  },

  /**
   * Set mode value (using dropdown for standard modes, hidden input for custom mode)
   * @param {string} mode - Mode to set
   */
  setMode: function setMode(mode) {
    if (mode === 'custom') {
      // Set custom mode via hidden input
      customFile.$modeCustomInput.val('custom'); // Hide dropdown for custom files

      customFile.$modeDropDown.parent().parent().hide();
    } else {
      // Clear custom mode
      customFile.$modeCustomInput.val(''); // Set standard mode via dropdown

      customFile.$modeDropDown.dropdown('set selected', mode); // Show dropdown

      customFile.$modeDropDown.parent().parent().show();
    }
  },

  /**
   * Updates the filepath field state based on whether the file is user-created (MODE_CUSTOM) or system-managed.
   * User-created files have editable filepath but cannot be created (only for new files),
   * system-managed files have read-only filepath.
   */
  updateFilepathFieldState: function updateFilepathFieldState() {
    var mode = customFile.getCurrentMode();
    var isUserCreated = mode === 'custom';
    var fileId = customFile.$formObj.form('get value', 'id');

    if (isUserCreated) {
      if (!fileId || fileId === '') {
        // New custom file - filepath is editable
        customFile.$filepathInput.prop('readonly', false);
        customFile.$filepathField.removeClass('disabled');
      } else {
        // Existing custom file - filepath is read-only (cannot be changed after creation)
        customFile.$filepathInput.prop('readonly', true);
        customFile.$filepathField.addClass('disabled');
      } // Always hide mode selector for custom files


      customFile.$modeDropDown.parent().parent().hide();
    } else {
      // System-managed file - filepath is always read-only
      customFile.$filepathInput.prop('readonly', true);
      customFile.$filepathField.addClass('disabled'); // Show mode selector for system files

      customFile.$modeDropDown.parent().parent().show();
    } // Update tooltip visibility based on mode


    customFile.updateTooltipVisibility();
  },

  /**
   * Update tooltip icon visibility based on current mode
   * Tooltip is only shown for MODE_CUSTOM files
   */
  updateTooltipVisibility: function updateTooltipVisibility() {
    var mode = customFile.getCurrentMode();
    var isCustomMode = mode === 'custom';

    if (isCustomMode) {
      customFile.$filepathTooltipIcon.show();
    } else {
      customFile.$filepathTooltipIcon.hide();
    }
  },

  /**
   * Initialize tooltips for form fields
   * Loads allowed directories from server and sets up tooltip content
   */
  initializeTooltips: function initializeTooltips() {
    // Initialize jQuery object after DOM is ready
    customFile.$filepathTooltipIcon = $('#filepath-field .field-info-icon'); // Fetch allowed directories from server

    $.ajax({
      url: "".concat(globalRootUrl, "custom-files/getAllowedDirectories"),
      type: 'GET',
      dataType: 'json',
      success: function success(response) {
        if (response.success && response.data) {
          customFile.allowedDirectories = response.data; // Build tooltip configuration

          var tooltipConfigs = {
            filepath: TooltipBuilder.buildContent({
              header: globalTranslate.cf_filepath_tooltip_header || 'Allowed directories',
              description: globalTranslate.cf_filepath_tooltip_desc || 'For MODE_CUSTOM files, you can only create files in the following directories:',
              list: customFile.allowedDirectories.map(function (dir) {
                return "<code>".concat(dir, "</code>");
              }),
              note: globalTranslate.cf_filepath_tooltip_autocreate || 'Subdirectories are created automatically if specified in the file path. For example: /etc/custom-configs/myapp/config.ini'
            })
          }; // Initialize tooltips using TooltipBuilder

          TooltipBuilder.initialize(tooltipConfigs); // Update visibility based on current mode

          customFile.updateTooltipVisibility();
        } else {
          console.error('Failed to load allowed directories');
        }
      },
      error: function error(xhr, status, _error) {
        console.error('Error loading allowed directories:', _error);
      }
    });
  },

  /**
   * Initializes the customFile module.
   * Sets up the dropdown, initializes Ace editor, form, and retrieves file content from the server.
   */
  initialize: function initialize() {
    // Initialize jQuery objects after DOM is ready
    customFile.$filepathInput = $('#filepath');
    customFile.$filepathField = $('#filepath-field');
    customFile.$modeDropDown = $('#mode-dropdown');
    customFile.$modeCustomInput = $('#mode-custom-value');
    customFile.$filepathTooltipIcon = $('#filepath-field .field-info-icon'); // Enable tab navigation with history support

    customFile.$tabMenu.tab({
      onVisible: customFile.onChangeTab
    });
    customFile.$mainContainer.removeClass('container'); // Initialize Ace editor

    customFile.initializeAce(); // Initialize tooltips

    customFile.initializeTooltips(); // Initialize or reinitialize dropdown

    if (customFile.$modeDropDown.length > 0) {
      customFile.$modeDropDown.dropdown({
        onChange: customFile.cbOnChangeMode
      });
    } // Get file ID from URL or form


    var urlParams = new URLSearchParams(window.location.search);
    var urlId = window.location.pathname.match(/modify\/(\d+)/);
    var fileId = urlId ? urlId[1] : customFile.$formObj.form('get value', 'id');

    if (!fileId || fileId === '') {
      // Load default values for new custom file
      customFilesAPI.getDefault(function (response) {
        if (response.result && response.data) {
          // Store mode separately to handle it correctly
          var mode = response.data.mode || 'none'; // Remove mode from response before setting form values

          var formData = _objectSpread({}, response.data);

          delete formData.mode; // Don't let form('set values') handle mode
          // Set default values to form fields (without mode)

          customFile.$formObj.form('set values', formData); // For new files with MODE_CUSTOM

          if (mode === 'custom') {
            // Make filepath editable for new custom files
            customFile.$filepathInput.prop('readonly', false);
            customFile.$filepathField.removeClass('disabled'); // Set mode to 'custom' using hidden input

            customFile.setMode('custom'); // Show tooltip icon for MODE_CUSTOM

            customFile.updateTooltipVisibility(); // Show only editor tab for custom mode

            customFile.$tabMenu.tab('change tab', 'editor');
            customFile.$editorTab.show();
            customFile.$originalTab.hide();
            customFile.$resultTab.hide(); // Hide other tab menu items

            $('.item[data-tab="original"]').hide();
            $('.item[data-tab="result"]').hide(); // Initialize empty content in editor for new custom files

            if (response.data.content) {
              // If default content provided (base64), decode it with UTF-8 support
              var decodedContent = customFile.base64ToUtf8(response.data.content);
              customFile.editor.setValue(decodedContent);
            } else {
              // Set empty content for new custom file
              customFile.editor.setValue('');
            }

            customFile.editor.clearSelection();
          } else {
            // For other modes, use standard behavior (mode already extracted above)
            customFile.setMode(mode);
            customFile.cbOnChangeMode(mode);
            customFile.updateFilepathFieldState();
          }
        }
      });
    } else {
      // Load existing file data via REST API
      customFilesAPI.getRecord(fileId, function (response) {
        if (response.result && response.data) {
          // Store base64 content separately and remove from form data
          var base64Content = response.data.content; // Store mode separately to handle it correctly

          var mode = response.data.mode || 'none'; // Remove content and mode from response before setting form values
          // (content will be taken from ACE editor on save, mode will be set separately)

          var formData = _objectSpread({}, response.data);

          delete formData.content;
          delete formData.mode; // Don't let form('set values') handle mode
          // Set form values from API response (without content and mode)

          customFile.$formObj.form('set values', formData); // Decode base64 content and set in editor with UTF-8 support

          if (base64Content) {
            var decodedContent = customFile.base64ToUtf8(base64Content);
            customFile.editor.setValue(decodedContent);
            customFile.editor.clearSelection();
          } // Set mode and trigger UI update (mode already extracted above)


          if (mode === 'custom') {
            // For existing custom files - filepath is read-only
            customFile.$filepathInput.prop('readonly', true);
            customFile.$filepathField.addClass('disabled'); // Set mode to 'custom' using hidden input

            customFile.setMode('custom'); // Show tooltip icon for MODE_CUSTOM (even for read-only files)

            customFile.updateTooltipVisibility(); // Show only editor tab for custom mode

            customFile.$tabMenu.tab('change tab', 'editor');
            customFile.$editorTab.show();
            customFile.$originalTab.hide();
            customFile.$resultTab.hide(); // Hide other tab menu items

            $('.item[data-tab="original"]').hide();
            $('.item[data-tab="result"]').hide();
          } else {
            // For system files - use standard behavior
            customFile.setMode(mode);
            customFile.cbOnChangeMode(mode);
            customFile.updateFilepathFieldState();
          }
        } else {
          // If loading fails, redirect to index
          window.location = "".concat(globalRootUrl, "custom-files/index");
        }
      });
    } // Initialize form


    customFile.initializeForm();
  },

  /**
   * Callback for when the code mode changes.
   *
   * @param {string} value - The selected value from the dropdown.
   * @param {string} text - The selected text from the dropdown.
   */
  cbOnChangeMode: function cbOnChangeMode(value, text) {
    // Handle code visibility and content based on the 'mode'
    switch (value) {
      case 'none':
        customFile.$tabMenu.tab('change tab', 'original');
        break;

      case 'override':
        customFile.$tabMenu.tab('change tab', 'editor'); // Load original file content into editor if it's empty

        customFile.loadOriginalContentForOverride();
        break;

      case 'custom':
        // Custom mode behaves like override
        customFile.$tabMenu.tab('change tab', 'editor');
        break;

      case 'append':
        customFile.$tabMenu.tab('change tab', 'editor');
        break;

      case 'script':
        customFile.$tabMenu.tab('change tab', 'editor');
        break;

      default:
        customFile.$tabMenu.tab('change tab', 'original');
    }

    customFile.hideShowCode(); // Update tooltip visibility when mode changes

    customFile.updateTooltipVisibility();
  },

  /**
   * Event handler for tab changes.
   *
   * @param {string} currentTab - The current tab that is visible.
   */
  onChangeTab: function onChangeTab(currentTab) {
    var filePath = customFile.$formObj.form('get value', 'filepath');

    switch (currentTab) {
      case 'result':
        $('.tab[data-tab="result"]').addClass('loading');
        FilesAPI.getFileContent(filePath, customFile.cbGetResultFileContentFromServer, false);
        break;

      case 'original':
        $('.tab[data-tab="original"]').addClass('loading');
        FilesAPI.getFileContent(filePath, customFile.cbGetOriginalFileContentFromServer, true);
        break;

      case 'editor':
        break;
    }
  },

  /**
   * Handles the visibility and content of code based on the 'mode' form value.
   * Adjusts the Ace editor settings accordingly.
   */
  hideShowCode: function hideShowCode() {
    // Retrieve 'mode' value (from dropdown or hidden input for custom mode)
    var mode = customFile.getCurrentMode(); // Get current content from editor (not from form, as form doesn't have it anymore)

    var content = customFile.editor.getValue(); // Get tab menu items

    var $originalTabMenuItem = $('.item[data-tab="original"]');
    var $resultTabMenuItem = $('.item[data-tab="result"]'); // Handle code visibility and content based on the 'mode'

    switch (mode) {
      case 'none':
        // If 'mode' is 'none', show only result code generated and hide editor and result viewer
        customFile.$editorTab.hide();
        customFile.$originalTab.show();
        customFile.viewerOriginal.navigateFileStart();
        customFile.$resultTab.hide(); // Show/hide menu items

        $originalTabMenuItem.show();
        $resultTabMenuItem.hide();
        break;

      case 'append':
        // If 'mode' is 'append', show all fields
        customFile.$editorTab.show();
        customFile.$originalTab.show();
        customFile.$resultTab.show();
        customFile.viewerOriginal.navigateFileEnd();
        customFile.viewerResult.navigateFileEnd(); // Show all menu items

        $originalTabMenuItem.show();
        $resultTabMenuItem.show();
        break;

      case 'override':
        // If 'mode' is 'override', show editor and hide original, but show result
        customFile.$editorTab.show();
        customFile.$originalTab.hide();
        customFile.$resultTab.hide(); // Show/hide menu items

        $originalTabMenuItem.hide();
        $resultTabMenuItem.hide();
        break;

      case 'custom':
        // For 'custom' mode, only show editor tab - user fully controls the file
        customFile.$editorTab.show();
        customFile.$originalTab.hide();
        customFile.$resultTab.hide(); // Hide other tab menu items for custom files

        $originalTabMenuItem.hide();
        $resultTabMenuItem.hide();
        break;

      case 'script':
        // If 'mode' is 'script', show both server and custom code, apply custom script to the file content on server
        customFile.$editorTab.show();
        customFile.$originalTab.show();
        customFile.$resultTab.show(); // Show all menu items for script mode

        $originalTabMenuItem.show();
        $resultTabMenuItem.show(); // Editor - only set template if content is empty

        if (!content || content.trim() === '') {
          content = "#!/bin/bash \n\n";
          content += "configPath=\"$1\" # Path to the original config file\n\n";
          content += "# Example 1: Replace all values max_contacts = 5 to max_contacts = 1 on pjsip.conf\n";
          content += "# sed -i 's/max_contacts = 5/max_contacts = 1/g' \"$configPath\"\n\n";
          content += "# Example 2: Change value max_contacts only for peer with extension 226 on pjsip.conf\n";
          content += "# sed -i '/^\\[226\\]$/,/^\\[/ s/max_contacts = 5/max_contacts = 2/' \"$configPath\"\n\n";
          content += "# Example 3: Add en extra string into [playback-exit] section after the \"same => n,Hangup()\" string on extensions.conf\n";
          content += "# sed -i '/^\\[playback-exit\\]$/,/^\\[/ s/^\\(\\s*same => n,Hangup()\\)/\\1\\n\\tsame => n,NoOp(\"Your NoOp comment here\")/' \"$configPath\"\n\n";
          content += "# Attention! You will see changes after the background worker processes the script or after rebooting the system. \n"; // Only set content if we created a template

          customFile.editor.setValue(content);
          customFile.editor.clearSelection();
        }

        break;

      default:
        // Handle any other 'mode' values
        break;
    }

    customFile.viewerOriginal.setTheme('ace/theme/monokai');
    customFile.editor.setTheme('ace/theme/monokai'); // Don't overwrite editor content here - it's already set correctly
    // customFile.editor.setValue(content);
    // customFile.editor.clearSelection();
  },

  /**
   * Callback function that handles the response from the server containing the file's content.
   * It will update the 'viewerOriginal' with the file's content and adjust the code display.
   */
  cbGetOriginalFileContentFromServer: function cbGetOriginalFileContentFromServer(response) {
    if (response.data.content !== undefined) {
      var aceViewer = customFile.viewerOriginal;
      var scrollTop = aceViewer.session.getScrollTop();
      aceViewer.session.setValue(response.data.content);
      aceViewer.session.setScrollTop(scrollTop);
    }

    $('.tab[data-tab="original"]').removeClass('loading');
  },

  /**
   * Callback function that handles the response from the server containing the file's content.
   * It will update the 'viewerResult' with the file's content and adjust the code display.
   */
  cbGetResultFileContentFromServer: function cbGetResultFileContentFromServer(response) {
    if (response.data.content !== undefined) {
      var aceViewer = customFile.viewerResult;
      var scrollTop = aceViewer.session.getScrollTop();
      aceViewer.session.setValue(response.data.content);
      aceViewer.session.setScrollTop(scrollTop);
    }

    $('.tab[data-tab="result"]').removeClass('loading');
  },

  /**
   * Load original file content into editor when switching to override mode.
   * Only loads if editor is empty to avoid overwriting user's work.
   * Reuses already loaded content from viewerOriginal if available.
   */
  loadOriginalContentForOverride: function loadOriginalContentForOverride() {
    // Only load if editor is empty
    var currentContent = customFile.editor.getValue();

    if (!currentContent || currentContent.trim() === '') {
      // First, try to get content from viewerOriginal if it's already loaded
      var originalContent = customFile.viewerOriginal.getValue();

      if (originalContent && originalContent.trim() !== '') {
        // Reuse already loaded content from viewer
        customFile.editor.setValue(originalContent);
        customFile.editor.clearSelection();
        customFile.editor.navigateFileStart();
      } else {
        // Content not yet loaded - fetch from server
        var filePath = customFile.$formObj.form('get value', 'filepath');

        if (filePath) {
          // Show loading indicator
          customFile.$editorTab.addClass('loading'); // Load original file content from server

          FilesAPI.getFileContent(filePath, function (response) {
            if (response.data.content !== undefined) {
              // Set original content in editor
              customFile.editor.setValue(response.data.content);
              customFile.editor.clearSelection(); // Move cursor to start

              customFile.editor.navigateFileStart();
            } // Remove loading indicator


            customFile.$editorTab.removeClass('loading');
          }, true);
        }
      }
    }
  },

  /**
   * Initializes Ace editor instances for 'editor' and 'viewers' windows.
   */
  initializeAce: function initializeAce() {
    // Calculate ace editor height and rows count
    var aceHeight = window.innerHeight - 475;
    var rowsCount = Math.round(aceHeight / 16.3); // Set minimum height for the code sections on window load

    $('.application-code').css('min-height', "".concat(aceHeight, "px")); // ACE window for the original file content.

    var IniMode = ace.require('ace/mode/julia').Mode;

    customFile.viewerOriginal = ace.edit('config-file-original');
    customFile.viewerOriginal.session.setMode(new IniMode());
    customFile.viewerOriginal.setTheme('ace/theme/monokai');
    customFile.viewerOriginal.setOptions({
      showPrintMargin: false,
      readOnly: true,
      minLines: rowsCount
    }); // ACE window for the resulted file content.

    customFile.viewerResult = ace.edit('config-file-result');
    customFile.viewerResult.session.setMode(new IniMode());
    customFile.viewerResult.setTheme('ace/theme/monokai');
    customFile.viewerResult.setOptions({
      showPrintMargin: false,
      readOnly: true,
      minLines: rowsCount
    }); // ACE window for the user editor.

    customFile.editor = ace.edit('user-edit-config');
    customFile.editor.session.setMode(new IniMode());
    customFile.editor.setTheme('ace/theme/monokai');
    customFile.editor.setOptions({
      showPrintMargin: false,
      minLines: rowsCount
    });
    customFile.editor.session.on('change', function () {
      // Trigger change event to acknowledge the modification
      Form.dataChanged();
    }); //  Add handlers for fullscreen mode buttons

    $('.fullscreen-toggle-btn').on('click', function () {
      var container = $(this).siblings('.application-code')[0];
      customFile.toggleFullScreen(container);
    }); // Add handler to recalculate sizes when exiting fullscreen mode

    document.addEventListener('fullscreenchange', customFile.adjustEditorHeight);
  },

  /**
   * Enable/disable fullscreen mode for a specific block.
   *
   * @param {HTMLElement} container - The container to expand to fullscreen.
   */
  toggleFullScreen: function toggleFullScreen(container) {
    if (!document.fullscreenElement) {
      container.requestFullscreen()["catch"](function (err) {
        console.error("Error attempting to enable full-screen mode: ".concat(err.message));
      });
    } else {
      document.exitFullscreen();
    }
  },

  /**
   * Recalculate editor heights when the screen mode changes.
   */
  adjustEditorHeight: function adjustEditorHeight() {
    var editors = [customFile.viewerOriginal, customFile.viewerResult, customFile.editor];
    editors.forEach(function (editor) {
      if (editor) {
        editor.resize();
      }
    });
  },

  /**
   * Callback function to be called before the form is sent
   * @param {Object} settings - The current settings of the form
   * @returns {Object} - The updated settings of the form
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    var result = settings; // IMPORTANT: Get mode BEFORE form('get values') to prevent dropdown from overriding it

    var mode = customFile.getCurrentMode(); // Get all form values

    result.data = customFile.$formObj.form('get values'); // Override mode with the correct value (from getCurrentMode)

    result.data.mode = mode; // Remove technical field from data

    delete result.data['mode-custom-value']; // Get content from Ace editor based on mode

    switch (mode) {
      case 'append':
      case 'override':
      case 'custom':
      case 'script':
        // Get content from Ace editor (not base64 encoded yet)
        if (!customFile.editor) {
          console.error('Editor is not initialized!');
          result.data.content = '';
        } else {
          var editorContent = customFile.editor.getValue();
          result.data.content = editorContent;
        }

        break;

      case 'none':
      default:
        // For 'none' mode, clear the content
        result.data.content = '';
    }

    return result;
  },

  /**
   * Callback function to be called after the form has been sent.
   * @param {Object} response - The response from the server after the form is sent
   */
  cbAfterSendForm: function cbAfterSendForm(response) {},

  /**
   * Initialize the form with custom settings
   */
  initializeForm: function initializeForm() {
    Form.$formObj = customFile.$formObj; // Configure REST API settings for Form

    Form.apiSettings = {
      enabled: true,
      apiObject: customFilesAPI,
      saveMethod: 'save',
      // Will use the smart save method that determines create/update
      autoDetectMethod: false,
      // We handle this in our save method
      idField: 'id'
    };
    Form.validateRules = customFile.validateRules; // Form validation rules

    Form.cbBeforeSendForm = customFile.cbBeforeSendForm; // Callback before form is sent

    Form.cbAfterSendForm = customFile.cbAfterSendForm; // Callback after form is sent

    Form.initialize();
  }
}; // Initialize the custom files modify form when the document is ready.

$(document).ready(function () {
  customFile.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DdXN0b21GaWxlcy9jdXN0b20tZmlsZXMtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbImN1c3RvbUZpbGUiLCIkZm9ybU9iaiIsIiQiLCIkdGFiTWVudSIsIiRtb2RlRHJvcERvd24iLCIkbW9kZUN1c3RvbUlucHV0IiwiJG9yaWdpbmFsVGFiIiwiJGVkaXRvclRhYiIsIiRyZXN1bHRUYWIiLCIkbWFpbkNvbnRhaW5lciIsIiRmaWxlcGF0aElucHV0IiwiJGZpbGVwYXRoRmllbGQiLCIkZmlsZXBhdGhUb29sdGlwSWNvbiIsImFsbG93ZWREaXJlY3RvcmllcyIsImVkaXRvciIsInZpZXdlck9yaWdpbmFsIiwidmlld2VyUmVzdWx0IiwidmFsaWRhdGVSdWxlcyIsIm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiY2ZfVmFsaWRhdGVOYW1lSXNFbXB0eSIsImJhc2U2NFRvVXRmOCIsImJhc2U2NFN0ciIsImJpbmFyeVN0cmluZyIsImF0b2IiLCJUZXh0RGVjb2RlciIsImJ5dGVzIiwiVWludDhBcnJheSIsImxlbmd0aCIsImkiLCJjaGFyQ29kZUF0IiwiZGVjb2RlIiwiZGVjb2RlVVJJQ29tcG9uZW50IiwiZXNjYXBlIiwiZSIsImNvbnNvbGUiLCJlcnJvciIsImdldEN1cnJlbnRNb2RlIiwiY3VzdG9tTW9kZVZhbHVlIiwidmFsIiwiZm9ybSIsInNldE1vZGUiLCJtb2RlIiwicGFyZW50IiwiaGlkZSIsImRyb3Bkb3duIiwic2hvdyIsInVwZGF0ZUZpbGVwYXRoRmllbGRTdGF0ZSIsImlzVXNlckNyZWF0ZWQiLCJmaWxlSWQiLCJwcm9wIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsInVwZGF0ZVRvb2x0aXBWaXNpYmlsaXR5IiwiaXNDdXN0b21Nb2RlIiwiaW5pdGlhbGl6ZVRvb2x0aXBzIiwiYWpheCIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJkYXRhVHlwZSIsInN1Y2Nlc3MiLCJyZXNwb25zZSIsImRhdGEiLCJ0b29sdGlwQ29uZmlncyIsImZpbGVwYXRoIiwiVG9vbHRpcEJ1aWxkZXIiLCJidWlsZENvbnRlbnQiLCJoZWFkZXIiLCJjZl9maWxlcGF0aF90b29sdGlwX2hlYWRlciIsImRlc2NyaXB0aW9uIiwiY2ZfZmlsZXBhdGhfdG9vbHRpcF9kZXNjIiwibGlzdCIsIm1hcCIsImRpciIsIm5vdGUiLCJjZl9maWxlcGF0aF90b29sdGlwX2F1dG9jcmVhdGUiLCJpbml0aWFsaXplIiwieGhyIiwic3RhdHVzIiwidGFiIiwib25WaXNpYmxlIiwib25DaGFuZ2VUYWIiLCJpbml0aWFsaXplQWNlIiwib25DaGFuZ2UiLCJjYk9uQ2hhbmdlTW9kZSIsInVybFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsIndpbmRvdyIsImxvY2F0aW9uIiwic2VhcmNoIiwidXJsSWQiLCJwYXRobmFtZSIsIm1hdGNoIiwiY3VzdG9tRmlsZXNBUEkiLCJnZXREZWZhdWx0IiwicmVzdWx0IiwiZm9ybURhdGEiLCJjb250ZW50IiwiZGVjb2RlZENvbnRlbnQiLCJzZXRWYWx1ZSIsImNsZWFyU2VsZWN0aW9uIiwiZ2V0UmVjb3JkIiwiYmFzZTY0Q29udGVudCIsImluaXRpYWxpemVGb3JtIiwidmFsdWUiLCJ0ZXh0IiwibG9hZE9yaWdpbmFsQ29udGVudEZvck92ZXJyaWRlIiwiaGlkZVNob3dDb2RlIiwiY3VycmVudFRhYiIsImZpbGVQYXRoIiwiRmlsZXNBUEkiLCJnZXRGaWxlQ29udGVudCIsImNiR2V0UmVzdWx0RmlsZUNvbnRlbnRGcm9tU2VydmVyIiwiY2JHZXRPcmlnaW5hbEZpbGVDb250ZW50RnJvbVNlcnZlciIsImdldFZhbHVlIiwiJG9yaWdpbmFsVGFiTWVudUl0ZW0iLCIkcmVzdWx0VGFiTWVudUl0ZW0iLCJuYXZpZ2F0ZUZpbGVTdGFydCIsIm5hdmlnYXRlRmlsZUVuZCIsInRyaW0iLCJzZXRUaGVtZSIsInVuZGVmaW5lZCIsImFjZVZpZXdlciIsInNjcm9sbFRvcCIsInNlc3Npb24iLCJnZXRTY3JvbGxUb3AiLCJzZXRTY3JvbGxUb3AiLCJjdXJyZW50Q29udGVudCIsIm9yaWdpbmFsQ29udGVudCIsImFjZUhlaWdodCIsImlubmVySGVpZ2h0Iiwicm93c0NvdW50IiwiTWF0aCIsInJvdW5kIiwiY3NzIiwiSW5pTW9kZSIsImFjZSIsInJlcXVpcmUiLCJNb2RlIiwiZWRpdCIsInNldE9wdGlvbnMiLCJzaG93UHJpbnRNYXJnaW4iLCJyZWFkT25seSIsIm1pbkxpbmVzIiwib24iLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJjb250YWluZXIiLCJzaWJsaW5ncyIsInRvZ2dsZUZ1bGxTY3JlZW4iLCJkb2N1bWVudCIsImFkZEV2ZW50TGlzdGVuZXIiLCJhZGp1c3RFZGl0b3JIZWlnaHQiLCJmdWxsc2NyZWVuRWxlbWVudCIsInJlcXVlc3RGdWxsc2NyZWVuIiwiZXJyIiwibWVzc2FnZSIsImV4aXRGdWxsc2NyZWVuIiwiZWRpdG9ycyIsImZvckVhY2giLCJyZXNpemUiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJlZGl0b3JDb250ZW50IiwiY2JBZnRlclNlbmRGb3JtIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImF1dG9EZXRlY3RNZXRob2QiLCJpZEZpZWxkIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsVUFBVSxHQUFHO0FBRWY7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMsbUJBQUQsQ0FOSTs7QUFRZjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVELENBQUMsQ0FBQywwQkFBRCxDQVpJOztBQWNmO0FBQ0o7QUFDQTtBQUNBO0FB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LGdCQUFuQyxDQWJhLENBYXdDOztBQUNyRGhCLElBQUFBLElBQUksQ0FBQ21CLGVBQUwsR0FBdUJ4SyxVQUFVLENBQUN3SyxlQUFsQyxDQWRhLENBY3NDOztBQUNuRG5CLElBQUFBLElBQUksQ0FBQ3JFLFVBQUw7QUFDSDtBQWp4QmMsQ0FBbkIsQyxDQW94QkE7O0FBQ0E5RSxDQUFDLENBQUN3SixRQUFELENBQUQsQ0FBWXFCLEtBQVosQ0FBa0IsWUFBTTtBQUNwQi9LLEVBQUFBLFVBQVUsQ0FBQ2dGLFVBQVg7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsZ2xvYmFsVHJhbnNsYXRlLCBhY2UsIEZvcm0sIEZpbGVzQVBJLCBjdXN0b21GaWxlc0FQSSwgUGJ4QXBpQ2xpZW50LCBUb29sdGlwQnVpbGRlciAqL1xuXG5cbi8qKlxuICogTW9kdWxlIGN1c3RvbUZpbGVcbiAqIFRoaXMgbW9kdWxlIG1hbmFnZXMgZmlsZSBpbnRlcmFjdGlvbnMgaW4gYSBVSSwgc3VjaCBhcyBsb2FkaW5nIGZpbGUgY29udGVudCBmcm9tIGEgc2VydmVyIGFuZCBoYW5kbGluZyB1c2VyIGlucHV0LlxuICogQG1vZHVsZSBjdXN0b21GaWxlXG4gKi9cbmNvbnN0IGN1c3RvbUZpbGUgPSB7XG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjY3VzdG9tLWZpbGUtZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHRhYiBtZW51LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHRhYk1lbnU6ICQoJyNjdXN0b20tZmlsZXMtbWVudSAuaXRlbScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIG1vZGUgc2VsZWN0LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG1vZGVEcm9wRG93bjogJCgnI21vZGUtZHJvcGRvd24nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBoaWRkZW4gY3VzdG9tIG1vZGUgaW5wdXQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbW9kZUN1c3RvbUlucHV0OiAkKCcjbW9kZS1jdXN0b20tdmFsdWUnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB0YWIgd2l0aCBvcmlnaW5hbCBmaWxlIGNvbnRlbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkb3JpZ2luYWxUYWI6ICQoJ2FbZGF0YS10YWI9XCJvcmlnaW5hbFwiXScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHRhYiB3aXRoIHVzZXIgY29udGVudC9zY3JpcHQgZWRpdG9yLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGVkaXRvclRhYjogJCgnYVtkYXRhLXRhYj1cImVkaXRvclwiXScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHRhYiB3aXRoIHJlc3VsdGVkIGZpbGUgY29udGVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRyZXN1bHRUYWI6ICQoJ2FbZGF0YS10YWI9XCJyZXN1bHRcIl0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBlbGVtZW50IGZvciB0aGUgbWFpbiBjb250ZW50IGNvbnRhaW5lci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRtYWluQ29udGFpbmVyOiAkKCcjbWFpbi1jb250ZW50LWNvbnRhaW5lcicpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZpbGVwYXRoIGlucHV0IGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZpbGVwYXRoSW5wdXQ6ICQoJyNmaWxlcGF0aCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZpbGVwYXRoIGZpZWxkIGNvbnRhaW5lci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmaWxlcGF0aEZpZWxkOiAkKCcjZmlsZXBhdGgtZmllbGQnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB0b29sdGlwIGljb24gaW4gZmlsZXBhdGggZmllbGQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZmlsZXBhdGhUb29sdGlwSWNvbjogJCgnI2ZpbGVwYXRoLWZpZWxkIC5maWVsZC1pbmZvLWljb24nKSxcblxuICAgIC8qKlxuICAgICAqIENhY2hlZCBhbGxvd2VkIGRpcmVjdG9yaWVzIGZyb20gc2VydmVyXG4gICAgICogQHR5cGUge0FycmF5fG51bGx9XG4gICAgICovXG4gICAgYWxsb3dlZERpcmVjdG9yaWVzOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogQWNlIGVkaXRvciBpbnN0YW5jZXNcbiAgICAgKiBgZWRpdG9yYCBpcyBmb3IgaW5wdXQgYW5kIGB2aWV3ZXJzYCBpcyBmb3IgZGlzcGxheSBjb2RlIGZyb20gc2VydmVyXG4gICAgICovXG4gICAgZWRpdG9yOiAnJyxcbiAgICB2aWV3ZXJPcmlnaW5hbDogJycsXG4gICAgdmlld2VyUmVzdWx0OiAnJyxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBuYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZmlsZXBhdGgnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmNmX1ZhbGlkYXRlTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERlY29kZSBiYXNlNjQgc3RyaW5nIHRvIFVURi04XG4gICAgICogSGFuZGxlcyBVbmljb2RlIGNoYXJhY3RlcnMgKFJ1c3NpYW4sIENoaW5lc2UsIGV0Yy4pXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYmFzZTY0U3RyIC0gQmFzZTY0IGVuY29kZWQgc3RyaW5nXG4gICAgICogQHJldHVybnMge3N0cmluZ30gVVRGLTggZGVjb2RlZCBzdHJpbmdcbiAgICAgKi9cbiAgICBiYXNlNjRUb1V0ZjgoYmFzZTY0U3RyKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBEZWNvZGUgYmFzZTY0IHRvIGJpbmFyeSBzdHJpbmdcbiAgICAgICAgICAgIGNvbnN0IGJpbmFyeVN0cmluZyA9IGF0b2IoYmFzZTY0U3RyKTtcblxuICAgICAgICAgICAgLy8gVXNlIFRleHREZWNvZGVyIGZvciBtb2Rlcm4gYnJvd3NlcnNcbiAgICAgICAgICAgIGlmICh0eXBlb2YgVGV4dERlY29kZXIgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYnl0ZXMgPSBuZXcgVWludDhBcnJheShiaW5hcnlTdHJpbmcubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGJpbmFyeVN0cmluZy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBieXRlc1tpXSA9IGJpbmFyeVN0cmluZy5jaGFyQ29kZUF0KGkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFRleHREZWNvZGVyKCkuZGVjb2RlKGJ5dGVzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRmFsbGJhY2sgZm9yIG9sZGVyIGJyb3dzZXJzXG4gICAgICAgICAgICAgICAgcmV0dXJuIGRlY29kZVVSSUNvbXBvbmVudChlc2NhcGUoYmluYXJ5U3RyaW5nKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGRlY29kZSBiYXNlNjQ6JywgZSk7XG4gICAgICAgICAgICByZXR1cm4gYmFzZTY0U3RyOyAvLyBSZXR1cm4gYXMtaXMgaWYgZGVjb2RlIGZhaWxzXG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGN1cnJlbnQgbW9kZSB2YWx1ZSAoZnJvbSBkcm9wZG93biBvciBoaWRkZW4gaW5wdXQgZm9yIGN1c3RvbSBtb2RlKVxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEN1cnJlbnQgbW9kZSB2YWx1ZVxuICAgICAqL1xuICAgIGdldEN1cnJlbnRNb2RlKCkge1xuICAgICAgICAvLyBDaGVjayBpZiBjdXN0b20gbW9kZSBpcyBhY3RpdmUgKGhpZGRlbiBpbnB1dCBoYXMgdmFsdWUpXG4gICAgICAgIGNvbnN0IGN1c3RvbU1vZGVWYWx1ZSA9IGN1c3RvbUZpbGUuJG1vZGVDdXN0b21JbnB1dC52YWwoKTtcbiAgICAgICAgaWYgKGN1c3RvbU1vZGVWYWx1ZSA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgIHJldHVybiAnY3VzdG9tJztcbiAgICAgICAgfVxuICAgICAgICAvLyBPdGhlcndpc2UgcmV0dXJuIGRyb3Bkb3duIHZhbHVlXG4gICAgICAgIHJldHVybiBjdXN0b21GaWxlLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdtb2RlJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNldCBtb2RlIHZhbHVlICh1c2luZyBkcm9wZG93biBmb3Igc3RhbmRhcmQgbW9kZXMsIGhpZGRlbiBpbnB1dCBmb3IgY3VzdG9tIG1vZGUpXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IG1vZGUgLSBNb2RlIHRvIHNldFxuICAgICAqL1xuICAgIHNldE1vZGUobW9kZSkge1xuICAgICAgICBpZiAobW9kZSA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgIC8vIFNldCBjdXN0b20gbW9kZSB2aWEgaGlkZGVuIGlucHV0XG4gICAgICAgICAgICBjdXN0b21GaWxlLiRtb2RlQ3VzdG9tSW5wdXQudmFsKCdjdXN0b20nKTtcbiAgICAgICAgICAgIC8vIEhpZGUgZHJvcGRvd24gZm9yIGN1c3RvbSBmaWxlc1xuICAgICAgICAgICAgY3VzdG9tRmlsZS4kbW9kZURyb3BEb3duLnBhcmVudCgpLnBhcmVudCgpLmhpZGUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIENsZWFyIGN1c3RvbSBtb2RlXG4gICAgICAgICAgICBjdXN0b21GaWxlLiRtb2RlQ3VzdG9tSW5wdXQudmFsKCcnKTtcbiAgICAgICAgICAgIC8vIFNldCBzdGFuZGFyZCBtb2RlIHZpYSBkcm9wZG93blxuICAgICAgICAgICAgY3VzdG9tRmlsZS4kbW9kZURyb3BEb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBtb2RlKTtcbiAgICAgICAgICAgIC8vIFNob3cgZHJvcGRvd25cbiAgICAgICAgICAgIGN1c3RvbUZpbGUuJG1vZGVEcm9wRG93bi5wYXJlbnQoKS5wYXJlbnQoKS5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlcyB0aGUgZmlsZXBhdGggZmllbGQgc3RhdGUgYmFzZWQgb24gd2hldGhlciB0aGUgZmlsZSBpcyB1c2VyLWNyZWF0ZWQgKE1PREVfQ1VTVE9NKSBvciBzeXN0ZW0tbWFuYWdlZC5cbiAgICAgKiBVc2VyLWNyZWF0ZWQgZmlsZXMgaGF2ZSBlZGl0YWJsZSBmaWxlcGF0aCBidXQgY2Fubm90IGJlIGNyZWF0ZWQgKG9ubHkgZm9yIG5ldyBmaWxlcyksXG4gICAgICogc3lzdGVtLW1hbmFnZWQgZmlsZXMgaGF2ZSByZWFkLW9ubHkgZmlsZXBhdGguXG4gICAgICovXG4gICAgdXBkYXRlRmlsZXBhdGhGaWVsZFN0YXRlKCkge1xuICAgICAgICBjb25zdCBtb2RlID0gY3VzdG9tRmlsZS5nZXRDdXJyZW50TW9kZSgpO1xuICAgICAgICBjb25zdCBpc1VzZXJDcmVhdGVkID0gbW9kZSA9PT0gJ2N1c3RvbSc7XG4gICAgICAgIGNvbnN0IGZpbGVJZCA9IGN1c3RvbUZpbGUuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2lkJyk7XG5cbiAgICAgICAgaWYgKGlzVXNlckNyZWF0ZWQpIHtcbiAgICAgICAgICAgIGlmICghZmlsZUlkIHx8IGZpbGVJZCA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAvLyBOZXcgY3VzdG9tIGZpbGUgLSBmaWxlcGF0aCBpcyBlZGl0YWJsZVxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGZpbGVwYXRoSW5wdXQucHJvcCgncmVhZG9ubHknLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZmlsZXBhdGhGaWVsZC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRXhpc3RpbmcgY3VzdG9tIGZpbGUgLSBmaWxlcGF0aCBpcyByZWFkLW9ubHkgKGNhbm5vdCBiZSBjaGFuZ2VkIGFmdGVyIGNyZWF0aW9uKVxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGZpbGVwYXRoSW5wdXQucHJvcCgncmVhZG9ubHknLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRmaWxlcGF0aEZpZWxkLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gQWx3YXlzIGhpZGUgbW9kZSBzZWxlY3RvciBmb3IgY3VzdG9tIGZpbGVzXG4gICAgICAgICAgICBjdXN0b21GaWxlLiRtb2RlRHJvcERvd24ucGFyZW50KCkucGFyZW50KCkuaGlkZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gU3lzdGVtLW1hbmFnZWQgZmlsZSAtIGZpbGVwYXRoIGlzIGFsd2F5cyByZWFkLW9ubHlcbiAgICAgICAgICAgIGN1c3RvbUZpbGUuJGZpbGVwYXRoSW5wdXQucHJvcCgncmVhZG9ubHknLCB0cnVlKTtcbiAgICAgICAgICAgIGN1c3RvbUZpbGUuJGZpbGVwYXRoRmllbGQuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAvLyBTaG93IG1vZGUgc2VsZWN0b3IgZm9yIHN5c3RlbSBmaWxlc1xuICAgICAgICAgICAgY3VzdG9tRmlsZS4kbW9kZURyb3BEb3duLnBhcmVudCgpLnBhcmVudCgpLnNob3coKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSB0b29sdGlwIHZpc2liaWxpdHkgYmFzZWQgb24gbW9kZVxuICAgICAgICBjdXN0b21GaWxlLnVwZGF0ZVRvb2x0aXBWaXNpYmlsaXR5KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0b29sdGlwIGljb24gdmlzaWJpbGl0eSBiYXNlZCBvbiBjdXJyZW50IG1vZGVcbiAgICAgKiBUb29sdGlwIGlzIG9ubHkgc2hvd24gZm9yIE1PREVfQ1VTVE9NIGZpbGVzXG4gICAgICovXG4gICAgdXBkYXRlVG9vbHRpcFZpc2liaWxpdHkoKSB7XG4gICAgICAgIGNvbnN0IG1vZGUgPSBjdXN0b21GaWxlLmdldEN1cnJlbnRNb2RlKCk7XG4gICAgICAgIGNvbnN0IGlzQ3VzdG9tTW9kZSA9IG1vZGUgPT09ICdjdXN0b20nO1xuXG4gICAgICAgIGlmIChpc0N1c3RvbU1vZGUpIHtcbiAgICAgICAgICAgIGN1c3RvbUZpbGUuJGZpbGVwYXRoVG9vbHRpcEljb24uc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY3VzdG9tRmlsZS4kZmlsZXBhdGhUb29sdGlwSWNvbi5oaWRlKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHNcbiAgICAgKiBMb2FkcyBhbGxvd2VkIGRpcmVjdG9yaWVzIGZyb20gc2VydmVyIGFuZCBzZXRzIHVwIHRvb2x0aXAgY29udGVudFxuICAgICAqL1xuICAgIGluaXRpYWxpemVUb29sdGlwcygpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBqUXVlcnkgb2JqZWN0IGFmdGVyIERPTSBpcyByZWFkeVxuICAgICAgICBjdXN0b21GaWxlLiRmaWxlcGF0aFRvb2x0aXBJY29uID0gJCgnI2ZpbGVwYXRoLWZpZWxkIC5maWVsZC1pbmZvLWljb24nKTtcblxuICAgICAgICAvLyBGZXRjaCBhbGxvd2VkIGRpcmVjdG9yaWVzIGZyb20gc2VydmVyXG4gICAgICAgICQuYWpheCh7XG4gICAgICAgICAgICB1cmw6IGAke2dsb2JhbFJvb3RVcmx9Y3VzdG9tLWZpbGVzL2dldEFsbG93ZWREaXJlY3Rvcmllc2AsXG4gICAgICAgICAgICB0eXBlOiAnR0VUJyxcbiAgICAgICAgICAgIGRhdGFUeXBlOiAnanNvbicsXG4gICAgICAgICAgICBzdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnN1Y2Nlc3MgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLmFsbG93ZWREaXJlY3RvcmllcyA9IHJlc3BvbnNlLmRhdGE7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gQnVpbGQgdG9vbHRpcCBjb25maWd1cmF0aW9uXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRvb2x0aXBDb25maWdzID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZmlsZXBhdGg6IFRvb2x0aXBCdWlsZGVyLmJ1aWxkQ29udGVudCh7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuY2ZfZmlsZXBhdGhfdG9vbHRpcF9oZWFkZXIgfHwgJ0FsbG93ZWQgZGlyZWN0b3JpZXMnLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuY2ZfZmlsZXBhdGhfdG9vbHRpcF9kZXNjIHx8ICdGb3IgTU9ERV9DVVNUT00gZmlsZXMsIHlvdSBjYW4gb25seSBjcmVhdGUgZmlsZXMgaW4gdGhlIGZvbGxvd2luZyBkaXJlY3RvcmllczonLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxpc3Q6IGN1c3RvbUZpbGUuYWxsb3dlZERpcmVjdG9yaWVzLm1hcChkaXIgPT4gYDxjb2RlPiR7ZGlyfTwvY29kZT5gKSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuY2ZfZmlsZXBhdGhfdG9vbHRpcF9hdXRvY3JlYXRlIHx8ICdTdWJkaXJlY3RvcmllcyBhcmUgY3JlYXRlZCBhdXRvbWF0aWNhbGx5IGlmIHNwZWNpZmllZCBpbiB0aGUgZmlsZSBwYXRoLiBGb3IgZXhhbXBsZTogL2V0Yy9jdXN0b20tY29uZmlncy9teWFwcC9jb25maWcuaW5pJ1xuICAgICAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzIHVzaW5nIFRvb2x0aXBCdWlsZGVyXG4gICAgICAgICAgICAgICAgICAgIFRvb2x0aXBCdWlsZGVyLmluaXRpYWxpemUodG9vbHRpcENvbmZpZ3MpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB2aXNpYmlsaXR5IGJhc2VkIG9uIGN1cnJlbnQgbW9kZVxuICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLnVwZGF0ZVRvb2x0aXBWaXNpYmlsaXR5KCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIGxvYWQgYWxsb3dlZCBkaXJlY3RvcmllcycpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlcnJvcih4aHIsIHN0YXR1cywgZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBsb2FkaW5nIGFsbG93ZWQgZGlyZWN0b3JpZXM6JywgZXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGN1c3RvbUZpbGUgbW9kdWxlLlxuICAgICAqIFNldHMgdXAgdGhlIGRyb3Bkb3duLCBpbml0aWFsaXplcyBBY2UgZWRpdG9yLCBmb3JtLCBhbmQgcmV0cmlldmVzIGZpbGUgY29udGVudCBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGpRdWVyeSBvYmplY3RzIGFmdGVyIERPTSBpcyByZWFkeVxuICAgICAgICBjdXN0b21GaWxlLiRmaWxlcGF0aElucHV0ID0gJCgnI2ZpbGVwYXRoJyk7XG4gICAgICAgIGN1c3RvbUZpbGUuJGZpbGVwYXRoRmllbGQgPSAkKCcjZmlsZXBhdGgtZmllbGQnKTtcbiAgICAgICAgY3VzdG9tRmlsZS4kbW9kZURyb3BEb3duID0gJCgnI21vZGUtZHJvcGRvd24nKTtcbiAgICAgICAgY3VzdG9tRmlsZS4kbW9kZUN1c3RvbUlucHV0ID0gJCgnI21vZGUtY3VzdG9tLXZhbHVlJyk7XG4gICAgICAgIGN1c3RvbUZpbGUuJGZpbGVwYXRoVG9vbHRpcEljb24gPSAkKCcjZmlsZXBhdGgtZmllbGQgLmZpZWxkLWluZm8taWNvbicpO1xuXG4gICAgICAgIC8vIEVuYWJsZSB0YWIgbmF2aWdhdGlvbiB3aXRoIGhpc3Rvcnkgc3VwcG9ydFxuICAgICAgICBjdXN0b21GaWxlLiR0YWJNZW51LnRhYih7XG4gICAgICAgICAgICBvblZpc2libGU6IGN1c3RvbUZpbGUub25DaGFuZ2VUYWJcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY3VzdG9tRmlsZS4kbWFpbkNvbnRhaW5lci5yZW1vdmVDbGFzcygnY29udGFpbmVyJyk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBBY2UgZWRpdG9yXG4gICAgICAgIGN1c3RvbUZpbGUuaW5pdGlhbGl6ZUFjZSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHNcbiAgICAgICAgY3VzdG9tRmlsZS5pbml0aWFsaXplVG9vbHRpcHMoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIG9yIHJlaW5pdGlhbGl6ZSBkcm9wZG93blxuICAgICAgICBpZiAoY3VzdG9tRmlsZS4kbW9kZURyb3BEb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGN1c3RvbUZpbGUuJG1vZGVEcm9wRG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6IGN1c3RvbUZpbGUuY2JPbkNoYW5nZU1vZGVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gR2V0IGZpbGUgSUQgZnJvbSBVUkwgb3IgZm9ybVxuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICBjb25zdCB1cmxJZCA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5tYXRjaCgvbW9kaWZ5XFwvKFxcZCspLyk7XG4gICAgICAgIGNvbnN0IGZpbGVJZCA9IHVybElkID8gdXJsSWRbMV0gOiBjdXN0b21GaWxlLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdpZCcpO1xuXG4gICAgICAgIGlmICghZmlsZUlkIHx8IGZpbGVJZCA9PT0gJycpIHtcbiAgICAgICAgICAgIC8vIExvYWQgZGVmYXVsdCB2YWx1ZXMgZm9yIG5ldyBjdXN0b20gZmlsZVxuICAgICAgICAgICAgY3VzdG9tRmlsZXNBUEkuZ2V0RGVmYXVsdCgocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU3RvcmUgbW9kZSBzZXBhcmF0ZWx5IHRvIGhhbmRsZSBpdCBjb3JyZWN0bHlcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbW9kZSA9IHJlc3BvbnNlLmRhdGEubW9kZSB8fCAnbm9uZSc7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlIG1vZGUgZnJvbSByZXNwb25zZSBiZWZvcmUgc2V0dGluZyBmb3JtIHZhbHVlc1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBmb3JtRGF0YSA9IHsuLi5yZXNwb25zZS5kYXRhfTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGZvcm1EYXRhLm1vZGU7ICAvLyBEb24ndCBsZXQgZm9ybSgnc2V0IHZhbHVlcycpIGhhbmRsZSBtb2RlXG5cbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IGRlZmF1bHQgdmFsdWVzIHRvIGZvcm0gZmllbGRzICh3aXRob3V0IG1vZGUpXG4gICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlcycsIGZvcm1EYXRhKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBGb3IgbmV3IGZpbGVzIHdpdGggTU9ERV9DVVNUT01cbiAgICAgICAgICAgICAgICAgICAgaWYgKG1vZGUgPT09ICdjdXN0b20nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBNYWtlIGZpbGVwYXRoIGVkaXRhYmxlIGZvciBuZXcgY3VzdG9tIGZpbGVzXG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRmaWxlcGF0aElucHV0LnByb3AoJ3JlYWRvbmx5JywgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZmlsZXBhdGhGaWVsZC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2V0IG1vZGUgdG8gJ2N1c3RvbScgdXNpbmcgaGlkZGVuIGlucHV0XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLnNldE1vZGUoJ2N1c3RvbScpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTaG93IHRvb2x0aXAgaWNvbiBmb3IgTU9ERV9DVVNUT01cbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUudXBkYXRlVG9vbHRpcFZpc2liaWxpdHkoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBvbmx5IGVkaXRvciB0YWIgZm9yIGN1c3RvbSBtb2RlXG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiR0YWJNZW51LnRhYignY2hhbmdlIHRhYicsICdlZGl0b3InKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGVkaXRvclRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRvcmlnaW5hbFRhYi5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRyZXN1bHRUYWIuaGlkZSgpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBIaWRlIG90aGVyIHRhYiBtZW51IGl0ZW1zXG4gICAgICAgICAgICAgICAgICAgICAgICAkKCcuaXRlbVtkYXRhLXRhYj1cIm9yaWdpbmFsXCJdJykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJCgnLml0ZW1bZGF0YS10YWI9XCJyZXN1bHRcIl0nKS5oaWRlKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZW1wdHkgY29udGVudCBpbiBlZGl0b3IgZm9yIG5ldyBjdXN0b20gZmlsZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmNvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBJZiBkZWZhdWx0IGNvbnRlbnQgcHJvdmlkZWQgKGJhc2U2NCksIGRlY29kZSBpdCB3aXRoIFVURi04IHN1cHBvcnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkZWNvZGVkQ29udGVudCA9IGN1c3RvbUZpbGUuYmFzZTY0VG9VdGY4KHJlc3BvbnNlLmRhdGEuY29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2V0VmFsdWUoZGVjb2RlZENvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTZXQgZW1wdHkgY29udGVudCBmb3IgbmV3IGN1c3RvbSBmaWxlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2V0VmFsdWUoJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3IuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBvdGhlciBtb2RlcywgdXNlIHN0YW5kYXJkIGJlaGF2aW9yIChtb2RlIGFscmVhZHkgZXh0cmFjdGVkIGFib3ZlKVxuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5zZXRNb2RlKG1vZGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5jYk9uQ2hhbmdlTW9kZShtb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUudXBkYXRlRmlsZXBhdGhGaWVsZFN0YXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIExvYWQgZXhpc3RpbmcgZmlsZSBkYXRhIHZpYSBSRVNUIEFQSVxuICAgICAgICAgICAgY3VzdG9tRmlsZXNBUEkuZ2V0UmVjb3JkKGZpbGVJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFN0b3JlIGJhc2U2NCBjb250ZW50IHNlcGFyYXRlbHkgYW5kIHJlbW92ZSBmcm9tIGZvcm0gZGF0YVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBiYXNlNjRDb250ZW50ID0gcmVzcG9uc2UuZGF0YS5jb250ZW50O1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFN0b3JlIG1vZGUgc2VwYXJhdGVseSB0byBoYW5kbGUgaXQgY29ycmVjdGx5XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vZGUgPSByZXNwb25zZS5kYXRhLm1vZGUgfHwgJ25vbmUnO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBjb250ZW50IGFuZCBtb2RlIGZyb20gcmVzcG9uc2UgYmVmb3JlIHNldHRpbmcgZm9ybSB2YWx1ZXNcbiAgICAgICAgICAgICAgICAgICAgLy8gKGNvbnRlbnQgd2lsbCBiZSB0YWtlbiBmcm9tIEFDRSBlZGl0b3Igb24gc2F2ZSwgbW9kZSB3aWxsIGJlIHNldCBzZXBhcmF0ZWx5KVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBmb3JtRGF0YSA9IHsuLi5yZXNwb25zZS5kYXRhfTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGZvcm1EYXRhLmNvbnRlbnQ7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBmb3JtRGF0YS5tb2RlOyAgLy8gRG9uJ3QgbGV0IGZvcm0oJ3NldCB2YWx1ZXMnKSBoYW5kbGUgbW9kZVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCBmb3JtIHZhbHVlcyBmcm9tIEFQSSByZXNwb25zZSAod2l0aG91dCBjb250ZW50IGFuZCBtb2RlKVxuICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZXMnLCBmb3JtRGF0YSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRGVjb2RlIGJhc2U2NCBjb250ZW50IGFuZCBzZXQgaW4gZWRpdG9yIHdpdGggVVRGLTggc3VwcG9ydFxuICAgICAgICAgICAgICAgICAgICBpZiAoYmFzZTY0Q29udGVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVjb2RlZENvbnRlbnQgPSBjdXN0b21GaWxlLmJhc2U2NFRvVXRmOChiYXNlNjRDb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLnNldFZhbHVlKGRlY29kZWRDb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBTZXQgbW9kZSBhbmQgdHJpZ2dlciBVSSB1cGRhdGUgKG1vZGUgYWxyZWFkeSBleHRyYWN0ZWQgYWJvdmUpXG4gICAgICAgICAgICAgICAgICAgIGlmIChtb2RlID09PSAnY3VzdG9tJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRm9yIGV4aXN0aW5nIGN1c3RvbSBmaWxlcyAtIGZpbGVwYXRoIGlzIHJlYWQtb25seVxuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZmlsZXBhdGhJbnB1dC5wcm9wKCdyZWFkb25seScsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZmlsZXBhdGhGaWVsZC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2V0IG1vZGUgdG8gJ2N1c3RvbScgdXNpbmcgaGlkZGVuIGlucHV0XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLnNldE1vZGUoJ2N1c3RvbScpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTaG93IHRvb2x0aXAgaWNvbiBmb3IgTU9ERV9DVVNUT00gKGV2ZW4gZm9yIHJlYWQtb25seSBmaWxlcylcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUudXBkYXRlVG9vbHRpcFZpc2liaWxpdHkoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBvbmx5IGVkaXRvciB0YWIgZm9yIGN1c3RvbSBtb2RlXG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiR0YWJNZW51LnRhYignY2hhbmdlIHRhYicsICdlZGl0b3InKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGVkaXRvclRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRvcmlnaW5hbFRhYi5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRyZXN1bHRUYWIuaGlkZSgpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBIaWRlIG90aGVyIHRhYiBtZW51IGl0ZW1zXG4gICAgICAgICAgICAgICAgICAgICAgICAkKCcuaXRlbVtkYXRhLXRhYj1cIm9yaWdpbmFsXCJdJykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJCgnLml0ZW1bZGF0YS10YWI9XCJyZXN1bHRcIl0nKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGb3Igc3lzdGVtIGZpbGVzIC0gdXNlIHN0YW5kYXJkIGJlaGF2aW9yXG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLnNldE1vZGUobW9kZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLmNiT25DaGFuZ2VNb2RlKG1vZGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS51cGRhdGVGaWxlcGF0aEZpZWxkU3RhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElmIGxvYWRpbmcgZmFpbHMsIHJlZGlyZWN0IHRvIGluZGV4XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9Y3VzdG9tLWZpbGVzL2luZGV4YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZm9ybVxuICAgICAgICBjdXN0b21GaWxlLmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZm9yIHdoZW4gdGhlIGNvZGUgbW9kZSBjaGFuZ2VzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHNlbGVjdGVkIHZhbHVlIGZyb20gdGhlIGRyb3Bkb3duLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGhlIHNlbGVjdGVkIHRleHQgZnJvbSB0aGUgZHJvcGRvd24uXG4gICAgICovXG4gICAgY2JPbkNoYW5nZU1vZGUodmFsdWUsIHRleHQpe1xuICAgICAgICAvLyBIYW5kbGUgY29kZSB2aXNpYmlsaXR5IGFuZCBjb250ZW50IGJhc2VkIG9uIHRoZSAnbW9kZSdcbiAgICAgICAgc3dpdGNoICh2YWx1ZSkge1xuICAgICAgICAgICAgY2FzZSAnbm9uZSc6XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kdGFiTWVudS50YWIoJ2NoYW5nZSB0YWInLCdvcmlnaW5hbCcpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnb3ZlcnJpZGUnOlxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHRhYk1lbnUudGFiKCdjaGFuZ2UgdGFiJywnZWRpdG9yJyk7XG4gICAgICAgICAgICAgICAgLy8gTG9hZCBvcmlnaW5hbCBmaWxlIGNvbnRlbnQgaW50byBlZGl0b3IgaWYgaXQncyBlbXB0eVxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUubG9hZE9yaWdpbmFsQ29udGVudEZvck92ZXJyaWRlKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdjdXN0b20nOiAgLy8gQ3VzdG9tIG1vZGUgYmVoYXZlcyBsaWtlIG92ZXJyaWRlXG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kdGFiTWVudS50YWIoJ2NoYW5nZSB0YWInLCdlZGl0b3InKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2FwcGVuZCc6XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kdGFiTWVudS50YWIoJ2NoYW5nZSB0YWInLCdlZGl0b3InKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3NjcmlwdCc6XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kdGFiTWVudS50YWIoJ2NoYW5nZSB0YWInLCdlZGl0b3InKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kdGFiTWVudS50YWIoJ2NoYW5nZSB0YWInLCdvcmlnaW5hbCcpO1xuICAgICAgICB9XG4gICAgICAgIGN1c3RvbUZpbGUuaGlkZVNob3dDb2RlKCk7XG5cbiAgICAgICAgLy8gVXBkYXRlIHRvb2x0aXAgdmlzaWJpbGl0eSB3aGVuIG1vZGUgY2hhbmdlc1xuICAgICAgICBjdXN0b21GaWxlLnVwZGF0ZVRvb2x0aXBWaXNpYmlsaXR5KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEV2ZW50IGhhbmRsZXIgZm9yIHRhYiBjaGFuZ2VzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGN1cnJlbnRUYWIgLSBUaGUgY3VycmVudCB0YWIgdGhhdCBpcyB2aXNpYmxlLlxuICAgICAqL1xuICAgIG9uQ2hhbmdlVGFiKGN1cnJlbnRUYWIpe1xuICAgICAgICBjb25zdCBmaWxlUGF0aCA9IGN1c3RvbUZpbGUuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2ZpbGVwYXRoJyk7XG4gICAgICAgIHN3aXRjaCAoY3VycmVudFRhYikge1xuICAgICAgICAgICAgY2FzZSAncmVzdWx0JzpcbiAgICAgICAgICAgICAgICAkKCcudGFiW2RhdGEtdGFiPVwicmVzdWx0XCJdJykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBGaWxlc0FQSS5nZXRGaWxlQ29udGVudChmaWxlUGF0aCwgY3VzdG9tRmlsZS5jYkdldFJlc3VsdEZpbGVDb250ZW50RnJvbVNlcnZlciwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnb3JpZ2luYWwnOlxuICAgICAgICAgICAgICAgICQoJy50YWJbZGF0YS10YWI9XCJvcmlnaW5hbFwiXScpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgRmlsZXNBUEkuZ2V0RmlsZUNvbnRlbnQoZmlsZVBhdGgsIGN1c3RvbUZpbGUuY2JHZXRPcmlnaW5hbEZpbGVDb250ZW50RnJvbVNlcnZlciwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdlZGl0b3InOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgdGhlIHZpc2liaWxpdHkgYW5kIGNvbnRlbnQgb2YgY29kZSBiYXNlZCBvbiB0aGUgJ21vZGUnIGZvcm0gdmFsdWUuXG4gICAgICogQWRqdXN0cyB0aGUgQWNlIGVkaXRvciBzZXR0aW5ncyBhY2NvcmRpbmdseS5cbiAgICAgKi9cbiAgICBoaWRlU2hvd0NvZGUoKSB7XG4gICAgICAgIC8vIFJldHJpZXZlICdtb2RlJyB2YWx1ZSAoZnJvbSBkcm9wZG93biBvciBoaWRkZW4gaW5wdXQgZm9yIGN1c3RvbSBtb2RlKVxuICAgICAgICBjb25zdCBtb2RlID0gY3VzdG9tRmlsZS5nZXRDdXJyZW50TW9kZSgpO1xuXG4gICAgICAgIC8vIEdldCBjdXJyZW50IGNvbnRlbnQgZnJvbSBlZGl0b3IgKG5vdCBmcm9tIGZvcm0sIGFzIGZvcm0gZG9lc24ndCBoYXZlIGl0IGFueW1vcmUpXG4gICAgICAgIGxldCBjb250ZW50ID0gY3VzdG9tRmlsZS5lZGl0b3IuZ2V0VmFsdWUoKTtcblxuICAgICAgICAvLyBHZXQgdGFiIG1lbnUgaXRlbXNcbiAgICAgICAgY29uc3QgJG9yaWdpbmFsVGFiTWVudUl0ZW0gPSAkKCcuaXRlbVtkYXRhLXRhYj1cIm9yaWdpbmFsXCJdJyk7XG4gICAgICAgIGNvbnN0ICRyZXN1bHRUYWJNZW51SXRlbSA9ICQoJy5pdGVtW2RhdGEtdGFiPVwicmVzdWx0XCJdJyk7XG5cbiAgICAgICAgLy8gSGFuZGxlIGNvZGUgdmlzaWJpbGl0eSBhbmQgY29udGVudCBiYXNlZCBvbiB0aGUgJ21vZGUnXG4gICAgICAgIHN3aXRjaCAobW9kZSkge1xuICAgICAgICAgICAgY2FzZSAnbm9uZSc6XG4gICAgICAgICAgICAgICAgLy8gSWYgJ21vZGUnIGlzICdub25lJywgc2hvdyBvbmx5IHJlc3VsdCBjb2RlIGdlbmVyYXRlZCBhbmQgaGlkZSBlZGl0b3IgYW5kIHJlc3VsdCB2aWV3ZXJcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRlZGl0b3JUYWIuaGlkZSgpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJG9yaWdpbmFsVGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLnZpZXdlck9yaWdpbmFsLm5hdmlnYXRlRmlsZVN0YXJ0KCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kcmVzdWx0VGFiLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAvLyBTaG93L2hpZGUgbWVudSBpdGVtc1xuICAgICAgICAgICAgICAgICRvcmlnaW5hbFRhYk1lbnVJdGVtLnNob3coKTtcbiAgICAgICAgICAgICAgICAkcmVzdWx0VGFiTWVudUl0ZW0uaGlkZSgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnYXBwZW5kJzpcbiAgICAgICAgICAgICAgICAvLyBJZiAnbW9kZScgaXMgJ2FwcGVuZCcsIHNob3cgYWxsIGZpZWxkc1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGVkaXRvclRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kb3JpZ2luYWxUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHJlc3VsdFRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbC5uYXZpZ2F0ZUZpbGVFbmQoKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLnZpZXdlclJlc3VsdC5uYXZpZ2F0ZUZpbGVFbmQoKTtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGFsbCBtZW51IGl0ZW1zXG4gICAgICAgICAgICAgICAgJG9yaWdpbmFsVGFiTWVudUl0ZW0uc2hvdygpO1xuICAgICAgICAgICAgICAgICRyZXN1bHRUYWJNZW51SXRlbS5zaG93KCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdvdmVycmlkZSc6XG4gICAgICAgICAgICAgICAgLy8gSWYgJ21vZGUnIGlzICdvdmVycmlkZScsIHNob3cgZWRpdG9yIGFuZCBoaWRlIG9yaWdpbmFsLCBidXQgc2hvdyByZXN1bHRcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRlZGl0b3JUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJG9yaWdpbmFsVGFiLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRyZXN1bHRUYWIuaGlkZSgpO1xuICAgICAgICAgICAgICAgIC8vIFNob3cvaGlkZSBtZW51IGl0ZW1zXG4gICAgICAgICAgICAgICAgJG9yaWdpbmFsVGFiTWVudUl0ZW0uaGlkZSgpO1xuICAgICAgICAgICAgICAgICRyZXN1bHRUYWJNZW51SXRlbS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdjdXN0b20nOlxuICAgICAgICAgICAgICAgIC8vIEZvciAnY3VzdG9tJyBtb2RlLCBvbmx5IHNob3cgZWRpdG9yIHRhYiAtIHVzZXIgZnVsbHkgY29udHJvbHMgdGhlIGZpbGVcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRlZGl0b3JUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJG9yaWdpbmFsVGFiLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRyZXN1bHRUYWIuaGlkZSgpO1xuICAgICAgICAgICAgICAgIC8vIEhpZGUgb3RoZXIgdGFiIG1lbnUgaXRlbXMgZm9yIGN1c3RvbSBmaWxlc1xuICAgICAgICAgICAgICAgICRvcmlnaW5hbFRhYk1lbnVJdGVtLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAkcmVzdWx0VGFiTWVudUl0ZW0uaGlkZSgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnc2NyaXB0JzpcbiAgICAgICAgICAgICAgICAvLyBJZiAnbW9kZScgaXMgJ3NjcmlwdCcsIHNob3cgYm90aCBzZXJ2ZXIgYW5kIGN1c3RvbSBjb2RlLCBhcHBseSBjdXN0b20gc2NyaXB0IHRvIHRoZSBmaWxlIGNvbnRlbnQgb24gc2VydmVyXG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZWRpdG9yVGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRvcmlnaW5hbFRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kcmVzdWx0VGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGFsbCBtZW51IGl0ZW1zIGZvciBzY3JpcHQgbW9kZVxuICAgICAgICAgICAgICAgICRvcmlnaW5hbFRhYk1lbnVJdGVtLnNob3coKTtcbiAgICAgICAgICAgICAgICAkcmVzdWx0VGFiTWVudUl0ZW0uc2hvdygpO1xuICAgICAgICAgICAgICAgIC8vIEVkaXRvciAtIG9ubHkgc2V0IHRlbXBsYXRlIGlmIGNvbnRlbnQgaXMgZW1wdHlcbiAgICAgICAgICAgICAgICBpZiAoIWNvbnRlbnQgfHwgY29udGVudC50cmltKCkgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgPSBgIyEvYmluL2Jhc2ggXFxuXFxuYDtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgY29uZmlnUGF0aD1cIiQxXCIgIyBQYXRoIHRvIHRoZSBvcmlnaW5hbCBjb25maWcgZmlsZVxcblxcbmA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYCMgRXhhbXBsZSAxOiBSZXBsYWNlIGFsbCB2YWx1ZXMgbWF4X2NvbnRhY3RzID0gNSB0byBtYXhfY29udGFjdHMgPSAxIG9uIHBqc2lwLmNvbmZcXG5gO1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGAjIHNlZCAtaSAncy9tYXhfY29udGFjdHMgPSA1L21heF9jb250YWN0cyA9IDEvZycgXCIkY29uZmlnUGF0aFwiXFxuXFxuYFxuXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYCMgRXhhbXBsZSAyOiBDaGFuZ2UgdmFsdWUgbWF4X2NvbnRhY3RzIG9ubHkgZm9yIHBlZXIgd2l0aCBleHRlbnNpb24gMjI2IG9uIHBqc2lwLmNvbmZcXG5gO1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGAjIHNlZCAtaSAnL15cXFxcWzIyNlxcXFxdJC8sL15cXFxcWy8gcy9tYXhfY29udGFjdHMgPSA1L21heF9jb250YWN0cyA9IDIvJyBcIiRjb25maWdQYXRoXCJcXG5cXG5gXG5cbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgIyBFeGFtcGxlIDM6IEFkZCBlbiBleHRyYSBzdHJpbmcgaW50byBbcGxheWJhY2stZXhpdF0gc2VjdGlvbiBhZnRlciB0aGUgXCJzYW1lID0+IG4sSGFuZ3VwKClcIiBzdHJpbmcgb24gZXh0ZW5zaW9ucy5jb25mXFxuYDtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgIyBzZWQgLWkgJy9eXFxcXFtwbGF5YmFjay1leGl0XFxcXF0kLywvXlxcXFxbLyBzL15cXFxcKFxcXFxzKnNhbWUgPT4gbixIYW5ndXAoKVxcXFwpL1xcXFwxXFxcXG5cXFxcdHNhbWUgPT4gbixOb09wKFwiWW91ciBOb09wIGNvbW1lbnQgaGVyZVwiKS8nIFwiJGNvbmZpZ1BhdGhcIlxcblxcbmA7XG5cbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgIyBBdHRlbnRpb24hIFlvdSB3aWxsIHNlZSBjaGFuZ2VzIGFmdGVyIHRoZSBiYWNrZ3JvdW5kIHdvcmtlciBwcm9jZXNzZXMgdGhlIHNjcmlwdCBvciBhZnRlciByZWJvb3RpbmcgdGhlIHN5c3RlbS4gXFxuYDtcblxuICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IHNldCBjb250ZW50IGlmIHdlIGNyZWF0ZWQgYSB0ZW1wbGF0ZVxuICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXRWYWx1ZShjb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3IuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIGFueSBvdGhlciAnbW9kZScgdmFsdWVzXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBjdXN0b21GaWxlLnZpZXdlck9yaWdpbmFsLnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXRUaGVtZSgnYWNlL3RoZW1lL21vbm9rYWknKTtcblxuICAgICAgICAvLyBEb24ndCBvdmVyd3JpdGUgZWRpdG9yIGNvbnRlbnQgaGVyZSAtIGl0J3MgYWxyZWFkeSBzZXQgY29ycmVjdGx5XG4gICAgICAgIC8vIGN1c3RvbUZpbGUuZWRpdG9yLnNldFZhbHVlKGNvbnRlbnQpO1xuICAgICAgICAvLyBjdXN0b21GaWxlLmVkaXRvci5jbGVhclNlbGVjdGlvbigpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0aGF0IGhhbmRsZXMgdGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBjb250YWluaW5nIHRoZSBmaWxlJ3MgY29udGVudC5cbiAgICAgKiBJdCB3aWxsIHVwZGF0ZSB0aGUgJ3ZpZXdlck9yaWdpbmFsJyB3aXRoIHRoZSBmaWxlJ3MgY29udGVudCBhbmQgYWRqdXN0IHRoZSBjb2RlIGRpc3BsYXkuXG4gICAgICovXG4gICAgY2JHZXRPcmlnaW5hbEZpbGVDb250ZW50RnJvbVNlcnZlcihyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5jb250ZW50ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGFjZVZpZXdlciA9IGN1c3RvbUZpbGUudmlld2VyT3JpZ2luYWw7XG4gICAgICAgICAgICBjb25zdCBzY3JvbGxUb3AgPSBhY2VWaWV3ZXIuc2Vzc2lvbi5nZXRTY3JvbGxUb3AoKTtcbiAgICAgICAgICAgIGFjZVZpZXdlci5zZXNzaW9uLnNldFZhbHVlKHJlc3BvbnNlLmRhdGEuY29udGVudCk7XG4gICAgICAgICAgICBhY2VWaWV3ZXIuc2Vzc2lvbi5zZXRTY3JvbGxUb3Aoc2Nyb2xsVG9wKTtcbiAgICAgICAgfVxuICAgICAgICAkKCcudGFiW2RhdGEtdGFiPVwib3JpZ2luYWxcIl0nKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0aGF0IGhhbmRsZXMgdGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBjb250YWluaW5nIHRoZSBmaWxlJ3MgY29udGVudC5cbiAgICAgKiBJdCB3aWxsIHVwZGF0ZSB0aGUgJ3ZpZXdlclJlc3VsdCcgd2l0aCB0aGUgZmlsZSdzIGNvbnRlbnQgYW5kIGFkanVzdCB0aGUgY29kZSBkaXNwbGF5LlxuICAgICAqL1xuICAgIGNiR2V0UmVzdWx0RmlsZUNvbnRlbnRGcm9tU2VydmVyKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmNvbnRlbnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29uc3QgYWNlVmlld2VyID0gY3VzdG9tRmlsZS52aWV3ZXJSZXN1bHQ7XG4gICAgICAgICAgICBjb25zdCBzY3JvbGxUb3AgPSBhY2VWaWV3ZXIuc2Vzc2lvbi5nZXRTY3JvbGxUb3AoKTtcbiAgICAgICAgICAgIGFjZVZpZXdlci5zZXNzaW9uLnNldFZhbHVlKHJlc3BvbnNlLmRhdGEuY29udGVudCk7XG4gICAgICAgICAgICBhY2VWaWV3ZXIuc2Vzc2lvbi5zZXRTY3JvbGxUb3Aoc2Nyb2xsVG9wKTtcbiAgICAgICAgfVxuICAgICAgICAkKCcudGFiW2RhdGEtdGFiPVwicmVzdWx0XCJdJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBvcmlnaW5hbCBmaWxlIGNvbnRlbnQgaW50byBlZGl0b3Igd2hlbiBzd2l0Y2hpbmcgdG8gb3ZlcnJpZGUgbW9kZS5cbiAgICAgKiBPbmx5IGxvYWRzIGlmIGVkaXRvciBpcyBlbXB0eSB0byBhdm9pZCBvdmVyd3JpdGluZyB1c2VyJ3Mgd29yay5cbiAgICAgKiBSZXVzZXMgYWxyZWFkeSBsb2FkZWQgY29udGVudCBmcm9tIHZpZXdlck9yaWdpbmFsIGlmIGF2YWlsYWJsZS5cbiAgICAgKi9cbiAgICBsb2FkT3JpZ2luYWxDb250ZW50Rm9yT3ZlcnJpZGUoKSB7XG4gICAgICAgIC8vIE9ubHkgbG9hZCBpZiBlZGl0b3IgaXMgZW1wdHlcbiAgICAgICAgY29uc3QgY3VycmVudENvbnRlbnQgPSBjdXN0b21GaWxlLmVkaXRvci5nZXRWYWx1ZSgpO1xuICAgICAgICBpZiAoIWN1cnJlbnRDb250ZW50IHx8IGN1cnJlbnRDb250ZW50LnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgICAgIC8vIEZpcnN0LCB0cnkgdG8gZ2V0IGNvbnRlbnQgZnJvbSB2aWV3ZXJPcmlnaW5hbCBpZiBpdCdzIGFscmVhZHkgbG9hZGVkXG4gICAgICAgICAgICBjb25zdCBvcmlnaW5hbENvbnRlbnQgPSBjdXN0b21GaWxlLnZpZXdlck9yaWdpbmFsLmdldFZhbHVlKCk7XG5cbiAgICAgICAgICAgIGlmIChvcmlnaW5hbENvbnRlbnQgJiYgb3JpZ2luYWxDb250ZW50LnRyaW0oKSAhPT0gJycpIHtcbiAgICAgICAgICAgICAgICAvLyBSZXVzZSBhbHJlYWR5IGxvYWRlZCBjb250ZW50IGZyb20gdmlld2VyXG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2V0VmFsdWUob3JpZ2luYWxDb250ZW50KTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5jbGVhclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLm5hdmlnYXRlRmlsZVN0YXJ0KCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIENvbnRlbnQgbm90IHlldCBsb2FkZWQgLSBmZXRjaCBmcm9tIHNlcnZlclxuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVQYXRoID0gY3VzdG9tRmlsZS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZmlsZXBhdGgnKTtcbiAgICAgICAgICAgICAgICBpZiAoZmlsZVBhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBsb2FkaW5nIGluZGljYXRvclxuICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRlZGl0b3JUYWIuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBMb2FkIG9yaWdpbmFsIGZpbGUgY29udGVudCBmcm9tIHNlcnZlclxuICAgICAgICAgICAgICAgICAgICBGaWxlc0FQSS5nZXRGaWxlQ29udGVudChmaWxlUGF0aCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5jb250ZW50ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTZXQgb3JpZ2luYWwgY29udGVudCBpbiBlZGl0b3JcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXRWYWx1ZShyZXNwb25zZS5kYXRhLmNvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gTW92ZSBjdXJzb3IgdG8gc3RhcnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5uYXZpZ2F0ZUZpbGVTdGFydCgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgaW5kaWNhdG9yXG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRlZGl0b3JUYWIucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIEFjZSBlZGl0b3IgaW5zdGFuY2VzIGZvciAnZWRpdG9yJyBhbmQgJ3ZpZXdlcnMnIHdpbmRvd3MuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUFjZSgpIHtcbiAgICAgICAgLy8gQ2FsY3VsYXRlIGFjZSBlZGl0b3IgaGVpZ2h0IGFuZCByb3dzIGNvdW50XG4gICAgICAgIGNvbnN0IGFjZUhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCAtIDQ3NTtcbiAgICAgICAgY29uc3Qgcm93c0NvdW50ID0gTWF0aC5yb3VuZChhY2VIZWlnaHQgLyAxNi4zKTtcblxuICAgICAgICAvLyBTZXQgbWluaW11bSBoZWlnaHQgZm9yIHRoZSBjb2RlIHNlY3Rpb25zIG9uIHdpbmRvdyBsb2FkXG4gICAgICAgICQoJy5hcHBsaWNhdGlvbi1jb2RlJykuY3NzKCdtaW4taGVpZ2h0JywgYCR7YWNlSGVpZ2h0fXB4YCk7XG5cbiAgICAgICAgLy8gQUNFIHdpbmRvdyBmb3IgdGhlIG9yaWdpbmFsIGZpbGUgY29udGVudC5cbiAgICAgICAgY29uc3QgSW5pTW9kZSA9IGFjZS5yZXF1aXJlKCdhY2UvbW9kZS9qdWxpYScpLk1vZGU7XG4gICAgICAgIGN1c3RvbUZpbGUudmlld2VyT3JpZ2luYWwgPSBhY2UuZWRpdCgnY29uZmlnLWZpbGUtb3JpZ2luYWwnKTtcbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbC5zZXNzaW9uLnNldE1vZGUobmV3IEluaU1vZGUoKSk7XG4gICAgICAgIGN1c3RvbUZpbGUudmlld2VyT3JpZ2luYWwuc2V0VGhlbWUoJ2FjZS90aGVtZS9tb25va2FpJyk7XG4gICAgICAgIGN1c3RvbUZpbGUudmlld2VyT3JpZ2luYWwuc2V0T3B0aW9ucyh7XG4gICAgICAgICAgICBzaG93UHJpbnRNYXJnaW46IGZhbHNlLFxuICAgICAgICAgICAgcmVhZE9ubHk6IHRydWUsXG4gICAgICAgICAgICBtaW5MaW5lczogcm93c0NvdW50XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFDRSB3aW5kb3cgZm9yIHRoZSByZXN1bHRlZCBmaWxlIGNvbnRlbnQuXG4gICAgICAgIGN1c3RvbUZpbGUudmlld2VyUmVzdWx0ID0gYWNlLmVkaXQoJ2NvbmZpZy1maWxlLXJlc3VsdCcpO1xuICAgICAgICBjdXN0b21GaWxlLnZpZXdlclJlc3VsdC5zZXNzaW9uLnNldE1vZGUobmV3IEluaU1vZGUoKSk7XG4gICAgICAgIGN1c3RvbUZpbGUudmlld2VyUmVzdWx0LnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuICAgICAgICBjdXN0b21GaWxlLnZpZXdlclJlc3VsdC5zZXRPcHRpb25zKHtcbiAgICAgICAgICAgIHNob3dQcmludE1hcmdpbjogZmFsc2UsXG4gICAgICAgICAgICByZWFkT25seTogdHJ1ZSxcbiAgICAgICAgICAgIG1pbkxpbmVzOiByb3dzQ291bnRcbiAgICAgICAgfSk7XG5cblxuICAgICAgICAvLyBBQ0Ugd2luZG93IGZvciB0aGUgdXNlciBlZGl0b3IuXG4gICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yID0gYWNlLmVkaXQoJ3VzZXItZWRpdC1jb25maWcnKTtcbiAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2Vzc2lvbi5zZXRNb2RlKG5ldyBJbmlNb2RlKCkpO1xuICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXRUaGVtZSgnYWNlL3RoZW1lL21vbm9rYWknKTtcbiAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2V0T3B0aW9ucyh7XG4gICAgICAgICAgICBzaG93UHJpbnRNYXJnaW46IGZhbHNlLFxuICAgICAgICAgICAgbWluTGluZXM6IHJvd3NDb3VudCxcbiAgICAgICAgfSk7XG4gICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLnNlc3Npb24ub24oJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50IHRvIGFja25vd2xlZGdlIHRoZSBtb2RpZmljYXRpb25cbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gIEFkZCBoYW5kbGVycyBmb3IgZnVsbHNjcmVlbiBtb2RlIGJ1dHRvbnNcbiAgICAgICAgJCgnLmZ1bGxzY3JlZW4tdG9nZ2xlLWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRhaW5lciA9ICQodGhpcykuc2libGluZ3MoJy5hcHBsaWNhdGlvbi1jb2RlJylbMF07XG4gICAgICAgICAgICBjdXN0b21GaWxlLnRvZ2dsZUZ1bGxTY3JlZW4oY29udGFpbmVyKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIGhhbmRsZXIgdG8gcmVjYWxjdWxhdGUgc2l6ZXMgd2hlbiBleGl0aW5nIGZ1bGxzY3JlZW4gbW9kZVxuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdmdWxsc2NyZWVuY2hhbmdlJywgY3VzdG9tRmlsZS5hZGp1c3RFZGl0b3JIZWlnaHQpO1xuXG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBFbmFibGUvZGlzYWJsZSBmdWxsc2NyZWVuIG1vZGUgZm9yIGEgc3BlY2lmaWMgYmxvY2suXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBjb250YWluZXIgLSBUaGUgY29udGFpbmVyIHRvIGV4cGFuZCB0byBmdWxsc2NyZWVuLlxuICAgICAqL1xuICAgIHRvZ2dsZUZ1bGxTY3JlZW4oY29udGFpbmVyKSB7XG4gICAgICAgIGlmICghZG9jdW1lbnQuZnVsbHNjcmVlbkVsZW1lbnQpIHtcbiAgICAgICAgICAgIGNvbnRhaW5lci5yZXF1ZXN0RnVsbHNjcmVlbigpLmNhdGNoKGVyciA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgYXR0ZW1wdGluZyB0byBlbmFibGUgZnVsbC1zY3JlZW4gbW9kZTogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZG9jdW1lbnQuZXhpdEZ1bGxzY3JlZW4oKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZWNhbGN1bGF0ZSBlZGl0b3IgaGVpZ2h0cyB3aGVuIHRoZSBzY3JlZW4gbW9kZSBjaGFuZ2VzLlxuICAgICAqL1xuICAgIGFkanVzdEVkaXRvckhlaWdodCgpIHtcbiAgICAgICAgY29uc3QgZWRpdG9ycyA9IFtjdXN0b21GaWxlLnZpZXdlck9yaWdpbmFsLCBjdXN0b21GaWxlLnZpZXdlclJlc3VsdCwgY3VzdG9tRmlsZS5lZGl0b3JdO1xuICAgICAgICBlZGl0b3JzLmZvckVhY2goZWRpdG9yID0+IHtcbiAgICAgICAgICAgIGlmIChlZGl0b3IpIHtcbiAgICAgICAgICAgICAgICBlZGl0b3IucmVzaXplKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcblxuICAgICAgICAvLyBJTVBPUlRBTlQ6IEdldCBtb2RlIEJFRk9SRSBmb3JtKCdnZXQgdmFsdWVzJykgdG8gcHJldmVudCBkcm9wZG93biBmcm9tIG92ZXJyaWRpbmcgaXRcbiAgICAgICAgY29uc3QgbW9kZSA9IGN1c3RvbUZpbGUuZ2V0Q3VycmVudE1vZGUoKTtcblxuICAgICAgICAvLyBHZXQgYWxsIGZvcm0gdmFsdWVzXG4gICAgICAgIHJlc3VsdC5kYXRhID0gY3VzdG9tRmlsZS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cbiAgICAgICAgLy8gT3ZlcnJpZGUgbW9kZSB3aXRoIHRoZSBjb3JyZWN0IHZhbHVlIChmcm9tIGdldEN1cnJlbnRNb2RlKVxuICAgICAgICByZXN1bHQuZGF0YS5tb2RlID0gbW9kZTtcblxuICAgICAgICAvLyBSZW1vdmUgdGVjaG5pY2FsIGZpZWxkIGZyb20gZGF0YVxuICAgICAgICBkZWxldGUgcmVzdWx0LmRhdGFbJ21vZGUtY3VzdG9tLXZhbHVlJ107XG5cbiAgICAgICAgLy8gR2V0IGNvbnRlbnQgZnJvbSBBY2UgZWRpdG9yIGJhc2VkIG9uIG1vZGVcbiAgICAgICAgc3dpdGNoIChtb2RlKSB7XG4gICAgICAgICAgICBjYXNlICdhcHBlbmQnOlxuICAgICAgICAgICAgY2FzZSAnb3ZlcnJpZGUnOlxuICAgICAgICAgICAgY2FzZSAnY3VzdG9tJzpcbiAgICAgICAgICAgIGNhc2UgJ3NjcmlwdCc6XG4gICAgICAgICAgICAgICAgLy8gR2V0IGNvbnRlbnQgZnJvbSBBY2UgZWRpdG9yIChub3QgYmFzZTY0IGVuY29kZWQgeWV0KVxuICAgICAgICAgICAgICAgIGlmICghY3VzdG9tRmlsZS5lZGl0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRWRpdG9yIGlzIG5vdCBpbml0aWFsaXplZCEnKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmRhdGEuY29udGVudCA9ICcnO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVkaXRvckNvbnRlbnQgPSBjdXN0b21GaWxlLmVkaXRvci5nZXRWYWx1ZSgpO1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQuZGF0YS5jb250ZW50ID0gZWRpdG9yQ29udGVudDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdub25lJzpcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgLy8gRm9yICdub25lJyBtb2RlLCBjbGVhciB0aGUgY29udGVudFxuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhLmNvbnRlbnQgPSAnJztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuXG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBjdXN0b21GaWxlLiRmb3JtT2JqO1xuXG4gICAgICAgIC8vIENvbmZpZ3VyZSBSRVNUIEFQSSBzZXR0aW5ncyBmb3IgRm9ybVxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzID0ge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGFwaU9iamVjdDogY3VzdG9tRmlsZXNBUEksXG4gICAgICAgICAgICBzYXZlTWV0aG9kOiAnc2F2ZScsICAvLyBXaWxsIHVzZSB0aGUgc21hcnQgc2F2ZSBtZXRob2QgdGhhdCBkZXRlcm1pbmVzIGNyZWF0ZS91cGRhdGVcbiAgICAgICAgICAgIGF1dG9EZXRlY3RNZXRob2Q6IGZhbHNlLCAgLy8gV2UgaGFuZGxlIHRoaXMgaW4gb3VyIHNhdmUgbWV0aG9kXG4gICAgICAgICAgICBpZEZpZWxkOiAnaWQnXG4gICAgICAgIH07XG5cbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gY3VzdG9tRmlsZS52YWxpZGF0ZVJ1bGVzOyAvLyBGb3JtIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gY3VzdG9tRmlsZS5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gY3VzdG9tRmlsZS5jYkFmdGVyU2VuZEZvcm07IC8vIENhbGxiYWNrIGFmdGVyIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxufTtcblxuLy8gSW5pdGlhbGl6ZSB0aGUgY3VzdG9tIGZpbGVzIG1vZGlmeSBmb3JtIHdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LlxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGN1c3RvbUZpbGUuaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==