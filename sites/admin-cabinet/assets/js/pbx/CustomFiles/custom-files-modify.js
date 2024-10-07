"use strict";

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

/* global globalRootUrl,globalTranslate, ace, Form, PbxApi */

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
  $modeDropDown: $('#custom-file-form .mode-select'),

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
   * Initializes the customFile module.
   * Sets up the dropdown, initializes Ace editor, form, and retrieves file content from the server.
   */
  initialize: function initialize() {
    // Enable tab navigation with history support
    customFile.$tabMenu.tab({
      onVisible: customFile.onChangeTab
    });
    customFile.$mainContainer.removeClass('container'); // Initialize Ace editor

    customFile.initializeAce();
    customFile.$modeDropDown.dropdown({
      onChange: customFile.cbOnChangeMode
    });
    var mode = customFile.$formObj.form('get value', 'mode');
    customFile.cbOnChangeMode(mode); // Initialize form

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
    var mode = customFile.$formObj.form('get value', 'mode');
    var content = customFile.$formObj.form('get value', 'content'); // Handle code visibility and content based on the 'mode'

    switch (mode) {
      case 'none':
        // If 'mode' is 'none', show only result code generated and hide editor and result viewer
        customFile.$editorTab.hide();
        customFile.$originalTab.show();
        customFile.viewerOriginal.navigateFileStart();
        customFile.$resultTab.hide();
        break;

      case 'append':
        // If 'mode' is 'append', show all fields
        customFile.$editorTab.show();
        customFile.$originalTab.show();
        customFile.$resultTab.show();
        customFile.viewerOriginal.navigateFileEnd();
        customFile.viewerResult.navigateFileEnd();
        break;

      case 'override':
        // If 'mode' is 'override', show custom content and hide server content, replace server file content with custom content
        customFile.$editorTab.show();
        customFile.$originalTab.hide();
        customFile.$resultTab.hide();
        break;

      case 'script':
        // If 'mode' is 'script', show both server and custom code, apply custom script to the file content on server
        customFile.$editorTab.show();
        customFile.$originalTab.show();
        customFile.$resultTab.show(); // Editor

        if (!content.includes('#!/bin/bash')) {
          content = "#!/bin/bash \n\n";
          content += "configPath=\"$1\" # Path to the original config file\n\n";
          content += "# Example 1: Replace all values max_contacts = 5 to max_contacts = 1 on pjsip.conf\n";
          content += "# sed -i 's/max_contacts = 5/max_contacts = 1/g' \"$configPath\"\n\n";
          content += "# Example 2: Change value max_contacts only for peer with extension 226 on pjsip.conf\n";
          content += "# sed -i '/^\\[226\\]$/,/^\\[/ s/max_contacts = 5/max_contacts = 2/' \"$configPath\"\n\n";
          content += "# Example 3: Add en extra string into [playback-exit] section after the \"same => n,Hangup()\" string on extensions.conf\n";
          content += "# sed -i '/^\\[playback-exit\\]$/,/^\\[/ s/^\\(\\s*same => n,Hangup()\\)/\\1\\n\\tsame => n,NoOp(\"Your NoOp comment here\")/' \"$configPath\"\n\n";
          content += "# Attention! You will see changes after the background worker processes the script or after rebooting the system. \n";
        }

        customFile.editor.setValue(content);
        break;

      default:
        // Handle any other 'mode' values
        break;
    }

    customFile.viewerOriginal.setTheme('ace/theme/monokai');
    customFile.editor.setTheme('ace/theme/monokai');
    customFile.editor.setValue(content);
    customFile.editor.clearSelection();
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
    result.data = customFile.$formObj.form('get values');

    switch (customFile.$formObj.form('get value', 'mode')) {
      case 'append':
      case 'override':
      case 'script':
        result.data.content = customFile.editor.getValue();
        break;

      default:
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
    Form.$formObj = customFile.$formObj;
    Form.url = "".concat(globalRootUrl, "custom-files/save"); // Form submission URL

    Form.validateRules = customFile.validateRules; // Form validation rules

    Form.cbBeforeSendForm = customFile.cbBeforeSendForm; // Callback before form is sent

    Form.cbAfterSendForm = customFile.cbAfterSendForm; // Callback after form is sent

    Form.initialize();
  }
}; // Initialize the custom files modify form when the document is ready.

$(document).ready(function () {
  customFile.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DdXN0b21GaWxlcy9jdXN0b20tZmlsZXMtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbImN1c3RvbUZpbGUiLCIkZm9ybU9iaiIsIiQiLCIkdGFiTWVudSIsIiRtb2RlRHJvcERvd24iLCIkb3JpZ2luYWxUYWIiLCIkZWRpdG9yVGFiIiwiJHJlc3VsdFRhYiIsIiRtYWluQ29udGFpbmVyIiwiZWRpdG9yIiwidmlld2VyT3JpZ2luYWwiLCJ2aWV3ZXJSZXN1bHQiLCJ2YWxpZGF0ZVJ1bGVzIiwibmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJjZl9WYWxpZGF0ZU5hbWVJc0VtcHR5IiwiaW5pdGlhbGl6ZSIsInRhYiIsIm9uVmlzaWJsZSIsIm9uQ2hhbmdlVGFiIiwicmVtb3ZlQ2xhc3MiLCJpbml0aWFsaXplQWNlIiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsImNiT25DaGFuZ2VNb2RlIiwibW9kZSIsImZvcm0iLCJpbml0aWFsaXplRm9ybSIsInZhbHVlIiwidGV4dCIsImhpZGVTaG93Q29kZSIsImN1cnJlbnRUYWIiLCJmaWxlUGF0aCIsImRhdGEiLCJmaWxlbmFtZSIsIm5lZWRPcmlnaW5hbCIsIm5lZWRMb2dmaWxlIiwiYWRkQ2xhc3MiLCJQYnhBcGkiLCJHZXRGaWxlQ29udGVudCIsImNiR2V0UmVzdWx0RmlsZUNvbnRlbnRGcm9tU2VydmVyIiwiY2JHZXRPcmlnaW5hbEZpbGVDb250ZW50RnJvbVNlcnZlciIsImNvbnRlbnQiLCJoaWRlIiwic2hvdyIsIm5hdmlnYXRlRmlsZVN0YXJ0IiwibmF2aWdhdGVGaWxlRW5kIiwiaW5jbHVkZXMiLCJzZXRWYWx1ZSIsInNldFRoZW1lIiwiY2xlYXJTZWxlY3Rpb24iLCJyZXNwb25zZSIsInVuZGVmaW5lZCIsImFjZVZpZXdlciIsInNjcm9sbFRvcCIsInNlc3Npb24iLCJnZXRTY3JvbGxUb3AiLCJzZXRTY3JvbGxUb3AiLCJhY2VIZWlnaHQiLCJ3aW5kb3ciLCJpbm5lckhlaWdodCIsInJvd3NDb3VudCIsIk1hdGgiLCJyb3VuZCIsImNzcyIsIkluaU1vZGUiLCJhY2UiLCJyZXF1aXJlIiwiTW9kZSIsImVkaXQiLCJzZXRNb2RlIiwic2V0T3B0aW9ucyIsInNob3dQcmludE1hcmdpbiIsInJlYWRPbmx5IiwibWluTGluZXMiLCJvbiIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImNvbnRhaW5lciIsInNpYmxpbmdzIiwidG9nZ2xlRnVsbFNjcmVlbiIsImRvY3VtZW50IiwiYWRkRXZlbnRMaXN0ZW5lciIsImFkanVzdEVkaXRvckhlaWdodCIsImZ1bGxzY3JlZW5FbGVtZW50IiwicmVxdWVzdEZ1bGxzY3JlZW4iLCJlcnIiLCJjb25zb2xlIiwiZXJyb3IiLCJtZXNzYWdlIiwiZXhpdEZ1bGxzY3JlZW4iLCJlZGl0b3JzIiwiZm9yRWFjaCIsInJlc2l6ZSIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsInJlc3VsdCIsImdldFZhbHVlIiwiY2JBZnRlclNlbmRGb3JtIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFVBQVUsR0FBRztBQUVmO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLG1CQUFELENBTkk7O0FBUWY7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFRCxDQUFDLENBQUMsMEJBQUQsQ0FaSTs7QUFjZjtBQUNKO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxhQUFhLEVBQUVGLENBQUMsQ0FBQyxnQ0FBRCxDQWxCRDs7QUFvQmY7QUFDSjtBQUNBO0FBQ0E7QUFDSUcsRUFBQUEsWUFBWSxFQUFFSCxDQUFDLENB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QUFELENBQUQsQ0FBWW9CLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnpHLEVBQUFBLFVBQVUsQ0FBQ29CLFVBQVg7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsZ2xvYmFsVHJhbnNsYXRlLCBhY2UsIEZvcm0sIFBieEFwaSAqL1xuXG5cbi8qKlxuICogTW9kdWxlIGN1c3RvbUZpbGVcbiAqIFRoaXMgbW9kdWxlIG1hbmFnZXMgZmlsZSBpbnRlcmFjdGlvbnMgaW4gYSBVSSwgc3VjaCBhcyBsb2FkaW5nIGZpbGUgY29udGVudCBmcm9tIGEgc2VydmVyIGFuZCBoYW5kbGluZyB1c2VyIGlucHV0LlxuICogQG1vZHVsZSBjdXN0b21GaWxlXG4gKi9cbmNvbnN0IGN1c3RvbUZpbGUgPSB7XG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjY3VzdG9tLWZpbGUtZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHRhYiBtZW51LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHRhYk1lbnU6ICQoJyNjdXN0b20tZmlsZXMtbWVudSAuaXRlbScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIG1vZGUgc2VsZWN0LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG1vZGVEcm9wRG93bjogJCgnI2N1c3RvbS1maWxlLWZvcm0gLm1vZGUtc2VsZWN0JyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdGFiIHdpdGggb3JpZ2luYWwgZmlsZSBjb250ZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG9yaWdpbmFsVGFiOiAkKCdhW2RhdGEtdGFiPVwib3JpZ2luYWxcIl0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB0YWIgd2l0aCB1c2VyIGNvbnRlbnQvc2NyaXB0IGVkaXRvci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRlZGl0b3JUYWI6ICQoJ2FbZGF0YS10YWI9XCJlZGl0b3JcIl0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB0YWIgd2l0aCByZXN1bHRlZCBmaWxlIGNvbnRlbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkcmVzdWx0VGFiOiAkKCdhW2RhdGEtdGFiPVwicmVzdWx0XCJdJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgZWxlbWVudCBmb3IgdGhlIG1haW4gY29udGVudCBjb250YWluZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbWFpbkNvbnRhaW5lcjogJCgnI21haW4tY29udGVudC1jb250YWluZXInKSxcblxuXG4gICAgLyoqXG4gICAgICogQWNlIGVkaXRvciBpbnN0YW5jZXNcbiAgICAgKiBgZWRpdG9yYCBpcyBmb3IgaW5wdXQgYW5kIGB2aWV3ZXJzYCBpcyBmb3IgZGlzcGxheSBjb2RlIGZyb20gc2VydmVyXG4gICAgICovXG4gICAgZWRpdG9yOiAnJyxcbiAgICB2aWV3ZXJPcmlnaW5hbDogJycsXG4gICAgdmlld2VyUmVzdWx0OiAnJyxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBuYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZmlsZXBhdGgnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmNmX1ZhbGlkYXRlTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBjdXN0b21GaWxlIG1vZHVsZS5cbiAgICAgKiBTZXRzIHVwIHRoZSBkcm9wZG93biwgaW5pdGlhbGl6ZXMgQWNlIGVkaXRvciwgZm9ybSwgYW5kIHJldHJpZXZlcyBmaWxlIGNvbnRlbnQgZnJvbSB0aGUgc2VydmVyLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG5cbiAgICAgICAgLy8gRW5hYmxlIHRhYiBuYXZpZ2F0aW9uIHdpdGggaGlzdG9yeSBzdXBwb3J0XG4gICAgICAgIGN1c3RvbUZpbGUuJHRhYk1lbnUudGFiKHtcbiAgICAgICAgICAgIG9uVmlzaWJsZTogY3VzdG9tRmlsZS5vbkNoYW5nZVRhYlxuICAgICAgICB9KTtcblxuICAgICAgICBjdXN0b21GaWxlLiRtYWluQ29udGFpbmVyLnJlbW92ZUNsYXNzKCdjb250YWluZXInKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIEFjZSBlZGl0b3JcbiAgICAgICAgY3VzdG9tRmlsZS5pbml0aWFsaXplQWNlKCk7XG5cbiAgICAgICAgY3VzdG9tRmlsZS4kbW9kZURyb3BEb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBjdXN0b21GaWxlLmNiT25DaGFuZ2VNb2RlXG4gICAgICAgIH0pO1xuICAgICAgICBjb25zdCBtb2RlID0gY3VzdG9tRmlsZS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnbW9kZScpO1xuICAgICAgICBjdXN0b21GaWxlLmNiT25DaGFuZ2VNb2RlKG1vZGUpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZm9ybVxuICAgICAgICBjdXN0b21GaWxlLmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZm9yIHdoZW4gdGhlIGNvZGUgbW9kZSBjaGFuZ2VzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHNlbGVjdGVkIHZhbHVlIGZyb20gdGhlIGRyb3Bkb3duLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGhlIHNlbGVjdGVkIHRleHQgZnJvbSB0aGUgZHJvcGRvd24uXG4gICAgICovXG4gICAgY2JPbkNoYW5nZU1vZGUodmFsdWUsIHRleHQpe1xuICAgICAgICAvLyBIYW5kbGUgY29kZSB2aXNpYmlsaXR5IGFuZCBjb250ZW50IGJhc2VkIG9uIHRoZSAnbW9kZSdcbiAgICAgICAgc3dpdGNoICh2YWx1ZSkge1xuICAgICAgICAgICAgY2FzZSAnbm9uZSc6XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kdGFiTWVudS50YWIoJ2NoYW5nZSB0YWInLCdvcmlnaW5hbCcpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnb3ZlcnJpZGUnOlxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHRhYk1lbnUudGFiKCdjaGFuZ2UgdGFiJywnZWRpdG9yJyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdhcHBlbmQnOlxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHRhYk1lbnUudGFiKCdjaGFuZ2UgdGFiJywnZWRpdG9yJyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdzY3JpcHQnOlxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHRhYk1lbnUudGFiKCdjaGFuZ2UgdGFiJywnZWRpdG9yJyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHRhYk1lbnUudGFiKCdjaGFuZ2UgdGFiJywnb3JpZ2luYWwnKTtcbiAgICAgICAgfVxuICAgICAgICBjdXN0b21GaWxlLmhpZGVTaG93Q29kZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFdmVudCBoYW5kbGVyIGZvciB0YWIgY2hhbmdlcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjdXJyZW50VGFiIC0gVGhlIGN1cnJlbnQgdGFiIHRoYXQgaXMgdmlzaWJsZS5cbiAgICAgKi9cbiAgICBvbkNoYW5nZVRhYihjdXJyZW50VGFiKXtcbiAgICAgICAgY29uc3QgZmlsZVBhdGggPSBjdXN0b21GaWxlLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmaWxlcGF0aCcpO1xuICAgICAgICBjb25zdCBkYXRhID0ge2ZpbGVuYW1lOiBmaWxlUGF0aCwgbmVlZE9yaWdpbmFsOiB0cnVlLCBuZWVkTG9nZmlsZTogZmFsc2V9O1xuICAgICAgICBzd2l0Y2ggKGN1cnJlbnRUYWIpIHtcbiAgICAgICAgICAgIGNhc2UgJ3Jlc3VsdCc6XG4gICAgICAgICAgICAgICAgZGF0YS5uZWVkT3JpZ2luYWw9ZmFsc2U7XG4gICAgICAgICAgICAgICAgJCgnLnRhYltkYXRhLXRhYj1cInJlc3VsdFwiXScpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgUGJ4QXBpLkdldEZpbGVDb250ZW50KGRhdGEsIGN1c3RvbUZpbGUuY2JHZXRSZXN1bHRGaWxlQ29udGVudEZyb21TZXJ2ZXIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnb3JpZ2luYWwnOlxuICAgICAgICAgICAgICAgIGRhdGEubmVlZE9yaWdpbmFsPXRydWU7XG4gICAgICAgICAgICAgICAgJCgnLnRhYltkYXRhLXRhYj1cIm9yaWdpbmFsXCJdJykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBQYnhBcGkuR2V0RmlsZUNvbnRlbnQoZGF0YSwgY3VzdG9tRmlsZS5jYkdldE9yaWdpbmFsRmlsZUNvbnRlbnRGcm9tU2VydmVyKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2VkaXRvcic6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlcyB0aGUgdmlzaWJpbGl0eSBhbmQgY29udGVudCBvZiBjb2RlIGJhc2VkIG9uIHRoZSAnbW9kZScgZm9ybSB2YWx1ZS5cbiAgICAgKiBBZGp1c3RzIHRoZSBBY2UgZWRpdG9yIHNldHRpbmdzIGFjY29yZGluZ2x5LlxuICAgICAqL1xuICAgIGhpZGVTaG93Q29kZSgpIHtcbiAgICAgICAgLy8gUmV0cmlldmUgJ21vZGUnIHZhbHVlIGZyb20gdGhlIGZvcm1cbiAgICAgICAgY29uc3QgbW9kZSA9IGN1c3RvbUZpbGUuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ21vZGUnKTtcbiAgICAgICAgbGV0IGNvbnRlbnQgPSBjdXN0b21GaWxlLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdjb250ZW50Jyk7XG5cbiAgICAgICAgLy8gSGFuZGxlIGNvZGUgdmlzaWJpbGl0eSBhbmQgY29udGVudCBiYXNlZCBvbiB0aGUgJ21vZGUnXG4gICAgICAgIHN3aXRjaCAobW9kZSkge1xuICAgICAgICAgICAgY2FzZSAnbm9uZSc6XG4gICAgICAgICAgICAgICAgLy8gSWYgJ21vZGUnIGlzICdub25lJywgc2hvdyBvbmx5IHJlc3VsdCBjb2RlIGdlbmVyYXRlZCBhbmQgaGlkZSBlZGl0b3IgYW5kIHJlc3VsdCB2aWV3ZXJcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRlZGl0b3JUYWIuaGlkZSgpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJG9yaWdpbmFsVGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLnZpZXdlck9yaWdpbmFsLm5hdmlnYXRlRmlsZVN0YXJ0KCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kcmVzdWx0VGFiLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2FwcGVuZCc6XG4gICAgICAgICAgICAgICAgLy8gSWYgJ21vZGUnIGlzICdhcHBlbmQnLCBzaG93IGFsbCBmaWVsZHNcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRlZGl0b3JUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJG9yaWdpbmFsVGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRyZXN1bHRUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUudmlld2VyT3JpZ2luYWwubmF2aWdhdGVGaWxlRW5kKCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJSZXN1bHQubmF2aWdhdGVGaWxlRW5kKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdvdmVycmlkZSc6XG4gICAgICAgICAgICAgICAgLy8gSWYgJ21vZGUnIGlzICdvdmVycmlkZScsIHNob3cgY3VzdG9tIGNvbnRlbnQgYW5kIGhpZGUgc2VydmVyIGNvbnRlbnQsIHJlcGxhY2Ugc2VydmVyIGZpbGUgY29udGVudCB3aXRoIGN1c3RvbSBjb250ZW50XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZWRpdG9yVGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRvcmlnaW5hbFRhYi5oaWRlKCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kcmVzdWx0VGFiLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3NjcmlwdCc6XG4gICAgICAgICAgICAgICAgLy8gSWYgJ21vZGUnIGlzICdzY3JpcHQnLCBzaG93IGJvdGggc2VydmVyIGFuZCBjdXN0b20gY29kZSwgYXBwbHkgY3VzdG9tIHNjcmlwdCB0byB0aGUgZmlsZSBjb250ZW50IG9uIHNlcnZlclxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGVkaXRvclRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kb3JpZ2luYWxUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHJlc3VsdFRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgLy8gRWRpdG9yXG4gICAgICAgICAgICAgICAgaWYgKCFjb250ZW50LmluY2x1ZGVzKCcjIS9iaW4vYmFzaCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgPSBgIyEvYmluL2Jhc2ggXFxuXFxuYDtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgY29uZmlnUGF0aD1cIiQxXCIgIyBQYXRoIHRvIHRoZSBvcmlnaW5hbCBjb25maWcgZmlsZVxcblxcbmA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYCMgRXhhbXBsZSAxOiBSZXBsYWNlIGFsbCB2YWx1ZXMgbWF4X2NvbnRhY3RzID0gNSB0byBtYXhfY29udGFjdHMgPSAxIG9uIHBqc2lwLmNvbmZcXG5gO1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGAjIHNlZCAtaSAncy9tYXhfY29udGFjdHMgPSA1L21heF9jb250YWN0cyA9IDEvZycgXCIkY29uZmlnUGF0aFwiXFxuXFxuYFxuXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYCMgRXhhbXBsZSAyOiBDaGFuZ2UgdmFsdWUgbWF4X2NvbnRhY3RzIG9ubHkgZm9yIHBlZXIgd2l0aCBleHRlbnNpb24gMjI2IG9uIHBqc2lwLmNvbmZcXG5gO1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGAjIHNlZCAtaSAnL15cXFxcWzIyNlxcXFxdJC8sL15cXFxcWy8gcy9tYXhfY29udGFjdHMgPSA1L21heF9jb250YWN0cyA9IDIvJyBcIiRjb25maWdQYXRoXCJcXG5cXG5gXG5cbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgIyBFeGFtcGxlIDM6IEFkZCBlbiBleHRyYSBzdHJpbmcgaW50byBbcGxheWJhY2stZXhpdF0gc2VjdGlvbiBhZnRlciB0aGUgXCJzYW1lID0+IG4sSGFuZ3VwKClcIiBzdHJpbmcgb24gZXh0ZW5zaW9ucy5jb25mXFxuYDtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgIyBzZWQgLWkgJy9eXFxcXFtwbGF5YmFjay1leGl0XFxcXF0kLywvXlxcXFxbLyBzL15cXFxcKFxcXFxzKnNhbWUgPT4gbixIYW5ndXAoKVxcXFwpL1xcXFwxXFxcXG5cXFxcdHNhbWUgPT4gbixOb09wKFwiWW91ciBOb09wIGNvbW1lbnQgaGVyZVwiKS8nIFwiJGNvbmZpZ1BhdGhcIlxcblxcbmA7XG5cbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgIyBBdHRlbnRpb24hIFlvdSB3aWxsIHNlZSBjaGFuZ2VzIGFmdGVyIHRoZSBiYWNrZ3JvdW5kIHdvcmtlciBwcm9jZXNzZXMgdGhlIHNjcmlwdCBvciBhZnRlciByZWJvb3RpbmcgdGhlIHN5c3RlbS4gXFxuYDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2V0VmFsdWUoY29udGVudCk7XG5cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIGFueSBvdGhlciAnbW9kZScgdmFsdWVzXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBjdXN0b21GaWxlLnZpZXdlck9yaWdpbmFsLnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXRUaGVtZSgnYWNlL3RoZW1lL21vbm9rYWknKTtcbiAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2V0VmFsdWUoY29udGVudCk7XG4gICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgaGFuZGxlcyB0aGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGNvbnRhaW5pbmcgdGhlIGZpbGUncyBjb250ZW50LlxuICAgICAqIEl0IHdpbGwgdXBkYXRlIHRoZSAndmlld2VyT3JpZ2luYWwnIHdpdGggdGhlIGZpbGUncyBjb250ZW50IGFuZCBhZGp1c3QgdGhlIGNvZGUgZGlzcGxheS5cbiAgICAgKi9cbiAgICBjYkdldE9yaWdpbmFsRmlsZUNvbnRlbnRGcm9tU2VydmVyKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmNvbnRlbnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29uc3QgYWNlVmlld2VyID0gY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbDtcbiAgICAgICAgICAgIGNvbnN0IHNjcm9sbFRvcCA9IGFjZVZpZXdlci5zZXNzaW9uLmdldFNjcm9sbFRvcCgpO1xuICAgICAgICAgICAgYWNlVmlld2VyLnNlc3Npb24uc2V0VmFsdWUocmVzcG9uc2UuZGF0YS5jb250ZW50KTtcbiAgICAgICAgICAgIGFjZVZpZXdlci5zZXNzaW9uLnNldFNjcm9sbFRvcChzY3JvbGxUb3ApO1xuICAgICAgICB9XG4gICAgICAgICQoJy50YWJbZGF0YS10YWI9XCJvcmlnaW5hbFwiXScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgaGFuZGxlcyB0aGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGNvbnRhaW5pbmcgdGhlIGZpbGUncyBjb250ZW50LlxuICAgICAqIEl0IHdpbGwgdXBkYXRlIHRoZSAndmlld2VyUmVzdWx0JyB3aXRoIHRoZSBmaWxlJ3MgY29udGVudCBhbmQgYWRqdXN0IHRoZSBjb2RlIGRpc3BsYXkuXG4gICAgICovXG4gICAgY2JHZXRSZXN1bHRGaWxlQ29udGVudEZyb21TZXJ2ZXIocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEuY29udGVudCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb25zdCBhY2VWaWV3ZXIgPSBjdXN0b21GaWxlLnZpZXdlclJlc3VsdDtcbiAgICAgICAgICAgIGNvbnN0IHNjcm9sbFRvcCA9IGFjZVZpZXdlci5zZXNzaW9uLmdldFNjcm9sbFRvcCgpO1xuICAgICAgICAgICAgYWNlVmlld2VyLnNlc3Npb24uc2V0VmFsdWUocmVzcG9uc2UuZGF0YS5jb250ZW50KTtcbiAgICAgICAgICAgIGFjZVZpZXdlci5zZXNzaW9uLnNldFNjcm9sbFRvcChzY3JvbGxUb3ApO1xuICAgICAgICB9XG4gICAgICAgICQoJy50YWJbZGF0YS10YWI9XCJyZXN1bHRcIl0nKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyBBY2UgZWRpdG9yIGluc3RhbmNlcyBmb3IgJ2VkaXRvcicgYW5kICd2aWV3ZXJzJyB3aW5kb3dzLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVBY2UoKSB7XG4gICAgICAgIC8vIENhbGN1bGF0ZSBhY2UgZWRpdG9yIGhlaWdodCBhbmQgcm93cyBjb3VudFxuICAgICAgICBjb25zdCBhY2VIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSA0NzU7XG4gICAgICAgIGNvbnN0IHJvd3NDb3VudCA9IE1hdGgucm91bmQoYWNlSGVpZ2h0IC8gMTYuMyk7XG5cbiAgICAgICAgLy8gU2V0IG1pbmltdW0gaGVpZ2h0IGZvciB0aGUgY29kZSBzZWN0aW9ucyBvbiB3aW5kb3cgbG9hZFxuICAgICAgICAkKCcuYXBwbGljYXRpb24tY29kZScpLmNzcygnbWluLWhlaWdodCcsIGAke2FjZUhlaWdodH1weGApO1xuXG4gICAgICAgIC8vIEFDRSB3aW5kb3cgZm9yIHRoZSBvcmlnaW5hbCBmaWxlIGNvbnRlbnQuXG4gICAgICAgIGNvbnN0IEluaU1vZGUgPSBhY2UucmVxdWlyZSgnYWNlL21vZGUvanVsaWEnKS5Nb2RlO1xuICAgICAgICBjdXN0b21GaWxlLnZpZXdlck9yaWdpbmFsID0gYWNlLmVkaXQoJ2NvbmZpZy1maWxlLW9yaWdpbmFsJyk7XG4gICAgICAgIGN1c3RvbUZpbGUudmlld2VyT3JpZ2luYWwuc2Vzc2lvbi5zZXRNb2RlKG5ldyBJbmlNb2RlKCkpO1xuICAgICAgICBjdXN0b21GaWxlLnZpZXdlck9yaWdpbmFsLnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuICAgICAgICBjdXN0b21GaWxlLnZpZXdlck9yaWdpbmFsLnNldE9wdGlvbnMoe1xuICAgICAgICAgICAgc2hvd1ByaW50TWFyZ2luOiBmYWxzZSxcbiAgICAgICAgICAgIHJlYWRPbmx5OiB0cnVlLFxuICAgICAgICAgICAgbWluTGluZXM6IHJvd3NDb3VudFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBQ0Ugd2luZG93IGZvciB0aGUgcmVzdWx0ZWQgZmlsZSBjb250ZW50LlxuICAgICAgICBjdXN0b21GaWxlLnZpZXdlclJlc3VsdCA9IGFjZS5lZGl0KCdjb25maWctZmlsZS1yZXN1bHQnKTtcbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJSZXN1bHQuc2Vzc2lvbi5zZXRNb2RlKG5ldyBJbmlNb2RlKCkpO1xuICAgICAgICBjdXN0b21GaWxlLnZpZXdlclJlc3VsdC5zZXRUaGVtZSgnYWNlL3RoZW1lL21vbm9rYWknKTtcbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJSZXN1bHQuc2V0T3B0aW9ucyh7XG4gICAgICAgICAgICBzaG93UHJpbnRNYXJnaW46IGZhbHNlLFxuICAgICAgICAgICAgcmVhZE9ubHk6IHRydWUsXG4gICAgICAgICAgICBtaW5MaW5lczogcm93c0NvdW50XG4gICAgICAgIH0pO1xuXG5cbiAgICAgICAgLy8gQUNFIHdpbmRvdyBmb3IgdGhlIHVzZXIgZWRpdG9yLlxuICAgICAgICBjdXN0b21GaWxlLmVkaXRvciA9IGFjZS5lZGl0KCd1c2VyLWVkaXQtY29uZmlnJyk7XG4gICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLnNlc3Npb24uc2V0TW9kZShuZXcgSW5pTW9kZSgpKTtcbiAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2V0VGhlbWUoJ2FjZS90aGVtZS9tb25va2FpJyk7XG4gICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLnNldE9wdGlvbnMoe1xuICAgICAgICAgICAgc2hvd1ByaW50TWFyZ2luOiBmYWxzZSxcbiAgICAgICAgICAgIG1pbkxpbmVzOiByb3dzQ291bnQsXG4gICAgICAgIH0pO1xuICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXNzaW9uLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICAvLyBUcmlnZ2VyIGNoYW5nZSBldmVudCB0byBhY2tub3dsZWRnZSB0aGUgbW9kaWZpY2F0aW9uXG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vICBBZGQgaGFuZGxlcnMgZm9yIGZ1bGxzY3JlZW4gbW9kZSBidXR0b25zXG4gICAgICAgICQoJy5mdWxsc2NyZWVuLXRvZ2dsZS1idG4nKS5vbignY2xpY2snLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBjb25zdCBjb250YWluZXIgPSAkKHRoaXMpLnNpYmxpbmdzKCcuYXBwbGljYXRpb24tY29kZScpWzBdO1xuICAgICAgICAgICAgY3VzdG9tRmlsZS50b2dnbGVGdWxsU2NyZWVuKGNvbnRhaW5lcik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEFkZCBoYW5kbGVyIHRvIHJlY2FsY3VsYXRlIHNpemVzIHdoZW4gZXhpdGluZyBmdWxsc2NyZWVuIG1vZGVcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignZnVsbHNjcmVlbmNoYW5nZScsIGN1c3RvbUZpbGUuYWRqdXN0RWRpdG9ySGVpZ2h0KTtcblxuICAgIH0sXG4gICAgLyoqXG4gICAgICogRW5hYmxlL2Rpc2FibGUgZnVsbHNjcmVlbiBtb2RlIGZvciBhIHNwZWNpZmljIGJsb2NrLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gY29udGFpbmVyIC0gVGhlIGNvbnRhaW5lciB0byBleHBhbmQgdG8gZnVsbHNjcmVlbi5cbiAgICAgKi9cbiAgICB0b2dnbGVGdWxsU2NyZWVuKGNvbnRhaW5lcikge1xuICAgICAgICBpZiAoIWRvY3VtZW50LmZ1bGxzY3JlZW5FbGVtZW50KSB7XG4gICAgICAgICAgICBjb250YWluZXIucmVxdWVzdEZ1bGxzY3JlZW4oKS5jYXRjaChlcnIgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGF0dGVtcHRpbmcgdG8gZW5hYmxlIGZ1bGwtc2NyZWVuIG1vZGU6ICR7ZXJyLm1lc3NhZ2V9YCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRvY3VtZW50LmV4aXRGdWxsc2NyZWVuKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVjYWxjdWxhdGUgZWRpdG9yIGhlaWdodHMgd2hlbiB0aGUgc2NyZWVuIG1vZGUgY2hhbmdlcy5cbiAgICAgKi9cbiAgICBhZGp1c3RFZGl0b3JIZWlnaHQoKSB7XG4gICAgICAgIGNvbnN0IGVkaXRvcnMgPSBbY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbCwgY3VzdG9tRmlsZS52aWV3ZXJSZXN1bHQsIGN1c3RvbUZpbGUuZWRpdG9yXTtcbiAgICAgICAgZWRpdG9ycy5mb3JFYWNoKGVkaXRvciA9PiB7XG4gICAgICAgICAgICBpZiAoZWRpdG9yKSB7XG4gICAgICAgICAgICAgICAgZWRpdG9yLnJlc2l6ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gY3VzdG9tRmlsZS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIHN3aXRjaCAoY3VzdG9tRmlsZS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnbW9kZScpKSB7XG4gICAgICAgICAgICBjYXNlICdhcHBlbmQnOlxuICAgICAgICAgICAgY2FzZSAnb3ZlcnJpZGUnOlxuICAgICAgICAgICAgY2FzZSAnc2NyaXB0JzpcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YS5jb250ZW50ID0gY3VzdG9tRmlsZS5lZGl0b3IuZ2V0VmFsdWUoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGEuY29udGVudCA9ICcnO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuXG4gICAgfSxcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBjdXN0b21GaWxlLiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9IGAke2dsb2JhbFJvb3RVcmx9Y3VzdG9tLWZpbGVzL3NhdmVgOyAvLyBGb3JtIHN1Ym1pc3Npb24gVVJMXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGN1c3RvbUZpbGUudmFsaWRhdGVSdWxlczsgLy8gRm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGN1c3RvbUZpbGUuY2JCZWZvcmVTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYmVmb3JlIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGN1c3RvbUZpbGUuY2JBZnRlclNlbmRGb3JtOyAvLyBDYWxsYmFjayBhZnRlciBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcbn07XG5cbi8vIEluaXRpYWxpemUgdGhlIGN1c3RvbSBmaWxlcyBtb2RpZnkgZm9ybSB3aGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeS5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBjdXN0b21GaWxlLmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=