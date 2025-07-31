"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 */

/* global DialplanApplicationsAPI, Form, SecurityUtils, globalTranslate, Extensions, ace, UserMessage */

/**
 * Dialplan application edit form management module with enhanced security
 */
var dialplanApplicationModify = {
  $formObj: $('#dialplan-application-form'),
  $number: $('#extension'),
  $typeSelectDropDown: $('#dialplan-application-form .type-select'),
  $tabMenuItems: $('#application-code-menu .item'),
  defaultExtension: '',
  editor: null,
  currentActiveTab: 'main',
  // Track current active tab

  /**
   * Form validation rules
   */
  validateRules: {
    name: {
      identifier: 'name',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.da_ValidateNameIsEmpty
      }, {
        type: 'maxLength[50]',
        prompt: globalTranslate.da_ValidateNameTooLong || 'Name is too long (max 50 characters)'
      }]
    },
    extension: {
      identifier: 'extension',
      rules: [{
        type: 'regExp',
        value: '/^[0-9#+\\*|X]{1,64}$/',
        prompt: globalTranslate.da_ValidateExtensionNumber
      }, {
        type: 'empty',
        prompt: globalTranslate.da_ValidateExtensionIsEmpty
      }, {
        type: 'existRule[extension-error]',
        prompt: globalTranslate.da_ValidateExtensionDouble
      }]
    }
  },

  /**
   * Update extension display in ribbon label
   * 
   * @param {string} extension - Extension number
   */
  updateExtensionDisplay: function updateExtensionDisplay(extension) {
    var extensionDisplay = $('#extension-display');
    extensionDisplay.text(extension || '');
  },

  /**
   * Initialize the module
   */
  initialize: function initialize() {
    // Enable tab navigation with history support
    dialplanApplicationModify.$tabMenuItems.tab({
      history: true,
      historyType: 'hash',
      onVisible: function onVisible(tabPath) {
        // Track current active tab
        dialplanApplicationModify.currentActiveTab = tabPath; // Resize ACE editor when code tab becomes visible

        if (tabPath === 'code' && dialplanApplicationModify.editor) {
          setTimeout(function () {
            dialplanApplicationModify.editor.resize();
          }, 100);
        }
      }
    });
    dialplanApplicationModify.$typeSelectDropDown.dropdown({
      onChange: dialplanApplicationModify.changeAceMode
    }); // Extension availability check

    var timeoutId;
    dialplanApplicationModify.$number.on('input', function () {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(function () {
        var newNumber = dialplanApplicationModify.$formObj.form('get value', 'extension');
        Extensions.checkAvailability(dialplanApplicationModify.defaultExtension, newNumber);
      }, 500);
    }); // Configure Form.js for REST API

    Form.$formObj = dialplanApplicationModify.$formObj;
    Form.url = '#'; // Not used with REST API

    Form.validateRules = dialplanApplicationModify.validateRules;
    Form.cbBeforeSendForm = dialplanApplicationModify.cbBeforeSendForm;
    Form.cbAfterSendForm = dialplanApplicationModify.cbAfterSendForm; // REST API integration

    Form.apiSettings.enabled = true;
    Form.apiSettings.apiObject = DialplanApplicationsAPI;
    Form.apiSettings.saveMethod = 'saveRecord'; // Navigation URLs

    Form.afterSubmitIndexUrl = globalRootUrl + 'dialplan-applications/index/';
    Form.afterSubmitModifyUrl = globalRootUrl + 'dialplan-applications/modify/';
    Form.initialize(); // Initialize adaptive textarea for description field

    dialplanApplicationModify.initializeAdaptiveTextarea(); // Initialize components

    dialplanApplicationModify.initializeAce();
    dialplanApplicationModify.initializeFullscreenHandlers();
    dialplanApplicationModify.initializeForm();
  },

  /**
   * Initialize adaptive textarea for description field
   */
  initializeAdaptiveTextarea: function initializeAdaptiveTextarea() {
    // Set up adaptive resizing for description textarea
    $('textarea[name="description"]').on('input paste keyup', function () {
      Form.autoResizeTextArea($(this)); // Use dynamic width calculation
    }); // Initial resize after form data is loaded

    Form.autoResizeTextArea('textarea[name="description"]'); // Use dynamic width calculation
  },

  /**
   * Load form data via REST API
   */
  initializeForm: function initializeForm() {
    var recordId = dialplanApplicationModify.getRecordId();
    DialplanApplicationsAPI.getRecord(recordId, function (response) {
      if (response.result) {
        // Data is already sanitized in API module
        dialplanApplicationModify.populateForm(response.data);
        dialplanApplicationModify.defaultExtension = response.data.extension; // Update extension number display in the ribbon label

        dialplanApplicationModify.updateExtensionDisplay(response.data.extension); // Set ACE editor content (applicationlogic is not sanitized)

        var codeContent = response.data.applicationlogic || '';
        dialplanApplicationModify.editor.getSession().setValue(codeContent);
        dialplanApplicationModify.changeAceMode(); // Switch to main tab only for completely new records (no name and no extension)
        // Hash history will preserve the tab for existing records

        if (!response.data.name && !response.data.extension && !window.location.hash) {
          dialplanApplicationModify.$tabMenuItems.tab('change tab', 'main');
        } // Auto-resize textarea after data is loaded


        Form.autoResizeTextArea('textarea[name="description"]');
      } else {
        var errorMessage = response.messages && response.messages.error ? response.messages.error.join(', ') : 'Failed to load dialplan application data';
        UserMessage.showError(SecurityUtils.escapeHtml(errorMessage));
      }
    });
  },

  /**
   * Get record ID from URL
   * 
   * @return {string} Record ID
   */
  getRecordId: function getRecordId() {
    var urlParts = window.location.pathname.split('/');
    var modifyIndex = urlParts.indexOf('modify');

    if (modifyIndex !== -1 && urlParts[modifyIndex + 1]) {
      return urlParts[modifyIndex + 1];
    }

    return '';
  },

  /**
   * Initialize ACE editor with security considerations
   */
  initializeAce: function initializeAce() {
    var aceHeight = window.innerHeight - 380;
    var rowsCount = Math.round(aceHeight / 16.3);
    $(window).on('load', function () {
      $('.application-code').css('min-height', aceHeight + 'px');
    });
    dialplanApplicationModify.editor = ace.edit('application-code');
    dialplanApplicationModify.editor.setTheme('ace/theme/monokai');
    dialplanApplicationModify.editor.resize(); // Track changes for Form.js

    dialplanApplicationModify.editor.getSession().on('change', function () {
      Form.dataChanged();
    });
    dialplanApplicationModify.editor.setOptions({
      maxLines: rowsCount,
      showPrintMargin: false,
      showLineNumbers: false
    }); // Security: prevent code execution in editor

    dialplanApplicationModify.editor.commands.addCommand({
      name: 'preventCodeExecution',
      bindKey: {
        win: 'Ctrl-E',
        mac: 'Command-E'
      },
      exec: function exec() {
        console.warn('Code execution prevented for security');
        return false;
      }
    });
  },

  /**
   * Initialize fullscreen handlers
   */
  initializeFullscreenHandlers: function initializeFullscreenHandlers() {
    $('.fullscreen-toggle-btn').on('click', function () {
      var container = $(this).siblings('.application-code')[0];
      dialplanApplicationModify.toggleFullScreen(container);
    });
    document.addEventListener('fullscreenchange', dialplanApplicationModify.adjustEditorHeight);
  },

  /**
   * Cleanup event listeners to prevent memory leaks
   */
  cleanup: function cleanup() {
    // Remove fullscreen event listener
    document.removeEventListener('fullscreenchange', dialplanApplicationModify.adjustEditorHeight); // Cleanup other event listeners if needed

    $(window).off('load');
    $('.fullscreen-toggle-btn').off('click');
    $('textarea[name="description"]').off('input paste keyup'); // Cleanup ACE editor

    if (dialplanApplicationModify.editor) {
      dialplanApplicationModify.editor.destroy();
      dialplanApplicationModify.editor = null;
    }
  },

  /**
   * Toggle fullscreen mode
   * 
   * @param {HTMLElement} container - Container element
   */
  toggleFullScreen: function toggleFullScreen(container) {
    if (!document.fullscreenElement) {
      container.requestFullscreen()["catch"](function (err) {
        console.error('Error attempting to enable full-screen mode: ' + err.message);
      });
    } else {
      document.exitFullscreen();
    }
  },

  /**
   * Adjust editor height on fullscreen change
   */
  adjustEditorHeight: function adjustEditorHeight() {
    dialplanApplicationModify.editor.resize();
  },

  /**
   * Change ACE editor mode based on type
   */
  changeAceMode: function changeAceMode() {
    var mode = dialplanApplicationModify.$formObj.form('get value', 'type');
    var NewMode;

    if (mode === 'php') {
      NewMode = ace.require('ace/mode/php').Mode;
      dialplanApplicationModify.editor.setOptions({
        showLineNumbers: true
      });
    } else {
      NewMode = ace.require('ace/mode/julia').Mode;
      dialplanApplicationModify.editor.setOptions({
        showLineNumbers: false
      });
    }

    dialplanApplicationModify.editor.session.setMode(new NewMode());
    dialplanApplicationModify.editor.setTheme('ace/theme/monokai');
  },

  /**
   * Callback before form submission
   * 
   * @param {object} settings - Form settings
   * @return {object|false} Modified settings or false to cancel
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    var result = settings;
    result.data = dialplanApplicationModify.$formObj.form('get values'); // Add application logic from ACE editor (not sanitized)

    result.data.applicationlogic = dialplanApplicationModify.editor.getValue(); // Pass current active tab for redirect

    result.data.currentTab = dialplanApplicationModify.currentActiveTab; // Additional client-side validation

    if (!DialplanApplicationsAPI.validateApplicationData(result.data)) {
      UserMessage.showError('Validation failed');
      return false;
    }

    return result;
  },

  /**
   * Callback after form submission (no success messages - UI updates only)
   * 
   * @param {object} response - Server response
   */
  cbAfterSendForm: function cbAfterSendForm(response) {
    if (response.result) {
      if (response.data) {
        // Data is already sanitized in API module
        dialplanApplicationModify.populateForm(response.data); // Update extension number display in the ribbon label

        dialplanApplicationModify.updateExtensionDisplay(response.data.extension); // Update ACE editor content

        var codeContent = response.data.applicationlogic || '';
        dialplanApplicationModify.editor.getSession().setValue(codeContent); // Handle redirect with tab preservation

        if (response.data.redirectTab && response.data.redirectTab !== 'main') {
          // Update Form.js redirect URL to include hash
          var currentId = $('#id').val() || response.data.uniqid;

          if (currentId) {
            Form.afterSubmitModifyUrl = globalRootUrl + 'dialplan-applications/modify/' + currentId + '#/' + response.data.redirectTab;
          }
        }
      } // Update URL for new records 


      var currentId = $('#id').val();

      if (!currentId && response.data && response.data.uniqid) {
        var hash = response.data.redirectTab && response.data.redirectTab !== 'main' ? '#/' + response.data.redirectTab : '';
        var newUrl = window.location.href.replace(/modify\/?$/, 'modify/' + response.data.uniqid) + hash;
        window.history.pushState(null, '', newUrl);
      } // No success message - just silent update

    }
  },

  /**
   * Populate form with sanitized data
   * 
   * @param {object} data - Form data
   */
  populateForm: function populateForm(data) {
    Form.$formObj.form('set values', data);

    if (Form.enableDirrity) {
      Form.saveInitialValues();
    }
  }
};
/**
 * Custom validation rule for extension existence
 */

$.fn.form.settings.rules.existRule = function (value, parameter) {
  return $('#' + parameter).hasClass('hidden');
};
/**
 * Initialize on document ready
 */


$(document).ready(function () {
  dialplanApplicationModify.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9EaWFscGxhbkFwcGxpY2F0aW9ucy9kaWFscGxhbi1hcHBsaWNhdGlvbnMtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbImRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkiLCIkZm9ybU9iaiIsIiQiLCIkbnVtYmVyIiwiJHR5cGVTZWxlY3REcm9wRG93biIsIiR0YWJNZW51SXRlbXMiLCJkZWZhdWx0RXh0ZW5zaW9uIiwiZWRpdG9yIiwiY3VycmVudEFjdGl2ZVRhYiIsInZhbGlkYXRlUnVsZXMiLCJuYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImRhX1ZhbGlkYXRlTmFtZUlzRW1wdHkiLCJkYV9WYWxpZGF0ZU5hbWVUb29Mb25nIiwiZXh0ZW5zaW9uIiwidmFsdWUiLCJkYV9WYWxpZGF0ZUV4dGVuc2lvbk51bWJlciIsImRhX1ZhbGlkYXRlRXh0ZW5zaW9uSXNFbXB0eSIsImRhX1ZhbGlkYXRlRXh0ZW5zaW9uRG91YmxlIiwidXBkYXRlRXh0ZW5zaW9uRGlzcGxheSIsImV4dGVuc2lvbkRpc3BsYXkiLCJ0ZXh0IiwiaW5pdGlhbGl6ZSIsInRhYiIsImhpc3RvcnkiLCJoaXN0b3J5VHlwZSIsIm9uVmlzaWJsZSIsInRhYlBhdGgiLCJzZXRUaW1lb3V0IiwicmVzaXplIiwiZHJvcGRvd24iLCJvbkNoYW5nZSIsImNoYW5nZUFjZU1vZGUiLCJ0aW1lb3V0SWQiLCJvbiIsImNsZWFyVGltZW91dCIsIm5ld051bWJlciIsImZvcm0iLCJFeHRlbnNpb25zIiwiY2hlY2tBdmFpbGFiaWxpdHkiLCJGb3JtIiwidXJsIiwiY2JCZWZvcmVTZW5kRm9ybSIsImNiQWZ0ZXJTZW5kRm9ybSIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsIkRpYWxwbGFuQXBwbGljYXRpb25zQVBJIiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJpbml0aWFsaXplQWRhcHRpdmVUZXh0YXJlYSIsImluaXRpYWxpemVBY2UiLCJpbml0aWFsaXplRnVsbHNjcmVlbkhhbmRsZXJzIiwiaW5pdGlhbGl6ZUZvcm0iLCJhdXRvUmVzaXplVGV4dEFyZWEiLCJyZWNvcmRJZCIsImdldFJlY29yZElkIiwiZ2V0UmVjb3JkIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJwb3B1bGF0ZUZvcm0iLCJkYXRhIiwiY29kZUNvbnRlbnQiLCJhcHBsaWNhdGlvbmxvZ2ljIiwiZ2V0U2Vzc2lvbiIsInNldFZhbHVlIiwid2luZG93IiwibG9jYXRpb24iLCJoYXNoIiwiZXJyb3JNZXNzYWdlIiwibWVzc2FnZXMiLCJlcnJvciIsImpvaW4iLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIlNlY3VyaXR5VXRpbHMiLCJlc2NhcGVIdG1sIiwidXJsUGFydHMiLCJwYXRobmFtZSIsInNwbGl0IiwibW9kaWZ5SW5kZXgiLCJpbmRleE9mIiwiYWNlSGVpZ2h0IiwiaW5uZXJIZWlnaHQiLCJyb3dzQ291bnQiLCJNYXRoIiwicm91bmQiLCJjc3MiLCJhY2UiLCJlZGl0Iiwic2V0VGhlbWUiLCJkYXRhQ2hhbmdlZCIsInNldE9wdGlvbnMiLCJtYXhMaW5lcyIsInNob3dQcmludE1hcmdpbiIsInNob3dMaW5lTnVtYmVycyIsImNvbW1hbmRzIiwiYWRkQ29tbWFuZCIsImJpbmRLZXkiLCJ3aW4iLCJtYWMiLCJleGVjIiwiY29uc29sZSIsIndhcm4iLCJjb250YWluZXIiLCJzaWJsaW5ncyIsInRvZ2dsZUZ1bGxTY3JlZW4iLCJkb2N1bWVudCIsImFkZEV2ZW50TGlzdGVuZXIiLCJhZGp1c3RFZGl0b3JIZWlnaHQiLCJjbGVhbnVwIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsIm9mZiIsImRlc3Ryb3kiLCJmdWxsc2NyZWVuRWxlbWVudCIsInJlcXVlc3RGdWxsc2NyZWVuIiwiZXJyIiwibWVzc2FnZSIsImV4aXRGdWxsc2NyZWVuIiwibW9kZSIsIk5ld01vZGUiLCJyZXF1aXJlIiwiTW9kZSIsInNlc3Npb24iLCJzZXRNb2RlIiwic2V0dGluZ3MiLCJnZXRWYWx1ZSIsImN1cnJlbnRUYWIiLCJ2YWxpZGF0ZUFwcGxpY2F0aW9uRGF0YSIsInJlZGlyZWN0VGFiIiwiY3VycmVudElkIiwidmFsIiwidW5pcWlkIiwibmV3VXJsIiwiaHJlZiIsInJlcGxhY2UiLCJwdXNoU3RhdGUiLCJlbmFibGVEaXJyaXR5Iiwic2F2ZUluaXRpYWxWYWx1ZXMiLCJmbiIsImV4aXN0UnVsZSIsInBhcmFtZXRlciIsImhhc0NsYXNzIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsSUFBSUEseUJBQXlCLEdBQUc7QUFDNUJDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLDRCQUFELENBRGlCO0FBRTVCQyxFQUFBQSxPQUFPLEVBQUVELENBQUMsQ0FBQyxZQUFELENBRmtCO0FBRzVCRSxFQUFBQSxtQkFBbUIsRUFBRUYsQ0FBQyxDQUFDLHlDQUFELENBSE07QUFJNUJHLEVBQUFBLGFBQWEsRUFBRUgsQ0FBQyxDQUFDLDhCQUFELENBSlk7QUFLNUJJLEVBQUFBLGdCQUFnQixFQUFFLEVBTFU7QUFNNUJDLEVBQUFBLE1BQU0sRUFBRSxJQU5vQjtBQU81QkMsRUFBQUEsZ0JBQWdCLEVBQUUsTUFQVTtBQU9GOztBQUUxQjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLElBQUksRUFBRTtBQUNGQyxNQUFBQSxVQUFVLEVBQUUsTUFEVjtBQUVGQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsT0FEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0M7QUFGNUIsT0FERyxFQUtIO0FBQ0lILFFBQUFBLElBQUksRUFBRSxlQURWO0FBRUlDLFFBQUFBLE1BQU0sRUFBRUMsZUFBZSxDQUFDRSxzQkFBaEIsSUFBMEM7QUFGdEQsT0FMRztB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QyxJQUFULEVBQWU7QUFDekJ2QixJQUFBQSxJQUFJLENBQUMzQyxRQUFMLENBQWN3QyxJQUFkLENBQW1CLFlBQW5CLEVBQWlDMEIsSUFBakM7O0FBQ0EsUUFBSXZCLElBQUksQ0FBQ21HLGFBQVQsRUFBd0I7QUFDcEJuRyxNQUFBQSxJQUFJLENBQUNvRyxpQkFBTDtBQUNIO0FBQ0o7QUFsWDJCLENBQWhDO0FBcVhBO0FBQ0E7QUFDQTs7QUFDQTlJLENBQUMsQ0FBQytJLEVBQUYsQ0FBS3hHLElBQUwsQ0FBVTBGLFFBQVYsQ0FBbUJ2SCxLQUFuQixDQUF5QnNJLFNBQXpCLEdBQXFDLFVBQVMvSCxLQUFULEVBQWdCZ0ksU0FBaEIsRUFBMkI7QUFDNUQsU0FBT2pKLENBQUMsQ0FBQyxNQUFNaUosU0FBUCxDQUFELENBQW1CQyxRQUFuQixDQUE0QixRQUE1QixDQUFQO0FBQ0gsQ0FGRDtBQUlBO0FBQ0E7QUFDQTs7O0FBQ0FsSixDQUFDLENBQUMrRyxRQUFELENBQUQsQ0FBWW9DLEtBQVosQ0FBa0IsWUFBVztBQUN6QnJKLEVBQUFBLHlCQUF5QixDQUFDMEIsVUFBMUI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICovXG5cbi8qIGdsb2JhbCBEaWFscGxhbkFwcGxpY2F0aW9uc0FQSSwgRm9ybSwgU2VjdXJpdHlVdGlscywgZ2xvYmFsVHJhbnNsYXRlLCBFeHRlbnNpb25zLCBhY2UsIFVzZXJNZXNzYWdlICovXG5cbi8qKlxuICogRGlhbHBsYW4gYXBwbGljYXRpb24gZWRpdCBmb3JtIG1hbmFnZW1lbnQgbW9kdWxlIHdpdGggZW5oYW5jZWQgc2VjdXJpdHlcbiAqL1xudmFyIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkgPSB7XG4gICAgJGZvcm1PYmo6ICQoJyNkaWFscGxhbi1hcHBsaWNhdGlvbi1mb3JtJyksXG4gICAgJG51bWJlcjogJCgnI2V4dGVuc2lvbicpLFxuICAgICR0eXBlU2VsZWN0RHJvcERvd246ICQoJyNkaWFscGxhbi1hcHBsaWNhdGlvbi1mb3JtIC50eXBlLXNlbGVjdCcpLFxuICAgICR0YWJNZW51SXRlbXM6ICQoJyNhcHBsaWNhdGlvbi1jb2RlLW1lbnUgLml0ZW0nKSxcbiAgICBkZWZhdWx0RXh0ZW5zaW9uOiAnJyxcbiAgICBlZGl0b3I6IG51bGwsXG4gICAgY3VycmVudEFjdGl2ZVRhYjogJ21haW4nLCAvLyBUcmFjayBjdXJyZW50IGFjdGl2ZSB0YWJcbiAgICBcbiAgICAvKipcbiAgICAgKiBGb3JtIHZhbGlkYXRpb24gcnVsZXNcbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIG5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICduYW1lJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5kYV9WYWxpZGF0ZU5hbWVJc0VtcHR5XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdtYXhMZW5ndGhbNTBdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZGFfVmFsaWRhdGVOYW1lVG9vTG9uZyB8fCAnTmFtZSBpcyB0b28gbG9uZyAobWF4IDUwIGNoYXJhY3RlcnMpJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgZXh0ZW5zaW9uOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZXh0ZW5zaW9uJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICcvXlswLTkjK1xcXFwqfFhdezEsNjR9JC8nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5kYV9WYWxpZGF0ZUV4dGVuc2lvbk51bWJlcixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZGFfVmFsaWRhdGVFeHRlbnNpb25Jc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXhpc3RSdWxlW2V4dGVuc2lvbi1lcnJvcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5kYV9WYWxpZGF0ZUV4dGVuc2lvbkRvdWJsZSxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGV4dGVuc2lvbiBkaXNwbGF5IGluIHJpYmJvbiBsYWJlbFxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBleHRlbnNpb24gLSBFeHRlbnNpb24gbnVtYmVyXG4gICAgICovXG4gICAgdXBkYXRlRXh0ZW5zaW9uRGlzcGxheTogZnVuY3Rpb24oZXh0ZW5zaW9uKSB7XG4gICAgICAgIHZhciBleHRlbnNpb25EaXNwbGF5ID0gJCgnI2V4dGVuc2lvbi1kaXNwbGF5Jyk7XG4gICAgICAgIGV4dGVuc2lvbkRpc3BsYXkudGV4dChleHRlbnNpb24gfHwgJycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBtb2R1bGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gRW5hYmxlIHRhYiBuYXZpZ2F0aW9uIHdpdGggaGlzdG9yeSBzdXBwb3J0XG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuJHRhYk1lbnVJdGVtcy50YWIoe1xuICAgICAgICAgICAgaGlzdG9yeTogdHJ1ZSxcbiAgICAgICAgICAgIGhpc3RvcnlUeXBlOiAnaGFzaCcsXG4gICAgICAgICAgICBvblZpc2libGU6IGZ1bmN0aW9uKHRhYlBhdGgpIHtcbiAgICAgICAgICAgICAgICAvLyBUcmFjayBjdXJyZW50IGFjdGl2ZSB0YWJcbiAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmN1cnJlbnRBY3RpdmVUYWIgPSB0YWJQYXRoO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlc2l6ZSBBQ0UgZWRpdG9yIHdoZW4gY29kZSB0YWIgYmVjb21lcyB2aXNpYmxlXG4gICAgICAgICAgICAgICAgaWYgKHRhYlBhdGggPT09ICdjb2RlJyAmJiBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvcikge1xuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLnJlc2l6ZSgpO1xuICAgICAgICAgICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuJHR5cGVTZWxlY3REcm9wRG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5jaGFuZ2VBY2VNb2RlXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gRXh0ZW5zaW9uIGF2YWlsYWJpbGl0eSBjaGVja1xuICAgICAgICB2YXIgdGltZW91dElkO1xuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LiRudW1iZXIub24oJ2lucHV0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAodGltZW91dElkKSBjbGVhclRpbWVvdXQodGltZW91dElkKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgbmV3TnVtYmVyID0gZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZXh0ZW5zaW9uJyk7XG4gICAgICAgICAgICAgICAgRXh0ZW5zaW9ucy5jaGVja0F2YWlsYWJpbGl0eShkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmRlZmF1bHRFeHRlbnNpb24sIG5ld051bWJlcik7XG4gICAgICAgICAgICB9LCA1MDApO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyZSBGb3JtLmpzIGZvciBSRVNUIEFQSVxuICAgICAgICBGb3JtLiRmb3JtT2JqID0gZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5jYkFmdGVyU2VuZEZvcm07XG4gICAgICAgIFxuICAgICAgICAvLyBSRVNUIEFQSSBpbnRlZ3JhdGlvblxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IERpYWxwbGFuQXBwbGljYXRpb25zQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZVJlY29yZCc7XG4gICAgICAgIFxuICAgICAgICAvLyBOYXZpZ2F0aW9uIFVSTHNcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gZ2xvYmFsUm9vdFVybCArICdkaWFscGxhbi1hcHBsaWNhdGlvbnMvaW5kZXgvJztcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGdsb2JhbFJvb3RVcmwgKyAnZGlhbHBsYW4tYXBwbGljYXRpb25zL21vZGlmeS8nO1xuICAgICAgICBcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGFkYXB0aXZlIHRleHRhcmVhIGZvciBkZXNjcmlwdGlvbiBmaWVsZFxuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmluaXRpYWxpemVBZGFwdGl2ZVRleHRhcmVhKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGNvbXBvbmVudHNcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5pbml0aWFsaXplQWNlKCk7XG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuaW5pdGlhbGl6ZUZ1bGxzY3JlZW5IYW5kbGVycygpO1xuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmluaXRpYWxpemVGb3JtKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYWRhcHRpdmUgdGV4dGFyZWEgZm9yIGRlc2NyaXB0aW9uIGZpZWxkXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUFkYXB0aXZlVGV4dGFyZWE6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBTZXQgdXAgYWRhcHRpdmUgcmVzaXppbmcgZm9yIGRlc2NyaXB0aW9uIHRleHRhcmVhXG4gICAgICAgICQoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpLm9uKCdpbnB1dCBwYXN0ZSBrZXl1cCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgRm9ybS5hdXRvUmVzaXplVGV4dEFyZWEoJCh0aGlzKSk7IC8vIFVzZSBkeW5hbWljIHdpZHRoIGNhbGN1bGF0aW9uXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbCByZXNpemUgYWZ0ZXIgZm9ybSBkYXRhIGlzIGxvYWRlZFxuICAgICAgICBGb3JtLmF1dG9SZXNpemVUZXh0QXJlYSgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJyk7IC8vIFVzZSBkeW5hbWljIHdpZHRoIGNhbGN1bGF0aW9uXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgZm9ybSBkYXRhIHZpYSBSRVNUIEFQSVxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHJlY29yZElkID0gZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5nZXRSZWNvcmRJZCgpO1xuICAgICAgICBcbiAgICAgICAgRGlhbHBsYW5BcHBsaWNhdGlvbnNBUEkuZ2V0UmVjb3JkKHJlY29yZElkLCBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vIERhdGEgaXMgYWxyZWFkeSBzYW5pdGl6ZWQgaW4gQVBJIG1vZHVsZVxuICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZGVmYXVsdEV4dGVuc2lvbiA9IHJlc3BvbnNlLmRhdGEuZXh0ZW5zaW9uO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBleHRlbnNpb24gbnVtYmVyIGRpc3BsYXkgaW4gdGhlIHJpYmJvbiBsYWJlbFxuICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkudXBkYXRlRXh0ZW5zaW9uRGlzcGxheShyZXNwb25zZS5kYXRhLmV4dGVuc2lvbik7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2V0IEFDRSBlZGl0b3IgY29udGVudCAoYXBwbGljYXRpb25sb2dpYyBpcyBub3Qgc2FuaXRpemVkKVxuICAgICAgICAgICAgICAgIHZhciBjb2RlQ29udGVudCA9IHJlc3BvbnNlLmRhdGEuYXBwbGljYXRpb25sb2dpYyB8fCAnJztcbiAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5nZXRTZXNzaW9uKCkuc2V0VmFsdWUoY29kZUNvbnRlbnQpO1xuICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuY2hhbmdlQWNlTW9kZSgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFN3aXRjaCB0byBtYWluIHRhYiBvbmx5IGZvciBjb21wbGV0ZWx5IG5ldyByZWNvcmRzIChubyBuYW1lIGFuZCBubyBleHRlbnNpb24pXG4gICAgICAgICAgICAgICAgLy8gSGFzaCBoaXN0b3J5IHdpbGwgcHJlc2VydmUgdGhlIHRhYiBmb3IgZXhpc3RpbmcgcmVjb3Jkc1xuICAgICAgICAgICAgICAgIGlmICghcmVzcG9uc2UuZGF0YS5uYW1lICYmICFyZXNwb25zZS5kYXRhLmV4dGVuc2lvbiAmJiAhd2luZG93LmxvY2F0aW9uLmhhc2gpIHtcbiAgICAgICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS4kdGFiTWVudUl0ZW1zLnRhYignY2hhbmdlIHRhYicsICdtYWluJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEF1dG8tcmVzaXplIHRleHRhcmVhIGFmdGVyIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgICAgICAgICAgRm9ybS5hdXRvUmVzaXplVGV4dEFyZWEoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICB2YXIgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXMgJiYgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3IgPyBcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3Iuam9pbignLCAnKSA6IFxuICAgICAgICAgICAgICAgICAgICAnRmFpbGVkIHRvIGxvYWQgZGlhbHBsYW4gYXBwbGljYXRpb24gZGF0YSc7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChlcnJvck1lc3NhZ2UpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgcmVjb3JkIElEIGZyb20gVVJMXG4gICAgICogXG4gICAgICogQHJldHVybiB7c3RyaW5nfSBSZWNvcmQgSURcbiAgICAgKi9cbiAgICBnZXRSZWNvcmRJZDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB1cmxQYXJ0cyA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zcGxpdCgnLycpO1xuICAgICAgICB2YXIgbW9kaWZ5SW5kZXggPSB1cmxQYXJ0cy5pbmRleE9mKCdtb2RpZnknKTtcbiAgICAgICAgaWYgKG1vZGlmeUluZGV4ICE9PSAtMSAmJiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdKSB7XG4gICAgICAgICAgICByZXR1cm4gdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIEFDRSBlZGl0b3Igd2l0aCBzZWN1cml0eSBjb25zaWRlcmF0aW9uc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVBY2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gMzgwO1xuICAgICAgICB2YXIgcm93c0NvdW50ID0gTWF0aC5yb3VuZChhY2VIZWlnaHQgLyAxNi4zKTtcbiAgICAgICAgXG4gICAgICAgICQod2luZG93KS5vbignbG9hZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICQoJy5hcHBsaWNhdGlvbi1jb2RlJykuY3NzKCdtaW4taGVpZ2h0JywgYWNlSGVpZ2h0ICsgJ3B4Jyk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IgPSBhY2UuZWRpdCgnYXBwbGljYXRpb24tY29kZScpO1xuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5zZXRUaGVtZSgnYWNlL3RoZW1lL21vbm9rYWknKTtcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IucmVzaXplKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBUcmFjayBjaGFuZ2VzIGZvciBGb3JtLmpzXG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLmdldFNlc3Npb24oKS5vbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3Iuc2V0T3B0aW9ucyh7XG4gICAgICAgICAgICBtYXhMaW5lczogcm93c0NvdW50LFxuICAgICAgICAgICAgc2hvd1ByaW50TWFyZ2luOiBmYWxzZSxcbiAgICAgICAgICAgIHNob3dMaW5lTnVtYmVyczogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZWN1cml0eTogcHJldmVudCBjb2RlIGV4ZWN1dGlvbiBpbiBlZGl0b3JcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IuY29tbWFuZHMuYWRkQ29tbWFuZCh7XG4gICAgICAgICAgICBuYW1lOiAncHJldmVudENvZGVFeGVjdXRpb24nLFxuICAgICAgICAgICAgYmluZEtleToge3dpbjogJ0N0cmwtRScsIG1hYzogJ0NvbW1hbmQtRSd9LFxuICAgICAgICAgICAgZXhlYzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdDb2RlIGV4ZWN1dGlvbiBwcmV2ZW50ZWQgZm9yIHNlY3VyaXR5Jyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZnVsbHNjcmVlbiBoYW5kbGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGdWxsc2NyZWVuSGFuZGxlcnM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAkKCcuZnVsbHNjcmVlbi10b2dnbGUtYnRuJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGNvbnRhaW5lciA9ICQodGhpcykuc2libGluZ3MoJy5hcHBsaWNhdGlvbi1jb2RlJylbMF07XG4gICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LnRvZ2dsZUZ1bGxTY3JlZW4oY29udGFpbmVyKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignZnVsbHNjcmVlbmNoYW5nZScsIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuYWRqdXN0RWRpdG9ySGVpZ2h0KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xlYW51cCBldmVudCBsaXN0ZW5lcnMgdG8gcHJldmVudCBtZW1vcnkgbGVha3NcbiAgICAgKi9cbiAgICBjbGVhbnVwOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gUmVtb3ZlIGZ1bGxzY3JlZW4gZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignZnVsbHNjcmVlbmNoYW5nZScsIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuYWRqdXN0RWRpdG9ySGVpZ2h0KTtcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFudXAgb3RoZXIgZXZlbnQgbGlzdGVuZXJzIGlmIG5lZWRlZFxuICAgICAgICAkKHdpbmRvdykub2ZmKCdsb2FkJyk7XG4gICAgICAgICQoJy5mdWxsc2NyZWVuLXRvZ2dsZS1idG4nKS5vZmYoJ2NsaWNrJyk7XG4gICAgICAgICQoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpLm9mZignaW5wdXQgcGFzdGUga2V5dXAnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFudXAgQUNFIGVkaXRvclxuICAgICAgICBpZiAoZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IpIHtcbiAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLmRlc3Ryb3koKTtcbiAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIGZ1bGxzY3JlZW4gbW9kZVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGNvbnRhaW5lciAtIENvbnRhaW5lciBlbGVtZW50XG4gICAgICovXG4gICAgdG9nZ2xlRnVsbFNjcmVlbjogZnVuY3Rpb24oY29udGFpbmVyKSB7XG4gICAgICAgIGlmICghZG9jdW1lbnQuZnVsbHNjcmVlbkVsZW1lbnQpIHtcbiAgICAgICAgICAgIGNvbnRhaW5lci5yZXF1ZXN0RnVsbHNjcmVlbigpLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGF0dGVtcHRpbmcgdG8gZW5hYmxlIGZ1bGwtc2NyZWVuIG1vZGU6ICcgKyBlcnIubWVzc2FnZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRvY3VtZW50LmV4aXRGdWxsc2NyZWVuKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRqdXN0IGVkaXRvciBoZWlnaHQgb24gZnVsbHNjcmVlbiBjaGFuZ2VcbiAgICAgKi9cbiAgICBhZGp1c3RFZGl0b3JIZWlnaHQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5yZXNpemUoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENoYW5nZSBBQ0UgZWRpdG9yIG1vZGUgYmFzZWQgb24gdHlwZVxuICAgICAqL1xuICAgIGNoYW5nZUFjZU1vZGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbW9kZSA9IGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3R5cGUnKTtcbiAgICAgICAgdmFyIE5ld01vZGU7XG5cbiAgICAgICAgaWYgKG1vZGUgPT09ICdwaHAnKSB7XG4gICAgICAgICAgICBOZXdNb2RlID0gYWNlLnJlcXVpcmUoJ2FjZS9tb2RlL3BocCcpLk1vZGU7XG4gICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5zZXRPcHRpb25zKHtcbiAgICAgICAgICAgICAgICBzaG93TGluZU51bWJlcnM6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgTmV3TW9kZSA9IGFjZS5yZXF1aXJlKCdhY2UvbW9kZS9qdWxpYScpLk1vZGU7XG4gICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5zZXRPcHRpb25zKHtcbiAgICAgICAgICAgICAgICBzaG93TGluZU51bWJlcnM6IGZhbHNlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLnNlc3Npb24uc2V0TW9kZShuZXcgTmV3TW9kZSgpKTtcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3Iuc2V0VGhlbWUoJ2FjZS90aGVtZS9tb25va2FpJyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgZm9ybSBzdWJtaXNzaW9uXG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNldHRpbmdzIC0gRm9ybSBzZXR0aW5nc1xuICAgICAqIEByZXR1cm4ge29iamVjdHxmYWxzZX0gTW9kaWZpZWQgc2V0dGluZ3Mgb3IgZmFsc2UgdG8gY2FuY2VsXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybTogZnVuY3Rpb24oc2V0dGluZ3MpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGFwcGxpY2F0aW9uIGxvZ2ljIGZyb20gQUNFIGVkaXRvciAobm90IHNhbml0aXplZClcbiAgICAgICAgcmVzdWx0LmRhdGEuYXBwbGljYXRpb25sb2dpYyA9IGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLmdldFZhbHVlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBQYXNzIGN1cnJlbnQgYWN0aXZlIHRhYiBmb3IgcmVkaXJlY3RcbiAgICAgICAgcmVzdWx0LmRhdGEuY3VycmVudFRhYiA9IGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuY3VycmVudEFjdGl2ZVRhYjtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZGl0aW9uYWwgY2xpZW50LXNpZGUgdmFsaWRhdGlvblxuICAgICAgICBpZiAoIURpYWxwbGFuQXBwbGljYXRpb25zQVBJLnZhbGlkYXRlQXBwbGljYXRpb25EYXRhKHJlc3VsdC5kYXRhKSkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKCdWYWxpZGF0aW9uIGZhaWxlZCcpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uIChubyBzdWNjZXNzIG1lc3NhZ2VzIC0gVUkgdXBkYXRlcyBvbmx5KVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFNlcnZlciByZXNwb25zZVxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybTogZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBEYXRhIGlzIGFscmVhZHkgc2FuaXRpemVkIGluIEFQSSBtb2R1bGVcbiAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgZXh0ZW5zaW9uIG51bWJlciBkaXNwbGF5IGluIHRoZSByaWJib24gbGFiZWxcbiAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LnVwZGF0ZUV4dGVuc2lvbkRpc3BsYXkocmVzcG9uc2UuZGF0YS5leHRlbnNpb24pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBBQ0UgZWRpdG9yIGNvbnRlbnRcbiAgICAgICAgICAgICAgICB2YXIgY29kZUNvbnRlbnQgPSByZXNwb25zZS5kYXRhLmFwcGxpY2F0aW9ubG9naWMgfHwgJyc7XG4gICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IuZ2V0U2Vzc2lvbigpLnNldFZhbHVlKGNvZGVDb250ZW50KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgcmVkaXJlY3Qgd2l0aCB0YWIgcHJlc2VydmF0aW9uXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEucmVkaXJlY3RUYWIgJiYgcmVzcG9uc2UuZGF0YS5yZWRpcmVjdFRhYiAhPT0gJ21haW4nKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBGb3JtLmpzIHJlZGlyZWN0IFVSTCB0byBpbmNsdWRlIGhhc2hcbiAgICAgICAgICAgICAgICAgICAgdmFyIGN1cnJlbnRJZCA9ICQoJyNpZCcpLnZhbCgpIHx8IHJlc3BvbnNlLmRhdGEudW5pcWlkO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY3VycmVudElkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gZ2xvYmFsUm9vdFVybCArICdkaWFscGxhbi1hcHBsaWNhdGlvbnMvbW9kaWZ5LycgKyBjdXJyZW50SWQgKyAnIy8nICsgcmVzcG9uc2UuZGF0YS5yZWRpcmVjdFRhYjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIFVSTCBmb3IgbmV3IHJlY29yZHMgXG4gICAgICAgICAgICB2YXIgY3VycmVudElkID0gJCgnI2lkJykudmFsKCk7XG4gICAgICAgICAgICBpZiAoIWN1cnJlbnRJZCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEudW5pcWlkKSB7XG4gICAgICAgICAgICAgICAgdmFyIGhhc2ggPSByZXNwb25zZS5kYXRhLnJlZGlyZWN0VGFiICYmIHJlc3BvbnNlLmRhdGEucmVkaXJlY3RUYWIgIT09ICdtYWluJyA/ICcjLycgKyByZXNwb25zZS5kYXRhLnJlZGlyZWN0VGFiIDogJyc7XG4gICAgICAgICAgICAgICAgdmFyIG5ld1VybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmLnJlcGxhY2UoL21vZGlmeVxcLz8kLywgJ21vZGlmeS8nICsgcmVzcG9uc2UuZGF0YS51bmlxaWQpICsgaGFzaDtcbiAgICAgICAgICAgICAgICB3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUobnVsbCwgJycsIG5ld1VybCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIE5vIHN1Y2Nlc3MgbWVzc2FnZSAtIGp1c3Qgc2lsZW50IHVwZGF0ZVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggc2FuaXRpemVkIGRhdGFcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIEZvcm0gZGF0YVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybTogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZXMnLCBkYXRhKTtcbiAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgRm9ybS5zYXZlSW5pdGlhbFZhbHVlcygpO1xuICAgICAgICB9XG4gICAgfVxufTtcblxuLyoqXG4gKiBDdXN0b20gdmFsaWRhdGlvbiBydWxlIGZvciBleHRlbnNpb24gZXhpc3RlbmNlXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leGlzdFJ1bGUgPSBmdW5jdGlvbih2YWx1ZSwgcGFyYW1ldGVyKSB7IFxuICAgIHJldHVybiAkKCcjJyArIHBhcmFtZXRlcikuaGFzQ2xhc3MoJ2hpZGRlbicpOyBcbn07XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbigpIHtcbiAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=