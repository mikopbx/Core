/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, globalTranslate, CallQueuesAPI, Extensions, Form, SoundFilesSelector, UserMessage, SecurityUtils */

/**
 * Modern Call Queue Form Management Module
 * 
 * Implements REST API v2 integration with hidden input pattern,
 * following MikoPBX standards for secure form handling.
 * 
 * Features:
 * - REST API integration using CallQueuesAPI
 * - Hidden input pattern for dropdown values
 * - XSS protection with SecurityUtils
 * - Drag-and-drop members table management
 * - Extension exclusion for timeout dropdown
 * - No success messages following MikoPBX patterns
 * 
 * @module callQueueModifyRest
 */
const callQueueModifyRest = {
    /**
     * Form jQuery object
     * @type {jQuery}
     */
    $formObj: $('#queue-form'),

    /**
     * Extension number input field
     * @type {jQuery}
     */
    $extension: $('#extension'),

    /**
     * Members table for drag-and-drop management
     * @type {jQuery}
     */
    $extensionsTable: $('#extensionsTable'),

    /**
     * Dropdown UI components
     * @type {jQuery}
     */
    $dropDowns: $('#queue-form .dropdown'),

    /**
     * Accordion UI components
     * @type {jQuery}
     */
    $accordions: $('#queue-form .ui.accordion'),

    /**
     * Checkbox UI components
     * @type {jQuery}
     */
    $checkBoxes: $('#queue-form .checkbox'),

    /**
     * Error messages container
     * @type {jQuery}
     */
    $errorMessages: $('#form-error-messages'),

    /**
     * Delete row buttons
     * @type {jQuery}
     */
    $deleteRowButton: $('.delete-row-button'),

    /**
     * Extension select dropdown for adding members
     * @type {jQuery}
     */
    $extensionSelectDropdown: $('#extensionselect'),

    /**
     * Available members list for queue management
     * @type {Array}
     */
    availableMembersList: [],

    /**
     * Default extension number for availability checking
     * @type {string}
     */
    defaultExtension: '',

    /**
     * Flag to prevent change tracking during form initialization
     * @type {boolean}
     */
    isFormInitializing: false,

    /**
     * Member row selector
     * @type {string}
     */
    memberRow: '#queue-form .member-row',

    /**
     * Validation rules for form fields
     * @type {Object}
     */
    validateRules: {
        name: {
            identifier: 'name',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.cq_ValidateNameEmpty,
                },
            ],
        },
        extension: {
            identifier: 'extension',
            rules: [
                {
                    type: 'number',
                    prompt: globalTranslate.cq_ValidateExtensionNumber,
                },
                {
                    type: 'empty',
                    prompt: globalTranslate.cq_ValidateExtensionEmpty,
                },
                {
                    type: 'existRule[extension-error]',
                    prompt: globalTranslate.cq_ValidateExtensionDouble,
                },
            ],
        },
    },

    /**
     * Initialize the call queue form management module
     */
    initialize() {
        // Initialize UI components
        callQueueModifyRest.initializeUIComponents();
        
        // Initialize dropdowns with hidden input pattern
        callQueueModifyRest.initializeDropdowns();
        
        // Initialize members table with drag-and-drop
        callQueueModifyRest.initializeMembersTable();
        
        // Set up extension availability checking
        callQueueModifyRest.initializeExtensionChecking();
        
        // Initialize sound file selectors
        callQueueModifyRest.initializeSoundSelectors();
        
        // Setup auto-resize for description textarea
        callQueueModifyRest.initializeDescriptionTextarea();
        
        // Load form data via REST API
        callQueueModifyRest.loadFormData();
        
        // Initialize form with REST API settings
        callQueueModifyRest.initializeForm();
    },

    /**
     * Initialize basic UI components
     */
    initializeUIComponents() {
        // Initialize Semantic UI components
        callQueueModifyRest.$accordions.accordion();
        callQueueModifyRest.$checkBoxes.checkbox();
        
        // Initialize basic dropdowns (non-extension ones)
        callQueueModifyRest.$dropDowns.not('.forwarding-select').not('.extension-select').dropdown();
    },

    /**
     * Initialize dropdowns with hidden input pattern following IVR Menu approach
     */
    initializeDropdowns() {
        // Initialize timeout extension dropdown with exclusion
        callQueueModifyRest.initializeTimeoutExtensionDropdown();
        
        // Initialize redirect_to_extension_if_empty dropdown
        callQueueModifyRest.initializeExtensionDropdown('redirect_to_extension_if_empty');
        
        // Initialize other general forwarding dropdowns
        $('.queue-form .forwarding-select').not('.timeout_extension-select').not('.redirect_to_extension_if_empty-select').dropdown(Extensions.getDropdownSettingsWithEmpty((value) => {
            // Update corresponding hidden input when dropdown changes
            const $dropdown = $(this);
            const fieldName = $dropdown.data('field');
            if (fieldName) {
                $(`input[name="${fieldName}"]`).val(value);
                if (!callQueueModifyRest.isFormInitializing) {
                    $(`input[name="${fieldName}"]`).trigger('change');
                    Form.dataChanged();
                }
            }
        }));
    },

    /**
     * Initialize timeout extension dropdown with current extension exclusion
     */
    initializeTimeoutExtensionDropdown() {
        // Get current extension to exclude from timeout dropdown
        const getCurrentExtension = () => {
            return callQueueModifyRest.$formObj.form('get value', 'extension') || callQueueModifyRest.defaultExtension;
        };
        
        // Initialize dropdown with exclusion
        const initDropdown = () => {
            const currentExtension = getCurrentExtension();
            const excludeExtensions = currentExtension ? [currentExtension] : [];
            
            $('.timeout_extension-select').dropdown(Extensions.getDropdownSettingsForRoutingWithExclusion((value) => {
                // Update hidden input when dropdown changes
                $('input[name="timeout_extension"]').val(value);
                
                // Trigger change event only if not initializing
                if (!callQueueModifyRest.isFormInitializing) {
                    $('input[name="timeout_extension"]').trigger('change');
                    Form.dataChanged();
                }
            }, excludeExtensions));
        };
        
        // Initialize dropdown
        initDropdown();
        
        // Re-initialize dropdown when extension number changes
        callQueueModifyRest.$extension.on('change', () => {
            // Small delay to ensure the value is updated
            setTimeout(() => {
                initDropdown();
            }, 100);
        });
    },

    /**
     * Initialize extension dropdown (universal method for different extension fields)
     * @param {string} fieldName - Name of the field (e.g., 'redirect_to_extension_if_empty')
     */
    initializeExtensionDropdown(fieldName) {
        $(`.${fieldName}-select`).dropdown(Extensions.getDropdownSettingsWithEmpty((value) => {
            // Update hidden input when dropdown changes
            $(`input[name="${fieldName}"]`).val(value);
            if (!callQueueModifyRest.isFormInitializing) {
                $(`input[name="${fieldName}"]`).trigger('change');
                Form.dataChanged();
            }
        }));
    },

    /**
     * Initialize members table with drag-and-drop functionality
     */
    initializeMembersTable() {
        // Initialize TableDnD for drag-and-drop (using jquery.tablednd.js)
        callQueueModifyRest.$extensionsTable.tableDnD({
            onDrop: function() {
                // Trigger form change notification
                if (!callQueueModifyRest.isFormInitializing) {
                    Form.dataChanged();
                }
                
                // Update member priorities based on new order (for backend processing)
                callQueueModifyRest.updateMemberPriorities();
            },
            dragHandle: '.dragHandle'
        });

        // Initialize extension selector for adding new members
        callQueueModifyRest.initializeExtensionSelector();
        
        // Set up delete button handlers
        callQueueModifyRest.initializeDeleteButtons();
    },

    /**
     * Initialize extension selector dropdown for adding members
     */
    initializeExtensionSelector() {
        // Get phone extensions for member selection
        Extensions.getPhoneExtensions(callQueueModifyRest.setAvailableQueueMembers);
    },

    /**
     * Set available members for the call queue
     * @param {Object} arrResult - The list of available members from Extensions API
     */
    setAvailableQueueMembers(arrResult) {
        // Clear existing list
        callQueueModifyRest.availableMembersList = [];
        
        // Populate available members list
        $.each(arrResult.results, (index, extension) => {
            callQueueModifyRest.availableMembersList.push({
                number: extension.value,
                callerid: extension.name,
            });
        });

        // Initialize member selection dropdown
        callQueueModifyRest.reinitializeExtensionSelect();
        callQueueModifyRest.updateMembersTableView();
    },

    /**
     * Get available queue members not already selected
     * @returns {Array} Available members for selection
     */
    getAvailableQueueMembers() {
        const result = [];

        // Filter out already selected members
        callQueueModifyRest.availableMembersList.forEach((member) => {
            if ($(`.member-row#${member.number}`).length === 0) {
                result.push({
                    name: member.callerid,
                    value: member.number,
                });
            }
        });
        
        return result;
    },

    /**
     * Reinitialize extension select dropdown with available members
     */
    reinitializeExtensionSelect() {
        callQueueModifyRest.$extensionSelectDropdown.dropdown({
            action: 'hide',
            forceSelection: false,
            onChange(value, text) {
                if (value) {
                    // Add selected member to table
                    callQueueModifyRest.addMemberToTable(value, text);
                    
                    // Clear dropdown selection
                    callQueueModifyRest.$extensionSelectDropdown.dropdown('clear');
                    
                    // Refresh available options
                    callQueueModifyRest.reinitializeExtensionSelect();
                    callQueueModifyRest.updateMembersTableView();
                    
                    if (!callQueueModifyRest.isFormInitializing) {
                        Form.dataChanged();
                    }
                }
            },
            values: callQueueModifyRest.getAvailableQueueMembers(),
        });
    },

    /**
     * Add a member to the members table
     * @param {string} extension - Extension number
     * @param {string} callerid - Caller ID/Name
     */
    addMemberToTable(extension, callerid) {
        // Get the template row and clone it
        const $template = $('.member-row-template').last();
        const $newRow = $template.clone(true);
        
        // Configure the new row
        $newRow
            .removeClass('member-row-template')
            .addClass('member-row')
            .attr('id', extension)
            .show();
        
        // SECURITY: Sanitize content to prevent XSS attacks while preserving safe icons
        const safeCallerid = SecurityUtils.sanitizeExtensionsApiContent(callerid);
        
        // Populate row data (only callerid, no separate number column)
        $newRow.find('.callerid').html(safeCallerid);
        
        // Add to table
        if ($(callQueueModifyRest.memberRow).length === 0) {
            $template.after($newRow);
        } else {
            $(callQueueModifyRest.memberRow).last().after($newRow);
        }
        
        // Update priorities (for backend processing, not displayed)
        callQueueModifyRest.updateMemberPriorities();
    },

    /**
     * Update member priorities based on table order (for backend processing)
     */
    updateMemberPriorities() {
        // Priorities are maintained for backend processing but not displayed in UI
        // The order in the table determines the priority when saving
        $(callQueueModifyRest.memberRow).each((index, row) => {
            // Store priority as data attribute for backend processing
            $(row).attr('data-priority', index + 1);
        });
    },

    /**
     * Initialize delete button handlers
     */
    initializeDeleteButtons() {
        // Use event delegation for dynamically added buttons
        callQueueModifyRest.$formObj.on('click', '.delete-row-button', (e) => {
            e.preventDefault();
            
            // Remove the row
            $(e.target).closest('tr').remove();
            
            // Update priorities and view
            callQueueModifyRest.updateMemberPriorities();
            callQueueModifyRest.reinitializeExtensionSelect();
            callQueueModifyRest.updateMembersTableView();
            
            if (!callQueueModifyRest.isFormInitializing) {
                Form.dataChanged();
            }
            
            return false;
        });
    },

    /**
     * Update members table view with placeholder if empty
     */
    updateMembersTableView() {
        const placeholder = `<tr class="placeholder-row"><td colspan="3" class="center aligned">${globalTranslate.cq_AddQueueMembers}</td></tr>`;

        if ($(callQueueModifyRest.memberRow).length === 0) {
            callQueueModifyRest.$extensionsTable.find('tbody .placeholder-row').remove();
            callQueueModifyRest.$extensionsTable.find('tbody').append(placeholder);
        } else {
            callQueueModifyRest.$extensionsTable.find('tbody .placeholder-row').remove();
        }
    },

    /**
     * Initialize extension availability checking
     */
    initializeExtensionChecking() {
        // Set up dynamic availability check for extension number
        let timeoutId;
        callQueueModifyRest.$extension.on('input', () => {
            // Clear previous timeout
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            
            // Set new timeout with delay
            timeoutId = setTimeout(() => {
                const newNumber = callQueueModifyRest.$formObj.form('get value', 'extension');
                Extensions.checkAvailability(callQueueModifyRest.defaultExtension, newNumber);
            }, 500);
        });
    },

    /**
     * Initialize sound file selectors
     */
    initializeSoundSelectors() {
        // Initialize periodic announce selector (matches IVR pattern)
        SoundFilesSelector.initializeWithIcons('periodic_announce_sound_id');
        
        // Initialize MOH sound selector (matches IVR pattern)
        SoundFilesSelector.initializeWithIcons('moh_sound_id');
    },

    /**
     * Initialize description textarea with auto-resize functionality
     */
    initializeDescriptionTextarea() {
        // Setup auto-resize for description textarea with event handlers
        $('textarea[name="description"]').on('input paste keyup', function() {
            FormElements.optimizeTextareaSize($(this));
        });
    },

    /**
     * Load form data via REST API
     */
    loadFormData() {
        const recordId = callQueueModifyRest.getRecordId();
        
        CallQueuesAPI.getRecord(recordId, (response) => {
            if (response.result) {
                callQueueModifyRest.populateForm(response.data);
                
                // Set default extension for availability checking
                callQueueModifyRest.defaultExtension = callQueueModifyRest.$formObj.form('get value', 'extension');
                
                // Populate members table
                callQueueModifyRest.populateMembersTable(response.data.members || []);
            } else {
                UserMessage.showError(response.messages?.error || 'Failed to load call queue data');
            }
        });
    },

    /**
     * Get record ID from URL
     * @returns {string} Record ID or empty string for new record
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
     * Populate form with data from REST API
     * @param {Object} data - Form data from API
     */
    populateForm(data) {
        // Set initialization flag to prevent change tracking
        callQueueModifyRest.isFormInitializing = true;

        // Populate form fields using Semantic UI form, but handle text fields manually to prevent double-escaping
        const dataForSemanticUI = {...data};
        
        // Remove text fields from Semantic UI processing to handle them manually
        const textFields = ['name', 'description', 'callerid_prefix'];
        textFields.forEach(field => {
            delete dataForSemanticUI[field];
        });
        
        // Populate non-text fields through Semantic UI
        Form.$formObj.form('set values', dataForSemanticUI);
        
        // Manually populate text fields directly - REST API now returns raw data
        textFields.forEach(fieldName => {
            if (data[fieldName] !== undefined) {
                const $field = $(`input[name="${fieldName}"], textarea[name="${fieldName}"]`);
                if ($field.length) {
                    // Use raw data from API - no decoding needed
                    $field.val(data[fieldName]);
                }
            }
        });

        // Handle extension-based dropdowns with representations (except timeout_extension)
        callQueueModifyRest.populateExtensionDropdowns(data);
        
        // Handle sound file dropdowns with representations
        callQueueModifyRest.populateSoundDropdowns(data);

        // Re-initialize timeout extension dropdown with current extension exclusion (after form values are set)
        callQueueModifyRest.initializeTimeoutExtensionDropdown();
        
        // Restore timeout extension dropdown AFTER re-initialization
        if (data.timeout_extension && data.timeout_extensionRepresent) {
            const currentExtension = data.extension || callQueueModifyRest.defaultExtension;
            
            // Only set if different from current extension (prevent circular reference)
            if (data.timeout_extension !== currentExtension) {
                callQueueModifyRest.populateExtensionDropdown('timeout_extension', data.timeout_extension, data.timeout_extensionRepresent);
            }
        }

        // Fix HTML entities in dropdown text after initialization for safe content
        // Note: This should be safe since we've already sanitized the content through SecurityUtils
        Extensions.fixDropdownHtmlEntities('#queue-form .forwarding-select .text, #queue-form .timeout_extension-select .text');

        // Update extension number in ribbon label
        if (data.extension) {
            $('#extension-display').text(data.extension);
        }

        // Auto-resize textarea after data is loaded
        FormElements.optimizeTextareaSize('textarea[name="description"]');
    },

    /**
     * Populate extension-based dropdowns with safe representations following IVR Menu approach
     * @param {Object} data - Form data containing extension representations
     */
    populateExtensionDropdowns(data) {
        // Handle extension dropdowns (excluding timeout_extension which is handled separately)
        const extensionFields = [
            'redirect_to_extension_if_empty',
            'redirect_to_extension_if_unanswered', 
            'redirect_to_extension_if_repeat_exceeded'
        ];
        
        extensionFields.forEach((fieldName) => {
            const value = data[fieldName];
            const represent = data[`${fieldName}Represent`];
            
            if (value && represent) {
                callQueueModifyRest.populateExtensionDropdown(fieldName, value, represent);
            }
        });
    },

    /**
     * Populate specific extension dropdown with value and representation following IVR Menu approach
     * @param {string} fieldName - Field name (e.g., 'timeout_extension')
     * @param {string} value - Extension value (e.g., '1111')  
     * @param {string} represent - Extension representation with HTML (e.g., '<i class="icon"></i> Name <1111>')
     */
    populateExtensionDropdown(fieldName, value, represent) {
        const $dropdown = $(`.${fieldName}-select`);
        
        if ($dropdown.length) {
            // SECURITY: Sanitize extension representation with XSS protection while preserving safe icons
            const safeText = SecurityUtils.sanitizeExtensionsApiContent(represent);
            
            // Set the value and update display text (following IVR Menu pattern)
            $dropdown.dropdown('set value', value);
            $dropdown.find('.text').removeClass('default').html(safeText);
            
            // Update hidden input without triggering change event during initialization
            $(`input[name="${fieldName}"]`).val(value);
        }
    },



    /**
     * Populate sound file dropdowns with safe representations
     * @param {Object} data - Form data containing sound file representations
     */
    populateSoundDropdowns(data) {
        // Handle periodic announce sound (matches IVR pattern)
        if (data.periodic_announce_sound_id && data.periodic_announce_sound_idRepresent) {
            SoundFilesSelector.setInitialValueWithIcon(
                'periodic_announce_sound_id',
                data.periodic_announce_sound_id,
                data.periodic_announce_sound_idRepresent
            );
        }
        
        // Handle MOH sound (matches IVR pattern)
        if (data.moh_sound_id && data.moh_sound_idRepresent) {
            SoundFilesSelector.setInitialValueWithIcon(
                'moh_sound_id',
                data.moh_sound_id,
                data.moh_sound_idRepresent
            );
        }
    },

    /**
     * Populate members table with queue members
     * @param {Array} members - Array of queue members
     */
    populateMembersTable(members) {
        // Clear existing members (except template)
        $('.member-row').remove();
        
        // Add each member to the table
        members.forEach((member) => {
            callQueueModifyRest.addMemberToTable(member.extension, member.represent || member.extension);
        });
        
        // Update table view and member selection
        callQueueModifyRest.updateMembersTableView();
        callQueueModifyRest.reinitializeExtensionSelect();
        
        // Re-initialize dirty checking AFTER all form data is populated
        if (Form.enableDirrity) {
            Form.initializeDirrity();
        }
        
        // Clear initialization flag
        callQueueModifyRest.isFormInitializing = false;
    },


    /**
     * Initialize form with REST API configuration
     */
    initializeForm() {
        // Configure Form.js for REST API
        Form.$formObj = callQueueModifyRest.$formObj;
        Form.url = '#'; // Not used with REST API
        Form.validateRules = callQueueModifyRest.validateRules;
        Form.cbBeforeSendForm = callQueueModifyRest.cbBeforeSendForm;
        Form.cbAfterSendForm = callQueueModifyRest.cbAfterSendForm;
        
        // Configure REST API settings
        Form.apiSettings.enabled = true;
        Form.apiSettings.apiObject = CallQueuesAPI;
        Form.apiSettings.saveMethod = 'saveRecord';
        
        // Set redirect URLs for save modes
        Form.afterSubmitIndexUrl = `${globalRootUrl}call-queues/index/`;
        Form.afterSubmitModifyUrl = `${globalRootUrl}call-queues/modify/`;
        
        // Initialize form with all features
        Form.initialize();
    },

    /**
     * Callback before form submission - prepare data for API
     * @param {Object} settings - Form submission settings
     * @returns {Object|false} Updated settings or false to prevent submission
     */
    cbBeforeSendForm(settings) {
        let result = settings;

        // Get form values (following IVR Menu pattern)
        result.data = callQueueModifyRest.$formObj.form('get values');

        // Explicitly collect checkbox values to ensure boolean true/false values are sent to API
        // This ensures unchecked checkboxes send false, not undefined
        const checkboxFields = [
            'recive_calls_while_on_a_call',
            'announce_position', 
            'announce_hold_time'
        ];
        
        checkboxFields.forEach((fieldName) => {
            const $checkbox = $(`.checkbox input[name="${fieldName}"]`);
            if ($checkbox.length) {
                result.data[fieldName] = $checkbox.closest('.checkbox').checkbox('is checked');
            }
        });

        // Collect members data with priorities (based on table order)
        const members = [];
        $(callQueueModifyRest.memberRow).each((index, row) => {
            const extension = $(row).attr('id');
            if (extension) {
                members.push({
                    extension: extension,
                    priority: index + 1,
                });
            }
        });

        // Validate that members exist
        if (members.length === 0) {
            result = false;
            callQueueModifyRest.$errorMessages.html(globalTranslate.cq_ValidateNoExtensions);
            callQueueModifyRest.$formObj.addClass('error');
            return result;
        }

        // Add members to form data
        result.data.members = members;

        return result;
    },

    /**
     * Callback after form submission
     * @param {Object} response - API response
     */
    cbAfterSendForm(response) {
        if (response.result) {
            // Update default extension for availability checking
            callQueueModifyRest.defaultExtension = callQueueModifyRest.$formObj.form('get value', 'extension');
            
            // Update form with response data if available
            if (response.data) {
                callQueueModifyRest.populateForm(response.data);
            }
            
            // Update URL for new records
            const currentId = $('#id').val();
            if (!currentId && response.data && response.data.uniqid) {
                const newUrl = window.location.href.replace(/modify\/?$/, `modify/${response.data.uniqid}`);
                window.history.pushState(null, '', newUrl);
            }
        }
    },
};

/**
 * Custom validation rule for extension availability
 * @param {string} value - Field value
 * @param {string} parameter - Parameter for the rule
 * @returns {boolean} True if valid, false otherwise
 */
$.fn.form.settings.rules.existRule = (value, parameter) => $(`#${parameter}`).hasClass('hidden');

/**
 * Initialize call queue modify form on document ready
 */
$(document).ready(() => {
    callQueueModifyRest.initialize();
});
