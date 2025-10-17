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

/* global globalRootUrl, globalTranslate, Form, StorageAPI, UserMessage, $ */

/**
 * Storage management module 
 */
const storageIndex = {
    /**
     * jQuery object for the form.
     * @type {jQuery}
     */
    $formObj: $('#storage-form'),
    
    /**
     * jQuery object for the records retention period slider.
     * @type {jQuery}
     */
    $recordsSavePeriodSlider: $('#PBXRecordSavePeriodSlider'),
    
    /**
     * Possible period values for the records retention.
     */
    saveRecordsPeriod: ['30', '90', '180', '360', '1080', ''],
    
    /**
     * Validation rules for the form fields before submission.
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
            },
        });

        // Initialize records save period slider
        storageIndex.$recordsSavePeriodSlider
            .slider({
                min: 0,
                max: 5,
                step: 1,
                smooth: true,
                showLabelTicks: 'always',
                interpretLabel: function (value) {
                    let labels = [
                        globalTranslate.st_Store1MonthOfRecords,
                        globalTranslate.st_Store3MonthsOfRecords,
                        globalTranslate.st_Store6MonthsOfRecords,
                        globalTranslate.st_Store1YearOfRecords,
                        globalTranslate.st_Store3YearsOfRecords,
                        globalTranslate.st_StoreAllPossibleRecords,
                    ];
                    return labels[value];
                },
                onChange: storageIndex.cbAfterSelectSavePeriodSlider,
            });

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
                // Set form values
                storageIndex.$formObj.form('set values', {
                    PBXRecordSavePeriod: data.PBXRecordSavePeriod
                });

                // Update slider
                const recordSavePeriod = data.PBXRecordSavePeriod || '';
                storageIndex.$recordsSavePeriodSlider.slider('set value', storageIndex.saveRecordsPeriod.indexOf(recordSavePeriod), false);
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
        ['call_recordings', 'cdr_database', 'system_logs', 'modules', 'backups', 'system_caches', 'other'].forEach(category => {
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