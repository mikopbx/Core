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
     * jQuery object for S3 stats container.
     * @type {jQuery}
     */
    $s3StatsContainer: $('#s3-stats-container'),

    /**
     * jQuery object for S3 stats message element.
     * @type {jQuery}
     */
    $s3StatsMessage: $('#s3-stats-message'),

    /**
     * jQuery object for S3 stats header.
     * @type {jQuery}
     */
    $s3StatsHeader: $('#s3-stats-header'),

    /**
     * jQuery object for S3 stats details.
     * @type {jQuery}
     */
    $s3StatsDetails: $('#s3-stats-details'),

    /**
     * Possible period values for S3 local retention (in days).
     * Values: 7, 30, 90, 180, 365 days (1 week, 1/3/6 months, 1 year)
     */
    s3LocalDaysPeriod: ['7', '30', '90', '180', '365'],

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
            depends: 's3_enabled',
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
            depends: 's3_enabled',
            rules: [
                {
                    type: 'regExp',
                    value: /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/,
                    prompt: globalTranslate.st_S3BucketInvalid
                }
            ],
        },
    },

    /**
     * Initialize or reinitialize the S3 local retention slider
     * @param {number} maxIndex - Maximum slider index (0-6)
     * @param {number} [initialValue] - Optional initial value to set
     */
    initializeSlider(maxIndex, initialValue) {
        // Destroy existing slider if it exists
        if (s3StorageIndex.$s3LocalDaysSlider.hasClass('slider')) {
            s3StorageIndex.$s3LocalDaysSlider.slider('destroy');
        }

        // Create slider with specified max
        s3StorageIndex.$s3LocalDaysSlider
            .slider({
                min: 0,
                max: maxIndex,
                step: 1,
                smooth: false,
                autoAdjustLabels: false,
                interpretLabel: function (value) {
                    const labels = {
                        0: '7 ' + globalTranslate.st_Days,
                        1: globalTranslate.st_1Month,
                        2: globalTranslate.st_3Months,
                        3: globalTranslate.st_6Months,
                        4: globalTranslate.st_1Year,
                    };
                    return labels[value] || '';
                },
                onChange: s3StorageIndex.cbAfterSelectS3LocalDaysSlider,
            });

        // Set initial value if provided
        if (initialValue !== undefined && initialValue >= 0 && initialValue <= maxIndex) {
            s3StorageIndex.$s3LocalDaysSlider.slider('set value', initialValue, false);
        }
    },

    /**
     * Initialize S3 storage module
     */
    initialize() {
        // Initialize S3 local retention period slider with default max (all options available)
        const defaultMaxIndex = s3StorageIndex.s3LocalDaysPeriod.length - 1;
        s3StorageIndex.initializeSlider(defaultMaxIndex);

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
            // Load S3 stats when settings are shown
            s3StorageIndex.loadS3Stats();
        } else {
            s3StorageIndex.$s3SettingsGroup.hide();
            s3StorageIndex.$s3StatsContainer.hide();
        }
    },

    /**
     * Load S3 synchronization statistics
     */
    loadS3Stats() {
        S3StorageAPI.getStats((response) => {
            if (response.result === true && response.data) {
                s3StorageIndex.displayS3Stats(response.data);
            } else {
                s3StorageIndex.$s3StatsContainer.hide();
            }
        });
    },

    /**
     * Display S3 synchronization statistics
     * @param {Object} stats - Statistics data from API
     */
    displayS3Stats(stats) {
        // Don't show if S3 is disabled
        if (!stats.s3_enabled) {
            s3StorageIndex.$s3StatsContainer.hide();
            return;
        }

        // Build header based on sync status
        let headerText = '';
        let messageClass = 'info';

        switch (stats.sync_status) {
            case 'synced':
                headerText = globalTranslate.st_S3StatusSynced;
                messageClass = 'positive';
                break;
            case 'uploading':
                headerText = globalTranslate.st_S3StatusUploading;
                messageClass = 'info';
                break;
            case 'syncing':
                headerText = globalTranslate.st_S3StatusSyncing
                    .replace('%percent%', stats.sync_percentage);
                messageClass = 'info';
                break;
            case 'pending':
                headerText = globalTranslate.st_S3StatusPending;
                messageClass = 'warning';
                break;
            case 'empty':
                headerText = globalTranslate.st_S3StatusEmpty;
                messageClass = 'info';
                break;
            default:
                headerText = globalTranslate.st_S3StatusDisabled;
                messageClass = 'info';
        }

        // Build details text
        const details = [];

        // Files in S3
        if (stats.files_in_s3 > 0) {
            details.push(globalTranslate.st_S3FilesInCloud
                .replace('%count%', stats.files_in_s3.toLocaleString())
                .replace('%size%', s3StorageIndex.formatSize(stats.total_size_s3_bytes)));
        }

        // Files pending upload
        if (stats.files_local > 0) {
            details.push(globalTranslate.st_S3FilesPending
                .replace('%count%', stats.files_local.toLocaleString())
                .replace('%size%', s3StorageIndex.formatSize(stats.total_size_local_bytes)));
        }

        // Connection status
        if (stats.s3_connected) {
            details.push(globalTranslate.st_S3Connected);
        } else if (stats.s3_enabled) {
            details.push(globalTranslate.st_S3NotConnected);
            messageClass = 'warning';
        }

        // Last upload
        if (stats.last_upload_at) {
            details.push(globalTranslate.st_S3LastUpload
                .replace('%date%', stats.last_upload_at));
        }

        // Update message styling
        s3StorageIndex.$s3StatsMessage
            .removeClass('info positive warning negative')
            .addClass(messageClass);

        // Update content
        s3StorageIndex.$s3StatsHeader.text(headerText);
        s3StorageIndex.$s3StatsDetails.html(details.join('<br>'));

        // Show container
        s3StorageIndex.$s3StatsContainer.show();
    },

    /**
     * Format bytes to human-readable size
     * @param {number} bytes - Size in bytes
     * @returns {string} Formatted size string
     */
    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

        // Get current value before reinitializing
        const currentIndex = s3StorageIndex.$s3LocalDaysSlider.slider('get value');

        // Clamp value to new max if needed
        const newValue = Math.min(currentIndex, maxIndex);

        // Reinitialize slider with new max (fixes visual positioning issue)
        s3StorageIndex.initializeSlider(maxIndex, newValue);

        // Update form value if it changed
        if (currentIndex > maxIndex) {
            s3StorageIndex.$formObj.form('set value', 'PBXRecordS3LocalDays', s3StorageIndex.s3LocalDaysPeriod[maxIndex]);
        }
    },

    /**
     * Get maximum allowed local retention index based on total retention period
     * @param {string} totalPeriod - Total retention period in days ('' for infinity)
     * @returns {number} Maximum index for s3LocalDaysPeriod array
     */
    getMaxLocalRetentionIndex(totalPeriod) {
        // If total period is infinity (empty, null, undefined, 0, or '0'), allow all local options
        if (!totalPeriod || totalPeriod === '' || totalPeriod === '0' || totalPeriod === 0) {
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
                const localDays = String(data.PBXRecordS3LocalDays);
                let localIndex = s3StorageIndex.s3LocalDaysPeriod.indexOf(localDays);

                // Fallback for legacy values not in new array - find closest valid value
                if (localIndex < 0) {
                    const localDaysNum = parseInt(localDays) || 7;
                    // Find the smallest value >= localDaysNum, or use first if all are larger
                    localIndex = 0;
                    for (let i = 0; i < s3StorageIndex.s3LocalDaysPeriod.length; i++) {
                        if (parseInt(s3StorageIndex.s3LocalDaysPeriod[i]) >= localDaysNum) {
                            localIndex = i;
                            break;
                        }
                        localIndex = i; // Use last if none found
                    }
                }

                s3StorageIndex.$s3LocalDaysSlider.slider('set value', localIndex);
                s3StorageIndex.$formObj.form('set value', 'PBXRecordS3LocalDays', s3StorageIndex.s3LocalDaysPeriod[localIndex]);

                // Update visibility
                s3StorageIndex.toggleS3SettingsVisibility();

                // Load S3 stats if enabled
                if (data.s3_enabled === '1' || data.s3_enabled === 1 || data.s3_enabled === true) {
                    s3StorageIndex.loadS3Stats();
                }
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
