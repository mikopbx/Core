"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 */

/* global DialplanApplicationsAPI, Form, SecurityUtils, globalTranslate, ExtensionsAPI, ace, UserMessage, FormElements */

/**
 * Dialplan application edit form management module with enhanced security
 */
var dialplanApplicationModify = {
  /**
   * Resolved in initialize() — must not call $() at module-load time.
   * @type {jQuery}
   */
  $formObj: null,
  $number: null,
  $tabMenuItems: null,
  defaultExtension: '',
  editor: null,
  currentActiveTab: 'main',
  // Track current active tab
  isLoadingData: false,
  // Flag to prevent button reactivation during data loading
  // Track if this is a new application (not existing in database)
  isNewApplication: false,
  // Track if this is copy mode
  isCopyMode: false,

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
        prompt: globalTranslate.da_ValidateNameTooLong
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
    dialplanApplicationModify.$formObj = $('#dialplan-application-form');
    dialplanApplicationModify.$number = $('#extension');
    dialplanApplicationModify.$tabMenuItems = $('#application-code-menu .item'); // Enable tab navigation with history support

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
        ExtensionsAPI.checkAvailability(dialplanApplicationModify.defaultExtension, newNumber);
      }, 500);
    }); // Configure Form.js for REST API

    Form.$formObj = dialplanApplicationModify.$formObj;
    Form.url = '#'; // Not used with REST API

    Form.validateRules = dialplanApplicationModify.validateRules;
    Form.cbBeforeSendForm = dialplanApplicationModify.cbBeforeSendForm;
    Form.cbAfterSendForm = dialplanApplicationModify.cbAfterSendForm; // REST API v3 integration

    Form.apiSettings.enabled = true;
    Form.apiSettings.apiObject = DialplanApplicationsAPI;
    Form.apiSettings.saveMethod = 'saveRecord'; // Use saveRecord method from PbxApiClient
    // Navigation URLs

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
    // Get record ID from URL
    var recordId = dialplanApplicationModify.getRecordId(); // Check for copy mode from URL parameter or hidden field

    var copyFromId = $('#copy-from-id').val();
    var urlParams = new URLSearchParams(window.location.search);
    var copyParam = urlParams.get('copy'); // Reset flags

    dialplanApplicationModify.isCopyMode = false;

    if (copyParam || copyFromId) {
      // Copy mode - use the new RESTful copy endpoint
      var sourceId = copyParam || copyFromId;
      dialplanApplicationModify.isCopyMode = true;
      dialplanApplicationModify.isNewApplication = true; // Copy creates a new application
      // Call the copy custom method

      DialplanApplicationsAPI.copy(sourceId, function (response) {
        dialplanApplicationModify.handleApplicationDataResponse(response, ''); // Empty ID for new application
      });
    } else {
      // Determine if this is a new application
      dialplanApplicationModify.isNewApplication = !recordId || recordId === '' || recordId === 'new'; // Use getRecord method from PbxApiClient
      // It automatically handles new records (calls getDefault) and existing records

      DialplanApplicationsAPI.getRecord(recordId || 'new', function (response) {
        dialplanApplicationModify.handleApplicationDataResponse(response, recordId);
      });
    }
  },

  /**
   * Handle application data response from API
   * @param {object} response - API response
   * @param {string} recordId - Application ID
   * @returns {void}
   */
  handleApplicationDataResponse: function handleApplicationDataResponse(response, recordId) {
    if (response.result && response.data) {
      // DO NOT change isNewApplication here - it should be set only once in initializeForm()
      // based on HOW the form was opened, not based on server response data
      // Set the _isNew flag for new applications based on the flag we set earlier
      if (dialplanApplicationModify.isNewApplication) {
        response.data._isNew = true;
      } // Data is already sanitized in API module


      dialplanApplicationModify.populateForm(response.data);
      dialplanApplicationModify.defaultExtension = response.data.extension; // Update extension number display in the ribbon label

      dialplanApplicationModify.updateExtensionDisplay(response.data.extension); // Set ACE editor content (applicationlogic is not sanitized)

      var codeContent = response.data.applicationlogic || ''; // Set flag to prevent reactivating buttons during data load

      dialplanApplicationModify.isLoadingData = true;
      dialplanApplicationModify.editor.getSession().setValue(codeContent);
      dialplanApplicationModify.changeAceMode(); // Clear loading flag after setting content

      dialplanApplicationModify.isLoadingData = false; // Determine which tab to show

      if (dialplanApplicationModify.isNewApplication || dialplanApplicationModify.isCopyMode) {
        // Switch to main tab for new records or copy mode
        if (!window.location.hash) {
          dialplanApplicationModify.$tabMenuItems.tab('change tab', 'main');
        }
      } else {
        // For existing records, hash history will preserve the tab
        if (!response.data.name && !response.data.extension && !window.location.hash) {
          dialplanApplicationModify.$tabMenuItems.tab('change tab', 'main');
        }
      } // Mark form as changed if in copy mode to enable save button


      if (dialplanApplicationModify.isCopyMode) {
        Form.dataChanged();
      } // Auto-resize textarea after data is loaded (with small delay for DOM update)


      setTimeout(function () {
        FormElements.optimizeTextareaSize('textarea[name="description"]');
      }, 100);
    } else if (recordId && recordId !== 'new') {
      var errorMessage = response.messages && response.messages.error ? response.messages.error.join(', ') : 'Failed to load dialplan application data';
      UserMessage.showError(SecurityUtils.escapeHtml(errorMessage));
    }
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

    result.data.currentTab = dialplanApplicationModify.currentActiveTab; // Add record ID for updates

    var recordId = dialplanApplicationModify.getRecordId();

    if (recordId && recordId !== '') {
      result.data.id = recordId;
      result.data.uniqid = recordId;
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
      } // Form.js will handle all redirect logic based on submitMode
      // No success message - just silent update

    }
  },

  /**
   * Populate form with sanitized data
   *
   * @param {object} data - Form data
   */
  populateForm: function populateForm(data) {
    // Use unified silent population approach
    // Form.populateFormSilently will handle _isNew flag automatically (lines 766-779 in form.js)
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9EaWFscGxhbkFwcGxpY2F0aW9ucy9kaWFscGxhbi1hcHBsaWNhdGlvbnMtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbImRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkiLCIkZm9ybU9iaiIsIiRudW1iZXIiLCIkdGFiTWVudUl0ZW1zIiwiZGVmYXVsdEV4dGVuc2lvbiIsImVkaXRvciIsImN1cnJlbnRBY3RpdmVUYWIiLCJpc0xvYWRpbmdEYXRhIiwiaXNOZXdBcHBsaWNhdGlvbiIsImlzQ29weU1vZGUiLCJ2YWxpZGF0ZVJ1bGVzIiwibmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJkYV9WYWxpZGF0ZU5hbWVJc0VtcHR5IiwiZGFfVmFsaWRhdGVOYW1lVG9vTG9uZyIsImV4dGVuc2lvbiIsInZhbHVlIiwiZGFfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIiLCJkYV9WYWxpZGF0ZUV4dGVuc2lvbklzRW1wdHkiLCJkYV9WYWxpZGF0ZUV4dGVuc2lvbkRvdWJsZSIsInVwZGF0ZUV4dGVuc2lvbkRpc3BsYXkiLCJleHRlbnNpb25EaXNwbGF5IiwiJCIsInRleHQiLCJpbml0aWFsaXplIiwidGFiIiwiaGlzdG9yeSIsImhpc3RvcnlUeXBlIiwib25WaXNpYmxlIiwidGFiUGF0aCIsInNldFRpbWVvdXQiLCJyZXNpemUiLCJ0aW1lb3V0SWQiLCJvbiIsImNsZWFyVGltZW91dCIsIm5ld051bWJlciIsImZvcm0iLCJFeHRlbnNpb25zQVBJIiwiY2hlY2tBdmFpbGFiaWxpdHkiLCJGb3JtIiwidXJsIiwiY2JCZWZvcmVTZW5kRm9ybSIsImNiQWZ0ZXJTZW5kRm9ybSIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsIkRpYWxwbGFuQXBwbGljYXRpb25zQVBJIiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJpbml0aWFsaXplQWRhcHRpdmVUZXh0YXJlYSIsImluaXRpYWxpemVBY2UiLCJpbml0aWFsaXplRnVsbHNjcmVlbkhhbmRsZXJzIiwiaW5pdGlhbGl6ZUZvcm0iLCJGb3JtRWxlbWVudHMiLCJvcHRpbWl6ZVRleHRhcmVhU2l6ZSIsInJlY29yZElkIiwiZ2V0UmVjb3JkSWQiLCJjb3B5RnJvbUlkIiwidmFsIiwidXJsUGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwid2luZG93IiwibG9jYXRpb24iLCJzZWFyY2giLCJjb3B5UGFyYW0iLCJnZXQiLCJzb3VyY2VJZCIsImNvcHkiLCJyZXNwb25zZSIsImhhbmRsZUFwcGxpY2F0aW9uRGF0YVJlc3BvbnNlIiwiZ2V0UmVjb3JkIiwicmVzdWx0IiwiZGF0YSIsIl9pc05ldyIsInBvcHVsYXRlRm9ybSIsImNvZGVDb250ZW50IiwiYXBwbGljYXRpb25sb2dpYyIsImdldFNlc3Npb24iLCJzZXRWYWx1ZSIsImNoYW5nZUFjZU1vZGUiLCJoYXNoIiwiZGF0YUNoYW5nZWQiLCJlcnJvck1lc3NhZ2UiLCJtZXNzYWdlcyIsImVycm9yIiwiam9pbiIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwiU2VjdXJpdHlVdGlscyIsImVzY2FwZUh0bWwiLCJ1cmxQYXJ0cyIsInBhdGhuYW1lIiwic3BsaXQiLCJtb2RpZnlJbmRleCIsImluZGV4T2YiLCJhY2VIZWlnaHQiLCJpbm5lckhlaWdodCIsInJvd3NDb3VudCIsIk1hdGgiLCJyb3VuZCIsImNzcyIsImFjZSIsImVkaXQiLCJzZXRUaGVtZSIsInNldE9wdGlvbnMiLCJtYXhMaW5lcyIsInNob3dQcmludE1hcmdpbiIsInNob3dMaW5lTnVtYmVycyIsImNvbW1hbmRzIiwiYWRkQ29tbWFuZCIsImJpbmRLZXkiLCJ3aW4iLCJtYWMiLCJleGVjIiwiY29uc29sZSIsIndhcm4iLCJjb250YWluZXIiLCJzaWJsaW5ncyIsInRvZ2dsZUZ1bGxTY3JlZW4iLCJkb2N1bWVudCIsImFkZEV2ZW50TGlzdGVuZXIiLCJhZGp1c3RFZGl0b3JIZWlnaHQiLCJjbGVhbnVwIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsIm9mZiIsImRlc3Ryb3kiLCJmdWxsc2NyZWVuRWxlbWVudCIsInJlcXVlc3RGdWxsc2NyZWVuIiwiZXJyIiwibWVzc2FnZSIsImV4aXRGdWxsc2NyZWVuIiwiJGNob2ljZSIsIm1vZGUiLCJOZXdNb2RlIiwicmVxdWlyZSIsIk1vZGUiLCJzZXNzaW9uIiwic2V0TW9kZSIsInNldHRpbmdzIiwiZ2V0VmFsdWUiLCJjdXJyZW50VGFiIiwiaWQiLCJ1bmlxaWQiLCJyZWRpcmVjdFRhYiIsImN1cnJlbnRJZCIsInBvcHVsYXRlRm9ybVNpbGVudGx5IiwiYmVmb3JlUG9wdWxhdGUiLCJmb3JtRGF0YSIsImxlbmd0aCIsIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwic3RhdGljT3B0aW9ucyIsImRhX1R5cGVQaHAiLCJkYV9UeXBlUGxhaW50ZXh0IiwicGxhY2Vob2xkZXIiLCJkYV9TZWxlY3RUeXBlIiwib25DaGFuZ2UiLCJhZnRlclBvcHVsYXRlIiwiZW5hYmxlRGlycml0eSIsImluaXRpYWxpemVEaXJyaXR5IiwiZm4iLCJleGlzdFJ1bGUiLCJwYXJhbWV0ZXIiLCJoYXNDbGFzcyIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLElBQUlBLHlCQUF5QixHQUFHO0FBQzVCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRSxJQUxrQjtBQU01QkMsRUFBQUEsT0FBTyxFQUFFLElBTm1CO0FBTzVCQyxFQUFBQSxhQUFhLEVBQUUsSUFQYTtBQVE1QkMsRUFBQUEsZ0JBQWdCLEVBQUUsRUFSVTtBQVM1QkMsRUFBQUEsTUFBTSxFQUFFLElBVG9CO0FBVTVCQyxFQUFBQSxnQkFBZ0IsRUFBRSxNQVZVO0FBVUY7QUFDMUJDLEVBQUFBLGFBQWEsRUFBRSxLQVhhO0FBV047QUFFdEI7QUFDQUMs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aWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqL1xuXG4vKiBnbG9iYWwgRGlhbHBsYW5BcHBsaWNhdGlvbnNBUEksIEZvcm0sIFNlY3VyaXR5VXRpbHMsIGdsb2JhbFRyYW5zbGF0ZSwgRXh0ZW5zaW9uc0FQSSwgYWNlLCBVc2VyTWVzc2FnZSwgRm9ybUVsZW1lbnRzICovXG5cbi8qKlxuICogRGlhbHBsYW4gYXBwbGljYXRpb24gZWRpdCBmb3JtIG1hbmFnZW1lbnQgbW9kdWxlIHdpdGggZW5oYW5jZWQgc2VjdXJpdHlcbiAqL1xudmFyIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkgPSB7XG4gICAgLyoqXG4gICAgICogUmVzb2x2ZWQgaW4gaW5pdGlhbGl6ZSgpIOKAlCBtdXN0IG5vdCBjYWxsICQoKSBhdCBtb2R1bGUtbG9hZCB0aW1lLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6IG51bGwsXG4gICAgJG51bWJlcjogbnVsbCxcbiAgICAkdGFiTWVudUl0ZW1zOiBudWxsLFxuICAgIGRlZmF1bHRFeHRlbnNpb246ICcnLFxuICAgIGVkaXRvcjogbnVsbCxcbiAgICBjdXJyZW50QWN0aXZlVGFiOiAnbWFpbicsIC8vIFRyYWNrIGN1cnJlbnQgYWN0aXZlIHRhYlxuICAgIGlzTG9hZGluZ0RhdGE6IGZhbHNlLCAvLyBGbGFnIHRvIHByZXZlbnQgYnV0dG9uIHJlYWN0aXZhdGlvbiBkdXJpbmcgZGF0YSBsb2FkaW5nXG5cbiAgICAvLyBUcmFjayBpZiB0aGlzIGlzIGEgbmV3IGFwcGxpY2F0aW9uIChub3QgZXhpc3RpbmcgaW4gZGF0YWJhc2UpXG4gICAgaXNOZXdBcHBsaWNhdGlvbjogZmFsc2UsXG5cbiAgICAvLyBUcmFjayBpZiB0aGlzIGlzIGNvcHkgbW9kZVxuICAgIGlzQ29weU1vZGU6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogRm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBuYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnbmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZGFfVmFsaWRhdGVOYW1lSXNFbXB0eVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWF4TGVuZ3RoWzUwXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmRhX1ZhbGlkYXRlTmFtZVRvb0xvbmdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIGV4dGVuc2lvbjoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2V4dGVuc2lvbicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnL15bMC05IytcXFxcKnxYXXsxLDY0fSQvJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZGFfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmRhX1ZhbGlkYXRlRXh0ZW5zaW9uSXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4aXN0UnVsZVtleHRlbnNpb24tZXJyb3JdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZGFfVmFsaWRhdGVFeHRlbnNpb25Eb3VibGUsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBleHRlbnNpb24gZGlzcGxheSBpbiByaWJib24gbGFiZWxcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZXh0ZW5zaW9uIC0gRXh0ZW5zaW9uIG51bWJlclxuICAgICAqL1xuICAgIHVwZGF0ZUV4dGVuc2lvbkRpc3BsYXk6IGZ1bmN0aW9uKGV4dGVuc2lvbikge1xuICAgICAgICB2YXIgZXh0ZW5zaW9uRGlzcGxheSA9ICQoJyNleHRlbnNpb24tZGlzcGxheScpO1xuICAgICAgICBleHRlbnNpb25EaXNwbGF5LnRleHQoZXh0ZW5zaW9uIHx8ICcnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgbW9kdWxlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuJGZvcm1PYmogPSAkKCcjZGlhbHBsYW4tYXBwbGljYXRpb24tZm9ybScpO1xuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LiRudW1iZXIgPSAkKCcjZXh0ZW5zaW9uJyk7XG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuJHRhYk1lbnVJdGVtcyA9ICQoJyNhcHBsaWNhdGlvbi1jb2RlLW1lbnUgLml0ZW0nKTtcblxuICAgICAgICAvLyBFbmFibGUgdGFiIG5hdmlnYXRpb24gd2l0aCBoaXN0b3J5IHN1cHBvcnRcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS4kdGFiTWVudUl0ZW1zLnRhYih7XG4gICAgICAgICAgICBoaXN0b3J5OiB0cnVlLFxuICAgICAgICAgICAgaGlzdG9yeVR5cGU6ICdoYXNoJyxcbiAgICAgICAgICAgIG9uVmlzaWJsZTogZnVuY3Rpb24odGFiUGF0aCkge1xuICAgICAgICAgICAgICAgIC8vIFRyYWNrIGN1cnJlbnQgYWN0aXZlIHRhYlxuICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuY3VycmVudEFjdGl2ZVRhYiA9IHRhYlBhdGg7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmVzaXplIEFDRSBlZGl0b3Igd2hlbiBjb2RlIHRhYiBiZWNvbWVzIHZpc2libGVcbiAgICAgICAgICAgICAgICBpZiAodGFiUGF0aCA9PT0gJ2NvZGUnICYmIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IucmVzaXplKCk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTsgICAgICAgIFxuICAgICAgICAvLyBFeHRlbnNpb24gYXZhaWxhYmlsaXR5IGNoZWNrXG4gICAgICAgIHZhciB0aW1lb3V0SWQ7XG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuJG51bWJlci5vbignaW5wdXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICh0aW1lb3V0SWQpIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciBuZXdOdW1iZXIgPSBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRlbnNpb24nKTtcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25zQVBJLmNoZWNrQXZhaWxhYmlsaXR5KGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZGVmYXVsdEV4dGVuc2lvbiwgbmV3TnVtYmVyKTtcbiAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIEZvcm0uanMgZm9yIFJFU1QgQVBJXG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJFU1QgQVBJIHYzIGludGVncmF0aW9uXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gRGlhbHBsYW5BcHBsaWNhdGlvbnNBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJzsgLy8gVXNlIHNhdmVSZWNvcmQgbWV0aG9kIGZyb20gUGJ4QXBpQ2xpZW50XG4gICAgICAgIFxuICAgICAgICAvLyBOYXZpZ2F0aW9uIFVSTHNcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gZ2xvYmFsUm9vdFVybCArICdkaWFscGxhbi1hcHBsaWNhdGlvbnMvaW5kZXgvJztcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGdsb2JhbFJvb3RVcmwgKyAnZGlhbHBsYW4tYXBwbGljYXRpb25zL21vZGlmeS8nO1xuICAgICAgICBcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGFkYXB0aXZlIHRleHRhcmVhIGZvciBkZXNjcmlwdGlvbiBmaWVsZFxuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmluaXRpYWxpemVBZGFwdGl2ZVRleHRhcmVhKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGNvbXBvbmVudHNcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5pbml0aWFsaXplQWNlKCk7XG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuaW5pdGlhbGl6ZUZ1bGxzY3JlZW5IYW5kbGVycygpO1xuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmluaXRpYWxpemVGb3JtKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYWRhcHRpdmUgdGV4dGFyZWEgZm9yIGRlc2NyaXB0aW9uIGZpZWxkXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUFkYXB0aXZlVGV4dGFyZWE6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBTZXQgdXAgYWRhcHRpdmUgcmVzaXppbmcgZm9yIGRlc2NyaXB0aW9uIHRleHRhcmVhXG4gICAgICAgICQoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpLm9uKCdpbnB1dCBwYXN0ZSBrZXl1cCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCQodGhpcykpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWwgcmVzaXplIGFmdGVyIGZvcm0gZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCd0ZXh0YXJlYVtuYW1lPVwiZGVzY3JpcHRpb25cIl0nKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBmb3JtIGRhdGEgdmlhIFJFU1QgQVBJXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm06IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBHZXQgcmVjb3JkIElEIGZyb20gVVJMXG4gICAgICAgIHZhciByZWNvcmRJZCA9IGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZ2V0UmVjb3JkSWQoKTtcblxuICAgICAgICAvLyBDaGVjayBmb3IgY29weSBtb2RlIGZyb20gVVJMIHBhcmFtZXRlciBvciBoaWRkZW4gZmllbGRcbiAgICAgICAgdmFyIGNvcHlGcm9tSWQgPSAkKCcjY29weS1mcm9tLWlkJykudmFsKCk7XG4gICAgICAgIHZhciB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICB2YXIgY29weVBhcmFtID0gdXJsUGFyYW1zLmdldCgnY29weScpO1xuXG4gICAgICAgIC8vIFJlc2V0IGZsYWdzXG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuaXNDb3B5TW9kZSA9IGZhbHNlO1xuXG4gICAgICAgIGlmIChjb3B5UGFyYW0gfHwgY29weUZyb21JZCkge1xuICAgICAgICAgICAgLy8gQ29weSBtb2RlIC0gdXNlIHRoZSBuZXcgUkVTVGZ1bCBjb3B5IGVuZHBvaW50XG4gICAgICAgICAgICB2YXIgc291cmNlSWQgPSBjb3B5UGFyYW0gfHwgY29weUZyb21JZDtcbiAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuaXNDb3B5TW9kZSA9IHRydWU7XG4gICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmlzTmV3QXBwbGljYXRpb24gPSB0cnVlOyAvLyBDb3B5IGNyZWF0ZXMgYSBuZXcgYXBwbGljYXRpb25cblxuICAgICAgICAgICAgLy8gQ2FsbCB0aGUgY29weSBjdXN0b20gbWV0aG9kXG4gICAgICAgICAgICBEaWFscGxhbkFwcGxpY2F0aW9uc0FQSS5jb3B5KHNvdXJjZUlkLCBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuaGFuZGxlQXBwbGljYXRpb25EYXRhUmVzcG9uc2UocmVzcG9uc2UsICcnKTsgLy8gRW1wdHkgSUQgZm9yIG5ldyBhcHBsaWNhdGlvblxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBEZXRlcm1pbmUgaWYgdGhpcyBpcyBhIG5ldyBhcHBsaWNhdGlvblxuICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5pc05ld0FwcGxpY2F0aW9uID0gIXJlY29yZElkIHx8IHJlY29yZElkID09PSAnJyB8fCByZWNvcmRJZCA9PT0gJ25ldyc7XG5cbiAgICAgICAgICAgIC8vIFVzZSBnZXRSZWNvcmQgbWV0aG9kIGZyb20gUGJ4QXBpQ2xpZW50XG4gICAgICAgICAgICAvLyBJdCBhdXRvbWF0aWNhbGx5IGhhbmRsZXMgbmV3IHJlY29yZHMgKGNhbGxzIGdldERlZmF1bHQpIGFuZCBleGlzdGluZyByZWNvcmRzXG4gICAgICAgICAgICBEaWFscGxhbkFwcGxpY2F0aW9uc0FQSS5nZXRSZWNvcmQocmVjb3JkSWQgfHwgJ25ldycsIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5oYW5kbGVBcHBsaWNhdGlvbkRhdGFSZXNwb25zZShyZXNwb25zZSwgcmVjb3JkSWQpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGFwcGxpY2F0aW9uIGRhdGEgcmVzcG9uc2UgZnJvbSBBUElcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBBUEkgcmVzcG9uc2VcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcmVjb3JkSWQgLSBBcHBsaWNhdGlvbiBJRFxuICAgICAqIEByZXR1cm5zIHt2b2lkfVxuICAgICAqL1xuICAgIGhhbmRsZUFwcGxpY2F0aW9uRGF0YVJlc3BvbnNlOiBmdW5jdGlvbihyZXNwb25zZSwgcmVjb3JkSWQpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAvLyBETyBOT1QgY2hhbmdlIGlzTmV3QXBwbGljYXRpb24gaGVyZSAtIGl0IHNob3VsZCBiZSBzZXQgb25seSBvbmNlIGluIGluaXRpYWxpemVGb3JtKClcbiAgICAgICAgICAgIC8vIGJhc2VkIG9uIEhPVyB0aGUgZm9ybSB3YXMgb3BlbmVkLCBub3QgYmFzZWQgb24gc2VydmVyIHJlc3BvbnNlIGRhdGFcblxuICAgICAgICAgICAgLy8gU2V0IHRoZSBfaXNOZXcgZmxhZyBmb3IgbmV3IGFwcGxpY2F0aW9ucyBiYXNlZCBvbiB0aGUgZmxhZyB3ZSBzZXQgZWFybGllclxuICAgICAgICAgICAgaWYgKGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuaXNOZXdBcHBsaWNhdGlvbikge1xuICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuX2lzTmV3ID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRGF0YSBpcyBhbHJlYWR5IHNhbml0aXplZCBpbiBBUEkgbW9kdWxlXG4gICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZGVmYXVsdEV4dGVuc2lvbiA9IHJlc3BvbnNlLmRhdGEuZXh0ZW5zaW9uO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgZXh0ZW5zaW9uIG51bWJlciBkaXNwbGF5IGluIHRoZSByaWJib24gbGFiZWxcbiAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkudXBkYXRlRXh0ZW5zaW9uRGlzcGxheShyZXNwb25zZS5kYXRhLmV4dGVuc2lvbik7XG5cbiAgICAgICAgICAgIC8vIFNldCBBQ0UgZWRpdG9yIGNvbnRlbnQgKGFwcGxpY2F0aW9ubG9naWMgaXMgbm90IHNhbml0aXplZClcbiAgICAgICAgICAgIHZhciBjb2RlQ29udGVudCA9IHJlc3BvbnNlLmRhdGEuYXBwbGljYXRpb25sb2dpYyB8fCAnJztcblxuICAgICAgICAgICAgLy8gU2V0IGZsYWcgdG8gcHJldmVudCByZWFjdGl2YXRpbmcgYnV0dG9ucyBkdXJpbmcgZGF0YSBsb2FkXG4gICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmlzTG9hZGluZ0RhdGEgPSB0cnVlO1xuXG4gICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5nZXRTZXNzaW9uKCkuc2V0VmFsdWUoY29kZUNvbnRlbnQpO1xuICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5jaGFuZ2VBY2VNb2RlKCk7XG5cbiAgICAgICAgICAgIC8vIENsZWFyIGxvYWRpbmcgZmxhZyBhZnRlciBzZXR0aW5nIGNvbnRlbnRcbiAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuaXNMb2FkaW5nRGF0YSA9IGZhbHNlO1xuXG4gICAgICAgICAgICAvLyBEZXRlcm1pbmUgd2hpY2ggdGFiIHRvIHNob3dcbiAgICAgICAgICAgIGlmIChkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmlzTmV3QXBwbGljYXRpb24gfHwgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5pc0NvcHlNb2RlKSB7XG4gICAgICAgICAgICAgICAgLy8gU3dpdGNoIHRvIG1haW4gdGFiIGZvciBuZXcgcmVjb3JkcyBvciBjb3B5IG1vZGVcbiAgICAgICAgICAgICAgICBpZiAoIXdpbmRvdy5sb2NhdGlvbi5oYXNoKSB7XG4gICAgICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuJHRhYk1lbnVJdGVtcy50YWIoJ2NoYW5nZSB0YWInLCAnbWFpbicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgLy8gRm9yIGV4aXN0aW5nIHJlY29yZHMsIGhhc2ggaGlzdG9yeSB3aWxsIHByZXNlcnZlIHRoZSB0YWJcbiAgICAgICAgICAgICAgICBpZiAoIXJlc3BvbnNlLmRhdGEubmFtZSAmJiAhcmVzcG9uc2UuZGF0YS5leHRlbnNpb24gJiYgIXdpbmRvdy5sb2NhdGlvbi5oYXNoKSB7XG4gICAgICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuJHRhYk1lbnVJdGVtcy50YWIoJ2NoYW5nZSB0YWInLCAnbWFpbicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWQgaWYgaW4gY29weSBtb2RlIHRvIGVuYWJsZSBzYXZlIGJ1dHRvblxuICAgICAgICAgICAgaWYgKGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuaXNDb3B5TW9kZSkge1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gQXV0by1yZXNpemUgdGV4dGFyZWEgYWZ0ZXIgZGF0YSBpcyBsb2FkZWQgKHdpdGggc21hbGwgZGVsYXkgZm9yIERPTSB1cGRhdGUpXG4gICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJyk7XG4gICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICB9IGVsc2UgaWYgKHJlY29yZElkICYmIHJlY29yZElkICE9PSAnbmV3Jykge1xuICAgICAgICAgICAgdmFyIGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLm1lc3NhZ2VzICYmIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yID9cbiAgICAgICAgICAgICAgICByZXNwb25zZS5tZXNzYWdlcy5lcnJvci5qb2luKCcsICcpIDpcbiAgICAgICAgICAgICAgICAnRmFpbGVkIHRvIGxvYWQgZGlhbHBsYW4gYXBwbGljYXRpb24gZGF0YSc7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGVycm9yTWVzc2FnZSkpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgcmVjb3JkIElEIGZyb20gVVJMXG4gICAgICogXG4gICAgICogQHJldHVybiB7c3RyaW5nfSBSZWNvcmQgSURcbiAgICAgKi9cbiAgICBnZXRSZWNvcmRJZDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB1cmxQYXJ0cyA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zcGxpdCgnLycpO1xuICAgICAgICB2YXIgbW9kaWZ5SW5kZXggPSB1cmxQYXJ0cy5pbmRleE9mKCdtb2RpZnknKTtcbiAgICAgICAgaWYgKG1vZGlmeUluZGV4ICE9PSAtMSAmJiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdKSB7XG4gICAgICAgICAgICByZXR1cm4gdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIEFDRSBlZGl0b3Igd2l0aCBzZWN1cml0eSBjb25zaWRlcmF0aW9uc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVBY2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gMzgwO1xuICAgICAgICB2YXIgcm93c0NvdW50ID0gTWF0aC5yb3VuZChhY2VIZWlnaHQgLyAxNi4zKTtcbiAgICAgICAgXG4gICAgICAgICQod2luZG93KS5vbignbG9hZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICQoJy5hcHBsaWNhdGlvbi1jb2RlJykuY3NzKCdtaW4taGVpZ2h0JywgYWNlSGVpZ2h0ICsgJ3B4Jyk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IgPSBhY2UuZWRpdCgnYXBwbGljYXRpb24tY29kZScpO1xuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5zZXRUaGVtZSgnYWNlL3RoZW1lL21vbm9rYWknKTtcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IucmVzaXplKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBUcmFjayBjaGFuZ2VzIGZvciBGb3JtLmpzXG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLmdldFNlc3Npb24oKS5vbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyBJZ25vcmUgY2hhbmdlcyBkdXJpbmcgZGF0YSBsb2FkaW5nIHRvIHByZXZlbnQgcmVhY3RpdmF0aW5nIGJ1dHRvbnNcbiAgICAgICAgICAgIGlmICghZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5pc0xvYWRpbmdEYXRhKSB7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLnNldE9wdGlvbnMoe1xuICAgICAgICAgICAgbWF4TGluZXM6IHJvd3NDb3VudCxcbiAgICAgICAgICAgIHNob3dQcmludE1hcmdpbjogZmFsc2UsXG4gICAgICAgICAgICBzaG93TGluZU51bWJlcnM6IGZhbHNlXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gU2VjdXJpdHk6IHByZXZlbnQgY29kZSBleGVjdXRpb24gaW4gZWRpdG9yXG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLmNvbW1hbmRzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgbmFtZTogJ3ByZXZlbnRDb2RlRXhlY3V0aW9uJyxcbiAgICAgICAgICAgIGJpbmRLZXk6IHt3aW46ICdDdHJsLUUnLCBtYWM6ICdDb21tYW5kLUUnfSxcbiAgICAgICAgICAgIGV4ZWM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignQ29kZSBleGVjdXRpb24gcHJldmVudGVkIGZvciBzZWN1cml0eScpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGZ1bGxzY3JlZW4gaGFuZGxlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRnVsbHNjcmVlbkhhbmRsZXJzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgJCgnLmZ1bGxzY3JlZW4tdG9nZ2xlLWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBjb250YWluZXIgPSAkKHRoaXMpLnNpYmxpbmdzKCcuYXBwbGljYXRpb24tY29kZScpWzBdO1xuICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS50b2dnbGVGdWxsU2NyZWVuKGNvbnRhaW5lcik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2Z1bGxzY3JlZW5jaGFuZ2UnLCBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmFkanVzdEVkaXRvckhlaWdodCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENsZWFudXAgZXZlbnQgbGlzdGVuZXJzIHRvIHByZXZlbnQgbWVtb3J5IGxlYWtzXG4gICAgICovXG4gICAgY2xlYW51cDogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIFJlbW92ZSBmdWxsc2NyZWVuIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Z1bGxzY3JlZW5jaGFuZ2UnLCBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmFkanVzdEVkaXRvckhlaWdodCk7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhbnVwIG90aGVyIGV2ZW50IGxpc3RlbmVycyBpZiBuZWVkZWRcbiAgICAgICAgJCh3aW5kb3cpLm9mZignbG9hZCcpO1xuICAgICAgICAkKCcuZnVsbHNjcmVlbi10b2dnbGUtYnRuJykub2ZmKCdjbGljaycpO1xuICAgICAgICAkKCd0ZXh0YXJlYVtuYW1lPVwiZGVzY3JpcHRpb25cIl0nKS5vZmYoJ2lucHV0IHBhc3RlIGtleXVwJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhbnVwIEFDRSBlZGl0b3JcbiAgICAgICAgaWYgKGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yKSB7XG4gICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5kZXN0cm95KCk7XG4gICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvciA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFRvZ2dsZSBmdWxsc2NyZWVuIG1vZGVcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBjb250YWluZXIgLSBDb250YWluZXIgZWxlbWVudFxuICAgICAqL1xuICAgIHRvZ2dsZUZ1bGxTY3JlZW46IGZ1bmN0aW9uKGNvbnRhaW5lcikge1xuICAgICAgICBpZiAoIWRvY3VtZW50LmZ1bGxzY3JlZW5FbGVtZW50KSB7XG4gICAgICAgICAgICBjb250YWluZXIucmVxdWVzdEZ1bGxzY3JlZW4oKS5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBhdHRlbXB0aW5nIHRvIGVuYWJsZSBmdWxsLXNjcmVlbiBtb2RlOiAnICsgZXJyLm1lc3NhZ2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkb2N1bWVudC5leGl0RnVsbHNjcmVlbigpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkanVzdCBlZGl0b3IgaGVpZ2h0IG9uIGZ1bGxzY3JlZW4gY2hhbmdlXG4gICAgICovXG4gICAgYWRqdXN0RWRpdG9ySGVpZ2h0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IucmVzaXplKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDaGFuZ2UgQUNFIGVkaXRvciBtb2RlIGJhc2VkIG9uIHR5cGVcbiAgICAgKi9cbiAgICBjaGFuZ2VBY2VNb2RlOiBmdW5jdGlvbih2YWx1ZSwgdGV4dCwgJGNob2ljZSkge1xuICAgICAgICAvLyBHZXQgbW9kZSB2YWx1ZSAtIGNhbiBiZSBwYXNzZWQgYXMgcGFyYW1ldGVyIG9yIGZyb20gaGlkZGVuIGlucHV0XG4gICAgICAgIHZhciBtb2RlID0gdmFsdWUgfHwgJCgnI3R5cGUnKS52YWwoKTtcbiAgICAgICAgdmFyIE5ld01vZGU7XG5cbiAgICAgICAgaWYgKG1vZGUgPT09ICdwaHAnKSB7XG4gICAgICAgICAgICBOZXdNb2RlID0gYWNlLnJlcXVpcmUoJ2FjZS9tb2RlL3BocCcpLk1vZGU7XG4gICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5zZXRPcHRpb25zKHtcbiAgICAgICAgICAgICAgICBzaG93TGluZU51bWJlcnM6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgTmV3TW9kZSA9IGFjZS5yZXF1aXJlKCdhY2UvbW9kZS9qdWxpYScpLk1vZGU7XG4gICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5zZXRPcHRpb25zKHtcbiAgICAgICAgICAgICAgICBzaG93TGluZU51bWJlcnM6IGZhbHNlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLnNlc3Npb24uc2V0TW9kZShuZXcgTmV3TW9kZSgpKTtcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3Iuc2V0VGhlbWUoJ2FjZS90aGVtZS9tb25va2FpJyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgZm9ybSBzdWJtaXNzaW9uXG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNldHRpbmdzIC0gRm9ybSBzZXR0aW5nc1xuICAgICAqIEByZXR1cm4ge29iamVjdHxmYWxzZX0gTW9kaWZpZWQgc2V0dGluZ3Mgb3IgZmFsc2UgdG8gY2FuY2VsXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybTogZnVuY3Rpb24oc2V0dGluZ3MpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGFwcGxpY2F0aW9uIGxvZ2ljIGZyb20gQUNFIGVkaXRvciAobm90IHNhbml0aXplZClcbiAgICAgICAgcmVzdWx0LmRhdGEuYXBwbGljYXRpb25sb2dpYyA9IGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLmdldFZhbHVlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBQYXNzIGN1cnJlbnQgYWN0aXZlIHRhYiBmb3IgcmVkaXJlY3RcbiAgICAgICAgcmVzdWx0LmRhdGEuY3VycmVudFRhYiA9IGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuY3VycmVudEFjdGl2ZVRhYjtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCByZWNvcmQgSUQgZm9yIHVwZGF0ZXNcbiAgICAgICAgdmFyIHJlY29yZElkID0gZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5nZXRSZWNvcmRJZCgpO1xuICAgICAgICBpZiAocmVjb3JkSWQgJiYgcmVjb3JkSWQgIT09ICcnKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5pZCA9IHJlY29yZElkO1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEudW5pcWlkID0gcmVjb3JkSWQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBmb3JtIHN1Ym1pc3Npb24gKG5vIHN1Y2Nlc3MgbWVzc2FnZXMgLSBVSSB1cGRhdGVzIG9ubHkpXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcmVzcG9uc2UgLSBTZXJ2ZXIgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm06IGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgLy8gRGF0YSBpcyBhbHJlYWR5IHNhbml0aXplZCBpbiBBUEkgbW9kdWxlXG4gICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG5cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgZXh0ZW5zaW9uIG51bWJlciBkaXNwbGF5IGluIHRoZSByaWJib24gbGFiZWxcbiAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LnVwZGF0ZUV4dGVuc2lvbkRpc3BsYXkocmVzcG9uc2UuZGF0YS5leHRlbnNpb24pO1xuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIEFDRSBlZGl0b3IgY29udGVudFxuICAgICAgICAgICAgICAgIHZhciBjb2RlQ29udGVudCA9IHJlc3BvbnNlLmRhdGEuYXBwbGljYXRpb25sb2dpYyB8fCAnJztcbiAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5nZXRTZXNzaW9uKCkuc2V0VmFsdWUoY29kZUNvbnRlbnQpO1xuXG4gICAgICAgICAgICAgICAgLy8gSGFuZGxlIHJlZGlyZWN0IHdpdGggdGFiIHByZXNlcnZhdGlvblxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhLnJlZGlyZWN0VGFiICYmIHJlc3BvbnNlLmRhdGEucmVkaXJlY3RUYWIgIT09ICdtYWluJykge1xuICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgRm9ybS5qcyByZWRpcmVjdCBVUkwgdG8gaW5jbHVkZSBoYXNoXG4gICAgICAgICAgICAgICAgICAgIHZhciBjdXJyZW50SWQgPSAkKCcjaWQnKS52YWwoKSB8fCByZXNwb25zZS5kYXRhLnVuaXFpZDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRJZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGdsb2JhbFJvb3RVcmwgKyAnZGlhbHBsYW4tYXBwbGljYXRpb25zL21vZGlmeS8nICsgY3VycmVudElkICsgJyMvJyArIHJlc3BvbnNlLmRhdGEucmVkaXJlY3RUYWI7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEZvcm0uanMgd2lsbCBoYW5kbGUgYWxsIHJlZGlyZWN0IGxvZ2ljIGJhc2VkIG9uIHN1Ym1pdE1vZGVcblxuICAgICAgICAgICAgLy8gTm8gc3VjY2VzcyBtZXNzYWdlIC0ganVzdCBzaWxlbnQgdXBkYXRlXG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBzYW5pdGl6ZWQgZGF0YVxuICAgICAqXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBGb3JtIGRhdGFcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm06IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2hcbiAgICAgICAgLy8gRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseSB3aWxsIGhhbmRsZSBfaXNOZXcgZmxhZyBhdXRvbWF0aWNhbGx5IChsaW5lcyA3NjYtNzc5IGluIGZvcm0uanMpXG4gICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoZGF0YSwge1xuICAgICAgICAgICAgYmVmb3JlUG9wdWxhdGU6IChmb3JtRGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd24gaWYgbm90IGFscmVhZHkgZG9uZVxuICAgICAgICAgICAgICAgIGlmICghJCgnI3R5cGUtZHJvcGRvd24nKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCd0eXBlJywgZm9ybURhdGEsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IHZhbHVlOiAncGhwJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmRhX1R5cGVQaHAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IHZhbHVlOiAncGxhaW50ZXh0JywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmRhX1R5cGVQbGFpbnRleHQgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUuZGFfU2VsZWN0VHlwZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmNoYW5nZUFjZU1vZGVcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFmdGVyUG9wdWxhdGU6IChmb3JtRGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIEF1dG8tcmVzaXplIHRleHRhcmVhIGFmdGVyIGRhdGEgaXMgcG9wdWxhdGVkXG4gICAgICAgICAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCd0ZXh0YXJlYVtuYW1lPVwiZGVzY3JpcHRpb25cIl0nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBDdXN0b20gdmFsaWRhdGlvbiBydWxlIGZvciBleHRlbnNpb24gZXhpc3RlbmNlXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leGlzdFJ1bGUgPSBmdW5jdGlvbih2YWx1ZSwgcGFyYW1ldGVyKSB7IFxuICAgIHJldHVybiAkKCcjJyArIHBhcmFtZXRlcikuaGFzQ2xhc3MoJ2hpZGRlbicpOyBcbn07XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbigpIHtcbiAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=