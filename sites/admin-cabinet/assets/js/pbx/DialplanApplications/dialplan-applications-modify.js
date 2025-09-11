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
  $tabMenuItems: $('#application-code-menu .item'),
  defaultExtension: '',
  editor: null,
  currentActiveTab: 'main',
  // Track current active tab
  isLoadingData: false,
  // Flag to prevent button reactivation during data loading

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
      FormElements.optimizeTextareaSize($(this));
    }); // Initial resize after form data is loaded

    FormElements.optimizeTextareaSize('textarea[name="description"]');
  },

  /**
   * Load form data via REST API
   */
  initializeForm: function initializeForm() {
    var recordId = dialplanApplicationModify.getRecordId();
    var copyFromId = $('#copy-from-id').val();
    var urlParams = new URLSearchParams(window.location.search);
    var copyParam = urlParams.get('copy');
    var isCopyMode = false; // Check for copy mode from URL parameter or hidden field

    if (copyParam || copyFromId) {
      recordId = 'copy-' + (copyParam || copyFromId);
      isCopyMode = true;
    } // Always call REST API to get data (including defaults for new records)


    DialplanApplicationsAPI.getRecord(recordId, function (response) {
      if (response.result) {
        // Data is already sanitized in API module
        dialplanApplicationModify.populateForm(response.data);
        dialplanApplicationModify.defaultExtension = response.data.extension; // Update extension number display in the ribbon label

        dialplanApplicationModify.updateExtensionDisplay(response.data.extension); // Set ACE editor content (applicationlogic is not sanitized)

        var codeContent = response.data.applicationlogic || ''; // Set flag to prevent reactivating buttons during data load

        dialplanApplicationModify.isLoadingData = true;
        dialplanApplicationModify.editor.getSession().setValue(codeContent);
        dialplanApplicationModify.changeAceMode(); // Clear loading flag after setting content

        dialplanApplicationModify.isLoadingData = false; // Switch to main tab only for completely new records (no name and no extension)
        // Hash history will preserve the tab for existing records

        if (!response.data.name && !response.data.extension && !window.location.hash) {
          dialplanApplicationModify.$tabMenuItems.tab('change tab', 'main');
        } // Mark form as changed if in copy mode to enable save button


        if (isCopyMode) {
          Form.dataChanged();
        } // Auto-resize textarea after data is loaded (with small delay for DOM update)


        setTimeout(function () {
          FormElements.optimizeTextareaSize('textarea[name="description"]');
        }, 100);
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
      // Ignore changes during data loading to prevent reactivating buttons
      if (!dialplanApplicationModify.isLoadingData) {
        Form.dataChanged();
      }
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
  changeAceMode: function changeAceMode(value, text, $choice) {
    // Get mode value - can be passed as parameter or from hidden input
    var mode = value || $('#type').val();
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
    // Use unified silent population approach
    Form.populateFormSilently(data, {
      beforePopulate: function beforePopulate(formData) {
        // Initialize dropdown if not already done
        if (!$('#type-dropdown').length) {
          DynamicDropdownBuilder.buildDropdown('type', formData, {
            staticOptions: [{
              value: 'php',
              text: globalTranslate.da_TypePhp
            }, {
              value: 'plaintext',
              text: globalTranslate.da_TypePlaintext
            }],
            placeholder: globalTranslate.da_SelectType,
            onChange: dialplanApplicationModify.changeAceMode
          });
        }
      },
      afterPopulate: function afterPopulate(formData) {
        if (Form.enableDirrity) {
          Form.initializeDirrity();
        } // Auto-resize textarea after data is populated


        FormElements.optimizeTextareaSize('textarea[name="description"]');
      }
    });
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9EaWFscGxhbkFwcGxpY2F0aW9ucy9kaWFscGxhbi1hcHBsaWNhdGlvbnMtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbImRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkiLCIkZm9ybU9iaiIsIiQiLCIkbnVtYmVyIiwiJHRhYk1lbnVJdGVtcyIsImRlZmF1bHRFeHRlbnNpb24iLCJlZGl0b3IiLCJjdXJyZW50QWN0aXZlVGFiIiwiaXNMb2FkaW5nRGF0YSIsInZhbGlkYXRlUnVsZXMiLCJuYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImRhX1ZhbGlkYXRlTmFtZUlzRW1wdHkiLCJkYV9WYWxpZGF0ZU5hbWVUb29Mb25nIiwiZXh0ZW5zaW9uIiwidmFsdWUiLCJkYV9WYWxpZGF0ZUV4dGVuc2lvbk51bWJlciIsImRhX1ZhbGlkYXRlRXh0ZW5zaW9uSXNFbXB0eSIsImRhX1ZhbGlkYXRlRXh0ZW5zaW9uRG91YmxlIiwidXBkYXRlRXh0ZW5zaW9uRGlzcGxheSIsImV4dGVuc2lvbkRpc3BsYXkiLCJ0ZXh0IiwiaW5pdGlhbGl6ZSIsInRhYiIsImhpc3RvcnkiLCJoaXN0b3J5VHlwZSIsIm9uVmlzaWJsZSIsInRhYlBhdGgiLCJzZXRUaW1lb3V0IiwicmVzaXplIiwidGltZW91dElkIiwib24iLCJjbGVhclRpbWVvdXQiLCJuZXdOdW1iZXIiLCJmb3JtIiwiRXh0ZW5zaW9ucyIsImNoZWNrQXZhaWxhYmlsaXR5IiwiRm9ybSIsInVybCIsImNiQmVmb3JlU2VuZEZvcm0iLCJjYkFmdGVyU2VuZEZvcm0iLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJEaWFscGxhbkFwcGxpY2F0aW9uc0FQSSIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwiaW5pdGlhbGl6ZUFkYXB0aXZlVGV4dGFyZWEiLCJpbml0aWFsaXplQWNlIiwiaW5pdGlhbGl6ZUZ1bGxzY3JlZW5IYW5kbGVycyIsImluaXRpYWxpemVGb3JtIiwiRm9ybUVsZW1lbnRzIiwib3B0aW1pemVUZXh0YXJlYVNpemUiLCJyZWNvcmRJZCIsImdldFJlY29yZElkIiwiY29weUZyb21JZCIsInZhbCIsInVybFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsIndpbmRvdyIsImxvY2F0aW9uIiwic2VhcmNoIiwiY29weVBhcmFtIiwiZ2V0IiwiaXNDb3B5TW9kZSIsImdldFJlY29yZCIsInJlc3BvbnNlIiwicmVzdWx0IiwicG9wdWxhdGVGb3JtIiwiZGF0YSIsImNvZGVDb250ZW50IiwiYXBwbGljYXRpb25sb2dpYyIsImdldFNlc3Npb24iLCJzZXRWYWx1ZSIsImNoYW5nZUFjZU1vZGUiLCJoYXNoIiwiZGF0YUNoYW5nZWQiLCJlcnJvck1lc3NhZ2UiLCJtZXNzYWdlcyIsImVycm9yIiwiam9pbiIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwiU2VjdXJpdHlVdGlscyIsImVzY2FwZUh0bWwiLCJ1cmxQYXJ0cyIsInBhdGhuYW1lIiwic3BsaXQiLCJtb2RpZnlJbmRleCIsImluZGV4T2YiLCJhY2VIZWlnaHQiLCJpbm5lckhlaWdodCIsInJvd3NDb3VudCIsIk1hdGgiLCJyb3VuZCIsImNzcyIsImFjZSIsImVkaXQiLCJzZXRUaGVtZSIsInNldE9wdGlvbnMiLCJtYXhMaW5lcyIsInNob3dQcmludE1hcmdpbiIsInNob3dMaW5lTnVtYmVycyIsImNvbW1hbmRzIiwiYWRkQ29tbWFuZCIsImJpbmRLZXkiLCJ3aW4iLCJtYWMiLCJleGVjIiwiY29uc29sZSIsIndhcm4iLCJjb250YWluZXIiLCJzaWJsaW5ncyIsInRvZ2dsZUZ1bGxTY3JlZW4iLCJkb2N1bWVudCIsImFkZEV2ZW50TGlzdGVuZXIiLCJhZGp1c3RFZGl0b3JIZWlnaHQiLCJjbGVhbnVwIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsIm9mZiIsImRlc3Ryb3kiLCJmdWxsc2NyZWVuRWxlbWVudCIsInJlcXVlc3RGdWxsc2NyZWVuIiwiZXJyIiwibWVzc2FnZSIsImV4aXRGdWxsc2NyZWVuIiwiJGNob2ljZSIsIm1vZGUiLCJOZXdNb2RlIiwicmVxdWlyZSIsIk1vZGUiLCJzZXNzaW9uIiwic2V0TW9kZSIsInNldHRpbmdzIiwiZ2V0VmFsdWUiLCJjdXJyZW50VGFiIiwidmFsaWRhdGVBcHBsaWNhdGlvbkRhdGEiLCJyZWRpcmVjdFRhYiIsImN1cnJlbnRJZCIsInVuaXFpZCIsIm5ld1VybCIsImhyZWYiLCJyZXBsYWNlIiwicHVzaFN0YXRlIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJiZWZvcmVQb3B1bGF0ZSIsImZvcm1EYXRhIiwibGVuZ3RoIiwiRHluYW1pY0Ryb3Bkb3duQnVpbGRlciIsImJ1aWxkRHJvcGRvd24iLCJzdGF0aWNPcHRpb25zIiwiZGFfVHlwZVBocCIsImRhX1R5cGVQbGFpbnRleHQiLCJwbGFjZWhvbGRlciIsImRhX1NlbGVjdFR5cGUiLCJvbkNoYW5nZSIsImFmdGVyUG9wdWxhdGUiLCJlbmFibGVEaXJyaXR5IiwiaW5pdGlhbGl6ZURpcnJpdHkiLCJmbiIsImV4aXN0UnVsZSIsInBhcmFtZXRlciIsImhhc0NsYXNzIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsSUFBSUEseUJBQXlCLEdBQUc7QUFDNUJDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLDRCQUFELENBRGlCO0FBRTVCQyxFQUFBQSxPQUFPLEVBQUVELENBQUMsQ0FBQyxZQUFELENBRmtCO0FBRzVCRSxFQUFBQSxhQUFhLEVBQUVGLENBQUMsQ0FBQyw4QkFBRCxDQUhZO0FBSTVCRyxFQUFBQSxnQkFBZ0IsRUFBRSxFQUpVO0FBSzVCQyxFQUFBQSxNQUFNLEVBQUUsSUFMb0I7QUFNNUJDLEVBQUFBLGdCQUFnQixFQUFFLE1BTlU7QUFNRjtBQUMxQkMsRUFBQUEsYUFBYSxFQUFFLEtBUGE7QUFPTjs7QUFF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QUFDQTtBQUNBOzs7QUFDQXRLLENBQUMsQ0FBQ3NILFFBQUQsQ0FBRCxDQUFZaUQsS0FBWixDQUFrQixZQUFXO0FBQ3pCekssRUFBQUEseUJBQXlCLENBQUMwQixVQUExQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKi9cblxuLyogZ2xvYmFsIERpYWxwbGFuQXBwbGljYXRpb25zQVBJLCBGb3JtLCBTZWN1cml0eVV0aWxzLCBnbG9iYWxUcmFuc2xhdGUsIEV4dGVuc2lvbnMsIGFjZSwgVXNlck1lc3NhZ2UgKi9cblxuLyoqXG4gKiBEaWFscGxhbiBhcHBsaWNhdGlvbiBlZGl0IGZvcm0gbWFuYWdlbWVudCBtb2R1bGUgd2l0aCBlbmhhbmNlZCBzZWN1cml0eVxuICovXG52YXIgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeSA9IHtcbiAgICAkZm9ybU9iajogJCgnI2RpYWxwbGFuLWFwcGxpY2F0aW9uLWZvcm0nKSxcbiAgICAkbnVtYmVyOiAkKCcjZXh0ZW5zaW9uJyksXG4gICAgJHRhYk1lbnVJdGVtczogJCgnI2FwcGxpY2F0aW9uLWNvZGUtbWVudSAuaXRlbScpLFxuICAgIGRlZmF1bHRFeHRlbnNpb246ICcnLFxuICAgIGVkaXRvcjogbnVsbCxcbiAgICBjdXJyZW50QWN0aXZlVGFiOiAnbWFpbicsIC8vIFRyYWNrIGN1cnJlbnQgYWN0aXZlIHRhYlxuICAgIGlzTG9hZGluZ0RhdGE6IGZhbHNlLCAvLyBGbGFnIHRvIHByZXZlbnQgYnV0dG9uIHJlYWN0aXZhdGlvbiBkdXJpbmcgZGF0YSBsb2FkaW5nXG4gICAgXG4gICAgLyoqXG4gICAgICogRm9ybSB2YWxpZGF0aW9uIHJ1bGVzIFxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgbmFtZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ25hbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmRhX1ZhbGlkYXRlTmFtZUlzRW1wdHlcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21heExlbmd0aFs1MF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5kYV9WYWxpZGF0ZU5hbWVUb29Mb25nIHx8ICdOYW1lIGlzIHRvbyBsb25nIChtYXggNTAgY2hhcmFjdGVycyknXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBleHRlbnNpb246IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdleHRlbnNpb24nLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJy9eWzAtOSMrXFxcXCp8WF17MSw2NH0kLycsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmRhX1ZhbGlkYXRlRXh0ZW5zaW9uTnVtYmVyLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5kYV9WYWxpZGF0ZUV4dGVuc2lvbklzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGlzdFJ1bGVbZXh0ZW5zaW9uLWVycm9yXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmRhX1ZhbGlkYXRlRXh0ZW5zaW9uRG91YmxlLFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgZXh0ZW5zaW9uIGRpc3BsYXkgaW4gcmliYm9uIGxhYmVsXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGV4dGVuc2lvbiAtIEV4dGVuc2lvbiBudW1iZXJcbiAgICAgKi9cbiAgICB1cGRhdGVFeHRlbnNpb25EaXNwbGF5OiBmdW5jdGlvbihleHRlbnNpb24pIHtcbiAgICAgICAgdmFyIGV4dGVuc2lvbkRpc3BsYXkgPSAkKCcjZXh0ZW5zaW9uLWRpc3BsYXknKTtcbiAgICAgICAgZXh0ZW5zaW9uRGlzcGxheS50ZXh0KGV4dGVuc2lvbiB8fCAnJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIG1vZHVsZVxuICAgICAqL1xuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBFbmFibGUgdGFiIG5hdmlnYXRpb24gd2l0aCBoaXN0b3J5IHN1cHBvcnRcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS4kdGFiTWVudUl0ZW1zLnRhYih7XG4gICAgICAgICAgICBoaXN0b3J5OiB0cnVlLFxuICAgICAgICAgICAgaGlzdG9yeVR5cGU6ICdoYXNoJyxcbiAgICAgICAgICAgIG9uVmlzaWJsZTogZnVuY3Rpb24odGFiUGF0aCkge1xuICAgICAgICAgICAgICAgIC8vIFRyYWNrIGN1cnJlbnQgYWN0aXZlIHRhYlxuICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuY3VycmVudEFjdGl2ZVRhYiA9IHRhYlBhdGg7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmVzaXplIEFDRSBlZGl0b3Igd2hlbiBjb2RlIHRhYiBiZWNvbWVzIHZpc2libGVcbiAgICAgICAgICAgICAgICBpZiAodGFiUGF0aCA9PT0gJ2NvZGUnICYmIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IucmVzaXplKCk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTsgICAgICAgIFxuICAgICAgICAvLyBFeHRlbnNpb24gYXZhaWxhYmlsaXR5IGNoZWNrXG4gICAgICAgIHZhciB0aW1lb3V0SWQ7XG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuJG51bWJlci5vbignaW5wdXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICh0aW1lb3V0SWQpIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciBuZXdOdW1iZXIgPSBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRlbnNpb24nKTtcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25zLmNoZWNrQXZhaWxhYmlsaXR5KGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZGVmYXVsdEV4dGVuc2lvbiwgbmV3TnVtYmVyKTtcbiAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIEZvcm0uanMgZm9yIFJFU1QgQVBJXG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJFU1QgQVBJIGludGVncmF0aW9uXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gRGlhbHBsYW5BcHBsaWNhdGlvbnNBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJztcbiAgICAgICAgXG4gICAgICAgIC8vIE5hdmlnYXRpb24gVVJMc1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBnbG9iYWxSb290VXJsICsgJ2RpYWxwbGFuLWFwcGxpY2F0aW9ucy9pbmRleC8nO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gZ2xvYmFsUm9vdFVybCArICdkaWFscGxhbi1hcHBsaWNhdGlvbnMvbW9kaWZ5Lyc7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgYWRhcHRpdmUgdGV4dGFyZWEgZm9yIGRlc2NyaXB0aW9uIGZpZWxkXG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuaW5pdGlhbGl6ZUFkYXB0aXZlVGV4dGFyZWEoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY29tcG9uZW50c1xuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmluaXRpYWxpemVBY2UoKTtcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5pbml0aWFsaXplRnVsbHNjcmVlbkhhbmRsZXJzKCk7XG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhZGFwdGl2ZSB0ZXh0YXJlYSBmb3IgZGVzY3JpcHRpb24gZmllbGRcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQWRhcHRpdmVUZXh0YXJlYTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIFNldCB1cCBhZGFwdGl2ZSByZXNpemluZyBmb3IgZGVzY3JpcHRpb24gdGV4dGFyZWFcbiAgICAgICAgJCgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJykub24oJ2lucHV0IHBhc3RlIGtleXVwJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJCh0aGlzKSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbCByZXNpemUgYWZ0ZXIgZm9ybSBkYXRhIGlzIGxvYWRlZFxuICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGZvcm0gZGF0YSB2aWEgUkVTVCBBUElcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByZWNvcmRJZCA9IGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZ2V0UmVjb3JkSWQoKTtcbiAgICAgICAgdmFyIGNvcHlGcm9tSWQgPSAkKCcjY29weS1mcm9tLWlkJykudmFsKCk7XG4gICAgICAgIHZhciB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICB2YXIgY29weVBhcmFtID0gdXJsUGFyYW1zLmdldCgnY29weScpO1xuICAgICAgICB2YXIgaXNDb3B5TW9kZSA9IGZhbHNlO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgZm9yIGNvcHkgbW9kZSBmcm9tIFVSTCBwYXJhbWV0ZXIgb3IgaGlkZGVuIGZpZWxkXG4gICAgICAgIGlmIChjb3B5UGFyYW0gfHwgY29weUZyb21JZCkge1xuICAgICAgICAgICAgcmVjb3JkSWQgPSAnY29weS0nICsgKGNvcHlQYXJhbSB8fCBjb3B5RnJvbUlkKTtcbiAgICAgICAgICAgIGlzQ29weU1vZGUgPSB0cnVlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBbHdheXMgY2FsbCBSRVNUIEFQSSB0byBnZXQgZGF0YSAoaW5jbHVkaW5nIGRlZmF1bHRzIGZvciBuZXcgcmVjb3JkcylcbiAgICAgICAgRGlhbHBsYW5BcHBsaWNhdGlvbnNBUEkuZ2V0UmVjb3JkKHJlY29yZElkLCBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vIERhdGEgaXMgYWxyZWFkeSBzYW5pdGl6ZWQgaW4gQVBJIG1vZHVsZVxuICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZGVmYXVsdEV4dGVuc2lvbiA9IHJlc3BvbnNlLmRhdGEuZXh0ZW5zaW9uO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBleHRlbnNpb24gbnVtYmVyIGRpc3BsYXkgaW4gdGhlIHJpYmJvbiBsYWJlbFxuICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkudXBkYXRlRXh0ZW5zaW9uRGlzcGxheShyZXNwb25zZS5kYXRhLmV4dGVuc2lvbik7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2V0IEFDRSBlZGl0b3IgY29udGVudCAoYXBwbGljYXRpb25sb2dpYyBpcyBub3Qgc2FuaXRpemVkKVxuICAgICAgICAgICAgICAgIHZhciBjb2RlQ29udGVudCA9IHJlc3BvbnNlLmRhdGEuYXBwbGljYXRpb25sb2dpYyB8fCAnJztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTZXQgZmxhZyB0byBwcmV2ZW50IHJlYWN0aXZhdGluZyBidXR0b25zIGR1cmluZyBkYXRhIGxvYWRcbiAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmlzTG9hZGluZ0RhdGEgPSB0cnVlO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLmdldFNlc3Npb24oKS5zZXRWYWx1ZShjb2RlQ29udGVudCk7XG4gICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5jaGFuZ2VBY2VNb2RlKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ2xlYXIgbG9hZGluZyBmbGFnIGFmdGVyIHNldHRpbmcgY29udGVudFxuICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuaXNMb2FkaW5nRGF0YSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFN3aXRjaCB0byBtYWluIHRhYiBvbmx5IGZvciBjb21wbGV0ZWx5IG5ldyByZWNvcmRzIChubyBuYW1lIGFuZCBubyBleHRlbnNpb24pXG4gICAgICAgICAgICAgICAgLy8gSGFzaCBoaXN0b3J5IHdpbGwgcHJlc2VydmUgdGhlIHRhYiBmb3IgZXhpc3RpbmcgcmVjb3Jkc1xuICAgICAgICAgICAgICAgIGlmICghcmVzcG9uc2UuZGF0YS5uYW1lICYmICFyZXNwb25zZS5kYXRhLmV4dGVuc2lvbiAmJiAhd2luZG93LmxvY2F0aW9uLmhhc2gpIHtcbiAgICAgICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS4kdGFiTWVudUl0ZW1zLnRhYignY2hhbmdlIHRhYicsICdtYWluJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIE1hcmsgZm9ybSBhcyBjaGFuZ2VkIGlmIGluIGNvcHkgbW9kZSB0byBlbmFibGUgc2F2ZSBidXR0b25cbiAgICAgICAgICAgICAgICBpZiAoaXNDb3B5TW9kZSkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEF1dG8tcmVzaXplIHRleHRhcmVhIGFmdGVyIGRhdGEgaXMgbG9hZGVkICh3aXRoIHNtYWxsIGRlbGF5IGZvciBET00gdXBkYXRlKVxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJyk7XG4gICAgICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLm1lc3NhZ2VzICYmIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yID8gXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLmpvaW4oJywgJykgOiBcbiAgICAgICAgICAgICAgICAgICAgJ0ZhaWxlZCB0byBsb2FkIGRpYWxwbGFuIGFwcGxpY2F0aW9uIGRhdGEnO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZXJyb3JNZXNzYWdlKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBJRCBmcm9tIFVSTFxuICAgICAqIFxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gUmVjb3JkIElEXG4gICAgICovXG4gICAgZ2V0UmVjb3JkSWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdXJsUGFydHMgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3BsaXQoJy8nKTtcbiAgICAgICAgdmFyIG1vZGlmeUluZGV4ID0gdXJsUGFydHMuaW5kZXhPZignbW9kaWZ5Jyk7XG4gICAgICAgIGlmIChtb2RpZnlJbmRleCAhPT0gLTEgJiYgdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXSkge1xuICAgICAgICAgICAgcmV0dXJuIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICcnO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBBQ0UgZWRpdG9yIHdpdGggc2VjdXJpdHkgY29uc2lkZXJhdGlvbnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQWNlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGFjZUhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCAtIDM4MDtcbiAgICAgICAgdmFyIHJvd3NDb3VudCA9IE1hdGgucm91bmQoYWNlSGVpZ2h0IC8gMTYuMyk7XG4gICAgICAgIFxuICAgICAgICAkKHdpbmRvdykub24oJ2xvYWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkKCcuYXBwbGljYXRpb24tY29kZScpLmNzcygnbWluLWhlaWdodCcsIGFjZUhlaWdodCArICdweCcpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yID0gYWNlLmVkaXQoJ2FwcGxpY2F0aW9uLWNvZGUnKTtcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3Iuc2V0VGhlbWUoJ2FjZS90aGVtZS9tb25va2FpJyk7XG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLnJlc2l6ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gVHJhY2sgY2hhbmdlcyBmb3IgRm9ybS5qc1xuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5nZXRTZXNzaW9uKCkub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgLy8gSWdub3JlIGNoYW5nZXMgZHVyaW5nIGRhdGEgbG9hZGluZyB0byBwcmV2ZW50IHJlYWN0aXZhdGluZyBidXR0b25zXG4gICAgICAgICAgICBpZiAoIWRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuaXNMb2FkaW5nRGF0YSkge1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5zZXRPcHRpb25zKHtcbiAgICAgICAgICAgIG1heExpbmVzOiByb3dzQ291bnQsXG4gICAgICAgICAgICBzaG93UHJpbnRNYXJnaW46IGZhbHNlLFxuICAgICAgICAgICAgc2hvd0xpbmVOdW1iZXJzOiBmYWxzZVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNlY3VyaXR5OiBwcmV2ZW50IGNvZGUgZXhlY3V0aW9uIGluIGVkaXRvclxuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5jb21tYW5kcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIG5hbWU6ICdwcmV2ZW50Q29kZUV4ZWN1dGlvbicsXG4gICAgICAgICAgICBiaW5kS2V5OiB7d2luOiAnQ3RybC1FJywgbWFjOiAnQ29tbWFuZC1FJ30sXG4gICAgICAgICAgICBleGVjOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ0NvZGUgZXhlY3V0aW9uIHByZXZlbnRlZCBmb3Igc2VjdXJpdHknKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBmdWxsc2NyZWVuIGhhbmRsZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZ1bGxzY3JlZW5IYW5kbGVyczogZnVuY3Rpb24oKSB7XG4gICAgICAgICQoJy5mdWxsc2NyZWVuLXRvZ2dsZS1idG4nKS5vbignY2xpY2snLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgY29udGFpbmVyID0gJCh0aGlzKS5zaWJsaW5ncygnLmFwcGxpY2F0aW9uLWNvZGUnKVswXTtcbiAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkudG9nZ2xlRnVsbFNjcmVlbihjb250YWluZXIpO1xuICAgICAgICB9KTtcblxuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdmdWxsc2NyZWVuY2hhbmdlJywgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5hZGp1c3RFZGl0b3JIZWlnaHQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDbGVhbnVwIGV2ZW50IGxpc3RlbmVycyB0byBwcmV2ZW50IG1lbW9yeSBsZWFrc1xuICAgICAqL1xuICAgIGNsZWFudXA6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBSZW1vdmUgZnVsbHNjcmVlbiBldmVudCBsaXN0ZW5lclxuICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdmdWxsc2NyZWVuY2hhbmdlJywgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5hZGp1c3RFZGl0b3JIZWlnaHQpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYW51cCBvdGhlciBldmVudCBsaXN0ZW5lcnMgaWYgbmVlZGVkXG4gICAgICAgICQod2luZG93KS5vZmYoJ2xvYWQnKTtcbiAgICAgICAgJCgnLmZ1bGxzY3JlZW4tdG9nZ2xlLWJ0bicpLm9mZignY2xpY2snKTtcbiAgICAgICAgJCgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJykub2ZmKCdpbnB1dCBwYXN0ZSBrZXl1cCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYW51cCBBQ0UgZWRpdG9yXG4gICAgICAgIGlmIChkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvcikge1xuICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IuZGVzdHJveSgpO1xuICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IgPSBudWxsO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBUb2dnbGUgZnVsbHNjcmVlbiBtb2RlXG4gICAgICogXG4gICAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gY29udGFpbmVyIC0gQ29udGFpbmVyIGVsZW1lbnRcbiAgICAgKi9cbiAgICB0b2dnbGVGdWxsU2NyZWVuOiBmdW5jdGlvbihjb250YWluZXIpIHtcbiAgICAgICAgaWYgKCFkb2N1bWVudC5mdWxsc2NyZWVuRWxlbWVudCkge1xuICAgICAgICAgICAgY29udGFpbmVyLnJlcXVlc3RGdWxsc2NyZWVuKCkuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgYXR0ZW1wdGluZyB0byBlbmFibGUgZnVsbC1zY3JlZW4gbW9kZTogJyArIGVyci5tZXNzYWdlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZG9jdW1lbnQuZXhpdEZ1bGxzY3JlZW4oKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGp1c3QgZWRpdG9yIGhlaWdodCBvbiBmdWxsc2NyZWVuIGNoYW5nZVxuICAgICAqL1xuICAgIGFkanVzdEVkaXRvckhlaWdodDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLnJlc2l6ZSgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2hhbmdlIEFDRSBlZGl0b3IgbW9kZSBiYXNlZCBvbiB0eXBlXG4gICAgICovXG4gICAgY2hhbmdlQWNlTW9kZTogZnVuY3Rpb24odmFsdWUsIHRleHQsICRjaG9pY2UpIHtcbiAgICAgICAgLy8gR2V0IG1vZGUgdmFsdWUgLSBjYW4gYmUgcGFzc2VkIGFzIHBhcmFtZXRlciBvciBmcm9tIGhpZGRlbiBpbnB1dFxuICAgICAgICB2YXIgbW9kZSA9IHZhbHVlIHx8ICQoJyN0eXBlJykudmFsKCk7XG4gICAgICAgIHZhciBOZXdNb2RlO1xuXG4gICAgICAgIGlmIChtb2RlID09PSAncGhwJykge1xuICAgICAgICAgICAgTmV3TW9kZSA9IGFjZS5yZXF1aXJlKCdhY2UvbW9kZS9waHAnKS5Nb2RlO1xuICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3Iuc2V0T3B0aW9ucyh7XG4gICAgICAgICAgICAgICAgc2hvd0xpbmVOdW1iZXJzOiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIE5ld01vZGUgPSBhY2UucmVxdWlyZSgnYWNlL21vZGUvanVsaWEnKS5Nb2RlO1xuICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3Iuc2V0T3B0aW9ucyh7XG4gICAgICAgICAgICAgICAgc2hvd0xpbmVOdW1iZXJzOiBmYWxzZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5zZXNzaW9uLnNldE1vZGUobmV3IE5ld01vZGUoKSk7XG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYmVmb3JlIGZvcm0gc3VibWlzc2lvblxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBzZXR0aW5ncyAtIEZvcm0gc2V0dGluZ3NcbiAgICAgKiBAcmV0dXJuIHtvYmplY3R8ZmFsc2V9IE1vZGlmaWVkIHNldHRpbmdzIG9yIGZhbHNlIHRvIGNhbmNlbFxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm06IGZ1bmN0aW9uKHNldHRpbmdzKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBhcHBsaWNhdGlvbiBsb2dpYyBmcm9tIEFDRSBlZGl0b3IgKG5vdCBzYW5pdGl6ZWQpXG4gICAgICAgIHJlc3VsdC5kYXRhLmFwcGxpY2F0aW9ubG9naWMgPSBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5nZXRWYWx1ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gUGFzcyBjdXJyZW50IGFjdGl2ZSB0YWIgZm9yIHJlZGlyZWN0XG4gICAgICAgIHJlc3VsdC5kYXRhLmN1cnJlbnRUYWIgPSBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmN1cnJlbnRBY3RpdmVUYWI7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGRpdGlvbmFsIGNsaWVudC1zaWRlIHZhbGlkYXRpb25cbiAgICAgICAgaWYgKCFEaWFscGxhbkFwcGxpY2F0aW9uc0FQSS52YWxpZGF0ZUFwcGxpY2F0aW9uRGF0YShyZXN1bHQuZGF0YSkpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcignVmFsaWRhdGlvbiBmYWlsZWQnKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGZvcm0gc3VibWlzc2lvbiAobm8gc3VjY2VzcyBtZXNzYWdlcyAtIFVJIHVwZGF0ZXMgb25seSlcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBTZXJ2ZXIgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm06IGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgLy8gRGF0YSBpcyBhbHJlYWR5IHNhbml0aXplZCBpbiBBUEkgbW9kdWxlXG4gICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGV4dGVuc2lvbiBudW1iZXIgZGlzcGxheSBpbiB0aGUgcmliYm9uIGxhYmVsXG4gICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS51cGRhdGVFeHRlbnNpb25EaXNwbGF5KHJlc3BvbnNlLmRhdGEuZXh0ZW5zaW9uKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgQUNFIGVkaXRvciBjb250ZW50XG4gICAgICAgICAgICAgICAgdmFyIGNvZGVDb250ZW50ID0gcmVzcG9uc2UuZGF0YS5hcHBsaWNhdGlvbmxvZ2ljIHx8ICcnO1xuICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLmdldFNlc3Npb24oKS5zZXRWYWx1ZShjb2RlQ29udGVudCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIHJlZGlyZWN0IHdpdGggdGFiIHByZXNlcnZhdGlvblxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLnJlZGlyZWN0VGFiICYmIHJlc3BvbnNlLmRhdGEucmVkaXJlY3RUYWIgIT09ICdtYWluJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgRm9ybS5qcyByZWRpcmVjdCBVUkwgdG8gaW5jbHVkZSBoYXNoXG4gICAgICAgICAgICAgICAgICAgIHZhciBjdXJyZW50SWQgPSAkKCcjaWQnKS52YWwoKSB8fCByZXNwb25zZS5kYXRhLnVuaXFpZDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGdsb2JhbFJvb3RVcmwgKyAnZGlhbHBsYW4tYXBwbGljYXRpb25zL21vZGlmeS8nICsgY3VycmVudElkICsgJyMvJyArIHJlc3BvbnNlLmRhdGEucmVkaXJlY3RUYWI7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBVUkwgZm9yIG5ldyByZWNvcmRzIFxuICAgICAgICAgICAgdmFyIGN1cnJlbnRJZCA9ICQoJyNpZCcpLnZhbCgpO1xuICAgICAgICAgICAgaWYgKCFjdXJyZW50SWQgJiYgcmVzcG9uc2UuZGF0YSAmJiByZXNwb25zZS5kYXRhLnVuaXFpZCkge1xuICAgICAgICAgICAgICAgIHZhciBoYXNoID0gcmVzcG9uc2UuZGF0YS5yZWRpcmVjdFRhYiAmJiByZXNwb25zZS5kYXRhLnJlZGlyZWN0VGFiICE9PSAnbWFpbicgPyAnIy8nICsgcmVzcG9uc2UuZGF0YS5yZWRpcmVjdFRhYiA6ICcnO1xuICAgICAgICAgICAgICAgIHZhciBuZXdVcmwgPSB3aW5kb3cubG9jYXRpb24uaHJlZi5yZXBsYWNlKC9tb2RpZnlcXC8/JC8sICdtb2RpZnkvJyArIHJlc3BvbnNlLmRhdGEudW5pcWlkKSArIGhhc2g7XG4gICAgICAgICAgICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKG51bGwsICcnLCBuZXdVcmwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBObyBzdWNjZXNzIG1lc3NhZ2UgLSBqdXN0IHNpbGVudCB1cGRhdGVcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIHNhbml0aXplZCBkYXRhXG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBGb3JtIGRhdGFcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm06IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2hcbiAgICAgICAgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseShkYXRhLCB7XG4gICAgICAgICAgICBiZWZvcmVQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93biBpZiBub3QgYWxyZWFkeSBkb25lXG4gICAgICAgICAgICAgICAgaWYgKCEkKCcjdHlwZS1kcm9wZG93bicpLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ3R5cGUnLCBmb3JtRGF0YSwge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGljT3B0aW9uczogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgdmFsdWU6ICdwaHAnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZGFfVHlwZVBocCB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgdmFsdWU6ICdwbGFpbnRleHQnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZGFfVHlwZVBsYWludGV4dCB9XG4gICAgICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5kYV9TZWxlY3RUeXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U6IGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuY2hhbmdlQWNlTW9kZVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWZ0ZXJQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEF1dG8tcmVzaXplIHRleHRhcmVhIGFmdGVyIGRhdGEgaXMgcG9wdWxhdGVkXG4gICAgICAgICAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCd0ZXh0YXJlYVtuYW1lPVwiZGVzY3JpcHRpb25cIl0nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBDdXN0b20gdmFsaWRhdGlvbiBydWxlIGZvciBleHRlbnNpb24gZXhpc3RlbmNlXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leGlzdFJ1bGUgPSBmdW5jdGlvbih2YWx1ZSwgcGFyYW1ldGVyKSB7IFxuICAgIHJldHVybiAkKCcjJyArIHBhcmFtZXRlcikuaGFzQ2xhc3MoJ2hpZGRlbicpOyBcbn07XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbigpIHtcbiAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=