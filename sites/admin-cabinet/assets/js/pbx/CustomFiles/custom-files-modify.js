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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DdXN0b21GaWxlcy9jdXN0b20tZmlsZXMtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbImN1c3RvbUZpbGUiLCIkZm9ybU9iaiIsIiQiLCIkdGFiTWVudSIsIiRtb2RlRHJvcERvd24iLCIkb3JpZ2luYWxUYWIiLCIkZWRpdG9yVGFiIiwiJHJlc3VsdFRhYiIsIiRtYWluQ29udGFpbmVyIiwiZWRpdG9yIiwidmlld2VyT3JpZ2luYWwiLCJ2aWV3ZXJSZXN1bHQiLCJ2YWxpZGF0ZVJ1bGVzIiwibmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJjZl9WYWxpZGF0ZU5hbWVJc0VtcHR5IiwiaW5pdGlhbGl6ZSIsInRhYiIsIm9uVmlzaWJsZSIsIm9uQ2hhbmdlVGFiIiwicmVtb3ZlQ2xhc3MiLCJpbml0aWFsaXplQWNlIiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsImNiT25DaGFuZ2VNb2RlIiwibW9kZSIsImZvcm0iLCJpbml0aWFsaXplRm9ybSIsInZhbHVlIiwidGV4dCIsImhpZGVTaG93Q29kZSIsImN1cnJlbnRUYWIiLCJmaWxlUGF0aCIsImRhdGEiLCJmaWxlbmFtZSIsIm5lZWRPcmlnaW5hbCIsIm5lZWRMb2dmaWxlIiwiYWRkQ2xhc3MiLCJQYnhBcGkiLCJHZXRGaWxlQ29udGVudCIsImNiR2V0UmVzdWx0RmlsZUNvbnRlbnRGcm9tU2VydmVyIiwiY2JHZXRPcmlnaW5hbEZpbGVDb250ZW50RnJvbVNlcnZlciIsImNvbnRlbnQiLCJoaWRlIiwic2hvdyIsIm5hdmlnYXRlRmlsZVN0YXJ0IiwibmF2aWdhdGVGaWxlRW5kIiwiaW5jbHVkZXMiLCJzZXRWYWx1ZSIsInNldFRoZW1lIiwiY2xlYXJTZWxlY3Rpb24iLCJyZXNwb25zZSIsInVuZGVmaW5lZCIsImFjZVZpZXdlciIsInNjcm9sbFRvcCIsInNlc3Npb24iLCJnZXRTY3JvbGxUb3AiLCJzZXRTY3JvbGxUb3AiLCJhY2VIZWlnaHQiLCJ3aW5kb3ciLCJpbm5lckhlaWdodCIsInJvd3NDb3VudCIsIk1hdGgiLCJyb3VuZCIsImNzcyIsIkluaU1vZGUiLCJhY2UiLCJyZXF1aXJlIiwiTW9kZSIsImVkaXQiLCJzZXRNb2RlIiwic2V0T3B0aW9ucyIsInNob3dQcmludE1hcmdpbiIsInJlYWRPbmx5IiwibWluTGluZXMiLCJvbiIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsInJlc3VsdCIsImdldFZhbHVlIiwiY2JBZnRlclNlbmRGb3JtIiwidXJsIiwiZ2xvYmFsUm9vdFVybCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsVUFBVSxHQUFHO0FBRWY7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMsbUJBQUQsQ0FOSTs7QUFRZjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVELENBQUMsQ0FBQywwQkFBRCxDQVpJOztBQWNmO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLGFBQWEsRUFBRUYsQ0FBQyxDQUFDLGdDQUFELENBbEJEOztBQW9CZjtBQUNKO0FBQ0E7QUFDQTtBQUNJRyxFQUFBQSxZQUFZLEVBQUVILENBQUMsQ0FBQyx3QkFBRCxDQXhCQTs7QUEwQmY7QUFDSjtBQUNBO0FBQ0E7QUFDSUksRUFBQUEsVUFBVSxFQUFFSixDQUFDLENBQUMsc0JBQUQsQ0E5QkU7O0FBZ0NmO0FBQ0o7QUFDQTtBQUNBO0FBQ0lLLEVBQUFBLFVBQVUsRUFBRUwsQ0FBQyxDQUFDLHNCQUFELENBcENFOztBQXNDZjtBQUNKO0FBQ0E7QUFDQTtBQUNJTSxFQUFBQSxjQUFjLEVBQUVOLENBQUMsQ0FB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QUFSO0FBQ0ksV0FBSyxRQUFMO0FBQ0EsV0FBSyxVQUFMO0FBQ0EsV0FBSyxRQUFMO0FBQ0lzRCxRQUFBQSxNQUFNLENBQUMvQyxJQUFQLENBQVlTLE9BQVosR0FBc0I5QyxVQUFVLENBQUNTLE1BQVgsQ0FBa0I0RSxRQUFsQixFQUF0QjtBQUNBOztBQUNKO0FBQ0lELFFBQUFBLE1BQU0sQ0FBQy9DLElBQVAsQ0FBWVMsT0FBWixHQUFzQixFQUF0QjtBQVBSOztBQVNBLFdBQU9zQyxNQUFQO0FBQ0gsR0FuVGM7O0FBcVRmO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLGVBelRlLDJCQXlUQy9CLFFBelRELEVBeVRXLENBRXpCLENBM1RjOztBQTRUZjtBQUNKO0FBQ0E7QUFDSXhCLEVBQUFBLGNBL1RlLDRCQStURTtBQUNiaUQsSUFBQUEsSUFBSSxDQUFDL0UsUUFBTCxHQUFnQkQsVUFBVSxDQUFDQyxRQUEzQjtBQUNBK0UsSUFBQUEsSUFBSSxDQUFDTyxHQUFMLGFBQWNDLGFBQWQsdUJBRmEsQ0FFbUM7O0FBQ2hEUixJQUFBQSxJQUFJLENBQUNwRSxhQUFMLEdBQXFCWixVQUFVLENBQUNZLGFBQWhDLENBSGEsQ0FHa0M7O0FBQy9Db0UsSUFBQUEsSUFBSSxDQUFDRSxnQkFBTCxHQUF3QmxGLFVBQVUsQ0FBQ2tGLGdCQUFuQyxDQUphLENBSXdDOztBQUNyREYsSUFBQUEsSUFBSSxDQUFDTSxlQUFMLEdBQXVCdEYsVUFBVSxDQUFDc0YsZUFBbEMsQ0FMYSxDQUtzQzs7QUFDbkROLElBQUFBLElBQUksQ0FBQzVELFVBQUw7QUFDSDtBQXRVYyxDQUFuQixDLENBeVVBOztBQUNBbEIsQ0FBQyxDQUFDdUYsUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjFGLEVBQUFBLFVBQVUsQ0FBQ29CLFVBQVg7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsZ2xvYmFsVHJhbnNsYXRlLCBhY2UsIEZvcm0sIFBieEFwaSAqL1xuXG5cbi8qKlxuICogTW9kdWxlIGN1c3RvbUZpbGVcbiAqIFRoaXMgbW9kdWxlIG1hbmFnZXMgZmlsZSBpbnRlcmFjdGlvbnMgaW4gYSBVSSwgc3VjaCBhcyBsb2FkaW5nIGZpbGUgY29udGVudCBmcm9tIGEgc2VydmVyIGFuZCBoYW5kbGluZyB1c2VyIGlucHV0LlxuICogQG1vZHVsZSBjdXN0b21GaWxlXG4gKi9cbmNvbnN0IGN1c3RvbUZpbGUgPSB7XG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjY3VzdG9tLWZpbGUtZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHRhYiBtZW51LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHRhYk1lbnU6ICQoJyNjdXN0b20tZmlsZXMtbWVudSAuaXRlbScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIG1vZGUgc2VsZWN0LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG1vZGVEcm9wRG93bjogJCgnI2N1c3RvbS1maWxlLWZvcm0gLm1vZGUtc2VsZWN0JyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdGFiIHdpdGggb3JpZ2luYWwgZmlsZSBjb250ZW50LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJG9yaWdpbmFsVGFiOiAkKCdhW2RhdGEtdGFiPVwib3JpZ2luYWxcIl0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB0YWIgd2l0aCB1c2VyIGNvbnRlbnQvc2NyaXB0IGVkaXRvci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRlZGl0b3JUYWI6ICQoJ2FbZGF0YS10YWI9XCJlZGl0b3JcIl0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB0YWIgd2l0aCByZXN1bHRlZCBmaWxlIGNvbnRlbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkcmVzdWx0VGFiOiAkKCdhW2RhdGEtdGFiPVwicmVzdWx0XCJdJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgZWxlbWVudCBmb3IgdGhlIG1haW4gY29udGVudCBjb250YWluZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbWFpbkNvbnRhaW5lcjogJCgnI21haW4tY29udGVudC1jb250YWluZXInKSxcblxuXG4gICAgLyoqXG4gICAgICogQWNlIGVkaXRvciBpbnN0YW5jZXNcbiAgICAgKiBgZWRpdG9yYCBpcyBmb3IgaW5wdXQgYW5kIGB2aWV3ZXJzYCBpcyBmb3IgZGlzcGxheSBjb2RlIGZyb20gc2VydmVyXG4gICAgICovXG4gICAgZWRpdG9yOiAnJyxcbiAgICB2aWV3ZXJPcmlnaW5hbDogJycsXG4gICAgdmlld2VyUmVzdWx0OiAnJyxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBuYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZmlsZXBhdGgnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmNmX1ZhbGlkYXRlTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBjdXN0b21GaWxlIG1vZHVsZS5cbiAgICAgKiBTZXRzIHVwIHRoZSBkcm9wZG93biwgaW5pdGlhbGl6ZXMgQWNlIGVkaXRvciwgZm9ybSwgYW5kIHJldHJpZXZlcyBmaWxlIGNvbnRlbnQgZnJvbSB0aGUgc2VydmVyLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG5cbiAgICAgICAgLy8gRW5hYmxlIHRhYiBuYXZpZ2F0aW9uIHdpdGggaGlzdG9yeSBzdXBwb3J0XG4gICAgICAgIGN1c3RvbUZpbGUuJHRhYk1lbnUudGFiKHtcbiAgICAgICAgICAgIG9uVmlzaWJsZTogY3VzdG9tRmlsZS5vbkNoYW5nZVRhYlxuICAgICAgICB9KTtcblxuICAgICAgICBjdXN0b21GaWxlLiRtYWluQ29udGFpbmVyLnJlbW92ZUNsYXNzKCdjb250YWluZXInKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIEFjZSBlZGl0b3JcbiAgICAgICAgY3VzdG9tRmlsZS5pbml0aWFsaXplQWNlKCk7XG5cbiAgICAgICAgY3VzdG9tRmlsZS4kbW9kZURyb3BEb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBjdXN0b21GaWxlLmNiT25DaGFuZ2VNb2RlXG4gICAgICAgIH0pO1xuICAgICAgICBjb25zdCBtb2RlID0gY3VzdG9tRmlsZS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnbW9kZScpO1xuICAgICAgICBjdXN0b21GaWxlLmNiT25DaGFuZ2VNb2RlKG1vZGUpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZm9ybVxuICAgICAgICBjdXN0b21GaWxlLmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZm9yIHdoZW4gdGhlIGNvZGUgbW9kZSBjaGFuZ2VzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHZhbHVlIC0gVGhlIHNlbGVjdGVkIHZhbHVlIGZyb20gdGhlIGRyb3Bkb3duLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0IC0gVGhlIHNlbGVjdGVkIHRleHQgZnJvbSB0aGUgZHJvcGRvd24uXG4gICAgICovXG4gICAgY2JPbkNoYW5nZU1vZGUodmFsdWUsIHRleHQpe1xuICAgICAgICAvLyBIYW5kbGUgY29kZSB2aXNpYmlsaXR5IGFuZCBjb250ZW50IGJhc2VkIG9uIHRoZSAnbW9kZSdcbiAgICAgICAgc3dpdGNoICh2YWx1ZSkge1xuICAgICAgICAgICAgY2FzZSAnbm9uZSc6XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kdGFiTWVudS50YWIoJ2NoYW5nZSB0YWInLCdvcmlnaW5hbCcpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnb3ZlcnJpZGUnOlxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHRhYk1lbnUudGFiKCdjaGFuZ2UgdGFiJywnZWRpdG9yJyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdhcHBlbmQnOlxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHRhYk1lbnUudGFiKCdjaGFuZ2UgdGFiJywnZWRpdG9yJyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdzY3JpcHQnOlxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHRhYk1lbnUudGFiKCdjaGFuZ2UgdGFiJywnZWRpdG9yJyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHRhYk1lbnUudGFiKCdjaGFuZ2UgdGFiJywnb3JpZ2luYWwnKTtcbiAgICAgICAgfVxuICAgICAgICBjdXN0b21GaWxlLmhpZGVTaG93Q29kZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFdmVudCBoYW5kbGVyIGZvciB0YWIgY2hhbmdlcy5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBjdXJyZW50VGFiIC0gVGhlIGN1cnJlbnQgdGFiIHRoYXQgaXMgdmlzaWJsZS5cbiAgICAgKi9cbiAgICBvbkNoYW5nZVRhYihjdXJyZW50VGFiKXtcbiAgICAgICAgY29uc3QgZmlsZVBhdGggPSBjdXN0b21GaWxlLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmaWxlcGF0aCcpO1xuICAgICAgICBjb25zdCBkYXRhID0ge2ZpbGVuYW1lOiBmaWxlUGF0aCwgbmVlZE9yaWdpbmFsOiB0cnVlLCBuZWVkTG9nZmlsZTogZmFsc2V9O1xuICAgICAgICBzd2l0Y2ggKGN1cnJlbnRUYWIpIHtcbiAgICAgICAgICAgIGNhc2UgJ3Jlc3VsdCc6XG4gICAgICAgICAgICAgICAgZGF0YS5uZWVkT3JpZ2luYWw9ZmFsc2U7XG4gICAgICAgICAgICAgICAgJCgnLnRhYltkYXRhLXRhYj1cInJlc3VsdFwiXScpLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgUGJ4QXBpLkdldEZpbGVDb250ZW50KGRhdGEsIGN1c3RvbUZpbGUuY2JHZXRSZXN1bHRGaWxlQ29udGVudEZyb21TZXJ2ZXIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnb3JpZ2luYWwnOlxuICAgICAgICAgICAgICAgIGRhdGEubmVlZE9yaWdpbmFsPXRydWU7XG4gICAgICAgICAgICAgICAgJCgnLnRhYltkYXRhLXRhYj1cIm9yaWdpbmFsXCJdJykuYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBQYnhBcGkuR2V0RmlsZUNvbnRlbnQoZGF0YSwgY3VzdG9tRmlsZS5jYkdldE9yaWdpbmFsRmlsZUNvbnRlbnRGcm9tU2VydmVyKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2VkaXRvcic6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlcyB0aGUgdmlzaWJpbGl0eSBhbmQgY29udGVudCBvZiBjb2RlIGJhc2VkIG9uIHRoZSAnbW9kZScgZm9ybSB2YWx1ZS5cbiAgICAgKiBBZGp1c3RzIHRoZSBBY2UgZWRpdG9yIHNldHRpbmdzIGFjY29yZGluZ2x5LlxuICAgICAqL1xuICAgIGhpZGVTaG93Q29kZSgpIHtcbiAgICAgICAgLy8gUmV0cmlldmUgJ21vZGUnIHZhbHVlIGZyb20gdGhlIGZvcm1cbiAgICAgICAgY29uc3QgbW9kZSA9IGN1c3RvbUZpbGUuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ21vZGUnKTtcbiAgICAgICAgbGV0IGNvbnRlbnQgPSBjdXN0b21GaWxlLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdjb250ZW50Jyk7XG5cbiAgICAgICAgLy8gSGFuZGxlIGNvZGUgdmlzaWJpbGl0eSBhbmQgY29udGVudCBiYXNlZCBvbiB0aGUgJ21vZGUnXG4gICAgICAgIHN3aXRjaCAobW9kZSkge1xuICAgICAgICAgICAgY2FzZSAnbm9uZSc6XG4gICAgICAgICAgICAgICAgLy8gSWYgJ21vZGUnIGlzICdub25lJywgc2hvdyBvbmx5IHJlc3VsdCBjb2RlIGdlbmVyYXRlZCBhbmQgaGlkZSBlZGl0b3IgYW5kIHJlc3VsdCB2aWV3ZXJcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRlZGl0b3JUYWIuaGlkZSgpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJG9yaWdpbmFsVGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLnZpZXdlck9yaWdpbmFsLm5hdmlnYXRlRmlsZVN0YXJ0KCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kcmVzdWx0VGFiLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2FwcGVuZCc6XG4gICAgICAgICAgICAgICAgLy8gSWYgJ21vZGUnIGlzICdhcHBlbmQnLCBzaG93IGFsbCBmaWVsZHNcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRlZGl0b3JUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJG9yaWdpbmFsVGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRyZXN1bHRUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUudmlld2VyT3JpZ2luYWwubmF2aWdhdGVGaWxlRW5kKCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJSZXN1bHQubmF2aWdhdGVGaWxlRW5kKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdvdmVycmlkZSc6XG4gICAgICAgICAgICAgICAgLy8gSWYgJ21vZGUnIGlzICdvdmVycmlkZScsIHNob3cgY3VzdG9tIGNvbnRlbnQgYW5kIGhpZGUgc2VydmVyIGNvbnRlbnQsIHJlcGxhY2Ugc2VydmVyIGZpbGUgY29udGVudCB3aXRoIGN1c3RvbSBjb250ZW50XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZWRpdG9yVGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRvcmlnaW5hbFRhYi5oaWRlKCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kcmVzdWx0VGFiLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3NjcmlwdCc6XG4gICAgICAgICAgICAgICAgLy8gSWYgJ21vZGUnIGlzICdzY3JpcHQnLCBzaG93IGJvdGggc2VydmVyIGFuZCBjdXN0b20gY29kZSwgYXBwbHkgY3VzdG9tIHNjcmlwdCB0byB0aGUgZmlsZSBjb250ZW50IG9uIHNlcnZlclxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGVkaXRvclRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kb3JpZ2luYWxUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHJlc3VsdFRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgLy8gRWRpdG9yXG4gICAgICAgICAgICAgICAgaWYgKCFjb250ZW50LmluY2x1ZGVzKCcjIS9iaW4vYmFzaCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgPSBgIyEvYmluL2Jhc2ggXFxuXFxuYDtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgY29uZmlnUGF0aD1cIiQxXCIgIyBQYXRoIHRvIHRoZSBvcmlnaW5hbCBjb25maWcgZmlsZVxcblxcbmA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYCMgRXhhbXBsZSAxOiBSZXBsYWNlIGFsbCB2YWx1ZXMgbWF4X2NvbnRhY3RzID0gNSB0byBtYXhfY29udGFjdHMgPSAxIG9uIHBqc2lwLmNvbmZcXG5gO1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGAjIHNlZCAtaSAncy9tYXhfY29udGFjdHMgPSA1L21heF9jb250YWN0cyA9IDEvZycgXCIkY29uZmlnUGF0aFwiXFxuXFxuYFxuXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYCMgRXhhbXBsZSAyOiBDaGFuZ2UgdmFsdWUgbWF4X2NvbnRhY3RzIG9ubHkgZm9yIHBlZXIgd2l0aCBleHRlbnNpb24gMjI2IG9uIHBqc2lwLmNvbmZcXG5gO1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGAjIHNlZCAtaSAnL15cXFxcWzIyNlxcXFxdJC8sL15cXFxcWy8gcy9tYXhfY29udGFjdHMgPSA1L21heF9jb250YWN0cyA9IDIvJyBcIiRjb25maWdQYXRoXCJcXG5cXG5gXG5cbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgIyBFeGFtcGxlIDM6IEFkZCBlbiBleHRyYSBzdHJpbmcgaW50byBbcGxheWJhY2stZXhpdF0gc2VjdGlvbiBhZnRlciB0aGUgXCJzYW1lID0+IG4sSGFuZ3VwKClcIiBzdHJpbmcgb24gZXh0ZW5zaW9ucy5jb25mXFxuYDtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgIyBzZWQgLWkgJy9eXFxcXFtwbGF5YmFjay1leGl0XFxcXF0kLywvXlxcXFxbLyBzL15cXFxcKFxcXFxzKnNhbWUgPT4gbixIYW5ndXAoKVxcXFwpL1xcXFwxXFxcXG5cXFxcdHNhbWUgPT4gbixOb09wKFwiWW91ciBOb09wIGNvbW1lbnQgaGVyZVwiKS8nIFwiJGNvbmZpZ1BhdGhcIlxcblxcbmA7XG5cbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgIyBBdHRlbnRpb24hIFlvdSB3aWxsIHNlZSBjaGFuZ2VzIGFmdGVyIHRoZSBiYWNrZ3JvdW5kIHdvcmtlciBwcm9jZXNzZXMgdGhlIHNjcmlwdCBvciBhZnRlciByZWJvb3RpbmcgdGhlIHN5c3RlbS4gXFxuYDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2V0VmFsdWUoY29udGVudCk7XG5cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIGFueSBvdGhlciAnbW9kZScgdmFsdWVzXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBjdXN0b21GaWxlLnZpZXdlck9yaWdpbmFsLnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXRUaGVtZSgnYWNlL3RoZW1lL21vbm9rYWknKTtcbiAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2V0VmFsdWUoY29udGVudCk7XG4gICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgaGFuZGxlcyB0aGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGNvbnRhaW5pbmcgdGhlIGZpbGUncyBjb250ZW50LlxuICAgICAqIEl0IHdpbGwgdXBkYXRlIHRoZSAndmlld2VyT3JpZ2luYWwnIHdpdGggdGhlIGZpbGUncyBjb250ZW50IGFuZCBhZGp1c3QgdGhlIGNvZGUgZGlzcGxheS5cbiAgICAgKi9cbiAgICBjYkdldE9yaWdpbmFsRmlsZUNvbnRlbnRGcm9tU2VydmVyKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5kYXRhLmNvbnRlbnQgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgY29uc3QgYWNlVmlld2VyID0gY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbDtcbiAgICAgICAgICAgIGNvbnN0IHNjcm9sbFRvcCA9IGFjZVZpZXdlci5zZXNzaW9uLmdldFNjcm9sbFRvcCgpO1xuICAgICAgICAgICAgYWNlVmlld2VyLnNlc3Npb24uc2V0VmFsdWUocmVzcG9uc2UuZGF0YS5jb250ZW50KTtcbiAgICAgICAgICAgIGFjZVZpZXdlci5zZXNzaW9uLnNldFNjcm9sbFRvcChzY3JvbGxUb3ApO1xuICAgICAgICB9XG4gICAgICAgICQoJy50YWJbZGF0YS10YWI9XCJvcmlnaW5hbFwiXScpLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRoYXQgaGFuZGxlcyB0aGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGNvbnRhaW5pbmcgdGhlIGZpbGUncyBjb250ZW50LlxuICAgICAqIEl0IHdpbGwgdXBkYXRlIHRoZSAndmlld2VyUmVzdWx0JyB3aXRoIHRoZSBmaWxlJ3MgY29udGVudCBhbmQgYWRqdXN0IHRoZSBjb2RlIGRpc3BsYXkuXG4gICAgICovXG4gICAgY2JHZXRSZXN1bHRGaWxlQ29udGVudEZyb21TZXJ2ZXIocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEuY29udGVudCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb25zdCBhY2VWaWV3ZXIgPSBjdXN0b21GaWxlLnZpZXdlclJlc3VsdDtcbiAgICAgICAgICAgIGNvbnN0IHNjcm9sbFRvcCA9IGFjZVZpZXdlci5zZXNzaW9uLmdldFNjcm9sbFRvcCgpO1xuICAgICAgICAgICAgYWNlVmlld2VyLnNlc3Npb24uc2V0VmFsdWUocmVzcG9uc2UuZGF0YS5jb250ZW50KTtcbiAgICAgICAgICAgIGFjZVZpZXdlci5zZXNzaW9uLnNldFNjcm9sbFRvcChzY3JvbGxUb3ApO1xuICAgICAgICB9XG4gICAgICAgICQoJy50YWJbZGF0YS10YWI9XCJyZXN1bHRcIl0nKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyBBY2UgZWRpdG9yIGluc3RhbmNlcyBmb3IgJ2VkaXRvcicgYW5kICd2aWV3ZXJzJyB3aW5kb3dzLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVBY2UoKSB7XG4gICAgICAgIC8vIENhbGN1bGF0ZSBhY2UgZWRpdG9yIGhlaWdodCBhbmQgcm93cyBjb3VudFxuICAgICAgICBjb25zdCBhY2VIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSA0NzU7XG4gICAgICAgIGNvbnN0IHJvd3NDb3VudCA9IE1hdGgucm91bmQoYWNlSGVpZ2h0IC8gMTYuMyk7XG5cbiAgICAgICAgLy8gU2V0IG1pbmltdW0gaGVpZ2h0IGZvciB0aGUgY29kZSBzZWN0aW9ucyBvbiB3aW5kb3cgbG9hZFxuICAgICAgICAkKCcuYXBwbGljYXRpb24tY29kZScpLmNzcygnbWluLWhlaWdodCcsIGAke2FjZUhlaWdodH1weGApO1xuXG4gICAgICAgIC8vIEFDRSB3aW5kb3cgZm9yIHRoZSBvcmlnaW5hbCBmaWxlIGNvbnRlbnQuXG4gICAgICAgIGNvbnN0IEluaU1vZGUgPSBhY2UucmVxdWlyZSgnYWNlL21vZGUvanVsaWEnKS5Nb2RlO1xuICAgICAgICBjdXN0b21GaWxlLnZpZXdlck9yaWdpbmFsID0gYWNlLmVkaXQoJ2NvbmZpZy1maWxlLW9yaWdpbmFsJyk7XG4gICAgICAgIGN1c3RvbUZpbGUudmlld2VyT3JpZ2luYWwuc2Vzc2lvbi5zZXRNb2RlKG5ldyBJbmlNb2RlKCkpO1xuICAgICAgICBjdXN0b21GaWxlLnZpZXdlck9yaWdpbmFsLnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuICAgICAgICBjdXN0b21GaWxlLnZpZXdlck9yaWdpbmFsLnNldE9wdGlvbnMoe1xuICAgICAgICAgICAgc2hvd1ByaW50TWFyZ2luOiBmYWxzZSxcbiAgICAgICAgICAgIHJlYWRPbmx5OiB0cnVlLFxuICAgICAgICAgICAgbWluTGluZXM6IHJvd3NDb3VudFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBBQ0Ugd2luZG93IGZvciB0aGUgcmVzdWx0ZWQgZmlsZSBjb250ZW50LlxuICAgICAgICBjdXN0b21GaWxlLnZpZXdlclJlc3VsdCA9IGFjZS5lZGl0KCdjb25maWctZmlsZS1yZXN1bHQnKTtcbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJSZXN1bHQuc2Vzc2lvbi5zZXRNb2RlKG5ldyBJbmlNb2RlKCkpO1xuICAgICAgICBjdXN0b21GaWxlLnZpZXdlclJlc3VsdC5zZXRUaGVtZSgnYWNlL3RoZW1lL21vbm9rYWknKTtcbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJSZXN1bHQuc2V0T3B0aW9ucyh7XG4gICAgICAgICAgICBzaG93UHJpbnRNYXJnaW46IGZhbHNlLFxuICAgICAgICAgICAgcmVhZE9ubHk6IHRydWUsXG4gICAgICAgICAgICBtaW5MaW5lczogcm93c0NvdW50XG4gICAgICAgIH0pO1xuXG5cbiAgICAgICAgLy8gQUNFIHdpbmRvdyBmb3IgdGhlIHVzZXIgZWRpdG9yLlxuICAgICAgICBjdXN0b21GaWxlLmVkaXRvciA9IGFjZS5lZGl0KCd1c2VyLWVkaXQtY29uZmlnJyk7XG4gICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLnNlc3Npb24uc2V0TW9kZShuZXcgSW5pTW9kZSgpKTtcbiAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2V0VGhlbWUoJ2FjZS90aGVtZS9tb25va2FpJyk7XG4gICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLnNldE9wdGlvbnMoe1xuICAgICAgICAgICAgc2hvd1ByaW50TWFyZ2luOiBmYWxzZSxcbiAgICAgICAgICAgIG1pbkxpbmVzOiByb3dzQ291bnQsXG4gICAgICAgIH0pO1xuICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXNzaW9uLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICAvLyBUcmlnZ2VyIGNoYW5nZSBldmVudCB0byBhY2tub3dsZWRnZSB0aGUgbW9kaWZpY2F0aW9uXG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IGN1c3RvbUZpbGUuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBzd2l0Y2ggKGN1c3RvbUZpbGUuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ21vZGUnKSkge1xuICAgICAgICAgICAgY2FzZSAnYXBwZW5kJzpcbiAgICAgICAgICAgIGNhc2UgJ292ZXJyaWRlJzpcbiAgICAgICAgICAgIGNhc2UgJ3NjcmlwdCc6XG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGEuY29udGVudCA9IGN1c3RvbUZpbGUuZWRpdG9yLmdldFZhbHVlKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhLmNvbnRlbnQgPSAnJztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcblxuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gY3VzdG9tRmlsZS4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfWN1c3RvbS1maWxlcy9zYXZlYDsgLy8gRm9ybSBzdWJtaXNzaW9uIFVSTFxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBjdXN0b21GaWxlLnZhbGlkYXRlUnVsZXM7IC8vIEZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBjdXN0b21GaWxlLmNiQmVmb3JlU2VuZEZvcm07IC8vIENhbGxiYWNrIGJlZm9yZSBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBjdXN0b21GaWxlLmNiQWZ0ZXJTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG59O1xuXG4vLyBJbml0aWFsaXplIHRoZSBjdXN0b20gZmlsZXMgbW9kaWZ5IGZvcm0gd2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHkuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgY3VzdG9tRmlsZS5pbml0aWFsaXplKCk7XG59KTtcblxuIl19