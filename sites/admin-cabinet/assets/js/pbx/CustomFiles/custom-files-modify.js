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
   * Updates the filepath field state based on whether the file is user-created (MODE_CUSTOM) or system-managed.
   * User-created files have editable filepath but cannot be created (only for new files),
   * system-managed files have read-only filepath.
   */
  updateFilepathFieldState: function updateFilepathFieldState() {
    var mode = customFile.$formObj.form('get value', 'mode');
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
    customFile.$modeDropDown = $('#mode-dropdown'); // Enable tab navigation with history support

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
          // Set default values to form fields
          customFile.$formObj.form('set values', response.data); // For new files with MODE_CUSTOM

          if (response.data.mode === 'custom') {
            // Make filepath editable for new custom files
            customFile.$filepathInput.prop('readonly', false);
            customFile.$filepathField.removeClass('disabled'); // IMPORTANT: Set mode value to 'custom' in dropdown before hiding

            customFile.$modeDropDown.dropdown('set selected', 'custom'); // Hide mode selector for custom files

            customFile.$modeDropDown.parent().parent().hide(); // Show only editor tab for custom mode

            customFile.$tabMenu.tab('change tab', 'editor');
            customFile.$editorTab.show();
            customFile.$originalTab.hide();
            customFile.$resultTab.hide(); // Hide other tab menu items

            $('.item[data-tab="original"]').hide();
            $('.item[data-tab="result"]').hide(); // Initialize empty content in editor for new custom files

            if (response.data.content) {
              // If default content provided (base64), decode it
              try {
                var decodedContent = atob(response.data.content);
                customFile.editor.setValue(decodedContent);
              } catch (e) {
                customFile.editor.setValue(response.data.content);
              }
            } else {
              // Set empty content for new custom file
              customFile.editor.setValue('');
            }

            customFile.editor.clearSelection();
          } else {
            // For other modes, use standard behavior
            var mode = response.data.mode || 'none';
            customFile.$modeDropDown.dropdown('set selected', mode);
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
          var base64Content = response.data.content; // Remove content from response before setting form values
          // (content will be taken from ACE editor on save)

          var formData = _objectSpread({}, response.data);

          delete formData.content; // Set form values from API response (without content)

          customFile.$formObj.form('set values', formData); // Decode base64 content and set in editor

          if (base64Content) {
            try {
              var decodedContent = atob(base64Content);
              customFile.editor.setValue(decodedContent);
              customFile.editor.clearSelection();
            } catch (e) {
              // If base64 decode fails, use content as-is
              customFile.editor.setValue(base64Content);
              customFile.editor.clearSelection();
            }
          } // Set mode and trigger UI update


          var mode = response.data.mode || 'none';

          if (mode === 'custom') {
            // For existing custom files - filepath is read-only
            customFile.$filepathInput.prop('readonly', true);
            customFile.$filepathField.addClass('disabled'); // IMPORTANT: Set mode value to 'custom' in dropdown before hiding

            customFile.$modeDropDown.dropdown('set selected', 'custom'); // Hide mode selector for custom files - they cannot change mode

            customFile.$modeDropDown.parent().parent().hide(); // Show only editor tab for custom mode

            customFile.$tabMenu.tab('change tab', 'editor');
            customFile.$editorTab.show();
            customFile.$originalTab.hide();
            customFile.$resultTab.hide(); // Hide other tab menu items

            $('.item[data-tab="original"]').hide();
            $('.item[data-tab="result"]').hide();
          } else {
            // For system files - use standard behavior
            customFile.$modeDropDown.dropdown('set selected', mode);
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
    // Retrieve 'mode' value from the form
    var mode = customFile.$formObj.form('get value', 'mode'); // Get current content from editor (not from form, as form doesn't have it anymore)

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
    var result = settings;
    result.data = customFile.$formObj.form('get values'); // Get mode from form

    var mode = customFile.$formObj.form('get value', 'mode'); // IMPORTANT: Check if dropdown is hidden (indicator of custom file)
    // When dropdown is hidden, it might return incorrect value

    if (customFile.$modeDropDown.parent().parent().is(':hidden')) {
      // This is a custom file, force mode to be 'custom'
      mode = 'custom';
      result.data.mode = 'custom';
      console.log('Custom file detected (dropdown hidden), forcing mode to custom');
    } // Additional check: Ensure mode stays 'custom' for custom files


    if (mode === 'custom' || result.data.mode === 'custom') {
      // Force mode to stay 'custom' for custom files
      result.data.mode = 'custom';
      mode = 'custom';
    } // Get content from Ace editor based on mode


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
          result.data.content = editorContent; // Debug: log content for custom mode

          if (mode === 'custom') {
            console.log('Saving custom file with content length:', editorContent.length);
            console.log('First 100 chars:', editorContent.substring(0, 100));
          }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DdXN0b21GaWxlcy9jdXN0b20tZmlsZXMtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbImN1c3RvbUZpbGUiLCIkZm9ybU9iaiIsIiQiLCIkdGFiTWVudSIsIiRtb2RlRHJvcERvd24iLCIkb3JpZ2luYWxUYWIiLCIkZWRpdG9yVGFiIiwiJHJlc3VsdFRhYiIsIiRtYWluQ29udGFpbmVyIiwiJGZpbGVwYXRoSW5wdXQiLCIkZmlsZXBhdGhGaWVsZCIsImVkaXRvciIsInZpZXdlck9yaWdpbmFsIiwidmlld2VyUmVzdWx0IiwidmFsaWRhdGVSdWxlcyIsIm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiY2ZfVmFsaWRhdGVOYW1lSXNFbXB0eSIsInVwZGF0ZUZpbGVwYXRoRmllbGRTdGF0ZSIsIm1vZGUiLCJmb3JtIiwiaXNVc2VyQ3JlYXRlZCIsImZpbGVJZCIsInByb3AiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwicGFyZW50IiwiaGlkZSIsInNob3ciLCJpbml0aWFsaXplIiwidGFiIiwib25WaXNpYmxlIiwib25DaGFuZ2VUYWIiLCJpbml0aWFsaXplQWNlIiwibGVuZ3RoIiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsImNiT25DaGFuZ2VNb2RlIiwidXJsUGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwid2luZG93IiwibG9jYXRpb24iLCJzZWFyY2giLCJ1cmxJZCIsInBhdGhuYW1lIiwibWF0Y2giLCJjdXN0b21GaWxlc0FQSSIsImdldFJlY29yZCIsInJlc3BvbnNlIiwicmVzdWx0IiwiZGF0YSIsImNvbnRlbnQiLCJkZWNvZGVkQ29udGVudCIsImF0b2IiLCJzZXRWYWx1ZSIsImUiLCJjbGVhclNlbGVjdGlvbiIsImJhc2U2NENvbnRlbnQiLCJmb3JtRGF0YSIsImdsb2JhbFJvb3RVcmwiLCJpbml0aWFsaXplRm9ybSIsInZhbHVlIiwidGV4dCIsImhpZGVTaG93Q29kZSIsImN1cnJlbnRUYWIiLCJmaWxlUGF0aCIsIkZpbGVzQVBJIiwiZ2V0RmlsZUNvbnRlbnQiLCJjYkdldFJlc3VsdEZpbGVDb250ZW50RnJvbVNlcnZlciIsImNiR2V0T3JpZ2luYWxGaWxlQ29udGVudEZyb21TZXJ2ZXIiLCJnZXRWYWx1ZSIsIiRvcmlnaW5hbFRhYk1lbnVJdGVtIiwiJHJlc3VsdFRhYk1lbnVJdGVtIiwibmF2aWdhdGVGaWxlU3RhcnQiLCJuYXZpZ2F0ZUZpbGVFbmQiLCJ0cmltIiwic2V0VGhlbWUiLCJ1bmRlZmluZWQiLCJhY2VWaWV3ZXIiLCJzY3JvbGxUb3AiLCJzZXNzaW9uIiwiZ2V0U2Nyb2xsVG9wIiwic2V0U2Nyb2xsVG9wIiwiYWNlSGVpZ2h0IiwiaW5uZXJIZWlnaHQiLCJyb3dzQ291bnQiLCJNYXRoIiwicm91bmQiLCJjc3MiLCJJbmlNb2RlIiwiYWNlIiwicmVxdWlyZSIsIk1vZGUiLCJlZGl0Iiwic2V0TW9kZSIsInNldE9wdGlvbnMiLCJzaG93UHJpbnRNYXJnaW4iLCJyZWFkT25seSIsIm1pbkxpbmVzIiwib24iLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJjb250YWluZXIiLCJzaWJsaW5ncyIsInRvZ2dsZUZ1bGxTY3JlZW4iLCJkb2N1bWVudCIsImFkZEV2ZW50TGlzdGVuZXIiLCJhZGp1c3RFZGl0b3JIZWlnaHQiLCJmdWxsc2NyZWVuRWxlbWVudCIsInJlcXVlc3RGdWxsc2NyZWVuIiwiZXJyIiwiY29uc29sZSIsImVycm9yIiwibWVzc2FnZSIsImV4aXRGdWxsc2NyZWVuIiwiZWRpdG9ycyIsImZvckVhY2giLCJyZXNpemUiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJpcyIsImxvZyIsImVkaXRvckNvbnRlbnQiLCJzdWJzdHJpbmciLCJjYkFmdGVyU2VuZEZvcm0iLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiYXV0b0RldGVjdE1ldGhvZCIsImlkRmllbGQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7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QUNBdUcsSUFBQUEsSUFBSSxDQUFDeUIsV0FBTCxHQUFtQjtBQUNmQyxNQUFBQSxPQUFPLEVBQUUsSUFETTtBQUVmQyxNQUFBQSxTQUFTLEVBQUVqRixjQUZJO0FBR2ZrRixNQUFBQSxVQUFVLEVBQUUsTUFIRztBQUdNO0FBQ3JCQyxNQUFBQSxnQkFBZ0IsRUFBRSxLQUpIO0FBSVc7QUFDMUJDLE1BQUFBLE9BQU8sRUFBRTtBQUxNLEtBQW5CO0FBUUE5QixJQUFBQSxJQUFJLENBQUMxRixhQUFMLEdBQXFCZCxVQUFVLENBQUNjLGFBQWhDLENBWmEsQ0FZa0M7O0FBQy9DMEYsSUFBQUEsSUFBSSxDQUFDa0IsZ0JBQUwsR0FBd0IxSCxVQUFVLENBQUMwSCxnQkFBbkMsQ0FiYSxDQWF3Qzs7QUFDckRsQixJQUFBQSxJQUFJLENBQUN3QixlQUFMLEdBQXVCaEksVUFBVSxDQUFDZ0ksZUFBbEMsQ0FkYSxDQWNzQzs7QUFDbkR4QixJQUFBQSxJQUFJLENBQUN2RSxVQUFMO0FBQ0g7QUFobUJjLENBQW5CLEMsQ0FtbUJBOztBQUNBL0IsQ0FBQyxDQUFDMkcsUUFBRCxDQUFELENBQVkwQixLQUFaLENBQWtCLFlBQU07QUFDcEJ2SSxFQUFBQSxVQUFVLENBQUNpQyxVQUFYO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLGdsb2JhbFRyYW5zbGF0ZSwgYWNlLCBGb3JtLCBGaWxlc0FQSSwgY3VzdG9tRmlsZXNBUEksIFBieEFwaUNsaWVudCAqL1xuXG5cbi8qKlxuICogTW9kdWxlIGN1c3RvbUZpbGVcbiAqIFRoaXMgbW9kdWxlIG1hbmFnZXMgZmlsZSBpbnRlcmFjdGlvbnMgaW4gYSBVSSwgc3VjaCBhcyBsb2FkaW5nIGZpbGUgY29udGVudCBmcm9tIGEgc2VydmVyIGFuZCBoYW5kbGluZyB1c2VyIGlucHV0LlxuICogQG1vZHVsZSBjdXN0b21GaWxlXG4gKi9cbmNvbnN0IGN1c3RvbUZpbGUgPSB7XG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjY3VzdG9tLWZpbGUtZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHRhYiBtZW51LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHRhYk1lbnU6ICQoJyNjdXN0b20tZmlsZXMtbWVudSAuaXRlbScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIG1vZGUgc2VsZWN0LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG1vZGVEcm9wRG93bjogJCgnI21vZGUtZHJvcGRvd24nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB0YWIgd2l0aCBvcmlnaW5hbCBmaWxlIGNvbnRlbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkb3JpZ2luYWxUYWI6ICQoJ2FbZGF0YS10YWI9XCJvcmlnaW5hbFwiXScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHRhYiB3aXRoIHVzZXIgY29udGVudC9zY3JpcHQgZWRpdG9yLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGVkaXRvclRhYjogJCgnYVtkYXRhLXRhYj1cImVkaXRvclwiXScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHRhYiB3aXRoIHJlc3VsdGVkIGZpbGUgY29udGVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRyZXN1bHRUYWI6ICQoJ2FbZGF0YS10YWI9XCJyZXN1bHRcIl0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBlbGVtZW50IGZvciB0aGUgbWFpbiBjb250ZW50IGNvbnRhaW5lci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRtYWluQ29udGFpbmVyOiAkKCcjbWFpbi1jb250ZW50LWNvbnRhaW5lcicpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZpbGVwYXRoIGlucHV0IGZpZWxkLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZpbGVwYXRoSW5wdXQ6ICQoJyNmaWxlcGF0aCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZpbGVwYXRoIGZpZWxkIGNvbnRhaW5lci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmaWxlcGF0aEZpZWxkOiAkKCcjZmlsZXBhdGgtZmllbGQnKSxcblxuXG4gICAgLyoqXG4gICAgICogQWNlIGVkaXRvciBpbnN0YW5jZXNcbiAgICAgKiBgZWRpdG9yYCBpcyBmb3IgaW5wdXQgYW5kIGB2aWV3ZXJzYCBpcyBmb3IgZGlzcGxheSBjb2RlIGZyb20gc2VydmVyXG4gICAgICovXG4gICAgZWRpdG9yOiAnJyxcbiAgICB2aWV3ZXJPcmlnaW5hbDogJycsXG4gICAgdmlld2VyUmVzdWx0OiAnJyxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBuYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZmlsZXBhdGgnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmNmX1ZhbGlkYXRlTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgdGhlIGZpbGVwYXRoIGZpZWxkIHN0YXRlIGJhc2VkIG9uIHdoZXRoZXIgdGhlIGZpbGUgaXMgdXNlci1jcmVhdGVkIChNT0RFX0NVU1RPTSkgb3Igc3lzdGVtLW1hbmFnZWQuXG4gICAgICogVXNlci1jcmVhdGVkIGZpbGVzIGhhdmUgZWRpdGFibGUgZmlsZXBhdGggYnV0IGNhbm5vdCBiZSBjcmVhdGVkIChvbmx5IGZvciBuZXcgZmlsZXMpLFxuICAgICAqIHN5c3RlbS1tYW5hZ2VkIGZpbGVzIGhhdmUgcmVhZC1vbmx5IGZpbGVwYXRoLlxuICAgICAqL1xuICAgIHVwZGF0ZUZpbGVwYXRoRmllbGRTdGF0ZSgpIHtcbiAgICAgICAgY29uc3QgbW9kZSA9IGN1c3RvbUZpbGUuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ21vZGUnKTtcbiAgICAgICAgY29uc3QgaXNVc2VyQ3JlYXRlZCA9IG1vZGUgPT09ICdjdXN0b20nO1xuICAgICAgICBjb25zdCBmaWxlSWQgPSBjdXN0b21GaWxlLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdpZCcpO1xuXG4gICAgICAgIGlmIChpc1VzZXJDcmVhdGVkKSB7XG4gICAgICAgICAgICBpZiAoIWZpbGVJZCB8fCBmaWxlSWQgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgLy8gTmV3IGN1c3RvbSBmaWxlIC0gZmlsZXBhdGggaXMgZWRpdGFibGVcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRmaWxlcGF0aElucHV0LnByb3AoJ3JlYWRvbmx5JywgZmFsc2UpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGZpbGVwYXRoRmllbGQucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIEV4aXN0aW5nIGN1c3RvbSBmaWxlIC0gZmlsZXBhdGggaXMgcmVhZC1vbmx5IChjYW5ub3QgYmUgY2hhbmdlZCBhZnRlciBjcmVhdGlvbilcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRmaWxlcGF0aElucHV0LnByb3AoJ3JlYWRvbmx5JywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZmlsZXBhdGhGaWVsZC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEFsd2F5cyBoaWRlIG1vZGUgc2VsZWN0b3IgZm9yIGN1c3RvbSBmaWxlc1xuICAgICAgICAgICAgY3VzdG9tRmlsZS4kbW9kZURyb3BEb3duLnBhcmVudCgpLnBhcmVudCgpLmhpZGUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIFN5c3RlbS1tYW5hZ2VkIGZpbGUgLSBmaWxlcGF0aCBpcyBhbHdheXMgcmVhZC1vbmx5XG4gICAgICAgICAgICBjdXN0b21GaWxlLiRmaWxlcGF0aElucHV0LnByb3AoJ3JlYWRvbmx5JywgdHJ1ZSk7XG4gICAgICAgICAgICBjdXN0b21GaWxlLiRmaWxlcGF0aEZpZWxkLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgLy8gU2hvdyBtb2RlIHNlbGVjdG9yIGZvciBzeXN0ZW0gZmlsZXNcbiAgICAgICAgICAgIGN1c3RvbUZpbGUuJG1vZGVEcm9wRG93bi5wYXJlbnQoKS5wYXJlbnQoKS5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGN1c3RvbUZpbGUgbW9kdWxlLlxuICAgICAqIFNldHMgdXAgdGhlIGRyb3Bkb3duLCBpbml0aWFsaXplcyBBY2UgZWRpdG9yLCBmb3JtLCBhbmQgcmV0cmlldmVzIGZpbGUgY29udGVudCBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGpRdWVyeSBvYmplY3RzIGFmdGVyIERPTSBpcyByZWFkeVxuICAgICAgICBjdXN0b21GaWxlLiRmaWxlcGF0aElucHV0ID0gJCgnI2ZpbGVwYXRoJyk7XG4gICAgICAgIGN1c3RvbUZpbGUuJGZpbGVwYXRoRmllbGQgPSAkKCcjZmlsZXBhdGgtZmllbGQnKTtcbiAgICAgICAgY3VzdG9tRmlsZS4kbW9kZURyb3BEb3duID0gJCgnI21vZGUtZHJvcGRvd24nKTtcblxuICAgICAgICAvLyBFbmFibGUgdGFiIG5hdmlnYXRpb24gd2l0aCBoaXN0b3J5IHN1cHBvcnRcbiAgICAgICAgY3VzdG9tRmlsZS4kdGFiTWVudS50YWIoe1xuICAgICAgICAgICAgb25WaXNpYmxlOiBjdXN0b21GaWxlLm9uQ2hhbmdlVGFiXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGN1c3RvbUZpbGUuJG1haW5Db250YWluZXIucmVtb3ZlQ2xhc3MoJ2NvbnRhaW5lcicpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgQWNlIGVkaXRvclxuICAgICAgICBjdXN0b21GaWxlLmluaXRpYWxpemVBY2UoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIG9yIHJlaW5pdGlhbGl6ZSBkcm9wZG93blxuICAgICAgICBpZiAoY3VzdG9tRmlsZS4kbW9kZURyb3BEb3duLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGN1c3RvbUZpbGUuJG1vZGVEcm9wRG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6IGN1c3RvbUZpbGUuY2JPbkNoYW5nZU1vZGVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gR2V0IGZpbGUgSUQgZnJvbSBVUkwgb3IgZm9ybVxuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICBjb25zdCB1cmxJZCA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5tYXRjaCgvbW9kaWZ5XFwvKFxcZCspLyk7XG4gICAgICAgIGNvbnN0IGZpbGVJZCA9IHVybElkID8gdXJsSWRbMV0gOiBjdXN0b21GaWxlLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdpZCcpO1xuXG4gICAgICAgIGlmICghZmlsZUlkIHx8IGZpbGVJZCA9PT0gJycpIHtcbiAgICAgICAgICAgIC8vIExvYWQgZGVmYXVsdCB2YWx1ZXMgZm9yIG5ldyBjdXN0b20gZmlsZVxuICAgICAgICAgICAgY3VzdG9tRmlsZXNBUEkuZ2V0UmVjb3JkKCduZXcnLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IGRlZmF1bHQgdmFsdWVzIHRvIGZvcm0gZmllbGRzXG4gICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlcycsIHJlc3BvbnNlLmRhdGEpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEZvciBuZXcgZmlsZXMgd2l0aCBNT0RFX0NVU1RPTVxuICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5tb2RlID09PSAnY3VzdG9tJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gTWFrZSBmaWxlcGF0aCBlZGl0YWJsZSBmb3IgbmV3IGN1c3RvbSBmaWxlc1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZmlsZXBhdGhJbnB1dC5wcm9wKCdyZWFkb25seScsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGZpbGVwYXRoRmllbGQucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIElNUE9SVEFOVDogU2V0IG1vZGUgdmFsdWUgdG8gJ2N1c3RvbScgaW4gZHJvcGRvd24gYmVmb3JlIGhpZGluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kbW9kZURyb3BEb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCAnY3VzdG9tJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEhpZGUgbW9kZSBzZWxlY3RvciBmb3IgY3VzdG9tIGZpbGVzXG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRtb2RlRHJvcERvd24ucGFyZW50KCkucGFyZW50KCkuaGlkZSgpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTaG93IG9ubHkgZWRpdG9yIHRhYiBmb3IgY3VzdG9tIG1vZGVcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHRhYk1lbnUudGFiKCdjaGFuZ2UgdGFiJywgJ2VkaXRvcicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZWRpdG9yVGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJG9yaWdpbmFsVGFiLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHJlc3VsdFRhYi5oaWRlKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEhpZGUgb3RoZXIgdGFiIG1lbnUgaXRlbXNcbiAgICAgICAgICAgICAgICAgICAgICAgICQoJy5pdGVtW2RhdGEtdGFiPVwib3JpZ2luYWxcIl0nKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKCcuaXRlbVtkYXRhLXRhYj1cInJlc3VsdFwiXScpLmhpZGUoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBlbXB0eSBjb250ZW50IGluIGVkaXRvciBmb3IgbmV3IGN1c3RvbSBmaWxlc1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEuY29udGVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIElmIGRlZmF1bHQgY29udGVudCBwcm92aWRlZCAoYmFzZTY0KSwgZGVjb2RlIGl0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVjb2RlZENvbnRlbnQgPSBhdG9iKHJlc3BvbnNlLmRhdGEuY29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLnNldFZhbHVlKGRlY29kZWRDb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2V0VmFsdWUocmVzcG9uc2UuZGF0YS5jb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNldCBlbXB0eSBjb250ZW50IGZvciBuZXcgY3VzdG9tIGZpbGVcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXRWYWx1ZSgnJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5jbGVhclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRm9yIG90aGVyIG1vZGVzLCB1c2Ugc3RhbmRhcmQgYmVoYXZpb3JcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vZGUgPSByZXNwb25zZS5kYXRhLm1vZGUgfHwgJ25vbmUnO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kbW9kZURyb3BEb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBtb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuY2JPbkNoYW5nZU1vZGUobW9kZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLnVwZGF0ZUZpbGVwYXRoRmllbGRTdGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBMb2FkIGV4aXN0aW5nIGZpbGUgZGF0YSB2aWEgUkVTVCBBUElcbiAgICAgICAgICAgIGN1c3RvbUZpbGVzQVBJLmdldFJlY29yZChmaWxlSWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTdG9yZSBiYXNlNjQgY29udGVudCBzZXBhcmF0ZWx5IGFuZCByZW1vdmUgZnJvbSBmb3JtIGRhdGFcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYmFzZTY0Q29udGVudCA9IHJlc3BvbnNlLmRhdGEuY29udGVudDtcblxuICAgICAgICAgICAgICAgICAgICAvLyBSZW1vdmUgY29udGVudCBmcm9tIHJlc3BvbnNlIGJlZm9yZSBzZXR0aW5nIGZvcm0gdmFsdWVzXG4gICAgICAgICAgICAgICAgICAgIC8vIChjb250ZW50IHdpbGwgYmUgdGFrZW4gZnJvbSBBQ0UgZWRpdG9yIG9uIHNhdmUpXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvcm1EYXRhID0gey4uLnJlc3BvbnNlLmRhdGF9O1xuICAgICAgICAgICAgICAgICAgICBkZWxldGUgZm9ybURhdGEuY29udGVudDtcblxuICAgICAgICAgICAgICAgICAgICAvLyBTZXQgZm9ybSB2YWx1ZXMgZnJvbSBBUEkgcmVzcG9uc2UgKHdpdGhvdXQgY29udGVudClcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWVzJywgZm9ybURhdGEpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIERlY29kZSBiYXNlNjQgY29udGVudCBhbmQgc2V0IGluIGVkaXRvclxuICAgICAgICAgICAgICAgICAgICBpZiAoYmFzZTY0Q29udGVudCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkZWNvZGVkQ29udGVudCA9IGF0b2IoYmFzZTY0Q29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2V0VmFsdWUoZGVjb2RlZENvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBJZiBiYXNlNjQgZGVjb2RlIGZhaWxzLCB1c2UgY29udGVudCBhcy1pc1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLnNldFZhbHVlKGJhc2U2NENvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBTZXQgbW9kZSBhbmQgdHJpZ2dlciBVSSB1cGRhdGVcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbW9kZSA9IHJlc3BvbnNlLmRhdGEubW9kZSB8fCAnbm9uZSc7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKG1vZGUgPT09ICdjdXN0b20nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGb3IgZXhpc3RpbmcgY3VzdG9tIGZpbGVzIC0gZmlsZXBhdGggaXMgcmVhZC1vbmx5XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRmaWxlcGF0aElucHV0LnByb3AoJ3JlYWRvbmx5JywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRmaWxlcGF0aEZpZWxkLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJTVBPUlRBTlQ6IFNldCBtb2RlIHZhbHVlIHRvICdjdXN0b20nIGluIGRyb3Bkb3duIGJlZm9yZSBoaWRpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJG1vZGVEcm9wRG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgJ2N1c3RvbScpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBIaWRlIG1vZGUgc2VsZWN0b3IgZm9yIGN1c3RvbSBmaWxlcyAtIHRoZXkgY2Fubm90IGNoYW5nZSBtb2RlXG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRtb2RlRHJvcERvd24ucGFyZW50KCkucGFyZW50KCkuaGlkZSgpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBTaG93IG9ubHkgZWRpdG9yIHRhYiBmb3IgY3VzdG9tIG1vZGVcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHRhYk1lbnUudGFiKCdjaGFuZ2UgdGFiJywgJ2VkaXRvcicpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZWRpdG9yVGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJG9yaWdpbmFsVGFiLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHJlc3VsdFRhYi5oaWRlKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEhpZGUgb3RoZXIgdGFiIG1lbnUgaXRlbXNcbiAgICAgICAgICAgICAgICAgICAgICAgICQoJy5pdGVtW2RhdGEtdGFiPVwib3JpZ2luYWxcIl0nKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAkKCcuaXRlbVtkYXRhLXRhYj1cInJlc3VsdFwiXScpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBzeXN0ZW0gZmlsZXMgLSB1c2Ugc3RhbmRhcmQgYmVoYXZpb3JcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJG1vZGVEcm9wRG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgbW9kZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLmNiT25DaGFuZ2VNb2RlKG1vZGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS51cGRhdGVGaWxlcGF0aEZpZWxkU3RhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIElmIGxvYWRpbmcgZmFpbHMsIHJlZGlyZWN0IHRvIGluZGV4XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9Y3VzdG9tLWZpbGVzL2luZGV4YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZm9ybVxuICAgICAgICBjdXN0b21GaWxlLmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZm9yIHdoZW4gdGhlIGNvZGUgbW9kZSBjaGFuZ2VzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHNlbGVjdGVkIHZhbHVlIGZyb20gdGhlIGRyb3Bkb3duLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGhlIHNlbGVjdGVkIHRleHQgZnJvbSB0aGUgZHJvcGRvd24uXG4gICAgICovXG4gICAgY2JPbkNoYW5nZU1vZGUodmFsdWUsIHRleHQpe1xuICAgICAgICAvLyBIYW5kbGUgY29kZSB2aXNpYmlsaXR5IGFuZCBjb250ZW50IGJhc2VkIG9uIHRoZSAnbW9kZSdcbiAgICAgICAgc3dpdGNoICh2YWx1ZSkge1xuICAgICAgICAgICAgY2FzZSAnbm9uZSc6XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kdGFiTWVudS50YWIoJ2NoYW5nZSB0YWInLCdvcmlnaW5hbCcpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnb3ZlcnJpZGUnOlxuICAgICAgICAgICAgY2FzZSAnY3VzdG9tJzogIC8vIEN1c3RvbSBtb2RlIGJlaGF2ZXMgbGlrZSBvdmVycmlkZVxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHRhYk1lbnUudGFiKCdjaGFuZ2UgdGFiJywnZWRpdG9yJyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdhcHBlbmQnOlxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHRhYk1lbnUudGFiKCdjaGFuZ2UgdGFiJywnZWRpdG9yJyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdzY3JpcHQnOlxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHRhYk1lbnUudGFiKCdjaGFuZ2UgdGFiJywnZWRpdG9yJyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHRhYk1lbnUudGFiKCdjaGFuZ2UgdGFiJywnb3JpZ2luYWwnKTtcbiAgICAgICAgfVxuICAgICAgICBjdXN0b21GaWxlLmhpZGVTaG93Q29kZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFdmVudCBoYW5kbGVyIGZvciB0YWIgY2hhbmdlcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjdXJyZW50VGFiIC0gVGhlIGN1cnJlbnQgdGFiIHRoYXQgaXMgdmlzaWJsZS5cbiAgICAgKi9cbiAgICBvbkNoYW5nZVRhYihjdXJyZW50VGFiKXtcbiAgICAgICAgY29uc3QgZmlsZVBhdGggPSBjdXN0b21GaWxlLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmaWxlcGF0aCcpO1xuICAgICAgICBzd2l0Y2ggKGN1cnJlbnRUYWIpIHtcbiAgICAgICAgICAgIGNhc2UgJ3Jlc3VsdCc6XG4gICAgICAgICAgICAgICAgJCgnLnRhYltkYXRhLXRhYj1cInJlc3VsdFwiXScpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgRmlsZXNBUEkuZ2V0RmlsZUNvbnRlbnQoZmlsZVBhdGgsIGN1c3RvbUZpbGUuY2JHZXRSZXN1bHRGaWxlQ29udGVudEZyb21TZXJ2ZXIsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ29yaWdpbmFsJzpcbiAgICAgICAgICAgICAgICAkKCcudGFiW2RhdGEtdGFiPVwib3JpZ2luYWxcIl0nKS5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIEZpbGVzQVBJLmdldEZpbGVDb250ZW50KGZpbGVQYXRoLCBjdXN0b21GaWxlLmNiR2V0T3JpZ2luYWxGaWxlQ29udGVudEZyb21TZXJ2ZXIsIHRydWUpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZWRpdG9yJzpcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIHRoZSB2aXNpYmlsaXR5IGFuZCBjb250ZW50IG9mIGNvZGUgYmFzZWQgb24gdGhlICdtb2RlJyBmb3JtIHZhbHVlLlxuICAgICAqIEFkanVzdHMgdGhlIEFjZSBlZGl0b3Igc2V0dGluZ3MgYWNjb3JkaW5nbHkuXG4gICAgICovXG4gICAgaGlkZVNob3dDb2RlKCkge1xuICAgICAgICAvLyBSZXRyaWV2ZSAnbW9kZScgdmFsdWUgZnJvbSB0aGUgZm9ybVxuICAgICAgICBjb25zdCBtb2RlID0gY3VzdG9tRmlsZS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnbW9kZScpO1xuXG4gICAgICAgIC8vIEdldCBjdXJyZW50IGNvbnRlbnQgZnJvbSBlZGl0b3IgKG5vdCBmcm9tIGZvcm0sIGFzIGZvcm0gZG9lc24ndCBoYXZlIGl0IGFueW1vcmUpXG4gICAgICAgIGxldCBjb250ZW50ID0gY3VzdG9tRmlsZS5lZGl0b3IuZ2V0VmFsdWUoKTtcblxuICAgICAgICAvLyBHZXQgdGFiIG1lbnUgaXRlbXNcbiAgICAgICAgY29uc3QgJG9yaWdpbmFsVGFiTWVudUl0ZW0gPSAkKCcuaXRlbVtkYXRhLXRhYj1cIm9yaWdpbmFsXCJdJyk7XG4gICAgICAgIGNvbnN0ICRyZXN1bHRUYWJNZW51SXRlbSA9ICQoJy5pdGVtW2RhdGEtdGFiPVwicmVzdWx0XCJdJyk7XG5cbiAgICAgICAgLy8gSGFuZGxlIGNvZGUgdmlzaWJpbGl0eSBhbmQgY29udGVudCBiYXNlZCBvbiB0aGUgJ21vZGUnXG4gICAgICAgIHN3aXRjaCAobW9kZSkge1xuICAgICAgICAgICAgY2FzZSAnbm9uZSc6XG4gICAgICAgICAgICAgICAgLy8gSWYgJ21vZGUnIGlzICdub25lJywgc2hvdyBvbmx5IHJlc3VsdCBjb2RlIGdlbmVyYXRlZCBhbmQgaGlkZSBlZGl0b3IgYW5kIHJlc3VsdCB2aWV3ZXJcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRlZGl0b3JUYWIuaGlkZSgpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJG9yaWdpbmFsVGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLnZpZXdlck9yaWdpbmFsLm5hdmlnYXRlRmlsZVN0YXJ0KCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kcmVzdWx0VGFiLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAvLyBTaG93L2hpZGUgbWVudSBpdGVtc1xuICAgICAgICAgICAgICAgICRvcmlnaW5hbFRhYk1lbnVJdGVtLnNob3coKTtcbiAgICAgICAgICAgICAgICAkcmVzdWx0VGFiTWVudUl0ZW0uaGlkZSgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnYXBwZW5kJzpcbiAgICAgICAgICAgICAgICAvLyBJZiAnbW9kZScgaXMgJ2FwcGVuZCcsIHNob3cgYWxsIGZpZWxkc1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGVkaXRvclRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kb3JpZ2luYWxUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHJlc3VsdFRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbC5uYXZpZ2F0ZUZpbGVFbmQoKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLnZpZXdlclJlc3VsdC5uYXZpZ2F0ZUZpbGVFbmQoKTtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGFsbCBtZW51IGl0ZW1zXG4gICAgICAgICAgICAgICAgJG9yaWdpbmFsVGFiTWVudUl0ZW0uc2hvdygpO1xuICAgICAgICAgICAgICAgICRyZXN1bHRUYWJNZW51SXRlbS5zaG93KCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdvdmVycmlkZSc6XG4gICAgICAgICAgICAgICAgLy8gSWYgJ21vZGUnIGlzICdvdmVycmlkZScsIHNob3cgZWRpdG9yIGFuZCBoaWRlIG9yaWdpbmFsLCBidXQgc2hvdyByZXN1bHRcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRlZGl0b3JUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJG9yaWdpbmFsVGFiLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRyZXN1bHRUYWIuaGlkZSgpO1xuICAgICAgICAgICAgICAgIC8vIFNob3cvaGlkZSBtZW51IGl0ZW1zXG4gICAgICAgICAgICAgICAgJG9yaWdpbmFsVGFiTWVudUl0ZW0uaGlkZSgpO1xuICAgICAgICAgICAgICAgICRyZXN1bHRUYWJNZW51SXRlbS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdjdXN0b20nOlxuICAgICAgICAgICAgICAgIC8vIEZvciAnY3VzdG9tJyBtb2RlLCBvbmx5IHNob3cgZWRpdG9yIHRhYiAtIHVzZXIgZnVsbHkgY29udHJvbHMgdGhlIGZpbGVcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRlZGl0b3JUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJG9yaWdpbmFsVGFiLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRyZXN1bHRUYWIuaGlkZSgpO1xuICAgICAgICAgICAgICAgIC8vIEhpZGUgb3RoZXIgdGFiIG1lbnUgaXRlbXMgZm9yIGN1c3RvbSBmaWxlc1xuICAgICAgICAgICAgICAgICRvcmlnaW5hbFRhYk1lbnVJdGVtLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAkcmVzdWx0VGFiTWVudUl0ZW0uaGlkZSgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnc2NyaXB0JzpcbiAgICAgICAgICAgICAgICAvLyBJZiAnbW9kZScgaXMgJ3NjcmlwdCcsIHNob3cgYm90aCBzZXJ2ZXIgYW5kIGN1c3RvbSBjb2RlLCBhcHBseSBjdXN0b20gc2NyaXB0IHRvIHRoZSBmaWxlIGNvbnRlbnQgb24gc2VydmVyXG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZWRpdG9yVGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRvcmlnaW5hbFRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kcmVzdWx0VGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGFsbCBtZW51IGl0ZW1zIGZvciBzY3JpcHQgbW9kZVxuICAgICAgICAgICAgICAgICRvcmlnaW5hbFRhYk1lbnVJdGVtLnNob3coKTtcbiAgICAgICAgICAgICAgICAkcmVzdWx0VGFiTWVudUl0ZW0uc2hvdygpO1xuICAgICAgICAgICAgICAgIC8vIEVkaXRvciAtIG9ubHkgc2V0IHRlbXBsYXRlIGlmIGNvbnRlbnQgaXMgZW1wdHlcbiAgICAgICAgICAgICAgICBpZiAoIWNvbnRlbnQgfHwgY29udGVudC50cmltKCkgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgPSBgIyEvYmluL2Jhc2ggXFxuXFxuYDtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgY29uZmlnUGF0aD1cIiQxXCIgIyBQYXRoIHRvIHRoZSBvcmlnaW5hbCBjb25maWcgZmlsZVxcblxcbmA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYCMgRXhhbXBsZSAxOiBSZXBsYWNlIGFsbCB2YWx1ZXMgbWF4X2NvbnRhY3RzID0gNSB0byBtYXhfY29udGFjdHMgPSAxIG9uIHBqc2lwLmNvbmZcXG5gO1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGAjIHNlZCAtaSAncy9tYXhfY29udGFjdHMgPSA1L21heF9jb250YWN0cyA9IDEvZycgXCIkY29uZmlnUGF0aFwiXFxuXFxuYFxuXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYCMgRXhhbXBsZSAyOiBDaGFuZ2UgdmFsdWUgbWF4X2NvbnRhY3RzIG9ubHkgZm9yIHBlZXIgd2l0aCBleHRlbnNpb24gMjI2IG9uIHBqc2lwLmNvbmZcXG5gO1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGAjIHNlZCAtaSAnL15cXFxcWzIyNlxcXFxdJC8sL15cXFxcWy8gcy9tYXhfY29udGFjdHMgPSA1L21heF9jb250YWN0cyA9IDIvJyBcIiRjb25maWdQYXRoXCJcXG5cXG5gXG5cbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgIyBFeGFtcGxlIDM6IEFkZCBlbiBleHRyYSBzdHJpbmcgaW50byBbcGxheWJhY2stZXhpdF0gc2VjdGlvbiBhZnRlciB0aGUgXCJzYW1lID0+IG4sSGFuZ3VwKClcIiBzdHJpbmcgb24gZXh0ZW5zaW9ucy5jb25mXFxuYDtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgIyBzZWQgLWkgJy9eXFxcXFtwbGF5YmFjay1leGl0XFxcXF0kLywvXlxcXFxbLyBzL15cXFxcKFxcXFxzKnNhbWUgPT4gbixIYW5ndXAoKVxcXFwpL1xcXFwxXFxcXG5cXFxcdHNhbWUgPT4gbixOb09wKFwiWW91ciBOb09wIGNvbW1lbnQgaGVyZVwiKS8nIFwiJGNvbmZpZ1BhdGhcIlxcblxcbmA7XG5cbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgIyBBdHRlbnRpb24hIFlvdSB3aWxsIHNlZSBjaGFuZ2VzIGFmdGVyIHRoZSBiYWNrZ3JvdW5kIHdvcmtlciBwcm9jZXNzZXMgdGhlIHNjcmlwdCBvciBhZnRlciByZWJvb3RpbmcgdGhlIHN5c3RlbS4gXFxuYDtcblxuICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IHNldCBjb250ZW50IGlmIHdlIGNyZWF0ZWQgYSB0ZW1wbGF0ZVxuICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXRWYWx1ZShjb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3IuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIGFueSBvdGhlciAnbW9kZScgdmFsdWVzXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBjdXN0b21GaWxlLnZpZXdlck9yaWdpbmFsLnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXRUaGVtZSgnYWNlL3RoZW1lL21vbm9rYWknKTtcblxuICAgICAgICAvLyBEb24ndCBvdmVyd3JpdGUgZWRpdG9yIGNvbnRlbnQgaGVyZSAtIGl0J3MgYWxyZWFkeSBzZXQgY29ycmVjdGx5XG4gICAgICAgIC8vIGN1c3RvbUZpbGUuZWRpdG9yLnNldFZhbHVlKGNvbnRlbnQpO1xuICAgICAgICAvLyBjdXN0b21GaWxlLmVkaXRvci5jbGVhclNlbGVjdGlvbigpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0aGF0IGhhbmRsZXMgdGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBjb250YWluaW5nIHRoZSBmaWxlJ3MgY29udGVudC5cbiAgICAgKiBJdCB3aWxsIHVwZGF0ZSB0aGUgJ3ZpZXdlck9yaWdpbmFsJyB3aXRoIHRoZSBmaWxlJ3MgY29udGVudCBhbmQgYWRqdXN0IHRoZSBjb2RlIGRpc3BsYXkuXG4gICAgICovXG4gICAgY2JHZXRPcmlnaW5hbEZpbGVDb250ZW50RnJvbVNlcnZlcihyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5jb250ZW50ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGFjZVZpZXdlciA9IGN1c3RvbUZpbGUudmlld2VyT3JpZ2luYWw7XG4gICAgICAgICAgICBjb25zdCBzY3JvbGxUb3AgPSBhY2VWaWV3ZXIuc2Vzc2lvbi5nZXRTY3JvbGxUb3AoKTtcbiAgICAgICAgICAgIGFjZVZpZXdlci5zZXNzaW9uLnNldFZhbHVlKHJlc3BvbnNlLmRhdGEuY29udGVudCk7XG4gICAgICAgICAgICBhY2VWaWV3ZXIuc2Vzc2lvbi5zZXRTY3JvbGxUb3Aoc2Nyb2xsVG9wKTtcbiAgICAgICAgfVxuICAgICAgICAkKCcudGFiW2RhdGEtdGFiPVwib3JpZ2luYWxcIl0nKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0aGF0IGhhbmRsZXMgdGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBjb250YWluaW5nIHRoZSBmaWxlJ3MgY29udGVudC5cbiAgICAgKiBJdCB3aWxsIHVwZGF0ZSB0aGUgJ3ZpZXdlclJlc3VsdCcgd2l0aCB0aGUgZmlsZSdzIGNvbnRlbnQgYW5kIGFkanVzdCB0aGUgY29kZSBkaXNwbGF5LlxuICAgICAqL1xuICAgIGNiR2V0UmVzdWx0RmlsZUNvbnRlbnRGcm9tU2VydmVyKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmNvbnRlbnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29uc3QgYWNlVmlld2VyID0gY3VzdG9tRmlsZS52aWV3ZXJSZXN1bHQ7XG4gICAgICAgICAgICBjb25zdCBzY3JvbGxUb3AgPSBhY2VWaWV3ZXIuc2Vzc2lvbi5nZXRTY3JvbGxUb3AoKTtcbiAgICAgICAgICAgIGFjZVZpZXdlci5zZXNzaW9uLnNldFZhbHVlKHJlc3BvbnNlLmRhdGEuY29udGVudCk7XG4gICAgICAgICAgICBhY2VWaWV3ZXIuc2Vzc2lvbi5zZXRTY3JvbGxUb3Aoc2Nyb2xsVG9wKTtcbiAgICAgICAgfVxuICAgICAgICAkKCcudGFiW2RhdGEtdGFiPVwicmVzdWx0XCJdJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgQWNlIGVkaXRvciBpbnN0YW5jZXMgZm9yICdlZGl0b3InIGFuZCAndmlld2Vycycgd2luZG93cy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplQWNlKCkge1xuICAgICAgICAvLyBDYWxjdWxhdGUgYWNlIGVkaXRvciBoZWlnaHQgYW5kIHJvd3MgY291bnRcbiAgICAgICAgY29uc3QgYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gNDc1O1xuICAgICAgICBjb25zdCByb3dzQ291bnQgPSBNYXRoLnJvdW5kKGFjZUhlaWdodCAvIDE2LjMpO1xuXG4gICAgICAgIC8vIFNldCBtaW5pbXVtIGhlaWdodCBmb3IgdGhlIGNvZGUgc2VjdGlvbnMgb24gd2luZG93IGxvYWRcbiAgICAgICAgJCgnLmFwcGxpY2F0aW9uLWNvZGUnKS5jc3MoJ21pbi1oZWlnaHQnLCBgJHthY2VIZWlnaHR9cHhgKTtcblxuICAgICAgICAvLyBBQ0Ugd2luZG93IGZvciB0aGUgb3JpZ2luYWwgZmlsZSBjb250ZW50LlxuICAgICAgICBjb25zdCBJbmlNb2RlID0gYWNlLnJlcXVpcmUoJ2FjZS9tb2RlL2p1bGlhJykuTW9kZTtcbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbCA9IGFjZS5lZGl0KCdjb25maWctZmlsZS1vcmlnaW5hbCcpO1xuICAgICAgICBjdXN0b21GaWxlLnZpZXdlck9yaWdpbmFsLnNlc3Npb24uc2V0TW9kZShuZXcgSW5pTW9kZSgpKTtcbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbC5zZXRUaGVtZSgnYWNlL3RoZW1lL21vbm9rYWknKTtcbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbC5zZXRPcHRpb25zKHtcbiAgICAgICAgICAgIHNob3dQcmludE1hcmdpbjogZmFsc2UsXG4gICAgICAgICAgICByZWFkT25seTogdHJ1ZSxcbiAgICAgICAgICAgIG1pbkxpbmVzOiByb3dzQ291bnRcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQUNFIHdpbmRvdyBmb3IgdGhlIHJlc3VsdGVkIGZpbGUgY29udGVudC5cbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJSZXN1bHQgPSBhY2UuZWRpdCgnY29uZmlnLWZpbGUtcmVzdWx0Jyk7XG4gICAgICAgIGN1c3RvbUZpbGUudmlld2VyUmVzdWx0LnNlc3Npb24uc2V0TW9kZShuZXcgSW5pTW9kZSgpKTtcbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJSZXN1bHQuc2V0VGhlbWUoJ2FjZS90aGVtZS9tb25va2FpJyk7XG4gICAgICAgIGN1c3RvbUZpbGUudmlld2VyUmVzdWx0LnNldE9wdGlvbnMoe1xuICAgICAgICAgICAgc2hvd1ByaW50TWFyZ2luOiBmYWxzZSxcbiAgICAgICAgICAgIHJlYWRPbmx5OiB0cnVlLFxuICAgICAgICAgICAgbWluTGluZXM6IHJvd3NDb3VudFxuICAgICAgICB9KTtcblxuXG4gICAgICAgIC8vIEFDRSB3aW5kb3cgZm9yIHRoZSB1c2VyIGVkaXRvci5cbiAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3IgPSBhY2UuZWRpdCgndXNlci1lZGl0LWNvbmZpZycpO1xuICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXNzaW9uLnNldE1vZGUobmV3IEluaU1vZGUoKSk7XG4gICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXRPcHRpb25zKHtcbiAgICAgICAgICAgIHNob3dQcmludE1hcmdpbjogZmFsc2UsXG4gICAgICAgICAgICBtaW5MaW5lczogcm93c0NvdW50LFxuICAgICAgICB9KTtcbiAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2Vzc2lvbi5vbignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgLy8gVHJpZ2dlciBjaGFuZ2UgZXZlbnQgdG8gYWNrbm93bGVkZ2UgdGhlIG1vZGlmaWNhdGlvblxuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyAgQWRkIGhhbmRsZXJzIGZvciBmdWxsc2NyZWVuIG1vZGUgYnV0dG9uc1xuICAgICAgICAkKCcuZnVsbHNjcmVlbi10b2dnbGUtYnRuJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY29uc3QgY29udGFpbmVyID0gJCh0aGlzKS5zaWJsaW5ncygnLmFwcGxpY2F0aW9uLWNvZGUnKVswXTtcbiAgICAgICAgICAgIGN1c3RvbUZpbGUudG9nZ2xlRnVsbFNjcmVlbihjb250YWluZXIpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgaGFuZGxlciB0byByZWNhbGN1bGF0ZSBzaXplcyB3aGVuIGV4aXRpbmcgZnVsbHNjcmVlbiBtb2RlXG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2Z1bGxzY3JlZW5jaGFuZ2UnLCBjdXN0b21GaWxlLmFkanVzdEVkaXRvckhlaWdodCk7XG5cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEVuYWJsZS9kaXNhYmxlIGZ1bGxzY3JlZW4gbW9kZSBmb3IgYSBzcGVjaWZpYyBibG9jay5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGNvbnRhaW5lciAtIFRoZSBjb250YWluZXIgdG8gZXhwYW5kIHRvIGZ1bGxzY3JlZW4uXG4gICAgICovXG4gICAgdG9nZ2xlRnVsbFNjcmVlbihjb250YWluZXIpIHtcbiAgICAgICAgaWYgKCFkb2N1bWVudC5mdWxsc2NyZWVuRWxlbWVudCkge1xuICAgICAgICAgICAgY29udGFpbmVyLnJlcXVlc3RGdWxsc2NyZWVuKCkuY2F0Y2goZXJyID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGBFcnJvciBhdHRlbXB0aW5nIHRvIGVuYWJsZSBmdWxsLXNjcmVlbiBtb2RlOiAke2Vyci5tZXNzYWdlfWApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkb2N1bWVudC5leGl0RnVsbHNjcmVlbigpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlY2FsY3VsYXRlIGVkaXRvciBoZWlnaHRzIHdoZW4gdGhlIHNjcmVlbiBtb2RlIGNoYW5nZXMuXG4gICAgICovXG4gICAgYWRqdXN0RWRpdG9ySGVpZ2h0KCkge1xuICAgICAgICBjb25zdCBlZGl0b3JzID0gW2N1c3RvbUZpbGUudmlld2VyT3JpZ2luYWwsIGN1c3RvbUZpbGUudmlld2VyUmVzdWx0LCBjdXN0b21GaWxlLmVkaXRvcl07XG4gICAgICAgIGVkaXRvcnMuZm9yRWFjaChlZGl0b3IgPT4ge1xuICAgICAgICAgICAgaWYgKGVkaXRvcikge1xuICAgICAgICAgICAgICAgIGVkaXRvci5yZXNpemUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IGN1c3RvbUZpbGUuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXG4gICAgICAgIC8vIEdldCBtb2RlIGZyb20gZm9ybVxuICAgICAgICBsZXQgbW9kZSA9IGN1c3RvbUZpbGUuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ21vZGUnKTtcblxuICAgICAgICAvLyBJTVBPUlRBTlQ6IENoZWNrIGlmIGRyb3Bkb3duIGlzIGhpZGRlbiAoaW5kaWNhdG9yIG9mIGN1c3RvbSBmaWxlKVxuICAgICAgICAvLyBXaGVuIGRyb3Bkb3duIGlzIGhpZGRlbiwgaXQgbWlnaHQgcmV0dXJuIGluY29ycmVjdCB2YWx1ZVxuICAgICAgICBpZiAoY3VzdG9tRmlsZS4kbW9kZURyb3BEb3duLnBhcmVudCgpLnBhcmVudCgpLmlzKCc6aGlkZGVuJykpIHtcbiAgICAgICAgICAgIC8vIFRoaXMgaXMgYSBjdXN0b20gZmlsZSwgZm9yY2UgbW9kZSB0byBiZSAnY3VzdG9tJ1xuICAgICAgICAgICAgbW9kZSA9ICdjdXN0b20nO1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEubW9kZSA9ICdjdXN0b20nO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0N1c3RvbSBmaWxlIGRldGVjdGVkIChkcm9wZG93biBoaWRkZW4pLCBmb3JjaW5nIG1vZGUgdG8gY3VzdG9tJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGRpdGlvbmFsIGNoZWNrOiBFbnN1cmUgbW9kZSBzdGF5cyAnY3VzdG9tJyBmb3IgY3VzdG9tIGZpbGVzXG4gICAgICAgIGlmIChtb2RlID09PSAnY3VzdG9tJyB8fCAocmVzdWx0LmRhdGEubW9kZSA9PT0gJ2N1c3RvbScpKSB7XG4gICAgICAgICAgICAvLyBGb3JjZSBtb2RlIHRvIHN0YXkgJ2N1c3RvbScgZm9yIGN1c3RvbSBmaWxlc1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEubW9kZSA9ICdjdXN0b20nO1xuICAgICAgICAgICAgbW9kZSA9ICdjdXN0b20nO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gR2V0IGNvbnRlbnQgZnJvbSBBY2UgZWRpdG9yIGJhc2VkIG9uIG1vZGVcbiAgICAgICAgc3dpdGNoIChtb2RlKSB7XG4gICAgICAgICAgICBjYXNlICdhcHBlbmQnOlxuICAgICAgICAgICAgY2FzZSAnb3ZlcnJpZGUnOlxuICAgICAgICAgICAgY2FzZSAnY3VzdG9tJzpcbiAgICAgICAgICAgIGNhc2UgJ3NjcmlwdCc6XG4gICAgICAgICAgICAgICAgLy8gR2V0IGNvbnRlbnQgZnJvbSBBY2UgZWRpdG9yIChub3QgYmFzZTY0IGVuY29kZWQgeWV0KVxuICAgICAgICAgICAgICAgIGlmICghY3VzdG9tRmlsZS5lZGl0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRWRpdG9yIGlzIG5vdCBpbml0aWFsaXplZCEnKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmRhdGEuY29udGVudCA9ICcnO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVkaXRvckNvbnRlbnQgPSBjdXN0b21GaWxlLmVkaXRvci5nZXRWYWx1ZSgpO1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQuZGF0YS5jb250ZW50ID0gZWRpdG9yQ29udGVudDtcblxuICAgICAgICAgICAgICAgICAgICAvLyBEZWJ1ZzogbG9nIGNvbnRlbnQgZm9yIGN1c3RvbSBtb2RlXG4gICAgICAgICAgICAgICAgICAgIGlmIChtb2RlID09PSAnY3VzdG9tJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1NhdmluZyBjdXN0b20gZmlsZSB3aXRoIGNvbnRlbnQgbGVuZ3RoOicsIGVkaXRvckNvbnRlbnQubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdGaXJzdCAxMDAgY2hhcnM6JywgZWRpdG9yQ29udGVudC5zdWJzdHJpbmcoMCwgMTAwKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdub25lJzpcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgLy8gRm9yICdub25lJyBtb2RlLCBjbGVhciB0aGUgY29udGVudFxuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhLmNvbnRlbnQgPSAnJztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuXG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBjdXN0b21GaWxlLiRmb3JtT2JqO1xuXG4gICAgICAgIC8vIENvbmZpZ3VyZSBSRVNUIEFQSSBzZXR0aW5ncyBmb3IgRm9ybVxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzID0ge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGFwaU9iamVjdDogY3VzdG9tRmlsZXNBUEksXG4gICAgICAgICAgICBzYXZlTWV0aG9kOiAnc2F2ZScsICAvLyBXaWxsIHVzZSB0aGUgc21hcnQgc2F2ZSBtZXRob2QgdGhhdCBkZXRlcm1pbmVzIGNyZWF0ZS91cGRhdGVcbiAgICAgICAgICAgIGF1dG9EZXRlY3RNZXRob2Q6IGZhbHNlLCAgLy8gV2UgaGFuZGxlIHRoaXMgaW4gb3VyIHNhdmUgbWV0aG9kXG4gICAgICAgICAgICBpZEZpZWxkOiAnaWQnXG4gICAgICAgIH07XG5cbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gY3VzdG9tRmlsZS52YWxpZGF0ZVJ1bGVzOyAvLyBGb3JtIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gY3VzdG9tRmlsZS5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gY3VzdG9tRmlsZS5jYkFmdGVyU2VuZEZvcm07IC8vIENhbGxiYWNrIGFmdGVyIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxufTtcblxuLy8gSW5pdGlhbGl6ZSB0aGUgY3VzdG9tIGZpbGVzIG1vZGlmeSBmb3JtIHdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LlxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGN1c3RvbUZpbGUuaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==