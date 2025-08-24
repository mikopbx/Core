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
  $typeSelectDropDown: $('#type-dropdown'),
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
    }); // Initialize type dropdown with proper settings

    dialplanApplicationModify.$typeSelectDropDown.dropdown({
      onChange: dialplanApplicationModify.changeAceMode,
      fullTextSearch: false,
      direction: 'downward'
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
    var recordId = dialplanApplicationModify.getRecordId(); // Always call REST API to get data (including defaults for new records)

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
  changeAceMode: function changeAceMode() {
    var mode = dialplanApplicationModify.$typeSelectDropDown.dropdown('get value');
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
    // Set form values, but exclude the type field which we'll handle separately
    var formData = $.extend({}, data);
    delete formData.type;
    Form.$formObj.form('set values', formData); // Set dropdown value explicitly
    // REST API always provides a type value (default 'php' for new records)

    dialplanApplicationModify.$typeSelectDropDown.dropdown('set selected', data.type);

    if (Form.enableDirrity) {
      Form.initializeDirrity();
    } // Auto-resize textarea after data is populated


    FormElements.optimizeTextareaSize('textarea[name="description"]');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9EaWFscGxhbkFwcGxpY2F0aW9ucy9kaWFscGxhbi1hcHBsaWNhdGlvbnMtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbImRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkiLCIkZm9ybU9iaiIsIiQiLCIkbnVtYmVyIiwiJHR5cGVTZWxlY3REcm9wRG93biIsIiR0YWJNZW51SXRlbXMiLCJkZWZhdWx0RXh0ZW5zaW9uIiwiZWRpdG9yIiwiY3VycmVudEFjdGl2ZVRhYiIsImlzTG9hZGluZ0RhdGEiLCJ2YWxpZGF0ZVJ1bGVzIiwibmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJkYV9WYWxpZGF0ZU5hbWVJc0VtcHR5IiwiZGFfVmFsaWRhdGVOYW1lVG9vTG9uZyIsImV4dGVuc2lvbiIsInZhbHVlIiwiZGFfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIiLCJkYV9WYWxpZGF0ZUV4dGVuc2lvbklzRW1wdHkiLCJkYV9WYWxpZGF0ZUV4dGVuc2lvbkRvdWJsZSIsInVwZGF0ZUV4dGVuc2lvbkRpc3BsYXkiLCJleHRlbnNpb25EaXNwbGF5IiwidGV4dCIsImluaXRpYWxpemUiLCJ0YWIiLCJoaXN0b3J5IiwiaGlzdG9yeVR5cGUiLCJvblZpc2libGUiLCJ0YWJQYXRoIiwic2V0VGltZW91dCIsInJlc2l6ZSIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJjaGFuZ2VBY2VNb2RlIiwiZnVsbFRleHRTZWFyY2giLCJkaXJlY3Rpb24iLCJ0aW1lb3V0SWQiLCJvbiIsImNsZWFyVGltZW91dCIsIm5ld051bWJlciIsImZvcm0iLCJFeHRlbnNpb25zIiwiY2hlY2tBdmFpbGFiaWxpdHkiLCJGb3JtIiwidXJsIiwiY2JCZWZvcmVTZW5kRm9ybSIsImNiQWZ0ZXJTZW5kRm9ybSIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsIkRpYWxwbGFuQXBwbGljYXRpb25zQVBJIiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJnbG9iYWxSb290VXJsIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJpbml0aWFsaXplQWRhcHRpdmVUZXh0YXJlYSIsImluaXRpYWxpemVBY2UiLCJpbml0aWFsaXplRnVsbHNjcmVlbkhhbmRsZXJzIiwiaW5pdGlhbGl6ZUZvcm0iLCJGb3JtRWxlbWVudHMiLCJvcHRpbWl6ZVRleHRhcmVhU2l6ZSIsInJlY29yZElkIiwiZ2V0UmVjb3JkSWQiLCJnZXRSZWNvcmQiLCJyZXNwb25zZSIsInJlc3VsdCIsInBvcHVsYXRlRm9ybSIsImRhdGEiLCJjb2RlQ29udGVudCIsImFwcGxpY2F0aW9ubG9naWMiLCJnZXRTZXNzaW9uIiwic2V0VmFsdWUiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsImhhc2giLCJlcnJvck1lc3NhZ2UiLCJtZXNzYWdlcyIsImVycm9yIiwiam9pbiIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwiU2VjdXJpdHlVdGlscyIsImVzY2FwZUh0bWwiLCJ1cmxQYXJ0cyIsInBhdGhuYW1lIiwic3BsaXQiLCJtb2RpZnlJbmRleCIsImluZGV4T2YiLCJhY2VIZWlnaHQiLCJpbm5lckhlaWdodCIsInJvd3NDb3VudCIsIk1hdGgiLCJyb3VuZCIsImNzcyIsImFjZSIsImVkaXQiLCJzZXRUaGVtZSIsImRhdGFDaGFuZ2VkIiwic2V0T3B0aW9ucyIsIm1heExpbmVzIiwic2hvd1ByaW50TWFyZ2luIiwic2hvd0xpbmVOdW1iZXJzIiwiY29tbWFuZHMiLCJhZGRDb21tYW5kIiwiYmluZEtleSIsIndpbiIsIm1hYyIsImV4ZWMiLCJjb25zb2xlIiwid2FybiIsImNvbnRhaW5lciIsInNpYmxpbmdzIiwidG9nZ2xlRnVsbFNjcmVlbiIsImRvY3VtZW50IiwiYWRkRXZlbnRMaXN0ZW5lciIsImFkanVzdEVkaXRvckhlaWdodCIsImNsZWFudXAiLCJyZW1vdmVFdmVudExpc3RlbmVyIiwib2ZmIiwiZGVzdHJveSIsImZ1bGxzY3JlZW5FbGVtZW50IiwicmVxdWVzdEZ1bGxzY3JlZW4iLCJlcnIiLCJtZXNzYWdlIiwiZXhpdEZ1bGxzY3JlZW4iLCJtb2RlIiwiTmV3TW9kZSIsInJlcXVpcmUiLCJNb2RlIiwic2Vzc2lvbiIsInNldE1vZGUiLCJzZXR0aW5ncyIsImdldFZhbHVlIiwiY3VycmVudFRhYiIsInZhbGlkYXRlQXBwbGljYXRpb25EYXRhIiwicmVkaXJlY3RUYWIiLCJjdXJyZW50SWQiLCJ2YWwiLCJ1bmlxaWQiLCJuZXdVcmwiLCJocmVmIiwicmVwbGFjZSIsInB1c2hTdGF0ZSIsImZvcm1EYXRhIiwiZXh0ZW5kIiwiZW5hYmxlRGlycml0eSIsImluaXRpYWxpemVEaXJyaXR5IiwiZm4iLCJleGlzdFJ1bGUiLCJwYXJhbWV0ZXIiLCJoYXNDbGFzcyIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLElBQUlBLHlCQUF5QixHQUFHO0FBQzVCQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyw0QkFBRCxDQURpQjtBQUU1QkMsRUFBQUEsT0FBTyxFQUFFRCxDQUFDLENBQUMsWUFBRCxDQUZrQjtBQUc1QkUsRUFBQUEsbUJBQW1CLEVBQUVGLENBQUMsQ0FBQyxnQkFBRCxDQUhNO0FBSTVCRyxFQUFBQSxhQUFhLEVBQUVILENBQUMsQ0FBQyw4QkFBRCxDQUpZO0FBSzVCSSxFQUFBQSxnQkFBZ0IsRUFBRSxFQUxVO0FBTTVCQyxFQUFBQSxNQUFNLEVBQUUsSUFOb0I7QUFPNUJDLEVBQUFBLGdCQUFnQixFQUFFLE1BUFU7QUFPRjtBQUMxQkMsRUFBQUEsYUFBYSxFQUFFLEtBUmE7QUFRTjs7QUFFdEI7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFBRTtBQUNYQyxJQUFBQSxJQUFJLEVBQUU7QUFDRkMsTUFBQUEsVUFBVSxFQUFFLE1BRFY7QUFFRkMsTUFBQUEsS0FBSyxFQUFFLENBQ0g7QUFDSUMsUUFBQUEsSUFBSSxFQUFFLE9BRFY7QUFFSUMsUUFBQUEsTUFBTSxFQUFF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QXlCMkksU0FBekIsR0FBcUMsVUFBU3BJLEtBQVQsRUFBZ0JxSSxTQUFoQixFQUEyQjtBQUM1RCxTQUFPdkosQ0FBQyxDQUFDLE1BQU11SixTQUFQLENBQUQsQ0FBbUJDLFFBQW5CLENBQTRCLFFBQTVCLENBQVA7QUFDSCxDQUZEO0FBSUE7QUFDQTtBQUNBOzs7QUFDQXhKLENBQUMsQ0FBQ21ILFFBQUQsQ0FBRCxDQUFZc0MsS0FBWixDQUFrQixZQUFXO0FBQ3pCM0osRUFBQUEseUJBQXlCLENBQUMyQixVQUExQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKi9cblxuLyogZ2xvYmFsIERpYWxwbGFuQXBwbGljYXRpb25zQVBJLCBGb3JtLCBTZWN1cml0eVV0aWxzLCBnbG9iYWxUcmFuc2xhdGUsIEV4dGVuc2lvbnMsIGFjZSwgVXNlck1lc3NhZ2UgKi9cblxuLyoqXG4gKiBEaWFscGxhbiBhcHBsaWNhdGlvbiBlZGl0IGZvcm0gbWFuYWdlbWVudCBtb2R1bGUgd2l0aCBlbmhhbmNlZCBzZWN1cml0eVxuICovXG52YXIgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeSA9IHtcbiAgICAkZm9ybU9iajogJCgnI2RpYWxwbGFuLWFwcGxpY2F0aW9uLWZvcm0nKSxcbiAgICAkbnVtYmVyOiAkKCcjZXh0ZW5zaW9uJyksXG4gICAgJHR5cGVTZWxlY3REcm9wRG93bjogJCgnI3R5cGUtZHJvcGRvd24nKSxcbiAgICAkdGFiTWVudUl0ZW1zOiAkKCcjYXBwbGljYXRpb24tY29kZS1tZW51IC5pdGVtJyksXG4gICAgZGVmYXVsdEV4dGVuc2lvbjogJycsXG4gICAgZWRpdG9yOiBudWxsLFxuICAgIGN1cnJlbnRBY3RpdmVUYWI6ICdtYWluJywgLy8gVHJhY2sgY3VycmVudCBhY3RpdmUgdGFiXG4gICAgaXNMb2FkaW5nRGF0YTogZmFsc2UsIC8vIEZsYWcgdG8gcHJldmVudCBidXR0b24gcmVhY3RpdmF0aW9uIGR1cmluZyBkYXRhIGxvYWRpbmdcbiAgICBcbiAgICAvKipcbiAgICAgKiBGb3JtIHZhbGlkYXRpb24gcnVsZXMgXG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBuYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnbmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZGFfVmFsaWRhdGVOYW1lSXNFbXB0eVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnbWF4TGVuZ3RoWzUwXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmRhX1ZhbGlkYXRlTmFtZVRvb0xvbmcgfHwgJ05hbWUgaXMgdG9vIGxvbmcgKG1heCA1MCBjaGFyYWN0ZXJzKSdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdXG4gICAgICAgIH0sXG4gICAgICAgIGV4dGVuc2lvbjoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ2V4dGVuc2lvbicsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAnL15bMC05IytcXFxcKnxYXXsxLDY0fSQvJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZGFfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmRhX1ZhbGlkYXRlRXh0ZW5zaW9uSXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2V4aXN0UnVsZVtleHRlbnNpb24tZXJyb3JdJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuZGFfVmFsaWRhdGVFeHRlbnNpb25Eb3VibGUsXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBleHRlbnNpb24gZGlzcGxheSBpbiByaWJib24gbGFiZWxcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZXh0ZW5zaW9uIC0gRXh0ZW5zaW9uIG51bWJlclxuICAgICAqL1xuICAgIHVwZGF0ZUV4dGVuc2lvbkRpc3BsYXk6IGZ1bmN0aW9uKGV4dGVuc2lvbikge1xuICAgICAgICB2YXIgZXh0ZW5zaW9uRGlzcGxheSA9ICQoJyNleHRlbnNpb24tZGlzcGxheScpO1xuICAgICAgICBleHRlbnNpb25EaXNwbGF5LnRleHQoZXh0ZW5zaW9uIHx8ICcnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgbW9kdWxlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIEVuYWJsZSB0YWIgbmF2aWdhdGlvbiB3aXRoIGhpc3Rvcnkgc3VwcG9ydFxuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LiR0YWJNZW51SXRlbXMudGFiKHtcbiAgICAgICAgICAgIGhpc3Rvcnk6IHRydWUsXG4gICAgICAgICAgICBoaXN0b3J5VHlwZTogJ2hhc2gnLFxuICAgICAgICAgICAgb25WaXNpYmxlOiBmdW5jdGlvbih0YWJQYXRoKSB7XG4gICAgICAgICAgICAgICAgLy8gVHJhY2sgY3VycmVudCBhY3RpdmUgdGFiXG4gICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5jdXJyZW50QWN0aXZlVGFiID0gdGFiUGF0aDtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBSZXNpemUgQUNFIGVkaXRvciB3aGVuIGNvZGUgdGFiIGJlY29tZXMgdmlzaWJsZVxuICAgICAgICAgICAgICAgIGlmICh0YWJQYXRoID09PSAnY29kZScgJiYgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IpIHtcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5yZXNpemUoKTtcbiAgICAgICAgICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0eXBlIGRyb3Bkb3duIHdpdGggcHJvcGVyIHNldHRpbmdzXG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuJHR5cGVTZWxlY3REcm9wRG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZTogZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5jaGFuZ2VBY2VNb2RlLFxuICAgICAgICAgICAgZnVsbFRleHRTZWFyY2g6IGZhbHNlLFxuICAgICAgICAgICAgZGlyZWN0aW9uOiAnZG93bndhcmQnXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gRXh0ZW5zaW9uIGF2YWlsYWJpbGl0eSBjaGVja1xuICAgICAgICB2YXIgdGltZW91dElkO1xuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LiRudW1iZXIub24oJ2lucHV0JywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBpZiAodGltZW91dElkKSBjbGVhclRpbWVvdXQodGltZW91dElkKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICB2YXIgbmV3TnVtYmVyID0gZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnZXh0ZW5zaW9uJyk7XG4gICAgICAgICAgICAgICAgRXh0ZW5zaW9ucy5jaGVja0F2YWlsYWJpbGl0eShkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmRlZmF1bHRFeHRlbnNpb24sIG5ld051bWJlcik7XG4gICAgICAgICAgICB9LCA1MDApO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyZSBGb3JtLmpzIGZvciBSRVNUIEFQSVxuICAgICAgICBGb3JtLiRmb3JtT2JqID0gZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5jYkFmdGVyU2VuZEZvcm07XG4gICAgICAgIFxuICAgICAgICAvLyBSRVNUIEFQSSBpbnRlZ3JhdGlvblxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmVuYWJsZWQgPSB0cnVlO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLmFwaU9iamVjdCA9IERpYWxwbGFuQXBwbGljYXRpb25zQVBJO1xuICAgICAgICBGb3JtLmFwaVNldHRpbmdzLnNhdmVNZXRob2QgPSAnc2F2ZVJlY29yZCc7XG4gICAgICAgIFxuICAgICAgICAvLyBOYXZpZ2F0aW9uIFVSTHNcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gZ2xvYmFsUm9vdFVybCArICdkaWFscGxhbi1hcHBsaWNhdGlvbnMvaW5kZXgvJztcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGdsb2JhbFJvb3RVcmwgKyAnZGlhbHBsYW4tYXBwbGljYXRpb25zL21vZGlmeS8nO1xuICAgICAgICBcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGFkYXB0aXZlIHRleHRhcmVhIGZvciBkZXNjcmlwdGlvbiBmaWVsZFxuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmluaXRpYWxpemVBZGFwdGl2ZVRleHRhcmVhKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGNvbXBvbmVudHNcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5pbml0aWFsaXplQWNlKCk7XG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuaW5pdGlhbGl6ZUZ1bGxzY3JlZW5IYW5kbGVycygpO1xuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmluaXRpYWxpemVGb3JtKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgYWRhcHRpdmUgdGV4dGFyZWEgZm9yIGRlc2NyaXB0aW9uIGZpZWxkXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUFkYXB0aXZlVGV4dGFyZWE6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBTZXQgdXAgYWRhcHRpdmUgcmVzaXppbmcgZm9yIGRlc2NyaXB0aW9uIHRleHRhcmVhXG4gICAgICAgICQoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpLm9uKCdpbnB1dCBwYXN0ZSBrZXl1cCcsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCQodGhpcykpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWwgcmVzaXplIGFmdGVyIGZvcm0gZGF0YSBpcyBsb2FkZWRcbiAgICAgICAgRm9ybUVsZW1lbnRzLm9wdGltaXplVGV4dGFyZWFTaXplKCd0ZXh0YXJlYVtuYW1lPVwiZGVzY3JpcHRpb25cIl0nKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBmb3JtIGRhdGEgdmlhIFJFU1QgQVBJXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm06IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgcmVjb3JkSWQgPSBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmdldFJlY29yZElkKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBBbHdheXMgY2FsbCBSRVNUIEFQSSB0byBnZXQgZGF0YSAoaW5jbHVkaW5nIGRlZmF1bHRzIGZvciBuZXcgcmVjb3JkcylcbiAgICAgICAgRGlhbHBsYW5BcHBsaWNhdGlvbnNBUEkuZ2V0UmVjb3JkKHJlY29yZElkLCBmdW5jdGlvbihyZXNwb25zZSkge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vIERhdGEgaXMgYWxyZWFkeSBzYW5pdGl6ZWQgaW4gQVBJIG1vZHVsZVxuICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZGVmYXVsdEV4dGVuc2lvbiA9IHJlc3BvbnNlLmRhdGEuZXh0ZW5zaW9uO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBleHRlbnNpb24gbnVtYmVyIGRpc3BsYXkgaW4gdGhlIHJpYmJvbiBsYWJlbFxuICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkudXBkYXRlRXh0ZW5zaW9uRGlzcGxheShyZXNwb25zZS5kYXRhLmV4dGVuc2lvbik7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2V0IEFDRSBlZGl0b3IgY29udGVudCAoYXBwbGljYXRpb25sb2dpYyBpcyBub3Qgc2FuaXRpemVkKVxuICAgICAgICAgICAgICAgIHZhciBjb2RlQ29udGVudCA9IHJlc3BvbnNlLmRhdGEuYXBwbGljYXRpb25sb2dpYyB8fCAnJztcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTZXQgZmxhZyB0byBwcmV2ZW50IHJlYWN0aXZhdGluZyBidXR0b25zIGR1cmluZyBkYXRhIGxvYWRcbiAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmlzTG9hZGluZ0RhdGEgPSB0cnVlO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLmdldFNlc3Npb24oKS5zZXRWYWx1ZShjb2RlQ29udGVudCk7XG4gICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5jaGFuZ2VBY2VNb2RlKCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQ2xlYXIgbG9hZGluZyBmbGFnIGFmdGVyIHNldHRpbmcgY29udGVudFxuICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuaXNMb2FkaW5nRGF0YSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFN3aXRjaCB0byBtYWluIHRhYiBvbmx5IGZvciBjb21wbGV0ZWx5IG5ldyByZWNvcmRzIChubyBuYW1lIGFuZCBubyBleHRlbnNpb24pXG4gICAgICAgICAgICAgICAgLy8gSGFzaCBoaXN0b3J5IHdpbGwgcHJlc2VydmUgdGhlIHRhYiBmb3IgZXhpc3RpbmcgcmVjb3Jkc1xuICAgICAgICAgICAgICAgIGlmICghcmVzcG9uc2UuZGF0YS5uYW1lICYmICFyZXNwb25zZS5kYXRhLmV4dGVuc2lvbiAmJiAhd2luZG93LmxvY2F0aW9uLmhhc2gpIHtcbiAgICAgICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS4kdGFiTWVudUl0ZW1zLnRhYignY2hhbmdlIHRhYicsICdtYWluJyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEF1dG8tcmVzaXplIHRleHRhcmVhIGFmdGVyIGRhdGEgaXMgbG9hZGVkICh3aXRoIHNtYWxsIGRlbGF5IGZvciBET00gdXBkYXRlKVxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJyk7XG4gICAgICAgICAgICAgICAgfSwgMTAwKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgdmFyIGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLm1lc3NhZ2VzICYmIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yID8gXG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLmpvaW4oJywgJykgOiBcbiAgICAgICAgICAgICAgICAgICAgJ0ZhaWxlZCB0byBsb2FkIGRpYWxwbGFuIGFwcGxpY2F0aW9uIGRhdGEnO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihTZWN1cml0eVV0aWxzLmVzY2FwZUh0bWwoZXJyb3JNZXNzYWdlKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBJRCBmcm9tIFVSTFxuICAgICAqIFxuICAgICAqIEByZXR1cm4ge3N0cmluZ30gUmVjb3JkIElEXG4gICAgICovXG4gICAgZ2V0UmVjb3JkSWQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgdXJsUGFydHMgPSB3aW5kb3cubG9jYXRpb24ucGF0aG5hbWUuc3BsaXQoJy8nKTtcbiAgICAgICAgdmFyIG1vZGlmeUluZGV4ID0gdXJsUGFydHMuaW5kZXhPZignbW9kaWZ5Jyk7XG4gICAgICAgIGlmIChtb2RpZnlJbmRleCAhPT0gLTEgJiYgdXJsUGFydHNbbW9kaWZ5SW5kZXggKyAxXSkge1xuICAgICAgICAgICAgcmV0dXJuIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICcnO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBBQ0UgZWRpdG9yIHdpdGggc2VjdXJpdHkgY29uc2lkZXJhdGlvbnNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQWNlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIGFjZUhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodCAtIDM4MDtcbiAgICAgICAgdmFyIHJvd3NDb3VudCA9IE1hdGgucm91bmQoYWNlSGVpZ2h0IC8gMTYuMyk7XG4gICAgICAgIFxuICAgICAgICAkKHdpbmRvdykub24oJ2xvYWQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAkKCcuYXBwbGljYXRpb24tY29kZScpLmNzcygnbWluLWhlaWdodCcsIGFjZUhlaWdodCArICdweCcpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yID0gYWNlLmVkaXQoJ2FwcGxpY2F0aW9uLWNvZGUnKTtcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3Iuc2V0VGhlbWUoJ2FjZS90aGVtZS9tb25va2FpJyk7XG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLnJlc2l6ZSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gVHJhY2sgY2hhbmdlcyBmb3IgRm9ybS5qc1xuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5nZXRTZXNzaW9uKCkub24oJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgLy8gSWdub3JlIGNoYW5nZXMgZHVyaW5nIGRhdGEgbG9hZGluZyB0byBwcmV2ZW50IHJlYWN0aXZhdGluZyBidXR0b25zXG4gICAgICAgICAgICBpZiAoIWRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuaXNMb2FkaW5nRGF0YSkge1xuICAgICAgICAgICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5zZXRPcHRpb25zKHtcbiAgICAgICAgICAgIG1heExpbmVzOiByb3dzQ291bnQsXG4gICAgICAgICAgICBzaG93UHJpbnRNYXJnaW46IGZhbHNlLFxuICAgICAgICAgICAgc2hvd0xpbmVOdW1iZXJzOiBmYWxzZVxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNlY3VyaXR5OiBwcmV2ZW50IGNvZGUgZXhlY3V0aW9uIGluIGVkaXRvclxuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5jb21tYW5kcy5hZGRDb21tYW5kKHtcbiAgICAgICAgICAgIG5hbWU6ICdwcmV2ZW50Q29kZUV4ZWN1dGlvbicsXG4gICAgICAgICAgICBiaW5kS2V5OiB7d2luOiAnQ3RybC1FJywgbWFjOiAnQ29tbWFuZC1FJ30sXG4gICAgICAgICAgICBleGVjOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ0NvZGUgZXhlY3V0aW9uIHByZXZlbnRlZCBmb3Igc2VjdXJpdHknKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBmdWxsc2NyZWVuIGhhbmRsZXJzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZ1bGxzY3JlZW5IYW5kbGVyczogZnVuY3Rpb24oKSB7XG4gICAgICAgICQoJy5mdWxsc2NyZWVuLXRvZ2dsZS1idG4nKS5vbignY2xpY2snLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICB2YXIgY29udGFpbmVyID0gJCh0aGlzKS5zaWJsaW5ncygnLmFwcGxpY2F0aW9uLWNvZGUnKVswXTtcbiAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkudG9nZ2xlRnVsbFNjcmVlbihjb250YWluZXIpO1xuICAgICAgICB9KTtcblxuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdmdWxsc2NyZWVuY2hhbmdlJywgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5hZGp1c3RFZGl0b3JIZWlnaHQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDbGVhbnVwIGV2ZW50IGxpc3RlbmVycyB0byBwcmV2ZW50IG1lbW9yeSBsZWFrc1xuICAgICAqL1xuICAgIGNsZWFudXA6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBSZW1vdmUgZnVsbHNjcmVlbiBldmVudCBsaXN0ZW5lclxuICAgICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKCdmdWxsc2NyZWVuY2hhbmdlJywgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5hZGp1c3RFZGl0b3JIZWlnaHQpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYW51cCBvdGhlciBldmVudCBsaXN0ZW5lcnMgaWYgbmVlZGVkXG4gICAgICAgICQod2luZG93KS5vZmYoJ2xvYWQnKTtcbiAgICAgICAgJCgnLmZ1bGxzY3JlZW4tdG9nZ2xlLWJ0bicpLm9mZignY2xpY2snKTtcbiAgICAgICAgJCgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJykub2ZmKCdpbnB1dCBwYXN0ZSBrZXl1cCcpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ2xlYW51cCBBQ0UgZWRpdG9yXG4gICAgICAgIGlmIChkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvcikge1xuICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IuZGVzdHJveSgpO1xuICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IgPSBudWxsO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBUb2dnbGUgZnVsbHNjcmVlbiBtb2RlXG4gICAgICogXG4gICAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gY29udGFpbmVyIC0gQ29udGFpbmVyIGVsZW1lbnRcbiAgICAgKi9cbiAgICB0b2dnbGVGdWxsU2NyZWVuOiBmdW5jdGlvbihjb250YWluZXIpIHtcbiAgICAgICAgaWYgKCFkb2N1bWVudC5mdWxsc2NyZWVuRWxlbWVudCkge1xuICAgICAgICAgICAgY29udGFpbmVyLnJlcXVlc3RGdWxsc2NyZWVuKCkuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgYXR0ZW1wdGluZyB0byBlbmFibGUgZnVsbC1zY3JlZW4gbW9kZTogJyArIGVyci5tZXNzYWdlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZG9jdW1lbnQuZXhpdEZ1bGxzY3JlZW4oKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBBZGp1c3QgZWRpdG9yIGhlaWdodCBvbiBmdWxsc2NyZWVuIGNoYW5nZVxuICAgICAqL1xuICAgIGFkanVzdEVkaXRvckhlaWdodDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLnJlc2l6ZSgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2hhbmdlIEFDRSBlZGl0b3IgbW9kZSBiYXNlZCBvbiB0eXBlXG4gICAgICovXG4gICAgY2hhbmdlQWNlTW9kZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBtb2RlID0gZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS4kdHlwZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKCdnZXQgdmFsdWUnKTtcbiAgICAgICAgdmFyIE5ld01vZGU7XG5cbiAgICAgICAgaWYgKG1vZGUgPT09ICdwaHAnKSB7XG4gICAgICAgICAgICBOZXdNb2RlID0gYWNlLnJlcXVpcmUoJ2FjZS9tb2RlL3BocCcpLk1vZGU7XG4gICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5zZXRPcHRpb25zKHtcbiAgICAgICAgICAgICAgICBzaG93TGluZU51bWJlcnM6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgTmV3TW9kZSA9IGFjZS5yZXF1aXJlKCdhY2UvbW9kZS9qdWxpYScpLk1vZGU7XG4gICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5zZXRPcHRpb25zKHtcbiAgICAgICAgICAgICAgICBzaG93TGluZU51bWJlcnM6IGZhbHNlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLnNlc3Npb24uc2V0TW9kZShuZXcgTmV3TW9kZSgpKTtcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3Iuc2V0VGhlbWUoJ2FjZS90aGVtZS9tb25va2FpJyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgZm9ybSBzdWJtaXNzaW9uXG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNldHRpbmdzIC0gRm9ybSBzZXR0aW5nc1xuICAgICAqIEByZXR1cm4ge29iamVjdHxmYWxzZX0gTW9kaWZpZWQgc2V0dGluZ3Mgb3IgZmFsc2UgdG8gY2FuY2VsXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybTogZnVuY3Rpb24oc2V0dGluZ3MpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGFwcGxpY2F0aW9uIGxvZ2ljIGZyb20gQUNFIGVkaXRvciAobm90IHNhbml0aXplZClcbiAgICAgICAgcmVzdWx0LmRhdGEuYXBwbGljYXRpb25sb2dpYyA9IGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLmdldFZhbHVlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBQYXNzIGN1cnJlbnQgYWN0aXZlIHRhYiBmb3IgcmVkaXJlY3RcbiAgICAgICAgcmVzdWx0LmRhdGEuY3VycmVudFRhYiA9IGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuY3VycmVudEFjdGl2ZVRhYjtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZGl0aW9uYWwgY2xpZW50LXNpZGUgdmFsaWRhdGlvblxuICAgICAgICBpZiAoIURpYWxwbGFuQXBwbGljYXRpb25zQVBJLnZhbGlkYXRlQXBwbGljYXRpb25EYXRhKHJlc3VsdC5kYXRhKSkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKCdWYWxpZGF0aW9uIGZhaWxlZCcpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uIChubyBzdWNjZXNzIG1lc3NhZ2VzIC0gVUkgdXBkYXRlcyBvbmx5KVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFNlcnZlciByZXNwb25zZVxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybTogZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBEYXRhIGlzIGFscmVhZHkgc2FuaXRpemVkIGluIEFQSSBtb2R1bGVcbiAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgZXh0ZW5zaW9uIG51bWJlciBkaXNwbGF5IGluIHRoZSByaWJib24gbGFiZWxcbiAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LnVwZGF0ZUV4dGVuc2lvbkRpc3BsYXkocmVzcG9uc2UuZGF0YS5leHRlbnNpb24pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBBQ0UgZWRpdG9yIGNvbnRlbnRcbiAgICAgICAgICAgICAgICB2YXIgY29kZUNvbnRlbnQgPSByZXNwb25zZS5kYXRhLmFwcGxpY2F0aW9ubG9naWMgfHwgJyc7XG4gICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IuZ2V0U2Vzc2lvbigpLnNldFZhbHVlKGNvZGVDb250ZW50KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgcmVkaXJlY3Qgd2l0aCB0YWIgcHJlc2VydmF0aW9uXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEucmVkaXJlY3RUYWIgJiYgcmVzcG9uc2UuZGF0YS5yZWRpcmVjdFRhYiAhPT0gJ21haW4nKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBGb3JtLmpzIHJlZGlyZWN0IFVSTCB0byBpbmNsdWRlIGhhc2hcbiAgICAgICAgICAgICAgICAgICAgdmFyIGN1cnJlbnRJZCA9ICQoJyNpZCcpLnZhbCgpIHx8IHJlc3BvbnNlLmRhdGEudW5pcWlkO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY3VycmVudElkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gZ2xvYmFsUm9vdFVybCArICdkaWFscGxhbi1hcHBsaWNhdGlvbnMvbW9kaWZ5LycgKyBjdXJyZW50SWQgKyAnIy8nICsgcmVzcG9uc2UuZGF0YS5yZWRpcmVjdFRhYjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIFVSTCBmb3IgbmV3IHJlY29yZHMgXG4gICAgICAgICAgICB2YXIgY3VycmVudElkID0gJCgnI2lkJykudmFsKCk7XG4gICAgICAgICAgICBpZiAoIWN1cnJlbnRJZCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEudW5pcWlkKSB7XG4gICAgICAgICAgICAgICAgdmFyIGhhc2ggPSByZXNwb25zZS5kYXRhLnJlZGlyZWN0VGFiICYmIHJlc3BvbnNlLmRhdGEucmVkaXJlY3RUYWIgIT09ICdtYWluJyA/ICcjLycgKyByZXNwb25zZS5kYXRhLnJlZGlyZWN0VGFiIDogJyc7XG4gICAgICAgICAgICAgICAgdmFyIG5ld1VybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmLnJlcGxhY2UoL21vZGlmeVxcLz8kLywgJ21vZGlmeS8nICsgcmVzcG9uc2UuZGF0YS51bmlxaWQpICsgaGFzaDtcbiAgICAgICAgICAgICAgICB3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUobnVsbCwgJycsIG5ld1VybCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIE5vIHN1Y2Nlc3MgbWVzc2FnZSAtIGp1c3Qgc2lsZW50IHVwZGF0ZVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggc2FuaXRpemVkIGRhdGFcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIEZvcm0gZGF0YVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybTogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICAvLyBTZXQgZm9ybSB2YWx1ZXMsIGJ1dCBleGNsdWRlIHRoZSB0eXBlIGZpZWxkIHdoaWNoIHdlJ2xsIGhhbmRsZSBzZXBhcmF0ZWx5XG4gICAgICAgIHZhciBmb3JtRGF0YSA9ICQuZXh0ZW5kKHt9LCBkYXRhKTtcbiAgICAgICAgZGVsZXRlIGZvcm1EYXRhLnR5cGU7XG4gICAgICAgIEZvcm0uJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlcycsIGZvcm1EYXRhKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNldCBkcm9wZG93biB2YWx1ZSBleHBsaWNpdGx5XG4gICAgICAgIC8vIFJFU1QgQVBJIGFsd2F5cyBwcm92aWRlcyBhIHR5cGUgdmFsdWUgKGRlZmF1bHQgJ3BocCcgZm9yIG5ldyByZWNvcmRzKVxuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LiR0eXBlU2VsZWN0RHJvcERvd24uZHJvcGRvd24oJ3NldCBzZWxlY3RlZCcsIGRhdGEudHlwZSk7XG4gICAgICAgIFxuICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICBGb3JtLmluaXRpYWxpemVEaXJyaXR5KCk7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIC8vIEF1dG8tcmVzaXplIHRleHRhcmVhIGFmdGVyIGRhdGEgaXMgcG9wdWxhdGVkXG4gICAgICAgIEZvcm1FbGVtZW50cy5vcHRpbWl6ZVRleHRhcmVhU2l6ZSgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJyk7XG4gICAgfVxufTtcblxuLyoqXG4gKiBDdXN0b20gdmFsaWRhdGlvbiBydWxlIGZvciBleHRlbnNpb24gZXhpc3RlbmNlXG4gKi9cbiQuZm4uZm9ybS5zZXR0aW5ncy5ydWxlcy5leGlzdFJ1bGUgPSBmdW5jdGlvbih2YWx1ZSwgcGFyYW1ldGVyKSB7IFxuICAgIHJldHVybiAkKCcjJyArIHBhcmFtZXRlcikuaGFzQ2xhc3MoJ2hpZGRlbicpOyBcbn07XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBvbiBkb2N1bWVudCByZWFkeVxuICovXG4kKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbigpIHtcbiAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmluaXRpYWxpemUoKTtcbn0pO1xuXG4iXX0=