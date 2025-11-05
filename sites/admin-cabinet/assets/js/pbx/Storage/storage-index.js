"use strict";

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
var storageIndex = {
  /**
   * jQuery object for the local storage form (Tab 2).
   * Sends data to: PATCH /pbxcore/api/v3/storage
   * @type {jQuery}
   */
  $formObj: $('#local-storage-form'),

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
  initialize: function initialize() {
    // Enable tab navigation
    $('#storage-menu').find('.item').tab({
      history: true,
      historyType: 'hash',
      onVisible: function onVisible(tabPath) {
        // Load storage data when storage info tab is activated
        if (tabPath === 'storage-info') {
          storageIndex.loadStorageData();
        }
      }
    }); // Initialize records save period slider

    storageIndex.$recordsSavePeriodSlider.slider({
      min: 0,
      max: 5,
      step: 1,
      smooth: true,
      autoAdjustLabels: false,
      interpretLabel: function interpretLabel(value) {
        var labels = {
          0: globalTranslate.st_Store1MonthOfRecords,
          1: globalTranslate.st_Store3MonthsOfRecords,
          2: globalTranslate.st_Store6MonthsOfRecords,
          3: globalTranslate.st_Store1YearOfRecords,
          4: globalTranslate.st_Store3YearsOfRecords,
          5: globalTranslate.st_StoreAllPossibleRecords
        };
        return labels[value] || '';
      },
      onChange: storageIndex.cbAfterSelectSavePeriodSlider
    }); // Initialize tooltips

    storageIndex.initializeTooltips(); // Initialize the form

    storageIndex.initializeForm(); // Load settings from API

    storageIndex.loadSettings(); // Load storage data on page load

    storageIndex.loadStorageData();
  },

  /**
   * Handle event after the select save period slider is changed.
   * @param {number} value - The selected value from the slider.
   */
  cbAfterSelectSavePeriodSlider: function cbAfterSelectSavePeriodSlider(value) {
    // Get the save period corresponding to the slider value.
    var savePeriod = storageIndex.saveRecordsPeriod[value]; // Set the form value for 'PBXRecordSavePeriod' to the selected save period.

    storageIndex.$formObj.form('set value', 'PBXRecordSavePeriod', savePeriod); // Update S3 local retention slider maximum (if S3 module loaded)

    if (typeof s3StorageIndex !== 'undefined' && s3StorageIndex.updateSliderLimits) {
      s3StorageIndex.updateSliderLimits(savePeriod);
    } // Trigger change event to acknowledge the modification


    Form.dataChanged();
  },

  /**
   * Load Storage settings from API
   */
  loadSettings: function loadSettings() {
    StorageAPI.get(function (response) {
      if (response.result && response.data) {
        var data = response.data; // Set form values for local storage only

        storageIndex.$formObj.form('set values', {
          PBXRecordSavePeriod: data.PBXRecordSavePeriod || ''
        }); // Update total retention period slider

        var recordSavePeriod = data.PBXRecordSavePeriod || '';
        storageIndex.$recordsSavePeriodSlider.slider('set value', storageIndex.saveRecordsPeriod.indexOf(recordSavePeriod), false); // Notify S3 module about total retention change (if loaded)

        if (typeof s3StorageIndex !== 'undefined' && s3StorageIndex.updateSliderLimits) {
          s3StorageIndex.updateSliderLimits(recordSavePeriod);
        }
      }
    });
  },

  /**
   * Load storage usage data from API
   */
  loadStorageData: function loadStorageData() {
    // Show loading state
    $('#storage-usage-container .dimmer').addClass('active');
    $('#storage-details').hide(); // Make API call to get storage usage using new StorageAPI

    StorageAPI.getUsage(function (response) {
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
  renderStorageData: function renderStorageData(data) {
    // Hide loading and show details
    $('#storage-usage-container .dimmer').removeClass('active');
    $('#storage-details').show(); // Format size for display

    var formatSize = function formatSize(sizeInMb) {
      if (sizeInMb >= 1024) {
        return (sizeInMb / 1024).toFixed(1) + ' GB';
      }

      return sizeInMb.toFixed(1) + ' MB';
    }; // Update header information


    $('#used-space-text').text(formatSize(data.used_space));
    $('#total-size-text').text(formatSize(data.total_size)); // Update progress segments in macOS style

    var accumulatedWidth = 0; // Process each category

    ['call_recordings', 'cdr_database', 'system_logs', 'modules', 'backups', 'system_caches', 'other'].forEach(function (category) {
      var catData = data.categories[category];
      var $segment = $(".progress-segment[data-category=\"".concat(category, "\"]"));

      if (catData && catData.percentage > 0) {
        $segment.css('width', catData.percentage + '%').show(); // Add hover tooltip

        var categoryKey = 'st_Category' + category.split('_').map(function (word) {
          return word.charAt(0).toUpperCase() + word.slice(1);
        }).join('');
        $segment.attr('title', "".concat(globalTranslate[categoryKey] || category, ": ").concat(formatSize(catData.size), " (").concat(catData.percentage, "%)"));
        accumulatedWidth += catData.percentage;
      } else {
        $segment.hide();
      } // Update category size in list


      $("#".concat(category, "-size")).text(formatSize(catData ? catData.size : 0));
    }); // Add hover effects for progress segments

    $('.progress-segment').on('mouseenter', function (e) {
      var $this = $(this);
      var tooltip = $('<div class="storage-tooltip"></div>').text($this.attr('title'));
      $('body').append(tooltip);
      $(document).on('mousemove.tooltip', function (e) {
        tooltip.css({
          left: e.pageX + 10,
          top: e.pageY - 30
        });
      });
    }).on('mouseleave', function () {
      $('.storage-tooltip').remove();
      $(document).off('mousemove.tooltip');
    }); // Highlight category on hover

    $('.category-item').on('mouseenter', function () {
      var category = $(this).data('category');
      $(".progress-segment[data-category=\"".concat(category, "\"]")).css('opacity', '0.7');
    }).on('mouseleave', function () {
      $('.progress-segment').css('opacity', '1');
    });
  },

  /**
   * Build HTML content for tooltip popup
   * @param {Object} config - Tooltip configuration object
   * @returns {string} HTML string for popup content
   */
  buildTooltipContent: function buildTooltipContent(config) {
    var html = '<div class="ui relaxed list">'; // Header

    if (config.header) {
      html += "<div class=\"item\"><strong>".concat(config.header, "</strong></div>");
    } // Description


    if (config.description) {
      html += "<div class=\"item\">".concat(config.description, "</div>");
    } // Main list


    if (config.list && config.list.length > 0) {
      html += '<div class="item"><ul class="ui list">';
      config.list.forEach(function (item) {
        if (typeof item === 'string') {
          html += "<li>".concat(item, "</li>");
        } else if (item.term && item.definition === null) {
          // Section header
          html += "</ul><strong>".concat(item.term, "</strong><ul class=\"ui list\">");
        } else if (item.term && item.definition) {
          // Term with definition
          html += "<li><strong>".concat(item.term, ":</strong> ").concat(item.definition, "</li>");
        }
      });
      html += '</ul></div>';
    } // Additional lists (list2-list10)


    for (var i = 2; i <= 10; i++) {
      var listKey = "list".concat(i);

      if (config[listKey] && config[listKey].length > 0) {
        html += '<div class="item"><ul class="ui list">';
        config[listKey].forEach(function (item) {
          if (typeof item === 'string') {
            html += "<li>".concat(item, "</li>");
          }
        });
        html += '</ul></div>';
      }
    } // Warning


    if (config.warning) {
      html += '<div class="item"><div class="ui orange message">';

      if (config.warning.header) {
        html += "<div class=\"header\">".concat(config.warning.header, "</div>");
      }

      if (config.warning.text) {
        html += "<p>".concat(config.warning.text, "</p>");
      }

      html += '</div></div>';
    } // Examples


    if (config.examples && config.examples.length > 0) {
      if (config.examplesHeader) {
        html += "<div class=\"item\"><strong>".concat(config.examplesHeader, "</strong></div>");
      }

      html += '<div class="item"><pre style="background:#f4f4f4;padding:10px;border-radius:4px;">';
      html += config.examples.join('\n');
      html += '</pre></div>';
    } // Note


    if (config.note) {
      html += "<div class=\"item\"><em>".concat(config.note, "</em></div>");
    }

    html += '</div>';
    return html;
  },

  /**
   * Initialize tooltips for form fields
   */
  initializeTooltips: function initializeTooltips() {
    // Tooltip configurations for each field
    var tooltipConfigs = {
      record_retention_period: storageIndex.buildTooltipContent({
        header: globalTranslate.st_tooltip_record_retention_header || 'Total Retention Period',
        description: globalTranslate.st_tooltip_record_retention_desc || 'How long call recordings are kept in the system',
        list: [globalTranslate.st_tooltip_record_retention_item1 || '30 days - minimum storage period', globalTranslate.st_tooltip_record_retention_item2 || '90 days - recommended for small businesses', globalTranslate.st_tooltip_record_retention_item3 || '1 year - compliance requirements', globalTranslate.st_tooltip_record_retention_item4 || 'Unlimited - keep all recordings'],
        warning: {
          header: globalTranslate.st_tooltip_record_retention_warning_header || 'Storage Warning',
          text: globalTranslate.st_tooltip_record_retention_warning || 'Longer retention periods require more disk space'
        }
      }),
      s3_enabled: storageIndex.buildTooltipContent({
        header: globalTranslate.st_tooltip_s3_enabled_header || 'Cloud Storage',
        description: globalTranslate.st_tooltip_s3_enabled_desc || 'Upload recordings to S3-compatible cloud storage for backup and archival',
        list: [globalTranslate.st_tooltip_s3_enabled_item1 || 'Automatic upload after recording completion', globalTranslate.st_tooltip_s3_enabled_item2 || 'Frees up local disk space', globalTranslate.st_tooltip_s3_enabled_item3 || 'Compatible with AWS S3, MinIO, Wasabi']
      }),
      s3_endpoint: storageIndex.buildTooltipContent({
        header: globalTranslate.st_tooltip_s3_endpoint_header || 'S3 Endpoint URL',
        description: globalTranslate.st_tooltip_s3_endpoint_desc || 'API endpoint for your S3-compatible storage service',
        examples: ['AWS S3: https://s3.amazonaws.com', 'MinIO: http://minio.example.com:9000', 'Wasabi: https://s3.wasabisys.com'],
        examplesHeader: globalTranslate.st_tooltip_examples || 'Examples'
      }),
      s3_region: storageIndex.buildTooltipContent({
        header: globalTranslate.st_tooltip_s3_region_header || 'S3 Region',
        description: globalTranslate.st_tooltip_s3_region_desc || 'Geographic region where your bucket is located',
        examples: ['us-east-1 (default)', 'eu-west-1', 'ap-southeast-1'],
        note: globalTranslate.st_tooltip_s3_region_note || 'Must match your bucket region for AWS S3'
      }),
      s3_bucket: storageIndex.buildTooltipContent({
        header: globalTranslate.st_tooltip_s3_bucket_header || 'Bucket Name',
        description: globalTranslate.st_tooltip_s3_bucket_desc || 'Name of the S3 bucket for storing recordings',
        list: [globalTranslate.st_tooltip_s3_bucket_item1 || 'Must be unique across all S3 users (for AWS)', globalTranslate.st_tooltip_s3_bucket_item2 || 'Only lowercase letters, numbers, hyphens', globalTranslate.st_tooltip_s3_bucket_item3 || 'Must already exist - will not be created']
      }),
      s3_access_key: storageIndex.buildTooltipContent({
        header: globalTranslate.st_tooltip_s3_access_key_header || 'Access Key ID',
        description: globalTranslate.st_tooltip_s3_access_key_desc || 'Public identifier for API authentication',
        note: globalTranslate.st_tooltip_s3_access_key_note || 'Similar to username - safe to display'
      }),
      s3_secret_key: storageIndex.buildTooltipContent({
        header: globalTranslate.st_tooltip_s3_secret_key_header || 'Secret Access Key',
        description: globalTranslate.st_tooltip_s3_secret_key_desc || 'Private key for API authentication',
        warning: {
          header: globalTranslate.st_tooltip_warning || 'Security Warning',
          text: globalTranslate.st_tooltip_s3_secret_key_warning || 'Keep this secret safe - treat it like a password'
        }
      }),
      local_retention_period: storageIndex.buildTooltipContent({
        header: globalTranslate.st_tooltip_local_retention_header || 'Local Retention Period',
        description: globalTranslate.st_tooltip_local_retention_desc || 'How long to keep recordings locally before deleting',
        list: [globalTranslate.st_tooltip_local_retention_item1 || 'After this period, recordings are deleted from local storage', globalTranslate.st_tooltip_local_retention_item2 || 'Files remain in S3 cloud storage', globalTranslate.st_tooltip_local_retention_item3 || 'Cannot exceed total retention period'],
        warning: {
          header: globalTranslate.st_tooltip_note || 'Note',
          text: globalTranslate.st_tooltip_local_retention_warning || 'Shorter local retention frees disk space faster'
        }
      })
    }; // Initialize popup for each tooltip icon

    $('.field-info-icon').each(function (index, element) {
      var $icon = $(element);
      var fieldName = $icon.data('field');
      var content = tooltipConfigs[fieldName];

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
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    var result = settings;
    result.data = storageIndex.$formObj.form('get values');
    return result;
  },

  /**
   * Callback function to be called after the form has been sent.
   * @param {Object} response - The response from the server after the form is sent
   */
  cbAfterSendForm: function cbAfterSendForm(response) {
    if (!response.success) {
      Form.$submitButton.removeClass('disabled');
    }
  },

  /**
   * Initialize the form with custom settings
   */
  initializeForm: function initializeForm() {
    Form.$formObj = storageIndex.$formObj;
    Form.validateRules = storageIndex.validateRules;
    Form.cbBeforeSendForm = storageIndex.cbBeforeSendForm;
    Form.cbAfterSendForm = storageIndex.cbAfterSendForm; // Configure REST API settings for Form.js (singleton resource)

    Form.apiSettings = {
      enabled: true,
      apiObject: StorageAPI,
      saveMethod: 'update' // Using standard PUT for singleton update

    };
    Form.initialize();
  }
}; // When the document is ready, initialize the storage management interface.

$(document).ready(function () {
  storageIndex.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TdG9yYWdlL3N0b3JhZ2UtaW5kZXguanMiXSwibmFtZXMiOlsic3RvcmFnZUluZGV4IiwiJGZvcm1PYmoiLCIkIiwiJHJlY29yZHNTYXZlUGVyaW9kU2xpZGVyIiwic2F2ZVJlY29yZHNQZXJpb2QiLCJ2YWxpZGF0ZVJ1bGVzIiwiaW5pdGlhbGl6ZSIsImZpbmQiLCJ0YWIiLCJoaXN0b3J5IiwiaGlzdG9yeVR5cGUiLCJvblZpc2libGUiLCJ0YWJQYXRoIiwibG9hZFN0b3JhZ2VEYXRhIiwic2xpZGVyIiwibWluIiwibWF4Iiwic3RlcCIsInNtb290aCIsImF1dG9BZGp1c3RMYWJlbHMiLCJpbnRlcnByZXRMYWJlbCIsInZhbHVlIiwibGFiZWxzIiwiZ2xvYmFsVHJhbnNsYXRlIiwic3RfU3RvcmUxTW9udGhPZlJlY29yZHMiLCJzdF9TdG9yZTNNb250aHNPZlJlY29yZHMiLCJzdF9TdG9yZTZNb250aHNPZlJlY29yZHMiLCJzdF9TdG9yZTFZZWFyT2ZSZWNvcmRzIiwic3RfU3RvcmUzWWVhcnNPZlJlY29yZHMiLCJzdF9TdG9yZUFsbFBvc3NpYmxlUmVjb3JkcyIsIm9uQ2hhbmdlIiwiY2JBZnRlclNlbGVjdFNhdmVQZXJpb2RTbGlkZXIiLCJpbml0aWFsaXplVG9vbHRpcHMiLCJpbml0aWFsaXplRm9ybSIsImxvYWRTZXR0aW5ncyIsInNhdmVQZXJpb2QiLCJmb3JtIiwiczNTdG9yYWdlSW5kZXgiLCJ1cGRhdGVTbGlkZXJMaW1pdHMiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJTdG9yYWdlQVBJIiwiZ2V0IiwicmVzcG9uc2UiLCJyZXN1bHQiLCJkYXRhIiwiUEJYUmVjb3JkU2F2ZVBlcmlvZCIsInJlY29yZFNhdmVQZXJpb2QiLCJpbmRleE9mIiwiYWRkQ2xhc3MiLCJoaWRlIiwiZ2V0VXNhZ2UiLCJyZW5kZXJTdG9yYWdlRGF0YSIsInJlbW92ZUNsYXNzIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJzdF9TdG9yYWdlTG9hZEVycm9yIiwic2hvdyIsImZvcm1hdFNpemUiLCJzaXplSW5NYiIsInRvRml4ZWQiLCJ0ZXh0IiwidXNlZF9zcGFjZSIsInRvdGFsX3NpemUiLCJhY2N1bXVsYXRlZFdpZHRoIiwiZm9yRWFjaCIsImNhdGVnb3J5IiwiY2F0RGF0YSIsImNhdGVnb3JpZXMiLCIkc2VnbWVudCIsInBlcmNlbnRhZ2UiLCJjc3MiLCJjYXRlZ29yeUtleSIsInNwbGl0IiwibWFwIiwid29yZCIsImNoYXJBdCIsInRvVXBwZXJDYXNlIiwic2xpY2UiLCJqb2luIiwiYXR0ciIsInNpemUiLCJvbiIsImUiLCIkdGhpcyIsInRvb2x0aXAiLCJhcHBlbmQiLCJkb2N1bWVudCIsImxlZnQiLCJwYWdlWCIsInRvcCIsInBhZ2VZIiwicmVtb3ZlIiwib2ZmIiwiYnVpbGRUb29sdGlwQ29udGVudCIsImNvbmZpZyIsImh0bWwiLCJoZWFkZXIiLCJkZXNjcmlwdGlvbiIsImxpc3QiLCJsZW5ndGgiLCJpdGVtIiwidGVybSIsImRlZmluaXRpb24iLCJpIiwibGlzdEtleSIsIndhcm5pbmciLCJleGFtcGxlcyIsImV4YW1wbGVzSGVhZGVyIiwibm90ZSIsInRvb2x0aXBDb25maWdzIiwicmVjb3JkX3JldGVudGlvbl9wZXJpb2QiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faGVhZGVyIiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2Rlc2MiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTEiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTIiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTMiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTQiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25fd2FybmluZ19oZWFkZXIiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25fd2FybmluZyIsInMzX2VuYWJsZWQiLCJzdF90b29sdGlwX3MzX2VuYWJsZWRfaGVhZGVyIiwic3RfdG9vbHRpcF9zM19lbmFibGVkX2Rlc2MiLCJzdF90b29sdGlwX3MzX2VuYWJsZWRfaXRlbTEiLCJzdF90b29sdGlwX3MzX2VuYWJsZWRfaXRlbTIiLCJzdF90b29sdGlwX3MzX2VuYWJsZWRfaXRlbTMiLCJzM19lbmRwb2ludCIsInN0X3Rvb2x0aXBfczNfZW5kcG9pbnRfaGVhZGVyIiwic3RfdG9vbHRpcF9zM19lbmRwb2ludF9kZXNjIiwic3RfdG9vbHRpcF9leGFtcGxlcyIsInMzX3JlZ2lvbiIsInN0X3Rvb2x0aXBfczNfcmVnaW9uX2hlYWRlciIsInN0X3Rvb2x0aXBfczNfcmVnaW9uX2Rlc2MiLCJzdF90b29sdGlwX3MzX3JlZ2lvbl9ub3RlIiwiczNfYnVja2V0Iiwic3RfdG9vbHRpcF9zM19idWNrZXRfaGVhZGVyIiwic3RfdG9vbHRpcF9zM19idWNrZXRfZGVzYyIsInN0X3Rvb2x0aXBfczNfYnVja2V0X2l0ZW0xIiwic3RfdG9vbHRpcF9zM19idWNrZXRfaXRlbTIiLCJzdF90b29sdGlwX3MzX2J1Y2tldF9pdGVtMyIsInMzX2FjY2Vzc19rZXkiLCJzdF90b29sdGlwX3MzX2FjY2Vzc19rZXlfaGVhZGVyIiwic3RfdG9vbHRpcF9zM19hY2Nlc3Nfa2V5X2Rlc2MiLCJzdF90b29sdGlwX3MzX2FjY2Vzc19rZXlfbm90ZSIsInMzX3NlY3JldF9rZXkiLCJzdF90b29sdGlwX3MzX3NlY3JldF9rZXlfaGVhZGVyIiwic3RfdG9vbHRpcF9zM19zZWNyZXRfa2V5X2Rlc2MiLCJzdF90b29sdGlwX3dhcm5pbmciLCJzdF90b29sdGlwX3MzX3NlY3JldF9rZXlfd2FybmluZyIsImxvY2FsX3JldGVudGlvbl9wZXJpb2QiLCJzdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9oZWFkZXIiLCJzdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9kZXNjIiwic3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25faXRlbTEiLCJzdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9pdGVtMiIsInN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2l0ZW0zIiwic3RfdG9vbHRpcF9ub3RlIiwic3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25fd2FybmluZyIsImVhY2giLCJpbmRleCIsImVsZW1lbnQiLCIkaWNvbiIsImZpZWxkTmFtZSIsImNvbnRlbnQiLCJwb3B1cCIsInBvc2l0aW9uIiwiaG92ZXJhYmxlIiwiZGVsYXkiLCJ2YXJpYXRpb24iLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJjYkFmdGVyU2VuZEZvcm0iLCJzdWNjZXNzIiwiJHN1Ym1pdEJ1dHRvbiIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFlBQVksR0FBRztBQUNqQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLHFCQUFELENBTk07O0FBUWpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLHdCQUF3QixFQUFFRCxDQUFDLENBQUMsNEJBQUQsQ0FaVjs7QUFlakI7QUFDSjtBQUNBO0FBQ0E7QUFDSUUsRUFBQUEsaUJBQWlCLEVBQUUsQ0FBQyxJQUFELEVBQU8sSUFBUCxFQUFhLEtBQWIsRUFBb0IsS0FBcEIsRUFBMkIsTUFBM0IsRUFBbUMsRUFBbkMsQ0FuQkY7O0FBdUJqQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUUsRUEzQkU7O0FBNkJqQjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUFoQ2lCLHdCQWdDSjtBQUNUO0FBQ0FKLElBQUFBLENBQUMsQ0FBQyxlQUFELENBQUQsQ0FBbUJLLElBQW5CLENBQXdCLE9BQXhCLEVBQWlDQyxHQUFqQyxDQUFxQztBQUM3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QixZQUEzQixDQUFkO0FBQ0EsV0FBT1EsTUFBUDtBQUNILEdBdGFnQjs7QUF3YWpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0k4SCxFQUFBQSxlQTVhaUIsMkJBNGFEL0gsUUE1YUMsRUE0YVM7QUFDdEIsUUFBSSxDQUFDQSxRQUFRLENBQUNnSSxPQUFkLEVBQXVCO0FBQ25CcEksTUFBQUEsSUFBSSxDQUFDcUksYUFBTCxDQUFtQnZILFdBQW5CLENBQStCLFVBQS9CO0FBQ0g7QUFDSixHQWhiZ0I7O0FBa2JqQjtBQUNKO0FBQ0E7QUFDSXBCLEVBQUFBLGNBcmJpQiw0QkFxYkE7QUFDYk0sSUFBQUEsSUFBSSxDQUFDdEMsUUFBTCxHQUFnQkQsWUFBWSxDQUFDQyxRQUE3QjtBQUNBc0MsSUFBQUEsSUFBSSxDQUFDbEMsYUFBTCxHQUFxQkwsWUFBWSxDQUFDSyxhQUFsQztBQUNBa0MsSUFBQUEsSUFBSSxDQUFDaUksZ0JBQUwsR0FBd0J4SyxZQUFZLENBQUN3SyxnQkFBckM7QUFDQWpJLElBQUFBLElBQUksQ0FBQ21JLGVBQUwsR0FBdUIxSyxZQUFZLENBQUMwSyxlQUFwQyxDQUphLENBTWI7O0FBQ0FuSSxJQUFBQSxJQUFJLENBQUNzSSxXQUFMLEdBQW1CO0FBQ2ZDLE1BQUFBLE9BQU8sRUFBRSxJQURNO0FBRWZDLE1BQUFBLFNBQVMsRUFBRXRJLFVBRkk7QUFHZnVJLE1BQUFBLFVBQVUsRUFBRSxRQUhHLENBR007O0FBSE4sS0FBbkI7QUFNQXpJLElBQUFBLElBQUksQ0FBQ2pDLFVBQUw7QUFDSDtBQW5jZ0IsQ0FBckIsQyxDQXNjQTs7QUFDQUosQ0FBQyxDQUFDcUYsUUFBRCxDQUFELENBQVkwRixLQUFaLENBQWtCLFlBQU07QUFDcEJqTCxFQUFBQSxZQUFZLENBQUNNLFVBQWI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgU3RvcmFnZUFQSSwgVXNlck1lc3NhZ2UsIHMzU3RvcmFnZUluZGV4LCAkICovXG5cbi8qKlxuICogU3RvcmFnZSBtYW5hZ2VtZW50IG1vZHVsZVxuICovXG5jb25zdCBzdG9yYWdlSW5kZXggPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGxvY2FsIHN0b3JhZ2UgZm9ybSAoVGFiIDIpLlxuICAgICAqIFNlbmRzIGRhdGEgdG86IFBBVENIIC9wYnhjb3JlL2FwaS92My9zdG9yYWdlXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI2xvY2FsLXN0b3JhZ2UtZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHJlY29yZHMgcmV0ZW50aW9uIHBlcmlvZCBzbGlkZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkcmVjb3Jkc1NhdmVQZXJpb2RTbGlkZXI6ICQoJyNQQlhSZWNvcmRTYXZlUGVyaW9kU2xpZGVyJyksXG5cblxuICAgIC8qKlxuICAgICAqIFBvc3NpYmxlIHBlcmlvZCB2YWx1ZXMgZm9yIHRoZSByZWNvcmRzIHJldGVudGlvbi5cbiAgICAgKiBWYWx1ZXMgaW4gZGF5czogMzAsIDkwLCAxODAsIDM2MCwgMTA4MCwgJycgKGluZmluaXR5KVxuICAgICAqL1xuICAgIHNhdmVSZWNvcmRzUGVyaW9kOiBbJzMwJywgJzkwJywgJzE4MCcsICczNjAnLCAnMTA4MCcsICcnXSxcblxuXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgbG9jYWwgc3RvcmFnZSBmb3JtLlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge30sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBtb2R1bGUgd2l0aCBldmVudCBiaW5kaW5ncyBhbmQgY29tcG9uZW50IGluaXRpYWxpemF0aW9ucy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBFbmFibGUgdGFiIG5hdmlnYXRpb25cbiAgICAgICAgJCgnI3N0b3JhZ2UtbWVudScpLmZpbmQoJy5pdGVtJykudGFiKHtcbiAgICAgICAgICAgICAgICBoaXN0b3J5OiB0cnVlLFxuICAgICAgICAgICAgICAgIGhpc3RvcnlUeXBlOiAnaGFzaCcsXG4gICAgICAgICAgICAgICAgICAgb25WaXNpYmxlOiBmdW5jdGlvbih0YWJQYXRoKSB7XG4gICAgICAgICAgICAgICAgLy8gTG9hZCBzdG9yYWdlIGRhdGEgd2hlbiBzdG9yYWdlIGluZm8gdGFiIGlzIGFjdGl2YXRlZFxuICAgICAgICAgICAgICAgIGlmICh0YWJQYXRoID09PSAnc3RvcmFnZS1pbmZvJykge1xuICAgICAgICAgICAgICAgICAgICBzdG9yYWdlSW5kZXgubG9hZFN0b3JhZ2VEYXRhKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSByZWNvcmRzIHNhdmUgcGVyaW9kIHNsaWRlclxuICAgICAgICBzdG9yYWdlSW5kZXguJHJlY29yZHNTYXZlUGVyaW9kU2xpZGVyXG4gICAgICAgICAgICAuc2xpZGVyKHtcbiAgICAgICAgICAgICAgICBtaW46IDAsXG4gICAgICAgICAgICAgICAgbWF4OiA1LFxuICAgICAgICAgICAgICAgIHN0ZXA6IDEsXG4gICAgICAgICAgICAgICAgc21vb3RoOiB0cnVlLFxuICAgICAgICAgICAgICAgIGF1dG9BZGp1c3RMYWJlbHM6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGludGVycHJldExhYmVsOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbGFiZWxzID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgMDogZ2xvYmFsVHJhbnNsYXRlLnN0X1N0b3JlMU1vbnRoT2ZSZWNvcmRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgMTogZ2xvYmFsVHJhbnNsYXRlLnN0X1N0b3JlM01vbnRoc09mUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIDI6IGdsb2JhbFRyYW5zbGF0ZS5zdF9TdG9yZTZNb250aHNPZlJlY29yZHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAzOiBnbG9iYWxUcmFuc2xhdGUuc3RfU3RvcmUxWWVhck9mUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIDQ6IGdsb2JhbFRyYW5zbGF0ZS5zdF9TdG9yZTNZZWFyc09mUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIDU6IGdsb2JhbFRyYW5zbGF0ZS5zdF9TdG9yZUFsbFBvc3NpYmxlUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxhYmVsc1t2YWx1ZV0gfHwgJyc7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogc3RvcmFnZUluZGV4LmNiQWZ0ZXJTZWxlY3RTYXZlUGVyaW9kU2xpZGVyLFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwc1xuICAgICAgICBzdG9yYWdlSW5kZXguaW5pdGlhbGl6ZVRvb2x0aXBzKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZm9ybVxuICAgICAgICBzdG9yYWdlSW5kZXguaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBMb2FkIHNldHRpbmdzIGZyb20gQVBJXG4gICAgICAgIHN0b3JhZ2VJbmRleC5sb2FkU2V0dGluZ3MoKTtcblxuICAgICAgICAvLyBMb2FkIHN0b3JhZ2UgZGF0YSBvbiBwYWdlIGxvYWRcbiAgICAgICAgc3RvcmFnZUluZGV4LmxvYWRTdG9yYWdlRGF0YSgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGV2ZW50IGFmdGVyIHRoZSBzZWxlY3Qgc2F2ZSBwZXJpb2Qgc2xpZGVyIGlzIGNoYW5nZWQuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHZhbHVlIC0gVGhlIHNlbGVjdGVkIHZhbHVlIGZyb20gdGhlIHNsaWRlci5cbiAgICAgKi9cbiAgICBjYkFmdGVyU2VsZWN0U2F2ZVBlcmlvZFNsaWRlcih2YWx1ZSkge1xuICAgICAgICAvLyBHZXQgdGhlIHNhdmUgcGVyaW9kIGNvcnJlc3BvbmRpbmcgdG8gdGhlIHNsaWRlciB2YWx1ZS5cbiAgICAgICAgY29uc3Qgc2F2ZVBlcmlvZCA9IHN0b3JhZ2VJbmRleC5zYXZlUmVjb3Jkc1BlcmlvZFt2YWx1ZV07XG5cbiAgICAgICAgLy8gU2V0IHRoZSBmb3JtIHZhbHVlIGZvciAnUEJYUmVjb3JkU2F2ZVBlcmlvZCcgdG8gdGhlIHNlbGVjdGVkIHNhdmUgcGVyaW9kLlxuICAgICAgICBzdG9yYWdlSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1BCWFJlY29yZFNhdmVQZXJpb2QnLCBzYXZlUGVyaW9kKTtcblxuICAgICAgICAvLyBVcGRhdGUgUzMgbG9jYWwgcmV0ZW50aW9uIHNsaWRlciBtYXhpbXVtIChpZiBTMyBtb2R1bGUgbG9hZGVkKVxuICAgICAgICBpZiAodHlwZW9mIHMzU3RvcmFnZUluZGV4ICE9PSAndW5kZWZpbmVkJyAmJiBzM1N0b3JhZ2VJbmRleC51cGRhdGVTbGlkZXJMaW1pdHMpIHtcbiAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LnVwZGF0ZVNsaWRlckxpbWl0cyhzYXZlUGVyaW9kKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50IHRvIGFja25vd2xlZGdlIHRoZSBtb2RpZmljYXRpb25cbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIExvYWQgU3RvcmFnZSBzZXR0aW5ncyBmcm9tIEFQSVxuICAgICAqL1xuICAgIGxvYWRTZXR0aW5ncygpIHtcbiAgICAgICAgU3RvcmFnZUFQSS5nZXQoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuZGF0YTtcblxuICAgICAgICAgICAgICAgIC8vIFNldCBmb3JtIHZhbHVlcyBmb3IgbG9jYWwgc3RvcmFnZSBvbmx5XG4gICAgICAgICAgICAgICAgc3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZXMnLCB7XG4gICAgICAgICAgICAgICAgICAgIFBCWFJlY29yZFNhdmVQZXJpb2Q6IGRhdGEuUEJYUmVjb3JkU2F2ZVBlcmlvZCB8fCAnJ1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRvdGFsIHJldGVudGlvbiBwZXJpb2Qgc2xpZGVyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVjb3JkU2F2ZVBlcmlvZCA9IGRhdGEuUEJYUmVjb3JkU2F2ZVBlcmlvZCB8fCAnJztcbiAgICAgICAgICAgICAgICBzdG9yYWdlSW5kZXguJHJlY29yZHNTYXZlUGVyaW9kU2xpZGVyLnNsaWRlcihcbiAgICAgICAgICAgICAgICAgICAgJ3NldCB2YWx1ZScsXG4gICAgICAgICAgICAgICAgICAgIHN0b3JhZ2VJbmRleC5zYXZlUmVjb3Jkc1BlcmlvZC5pbmRleE9mKHJlY29yZFNhdmVQZXJpb2QpLFxuICAgICAgICAgICAgICAgICAgICBmYWxzZVxuICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICAvLyBOb3RpZnkgUzMgbW9kdWxlIGFib3V0IHRvdGFsIHJldGVudGlvbiBjaGFuZ2UgKGlmIGxvYWRlZClcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHMzU3RvcmFnZUluZGV4ICE9PSAndW5kZWZpbmVkJyAmJiBzM1N0b3JhZ2VJbmRleC51cGRhdGVTbGlkZXJMaW1pdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXgudXBkYXRlU2xpZGVyTGltaXRzKHJlY29yZFNhdmVQZXJpb2QpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBMb2FkIHN0b3JhZ2UgdXNhZ2UgZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIGxvYWRTdG9yYWdlRGF0YSgpIHtcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgICQoJyNzdG9yYWdlLXVzYWdlLWNvbnRhaW5lciAuZGltbWVyJykuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAkKCcjc3RvcmFnZS1kZXRhaWxzJykuaGlkZSgpO1xuXG4gICAgICAgIC8vIE1ha2UgQVBJIGNhbGwgdG8gZ2V0IHN0b3JhZ2UgdXNhZ2UgdXNpbmcgbmV3IFN0b3JhZ2VBUElcbiAgICAgICAgU3RvcmFnZUFQSS5nZXRVc2FnZSgocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIHN0b3JhZ2VJbmRleC5yZW5kZXJTdG9yYWdlRGF0YShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJCgnI3N0b3JhZ2UtdXNhZ2UtY29udGFpbmVyIC5kaW1tZXInKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS5zdF9TdG9yYWdlTG9hZEVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZW5kZXIgc3RvcmFnZSB1c2FnZSBkYXRhIGluIHRoZSBVSVxuICAgICAqL1xuICAgIHJlbmRlclN0b3JhZ2VEYXRhKGRhdGEpIHtcbiAgICAgICAgLy8gSGlkZSBsb2FkaW5nIGFuZCBzaG93IGRldGFpbHNcbiAgICAgICAgJCgnI3N0b3JhZ2UtdXNhZ2UtY29udGFpbmVyIC5kaW1tZXInKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICQoJyNzdG9yYWdlLWRldGFpbHMnKS5zaG93KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBGb3JtYXQgc2l6ZSBmb3IgZGlzcGxheVxuICAgICAgICBjb25zdCBmb3JtYXRTaXplID0gKHNpemVJbk1iKSA9PiB7XG4gICAgICAgICAgICBpZiAoc2l6ZUluTWIgPj0gMTAyNCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoc2l6ZUluTWIgLyAxMDI0KS50b0ZpeGVkKDEpICsgJyBHQic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gc2l6ZUluTWIudG9GaXhlZCgxKSArICcgTUInO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGhlYWRlciBpbmZvcm1hdGlvblxuICAgICAgICAkKCcjdXNlZC1zcGFjZS10ZXh0JykudGV4dChmb3JtYXRTaXplKGRhdGEudXNlZF9zcGFjZSkpO1xuICAgICAgICAkKCcjdG90YWwtc2l6ZS10ZXh0JykudGV4dChmb3JtYXRTaXplKGRhdGEudG90YWxfc2l6ZSkpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHByb2dyZXNzIHNlZ21lbnRzIGluIG1hY09TIHN0eWxlXG4gICAgICAgIGxldCBhY2N1bXVsYXRlZFdpZHRoID0gMDtcbiAgICAgICAgXG4gICAgICAgIC8vIFByb2Nlc3MgZWFjaCBjYXRlZ29yeVxuICAgICAgICBbJ2NhbGxfcmVjb3JkaW5ncycsICdjZHJfZGF0YWJhc2UnLCAnc3lzdGVtX2xvZ3MnLCAnbW9kdWxlcycsICdiYWNrdXBzJywgJ3N5c3RlbV9jYWNoZXMnLCAnb3RoZXInXS5mb3JFYWNoKGNhdGVnb3J5ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNhdERhdGEgPSBkYXRhLmNhdGVnb3JpZXNbY2F0ZWdvcnldO1xuICAgICAgICAgICAgY29uc3QgJHNlZ21lbnQgPSAkKGAucHJvZ3Jlc3Mtc2VnbWVudFtkYXRhLWNhdGVnb3J5PVwiJHtjYXRlZ29yeX1cIl1gKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGNhdERhdGEgJiYgY2F0RGF0YS5wZXJjZW50YWdlID4gMCkge1xuICAgICAgICAgICAgICAgICRzZWdtZW50LmNzcygnd2lkdGgnLCBjYXREYXRhLnBlcmNlbnRhZ2UgKyAnJScpLnNob3coKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBZGQgaG92ZXIgdG9vbHRpcFxuICAgICAgICAgICAgICAgIGNvbnN0IGNhdGVnb3J5S2V5ID0gJ3N0X0NhdGVnb3J5JyArIGNhdGVnb3J5LnNwbGl0KCdfJykubWFwKHdvcmQgPT4gd29yZC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHdvcmQuc2xpY2UoMSkpLmpvaW4oJycpO1xuICAgICAgICAgICAgICAgICRzZWdtZW50LmF0dHIoJ3RpdGxlJywgYCR7Z2xvYmFsVHJhbnNsYXRlW2NhdGVnb3J5S2V5XSB8fCBjYXRlZ29yeX06ICR7Zm9ybWF0U2l6ZShjYXREYXRhLnNpemUpfSAoJHtjYXREYXRhLnBlcmNlbnRhZ2V9JSlgKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBhY2N1bXVsYXRlZFdpZHRoICs9IGNhdERhdGEucGVyY2VudGFnZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHNlZ21lbnQuaGlkZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgY2F0ZWdvcnkgc2l6ZSBpbiBsaXN0XG4gICAgICAgICAgICAkKGAjJHtjYXRlZ29yeX0tc2l6ZWApLnRleHQoZm9ybWF0U2l6ZShjYXREYXRhID8gY2F0RGF0YS5zaXplIDogMCkpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBob3ZlciBlZmZlY3RzIGZvciBwcm9ncmVzcyBzZWdtZW50c1xuICAgICAgICAkKCcucHJvZ3Jlc3Mtc2VnbWVudCcpLm9uKCdtb3VzZWVudGVyJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgY29uc3QgJHRoaXMgPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgdG9vbHRpcCA9ICQoJzxkaXYgY2xhc3M9XCJzdG9yYWdlLXRvb2x0aXBcIj48L2Rpdj4nKS50ZXh0KCR0aGlzLmF0dHIoJ3RpdGxlJykpO1xuICAgICAgICAgICAgJCgnYm9keScpLmFwcGVuZCh0b29sdGlwKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgJChkb2N1bWVudCkub24oJ21vdXNlbW92ZS50b29sdGlwJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIHRvb2x0aXAuY3NzKHtcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogZS5wYWdlWCArIDEwLFxuICAgICAgICAgICAgICAgICAgICB0b3A6IGUucGFnZVkgLSAzMFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pLm9uKCdtb3VzZWxlYXZlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkKCcuc3RvcmFnZS10b29sdGlwJykucmVtb3ZlKCk7XG4gICAgICAgICAgICAkKGRvY3VtZW50KS5vZmYoJ21vdXNlbW92ZS50b29sdGlwJyk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSGlnaGxpZ2h0IGNhdGVnb3J5IG9uIGhvdmVyXG4gICAgICAgICQoJy5jYXRlZ29yeS1pdGVtJykub24oJ21vdXNlZW50ZXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0IGNhdGVnb3J5ID0gJCh0aGlzKS5kYXRhKCdjYXRlZ29yeScpO1xuICAgICAgICAgICAgJChgLnByb2dyZXNzLXNlZ21lbnRbZGF0YS1jYXRlZ29yeT1cIiR7Y2F0ZWdvcnl9XCJdYCkuY3NzKCdvcGFjaXR5JywgJzAuNycpO1xuICAgICAgICB9KS5vbignbW91c2VsZWF2ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJCgnLnByb2dyZXNzLXNlZ21lbnQnKS5jc3MoJ29wYWNpdHknLCAnMScpO1xuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIEhUTUwgY29udGVudCBmb3IgdG9vbHRpcCBwb3B1cFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcgLSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gb2JqZWN0XG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBzdHJpbmcgZm9yIHBvcHVwIGNvbnRlbnRcbiAgICAgKi9cbiAgICBidWlsZFRvb2x0aXBDb250ZW50KGNvbmZpZykge1xuICAgICAgICBsZXQgaHRtbCA9ICc8ZGl2IGNsYXNzPVwidWkgcmVsYXhlZCBsaXN0XCI+JztcblxuICAgICAgICAvLyBIZWFkZXJcbiAgICAgICAgaWYgKGNvbmZpZy5oZWFkZXIpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+PHN0cm9uZz4ke2NvbmZpZy5oZWFkZXJ9PC9zdHJvbmc+PC9kaXY+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERlc2NyaXB0aW9uXG4gICAgICAgIGlmIChjb25maWcuZGVzY3JpcHRpb24pIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+JHtjb25maWcuZGVzY3JpcHRpb259PC9kaXY+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1haW4gbGlzdFxuICAgICAgICBpZiAoY29uZmlnLmxpc3QgJiYgY29uZmlnLmxpc3QubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIj48dWwgY2xhc3M9XCJ1aSBsaXN0XCI+JztcbiAgICAgICAgICAgIGNvbmZpZy5saXN0LmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+JHtpdGVtfTwvbGk+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0udGVybSAmJiBpdGVtLmRlZmluaXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2VjdGlvbiBoZWFkZXJcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPC91bD48c3Ryb25nPiR7aXRlbS50ZXJtfTwvc3Ryb25nPjx1bCBjbGFzcz1cInVpIGxpc3RcIj5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXRlbS50ZXJtICYmIGl0ZW0uZGVmaW5pdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAvLyBUZXJtIHdpdGggZGVmaW5pdGlvblxuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+PHN0cm9uZz4ke2l0ZW0udGVybX06PC9zdHJvbmc+ICR7aXRlbS5kZWZpbml0aW9ufTwvbGk+YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvdWw+PC9kaXY+JztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZGl0aW9uYWwgbGlzdHMgKGxpc3QyLWxpc3QxMClcbiAgICAgICAgZm9yIChsZXQgaSA9IDI7IGkgPD0gMTA7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgbGlzdEtleSA9IGBsaXN0JHtpfWA7XG4gICAgICAgICAgICBpZiAoY29uZmlnW2xpc3RLZXldICYmIGNvbmZpZ1tsaXN0S2V5XS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIj48dWwgY2xhc3M9XCJ1aSBsaXN0XCI+JztcbiAgICAgICAgICAgICAgICBjb25maWdbbGlzdEtleV0uZm9yRWFjaChpdGVtID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGxpPiR7aXRlbX08L2xpPmA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8L3VsPjwvZGl2Pic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBXYXJuaW5nXG4gICAgICAgIGlmIChjb25maWcud2FybmluZykge1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIj48ZGl2IGNsYXNzPVwidWkgb3JhbmdlIG1lc3NhZ2VcIj4nO1xuICAgICAgICAgICAgaWYgKGNvbmZpZy53YXJuaW5nLmhlYWRlcikge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2NvbmZpZy53YXJuaW5nLmhlYWRlcn08L2Rpdj5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGNvbmZpZy53YXJuaW5nLnRleHQpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8cD4ke2NvbmZpZy53YXJuaW5nLnRleHR9PC9wPmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj48L2Rpdj4nO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRXhhbXBsZXNcbiAgICAgICAgaWYgKGNvbmZpZy5leGFtcGxlcyAmJiBjb25maWcuZXhhbXBsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaWYgKGNvbmZpZy5leGFtcGxlc0hlYWRlcikge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+PHN0cm9uZz4ke2NvbmZpZy5leGFtcGxlc0hlYWRlcn08L3N0cm9uZz48L2Rpdj5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIj48cHJlIHN0eWxlPVwiYmFja2dyb3VuZDojZjRmNGY0O3BhZGRpbmc6MTBweDtib3JkZXItcmFkaXVzOjRweDtcIj4nO1xuICAgICAgICAgICAgaHRtbCArPSBjb25maWcuZXhhbXBsZXMuam9pbignXFxuJyk7XG4gICAgICAgICAgICBodG1sICs9ICc8L3ByZT48L2Rpdj4nO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTm90ZVxuICAgICAgICBpZiAoY29uZmlnLm5vdGUpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+PGVtPiR7Y29uZmlnLm5vdGV9PC9lbT48L2Rpdj5gO1xuICAgICAgICB9XG5cbiAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRvb2x0aXBzKCkge1xuICAgICAgICAvLyBUb29sdGlwIGNvbmZpZ3VyYXRpb25zIGZvciBlYWNoIGZpZWxkXG4gICAgICAgIGNvbnN0IHRvb2x0aXBDb25maWdzID0ge1xuICAgICAgICAgICAgcmVjb3JkX3JldGVudGlvbl9wZXJpb2Q6IHN0b3JhZ2VJbmRleC5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faGVhZGVyIHx8ICdUb3RhbCBSZXRlbnRpb24gUGVyaW9kJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9kZXNjIHx8ICdIb3cgbG9uZyBjYWxsIHJlY29yZGluZ3MgYXJlIGtlcHQgaW4gdGhlIHN5c3RlbScsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2l0ZW0xIHx8ICczMCBkYXlzIC0gbWluaW11bSBzdG9yYWdlIHBlcmlvZCcsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTIgfHwgJzkwIGRheXMgLSByZWNvbW1lbmRlZCBmb3Igc21hbGwgYnVzaW5lc3NlcycsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTMgfHwgJzEgeWVhciAtIGNvbXBsaWFuY2UgcmVxdWlyZW1lbnRzJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9pdGVtNCB8fCAnVW5saW1pdGVkIC0ga2VlcCBhbGwgcmVjb3JkaW5ncydcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX3dhcm5pbmdfaGVhZGVyIHx8ICdTdG9yYWdlIFdhcm5pbmcnLFxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX3dhcm5pbmcgfHwgJ0xvbmdlciByZXRlbnRpb24gcGVyaW9kcyByZXF1aXJlIG1vcmUgZGlzayBzcGFjZSdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgczNfZW5hYmxlZDogc3RvcmFnZUluZGV4LmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfZW5hYmxlZF9oZWFkZXIgfHwgJ0Nsb3VkIFN0b3JhZ2UnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19lbmFibGVkX2Rlc2MgfHwgJ1VwbG9hZCByZWNvcmRpbmdzIHRvIFMzLWNvbXBhdGlibGUgY2xvdWQgc3RvcmFnZSBmb3IgYmFja3VwIGFuZCBhcmNoaXZhbCcsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19lbmFibGVkX2l0ZW0xIHx8ICdBdXRvbWF0aWMgdXBsb2FkIGFmdGVyIHJlY29yZGluZyBjb21wbGV0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfZW5hYmxlZF9pdGVtMiB8fCAnRnJlZXMgdXAgbG9jYWwgZGlzayBzcGFjZScsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2VuYWJsZWRfaXRlbTMgfHwgJ0NvbXBhdGlibGUgd2l0aCBBV1MgUzMsIE1pbklPLCBXYXNhYmknXG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgIHMzX2VuZHBvaW50OiBzdG9yYWdlSW5kZXguYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19lbmRwb2ludF9oZWFkZXIgfHwgJ1MzIEVuZHBvaW50IFVSTCcsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2VuZHBvaW50X2Rlc2MgfHwgJ0FQSSBlbmRwb2ludCBmb3IgeW91ciBTMy1jb21wYXRpYmxlIHN0b3JhZ2Ugc2VydmljZScsXG4gICAgICAgICAgICAgICAgZXhhbXBsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgJ0FXUyBTMzogaHR0cHM6Ly9zMy5hbWF6b25hd3MuY29tJyxcbiAgICAgICAgICAgICAgICAgICAgJ01pbklPOiBodHRwOi8vbWluaW8uZXhhbXBsZS5jb206OTAwMCcsXG4gICAgICAgICAgICAgICAgICAgICdXYXNhYmk6IGh0dHBzOi8vczMud2FzYWJpc3lzLmNvbSdcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGV4YW1wbGVzSGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9leGFtcGxlcyB8fCAnRXhhbXBsZXMnXG4gICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgczNfcmVnaW9uOiBzdG9yYWdlSW5kZXguYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19yZWdpb25faGVhZGVyIHx8ICdTMyBSZWdpb24nLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19yZWdpb25fZGVzYyB8fCAnR2VvZ3JhcGhpYyByZWdpb24gd2hlcmUgeW91ciBidWNrZXQgaXMgbG9jYXRlZCcsXG4gICAgICAgICAgICAgICAgZXhhbXBsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgJ3VzLWVhc3QtMSAoZGVmYXVsdCknLFxuICAgICAgICAgICAgICAgICAgICAnZXUtd2VzdC0xJyxcbiAgICAgICAgICAgICAgICAgICAgJ2FwLXNvdXRoZWFzdC0xJ1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfcmVnaW9uX25vdGUgfHwgJ011c3QgbWF0Y2ggeW91ciBidWNrZXQgcmVnaW9uIGZvciBBV1MgUzMnXG4gICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgczNfYnVja2V0OiBzdG9yYWdlSW5kZXguYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19idWNrZXRfaGVhZGVyIHx8ICdCdWNrZXQgTmFtZScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2J1Y2tldF9kZXNjIHx8ICdOYW1lIG9mIHRoZSBTMyBidWNrZXQgZm9yIHN0b3JpbmcgcmVjb3JkaW5ncycsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19idWNrZXRfaXRlbTEgfHwgJ011c3QgYmUgdW5pcXVlIGFjcm9zcyBhbGwgUzMgdXNlcnMgKGZvciBBV1MpJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfYnVja2V0X2l0ZW0yIHx8ICdPbmx5IGxvd2VyY2FzZSBsZXR0ZXJzLCBudW1iZXJzLCBoeXBoZW5zJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfYnVja2V0X2l0ZW0zIHx8ICdNdXN0IGFscmVhZHkgZXhpc3QgLSB3aWxsIG5vdCBiZSBjcmVhdGVkJ1xuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICBzM19hY2Nlc3Nfa2V5OiBzdG9yYWdlSW5kZXguYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19hY2Nlc3Nfa2V5X2hlYWRlciB8fCAnQWNjZXNzIEtleSBJRCcsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2FjY2Vzc19rZXlfZGVzYyB8fCAnUHVibGljIGlkZW50aWZpZXIgZm9yIEFQSSBhdXRoZW50aWNhdGlvbicsXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfYWNjZXNzX2tleV9ub3RlIHx8ICdTaW1pbGFyIHRvIHVzZXJuYW1lIC0gc2FmZSB0byBkaXNwbGF5J1xuICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgIHMzX3NlY3JldF9rZXk6IHN0b3JhZ2VJbmRleC5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX3NlY3JldF9rZXlfaGVhZGVyIHx8ICdTZWNyZXQgQWNjZXNzIEtleScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX3NlY3JldF9rZXlfZGVzYyB8fCAnUHJpdmF0ZSBrZXkgZm9yIEFQSSBhdXRoZW50aWNhdGlvbicsXG4gICAgICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3dhcm5pbmcgfHwgJ1NlY3VyaXR5IFdhcm5pbmcnLFxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19zZWNyZXRfa2V5X3dhcm5pbmcgfHwgJ0tlZXAgdGhpcyBzZWNyZXQgc2FmZSAtIHRyZWF0IGl0IGxpa2UgYSBwYXNzd29yZCdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgbG9jYWxfcmV0ZW50aW9uX3BlcmlvZDogc3RvcmFnZUluZGV4LmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2hlYWRlciB8fCAnTG9jYWwgUmV0ZW50aW9uIFBlcmlvZCcsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9kZXNjIHx8ICdIb3cgbG9uZyB0byBrZWVwIHJlY29yZGluZ3MgbG9jYWxseSBiZWZvcmUgZGVsZXRpbmcnLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2l0ZW0xIHx8ICdBZnRlciB0aGlzIHBlcmlvZCwgcmVjb3JkaW5ncyBhcmUgZGVsZXRlZCBmcm9tIGxvY2FsIHN0b3JhZ2UnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25faXRlbTIgfHwgJ0ZpbGVzIHJlbWFpbiBpbiBTMyBjbG91ZCBzdG9yYWdlJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2l0ZW0zIHx8ICdDYW5ub3QgZXhjZWVkIHRvdGFsIHJldGVudGlvbiBwZXJpb2QnXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfbm90ZSB8fCAnTm90ZScsXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl93YXJuaW5nIHx8ICdTaG9ydGVyIGxvY2FsIHJldGVudGlvbiBmcmVlcyBkaXNrIHNwYWNlIGZhc3RlcidcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgcG9wdXAgZm9yIGVhY2ggdG9vbHRpcCBpY29uXG4gICAgICAgICQoJy5maWVsZC1pbmZvLWljb24nKS5lYWNoKChpbmRleCwgZWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGljb24gPSAkKGVsZW1lbnQpO1xuICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0gJGljb24uZGF0YSgnZmllbGQnKTtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSB0b29sdGlwQ29uZmlnc1tmaWVsZE5hbWVdO1xuXG4gICAgICAgICAgICBpZiAoY29udGVudCkge1xuICAgICAgICAgICAgICAgICRpY29uLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbDogY29udGVudCxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnLFxuICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRlbGF5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaG93OiAzMDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBoaWRlOiAxMDBcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgdmFyaWF0aW9uOiAnZmxvd2luZydcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gc3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAoIXJlc3BvbnNlLnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gc3RvcmFnZUluZGV4LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBzdG9yYWdlSW5kZXgudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gc3RvcmFnZUluZGV4LmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gc3RvcmFnZUluZGV4LmNiQWZ0ZXJTZW5kRm9ybTtcblxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUEkgc2V0dGluZ3MgZm9yIEZvcm0uanMgKHNpbmdsZXRvbiByZXNvdXJjZSlcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBhcGlPYmplY3Q6IFN0b3JhZ2VBUEksXG4gICAgICAgICAgICBzYXZlTWV0aG9kOiAndXBkYXRlJyAvLyBVc2luZyBzdGFuZGFyZCBQVVQgZm9yIHNpbmdsZXRvbiB1cGRhdGVcbiAgICAgICAgfTtcblxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9XG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgc3RvcmFnZSBtYW5hZ2VtZW50IGludGVyZmFjZS5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBzdG9yYWdlSW5kZXguaW5pdGlhbGl6ZSgpO1xufSk7Il19