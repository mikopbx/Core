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

/* global globalRootUrl, globalTranslate, Form, UserMessage, ApiKeysAPI, DynamicDropdownBuilder, FormElements, SemanticLocalization, ApiKeysTooltipManager, ACLHelper, PermissionsSelector */

/**
 * API key edit form management module
 */
const apiKeysModify = {
    $formObj: $('#save-api-key-form'),
    permissionsTable: null,
    generatedApiKey: '',
    handlers: {},  // Store event handlers for cleanup
    formInitialized: false,  // Flag to prevent dataChanged during initialization
    suppressToggleClear: false,  // Flag to prevent clearing permissions during data load

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
        apiKeysModify.initializeTooltips();

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
            const { result, data, messages } = response || {};

            if (result && data) {
                apiKeysModify.populateForm(data);

                // Generate API key for new records
                if (!recordId) {
                    apiKeysModify.generateApiKey();
                }
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

        // Initialize full permissions toggle with PermissionsSelector integration
        $('#full-permissions-toggle').checkbox({
            onChange: apiKeysModify.togglePermissionsSelector
        });

        // Initialize PermissionsSelector visibility
        apiKeysModify.togglePermissionsSelector();

        // Store event handlers for cleanup
        apiKeysModify.handlers.copyKey = apiKeysModify.handleCopyKey.bind(apiKeysModify);
        apiKeysModify.handlers.regenerateKey = apiKeysModify.handleRegenerateKey.bind(apiKeysModify);

        // Attach event handlers
        $('.copy-api-key').off('click').on('click', apiKeysModify.handlers.copyKey);
        $('.regenerate-api-key').off('click').on('click', apiKeysModify.handlers.regenerateKey);

        // Apply ACL permissions to UI elements
        apiKeysModify.applyACLPermissions();
    },

    /**
     * Toggle PermissionsSelector synchronization with full_permissions checkbox
     * Table is always visible, but permissions sync with toggle state
     */
    togglePermissionsSelector() {
        const isFullPermissions = $('#full-permissions-toggle').checkbox('is checked');

        // Always show permissions container (table is always visible)
        $('#permissions-container').show();

        // Initialize PermissionsSelector on first show
        if (typeof PermissionsSelector !== 'undefined' && !PermissionsSelector.isReady()) {
            PermissionsSelector.initialize('#permissions-container', apiKeysModify.onManualPermissionChange);
        }

        // Sync permissions table with toggle state
        if (typeof PermissionsSelector !== 'undefined' && PermissionsSelector.isReady()) {
            if (isFullPermissions) {
                // Set all dropdowns to "write"
                PermissionsSelector.setAllPermissions('write');
            } else {
                // Set all dropdowns to "" (noAccess) when user disables full_permissions
                // Exception: during data load (suppressToggleClear=true) don't clear
                if (!apiKeysModify.suppressToggleClear) {
                    PermissionsSelector.setAllPermissions('');
                }
            }
        }

        // Trigger dataChanged if form is fully initialized
        if (apiKeysModify.formInitialized) {
            Form.dataChanged();
        }
    },

    /**
     * Handle manual permission changes in the table
     * Automatically disables full_permissions toggle when user edits individual permissions
     */
    onManualPermissionChange() {
        const isFullPermissions = $('#full-permissions-toggle').checkbox('is checked');

        // If full_permissions is enabled, disable it when user manually changes permissions
        if (isFullPermissions) {
            $('#full-permissions-toggle').checkbox('uncheck');
        }
    },

    /**
     * Apply ACL permissions to UI elements
     * Shows/hides buttons and form elements based on user permissions
     */
    applyACLPermissions() {
        // Check if ACL Helper is available
        if (typeof ACLHelper === 'undefined') {
            console.warn('ACLHelper is not available, skipping ACL checks');
            return;
        }

        // Apply permissions using ACLHelper
        ACLHelper.applyPermissions({
            save: {
                show: '#submitbutton, #dropdownSubmit',
                enable: '#save-api-key-form'
            },
            delete: {
                show: '.delete-button'
            }
        });

        // Additional checks for specific actions
        if (!ACLHelper.canSave()) {
            // Disable form if user cannot save
            $('#save-api-key-form input, #save-api-key-form select, #save-api-key-form textarea')
                .prop('readonly', true)
                .addClass('disabled');

            // Show info message
            const infoMessage = globalTranslate.ak_NoPermissionToModify || 'You do not have permission to modify API keys';
            UserMessage.showInformation(infoMessage);
        }
    },

    /**
     * Initialize tooltips for form fields using ApiKeysTooltipManager
     */
    initializeTooltips() {
        // Delegate tooltip initialization to ApiKeysTooltipManager
        ApiKeysTooltipManager.initialize();
    },

    /**
     * Handle copy API key button click
     */
    handleCopyKey(e) {
        e.preventDefault();
        const actualApiKey = $('#key').val();

        // Only copy if we have the actual full API key (for new or regenerated keys)
        if (actualApiKey && actualApiKey.trim() !== '') {
            navigator.clipboard.writeText(actualApiKey).then(() => {
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
        $('#key').val(key);
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

        // Collect permissions (object format: {path: permission})
        const permissions = apiKeysModify.collectSelectedPermissions(result.data);

        // Convert permissions object to JSON string for API
        if (!$('#full-permissions-toggle').checkbox('is checked')) {
            result.data.allowed_paths = JSON.stringify(permissions);
        } else {
            // For full permissions, send empty object as JSON
            result.data.allowed_paths = JSON.stringify({});
        }

        // Clean up temporary form fields
        apiKeysModify.cleanupFormData(result.data);

        return result;
    },

    /**
     * Handle API key inclusion in form data
     */
    handleApiKeyInFormData(data) {
        // Ensure key field is present for new records (may be auto-generated on server)
        // No need to copy from api_key - we use 'key' field directly from form

        // For existing records with regenerated key
        if (data.id && data.key && apiKeysModify.generatedApiKey) {
            // Key is already in correct field, nothing to do
        }
    },

    /**
     * Collect selected permissions based on form state
     * Returns object in new format: {path: permission}
     */
    collectSelectedPermissions(data) {
        // Note: with convertCheckboxesToBool=true, full_permissions will be boolean
        const isFullPermissions = data.full_permissions === true;

        if (isFullPermissions) {
            // Empty object for full permissions
            return {};
        }

        // Get permissions from PermissionsSelector (new format)
        if (typeof PermissionsSelector !== 'undefined' && PermissionsSelector.isReady()) {
            return PermissionsSelector.getSelectedPermissions();
        }

        // Fallback: empty object if PermissionsSelector not ready
        return {};
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
    cbAfterSendForm(response) {
        if (response.result) {
            if (response.data) {
                apiKeysModify.populateForm(response.data);

                // Update page state for existing record
                const currentId = $('#id').val();
                if (!currentId && response.data && response.data.id) {
                    apiKeysModify.updatePageForExistingRecord();

                    // Clear the generated key after successful save
                    apiKeysModify.generatedApiKey = '';
                }
            }
            // Form.js will handle all redirect logic based on submitMode
        }
    },

    /**
     * Populate form with data
     */
    populateForm(data) {
        // Set hidden field value BEFORE initializing dropdown
        $('#networkfilterid').val(data.networkfilterid || 'none');
        
        // Use universal method for silent form population
        Form.populateFormSilently(data);
        
        // Update page header with represent value if available
        // Since the template already handles represent display, we don't need to update it here
        // The represent value will be shown correctly when the page reloads or when set on server side
        
        // Build network filter dropdown with DynamicDropdownBuilder
        DynamicDropdownBuilder.buildDropdown('networkfilterid', data, {
            apiUrl: '/pbxcore/api/v3/network-filters:getForSelect?categories[]=API&includeLocalhost=true',
            placeholder: globalTranslate.ak_SelectNetworkFilter,
            cache: false
        });
        
        // Set permissions
        const isFullPermissions = data.full_permissions === '1' || data.full_permissions === true ||
                                (data.allowed_paths && typeof data.allowed_paths === 'object' && Object.keys(data.allowed_paths).length === 0);

        if (isFullPermissions) {
            $('#full-permissions-toggle').checkbox('set checked');
        } else {
            // Prevent clearing permissions during data load
            apiKeysModify.suppressToggleClear = true;
            $('#full-permissions-toggle').checkbox('set unchecked');
            apiKeysModify.suppressToggleClear = false;

            // Set specific permissions if available (new format: object with path => permission)
            if (data.allowed_paths && typeof data.allowed_paths === 'object' && Object.keys(data.allowed_paths).length > 0) {
                // Wait for PermissionsSelector to be ready, then set permissions
                setTimeout(() => {
                    if (typeof PermissionsSelector !== 'undefined' && PermissionsSelector.isReady()) {
                        Form.executeSilently(() => {
                            PermissionsSelector.setPermissions(data.allowed_paths);
                        });
                    }
                }, 500);
            }
        }
        
        // Show key display in header and input field if available
        if (data.key_display) {
            $('.api-key-suffix').text(`(${data.key_display})`).show();
            // For existing keys, show key display instead of "Key hidden"
            if (data.id) {
                $('#api-key-display').val(data.key_display);
                // Don't show copy button for existing keys - they can only be regenerated
                $('.copy-api-key').hide();
            }
        }
        
        // Note: For existing API keys, the actual key is never sent from server for security
        // Copy button remains hidden for existing keys - only available for new/regenerated keys
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
        // Hide copy button for existing keys (can only regenerate, not copy)
        $('.copy-api-key').hide();
        // Hide warning message for existing keys
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