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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TdG9yYWdlL3N0b3JhZ2UtaW5kZXguanMiXSwibmFtZXMiOlsic3RvcmFnZUluZGV4IiwiJGZvcm1PYmoiLCIkIiwiJHN1Ym1pdEJ1dHRvbiIsIiRkcm9wZG93blN1Ym1pdCIsIiRkaXJydHlGaWVsZCIsIiRyZWNvcmRzU2F2ZVBlcmlvZFNsaWRlciIsInNhdmVSZWNvcmRzUGVyaW9kIiwidmFsaWRhdGVSdWxlcyIsImluaXRpYWxpemUiLCJmaW5kIiwidGFiIiwiaGlzdG9yeSIsImhpc3RvcnlUeXBlIiwib25WaXNpYmxlIiwidGFiUGF0aCIsImxvYWRTdG9yYWdlRGF0YSIsImluaXRpYWxpemVGb3JtIiwiczNTdG9yYWdlSW5kZXgiLCJzbGlkZXIiLCJtaW4iLCJtYXgiLCJzdGVwIiwic21vb3RoIiwiYXV0b0FkanVzdExhYmVscyIsImludGVycHJldExhYmVsIiwidmFsdWUiLCJsYWJlbHMiLCJnbG9iYWxUcmFuc2xhdGUiLCJzdF9TdG9yZTFNb250aE9mUmVjb3JkcyIsInN0X1N0b3JlM01vbnRoc09mUmVjb3JkcyIsInN0X1N0b3JlNk1vbnRoc09mUmVjb3JkcyIsInN0X1N0b3JlMVllYXJPZlJlY29yZHMiLCJzdF9TdG9yZTNZZWFyc09mUmVjb3JkcyIsInN0X1N0b3JlQWxsUG9zc2libGVSZWNvcmRzIiwib25DaGFuZ2UiLCJjYkFmdGVyU2VsZWN0U2F2ZVBlcmlvZFNsaWRlciIsImluaXRpYWxpemVUb29sdGlwcyIsImxvYWRTZXR0aW5ncyIsInNhdmVQZXJpb2QiLCJmb3JtIiwidXBkYXRlU2xpZGVyTGltaXRzIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwiU3RvcmFnZUFQSSIsImdldCIsInJlc3BvbnNlIiwicmVzdWx0IiwiZGF0YSIsIlBCWFJlY29yZFNhdmVQZXJpb2QiLCJyZWNvcmRTYXZlUGVyaW9kIiwic2xpZGVySW5kZXgiLCJpbmRleE9mIiwiYWRkQ2xhc3MiLCJoaWRlIiwiZ2V0VXNhZ2UiLCJyZW5kZXJTdG9yYWdlRGF0YSIsInJlbW92ZUNsYXNzIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJzdF9TdG9yYWdlTG9hZEVycm9yIiwic2hvdyIsImZvcm1hdFNpemUiLCJzaXplSW5NYiIsInRvRml4ZWQiLCJ0ZXh0IiwidXNlZF9zcGFjZSIsInRvdGFsX3NpemUiLCJhY2N1bXVsYXRlZFdpZHRoIiwiZm9yRWFjaCIsImNhdGVnb3J5IiwiY2F0RGF0YSIsImNhdGVnb3JpZXMiLCIkc2VnbWVudCIsInBlcmNlbnRhZ2UiLCJjc3MiLCJjYXRlZ29yeUtleSIsInNwbGl0IiwibWFwIiwid29yZCIsImNoYXJBdCIsInRvVXBwZXJDYXNlIiwic2xpY2UiLCJqb2luIiwiYXR0ciIsInNpemUiLCJfaG92ZXJCb3VuZCIsIm9uIiwiZSIsInRvb2x0aXAiLCJhcHBlbmQiLCJkb2N1bWVudCIsImV2IiwibGVmdCIsInBhZ2VYIiwidG9wIiwicGFnZVkiLCJyZW1vdmUiLCJvZmYiLCJyZW1vdGVfc3RvcmFnZSIsInMzIiwiZW5hYmxlZCIsInN0X1MzUmVtb3RlU3RvcmFnZVRpdGxlIiwic3RfUzNSZW1vdGVTdG9yYWdlSW5mbyIsInJlcGxhY2UiLCJmaWxlc19jb3VudCIsInRvTG9jYWxlU3RyaW5nIiwiYnVja2V0IiwiYnVpbGRUb29sdGlwQ29udGVudCIsImNvbmZpZyIsImh0bWwiLCJoZWFkZXIiLCJkZXNjcmlwdGlvbiIsImxpc3QiLCJsZW5ndGgiLCJpdGVtIiwidGVybSIsImRlZmluaXRpb24iLCJpIiwibGlzdEtleSIsIndhcm5pbmciLCJleGFtcGxlcyIsImV4YW1wbGVzSGVhZGVyIiwibm90ZSIsInRvb2x0aXBDb25maWdzIiwicmVjb3JkX3JldGVudGlvbl9wZXJpb2QiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faGVhZGVyIiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2Rlc2MiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTEiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTIiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTMiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTQiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25fd2FybmluZ19oZWFkZXIiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25fd2FybmluZyIsInMzX2VuYWJsZWQiLCJzdF90b29sdGlwX3MzX2VuYWJsZWRfaGVhZGVyIiwic3RfdG9vbHRpcF9zM19lbmFibGVkX2Rlc2MiLCJzdF90b29sdGlwX3MzX2VuYWJsZWRfaXRlbTEiLCJzdF90b29sdGlwX3MzX2VuYWJsZWRfaXRlbTIiLCJzdF90b29sdGlwX3MzX2VuYWJsZWRfaXRlbTMiLCJzM19lbmRwb2ludCIsInN0X3Rvb2x0aXBfczNfZW5kcG9pbnRfaGVhZGVyIiwic3RfdG9vbHRpcF9zM19lbmRwb2ludF9kZXNjIiwic3RfdG9vbHRpcF9leGFtcGxlcyIsInMzX3JlZ2lvbiIsInN0X3Rvb2x0aXBfczNfcmVnaW9uX2hlYWRlciIsInN0X3Rvb2x0aXBfczNfcmVnaW9uX2Rlc2MiLCJzdF90b29sdGlwX3MzX3JlZ2lvbl9ub3RlIiwiczNfYnVja2V0Iiwic3RfdG9vbHRpcF9zM19idWNrZXRfaGVhZGVyIiwic3RfdG9vbHRpcF9zM19idWNrZXRfZGVzYyIsInN0X3Rvb2x0aXBfczNfYnVja2V0X2l0ZW0xIiwic3RfdG9vbHRpcF9zM19idWNrZXRfaXRlbTIiLCJzdF90b29sdGlwX3MzX2J1Y2tldF9pdGVtMyIsInMzX2FjY2Vzc19rZXkiLCJzdF90b29sdGlwX3MzX2FjY2Vzc19rZXlfaGVhZGVyIiwic3RfdG9vbHRpcF9zM19hY2Nlc3Nfa2V5X2Rlc2MiLCJzdF90b29sdGlwX3MzX2FjY2Vzc19rZXlfbm90ZSIsInMzX3NlY3JldF9rZXkiLCJzdF90b29sdGlwX3MzX3NlY3JldF9rZXlfaGVhZGVyIiwic3RfdG9vbHRpcF9zM19zZWNyZXRfa2V5X2Rlc2MiLCJzdF90b29sdGlwX3dhcm5pbmciLCJzdF90b29sdGlwX3MzX3NlY3JldF9rZXlfd2FybmluZyIsImxvY2FsX3JldGVudGlvbl9wZXJpb2QiLCJzdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9oZWFkZXIiLCJzdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9kZXNjIiwic3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25faXRlbTEiLCJzdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9pdGVtMiIsInN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2l0ZW0zIiwic3RfdG9vbHRpcF9ub3RlIiwic3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25fd2FybmluZyIsImVhY2giLCJpbmRleCIsImVsZW1lbnQiLCIkaWNvbiIsImZpZWxkTmFtZSIsImNvbnRlbnQiLCJwb3B1cCIsInBvc2l0aW9uIiwiaG92ZXJhYmxlIiwiZGVsYXkiLCJ2YXJpYXRpb24iLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJjYkFmdGVyU2VuZEZvcm0iLCJzdWNjZXNzIiwiYXBpU2V0dGluZ3MiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxZQUFZLEdBQUc7QUFDakI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxxQkFBRCxDQU5NOztBQVFqQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUVELENBQUMsQ0FBQyxxQkFBRCxDQVpDOztBQWNqQjtBQUNKO0FBQ0E7QUFDQTtBQUNJRSxFQUFBQSxlQUFlLEVBQUVGLENBQUMsQ0FBQyx1QkFBRCxDQWxCRDs7QUFvQmpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lHLEVBQUFBLFlBQVksRUFBRUgsQ0FBQyxDQUFDLGVBQUQsQ0F4QkU7O0FBMEJqQjtBQUNKO0FBQ0E7QUFDQTtBQUNJSSxFQUFBQSx3QkFBd0IsRUFBRUosQ0FBQyxDQUFDLDRCQUFELENBOUJWOztBQWlDakI7QUFDSjtBQUNBO0FBQ0E7QUFDSUssRUFBQUEsaUJBQWlCLEVBQUUsQ0FBQyxJQUFELEVBQU8sSUFBUCxFQUFhLEtBQWIsRUFBb0IsS0FBcEIsRUFBMkIsTUFBM0IsRUFBbUMsRUFBbkMsQ0FyQ0Y7O0FBeUNqQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUUsRUE3Q0U7O0FBK0NqQjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUFsRGlCLHdCQWtESjtBQUNUO0FBQ0FQLElBQUFBLENBQUMsQ0FBQyxlQUFELENBQUQsQ0FBbUJRLElBQW5CLENBQXdCLE9BQXhCLEVBQWlDQyxHQUFqQyxDQUFxQztBQUM3QkMsTUFBQUEsT0FBTyxFQUFFLElBRG9CO0FBRTdCQyxNQUFBQSxXQUFXLEVBQUUsTUFGZ0I7QUFHMUJDLE1BQUFBLFNBQVMsRUFBRSxtQkFBU0MsT0FBVCxFQUFrQjtBQUNoQztBQUNBLFlBQUlBLE9BQU8sS0FBSyxjQUFoQixFQUFnQztBQUM1QmYsVUFBQUEsWUFBWSxDQUFDZ0IsZUFBYjtBQUNILFNBSitCLENBS2hDOzs7QUFDQSxZQUFJRCxPQUFPLEtBQUssZUFBaEIsRUFBaUM7QUFDN0JmLFVBQUFBLFlBQVksQ0FBQ2lCLGNBQWI7QUFDSCxTQVIrQixDQVNoQzs7O0FBQ0EsWUFBSUYsT0FBTyxLQUFLLGVBQVosSUFBK0IsT0FBT0csY0FBUCxLQUEwQixXQUE3RCxFQUEwRTtBQUN0RUEsVUFBQUEsY0FBYyxDQUFDRCxjQUFmO0FBQ0g7QUFDSjtBQWhCZ0MsS0FBckMsRUFGUyxDQXFCVDs7QUFDQWpCLElBQUFBLFlBQVksQ0FBQ00sd0JBQWIsQ0FDS2EsTUFETCxDQUNZO0FBQ0pDLE1BQUFBLEdBQUcsRUFBRSxDQUREO0FBRUpDLE1BQUFBLEdBQUcsRUFBRSxDQUZEO0FBR0pDLE1BQUFBLElBQUksRUFBRSxDQUhGO0FBSUpDLE1BQUFBLE1BQU0sRUFBRSxJQUpKO0FBS0pDLE1BQUFBLGdCQUFnQixFQUFFLEtBTGQ7QUFNSkMsTUFBQUEsY0FBYyxFQUFFLHdCQUFVQyxLQUFWLEVBQWlCO0FBQzdCLFlBQU1DLE1BQU0sR0FBRztBQUNYLGFBQUdDLGVBQWUsQ0FBQ0MsdUJBRFI7QUFFWCxhQUFHRCxlQUFlLENBQUNFLHdCQUZSO0FBR1gsYUFBR0YsZUFBZSxDQUFDRyx3QkFIUjtBQUlYLGFBQUdILGVBQWUsQ0FBQ0ksc0JBSlI7QUFLWCxhQUFHSixlQUFlLENBQUNLLHVCQUxSO0FBTVgsYUFBR0wsZUFBZSxDQUFDTTtBQU5SLFNBQWY7QUFRQSxlQUFPUCxNQUFNLENBQUNELEtBQUQsQ0FBTixJQUFpQixFQUF4QjtBQUNILE9BaEJHO0FBaUJKUyxNQUFBQSxRQUFRLEVBQUVuQyxZQUFZLENBQUNvQztBQWpCbkIsS0FEWixFQXRCUyxDQTJDVDs7QUFDQXBDLElBQUFBLFlBQVksQ0FBQ3FDLGtCQUFiLEdBNUNTLENBOENUOztBQUNBckMsSUFBQUEsWUFBWSxDQUFDaUIsY0FBYixHQS9DUyxDQWlEVDs7QUFDQWpCLElBQUFBLFlBQVksQ0FBQ3NDLFlBQWIsR0FsRFMsQ0FvRFQ7O0FBQ0F0QyxJQUFBQSxZQUFZLENBQUNnQixlQUFiO0FBQ0gsR0F4R2dCOztBQTBHakI7QUFDSjtBQUNBO0FBQ0E7QUFDSW9CLEVBQUFBLDZCQTlHaUIseUNBOEdhVixLQTlHYixFQThHb0I7QUFDakM7QUFDQSxRQUFNYSxVQUFVLEdBQUd2QyxZQUFZLENBQUNPLGlCQUFiLENBQStCbUIsS0FBL0IsQ0FBbkIsQ0FGaUMsQ0FJakM7O0FBQ0ExQixJQUFBQSxZQUFZLENBQUNDLFFBQWIsQ0FBc0J1QyxJQUF0QixDQUEyQixXQUEzQixFQUF3QyxxQkFBeEMsRUFBK0RELFVBQS9ELEVBTGlDLENBT2pDOztBQUNBLFFBQUksT0FBT3JCLGNBQVAsS0FBMEIsV0FBMUIsSUFBeUNBLGNBQWMsQ0FBQ3VCLGtCQUE1RCxFQUFnRjtBQUM1RXZCLE1BQUFBLGNBQWMsQ0FBQ3VCLGtCQUFmLENBQWtDRixVQUFsQztBQUNILEtBVmdDLENBWWpDOzs7QUFDQUcsSUFBQUEsSUFBSSxDQUFDQyxXQUFMO0FBQ0gsR0E1SGdCOztBQStIakI7QUFDSjtBQUNBO0FBQ0lMLEVBQUFBLFlBbElpQiwwQkFrSUY7QUFDWE0sSUFBQUEsVUFBVSxDQUFDQyxHQUFYLENBQWUsVUFBQ0MsUUFBRCxFQUFjO0FBQ3pCLFVBQUlBLFFBQVEsQ0FBQ0MsTUFBVCxJQUFtQkQsUUFBUSxDQUFDRSxJQUFoQyxFQUFzQztBQUNsQyxZQUFNQSxJQUFJLEdBQUdGLFFBQVEsQ0FBQ0UsSUFBdEIsQ0FEa0MsQ0FHbEM7O0FBQ0FoRCxRQUFBQSxZQUFZLENBQUNDLFFBQWIsQ0FBc0J1QyxJQUF0QixDQUEyQixZQUEzQixFQUF5QztBQUNyQ1MsVUFBQUEsbUJBQW1CLEVBQUVELElBQUksQ0FBQ0MsbUJBQUwsSUFBNEI7QUFEWixTQUF6QyxFQUprQyxDQVFsQzs7QUFDQSxZQUFNQyxnQkFBZ0IsR0FBR0YsSUFBSSxDQUFDQyxtQkFBTCxJQUE0QixFQUFyRDtBQUNBLFlBQU1FLFdBQVcsR0FBR25ELFlBQVksQ0FBQ08saUJBQWIsQ0FBK0I2QyxPQUEvQixDQUF1Q0YsZ0JBQXZDLENBQXBCO0FBQ0FsRCxRQUFBQSxZQUFZLENBQUNNLHdCQUFiLENBQXNDYSxNQUF0QyxDQUNJLFdBREosRUFFSWdDLFdBRkosRUFHSSxLQUhKLEVBWGtDLENBaUJsQzs7QUFDQSxZQUFJLE9BQU9qQyxjQUFQLEtBQTBCLFdBQTFCLElBQXlDQSxjQUFjLENBQUN1QixrQkFBNUQsRUFBZ0Y7QUFDNUV2QixVQUFBQSxjQUFjLENBQUN1QixrQkFBZixDQUFrQ1MsZ0JBQWxDO0FBQ0g7QUFDSjtBQUNKLEtBdkJEO0FBd0JILEdBM0pnQjs7QUE2SmpCO0FBQ0o7QUFDQTtBQUNJbEMsRUFBQUEsZUFoS2lCLDZCQWdLQztBQUNkO0FBQ0FkLElBQUFBLENBQUMsQ0FBQyxrQ0FBRCxDQUFELENBQXNDbUQsUUFBdEMsQ0FBK0MsUUFBL0M7QUFDQW5ELElBQUFBLENBQUMsQ0FBQyxrQkFBRCxDQUFELENBQXNCb0QsSUFBdEIsR0FIYyxDQUtkOztBQUNBVixJQUFBQSxVQUFVLENBQUNXLFFBQVgsQ0FBb0IsVUFBQ1QsUUFBRCxFQUFjO0FBQzlCLFVBQUlBLFFBQVEsQ0FBQ0MsTUFBVCxJQUFtQkQsUUFBUSxDQUFDRSxJQUFoQyxFQUFzQztBQUNsQ2hELFFBQUFBLFlBQVksQ0FBQ3dELGlCQUFiLENBQStCVixRQUFRLENBQUNFLElBQXhDO0FBQ0gsT0FGRCxNQUVPO0FBQ0g5QyxRQUFBQSxDQUFDLENBQUMsa0NBQUQsQ0FBRCxDQUFzQ3VELFdBQXRDLENBQWtELFFBQWxEO0FBQ0FDLFFBQUFBLFdBQVcsQ0FBQ0MsZUFBWixDQUE0Qi9CLGVBQWUsQ0FBQ2dDLG1CQUE1QztBQUNIO0FBQ0osS0FQRDtBQVFILEdBOUtnQjs7QUFnTGpCO0FBQ0o7QUFDQTtBQUNJSixFQUFBQSxpQkFuTGlCLDZCQW1MQ1IsSUFuTEQsRUFtTE87QUFDcEI7QUFDQTlDLElBQUFBLENBQUMsQ0FBQyxrQ0FBRCxDQUFELENBQXNDdUQsV0FBdEMsQ0FBa0QsUUFBbEQ7QUFDQXZELElBQUFBLENBQUMsQ0FBQyxrQkFBRCxDQUFELENBQXNCMkQsSUFBdEIsR0FIb0IsQ0FLcEI7O0FBQ0EsUUFBTUMsVUFBVSxHQUFHLFNBQWJBLFVBQWEsQ0FBQ0MsUUFBRCxFQUFjO0FBQzdCLFVBQUlBLFFBQVEsSUFBSSxJQUFoQixFQUFzQjtBQUNsQixlQUFPLENBQUNBLFFBQVEsR0FBRyxJQUFaLEVBQWtCQyxPQUFsQixDQUEwQixDQUExQixJQUErQixLQUF0QztBQUNIOztBQUNELGFBQU9ELFFBQVEsQ0FBQ0MsT0FBVCxDQUFpQixDQUFqQixJQUFzQixLQUE3QjtBQUNILEtBTEQsQ0FOb0IsQ0FhcEI7OztBQUNBOUQsSUFBQUEsQ0FBQyxDQUFDLGtCQUFELENBQUQsQ0FBc0IrRCxJQUF0QixDQUEyQkgsVUFBVSxDQUFDZCxJQUFJLENBQUNrQixVQUFOLENBQXJDO0FBQ0FoRSxJQUFBQSxDQUFDLENBQUMsa0JBQUQsQ0FBRCxDQUFzQitELElBQXRCLENBQTJCSCxVQUFVLENBQUNkLElBQUksQ0FBQ21CLFVBQU4sQ0FBckMsRUFmb0IsQ0FpQnBCOztBQUNBLFFBQUlDLGdCQUFnQixHQUFHLENBQXZCLENBbEJvQixDQW9CcEI7O0FBQ0EsS0FBQyxpQkFBRCxFQUFvQixjQUFwQixFQUFvQyxhQUFwQyxFQUFtRCxTQUFuRCxFQUE4RCxTQUE5RCxFQUF5RSxlQUF6RSxFQUEwRixVQUExRixFQUFzRyxPQUF0RyxFQUErR0MsT0FBL0csQ0FBdUgsVUFBQUMsUUFBUSxFQUFJO0FBQy9ILFVBQU1DLE9BQU8sR0FBR3ZCLElBQUksQ0FBQ3dCLFVBQUwsQ0FBZ0JGLFFBQWhCLENBQWhCO0FBQ0EsVUFBTUcsUUFBUSxHQUFHdkUsQ0FBQyw2Q0FBcUNvRSxRQUFyQyxTQUFsQjs7QUFFQSxVQUFJQyxPQUFPLElBQUlBLE9BQU8sQ0FBQ0csVUFBUixHQUFxQixDQUFwQyxFQUF1QztBQUNuQ0QsUUFBQUEsUUFBUSxDQUFDRSxHQUFULENBQWEsT0FBYixFQUFzQkosT0FBTyxDQUFDRyxVQUFSLEdBQXFCLEdBQTNDLEVBQWdEYixJQUFoRCxHQURtQyxDQUduQzs7QUFDQSxZQUFNZSxXQUFXLEdBQUcsZ0JBQWdCTixRQUFRLENBQUNPLEtBQVQsQ0FBZSxHQUFmLEVBQW9CQyxHQUFwQixDQUF3QixVQUFBQyxJQUFJO0FBQUEsaUJBQUlBLElBQUksQ0FBQ0MsTUFBTCxDQUFZLENBQVosRUFBZUMsV0FBZixLQUErQkYsSUFBSSxDQUFDRyxLQUFMLENBQVcsQ0FBWCxDQUFuQztBQUFBLFNBQTVCLEVBQThFQyxJQUE5RSxDQUFtRixFQUFuRixDQUFwQztBQUNBVixRQUFBQSxRQUFRLENBQUNXLElBQVQsQ0FBYyxPQUFkLFlBQTBCeEQsZUFBZSxDQUFDZ0QsV0FBRCxDQUFmLElBQWdDTixRQUExRCxlQUF1RVIsVUFBVSxDQUFDUyxPQUFPLENBQUNjLElBQVQsQ0FBakYsZUFBb0dkLE9BQU8sQ0FBQ0csVUFBNUc7QUFFQU4sUUFBQUEsZ0JBQWdCLElBQUlHLE9BQU8sQ0FBQ0csVUFBNUI7QUFDSCxPQVJELE1BUU87QUFDSEQsUUFBQUEsUUFBUSxDQUFDbkIsSUFBVDtBQUNILE9BZDhILENBZ0IvSDs7O0FBQ0FwRCxNQUFBQSxDQUFDLFlBQUtvRSxRQUFMLFdBQUQsQ0FBdUJMLElBQXZCLENBQTRCSCxVQUFVLENBQUNTLE9BQU8sR0FBR0EsT0FBTyxDQUFDYyxJQUFYLEdBQWtCLENBQTFCLENBQXRDO0FBQ0gsS0FsQkQsRUFyQm9CLENBeUNwQjs7QUFDQSxRQUFJLENBQUNyRixZQUFZLENBQUNzRixXQUFsQixFQUErQjtBQUMzQnRGLE1BQUFBLFlBQVksQ0FBQ3NGLFdBQWIsR0FBMkIsSUFBM0IsQ0FEMkIsQ0FHM0I7O0FBQ0FwRixNQUFBQSxDQUFDLENBQUMsbUJBQUQsQ0FBRCxDQUF1QnFGLEVBQXZCLENBQTBCLFlBQTFCLEVBQXdDLG1CQUF4QyxFQUE2RCxVQUFVQyxDQUFWLEVBQWE7QUFDdEUsWUFBTUMsT0FBTyxHQUFHdkYsQ0FBQyxDQUFDLHFDQUFELENBQUQsQ0FBeUMrRCxJQUF6QyxDQUE4Qy9ELENBQUMsQ0FBQyxJQUFELENBQUQsQ0FBUWtGLElBQVIsQ0FBYSxPQUFiLENBQTlDLENBQWhCO0FBQ0FsRixRQUFBQSxDQUFDLENBQUMsTUFBRCxDQUFELENBQVV3RixNQUFWLENBQWlCRCxPQUFqQjtBQUNBdkYsUUFBQUEsQ0FBQyxDQUFDeUYsUUFBRCxDQUFELENBQVlKLEVBQVosQ0FBZSxtQkFBZixFQUFvQyxVQUFVSyxFQUFWLEVBQWM7QUFDOUNILFVBQUFBLE9BQU8sQ0FBQ2QsR0FBUixDQUFZO0FBQUVrQixZQUFBQSxJQUFJLEVBQUVELEVBQUUsQ0FBQ0UsS0FBSCxHQUFXLEVBQW5CO0FBQXVCQyxZQUFBQSxHQUFHLEVBQUVILEVBQUUsQ0FBQ0ksS0FBSCxHQUFXO0FBQXZDLFdBQVo7QUFDSCxTQUZEO0FBR0gsT0FORCxFQU1HVCxFQU5ILENBTU0sWUFOTixFQU1vQixtQkFOcEIsRUFNeUMsWUFBWTtBQUNqRHJGLFFBQUFBLENBQUMsQ0FBQyxrQkFBRCxDQUFELENBQXNCK0YsTUFBdEI7QUFDQS9GLFFBQUFBLENBQUMsQ0FBQ3lGLFFBQUQsQ0FBRCxDQUFZTyxHQUFaLENBQWdCLG1CQUFoQjtBQUNILE9BVEQsRUFKMkIsQ0FlM0I7O0FBQ0FoRyxNQUFBQSxDQUFDLENBQUMsZ0JBQUQsQ0FBRCxDQUFvQnFGLEVBQXBCLENBQXVCLFlBQXZCLEVBQXFDLFlBQVk7QUFDN0MsWUFBTWpCLFFBQVEsR0FBR3BFLENBQUMsQ0FBQyxJQUFELENBQUQsQ0FBUThDLElBQVIsQ0FBYSxVQUFiLENBQWpCO0FBQ0E5QyxRQUFBQSxDQUFDLDZDQUFxQ29FLFFBQXJDLFNBQUQsQ0FBb0RqQixRQUFwRCxDQUE2RCxhQUE3RDtBQUNILE9BSEQsRUFHR2tDLEVBSEgsQ0FHTSxZQUhOLEVBR29CLFlBQVk7QUFDNUJyRixRQUFBQSxDQUFDLENBQUMsbUJBQUQsQ0FBRCxDQUF1QnVELFdBQXZCLENBQW1DLGFBQW5DO0FBQ0gsT0FMRDtBQU1ILEtBaEVtQixDQWtFcEI7OztBQUNBLFFBQUlULElBQUksQ0FBQ21ELGNBQUwsSUFBdUJuRCxJQUFJLENBQUNtRCxjQUFMLENBQW9CQyxFQUEzQyxJQUFpRHBELElBQUksQ0FBQ21ELGNBQUwsQ0FBb0JDLEVBQXBCLENBQXVCQyxPQUF4RSxJQUFtRnJELElBQUksQ0FBQ21ELGNBQUwsQ0FBb0JDLEVBQXBCLENBQXVCZixJQUF2QixHQUE4QixDQUFySCxFQUF3SDtBQUNwSCxVQUFNZSxFQUFFLEdBQUdwRCxJQUFJLENBQUNtRCxjQUFMLENBQW9CQyxFQUEvQjtBQUNBbEcsTUFBQUEsQ0FBQyxDQUFDLHVCQUFELENBQUQsQ0FBMkIrRCxJQUEzQixDQUFnQ3JDLGVBQWUsQ0FBQzBFLHVCQUFoRDtBQUNBcEcsTUFBQUEsQ0FBQyxDQUFDLHlCQUFELENBQUQsQ0FBNkIrRCxJQUE3QixDQUNJckMsZUFBZSxDQUFDMkUsc0JBQWhCLENBQ0tDLE9BREwsQ0FDYSxTQURiLEVBQ3dCSixFQUFFLENBQUNLLFdBQUgsQ0FBZUMsY0FBZixFQUR4QixFQUVLRixPQUZMLENBRWEsUUFGYixFQUV1QjFDLFVBQVUsQ0FBQ3NDLEVBQUUsQ0FBQ2YsSUFBSixDQUZqQyxFQUdLbUIsT0FITCxDQUdhLFVBSGIsRUFHeUJKLEVBQUUsQ0FBQ08sTUFINUIsQ0FESjtBQU1BekcsTUFBQUEsQ0FBQyxDQUFDLHlCQUFELENBQUQsQ0FBNkIyRCxJQUE3QjtBQUNIO0FBQ0osR0FqUWdCOztBQW1RakI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJK0MsRUFBQUEsbUJBeFFpQiwrQkF3UUdDLE1BeFFILEVBd1FXO0FBQ3hCLFFBQUlDLElBQUksR0FBRywrQkFBWCxDQUR3QixDQUd4Qjs7QUFDQSxRQUFJRCxNQUFNLENBQUNFLE1BQVgsRUFBbUI7QUFDZkQsTUFBQUEsSUFBSSwwQ0FBaUNELE1BQU0sQ0FBQ0UsTUFBeEMsb0JBQUo7QUFDSCxLQU51QixDQVF4Qjs7O0FBQ0EsUUFBSUYsTUFBTSxDQUFDRyxXQUFYLEVBQXdCO0FBQ3BCRixNQUFBQSxJQUFJLGtDQUF5QkQsTUFBTSxDQUFDRyxXQUFoQyxXQUFKO0FBQ0gsS0FYdUIsQ0FheEI7OztBQUNBLFFBQUlILE1BQU0sQ0FBQ0ksSUFBUCxJQUFlSixNQUFNLENBQUNJLElBQVAsQ0FBWUMsTUFBWixHQUFxQixDQUF4QyxFQUEyQztBQUN2Q0osTUFBQUEsSUFBSSxJQUFJLHdDQUFSO0FBQ0FELE1BQUFBLE1BQU0sQ0FBQ0ksSUFBUCxDQUFZNUMsT0FBWixDQUFvQixVQUFBOEMsSUFBSSxFQUFJO0FBQ3hCLFlBQUksT0FBT0EsSUFBUCxLQUFnQixRQUFwQixFQUE4QjtBQUMxQkwsVUFBQUEsSUFBSSxrQkFBV0ssSUFBWCxVQUFKO0FBQ0gsU0FGRCxNQUVPLElBQUlBLElBQUksQ0FBQ0MsSUFBTCxJQUFhRCxJQUFJLENBQUNFLFVBQUwsS0FBb0IsSUFBckMsRUFBMkM7QUFDOUM7QUFDQVAsVUFBQUEsSUFBSSwyQkFBb0JLLElBQUksQ0FBQ0MsSUFBekIsb0NBQUo7QUFDSCxTQUhNLE1BR0EsSUFBSUQsSUFBSSxDQUFDQyxJQUFMLElBQWFELElBQUksQ0FBQ0UsVUFBdEIsRUFBa0M7QUFDckM7QUFDQVAsVUFBQUEsSUFBSSwwQkFBbUJLLElBQUksQ0FBQ0MsSUFBeEIsd0JBQTBDRCxJQUFJLENBQUNFLFVBQS9DLFVBQUo7QUFDSDtBQUNKLE9BVkQ7QUFXQVAsTUFBQUEsSUFBSSxJQUFJLGFBQVI7QUFDSCxLQTVCdUIsQ0E4QnhCOzs7QUFDQSxTQUFLLElBQUlRLENBQUMsR0FBRyxDQUFiLEVBQWdCQSxDQUFDLElBQUksRUFBckIsRUFBeUJBLENBQUMsRUFBMUIsRUFBOEI7QUFDMUIsVUFBTUMsT0FBTyxpQkFBVUQsQ0FBVixDQUFiOztBQUNBLFVBQUlULE1BQU0sQ0FBQ1UsT0FBRCxDQUFOLElBQW1CVixNQUFNLENBQUNVLE9BQUQsQ0FBTixDQUFnQkwsTUFBaEIsR0FBeUIsQ0FBaEQsRUFBbUQ7QUFDL0NKLFFBQUFBLElBQUksSUFBSSx3Q0FBUjtBQUNBRCxRQUFBQSxNQUFNLENBQUNVLE9BQUQsQ0FBTixDQUFnQmxELE9BQWhCLENBQXdCLFVBQUE4QyxJQUFJLEVBQUk7QUFDNUIsY0FBSSxPQUFPQSxJQUFQLEtBQWdCLFFBQXBCLEVBQThCO0FBQzFCTCxZQUFBQSxJQUFJLGtCQUFXSyxJQUFYLFVBQUo7QUFDSDtBQUNKLFNBSkQ7QUFLQUwsUUFBQUEsSUFBSSxJQUFJLGFBQVI7QUFDSDtBQUNKLEtBMUN1QixDQTRDeEI7OztBQUNBLFFBQUlELE1BQU0sQ0FBQ1csT0FBWCxFQUFvQjtBQUNoQlYsTUFBQUEsSUFBSSxJQUFJLG1EQUFSOztBQUNBLFVBQUlELE1BQU0sQ0FBQ1csT0FBUCxDQUFlVCxNQUFuQixFQUEyQjtBQUN2QkQsUUFBQUEsSUFBSSxvQ0FBMkJELE1BQU0sQ0FBQ1csT0FBUCxDQUFlVCxNQUExQyxXQUFKO0FBQ0g7O0FBQ0QsVUFBSUYsTUFBTSxDQUFDVyxPQUFQLENBQWV2RCxJQUFuQixFQUF5QjtBQUNyQjZDLFFBQUFBLElBQUksaUJBQVVELE1BQU0sQ0FBQ1csT0FBUCxDQUFldkQsSUFBekIsU0FBSjtBQUNIOztBQUNENkMsTUFBQUEsSUFBSSxJQUFJLGNBQVI7QUFDSCxLQXREdUIsQ0F3RHhCOzs7QUFDQSxRQUFJRCxNQUFNLENBQUNZLFFBQVAsSUFBbUJaLE1BQU0sQ0FBQ1ksUUFBUCxDQUFnQlAsTUFBaEIsR0FBeUIsQ0FBaEQsRUFBbUQ7QUFDL0MsVUFBSUwsTUFBTSxDQUFDYSxjQUFYLEVBQTJCO0FBQ3ZCWixRQUFBQSxJQUFJLDBDQUFpQ0QsTUFBTSxDQUFDYSxjQUF4QyxvQkFBSjtBQUNIOztBQUNEWixNQUFBQSxJQUFJLElBQUksb0ZBQVI7QUFDQUEsTUFBQUEsSUFBSSxJQUFJRCxNQUFNLENBQUNZLFFBQVAsQ0FBZ0J0QyxJQUFoQixDQUFxQixJQUFyQixDQUFSO0FBQ0EyQixNQUFBQSxJQUFJLElBQUksY0FBUjtBQUNILEtBaEV1QixDQWtFeEI7OztBQUNBLFFBQUlELE1BQU0sQ0FBQ2MsSUFBWCxFQUFpQjtBQUNiYixNQUFBQSxJQUFJLHNDQUE2QkQsTUFBTSxDQUFDYyxJQUFwQyxnQkFBSjtBQUNIOztBQUVEYixJQUFBQSxJQUFJLElBQUksUUFBUjtBQUNBLFdBQU9BLElBQVA7QUFDSCxHQWpWZ0I7O0FBbVZqQjtBQUNKO0FBQ0E7QUFDSXpFLEVBQUFBLGtCQXRWaUIsZ0NBc1ZJO0FBQ2pCO0FBQ0EsUUFBTXVGLGNBQWMsR0FBRztBQUNuQkMsTUFBQUEsdUJBQXVCLEVBQUU3SCxZQUFZLENBQUM0RyxtQkFBYixDQUFpQztBQUN0REcsUUFBQUEsTUFBTSxFQUFFbkYsZUFBZSxDQUFDa0csa0NBRDhCO0FBRXREZCxRQUFBQSxXQUFXLEVBQUVwRixlQUFlLENBQUNtRyxnQ0FGeUI7QUFHdERkLFFBQUFBLElBQUksRUFBRSxDQUNGckYsZUFBZSxDQUFDb0csaUNBRGQsRUFFRnBHLGVBQWUsQ0FBQ3FHLGlDQUZkLEVBR0ZyRyxlQUFlLENBQUNzRyxpQ0FIZCxFQUlGdEcsZUFBZSxDQUFDdUcsaUNBSmQsQ0FIZ0Q7QUFTdERYLFFBQUFBLE9BQU8sRUFBRTtBQUNMVCxVQUFBQSxNQUFNLEVBQUVuRixlQUFlLENBQUN3RywwQ0FEbkI7QUFFTG5FLFVBQUFBLElBQUksRUFBRXJDLGVBQWUsQ0FBQ3lHO0FBRmpCO0FBVDZDLE9BQWpDLENBRE47QUFnQm5CQyxNQUFBQSxVQUFVLEVBQUV0SSxZQUFZLENBQUM0RyxtQkFBYixDQUFpQztBQUN6Q0csUUFBQUEsTUFBTSxFQUFFbkYsZUFBZSxDQUFDMkcsNEJBRGlCO0FBRXpDdkIsUUFBQUEsV0FBVyxFQUFFcEYsZUFBZSxDQUFDNEcsMEJBRlk7QUFHekN2QixRQUFBQSxJQUFJLEVBQUUsQ0FDRnJGLGVBQWUsQ0FBQzZHLDJCQURkLEVBRUY3RyxlQUFlLENBQUM4RywyQkFGZCxFQUdGOUcsZUFBZSxDQUFDK0csMkJBSGQ7QUFIbUMsT0FBakMsQ0FoQk87QUEwQm5CQyxNQUFBQSxXQUFXLEVBQUU1SSxZQUFZLENBQUM0RyxtQkFBYixDQUFpQztBQUMxQ0csUUFBQUEsTUFBTSxFQUFFbkYsZUFBZSxDQUFDaUgsNkJBRGtCO0FBRTFDN0IsUUFBQUEsV0FBVyxFQUFFcEYsZUFBZSxDQUFDa0gsMkJBRmE7QUFHMUNyQixRQUFBQSxRQUFRLEVBQUUsQ0FDTixpREFETSxFQUVOLCtDQUZNLEVBR04sZ0RBSE0sRUFJTiw4REFKTSxFQUtOLG1EQUxNLEVBTU4sc0NBTk0sQ0FIZ0M7QUFXMUNDLFFBQUFBLGNBQWMsRUFBRTlGLGVBQWUsQ0FBQ21IO0FBWFUsT0FBakMsQ0ExQk07QUF3Q25CQyxNQUFBQSxTQUFTLEVBQUVoSixZQUFZLENBQUM0RyxtQkFBYixDQUFpQztBQUN4Q0csUUFBQUEsTUFBTSxFQUFFbkYsZUFBZSxDQUFDcUgsMkJBRGdCO0FBRXhDakMsUUFBQUEsV0FBVyxFQUFFcEYsZUFBZSxDQUFDc0gseUJBRlc7QUFHeEN6QixRQUFBQSxRQUFRLEVBQUUsQ0FDTixxQkFETSxFQUVOLFdBRk0sRUFHTixnQkFITSxDQUg4QjtBQVF4Q0UsUUFBQUEsSUFBSSxFQUFFL0YsZUFBZSxDQUFDdUg7QUFSa0IsT0FBakMsQ0F4Q1E7QUFtRG5CQyxNQUFBQSxTQUFTLEVBQUVwSixZQUFZLENBQUM0RyxtQkFBYixDQUFpQztBQUN4Q0csUUFBQUEsTUFBTSxFQUFFbkYsZUFBZSxDQUFDeUgsMkJBRGdCO0FBRXhDckMsUUFBQUEsV0FBVyxFQUFFcEYsZUFBZSxDQUFDMEgseUJBRlc7QUFHeENyQyxRQUFBQSxJQUFJLEVBQUUsQ0FDRnJGLGVBQWUsQ0FBQzJILDBCQURkLEVBRUYzSCxlQUFlLENBQUM0SCwwQkFGZCxFQUdGNUgsZUFBZSxDQUFDNkgsMEJBSGQ7QUFIa0MsT0FBakMsQ0FuRFE7QUE2RG5CQyxNQUFBQSxhQUFhLEVBQUUxSixZQUFZLENBQUM0RyxtQkFBYixDQUFpQztBQUM1Q0csUUFBQUEsTUFBTSxFQUFFbkYsZUFBZSxDQUFDK0gsK0JBRG9CO0FBRTVDM0MsUUFBQUEsV0FBVyxFQUFFcEYsZUFBZSxDQUFDZ0ksNkJBRmU7QUFHNUNqQyxRQUFBQSxJQUFJLEVBQUUvRixlQUFlLENBQUNpSTtBQUhzQixPQUFqQyxDQTdESTtBQW1FbkJDLE1BQUFBLGFBQWEsRUFBRTlKLFlBQVksQ0FBQzRHLG1CQUFiLENBQWlDO0FBQzVDRyxRQUFBQSxNQUFNLEVBQUVuRixlQUFlLENBQUNtSSwrQkFEb0I7QUFFNUMvQyxRQUFBQSxXQUFXLEVBQUVwRixlQUFlLENBQUNvSSw2QkFGZTtBQUc1Q3hDLFFBQUFBLE9BQU8sRUFBRTtBQUNMVCxVQUFBQSxNQUFNLEVBQUVuRixlQUFlLENBQUNxSSxrQkFEbkI7QUFFTGhHLFVBQUFBLElBQUksRUFBRXJDLGVBQWUsQ0FBQ3NJO0FBRmpCO0FBSG1DLE9BQWpDLENBbkVJO0FBNEVuQkMsTUFBQUEsc0JBQXNCLEVBQUVuSyxZQUFZLENBQUM0RyxtQkFBYixDQUFpQztBQUNyREcsUUFBQUEsTUFBTSxFQUFFbkYsZUFBZSxDQUFDd0ksaUNBRDZCO0FBRXJEcEQsUUFBQUEsV0FBVyxFQUFFcEYsZUFBZSxDQUFDeUksK0JBRndCO0FBR3JEcEQsUUFBQUEsSUFBSSxFQUFFLENBQ0ZyRixlQUFlLENBQUMwSSxnQ0FEZCxFQUVGMUksZUFBZSxDQUFDMkksZ0NBRmQsRUFHRjNJLGVBQWUsQ0FBQzRJLGdDQUhkLENBSCtDO0FBUXJEaEQsUUFBQUEsT0FBTyxFQUFFO0FBQ0xULFVBQUFBLE1BQU0sRUFBRW5GLGVBQWUsQ0FBQzZJLGVBRG5CO0FBRUx4RyxVQUFBQSxJQUFJLEVBQUVyQyxlQUFlLENBQUM4STtBQUZqQjtBQVI0QyxPQUFqQztBQTVFTCxLQUF2QixDQUZpQixDQTZGakI7O0FBQ0F4SyxJQUFBQSxDQUFDLENBQUMsa0JBQUQsQ0FBRCxDQUFzQnlLLElBQXRCLENBQTJCLFVBQUNDLEtBQUQsRUFBUUMsT0FBUixFQUFvQjtBQUMzQyxVQUFNQyxLQUFLLEdBQUc1SyxDQUFDLENBQUMySyxPQUFELENBQWY7QUFDQSxVQUFNRSxTQUFTLEdBQUdELEtBQUssQ0FBQzlILElBQU4sQ0FBVyxPQUFYLENBQWxCO0FBQ0EsVUFBTWdJLE9BQU8sR0FBR3BELGNBQWMsQ0FBQ21ELFNBQUQsQ0FBOUI7O0FBRUEsVUFBSUMsT0FBSixFQUFhO0FBQ1RGLFFBQUFBLEtBQUssQ0FBQ0csS0FBTixDQUFZO0FBQ1JuRSxVQUFBQSxJQUFJLEVBQUVrRSxPQURFO0FBRVJFLFVBQUFBLFFBQVEsRUFBRSxXQUZGO0FBR1JDLFVBQUFBLFNBQVMsRUFBRSxJQUhIO0FBSVJDLFVBQUFBLEtBQUssRUFBRTtBQUNIdkgsWUFBQUEsSUFBSSxFQUFFLEdBREg7QUFFSFAsWUFBQUEsSUFBSSxFQUFFO0FBRkgsV0FKQztBQVFSK0gsVUFBQUEsU0FBUyxFQUFFO0FBUkgsU0FBWjtBQVVIO0FBQ0osS0FqQkQ7QUFrQkgsR0F0Y2dCOztBQXdjakI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxnQkE3Y2lCLDRCQTZjQUMsUUE3Y0EsRUE2Y1U7QUFDdkIsUUFBTXhJLE1BQU0sR0FBR3dJLFFBQWY7QUFDQXhJLElBQUFBLE1BQU0sQ0FBQ0MsSUFBUCxHQUFjaEQsWUFBWSxDQUFDQyxRQUFiLENBQXNCdUMsSUFBdEIsQ0FBMkIsWUFBM0IsQ0FBZDtBQUNBLFdBQU9PLE1BQVA7QUFDSCxHQWpkZ0I7O0FBbWRqQjtBQUNKO0FBQ0E7QUFDQTtBQUNJeUksRUFBQUEsZUF2ZGlCLDJCQXVkRDFJLFFBdmRDLEVBdWRTO0FBQ3RCLFFBQUksQ0FBQ0EsUUFBUSxDQUFDMkksT0FBZCxFQUF1QjtBQUNuQi9JLE1BQUFBLElBQUksQ0FBQ3ZDLGFBQUwsQ0FBbUJzRCxXQUFuQixDQUErQixVQUEvQjtBQUNIO0FBQ0osR0EzZGdCOztBQTZkakI7QUFDSjtBQUNBO0FBQ0l4QyxFQUFBQSxjQWhlaUIsNEJBZ2VBO0FBQ2J5QixJQUFBQSxJQUFJLENBQUN6QyxRQUFMLEdBQWdCRCxZQUFZLENBQUNDLFFBQTdCO0FBQ0F5QyxJQUFBQSxJQUFJLENBQUN2QyxhQUFMLEdBQXFCSCxZQUFZLENBQUNHLGFBQWxDO0FBQ0F1QyxJQUFBQSxJQUFJLENBQUN0QyxlQUFMLEdBQXVCSixZQUFZLENBQUNJLGVBQXBDO0FBQ0FzQyxJQUFBQSxJQUFJLENBQUNyQyxZQUFMLEdBQW9CTCxZQUFZLENBQUNLLFlBQWpDO0FBQ0FxQyxJQUFBQSxJQUFJLENBQUNsQyxhQUFMLEdBQXFCUixZQUFZLENBQUNRLGFBQWxDO0FBQ0FrQyxJQUFBQSxJQUFJLENBQUM0SSxnQkFBTCxHQUF3QnRMLFlBQVksQ0FBQ3NMLGdCQUFyQztBQUNBNUksSUFBQUEsSUFBSSxDQUFDOEksZUFBTCxHQUF1QnhMLFlBQVksQ0FBQ3dMLGVBQXBDLENBUGEsQ0FTYjs7QUFDQTlJLElBQUFBLElBQUksQ0FBQ2dKLFdBQUwsR0FBbUI7QUFDZnJGLE1BQUFBLE9BQU8sRUFBRSxJQURNO0FBRWZzRixNQUFBQSxTQUFTLEVBQUUvSSxVQUZJO0FBR2ZnSixNQUFBQSxVQUFVLEVBQUUsUUFIRyxDQUdNOztBQUhOLEtBQW5CO0FBTUFsSixJQUFBQSxJQUFJLENBQUNqQyxVQUFMO0FBQ0g7QUFqZmdCLENBQXJCLEMsQ0FvZkE7O0FBQ0FQLENBQUMsQ0FBQ3lGLFFBQUQsQ0FBRCxDQUFZa0csS0FBWixDQUFrQixZQUFNO0FBQ3BCN0wsRUFBQUEsWUFBWSxDQUFDUyxVQUFiO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFN0b3JhZ2VBUEksIFVzZXJNZXNzYWdlLCBzM1N0b3JhZ2VJbmRleCwgJCAqL1xuXG4vKipcbiAqIFN0b3JhZ2UgbWFuYWdlbWVudCBtb2R1bGVcbiAqL1xuY29uc3Qgc3RvcmFnZUluZGV4ID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBsb2NhbCBzdG9yYWdlIGZvcm0gKFRhYiAyKS5cbiAgICAgKiBTZW5kcyBkYXRhIHRvOiBQQVRDSCAvcGJ4Y29yZS9hcGkvdjMvc3RvcmFnZVxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNsb2NhbC1zdG9yYWdlLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBzdWJtaXQgYnV0dG9uICh1bmlxdWUgdG8gdGhpcyBmb3JtKS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzdWJtaXRCdXR0b246ICQoJyNzdWJtaXRidXR0b24tbG9jYWwnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBkcm9wZG93biBzdWJtaXQgKHVuaXF1ZSB0byB0aGlzIGZvcm0pLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRyb3Bkb3duU3VibWl0OiAkKCcjZHJvcGRvd25TdWJtaXQtbG9jYWwnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBkaXJ0eSBmaWVsZCAodW5pcXVlIHRvIHRoaXMgZm9ybSkuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGlycnR5RmllbGQ6ICQoJyNkaXJydHktbG9jYWwnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSByZWNvcmRzIHJldGVudGlvbiBwZXJpb2Qgc2xpZGVyLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHJlY29yZHNTYXZlUGVyaW9kU2xpZGVyOiAkKCcjUEJYUmVjb3JkU2F2ZVBlcmlvZFNsaWRlcicpLFxuXG5cbiAgICAvKipcbiAgICAgKiBQb3NzaWJsZSBwZXJpb2QgdmFsdWVzIGZvciB0aGUgcmVjb3JkcyByZXRlbnRpb24uXG4gICAgICogVmFsdWVzIGluIGRheXM6IDMwLCA5MCwgMTgwLCAzNjAsIDEwODAsICcnIChpbmZpbml0eSlcbiAgICAgKi9cbiAgICBzYXZlUmVjb3Jkc1BlcmlvZDogWyczMCcsICc5MCcsICcxODAnLCAnMzYwJywgJzEwODAnLCAnJ10sXG5cblxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGxvY2FsIHN0b3JhZ2UgZm9ybS5cbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHt9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgbW9kdWxlIHdpdGggZXZlbnQgYmluZGluZ3MgYW5kIGNvbXBvbmVudCBpbml0aWFsaXphdGlvbnMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gRW5hYmxlIHRhYiBuYXZpZ2F0aW9uXG4gICAgICAgICQoJyNzdG9yYWdlLW1lbnUnKS5maW5kKCcuaXRlbScpLnRhYih7XG4gICAgICAgICAgICAgICAgaGlzdG9yeTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBoaXN0b3J5VHlwZTogJ2hhc2gnLFxuICAgICAgICAgICAgICAgICAgIG9uVmlzaWJsZTogZnVuY3Rpb24odGFiUGF0aCkge1xuICAgICAgICAgICAgICAgIC8vIExvYWQgc3RvcmFnZSBkYXRhIHdoZW4gc3RvcmFnZSBpbmZvIHRhYiBpcyBhY3RpdmF0ZWRcbiAgICAgICAgICAgICAgICBpZiAodGFiUGF0aCA9PT0gJ3N0b3JhZ2UtaW5mbycpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RvcmFnZUluZGV4LmxvYWRTdG9yYWdlRGF0YSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIGxvY2FsIHN0b3JhZ2UgZm9ybSB3aGVuIHRhYiBiZWNvbWVzIHZpc2libGVcbiAgICAgICAgICAgICAgICBpZiAodGFiUGF0aCA9PT0gJ3N0b3JhZ2UtbG9jYWwnKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0b3JhZ2VJbmRleC5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIFMzIGZvcm0gd2hlbiBjbG91ZCB0YWIgYmVjb21lcyB2aXNpYmxlXG4gICAgICAgICAgICAgICAgaWYgKHRhYlBhdGggPT09ICdzdG9yYWdlLWNsb3VkJyAmJiB0eXBlb2YgczNTdG9yYWdlSW5kZXggIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSByZWNvcmRzIHNhdmUgcGVyaW9kIHNsaWRlclxuICAgICAgICBzdG9yYWdlSW5kZXguJHJlY29yZHNTYXZlUGVyaW9kU2xpZGVyXG4gICAgICAgICAgICAuc2xpZGVyKHtcbiAgICAgICAgICAgICAgICBtaW46IDAsXG4gICAgICAgICAgICAgICAgbWF4OiA1LFxuICAgICAgICAgICAgICAgIHN0ZXA6IDEsXG4gICAgICAgICAgICAgICAgc21vb3RoOiB0cnVlLFxuICAgICAgICAgICAgICAgIGF1dG9BZGp1c3RMYWJlbHM6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGludGVycHJldExhYmVsOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbGFiZWxzID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgMDogZ2xvYmFsVHJhbnNsYXRlLnN0X1N0b3JlMU1vbnRoT2ZSZWNvcmRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgMTogZ2xvYmFsVHJhbnNsYXRlLnN0X1N0b3JlM01vbnRoc09mUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIDI6IGdsb2JhbFRyYW5zbGF0ZS5zdF9TdG9yZTZNb250aHNPZlJlY29yZHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAzOiBnbG9iYWxUcmFuc2xhdGUuc3RfU3RvcmUxWWVhck9mUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIDQ6IGdsb2JhbFRyYW5zbGF0ZS5zdF9TdG9yZTNZZWFyc09mUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIDU6IGdsb2JhbFRyYW5zbGF0ZS5zdF9TdG9yZUFsbFBvc3NpYmxlUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxhYmVsc1t2YWx1ZV0gfHwgJyc7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogc3RvcmFnZUluZGV4LmNiQWZ0ZXJTZWxlY3RTYXZlUGVyaW9kU2xpZGVyLFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwc1xuICAgICAgICBzdG9yYWdlSW5kZXguaW5pdGlhbGl6ZVRvb2x0aXBzKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZm9ybVxuICAgICAgICBzdG9yYWdlSW5kZXguaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBMb2FkIHNldHRpbmdzIGZyb20gQVBJXG4gICAgICAgIHN0b3JhZ2VJbmRleC5sb2FkU2V0dGluZ3MoKTtcblxuICAgICAgICAvLyBMb2FkIHN0b3JhZ2UgZGF0YSBvbiBwYWdlIGxvYWRcbiAgICAgICAgc3RvcmFnZUluZGV4LmxvYWRTdG9yYWdlRGF0YSgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGV2ZW50IGFmdGVyIHRoZSBzZWxlY3Qgc2F2ZSBwZXJpb2Qgc2xpZGVyIGlzIGNoYW5nZWQuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHZhbHVlIC0gVGhlIHNlbGVjdGVkIHZhbHVlIGZyb20gdGhlIHNsaWRlci5cbiAgICAgKi9cbiAgICBjYkFmdGVyU2VsZWN0U2F2ZVBlcmlvZFNsaWRlcih2YWx1ZSkge1xuICAgICAgICAvLyBHZXQgdGhlIHNhdmUgcGVyaW9kIGNvcnJlc3BvbmRpbmcgdG8gdGhlIHNsaWRlciB2YWx1ZS5cbiAgICAgICAgY29uc3Qgc2F2ZVBlcmlvZCA9IHN0b3JhZ2VJbmRleC5zYXZlUmVjb3Jkc1BlcmlvZFt2YWx1ZV07XG5cbiAgICAgICAgLy8gU2V0IHRoZSBmb3JtIHZhbHVlIGZvciAnUEJYUmVjb3JkU2F2ZVBlcmlvZCcgdG8gdGhlIHNlbGVjdGVkIHNhdmUgcGVyaW9kLlxuICAgICAgICBzdG9yYWdlSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1BCWFJlY29yZFNhdmVQZXJpb2QnLCBzYXZlUGVyaW9kKTtcblxuICAgICAgICAvLyBVcGRhdGUgUzMgbG9jYWwgcmV0ZW50aW9uIHNsaWRlciBtYXhpbXVtIChpZiBTMyBtb2R1bGUgbG9hZGVkKVxuICAgICAgICBpZiAodHlwZW9mIHMzU3RvcmFnZUluZGV4ICE9PSAndW5kZWZpbmVkJyAmJiBzM1N0b3JhZ2VJbmRleC51cGRhdGVTbGlkZXJMaW1pdHMpIHtcbiAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LnVwZGF0ZVNsaWRlckxpbWl0cyhzYXZlUGVyaW9kKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50IHRvIGFja25vd2xlZGdlIHRoZSBtb2RpZmljYXRpb25cbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIExvYWQgU3RvcmFnZSBzZXR0aW5ncyBmcm9tIEFQSVxuICAgICAqL1xuICAgIGxvYWRTZXR0aW5ncygpIHtcbiAgICAgICAgU3RvcmFnZUFQSS5nZXQoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuZGF0YTtcblxuICAgICAgICAgICAgICAgIC8vIFNldCBmb3JtIHZhbHVlcyBmb3IgbG9jYWwgc3RvcmFnZSBvbmx5XG4gICAgICAgICAgICAgICAgc3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZXMnLCB7XG4gICAgICAgICAgICAgICAgICAgIFBCWFJlY29yZFNhdmVQZXJpb2Q6IGRhdGEuUEJYUmVjb3JkU2F2ZVBlcmlvZCB8fCAnJ1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRvdGFsIHJldGVudGlvbiBwZXJpb2Qgc2xpZGVyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVjb3JkU2F2ZVBlcmlvZCA9IGRhdGEuUEJYUmVjb3JkU2F2ZVBlcmlvZCB8fCAnJztcbiAgICAgICAgICAgICAgICBjb25zdCBzbGlkZXJJbmRleCA9IHN0b3JhZ2VJbmRleC5zYXZlUmVjb3Jkc1BlcmlvZC5pbmRleE9mKHJlY29yZFNhdmVQZXJpb2QpO1xuICAgICAgICAgICAgICAgIHN0b3JhZ2VJbmRleC4kcmVjb3Jkc1NhdmVQZXJpb2RTbGlkZXIuc2xpZGVyKFxuICAgICAgICAgICAgICAgICAgICAnc2V0IHZhbHVlJyxcbiAgICAgICAgICAgICAgICAgICAgc2xpZGVySW5kZXgsXG4gICAgICAgICAgICAgICAgICAgIGZhbHNlXG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIC8vIE5vdGlmeSBTMyBtb2R1bGUgYWJvdXQgdG90YWwgcmV0ZW50aW9uIGNoYW5nZSAoaWYgbG9hZGVkKVxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgczNTdG9yYWdlSW5kZXggIT09ICd1bmRlZmluZWQnICYmIHMzU3RvcmFnZUluZGV4LnVwZGF0ZVNsaWRlckxpbWl0cykge1xuICAgICAgICAgICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC51cGRhdGVTbGlkZXJMaW1pdHMocmVjb3JkU2F2ZVBlcmlvZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgc3RvcmFnZSB1c2FnZSBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgbG9hZFN0b3JhZ2VEYXRhKCkge1xuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgJCgnI3N0b3JhZ2UtdXNhZ2UtY29udGFpbmVyIC5kaW1tZXInKS5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICQoJyNzdG9yYWdlLWRldGFpbHMnKS5oaWRlKCk7XG5cbiAgICAgICAgLy8gTWFrZSBBUEkgY2FsbCB0byBnZXQgc3RvcmFnZSB1c2FnZSB1c2luZyBuZXcgU3RvcmFnZUFQSVxuICAgICAgICBTdG9yYWdlQVBJLmdldFVzYWdlKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgc3RvcmFnZUluZGV4LnJlbmRlclN0b3JhZ2VEYXRhKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkKCcjc3RvcmFnZS11c2FnZS1jb250YWluZXIgLmRpbW1lcicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZ2xvYmFsVHJhbnNsYXRlLnN0X1N0b3JhZ2VMb2FkRXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlbmRlciBzdG9yYWdlIHVzYWdlIGRhdGEgaW4gdGhlIFVJXG4gICAgICovXG4gICAgcmVuZGVyU3RvcmFnZURhdGEoZGF0YSkge1xuICAgICAgICAvLyBIaWRlIGxvYWRpbmcgYW5kIHNob3cgZGV0YWlsc1xuICAgICAgICAkKCcjc3RvcmFnZS11c2FnZS1jb250YWluZXIgLmRpbW1lcicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgJCgnI3N0b3JhZ2UtZGV0YWlscycpLnNob3coKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZvcm1hdCBzaXplIGZvciBkaXNwbGF5XG4gICAgICAgIGNvbnN0IGZvcm1hdFNpemUgPSAoc2l6ZUluTWIpID0+IHtcbiAgICAgICAgICAgIGlmIChzaXplSW5NYiA+PSAxMDI0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChzaXplSW5NYiAvIDEwMjQpLnRvRml4ZWQoMSkgKyAnIEdCJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBzaXplSW5NYi50b0ZpeGVkKDEpICsgJyBNQic7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgaGVhZGVyIGluZm9ybWF0aW9uXG4gICAgICAgICQoJyN1c2VkLXNwYWNlLXRleHQnKS50ZXh0KGZvcm1hdFNpemUoZGF0YS51c2VkX3NwYWNlKSk7XG4gICAgICAgICQoJyN0b3RhbC1zaXplLXRleHQnKS50ZXh0KGZvcm1hdFNpemUoZGF0YS50b3RhbF9zaXplKSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgcHJvZ3Jlc3Mgc2VnbWVudHMgaW4gbWFjT1Mgc3R5bGVcbiAgICAgICAgbGV0IGFjY3VtdWxhdGVkV2lkdGggPSAwO1xuICAgICAgICBcbiAgICAgICAgLy8gUHJvY2VzcyBlYWNoIGNhdGVnb3J5XG4gICAgICAgIFsnY2FsbF9yZWNvcmRpbmdzJywgJ2Nkcl9kYXRhYmFzZScsICdzeXN0ZW1fbG9ncycsICdtb2R1bGVzJywgJ2JhY2t1cHMnLCAnc3lzdGVtX2NhY2hlcycsICdzM19jYWNoZScsICdvdGhlciddLmZvckVhY2goY2F0ZWdvcnkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY2F0RGF0YSA9IGRhdGEuY2F0ZWdvcmllc1tjYXRlZ29yeV07XG4gICAgICAgICAgICBjb25zdCAkc2VnbWVudCA9ICQoYC5wcm9ncmVzcy1zZWdtZW50W2RhdGEtY2F0ZWdvcnk9XCIke2NhdGVnb3J5fVwiXWApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoY2F0RGF0YSAmJiBjYXREYXRhLnBlcmNlbnRhZ2UgPiAwKSB7XG4gICAgICAgICAgICAgICAgJHNlZ21lbnQuY3NzKCd3aWR0aCcsIGNhdERhdGEucGVyY2VudGFnZSArICclJykuc2hvdygpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEFkZCBob3ZlciB0b29sdGlwXG4gICAgICAgICAgICAgICAgY29uc3QgY2F0ZWdvcnlLZXkgPSAnc3RfQ2F0ZWdvcnknICsgY2F0ZWdvcnkuc3BsaXQoJ18nKS5tYXAod29yZCA9PiB3b3JkLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgd29yZC5zbGljZSgxKSkuam9pbignJyk7XG4gICAgICAgICAgICAgICAgJHNlZ21lbnQuYXR0cigndGl0bGUnLCBgJHtnbG9iYWxUcmFuc2xhdGVbY2F0ZWdvcnlLZXldIHx8IGNhdGVnb3J5fTogJHtmb3JtYXRTaXplKGNhdERhdGEuc2l6ZSl9ICgke2NhdERhdGEucGVyY2VudGFnZX0lKWApO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGFjY3VtdWxhdGVkV2lkdGggKz0gY2F0RGF0YS5wZXJjZW50YWdlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkc2VnbWVudC5oaWRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBjYXRlZ29yeSBzaXplIGluIGxpc3RcbiAgICAgICAgICAgICQoYCMke2NhdGVnb3J5fS1zaXplYCkudGV4dChmb3JtYXRTaXplKGNhdERhdGEgPyBjYXREYXRhLnNpemUgOiAwKSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQmluZCBob3ZlciBlZmZlY3RzIG9ubHkgb25jZSAobm90IG9uIGV2ZXJ5IGRhdGEgcmVmcmVzaClcbiAgICAgICAgaWYgKCFzdG9yYWdlSW5kZXguX2hvdmVyQm91bmQpIHtcbiAgICAgICAgICAgIHN0b3JhZ2VJbmRleC5faG92ZXJCb3VuZCA9IHRydWU7XG5cbiAgICAgICAgICAgIC8vIFRvb2x0aXAgZm9yIHByb2dyZXNzIHNlZ21lbnRzXG4gICAgICAgICAgICAkKCcjc3RvcmFnZS1wcm9ncmVzcycpLm9uKCdtb3VzZWVudGVyJywgJy5wcm9ncmVzcy1zZWdtZW50JywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0b29sdGlwID0gJCgnPGRpdiBjbGFzcz1cInN0b3JhZ2UtdG9vbHRpcFwiPjwvZGl2PicpLnRleHQoJCh0aGlzKS5hdHRyKCd0aXRsZScpKTtcbiAgICAgICAgICAgICAgICAkKCdib2R5JykuYXBwZW5kKHRvb2x0aXApO1xuICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLm9uKCdtb3VzZW1vdmUudG9vbHRpcCcsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgICAgICAgICB0b29sdGlwLmNzcyh7IGxlZnQ6IGV2LnBhZ2VYICsgMTAsIHRvcDogZXYucGFnZVkgLSAzMCB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLm9uKCdtb3VzZWxlYXZlJywgJy5wcm9ncmVzcy1zZWdtZW50JywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICQoJy5zdG9yYWdlLXRvb2x0aXAnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS5vZmYoJ21vdXNlbW92ZS50b29sdGlwJyk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gSGlnaGxpZ2h0IG1hdGNoaW5nIHByb2dyZXNzIHNlZ21lbnQgb24gY2F0ZWdvcnkgbGlzdCBob3ZlciB2aWEgQ1NTIGNsYXNzXG4gICAgICAgICAgICAkKCcuY2F0ZWdvcnktaXRlbScpLm9uKCdtb3VzZWVudGVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNhdGVnb3J5ID0gJCh0aGlzKS5kYXRhKCdjYXRlZ29yeScpO1xuICAgICAgICAgICAgICAgICQoYC5wcm9ncmVzcy1zZWdtZW50W2RhdGEtY2F0ZWdvcnk9XCIke2NhdGVnb3J5fVwiXWApLmFkZENsYXNzKCdoaWdobGlnaHRlZCcpO1xuICAgICAgICAgICAgfSkub24oJ21vdXNlbGVhdmUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgJCgnLnByb2dyZXNzLXNlZ21lbnQnKS5yZW1vdmVDbGFzcygnaGlnaGxpZ2h0ZWQnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVuZGVyIHJlbW90ZSBzdG9yYWdlIGluZm8gKFMzKVxuICAgICAgICBpZiAoZGF0YS5yZW1vdGVfc3RvcmFnZSAmJiBkYXRhLnJlbW90ZV9zdG9yYWdlLnMzICYmIGRhdGEucmVtb3RlX3N0b3JhZ2UuczMuZW5hYmxlZCAmJiBkYXRhLnJlbW90ZV9zdG9yYWdlLnMzLnNpemUgPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBzMyA9IGRhdGEucmVtb3RlX3N0b3JhZ2UuczM7XG4gICAgICAgICAgICAkKCcjcmVtb3RlLXN0b3JhZ2UtdGl0bGUnKS50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5zdF9TM1JlbW90ZVN0b3JhZ2VUaXRsZSk7XG4gICAgICAgICAgICAkKCcjcmVtb3RlLXN0b3JhZ2UtZGV0YWlscycpLnRleHQoXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X1MzUmVtb3RlU3RvcmFnZUluZm9cbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoJyVmaWxlcyUnLCBzMy5maWxlc19jb3VudC50b0xvY2FsZVN0cmluZygpKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgnJXNpemUlJywgZm9ybWF0U2l6ZShzMy5zaXplKSlcbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoJyVidWNrZXQlJywgczMuYnVja2V0KVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICQoJyNyZW1vdGUtc3RvcmFnZS1zZWN0aW9uJykuc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCdWlsZCBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXAgcG9wdXBcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIC0gVG9vbHRpcCBjb25maWd1cmF0aW9uIG9iamVjdFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgc3RyaW5nIGZvciBwb3B1cCBjb250ZW50XG4gICAgICovXG4gICAgYnVpbGRUb29sdGlwQ29udGVudChjb25maWcpIHtcbiAgICAgICAgbGV0IGh0bWwgPSAnPGRpdiBjbGFzcz1cInVpIHJlbGF4ZWQgbGlzdFwiPic7XG5cbiAgICAgICAgLy8gSGVhZGVyXG4gICAgICAgIGlmIChjb25maWcuaGVhZGVyKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxzdHJvbmc+JHtjb25maWcuaGVhZGVyfTwvc3Ryb25nPjwvZGl2PmA7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEZXNjcmlwdGlvblxuICAgICAgICBpZiAoY29uZmlnLmRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPiR7Y29uZmlnLmRlc2NyaXB0aW9ufTwvZGl2PmA7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBNYWluIGxpc3RcbiAgICAgICAgaWYgKGNvbmZpZy5saXN0ICYmIGNvbmZpZy5saXN0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+PHVsIGNsYXNzPVwidWkgbGlzdFwiPic7XG4gICAgICAgICAgICBjb25maWcubGlzdC5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGxpPiR7aXRlbX08L2xpPmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpdGVtLnRlcm0gJiYgaXRlbS5kZWZpbml0aW9uID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNlY3Rpb24gaGVhZGVyXG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDwvdWw+PHN0cm9uZz4ke2l0ZW0udGVybX08L3N0cm9uZz48dWwgY2xhc3M9XCJ1aSBsaXN0XCI+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0udGVybSAmJiBpdGVtLmRlZmluaXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVGVybSB3aXRoIGRlZmluaXRpb25cbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGxpPjxzdHJvbmc+JHtpdGVtLnRlcm19Ojwvc3Ryb25nPiAke2l0ZW0uZGVmaW5pdGlvbn08L2xpPmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBodG1sICs9ICc8L3VsPjwvZGl2Pic7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGRpdGlvbmFsIGxpc3RzIChsaXN0Mi1saXN0MTApXG4gICAgICAgIGZvciAobGV0IGkgPSAyOyBpIDw9IDEwOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGxpc3RLZXkgPSBgbGlzdCR7aX1gO1xuICAgICAgICAgICAgaWYgKGNvbmZpZ1tsaXN0S2V5XSAmJiBjb25maWdbbGlzdEtleV0ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+PHVsIGNsYXNzPVwidWkgbGlzdFwiPic7XG4gICAgICAgICAgICAgICAgY29uZmlnW2xpc3RLZXldLmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT4ke2l0ZW19PC9saT5gO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPC91bD48L2Rpdj4nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gV2FybmluZ1xuICAgICAgICBpZiAoY29uZmlnLndhcm5pbmcpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+PGRpdiBjbGFzcz1cInVpIG9yYW5nZSBtZXNzYWdlXCI+JztcbiAgICAgICAgICAgIGlmIChjb25maWcud2FybmluZy5oZWFkZXIpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtjb25maWcud2FybmluZy5oZWFkZXJ9PC9kaXY+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjb25maWcud2FybmluZy50ZXh0KSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPHA+JHtjb25maWcud2FybmluZy50ZXh0fTwvcD5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+PC9kaXY+JztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEV4YW1wbGVzXG4gICAgICAgIGlmIChjb25maWcuZXhhbXBsZXMgJiYgY29uZmlnLmV4YW1wbGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGlmIChjb25maWcuZXhhbXBsZXNIZWFkZXIpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxzdHJvbmc+JHtjb25maWcuZXhhbXBsZXNIZWFkZXJ9PC9zdHJvbmc+PC9kaXY+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+PHByZSBzdHlsZT1cImJhY2tncm91bmQ6I2Y0ZjRmNDtwYWRkaW5nOjEwcHg7Ym9yZGVyLXJhZGl1czo0cHg7XCI+JztcbiAgICAgICAgICAgIGh0bWwgKz0gY29uZmlnLmV4YW1wbGVzLmpvaW4oJ1xcbicpO1xuICAgICAgICAgICAgaHRtbCArPSAnPC9wcmU+PC9kaXY+JztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE5vdGVcbiAgICAgICAgaWYgKGNvbmZpZy5ub3RlKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxlbT4ke2NvbmZpZy5ub3RlfTwvZW0+PC9kaXY+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVUb29sdGlwcygpIHtcbiAgICAgICAgLy8gVG9vbHRpcCBjb25maWd1cmF0aW9ucyBmb3IgZWFjaCBmaWVsZFxuICAgICAgICBjb25zdCB0b29sdGlwQ29uZmlncyA9IHtcbiAgICAgICAgICAgIHJlY29yZF9yZXRlbnRpb25fcGVyaW9kOiBzdG9yYWdlSW5kZXguYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9pdGVtMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9pdGVtMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9pdGVtMyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9pdGVtNFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25fd2FybmluZ19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25fd2FybmluZ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICBzM19lbmFibGVkOiBzdG9yYWdlSW5kZXguYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19lbmFibGVkX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfZW5hYmxlZF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfZW5hYmxlZF9pdGVtMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfZW5hYmxlZF9pdGVtMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfZW5hYmxlZF9pdGVtM1xuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICBzM19lbmRwb2ludDogc3RvcmFnZUluZGV4LmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfZW5kcG9pbnRfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19lbmRwb2ludF9kZXNjLFxuICAgICAgICAgICAgICAgIGV4YW1wbGVzOiBbXG4gICAgICAgICAgICAgICAgICAgICdBV1MgUzM6IGh0dHBzOi8vczMuYXAtc291dGhlYXN0LTEuYW1hem9uYXdzLmNvbScsXG4gICAgICAgICAgICAgICAgICAgICdZYW5kZXggQ2xvdWQ6IGh0dHBzOi8vc3RvcmFnZS55YW5kZXhjbG91ZC5uZXQnLFxuICAgICAgICAgICAgICAgICAgICAnVksgQ2xvdWQ6IGh0dHBzOi8vaGIua3otYXN0LnZrY2xvdWQtc3RvcmFnZS5ydScsXG4gICAgICAgICAgICAgICAgICAgICdDbG91ZGZsYXJlIFIyOiBodHRwczovLzxBQ0NPVU5UX0lEPi5yMi5jbG91ZGZsYXJlc3RvcmFnZS5jb20nLFxuICAgICAgICAgICAgICAgICAgICAnRGlnaXRhbE9jZWFuOiBodHRwczovL3NncDEuZGlnaXRhbG9jZWFuc3BhY2VzLmNvbScsXG4gICAgICAgICAgICAgICAgICAgICdNaW5JTzogaHR0cDovL21pbmlvLmV4YW1wbGUuY29tOjkwMDAnLFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgZXhhbXBsZXNIZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX2V4YW1wbGVzXG4gICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgczNfcmVnaW9uOiBzdG9yYWdlSW5kZXguYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19yZWdpb25faGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19yZWdpb25fZGVzYyxcbiAgICAgICAgICAgICAgICBleGFtcGxlczogW1xuICAgICAgICAgICAgICAgICAgICAndXMtZWFzdC0xIChkZWZhdWx0KScsXG4gICAgICAgICAgICAgICAgICAgICdldS13ZXN0LTEnLFxuICAgICAgICAgICAgICAgICAgICAnYXAtc291dGhlYXN0LTEnXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19yZWdpb25fbm90ZVxuICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgIHMzX2J1Y2tldDogc3RvcmFnZUluZGV4LmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfYnVja2V0X2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfYnVja2V0X2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19idWNrZXRfaXRlbTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2J1Y2tldF9pdGVtMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfYnVja2V0X2l0ZW0zXG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgIHMzX2FjY2Vzc19rZXk6IHN0b3JhZ2VJbmRleC5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2FjY2Vzc19rZXlfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19hY2Nlc3Nfa2V5X2Rlc2MsXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfYWNjZXNzX2tleV9ub3RlXG4gICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgczNfc2VjcmV0X2tleTogc3RvcmFnZUluZGV4LmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfc2VjcmV0X2tleV9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX3NlY3JldF9rZXlfZGVzYyxcbiAgICAgICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfd2FybmluZyxcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfc2VjcmV0X2tleV93YXJuaW5nXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgIGxvY2FsX3JldGVudGlvbl9wZXJpb2Q6IHN0b3JhZ2VJbmRleC5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2l0ZW0xLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25faXRlbTIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9pdGVtM1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX25vdGUsXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl93YXJuaW5nXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHBvcHVwIGZvciBlYWNoIHRvb2x0aXAgaWNvblxuICAgICAgICAkKCcuZmllbGQtaW5mby1pY29uJykuZWFjaCgoaW5kZXgsIGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJChlbGVtZW50KTtcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9ICRpY29uLmRhdGEoJ2ZpZWxkJyk7XG4gICAgICAgICAgICBjb25zdCBjb250ZW50ID0gdG9vbHRpcENvbmZpZ3NbZmllbGROYW1lXTtcblxuICAgICAgICAgICAgaWYgKGNvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICAkaWNvbi5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgIGh0bWw6IGNvbnRlbnQsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIHJpZ2h0JyxcbiAgICAgICAgICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hvdzogMzAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGlkZTogMTAwXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ2Zsb3dpbmcnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IHN0b3JhZ2VJbmRleC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKCFyZXNwb25zZS5zdWNjZXNzKSB7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBjdXN0b20gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IHN0b3JhZ2VJbmRleC4kZm9ybU9iajtcbiAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uID0gc3RvcmFnZUluZGV4LiRzdWJtaXRCdXR0b247XG4gICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0ID0gc3RvcmFnZUluZGV4LiRkcm9wZG93blN1Ym1pdDtcbiAgICAgICAgRm9ybS4kZGlycnR5RmllbGQgPSBzdG9yYWdlSW5kZXguJGRpcnJ0eUZpZWxkO1xuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBzdG9yYWdlSW5kZXgudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gc3RvcmFnZUluZGV4LmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gc3RvcmFnZUluZGV4LmNiQWZ0ZXJTZW5kRm9ybTtcblxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUEkgc2V0dGluZ3MgZm9yIEZvcm0uanMgKHNpbmdsZXRvbiByZXNvdXJjZSlcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBhcGlPYmplY3Q6IFN0b3JhZ2VBUEksXG4gICAgICAgICAgICBzYXZlTWV0aG9kOiAndXBkYXRlJyAvLyBVc2luZyBzdGFuZGFyZCBQVVQgZm9yIHNpbmdsZXRvbiB1cGRhdGVcbiAgICAgICAgfTtcblxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9XG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgc3RvcmFnZSBtYW5hZ2VtZW50IGludGVyZmFjZS5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBzdG9yYWdlSW5kZXguaW5pdGlhbGl6ZSgpO1xufSk7Il19