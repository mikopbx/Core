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

/* global globalRootUrl, IvrMenuAPI, Form, globalTranslate, UserMessage, ExtensionsAPI, SoundFileSelector, ExtensionSelector, TooltipBuilder, FormElements */

/**
 * IVR menu edit form management module
 */
const ivrMenuModify = {
  $formObj: $('#ivr-menu-form'),
  $number: $('#extension'),
  $actionsPlace: $('#actions-place'),
  $rowTemplate: $('#row-template'),
  actionsRowsCount: 0,
  defaultExtension: '',


  /**
   * Validation rules for the form fields before submission.
   *
   * @type {object}
   */
  validateRules: {
      name: {
          identifier: 'name',
          rules: [
              {
                  type: 'empty',
                  prompt: globalTranslate.iv_ValidateNameIsEmpty,
              },
          ],
      },
      extension: {
          identifier: 'extension',
          rules: [
              {
                  type: 'empty',
                  prompt: globalTranslate.iv_ValidateExtensionIsEmpty,
              },
              {
                  type: 'regExp[/^[0-9]{2,8}$/]',
                  prompt: globalTranslate.iv_ValidateExtensionFormat
              },
              {
                  type: 'existRule[extension-error]',
                  prompt: globalTranslate.iv_ValidateExtensionDouble,
              },
          ],
      },
      timeout: {
          identifier: 'timeout',
          rules: [
              {
                  type: 'integer[1..99]',
                  prompt: globalTranslate.iv_ValidateTimeout
              }
          ]
      },
      number_of_repeat: {
          identifier: 'number_of_repeat',
          rules: [
              {
                  type: 'integer[1..99]',
                  prompt: globalTranslate.iv_ValidateRepeatCount
              }
          ]
      },
  },

  initialize() {
      // Add handler to dynamically check if the input number is available
      let timeoutId;
      ivrMenuModify.$number.on('input', () => {
          // Clear the previous timer, if it exists
          if (timeoutId) {
              clearTimeout(timeoutId);
          }
          // Set a new timer with a delay of 0.5 seconds
          timeoutId = setTimeout(() => {
              // Get the newly entered number
              const newNumber = ivrMenuModify.$formObj.form('get value', 'extension');

              // Execute the availability check for the number
              ExtensionsAPI.checkAvailability(ivrMenuModify.defaultExtension, newNumber);
          }, 500);
      });
      
      // Audio message dropdown will be initialized in populateForm() with clean data
      
      // Initialize actions table
      ivrMenuModify.initializeActionsTable();
      
      // Setup auto-resize for description textarea with event handlers
      $('textarea[name="description"]').on('input paste keyup', function() {
          FormElements.optimizeTextareaSize($(this));
      });
      
      // Configure Form.js
      Form.$formObj = ivrMenuModify.$formObj;
      Form.url = '#'; // Not used with REST API
      Form.validateRules = ivrMenuModify.validateRules;
      Form.cbBeforeSendForm = ivrMenuModify.cbBeforeSendForm;
      Form.cbAfterSendForm = ivrMenuModify.cbAfterSendForm;
      
      // Setup REST API
      Form.apiSettings.enabled = true;
      Form.apiSettings.apiObject = IvrMenuAPI;
      Form.apiSettings.saveMethod = 'saveRecord';
      
      // Important settings for correct save modes operation
      Form.afterSubmitIndexUrl = `${globalRootUrl}ivr-menu/index/`;
      Form.afterSubmitModifyUrl = `${globalRootUrl}ivr-menu/modify/`;
      
      // Initialize Form with all standard features:
      // - Dirty checking (change tracking)
      // - Dropdown submit (SaveSettings, SaveSettingsAndAddNew, SaveSettingsAndExit)
      // - Form validation
      // - AJAX response handling
      Form.initialize();
      
      // Initialize tooltips for form fields
      ivrMenuModify.initializeTooltips();
      
      // Load form data
      ivrMenuModify.initializeForm();
  },
  /**
   * Load data into form
   */
  initializeForm() {
      const recordId = ivrMenuModify.getRecordId();
      const urlParams = new URLSearchParams(window.location.search);
      const copyParam = urlParams.get('copy');

      // Check for copy mode from URL parameter
      if (copyParam) {
          // Use the new RESTful copy method: /ivr-menu/{id}:copy
          IvrMenuAPI.callCustomMethod('copy', {id: copyParam}, (response) => {
              if (response.result) {
                  // Mark as new record for copy
                  response.data._isNew = true;

                  ivrMenuModify.populateForm(response.data);

                  // For copies, clear the default extension for validation
                  ivrMenuModify.defaultExtension = '';

                  // Populate actions table
                  ivrMenuModify.populateActionsTable(response.data.actions || []);

                  // Mark form as changed to enable save button
                  Form.dataChanged();
              } else {
                  UserMessage.showError(response.messages?.error || 'Failed to copy IVR menu data');
              }
          });
      } else {
          // Normal mode - load existing record or get default for new
          const requestId = recordId || 'new';

          IvrMenuAPI.getRecord(requestId, (response) => {
              if (response.result) {
                  // Mark as new record if we don't have an ID
                  if (!recordId) {
                      response.data._isNew = true;
                  }

                  ivrMenuModify.populateForm(response.data);

                  // Set default extension for validation
                  if (!recordId) {
                      // For new records, use the new extension for validation
                      ivrMenuModify.defaultExtension = '';
                  } else {
                      // For existing records, use their original extension
                      ivrMenuModify.defaultExtension = ivrMenuModify.$formObj.form('get value', 'extension');
                  }

                  // Populate actions table
                  ivrMenuModify.populateActionsTable(response.data.actions || []);
              } else {
                  UserMessage.showError(response.messages?.error || 'Failed to load IVR menu data');
              }
          });
      }
  },
  
  /**
   * Get record ID from URL
   */
  getRecordId() {
      const urlParts = window.location.pathname.split('/');
      const modifyIndex = urlParts.indexOf('modify');
      if (modifyIndex !== -1 && urlParts[modifyIndex + 1]) {
          return urlParts[modifyIndex + 1];
      }
      return '';
  },



  /**
   * Initialize actions table
   */
  initializeActionsTable() {
      // Add new action button
      $('#add-new-ivr-action').on('click', (e) => {
          e.preventDefault();
          ivrMenuModify.addNewActionRow();
          // Initialize dropdown for the new row only
          const lastRowId = ivrMenuModify.actionsRowsCount;
          ivrMenuModify.initializeNewActionExtensionDropdown(lastRowId);
      });
  },

  /**
   * Populate actions table
   */
  populateActionsTable(actions) {
      // Clear existing actions except template
      $('.action-row:not(#row-template)').remove();
      ivrMenuModify.actionsRowsCount = 0;
      
      actions.forEach((action, index) => {
          // Create row with proper index-based data structure for V5.0
          const rowIndex = index + 1;
          ivrMenuModify.addNewActionRow({
              digits: action.digits,
              extension: action.extension,
              extensionRepresent: action.extension_represent || '',
              rowIndex: rowIndex // Pass row index for proper field naming
          });
      });
      
      // Initialize action extension dropdowns once after all actions are populated
      ivrMenuModify.initializeActionExtensionsDropdowns();
      
      // Re-initialize dirty checking AFTER all form data (including actions) is populated
      if (Form.enableDirrity) {
          Form.initializeDirrity();
      }
      
  },
  
  /**
   * Add new action row using the existing template
   */
  addNewActionRow(param = {}) {
      const defaultParam = {
          digits: '',
          extension: '',
          extensionRepresent: ''
      };
      
      const rowParam = $.extend({}, defaultParam, param);
      ivrMenuModify.actionsRowsCount += 1;
      
      // Clone template
      const $actionTemplate = ivrMenuModify.$rowTemplate.clone();
      $actionTemplate
          .removeClass('hidden')
          .attr('id', `row-${ivrMenuModify.actionsRowsCount}`)
          .attr('data-value', ivrMenuModify.actionsRowsCount)
          .attr('style', '');
          
      // Set digits input
      $actionTemplate.find('input[name="digits-id"]')
          .attr('id', `digits-${ivrMenuModify.actionsRowsCount}`)
          .attr('name', `digits-${ivrMenuModify.actionsRowsCount}`)
          .attr('value', rowParam.digits);
          
      // Set extension input and store represent data
      const $extensionInput = $actionTemplate.find('input[name="extension-id"]');
      $extensionInput
          .attr('id', `extension-${ivrMenuModify.actionsRowsCount}`)
          .attr('name', `extension-${ivrMenuModify.actionsRowsCount}`)
          .attr('value', rowParam.extension);
          
      // Store extension represent data directly on the input for later use
      if (rowParam.extensionRepresent && rowParam.extensionRepresent.length > 0) {
          $extensionInput.attr('data-represent', rowParam.extensionRepresent);
      }
          
      // Set delete button data-value
      $actionTemplate.find('div.delete-action-row')
          .attr('data-value', ivrMenuModify.actionsRowsCount);
      
      // Add validation rules for the new fields
      ivrMenuModify.validateRules[`digits-${ivrMenuModify.actionsRowsCount}`] = {
          identifier: `digits-${ivrMenuModify.actionsRowsCount}`,
          depends: `extension-${ivrMenuModify.actionsRowsCount}`,
          rules: [{
              type: 'empty',
              prompt: globalTranslate.iv_ValidateDigitsIsEmpty
          }, {
              type: 'checkDoublesDigits',
              prompt: globalTranslate.iv_ValidateDigitsIsNotCorrect
          }]
      };
      
      ivrMenuModify.validateRules[`extension-${ivrMenuModify.actionsRowsCount}`] = {
          identifier: `extension-${ivrMenuModify.actionsRowsCount}`,
          depends: `digits-${ivrMenuModify.actionsRowsCount}`,
          rules: [{
              type: 'empty',
              prompt: globalTranslate.iv_ValidateExtensionIsEmpty
          }]
      };
      
      // Append to actions place
      ivrMenuModify.$actionsPlace.append($actionTemplate);
      
      // Set up change handlers for the new fields to trigger Form.dataChanged()
      const digitsFieldId = `digits-${ivrMenuModify.actionsRowsCount}`;
      const extensionFieldId = `extension-${ivrMenuModify.actionsRowsCount}`;
      
      // Add change handler for digits field
      $(`#${digitsFieldId}`).on('input change', () => {
          Form.dataChanged();
      });
      
      // Add change handler for extension field (hidden input)
      $(`#${extensionFieldId}`).on('change', () => {
          Form.dataChanged();
      });
      
      // Acknowledge form modification when action row is configured
      Form.dataChanged();
  },

  
  /**
   * Initialize action extension dropdowns - V5.0 Architecture with Clean Backend Data
   * Uses ExtensionSelector with complete automation and proper REST API data
   */
  initializeActionExtensionsDropdowns() {
      // Initialize each action row's extension dropdown with V5.0 specialized class
      $('.action-row:not(#row-template)').each(function() {
          const $row = $(this);
          const rowId = $row.attr('data-value');
          
          if (rowId) {
              const fieldName = `extension-${rowId}`;
              const $hiddenInput = $row.find(`input[name="${fieldName}"]`);
              
              if ($hiddenInput.length) {
                  // Get clean data from REST API structure stored in data-represent attribute
                  const currentValue = $hiddenInput.val() || '';
                  const currentRepresent = $hiddenInput.attr('data-represent') || '';
                  
                  // Create V5.0 compliant data structure
                  const cleanData = {};
                  cleanData[fieldName] = currentValue;
                  cleanData[`${fieldName}_represent`] = currentRepresent;
                  
                  
                  // V5.0 ExtensionSelector - complete automation with clean backend data
                  ExtensionSelector.init(fieldName, {
                      type: 'routing',
                      includeEmpty: false,
                      data: cleanData
                      // ❌ NO onChange needed - complete automation by ExtensionSelector + base class
                  });
              }
          }
      });
      
      // Set up change handlers for existing action fields to trigger Form.dataChanged()
      $('.action-row:not(#row-template)').each(function() {
          const $row = $(this);
          const rowId = $row.attr('data-value');
          
          if (rowId) {
              // Add change handlers for digits fields
              const $digitsField = $row.find(`input[name="digits-${rowId}"]`);
              if ($digitsField.length) {
                  $digitsField.off('input.formChange change.formChange').on('input.formChange change.formChange', () => {
                      Form.dataChanged();
                  });
              }
              
              // Add change handlers for extension fields (hidden inputs)
              const $extensionField = $row.find(`input[name="extension-${rowId}"]`);
              if ($extensionField.length) {
                  $extensionField.off('change.formChange').on('change.formChange', () => {
                      Form.dataChanged();
                  });
              }
          }
      });
      
      // Use event delegation for delete handlers to support dynamically added rows
      $(document).off('click.deleteActionRow', '.delete-action-row').on('click.deleteActionRow', '.delete-action-row', function(e) {
          e.preventDefault();
          const id = $(this).attr('data-value');
          
          // Remove validation rules
          delete ivrMenuModify.validateRules[`digits-${id}`];
          delete ivrMenuModify.validateRules[`extension-${id}`];
          
          // Remove the row
          $(`#row-${id}`).remove();
          
          // Acknowledge form modification
          Form.dataChanged();
      });
  },
  
  /**
   * Initialize extension dropdown for a new action row - V5.0 Architecture
   * @param {number} rowId - Row ID for the new row
   */
  initializeNewActionExtensionDropdown(rowId) {
      const fieldName = `extension-${rowId}`;
      const $hiddenInput = $(`#${fieldName}`);
      
      if ($hiddenInput.length) {
          // Clean empty data object for new row
          const data = {};
          data[fieldName] = '';
          data[`${fieldName}_represent`] = '';
          
          // V5.0 ExtensionSelector - complete automation, NO onChange needed
          ExtensionSelector.init(fieldName, {
              type: 'routing',
              includeEmpty: false,
              data: data
              // ❌ NO onChange needed - complete automation by ExtensionSelector + base class
          });
      }
  },
  



  /**
   * Callback function to be called before the form is sent
   * @param {Object} settings - The current settings of the form
   * @returns {Object} - The updated settings of the form
   */
  cbBeforeSendForm(settings) {
      // Collect actions data
      const actions = [];
      
      // Iterate over each action row (excluding template)
      $('.action-row:not(#row-template)').each(function() {
          const rowId = $(this).attr('data-value');
          
          // Skip template row
          if (rowId && parseInt(rowId) > 0) {
              const digits = ivrMenuModify.$formObj.form('get value', `digits-${rowId}`);
              const extension = ivrMenuModify.$formObj.form('get value', `extension-${rowId}`);
              
              // Only add if both values exist
              if (digits && extension) {
                  actions.push({
                      digits: digits,
                      extension: extension
                  });
              }
          }
      });
      
      // Add actions to form data
      const formData = ivrMenuModify.$formObj.form('get values');
      formData.actions = actions; // Pass as array, not JSON string
      
      // Add _isNew flag based on the form's hidden field value
      if (formData.isNew === '1') {
          formData._isNew = true;
      }
      
      settings.data = formData;
      
      return settings;
  },
  /**
   * Callback after form submission
   * Handles different save modes (SaveSettings, SaveSettingsAndAddNew, SaveSettingsAndExit)
   */
  cbAfterSendForm(response) {
      if (response.result) {
          if (response.data) {
              ivrMenuModify.populateForm(response.data);
          }

          // Form.js will handle all redirect logic based on submitMode
          const formData = ivrMenuModify.$formObj.form('get values');
          if (formData.isNew === '1' && response.data && response.data.id) {
              // Update the hidden isNew field to '0' since it's no longer new
              ivrMenuModify.$formObj.form('set value', 'isNew', '0');
          }
      }
  },

  /**
   * Populate form with data
   */
  populateForm(data) {
      // Use unified silent population approach
      Form.populateFormSilently(data, {
          afterPopulate: (formData) => {
              // Update extension number in ribbon label
              if (formData.extension) {
                  $('#ivr-menu-extension-number').html(`<i class="phone icon"></i> ${formData.extension}`);
              }
              
              // Initialize dropdowns with V5.0 specialized classes - complete automation
              ivrMenuModify.initializeDropdownsWithCleanData(formData);
              
              // Auto-resize textarea after data is loaded
              FormElements.optimizeTextareaSize('textarea[name="description"]');
          }
      });
      
      // NOTE: Form.initializeDirrity() will be called AFTER actions are populated
  },
  
  /**
   * Initialize dropdowns with clean data - V5.0 Architecture
   * Uses specialized classes with complete automation
   */
  initializeDropdownsWithCleanData(data) {
      // Audio message dropdown with playback controls - V5.0 complete automation
      SoundFileSelector.init('audio_message_id', {
          category: 'custom',
          includeEmpty: true,
          data: data
          // ❌ NO onChange needed - complete automation by base class
      });
      
      // Timeout extension dropdown with current extension exclusion - V5.0 specialized class
      
      ExtensionSelector.init('timeout_extension', {
          type: 'routing',
          excludeExtensions: [data.extension],
          includeEmpty: false,
          data: data
          // ❌ NO onChange needed - complete automation by base class
      });
      
      // Handle extension number changes - rebuild timeout extension dropdown with new exclusion
      ivrMenuModify.$number.off('change.timeout').on('change.timeout', () => {
          const newExtension = ivrMenuModify.$formObj.form('get value', 'extension');
          const currentValue = $('#timeout_extension').val();
          const currentText = $('#timeout_extension-dropdown').find('.text').text();
          
          if (newExtension) {
              // Remove old dropdown
              $('#timeout_extension-dropdown').remove();
              
              // Create new data object with current value
              const refreshData = {
                  timeout_extension: currentValue,
                  timeout_extension_represent: currentText
              };
              
              // Rebuild with new exclusion
              ExtensionSelector.init('timeout_extension', {
                  type: 'routing',
                  excludeExtensions: [newExtension],
                  includeEmpty: false,
                  data: refreshData
                  // ❌ NO onChange needed - complete automation
              });
          }
      });
  },

  /**
   * Initialize tooltips for form fields
   */
  initializeTooltips() {
      // Configuration for each field tooltip - using proper translation keys from Route.php
      const tooltipConfigs = {
          number_of_repeat: {
              header: globalTranslate.iv_NumberOfRepeatTooltip_header,
              description: globalTranslate.iv_NumberOfRepeatTooltip_desc,
              note: globalTranslate.iv_NumberOfRepeatTooltip_note
          },
          
          timeout: {
              header: globalTranslate.iv_TimeoutTooltip_header,
              description: globalTranslate.iv_TimeoutTooltip_desc,
              list: [
                  globalTranslate.iv_TimeoutTooltip_list1,
                  globalTranslate.iv_TimeoutTooltip_list2,
                  globalTranslate.iv_TimeoutTooltip_list3
              ],
              note: globalTranslate.iv_TimeoutTooltip_note
          },
          
          timeout_extension: {
              header: globalTranslate.iv_TimeoutExtensionTooltip_header,
              description: globalTranslate.iv_TimeoutExtensionTooltip_desc,
              list: [
                  globalTranslate.iv_TimeoutExtensionTooltip_list1,
                  globalTranslate.iv_TimeoutExtensionTooltip_list2,
                  globalTranslate.iv_TimeoutExtensionTooltip_list3
              ],
              note: globalTranslate.iv_TimeoutExtensionTooltip_note
          },
          
          allow_enter_any_internal_extension: {
              header: globalTranslate.iv_AllowEnterAnyInternalExtensionTooltip_header,
              description: globalTranslate.iv_AllowEnterAnyInternalExtensionTooltip_desc,
              list: [
                  {
                      term: globalTranslate.iv_AllowEnterAnyInternalExtensionTooltip_list_header,
                      definition: null
                  },
                  globalTranslate.iv_AllowEnterAnyInternalExtensionTooltip_list1,
                  globalTranslate.iv_AllowEnterAnyInternalExtensionTooltip_list2,
                  globalTranslate.iv_AllowEnterAnyInternalExtensionTooltip_list3,
                  globalTranslate.iv_AllowEnterAnyInternalExtensionTooltip_list4
              ],
              note: globalTranslate.iv_AllowEnterAnyInternalExtensionTooltip_note
          },
          
          extension: {
              header: globalTranslate.iv_ExtensionTooltip_header,
              description: globalTranslate.iv_ExtensionTooltip_desc,
              note: globalTranslate.iv_ExtensionTooltip_note
          },
          
          audio_message_id: {
              header: globalTranslate.iv_AudioMessageIdTooltip_header,
              description: globalTranslate.iv_AudioMessageIdTooltip_desc,
              list: [
                  {
                      term: globalTranslate.iv_AudioMessageIdTooltip_content_header,
                      definition: null
                  },
                  globalTranslate.iv_AudioMessageIdTooltip_content1,
                  globalTranslate.iv_AudioMessageIdTooltip_content2,
                  globalTranslate.iv_AudioMessageIdTooltip_content3
              ],
              list2: [
                  {
                      term: globalTranslate.iv_AudioMessageIdTooltip_recommendations_header,
                      definition: null
                  },
                  globalTranslate.iv_AudioMessageIdTooltip_rec1,
                  globalTranslate.iv_AudioMessageIdTooltip_rec2,
                  globalTranslate.iv_AudioMessageIdTooltip_rec3
              ],
              note: globalTranslate.iv_AudioMessageIdTooltip_note
          }
      };

      // Use TooltipBuilder to initialize tooltips
      TooltipBuilder.initialize(tooltipConfigs);
  }
};

/**
* Checks if the number is taken by another account
* @returns {boolean} True if the parameter has the 'hidden' class, false otherwise
*/
$.fn.form.settings.rules.existRule = (value, parameter) => $(`#${parameter}`).hasClass('hidden');

/**
 * Custom form rule to check for duplicate digits values.
 * @param {string} value - The value to check for duplicates.
 * @returns {boolean} - True if there are no duplicates, false otherwise.
 */
$.fn.form.settings.rules.checkDoublesDigits = (value) => {
    let count = 0;
    $("input[id^='digits']").each((index, obj) => {
        if (ivrMenuModify.$formObj.form('get value', `${obj.id}`) === value) count += 1;
    });

    return (count === 1);
};


/**
*  Initialize IVR menu modify form on document ready
*/
$(document).ready(() => {
  ivrMenuModify.initialize();
});
