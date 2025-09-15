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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9EaWFscGxhbkFwcGxpY2F0aW9ucy9kaWFscGxhbi1hcHBsaWNhdGlvbnMtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbImRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkiLCIkZm9ybU9iaiIsIiQiLCIkbnVtYmVyIiwiJHRhYk1lbnVJdGVtcyIsImRlZmF1bHRFeHRlbnNpb24iLCJlZGl0b3IiLCJjdXJyZW50QWN0aXZlVGFiIiwiaXNMb2FkaW5nRGF0YSIsInZhbGlkYXRlUnVsZXMiLCJuYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsImRhX1ZhbGlkYXRlTmFtZUlzRW1wdHkiLCJkYV9WYWxpZGF0ZU5hbWVUb29Mb25nIiwiZXh0ZW5zaW9uIiwidmFsdWUiLCJkYV9WYWxpZGF0ZUV4dGVuc2lvbk51bWJlciIsImRhX1ZhbGlkYXRlRXh0ZW5zaW9uSXNFbXB0eSIsImRhX1ZhbGlkYXRlRXh0ZW5zaW9uRG91YmxlIiwidXBkYXRlRXh0ZW5zaW9uRGlzcGxheSIsImV4dGVuc2lvbkRpc3BsYXkiLCJ0ZXh0IiwiaW5pdGlhbGl6ZSIsInRhYiIsImhpc3RvcnkiLCJoaXN0b3J5VHlwZSIsIm9uVmlzaWJsZSIsInRhYlBhdGgiLCJzZXRUaW1lb3V0IiwicmVzaXplIiwidGltZW91dElkIiwib24iLCJjbGVhclRpbWVvdXQiLCJuZXdOdW1iZXIiLCJmb3JtIiwiRXh0ZW5zaW9ucyIsImNoZWNrQXZhaWxhYmlsaXR5IiwiRm9ybSIsInVybCIsImNiQmVmb3JlU2VuZEZvcm0iLCJjYkFmdGVyU2VuZEZvcm0iLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJEaWFscGxhbkFwcGxpY2F0aW9uc0FQSSIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwiaW5pdGlhbGl6ZUFkYXB0aXZlVGV4dGFyZWEiLCJpbml0aWFsaXplQWNlIiwiaW5pdGlhbGl6ZUZ1bGxzY3JlZW5IYW5kbGVycyIsImluaXRpYWxpemVGb3JtIiwiRm9ybUVsZW1lbnRzIiwib3B0aW1pemVUZXh0YXJlYVNpemUiLCJyZWNvcmRJZCIsImdldFJlY29yZElkIiwiY29weUZyb21JZCIsInZhbCIsInVybFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsIndpbmRvdyIsImxvY2F0aW9uIiwic2VhcmNoIiwiY29weVBhcmFtIiwiZ2V0IiwiaXNDb3B5TW9kZSIsInNvdXJjZUlkIiwiY29weSIsInJlc3BvbnNlIiwicmVzdWx0IiwicG9wdWxhdGVGb3JtIiwiZGF0YSIsImNvZGVDb250ZW50IiwiYXBwbGljYXRpb25sb2dpYyIsImdldFNlc3Npb24iLCJzZXRWYWx1ZSIsImNoYW5nZUFjZU1vZGUiLCJoYXNoIiwiZGF0YUNoYW5nZWQiLCJlcnJvck1lc3NhZ2UiLCJtZXNzYWdlcyIsImVycm9yIiwiam9pbiIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwiU2VjdXJpdHlVdGlscyIsImVzY2FwZUh0bWwiLCJnZXREZWZhdWx0IiwiZ2V0UmVjb3JkIiwidXJsUGFydHMiLCJwYXRobmFtZSIsInNwbGl0IiwibW9kaWZ5SW5kZXgiLCJpbmRleE9mIiwiYWNlSGVpZ2h0IiwiaW5uZXJIZWlnaHQiLCJyb3dzQ291bnQiLCJNYXRoIiwicm91bmQiLCJjc3MiLCJhY2UiLCJlZGl0Iiwic2V0VGhlbWUiLCJzZXRPcHRpb25zIiwibWF4TGluZXMiLCJzaG93UHJpbnRNYXJnaW4iLCJzaG93TGluZU51bWJlcnMiLCJjb21tYW5kcyIsImFkZENvbW1hbmQiLCJiaW5kS2V5Iiwid2luIiwibWFjIiwiZXhlYyIsImNvbnNvbGUiLCJ3YXJuIiwiY29udGFpbmVyIiwic2libGluZ3MiLCJ0b2dnbGVGdWxsU2NyZWVuIiwiZG9jdW1lbnQiLCJhZGRFdmVudExpc3RlbmVyIiwiYWRqdXN0RWRpdG9ySGVpZ2h0IiwiY2xlYW51cCIsInJlbW92ZUV2ZW50TGlzdGVuZXIiLCJvZmYiLCJkZXN0cm95IiwiZnVsbHNjcmVlbkVsZW1lbnQiLCJyZXF1ZXN0RnVsbHNjcmVlbiIsImVyciIsIm1lc3NhZ2UiLCJleGl0RnVsbHNjcmVlbiIsIiRjaG9pY2UiLCJtb2RlIiwiTmV3TW9kZSIsInJlcXVpcmUiLCJNb2RlIiwic2Vzc2lvbiIsInNldE1vZGUiLCJzZXR0aW5ncyIsImdldFZhbHVlIiwiY3VycmVudFRhYiIsImlkIiwidW5pcWlkIiwicmVkaXJlY3RUYWIiLCJjdXJyZW50SWQiLCJuZXdVcmwiLCJocmVmIiwicmVwbGFjZSIsInB1c2hTdGF0ZSIsInBvcHVsYXRlRm9ybVNpbGVudGx5IiwiYmVmb3JlUG9wdWxhdGUiLCJmb3JtRGF0YSIsImxlbmd0aCIsIkR5bmFtaWNEcm9wZG93bkJ1aWxkZXIiLCJidWlsZERyb3Bkb3duIiwic3RhdGljT3B0aW9ucyIsImRhX1R5cGVQaHAiLCJkYV9UeXBlUGxhaW50ZXh0IiwicGxhY2Vob2xkZXIiLCJkYV9TZWxlY3RUeXBlIiwib25DaGFuZ2UiLCJhZnRlclBvcHVsYXRlIiwiZW5hYmxlRGlycml0eSIsImluaXRpYWxpemVEaXJyaXR5IiwiZm4iLCJleGlzdFJ1bGUiLCJwYXJhbWV0ZXIiLCJoYXNDbGFzcyIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLElBQUlBLHlCQUF5QixHQUFHO0FBQzVCQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyw0QkFBRCxDQURpQjtBQUU1QkMsRUFBQUEsT0FBTyxFQUFFRCxDQUFDLENBQUMsWUFBRCxDQUZrQjtBQUc1QkUsRUFBQUEsYUFBYSxFQUFFRixDQUFDLENBQUMsOEJBQUQsQ0FIWTtBQUk1QkcsRUFBQUEsZ0JBQWdCLEVBQUUsRUFKVTtBQUs1QkMsRUFBQUEsTUFBTSxFQUFFLElBTG9CO0FBTTVCQyxFQUFBQSxnQkFBZ0IsRUFBRSxNQU5VO0FBTUY7QUFDMUJDLEVBQUFBLGFBQWEsRUFBRSxLQVBh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QUFoQztBQThkQTtBQUNBO0FBQ0E7O0FBQ0F4RCxDQUFDLENBQUNzSyxFQUFGLENBQUtsSSxJQUFMLENBQVV3RyxRQUFWLENBQW1CbEksS0FBbkIsQ0FBeUI2SixTQUF6QixHQUFxQyxVQUFTdEosS0FBVCxFQUFnQnVKLFNBQWhCLEVBQTJCO0FBQzVELFNBQU94SyxDQUFDLENBQUMsTUFBTXdLLFNBQVAsQ0FBRCxDQUFtQkMsUUFBbkIsQ0FBNEIsUUFBNUIsQ0FBUDtBQUNILENBRkQ7QUFJQTtBQUNBO0FBQ0E7OztBQUNBekssQ0FBQyxDQUFDeUgsUUFBRCxDQUFELENBQVlpRCxLQUFaLENBQWtCLFlBQVc7QUFDekI1SyxFQUFBQSx5QkFBeUIsQ0FBQzBCLFVBQTFCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqL1xuXG4vKiBnbG9iYWwgRGlhbHBsYW5BcHBsaWNhdGlvbnNBUEksIEZvcm0sIFNlY3VyaXR5VXRpbHMsIGdsb2JhbFRyYW5zbGF0ZSwgRXh0ZW5zaW9ucywgYWNlLCBVc2VyTWVzc2FnZSwgRm9ybUVsZW1lbnRzICovXG5cbi8qKlxuICogRGlhbHBsYW4gYXBwbGljYXRpb24gZWRpdCBmb3JtIG1hbmFnZW1lbnQgbW9kdWxlIHdpdGggZW5oYW5jZWQgc2VjdXJpdHlcbiAqL1xudmFyIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkgPSB7XG4gICAgJGZvcm1PYmo6ICQoJyNkaWFscGxhbi1hcHBsaWNhdGlvbi1mb3JtJyksXG4gICAgJG51bWJlcjogJCgnI2V4dGVuc2lvbicpLFxuICAgICR0YWJNZW51SXRlbXM6ICQoJyNhcHBsaWNhdGlvbi1jb2RlLW1lbnUgLml0ZW0nKSxcbiAgICBkZWZhdWx0RXh0ZW5zaW9uOiAnJyxcbiAgICBlZGl0b3I6IG51bGwsXG4gICAgY3VycmVudEFjdGl2ZVRhYjogJ21haW4nLCAvLyBUcmFjayBjdXJyZW50IGFjdGl2ZSB0YWJcbiAgICBpc0xvYWRpbmdEYXRhOiBmYWxzZSwgLy8gRmxhZyB0byBwcmV2ZW50IGJ1dHRvbiByZWFjdGl2YXRpb24gZHVyaW5nIGRhdGEgbG9hZGluZ1xuICAgIFxuICAgIC8qKlxuICAgICAqIEZvcm0gdmFsaWRhdGlvbiBydWxlcyBcbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIG5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICduYW1lJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5kYV9WYWxpZGF0ZU5hbWVJc0VtcHR5XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdtYXhMZW5ndGhbNTBdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZGFfVmFsaWRhdGVOYW1lVG9vTG9uZyB8fCAnTmFtZSBpcyB0b28gbG9uZyAobWF4IDUwIGNoYXJhY3RlcnMpJ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfSxcbiAgICAgICAgZXh0ZW5zaW9uOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnZXh0ZW5zaW9uJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6ICcvXlswLTkjK1xcXFwqfFhdezEsNjR9JC8nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5kYV9WYWxpZGF0ZUV4dGVuc2lvbk51bWJlcixcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZGFfVmFsaWRhdGVFeHRlbnNpb25Jc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZXhpc3RSdWxlW2V4dGVuc2lvbi1lcnJvcl0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5kYV9WYWxpZGF0ZUV4dGVuc2lvbkRvdWJsZSxcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIGV4dGVuc2lvbiBkaXNwbGF5IGluIHJpYmJvbiBsYWJlbFxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBleHRlbnNpb24gLSBFeHRlbnNpb24gbnVtYmVyXG4gICAgICovXG4gICAgdXBkYXRlRXh0ZW5zaW9uRGlzcGxheTogZnVuY3Rpb24oZXh0ZW5zaW9uKSB7XG4gICAgICAgIHZhciBleHRlbnNpb25EaXNwbGF5ID0gJCgnI2V4dGVuc2lvbi1kaXNwbGF5Jyk7XG4gICAgICAgIGV4dGVuc2lvbkRpc3BsYXkudGV4dChleHRlbnNpb24gfHwgJycpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBtb2R1bGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gRW5hYmxlIHRhYiBuYXZpZ2F0aW9uIHdpdGggaGlzdG9yeSBzdXBwb3J0XG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuJHRhYk1lbnVJdGVtcy50YWIoe1xuICAgICAgICAgICAgaGlzdG9yeTogdHJ1ZSxcbiAgICAgICAgICAgIGhpc3RvcnlUeXBlOiAnaGFzaCcsXG4gICAgICAgICAgICBvblZpc2libGU6IGZ1bmN0aW9uKHRhYlBhdGgpIHtcbiAgICAgICAgICAgICAgICAvLyBUcmFjayBjdXJyZW50IGFjdGl2ZSB0YWJcbiAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmN1cnJlbnRBY3RpdmVUYWIgPSB0YWJQYXRoO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFJlc2l6ZSBBQ0UgZWRpdG9yIHdoZW4gY29kZSB0YWIgYmVjb21lcyB2aXNpYmxlXG4gICAgICAgICAgICAgICAgaWYgKHRhYlBhdGggPT09ICdjb2RlJyAmJiBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvcikge1xuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLnJlc2l6ZSgpO1xuICAgICAgICAgICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7ICAgICAgICBcbiAgICAgICAgLy8gRXh0ZW5zaW9uIGF2YWlsYWJpbGl0eSBjaGVja1xuICAgICAgICB2YXIgdGltZW91dElkO1xuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LiRudW1iZXIub24oJ2lucHV0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAodGltZW91dElkKSBjbGVhclRpbWVvdXQodGltZW91dElkKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgbmV3TnVtYmVyID0gZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZXh0ZW5zaW9uJyk7XG4gICAgICAgICAgICAgICAgRXh0ZW5zaW9ucy5jaGVja0F2YWlsYWJpbGl0eShkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmRlZmF1bHRFeHRlbnNpb24sIG5ld051bWJlcik7XG4gICAgICAgICAgICB9LCA1MDApO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyZSBGb3JtLmpzIGZvciBSRVNUIEFQSVxuICAgICAgICBGb3JtLiRmb3JtT2JqID0gZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5jYkFmdGVyU2VuZEZvcm07XG4gICAgICAgIFxuICAgICAgICAvLyBSRVNUIEFQSSB2MyBpbnRlZ3JhdGlvblxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IERpYWxwbGFuQXBwbGljYXRpb25zQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZVJlY29yZCc7IC8vIFVzZSBzYXZlUmVjb3JkIG1ldGhvZCBmcm9tIFBieEFwaUNsaWVudFxuICAgICAgICBcbiAgICAgICAgLy8gTmF2aWdhdGlvbiBVUkxzXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGdsb2JhbFJvb3RVcmwgKyAnZGlhbHBsYW4tYXBwbGljYXRpb25zL2luZGV4Lyc7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBnbG9iYWxSb290VXJsICsgJ2RpYWxwbGFuLWFwcGxpY2F0aW9ucy9tb2RpZnkvJztcbiAgICAgICAgXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBhZGFwdGl2ZSB0ZXh0YXJlYSBmb3IgZGVzY3JpcHRpb24gZmllbGRcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5pbml0aWFsaXplQWRhcHRpdmVUZXh0YXJlYSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBjb21wb25lbnRzXG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuaW5pdGlhbGl6ZUFjZSgpO1xuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmluaXRpYWxpemVGdWxsc2NyZWVuSGFuZGxlcnMoKTtcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5pbml0aWFsaXplRm9ybSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGFkYXB0aXZlIHRleHRhcmVhIGZvciBkZXNjcmlwdGlvbiBmaWVsZFxuICAgICAqL1xuICAgIGluaXRpYWxpemVBZGFwdGl2ZVRleHRhcmVhOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gU2V0IHVwIGFkYXB0aXZlIHJlc2l6aW5nIGZvciBkZXNjcmlwdGlvbiB0ZXh0YXJlYVxuICAgICAgICAkKCd0ZXh0YXJlYVtuYW1lPVwiZGVzY3JpcHRpb25cIl0nKS5vbignaW5wdXQgcGFzdGUga2V5dXAnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSgkKHRoaXMpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsIHJlc2l6ZSBhZnRlciBmb3JtIGRhdGEgaXMgbG9hZGVkXG4gICAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgZm9ybSBkYXRhIHZpYSBSRVNUIEFQSVxuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHJlY29yZElkID0gZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5nZXRSZWNvcmRJZCgpO1xuICAgICAgICB2YXIgY29weUZyb21JZCA9ICQoJyNjb3B5LWZyb20taWQnKS52YWwoKTtcbiAgICAgICAgdmFyIHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG4gICAgICAgIHZhciBjb3B5UGFyYW0gPSB1cmxQYXJhbXMuZ2V0KCdjb3B5Jyk7XG4gICAgICAgIHZhciBpc0NvcHlNb2RlID0gY29weVBhcmFtIHx8IGNvcHlGcm9tSWQ7XG4gICAgICAgIFxuICAgICAgICAvLyBDaGVjayBjb3B5IG1vZGUgZmlyc3QgKGJlZm9yZSBjaGVja2luZyBmb3IgbmV3IHJlY29yZClcbiAgICAgICAgaWYgKGlzQ29weU1vZGUpIHtcbiAgICAgICAgICAgIC8vIFVzZSB0aGUgUkVTVGZ1bCBjb3B5IG1ldGhvZFxuICAgICAgICAgICAgdmFyIHNvdXJjZUlkID0gY29weVBhcmFtIHx8IGNvcHlGcm9tSWQ7XG4gICAgICAgICAgICBEaWFscGxhbkFwcGxpY2F0aW9uc0FQSS5jb3B5KHNvdXJjZUlkLCBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gRGF0YSBpcyBhbHJlYWR5IHNhbml0aXplZCBpbiBBUEkgbW9kdWxlXG4gICAgICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmRlZmF1bHRFeHRlbnNpb24gPSByZXNwb25zZS5kYXRhLmV4dGVuc2lvbjtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBleHRlbnNpb24gbnVtYmVyIGRpc3BsYXkgaW4gdGhlIHJpYmJvbiBsYWJlbFxuICAgICAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LnVwZGF0ZUV4dGVuc2lvbkRpc3BsYXkocmVzcG9uc2UuZGF0YS5leHRlbnNpb24pO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gU2V0IEFDRSBlZGl0b3IgY29udGVudCAoYXBwbGljYXRpb25sb2dpYyBpcyBub3Qgc2FuaXRpemVkKVxuICAgICAgICAgICAgICAgICAgICB2YXIgY29kZUNvbnRlbnQgPSByZXNwb25zZS5kYXRhLmFwcGxpY2F0aW9ubG9naWMgfHwgJyc7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBTZXQgZmxhZyB0byBwcmV2ZW50IHJlYWN0aXZhdGluZyBidXR0b25zIGR1cmluZyBkYXRhIGxvYWRcbiAgICAgICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5pc0xvYWRpbmdEYXRhID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLmdldFNlc3Npb24oKS5zZXRWYWx1ZShjb2RlQ29udGVudCk7XG4gICAgICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuY2hhbmdlQWNlTW9kZSgpO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQ2xlYXIgbG9hZGluZyBmbGFnIGFmdGVyIHNldHRpbmcgY29udGVudFxuICAgICAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmlzTG9hZGluZ0RhdGEgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFN3aXRjaCB0byBtYWluIHRhYiBmb3IgY29weSBtb2RlXG4gICAgICAgICAgICAgICAgICAgIGlmICghd2luZG93LmxvY2F0aW9uLmhhc2gpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuJHRhYk1lbnVJdGVtcy50YWIoJ2NoYW5nZSB0YWInLCAnbWFpbicpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBNYXJrIGZvcm0gYXMgY2hhbmdlZCBmb3IgY29weSBtb2RlIHRvIGVuYWJsZSBzYXZlIGJ1dHRvblxuICAgICAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBBdXRvLXJlc2l6ZSB0ZXh0YXJlYSBhZnRlciBkYXRhIGlzIGxvYWRlZCAod2l0aCBzbWFsbCBkZWxheSBmb3IgRE9NIHVwZGF0ZSlcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJyk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLm1lc3NhZ2VzICYmIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yID8gXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5tZXNzYWdlcy5lcnJvci5qb2luKCcsICcpIDogXG4gICAgICAgICAgICAgICAgICAgICAgICAnRmFpbGVkIHRvIGNvcHkgZGlhbHBsYW4gYXBwbGljYXRpb24nO1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGVycm9yTWVzc2FnZSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2UgaWYgKCFyZWNvcmRJZCB8fCByZWNvcmRJZCA9PT0gJycpIHtcbiAgICAgICAgICAgIC8vIEZvciBuZXcgcmVjb3JkcywgZ2V0IGRlZmF1bHQgdmFsdWVzXG4gICAgICAgICAgICBEaWFscGxhbkFwcGxpY2F0aW9uc0FQSS5nZXREZWZhdWx0KGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5kZWZhdWx0RXh0ZW5zaW9uID0gcmVzcG9uc2UuZGF0YS5leHRlbnNpb247XG4gICAgICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkudXBkYXRlRXh0ZW5zaW9uRGlzcGxheShyZXNwb25zZS5kYXRhLmV4dGVuc2lvbik7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBTd2l0Y2ggdG8gbWFpbiB0YWIgZm9yIG5ldyByZWNvcmRzXG4gICAgICAgICAgICAgICAgICAgIGlmICghd2luZG93LmxvY2F0aW9uLmhhc2gpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuJHRhYk1lbnVJdGVtcy50YWIoJ2NoYW5nZSB0YWInLCAnbWFpbicpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBBdXRvLXJlc2l6ZSB0ZXh0YXJlYSBhZnRlciBkYXRhIGlzIGxvYWRlZFxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCd0ZXh0YXJlYVtuYW1lPVwiZGVzY3JpcHRpb25cIl0nKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2UubWVzc2FnZXMgJiYgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3IgPyBcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLmpvaW4oJywgJykgOiBcbiAgICAgICAgICAgICAgICAgICAgICAgICdGYWlsZWQgdG8gbG9hZCBkZWZhdWx0IHZhbHVlcyc7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZXJyb3JNZXNzYWdlKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBGb3IgZXhpc3RpbmcgcmVjb3JkcywgZ2V0IHJlY29yZCBkYXRhXG4gICAgICAgICAgICBEaWFscGxhbkFwcGxpY2F0aW9uc0FQSS5nZXRSZWNvcmQocmVjb3JkSWQsIGZ1bmN0aW9uKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBEYXRhIGlzIGFscmVhZHkgc2FuaXRpemVkIGluIEFQSSBtb2R1bGVcbiAgICAgICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZGVmYXVsdEV4dGVuc2lvbiA9IHJlc3BvbnNlLmRhdGEuZXh0ZW5zaW9uO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIGV4dGVuc2lvbiBudW1iZXIgZGlzcGxheSBpbiB0aGUgcmliYm9uIGxhYmVsXG4gICAgICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkudXBkYXRlRXh0ZW5zaW9uRGlzcGxheShyZXNwb25zZS5kYXRhLmV4dGVuc2lvbik7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBTZXQgQUNFIGVkaXRvciBjb250ZW50IChhcHBsaWNhdGlvbmxvZ2ljIGlzIG5vdCBzYW5pdGl6ZWQpXG4gICAgICAgICAgICAgICAgICAgIHZhciBjb2RlQ29udGVudCA9IHJlc3BvbnNlLmRhdGEuYXBwbGljYXRpb25sb2dpYyB8fCAnJztcbiAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgICAgIC8vIFNldCBmbGFnIHRvIHByZXZlbnQgcmVhY3RpdmF0aW5nIGJ1dHRvbnMgZHVyaW5nIGRhdGEgbG9hZFxuICAgICAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmlzTG9hZGluZ0RhdGEgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IuZ2V0U2Vzc2lvbigpLnNldFZhbHVlKGNvZGVDb250ZW50KTtcbiAgICAgICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5jaGFuZ2VBY2VNb2RlKCk7XG4gICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgICAgICAvLyBDbGVhciBsb2FkaW5nIGZsYWcgYWZ0ZXIgc2V0dGluZyBjb250ZW50XG4gICAgICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuaXNMb2FkaW5nRGF0YSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gU3dpdGNoIHRvIG1haW4gdGFiIG9ubHkgZm9yIGNvbXBsZXRlbHkgbmV3IHJlY29yZHMgKG5vIG5hbWUgYW5kIG5vIGV4dGVuc2lvbilcbiAgICAgICAgICAgICAgICAgICAgLy8gSGFzaCBoaXN0b3J5IHdpbGwgcHJlc2VydmUgdGhlIHRhYiBmb3IgZXhpc3RpbmcgcmVjb3Jkc1xuICAgICAgICAgICAgICAgICAgICBpZiAoIXJlc3BvbnNlLmRhdGEubmFtZSAmJiAhcmVzcG9uc2UuZGF0YS5leHRlbnNpb24gJiYgIXdpbmRvdy5sb2NhdGlvbi5oYXNoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LiR0YWJNZW51SXRlbXMudGFiKCdjaGFuZ2UgdGFiJywgJ21haW4nKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAgICAgLy8gQXV0by1yZXNpemUgdGV4dGFyZWEgYWZ0ZXIgZGF0YSBpcyBsb2FkZWQgKHdpdGggc21hbGwgZGVsYXkgZm9yIERPTSB1cGRhdGUpXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpO1xuICAgICAgICAgICAgICAgICAgICB9LCAxMDApO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBlcnJvck1lc3NhZ2UgPSByZXNwb25zZS5tZXNzYWdlcyAmJiByZXNwb25zZS5tZXNzYWdlcy5lcnJvciA/IFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3Iuam9pbignLCAnKSA6IFxuICAgICAgICAgICAgICAgICAgICAgICAgJ0ZhaWxlZCB0byBsb2FkIGRpYWxwbGFuIGFwcGxpY2F0aW9uIGRhdGEnO1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGVycm9yTWVzc2FnZSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgcmVjb3JkIElEIGZyb20gVVJMXG4gICAgICogXG4gICAgICogQHJldHVybiB7c3RyaW5nfSBSZWNvcmQgSURcbiAgICAgKi9cbiAgICBnZXRSZWNvcmRJZDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciB1cmxQYXJ0cyA9IHdpbmRvdy5sb2NhdGlvbi5wYXRobmFtZS5zcGxpdCgnLycpO1xuICAgICAgICB2YXIgbW9kaWZ5SW5kZXggPSB1cmxQYXJ0cy5pbmRleE9mKCdtb2RpZnknKTtcbiAgICAgICAgaWYgKG1vZGlmeUluZGV4ICE9PSAtMSAmJiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdKSB7XG4gICAgICAgICAgICByZXR1cm4gdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gJyc7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIEFDRSBlZGl0b3Igd2l0aCBzZWN1cml0eSBjb25zaWRlcmF0aW9uc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVBY2U6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgYWNlSGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0IC0gMzgwO1xuICAgICAgICB2YXIgcm93c0NvdW50ID0gTWF0aC5yb3VuZChhY2VIZWlnaHQgLyAxNi4zKTtcbiAgICAgICAgXG4gICAgICAgICQod2luZG93KS5vbignbG9hZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICQoJy5hcHBsaWNhdGlvbi1jb2RlJykuY3NzKCdtaW4taGVpZ2h0JywgYWNlSGVpZ2h0ICsgJ3B4Jyk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IgPSBhY2UuZWRpdCgnYXBwbGljYXRpb24tY29kZScpO1xuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5zZXRUaGVtZSgnYWNlL3RoZW1lL21vbm9rYWknKTtcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IucmVzaXplKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBUcmFjayBjaGFuZ2VzIGZvciBGb3JtLmpzXG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLmdldFNlc3Npb24oKS5vbignY2hhbmdlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAvLyBJZ25vcmUgY2hhbmdlcyBkdXJpbmcgZGF0YSBsb2FkaW5nIHRvIHByZXZlbnQgcmVhY3RpdmF0aW5nIGJ1dHRvbnNcbiAgICAgICAgICAgIGlmICghZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5pc0xvYWRpbmdEYXRhKSB7XG4gICAgICAgICAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLnNldE9wdGlvbnMoe1xuICAgICAgICAgICAgbWF4TGluZXM6IHJvd3NDb3VudCxcbiAgICAgICAgICAgIHNob3dQcmludE1hcmdpbjogZmFsc2UsXG4gICAgICAgICAgICBzaG93TGluZU51bWJlcnM6IGZhbHNlXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gU2VjdXJpdHk6IHByZXZlbnQgY29kZSBleGVjdXRpb24gaW4gZWRpdG9yXG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLmNvbW1hbmRzLmFkZENvbW1hbmQoe1xuICAgICAgICAgICAgbmFtZTogJ3ByZXZlbnRDb2RlRXhlY3V0aW9uJyxcbiAgICAgICAgICAgIGJpbmRLZXk6IHt3aW46ICdDdHJsLUUnLCBtYWM6ICdDb21tYW5kLUUnfSxcbiAgICAgICAgICAgIGV4ZWM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybignQ29kZSBleGVjdXRpb24gcHJldmVudGVkIGZvciBzZWN1cml0eScpO1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIGZ1bGxzY3JlZW4gaGFuZGxlcnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRnVsbHNjcmVlbkhhbmRsZXJzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgJCgnLmZ1bGxzY3JlZW4tdG9nZ2xlLWJ0bicpLm9uKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIHZhciBjb250YWluZXIgPSAkKHRoaXMpLnNpYmxpbmdzKCcuYXBwbGljYXRpb24tY29kZScpWzBdO1xuICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS50b2dnbGVGdWxsU2NyZWVuKGNvbnRhaW5lcik7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2Z1bGxzY3JlZW5jaGFuZ2UnLCBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmFkanVzdEVkaXRvckhlaWdodCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENsZWFudXAgZXZlbnQgbGlzdGVuZXJzIHRvIHByZXZlbnQgbWVtb3J5IGxlYWtzXG4gICAgICovXG4gICAgY2xlYW51cDogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIFJlbW92ZSBmdWxsc2NyZWVuIGV2ZW50IGxpc3RlbmVyXG4gICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Z1bGxzY3JlZW5jaGFuZ2UnLCBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmFkanVzdEVkaXRvckhlaWdodCk7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhbnVwIG90aGVyIGV2ZW50IGxpc3RlbmVycyBpZiBuZWVkZWRcbiAgICAgICAgJCh3aW5kb3cpLm9mZignbG9hZCcpO1xuICAgICAgICAkKCcuZnVsbHNjcmVlbi10b2dnbGUtYnRuJykub2ZmKCdjbGljaycpO1xuICAgICAgICAkKCd0ZXh0YXJlYVtuYW1lPVwiZGVzY3JpcHRpb25cIl0nKS5vZmYoJ2lucHV0IHBhc3RlIGtleXVwJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDbGVhbnVwIEFDRSBlZGl0b3JcbiAgICAgICAgaWYgKGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yKSB7XG4gICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5kZXN0cm95KCk7XG4gICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvciA9IG51bGw7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFRvZ2dsZSBmdWxsc2NyZWVuIG1vZGVcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBjb250YWluZXIgLSBDb250YWluZXIgZWxlbWVudFxuICAgICAqL1xuICAgIHRvZ2dsZUZ1bGxTY3JlZW46IGZ1bmN0aW9uKGNvbnRhaW5lcikge1xuICAgICAgICBpZiAoIWRvY3VtZW50LmZ1bGxzY3JlZW5FbGVtZW50KSB7XG4gICAgICAgICAgICBjb250YWluZXIucmVxdWVzdEZ1bGxzY3JlZW4oKS5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBhdHRlbXB0aW5nIHRvIGVuYWJsZSBmdWxsLXNjcmVlbiBtb2RlOiAnICsgZXJyLm1lc3NhZ2UpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkb2N1bWVudC5leGl0RnVsbHNjcmVlbigpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFkanVzdCBlZGl0b3IgaGVpZ2h0IG9uIGZ1bGxzY3JlZW4gY2hhbmdlXG4gICAgICovXG4gICAgYWRqdXN0RWRpdG9ySGVpZ2h0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IucmVzaXplKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDaGFuZ2UgQUNFIGVkaXRvciBtb2RlIGJhc2VkIG9uIHR5cGVcbiAgICAgKi9cbiAgICBjaGFuZ2VBY2VNb2RlOiBmdW5jdGlvbih2YWx1ZSwgdGV4dCwgJGNob2ljZSkge1xuICAgICAgICAvLyBHZXQgbW9kZSB2YWx1ZSAtIGNhbiBiZSBwYXNzZWQgYXMgcGFyYW1ldGVyIG9yIGZyb20gaGlkZGVuIGlucHV0XG4gICAgICAgIHZhciBtb2RlID0gdmFsdWUgfHwgJCgnI3R5cGUnKS52YWwoKTtcbiAgICAgICAgdmFyIE5ld01vZGU7XG5cbiAgICAgICAgaWYgKG1vZGUgPT09ICdwaHAnKSB7XG4gICAgICAgICAgICBOZXdNb2RlID0gYWNlLnJlcXVpcmUoJ2FjZS9tb2RlL3BocCcpLk1vZGU7XG4gICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5zZXRPcHRpb25zKHtcbiAgICAgICAgICAgICAgICBzaG93TGluZU51bWJlcnM6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgTmV3TW9kZSA9IGFjZS5yZXF1aXJlKCdhY2UvbW9kZS9qdWxpYScpLk1vZGU7XG4gICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5zZXRPcHRpb25zKHtcbiAgICAgICAgICAgICAgICBzaG93TGluZU51bWJlcnM6IGZhbHNlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLnNlc3Npb24uc2V0TW9kZShuZXcgTmV3TW9kZSgpKTtcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3Iuc2V0VGhlbWUoJ2FjZS90aGVtZS9tb25va2FpJyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgZm9ybSBzdWJtaXNzaW9uXG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNldHRpbmdzIC0gRm9ybSBzZXR0aW5nc1xuICAgICAqIEByZXR1cm4ge29iamVjdHxmYWxzZX0gTW9kaWZpZWQgc2V0dGluZ3Mgb3IgZmFsc2UgdG8gY2FuY2VsXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybTogZnVuY3Rpb24oc2V0dGluZ3MpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGFwcGxpY2F0aW9uIGxvZ2ljIGZyb20gQUNFIGVkaXRvciAobm90IHNhbml0aXplZClcbiAgICAgICAgcmVzdWx0LmRhdGEuYXBwbGljYXRpb25sb2dpYyA9IGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLmdldFZhbHVlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBQYXNzIGN1cnJlbnQgYWN0aXZlIHRhYiBmb3IgcmVkaXJlY3RcbiAgICAgICAgcmVzdWx0LmRhdGEuY3VycmVudFRhYiA9IGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuY3VycmVudEFjdGl2ZVRhYjtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCByZWNvcmQgSUQgZm9yIHVwZGF0ZXNcbiAgICAgICAgdmFyIHJlY29yZElkID0gZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5nZXRSZWNvcmRJZCgpO1xuICAgICAgICBpZiAocmVjb3JkSWQgJiYgcmVjb3JkSWQgIT09ICcnKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5pZCA9IHJlY29yZElkO1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEudW5pcWlkID0gcmVjb3JkSWQ7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBmb3JtIHN1Ym1pc3Npb24gKG5vIHN1Y2Nlc3MgbWVzc2FnZXMgLSBVSSB1cGRhdGVzIG9ubHkpXG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHJlc3BvbnNlIC0gU2VydmVyIHJlc3BvbnNlXG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtOiBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIC8vIERhdGEgaXMgYWxyZWFkeSBzYW5pdGl6ZWQgaW4gQVBJIG1vZHVsZVxuICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBleHRlbnNpb24gbnVtYmVyIGRpc3BsYXkgaW4gdGhlIHJpYmJvbiBsYWJlbFxuICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkudXBkYXRlRXh0ZW5zaW9uRGlzcGxheShyZXNwb25zZS5kYXRhLmV4dGVuc2lvbik7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIEFDRSBlZGl0b3IgY29udGVudFxuICAgICAgICAgICAgICAgIHZhciBjb2RlQ29udGVudCA9IHJlc3BvbnNlLmRhdGEuYXBwbGljYXRpb25sb2dpYyB8fCAnJztcbiAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5nZXRTZXNzaW9uKCkuc2V0VmFsdWUoY29kZUNvbnRlbnQpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEhhbmRsZSByZWRpcmVjdCB3aXRoIHRhYiBwcmVzZXJ2YXRpb25cbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YS5yZWRpcmVjdFRhYiAmJiByZXNwb25zZS5kYXRhLnJlZGlyZWN0VGFiICE9PSAnbWFpbicpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIEZvcm0uanMgcmVkaXJlY3QgVVJMIHRvIGluY2x1ZGUgaGFzaFxuICAgICAgICAgICAgICAgICAgICB2YXIgY3VycmVudElkID0gJCgnI2lkJykudmFsKCkgfHwgcmVzcG9uc2UuZGF0YS51bmlxaWQ7XG4gICAgICAgICAgICAgICAgICAgIGlmIChjdXJyZW50SWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBnbG9iYWxSb290VXJsICsgJ2RpYWxwbGFuLWFwcGxpY2F0aW9ucy9tb2RpZnkvJyArIGN1cnJlbnRJZCArICcjLycgKyByZXNwb25zZS5kYXRhLnJlZGlyZWN0VGFiO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgVVJMIGZvciBuZXcgcmVjb3JkcyBcbiAgICAgICAgICAgIHZhciBjdXJyZW50SWQgPSAkKCcjaWQnKS52YWwoKTtcbiAgICAgICAgICAgIGlmICghY3VycmVudElkICYmIHJlc3BvbnNlLmRhdGEgJiYgcmVzcG9uc2UuZGF0YS51bmlxaWQpIHtcbiAgICAgICAgICAgICAgICB2YXIgaGFzaCA9IHJlc3BvbnNlLmRhdGEucmVkaXJlY3RUYWIgJiYgcmVzcG9uc2UuZGF0YS5yZWRpcmVjdFRhYiAhPT0gJ21haW4nID8gJyMvJyArIHJlc3BvbnNlLmRhdGEucmVkaXJlY3RUYWIgOiAnJztcbiAgICAgICAgICAgICAgICB2YXIgbmV3VXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWYucmVwbGFjZSgvbW9kaWZ5XFwvPyQvLCAnbW9kaWZ5LycgKyByZXNwb25zZS5kYXRhLnVuaXFpZCkgKyBoYXNoO1xuICAgICAgICAgICAgICAgIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZShudWxsLCAnJywgbmV3VXJsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gTm8gc3VjY2VzcyBtZXNzYWdlIC0ganVzdCBzaWxlbnQgdXBkYXRlXG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBzYW5pdGl6ZWQgZGF0YVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gRm9ybSBkYXRhXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtOiBmdW5jdGlvbihkYXRhKSB7XG4gICAgICAgIC8vIFVzZSB1bmlmaWVkIHNpbGVudCBwb3B1bGF0aW9uIGFwcHJvYWNoXG4gICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoZGF0YSwge1xuICAgICAgICAgICAgYmVmb3JlUG9wdWxhdGU6IChmb3JtRGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd24gaWYgbm90IGFscmVhZHkgZG9uZVxuICAgICAgICAgICAgICAgIGlmICghJCgnI3R5cGUtZHJvcGRvd24nKS5sZW5ndGgpIHtcbiAgICAgICAgICAgICAgICAgICAgRHluYW1pY0Ryb3Bkb3duQnVpbGRlci5idWlsZERyb3Bkb3duKCd0eXBlJywgZm9ybURhdGEsIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHN0YXRpY09wdGlvbnM6IFtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IHZhbHVlOiAncGhwJywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmRhX1R5cGVQaHAgfSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB7IHZhbHVlOiAncGxhaW50ZXh0JywgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLmRhX1R5cGVQbGFpbnRleHQgfVxuICAgICAgICAgICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHBsYWNlaG9sZGVyOiBnbG9iYWxUcmFuc2xhdGUuZGFfU2VsZWN0VHlwZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmNoYW5nZUFjZU1vZGVcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGFmdGVyUG9wdWxhdGU6IChmb3JtRGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBdXRvLXJlc2l6ZSB0ZXh0YXJlYSBhZnRlciBkYXRhIGlzIHBvcHVsYXRlZFxuICAgICAgICAgICAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5cbi8qKlxuICogQ3VzdG9tIHZhbGlkYXRpb24gcnVsZSBmb3IgZXh0ZW5zaW9uIGV4aXN0ZW5jZVxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXhpc3RSdWxlID0gZnVuY3Rpb24odmFsdWUsIHBhcmFtZXRlcikgeyBcbiAgICByZXR1cm4gJCgnIycgKyBwYXJhbWV0ZXIpLmhhc0NsYXNzKCdoaWRkZW4nKTsgXG59O1xuXG4vKipcbiAqIEluaXRpYWxpemUgb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24oKSB7XG4gICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5pbml0aWFsaXplKCk7XG59KTtcblxuIl19