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
  $formObj: $('#dialplan-application-form'),
  $number: $('#extension'),
  $tabMenuItems: $('#application-code-menu .item'),
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9EaWFscGxhbkFwcGxpY2F0aW9ucy9kaWFscGxhbi1hcHBsaWNhdGlvbnMtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbImRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkiLCIkZm9ybU9iaiIsIiQiLCIkbnVtYmVyIiwiJHRhYk1lbnVJdGVtcyIsImRlZmF1bHRFeHRlbnNpb24iLCJlZGl0b3IiLCJjdXJyZW50QWN0aXZlVGFiIiwiaXNMb2FkaW5nRGF0YSIsImlzTmV3QXBwbGljYXRpb24iLCJpc0NvcHlNb2RlIiwidmFsaWRhdGVSdWxlcyIsIm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwiZGFfVmFsaWRhdGVOYW1lSXNFbXB0eSIsImRhX1ZhbGlkYXRlTmFtZVRvb0xvbmciLCJleHRlbnNpb24iLCJ2YWx1ZSIsImRhX1ZhbGlkYXRlRXh0ZW5zaW9uTnVtYmVyIiwiZGFfVmFsaWRhdGVFeHRlbnNpb25Jc0VtcHR5IiwiZGFfVmFsaWRhdGVFeHRlbnNpb25Eb3VibGUiLCJ1cGRhdGVFeHRlbnNpb25EaXNwbGF5IiwiZXh0ZW5zaW9uRGlzcGxheSIsInRleHQiLCJpbml0aWFsaXplIiwidGFiIiwiaGlzdG9yeSIsImhpc3RvcnlUeXBlIiwib25WaXNpYmxlIiwidGFiUGF0aCIsInNldFRpbWVvdXQiLCJyZXNpemUiLCJ0aW1lb3V0SWQiLCJvbiIsImNsZWFyVGltZW91dCIsIm5ld051bWJlciIsImZvcm0iLCJFeHRlbnNpb25zQVBJIiwiY2hlY2tBdmFpbGFiaWxpdHkiLCJGb3JtIiwidXJsIiwiY2JCZWZvcmVTZW5kRm9ybSIsImNiQWZ0ZXJTZW5kRm9ybSIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsIkRpYWxwbGFuQXBwbGljYXRpb25zQVBJIiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJpbml0aWFsaXplQWRhcHRpdmVUZXh0YXJlYSIsImluaXRpYWxpemVBY2UiLCJpbml0aWFsaXplRnVsbHNjcmVlbkhhbmRsZXJzIiwiaW5pdGlhbGl6ZUZvcm0iLCJGb3JtRWxlbWVudHMiLCJvcHRpbWl6ZVRleHRhcmVhU2l6ZSIsInJlY29yZElkIiwiZ2V0UmVjb3JkSWQiLCJjb3B5RnJvbUlkIiwidmFsIiwidXJsUGFyYW1zIiwiVVJMU2VhcmNoUGFyYW1zIiwid2luZG93IiwibG9jYXRpb24iLCJzZWFyY2giLCJjb3B5UGFyYW0iLCJnZXQiLCJzb3VyY2VJZCIsImNvcHkiLCJyZXNwb25zZSIsImhhbmRsZUFwcGxpY2F0aW9uRGF0YVJlc3BvbnNlIiwiZ2V0UmVjb3JkIiwicmVzdWx0IiwiZGF0YSIsIl9pc05ldyIsInBvcHVsYXRlRm9ybSIsImNvZGVDb250ZW50IiwiYXBwbGljYXRpb25sb2dpYyIsImdldFNlc3Npb24iLCJzZXRWYWx1ZSIsImNoYW5nZUFjZU1vZGUiLCJoYXNoIiwiZGF0YUNoYW5nZWQiLCJlcnJvck1lc3NhZ2UiLCJtZXNzYWdlcyIsImVycm9yIiwiam9pbiIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwiU2VjdXJpdHlVdGlscyIsImVzY2FwZUh0bWwiLCJ1cmxQYXJ0cyIsInBhdGhuYW1lIiwic3BsaXQiLCJtb2RpZnlJbmRleCIsImluZGV4T2YiLCJhY2VIZWlnaHQiLCJpbm5lckhlaWdodCIsInJvd3NDb3VudCIsIk1hdGgiLCJyb3VuZCIsImNzcyIsImFjZSIsImVkaXQiLCJzZXRUaGVtZSIsInNldE9wdGlvbnMiLCJtYXhMaW5lcyIsInNob3dQcmludE1hcmdpbiIsInNob3dMaW5lTnVtYmVycyIsImNvbW1hbmRzIiwiYWRkQ29tbWFuZCIsImJpbmRLZXkiLCJ3aW4iLCJtYWMiLCJleGVjIiwiY29uc29sZSIsIndhcm4iLCJjb250YWluZXIiLCJzaWJsaW5ncyIsInRvZ2dsZUZ1bGxTY3JlZW4iLCJkb2N1bWVudCIsImFkZEV2ZW50TGlzdGVuZXIiLCJhZGp1c3RFZGl0b3JIZWlnaHQiLCJjbGVhbnVwIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsIm9mZiIsImRlc3Ryb3kiLCJmdWxsc2NyZWVuRWxlbWVudCIsInJlcXVlc3RGdWxsc2NyZWVuIiwiZXJyIiwibWVzc2FnZSIsImV4aXRGdWxsc2NyZWVuIiwiJGNob2ljZSIsIm1vZGUiLCJOZXdNb2RlIiwicmVxdWlyZSIsIk1vZGUiLCJzZXNzaW9uIiwic2V0TW9kZSIsInNldHRpbmdzIiwiZ2V0VmFsdWUiLCJjdXJyZW50VGFiIiwiaWQiLCJ1bmlxaWQiLCJyZWRpcmVjdFRhYiIsImN1cnJlbnRJZCIsInBvcHVsYXRlRm9ybVNpbGVudGx5IiwiYmVmb3JlUG9wdWxhdGUiLCJmb3JtRGF0YSIsImxlbmd0aCIsIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwic3RhdGljT3B0aW9ucyIsImRhX1R5cGVQaHAiLCJkYV9UeXBlUGxhaW50ZXh0IiwicGxhY2Vob2xkZXIiLCJkYV9TZWxlY3RUeXBlIiwib25DaGFuZ2UiLCJhZnRlclBvcHVsYXRlIiwiZW5hYmxlRGlycml0eSIsImluaXRpYWxpemVEaXJyaXR5IiwiZm4iLCJleGlzdFJ1bGUiLCJwYXJhbWV0ZXIiLCJoYXNDbGFzcyIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLElBQUlBLHlCQUF5QixHQUFHO0FBQzVCQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyw0QkFBRCxDQURpQjtBQUU1QkMsRUFBQUEsT0FBTyxFQUFFRCxDQUFDLENBQUMsWUFBRCxDQUZrQjtBQUc1QkUsRUFBQUEsYUFBYSxFQUFFRixDQUFDLENBQUMsOEJBQUQsQ0FIWTtBQUk1QkcsRUFBQUEsZ0JBQWdCLEVBQUUsRUFKVTtBQUs1QkMsRUFBQUEsTUFBTSxFQUFFLElBTG9CO0FBTTVCQyxFQUFBQSxnQkFBZ0IsRUFBRSxNQU5VO0FBTUY7QUFDMUJDLEVBQUFBLGFB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QUEsS0FBSyxFQUFFLFdBQVQ7QUFBc0JNLGNBQUFBLElBQUksRUFBRVYsZUFBZSxDQUFDOEk7QUFBNUMsYUFGVyxDQURvQztBQUtuREMsWUFBQUEsV0FBVyxFQUFFL0ksZUFBZSxDQUFDZ0osYUFMc0I7QUFNbkRDLFlBQUFBLFFBQVEsRUFBRWxLLHlCQUF5QixDQUFDcUY7QUFOZSxXQUF2RDtBQVFIO0FBQ0osT0FiMkI7QUFjNUI4RSxNQUFBQSxhQUFhLEVBQUUsdUJBQUNWLFFBQUQsRUFBYztBQUN6QixZQUFJOUcsSUFBSSxDQUFDeUgsYUFBVCxFQUF3QjtBQUNwQnpILFVBQUFBLElBQUksQ0FBQzBILGlCQUFMO0FBQ0gsU0FId0IsQ0FLekI7OztBQUNBMUcsUUFBQUEsWUFBWSxDQUFDQyxvQkFBYixDQUFrQyw4QkFBbEM7QUFDSDtBQXJCMkIsS0FBaEM7QUF1Qkg7QUF6YzJCLENBQWhDO0FBNGNBO0FBQ0E7QUFDQTs7QUFDQTFELENBQUMsQ0FBQ29LLEVBQUYsQ0FBSzlILElBQUwsQ0FBVXdHLFFBQVYsQ0FBbUJsSSxLQUFuQixDQUF5QnlKLFNBQXpCLEdBQXFDLFVBQVNsSixLQUFULEVBQWdCbUosU0FBaEIsRUFBMkI7QUFDNUQsU0FBT3RLLENBQUMsQ0FBQyxNQUFNc0ssU0FBUCxDQUFELENBQW1CQyxRQUFuQixDQUE0QixRQUE1QixDQUFQO0FBQ0gsQ0FGRDtBQUlBO0FBQ0E7QUFDQTs7O0FBQ0F2SyxDQUFDLENBQUMySCxRQUFELENBQUQsQ0FBWTZDLEtBQVosQ0FBa0IsWUFBVztBQUN6QjFLLEVBQUFBLHlCQUF5QixDQUFDNEIsVUFBMUI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICovXG5cbi8qIGdsb2JhbCBEaWFscGxhbkFwcGxpY2F0aW9uc0FQSSwgRm9ybSwgU2VjdXJpdHlVdGlscywgZ2xvYmFsVHJhbnNsYXRlLCBFeHRlbnNpb25zQVBJLCBhY2UsIFVzZXJNZXNzYWdlLCBGb3JtRWxlbWVudHMgKi9cblxuLyoqXG4gKiBEaWFscGxhbiBhcHBsaWNhdGlvbiBlZGl0IGZvcm0gbWFuYWdlbWVudCBtb2R1bGUgd2l0aCBlbmhhbmNlZCBzZWN1cml0eVxuICovXG52YXIgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeSA9IHtcbiAgICAkZm9ybU9iajogJCgnI2RpYWxwbGFuLWFwcGxpY2F0aW9uLWZvcm0nKSxcbiAgICAkbnVtYmVyOiAkKCcjZXh0ZW5zaW9uJyksXG4gICAgJHRhYk1lbnVJdGVtczogJCgnI2FwcGxpY2F0aW9uLWNvZGUtbWVudSAuaXRlbScpLFxuICAgIGRlZmF1bHRFeHRlbnNpb246ICcnLFxuICAgIGVkaXRvcjogbnVsbCxcbiAgICBjdXJyZW50QWN0aXZlVGFiOiAnbWFpbicsIC8vIFRyYWNrIGN1cnJlbnQgYWN0aXZlIHRhYlxuICAgIGlzTG9hZGluZ0RhdGE6IGZhbHNlLCAvLyBGbGFnIHRvIHByZXZlbnQgYnV0dG9uIHJlYWN0aXZhdGlvbiBkdXJpbmcgZGF0YSBsb2FkaW5nXG5cbiAgICAvLyBUcmFjayBpZiB0aGlzIGlzIGEgbmV3IGFwcGxpY2F0aW9uIChub3QgZXhpc3RpbmcgaW4gZGF0YWJhc2UpXG4gICAgaXNOZXdBcHBsaWNhdGlvbjogZmFsc2UsXG5cbiAgICAvLyBUcmFjayBpZiB0aGlzIGlzIGNvcHkgbW9kZVxuICAgIGlzQ29weU1vZGU6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogRm9ybSB2YWxpZGF0aW9uIHJ1bGVzXG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBuYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnbmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZGFfVmFsaWRhdGVOYW1lSXNFbXB0eVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWF4TGVuZ3RoWzUwXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmRhX1ZhbGlkYXRlTmFtZVRvb0xvbmdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIGV4dGVuc2lvbjoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2V4dGVuc2lvbicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnL15bMC05IytcXFxcKnxYXXsxLDY0fSQvJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZGFfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmRhX1ZhbGlkYXRlRXh0ZW5zaW9uSXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4aXN0UnVsZVtleHRlbnNpb24tZXJyb3JdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZGFfVmFsaWRhdGVFeHRlbnNpb25Eb3VibGUsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBleHRlbnNpb24gZGlzcGxheSBpbiByaWJib24gbGFiZWxcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZXh0ZW5zaW9uIC0gRXh0ZW5zaW9uIG51bWJlclxuICAgICAqL1xuICAgIHVwZGF0ZUV4dGVuc2lvbkRpc3BsYXk6IGZ1bmN0aW9uKGV4dGVuc2lvbikge1xuICAgICAgICB2YXIgZXh0ZW5zaW9uRGlzcGxheSA9ICQoJyNleHRlbnNpb24tZGlzcGxheScpO1xuICAgICAgICBleHRlbnNpb25EaXNwbGF5LnRleHQoZXh0ZW5zaW9uIHx8ICcnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgbW9kdWxlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIEVuYWJsZSB0YWIgbmF2aWdhdGlvbiB3aXRoIGhpc3Rvcnkgc3VwcG9ydFxuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LiR0YWJNZW51SXRlbXMudGFiKHtcbiAgICAgICAgICAgIGhpc3Rvcnk6IHRydWUsXG4gICAgICAgICAgICBoaXN0b3J5VHlwZTogJ2hhc2gnLFxuICAgICAgICAgICAgb25WaXNpYmxlOiBmdW5jdGlvbih0YWJQYXRoKSB7XG4gICAgICAgICAgICAgICAgLy8gVHJhY2sgY3VycmVudCBhY3RpdmUgdGFiXG4gICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5jdXJyZW50QWN0aXZlVGFiID0gdGFiUGF0aDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZXNpemUgQUNFIGVkaXRvciB3aGVuIGNvZGUgdGFiIGJlY29tZXMgdmlzaWJsZVxuICAgICAgICAgICAgICAgIGlmICh0YWJQYXRoID09PSAnY29kZScgJiYgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5yZXNpemUoKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pOyAgICAgICAgXG4gICAgICAgIC8vIEV4dGVuc2lvbiBhdmFpbGFiaWxpdHkgY2hlY2tcbiAgICAgICAgdmFyIHRpbWVvdXRJZDtcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS4kbnVtYmVyLm9uKCdpbnB1dCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKHRpbWVvdXRJZCkgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIG5ld051bWJlciA9IGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGVuc2lvbicpO1xuICAgICAgICAgICAgICAgIEV4dGVuc2lvbnNBUEkuY2hlY2tBdmFpbGFiaWxpdHkoZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5kZWZhdWx0RXh0ZW5zaW9uLCBuZXdOdW1iZXIpO1xuICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDb25maWd1cmUgRm9ybS5qcyBmb3IgUkVTVCBBUElcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuY2JBZnRlclNlbmRGb3JtO1xuICAgICAgICBcbiAgICAgICAgLy8gUkVTVCBBUEkgdjMgaW50ZWdyYXRpb25cbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBEaWFscGxhbkFwcGxpY2F0aW9uc0FQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVSZWNvcmQnOyAvLyBVc2Ugc2F2ZVJlY29yZCBtZXRob2QgZnJvbSBQYnhBcGlDbGllbnRcbiAgICAgICAgXG4gICAgICAgIC8vIE5hdmlnYXRpb24gVVJMc1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBnbG9iYWxSb290VXJsICsgJ2RpYWxwbGFuLWFwcGxpY2F0aW9ucy9pbmRleC8nO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gZ2xvYmFsUm9vdFVybCArICdkaWFscGxhbi1hcHBsaWNhdGlvbnMvbW9kaWZ5Lyc7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgYWRhcHRpdmUgdGV4dGFyZWEgZm9yIGRlc2NyaXB0aW9uIGZpZWxkXG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuaW5pdGlhbGl6ZUFkYXB0aXZlVGV4dGFyZWEoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY29tcG9uZW50c1xuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmluaXRpYWxpemVBY2UoKTtcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5pbml0aWFsaXplRnVsbHNjcmVlbkhhbmRsZXJzKCk7XG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhZGFwdGl2ZSB0ZXh0YXJlYSBmb3IgZGVzY3JpcHRpb24gZmllbGRcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQWRhcHRpdmVUZXh0YXJlYTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIFNldCB1cCBhZGFwdGl2ZSByZXNpemluZyBmb3IgZGVzY3JpcHRpb24gdGV4dGFyZWFcbiAgICAgICAgJCgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJykub24oJ2lucHV0IHBhc3RlIGtleXVwJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJCh0aGlzKSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbCByZXNpemUgYWZ0ZXIgZm9ybSBkYXRhIGlzIGxvYWRlZFxuICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGZvcm0gZGF0YSB2aWEgUkVTVCBBUElcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIEdldCByZWNvcmQgSUQgZnJvbSBVUkxcbiAgICAgICAgdmFyIHJlY29yZElkID0gZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5nZXRSZWNvcmRJZCgpO1xuXG4gICAgICAgIC8vIENoZWNrIGZvciBjb3B5IG1vZGUgZnJvbSBVUkwgcGFyYW1ldGVyIG9yIGhpZGRlbiBmaWVsZFxuICAgICAgICB2YXIgY29weUZyb21JZCA9ICQoJyNjb3B5LWZyb20taWQnKS52YWwoKTtcbiAgICAgICAgdmFyIHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG4gICAgICAgIHZhciBjb3B5UGFyYW0gPSB1cmxQYXJhbXMuZ2V0KCdjb3B5Jyk7XG5cbiAgICAgICAgLy8gUmVzZXQgZmxhZ3NcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5pc0NvcHlNb2RlID0gZmFsc2U7XG5cbiAgICAgICAgaWYgKGNvcHlQYXJhbSB8fCBjb3B5RnJvbUlkKSB7XG4gICAgICAgICAgICAvLyBDb3B5IG1vZGUgLSB1c2UgdGhlIG5ldyBSRVNUZnVsIGNvcHkgZW5kcG9pbnRcbiAgICAgICAgICAgIHZhciBzb3VyY2VJZCA9IGNvcHlQYXJhbSB8fCBjb3B5RnJvbUlkO1xuICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5pc0NvcHlNb2RlID0gdHJ1ZTtcbiAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuaXNOZXdBcHBsaWNhdGlvbiA9IHRydWU7IC8vIENvcHkgY3JlYXRlcyBhIG5ldyBhcHBsaWNhdGlvblxuXG4gICAgICAgICAgICAvLyBDYWxsIHRoZSBjb3B5IGN1c3RvbSBtZXRob2RcbiAgICAgICAgICAgIERpYWxwbGFuQXBwbGljYXRpb25zQVBJLmNvcHkoc291cmNlSWQsIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5oYW5kbGVBcHBsaWNhdGlvbkRhdGFSZXNwb25zZShyZXNwb25zZSwgJycpOyAvLyBFbXB0eSBJRCBmb3IgbmV3IGFwcGxpY2F0aW9uXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIERldGVybWluZSBpZiB0aGlzIGlzIGEgbmV3IGFwcGxpY2F0aW9uXG4gICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmlzTmV3QXBwbGljYXRpb24gPSAhcmVjb3JkSWQgfHwgcmVjb3JkSWQgPT09ICcnIHx8IHJlY29yZElkID09PSAnbmV3JztcblxuICAgICAgICAgICAgLy8gVXNlIGdldFJlY29yZCBtZXRob2QgZnJvbSBQYnhBcGlDbGllbnRcbiAgICAgICAgICAgIC8vIEl0IGF1dG9tYXRpY2FsbHkgaGFuZGxlcyBuZXcgcmVjb3JkcyAoY2FsbHMgZ2V0RGVmYXVsdCkgYW5kIGV4aXN0aW5nIHJlY29yZHNcbiAgICAgICAgICAgIERpYWxwbGFuQXBwbGljYXRpb25zQVBJLmdldFJlY29yZChyZWNvcmRJZCB8fCAnbmV3JywgZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmhhbmRsZUFwcGxpY2F0aW9uRGF0YVJlc3BvbnNlKHJlc3BvbnNlLCByZWNvcmRJZCk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIYW5kbGUgYXBwbGljYXRpb24gZGF0YSByZXNwb25zZSBmcm9tIEFQSVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIEFQSSByZXNwb25zZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByZWNvcmRJZCAtIEFwcGxpY2F0aW9uIElEXG4gICAgICogQHJldHVybnMge3ZvaWR9XG4gICAgICovXG4gICAgaGFuZGxlQXBwbGljYXRpb25EYXRhUmVzcG9uc2U6IGZ1bmN0aW9uKHJlc3BvbnNlLCByZWNvcmRJZCkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgIC8vIERPIE5PVCBjaGFuZ2UgaXNOZXdBcHBsaWNhdGlvbiBoZXJlIC0gaXQgc2hvdWxkIGJlIHNldCBvbmx5IG9uY2UgaW4gaW5pdGlhbGl6ZUZvcm0oKVxuICAgICAgICAgICAgLy8gYmFzZWQgb24gSE9XIHRoZSBmb3JtIHdhcyBvcGVuZWQsIG5vdCBiYXNlZCBvbiBzZXJ2ZXIgcmVzcG9uc2UgZGF0YVxuXG4gICAgICAgICAgICAvLyBTZXQgdGhlIF9pc05ldyBmbGFnIGZvciBuZXcgYXBwbGljYXRpb25zIGJhc2VkIG9uIHRoZSBmbGFnIHdlIHNldCBlYXJsaWVyXG4gICAgICAgICAgICBpZiAoZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5pc05ld0FwcGxpY2F0aW9uKSB7XG4gICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YS5faXNOZXcgPSB0cnVlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBEYXRhIGlzIGFscmVhZHkgc2FuaXRpemVkIGluIEFQSSBtb2R1bGVcbiAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5kZWZhdWx0RXh0ZW5zaW9uID0gcmVzcG9uc2UuZGF0YS5leHRlbnNpb247XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBleHRlbnNpb24gbnVtYmVyIGRpc3BsYXkgaW4gdGhlIHJpYmJvbiBsYWJlbFxuICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS51cGRhdGVFeHRlbnNpb25EaXNwbGF5KHJlc3BvbnNlLmRhdGEuZXh0ZW5zaW9uKTtcblxuICAgICAgICAgICAgLy8gU2V0IEFDRSBlZGl0b3IgY29udGVudCAoYXBwbGljYXRpb25sb2dpYyBpcyBub3Qgc2FuaXRpemVkKVxuICAgICAgICAgICAgdmFyIGNvZGVDb250ZW50ID0gcmVzcG9uc2UuZGF0YS5hcHBsaWNhdGlvbmxvZ2ljIHx8ICcnO1xuXG4gICAgICAgICAgICAvLyBTZXQgZmxhZyB0byBwcmV2ZW50IHJlYWN0aXZhdGluZyBidXR0b25zIGR1cmluZyBkYXRhIGxvYWRcbiAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuaXNMb2FkaW5nRGF0YSA9IHRydWU7XG5cbiAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLmdldFNlc3Npb24oKS5zZXRWYWx1ZShjb2RlQ29udGVudCk7XG4gICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmNoYW5nZUFjZU1vZGUoKTtcblxuICAgICAgICAgICAgLy8gQ2xlYXIgbG9hZGluZyBmbGFnIGFmdGVyIHNldHRpbmcgY29udGVudFxuICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5pc0xvYWRpbmdEYXRhID0gZmFsc2U7XG5cbiAgICAgICAgICAgIC8vIERldGVybWluZSB3aGljaCB0YWIgdG8gc2hvd1xuICAgICAgICAgICAgaWYgKGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuaXNOZXdBcHBsaWNhdGlvbiB8fCBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmlzQ29weU1vZGUpIHtcbiAgICAgICAgICAgICAgICAvLyBTd2l0Y2ggdG8gbWFpbiB0YWIgZm9yIG5ldyByZWNvcmRzIG9yIGNvcHkgbW9kZVxuICAgICAgICAgICAgICAgIGlmICghd2luZG93LmxvY2F0aW9uLmhhc2gpIHtcbiAgICAgICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS4kdGFiTWVudUl0ZW1zLnRhYignY2hhbmdlIHRhYicsICdtYWluJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBGb3IgZXhpc3RpbmcgcmVjb3JkcywgaGFzaCBoaXN0b3J5IHdpbGwgcHJlc2VydmUgdGhlIHRhYlxuICAgICAgICAgICAgICAgIGlmICghcmVzcG9uc2UuZGF0YS5uYW1lICYmICFyZXNwb25zZS5kYXRhLmV4dGVuc2lvbiAmJiAhd2luZG93LmxvY2F0aW9uLmhhc2gpIHtcbiAgICAgICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS4kdGFiTWVudUl0ZW1zLnRhYignY2hhbmdlIHRhYicsICdtYWluJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBNYXJrIGZvcm0gYXMgY2hhbmdlZCBpZiBpbiBjb3B5IG1vZGUgdG8gZW5hYmxlIHNhdmUgYnV0dG9uXG4gICAgICAgICAgICBpZiAoZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5pc0NvcHlNb2RlKSB7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBBdXRvLXJlc2l6ZSB0ZXh0YXJlYSBhZnRlciBkYXRhIGlzIGxvYWRlZCAod2l0aCBzbWFsbCBkZWxheSBmb3IgRE9NIHVwZGF0ZSlcbiAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCd0ZXh0YXJlYVtuYW1lPVwiZGVzY3JpcHRpb25cIl0nKTtcbiAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgIH0gZWxzZSBpZiAocmVjb3JkSWQgJiYgcmVjb3JkSWQgIT09ICduZXcnKSB7XG4gICAgICAgICAgICB2YXIgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXMgJiYgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3IgP1xuICAgICAgICAgICAgICAgIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLmpvaW4oJywgJykgOlxuICAgICAgICAgICAgICAgICdGYWlsZWQgdG8gbG9hZCBkaWFscGxhbiBhcHBsaWNhdGlvbiBkYXRhJztcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZXJyb3JNZXNzYWdlKSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCByZWNvcmQgSUQgZnJvbSBVUkxcbiAgICAgKiBcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IFJlY29yZCBJRFxuICAgICAqL1xuICAgIGdldFJlY29yZElkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHVybFBhcnRzID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnNwbGl0KCcvJyk7XG4gICAgICAgIHZhciBtb2RpZnlJbmRleCA9IHVybFBhcnRzLmluZGV4T2YoJ21vZGlmeScpO1xuICAgICAgICBpZiAobW9kaWZ5SW5kZXggIT09IC0xICYmIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV0pIHtcbiAgICAgICAgICAgIHJldHVybiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgQUNFIGVkaXRvciB3aXRoIHNlY3VyaXR5IGNvbnNpZGVyYXRpb25zXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUFjZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBhY2VIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSAzODA7XG4gICAgICAgIHZhciByb3dzQ291bnQgPSBNYXRoLnJvdW5kKGFjZUhlaWdodCAvIDE2LjMpO1xuICAgICAgICBcbiAgICAgICAgJCh3aW5kb3cpLm9uKCdsb2FkJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJCgnLmFwcGxpY2F0aW9uLWNvZGUnKS5jc3MoJ21pbi1oZWlnaHQnLCBhY2VIZWlnaHQgKyAncHgnKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvciA9IGFjZS5lZGl0KCdhcHBsaWNhdGlvbi1jb2RlJyk7XG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5yZXNpemUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFRyYWNrIGNoYW5nZXMgZm9yIEZvcm0uanNcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IuZ2V0U2Vzc2lvbigpLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vIElnbm9yZSBjaGFuZ2VzIGR1cmluZyBkYXRhIGxvYWRpbmcgdG8gcHJldmVudCByZWFjdGl2YXRpbmcgYnV0dG9uc1xuICAgICAgICAgICAgaWYgKCFkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmlzTG9hZGluZ0RhdGEpIHtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3Iuc2V0T3B0aW9ucyh7XG4gICAgICAgICAgICBtYXhMaW5lczogcm93c0NvdW50LFxuICAgICAgICAgICAgc2hvd1ByaW50TWFyZ2luOiBmYWxzZSxcbiAgICAgICAgICAgIHNob3dMaW5lTnVtYmVyczogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZWN1cml0eTogcHJldmVudCBjb2RlIGV4ZWN1dGlvbiBpbiBlZGl0b3JcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IuY29tbWFuZHMuYWRkQ29tbWFuZCh7XG4gICAgICAgICAgICBuYW1lOiAncHJldmVudENvZGVFeGVjdXRpb24nLFxuICAgICAgICAgICAgYmluZEtleToge3dpbjogJ0N0cmwtRScsIG1hYzogJ0NvbW1hbmQtRSd9LFxuICAgICAgICAgICAgZXhlYzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdDb2RlIGV4ZWN1dGlvbiBwcmV2ZW50ZWQgZm9yIHNlY3VyaXR5Jyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZnVsbHNjcmVlbiBoYW5kbGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGdWxsc2NyZWVuSGFuZGxlcnM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAkKCcuZnVsbHNjcmVlbi10b2dnbGUtYnRuJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGNvbnRhaW5lciA9ICQodGhpcykuc2libGluZ3MoJy5hcHBsaWNhdGlvbi1jb2RlJylbMF07XG4gICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LnRvZ2dsZUZ1bGxTY3JlZW4oY29udGFpbmVyKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignZnVsbHNjcmVlbmNoYW5nZScsIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuYWRqdXN0RWRpdG9ySGVpZ2h0KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xlYW51cCBldmVudCBsaXN0ZW5lcnMgdG8gcHJldmVudCBtZW1vcnkgbGVha3NcbiAgICAgKi9cbiAgICBjbGVhbnVwOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gUmVtb3ZlIGZ1bGxzY3JlZW4gZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignZnVsbHNjcmVlbmNoYW5nZScsIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuYWRqdXN0RWRpdG9ySGVpZ2h0KTtcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFudXAgb3RoZXIgZXZlbnQgbGlzdGVuZXJzIGlmIG5lZWRlZFxuICAgICAgICAkKHdpbmRvdykub2ZmKCdsb2FkJyk7XG4gICAgICAgICQoJy5mdWxsc2NyZWVuLXRvZ2dsZS1idG4nKS5vZmYoJ2NsaWNrJyk7XG4gICAgICAgICQoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpLm9mZignaW5wdXQgcGFzdGUga2V5dXAnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFudXAgQUNFIGVkaXRvclxuICAgICAgICBpZiAoZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IpIHtcbiAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLmRlc3Ryb3koKTtcbiAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIGZ1bGxzY3JlZW4gbW9kZVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGNvbnRhaW5lciAtIENvbnRhaW5lciBlbGVtZW50XG4gICAgICovXG4gICAgdG9nZ2xlRnVsbFNjcmVlbjogZnVuY3Rpb24oY29udGFpbmVyKSB7XG4gICAgICAgIGlmICghZG9jdW1lbnQuZnVsbHNjcmVlbkVsZW1lbnQpIHtcbiAgICAgICAgICAgIGNvbnRhaW5lci5yZXF1ZXN0RnVsbHNjcmVlbigpLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGF0dGVtcHRpbmcgdG8gZW5hYmxlIGZ1bGwtc2NyZWVuIG1vZGU6ICcgKyBlcnIubWVzc2FnZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRvY3VtZW50LmV4aXRGdWxsc2NyZWVuKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRqdXN0IGVkaXRvciBoZWlnaHQgb24gZnVsbHNjcmVlbiBjaGFuZ2VcbiAgICAgKi9cbiAgICBhZGp1c3RFZGl0b3JIZWlnaHQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5yZXNpemUoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENoYW5nZSBBQ0UgZWRpdG9yIG1vZGUgYmFzZWQgb24gdHlwZVxuICAgICAqL1xuICAgIGNoYW5nZUFjZU1vZGU6IGZ1bmN0aW9uKHZhbHVlLCB0ZXh0LCAkY2hvaWNlKSB7XG4gICAgICAgIC8vIEdldCBtb2RlIHZhbHVlIC0gY2FuIGJlIHBhc3NlZCBhcyBwYXJhbWV0ZXIgb3IgZnJvbSBoaWRkZW4gaW5wdXRcbiAgICAgICAgdmFyIG1vZGUgPSB2YWx1ZSB8fCAkKCcjdHlwZScpLnZhbCgpO1xuICAgICAgICB2YXIgTmV3TW9kZTtcblxuICAgICAgICBpZiAobW9kZSA9PT0gJ3BocCcpIHtcbiAgICAgICAgICAgIE5ld01vZGUgPSBhY2UucmVxdWlyZSgnYWNlL21vZGUvcGhwJykuTW9kZTtcbiAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLnNldE9wdGlvbnMoe1xuICAgICAgICAgICAgICAgIHNob3dMaW5lTnVtYmVyczogdHJ1ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBOZXdNb2RlID0gYWNlLnJlcXVpcmUoJ2FjZS9tb2RlL2p1bGlhJykuTW9kZTtcbiAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLnNldE9wdGlvbnMoe1xuICAgICAgICAgICAgICAgIHNob3dMaW5lTnVtYmVyczogZmFsc2VcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3Iuc2Vzc2lvbi5zZXRNb2RlKG5ldyBOZXdNb2RlKCkpO1xuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5zZXRUaGVtZSgnYWNlL3RoZW1lL21vbm9rYWknKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGJlZm9yZSBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3MgLSBGb3JtIHNldHRpbmdzXG4gICAgICogQHJldHVybiB7b2JqZWN0fGZhbHNlfSBNb2RpZmllZCBzZXR0aW5ncyBvciBmYWxzZSB0byBjYW5jZWxcbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtOiBmdW5jdGlvbihzZXR0aW5ncykge1xuICAgICAgICB2YXIgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgYXBwbGljYXRpb24gbG9naWMgZnJvbSBBQ0UgZWRpdG9yIChub3Qgc2FuaXRpemVkKVxuICAgICAgICByZXN1bHQuZGF0YS5hcHBsaWNhdGlvbmxvZ2ljID0gZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IuZ2V0VmFsdWUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFBhc3MgY3VycmVudCBhY3RpdmUgdGFiIGZvciByZWRpcmVjdFxuICAgICAgICByZXN1bHQuZGF0YS5jdXJyZW50VGFiID0gZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5jdXJyZW50QWN0aXZlVGFiO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHJlY29yZCBJRCBmb3IgdXBkYXRlc1xuICAgICAgICB2YXIgcmVjb3JkSWQgPSBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmdldFJlY29yZElkKCk7XG4gICAgICAgIGlmIChyZWNvcmRJZCAmJiByZWNvcmRJZCAhPT0gJycpIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmlkID0gcmVjb3JkSWQ7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS51bmlxaWQgPSByZWNvcmRJZDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGZvcm0gc3VibWlzc2lvbiAobm8gc3VjY2VzcyBtZXNzYWdlcyAtIFVJIHVwZGF0ZXMgb25seSlcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFNlcnZlciByZXNwb25zZVxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybTogZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBEYXRhIGlzIGFscmVhZHkgc2FuaXRpemVkIGluIEFQSSBtb2R1bGVcbiAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcblxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBleHRlbnNpb24gbnVtYmVyIGRpc3BsYXkgaW4gdGhlIHJpYmJvbiBsYWJlbFxuICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkudXBkYXRlRXh0ZW5zaW9uRGlzcGxheShyZXNwb25zZS5kYXRhLmV4dGVuc2lvbik7XG5cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgQUNFIGVkaXRvciBjb250ZW50XG4gICAgICAgICAgICAgICAgdmFyIGNvZGVDb250ZW50ID0gcmVzcG9uc2UuZGF0YS5hcHBsaWNhdGlvbmxvZ2ljIHx8ICcnO1xuICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLmdldFNlc3Npb24oKS5zZXRWYWx1ZShjb2RlQ29udGVudCk7XG5cbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgcmVkaXJlY3Qgd2l0aCB0YWIgcHJlc2VydmF0aW9uXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEucmVkaXJlY3RUYWIgJiYgcmVzcG9uc2UuZGF0YS5yZWRpcmVjdFRhYiAhPT0gJ21haW4nKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBGb3JtLmpzIHJlZGlyZWN0IFVSTCB0byBpbmNsdWRlIGhhc2hcbiAgICAgICAgICAgICAgICAgICAgdmFyIGN1cnJlbnRJZCA9ICQoJyNpZCcpLnZhbCgpIHx8IHJlc3BvbnNlLmRhdGEudW5pcWlkO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY3VycmVudElkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gZ2xvYmFsUm9vdFVybCArICdkaWFscGxhbi1hcHBsaWNhdGlvbnMvbW9kaWZ5LycgKyBjdXJyZW50SWQgKyAnIy8nICsgcmVzcG9uc2UuZGF0YS5yZWRpcmVjdFRhYjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRm9ybS5qcyB3aWxsIGhhbmRsZSBhbGwgcmVkaXJlY3QgbG9naWMgYmFzZWQgb24gc3VibWl0TW9kZVxuXG4gICAgICAgICAgICAvLyBObyBzdWNjZXNzIG1lc3NhZ2UgLSBqdXN0IHNpbGVudCB1cGRhdGVcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIHNhbml0aXplZCBkYXRhXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIEZvcm0gZGF0YVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybTogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAvLyBVc2UgdW5pZmllZCBzaWxlbnQgcG9wdWxhdGlvbiBhcHByb2FjaFxuICAgICAgICAvLyBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5IHdpbGwgaGFuZGxlIF9pc05ldyBmbGFnIGF1dG9tYXRpY2FsbHkgKGxpbmVzIDc2Ni03NzkgaW4gZm9ybS5qcylcbiAgICAgICAgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseShkYXRhLCB7XG4gICAgICAgICAgICBiZWZvcmVQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93biBpZiBub3QgYWxyZWFkeSBkb25lXG4gICAgICAgICAgICAgICAgaWYgKCEkKCcjdHlwZS1kcm9wZG93bicpLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ3R5cGUnLCBmb3JtRGF0YSwge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGljT3B0aW9uczogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgdmFsdWU6ICdwaHAnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZGFfVHlwZVBocCB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgdmFsdWU6ICdwbGFpbnRleHQnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZGFfVHlwZVBsYWludGV4dCB9XG4gICAgICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5kYV9TZWxlY3RUeXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U6IGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuY2hhbmdlQWNlTW9kZVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWZ0ZXJQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gQXV0by1yZXNpemUgdGV4dGFyZWEgYWZ0ZXIgZGF0YSBpcyBwb3B1bGF0ZWRcbiAgICAgICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEN1c3RvbSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGV4dGVuc2lvbiBleGlzdGVuY2VcbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4aXN0UnVsZSA9IGZ1bmN0aW9uKHZhbHVlLCBwYXJhbWV0ZXIpIHsgXG4gICAgcmV0dXJuICQoJyMnICsgcGFyYW1ldGVyKS5oYXNDbGFzcygnaGlkZGVuJyk7IFxufTtcblxuLyoqXG4gKiBJbml0aWFsaXplIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uKCkge1xuICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==