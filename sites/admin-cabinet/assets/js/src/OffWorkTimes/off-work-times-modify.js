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

/* global $ globalRootUrl Extensions moment Form globalTranslate 
   SemanticLocalization SoundFileSelector UserMessage SecurityUtils
   IncomingRoutesAPI OffWorkTimesAPI DynamicDropdownBuilder ExtensionSelector */

/**
 * Module for managing out-of-work time settings
 * 
 * This module handles the form for creating and editing out-of-work time conditions.
 * It uses a unified REST API approach matching the incoming routes pattern.
 * 
 * @module outOfWorkTimeRecord
 */
const outOfWorkTimeRecord = {
    /**
     * jQuery object for the form.
     * @type {jQuery}
     */
    $formObj: $('#save-outoffwork-form'),

    /**
     * Record ID from URL
     * @type {string}
     */
    recordId: null, // Will be set in initialize()
    
    /**
     * Store loaded record data
     * @type {object|null}
     */
    recordData: null,

    // Form field jQuery objects
    $time_from: $('#time_from'),
    $time_to: $('#time_to'),
    $rulesTable: $('#routing-table'),
    
    // Hidden input fields
    $idField: $('#id'),
    $weekdayFromField: $('#weekday_from'),
    $weekdayToField: $('#weekday_to'),
    $actionField: $('#action'),
    $calTypeField: $('#calType'),
    $extensionField: $('#extension'),
    $allowRestrictionField: $('#allowRestriction'),
    $descriptionField: $('#description'),
    
    // Dropdown elements
    $actionDropdown: $('.action-select'),
    $calTypeDropdown: $('.calType-select'),
    $weekdayFromDropdown: $('.weekday-from-select'),
    $weekdayToDropdown: $('.weekday-to-select'),
    
    // Tab elements
    $tabMenu: $('#out-time-modify-menu .item'),
    $rulesTab: null, // Will be initialized later
    $generalTab: null, // Will be initialized later
    $rulesTabSegment: null, // Will be initialized later
    $generalTabSegment: null, // Will be initialized later
    
    // Row elements
    $extensionRow: $('#extension-row'),
    $audioMessageRow: $('#audio-message-row'),
    
    // Calendar tab elements
    $calendarTab: $('#call-type-calendar-tab'),
    $mainTab: $('#call-type-main-tab'),
    
    // Date/time calendar elements
    $rangeDaysStart: $('#range-days-start'),
    $rangeDaysEnd: $('#range-days-end'),
    $rangeTimeStart: $('#range-time-start'),
    $rangeTimeEnd: $('#range-time-end'),
    
    // Erase buttons
    $eraseDatesBtn: $('#erase-dates'),
    $eraseWeekdaysBtn: $('#erase-weekdays'),
    $eraseTimeperiodBtn: $('#erase-timeperiod'),
    
    // Error message element
    $errorMessage: $('.form .error.message'),
    
    // Audio message ID for sound file selector
    audioMessageId: 'audio_message_id',

    /**
     * Additional time interval validation rules
     * @type {array}
     */
    additionalTimeIntervalRules: [{
        type: 'regExp',
        value: /^([01]?[0-9]|2[0-3]):([0-5]?[0-9])$/,
        prompt: globalTranslate.tf_ValidateCheckTimeInterval,
    }],
    
    /**
     * Validation rules for the form
     * @type {object}
     */
    validateRules: {
        extension: {
            identifier: 'extension',
            rules: [
                {
                    type: 'customNotEmptyIfActionRule[extension]',
                    prompt: globalTranslate.tf_ValidateExtensionEmpty
                }
            ]
        },
        audio_message_id: {
            identifier: 'audio_message_id',
            rules: [
                {
                    type: 'customNotEmptyIfActionRule[playmessage]',
                    prompt: globalTranslate.tf_ValidateAudioMessageEmpty
                }
            ]
        },
        calUrl: {
            identifier: 'calUrl',
            rules: [
                {
                    type: 'customNotEmptyIfCalType',
                    prompt: globalTranslate.tf_ValidateCalUri
                }
            ]
        },
        timefrom: {
            optional: true,
            identifier: 'time_from',
            rules: [{
                type: 'regExp',
                value: /^([01]?[0-9]|2[0-3]):([0-5]?[0-9])$/,
                prompt: globalTranslate.tf_ValidateCheckTimeInterval,
            }]
        },
        timeto: {
            identifier: 'time_to',
            optional: true,
            rules: [{
                type: 'regExp',
                value: /^([01]?[0-9]|2[0-3]):([0-5]?[0-9])$/,
                prompt: globalTranslate.tf_ValidateCheckTimeInterval,
            }]
        }
    },

    /**
     * Initialize the module
     */
    initialize() {
        // Set record ID from DOM
        outOfWorkTimeRecord.recordId = outOfWorkTimeRecord.$idField.val();
        
        // Initialize tab references that depend on DOM
        outOfWorkTimeRecord.$rulesTab = $('#out-time-modify-menu .item[data-tab="rules"]');
        outOfWorkTimeRecord.$generalTab = $('#out-time-modify-menu .item[data-tab="general"]');
        outOfWorkTimeRecord.$rulesTabSegment = $('.ui.tab.segment[data-tab="rules"]');
        outOfWorkTimeRecord.$generalTabSegment = $('.ui.tab.segment[data-tab="general"]');
        
        // Initialize tabs
        outOfWorkTimeRecord.$tabMenu.tab();
        
        // Initialize form submission handling
        outOfWorkTimeRecord.initializeForm();
        
        // Initialize components that don't depend on data
        outOfWorkTimeRecord.initializeCalendars();
        outOfWorkTimeRecord.initializeRoutingTable();
        outOfWorkTimeRecord.initializeErasers();
        outOfWorkTimeRecord.initializeDescriptionField();
        outOfWorkTimeRecord.initializeTooltips();
        
        // Load data and initialize dropdowns
        // This unified approach loads defaults for new records or existing data
        outOfWorkTimeRecord.loadFormData();
    },
    
    /**
     * Load form data via REST API
     * Unified approach for both new and existing records
     */
    loadFormData() {
        // Show loading state
        outOfWorkTimeRecord.$formObj.addClass('loading');

        // Check if this is a copy operation
        const urlParams = new URLSearchParams(window.location.search);
        const copyId = urlParams.get('copy');

        if (copyId) {
            // Copy operation - use the new RESTful copy endpoint
            OffWorkTimesAPI.callCustomMethod('copy', {id: copyId}, (response) => {
                // Remove loading state
                outOfWorkTimeRecord.$formObj.removeClass('loading');

                if (response.result && response.data) {
                    // Success: populate form with copied data
                    outOfWorkTimeRecord.recordData = response.data;
                    outOfWorkTimeRecord.populateForm(response.data);

                    // Load routing rules
                    outOfWorkTimeRecord.loadRoutingTable();

                    // Mark as modified to enable save button
                    setTimeout(() => {
                        Form.dataChanged();
                    }, 250);
                } else {
                    // API error - show error message
                    if (response.messages && response.messages.error) {
                        const errorMessage = response.messages.error.join(', ');
                        UserMessage.showError(SecurityUtils.escapeHtml(errorMessage));
                    }
                }
            });
        } else {
            // Normal load - either existing record or new
            const recordIdToLoad = outOfWorkTimeRecord.recordId || '';

            // Load record data via REST API - always returns data (with defaults for new records)
            OffWorkTimesAPI.getRecord(recordIdToLoad, (response) => {
                // Remove loading state
                outOfWorkTimeRecord.$formObj.removeClass('loading');

                if (response.result && response.data) {
                    // Success: populate form with data (defaults for new, real data for existing)
                    outOfWorkTimeRecord.recordData = response.data;
                    outOfWorkTimeRecord.populateForm(response.data);

                    // Load routing rules
                    outOfWorkTimeRecord.loadRoutingTable();

                    // Save initial values to prevent save button activation
                    setTimeout(() => {
                        Form.saveInitialValues();
                        Form.checkValues();
                    }, 250);
                } else {
                    // API error - show error message
                    if (response.messages && response.messages.error) {
                        const errorMessage = response.messages.error.join(', ');
                        UserMessage.showError(SecurityUtils.escapeHtml(errorMessage));
                    }
                }
            });
        }
    },
    
    /**
     * Initialize all dropdowns for the form
     */
    initializeDropdowns() {
        // Initialize weekday dropdowns with values matching original implementation
        const weekDays = [
            { value: '-1', text: '-' } // Default empty option
        ];
        
        // Add days 1-7 using the same logic as original controller
        for (let i = 1; i <= 7; i++) {
            // Create date for "Sunday +i days" to match original logic
            const date = new Date(2020, 0, 5 + i); // Jan 5, 2020 was Sunday
            const dayName = date.toLocaleDateString('en', { weekday: 'short' });
            // Try to get translation for the day abbreviation
            const translatedDay = globalTranslate[dayName] || dayName;
            
            weekDays.push({
                name: translatedDay,
                value: i.toString(),
                text: translatedDay
            });
        }
        
        outOfWorkTimeRecord.$weekdayFromDropdown.dropdown({
            values: weekDays,
            onChange: (value) => {
                outOfWorkTimeRecord.$weekdayFromField.val(value);
                Form.dataChanged();
            }
        });
        
        outOfWorkTimeRecord.$weekdayToDropdown.dropdown({
            values: weekDays,
            onChange: (value) => {
                outOfWorkTimeRecord.$weekdayToField.val(value);
                Form.dataChanged();
            }
        });
        
        // Initialize action dropdown
        outOfWorkTimeRecord.$actionDropdown.dropdown({
            onChange: function(value) {
                outOfWorkTimeRecord.$actionField.val(value);
                outOfWorkTimeRecord.onActionChange();
            }
        });
        
        // Initialize calendar type dropdown
        outOfWorkTimeRecord.$calTypeDropdown.dropdown({
            onChange: function(value) {
                outOfWorkTimeRecord.$calTypeField.val(value);
                outOfWorkTimeRecord.onCalTypeChange();
            }
        });
        
        // Extension selector will be initialized in populateForm with API data
    },
    
    /**
     * Initialize sound file selector with API data
     * Single point of initialization after receiving data from API
     * @param {object} data - API response data (with defaults or existing values)
     */
    initializeSoundFileSelector(data) {
        // Initialize SoundFileSelector with complete API data context
        SoundFileSelector.init(outOfWorkTimeRecord.audioMessageId, {
            category: 'custom',
            includeEmpty: false,  // Out of work time must always have a sound file
            data: data // Pass complete API data for proper initialization
        });
        
        // If audio_message_id exists, set the value with representation
        if (data.audio_message_id && data.audio_message_id_represent) {
            SoundFileSelector.setValue(
                outOfWorkTimeRecord.audioMessageId, 
                data.audio_message_id, 
                data.audio_message_id_represent
            );
        }
    },
    
    /**
     * Initialize extension selector with API data
     * Single point of initialization after receiving data from API
     * @param {object} data - API response data (with defaults or existing values)
     */
    initializeExtensionSelector(data) {
        // Initialize ExtensionSelector following V5.0 pattern
        ExtensionSelector.init('extension', {
            type: 'routing',
            includeEmpty: true,
            data: data
        });
    },
    
    /**
     * Populate form with data
     * @param {object} data - Record data from API
     */
    populateForm(data) {
        // Check if this is a copy operation
        const urlParams = new URLSearchParams(window.location.search);
        const isCopy = urlParams.has('copy');
        
        // For copy operation, clear ID and priority
        if (isCopy) {
            data.id = '';
            data.priority = '';
        }
        
        // Use unified silent population approach
        Form.populateFormSilently({
            id: data.id,
            uniqid: data.uniqid,
            priority: data.priority,
            description: data.description,
            calType: data.calType,
            weekday_from: data.weekday_from,
            weekday_to: data.weekday_to,
            time_from: data.time_from,
            time_to: data.time_to,
            calUrl: data.calUrl,
            calUser: data.calUser,
            calSecret: data.calSecret,
            action: data.action,
            extension: data.extension,
            audio_message_id: data.audio_message_id,
            allowRestriction: data.allowRestriction
        }, {
            afterPopulate: (formData) => {
                // Handle password field placeholder
                const $calSecretField = $('#calSecret');
                if (data.calSecret === 'XXXXXX') {
                    // Password exists but is masked, show placeholder
                    $calSecretField.attr('placeholder', globalTranslate.tf_PasswordMasked);
                    // Store original masked state to detect changes
                    $calSecretField.data('originalMasked', true);
                } else {
                    $calSecretField.attr('placeholder', globalTranslate.tf_EnterPassword);
                    $calSecretField.data('originalMasked', false);
                }
                
                // Initialize dropdowns
                outOfWorkTimeRecord.initializeDropdowns();
                
                // Initialize sound file selector with API data (single point of initialization)
                outOfWorkTimeRecord.initializeSoundFileSelector(data);
                
                // Initialize extension selector with API data
                outOfWorkTimeRecord.initializeExtensionSelector(data);
                
                // Set dropdown values after initialization
                // Set action dropdown
                if (data.action) {
                    outOfWorkTimeRecord.$actionDropdown.dropdown('set selected', data.action);
                }
                
                // Set calType dropdown
                if (data.calType) {
                    outOfWorkTimeRecord.$calTypeDropdown.dropdown('set selected', data.calType);
                }
                
                // Set weekday dropdowns
                if (data.weekday_from) {
                    outOfWorkTimeRecord.$weekdayFromDropdown.dropdown('set selected', data.weekday_from);
                }
                if (data.weekday_to) {
                    outOfWorkTimeRecord.$weekdayToDropdown.dropdown('set selected', data.weekday_to);
                }
                
                // Set dates if present
                if (data.date_from) {
                    outOfWorkTimeRecord.setDateFromTimestamp(data.date_from, '#range-days-start');
                }
                if (data.date_to) {
                    outOfWorkTimeRecord.setDateFromTimestamp(data.date_to, '#range-days-end');
                }
                
                // Update field visibility based on action
                outOfWorkTimeRecord.onActionChange();
                
                // Update calendar type visibility
                outOfWorkTimeRecord.onCalTypeChange();
                
                // Set rules tab visibility based on allowRestriction
                outOfWorkTimeRecord.toggleRulesTab(data.allowRestriction);
                
                // Re-initialize dirty checking
                if (Form.enableDirrity) {
                    Form.initializeDirrity();
                }
            }
        });
    },
    
    /**
     * Handle action dropdown change
     */
    onActionChange() {
        const action = outOfWorkTimeRecord.$formObj.form('get value', 'action');
        
        if (action === 'extension') {
            // Show extension, hide audio
            outOfWorkTimeRecord.$extensionRow.show();
            outOfWorkTimeRecord.$audioMessageRow.hide();
            // Clear audio message
            SoundFileSelector.clear(outOfWorkTimeRecord.audioMessageId);
        } else if (action === 'playmessage') {
            // Show audio, hide extension
            outOfWorkTimeRecord.$extensionRow.hide();
            outOfWorkTimeRecord.$audioMessageRow.show();
            // Clear extension using ExtensionSelector
            ExtensionSelector.clear('extension');
            outOfWorkTimeRecord.$extensionField.val('');
        }
        
        Form.dataChanged();
    },
    
    /**
     * Handle calendar type change
     */
    onCalTypeChange() {
        const calType = outOfWorkTimeRecord.$formObj.form('get value', 'calType');
        
        // 'timeframe' and empty string mean time-based conditions (show main tab)
        if (!calType || calType === 'timeframe' || calType === '') {
            // Show main time/date configuration
            outOfWorkTimeRecord.$calendarTab.hide();
            outOfWorkTimeRecord.$mainTab.show();
        } else if (calType === 'CALDAV' || calType === 'ICAL') {
            // Show calendar URL configuration
            outOfWorkTimeRecord.$calendarTab.show();
            outOfWorkTimeRecord.$mainTab.hide();
        }
        
        Form.dataChanged();
    },
    
    /**
     * Initialize calendars for date and time selection
     */
    initializeCalendars() {
        // Date range calendars
        // Use class variables for calendars
        
        outOfWorkTimeRecord.$rangeDaysStart.calendar({
            firstDayOfWeek: SemanticLocalization.calendarFirstDayOfWeek,
            text: SemanticLocalization.calendarText,
            endCalendar: outOfWorkTimeRecord.$rangeDaysEnd,
            type: 'date',
            inline: false,
            monthFirst: false,
            regExp: SemanticLocalization.regExp,
            onChange: () => Form.dataChanged()
        });
        
        outOfWorkTimeRecord.$rangeDaysEnd.calendar({
            firstDayOfWeek: SemanticLocalization.calendarFirstDayOfWeek,
            text: SemanticLocalization.calendarText,
            startCalendar: outOfWorkTimeRecord.$rangeDaysStart,
            type: 'date',
            inline: false,
            monthFirst: false,
            regExp: SemanticLocalization.regExp,
            onChange: () => Form.dataChanged()
        });
        
        // Time range calendars
        // Use class variables for time calendars
        
        outOfWorkTimeRecord.$rangeTimeStart.calendar({
            firstDayOfWeek: SemanticLocalization.calendarFirstDayOfWeek,
            text: SemanticLocalization.calendarText,
            endCalendar: outOfWorkTimeRecord.$rangeTimeEnd,
            type: 'time',
            inline: false,
            disableMinute: false,
            monthFirst: false,
            ampm: false,
            regExp: SemanticLocalization.regExp,
            onChange: () => Form.dataChanged()
        });
        
        outOfWorkTimeRecord.$rangeTimeEnd.calendar({
            firstDayOfWeek: SemanticLocalization.calendarFirstDayOfWeek,
            text: SemanticLocalization.calendarText,
            startCalendar: outOfWorkTimeRecord.$rangeTimeStart,
            type: 'time',
            inline: false,
            monthFirst: false,
            ampm: false,
            regExp: SemanticLocalization.regExp,
            onChange: () => Form.dataChanged()
        });
    },
    
    /**
     * Initialize routing table and allowRestriction checkbox
     */
    initializeRoutingTable() {
        // Initialize allowRestriction checkbox
        outOfWorkTimeRecord.$allowRestrictionField.parent().checkbox({
            onChange: function() {
                const isChecked = outOfWorkTimeRecord.$allowRestrictionField.parent().checkbox('is checked');
                outOfWorkTimeRecord.toggleRulesTab(isChecked);
                Form.dataChanged();
            }
        });
        
        // Initialize existing checkboxes in table
        outOfWorkTimeRecord.$rulesTable.find('.ui.checkbox').checkbox({
            onChange: () => Form.dataChanged()
        });
    },
    
    /**
     * Toggle rules tab visibility
     * @param {boolean} isChecked - Whether to show rules tab
     */
    toggleRulesTab(isChecked) {
        
        if (isChecked) {
            outOfWorkTimeRecord.$rulesTab.show();
        } else {
            outOfWorkTimeRecord.$rulesTab.hide();
            // Switch to general tab if rules tab was active
            if (outOfWorkTimeRecord.$rulesTab.hasClass('active')) {
                outOfWorkTimeRecord.$rulesTab.removeClass('active');
                outOfWorkTimeRecord.$rulesTabSegment.removeClass('active');
                outOfWorkTimeRecord.$generalTab.addClass('active');
                outOfWorkTimeRecord.$generalTabSegment.addClass('active');
            }
        }
    },
    
    /**
     * Load routing table with incoming routes
     */
    loadRoutingTable() {
        // Clear table
        outOfWorkTimeRecord.$rulesTable.find('tbody').empty();
        
        // Get associated IDs from record data
        const associatedIds = outOfWorkTimeRecord.recordData?.incomingRouteIds || [];
        
        // Load all available routes from IncomingRoutesAPI
        IncomingRoutesAPI.getList((response) => {
            if (response.result && response.data) {
                // Group and sort routes
                const groupedRoutes = outOfWorkTimeRecord.groupAndSortRoutes(response.data);
                
                // Render grouped routes
                outOfWorkTimeRecord.renderGroupedRoutes(groupedRoutes, associatedIds);
                
                // Initialize UI components with grouped checkbox logic
                outOfWorkTimeRecord.initializeRoutingCheckboxes();
                outOfWorkTimeRecord.$rulesTable.find('[data-content]').popup();
            } else {
                outOfWorkTimeRecord.showEmptyRoutesMessage();
            }
        });
    },
    
    /**
     * Group and sort routes by provider and DID
     * @param {Array} routes - Array of route objects
     * @returns {Object} Grouped routes
     */
    groupAndSortRoutes(routes) {
        const groups = {};
        
        // Skip default route and group by provider
        routes.forEach((route) => {
            if (route.id === 1 || route.id === '1') return;
            
            const providerId = route.provider || 'none';
            if (!groups[providerId]) {
                // Extract plain text provider name from HTML if needed
                let providerName = route.providerid_represent || globalTranslate.ir_NoAssignedProvider;
                // Remove HTML tags to get clean provider name for display
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = providerName;
                const cleanProviderName = tempDiv.textContent || tempDiv.innerText || providerName;
                
                groups[providerId] = {
                    providerId: providerId,  // Store actual provider ID
                    providerName: cleanProviderName,  // Clean name for display
                    providerNameHtml: route.providerid_represent || providerName,  // Original HTML if needed
                    providerDisabled: route.providerDisabled || false,
                    generalRules: [],
                    specificRules: {}
                };
            }
            
            // Separate general rules (no DID) from specific rules (with DID)
            if (!route.number || route.number === '') {
                groups[providerId].generalRules.push(route);
            } else {
                if (!groups[providerId].specificRules[route.number]) {
                    groups[providerId].specificRules[route.number] = [];
                }
                groups[providerId].specificRules[route.number].push(route);
            }
        });
        
        // Sort rules within each group by priority
        Object.keys(groups).forEach(providerId => {
            groups[providerId].generalRules.sort((a, b) => a.priority - b.priority);
            Object.keys(groups[providerId].specificRules).forEach(did => {
                groups[providerId].specificRules[did].sort((a, b) => a.priority - b.priority);
            });
        });
        
        return groups;
    },
    
    /**
     * Render grouped routes in the table
     * @param {Object} groupedRoutes - Grouped routes object
     * @param {Array} associatedIds - Array of associated route IDs
     */
    renderGroupedRoutes(groupedRoutes, associatedIds) {
        const tbody = outOfWorkTimeRecord.$rulesTable.find('tbody');
        let isFirstGroup = true;
        
        Object.keys(groupedRoutes).forEach(providerId => {
            const group = groupedRoutes[providerId];
            
            // Add provider group header
            if (!isFirstGroup) {
                // Add separator between groups
                tbody.append('<tr class="provider-separator"><td colspan="3"><div class="ui divider"></div></td></tr>');
            }
            isFirstGroup = false;
            
            // Add provider header row - use providerNameHtml for rich display
            tbody.append(`
                <tr class="provider-header">
                    <td colspan="3">
                        <div class="ui small header">
                            <div class="content">
                                ${group.providerNameHtml}
                                ${group.providerDisabled ? '<span class="ui mini red label">Disabled</span>' : ''}
                            </div>
                        </div>
                    </td>
                </tr>
            `);
            
            // Render general rules first
            group.generalRules.forEach((route) => {
                const row = outOfWorkTimeRecord.createRouteRow(route, associatedIds, 'rule-general');
                tbody.append(row);
            });
            
            // Render specific rules grouped by DID
            Object.keys(group.specificRules).sort().forEach(did => {
                group.specificRules[did].forEach((route, index) => {
                    const isFirstInDID = index === 0;
                    const row = outOfWorkTimeRecord.createRouteRow(route, associatedIds, 'rule-specific', isFirstInDID);
                    tbody.append(row);
                });
            });
        });
    },
    
    /**
     * Create a single route row
     * @param {Object} route - Route object
     * @param {Array} associatedIds - Associated route IDs
     * @param {String} ruleClass - CSS class for the rule type
     * @param {Boolean} showDIDIndicator - Whether to show DID indicator
     * @returns {String} HTML row
     */
    createRouteRow(route, associatedIds, ruleClass = '', showDIDIndicator = false) {
        const isChecked = associatedIds.includes(parseInt(route.id));
        const providerDisabled = route.providerDisabled ? 'disabled' : '';
        let ruleDescription = route.rule_represent || '';
        
        // Ensure provider ID is clean (no HTML)
        const providerId = route.provider || '';
        
        // Add visual indicators for rule type
        if (ruleClass === 'rule-specific') {
            // Add indent and arrow for specific rules
            ruleDescription = `<span class="rule-indent">↳</span> ${ruleDescription}`;
        } else if (ruleClass === 'rule-general') {
            // Add icon for general rules
            ruleDescription = `<i class="random icon"></i> ${ruleDescription}`;
        }
        
        const noteDisplay = route.note && route.note.length > 20 ? 
            `<div class="ui basic icon button" data-content="${SecurityUtils.escapeHtml(route.note)}" data-variation="wide" data-position="top right">
                <i class="file text icon"></i>
            </div>` : 
            SecurityUtils.escapeHtml(route.note || '');
        
        // Data attributes already safe from API
        const safeProviderId = providerId;
        const safeDid = route.number || '';
        
        return `
            <tr class="rule-row ${ruleClass}" id="${route.id}" 
                data-provider="${safeProviderId}" 
                data-did="${safeDid}">
                <td class="collapsing">
                    <div class="ui fitted toggle checkbox" 
                         data-did="${safeDid}" 
                         data-provider="{${safeProviderId}}">
                        <input type="checkbox" ${isChecked ? 'checked' : ''} 
                               name="route-${route.id}" data-value="${route.id}">
                        <label></label>
                    </div>
                </td>
                <td class="${providerDisabled}">
                    ${ruleDescription || '<span class="text-muted">No description</span>'}
                </td>
                <td class="hide-on-mobile">
                    ${noteDisplay}
                </td>
            </tr>
        `;
    },
    
    /**
     * Show empty routes message in table
     */
    showEmptyRoutesMessage() {
        const emptyRow = `
            <tr>
                <td colspan="3" class="center aligned">
                    ${globalTranslate.ir_NoIncomingRoutes}
                </td>
            </tr>
        `;
        outOfWorkTimeRecord.$rulesTable.find('tbody').append(emptyRow);
    },
    
    /**
     * Initialize routing checkboxes with grouped logic
     * When checking/unchecking rules with same provider and DID
     */
    initializeRoutingCheckboxes() {
        
        // Add hover effect to highlight related rules
        outOfWorkTimeRecord.$rulesTable.find('.rule-row').hover(
            function() {
                const $row = $(this);
                const provider = $row.attr('data-provider');
                const did = $row.attr('data-did');
                
                // Remove previous highlights
                outOfWorkTimeRecord.$rulesTable.find('.rule-row').removeClass('related-highlight');
                
                if (provider && provider !== 'none') {
                    // Highlight all rules with same provider
                    let selector = `.rule-row[data-provider="${provider}"]`;
                    
                    if (did) {
                        // If hovering on specific DID rule, highlight all with same DID
                        selector += `[data-did="${did}"]`;
                    } else {
                        // If hovering on general rule, highlight all general rules for this provider
                        selector += '[data-did=""]';
                    }
                    
                    const $relatedRows = outOfWorkTimeRecord.$rulesTable.find(selector);
                    $relatedRows.addClass('related-highlight');
                }
            },
            function() {
                // Remove highlights on mouse leave
                outOfWorkTimeRecord.$rulesTable.find('.rule-row').removeClass('related-highlight');
            }
        );
        
        // Initialize checkbox behavior with tooltips
        outOfWorkTimeRecord.$rulesTable.find('.ui.checkbox').each(function() {
            const $checkbox = $(this);
            const did = $checkbox.attr('data-did');
            const provider = $checkbox.attr('data-provider');
            
            // Add tooltip to explain grouping
            if (provider && provider !== 'none') {
                let tooltipText = '';
                if (did) {
                    tooltipText = globalTranslate.tf_TooltipSpecificRule;
                } else {
                    tooltipText = globalTranslate.tf_TooltipGeneralRule;
                }
                
                $checkbox.attr('data-content', tooltipText);
                $checkbox.attr('data-variation', 'tiny');
                $checkbox.popup();
            }
        });
        
        // Initialize checkbox change behavior
        outOfWorkTimeRecord.$rulesTable.find('.ui.checkbox').checkbox({
            onChange: function() {
                const $checkbox = $(this).parent();
                const isChecked = $checkbox.checkbox('is checked');
                const did = $checkbox.attr('data-did');
                const provider = $checkbox.attr('data-provider');
                
                // Skip synchronization for 'none' provider (direct calls)
                if (!provider || provider === 'none') {
                    Form.dataChanged();
                    return;
                }
                
                // If we have grouped logic requirements
                if (provider) {
                    let selector = `#routing-table .ui.checkbox[data-provider="${provider}"]`;
                    
                    if (did && did !== '') {
                        // Rule with specific DID
                        if (isChecked) {
                            // When checking a rule with DID, check all rules with same provider and DID
                            const selectorWithDID = `${selector}[data-did="${did}"]`;
                            $(selectorWithDID).not($checkbox).checkbox('set checked');
                        } else {
                            // When unchecking a rule with DID:
                            // 1. Uncheck all rules with same DID
                            const selectorWithDID = `${selector}[data-did="${did}"]`;
                            $(selectorWithDID).not($checkbox).checkbox('set unchecked');
                            // 2. Also uncheck general rules (without DID) for same provider
                            const selectorGeneral = `${selector}[data-did=""]`;
                            $(selectorGeneral).checkbox('set unchecked');
                        }
                    } else {
                        // General rule without DID
                        if (!isChecked) {
                            // When unchecking general rule, only uncheck other general rules for same provider
                            const selectorGeneral = `${selector}[data-did=""]`;
                            $(selectorGeneral).not($checkbox).checkbox('set unchecked');
                        } else {
                            // When checking general rule, check all general rules for same provider
                            const selectorGeneral = `${selector}[data-did=""]`;
                            $(selectorGeneral).not($checkbox).checkbox('set checked');
                        }
                    }
                }
                
                // Trigger form change
                Form.dataChanged();
            }
        });
    },
    
    /**
     * Initialize erase buttons for date/time fields
     */
    initializeErasers() {
        outOfWorkTimeRecord.$eraseDatesBtn.on('click', () => {
            outOfWorkTimeRecord.$rangeDaysStart.calendar('clear');
            outOfWorkTimeRecord.$rangeDaysEnd.calendar('clear');
            Form.dataChanged();
        });
        
        outOfWorkTimeRecord.$eraseWeekdaysBtn.on('click', () => {
            outOfWorkTimeRecord.$weekdayFromDropdown.dropdown('clear');
            outOfWorkTimeRecord.$weekdayToDropdown.dropdown('clear');
            Form.dataChanged();
        });
        
        outOfWorkTimeRecord.$eraseTimeperiodBtn.on('click', () => {
            outOfWorkTimeRecord.$rangeTimeStart.calendar('clear');
            outOfWorkTimeRecord.$rangeTimeEnd.calendar('clear');
            Form.dataChanged();
        });
    },
    
    /**
     * Initialize description field with auto-resize
     */
    initializeDescriptionField() {
        // Auto-resize on input
        outOfWorkTimeRecord.$descriptionField.on('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
        
        // Initial resize
        if (outOfWorkTimeRecord.$descriptionField.val()) {
            outOfWorkTimeRecord.$descriptionField.trigger('input');
        }
    },
    
    /**
     * Helper to set date from timestamp or date string
     * @param {string|number} dateValue - Unix timestamp or date string (YYYY-MM-DD)
     * @param {string} selector - jQuery selector
     */
    setDateFromTimestamp(dateValue, selector) {
        if (!dateValue) return;
        
        // Check if it's a date string in YYYY-MM-DD format first
        if (typeof dateValue === 'string') {
            // Check for date format YYYY-MM-DD
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
                const date = new Date(dateValue);
                if (!isNaN(date.getTime())) {
                    $(selector).calendar('set date', date);
                    return;
                }
            }
            
            // Try to parse as Unix timestamp (all digits)
            if (/^\d+$/.test(dateValue)) {
                const timestamp = parseInt(dateValue);
                if (timestamp > 0) {
                    // Convert Unix timestamp to Date
                    $(selector).calendar('set date', new Date(timestamp * 1000));
                    return;
                }
            }
        } else if (typeof dateValue === 'number' && dateValue > 0) {
            // Numeric Unix timestamp
            $(selector).calendar('set date', new Date(dateValue * 1000));
        }
    },
    
    /**
     * Custom form validation for paired fields
     * @param {object} result - Form data
     * @returns {object|boolean} Result object or false if validation fails
     */
    customValidateForm(result) {
        // Check date fields - both should be filled or both empty
        if ((result.data.date_from !== '' && result.data.date_to === '') ||
            (result.data.date_to !== '' && result.data.date_from === '')) {
            outOfWorkTimeRecord.$errorMessage.html(globalTranslate.tf_ValidateCheckDateInterval).show();
            Form.$submitButton.transition('shake').removeClass('loading disabled');
            return false;
        }

        // Check weekday fields - both should be filled or both empty
        if ((result.data.weekday_from > 0 && result.data.weekday_to === '-1') ||
            (result.data.weekday_to > 0 && result.data.weekday_from === '-1')) {
            outOfWorkTimeRecord.$errorMessage.html(globalTranslate.tf_ValidateCheckWeekDayInterval).show();
            Form.$submitButton.transition('shake').removeClass('loading disabled');
            return false;
        }

        // Check time fields - both should be filled or both empty
        if ((result.data.time_from.length > 0 && result.data.time_to.length === 0) ||
            (result.data.time_to.length > 0 && result.data.time_from.length === 0)) {
            outOfWorkTimeRecord.$errorMessage.html(globalTranslate.tf_ValidateCheckTimeInterval).show();
            Form.$submitButton.transition('shake').removeClass('loading disabled');
            return false;
        }
        
        // For timeframe type, check that at least one condition is specified
        const calType = result.data.calType || 'timeframe';
        if (calType === 'timeframe' || calType === '') {
            const hasDateRange = result.data.date_from !== '' && result.data.date_to !== '';
            const hasWeekdayRange = result.data.weekday_from > 0 && result.data.weekday_to > 0;
            const hasTimeRange = result.data.time_from.length > 0 && result.data.time_to.length > 0;
            
            if (!hasDateRange && !hasWeekdayRange && !hasTimeRange) {
                outOfWorkTimeRecord.$errorMessage.html(globalTranslate.tf_ValidateNoRulesSelected).show();
                Form.$submitButton.transition('shake').removeClass('loading disabled');
                return false;
            }
        }

        return result;
    },
    
    /**
     * Callback before sending form
     * @param {object} settings - Form settings
     * @returns {object|boolean} Updated settings or false
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        result.data = outOfWorkTimeRecord.$formObj.form('get values');
        
        // Convert checkbox values from 'on'/undefined to true/false
        // Process all route checkboxes
        Object.keys(result.data).forEach(key => {
            if (key.startsWith('route-')) {
                result.data[key] = result.data[key] === 'on' || result.data[key] === true;
            }
        });
        
        // Convert allowRestriction checkbox
        if ('allowRestriction' in result.data) {
            result.data.allowRestriction = result.data.allowRestriction === 'on' || result.data.allowRestriction === true;
        }
        
        // Handle calType conversion (matches old controller: ($data[$name] === 'timeframe') ? '' : $data[$name])
        // For saving we convert 'timeframe' to empty string
        if (result.data.calType === 'timeframe') {
            result.data.calType = '';
        }
        
        // Handle weekday values (matches old controller: ($data[$name] < 1) ? null : $data[$name])
        if (result.data.weekday_from === '-1' || result.data.weekday_from < 1) {
            result.data.weekday_from = '';
        }
        if (result.data.weekday_to === '-1' || result.data.weekday_to < 1) {
            result.data.weekday_to = '';
        }
        
        // Handle password field - if user didn't change the masked password, keep it as is
        // The backend will recognize 'XXXXXX' and won't update the password
        // If user cleared the field or entered new value, send that
        if (result.data.calSecret === 'XXXXXX') {
            // User didn't change the masked password, backend will keep existing value
        } else if (result.data.calSecret === '') {
            // User cleared the password field, backend will clear the password
        }
        // Otherwise send the new password value as entered
        
        // Update time validation rules based on calendar type
        const calType = result.data.calType || 'timeframe';
        if (calType === '' || calType === 'timeframe') {
            Form.validateRules.timefrom.rules = outOfWorkTimeRecord.additionalTimeIntervalRules;
            Form.validateRules.timeto.rules = outOfWorkTimeRecord.additionalTimeIntervalRules;
        } else {
            Form.validateRules.timefrom.rules = [];
            Form.validateRules.timeto.rules = [];
        }
        
        // Convert dates to timestamps
        const dateFrom = outOfWorkTimeRecord.$rangeDaysStart.calendar('get date');
        if (dateFrom) {
            dateFrom.setHours(0, 0, 0, 0);
            result.data.date_from = Math.floor(dateFrom.getTime() / 1000).toString();
        }
        
        const dateTo = outOfWorkTimeRecord.$rangeDaysEnd.calendar('get date');
        if (dateTo) {
            dateTo.setHours(23, 59, 59, 0);
            result.data.date_to = Math.floor(dateTo.getTime() / 1000).toString();
        }
        
        // Collect selected incoming routes
        const selectedRoutes = [];
        outOfWorkTimeRecord.$rulesTable.find('input[type="checkbox"]:checked').each(function() {
            const routeId = $(this).attr('data-value');
            if (routeId) {
                selectedRoutes.push(routeId);
            }
        });
        result.data.incomingRouteIds = selectedRoutes;
        
        // Clear action-dependent fields based on selection
        if (result.data.action === 'extension') {
            result.data.audio_message_id = '';
        } else if (result.data.action === 'playmessage') {
            result.data.extension = '';
        }
        
        // Run custom validation for paired fields
        return outOfWorkTimeRecord.customValidateForm(result);
    },
    
    /**
     * Callback after form submission
     * @param {object} response - Server response
     */
    cbAfterSendForm(response) {
        if (response.result && response.data && response.data.id) {
            // Update URL if this was a new record
            if (!outOfWorkTimeRecord.recordId) {
                const newUrl = `${globalRootUrl}off-work-times/modify/${response.data.id}`;
                window.history.replaceState(null, '', newUrl);
                outOfWorkTimeRecord.recordId = response.data.id;
            }
            
            // Reload data to ensure consistency
            outOfWorkTimeRecord.loadFormData();
        }
    },
    
    /**
     * Initialize form with REST API integration
     */
    initializeForm() {
        Form.$formObj = outOfWorkTimeRecord.$formObj;
        Form.url = `${globalRootUrl}off-work-times/save`;
        Form.validateRules = outOfWorkTimeRecord.validateRules;
        Form.cbBeforeSendForm = outOfWorkTimeRecord.cbBeforeSendForm;
        Form.cbAfterSendForm = outOfWorkTimeRecord.cbAfterSendForm;
        
        // REST API integration
        Form.apiSettings.enabled = true;
        Form.apiSettings.apiObject = OffWorkTimesAPI;
        Form.apiSettings.saveMethod = 'saveRecord';
        
        Form.initialize();
    },
    
    /**
     * Initialize tooltips for form fields using TooltipBuilder
     */
    initializeTooltips() {
        // Configuration for each field tooltip
        const tooltipConfigs = {
            calUrl: {
                header: globalTranslate.tf_CalUrlTooltip_header,
                description: globalTranslate.tf_CalUrlTooltip_desc,
                list: [
                    { term: globalTranslate.tf_CalUrlTooltip_caldav_header, definition: null },
                    globalTranslate.tf_CalUrlTooltip_caldav_google,
                    globalTranslate.tf_CalUrlTooltip_caldav_nextcloud,
                    globalTranslate.tf_CalUrlTooltip_caldav_yandex
                ],
                list2: [
                    { term: globalTranslate.tf_CalUrlTooltip_icalendar_header, definition: null },
                    globalTranslate.tf_CalUrlTooltip_icalendar_desc
                ],
                examples: [
                    globalTranslate.tf_CalUrlTooltip_example_google,
                    globalTranslate.tf_CalUrlTooltip_example_nextcloud,
                    globalTranslate.tf_CalUrlTooltip_example_ics
                ],
                examplesHeader: globalTranslate.tf_CalUrlTooltip_examples_header,
                note: globalTranslate.tf_CalUrlTooltip_note
            }
        };
        
        // Use TooltipBuilder to initialize tooltips
        TooltipBuilder.initialize(tooltipConfigs);
    }
};

/**
 * Custom validation rule that checks if a value is not empty based on a specific action
 * @param {string} value - The value to be validated
 * @param {string} action - The action to compare against
 * @returns {boolean} Returns true if valid, false otherwise
 */
$.fn.form.settings.rules.customNotEmptyIfActionRule = function(value, action) {
    if (value.length === 0 && outOfWorkTimeRecord.$actionField.val() === action) {
        return false;
    }
    return true;
};

/**
 * Custom validation rule for calendar URL field
 * Validates URL only when calendar type is not 'none' or 'time'
 */
$.fn.form.settings.rules.customNotEmptyIfCalType = function(value) {
    const calType = outOfWorkTimeRecord.$calTypeField.val();
    
    // If calendar type is timeframe or time, URL is not required
    if (!calType || calType === 'timeframe' || calType === 'time') {
        return true;
    }
    
    // If calendar type is CALDAV or ICAL, validate URL
    if (!value || value.length === 0) {
        return false;
    }
    
    // Check if it's a valid URL
    try {
        new URL(value);
        return true;
    } catch (_) {
        return false;
    }
};

// Initialize when DOM is ready
$(document).ready(() => {
    outOfWorkTimeRecord.initialize();
});