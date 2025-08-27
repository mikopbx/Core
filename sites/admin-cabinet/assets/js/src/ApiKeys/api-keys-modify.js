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

/* global globalRootUrl, globalTranslate, Form, UserMessage, ApiKeysAPI, NetworkFilterSelector, FormElements, SemanticLocalization */

/**
 * API key edit form management module
 */
const apiKeysModify = {
    $formObj: $('#save-api-key-form'),
    permissionsTable: null,
    generatedApiKey: '',

    /**
     * Validation rules
     */
    validateRules: {
        description: {
            identifier: 'description',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.ak_ValidateNameEmpty
                }
            ]
        }
    },

    /**
     * Module initialization
     */
    initialize() {
        // Configure Form.js
        Form.$formObj = apiKeysModify.$formObj;
        Form.url = '#'; // Не используется при REST API
        Form.validateRules = apiKeysModify.validateRules;
        Form.cbBeforeSendForm = apiKeysModify.cbBeforeSendForm;
        Form.cbAfterSendForm = apiKeysModify.cbAfterSendForm;
        Form.convertCheckboxesToBool = true; // Convert checkboxes to boolean values
        
        // Настройка REST API
        Form.apiSettings.enabled = true;
        Form.apiSettings.apiObject = ApiKeysAPI;
        Form.apiSettings.saveMethod = 'saveRecord';
        
        // Important settings for correct save modes operation
        Form.afterSubmitIndexUrl = `${globalRootUrl}api-keys/index/`;
        Form.afterSubmitModifyUrl = `${globalRootUrl}api-keys/modify/`;
        
        // Initialize Form with all standard features:
        // - Dirty checking (change tracking)
        // - Dropdown submit (SaveSettings, SaveSettingsAndAddNew, SaveSettingsAndExit)
        // - Form validation
        // - AJAX response handling
        Form.initialize();
        
        // Initialize other components
        apiKeysModify.initializeUIComponents();
        apiKeysModify.initializePermissionsTable();
        
        // Initialize form elements (textareas auto-resize)
        FormElements.initialize('#save-api-key-form');
        
        // Load form data
        apiKeysModify.initializeForm();
    },

    /**
     * Load data into form
     */
    initializeForm() {
        const recordId = apiKeysModify.getRecordId();
        
        ApiKeysAPI.getRecord(recordId, (response) => {
            if (response.result) {
                apiKeysModify.populateForm(response.data);
                
                // Load permissions only after form is populated
                apiKeysModify.loadAvailableControllers();
                
                // Generate API key for new records
                if (!recordId) {
                    apiKeysModify.generateApiKey();
                }
            } else {
                UserMessage.showError(response.messages?.error || 'Failed to load API key data');
            }
        });
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
     * Initialize UI components
     */
    initializeUIComponents() {
        // Initialize checkboxes
        $('.ui.checkbox').checkbox();
        
        // Initialize dropdowns (excluding network filter selector)
        $('.ui.dropdown').not('#networkfilterid-dropdown').dropdown();
        
        // Initialize network filter selector
        const $networkFilterDropdown = $('#networkfilterid-dropdown');
        const $networkFilterHidden = $('#networkfilterid');
        
        if ($networkFilterDropdown.length > 0) {
            // Don't pass currentValue here, it will be set later when form data loads
            const instance = NetworkFilterSelector.init($networkFilterDropdown, {
                filterType: 'WEB',  // API keys use WEB category for firewall rules
                includeNone: true,  // API keys can have "No restrictions" option
                onChange: (value, text) => {
                    Form.dataChanged();
                }
            });
        }
        
        // Initialize full permissions toggle
        $('#full-permissions-toggle').checkbox({
            onChecked: () => {
                $('#selective-permissions-section').slideUp();
                $('#full-permissions-warning').slideDown();
                Form.dataChanged();
            },
            onUnchecked: () => {
                $('#selective-permissions-section').slideDown();
                $('#full-permissions-warning').slideUp();
                Form.dataChanged();
            }
        });
        
        // Copy API Key button handler
        $('.copy-api-key').on('click', function(e) {
            e.preventDefault();
            const apiKey = $('#api-key-display').val();
            const actualApiKey = $('#api_key').val();
            
            const keyToCopy = actualApiKey || apiKey;
            if (keyToCopy && keyToCopy.trim() !== '') {
                navigator.clipboard.writeText(keyToCopy).then(function() {
                    // Silent copy
                });
            }
        });
        
        // Regenerate API Key button handler
        $('.regenerate-api-key').on('click', function(e) {
            e.preventDefault();
            const $button = $(this);
            
            $button.addClass('loading disabled');
            
            ApiKeysAPI.generateKey((response) => {
                $button.removeClass('loading disabled');
                
                if (response && response.result && response.data && response.data.key) {
                    const newKey = response.data.key;
                    
                    // Update fields
                    $('#api_key').val(newKey);
                    $('#api-key-display').val(newKey);
                    apiKeysModify.generatedApiKey = newKey;
                    
                    // Update key display representation
                    const keyDisplay = apiKeysModify.generateKeyDisplay(newKey);
                    $('#key_display').val(keyDisplay);
                    $('.api-key-suffix').text(`(${keyDisplay})`).show();
                    
                    // For existing keys, show copy button
                    if (apiKeysModify.getRecordId()) {
                        $('.copy-api-key').show();
                        $('.ui.info.message').removeClass('info').addClass('warning')
                            .find('i').removeClass('info').addClass('warning');
                    }
                    
                    Form.dataChanged();
                } else {
                    UserMessage.showError('Failed to generate API key');
                }
            });
        });
    },

    /**
     * Initialize permissions DataTable
     */
    initializePermissionsTable() {
        // Will be initialized after loading controllers
    },

    /**
     * Load available controllers from REST API
     */
    loadAvailableControllers() {
        ApiKeysAPI.getAvailableControllers((response) => {
            if (response && response.result && response.data) {
                const uniqueControllers = [];
                const seen = new Set();
                
                response.data.forEach(controller => {
                    const key = controller.path;
                    if (!seen.has(key)) {
                        seen.add(key);
                        uniqueControllers.push(controller);
                    }
                });
                
                if (!apiKeysModify.permissionsTable) {
                    apiKeysModify.createPermissionsTable(uniqueControllers);
                }
            } else {
                UserMessage.showError('Failed to load available controllers');
            }
        });
    },

    /**
     * Create permissions DataTable
     */
    createPermissionsTable(controllers) {
        const data = controllers.map(controller => [
            controller.name,
            controller.description,
            controller.path
        ]);
        
        apiKeysModify.permissionsTable = $('#api-permissions-table').DataTable({
            data: data,
            paging: false,
            searching: true,
            info: false,
            ordering: false,
            autoWidth: true,
            scrollX: false,
            language: SemanticLocalization.dataTableLocalisation,
            columns: [
                {
                    width: '50px',
                    orderable: false,
                    searchable: false,
                    title: '<div class="ui fitted checkbox" id="select-all-permissions"><input type="checkbox"><label></label></div>',
                    render: function(data) {
                        return `<div class="ui fitted checkbox permission-checkbox">
                                    <input type="checkbox" 
                                           name="permission_${data}" 
                                           data-path="">
                                    <label></label>
                                </div>`;
                    }
                },
                {
                    orderable: false,
                    title: 'Description',
                    render: function(data) {
                        return `<strong>${data}</strong>`;
                    }
                },
                {
                    orderable: false,
                    title: 'API Path',
                    render: function(data) {
                        return `<span class="text-muted">${data}</span>`;
                    }
                }
            ],
            drawCallback: function() {
                $('#api-permissions-table .checkbox').checkbox();
            },
            initComplete: function() {
                const api = this.api();
                $('#api-permissions-table tbody tr').each(function() {
                    const rowData = api.row(this).data();
                    if (rowData) {
                        $(this).find('input[type="checkbox"]').attr('data-path', rowData[2]);
                    }
                });
                
                $('#api-permissions-table_wrapper').css('width', '100%');
                $('#api-permissions-table').css('width', '100%');
                
                // Initialize master checkbox
                $('#select-all-permissions').checkbox({
                    onChecked: function() {
                        $('#api-permissions-table tbody .permission-checkbox').checkbox('check');
                        Form.dataChanged();
                    },
                    onUnchecked: function() {
                        $('#api-permissions-table tbody .permission-checkbox').checkbox('uncheck');
                        Form.dataChanged();
                    }
                });
                
                // Initialize child checkboxes
                $('#api-permissions-table tbody .permission-checkbox').checkbox({
                    fireOnInit: true,
                    onChange: function() {
                        const $allCheckboxes = $('#api-permissions-table tbody .permission-checkbox');
                        const $masterCheckbox = $('#select-all-permissions');
                        let allChecked = true;
                        let allUnchecked = true;
                        
                        $allCheckboxes.each(function() {
                            if ($(this).checkbox('is checked')) {
                                allUnchecked = false;
                            } else {
                                allChecked = false;
                            }
                        });
                        
                        if (allChecked) {
                            $masterCheckbox.checkbox('set checked');
                        } else if (allUnchecked) {
                            $masterCheckbox.checkbox('set unchecked');
                        } else {
                            $masterCheckbox.checkbox('set indeterminate');
                        }
                        
                        Form.dataChanged();
                    }
                });
            }
        });
    },

    /**
     * Generate new API key
     */
    generateApiKey() {
        ApiKeysAPI.generateKey((response) => {
            if (response && response.result && response.data && response.data.key) {
                const generatedKey = response.data.key;
                $('#api_key').val(generatedKey);
                $('#api-key-display').val(generatedKey);
                apiKeysModify.generatedApiKey = generatedKey;
                
                // Update key display representation
                const keyDisplay = apiKeysModify.generateKeyDisplay(generatedKey);
                $('#key_display').val(keyDisplay);
            } else {
                UserMessage.showError('Failed to generate API key');
            }
        });
    },

    /**
     * Callback before form submission
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        // Form.js already handles form data collection when apiSettings.enabled = true
        
        // Ensure API key is included for new records
        if (!result.data.id && result.data.api_key) {
            // For new records, ensure the generated key is included
            result.data.key = result.data.api_key;
        }
        
        // For existing records with regenerated key
        if (result.data.id && result.data.api_key && apiKeysModify.generatedApiKey) {
            result.data.key = result.data.api_key;
        }
        
        // Collect permissions
        // Note: with convertCheckboxesToBool=true, full_permissions will be boolean
        const isFullPermissions = result.data.full_permissions === true;
        let allowedPaths = [];
        
        if (!isFullPermissions) {
            // Collect selected permissions from checkboxes
            $('#api-permissions-table tbody .permission-checkbox').each(function() {
                if ($(this).checkbox('is checked')) {
                    const path = $(this).find('input').data('path');
                    if (path) {
                        allowedPaths.push(path);
                    }
                }
            });
        }
        
        result.data.allowed_paths = allowedPaths;
        
        // Clean up permission_* fields as they're not needed in API
        Object.keys(result.data).forEach(key => {
            if (key.startsWith('permission_')) {
                delete result.data[key];
            }
        });
        
        return result;
    },

    /**
     * Callback after form submission
     */
    cbAfterSendForm(response) {
        if (response.result) {
            if (response.data) {
                apiKeysModify.populateForm(response.data);
            }
            
            // Update URL for new records
            const currentId = $('#id').val();
            if (!currentId && response.data && response.data.id) {
                const newUrl = window.location.href.replace(/modify\/?$/, `modify/${response.data.id}`);
                window.history.pushState(null, '', newUrl);
                
                // Update page state for existing record
                apiKeysModify.updatePageForExistingRecord();
            }
        }
    },

    /**
     * Populate form with data
     */
    populateForm(data) {
        Form.$formObj.form('set values', data);
        
        // Set network filter using NetworkFilterSelector
        const networkFilterValue = data.networkfilterid || 'none';
        
        if (typeof NetworkFilterSelector !== 'undefined') {
            const instance = NetworkFilterSelector.instances.get('networkfilterid-dropdown');
            if (instance) {
                NetworkFilterSelector.setValue('networkfilterid-dropdown', networkFilterValue);
                
                // Force sync visual state with hidden field value
                setTimeout(() => {
                    const hiddenValue = $('#networkfilterid').val();
                    const $dropdown = $('#networkfilterid-dropdown');
                    
                    // Update Semantic UI dropdown visual state to match hidden field
                    $dropdown.dropdown('set selected', hiddenValue);
                }, 150);
            }
        }
        
        // Set permissions
        const isFullPermissions = data.full_permissions === '1' || data.full_permissions === true || 
                                (data.allowed_paths && Array.isArray(data.allowed_paths) && data.allowed_paths.length === 0);
        
        if (isFullPermissions) {
            $('#full-permissions-toggle').checkbox('check');
            $('#selective-permissions-section').hide();
            $('#full-permissions-warning').show();
        } else {
            $('#full-permissions-toggle').checkbox('uncheck');
            $('#selective-permissions-section').show();
            $('#full-permissions-warning').hide();
            
            // Set specific permissions if available
            if (data.allowed_paths && Array.isArray(data.allowed_paths) && data.allowed_paths.length > 0) {
                setTimeout(() => {
                    data.allowed_paths.forEach(path => {
                        $(`#api-permissions-table input[data-path="${path}"]`).parent('.permission-checkbox').checkbox('check');
                    });
                }, 500);
            }
        }
        
        // Show key display in header if available
        if (data.key_display) {
            $('.api-key-suffix').text(`(${data.key_display})`).show();
        }
        
        if (Form.enableDirty) {
            Form.saveInitialValues();
        }
    },

    /**
     * Generate key display representation (first 5 + ... + last 5 chars)
     * 
     * @param {string} key The full API key
     * @return {string} Display representation
     */
    generateKeyDisplay(key) {
        if (!key || key.length <= 15) {
            // For short keys, show full key
            return key;
        }
        
        return key.substring(0, 5) + '...' + key.substring(key.length - 5);
    },

    /**
     * Update page interface for existing record
     */
    updatePageForExistingRecord() {
        // Show key display representation instead of "Key hidden" message
        const keyDisplay = $('#key_display').val();
        $('#api-key-display').val(keyDisplay || '');
        $('.copy-api-key').hide();
        $('.ui.warning.message').hide();
    }
};

/**
 * Initialize on document ready
 */
$(document).ready(() => {
    apiKeysModify.initialize();
});