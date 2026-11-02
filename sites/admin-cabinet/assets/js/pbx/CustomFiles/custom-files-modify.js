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

/* global globalRootUrl,globalTranslate, ace, Form, FilesAPI, customFilesAPI, PbxApiClient, UserMessage */

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
    customFile.showFileContentInViewer(response, customFile.viewerOriginal, 'original');
  },

  /**
   * Callback function that handles the response from the server containing the file's content.
   * It will update the 'viewerResult' with the file's content and adjust the code display.
   */
  cbGetResultFileContentFromServer: function cbGetResultFileContentFromServer(response) {
    customFile.showFileContentInViewer(response, customFile.viewerResult, 'result');
  },

  /**
   * Puts the file content from the server response into a read-only viewer.
   * Failed requests (network errors, 4xx/5xx) may come without the data field:
   * the loading state is cleared anyway, the previously loaded content is dropped so it is not
   * taken for the current one, and the error is shown to the user.
   *
   * @param {object} response - The response object from the API.
   * @param {object} aceViewer - The ACE viewer to update.
   * @param {string} tabName - The data-tab name of the viewer's tab.
   */
  showFileContentInViewer: function showFileContentInViewer(response, aceViewer, tabName) {
    $(".tab[data-tab=\"".concat(tabName, "\"]")).removeClass('loading');

    if (response && response.result && response.data && typeof response.data.content === 'string') {
      var scrollTop = aceViewer.session.getScrollTop();
      aceViewer.session.setValue(response.data.content);
      aceViewer.session.setScrollTop(scrollTop);
    } else {
      aceViewer.session.setValue('');

      if (response && response.messages) {
        UserMessage.showMultiString(response.messages);
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
    }); // Add handlers for fullscreen mode buttons. Hides the toggle on
    // browsers without Fullscreen API for DOM elements (e.g. iPhone WebKit).

    var $fullscreenBtn = $('.fullscreen-toggle-btn');
    var sampleContainer = $fullscreenBtn.first().siblings('.application-code')[0];

    if (FullscreenToggle.isSupported(sampleContainer)) {
      $fullscreenBtn.on('click', function () {
        var container = $(this).siblings('.application-code')[0];
        customFile.toggleFullScreen(container);
      });
      FullscreenToggle.onChange(customFile.adjustEditorHeight);
    } else {
      $fullscreenBtn.hide();
    }
  },

  /**
   * Enable/disable fullscreen mode for a specific block via FullscreenToggle helper.
   *
   * @param {HTMLElement} container - The container to expand to fullscreen.
   */
  toggleFullScreen: function toggleFullScreen(container) {
    FullscreenToggle.toggle(container)["catch"](function (err) {
      console.error("Error attempting to toggle full-screen mode: ".concat(err.message));
    });
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DdXN0b21GaWxlcy9jdXN0b20tZmlsZXMtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbImN1c3RvbUZpbGUiLCIkZm9ybU9iaiIsIiR0YWJNZW51IiwiJG1vZGVEcm9wRG93biIsIiRtb2RlQ3VzdG9tSW5wdXQiLCIkb3JpZ2luYWxUYWIiLCIkZWRpdG9yVGFiIiwiJHJlc3VsdFRhYiIsIiRtYWluQ29udGFpbmVyIiwiJGZpbGVwYXRoSW5wdXQiLCIkZmlsZXBhdGhGaWVsZCIsImVkaXRvciIsInZpZXdlck9yaWdpbmFsIiwidmlld2VyUmVzdWx0IiwidmFsaWRhdGVSdWxlcyIsIm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiY2ZfVmFsaWRhdGVOYW1lSXNFbXB0eSIsImJhc2U2NFRvVXRmOCIsImJhc2U2NFN0ciIsImJpbmFyeVN0cmluZyIsImF0b2IiLCJUZXh0RGVjb2RlciIsImJ5dGVzIiwiVWludDhBcnJheSIsImxlbmd0aCIsImkiLCJjaGFyQ29kZUF0IiwiZGVjb2RlIiwiZGVjb2RlVVJJQ29tcG9uZW50IiwiZXNjYXBlIiwiZSIsImNvbnNvbGUiLCJlcnJvciIsImdldEN1cnJlbnRNb2RlIiwiY3VzdG9tTW9kZVZhbHVlIiwidmFsIiwiZm9ybSIsInNldE1vZGUiLCJtb2RlIiwicGFyZW50IiwiaGlkZSIsImRyb3Bkb3duIiwic2hvdyIsInVwZGF0ZUZpbGVwYXRoRmllbGRTdGF0ZSIsImlzVXNlckNyZWF0ZWQiLCJmaWxlSWQiLCJwcm9wIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImluaXRpYWxpemUiLCIkIiwidGFiIiwib25WaXNpYmxlIiwib25DaGFuZ2VUYWIiLCJpbml0aWFsaXplQWNlIiwib25DaGFuZ2UiLCJjYk9uQ2hhbmdlTW9kZSIsInVybFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsIndpbmRvdyIsImxvY2F0aW9uIiwic2VhcmNoIiwidXJsSWQiLCJwYXRobmFtZSIsIm1hdGNoIiwiY3VzdG9tRmlsZXNBUEkiLCJnZXRSZWNvcmQiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJmb3JtRGF0YSIsImNvbnRlbnQiLCJkZWNvZGVkQ29udGVudCIsInNldFZhbHVlIiwiY2xlYXJTZWxlY3Rpb24iLCJiYXNlNjRDb250ZW50IiwiZ2xvYmFsUm9vdFVybCIsImluaXRpYWxpemVGb3JtIiwidmFsdWUiLCJ0ZXh0IiwiaGlkZVNob3dDb2RlIiwiY3VycmVudFRhYiIsImZpbGVQYXRoIiwiRmlsZXNBUEkiLCJnZXRGaWxlQ29udGVudCIsImNiR2V0UmVzdWx0RmlsZUNvbnRlbnRGcm9tU2VydmVyIiwiY2JHZXRPcmlnaW5hbEZpbGVDb250ZW50RnJvbVNlcnZlciIsImdldFZhbHVlIiwiJG9yaWdpbmFsVGFiTWVudUl0ZW0iLCIkcmVzdWx0VGFiTWVudUl0ZW0iLCJuYXZpZ2F0ZUZpbGVTdGFydCIsIm5hdmlnYXRlRmlsZUVuZCIsInRyaW0iLCJzZXRUaGVtZSIsInNob3dGaWxlQ29udGVudEluVmlld2VyIiwiYWNlVmlld2VyIiwidGFiTmFtZSIsInNjcm9sbFRvcCIsInNlc3Npb24iLCJnZXRTY3JvbGxUb3AiLCJzZXRTY3JvbGxUb3AiLCJtZXNzYWdlcyIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwiYWNlSGVpZ2h0IiwiaW5uZXJIZWlnaHQiLCJyb3dzQ291bnQiLCJNYXRoIiwicm91bmQiLCJjc3MiLCJJbmlNb2RlIiwiYWNlIiwicmVxdWlyZSIsIk1vZGUiLCJlZGl0Iiwic2V0T3B0aW9ucyIsInNob3dQcmludE1hcmdpbiIsInJlYWRPbmx5IiwibWluTGluZXMiLCJvbiIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsIiRmdWxsc2NyZWVuQnRuIiwic2FtcGxlQ29udGFpbmVyIiwiZmlyc3QiLCJzaWJsaW5ncyIsIkZ1bGxzY3JlZW5Ub2dnbGUiLCJpc1N1cHBvcnRlZCIsImNvbnRhaW5lciIsInRvZ2dsZUZ1bGxTY3JlZW4iLCJhZGp1c3RFZGl0b3JIZWlnaHQiLCJ0b2dnbGUiLCJlcnIiLCJtZXNzYWdlIiwiZWRpdG9ycyIsImZvckVhY2giLCJyZXNpemUiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJlZGl0b3JDb250ZW50IiwiY2JBZnRlclNlbmRGb3JtIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImF1dG9EZXRlY3RNZXRob2QiLCJpZEZpZWxkIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxVQUFVLEdBQUc7QUFFZjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRSxJQVBLOztBQVNmO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRSxJQWJLOztBQWVmO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFBRSxJQW5CQTs7QUFxQmY7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsZ0JBQWdCLEVBQUUsSUF6Qkg7O0FBMkJmO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBQVksRUFBRSxJQS9CQzs7QUFpQ2Y7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsVUFBVSxFQUFFLElBckNHOztBQXVDZjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxVQUFVLEVBQUUsSUEzQ0c7O0FBNkNmO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGNBQWMsRUFBRSxJQWpERDs7QUFtRGY7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsY0FBYyxFQUFFLElBdkREOztBQXlEZjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxjQUFjLEVBQUUsSUE3REQ7O0FBZ0VmO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLE1BQU0sRUFBRSxFQXBFTztBQXFFZkMsRUFBQUEsY0FBYyxFQUFFLEVBckVEO0FBc0VmQyxFQUFBQSxZQUFZLEVBQUUsRUF0RUM7O0FBd0VmO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLElBQUksRUFBRTtBQUNGQyxNQUFBQSxVQUFVLEVBQUUsVUFEVjtBQUVGQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsT0FEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0M7QUFGNUIsT0FERztBQUZMO0FBREssR0E3RUE7O0FBeUZmO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBaEdlLHdCQWdHRkMsU0FoR0UsRUFnR1M7QUFDcEIsUUFBSTtBQUNBO0FBQ0EsVUFBTUMsWUFBWSxHQUFHQyxJQUFJLENBQUNGLFNBQUQsQ0FBekIsQ0FGQSxDQUlBOztBQUNBLFVBQUksT0FBT0csV0FBUCxLQUF1QixXQUEzQixFQUF3QztBQUNwQyxZQUFNQyxLQUFLLEdBQUcsSUFBSUMsVUFBSixDQUFlSixZQUFZLENBQUNLLE1BQTVCLENBQWQ7O0FBQ0EsYUFBSyxJQUFJQyxDQUFDLEdBQUcsQ0FBYixFQUFnQkEsQ0FBQyxHQUFHTixZQUFZLENBQUNLLE1BQWpDLEVBQXlDQyxDQUFDLEVBQTFDLEVBQThDO0FBQzFDSCxVQUFBQSxLQUFLLENBQUNHLENBQUQsQ0FBTCxHQUFXTixZQUFZLENBQUNPLFVBQWIsQ0FBd0JELENBQXhCLENBQVg7QUFDSDs7QUFDRCxlQUFPLElBQUlKLFdBQUosR0FBa0JNLE1BQWxCLENBQXlCTCxLQUF6QixDQUFQO0FBQ0gsT0FORCxNQU1PO0FBQ0g7QUFDQSxlQUFPTSxrQkFBa0IsQ0FBQ0MsTUFBTSxDQUFDVixZQUFELENBQVAsQ0FBekI7QUFDSDtBQUNKLEtBZkQsQ0FlRSxPQUFNVyxDQUFOLEVBQVM7QUFDUEMsTUFBQUEsT0FBTyxDQUFDQyxLQUFSLENBQWMsMEJBQWQsRUFBMENGLENBQTFDO0FBQ0EsYUFBT1osU0FBUCxDQUZPLENBRVc7QUFDckI7QUFDSixHQXBIYzs7QUFzSGY7QUFDSjtBQUNBO0FBQ0E7QUFDSWUsRUFBQUEsY0ExSGUsNEJBMEhFO0FBQ2I7QUFDQSxRQUFNQyxlQUFlLEdBQUd2QyxVQUFVLENBQUNJLGdCQUFYLENBQTRCb0MsR0FBNUIsRUFBeEI7O0FBQ0EsUUFBSUQsZUFBZSxLQUFLLFFBQXhCLEVBQWtDO0FBQzlCLGFBQU8sUUFBUDtBQUNILEtBTFksQ0FNYjs7O0FBQ0EsV0FBT3ZDLFVBQVUsQ0FBQ0MsUUFBWCxDQUFvQndDLElBQXBCLENBQXlCLFdBQXpCLEVBQXNDLE1BQXRDLENBQVA7QUFDSCxHQWxJYzs7QUFvSWY7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsT0F4SWUsbUJBd0lQQyxJQXhJTyxFQXdJRDtBQUNWLFFBQUlBLElBQUksS0FBSyxRQUFiLEVBQXVCO0FBQ25CO0FBQ0EzQyxNQUFBQSxVQUFVLENBQUNJLGdCQUFYLENBQTRCb0MsR0FBNUIsQ0FBZ0MsUUFBaEMsRUFGbUIsQ0FHbkI7O0FBQ0F4QyxNQUFBQSxVQUFVLENBQUNHLGFBQVgsQ0FBeUJ5QyxNQUF6QixHQUFrQ0EsTUFBbEMsR0FBMkNDLElBQTNDO0FBQ0gsS0FMRCxNQUtPO0FBQ0g7QUFDQTdDLE1BQUFBLFVBQVUsQ0FBQ0ksZ0JBQVgsQ0FBNEJvQyxHQUE1QixDQUFnQyxFQUFoQyxFQUZHLENBR0g7O0FBQ0F4QyxNQUFBQSxVQUFVLENBQUNHLGFBQVgsQ0FBeUIyQyxRQUF6QixDQUFrQyxjQUFsQyxFQUFrREgsSUFBbEQsRUFKRyxDQUtIOztBQUNBM0MsTUFBQUEsVUFBVSxDQUFDRyxhQUFYLENBQXlCeUMsTUFBekIsR0FBa0NBLE1BQWxDLEdBQTJDRyxJQUEzQztBQUNIO0FBQ0osR0F0SmM7O0FBd0pmO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsd0JBN0plLHNDQTZKWTtBQUN2QixRQUFNTCxJQUFJLEdBQUczQyxVQUFVLENBQUNzQyxjQUFYLEVBQWI7QUFDQSxRQUFNVyxhQUFhLEdBQUdOLElBQUksS0FBSyxRQUEvQjtBQUNBLFFBQU1PLE1BQU0sR0FBR2xELFVBQVUsQ0FBQ0MsUUFBWCxDQUFvQndDLElBQXBCLENBQXlCLFdBQXpCLEVBQXNDLElBQXRDLENBQWY7O0FBRUEsUUFBSVEsYUFBSixFQUFtQjtBQUNmLFVBQUksQ0FBQ0MsTUFBRCxJQUFXQSxNQUFNLEtBQUssRUFBMUIsRUFBOEI7QUFDMUI7QUFDQWxELFFBQUFBLFVBQVUsQ0FBQ1MsY0FBWCxDQUEwQjBDLElBQTFCLENBQStCLFVBQS9CLEVBQTJDLEtBQTNDO0FBQ0FuRCxRQUFBQSxVQUFVLENBQUNVLGNBQVgsQ0FBMEIwQyxXQUExQixDQUFzQyxVQUF0QztBQUNILE9BSkQsTUFJTztBQUNIO0FBQ0FwRCxRQUFBQSxVQUFVLENBQUNTLGNBQVgsQ0FBMEIwQyxJQUExQixDQUErQixVQUEvQixFQUEyQyxJQUEzQztBQUNBbkQsUUFBQUEsVUFBVSxDQUFDVSxjQUFYLENBQTBCMkMsUUFBMUIsQ0FBbUMsVUFBbkM7QUFDSCxPQVRjLENBVWY7OztBQUNBckQsTUFBQUEsVUFBVSxDQUFDRyxhQUFYLENBQXlCeUMsTUFBekIsR0FBa0NBLE1BQWxDLEdBQTJDQyxJQUEzQztBQUNILEtBWkQsTUFZTztBQUNIO0FBQ0E3QyxNQUFBQSxVQUFVLENBQUNTLGNBQVgsQ0FBMEIwQyxJQUExQixDQUErQixVQUEvQixFQUEyQyxJQUEzQztBQUNBbkQsTUFBQUEsVUFBVSxDQUFDVSxjQUFYLENBQTBCMkMsUUFBMUIsQ0FBbUMsVUFBbkMsRUFIRyxDQUlIOztBQUNBckQsTUFBQUEsVUFBVSxDQUFDRyxhQUFYLENBQXlCeUMsTUFBekIsR0FBa0NBLE1BQWxDLEdBQTJDRyxJQUEzQztBQUNIO0FBQ0osR0FyTGM7O0FBdUxmO0FBQ0o7QUFDQTtBQUNBO0FBQ0lPLEVBQUFBLFVBM0xlLHdCQTJMRjtBQUNUO0FBQ0F0RCxJQUFBQSxVQUFVLENBQUNDLFFBQVgsR0FBc0JzRCxDQUFDLENBQUMsbUJBQUQsQ0FBdkI7QUFDQXZELElBQUFBLFVBQVUsQ0FBQ0UsUUFBWCxHQUFzQnFELENBQUMsQ0FBQywwQkFBRCxDQUF2QjtBQUNBdkQsSUFBQUEsVUFBVSxDQUFDSyxZQUFYLEdBQTBCa0QsQ0FBQyxDQUFDLHdCQUFELENBQTNCO0FBQ0F2RCxJQUFBQSxVQUFVLENBQUNNLFVBQVgsR0FBd0JpRCxDQUFDLENBQUMsc0JBQUQsQ0FBekI7QUFDQXZELElBQUFBLFVBQVUsQ0FBQ08sVUFBWCxHQUF3QmdELENBQUMsQ0FBQyxzQkFBRCxDQUF6QjtBQUNBdkQsSUFBQUEsVUFBVSxDQUFDUSxjQUFYLEdBQTRCK0MsQ0FBQyxDQUFDLHlCQUFELENBQTdCO0FBQ0F2RCxJQUFBQSxVQUFVLENBQUNTLGNBQVgsR0FBNEI4QyxDQUFDLENBQUMsV0FBRCxDQUE3QjtBQUNBdkQsSUFBQUEsVUFBVSxDQUFDVSxjQUFYLEdBQTRCNkMsQ0FBQyxDQUFDLGlCQUFELENBQTdCO0FBQ0F2RCxJQUFBQSxVQUFVLENBQUNHLGFBQVgsR0FBMkJvRCxDQUFDLENBQUMsZ0JBQUQsQ0FBNUI7QUFDQXZELElBQUFBLFVBQVUsQ0FBQ0ksZ0JBQVgsR0FBOEJtRCxDQUFDLENBQUMsb0JBQUQsQ0FBL0IsQ0FYUyxDQWFUOztBQUNBdkQsSUFBQUEsVUFBVSxDQUFDRSxRQUFYLENBQW9Cc0QsR0FBcEIsQ0FBd0I7QUFDcEJDLE1BQUFBLFNBQVMsRUFBRXpELFVBQVUsQ0FBQzBEO0FBREYsS0FBeEI7QUFJQTFELElBQUFBLFVBQVUsQ0FBQ1EsY0FBWCxDQUEwQjRDLFdBQTFCLENBQXNDLFdBQXRDLEVBbEJTLENBb0JUOztBQUNBcEQsSUFBQUEsVUFBVSxDQUFDMkQsYUFBWCxHQXJCUyxDQXVCVDs7QUFDQSxRQUFJM0QsVUFBVSxDQUFDRyxhQUFYLENBQXlCMEIsTUFBekIsR0FBa0MsQ0FBdEMsRUFBeUM7QUFDckM3QixNQUFBQSxVQUFVLENBQUNHLGFBQVgsQ0FBeUIyQyxRQUF6QixDQUFrQztBQUM5QmMsUUFBQUEsUUFBUSxFQUFFNUQsVUFBVSxDQUFDNkQ7QUFEUyxPQUFsQztBQUdILEtBNUJRLENBOEJUOzs7QUFDQSxRQUFNQyxTQUFTLEdBQUcsSUFBSUMsZUFBSixDQUFvQkMsTUFBTSxDQUFDQyxRQUFQLENBQWdCQyxNQUFwQyxDQUFsQjtBQUNBLFFBQU1DLEtBQUssR0FBR0gsTUFBTSxDQUFDQyxRQUFQLENBQWdCRyxRQUFoQixDQUF5QkMsS0FBekIsQ0FBK0IsZUFBL0IsQ0FBZDtBQUNBLFFBQU1uQixNQUFNLEdBQUdpQixLQUFLLEdBQUdBLEtBQUssQ0FBQyxDQUFELENBQVIsR0FBY25FLFVBQVUsQ0FBQ0MsUUFBWCxDQUFvQndDLElBQXBCLENBQXlCLFdBQXpCLEVBQXNDLElBQXRDLENBQWxDOztBQUVBLFFBQUksQ0FBQ1MsTUFBRCxJQUFXQSxNQUFNLEtBQUssRUFBMUIsRUFBOEI7QUFDMUI7QUFDQW9CLE1BQUFBLGNBQWMsQ0FBQ0MsU0FBZixDQUF5QixLQUF6QixFQUFnQyxVQUFDQyxRQUFELEVBQWM7QUFDMUMsWUFBSUEsUUFBUSxDQUFDQyxNQUFULElBQW1CRCxRQUFRLENBQUNFLElBQWhDLEVBQXNDO0FBQ2xDO0FBQ0EsY0FBTS9CLElBQUksR0FBRzZCLFFBQVEsQ0FBQ0UsSUFBVCxDQUFjL0IsSUFBZCxJQUFzQixNQUFuQyxDQUZrQyxDQUlsQzs7QUFDQSxjQUFNZ0MsUUFBUSxxQkFBT0gsUUFBUSxDQUFDRSxJQUFoQixDQUFkOztBQUNBLGlCQUFPQyxRQUFRLENBQUNoQyxJQUFoQixDQU5rQyxDQU1YO0FBRXZCOztBQUNBM0MsVUFBQUEsVUFBVSxDQUFDQyxRQUFYLENBQW9Cd0MsSUFBcEIsQ0FBeUIsWUFBekIsRUFBdUNrQyxRQUF2QyxFQVRrQyxDQVdsQzs7QUFDQSxjQUFJaEMsSUFBSSxLQUFLLFFBQWIsRUFBdUI7QUFDbkI7QUFDQTNDLFlBQUFBLFVBQVUsQ0FBQ1MsY0FBWCxDQUEwQjBDLElBQTFCLENBQStCLFVBQS9CLEVBQTJDLEtBQTNDO0FBQ0FuRCxZQUFBQSxVQUFVLENBQUNVLGNBQVgsQ0FBMEIwQyxXQUExQixDQUFzQyxVQUF0QyxFQUhtQixDQUtuQjs7QUFDQXBELFlBQUFBLFVBQVUsQ0FBQzBDLE9BQVgsQ0FBbUIsUUFBbkIsRUFObUIsQ0FRbkI7O0FBQ0ExQyxZQUFBQSxVQUFVLENBQUNFLFFBQVgsQ0FBb0JzRCxHQUFwQixDQUF3QixZQUF4QixFQUFzQyxRQUF0QztBQUNBeEQsWUFBQUEsVUFBVSxDQUFDTSxVQUFYLENBQXNCeUMsSUFBdEI7QUFDQS9DLFlBQUFBLFVBQVUsQ0FBQ0ssWUFBWCxDQUF3QndDLElBQXhCO0FBQ0E3QyxZQUFBQSxVQUFVLENBQUNPLFVBQVgsQ0FBc0JzQyxJQUF0QixHQVptQixDQWNuQjs7QUFDQVUsWUFBQUEsQ0FBQyxDQUFDLDRCQUFELENBQUQsQ0FBZ0NWLElBQWhDO0FBQ0FVLFlBQUFBLENBQUMsQ0FBQywwQkFBRCxDQUFELENBQThCVixJQUE5QixHQWhCbUIsQ0FrQm5COztBQUNBLGdCQUFJMkIsUUFBUSxDQUFDRSxJQUFULENBQWNFLE9BQWxCLEVBQTJCO0FBQ3ZCO0FBQ0Esa0JBQU1DLGNBQWMsR0FBRzdFLFVBQVUsQ0FBQ3NCLFlBQVgsQ0FBd0JrRCxRQUFRLENBQUNFLElBQVQsQ0FBY0UsT0FBdEMsQ0FBdkI7QUFDQTVFLGNBQUFBLFVBQVUsQ0FBQ1csTUFBWCxDQUFrQm1FLFFBQWxCLENBQTJCRCxjQUEzQjtBQUNILGFBSkQsTUFJTztBQUNIO0FBQ0E3RSxjQUFBQSxVQUFVLENBQUNXLE1BQVgsQ0FBa0JtRSxRQUFsQixDQUEyQixFQUEzQjtBQUNIOztBQUNEOUUsWUFBQUEsVUFBVSxDQUFDVyxNQUFYLENBQWtCb0UsY0FBbEI7QUFDSCxXQTVCRCxNQTRCTztBQUNIO0FBQ0EvRSxZQUFBQSxVQUFVLENBQUMwQyxPQUFYLENBQW1CQyxJQUFuQjtBQUNBM0MsWUFBQUEsVUFBVSxDQUFDNkQsY0FBWCxDQUEwQmxCLElBQTFCO0FBQ0EzQyxZQUFBQSxVQUFVLENBQUNnRCx3QkFBWDtBQUNIO0FBQ0o7QUFDSixPQWhERDtBQWlESCxLQW5ERCxNQW1ETztBQUNIO0FBQ0FzQixNQUFBQSxjQUFjLENBQUNDLFNBQWYsQ0FBeUJyQixNQUF6QixFQUFpQyxVQUFDc0IsUUFBRCxFQUFjO0FBQzNDLFlBQUlBLFFBQVEsQ0FBQ0MsTUFBVCxJQUFtQkQsUUFBUSxDQUFDRSxJQUFoQyxFQUFzQztBQUNsQztBQUNBLGNBQU1NLGFBQWEsR0FBR1IsUUFBUSxDQUFDRSxJQUFULENBQWNFLE9BQXBDLENBRmtDLENBSWxDOztBQUNBLGNBQU1qQyxJQUFJLEdBQUc2QixRQUFRLENBQUNFLElBQVQsQ0FBYy9CLElBQWQsSUFBc0IsTUFBbkMsQ0FMa0MsQ0FPbEM7QUFDQTs7QUFDQSxjQUFNZ0MsUUFBUSxxQkFBT0gsUUFBUSxDQUFDRSxJQUFoQixDQUFkOztBQUNBLGlCQUFPQyxRQUFRLENBQUNDLE9BQWhCO0FBQ0EsaUJBQU9ELFFBQVEsQ0FBQ2hDLElBQWhCLENBWGtDLENBV1g7QUFFdkI7O0FBQ0EzQyxVQUFBQSxVQUFVLENBQUNDLFFBQVgsQ0FBb0J3QyxJQUFwQixDQUF5QixZQUF6QixFQUF1Q2tDLFFBQXZDLEVBZGtDLENBZ0JsQzs7QUFDQSxjQUFJSyxhQUFKLEVBQW1CO0FBQ2YsZ0JBQU1ILGNBQWMsR0FBRzdFLFVBQVUsQ0FBQ3NCLFlBQVgsQ0FBd0IwRCxhQUF4QixDQUF2QjtBQUNBaEYsWUFBQUEsVUFBVSxDQUFDVyxNQUFYLENBQWtCbUUsUUFBbEIsQ0FBMkJELGNBQTNCO0FBQ0E3RSxZQUFBQSxVQUFVLENBQUNXLE1BQVgsQ0FBa0JvRSxjQUFsQjtBQUNILFdBckJpQyxDQXVCbEM7OztBQUNBLGNBQUlwQyxJQUFJLEtBQUssUUFBYixFQUF1QjtBQUNuQjtBQUNBM0MsWUFBQUEsVUFBVSxDQUFDUyxjQUFYLENBQTBCMEMsSUFBMUIsQ0FBK0IsVUFBL0IsRUFBMkMsSUFBM0M7QUFDQW5ELFlBQUFBLFVBQVUsQ0FBQ1UsY0FBWCxDQUEwQjJDLFFBQTFCLENBQW1DLFVBQW5DLEVBSG1CLENBS25COztBQUNBckQsWUFBQUEsVUFBVSxDQUFDMEMsT0FBWCxDQUFtQixRQUFuQixFQU5tQixDQVFuQjs7QUFDQTFDLFlBQUFBLFVBQVUsQ0FBQ0UsUUFBWCxDQUFvQnNELEdBQXBCLENBQXdCLFlBQXhCLEVBQXNDLFFBQXRDO0FBQ0F4RCxZQUFBQSxVQUFVLENBQUNNLFVBQVgsQ0FBc0J5QyxJQUF0QjtBQUNBL0MsWUFBQUEsVUFBVSxDQUFDSyxZQUFYLENBQXdCd0MsSUFBeEI7QUFDQTdDLFlBQUFBLFVBQVUsQ0FBQ08sVUFBWCxDQUFzQnNDLElBQXRCLEdBWm1CLENBY25COztBQUNBVSxZQUFBQSxDQUFDLENBQUMsNEJBQUQsQ0FBRCxDQUFnQ1YsSUFBaEM7QUFDQVUsWUFBQUEsQ0FBQyxDQUFDLDBCQUFELENBQUQsQ0FBOEJWLElBQTlCO0FBQ0gsV0FqQkQsTUFpQk87QUFDSDtBQUNBN0MsWUFBQUEsVUFBVSxDQUFDMEMsT0FBWCxDQUFtQkMsSUFBbkI7QUFDQTNDLFlBQUFBLFVBQVUsQ0FBQzZELGNBQVgsQ0FBMEJsQixJQUExQjtBQUNBM0MsWUFBQUEsVUFBVSxDQUFDZ0Qsd0JBQVg7QUFDSDtBQUNKLFNBL0NELE1BK0NPO0FBQ0g7QUFDQWdCLFVBQUFBLE1BQU0sQ0FBQ0MsUUFBUCxhQUFxQmdCLGFBQXJCO0FBQ0g7QUFDSixPQXBERDtBQXFESCxLQTdJUSxDQStJVDs7O0FBQ0FqRixJQUFBQSxVQUFVLENBQUNrRixjQUFYO0FBRUgsR0E3VWM7O0FBK1VmO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJckIsRUFBQUEsY0FyVmUsMEJBcVZBc0IsS0FyVkEsRUFxVk9DLElBclZQLEVBcVZZO0FBQ3ZCO0FBQ0EsWUFBUUQsS0FBUjtBQUNJLFdBQUssTUFBTDtBQUNJbkYsUUFBQUEsVUFBVSxDQUFDRSxRQUFYLENBQW9Cc0QsR0FBcEIsQ0FBd0IsWUFBeEIsRUFBcUMsVUFBckM7QUFDQTs7QUFDSixXQUFLLFVBQUw7QUFDQSxXQUFLLFFBQUw7QUFBZ0I7QUFDWnhELFFBQUFBLFVBQVUsQ0FBQ0UsUUFBWCxDQUFvQnNELEdBQXBCLENBQXdCLFlBQXhCLEVBQXFDLFFBQXJDO0FBQ0E7O0FBQ0osV0FBSyxRQUFMO0FBQ0l4RCxRQUFBQSxVQUFVLENBQUNFLFFBQVgsQ0FBb0JzRCxHQUFwQixDQUF3QixZQUF4QixFQUFxQyxRQUFyQztBQUNBOztBQUNKLFdBQUssUUFBTDtBQUNJeEQsUUFBQUEsVUFBVSxDQUFDRSxRQUFYLENBQW9Cc0QsR0FBcEIsQ0FBd0IsWUFBeEIsRUFBcUMsUUFBckM7QUFDQTs7QUFDSjtBQUNJeEQsUUFBQUEsVUFBVSxDQUFDRSxRQUFYLENBQW9Cc0QsR0FBcEIsQ0FBd0IsWUFBeEIsRUFBcUMsVUFBckM7QUFmUjs7QUFpQkF4RCxJQUFBQSxVQUFVLENBQUNxRixZQUFYO0FBQ0gsR0F6V2M7O0FBMldmO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSTNCLEVBQUFBLFdBaFhlLHVCQWdYSDRCLFVBaFhHLEVBZ1hRO0FBQ25CLFFBQU1DLFFBQVEsR0FBR3ZGLFVBQVUsQ0FBQ0MsUUFBWCxDQUFvQndDLElBQXBCLENBQXlCLFdBQXpCLEVBQXNDLFVBQXRDLENBQWpCOztBQUNBLFlBQVE2QyxVQUFSO0FBQ0ksV0FBSyxRQUFMO0FBQ0kvQixRQUFBQSxDQUFDLENBQUMseUJBQUQsQ0FBRCxDQUE2QkYsUUFBN0IsQ0FBc0MsU0FBdEM7QUFDQW1DLFFBQUFBLFFBQVEsQ0FBQ0MsY0FBVCxDQUF3QkYsUUFBeEIsRUFBa0N2RixVQUFVLENBQUMwRixnQ0FBN0MsRUFBK0UsS0FBL0U7QUFDQTs7QUFDSixXQUFLLFVBQUw7QUFDSW5DLFFBQUFBLENBQUMsQ0FBQywyQkFBRCxDQUFELENBQStCRixRQUEvQixDQUF3QyxTQUF4QztBQUNBbUMsUUFBQUEsUUFBUSxDQUFDQyxjQUFULENBQXdCRixRQUF4QixFQUFrQ3ZGLFVBQVUsQ0FBQzJGLGtDQUE3QyxFQUFpRixJQUFqRjtBQUNBOztBQUNKLFdBQUssUUFBTDtBQUNJO0FBVlI7QUFZSCxHQTlYYzs7QUFnWWY7QUFDSjtBQUNBO0FBQ0E7QUFDSU4sRUFBQUEsWUFwWWUsMEJBb1lBO0FBQ1g7QUFDQSxRQUFNMUMsSUFBSSxHQUFHM0MsVUFBVSxDQUFDc0MsY0FBWCxFQUFiLENBRlcsQ0FJWDs7QUFDQSxRQUFJc0MsT0FBTyxHQUFHNUUsVUFBVSxDQUFDVyxNQUFYLENBQWtCaUYsUUFBbEIsRUFBZCxDQUxXLENBT1g7O0FBQ0EsUUFBTUMsb0JBQW9CLEdBQUd0QyxDQUFDLENBQUMsNEJBQUQsQ0FBOUI7QUFDQSxRQUFNdUMsa0JBQWtCLEdBQUd2QyxDQUFDLENBQUMsMEJBQUQsQ0FBNUIsQ0FUVyxDQVdYOztBQUNBLFlBQVFaLElBQVI7QUFDSSxXQUFLLE1BQUw7QUFDSTtBQUNBM0MsUUFBQUEsVUFBVSxDQUFDTSxVQUFYLENBQXNCdUMsSUFBdEI7QUFDQTdDLFFBQUFBLFVBQVUsQ0FBQ0ssWUFBWCxDQUF3QjBDLElBQXhCO0FBQ0EvQyxRQUFBQSxVQUFVLENBQUNZLGNBQVgsQ0FBMEJtRixpQkFBMUI7QUFDQS9GLFFBQUFBLFVBQVUsQ0FBQ08sVUFBWCxDQUFzQnNDLElBQXRCLEdBTEosQ0FNSTs7QUFDQWdELFFBQUFBLG9CQUFvQixDQUFDOUMsSUFBckI7QUFDQStDLFFBQUFBLGtCQUFrQixDQUFDakQsSUFBbkI7QUFDQTs7QUFDSixXQUFLLFFBQUw7QUFDSTtBQUNBN0MsUUFBQUEsVUFBVSxDQUFDTSxVQUFYLENBQXNCeUMsSUFBdEI7QUFDQS9DLFFBQUFBLFVBQVUsQ0FBQ0ssWUFBWCxDQUF3QjBDLElBQXhCO0FBQ0EvQyxRQUFBQSxVQUFVLENBQUNPLFVBQVgsQ0FBc0J3QyxJQUF0QjtBQUNBL0MsUUFBQUEsVUFBVSxDQUFDWSxjQUFYLENBQTBCb0YsZUFBMUI7QUFDQWhHLFFBQUFBLFVBQVUsQ0FBQ2EsWUFBWCxDQUF3Qm1GLGVBQXhCLEdBTkosQ0FPSTs7QUFDQUgsUUFBQUEsb0JBQW9CLENBQUM5QyxJQUFyQjtBQUNBK0MsUUFBQUEsa0JBQWtCLENBQUMvQyxJQUFuQjtBQUNBOztBQUNKLFdBQUssVUFBTDtBQUNJO0FBQ0EvQyxRQUFBQSxVQUFVLENBQUNNLFVBQVgsQ0FBc0J5QyxJQUF0QjtBQUNBL0MsUUFBQUEsVUFBVSxDQUFDSyxZQUFYLENBQXdCd0MsSUFBeEI7QUFDQTdDLFFBQUFBLFVBQVUsQ0FBQ08sVUFBWCxDQUFzQnNDLElBQXRCLEdBSkosQ0FLSTs7QUFDQWdELFFBQUFBLG9CQUFvQixDQUFDaEQsSUFBckI7QUFDQWlELFFBQUFBLGtCQUFrQixDQUFDakQsSUFBbkI7QUFDQTs7QUFDSixXQUFLLFFBQUw7QUFDSTtBQUNBN0MsUUFBQUEsVUFBVSxDQUFDTSxVQUFYLENBQXNCeUMsSUFBdEI7QUFDQS9DLFFBQUFBLFVBQVUsQ0FBQ0ssWUFBWCxDQUF3QndDLElBQXhCO0FBQ0E3QyxRQUFBQSxVQUFVLENBQUNPLFVBQVgsQ0FBc0JzQyxJQUF0QixHQUpKLENBS0k7O0FBQ0FnRCxRQUFBQSxvQkFBb0IsQ0FBQ2hELElBQXJCO0FBQ0FpRCxRQUFBQSxrQkFBa0IsQ0FBQ2pELElBQW5CO0FBQ0E7O0FBQ0osV0FBSyxRQUFMO0FBQ0k7QUFDQTdDLFFBQUFBLFVBQVUsQ0FBQ00sVUFBWCxDQUFzQnlDLElBQXRCO0FBQ0EvQyxRQUFBQSxVQUFVLENBQUNLLFlBQVgsQ0FBd0IwQyxJQUF4QjtBQUNBL0MsUUFBQUEsVUFBVSxDQUFDTyxVQUFYLENBQXNCd0MsSUFBdEIsR0FKSixDQUtJOztBQUNBOEMsUUFBQUEsb0JBQW9CLENBQUM5QyxJQUFyQjtBQUNBK0MsUUFBQUEsa0JBQWtCLENBQUMvQyxJQUFuQixHQVBKLENBUUk7O0FBQ0EsWUFBSSxDQUFDNkIsT0FBRCxJQUFZQSxPQUFPLENBQUNxQixJQUFSLE9BQW1CLEVBQW5DLEVBQXVDO0FBQ25DckIsVUFBQUEsT0FBTyxxQkFBUDtBQUNBQSxVQUFBQSxPQUFPLDhEQUFQO0FBQ0FBLFVBQUFBLE9BQU8sMEZBQVA7QUFDQUEsVUFBQUEsT0FBTywwRUFBUDtBQUVBQSxVQUFBQSxPQUFPLDZGQUFQO0FBQ0FBLFVBQUFBLE9BQU8sOEZBQVA7QUFFQUEsVUFBQUEsT0FBTyxnSUFBUDtBQUNBQSxVQUFBQSxPQUFPLHdKQUFQO0FBRUFBLFVBQUFBLE9BQU8sMEhBQVAsQ0FabUMsQ0FjbkM7O0FBQ0E1RSxVQUFBQSxVQUFVLENBQUNXLE1BQVgsQ0FBa0JtRSxRQUFsQixDQUEyQkYsT0FBM0I7QUFDQTVFLFVBQUFBLFVBQVUsQ0FBQ1csTUFBWCxDQUFrQm9FLGNBQWxCO0FBQ0g7O0FBRUQ7O0FBQ0o7QUFDSTtBQUNBO0FBdkVSOztBQTBFQS9FLElBQUFBLFVBQVUsQ0FBQ1ksY0FBWCxDQUEwQnNGLFFBQTFCLENBQW1DLG1CQUFuQztBQUNBbEcsSUFBQUEsVUFBVSxDQUFDVyxNQUFYLENBQWtCdUYsUUFBbEIsQ0FBMkIsbUJBQTNCLEVBdkZXLENBeUZYO0FBQ0E7QUFDQTtBQUNILEdBaGVjOztBQWtlZjtBQUNKO0FBQ0E7QUFDQTtBQUNJUCxFQUFBQSxrQ0F0ZWUsOENBc2VvQm5CLFFBdGVwQixFQXNlOEI7QUFDekN4RSxJQUFBQSxVQUFVLENBQUNtRyx1QkFBWCxDQUFtQzNCLFFBQW5DLEVBQTZDeEUsVUFBVSxDQUFDWSxjQUF4RCxFQUF3RSxVQUF4RTtBQUNILEdBeGVjOztBQTBlZjtBQUNKO0FBQ0E7QUFDQTtBQUNJOEUsRUFBQUEsZ0NBOWVlLDRDQThla0JsQixRQTllbEIsRUE4ZTRCO0FBQ3ZDeEUsSUFBQUEsVUFBVSxDQUFDbUcsdUJBQVgsQ0FBbUMzQixRQUFuQyxFQUE2Q3hFLFVBQVUsQ0FBQ2EsWUFBeEQsRUFBc0UsUUFBdEU7QUFDSCxHQWhmYzs7QUFrZmY7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSXNGLEVBQUFBLHVCQTVmZSxtQ0E0ZlMzQixRQTVmVCxFQTRmbUI0QixTQTVmbkIsRUE0ZjhCQyxPQTVmOUIsRUE0ZnVDO0FBQ2xEOUMsSUFBQUEsQ0FBQywyQkFBbUI4QyxPQUFuQixTQUFELENBQWlDakQsV0FBakMsQ0FBNkMsU0FBN0M7O0FBQ0EsUUFBSW9CLFFBQVEsSUFBSUEsUUFBUSxDQUFDQyxNQUFyQixJQUErQkQsUUFBUSxDQUFDRSxJQUF4QyxJQUFnRCxPQUFPRixRQUFRLENBQUNFLElBQVQsQ0FBY0UsT0FBckIsS0FBaUMsUUFBckYsRUFBK0Y7QUFDM0YsVUFBTTBCLFNBQVMsR0FBR0YsU0FBUyxDQUFDRyxPQUFWLENBQWtCQyxZQUFsQixFQUFsQjtBQUNBSixNQUFBQSxTQUFTLENBQUNHLE9BQVYsQ0FBa0J6QixRQUFsQixDQUEyQk4sUUFBUSxDQUFDRSxJQUFULENBQWNFLE9BQXpDO0FBQ0F3QixNQUFBQSxTQUFTLENBQUNHLE9BQVYsQ0FBa0JFLFlBQWxCLENBQStCSCxTQUEvQjtBQUNILEtBSkQsTUFJTztBQUNIRixNQUFBQSxTQUFTLENBQUNHLE9BQVYsQ0FBa0J6QixRQUFsQixDQUEyQixFQUEzQjs7QUFDQSxVQUFJTixRQUFRLElBQUlBLFFBQVEsQ0FBQ2tDLFFBQXpCLEVBQW1DO0FBQy9CQyxRQUFBQSxXQUFXLENBQUNDLGVBQVosQ0FBNEJwQyxRQUFRLENBQUNrQyxRQUFyQztBQUNIO0FBQ0o7QUFDSixHQXhnQmM7O0FBMGdCZjtBQUNKO0FBQ0E7QUFDSS9DLEVBQUFBLGFBN2dCZSwyQkE2Z0JDO0FBQ1o7QUFDQSxRQUFNa0QsU0FBUyxHQUFHN0MsTUFBTSxDQUFDOEMsV0FBUCxHQUFxQixHQUF2QztBQUNBLFFBQU1DLFNBQVMsR0FBR0MsSUFBSSxDQUFDQyxLQUFMLENBQVdKLFNBQVMsR0FBRyxJQUF2QixDQUFsQixDQUhZLENBS1o7O0FBQ0F0RCxJQUFBQSxDQUFDLENBQUMsbUJBQUQsQ0FBRCxDQUF1QjJELEdBQXZCLENBQTJCLFlBQTNCLFlBQTRDTCxTQUE1QyxTQU5ZLENBUVo7O0FBQ0EsUUFBTU0sT0FBTyxHQUFHQyxHQUFHLENBQUNDLE9BQUosQ0FBWSxnQkFBWixFQUE4QkMsSUFBOUM7O0FBQ0F0SCxJQUFBQSxVQUFVLENBQUNZLGNBQVgsR0FBNEJ3RyxHQUFHLENBQUNHLElBQUosQ0FBUyxzQkFBVCxDQUE1QjtBQUNBdkgsSUFBQUEsVUFBVSxDQUFDWSxjQUFYLENBQTBCMkYsT0FBMUIsQ0FBa0M3RCxPQUFsQyxDQUEwQyxJQUFJeUUsT0FBSixFQUExQztBQUNBbkgsSUFBQUEsVUFBVSxDQUFDWSxjQUFYLENBQTBCc0YsUUFBMUIsQ0FBbUMsbUJBQW5DO0FBQ0FsRyxJQUFBQSxVQUFVLENBQUNZLGNBQVgsQ0FBMEI0RyxVQUExQixDQUFxQztBQUNqQ0MsTUFBQUEsZUFBZSxFQUFFLEtBRGdCO0FBRWpDQyxNQUFBQSxRQUFRLEVBQUUsSUFGdUI7QUFHakNDLE1BQUFBLFFBQVEsRUFBRVo7QUFIdUIsS0FBckMsRUFiWSxDQW1CWjs7QUFDQS9HLElBQUFBLFVBQVUsQ0FBQ2EsWUFBWCxHQUEwQnVHLEdBQUcsQ0FBQ0csSUFBSixDQUFTLG9CQUFULENBQTFCO0FBQ0F2SCxJQUFBQSxVQUFVLENBQUNhLFlBQVgsQ0FBd0IwRixPQUF4QixDQUFnQzdELE9BQWhDLENBQXdDLElBQUl5RSxPQUFKLEVBQXhDO0FBQ0FuSCxJQUFBQSxVQUFVLENBQUNhLFlBQVgsQ0FBd0JxRixRQUF4QixDQUFpQyxtQkFBakM7QUFDQWxHLElBQUFBLFVBQVUsQ0FBQ2EsWUFBWCxDQUF3QjJHLFVBQXhCLENBQW1DO0FBQy9CQyxNQUFBQSxlQUFlLEVBQUUsS0FEYztBQUUvQkMsTUFBQUEsUUFBUSxFQUFFLElBRnFCO0FBRy9CQyxNQUFBQSxRQUFRLEVBQUVaO0FBSHFCLEtBQW5DLEVBdkJZLENBOEJaOztBQUNBL0csSUFBQUEsVUFBVSxDQUFDVyxNQUFYLEdBQW9CeUcsR0FBRyxDQUFDRyxJQUFKLENBQVMsa0JBQVQsQ0FBcEI7QUFDQXZILElBQUFBLFVBQVUsQ0FBQ1csTUFBWCxDQUFrQjRGLE9BQWxCLENBQTBCN0QsT0FBMUIsQ0FBa0MsSUFBSXlFLE9BQUosRUFBbEM7QUFDQW5ILElBQUFBLFVBQVUsQ0FBQ1csTUFBWCxDQUFrQnVGLFFBQWxCLENBQTJCLG1CQUEzQjtBQUNBbEcsSUFBQUEsVUFBVSxDQUFDVyxNQUFYLENBQWtCNkcsVUFBbEIsQ0FBNkI7QUFDekJDLE1BQUFBLGVBQWUsRUFBRSxLQURRO0FBRXpCRSxNQUFBQSxRQUFRLEVBQUVaO0FBRmUsS0FBN0I7QUFJQS9HLElBQUFBLFVBQVUsQ0FBQ1csTUFBWCxDQUFrQjRGLE9BQWxCLENBQTBCcUIsRUFBMUIsQ0FBNkIsUUFBN0IsRUFBdUMsWUFBTTtBQUN6QztBQUNBQyxNQUFBQSxJQUFJLENBQUNDLFdBQUw7QUFDSCxLQUhELEVBdENZLENBMkNaO0FBQ0E7O0FBQ0EsUUFBTUMsY0FBYyxHQUFHeEUsQ0FBQyxDQUFDLHdCQUFELENBQXhCO0FBQ0EsUUFBTXlFLGVBQWUsR0FBR0QsY0FBYyxDQUFDRSxLQUFmLEdBQXVCQyxRQUF2QixDQUFnQyxtQkFBaEMsRUFBcUQsQ0FBckQsQ0FBeEI7O0FBQ0EsUUFBSUMsZ0JBQWdCLENBQUNDLFdBQWpCLENBQTZCSixlQUE3QixDQUFKLEVBQW1EO0FBQy9DRCxNQUFBQSxjQUFjLENBQUNILEVBQWYsQ0FBa0IsT0FBbEIsRUFBMkIsWUFBWTtBQUNuQyxZQUFNUyxTQUFTLEdBQUc5RSxDQUFDLENBQUMsSUFBRCxDQUFELENBQVEyRSxRQUFSLENBQWlCLG1CQUFqQixFQUFzQyxDQUF0QyxDQUFsQjtBQUNBbEksUUFBQUEsVUFBVSxDQUFDc0ksZ0JBQVgsQ0FBNEJELFNBQTVCO0FBQ0gsT0FIRDtBQUlBRixNQUFBQSxnQkFBZ0IsQ0FBQ3ZFLFFBQWpCLENBQTBCNUQsVUFBVSxDQUFDdUksa0JBQXJDO0FBQ0gsS0FORCxNQU1PO0FBQ0hSLE1BQUFBLGNBQWMsQ0FBQ2xGLElBQWY7QUFDSDtBQUVKLEdBdGtCYzs7QUF1a0JmO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSXlGLEVBQUFBLGdCQTVrQmUsNEJBNGtCRUQsU0E1a0JGLEVBNGtCYTtBQUN4QkYsSUFBQUEsZ0JBQWdCLENBQUNLLE1BQWpCLENBQXdCSCxTQUF4QixXQUF5QyxVQUFBSSxHQUFHLEVBQUk7QUFDNUNyRyxNQUFBQSxPQUFPLENBQUNDLEtBQVIsd0RBQThEb0csR0FBRyxDQUFDQyxPQUFsRTtBQUNILEtBRkQ7QUFHSCxHQWhsQmM7O0FBa2xCZjtBQUNKO0FBQ0E7QUFDSUgsRUFBQUEsa0JBcmxCZSxnQ0FxbEJNO0FBQ2pCLFFBQU1JLE9BQU8sR0FBRyxDQUFDM0ksVUFBVSxDQUFDWSxjQUFaLEVBQTRCWixVQUFVLENBQUNhLFlBQXZDLEVBQXFEYixVQUFVLENBQUNXLE1BQWhFLENBQWhCO0FBQ0FnSSxJQUFBQSxPQUFPLENBQUNDLE9BQVIsQ0FBZ0IsVUFBQWpJLE1BQU0sRUFBSTtBQUN0QixVQUFJQSxNQUFKLEVBQVk7QUFDUkEsUUFBQUEsTUFBTSxDQUFDa0ksTUFBUDtBQUNIO0FBQ0osS0FKRDtBQUtILEdBNWxCYzs7QUE2bEJmO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsZ0JBbG1CZSw0QkFrbUJFQyxRQWxtQkYsRUFrbUJZO0FBQ3ZCLFFBQU10RSxNQUFNLEdBQUdzRSxRQUFmLENBRHVCLENBR3ZCOztBQUNBLFFBQU1wRyxJQUFJLEdBQUczQyxVQUFVLENBQUNzQyxjQUFYLEVBQWIsQ0FKdUIsQ0FNdkI7O0FBQ0FtQyxJQUFBQSxNQUFNLENBQUNDLElBQVAsR0FBYzFFLFVBQVUsQ0FBQ0MsUUFBWCxDQUFvQndDLElBQXBCLENBQXlCLFlBQXpCLENBQWQsQ0FQdUIsQ0FTdkI7O0FBQ0FnQyxJQUFBQSxNQUFNLENBQUNDLElBQVAsQ0FBWS9CLElBQVosR0FBbUJBLElBQW5CLENBVnVCLENBWXZCOztBQUNBLFdBQU84QixNQUFNLENBQUNDLElBQVAsQ0FBWSxtQkFBWixDQUFQLENBYnVCLENBZXZCOztBQUNBLFlBQVEvQixJQUFSO0FBQ0ksV0FBSyxRQUFMO0FBQ0EsV0FBSyxVQUFMO0FBQ0EsV0FBSyxRQUFMO0FBQ0EsV0FBSyxRQUFMO0FBQ0k7QUFDQSxZQUFJLENBQUMzQyxVQUFVLENBQUNXLE1BQWhCLEVBQXdCO0FBQ3BCeUIsVUFBQUEsT0FBTyxDQUFDQyxLQUFSLENBQWMsNEJBQWQ7QUFDQW9DLFVBQUFBLE1BQU0sQ0FBQ0MsSUFBUCxDQUFZRSxPQUFaLEdBQXNCLEVBQXRCO0FBQ0gsU0FIRCxNQUdPO0FBQ0gsY0FBTW9FLGFBQWEsR0FBR2hKLFVBQVUsQ0FBQ1csTUFBWCxDQUFrQmlGLFFBQWxCLEVBQXRCO0FBQ0FuQixVQUFBQSxNQUFNLENBQUNDLElBQVAsQ0FBWUUsT0FBWixHQUFzQm9FLGFBQXRCO0FBQ0g7O0FBQ0Q7O0FBQ0osV0FBSyxNQUFMO0FBQ0E7QUFDSTtBQUNBdkUsUUFBQUEsTUFBTSxDQUFDQyxJQUFQLENBQVlFLE9BQVosR0FBc0IsRUFBdEI7QUFqQlI7O0FBb0JBLFdBQU9ILE1BQVA7QUFDSCxHQXZvQmM7O0FBeW9CZjtBQUNKO0FBQ0E7QUFDQTtBQUNJd0UsRUFBQUEsZUE3b0JlLDJCQTZvQkN6RSxRQTdvQkQsRUE2b0JXLENBRXpCLENBL29CYzs7QUFncEJmO0FBQ0o7QUFDQTtBQUNJVSxFQUFBQSxjQW5wQmUsNEJBbXBCRTtBQUNiMkMsSUFBQUEsSUFBSSxDQUFDNUgsUUFBTCxHQUFnQkQsVUFBVSxDQUFDQyxRQUEzQixDQURhLENBR2I7O0FBQ0E0SCxJQUFBQSxJQUFJLENBQUNxQixXQUFMLEdBQW1CO0FBQ2ZDLE1BQUFBLE9BQU8sRUFBRSxJQURNO0FBRWZDLE1BQUFBLFNBQVMsRUFBRTlFLGNBRkk7QUFHZitFLE1BQUFBLFVBQVUsRUFBRSxNQUhHO0FBR007QUFDckJDLE1BQUFBLGdCQUFnQixFQUFFLEtBSkg7QUFJVztBQUMxQkMsTUFBQUEsT0FBTyxFQUFFO0FBTE0sS0FBbkI7QUFRQTFCLElBQUFBLElBQUksQ0FBQy9HLGFBQUwsR0FBcUJkLFVBQVUsQ0FBQ2MsYUFBaEMsQ0FaYSxDQVlrQzs7QUFDL0MrRyxJQUFBQSxJQUFJLENBQUNpQixnQkFBTCxHQUF3QjlJLFVBQVUsQ0FBQzhJLGdCQUFuQyxDQWJhLENBYXdDOztBQUNyRGpCLElBQUFBLElBQUksQ0FBQ29CLGVBQUwsR0FBdUJqSixVQUFVLENBQUNpSixlQUFsQyxDQWRhLENBY3NDOztBQUNuRHBCLElBQUFBLElBQUksQ0FBQ3ZFLFVBQUw7QUFDSDtBQW5xQmMsQ0FBbkIsQyxDQXNxQkE7O0FBQ0FDLENBQUMsQ0FBQ2lHLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJ6SixFQUFBQSxVQUFVLENBQUNzRCxVQUFYO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLGdsb2JhbFRyYW5zbGF0ZSwgYWNlLCBGb3JtLCBGaWxlc0FQSSwgY3VzdG9tRmlsZXNBUEksIFBieEFwaUNsaWVudCwgVXNlck1lc3NhZ2UgKi9cblxuXG4vKipcbiAqIE1vZHVsZSBjdXN0b21GaWxlXG4gKiBUaGlzIG1vZHVsZSBtYW5hZ2VzIGZpbGUgaW50ZXJhY3Rpb25zIGluIGEgVUksIHN1Y2ggYXMgbG9hZGluZyBmaWxlIGNvbnRlbnQgZnJvbSBhIHNlcnZlciBhbmQgaGFuZGxpbmcgdXNlciBpbnB1dC5cbiAqIEBtb2R1bGUgY3VzdG9tRmlsZVxuICovXG5jb25zdCBjdXN0b21GaWxlID0ge1xuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogUmVzb2x2ZWQgaW4gaW5pdGlhbGl6ZSgpIOKAlCBtdXN0IG5vdCBjYWxsICQoKSBhdCBtb2R1bGUtbG9hZCB0aW1lLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdGFiIG1lbnUuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkdGFiTWVudTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBtb2RlIHNlbGVjdC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRtb2RlRHJvcERvd246IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgaGlkZGVuIGN1c3RvbSBtb2RlIGlucHV0LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG1vZGVDdXN0b21JbnB1dDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB0YWIgd2l0aCBvcmlnaW5hbCBmaWxlIGNvbnRlbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkb3JpZ2luYWxUYWI6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdGFiIHdpdGggdXNlciBjb250ZW50L3NjcmlwdCBlZGl0b3IuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZWRpdG9yVGFiOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHRhYiB3aXRoIHJlc3VsdGVkIGZpbGUgY29udGVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRyZXN1bHRUYWI6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgZWxlbWVudCBmb3IgdGhlIG1haW4gY29udGVudCBjb250YWluZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbWFpbkNvbnRhaW5lcjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmaWxlcGF0aCBpbnB1dCBmaWVsZC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmaWxlcGF0aElucHV0OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZpbGVwYXRoIGZpZWxkIGNvbnRhaW5lci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmaWxlcGF0aEZpZWxkOiBudWxsLFxuXG5cbiAgICAvKipcbiAgICAgKiBBY2UgZWRpdG9yIGluc3RhbmNlc1xuICAgICAqIGBlZGl0b3JgIGlzIGZvciBpbnB1dCBhbmQgYHZpZXdlcnNgIGlzIGZvciBkaXNwbGF5IGNvZGUgZnJvbSBzZXJ2ZXJcbiAgICAgKi9cbiAgICBlZGl0b3I6ICcnLFxuICAgIHZpZXdlck9yaWdpbmFsOiAnJyxcbiAgICB2aWV3ZXJSZXN1bHQ6ICcnLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIG5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdmaWxlcGF0aCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuY2ZfVmFsaWRhdGVOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGVjb2RlIGJhc2U2NCBzdHJpbmcgdG8gVVRGLThcbiAgICAgKiBIYW5kbGVzIFVuaWNvZGUgY2hhcmFjdGVycyAoUnVzc2lhbiwgQ2hpbmVzZSwgZXRjLilcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBiYXNlNjRTdHIgLSBCYXNlNjQgZW5jb2RlZCBzdHJpbmdcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBVVEYtOCBkZWNvZGVkIHN0cmluZ1xuICAgICAqL1xuICAgIGJhc2U2NFRvVXRmOChiYXNlNjRTdHIpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIC8vIERlY29kZSBiYXNlNjQgdG8gYmluYXJ5IHN0cmluZ1xuICAgICAgICAgICAgY29uc3QgYmluYXJ5U3RyaW5nID0gYXRvYihiYXNlNjRTdHIpO1xuXG4gICAgICAgICAgICAvLyBVc2UgVGV4dERlY29kZXIgZm9yIG1vZGVybiBicm93c2Vyc1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBUZXh0RGVjb2RlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBieXRlcyA9IG5ldyBVaW50OEFycmF5KGJpbmFyeVN0cmluZy5sZW5ndGgpO1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYmluYXJ5U3RyaW5nLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGJ5dGVzW2ldID0gYmluYXJ5U3RyaW5nLmNoYXJDb2RlQXQoaSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgVGV4dERlY29kZXIoKS5kZWNvZGUoYnl0ZXMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBGYWxsYmFjayBmb3Igb2xkZXIgYnJvd3NlcnNcbiAgICAgICAgICAgICAgICByZXR1cm4gZGVjb2RlVVJJQ29tcG9uZW50KGVzY2FwZShiaW5hcnlTdHJpbmcpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gZGVjb2RlIGJhc2U2NDonLCBlKTtcbiAgICAgICAgICAgIHJldHVybiBiYXNlNjRTdHI7IC8vIFJldHVybiBhcy1pcyBpZiBkZWNvZGUgZmFpbHNcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgY3VycmVudCBtb2RlIHZhbHVlIChmcm9tIGRyb3Bkb3duIG9yIGhpZGRlbiBpbnB1dCBmb3IgY3VzdG9tIG1vZGUpXG4gICAgICogQHJldHVybnMge3N0cmluZ30gQ3VycmVudCBtb2RlIHZhbHVlXG4gICAgICovXG4gICAgZ2V0Q3VycmVudE1vZGUoKSB7XG4gICAgICAgIC8vIENoZWNrIGlmIGN1c3RvbSBtb2RlIGlzIGFjdGl2ZSAoaGlkZGVuIGlucHV0IGhhcyB2YWx1ZSlcbiAgICAgICAgY29uc3QgY3VzdG9tTW9kZVZhbHVlID0gY3VzdG9tRmlsZS4kbW9kZUN1c3RvbUlucHV0LnZhbCgpO1xuICAgICAgICBpZiAoY3VzdG9tTW9kZVZhbHVlID09PSAnY3VzdG9tJykge1xuICAgICAgICAgICAgcmV0dXJuICdjdXN0b20nO1xuICAgICAgICB9XG4gICAgICAgIC8vIE90aGVyd2lzZSByZXR1cm4gZHJvcGRvd24gdmFsdWVcbiAgICAgICAgcmV0dXJuIGN1c3RvbUZpbGUuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ21vZGUnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2V0IG1vZGUgdmFsdWUgKHVzaW5nIGRyb3Bkb3duIGZvciBzdGFuZGFyZCBtb2RlcywgaGlkZGVuIGlucHV0IGZvciBjdXN0b20gbW9kZSlcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbW9kZSAtIE1vZGUgdG8gc2V0XG4gICAgICovXG4gICAgc2V0TW9kZShtb2RlKSB7XG4gICAgICAgIGlmIChtb2RlID09PSAnY3VzdG9tJykge1xuICAgICAgICAgICAgLy8gU2V0IGN1c3RvbSBtb2RlIHZpYSBoaWRkZW4gaW5wdXRcbiAgICAgICAgICAgIGN1c3RvbUZpbGUuJG1vZGVDdXN0b21JbnB1dC52YWwoJ2N1c3RvbScpO1xuICAgICAgICAgICAgLy8gSGlkZSBkcm9wZG93biBmb3IgY3VzdG9tIGZpbGVzXG4gICAgICAgICAgICBjdXN0b21GaWxlLiRtb2RlRHJvcERvd24ucGFyZW50KCkucGFyZW50KCkuaGlkZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gQ2xlYXIgY3VzdG9tIG1vZGVcbiAgICAgICAgICAgIGN1c3RvbUZpbGUuJG1vZGVDdXN0b21JbnB1dC52YWwoJycpO1xuICAgICAgICAgICAgLy8gU2V0IHN0YW5kYXJkIG1vZGUgdmlhIGRyb3Bkb3duXG4gICAgICAgICAgICBjdXN0b21GaWxlLiRtb2RlRHJvcERvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIG1vZGUpO1xuICAgICAgICAgICAgLy8gU2hvdyBkcm9wZG93blxuICAgICAgICAgICAgY3VzdG9tRmlsZS4kbW9kZURyb3BEb3duLnBhcmVudCgpLnBhcmVudCgpLnNob3coKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSBmaWxlcGF0aCBmaWVsZCBzdGF0ZSBiYXNlZCBvbiB3aGV0aGVyIHRoZSBmaWxlIGlzIHVzZXItY3JlYXRlZCAoTU9ERV9DVVNUT00pIG9yIHN5c3RlbS1tYW5hZ2VkLlxuICAgICAqIFVzZXItY3JlYXRlZCBmaWxlcyBoYXZlIGVkaXRhYmxlIGZpbGVwYXRoIGJ1dCBjYW5ub3QgYmUgY3JlYXRlZCAob25seSBmb3IgbmV3IGZpbGVzKSxcbiAgICAgKiBzeXN0ZW0tbWFuYWdlZCBmaWxlcyBoYXZlIHJlYWQtb25seSBmaWxlcGF0aC5cbiAgICAgKi9cbiAgICB1cGRhdGVGaWxlcGF0aEZpZWxkU3RhdGUoKSB7XG4gICAgICAgIGNvbnN0IG1vZGUgPSBjdXN0b21GaWxlLmdldEN1cnJlbnRNb2RlKCk7XG4gICAgICAgIGNvbnN0IGlzVXNlckNyZWF0ZWQgPSBtb2RlID09PSAnY3VzdG9tJztcbiAgICAgICAgY29uc3QgZmlsZUlkID0gY3VzdG9tRmlsZS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnaWQnKTtcblxuICAgICAgICBpZiAoaXNVc2VyQ3JlYXRlZCkge1xuICAgICAgICAgICAgaWYgKCFmaWxlSWQgfHwgZmlsZUlkID09PSAnJykge1xuICAgICAgICAgICAgICAgIC8vIE5ldyBjdXN0b20gZmlsZSAtIGZpbGVwYXRoIGlzIGVkaXRhYmxlXG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZmlsZXBhdGhJbnB1dC5wcm9wKCdyZWFkb25seScsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRmaWxlcGF0aEZpZWxkLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBFeGlzdGluZyBjdXN0b20gZmlsZSAtIGZpbGVwYXRoIGlzIHJlYWQtb25seSAoY2Fubm90IGJlIGNoYW5nZWQgYWZ0ZXIgY3JlYXRpb24pXG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZmlsZXBhdGhJbnB1dC5wcm9wKCdyZWFkb25seScsIHRydWUpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGZpbGVwYXRoRmllbGQuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBBbHdheXMgaGlkZSBtb2RlIHNlbGVjdG9yIGZvciBjdXN0b20gZmlsZXNcbiAgICAgICAgICAgIGN1c3RvbUZpbGUuJG1vZGVEcm9wRG93bi5wYXJlbnQoKS5wYXJlbnQoKS5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBTeXN0ZW0tbWFuYWdlZCBmaWxlIC0gZmlsZXBhdGggaXMgYWx3YXlzIHJlYWQtb25seVxuICAgICAgICAgICAgY3VzdG9tRmlsZS4kZmlsZXBhdGhJbnB1dC5wcm9wKCdyZWFkb25seScsIHRydWUpO1xuICAgICAgICAgICAgY3VzdG9tRmlsZS4kZmlsZXBhdGhGaWVsZC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIC8vIFNob3cgbW9kZSBzZWxlY3RvciBmb3Igc3lzdGVtIGZpbGVzXG4gICAgICAgICAgICBjdXN0b21GaWxlLiRtb2RlRHJvcERvd24ucGFyZW50KCkucGFyZW50KCkuc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBjdXN0b21GaWxlIG1vZHVsZS5cbiAgICAgKiBTZXRzIHVwIHRoZSBkcm9wZG93biwgaW5pdGlhbGl6ZXMgQWNlIGVkaXRvciwgZm9ybSwgYW5kIHJldHJpZXZlcyBmaWxlIGNvbnRlbnQgZnJvbSB0aGUgc2VydmVyLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgalF1ZXJ5IG9iamVjdHMgYWZ0ZXIgRE9NIGlzIHJlYWR5XG4gICAgICAgIGN1c3RvbUZpbGUuJGZvcm1PYmogPSAkKCcjY3VzdG9tLWZpbGUtZm9ybScpO1xuICAgICAgICBjdXN0b21GaWxlLiR0YWJNZW51ID0gJCgnI2N1c3RvbS1maWxlcy1tZW51IC5pdGVtJyk7XG4gICAgICAgIGN1c3RvbUZpbGUuJG9yaWdpbmFsVGFiID0gJCgnYVtkYXRhLXRhYj1cIm9yaWdpbmFsXCJdJyk7XG4gICAgICAgIGN1c3RvbUZpbGUuJGVkaXRvclRhYiA9ICQoJ2FbZGF0YS10YWI9XCJlZGl0b3JcIl0nKTtcbiAgICAgICAgY3VzdG9tRmlsZS4kcmVzdWx0VGFiID0gJCgnYVtkYXRhLXRhYj1cInJlc3VsdFwiXScpO1xuICAgICAgICBjdXN0b21GaWxlLiRtYWluQ29udGFpbmVyID0gJCgnI21haW4tY29udGVudC1jb250YWluZXInKTtcbiAgICAgICAgY3VzdG9tRmlsZS4kZmlsZXBhdGhJbnB1dCA9ICQoJyNmaWxlcGF0aCcpO1xuICAgICAgICBjdXN0b21GaWxlLiRmaWxlcGF0aEZpZWxkID0gJCgnI2ZpbGVwYXRoLWZpZWxkJyk7XG4gICAgICAgIGN1c3RvbUZpbGUuJG1vZGVEcm9wRG93biA9ICQoJyNtb2RlLWRyb3Bkb3duJyk7XG4gICAgICAgIGN1c3RvbUZpbGUuJG1vZGVDdXN0b21JbnB1dCA9ICQoJyNtb2RlLWN1c3RvbS12YWx1ZScpO1xuXG4gICAgICAgIC8vIEVuYWJsZSB0YWIgbmF2aWdhdGlvbiB3aXRoIGhpc3Rvcnkgc3VwcG9ydFxuICAgICAgICBjdXN0b21GaWxlLiR0YWJNZW51LnRhYih7XG4gICAgICAgICAgICBvblZpc2libGU6IGN1c3RvbUZpbGUub25DaGFuZ2VUYWJcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY3VzdG9tRmlsZS4kbWFpbkNvbnRhaW5lci5yZW1vdmVDbGFzcygnY29udGFpbmVyJyk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBBY2UgZWRpdG9yXG4gICAgICAgIGN1c3RvbUZpbGUuaW5pdGlhbGl6ZUFjZSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgb3IgcmVpbml0aWFsaXplIGRyb3Bkb3duXG4gICAgICAgIGlmIChjdXN0b21GaWxlLiRtb2RlRHJvcERvd24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY3VzdG9tRmlsZS4kbW9kZURyb3BEb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogY3VzdG9tRmlsZS5jYk9uQ2hhbmdlTW9kZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBHZXQgZmlsZSBJRCBmcm9tIFVSTCBvciBmb3JtXG4gICAgICAgIGNvbnN0IHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG4gICAgICAgIGNvbnN0IHVybElkID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLm1hdGNoKC9tb2RpZnlcXC8oXFxkKykvKTtcbiAgICAgICAgY29uc3QgZmlsZUlkID0gdXJsSWQgPyB1cmxJZFsxXSA6IGN1c3RvbUZpbGUuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2lkJyk7XG5cbiAgICAgICAgaWYgKCFmaWxlSWQgfHwgZmlsZUlkID09PSAnJykge1xuICAgICAgICAgICAgLy8gTG9hZCBkZWZhdWx0IHZhbHVlcyBmb3IgbmV3IGN1c3RvbSBmaWxlXG4gICAgICAgICAgICBjdXN0b21GaWxlc0FQSS5nZXRSZWNvcmQoJ25ldycsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTdG9yZSBtb2RlIHNlcGFyYXRlbHkgdG8gaGFuZGxlIGl0IGNvcnJlY3RseVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBtb2RlID0gcmVzcG9uc2UuZGF0YS5tb2RlIHx8ICdub25lJztcblxuICAgICAgICAgICAgICAgICAgICAvLyBSZW1vdmUgbW9kZSBmcm9tIHJlc3BvbnNlIGJlZm9yZSBzZXR0aW5nIGZvcm0gdmFsdWVzXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvcm1EYXRhID0gey4uLnJlc3BvbnNlLmRhdGF9O1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgZm9ybURhdGEubW9kZTsgIC8vIERvbid0IGxldCBmb3JtKCdzZXQgdmFsdWVzJykgaGFuZGxlIG1vZGVcblxuICAgICAgICAgICAgICAgICAgICAvLyBTZXQgZGVmYXVsdCB2YWx1ZXMgdG8gZm9ybSBmaWVsZHMgKHdpdGhvdXQgbW9kZSlcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWVzJywgZm9ybURhdGEpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEZvciBuZXcgZmlsZXMgd2l0aCBNT0RFX0NVU1RPTVxuICAgICAgICAgICAgICAgICAgICBpZiAobW9kZSA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIE1ha2UgZmlsZXBhdGggZWRpdGFibGUgZm9yIG5ldyBjdXN0b20gZmlsZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGZpbGVwYXRoSW5wdXQucHJvcCgncmVhZG9ubHknLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRmaWxlcGF0aEZpZWxkLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTZXQgbW9kZSB0byAnY3VzdG9tJyB1c2luZyBoaWRkZW4gaW5wdXRcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuc2V0TW9kZSgnY3VzdG9tJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNob3cgb25seSBlZGl0b3IgdGFiIGZvciBjdXN0b20gbW9kZVxuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kdGFiTWVudS50YWIoJ2NoYW5nZSB0YWInLCAnZWRpdG9yJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRlZGl0b3JUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kb3JpZ2luYWxUYWIuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kcmVzdWx0VGFiLmhpZGUoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSGlkZSBvdGhlciB0YWIgbWVudSBpdGVtc1xuICAgICAgICAgICAgICAgICAgICAgICAgJCgnLml0ZW1bZGF0YS10YWI9XCJvcmlnaW5hbFwiXScpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoJy5pdGVtW2RhdGEtdGFiPVwicmVzdWx0XCJdJykuaGlkZSgpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGVtcHR5IGNvbnRlbnQgaW4gZWRpdG9yIGZvciBuZXcgY3VzdG9tIGZpbGVzXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5jb250ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgZGVmYXVsdCBjb250ZW50IHByb3ZpZGVkIChiYXNlNjQpLCBkZWNvZGUgaXQgd2l0aCBVVEYtOCBzdXBwb3J0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVjb2RlZENvbnRlbnQgPSBjdXN0b21GaWxlLmJhc2U2NFRvVXRmOChyZXNwb25zZS5kYXRhLmNvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLnNldFZhbHVlKGRlY29kZWRDb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2V0IGVtcHR5IGNvbnRlbnQgZm9yIG5ldyBjdXN0b20gZmlsZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLnNldFZhbHVlKCcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGb3Igb3RoZXIgbW9kZXMsIHVzZSBzdGFuZGFyZCBiZWhhdmlvciAobW9kZSBhbHJlYWR5IGV4dHJhY3RlZCBhYm92ZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuc2V0TW9kZShtb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuY2JPbkNoYW5nZU1vZGUobW9kZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLnVwZGF0ZUZpbGVwYXRoRmllbGRTdGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBMb2FkIGV4aXN0aW5nIGZpbGUgZGF0YSB2aWEgUkVTVCBBUElcbiAgICAgICAgICAgIGN1c3RvbUZpbGVzQVBJLmdldFJlY29yZChmaWxlSWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTdG9yZSBiYXNlNjQgY29udGVudCBzZXBhcmF0ZWx5IGFuZCByZW1vdmUgZnJvbSBmb3JtIGRhdGFcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYmFzZTY0Q29udGVudCA9IHJlc3BvbnNlLmRhdGEuY29udGVudDtcblxuICAgICAgICAgICAgICAgICAgICAvLyBTdG9yZSBtb2RlIHNlcGFyYXRlbHkgdG8gaGFuZGxlIGl0IGNvcnJlY3RseVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBtb2RlID0gcmVzcG9uc2UuZGF0YS5tb2RlIHx8ICdub25lJztcblxuICAgICAgICAgICAgICAgICAgICAvLyBSZW1vdmUgY29udGVudCBhbmQgbW9kZSBmcm9tIHJlc3BvbnNlIGJlZm9yZSBzZXR0aW5nIGZvcm0gdmFsdWVzXG4gICAgICAgICAgICAgICAgICAgIC8vIChjb250ZW50IHdpbGwgYmUgdGFrZW4gZnJvbSBBQ0UgZWRpdG9yIG9uIHNhdmUsIG1vZGUgd2lsbCBiZSBzZXQgc2VwYXJhdGVseSlcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZm9ybURhdGEgPSB7Li4ucmVzcG9uc2UuZGF0YX07XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBmb3JtRGF0YS5jb250ZW50O1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgZm9ybURhdGEubW9kZTsgIC8vIERvbid0IGxldCBmb3JtKCdzZXQgdmFsdWVzJykgaGFuZGxlIG1vZGVcblxuICAgICAgICAgICAgICAgICAgICAvLyBTZXQgZm9ybSB2YWx1ZXMgZnJvbSBBUEkgcmVzcG9uc2UgKHdpdGhvdXQgY29udGVudCBhbmQgbW9kZSlcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWVzJywgZm9ybURhdGEpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIERlY29kZSBiYXNlNjQgY29udGVudCBhbmQgc2V0IGluIGVkaXRvciB3aXRoIFVURi04IHN1cHBvcnRcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJhc2U2NENvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlY29kZWRDb250ZW50ID0gY3VzdG9tRmlsZS5iYXNlNjRUb1V0ZjgoYmFzZTY0Q29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXRWYWx1ZShkZWNvZGVkQ29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5jbGVhclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IG1vZGUgYW5kIHRyaWdnZXIgVUkgdXBkYXRlIChtb2RlIGFscmVhZHkgZXh0cmFjdGVkIGFib3ZlKVxuICAgICAgICAgICAgICAgICAgICBpZiAobW9kZSA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBleGlzdGluZyBjdXN0b20gZmlsZXMgLSBmaWxlcGF0aCBpcyByZWFkLW9ubHlcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGZpbGVwYXRoSW5wdXQucHJvcCgncmVhZG9ubHknLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGZpbGVwYXRoRmllbGQuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNldCBtb2RlIHRvICdjdXN0b20nIHVzaW5nIGhpZGRlbiBpbnB1dFxuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5zZXRNb2RlKCdjdXN0b20nKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBvbmx5IGVkaXRvciB0YWIgZm9yIGN1c3RvbSBtb2RlXG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiR0YWJNZW51LnRhYignY2hhbmdlIHRhYicsICdlZGl0b3InKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGVkaXRvclRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRvcmlnaW5hbFRhYi5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRyZXN1bHRUYWIuaGlkZSgpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBIaWRlIG90aGVyIHRhYiBtZW51IGl0ZW1zXG4gICAgICAgICAgICAgICAgICAgICAgICAkKCcuaXRlbVtkYXRhLXRhYj1cIm9yaWdpbmFsXCJdJykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJCgnLml0ZW1bZGF0YS10YWI9XCJyZXN1bHRcIl0nKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGb3Igc3lzdGVtIGZpbGVzIC0gdXNlIHN0YW5kYXJkIGJlaGF2aW9yXG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLnNldE1vZGUobW9kZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLmNiT25DaGFuZ2VNb2RlKG1vZGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS51cGRhdGVGaWxlcGF0aEZpZWxkU3RhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElmIGxvYWRpbmcgZmFpbHMsIHJlZGlyZWN0IHRvIGluZGV4XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9Y3VzdG9tLWZpbGVzL2luZGV4YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZm9ybVxuICAgICAgICBjdXN0b21GaWxlLmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZm9yIHdoZW4gdGhlIGNvZGUgbW9kZSBjaGFuZ2VzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHNlbGVjdGVkIHZhbHVlIGZyb20gdGhlIGRyb3Bkb3duLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGhlIHNlbGVjdGVkIHRleHQgZnJvbSB0aGUgZHJvcGRvd24uXG4gICAgICovXG4gICAgY2JPbkNoYW5nZU1vZGUodmFsdWUsIHRleHQpe1xuICAgICAgICAvLyBIYW5kbGUgY29kZSB2aXNpYmlsaXR5IGFuZCBjb250ZW50IGJhc2VkIG9uIHRoZSAnbW9kZSdcbiAgICAgICAgc3dpdGNoICh2YWx1ZSkge1xuICAgICAgICAgICAgY2FzZSAnbm9uZSc6XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kdGFiTWVudS50YWIoJ2NoYW5nZSB0YWInLCdvcmlnaW5hbCcpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnb3ZlcnJpZGUnOlxuICAgICAgICAgICAgY2FzZSAnY3VzdG9tJzogIC8vIEN1c3RvbSBtb2RlIGJlaGF2ZXMgbGlrZSBvdmVycmlkZVxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHRhYk1lbnUudGFiKCdjaGFuZ2UgdGFiJywnZWRpdG9yJyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdhcHBlbmQnOlxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHRhYk1lbnUudGFiKCdjaGFuZ2UgdGFiJywnZWRpdG9yJyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdzY3JpcHQnOlxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHRhYk1lbnUudGFiKCdjaGFuZ2UgdGFiJywnZWRpdG9yJyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHRhYk1lbnUudGFiKCdjaGFuZ2UgdGFiJywnb3JpZ2luYWwnKTtcbiAgICAgICAgfVxuICAgICAgICBjdXN0b21GaWxlLmhpZGVTaG93Q29kZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFdmVudCBoYW5kbGVyIGZvciB0YWIgY2hhbmdlcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjdXJyZW50VGFiIC0gVGhlIGN1cnJlbnQgdGFiIHRoYXQgaXMgdmlzaWJsZS5cbiAgICAgKi9cbiAgICBvbkNoYW5nZVRhYihjdXJyZW50VGFiKXtcbiAgICAgICAgY29uc3QgZmlsZVBhdGggPSBjdXN0b21GaWxlLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmaWxlcGF0aCcpO1xuICAgICAgICBzd2l0Y2ggKGN1cnJlbnRUYWIpIHtcbiAgICAgICAgICAgIGNhc2UgJ3Jlc3VsdCc6XG4gICAgICAgICAgICAgICAgJCgnLnRhYltkYXRhLXRhYj1cInJlc3VsdFwiXScpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgRmlsZXNBUEkuZ2V0RmlsZUNvbnRlbnQoZmlsZVBhdGgsIGN1c3RvbUZpbGUuY2JHZXRSZXN1bHRGaWxlQ29udGVudEZyb21TZXJ2ZXIsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ29yaWdpbmFsJzpcbiAgICAgICAgICAgICAgICAkKCcudGFiW2RhdGEtdGFiPVwib3JpZ2luYWxcIl0nKS5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIEZpbGVzQVBJLmdldEZpbGVDb250ZW50KGZpbGVQYXRoLCBjdXN0b21GaWxlLmNiR2V0T3JpZ2luYWxGaWxlQ29udGVudEZyb21TZXJ2ZXIsIHRydWUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZWRpdG9yJzpcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIHRoZSB2aXNpYmlsaXR5IGFuZCBjb250ZW50IG9mIGNvZGUgYmFzZWQgb24gdGhlICdtb2RlJyBmb3JtIHZhbHVlLlxuICAgICAqIEFkanVzdHMgdGhlIEFjZSBlZGl0b3Igc2V0dGluZ3MgYWNjb3JkaW5nbHkuXG4gICAgICovXG4gICAgaGlkZVNob3dDb2RlKCkge1xuICAgICAgICAvLyBSZXRyaWV2ZSAnbW9kZScgdmFsdWUgKGZyb20gZHJvcGRvd24gb3IgaGlkZGVuIGlucHV0IGZvciBjdXN0b20gbW9kZSlcbiAgICAgICAgY29uc3QgbW9kZSA9IGN1c3RvbUZpbGUuZ2V0Q3VycmVudE1vZGUoKTtcblxuICAgICAgICAvLyBHZXQgY3VycmVudCBjb250ZW50IGZyb20gZWRpdG9yIChub3QgZnJvbSBmb3JtLCBhcyBmb3JtIGRvZXNuJ3QgaGF2ZSBpdCBhbnltb3JlKVxuICAgICAgICBsZXQgY29udGVudCA9IGN1c3RvbUZpbGUuZWRpdG9yLmdldFZhbHVlKCk7XG5cbiAgICAgICAgLy8gR2V0IHRhYiBtZW51IGl0ZW1zXG4gICAgICAgIGNvbnN0ICRvcmlnaW5hbFRhYk1lbnVJdGVtID0gJCgnLml0ZW1bZGF0YS10YWI9XCJvcmlnaW5hbFwiXScpO1xuICAgICAgICBjb25zdCAkcmVzdWx0VGFiTWVudUl0ZW0gPSAkKCcuaXRlbVtkYXRhLXRhYj1cInJlc3VsdFwiXScpO1xuXG4gICAgICAgIC8vIEhhbmRsZSBjb2RlIHZpc2liaWxpdHkgYW5kIGNvbnRlbnQgYmFzZWQgb24gdGhlICdtb2RlJ1xuICAgICAgICBzd2l0Y2ggKG1vZGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ25vbmUnOlxuICAgICAgICAgICAgICAgIC8vIElmICdtb2RlJyBpcyAnbm9uZScsIHNob3cgb25seSByZXN1bHQgY29kZSBnZW5lcmF0ZWQgYW5kIGhpZGUgZWRpdG9yIGFuZCByZXN1bHQgdmlld2VyXG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZWRpdG9yVGFiLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRvcmlnaW5hbFRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbC5uYXZpZ2F0ZUZpbGVTdGFydCgpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHJlc3VsdFRhYi5oaWRlKCk7XG4gICAgICAgICAgICAgICAgLy8gU2hvdy9oaWRlIG1lbnUgaXRlbXNcbiAgICAgICAgICAgICAgICAkb3JpZ2luYWxUYWJNZW51SXRlbS5zaG93KCk7XG4gICAgICAgICAgICAgICAgJHJlc3VsdFRhYk1lbnVJdGVtLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2FwcGVuZCc6XG4gICAgICAgICAgICAgICAgLy8gSWYgJ21vZGUnIGlzICdhcHBlbmQnLCBzaG93IGFsbCBmaWVsZHNcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRlZGl0b3JUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJG9yaWdpbmFsVGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRyZXN1bHRUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUudmlld2VyT3JpZ2luYWwubmF2aWdhdGVGaWxlRW5kKCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJSZXN1bHQubmF2aWdhdGVGaWxlRW5kKCk7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBhbGwgbWVudSBpdGVtc1xuICAgICAgICAgICAgICAgICRvcmlnaW5hbFRhYk1lbnVJdGVtLnNob3coKTtcbiAgICAgICAgICAgICAgICAkcmVzdWx0VGFiTWVudUl0ZW0uc2hvdygpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnb3ZlcnJpZGUnOlxuICAgICAgICAgICAgICAgIC8vIElmICdtb2RlJyBpcyAnb3ZlcnJpZGUnLCBzaG93IGVkaXRvciBhbmQgaGlkZSBvcmlnaW5hbCwgYnV0IHNob3cgcmVzdWx0XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZWRpdG9yVGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRvcmlnaW5hbFRhYi5oaWRlKCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kcmVzdWx0VGFiLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAvLyBTaG93L2hpZGUgbWVudSBpdGVtc1xuICAgICAgICAgICAgICAgICRvcmlnaW5hbFRhYk1lbnVJdGVtLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAkcmVzdWx0VGFiTWVudUl0ZW0uaGlkZSgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnY3VzdG9tJzpcbiAgICAgICAgICAgICAgICAvLyBGb3IgJ2N1c3RvbScgbW9kZSwgb25seSBzaG93IGVkaXRvciB0YWIgLSB1c2VyIGZ1bGx5IGNvbnRyb2xzIHRoZSBmaWxlXG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZWRpdG9yVGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRvcmlnaW5hbFRhYi5oaWRlKCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kcmVzdWx0VGFiLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAvLyBIaWRlIG90aGVyIHRhYiBtZW51IGl0ZW1zIGZvciBjdXN0b20gZmlsZXNcbiAgICAgICAgICAgICAgICAkb3JpZ2luYWxUYWJNZW51SXRlbS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgJHJlc3VsdFRhYk1lbnVJdGVtLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3NjcmlwdCc6XG4gICAgICAgICAgICAgICAgLy8gSWYgJ21vZGUnIGlzICdzY3JpcHQnLCBzaG93IGJvdGggc2VydmVyIGFuZCBjdXN0b20gY29kZSwgYXBwbHkgY3VzdG9tIHNjcmlwdCB0byB0aGUgZmlsZSBjb250ZW50IG9uIHNlcnZlclxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGVkaXRvclRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kb3JpZ2luYWxUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHJlc3VsdFRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBhbGwgbWVudSBpdGVtcyBmb3Igc2NyaXB0IG1vZGVcbiAgICAgICAgICAgICAgICAkb3JpZ2luYWxUYWJNZW51SXRlbS5zaG93KCk7XG4gICAgICAgICAgICAgICAgJHJlc3VsdFRhYk1lbnVJdGVtLnNob3coKTtcbiAgICAgICAgICAgICAgICAvLyBFZGl0b3IgLSBvbmx5IHNldCB0ZW1wbGF0ZSBpZiBjb250ZW50IGlzIGVtcHR5XG4gICAgICAgICAgICAgICAgaWYgKCFjb250ZW50IHx8IGNvbnRlbnQudHJpbSgpID09PSAnJykge1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50ID0gYCMhL2Jpbi9iYXNoIFxcblxcbmA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYGNvbmZpZ1BhdGg9XCIkMVwiICMgUGF0aCB0byB0aGUgb3JpZ2luYWwgY29uZmlnIGZpbGVcXG5cXG5gO1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGAjIEV4YW1wbGUgMTogUmVwbGFjZSBhbGwgdmFsdWVzIG1heF9jb250YWN0cyA9IDUgdG8gbWF4X2NvbnRhY3RzID0gMSBvbiBwanNpcC5jb25mXFxuYDtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgIyBzZWQgLWkgJ3MvbWF4X2NvbnRhY3RzID0gNS9tYXhfY29udGFjdHMgPSAxL2cnIFwiJGNvbmZpZ1BhdGhcIlxcblxcbmBcblxuICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGAjIEV4YW1wbGUgMjogQ2hhbmdlIHZhbHVlIG1heF9jb250YWN0cyBvbmx5IGZvciBwZWVyIHdpdGggZXh0ZW5zaW9uIDIyNiBvbiBwanNpcC5jb25mXFxuYDtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgIyBzZWQgLWkgJy9eXFxcXFsyMjZcXFxcXSQvLC9eXFxcXFsvIHMvbWF4X2NvbnRhY3RzID0gNS9tYXhfY29udGFjdHMgPSAyLycgXCIkY29uZmlnUGF0aFwiXFxuXFxuYFxuXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYCMgRXhhbXBsZSAzOiBBZGQgZW4gZXh0cmEgc3RyaW5nIGludG8gW3BsYXliYWNrLWV4aXRdIHNlY3Rpb24gYWZ0ZXIgdGhlIFwic2FtZSA9PiBuLEhhbmd1cCgpXCIgc3RyaW5nIG9uIGV4dGVuc2lvbnMuY29uZlxcbmA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYCMgc2VkIC1pICcvXlxcXFxbcGxheWJhY2stZXhpdFxcXFxdJC8sL15cXFxcWy8gcy9eXFxcXChcXFxccypzYW1lID0+IG4sSGFuZ3VwKClcXFxcKS9cXFxcMVxcXFxuXFxcXHRzYW1lID0+IG4sTm9PcChcIllvdXIgTm9PcCBjb21tZW50IGhlcmVcIikvJyBcIiRjb25maWdQYXRoXCJcXG5cXG5gO1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYCMgQXR0ZW50aW9uISBZb3Ugd2lsbCBzZWUgY2hhbmdlcyBhZnRlciB0aGUgYmFja2dyb3VuZCB3b3JrZXIgcHJvY2Vzc2VzIHRoZSBzY3JpcHQgb3IgYWZ0ZXIgcmVib290aW5nIHRoZSBzeXN0ZW0uIFxcbmA7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gT25seSBzZXQgY29udGVudCBpZiB3ZSBjcmVhdGVkIGEgdGVtcGxhdGVcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2V0VmFsdWUoY29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBhbnkgb3RoZXIgJ21vZGUnIHZhbHVlc1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbC5zZXRUaGVtZSgnYWNlL3RoZW1lL21vbm9rYWknKTtcbiAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2V0VGhlbWUoJ2FjZS90aGVtZS9tb25va2FpJyk7XG5cbiAgICAgICAgLy8gRG9uJ3Qgb3ZlcndyaXRlIGVkaXRvciBjb250ZW50IGhlcmUgLSBpdCdzIGFscmVhZHkgc2V0IGNvcnJlY3RseVxuICAgICAgICAvLyBjdXN0b21GaWxlLmVkaXRvci5zZXRWYWx1ZShjb250ZW50KTtcbiAgICAgICAgLy8gY3VzdG9tRmlsZS5lZGl0b3IuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdGhhdCBoYW5kbGVzIHRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgY29udGFpbmluZyB0aGUgZmlsZSdzIGNvbnRlbnQuXG4gICAgICogSXQgd2lsbCB1cGRhdGUgdGhlICd2aWV3ZXJPcmlnaW5hbCcgd2l0aCB0aGUgZmlsZSdzIGNvbnRlbnQgYW5kIGFkanVzdCB0aGUgY29kZSBkaXNwbGF5LlxuICAgICAqL1xuICAgIGNiR2V0T3JpZ2luYWxGaWxlQ29udGVudEZyb21TZXJ2ZXIocmVzcG9uc2UpIHtcbiAgICAgICAgY3VzdG9tRmlsZS5zaG93RmlsZUNvbnRlbnRJblZpZXdlcihyZXNwb25zZSwgY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbCwgJ29yaWdpbmFsJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgaGFuZGxlcyB0aGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGNvbnRhaW5pbmcgdGhlIGZpbGUncyBjb250ZW50LlxuICAgICAqIEl0IHdpbGwgdXBkYXRlIHRoZSAndmlld2VyUmVzdWx0JyB3aXRoIHRoZSBmaWxlJ3MgY29udGVudCBhbmQgYWRqdXN0IHRoZSBjb2RlIGRpc3BsYXkuXG4gICAgICovXG4gICAgY2JHZXRSZXN1bHRGaWxlQ29udGVudEZyb21TZXJ2ZXIocmVzcG9uc2UpIHtcbiAgICAgICAgY3VzdG9tRmlsZS5zaG93RmlsZUNvbnRlbnRJblZpZXdlcihyZXNwb25zZSwgY3VzdG9tRmlsZS52aWV3ZXJSZXN1bHQsICdyZXN1bHQnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUHV0cyB0aGUgZmlsZSBjb250ZW50IGZyb20gdGhlIHNlcnZlciByZXNwb25zZSBpbnRvIGEgcmVhZC1vbmx5IHZpZXdlci5cbiAgICAgKiBGYWlsZWQgcmVxdWVzdHMgKG5ldHdvcmsgZXJyb3JzLCA0eHgvNXh4KSBtYXkgY29tZSB3aXRob3V0IHRoZSBkYXRhIGZpZWxkOlxuICAgICAqIHRoZSBsb2FkaW5nIHN0YXRlIGlzIGNsZWFyZWQgYW55d2F5LCB0aGUgcHJldmlvdXNseSBsb2FkZWQgY29udGVudCBpcyBkcm9wcGVkIHNvIGl0IGlzIG5vdFxuICAgICAqIHRha2VuIGZvciB0aGUgY3VycmVudCBvbmUsIGFuZCB0aGUgZXJyb3IgaXMgc2hvd24gdG8gdGhlIHVzZXIuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2Ugb2JqZWN0IGZyb20gdGhlIEFQSS5cbiAgICAgKiBAcGFyYW0ge29iamVjdH0gYWNlVmlld2VyIC0gVGhlIEFDRSB2aWV3ZXIgdG8gdXBkYXRlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0YWJOYW1lIC0gVGhlIGRhdGEtdGFiIG5hbWUgb2YgdGhlIHZpZXdlcidzIHRhYi5cbiAgICAgKi9cbiAgICBzaG93RmlsZUNvbnRlbnRJblZpZXdlcihyZXNwb25zZSwgYWNlVmlld2VyLCB0YWJOYW1lKSB7XG4gICAgICAgICQoYC50YWJbZGF0YS10YWI9XCIke3RhYk5hbWV9XCJdYCkucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhICYmIHR5cGVvZiByZXNwb25zZS5kYXRhLmNvbnRlbnQgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBjb25zdCBzY3JvbGxUb3AgPSBhY2VWaWV3ZXIuc2Vzc2lvbi5nZXRTY3JvbGxUb3AoKTtcbiAgICAgICAgICAgIGFjZVZpZXdlci5zZXNzaW9uLnNldFZhbHVlKHJlc3BvbnNlLmRhdGEuY29udGVudCk7XG4gICAgICAgICAgICBhY2VWaWV3ZXIuc2Vzc2lvbi5zZXRTY3JvbGxUb3Aoc2Nyb2xsVG9wKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFjZVZpZXdlci5zZXNzaW9uLnNldFZhbHVlKCcnKTtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5tZXNzYWdlcykge1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgQWNlIGVkaXRvciBpbnN0YW5jZXMgZm9yICdlZGl0b3InIGFuZCAndmlld2Vycycgd2luZG93cy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplQWNlKCkge1xuICAgICAgICAvLyBDYWxjdWxhdGUgYWNlIGVkaXRvciBoZWlnaHQgYW5kIHJvd3MgY291bnRcbiAgICAgICAgY29uc3QgYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gNDc1O1xuICAgICAgICBjb25zdCByb3dzQ291bnQgPSBNYXRoLnJvdW5kKGFjZUhlaWdodCAvIDE2LjMpO1xuXG4gICAgICAgIC8vIFNldCBtaW5pbXVtIGhlaWdodCBmb3IgdGhlIGNvZGUgc2VjdGlvbnMgb24gd2luZG93IGxvYWRcbiAgICAgICAgJCgnLmFwcGxpY2F0aW9uLWNvZGUnKS5jc3MoJ21pbi1oZWlnaHQnLCBgJHthY2VIZWlnaHR9cHhgKTtcblxuICAgICAgICAvLyBBQ0Ugd2luZG93IGZvciB0aGUgb3JpZ2luYWwgZmlsZSBjb250ZW50LlxuICAgICAgICBjb25zdCBJbmlNb2RlID0gYWNlLnJlcXVpcmUoJ2FjZS9tb2RlL2p1bGlhJykuTW9kZTtcbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbCA9IGFjZS5lZGl0KCdjb25maWctZmlsZS1vcmlnaW5hbCcpO1xuICAgICAgICBjdXN0b21GaWxlLnZpZXdlck9yaWdpbmFsLnNlc3Npb24uc2V0TW9kZShuZXcgSW5pTW9kZSgpKTtcbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbC5zZXRUaGVtZSgnYWNlL3RoZW1lL21vbm9rYWknKTtcbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbC5zZXRPcHRpb25zKHtcbiAgICAgICAgICAgIHNob3dQcmludE1hcmdpbjogZmFsc2UsXG4gICAgICAgICAgICByZWFkT25seTogdHJ1ZSxcbiAgICAgICAgICAgIG1pbkxpbmVzOiByb3dzQ291bnRcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQUNFIHdpbmRvdyBmb3IgdGhlIHJlc3VsdGVkIGZpbGUgY29udGVudC5cbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJSZXN1bHQgPSBhY2UuZWRpdCgnY29uZmlnLWZpbGUtcmVzdWx0Jyk7XG4gICAgICAgIGN1c3RvbUZpbGUudmlld2VyUmVzdWx0LnNlc3Npb24uc2V0TW9kZShuZXcgSW5pTW9kZSgpKTtcbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJSZXN1bHQuc2V0VGhlbWUoJ2FjZS90aGVtZS9tb25va2FpJyk7XG4gICAgICAgIGN1c3RvbUZpbGUudmlld2VyUmVzdWx0LnNldE9wdGlvbnMoe1xuICAgICAgICAgICAgc2hvd1ByaW50TWFyZ2luOiBmYWxzZSxcbiAgICAgICAgICAgIHJlYWRPbmx5OiB0cnVlLFxuICAgICAgICAgICAgbWluTGluZXM6IHJvd3NDb3VudFxuICAgICAgICB9KTtcblxuXG4gICAgICAgIC8vIEFDRSB3aW5kb3cgZm9yIHRoZSB1c2VyIGVkaXRvci5cbiAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3IgPSBhY2UuZWRpdCgndXNlci1lZGl0LWNvbmZpZycpO1xuICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXNzaW9uLnNldE1vZGUobmV3IEluaU1vZGUoKSk7XG4gICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXRPcHRpb25zKHtcbiAgICAgICAgICAgIHNob3dQcmludE1hcmdpbjogZmFsc2UsXG4gICAgICAgICAgICBtaW5MaW5lczogcm93c0NvdW50LFxuICAgICAgICB9KTtcbiAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2Vzc2lvbi5vbignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgLy8gVHJpZ2dlciBjaGFuZ2UgZXZlbnQgdG8gYWNrbm93bGVkZ2UgdGhlIG1vZGlmaWNhdGlvblxuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgaGFuZGxlcnMgZm9yIGZ1bGxzY3JlZW4gbW9kZSBidXR0b25zLiBIaWRlcyB0aGUgdG9nZ2xlIG9uXG4gICAgICAgIC8vIGJyb3dzZXJzIHdpdGhvdXQgRnVsbHNjcmVlbiBBUEkgZm9yIERPTSBlbGVtZW50cyAoZS5nLiBpUGhvbmUgV2ViS2l0KS5cbiAgICAgICAgY29uc3QgJGZ1bGxzY3JlZW5CdG4gPSAkKCcuZnVsbHNjcmVlbi10b2dnbGUtYnRuJyk7XG4gICAgICAgIGNvbnN0IHNhbXBsZUNvbnRhaW5lciA9ICRmdWxsc2NyZWVuQnRuLmZpcnN0KCkuc2libGluZ3MoJy5hcHBsaWNhdGlvbi1jb2RlJylbMF07XG4gICAgICAgIGlmIChGdWxsc2NyZWVuVG9nZ2xlLmlzU3VwcG9ydGVkKHNhbXBsZUNvbnRhaW5lcikpIHtcbiAgICAgICAgICAgICRmdWxsc2NyZWVuQnRuLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb250YWluZXIgPSAkKHRoaXMpLnNpYmxpbmdzKCcuYXBwbGljYXRpb24tY29kZScpWzBdO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUudG9nZ2xlRnVsbFNjcmVlbihjb250YWluZXIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBGdWxsc2NyZWVuVG9nZ2xlLm9uQ2hhbmdlKGN1c3RvbUZpbGUuYWRqdXN0RWRpdG9ySGVpZ2h0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRmdWxsc2NyZWVuQnRuLmhpZGUoKTtcbiAgICAgICAgfVxuXG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBFbmFibGUvZGlzYWJsZSBmdWxsc2NyZWVuIG1vZGUgZm9yIGEgc3BlY2lmaWMgYmxvY2sgdmlhIEZ1bGxzY3JlZW5Ub2dnbGUgaGVscGVyLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gY29udGFpbmVyIC0gVGhlIGNvbnRhaW5lciB0byBleHBhbmQgdG8gZnVsbHNjcmVlbi5cbiAgICAgKi9cbiAgICB0b2dnbGVGdWxsU2NyZWVuKGNvbnRhaW5lcikge1xuICAgICAgICBGdWxsc2NyZWVuVG9nZ2xlLnRvZ2dsZShjb250YWluZXIpLmNhdGNoKGVyciA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBFcnJvciBhdHRlbXB0aW5nIHRvIHRvZ2dsZSBmdWxsLXNjcmVlbiBtb2RlOiAke2Vyci5tZXNzYWdlfWApO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVjYWxjdWxhdGUgZWRpdG9yIGhlaWdodHMgd2hlbiB0aGUgc2NyZWVuIG1vZGUgY2hhbmdlcy5cbiAgICAgKi9cbiAgICBhZGp1c3RFZGl0b3JIZWlnaHQoKSB7XG4gICAgICAgIGNvbnN0IGVkaXRvcnMgPSBbY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbCwgY3VzdG9tRmlsZS52aWV3ZXJSZXN1bHQsIGN1c3RvbUZpbGUuZWRpdG9yXTtcbiAgICAgICAgZWRpdG9ycy5mb3JFYWNoKGVkaXRvciA9PiB7XG4gICAgICAgICAgICBpZiAoZWRpdG9yKSB7XG4gICAgICAgICAgICAgICAgZWRpdG9yLnJlc2l6ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG5cbiAgICAgICAgLy8gSU1QT1JUQU5UOiBHZXQgbW9kZSBCRUZPUkUgZm9ybSgnZ2V0IHZhbHVlcycpIHRvIHByZXZlbnQgZHJvcGRvd24gZnJvbSBvdmVycmlkaW5nIGl0XG4gICAgICAgIGNvbnN0IG1vZGUgPSBjdXN0b21GaWxlLmdldEN1cnJlbnRNb2RlKCk7XG5cbiAgICAgICAgLy8gR2V0IGFsbCBmb3JtIHZhbHVlc1xuICAgICAgICByZXN1bHQuZGF0YSA9IGN1c3RvbUZpbGUuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXG4gICAgICAgIC8vIE92ZXJyaWRlIG1vZGUgd2l0aCB0aGUgY29ycmVjdCB2YWx1ZSAoZnJvbSBnZXRDdXJyZW50TW9kZSlcbiAgICAgICAgcmVzdWx0LmRhdGEubW9kZSA9IG1vZGU7XG5cbiAgICAgICAgLy8gUmVtb3ZlIHRlY2huaWNhbCBmaWVsZCBmcm9tIGRhdGFcbiAgICAgICAgZGVsZXRlIHJlc3VsdC5kYXRhWydtb2RlLWN1c3RvbS12YWx1ZSddO1xuXG4gICAgICAgIC8vIEdldCBjb250ZW50IGZyb20gQWNlIGVkaXRvciBiYXNlZCBvbiBtb2RlXG4gICAgICAgIHN3aXRjaCAobW9kZSkge1xuICAgICAgICAgICAgY2FzZSAnYXBwZW5kJzpcbiAgICAgICAgICAgIGNhc2UgJ292ZXJyaWRlJzpcbiAgICAgICAgICAgIGNhc2UgJ2N1c3RvbSc6XG4gICAgICAgICAgICBjYXNlICdzY3JpcHQnOlxuICAgICAgICAgICAgICAgIC8vIEdldCBjb250ZW50IGZyb20gQWNlIGVkaXRvciAobm90IGJhc2U2NCBlbmNvZGVkIHlldClcbiAgICAgICAgICAgICAgICBpZiAoIWN1c3RvbUZpbGUuZWRpdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0VkaXRvciBpcyBub3QgaW5pdGlhbGl6ZWQhJyk7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhLmNvbnRlbnQgPSAnJztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBlZGl0b3JDb250ZW50ID0gY3VzdG9tRmlsZS5lZGl0b3IuZ2V0VmFsdWUoKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmRhdGEuY29udGVudCA9IGVkaXRvckNvbnRlbnQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnbm9uZSc6XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIC8vIEZvciAnbm9uZScgbW9kZSwgY2xlYXIgdGhlIGNvbnRlbnRcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YS5jb250ZW50ID0gJyc7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcblxuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gY3VzdG9tRmlsZS4kZm9ybU9iajtcblxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUEkgc2V0dGluZ3MgZm9yIEZvcm1cbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBhcGlPYmplY3Q6IGN1c3RvbUZpbGVzQVBJLFxuICAgICAgICAgICAgc2F2ZU1ldGhvZDogJ3NhdmUnLCAgLy8gV2lsbCB1c2UgdGhlIHNtYXJ0IHNhdmUgbWV0aG9kIHRoYXQgZGV0ZXJtaW5lcyBjcmVhdGUvdXBkYXRlXG4gICAgICAgICAgICBhdXRvRGV0ZWN0TWV0aG9kOiBmYWxzZSwgIC8vIFdlIGhhbmRsZSB0aGlzIGluIG91ciBzYXZlIG1ldGhvZFxuICAgICAgICAgICAgaWRGaWVsZDogJ2lkJ1xuICAgICAgICB9O1xuXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGN1c3RvbUZpbGUudmFsaWRhdGVSdWxlczsgLy8gRm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGN1c3RvbUZpbGUuY2JCZWZvcmVTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYmVmb3JlIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGN1c3RvbUZpbGUuY2JBZnRlclNlbmRGb3JtOyAvLyBDYWxsYmFjayBhZnRlciBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcbn07XG5cbi8vIEluaXRpYWxpemUgdGhlIGN1c3RvbSBmaWxlcyBtb2RpZnkgZm9ybSB3aGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeS5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBjdXN0b21GaWxlLmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=