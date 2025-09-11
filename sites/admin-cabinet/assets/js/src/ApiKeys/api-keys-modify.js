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

/* global globalRootUrl, globalTranslate, Form, UserMessage, ApiKeysAPI, DynamicDropdownBuilder, FormElements, SemanticLocalization */

/**
 * API key edit form management module
 */
const apiKeysModify = {
    $formObj: $('#save-api-key-form'),
    permissionsTable: null,
    generatedApiKey: '',
    handlers: {},  // Store event handlers for cleanup
    formInitialized: false,  // Flag to prevent dataChanged during initialization

    /**
     * Validation rules
     */
    validateRules: {
        description: {
            identifier: 'description',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.ak_ValidateNameEmpty,
                },
            ],
        },
    },

    /**
     * Module initialization
     */
    initialize() {
        // Configure Form.js
        Form.$formObj = apiKeysModify.$formObj;
        Form.url = '#'; // Not used with REST API
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
        
        ApiKeysAPI.getRecord(recordId, async (response) => {
            const { result, data, messages } = response || {};
            
            if (result && data) {
                await apiKeysModify.populateForm(data);
                
                // Load permissions only after form is populated
                apiKeysModify.loadAvailableControllers();
                
                // Generate API key for new records
                if (!recordId) {
                    apiKeysModify.generateApiKey();
                }
                
                // Mark form as fully initialized after all async operations complete
                setTimeout(() => {
                    apiKeysModify.formInitialized = true;
                }, 750); // Wait for all async operations to complete
            } else {
                UserMessage.showError(messages?.error || 'Failed to load API key data');
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
        
        // Initialize dropdowns (network filter will be built by DynamicDropdownBuilder)
        $('.ui.dropdown').dropdown();
        
        // Initialize full permissions toggle
        $('#full-permissions-toggle').checkbox({
            onChecked: () => {
                $('#selective-permissions-section').slideUp();
                $('#full-permissions-warning').slideDown();
                // Only call dataChanged if form is fully initialized
                if (apiKeysModify.formInitialized) {
                    Form.dataChanged();
                }
            },
            onUnchecked: () => {
                $('#selective-permissions-section').slideDown();
                $('#full-permissions-warning').slideUp();
                // Only call dataChanged if form is fully initialized
                if (apiKeysModify.formInitialized) {
                    Form.dataChanged();
                }
            }
        });
        
        // Store event handlers for cleanup
        apiKeysModify.handlers.copyKey = apiKeysModify.handleCopyKey.bind(apiKeysModify);
        apiKeysModify.handlers.regenerateKey = apiKeysModify.handleRegenerateKey.bind(apiKeysModify);
        
        // Attach event handlers
        $('.copy-api-key').off('click').on('click', apiKeysModify.handlers.copyKey);
        $('.regenerate-api-key').off('click').on('click', apiKeysModify.handlers.regenerateKey);
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
            const { result, data, messages } = response || {};
            
            if (result && data) {
                const uniqueControllers = apiKeysModify.getUniqueControllers(data);
                
                if (!apiKeysModify.permissionsTable) {
                    apiKeysModify.createPermissionsTable(uniqueControllers);
                }
            } else {
                UserMessage.showError(messages?.error || 'Failed to load available controllers');
            }
        });
    },

    /**
     * Get unique controllers by path
     */
    getUniqueControllers(controllers) {
        const uniqueControllers = [];
        const seen = new Set();
        
        controllers.forEach(controller => {
            const { path } = controller;
            if (!seen.has(path)) {
                seen.add(path);
                uniqueControllers.push(controller);
            }
        });
        
        return uniqueControllers;
    },

    /**
     * Create permissions DataTable
     */
    createPermissionsTable(controllers) {
        const tableData = apiKeysModify.prepareTableData(controllers);
        
        apiKeysModify.permissionsTable = $('#api-permissions-table').DataTable({
            data: tableData,
            paging: false,
            searching: true,
            info: false,
            ordering: false,
            autoWidth: true,
            scrollX: false,
            language: SemanticLocalization.dataTableLocalisation,
            columns: apiKeysModify.getTableColumns(),
            drawCallback() {
                $('#api-permissions-table .checkbox').checkbox();
            },
            initComplete() {
                apiKeysModify.initializeTableCheckboxes(this.api());
            },
        });
    },

    /**
     * Prepare data for DataTable
     */
    prepareTableData(controllers) {
        return controllers.map(controller => [
            controller.name,
            controller.description,
            controller.path,
        ]);
    },

    /**
     * Get DataTable column definitions
     */
    getTableColumns() {
        return [
            apiKeysModify.getCheckboxColumn(),
            apiKeysModify.getDescriptionColumn(),
            apiKeysModify.getPathColumn(),
        ];
    },

    /**
     * Get checkbox column definition
     */
    getCheckboxColumn() {
        return {
            width: '50px',
            orderable: false,
            searchable: false,
            title: apiKeysModify.getMasterCheckboxHtml(),
            render(data) {
                return apiKeysModify.getPermissionCheckboxHtml(data);
            },
        };
    },

    /**
     * Get description column definition
     */
    getDescriptionColumn() {
        return {
            orderable: false,
            title: 'Description',
            render(data) {
                return `<strong>${data}</strong>`;
            },
        };
    },

    /**
     * Get path column definition
     */
    getPathColumn() {
        return {
            orderable: false,
            title: 'API Path',
            render(data) {
                return `<span class="text-muted">${data}</span>`;
            },
        };
    },

    /**
     * Get master checkbox HTML
     */
    getMasterCheckboxHtml() {
        return '<div class="ui fitted checkbox" id="select-all-permissions"><input type="checkbox"><label></label></div>';
    },

    /**
     * Get permission checkbox HTML
     */
    getPermissionCheckboxHtml(data) {
        return `<div class="ui fitted checkbox permission-checkbox">
                    <input type="checkbox" 
                           name="permission_${data}" 
                           data-path="">
                    <label></label>
                </div>`;
    },

    /**
     * Initialize table checkboxes after DataTable creation
     */
    initializeTableCheckboxes(api) {
        // Set data-path attributes
        $('#api-permissions-table tbody tr').each(function() {
            const rowData = api.row(this).data();
            if (rowData) {
                $(this).find('input[type="checkbox"]').attr('data-path', rowData[2]);
            }
        });
        
        // Style table wrapper
        $('#api-permissions-table_wrapper').css('width', '100%');
        $('#api-permissions-table').css('width', '100%');
        
        // Initialize master and child checkboxes
        apiKeysModify.initializeMasterCheckbox();
        apiKeysModify.initializeChildCheckboxes();
    },

    /**
     * Initialize master checkbox behavior
     */
    initializeMasterCheckbox() {
        $('#select-all-permissions').checkbox({
            onChecked() {
                $('#api-permissions-table tbody .permission-checkbox').checkbox('check');
                // Only call dataChanged if form is fully initialized
                if (apiKeysModify.formInitialized) {
                    Form.dataChanged();
                }
            },
            onUnchecked() {
                $('#api-permissions-table tbody .permission-checkbox').checkbox('uncheck');
                // Only call dataChanged if form is fully initialized
                if (apiKeysModify.formInitialized) {
                    Form.dataChanged();
                }
            },
        });
    },

    /**
     * Initialize child checkbox behavior
     */
    initializeChildCheckboxes() {
        $('#api-permissions-table tbody .permission-checkbox').checkbox({
            fireOnInit: true,
            onChange() {
                apiKeysModify.updateMasterCheckboxState();
                // Only call dataChanged if form is fully initialized
                if (apiKeysModify.formInitialized) {
                    Form.dataChanged();
                }
            },
        });
    },

    /**
     * Update master checkbox state based on child checkboxes
     */
    updateMasterCheckboxState() {
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
    },

    /**
     * Handle copy API key button click
     */
    handleCopyKey(e) {
        e.preventDefault();
        const apiKey = $('#api-key-display').val();
        const actualApiKey = $('#api_key').val();
        
        const keyToCopy = actualApiKey || apiKey;
        if (keyToCopy && keyToCopy.trim() !== '') {
            navigator.clipboard.writeText(keyToCopy).then(() => {
                // Silent copy
            });
        }
    },

    /**
     * Handle regenerate API key button click
     */
    handleRegenerateKey(e) {
        e.preventDefault();
        const $button = $(e.currentTarget);
        
        $button.addClass('loading disabled');
        
        apiKeysModify.generateNewApiKey((newKey) => {
            $button.removeClass('loading disabled');
            
            if (newKey) {
                // For existing keys, show copy button
                if (apiKeysModify.getRecordId()) {
                    $('.copy-api-key').show();
                    $('.ui.info.message').removeClass('info').addClass('warning')
                        .find('i').removeClass('info').addClass('warning');
                }
            }
        });
    },

    /**
     * Generate new API key and update fields
     */
    generateNewApiKey(callback) {
        ApiKeysAPI.generateKey((response) => {
            const { result, data, messages } = response || {};
            
            if (result && data?.key) {
                const newKey = data.key;
                apiKeysModify.updateApiKeyFields(newKey);
                
                if (callback) callback(newKey);
            } else {
                UserMessage.showError(messages?.error || 'Failed to generate API key');
                if (callback) callback(null);
            }
        });
    },

    /**
     * Update API key fields with new key
     */
    updateApiKeyFields(key) {
        $('#api_key').val(key);
        $('#api-key-display').val(key);
        apiKeysModify.generatedApiKey = key;
        
        // Update key display representation
        const keyDisplay = apiKeysModify.generateKeyDisplay(key);
        $('#key_display').val(keyDisplay);
        $('.api-key-suffix').text(`(${keyDisplay})`).show();
        
        Form.dataChanged();
    },

    /**
     * Generate new API key (wrapper for backward compatibility)
     */
    generateApiKey() {
        apiKeysModify.generateNewApiKey();
    },

    /**
     * Callback before form submission
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        // Form.js already handles form data collection when apiSettings.enabled = true
        
        // Handle API key for new/existing records
        apiKeysModify.handleApiKeyInFormData(result.data);
        
        // Collect and set permissions
        result.data.allowed_paths = apiKeysModify.collectSelectedPermissions(result.data);
        
        // Clean up temporary form fields
        apiKeysModify.cleanupFormData(result.data);
        
        return result;
    },

    /**
     * Handle API key inclusion in form data
     */
    handleApiKeyInFormData(data) {
        // Ensure API key is included for new records
        if (!data.id && data.api_key) {
            data.key = data.api_key;
        }
        
        // For existing records with regenerated key
        if (data.id && data.api_key && apiKeysModify.generatedApiKey) {
            data.key = data.api_key;
        }
    },

    /**
     * Collect selected permissions based on form state
     */
    collectSelectedPermissions(data) {
        // Note: with convertCheckboxesToBool=true, full_permissions will be boolean
        const isFullPermissions = data.full_permissions === true;
        
        if (isFullPermissions) {
            return [];
        }
        
        return apiKeysModify.getSelectedPermissionPaths();
    },

    /**
     * Get selected permission paths from checkboxes
     */
    getSelectedPermissionPaths() {
        const selectedPaths = [];
        
        $('#api-permissions-table tbody .permission-checkbox').each(function() {
            if ($(this).checkbox('is checked')) {
                const path = $(this).find('input').data('path');
                if (path) {
                    selectedPaths.push(path);
                }
            }
        });
        
        return selectedPaths;
    },

    /**
     * Clean up temporary form fields not needed in API
     */
    cleanupFormData(data) {
        Object.keys(data).forEach(key => {
            if (key.startsWith('permission_')) {
                delete data[key];
            }
        });
    },

    /**
     * Callback after form submission
     */
    async cbAfterSendForm(response) {
        if (response.result) {
            if (response.data) {
                await apiKeysModify.populateForm(response.data);
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
    async populateForm(data) {
        // Set hidden field value BEFORE initializing dropdown
        $('#networkfilterid').val(data.networkfilterid || 'none');
        
        // Use universal method for silent form population
        Form.populateFormSilently(data);
        
        // Build network filter dropdown with DynamicDropdownBuilder
        DynamicDropdownBuilder.buildDropdown('networkfilterid', data, {
            apiUrl: '/pbxcore/api/v2/network-filters/getForSelect?categories[]=WEB',
            placeholder: globalTranslate.ak_SelectNetworkFilter,
            cache: false
        });
        
        // Set permissions
        const isFullPermissions = data.full_permissions === '1' || data.full_permissions === true || 
                                (data.allowed_paths && Array.isArray(data.allowed_paths) && data.allowed_paths.length === 0);
        
        if (isFullPermissions) {
            $('#full-permissions-toggle').checkbox('set checked');
            $('#selective-permissions-section').hide();
            $('#full-permissions-warning').show();
        } else {
            $('#full-permissions-toggle').checkbox('set unchecked');
            $('#selective-permissions-section').show();
            $('#full-permissions-warning').hide();
            
            // Set specific permissions if available
            if (data.allowed_paths && Array.isArray(data.allowed_paths) && data.allowed_paths.length > 0) {
                setTimeout(() => {
                    Form.executeSilently(() => {
                        data.allowed_paths.forEach(path => {
                            $(`#api-permissions-table input[data-path="${path}"]`).parent('.permission-checkbox').checkbox('set checked');
                        });
                    });
                }, 500);
            }
        }
        
        // Show key display in header if available
        if (data.key_display) {
            $('.api-key-suffix').text(`(${data.key_display})`).show();
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
        
        return `${key.substring(0, 5)}...${key.substring(key.length - 5)}`;
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
    },

    /**
     * Cleanup method to remove event handlers and prevent memory leaks
     */
    destroy() {
        // Remove custom event handlers
        if (apiKeysModify.handlers.copyKey) {
            $('.copy-api-key').off('click', apiKeysModify.handlers.copyKey);
        }
        if (apiKeysModify.handlers.regenerateKey) {
            $('.regenerate-api-key').off('click', apiKeysModify.handlers.regenerateKey);
        }
        
        // Destroy DataTable if it exists
        if (apiKeysModify.permissionsTable) {
            apiKeysModify.permissionsTable.destroy();
            apiKeysModify.permissionsTable = null;
        }
        
        // Clear handlers object
        apiKeysModify.handlers = {};
    },
};

/**
 * Initialize on document ready
 */
$(document).ready(() => {
    apiKeysModify.initialize();
});

/**
 * Cleanup on page unload
 */
$(window).on('beforeunload', () => {
    apiKeysModify.destroy();
});