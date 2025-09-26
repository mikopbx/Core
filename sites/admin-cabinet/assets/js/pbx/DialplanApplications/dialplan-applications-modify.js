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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9EaWFscGxhbkFwcGxpY2F0aW9ucy9kaWFscGxhbi1hcHBsaWNhdGlvbnMtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbImRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkiLCIkZm9ybU9iaiIsIiQiLCIkbnVtYmVyIiwiJHRhYk1lbnVJdGVtcyIsImRlZmF1bHRFeHRlbnNpb24iLCJlZGl0b3IiLCJjdXJyZW50QWN0aXZlVGFiIiwiaXNMb2FkaW5nRGF0YSIsInZhbGlkYXRlUnVsZXMiLCJuYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImRhX1ZhbGlkYXRlTmFtZUlzRW1wdHkiLCJkYV9WYWxpZGF0ZU5hbWVUb29Mb25nIiwiZXh0ZW5zaW9uIiwidmFsdWUiLCJkYV9WYWxpZGF0ZUV4dGVuc2lvbk51bWJlciIsImRhX1ZhbGlkYXRlRXh0ZW5zaW9uSXNFbXB0eSIsImRhX1ZhbGlkYXRlRXh0ZW5zaW9uRG91YmxlIiwidXBkYXRlRXh0ZW5zaW9uRGlzcGxheSIsImV4dGVuc2lvbkRpc3BsYXkiLCJ0ZXh0IiwiaW5pdGlhbGl6ZSIsInRhYiIsImhpc3RvcnkiLCJoaXN0b3J5VHlwZSIsIm9uVmlzaWJsZSIsInRhYlBhdGgiLCJzZXRUaW1lb3V0IiwicmVzaXplIiwidGltZW91dElkIiwib24iLCJjbGVhclRpbWVvdXQiLCJuZXdOdW1iZXIiLCJmb3JtIiwiRXh0ZW5zaW9uc0FQSSIsImNoZWNrQXZhaWxhYmlsaXR5IiwiRm9ybSIsInVybCIsImNiQmVmb3JlU2VuZEZvcm0iLCJjYkFmdGVyU2VuZEZvcm0iLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJEaWFscGxhbkFwcGxpY2F0aW9uc0FQSSIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwiaW5pdGlhbGl6ZUFkYXB0aXZlVGV4dGFyZWEiLCJpbml0aWFsaXplQWNlIiwiaW5pdGlhbGl6ZUZ1bGxzY3JlZW5IYW5kbGVycyIsImluaXRpYWxpemVGb3JtIiwiRm9ybUVsZW1lbnRzIiwib3B0aW1pemVUZXh0YXJlYVNpemUiLCJyZWNvcmRJZCIsImdldFJlY29yZElkIiwiY29weUZyb21JZCIsInZhbCIsInVybFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsIndpbmRvdyIsImxvY2F0aW9uIiwic2VhcmNoIiwiY29weVBhcmFtIiwiZ2V0IiwiaXNDb3B5TW9kZSIsInNvdXJjZUlkIiwiY29weSIsInJlc3BvbnNlIiwicmVzdWx0IiwicG9wdWxhdGVGb3JtIiwiZGF0YSIsImNvZGVDb250ZW50IiwiYXBwbGljYXRpb25sb2dpYyIsImdldFNlc3Npb24iLCJzZXRWYWx1ZSIsImNoYW5nZUFjZU1vZGUiLCJoYXNoIiwiZGF0YUNoYW5nZWQiLCJlcnJvck1lc3NhZ2UiLCJtZXNzYWdlcyIsImVycm9yIiwiam9pbiIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwiU2VjdXJpdHlVdGlscyIsImVzY2FwZUh0bWwiLCJnZXREZWZhdWx0IiwiZ2V0UmVjb3JkIiwidXJsUGFydHMiLCJwYXRobmFtZSIsInNwbGl0IiwibW9kaWZ5SW5kZXgiLCJpbmRleE9mIiwiYWNlSGVpZ2h0IiwiaW5uZXJIZWlnaHQiLCJyb3dzQ291bnQiLCJNYXRoIiwicm91bmQiLCJjc3MiLCJhY2UiLCJlZGl0Iiwic2V0VGhlbWUiLCJzZXRPcHRpb25zIiwibWF4TGluZXMiLCJzaG93UHJpbnRNYXJnaW4iLCJzaG93TGluZU51bWJlcnMiLCJjb21tYW5kcyIsImFkZENvbW1hbmQiLCJiaW5kS2V5Iiwid2luIiwibWFjIiwiZXhlYyIsImNvbnNvbGUiLCJ3YXJuIiwiY29udGFpbmVyIiwic2libGluZ3MiLCJ0b2dnbGVGdWxsU2NyZWVuIiwiZG9jdW1lbnQiLCJhZGRFdmVudExpc3RlbmVyIiwiYWRqdXN0RWRpdG9ySGVpZ2h0IiwiY2xlYW51cCIsInJlbW92ZUV2ZW50TGlzdGVuZXIiLCJvZmYiLCJkZXN0cm95IiwiZnVsbHNjcmVlbkVsZW1lbnQiLCJyZXF1ZXN0RnVsbHNjcmVlbiIsImVyciIsIm1lc3NhZ2UiLCJleGl0RnVsbHNjcmVlbiIsIiRjaG9pY2UiLCJtb2RlIiwiTmV3TW9kZSIsInJlcXVpcmUiLCJNb2RlIiwic2Vzc2lvbiIsInNldE1vZGUiLCJzZXR0aW5ncyIsImdldFZhbHVlIiwiY3VycmVudFRhYiIsImlkIiwidW5pcWlkIiwicmVkaXJlY3RUYWIiLCJjdXJyZW50SWQiLCJwb3B1bGF0ZUZvcm1TaWxlbnRseSIsImJlZm9yZVBvcHVsYXRlIiwiZm9ybURhdGEiLCJsZW5ndGgiLCJEeW5hbWljRHJvcGRvd25CdWlsZGVyIiwiYnVpbGREcm9wZG93biIsInN0YXRpY09wdGlvbnMiLCJkYV9UeXBlUGhwIiwiZGFfVHlwZVBsYWludGV4dCIsInBsYWNlaG9sZGVyIiwiZGFfU2VsZWN0VHlwZSIsIm9uQ2hhbmdlIiwiYWZ0ZXJQb3B1bGF0ZSIsImVuYWJsZURpcnJpdHkiLCJpbml0aWFsaXplRGlycml0eSIsImZuIiwiZXhpc3RSdWxlIiwicGFyYW1ldGVyIiwiaGFzQ2xhc3MiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxJQUFJQSx5QkFBeUIsR0FBRztBQUM1QkMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMsNEJBQUQsQ0FEaUI7QUFFNUJDLEVBQUFBLE9BQU8sRUFBRUQsQ0FBQyxDQUFDLFlBQUQsQ0FGa0I7QUFHNUJFLEVBQUFBLGFBQWEsRUFBRUYsQ0FBQyxDQUFDLDhCQUFELENBSFk7QUFJNUJHLEVBQUFBLGdCQUFnQixFQUFFLEVBSlU7QUFLNUJDLEVBQUFBLE1BQU0sRUFBRSxJQUxvQjtBQU01QkMsRUFBQUEsZ0JBQWdCLEVBQUUsTUFOVTtBQU1GO0FBQzFCQyxFQUFBQSxhQUFhLEVBQUUsS0FQYTtBQU9OOztBQUV0QjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEs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LENBRG9DO0FBS25EQyxZQUFBQSxXQUFXLEVBQUUvSSxlQUFlLENBQUNnSixhQUxzQjtBQU1uREMsWUFBQUEsUUFBUSxFQUFFaEsseUJBQXlCLENBQUNpRjtBQU5lLFdBQXZEO0FBUUg7QUFDSixPQWIyQjtBQWM1QmdGLE1BQUFBLGFBQWEsRUFBRSx1QkFBQ1YsUUFBRCxFQUFjO0FBQ3pCLFlBQUk5RyxJQUFJLENBQUN5SCxhQUFULEVBQXdCO0FBQ3BCekgsVUFBQUEsSUFBSSxDQUFDMEgsaUJBQUw7QUFDSCxTQUh3QixDQUt6Qjs7O0FBQ0ExRyxRQUFBQSxZQUFZLENBQUNDLG9CQUFiLENBQWtDLDhCQUFsQztBQUNIO0FBckIyQixLQUFoQztBQXVCSDtBQXJkMkIsQ0FBaEM7QUF3ZEE7QUFDQTtBQUNBOztBQUNBeEQsQ0FBQyxDQUFDa0ssRUFBRixDQUFLOUgsSUFBTCxDQUFVd0csUUFBVixDQUFtQmxJLEtBQW5CLENBQXlCeUosU0FBekIsR0FBcUMsVUFBU2xKLEtBQVQsRUFBZ0JtSixTQUFoQixFQUEyQjtBQUM1RCxTQUFPcEssQ0FBQyxDQUFDLE1BQU1vSyxTQUFQLENBQUQsQ0FBbUJDLFFBQW5CLENBQTRCLFFBQTVCLENBQVA7QUFDSCxDQUZEO0FBSUE7QUFDQTtBQUNBOzs7QUFDQXJLLENBQUMsQ0FBQ3lILFFBQUQsQ0FBRCxDQUFZNkMsS0FBWixDQUFrQixZQUFXO0FBQ3pCeEssRUFBQUEseUJBQXlCLENBQUMwQixVQUExQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKi9cblxuLyogZ2xvYmFsIERpYWxwbGFuQXBwbGljYXRpb25zQVBJLCBGb3JtLCBTZWN1cml0eVV0aWxzLCBnbG9iYWxUcmFuc2xhdGUsIEV4dGVuc2lvbnNBUEksIGFjZSwgVXNlck1lc3NhZ2UsIEZvcm1FbGVtZW50cyAqL1xuXG4vKipcbiAqIERpYWxwbGFuIGFwcGxpY2F0aW9uIGVkaXQgZm9ybSBtYW5hZ2VtZW50IG1vZHVsZSB3aXRoIGVuaGFuY2VkIHNlY3VyaXR5XG4gKi9cbnZhciBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5ID0ge1xuICAgICRmb3JtT2JqOiAkKCcjZGlhbHBsYW4tYXBwbGljYXRpb24tZm9ybScpLFxuICAgICRudW1iZXI6ICQoJyNleHRlbnNpb24nKSxcbiAgICAkdGFiTWVudUl0ZW1zOiAkKCcjYXBwbGljYXRpb24tY29kZS1tZW51IC5pdGVtJyksXG4gICAgZGVmYXVsdEV4dGVuc2lvbjogJycsXG4gICAgZWRpdG9yOiBudWxsLFxuICAgIGN1cnJlbnRBY3RpdmVUYWI6ICdtYWluJywgLy8gVHJhY2sgY3VycmVudCBhY3RpdmUgdGFiXG4gICAgaXNMb2FkaW5nRGF0YTogZmFsc2UsIC8vIEZsYWcgdG8gcHJldmVudCBidXR0b24gcmVhY3RpdmF0aW9uIGR1cmluZyBkYXRhIGxvYWRpbmdcbiAgICBcbiAgICAvKipcbiAgICAgKiBGb3JtIHZhbGlkYXRpb24gcnVsZXMgXG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBuYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnbmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZGFfVmFsaWRhdGVOYW1lSXNFbXB0eVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWF4TGVuZ3RoWzUwXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmRhX1ZhbGlkYXRlTmFtZVRvb0xvbmdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIGV4dGVuc2lvbjoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2V4dGVuc2lvbicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnL15bMC05IytcXFxcKnxYXXsxLDY0fSQvJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZGFfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmRhX1ZhbGlkYXRlRXh0ZW5zaW9uSXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4aXN0UnVsZVtleHRlbnNpb24tZXJyb3JdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZGFfVmFsaWRhdGVFeHRlbnNpb25Eb3VibGUsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBleHRlbnNpb24gZGlzcGxheSBpbiByaWJib24gbGFiZWxcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZXh0ZW5zaW9uIC0gRXh0ZW5zaW9uIG51bWJlclxuICAgICAqL1xuICAgIHVwZGF0ZUV4dGVuc2lvbkRpc3BsYXk6IGZ1bmN0aW9uKGV4dGVuc2lvbikge1xuICAgICAgICB2YXIgZXh0ZW5zaW9uRGlzcGxheSA9ICQoJyNleHRlbnNpb24tZGlzcGxheScpO1xuICAgICAgICBleHRlbnNpb25EaXNwbGF5LnRleHQoZXh0ZW5zaW9uIHx8ICcnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgbW9kdWxlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIEVuYWJsZSB0YWIgbmF2aWdhdGlvbiB3aXRoIGhpc3Rvcnkgc3VwcG9ydFxuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LiR0YWJNZW51SXRlbXMudGFiKHtcbiAgICAgICAgICAgIGhpc3Rvcnk6IHRydWUsXG4gICAgICAgICAgICBoaXN0b3J5VHlwZTogJ2hhc2gnLFxuICAgICAgICAgICAgb25WaXNpYmxlOiBmdW5jdGlvbih0YWJQYXRoKSB7XG4gICAgICAgICAgICAgICAgLy8gVHJhY2sgY3VycmVudCBhY3RpdmUgdGFiXG4gICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5jdXJyZW50QWN0aXZlVGFiID0gdGFiUGF0aDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZXNpemUgQUNFIGVkaXRvciB3aGVuIGNvZGUgdGFiIGJlY29tZXMgdmlzaWJsZVxuICAgICAgICAgICAgICAgIGlmICh0YWJQYXRoID09PSAnY29kZScgJiYgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5yZXNpemUoKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pOyAgICAgICAgXG4gICAgICAgIC8vIEV4dGVuc2lvbiBhdmFpbGFiaWxpdHkgY2hlY2tcbiAgICAgICAgdmFyIHRpbWVvdXRJZDtcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS4kbnVtYmVyLm9uKCdpbnB1dCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgaWYgKHRpbWVvdXRJZCkgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIHRpbWVvdXRJZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIG5ld051bWJlciA9IGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2V4dGVuc2lvbicpO1xuICAgICAgICAgICAgICAgIEV4dGVuc2lvbnNBUEkuY2hlY2tBdmFpbGFiaWxpdHkoZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5kZWZhdWx0RXh0ZW5zaW9uLCBuZXdOdW1iZXIpO1xuICAgICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBDb25maWd1cmUgRm9ybS5qcyBmb3IgUkVTVCBBUElcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuY2JBZnRlclNlbmRGb3JtO1xuICAgICAgICBcbiAgICAgICAgLy8gUkVTVCBBUEkgdjMgaW50ZWdyYXRpb25cbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5lbmFibGVkID0gdHJ1ZTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5hcGlPYmplY3QgPSBEaWFscGxhbkFwcGxpY2F0aW9uc0FQSTtcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncy5zYXZlTWV0aG9kID0gJ3NhdmVSZWNvcmQnOyAvLyBVc2Ugc2F2ZVJlY29yZCBtZXRob2QgZnJvbSBQYnhBcGlDbGllbnRcbiAgICAgICAgXG4gICAgICAgIC8vIE5hdmlnYXRpb24gVVJMc1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBnbG9iYWxSb290VXJsICsgJ2RpYWxwbGFuLWFwcGxpY2F0aW9ucy9pbmRleC8nO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gZ2xvYmFsUm9vdFVybCArICdkaWFscGxhbi1hcHBsaWNhdGlvbnMvbW9kaWZ5Lyc7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgYWRhcHRpdmUgdGV4dGFyZWEgZm9yIGRlc2NyaXB0aW9uIGZpZWxkXG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuaW5pdGlhbGl6ZUFkYXB0aXZlVGV4dGFyZWEoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY29tcG9uZW50c1xuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmluaXRpYWxpemVBY2UoKTtcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5pbml0aWFsaXplRnVsbHNjcmVlbkhhbmRsZXJzKCk7XG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhZGFwdGl2ZSB0ZXh0YXJlYSBmb3IgZGVzY3JpcHRpb24gZmllbGRcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQWRhcHRpdmVUZXh0YXJlYTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIFNldCB1cCBhZGFwdGl2ZSByZXNpemluZyBmb3IgZGVzY3JpcHRpb24gdGV4dGFyZWFcbiAgICAgICAgJCgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJykub24oJ2lucHV0IHBhc3RlIGtleXVwJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJCh0aGlzKSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbCByZXNpemUgYWZ0ZXIgZm9ybSBkYXRhIGlzIGxvYWRlZFxuICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGZvcm0gZGF0YSB2aWEgUkVTVCBBUElcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByZWNvcmRJZCA9IGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZ2V0UmVjb3JkSWQoKTtcbiAgICAgICAgdmFyIGNvcHlGcm9tSWQgPSAkKCcjY29weS1mcm9tLWlkJykudmFsKCk7XG4gICAgICAgIHZhciB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICB2YXIgY29weVBhcmFtID0gdXJsUGFyYW1zLmdldCgnY29weScpO1xuICAgICAgICB2YXIgaXNDb3B5TW9kZSA9IGNvcHlQYXJhbSB8fCBjb3B5RnJvbUlkO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2hlY2sgY29weSBtb2RlIGZpcnN0IChiZWZvcmUgY2hlY2tpbmcgZm9yIG5ldyByZWNvcmQpXG4gICAgICAgIGlmIChpc0NvcHlNb2RlKSB7XG4gICAgICAgICAgICAvLyBVc2UgdGhlIFJFU1RmdWwgY29weSBtZXRob2RcbiAgICAgICAgICAgIHZhciBzb3VyY2VJZCA9IGNvcHlQYXJhbSB8fCBjb3B5RnJvbUlkO1xuICAgICAgICAgICAgRGlhbHBsYW5BcHBsaWNhdGlvbnNBUEkuY29weShzb3VyY2VJZCwgZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIERhdGEgaXMgYWxyZWFkeSBzYW5pdGl6ZWQgaW4gQVBJIG1vZHVsZVxuICAgICAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5kZWZhdWx0RXh0ZW5zaW9uID0gcmVzcG9uc2UuZGF0YS5leHRlbnNpb247XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgZXh0ZW5zaW9uIG51bWJlciBkaXNwbGF5IGluIHRoZSByaWJib24gbGFiZWxcbiAgICAgICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS51cGRhdGVFeHRlbnNpb25EaXNwbGF5KHJlc3BvbnNlLmRhdGEuZXh0ZW5zaW9uKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCBBQ0UgZWRpdG9yIGNvbnRlbnQgKGFwcGxpY2F0aW9ubG9naWMgaXMgbm90IHNhbml0aXplZClcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvZGVDb250ZW50ID0gcmVzcG9uc2UuZGF0YS5hcHBsaWNhdGlvbmxvZ2ljIHx8ICcnO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IGZsYWcgdG8gcHJldmVudCByZWFjdGl2YXRpbmcgYnV0dG9ucyBkdXJpbmcgZGF0YSBsb2FkXG4gICAgICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuaXNMb2FkaW5nRGF0YSA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5nZXRTZXNzaW9uKCkuc2V0VmFsdWUoY29kZUNvbnRlbnQpO1xuICAgICAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmNoYW5nZUFjZU1vZGUoKTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIENsZWFyIGxvYWRpbmcgZmxhZyBhZnRlciBzZXR0aW5nIGNvbnRlbnRcbiAgICAgICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5pc0xvYWRpbmdEYXRhID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBTd2l0Y2ggdG8gbWFpbiB0YWIgZm9yIGNvcHkgbW9kZVxuICAgICAgICAgICAgICAgICAgICBpZiAoIXdpbmRvdy5sb2NhdGlvbi5oYXNoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LiR0YWJNZW51SXRlbXMudGFiKCdjaGFuZ2UgdGFiJywgJ21haW4nKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gTWFyayBmb3JtIGFzIGNoYW5nZWQgZm9yIGNvcHkgbW9kZSB0byBlbmFibGUgc2F2ZSBidXR0b25cbiAgICAgICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQXV0by1yZXNpemUgdGV4dGFyZWEgYWZ0ZXIgZGF0YSBpcyBsb2FkZWQgKHdpdGggc21hbGwgZGVsYXkgZm9yIERPTSB1cGRhdGUpXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpO1xuICAgICAgICAgICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBlcnJvck1lc3NhZ2UgPSByZXNwb25zZS5tZXNzYWdlcyAmJiByZXNwb25zZS5tZXNzYWdlcy5lcnJvciA/IFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3Iuam9pbignLCAnKSA6IFxuICAgICAgICAgICAgICAgICAgICAgICAgJ0ZhaWxlZCB0byBjb3B5IGRpYWxwbGFuIGFwcGxpY2F0aW9uJztcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChlcnJvck1lc3NhZ2UpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIGlmICghcmVjb3JkSWQgfHwgcmVjb3JkSWQgPT09ICcnKSB7XG4gICAgICAgICAgICAvLyBGb3IgbmV3IHJlY29yZHMsIGdldCBkZWZhdWx0IHZhbHVlc1xuICAgICAgICAgICAgRGlhbHBsYW5BcHBsaWNhdGlvbnNBUEkuZ2V0RGVmYXVsdChmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZGVmYXVsdEV4dGVuc2lvbiA9IHJlc3BvbnNlLmRhdGEuZXh0ZW5zaW9uO1xuICAgICAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LnVwZGF0ZUV4dGVuc2lvbkRpc3BsYXkocmVzcG9uc2UuZGF0YS5leHRlbnNpb24pO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gU3dpdGNoIHRvIG1haW4gdGFiIGZvciBuZXcgcmVjb3Jkc1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXdpbmRvdy5sb2NhdGlvbi5oYXNoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LiR0YWJNZW51SXRlbXMudGFiKCdjaGFuZ2UgdGFiJywgJ21haW4nKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQXV0by1yZXNpemUgdGV4dGFyZWEgYWZ0ZXIgZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJyk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLm1lc3NhZ2VzICYmIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yID8gXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5tZXNzYWdlcy5lcnJvci5qb2luKCcsICcpIDogXG4gICAgICAgICAgICAgICAgICAgICAgICAnRmFpbGVkIHRvIGxvYWQgZGVmYXVsdCB2YWx1ZXMnO1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGVycm9yTWVzc2FnZSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gRm9yIGV4aXN0aW5nIHJlY29yZHMsIGdldCByZWNvcmQgZGF0YVxuICAgICAgICAgICAgRGlhbHBsYW5BcHBsaWNhdGlvbnNBUEkuZ2V0UmVjb3JkKHJlY29yZElkLCBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRGF0YSBpcyBhbHJlYWR5IHNhbml0aXplZCBpbiBBUEkgbW9kdWxlXG4gICAgICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmRlZmF1bHRFeHRlbnNpb24gPSByZXNwb25zZS5kYXRhLmV4dGVuc2lvbjtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBleHRlbnNpb24gbnVtYmVyIGRpc3BsYXkgaW4gdGhlIHJpYmJvbiBsYWJlbFxuICAgICAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LnVwZGF0ZUV4dGVuc2lvbkRpc3BsYXkocmVzcG9uc2UuZGF0YS5leHRlbnNpb24pO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IEFDRSBlZGl0b3IgY29udGVudCAoYXBwbGljYXRpb25sb2dpYyBpcyBub3Qgc2FuaXRpemVkKVxuICAgICAgICAgICAgICAgICAgICB2YXIgY29kZUNvbnRlbnQgPSByZXNwb25zZS5kYXRhLmFwcGxpY2F0aW9ubG9naWMgfHwgJyc7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBTZXQgZmxhZyB0byBwcmV2ZW50IHJlYWN0aXZhdGluZyBidXR0b25zIGR1cmluZyBkYXRhIGxvYWRcbiAgICAgICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5pc0xvYWRpbmdEYXRhID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLmdldFNlc3Npb24oKS5zZXRWYWx1ZShjb2RlQ29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuY2hhbmdlQWNlTW9kZSgpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgbG9hZGluZyBmbGFnIGFmdGVyIHNldHRpbmcgY29udGVudFxuICAgICAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmlzTG9hZGluZ0RhdGEgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFN3aXRjaCB0byBtYWluIHRhYiBvbmx5IGZvciBjb21wbGV0ZWx5IG5ldyByZWNvcmRzIChubyBuYW1lIGFuZCBubyBleHRlbnNpb24pXG4gICAgICAgICAgICAgICAgICAgIC8vIEhhc2ggaGlzdG9yeSB3aWxsIHByZXNlcnZlIHRoZSB0YWIgZm9yIGV4aXN0aW5nIHJlY29yZHNcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFyZXNwb25zZS5kYXRhLm5hbWUgJiYgIXJlc3BvbnNlLmRhdGEuZXh0ZW5zaW9uICYmICF3aW5kb3cubG9jYXRpb24uaGFzaCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS4kdGFiTWVudUl0ZW1zLnRhYignY2hhbmdlIHRhYicsICdtYWluJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIEF1dG8tcmVzaXplIHRleHRhcmVhIGFmdGVyIGRhdGEgaXMgbG9hZGVkICh3aXRoIHNtYWxsIGRlbGF5IGZvciBET00gdXBkYXRlKVxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCd0ZXh0YXJlYVtuYW1lPVwiZGVzY3JpcHRpb25cIl0nKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXMgJiYgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3IgPyBcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLmpvaW4oJywgJykgOiBcbiAgICAgICAgICAgICAgICAgICAgICAgICdGYWlsZWQgdG8gbG9hZCBkaWFscGxhbiBhcHBsaWNhdGlvbiBkYXRhJztcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKFNlY3VyaXR5VXRpbHMuZXNjYXBlSHRtbChlcnJvck1lc3NhZ2UpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBJRCBmcm9tIFVSTFxuICAgICAqIFxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gUmVjb3JkIElEXG4gICAgICovXG4gICAgZ2V0UmVjb3JkSWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdXJsUGFydHMgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3BsaXQoJy8nKTtcbiAgICAgICAgdmFyIG1vZGlmeUluZGV4ID0gdXJsUGFydHMuaW5kZXhPZignbW9kaWZ5Jyk7XG4gICAgICAgIGlmIChtb2RpZnlJbmRleCAhPT0gLTEgJiYgdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXSkge1xuICAgICAgICAgICAgcmV0dXJuIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICcnO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBBQ0UgZWRpdG9yIHdpdGggc2VjdXJpdHkgY29uc2lkZXJhdGlvbnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQWNlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGFjZUhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCAtIDM4MDtcbiAgICAgICAgdmFyIHJvd3NDb3VudCA9IE1hdGgucm91bmQoYWNlSGVpZ2h0IC8gMTYuMyk7XG4gICAgICAgIFxuICAgICAgICAkKHdpbmRvdykub24oJ2xvYWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkKCcuYXBwbGljYXRpb24tY29kZScpLmNzcygnbWluLWhlaWdodCcsIGFjZUhlaWdodCArICdweCcpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yID0gYWNlLmVkaXQoJ2FwcGxpY2F0aW9uLWNvZGUnKTtcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3Iuc2V0VGhlbWUoJ2FjZS90aGVtZS9tb25va2FpJyk7XG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLnJlc2l6ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gVHJhY2sgY2hhbmdlcyBmb3IgRm9ybS5qc1xuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5nZXRTZXNzaW9uKCkub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgLy8gSWdub3JlIGNoYW5nZXMgZHVyaW5nIGRhdGEgbG9hZGluZyB0byBwcmV2ZW50IHJlYWN0aXZhdGluZyBidXR0b25zXG4gICAgICAgICAgICBpZiAoIWRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuaXNMb2FkaW5nRGF0YSkge1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5zZXRPcHRpb25zKHtcbiAgICAgICAgICAgIG1heExpbmVzOiByb3dzQ291bnQsXG4gICAgICAgICAgICBzaG93UHJpbnRNYXJnaW46IGZhbHNlLFxuICAgICAgICAgICAgc2hvd0xpbmVOdW1iZXJzOiBmYWxzZVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNlY3VyaXR5OiBwcmV2ZW50IGNvZGUgZXhlY3V0aW9uIGluIGVkaXRvclxuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5jb21tYW5kcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIG5hbWU6ICdwcmV2ZW50Q29kZUV4ZWN1dGlvbicsXG4gICAgICAgICAgICBiaW5kS2V5OiB7d2luOiAnQ3RybC1FJywgbWFjOiAnQ29tbWFuZC1FJ30sXG4gICAgICAgICAgICBleGVjOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ0NvZGUgZXhlY3V0aW9uIHByZXZlbnRlZCBmb3Igc2VjdXJpdHknKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBmdWxsc2NyZWVuIGhhbmRsZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZ1bGxzY3JlZW5IYW5kbGVyczogZnVuY3Rpb24oKSB7XG4gICAgICAgICQoJy5mdWxsc2NyZWVuLXRvZ2dsZS1idG4nKS5vbignY2xpY2snLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgY29udGFpbmVyID0gJCh0aGlzKS5zaWJsaW5ncygnLmFwcGxpY2F0aW9uLWNvZGUnKVswXTtcbiAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkudG9nZ2xlRnVsbFNjcmVlbihjb250YWluZXIpO1xuICAgICAgICB9KTtcblxuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdmdWxsc2NyZWVuY2hhbmdlJywgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5hZGp1c3RFZGl0b3JIZWlnaHQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDbGVhbnVwIGV2ZW50IGxpc3RlbmVycyB0byBwcmV2ZW50IG1lbW9yeSBsZWFrc1xuICAgICAqL1xuICAgIGNsZWFudXA6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBSZW1vdmUgZnVsbHNjcmVlbiBldmVudCBsaXN0ZW5lclxuICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdmdWxsc2NyZWVuY2hhbmdlJywgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5hZGp1c3RFZGl0b3JIZWlnaHQpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYW51cCBvdGhlciBldmVudCBsaXN0ZW5lcnMgaWYgbmVlZGVkXG4gICAgICAgICQod2luZG93KS5vZmYoJ2xvYWQnKTtcbiAgICAgICAgJCgnLmZ1bGxzY3JlZW4tdG9nZ2xlLWJ0bicpLm9mZignY2xpY2snKTtcbiAgICAgICAgJCgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJykub2ZmKCdpbnB1dCBwYXN0ZSBrZXl1cCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYW51cCBBQ0UgZWRpdG9yXG4gICAgICAgIGlmIChkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvcikge1xuICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IuZGVzdHJveSgpO1xuICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IgPSBudWxsO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBUb2dnbGUgZnVsbHNjcmVlbiBtb2RlXG4gICAgICogXG4gICAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gY29udGFpbmVyIC0gQ29udGFpbmVyIGVsZW1lbnRcbiAgICAgKi9cbiAgICB0b2dnbGVGdWxsU2NyZWVuOiBmdW5jdGlvbihjb250YWluZXIpIHtcbiAgICAgICAgaWYgKCFkb2N1bWVudC5mdWxsc2NyZWVuRWxlbWVudCkge1xuICAgICAgICAgICAgY29udGFpbmVyLnJlcXVlc3RGdWxsc2NyZWVuKCkuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgYXR0ZW1wdGluZyB0byBlbmFibGUgZnVsbC1zY3JlZW4gbW9kZTogJyArIGVyci5tZXNzYWdlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZG9jdW1lbnQuZXhpdEZ1bGxzY3JlZW4oKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGp1c3QgZWRpdG9yIGhlaWdodCBvbiBmdWxsc2NyZWVuIGNoYW5nZVxuICAgICAqL1xuICAgIGFkanVzdEVkaXRvckhlaWdodDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLnJlc2l6ZSgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2hhbmdlIEFDRSBlZGl0b3IgbW9kZSBiYXNlZCBvbiB0eXBlXG4gICAgICovXG4gICAgY2hhbmdlQWNlTW9kZTogZnVuY3Rpb24odmFsdWUsIHRleHQsICRjaG9pY2UpIHtcbiAgICAgICAgLy8gR2V0IG1vZGUgdmFsdWUgLSBjYW4gYmUgcGFzc2VkIGFzIHBhcmFtZXRlciBvciBmcm9tIGhpZGRlbiBpbnB1dFxuICAgICAgICB2YXIgbW9kZSA9IHZhbHVlIHx8ICQoJyN0eXBlJykudmFsKCk7XG4gICAgICAgIHZhciBOZXdNb2RlO1xuXG4gICAgICAgIGlmIChtb2RlID09PSAncGhwJykge1xuICAgICAgICAgICAgTmV3TW9kZSA9IGFjZS5yZXF1aXJlKCdhY2UvbW9kZS9waHAnKS5Nb2RlO1xuICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3Iuc2V0T3B0aW9ucyh7XG4gICAgICAgICAgICAgICAgc2hvd0xpbmVOdW1iZXJzOiB0cnVlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIE5ld01vZGUgPSBhY2UucmVxdWlyZSgnYWNlL21vZGUvanVsaWEnKS5Nb2RlO1xuICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3Iuc2V0T3B0aW9ucyh7XG4gICAgICAgICAgICAgICAgc2hvd0xpbmVOdW1iZXJzOiBmYWxzZVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5zZXNzaW9uLnNldE1vZGUobmV3IE5ld01vZGUoKSk7XG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYmVmb3JlIGZvcm0gc3VibWlzc2lvblxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBzZXR0aW5ncyAtIEZvcm0gc2V0dGluZ3NcbiAgICAgKiBAcmV0dXJuIHtvYmplY3R8ZmFsc2V9IE1vZGlmaWVkIHNldHRpbmdzIG9yIGZhbHNlIHRvIGNhbmNlbFxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm06IGZ1bmN0aW9uKHNldHRpbmdzKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBhcHBsaWNhdGlvbiBsb2dpYyBmcm9tIEFDRSBlZGl0b3IgKG5vdCBzYW5pdGl6ZWQpXG4gICAgICAgIHJlc3VsdC5kYXRhLmFwcGxpY2F0aW9ubG9naWMgPSBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5nZXRWYWx1ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gUGFzcyBjdXJyZW50IGFjdGl2ZSB0YWIgZm9yIHJlZGlyZWN0XG4gICAgICAgIHJlc3VsdC5kYXRhLmN1cnJlbnRUYWIgPSBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmN1cnJlbnRBY3RpdmVUYWI7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgcmVjb3JkIElEIGZvciB1cGRhdGVzXG4gICAgICAgIHZhciByZWNvcmRJZCA9IGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZ2V0UmVjb3JkSWQoKTtcbiAgICAgICAgaWYgKHJlY29yZElkICYmIHJlY29yZElkICE9PSAnJykge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuaWQgPSByZWNvcmRJZDtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLnVuaXFpZCA9IHJlY29yZElkO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uIChubyBzdWNjZXNzIG1lc3NhZ2VzIC0gVUkgdXBkYXRlcyBvbmx5KVxuICAgICAqXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gU2VydmVyIHJlc3BvbnNlXG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtOiBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIC8vIERhdGEgaXMgYWxyZWFkeSBzYW5pdGl6ZWQgaW4gQVBJIG1vZHVsZVxuICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGV4dGVuc2lvbiBudW1iZXIgZGlzcGxheSBpbiB0aGUgcmliYm9uIGxhYmVsXG4gICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS51cGRhdGVFeHRlbnNpb25EaXNwbGF5KHJlc3BvbnNlLmRhdGEuZXh0ZW5zaW9uKTtcblxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBBQ0UgZWRpdG9yIGNvbnRlbnRcbiAgICAgICAgICAgICAgICB2YXIgY29kZUNvbnRlbnQgPSByZXNwb25zZS5kYXRhLmFwcGxpY2F0aW9ubG9naWMgfHwgJyc7XG4gICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IuZ2V0U2Vzc2lvbigpLnNldFZhbHVlKGNvZGVDb250ZW50KTtcblxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSByZWRpcmVjdCB3aXRoIHRhYiBwcmVzZXJ2YXRpb25cbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5yZWRpcmVjdFRhYiAmJiByZXNwb25zZS5kYXRhLnJlZGlyZWN0VGFiICE9PSAnbWFpbicpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIEZvcm0uanMgcmVkaXJlY3QgVVJMIHRvIGluY2x1ZGUgaGFzaFxuICAgICAgICAgICAgICAgICAgICB2YXIgY3VycmVudElkID0gJCgnI2lkJykudmFsKCkgfHwgcmVzcG9uc2UuZGF0YS51bmlxaWQ7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjdXJyZW50SWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBnbG9iYWxSb290VXJsICsgJ2RpYWxwbGFuLWFwcGxpY2F0aW9ucy9tb2RpZnkvJyArIGN1cnJlbnRJZCArICcjLycgKyByZXNwb25zZS5kYXRhLnJlZGlyZWN0VGFiO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBGb3JtLmpzIHdpbGwgaGFuZGxlIGFsbCByZWRpcmVjdCBsb2dpYyBiYXNlZCBvbiBzdWJtaXRNb2RlXG5cbiAgICAgICAgICAgIC8vIE5vIHN1Y2Nlc3MgbWVzc2FnZSAtIGp1c3Qgc2lsZW50IHVwZGF0ZVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggc2FuaXRpemVkIGRhdGFcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIEZvcm0gZGF0YVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybTogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAvLyBVc2UgdW5pZmllZCBzaWxlbnQgcG9wdWxhdGlvbiBhcHByb2FjaFxuICAgICAgICBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KGRhdGEsIHtcbiAgICAgICAgICAgIGJlZm9yZVBvcHVsYXRlOiAoZm9ybURhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3duIGlmIG5vdCBhbHJlYWR5IGRvbmVcbiAgICAgICAgICAgICAgICBpZiAoISQoJyN0eXBlLWRyb3Bkb3duJykubGVuZ3RoKSB7XG4gICAgICAgICAgICAgICAgICAgIER5bmFtaWNEcm9wZG93bkJ1aWxkZXIuYnVpbGREcm9wZG93bigndHlwZScsIGZvcm1EYXRhLCB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdGF0aWNPcHRpb25zOiBbXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeyB2YWx1ZTogJ3BocCcsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5kYV9UeXBlUGhwIH0sXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgeyB2YWx1ZTogJ3BsYWludGV4dCcsIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5kYV9UeXBlUGxhaW50ZXh0IH1cbiAgICAgICAgICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgICAgICAgICBwbGFjZWhvbGRlcjogZ2xvYmFsVHJhbnNsYXRlLmRhX1NlbGVjdFR5cGUsXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkNoYW5nZTogZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5jaGFuZ2VBY2VNb2RlXG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhZnRlclBvcHVsYXRlOiAoZm9ybURhdGEpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uaW5pdGlhbGl6ZURpcnJpdHkoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQXV0by1yZXNpemUgdGV4dGFyZWEgYWZ0ZXIgZGF0YSBpcyBwb3B1bGF0ZWRcbiAgICAgICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG4vKipcbiAqIEN1c3RvbSB2YWxpZGF0aW9uIHJ1bGUgZm9yIGV4dGVuc2lvbiBleGlzdGVuY2VcbiAqL1xuJC5mbi5mb3JtLnNldHRpbmdzLnJ1bGVzLmV4aXN0UnVsZSA9IGZ1bmN0aW9uKHZhbHVlLCBwYXJhbWV0ZXIpIHsgXG4gICAgcmV0dXJuICQoJyMnICsgcGFyYW1ldGVyKS5oYXNDbGFzcygnaGlkZGVuJyk7IFxufTtcblxuLyoqXG4gKiBJbml0aWFsaXplIG9uIGRvY3VtZW50IHJlYWR5XG4gKi9cbiQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uKCkge1xuICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuaW5pdGlhbGl6ZSgpO1xufSk7XG5cbiJdfQ==