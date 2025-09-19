"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 */

/* global DialplanApplicationsAPI, Form, SecurityUtils, globalTranslate, Extensions, ace, UserMessage, FormElements */

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
    var recordId = dialplanApplicationModify.getRecordId();
    var copyFromId = $('#copy-from-id').val();
    var urlParams = new URLSearchParams(window.location.search);
    var copyParam = urlParams.get('copy');
    var isCopyMode = copyParam || copyFromId; // Check copy mode first (before checking for new record)

    if (isCopyMode) {
      // Use the RESTful copy method
      var sourceId = copyParam || copyFromId;
      DialplanApplicationsAPI.copy(sourceId, function (response) {
        if (response.result) {
          // Data is already sanitized in API module
          dialplanApplicationModify.populateForm(response.data);
          dialplanApplicationModify.defaultExtension = response.data.extension; // Update extension number display in the ribbon label

          dialplanApplicationModify.updateExtensionDisplay(response.data.extension); // Set ACE editor content (applicationlogic is not sanitized)

          var codeContent = response.data.applicationlogic || ''; // Set flag to prevent reactivating buttons during data load

          dialplanApplicationModify.isLoadingData = true;
          dialplanApplicationModify.editor.getSession().setValue(codeContent);
          dialplanApplicationModify.changeAceMode(); // Clear loading flag after setting content

          dialplanApplicationModify.isLoadingData = false; // Switch to main tab for copy mode

          if (!window.location.hash) {
            dialplanApplicationModify.$tabMenuItems.tab('change tab', 'main');
          } // Mark form as changed for copy mode to enable save button


          Form.dataChanged(); // Auto-resize textarea after data is loaded (with small delay for DOM update)

          setTimeout(function () {
            FormElements.optimizeTextareaSize('textarea[name="description"]');
          }, 100);
        } else {
          var errorMessage = response.messages && response.messages.error ? response.messages.error.join(', ') : 'Failed to copy dialplan application';
          UserMessage.showError(SecurityUtils.escapeHtml(errorMessage));
        }
      });
    } else if (!recordId || recordId === '') {
      // For new records, get default values
      DialplanApplicationsAPI.getDefault(function (response) {
        if (response.result) {
          dialplanApplicationModify.populateForm(response.data);
          dialplanApplicationModify.defaultExtension = response.data.extension;
          dialplanApplicationModify.updateExtensionDisplay(response.data.extension); // Switch to main tab for new records

          if (!window.location.hash) {
            dialplanApplicationModify.$tabMenuItems.tab('change tab', 'main');
          } // Auto-resize textarea after data is loaded


          setTimeout(function () {
            FormElements.optimizeTextareaSize('textarea[name="description"]');
          }, 100);
        } else {
          var errorMessage = response.messages && response.messages.error ? response.messages.error.join(', ') : 'Failed to load default values';
          UserMessage.showError(SecurityUtils.escapeHtml(errorMessage));
        }
      });
    } else {
      // For existing records, get record data
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
          } // Auto-resize textarea after data is loaded (with small delay for DOM update)


          setTimeout(function () {
            FormElements.optimizeTextareaSize('textarea[name="description"]');
          }, 100);
        } else {
          var errorMessage = response.messages && response.messages.error ? response.messages.error.join(', ') : 'Failed to load dialplan application data';
          UserMessage.showError(SecurityUtils.escapeHtml(errorMessage));
        }
      });
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9EaWFscGxhbkFwcGxpY2F0aW9ucy9kaWFscGxhbi1hcHBsaWNhdGlvbnMtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbImRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkiLCIkZm9ybU9iaiIsIiQiLCIkbnVtYmVyIiwiJHRhYk1lbnVJdGVtcyIsImRlZmF1bHRFeHRlbnNpb24iLCJlZGl0b3IiLCJjdXJyZW50QWN0aXZlVGFiIiwiaXNMb2FkaW5nRGF0YSIsInZhbGlkYXRlUnVsZXMiLCJuYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImRhX1ZhbGlkYXRlTmFtZUlzRW1wdHkiLCJkYV9WYWxpZGF0ZU5hbWVUb29Mb25nIiwiZXh0ZW5zaW9uIiwidmFsdWUiLCJkYV9WYWxpZGF0ZUV4dGVuc2lvbk51bWJlciIsImRhX1ZhbGlkYXRlRXh0ZW5zaW9uSXNFbXB0eSIsImRhX1ZhbGlkYXRlRXh0ZW5zaW9uRG91YmxlIiwidXBkYXRlRXh0ZW5zaW9uRGlzcGxheSIsImV4dGVuc2lvbkRpc3BsYXkiLCJ0ZXh0IiwiaW5pdGlhbGl6ZSIsInRhYiIsImhpc3RvcnkiLCJoaXN0b3J5VHlwZSIsIm9uVmlzaWJsZSIsInRhYlBhdGgiLCJzZXRUaW1lb3V0IiwicmVzaXplIiwidGltZW91dElkIiwib24iLCJjbGVhclRpbWVvdXQiLCJuZXdOdW1iZXIiLCJmb3JtIiwiRXh0ZW5zaW9ucyIsImNoZWNrQXZhaWxhYmlsaXR5IiwiRm9ybSIsInVybCIsImNiQmVmb3JlU2VuZEZvcm0iLCJjYkFmdGVyU2VuZEZvcm0iLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJEaWFscGxhbkFwcGxpY2F0aW9uc0FQSSIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwiaW5pdGlhbGl6ZUFkYXB0aXZlVGV4dGFyZWEiLCJpbml0aWFsaXplQWNlIiwiaW5pdGlhbGl6ZUZ1bGxzY3JlZW5IYW5kbGVycyIsImluaXRpYWxpemVGb3JtIiwiRm9ybUVsZW1lbnRzIiwib3B0aW1pemVUZXh0YXJlYVNpemUiLCJyZWNvcmRJZCIsImdldFJlY29yZElkIiwiY29weUZyb21JZCIsInZhbCIsInVybFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsIndpbmRvdyIsImxvY2F0aW9uIiwic2VhcmNoIiwiY29weVBhcmFtIiwiZ2V0IiwiaXNDb3B5TW9kZSIsInNvdXJjZUlkIiwiY29weSIsInJlc3BvbnNlIiwicmVzdWx0IiwicG9wdWxhdGVGb3JtIiwiZGF0YSIsImNvZGVDb250ZW50IiwiYXBwbGljYXRpb25sb2dpYyIsImdldFNlc3Npb24iLCJzZXRWYWx1ZSIsImNoYW5nZUFjZU1vZGUiLCJoYXNoIiwiZGF0YUNoYW5nZWQiLCJlcnJvck1lc3NhZ2UiLCJtZXNzYWdlcyIsImVycm9yIiwiam9pbiIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwiU2VjdXJpdHlVdGlscyIsImVzY2FwZUh0bWwiLCJnZXREZWZhdWx0IiwiZ2V0UmVjb3JkIiwidXJsUGFydHMiLCJwYXRobmFtZSIsInNwbGl0IiwibW9kaWZ5SW5kZXgiLCJpbmRleE9mIiwiYWNlSGVpZ2h0IiwiaW5uZXJIZWlnaHQiLCJyb3dzQ291bnQiLCJNYXRoIiwicm91bmQiLCJjc3MiLCJhY2UiLCJlZGl0Iiwic2V0VGhlbWUiLCJzZXRPcHRpb25zIiwibWF4TGluZXMiLCJzaG93UHJpbnRNYXJnaW4iLCJzaG93TGluZU51bWJlcnMiLCJjb21tYW5kcyIsImFkZENvbW1hbmQiLCJiaW5kS2V5Iiwid2luIiwibWFjIiwiZXhlYyIsImNvbnNvbGUiLCJ3YXJuIiwiY29udGFpbmVyIiwic2libGluZ3MiLCJ0b2dnbGVGdWxsU2NyZWVuIiwiZG9jdW1lbnQiLCJhZGRFdmVudExpc3RlbmVyIiwiYWRqdXN0RWRpdG9ySGVpZ2h0IiwiY2xlYW51cCIsInJlbW92ZUV2ZW50TGlzdGVuZXIiLCJvZmYiLCJkZXN0cm95IiwiZnVsbHNjcmVlbkVsZW1lbnQiLCJyZXF1ZXN0RnVsbHNjcmVlbiIsImVyciIsIm1lc3NhZ2UiLCJleGl0RnVsbHNjcmVlbiIsIiRjaG9pY2UiLCJtb2RlIiwiTmV3TW9kZSIsInJlcXVpcmUiLCJNb2RlIiwic2Vzc2lvbiIsInNldE1vZGUiLCJzZXR0aW5ncyIsImdldFZhbHVlIiwiY3VycmVudFRhYiIsImlkIiwidW5pcWlkIiwicmVkaXJlY3RUYWIiLCJjdXJyZW50SWQiLCJwb3B1bGF0ZUZvcm1TaWxlbnRseSIsImJlZm9yZVBvcHVsYXRlIiwiZm9ybURhdGEiLCJsZW5ndGgiLCJEeW5hbWljRHJvcGRvd25CdWlsZGVyIiwiYnVpbGREcm9wZG93biIsInN0YXRpY09wdGlvbnMiLCJkYV9UeXBlUGhwIiwiZGFfVHlwZVBsYWludGV4dCIsInBsYWNlaG9sZGVyIiwiZGFfU2VsZWN0VHlwZSIsIm9uQ2hhbmdlIiwiYWZ0ZXJQb3B1bGF0ZSIsImVuYWJsZURpcnJpdHkiLCJpbml0aWFsaXplRGlycml0eSIsImZuIiwiZXhpc3RSdWxlIiwicGFyYW1ldGVyIiwiaGFzQ2xhc3MiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxJQUFJQSx5QkFBeUIsR0FBRztBQUM1QkMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMsNEJBQUQsQ0FEaUI7QUFFNUJDLEVBQUFBLE9BQU8sRUFBRUQsQ0FBQyxDQUFDLFlBQUQsQ0FGa0I7QUFHNUJFLEVBQUFBLGFBQWEsRUFBRUYsQ0FBQyxDQUFDLDhCQUFELENBSFk7QUFJNUJHLEVBQUFBLGdCQUFnQixFQUFFLEVBSlU7QUFLNUJDLEVBQUFBLE1BQU0sRUFBRSxJQUxvQjtBQU01QkMsRUFBQUEsZ0JBQWdCLEVBQUUsTUFOVTtBQU1GO0FBQzFCQyxFQUFBQSxhQUFhLEVBQUUsS0FQYTtBQU9OOztBQUV0QjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsYUFB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QUFBNUMsYUFGVyxDQURvQztBQUtuREMsWUFBQUEsV0FBVyxFQUFFL0ksZUFBZSxDQUFDZ0osYUFMc0I7QUFNbkRDLFlBQUFBLFFBQVEsRUFBRWhLLHlCQUF5QixDQUFDaUY7QUFOZSxXQUF2RDtBQVFIO0FBQ0osT0FiMkI7QUFjNUJnRixNQUFBQSxhQUFhLEVBQUUsdUJBQUNWLFFBQUQsRUFBYztBQUN6QixZQUFJOUcsSUFBSSxDQUFDeUgsYUFBVCxFQUF3QjtBQUNwQnpILFVBQUFBLElBQUksQ0FBQzBILGlCQUFMO0FBQ0gsU0FId0IsQ0FLekI7OztBQUNBMUcsUUFBQUEsWUFBWSxDQUFDQyxvQkFBYixDQUFrQyw4QkFBbEM7QUFDSDtBQXJCMkIsS0FBaEM7QUF1Qkg7QUFyZDJCLENBQWhDO0FBd2RBO0FBQ0E7QUFDQTs7QUFDQXhELENBQUMsQ0FBQ2tLLEVBQUYsQ0FBSzlILElBQUwsQ0FBVXdHLFFBQVYsQ0FBbUJsSSxLQUFuQixDQUF5QnlKLFNBQXpCLEdBQXFDLFVBQVNsSixLQUFULEVBQWdCbUosU0FBaEIsRUFBMkI7QUFDNUQsU0FBT3BLLENBQUMsQ0FBQyxNQUFNb0ssU0FBUCxDQUFELENBQW1CQyxRQUFuQixDQUE0QixRQUE1QixDQUFQO0FBQ0gsQ0FGRDtBQUlBO0FBQ0E7QUFDQTs7O0FBQ0FySyxDQUFDLENBQUN5SCxRQUFELENBQUQsQ0FBWTZDLEtBQVosQ0FBa0IsWUFBVztBQUN6QnhLLEVBQUFBLHlCQUF5QixDQUFDMEIsVUFBMUI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICovXG5cbi8qIGdsb2JhbCBEaWFscGxhbkFwcGxpY2F0aW9uc0FQSSwgRm9ybSwgU2VjdXJpdHlVdGlscywgZ2xvYmFsVHJhbnNsYXRlLCBFeHRlbnNpb25zLCBhY2UsIFVzZXJNZXNzYWdlLCBGb3JtRWxlbWVudHMgKi9cblxuLyoqXG4gKiBEaWFscGxhbiBhcHBsaWNhdGlvbiBlZGl0IGZvcm0gbWFuYWdlbWVudCBtb2R1bGUgd2l0aCBlbmhhbmNlZCBzZWN1cml0eVxuICovXG52YXIgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeSA9IHtcbiAgICAkZm9ybU9iajogJCgnI2RpYWxwbGFuLWFwcGxpY2F0aW9uLWZvcm0nKSxcbiAgICAkbnVtYmVyOiAkKCcjZXh0ZW5zaW9uJyksXG4gICAgJHRhYk1lbnVJdGVtczogJCgnI2FwcGxpY2F0aW9uLWNvZGUtbWVudSAuaXRlbScpLFxuICAgIGRlZmF1bHRFeHRlbnNpb246ICcnLFxuICAgIGVkaXRvcjogbnVsbCxcbiAgICBjdXJyZW50QWN0aXZlVGFiOiAnbWFpbicsIC8vIFRyYWNrIGN1cnJlbnQgYWN0aXZlIHRhYlxuICAgIGlzTG9hZGluZ0RhdGE6IGZhbHNlLCAvLyBGbGFnIHRvIHByZXZlbnQgYnV0dG9uIHJlYWN0aXZhdGlvbiBkdXJpbmcgZGF0YSBsb2FkaW5nXG4gICAgXG4gICAgLyoqXG4gICAgICogRm9ybSB2YWxpZGF0aW9uIHJ1bGVzIFxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgbmFtZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ25hbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmRhX1ZhbGlkYXRlTmFtZUlzRW1wdHlcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21heExlbmd0aFs1MF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5kYV9WYWxpZGF0ZU5hbWVUb29Mb25nIHx8ICdOYW1lIGlzIHRvbyBsb25nIChtYXggNTAgY2hhcmFjdGVycyknXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBleHRlbnNpb246IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdleHRlbnNpb24nLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJy9eWzAtOSMrXFxcXCp8WF17MSw2NH0kLycsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmRhX1ZhbGlkYXRlRXh0ZW5zaW9uTnVtYmVyLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5kYV9WYWxpZGF0ZUV4dGVuc2lvbklzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGlzdFJ1bGVbZXh0ZW5zaW9uLWVycm9yXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmRhX1ZhbGlkYXRlRXh0ZW5zaW9uRG91YmxlLFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgZXh0ZW5zaW9uIGRpc3BsYXkgaW4gcmliYm9uIGxhYmVsXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGV4dGVuc2lvbiAtIEV4dGVuc2lvbiBudW1iZXJcbiAgICAgKi9cbiAgICB1cGRhdGVFeHRlbnNpb25EaXNwbGF5OiBmdW5jdGlvbihleHRlbnNpb24pIHtcbiAgICAgICAgdmFyIGV4dGVuc2lvbkRpc3BsYXkgPSAkKCcjZXh0ZW5zaW9uLWRpc3BsYXknKTtcbiAgICAgICAgZXh0ZW5zaW9uRGlzcGxheS50ZXh0KGV4dGVuc2lvbiB8fCAnJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIG1vZHVsZVxuICAgICAqL1xuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBFbmFibGUgdGFiIG5hdmlnYXRpb24gd2l0aCBoaXN0b3J5IHN1cHBvcnRcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS4kdGFiTWVudUl0ZW1zLnRhYih7XG4gICAgICAgICAgICBoaXN0b3J5OiB0cnVlLFxuICAgICAgICAgICAgaGlzdG9yeVR5cGU6ICdoYXNoJyxcbiAgICAgICAgICAgIG9uVmlzaWJsZTogZnVuY3Rpb24odGFiUGF0aCkge1xuICAgICAgICAgICAgICAgIC8vIFRyYWNrIGN1cnJlbnQgYWN0aXZlIHRhYlxuICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuY3VycmVudEFjdGl2ZVRhYiA9IHRhYlBhdGg7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmVzaXplIEFDRSBlZGl0b3Igd2hlbiBjb2RlIHRhYiBiZWNvbWVzIHZpc2libGVcbiAgICAgICAgICAgICAgICBpZiAodGFiUGF0aCA9PT0gJ2NvZGUnICYmIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IucmVzaXplKCk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTsgICAgICAgIFxuICAgICAgICAvLyBFeHRlbnNpb24gYXZhaWxhYmlsaXR5IGNoZWNrXG4gICAgICAgIHZhciB0aW1lb3V0SWQ7XG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuJG51bWJlci5vbignaW5wdXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICh0aW1lb3V0SWQpIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciBuZXdOdW1iZXIgPSBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRlbnNpb24nKTtcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25zLmNoZWNrQXZhaWxhYmlsaXR5KGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZGVmYXVsdEV4dGVuc2lvbiwgbmV3TnVtYmVyKTtcbiAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIEZvcm0uanMgZm9yIFJFU1QgQVBJXG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJFU1QgQVBJIHYzIGludGVncmF0aW9uXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gRGlhbHBsYW5BcHBsaWNhdGlvbnNBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJzsgLy8gVXNlIHNhdmVSZWNvcmQgbWV0aG9kIGZyb20gUGJ4QXBpQ2xpZW50XG4gICAgICAgIFxuICAgICAgICAvLyBOYXZpZ2F0aW9uIFVSTHNcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gZ2xvYmFsUm9vdFVybCArICdkaWFscGxhbi1hcHBsaWNhdGlvbnMvaW5kZXgvJztcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGdsb2JhbFJvb3RVcmwgKyAnZGlhbHBsYW4tYXBwbGljYXRpb25zL21vZGlmeS8nO1xuICAgICAgICBcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGFkYXB0aXZlIHRleHRhcmVhIGZvciBkZXNjcmlwdGlvbiBmaWVsZFxuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmluaXRpYWxpemVBZGFwdGl2ZVRleHRhcmVhKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGNvbXBvbmVudHNcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5pbml0aWFsaXplQWNlKCk7XG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuaW5pdGlhbGl6ZUZ1bGxzY3JlZW5IYW5kbGVycygpO1xuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmluaXRpYWxpemVGb3JtKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYWRhcHRpdmUgdGV4dGFyZWEgZm9yIGRlc2NyaXB0aW9uIGZpZWxkXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUFkYXB0aXZlVGV4dGFyZWE6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBTZXQgdXAgYWRhcHRpdmUgcmVzaXppbmcgZm9yIGRlc2NyaXB0aW9uIHRleHRhcmVhXG4gICAgICAgICQoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpLm9uKCdpbnB1dCBwYXN0ZSBrZXl1cCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCQodGhpcykpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWwgcmVzaXplIGFmdGVyIGZvcm0gZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCd0ZXh0YXJlYVtuYW1lPVwiZGVzY3JpcHRpb25cIl0nKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBmb3JtIGRhdGEgdmlhIFJFU1QgQVBJXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm06IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVjb3JkSWQgPSBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmdldFJlY29yZElkKCk7XG4gICAgICAgIHZhciBjb3B5RnJvbUlkID0gJCgnI2NvcHktZnJvbS1pZCcpLnZhbCgpO1xuICAgICAgICB2YXIgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICAgICAgdmFyIGNvcHlQYXJhbSA9IHVybFBhcmFtcy5nZXQoJ2NvcHknKTtcbiAgICAgICAgdmFyIGlzQ29weU1vZGUgPSBjb3B5UGFyYW0gfHwgY29weUZyb21JZDtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGNvcHkgbW9kZSBmaXJzdCAoYmVmb3JlIGNoZWNraW5nIGZvciBuZXcgcmVjb3JkKVxuICAgICAgICBpZiAoaXNDb3B5TW9kZSkge1xuICAgICAgICAgICAgLy8gVXNlIHRoZSBSRVNUZnVsIGNvcHkgbWV0aG9kXG4gICAgICAgICAgICB2YXIgc291cmNlSWQgPSBjb3B5UGFyYW0gfHwgY29weUZyb21JZDtcbiAgICAgICAgICAgIERpYWxwbGFuQXBwbGljYXRpb25zQVBJLmNvcHkoc291cmNlSWQsIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBEYXRhIGlzIGFscmVhZHkgc2FuaXRpemVkIGluIEFQSSBtb2R1bGVcbiAgICAgICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZGVmYXVsdEV4dGVuc2lvbiA9IHJlc3BvbnNlLmRhdGEuZXh0ZW5zaW9uO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIGV4dGVuc2lvbiBudW1iZXIgZGlzcGxheSBpbiB0aGUgcmliYm9uIGxhYmVsXG4gICAgICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkudXBkYXRlRXh0ZW5zaW9uRGlzcGxheShyZXNwb25zZS5kYXRhLmV4dGVuc2lvbik7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBTZXQgQUNFIGVkaXRvciBjb250ZW50IChhcHBsaWNhdGlvbmxvZ2ljIGlzIG5vdCBzYW5pdGl6ZWQpXG4gICAgICAgICAgICAgICAgICAgIHZhciBjb2RlQ29udGVudCA9IHJlc3BvbnNlLmRhdGEuYXBwbGljYXRpb25sb2dpYyB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCBmbGFnIHRvIHByZXZlbnQgcmVhY3RpdmF0aW5nIGJ1dHRvbnMgZHVyaW5nIGRhdGEgbG9hZFxuICAgICAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmlzTG9hZGluZ0RhdGEgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IuZ2V0U2Vzc2lvbigpLnNldFZhbHVlKGNvZGVDb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5jaGFuZ2VBY2VNb2RlKCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciBsb2FkaW5nIGZsYWcgYWZ0ZXIgc2V0dGluZyBjb250ZW50XG4gICAgICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuaXNMb2FkaW5nRGF0YSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gU3dpdGNoIHRvIG1haW4gdGFiIGZvciBjb3B5IG1vZGVcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF3aW5kb3cubG9jYXRpb24uaGFzaCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS4kdGFiTWVudUl0ZW1zLnRhYignY2hhbmdlIHRhYicsICdtYWluJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIE1hcmsgZm9ybSBhcyBjaGFuZ2VkIGZvciBjb3B5IG1vZGUgdG8gZW5hYmxlIHNhdmUgYnV0dG9uXG4gICAgICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEF1dG8tcmVzaXplIHRleHRhcmVhIGFmdGVyIGRhdGEgaXMgbG9hZGVkICh3aXRoIHNtYWxsIGRlbGF5IGZvciBET00gdXBkYXRlKVxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCd0ZXh0YXJlYVtuYW1lPVwiZGVzY3JpcHRpb25cIl0nKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXMgJiYgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3IgPyBcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLmpvaW4oJywgJykgOiBcbiAgICAgICAgICAgICAgICAgICAgICAgICdGYWlsZWQgdG8gY29weSBkaWFscGxhbiBhcHBsaWNhdGlvbic7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZXJyb3JNZXNzYWdlKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSBpZiAoIXJlY29yZElkIHx8IHJlY29yZElkID09PSAnJykge1xuICAgICAgICAgICAgLy8gRm9yIG5ldyByZWNvcmRzLCBnZXQgZGVmYXVsdCB2YWx1ZXNcbiAgICAgICAgICAgIERpYWxwbGFuQXBwbGljYXRpb25zQVBJLmdldERlZmF1bHQoZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmRlZmF1bHRFeHRlbnNpb24gPSByZXNwb25zZS5kYXRhLmV4dGVuc2lvbjtcbiAgICAgICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS51cGRhdGVFeHRlbnNpb25EaXNwbGF5KHJlc3BvbnNlLmRhdGEuZXh0ZW5zaW9uKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFN3aXRjaCB0byBtYWluIHRhYiBmb3IgbmV3IHJlY29yZHNcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF3aW5kb3cubG9jYXRpb24uaGFzaCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS4kdGFiTWVudUl0ZW1zLnRhYignY2hhbmdlIHRhYicsICdtYWluJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEF1dG8tcmVzaXplIHRleHRhcmVhIGFmdGVyIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpO1xuICAgICAgICAgICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBlcnJvck1lc3NhZ2UgPSByZXNwb25zZS5tZXNzYWdlcyAmJiByZXNwb25zZS5tZXNzYWdlcy5lcnJvciA/IFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3Iuam9pbignLCAnKSA6IFxuICAgICAgICAgICAgICAgICAgICAgICAgJ0ZhaWxlZCB0byBsb2FkIGRlZmF1bHQgdmFsdWVzJztcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChlcnJvck1lc3NhZ2UpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEZvciBleGlzdGluZyByZWNvcmRzLCBnZXQgcmVjb3JkIGRhdGFcbiAgICAgICAgICAgIERpYWxwbGFuQXBwbGljYXRpb25zQVBJLmdldFJlY29yZChyZWNvcmRJZCwgZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIERhdGEgaXMgYWxyZWFkeSBzYW5pdGl6ZWQgaW4gQVBJIG1vZHVsZVxuICAgICAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5kZWZhdWx0RXh0ZW5zaW9uID0gcmVzcG9uc2UuZGF0YS5leHRlbnNpb247XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgZXh0ZW5zaW9uIG51bWJlciBkaXNwbGF5IGluIHRoZSByaWJib24gbGFiZWxcbiAgICAgICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS51cGRhdGVFeHRlbnNpb25EaXNwbGF5KHJlc3BvbnNlLmRhdGEuZXh0ZW5zaW9uKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCBBQ0UgZWRpdG9yIGNvbnRlbnQgKGFwcGxpY2F0aW9ubG9naWMgaXMgbm90IHNhbml0aXplZClcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvZGVDb250ZW50ID0gcmVzcG9uc2UuZGF0YS5hcHBsaWNhdGlvbmxvZ2ljIHx8ICcnO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IGZsYWcgdG8gcHJldmVudCByZWFjdGl2YXRpbmcgYnV0dG9ucyBkdXJpbmcgZGF0YSBsb2FkXG4gICAgICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuaXNMb2FkaW5nRGF0YSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5nZXRTZXNzaW9uKCkuc2V0VmFsdWUoY29kZUNvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmNoYW5nZUFjZU1vZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIGxvYWRpbmcgZmxhZyBhZnRlciBzZXR0aW5nIGNvbnRlbnRcbiAgICAgICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5pc0xvYWRpbmdEYXRhID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBTd2l0Y2ggdG8gbWFpbiB0YWIgb25seSBmb3IgY29tcGxldGVseSBuZXcgcmVjb3JkcyAobm8gbmFtZSBhbmQgbm8gZXh0ZW5zaW9uKVxuICAgICAgICAgICAgICAgICAgICAvLyBIYXNoIGhpc3Rvcnkgd2lsbCBwcmVzZXJ2ZSB0aGUgdGFiIGZvciBleGlzdGluZyByZWNvcmRzXG4gICAgICAgICAgICAgICAgICAgIGlmICghcmVzcG9uc2UuZGF0YS5uYW1lICYmICFyZXNwb25zZS5kYXRhLmV4dGVuc2lvbiAmJiAhd2luZG93LmxvY2F0aW9uLmhhc2gpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuJHRhYk1lbnVJdGVtcy50YWIoJ2NoYW5nZSB0YWInLCAnbWFpbicpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBBdXRvLXJlc2l6ZSB0ZXh0YXJlYSBhZnRlciBkYXRhIGlzIGxvYWRlZCAod2l0aCBzbWFsbCBkZWxheSBmb3IgRE9NIHVwZGF0ZSlcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJyk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLm1lc3NhZ2VzICYmIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yID8gXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5tZXNzYWdlcy5lcnJvci5qb2luKCcsICcpIDogXG4gICAgICAgICAgICAgICAgICAgICAgICAnRmFpbGVkIHRvIGxvYWQgZGlhbHBsYW4gYXBwbGljYXRpb24gZGF0YSc7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZXJyb3JNZXNzYWdlKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCByZWNvcmQgSUQgZnJvbSBVUkxcbiAgICAgKiBcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IFJlY29yZCBJRFxuICAgICAqL1xuICAgIGdldFJlY29yZElkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHVybFBhcnRzID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnNwbGl0KCcvJyk7XG4gICAgICAgIHZhciBtb2RpZnlJbmRleCA9IHVybFBhcnRzLmluZGV4T2YoJ21vZGlmeScpO1xuICAgICAgICBpZiAobW9kaWZ5SW5kZXggIT09IC0xICYmIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV0pIHtcbiAgICAgICAgICAgIHJldHVybiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgQUNFIGVkaXRvciB3aXRoIHNlY3VyaXR5IGNvbnNpZGVyYXRpb25zXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUFjZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBhY2VIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSAzODA7XG4gICAgICAgIHZhciByb3dzQ291bnQgPSBNYXRoLnJvdW5kKGFjZUhlaWdodCAvIDE2LjMpO1xuICAgICAgICBcbiAgICAgICAgJCh3aW5kb3cpLm9uKCdsb2FkJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJCgnLmFwcGxpY2F0aW9uLWNvZGUnKS5jc3MoJ21pbi1oZWlnaHQnLCBhY2VIZWlnaHQgKyAncHgnKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvciA9IGFjZS5lZGl0KCdhcHBsaWNhdGlvbi1jb2RlJyk7XG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5yZXNpemUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFRyYWNrIGNoYW5nZXMgZm9yIEZvcm0uanNcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IuZ2V0U2Vzc2lvbigpLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vIElnbm9yZSBjaGFuZ2VzIGR1cmluZyBkYXRhIGxvYWRpbmcgdG8gcHJldmVudCByZWFjdGl2YXRpbmcgYnV0dG9uc1xuICAgICAgICAgICAgaWYgKCFkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmlzTG9hZGluZ0RhdGEpIHtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3Iuc2V0T3B0aW9ucyh7XG4gICAgICAgICAgICBtYXhMaW5lczogcm93c0NvdW50LFxuICAgICAgICAgICAgc2hvd1ByaW50TWFyZ2luOiBmYWxzZSxcbiAgICAgICAgICAgIHNob3dMaW5lTnVtYmVyczogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZWN1cml0eTogcHJldmVudCBjb2RlIGV4ZWN1dGlvbiBpbiBlZGl0b3JcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IuY29tbWFuZHMuYWRkQ29tbWFuZCh7XG4gICAgICAgICAgICBuYW1lOiAncHJldmVudENvZGVFeGVjdXRpb24nLFxuICAgICAgICAgICAgYmluZEtleToge3dpbjogJ0N0cmwtRScsIG1hYzogJ0NvbW1hbmQtRSd9LFxuICAgICAgICAgICAgZXhlYzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdDb2RlIGV4ZWN1dGlvbiBwcmV2ZW50ZWQgZm9yIHNlY3VyaXR5Jyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZnVsbHNjcmVlbiBoYW5kbGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGdWxsc2NyZWVuSGFuZGxlcnM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAkKCcuZnVsbHNjcmVlbi10b2dnbGUtYnRuJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGNvbnRhaW5lciA9ICQodGhpcykuc2libGluZ3MoJy5hcHBsaWNhdGlvbi1jb2RlJylbMF07XG4gICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LnRvZ2dsZUZ1bGxTY3JlZW4oY29udGFpbmVyKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignZnVsbHNjcmVlbmNoYW5nZScsIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuYWRqdXN0RWRpdG9ySGVpZ2h0KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xlYW51cCBldmVudCBsaXN0ZW5lcnMgdG8gcHJldmVudCBtZW1vcnkgbGVha3NcbiAgICAgKi9cbiAgICBjbGVhbnVwOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gUmVtb3ZlIGZ1bGxzY3JlZW4gZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignZnVsbHNjcmVlbmNoYW5nZScsIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuYWRqdXN0RWRpdG9ySGVpZ2h0KTtcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFudXAgb3RoZXIgZXZlbnQgbGlzdGVuZXJzIGlmIG5lZWRlZFxuICAgICAgICAkKHdpbmRvdykub2ZmKCdsb2FkJyk7XG4gICAgICAgICQoJy5mdWxsc2NyZWVuLXRvZ2dsZS1idG4nKS5vZmYoJ2NsaWNrJyk7XG4gICAgICAgICQoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpLm9mZignaW5wdXQgcGFzdGUga2V5dXAnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFudXAgQUNFIGVkaXRvclxuICAgICAgICBpZiAoZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IpIHtcbiAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLmRlc3Ryb3koKTtcbiAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIGZ1bGxzY3JlZW4gbW9kZVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGNvbnRhaW5lciAtIENvbnRhaW5lciBlbGVtZW50XG4gICAgICovXG4gICAgdG9nZ2xlRnVsbFNjcmVlbjogZnVuY3Rpb24oY29udGFpbmVyKSB7XG4gICAgICAgIGlmICghZG9jdW1lbnQuZnVsbHNjcmVlbkVsZW1lbnQpIHtcbiAgICAgICAgICAgIGNvbnRhaW5lci5yZXF1ZXN0RnVsbHNjcmVlbigpLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGF0dGVtcHRpbmcgdG8gZW5hYmxlIGZ1bGwtc2NyZWVuIG1vZGU6ICcgKyBlcnIubWVzc2FnZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRvY3VtZW50LmV4aXRGdWxsc2NyZWVuKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRqdXN0IGVkaXRvciBoZWlnaHQgb24gZnVsbHNjcmVlbiBjaGFuZ2VcbiAgICAgKi9cbiAgICBhZGp1c3RFZGl0b3JIZWlnaHQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5yZXNpemUoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENoYW5nZSBBQ0UgZWRpdG9yIG1vZGUgYmFzZWQgb24gdHlwZVxuICAgICAqL1xuICAgIGNoYW5nZUFjZU1vZGU6IGZ1bmN0aW9uKHZhbHVlLCB0ZXh0LCAkY2hvaWNlKSB7XG4gICAgICAgIC8vIEdldCBtb2RlIHZhbHVlIC0gY2FuIGJlIHBhc3NlZCBhcyBwYXJhbWV0ZXIgb3IgZnJvbSBoaWRkZW4gaW5wdXRcbiAgICAgICAgdmFyIG1vZGUgPSB2YWx1ZSB8fCAkKCcjdHlwZScpLnZhbCgpO1xuICAgICAgICB2YXIgTmV3TW9kZTtcblxuICAgICAgICBpZiAobW9kZSA9PT0gJ3BocCcpIHtcbiAgICAgICAgICAgIE5ld01vZGUgPSBhY2UucmVxdWlyZSgnYWNlL21vZGUvcGhwJykuTW9kZTtcbiAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLnNldE9wdGlvbnMoe1xuICAgICAgICAgICAgICAgIHNob3dMaW5lTnVtYmVyczogdHJ1ZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBOZXdNb2RlID0gYWNlLnJlcXVpcmUoJ2FjZS9tb2RlL2p1bGlhJykuTW9kZTtcbiAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLnNldE9wdGlvbnMoe1xuICAgICAgICAgICAgICAgIHNob3dMaW5lTnVtYmVyczogZmFsc2VcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3Iuc2Vzc2lvbi5zZXRNb2RlKG5ldyBOZXdNb2RlKCkpO1xuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5zZXRUaGVtZSgnYWNlL3RoZW1lL21vbm9rYWknKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGJlZm9yZSBmb3JtIHN1Ym1pc3Npb25cbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gc2V0dGluZ3MgLSBGb3JtIHNldHRpbmdzXG4gICAgICogQHJldHVybiB7b2JqZWN0fGZhbHNlfSBNb2RpZmllZCBzZXR0aW5ncyBvciBmYWxzZSB0byBjYW5jZWxcbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtOiBmdW5jdGlvbihzZXR0aW5ncykge1xuICAgICAgICB2YXIgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgYXBwbGljYXRpb24gbG9naWMgZnJvbSBBQ0UgZWRpdG9yIChub3Qgc2FuaXRpemVkKVxuICAgICAgICByZXN1bHQuZGF0YS5hcHBsaWNhdGlvbmxvZ2ljID0gZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IuZ2V0VmFsdWUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFBhc3MgY3VycmVudCBhY3RpdmUgdGFiIGZvciByZWRpcmVjdFxuICAgICAgICByZXN1bHQuZGF0YS5jdXJyZW50VGFiID0gZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5jdXJyZW50QWN0aXZlVGFiO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIHJlY29yZCBJRCBmb3IgdXBkYXRlc1xuICAgICAgICB2YXIgcmVjb3JkSWQgPSBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmdldFJlY29yZElkKCk7XG4gICAgICAgIGlmIChyZWNvcmRJZCAmJiByZWNvcmRJZCAhPT0gJycpIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLmlkID0gcmVjb3JkSWQ7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS51bmlxaWQgPSByZWNvcmRJZDtcbiAgICAgICAgfVxuICAgICAgICBcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIGZvcm0gc3VibWlzc2lvbiAobm8gc3VjY2VzcyBtZXNzYWdlcyAtIFVJIHVwZGF0ZXMgb25seSlcbiAgICAgKlxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFNlcnZlciByZXNwb25zZVxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybTogZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBEYXRhIGlzIGFscmVhZHkgc2FuaXRpemVkIGluIEFQSSBtb2R1bGVcbiAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcblxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBleHRlbnNpb24gbnVtYmVyIGRpc3BsYXkgaW4gdGhlIHJpYmJvbiBsYWJlbFxuICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkudXBkYXRlRXh0ZW5zaW9uRGlzcGxheShyZXNwb25zZS5kYXRhLmV4dGVuc2lvbik7XG5cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgQUNFIGVkaXRvciBjb250ZW50XG4gICAgICAgICAgICAgICAgdmFyIGNvZGVDb250ZW50ID0gcmVzcG9uc2UuZGF0YS5hcHBsaWNhdGlvbmxvZ2ljIHx8ICcnO1xuICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLmdldFNlc3Npb24oKS5zZXRWYWx1ZShjb2RlQ29udGVudCk7XG5cbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgcmVkaXJlY3Qgd2l0aCB0YWIgcHJlc2VydmF0aW9uXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEucmVkaXJlY3RUYWIgJiYgcmVzcG9uc2UuZGF0YS5yZWRpcmVjdFRhYiAhPT0gJ21haW4nKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBGb3JtLmpzIHJlZGlyZWN0IFVSTCB0byBpbmNsdWRlIGhhc2hcbiAgICAgICAgICAgICAgICAgICAgdmFyIGN1cnJlbnRJZCA9ICQoJyNpZCcpLnZhbCgpIHx8IHJlc3BvbnNlLmRhdGEudW5pcWlkO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY3VycmVudElkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gZ2xvYmFsUm9vdFVybCArICdkaWFscGxhbi1hcHBsaWNhdGlvbnMvbW9kaWZ5LycgKyBjdXJyZW50SWQgKyAnIy8nICsgcmVzcG9uc2UuZGF0YS5yZWRpcmVjdFRhYjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRm9ybS5qcyB3aWxsIGhhbmRsZSBhbGwgcmVkaXJlY3QgbG9naWMgYmFzZWQgb24gc3VibWl0TW9kZVxuXG4gICAgICAgICAgICAvLyBObyBzdWNjZXNzIG1lc3NhZ2UgLSBqdXN0IHNpbGVudCB1cGRhdGVcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIHNhbml0aXplZCBkYXRhXG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBGb3JtIGRhdGFcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm06IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2hcbiAgICAgICAgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseShkYXRhLCB7XG4gICAgICAgICAgICBiZWZvcmVQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93biBpZiBub3QgYWxyZWFkeSBkb25lXG4gICAgICAgICAgICAgICAgaWYgKCEkKCcjdHlwZS1kcm9wZG93bicpLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBEeW5hbWljRHJvcGRvd25CdWlsZGVyLmJ1aWxkRHJvcGRvd24oJ3R5cGUnLCBmb3JtRGF0YSwge1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RhdGljT3B0aW9uczogW1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgdmFsdWU6ICdwaHAnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZGFfVHlwZVBocCB9LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgdmFsdWU6ICdwbGFpbnRleHQnLCB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuZGFfVHlwZVBsYWludGV4dCB9XG4gICAgICAgICAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGxhY2Vob2xkZXI6IGdsb2JhbFRyYW5zbGF0ZS5kYV9TZWxlY3RUeXBlLFxuICAgICAgICAgICAgICAgICAgICAgICAgb25DaGFuZ2U6IGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuY2hhbmdlQWNlTW9kZVxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgYWZ0ZXJQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEF1dG8tcmVzaXplIHRleHRhcmVhIGFmdGVyIGRhdGEgaXMgcG9wdWxhdGVkXG4gICAgICAgICAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCd0ZXh0YXJlYVtuYW1lPVwiZGVzY3JpcHRpb25cIl0nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBDdXN0b20gdmFsaWRhdGlvbiBydWxlIGZvciBleHRlbnNpb24gZXhpc3RlbmNlXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leGlzdFJ1bGUgPSBmdW5jdGlvbih2YWx1ZSwgcGFyYW1ldGVyKSB7IFxuICAgIHJldHVybiAkKCcjJyArIHBhcmFtZXRlcikuaGFzQ2xhc3MoJ2hpZGRlbicpOyBcbn07XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbigpIHtcbiAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=