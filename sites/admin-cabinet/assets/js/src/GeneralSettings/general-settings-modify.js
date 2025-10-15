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


/* global globalRootUrl,globalTranslate, Form, PasswordScore, PbxApi, UserMessage, SoundFileSelector, GeneralSettingsAPI, ClipboardJS, PasswordWidget, PasswordsAPI, GeneralSettingsTooltipManager, $ */

/**
 * A module to handle modification of general settings.
 */
const generalSettingsModify = {
    /**
     * jQuery object for the form.
     * @type {jQuery}
     */
    $formObj: $('#general-settings-form'),

    /**
     * jQuery object for the web admin password input field.
     * @type {jQuery}
     */
    $webAdminPassword: $('#WebAdminPassword'),

    /**
     * jQuery object for the ssh password input field.
     * @type {jQuery}
     */
    $sshPassword: $('#SSHPassword'),

    /**
     * jQuery object for the web ssh password input field.
     * @type {jQuery}
     */
    $disableSSHPassword: $('#SSHDisablePasswordLogins').parent('.checkbox'),

    /**
     * jQuery object for the SSH password fields
     * @type {jQuery}
     */
    $sshPasswordSegment: $('#only-if-password-enabled'),

    /**
     * If password set, it will be hided from web ui.
     */
    hiddenPassword: '********',

    /**
     * Sound file field IDs
     * @type {object}
     */
    soundFileFields: {
        announcementIn: 'PBXRecordAnnouncementIn',
        announcementOut: 'PBXRecordAnnouncementOut'
    },
    
    /**
     * Original codec state from last load
     * @type {object}
     */
    originalCodecState: {},

    /**
     * Flag to track if codecs have been changed
     * @type {boolean}
     */
    codecsChanged: false,

    /**
     * Flag to track if data has been loaded from API
     * @type {boolean}
     */
    dataLoaded: false,

    /**
     * Validation rules for the form fields before submission.
     *
     * @type {object}
     */
    validateRules: { // generalSettingsModify.validateRules.SSHPassword.rules
        pbxname: {
            identifier: 'PBXName',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.gs_ValidateEmptyPBXName,
                },
            ],
        },
        WebAdminPassword: {
            identifier: 'WebAdminPassword',
            rules: [],
        },
        WebAdminPasswordRepeat: {
            identifier: 'WebAdminPasswordRepeat',
            rules: [
                {
                    type: 'match[WebAdminPassword]',
                    prompt: globalTranslate.gs_ValidateWebPasswordsFieldDifferent,
                },
            ],
        },
        SSHPassword: {
            identifier: 'SSHPassword',
            rules: [],
        },
        SSHPasswordRepeat: {
            identifier: 'SSHPasswordRepeat',
            rules: [
                {
                    type: 'match[SSHPassword]',
                    prompt: globalTranslate.gs_ValidateSSHPasswordsFieldDifferent,
                },
            ],
        },
        WEBPort: {
            identifier: 'WEBPort',
            rules: [
                {
                    type: 'integer[1..65535]',
                    prompt: globalTranslate.gs_ValidateWEBPortOutOfRange,
                },
                {
                    type: 'different[WEBHTTPSPort]',
                    prompt: globalTranslate.gs_ValidateWEBHTTPSPortNotEqualToWEBPort,
                },
                {
                    type: 'different[AJAMPortTLS]',
                    prompt: globalTranslate.gs_ValidateWEBPortNotEqualToAjamPort,
                },
                {
                    type: 'different[AJAMPort]',
                    prompt: globalTranslate.gs_ValidateWEBPortNotEqualToAjamTLSPort,
                },
            ],
        },
        WEBHTTPSPort: {
            identifier: 'WEBHTTPSPort',
            rules: [
                {
                    type: 'integer[1..65535]',
                    prompt: globalTranslate.gs_ValidateWEBHTTPSPortOutOfRange,
                },
                {
                    type: 'different[WEBPort]',
                    prompt: globalTranslate.gs_ValidateWEBHTTPSPortNotEqualToWEBPort,
                },
                {
                    type: 'different[AJAMPortTLS]',
                    prompt: globalTranslate.gs_ValidateWEBHTTPSPortNotEqualToAjamPort,
                },
                {
                    type: 'different[AJAMPort]',
                    prompt: globalTranslate.gs_ValidateWEBHTTPSPortNotEqualToAjamTLSPort,
                },
            ],
        },
        AJAMPort: {
            identifier: 'AJAMPort',
            rules: [
                {
                    type: 'integer[1..65535]',
                    prompt: globalTranslate.gs_ValidateAJAMPortOutOfRange,
                },
                {
                    type: 'different[AJAMPortTLS]',
                    prompt: globalTranslate.gs_ValidateAJAMPortOutOfRange,
                },
            ],
        },
        SIPAuthPrefix: {
            identifier: 'SIPAuthPrefix',
            rules: [
                {
                    type: 'regExp[/^[a-zA-Z]*$/]',
                    prompt: globalTranslate.gs_SIPAuthPrefixInvalid
                }
            ],
        },
    },

    // Rules for the web admin password field when it not equal to hiddenPassword
    webAdminPasswordRules: [
        {
            type: 'empty',
            prompt: globalTranslate.gs_ValidateEmptyWebPassword,
        },
        {
            type: 'minLength[5]',
            prompt: globalTranslate.gs_ValidateWeakWebPassword,
        },
        {
            type: 'notRegExp',
            value: /[a-z]/,
            prompt: '<b>' + globalTranslate.gs_Passwords + '</b>: ' + globalTranslate.psw_PasswordNoLowSimvol
        },
        {
            type: 'notRegExp',
            value: /\d/,
            prompt: '<b>' + globalTranslate.gs_Passwords + '</b>: ' + globalTranslate.psw_PasswordNoNumbers
        },
        {
            type: 'notRegExp',
            value: /[A-Z]/,
            prompt: '<b>' + globalTranslate.gs_Passwords + '</b>: ' + globalTranslate.psw_PasswordNoUpperSimvol
        }
    ],
    // Rules for the SSH password field when SSH login through the password enabled, and it not equal to hiddenPassword
    additionalSshValidRulesPass: [
        {
            type: 'empty',
            prompt: globalTranslate.gs_ValidateEmptySSHPassword,
        },
        {
            type: 'minLength[5]',
            prompt: globalTranslate.gs_ValidateWeakSSHPassword,
        },
        {
            type: 'notRegExp',
            value: /[a-z]/,
            prompt: '<b>' + globalTranslate.gs_SSHPassword + '</b>: ' + globalTranslate.psw_PasswordNoLowSimvol
        },
        {
            type: 'notRegExp',
            value: /\d/,
            prompt: '<b>' + globalTranslate.gs_SSHPassword + '</b>: ' + globalTranslate.psw_PasswordNoNumbers
        },
        {
            type: 'notRegExp',
            value: /[A-Z]/,
            prompt: '<b>' + globalTranslate.gs_SSHPassword + '</b>: ' + globalTranslate.psw_PasswordNoUpperSimvol
        }
    ],

    // Rules for the SSH password field when SSH login through the password disabled
    additionalSshValidRulesNoPass: [
        {
            type: 'empty',
            prompt: globalTranslate.gs_ValidateEmptySSHPassword,
        },
        {
            type: 'minLength[5]',
            prompt: globalTranslate.gs_ValidateWeakSSHPassword,
        }
    ],

    /**
     * Clipboard instance for copy functionality
     * @type {ClipboardJS}
     */
    clipboard: null,
    
    /**
     *  Initialize module with event bindings and component initializations.
     */
    initialize() {

        // Initialize password widgets
        // Web Admin Password widget - only validation and warnings, no buttons
        if (generalSettingsModify.$webAdminPassword.length > 0) {
            PasswordWidget.init(generalSettingsModify.$webAdminPassword, {
                context: 'general_web',
                generateButton: false,         // No generate button
                showPasswordButton: false,     // No show/hide button
                clipboardButton: false,         // No copy button
                validateOnInput: true,
                showStrengthBar: true,
                showWarnings: true,
                checkOnLoad: true
            });
        }
        
        // SSH Password widget - only validation and warnings, no buttons
        if (generalSettingsModify.$sshPassword.length > 0) {
            const sshWidget = PasswordWidget.init(generalSettingsModify.$sshPassword, {
                context: 'general_ssh',
                generateButton: false,         // No generate button
                showPasswordButton: false,     // No show/hide button
                clipboardButton: false,         // No copy button
                validateOnInput: true,
                showStrengthBar: true,
                showWarnings: true,
                checkOnLoad: true
            });
            
            // Handle SSH disable checkbox
            $('#SSHDisablePasswordLogins').on('change', () => {
                const isDisabled = $('#SSHDisablePasswordLogins').checkbox('is checked');
                if (isDisabled && sshWidget) {
                    PasswordWidget.hideWarnings(sshWidget);
                    if (sshWidget.elements.$scoreSection) {
                        sshWidget.elements.$scoreSection.hide();
                    }
                } else if (!isDisabled && sshWidget) {
                    PasswordWidget.checkPassword(sshWidget);
                }
            });
        }
        
        // Update validation rules when passwords change
        generalSettingsModify.$webAdminPassword.on('change', () => {
            if (generalSettingsModify.$webAdminPassword.val() !== generalSettingsModify.hiddenPassword) {
                generalSettingsModify.initRules();
            }
        });

        generalSettingsModify.$sshPassword.on('change', () => {
            if (generalSettingsModify.$sshPassword.val() !== generalSettingsModify.hiddenPassword) {
                generalSettingsModify.initRules();
            }
        });

        // Enable tab navigation with history support
        $('#general-settings-menu').find('.item').tab({
            history: true,
            historyType: 'hash',
        });

        // Initialize PBXLanguage dropdown first with special handler
        // Must be done before general dropdown initialization
        generalSettingsModify.initializePBXLanguageWarning();

        // Enable dropdowns on the form (except sound file selectors and language dropdown)
        // Language dropdown already initialized above with special onChange handler
        $('#general-settings-form .dropdown')
            .not('.audio-message-select')
            .not('#PBXLanguage-dropdown')
            .dropdown();

        // Enable checkboxes on the form
        $('#general-settings-form .checkbox').checkbox();
        
        // Initialize AMI/AJAM dependency after checkboxes are initialized
        generalSettingsModify.initializeAMIAJAMDependency();

        // Codec table drag-n-drop will be initialized after data is loaded
        // See initializeCodecDragDrop() which is called from updateCodecTables()

        // Sound file selectors will be initialized after REST API data is loaded
        // See loadSoundFileValues() method called from populateForm()

        // Initialize the form
        generalSettingsModify.initializeForm();
        
        // Note: SSH keys table will be initialized after data loads
        
        // Initialize truncated fields display
        generalSettingsModify.initializeTruncatedFields();
        
        // Initialize clipboard for copy buttons
        generalSettingsModify.initializeClipboard();

        // Initialize additional validation rules
        generalSettingsModify.initRules();

        // Show, hide ssh password segment
        generalSettingsModify.$disableSSHPassword.checkbox({
            'onChange': generalSettingsModify.showHideSSHPassword
        });
        generalSettingsModify.showHideSSHPassword();

        // Add event listener to handle tab activation
        $(window).on('GS-ActivateTab', (event, nameTab) => {
            $('#general-settings-menu').find('.item').tab('change tab', nameTab);
        });
        
        // Initialize tooltips for form fields
        if (typeof GeneralSettingsTooltipManager !== 'undefined') {
            GeneralSettingsTooltipManager.initialize();
        }

        // Tooltip click behavior is now handled globally in TooltipBuilder.js

        // PBXLanguage dropdown with restart warning already initialized above

        // Load data from API instead of using server-rendered values
        generalSettingsModify.loadData();
    },

    /**
     * Initialize sound file selectors with playback functionality using SoundFileSelector
     * HTML structure is provided by the playAddNewSoundWithIcons partial in recording.volt:
     * - Hidden input: <input type="hidden" id="PBXRecordAnnouncementIn" name="PBXRecordAnnouncementIn">
     * - Dropdown div: <div class="ui selection dropdown search PBXRecordAnnouncementIn-dropdown">
     * - Playback button and add new button
     */
    initializeSoundFileSelectors() {
        // Sound file selectors will be initialized after data is loaded
        // See initializeSoundFileSelectorWithData() called from populateForm()
        
        // This method is kept for consistency but actual initialization happens
        // when we have data from the server in loadSoundFileValues()
    },

    /**
     * Load general settings data from API
     * Used both on initial page load and for manual refresh
     * Can be called anytime to reload the form data: generalSettingsModify.loadData()
     */
    loadData() {
        // Show loading state on the form with dimmer
        Form.showLoadingState(true, 'Loading settings...');

        GeneralSettingsAPI.getSettings((response) => {
            Form.hideLoadingState();
            
            if (response && response.result && response.data) {
                // Populate form with the received data
                generalSettingsModify.populateForm(response.data);
                generalSettingsModify.dataLoaded = true;
                
                // Show warnings for default passwords after DOM update
                if (response.data.passwordValidation) {
                    // Use setTimeout to ensure DOM is updated after populateForm
                    setTimeout(() => {
                        generalSettingsModify.showDefaultPasswordWarnings(response.data.passwordValidation);
                    }, 100);
                }
            } else if (response && response.messages) {
                console.error('API Error:', response.messages);
                // Show error message if available
                generalSettingsModify.showApiError(response.messages);
            }
        });
    },
    
    /**
     * Populate form with data from API
     * @param {object} data - Settings data from API response
     */
    populateForm(data) {
        // Extract settings and additional data
        const settings = data.settings || data;
        const codecs = data.codecs || [];
        
        // Use unified silent population approach
        Form.populateFormSilently(settings, {
            afterPopulate: (formData) => {
                // Handle special field types
                generalSettingsModify.populateSpecialFields(formData);
                
                // Load sound file values with representations
                generalSettingsModify.loadSoundFileValues(formData);
                
                // Update codec tables
                if (codecs.length > 0) {
                    generalSettingsModify.updateCodecTables(codecs);
                }
                
                // Initialize password fields (hide actual passwords)
                generalSettingsModify.initializePasswordFields(formData);
                
                // Update SSH password visibility
                generalSettingsModify.showHideSSHPassword();
                
                // Remove loading state
                generalSettingsModify.$formObj.removeClass('loading');
                
                // Re-initialize form validation rules
                generalSettingsModify.initRules();
            }
        });
        
        // Re-initialize dirty checking if enabled
        if (Form.enableDirrity) {
            Form.initializeDirrity();
        }
        
        // Initialize SSH keys table after data is loaded
        if (typeof sshKeysTable !== 'undefined') {
            sshKeysTable.initialize('ssh-keys-container', 'SSHAuthorizedKeys');
        }
        
        // Re-initialize truncated fields with new data
        generalSettingsModify.initializeTruncatedFields();
        
        // Trigger event to notify that data has been loaded
        $(document).trigger('GeneralSettings.dataLoaded');

    },
    
    /**
     * Handle special field types that need custom population
     * @param {object} settings - Settings data
     */
    populateSpecialFields(settings) {
        // Private key existence is now determined by checking if value equals HIDDEN_PASSWORD
        
        // Handle certificate info
        if (settings.WEBHTTPSPublicKey_info) {
            $('#WEBHTTPSPublicKey').data('cert-info', settings.WEBHTTPSPublicKey_info);
        }
        
        // Handle checkboxes (API returns boolean values)
        Object.keys(settings).forEach(key => {
            const $checkbox = $(`#${key}`).parent('.checkbox');
            if ($checkbox.length > 0) {
                const isChecked = settings[key] === true || settings[key] === '1' || settings[key] === 1;
                $checkbox.checkbox(isChecked ? 'check' : 'uncheck');
            }
            
            // Handle regular dropdowns (excluding sound file selectors which are handled separately)
            const $dropdown = $(`#${key}`).parent('.dropdown');
            if ($dropdown.length > 0 && !$dropdown.hasClass('audio-message-select')) {
                $dropdown.dropdown('set selected', settings[key]);
            }
        });
    },
    
    /**
     * Initialize password fields with hidden password indicator
     * @param {object} settings - Settings data
     */
    initializePasswordFields(settings) {
        // Hide actual passwords and show hidden indicator
        if (settings.WebAdminPassword && settings.WebAdminPassword !== '') {
            generalSettingsModify.$formObj.form('set value', 'WebAdminPassword', generalSettingsModify.hiddenPassword);
            generalSettingsModify.$formObj.form('set value', 'WebAdminPasswordRepeat', generalSettingsModify.hiddenPassword);
        }
        
        if (settings.SSHPassword && settings.SSHPassword !== '') {
            generalSettingsModify.$formObj.form('set value', 'SSHPassword', generalSettingsModify.hiddenPassword);
            generalSettingsModify.$formObj.form('set value', 'SSHPasswordRepeat', generalSettingsModify.hiddenPassword);
        }
    },
    
    /**
     * Show API error messages
     * @param {object} messages - Error messages from API
     */
    showApiError(messages) {
        if (messages.error) {
            const errorMessage = Array.isArray(messages.error) 
                ? messages.error.join(', ') 
                : messages.error;
            UserMessage.showError(errorMessage);
        }
    },
    
    /**
     * Show warnings for default passwords
     * @param {object} validation - Password validation results from API
     */
    showDefaultPasswordWarnings(validation) {
        // Remove any existing password-validate messages first
        $('.password-validate').remove();
        
        // Show warning for default Web Admin password
        if (validation.isDefaultWebPassword) {
            // Find the password fields group - try multiple selectors
            let $webPasswordFields = $('#WebAdminPassword').closest('.two.fields');
            
            if ($webPasswordFields.length === 0) {
                // Try alternative selector if the first one doesn't work
                $webPasswordFields = $('#WebAdminPassword').parent().parent();
            }
            
            if ($webPasswordFields.length > 0) {
                // Create warning message
                const warningHtml = `
                    <div class="ui negative icon message password-validate">
                        <i class="exclamation triangle icon"></i>
                        <div class="content">
                            <div class="header">${globalTranslate.psw_SetPassword}</div>
                            <p>${globalTranslate.psw_ChangeDefaultPassword}</p>
                        </div>
                    </div>
                `;
                
                // Insert warning before the password fields
                $webPasswordFields.before(warningHtml);
            }
        }
        
        // Show warning for default SSH password
        if (validation.isDefaultSSHPassword) {
            // Check if SSH password login is enabled
            const sshPasswordDisabled = $('#SSHDisablePasswordLogins').checkbox('is checked');
            
            if (!sshPasswordDisabled) {
                // Find the SSH password fields group
                let $sshPasswordFields = $('#SSHPassword').closest('.two.fields');
                
                if ($sshPasswordFields.length === 0) {
                    // Try alternative selector
                    $sshPasswordFields = $('#SSHPassword').parent().parent();
                }
                
                if ($sshPasswordFields.length > 0) {
                    // Create warning message
                    const warningHtml = `
                        <div class="ui negative icon message password-validate">
                            <i class="exclamation triangle icon"></i>
                            <div class="content">
                                <div class="header">${globalTranslate.psw_SetPassword}</div>
                                <p>${globalTranslate.psw_ChangeDefaultPassword}</p>
                            </div>
                        </div>
                    `;
                    
                    // Insert warning before the SSH password fields
                    $sshPasswordFields.before(warningHtml);
                }
            }
        }
    },
    
    /**
     * Initialize and load sound file selectors with data, similar to IVR implementation
     * @param {object} settings - Settings data from API
     */
    loadSoundFileValues(settings) {
        // Convert empty values to -1 for the dropdown
        const dataIn = {...settings};
        if (!settings.PBXRecordAnnouncementIn || settings.PBXRecordAnnouncementIn === '') {
            dataIn.PBXRecordAnnouncementIn = '-1';
        }

        // Initialize incoming announcement selector with data (following IVR pattern)
        SoundFileSelector.init('PBXRecordAnnouncementIn', {
            category: 'custom',
            includeEmpty: true,
            data: dataIn
            // ❌ NO onChange needed - complete automation by base class
        });

        // Convert empty values to -1 for the dropdown
        const dataOut = {...settings};
        if (!settings.PBXRecordAnnouncementOut || settings.PBXRecordAnnouncementOut === '') {
            dataOut.PBXRecordAnnouncementOut = '-1';
        }

        // Initialize outgoing announcement selector with data (following IVR pattern)
        SoundFileSelector.init('PBXRecordAnnouncementOut', {
            category: 'custom',
            includeEmpty: true,
            data: dataOut
            // ❌ NO onChange needed - complete automation by base class
        });
    },

    /**
     * Build and update codec tables with data from API
     * @param {Array} codecs - Array of codec configurations
     */
    updateCodecTables(codecs) {
        // Reset codec change flag when loading data
        generalSettingsModify.codecsChanged = false;

        // Store original codec state for comparison
        generalSettingsModify.originalCodecState = {};
        
        // Separate audio and video codecs
        const audioCodecs = codecs.filter(c => c.type === 'audio').sort((a, b) => a.priority - b.priority);
        const videoCodecs = codecs.filter(c => c.type === 'video').sort((a, b) => a.priority - b.priority);
        
        // Build audio codecs table
        generalSettingsModify.buildCodecTable(audioCodecs, 'audio');
        
        // Build video codecs table
        generalSettingsModify.buildCodecTable(videoCodecs, 'video');
        
        // Hide loaders and show tables
        $('#audio-codecs-loader, #video-codecs-loader').removeClass('active');
        $('#audio-codecs-table, #video-codecs-table').show();
        
        // Re-initialize drag and drop for reordering
        generalSettingsModify.initializeCodecDragDrop();
    },
    
    /**
     * Build codec table rows from data
     * @param {Array} codecs - Array of codec objects
     * @param {string} type - 'audio' or 'video'
     */
    buildCodecTable(codecs, type) {
        const $tableBody = $(`#${type}-codecs-table tbody`);
        $tableBody.empty();
        
        codecs.forEach((codec, index) => {
            // Store original state for change detection
            generalSettingsModify.originalCodecState[codec.name] = {
                priority: index,
                disabled: codec.disabled
            };
            
            // Create table row
            const isDisabled = codec.disabled === true || codec.disabled === '1' || codec.disabled === 1;
            const checked = !isDisabled ? 'checked' : '';
            
            const rowHtml = `
                <tr class="codec-row" id="codec-${codec.name}" 
                    data-value="${index}" 
                    data-codec-name="${codec.name}"
                    data-original-priority="${index}">
                    <td class="collapsing dragHandle">
                        <i class="sort grey icon"></i>
                    </td>
                    <td>
                        <div class="ui toggle checkbox codecs">
                            <input type="checkbox" 
                                   name="codec_${codec.name}" 
                                   ${checked}
                                   tabindex="0" 
                                   class="hidden">
                            <label for="codec_${codec.name}">${generalSettingsModify.escapeHtml(codec.description || codec.name)}</label>
                        </div>
                    </td>
                </tr>
            `;
            
            $tableBody.append(rowHtml);
        });
        
        // Initialize checkboxes for the new rows
        $tableBody.find('.checkbox').checkbox({
            onChange: function() {
                // Mark codecs as changed and form as changed
                generalSettingsModify.codecsChanged = true;
                Form.dataChanged();
            }
        });
    },

    /**
     * Initialize drag and drop for codec tables
     */
    initializeCodecDragDrop() {
        $('#audio-codecs-table, #video-codecs-table').tableDnD({
            onDragClass: 'hoveringRow',
            dragHandle: '.dragHandle',
            onDrop: function() {
                // Mark codecs as changed and form as changed
                generalSettingsModify.codecsChanged = true;
                Form.dataChanged();
            }
        });
    },

    /**
     * Initialize certificate field display only
     */
    initializeCertificateField() {
        // Handle WEBHTTPSPublicKey field only
        const $certPubKeyField = $('#WEBHTTPSPublicKey');
        if ($certPubKeyField.length) {
            const fullValue = $certPubKeyField.val();
            const $container = $certPubKeyField.parent();
            
            // Get certificate info if available from data attribute
            const certInfo = $certPubKeyField.data('cert-info') || {};
            
            // Remove any existing display elements for this field only
            $container.find('.cert-display, .cert-edit-form').remove();
            
            if (fullValue) {
                // Create meaningful display text from certificate info
                let displayText = '';
                if (certInfo && !certInfo.error) {
                    const parts = [];
                    
                    // Add subject/domain
                    if (certInfo.subject) {
                        parts.push(`📜 ${certInfo.subject}`);
                    }
                    
                    // Add issuer if not self-signed
                    if (certInfo.issuer && !certInfo.is_self_signed) {
                        parts.push(`by ${certInfo.issuer}`);
                    } else if (certInfo.is_self_signed) {
                        parts.push('(Self-signed)');
                    }
                    
                    // Add validity dates
                    if (certInfo.valid_to) {
                        if (certInfo.is_expired) {
                            parts.push(`❌ Expired ${certInfo.valid_to}`);
                        } else if (certInfo.days_until_expiry <= 30) {
                            parts.push(`⚠️ Expires in ${certInfo.days_until_expiry} days`);
                        } else {
                            parts.push(`✅ Valid until ${certInfo.valid_to}`);
                        }
                    }
                    
                    displayText = parts.join(' | ');
                } else {
                    // Fallback to truncated certificate
                    displayText = generalSettingsModify.truncateCertificate(fullValue);
                }
                
                // Hide the original field
                $certPubKeyField.hide();
                
                // Add status color class based on certificate status
                let statusClass = '';
                if (certInfo.is_expired) {
                    statusClass = 'error';
                } else if (certInfo.days_until_expiry <= 30) {
                    statusClass = 'warning';
                }
                
                const displayHtml = `
                    <div class="ui action input fluid cert-display ${statusClass}">
                        <input type="text" value="${generalSettingsModify.escapeHtml(displayText)}" readonly class="truncated-display" />
                        <button class="ui button icon basic copy-btn" data-clipboard-text="${generalSettingsModify.escapeHtml(fullValue)}"
                                data-variation="basic" data-content="${globalTranslate.bt_ToolTipCopyCert}">
                            <i class="copy icon blue"></i>
                        </button>
                        <button class="ui button icon basic info-cert-btn"
                                data-content="${globalTranslate.bt_ToolTipCertInfo}">
                            <i class="info circle icon blue"></i>
                        </button>
                        <button class="ui button icon basic edit-btn"
                                data-content="${globalTranslate.bt_ToolTipEdit}">
                            <i class="edit icon blue"></i>
                        </button>
                        <button class="ui button icon basic delete-cert-btn"
                                data-content="${globalTranslate.bt_ToolTipDelete}">
                            <i class="trash icon red"></i>
                        </button>
                    </div>
                    ${certInfo && !certInfo.error ? generalSettingsModify.renderCertificateDetails(certInfo) : ''}
                    <div class="ui form cert-edit-form" style="display:none;">
                        <div class="field">
                            <textarea id="WEBHTTPSPublicKey_edit" 
                                      rows="10" 
                                      placeholder="${globalTranslate.gs_PastePublicCert}">${fullValue}</textarea>
                        </div>
                        <div class="ui mini buttons">
                            <button class="ui positive button save-cert-btn">
                                <i class="check icon"></i> ${globalTranslate.bt_Save}
                            </button>
                            <button class="ui button cancel-cert-btn">
                                <i class="close icon"></i> ${globalTranslate.bt_Cancel}
                            </button>
                        </div>
                    </div>
                `;
                
                $container.append(displayHtml);
                
                // Handle info button - toggle details display
                $container.find('.info-cert-btn').on('click', function(e) {
                    e.preventDefault();
                    const $details = $container.find('.cert-details');
                    if ($details.length) {
                        $details.slideToggle();
                    }
                });
                
                // Handle edit button
                $container.find('.edit-btn').on('click', function(e) {
                    e.preventDefault();
                    $container.find('.cert-display').hide();
                    $container.find('.cert-edit-form').show();
                    $container.find('#WEBHTTPSPublicKey_edit').focus();
                });
                
                // Handle save button
                $container.find('.save-cert-btn').on('click', function(e) {
                    e.preventDefault();
                    const newValue = $container.find('#WEBHTTPSPublicKey_edit').val();
                    
                    // Update the original hidden field
                    $certPubKeyField.val(newValue);
                    
                    // Trigger form validation
                    if (typeof Form !== 'undefined' && Form.checkValues) {
                        Form.checkValues();
                    }
                    
                    // Re-initialize only the certificate field display with new value
                    generalSettingsModify.initializeCertificateField();
                });
                
                // Handle cancel button
                $container.find('.cancel-cert-btn').on('click', function(e) {
                    e.preventDefault();
                    $container.find('.cert-edit-form').hide();
                    $container.find('.cert-display').show();
                });
                
                // Handle delete button
                $container.find('.delete-cert-btn').on('click', function(e) {
                    e.preventDefault();
                    
                    // Clear the certificate
                    $certPubKeyField.val('');
                    
                    // Trigger form validation
                    if (typeof Form !== 'undefined' && Form.checkValues) {
                        Form.checkValues();
                    }
                    
                    // Re-initialize only the certificate field to show empty field
                    generalSettingsModify.initializeCertificateField();
                });
                
                // Initialize tooltips
                $container.find('[data-content]').popup();
                
                // Re-initialize clipboard for new buttons
                if (generalSettingsModify.clipboard) {
                    generalSettingsModify.clipboard.destroy();
                    generalSettingsModify.initializeClipboard();
                }
            } else {
                // Show the original field for input with proper placeholder
                $certPubKeyField.show();
                $certPubKeyField.attr('placeholder', globalTranslate.gs_PastePublicCert);
                $certPubKeyField.attr('rows', '10');
                
                // Ensure change events trigger form validation
                $certPubKeyField.off('input.cert change.cert keyup.cert').on('input.cert change.cert keyup.cert', function() {
                    if (typeof Form !== 'undefined' && Form.checkValues) {
                        Form.checkValues();
                    }
                });
            }
        }
    },

    /**
     * Initialize truncated fields display for SSH keys and certificates
     */
    initializeTruncatedFields() {
        // Handle SSH_ID_RSA_PUB field
        const $sshPubKeyField = $('#SSH_ID_RSA_PUB');
        if ($sshPubKeyField.length) {
            const fullValue = $sshPubKeyField.val();
            const $container = $sshPubKeyField.parent();
            
            // Remove any existing display elements
            $container.find('.ssh-key-display, .full-display').remove();
            
            // Only create display if there's a value
            if (fullValue) {
                // Create truncated display
                const truncated = generalSettingsModify.truncateSSHKey(fullValue);
                
                // Hide the original field
                $sshPubKeyField.hide();
                
                const displayHtml = `
                    <div class="ui action input fluid ssh-key-display">
                        <input type="text" value="${truncated}" readonly class="truncated-display" />
                        <button class="ui button icon basic copy-btn" data-clipboard-text="${generalSettingsModify.escapeHtml(fullValue)}" 
                                data-variation="basic" data-content="${globalTranslate.bt_ToolTipCopyKey}">
                            <i class="copy icon blue"></i>
                        </button>
                        <button class="ui button icon basic expand-btn" 
                                data-content="${globalTranslate.bt_ToolTipExpand}">
                            <i class="expand icon blue"></i>
                        </button>
                    </div>
                    <textarea class="full-display" style="display:none;" readonly>${fullValue}</textarea>
                `;
                
                $container.append(displayHtml);
            
            // Handle expand/collapse
            $container.find('.expand-btn').on('click', function(e) {
                e.preventDefault();
                const $fullDisplay = $container.find('.full-display');
                const $truncatedDisplay = $container.find('.ssh-key-display');
                const $icon = $(this).find('i');
                
                if ($fullDisplay.is(':visible')) {
                    $fullDisplay.hide();
                    $truncatedDisplay.show();
                    $icon.removeClass('compress').addClass('expand');
                } else {
                    $fullDisplay.show();
                    $truncatedDisplay.hide();
                    $icon.removeClass('expand').addClass('compress');
                }
            });
            
            // Initialize tooltips for new elements
            $container.find('[data-content]').popup();
            } else {
                // Show the original field as read-only (this is a system-generated key)
                $sshPubKeyField.show();
                $sshPubKeyField.attr('readonly', true);
                $sshPubKeyField.attr('placeholder', globalTranslate.gs_NoSSHPublicKey);
            }
        }
        
        // Handle WEBHTTPSPublicKey field - use dedicated method
        generalSettingsModify.initializeCertificateField();
        
        // Handle WEBHTTPSPrivateKey field (write-only with password masking)
        const $certPrivKeyField = $('#WEBHTTPSPrivateKey');
        if ($certPrivKeyField.length) {
            const $container = $certPrivKeyField.parent();
            
            // Remove any existing display elements
            $container.find('.private-key-set, #WEBHTTPSPrivateKey_new').remove();
            
            // Check if private key exists (password masking logic)
            // The field will contain '********' if a private key is set
            const currentValue = $certPrivKeyField.val();
            const hasValue = currentValue === generalSettingsModify.hiddenPassword;
            
            if (hasValue) {
                // Hide original field and show status message
                $certPrivKeyField.hide();
                
                const displayHtml = `
                    <div class="ui info message private-key-set">
                        <p>
                            <i class="lock icon"></i>
                            ${globalTranslate.gs_PrivateKeyIsSet}
                            <a href="#" class="replace-key-link">${globalTranslate.gs_Replace}</a>
                        </p>
                    </div>
                    <textarea id="WEBHTTPSPrivateKey_new" name="WEBHTTPSPrivateKey" 
                              rows="10"
                              style="display:none;" 
                              placeholder="${globalTranslate.gs_PastePrivateKey}"></textarea>
                `;
                
                $container.append(displayHtml);
                
                // Handle replace link
                $container.find('.replace-key-link').on('click', function(e) {
                    e.preventDefault();
                    $container.find('.private-key-set').hide();
                    const $newField = $container.find('#WEBHTTPSPrivateKey_new');
                    $newField.show().focus();
                    
                    // Clear the hidden password value so we can set a new one
                    $certPrivKeyField.val('');
                    
                    // Bind change event to update hidden field and enable save button
                    $newField.on('input change keyup', function() {
                        // Update the original hidden field with new value
                        $certPrivKeyField.val($newField.val());
                        
                        // Trigger form validation check
                        if (typeof Form !== 'undefined' && Form.checkValues) {
                            Form.checkValues();
                        }
                    });
                });
            } else {
                // Show the original field for input with proper placeholder
                $certPrivKeyField.show();
                $certPrivKeyField.attr('placeholder', globalTranslate.gs_PastePrivateKey);
                $certPrivKeyField.attr('rows', '10');
                
                // Ensure change events trigger form validation
                $certPrivKeyField.off('input.priv change.priv keyup.priv').on('input.priv change.priv keyup.priv', function() {
                    if (typeof Form !== 'undefined' && Form.checkValues) {
                        Form.checkValues();
                    }
                });
            }
        }
    },
    
    /**
     * Initialize clipboard functionality for copy buttons
     */
    initializeClipboard() {
        if (generalSettingsModify.clipboard) {
            generalSettingsModify.clipboard.destroy();
        }
        
        generalSettingsModify.clipboard = new ClipboardJS('.copy-btn');
        
        generalSettingsModify.clipboard.on('success', (e) => {
            // Show success message
            const $btn = $(e.trigger);
            const originalIcon = $btn.find('i').attr('class');
            
            $btn.find('i').removeClass().addClass('check icon');
            setTimeout(() => {
                $btn.find('i').removeClass().addClass(originalIcon);
            }, 2000);
            
            // Clear selection
            e.clearSelection();
        });
        
        generalSettingsModify.clipboard.on('error', () => {
            UserMessage.showError(globalTranslate.gs_CopyFailed);
        });
    },
    
    /**
     * Truncate SSH key for display
     * @param {string} key - Full SSH key
     * @return {string} Truncated key
     */
    truncateSSHKey(key) {
        if (!key || key.length < 50) {
            return key;
        }
        
        const parts = key.split(' ');
        if (parts.length >= 2) {
            const keyType = parts[0];
            const keyData = parts[1];
            const comment = parts.slice(2).join(' ');
            
            if (keyData.length > 40) {
                const truncated = keyData.substring(0, 20) + '...' + keyData.substring(keyData.length - 15);
                return `${keyType} ${truncated} ${comment}`.trim();
            }
        }
        
        return key;
    },
    
    /**
     * Truncate certificate for display
     * @param {string} cert - Full certificate
     * @return {string} Truncated certificate in single line format
     */
    truncateCertificate(cert) {
        if (!cert || cert.length < 100) {
            return cert;
        }
        
        const lines = cert.split('\n').filter(line => line.trim());
        
        // Extract first and last meaningful lines
        const firstLine = lines[0] || '';
        const lastLine = lines[lines.length - 1] || '';
        
        // For certificates, show begin and end markers
        if (firstLine.includes('BEGIN CERTIFICATE')) {
            return `${firstLine}...${lastLine}`;
        }
        
        // For other formats, truncate the content
        const cleanCert = cert.replace(/\n/g, ' ').trim();
        if (cleanCert.length > 80) {
            return cleanCert.substring(0, 40) + '...' + cleanCert.substring(cleanCert.length - 30);
        }
        
        return cleanCert;
    },
    
    /**
     * Escape HTML for safe display
     * @param {string} text - Text to escape
     * @return {string} Escaped text
     */
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    },
    
    /**
     * Show, hide ssh password segment according to the value of use SSH password checkbox.
     */
    showHideSSHPassword(){
        if (generalSettingsModify.$disableSSHPassword.checkbox('is checked')) {
            generalSettingsModify.$sshPasswordSegment.hide();
        } else {
            generalSettingsModify.$sshPasswordSegment.show();
        }
        generalSettingsModify.initRules();
    },

    /**
     * Callback function to be called before the form is sent
     * Prepares data for REST API submission
     * @param {Object} settings - The current settings of the form
     * @returns {Object} - The updated settings of the form
     */
    cbBeforeSendForm(settings) {
        const result = settings;

        // Handle private key field
        if (result.data.WEBHTTPSPrivateKey !== undefined) {
            const privateKeyValue = result.data.WEBHTTPSPrivateKey;
            // Only skip sending if the value equals hidden password (unchanged)
            // Send empty string to clear the private key on server
            if (privateKeyValue === generalSettingsModify.hiddenPassword) {
                delete result.data.WEBHTTPSPrivateKey;
            }
            // Empty string '' will be sent to clear the certificate
        }

        // For public key - send empty values to allow clearing
        // Do not delete empty strings - they mean user wants to clear the certificate

        // Clean up unnecessary fields before sending
        const fieldsToRemove = [
            'dirrty',
            'deleteAllInput',
        ];

        // Remove codec_* fields (they're replaced with the codecs array)
        Object.keys(result.data).forEach(key => {
            if (key.startsWith('codec_') || fieldsToRemove.includes(key)) {
                delete result.data[key];
            }
        });
        
        // Check if we should process codecs
        // When sendOnlyChanged is enabled, only process codecs if they were actually changed
        const shouldProcessCodecs = !Form.sendOnlyChanged || generalSettingsModify.codecsChanged;

        if (shouldProcessCodecs) {
            // Collect all codec data when they've been changed
            const arrCodecs = [];

            // Process all codec rows
            $('#audio-codecs-table .codec-row, #video-codecs-table .codec-row').each((currentIndex, obj) => {
                const codecName = $(obj).attr('data-codec-name');
                if (codecName) {
                    const currentDisabled = $(obj).find('.checkbox').checkbox('is unchecked');

                    arrCodecs.push({
                        name: codecName,
                        disabled: currentDisabled,
                        priority: currentIndex,
                    });
                }
            });

            // Include codecs if they were changed or sendOnlyChanged is false
            if (arrCodecs.length > 0) {
                result.data.codecs = arrCodecs;
            }
        }
        
        return result;
    },

    /**
     * Callback function to be called after the form has been sent.
     * Handles REST API response structure
     * @param {Object} response - The response from the server after the form is sent
     */
    cbAfterSendForm(response) {
        $("#error-messages").remove();
        
        // REST API response structure: { result: bool, data: {}, messages: {} }
        if (!response.result) {
            Form.$submitButton.removeClass('disabled');
            generalSettingsModify.generateErrorMessageHtml(response);
        } else {
            // Update password fields to hidden value on success
            generalSettingsModify.$formObj.form('set value', 'WebAdminPassword', generalSettingsModify.hiddenPassword);
            generalSettingsModify.$formObj.form('set value', 'WebAdminPasswordRepeat', generalSettingsModify.hiddenPassword);
            generalSettingsModify.$formObj.form('set value', 'SSHPassword', generalSettingsModify.hiddenPassword);
            generalSettingsModify.$formObj.form('set value', 'SSHPasswordRepeat', generalSettingsModify.hiddenPassword);
            
            // Remove password validation warnings after successful save
            $('.password-validate').fadeOut(300, function() {
                $(this).remove();
            });
        }
        
        // Check delete all conditions if needed
        if (typeof generalSettingsDeleteAll !== 'undefined') {
            generalSettingsDeleteAll.checkDeleteConditions();
        }
    },

    /**
     * Generate error message HTML from REST API response
     * @param {Object} response - API response with error messages
     */
    generateErrorMessageHtml(response) {
        if (response.messages) {
            const $div = $('<div>', { class: 'ui negative message', id: 'error-messages' });
            const $header = $('<div>', { class: 'header' }).text(globalTranslate.gs_ErrorSaveSettings);
            $div.append($header);
            const $ul = $('<ul>', { class: 'list' });
            const messagesSet = new Set();
            
            // Handle both error and validation message types
            ['error', 'validation'].forEach(msgType => {
                if (response.messages[msgType]) {
                    const messages = Array.isArray(response.messages[msgType]) 
                        ? response.messages[msgType] 
                        : [response.messages[msgType]];
                    
                    messages.forEach(error => {
                        let textContent = '';
                        if (typeof error === 'object' && error.message) {
                            textContent = globalTranslate[error.message];
                        } else {
                            textContent = globalTranslate[error];
                        }
                        
                        if (!messagesSet.has(textContent)) {
                            messagesSet.add(textContent);
                            $ul.append($('<li>').text(textContent));
                        }
                    });
                }
            });
            
            $div.append($ul);
            $('#submitbutton').before($div);
        }
    },

    /**
     * Initialize the validation rules of the form
     */
    initRules() {
        // SSHPassword
        if (generalSettingsModify.$disableSSHPassword.checkbox('is checked')) {
            Form.validateRules.SSHPassword.rules = generalSettingsModify.additionalSshValidRulesNoPass;
        } else if (generalSettingsModify.$sshPassword.val() === generalSettingsModify.hiddenPassword) {
            Form.validateRules.SSHPassword.rules = [];
        } else {
            Form.validateRules.SSHPassword.rules = generalSettingsModify.additionalSshValidRulesPass;
        }

        // WebAdminPassword
        if (generalSettingsModify.$webAdminPassword.val() === generalSettingsModify.hiddenPassword) {
            Form.validateRules.WebAdminPassword.rules = [];
        } else {
            Form.validateRules.WebAdminPassword.rules = generalSettingsModify.webAdminPasswordRules;
        }
    },

    /**
     * Render certificate details HTML
     * @param {object} certInfo - Certificate information object
     * @returns {string} HTML for certificate details
     */
    renderCertificateDetails(certInfo) {
        let html = '<div class="cert-details" style="display:none; margin-top:10px;">';
        html += '<div class="ui segment">';
        html += '<div class="ui tiny list">';
        
        // Subject
        if (certInfo.subject) {
            html += `<div class="item"><strong>Subject:</strong> ${generalSettingsModify.escapeHtml(certInfo.subject)}</div>`;
        }
        
        // Issuer
        if (certInfo.issuer) {
            html += `<div class="item"><strong>Issuer:</strong> ${generalSettingsModify.escapeHtml(certInfo.issuer)}`;
            if (certInfo.is_self_signed) {
                html += ' <span class="ui tiny label">Self-signed</span>';
            }
            html += '</div>';
        }
        
        // Validity period
        if (certInfo.valid_from && certInfo.valid_to) {
            html += `<div class="item"><strong>Valid:</strong> ${certInfo.valid_from} to ${certInfo.valid_to}</div>`;
        }
        
        // Expiry status
        if (certInfo.is_expired) {
            html += '<div class="item"><span class="ui tiny red label">Certificate Expired</span></div>';
        } else if (certInfo.days_until_expiry <= 30) {
            html += `<div class="item"><span class="ui tiny yellow label">Expires in ${certInfo.days_until_expiry} days</span></div>`;
        } else if (certInfo.days_until_expiry > 0) {
            html += `<div class="item"><span class="ui tiny green label">Valid for ${certInfo.days_until_expiry} days</span></div>`;
        }
        
        // Subject Alternative Names
        if (certInfo.san && certInfo.san.length > 0) {
            html += '<div class="item"><strong>Alternative Names:</strong>';
            html += '<div class="ui tiny list" style="margin-left:10px;">';
            certInfo.san.forEach(san => {
                html += `<div class="item">${generalSettingsModify.escapeHtml(san)}</div>`;
            });
            html += '</div></div>';
        }
        
        html += '</div>'; // Close list
        html += '</div>'; // Close segment
        html += '</div>'; // Close cert-details
        
        return html;
    },
    
    /**
     * Initialize AMI/AJAM dependency
     * AJAM requires AMI to be enabled since it's an HTTP wrapper over AMI
     */
    initializeAMIAJAMDependency() {
        const $amiCheckbox = $('#AMIEnabled').parent('.checkbox');
        const $ajamCheckbox = $('#AJAMEnabled').parent('.checkbox');
        
        if ($amiCheckbox.length === 0 || $ajamCheckbox.length === 0) {
            return;
        }
        
        // Function to update AJAM state based on AMI state
        const updateAJAMState = () => {
            const isAMIEnabled = $amiCheckbox.checkbox('is checked');
            
            if (!isAMIEnabled) {
                // If AMI is disabled, disable AJAM and make it read-only
                $ajamCheckbox.checkbox('uncheck');
                $ajamCheckbox.addClass('disabled');
                
                // Add tooltip to explain why it's disabled
                $ajamCheckbox.attr('data-tooltip', globalTranslate.gs_AJAMRequiresAMI);
                $ajamCheckbox.attr('data-position', 'top left');
            } else {
                // If AMI is enabled, allow AJAM to be toggled
                $ajamCheckbox.removeClass('disabled');
                $ajamCheckbox.removeAttr('data-tooltip');
                $ajamCheckbox.removeAttr('data-position');
            }
        };
        
        // Initial state
        updateAJAMState();
        
        // Listen for AMI checkbox changes using event delegation
        // This won't override existing handlers
        $('#AMIEnabled').on('change', function() {
            updateAJAMState();
        });
    },


    /**
     * Initialize PBXLanguage change detection for restart warning
     * Shows restart warning only when the language value changes
     */
    initializePBXLanguageWarning() {
        const $languageInput = $('#PBXLanguage');  // Hidden input
        const $languageDropdown = $('#PBXLanguage-dropdown');  // V5.0 pattern dropdown
        const $restartWarning = $('#restart-warning-PBXLanguage');

        // Store original value and data loaded flag
        let originalValue = null;
        let isDataLoaded = false;

        // Hide warning initially
        $restartWarning.hide();

        // Set original value after data loads
        $(document).on('GeneralSettings.dataLoaded', () => {
            originalValue = $languageInput.val();
            isDataLoaded = true;
        });

        // Handle dropdown change event - use V5.0 dropdown selector
        $languageDropdown.dropdown({
            onChange: (value) => {
                // SemanticUIDropdown automatically syncs hidden input value
                // No need to manually update $languageInput

                // Only show warning after data is loaded and value changed from original
                if (isDataLoaded && originalValue !== null && value !== originalValue) {
                    $restartWarning.transition('fade in');
                } else if (isDataLoaded) {
                    $restartWarning.transition('fade out');
                }

                // Trigger form change detection only after data is loaded
                if (isDataLoaded) {
                    Form.dataChanged();
                }
            }
        });
    },
    
    /**
     * Initialize the form with REST API configuration
     */
    initializeForm() {
        Form.$formObj = generalSettingsModify.$formObj;
        
        // Enable REST API mode
        Form.apiSettings.enabled = true;
        Form.apiSettings.apiObject = GeneralSettingsAPI;
        Form.apiSettings.saveMethod = 'saveSettings';

        // Enable checkbox to boolean conversion for cleaner API requests
        Form.convertCheckboxesToBool = true;

        // Enable sending only changed fields for optimal PATCH semantics
        Form.sendOnlyChanged = true;

        // No redirect after save - stay on the same page
        Form.afterSubmitIndexUrl = null;
        Form.afterSubmitModifyUrl = null;
        Form.url = `#`;
        
        Form.validateRules = generalSettingsModify.validateRules;
        Form.cbBeforeSendForm = generalSettingsModify.cbBeforeSendForm;
        Form.cbAfterSendForm = generalSettingsModify.cbAfterSendForm;
        Form.initialize();
    }
};

// When the document is ready, initialize the generalSettings management interface.
$(document).ready(() => {
    generalSettingsModify.initialize();
});