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

/* global globalRootUrl,globalTranslate, ace, Form, PbxApi, customFilesAPI, PbxApiClient */

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
      customFilesAPI.getDefault(function (response) {
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
    var data = {
      filename: filePath,
      needOriginal: true,
      needLogfile: false
    };

    switch (currentTab) {
      case 'result':
        data.needOriginal = false;
        $('.tab[data-tab="result"]').addClass('loading');
        PbxApi.GetFileContent(data, customFile.cbGetResultFileContentFromServer);
        break;

      case 'original':
        data.needOriginal = true;
        $('.tab[data-tab="original"]').addClass('loading');
        PbxApi.GetFileContent(data, customFile.cbGetOriginalFileContentFromServer);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DdXN0b21GaWxlcy9jdXN0b20tZmlsZXMtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbImN1c3RvbUZpbGUiLCIkZm9ybU9iaiIsIiQiLCIkdGFiTWVudSIsIiRtb2RlRHJvcERvd24iLCIkb3JpZ2luYWxUYWIiLCIkZWRpdG9yVGFiIiwiJHJlc3VsdFRhYiIsIiRtYWluQ29udGFpbmVyIiwiJGZpbGVwYXRoSW5wdXQiLCIkZmlsZXBhdGhGaWVsZCIsImVkaXRvciIsInZpZXdlck9yaWdpbmFsIiwidmlld2VyUmVzdWx0IiwidmFsaWRhdGVSdWxlcyIsIm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiY2ZfVmFsaWRhdGVOYW1lSXNFbXB0eSIsInVwZGF0ZUZpbGVwYXRoRmllbGRTdGF0ZSIsIm1vZGUiLCJmb3JtIiwiaXNVc2VyQ3JlYXRlZCIsImZpbGVJZCIsInByb3AiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwicGFyZW50IiwiaGlkZSIsInNob3ciLCJpbml0aWFsaXplIiwidGFiIiwib25WaXNpYmxlIiwib25DaGFuZ2VUYWIiLCJpbml0aWFsaXplQWNlIiwibGVuZ3RoIiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsImNiT25DaGFuZ2VNb2RlIiwidXJsUGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwid2luZG93IiwibG9jYXRpb24iLCJzZWFyY2giLCJ1cmxJZCIsInBhdGhuYW1lIiwibWF0Y2giLCJjdXN0b21GaWxlc0FQSSIsImdldERlZmF1bHQiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJjb250ZW50IiwiZGVjb2RlZENvbnRlbnQiLCJhdG9iIiwic2V0VmFsdWUiLCJlIiwiY2xlYXJTZWxlY3Rpb24iLCJnZXRSZWNvcmQiLCJiYXNlNjRDb250ZW50IiwiZm9ybURhdGEiLCJnbG9iYWxSb290VXJsIiwiaW5pdGlhbGl6ZUZvcm0iLCJ2YWx1ZSIsInRleHQiLCJoaWRlU2hvd0NvZGUiLCJjdXJyZW50VGFiIiwiZmlsZVBhdGgiLCJmaWxlbmFtZSIsIm5lZWRPcmlnaW5hbCIsIm5lZWRMb2dmaWxlIiwiUGJ4QXBpIiwiR2V0RmlsZUNvbnRlbnQiLCJjYkdldFJlc3VsdEZpbGVDb250ZW50RnJvbVNlcnZlciIsImNiR2V0T3JpZ2luYWxGaWxlQ29udGVudEZyb21TZXJ2ZXIiLCJnZXRWYWx1ZSIsIiRvcmlnaW5hbFRhYk1lbnVJdGVtIiwiJHJlc3VsdFRhYk1lbnVJdGVtIiwibmF2aWdhdGVGaWxlU3RhcnQiLCJuYXZpZ2F0ZUZpbGVFbmQiLCJ0cmltIiwic2V0VGhlbWUiLCJ1bmRlZmluZWQiLCJhY2VWaWV3ZXIiLCJzY3JvbGxUb3AiLCJzZXNzaW9uIiwiZ2V0U2Nyb2xsVG9wIiwic2V0U2Nyb2xsVG9wIiwiYWNlSGVpZ2h0IiwiaW5uZXJIZWlnaHQiLCJyb3dzQ291bnQiLCJNYXRoIiwicm91bmQiLCJjc3MiLCJJbmlNb2RlIiwiYWNlIiwicmVxdWlyZSIsIk1vZGUiLCJlZGl0Iiwic2V0TW9kZSIsInNldE9wdGlvbnMiLCJzaG93UHJpbnRNYXJnaW4iLCJyZWFkT25seSIsIm1pbkxpbmVzIiwib24iLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJjb250YWluZXIiLCJzaWJsaW5ncyIsInRvZ2dsZUZ1bGxTY3JlZW4iLCJkb2N1bWVudCIsImFkZEV2ZW50TGlzdGVuZXIiLCJhZGp1c3RFZGl0b3JIZWlnaHQiLCJmdWxsc2NyZWVuRWxlbWVudCIsInJlcXVlc3RGdWxsc2NyZWVuIiwiZXJyIiwiY29uc29sZSIsImVycm9yIiwibWVzc2FnZSIsImV4aXRGdWxsc2NyZWVuIiwiZWRpdG9ycyIsImZvckVhY2giLCJyZXNpemUiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJpcyIsImxvZyIsImVkaXRvckNvbnRlbnQiLCJzdWJzdHJpbmciLCJjYkFmdGVyU2VuZEZvcm0iLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwi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V0FBT0YsTUFBUDtBQUNILEdBdmtCYzs7QUF5a0JmO0FBQ0o7QUFDQTtBQUNBO0FBQ0krRSxFQUFBQSxlQTdrQmUsMkJBNmtCQ2hGLFFBN2tCRCxFQTZrQlcsQ0FFekIsQ0Eva0JjOztBQWdsQmY7QUFDSjtBQUNBO0FBQ0lhLEVBQUFBLGNBbmxCZSw0QkFtbEJFO0FBQ2IyQyxJQUFBQSxJQUFJLENBQUMzRyxRQUFMLEdBQWdCRCxVQUFVLENBQUNDLFFBQTNCLENBRGEsQ0FHYjs7QUFDQTJHLElBQUFBLElBQUksQ0FBQ3lCLFdBQUwsR0FBbUI7QUFDZkMsTUFBQUEsT0FBTyxFQUFFLElBRE07QUFFZkMsTUFBQUEsU0FBUyxFQUFFckYsY0FGSTtBQUdmc0YsTUFBQUEsVUFBVSxFQUFFLE1BSEc7QUFHTTtBQUNyQkMsTUFBQUEsZ0JBQWdCLEVBQUUsS0FKSDtBQUlXO0FBQzFCQyxNQUFBQSxPQUFPLEVBQUU7QUFMTSxLQUFuQjtBQVFBOUIsSUFBQUEsSUFBSSxDQUFDOUYsYUFBTCxHQUFxQmQsVUFBVSxDQUFDYyxhQUFoQyxDQVphLENBWWtDOztBQUMvQzhGLElBQUFBLElBQUksQ0FBQ2tCLGdCQUFMLEdBQXdCOUgsVUFBVSxDQUFDOEgsZ0JBQW5DLENBYmEsQ0Fhd0M7O0FBQ3JEbEIsSUFBQUEsSUFBSSxDQUFDd0IsZUFBTCxHQUF1QnBJLFVBQVUsQ0FBQ29JLGVBQWxDLENBZGEsQ0Fjc0M7O0FBQ25EeEIsSUFBQUEsSUFBSSxDQUFDM0UsVUFBTDtBQUNIO0FBbm1CYyxDQUFuQixDLENBc21CQTs7QUFDQS9CLENBQUMsQ0FBQytHLFFBQUQsQ0FBRCxDQUFZMEIsS0FBWixDQUFrQixZQUFNO0FBQ3BCM0ksRUFBQUEsVUFBVSxDQUFDaUMsVUFBWDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIGFjZSwgRm9ybSwgUGJ4QXBpLCBjdXN0b21GaWxlc0FQSSwgUGJ4QXBpQ2xpZW50ICovXG5cblxuLyoqXG4gKiBNb2R1bGUgY3VzdG9tRmlsZVxuICogVGhpcyBtb2R1bGUgbWFuYWdlcyBmaWxlIGludGVyYWN0aW9ucyBpbiBhIFVJLCBzdWNoIGFzIGxvYWRpbmcgZmlsZSBjb250ZW50IGZyb20gYSBzZXJ2ZXIgYW5kIGhhbmRsaW5nIHVzZXIgaW5wdXQuXG4gKiBAbW9kdWxlIGN1c3RvbUZpbGVcbiAqL1xuY29uc3QgY3VzdG9tRmlsZSA9IHtcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNjdXN0b20tZmlsZS1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdGFiIG1lbnUuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkdGFiTWVudTogJCgnI2N1c3RvbS1maWxlcy1tZW51IC5pdGVtJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgbW9kZSBzZWxlY3QuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbW9kZURyb3BEb3duOiAkKCcjbW9kZS1kcm9wZG93bicpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHRhYiB3aXRoIG9yaWdpbmFsIGZpbGUgY29udGVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRvcmlnaW5hbFRhYjogJCgnYVtkYXRhLXRhYj1cIm9yaWdpbmFsXCJdJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdGFiIHdpdGggdXNlciBjb250ZW50L3NjcmlwdCBlZGl0b3IuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZWRpdG9yVGFiOiAkKCdhW2RhdGEtdGFiPVwiZWRpdG9yXCJdJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdGFiIHdpdGggcmVzdWx0ZWQgZmlsZSBjb250ZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHJlc3VsdFRhYjogJCgnYVtkYXRhLXRhYj1cInJlc3VsdFwiXScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IGVsZW1lbnQgZm9yIHRoZSBtYWluIGNvbnRlbnQgY29udGFpbmVyLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG1haW5Db250YWluZXI6ICQoJyNtYWluLWNvbnRlbnQtY29udGFpbmVyJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZmlsZXBhdGggaW5wdXQgZmllbGQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZmlsZXBhdGhJbnB1dDogJCgnI2ZpbGVwYXRoJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZmlsZXBhdGggZmllbGQgY29udGFpbmVyLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZpbGVwYXRoRmllbGQ6ICQoJyNmaWxlcGF0aC1maWVsZCcpLFxuXG5cbiAgICAvKipcbiAgICAgKiBBY2UgZWRpdG9yIGluc3RhbmNlc1xuICAgICAqIGBlZGl0b3JgIGlzIGZvciBpbnB1dCBhbmQgYHZpZXdlcnNgIGlzIGZvciBkaXNwbGF5IGNvZGUgZnJvbSBzZXJ2ZXJcbiAgICAgKi9cbiAgICBlZGl0b3I6ICcnLFxuICAgIHZpZXdlck9yaWdpbmFsOiAnJyxcbiAgICB2aWV3ZXJSZXN1bHQ6ICcnLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIG5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdmaWxlcGF0aCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuY2ZfVmFsaWRhdGVOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlcyB0aGUgZmlsZXBhdGggZmllbGQgc3RhdGUgYmFzZWQgb24gd2hldGhlciB0aGUgZmlsZSBpcyB1c2VyLWNyZWF0ZWQgKE1PREVfQ1VTVE9NKSBvciBzeXN0ZW0tbWFuYWdlZC5cbiAgICAgKiBVc2VyLWNyZWF0ZWQgZmlsZXMgaGF2ZSBlZGl0YWJsZSBmaWxlcGF0aCBidXQgY2Fubm90IGJlIGNyZWF0ZWQgKG9ubHkgZm9yIG5ldyBmaWxlcyksXG4gICAgICogc3lzdGVtLW1hbmFnZWQgZmlsZXMgaGF2ZSByZWFkLW9ubHkgZmlsZXBhdGguXG4gICAgICovXG4gICAgdXBkYXRlRmlsZXBhdGhGaWVsZFN0YXRlKCkge1xuICAgICAgICBjb25zdCBtb2RlID0gY3VzdG9tRmlsZS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnbW9kZScpO1xuICAgICAgICBjb25zdCBpc1VzZXJDcmVhdGVkID0gbW9kZSA9PT0gJ2N1c3RvbSc7XG4gICAgICAgIGNvbnN0IGZpbGVJZCA9IGN1c3RvbUZpbGUuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2lkJyk7XG5cbiAgICAgICAgaWYgKGlzVXNlckNyZWF0ZWQpIHtcbiAgICAgICAgICAgIGlmICghZmlsZUlkIHx8IGZpbGVJZCA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAvLyBOZXcgY3VzdG9tIGZpbGUgLSBmaWxlcGF0aCBpcyBlZGl0YWJsZVxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGZpbGVwYXRoSW5wdXQucHJvcCgncmVhZG9ubHknLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZmlsZXBhdGhGaWVsZC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRXhpc3RpbmcgY3VzdG9tIGZpbGUgLSBmaWxlcGF0aCBpcyByZWFkLW9ubHkgKGNhbm5vdCBiZSBjaGFuZ2VkIGFmdGVyIGNyZWF0aW9uKVxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGZpbGVwYXRoSW5wdXQucHJvcCgncmVhZG9ubHknLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRmaWxlcGF0aEZpZWxkLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgLy8gQWx3YXlzIGhpZGUgbW9kZSBzZWxlY3RvciBmb3IgY3VzdG9tIGZpbGVzXG4gICAgICAgICAgICBjdXN0b21GaWxlLiRtb2RlRHJvcERvd24ucGFyZW50KCkucGFyZW50KCkuaGlkZSgpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gU3lzdGVtLW1hbmFnZWQgZmlsZSAtIGZpbGVwYXRoIGlzIGFsd2F5cyByZWFkLW9ubHlcbiAgICAgICAgICAgIGN1c3RvbUZpbGUuJGZpbGVwYXRoSW5wdXQucHJvcCgncmVhZG9ubHknLCB0cnVlKTtcbiAgICAgICAgICAgIGN1c3RvbUZpbGUuJGZpbGVwYXRoRmllbGQuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAvLyBTaG93IG1vZGUgc2VsZWN0b3IgZm9yIHN5c3RlbSBmaWxlc1xuICAgICAgICAgICAgY3VzdG9tRmlsZS4kbW9kZURyb3BEb3duLnBhcmVudCgpLnBhcmVudCgpLnNob3coKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgY3VzdG9tRmlsZSBtb2R1bGUuXG4gICAgICogU2V0cyB1cCB0aGUgZHJvcGRvd24sIGluaXRpYWxpemVzIEFjZSBlZGl0b3IsIGZvcm0sIGFuZCByZXRyaWV2ZXMgZmlsZSBjb250ZW50IGZyb20gdGhlIHNlcnZlci5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgalF1ZXJ5IG9iamVjdHMgYWZ0ZXIgRE9NIGlzIHJlYWR5XG4gICAgICAgIGN1c3RvbUZpbGUuJGZpbGVwYXRoSW5wdXQgPSAkKCcjZmlsZXBhdGgnKTtcbiAgICAgICAgY3VzdG9tRmlsZS4kZmlsZXBhdGhGaWVsZCA9ICQoJyNmaWxlcGF0aC1maWVsZCcpO1xuICAgICAgICBjdXN0b21GaWxlLiRtb2RlRHJvcERvd24gPSAkKCcjbW9kZS1kcm9wZG93bicpO1xuXG4gICAgICAgIC8vIEVuYWJsZSB0YWIgbmF2aWdhdGlvbiB3aXRoIGhpc3Rvcnkgc3VwcG9ydFxuICAgICAgICBjdXN0b21GaWxlLiR0YWJNZW51LnRhYih7XG4gICAgICAgICAgICBvblZpc2libGU6IGN1c3RvbUZpbGUub25DaGFuZ2VUYWJcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY3VzdG9tRmlsZS4kbWFpbkNvbnRhaW5lci5yZW1vdmVDbGFzcygnY29udGFpbmVyJyk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBBY2UgZWRpdG9yXG4gICAgICAgIGN1c3RvbUZpbGUuaW5pdGlhbGl6ZUFjZSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgb3IgcmVpbml0aWFsaXplIGRyb3Bkb3duXG4gICAgICAgIGlmIChjdXN0b21GaWxlLiRtb2RlRHJvcERvd24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY3VzdG9tRmlsZS4kbW9kZURyb3BEb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogY3VzdG9tRmlsZS5jYk9uQ2hhbmdlTW9kZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBHZXQgZmlsZSBJRCBmcm9tIFVSTCBvciBmb3JtXG4gICAgICAgIGNvbnN0IHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG4gICAgICAgIGNvbnN0IHVybElkID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLm1hdGNoKC9tb2RpZnlcXC8oXFxkKykvKTtcbiAgICAgICAgY29uc3QgZmlsZUlkID0gdXJsSWQgPyB1cmxJZFsxXSA6IGN1c3RvbUZpbGUuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2lkJyk7XG5cbiAgICAgICAgaWYgKCFmaWxlSWQgfHwgZmlsZUlkID09PSAnJykge1xuICAgICAgICAgICAgLy8gTG9hZCBkZWZhdWx0IHZhbHVlcyBmb3IgbmV3IGN1c3RvbSBmaWxlXG4gICAgICAgICAgICBjdXN0b21GaWxlc0FQSS5nZXREZWZhdWx0KChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTZXQgZGVmYXVsdCB2YWx1ZXMgdG8gZm9ybSBmaWVsZHNcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWVzJywgcmVzcG9uc2UuZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRm9yIG5ldyBmaWxlcyB3aXRoIE1PREVfQ1VTVE9NXG4gICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLm1vZGUgPT09ICdjdXN0b20nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBNYWtlIGZpbGVwYXRoIGVkaXRhYmxlIGZvciBuZXcgY3VzdG9tIGZpbGVzXG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRmaWxlcGF0aElucHV0LnByb3AoJ3JlYWRvbmx5JywgZmFsc2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZmlsZXBhdGhGaWVsZC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSU1QT1JUQU5UOiBTZXQgbW9kZSB2YWx1ZSB0byAnY3VzdG9tJyBpbiBkcm9wZG93biBiZWZvcmUgaGlkaW5nXG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRtb2RlRHJvcERvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsICdjdXN0b20nKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSGlkZSBtb2RlIHNlbGVjdG9yIGZvciBjdXN0b20gZmlsZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJG1vZGVEcm9wRG93bi5wYXJlbnQoKS5wYXJlbnQoKS5oaWRlKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNob3cgb25seSBlZGl0b3IgdGFiIGZvciBjdXN0b20gbW9kZVxuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kdGFiTWVudS50YWIoJ2NoYW5nZSB0YWInLCAnZWRpdG9yJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRlZGl0b3JUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kb3JpZ2luYWxUYWIuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kcmVzdWx0VGFiLmhpZGUoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSGlkZSBvdGhlciB0YWIgbWVudSBpdGVtc1xuICAgICAgICAgICAgICAgICAgICAgICAgJCgnLml0ZW1bZGF0YS10YWI9XCJvcmlnaW5hbFwiXScpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoJy5pdGVtW2RhdGEtdGFiPVwicmVzdWx0XCJdJykuaGlkZSgpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGVtcHR5IGNvbnRlbnQgaW4gZWRpdG9yIGZvciBuZXcgY3VzdG9tIGZpbGVzXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5jb250ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgZGVmYXVsdCBjb250ZW50IHByb3ZpZGVkIChiYXNlNjQpLCBkZWNvZGUgaXRcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkZWNvZGVkQ29udGVudCA9IGF0b2IocmVzcG9uc2UuZGF0YS5jb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2V0VmFsdWUoZGVjb2RlZENvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXRWYWx1ZShyZXNwb25zZS5kYXRhLmNvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2V0IGVtcHR5IGNvbnRlbnQgZm9yIG5ldyBjdXN0b20gZmlsZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLnNldFZhbHVlKCcnKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGb3Igb3RoZXIgbW9kZXMsIHVzZSBzdGFuZGFyZCBiZWhhdmlvclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgbW9kZSA9IHJlc3BvbnNlLmRhdGEubW9kZSB8fCAnbm9uZSc7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRtb2RlRHJvcERvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIG1vZGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5jYk9uQ2hhbmdlTW9kZShtb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUudXBkYXRlRmlsZXBhdGhGaWVsZFN0YXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIExvYWQgZXhpc3RpbmcgZmlsZSBkYXRhIHZpYSBSRVNUIEFQSVxuICAgICAgICAgICAgY3VzdG9tRmlsZXNBUEkuZ2V0UmVjb3JkKGZpbGVJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFN0b3JlIGJhc2U2NCBjb250ZW50IHNlcGFyYXRlbHkgYW5kIHJlbW92ZSBmcm9tIGZvcm0gZGF0YVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBiYXNlNjRDb250ZW50ID0gcmVzcG9uc2UuZGF0YS5jb250ZW50O1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFJlbW92ZSBjb250ZW50IGZyb20gcmVzcG9uc2UgYmVmb3JlIHNldHRpbmcgZm9ybSB2YWx1ZXNcbiAgICAgICAgICAgICAgICAgICAgLy8gKGNvbnRlbnQgd2lsbCBiZSB0YWtlbiBmcm9tIEFDRSBlZGl0b3Igb24gc2F2ZSlcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZm9ybURhdGEgPSB7Li4ucmVzcG9uc2UuZGF0YX07XG4gICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBmb3JtRGF0YS5jb250ZW50O1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCBmb3JtIHZhbHVlcyBmcm9tIEFQSSByZXNwb25zZSAod2l0aG91dCBjb250ZW50KVxuICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZXMnLCBmb3JtRGF0YSk7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRGVjb2RlIGJhc2U2NCBjb250ZW50IGFuZCBzZXQgaW4gZWRpdG9yXG4gICAgICAgICAgICAgICAgICAgIGlmIChiYXNlNjRDb250ZW50KSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlY29kZWRDb250ZW50ID0gYXRvYihiYXNlNjRDb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXRWYWx1ZShkZWNvZGVkQ29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3IuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIElmIGJhc2U2NCBkZWNvZGUgZmFpbHMsIHVzZSBjb250ZW50IGFzLWlzXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2V0VmFsdWUoYmFzZTY0Q29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3IuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCBtb2RlIGFuZCB0cmlnZ2VyIFVJIHVwZGF0ZVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBtb2RlID0gcmVzcG9uc2UuZGF0YS5tb2RlIHx8ICdub25lJztcblxuICAgICAgICAgICAgICAgICAgICBpZiAobW9kZSA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBleGlzdGluZyBjdXN0b20gZmlsZXMgLSBmaWxlcGF0aCBpcyByZWFkLW9ubHlcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGZpbGVwYXRoSW5wdXQucHJvcCgncmVhZG9ubHknLCB0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGZpbGVwYXRoRmllbGQuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIElNUE9SVEFOVDogU2V0IG1vZGUgdmFsdWUgdG8gJ2N1c3RvbScgaW4gZHJvcGRvd24gYmVmb3JlIGhpZGluZ1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kbW9kZURyb3BEb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCAnY3VzdG9tJyk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEhpZGUgbW9kZSBzZWxlY3RvciBmb3IgY3VzdG9tIGZpbGVzIC0gdGhleSBjYW5ub3QgY2hhbmdlIG1vZGVcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJG1vZGVEcm9wRG93bi5wYXJlbnQoKS5wYXJlbnQoKS5oaWRlKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIFNob3cgb25seSBlZGl0b3IgdGFiIGZvciBjdXN0b20gbW9kZVxuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kdGFiTWVudS50YWIoJ2NoYW5nZSB0YWInLCAnZWRpdG9yJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRlZGl0b3JUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kb3JpZ2luYWxUYWIuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kcmVzdWx0VGFiLmhpZGUoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSGlkZSBvdGhlciB0YWIgbWVudSBpdGVtc1xuICAgICAgICAgICAgICAgICAgICAgICAgJCgnLml0ZW1bZGF0YS10YWI9XCJvcmlnaW5hbFwiXScpLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICQoJy5pdGVtW2RhdGEtdGFiPVwicmVzdWx0XCJdJykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRm9yIHN5c3RlbSBmaWxlcyAtIHVzZSBzdGFuZGFyZCBiZWhhdmlvclxuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kbW9kZURyb3BEb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBtb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuY2JPbkNoYW5nZU1vZGUobW9kZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLnVwZGF0ZUZpbGVwYXRoRmllbGRTdGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gSWYgbG9hZGluZyBmYWlscywgcmVkaXJlY3QgdG8gaW5kZXhcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1jdXN0b20tZmlsZXMvaW5kZXhgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtXG4gICAgICAgIGN1c3RvbUZpbGUuaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmb3Igd2hlbiB0aGUgY29kZSBtb2RlIGNoYW5nZXMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdmFsdWUgLSBUaGUgc2VsZWN0ZWQgdmFsdWUgZnJvbSB0aGUgZHJvcGRvd24uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHQgLSBUaGUgc2VsZWN0ZWQgdGV4dCBmcm9tIHRoZSBkcm9wZG93bi5cbiAgICAgKi9cbiAgICBjYk9uQ2hhbmdlTW9kZSh2YWx1ZSwgdGV4dCl7XG4gICAgICAgIC8vIEhhbmRsZSBjb2RlIHZpc2liaWxpdHkgYW5kIGNvbnRlbnQgYmFzZWQgb24gdGhlICdtb2RlJ1xuICAgICAgICBzd2l0Y2ggKHZhbHVlKSB7XG4gICAgICAgICAgICBjYXNlICdub25lJzpcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiR0YWJNZW51LnRhYignY2hhbmdlIHRhYicsJ29yaWdpbmFsJyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdvdmVycmlkZSc6XG4gICAgICAgICAgICBjYXNlICdjdXN0b20nOiAgLy8gQ3VzdG9tIG1vZGUgYmVoYXZlcyBsaWtlIG92ZXJyaWRlXG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kdGFiTWVudS50YWIoJ2NoYW5nZSB0YWInLCdlZGl0b3InKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2FwcGVuZCc6XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kdGFiTWVudS50YWIoJ2NoYW5nZSB0YWInLCdlZGl0b3InKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3NjcmlwdCc6XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kdGFiTWVudS50YWIoJ2NoYW5nZSB0YWInLCdlZGl0b3InKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kdGFiTWVudS50YWIoJ2NoYW5nZSB0YWInLCdvcmlnaW5hbCcpO1xuICAgICAgICB9XG4gICAgICAgIGN1c3RvbUZpbGUuaGlkZVNob3dDb2RlKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEV2ZW50IGhhbmRsZXIgZm9yIHRhYiBjaGFuZ2VzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGN1cnJlbnRUYWIgLSBUaGUgY3VycmVudCB0YWIgdGhhdCBpcyB2aXNpYmxlLlxuICAgICAqL1xuICAgIG9uQ2hhbmdlVGFiKGN1cnJlbnRUYWIpe1xuICAgICAgICBjb25zdCBmaWxlUGF0aCA9IGN1c3RvbUZpbGUuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2ZpbGVwYXRoJyk7XG4gICAgICAgIGNvbnN0IGRhdGEgPSB7ZmlsZW5hbWU6IGZpbGVQYXRoLCBuZWVkT3JpZ2luYWw6IHRydWUsIG5lZWRMb2dmaWxlOiBmYWxzZX07XG4gICAgICAgIHN3aXRjaCAoY3VycmVudFRhYikge1xuICAgICAgICAgICAgY2FzZSAncmVzdWx0JzpcbiAgICAgICAgICAgICAgICBkYXRhLm5lZWRPcmlnaW5hbD1mYWxzZTtcbiAgICAgICAgICAgICAgICAkKCcudGFiW2RhdGEtdGFiPVwicmVzdWx0XCJdJykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBQYnhBcGkuR2V0RmlsZUNvbnRlbnQoZGF0YSwgY3VzdG9tRmlsZS5jYkdldFJlc3VsdEZpbGVDb250ZW50RnJvbVNlcnZlcik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdvcmlnaW5hbCc6XG4gICAgICAgICAgICAgICAgZGF0YS5uZWVkT3JpZ2luYWw9dHJ1ZTtcbiAgICAgICAgICAgICAgICAkKCcudGFiW2RhdGEtdGFiPVwib3JpZ2luYWxcIl0nKS5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIFBieEFwaS5HZXRGaWxlQ29udGVudChkYXRhLCBjdXN0b21GaWxlLmNiR2V0T3JpZ2luYWxGaWxlQ29udGVudEZyb21TZXJ2ZXIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZWRpdG9yJzpcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGVzIHRoZSB2aXNpYmlsaXR5IGFuZCBjb250ZW50IG9mIGNvZGUgYmFzZWQgb24gdGhlICdtb2RlJyBmb3JtIHZhbHVlLlxuICAgICAqIEFkanVzdHMgdGhlIEFjZSBlZGl0b3Igc2V0dGluZ3MgYWNjb3JkaW5nbHkuXG4gICAgICovXG4gICAgaGlkZVNob3dDb2RlKCkge1xuICAgICAgICAvLyBSZXRyaWV2ZSAnbW9kZScgdmFsdWUgZnJvbSB0aGUgZm9ybVxuICAgICAgICBjb25zdCBtb2RlID0gY3VzdG9tRmlsZS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnbW9kZScpO1xuXG4gICAgICAgIC8vIEdldCBjdXJyZW50IGNvbnRlbnQgZnJvbSBlZGl0b3IgKG5vdCBmcm9tIGZvcm0sIGFzIGZvcm0gZG9lc24ndCBoYXZlIGl0IGFueW1vcmUpXG4gICAgICAgIGxldCBjb250ZW50ID0gY3VzdG9tRmlsZS5lZGl0b3IuZ2V0VmFsdWUoKTtcblxuICAgICAgICAvLyBHZXQgdGFiIG1lbnUgaXRlbXNcbiAgICAgICAgY29uc3QgJG9yaWdpbmFsVGFiTWVudUl0ZW0gPSAkKCcuaXRlbVtkYXRhLXRhYj1cIm9yaWdpbmFsXCJdJyk7XG4gICAgICAgIGNvbnN0ICRyZXN1bHRUYWJNZW51SXRlbSA9ICQoJy5pdGVtW2RhdGEtdGFiPVwicmVzdWx0XCJdJyk7XG5cbiAgICAgICAgLy8gSGFuZGxlIGNvZGUgdmlzaWJpbGl0eSBhbmQgY29udGVudCBiYXNlZCBvbiB0aGUgJ21vZGUnXG4gICAgICAgIHN3aXRjaCAobW9kZSkge1xuICAgICAgICAgICAgY2FzZSAnbm9uZSc6XG4gICAgICAgICAgICAgICAgLy8gSWYgJ21vZGUnIGlzICdub25lJywgc2hvdyBvbmx5IHJlc3VsdCBjb2RlIGdlbmVyYXRlZCBhbmQgaGlkZSBlZGl0b3IgYW5kIHJlc3VsdCB2aWV3ZXJcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRlZGl0b3JUYWIuaGlkZSgpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJG9yaWdpbmFsVGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLnZpZXdlck9yaWdpbmFsLm5hdmlnYXRlRmlsZVN0YXJ0KCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kcmVzdWx0VGFiLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAvLyBTaG93L2hpZGUgbWVudSBpdGVtc1xuICAgICAgICAgICAgICAgICRvcmlnaW5hbFRhYk1lbnVJdGVtLnNob3coKTtcbiAgICAgICAgICAgICAgICAkcmVzdWx0VGFiTWVudUl0ZW0uaGlkZSgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnYXBwZW5kJzpcbiAgICAgICAgICAgICAgICAvLyBJZiAnbW9kZScgaXMgJ2FwcGVuZCcsIHNob3cgYWxsIGZpZWxkc1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGVkaXRvclRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kb3JpZ2luYWxUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHJlc3VsdFRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbC5uYXZpZ2F0ZUZpbGVFbmQoKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLnZpZXdlclJlc3VsdC5uYXZpZ2F0ZUZpbGVFbmQoKTtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGFsbCBtZW51IGl0ZW1zXG4gICAgICAgICAgICAgICAgJG9yaWdpbmFsVGFiTWVudUl0ZW0uc2hvdygpO1xuICAgICAgICAgICAgICAgICRyZXN1bHRUYWJNZW51SXRlbS5zaG93KCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdvdmVycmlkZSc6XG4gICAgICAgICAgICAgICAgLy8gSWYgJ21vZGUnIGlzICdvdmVycmlkZScsIHNob3cgZWRpdG9yIGFuZCBoaWRlIG9yaWdpbmFsLCBidXQgc2hvdyByZXN1bHRcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRlZGl0b3JUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJG9yaWdpbmFsVGFiLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRyZXN1bHRUYWIuaGlkZSgpO1xuICAgICAgICAgICAgICAgIC8vIFNob3cvaGlkZSBtZW51IGl0ZW1zXG4gICAgICAgICAgICAgICAgJG9yaWdpbmFsVGFiTWVudUl0ZW0uaGlkZSgpO1xuICAgICAgICAgICAgICAgICRyZXN1bHRUYWJNZW51SXRlbS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdjdXN0b20nOlxuICAgICAgICAgICAgICAgIC8vIEZvciAnY3VzdG9tJyBtb2RlLCBvbmx5IHNob3cgZWRpdG9yIHRhYiAtIHVzZXIgZnVsbHkgY29udHJvbHMgdGhlIGZpbGVcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRlZGl0b3JUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJG9yaWdpbmFsVGFiLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRyZXN1bHRUYWIuaGlkZSgpO1xuICAgICAgICAgICAgICAgIC8vIEhpZGUgb3RoZXIgdGFiIG1lbnUgaXRlbXMgZm9yIGN1c3RvbSBmaWxlc1xuICAgICAgICAgICAgICAgICRvcmlnaW5hbFRhYk1lbnVJdGVtLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAkcmVzdWx0VGFiTWVudUl0ZW0uaGlkZSgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnc2NyaXB0JzpcbiAgICAgICAgICAgICAgICAvLyBJZiAnbW9kZScgaXMgJ3NjcmlwdCcsIHNob3cgYm90aCBzZXJ2ZXIgYW5kIGN1c3RvbSBjb2RlLCBhcHBseSBjdXN0b20gc2NyaXB0IHRvIHRoZSBmaWxlIGNvbnRlbnQgb24gc2VydmVyXG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZWRpdG9yVGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRvcmlnaW5hbFRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kcmVzdWx0VGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGFsbCBtZW51IGl0ZW1zIGZvciBzY3JpcHQgbW9kZVxuICAgICAgICAgICAgICAgICRvcmlnaW5hbFRhYk1lbnVJdGVtLnNob3coKTtcbiAgICAgICAgICAgICAgICAkcmVzdWx0VGFiTWVudUl0ZW0uc2hvdygpO1xuICAgICAgICAgICAgICAgIC8vIEVkaXRvciAtIG9ubHkgc2V0IHRlbXBsYXRlIGlmIGNvbnRlbnQgaXMgZW1wdHlcbiAgICAgICAgICAgICAgICBpZiAoIWNvbnRlbnQgfHwgY29udGVudC50cmltKCkgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgPSBgIyEvYmluL2Jhc2ggXFxuXFxuYDtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgY29uZmlnUGF0aD1cIiQxXCIgIyBQYXRoIHRvIHRoZSBvcmlnaW5hbCBjb25maWcgZmlsZVxcblxcbmA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYCMgRXhhbXBsZSAxOiBSZXBsYWNlIGFsbCB2YWx1ZXMgbWF4X2NvbnRhY3RzID0gNSB0byBtYXhfY29udGFjdHMgPSAxIG9uIHBqc2lwLmNvbmZcXG5gO1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGAjIHNlZCAtaSAncy9tYXhfY29udGFjdHMgPSA1L21heF9jb250YWN0cyA9IDEvZycgXCIkY29uZmlnUGF0aFwiXFxuXFxuYFxuXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYCMgRXhhbXBsZSAyOiBDaGFuZ2UgdmFsdWUgbWF4X2NvbnRhY3RzIG9ubHkgZm9yIHBlZXIgd2l0aCBleHRlbnNpb24gMjI2IG9uIHBqc2lwLmNvbmZcXG5gO1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGAjIHNlZCAtaSAnL15cXFxcWzIyNlxcXFxdJC8sL15cXFxcWy8gcy9tYXhfY29udGFjdHMgPSA1L21heF9jb250YWN0cyA9IDIvJyBcIiRjb25maWdQYXRoXCJcXG5cXG5gXG5cbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgIyBFeGFtcGxlIDM6IEFkZCBlbiBleHRyYSBzdHJpbmcgaW50byBbcGxheWJhY2stZXhpdF0gc2VjdGlvbiBhZnRlciB0aGUgXCJzYW1lID0+IG4sSGFuZ3VwKClcIiBzdHJpbmcgb24gZXh0ZW5zaW9ucy5jb25mXFxuYDtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgIyBzZWQgLWkgJy9eXFxcXFtwbGF5YmFjay1leGl0XFxcXF0kLywvXlxcXFxbLyBzL15cXFxcKFxcXFxzKnNhbWUgPT4gbixIYW5ndXAoKVxcXFwpL1xcXFwxXFxcXG5cXFxcdHNhbWUgPT4gbixOb09wKFwiWW91ciBOb09wIGNvbW1lbnQgaGVyZVwiKS8nIFwiJGNvbmZpZ1BhdGhcIlxcblxcbmA7XG5cbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgIyBBdHRlbnRpb24hIFlvdSB3aWxsIHNlZSBjaGFuZ2VzIGFmdGVyIHRoZSBiYWNrZ3JvdW5kIHdvcmtlciBwcm9jZXNzZXMgdGhlIHNjcmlwdCBvciBhZnRlciByZWJvb3RpbmcgdGhlIHN5c3RlbS4gXFxuYDtcblxuICAgICAgICAgICAgICAgICAgICAvLyBPbmx5IHNldCBjb250ZW50IGlmIHdlIGNyZWF0ZWQgYSB0ZW1wbGF0ZVxuICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXRWYWx1ZShjb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3IuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIGFueSBvdGhlciAnbW9kZScgdmFsdWVzXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBjdXN0b21GaWxlLnZpZXdlck9yaWdpbmFsLnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXRUaGVtZSgnYWNlL3RoZW1lL21vbm9rYWknKTtcblxuICAgICAgICAvLyBEb24ndCBvdmVyd3JpdGUgZWRpdG9yIGNvbnRlbnQgaGVyZSAtIGl0J3MgYWxyZWFkeSBzZXQgY29ycmVjdGx5XG4gICAgICAgIC8vIGN1c3RvbUZpbGUuZWRpdG9yLnNldFZhbHVlKGNvbnRlbnQpO1xuICAgICAgICAvLyBjdXN0b21GaWxlLmVkaXRvci5jbGVhclNlbGVjdGlvbigpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0aGF0IGhhbmRsZXMgdGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBjb250YWluaW5nIHRoZSBmaWxlJ3MgY29udGVudC5cbiAgICAgKiBJdCB3aWxsIHVwZGF0ZSB0aGUgJ3ZpZXdlck9yaWdpbmFsJyB3aXRoIHRoZSBmaWxlJ3MgY29udGVudCBhbmQgYWRqdXN0IHRoZSBjb2RlIGRpc3BsYXkuXG4gICAgICovXG4gICAgY2JHZXRPcmlnaW5hbEZpbGVDb250ZW50RnJvbVNlcnZlcihyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5jb250ZW50ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGFjZVZpZXdlciA9IGN1c3RvbUZpbGUudmlld2VyT3JpZ2luYWw7XG4gICAgICAgICAgICBjb25zdCBzY3JvbGxUb3AgPSBhY2VWaWV3ZXIuc2Vzc2lvbi5nZXRTY3JvbGxUb3AoKTtcbiAgICAgICAgICAgIGFjZVZpZXdlci5zZXNzaW9uLnNldFZhbHVlKHJlc3BvbnNlLmRhdGEuY29udGVudCk7XG4gICAgICAgICAgICBhY2VWaWV3ZXIuc2Vzc2lvbi5zZXRTY3JvbGxUb3Aoc2Nyb2xsVG9wKTtcbiAgICAgICAgfVxuICAgICAgICAkKCcudGFiW2RhdGEtdGFiPVwib3JpZ2luYWxcIl0nKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0aGF0IGhhbmRsZXMgdGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBjb250YWluaW5nIHRoZSBmaWxlJ3MgY29udGVudC5cbiAgICAgKiBJdCB3aWxsIHVwZGF0ZSB0aGUgJ3ZpZXdlclJlc3VsdCcgd2l0aCB0aGUgZmlsZSdzIGNvbnRlbnQgYW5kIGFkanVzdCB0aGUgY29kZSBkaXNwbGF5LlxuICAgICAqL1xuICAgIGNiR2V0UmVzdWx0RmlsZUNvbnRlbnRGcm9tU2VydmVyKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmNvbnRlbnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29uc3QgYWNlVmlld2VyID0gY3VzdG9tRmlsZS52aWV3ZXJSZXN1bHQ7XG4gICAgICAgICAgICBjb25zdCBzY3JvbGxUb3AgPSBhY2VWaWV3ZXIuc2Vzc2lvbi5nZXRTY3JvbGxUb3AoKTtcbiAgICAgICAgICAgIGFjZVZpZXdlci5zZXNzaW9uLnNldFZhbHVlKHJlc3BvbnNlLmRhdGEuY29udGVudCk7XG4gICAgICAgICAgICBhY2VWaWV3ZXIuc2Vzc2lvbi5zZXRTY3JvbGxUb3Aoc2Nyb2xsVG9wKTtcbiAgICAgICAgfVxuICAgICAgICAkKCcudGFiW2RhdGEtdGFiPVwicmVzdWx0XCJdJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgQWNlIGVkaXRvciBpbnN0YW5jZXMgZm9yICdlZGl0b3InIGFuZCAndmlld2Vycycgd2luZG93cy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplQWNlKCkge1xuICAgICAgICAvLyBDYWxjdWxhdGUgYWNlIGVkaXRvciBoZWlnaHQgYW5kIHJvd3MgY291bnRcbiAgICAgICAgY29uc3QgYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gNDc1O1xuICAgICAgICBjb25zdCByb3dzQ291bnQgPSBNYXRoLnJvdW5kKGFjZUhlaWdodCAvIDE2LjMpO1xuXG4gICAgICAgIC8vIFNldCBtaW5pbXVtIGhlaWdodCBmb3IgdGhlIGNvZGUgc2VjdGlvbnMgb24gd2luZG93IGxvYWRcbiAgICAgICAgJCgnLmFwcGxpY2F0aW9uLWNvZGUnKS5jc3MoJ21pbi1oZWlnaHQnLCBgJHthY2VIZWlnaHR9cHhgKTtcblxuICAgICAgICAvLyBBQ0Ugd2luZG93IGZvciB0aGUgb3JpZ2luYWwgZmlsZSBjb250ZW50LlxuICAgICAgICBjb25zdCBJbmlNb2RlID0gYWNlLnJlcXVpcmUoJ2FjZS9tb2RlL2p1bGlhJykuTW9kZTtcbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbCA9IGFjZS5lZGl0KCdjb25maWctZmlsZS1vcmlnaW5hbCcpO1xuICAgICAgICBjdXN0b21GaWxlLnZpZXdlck9yaWdpbmFsLnNlc3Npb24uc2V0TW9kZShuZXcgSW5pTW9kZSgpKTtcbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbC5zZXRUaGVtZSgnYWNlL3RoZW1lL21vbm9rYWknKTtcbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbC5zZXRPcHRpb25zKHtcbiAgICAgICAgICAgIHNob3dQcmludE1hcmdpbjogZmFsc2UsXG4gICAgICAgICAgICByZWFkT25seTogdHJ1ZSxcbiAgICAgICAgICAgIG1pbkxpbmVzOiByb3dzQ291bnRcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQUNFIHdpbmRvdyBmb3IgdGhlIHJlc3VsdGVkIGZpbGUgY29udGVudC5cbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJSZXN1bHQgPSBhY2UuZWRpdCgnY29uZmlnLWZpbGUtcmVzdWx0Jyk7XG4gICAgICAgIGN1c3RvbUZpbGUudmlld2VyUmVzdWx0LnNlc3Npb24uc2V0TW9kZShuZXcgSW5pTW9kZSgpKTtcbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJSZXN1bHQuc2V0VGhlbWUoJ2FjZS90aGVtZS9tb25va2FpJyk7XG4gICAgICAgIGN1c3RvbUZpbGUudmlld2VyUmVzdWx0LnNldE9wdGlvbnMoe1xuICAgICAgICAgICAgc2hvd1ByaW50TWFyZ2luOiBmYWxzZSxcbiAgICAgICAgICAgIHJlYWRPbmx5OiB0cnVlLFxuICAgICAgICAgICAgbWluTGluZXM6IHJvd3NDb3VudFxuICAgICAgICB9KTtcblxuXG4gICAgICAgIC8vIEFDRSB3aW5kb3cgZm9yIHRoZSB1c2VyIGVkaXRvci5cbiAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3IgPSBhY2UuZWRpdCgndXNlci1lZGl0LWNvbmZpZycpO1xuICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXNzaW9uLnNldE1vZGUobmV3IEluaU1vZGUoKSk7XG4gICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXRPcHRpb25zKHtcbiAgICAgICAgICAgIHNob3dQcmludE1hcmdpbjogZmFsc2UsXG4gICAgICAgICAgICBtaW5MaW5lczogcm93c0NvdW50LFxuICAgICAgICB9KTtcbiAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2Vzc2lvbi5vbignY2hhbmdlJywgKCkgPT4ge1xuICAgICAgICAgICAgLy8gVHJpZ2dlciBjaGFuZ2UgZXZlbnQgdG8gYWNrbm93bGVkZ2UgdGhlIG1vZGlmaWNhdGlvblxuICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyAgQWRkIGhhbmRsZXJzIGZvciBmdWxsc2NyZWVuIG1vZGUgYnV0dG9uc1xuICAgICAgICAkKCcuZnVsbHNjcmVlbi10b2dnbGUtYnRuJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY29uc3QgY29udGFpbmVyID0gJCh0aGlzKS5zaWJsaW5ncygnLmFwcGxpY2F0aW9uLWNvZGUnKVswXTtcbiAgICAgICAgICAgIGN1c3RvbUZpbGUudG9nZ2xlRnVsbFNjcmVlbihjb250YWluZXIpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBZGQgaGFuZGxlciB0byByZWNhbGN1bGF0ZSBzaXplcyB3aGVuIGV4aXRpbmcgZnVsbHNjcmVlbiBtb2RlXG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2Z1bGxzY3JlZW5jaGFuZ2UnLCBjdXN0b21GaWxlLmFkanVzdEVkaXRvckhlaWdodCk7XG5cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEVuYWJsZS9kaXNhYmxlIGZ1bGxzY3JlZW4gbW9kZSBmb3IgYSBzcGVjaWZpYyBibG9jay5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGNvbnRhaW5lciAtIFRoZSBjb250YWluZXIgdG8gZXhwYW5kIHRvIGZ1bGxzY3JlZW4uXG4gICAgICovXG4gICAgdG9nZ2xlRnVsbFNjcmVlbihjb250YWluZXIpIHtcbiAgICAgICAgaWYgKCFkb2N1bWVudC5mdWxsc2NyZWVuRWxlbWVudCkge1xuICAgICAgICAgICAgY29udGFpbmVyLnJlcXVlc3RGdWxsc2NyZWVuKCkuY2F0Y2goZXJyID0+IHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGBFcnJvciBhdHRlbXB0aW5nIHRvIGVuYWJsZSBmdWxsLXNjcmVlbiBtb2RlOiAke2Vyci5tZXNzYWdlfWApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkb2N1bWVudC5leGl0RnVsbHNjcmVlbigpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlY2FsY3VsYXRlIGVkaXRvciBoZWlnaHRzIHdoZW4gdGhlIHNjcmVlbiBtb2RlIGNoYW5nZXMuXG4gICAgICovXG4gICAgYWRqdXN0RWRpdG9ySGVpZ2h0KCkge1xuICAgICAgICBjb25zdCBlZGl0b3JzID0gW2N1c3RvbUZpbGUudmlld2VyT3JpZ2luYWwsIGN1c3RvbUZpbGUudmlld2VyUmVzdWx0LCBjdXN0b21GaWxlLmVkaXRvcl07XG4gICAgICAgIGVkaXRvcnMuZm9yRWFjaChlZGl0b3IgPT4ge1xuICAgICAgICAgICAgaWYgKGVkaXRvcikge1xuICAgICAgICAgICAgICAgIGVkaXRvci5yZXNpemUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IGN1c3RvbUZpbGUuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXG4gICAgICAgIC8vIEdldCBtb2RlIGZyb20gZm9ybVxuICAgICAgICBsZXQgbW9kZSA9IGN1c3RvbUZpbGUuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ21vZGUnKTtcblxuICAgICAgICAvLyBJTVBPUlRBTlQ6IENoZWNrIGlmIGRyb3Bkb3duIGlzIGhpZGRlbiAoaW5kaWNhdG9yIG9mIGN1c3RvbSBmaWxlKVxuICAgICAgICAvLyBXaGVuIGRyb3Bkb3duIGlzIGhpZGRlbiwgaXQgbWlnaHQgcmV0dXJuIGluY29ycmVjdCB2YWx1ZVxuICAgICAgICBpZiAoY3VzdG9tRmlsZS4kbW9kZURyb3BEb3duLnBhcmVudCgpLnBhcmVudCgpLmlzKCc6aGlkZGVuJykpIHtcbiAgICAgICAgICAgIC8vIFRoaXMgaXMgYSBjdXN0b20gZmlsZSwgZm9yY2UgbW9kZSB0byBiZSAnY3VzdG9tJ1xuICAgICAgICAgICAgbW9kZSA9ICdjdXN0b20nO1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEubW9kZSA9ICdjdXN0b20nO1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ0N1c3RvbSBmaWxlIGRldGVjdGVkIChkcm9wZG93biBoaWRkZW4pLCBmb3JjaW5nIG1vZGUgdG8gY3VzdG9tJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGRpdGlvbmFsIGNoZWNrOiBFbnN1cmUgbW9kZSBzdGF5cyAnY3VzdG9tJyBmb3IgY3VzdG9tIGZpbGVzXG4gICAgICAgIGlmIChtb2RlID09PSAnY3VzdG9tJyB8fCAocmVzdWx0LmRhdGEubW9kZSA9PT0gJ2N1c3RvbScpKSB7XG4gICAgICAgICAgICAvLyBGb3JjZSBtb2RlIHRvIHN0YXkgJ2N1c3RvbScgZm9yIGN1c3RvbSBmaWxlc1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEubW9kZSA9ICdjdXN0b20nO1xuICAgICAgICAgICAgbW9kZSA9ICdjdXN0b20nO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gR2V0IGNvbnRlbnQgZnJvbSBBY2UgZWRpdG9yIGJhc2VkIG9uIG1vZGVcbiAgICAgICAgc3dpdGNoIChtb2RlKSB7XG4gICAgICAgICAgICBjYXNlICdhcHBlbmQnOlxuICAgICAgICAgICAgY2FzZSAnb3ZlcnJpZGUnOlxuICAgICAgICAgICAgY2FzZSAnY3VzdG9tJzpcbiAgICAgICAgICAgIGNhc2UgJ3NjcmlwdCc6XG4gICAgICAgICAgICAgICAgLy8gR2V0IGNvbnRlbnQgZnJvbSBBY2UgZWRpdG9yIChub3QgYmFzZTY0IGVuY29kZWQgeWV0KVxuICAgICAgICAgICAgICAgIGlmICghY3VzdG9tRmlsZS5lZGl0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRWRpdG9yIGlzIG5vdCBpbml0aWFsaXplZCEnKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmRhdGEuY29udGVudCA9ICcnO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGVkaXRvckNvbnRlbnQgPSBjdXN0b21GaWxlLmVkaXRvci5nZXRWYWx1ZSgpO1xuICAgICAgICAgICAgICAgICAgICByZXN1bHQuZGF0YS5jb250ZW50ID0gZWRpdG9yQ29udGVudDtcblxuICAgICAgICAgICAgICAgICAgICAvLyBEZWJ1ZzogbG9nIGNvbnRlbnQgZm9yIGN1c3RvbSBtb2RlXG4gICAgICAgICAgICAgICAgICAgIGlmIChtb2RlID09PSAnY3VzdG9tJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1NhdmluZyBjdXN0b20gZmlsZSB3aXRoIGNvbnRlbnQgbGVuZ3RoOicsIGVkaXRvckNvbnRlbnQubGVuZ3RoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdGaXJzdCAxMDAgY2hhcnM6JywgZWRpdG9yQ29udGVudC5zdWJzdHJpbmcoMCwgMTAwKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdub25lJzpcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgLy8gRm9yICdub25lJyBtb2RlLCBjbGVhciB0aGUgY29udGVudFxuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhLmNvbnRlbnQgPSAnJztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuXG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBjdXN0b21GaWxlLiRmb3JtT2JqO1xuXG4gICAgICAgIC8vIENvbmZpZ3VyZSBSRVNUIEFQSSBzZXR0aW5ncyBmb3IgRm9ybVxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzID0ge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGFwaU9iamVjdDogY3VzdG9tRmlsZXNBUEksXG4gICAgICAgICAgICBzYXZlTWV0aG9kOiAnc2F2ZScsICAvLyBXaWxsIHVzZSB0aGUgc21hcnQgc2F2ZSBtZXRob2QgdGhhdCBkZXRlcm1pbmVzIGNyZWF0ZS91cGRhdGVcbiAgICAgICAgICAgIGF1dG9EZXRlY3RNZXRob2Q6IGZhbHNlLCAgLy8gV2UgaGFuZGxlIHRoaXMgaW4gb3VyIHNhdmUgbWV0aG9kXG4gICAgICAgICAgICBpZEZpZWxkOiAnaWQnXG4gICAgICAgIH07XG5cbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gY3VzdG9tRmlsZS52YWxpZGF0ZVJ1bGVzOyAvLyBGb3JtIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gY3VzdG9tRmlsZS5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gY3VzdG9tRmlsZS5jYkFmdGVyU2VuZEZvcm07IC8vIENhbGxiYWNrIGFmdGVyIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxufTtcblxuLy8gSW5pdGlhbGl6ZSB0aGUgY3VzdG9tIGZpbGVzIG1vZGlmeSBmb3JtIHdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LlxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGN1c3RvbUZpbGUuaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==