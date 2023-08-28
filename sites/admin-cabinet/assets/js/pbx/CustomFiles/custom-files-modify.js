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
   * jQuery element for the script editor
   * @type {jQuery}
   */
  $userEditConfig: $('#user-edit-config textarea'),

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
      customFile.$editorTab.find('textarea').trigger('focus');
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
      customFile.$editorTab.find('textarea').trigger('focus');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9DdXN0b21GaWxlcy9jdXN0b20tZmlsZXMtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbImN1c3RvbUZpbGUiLCIkZm9ybU9iaiIsIiQiLCIkdGFiTWVudSIsIiRtb2RlRHJvcERvd24iLCIkb3JpZ2luYWxUYWIiLCIkZWRpdG9yVGFiIiwiJHJlc3VsdFRhYiIsIiRtYWluQ29udGFpbmVyIiwiJHVzZXJFZGl0Q29uZmlnIiwiZWRpdG9yIiwidmlld2VyT3JpZ2luYWwiLCJ2aWV3ZXJSZXN1bHQiLCJ2YWxpZGF0ZVJ1bGVzIiwibmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJjZl9WYWxpZGF0ZU5hbWVJc0VtcHR5IiwiaW5pdGlhbGl6ZSIsInRhYiIsIm9uVmlzaWJsZSIsIm9uQ2hhbmdlVGFiIiwicmVtb3ZlQ2xhc3MiLCJpbml0aWFsaXplQWNlIiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsImNiT25DaGFuZ2VNb2RlIiwibW9kZSIsImZvcm0iLCJpbml0aWFsaXplRm9ybSIsInZhbHVlIiwidGV4dCIsImhpZGVTaG93Q29kZSIsImN1cnJlbnRUYWIiLCJmaWxlUGF0aCIsImRhdGEiLCJmaWxlbmFtZSIsIm5lZWRPcmlnaW5hbCIsIm5lZWRMb2dmaWxlIiwiUGJ4QXBpIiwiR2V0RmlsZUNvbnRlbnQiLCJjYkdldFJlc3VsdEZpbGVDb250ZW50RnJvbVNlcnZlciIsImNiR2V0T3JpZ2luYWxGaWxlQ29udGVudEZyb21TZXJ2ZXIiLCJjb250ZW50IiwiaGlkZSIsInNob3ciLCJuYXZpZ2F0ZUZpbGVTdGFydCIsIm5hdmlnYXRlRmlsZUVuZCIsImNsZWFyU2VsZWN0aW9uIiwiYWxpZ25DdXJzb3JzIiwiaW5jbHVkZXMiLCJzZXRWYWx1ZSIsInJlc3BvbnNlIiwidW5kZWZpbmVkIiwiYWNlVmlld2VyIiwic2Nyb2xsVG9wIiwiZ2V0U2Vzc2lvbiIsImdldFNjcm9sbFRvcCIsInNldFNjcm9sbFRvcCIsImZpbmQiLCJ0cmlnZ2VyIiwiYWNlSGVpZ2h0Iiwid2luZG93IiwiaW5uZXJIZWlnaHQiLCJyb3dzQ291bnQiLCJNYXRoIiwicm91bmQiLCJjc3MiLCJJbmlNb2RlIiwiYWNlIiwicmVxdWlyZSIsIk1vZGUiLCJlZGl0Iiwic2Vzc2lvbiIsInNldE1vZGUiLCJzZXRUaGVtZSIsInNldE9wdGlvbnMiLCJzaG93UHJpbnRNYXJnaW4iLCJyZWFkT25seSIsIm1pbkxpbmVzIiwicmVzaXplIiwib24iLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJyZXN1bHQiLCJnZXRWYWx1ZSIsImNiQWZ0ZXJTZW5kRm9ybSIsInVybCIsImdsb2JhbFJvb3RVcmwiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFVBQVUsR0FBRztBQUVmO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLG1CQUFELENBTkk7O0FBUWY7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFRCxDQUFDLENBQUMsMEJBQUQsQ0FaSTs7QUFjZjtBQUNKO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxhQUFhLEVBQUVGLENBQUMsQ0FBQyxnQ0FBRCxDQWxCRDs7QUFvQmY7QUFDSjtBQUNBO0FBQ0E7QUFDSUcsRUFBQUEsWUFBWSxFQUFFSCxDQUFDLENBQUMsd0JBQUQsQ0F4QkE7O0FBMEJmO0FBQ0o7QUFDQTtBQUNBO0FBQ0lJLEVBQUFBLFVBQVUsRUFBRUosQ0FBQyxDQUFDLHNCQUFELENBOUJFOztBQWdDZjtBQUNKO0FBQ0E7QUFDQTtBQUNJSyxFQUFBQSxVQUFVLEVBQUVMLENBQUMsQ0FBQyxzQkFB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SmEsQ0FJd0M7O0FBQ3JERixJQUFBQSxJQUFJLENBQUNNLGVBQUwsR0FBdUIzRixVQUFVLENBQUMyRixlQUFsQyxDQUxhLENBS3NDOztBQUNuRE4sSUFBQUEsSUFBSSxDQUFDaEUsVUFBTDtBQUNIO0FBblVjLENBQW5CLEMsQ0FzVUE7O0FBQ0FuQixDQUFDLENBQUM0RixRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCL0YsRUFBQUEsVUFBVSxDQUFDcUIsVUFBWDtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCxnbG9iYWxUcmFuc2xhdGUsIGFjZSwgRm9ybSwgUGJ4QXBpICovXG5cblxuLyoqXG4gKiBNb2R1bGUgY3VzdG9tRmlsZVxuICogVGhpcyBtb2R1bGUgbWFuYWdlcyBmaWxlIGludGVyYWN0aW9ucyBpbiBhIFVJLCBzdWNoIGFzIGxvYWRpbmcgZmlsZSBjb250ZW50IGZyb20gYSBzZXJ2ZXIgYW5kIGhhbmRsaW5nIHVzZXIgaW5wdXQuXG4gKiBAbW9kdWxlIGN1c3RvbUZpbGVcbiAqL1xuY29uc3QgY3VzdG9tRmlsZSA9IHtcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNjdXN0b20tZmlsZS1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgdGFiIG1lbnUuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkdGFiTWVudTogJCgnI2N1c3RvbS1maWxlcy1tZW51IC5pdGVtJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgbW9kZSBzZWxlY3QuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkbW9kZURyb3BEb3duOiAkKCcjY3VzdG9tLWZpbGUtZm9ybSAubW9kZS1zZWxlY3QnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB0YWIgd2l0aCBvcmlnaW5hbCBmaWxlIGNvbnRlbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkb3JpZ2luYWxUYWI6ICQoJ2FbZGF0YS10YWI9XCJvcmlnaW5hbFwiXScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHRhYiB3aXRoIHVzZXIgY29udGVudC9zY3JpcHQgZWRpdG9yLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGVkaXRvclRhYjogJCgnYVtkYXRhLXRhYj1cImVkaXRvclwiXScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHRhYiB3aXRoIHJlc3VsdGVkIGZpbGUgY29udGVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRyZXN1bHRUYWI6ICQoJ2FbZGF0YS10YWI9XCJyZXN1bHRcIl0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBlbGVtZW50IGZvciB0aGUgbWFpbiBjb250ZW50IGNvbnRhaW5lci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRtYWluQ29udGFpbmVyOiAkKCcjbWFpbi1jb250ZW50LWNvbnRhaW5lcicpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IGVsZW1lbnQgZm9yIHRoZSBzY3JpcHQgZWRpdG9yXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkdXNlckVkaXRDb25maWc6ICQoJyN1c2VyLWVkaXQtY29uZmlnIHRleHRhcmVhJyksXG5cbiAgICAvKipcbiAgICAgKiBBY2UgZWRpdG9yIGluc3RhbmNlc1xuICAgICAqIGBlZGl0b3JgIGlzIGZvciBpbnB1dCBhbmQgYHZpZXdlcnNgIGlzIGZvciBkaXNwbGF5IGNvZGUgZnJvbSBzZXJ2ZXJcbiAgICAgKi9cbiAgICBlZGl0b3I6ICcnLFxuICAgIHZpZXdlck9yaWdpbmFsOiAnJyxcbiAgICB2aWV3ZXJSZXN1bHQ6ICcnLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIG5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdmaWxlcGF0aCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuY2ZfVmFsaWRhdGVOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGN1c3RvbUZpbGUgbW9kdWxlLlxuICAgICAqIFNldHMgdXAgdGhlIGRyb3Bkb3duLCBpbml0aWFsaXplcyBBY2UgZWRpdG9yLCBmb3JtLCBhbmQgcmV0cmlldmVzIGZpbGUgY29udGVudCBmcm9tIHRoZSBzZXJ2ZXIuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcblxuICAgICAgICAvLyBFbmFibGUgdGFiIG5hdmlnYXRpb24gd2l0aCBoaXN0b3J5IHN1cHBvcnRcbiAgICAgICAgY3VzdG9tRmlsZS4kdGFiTWVudS50YWIoe1xuICAgICAgICAgICAgb25WaXNpYmxlOiBjdXN0b21GaWxlLm9uQ2hhbmdlVGFiXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGN1c3RvbUZpbGUuJG1haW5Db250YWluZXIucmVtb3ZlQ2xhc3MoJ2NvbnRhaW5lcicpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgQWNlIGVkaXRvclxuICAgICAgICBjdXN0b21GaWxlLmluaXRpYWxpemVBY2UoKTtcblxuICAgICAgICBjdXN0b21GaWxlLiRtb2RlRHJvcERvd24uZHJvcGRvd24oe1xuICAgICAgICAgICAgb25DaGFuZ2U6IGN1c3RvbUZpbGUuY2JPbkNoYW5nZU1vZGVcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnN0IG1vZGUgPSBjdXN0b21GaWxlLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdtb2RlJyk7XG4gICAgICAgIGN1c3RvbUZpbGUuY2JPbkNoYW5nZU1vZGUobW9kZSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtXG4gICAgICAgIGN1c3RvbUZpbGUuaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgIH0sXG5cbiAgICBjYk9uQ2hhbmdlTW9kZSh2YWx1ZSwgdGV4dCl7XG4gICAgICAgIC8vIEhhbmRsZSBjb2RlIHZpc2liaWxpdHkgYW5kIGNvbnRlbnQgYmFzZWQgb24gdGhlICdtb2RlJ1xuICAgICAgICBzd2l0Y2ggKHZhbHVlKSB7XG4gICAgICAgICAgICBjYXNlICdub25lJzpcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiR0YWJNZW51LnRhYignY2hhbmdlIHRhYicsJ29yaWdpbmFsJyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdvdmVycmlkZSc6XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kdGFiTWVudS50YWIoJ2NoYW5nZSB0YWInLCdlZGl0b3InKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2FwcGVuZCc6XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kdGFiTWVudS50YWIoJ2NoYW5nZSB0YWInLCdlZGl0b3InKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3NjcmlwdCc6XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kdGFiTWVudS50YWIoJ2NoYW5nZSB0YWInLCdlZGl0b3InKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kdGFiTWVudS50YWIoJ2NoYW5nZSB0YWInLCdvcmlnaW5hbCcpO1xuICAgICAgICB9XG4gICAgICAgIGN1c3RvbUZpbGUuaGlkZVNob3dDb2RlKCk7XG4gICAgfSxcblxuICAgIG9uQ2hhbmdlVGFiKGN1cnJlbnRUYWIpe1xuICAgICAgICBjb25zdCBmaWxlUGF0aCA9IGN1c3RvbUZpbGUuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2ZpbGVwYXRoJyk7XG4gICAgICAgIGNvbnN0IGRhdGEgPSB7ZmlsZW5hbWU6IGZpbGVQYXRoLCBuZWVkT3JpZ2luYWw6IHRydWUsIG5lZWRMb2dmaWxlOiBmYWxzZX07XG4gICAgICAgIHN3aXRjaCAoY3VycmVudFRhYikge1xuICAgICAgICAgICAgY2FzZSAncmVzdWx0JzpcbiAgICAgICAgICAgICAgICBkYXRhLm5lZWRPcmlnaW5hbD1mYWxzZTtcbiAgICAgICAgICAgICAgICBQYnhBcGkuR2V0RmlsZUNvbnRlbnQoZGF0YSwgY3VzdG9tRmlsZS5jYkdldFJlc3VsdEZpbGVDb250ZW50RnJvbVNlcnZlcik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdvcmlnaW5hbCc6XG4gICAgICAgICAgICAgICAgZGF0YS5uZWVkT3JpZ2luYWw9dHJ1ZTtcbiAgICAgICAgICAgICAgICBQYnhBcGkuR2V0RmlsZUNvbnRlbnQoZGF0YSwgY3VzdG9tRmlsZS5jYkdldE9yaWdpbmFsRmlsZUNvbnRlbnRGcm9tU2VydmVyKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2VkaXRvcic6XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlcyB0aGUgdmlzaWJpbGl0eSBhbmQgY29udGVudCBvZiBjb2RlIGJhc2VkIG9uIHRoZSAnbW9kZScgZm9ybSB2YWx1ZS5cbiAgICAgKiBBZGp1c3RzIHRoZSBBY2UgZWRpdG9yIHNldHRpbmdzIGFjY29yZGluZ2x5LlxuICAgICAqL1xuICAgIGhpZGVTaG93Q29kZSgpIHtcbiAgICAgICAgLy8gUmV0cmlldmUgJ21vZGUnIHZhbHVlIGZyb20gdGhlIGZvcm1cbiAgICAgICAgY29uc3QgbW9kZSA9IGN1c3RvbUZpbGUuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ21vZGUnKTtcbiAgICAgICAgbGV0IGNvbnRlbnQgPSBjdXN0b21GaWxlLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdjb250ZW50Jyk7XG5cbiAgICAgICAgLy8gSGFuZGxlIGNvZGUgdmlzaWJpbGl0eSBhbmQgY29udGVudCBiYXNlZCBvbiB0aGUgJ21vZGUnXG4gICAgICAgIHN3aXRjaCAobW9kZSkge1xuICAgICAgICAgICAgY2FzZSAnbm9uZSc6XG4gICAgICAgICAgICAgICAgLy8gSWYgJ21vZGUnIGlzICdub25lJywgc2hvdyBvbmx5IHJlc3VsdCBjb2RlIGdlbmVyYXRlZCBhbmQgaGlkZSBlZGl0b3IgYW5kIHJlc3VsdCB2aWV3ZXJcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRlZGl0b3JUYWIuaGlkZSgpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJG9yaWdpbmFsVGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLnZpZXdlck9yaWdpbmFsLm5hdmlnYXRlRmlsZVN0YXJ0KCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kcmVzdWx0VGFiLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2FwcGVuZCc6XG4gICAgICAgICAgICAgICAgLy8gSWYgJ21vZGUnIGlzICdhcHBlbmQnLCBzaG93IGFsbCBmaWVsZHNcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRlZGl0b3JUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJG9yaWdpbmFsVGFiLnNob3coKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRyZXN1bHRUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUudmlld2VyT3JpZ2luYWwubmF2aWdhdGVGaWxlRW5kKCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJSZXN1bHQubmF2aWdhdGVGaWxlRW5kKCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3IuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5hbGlnbkN1cnNvcnMoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ292ZXJyaWRlJzpcbiAgICAgICAgICAgICAgICAvLyBJZiAnbW9kZScgaXMgJ292ZXJyaWRlJywgc2hvdyBjdXN0b20gY29udGVudCBhbmQgaGlkZSBzZXJ2ZXIgY29udGVudCwgcmVwbGFjZSBzZXJ2ZXIgZmlsZSBjb250ZW50IHdpdGggY3VzdG9tIGNvbnRlbnRcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRlZGl0b3JUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJG9yaWdpbmFsVGFiLmhpZGUoKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLiRyZXN1bHRUYWIuaGlkZSgpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLm5hdmlnYXRlRmlsZVN0YXJ0KCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3IuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5hbGlnbkN1cnNvcnMoKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3NjcmlwdCc6XG4gICAgICAgICAgICAgICAgLy8gSWYgJ21vZGUnIGlzICdzY3JpcHQnLCBzaG93IGJvdGggc2VydmVyIGFuZCBjdXN0b20gY29kZSwgYXBwbHkgY3VzdG9tIHNjcmlwdCB0byB0aGUgZmlsZSBjb250ZW50IG9uIHNlcnZlclxuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJGVkaXRvclRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS4kb3JpZ2luYWxUYWIuc2hvdygpO1xuICAgICAgICAgICAgICAgIGN1c3RvbUZpbGUuJHJlc3VsdFRhYi5zaG93KCk7XG4gICAgICAgICAgICAgICAgLy8gRWRpdG9yXG4gICAgICAgICAgICAgICAgaWYgKCFjb250ZW50LmluY2x1ZGVzKCcjIS9iaW4vYmFzaCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgPSBgIyEvYmluL2Jhc2ggXFxuXFxuYDtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgY29uZmlnUGF0aD1cIiQxXCIgIyBQYXRoIHRvIHRoZSBvcmlnaW5hbCBjb25maWcgZmlsZVxcblxcbmA7XG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYCMgRXhhbXBsZSAxOiBSZXBsYWNlIGFsbCB2YWx1ZXMgbWF4X2NvbnRhY3RzID0gNSB0byBtYXhfY29udGFjdHMgPSAxIG9uIHBqc2lwLmNvbmZcXG5gO1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGAjIHNlZCAtaSAncy9tYXhfY29udGFjdHMgPSA1L21heF9jb250YWN0cyA9IDEvZycgXCIkY29uZmlnUGF0aFwiXFxuXFxuYFxuXG4gICAgICAgICAgICAgICAgICAgIGNvbnRlbnQgKz0gYCMgRXhhbXBsZSAyOiBDaGFuZ2UgdmFsdWUgbWF4X2NvbnRhY3RzIG9ubHkgZm9yIHBlZXIgd2l0aCBleHRlbnNpb24gMjI2IG9uIHBqc2lwLmNvbmZcXG5gO1xuICAgICAgICAgICAgICAgICAgICBjb250ZW50ICs9IGAjIHNlZCAtaSAnL15cXFxcWzIyNlxcXFxdJC8sL15cXFxcWy8gcy9tYXhfY29udGFjdHMgPSA1L21heF9jb250YWN0cyA9IDIvJyBcIiRjb25maWdQYXRoXCJcXG5cXG5gXG5cbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgIyBFeGFtcGxlIDM6IEFkZCBlbiBleHRyYSBzdHJpbmcgaW50byBbcGxheWJhY2stZXhpdF0gc2VjdGlvbiBhZnRlciB0aGUgXCJzYW1lID0+IG4sSGFuZ3VwKClcIiBzdHJpbmcgb24gZXh0ZW5zaW9ucy5jb25mXFxuYDtcbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgIyBzZWQgLWkgJy9eXFxcXFtwbGF5YmFjay1leGl0XFxcXF0kLywvXlxcXFxbLyBzL15cXFxcKFxcXFxzKnNhbWUgPT4gbixIYW5ndXAoKVxcXFwpL1xcXFwxXFxcXG5cXFxcdHNhbWUgPT4gbixOb09wKFwiWW91ciBOb09wIGNvbW1lbnQgaGVyZVwiKS8nIFwiJGNvbmZpZ1BhdGhcIlxcblxcbmA7XG5cbiAgICAgICAgICAgICAgICAgICAgY29udGVudCArPSBgIyBBdHRlbnRpb24hIFlvdSB3aWxsIHNlZSBjaGFuZ2VzIGFmdGVyIHRoZSBiYWNrZ3JvdW5kIHdvcmtlciBwcm9jZXNzZXMgdGhlIHNjcmlwdCBvciBhZnRlciByZWJvb3RpbmcgdGhlIHN5c3RlbS4gXFxuYDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2V0VmFsdWUoY29udGVudCk7XG4gICAgICAgICAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3IuY2xlYXJTZWxlY3Rpb24oKTtcbiAgICAgICAgICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5hbGlnbkN1cnNvcnMoKTtcblxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgYW55IG90aGVyICdtb2RlJyB2YWx1ZXNcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0aGF0IGhhbmRsZXMgdGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBjb250YWluaW5nIHRoZSBmaWxlJ3MgY29udGVudC5cbiAgICAgKiBJdCB3aWxsIHVwZGF0ZSB0aGUgJ3ZpZXdlck9yaWdpbmFsJyB3aXRoIHRoZSBmaWxlJ3MgY29udGVudCBhbmQgYWRqdXN0IHRoZSBjb2RlIGRpc3BsYXkuXG4gICAgICovXG4gICAgY2JHZXRPcmlnaW5hbEZpbGVDb250ZW50RnJvbVNlcnZlcihyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5jb250ZW50ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGFjZVZpZXdlciA9IGN1c3RvbUZpbGUudmlld2VyT3JpZ2luYWw7XG4gICAgICAgICAgICBjb25zdCBzY3JvbGxUb3AgPSBhY2VWaWV3ZXIuZ2V0U2Vzc2lvbigpLmdldFNjcm9sbFRvcCgpO1xuICAgICAgICAgICAgYWNlVmlld2VyLmdldFNlc3Npb24oKS5zZXRWYWx1ZShyZXNwb25zZS5kYXRhLmNvbnRlbnQpO1xuICAgICAgICAgICAgYWNlVmlld2VyLmdldFNlc3Npb24oKS5zZXRTY3JvbGxUb3Aoc2Nyb2xsVG9wKTtcbiAgICAgICAgICAgIGN1c3RvbUZpbGUuJGVkaXRvclRhYi5maW5kKCd0ZXh0YXJlYScpLnRyaWdnZXIoJ2ZvY3VzJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdGhhdCBoYW5kbGVzIHRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgY29udGFpbmluZyB0aGUgZmlsZSdzIGNvbnRlbnQuXG4gICAgICogSXQgd2lsbCB1cGRhdGUgdGhlICd2aWV3ZXJSZXN1bHQnIHdpdGggdGhlIGZpbGUncyBjb250ZW50IGFuZCBhZGp1c3QgdGhlIGNvZGUgZGlzcGxheS5cbiAgICAgKi9cbiAgICBjYkdldFJlc3VsdEZpbGVDb250ZW50RnJvbVNlcnZlcihyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5jb250ZW50ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGNvbnN0IGFjZVZpZXdlciA9IGN1c3RvbUZpbGUudmlld2VyUmVzdWx0O1xuICAgICAgICAgICAgY29uc3Qgc2Nyb2xsVG9wID0gYWNlVmlld2VyLmdldFNlc3Npb24oKS5nZXRTY3JvbGxUb3AoKTtcbiAgICAgICAgICAgIGFjZVZpZXdlci5nZXRTZXNzaW9uKCkuc2V0VmFsdWUocmVzcG9uc2UuZGF0YS5jb250ZW50KTtcbiAgICAgICAgICAgIGFjZVZpZXdlci5nZXRTZXNzaW9uKCkuc2V0U2Nyb2xsVG9wKHNjcm9sbFRvcCk7XG4gICAgICAgICAgICBjdXN0b21GaWxlLiRlZGl0b3JUYWIuZmluZCgndGV4dGFyZWEnKS50cmlnZ2VyKCdmb2N1cycpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIEFjZSBlZGl0b3IgaW5zdGFuY2VzIGZvciAnZWRpdG9yJyBhbmQgJ3ZpZXdlcnMnIHdpbmRvd3MuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUFjZSgpIHtcbiAgICAgICAgLy8gQ2FsY3VsYXRlIGFjZSBlZGl0b3IgaGVpZ2h0IGFuZCByb3dzIGNvdW50XG4gICAgICAgIGNvbnN0IGFjZUhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCAtIDQ3NTtcbiAgICAgICAgY29uc3Qgcm93c0NvdW50ID0gTWF0aC5yb3VuZChhY2VIZWlnaHQgLyAxNi4zKTtcblxuICAgICAgICAvLyBTZXQgbWluaW11bSBoZWlnaHQgZm9yIHRoZSBjb2RlIHNlY3Rpb25zIG9uIHdpbmRvdyBsb2FkXG4gICAgICAgICQoJy5hcHBsaWNhdGlvbi1jb2RlJykuY3NzKCdtaW4taGVpZ2h0JywgYCR7YWNlSGVpZ2h0fXB4YCk7XG5cbiAgICAgICAgLy8gQUNFIHdpbmRvdyBmb3IgdGhlIG9yaWdpbmFsIGZpbGUgY29udGVudC5cbiAgICAgICAgY29uc3QgSW5pTW9kZSA9IGFjZS5yZXF1aXJlKCdhY2UvbW9kZS9qdWxpYScpLk1vZGU7XG4gICAgICAgIGN1c3RvbUZpbGUudmlld2VyT3JpZ2luYWwgPSBhY2UuZWRpdCgnY29uZmlnLWZpbGUtb3JpZ2luYWwnKTtcbiAgICAgICAgY3VzdG9tRmlsZS52aWV3ZXJPcmlnaW5hbC5zZXNzaW9uLnNldE1vZGUobmV3IEluaU1vZGUoKSk7XG4gICAgICAgIGN1c3RvbUZpbGUudmlld2VyT3JpZ2luYWwuc2V0VGhlbWUoJ2FjZS90aGVtZS9tb25va2FpJyk7XG4gICAgICAgIGN1c3RvbUZpbGUudmlld2VyT3JpZ2luYWwuc2V0T3B0aW9ucyh7XG4gICAgICAgICAgICBzaG93UHJpbnRNYXJnaW46IGZhbHNlLFxuICAgICAgICAgICAgcmVhZE9ubHk6IHRydWUsXG4gICAgICAgICAgICBtaW5MaW5lczogcm93c0NvdW50XG4gICAgICAgIH0pO1xuICAgICAgICBjdXN0b21GaWxlLnZpZXdlck9yaWdpbmFsLnJlc2l6ZSgpO1xuXG4gICAgICAgIC8vIEFDRSB3aW5kb3cgZm9yIHRoZSByZXN1bHRlZCBmaWxlIGNvbnRlbnQuXG4gICAgICAgIGN1c3RvbUZpbGUudmlld2VyUmVzdWx0ID0gYWNlLmVkaXQoJ2NvbmZpZy1maWxlLXJlc3VsdCcpO1xuICAgICAgICBjdXN0b21GaWxlLnZpZXdlclJlc3VsdC5zZXNzaW9uLnNldE1vZGUobmV3IEluaU1vZGUoKSk7XG4gICAgICAgIGN1c3RvbUZpbGUudmlld2VyUmVzdWx0LnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuICAgICAgICBjdXN0b21GaWxlLnZpZXdlclJlc3VsdC5zZXRPcHRpb25zKHtcbiAgICAgICAgICAgIHNob3dQcmludE1hcmdpbjogZmFsc2UsXG4gICAgICAgICAgICByZWFkT25seTogdHJ1ZSxcbiAgICAgICAgICAgIG1pbkxpbmVzOiByb3dzQ291bnRcbiAgICAgICAgfSk7XG4gICAgICAgIGN1c3RvbUZpbGUudmlld2VyUmVzdWx0LnJlc2l6ZSgpO1xuXG4gICAgICAgIC8vIEFDRSB3aW5kb3cgZm9yIHRoZSB1c2VyIGVkaXRvci5cbiAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3IgPSBhY2UuZWRpdCgndXNlci1lZGl0LWNvbmZpZycpO1xuICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXNzaW9uLnNldE1vZGUobmV3IEluaU1vZGUoKSk7XG4gICAgICAgIGN1c3RvbUZpbGUuZWRpdG9yLnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5zZXRPcHRpb25zKHtcbiAgICAgICAgICAgIHNob3dQcmludE1hcmdpbjogZmFsc2UsXG4gICAgICAgICAgICBtaW5MaW5lczogcm93c0NvdW50LFxuICAgICAgICB9KTtcbiAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3Iuc2V0VmFsdWUoY3VzdG9tRmlsZS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnY29udGVudCcpKTtcbiAgICAgICAgY3VzdG9tRmlsZS5lZGl0b3IuZ2V0U2Vzc2lvbigpLm9uKCdjaGFuZ2UnLCAoKSA9PiB7XG4gICAgICAgICAgICAvLyBUcmlnZ2VyIGNoYW5nZSBldmVudCB0byBhY2tub3dsZWRnZSB0aGUgbW9kaWZpY2F0aW9uXG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBjdXN0b21GaWxlLmVkaXRvci5yZXNpemUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBjdXN0b21GaWxlLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgc3dpdGNoIChjdXN0b21GaWxlLiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdtb2RlJykpIHtcbiAgICAgICAgICAgIGNhc2UgJ2FwcGVuZCc6XG4gICAgICAgICAgICBjYXNlICdvdmVycmlkZSc6XG4gICAgICAgICAgICBjYXNlICdzY3JpcHQnOlxuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhLmNvbnRlbnQgPSBjdXN0b21GaWxlLmVkaXRvci5nZXRWYWx1ZSgpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YS5jb250ZW50ID0gJyc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG5cbiAgICB9LFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBjdXN0b20gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGN1c3RvbUZpbGUuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gYCR7Z2xvYmFsUm9vdFVybH1jdXN0b20tZmlsZXMvc2F2ZWA7IC8vIEZvcm0gc3VibWlzc2lvbiBVUkxcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gY3VzdG9tRmlsZS52YWxpZGF0ZVJ1bGVzOyAvLyBGb3JtIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gY3VzdG9tRmlsZS5jYkJlZm9yZVNlbmRGb3JtOyAvLyBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gY3VzdG9tRmlsZS5jYkFmdGVyU2VuZEZvcm07IC8vIENhbGxiYWNrIGFmdGVyIGZvcm0gaXMgc2VudFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxufTtcblxuLy8gSW5pdGlhbGl6ZSB0aGUgY3VzdG9tIGZpbGVzIG1vZGlmeSBmb3JtIHdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LlxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIGN1c3RvbUZpbGUuaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==