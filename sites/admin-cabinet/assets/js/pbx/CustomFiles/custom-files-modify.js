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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DdXN0b21GaWxlcy9jdXN0b20tZmlsZXMtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbImN1c3RvbUZpbGUiLCIkZm9ybU9iaiIsIiQiLCIkdGFiTWVudSIsIiRtb2RlRHJvcERvd24iLCIkb3JpZ2luYWxUYWIiLCIkZWRpdG9yVGFiIiwiJHJlc3VsdFRhYiIsIiRtYWluQ29udGFpbmVyIiwiJGZpbGVwYXRoSW5wdXQiLCIkZmlsZXBhdGhGaWVsZCIsImVkaXRvciIsInZpZXdlck9yaWdpbmFsIiwidmlld2VyUmVzdWx0IiwidmFsaWRhdGVSdWxlcyIsIm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiY2ZfVmFsaWRhdGVOYW1lSXNFbXB0eSIsInVwZGF0ZUZpbGVwYXRoRmllbGRTdGF0ZSIsIm1vZGUiLCJmb3JtIiwiaXNVc2VyQ3JlYXRlZCIsImZpbGVJZCIsInByb3AiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwicGFyZW50IiwiaGlkZSIsInNob3ciLCJpbml0aWFsaXplIiwidGFiIiwib25WaXNpYmxlIiwib25DaGFuZ2VUYWIiLCJpbml0aWFsaXplQWNlIiwibGVuZ3RoIiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsImNiT25DaGFuZ2VNb2RlIiwidXJsUGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwid2luZG93IiwibG9jYXRpb24iLCJzZWFyY2giLCJ1cmxJZCIsInBhdGhuYW1lIiwibWF0Y2giLCJjdXN0b21GaWxlc0FQSSIsImdldERlZmF1bHQiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJjb250ZW50IiwiZGVjb2RlZENvbnRlbnQiLCJhdG9iIiwic2V0VmFsdWUiLCJlIiwiY2xlYXJTZWxlY3Rpb24iLCJnZXRSZWNvcmQiLCJiYXNlNjRDb250ZW50IiwiZm9ybURhdGEiLCJnbG9iYWxSb290VXJsIiwiaW5pdGlhbGl6ZUZvcm0iLCJ2YWx1ZSIsInRleHQiLCJoaWRlU2hvd0NvZGUiLCJjdXJyZW50VGFiIiwiZmlsZVBhdGgiLCJGaWxlc0FQSSIsImdldEZpbGVDb250ZW50IiwiY2JHZXRSZXN1bHRGaWxlQ29udGVudEZyb21TZXJ2ZXIiLCJjYkdldE9yaWdpbmFsRmlsZUNvbnRlbnRGcm9tU2VydmVyIiwiZ2V0VmFsdWUiLCIkb3JpZ2luYWxUYWJNZW51SXRlbSIsIiRyZXN1bHRUYWJNZW51SXRlbSIsIm5hdmlnYXRlRmlsZVN0YXJ0IiwibmF2aWdhdGVGaWxlRW5kIiwidHJpbSIsInNldFRoZW1lIiwidW5kZWZpbmVkIiwiYWNlVmlld2VyIiwic2Nyb2xsVG9wIiwic2Vzc2lvbiIsImdldFNjcm9sbFRvcCIsInNldFNjcm9sbFRvcCIsImFjZUhlaWdodCIsImlubmVySGVpZ2h0Iiwicm93c0NvdW50IiwiTWF0aCIsInJvdW5kIiwiY3NzIiwiSW5pTW9kZSIsImFjZSIsInJlcXVpcmUiLCJNb2RlIiwiZWRpdCIsInNldE1vZGUiLCJzZXRPcHRpb25zIiwic2hvd1ByaW50TWFyZ2luIiwicmVhZE9ubHkiLCJtaW5MaW5lcyIsIm9uIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwiY29udGFpbmVyIiwic2libGluZ3MiLCJ0b2dnbGVGdWxsU2NyZWVuIiwiZG9jdW1lbnQiLCJhZGRFdmVudExpc3RlbmVyIiwiYWRqdXN0RWRpdG9ySGVpZ2h0IiwiZnVsbHNjcmVlbkVsZW1lbnQiLCJyZXF1ZXN0RnVsbHNjcmVlbiIsImVyciIsImNvbnNvbGUiLCJlcnJvciIsIm1lc3NhZ2UiLCJleGl0RnVsbHNjcmVlbiIsImVkaXRvcnMiLCJmb3JFYWNoIiwicmVzaXplIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwiaXMiLCJsb2ciLCJlZGl0b3JDb250ZW50Iiwic3Vic3RyaW5nIiwiY2JBZnRlclNlbmRGb3JtIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImF1dG9EZXRlY3RNZXRob2QiLCJpZEZpZWxkIiwicmVhZHkiXSwi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QUFDQXdHLElBQUFBLElBQUksQ0FBQ3lCLFdBQUwsR0FBbUI7QUFDZkMsTUFBQUEsT0FBTyxFQUFFLElBRE07QUFFZkMsTUFBQUEsU0FBUyxFQUFFbEYsY0FGSTtBQUdmbUYsTUFBQUEsVUFBVSxFQUFFLE1BSEc7QUFHTTtBQUNyQkMsTUFBQUEsZ0JBQWdCLEVBQUUsS0FKSDtBQUlXO0FBQzFCQyxNQUFBQSxPQUFPLEVBQUU7QUFMTSxLQUFuQjtBQVFBOUIsSUFBQUEsSUFBSSxDQUFDM0YsYUFBTCxHQUFxQmQsVUFBVSxDQUFDYyxhQUFoQyxDQVphLENBWWtDOztBQUMvQzJGLElBQUFBLElBQUksQ0FBQ2tCLGdCQUFMLEdBQXdCM0gsVUFBVSxDQUFDMkgsZ0JBQW5DLENBYmEsQ0Fhd0M7O0FBQ3JEbEIsSUFBQUEsSUFBSSxDQUFDd0IsZUFBTCxHQUF1QmpJLFVBQVUsQ0FBQ2lJLGVBQWxDLENBZGEsQ0Fjc0M7O0FBQ25EeEIsSUFBQUEsSUFBSSxDQUFDeEUsVUFBTDtBQUNIO0FBaG1CYyxDQUFuQixDLENBbW1CQTs7QUFDQS9CLENBQUMsQ0FBQzRHLFFBQUQsQ0FBRCxDQUFZMEIsS0FBWixDQUFrQixZQUFNO0FBQ3BCeEksRUFBQUEsVUFBVSxDQUFDaUMsVUFBWDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIGFjZSwgRm9ybSwgRmlsZXNBUEksIGN1c3RvbUZpbGVzQVBJLCBQYnhBcGlDbGllbnQgKi9cblxuXG4vKipcbiAqIE1vZHVsZSBjdXN0b21GaWxlXG4gKiBUaGlzIG1vZHVsZSBtYW5hZ2VzIGZpbGUgaW50ZXJhY3Rpb25zIGluIGEgVUksIHN1Y2ggYXMgbG9hZGluZyBmaWxlIGNvbnRlbnQgZnJvbSBhIHNlcnZlciBhbmQgaGFuZGxpbmcgdXNlciBpbnB1dC5cbiAqIEBtb2R1bGUgY3VzdG9tRmlsZVxuICovXG5jb25zdCBjdXN0b21GaWxlID0ge1xuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI2N1c3RvbS1maWxlLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB0YWIgbWVudS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR0YWJNZW51OiAkKCcjY3VzdG9tLWZpbGVzLW1lbnUgLml0ZW0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBtb2RlIHNlbGVjdC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRtb2RlRHJvcERvd246ICQoJyNtb2RlLWRyb3Bkb3duJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdGFiIHdpdGggb3JpZ2luYWwgZmlsZSBjb250ZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG9yaWdpbmFsVGFiOiAkKCdhW2RhdGEtdGFiPVwib3JpZ2luYWxcIl0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB0YWIgd2l0aCB1c2VyIGNvbnRlbnQvc2NyaXB0IGVkaXRvci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRlZGl0b3JUYWI6ICQoJ2FbZGF0YS10YWI9XCJlZGl0b3JcIl0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB0YWIgd2l0aCByZXN1bHRlZCBmaWxlIGNvbnRlbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkcmVzdWx0VGFiOiAkKCdhW2RhdGEtdGFiPVwicmVzdWx0XCJdJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgZWxlbWVudCBmb3IgdGhlIG1haW4gY29udGVudCBjb250YWluZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbWFpbkNvbnRhaW5lcjogJCgnI21haW4tY29udGVudC1jb250YWluZXInKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmaWxlcGF0aCBpbnB1dCBmaWVsZC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmaWxlcGF0aElucHV0OiAkKCcjZmlsZXBhdGgnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmaWxlcGF0aCBmaWVsZCBjb250YWluZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZmlsZXBhdGhGaWVsZDogJCgnI2ZpbGVwYXRoLWZpZWxkJyksXG5cblxuICAgIC8qKlxuICAgICAqIEFjZSBlZGl0b3IgaW5zdGFuY2VzXG4gICAgICogYGVkaXRvcmAgaXMgZm9yIGlucHV0IGFuZCBgdmlld2Vyc2AgaXMgZm9yIGRpc3BsYXkgY29kZSBmcm9tIHNlcnZlclxuICAgICAqL1xuICAgIGVkaXRvcjogJycsXG4gICAgdmlld2VyT3JpZ2luYWw6ICcnLFxuICAgIHZpZXdlclJlc3VsdDogJycsXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgbmFtZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2ZpbGVwYXRoJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5jZl9WYWxpZGF0ZU5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGVzIHRoZSBmaWxlcGF0aCBmaWVsZCBzdGF0ZSBiYXNlZCBvbiB3aGV0aGVyIHRoZSBmaWxlIGlzIHVzZXItY3JlYXRlZCAoTU9ERV9DVVNUT00pIG9yIHN5c3RlbS1tYW5hZ2VkLlxuICAgICAqIFVzZXItY3JlYXRlZCBmaWxlcyBoYXZlIGVkaXRhYmxlIGZpbGVwYXRoIGJ1dCBjYW5ub3QgYmUgY3JlYXRlZCAob25seSBmb3IgbmV3IGZpbGVzKSxcbiAgICAgKiBzeXN0ZW0tbWFuYWdlZCBmaWxlcyBoYXZlIHJlYWQtb25seSBmaWxlcGF0aC5cbiAgICAgKi9cbiAgICB1cGRhdGVGaWxlcGF0aEZpZWxkU3RhdGUoKSB7XG4gICAgICAgIGNvbnN0IG1vZGUgPSBjdXN0b21GaWxlLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdtb2RlJyk7XG4gICAgICAgIGNvbnN0IGlzVXNlckNyZWF0ZWQgPSBtb2RlID09PSAnY3VzdG9tJztcbiAgICAgICAgY29uc3QgZmlsZUlkID0gY3VzdG9tRmlsZS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnaWQnKTtcblxuICAgICAgICBpZiAoaXNVc2VyQ3JlYXRlZCkge1xuICAgICAgICAgICAgaWYgKCFmaWxlSWQgfHwgZmlsZUlkID09PSAnJykge1xuICAgICAgICAgICAgICAgIC8vIE5ldyBjdXN0b20gZmlsZSAtIGZpbGVwYXRoIGlzIGVkaXRhYmxlXG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZmlsZXBhdGhJbnB1dC5wcm9wKCdyZWFkb25seScsIGZhbHNlKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRmaWxlcGF0aEZpZWxkLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBFeGlzdGluZyBjdXN0b20gZmlsZSAtIGZpbGVwYXRoIGlzIHJlYWQtb25seSAoY2Fubm90IGJlIGNoYW5nZWQgYWZ0ZXIgY3JlYXRpb24pXG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZmlsZXBhdGhJbnB1dC5wcm9wKCdyZWFkb25seScsIHRydWUpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGZpbGVwYXRoRmllbGQuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBBbHdheXMgaGlkZSBtb2RlIHNlbGVjdG9yIGZvciBjdXN0b20gZmlsZXNcbiAgICAgICAgICAgIGN1c3RvbUZpbGUuJG1vZGVEcm9wRG93bi5wYXJlbnQoKS5wYXJlbnQoKS5oaWRlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBTeXN0ZW0tbWFuYWdlZCBmaWxlIC0gZmlsZXBhdGggaXMgYWx3YXlzIHJlYWQtb25seVxuICAgICAgICAgICAgY3VzdG9tRmlsZS4kZmlsZXBhdGhJbnB1dC5wcm9wKCdyZWFkb25seScsIHRydWUpO1xuICAgICAgICAgICAgY3VzdG9tRmlsZS4kZmlsZXBhdGhGaWVsZC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIC8vIFNob3cgbW9kZSBzZWxlY3RvciBmb3Igc3lzdGVtIGZpbGVzXG4gICAgICAgICAgICBjdXN0b21GaWxlLiRtb2RlRHJvcERvd24ucGFyZW50KCkucGFyZW50KCkuc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBjdXN0b21GaWxlIG1vZHVsZS5cbiAgICAgKiBTZXRzIHVwIHRoZSBkcm9wZG93biwgaW5pdGlhbGl6ZXMgQWNlIGVkaXRvciwgZm9ybSwgYW5kIHJldHJpZXZlcyBmaWxlIGNvbnRlbnQgZnJvbSB0aGUgc2VydmVyLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBqUXVlcnkgb2JqZWN0cyBhZnRlciBET00gaXMgcmVhZHlcbiAgICAgICAgY3VzdG9tRmlsZS4kZmlsZXBhdGhJbnB1dCA9ICQoJyNmaWxlcGF0aCcpO1xuICAgICAgICBjdXN0b21GaWxlLiRmaWxlcGF0aEZpZWxkID0gJCgnI2ZpbGVwYXRoLWZpZWxkJyk7XG4gICAgICAgIGN1c3RvbUZpbGUuJG1vZGVEcm9wRG93biA9ICQoJyNtb2RlLWRyb3Bkb3duJyk7XG5cbiAgICAgICAgLy8gRW5hYmxlIHRhYiBuYXZpZ2F0aW9uIHdpdGggaGlzdG9yeSBzdXBwb3J0XG4gICAgICAgIGN1c3RvbUZpbGUuJHRhYk1lbnUudGFiKHtcbiAgICAgICAgICAgIG9uVmlzaWJsZTogY3VzdG9tRmlsZS5vbkNoYW5nZVRhYlxuICAgICAgICB9KTtcblxuICAgICAgICBjdXN0b21GaWxlLiRtYWluQ29udGFpbmVyLnJlbW92ZUNsYXNzKCdjb250YWluZXInKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIEFjZSBlZGl0b3JcbiAgICAgICAgY3VzdG9tRmlsZS5pbml0aWFsaXplQWNlKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBvciByZWluaXRpYWxpemUgZHJvcGRvd25cbiAgICAgICAgaWYgKGN1c3RvbUZpbGUuJG1vZGVEcm9wRG93bi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjdXN0b21GaWxlLiRtb2RlRHJvcERvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiBjdXN0b21GaWxlLmNiT25DaGFuZ2VNb2RlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEdldCBmaWxlIElEIGZyb20gVVJMIG9yIGZvcm1cbiAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICAgICAgY29uc3QgdXJsSWQgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUubWF0Y2goL21vZGlmeVxcLyhcXGQrKS8pO1xuICAgICAgICBjb25zdCBmaWxlSWQgPSB1cmxJZCA/IHVybElkWzFdIDogY3VzdG9tRmlsZS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnaWQnKTtcblxuICAgICAgICBpZiAoIWZpbGVJZCB8fCBmaWxlSWQgPT09ICcnKSB7XG4gICAgICAgICAgICAvLyBMb2FkIGRlZmF1bHQgdmFsdWVzIGZvciBuZXcgY3VzdG9tIGZpbGVcbiAgICAgICAgICAgIGN1c3RvbUZpbGVzQVBJLmdldERlZmF1bHQoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCBkZWZhdWx0IHZhbHVlcyB0byBmb3JtIGZpZWxkc1xuICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZXMnLCByZXNwb25zZS5kYXRhKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBGb3IgbmV3IGZpbGVzIHdpdGggTU9ERV9DVVNUT01cbiAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEubW9kZSA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIE1ha2UgZmlsZXBhdGggZWRpdGFibGUgZm9yIG5ldyBjdXN0b20gZmlsZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGZpbGVwYXRoSW5wdXQucHJvcCgncmVhZG9ubHknLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRmaWxlcGF0aEZpZWxkLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBJTVBPUlRBTlQ6IFNldCBtb2RlIHZhbHVlIHRvICdjdXN0b20nIGluIGRyb3Bkb3duIGJlZm9yZSBoaWRpbmdcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJG1vZGVEcm9wRG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgJ2N1c3RvbScpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBIaWRlIG1vZGUgc2VsZWN0b3IgZm9yIGN1c3RvbSBmaWxlc1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kbW9kZURyb3BEb3duLnBhcmVudCgpLnBhcmVudCgpLmhpZGUoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBvbmx5IGVkaXRvciB0YWIgZm9yIGN1c3RvbSBtb2RlXG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiR0YWJNZW51LnRhYignY2hhbmdlIHRhYicsICdlZGl0b3InKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGVkaXRvclRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRvcmlnaW5hbFRhYi5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRyZXN1bHRUYWIuaGlkZSgpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBIaWRlIG90aGVyIHRhYiBtZW51IGl0ZW1zXG4gICAgICAgICAgICAgICAgICAgICAgICAkKCcuaXRlbVtkYXRhLXRhYj1cIm9yaWdpbmFsXCJdJykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJCgnLml0ZW1bZGF0YS10YWI9XCJyZXN1bHRcIl0nKS5oaWRlKCk7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZW1wdHkgY29udGVudCBpbiBlZGl0b3IgZm9yIG5ldyBjdXN0b20gZmlsZXNcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmNvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBJZiBkZWZhdWx0IGNvbnRlbnQgcHJvdmlkZWQgKGJhc2U2NCksIGRlY29kZSBpdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGRlY29kZWRDb250ZW50ID0gYXRvYihyZXNwb25zZS5kYXRhLmNvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXRWYWx1ZShkZWNvZGVkQ29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLnNldFZhbHVlKHJlc3BvbnNlLmRhdGEuY29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBTZXQgZW1wdHkgY29udGVudCBmb3IgbmV3IGN1c3RvbSBmaWxlXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2V0VmFsdWUoJycpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3IuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEZvciBvdGhlciBtb2RlcywgdXNlIHN0YW5kYXJkIGJlaGF2aW9yXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBtb2RlID0gcmVzcG9uc2UuZGF0YS5tb2RlIHx8ICdub25lJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJG1vZGVEcm9wRG93bi5kcm9wZG93bignc2V0IHNlbGVjdGVkJywgbW9kZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLmNiT25DaGFuZ2VNb2RlKG1vZGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS51cGRhdGVGaWxlcGF0aEZpZWxkU3RhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gTG9hZCBleGlzdGluZyBmaWxlIGRhdGEgdmlhIFJFU1QgQVBJXG4gICAgICAgICAgICBjdXN0b21GaWxlc0FQSS5nZXRSZWNvcmQoZmlsZUlkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU3RvcmUgYmFzZTY0IGNvbnRlbnQgc2VwYXJhdGVseSBhbmQgcmVtb3ZlIGZyb20gZm9ybSBkYXRhXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGJhc2U2NENvbnRlbnQgPSByZXNwb25zZS5kYXRhLmNvbnRlbnQ7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlIGNvbnRlbnQgZnJvbSByZXNwb25zZSBiZWZvcmUgc2V0dGluZyBmb3JtIHZhbHVlc1xuICAgICAgICAgICAgICAgICAgICAvLyAoY29udGVudCB3aWxsIGJlIHRha2VuIGZyb20gQUNFIGVkaXRvciBvbiBzYXZlKVxuICAgICAgICAgICAgICAgICAgICBjb25zdCBmb3JtRGF0YSA9IHsuLi5yZXNwb25zZS5kYXRhfTtcbiAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGZvcm1EYXRhLmNvbnRlbnQ7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IGZvcm0gdmFsdWVzIGZyb20gQVBJIHJlc3BvbnNlICh3aXRob3V0IGNvbnRlbnQpXG4gICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlcycsIGZvcm1EYXRhKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBEZWNvZGUgYmFzZTY0IGNvbnRlbnQgYW5kIHNldCBpbiBlZGl0b3JcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJhc2U2NENvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVjb2RlZENvbnRlbnQgPSBhdG9iKGJhc2U2NENvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLnNldFZhbHVlKGRlY29kZWRDb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5jbGVhclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gSWYgYmFzZTY0IGRlY29kZSBmYWlscywgdXNlIGNvbnRlbnQgYXMtaXNcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXRWYWx1ZShiYXNlNjRDb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5jbGVhclNlbGVjdGlvbigpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IG1vZGUgYW5kIHRyaWdnZXIgVUkgdXBkYXRlXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vZGUgPSByZXNwb25zZS5kYXRhLm1vZGUgfHwgJ25vbmUnO1xuXG4gICAgICAgICAgICAgICAgICAgIGlmIChtb2RlID09PSAnY3VzdG9tJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRm9yIGV4aXN0aW5nIGN1c3RvbSBmaWxlcyAtIGZpbGVwYXRoIGlzIHJlYWQtb25seVxuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZmlsZXBhdGhJbnB1dC5wcm9wKCdyZWFkb25seScsIHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZmlsZXBhdGhGaWVsZC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSU1QT1JUQU5UOiBTZXQgbW9kZSB2YWx1ZSB0byAnY3VzdG9tJyBpbiBkcm9wZG93biBiZWZvcmUgaGlkaW5nXG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRtb2RlRHJvcERvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsICdjdXN0b20nKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSGlkZSBtb2RlIHNlbGVjdG9yIGZvciBjdXN0b20gZmlsZXMgLSB0aGV5IGNhbm5vdCBjaGFuZ2UgbW9kZVxuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kbW9kZURyb3BEb3duLnBhcmVudCgpLnBhcmVudCgpLmhpZGUoKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gU2hvdyBvbmx5IGVkaXRvciB0YWIgZm9yIGN1c3RvbSBtb2RlXG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiR0YWJNZW51LnRhYignY2hhbmdlIHRhYicsICdlZGl0b3InKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGVkaXRvclRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRvcmlnaW5hbFRhYi5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRyZXN1bHRUYWIuaGlkZSgpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBIaWRlIG90aGVyIHRhYiBtZW51IGl0ZW1zXG4gICAgICAgICAgICAgICAgICAgICAgICAkKCcuaXRlbVtkYXRhLXRhYj1cIm9yaWdpbmFsXCJdJykuaGlkZSgpO1xuICAgICAgICAgICAgICAgICAgICAgICAgJCgnLml0ZW1bZGF0YS10YWI9XCJyZXN1bHRcIl0nKS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBGb3Igc3lzdGVtIGZpbGVzIC0gdXNlIHN0YW5kYXJkIGJlaGF2aW9yXG4gICAgICAgICAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRtb2RlRHJvcERvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIG1vZGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5jYk9uQ2hhbmdlTW9kZShtb2RlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUudXBkYXRlRmlsZXBhdGhGaWVsZFN0YXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyBJZiBsb2FkaW5nIGZhaWxzLCByZWRpcmVjdCB0byBpbmRleFxuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfWN1c3RvbS1maWxlcy9pbmRleGA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBJbml0aWFsaXplIGZvcm1cbiAgICAgICAgY3VzdG9tRmlsZS5pbml0aWFsaXplRm9ybSgpO1xuXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZvciB3aGVuIHRoZSBjb2RlIG1vZGUgY2hhbmdlcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB2YWx1ZSAtIFRoZSBzZWxlY3RlZCB2YWx1ZSBmcm9tIHRoZSBkcm9wZG93bi5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dCAtIFRoZSBzZWxlY3RlZCB0ZXh0IGZyb20gdGhlIGRyb3Bkb3duLlxuICAgICAqL1xuICAgIGNiT25DaGFuZ2VNb2RlKHZhbHVlLCB0ZXh0KXtcbiAgICAgICAgLy8gSGFuZGxlIGNvZGUgdmlzaWJpbGl0eSBhbmQgY29udGVudCBiYXNlZCBvbiB0aGUgJ21vZGUnXG4gICAgICAgIHN3aXRjaCAodmFsdWUpIHtcbiAgICAgICAgICAgIGNhc2UgJ25vbmUnOlxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHRhYk1lbnUudGFiKCdjaGFuZ2UgdGFiJywnb3JpZ2luYWwnKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ292ZXJyaWRlJzpcbiAgICAgICAgICAgIGNhc2UgJ2N1c3RvbSc6ICAvLyBDdXN0b20gbW9kZSBiZWhhdmVzIGxpa2Ugb3ZlcnJpZGVcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiR0YWJNZW51LnRhYignY2hhbmdlIHRhYicsJ2VkaXRvcicpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnYXBwZW5kJzpcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiR0YWJNZW51LnRhYignY2hhbmdlIHRhYicsJ2VkaXRvcicpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnc2NyaXB0JzpcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiR0YWJNZW51LnRhYignY2hhbmdlIHRhYicsJ2VkaXRvcicpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiR0YWJNZW51LnRhYignY2hhbmdlIHRhYicsJ29yaWdpbmFsJyk7XG4gICAgICAgIH1cbiAgICAgICAgY3VzdG9tRmlsZS5oaWRlU2hvd0NvZGUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRXZlbnQgaGFuZGxlciBmb3IgdGFiIGNoYW5nZXMuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY3VycmVudFRhYiAtIFRoZSBjdXJyZW50IHRhYiB0aGF0IGlzIHZpc2libGUuXG4gICAgICovXG4gICAgb25DaGFuZ2VUYWIoY3VycmVudFRhYil7XG4gICAgICAgIGNvbnN0IGZpbGVQYXRoID0gY3VzdG9tRmlsZS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZmlsZXBhdGgnKTtcbiAgICAgICAgc3dpdGNoIChjdXJyZW50VGFiKSB7XG4gICAgICAgICAgICBjYXNlICdyZXN1bHQnOlxuICAgICAgICAgICAgICAgICQoJy50YWJbZGF0YS10YWI9XCJyZXN1bHRcIl0nKS5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIEZpbGVzQVBJLmdldEZpbGVDb250ZW50KGZpbGVQYXRoLCBjdXN0b21GaWxlLmNiR2V0UmVzdWx0RmlsZUNvbnRlbnRGcm9tU2VydmVyLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdvcmlnaW5hbCc6XG4gICAgICAgICAgICAgICAgJCgnLnRhYltkYXRhLXRhYj1cIm9yaWdpbmFsXCJdJykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBGaWxlc0FQSS5nZXRGaWxlQ29udGVudChmaWxlUGF0aCwgY3VzdG9tRmlsZS5jYkdldE9yaWdpbmFsRmlsZUNvbnRlbnRGcm9tU2VydmVyLCB0cnVlKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2VkaXRvcic6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlcyB0aGUgdmlzaWJpbGl0eSBhbmQgY29udGVudCBvZiBjb2RlIGJhc2VkIG9uIHRoZSAnbW9kZScgZm9ybSB2YWx1ZS5cbiAgICAgKiBBZGp1c3RzIHRoZSBBY2UgZWRpdG9yIHNldHRpbmdzIGFjY29yZGluZ2x5LlxuICAgICAqL1xuICAgIGhpZGVTaG93Q29kZSgpIHtcbiAgICAgICAgLy8gUmV0cmlldmUgJ21vZGUnIHZhbHVlIGZyb20gdGhlIGZvcm1cbiAgICAgICAgY29uc3QgbW9kZSA9IGN1c3RvbUZpbGUuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ21vZGUnKTtcblxuICAgICAgICAvLyBHZXQgY3VycmVudCBjb250ZW50IGZyb20gZWRpdG9yIChub3QgZnJvbSBmb3JtLCBhcyBmb3JtIGRvZXNuJ3QgaGF2ZSBpdCBhbnltb3JlKVxuICAgICAgICBsZXQgY29udGVudCA9IGN1c3RvbUZpbGUuZWRpdG9yLmdldFZhbHVlKCk7XG5cbiAgICAgICAgLy8gR2V0IHRhYiBtZW51IGl0ZW1zXG4gICAgICAgIGNvbnN0ICRvcmlnaW5hbFRhYk1lbnVJdGVtID0gJCgnLml0ZW1bZGF0YS10YWI9XCJvcmlnaW5hbFwiXScpO1xuICAgICAgICBjb25zdCAkcmVzdWx0VGFiTWVudUl0ZW0gPSAkKCcuaXRlbVtkYXRhLXRhYj1cInJlc3VsdFwiXScpO1xuXG4gICAgICAgIC8vIEhhbmRsZSBjb2RlIHZpc2liaWxpdHkgYW5kIGNvbnRlbnQgYmFzZWQgb24gdGhlICdtb2RlJ1xuICAgICAgICBzd2l0Y2ggKG1vZGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ25vbmUnOlxuICAgICAgICAgICAgICAgIC8vIElmICdtb2RlJyBpcyAnbm9uZScsIHNob3cgb25seSByZXN1bHQgY29kZSBnZW5lcmF0ZWQgYW5kIGhpZGUgZWRpdG9yIGFuZCByZXN1bHQgdmlld2VyXG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZWRpdG9yVGFiLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRvcmlnaW5hbFRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbC5uYXZpZ2F0ZUZpbGVTdGFydCgpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHJlc3VsdFRhYi5oaWRlKCk7XG4gICAgICAgICAgICAgICAgLy8gU2hvdy9oaWRlIG1lbnUgaXRlbXNcbiAgICAgICAgICAgICAgICAkb3JpZ2luYWxUYWJNZW51SXRlbS5zaG93KCk7XG4gICAgICAgICAgICAgICAgJHJlc3VsdFRhYk1lbnVJdGVtLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2FwcGVuZCc6XG4gICAgICAgICAgICAgICAgLy8gSWYgJ21vZGUnIGlzICdhcHBlbmQnLCBzaG93IGFsbCBmaWVsZHNcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRlZGl0b3JUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJG9yaWdpbmFsVGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRyZXN1bHRUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUudmlld2VyT3JpZ2luYWwubmF2aWdhdGVGaWxlRW5kKCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJSZXN1bHQubmF2aWdhdGVGaWxlRW5kKCk7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBhbGwgbWVudSBpdGVtc1xuICAgICAgICAgICAgICAgICRvcmlnaW5hbFRhYk1lbnVJdGVtLnNob3coKTtcbiAgICAgICAgICAgICAgICAkcmVzdWx0VGFiTWVudUl0ZW0uc2hvdygpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnb3ZlcnJpZGUnOlxuICAgICAgICAgICAgICAgIC8vIElmICdtb2RlJyBpcyAnb3ZlcnJpZGUnLCBzaG93IGVkaXRvciBhbmQgaGlkZSBvcmlnaW5hbCwgYnV0IHNob3cgcmVzdWx0XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZWRpdG9yVGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRvcmlnaW5hbFRhYi5oaWRlKCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kcmVzdWx0VGFiLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAvLyBTaG93L2hpZGUgbWVudSBpdGVtc1xuICAgICAgICAgICAgICAgICRvcmlnaW5hbFRhYk1lbnVJdGVtLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAkcmVzdWx0VGFiTWVudUl0ZW0uaGlkZSgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnY3VzdG9tJzpcbiAgICAgICAgICAgICAgICAvLyBGb3IgJ2N1c3RvbScgbW9kZSwgb25seSBzaG93IGVkaXRvciB0YWIgLSB1c2VyIGZ1bGx5IGNvbnRyb2xzIHRoZSBmaWxlXG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZWRpdG9yVGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRvcmlnaW5hbFRhYi5oaWRlKCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kcmVzdWx0VGFiLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAvLyBIaWRlIG90aGVyIHRhYiBtZW51IGl0ZW1zIGZvciBjdXN0b20gZmlsZXNcbiAgICAgICAgICAgICAgICAkb3JpZ2luYWxUYWJNZW51SXRlbS5oaWRlKCk7XG4gICAgICAgICAgICAgICAgJHJlc3VsdFRhYk1lbnVJdGVtLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3NjcmlwdCc6XG4gICAgICAgICAgICAgICAgLy8gSWYgJ21vZGUnIGlzICdzY3JpcHQnLCBzaG93IGJvdGggc2VydmVyIGFuZCBjdXN0b20gY29kZSwgYXBwbHkgY3VzdG9tIHNjcmlwdCB0byB0aGUgZmlsZSBjb250ZW50IG9uIHNlcnZlclxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGVkaXRvclRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kb3JpZ2luYWxUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHJlc3VsdFRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBhbGwgbWVudSBpdGVtcyBmb3Igc2NyaXB0IG1vZGVcbiAgICAgICAgICAgICAgICAkb3JpZ2luYWxUYWJNZW51SXRlbS5zaG93KCk7XG4gICAgICAgICAgICAgICAgJHJlc3VsdFRhYk1lbnVJdGVtLnNob3coKTtcbiAgICAgICAgICAgICAgICAvLyBFZGl0b3IgLSBvbmx5IHNldCB0ZW1wbGF0ZSBpZiBjb250ZW50IGlzIGVtcHR5XG4gICAgICAgICAgICAgICAgaWYgKCFjb250ZW50IHx8IGNvbnRlbnQudHJpbSgpID09PSAnJykge1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50ID0gYCMhL2Jpbi9iYXNoIFxcblxcbmA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYGNvbmZpZ1BhdGg9XCIkMVwiICMgUGF0aCB0byB0aGUgb3JpZ2luYWwgY29uZmlnIGZpbGVcXG5cXG5gO1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGAjIEV4YW1wbGUgMTogUmVwbGFjZSBhbGwgdmFsdWVzIG1heF9jb250YWN0cyA9IDUgdG8gbWF4X2NvbnRhY3RzID0gMSBvbiBwanNpcC5jb25mXFxuYDtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgIyBzZWQgLWkgJ3MvbWF4X2NvbnRhY3RzID0gNS9tYXhfY29udGFjdHMgPSAxL2cnIFwiJGNvbmZpZ1BhdGhcIlxcblxcbmBcblxuICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGAjIEV4YW1wbGUgMjogQ2hhbmdlIHZhbHVlIG1heF9jb250YWN0cyBvbmx5IGZvciBwZWVyIHdpdGggZXh0ZW5zaW9uIDIyNiBvbiBwanNpcC5jb25mXFxuYDtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgIyBzZWQgLWkgJy9eXFxcXFsyMjZcXFxcXSQvLC9eXFxcXFsvIHMvbWF4X2NvbnRhY3RzID0gNS9tYXhfY29udGFjdHMgPSAyLycgXCIkY29uZmlnUGF0aFwiXFxuXFxuYFxuXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYCMgRXhhbXBsZSAzOiBBZGQgZW4gZXh0cmEgc3RyaW5nIGludG8gW3BsYXliYWNrLWV4aXRdIHNlY3Rpb24gYWZ0ZXIgdGhlIFwic2FtZSA9PiBuLEhhbmd1cCgpXCIgc3RyaW5nIG9uIGV4dGVuc2lvbnMuY29uZlxcbmA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYCMgc2VkIC1pICcvXlxcXFxbcGxheWJhY2stZXhpdFxcXFxdJC8sL15cXFxcWy8gcy9eXFxcXChcXFxccypzYW1lID0+IG4sSGFuZ3VwKClcXFxcKS9cXFxcMVxcXFxuXFxcXHRzYW1lID0+IG4sTm9PcChcIllvdXIgTm9PcCBjb21tZW50IGhlcmVcIikvJyBcIiRjb25maWdQYXRoXCJcXG5cXG5gO1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYCMgQXR0ZW50aW9uISBZb3Ugd2lsbCBzZWUgY2hhbmdlcyBhZnRlciB0aGUgYmFja2dyb3VuZCB3b3JrZXIgcHJvY2Vzc2VzIHRoZSBzY3JpcHQgb3IgYWZ0ZXIgcmVib290aW5nIHRoZSBzeXN0ZW0uIFxcbmA7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gT25seSBzZXQgY29udGVudCBpZiB3ZSBjcmVhdGVkIGEgdGVtcGxhdGVcbiAgICAgICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2V0VmFsdWUoY29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSBhbnkgb3RoZXIgJ21vZGUnIHZhbHVlc1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbC5zZXRUaGVtZSgnYWNlL3RoZW1lL21vbm9rYWknKTtcbiAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2V0VGhlbWUoJ2FjZS90aGVtZS9tb25va2FpJyk7XG5cbiAgICAgICAgLy8gRG9uJ3Qgb3ZlcndyaXRlIGVkaXRvciBjb250ZW50IGhlcmUgLSBpdCdzIGFscmVhZHkgc2V0IGNvcnJlY3RseVxuICAgICAgICAvLyBjdXN0b21GaWxlLmVkaXRvci5zZXRWYWx1ZShjb250ZW50KTtcbiAgICAgICAgLy8gY3VzdG9tRmlsZS5lZGl0b3IuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdGhhdCBoYW5kbGVzIHRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgY29udGFpbmluZyB0aGUgZmlsZSdzIGNvbnRlbnQuXG4gICAgICogSXQgd2lsbCB1cGRhdGUgdGhlICd2aWV3ZXJPcmlnaW5hbCcgd2l0aCB0aGUgZmlsZSdzIGNvbnRlbnQgYW5kIGFkanVzdCB0aGUgY29kZSBkaXNwbGF5LlxuICAgICAqL1xuICAgIGNiR2V0T3JpZ2luYWxGaWxlQ29udGVudEZyb21TZXJ2ZXIocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEuY29udGVudCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb25zdCBhY2VWaWV3ZXIgPSBjdXN0b21GaWxlLnZpZXdlck9yaWdpbmFsO1xuICAgICAgICAgICAgY29uc3Qgc2Nyb2xsVG9wID0gYWNlVmlld2VyLnNlc3Npb24uZ2V0U2Nyb2xsVG9wKCk7XG4gICAgICAgICAgICBhY2VWaWV3ZXIuc2Vzc2lvbi5zZXRWYWx1ZShyZXNwb25zZS5kYXRhLmNvbnRlbnQpO1xuICAgICAgICAgICAgYWNlVmlld2VyLnNlc3Npb24uc2V0U2Nyb2xsVG9wKHNjcm9sbFRvcCk7XG4gICAgICAgIH1cbiAgICAgICAgJCgnLnRhYltkYXRhLXRhYj1cIm9yaWdpbmFsXCJdJykucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdGhhdCBoYW5kbGVzIHRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgY29udGFpbmluZyB0aGUgZmlsZSdzIGNvbnRlbnQuXG4gICAgICogSXQgd2lsbCB1cGRhdGUgdGhlICd2aWV3ZXJSZXN1bHQnIHdpdGggdGhlIGZpbGUncyBjb250ZW50IGFuZCBhZGp1c3QgdGhlIGNvZGUgZGlzcGxheS5cbiAgICAgKi9cbiAgICBjYkdldFJlc3VsdEZpbGVDb250ZW50RnJvbVNlcnZlcihyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5jb250ZW50ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGFjZVZpZXdlciA9IGN1c3RvbUZpbGUudmlld2VyUmVzdWx0O1xuICAgICAgICAgICAgY29uc3Qgc2Nyb2xsVG9wID0gYWNlVmlld2VyLnNlc3Npb24uZ2V0U2Nyb2xsVG9wKCk7XG4gICAgICAgICAgICBhY2VWaWV3ZXIuc2Vzc2lvbi5zZXRWYWx1ZShyZXNwb25zZS5kYXRhLmNvbnRlbnQpO1xuICAgICAgICAgICAgYWNlVmlld2VyLnNlc3Npb24uc2V0U2Nyb2xsVG9wKHNjcm9sbFRvcCk7XG4gICAgICAgIH1cbiAgICAgICAgJCgnLnRhYltkYXRhLXRhYj1cInJlc3VsdFwiXScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIEFjZSBlZGl0b3IgaW5zdGFuY2VzIGZvciAnZWRpdG9yJyBhbmQgJ3ZpZXdlcnMnIHdpbmRvd3MuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUFjZSgpIHtcbiAgICAgICAgLy8gQ2FsY3VsYXRlIGFjZSBlZGl0b3IgaGVpZ2h0IGFuZCByb3dzIGNvdW50XG4gICAgICAgIGNvbnN0IGFjZUhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCAtIDQ3NTtcbiAgICAgICAgY29uc3Qgcm93c0NvdW50ID0gTWF0aC5yb3VuZChhY2VIZWlnaHQgLyAxNi4zKTtcblxuICAgICAgICAvLyBTZXQgbWluaW11bSBoZWlnaHQgZm9yIHRoZSBjb2RlIHNlY3Rpb25zIG9uIHdpbmRvdyBsb2FkXG4gICAgICAgICQoJy5hcHBsaWNhdGlvbi1jb2RlJykuY3NzKCdtaW4taGVpZ2h0JywgYCR7YWNlSGVpZ2h0fXB4YCk7XG5cbiAgICAgICAgLy8gQUNFIHdpbmRvdyBmb3IgdGhlIG9yaWdpbmFsIGZpbGUgY29udGVudC5cbiAgICAgICAgY29uc3QgSW5pTW9kZSA9IGFjZS5yZXF1aXJlKCdhY2UvbW9kZS9qdWxpYScpLk1vZGU7XG4gICAgICAgIGN1c3RvbUZpbGUudmlld2VyT3JpZ2luYWwgPSBhY2UuZWRpdCgnY29uZmlnLWZpbGUtb3JpZ2luYWwnKTtcbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbC5zZXNzaW9uLnNldE1vZGUobmV3IEluaU1vZGUoKSk7XG4gICAgICAgIGN1c3RvbUZpbGUudmlld2VyT3JpZ2luYWwuc2V0VGhlbWUoJ2FjZS90aGVtZS9tb25va2FpJyk7XG4gICAgICAgIGN1c3RvbUZpbGUudmlld2VyT3JpZ2luYWwuc2V0T3B0aW9ucyh7XG4gICAgICAgICAgICBzaG93UHJpbnRNYXJnaW46IGZhbHNlLFxuICAgICAgICAgICAgcmVhZE9ubHk6IHRydWUsXG4gICAgICAgICAgICBtaW5MaW5lczogcm93c0NvdW50XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFDRSB3aW5kb3cgZm9yIHRoZSByZXN1bHRlZCBmaWxlIGNvbnRlbnQuXG4gICAgICAgIGN1c3RvbUZpbGUudmlld2VyUmVzdWx0ID0gYWNlLmVkaXQoJ2NvbmZpZy1maWxlLXJlc3VsdCcpO1xuICAgICAgICBjdXN0b21GaWxlLnZpZXdlclJlc3VsdC5zZXNzaW9uLnNldE1vZGUobmV3IEluaU1vZGUoKSk7XG4gICAgICAgIGN1c3RvbUZpbGUudmlld2VyUmVzdWx0LnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuICAgICAgICBjdXN0b21GaWxlLnZpZXdlclJlc3VsdC5zZXRPcHRpb25zKHtcbiAgICAgICAgICAgIHNob3dQcmludE1hcmdpbjogZmFsc2UsXG4gICAgICAgICAgICByZWFkT25seTogdHJ1ZSxcbiAgICAgICAgICAgIG1pbkxpbmVzOiByb3dzQ291bnRcbiAgICAgICAgfSk7XG5cblxuICAgICAgICAvLyBBQ0Ugd2luZG93IGZvciB0aGUgdXNlciBlZGl0b3IuXG4gICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yID0gYWNlLmVkaXQoJ3VzZXItZWRpdC1jb25maWcnKTtcbiAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2Vzc2lvbi5zZXRNb2RlKG5ldyBJbmlNb2RlKCkpO1xuICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXRUaGVtZSgnYWNlL3RoZW1lL21vbm9rYWknKTtcbiAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2V0T3B0aW9ucyh7XG4gICAgICAgICAgICBzaG93UHJpbnRNYXJnaW46IGZhbHNlLFxuICAgICAgICAgICAgbWluTGluZXM6IHJvd3NDb3VudCxcbiAgICAgICAgfSk7XG4gICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLnNlc3Npb24ub24oJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50IHRvIGFja25vd2xlZGdlIHRoZSBtb2RpZmljYXRpb25cbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gIEFkZCBoYW5kbGVycyBmb3IgZnVsbHNjcmVlbiBtb2RlIGJ1dHRvbnNcbiAgICAgICAgJCgnLmZ1bGxzY3JlZW4tdG9nZ2xlLWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRhaW5lciA9ICQodGhpcykuc2libGluZ3MoJy5hcHBsaWNhdGlvbi1jb2RlJylbMF07XG4gICAgICAgICAgICBjdXN0b21GaWxlLnRvZ2dsZUZ1bGxTY3JlZW4oY29udGFpbmVyKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gQWRkIGhhbmRsZXIgdG8gcmVjYWxjdWxhdGUgc2l6ZXMgd2hlbiBleGl0aW5nIGZ1bGxzY3JlZW4gbW9kZVxuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdmdWxsc2NyZWVuY2hhbmdlJywgY3VzdG9tRmlsZS5hZGp1c3RFZGl0b3JIZWlnaHQpO1xuXG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBFbmFibGUvZGlzYWJsZSBmdWxsc2NyZWVuIG1vZGUgZm9yIGEgc3BlY2lmaWMgYmxvY2suXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBjb250YWluZXIgLSBUaGUgY29udGFpbmVyIHRvIGV4cGFuZCB0byBmdWxsc2NyZWVuLlxuICAgICAqL1xuICAgIHRvZ2dsZUZ1bGxTY3JlZW4oY29udGFpbmVyKSB7XG4gICAgICAgIGlmICghZG9jdW1lbnQuZnVsbHNjcmVlbkVsZW1lbnQpIHtcbiAgICAgICAgICAgIGNvbnRhaW5lci5yZXF1ZXN0RnVsbHNjcmVlbigpLmNhdGNoKGVyciA9PiB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgYXR0ZW1wdGluZyB0byBlbmFibGUgZnVsbC1zY3JlZW4gbW9kZTogJHtlcnIubWVzc2FnZX1gKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZG9jdW1lbnQuZXhpdEZ1bGxzY3JlZW4oKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZWNhbGN1bGF0ZSBlZGl0b3IgaGVpZ2h0cyB3aGVuIHRoZSBzY3JlZW4gbW9kZSBjaGFuZ2VzLlxuICAgICAqL1xuICAgIGFkanVzdEVkaXRvckhlaWdodCgpIHtcbiAgICAgICAgY29uc3QgZWRpdG9ycyA9IFtjdXN0b21GaWxlLnZpZXdlck9yaWdpbmFsLCBjdXN0b21GaWxlLnZpZXdlclJlc3VsdCwgY3VzdG9tRmlsZS5lZGl0b3JdO1xuICAgICAgICBlZGl0b3JzLmZvckVhY2goZWRpdG9yID0+IHtcbiAgICAgICAgICAgIGlmIChlZGl0b3IpIHtcbiAgICAgICAgICAgICAgICBlZGl0b3IucmVzaXplKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBjdXN0b21GaWxlLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblxuICAgICAgICAvLyBHZXQgbW9kZSBmcm9tIGZvcm1cbiAgICAgICAgbGV0IG1vZGUgPSBjdXN0b21GaWxlLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdtb2RlJyk7XG5cbiAgICAgICAgLy8gSU1QT1JUQU5UOiBDaGVjayBpZiBkcm9wZG93biBpcyBoaWRkZW4gKGluZGljYXRvciBvZiBjdXN0b20gZmlsZSlcbiAgICAgICAgLy8gV2hlbiBkcm9wZG93biBpcyBoaWRkZW4sIGl0IG1pZ2h0IHJldHVybiBpbmNvcnJlY3QgdmFsdWVcbiAgICAgICAgaWYgKGN1c3RvbUZpbGUuJG1vZGVEcm9wRG93bi5wYXJlbnQoKS5wYXJlbnQoKS5pcygnOmhpZGRlbicpKSB7XG4gICAgICAgICAgICAvLyBUaGlzIGlzIGEgY3VzdG9tIGZpbGUsIGZvcmNlIG1vZGUgdG8gYmUgJ2N1c3RvbSdcbiAgICAgICAgICAgIG1vZGUgPSAnY3VzdG9tJztcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLm1vZGUgPSAnY3VzdG9tJztcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdDdXN0b20gZmlsZSBkZXRlY3RlZCAoZHJvcGRvd24gaGlkZGVuKSwgZm9yY2luZyBtb2RlIHRvIGN1c3RvbScpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkaXRpb25hbCBjaGVjazogRW5zdXJlIG1vZGUgc3RheXMgJ2N1c3RvbScgZm9yIGN1c3RvbSBmaWxlc1xuICAgICAgICBpZiAobW9kZSA9PT0gJ2N1c3RvbScgfHwgKHJlc3VsdC5kYXRhLm1vZGUgPT09ICdjdXN0b20nKSkge1xuICAgICAgICAgICAgLy8gRm9yY2UgbW9kZSB0byBzdGF5ICdjdXN0b20nIGZvciBjdXN0b20gZmlsZXNcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLm1vZGUgPSAnY3VzdG9tJztcbiAgICAgICAgICAgIG1vZGUgPSAnY3VzdG9tJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEdldCBjb250ZW50IGZyb20gQWNlIGVkaXRvciBiYXNlZCBvbiBtb2RlXG4gICAgICAgIHN3aXRjaCAobW9kZSkge1xuICAgICAgICAgICAgY2FzZSAnYXBwZW5kJzpcbiAgICAgICAgICAgIGNhc2UgJ292ZXJyaWRlJzpcbiAgICAgICAgICAgIGNhc2UgJ2N1c3RvbSc6XG4gICAgICAgICAgICBjYXNlICdzY3JpcHQnOlxuICAgICAgICAgICAgICAgIC8vIEdldCBjb250ZW50IGZyb20gQWNlIGVkaXRvciAobm90IGJhc2U2NCBlbmNvZGVkIHlldClcbiAgICAgICAgICAgICAgICBpZiAoIWN1c3RvbUZpbGUuZWRpdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0VkaXRvciBpcyBub3QgaW5pdGlhbGl6ZWQhJyk7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhLmNvbnRlbnQgPSAnJztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBlZGl0b3JDb250ZW50ID0gY3VzdG9tRmlsZS5lZGl0b3IuZ2V0VmFsdWUoKTtcbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0LmRhdGEuY29udGVudCA9IGVkaXRvckNvbnRlbnQ7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gRGVidWc6IGxvZyBjb250ZW50IGZvciBjdXN0b20gbW9kZVxuICAgICAgICAgICAgICAgICAgICBpZiAobW9kZSA9PT0gJ2N1c3RvbScpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTYXZpbmcgY3VzdG9tIGZpbGUgd2l0aCBjb250ZW50IGxlbmd0aDonLCBlZGl0b3JDb250ZW50Lmxlbmd0aCk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnRmlyc3QgMTAwIGNoYXJzOicsIGVkaXRvckNvbnRlbnQuc3Vic3RyaW5nKDAsIDEwMCkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnbm9uZSc6XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIC8vIEZvciAnbm9uZScgbW9kZSwgY2xlYXIgdGhlIGNvbnRlbnRcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YS5jb250ZW50ID0gJyc7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcblxuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gY3VzdG9tRmlsZS4kZm9ybU9iajtcblxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUEkgc2V0dGluZ3MgZm9yIEZvcm1cbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBhcGlPYmplY3Q6IGN1c3RvbUZpbGVzQVBJLFxuICAgICAgICAgICAgc2F2ZU1ldGhvZDogJ3NhdmUnLCAgLy8gV2lsbCB1c2UgdGhlIHNtYXJ0IHNhdmUgbWV0aG9kIHRoYXQgZGV0ZXJtaW5lcyBjcmVhdGUvdXBkYXRlXG4gICAgICAgICAgICBhdXRvRGV0ZWN0TWV0aG9kOiBmYWxzZSwgIC8vIFdlIGhhbmRsZSB0aGlzIGluIG91ciBzYXZlIG1ldGhvZFxuICAgICAgICAgICAgaWRGaWVsZDogJ2lkJ1xuICAgICAgICB9O1xuXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGN1c3RvbUZpbGUudmFsaWRhdGVSdWxlczsgLy8gRm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGN1c3RvbUZpbGUuY2JCZWZvcmVTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYmVmb3JlIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGN1c3RvbUZpbGUuY2JBZnRlclNlbmRGb3JtOyAvLyBDYWxsYmFjayBhZnRlciBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcbn07XG5cbi8vIEluaXRpYWxpemUgdGhlIGN1c3RvbSBmaWxlcyBtb2RpZnkgZm9ybSB3aGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeS5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBjdXN0b21GaWxlLmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=