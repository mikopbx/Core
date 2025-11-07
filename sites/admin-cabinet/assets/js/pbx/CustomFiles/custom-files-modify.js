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

/* global globalRootUrl,globalTranslate, ace, Form, FilesAPI, customFilesAPI, PbxApiClient */

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
    }
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
    customFile.$modeCustomInput = $('#mode-custom-value'); // Enable tab navigation with history support

    customFile.$tabMenu.tab({
      onVisible: customFile.onChangeTab
    });
    customFile.$mainContainer.removeClass('container'); // Initialize Ace editor

    customFile.initializeAce(); // Initialize or reinitialize dropdown

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
      customFilesAPI.getRecord('new', function (response) {
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

            customFile.setMode('custom'); // Show only editor tab for custom mode

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

            customFile.setMode('custom'); // Show only editor tab for custom mode

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

    customFile.hideShowCode();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DdXN0b21GaWxlcy9jdXN0b20tZmlsZXMtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbImN1c3RvbUZpbGUiLCIkZm9ybU9iaiIsIiQiLCIkdGFiTWVudSIsIiRtb2RlRHJvcERvd24iLCIkbW9kZUN1c3RvbUlucHV0IiwiJG9yaWdpbmFsVGFiIiwiJGVkaXRvclRhYiIsIiRyZXN1bHRUYWIiLCIkbWFpbkNvbnRhaW5lciIsIiRmaWxlcGF0aElucHV0IiwiJGZpbGVwYXRoRmllbGQiLCJlZGl0b3IiLCJ2aWV3ZXJPcmlnaW5hbCIsInZpZXdlclJlc3VsdCIsInZhbGlkYXRlUnVsZXMiLCJuYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImNmX1ZhbGlkYXRlTmFtZUlzRW1wdHkiLCJiYXNlNjRUb1V0ZjgiLCJiYXNlNjRTdHIiLCJiaW5hcnlTdHJpbmciLCJhdG9iIiwiVGV4dERlY29kZXIiLCJieXRlcyIsIlVpbnQ4QXJyYXkiLCJsZW5ndGgiLCJpIiwiY2hhckNvZGVBdCIsImRlY29kZSIsImRlY29kZVVSSUNvbXBvbmVudCIsImVzY2FwZSIsImUiLCJjb25zb2xlIiwiZXJyb3IiLCJnZXRDdXJyZW50TW9kZSIsImN1c3RvbU1vZGVWYWx1ZSIsInZhbCIsImZvcm0iLCJzZXRNb2RlIiwibW9kZSIsInBhcmVudCIsImhpZGUiLCJkcm9wZG93biIsInNob3ciLCJ1cGRhdGVGaWxlcGF0aEZpZWxkU3RhdGUiLCJpc1VzZXJDcmVhdGVkIiwiZmlsZUlkIiwicHJvcCIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJpbml0aWFsaXplIiwidGFiIiwib25WaXNpYmxlIiwib25DaGFuZ2VUYWIiLCJpbml0aWFsaXplQWNlIiwib25DaGFuZ2UiLCJjYk9uQ2hhbmdlTW9kZSIsInVybFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsIndpbmRvdyIsImxvY2F0aW9uIiwic2VhcmNoIiwidXJsSWQiLCJwYXRobmFtZSIsIm1hdGNoIiwiY3VzdG9tRmlsZXNBUEkiLCJnZXRSZWNvcmQiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJmb3JtRGF0YSIsImNvbnRlbnQiLCJkZWNvZGVkQ29udGVudCIsInNldFZhbHVlIiwiY2xlYXJTZWxlY3Rpb24iLCJiYXNlNjRDb250ZW50IiwiZ2xvYmFsUm9vdFVybCIsImluaXRpYWxpemVGb3JtIiwidmFsdWUiLCJ0ZXh0IiwiaGlkZVNob3dDb2RlIiwiY3VycmVudFRhYiIsImZpbGVQYXRoIiwiRmlsZXNBUEkiLCJnZXRGaWxlQ29udGVudCIsImNiR2V0UmVzdWx0RmlsZUNvbnRlbnRGcm9tU2VydmVyIiwiY2JHZXRPcmlnaW5hbEZpbGVDb250ZW50RnJvbVNlcnZlciIsImdldFZhbHVlIiwiJG9yaWdpbmFsVGFiTWVudUl0ZW0iLCIkcmVzdWx0VGFiTWVudUl0ZW0iLCJuYXZpZ2F0ZUZpbGVTdGFydCIsIm5hdmlnYXRlRmlsZUVuZCIsInRyaW0iLCJzZXRUaGVtZSIsInVuZGVmaW5lZCIsImFjZVZpZXdlciIsInNjcm9sbFRvcCIsInNlc3Npb24iLCJnZXRTY3JvbGxUb3AiLCJzZXRTY3JvbGxUb3AiLCJhY2VIZWlnaHQiLCJpbm5lckhlaWdodCIsInJvd3NDb3VudCIsIk1hdGgiLCJyb3VuZCIsImNzcyIsIkluaU1vZGUiLCJhY2UiLCJyZXF1aXJlIiwiTW9kZSIsImVkaXQiLCJzZXRPcHRpb25zIiwic2hvd1ByaW50TWFyZ2luIiwicmVhZE9ubHkiLCJtaW5MaW5lcyIsIm9uIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwiY29udGFpbmVyIiwic2libGluZ3MiLCJ0b2dnbGVGdWxsU2NyZWVuIiwiZG9jdW1lbnQiLCJhZGRFdmVudExpc3RlbmVyIiwiYWRqdXN0RWRpdG9ySGVpZ2h0IiwiZnVsbHNjcmVlbkVsZW1lbnQiLCJyZXF1ZXN0RnVsbHNjcmVlbiIsImVyciIsIm1lc3NhZ2UiLCJleGl0RnVsbHNjcmVlbiIsImVkaXRvcnMiLCJmb3JFYWNoIiwicmVzaXplIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwiZWRpdG9yQ29udGVudCIsImNiQWZ0ZXJTZW5kRm9ybSIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJhdXRvRGV0ZWN0TWV0aG9kIiwiaWRGaWVsZCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFVBQVUsR0FBRztBQUVmO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLG1CQUFELENBTkk7O0FBUWY7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFRCxDQUFDLENBQUMsMEJBQUQsQ0FaSTs7QUFjZjtBQUNKO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxhQUFhLEVBQUVGLENBQUMsQ0FBQyxnQkFBRCxDQWxCRDs7QUFvQmY7QUFDSjtBQUNBO0FBQ0E7QUFDSUcsRUFBQUEsZ0JBQWdCLEVBQUVILENBQUMsQ0FBQyxvQkFBRCxDQXhCSjs7QUEwQmY7QUFDSjtBQUNBO0FBQ0E7QUFDSUksRUFBQUEsWUFBWSxFQUFFSixDQUFDLENBQUMsd0JBQUQsQ0E5QkE7O0FBZ0NmO0FBQ0o7QUFDQTtBQUNBO0FBQ0lLLEVBQUFBLFVBQVUsRUFBRUwsQ0FBQyxDQUFDLHNCQUFELENBcENFOztBQXNDZjtBQUNKO0FBQ0E7QUFDQTtBQUNJTSxFQUFBQSxVQUFVLEVBQUVOLENBQUMsQ0FBQyxzQkFBRCxDQTFDRTs7QUE0Q2Y7QUFDSjtBQUNBO0FBQ0E7QUFDSU8sRUFBQUEsY0FBYyxFQUFFUCxDQUFDLENBQUMseUJBQUQsQ0FoREY7O0FBa0RmO0FBQ0o7QUFDQTtBQUNBO0FBQ0lRLEVBQUFBLGNBQWMsRUFBRVIsQ0FBQyxDQUFD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QUFPLEVBQUU7QUFMTSxLQUFuQjtBQVFBekIsSUFBQUEsSUFBSSxDQUFDMUcsYUFBTCxHQUFxQmYsVUFBVSxDQUFDZSxhQUFoQyxDQVphLENBWWtDOztBQUMvQzBHLElBQUFBLElBQUksQ0FBQ2dCLGdCQUFMLEdBQXdCekksVUFBVSxDQUFDeUksZ0JBQW5DLENBYmEsQ0Fhd0M7O0FBQ3JEaEIsSUFBQUEsSUFBSSxDQUFDbUIsZUFBTCxHQUF1QjVJLFVBQVUsQ0FBQzRJLGVBQWxDLENBZGEsQ0Fjc0M7O0FBQ25EbkIsSUFBQUEsSUFBSSxDQUFDbEUsVUFBTDtBQUNIO0FBaHBCYyxDQUFuQixDLENBbXBCQTs7QUFDQXJELENBQUMsQ0FBQzRILFFBQUQsQ0FBRCxDQUFZcUIsS0FBWixDQUFrQixZQUFNO0FBQ3BCbkosRUFBQUEsVUFBVSxDQUFDdUQsVUFBWDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIGFjZSwgRm9ybSwgRmlsZXNBUEksIGN1c3RvbUZpbGVzQVBJLCBQYnhBcGlDbGllbnQgKi9cblxuXG4vKipcbiAqIE1vZHVsZSBjdXN0b21GaWxlXG4gKiBUaGlzIG1vZHVsZSBtYW5hZ2VzIGZpbGUgaW50ZXJhY3Rpb25zIGluIGEgVUksIHN1Y2ggYXMgbG9hZGluZyBmaWxlIGNvbnRlbnQgZnJvbSBhIHNlcnZlciBhbmQgaGFuZGxpbmcgdXNlciBpbnB1dC5cbiAqIEBtb2R1bGUgY3VzdG9tRmlsZVxuICovXG5jb25zdCBjdXN0b21GaWxlID0ge1xuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI2N1c3RvbS1maWxlLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB0YWIgbWVudS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR0YWJNZW51OiAkKCcjY3VzdG9tLWZpbGVzLW1lbnUgLml0ZW0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBtb2RlIHNlbGVjdC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRtb2RlRHJvcERvd246ICQoJyNtb2RlLWRyb3Bkb3duJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgaGlkZGVuIGN1c3RvbSBtb2RlIGlucHV0LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG1vZGVDdXN0b21JbnB1dDogJCgnI21vZGUtY3VzdG9tLXZhbHVlJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdGFiIHdpdGggb3JpZ2luYWwgZmlsZSBjb250ZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG9yaWdpbmFsVGFiOiAkKCdhW2RhdGEtdGFiPVwib3JpZ2luYWxcIl0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB0YWIgd2l0aCB1c2VyIGNvbnRlbnQvc2NyaXB0IGVkaXRvci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRlZGl0b3JUYWI6ICQoJ2FbZGF0YS10YWI9XCJlZGl0b3JcIl0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB0YWIgd2l0aCByZXN1bHRlZCBmaWxlIGNvbnRlbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkcmVzdWx0VGFiOiAkKCdhW2RhdGEtdGFiPVwicmVzdWx0XCJdJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgZWxlbWVudCBmb3IgdGhlIG1haW4gY29udGVudCBjb250YWluZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbWFpbkNvbnRhaW5lcjogJCgnI21haW4tY29udGVudC1jb250YWluZXInKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmaWxlcGF0aCBpbnB1dCBmaWVsZC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmaWxlcGF0aElucHV0OiAkKCcjZmlsZXBhdGgnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmaWxlcGF0aCBmaWVsZCBjb250YWluZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZmlsZXBhdGhGaWVsZDogJCgnI2ZpbGVwYXRoLWZpZWxkJyksXG5cblxuICAgIC8qKlxuICAgICAqIEFjZSBlZGl0b3IgaW5zdGFuY2VzXG4gICAgICogYGVkaXRvcmAgaXMgZm9yIGlucHV0IGFuZCBgdmlld2Vyc2AgaXMgZm9yIGRpc3BsYXkgY29kZSBmcm9tIHNlcnZlclxuICAgICAqL1xuICAgIGVkaXRvcjogJycsXG4gICAgdmlld2VyT3JpZ2luYWw6ICcnLFxuICAgIHZpZXdlclJlc3VsdDogJycsXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgbmFtZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2ZpbGVwYXRoJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5jZl9WYWxpZGF0ZU5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZWNvZGUgYmFzZTY0IHN0cmluZyB0byBVVEYtOFxuICAgICAqIEhhbmRsZXMgVW5pY29kZSBjaGFyYWN0ZXJzIChSdXNzaWFuLCBDaGluZXNlLCBldGMuKVxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGJhc2U2NFN0ciAtIEJhc2U2NCBlbmNvZGVkIHN0cmluZ1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFVURi04IGRlY29kZWQgc3RyaW5nXG4gICAgICovXG4gICAgYmFzZTY0VG9VdGY4KGJhc2U2NFN0cikge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gRGVjb2RlIGJhc2U2NCB0byBiaW5hcnkgc3RyaW5nXG4gICAgICAgICAgICBjb25zdCBiaW5hcnlTdHJpbmcgPSBhdG9iKGJhc2U2NFN0cik7XG5cbiAgICAgICAgICAgIC8vIFVzZSBUZXh0RGVjb2RlciBmb3IgbW9kZXJuIGJyb3dzZXJzXG4gICAgICAgICAgICBpZiAodHlwZW9mIFRleHREZWNvZGVyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkoYmluYXJ5U3RyaW5nLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBiaW5hcnlTdHJpbmcubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgYnl0ZXNbaV0gPSBiaW5hcnlTdHJpbmcuY2hhckNvZGVBdChpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBUZXh0RGVjb2RlcigpLmRlY29kZShieXRlcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIGZvciBvbGRlciBicm93c2Vyc1xuICAgICAgICAgICAgICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoZXNjYXBlKGJpbmFyeVN0cmluZykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBkZWNvZGUgYmFzZTY0OicsIGUpO1xuICAgICAgICAgICAgcmV0dXJuIGJhc2U2NFN0cjsgLy8gUmV0dXJuIGFzLWlzIGlmIGRlY29kZSBmYWlsc1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBjdXJyZW50IG1vZGUgdmFsdWUgKGZyb20gZHJvcGRvd24gb3IgaGlkZGVuIGlucHV0IGZvciBjdXN0b20gbW9kZSlcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBDdXJyZW50IG1vZGUgdmFsdWVcbiAgICAgKi9cbiAgICBnZXRDdXJyZW50TW9kZSgpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgY3VzdG9tIG1vZGUgaXMgYWN0aXZlIChoaWRkZW4gaW5wdXQgaGFzIHZhbHVlKVxuICAgICAgICBjb25zdCBjdXN0b21Nb2RlVmFsdWUgPSBjdXN0b21GaWxlLiRtb2RlQ3VzdG9tSW5wdXQudmFsKCk7XG4gICAgICAgIGlmIChjdXN0b21Nb2RlVmFsdWUgPT09ICdjdXN0b20nKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2N1c3RvbSc7XG4gICAgICAgIH1cbiAgICAgICAgLy8gT3RoZXJ3aXNlIHJldHVybiBkcm9wZG93biB2YWx1ZVxuICAgICAgICByZXR1cm4gY3VzdG9tRmlsZS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnbW9kZScpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQgbW9kZSB2YWx1ZSAodXNpbmcgZHJvcGRvd24gZm9yIHN0YW5kYXJkIG1vZGVzLCBoaWRkZW4gaW5wdXQgZm9yIGN1c3RvbSBtb2RlKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtb2RlIC0gTW9kZSB0byBzZXRcbiAgICAgKi9cbiAgICBzZXRNb2RlKG1vZGUpIHtcbiAgICAgICAgaWYgKG1vZGUgPT09ICdjdXN0b20nKSB7XG4gICAgICAgICAgICAvLyBTZXQgY3VzdG9tIG1vZGUgdmlhIGhpZGRlbiBpbnB1dFxuICAgICAgICAgICAgY3VzdG9tRmlsZS4kbW9kZUN1c3RvbUlucHV0LnZhbCgnY3VzdG9tJyk7XG4gICAgICAgICAgICAvLyBIaWRlIGRyb3Bkb3duIGZvciBjdXN0b20gZmlsZXNcbiAgICAgICAgICAgIGN1c3RvbUZpbGUuJG1vZGVEcm9wRG93bi5wYXJlbnQoKS5wYXJlbnQoKS5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBDbGVhciBjdXN0b20gbW9kZVxuICAgICAgICAgICAgY3VzdG9tRmlsZS4kbW9kZUN1c3RvbUlucHV0LnZhbCgnJyk7XG4gICAgICAgICAgICAvLyBTZXQgc3RhbmRhcmQgbW9kZSB2aWEgZHJvcGRvd25cbiAgICAgICAgICAgIGN1c3RvbUZpbGUuJG1vZGVEcm9wRG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgbW9kZSk7XG4gICAgICAgICAgICAvLyBTaG93IGRyb3Bkb3duXG4gICAgICAgICAgICBjdXN0b21GaWxlLiRtb2RlRHJvcERvd24ucGFyZW50KCkucGFyZW50KCkuc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhlIGZpbGVwYXRoIGZpZWxkIHN0YXRlIGJhc2VkIG9uIHdoZXRoZXIgdGhlIGZpbGUgaXMgdXNlci1jcmVhdGVkIChNT0RFX0NVU1RPTSkgb3Igc3lzdGVtLW1hbmFnZWQuXG4gICAgICogVXNlci1jcmVhdGVkIGZpbGVzIGhhdmUgZWRpdGFibGUgZmlsZXBhdGggYnV0IGNhbm5vdCBiZSBjcmVhdGVkIChvbmx5IGZvciBuZXcgZmlsZXMpLFxuICAgICAqIHN5c3RlbS1tYW5hZ2VkIGZpbGVzIGhhdmUgcmVhZC1vbmx5IGZpbGVwYXRoLlxuICAgICAqL1xuICAgIHVwZGF0ZUZpbGVwYXRoRmllbGRTdGF0ZSgpIHtcbiAgICAgICAgY29uc3QgbW9kZSA9IGN1c3RvbUZpbGUuZ2V0Q3VycmVudE1vZGUoKTtcbiAgICAgICAgY29uc3QgaXNVc2VyQ3JlYXRlZCA9IG1vZGUgPT09ICdjdXN0b20nO1xuICAgICAgICBjb25zdCBmaWxlSWQgPSBjdXN0b21GaWxlLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdpZCcpO1xuXG4gICAgICAgIGlmIChpc1VzZXJDcmVhdGVkKSB7XG4gICAgICAgICAgICBpZiAoIWZpbGVJZCB8fCBmaWxlSWQgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgLy8gTmV3IGN1c3RvbSBmaWxlIC0gZmlsZXBhdGggaXMgZWRpdGFibGVcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRmaWxlcGF0aElucHV0LnByb3AoJ3JlYWRvbmx5JywgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGZpbGVwYXRoRmllbGQucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEV4aXN0aW5nIGN1c3RvbSBmaWxlIC0gZmlsZXBhdGggaXMgcmVhZC1vbmx5IChjYW5ub3QgYmUgY2hhbmdlZCBhZnRlciBjcmVhdGlvbilcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRmaWxlcGF0aElucHV0LnByb3AoJ3JlYWRvbmx5JywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZmlsZXBhdGhGaWVsZC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEFsd2F5cyBoaWRlIG1vZGUgc2VsZWN0b3IgZm9yIGN1c3RvbSBmaWxlc1xuICAgICAgICAgICAgY3VzdG9tRmlsZS4kbW9kZURyb3BEb3duLnBhcmVudCgpLnBhcmVudCgpLmhpZGUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFN5c3RlbS1tYW5hZ2VkIGZpbGUgLSBmaWxlcGF0aCBpcyBhbHdheXMgcmVhZC1vbmx5XG4gICAgICAgICAgICBjdXN0b21GaWxlLiRmaWxlcGF0aElucHV0LnByb3AoJ3JlYWRvbmx5JywgdHJ1ZSk7XG4gICAgICAgICAgICBjdXN0b21GaWxlLiRmaWxlcGF0aEZpZWxkLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgLy8gU2hvdyBtb2RlIHNlbGVjdG9yIGZvciBzeXN0ZW0gZmlsZXNcbiAgICAgICAgICAgIGN1c3RvbUZpbGUuJG1vZGVEcm9wRG93bi5wYXJlbnQoKS5wYXJlbnQoKS5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGN1c3RvbUZpbGUgbW9kdWxlLlxuICAgICAqIFNldHMgdXAgdGhlIGRyb3Bkb3duLCBpbml0aWFsaXplcyBBY2UgZWRpdG9yLCBmb3JtLCBhbmQgcmV0cmlldmVzIGZpbGUgY29udGVudCBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGpRdWVyeSBvYmplY3RzIGFmdGVyIERPTSBpcyByZWFkeVxuICAgICAgICBjdXN0b21GaWxlLiRmaWxlcGF0aElucHV0ID0gJCgnI2ZpbGVwYXRoJyk7XG4gICAgICAgIGN1c3RvbUZpbGUuJGZpbGVwYXRoRmllbGQgPSAkKCcjZmlsZXBhdGgtZmllbGQnKTtcbiAgICAgICAgY3VzdG9tRmlsZS4kbW9kZURyb3BEb3duID0gJCgnI21vZGUtZHJvcGRvd24nKTtcbiAgICAgICAgY3VzdG9tRmlsZS4kbW9kZUN1c3RvbUlucHV0ID0gJCgnI21vZGUtY3VzdG9tLXZhbHVlJyk7XG5cbiAgICAgICAgLy8gRW5hYmxlIHRhYiBuYXZpZ2F0aW9uIHdpdGggaGlzdG9yeSBzdXBwb3J0XG4gICAgICAgIGN1c3RvbUZpbGUuJHRhYk1lbnUudGFiKHtcbiAgICAgICAgICAgIG9uVmlzaWJsZTogY3VzdG9tRmlsZS5vbkNoYW5nZVRhYlxuICAgICAgICB9KTtcblxuICAgICAgICBjdXN0b21GaWxlLiRtYWluQ29udGFpbmVyLnJlbW92ZUNsYXNzKCdjb250YWluZXInKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIEFjZSBlZGl0b3JcbiAgICAgICAgY3VzdG9tRmlsZS5pbml0aWFsaXplQWNlKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBvciByZWluaXRpYWxpemUgZHJvcGRvd25cbiAgICAgICAgaWYgKGN1c3RvbUZpbGUuJG1vZGVEcm9wRG93bi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjdXN0b21GaWxlLiRtb2RlRHJvcERvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiBjdXN0b21GaWxlLmNiT25DaGFuZ2VNb2RlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEdldCBmaWxlIElEIGZyb20gVVJMIG9yIGZvcm1cbiAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICAgICAgY29uc3QgdXJsSWQgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUubWF0Y2goL21vZGlmeVxcLyhcXGQrKS8pO1xuICAgICAgICBjb25zdCBmaWxlSWQgPSB1cmxJZCA/IHVybElkWzFdIDogY3VzdG9tRmlsZS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnaWQnKTtcblxuICAgICAgICBpZiAoIWZpbGVJZCB8fCBmaWxlSWQgPT09ICcnKSB7XG4gICAgICAgICAgICAvLyBMb2FkIGRlZmF1bHQgdmFsdWVzIGZvciBuZXcgY3VzdG9tIGZpbGVcbiAgICAgICAgICAgIGN1c3RvbUZpbGVzQVBJLmdldFJlY29yZCgnbmV3JywgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFN0b3JlIG1vZGUgc2VwYXJhdGVseSB0byBoYW5kbGUgaXQgY29ycmVjdGx5XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vZGUgPSByZXNwb25zZS5kYXRhLm1vZGUgfHwgJ25vbmUnO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBtb2RlIGZyb20gcmVzcG9uc2UgYmVmb3JlIHNldHRpbmcgZm9ybSB2YWx1ZXNcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZm9ybURhdGEgPSB7Li4ucmVzcG9uc2UuZGF0YX07XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBmb3JtRGF0YS5tb2RlOyAgLy8gRG9uJ3QgbGV0IGZvcm0oJ3NldCB2YWx1ZXMnKSBoYW5kbGUgbW9kZVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCBkZWZhdWx0IHZhbHVlcyB0byBmb3JtIGZpZWxkcyAod2l0aG91dCBtb2RlKVxuICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZXMnLCBmb3JtRGF0YSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRm9yIG5ldyBmaWxlcyB3aXRoIE1PREVfQ1VTVE9NXG4gICAgICAgICAgICAgICAgICAgIGlmIChtb2RlID09PSAnY3VzdG9tJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gTWFrZSBmaWxlcGF0aCBlZGl0YWJsZSBmb3IgbmV3IGN1c3RvbSBmaWxlc1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZmlsZXBhdGhJbnB1dC5wcm9wKCdyZWFkb25seScsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGZpbGVwYXRoRmllbGQucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNldCBtb2RlIHRvICdjdXN0b20nIHVzaW5nIGhpZGRlbiBpbnB1dFxuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5zZXRNb2RlKCdjdXN0b20nKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBvbmx5IGVkaXRvciB0YWIgZm9yIGN1c3RvbSBtb2RlXG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiR0YWJNZW51LnRhYignY2hhbmdlIHRhYicsICdlZGl0b3InKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGVkaXRvclRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRvcmlnaW5hbFRhYi5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRyZXN1bHRUYWIuaGlkZSgpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBIaWRlIG90aGVyIHRhYiBtZW51IGl0ZW1zXG4gICAgICAgICAgICAgICAgICAgICAgICAkKCcuaXRlbVtkYXRhLXRhYj1cIm9yaWdpbmFsXCJdJykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJCgnLml0ZW1bZGF0YS10YWI9XCJyZXN1bHRcIl0nKS5oaWRlKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZW1wdHkgY29udGVudCBpbiBlZGl0b3IgZm9yIG5ldyBjdXN0b20gZmlsZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmNvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBJZiBkZWZhdWx0IGNvbnRlbnQgcHJvdmlkZWQgKGJhc2U2NCksIGRlY29kZSBpdCB3aXRoIFVURi04IHN1cHBvcnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkZWNvZGVkQ29udGVudCA9IGN1c3RvbUZpbGUuYmFzZTY0VG9VdGY4KHJlc3BvbnNlLmRhdGEuY29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2V0VmFsdWUoZGVjb2RlZENvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTZXQgZW1wdHkgY29udGVudCBmb3IgbmV3IGN1c3RvbSBmaWxlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2V0VmFsdWUoJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3IuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBvdGhlciBtb2RlcywgdXNlIHN0YW5kYXJkIGJlaGF2aW9yIChtb2RlIGFscmVhZHkgZXh0cmFjdGVkIGFib3ZlKVxuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5zZXRNb2RlKG1vZGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5jYk9uQ2hhbmdlTW9kZShtb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUudXBkYXRlRmlsZXBhdGhGaWVsZFN0YXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIExvYWQgZXhpc3RpbmcgZmlsZSBkYXRhIHZpYSBSRVNUIEFQSVxuICAgICAgICAgICAgY3VzdG9tRmlsZXNBUEkuZ2V0UmVjb3JkKGZpbGVJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFN0b3JlIGJhc2U2NCBjb250ZW50IHNlcGFyYXRlbHkgYW5kIHJlbW92ZSBmcm9tIGZvcm0gZGF0YVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBiYXNlNjRDb250ZW50ID0gcmVzcG9uc2UuZGF0YS5jb250ZW50O1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFN0b3JlIG1vZGUgc2VwYXJhdGVseSB0byBoYW5kbGUgaXQgY29ycmVjdGx5XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vZGUgPSByZXNwb25zZS5kYXRhLm1vZGUgfHwgJ25vbmUnO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBjb250ZW50IGFuZCBtb2RlIGZyb20gcmVzcG9uc2UgYmVmb3JlIHNldHRpbmcgZm9ybSB2YWx1ZXNcbiAgICAgICAgICAgICAgICAgICAgLy8gKGNvbnRlbnQgd2lsbCBiZSB0YWtlbiBmcm9tIEFDRSBlZGl0b3Igb24gc2F2ZSwgbW9kZSB3aWxsIGJlIHNldCBzZXBhcmF0ZWx5KVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBmb3JtRGF0YSA9IHsuLi5yZXNwb25zZS5kYXRhfTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGZvcm1EYXRhLmNvbnRlbnQ7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBmb3JtRGF0YS5tb2RlOyAgLy8gRG9uJ3QgbGV0IGZvcm0oJ3NldCB2YWx1ZXMnKSBoYW5kbGUgbW9kZVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCBmb3JtIHZhbHVlcyBmcm9tIEFQSSByZXNwb25zZSAod2l0aG91dCBjb250ZW50IGFuZCBtb2RlKVxuICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZXMnLCBmb3JtRGF0YSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRGVjb2RlIGJhc2U2NCBjb250ZW50IGFuZCBzZXQgaW4gZWRpdG9yIHdpdGggVVRGLTggc3VwcG9ydFxuICAgICAgICAgICAgICAgICAgICBpZiAoYmFzZTY0Q29udGVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVjb2RlZENvbnRlbnQgPSBjdXN0b21GaWxlLmJhc2U2NFRvVXRmOChiYXNlNjRDb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLnNldFZhbHVlKGRlY29kZWRDb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBTZXQgbW9kZSBhbmQgdHJpZ2dlciBVSSB1cGRhdGUgKG1vZGUgYWxyZWFkeSBleHRyYWN0ZWQgYWJvdmUpXG4gICAgICAgICAgICAgICAgICAgIGlmIChtb2RlID09PSAnY3VzdG9tJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRm9yIGV4aXN0aW5nIGN1c3RvbSBmaWxlcyAtIGZpbGVwYXRoIGlzIHJlYWQtb25seVxuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZmlsZXBhdGhJbnB1dC5wcm9wKCdyZWFkb25seScsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZmlsZXBhdGhGaWVsZC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2V0IG1vZGUgdG8gJ2N1c3RvbScgdXNpbmcgaGlkZGVuIGlucHV0XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLnNldE1vZGUoJ2N1c3RvbScpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTaG93IG9ubHkgZWRpdG9yIHRhYiBmb3IgY3VzdG9tIG1vZGVcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHRhYk1lbnUudGFiKCdjaGFuZ2UgdGFiJywgJ2VkaXRvcicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZWRpdG9yVGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJG9yaWdpbmFsVGFiLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHJlc3VsdFRhYi5oaWRlKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEhpZGUgb3RoZXIgdGFiIG1lbnUgaXRlbXNcbiAgICAgICAgICAgICAgICAgICAgICAgICQoJy5pdGVtW2RhdGEtdGFiPVwib3JpZ2luYWxcIl0nKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKCcuaXRlbVtkYXRhLXRhYj1cInJlc3VsdFwiXScpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBzeXN0ZW0gZmlsZXMgLSB1c2Ugc3RhbmRhcmQgYmVoYXZpb3JcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuc2V0TW9kZShtb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuY2JPbkNoYW5nZU1vZGUobW9kZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLnVwZGF0ZUZpbGVwYXRoRmllbGRTdGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgbG9hZGluZyBmYWlscywgcmVkaXJlY3QgdG8gaW5kZXhcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1jdXN0b20tZmlsZXMvaW5kZXhgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtXG4gICAgICAgIGN1c3RvbUZpbGUuaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmb3Igd2hlbiB0aGUgY29kZSBtb2RlIGNoYW5nZXMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgc2VsZWN0ZWQgdmFsdWUgZnJvbSB0aGUgZHJvcGRvd24uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUaGUgc2VsZWN0ZWQgdGV4dCBmcm9tIHRoZSBkcm9wZG93bi5cbiAgICAgKi9cbiAgICBjYk9uQ2hhbmdlTW9kZSh2YWx1ZSwgdGV4dCl7XG4gICAgICAgIC8vIEhhbmRsZSBjb2RlIHZpc2liaWxpdHkgYW5kIGNvbnRlbnQgYmFzZWQgb24gdGhlICdtb2RlJ1xuICAgICAgICBzd2l0Y2ggKHZhbHVlKSB7XG4gICAgICAgICAgICBjYXNlICdub25lJzpcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiR0YWJNZW51LnRhYignY2hhbmdlIHRhYicsJ29yaWdpbmFsJyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdvdmVycmlkZSc6XG4gICAgICAgICAgICBjYXNlICdjdXN0b20nOiAgLy8gQ3VzdG9tIG1vZGUgYmVoYXZlcyBsaWtlIG92ZXJyaWRlXG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kdGFiTWVudS50YWIoJ2NoYW5nZSB0YWInLCdlZGl0b3InKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2FwcGVuZCc6XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kdGFiTWVudS50YWIoJ2NoYW5nZSB0YWInLCdlZGl0b3InKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3NjcmlwdCc6XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kdGFiTWVudS50YWIoJ2NoYW5nZSB0YWInLCdlZGl0b3InKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kdGFiTWVudS50YWIoJ2NoYW5nZSB0YWInLCdvcmlnaW5hbCcpO1xuICAgICAgICB9XG4gICAgICAgIGN1c3RvbUZpbGUuaGlkZVNob3dDb2RlKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEV2ZW50IGhhbmRsZXIgZm9yIHRhYiBjaGFuZ2VzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGN1cnJlbnRUYWIgLSBUaGUgY3VycmVudCB0YWIgdGhhdCBpcyB2aXNpYmxlLlxuICAgICAqL1xuICAgIG9uQ2hhbmdlVGFiKGN1cnJlbnRUYWIpe1xuICAgICAgICBjb25zdCBmaWxlUGF0aCA9IGN1c3RvbUZpbGUuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2ZpbGVwYXRoJyk7XG4gICAgICAgIHN3aXRjaCAoY3VycmVudFRhYikge1xuICAgICAgICAgICAgY2FzZSAncmVzdWx0JzpcbiAgICAgICAgICAgICAgICAkKCcudGFiW2RhdGEtdGFiPVwicmVzdWx0XCJdJykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBGaWxlc0FQSS5nZXRGaWxlQ29udGVudChmaWxlUGF0aCwgY3VzdG9tRmlsZS5jYkdldFJlc3VsdEZpbGVDb250ZW50RnJvbVNlcnZlciwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnb3JpZ2luYWwnOlxuICAgICAgICAgICAgICAgICQoJy50YWJbZGF0YS10YWI9XCJvcmlnaW5hbFwiXScpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgRmlsZXNBUEkuZ2V0RmlsZUNvbnRlbnQoZmlsZVBhdGgsIGN1c3RvbUZpbGUuY2JHZXRPcmlnaW5hbEZpbGVDb250ZW50RnJvbVNlcnZlciwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdlZGl0b3InOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgdGhlIHZpc2liaWxpdHkgYW5kIGNvbnRlbnQgb2YgY29kZSBiYXNlZCBvbiB0aGUgJ21vZGUnIGZvcm0gdmFsdWUuXG4gICAgICogQWRqdXN0cyB0aGUgQWNlIGVkaXRvciBzZXR0aW5ncyBhY2NvcmRpbmdseS5cbiAgICAgKi9cbiAgICBoaWRlU2hvd0NvZGUoKSB7XG4gICAgICAgIC8vIFJldHJpZXZlICdtb2RlJyB2YWx1ZSAoZnJvbSBkcm9wZG93biBvciBoaWRkZW4gaW5wdXQgZm9yIGN1c3RvbSBtb2RlKVxuICAgICAgICBjb25zdCBtb2RlID0gY3VzdG9tRmlsZS5nZXRDdXJyZW50TW9kZSgpO1xuXG4gICAgICAgIC8vIEdldCBjdXJyZW50IGNvbnRlbnQgZnJvbSBlZGl0b3IgKG5vdCBmcm9tIGZvcm0sIGFzIGZvcm0gZG9lc24ndCBoYXZlIGl0IGFueW1vcmUpXG4gICAgICAgIGxldCBjb250ZW50ID0gY3VzdG9tRmlsZS5lZGl0b3IuZ2V0VmFsdWUoKTtcblxuICAgICAgICAvLyBHZXQgdGFiIG1lbnUgaXRlbXNcbiAgICAgICAgY29uc3QgJG9yaWdpbmFsVGFiTWVudUl0ZW0gPSAkKCcuaXRlbVtkYXRhLXRhYj1cIm9yaWdpbmFsXCJdJyk7XG4gICAgICAgIGNvbnN0ICRyZXN1bHRUYWJNZW51SXRlbSA9ICQoJy5pdGVtW2RhdGEtdGFiPVwicmVzdWx0XCJdJyk7XG5cbiAgICAgICAgLy8gSGFuZGxlIGNvZGUgdmlzaWJpbGl0eSBhbmQgY29udGVudCBiYXNlZCBvbiB0aGUgJ21vZGUnXG4gICAgICAgIHN3aXRjaCAobW9kZSkge1xuICAgICAgICAgICAgY2FzZSAnbm9uZSc6XG4gICAgICAgICAgICAgICAgLy8gSWYgJ21vZGUnIGlzICdub25lJywgc2hvdyBvbmx5IHJlc3VsdCBjb2RlIGdlbmVyYXRlZCBhbmQgaGlkZSBlZGl0b3IgYW5kIHJlc3VsdCB2aWV3ZXJcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRlZGl0b3JUYWIuaGlkZSgpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJG9yaWdpbmFsVGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLnZpZXdlck9yaWdpbmFsLm5hdmlnYXRlRmlsZVN0YXJ0KCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kcmVzdWx0VGFiLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAvLyBTaG93L2hpZGUgbWVudSBpdGVtc1xuICAgICAgICAgICAgICAgICRvcmlnaW5hbFRhYk1lbnVJdGVtLnNob3coKTtcbiAgICAgICAgICAgICAgICAkcmVzdWx0VGFiTWVudUl0ZW0uaGlkZSgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnYXBwZW5kJzpcbiAgICAgICAgICAgICAgICAvLyBJZiAnbW9kZScgaXMgJ2FwcGVuZCcsIHNob3cgYWxsIGZpZWxkc1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGVkaXRvclRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kb3JpZ2luYWxUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHJlc3VsdFRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbC5uYXZpZ2F0ZUZpbGVFbmQoKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLnZpZXdlclJlc3VsdC5uYXZpZ2F0ZUZpbGVFbmQoKTtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGFsbCBtZW51IGl0ZW1zXG4gICAgICAgICAgICAgICAgJG9yaWdpbmFsVGFiTWVudUl0ZW0uc2hvdygpO1xuICAgICAgICAgICAgICAgICRyZXN1bHRUYWJNZW51SXRlbS5zaG93KCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdvdmVycmlkZSc6XG4gICAgICAgICAgICAgICAgLy8gSWYgJ21vZGUnIGlzICdvdmVycmlkZScsIHNob3cgZWRpdG9yIGFuZCBoaWRlIG9yaWdpbmFsLCBidXQgc2hvdyByZXN1bHRcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRlZGl0b3JUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJG9yaWdpbmFsVGFiLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRyZXN1bHRUYWIuaGlkZSgpO1xuICAgICAgICAgICAgICAgIC8vIFNob3cvaGlkZSBtZW51IGl0ZW1zXG4gICAgICAgICAgICAgICAgJG9yaWdpbmFsVGFiTWVudUl0ZW0uaGlkZSgpO1xuICAgICAgICAgICAgICAgICRyZXN1bHRUYWJNZW51SXRlbS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdjdXN0b20nOlxuICAgICAgICAgICAgICAgIC8vIEZvciAnY3VzdG9tJyBtb2RlLCBvbmx5IHNob3cgZWRpdG9yIHRhYiAtIHVzZXIgZnVsbHkgY29udHJvbHMgdGhlIGZpbGVcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRlZGl0b3JUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJG9yaWdpbmFsVGFiLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRyZXN1bHRUYWIuaGlkZSgpO1xuICAgICAgICAgICAgICAgIC8vIEhpZGUgb3RoZXIgdGFiIG1lbnUgaXRlbXMgZm9yIGN1c3RvbSBmaWxlc1xuICAgICAgICAgICAgICAgICRvcmlnaW5hbFRhYk1lbnVJdGVtLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAkcmVzdWx0VGFiTWVudUl0ZW0uaGlkZSgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnc2NyaXB0JzpcbiAgICAgICAgICAgICAgICAvLyBJZiAnbW9kZScgaXMgJ3NjcmlwdCcsIHNob3cgYm90aCBzZXJ2ZXIgYW5kIGN1c3RvbSBjb2RlLCBhcHBseSBjdXN0b20gc2NyaXB0IHRvIHRoZSBmaWxlIGNvbnRlbnQgb24gc2VydmVyXG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZWRpdG9yVGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRvcmlnaW5hbFRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kcmVzdWx0VGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGFsbCBtZW51IGl0ZW1zIGZvciBzY3JpcHQgbW9kZVxuICAgICAgICAgICAgICAgICRvcmlnaW5hbFRhYk1lbnVJdGVtLnNob3coKTtcbiAgICAgICAgICAgICAgICAkcmVzdWx0VGFiTWVudUl0ZW0uc2hvdygpO1xuICAgICAgICAgICAgICAgIC8vIEVkaXRvciAtIG9ubHkgc2V0IHRlbXBsYXRlIGlmIGNvbnRlbnQgaXMgZW1wdHlcbiAgICAgICAgICAgICAgICBpZiAoIWNvbnRlbnQgfHwgY29udGVudC50cmltKCkgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgPSBgIyEvYmluL2Jhc2ggXFxuXFxuYDtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgY29uZmlnUGF0aD1cIiQxXCIgIyBQYXRoIHRvIHRoZSBvcmlnaW5hbCBjb25maWcgZmlsZVxcblxcbmA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYCMgRXhhbXBsZSAxOiBSZXBsYWNlIGFsbCB2YWx1ZXMgbWF4X2NvbnRhY3RzID0gNSB0byBtYXhfY29udGFjdHMgPSAxIG9uIHBqc2lwLmNvbmZcXG5gO1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGAjIHNlZCAtaSAncy9tYXhfY29udGFjdHMgPSA1L21heF9jb250YWN0cyA9IDEvZycgXCIkY29uZmlnUGF0aFwiXFxuXFxuYFxuXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYCMgRXhhbXBsZSAyOiBDaGFuZ2UgdmFsdWUgbWF4X2NvbnRhY3RzIG9ubHkgZm9yIHBlZXIgd2l0aCBleHRlbnNpb24gMjI2IG9uIHBqc2lwLmNvbmZcXG5gO1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGAjIHNlZCAtaSAnL15cXFxcWzIyNlxcXFxdJC8sL15cXFxcWy8gcy9tYXhfY29udGFjdHMgPSA1L21heF9jb250YWN0cyA9IDIvJyBcIiRjb25maWdQYXRoXCJcXG5cXG5gXG5cbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgIyBFeGFtcGxlIDM6IEFkZCBlbiBleHRyYSBzdHJpbmcgaW50byBbcGxheWJhY2stZXhpdF0gc2VjdGlvbiBhZnRlciB0aGUgXCJzYW1lID0+IG4sSGFuZ3VwKClcIiBzdHJpbmcgb24gZXh0ZW5zaW9ucy5jb25mXFxuYDtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgIyBzZWQgLWkgJy9eXFxcXFtwbGF5YmFjay1leGl0XFxcXF0kLywvXlxcXFxbLyBzL15cXFxcKFxcXFxzKnNhbWUgPT4gbixIYW5ndXAoKVxcXFwpL1xcXFwxXFxcXG5cXFxcdHNhbWUgPT4gbixOb09wKFwiWW91ciBOb09wIGNvbW1lbnQgaGVyZVwiKS8nIFwiJGNvbmZpZ1BhdGhcIlxcblxcbmA7XG5cbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgIyBBdHRlbnRpb24hIFlvdSB3aWxsIHNlZSBjaGFuZ2VzIGFmdGVyIHRoZSBiYWNrZ3JvdW5kIHdvcmtlciBwcm9jZXNzZXMgdGhlIHNjcmlwdCBvciBhZnRlciByZWJvb3RpbmcgdGhlIHN5c3RlbS4gXFxuYDtcblxuICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IHNldCBjb250ZW50IGlmIHdlIGNyZWF0ZWQgYSB0ZW1wbGF0ZVxuICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXRWYWx1ZShjb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3IuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIGFueSBvdGhlciAnbW9kZScgdmFsdWVzXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBjdXN0b21GaWxlLnZpZXdlck9yaWdpbmFsLnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXRUaGVtZSgnYWNlL3RoZW1lL21vbm9rYWknKTtcblxuICAgICAgICAvLyBEb24ndCBvdmVyd3JpdGUgZWRpdG9yIGNvbnRlbnQgaGVyZSAtIGl0J3MgYWxyZWFkeSBzZXQgY29ycmVjdGx5XG4gICAgICAgIC8vIGN1c3RvbUZpbGUuZWRpdG9yLnNldFZhbHVlKGNvbnRlbnQpO1xuICAgICAgICAvLyBjdXN0b21GaWxlLmVkaXRvci5jbGVhclNlbGVjdGlvbigpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0aGF0IGhhbmRsZXMgdGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBjb250YWluaW5nIHRoZSBmaWxlJ3MgY29udGVudC5cbiAgICAgKiBJdCB3aWxsIHVwZGF0ZSB0aGUgJ3ZpZXdlck9yaWdpbmFsJyB3aXRoIHRoZSBmaWxlJ3MgY29udGVudCBhbmQgYWRqdXN0IHRoZSBjb2RlIGRpc3BsYXkuXG4gICAgICovXG4gICAgY2JHZXRPcmlnaW5hbEZpbGVDb250ZW50RnJvbVNlcnZlcihyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5jb250ZW50ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGFjZVZpZXdlciA9IGN1c3RvbUZpbGUudmlld2VyT3JpZ2luYWw7XG4gICAgICAgICAgICBjb25zdCBzY3JvbGxUb3AgPSBhY2VWaWV3ZXIuc2Vzc2lvbi5nZXRTY3JvbGxUb3AoKTtcbiAgICAgICAgICAgIGFjZVZpZXdlci5zZXNzaW9uLnNldFZhbHVlKHJlc3BvbnNlLmRhdGEuY29udGVudCk7XG4gICAgICAgICAgICBhY2VWaWV3ZXIuc2Vzc2lvbi5zZXRTY3JvbGxUb3Aoc2Nyb2xsVG9wKTtcbiAgICAgICAgfVxuICAgICAgICAkKCcudGFiW2RhdGEtdGFiPVwib3JpZ2luYWxcIl0nKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0aGF0IGhhbmRsZXMgdGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBjb250YWluaW5nIHRoZSBmaWxlJ3MgY29udGVudC5cbiAgICAgKiBJdCB3aWxsIHVwZGF0ZSB0aGUgJ3ZpZXdlclJlc3VsdCcgd2l0aCB0aGUgZmlsZSdzIGNvbnRlbnQgYW5kIGFkanVzdCB0aGUgY29kZSBkaXNwbGF5LlxuICAgICAqL1xuICAgIGNiR2V0UmVzdWx0RmlsZUNvbnRlbnRGcm9tU2VydmVyKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmNvbnRlbnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29uc3QgYWNlVmlld2VyID0gY3VzdG9tRmlsZS52aWV3ZXJSZXN1bHQ7XG4gICAgICAgICAgICBjb25zdCBzY3JvbGxUb3AgPSBhY2VWaWV3ZXIuc2Vzc2lvbi5nZXRTY3JvbGxUb3AoKTtcbiAgICAgICAgICAgIGFjZVZpZXdlci5zZXNzaW9uLnNldFZhbHVlKHJlc3BvbnNlLmRhdGEuY29udGVudCk7XG4gICAgICAgICAgICBhY2VWaWV3ZXIuc2Vzc2lvbi5zZXRTY3JvbGxUb3Aoc2Nyb2xsVG9wKTtcbiAgICAgICAgfVxuICAgICAgICAkKCcudGFiW2RhdGEtdGFiPVwicmVzdWx0XCJdJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgQWNlIGVkaXRvciBpbnN0YW5jZXMgZm9yICdlZGl0b3InIGFuZCAndmlld2Vycycgd2luZG93cy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplQWNlKCkge1xuICAgICAgICAvLyBDYWxjdWxhdGUgYWNlIGVkaXRvciBoZWlnaHQgYW5kIHJvd3MgY291bnRcbiAgICAgICAgY29uc3QgYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gNDc1O1xuICAgICAgICBjb25zdCByb3dzQ291bnQgPSBNYXRoLnJvdW5kKGFjZUhlaWdodCAvIDE2LjMpO1xuXG4gICAgICAgIC8vIFNldCBtaW5pbXVtIGhlaWdodCBmb3IgdGhlIGNvZGUgc2VjdGlvbnMgb24gd2luZG93IGxvYWRcbiAgICAgICAgJCgnLmFwcGxpY2F0aW9uLWNvZGUnKS5jc3MoJ21pbi1oZWlnaHQnLCBgJHthY2VIZWlnaHR9cHhgKTtcblxuICAgICAgICAvLyBBQ0Ugd2luZG93IGZvciB0aGUgb3JpZ2luYWwgZmlsZSBjb250ZW50LlxuICAgICAgICBjb25zdCBJbmlNb2RlID0gYWNlLnJlcXVpcmUoJ2FjZS9tb2RlL2p1bGlhJykuTW9kZTtcbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbCA9IGFjZS5lZGl0KCdjb25maWctZmlsZS1vcmlnaW5hbCcpO1xuICAgICAgICBjdXN0b21GaWxlLnZpZXdlck9yaWdpbmFsLnNlc3Npb24uc2V0TW9kZShuZXcgSW5pTW9kZSgpKTtcbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbC5zZXRUaGVtZSgnYWNlL3RoZW1lL21vbm9rYWknKTtcbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbC5zZXRPcHRpb25zKHtcbiAgICAgICAgICAgIHNob3dQcmludE1hcmdpbjogZmFsc2UsXG4gICAgICAgICAgICByZWFkT25seTogdHJ1ZSxcbiAgICAgICAgICAgIG1pbkxpbmVzOiByb3dzQ291bnRcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQUNFIHdpbmRvdyBmb3IgdGhlIHJlc3VsdGVkIGZpbGUgY29udGVudC5cbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJSZXN1bHQgPSBhY2UuZWRpdCgnY29uZmlnLWZpbGUtcmVzdWx0Jyk7XG4gICAgICAgIGN1c3RvbUZpbGUudmlld2VyUmVzdWx0LnNlc3Npb24uc2V0TW9kZShuZXcgSW5pTW9kZSgpKTtcbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJSZXN1bHQuc2V0VGhlbWUoJ2FjZS90aGVtZS9tb25va2FpJyk7XG4gICAgICAgIGN1c3RvbUZpbGUudmlld2VyUmVzdWx0LnNldE9wdGlvbnMoe1xuICAgICAgICAgICAgc2hvd1ByaW50TWFyZ2luOiBmYWxzZSxcbiAgICAgICAgICAgIHJlYWRPbmx5OiB0cnVlLFxuICAgICAgICAgICAgbWluTGluZXM6IHJvd3NDb3VudFxuICAgICAgICB9KTtcblxuXG4gICAgICAgIC8vIEFDRSB3aW5kb3cgZm9yIHRoZSB1c2VyIGVkaXRvci5cbiAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3IgPSBhY2UuZWRpdCgndXNlci1lZGl0LWNvbmZpZycpO1xuICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXNzaW9uLnNldE1vZGUobmV3IEluaU1vZGUoKSk7XG4gICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXRPcHRpb25zKHtcbiAgICAgICAgICAgIHNob3dQcmludE1hcmdpbjogZmFsc2UsXG4gICAgICAgICAgICBtaW5MaW5lczogcm93c0NvdW50LFxuICAgICAgICB9KTtcbiAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2Vzc2lvbi5vbignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgLy8gVHJpZ2dlciBjaGFuZ2UgZXZlbnQgdG8gYWNrbm93bGVkZ2UgdGhlIG1vZGlmaWNhdGlvblxuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyAgQWRkIGhhbmRsZXJzIGZvciBmdWxsc2NyZWVuIG1vZGUgYnV0dG9uc1xuICAgICAgICAkKCcuZnVsbHNjcmVlbi10b2dnbGUtYnRuJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY29uc3QgY29udGFpbmVyID0gJCh0aGlzKS5zaWJsaW5ncygnLmFwcGxpY2F0aW9uLWNvZGUnKVswXTtcbiAgICAgICAgICAgIGN1c3RvbUZpbGUudG9nZ2xlRnVsbFNjcmVlbihjb250YWluZXIpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgaGFuZGxlciB0byByZWNhbGN1bGF0ZSBzaXplcyB3aGVuIGV4aXRpbmcgZnVsbHNjcmVlbiBtb2RlXG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2Z1bGxzY3JlZW5jaGFuZ2UnLCBjdXN0b21GaWxlLmFkanVzdEVkaXRvckhlaWdodCk7XG5cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEVuYWJsZS9kaXNhYmxlIGZ1bGxzY3JlZW4gbW9kZSBmb3IgYSBzcGVjaWZpYyBibG9jay5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGNvbnRhaW5lciAtIFRoZSBjb250YWluZXIgdG8gZXhwYW5kIHRvIGZ1bGxzY3JlZW4uXG4gICAgICovXG4gICAgdG9nZ2xlRnVsbFNjcmVlbihjb250YWluZXIpIHtcbiAgICAgICAgaWYgKCFkb2N1bWVudC5mdWxsc2NyZWVuRWxlbWVudCkge1xuICAgICAgICAgICAgY29udGFpbmVyLnJlcXVlc3RGdWxsc2NyZWVuKCkuY2F0Y2goZXJyID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGBFcnJvciBhdHRlbXB0aW5nIHRvIGVuYWJsZSBmdWxsLXNjcmVlbiBtb2RlOiAke2Vyci5tZXNzYWdlfWApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkb2N1bWVudC5leGl0RnVsbHNjcmVlbigpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlY2FsY3VsYXRlIGVkaXRvciBoZWlnaHRzIHdoZW4gdGhlIHNjcmVlbiBtb2RlIGNoYW5nZXMuXG4gICAgICovXG4gICAgYWRqdXN0RWRpdG9ySGVpZ2h0KCkge1xuICAgICAgICBjb25zdCBlZGl0b3JzID0gW2N1c3RvbUZpbGUudmlld2VyT3JpZ2luYWwsIGN1c3RvbUZpbGUudmlld2VyUmVzdWx0LCBjdXN0b21GaWxlLmVkaXRvcl07XG4gICAgICAgIGVkaXRvcnMuZm9yRWFjaChlZGl0b3IgPT4ge1xuICAgICAgICAgICAgaWYgKGVkaXRvcikge1xuICAgICAgICAgICAgICAgIGVkaXRvci5yZXNpemUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuXG4gICAgICAgIC8vIElNUE9SVEFOVDogR2V0IG1vZGUgQkVGT1JFIGZvcm0oJ2dldCB2YWx1ZXMnKSB0byBwcmV2ZW50IGRyb3Bkb3duIGZyb20gb3ZlcnJpZGluZyBpdFxuICAgICAgICBjb25zdCBtb2RlID0gY3VzdG9tRmlsZS5nZXRDdXJyZW50TW9kZSgpO1xuXG4gICAgICAgIC8vIEdldCBhbGwgZm9ybSB2YWx1ZXNcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBjdXN0b21GaWxlLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblxuICAgICAgICAvLyBPdmVycmlkZSBtb2RlIHdpdGggdGhlIGNvcnJlY3QgdmFsdWUgKGZyb20gZ2V0Q3VycmVudE1vZGUpXG4gICAgICAgIHJlc3VsdC5kYXRhLm1vZGUgPSBtb2RlO1xuXG4gICAgICAgIC8vIFJlbW92ZSB0ZWNobmljYWwgZmllbGQgZnJvbSBkYXRhXG4gICAgICAgIGRlbGV0ZSByZXN1bHQuZGF0YVsnbW9kZS1jdXN0b20tdmFsdWUnXTtcblxuICAgICAgICAvLyBHZXQgY29udGVudCBmcm9tIEFjZSBlZGl0b3IgYmFzZWQgb24gbW9kZVxuICAgICAgICBzd2l0Y2ggKG1vZGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ2FwcGVuZCc6XG4gICAgICAgICAgICBjYXNlICdvdmVycmlkZSc6XG4gICAgICAgICAgICBjYXNlICdjdXN0b20nOlxuICAgICAgICAgICAgY2FzZSAnc2NyaXB0JzpcbiAgICAgICAgICAgICAgICAvLyBHZXQgY29udGVudCBmcm9tIEFjZSBlZGl0b3IgKG5vdCBiYXNlNjQgZW5jb2RlZCB5ZXQpXG4gICAgICAgICAgICAgICAgaWYgKCFjdXN0b21GaWxlLmVkaXRvcikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFZGl0b3IgaXMgbm90IGluaXRpYWxpemVkIScpO1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQuZGF0YS5jb250ZW50ID0gJyc7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZWRpdG9yQ29udGVudCA9IGN1c3RvbUZpbGUuZWRpdG9yLmdldFZhbHVlKCk7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhLmNvbnRlbnQgPSBlZGl0b3JDb250ZW50O1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ25vbmUnOlxuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAvLyBGb3IgJ25vbmUnIG1vZGUsIGNsZWFyIHRoZSBjb250ZW50XG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGEuY29udGVudCA9ICcnO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG5cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBjdXN0b20gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGN1c3RvbUZpbGUuJGZvcm1PYmo7XG5cbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIHNldHRpbmdzIGZvciBGb3JtXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgYXBpT2JqZWN0OiBjdXN0b21GaWxlc0FQSSxcbiAgICAgICAgICAgIHNhdmVNZXRob2Q6ICdzYXZlJywgIC8vIFdpbGwgdXNlIHRoZSBzbWFydCBzYXZlIG1ldGhvZCB0aGF0IGRldGVybWluZXMgY3JlYXRlL3VwZGF0ZVxuICAgICAgICAgICAgYXV0b0RldGVjdE1ldGhvZDogZmFsc2UsICAvLyBXZSBoYW5kbGUgdGhpcyBpbiBvdXIgc2F2ZSBtZXRob2RcbiAgICAgICAgICAgIGlkRmllbGQ6ICdpZCdcbiAgICAgICAgfTtcblxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBjdXN0b21GaWxlLnZhbGlkYXRlUnVsZXM7IC8vIEZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBjdXN0b21GaWxlLmNiQmVmb3JlU2VuZEZvcm07IC8vIENhbGxiYWNrIGJlZm9yZSBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBjdXN0b21GaWxlLmNiQWZ0ZXJTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG59O1xuXG4vLyBJbml0aWFsaXplIHRoZSBjdXN0b20gZmlsZXMgbW9kaWZ5IGZvcm0gd2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHkuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgY3VzdG9tRmlsZS5pbml0aWFsaXplKCk7XG59KTtcblxuIl19