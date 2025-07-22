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

/* global globalRootUrl, globalTranslate, Extensions,Form, SoundFilesSelector */


/**
 * callQueue module.
 * @module callQueue
 */
const callQueue = {

    // Default extension number
    defaultExtension: '',

    // The input field for the extension number
    $extension: $('#extension'),

    // List of available members for this call queue
    AvailableMembersList: [],

    /**
     * jQuery object for the form.
     * @type {jQuery}
     */
    $formObj: $('#queue-form'),

    // The accordion UI components in the form
    $accordions: $('#queue-form .ui.accordion'),

    // The dropdown UI components in the form
    $dropDowns: $('#queue-form .dropdown'),

    // The field for form error messages
    $errorMessages: $('#form-error-messages'),

    // The checkbox UI components in the form
    $checkBoxes: $('#queue-form .checkbox'),

    // The select for forwarding in the form
    forwardingSelect: '#queue-form .forwarding-select',

    // The button to delete a row
    $deleteRowButton: $('.delete-row-button'),

    // The dropdown for periodic announce sound selection
    $periodicAnnounceDropdown: $('#queue-form .periodic-announce-sound-id-select'),

    // The row of the member
    memberRow: '#queue-form .member-row',

    // The dropdown for extension selection
    $extensionSelectDropdown: $('#extensionselect'),

    // The table of extensions
    $extensionsTable: $('#extensionsTable'),

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
     * Initialize the call queue form
     */
    initialize() {
        // Get phone extensions and set available queue members
        Extensions.getPhoneExtensions(callQueue.setAvailableQueueMembers);

        // Initialize UI components
        callQueue.$accordions.accordion();
        callQueue.$dropDowns.dropdown();
        callQueue.$checkBoxes.checkbox();

        // Set up periodic announce dropdown behaviour
        callQueue.$periodicAnnounceDropdown.dropdown({
            onChange(value) {
                if (parseInt(value, 10) === -1) {
                    callQueue.$periodicAnnounceDropdown.dropdown('clear');
                }
            },
        });

        // Initialize forwarding select
        $(callQueue.forwardingSelect).dropdown(Extensions.getDropdownSettingsWithEmpty());

        // Set up dynamic availability check for extension number
        callQueue.$extension.on('change', () => {
            const newNumber = callQueue.$formObj.form('get value', 'extension');
            Extensions.checkAvailability(callQueue.defaultNumber, newNumber);
        });

        // Initialize drag and drop for extension table rows
        callQueue.initializeDragAndDropExtensionTableRows();

        // Set up row deletion from queue members table
        callQueue.$deleteRowButton.on('click', (e) => {
            e.preventDefault();
            $(e.target).closest('tr').remove();
            callQueue.reinitializeExtensionSelect();
            callQueue.updateExtensionTableView();
            Form.dataChanged();

            return false;
        });

        // Initialize audio message select
        $('#queue-form .audio-message-select').dropdown(SoundFilesSelector.getDropdownSettingsWithEmpty());

        // Initialize the form
        callQueue.initializeForm();
        
        // Initialize tooltips for advanced settings
        callQueue.initializeTooltips();

        // Set the default extension number
        callQueue.defaultExtension = callQueue.$formObj.form('get value','extension');
    },

    /**
     * Set available members for the call queue
     * @param {Object} arrResult - The list of available members
     */
    setAvailableQueueMembers(arrResult) {
        // Loop through the result and populate AvailableMembersList
        $.each(arrResult.results, (index, extension) => {
            callQueue.AvailableMembersList.push({
                number: extension.value,
                callerid: extension.name,
            });
        });

        // Reinitialize the extension select and update the view
        callQueue.reinitializeExtensionSelect();
        callQueue.updateExtensionTableView();
    },

    /**
     * Return the list of available members for the queue
     * @returns {Array} - The list of available members
     */
    getAvailableQueueMembers() {
        const result = [];

        // Loop through available members and add to result if not already selected
        callQueue.AvailableMembersList.forEach((member) => {
            if ($(`.member-row#${member.number}`).length === 0) {
                result.push({
                    name: member.callerid,
                    value: member.number,
                });
            }
        });
        // result.sort((a, b) => ((a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0)));
        return result;
    },

    /**
     * Reinitialize extension select with consideration for already selected members
     */
    reinitializeExtensionSelect() {
        // Setup dropdown with available queue members
        callQueue.$extensionSelectDropdown.dropdown({
            action: 'hide',
            forceSelection: false,
            onChange(value, text) {
                // If a value is selected
                if (value) {
                    // Get the last template row, clone it and populate with the selected member data
                    const $tr = $('.member-row-tpl').last();
                    const $clone = $tr.clone(true);
                    $clone
                        .removeClass('member-row-tpl')
                        .addClass('member-row')
                        .show();
                    $clone.attr('id', value);
                    $clone.find('.number').html(value);
                    $clone.find('.callerid').html(text);

                    // Insert the new member row into the table
                    if ($(callQueue.memberRow).last().length === 0) {
                        $tr.after($clone);
                    } else {
                        $(callQueue.memberRow).last().after($clone);
                    }

                    // Reinitialize the extension select and update the view
                    callQueue.reinitializeExtensionSelect();
                    callQueue.updateExtensionTableView();

                    Form.dataChanged();
                }
            },
            // Set the values for the dropdown
            values: callQueue.getAvailableQueueMembers(),

        });
    },

    /**
     * Initialize Drag and Drop functionality for the extension table rows
     */
    initializeDragAndDropExtensionTableRows() {
        callQueue.$extensionsTable.tableDnD({
            onDragClass: 'hoveringRow',  // CSS class to be applied while a row is being dragged
            dragHandle: '.dragHandle',  // Class of the handler to initiate the drag action
            onDrop: () => { // Callback to be executed after a row has been dropped
                // Trigger change event to acknowledge the modification
                Form.dataChanged();
            },
        });
    },

    /**
     * Display a placeholder if the table has zero rows
     */
    updateExtensionTableView() {
        // Placeholder to be displayed
        const dummy = `<tr class="dummy"><td colspan="4" class="center aligned">${globalTranslate.cq_AddQueueMembers}</td></tr>`;

        if ($(callQueue.memberRow).length === 0) {
            $('#extensionsTable tbody').append(dummy); // Add the placeholder if there are no rows
        } else {
            $('#extensionsTable tbody .dummy').remove(); // Remove the placeholder if rows are present
        }
    },

    /**
     * Callback function to be called before the form is sent
     * @param {Object} settings - The current settings of the form
     * @returns {Object} - The updated settings of the form
     */
    cbBeforeSendForm(settings) {
        let result = settings;

        // Retrieve form values
        result.data = callQueue.$formObj.form('get values');

        const arrMembers = [];

        // Iterate through each member row and add to arrMembers
        $(callQueue.memberRow).each((index, obj) => {
            if ($(obj).attr('id')) {
                arrMembers.push({
                    number: $(obj).attr('id'),
                    priority: index,
                });
            }
        });

        // Validate if any members exist
        if (arrMembers.length === 0) {
            result = false;
            callQueue.$errorMessages.html(globalTranslate.cq_ValidateNoExtensions);
            callQueue.$formObj.addClass('error');
        } else {
            result.data.members = JSON.stringify(arrMembers);
        }

        return result;
    },

    /**
     * Callback function to be called after the form has been sent.
     * @param {Object} response - The response from the server after the form is sent
     */
    cbAfterSendForm(response) {
        callQueue.defaultNumber = callQueue.$formObj.form('get value','extension');
    },

    /**
     * Build HTML content for tooltip popup
     * @param {Object} config - Configuration object for tooltip content
     * @returns {string} - HTML string for tooltip content
     */
    buildTooltipContent(config) {
        if (!config) return '';
        
        let html = '';
        
        // Add header if exists
        if (config.header) {
            html += `<div class="header"><strong>${config.header}</strong></div>`;
            html += '<div class="ui divider"></div>';
        }
        
        // Add description if exists
        if (config.description) {
            html += `<p>${config.description}</p>`;
        }
        
        // Add list items if exist
        if (config.list) {
            if (Array.isArray(config.list) && config.list.length > 0) {
                html += '<ul>';
                config.list.forEach(item => {
                    if (typeof item === 'string') {
                        html += `<li>${item}</li>`;
                    } else if (item.term && item.definition === null) {
                        // Header item without definition
                        html += `</ul><p><strong>${item.term}</strong></p><ul>`;
                    } else if (item.term && item.definition) {
                        html += `<li><strong>${item.term}:</strong> ${item.definition}</li>`;
                    }
                });
                html += '</ul>';
            } else if (typeof config.list === 'object') {
                // Old format - object with key-value pairs
                html += '<ul>';
                Object.entries(config.list).forEach(([term, definition]) => {
                    html += `<li><strong>${term}:</strong> ${definition}</li>`;
                });
                html += '</ul>';
            }
        }
        
        // Add additional lists (list2, list3, etc.)
        for (let i = 2; i <= 10; i++) {
            const listName = `list${i}`;
            if (config[listName] && config[listName].length > 0) {
                html += '<ul>';
                config[listName].forEach(item => {
                    if (typeof item === 'string') {
                        html += `<li>${item}</li>`;
                    } else if (item.term && item.definition === null) {
                        html += `</ul><p><strong>${item.term}</strong></p><ul>`;
                    } else if (item.term && item.definition) {
                        html += `<li><strong>${item.term}:</strong> ${item.definition}</li>`;
                    }
                });
                html += '</ul>';
            }
        }
        
        // Add warning if exists
        if (config.warning) {
            html += '<div class="ui small orange message">';
            if (config.warning.header) {
                html += `<div class="header">`;
                html += `<i class="exclamation triangle icon"></i> `;
                html += config.warning.header;
                html += `</div>`;
            }
            html += config.warning.text;
            html += '</div>';
        }
        
        // Add code examples if exist
        if (config.examples && config.examples.length > 0) {
            if (config.examplesHeader) {
                html += `<p><strong>${config.examplesHeader}:</strong></p>`;
            }
            html += '<div class="ui segment" style="background-color: #f8f8f8; border: 1px solid #e0e0e0;">';
            html += '<pre style="margin: 0; font-size: 0.9em; line-height: 1.4em;">';
            
            // Process examples with syntax highlighting for sections
            config.examples.forEach((line, index) => {
                if (line.trim().startsWith('[') && line.trim().endsWith(']')) {
                    // Section header
                    if (index > 0) html += '\n';
                    html += `<span style="color: #0084b4; font-weight: bold;">${line}</span>`;
                } else if (line.includes('=')) {
                    // Parameter line
                    const [param, value] = line.split('=', 2);
                    html += `\n<span style="color: #7a3e9d;">${param}</span>=<span style="color: #cf4a4c;">${value}</span>`;
                } else {
                    // Regular line
                    html += line ? `\n${line}` : '';
                }
            });
            
            html += '</pre>';
            html += '</div>';
        }
        
        // Add note if exists
        if (config.note) {
            html += `<p class="ui small"><i class="info circle icon"></i> ${config.note}</p>`;
        }
        
        return html;
    },

    /**
     * Initialize tooltips for form fields
     */
    initializeTooltips() {
        // Define tooltip configurations for each field
        const tooltipConfigs = {
            callerid_prefix: callQueue.buildTooltipContent({
                header: globalTranslate.cq_CallerIDPrefixTooltip_header,
                description: globalTranslate.cq_CallerIDPrefixTooltip_desc,
                list: [
                    {
                        term: globalTranslate.cq_CallerIDPrefixTooltip_how_it_works,
                        definition: null
                    },
                    globalTranslate.cq_CallerIDPrefixTooltip_example,
                    {
                        term: globalTranslate.cq_CallerIDPrefixTooltip_purposes,
                        definition: null
                    },
                    globalTranslate.cq_CallerIDPrefixTooltip_purpose_identify,
                    globalTranslate.cq_CallerIDPrefixTooltip_purpose_priority,
                    globalTranslate.cq_CallerIDPrefixTooltip_purpose_stats
                ],
                examplesHeader: globalTranslate.cq_CallerIDPrefixTooltip_examples_header,
                examples: globalTranslate.cq_CallerIDPrefixTooltip_examples 
                    ? globalTranslate.cq_CallerIDPrefixTooltip_examples.split('|') 
                    : [],
                note: globalTranslate.cq_CallerIDPrefixTooltip_note
            }),
            
            seconds_to_ring_each_member: callQueue.buildTooltipContent({
                header: globalTranslate.cq_SecondsToRingEachMemberTooltip_header,
                description: globalTranslate.cq_SecondsToRingEachMemberTooltip_desc,
                list: [
                    {
                        term: globalTranslate.cq_SecondsToRingEachMemberTooltip_strategies_header,
                        definition: null
                    },
                    {
                        term: globalTranslate.cq_SecondsToRingEachMemberTooltip_ringall,
                        definition: globalTranslate.cq_SecondsToRingEachMemberTooltip_ringall_desc
                    },
                    {
                        term: globalTranslate.cq_SecondsToRingEachMemberTooltip_linear,
                        definition: globalTranslate.cq_SecondsToRingEachMemberTooltip_linear_desc
                    },
                    {
                        term: globalTranslate.cq_SecondsToRingEachMemberTooltip_recommendations_header,
                        definition: null
                    },
                    globalTranslate.cq_SecondsToRingEachMemberTooltip_rec_short,
                    globalTranslate.cq_SecondsToRingEachMemberTooltip_rec_medium,
                    globalTranslate.cq_SecondsToRingEachMemberTooltip_rec_long
                ],
                note: globalTranslate.cq_SecondsToRingEachMemberTooltip_note
            }),
            
            seconds_for_wrapup: callQueue.buildTooltipContent({
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
                    globalTranslate.cq_SecondsForWrapupTooltip_purpose_break,
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
            })
        };
        
        // Initialize tooltip for each field info icon
        $('.field-info-icon').each((index, element) => {
            const $icon = $(element);
            const fieldName = $icon.data('field');
            const content = tooltipConfigs[fieldName];
            
            if (content) {
                $icon.popup({
                    html: content,
                    position: 'top right',
                    hoverable: true,
                    delay: {
                        show: 300,
                        hide: 100
                    },
                    variation: 'flowing'
                });
            }
        });
    },

    /**
     * Initialize the form with custom settings
     */
    initializeForm() {
        Form.$formObj = callQueue.$formObj;
        Form.url = `${globalRootUrl}call-queues/save`;  // Form submission URL
        Form.validateRules = callQueue.validateRules; // Form validation rules
        Form.cbBeforeSendForm = callQueue.cbBeforeSendForm;  // Callback before form is sent
        Form.cbAfterSendForm = callQueue.cbAfterSendForm;  // Callback after form is sent
        Form.initialize();
    },
};

/**
 * Checks if the number is taken by another account
 * @returns {boolean} True if the parameter has the 'hidden' class, false otherwise
 */
$.fn.form.settings.rules.existRule = (value, parameter) => $(`#${parameter}`).hasClass('hidden');


/**
 *  Initialize Call Queues modify form on document ready
 */
$(document).ready(() => {
    callQueue.initialize();
});

