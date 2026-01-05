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
  initialize: function initialize() {
    // Enable tab navigation
    $('#storage-menu').find('.item').tab({
      history: true,
      historyType: 'hash',
      onVisible: function onVisible(tabPath) {
        // Load storage data when storage info tab is activated
        if (tabPath === 'storage-info') {
          storageIndex.loadStorageData();
        } // Re-initialize local storage form when tab becomes visible


        if (tabPath === 'storage-local') {
          storageIndex.initializeForm();
        } // Re-initialize S3 form when cloud tab becomes visible


        if (tabPath === 'storage-cloud' && typeof s3StorageIndex !== 'undefined') {
          s3StorageIndex.initializeForm();
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
        var sliderIndex = storageIndex.saveRecordsPeriod.indexOf(recordSavePeriod);
        storageIndex.$recordsSavePeriodSlider.slider('set value', sliderIndex, false); // Notify S3 module about total retention change (if loaded)

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
    Form.$submitButton = storageIndex.$submitButton;
    Form.$dropdownSubmit = storageIndex.$dropdownSubmit;
    Form.$dirrtyField = storageIndex.$dirrtyField;
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TdG9yYWdlL3N0b3JhZ2UtaW5kZXguanMiXSwibmFtZXMiOlsic3RvcmFnZUluZGV4IiwiJGZvcm1PYmoiLCIkIiwiJHN1Ym1pdEJ1dHRvbiIsIiRkcm9wZG93blN1Ym1pdCIsIiRkaXJydHlGaWVsZCIsIiRyZWNvcmRzU2F2ZVBlcmlvZFNsaWRlciIsInNhdmVSZWNvcmRzUGVyaW9kIiwidmFsaWRhdGVSdWxlcyIsImluaXRpYWxpemUiLCJmaW5kIiwidGFiIiwiaGlzdG9yeSIsImhpc3RvcnlUeXBlIiwib25WaXNpYmxlIiwidGFiUGF0aCIsImxvYWRTdG9yYWdlRGF0YSIsImluaXRpYWxpemVGb3JtIiwiczNTdG9yYWdlSW5kZXgiLCJzbGlkZXIiLCJtaW4iLCJtYXgiLCJzdGVwIiwic21vb3RoIiwiYXV0b0FkanVzdExhYmVscyIsImludGVycHJldExhYmVsIiwidmFsdWUiLCJsYWJlbHMiLCJnbG9iYWxUcmFuc2xhdGUiLCJzdF9TdG9yZTFNb250aE9mUmVjb3JkcyIsInN0X1N0b3JlM01vbnRoc09mUmVjb3JkcyIsInN0X1N0b3JlNk1vbnRoc09mUmVjb3JkcyIsInN0X1N0b3JlMVllYXJPZlJlY29yZHMiLCJzdF9TdG9yZTNZZWFyc09mUmVjb3JkcyIsInN0X1N0b3JlQWxsUG9zc2libGVSZWNvcmRzIiwib25DaGFuZ2UiLCJjYkFmdGVyU2VsZWN0U2F2ZVBlcmlvZFNsaWRlciIsImluaXRpYWxpemVUb29sdGlwcyIsImxvYWRTZXR0aW5ncyIsInNhdmVQZXJpb2QiLCJmb3JtIiwidXBkYXRlU2xpZGVyTGltaXRzIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwiU3RvcmFnZUFQSSIsImdldCIsInJlc3BvbnNlIiwicmVzdWx0IiwiZGF0YSIsIlBCWFJlY29yZFNhdmVQZXJpb2QiLCJyZWNvcmRTYXZlUGVyaW9kIiwic2xpZGVySW5kZXgiLCJpbmRleE9mIiwiYWRkQ2xhc3MiLCJoaWRlIiwiZ2V0VXNhZ2UiLCJyZW5kZXJTdG9yYWdlRGF0YSIsInJlbW92ZUNsYXNzIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJzdF9TdG9yYWdlTG9hZEVycm9yIiwic2hvdyIsImZvcm1hdFNpemUiLCJzaXplSW5NYiIsInRvRml4ZWQiLCJ0ZXh0IiwidXNlZF9zcGFjZSIsInRvdGFsX3NpemUiLCJhY2N1bXVsYXRlZFdpZHRoIiwiZm9yRWFjaCIsImNhdGVnb3J5IiwiY2F0RGF0YSIsImNhdGVnb3JpZXMiLCIkc2VnbWVudCIsInBlcmNlbnRhZ2UiLCJjc3MiLCJjYXRlZ29yeUtleSIsInNwbGl0IiwibWFwIiwid29yZCIsImNoYXJBdCIsInRvVXBwZXJDYXNlIiwic2xpY2UiLCJqb2luIiwiYXR0ciIsInNpemUiLCJvbiIsImUiLCIkdGhpcyIsInRvb2x0aXAiLCJhcHBlbmQiLCJkb2N1bWVudCIsImxlZnQiLCJwYWdlWCIsInRvcCIsInBhZ2VZIiwicmVtb3ZlIiwib2ZmIiwiYnVpbGRUb29sdGlwQ29udGVudCIsImNvbmZpZyIsImh0bWwiLCJoZWFkZXIiLCJkZXNjcmlwdGlvbiIsImxpc3QiLCJsZW5ndGgiLCJpdGVtIiwidGVybSIsImRlZmluaXRpb24iLCJpIiwibGlzdEtleSIsIndhcm5pbmciLCJleGFtcGxlcyIsImV4YW1wbGVzSGVhZGVyIiwibm90ZSIsInRvb2x0aXBDb25maWdzIiwicmVjb3JkX3JldGVudGlvbl9wZXJpb2QiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faGVhZGVyIiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2Rlc2MiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTEiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTIiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTMiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTQiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25fd2FybmluZ19oZWFkZXIiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25fd2FybmluZyIsInMzX2VuYWJsZWQiLCJzdF90b29sdGlwX3MzX2VuYWJsZWRfaGVhZGVyIiwic3RfdG9vbHRpcF9zM19lbmFibGVkX2Rlc2MiLCJzdF90b29sdGlwX3MzX2VuYWJsZWRfaXRlbTEiLCJzdF90b29sdGlwX3MzX2VuYWJsZWRfaXRlbTIiLCJzdF90b29sdGlwX3MzX2VuYWJsZWRfaXRlbTMiLCJzM19lbmRwb2ludCIsInN0X3Rvb2x0aXBfczNfZW5kcG9pbnRfaGVhZGVyIiwic3RfdG9vbHRpcF9zM19lbmRwb2ludF9kZXNjIiwic3RfdG9vbHRpcF9leGFtcGxlcyIsInMzX3JlZ2lvbiIsInN0X3Rvb2x0aXBfczNfcmVnaW9uX2hlYWRlciIsInN0X3Rvb2x0aXBfczNfcmVnaW9uX2Rlc2MiLCJzdF90b29sdGlwX3MzX3JlZ2lvbl9ub3RlIiwiczNfYnVja2V0Iiwic3RfdG9vbHRpcF9zM19idWNrZXRfaGVhZGVyIiwic3RfdG9vbHRpcF9zM19idWNrZXRfZGVzYyIsInN0X3Rvb2x0aXBfczNfYnVja2V0X2l0ZW0xIiwic3RfdG9vbHRpcF9zM19idWNrZXRfaXRlbTIiLCJzdF90b29sdGlwX3MzX2J1Y2tldF9pdGVtMyIsInMzX2FjY2Vzc19rZXkiLCJzdF90b29sdGlwX3MzX2FjY2Vzc19rZXlfaGVhZGVyIiwic3RfdG9vbHRpcF9zM19hY2Nlc3Nfa2V5X2Rlc2MiLCJzdF90b29sdGlwX3MzX2FjY2Vzc19rZXlfbm90ZSIsInMzX3NlY3JldF9rZXkiLCJzdF90b29sdGlwX3MzX3NlY3JldF9rZXlfaGVhZGVyIiwic3RfdG9vbHRpcF9zM19zZWNyZXRfa2V5X2Rlc2MiLCJzdF90b29sdGlwX3dhcm5pbmciLCJzdF90b29sdGlwX3MzX3NlY3JldF9rZXlfd2FybmluZyIsImxvY2FsX3JldGVudGlvbl9wZXJpb2QiLCJzdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9oZWFkZXIiLCJzdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9kZXNjIiwic3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25faXRlbTEiLCJzdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9pdGVtMiIsInN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2l0ZW0zIiwic3RfdG9vbHRpcF9ub3RlIiwic3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25fd2FybmluZyIsImVhY2giLCJpbmRleCIsImVsZW1lbnQiLCIkaWNvbiIsImZpZWxkTmFtZSIsImNvbnRlbnQiLCJwb3B1cCIsInBvc2l0aW9uIiwiaG92ZXJhYmxlIiwiZGVsYXkiLCJ2YXJpYXRpb24iLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJjYkFmdGVyU2VuZEZvcm0iLCJzdWNjZXNzIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsWUFBWSxHQUFHO0FBQ2pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMscUJBQUQsQ0FOTTs7QUFRakI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFRCxDQUFDLENBQUMscUJBQUQsQ0FaQzs7QUFjakI7QUFDSjtBQUNBO0FBQ0E7QUFDSUUsRUFBQUEsZUFBZSxFQUFFRixDQUFDLENBQUMsdUJBQUQsQ0FsQkQ7O0FBb0JqQjtBQUNKO0FBQ0E7QUFDQTtBQUNJRyxFQUFBQSxZQUFZLEVBQUVILENBQUMsQ0FBQyxlQUFELENBeEJFOztBQTBCakI7QUFDSjtBQUNBO0FBQ0E7QUFDSUksRUFBQUEsd0JBQXdCLEVBQUVKLENBQUMsQ0FBQyw0QkFBRCxDQTlCVjs7QUFpQ2pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lLLEVBQUFBLGlCQUFpQixFQUFFLENB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QUFDSSxlQUFwQztBQUNBc0MsSUFBQUEsSUFBSSxDQUFDckMsWUFBTCxHQUFvQkwsWUFBWSxDQUFDSyxZQUFqQztBQUNBcUMsSUFBQUEsSUFBSSxDQUFDbEMsYUFBTCxHQUFxQlIsWUFBWSxDQUFDUSxhQUFsQztBQUNBa0MsSUFBQUEsSUFBSSxDQUFDa0ksZ0JBQUwsR0FBd0I1SyxZQUFZLENBQUM0SyxnQkFBckM7QUFDQWxJLElBQUFBLElBQUksQ0FBQ29JLGVBQUwsR0FBdUI5SyxZQUFZLENBQUM4SyxlQUFwQyxDQVBhLENBU2I7O0FBQ0FwSSxJQUFBQSxJQUFJLENBQUNzSSxXQUFMLEdBQW1CO0FBQ2ZDLE1BQUFBLE9BQU8sRUFBRSxJQURNO0FBRWZDLE1BQUFBLFNBQVMsRUFBRXRJLFVBRkk7QUFHZnVJLE1BQUFBLFVBQVUsRUFBRSxRQUhHLENBR007O0FBSE4sS0FBbkI7QUFNQXpJLElBQUFBLElBQUksQ0FBQ2pDLFVBQUw7QUFDSDtBQWplZ0IsQ0FBckIsQyxDQW9lQTs7QUFDQVAsQ0FBQyxDQUFDeUYsUUFBRCxDQUFELENBQVl5RixLQUFaLENBQWtCLFlBQU07QUFDcEJwTCxFQUFBQSxZQUFZLENBQUNTLFVBQWI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgU3RvcmFnZUFQSSwgVXNlck1lc3NhZ2UsIHMzU3RvcmFnZUluZGV4LCAkICovXG5cbi8qKlxuICogU3RvcmFnZSBtYW5hZ2VtZW50IG1vZHVsZVxuICovXG5jb25zdCBzdG9yYWdlSW5kZXggPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGxvY2FsIHN0b3JhZ2UgZm9ybSAoVGFiIDIpLlxuICAgICAqIFNlbmRzIGRhdGEgdG86IFBBVENIIC9wYnhjb3JlL2FwaS92My9zdG9yYWdlXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI2xvY2FsLXN0b3JhZ2UtZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHN1Ym1pdCBidXR0b24gKHVuaXF1ZSB0byB0aGlzIGZvcm0pLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHN1Ym1pdEJ1dHRvbjogJCgnI3N1Ym1pdGJ1dHRvbi1sb2NhbCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGRyb3Bkb3duIHN1Ym1pdCAodW5pcXVlIHRvIHRoaXMgZm9ybSkuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZHJvcGRvd25TdWJtaXQ6ICQoJyNkcm9wZG93blN1Ym1pdC1sb2NhbCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGRpcnR5IGZpZWxkICh1bmlxdWUgdG8gdGhpcyBmb3JtKS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkaXJydHlGaWVsZDogJCgnI2RpcnJ0eS1sb2NhbCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHJlY29yZHMgcmV0ZW50aW9uIHBlcmlvZCBzbGlkZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkcmVjb3Jkc1NhdmVQZXJpb2RTbGlkZXI6ICQoJyNQQlhSZWNvcmRTYXZlUGVyaW9kU2xpZGVyJyksXG5cblxuICAgIC8qKlxuICAgICAqIFBvc3NpYmxlIHBlcmlvZCB2YWx1ZXMgZm9yIHRoZSByZWNvcmRzIHJldGVudGlvbi5cbiAgICAgKiBWYWx1ZXMgaW4gZGF5czogMzAsIDkwLCAxODAsIDM2MCwgMTA4MCwgJycgKGluZmluaXR5KVxuICAgICAqL1xuICAgIHNhdmVSZWNvcmRzUGVyaW9kOiBbJzMwJywgJzkwJywgJzE4MCcsICczNjAnLCAnMTA4MCcsICcnXSxcblxuXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgbG9jYWwgc3RvcmFnZSBmb3JtLlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge30sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBtb2R1bGUgd2l0aCBldmVudCBiaW5kaW5ncyBhbmQgY29tcG9uZW50IGluaXRpYWxpemF0aW9ucy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBFbmFibGUgdGFiIG5hdmlnYXRpb25cbiAgICAgICAgJCgnI3N0b3JhZ2UtbWVudScpLmZpbmQoJy5pdGVtJykudGFiKHtcbiAgICAgICAgICAgICAgICBoaXN0b3J5OiB0cnVlLFxuICAgICAgICAgICAgICAgIGhpc3RvcnlUeXBlOiAnaGFzaCcsXG4gICAgICAgICAgICAgICAgICAgb25WaXNpYmxlOiBmdW5jdGlvbih0YWJQYXRoKSB7XG4gICAgICAgICAgICAgICAgLy8gTG9hZCBzdG9yYWdlIGRhdGEgd2hlbiBzdG9yYWdlIGluZm8gdGFiIGlzIGFjdGl2YXRlZFxuICAgICAgICAgICAgICAgIGlmICh0YWJQYXRoID09PSAnc3RvcmFnZS1pbmZvJykge1xuICAgICAgICAgICAgICAgICAgICBzdG9yYWdlSW5kZXgubG9hZFN0b3JhZ2VEYXRhKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgbG9jYWwgc3RvcmFnZSBmb3JtIHdoZW4gdGFiIGJlY29tZXMgdmlzaWJsZVxuICAgICAgICAgICAgICAgIGlmICh0YWJQYXRoID09PSAnc3RvcmFnZS1sb2NhbCcpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RvcmFnZUluZGV4LmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgUzMgZm9ybSB3aGVuIGNsb3VkIHRhYiBiZWNvbWVzIHZpc2libGVcbiAgICAgICAgICAgICAgICBpZiAodGFiUGF0aCA9PT0gJ3N0b3JhZ2UtY2xvdWQnICYmIHR5cGVvZiBzM1N0b3JhZ2VJbmRleCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHJlY29yZHMgc2F2ZSBwZXJpb2Qgc2xpZGVyXG4gICAgICAgIHN0b3JhZ2VJbmRleC4kcmVjb3Jkc1NhdmVQZXJpb2RTbGlkZXJcbiAgICAgICAgICAgIC5zbGlkZXIoe1xuICAgICAgICAgICAgICAgIG1pbjogMCxcbiAgICAgICAgICAgICAgICBtYXg6IDUsXG4gICAgICAgICAgICAgICAgc3RlcDogMSxcbiAgICAgICAgICAgICAgICBzbW9vdGg6IHRydWUsXG4gICAgICAgICAgICAgICAgYXV0b0FkanVzdExhYmVsczogZmFsc2UsXG4gICAgICAgICAgICAgICAgaW50ZXJwcmV0TGFiZWw6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsYWJlbHMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAwOiBnbG9iYWxUcmFuc2xhdGUuc3RfU3RvcmUxTW9udGhPZlJlY29yZHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAxOiBnbG9iYWxUcmFuc2xhdGUuc3RfU3RvcmUzTW9udGhzT2ZSZWNvcmRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgMjogZ2xvYmFsVHJhbnNsYXRlLnN0X1N0b3JlNk1vbnRoc09mUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIDM6IGdsb2JhbFRyYW5zbGF0ZS5zdF9TdG9yZTFZZWFyT2ZSZWNvcmRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgNDogZ2xvYmFsVHJhbnNsYXRlLnN0X1N0b3JlM1llYXJzT2ZSZWNvcmRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgNTogZ2xvYmFsVHJhbnNsYXRlLnN0X1N0b3JlQWxsUG9zc2libGVSZWNvcmRzLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGFiZWxzW3ZhbHVlXSB8fCAnJztcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiBzdG9yYWdlSW5kZXguY2JBZnRlclNlbGVjdFNhdmVQZXJpb2RTbGlkZXIsXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzXG4gICAgICAgIHN0b3JhZ2VJbmRleC5pbml0aWFsaXplVG9vbHRpcHMoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBmb3JtXG4gICAgICAgIHN0b3JhZ2VJbmRleC5pbml0aWFsaXplRm9ybSgpO1xuXG4gICAgICAgIC8vIExvYWQgc2V0dGluZ3MgZnJvbSBBUElcbiAgICAgICAgc3RvcmFnZUluZGV4LmxvYWRTZXR0aW5ncygpO1xuXG4gICAgICAgIC8vIExvYWQgc3RvcmFnZSBkYXRhIG9uIHBhZ2UgbG9hZFxuICAgICAgICBzdG9yYWdlSW5kZXgubG9hZFN0b3JhZ2VEYXRhKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgZXZlbnQgYWZ0ZXIgdGhlIHNlbGVjdCBzYXZlIHBlcmlvZCBzbGlkZXIgaXMgY2hhbmdlZC5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gdmFsdWUgLSBUaGUgc2VsZWN0ZWQgdmFsdWUgZnJvbSB0aGUgc2xpZGVyLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZWxlY3RTYXZlUGVyaW9kU2xpZGVyKHZhbHVlKSB7XG4gICAgICAgIC8vIEdldCB0aGUgc2F2ZSBwZXJpb2QgY29ycmVzcG9uZGluZyB0byB0aGUgc2xpZGVyIHZhbHVlLlxuICAgICAgICBjb25zdCBzYXZlUGVyaW9kID0gc3RvcmFnZUluZGV4LnNhdmVSZWNvcmRzUGVyaW9kW3ZhbHVlXTtcblxuICAgICAgICAvLyBTZXQgdGhlIGZvcm0gdmFsdWUgZm9yICdQQlhSZWNvcmRTYXZlUGVyaW9kJyB0byB0aGUgc2VsZWN0ZWQgc2F2ZSBwZXJpb2QuXG4gICAgICAgIHN0b3JhZ2VJbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnUEJYUmVjb3JkU2F2ZVBlcmlvZCcsIHNhdmVQZXJpb2QpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBTMyBsb2NhbCByZXRlbnRpb24gc2xpZGVyIG1heGltdW0gKGlmIFMzIG1vZHVsZSBsb2FkZWQpXG4gICAgICAgIGlmICh0eXBlb2YgczNTdG9yYWdlSW5kZXggIT09ICd1bmRlZmluZWQnICYmIHMzU3RvcmFnZUluZGV4LnVwZGF0ZVNsaWRlckxpbWl0cykge1xuICAgICAgICAgICAgczNTdG9yYWdlSW5kZXgudXBkYXRlU2xpZGVyTGltaXRzKHNhdmVQZXJpb2QpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVHJpZ2dlciBjaGFuZ2UgZXZlbnQgdG8gYWNrbm93bGVkZ2UgdGhlIG1vZGlmaWNhdGlvblxuICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogTG9hZCBTdG9yYWdlIHNldHRpbmdzIGZyb20gQVBJXG4gICAgICovXG4gICAgbG9hZFNldHRpbmdzKCkge1xuICAgICAgICBTdG9yYWdlQVBJLmdldCgocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5kYXRhO1xuXG4gICAgICAgICAgICAgICAgLy8gU2V0IGZvcm0gdmFsdWVzIGZvciBsb2NhbCBzdG9yYWdlIG9ubHlcbiAgICAgICAgICAgICAgICBzdG9yYWdlSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlcycsIHtcbiAgICAgICAgICAgICAgICAgICAgUEJYUmVjb3JkU2F2ZVBlcmlvZDogZGF0YS5QQlhSZWNvcmRTYXZlUGVyaW9kIHx8ICcnXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdG90YWwgcmV0ZW50aW9uIHBlcmlvZCBzbGlkZXJcbiAgICAgICAgICAgICAgICBjb25zdCByZWNvcmRTYXZlUGVyaW9kID0gZGF0YS5QQlhSZWNvcmRTYXZlUGVyaW9kIHx8ICcnO1xuICAgICAgICAgICAgICAgIGNvbnN0IHNsaWRlckluZGV4ID0gc3RvcmFnZUluZGV4LnNhdmVSZWNvcmRzUGVyaW9kLmluZGV4T2YocmVjb3JkU2F2ZVBlcmlvZCk7XG4gICAgICAgICAgICAgICAgc3RvcmFnZUluZGV4LiRyZWNvcmRzU2F2ZVBlcmlvZFNsaWRlci5zbGlkZXIoXG4gICAgICAgICAgICAgICAgICAgICdzZXQgdmFsdWUnLFxuICAgICAgICAgICAgICAgICAgICBzbGlkZXJJbmRleCxcbiAgICAgICAgICAgICAgICAgICAgZmFsc2VcbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgLy8gTm90aWZ5IFMzIG1vZHVsZSBhYm91dCB0b3RhbCByZXRlbnRpb24gY2hhbmdlIChpZiBsb2FkZWQpXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBzM1N0b3JhZ2VJbmRleCAhPT0gJ3VuZGVmaW5lZCcgJiYgczNTdG9yYWdlSW5kZXgudXBkYXRlU2xpZGVyTGltaXRzKSB7XG4gICAgICAgICAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LnVwZGF0ZVNsaWRlckxpbWl0cyhyZWNvcmRTYXZlUGVyaW9kKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCBzdG9yYWdlIHVzYWdlIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBsb2FkU3RvcmFnZURhdGEoKSB7XG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICAkKCcjc3RvcmFnZS11c2FnZS1jb250YWluZXIgLmRpbW1lcicpLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgJCgnI3N0b3JhZ2UtZGV0YWlscycpLmhpZGUoKTtcblxuICAgICAgICAvLyBNYWtlIEFQSSBjYWxsIHRvIGdldCBzdG9yYWdlIHVzYWdlIHVzaW5nIG5ldyBTdG9yYWdlQVBJXG4gICAgICAgIFN0b3JhZ2VBUEkuZ2V0VXNhZ2UoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBzdG9yYWdlSW5kZXgucmVuZGVyU3RvcmFnZURhdGEocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICQoJyNzdG9yYWdlLXVzYWdlLWNvbnRhaW5lciAuZGltbWVyJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhnbG9iYWxUcmFuc2xhdGUuc3RfU3RvcmFnZUxvYWRFcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUmVuZGVyIHN0b3JhZ2UgdXNhZ2UgZGF0YSBpbiB0aGUgVUlcbiAgICAgKi9cbiAgICByZW5kZXJTdG9yYWdlRGF0YShkYXRhKSB7XG4gICAgICAgIC8vIEhpZGUgbG9hZGluZyBhbmQgc2hvdyBkZXRhaWxzXG4gICAgICAgICQoJyNzdG9yYWdlLXVzYWdlLWNvbnRhaW5lciAuZGltbWVyJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAkKCcjc3RvcmFnZS1kZXRhaWxzJykuc2hvdygpO1xuICAgICAgICBcbiAgICAgICAgLy8gRm9ybWF0IHNpemUgZm9yIGRpc3BsYXlcbiAgICAgICAgY29uc3QgZm9ybWF0U2l6ZSA9IChzaXplSW5NYikgPT4ge1xuICAgICAgICAgICAgaWYgKHNpemVJbk1iID49IDEwMjQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKHNpemVJbk1iIC8gMTAyNCkudG9GaXhlZCgxKSArICcgR0InO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHNpemVJbk1iLnRvRml4ZWQoMSkgKyAnIE1CJztcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBoZWFkZXIgaW5mb3JtYXRpb25cbiAgICAgICAgJCgnI3VzZWQtc3BhY2UtdGV4dCcpLnRleHQoZm9ybWF0U2l6ZShkYXRhLnVzZWRfc3BhY2UpKTtcbiAgICAgICAgJCgnI3RvdGFsLXNpemUtdGV4dCcpLnRleHQoZm9ybWF0U2l6ZShkYXRhLnRvdGFsX3NpemUpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBwcm9ncmVzcyBzZWdtZW50cyBpbiBtYWNPUyBzdHlsZVxuICAgICAgICBsZXQgYWNjdW11bGF0ZWRXaWR0aCA9IDA7XG4gICAgICAgIFxuICAgICAgICAvLyBQcm9jZXNzIGVhY2ggY2F0ZWdvcnlcbiAgICAgICAgWydjYWxsX3JlY29yZGluZ3MnLCAnY2RyX2RhdGFiYXNlJywgJ3N5c3RlbV9sb2dzJywgJ21vZHVsZXMnLCAnYmFja3VwcycsICdzeXN0ZW1fY2FjaGVzJywgJ290aGVyJ10uZm9yRWFjaChjYXRlZ29yeSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjYXREYXRhID0gZGF0YS5jYXRlZ29yaWVzW2NhdGVnb3J5XTtcbiAgICAgICAgICAgIGNvbnN0ICRzZWdtZW50ID0gJChgLnByb2dyZXNzLXNlZ21lbnRbZGF0YS1jYXRlZ29yeT1cIiR7Y2F0ZWdvcnl9XCJdYCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChjYXREYXRhICYmIGNhdERhdGEucGVyY2VudGFnZSA+IDApIHtcbiAgICAgICAgICAgICAgICAkc2VnbWVudC5jc3MoJ3dpZHRoJywgY2F0RGF0YS5wZXJjZW50YWdlICsgJyUnKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQWRkIGhvdmVyIHRvb2x0aXBcbiAgICAgICAgICAgICAgICBjb25zdCBjYXRlZ29yeUtleSA9ICdzdF9DYXRlZ29yeScgKyBjYXRlZ29yeS5zcGxpdCgnXycpLm1hcCh3b3JkID0+IHdvcmQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB3b3JkLnNsaWNlKDEpKS5qb2luKCcnKTtcbiAgICAgICAgICAgICAgICAkc2VnbWVudC5hdHRyKCd0aXRsZScsIGAke2dsb2JhbFRyYW5zbGF0ZVtjYXRlZ29yeUtleV0gfHwgY2F0ZWdvcnl9OiAke2Zvcm1hdFNpemUoY2F0RGF0YS5zaXplKX0gKCR7Y2F0RGF0YS5wZXJjZW50YWdlfSUpYCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgYWNjdW11bGF0ZWRXaWR0aCArPSBjYXREYXRhLnBlcmNlbnRhZ2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRzZWdtZW50LmhpZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIGNhdGVnb3J5IHNpemUgaW4gbGlzdFxuICAgICAgICAgICAgJChgIyR7Y2F0ZWdvcnl9LXNpemVgKS50ZXh0KGZvcm1hdFNpemUoY2F0RGF0YSA/IGNhdERhdGEuc2l6ZSA6IDApKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgaG92ZXIgZWZmZWN0cyBmb3IgcHJvZ3Jlc3Mgc2VnbWVudHNcbiAgICAgICAgJCgnLnByb2dyZXNzLXNlZ21lbnQnKS5vbignbW91c2VlbnRlcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGNvbnN0ICR0aGlzID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IHRvb2x0aXAgPSAkKCc8ZGl2IGNsYXNzPVwic3RvcmFnZS10b29sdGlwXCI+PC9kaXY+JykudGV4dCgkdGhpcy5hdHRyKCd0aXRsZScpKTtcbiAgICAgICAgICAgICQoJ2JvZHknKS5hcHBlbmQodG9vbHRpcCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICQoZG9jdW1lbnQpLm9uKCdtb3VzZW1vdmUudG9vbHRpcCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICB0b29sdGlwLmNzcyh7XG4gICAgICAgICAgICAgICAgICAgIGxlZnQ6IGUucGFnZVggKyAxMCxcbiAgICAgICAgICAgICAgICAgICAgdG9wOiBlLnBhZ2VZIC0gMzBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KS5vbignbW91c2VsZWF2ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJCgnLnN0b3JhZ2UtdG9vbHRpcCcpLnJlbW92ZSgpO1xuICAgICAgICAgICAgJChkb2N1bWVudCkub2ZmKCdtb3VzZW1vdmUudG9vbHRpcCcpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhpZ2hsaWdodCBjYXRlZ29yeSBvbiBob3ZlclxuICAgICAgICAkKCcuY2F0ZWdvcnktaXRlbScpLm9uKCdtb3VzZWVudGVyJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCBjYXRlZ29yeSA9ICQodGhpcykuZGF0YSgnY2F0ZWdvcnknKTtcbiAgICAgICAgICAgICQoYC5wcm9ncmVzcy1zZWdtZW50W2RhdGEtY2F0ZWdvcnk9XCIke2NhdGVnb3J5fVwiXWApLmNzcygnb3BhY2l0eScsICcwLjcnKTtcbiAgICAgICAgfSkub24oJ21vdXNlbGVhdmUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICQoJy5wcm9ncmVzcy1zZWdtZW50JykuY3NzKCdvcGFjaXR5JywgJzEnKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXAgcG9wdXBcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIC0gVG9vbHRpcCBjb25maWd1cmF0aW9uIG9iamVjdFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgc3RyaW5nIGZvciBwb3B1cCBjb250ZW50XG4gICAgICovXG4gICAgYnVpbGRUb29sdGlwQ29udGVudChjb25maWcpIHtcbiAgICAgICAgbGV0IGh0bWwgPSAnPGRpdiBjbGFzcz1cInVpIHJlbGF4ZWQgbGlzdFwiPic7XG5cbiAgICAgICAgLy8gSGVhZGVyXG4gICAgICAgIGlmIChjb25maWcuaGVhZGVyKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxzdHJvbmc+JHtjb25maWcuaGVhZGVyfTwvc3Ryb25nPjwvZGl2PmA7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEZXNjcmlwdGlvblxuICAgICAgICBpZiAoY29uZmlnLmRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPiR7Y29uZmlnLmRlc2NyaXB0aW9ufTwvZGl2PmA7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBNYWluIGxpc3RcbiAgICAgICAgaWYgKGNvbmZpZy5saXN0ICYmIGNvbmZpZy5saXN0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+PHVsIGNsYXNzPVwidWkgbGlzdFwiPic7XG4gICAgICAgICAgICBjb25maWcubGlzdC5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGxpPiR7aXRlbX08L2xpPmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpdGVtLnRlcm0gJiYgaXRlbS5kZWZpbml0aW9uID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNlY3Rpb24gaGVhZGVyXG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDwvdWw+PHN0cm9uZz4ke2l0ZW0udGVybX08L3N0cm9uZz48dWwgY2xhc3M9XCJ1aSBsaXN0XCI+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0udGVybSAmJiBpdGVtLmRlZmluaXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVGVybSB3aXRoIGRlZmluaXRpb25cbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGxpPjxzdHJvbmc+JHtpdGVtLnRlcm19Ojwvc3Ryb25nPiAke2l0ZW0uZGVmaW5pdGlvbn08L2xpPmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBodG1sICs9ICc8L3VsPjwvZGl2Pic7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGRpdGlvbmFsIGxpc3RzIChsaXN0Mi1saXN0MTApXG4gICAgICAgIGZvciAobGV0IGkgPSAyOyBpIDw9IDEwOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGxpc3RLZXkgPSBgbGlzdCR7aX1gO1xuICAgICAgICAgICAgaWYgKGNvbmZpZ1tsaXN0S2V5XSAmJiBjb25maWdbbGlzdEtleV0ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+PHVsIGNsYXNzPVwidWkgbGlzdFwiPic7XG4gICAgICAgICAgICAgICAgY29uZmlnW2xpc3RLZXldLmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT4ke2l0ZW19PC9saT5gO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPC91bD48L2Rpdj4nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gV2FybmluZ1xuICAgICAgICBpZiAoY29uZmlnLndhcm5pbmcpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+PGRpdiBjbGFzcz1cInVpIG9yYW5nZSBtZXNzYWdlXCI+JztcbiAgICAgICAgICAgIGlmIChjb25maWcud2FybmluZy5oZWFkZXIpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtjb25maWcud2FybmluZy5oZWFkZXJ9PC9kaXY+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjb25maWcud2FybmluZy50ZXh0KSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPHA+JHtjb25maWcud2FybmluZy50ZXh0fTwvcD5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+PC9kaXY+JztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEV4YW1wbGVzXG4gICAgICAgIGlmIChjb25maWcuZXhhbXBsZXMgJiYgY29uZmlnLmV4YW1wbGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGlmIChjb25maWcuZXhhbXBsZXNIZWFkZXIpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxzdHJvbmc+JHtjb25maWcuZXhhbXBsZXNIZWFkZXJ9PC9zdHJvbmc+PC9kaXY+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+PHByZSBzdHlsZT1cImJhY2tncm91bmQ6I2Y0ZjRmNDtwYWRkaW5nOjEwcHg7Ym9yZGVyLXJhZGl1czo0cHg7XCI+JztcbiAgICAgICAgICAgIGh0bWwgKz0gY29uZmlnLmV4YW1wbGVzLmpvaW4oJ1xcbicpO1xuICAgICAgICAgICAgaHRtbCArPSAnPC9wcmU+PC9kaXY+JztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE5vdGVcbiAgICAgICAgaWYgKGNvbmZpZy5ub3RlKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxlbT4ke2NvbmZpZy5ub3RlfTwvZW0+PC9kaXY+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVUb29sdGlwcygpIHtcbiAgICAgICAgLy8gVG9vbHRpcCBjb25maWd1cmF0aW9ucyBmb3IgZWFjaCBmaWVsZFxuICAgICAgICBjb25zdCB0b29sdGlwQ29uZmlncyA9IHtcbiAgICAgICAgICAgIHJlY29yZF9yZXRlbnRpb25fcGVyaW9kOiBzdG9yYWdlSW5kZXguYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2hlYWRlciB8fCAnVG90YWwgUmV0ZW50aW9uIFBlcmlvZCcsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25fZGVzYyB8fCAnSG93IGxvbmcgY2FsbCByZWNvcmRpbmdzIGFyZSBrZXB0IGluIHRoZSBzeXN0ZW0nLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9pdGVtMSB8fCAnMzAgZGF5cyAtIG1pbmltdW0gc3RvcmFnZSBwZXJpb2QnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2l0ZW0yIHx8ICc5MCBkYXlzIC0gcmVjb21tZW5kZWQgZm9yIHNtYWxsIGJ1c2luZXNzZXMnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2l0ZW0zIHx8ICcxIHllYXIgLSBjb21wbGlhbmNlIHJlcXVpcmVtZW50cycsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTQgfHwgJ1VubGltaXRlZCAtIGtlZXAgYWxsIHJlY29yZGluZ3MnXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl93YXJuaW5nX2hlYWRlciB8fCAnU3RvcmFnZSBXYXJuaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl93YXJuaW5nIHx8ICdMb25nZXIgcmV0ZW50aW9uIHBlcmlvZHMgcmVxdWlyZSBtb3JlIGRpc2sgc3BhY2UnXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgIHMzX2VuYWJsZWQ6IHN0b3JhZ2VJbmRleC5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2VuYWJsZWRfaGVhZGVyIHx8ICdDbG91ZCBTdG9yYWdlJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfZW5hYmxlZF9kZXNjIHx8ICdVcGxvYWQgcmVjb3JkaW5ncyB0byBTMy1jb21wYXRpYmxlIGNsb3VkIHN0b3JhZ2UgZm9yIGJhY2t1cCBhbmQgYXJjaGl2YWwnLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfZW5hYmxlZF9pdGVtMSB8fCAnQXV0b21hdGljIHVwbG9hZCBhZnRlciByZWNvcmRpbmcgY29tcGxldGlvbicsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2VuYWJsZWRfaXRlbTIgfHwgJ0ZyZWVzIHVwIGxvY2FsIGRpc2sgc3BhY2UnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19lbmFibGVkX2l0ZW0zIHx8ICdDb21wYXRpYmxlIHdpdGggQVdTIFMzLCBNaW5JTywgV2FzYWJpJ1xuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICBzM19lbmRwb2ludDogc3RvcmFnZUluZGV4LmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfZW5kcG9pbnRfaGVhZGVyIHx8ICdTMyBFbmRwb2ludCBVUkwnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19lbmRwb2ludF9kZXNjIHx8ICdBUEkgZW5kcG9pbnQgZm9yIHlvdXIgUzMtY29tcGF0aWJsZSBzdG9yYWdlIHNlcnZpY2UnLFxuICAgICAgICAgICAgICAgIGV4YW1wbGVzOiBbXG4gICAgICAgICAgICAgICAgICAgICdBV1MgUzM6IGh0dHBzOi8vczMuYW1hem9uYXdzLmNvbScsXG4gICAgICAgICAgICAgICAgICAgICdNaW5JTzogaHR0cDovL21pbmlvLmV4YW1wbGUuY29tOjkwMDAnLFxuICAgICAgICAgICAgICAgICAgICAnV2FzYWJpOiBodHRwczovL3MzLndhc2FiaXN5cy5jb20nXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBleGFtcGxlc0hlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfZXhhbXBsZXMgfHwgJ0V4YW1wbGVzJ1xuICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgIHMzX3JlZ2lvbjogc3RvcmFnZUluZGV4LmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfcmVnaW9uX2hlYWRlciB8fCAnUzMgUmVnaW9uJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfcmVnaW9uX2Rlc2MgfHwgJ0dlb2dyYXBoaWMgcmVnaW9uIHdoZXJlIHlvdXIgYnVja2V0IGlzIGxvY2F0ZWQnLFxuICAgICAgICAgICAgICAgIGV4YW1wbGVzOiBbXG4gICAgICAgICAgICAgICAgICAgICd1cy1lYXN0LTEgKGRlZmF1bHQpJyxcbiAgICAgICAgICAgICAgICAgICAgJ2V1LXdlc3QtMScsXG4gICAgICAgICAgICAgICAgICAgICdhcC1zb3V0aGVhc3QtMSdcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX3JlZ2lvbl9ub3RlIHx8ICdNdXN0IG1hdGNoIHlvdXIgYnVja2V0IHJlZ2lvbiBmb3IgQVdTIFMzJ1xuICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgIHMzX2J1Y2tldDogc3RvcmFnZUluZGV4LmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfYnVja2V0X2hlYWRlciB8fCAnQnVja2V0IE5hbWUnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19idWNrZXRfZGVzYyB8fCAnTmFtZSBvZiB0aGUgUzMgYnVja2V0IGZvciBzdG9yaW5nIHJlY29yZGluZ3MnLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfYnVja2V0X2l0ZW0xIHx8ICdNdXN0IGJlIHVuaXF1ZSBhY3Jvc3MgYWxsIFMzIHVzZXJzIChmb3IgQVdTKScsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2J1Y2tldF9pdGVtMiB8fCAnT25seSBsb3dlcmNhc2UgbGV0dGVycywgbnVtYmVycywgaHlwaGVucycsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2J1Y2tldF9pdGVtMyB8fCAnTXVzdCBhbHJlYWR5IGV4aXN0IC0gd2lsbCBub3QgYmUgY3JlYXRlZCdcbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgczNfYWNjZXNzX2tleTogc3RvcmFnZUluZGV4LmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfYWNjZXNzX2tleV9oZWFkZXIgfHwgJ0FjY2VzcyBLZXkgSUQnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19hY2Nlc3Nfa2V5X2Rlc2MgfHwgJ1B1YmxpYyBpZGVudGlmaWVyIGZvciBBUEkgYXV0aGVudGljYXRpb24nLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2FjY2Vzc19rZXlfbm90ZSB8fCAnU2ltaWxhciB0byB1c2VybmFtZSAtIHNhZmUgdG8gZGlzcGxheSdcbiAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICBzM19zZWNyZXRfa2V5OiBzdG9yYWdlSW5kZXguYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19zZWNyZXRfa2V5X2hlYWRlciB8fCAnU2VjcmV0IEFjY2VzcyBLZXknLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19zZWNyZXRfa2V5X2Rlc2MgfHwgJ1ByaXZhdGUga2V5IGZvciBBUEkgYXV0aGVudGljYXRpb24nLFxuICAgICAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF93YXJuaW5nIHx8ICdTZWN1cml0eSBXYXJuaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfc2VjcmV0X2tleV93YXJuaW5nIHx8ICdLZWVwIHRoaXMgc2VjcmV0IHNhZmUgLSB0cmVhdCBpdCBsaWtlIGEgcGFzc3dvcmQnXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgIGxvY2FsX3JldGVudGlvbl9wZXJpb2Q6IHN0b3JhZ2VJbmRleC5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9oZWFkZXIgfHwgJ0xvY2FsIFJldGVudGlvbiBQZXJpb2QnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25fZGVzYyB8fCAnSG93IGxvbmcgdG8ga2VlcCByZWNvcmRpbmdzIGxvY2FsbHkgYmVmb3JlIGRlbGV0aW5nJyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9pdGVtMSB8fCAnQWZ0ZXIgdGhpcyBwZXJpb2QsIHJlY29yZGluZ3MgYXJlIGRlbGV0ZWQgZnJvbSBsb2NhbCBzdG9yYWdlJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2l0ZW0yIHx8ICdGaWxlcyByZW1haW4gaW4gUzMgY2xvdWQgc3RvcmFnZScsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9pdGVtMyB8fCAnQ2Fubm90IGV4Y2VlZCB0b3RhbCByZXRlbnRpb24gcGVyaW9kJ1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX25vdGUgfHwgJ05vdGUnLFxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25fd2FybmluZyB8fCAnU2hvcnRlciBsb2NhbCByZXRlbnRpb24gZnJlZXMgZGlzayBzcGFjZSBmYXN0ZXInXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHBvcHVwIGZvciBlYWNoIHRvb2x0aXAgaWNvblxuICAgICAgICAkKCcuZmllbGQtaW5mby1pY29uJykuZWFjaCgoaW5kZXgsIGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJChlbGVtZW50KTtcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9ICRpY29uLmRhdGEoJ2ZpZWxkJyk7XG4gICAgICAgICAgICBjb25zdCBjb250ZW50ID0gdG9vbHRpcENvbmZpZ3NbZmllbGROYW1lXTtcblxuICAgICAgICAgICAgaWYgKGNvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICAkaWNvbi5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgIGh0bWw6IGNvbnRlbnQsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIHJpZ2h0JyxcbiAgICAgICAgICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hvdzogMzAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGlkZTogMTAwXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ2Zsb3dpbmcnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IHN0b3JhZ2VJbmRleC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKCFyZXNwb25zZS5zdWNjZXNzKSB7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBjdXN0b20gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IHN0b3JhZ2VJbmRleC4kZm9ybU9iajtcbiAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uID0gc3RvcmFnZUluZGV4LiRzdWJtaXRCdXR0b247XG4gICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0ID0gc3RvcmFnZUluZGV4LiRkcm9wZG93blN1Ym1pdDtcbiAgICAgICAgRm9ybS4kZGlycnR5RmllbGQgPSBzdG9yYWdlSW5kZXguJGRpcnJ0eUZpZWxkO1xuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBzdG9yYWdlSW5kZXgudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gc3RvcmFnZUluZGV4LmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gc3RvcmFnZUluZGV4LmNiQWZ0ZXJTZW5kRm9ybTtcblxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUEkgc2V0dGluZ3MgZm9yIEZvcm0uanMgKHNpbmdsZXRvbiByZXNvdXJjZSlcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBhcGlPYmplY3Q6IFN0b3JhZ2VBUEksXG4gICAgICAgICAgICBzYXZlTWV0aG9kOiAndXBkYXRlJyAvLyBVc2luZyBzdGFuZGFyZCBQVVQgZm9yIHNpbmdsZXRvbiB1cGRhdGVcbiAgICAgICAgfTtcblxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9XG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgc3RvcmFnZSBtYW5hZ2VtZW50IGludGVyZmFjZS5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBzdG9yYWdlSW5kZXguaW5pdGlhbGl6ZSgpO1xufSk7Il19