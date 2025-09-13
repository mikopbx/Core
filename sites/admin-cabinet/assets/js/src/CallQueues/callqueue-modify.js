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

/* global globalRootUrl, globalTranslate, CallQueuesAPI, Extensions, Form, SoundFileSelector, UserMessage, SecurityUtils, DynamicDropdownBuilder, ExtensionSelector, TooltipBuilder, FormElements */

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
     * Default extension number for availability checking
     * @type {string}
     */
    defaultExtension: '',


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
        // Initialize UI components first
        callQueueModifyRest.initializeUIComponents();
          
        // Initialize members table with drag-and-drop
        callQueueModifyRest.initializeMembersTable();
        
        // Set up extension availability checking
        callQueueModifyRest.initializeExtensionChecking();
        
        // Setup auto-resize for description textarea
        callQueueModifyRest.initializeDescriptionTextarea();
        
        // Initialize form with REST API settings (before loading data)
        callQueueModifyRest.initializeForm();
        
        // Initialize tooltips for form fields
        callQueueModifyRest.initializeTooltips();
        
        // Load form data via REST API (last, after all UI is initialized)
        callQueueModifyRest.loadFormData();
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
     * Initialize dropdowns with actual form data (called from populateForm)
     * @param {Object} data - Form data from API
     */
    initializeDropdownsWithData(data) {
        // Initialize strategy dropdown with current value
        if (!$('#strategy-dropdown').length) {
            callQueueModifyRest.initializeStrategyDropdown();
        }
        
        // Initialize timeout_extension dropdown with exclusion logic
        if (!$('#timeout_extension-dropdown').length) {
            const currentExtension = callQueueModifyRest.$formObj.form('get value', 'extension');
            const excludeExtensions = currentExtension ? [currentExtension] : [];
            
            ExtensionSelector.init('timeout_extension', {
                type: 'routing',
                excludeExtensions: excludeExtensions,
                includeEmpty: false,
                data: data
            });
        }
        
        // Initialize redirect_to_extension_if_empty dropdown
        if (!$('#redirect_to_extension_if_empty-dropdown').length) {
            ExtensionSelector.init('redirect_to_extension_if_empty', {
                type: 'routing',
                includeEmpty: false,
                data: data 
            });
        }
    },

    /**
     * Initialize strategy dropdown with queue strategy options
     */
    initializeStrategyDropdown() {
        // Define strategy options with translations
        const strategyOptions = [
            { value: 'ringall', text: globalTranslate.cq_ringall },
            { value: 'leastrecent', text: globalTranslate.cq_leastrecent },
            { value: 'fewestcalls', text: globalTranslate.cq_fewestcalls },
            { value: 'random', text: globalTranslate.cq_random },
            { value: 'rrmemory', text: globalTranslate.cq_rrmemory },
            { value: 'linear', text: globalTranslate.cq_linear }
        ];
        
        // Get current strategy value
        const currentStrategy = $('input[name="strategy"]').val();
        
        // Use new DynamicDropdownBuilder API
        DynamicDropdownBuilder.buildDropdown('strategy', { strategy: currentStrategy }, {
            staticOptions: strategyOptions,
            placeholder: globalTranslate.cq_SelectStrategy,
            onChange: (value) => {
                // Update hidden input when dropdown changes
                $('input[name="strategy"]').val(value);
                $('input[name="strategy"]').trigger('change');
                Form.dataChanged();
            }
        });
    },


    /**
     * Initialize members table with drag-and-drop functionality
     */
    initializeMembersTable() {
        // Initialize TableDnD for drag-and-drop (using jquery.tablednd.js)
        callQueueModifyRest.$extensionsTable.tableDnD({
            onDrop: function() {
                // Trigger form change notification
                Form.dataChanged();
                
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
        // Initialize member selection using ExtensionSelector
        ExtensionSelector.init('extensionselect', {
            type: 'phones',
            includeEmpty: false,
            onChange: (value, text) => {
                if (value) {
                    // Add selected member to table (with duplicate check)
                    const added = callQueueModifyRest.addMemberToTable(value, text);
                    
                    // Clear dropdown selection and refresh
                    $('#extensionselect-dropdown').dropdown('clear');
                    callQueueModifyRest.refreshMemberSelection();
                    
                    // Only trigger change if member was actually added
                    if (added !== false) {
                        Form.dataChanged();
                    }
                }
            }
        });
    },

    /**
     * Refresh member selection dropdown to exclude already selected members
     */
    refreshMemberSelection() {
        // Get currently selected members
        const selectedMembers = [];
        $(callQueueModifyRest.memberRow).each((index, row) => {
            selectedMembers.push($(row).attr('id'));
        });
        
        // Remove existing dropdown and recreate with new exclusions
        $('#extensionselect-dropdown').remove();
        ExtensionSelector.instances.delete('extensionselect'); // Clear cached instance
        
        // Rebuild dropdown with exclusion using ExtensionSelector
        ExtensionSelector.init('extensionselect', {
            type: 'phones',
            includeEmpty: false,
            excludeExtensions: selectedMembers,
            onChange: (value, text) => {
                if (value) {
                    // Add selected member to table (with duplicate check)
                    const added = callQueueModifyRest.addMemberToTable(value, text);
                    
                    // Clear dropdown selection and refresh
                    $('#extensionselect-dropdown').dropdown('clear');
                    callQueueModifyRest.refreshMemberSelection();
                    
                    // Only trigger change if member was actually added
                    if (added !== false) {
                        Form.dataChanged();
                    }
                }
            }
        });
        
        // Update table view
        callQueueModifyRest.updateMembersTableView();
    },

    /**
     * Add a member to the members table
     * @param {string} extension - Extension number
     * @param {string} callerid - Caller ID/Name or HTML representation with icons
     */
    addMemberToTable(extension, callerid) {
        // Check if member already exists
        if ($(callQueueModifyRest.memberRow + '#' + extension).length > 0) {
            console.warn(`Member ${extension} already exists in queue`);
            return false;
        }
        
        // Get the template row and clone it
        const $template = $('.member-row-template').last();
        const $newRow = $template.clone(true);
        
        // Configure the new row
        $newRow
            .removeClass('member-row-template')
            .addClass('member-row')
            .attr('id', extension)
            .show();
        
        // The callerid from API already contains safe HTML with icons
        // Use it directly since the API provides pre-sanitized content
        // This preserves icon markup like: <i class="icons"><i class="user outline icon"></i></i>
        $newRow.find('.callerid').html(callerid);
        
        // Add to table
        if ($(callQueueModifyRest.memberRow).length === 0) {
            $template.after($newRow);
        } else {
            $(callQueueModifyRest.memberRow).last().after($newRow);
        }
        
        // Update priorities (for backend processing, not displayed)
        callQueueModifyRest.updateMemberPriorities();
        
        return true;
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
            callQueueModifyRest.refreshMemberSelection();
            
            Form.dataChanged();
            
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
        // Set up dynamic availability check for extension number using modern validation
        let timeoutId;
        callQueueModifyRest.$extension.on('input', () => {
            // Clear previous timeout
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            
            // Set new timeout with delay
            timeoutId = setTimeout(() => {
                const newNumber = callQueueModifyRest.$formObj.form('get value', 'extension');
                callQueueModifyRest.checkExtensionAvailability(callQueueModifyRest.defaultExtension, newNumber);
                
                // Re-initialize timeout_extension dropdown with new exclusion
                const $dropdown = $('#timeout_extension-dropdown');
                if ($dropdown.length) {
                    const excludeExtensions = newNumber ? [newNumber] : [];
                    const currentData = {
                        timeout_extension: $('#timeout_extension').val(),
                        timeout_extension_represent: $dropdown.find('.text').html()
                    };
                    
                    // Remove old dropdown and re-initialize
                    $dropdown.remove();
                    ExtensionSelector.init('timeout_extension', {
                        type: 'routing',
                        excludeExtensions: excludeExtensions,
                        includeEmpty: false,
                        data: currentData
                    });
                }
            }, 500);
        });
    },

    /**
     * Check extension availability using REST API
     * @param {string} oldNumber - Original extension number
     * @param {string} newNumber - New extension number to check
     */
    checkExtensionAvailability(oldNumber, newNumber) {
        if (oldNumber === newNumber) {
            $('.ui.input.extension').parent().removeClass('error');
            $('#extension-error').addClass('hidden');
            return;
        }

        // Use CallQueuesAPI to check extension availability
        CallQueuesAPI.checkExtensionAvailability(newNumber, (response) => {
            if (response.result !== undefined) {
                if (response.result === false) {
                    // Extension is not available
                    $('.ui.input.extension').parent().addClass('error');
                    $('#extension-error').removeClass('hidden');
                } else {
                    // Extension is available
                    $('.ui.input.extension').parent().removeClass('error');
                    $('#extension-error').addClass('hidden');
                }
            }
        });
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
        const copyFromId = $('#copy-from-id').val();
        const urlParams = new URLSearchParams(window.location.search);
        const copyParam = urlParams.get('copy');
        
        let requestId = recordId;
        let isCopyMode = false;
        
        // Check for copy mode from URL parameter or hidden field
        if (copyParam || copyFromId) {
            requestId = copyParam || copyFromId;
            isCopyMode = true;
        }
        
        // Load record data from REST API
        // v3 API will automatically use :getDefault for new records
        CallQueuesAPI.getRecord(requestId, (response) => {
            if (response.result && response.data) {
                // Mark as new record if we don't have an ID
                if (!recordId || recordId === '') {
                    response.data._isNew = true;
                }
                
                callQueueModifyRest.populateForm(response.data);
                
                // Set default extension for availability checking
                if (isCopyMode || !recordId) {
                    // For new records or copies, use the new extension for validation
                    callQueueModifyRest.defaultExtension = '';
                } else {
                    // For existing records, use their original extension
                    callQueueModifyRest.defaultExtension = callQueueModifyRest.$formObj.form('get value', 'extension');
                }
                
                // Populate members table
                if (response.data.members) {
                    callQueueModifyRest.populateMembersTable(response.data.members);
                } else {
                    // Initialize empty member selection
                    callQueueModifyRest.refreshMemberSelection();
                }
                
                // Mark form as changed if in copy mode to enable save button
                if (isCopyMode) {
                    Form.dataChanged();
                }
                
                // Clear copy mode after successful load
                if (copyFromId) {
                    $('#copy-from-id').val('');
                }
            } else {
                // Show error - API must work
                const errorMessage = response.messages && response.messages.error ? 
                    response.messages.error.join(', ') : 
                    'Failed to load queue data';
                UserMessage.showError(SecurityUtils.escapeHtml(errorMessage));
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
        // Prepare data for Semantic UI (exclude manually handled fields)
        const dataForSemanticUI = {...data};
        const fieldsToHandleManually = [
            'name', 'description', 'callerid_prefix', 'strategy',
            'timeout_extension', 'redirect_to_extension_if_empty',
            'redirect_to_extension_if_unanswered', 'redirect_to_extension_if_repeat_exceeded'
        ];
        fieldsToHandleManually.forEach(field => {
            delete dataForSemanticUI[field];
        });

        // Use unified silent population approach
        Form.populateFormSilently(dataForSemanticUI, {
            beforePopulate: (formData) => {
                // Initialize dropdowns first with form data (only once)
                callQueueModifyRest.initializeDropdownsWithData(data);
            },
            afterPopulate: (formData) => {
                // Manually populate text fields directly - REST API now returns raw data
                const textFields = ['name', 'description', 'callerid_prefix'];
                textFields.forEach(fieldName => {
                    if (data[fieldName] !== undefined) {
                        const $field = $(`input[name="${fieldName}"], textarea[name="${fieldName}"]`);
                        if ($field.length) {
                            // Use raw data from API - no decoding needed
                            $field.val(data[fieldName]);
                        }
                    }
                });
                
                // Handle strategy dropdown - value will be set automatically by DynamicDropdownBuilder
                if (data.strategy) {
                    $('input[name="strategy"]').val(data.strategy);
                }

                // Handle extension-based dropdowns with representations (except timeout_extension)
                // Only populate if dropdowns exist (they were created in initializeDropdownsWithData)
                if ($('#timeout_extension-dropdown').length) {
                    callQueueModifyRest.populateExtensionDropdowns(data);
                }
                
                // Handle sound file dropdowns with representations
                callQueueModifyRest.populateSoundDropdowns(data);
                
                // Update extension number in ribbon label
                if (data.extension) {
                    $('#extension-display').text(data.extension);
                }

                // Auto-resize textarea after data is loaded
                FormElements.optimizeTextareaSize('textarea[name="description"]');
            }
        });
    },

    /**
     * Populate extension-based dropdowns using ExtensionSelector
     * @param {Object} data - Form data containing extension representations
     */
    populateExtensionDropdowns(data) {
        // ExtensionSelector handles value setting automatically when initialized with data
        // No manual manipulation needed - ExtensionSelector takes care of everything
    },



    /**
     * Initialize sound file dropdowns with data
     * @param {Object} data - Form data containing sound file representations
     */
    populateSoundDropdowns(data) {
        // Initialize periodic announce sound file selector with data
        SoundFileSelector.init('periodic_announce_sound_id', {
            category: 'custom',
            includeEmpty: true,
            data: data
            // onChange not needed - fully automated in base class
        });
        
        // Initialize MOH sound file selector with data
        SoundFileSelector.init('moh_sound_id', {
            category: 'moh',
            includeEmpty: true,
            data: data
            // onChange not needed - fully automated in base class
        });
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
        callQueueModifyRest.refreshMemberSelection();
        
        // Re-initialize dirty checking AFTER all form data is populated
        if (Form.enableDirrity) {
            Form.initializeDirrity();
        }
        
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
     * Initialize tooltips for form fields
     */
    initializeTooltips() {
        // Configuration for each field tooltip - using proper translation keys from Route.php
        const tooltipConfigs = {
            callerid_prefix: {
                header: globalTranslate.cq_CallerIDPrefixTooltip_header,
                description: globalTranslate.cq_CallerIDPrefixTooltip_desc,
                list: [
                    {
                        term: globalTranslate.cq_CallerIDPrefixTooltip_purposes,
                        definition: null
                    },
                    globalTranslate.cq_CallerIDPrefixTooltip_purpose_identify,
                    globalTranslate.cq_CallerIDPrefixTooltip_purpose_priority,
                    globalTranslate.cq_CallerIDPrefixTooltip_purpose_stats
                ],
                list2: [
                    {
                        term: globalTranslate.cq_CallerIDPrefixTooltip_how_it_works,
                        definition: null
                    },
                    globalTranslate.cq_CallerIDPrefixTooltip_example
                ],
                list3: [
                    {
                        term: globalTranslate.cq_CallerIDPrefixTooltip_examples_header,
                        definition: null
                    },
                    globalTranslate.cq_CallerIDPrefixTooltip_examples
                ],
                note: globalTranslate.cq_CallerIDPrefixTooltip_note
            },
            
            seconds_to_ring_each_member: {
                header: globalTranslate.cq_SecondsToRingEachMemberTooltip_header,
                description: globalTranslate.cq_SecondsToRingEachMemberTooltip_desc,
                list: [
                    {
                        term: globalTranslate.cq_SecondsToRingEachMemberTooltip_strategies_header,
                        definition: null
                    },
                    `${globalTranslate.cq_SecondsToRingEachMemberTooltip_linear} - ${globalTranslate.cq_SecondsToRingEachMemberTooltip_linear_desc}`,
                    `${globalTranslate.cq_SecondsToRingEachMemberTooltip_ringall} - ${globalTranslate.cq_SecondsToRingEachMemberTooltip_ringall_desc}`
                ],
                list2: [
                    {
                        term: globalTranslate.cq_SecondsToRingEachMemberTooltip_recommendations_header,
                        definition: null
                    },
                    globalTranslate.cq_SecondsToRingEachMemberTooltip_rec_short,
                    globalTranslate.cq_SecondsToRingEachMemberTooltip_rec_medium,
                    globalTranslate.cq_SecondsToRingEachMemberTooltip_rec_long
                ],
                note: globalTranslate.cq_SecondsToRingEachMemberTooltip_note
            },
            
            seconds_for_wrapup: {
                header: globalTranslate.cq_SecondsForWrapupTooltip_header,
                description: globalTranslate.cq_SecondsForWrapupTooltip_desc,
                list: [
                    {
                        term: globalTranslate.cq_SecondsForWrapupTooltip_purposes_header,
                        definition: null
                    },
                    globalTranslate.cq_SecondsForWrapupTooltip_purpose_notes,
                    globalTranslate.cq_SecondsForWrapupTooltip_purpose_crm,
                    globalTranslate.cq_SecondsForWrapupTooltip_purpose_prepare,
                    globalTranslate.cq_SecondsForWrapupTooltip_purpose_break
                ],
                list2: [
                    {
                        term: globalTranslate.cq_SecondsForWrapupTooltip_recommendations_header,
                        definition: null
                    },
                    globalTranslate.cq_SecondsForWrapupTooltip_rec_none,
                    globalTranslate.cq_SecondsForWrapupTooltip_rec_short,
                    globalTranslate.cq_SecondsForWrapupTooltip_rec_medium,
                    globalTranslate.cq_SecondsForWrapupTooltip_rec_long
                ],
                note: globalTranslate.cq_SecondsForWrapupTooltip_note
            }
        };
        
        // Use TooltipBuilder to initialize tooltips
        TooltipBuilder.initialize(tooltipConfigs);
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

        // Check if this is a new record and pass the flag to API
        const recordId = callQueueModifyRest.getRecordId();
        if (!recordId || recordId === '') {
            result.data._isNew = true;
        }

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
