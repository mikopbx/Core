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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DdXN0b21GaWxlcy9jdXN0b20tZmlsZXMtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbImN1c3RvbUZpbGUiLCIkZm9ybU9iaiIsIiR0YWJNZW51IiwiJG1vZGVEcm9wRG93biIsIiRtb2RlQ3VzdG9tSW5wdXQiLCIkb3JpZ2luYWxUYWIiLCIkZWRpdG9yVGFiIiwiJHJlc3VsdFRhYiIsIiRtYWluQ29udGFpbmVyIiwiJGZpbGVwYXRoSW5wdXQiLCIkZmlsZXBhdGhGaWVsZCIsImVkaXRvciIsInZpZXdlck9yaWdpbmFsIiwidmlld2VyUmVzdWx0IiwidmFsaWRhdGVSdWxlcyIsIm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiY2ZfVmFsaWRhdGVOYW1lSXNFbXB0eSIsImJhc2U2NFRvVXRmOCIsImJhc2U2NFN0ciIsImJpbmFyeVN0cmluZyIsImF0b2IiLCJUZXh0RGVjb2RlciIsImJ5dGVzIiwiVWludDhBcnJheSIsImxlbmd0aCIsImkiLCJjaGFyQ29kZUF0IiwiZGVjb2RlIiwiZGVjb2RlVVJJQ29tcG9uZW50IiwiZXNjYXBlIiwiZSIsImNvbnNvbGUiLCJlcnJvciIsImdldEN1cnJlbnRNb2RlIiwiY3VzdG9tTW9kZVZhbHVlIiwidmFsIiwiZm9ybSIsInNldE1vZGUiLCJtb2RlIiwicGFyZW50IiwiaGlkZSIsImRyb3Bkb3duIiwic2hvdyIsInVwZGF0ZUZpbGVwYXRoRmllbGRTdGF0ZSIsImlzVXNlckNyZWF0ZWQiLCJmaWxlSWQiLCJwcm9wIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsImluaXRpYWxpemUiLCIkIiwidGFiIiwib25WaXNpYmxlIiwib25DaGFuZ2VUYWIiLCJpbml0aWFsaXplQWNlIiwib25DaGFuZ2UiLCJjYk9uQ2hhbmdlTW9kZSIsInVybFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsIndpbmRvdyIsImxvY2F0aW9uIiwic2VhcmNoIiwidXJsSWQiLCJwYXRobmFtZSIsIm1hdGNoIiwiY3VzdG9tRmlsZXNBUEkiLCJnZXRSZWNvcmQiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJmb3JtRGF0YSIsImNvbnRlbnQiLCJkZWNvZGVkQ29udGVudCIsInNldFZhbHVlIiwiY2xlYXJTZWxlY3Rpb24iLCJiYXNlNjRDb250ZW50IiwiZ2xvYmFsUm9vdFVybCIsImluaXRpYWxpemVGb3JtIiwidmFsdWUiLCJ0ZXh0IiwiaGlkZVNob3dDb2RlIiwiY3VycmVudFRhYiIsImZpbGVQYXRoIiwiRmlsZXNBUEkiLCJnZXRGaWxlQ29udGVudCIsImNiR2V0UmVzdWx0RmlsZUNvbnRlbnRGcm9tU2VydmVyIiwiY2JHZXRPcmlnaW5hbEZpbGVDb250ZW50RnJvbVNlcnZlciIsImdldFZhbHVlIiwiJG9yaWdpbmFsVGFiTWVudUl0ZW0iLCIkcmVzdWx0VGFiTWVudUl0ZW0iLCJuYXZpZ2F0ZUZpbGVTdGFydCIsIm5hdmlnYXRlRmlsZUVuZCIsInRyaW0iLCJzZXRUaGVtZSIsInVuZGVmaW5lZCIsImFjZVZpZXdlciIsInNjcm9sbFRvcCIsInNlc3Npb24iLCJnZXRTY3JvbGxUb3AiLCJzZXRTY3JvbGxUb3AiLCJhY2VIZWlnaHQiLCJpbm5lckhlaWdodCIsInJvd3NDb3VudCIsIk1hdGgiLCJyb3VuZCIsImNzcyIsIkluaU1vZGUiLCJhY2UiLCJyZXF1aXJlIiwiTW9kZSIsImVkaXQiLCJzZXRPcHRpb25zIiwic2hvd1ByaW50TWFyZ2luIiwicmVhZE9ubHkiLCJtaW5MaW5lcyIsIm9uIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwiJGZ1bGxzY3JlZW5CdG4iLCJzYW1wbGVDb250YWluZXIiLCJmaXJzdCIsInNpYmxpbmdzIiwiRnVsbHNjcmVlblRvZ2dsZSIsImlzU3VwcG9ydGVkIiwiY29udGFpbmVyIiwidG9nZ2xlRnVsbFNjcmVlbiIsImFkanVzdEVkaXRvckhlaWdodCIsInRvZ2dsZSIsImVyciIsIm1lc3NhZ2UiLCJlZGl0b3JzIiwiZm9yRWFjaCIsInJlc2l6ZSIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsImVkaXRvckNvbnRlbnQiLCJjYkFmdGVyU2VuZEZvcm0iLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiYXV0b0RldGVjdE1ldGhvZCIsImlkRmllbGQiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFVBQVUsR0FBRztBQUVmO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFLElBUEs7O0FBU2Y7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFLElBYks7O0FBZWY7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFLElBbkJBOztBQXFCZjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxnQkFBZ0IsRUFBRSxJQXpCSDs7QUEyQmY7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsWUFBWSxFQUFFLElBL0JDOztBQWlDZjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxVQUFVLEVBQUUsSUFyQ0c7O0FBdUNmO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFVBQVUsRUFBRSxJQTNDRzs7QUE2Q2Y7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsY0FBYyxFQUFFLElBakREOztBQW1EZjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxjQUFjLEVBQUUsSUF2REQ7O0FBeURmO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGNBQWMsRUFBRSxJQTdERDs7QUFnRWY7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsTUFBTSxFQUFFLEVBcEVPO0FBcUVmQyxFQUFBQSxjQUFjLEVBQUUsRUFy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LDJCQWlvQkNyRSxRQWpvQkQsRUFpb0JXLENBRXpCLENBbm9CYzs7QUFvb0JmO0FBQ0o7QUFDQTtBQUNJVSxFQUFBQSxjQXZvQmUsNEJBdW9CRTtBQUNidUMsSUFBQUEsSUFBSSxDQUFDeEgsUUFBTCxHQUFnQkQsVUFBVSxDQUFDQyxRQUEzQixDQURhLENBR2I7O0FBQ0F3SCxJQUFBQSxJQUFJLENBQUNxQixXQUFMLEdBQW1CO0FBQ2ZDLE1BQUFBLE9BQU8sRUFBRSxJQURNO0FBRWZDLE1BQUFBLFNBQVMsRUFBRTFFLGNBRkk7QUFHZjJFLE1BQUFBLFVBQVUsRUFBRSxNQUhHO0FBR007QUFDckJDLE1BQUFBLGdCQUFnQixFQUFFLEtBSkg7QUFJVztBQUMxQkMsTUFBQUEsT0FBTyxFQUFFO0FBTE0sS0FBbkI7QUFRQTFCLElBQUFBLElBQUksQ0FBQzNHLGFBQUwsR0FBcUJkLFVBQVUsQ0FBQ2MsYUFBaEMsQ0FaYSxDQVlrQzs7QUFDL0MyRyxJQUFBQSxJQUFJLENBQUNpQixnQkFBTCxHQUF3QjFJLFVBQVUsQ0FBQzBJLGdCQUFuQyxDQWJhLENBYXdDOztBQUNyRGpCLElBQUFBLElBQUksQ0FBQ29CLGVBQUwsR0FBdUI3SSxVQUFVLENBQUM2SSxlQUFsQyxDQWRhLENBY3NDOztBQUNuRHBCLElBQUFBLElBQUksQ0FBQ25FLFVBQUw7QUFDSDtBQXZwQmMsQ0FBbkIsQyxDQTBwQkE7O0FBQ0FDLENBQUMsQ0FBQzZGLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJySixFQUFBQSxVQUFVLENBQUNzRCxVQUFYO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLGdsb2JhbFRyYW5zbGF0ZSwgYWNlLCBGb3JtLCBGaWxlc0FQSSwgY3VzdG9tRmlsZXNBUEksIFBieEFwaUNsaWVudCAqL1xuXG5cbi8qKlxuICogTW9kdWxlIGN1c3RvbUZpbGVcbiAqIFRoaXMgbW9kdWxlIG1hbmFnZXMgZmlsZSBpbnRlcmFjdGlvbnMgaW4gYSBVSSwgc3VjaCBhcyBsb2FkaW5nIGZpbGUgY29udGVudCBmcm9tIGEgc2VydmVyIGFuZCBoYW5kbGluZyB1c2VyIGlucHV0LlxuICogQG1vZHVsZSBjdXN0b21GaWxlXG4gKi9cbmNvbnN0IGN1c3RvbUZpbGUgPSB7XG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBSZXNvbHZlZCBpbiBpbml0aWFsaXplKCkg4oCUIG11c3Qgbm90IGNhbGwgJCgpIGF0IG1vZHVsZS1sb2FkIHRpbWUuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB0YWIgbWVudS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR0YWJNZW51OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIG1vZGUgc2VsZWN0LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG1vZGVEcm9wRG93bjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBoaWRkZW4gY3VzdG9tIG1vZGUgaW5wdXQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbW9kZUN1c3RvbUlucHV0OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHRhYiB3aXRoIG9yaWdpbmFsIGZpbGUgY29udGVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRvcmlnaW5hbFRhYjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB0YWIgd2l0aCB1c2VyIGNvbnRlbnQvc2NyaXB0IGVkaXRvci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRlZGl0b3JUYWI6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdGFiIHdpdGggcmVzdWx0ZWQgZmlsZSBjb250ZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHJlc3VsdFRhYjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBlbGVtZW50IGZvciB0aGUgbWFpbiBjb250ZW50IGNvbnRhaW5lci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRtYWluQ29udGFpbmVyOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZpbGVwYXRoIGlucHV0IGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZpbGVwYXRoSW5wdXQ6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZmlsZXBhdGggZmllbGQgY29udGFpbmVyLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZpbGVwYXRoRmllbGQ6IG51bGwsXG5cblxuICAgIC8qKlxuICAgICAqIEFjZSBlZGl0b3IgaW5zdGFuY2VzXG4gICAgICogYGVkaXRvcmAgaXMgZm9yIGlucHV0IGFuZCBgdmlld2Vyc2AgaXMgZm9yIGRpc3BsYXkgY29kZSBmcm9tIHNlcnZlclxuICAgICAqL1xuICAgIGVkaXRvcjogJycsXG4gICAgdmlld2VyT3JpZ2luYWw6ICcnLFxuICAgIHZpZXdlclJlc3VsdDogJycsXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgbmFtZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2ZpbGVwYXRoJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5jZl9WYWxpZGF0ZU5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEZWNvZGUgYmFzZTY0IHN0cmluZyB0byBVVEYtOFxuICAgICAqIEhhbmRsZXMgVW5pY29kZSBjaGFyYWN0ZXJzIChSdXNzaWFuLCBDaGluZXNlLCBldGMuKVxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGJhc2U2NFN0ciAtIEJhc2U2NCBlbmNvZGVkIHN0cmluZ1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFVURi04IGRlY29kZWQgc3RyaW5nXG4gICAgICovXG4gICAgYmFzZTY0VG9VdGY4KGJhc2U2NFN0cikge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgLy8gRGVjb2RlIGJhc2U2NCB0byBiaW5hcnkgc3RyaW5nXG4gICAgICAgICAgICBjb25zdCBiaW5hcnlTdHJpbmcgPSBhdG9iKGJhc2U2NFN0cik7XG5cbiAgICAgICAgICAgIC8vIFVzZSBUZXh0RGVjb2RlciBmb3IgbW9kZXJuIGJyb3dzZXJzXG4gICAgICAgICAgICBpZiAodHlwZW9mIFRleHREZWNvZGVyICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgIGNvbnN0IGJ5dGVzID0gbmV3IFVpbnQ4QXJyYXkoYmluYXJ5U3RyaW5nLmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBiaW5hcnlTdHJpbmcubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgYnl0ZXNbaV0gPSBiaW5hcnlTdHJpbmcuY2hhckNvZGVBdChpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBUZXh0RGVjb2RlcigpLmRlY29kZShieXRlcyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIGZvciBvbGRlciBicm93c2Vyc1xuICAgICAgICAgICAgICAgIHJldHVybiBkZWNvZGVVUklDb21wb25lbnQoZXNjYXBlKGJpbmFyeVN0cmluZykpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBkZWNvZGUgYmFzZTY0OicsIGUpO1xuICAgICAgICAgICAgcmV0dXJuIGJhc2U2NFN0cjsgLy8gUmV0dXJuIGFzLWlzIGlmIGRlY29kZSBmYWlsc1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBjdXJyZW50IG1vZGUgdmFsdWUgKGZyb20gZHJvcGRvd24gb3IgaGlkZGVuIGlucHV0IGZvciBjdXN0b20gbW9kZSlcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBDdXJyZW50IG1vZGUgdmFsdWVcbiAgICAgKi9cbiAgICBnZXRDdXJyZW50TW9kZSgpIHtcbiAgICAgICAgLy8gQ2hlY2sgaWYgY3VzdG9tIG1vZGUgaXMgYWN0aXZlIChoaWRkZW4gaW5wdXQgaGFzIHZhbHVlKVxuICAgICAgICBjb25zdCBjdXN0b21Nb2RlVmFsdWUgPSBjdXN0b21GaWxlLiRtb2RlQ3VzdG9tSW5wdXQudmFsKCk7XG4gICAgICAgIGlmIChjdXN0b21Nb2RlVmFsdWUgPT09ICdjdXN0b20nKSB7XG4gICAgICAgICAgICByZXR1cm4gJ2N1c3RvbSc7XG4gICAgICAgIH1cbiAgICAgICAgLy8gT3RoZXJ3aXNlIHJldHVybiBkcm9wZG93biB2YWx1ZVxuICAgICAgICByZXR1cm4gY3VzdG9tRmlsZS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnbW9kZScpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTZXQgbW9kZSB2YWx1ZSAodXNpbmcgZHJvcGRvd24gZm9yIHN0YW5kYXJkIG1vZGVzLCBoaWRkZW4gaW5wdXQgZm9yIGN1c3RvbSBtb2RlKVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBtb2RlIC0gTW9kZSB0byBzZXRcbiAgICAgKi9cbiAgICBzZXRNb2RlKG1vZGUpIHtcbiAgICAgICAgaWYgKG1vZGUgPT09ICdjdXN0b20nKSB7XG4gICAgICAgICAgICAvLyBTZXQgY3VzdG9tIG1vZGUgdmlhIGhpZGRlbiBpbnB1dFxuICAgICAgICAgICAgY3VzdG9tRmlsZS4kbW9kZUN1c3RvbUlucHV0LnZhbCgnY3VzdG9tJyk7XG4gICAgICAgICAgICAvLyBIaWRlIGRyb3Bkb3duIGZvciBjdXN0b20gZmlsZXNcbiAgICAgICAgICAgIGN1c3RvbUZpbGUuJG1vZGVEcm9wRG93bi5wYXJlbnQoKS5wYXJlbnQoKS5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBDbGVhciBjdXN0b20gbW9kZVxuICAgICAgICAgICAgY3VzdG9tRmlsZS4kbW9kZUN1c3RvbUlucHV0LnZhbCgnJyk7XG4gICAgICAgICAgICAvLyBTZXQgc3RhbmRhcmQgbW9kZSB2aWEgZHJvcGRvd25cbiAgICAgICAgICAgIGN1c3RvbUZpbGUuJG1vZGVEcm9wRG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgbW9kZSk7XG4gICAgICAgICAgICAvLyBTaG93IGRyb3Bkb3duXG4gICAgICAgICAgICBjdXN0b21GaWxlLiRtb2RlRHJvcERvd24ucGFyZW50KCkucGFyZW50KCkuc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhlIGZpbGVwYXRoIGZpZWxkIHN0YXRlIGJhc2VkIG9uIHdoZXRoZXIgdGhlIGZpbGUgaXMgdXNlci1jcmVhdGVkIChNT0RFX0NVU1RPTSkgb3Igc3lzdGVtLW1hbmFnZWQuXG4gICAgICogVXNlci1jcmVhdGVkIGZpbGVzIGhhdmUgZWRpdGFibGUgZmlsZXBhdGggYnV0IGNhbm5vdCBiZSBjcmVhdGVkIChvbmx5IGZvciBuZXcgZmlsZXMpLFxuICAgICAqIHN5c3RlbS1tYW5hZ2VkIGZpbGVzIGhhdmUgcmVhZC1vbmx5IGZpbGVwYXRoLlxuICAgICAqL1xuICAgIHVwZGF0ZUZpbGVwYXRoRmllbGRTdGF0ZSgpIHtcbiAgICAgICAgY29uc3QgbW9kZSA9IGN1c3RvbUZpbGUuZ2V0Q3VycmVudE1vZGUoKTtcbiAgICAgICAgY29uc3QgaXNVc2VyQ3JlYXRlZCA9IG1vZGUgPT09ICdjdXN0b20nO1xuICAgICAgICBjb25zdCBmaWxlSWQgPSBjdXN0b21GaWxlLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdpZCcpO1xuXG4gICAgICAgIGlmIChpc1VzZXJDcmVhdGVkKSB7XG4gICAgICAgICAgICBpZiAoIWZpbGVJZCB8fCBmaWxlSWQgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgLy8gTmV3IGN1c3RvbSBmaWxlIC0gZmlsZXBhdGggaXMgZWRpdGFibGVcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRmaWxlcGF0aElucHV0LnByb3AoJ3JlYWRvbmx5JywgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGZpbGVwYXRoRmllbGQucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEV4aXN0aW5nIGN1c3RvbSBmaWxlIC0gZmlsZXBhdGggaXMgcmVhZC1vbmx5IChjYW5ub3QgYmUgY2hhbmdlZCBhZnRlciBjcmVhdGlvbilcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRmaWxlcGF0aElucHV0LnByb3AoJ3JlYWRvbmx5JywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZmlsZXBhdGhGaWVsZC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEFsd2F5cyBoaWRlIG1vZGUgc2VsZWN0b3IgZm9yIGN1c3RvbSBmaWxlc1xuICAgICAgICAgICAgY3VzdG9tRmlsZS4kbW9kZURyb3BEb3duLnBhcmVudCgpLnBhcmVudCgpLmhpZGUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFN5c3RlbS1tYW5hZ2VkIGZpbGUgLSBmaWxlcGF0aCBpcyBhbHdheXMgcmVhZC1vbmx5XG4gICAgICAgICAgICBjdXN0b21GaWxlLiRmaWxlcGF0aElucHV0LnByb3AoJ3JlYWRvbmx5JywgdHJ1ZSk7XG4gICAgICAgICAgICBjdXN0b21GaWxlLiRmaWxlcGF0aEZpZWxkLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgLy8gU2hvdyBtb2RlIHNlbGVjdG9yIGZvciBzeXN0ZW0gZmlsZXNcbiAgICAgICAgICAgIGN1c3RvbUZpbGUuJG1vZGVEcm9wRG93bi5wYXJlbnQoKS5wYXJlbnQoKS5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGN1c3RvbUZpbGUgbW9kdWxlLlxuICAgICAqIFNldHMgdXAgdGhlIGRyb3Bkb3duLCBpbml0aWFsaXplcyBBY2UgZWRpdG9yLCBmb3JtLCBhbmQgcmV0cmlldmVzIGZpbGUgY29udGVudCBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBqUXVlcnkgb2JqZWN0cyBhZnRlciBET00gaXMgcmVhZHlcbiAgICAgICAgY3VzdG9tRmlsZS4kZm9ybU9iaiA9ICQoJyNjdXN0b20tZmlsZS1mb3JtJyk7XG4gICAgICAgIGN1c3RvbUZpbGUuJHRhYk1lbnUgPSAkKCcjY3VzdG9tLWZpbGVzLW1lbnUgLml0ZW0nKTtcbiAgICAgICAgY3VzdG9tRmlsZS4kb3JpZ2luYWxUYWIgPSAkKCdhW2RhdGEtdGFiPVwib3JpZ2luYWxcIl0nKTtcbiAgICAgICAgY3VzdG9tRmlsZS4kZWRpdG9yVGFiID0gJCgnYVtkYXRhLXRhYj1cImVkaXRvclwiXScpO1xuICAgICAgICBjdXN0b21GaWxlLiRyZXN1bHRUYWIgPSAkKCdhW2RhdGEtdGFiPVwicmVzdWx0XCJdJyk7XG4gICAgICAgIGN1c3RvbUZpbGUuJG1haW5Db250YWluZXIgPSAkKCcjbWFpbi1jb250ZW50LWNvbnRhaW5lcicpO1xuICAgICAgICBjdXN0b21GaWxlLiRmaWxlcGF0aElucHV0ID0gJCgnI2ZpbGVwYXRoJyk7XG4gICAgICAgIGN1c3RvbUZpbGUuJGZpbGVwYXRoRmllbGQgPSAkKCcjZmlsZXBhdGgtZmllbGQnKTtcbiAgICAgICAgY3VzdG9tRmlsZS4kbW9kZURyb3BEb3duID0gJCgnI21vZGUtZHJvcGRvd24nKTtcbiAgICAgICAgY3VzdG9tRmlsZS4kbW9kZUN1c3RvbUlucHV0ID0gJCgnI21vZGUtY3VzdG9tLXZhbHVlJyk7XG5cbiAgICAgICAgLy8gRW5hYmxlIHRhYiBuYXZpZ2F0aW9uIHdpdGggaGlzdG9yeSBzdXBwb3J0XG4gICAgICAgIGN1c3RvbUZpbGUuJHRhYk1lbnUudGFiKHtcbiAgICAgICAgICAgIG9uVmlzaWJsZTogY3VzdG9tRmlsZS5vbkNoYW5nZVRhYlxuICAgICAgICB9KTtcblxuICAgICAgICBjdXN0b21GaWxlLiRtYWluQ29udGFpbmVyLnJlbW92ZUNsYXNzKCdjb250YWluZXInKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIEFjZSBlZGl0b3JcbiAgICAgICAgY3VzdG9tRmlsZS5pbml0aWFsaXplQWNlKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBvciByZWluaXRpYWxpemUgZHJvcGRvd25cbiAgICAgICAgaWYgKGN1c3RvbUZpbGUuJG1vZGVEcm9wRG93bi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjdXN0b21GaWxlLiRtb2RlRHJvcERvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiBjdXN0b21GaWxlLmNiT25DaGFuZ2VNb2RlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEdldCBmaWxlIElEIGZyb20gVVJMIG9yIGZvcm1cbiAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICAgICAgY29uc3QgdXJsSWQgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUubWF0Y2goL21vZGlmeVxcLyhcXGQrKS8pO1xuICAgICAgICBjb25zdCBmaWxlSWQgPSB1cmxJZCA/IHVybElkWzFdIDogY3VzdG9tRmlsZS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnaWQnKTtcblxuICAgICAgICBpZiAoIWZpbGVJZCB8fCBmaWxlSWQgPT09ICcnKSB7XG4gICAgICAgICAgICAvLyBMb2FkIGRlZmF1bHQgdmFsdWVzIGZvciBuZXcgY3VzdG9tIGZpbGVcbiAgICAgICAgICAgIGN1c3RvbUZpbGVzQVBJLmdldFJlY29yZCgnbmV3JywgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFN0b3JlIG1vZGUgc2VwYXJhdGVseSB0byBoYW5kbGUgaXQgY29ycmVjdGx5XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vZGUgPSByZXNwb25zZS5kYXRhLm1vZGUgfHwgJ25vbmUnO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBtb2RlIGZyb20gcmVzcG9uc2UgYmVmb3JlIHNldHRpbmcgZm9ybSB2YWx1ZXNcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZm9ybURhdGEgPSB7Li4ucmVzcG9uc2UuZGF0YX07XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBmb3JtRGF0YS5tb2RlOyAgLy8gRG9uJ3QgbGV0IGZvcm0oJ3NldCB2YWx1ZXMnKSBoYW5kbGUgbW9kZVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCBkZWZhdWx0IHZhbHVlcyB0byBmb3JtIGZpZWxkcyAod2l0aG91dCBtb2RlKVxuICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZXMnLCBmb3JtRGF0YSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRm9yIG5ldyBmaWxlcyB3aXRoIE1PREVfQ1VTVE9NXG4gICAgICAgICAgICAgICAgICAgIGlmIChtb2RlID09PSAnY3VzdG9tJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gTWFrZSBmaWxlcGF0aCBlZGl0YWJsZSBmb3IgbmV3IGN1c3RvbSBmaWxlc1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZmlsZXBhdGhJbnB1dC5wcm9wKCdyZWFkb25seScsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGZpbGVwYXRoRmllbGQucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNldCBtb2RlIHRvICdjdXN0b20nIHVzaW5nIGhpZGRlbiBpbnB1dFxuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5zZXRNb2RlKCdjdXN0b20nKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBvbmx5IGVkaXRvciB0YWIgZm9yIGN1c3RvbSBtb2RlXG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiR0YWJNZW51LnRhYignY2hhbmdlIHRhYicsICdlZGl0b3InKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGVkaXRvclRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRvcmlnaW5hbFRhYi5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRyZXN1bHRUYWIuaGlkZSgpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBIaWRlIG90aGVyIHRhYiBtZW51IGl0ZW1zXG4gICAgICAgICAgICAgICAgICAgICAgICAkKCcuaXRlbVtkYXRhLXRhYj1cIm9yaWdpbmFsXCJdJykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJCgnLml0ZW1bZGF0YS10YWI9XCJyZXN1bHRcIl0nKS5oaWRlKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZW1wdHkgY29udGVudCBpbiBlZGl0b3IgZm9yIG5ldyBjdXN0b20gZmlsZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmNvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBJZiBkZWZhdWx0IGNvbnRlbnQgcHJvdmlkZWQgKGJhc2U2NCksIGRlY29kZSBpdCB3aXRoIFVURi04IHN1cHBvcnRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkZWNvZGVkQ29udGVudCA9IGN1c3RvbUZpbGUuYmFzZTY0VG9VdGY4KHJlc3BvbnNlLmRhdGEuY29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2V0VmFsdWUoZGVjb2RlZENvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTZXQgZW1wdHkgY29udGVudCBmb3IgbmV3IGN1c3RvbSBmaWxlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2V0VmFsdWUoJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3IuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBvdGhlciBtb2RlcywgdXNlIHN0YW5kYXJkIGJlaGF2aW9yIChtb2RlIGFscmVhZHkgZXh0cmFjdGVkIGFib3ZlKVxuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5zZXRNb2RlKG1vZGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5jYk9uQ2hhbmdlTW9kZShtb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUudXBkYXRlRmlsZXBhdGhGaWVsZFN0YXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIExvYWQgZXhpc3RpbmcgZmlsZSBkYXRhIHZpYSBSRVNUIEFQSVxuICAgICAgICAgICAgY3VzdG9tRmlsZXNBUEkuZ2V0UmVjb3JkKGZpbGVJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFN0b3JlIGJhc2U2NCBjb250ZW50IHNlcGFyYXRlbHkgYW5kIHJlbW92ZSBmcm9tIGZvcm0gZGF0YVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBiYXNlNjRDb250ZW50ID0gcmVzcG9uc2UuZGF0YS5jb250ZW50O1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFN0b3JlIG1vZGUgc2VwYXJhdGVseSB0byBoYW5kbGUgaXQgY29ycmVjdGx5XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vZGUgPSByZXNwb25zZS5kYXRhLm1vZGUgfHwgJ25vbmUnO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBjb250ZW50IGFuZCBtb2RlIGZyb20gcmVzcG9uc2UgYmVmb3JlIHNldHRpbmcgZm9ybSB2YWx1ZXNcbiAgICAgICAgICAgICAgICAgICAgLy8gKGNvbnRlbnQgd2lsbCBiZSB0YWtlbiBmcm9tIEFDRSBlZGl0b3Igb24gc2F2ZSwgbW9kZSB3aWxsIGJlIHNldCBzZXBhcmF0ZWx5KVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBmb3JtRGF0YSA9IHsuLi5yZXNwb25zZS5kYXRhfTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGZvcm1EYXRhLmNvbnRlbnQ7XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBmb3JtRGF0YS5tb2RlOyAgLy8gRG9uJ3QgbGV0IGZvcm0oJ3NldCB2YWx1ZXMnKSBoYW5kbGUgbW9kZVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCBmb3JtIHZhbHVlcyBmcm9tIEFQSSByZXNwb25zZSAod2l0aG91dCBjb250ZW50IGFuZCBtb2RlKVxuICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZXMnLCBmb3JtRGF0YSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRGVjb2RlIGJhc2U2NCBjb250ZW50IGFuZCBzZXQgaW4gZWRpdG9yIHdpdGggVVRGLTggc3VwcG9ydFxuICAgICAgICAgICAgICAgICAgICBpZiAoYmFzZTY0Q29udGVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVjb2RlZENvbnRlbnQgPSBjdXN0b21GaWxlLmJhc2U2NFRvVXRmOChiYXNlNjRDb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLnNldFZhbHVlKGRlY29kZWRDb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBTZXQgbW9kZSBhbmQgdHJpZ2dlciBVSSB1cGRhdGUgKG1vZGUgYWxyZWFkeSBleHRyYWN0ZWQgYWJvdmUpXG4gICAgICAgICAgICAgICAgICAgIGlmIChtb2RlID09PSAnY3VzdG9tJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRm9yIGV4aXN0aW5nIGN1c3RvbSBmaWxlcyAtIGZpbGVwYXRoIGlzIHJlYWQtb25seVxuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZmlsZXBhdGhJbnB1dC5wcm9wKCdyZWFkb25seScsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZmlsZXBhdGhGaWVsZC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2V0IG1vZGUgdG8gJ2N1c3RvbScgdXNpbmcgaGlkZGVuIGlucHV0XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLnNldE1vZGUoJ2N1c3RvbScpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTaG93IG9ubHkgZWRpdG9yIHRhYiBmb3IgY3VzdG9tIG1vZGVcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHRhYk1lbnUudGFiKCdjaGFuZ2UgdGFiJywgJ2VkaXRvcicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZWRpdG9yVGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJG9yaWdpbmFsVGFiLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHJlc3VsdFRhYi5oaWRlKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEhpZGUgb3RoZXIgdGFiIG1lbnUgaXRlbXNcbiAgICAgICAgICAgICAgICAgICAgICAgICQoJy5pdGVtW2RhdGEtdGFiPVwib3JpZ2luYWxcIl0nKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKCcuaXRlbVtkYXRhLXRhYj1cInJlc3VsdFwiXScpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBzeXN0ZW0gZmlsZXMgLSB1c2Ugc3RhbmRhcmQgYmVoYXZpb3JcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuc2V0TW9kZShtb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuY2JPbkNoYW5nZU1vZGUobW9kZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLnVwZGF0ZUZpbGVwYXRoRmllbGRTdGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgbG9hZGluZyBmYWlscywgcmVkaXJlY3QgdG8gaW5kZXhcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1jdXN0b20tZmlsZXMvaW5kZXhgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtXG4gICAgICAgIGN1c3RvbUZpbGUuaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmb3Igd2hlbiB0aGUgY29kZSBtb2RlIGNoYW5nZXMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgc2VsZWN0ZWQgdmFsdWUgZnJvbSB0aGUgZHJvcGRvd24uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUaGUgc2VsZWN0ZWQgdGV4dCBmcm9tIHRoZSBkcm9wZG93bi5cbiAgICAgKi9cbiAgICBjYk9uQ2hhbmdlTW9kZSh2YWx1ZSwgdGV4dCl7XG4gICAgICAgIC8vIEhhbmRsZSBjb2RlIHZpc2liaWxpdHkgYW5kIGNvbnRlbnQgYmFzZWQgb24gdGhlICdtb2RlJ1xuICAgICAgICBzd2l0Y2ggKHZhbHVlKSB7XG4gICAgICAgICAgICBjYXNlICdub25lJzpcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiR0YWJNZW51LnRhYignY2hhbmdlIHRhYicsJ29yaWdpbmFsJyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdvdmVycmlkZSc6XG4gICAgICAgICAgICBjYXNlICdjdXN0b20nOiAgLy8gQ3VzdG9tIG1vZGUgYmVoYXZlcyBsaWtlIG92ZXJyaWRlXG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kdGFiTWVudS50YWIoJ2NoYW5nZSB0YWInLCdlZGl0b3InKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2FwcGVuZCc6XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kdGFiTWVudS50YWIoJ2NoYW5nZSB0YWInLCdlZGl0b3InKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3NjcmlwdCc6XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kdGFiTWVudS50YWIoJ2NoYW5nZSB0YWInLCdlZGl0b3InKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kdGFiTWVudS50YWIoJ2NoYW5nZSB0YWInLCdvcmlnaW5hbCcpO1xuICAgICAgICB9XG4gICAgICAgIGN1c3RvbUZpbGUuaGlkZVNob3dDb2RlKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEV2ZW50IGhhbmRsZXIgZm9yIHRhYiBjaGFuZ2VzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGN1cnJlbnRUYWIgLSBUaGUgY3VycmVudCB0YWIgdGhhdCBpcyB2aXNpYmxlLlxuICAgICAqL1xuICAgIG9uQ2hhbmdlVGFiKGN1cnJlbnRUYWIpe1xuICAgICAgICBjb25zdCBmaWxlUGF0aCA9IGN1c3RvbUZpbGUuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2ZpbGVwYXRoJyk7XG4gICAgICAgIHN3aXRjaCAoY3VycmVudFRhYikge1xuICAgICAgICAgICAgY2FzZSAncmVzdWx0JzpcbiAgICAgICAgICAgICAgICAkKCcudGFiW2RhdGEtdGFiPVwicmVzdWx0XCJdJykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBGaWxlc0FQSS5nZXRGaWxlQ29udGVudChmaWxlUGF0aCwgY3VzdG9tRmlsZS5jYkdldFJlc3VsdEZpbGVDb250ZW50RnJvbVNlcnZlciwgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnb3JpZ2luYWwnOlxuICAgICAgICAgICAgICAgICQoJy50YWJbZGF0YS10YWI9XCJvcmlnaW5hbFwiXScpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgRmlsZXNBUEkuZ2V0RmlsZUNvbnRlbnQoZmlsZVBhdGgsIGN1c3RvbUZpbGUuY2JHZXRPcmlnaW5hbEZpbGVDb250ZW50RnJvbVNlcnZlciwgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdlZGl0b3InOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgdGhlIHZpc2liaWxpdHkgYW5kIGNvbnRlbnQgb2YgY29kZSBiYXNlZCBvbiB0aGUgJ21vZGUnIGZvcm0gdmFsdWUuXG4gICAgICogQWRqdXN0cyB0aGUgQWNlIGVkaXRvciBzZXR0aW5ncyBhY2NvcmRpbmdseS5cbiAgICAgKi9cbiAgICBoaWRlU2hvd0NvZGUoKSB7XG4gICAgICAgIC8vIFJldHJpZXZlICdtb2RlJyB2YWx1ZSAoZnJvbSBkcm9wZG93biBvciBoaWRkZW4gaW5wdXQgZm9yIGN1c3RvbSBtb2RlKVxuICAgICAgICBjb25zdCBtb2RlID0gY3VzdG9tRmlsZS5nZXRDdXJyZW50TW9kZSgpO1xuXG4gICAgICAgIC8vIEdldCBjdXJyZW50IGNvbnRlbnQgZnJvbSBlZGl0b3IgKG5vdCBmcm9tIGZvcm0sIGFzIGZvcm0gZG9lc24ndCBoYXZlIGl0IGFueW1vcmUpXG4gICAgICAgIGxldCBjb250ZW50ID0gY3VzdG9tRmlsZS5lZGl0b3IuZ2V0VmFsdWUoKTtcblxuICAgICAgICAvLyBHZXQgdGFiIG1lbnUgaXRlbXNcbiAgICAgICAgY29uc3QgJG9yaWdpbmFsVGFiTWVudUl0ZW0gPSAkKCcuaXRlbVtkYXRhLXRhYj1cIm9yaWdpbmFsXCJdJyk7XG4gICAgICAgIGNvbnN0ICRyZXN1bHRUYWJNZW51SXRlbSA9ICQoJy5pdGVtW2RhdGEtdGFiPVwicmVzdWx0XCJdJyk7XG5cbiAgICAgICAgLy8gSGFuZGxlIGNvZGUgdmlzaWJpbGl0eSBhbmQgY29udGVudCBiYXNlZCBvbiB0aGUgJ21vZGUnXG4gICAgICAgIHN3aXRjaCAobW9kZSkge1xuICAgICAgICAgICAgY2FzZSAnbm9uZSc6XG4gICAgICAgICAgICAgICAgLy8gSWYgJ21vZGUnIGlzICdub25lJywgc2hvdyBvbmx5IHJlc3VsdCBjb2RlIGdlbmVyYXRlZCBhbmQgaGlkZSBlZGl0b3IgYW5kIHJlc3VsdCB2aWV3ZXJcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRlZGl0b3JUYWIuaGlkZSgpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJG9yaWdpbmFsVGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLnZpZXdlck9yaWdpbmFsLm5hdmlnYXRlRmlsZVN0YXJ0KCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kcmVzdWx0VGFiLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAvLyBTaG93L2hpZGUgbWVudSBpdGVtc1xuICAgICAgICAgICAgICAgICRvcmlnaW5hbFRhYk1lbnVJdGVtLnNob3coKTtcbiAgICAgICAgICAgICAgICAkcmVzdWx0VGFiTWVudUl0ZW0uaGlkZSgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnYXBwZW5kJzpcbiAgICAgICAgICAgICAgICAvLyBJZiAnbW9kZScgaXMgJ2FwcGVuZCcsIHNob3cgYWxsIGZpZWxkc1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGVkaXRvclRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kb3JpZ2luYWxUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHJlc3VsdFRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbC5uYXZpZ2F0ZUZpbGVFbmQoKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLnZpZXdlclJlc3VsdC5uYXZpZ2F0ZUZpbGVFbmQoKTtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGFsbCBtZW51IGl0ZW1zXG4gICAgICAgICAgICAgICAgJG9yaWdpbmFsVGFiTWVudUl0ZW0uc2hvdygpO1xuICAgICAgICAgICAgICAgICRyZXN1bHRUYWJNZW51SXRlbS5zaG93KCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdvdmVycmlkZSc6XG4gICAgICAgICAgICAgICAgLy8gSWYgJ21vZGUnIGlzICdvdmVycmlkZScsIHNob3cgZWRpdG9yIGFuZCBoaWRlIG9yaWdpbmFsLCBidXQgc2hvdyByZXN1bHRcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRlZGl0b3JUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJG9yaWdpbmFsVGFiLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRyZXN1bHRUYWIuaGlkZSgpO1xuICAgICAgICAgICAgICAgIC8vIFNob3cvaGlkZSBtZW51IGl0ZW1zXG4gICAgICAgICAgICAgICAgJG9yaWdpbmFsVGFiTWVudUl0ZW0uaGlkZSgpO1xuICAgICAgICAgICAgICAgICRyZXN1bHRUYWJNZW51SXRlbS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdjdXN0b20nOlxuICAgICAgICAgICAgICAgIC8vIEZvciAnY3VzdG9tJyBtb2RlLCBvbmx5IHNob3cgZWRpdG9yIHRhYiAtIHVzZXIgZnVsbHkgY29udHJvbHMgdGhlIGZpbGVcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRlZGl0b3JUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJG9yaWdpbmFsVGFiLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRyZXN1bHRUYWIuaGlkZSgpO1xuICAgICAgICAgICAgICAgIC8vIEhpZGUgb3RoZXIgdGFiIG1lbnUgaXRlbXMgZm9yIGN1c3RvbSBmaWxlc1xuICAgICAgICAgICAgICAgICRvcmlnaW5hbFRhYk1lbnVJdGVtLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAkcmVzdWx0VGFiTWVudUl0ZW0uaGlkZSgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnc2NyaXB0JzpcbiAgICAgICAgICAgICAgICAvLyBJZiAnbW9kZScgaXMgJ3NjcmlwdCcsIHNob3cgYm90aCBzZXJ2ZXIgYW5kIGN1c3RvbSBjb2RlLCBhcHBseSBjdXN0b20gc2NyaXB0IHRvIHRoZSBmaWxlIGNvbnRlbnQgb24gc2VydmVyXG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZWRpdG9yVGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRvcmlnaW5hbFRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kcmVzdWx0VGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGFsbCBtZW51IGl0ZW1zIGZvciBzY3JpcHQgbW9kZVxuICAgICAgICAgICAgICAgICRvcmlnaW5hbFRhYk1lbnVJdGVtLnNob3coKTtcbiAgICAgICAgICAgICAgICAkcmVzdWx0VGFiTWVudUl0ZW0uc2hvdygpO1xuICAgICAgICAgICAgICAgIC8vIEVkaXRvciAtIG9ubHkgc2V0IHRlbXBsYXRlIGlmIGNvbnRlbnQgaXMgZW1wdHlcbiAgICAgICAgICAgICAgICBpZiAoIWNvbnRlbnQgfHwgY29udGVudC50cmltKCkgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgPSBgIyEvYmluL2Jhc2ggXFxuXFxuYDtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgY29uZmlnUGF0aD1cIiQxXCIgIyBQYXRoIHRvIHRoZSBvcmlnaW5hbCBjb25maWcgZmlsZVxcblxcbmA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYCMgRXhhbXBsZSAxOiBSZXBsYWNlIGFsbCB2YWx1ZXMgbWF4X2NvbnRhY3RzID0gNSB0byBtYXhfY29udGFjdHMgPSAxIG9uIHBqc2lwLmNvbmZcXG5gO1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGAjIHNlZCAtaSAncy9tYXhfY29udGFjdHMgPSA1L21heF9jb250YWN0cyA9IDEvZycgXCIkY29uZmlnUGF0aFwiXFxuXFxuYFxuXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYCMgRXhhbXBsZSAyOiBDaGFuZ2UgdmFsdWUgbWF4X2NvbnRhY3RzIG9ubHkgZm9yIHBlZXIgd2l0aCBleHRlbnNpb24gMjI2IG9uIHBqc2lwLmNvbmZcXG5gO1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGAjIHNlZCAtaSAnL15cXFxcWzIyNlxcXFxdJC8sL15cXFxcWy8gcy9tYXhfY29udGFjdHMgPSA1L21heF9jb250YWN0cyA9IDIvJyBcIiRjb25maWdQYXRoXCJcXG5cXG5gXG5cbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgIyBFeGFtcGxlIDM6IEFkZCBlbiBleHRyYSBzdHJpbmcgaW50byBbcGxheWJhY2stZXhpdF0gc2VjdGlvbiBhZnRlciB0aGUgXCJzYW1lID0+IG4sSGFuZ3VwKClcIiBzdHJpbmcgb24gZXh0ZW5zaW9ucy5jb25mXFxuYDtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgIyBzZWQgLWkgJy9eXFxcXFtwbGF5YmFjay1leGl0XFxcXF0kLywvXlxcXFxbLyBzL15cXFxcKFxcXFxzKnNhbWUgPT4gbixIYW5ndXAoKVxcXFwpL1xcXFwxXFxcXG5cXFxcdHNhbWUgPT4gbixOb09wKFwiWW91ciBOb09wIGNvbW1lbnQgaGVyZVwiKS8nIFwiJGNvbmZpZ1BhdGhcIlxcblxcbmA7XG5cbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgIyBBdHRlbnRpb24hIFlvdSB3aWxsIHNlZSBjaGFuZ2VzIGFmdGVyIHRoZSBiYWNrZ3JvdW5kIHdvcmtlciBwcm9jZXNzZXMgdGhlIHNjcmlwdCBvciBhZnRlciByZWJvb3RpbmcgdGhlIHN5c3RlbS4gXFxuYDtcblxuICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IHNldCBjb250ZW50IGlmIHdlIGNyZWF0ZWQgYSB0ZW1wbGF0ZVxuICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXRWYWx1ZShjb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3IuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIGFueSBvdGhlciAnbW9kZScgdmFsdWVzXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBjdXN0b21GaWxlLnZpZXdlck9yaWdpbmFsLnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXRUaGVtZSgnYWNlL3RoZW1lL21vbm9rYWknKTtcblxuICAgICAgICAvLyBEb24ndCBvdmVyd3JpdGUgZWRpdG9yIGNvbnRlbnQgaGVyZSAtIGl0J3MgYWxyZWFkeSBzZXQgY29ycmVjdGx5XG4gICAgICAgIC8vIGN1c3RvbUZpbGUuZWRpdG9yLnNldFZhbHVlKGNvbnRlbnQpO1xuICAgICAgICAvLyBjdXN0b21GaWxlLmVkaXRvci5jbGVhclNlbGVjdGlvbigpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0aGF0IGhhbmRsZXMgdGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBjb250YWluaW5nIHRoZSBmaWxlJ3MgY29udGVudC5cbiAgICAgKiBJdCB3aWxsIHVwZGF0ZSB0aGUgJ3ZpZXdlck9yaWdpbmFsJyB3aXRoIHRoZSBmaWxlJ3MgY29udGVudCBhbmQgYWRqdXN0IHRoZSBjb2RlIGRpc3BsYXkuXG4gICAgICovXG4gICAgY2JHZXRPcmlnaW5hbEZpbGVDb250ZW50RnJvbVNlcnZlcihyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5jb250ZW50ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGFjZVZpZXdlciA9IGN1c3RvbUZpbGUudmlld2VyT3JpZ2luYWw7XG4gICAgICAgICAgICBjb25zdCBzY3JvbGxUb3AgPSBhY2VWaWV3ZXIuc2Vzc2lvbi5nZXRTY3JvbGxUb3AoKTtcbiAgICAgICAgICAgIGFjZVZpZXdlci5zZXNzaW9uLnNldFZhbHVlKHJlc3BvbnNlLmRhdGEuY29udGVudCk7XG4gICAgICAgICAgICBhY2VWaWV3ZXIuc2Vzc2lvbi5zZXRTY3JvbGxUb3Aoc2Nyb2xsVG9wKTtcbiAgICAgICAgfVxuICAgICAgICAkKCcudGFiW2RhdGEtdGFiPVwib3JpZ2luYWxcIl0nKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0aGF0IGhhbmRsZXMgdGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBjb250YWluaW5nIHRoZSBmaWxlJ3MgY29udGVudC5cbiAgICAgKiBJdCB3aWxsIHVwZGF0ZSB0aGUgJ3ZpZXdlclJlc3VsdCcgd2l0aCB0aGUgZmlsZSdzIGNvbnRlbnQgYW5kIGFkanVzdCB0aGUgY29kZSBkaXNwbGF5LlxuICAgICAqL1xuICAgIGNiR2V0UmVzdWx0RmlsZUNvbnRlbnRGcm9tU2VydmVyKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmNvbnRlbnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29uc3QgYWNlVmlld2VyID0gY3VzdG9tRmlsZS52aWV3ZXJSZXN1bHQ7XG4gICAgICAgICAgICBjb25zdCBzY3JvbGxUb3AgPSBhY2VWaWV3ZXIuc2Vzc2lvbi5nZXRTY3JvbGxUb3AoKTtcbiAgICAgICAgICAgIGFjZVZpZXdlci5zZXNzaW9uLnNldFZhbHVlKHJlc3BvbnNlLmRhdGEuY29udGVudCk7XG4gICAgICAgICAgICBhY2VWaWV3ZXIuc2Vzc2lvbi5zZXRTY3JvbGxUb3Aoc2Nyb2xsVG9wKTtcbiAgICAgICAgfVxuICAgICAgICAkKCcudGFiW2RhdGEtdGFiPVwicmVzdWx0XCJdJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgQWNlIGVkaXRvciBpbnN0YW5jZXMgZm9yICdlZGl0b3InIGFuZCAndmlld2Vycycgd2luZG93cy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplQWNlKCkge1xuICAgICAgICAvLyBDYWxjdWxhdGUgYWNlIGVkaXRvciBoZWlnaHQgYW5kIHJvd3MgY291bnRcbiAgICAgICAgY29uc3QgYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gNDc1O1xuICAgICAgICBjb25zdCByb3dzQ291bnQgPSBNYXRoLnJvdW5kKGFjZUhlaWdodCAvIDE2LjMpO1xuXG4gICAgICAgIC8vIFNldCBtaW5pbXVtIGhlaWdodCBmb3IgdGhlIGNvZGUgc2VjdGlvbnMgb24gd2luZG93IGxvYWRcbiAgICAgICAgJCgnLmFwcGxpY2F0aW9uLWNvZGUnKS5jc3MoJ21pbi1oZWlnaHQnLCBgJHthY2VIZWlnaHR9cHhgKTtcblxuICAgICAgICAvLyBBQ0Ugd2luZG93IGZvciB0aGUgb3JpZ2luYWwgZmlsZSBjb250ZW50LlxuICAgICAgICBjb25zdCBJbmlNb2RlID0gYWNlLnJlcXVpcmUoJ2FjZS9tb2RlL2p1bGlhJykuTW9kZTtcbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbCA9IGFjZS5lZGl0KCdjb25maWctZmlsZS1vcmlnaW5hbCcpO1xuICAgICAgICBjdXN0b21GaWxlLnZpZXdlck9yaWdpbmFsLnNlc3Npb24uc2V0TW9kZShuZXcgSW5pTW9kZSgpKTtcbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbC5zZXRUaGVtZSgnYWNlL3RoZW1lL21vbm9rYWknKTtcbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbC5zZXRPcHRpb25zKHtcbiAgICAgICAgICAgIHNob3dQcmludE1hcmdpbjogZmFsc2UsXG4gICAgICAgICAgICByZWFkT25seTogdHJ1ZSxcbiAgICAgICAgICAgIG1pbkxpbmVzOiByb3dzQ291bnRcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQUNFIHdpbmRvdyBmb3IgdGhlIHJlc3VsdGVkIGZpbGUgY29udGVudC5cbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJSZXN1bHQgPSBhY2UuZWRpdCgnY29uZmlnLWZpbGUtcmVzdWx0Jyk7XG4gICAgICAgIGN1c3RvbUZpbGUudmlld2VyUmVzdWx0LnNlc3Npb24uc2V0TW9kZShuZXcgSW5pTW9kZSgpKTtcbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJSZXN1bHQuc2V0VGhlbWUoJ2FjZS90aGVtZS9tb25va2FpJyk7XG4gICAgICAgIGN1c3RvbUZpbGUudmlld2VyUmVzdWx0LnNldE9wdGlvbnMoe1xuICAgICAgICAgICAgc2hvd1ByaW50TWFyZ2luOiBmYWxzZSxcbiAgICAgICAgICAgIHJlYWRPbmx5OiB0cnVlLFxuICAgICAgICAgICAgbWluTGluZXM6IHJvd3NDb3VudFxuICAgICAgICB9KTtcblxuXG4gICAgICAgIC8vIEFDRSB3aW5kb3cgZm9yIHRoZSB1c2VyIGVkaXRvci5cbiAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3IgPSBhY2UuZWRpdCgndXNlci1lZGl0LWNvbmZpZycpO1xuICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXNzaW9uLnNldE1vZGUobmV3IEluaU1vZGUoKSk7XG4gICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXRPcHRpb25zKHtcbiAgICAgICAgICAgIHNob3dQcmludE1hcmdpbjogZmFsc2UsXG4gICAgICAgICAgICBtaW5MaW5lczogcm93c0NvdW50LFxuICAgICAgICB9KTtcbiAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2Vzc2lvbi5vbignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgLy8gVHJpZ2dlciBjaGFuZ2UgZXZlbnQgdG8gYWNrbm93bGVkZ2UgdGhlIG1vZGlmaWNhdGlvblxuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgaGFuZGxlcnMgZm9yIGZ1bGxzY3JlZW4gbW9kZSBidXR0b25zLiBIaWRlcyB0aGUgdG9nZ2xlIG9uXG4gICAgICAgIC8vIGJyb3dzZXJzIHdpdGhvdXQgRnVsbHNjcmVlbiBBUEkgZm9yIERPTSBlbGVtZW50cyAoZS5nLiBpUGhvbmUgV2ViS2l0KS5cbiAgICAgICAgY29uc3QgJGZ1bGxzY3JlZW5CdG4gPSAkKCcuZnVsbHNjcmVlbi10b2dnbGUtYnRuJyk7XG4gICAgICAgIGNvbnN0IHNhbXBsZUNvbnRhaW5lciA9ICRmdWxsc2NyZWVuQnRuLmZpcnN0KCkuc2libGluZ3MoJy5hcHBsaWNhdGlvbi1jb2RlJylbMF07XG4gICAgICAgIGlmIChGdWxsc2NyZWVuVG9nZ2xlLmlzU3VwcG9ydGVkKHNhbXBsZUNvbnRhaW5lcikpIHtcbiAgICAgICAgICAgICRmdWxsc2NyZWVuQnRuLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjb250YWluZXIgPSAkKHRoaXMpLnNpYmxpbmdzKCcuYXBwbGljYXRpb24tY29kZScpWzBdO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUudG9nZ2xlRnVsbFNjcmVlbihjb250YWluZXIpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBGdWxsc2NyZWVuVG9nZ2xlLm9uQ2hhbmdlKGN1c3RvbUZpbGUuYWRqdXN0RWRpdG9ySGVpZ2h0KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRmdWxsc2NyZWVuQnRuLmhpZGUoKTtcbiAgICAgICAgfVxuXG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBFbmFibGUvZGlzYWJsZSBmdWxsc2NyZWVuIG1vZGUgZm9yIGEgc3BlY2lmaWMgYmxvY2sgdmlhIEZ1bGxzY3JlZW5Ub2dnbGUgaGVscGVyLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gY29udGFpbmVyIC0gVGhlIGNvbnRhaW5lciB0byBleHBhbmQgdG8gZnVsbHNjcmVlbi5cbiAgICAgKi9cbiAgICB0b2dnbGVGdWxsU2NyZWVuKGNvbnRhaW5lcikge1xuICAgICAgICBGdWxsc2NyZWVuVG9nZ2xlLnRvZ2dsZShjb250YWluZXIpLmNhdGNoKGVyciA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBFcnJvciBhdHRlbXB0aW5nIHRvIHRvZ2dsZSBmdWxsLXNjcmVlbiBtb2RlOiAke2Vyci5tZXNzYWdlfWApO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVjYWxjdWxhdGUgZWRpdG9yIGhlaWdodHMgd2hlbiB0aGUgc2NyZWVuIG1vZGUgY2hhbmdlcy5cbiAgICAgKi9cbiAgICBhZGp1c3RFZGl0b3JIZWlnaHQoKSB7XG4gICAgICAgIGNvbnN0IGVkaXRvcnMgPSBbY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbCwgY3VzdG9tRmlsZS52aWV3ZXJSZXN1bHQsIGN1c3RvbUZpbGUuZWRpdG9yXTtcbiAgICAgICAgZWRpdG9ycy5mb3JFYWNoKGVkaXRvciA9PiB7XG4gICAgICAgICAgICBpZiAoZWRpdG9yKSB7XG4gICAgICAgICAgICAgICAgZWRpdG9yLnJlc2l6ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG5cbiAgICAgICAgLy8gSU1QT1JUQU5UOiBHZXQgbW9kZSBCRUZPUkUgZm9ybSgnZ2V0IHZhbHVlcycpIHRvIHByZXZlbnQgZHJvcGRvd24gZnJvbSBvdmVycmlkaW5nIGl0XG4gICAgICAgIGNvbnN0IG1vZGUgPSBjdXN0b21GaWxlLmdldEN1cnJlbnRNb2RlKCk7XG5cbiAgICAgICAgLy8gR2V0IGFsbCBmb3JtIHZhbHVlc1xuICAgICAgICByZXN1bHQuZGF0YSA9IGN1c3RvbUZpbGUuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXG4gICAgICAgIC8vIE92ZXJyaWRlIG1vZGUgd2l0aCB0aGUgY29ycmVjdCB2YWx1ZSAoZnJvbSBnZXRDdXJyZW50TW9kZSlcbiAgICAgICAgcmVzdWx0LmRhdGEubW9kZSA9IG1vZGU7XG5cbiAgICAgICAgLy8gUmVtb3ZlIHRlY2huaWNhbCBmaWVsZCBmcm9tIGRhdGFcbiAgICAgICAgZGVsZXRlIHJlc3VsdC5kYXRhWydtb2RlLWN1c3RvbS12YWx1ZSddO1xuXG4gICAgICAgIC8vIEdldCBjb250ZW50IGZyb20gQWNlIGVkaXRvciBiYXNlZCBvbiBtb2RlXG4gICAgICAgIHN3aXRjaCAobW9kZSkge1xuICAgICAgICAgICAgY2FzZSAnYXBwZW5kJzpcbiAgICAgICAgICAgIGNhc2UgJ292ZXJyaWRlJzpcbiAgICAgICAgICAgIGNhc2UgJ2N1c3RvbSc6XG4gICAgICAgICAgICBjYXNlICdzY3JpcHQnOlxuICAgICAgICAgICAgICAgIC8vIEdldCBjb250ZW50IGZyb20gQWNlIGVkaXRvciAobm90IGJhc2U2NCBlbmNvZGVkIHlldClcbiAgICAgICAgICAgICAgICBpZiAoIWN1c3RvbUZpbGUuZWRpdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0VkaXRvciBpcyBub3QgaW5pdGlhbGl6ZWQhJyk7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhLmNvbnRlbnQgPSAnJztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBlZGl0b3JDb250ZW50ID0gY3VzdG9tRmlsZS5lZGl0b3IuZ2V0VmFsdWUoKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmRhdGEuY29udGVudCA9IGVkaXRvckNvbnRlbnQ7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnbm9uZSc6XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIC8vIEZvciAnbm9uZScgbW9kZSwgY2xlYXIgdGhlIGNvbnRlbnRcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YS5jb250ZW50ID0gJyc7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcblxuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gY3VzdG9tRmlsZS4kZm9ybU9iajtcblxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUEkgc2V0dGluZ3MgZm9yIEZvcm1cbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBhcGlPYmplY3Q6IGN1c3RvbUZpbGVzQVBJLFxuICAgICAgICAgICAgc2F2ZU1ldGhvZDogJ3NhdmUnLCAgLy8gV2lsbCB1c2UgdGhlIHNtYXJ0IHNhdmUgbWV0aG9kIHRoYXQgZGV0ZXJtaW5lcyBjcmVhdGUvdXBkYXRlXG4gICAgICAgICAgICBhdXRvRGV0ZWN0TWV0aG9kOiBmYWxzZSwgIC8vIFdlIGhhbmRsZSB0aGlzIGluIG91ciBzYXZlIG1ldGhvZFxuICAgICAgICAgICAgaWRGaWVsZDogJ2lkJ1xuICAgICAgICB9O1xuXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGN1c3RvbUZpbGUudmFsaWRhdGVSdWxlczsgLy8gRm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGN1c3RvbUZpbGUuY2JCZWZvcmVTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYmVmb3JlIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGN1c3RvbUZpbGUuY2JBZnRlclNlbmRGb3JtOyAvLyBDYWxsYmFjayBhZnRlciBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcbn07XG5cbi8vIEluaXRpYWxpemUgdGhlIGN1c3RvbSBmaWxlcyBtb2RpZnkgZm9ybSB3aGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeS5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBjdXN0b21GaWxlLmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=