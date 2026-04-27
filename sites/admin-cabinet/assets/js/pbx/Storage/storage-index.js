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
    }); // Bind hover effects only once (not on every data refresh)

    if (!storageIndex._hoverBound) {
      storageIndex._hoverBound = true; // Tooltip for progress segments

      $('#storage-progress').on('mouseenter', '.progress-segment', function (e) {
        var tooltip = $('<div class="storage-tooltip"></div>').text($(this).attr('title'));
        $('body').append(tooltip);
        $(document).on('mousemove.tooltip', function (ev) {
          tooltip.css({
            left: ev.pageX + 10,
            top: ev.pageY - 30
          });
        });
      }).on('mouseleave', '.progress-segment', function () {
        $('.storage-tooltip').remove();
        $(document).off('mousemove.tooltip');
      }); // Highlight matching progress segment on category list hover via CSS class

      $('.category-item').on('mouseenter', function () {
        var category = $(this).data('category');
        $(".progress-segment[data-category=\"".concat(category, "\"]")).addClass('highlighted');
      }).on('mouseleave', function () {
        $('.progress-segment').removeClass('highlighted');
      });
    } // Render remote storage info (S3)


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
        header: globalTranslate.st_tooltip_record_retention_header,
        description: globalTranslate.st_tooltip_record_retention_desc,
        list: [globalTranslate.st_tooltip_record_retention_item1, globalTranslate.st_tooltip_record_retention_item2, globalTranslate.st_tooltip_record_retention_item3, globalTranslate.st_tooltip_record_retention_item4],
        warning: {
          header: globalTranslate.st_tooltip_record_retention_warning_header,
          text: globalTranslate.st_tooltip_record_retention_warning
        }
      }),
      s3_enabled: storageIndex.buildTooltipContent({
        header: globalTranslate.st_tooltip_s3_enabled_header,
        description: globalTranslate.st_tooltip_s3_enabled_desc,
        list: [globalTranslate.st_tooltip_s3_enabled_item1, globalTranslate.st_tooltip_s3_enabled_item2, globalTranslate.st_tooltip_s3_enabled_item3]
      }),
      s3_provider_preset: storageIndex.buildTooltipContent({
        header: globalTranslate.st_tooltip_s3_preset_header,
        description: globalTranslate.st_tooltip_s3_preset_desc
      }),
      s3_endpoint: storageIndex.buildTooltipContent({
        header: globalTranslate.st_tooltip_s3_endpoint_header,
        description: globalTranslate.st_tooltip_s3_endpoint_desc,
        examples: ['AWS S3: https://s3.ap-southeast-1.amazonaws.com', 'Yandex Cloud: https://storage.yandexcloud.net', 'VK Cloud: https://hb.kz-ast.vkcloud-storage.ru', 'Cloudflare R2: https://<ACCOUNT_ID>.r2.cloudflarestorage.com', 'DigitalOcean: https://sgp1.digitaloceanspaces.com', 'MinIO: http://minio.example.com:9000'],
        examplesHeader: globalTranslate.st_tooltip_examples
      }),
      s3_region: storageIndex.buildTooltipContent({
        header: globalTranslate.st_tooltip_s3_region_header,
        description: globalTranslate.st_tooltip_s3_region_desc,
        examples: ['us-east-1 (default)', 'eu-west-1', 'ap-southeast-1'],
        note: globalTranslate.st_tooltip_s3_region_note
      }),
      s3_bucket: storageIndex.buildTooltipContent({
        header: globalTranslate.st_tooltip_s3_bucket_header,
        description: globalTranslate.st_tooltip_s3_bucket_desc,
        list: [globalTranslate.st_tooltip_s3_bucket_item1, globalTranslate.st_tooltip_s3_bucket_item2, globalTranslate.st_tooltip_s3_bucket_item3]
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
        list: [globalTranslate.st_tooltip_local_retention_item1, globalTranslate.st_tooltip_local_retention_item2, globalTranslate.st_tooltip_local_retention_item3],
        warning: {
          header: globalTranslate.st_tooltip_note,
          text: globalTranslate.st_tooltip_local_retention_warning
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TdG9yYWdlL3N0b3JhZ2UtaW5kZXguanMiXSwibmFtZXMiOlsic3RvcmFnZUluZGV4IiwiJGZvcm1PYmoiLCIkIiwiJHN1Ym1pdEJ1dHRvbiIsIiRkcm9wZG93blN1Ym1pdCIsIiRkaXJydHlGaWVsZCIsIiRyZWNvcmRzU2F2ZVBlcmlvZFNsaWRlciIsInNhdmVSZWNvcmRzUGVyaW9kIiwidmFsaWRhdGVSdWxlcyIsImluaXRpYWxpemUiLCJmaW5kIiwidGFiIiwiaGlzdG9yeSIsImhpc3RvcnlUeXBlIiwib25WaXNpYmxlIiwidGFiUGF0aCIsImxvYWRTdG9yYWdlRGF0YSIsImluaXRpYWxpemVGb3JtIiwiczNTdG9yYWdlSW5kZXgiLCJzbGlkZXIiLCJtaW4iLCJtYXgiLCJzdGVwIiwic21vb3RoIiwiYXV0b0FkanVzdExhYmVscyIsImludGVycHJldExhYmVsIiwidmFsdWUiLCJsYWJlbHMiLCJnbG9iYWxUcmFuc2xhdGUiLCJzdF9TdG9yZTFNb250aE9mUmVjb3JkcyIsInN0X1N0b3JlM01vbnRoc09mUmVjb3JkcyIsInN0X1N0b3JlNk1vbnRoc09mUmVjb3JkcyIsInN0X1N0b3JlMVllYXJPZlJlY29yZHMiLCJzdF9TdG9yZTNZZWFyc09mUmVjb3JkcyIsInN0X1N0b3JlQWxsUG9zc2libGVSZWNvcmRzIiwib25DaGFuZ2UiLCJjYkFmdGVyU2VsZWN0U2F2ZVBlcmlvZFNsaWRlciIsImluaXRpYWxpemVUb29sdGlwcyIsImxvYWRTZXR0aW5ncyIsInNhdmVQZXJpb2QiLCJmb3JtIiwidXBkYXRlU2xpZGVyTGltaXRzIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwiU3RvcmFnZUFQSSIsImdldCIsInJlc3BvbnNlIiwicmVzdWx0IiwiZGF0YSIsIlBCWFJlY29yZFNhdmVQZXJpb2QiLCJyZWNvcmRTYXZlUGVyaW9kIiwic2xpZGVySW5kZXgiLCJpbmRleE9mIiwiYWRkQ2xhc3MiLCJoaWRlIiwiZ2V0VXNhZ2UiLCJyZW5kZXJTdG9yYWdlRGF0YSIsInJlbW92ZUNsYXNzIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJzdF9TdG9yYWdlTG9hZEVycm9yIiwic2hvdyIsImZvcm1hdFNpemUiLCJzaXplSW5NYiIsInRvRml4ZWQiLCJ0ZXh0IiwidXNlZF9zcGFjZSIsInRvdGFsX3NpemUiLCJhY2N1bXVsYXRlZFdpZHRoIiwiZm9yRWFjaCIsImNhdGVnb3J5IiwiY2F0RGF0YSIsImNhdGVnb3JpZXMiLCIkc2VnbWVudCIsInBlcmNlbnRhZ2UiLCJjc3MiLCJjYXRlZ29yeUtleSIsInNwbGl0IiwibWFwIiwid29yZCIsImNoYXJBdCIsInRvVXBwZXJDYXNlIiwic2xpY2UiLCJqb2luIiwiYXR0ciIsInNpemUiLCJfaG92ZXJCb3VuZCIsIm9uIiwiZSIsInRvb2x0aXAiLCJhcHBlbmQiLCJkb2N1bWVudCIsImV2IiwibGVmdCIsInBhZ2VYIiwidG9wIiwicGFnZVkiLCJyZW1vdmUiLCJvZmYiLCJyZW1vdGVfc3RvcmFnZSIsInMzIiwiZW5hYmxlZCIsInN0X1MzUmVtb3RlU3RvcmFnZVRpdGxlIiwic3RfUzNSZW1vdGVTdG9yYWdlSW5mbyIsInJlcGxhY2UiLCJmaWxlc19jb3VudCIsInRvTG9jYWxlU3RyaW5nIiwiYnVja2V0IiwiYnVpbGRUb29sdGlwQ29udGVudCIsImNvbmZpZyIsImh0bWwiLCJoZWFkZXIiLCJkZXNjcmlwdGlvbiIsImxpc3QiLCJsZW5ndGgiLCJpdGVtIiwidGVybSIsImRlZmluaXRpb24iLCJpIiwibGlzdEtleSIsIndhcm5pbmciLCJleGFtcGxlcyIsImV4YW1wbGVzSGVhZGVyIiwibm90ZSIsInRvb2x0aXBDb25maWdzIiwicmVjb3JkX3JldGVudGlvbl9wZXJpb2QiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faGVhZGVyIiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2Rlc2MiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTEiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTIiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTMiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTQiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25fd2FybmluZ19oZWFkZXIiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25fd2FybmluZyIsInMzX2VuYWJsZWQiLCJzdF90b29sdGlwX3MzX2VuYWJsZWRfaGVhZGVyIiwic3RfdG9vbHRpcF9zM19lbmFibGVkX2Rlc2MiLCJzdF90b29sdGlwX3MzX2VuYWJsZWRfaXRlbTEiLCJzdF90b29sdGlwX3MzX2VuYWJsZWRfaXRlbTIiLCJzdF90b29sdGlwX3MzX2VuYWJsZWRfaXRlbTMiLCJzM19wcm92aWRlcl9wcmVzZXQiLCJzdF90b29sdGlwX3MzX3ByZXNldF9oZWFkZXIiLCJzdF90b29sdGlwX3MzX3ByZXNldF9kZXNjIiwiczNfZW5kcG9pbnQiLCJzdF90b29sdGlwX3MzX2VuZHBvaW50X2hlYWRlciIsInN0X3Rvb2x0aXBfczNfZW5kcG9pbnRfZGVzYyIsInN0X3Rvb2x0aXBfZXhhbXBsZXMiLCJzM19yZWdpb24iLCJzdF90b29sdGlwX3MzX3JlZ2lvbl9oZWFkZXIiLCJzdF90b29sdGlwX3MzX3JlZ2lvbl9kZXNjIiwic3RfdG9vbHRpcF9zM19yZWdpb25fbm90ZSIsInMzX2J1Y2tldCIsInN0X3Rvb2x0aXBfczNfYnVja2V0X2hlYWRlciIsInN0X3Rvb2x0aXBfczNfYnVja2V0X2Rlc2MiLCJzdF90b29sdGlwX3MzX2J1Y2tldF9pdGVtMSIsInN0X3Rvb2x0aXBfczNfYnVja2V0X2l0ZW0yIiwic3RfdG9vbHRpcF9zM19idWNrZXRfaXRlbTMiLCJzM19hY2Nlc3Nfa2V5Iiwic3RfdG9vbHRpcF9zM19hY2Nlc3Nfa2V5X2hlYWRlciIsInN0X3Rvb2x0aXBfczNfYWNjZXNzX2tleV9kZXNjIiwic3RfdG9vbHRpcF9zM19hY2Nlc3Nfa2V5X25vdGUiLCJzM19zZWNyZXRfa2V5Iiwic3RfdG9vbHRpcF9zM19zZWNyZXRfa2V5X2hlYWRlciIsInN0X3Rvb2x0aXBfczNfc2VjcmV0X2tleV9kZXNjIiwic3RfdG9vbHRpcF93YXJuaW5nIiwic3RfdG9vbHRpcF9zM19zZWNyZXRfa2V5X3dhcm5pbmciLCJsb2NhbF9yZXRlbnRpb25fcGVyaW9kIiwic3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25faGVhZGVyIiwic3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25fZGVzYyIsInN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2l0ZW0xIiwic3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25faXRlbTIiLCJzdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9pdGVtMyIsInN0X3Rvb2x0aXBfbm90ZSIsInN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX3dhcm5pbmciLCJlYWNoIiwiaW5kZXgiLCJlbGVtZW50IiwiJGljb24iLCJmaWVsZE5hbWUiLCJjb250ZW50IiwicG9wdXAiLCJwb3NpdGlvbiIsImhvdmVyYWJsZSIsImRlbGF5IiwidmFyaWF0aW9uIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwiY2JBZnRlclNlbmRGb3JtIiwic3VjY2VzcyIsImFwaVNldHRpbmdzIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsWUFBWSxHQUFHO0FBQ2pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMscUJBQUQsQ0FOTTs7QUFRakI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFRCxDQUFDLENBQUMscUJBQUQsQ0FaQzs7QUFjakI7QUFDSjtBQUNBO0FBQ0E7QUFDSUUsRUFBQUEsZUFBZSxF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R0FBbUI7QUFDZnhGLE1BQUFBLE9BQU8sRUFBRSxJQURNO0FBRWZ5RixNQUFBQSxTQUFTLEVBQUVsSixVQUZJO0FBR2ZtSixNQUFBQSxVQUFVLEVBQUUsUUFIRyxDQUdNOztBQUhOLEtBQW5CO0FBTUFySixJQUFBQSxJQUFJLENBQUNqQyxVQUFMO0FBQ0g7QUF0ZmdCLENBQXJCLEMsQ0F5ZkE7O0FBQ0FQLENBQUMsQ0FBQ3lGLFFBQUQsQ0FBRCxDQUFZcUcsS0FBWixDQUFrQixZQUFNO0FBQ3BCaE0sRUFBQUEsWUFBWSxDQUFDUyxVQUFiO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFN0b3JhZ2VBUEksIFVzZXJNZXNzYWdlLCBzM1N0b3JhZ2VJbmRleCwgJCAqL1xuXG4vKipcbiAqIFN0b3JhZ2UgbWFuYWdlbWVudCBtb2R1bGVcbiAqL1xuY29uc3Qgc3RvcmFnZUluZGV4ID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBsb2NhbCBzdG9yYWdlIGZvcm0gKFRhYiAyKS5cbiAgICAgKiBTZW5kcyBkYXRhIHRvOiBQQVRDSCAvcGJ4Y29yZS9hcGkvdjMvc3RvcmFnZVxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNsb2NhbC1zdG9yYWdlLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBzdWJtaXQgYnV0dG9uICh1bmlxdWUgdG8gdGhpcyBmb3JtKS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzdWJtaXRCdXR0b246ICQoJyNzdWJtaXRidXR0b24tbG9jYWwnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBkcm9wZG93biBzdWJtaXQgKHVuaXF1ZSB0byB0aGlzIGZvcm0pLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRyb3Bkb3duU3VibWl0OiAkKCcjZHJvcGRvd25TdWJtaXQtbG9jYWwnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBkaXJ0eSBmaWVsZCAodW5pcXVlIHRvIHRoaXMgZm9ybSkuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGlycnR5RmllbGQ6ICQoJyNkaXJydHktbG9jYWwnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSByZWNvcmRzIHJldGVudGlvbiBwZXJpb2Qgc2xpZGVyLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHJlY29yZHNTYXZlUGVyaW9kU2xpZGVyOiAkKCcjUEJYUmVjb3JkU2F2ZVBlcmlvZFNsaWRlcicpLFxuXG5cbiAgICAvKipcbiAgICAgKiBQb3NzaWJsZSBwZXJpb2QgdmFsdWVzIGZvciB0aGUgcmVjb3JkcyByZXRlbnRpb24uXG4gICAgICogVmFsdWVzIGluIGRheXM6IDMwLCA5MCwgMTgwLCAzNjAsIDEwODAsICcnIChpbmZpbml0eSlcbiAgICAgKi9cbiAgICBzYXZlUmVjb3Jkc1BlcmlvZDogWyczMCcsICc5MCcsICcxODAnLCAnMzYwJywgJzEwODAnLCAnJ10sXG5cblxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGxvY2FsIHN0b3JhZ2UgZm9ybS5cbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHt9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgbW9kdWxlIHdpdGggZXZlbnQgYmluZGluZ3MgYW5kIGNvbXBvbmVudCBpbml0aWFsaXphdGlvbnMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gRW5hYmxlIHRhYiBuYXZpZ2F0aW9uXG4gICAgICAgICQoJyNzdG9yYWdlLW1lbnUnKS5maW5kKCcuaXRlbScpLnRhYih7XG4gICAgICAgICAgICAgICAgaGlzdG9yeTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBoaXN0b3J5VHlwZTogJ2hhc2gnLFxuICAgICAgICAgICAgICAgICAgIG9uVmlzaWJsZTogZnVuY3Rpb24odGFiUGF0aCkge1xuICAgICAgICAgICAgICAgIC8vIExvYWQgc3RvcmFnZSBkYXRhIHdoZW4gc3RvcmFnZSBpbmZvIHRhYiBpcyBhY3RpdmF0ZWRcbiAgICAgICAgICAgICAgICBpZiAodGFiUGF0aCA9PT0gJ3N0b3JhZ2UtaW5mbycpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RvcmFnZUluZGV4LmxvYWRTdG9yYWdlRGF0YSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIGxvY2FsIHN0b3JhZ2UgZm9ybSB3aGVuIHRhYiBiZWNvbWVzIHZpc2libGVcbiAgICAgICAgICAgICAgICBpZiAodGFiUGF0aCA9PT0gJ3N0b3JhZ2UtbG9jYWwnKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0b3JhZ2VJbmRleC5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIFMzIGZvcm0gd2hlbiBjbG91ZCB0YWIgYmVjb21lcyB2aXNpYmxlXG4gICAgICAgICAgICAgICAgaWYgKHRhYlBhdGggPT09ICdzdG9yYWdlLWNsb3VkJyAmJiB0eXBlb2YgczNTdG9yYWdlSW5kZXggIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSByZWNvcmRzIHNhdmUgcGVyaW9kIHNsaWRlclxuICAgICAgICBzdG9yYWdlSW5kZXguJHJlY29yZHNTYXZlUGVyaW9kU2xpZGVyXG4gICAgICAgICAgICAuc2xpZGVyKHtcbiAgICAgICAgICAgICAgICBtaW46IDAsXG4gICAgICAgICAgICAgICAgbWF4OiA1LFxuICAgICAgICAgICAgICAgIHN0ZXA6IDEsXG4gICAgICAgICAgICAgICAgc21vb3RoOiB0cnVlLFxuICAgICAgICAgICAgICAgIGF1dG9BZGp1c3RMYWJlbHM6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGludGVycHJldExhYmVsOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbGFiZWxzID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgMDogZ2xvYmFsVHJhbnNsYXRlLnN0X1N0b3JlMU1vbnRoT2ZSZWNvcmRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgMTogZ2xvYmFsVHJhbnNsYXRlLnN0X1N0b3JlM01vbnRoc09mUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIDI6IGdsb2JhbFRyYW5zbGF0ZS5zdF9TdG9yZTZNb250aHNPZlJlY29yZHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAzOiBnbG9iYWxUcmFuc2xhdGUuc3RfU3RvcmUxWWVhck9mUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIDQ6IGdsb2JhbFRyYW5zbGF0ZS5zdF9TdG9yZTNZZWFyc09mUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIDU6IGdsb2JhbFRyYW5zbGF0ZS5zdF9TdG9yZUFsbFBvc3NpYmxlUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxhYmVsc1t2YWx1ZV0gfHwgJyc7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogc3RvcmFnZUluZGV4LmNiQWZ0ZXJTZWxlY3RTYXZlUGVyaW9kU2xpZGVyLFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwc1xuICAgICAgICBzdG9yYWdlSW5kZXguaW5pdGlhbGl6ZVRvb2x0aXBzKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZm9ybVxuICAgICAgICBzdG9yYWdlSW5kZXguaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBMb2FkIHNldHRpbmdzIGZyb20gQVBJXG4gICAgICAgIHN0b3JhZ2VJbmRleC5sb2FkU2V0dGluZ3MoKTtcblxuICAgICAgICAvLyBMb2FkIHN0b3JhZ2UgZGF0YSBvbiBwYWdlIGxvYWRcbiAgICAgICAgc3RvcmFnZUluZGV4LmxvYWRTdG9yYWdlRGF0YSgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGV2ZW50IGFmdGVyIHRoZSBzZWxlY3Qgc2F2ZSBwZXJpb2Qgc2xpZGVyIGlzIGNoYW5nZWQuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHZhbHVlIC0gVGhlIHNlbGVjdGVkIHZhbHVlIGZyb20gdGhlIHNsaWRlci5cbiAgICAgKi9cbiAgICBjYkFmdGVyU2VsZWN0U2F2ZVBlcmlvZFNsaWRlcih2YWx1ZSkge1xuICAgICAgICAvLyBHZXQgdGhlIHNhdmUgcGVyaW9kIGNvcnJlc3BvbmRpbmcgdG8gdGhlIHNsaWRlciB2YWx1ZS5cbiAgICAgICAgY29uc3Qgc2F2ZVBlcmlvZCA9IHN0b3JhZ2VJbmRleC5zYXZlUmVjb3Jkc1BlcmlvZFt2YWx1ZV07XG5cbiAgICAgICAgLy8gU2V0IHRoZSBmb3JtIHZhbHVlIGZvciAnUEJYUmVjb3JkU2F2ZVBlcmlvZCcgdG8gdGhlIHNlbGVjdGVkIHNhdmUgcGVyaW9kLlxuICAgICAgICBzdG9yYWdlSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1BCWFJlY29yZFNhdmVQZXJpb2QnLCBzYXZlUGVyaW9kKTtcblxuICAgICAgICAvLyBVcGRhdGUgUzMgbG9jYWwgcmV0ZW50aW9uIHNsaWRlciBtYXhpbXVtIChpZiBTMyBtb2R1bGUgbG9hZGVkKVxuICAgICAgICBpZiAodHlwZW9mIHMzU3RvcmFnZUluZGV4ICE9PSAndW5kZWZpbmVkJyAmJiBzM1N0b3JhZ2VJbmRleC51cGRhdGVTbGlkZXJMaW1pdHMpIHtcbiAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LnVwZGF0ZVNsaWRlckxpbWl0cyhzYXZlUGVyaW9kKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50IHRvIGFja25vd2xlZGdlIHRoZSBtb2RpZmljYXRpb25cbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIExvYWQgU3RvcmFnZSBzZXR0aW5ncyBmcm9tIEFQSVxuICAgICAqL1xuICAgIGxvYWRTZXR0aW5ncygpIHtcbiAgICAgICAgU3RvcmFnZUFQSS5nZXQoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuZGF0YTtcblxuICAgICAgICAgICAgICAgIC8vIFNldCBmb3JtIHZhbHVlcyBmb3IgbG9jYWwgc3RvcmFnZSBvbmx5XG4gICAgICAgICAgICAgICAgc3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZXMnLCB7XG4gICAgICAgICAgICAgICAgICAgIFBCWFJlY29yZFNhdmVQZXJpb2Q6IGRhdGEuUEJYUmVjb3JkU2F2ZVBlcmlvZCB8fCAnJ1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRvdGFsIHJldGVudGlvbiBwZXJpb2Qgc2xpZGVyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVjb3JkU2F2ZVBlcmlvZCA9IGRhdGEuUEJYUmVjb3JkU2F2ZVBlcmlvZCB8fCAnJztcbiAgICAgICAgICAgICAgICBjb25zdCBzbGlkZXJJbmRleCA9IHN0b3JhZ2VJbmRleC5zYXZlUmVjb3Jkc1BlcmlvZC5pbmRleE9mKHJlY29yZFNhdmVQZXJpb2QpO1xuICAgICAgICAgICAgICAgIHN0b3JhZ2VJbmRleC4kcmVjb3Jkc1NhdmVQZXJpb2RTbGlkZXIuc2xpZGVyKFxuICAgICAgICAgICAgICAgICAgICAnc2V0IHZhbHVlJyxcbiAgICAgICAgICAgICAgICAgICAgc2xpZGVySW5kZXgsXG4gICAgICAgICAgICAgICAgICAgIGZhbHNlXG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIC8vIE5vdGlmeSBTMyBtb2R1bGUgYWJvdXQgdG90YWwgcmV0ZW50aW9uIGNoYW5nZSAoaWYgbG9hZGVkKVxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgczNTdG9yYWdlSW5kZXggIT09ICd1bmRlZmluZWQnICYmIHMzU3RvcmFnZUluZGV4LnVwZGF0ZVNsaWRlckxpbWl0cykge1xuICAgICAgICAgICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC51cGRhdGVTbGlkZXJMaW1pdHMocmVjb3JkU2F2ZVBlcmlvZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgc3RvcmFnZSB1c2FnZSBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgbG9hZFN0b3JhZ2VEYXRhKCkge1xuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgJCgnI3N0b3JhZ2UtdXNhZ2UtY29udGFpbmVyIC5kaW1tZXInKS5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICQoJyNzdG9yYWdlLWRldGFpbHMnKS5oaWRlKCk7XG5cbiAgICAgICAgLy8gTWFrZSBBUEkgY2FsbCB0byBnZXQgc3RvcmFnZSB1c2FnZSB1c2luZyBuZXcgU3RvcmFnZUFQSVxuICAgICAgICBTdG9yYWdlQVBJLmdldFVzYWdlKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgc3RvcmFnZUluZGV4LnJlbmRlclN0b3JhZ2VEYXRhKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkKCcjc3RvcmFnZS11c2FnZS1jb250YWluZXIgLmRpbW1lcicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZ2xvYmFsVHJhbnNsYXRlLnN0X1N0b3JhZ2VMb2FkRXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlbmRlciBzdG9yYWdlIHVzYWdlIGRhdGEgaW4gdGhlIFVJXG4gICAgICovXG4gICAgcmVuZGVyU3RvcmFnZURhdGEoZGF0YSkge1xuICAgICAgICAvLyBIaWRlIGxvYWRpbmcgYW5kIHNob3cgZGV0YWlsc1xuICAgICAgICAkKCcjc3RvcmFnZS11c2FnZS1jb250YWluZXIgLmRpbW1lcicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgJCgnI3N0b3JhZ2UtZGV0YWlscycpLnNob3coKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZvcm1hdCBzaXplIGZvciBkaXNwbGF5XG4gICAgICAgIGNvbnN0IGZvcm1hdFNpemUgPSAoc2l6ZUluTWIpID0+IHtcbiAgICAgICAgICAgIGlmIChzaXplSW5NYiA+PSAxMDI0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChzaXplSW5NYiAvIDEwMjQpLnRvRml4ZWQoMSkgKyAnIEdCJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBzaXplSW5NYi50b0ZpeGVkKDEpICsgJyBNQic7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgaGVhZGVyIGluZm9ybWF0aW9uXG4gICAgICAgICQoJyN1c2VkLXNwYWNlLXRleHQnKS50ZXh0KGZvcm1hdFNpemUoZGF0YS51c2VkX3NwYWNlKSk7XG4gICAgICAgICQoJyN0b3RhbC1zaXplLXRleHQnKS50ZXh0KGZvcm1hdFNpemUoZGF0YS50b3RhbF9zaXplKSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgcHJvZ3Jlc3Mgc2VnbWVudHMgaW4gbWFjT1Mgc3R5bGVcbiAgICAgICAgbGV0IGFjY3VtdWxhdGVkV2lkdGggPSAwO1xuICAgICAgICBcbiAgICAgICAgLy8gUHJvY2VzcyBlYWNoIGNhdGVnb3J5XG4gICAgICAgIFsnY2FsbF9yZWNvcmRpbmdzJywgJ2Nkcl9kYXRhYmFzZScsICdzeXN0ZW1fbG9ncycsICdtb2R1bGVzJywgJ2JhY2t1cHMnLCAnc3lzdGVtX2NhY2hlcycsICdzM19jYWNoZScsICdvdGhlciddLmZvckVhY2goY2F0ZWdvcnkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY2F0RGF0YSA9IGRhdGEuY2F0ZWdvcmllc1tjYXRlZ29yeV07XG4gICAgICAgICAgICBjb25zdCAkc2VnbWVudCA9ICQoYC5wcm9ncmVzcy1zZWdtZW50W2RhdGEtY2F0ZWdvcnk9XCIke2NhdGVnb3J5fVwiXWApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoY2F0RGF0YSAmJiBjYXREYXRhLnBlcmNlbnRhZ2UgPiAwKSB7XG4gICAgICAgICAgICAgICAgJHNlZ21lbnQuY3NzKCd3aWR0aCcsIGNhdERhdGEucGVyY2VudGFnZSArICclJykuc2hvdygpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEFkZCBob3ZlciB0b29sdGlwXG4gICAgICAgICAgICAgICAgY29uc3QgY2F0ZWdvcnlLZXkgPSAnc3RfQ2F0ZWdvcnknICsgY2F0ZWdvcnkuc3BsaXQoJ18nKS5tYXAod29yZCA9PiB3b3JkLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgd29yZC5zbGljZSgxKSkuam9pbignJyk7XG4gICAgICAgICAgICAgICAgJHNlZ21lbnQuYXR0cigndGl0bGUnLCBgJHtnbG9iYWxUcmFuc2xhdGVbY2F0ZWdvcnlLZXldIHx8IGNhdGVnb3J5fTogJHtmb3JtYXRTaXplKGNhdERhdGEuc2l6ZSl9ICgke2NhdERhdGEucGVyY2VudGFnZX0lKWApO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGFjY3VtdWxhdGVkV2lkdGggKz0gY2F0RGF0YS5wZXJjZW50YWdlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkc2VnbWVudC5oaWRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBjYXRlZ29yeSBzaXplIGluIGxpc3RcbiAgICAgICAgICAgICQoYCMke2NhdGVnb3J5fS1zaXplYCkudGV4dChmb3JtYXRTaXplKGNhdERhdGEgPyBjYXREYXRhLnNpemUgOiAwKSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQmluZCBob3ZlciBlZmZlY3RzIG9ubHkgb25jZSAobm90IG9uIGV2ZXJ5IGRhdGEgcmVmcmVzaClcbiAgICAgICAgaWYgKCFzdG9yYWdlSW5kZXguX2hvdmVyQm91bmQpIHtcbiAgICAgICAgICAgIHN0b3JhZ2VJbmRleC5faG92ZXJCb3VuZCA9IHRydWU7XG5cbiAgICAgICAgICAgIC8vIFRvb2x0aXAgZm9yIHByb2dyZXNzIHNlZ21lbnRzXG4gICAgICAgICAgICAkKCcjc3RvcmFnZS1wcm9ncmVzcycpLm9uKCdtb3VzZWVudGVyJywgJy5wcm9ncmVzcy1zZWdtZW50JywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0b29sdGlwID0gJCgnPGRpdiBjbGFzcz1cInN0b3JhZ2UtdG9vbHRpcFwiPjwvZGl2PicpLnRleHQoJCh0aGlzKS5hdHRyKCd0aXRsZScpKTtcbiAgICAgICAgICAgICAgICAkKCdib2R5JykuYXBwZW5kKHRvb2x0aXApO1xuICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLm9uKCdtb3VzZW1vdmUudG9vbHRpcCcsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgICAgICAgICB0b29sdGlwLmNzcyh7IGxlZnQ6IGV2LnBhZ2VYICsgMTAsIHRvcDogZXYucGFnZVkgLSAzMCB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLm9uKCdtb3VzZWxlYXZlJywgJy5wcm9ncmVzcy1zZWdtZW50JywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICQoJy5zdG9yYWdlLXRvb2x0aXAnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS5vZmYoJ21vdXNlbW92ZS50b29sdGlwJyk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gSGlnaGxpZ2h0IG1hdGNoaW5nIHByb2dyZXNzIHNlZ21lbnQgb24gY2F0ZWdvcnkgbGlzdCBob3ZlciB2aWEgQ1NTIGNsYXNzXG4gICAgICAgICAgICAkKCcuY2F0ZWdvcnktaXRlbScpLm9uKCdtb3VzZWVudGVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNhdGVnb3J5ID0gJCh0aGlzKS5kYXRhKCdjYXRlZ29yeScpO1xuICAgICAgICAgICAgICAgICQoYC5wcm9ncmVzcy1zZWdtZW50W2RhdGEtY2F0ZWdvcnk9XCIke2NhdGVnb3J5fVwiXWApLmFkZENsYXNzKCdoaWdobGlnaHRlZCcpO1xuICAgICAgICAgICAgfSkub24oJ21vdXNlbGVhdmUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgJCgnLnByb2dyZXNzLXNlZ21lbnQnKS5yZW1vdmVDbGFzcygnaGlnaGxpZ2h0ZWQnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVuZGVyIHJlbW90ZSBzdG9yYWdlIGluZm8gKFMzKVxuICAgICAgICBpZiAoZGF0YS5yZW1vdGVfc3RvcmFnZSAmJiBkYXRhLnJlbW90ZV9zdG9yYWdlLnMzICYmIGRhdGEucmVtb3RlX3N0b3JhZ2UuczMuZW5hYmxlZCAmJiBkYXRhLnJlbW90ZV9zdG9yYWdlLnMzLnNpemUgPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBzMyA9IGRhdGEucmVtb3RlX3N0b3JhZ2UuczM7XG4gICAgICAgICAgICAkKCcjcmVtb3RlLXN0b3JhZ2UtdGl0bGUnKS50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5zdF9TM1JlbW90ZVN0b3JhZ2VUaXRsZSk7XG4gICAgICAgICAgICAkKCcjcmVtb3RlLXN0b3JhZ2UtZGV0YWlscycpLnRleHQoXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X1MzUmVtb3RlU3RvcmFnZUluZm9cbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoJyVmaWxlcyUnLCBzMy5maWxlc19jb3VudC50b0xvY2FsZVN0cmluZygpKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgnJXNpemUlJywgZm9ybWF0U2l6ZShzMy5zaXplKSlcbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoJyVidWNrZXQlJywgczMuYnVja2V0KVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICQoJyNyZW1vdGUtc3RvcmFnZS1zZWN0aW9uJykuc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXAgcG9wdXBcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIC0gVG9vbHRpcCBjb25maWd1cmF0aW9uIG9iamVjdFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgc3RyaW5nIGZvciBwb3B1cCBjb250ZW50XG4gICAgICovXG4gICAgYnVpbGRUb29sdGlwQ29udGVudChjb25maWcpIHtcbiAgICAgICAgbGV0IGh0bWwgPSAnPGRpdiBjbGFzcz1cInVpIHJlbGF4ZWQgbGlzdFwiPic7XG5cbiAgICAgICAgLy8gSGVhZGVyXG4gICAgICAgIGlmIChjb25maWcuaGVhZGVyKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxzdHJvbmc+JHtjb25maWcuaGVhZGVyfTwvc3Ryb25nPjwvZGl2PmA7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEZXNjcmlwdGlvblxuICAgICAgICBpZiAoY29uZmlnLmRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPiR7Y29uZmlnLmRlc2NyaXB0aW9ufTwvZGl2PmA7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBNYWluIGxpc3RcbiAgICAgICAgaWYgKGNvbmZpZy5saXN0ICYmIGNvbmZpZy5saXN0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+PHVsIGNsYXNzPVwidWkgbGlzdFwiPic7XG4gICAgICAgICAgICBjb25maWcubGlzdC5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGxpPiR7aXRlbX08L2xpPmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpdGVtLnRlcm0gJiYgaXRlbS5kZWZpbml0aW9uID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNlY3Rpb24gaGVhZGVyXG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDwvdWw+PHN0cm9uZz4ke2l0ZW0udGVybX08L3N0cm9uZz48dWwgY2xhc3M9XCJ1aSBsaXN0XCI+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0udGVybSAmJiBpdGVtLmRlZmluaXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVGVybSB3aXRoIGRlZmluaXRpb25cbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGxpPjxzdHJvbmc+JHtpdGVtLnRlcm19Ojwvc3Ryb25nPiAke2l0ZW0uZGVmaW5pdGlvbn08L2xpPmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBodG1sICs9ICc8L3VsPjwvZGl2Pic7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGRpdGlvbmFsIGxpc3RzIChsaXN0Mi1saXN0MTApXG4gICAgICAgIGZvciAobGV0IGkgPSAyOyBpIDw9IDEwOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGxpc3RLZXkgPSBgbGlzdCR7aX1gO1xuICAgICAgICAgICAgaWYgKGNvbmZpZ1tsaXN0S2V5XSAmJiBjb25maWdbbGlzdEtleV0ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+PHVsIGNsYXNzPVwidWkgbGlzdFwiPic7XG4gICAgICAgICAgICAgICAgY29uZmlnW2xpc3RLZXldLmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT4ke2l0ZW19PC9saT5gO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPC91bD48L2Rpdj4nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gV2FybmluZ1xuICAgICAgICBpZiAoY29uZmlnLndhcm5pbmcpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+PGRpdiBjbGFzcz1cInVpIG9yYW5nZSBtZXNzYWdlXCI+JztcbiAgICAgICAgICAgIGlmIChjb25maWcud2FybmluZy5oZWFkZXIpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtjb25maWcud2FybmluZy5oZWFkZXJ9PC9kaXY+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjb25maWcud2FybmluZy50ZXh0KSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPHA+JHtjb25maWcud2FybmluZy50ZXh0fTwvcD5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+PC9kaXY+JztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEV4YW1wbGVzXG4gICAgICAgIGlmIChjb25maWcuZXhhbXBsZXMgJiYgY29uZmlnLmV4YW1wbGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGlmIChjb25maWcuZXhhbXBsZXNIZWFkZXIpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxzdHJvbmc+JHtjb25maWcuZXhhbXBsZXNIZWFkZXJ9PC9zdHJvbmc+PC9kaXY+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+PHByZSBzdHlsZT1cImJhY2tncm91bmQ6I2Y0ZjRmNDtwYWRkaW5nOjEwcHg7Ym9yZGVyLXJhZGl1czo0cHg7XCI+JztcbiAgICAgICAgICAgIGh0bWwgKz0gY29uZmlnLmV4YW1wbGVzLmpvaW4oJ1xcbicpO1xuICAgICAgICAgICAgaHRtbCArPSAnPC9wcmU+PC9kaXY+JztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE5vdGVcbiAgICAgICAgaWYgKGNvbmZpZy5ub3RlKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxlbT4ke2NvbmZpZy5ub3RlfTwvZW0+PC9kaXY+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVUb29sdGlwcygpIHtcbiAgICAgICAgLy8gVG9vbHRpcCBjb25maWd1cmF0aW9ucyBmb3IgZWFjaCBmaWVsZFxuICAgICAgICBjb25zdCB0b29sdGlwQ29uZmlncyA9IHtcbiAgICAgICAgICAgIHJlY29yZF9yZXRlbnRpb25fcGVyaW9kOiBzdG9yYWdlSW5kZXguYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9pdGVtMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9pdGVtMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9pdGVtMyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9pdGVtNFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25fd2FybmluZ19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25fd2FybmluZ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICBzM19lbmFibGVkOiBzdG9yYWdlSW5kZXguYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19lbmFibGVkX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfZW5hYmxlZF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfZW5hYmxlZF9pdGVtMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfZW5hYmxlZF9pdGVtMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfZW5hYmxlZF9pdGVtM1xuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICBzM19wcm92aWRlcl9wcmVzZXQ6IHN0b3JhZ2VJbmRleC5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX3ByZXNldF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX3ByZXNldF9kZXNjLFxuICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgIHMzX2VuZHBvaW50OiBzdG9yYWdlSW5kZXguYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19lbmRwb2ludF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2VuZHBvaW50X2Rlc2MsXG4gICAgICAgICAgICAgICAgZXhhbXBsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgJ0FXUyBTMzogaHR0cHM6Ly9zMy5hcC1zb3V0aGVhc3QtMS5hbWF6b25hd3MuY29tJyxcbiAgICAgICAgICAgICAgICAgICAgJ1lhbmRleCBDbG91ZDogaHR0cHM6Ly9zdG9yYWdlLnlhbmRleGNsb3VkLm5ldCcsXG4gICAgICAgICAgICAgICAgICAgICdWSyBDbG91ZDogaHR0cHM6Ly9oYi5rei1hc3QudmtjbG91ZC1zdG9yYWdlLnJ1JyxcbiAgICAgICAgICAgICAgICAgICAgJ0Nsb3VkZmxhcmUgUjI6IGh0dHBzOi8vPEFDQ09VTlRfSUQ+LnIyLmNsb3VkZmxhcmVzdG9yYWdlLmNvbScsXG4gICAgICAgICAgICAgICAgICAgICdEaWdpdGFsT2NlYW46IGh0dHBzOi8vc2dwMS5kaWdpdGFsb2NlYW5zcGFjZXMuY29tJyxcbiAgICAgICAgICAgICAgICAgICAgJ01pbklPOiBodHRwOi8vbWluaW8uZXhhbXBsZS5jb206OTAwMCcsXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBleGFtcGxlc0hlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfZXhhbXBsZXNcbiAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICBzM19yZWdpb246IHN0b3JhZ2VJbmRleC5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX3JlZ2lvbl9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX3JlZ2lvbl9kZXNjLFxuICAgICAgICAgICAgICAgIGV4YW1wbGVzOiBbXG4gICAgICAgICAgICAgICAgICAgICd1cy1lYXN0LTEgKGRlZmF1bHQpJyxcbiAgICAgICAgICAgICAgICAgICAgJ2V1LXdlc3QtMScsXG4gICAgICAgICAgICAgICAgICAgICdhcC1zb3V0aGVhc3QtMSdcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX3JlZ2lvbl9ub3RlXG4gICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgczNfYnVja2V0OiBzdG9yYWdlSW5kZXguYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19idWNrZXRfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19idWNrZXRfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2J1Y2tldF9pdGVtMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfYnVja2V0X2l0ZW0yLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19idWNrZXRfaXRlbTNcbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgczNfYWNjZXNzX2tleTogc3RvcmFnZUluZGV4LmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfYWNjZXNzX2tleV9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2FjY2Vzc19rZXlfZGVzYyxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19hY2Nlc3Nfa2V5X25vdGVcbiAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICBzM19zZWNyZXRfa2V5OiBzdG9yYWdlSW5kZXguYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19zZWNyZXRfa2V5X2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfc2VjcmV0X2tleV9kZXNjLFxuICAgICAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF93YXJuaW5nLFxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19zZWNyZXRfa2V5X3dhcm5pbmdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgbG9jYWxfcmV0ZW50aW9uX3BlcmlvZDogc3RvcmFnZUluZGV4LmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25faXRlbTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9pdGVtMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2l0ZW0zXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfbm90ZSxcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX3dhcm5pbmdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgcG9wdXAgZm9yIGVhY2ggdG9vbHRpcCBpY29uXG4gICAgICAgICQoJy5maWVsZC1pbmZvLWljb24nKS5lYWNoKChpbmRleCwgZWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGljb24gPSAkKGVsZW1lbnQpO1xuICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0gJGljb24uZGF0YSgnZmllbGQnKTtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSB0b29sdGlwQ29uZmlnc1tmaWVsZE5hbWVdO1xuXG4gICAgICAgICAgICBpZiAoY29udGVudCkge1xuICAgICAgICAgICAgICAgICRpY29uLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbDogY29udGVudCxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnLFxuICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRlbGF5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaG93OiAzMDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBoaWRlOiAxMDBcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgdmFyaWF0aW9uOiAnZmxvd2luZydcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gc3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAoIXJlc3BvbnNlLnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gc3RvcmFnZUluZGV4LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24gPSBzdG9yYWdlSW5kZXguJHN1Ym1pdEJ1dHRvbjtcbiAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQgPSBzdG9yYWdlSW5kZXguJGRyb3Bkb3duU3VibWl0O1xuICAgICAgICBGb3JtLiRkaXJydHlGaWVsZCA9IHN0b3JhZ2VJbmRleC4kZGlycnR5RmllbGQ7XG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IHN0b3JhZ2VJbmRleC52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBzdG9yYWdlSW5kZXguY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBzdG9yYWdlSW5kZXguY2JBZnRlclNlbmRGb3JtO1xuXG4gICAgICAgIC8vIENvbmZpZ3VyZSBSRVNUIEFQSSBzZXR0aW5ncyBmb3IgRm9ybS5qcyAoc2luZ2xldG9uIHJlc291cmNlKVxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzID0ge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGFwaU9iamVjdDogU3RvcmFnZUFQSSxcbiAgICAgICAgICAgIHNhdmVNZXRob2Q6ICd1cGRhdGUnIC8vIFVzaW5nIHN0YW5kYXJkIFBVVCBmb3Igc2luZ2xldG9uIHVwZGF0ZVxuICAgICAgICB9O1xuXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH1cbn07XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBzdG9yYWdlIG1hbmFnZW1lbnQgaW50ZXJmYWNlLlxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIHN0b3JhZ2VJbmRleC5pbml0aWFsaXplKCk7XG59KTsiXX0=