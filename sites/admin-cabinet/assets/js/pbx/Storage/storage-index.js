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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TdG9yYWdlL3N0b3JhZ2UtaW5kZXguanMiXSwibmFtZXMiOlsic3RvcmFnZUluZGV4IiwiJGZvcm1PYmoiLCIkIiwiJHN1Ym1pdEJ1dHRvbiIsIiRkcm9wZG93blN1Ym1pdCIsIiRkaXJydHlGaWVsZCIsIiRyZWNvcmRzU2F2ZVBlcmlvZFNsaWRlciIsInNhdmVSZWNvcmRzUGVyaW9kIiwidmFsaWRhdGVSdWxlcyIsImluaXRpYWxpemUiLCJmaW5kIiwidGFiIiwiaGlzdG9yeSIsImhpc3RvcnlUeXBlIiwib25WaXNpYmxlIiwidGFiUGF0aCIsImxvYWRTdG9yYWdlRGF0YSIsImluaXRpYWxpemVGb3JtIiwiczNTdG9yYWdlSW5kZXgiLCJzbGlkZXIiLCJtaW4iLCJtYXgiLCJzdGVwIiwic21vb3RoIiwiYXV0b0FkanVzdExhYmVscyIsImludGVycHJldExhYmVsIiwidmFsdWUiLCJsYWJlbHMiLCJnbG9iYWxUcmFuc2xhdGUiLCJzdF9TdG9yZTFNb250aE9mUmVjb3JkcyIsInN0X1N0b3JlM01vbnRoc09mUmVjb3JkcyIsInN0X1N0b3JlNk1vbnRoc09mUmVjb3JkcyIsInN0X1N0b3JlMVllYXJPZlJlY29yZHMiLCJzdF9TdG9yZTNZZWFyc09mUmVjb3JkcyIsInN0X1N0b3JlQWxsUG9zc2libGVSZWNvcmRzIiwib25DaGFuZ2UiLCJjYkFmdGVyU2VsZWN0U2F2ZVBlcmlvZFNsaWRlciIsImluaXRpYWxpemVUb29sdGlwcyIsImxvYWRTZXR0aW5ncyIsInNhdmVQZXJpb2QiLCJmb3JtIiwidXBkYXRlU2xpZGVyTGltaXRzIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwiU3RvcmFnZUFQSSIsImdldCIsInJlc3BvbnNlIiwicmVzdWx0IiwiZGF0YSIsIlBCWFJlY29yZFNhdmVQZXJpb2QiLCJyZWNvcmRTYXZlUGVyaW9kIiwiaW5kZXhPZiIsImFkZENsYXNzIiwiaGlkZSIsImdldFVzYWdlIiwicmVuZGVyU3RvcmFnZURhdGEiLCJyZW1vdmVDbGFzcyIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwic3RfU3RvcmFnZUxvYWRFcnJvciIsInNob3ciLCJmb3JtYXRTaXplIiwic2l6ZUluTWIiLCJ0b0ZpeGVkIiwidGV4dCIsInVzZWRfc3BhY2UiLCJ0b3RhbF9zaXplIiwiYWNjdW11bGF0ZWRXaWR0aCIsImZvckVhY2giLCJjYXRlZ29yeSIsImNhdERhdGEiLCJjYXRlZ29yaWVzIiwiJHNlZ21lbnQiLCJwZXJjZW50YWdlIiwiY3NzIiwiY2F0ZWdvcnlLZXkiLCJzcGxpdCIsIm1hcCIsIndvcmQiLCJjaGFyQXQiLCJ0b1VwcGVyQ2FzZSIsInNsaWNlIiwiam9pbiIsImF0dHIiLCJzaXplIiwib24iLCJlIiwiJHRoaXMiLCJ0b29sdGlwIiwiYXBwZW5kIiwiZG9jdW1lbnQiLCJsZWZ0IiwicGFnZVgiLCJ0b3AiLCJwYWdlWSIsInJlbW92ZSIsIm9mZiIsImJ1aWxkVG9vbHRpcENvbnRlbnQiLCJjb25maWciLCJodG1sIiwiaGVhZGVyIiwiZGVzY3JpcHRpb24iLCJsaXN0IiwibGVuZ3RoIiwiaXRlbSIsInRlcm0iLCJkZWZpbml0aW9uIiwiaSIsImxpc3RLZXkiLCJ3YXJuaW5nIiwiZXhhbXBsZXMiLCJleGFtcGxlc0hlYWRlciIsIm5vdGUiLCJ0b29sdGlwQ29uZmlncyIsInJlY29yZF9yZXRlbnRpb25fcGVyaW9kIiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2hlYWRlciIsInN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9kZXNjIiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2l0ZW0xIiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2l0ZW0yIiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2l0ZW0zIiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2l0ZW00Iiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX3dhcm5pbmdfaGVhZGVyIiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX3dhcm5pbmciLCJzM19lbmFibGVkIiwic3RfdG9vbHRpcF9zM19lbmFibGVkX2hlYWRlciIsInN0X3Rvb2x0aXBfczNfZW5hYmxlZF9kZXNjIiwic3RfdG9vbHRpcF9zM19lbmFibGVkX2l0ZW0xIiwic3RfdG9vbHRpcF9zM19lbmFibGVkX2l0ZW0yIiwic3RfdG9vbHRpcF9zM19lbmFibGVkX2l0ZW0zIiwiczNfZW5kcG9pbnQiLCJzdF90b29sdGlwX3MzX2VuZHBvaW50X2hlYWRlciIsInN0X3Rvb2x0aXBfczNfZW5kcG9pbnRfZGVzYyIsInN0X3Rvb2x0aXBfZXhhbXBsZXMiLCJzM19yZWdpb24iLCJzdF90b29sdGlwX3MzX3JlZ2lvbl9oZWFkZXIiLCJzdF90b29sdGlwX3MzX3JlZ2lvbl9kZXNjIiwic3RfdG9vbHRpcF9zM19yZWdpb25fbm90ZSIsInMzX2J1Y2tldCIsInN0X3Rvb2x0aXBfczNfYnVja2V0X2hlYWRlciIsInN0X3Rvb2x0aXBfczNfYnVja2V0X2Rlc2MiLCJzdF90b29sdGlwX3MzX2J1Y2tldF9pdGVtMSIsInN0X3Rvb2x0aXBfczNfYnVja2V0X2l0ZW0yIiwic3RfdG9vbHRpcF9zM19idWNrZXRfaXRlbTMiLCJzM19hY2Nlc3Nfa2V5Iiwic3RfdG9vbHRpcF9zM19hY2Nlc3Nfa2V5X2hlYWRlciIsInN0X3Rvb2x0aXBfczNfYWNjZXNzX2tleV9kZXNjIiwic3RfdG9vbHRpcF9zM19hY2Nlc3Nfa2V5X25vdGUiLCJzM19zZWNyZXRfa2V5Iiwic3RfdG9vbHRpcF9zM19zZWNyZXRfa2V5X2hlYWRlciIsInN0X3Rvb2x0aXBfczNfc2VjcmV0X2tleV9kZXNjIiwic3RfdG9vbHRpcF93YXJuaW5nIiwic3RfdG9vbHRpcF9zM19zZWNyZXRfa2V5X3dhcm5pbmciLCJsb2NhbF9yZXRlbnRpb25fcGVyaW9kIiwic3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25faGVhZGVyIiwic3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25fZGVzYyIsInN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2l0ZW0xIiwic3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25faXRlbTIiLCJzdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9pdGVtMyIsInN0X3Rvb2x0aXBfbm90ZSIsInN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX3dhcm5pbmciLCJlYWNoIiwiaW5kZXgiLCJlbGVtZW50IiwiJGljb24iLCJmaWVsZE5hbWUiLCJjb250ZW50IiwicG9wdXAiLCJwb3NpdGlvbiIsImhvdmVyYWJsZSIsImRlbGF5IiwidmFyaWF0aW9uIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwiY2JBZnRlclNlbmRGb3JtIiwic3VjY2VzcyIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFlBQVksR0FBRztBQUNqQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLHFCQUFELENBTk07O0FBUWpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFBRUQsQ0FBQyxDQUFDLHFCQUFELENBWkM7O0FBY2pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLGVBQWUsRUFBRUYsQ0FBQyxDQUFDLHVCQUFELENBbEJEOztBQW9CakI7QUFDSjtBQUNBO0FBQ0E7QUFDSUcsRUFBQUEsWUFBWSxFQUFFSCxDQUFDLENBQUMsZUFBRCxDQXhCRTs7QUEwQmpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lJLEVBQUFBLHdCQUF3QixFQUFFSixDQUFDLENBQUMsNEJBQUQsQ0E5QlY7O0FBaUNqQjtBQUNKO0FBQ0E7QUFDQTtBQUNJSyxFQUFBQSxpQkFBaUIsRUFBRSxDQUFDLElBQUQsRUFBTyxJ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QW9CTCxZQUFZLENBQUNLLFlBQWpDO0FBQ0FxQyxJQUFBQSxJQUFJLENBQUNsQyxhQUFMLEdBQXFCUixZQUFZLENBQUNRLGFBQWxDO0FBQ0FrQyxJQUFBQSxJQUFJLENBQUNpSSxnQkFBTCxHQUF3QjNLLFlBQVksQ0FBQzJLLGdCQUFyQztBQUNBakksSUFBQUEsSUFBSSxDQUFDbUksZUFBTCxHQUF1QjdLLFlBQVksQ0FBQzZLLGVBQXBDLENBUGEsQ0FTYjs7QUFDQW5JLElBQUFBLElBQUksQ0FBQ3FJLFdBQUwsR0FBbUI7QUFDZkMsTUFBQUEsT0FBTyxFQUFFLElBRE07QUFFZkMsTUFBQUEsU0FBUyxFQUFFckksVUFGSTtBQUdmc0ksTUFBQUEsVUFBVSxFQUFFLFFBSEcsQ0FHTTs7QUFITixLQUFuQjtBQU1BeEksSUFBQUEsSUFBSSxDQUFDakMsVUFBTDtBQUNIO0FBaGVnQixDQUFyQixDLENBbWVBOztBQUNBUCxDQUFDLENBQUN3RixRQUFELENBQUQsQ0FBWXlGLEtBQVosQ0FBa0IsWUFBTTtBQUNwQm5MLEVBQUFBLFlBQVksQ0FBQ1MsVUFBYjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBTdG9yYWdlQVBJLCBVc2VyTWVzc2FnZSwgczNTdG9yYWdlSW5kZXgsICQgKi9cblxuLyoqXG4gKiBTdG9yYWdlIG1hbmFnZW1lbnQgbW9kdWxlXG4gKi9cbmNvbnN0IHN0b3JhZ2VJbmRleCA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgbG9jYWwgc3RvcmFnZSBmb3JtIChUYWIgMikuXG4gICAgICogU2VuZHMgZGF0YSB0bzogUEFUQ0ggL3BieGNvcmUvYXBpL3YzL3N0b3JhZ2VcbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjbG9jYWwtc3RvcmFnZS1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgc3VibWl0IGJ1dHRvbiAodW5pcXVlIHRvIHRoaXMgZm9ybSkuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc3VibWl0QnV0dG9uOiAkKCcjc3VibWl0YnV0dG9uLWxvY2FsJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZHJvcGRvd24gc3VibWl0ICh1bmlxdWUgdG8gdGhpcyBmb3JtKS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkcm9wZG93blN1Ym1pdDogJCgnI2Ryb3Bkb3duU3VibWl0LWxvY2FsJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZGlydHkgZmllbGQgKHVuaXF1ZSB0byB0aGlzIGZvcm0pLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRpcnJ0eUZpZWxkOiAkKCcjZGlycnR5LWxvY2FsJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgcmVjb3JkcyByZXRlbnRpb24gcGVyaW9kIHNsaWRlci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRyZWNvcmRzU2F2ZVBlcmlvZFNsaWRlcjogJCgnI1BCWFJlY29yZFNhdmVQZXJpb2RTbGlkZXInKSxcblxuXG4gICAgLyoqXG4gICAgICogUG9zc2libGUgcGVyaW9kIHZhbHVlcyBmb3IgdGhlIHJlY29yZHMgcmV0ZW50aW9uLlxuICAgICAqIFZhbHVlcyBpbiBkYXlzOiAzMCwgOTAsIDE4MCwgMzYwLCAxMDgwLCAnJyAoaW5maW5pdHkpXG4gICAgICovXG4gICAgc2F2ZVJlY29yZHNQZXJpb2Q6IFsnMzAnLCAnOTAnLCAnMTgwJywgJzM2MCcsICcxMDgwJywgJyddLFxuXG5cblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBsb2NhbCBzdG9yYWdlIGZvcm0uXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7fSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIG1vZHVsZSB3aXRoIGV2ZW50IGJpbmRpbmdzIGFuZCBjb21wb25lbnQgaW5pdGlhbGl6YXRpb25zLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEVuYWJsZSB0YWIgbmF2aWdhdGlvblxuICAgICAgICAkKCcjc3RvcmFnZS1tZW51JykuZmluZCgnLml0ZW0nKS50YWIoe1xuICAgICAgICAgICAgICAgIGhpc3Rvcnk6IHRydWUsXG4gICAgICAgICAgICAgICAgaGlzdG9yeVR5cGU6ICdoYXNoJyxcbiAgICAgICAgICAgICAgICAgICBvblZpc2libGU6IGZ1bmN0aW9uKHRhYlBhdGgpIHtcbiAgICAgICAgICAgICAgICAvLyBMb2FkIHN0b3JhZ2UgZGF0YSB3aGVuIHN0b3JhZ2UgaW5mbyB0YWIgaXMgYWN0aXZhdGVkXG4gICAgICAgICAgICAgICAgaWYgKHRhYlBhdGggPT09ICdzdG9yYWdlLWluZm8nKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0b3JhZ2VJbmRleC5sb2FkU3RvcmFnZURhdGEoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBsb2NhbCBzdG9yYWdlIGZvcm0gd2hlbiB0YWIgYmVjb21lcyB2aXNpYmxlXG4gICAgICAgICAgICAgICAgaWYgKHRhYlBhdGggPT09ICdzdG9yYWdlLWxvY2FsJykge1xuICAgICAgICAgICAgICAgICAgICBzdG9yYWdlSW5kZXguaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBTMyBmb3JtIHdoZW4gY2xvdWQgdGFiIGJlY29tZXMgdmlzaWJsZVxuICAgICAgICAgICAgICAgIGlmICh0YWJQYXRoID09PSAnc3RvcmFnZS1jbG91ZCcgJiYgdHlwZW9mIHMzU3RvcmFnZUluZGV4ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgcmVjb3JkcyBzYXZlIHBlcmlvZCBzbGlkZXJcbiAgICAgICAgc3RvcmFnZUluZGV4LiRyZWNvcmRzU2F2ZVBlcmlvZFNsaWRlclxuICAgICAgICAgICAgLnNsaWRlcih7XG4gICAgICAgICAgICAgICAgbWluOiAwLFxuICAgICAgICAgICAgICAgIG1heDogNSxcbiAgICAgICAgICAgICAgICBzdGVwOiAxLFxuICAgICAgICAgICAgICAgIHNtb290aDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBhdXRvQWRqdXN0TGFiZWxzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBpbnRlcnByZXRMYWJlbDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxhYmVscyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIDA6IGdsb2JhbFRyYW5zbGF0ZS5zdF9TdG9yZTFNb250aE9mUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIDE6IGdsb2JhbFRyYW5zbGF0ZS5zdF9TdG9yZTNNb250aHNPZlJlY29yZHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAyOiBnbG9iYWxUcmFuc2xhdGUuc3RfU3RvcmU2TW9udGhzT2ZSZWNvcmRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgMzogZ2xvYmFsVHJhbnNsYXRlLnN0X1N0b3JlMVllYXJPZlJlY29yZHMsXG4gICAgICAgICAgICAgICAgICAgICAgICA0OiBnbG9iYWxUcmFuc2xhdGUuc3RfU3RvcmUzWWVhcnNPZlJlY29yZHMsXG4gICAgICAgICAgICAgICAgICAgICAgICA1OiBnbG9iYWxUcmFuc2xhdGUuc3RfU3RvcmVBbGxQb3NzaWJsZVJlY29yZHMsXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsYWJlbHNbdmFsdWVdIHx8ICcnO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6IHN0b3JhZ2VJbmRleC5jYkFmdGVyU2VsZWN0U2F2ZVBlcmlvZFNsaWRlcixcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHNcbiAgICAgICAgc3RvcmFnZUluZGV4LmluaXRpYWxpemVUb29sdGlwcygpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGZvcm1cbiAgICAgICAgc3RvcmFnZUluZGV4LmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gTG9hZCBzZXR0aW5ncyBmcm9tIEFQSVxuICAgICAgICBzdG9yYWdlSW5kZXgubG9hZFNldHRpbmdzKCk7XG5cbiAgICAgICAgLy8gTG9hZCBzdG9yYWdlIGRhdGEgb24gcGFnZSBsb2FkXG4gICAgICAgIHN0b3JhZ2VJbmRleC5sb2FkU3RvcmFnZURhdGEoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBldmVudCBhZnRlciB0aGUgc2VsZWN0IHNhdmUgcGVyaW9kIHNsaWRlciBpcyBjaGFuZ2VkLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB2YWx1ZSAtIFRoZSBzZWxlY3RlZCB2YWx1ZSBmcm9tIHRoZSBzbGlkZXIuXG4gICAgICovXG4gICAgY2JBZnRlclNlbGVjdFNhdmVQZXJpb2RTbGlkZXIodmFsdWUpIHtcbiAgICAgICAgLy8gR2V0IHRoZSBzYXZlIHBlcmlvZCBjb3JyZXNwb25kaW5nIHRvIHRoZSBzbGlkZXIgdmFsdWUuXG4gICAgICAgIGNvbnN0IHNhdmVQZXJpb2QgPSBzdG9yYWdlSW5kZXguc2F2ZVJlY29yZHNQZXJpb2RbdmFsdWVdO1xuXG4gICAgICAgIC8vIFNldCB0aGUgZm9ybSB2YWx1ZSBmb3IgJ1BCWFJlY29yZFNhdmVQZXJpb2QnIHRvIHRoZSBzZWxlY3RlZCBzYXZlIHBlcmlvZC5cbiAgICAgICAgc3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdQQlhSZWNvcmRTYXZlUGVyaW9kJywgc2F2ZVBlcmlvZCk7XG5cbiAgICAgICAgLy8gVXBkYXRlIFMzIGxvY2FsIHJldGVudGlvbiBzbGlkZXIgbWF4aW11bSAoaWYgUzMgbW9kdWxlIGxvYWRlZClcbiAgICAgICAgaWYgKHR5cGVvZiBzM1N0b3JhZ2VJbmRleCAhPT0gJ3VuZGVmaW5lZCcgJiYgczNTdG9yYWdlSW5kZXgudXBkYXRlU2xpZGVyTGltaXRzKSB7XG4gICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC51cGRhdGVTbGlkZXJMaW1pdHMoc2F2ZVBlcmlvZCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUcmlnZ2VyIGNoYW5nZSBldmVudCB0byBhY2tub3dsZWRnZSB0aGUgbW9kaWZpY2F0aW9uXG4gICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIFN0b3JhZ2Ugc2V0dGluZ3MgZnJvbSBBUElcbiAgICAgKi9cbiAgICBsb2FkU2V0dGluZ3MoKSB7XG4gICAgICAgIFN0b3JhZ2VBUEkuZ2V0KChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgZm9ybSB2YWx1ZXMgZm9yIGxvY2FsIHN0b3JhZ2Ugb25seVxuICAgICAgICAgICAgICAgIHN0b3JhZ2VJbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWVzJywge1xuICAgICAgICAgICAgICAgICAgICBQQlhSZWNvcmRTYXZlUGVyaW9kOiBkYXRhLlBCWFJlY29yZFNhdmVQZXJpb2QgfHwgJydcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB0b3RhbCByZXRlbnRpb24gcGVyaW9kIHNsaWRlclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlY29yZFNhdmVQZXJpb2QgPSBkYXRhLlBCWFJlY29yZFNhdmVQZXJpb2QgfHwgJyc7XG4gICAgICAgICAgICAgICAgc3RvcmFnZUluZGV4LiRyZWNvcmRzU2F2ZVBlcmlvZFNsaWRlci5zbGlkZXIoXG4gICAgICAgICAgICAgICAgICAgICdzZXQgdmFsdWUnLFxuICAgICAgICAgICAgICAgICAgICBzdG9yYWdlSW5kZXguc2F2ZVJlY29yZHNQZXJpb2QuaW5kZXhPZihyZWNvcmRTYXZlUGVyaW9kKSxcbiAgICAgICAgICAgICAgICAgICAgZmFsc2VcbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgLy8gTm90aWZ5IFMzIG1vZHVsZSBhYm91dCB0b3RhbCByZXRlbnRpb24gY2hhbmdlIChpZiBsb2FkZWQpXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBzM1N0b3JhZ2VJbmRleCAhPT0gJ3VuZGVmaW5lZCcgJiYgczNTdG9yYWdlSW5kZXgudXBkYXRlU2xpZGVyTGltaXRzKSB7XG4gICAgICAgICAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LnVwZGF0ZVNsaWRlckxpbWl0cyhyZWNvcmRTYXZlUGVyaW9kKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCBzdG9yYWdlIHVzYWdlIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBsb2FkU3RvcmFnZURhdGEoKSB7XG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICAkKCcjc3RvcmFnZS11c2FnZS1jb250YWluZXIgLmRpbW1lcicpLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgJCgnI3N0b3JhZ2UtZGV0YWlscycpLmhpZGUoKTtcblxuICAgICAgICAvLyBNYWtlIEFQSSBjYWxsIHRvIGdldCBzdG9yYWdlIHVzYWdlIHVzaW5nIG5ldyBTdG9yYWdlQVBJXG4gICAgICAgIFN0b3JhZ2VBUEkuZ2V0VXNhZ2UoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBzdG9yYWdlSW5kZXgucmVuZGVyU3RvcmFnZURhdGEocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICQoJyNzdG9yYWdlLXVzYWdlLWNvbnRhaW5lciAuZGltbWVyJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhnbG9iYWxUcmFuc2xhdGUuc3RfU3RvcmFnZUxvYWRFcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUmVuZGVyIHN0b3JhZ2UgdXNhZ2UgZGF0YSBpbiB0aGUgVUlcbiAgICAgKi9cbiAgICByZW5kZXJTdG9yYWdlRGF0YShkYXRhKSB7XG4gICAgICAgIC8vIEhpZGUgbG9hZGluZyBhbmQgc2hvdyBkZXRhaWxzXG4gICAgICAgICQoJyNzdG9yYWdlLXVzYWdlLWNvbnRhaW5lciAuZGltbWVyJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAkKCcjc3RvcmFnZS1kZXRhaWxzJykuc2hvdygpO1xuICAgICAgICBcbiAgICAgICAgLy8gRm9ybWF0IHNpemUgZm9yIGRpc3BsYXlcbiAgICAgICAgY29uc3QgZm9ybWF0U2l6ZSA9IChzaXplSW5NYikgPT4ge1xuICAgICAgICAgICAgaWYgKHNpemVJbk1iID49IDEwMjQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKHNpemVJbk1iIC8gMTAyNCkudG9GaXhlZCgxKSArICcgR0InO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHNpemVJbk1iLnRvRml4ZWQoMSkgKyAnIE1CJztcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBoZWFkZXIgaW5mb3JtYXRpb25cbiAgICAgICAgJCgnI3VzZWQtc3BhY2UtdGV4dCcpLnRleHQoZm9ybWF0U2l6ZShkYXRhLnVzZWRfc3BhY2UpKTtcbiAgICAgICAgJCgnI3RvdGFsLXNpemUtdGV4dCcpLnRleHQoZm9ybWF0U2l6ZShkYXRhLnRvdGFsX3NpemUpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBwcm9ncmVzcyBzZWdtZW50cyBpbiBtYWNPUyBzdHlsZVxuICAgICAgICBsZXQgYWNjdW11bGF0ZWRXaWR0aCA9IDA7XG4gICAgICAgIFxuICAgICAgICAvLyBQcm9jZXNzIGVhY2ggY2F0ZWdvcnlcbiAgICAgICAgWydjYWxsX3JlY29yZGluZ3MnLCAnY2RyX2RhdGFiYXNlJywgJ3N5c3RlbV9sb2dzJywgJ21vZHVsZXMnLCAnYmFja3VwcycsICdzeXN0ZW1fY2FjaGVzJywgJ290aGVyJ10uZm9yRWFjaChjYXRlZ29yeSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjYXREYXRhID0gZGF0YS5jYXRlZ29yaWVzW2NhdGVnb3J5XTtcbiAgICAgICAgICAgIGNvbnN0ICRzZWdtZW50ID0gJChgLnByb2dyZXNzLXNlZ21lbnRbZGF0YS1jYXRlZ29yeT1cIiR7Y2F0ZWdvcnl9XCJdYCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChjYXREYXRhICYmIGNhdERhdGEucGVyY2VudGFnZSA+IDApIHtcbiAgICAgICAgICAgICAgICAkc2VnbWVudC5jc3MoJ3dpZHRoJywgY2F0RGF0YS5wZXJjZW50YWdlICsgJyUnKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQWRkIGhvdmVyIHRvb2x0aXBcbiAgICAgICAgICAgICAgICBjb25zdCBjYXRlZ29yeUtleSA9ICdzdF9DYXRlZ29yeScgKyBjYXRlZ29yeS5zcGxpdCgnXycpLm1hcCh3b3JkID0+IHdvcmQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB3b3JkLnNsaWNlKDEpKS5qb2luKCcnKTtcbiAgICAgICAgICAgICAgICAkc2VnbWVudC5hdHRyKCd0aXRsZScsIGAke2dsb2JhbFRyYW5zbGF0ZVtjYXRlZ29yeUtleV0gfHwgY2F0ZWdvcnl9OiAke2Zvcm1hdFNpemUoY2F0RGF0YS5zaXplKX0gKCR7Y2F0RGF0YS5wZXJjZW50YWdlfSUpYCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgYWNjdW11bGF0ZWRXaWR0aCArPSBjYXREYXRhLnBlcmNlbnRhZ2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRzZWdtZW50LmhpZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIGNhdGVnb3J5IHNpemUgaW4gbGlzdFxuICAgICAgICAgICAgJChgIyR7Y2F0ZWdvcnl9LXNpemVgKS50ZXh0KGZvcm1hdFNpemUoY2F0RGF0YSA/IGNhdERhdGEuc2l6ZSA6IDApKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBBZGQgaG92ZXIgZWZmZWN0cyBmb3IgcHJvZ3Jlc3Mgc2VnbWVudHNcbiAgICAgICAgJCgnLnByb2dyZXNzLXNlZ21lbnQnKS5vbignbW91c2VlbnRlcicsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgIGNvbnN0ICR0aGlzID0gJCh0aGlzKTtcbiAgICAgICAgICAgIGNvbnN0IHRvb2x0aXAgPSAkKCc8ZGl2IGNsYXNzPVwic3RvcmFnZS10b29sdGlwXCI+PC9kaXY+JykudGV4dCgkdGhpcy5hdHRyKCd0aXRsZScpKTtcbiAgICAgICAgICAgICQoJ2JvZHknKS5hcHBlbmQodG9vbHRpcCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgICQoZG9jdW1lbnQpLm9uKCdtb3VzZW1vdmUudG9vbHRpcCcsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgICAgICAgICB0b29sdGlwLmNzcyh7XG4gICAgICAgICAgICAgICAgICAgIGxlZnQ6IGUucGFnZVggKyAxMCxcbiAgICAgICAgICAgICAgICAgICAgdG9wOiBlLnBhZ2VZIC0gMzBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KS5vbignbW91c2VsZWF2ZScsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgJCgnLnN0b3JhZ2UtdG9vbHRpcCcpLnJlbW92ZSgpO1xuICAgICAgICAgICAgJChkb2N1bWVudCkub2ZmKCdtb3VzZW1vdmUudG9vbHRpcCcpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEhpZ2hsaWdodCBjYXRlZ29yeSBvbiBob3ZlclxuICAgICAgICAkKCcuY2F0ZWdvcnktaXRlbScpLm9uKCdtb3VzZWVudGVyJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zdCBjYXRlZ29yeSA9ICQodGhpcykuZGF0YSgnY2F0ZWdvcnknKTtcbiAgICAgICAgICAgICQoYC5wcm9ncmVzcy1zZWdtZW50W2RhdGEtY2F0ZWdvcnk9XCIke2NhdGVnb3J5fVwiXWApLmNzcygnb3BhY2l0eScsICcwLjcnKTtcbiAgICAgICAgfSkub24oJ21vdXNlbGVhdmUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICQoJy5wcm9ncmVzcy1zZWdtZW50JykuY3NzKCdvcGFjaXR5JywgJzEnKTtcbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXAgcG9wdXBcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIC0gVG9vbHRpcCBjb25maWd1cmF0aW9uIG9iamVjdFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgc3RyaW5nIGZvciBwb3B1cCBjb250ZW50XG4gICAgICovXG4gICAgYnVpbGRUb29sdGlwQ29udGVudChjb25maWcpIHtcbiAgICAgICAgbGV0IGh0bWwgPSAnPGRpdiBjbGFzcz1cInVpIHJlbGF4ZWQgbGlzdFwiPic7XG5cbiAgICAgICAgLy8gSGVhZGVyXG4gICAgICAgIGlmIChjb25maWcuaGVhZGVyKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxzdHJvbmc+JHtjb25maWcuaGVhZGVyfTwvc3Ryb25nPjwvZGl2PmA7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEZXNjcmlwdGlvblxuICAgICAgICBpZiAoY29uZmlnLmRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPiR7Y29uZmlnLmRlc2NyaXB0aW9ufTwvZGl2PmA7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBNYWluIGxpc3RcbiAgICAgICAgaWYgKGNvbmZpZy5saXN0ICYmIGNvbmZpZy5saXN0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+PHVsIGNsYXNzPVwidWkgbGlzdFwiPic7XG4gICAgICAgICAgICBjb25maWcubGlzdC5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGxpPiR7aXRlbX08L2xpPmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpdGVtLnRlcm0gJiYgaXRlbS5kZWZpbml0aW9uID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNlY3Rpb24gaGVhZGVyXG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDwvdWw+PHN0cm9uZz4ke2l0ZW0udGVybX08L3N0cm9uZz48dWwgY2xhc3M9XCJ1aSBsaXN0XCI+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0udGVybSAmJiBpdGVtLmRlZmluaXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVGVybSB3aXRoIGRlZmluaXRpb25cbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGxpPjxzdHJvbmc+JHtpdGVtLnRlcm19Ojwvc3Ryb25nPiAke2l0ZW0uZGVmaW5pdGlvbn08L2xpPmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBodG1sICs9ICc8L3VsPjwvZGl2Pic7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGRpdGlvbmFsIGxpc3RzIChsaXN0Mi1saXN0MTApXG4gICAgICAgIGZvciAobGV0IGkgPSAyOyBpIDw9IDEwOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGxpc3RLZXkgPSBgbGlzdCR7aX1gO1xuICAgICAgICAgICAgaWYgKGNvbmZpZ1tsaXN0S2V5XSAmJiBjb25maWdbbGlzdEtleV0ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+PHVsIGNsYXNzPVwidWkgbGlzdFwiPic7XG4gICAgICAgICAgICAgICAgY29uZmlnW2xpc3RLZXldLmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT4ke2l0ZW19PC9saT5gO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPC91bD48L2Rpdj4nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gV2FybmluZ1xuICAgICAgICBpZiAoY29uZmlnLndhcm5pbmcpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+PGRpdiBjbGFzcz1cInVpIG9yYW5nZSBtZXNzYWdlXCI+JztcbiAgICAgICAgICAgIGlmIChjb25maWcud2FybmluZy5oZWFkZXIpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtjb25maWcud2FybmluZy5oZWFkZXJ9PC9kaXY+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjb25maWcud2FybmluZy50ZXh0KSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPHA+JHtjb25maWcud2FybmluZy50ZXh0fTwvcD5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+PC9kaXY+JztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEV4YW1wbGVzXG4gICAgICAgIGlmIChjb25maWcuZXhhbXBsZXMgJiYgY29uZmlnLmV4YW1wbGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGlmIChjb25maWcuZXhhbXBsZXNIZWFkZXIpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxzdHJvbmc+JHtjb25maWcuZXhhbXBsZXNIZWFkZXJ9PC9zdHJvbmc+PC9kaXY+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+PHByZSBzdHlsZT1cImJhY2tncm91bmQ6I2Y0ZjRmNDtwYWRkaW5nOjEwcHg7Ym9yZGVyLXJhZGl1czo0cHg7XCI+JztcbiAgICAgICAgICAgIGh0bWwgKz0gY29uZmlnLmV4YW1wbGVzLmpvaW4oJ1xcbicpO1xuICAgICAgICAgICAgaHRtbCArPSAnPC9wcmU+PC9kaXY+JztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE5vdGVcbiAgICAgICAgaWYgKGNvbmZpZy5ub3RlKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxlbT4ke2NvbmZpZy5ub3RlfTwvZW0+PC9kaXY+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVUb29sdGlwcygpIHtcbiAgICAgICAgLy8gVG9vbHRpcCBjb25maWd1cmF0aW9ucyBmb3IgZWFjaCBmaWVsZFxuICAgICAgICBjb25zdCB0b29sdGlwQ29uZmlncyA9IHtcbiAgICAgICAgICAgIHJlY29yZF9yZXRlbnRpb25fcGVyaW9kOiBzdG9yYWdlSW5kZXguYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2hlYWRlciB8fCAnVG90YWwgUmV0ZW50aW9uIFBlcmlvZCcsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25fZGVzYyB8fCAnSG93IGxvbmcgY2FsbCByZWNvcmRpbmdzIGFyZSBrZXB0IGluIHRoZSBzeXN0ZW0nLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9pdGVtMSB8fCAnMzAgZGF5cyAtIG1pbmltdW0gc3RvcmFnZSBwZXJpb2QnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2l0ZW0yIHx8ICc5MCBkYXlzIC0gcmVjb21tZW5kZWQgZm9yIHNtYWxsIGJ1c2luZXNzZXMnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2l0ZW0zIHx8ICcxIHllYXIgLSBjb21wbGlhbmNlIHJlcXVpcmVtZW50cycsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTQgfHwgJ1VubGltaXRlZCAtIGtlZXAgYWxsIHJlY29yZGluZ3MnXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl93YXJuaW5nX2hlYWRlciB8fCAnU3RvcmFnZSBXYXJuaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl93YXJuaW5nIHx8ICdMb25nZXIgcmV0ZW50aW9uIHBlcmlvZHMgcmVxdWlyZSBtb3JlIGRpc2sgc3BhY2UnXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgIHMzX2VuYWJsZWQ6IHN0b3JhZ2VJbmRleC5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2VuYWJsZWRfaGVhZGVyIHx8ICdDbG91ZCBTdG9yYWdlJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfZW5hYmxlZF9kZXNjIHx8ICdVcGxvYWQgcmVjb3JkaW5ncyB0byBTMy1jb21wYXRpYmxlIGNsb3VkIHN0b3JhZ2UgZm9yIGJhY2t1cCBhbmQgYXJjaGl2YWwnLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfZW5hYmxlZF9pdGVtMSB8fCAnQXV0b21hdGljIHVwbG9hZCBhZnRlciByZWNvcmRpbmcgY29tcGxldGlvbicsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2VuYWJsZWRfaXRlbTIgfHwgJ0ZyZWVzIHVwIGxvY2FsIGRpc2sgc3BhY2UnLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19lbmFibGVkX2l0ZW0zIHx8ICdDb21wYXRpYmxlIHdpdGggQVdTIFMzLCBNaW5JTywgV2FzYWJpJ1xuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICBzM19lbmRwb2ludDogc3RvcmFnZUluZGV4LmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfZW5kcG9pbnRfaGVhZGVyIHx8ICdTMyBFbmRwb2ludCBVUkwnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19lbmRwb2ludF9kZXNjIHx8ICdBUEkgZW5kcG9pbnQgZm9yIHlvdXIgUzMtY29tcGF0aWJsZSBzdG9yYWdlIHNlcnZpY2UnLFxuICAgICAgICAgICAgICAgIGV4YW1wbGVzOiBbXG4gICAgICAgICAgICAgICAgICAgICdBV1MgUzM6IGh0dHBzOi8vczMuYW1hem9uYXdzLmNvbScsXG4gICAgICAgICAgICAgICAgICAgICdNaW5JTzogaHR0cDovL21pbmlvLmV4YW1wbGUuY29tOjkwMDAnLFxuICAgICAgICAgICAgICAgICAgICAnV2FzYWJpOiBodHRwczovL3MzLndhc2FiaXN5cy5jb20nXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBleGFtcGxlc0hlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfZXhhbXBsZXMgfHwgJ0V4YW1wbGVzJ1xuICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgIHMzX3JlZ2lvbjogc3RvcmFnZUluZGV4LmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfcmVnaW9uX2hlYWRlciB8fCAnUzMgUmVnaW9uJyxcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfcmVnaW9uX2Rlc2MgfHwgJ0dlb2dyYXBoaWMgcmVnaW9uIHdoZXJlIHlvdXIgYnVja2V0IGlzIGxvY2F0ZWQnLFxuICAgICAgICAgICAgICAgIGV4YW1wbGVzOiBbXG4gICAgICAgICAgICAgICAgICAgICd1cy1lYXN0LTEgKGRlZmF1bHQpJyxcbiAgICAgICAgICAgICAgICAgICAgJ2V1LXdlc3QtMScsXG4gICAgICAgICAgICAgICAgICAgICdhcC1zb3V0aGVhc3QtMSdcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX3JlZ2lvbl9ub3RlIHx8ICdNdXN0IG1hdGNoIHlvdXIgYnVja2V0IHJlZ2lvbiBmb3IgQVdTIFMzJ1xuICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgIHMzX2J1Y2tldDogc3RvcmFnZUluZGV4LmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfYnVja2V0X2hlYWRlciB8fCAnQnVja2V0IE5hbWUnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19idWNrZXRfZGVzYyB8fCAnTmFtZSBvZiB0aGUgUzMgYnVja2V0IGZvciBzdG9yaW5nIHJlY29yZGluZ3MnLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfYnVja2V0X2l0ZW0xIHx8ICdNdXN0IGJlIHVuaXF1ZSBhY3Jvc3MgYWxsIFMzIHVzZXJzIChmb3IgQVdTKScsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2J1Y2tldF9pdGVtMiB8fCAnT25seSBsb3dlcmNhc2UgbGV0dGVycywgbnVtYmVycywgaHlwaGVucycsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2J1Y2tldF9pdGVtMyB8fCAnTXVzdCBhbHJlYWR5IGV4aXN0IC0gd2lsbCBub3QgYmUgY3JlYXRlZCdcbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgczNfYWNjZXNzX2tleTogc3RvcmFnZUluZGV4LmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfYWNjZXNzX2tleV9oZWFkZXIgfHwgJ0FjY2VzcyBLZXkgSUQnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19hY2Nlc3Nfa2V5X2Rlc2MgfHwgJ1B1YmxpYyBpZGVudGlmaWVyIGZvciBBUEkgYXV0aGVudGljYXRpb24nLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2FjY2Vzc19rZXlfbm90ZSB8fCAnU2ltaWxhciB0byB1c2VybmFtZSAtIHNhZmUgdG8gZGlzcGxheSdcbiAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICBzM19zZWNyZXRfa2V5OiBzdG9yYWdlSW5kZXguYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19zZWNyZXRfa2V5X2hlYWRlciB8fCAnU2VjcmV0IEFjY2VzcyBLZXknLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19zZWNyZXRfa2V5X2Rlc2MgfHwgJ1ByaXZhdGUga2V5IGZvciBBUEkgYXV0aGVudGljYXRpb24nLFxuICAgICAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF93YXJuaW5nIHx8ICdTZWN1cml0eSBXYXJuaW5nJyxcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfc2VjcmV0X2tleV93YXJuaW5nIHx8ICdLZWVwIHRoaXMgc2VjcmV0IHNhZmUgLSB0cmVhdCBpdCBsaWtlIGEgcGFzc3dvcmQnXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgIGxvY2FsX3JldGVudGlvbl9wZXJpb2Q6IHN0b3JhZ2VJbmRleC5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9oZWFkZXIgfHwgJ0xvY2FsIFJldGVudGlvbiBQZXJpb2QnLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25fZGVzYyB8fCAnSG93IGxvbmcgdG8ga2VlcCByZWNvcmRpbmdzIGxvY2FsbHkgYmVmb3JlIGRlbGV0aW5nJyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9pdGVtMSB8fCAnQWZ0ZXIgdGhpcyBwZXJpb2QsIHJlY29yZGluZ3MgYXJlIGRlbGV0ZWQgZnJvbSBsb2NhbCBzdG9yYWdlJyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2l0ZW0yIHx8ICdGaWxlcyByZW1haW4gaW4gUzMgY2xvdWQgc3RvcmFnZScsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9pdGVtMyB8fCAnQ2Fubm90IGV4Y2VlZCB0b3RhbCByZXRlbnRpb24gcGVyaW9kJ1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX25vdGUgfHwgJ05vdGUnLFxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25fd2FybmluZyB8fCAnU2hvcnRlciBsb2NhbCByZXRlbnRpb24gZnJlZXMgZGlzayBzcGFjZSBmYXN0ZXInXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHBvcHVwIGZvciBlYWNoIHRvb2x0aXAgaWNvblxuICAgICAgICAkKCcuZmllbGQtaW5mby1pY29uJykuZWFjaCgoaW5kZXgsIGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJChlbGVtZW50KTtcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9ICRpY29uLmRhdGEoJ2ZpZWxkJyk7XG4gICAgICAgICAgICBjb25zdCBjb250ZW50ID0gdG9vbHRpcENvbmZpZ3NbZmllbGROYW1lXTtcblxuICAgICAgICAgICAgaWYgKGNvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICAkaWNvbi5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgIGh0bWw6IGNvbnRlbnQsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIHJpZ2h0JyxcbiAgICAgICAgICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hvdzogMzAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGlkZTogMTAwXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ2Zsb3dpbmcnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IHN0b3JhZ2VJbmRleC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKCFyZXNwb25zZS5zdWNjZXNzKSB7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBjdXN0b20gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IHN0b3JhZ2VJbmRleC4kZm9ybU9iajtcbiAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uID0gc3RvcmFnZUluZGV4LiRzdWJtaXRCdXR0b247XG4gICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0ID0gc3RvcmFnZUluZGV4LiRkcm9wZG93blN1Ym1pdDtcbiAgICAgICAgRm9ybS4kZGlycnR5RmllbGQgPSBzdG9yYWdlSW5kZXguJGRpcnJ0eUZpZWxkO1xuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBzdG9yYWdlSW5kZXgudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gc3RvcmFnZUluZGV4LmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gc3RvcmFnZUluZGV4LmNiQWZ0ZXJTZW5kRm9ybTtcblxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUEkgc2V0dGluZ3MgZm9yIEZvcm0uanMgKHNpbmdsZXRvbiByZXNvdXJjZSlcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBhcGlPYmplY3Q6IFN0b3JhZ2VBUEksXG4gICAgICAgICAgICBzYXZlTWV0aG9kOiAndXBkYXRlJyAvLyBVc2luZyBzdGFuZGFyZCBQVVQgZm9yIHNpbmdsZXRvbiB1cGRhdGVcbiAgICAgICAgfTtcblxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9XG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgc3RvcmFnZSBtYW5hZ2VtZW50IGludGVyZmFjZS5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBzdG9yYWdlSW5kZXguaW5pdGlhbGl6ZSgpO1xufSk7Il19