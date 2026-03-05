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

    ['call_recordings', 'cdr_database', 'system_logs', 'modules', 'backups', 'system_caches', 's3_cache', 'other'].forEach(function (category) {
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
    }); // Render remote storage info (S3)

    if (data.remote_storage && data.remote_storage.s3 && data.remote_storage.s3.enabled && data.remote_storage.s3.size > 0) {
      var s3 = data.remote_storage.s3;
      $('#remote-storage-title').text(globalTranslate.st_S3RemoteStorageTitle);
      $('#remote-storage-details').text(globalTranslate.st_S3RemoteStorageInfo.replace('%files%', s3.files_count.toLocaleString()).replace('%size%', formatSize(s3.size)).replace('%bucket%', s3.bucket));
      $('#remote-storage-section').show();
    }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TdG9yYWdlL3N0b3JhZ2UtaW5kZXguanMiXSwibmFtZXMiOlsic3RvcmFnZUluZGV4IiwiJGZvcm1PYmoiLCIkIiwiJHN1Ym1pdEJ1dHRvbiIsIiRkcm9wZG93blN1Ym1pdCIsIiRkaXJydHlGaWVsZCIsIiRyZWNvcmRzU2F2ZVBlcmlvZFNsaWRlciIsInNhdmVSZWNvcmRzUGVyaW9kIiwidmFsaWRhdGVSdWxlcyIsImluaXRpYWxpemUiLCJmaW5kIiwidGFiIiwiaGlzdG9yeSIsImhpc3RvcnlUeXBlIiwib25WaXNpYmxlIiwidGFiUGF0aCIsImxvYWRTdG9yYWdlRGF0YSIsImluaXRpYWxpemVGb3JtIiwiczNTdG9yYWdlSW5kZXgiLCJzbGlkZXIiLCJtaW4iLCJtYXgiLCJzdGVwIiwic21vb3RoIiwiYXV0b0FkanVzdExhYmVscyIsImludGVycHJldExhYmVsIiwidmFsdWUiLCJsYWJlbHMiLCJnbG9iYWxUcmFuc2xhdGUiLCJzdF9TdG9yZTFNb250aE9mUmVjb3JkcyIsInN0X1N0b3JlM01vbnRoc09mUmVjb3JkcyIsInN0X1N0b3JlNk1vbnRoc09mUmVjb3JkcyIsInN0X1N0b3JlMVllYXJPZlJlY29yZHMiLCJzdF9TdG9yZTNZZWFyc09mUmVjb3JkcyIsInN0X1N0b3JlQWxsUG9zc2libGVSZWNvcmRzIiwib25DaGFuZ2UiLCJjYkFmdGVyU2VsZWN0U2F2ZVBlcmlvZFNsaWRlciIsImluaXRpYWxpemVUb29sdGlwcyIsImxvYWRTZXR0aW5ncyIsInNhdmVQZXJpb2QiLCJmb3JtIiwidXBkYXRlU2xpZGVyTGltaXRzIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwiU3RvcmFnZUFQSSIsImdldCIsInJlc3BvbnNlIiwicmVzdWx0IiwiZGF0YSIsIlBCWFJlY29yZFNhdmVQZXJpb2QiLCJyZWNvcmRTYXZlUGVyaW9kIiwic2xpZGVySW5kZXgiLCJpbmRleE9mIiwiYWRkQ2xhc3MiLCJoaWRlIiwiZ2V0VXNhZ2UiLCJyZW5kZXJTdG9yYWdlRGF0YSIsInJlbW92ZUNsYXNzIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJzdF9TdG9yYWdlTG9hZEVycm9yIiwic2hvdyIsImZvcm1hdFNpemUiLCJzaXplSW5NYiIsInRvRml4ZWQiLCJ0ZXh0IiwidXNlZF9zcGFjZSIsInRvdGFsX3NpemUiLCJhY2N1bXVsYXRlZFdpZHRoIiwiZm9yRWFjaCIsImNhdGVnb3J5IiwiY2F0RGF0YSIsImNhdGVnb3JpZXMiLCIkc2VnbWVudCIsInBlcmNlbnRhZ2UiLCJjc3MiLCJjYXRlZ29yeUtleSIsInNwbGl0IiwibWFwIiwid29yZCIsImNoYXJBdCIsInRvVXBwZXJDYXNlIiwic2xpY2UiLCJqb2luIiwiYXR0ciIsInNpemUiLCJvbiIsImUiLCIkdGhpcyIsInRvb2x0aXAiLCJhcHBlbmQiLCJkb2N1bWVudCIsImxlZnQiLCJwYWdlWCIsInRvcCIsInBhZ2VZIiwicmVtb3ZlIiwib2ZmIiwicmVtb3RlX3N0b3JhZ2UiLCJzMyIsImVuYWJsZWQiLCJzdF9TM1JlbW90ZVN0b3JhZ2VUaXRsZSIsInN0X1MzUmVtb3RlU3RvcmFnZUluZm8iLCJyZXBsYWNlIiwiZmlsZXNfY291bnQiLCJ0b0xvY2FsZVN0cmluZyIsImJ1Y2tldCIsImJ1aWxkVG9vbHRpcENvbnRlbnQiLCJjb25maWciLCJodG1sIiwiaGVhZGVyIiwiZGVzY3JpcHRpb24iLCJsaXN0IiwibGVuZ3RoIiwiaXRlbSIsInRlcm0iLCJkZWZpbml0aW9uIiwiaSIsImxpc3RLZXkiLCJ3YXJuaW5nIiwiZXhhbXBsZXMiLCJleGFtcGxlc0hlYWRlciIsIm5vdGUiLCJ0b29sdGlwQ29uZmlncyIsInJlY29yZF9yZXRlbnRpb25fcGVyaW9kIiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2hlYWRlciIsInN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9kZXNjIiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2l0ZW0xIiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2l0ZW0yIiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2l0ZW0zIiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2l0ZW00Iiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX3dhcm5pbmdfaGVhZGVyIiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX3dhcm5pbmciLCJzM19lbmFibGVkIiwic3RfdG9vbHRpcF9zM19lbmFibGVkX2hlYWRlciIsInN0X3Rvb2x0aXBfczNfZW5hYmxlZF9kZXNjIiwic3RfdG9vbHRpcF9zM19lbmFibGVkX2l0ZW0xIiwic3RfdG9vbHRpcF9zM19lbmFibGVkX2l0ZW0yIiwic3RfdG9vbHRpcF9zM19lbmFibGVkX2l0ZW0zIiwiczNfZW5kcG9pbnQiLCJzdF90b29sdGlwX3MzX2VuZHBvaW50X2hlYWRlciIsInN0X3Rvb2x0aXBfczNfZW5kcG9pbnRfZGVzYyIsInN0X3Rvb2x0aXBfZXhhbXBsZXMiLCJzM19yZWdpb24iLCJzdF90b29sdGlwX3MzX3JlZ2lvbl9oZWFkZXIiLCJzdF90b29sdGlwX3MzX3JlZ2lvbl9kZXNjIiwic3RfdG9vbHRpcF9zM19yZWdpb25fbm90ZSIsInMzX2J1Y2tldCIsInN0X3Rvb2x0aXBfczNfYnVja2V0X2hlYWRlciIsInN0X3Rvb2x0aXBfczNfYnVja2V0X2Rlc2MiLCJzdF90b29sdGlwX3MzX2J1Y2tldF9pdGVtMSIsInN0X3Rvb2x0aXBfczNfYnVja2V0X2l0ZW0yIiwic3RfdG9vbHRpcF9zM19idWNrZXRfaXRlbTMiLCJzM19hY2Nlc3Nfa2V5Iiwic3RfdG9vbHRpcF9zM19hY2Nlc3Nfa2V5X2hlYWRlciIsInN0X3Rvb2x0aXBfczNfYWNjZXNzX2tleV9kZXNjIiwic3RfdG9vbHRpcF9zM19hY2Nlc3Nfa2V5X25vdGUiLCJzM19zZWNyZXRfa2V5Iiwic3RfdG9vbHRpcF9zM19zZWNyZXRfa2V5X2hlYWRlciIsInN0X3Rvb2x0aXBfczNfc2VjcmV0X2tleV9kZXNjIiwic3RfdG9vbHRpcF93YXJuaW5nIiwic3RfdG9vbHRpcF9zM19zZWNyZXRfa2V5X3dhcm5pbmciLCJsb2NhbF9yZXRlbnRpb25fcGVyaW9kIiwic3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25faGVhZGVyIiwic3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25fZGVzYyIsInN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2l0ZW0xIiwic3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25faXRlbTIiLCJzdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9pdGVtMyIsInN0X3Rvb2x0aXBfbm90ZSIsInN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX3dhcm5pbmciLCJlYWNoIiwiaW5kZXgiLCJlbGVtZW50IiwiJGljb24iLCJmaWVsZE5hbWUiLCJjb250ZW50IiwicG9wdXAiLCJwb3NpdGlvbiIsImhvdmVyYWJsZSIsImRlbGF5IiwidmFyaWF0aW9uIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwiY2JBZnRlclNlbmRGb3JtIiwic3VjY2VzcyIsImFwaVNldHRpbmdzIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsWUFBWSxHQUFHO0FBQ2pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMscUJBQUQsQ0FOTTs7QUFRakI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFRCxDQUFDLENBQUMscUJBQUQsQ0FaQzs7QUFjakI7QUFDSjtBQUNBO0FBQ0E7QUFDSUUsRUFBQUEsZUFBZSxFQUFFRixDQUFDLENBQUMsdUJBQUQsQ0FsQkQ7O0FBb0JqQjtBQUNKO0FBQ0E7QUFDQTtBQUNJRyxFQUFBQSxZQUFZLEVBQUVILENBQUMsQ0FBQyxlQUFELENB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SUFBSSxDQUFDMkksZ0JBQUwsR0FBd0JyTCxZQUFZLENBQUNxTCxnQkFBckM7QUFDQTNJLElBQUFBLElBQUksQ0FBQzZJLGVBQUwsR0FBdUJ2TCxZQUFZLENBQUN1TCxlQUFwQyxDQVBhLENBU2I7O0FBQ0E3SSxJQUFBQSxJQUFJLENBQUMrSSxXQUFMLEdBQW1CO0FBQ2ZyRixNQUFBQSxPQUFPLEVBQUUsSUFETTtBQUVmc0YsTUFBQUEsU0FBUyxFQUFFOUksVUFGSTtBQUdmK0ksTUFBQUEsVUFBVSxFQUFFLFFBSEcsQ0FHTTs7QUFITixLQUFuQjtBQU1BakosSUFBQUEsSUFBSSxDQUFDakMsVUFBTDtBQUNIO0FBOWVnQixDQUFyQixDLENBaWZBOztBQUNBUCxDQUFDLENBQUN5RixRQUFELENBQUQsQ0FBWWlHLEtBQVosQ0FBa0IsWUFBTTtBQUNwQjVMLEVBQUFBLFlBQVksQ0FBQ1MsVUFBYjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBTdG9yYWdlQVBJLCBVc2VyTWVzc2FnZSwgczNTdG9yYWdlSW5kZXgsICQgKi9cblxuLyoqXG4gKiBTdG9yYWdlIG1hbmFnZW1lbnQgbW9kdWxlXG4gKi9cbmNvbnN0IHN0b3JhZ2VJbmRleCA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgbG9jYWwgc3RvcmFnZSBmb3JtIChUYWIgMikuXG4gICAgICogU2VuZHMgZGF0YSB0bzogUEFUQ0ggL3BieGNvcmUvYXBpL3YzL3N0b3JhZ2VcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjbG9jYWwtc3RvcmFnZS1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgc3VibWl0IGJ1dHRvbiAodW5pcXVlIHRvIHRoaXMgZm9ybSkuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc3VibWl0QnV0dG9uOiAkKCcjc3VibWl0YnV0dG9uLWxvY2FsJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZHJvcGRvd24gc3VibWl0ICh1bmlxdWUgdG8gdGhpcyBmb3JtKS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkcm9wZG93blN1Ym1pdDogJCgnI2Ryb3Bkb3duU3VibWl0LWxvY2FsJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZGlydHkgZmllbGQgKHVuaXF1ZSB0byB0aGlzIGZvcm0pLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRpcnJ0eUZpZWxkOiAkKCcjZGlycnR5LWxvY2FsJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgcmVjb3JkcyByZXRlbnRpb24gcGVyaW9kIHNsaWRlci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRyZWNvcmRzU2F2ZVBlcmlvZFNsaWRlcjogJCgnI1BCWFJlY29yZFNhdmVQZXJpb2RTbGlkZXInKSxcblxuXG4gICAgLyoqXG4gICAgICogUG9zc2libGUgcGVyaW9kIHZhbHVlcyBmb3IgdGhlIHJlY29yZHMgcmV0ZW50aW9uLlxuICAgICAqIFZhbHVlcyBpbiBkYXlzOiAzMCwgOTAsIDE4MCwgMzYwLCAxMDgwLCAnJyAoaW5maW5pdHkpXG4gICAgICovXG4gICAgc2F2ZVJlY29yZHNQZXJpb2Q6IFsnMzAnLCAnOTAnLCAnMTgwJywgJzM2MCcsICcxMDgwJywgJyddLFxuXG5cblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBsb2NhbCBzdG9yYWdlIGZvcm0uXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7fSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIG1vZHVsZSB3aXRoIGV2ZW50IGJpbmRpbmdzIGFuZCBjb21wb25lbnQgaW5pdGlhbGl6YXRpb25zLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEVuYWJsZSB0YWIgbmF2aWdhdGlvblxuICAgICAgICAkKCcjc3RvcmFnZS1tZW51JykuZmluZCgnLml0ZW0nKS50YWIoe1xuICAgICAgICAgICAgICAgIGhpc3Rvcnk6IHRydWUsXG4gICAgICAgICAgICAgICAgaGlzdG9yeVR5cGU6ICdoYXNoJyxcbiAgICAgICAgICAgICAgICAgICBvblZpc2libGU6IGZ1bmN0aW9uKHRhYlBhdGgpIHtcbiAgICAgICAgICAgICAgICAvLyBMb2FkIHN0b3JhZ2UgZGF0YSB3aGVuIHN0b3JhZ2UgaW5mbyB0YWIgaXMgYWN0aXZhdGVkXG4gICAgICAgICAgICAgICAgaWYgKHRhYlBhdGggPT09ICdzdG9yYWdlLWluZm8nKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0b3JhZ2VJbmRleC5sb2FkU3RvcmFnZURhdGEoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBsb2NhbCBzdG9yYWdlIGZvcm0gd2hlbiB0YWIgYmVjb21lcyB2aXNpYmxlXG4gICAgICAgICAgICAgICAgaWYgKHRhYlBhdGggPT09ICdzdG9yYWdlLWxvY2FsJykge1xuICAgICAgICAgICAgICAgICAgICBzdG9yYWdlSW5kZXguaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBTMyBmb3JtIHdoZW4gY2xvdWQgdGFiIGJlY29tZXMgdmlzaWJsZVxuICAgICAgICAgICAgICAgIGlmICh0YWJQYXRoID09PSAnc3RvcmFnZS1jbG91ZCcgJiYgdHlwZW9mIHMzU3RvcmFnZUluZGV4ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgcmVjb3JkcyBzYXZlIHBlcmlvZCBzbGlkZXJcbiAgICAgICAgc3RvcmFnZUluZGV4LiRyZWNvcmRzU2F2ZVBlcmlvZFNsaWRlclxuICAgICAgICAgICAgLnNsaWRlcih7XG4gICAgICAgICAgICAgICAgbWluOiAwLFxuICAgICAgICAgICAgICAgIG1heDogNSxcbiAgICAgICAgICAgICAgICBzdGVwOiAxLFxuICAgICAgICAgICAgICAgIHNtb290aDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBhdXRvQWRqdXN0TGFiZWxzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBpbnRlcnByZXRMYWJlbDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxhYmVscyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIDA6IGdsb2JhbFRyYW5zbGF0ZS5zdF9TdG9yZTFNb250aE9mUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIDE6IGdsb2JhbFRyYW5zbGF0ZS5zdF9TdG9yZTNNb250aHNPZlJlY29yZHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAyOiBnbG9iYWxUcmFuc2xhdGUuc3RfU3RvcmU2TW9udGhzT2ZSZWNvcmRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgMzogZ2xvYmFsVHJhbnNsYXRlLnN0X1N0b3JlMVllYXJPZlJlY29yZHMsXG4gICAgICAgICAgICAgICAgICAgICAgICA0OiBnbG9iYWxUcmFuc2xhdGUuc3RfU3RvcmUzWWVhcnNPZlJlY29yZHMsXG4gICAgICAgICAgICAgICAgICAgICAgICA1OiBnbG9iYWxUcmFuc2xhdGUuc3RfU3RvcmVBbGxQb3NzaWJsZVJlY29yZHMsXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsYWJlbHNbdmFsdWVdIHx8ICcnO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6IHN0b3JhZ2VJbmRleC5jYkFmdGVyU2VsZWN0U2F2ZVBlcmlvZFNsaWRlcixcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHNcbiAgICAgICAgc3RvcmFnZUluZGV4LmluaXRpYWxpemVUb29sdGlwcygpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGZvcm1cbiAgICAgICAgc3RvcmFnZUluZGV4LmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gTG9hZCBzZXR0aW5ncyBmcm9tIEFQSVxuICAgICAgICBzdG9yYWdlSW5kZXgubG9hZFNldHRpbmdzKCk7XG5cbiAgICAgICAgLy8gTG9hZCBzdG9yYWdlIGRhdGEgb24gcGFnZSBsb2FkXG4gICAgICAgIHN0b3JhZ2VJbmRleC5sb2FkU3RvcmFnZURhdGEoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBldmVudCBhZnRlciB0aGUgc2VsZWN0IHNhdmUgcGVyaW9kIHNsaWRlciBpcyBjaGFuZ2VkLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB2YWx1ZSAtIFRoZSBzZWxlY3RlZCB2YWx1ZSBmcm9tIHRoZSBzbGlkZXIuXG4gICAgICovXG4gICAgY2JBZnRlclNlbGVjdFNhdmVQZXJpb2RTbGlkZXIodmFsdWUpIHtcbiAgICAgICAgLy8gR2V0IHRoZSBzYXZlIHBlcmlvZCBjb3JyZXNwb25kaW5nIHRvIHRoZSBzbGlkZXIgdmFsdWUuXG4gICAgICAgIGNvbnN0IHNhdmVQZXJpb2QgPSBzdG9yYWdlSW5kZXguc2F2ZVJlY29yZHNQZXJpb2RbdmFsdWVdO1xuXG4gICAgICAgIC8vIFNldCB0aGUgZm9ybSB2YWx1ZSBmb3IgJ1BCWFJlY29yZFNhdmVQZXJpb2QnIHRvIHRoZSBzZWxlY3RlZCBzYXZlIHBlcmlvZC5cbiAgICAgICAgc3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdQQlhSZWNvcmRTYXZlUGVyaW9kJywgc2F2ZVBlcmlvZCk7XG5cbiAgICAgICAgLy8gVXBkYXRlIFMzIGxvY2FsIHJldGVudGlvbiBzbGlkZXIgbWF4aW11bSAoaWYgUzMgbW9kdWxlIGxvYWRlZClcbiAgICAgICAgaWYgKHR5cGVvZiBzM1N0b3JhZ2VJbmRleCAhPT0gJ3VuZGVmaW5lZCcgJiYgczNTdG9yYWdlSW5kZXgudXBkYXRlU2xpZGVyTGltaXRzKSB7XG4gICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC51cGRhdGVTbGlkZXJMaW1pdHMoc2F2ZVBlcmlvZCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUcmlnZ2VyIGNoYW5nZSBldmVudCB0byBhY2tub3dsZWRnZSB0aGUgbW9kaWZpY2F0aW9uXG4gICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIFN0b3JhZ2Ugc2V0dGluZ3MgZnJvbSBBUElcbiAgICAgKi9cbiAgICBsb2FkU2V0dGluZ3MoKSB7XG4gICAgICAgIFN0b3JhZ2VBUEkuZ2V0KChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgZm9ybSB2YWx1ZXMgZm9yIGxvY2FsIHN0b3JhZ2Ugb25seVxuICAgICAgICAgICAgICAgIHN0b3JhZ2VJbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWVzJywge1xuICAgICAgICAgICAgICAgICAgICBQQlhSZWNvcmRTYXZlUGVyaW9kOiBkYXRhLlBCWFJlY29yZFNhdmVQZXJpb2QgfHwgJydcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB0b3RhbCByZXRlbnRpb24gcGVyaW9kIHNsaWRlclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlY29yZFNhdmVQZXJpb2QgPSBkYXRhLlBCWFJlY29yZFNhdmVQZXJpb2QgfHwgJyc7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2xpZGVySW5kZXggPSBzdG9yYWdlSW5kZXguc2F2ZVJlY29yZHNQZXJpb2QuaW5kZXhPZihyZWNvcmRTYXZlUGVyaW9kKTtcbiAgICAgICAgICAgICAgICBzdG9yYWdlSW5kZXguJHJlY29yZHNTYXZlUGVyaW9kU2xpZGVyLnNsaWRlcihcbiAgICAgICAgICAgICAgICAgICAgJ3NldCB2YWx1ZScsXG4gICAgICAgICAgICAgICAgICAgIHNsaWRlckluZGV4LFxuICAgICAgICAgICAgICAgICAgICBmYWxzZVxuICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICAvLyBOb3RpZnkgUzMgbW9kdWxlIGFib3V0IHRvdGFsIHJldGVudGlvbiBjaGFuZ2UgKGlmIGxvYWRlZClcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHMzU3RvcmFnZUluZGV4ICE9PSAndW5kZWZpbmVkJyAmJiBzM1N0b3JhZ2VJbmRleC51cGRhdGVTbGlkZXJMaW1pdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXgudXBkYXRlU2xpZGVyTGltaXRzKHJlY29yZFNhdmVQZXJpb2QpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBMb2FkIHN0b3JhZ2UgdXNhZ2UgZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIGxvYWRTdG9yYWdlRGF0YSgpIHtcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgICQoJyNzdG9yYWdlLXVzYWdlLWNvbnRhaW5lciAuZGltbWVyJykuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAkKCcjc3RvcmFnZS1kZXRhaWxzJykuaGlkZSgpO1xuXG4gICAgICAgIC8vIE1ha2UgQVBJIGNhbGwgdG8gZ2V0IHN0b3JhZ2UgdXNhZ2UgdXNpbmcgbmV3IFN0b3JhZ2VBUElcbiAgICAgICAgU3RvcmFnZUFQSS5nZXRVc2FnZSgocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIHN0b3JhZ2VJbmRleC5yZW5kZXJTdG9yYWdlRGF0YShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJCgnI3N0b3JhZ2UtdXNhZ2UtY29udGFpbmVyIC5kaW1tZXInKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS5zdF9TdG9yYWdlTG9hZEVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZW5kZXIgc3RvcmFnZSB1c2FnZSBkYXRhIGluIHRoZSBVSVxuICAgICAqL1xuICAgIHJlbmRlclN0b3JhZ2VEYXRhKGRhdGEpIHtcbiAgICAgICAgLy8gSGlkZSBsb2FkaW5nIGFuZCBzaG93IGRldGFpbHNcbiAgICAgICAgJCgnI3N0b3JhZ2UtdXNhZ2UtY29udGFpbmVyIC5kaW1tZXInKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICQoJyNzdG9yYWdlLWRldGFpbHMnKS5zaG93KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBGb3JtYXQgc2l6ZSBmb3IgZGlzcGxheVxuICAgICAgICBjb25zdCBmb3JtYXRTaXplID0gKHNpemVJbk1iKSA9PiB7XG4gICAgICAgICAgICBpZiAoc2l6ZUluTWIgPj0gMTAyNCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoc2l6ZUluTWIgLyAxMDI0KS50b0ZpeGVkKDEpICsgJyBHQic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gc2l6ZUluTWIudG9GaXhlZCgxKSArICcgTUInO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGhlYWRlciBpbmZvcm1hdGlvblxuICAgICAgICAkKCcjdXNlZC1zcGFjZS10ZXh0JykudGV4dChmb3JtYXRTaXplKGRhdGEudXNlZF9zcGFjZSkpO1xuICAgICAgICAkKCcjdG90YWwtc2l6ZS10ZXh0JykudGV4dChmb3JtYXRTaXplKGRhdGEudG90YWxfc2l6ZSkpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHByb2dyZXNzIHNlZ21lbnRzIGluIG1hY09TIHN0eWxlXG4gICAgICAgIGxldCBhY2N1bXVsYXRlZFdpZHRoID0gMDtcbiAgICAgICAgXG4gICAgICAgIC8vIFByb2Nlc3MgZWFjaCBjYXRlZ29yeVxuICAgICAgICBbJ2NhbGxfcmVjb3JkaW5ncycsICdjZHJfZGF0YWJhc2UnLCAnc3lzdGVtX2xvZ3MnLCAnbW9kdWxlcycsICdiYWNrdXBzJywgJ3N5c3RlbV9jYWNoZXMnLCAnczNfY2FjaGUnLCAnb3RoZXInXS5mb3JFYWNoKGNhdGVnb3J5ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNhdERhdGEgPSBkYXRhLmNhdGVnb3JpZXNbY2F0ZWdvcnldO1xuICAgICAgICAgICAgY29uc3QgJHNlZ21lbnQgPSAkKGAucHJvZ3Jlc3Mtc2VnbWVudFtkYXRhLWNhdGVnb3J5PVwiJHtjYXRlZ29yeX1cIl1gKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGNhdERhdGEgJiYgY2F0RGF0YS5wZXJjZW50YWdlID4gMCkge1xuICAgICAgICAgICAgICAgICRzZWdtZW50LmNzcygnd2lkdGgnLCBjYXREYXRhLnBlcmNlbnRhZ2UgKyAnJScpLnNob3coKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBZGQgaG92ZXIgdG9vbHRpcFxuICAgICAgICAgICAgICAgIGNvbnN0IGNhdGVnb3J5S2V5ID0gJ3N0X0NhdGVnb3J5JyArIGNhdGVnb3J5LnNwbGl0KCdfJykubWFwKHdvcmQgPT4gd29yZC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHdvcmQuc2xpY2UoMSkpLmpvaW4oJycpO1xuICAgICAgICAgICAgICAgICRzZWdtZW50LmF0dHIoJ3RpdGxlJywgYCR7Z2xvYmFsVHJhbnNsYXRlW2NhdGVnb3J5S2V5XSB8fCBjYXRlZ29yeX06ICR7Zm9ybWF0U2l6ZShjYXREYXRhLnNpemUpfSAoJHtjYXREYXRhLnBlcmNlbnRhZ2V9JSlgKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBhY2N1bXVsYXRlZFdpZHRoICs9IGNhdERhdGEucGVyY2VudGFnZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHNlZ21lbnQuaGlkZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgY2F0ZWdvcnkgc2l6ZSBpbiBsaXN0XG4gICAgICAgICAgICAkKGAjJHtjYXRlZ29yeX0tc2l6ZWApLnRleHQoZm9ybWF0U2l6ZShjYXREYXRhID8gY2F0RGF0YS5zaXplIDogMCkpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEFkZCBob3ZlciBlZmZlY3RzIGZvciBwcm9ncmVzcyBzZWdtZW50c1xuICAgICAgICAkKCcucHJvZ3Jlc3Mtc2VnbWVudCcpLm9uKCdtb3VzZWVudGVyJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgY29uc3QgJHRoaXMgPSAkKHRoaXMpO1xuICAgICAgICAgICAgY29uc3QgdG9vbHRpcCA9ICQoJzxkaXYgY2xhc3M9XCJzdG9yYWdlLXRvb2x0aXBcIj48L2Rpdj4nKS50ZXh0KCR0aGlzLmF0dHIoJ3RpdGxlJykpO1xuICAgICAgICAgICAgJCgnYm9keScpLmFwcGVuZCh0b29sdGlwKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgJChkb2N1bWVudCkub24oJ21vdXNlbW92ZS50b29sdGlwJywgZnVuY3Rpb24oZSkge1xuICAgICAgICAgICAgICAgIHRvb2x0aXAuY3NzKHtcbiAgICAgICAgICAgICAgICAgICAgbGVmdDogZS5wYWdlWCArIDEwLFxuICAgICAgICAgICAgICAgICAgICB0b3A6IGUucGFnZVkgLSAzMFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pLm9uKCdtb3VzZWxlYXZlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkKCcuc3RvcmFnZS10b29sdGlwJykucmVtb3ZlKCk7XG4gICAgICAgICAgICAkKGRvY3VtZW50KS5vZmYoJ21vdXNlbW92ZS50b29sdGlwJyk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gSGlnaGxpZ2h0IGNhdGVnb3J5IG9uIGhvdmVyXG4gICAgICAgICQoJy5jYXRlZ29yeS1pdGVtJykub24oJ21vdXNlZW50ZXInLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnN0IGNhdGVnb3J5ID0gJCh0aGlzKS5kYXRhKCdjYXRlZ29yeScpO1xuICAgICAgICAgICAgJChgLnByb2dyZXNzLXNlZ21lbnRbZGF0YS1jYXRlZ29yeT1cIiR7Y2F0ZWdvcnl9XCJdYCkuY3NzKCdvcGFjaXR5JywgJzAuNycpO1xuICAgICAgICB9KS5vbignbW91c2VsZWF2ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJCgnLnByb2dyZXNzLXNlZ21lbnQnKS5jc3MoJ29wYWNpdHknLCAnMScpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBSZW5kZXIgcmVtb3RlIHN0b3JhZ2UgaW5mbyAoUzMpXG4gICAgICAgIGlmIChkYXRhLnJlbW90ZV9zdG9yYWdlICYmIGRhdGEucmVtb3RlX3N0b3JhZ2UuczMgJiYgZGF0YS5yZW1vdGVfc3RvcmFnZS5zMy5lbmFibGVkICYmIGRhdGEucmVtb3RlX3N0b3JhZ2UuczMuc2l6ZSA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHMzID0gZGF0YS5yZW1vdGVfc3RvcmFnZS5zMztcbiAgICAgICAgICAgICQoJyNyZW1vdGUtc3RvcmFnZS10aXRsZScpLnRleHQoZ2xvYmFsVHJhbnNsYXRlLnN0X1MzUmVtb3RlU3RvcmFnZVRpdGxlKTtcbiAgICAgICAgICAgICQoJyNyZW1vdGUtc3RvcmFnZS1kZXRhaWxzJykudGV4dChcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfUzNSZW1vdGVTdG9yYWdlSW5mb1xuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgnJWZpbGVzJScsIHMzLmZpbGVzX2NvdW50LnRvTG9jYWxlU3RyaW5nKCkpXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKCclc2l6ZSUnLCBmb3JtYXRTaXplKHMzLnNpemUpKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgnJWJ1Y2tldCUnLCBzMy5idWNrZXQpXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgJCgnI3JlbW90ZS1zdG9yYWdlLXNlY3Rpb24nKS5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIEhUTUwgY29udGVudCBmb3IgdG9vbHRpcCBwb3B1cFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcgLSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gb2JqZWN0XG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBzdHJpbmcgZm9yIHBvcHVwIGNvbnRlbnRcbiAgICAgKi9cbiAgICBidWlsZFRvb2x0aXBDb250ZW50KGNvbmZpZykge1xuICAgICAgICBsZXQgaHRtbCA9ICc8ZGl2IGNsYXNzPVwidWkgcmVsYXhlZCBsaXN0XCI+JztcblxuICAgICAgICAvLyBIZWFkZXJcbiAgICAgICAgaWYgKGNvbmZpZy5oZWFkZXIpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+PHN0cm9uZz4ke2NvbmZpZy5oZWFkZXJ9PC9zdHJvbmc+PC9kaXY+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERlc2NyaXB0aW9uXG4gICAgICAgIGlmIChjb25maWcuZGVzY3JpcHRpb24pIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+JHtjb25maWcuZGVzY3JpcHRpb259PC9kaXY+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1haW4gbGlzdFxuICAgICAgICBpZiAoY29uZmlnLmxpc3QgJiYgY29uZmlnLmxpc3QubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIj48dWwgY2xhc3M9XCJ1aSBsaXN0XCI+JztcbiAgICAgICAgICAgIGNvbmZpZy5saXN0LmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+JHtpdGVtfTwvbGk+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0udGVybSAmJiBpdGVtLmRlZmluaXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2VjdGlvbiBoZWFkZXJcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPC91bD48c3Ryb25nPiR7aXRlbS50ZXJtfTwvc3Ryb25nPjx1bCBjbGFzcz1cInVpIGxpc3RcIj5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXRlbS50ZXJtICYmIGl0ZW0uZGVmaW5pdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAvLyBUZXJtIHdpdGggZGVmaW5pdGlvblxuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+PHN0cm9uZz4ke2l0ZW0udGVybX06PC9zdHJvbmc+ICR7aXRlbS5kZWZpbml0aW9ufTwvbGk+YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvdWw+PC9kaXY+JztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZGl0aW9uYWwgbGlzdHMgKGxpc3QyLWxpc3QxMClcbiAgICAgICAgZm9yIChsZXQgaSA9IDI7IGkgPD0gMTA7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgbGlzdEtleSA9IGBsaXN0JHtpfWA7XG4gICAgICAgICAgICBpZiAoY29uZmlnW2xpc3RLZXldICYmIGNvbmZpZ1tsaXN0S2V5XS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIj48dWwgY2xhc3M9XCJ1aSBsaXN0XCI+JztcbiAgICAgICAgICAgICAgICBjb25maWdbbGlzdEtleV0uZm9yRWFjaChpdGVtID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGxpPiR7aXRlbX08L2xpPmA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8L3VsPjwvZGl2Pic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBXYXJuaW5nXG4gICAgICAgIGlmIChjb25maWcud2FybmluZykge1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIj48ZGl2IGNsYXNzPVwidWkgb3JhbmdlIG1lc3NhZ2VcIj4nO1xuICAgICAgICAgICAgaWYgKGNvbmZpZy53YXJuaW5nLmhlYWRlcikge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2NvbmZpZy53YXJuaW5nLmhlYWRlcn08L2Rpdj5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGNvbmZpZy53YXJuaW5nLnRleHQpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8cD4ke2NvbmZpZy53YXJuaW5nLnRleHR9PC9wPmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj48L2Rpdj4nO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRXhhbXBsZXNcbiAgICAgICAgaWYgKGNvbmZpZy5leGFtcGxlcyAmJiBjb25maWcuZXhhbXBsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaWYgKGNvbmZpZy5leGFtcGxlc0hlYWRlcikge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+PHN0cm9uZz4ke2NvbmZpZy5leGFtcGxlc0hlYWRlcn08L3N0cm9uZz48L2Rpdj5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIj48cHJlIHN0eWxlPVwiYmFja2dyb3VuZDojZjRmNGY0O3BhZGRpbmc6MTBweDtib3JkZXItcmFkaXVzOjRweDtcIj4nO1xuICAgICAgICAgICAgaHRtbCArPSBjb25maWcuZXhhbXBsZXMuam9pbignXFxuJyk7XG4gICAgICAgICAgICBodG1sICs9ICc8L3ByZT48L2Rpdj4nO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTm90ZVxuICAgICAgICBpZiAoY29uZmlnLm5vdGUpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+PGVtPiR7Y29uZmlnLm5vdGV9PC9lbT48L2Rpdj5gO1xuICAgICAgICB9XG5cbiAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRvb2x0aXBzKCkge1xuICAgICAgICAvLyBUb29sdGlwIGNvbmZpZ3VyYXRpb25zIGZvciBlYWNoIGZpZWxkXG4gICAgICAgIGNvbnN0IHRvb2x0aXBDb25maWdzID0ge1xuICAgICAgICAgICAgcmVjb3JkX3JldGVudGlvbl9wZXJpb2Q6IHN0b3JhZ2VJbmRleC5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faGVhZGVyIHx8ICdUb3RhbCBSZXRlbnRpb24gUGVyaW9kJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9kZXNjIHx8ICdIb3cgbG9uZyBjYWxsIHJlY29yZGluZ3MgYXJlIGtlcHQgaW4gdGhlIHN5c3RlbScsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2l0ZW0xIHx8ICczMCBkYXlzIC0gbWluaW11bSBzdG9yYWdlIHBlcmlvZCcsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTIgfHwgJzkwIGRheXMgLSByZWNvbW1lbmRlZCBmb3Igc21hbGwgYnVzaW5lc3NlcycsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTMgfHwgJzEgeWVhciAtIGNvbXBsaWFuY2UgcmVxdWlyZW1lbnRzJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9pdGVtNCB8fCAnVW5saW1pdGVkIC0ga2VlcCBhbGwgcmVjb3JkaW5ncydcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX3dhcm5pbmdfaGVhZGVyIHx8ICdTdG9yYWdlIFdhcm5pbmcnLFxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX3dhcm5pbmcgfHwgJ0xvbmdlciByZXRlbnRpb24gcGVyaW9kcyByZXF1aXJlIG1vcmUgZGlzayBzcGFjZSdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgczNfZW5hYmxlZDogc3RvcmFnZUluZGV4LmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfZW5hYmxlZF9oZWFkZXIgfHwgJ0Nsb3VkIFN0b3JhZ2UnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19lbmFibGVkX2Rlc2MgfHwgJ1VwbG9hZCByZWNvcmRpbmdzIHRvIFMzLWNvbXBhdGlibGUgY2xvdWQgc3RvcmFnZSBmb3IgYmFja3VwIGFuZCBhcmNoaXZhbCcsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19lbmFibGVkX2l0ZW0xIHx8ICdBdXRvbWF0aWMgdXBsb2FkIGFmdGVyIHJlY29yZGluZyBjb21wbGV0aW9uJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfZW5hYmxlZF9pdGVtMiB8fCAnRnJlZXMgdXAgbG9jYWwgZGlzayBzcGFjZScsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2VuYWJsZWRfaXRlbTMgfHwgJ0NvbXBhdGlibGUgd2l0aCBBV1MgUzMsIE1pbklPLCBXYXNhYmknXG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgIHMzX2VuZHBvaW50OiBzdG9yYWdlSW5kZXguYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19lbmRwb2ludF9oZWFkZXIgfHwgJ1MzIEVuZHBvaW50IFVSTCcsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2VuZHBvaW50X2Rlc2MgfHwgJ0FQSSBlbmRwb2ludCBmb3IgeW91ciBTMy1jb21wYXRpYmxlIHN0b3JhZ2Ugc2VydmljZScsXG4gICAgICAgICAgICAgICAgZXhhbXBsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgJ0FXUyBTMzogaHR0cHM6Ly9zMy5hbWF6b25hd3MuY29tJyxcbiAgICAgICAgICAgICAgICAgICAgJ01pbklPOiBodHRwOi8vbWluaW8uZXhhbXBsZS5jb206OTAwMCcsXG4gICAgICAgICAgICAgICAgICAgICdXYXNhYmk6IGh0dHBzOi8vczMud2FzYWJpc3lzLmNvbSdcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGV4YW1wbGVzSGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9leGFtcGxlcyB8fCAnRXhhbXBsZXMnXG4gICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgczNfcmVnaW9uOiBzdG9yYWdlSW5kZXguYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19yZWdpb25faGVhZGVyIHx8ICdTMyBSZWdpb24nLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19yZWdpb25fZGVzYyB8fCAnR2VvZ3JhcGhpYyByZWdpb24gd2hlcmUgeW91ciBidWNrZXQgaXMgbG9jYXRlZCcsXG4gICAgICAgICAgICAgICAgZXhhbXBsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgJ3VzLWVhc3QtMSAoZGVmYXVsdCknLFxuICAgICAgICAgICAgICAgICAgICAnZXUtd2VzdC0xJyxcbiAgICAgICAgICAgICAgICAgICAgJ2FwLXNvdXRoZWFzdC0xJ1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfcmVnaW9uX25vdGUgfHwgJ011c3QgbWF0Y2ggeW91ciBidWNrZXQgcmVnaW9uIGZvciBBV1MgUzMnXG4gICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgczNfYnVja2V0OiBzdG9yYWdlSW5kZXguYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19idWNrZXRfaGVhZGVyIHx8ICdCdWNrZXQgTmFtZScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2J1Y2tldF9kZXNjIHx8ICdOYW1lIG9mIHRoZSBTMyBidWNrZXQgZm9yIHN0b3JpbmcgcmVjb3JkaW5ncycsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19idWNrZXRfaXRlbTEgfHwgJ011c3QgYmUgdW5pcXVlIGFjcm9zcyBhbGwgUzMgdXNlcnMgKGZvciBBV1MpJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfYnVja2V0X2l0ZW0yIHx8ICdPbmx5IGxvd2VyY2FzZSBsZXR0ZXJzLCBudW1iZXJzLCBoeXBoZW5zJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfYnVja2V0X2l0ZW0zIHx8ICdNdXN0IGFscmVhZHkgZXhpc3QgLSB3aWxsIG5vdCBiZSBjcmVhdGVkJ1xuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICBzM19hY2Nlc3Nfa2V5OiBzdG9yYWdlSW5kZXguYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19hY2Nlc3Nfa2V5X2hlYWRlciB8fCAnQWNjZXNzIEtleSBJRCcsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2FjY2Vzc19rZXlfZGVzYyB8fCAnUHVibGljIGlkZW50aWZpZXIgZm9yIEFQSSBhdXRoZW50aWNhdGlvbicsXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfYWNjZXNzX2tleV9ub3RlIHx8ICdTaW1pbGFyIHRvIHVzZXJuYW1lIC0gc2FmZSB0byBkaXNwbGF5J1xuICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgIHMzX3NlY3JldF9rZXk6IHN0b3JhZ2VJbmRleC5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX3NlY3JldF9rZXlfaGVhZGVyIHx8ICdTZWNyZXQgQWNjZXNzIEtleScsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX3NlY3JldF9rZXlfZGVzYyB8fCAnUHJpdmF0ZSBrZXkgZm9yIEFQSSBhdXRoZW50aWNhdGlvbicsXG4gICAgICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3dhcm5pbmcgfHwgJ1NlY3VyaXR5IFdhcm5pbmcnLFxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19zZWNyZXRfa2V5X3dhcm5pbmcgfHwgJ0tlZXAgdGhpcyBzZWNyZXQgc2FmZSAtIHRyZWF0IGl0IGxpa2UgYSBwYXNzd29yZCdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgbG9jYWxfcmV0ZW50aW9uX3BlcmlvZDogc3RvcmFnZUluZGV4LmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2hlYWRlciB8fCAnTG9jYWwgUmV0ZW50aW9uIFBlcmlvZCcsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9kZXNjIHx8ICdIb3cgbG9uZyB0byBrZWVwIHJlY29yZGluZ3MgbG9jYWxseSBiZWZvcmUgZGVsZXRpbmcnLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2l0ZW0xIHx8ICdBZnRlciB0aGlzIHBlcmlvZCwgcmVjb3JkaW5ncyBhcmUgZGVsZXRlZCBmcm9tIGxvY2FsIHN0b3JhZ2UnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25faXRlbTIgfHwgJ0ZpbGVzIHJlbWFpbiBpbiBTMyBjbG91ZCBzdG9yYWdlJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2l0ZW0zIHx8ICdDYW5ub3QgZXhjZWVkIHRvdGFsIHJldGVudGlvbiBwZXJpb2QnXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfbm90ZSB8fCAnTm90ZScsXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl93YXJuaW5nIHx8ICdTaG9ydGVyIGxvY2FsIHJldGVudGlvbiBmcmVlcyBkaXNrIHNwYWNlIGZhc3RlcidcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgcG9wdXAgZm9yIGVhY2ggdG9vbHRpcCBpY29uXG4gICAgICAgICQoJy5maWVsZC1pbmZvLWljb24nKS5lYWNoKChpbmRleCwgZWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGljb24gPSAkKGVsZW1lbnQpO1xuICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0gJGljb24uZGF0YSgnZmllbGQnKTtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSB0b29sdGlwQ29uZmlnc1tmaWVsZE5hbWVdO1xuXG4gICAgICAgICAgICBpZiAoY29udGVudCkge1xuICAgICAgICAgICAgICAgICRpY29uLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbDogY29udGVudCxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnLFxuICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRlbGF5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaG93OiAzMDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBoaWRlOiAxMDBcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgdmFyaWF0aW9uOiAnZmxvd2luZydcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gc3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAoIXJlc3BvbnNlLnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gc3RvcmFnZUluZGV4LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24gPSBzdG9yYWdlSW5kZXguJHN1Ym1pdEJ1dHRvbjtcbiAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQgPSBzdG9yYWdlSW5kZXguJGRyb3Bkb3duU3VibWl0O1xuICAgICAgICBGb3JtLiRkaXJydHlGaWVsZCA9IHN0b3JhZ2VJbmRleC4kZGlycnR5RmllbGQ7XG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IHN0b3JhZ2VJbmRleC52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBzdG9yYWdlSW5kZXguY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBzdG9yYWdlSW5kZXguY2JBZnRlclNlbmRGb3JtO1xuXG4gICAgICAgIC8vIENvbmZpZ3VyZSBSRVNUIEFQSSBzZXR0aW5ncyBmb3IgRm9ybS5qcyAoc2luZ2xldG9uIHJlc291cmNlKVxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzID0ge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGFwaU9iamVjdDogU3RvcmFnZUFQSSxcbiAgICAgICAgICAgIHNhdmVNZXRob2Q6ICd1cGRhdGUnIC8vIFVzaW5nIHN0YW5kYXJkIFBVVCBmb3Igc2luZ2xldG9uIHVwZGF0ZVxuICAgICAgICB9O1xuXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH1cbn07XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBzdG9yYWdlIG1hbmFnZW1lbnQgaW50ZXJmYWNlLlxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIHN0b3JhZ2VJbmRleC5pbml0aWFsaXplKCk7XG59KTsiXX0=