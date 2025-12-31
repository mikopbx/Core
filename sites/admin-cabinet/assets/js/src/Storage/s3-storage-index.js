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

/* global globalRootUrl, globalTranslate, Form, S3StorageAPI, UserMessage, $ */

/**
 * S3 Storage management module
 * Handles S3 cloud storage settings (Tab 3)
 * Sends data to: PATCH /pbxcore/api/v3/s3-storage
 */
const s3StorageIndex = {
    /**
     * jQuery object for the S3 storage form.
     * @type {jQuery}
     */
    $formObj: $('#s3-storage-form'),

    /**
     * jQuery object for the submit button (unique to this form).
     * @type {jQuery}
     */
    $submitButton: $('#submitbutton-s3'),

    /**
     * jQuery object for the dropdown submit (unique to this form).
     * @type {jQuery}
     */
    $dropdownSubmit: $('#dropdownSubmit-s3'),

    /**
     * jQuery object for the dirty field (unique to this form).
     * @type {jQuery}
     */
    $dirrtyField: $('#dirrty-s3'),

    /**
     * jQuery object for the S3 local retention period slider.
     * @type {jQuery}
     */
    $s3LocalDaysSlider: $('#PBXRecordS3LocalDaysSlider'),

    /**
     * jQuery object for S3 enabled checkbox.
     * @type {jQuery}
     */
    $s3EnabledCheckbox: $('#s3-enabled-checkbox'),

    /**
     * jQuery object for S3 settings group container.
     * @type {jQuery}
     */
    $s3SettingsGroup: $('#s3-settings-group'),

    /**
     * jQuery object for test S3 connection button.
     * @type {jQuery}
     */
    $testS3Button: $('#test-s3-connection'),

    /**
     * Possible period values for S3 local retention (in days).
     * Values: 1, 3, 7, 14, 30, 60, 90 days
     */
    s3LocalDaysPeriod: ['1', '3', '7', '14', '30', '60', '90'],

    /**
     * Maximum allowed local retention period from main storage slider
     * Updated by storage-index.js when main slider changes
     */
    maxLocalRetentionDays: null,

    /**
     * Validation rules for the S3 form fields.
     * @type {object}
     */
    validateRules: {
        s3_endpoint: {
            identifier: 's3_endpoint',
            optional: true,
            rules: [
                {
                    type: 'url',
                    prompt: globalTranslate.st_S3EndpointInvalid
                }
            ],
        },
        s3_bucket: {
            identifier: 's3_bucket',
            optional: true,
            rules: [
                {
                    type: 'regExp',
                    value: /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/,
                    prompt: globalTranslate.st_S3BucketInvalid
                }
            ],
        },
    },

    /**
     * Initialize S3 storage module
     */
    initialize() {
        // Initialize S3 local retention period slider
        s3StorageIndex.$s3LocalDaysSlider
            .slider({
                min: 0,
                max: 6,
                step: 1,
                smooth: true,
                autoAdjustLabels: false,
                interpretLabel: function (value) {
                    const labels = {
                        0: '1 ' + globalTranslate.st_Day,
                        1: '3 ' + globalTranslate.st_Days,
                        2: '7 ' + globalTranslate.st_Days,
                        3: '14 ' + globalTranslate.st_Days,
                        4: '30 ' + globalTranslate.st_Days,
                        5: '60 ' + globalTranslate.st_Days,
                        6: '90 ' + globalTranslate.st_Days,
                    };
                    return labels[value] || '';
                },
                onChange: s3StorageIndex.cbAfterSelectS3LocalDaysSlider,
            });

        // Initialize S3 enabled checkbox
        s3StorageIndex.$s3EnabledCheckbox.checkbox({
            onChange: s3StorageIndex.toggleS3SettingsVisibility
        });

        // Test S3 connection button handler
        s3StorageIndex.$testS3Button.on('click', s3StorageIndex.testS3Connection);

        // Initialize form
        s3StorageIndex.initializeForm();

        // Load S3 settings
        s3StorageIndex.loadSettings();
    },

    /**
     * Toggle S3 settings group visibility based on checkbox state
     */
    toggleS3SettingsVisibility() {
        if (s3StorageIndex.$s3EnabledCheckbox.checkbox('is checked')) {
            s3StorageIndex.$s3SettingsGroup.show();
        } else {
            s3StorageIndex.$s3SettingsGroup.hide();
        }
    },

    /**
     * Callback after S3 local days slider value changes
     * @param {number} value - Slider value (0-6)
     */
    cbAfterSelectS3LocalDaysSlider(value) {
        // Get the local retention period corresponding to the slider value
        const localDays = s3StorageIndex.s3LocalDaysPeriod[value];

        // Set the form value for 'PBXRecordS3LocalDays'
        s3StorageIndex.$formObj.form('set value', 'PBXRecordS3LocalDays', localDays);

        // Trigger change event
        Form.dataChanged();
    },

    /**
     * Update S3 local slider limits based on total retention period
     * Called by storage-index.js when main slider changes
     * @param {string} totalPeriod - Total retention period in days ('' for infinity)
     */
    updateSliderLimits(totalPeriod) {
        // Store for reference
        s3StorageIndex.maxLocalRetentionDays = totalPeriod;

        // Calculate max index
        const maxIndex = s3StorageIndex.getMaxLocalRetentionIndex(totalPeriod);

        // Get current value
        const currentIndex = s3StorageIndex.$s3LocalDaysSlider.slider('get value');

        // Update slider max
        s3StorageIndex.$s3LocalDaysSlider.slider('setting', 'max', maxIndex);

        // If current value exceeds new max, reset to max
        if (currentIndex > maxIndex) {
            s3StorageIndex.$s3LocalDaysSlider.slider('set value', maxIndex);
            s3StorageIndex.$formObj.form('set value', 'PBXRecordS3LocalDays', s3StorageIndex.s3LocalDaysPeriod[maxIndex]);
        }
    },

    /**
     * Get maximum allowed local retention index based on total retention period
     * @param {string} totalPeriod - Total retention period in days ('' for infinity)
     * @returns {number} Maximum index for s3LocalDaysPeriod array
     */
    getMaxLocalRetentionIndex(totalPeriod) {
        // If total period is infinity, allow all local options
        if (totalPeriod === '' || totalPeriod === null || totalPeriod === undefined) {
            return s3StorageIndex.s3LocalDaysPeriod.length - 1;
        }

        const totalDays = parseInt(totalPeriod);
        let maxIndex = s3StorageIndex.s3LocalDaysPeriod.length - 1;

        // Find the highest local retention that is less than total
        for (let i = s3StorageIndex.s3LocalDaysPeriod.length - 1; i >= 0; i--) {
            const localDays = parseInt(s3StorageIndex.s3LocalDaysPeriod[i]);
            if (localDays < totalDays) {
                maxIndex = i;
                break;
            }
        }

        return maxIndex;
    },

    /**
     * Test S3 connection with current form values
     */
    testS3Connection() {
        // Show loading state
        s3StorageIndex.$testS3Button.addClass('loading disabled');

        // Get form values
        const testData = {
            s3_endpoint: s3StorageIndex.$formObj.form('get value', 's3_endpoint'),
            s3_region: s3StorageIndex.$formObj.form('get value', 's3_region'),
            s3_bucket: s3StorageIndex.$formObj.form('get value', 's3_bucket'),
            s3_access_key: s3StorageIndex.$formObj.form('get value', 's3_access_key'),
            s3_secret_key: s3StorageIndex.$formObj.form('get value', 's3_secret_key')
        };

        // Call API to test connection
        S3StorageAPI.testConnection(testData, (response) => {
            // Remove loading state
            s3StorageIndex.$testS3Button.removeClass('loading disabled');

            if (response && response.result === true) {
                const message = response.data?.message || globalTranslate.st_S3TestSuccess;
                UserMessage.showInformation(message, globalTranslate.st_S3TestConnectionHeader);
            } else {
                const errorMessage = response?.data?.message || globalTranslate.st_S3TestFailed;
                UserMessage.showError(errorMessage, globalTranslate.st_S3TestConnectionHeader);
            }
        });
    },

    /**
     * Load S3 settings from API
     */
    loadSettings() {
        S3StorageAPI.get((response) => {
            if (response.result === true && response.data) {
                const data = response.data;

                // Set checkbox state
                if (data.s3_enabled === '1' || data.s3_enabled === 1 || data.s3_enabled === true) {
                    s3StorageIndex.$s3EnabledCheckbox.checkbox('set checked');
                } else {
                    s3StorageIndex.$s3EnabledCheckbox.checkbox('set unchecked');
                }

                // Set text fields
                s3StorageIndex.$formObj.form('set value', 's3_endpoint', data.s3_endpoint || '');
                s3StorageIndex.$formObj.form('set value', 's3_region', data.s3_region || '');
                s3StorageIndex.$formObj.form('set value', 's3_bucket', data.s3_bucket || '');
                s3StorageIndex.$formObj.form('set value', 's3_access_key', data.s3_access_key || '');
                s3StorageIndex.$formObj.form('set value', 's3_secret_key', data.s3_secret_key || '');

                // Set S3 local retention slider
                const localDays = data.PBXRecordS3LocalDays || '7';
                const localIndex = s3StorageIndex.s3LocalDaysPeriod.indexOf(localDays);
                if (localIndex >= 0) {
                    s3StorageIndex.$s3LocalDaysSlider.slider('set value', localIndex);
                }
                s3StorageIndex.$formObj.form('set value', 'PBXRecordS3LocalDays', localDays);

                // Update visibility
                s3StorageIndex.toggleS3SettingsVisibility();
            }
        });
    },

    /**
     * Callback before form is sent
     * @param {Object} settings - Form settings
     * @returns {Object} Updated settings
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        result.data = s3StorageIndex.$formObj.form('get values');
        return result;
    },

    /**
     * Callback after form has been sent
     * @param {Object} response - Server response
     */
    cbAfterSendForm(response) {
        if (response.success) {
            // Reload settings to show updated values
            s3StorageIndex.loadSettings();
        } else {
            Form.$submitButton.removeClass('disabled');
        }
    },

    /**
     * Initialize the form with custom settings
     */
    initializeForm() {
        Form.$formObj = s3StorageIndex.$formObj;
        Form.$submitButton = s3StorageIndex.$submitButton;
        Form.$dropdownSubmit = s3StorageIndex.$dropdownSubmit;
        Form.$dirrtyField = s3StorageIndex.$dirrtyField;
        Form.validateRules = s3StorageIndex.validateRules;
        Form.cbBeforeSendForm = s3StorageIndex.cbBeforeSendForm;
        Form.cbAfterSendForm = s3StorageIndex.cbAfterSendForm;

        // Configure REST API settings for Form.js (singleton resource)
        Form.apiSettings = {
            enabled: true,
            apiObject: S3StorageAPI,
            saveMethod: 'patch' // Using PATCH for partial updates
        };

        Form.initialize();
    }
};

// Initialize when document is ready
$(document).ready(() => {
    s3StorageIndex.initialize();
});
