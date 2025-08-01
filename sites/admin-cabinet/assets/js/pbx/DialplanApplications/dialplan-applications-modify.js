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
      FormElements.optimizeTextareaSize($(this));
    }); // Initial resize after form data is loaded

    FormElements.optimizeTextareaSize('textarea[name="description"]');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9EaWFscGxhbkFwcGxpY2F0aW9ucy9kaWFscGxhbi1hcHBsaWNhdGlvbnMtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbImRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkiLCIkZm9ybU9iaiIsIiQiLCIkbnVtYmVyIiwiJHR5cGVTZWxlY3REcm9wRG93biIsIiR0YWJNZW51SXRlbXMiLCJkZWZhdWx0RXh0ZW5zaW9uIiwiZWRpdG9yIiwiY3VycmVudEFjdGl2ZVRhYiIsImlzTG9hZGluZ0RhdGEiLCJ2YWxpZGF0ZVJ1bGVzIiwibmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJkYV9WYWxpZGF0ZU5hbWVJc0VtcHR5IiwiZGFfVmFsaWRhdGVOYW1lVG9vTG9uZyIsImV4dGVuc2lvbiIsInZhbHVlIiwiZGFfVmFsaWRhdGVFeHRlbnNpb25OdW1iZXIiLCJkYV9WYWxpZGF0ZUV4dGVuc2lvbklzRW1wdHkiLCJkYV9WYWxpZGF0ZUV4dGVuc2lvbkRvdWJsZSIsInVwZGF0ZUV4dGVuc2lvbkRpc3BsYXkiLCJleHRlbnNpb25EaXNwbGF5IiwidGV4dCIsImluaXRpYWxpemUiLCJ0YWIiLCJoaXN0b3J5IiwiaGlzdG9yeVR5cGUiLCJvblZpc2libGUiLCJ0YWJQYXRoIiwic2V0VGltZW91dCIsInJlc2l6ZSIsImRyb3Bkb3duIiwib25DaGFuZ2UiLCJjaGFuZ2VBY2VNb2RlIiwidGltZW91dElkIiwib24iLCJjbGVhclRpbWVvdXQiLCJuZXdOdW1iZXIiLCJmb3JtIiwiRXh0ZW5zaW9ucyIsImNoZWNrQXZhaWxhYmlsaXR5IiwiRm9ybSIsInVybCIsImNiQmVmb3JlU2VuZEZvcm0iLCJjYkFmdGVyU2VuZEZvcm0iLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJEaWFscGxhbkFwcGxpY2F0aW9uc0FQSSIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiZ2xvYmFsUm9vdFVybCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwiaW5pdGlhbGl6ZUFkYXB0aXZlVGV4dGFyZWEiLCJpbml0aWFsaXplQWNlIiwiaW5pdGlhbGl6ZUZ1bGxzY3JlZW5IYW5kbGVycyIsImluaXRpYWxpemVGb3JtIiwiRm9ybUVsZW1lbnRzIiwib3B0aW1pemVUZXh0YXJlYVNpemUiLCJyZWNvcmRJZCIsImdldFJlY29yZElkIiwiZ2V0UmVjb3JkIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJwb3B1bGF0ZUZvcm0iLCJkYXRhIiwiY29kZUNvbnRlbnQiLCJhcHBsaWNhdGlvbmxvZ2ljIiwiZ2V0U2Vzc2lvbiIsInNldFZhbHVlIiwid2luZG93IiwibG9jYXRpb24iLCJoYXNoIiwiZXJyb3JNZXNzYWdlIiwibWVzc2FnZXMiLCJlcnJvciIsImpvaW4iLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIlNlY3VyaXR5VXRpbHMiLCJlc2NhcGVIdG1sIiwidXJsUGFydHMiLCJwYXRobmFtZSIsInNwbGl0IiwibW9kaWZ5SW5kZXgiLCJpbmRleE9mIiwiYWNlSGVpZ2h0IiwiaW5uZXJIZWlnaHQiLCJyb3dzQ291bnQiLCJNYXRoIiwicm91bmQiLCJjc3MiLCJhY2UiLCJlZGl0Iiwic2V0VGhlbWUiLCJkYXRhQ2hhbmdlZCIsInNldE9wdGlvbnMiLCJtYXhMaW5lcyIsInNob3dQcmludE1hcmdpbiIsInNob3dMaW5lTnVtYmVycyIsImNvbW1hbmRzIiwiYWRkQ29tbWFuZCIsImJpbmRLZXkiLCJ3aW4iLCJtYWMiLCJleGVjIiwiY29uc29sZSIsIndhcm4iLCJjb250YWluZXIiLCJzaWJsaW5ncyIsInRvZ2dsZUZ1bGxTY3JlZW4iLCJkb2N1bWVudCIsImFkZEV2ZW50TGlzdGVuZXIiLCJhZGp1c3RFZGl0b3JIZWlnaHQiLCJjbGVhbnVwIiwicmVtb3ZlRXZlbnRMaXN0ZW5lciIsIm9mZiIsImRlc3Ryb3kiLCJmdWxsc2NyZWVuRWxlbWVudCIsInJlcXVlc3RGdWxsc2NyZWVuIiwiZXJyIiwibWVzc2FnZSIsImV4aXRGdWxsc2NyZWVuIiwibW9kZSIsIk5ld01vZGUiLCJyZXF1aXJlIiwiTW9kZSIsInNlc3Npb24iLCJzZXRNb2RlIiwic2V0dGluZ3MiLCJnZXRWYWx1ZSIsImN1cnJlbnRUYWIiLCJ2YWxpZGF0ZUFwcGxpY2F0aW9uRGF0YSIsInJlZGlyZWN0VGFiIiwiY3VycmVudElkIiwidmFsIiwidW5pcWlkIiwibmV3VXJsIiwiaHJlZiIsInJlcGxhY2UiLCJwdXNoU3RhdGUiLCJlbmFibGVEaXJyaXR5IiwiaW5pdGlhbGl6ZURpcnJpdHkiLCJmbiIsImV4aXN0UnVsZSIsInBhcmFtZXRlciIsImhhc0NsYXNzIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsSUFBSUEseUJBQXlCLEdBQUc7QUFDNUJDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLDRCQUFELENBRGlCO0FBRTVCQyxFQUFBQSxPQUFPLEVBQUVELENBQUMsQ0FBQyxZQUFELENBRmtCO0FBRzVCRSxFQUFBQSxtQkFBbUIsRUFBRUYsQ0FBQyxDQUFDLHlDQUFELENBSE07QUFJNUJHLEVBQUFBLGFBQWEsRUFBRUgsQ0FBQyxDQUFDLDhCQUFELENBSlk7QUFLNUJJLEVBQUFBLGdCQUFnQixFQUFFLEVBTFU7QUFNNUJDLEVBQUFBLE1BQU0sRUFBRSxJQU5vQjtBQU81QkMsRUFBQUEsZ0JBQWdCLEVBQUUsTUFQVTtBQU9GO0FBQzFCQyxFQUFBQSxhQUFhLEVBQUUsS0FSYTtBQVFOOztBQUV0QjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLElBQUksRUFBRTtBQUNGQyxNQUFBQSxVQUFVLEVBQUUsTUFEVjtBQUVGQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUsT0FEVjtBQUVJQyxRQUFBQSxNQUFNLEVBQUVDLGVBQWUsQ0FBQ0M7QUFGNUIsT0FERyxFQUtIO0FBQ0lILFFBQUFBLElBQUksRUFB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bUUsSUFBaEIsQ0FBcUJDLE9BQXJCLENBQTZCLFlBQTdCLEVBQTJDLFlBQVk3RSxRQUFRLENBQUNHLElBQVQsQ0FBY3VFLE1BQXJFLElBQStFaEUsSUFBNUY7QUFDQUYsUUFBQUEsTUFBTSxDQUFDN0MsT0FBUCxDQUFlbUgsU0FBZixDQUF5QixJQUF6QixFQUErQixFQUEvQixFQUFtQ0gsTUFBbkM7QUFDSCxPQTVCZ0IsQ0E4QmpCOztBQUNIO0FBQ0osR0FuWDJCOztBQXFYNUI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJekUsRUFBQUEsWUFBWSxFQUFFLHNCQUFTQyxJQUFULEVBQWU7QUFDekJ4QixJQUFBQSxJQUFJLENBQUM1QyxRQUFMLENBQWN5QyxJQUFkLENBQW1CLFlBQW5CLEVBQWlDMkIsSUFBakM7O0FBQ0EsUUFBSXhCLElBQUksQ0FBQ29HLGFBQVQsRUFBd0I7QUFDcEJwRyxNQUFBQSxJQUFJLENBQUNxRyxpQkFBTDtBQUNILEtBSndCLENBTXpCOzs7QUFDQXJGLElBQUFBLFlBQVksQ0FBQ0Msb0JBQWIsQ0FBa0MsOEJBQWxDO0FBQ0g7QUFsWTJCLENBQWhDO0FBcVlBO0FBQ0E7QUFDQTs7QUFDQTVELENBQUMsQ0FBQ2lKLEVBQUYsQ0FBS3pHLElBQUwsQ0FBVTJGLFFBQVYsQ0FBbUJ4SCxLQUFuQixDQUF5QnVJLFNBQXpCLEdBQXFDLFVBQVNoSSxLQUFULEVBQWdCaUksU0FBaEIsRUFBMkI7QUFDNUQsU0FBT25KLENBQUMsQ0FBQyxNQUFNbUosU0FBUCxDQUFELENBQW1CQyxRQUFuQixDQUE0QixRQUE1QixDQUFQO0FBQ0gsQ0FGRDtBQUlBO0FBQ0E7QUFDQTs7O0FBQ0FwSixDQUFDLENBQUNpSCxRQUFELENBQUQsQ0FBWW9DLEtBQVosQ0FBa0IsWUFBVztBQUN6QnZKLEVBQUFBLHlCQUF5QixDQUFDMkIsVUFBMUI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICovXG5cbi8qIGdsb2JhbCBEaWFscGxhbkFwcGxpY2F0aW9uc0FQSSwgRm9ybSwgU2VjdXJpdHlVdGlscywgZ2xvYmFsVHJhbnNsYXRlLCBFeHRlbnNpb25zLCBhY2UsIFVzZXJNZXNzYWdlICovXG5cbi8qKlxuICogRGlhbHBsYW4gYXBwbGljYXRpb24gZWRpdCBmb3JtIG1hbmFnZW1lbnQgbW9kdWxlIHdpdGggZW5oYW5jZWQgc2VjdXJpdHlcbiAqL1xudmFyIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkgPSB7XG4gICAgJGZvcm1PYmo6ICQoJyNkaWFscGxhbi1hcHBsaWNhdGlvbi1mb3JtJyksXG4gICAgJG51bWJlcjogJCgnI2V4dGVuc2lvbicpLFxuICAgICR0eXBlU2VsZWN0RHJvcERvd246ICQoJyNkaWFscGxhbi1hcHBsaWNhdGlvbi1mb3JtIC50eXBlLXNlbGVjdCcpLFxuICAgICR0YWJNZW51SXRlbXM6ICQoJyNhcHBsaWNhdGlvbi1jb2RlLW1lbnUgLml0ZW0nKSxcbiAgICBkZWZhdWx0RXh0ZW5zaW9uOiAnJyxcbiAgICBlZGl0b3I6IG51bGwsXG4gICAgY3VycmVudEFjdGl2ZVRhYjogJ21haW4nLCAvLyBUcmFjayBjdXJyZW50IGFjdGl2ZSB0YWJcbiAgICBpc0xvYWRpbmdEYXRhOiBmYWxzZSwgLy8gRmxhZyB0byBwcmV2ZW50IGJ1dHRvbiByZWFjdGl2YXRpb24gZHVyaW5nIGRhdGEgbG9hZGluZ1xuICAgIFxuICAgIC8qKlxuICAgICAqIEZvcm0gdmFsaWRhdGlvbiBydWxlc1xuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgbmFtZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ25hbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmRhX1ZhbGlkYXRlTmFtZUlzRW1wdHlcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ21heExlbmd0aFs1MF0nLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5kYV9WYWxpZGF0ZU5hbWVUb29Mb25nIHx8ICdOYW1lIGlzIHRvbyBsb25nIChtYXggNTAgY2hhcmFjdGVycyknXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICBleHRlbnNpb246IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdleHRlbnNpb24nLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogJy9eWzAtOSMrXFxcXCp8WF17MSw2NH0kLycsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmRhX1ZhbGlkYXRlRXh0ZW5zaW9uTnVtYmVyLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5kYV9WYWxpZGF0ZUV4dGVuc2lvbklzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdleGlzdFJ1bGVbZXh0ZW5zaW9uLWVycm9yXScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLmRhX1ZhbGlkYXRlRXh0ZW5zaW9uRG91YmxlLFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgZXh0ZW5zaW9uIGRpc3BsYXkgaW4gcmliYm9uIGxhYmVsXG4gICAgICogXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGV4dGVuc2lvbiAtIEV4dGVuc2lvbiBudW1iZXJcbiAgICAgKi9cbiAgICB1cGRhdGVFeHRlbnNpb25EaXNwbGF5OiBmdW5jdGlvbihleHRlbnNpb24pIHtcbiAgICAgICAgdmFyIGV4dGVuc2lvbkRpc3BsYXkgPSAkKCcjZXh0ZW5zaW9uLWRpc3BsYXknKTtcbiAgICAgICAgZXh0ZW5zaW9uRGlzcGxheS50ZXh0KGV4dGVuc2lvbiB8fCAnJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIG1vZHVsZVxuICAgICAqL1xuICAgIGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuICAgICAgICAvLyBFbmFibGUgdGFiIG5hdmlnYXRpb24gd2l0aCBoaXN0b3J5IHN1cHBvcnRcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS4kdGFiTWVudUl0ZW1zLnRhYih7XG4gICAgICAgICAgICBoaXN0b3J5OiB0cnVlLFxuICAgICAgICAgICAgaGlzdG9yeVR5cGU6ICdoYXNoJyxcbiAgICAgICAgICAgIG9uVmlzaWJsZTogZnVuY3Rpb24odGFiUGF0aCkge1xuICAgICAgICAgICAgICAgIC8vIFRyYWNrIGN1cnJlbnQgYWN0aXZlIHRhYlxuICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuY3VycmVudEFjdGl2ZVRhYiA9IHRhYlBhdGg7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gUmVzaXplIEFDRSBlZGl0b3Igd2hlbiBjb2RlIHRhYiBiZWNvbWVzIHZpc2libGVcbiAgICAgICAgICAgICAgICBpZiAodGFiUGF0aCA9PT0gJ2NvZGUnICYmIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yKSB7XG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IucmVzaXplKCk7XG4gICAgICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS4kdHlwZVNlbGVjdERyb3BEb3duLmRyb3Bkb3duKHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmNoYW5nZUFjZU1vZGVcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBFeHRlbnNpb24gYXZhaWxhYmlsaXR5IGNoZWNrXG4gICAgICAgIHZhciB0aW1lb3V0SWQ7XG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuJG51bWJlci5vbignaW5wdXQnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGlmICh0aW1lb3V0SWQpIGNsZWFyVGltZW91dCh0aW1lb3V0SWQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciBuZXdOdW1iZXIgPSBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdleHRlbnNpb24nKTtcbiAgICAgICAgICAgICAgICBFeHRlbnNpb25zLmNoZWNrQXZhaWxhYmlsaXR5KGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZGVmYXVsdEV4dGVuc2lvbiwgbmV3TnVtYmVyKTtcbiAgICAgICAgICAgIH0sIDUwMCk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIEZvcm0uanMgZm9yIFJFU1QgQVBJXG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgXG4gICAgICAgIC8vIFJFU1QgQVBJIGludGVncmF0aW9uXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuZW5hYmxlZCA9IHRydWU7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MuYXBpT2JqZWN0ID0gRGlhbHBsYW5BcHBsaWNhdGlvbnNBUEk7XG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3Muc2F2ZU1ldGhvZCA9ICdzYXZlUmVjb3JkJztcbiAgICAgICAgXG4gICAgICAgIC8vIE5hdmlnYXRpb24gVVJMc1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBnbG9iYWxSb290VXJsICsgJ2RpYWxwbGFuLWFwcGxpY2F0aW9ucy9pbmRleC8nO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gZ2xvYmFsUm9vdFVybCArICdkaWFscGxhbi1hcHBsaWNhdGlvbnMvbW9kaWZ5Lyc7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgYWRhcHRpdmUgdGV4dGFyZWEgZm9yIGRlc2NyaXB0aW9uIGZpZWxkXG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuaW5pdGlhbGl6ZUFkYXB0aXZlVGV4dGFyZWEoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgY29tcG9uZW50c1xuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmluaXRpYWxpemVBY2UoKTtcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5pbml0aWFsaXplRnVsbHNjcmVlbkhhbmRsZXJzKCk7XG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBhZGFwdGl2ZSB0ZXh0YXJlYSBmb3IgZGVzY3JpcHRpb24gZmllbGRcbiAgICAgKi9cbiAgICBpbml0aWFsaXplQWRhcHRpdmVUZXh0YXJlYTogZnVuY3Rpb24oKSB7XG4gICAgICAgIC8vIFNldCB1cCBhZGFwdGl2ZSByZXNpemluZyBmb3IgZGVzY3JpcHRpb24gdGV4dGFyZWFcbiAgICAgICAgJCgndGV4dGFyZWFbbmFtZT1cImRlc2NyaXB0aW9uXCJdJykub24oJ2lucHV0IHBhc3RlIGtleXVwJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJCh0aGlzKSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbCByZXNpemUgYWZ0ZXIgZm9ybSBkYXRhIGlzIGxvYWRlZFxuICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGZvcm0gZGF0YSB2aWEgUkVTVCBBUElcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciByZWNvcmRJZCA9IGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZ2V0UmVjb3JkSWQoKTtcbiAgICAgICAgXG4gICAgICAgIERpYWxwbGFuQXBwbGljYXRpb25zQVBJLmdldFJlY29yZChyZWNvcmRJZCwgZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvLyBEYXRhIGlzIGFscmVhZHkgc2FuaXRpemVkIGluIEFQSSBtb2R1bGVcbiAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmRlZmF1bHRFeHRlbnNpb24gPSByZXNwb25zZS5kYXRhLmV4dGVuc2lvbjtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgZXh0ZW5zaW9uIG51bWJlciBkaXNwbGF5IGluIHRoZSByaWJib24gbGFiZWxcbiAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LnVwZGF0ZUV4dGVuc2lvbkRpc3BsYXkocmVzcG9uc2UuZGF0YS5leHRlbnNpb24pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNldCBBQ0UgZWRpdG9yIGNvbnRlbnQgKGFwcGxpY2F0aW9ubG9naWMgaXMgbm90IHNhbml0aXplZClcbiAgICAgICAgICAgICAgICB2YXIgY29kZUNvbnRlbnQgPSByZXNwb25zZS5kYXRhLmFwcGxpY2F0aW9ubG9naWMgfHwgJyc7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2V0IGZsYWcgdG8gcHJldmVudCByZWFjdGl2YXRpbmcgYnV0dG9ucyBkdXJpbmcgZGF0YSBsb2FkXG4gICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5pc0xvYWRpbmdEYXRhID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5nZXRTZXNzaW9uKCkuc2V0VmFsdWUoY29kZUNvbnRlbnQpO1xuICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuY2hhbmdlQWNlTW9kZSgpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIENsZWFyIGxvYWRpbmcgZmxhZyBhZnRlciBzZXR0aW5nIGNvbnRlbnRcbiAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmlzTG9hZGluZ0RhdGEgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTd2l0Y2ggdG8gbWFpbiB0YWIgb25seSBmb3IgY29tcGxldGVseSBuZXcgcmVjb3JkcyAobm8gbmFtZSBhbmQgbm8gZXh0ZW5zaW9uKVxuICAgICAgICAgICAgICAgIC8vIEhhc2ggaGlzdG9yeSB3aWxsIHByZXNlcnZlIHRoZSB0YWIgZm9yIGV4aXN0aW5nIHJlY29yZHNcbiAgICAgICAgICAgICAgICBpZiAoIXJlc3BvbnNlLmRhdGEubmFtZSAmJiAhcmVzcG9uc2UuZGF0YS5leHRlbnNpb24gJiYgIXdpbmRvdy5sb2NhdGlvbi5oYXNoKSB7XG4gICAgICAgICAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuJHRhYk1lbnVJdGVtcy50YWIoJ2NoYW5nZSB0YWInLCAnbWFpbicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBdXRvLXJlc2l6ZSB0ZXh0YXJlYSBhZnRlciBkYXRhIGlzIGxvYWRlZCAod2l0aCBzbWFsbCBkZWxheSBmb3IgRE9NIHVwZGF0ZSlcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpO1xuICAgICAgICAgICAgICAgIH0sIDEwMCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHZhciBlcnJvck1lc3NhZ2UgPSByZXNwb25zZS5tZXNzYWdlcyAmJiByZXNwb25zZS5tZXNzYWdlcy5lcnJvciA/IFxuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5tZXNzYWdlcy5lcnJvci5qb2luKCcsICcpIDogXG4gICAgICAgICAgICAgICAgICAgICdGYWlsZWQgdG8gbG9hZCBkaWFscGxhbiBhcHBsaWNhdGlvbiBkYXRhJztcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoU2VjdXJpdHlVdGlscy5lc2NhcGVIdG1sKGVycm9yTWVzc2FnZSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCByZWNvcmQgSUQgZnJvbSBVUkxcbiAgICAgKiBcbiAgICAgKiBAcmV0dXJuIHtzdHJpbmd9IFJlY29yZCBJRFxuICAgICAqL1xuICAgIGdldFJlY29yZElkOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIHVybFBhcnRzID0gd2luZG93LmxvY2F0aW9uLnBhdGhuYW1lLnNwbGl0KCcvJyk7XG4gICAgICAgIHZhciBtb2RpZnlJbmRleCA9IHVybFBhcnRzLmluZGV4T2YoJ21vZGlmeScpO1xuICAgICAgICBpZiAobW9kaWZ5SW5kZXggIT09IC0xICYmIHVybFBhcnRzW21vZGlmeUluZGV4ICsgMV0pIHtcbiAgICAgICAgICAgIHJldHVybiB1cmxQYXJ0c1ttb2RpZnlJbmRleCArIDFdO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiAnJztcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgQUNFIGVkaXRvciB3aXRoIHNlY3VyaXR5IGNvbnNpZGVyYXRpb25zXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUFjZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBhY2VIZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQgLSAzODA7XG4gICAgICAgIHZhciByb3dzQ291bnQgPSBNYXRoLnJvdW5kKGFjZUhlaWdodCAvIDE2LjMpO1xuICAgICAgICBcbiAgICAgICAgJCh3aW5kb3cpLm9uKCdsb2FkJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgJCgnLmFwcGxpY2F0aW9uLWNvZGUnKS5jc3MoJ21pbi1oZWlnaHQnLCBhY2VIZWlnaHQgKyAncHgnKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvciA9IGFjZS5lZGl0KCdhcHBsaWNhdGlvbi1jb2RlJyk7XG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLnNldFRoZW1lKCdhY2UvdGhlbWUvbW9ub2thaScpO1xuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5yZXNpemUoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFRyYWNrIGNoYW5nZXMgZm9yIEZvcm0uanNcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IuZ2V0U2Vzc2lvbigpLm9uKCdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIC8vIElnbm9yZSBjaGFuZ2VzIGR1cmluZyBkYXRhIGxvYWRpbmcgdG8gcHJldmVudCByZWFjdGl2YXRpbmcgYnV0dG9uc1xuICAgICAgICAgICAgaWYgKCFkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmlzTG9hZGluZ0RhdGEpIHtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3Iuc2V0T3B0aW9ucyh7XG4gICAgICAgICAgICBtYXhMaW5lczogcm93c0NvdW50LFxuICAgICAgICAgICAgc2hvd1ByaW50TWFyZ2luOiBmYWxzZSxcbiAgICAgICAgICAgIHNob3dMaW5lTnVtYmVyczogZmFsc2VcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBTZWN1cml0eTogcHJldmVudCBjb2RlIGV4ZWN1dGlvbiBpbiBlZGl0b3JcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IuY29tbWFuZHMuYWRkQ29tbWFuZCh7XG4gICAgICAgICAgICBuYW1lOiAncHJldmVudENvZGVFeGVjdXRpb24nLFxuICAgICAgICAgICAgYmluZEtleToge3dpbjogJ0N0cmwtRScsIG1hYzogJ0NvbW1hbmQtRSd9LFxuICAgICAgICAgICAgZXhlYzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdDb2RlIGV4ZWN1dGlvbiBwcmV2ZW50ZWQgZm9yIHNlY3VyaXR5Jyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgZnVsbHNjcmVlbiBoYW5kbGVyc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGdWxsc2NyZWVuSGFuZGxlcnM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAkKCcuZnVsbHNjcmVlbi10b2dnbGUtYnRuJykub24oJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgdmFyIGNvbnRhaW5lciA9ICQodGhpcykuc2libGluZ3MoJy5hcHBsaWNhdGlvbi1jb2RlJylbMF07XG4gICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LnRvZ2dsZUZ1bGxTY3JlZW4oY29udGFpbmVyKTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignZnVsbHNjcmVlbmNoYW5nZScsIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuYWRqdXN0RWRpdG9ySGVpZ2h0KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xlYW51cCBldmVudCBsaXN0ZW5lcnMgdG8gcHJldmVudCBtZW1vcnkgbGVha3NcbiAgICAgKi9cbiAgICBjbGVhbnVwOiBmdW5jdGlvbigpIHtcbiAgICAgICAgLy8gUmVtb3ZlIGZ1bGxzY3JlZW4gZXZlbnQgbGlzdGVuZXJcbiAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignZnVsbHNjcmVlbmNoYW5nZScsIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuYWRqdXN0RWRpdG9ySGVpZ2h0KTtcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFudXAgb3RoZXIgZXZlbnQgbGlzdGVuZXJzIGlmIG5lZWRlZFxuICAgICAgICAkKHdpbmRvdykub2ZmKCdsb2FkJyk7XG4gICAgICAgICQoJy5mdWxsc2NyZWVuLXRvZ2dsZS1idG4nKS5vZmYoJ2NsaWNrJyk7XG4gICAgICAgICQoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpLm9mZignaW5wdXQgcGFzdGUga2V5dXAnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENsZWFudXAgQUNFIGVkaXRvclxuICAgICAgICBpZiAoZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IpIHtcbiAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLmRlc3Ryb3koKTtcbiAgICAgICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yID0gbnVsbDtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIGZ1bGxzY3JlZW4gbW9kZVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGNvbnRhaW5lciAtIENvbnRhaW5lciBlbGVtZW50XG4gICAgICovXG4gICAgdG9nZ2xlRnVsbFNjcmVlbjogZnVuY3Rpb24oY29udGFpbmVyKSB7XG4gICAgICAgIGlmICghZG9jdW1lbnQuZnVsbHNjcmVlbkVsZW1lbnQpIHtcbiAgICAgICAgICAgIGNvbnRhaW5lci5yZXF1ZXN0RnVsbHNjcmVlbigpLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGF0dGVtcHRpbmcgdG8gZW5hYmxlIGZ1bGwtc2NyZWVuIG1vZGU6ICcgKyBlcnIubWVzc2FnZSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRvY3VtZW50LmV4aXRGdWxsc2NyZWVuKCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRqdXN0IGVkaXRvciBoZWlnaHQgb24gZnVsbHNjcmVlbiBjaGFuZ2VcbiAgICAgKi9cbiAgICBhZGp1c3RFZGl0b3JIZWlnaHQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5yZXNpemUoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENoYW5nZSBBQ0UgZWRpdG9yIG1vZGUgYmFzZWQgb24gdHlwZVxuICAgICAqL1xuICAgIGNoYW5nZUFjZU1vZGU6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgbW9kZSA9IGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3R5cGUnKTtcbiAgICAgICAgdmFyIE5ld01vZGU7XG5cbiAgICAgICAgaWYgKG1vZGUgPT09ICdwaHAnKSB7XG4gICAgICAgICAgICBOZXdNb2RlID0gYWNlLnJlcXVpcmUoJ2FjZS9tb2RlL3BocCcpLk1vZGU7XG4gICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5zZXRPcHRpb25zKHtcbiAgICAgICAgICAgICAgICBzaG93TGluZU51bWJlcnM6IHRydWVcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgTmV3TW9kZSA9IGFjZS5yZXF1aXJlKCdhY2UvbW9kZS9qdWxpYScpLk1vZGU7XG4gICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LmVkaXRvci5zZXRPcHRpb25zKHtcbiAgICAgICAgICAgICAgICBzaG93TGluZU51bWJlcnM6IGZhbHNlXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLnNlc3Npb24uc2V0TW9kZShuZXcgTmV3TW9kZSgpKTtcbiAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3Iuc2V0VGhlbWUoJ2FjZS90aGVtZS9tb25va2FpJyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgZm9ybSBzdWJtaXNzaW9uXG4gICAgICogXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHNldHRpbmdzIC0gRm9ybSBzZXR0aW5nc1xuICAgICAqIEByZXR1cm4ge29iamVjdHxmYWxzZX0gTW9kaWZpZWQgc2V0dGluZ3Mgb3IgZmFsc2UgdG8gY2FuY2VsXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybTogZnVuY3Rpb24oc2V0dGluZ3MpIHtcbiAgICAgICAgdmFyIHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGFwcGxpY2F0aW9uIGxvZ2ljIGZyb20gQUNFIGVkaXRvciAobm90IHNhbml0aXplZClcbiAgICAgICAgcmVzdWx0LmRhdGEuYXBwbGljYXRpb25sb2dpYyA9IGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuZWRpdG9yLmdldFZhbHVlKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBQYXNzIGN1cnJlbnQgYWN0aXZlIHRhYiBmb3IgcmVkaXJlY3RcbiAgICAgICAgcmVzdWx0LmRhdGEuY3VycmVudFRhYiA9IGRpYWxwbGFuQXBwbGljYXRpb25Nb2RpZnkuY3VycmVudEFjdGl2ZVRhYjtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZGl0aW9uYWwgY2xpZW50LXNpZGUgdmFsaWRhdGlvblxuICAgICAgICBpZiAoIURpYWxwbGFuQXBwbGljYXRpb25zQVBJLnZhbGlkYXRlQXBwbGljYXRpb25EYXRhKHJlc3VsdC5kYXRhKSkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKCdWYWxpZGF0aW9uIGZhaWxlZCcpO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBzdWJtaXNzaW9uIChubyBzdWNjZXNzIG1lc3NhZ2VzIC0gVUkgdXBkYXRlcyBvbmx5KVxuICAgICAqIFxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSByZXNwb25zZSAtIFNlcnZlciByZXNwb25zZVxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybTogZnVuY3Rpb24ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICAvLyBEYXRhIGlzIGFscmVhZHkgc2FuaXRpemVkIGluIEFQSSBtb2R1bGVcbiAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgZXh0ZW5zaW9uIG51bWJlciBkaXNwbGF5IGluIHRoZSByaWJib24gbGFiZWxcbiAgICAgICAgICAgICAgICBkaWFscGxhbkFwcGxpY2F0aW9uTW9kaWZ5LnVwZGF0ZUV4dGVuc2lvbkRpc3BsYXkocmVzcG9uc2UuZGF0YS5leHRlbnNpb24pO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBBQ0UgZWRpdG9yIGNvbnRlbnRcbiAgICAgICAgICAgICAgICB2YXIgY29kZUNvbnRlbnQgPSByZXNwb25zZS5kYXRhLmFwcGxpY2F0aW9ubG9naWMgfHwgJyc7XG4gICAgICAgICAgICAgICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5lZGl0b3IuZ2V0U2Vzc2lvbigpLnNldFZhbHVlKGNvZGVDb250ZW50KTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBIYW5kbGUgcmVkaXJlY3Qgd2l0aCB0YWIgcHJlc2VydmF0aW9uXG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEucmVkaXJlY3RUYWIgJiYgcmVzcG9uc2UuZGF0YS5yZWRpcmVjdFRhYiAhPT0gJ21haW4nKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBGb3JtLmpzIHJlZGlyZWN0IFVSTCB0byBpbmNsdWRlIGhhc2hcbiAgICAgICAgICAgICAgICAgICAgdmFyIGN1cnJlbnRJZCA9ICQoJyNpZCcpLnZhbCgpIHx8IHJlc3BvbnNlLmRhdGEudW5pcWlkO1xuICAgICAgICAgICAgICAgICAgICBpZiAoY3VycmVudElkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gZ2xvYmFsUm9vdFVybCArICdkaWFscGxhbi1hcHBsaWNhdGlvbnMvbW9kaWZ5LycgKyBjdXJyZW50SWQgKyAnIy8nICsgcmVzcG9uc2UuZGF0YS5yZWRpcmVjdFRhYjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIFVSTCBmb3IgbmV3IHJlY29yZHMgXG4gICAgICAgICAgICB2YXIgY3VycmVudElkID0gJCgnI2lkJykudmFsKCk7XG4gICAgICAgICAgICBpZiAoIWN1cnJlbnRJZCAmJiByZXNwb25zZS5kYXRhICYmIHJlc3BvbnNlLmRhdGEudW5pcWlkKSB7XG4gICAgICAgICAgICAgICAgdmFyIGhhc2ggPSByZXNwb25zZS5kYXRhLnJlZGlyZWN0VGFiICYmIHJlc3BvbnNlLmRhdGEucmVkaXJlY3RUYWIgIT09ICdtYWluJyA/ICcjLycgKyByZXNwb25zZS5kYXRhLnJlZGlyZWN0VGFiIDogJyc7XG4gICAgICAgICAgICAgICAgdmFyIG5ld1VybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmLnJlcGxhY2UoL21vZGlmeVxcLz8kLywgJ21vZGlmeS8nICsgcmVzcG9uc2UuZGF0YS51bmlxaWQpICsgaGFzaDtcbiAgICAgICAgICAgICAgICB3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUobnVsbCwgJycsIG5ld1VybCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIE5vIHN1Y2Nlc3MgbWVzc2FnZSAtIGp1c3Qgc2lsZW50IHVwZGF0ZVxuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggc2FuaXRpemVkIGRhdGFcbiAgICAgKiBcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIEZvcm0gZGF0YVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybTogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZXMnLCBkYXRhKTtcbiAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgRm9ybS5pbml0aWFsaXplRGlycml0eSgpO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICAvLyBBdXRvLXJlc2l6ZSB0ZXh0YXJlYSBhZnRlciBkYXRhIGlzIHBvcHVsYXRlZFxuICAgICAgICBGb3JtRWxlbWVudHMub3B0aW1pemVUZXh0YXJlYVNpemUoJ3RleHRhcmVhW25hbWU9XCJkZXNjcmlwdGlvblwiXScpO1xuICAgIH1cbn07XG5cbi8qKlxuICogQ3VzdG9tIHZhbGlkYXRpb24gcnVsZSBmb3IgZXh0ZW5zaW9uIGV4aXN0ZW5jZVxuICovXG4kLmZuLmZvcm0uc2V0dGluZ3MucnVsZXMuZXhpc3RSdWxlID0gZnVuY3Rpb24odmFsdWUsIHBhcmFtZXRlcikgeyBcbiAgICByZXR1cm4gJCgnIycgKyBwYXJhbWV0ZXIpLmhhc0NsYXNzKCdoaWRkZW4nKTsgXG59O1xuXG4vKipcbiAqIEluaXRpYWxpemUgb24gZG9jdW1lbnQgcmVhZHlcbiAqL1xuJChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24oKSB7XG4gICAgZGlhbHBsYW5BcHBsaWNhdGlvbk1vZGlmeS5pbml0aWFsaXplKCk7XG59KTtcblxuIl19