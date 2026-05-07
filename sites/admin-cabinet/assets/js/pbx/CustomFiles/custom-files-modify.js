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
   * Resolved in initialize() — must not call $() at module-load time.
   * @type {jQuery}
   */
  $formObj: null,

  /**
   * jQuery object for the tab menu.
   * @type {jQuery}
   */
  $tabMenu: null,

  /**
   * jQuery object for the mode select.
   * @type {jQuery}
   */
  $modeDropDown: null,

  /**
   * jQuery object for the hidden custom mode input.
   * @type {jQuery}
   */
  $modeCustomInput: null,

  /**
   * jQuery object for the tab with original file content.
   * @type {jQuery}
   */
  $originalTab: null,

  /**
   * jQuery object for the tab with user content/script editor.
   * @type {jQuery}
   */
  $editorTab: null,

  /**
   * jQuery object for the tab with resulted file content.
   * @type {jQuery}
   */
  $resultTab: null,

  /**
   * jQuery element for the main content container.
   * @type {jQuery}
   */
  $mainContainer: null,

  /**
   * jQuery object for the filepath input field.
   * @type {jQuery}
   */
  $filepathInput: null,

  /**
   * jQuery object for the filepath field container.
   * @type {jQuery}
   */
  $filepathField: null,

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
    customFile.$formObj = $('#custom-file-form');
    customFile.$tabMenu = $('#custom-files-menu .item');
    customFile.$originalTab = $('a[data-tab="original"]');
    customFile.$editorTab = $('a[data-tab="editor"]');
    customFile.$resultTab = $('a[data-tab="result"]');
    customFile.$mainContainer = $('#main-content-container');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DdXN0b21GaWxlcy9jdXN0b20tZmlsZXMtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbImN1c3RvbUZpbGUiLCIkZm9ybU9iaiIsIiR0YWJNZW51IiwiJG1vZGVEcm9wRG93biIsIiRtb2RlQ3VzdG9tSW5wdXQiLCIkb3JpZ2luYWxUYWIiLCIkZWRpdG9yVGFiIiwiJHJlc3VsdFRhYiIsIiRtYWluQ29udGFpbmVyIiwiJGZpbGVwYXRoSW5wdXQiLCIkZmlsZXBhdGhGaWVsZCIsImVkaXRvciIsInZpZXdlck9yaWdpbmFsIiwidmlld2VyUmVzdWx0IiwidmFsaWRhdGVSdWxlcyIsIm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiY2ZfVmFsaWRhdGVOYW1lSXNFbXB0eSIsImJhc2U2NFRvVXRmOCIsImJhc2U2NFN0ciIsImJpbmFyeVN0cmluZyIsImF0b2IiLCJUZXh0RGVjb2RlciIsImJ5dGVzIiwiVWludDhBcnJheSIsImxlbmd0aCIsImkiLCJjaGFyQ29kZUF0IiwiZGVjb2RlIiwiZGVjb2RlVVJJQ29tcG9uZW50IiwiZXNjYXBlIiwiZSIsImNvbnNvbGUiLCJlcnJvciIsImdldEN1cnJlbnRNb2RlIiwiY3VzdG9tTW9kZVZhbHVlIiwidmFsIiwiZm9ybSIsInNldE1vZGUiLCJtb2RlIiwicGFyZW50IiwiaGlkZSIsImRyb3Bkb3duIiwic2hvdyIsInVwZGF0ZUZpbGVwYXRoRmllbGRTdGF0ZSIsImlzVXNlckNyZWF0ZWQiLCJmaWxlSWQiLCJwcm9wIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImluaXRpYWxpemUiLCIkIiwidGFiIiwib25WaXNpYmxlIiwib25DaGFuZ2VUYWIiLCJpbml0aWFsaXplQWNlIiwib25DaGFuZ2UiLCJjYk9uQ2hhbmdlTW9kZSIsInVybFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsIndpbmRvdyIsImxvY2F0aW9uIiwic2VhcmNoIiwidXJsSWQiLCJwYXRobmFtZSIsIm1hdGNoIiwiY3VzdG9tRmlsZXNBUEkiLCJnZXRSZWNvcmQiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJmb3JtRGF0YSIsImNvbnRlbnQiLCJkZWNvZGVkQ29udGVudCIsInNldFZhbHVlIiwiY2xlYXJTZWxlY3Rpb24iLCJiYXNlNjRDb250ZW50IiwiZ2xvYmFsUm9vdFVybCIsImluaXRpYWxpemVGb3JtIiwidmFsdWUiLCJ0ZXh0IiwiaGlkZVNob3dDb2RlIiwiY3VycmVudFRhYiIsImZpbGVQYXRoIiwiRmlsZXNBUEkiLCJnZXRGaWxlQ29udGVudCIsImNiR2V0UmVzdWx0RmlsZUNvbnRlbnRGcm9tU2VydmVyIiwiY2JHZXRPcmlnaW5hbEZpbGVDb250ZW50RnJvbVNlcnZlciIsImdldFZhbHVlIiwiJG9yaWdpbmFsVGFiTWVudUl0ZW0iLCIkcmVzdWx0VGFiTWVudUl0ZW0iLCJuYXZpZ2F0ZUZpbGVTdGFydCIsIm5hdmlnYXRlRmlsZUVuZCIsInRyaW0iLCJzZXRUaGVtZSIsInVuZGVmaW5lZCIsImFjZVZpZXdlciIsInNjcm9sbFRvcCIsInNlc3Npb24iLCJnZXRTY3JvbGxUb3AiLCJzZXRTY3JvbGxUb3AiLCJhY2VIZWlnaHQiLCJpbm5lckhlaWdodCIsInJvd3NDb3VudCIsIk1hdGgiLCJyb3VuZCIsImNzcyIsIkluaU1vZGUiLCJhY2UiLCJyZXF1aXJlIiwiTW9kZSIsImVkaXQiLCJzZXRPcHRpb25zIiwic2hvd1ByaW50TWFyZ2luIiwicmVhZE9ubHkiLCJtaW5MaW5lcyIsIm9uIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwiY29udGFpbmVyIiwic2libGluZ3MiLCJ0b2dnbGVGdWxsU2NyZWVuIiwiZG9jdW1lbnQiLCJhZGRFdmVudExpc3RlbmVyIiwiYWRqdXN0RWRpdG9ySGVpZ2h0IiwiZnVsbHNjcmVlbkVsZW1lbnQiLCJyZXF1ZXN0RnVsbHNjcmVlbiIsImVyciIsIm1lc3NhZ2UiLCJleGl0RnVsbHNjcmVlbiIsImVkaXRvcnMiLCJmb3JFYWNoIiwicmVzaXplIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwiZWRpdG9yQ29udGVudCIsImNiQWZ0ZXJTZW5kRm9ybSIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJhdXRvRGV0ZWN0TWV0aG9kIiwiaWRGaWVsZCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFVBQVUsR0FBRztBQUVmO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFLElBUEs7O0FBU2Y7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFLElBYks7O0FBZWY7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFLElBbkJBOztBQXFCZjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxnQkFBZ0IsRUFBRSxJQXpCSDs7QUEyQmY7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsWUFBWSxFQUFFLElBL0JDOztBQWlDZjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxVQUFVLEVBQUUsSUFyQ0c7O0FBdUNmO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFVBQVUsRUFBRSxJQTNDRzs7QUE2Q2Y7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsY0FBYyxFQUFFLElBakREOztBQW1EZjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxjQUFjLEVBQUUsSUF2REQ7O0FBeURmO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGNBQWMsRUFBRSxJQTdERDs7QUFnRWY7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsTUFBTSxFQUFFLEVBcEVPO0FBcUVmQyxFQUFBQSxjQUFjLEVBQUUsRUFyRUQ7QUFzRWZD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QUEzQixDQURhLENBR2I7O0FBQ0F3SCxJQUFBQSxJQUFJLENBQUNvQixXQUFMLEdBQW1CO0FBQ2ZDLE1BQUFBLE9BQU8sRUFBRSxJQURNO0FBRWZDLE1BQUFBLFNBQVMsRUFBRXpFLGNBRkk7QUFHZjBFLE1BQUFBLFVBQVUsRUFBRSxNQUhHO0FBR007QUFDckJDLE1BQUFBLGdCQUFnQixFQUFFLEtBSkg7QUFJVztBQUMxQkMsTUFBQUEsT0FBTyxFQUFFO0FBTE0sS0FBbkI7QUFRQXpCLElBQUFBLElBQUksQ0FBQzNHLGFBQUwsR0FBcUJkLFVBQVUsQ0FBQ2MsYUFBaEMsQ0FaYSxDQVlrQzs7QUFDL0MyRyxJQUFBQSxJQUFJLENBQUNnQixnQkFBTCxHQUF3QnpJLFVBQVUsQ0FBQ3lJLGdCQUFuQyxDQWJhLENBYXdDOztBQUNyRGhCLElBQUFBLElBQUksQ0FBQ21CLGVBQUwsR0FBdUI1SSxVQUFVLENBQUM0SSxlQUFsQyxDQWRhLENBY3NDOztBQUNuRG5CLElBQUFBLElBQUksQ0FBQ25FLFVBQUw7QUFDSDtBQXRwQmMsQ0FBbkIsQyxDQXlwQkE7O0FBQ0FDLENBQUMsQ0FBQ3VFLFFBQUQsQ0FBRCxDQUFZcUIsS0FBWixDQUFrQixZQUFNO0FBQ3BCbkosRUFBQUEsVUFBVSxDQUFDc0QsVUFBWDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIGFjZSwgRm9ybSwgRmlsZXNBUEksIGN1c3RvbUZpbGVzQVBJLCBQYnhBcGlDbGllbnQgKi9cblxuXG4vKipcbiAqIE1vZHVsZSBjdXN0b21GaWxlXG4gKiBUaGlzIG1vZHVsZSBtYW5hZ2VzIGZpbGUgaW50ZXJhY3Rpb25zIGluIGEgVUksIHN1Y2ggYXMgbG9hZGluZyBmaWxlIGNvbnRlbnQgZnJvbSBhIHNlcnZlciBhbmQgaGFuZGxpbmcgdXNlciBpbnB1dC5cbiAqIEBtb2R1bGUgY3VzdG9tRmlsZVxuICovXG5jb25zdCBjdXN0b21GaWxlID0ge1xuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogUmVzb2x2ZWQgaW4gaW5pdGlhbGl6ZSgpIOKAlCBtdXN0IG5vdCBjYWxsICQoKSBhdCBtb2R1bGUtbG9hZCB0aW1lLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdGFiIG1lbnUuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkdGFiTWVudTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBtb2RlIHNlbGVjdC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRtb2RlRHJvcERvd246IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgaGlkZGVuIGN1c3RvbSBtb2RlIGlucHV0LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG1vZGVDdXN0b21JbnB1dDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB0YWIgd2l0aCBvcmlnaW5hbCBmaWxlIGNvbnRlbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkb3JpZ2luYWxUYWI6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdGFiIHdpdGggdXNlciBjb250ZW50L3NjcmlwdCBlZGl0b3IuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZWRpdG9yVGFiOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHRhYiB3aXRoIHJlc3VsdGVkIGZpbGUgY29udGVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRyZXN1bHRUYWI6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgZWxlbWVudCBmb3IgdGhlIG1haW4gY29udGVudCBjb250YWluZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbWFpbkNvbnRhaW5lcjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmaWxlcGF0aCBpbnB1dCBmaWVsZC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmaWxlcGF0aElucHV0OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZpbGVwYXRoIGZpZWxkIGNvbnRhaW5lci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmaWxlcGF0aEZpZWxkOiBudWxsLFxuXG5cbiAgICAvKipcbiAgICAgKiBBY2UgZWRpdG9yIGluc3RhbmNlc1xuICAgICAqIGBlZGl0b3JgIGlzIGZvciBpbnB1dCBhbmQgYHZpZXdlcnNgIGlzIGZvciBkaXNwbGF5IGNvZGUgZnJvbSBzZXJ2ZXJcbiAgICAgKi9cbiAgICBlZGl0b3I6ICcnLFxuICAgIHZpZXdlck9yaWdpbmFsOiAnJyxcbiAgICB2aWV3ZXJSZXN1bHQ6ICcnLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIG5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdmaWxlcGF0aCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuY2ZfVmFsaWRhdGVOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGVjb2RlIGJhc2U2NCBzdHJpbmcgdG8gVVRGLThcbiAgICAgKiBIYW5kbGVzIFVuaWNvZGUgY2hhcmFjdGVycyAoUnVzc2lhbiwgQ2hpbmVzZSwgZXRjLilcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBiYXNlNjRTdHIgLSBCYXNlNjQgZW5jb2RlZCBzdHJpbmdcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBVVEYtOCBkZWNvZGVkIHN0cmluZ1xuICAgICAqL1xuICAgIGJhc2U2NFRvVXRmOChiYXNlNjRTdHIpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIERlY29kZSBiYXNlNjQgdG8gYmluYXJ5IHN0cmluZ1xuICAgICAgICAgICAgY29uc3QgYmluYXJ5U3RyaW5nID0gYXRvYihiYXNlNjRTdHIpO1xuXG4gICAgICAgICAgICAvLyBVc2UgVGV4dERlY29kZXIgZm9yIG1vZGVybiBicm93c2Vyc1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBUZXh0RGVjb2RlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBieXRlcyA9IG5ldyBVaW50OEFycmF5KGJpbmFyeVN0cmluZy5sZW5ndGgpO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYmluYXJ5U3RyaW5nLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGJ5dGVzW2ldID0gYmluYXJ5U3RyaW5nLmNoYXJDb2RlQXQoaSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgVGV4dERlY29kZXIoKS5kZWNvZGUoYnl0ZXMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBGYWxsYmFjayBmb3Igb2xkZXIgYnJvd3NlcnNcbiAgICAgICAgICAgICAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KGVzY2FwZShiaW5hcnlTdHJpbmcpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gZGVjb2RlIGJhc2U2NDonLCBlKTtcbiAgICAgICAgICAgIHJldHVybiBiYXNlNjRTdHI7IC8vIFJldHVybiBhcy1pcyBpZiBkZWNvZGUgZmFpbHNcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgY3VycmVudCBtb2RlIHZhbHVlIChmcm9tIGRyb3Bkb3duIG9yIGhpZGRlbiBpbnB1dCBmb3IgY3VzdG9tIG1vZGUpXG4gICAgICogQHJldHVybnMge3N0cmluZ30gQ3VycmVudCBtb2RlIHZhbHVlXG4gICAgICovXG4gICAgZ2V0Q3VycmVudE1vZGUoKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIGN1c3RvbSBtb2RlIGlzIGFjdGl2ZSAoaGlkZGVuIGlucHV0IGhhcyB2YWx1ZSlcbiAgICAgICAgY29uc3QgY3VzdG9tTW9kZVZhbHVlID0gY3VzdG9tRmlsZS4kbW9kZUN1c3RvbUlucHV0LnZhbCgpO1xuICAgICAgICBpZiAoY3VzdG9tTW9kZVZhbHVlID09PSAnY3VzdG9tJykge1xuICAgICAgICAgICAgcmV0dXJuICdjdXN0b20nO1xuICAgICAgICB9XG4gICAgICAgIC8vIE90aGVyd2lzZSByZXR1cm4gZHJvcGRvd24gdmFsdWVcbiAgICAgICAgcmV0dXJuIGN1c3RvbUZpbGUuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ21vZGUnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2V0IG1vZGUgdmFsdWUgKHVzaW5nIGRyb3Bkb3duIGZvciBzdGFuZGFyZCBtb2RlcywgaGlkZGVuIGlucHV0IGZvciBjdXN0b20gbW9kZSlcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbW9kZSAtIE1vZGUgdG8gc2V0XG4gICAgICovXG4gICAgc2V0TW9kZShtb2RlKSB7XG4gICAgICAgIGlmIChtb2RlID09PSAnY3VzdG9tJykge1xuICAgICAgICAgICAgLy8gU2V0IGN1c3RvbSBtb2RlIHZpYSBoaWRkZW4gaW5wdXRcbiAgICAgICAgICAgIGN1c3RvbUZpbGUuJG1vZGVDdXN0b21JbnB1dC52YWwoJ2N1c3RvbScpO1xuICAgICAgICAgICAgLy8gSGlkZSBkcm9wZG93biBmb3IgY3VzdG9tIGZpbGVzXG4gICAgICAgICAgICBjdXN0b21GaWxlLiRtb2RlRHJvcERvd24ucGFyZW50KCkucGFyZW50KCkuaGlkZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gQ2xlYXIgY3VzdG9tIG1vZGVcbiAgICAgICAgICAgIGN1c3RvbUZpbGUuJG1vZGVDdXN0b21JbnB1dC52YWwoJycpO1xuICAgICAgICAgICAgLy8gU2V0IHN0YW5kYXJkIG1vZGUgdmlhIGRyb3Bkb3duXG4gICAgICAgICAgICBjdXN0b21GaWxlLiRtb2RlRHJvcERvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIG1vZGUpO1xuICAgICAgICAgICAgLy8gU2hvdyBkcm9wZG93blxuICAgICAgICAgICAgY3VzdG9tRmlsZS4kbW9kZURyb3BEb3duLnBhcmVudCgpLnBhcmVudCgpLnNob3coKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSBmaWxlcGF0aCBmaWVsZCBzdGF0ZSBiYXNlZCBvbiB3aGV0aGVyIHRoZSBmaWxlIGlzIHVzZXItY3JlYXRlZCAoTU9ERV9DVVNUT00pIG9yIHN5c3RlbS1tYW5hZ2VkLlxuICAgICAqIFVzZXItY3JlYXRlZCBmaWxlcyBoYXZlIGVkaXRhYmxlIGZpbGVwYXRoIGJ1dCBjYW5ub3QgYmUgY3JlYXRlZCAob25seSBmb3IgbmV3IGZpbGVzKSxcbiAgICAgKiBzeXN0ZW0tbWFuYWdlZCBmaWxlcyBoYXZlIHJlYWQtb25seSBmaWxlcGF0aC5cbiAgICAgKi9cbiAgICB1cGRhdGVGaWxlcGF0aEZpZWxkU3RhdGUoKSB7XG4gICAgICAgIGNvbnN0IG1vZGUgPSBjdXN0b21GaWxlLmdldEN1cnJlbnRNb2RlKCk7XG4gICAgICAgIGNvbnN0IGlzVXNlckNyZWF0ZWQgPSBtb2RlID09PSAnY3VzdG9tJztcbiAgICAgICAgY29uc3QgZmlsZUlkID0gY3VzdG9tRmlsZS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnaWQnKTtcblxuICAgICAgICBpZiAoaXNVc2VyQ3JlYXRlZCkge1xuICAgICAgICAgICAgaWYgKCFmaWxlSWQgfHwgZmlsZUlkID09PSAnJykge1xuICAgICAgICAgICAgICAgIC8vIE5ldyBjdXN0b20gZmlsZSAtIGZpbGVwYXRoIGlzIGVkaXRhYmxlXG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZmlsZXBhdGhJbnB1dC5wcm9wKCdyZWFkb25seScsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRmaWxlcGF0aEZpZWxkLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBFeGlzdGluZyBjdXN0b20gZmlsZSAtIGZpbGVwYXRoIGlzIHJlYWQtb25seSAoY2Fubm90IGJlIGNoYW5nZWQgYWZ0ZXIgY3JlYXRpb24pXG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZmlsZXBhdGhJbnB1dC5wcm9wKCdyZWFkb25seScsIHRydWUpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGZpbGVwYXRoRmllbGQuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBBbHdheXMgaGlkZSBtb2RlIHNlbGVjdG9yIGZvciBjdXN0b20gZmlsZXNcbiAgICAgICAgICAgIGN1c3RvbUZpbGUuJG1vZGVEcm9wRG93bi5wYXJlbnQoKS5wYXJlbnQoKS5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBTeXN0ZW0tbWFuYWdlZCBmaWxlIC0gZmlsZXBhdGggaXMgYWx3YXlzIHJlYWQtb25seVxuICAgICAgICAgICAgY3VzdG9tRmlsZS4kZmlsZXBhdGhJbnB1dC5wcm9wKCdyZWFkb25seScsIHRydWUpO1xuICAgICAgICAgICAgY3VzdG9tRmlsZS4kZmlsZXBhdGhGaWVsZC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIC8vIFNob3cgbW9kZSBzZWxlY3RvciBmb3Igc3lzdGVtIGZpbGVzXG4gICAgICAgICAgICBjdXN0b21GaWxlLiRtb2RlRHJvcERvd24ucGFyZW50KCkucGFyZW50KCkuc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBjdXN0b21GaWxlIG1vZHVsZS5cbiAgICAgKiBTZXRzIHVwIHRoZSBkcm9wZG93biwgaW5pdGlhbGl6ZXMgQWNlIGVkaXRvciwgZm9ybSwgYW5kIHJldHJpZXZlcyBmaWxlIGNvbnRlbnQgZnJvbSB0aGUgc2VydmVyLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgalF1ZXJ5IG9iamVjdHMgYWZ0ZXIgRE9NIGlzIHJlYWR5XG4gICAgICAgIGN1c3RvbUZpbGUuJGZvcm1PYmogPSAkKCcjY3VzdG9tLWZpbGUtZm9ybScpO1xuICAgICAgICBjdXN0b21GaWxlLiR0YWJNZW51ID0gJCgnI2N1c3RvbS1maWxlcy1tZW51IC5pdGVtJyk7XG4gICAgICAgIGN1c3RvbUZpbGUuJG9yaWdpbmFsVGFiID0gJCgnYVtkYXRhLXRhYj1cIm9yaWdpbmFsXCJdJyk7XG4gICAgICAgIGN1c3RvbUZpbGUuJGVkaXRvclRhYiA9ICQoJ2FbZGF0YS10YWI9XCJlZGl0b3JcIl0nKTtcbiAgICAgICAgY3VzdG9tRmlsZS4kcmVzdWx0VGFiID0gJCgnYVtkYXRhLXRhYj1cInJlc3VsdFwiXScpO1xuICAgICAgICBjdXN0b21GaWxlLiRtYWluQ29udGFpbmVyID0gJCgnI21haW4tY29udGVudC1jb250YWluZXInKTtcbiAgICAgICAgY3VzdG9tRmlsZS4kZmlsZXBhdGhJbnB1dCA9ICQoJyNmaWxlcGF0aCcpO1xuICAgICAgICBjdXN0b21GaWxlLiRmaWxlcGF0aEZpZWxkID0gJCgnI2ZpbGVwYXRoLWZpZWxkJyk7XG4gICAgICAgIGN1c3RvbUZpbGUuJG1vZGVEcm9wRG93biA9ICQoJyNtb2RlLWRyb3Bkb3duJyk7XG4gICAgICAgIGN1c3RvbUZpbGUuJG1vZGVDdXN0b21JbnB1dCA9ICQoJyNtb2RlLWN1c3RvbS12YWx1ZScpO1xuXG4gICAgICAgIC8vIEVuYWJsZSB0YWIgbmF2aWdhdGlvbiB3aXRoIGhpc3Rvcnkgc3VwcG9ydFxuICAgICAgICBjdXN0b21GaWxlLiR0YWJNZW51LnRhYih7XG4gICAgICAgICAgICBvblZpc2libGU6IGN1c3RvbUZpbGUub25DaGFuZ2VUYWJcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY3VzdG9tRmlsZS4kbWFpbkNvbnRhaW5lci5yZW1vdmVDbGFzcygnY29udGFpbmVyJyk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBBY2UgZWRpdG9yXG4gICAgICAgIGN1c3RvbUZpbGUuaW5pdGlhbGl6ZUFjZSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgb3IgcmVpbml0aWFsaXplIGRyb3Bkb3duXG4gICAgICAgIGlmIChjdXN0b21GaWxlLiRtb2RlRHJvcERvd24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY3VzdG9tRmlsZS4kbW9kZURyb3BEb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogY3VzdG9tRmlsZS5jYk9uQ2hhbmdlTW9kZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBHZXQgZmlsZSBJRCBmcm9tIFVSTCBvciBmb3JtXG4gICAgICAgIGNvbnN0IHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG4gICAgICAgIGNvbnN0IHVybElkID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLm1hdGNoKC9tb2RpZnlcXC8oXFxkKykvKTtcbiAgICAgICAgY29uc3QgZmlsZUlkID0gdXJsSWQgPyB1cmxJZFsxXSA6IGN1c3RvbUZpbGUuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2lkJyk7XG5cbiAgICAgICAgaWYgKCFmaWxlSWQgfHwgZmlsZUlkID09PSAnJykge1xuICAgICAgICAgICAgLy8gTG9hZCBkZWZhdWx0IHZhbHVlcyBmb3IgbmV3IGN1c3RvbSBmaWxlXG4gICAgICAgICAgICBjdXN0b21GaWxlc0FQSS5nZXRSZWNvcmQoJ25ldycsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTdG9yZSBtb2RlIHNlcGFyYXRlbHkgdG8gaGFuZGxlIGl0IGNvcnJlY3RseVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBtb2RlID0gcmVzcG9uc2UuZGF0YS5tb2RlIHx8ICdub25lJztcblxuICAgICAgICAgICAgICAgICAgICAvLyBSZW1vdmUgbW9kZSBmcm9tIHJlc3BvbnNlIGJlZm9yZSBzZXR0aW5nIGZvcm0gdmFsdWVzXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvcm1EYXRhID0gey4uLnJlc3BvbnNlLmRhdGF9O1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgZm9ybURhdGEubW9kZTsgIC8vIERvbid0IGxldCBmb3JtKCdzZXQgdmFsdWVzJykgaGFuZGxlIG1vZGVcblxuICAgICAgICAgICAgICAgICAgICAvLyBTZXQgZGVmYXVsdCB2YWx1ZXMgdG8gZm9ybSBmaWVsZHMgKHdpdGhvdXQgbW9kZSlcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWVzJywgZm9ybURhdGEpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEZvciBuZXcgZmlsZXMgd2l0aCBNT0RFX0NVU1RPTVxuICAgICAgICAgICAgICAgICAgICBpZiAobW9kZSA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIE1ha2UgZmlsZXBhdGggZWRpdGFibGUgZm9yIG5ldyBjdXN0b20gZmlsZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGZpbGVwYXRoSW5wdXQucHJvcCgncmVhZG9ubHknLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRmaWxlcGF0aEZpZWxkLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTZXQgbW9kZSB0byAnY3VzdG9tJyB1c2luZyBoaWRkZW4gaW5wdXRcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuc2V0TW9kZSgnY3VzdG9tJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNob3cgb25seSBlZGl0b3IgdGFiIGZvciBjdXN0b20gbW9kZVxuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kdGFiTWVudS50YWIoJ2NoYW5nZSB0YWInLCAnZWRpdG9yJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRlZGl0b3JUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kb3JpZ2luYWxUYWIuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kcmVzdWx0VGFiLmhpZGUoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSGlkZSBvdGhlciB0YWIgbWVudSBpdGVtc1xuICAgICAgICAgICAgICAgICAgICAgICAgJCgnLml0ZW1bZGF0YS10YWI9XCJvcmlnaW5hbFwiXScpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoJy5pdGVtW2RhdGEtdGFiPVwicmVzdWx0XCJdJykuaGlkZSgpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGVtcHR5IGNvbnRlbnQgaW4gZWRpdG9yIGZvciBuZXcgY3VzdG9tIGZpbGVzXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5jb250ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgZGVmYXVsdCBjb250ZW50IHByb3ZpZGVkIChiYXNlNjQpLCBkZWNvZGUgaXQgd2l0aCBVVEYtOCBzdXBwb3J0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVjb2RlZENvbnRlbnQgPSBjdXN0b21GaWxlLmJhc2U2NFRvVXRmOChyZXNwb25zZS5kYXRhLmNvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLnNldFZhbHVlKGRlY29kZWRDb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2V0IGVtcHR5IGNvbnRlbnQgZm9yIG5ldyBjdXN0b20gZmlsZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLnNldFZhbHVlKCcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGb3Igb3RoZXIgbW9kZXMsIHVzZSBzdGFuZGFyZCBiZWhhdmlvciAobW9kZSBhbHJlYWR5IGV4dHJhY3RlZCBhYm92ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuc2V0TW9kZShtb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuY2JPbkNoYW5nZU1vZGUobW9kZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLnVwZGF0ZUZpbGVwYXRoRmllbGRTdGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBMb2FkIGV4aXN0aW5nIGZpbGUgZGF0YSB2aWEgUkVTVCBBUElcbiAgICAgICAgICAgIGN1c3RvbUZpbGVzQVBJLmdldFJlY29yZChmaWxlSWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTdG9yZSBiYXNlNjQgY29udGVudCBzZXBhcmF0ZWx5IGFuZCByZW1vdmUgZnJvbSBmb3JtIGRhdGFcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYmFzZTY0Q29udGVudCA9IHJlc3BvbnNlLmRhdGEuY29udGVudDtcblxuICAgICAgICAgICAgICAgICAgICAvLyBTdG9yZSBtb2RlIHNlcGFyYXRlbHkgdG8gaGFuZGxlIGl0IGNvcnJlY3RseVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBtb2RlID0gcmVzcG9uc2UuZGF0YS5tb2RlIHx8ICdub25lJztcblxuICAgICAgICAgICAgICAgICAgICAvLyBSZW1vdmUgY29udGVudCBhbmQgbW9kZSBmcm9tIHJlc3BvbnNlIGJlZm9yZSBzZXR0aW5nIGZvcm0gdmFsdWVzXG4gICAgICAgICAgICAgICAgICAgIC8vIChjb250ZW50IHdpbGwgYmUgdGFrZW4gZnJvbSBBQ0UgZWRpdG9yIG9uIHNhdmUsIG1vZGUgd2lsbCBiZSBzZXQgc2VwYXJhdGVseSlcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZm9ybURhdGEgPSB7Li4ucmVzcG9uc2UuZGF0YX07XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBmb3JtRGF0YS5jb250ZW50O1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgZm9ybURhdGEubW9kZTsgIC8vIERvbid0IGxldCBmb3JtKCdzZXQgdmFsdWVzJykgaGFuZGxlIG1vZGVcblxuICAgICAgICAgICAgICAgICAgICAvLyBTZXQgZm9ybSB2YWx1ZXMgZnJvbSBBUEkgcmVzcG9uc2UgKHdpdGhvdXQgY29udGVudCBhbmQgbW9kZSlcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWVzJywgZm9ybURhdGEpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIERlY29kZSBiYXNlNjQgY29udGVudCBhbmQgc2V0IGluIGVkaXRvciB3aXRoIFVURi04IHN1cHBvcnRcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJhc2U2NENvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlY29kZWRDb250ZW50ID0gY3VzdG9tRmlsZS5iYXNlNjRUb1V0ZjgoYmFzZTY0Q29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXRWYWx1ZShkZWNvZGVkQ29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5jbGVhclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IG1vZGUgYW5kIHRyaWdnZXIgVUkgdXBkYXRlIChtb2RlIGFscmVhZHkgZXh0cmFjdGVkIGFib3ZlKVxuICAgICAgICAgICAgICAgICAgICBpZiAobW9kZSA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBleGlzdGluZyBjdXN0b20gZmlsZXMgLSBmaWxlcGF0aCBpcyByZWFkLW9ubHlcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGZpbGVwYXRoSW5wdXQucHJvcCgncmVhZG9ubHknLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGZpbGVwYXRoRmllbGQuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNldCBtb2RlIHRvICdjdXN0b20nIHVzaW5nIGhpZGRlbiBpbnB1dFxuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5zZXRNb2RlKCdjdXN0b20nKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBvbmx5IGVkaXRvciB0YWIgZm9yIGN1c3RvbSBtb2RlXG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiR0YWJNZW51LnRhYignY2hhbmdlIHRhYicsICdlZGl0b3InKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGVkaXRvclRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRvcmlnaW5hbFRhYi5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRyZXN1bHRUYWIuaGlkZSgpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBIaWRlIG90aGVyIHRhYiBtZW51IGl0ZW1zXG4gICAgICAgICAgICAgICAgICAgICAgICAkKCcuaXRlbVtkYXRhLXRhYj1cIm9yaWdpbmFsXCJdJykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJCgnLml0ZW1bZGF0YS10YWI9XCJyZXN1bHRcIl0nKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGb3Igc3lzdGVtIGZpbGVzIC0gdXNlIHN0YW5kYXJkIGJlaGF2aW9yXG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLnNldE1vZGUobW9kZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLmNiT25DaGFuZ2VNb2RlKG1vZGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS51cGRhdGVGaWxlcGF0aEZpZWxkU3RhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElmIGxvYWRpbmcgZmFpbHMsIHJlZGlyZWN0IHRvIGluZGV4XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9Y3VzdG9tLWZpbGVzL2luZGV4YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZm9ybVxuICAgICAgICBjdXN0b21GaWxlLmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZm9yIHdoZW4gdGhlIGNvZGUgbW9kZSBjaGFuZ2VzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHNlbGVjdGVkIHZhbHVlIGZyb20gdGhlIGRyb3Bkb3duLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGhlIHNlbGVjdGVkIHRleHQgZnJvbSB0aGUgZHJvcGRvd24uXG4gICAgICovXG4gICAgY2JPbkNoYW5nZU1vZGUodmFsdWUsIHRleHQpe1xuICAgICAgICAvLyBIYW5kbGUgY29kZSB2aXNpYmlsaXR5IGFuZCBjb250ZW50IGJhc2VkIG9uIHRoZSAnbW9kZSdcbiAgICAgICAgc3dpdGNoICh2YWx1ZSkge1xuICAgICAgICAgICAgY2FzZSAnbm9uZSc6XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kdGFiTWVudS50YWIoJ2NoYW5nZSB0YWInLCdvcmlnaW5hbCcpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnb3ZlcnJpZGUnOlxuICAgICAgICAgICAgY2FzZSAnY3VzdG9tJzogIC8vIEN1c3RvbSBtb2RlIGJlaGF2ZXMgbGlrZSBvdmVycmlkZVxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHRhYk1lbnUudGFiKCdjaGFuZ2UgdGFiJywnZWRpdG9yJyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdhcHBlbmQnOlxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHRhYk1lbnUudGFiKCdjaGFuZ2UgdGFiJywnZWRpdG9yJyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdzY3JpcHQnOlxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHRhYk1lbnUudGFiKCdjaGFuZ2UgdGFiJywnZWRpdG9yJyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHRhYk1lbnUudGFiKCdjaGFuZ2UgdGFiJywnb3JpZ2luYWwnKTtcbiAgICAgICAgfVxuICAgICAgICBjdXN0b21GaWxlLmhpZGVTaG93Q29kZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFdmVudCBoYW5kbGVyIGZvciB0YWIgY2hhbmdlcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjdXJyZW50VGFiIC0gVGhlIGN1cnJlbnQgdGFiIHRoYXQgaXMgdmlzaWJsZS5cbiAgICAgKi9cbiAgICBvbkNoYW5nZVRhYihjdXJyZW50VGFiKXtcbiAgICAgICAgY29uc3QgZmlsZVBhdGggPSBjdXN0b21GaWxlLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmaWxlcGF0aCcpO1xuICAgICAgICBzd2l0Y2ggKGN1cnJlbnRUYWIpIHtcbiAgICAgICAgICAgIGNhc2UgJ3Jlc3VsdCc6XG4gICAgICAgICAgICAgICAgJCgnLnRhYltkYXRhLXRhYj1cInJlc3VsdFwiXScpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgRmlsZXNBUEkuZ2V0RmlsZUNvbnRlbnQoZmlsZVBhdGgsIGN1c3RvbUZpbGUuY2JHZXRSZXN1bHRGaWxlQ29udGVudEZyb21TZXJ2ZXIsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ29yaWdpbmFsJzpcbiAgICAgICAgICAgICAgICAkKCcudGFiW2RhdGEtdGFiPVwib3JpZ2luYWxcIl0nKS5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIEZpbGVzQVBJLmdldEZpbGVDb250ZW50KGZpbGVQYXRoLCBjdXN0b21GaWxlLmNiR2V0T3JpZ2luYWxGaWxlQ29udGVudEZyb21TZXJ2ZXIsIHRydWUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZWRpdG9yJzpcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIHRoZSB2aXNpYmlsaXR5IGFuZCBjb250ZW50IG9mIGNvZGUgYmFzZWQgb24gdGhlICdtb2RlJyBmb3JtIHZhbHVlLlxuICAgICAqIEFkanVzdHMgdGhlIEFjZSBlZGl0b3Igc2V0dGluZ3MgYWNjb3JkaW5nbHkuXG4gICAgICovXG4gICAgaGlkZVNob3dDb2RlKCkge1xuICAgICAgICAvLyBSZXRyaWV2ZSAnbW9kZScgdmFsdWUgKGZyb20gZHJvcGRvd24gb3IgaGlkZGVuIGlucHV0IGZvciBjdXN0b20gbW9kZSlcbiAgICAgICAgY29uc3QgbW9kZSA9IGN1c3RvbUZpbGUuZ2V0Q3VycmVudE1vZGUoKTtcblxuICAgICAgICAvLyBHZXQgY3VycmVudCBjb250ZW50IGZyb20gZWRpdG9yIChub3QgZnJvbSBmb3JtLCBhcyBmb3JtIGRvZXNuJ3QgaGF2ZSBpdCBhbnltb3JlKVxuICAgICAgICBsZXQgY29udGVudCA9IGN1c3RvbUZpbGUuZWRpdG9yLmdldFZhbHVlKCk7XG5cbiAgICAgICAgLy8gR2V0IHRhYiBtZW51IGl0ZW1zXG4gICAgICAgIGNvbnN0ICRvcmlnaW5hbFRhYk1lbnVJdGVtID0gJCgnLml0ZW1bZGF0YS10YWI9XCJvcmlnaW5hbFwiXScpO1xuICAgICAgICBjb25zdCAkcmVzdWx0VGFiTWVudUl0ZW0gPSAkKCcuaXRlbVtkYXRhLXRhYj1cInJlc3VsdFwiXScpO1xuXG4gICAgICAgIC8vIEhhbmRsZSBjb2RlIHZpc2liaWxpdHkgYW5kIGNvbnRlbnQgYmFzZWQgb24gdGhlICdtb2RlJ1xuICAgICAgICBzd2l0Y2ggKG1vZGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ25vbmUnOlxuICAgICAgICAgICAgICAgIC8vIElmICdtb2RlJyBpcyAnbm9uZScsIHNob3cgb25seSByZXN1bHQgY29kZSBnZW5lcmF0ZWQgYW5kIGhpZGUgZWRpdG9yIGFuZCByZXN1bHQgdmlld2VyXG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZWRpdG9yVGFiLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRvcmlnaW5hbFRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbC5uYXZpZ2F0ZUZpbGVTdGFydCgpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHJlc3VsdFRhYi5oaWRlKCk7XG4gICAgICAgICAgICAgICAgLy8gU2hvdy9oaWRlIG1lbnUgaXRlbXNcbiAgICAgICAgICAgICAgICAkb3JpZ2luYWxUYWJNZW51SXRlbS5zaG93KCk7XG4gICAgICAgICAgICAgICAgJHJlc3VsdFRhYk1lbnVJdGVtLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2FwcGVuZCc6XG4gICAgICAgICAgICAgICAgLy8gSWYgJ21vZGUnIGlzICdhcHBlbmQnLCBzaG93IGFsbCBmaWVsZHNcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRlZGl0b3JUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJG9yaWdpbmFsVGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRyZXN1bHRUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUudmlld2VyT3JpZ2luYWwubmF2aWdhdGVGaWxlRW5kKCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJSZXN1bHQubmF2aWdhdGVGaWxlRW5kKCk7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBhbGwgbWVudSBpdGVtc1xuICAgICAgICAgICAgICAgICRvcmlnaW5hbFRhYk1lbnVJdGVtLnNob3coKTtcbiAgICAgICAgICAgICAgICAkcmVzdWx0VGFiTWVudUl0ZW0uc2hvdygpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnb3ZlcnJpZGUnOlxuICAgICAgICAgICAgICAgIC8vIElmICdtb2RlJyBpcyAnb3ZlcnJpZGUnLCBzaG93IGVkaXRvciBhbmQgaGlkZSBvcmlnaW5hbCwgYnV0IHNob3cgcmVzdWx0XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZWRpdG9yVGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRvcmlnaW5hbFRhYi5oaWRlKCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kcmVzdWx0VGFiLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAvLyBTaG93L2hpZGUgbWVudSBpdGVtc1xuICAgICAgICAgICAgICAgICRvcmlnaW5hbFRhYk1lbnVJdGVtLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAkcmVzdWx0VGFiTWVudUl0ZW0uaGlkZSgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnY3VzdG9tJzpcbiAgICAgICAgICAgICAgICAvLyBGb3IgJ2N1c3RvbScgbW9kZSwgb25seSBzaG93IGVkaXRvciB0YWIgLSB1c2VyIGZ1bGx5IGNvbnRyb2xzIHRoZSBmaWxlXG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZWRpdG9yVGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRvcmlnaW5hbFRhYi5oaWRlKCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kcmVzdWx0VGFiLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAvLyBIaWRlIG90aGVyIHRhYiBtZW51IGl0ZW1zIGZvciBjdXN0b20gZmlsZXNcbiAgICAgICAgICAgICAgICAkb3JpZ2luYWxUYWJNZW51SXRlbS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgJHJlc3VsdFRhYk1lbnVJdGVtLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3NjcmlwdCc6XG4gICAgICAgICAgICAgICAgLy8gSWYgJ21vZGUnIGlzICdzY3JpcHQnLCBzaG93IGJvdGggc2VydmVyIGFuZCBjdXN0b20gY29kZSwgYXBwbHkgY3VzdG9tIHNjcmlwdCB0byB0aGUgZmlsZSBjb250ZW50IG9uIHNlcnZlclxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGVkaXRvclRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kb3JpZ2luYWxUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHJlc3VsdFRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBhbGwgbWVudSBpdGVtcyBmb3Igc2NyaXB0IG1vZGVcbiAgICAgICAgICAgICAgICAkb3JpZ2luYWxUYWJNZW51SXRlbS5zaG93KCk7XG4gICAgICAgICAgICAgICAgJHJlc3VsdFRhYk1lbnVJdGVtLnNob3coKTtcbiAgICAgICAgICAgICAgICAvLyBFZGl0b3IgLSBvbmx5IHNldCB0ZW1wbGF0ZSBpZiBjb250ZW50IGlzIGVtcHR5XG4gICAgICAgICAgICAgICAgaWYgKCFjb250ZW50IHx8IGNvbnRlbnQudHJpbSgpID09PSAnJykge1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50ID0gYCMhL2Jpbi9iYXNoIFxcblxcbmA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYGNvbmZpZ1BhdGg9XCIkMVwiICMgUGF0aCB0byB0aGUgb3JpZ2luYWwgY29uZmlnIGZpbGVcXG5cXG5gO1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGAjIEV4YW1wbGUgMTogUmVwbGFjZSBhbGwgdmFsdWVzIG1heF9jb250YWN0cyA9IDUgdG8gbWF4X2NvbnRhY3RzID0gMSBvbiBwanNpcC5jb25mXFxuYDtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgIyBzZWQgLWkgJ3MvbWF4X2NvbnRhY3RzID0gNS9tYXhfY29udGFjdHMgPSAxL2cnIFwiJGNvbmZpZ1BhdGhcIlxcblxcbmBcblxuICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGAjIEV4YW1wbGUgMjogQ2hhbmdlIHZhbHVlIG1heF9jb250YWN0cyBvbmx5IGZvciBwZWVyIHdpdGggZXh0ZW5zaW9uIDIyNiBvbiBwanNpcC5jb25mXFxuYDtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgIyBzZWQgLWkgJy9eXFxcXFsyMjZcXFxcXSQvLC9eXFxcXFsvIHMvbWF4X2NvbnRhY3RzID0gNS9tYXhfY29udGFjdHMgPSAyLycgXCIkY29uZmlnUGF0aFwiXFxuXFxuYFxuXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYCMgRXhhbXBsZSAzOiBBZGQgZW4gZXh0cmEgc3RyaW5nIGludG8gW3BsYXliYWNrLWV4aXRdIHNlY3Rpb24gYWZ0ZXIgdGhlIFwic2FtZSA9PiBuLEhhbmd1cCgpXCIgc3RyaW5nIG9uIGV4dGVuc2lvbnMuY29uZlxcbmA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYCMgc2VkIC1pICcvXlxcXFxbcGxheWJhY2stZXhpdFxcXFxdJC8sL15cXFxcWy8gcy9eXFxcXChcXFxccypzYW1lID0+IG4sSGFuZ3VwKClcXFxcKS9cXFxcMVxcXFxuXFxcXHRzYW1lID0+IG4sTm9PcChcIllvdXIgTm9PcCBjb21tZW50IGhlcmVcIikvJyBcIiRjb25maWdQYXRoXCJcXG5cXG5gO1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYCMgQXR0ZW50aW9uISBZb3Ugd2lsbCBzZWUgY2hhbmdlcyBhZnRlciB0aGUgYmFja2dyb3VuZCB3b3JrZXIgcHJvY2Vzc2VzIHRoZSBzY3JpcHQgb3IgYWZ0ZXIgcmVib290aW5nIHRoZSBzeXN0ZW0uIFxcbmA7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gT25seSBzZXQgY29udGVudCBpZiB3ZSBjcmVhdGVkIGEgdGVtcGxhdGVcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2V0VmFsdWUoY29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBhbnkgb3RoZXIgJ21vZGUnIHZhbHVlc1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbC5zZXRUaGVtZSgnYWNlL3RoZW1lL21vbm9rYWknKTtcbiAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2V0VGhlbWUoJ2FjZS90aGVtZS9tb25va2FpJyk7XG5cbiAgICAgICAgLy8gRG9uJ3Qgb3ZlcndyaXRlIGVkaXRvciBjb250ZW50IGhlcmUgLSBpdCdzIGFscmVhZHkgc2V0IGNvcnJlY3RseVxuICAgICAgICAvLyBjdXN0b21GaWxlLmVkaXRvci5zZXRWYWx1ZShjb250ZW50KTtcbiAgICAgICAgLy8gY3VzdG9tRmlsZS5lZGl0b3IuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdGhhdCBoYW5kbGVzIHRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgY29udGFpbmluZyB0aGUgZmlsZSdzIGNvbnRlbnQuXG4gICAgICogSXQgd2lsbCB1cGRhdGUgdGhlICd2aWV3ZXJPcmlnaW5hbCcgd2l0aCB0aGUgZmlsZSdzIGNvbnRlbnQgYW5kIGFkanVzdCB0aGUgY29kZSBkaXNwbGF5LlxuICAgICAqL1xuICAgIGNiR2V0T3JpZ2luYWxGaWxlQ29udGVudEZyb21TZXJ2ZXIocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEuY29udGVudCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb25zdCBhY2VWaWV3ZXIgPSBjdXN0b21GaWxlLnZpZXdlck9yaWdpbmFsO1xuICAgICAgICAgICAgY29uc3Qgc2Nyb2xsVG9wID0gYWNlVmlld2VyLnNlc3Npb24uZ2V0U2Nyb2xsVG9wKCk7XG4gICAgICAgICAgICBhY2VWaWV3ZXIuc2Vzc2lvbi5zZXRWYWx1ZShyZXNwb25zZS5kYXRhLmNvbnRlbnQpO1xuICAgICAgICAgICAgYWNlVmlld2VyLnNlc3Npb24uc2V0U2Nyb2xsVG9wKHNjcm9sbFRvcCk7XG4gICAgICAgIH1cbiAgICAgICAgJCgnLnRhYltkYXRhLXRhYj1cIm9yaWdpbmFsXCJdJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdGhhdCBoYW5kbGVzIHRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgY29udGFpbmluZyB0aGUgZmlsZSdzIGNvbnRlbnQuXG4gICAgICogSXQgd2lsbCB1cGRhdGUgdGhlICd2aWV3ZXJSZXN1bHQnIHdpdGggdGhlIGZpbGUncyBjb250ZW50IGFuZCBhZGp1c3QgdGhlIGNvZGUgZGlzcGxheS5cbiAgICAgKi9cbiAgICBjYkdldFJlc3VsdEZpbGVDb250ZW50RnJvbVNlcnZlcihyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5jb250ZW50ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGFjZVZpZXdlciA9IGN1c3RvbUZpbGUudmlld2VyUmVzdWx0O1xuICAgICAgICAgICAgY29uc3Qgc2Nyb2xsVG9wID0gYWNlVmlld2VyLnNlc3Npb24uZ2V0U2Nyb2xsVG9wKCk7XG4gICAgICAgICAgICBhY2VWaWV3ZXIuc2Vzc2lvbi5zZXRWYWx1ZShyZXNwb25zZS5kYXRhLmNvbnRlbnQpO1xuICAgICAgICAgICAgYWNlVmlld2VyLnNlc3Npb24uc2V0U2Nyb2xsVG9wKHNjcm9sbFRvcCk7XG4gICAgICAgIH1cbiAgICAgICAgJCgnLnRhYltkYXRhLXRhYj1cInJlc3VsdFwiXScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIEFjZSBlZGl0b3IgaW5zdGFuY2VzIGZvciAnZWRpdG9yJyBhbmQgJ3ZpZXdlcnMnIHdpbmRvd3MuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUFjZSgpIHtcbiAgICAgICAgLy8gQ2FsY3VsYXRlIGFjZSBlZGl0b3IgaGVpZ2h0IGFuZCByb3dzIGNvdW50XG4gICAgICAgIGNvbnN0IGFjZUhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCAtIDQ3NTtcbiAgICAgICAgY29uc3Qgcm93c0NvdW50ID0gTWF0aC5yb3VuZChhY2VIZWlnaHQgLyAxNi4zKTtcblxuICAgICAgICAvLyBTZXQgbWluaW11bSBoZWlnaHQgZm9yIHRoZSBjb2RlIHNlY3Rpb25zIG9uIHdpbmRvdyBsb2FkXG4gICAgICAgICQoJy5hcHBsaWNhdGlvbi1jb2RlJykuY3NzKCdtaW4taGVpZ2h0JywgYCR7YWNlSGVpZ2h0fXB4YCk7XG5cbiAgICAgICAgLy8gQUNFIHdpbmRvdyBmb3IgdGhlIG9yaWdpbmFsIGZpbGUgY29udGVudC5cbiAgICAgICAgY29uc3QgSW5pTW9kZSA9IGFjZS5yZXF1aXJlKCdhY2UvbW9kZS9qdWxpYScpLk1vZGU7XG4gICAgICAgIGN1c3RvbUZpbGUudmlld2VyT3JpZ2luYWwgPSBhY2UuZWRpdCgnY29uZmlnLWZpbGUtb3JpZ2luYWwnKTtcbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbC5zZXNzaW9uLnNldE1vZGUobmV3IEluaU1vZGUoKSk7XG4gICAgICAgIGN1c3RvbUZpbGUudmlld2VyT3JpZ2luYWwuc2V0VGhlbWUoJ2FjZS90aGVtZS9tb25va2FpJyk7XG4gICAgICAgIGN1c3RvbUZpbGUudmlld2VyT3JpZ2luYWwuc2V0T3B0aW9ucyh7XG4gICAgICAgICAgICBzaG93UHJpbnRNYXJnaW46IGZhbHNlLFxuICAgICAgICAgICAgcmVhZE9ubHk6IHRydWUsXG4gICAgICAgICAgICBtaW5MaW5lczogcm93c0NvdW50XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFDRSB3aW5kb3cgZm9yIHRoZSByZXN1bHRlZCBmaWxlIGNvbnRlbnQuXG4gICAgICAgIGN1c3RvbUZpbGUudmlld2VyUmVzdWx0ID0gYWNlLmVkaXQoJ2NvbmZpZy1maWxlLXJlc3VsdCcpO1xuICAgICAgICBjdXN0b21GaWxlLnZpZXdlclJlc3VsdC5zZXNzaW9uLnNldE1vZGUobmV3IEluaU1vZGUoKSk7XG4gICAgICAgIGN1c3RvbUZpbGUudmlld2VyUmVzdWx0LnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuICAgICAgICBjdXN0b21GaWxlLnZpZXdlclJlc3VsdC5zZXRPcHRpb25zKHtcbiAgICAgICAgICAgIHNob3dQcmludE1hcmdpbjogZmFsc2UsXG4gICAgICAgICAgICByZWFkT25seTogdHJ1ZSxcbiAgICAgICAgICAgIG1pbkxpbmVzOiByb3dzQ291bnRcbiAgICAgICAgfSk7XG5cblxuICAgICAgICAvLyBBQ0Ugd2luZG93IGZvciB0aGUgdXNlciBlZGl0b3IuXG4gICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yID0gYWNlLmVkaXQoJ3VzZXItZWRpdC1jb25maWcnKTtcbiAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2Vzc2lvbi5zZXRNb2RlKG5ldyBJbmlNb2RlKCkpO1xuICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXRUaGVtZSgnYWNlL3RoZW1lL21vbm9rYWknKTtcbiAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2V0T3B0aW9ucyh7XG4gICAgICAgICAgICBzaG93UHJpbnRNYXJnaW46IGZhbHNlLFxuICAgICAgICAgICAgbWluTGluZXM6IHJvd3NDb3VudCxcbiAgICAgICAgfSk7XG4gICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLnNlc3Npb24ub24oJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50IHRvIGFja25vd2xlZGdlIHRoZSBtb2RpZmljYXRpb25cbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gIEFkZCBoYW5kbGVycyBmb3IgZnVsbHNjcmVlbiBtb2RlIGJ1dHRvbnNcbiAgICAgICAgJCgnLmZ1bGxzY3JlZW4tdG9nZ2xlLWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRhaW5lciA9ICQodGhpcykuc2libGluZ3MoJy5hcHBsaWNhdGlvbi1jb2RlJylbMF07XG4gICAgICAgICAgICBjdXN0b21GaWxlLnRvZ2dsZUZ1bGxTY3JlZW4oY29udGFpbmVyKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIGhhbmRsZXIgdG8gcmVjYWxjdWxhdGUgc2l6ZXMgd2hlbiBleGl0aW5nIGZ1bGxzY3JlZW4gbW9kZVxuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdmdWxsc2NyZWVuY2hhbmdlJywgY3VzdG9tRmlsZS5hZGp1c3RFZGl0b3JIZWlnaHQpO1xuXG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBFbmFibGUvZGlzYWJsZSBmdWxsc2NyZWVuIG1vZGUgZm9yIGEgc3BlY2lmaWMgYmxvY2suXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBjb250YWluZXIgLSBUaGUgY29udGFpbmVyIHRvIGV4cGFuZCB0byBmdWxsc2NyZWVuLlxuICAgICAqL1xuICAgIHRvZ2dsZUZ1bGxTY3JlZW4oY29udGFpbmVyKSB7XG4gICAgICAgIGlmICghZG9jdW1lbnQuZnVsbHNjcmVlbkVsZW1lbnQpIHtcbiAgICAgICAgICAgIGNvbnRhaW5lci5yZXF1ZXN0RnVsbHNjcmVlbigpLmNhdGNoKGVyciA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgYXR0ZW1wdGluZyB0byBlbmFibGUgZnVsbC1zY3JlZW4gbW9kZTogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZG9jdW1lbnQuZXhpdEZ1bGxzY3JlZW4oKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZWNhbGN1bGF0ZSBlZGl0b3IgaGVpZ2h0cyB3aGVuIHRoZSBzY3JlZW4gbW9kZSBjaGFuZ2VzLlxuICAgICAqL1xuICAgIGFkanVzdEVkaXRvckhlaWdodCgpIHtcbiAgICAgICAgY29uc3QgZWRpdG9ycyA9IFtjdXN0b21GaWxlLnZpZXdlck9yaWdpbmFsLCBjdXN0b21GaWxlLnZpZXdlclJlc3VsdCwgY3VzdG9tRmlsZS5lZGl0b3JdO1xuICAgICAgICBlZGl0b3JzLmZvckVhY2goZWRpdG9yID0+IHtcbiAgICAgICAgICAgIGlmIChlZGl0b3IpIHtcbiAgICAgICAgICAgICAgICBlZGl0b3IucmVzaXplKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcblxuICAgICAgICAvLyBJTVBPUlRBTlQ6IEdldCBtb2RlIEJFRk9SRSBmb3JtKCdnZXQgdmFsdWVzJykgdG8gcHJldmVudCBkcm9wZG93biBmcm9tIG92ZXJyaWRpbmcgaXRcbiAgICAgICAgY29uc3QgbW9kZSA9IGN1c3RvbUZpbGUuZ2V0Q3VycmVudE1vZGUoKTtcblxuICAgICAgICAvLyBHZXQgYWxsIGZvcm0gdmFsdWVzXG4gICAgICAgIHJlc3VsdC5kYXRhID0gY3VzdG9tRmlsZS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cbiAgICAgICAgLy8gT3ZlcnJpZGUgbW9kZSB3aXRoIHRoZSBjb3JyZWN0IHZhbHVlIChmcm9tIGdldEN1cnJlbnRNb2RlKVxuICAgICAgICByZXN1bHQuZGF0YS5tb2RlID0gbW9kZTtcblxuICAgICAgICAvLyBSZW1vdmUgdGVjaG5pY2FsIGZpZWxkIGZyb20gZGF0YVxuICAgICAgICBkZWxldGUgcmVzdWx0LmRhdGFbJ21vZGUtY3VzdG9tLXZhbHVlJ107XG5cbiAgICAgICAgLy8gR2V0IGNvbnRlbnQgZnJvbSBBY2UgZWRpdG9yIGJhc2VkIG9uIG1vZGVcbiAgICAgICAgc3dpdGNoIChtb2RlKSB7XG4gICAgICAgICAgICBjYXNlICdhcHBlbmQnOlxuICAgICAgICAgICAgY2FzZSAnb3ZlcnJpZGUnOlxuICAgICAgICAgICAgY2FzZSAnY3VzdG9tJzpcbiAgICAgICAgICAgIGNhc2UgJ3NjcmlwdCc6XG4gICAgICAgICAgICAgICAgLy8gR2V0IGNvbnRlbnQgZnJvbSBBY2UgZWRpdG9yIChub3QgYmFzZTY0IGVuY29kZWQgeWV0KVxuICAgICAgICAgICAgICAgIGlmICghY3VzdG9tRmlsZS5lZGl0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRWRpdG9yIGlzIG5vdCBpbml0aWFsaXplZCEnKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmRhdGEuY29udGVudCA9ICcnO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVkaXRvckNvbnRlbnQgPSBjdXN0b21GaWxlLmVkaXRvci5nZXRWYWx1ZSgpO1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQuZGF0YS5jb250ZW50ID0gZWRpdG9yQ29udGVudDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdub25lJzpcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgLy8gRm9yICdub25lJyBtb2RlLCBjbGVhciB0aGUgY29udGVudFxuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhLmNvbnRlbnQgPSAnJztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuXG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBjdXN0b21GaWxlLiRmb3JtT2JqO1xuXG4gICAgICAgIC8vIENvbmZpZ3VyZSBSRVNUIEFQSSBzZXR0aW5ncyBmb3IgRm9ybVxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzID0ge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGFwaU9iamVjdDogY3VzdG9tRmlsZXNBUEksXG4gICAgICAgICAgICBzYXZlTWV0aG9kOiAnc2F2ZScsICAvLyBXaWxsIHVzZSB0aGUgc21hcnQgc2F2ZSBtZXRob2QgdGhhdCBkZXRlcm1pbmVzIGNyZWF0ZS91cGRhdGVcbiAgICAgICAgICAgIGF1dG9EZXRlY3RNZXRob2Q6IGZhbHNlLCAgLy8gV2UgaGFuZGxlIHRoaXMgaW4gb3VyIHNhdmUgbWV0aG9kXG4gICAgICAgICAgICBpZEZpZWxkOiAnaWQnXG4gICAgICAgIH07XG5cbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gY3VzdG9tRmlsZS52YWxpZGF0ZVJ1bGVzOyAvLyBGb3JtIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gY3VzdG9tRmlsZS5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gY3VzdG9tRmlsZS5jYkFmdGVyU2VuZEZvcm07IC8vIENhbGxiYWNrIGFmdGVyIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxufTtcblxuLy8gSW5pdGlhbGl6ZSB0aGUgY3VzdG9tIGZpbGVzIG1vZGlmeSBmb3JtIHdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LlxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGN1c3RvbUZpbGUuaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==