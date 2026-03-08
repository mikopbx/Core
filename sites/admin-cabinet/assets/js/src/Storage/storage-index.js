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

/* global globalRootUrl, globalTranslate, Form, StorageAPI, UserMessage, s3StorageIndex, $ */

/**
 * Storage management module
 */
const storageIndex = {
    /**
     * jQuery object for the local storage form (Tab 2).
     * Sends data to: PATCH /pbxcore/api/v3/storage
     * @type {jQuery}
     */
    $formObj: $('#local-storage-form'),

    /**
     * jQuery object for the submit button (unique to this form).
     * @type {jQuery}
     */
    $submitButton: $('#submitbutton-local'),

    /**
     * jQuery object for the dropdown submit (unique to this form).
     * @type {jQuery}
     */
    $dropdownSubmit: $('#dropdownSubmit-local'),

    /**
     * jQuery object for the dirty field (unique to this form).
     * @type {jQuery}
     */
    $dirrtyField: $('#dirrty-local'),

    /**
     * jQuery object for the records retention period slider.
     * @type {jQuery}
     */
    $recordsSavePeriodSlider: $('#PBXRecordSavePeriodSlider'),


    /**
     * Possible period values for the records retention.
     * Values in days: 30, 90, 180, 360, 1080, '' (infinity)
     */
    saveRecordsPeriod: ['30', '90', '180', '360', '1080', ''],



    /**
     * Validation rules for the local storage form.
     * @type {object}
     */
    validateRules: {},
    
    /**
     * Initialize module with event bindings and component initializations.
     */
    initialize() {
        // Enable tab navigation
        $('#storage-menu').find('.item').tab({
                history: true,
                historyType: 'hash',
                   onVisible: function(tabPath) {
                // Load storage data when storage info tab is activated
                if (tabPath === 'storage-info') {
                    storageIndex.loadStorageData();
                }
                // Re-initialize local storage form when tab becomes visible
                if (tabPath === 'storage-local') {
                    storageIndex.initializeForm();
                }
                // Re-initialize S3 form when cloud tab becomes visible
                if (tabPath === 'storage-cloud' && typeof s3StorageIndex !== 'undefined') {
                    s3StorageIndex.initializeForm();
                }
            },
        });

        // Initialize records save period slider
        storageIndex.$recordsSavePeriodSlider
            .slider({
                min: 0,
                max: 5,
                step: 1,
                smooth: true,
                autoAdjustLabels: false,
                interpretLabel: function (value) {
                    const labels = {
                        0: globalTranslate.st_Store1MonthOfRecords,
                        1: globalTranslate.st_Store3MonthsOfRecords,
                        2: globalTranslate.st_Store6MonthsOfRecords,
                        3: globalTranslate.st_Store1YearOfRecords,
                        4: globalTranslate.st_Store3YearsOfRecords,
                        5: globalTranslate.st_StoreAllPossibleRecords,
                    };
                    return labels[value] || '';
                },
                onChange: storageIndex.cbAfterSelectSavePeriodSlider,
            });

        // Initialize tooltips
        storageIndex.initializeTooltips();

        // Initialize the form
        storageIndex.initializeForm();

        // Load settings from API
        storageIndex.loadSettings();

        // Load storage data on page load
        storageIndex.loadStorageData();
    },
    
    /**
     * Handle event after the select save period slider is changed.
     * @param {number} value - The selected value from the slider.
     */
    cbAfterSelectSavePeriodSlider(value) {
        // Get the save period corresponding to the slider value.
        const savePeriod = storageIndex.saveRecordsPeriod[value];

        // Set the form value for 'PBXRecordSavePeriod' to the selected save period.
        storageIndex.$formObj.form('set value', 'PBXRecordSavePeriod', savePeriod);

        // Update S3 local retention slider maximum (if S3 module loaded)
        if (typeof s3StorageIndex !== 'undefined' && s3StorageIndex.updateSliderLimits) {
            s3StorageIndex.updateSliderLimits(savePeriod);
        }

        // Trigger change event to acknowledge the modification
        Form.dataChanged();
    },


    /**
     * Load Storage settings from API
     */
    loadSettings() {
        StorageAPI.get((response) => {
            if (response.result && response.data) {
                const data = response.data;

                // Set form values for local storage only
                storageIndex.$formObj.form('set values', {
                    PBXRecordSavePeriod: data.PBXRecordSavePeriod || ''
                });

                // Update total retention period slider
                const recordSavePeriod = data.PBXRecordSavePeriod || '';
                const sliderIndex = storageIndex.saveRecordsPeriod.indexOf(recordSavePeriod);
                storageIndex.$recordsSavePeriodSlider.slider(
                    'set value',
                    sliderIndex,
                    false
                );

                // Notify S3 module about total retention change (if loaded)
                if (typeof s3StorageIndex !== 'undefined' && s3StorageIndex.updateSliderLimits) {
                    s3StorageIndex.updateSliderLimits(recordSavePeriod);
                }
            }
        });
    },
    
    /**
     * Load storage usage data from API
     */
    loadStorageData() {
        // Show loading state
        $('#storage-usage-container .dimmer').addClass('active');
        $('#storage-details').hide();

        // Make API call to get storage usage using new StorageAPI
        StorageAPI.getUsage((response) => {
            if (response.result && response.data) {
                storageIndex.renderStorageData(response.data);
            } else {
                $('#storage-usage-container .dimmer').removeClass('active');
                UserMessage.showMultiString(globalTranslate.st_StorageLoadError);
            }
        });
    },
    
    /**
     * Render storage usage data in the UI
     */
    renderStorageData(data) {
        // Hide loading and show details
        $('#storage-usage-container .dimmer').removeClass('active');
        $('#storage-details').show();
        
        // Format size for display
        const formatSize = (sizeInMb) => {
            if (sizeInMb >= 1024) {
                return (sizeInMb / 1024).toFixed(1) + ' GB';
            }
            return sizeInMb.toFixed(1) + ' MB';
        };
        
        // Update header information
        $('#used-space-text').text(formatSize(data.used_space));
        $('#total-size-text').text(formatSize(data.total_size));
        
        // Update progress segments in macOS style
        let accumulatedWidth = 0;
        
        // Process each category
        ['call_recordings', 'cdr_database', 'system_logs', 'modules', 'backups', 'system_caches', 's3_cache', 'other'].forEach(category => {
            const catData = data.categories[category];
            const $segment = $(`.progress-segment[data-category="${category}"]`);
            
            if (catData && catData.percentage > 0) {
                $segment.css('width', catData.percentage + '%').show();
                
                // Add hover tooltip
                const categoryKey = 'st_Category' + category.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
                $segment.attr('title', `${globalTranslate[categoryKey] || category}: ${formatSize(catData.size)} (${catData.percentage}%)`);
                
                accumulatedWidth += catData.percentage;
            } else {
                $segment.hide();
            }
            
            // Update category size in list
            $(`#${category}-size`).text(formatSize(catData ? catData.size : 0));
        });
        
        // Add hover effects for progress segments
        $('.progress-segment').on('mouseenter', function(e) {
            const $this = $(this);
            const tooltip = $('<div class="storage-tooltip"></div>').text($this.attr('title'));
            $('body').append(tooltip);
            
            $(document).on('mousemove.tooltip', function(e) {
                tooltip.css({
                    left: e.pageX + 10,
                    top: e.pageY - 30
                });
            });
        }).on('mouseleave', function() {
            $('.storage-tooltip').remove();
            $(document).off('mousemove.tooltip');
        });
        
        // Highlight category on hover
        $('.category-item').on('mouseenter', function() {
            const category = $(this).data('category');
            $(`.progress-segment[data-category="${category}"]`).css('opacity', '0.7');
        }).on('mouseleave', function() {
            $('.progress-segment').css('opacity', '1');
        });

        // Render remote storage info (S3)
        if (data.remote_storage && data.remote_storage.s3 && data.remote_storage.s3.enabled && data.remote_storage.s3.size > 0) {
            const s3 = data.remote_storage.s3;
            $('#remote-storage-title').text(globalTranslate.st_S3RemoteStorageTitle);
            $('#remote-storage-details').text(
                globalTranslate.st_S3RemoteStorageInfo
                    .replace('%files%', s3.files_count.toLocaleString())
                    .replace('%size%', formatSize(s3.size))
                    .replace('%bucket%', s3.bucket)
            );
            $('#remote-storage-section').show();
        }
    },
    
    /**
     * Build HTML content for tooltip popup
     * @param {Object} config - Tooltip configuration object
     * @returns {string} HTML string for popup content
     */
    buildTooltipContent(config) {
        let html = '<div class="ui relaxed list">';

        // Header
        if (config.header) {
            html += `<div class="item"><strong>${config.header}</strong></div>`;
        }

        // Description
        if (config.description) {
            html += `<div class="item">${config.description}</div>`;
        }

        // Main list
        if (config.list && config.list.length > 0) {
            html += '<div class="item"><ul class="ui list">';
            config.list.forEach(item => {
                if (typeof item === 'string') {
                    html += `<li>${item}</li>`;
                } else if (item.term && item.definition === null) {
                    // Section header
                    html += `</ul><strong>${item.term}</strong><ul class="ui list">`;
                } else if (item.term && item.definition) {
                    // Term with definition
                    html += `<li><strong>${item.term}:</strong> ${item.definition}</li>`;
                }
            });
            html += '</ul></div>';
        }

        // Additional lists (list2-list10)
        for (let i = 2; i <= 10; i++) {
            const listKey = `list${i}`;
            if (config[listKey] && config[listKey].length > 0) {
                html += '<div class="item"><ul class="ui list">';
                config[listKey].forEach(item => {
                    if (typeof item === 'string') {
                        html += `<li>${item}</li>`;
                    }
                });
                html += '</ul></div>';
            }
        }

        // Warning
        if (config.warning) {
            html += '<div class="item"><div class="ui orange message">';
            if (config.warning.header) {
                html += `<div class="header">${config.warning.header}</div>`;
            }
            if (config.warning.text) {
                html += `<p>${config.warning.text}</p>`;
            }
            html += '</div></div>';
        }

        // Examples
        if (config.examples && config.examples.length > 0) {
            if (config.examplesHeader) {
                html += `<div class="item"><strong>${config.examplesHeader}</strong></div>`;
            }
            html += '<div class="item"><pre style="background:#f4f4f4;padding:10px;border-radius:4px;">';
            html += config.examples.join('\n');
            html += '</pre></div>';
        }

        // Note
        if (config.note) {
            html += `<div class="item"><em>${config.note}</em></div>`;
        }

        html += '</div>';
        return html;
    },

    /**
     * Initialize tooltips for form fields
     */
    initializeTooltips() {
        // Tooltip configurations for each field
        const tooltipConfigs = {
            record_retention_period: storageIndex.buildTooltipContent({
                header: globalTranslate.st_tooltip_record_retention_header,
                description: globalTranslate.st_tooltip_record_retention_desc,
                list: [
                    globalTranslate.st_tooltip_record_retention_item1,
                    globalTranslate.st_tooltip_record_retention_item2,
                    globalTranslate.st_tooltip_record_retention_item3,
                    globalTranslate.st_tooltip_record_retention_item4
                ],
                warning: {
                    header: globalTranslate.st_tooltip_record_retention_warning_header,
                    text: globalTranslate.st_tooltip_record_retention_warning
                }
            }),

            s3_enabled: storageIndex.buildTooltipContent({
                header: globalTranslate.st_tooltip_s3_enabled_header,
                description: globalTranslate.st_tooltip_s3_enabled_desc,
                list: [
                    globalTranslate.st_tooltip_s3_enabled_item1,
                    globalTranslate.st_tooltip_s3_enabled_item2,
                    globalTranslate.st_tooltip_s3_enabled_item3
                ]
            }),

            s3_endpoint: storageIndex.buildTooltipContent({
                header: globalTranslate.st_tooltip_s3_endpoint_header,
                description: globalTranslate.st_tooltip_s3_endpoint_desc,
                examples: [
                    'AWS S3: https://s3.ap-southeast-1.amazonaws.com',
                    'Yandex Cloud: https://storage.yandexcloud.net',
                    'VK Cloud: https://hb.kz-ast.vkcloud-storage.ru',
                    'Cloudflare R2: https://<ACCOUNT_ID>.r2.cloudflarestorage.com',
                    'DigitalOcean: https://sgp1.digitaloceanspaces.com',
                    'MinIO: http://minio.example.com:9000',
                ],
                examplesHeader: globalTranslate.st_tooltip_examples
            }),

            s3_region: storageIndex.buildTooltipContent({
                header: globalTranslate.st_tooltip_s3_region_header,
                description: globalTranslate.st_tooltip_s3_region_desc,
                examples: [
                    'us-east-1 (default)',
                    'eu-west-1',
                    'ap-southeast-1'
                ],
                note: globalTranslate.st_tooltip_s3_region_note
            }),

            s3_bucket: storageIndex.buildTooltipContent({
                header: globalTranslate.st_tooltip_s3_bucket_header,
                description: globalTranslate.st_tooltip_s3_bucket_desc,
                list: [
                    globalTranslate.st_tooltip_s3_bucket_item1,
                    globalTranslate.st_tooltip_s3_bucket_item2,
                    globalTranslate.st_tooltip_s3_bucket_item3
                ]
            }),

            s3_access_key: storageIndex.buildTooltipContent({
                header: globalTranslate.st_tooltip_s3_access_key_header,
                description: globalTranslate.st_tooltip_s3_access_key_desc,
                note: globalTranslate.st_tooltip_s3_access_key_note
            }),

            s3_secret_key: storageIndex.buildTooltipContent({
                header: globalTranslate.st_tooltip_s3_secret_key_header,
                description: globalTranslate.st_tooltip_s3_secret_key_desc,
                warning: {
                    header: globalTranslate.st_tooltip_warning,
                    text: globalTranslate.st_tooltip_s3_secret_key_warning
                }
            }),

            local_retention_period: storageIndex.buildTooltipContent({
                header: globalTranslate.st_tooltip_local_retention_header,
                description: globalTranslate.st_tooltip_local_retention_desc,
                list: [
                    globalTranslate.st_tooltip_local_retention_item1,
                    globalTranslate.st_tooltip_local_retention_item2,
                    globalTranslate.st_tooltip_local_retention_item3
                ],
                warning: {
                    header: globalTranslate.st_tooltip_note,
                    text: globalTranslate.st_tooltip_local_retention_warning
                }
            })
        };

        // Initialize popup for each tooltip icon
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
     * Callback function to be called before the form is sent
     * @param {Object} settings - The current settings of the form
     * @returns {Object} - The updated settings of the form
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        result.data = storageIndex.$formObj.form('get values');
        return result;
    },
    
    /**
     * Callback function to be called after the form has been sent.
     * @param {Object} response - The response from the server after the form is sent
     */
    cbAfterSendForm(response) {
        if (!response.success) {
            Form.$submitButton.removeClass('disabled');
        }
    },
    
    /**
     * Initialize the form with custom settings
     */
    initializeForm() {
        Form.$formObj = storageIndex.$formObj;
        Form.$submitButton = storageIndex.$submitButton;
        Form.$dropdownSubmit = storageIndex.$dropdownSubmit;
        Form.$dirrtyField = storageIndex.$dirrtyField;
        Form.validateRules = storageIndex.validateRules;
        Form.cbBeforeSendForm = storageIndex.cbBeforeSendForm;
        Form.cbAfterSendForm = storageIndex.cbAfterSendForm;

        // Configure REST API settings for Form.js (singleton resource)
        Form.apiSettings = {
            enabled: true,
            apiObject: StorageAPI,
            saveMethod: 'update' // Using standard PUT for singleton update
        };

        Form.initialize();
    }
};

// When the document is ready, initialize the storage management interface.
$(document).ready(() => {
    storageIndex.initialize();
});