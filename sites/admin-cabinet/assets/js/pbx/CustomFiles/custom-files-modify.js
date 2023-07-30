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
   * jQuery object for the original file content.
   * @type {jQuery}
   */
  $originalTab: $('a[data-tab="original"]'),

  /**
   * jQuery object for the user content/script editor.
   * @type {jQuery}
   */
  $editorTab: $('a[data-tab="editor"]'),

  /**
   * jQuery object for the resulted file content.
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
        PbxApi.GetFileContent(data, customFile.cbGetResultFileContentFromServer);
        break;

      case 'original':
        data.needOriginal = true;
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
        customFile.editor.clearSelection();
        customFile.editor.alignCursors();
        break;

      case 'override':
        // If 'mode' is 'override', show custom content and hide server content, replace server file content with custom content
        customFile.$editorTab.show();
        customFile.$originalTab.hide();
        customFile.$resultTab.hide();
        customFile.editor.navigateFileStart();
        customFile.editor.clearSelection();
        customFile.editor.alignCursors();
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
        customFile.editor.clearSelection();
        customFile.editor.alignCursors();
        break;

      default:
        // Handle any other 'mode' values
        break;
    }
  },

  /**
   * Callback function that handles the response from the server containing the file's content.
   * It will update the 'viewerOriginal' with the file's content and adjust the code display.
   */
  cbGetOriginalFileContentFromServer: function cbGetOriginalFileContentFromServer(response) {
    if (response.data.content !== undefined) {
      var aceViewer = customFile.viewerOriginal;
      var scrollTop = aceViewer.getSession().getScrollTop();
      aceViewer.getSession().setValue(response.data.content);
      aceViewer.getSession().setScrollTop(scrollTop);
    }
  },

  /**
   * Callback function that handles the response from the server containing the file's content.
   * It will update the 'viewerResult' with the file's content and adjust the code display.
   */
  cbGetResultFileContentFromServer: function cbGetResultFileContentFromServer(response) {
    if (response.data.content !== undefined) {
      var aceViewer = customFile.viewerResult;
      var scrollTop = aceViewer.getSession().getScrollTop();
      aceViewer.getSession().setValue(response.data.content);
      aceViewer.getSession().setScrollTop(scrollTop);
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
    });
    customFile.viewerOriginal.resize(); // ACE window for the resulted file content.

    customFile.viewerResult = ace.edit('config-file-result');
    customFile.viewerResult.session.setMode(new IniMode());
    customFile.viewerResult.setTheme('ace/theme/monokai');
    customFile.viewerResult.setOptions({
      showPrintMargin: false,
      readOnly: true,
      minLines: rowsCount
    });
    customFile.viewerResult.resize(); // ACE window for the user editor.

    customFile.editor = ace.edit('user-edit-config');
    customFile.editor.session.setMode(new IniMode());
    customFile.editor.setTheme('ace/theme/monokai');
    customFile.editor.setOptions({
      showPrintMargin: false,
      minLines: rowsCount
    });
    customFile.editor.setValue(customFile.$formObj.form('get value', 'content'));
    customFile.editor.getSession().on('change', function () {
      // Trigger change event to acknowledge the modification
      Form.dataChanged();
    });
    customFile.editor.resize();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DdXN0b21GaWxlcy9jdXN0b20tZmlsZXMtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbImN1c3RvbUZpbGUiLCIkZm9ybU9iaiIsIiQiLCIkdGFiTWVudSIsIiRtb2RlRHJvcERvd24iLCIkb3JpZ2luYWxUYWIiLCIkZWRpdG9yVGFiIiwiJHJlc3VsdFRhYiIsIiRtYWluQ29udGFpbmVyIiwiZWRpdG9yIiwidmlld2VyT3JpZ2luYWwiLCJ2aWV3ZXJSZXN1bHQiLCJ2YWxpZGF0ZVJ1bGVzIiwibmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJjZl9WYWxpZGF0ZU5hbWVJc0VtcHR5IiwiaW5pdGlhbGl6ZSIsInRhYiIsIm9uVmlzaWJsZSIsIm9uQ2hhbmdlVGFiIiwicmVtb3ZlQ2xhc3MiLCJpbml0aWFsaXplQWNlIiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsImNiT25DaGFuZ2VNb2RlIiwibW9kZSIsImZvcm0iLCJpbml0aWFsaXplRm9ybSIsInZhbHVlIiwidGV4dCIsImhpZGVTaG93Q29kZSIsImN1cnJlbnRUYWIiLCJmaWxlUGF0aCIsImRhdGEiLCJmaWxlbmFtZSIsIm5lZWRPcmlnaW5hbCIsIm5lZWRMb2dmaWxlIiwiUGJ4QXBpIiwiR2V0RmlsZUNvbnRlbnQiLCJjYkdldFJlc3VsdEZpbGVDb250ZW50RnJvbVNlcnZlciIsImNiR2V0T3JpZ2luYWxGaWxlQ29udGVudEZyb21TZXJ2ZXIiLCJjb250ZW50IiwiaGlkZSIsInNob3ciLCJuYXZpZ2F0ZUZpbGVTdGFydCIsIm5hdmlnYXRlRmlsZUVuZCIsImNsZWFyU2VsZWN0aW9uIiwiYWxpZ25DdXJzb3JzIiwiaW5jbHVkZXMiLCJzZXRWYWx1ZSIsInJlc3BvbnNlIiwidW5kZWZpbmVkIiwiYWNlVmlld2VyIiwic2Nyb2xsVG9wIiwiZ2V0U2Vzc2lvbiIsImdldFNjcm9sbFRvcCIsInNldFNjcm9sbFRvcCIsImFjZUhlaWdodCIsIndpbmRvdyIsImlubmVySGVpZ2h0Iiwicm93c0NvdW50IiwiTWF0aCIsInJvdW5kIiwiY3NzIiwiSW5pTW9kZSIsImFjZSIsInJlcXVpcmUiLCJNb2RlIiwiZWRpdCIsInNlc3Npb24iLCJzZXRNb2RlIiwic2V0VGhlbWUiLCJzZXRPcHRpb25zIiwic2hvd1ByaW50TWFyZ2luIiwicmVhZE9ubHkiLCJtaW5MaW5lcyIsInJlc2l6ZSIsIm9uIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwicmVzdWx0IiwiZ2V0VmFsdWUiLCJjYkFmdGVyU2VuZEZvcm0iLCJ1cmwiLCJnbG9iYWxSb290VXJsIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxVQUFVLEdBQUc7QUFFZjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxtQkFBRCxDQU5JOztBQVNmO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUQsQ0FBQyxDQUFDLDBCQUFELENBYkk7O0FBZ0JmO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLGFBQWEsRUFBRUYsQ0FBQyxDQUFDLGdDQUFELENBcEJEOztBQXNCZjtBQUNKO0FBQ0E7QUFDQTtBQUNJRyxFQUFBQSxZQUFZLEVBQUVILENBQUMsQ0FBQyx3QkFBRCxDQTFCQTs7QUE0QmY7QUFDSjtBQUNBO0FBQ0E7QUFDSUksRUFBQUEsVUFBVSxFQUFFSixDQUFDLENBQUMsc0JBQUQsQ0FoQ0U7O0FBa0NmO0FBQ0o7QUFDQTtBQUNBO0FBQ0lLLEVBQUFBLFVBQVUsRUFBRUwsQ0FBQyxDQUFDLHNCQUFELENBdENFOztBQXdDZjtBQUNKO0FBQ0E7QUFDQTtBQUNJ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ZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLGdsb2JhbFRyYW5zbGF0ZSwgYWNlLCBGb3JtLCBQYnhBcGkgKi9cblxuXG4vKipcbiAqIE1vZHVsZSBjdXN0b21GaWxlXG4gKiBUaGlzIG1vZHVsZSBtYW5hZ2VzIGZpbGUgaW50ZXJhY3Rpb25zIGluIGEgVUksIHN1Y2ggYXMgbG9hZGluZyBmaWxlIGNvbnRlbnQgZnJvbSBhIHNlcnZlciBhbmQgaGFuZGxpbmcgdXNlciBpbnB1dC5cbiAqIEBtb2R1bGUgY3VzdG9tRmlsZVxuICovXG5jb25zdCBjdXN0b21GaWxlID0ge1xuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI2N1c3RvbS1maWxlLWZvcm0nKSxcblxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHRhYiBtZW51LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHRhYk1lbnU6ICQoJyNjdXN0b20tZmlsZXMtbWVudSAuaXRlbScpLFxuXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgbW9kZSBzZWxlY3QuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbW9kZURyb3BEb3duOiAkKCcjY3VzdG9tLWZpbGUtZm9ybSAubW9kZS1zZWxlY3QnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBvcmlnaW5hbCBmaWxlIGNvbnRlbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkb3JpZ2luYWxUYWI6ICQoJ2FbZGF0YS10YWI9XCJvcmlnaW5hbFwiXScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHVzZXIgY29udGVudC9zY3JpcHQgZWRpdG9yLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGVkaXRvclRhYjogJCgnYVtkYXRhLXRhYj1cImVkaXRvclwiXScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHJlc3VsdGVkIGZpbGUgY29udGVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRyZXN1bHRUYWI6ICQoJ2FbZGF0YS10YWI9XCJyZXN1bHRcIl0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBlbGVtZW50IGZvciB0aGUgbWFpbiBjb250ZW50IGNvbnRhaW5lci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRtYWluQ29udGFpbmVyOiAkKCcjbWFpbi1jb250ZW50LWNvbnRhaW5lcicpLFxuXG4gICAgLyoqXG4gICAgICogQWNlIGVkaXRvciBpbnN0YW5jZXNcbiAgICAgKiBgZWRpdG9yYCBpcyBmb3IgaW5wdXQgYW5kIGB2aWV3ZXJzYCBpcyBmb3IgZGlzcGxheSBjb2RlIGZyb20gc2VydmVyXG4gICAgICovXG4gICAgZWRpdG9yOiAnJyxcbiAgICB2aWV3ZXJPcmlnaW5hbDogJycsXG4gICAgdmlld2VyUmVzdWx0OiAnJyxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBuYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZmlsZXBhdGgnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmNmX1ZhbGlkYXRlTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBjdXN0b21GaWxlIG1vZHVsZS5cbiAgICAgKiBTZXRzIHVwIHRoZSBkcm9wZG93biwgaW5pdGlhbGl6ZXMgQWNlIGVkaXRvciwgZm9ybSwgYW5kIHJldHJpZXZlcyBmaWxlIGNvbnRlbnQgZnJvbSB0aGUgc2VydmVyLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG5cbiAgICAgICAgLy8gRW5hYmxlIHRhYiBuYXZpZ2F0aW9uIHdpdGggaGlzdG9yeSBzdXBwb3J0XG4gICAgICAgIGN1c3RvbUZpbGUuJHRhYk1lbnUudGFiKHtcbiAgICAgICAgICAgIG9uVmlzaWJsZTogY3VzdG9tRmlsZS5vbkNoYW5nZVRhYlxuICAgICAgICB9KTtcblxuICAgICAgICBjdXN0b21GaWxlLiRtYWluQ29udGFpbmVyLnJlbW92ZUNsYXNzKCdjb250YWluZXInKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIEFjZSBlZGl0b3JcbiAgICAgICAgY3VzdG9tRmlsZS5pbml0aWFsaXplQWNlKCk7XG5cbiAgICAgICAgY3VzdG9tRmlsZS4kbW9kZURyb3BEb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBjdXN0b21GaWxlLmNiT25DaGFuZ2VNb2RlXG4gICAgICAgIH0pO1xuICAgICAgICBjb25zdCBtb2RlID0gY3VzdG9tRmlsZS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnbW9kZScpO1xuICAgICAgICBjdXN0b21GaWxlLmNiT25DaGFuZ2VNb2RlKG1vZGUpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZm9ybVxuICAgICAgICBjdXN0b21GaWxlLmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICB9LFxuXG4gICAgY2JPbkNoYW5nZU1vZGUodmFsdWUsIHRleHQpe1xuICAgICAgICAvLyBIYW5kbGUgY29kZSB2aXNpYmlsaXR5IGFuZCBjb250ZW50IGJhc2VkIG9uIHRoZSAnbW9kZSdcbiAgICAgICAgc3dpdGNoICh2YWx1ZSkge1xuICAgICAgICAgICAgY2FzZSAnbm9uZSc6XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kdGFiTWVudS50YWIoJ2NoYW5nZSB0YWInLCdvcmlnaW5hbCcpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnb3ZlcnJpZGUnOlxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHRhYk1lbnUudGFiKCdjaGFuZ2UgdGFiJywnZWRpdG9yJyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdhcHBlbmQnOlxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHRhYk1lbnUudGFiKCdjaGFuZ2UgdGFiJywnZWRpdG9yJyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdzY3JpcHQnOlxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHRhYk1lbnUudGFiKCdjaGFuZ2UgdGFiJywnZWRpdG9yJyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHRhYk1lbnUudGFiKCdjaGFuZ2UgdGFiJywnb3JpZ2luYWwnKTtcbiAgICAgICAgfVxuICAgICAgICBjdXN0b21GaWxlLmhpZGVTaG93Q29kZSgpO1xuICAgIH0sXG5cbiAgICBvbkNoYW5nZVRhYihjdXJyZW50VGFiKXtcbiAgICAgICAgY29uc3QgZmlsZVBhdGggPSBjdXN0b21GaWxlLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdmaWxlcGF0aCcpO1xuICAgICAgICBjb25zdCBkYXRhID0ge2ZpbGVuYW1lOiBmaWxlUGF0aCwgbmVlZE9yaWdpbmFsOiB0cnVlLCBuZWVkTG9nZmlsZTogZmFsc2V9O1xuICAgICAgICBzd2l0Y2ggKGN1cnJlbnRUYWIpIHtcbiAgICAgICAgICAgIGNhc2UgJ3Jlc3VsdCc6XG4gICAgICAgICAgICAgICAgZGF0YS5uZWVkT3JpZ2luYWw9ZmFsc2U7XG4gICAgICAgICAgICAgICAgUGJ4QXBpLkdldEZpbGVDb250ZW50KGRhdGEsIGN1c3RvbUZpbGUuY2JHZXRSZXN1bHRGaWxlQ29udGVudEZyb21TZXJ2ZXIpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnb3JpZ2luYWwnOlxuICAgICAgICAgICAgICAgIGRhdGEubmVlZE9yaWdpbmFsPXRydWU7XG4gICAgICAgICAgICAgICAgUGJ4QXBpLkdldEZpbGVDb250ZW50KGRhdGEsIGN1c3RvbUZpbGUuY2JHZXRPcmlnaW5hbEZpbGVDb250ZW50RnJvbVNlcnZlcik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdlZGl0b3InOlxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEhhbmRsZXMgdGhlIHZpc2liaWxpdHkgYW5kIGNvbnRlbnQgb2YgY29kZSBiYXNlZCBvbiB0aGUgJ21vZGUnIGZvcm0gdmFsdWUuXG4gICAgICogQWRqdXN0cyB0aGUgQWNlIGVkaXRvciBzZXR0aW5ncyBhY2NvcmRpbmdseS5cbiAgICAgKi9cbiAgICBoaWRlU2hvd0NvZGUoKSB7XG4gICAgICAgIC8vIFJldHJpZXZlICdtb2RlJyB2YWx1ZSBmcm9tIHRoZSBmb3JtXG4gICAgICAgIGNvbnN0IG1vZGUgPSBjdXN0b21GaWxlLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdtb2RlJyk7XG4gICAgICAgIGxldCBjb250ZW50ID0gY3VzdG9tRmlsZS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnY29udGVudCcpO1xuXG4gICAgICAgIC8vIEhhbmRsZSBjb2RlIHZpc2liaWxpdHkgYW5kIGNvbnRlbnQgYmFzZWQgb24gdGhlICdtb2RlJ1xuICAgICAgICBzd2l0Y2ggKG1vZGUpIHtcbiAgICAgICAgICAgIGNhc2UgJ25vbmUnOlxuICAgICAgICAgICAgICAgIC8vIElmICdtb2RlJyBpcyAnbm9uZScsIHNob3cgb25seSByZXN1bHQgY29kZSBnZW5lcmF0ZWQgYW5kIGhpZGUgZWRpdG9yIGFuZCByZXN1bHQgdmlld2VyXG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZWRpdG9yVGFiLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRvcmlnaW5hbFRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbC5uYXZpZ2F0ZUZpbGVTdGFydCgpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHJlc3VsdFRhYi5oaWRlKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdhcHBlbmQnOlxuICAgICAgICAgICAgICAgIC8vIElmICdtb2RlJyBpcyAnYXBwZW5kJywgc2hvdyBhbGwgZmllbGRzXG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZWRpdG9yVGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRvcmlnaW5hbFRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kcmVzdWx0VGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLnZpZXdlck9yaWdpbmFsLm5hdmlnYXRlRmlsZUVuZCgpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUudmlld2VyUmVzdWx0Lm5hdmlnYXRlRmlsZUVuZCgpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3IuYWxpZ25DdXJzb3JzKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdvdmVycmlkZSc6XG4gICAgICAgICAgICAgICAgLy8gSWYgJ21vZGUnIGlzICdvdmVycmlkZScsIHNob3cgY3VzdG9tIGNvbnRlbnQgYW5kIGhpZGUgc2VydmVyIGNvbnRlbnQsIHJlcGxhY2Ugc2VydmVyIGZpbGUgY29udGVudCB3aXRoIGN1c3RvbSBjb250ZW50XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kZWRpdG9yVGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRvcmlnaW5hbFRhYi5oaWRlKCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kcmVzdWx0VGFiLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5uYXZpZ2F0ZUZpbGVTdGFydCgpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3IuYWxpZ25DdXJzb3JzKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdzY3JpcHQnOlxuICAgICAgICAgICAgICAgIC8vIElmICdtb2RlJyBpcyAnc2NyaXB0Jywgc2hvdyBib3RoIHNlcnZlciBhbmQgY3VzdG9tIGNvZGUsIGFwcGx5IGN1c3RvbSBzY3JpcHQgdG8gdGhlIGZpbGUgY29udGVudCBvbiBzZXJ2ZXJcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRlZGl0b3JUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJG9yaWdpbmFsVGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRyZXN1bHRUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgIC8vIEVkaXRvclxuICAgICAgICAgICAgICAgIGlmICghY29udGVudC5pbmNsdWRlcygnIyEvYmluL2Jhc2gnKSkge1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50ID0gYCMhL2Jpbi9iYXNoIFxcblxcbmA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYGNvbmZpZ1BhdGg9XCIkMVwiICMgUGF0aCB0byB0aGUgb3JpZ2luYWwgY29uZmlnIGZpbGVcXG5cXG5gO1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGAjIEV4YW1wbGUgMTogUmVwbGFjZSBhbGwgdmFsdWVzIG1heF9jb250YWN0cyA9IDUgdG8gbWF4X2NvbnRhY3RzID0gMSBvbiBwanNpcC5jb25mXFxuYDtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgIyBzZWQgLWkgJ3MvbWF4X2NvbnRhY3RzID0gNS9tYXhfY29udGFjdHMgPSAxL2cnIFwiJGNvbmZpZ1BhdGhcIlxcblxcbmBcblxuICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGAjIEV4YW1wbGUgMjogQ2hhbmdlIHZhbHVlIG1heF9jb250YWN0cyBvbmx5IGZvciBwZWVyIHdpdGggZXh0ZW5zaW9uIDIyNiBvbiBwanNpcC5jb25mXFxuYDtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgIyBzZWQgLWkgJy9eXFxcXFsyMjZcXFxcXSQvLC9eXFxcXFsvIHMvbWF4X2NvbnRhY3RzID0gNS9tYXhfY29udGFjdHMgPSAyLycgXCIkY29uZmlnUGF0aFwiXFxuXFxuYFxuXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYCMgRXhhbXBsZSAzOiBBZGQgZW4gZXh0cmEgc3RyaW5nIGludG8gW3BsYXliYWNrLWV4aXRdIHNlY3Rpb24gYWZ0ZXIgdGhlIFwic2FtZSA9PiBuLEhhbmd1cCgpXCIgc3RyaW5nIG9uIGV4dGVuc2lvbnMuY29uZlxcbmA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYCMgc2VkIC1pICcvXlxcXFxbcGxheWJhY2stZXhpdFxcXFxdJC8sL15cXFxcWy8gcy9eXFxcXChcXFxccypzYW1lID0+IG4sSGFuZ3VwKClcXFxcKS9cXFxcMVxcXFxuXFxcXHRzYW1lID0+IG4sTm9PcChcIllvdXIgTm9PcCBjb21tZW50IGhlcmVcIikvJyBcIiRjb25maWdQYXRoXCJcXG5cXG5gO1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYCMgQXR0ZW50aW9uISBZb3Ugd2lsbCBzZWUgY2hhbmdlcyBhZnRlciB0aGUgYmFja2dyb3VuZCB3b3JrZXIgcHJvY2Vzc2VzIHRoZSBzY3JpcHQgb3IgYWZ0ZXIgcmVib290aW5nIHRoZSBzeXN0ZW0uIFxcbmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLnNldFZhbHVlKGNvbnRlbnQpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLmNsZWFyU2VsZWN0aW9uKCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3IuYWxpZ25DdXJzb3JzKCk7XG5cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIGFueSBvdGhlciAnbW9kZScgdmFsdWVzXG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdGhhdCBoYW5kbGVzIHRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgY29udGFpbmluZyB0aGUgZmlsZSdzIGNvbnRlbnQuXG4gICAgICogSXQgd2lsbCB1cGRhdGUgdGhlICd2aWV3ZXJPcmlnaW5hbCcgd2l0aCB0aGUgZmlsZSdzIGNvbnRlbnQgYW5kIGFkanVzdCB0aGUgY29kZSBkaXNwbGF5LlxuICAgICAqL1xuICAgIGNiR2V0T3JpZ2luYWxGaWxlQ29udGVudEZyb21TZXJ2ZXIocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEuY29udGVudCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBjb25zdCBhY2VWaWV3ZXIgPSBjdXN0b21GaWxlLnZpZXdlck9yaWdpbmFsO1xuICAgICAgICAgICAgY29uc3Qgc2Nyb2xsVG9wID0gYWNlVmlld2VyLmdldFNlc3Npb24oKS5nZXRTY3JvbGxUb3AoKTtcbiAgICAgICAgICAgIGFjZVZpZXdlci5nZXRTZXNzaW9uKCkuc2V0VmFsdWUocmVzcG9uc2UuZGF0YS5jb250ZW50KTtcbiAgICAgICAgICAgIGFjZVZpZXdlci5nZXRTZXNzaW9uKCkuc2V0U2Nyb2xsVG9wKHNjcm9sbFRvcCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdGhhdCBoYW5kbGVzIHRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgY29udGFpbmluZyB0aGUgZmlsZSdzIGNvbnRlbnQuXG4gICAgICogSXQgd2lsbCB1cGRhdGUgdGhlICd2aWV3ZXJSZXN1bHQnIHdpdGggdGhlIGZpbGUncyBjb250ZW50IGFuZCBhZGp1c3QgdGhlIGNvZGUgZGlzcGxheS5cbiAgICAgKi9cbiAgICBjYkdldFJlc3VsdEZpbGVDb250ZW50RnJvbVNlcnZlcihyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5jb250ZW50ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGFjZVZpZXdlciA9IGN1c3RvbUZpbGUudmlld2VyUmVzdWx0O1xuICAgICAgICAgICAgY29uc3Qgc2Nyb2xsVG9wID0gYWNlVmlld2VyLmdldFNlc3Npb24oKS5nZXRTY3JvbGxUb3AoKTtcbiAgICAgICAgICAgIGFjZVZpZXdlci5nZXRTZXNzaW9uKCkuc2V0VmFsdWUocmVzcG9uc2UuZGF0YS5jb250ZW50KTtcbiAgICAgICAgICAgIGFjZVZpZXdlci5nZXRTZXNzaW9uKCkuc2V0U2Nyb2xsVG9wKHNjcm9sbFRvcCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgQWNlIGVkaXRvciBpbnN0YW5jZXMgZm9yICdlZGl0b3InIGFuZCAndmlld2Vycycgd2luZG93cy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplQWNlKCkge1xuICAgICAgICAvLyBDYWxjdWxhdGUgYWNlIGVkaXRvciBoZWlnaHQgYW5kIHJvd3MgY291bnRcbiAgICAgICAgY29uc3QgYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gNDc1O1xuICAgICAgICBjb25zdCByb3dzQ291bnQgPSBNYXRoLnJvdW5kKGFjZUhlaWdodCAvIDE2LjMpO1xuXG4gICAgICAgIC8vIFNldCBtaW5pbXVtIGhlaWdodCBmb3IgdGhlIGNvZGUgc2VjdGlvbnMgb24gd2luZG93IGxvYWRcbiAgICAgICAgJCgnLmFwcGxpY2F0aW9uLWNvZGUnKS5jc3MoJ21pbi1oZWlnaHQnLCBgJHthY2VIZWlnaHR9cHhgKTtcblxuICAgICAgICAvLyBBQ0Ugd2luZG93IGZvciB0aGUgb3JpZ2luYWwgZmlsZSBjb250ZW50LlxuICAgICAgICBjb25zdCBJbmlNb2RlID0gYWNlLnJlcXVpcmUoJ2FjZS9tb2RlL2p1bGlhJykuTW9kZTtcbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbCA9IGFjZS5lZGl0KCdjb25maWctZmlsZS1vcmlnaW5hbCcpO1xuICAgICAgICBjdXN0b21GaWxlLnZpZXdlck9yaWdpbmFsLnNlc3Npb24uc2V0TW9kZShuZXcgSW5pTW9kZSgpKTtcbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbC5zZXRUaGVtZSgnYWNlL3RoZW1lL21vbm9rYWknKTtcbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbC5zZXRPcHRpb25zKHtcbiAgICAgICAgICAgIHNob3dQcmludE1hcmdpbjogZmFsc2UsXG4gICAgICAgICAgICByZWFkT25seTogdHJ1ZSxcbiAgICAgICAgICAgIG1pbkxpbmVzOiByb3dzQ291bnRcbiAgICAgICAgfSk7XG4gICAgICAgIGN1c3RvbUZpbGUudmlld2VyT3JpZ2luYWwucmVzaXplKCk7XG5cbiAgICAgICAgLy8gQUNFIHdpbmRvdyBmb3IgdGhlIHJlc3VsdGVkIGZpbGUgY29udGVudC5cbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJSZXN1bHQgPSBhY2UuZWRpdCgnY29uZmlnLWZpbGUtcmVzdWx0Jyk7XG4gICAgICAgIGN1c3RvbUZpbGUudmlld2VyUmVzdWx0LnNlc3Npb24uc2V0TW9kZShuZXcgSW5pTW9kZSgpKTtcbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJSZXN1bHQuc2V0VGhlbWUoJ2FjZS90aGVtZS9tb25va2FpJyk7XG4gICAgICAgIGN1c3RvbUZpbGUudmlld2VyUmVzdWx0LnNldE9wdGlvbnMoe1xuICAgICAgICAgICAgc2hvd1ByaW50TWFyZ2luOiBmYWxzZSxcbiAgICAgICAgICAgIHJlYWRPbmx5OiB0cnVlLFxuICAgICAgICAgICAgbWluTGluZXM6IHJvd3NDb3VudFxuICAgICAgICB9KTtcbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJSZXN1bHQucmVzaXplKCk7XG5cbiAgICAgICAgLy8gQUNFIHdpbmRvdyBmb3IgdGhlIHVzZXIgZWRpdG9yLlxuICAgICAgICBjdXN0b21GaWxlLmVkaXRvciA9IGFjZS5lZGl0KCd1c2VyLWVkaXQtY29uZmlnJyk7XG4gICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLnNlc3Npb24uc2V0TW9kZShuZXcgSW5pTW9kZSgpKTtcbiAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2V0VGhlbWUoJ2FjZS90aGVtZS9tb25va2FpJyk7XG4gICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLnNldE9wdGlvbnMoe1xuICAgICAgICAgICAgc2hvd1ByaW50TWFyZ2luOiBmYWxzZSxcbiAgICAgICAgICAgIG1pbkxpbmVzOiByb3dzQ291bnQsXG4gICAgICAgIH0pO1xuICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXRWYWx1ZShjdXN0b21GaWxlLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdjb250ZW50JykpO1xuICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5nZXRTZXNzaW9uKCkub24oJ2NoYW5nZScsICgpID0+IHtcbiAgICAgICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50IHRvIGFja25vd2xlZGdlIHRoZSBtb2RpZmljYXRpb25cbiAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLnJlc2l6ZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IGN1c3RvbUZpbGUuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBzd2l0Y2ggKGN1c3RvbUZpbGUuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ21vZGUnKSkge1xuICAgICAgICAgICAgY2FzZSAnYXBwZW5kJzpcbiAgICAgICAgICAgIGNhc2UgJ292ZXJyaWRlJzpcbiAgICAgICAgICAgIGNhc2UgJ3NjcmlwdCc6XG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGEuY29udGVudCA9IGN1c3RvbUZpbGUuZWRpdG9yLmdldFZhbHVlKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhLmNvbnRlbnQgPSAnJztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcblxuICAgIH0sXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gY3VzdG9tRmlsZS4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSBgJHtnbG9iYWxSb290VXJsfWN1c3RvbS1maWxlcy9zYXZlYDsgLy8gRm9ybSBzdWJtaXNzaW9uIFVSTFxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBjdXN0b21GaWxlLnZhbGlkYXRlUnVsZXM7IC8vIEZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBjdXN0b21GaWxlLmNiQmVmb3JlU2VuZEZvcm07IC8vIENhbGxiYWNrIGJlZm9yZSBmb3JtIGlzIHNlbnRcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBjdXN0b21GaWxlLmNiQWZ0ZXJTZW5kRm9ybTsgLy8gQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG59O1xuXG4vLyBJbml0aWFsaXplIHRoZSBjdXN0b20gZmlsZXMgbW9kaWZ5IGZvcm0gd2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHkuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgY3VzdG9tRmlsZS5pbml0aWFsaXplKCk7XG59KTtcblxuIl19