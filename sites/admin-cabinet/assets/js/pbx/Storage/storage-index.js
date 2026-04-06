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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TdG9yYWdlL3N0b3JhZ2UtaW5kZXguanMiXSwibmFtZXMiOlsic3RvcmFnZUluZGV4IiwiJGZvcm1PYmoiLCIkIiwiJHN1Ym1pdEJ1dHRvbiIsIiRkcm9wZG93blN1Ym1pdCIsIiRkaXJydHlGaWVsZCIsIiRyZWNvcmRzU2F2ZVBlcmlvZFNsaWRlciIsInNhdmVSZWNvcmRzUGVyaW9kIiwidmFsaWRhdGVSdWxlcyIsImluaXRpYWxpemUiLCJmaW5kIiwidGFiIiwiaGlzdG9yeSIsImhpc3RvcnlUeXBlIiwib25WaXNpYmxlIiwidGFiUGF0aCIsImxvYWRTdG9yYWdlRGF0YSIsImluaXRpYWxpemVGb3JtIiwiczNTdG9yYWdlSW5kZXgiLCJzbGlkZXIiLCJtaW4iLCJtYXgiLCJzdGVwIiwic21vb3RoIiwiYXV0b0FkanVzdExhYmVscyIsImludGVycHJldExhYmVsIiwidmFsdWUiLCJsYWJlbHMiLCJnbG9iYWxUcmFuc2xhdGUiLCJzdF9TdG9yZTFNb250aE9mUmVjb3JkcyIsInN0X1N0b3JlM01vbnRoc09mUmVjb3JkcyIsInN0X1N0b3JlNk1vbnRoc09mUmVjb3JkcyIsInN0X1N0b3JlMVllYXJPZlJlY29yZHMiLCJzdF9TdG9yZTNZZWFyc09mUmVjb3JkcyIsInN0X1N0b3JlQWxsUG9zc2libGVSZWNvcmRzIiwib25DaGFuZ2UiLCJjYkFmdGVyU2VsZWN0U2F2ZVBlcmlvZFNsaWRlciIsImluaXRpYWxpemVUb29sdGlwcyIsImxvYWRTZXR0aW5ncyIsInNhdmVQZXJpb2QiLCJmb3JtIiwidXBkYXRlU2xpZGVyTGltaXRzIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwiU3RvcmFnZUFQSSIsImdldCIsInJlc3BvbnNlIiwicmVzdWx0IiwiZGF0YSIsIlBCWFJlY29yZFNhdmVQZXJpb2QiLCJyZWNvcmRTYXZlUGVyaW9kIiwic2xpZGVySW5kZXgiLCJpbmRleE9mIiwiYWRkQ2xhc3MiLCJoaWRlIiwiZ2V0VXNhZ2UiLCJyZW5kZXJTdG9yYWdlRGF0YSIsInJlbW92ZUNsYXNzIiwiVXNlck1lc3NhZ2UiLCJzaG93TXVsdGlTdHJpbmciLCJzdF9TdG9yYWdlTG9hZEVycm9yIiwic2hvdyIsImZvcm1hdFNpemUiLCJzaXplSW5NYiIsInRvRml4ZWQiLCJ0ZXh0IiwidXNlZF9zcGFjZSIsInRvdGFsX3NpemUiLCJhY2N1bXVsYXRlZFdpZHRoIiwiZm9yRWFjaCIsImNhdGVnb3J5IiwiY2F0RGF0YSIsImNhdGVnb3JpZXMiLCIkc2VnbWVudCIsInBlcmNlbnRhZ2UiLCJjc3MiLCJjYXRlZ29yeUtleSIsInNwbGl0IiwibWFwIiwid29yZCIsImNoYXJBdCIsInRvVXBwZXJDYXNlIiwic2xpY2UiLCJqb2luIiwiYXR0ciIsInNpemUiLCJvbiIsImUiLCIkdGhpcyIsInRvb2x0aXAiLCJhcHBlbmQiLCJkb2N1bWVudCIsImxlZnQiLCJwYWdlWCIsInRvcCIsInBhZ2VZIiwicmVtb3ZlIiwib2ZmIiwicmVtb3RlX3N0b3JhZ2UiLCJzMyIsImVuYWJsZWQiLCJzdF9TM1JlbW90ZVN0b3JhZ2VUaXRsZSIsInN0X1MzUmVtb3RlU3RvcmFnZUluZm8iLCJyZXBsYWNlIiwiZmlsZXNfY291bnQiLCJ0b0xvY2FsZVN0cmluZyIsImJ1Y2tldCIsImJ1aWxkVG9vbHRpcENvbnRlbnQiLCJjb25maWciLCJodG1sIiwiaGVhZGVyIiwiZGVzY3JpcHRpb24iLCJsaXN0IiwibGVuZ3RoIiwiaXRlbSIsInRlcm0iLCJkZWZpbml0aW9uIiwiaSIsImxpc3RLZXkiLCJ3YXJuaW5nIiwiZXhhbXBsZXMiLCJleGFtcGxlc0hlYWRlciIsIm5vdGUiLCJ0b29sdGlwQ29uZmlncyIsInJlY29yZF9yZXRlbnRpb25fcGVyaW9kIiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2hlYWRlciIsInN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9kZXNjIiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2l0ZW0xIiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2l0ZW0yIiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2l0ZW0zIiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2l0ZW00Iiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX3dhcm5pbmdfaGVhZGVyIiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX3dhcm5pbmciLCJzM19lbmFibGVkIiwic3RfdG9vbHRpcF9zM19lbmFibGVkX2hlYWRlciIsInN0X3Rvb2x0aXBfczNfZW5hYmxlZF9kZXNjIiwic3RfdG9vbHRpcF9zM19lbmFibGVkX2l0ZW0xIiwic3RfdG9vbHRpcF9zM19lbmFibGVkX2l0ZW0yIiwic3RfdG9vbHRpcF9zM19lbmFibGVkX2l0ZW0zIiwiczNfZW5kcG9pbnQiLCJzdF90b29sdGlwX3MzX2VuZHBvaW50X2hlYWRlciIsInN0X3Rvb2x0aXBfczNfZW5kcG9pbnRfZGVzYyIsInN0X3Rvb2x0aXBfZXhhbXBsZXMiLCJzM19yZWdpb24iLCJzdF90b29sdGlwX3MzX3JlZ2lvbl9oZWFkZXIiLCJzdF90b29sdGlwX3MzX3JlZ2lvbl9kZXNjIiwic3RfdG9vbHRpcF9zM19yZWdpb25fbm90ZSIsInMzX2J1Y2tldCIsInN0X3Rvb2x0aXBfczNfYnVja2V0X2hlYWRlciIsInN0X3Rvb2x0aXBfczNfYnVja2V0X2Rlc2MiLCJzdF90b29sdGlwX3MzX2J1Y2tldF9pdGVtMSIsInN0X3Rvb2x0aXBfczNfYnVja2V0X2l0ZW0yIiwic3RfdG9vbHRpcF9zM19idWNrZXRfaXRlbTMiLCJzM19hY2Nlc3Nfa2V5Iiwic3RfdG9vbHRpcF9zM19hY2Nlc3Nfa2V5X2hlYWRlciIsInN0X3Rvb2x0aXBfczNfYWNjZXNzX2tleV9kZXNjIiwic3RfdG9vbHRpcF9zM19hY2Nlc3Nfa2V5X25vdGUiLCJzM19zZWNyZXRfa2V5Iiwic3RfdG9vbHRpcF9zM19zZWNyZXRfa2V5X2hlYWRlciIsInN0X3Rvb2x0aXBfczNfc2VjcmV0X2tleV9kZXNjIiwic3RfdG9vbHRpcF93YXJuaW5nIiwic3RfdG9vbHRpcF9zM19zZWNyZXRfa2V5X3dhcm5pbmciLCJsb2NhbF9yZXRlbnRpb25fcGVyaW9kIiwic3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25faGVhZGVyIiwic3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25fZGVzYyIsInN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2l0ZW0xIiwic3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25faXRlbTIiLCJzdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9pdGVtMyIsInN0X3Rvb2x0aXBfbm90ZSIsInN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX3dhcm5pbmciLCJlYWNoIiwiaW5kZXgiLCJlbGVtZW50IiwiJGljb24iLCJmaWVsZE5hbWUiLCJjb250ZW50IiwicG9wdXAiLCJwb3NpdGlvbiIsImhvdmVyYWJsZSIsImRlbGF5IiwidmFyaWF0aW9uIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwiY2JBZnRlclNlbmRGb3JtIiwic3VjY2VzcyIsImFwaVNldHRpbmdzIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsWUFBWSxHQUFHO0FBQ2pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMscUJBQUQsQ0FOTTs7QUFRakI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFRCxDQUFDLENBQUMscUJBQUQsQ0FaQzs7QUFjakI7QUFDSjtBQUNBO0FBQ0E7QUFDSUUsRUFBQUEsZUFBZSxFQUFFRixDQUFDLENBQUMsdUJBQUQsQ0FsQkQ7O0FBb0JqQjtBQUNKO0FBQ0E7QUFDQTtBQUNJRyxFQUFBQSxZQUFZLEVBQUVILENBQUMsQ0FBQyxlQUFELENB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IGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFN0b3JhZ2VBUEksIFVzZXJNZXNzYWdlLCBzM1N0b3JhZ2VJbmRleCwgJCAqL1xuXG4vKipcbiAqIFN0b3JhZ2UgbWFuYWdlbWVudCBtb2R1bGVcbiAqL1xuY29uc3Qgc3RvcmFnZUluZGV4ID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBsb2NhbCBzdG9yYWdlIGZvcm0gKFRhYiAyKS5cbiAgICAgKiBTZW5kcyBkYXRhIHRvOiBQQVRDSCAvcGJ4Y29yZS9hcGkvdjMvc3RvcmFnZVxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNsb2NhbC1zdG9yYWdlLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBzdWJtaXQgYnV0dG9uICh1bmlxdWUgdG8gdGhpcyBmb3JtKS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzdWJtaXRCdXR0b246ICQoJyNzdWJtaXRidXR0b24tbG9jYWwnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBkcm9wZG93biBzdWJtaXQgKHVuaXF1ZSB0byB0aGlzIGZvcm0pLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRyb3Bkb3duU3VibWl0OiAkKCcjZHJvcGRvd25TdWJtaXQtbG9jYWwnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBkaXJ0eSBmaWVsZCAodW5pcXVlIHRvIHRoaXMgZm9ybSkuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGlycnR5RmllbGQ6ICQoJyNkaXJydHktbG9jYWwnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSByZWNvcmRzIHJldGVudGlvbiBwZXJpb2Qgc2xpZGVyLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHJlY29yZHNTYXZlUGVyaW9kU2xpZGVyOiAkKCcjUEJYUmVjb3JkU2F2ZVBlcmlvZFNsaWRlcicpLFxuXG5cbiAgICAvKipcbiAgICAgKiBQb3NzaWJsZSBwZXJpb2QgdmFsdWVzIGZvciB0aGUgcmVjb3JkcyByZXRlbnRpb24uXG4gICAgICogVmFsdWVzIGluIGRheXM6IDMwLCA5MCwgMTgwLCAzNjAsIDEwODAsICcnIChpbmZpbml0eSlcbiAgICAgKi9cbiAgICBzYXZlUmVjb3Jkc1BlcmlvZDogWyczMCcsICc5MCcsICcxODAnLCAnMzYwJywgJzEwODAnLCAnJ10sXG5cblxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGxvY2FsIHN0b3JhZ2UgZm9ybS5cbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHt9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgbW9kdWxlIHdpdGggZXZlbnQgYmluZGluZ3MgYW5kIGNvbXBvbmVudCBpbml0aWFsaXphdGlvbnMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gRW5hYmxlIHRhYiBuYXZpZ2F0aW9uXG4gICAgICAgICQoJyNzdG9yYWdlLW1lbnUnKS5maW5kKCcuaXRlbScpLnRhYih7XG4gICAgICAgICAgICAgICAgaGlzdG9yeTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBoaXN0b3J5VHlwZTogJ2hhc2gnLFxuICAgICAgICAgICAgICAgICAgIG9uVmlzaWJsZTogZnVuY3Rpb24odGFiUGF0aCkge1xuICAgICAgICAgICAgICAgIC8vIExvYWQgc3RvcmFnZSBkYXRhIHdoZW4gc3RvcmFnZSBpbmZvIHRhYiBpcyBhY3RpdmF0ZWRcbiAgICAgICAgICAgICAgICBpZiAodGFiUGF0aCA9PT0gJ3N0b3JhZ2UtaW5mbycpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RvcmFnZUluZGV4LmxvYWRTdG9yYWdlRGF0YSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIGxvY2FsIHN0b3JhZ2UgZm9ybSB3aGVuIHRhYiBiZWNvbWVzIHZpc2libGVcbiAgICAgICAgICAgICAgICBpZiAodGFiUGF0aCA9PT0gJ3N0b3JhZ2UtbG9jYWwnKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0b3JhZ2VJbmRleC5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIFMzIGZvcm0gd2hlbiBjbG91ZCB0YWIgYmVjb21lcyB2aXNpYmxlXG4gICAgICAgICAgICAgICAgaWYgKHRhYlBhdGggPT09ICdzdG9yYWdlLWNsb3VkJyAmJiB0eXBlb2YgczNTdG9yYWdlSW5kZXggIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSByZWNvcmRzIHNhdmUgcGVyaW9kIHNsaWRlclxuICAgICAgICBzdG9yYWdlSW5kZXguJHJlY29yZHNTYXZlUGVyaW9kU2xpZGVyXG4gICAgICAgICAgICAuc2xpZGVyKHtcbiAgICAgICAgICAgICAgICBtaW46IDAsXG4gICAgICAgICAgICAgICAgbWF4OiA1LFxuICAgICAgICAgICAgICAgIHN0ZXA6IDEsXG4gICAgICAgICAgICAgICAgc21vb3RoOiB0cnVlLFxuICAgICAgICAgICAgICAgIGF1dG9BZGp1c3RMYWJlbHM6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGludGVycHJldExhYmVsOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbGFiZWxzID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgMDogZ2xvYmFsVHJhbnNsYXRlLnN0X1N0b3JlMU1vbnRoT2ZSZWNvcmRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgMTogZ2xvYmFsVHJhbnNsYXRlLnN0X1N0b3JlM01vbnRoc09mUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIDI6IGdsb2JhbFRyYW5zbGF0ZS5zdF9TdG9yZTZNb250aHNPZlJlY29yZHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAzOiBnbG9iYWxUcmFuc2xhdGUuc3RfU3RvcmUxWWVhck9mUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIDQ6IGdsb2JhbFRyYW5zbGF0ZS5zdF9TdG9yZTNZZWFyc09mUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIDU6IGdsb2JhbFRyYW5zbGF0ZS5zdF9TdG9yZUFsbFBvc3NpYmxlUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxhYmVsc1t2YWx1ZV0gfHwgJyc7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogc3RvcmFnZUluZGV4LmNiQWZ0ZXJTZWxlY3RTYXZlUGVyaW9kU2xpZGVyLFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwc1xuICAgICAgICBzdG9yYWdlSW5kZXguaW5pdGlhbGl6ZVRvb2x0aXBzKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZm9ybVxuICAgICAgICBzdG9yYWdlSW5kZXguaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBMb2FkIHNldHRpbmdzIGZyb20gQVBJXG4gICAgICAgIHN0b3JhZ2VJbmRleC5sb2FkU2V0dGluZ3MoKTtcblxuICAgICAgICAvLyBMb2FkIHN0b3JhZ2UgZGF0YSBvbiBwYWdlIGxvYWRcbiAgICAgICAgc3RvcmFnZUluZGV4LmxvYWRTdG9yYWdlRGF0YSgpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGV2ZW50IGFmdGVyIHRoZSBzZWxlY3Qgc2F2ZSBwZXJpb2Qgc2xpZGVyIGlzIGNoYW5nZWQuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHZhbHVlIC0gVGhlIHNlbGVjdGVkIHZhbHVlIGZyb20gdGhlIHNsaWRlci5cbiAgICAgKi9cbiAgICBjYkFmdGVyU2VsZWN0U2F2ZVBlcmlvZFNsaWRlcih2YWx1ZSkge1xuICAgICAgICAvLyBHZXQgdGhlIHNhdmUgcGVyaW9kIGNvcnJlc3BvbmRpbmcgdG8gdGhlIHNsaWRlciB2YWx1ZS5cbiAgICAgICAgY29uc3Qgc2F2ZVBlcmlvZCA9IHN0b3JhZ2VJbmRleC5zYXZlUmVjb3Jkc1BlcmlvZFt2YWx1ZV07XG5cbiAgICAgICAgLy8gU2V0IHRoZSBmb3JtIHZhbHVlIGZvciAnUEJYUmVjb3JkU2F2ZVBlcmlvZCcgdG8gdGhlIHNlbGVjdGVkIHNhdmUgcGVyaW9kLlxuICAgICAgICBzdG9yYWdlSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1BCWFJlY29yZFNhdmVQZXJpb2QnLCBzYXZlUGVyaW9kKTtcblxuICAgICAgICAvLyBVcGRhdGUgUzMgbG9jYWwgcmV0ZW50aW9uIHNsaWRlciBtYXhpbXVtIChpZiBTMyBtb2R1bGUgbG9hZGVkKVxuICAgICAgICBpZiAodHlwZW9mIHMzU3RvcmFnZUluZGV4ICE9PSAndW5kZWZpbmVkJyAmJiBzM1N0b3JhZ2VJbmRleC51cGRhdGVTbGlkZXJMaW1pdHMpIHtcbiAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LnVwZGF0ZVNsaWRlckxpbWl0cyhzYXZlUGVyaW9kKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50IHRvIGFja25vd2xlZGdlIHRoZSBtb2RpZmljYXRpb25cbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIExvYWQgU3RvcmFnZSBzZXR0aW5ncyBmcm9tIEFQSVxuICAgICAqL1xuICAgIGxvYWRTZXR0aW5ncygpIHtcbiAgICAgICAgU3RvcmFnZUFQSS5nZXQoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuZGF0YTtcblxuICAgICAgICAgICAgICAgIC8vIFNldCBmb3JtIHZhbHVlcyBmb3IgbG9jYWwgc3RvcmFnZSBvbmx5XG4gICAgICAgICAgICAgICAgc3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZXMnLCB7XG4gICAgICAgICAgICAgICAgICAgIFBCWFJlY29yZFNhdmVQZXJpb2Q6IGRhdGEuUEJYUmVjb3JkU2F2ZVBlcmlvZCB8fCAnJ1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRvdGFsIHJldGVudGlvbiBwZXJpb2Qgc2xpZGVyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVjb3JkU2F2ZVBlcmlvZCA9IGRhdGEuUEJYUmVjb3JkU2F2ZVBlcmlvZCB8fCAnJztcbiAgICAgICAgICAgICAgICBjb25zdCBzbGlkZXJJbmRleCA9IHN0b3JhZ2VJbmRleC5zYXZlUmVjb3Jkc1BlcmlvZC5pbmRleE9mKHJlY29yZFNhdmVQZXJpb2QpO1xuICAgICAgICAgICAgICAgIHN0b3JhZ2VJbmRleC4kcmVjb3Jkc1NhdmVQZXJpb2RTbGlkZXIuc2xpZGVyKFxuICAgICAgICAgICAgICAgICAgICAnc2V0IHZhbHVlJyxcbiAgICAgICAgICAgICAgICAgICAgc2xpZGVySW5kZXgsXG4gICAgICAgICAgICAgICAgICAgIGZhbHNlXG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIC8vIE5vdGlmeSBTMyBtb2R1bGUgYWJvdXQgdG90YWwgcmV0ZW50aW9uIGNoYW5nZSAoaWYgbG9hZGVkKVxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgczNTdG9yYWdlSW5kZXggIT09ICd1bmRlZmluZWQnICYmIHMzU3RvcmFnZUluZGV4LnVwZGF0ZVNsaWRlckxpbWl0cykge1xuICAgICAgICAgICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC51cGRhdGVTbGlkZXJMaW1pdHMocmVjb3JkU2F2ZVBlcmlvZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgc3RvcmFnZSB1c2FnZSBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgbG9hZFN0b3JhZ2VEYXRhKCkge1xuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgJCgnI3N0b3JhZ2UtdXNhZ2UtY29udGFpbmVyIC5kaW1tZXInKS5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICQoJyNzdG9yYWdlLWRldGFpbHMnKS5oaWRlKCk7XG5cbiAgICAgICAgLy8gTWFrZSBBUEkgY2FsbCB0byBnZXQgc3RvcmFnZSB1c2FnZSB1c2luZyBuZXcgU3RvcmFnZUFQSVxuICAgICAgICBTdG9yYWdlQVBJLmdldFVzYWdlKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgc3RvcmFnZUluZGV4LnJlbmRlclN0b3JhZ2VEYXRhKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkKCcjc3RvcmFnZS11c2FnZS1jb250YWluZXIgLmRpbW1lcicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZ2xvYmFsVHJhbnNsYXRlLnN0X1N0b3JhZ2VMb2FkRXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlbmRlciBzdG9yYWdlIHVzYWdlIGRhdGEgaW4gdGhlIFVJXG4gICAgICovXG4gICAgcmVuZGVyU3RvcmFnZURhdGEoZGF0YSkge1xuICAgICAgICAvLyBIaWRlIGxvYWRpbmcgYW5kIHNob3cgZGV0YWlsc1xuICAgICAgICAkKCcjc3RvcmFnZS11c2FnZS1jb250YWluZXIgLmRpbW1lcicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgJCgnI3N0b3JhZ2UtZGV0YWlscycpLnNob3coKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZvcm1hdCBzaXplIGZvciBkaXNwbGF5XG4gICAgICAgIGNvbnN0IGZvcm1hdFNpemUgPSAoc2l6ZUluTWIpID0+IHtcbiAgICAgICAgICAgIGlmIChzaXplSW5NYiA+PSAxMDI0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChzaXplSW5NYiAvIDEwMjQpLnRvRml4ZWQoMSkgKyAnIEdCJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBzaXplSW5NYi50b0ZpeGVkKDEpICsgJyBNQic7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgaGVhZGVyIGluZm9ybWF0aW9uXG4gICAgICAgICQoJyN1c2VkLXNwYWNlLXRleHQnKS50ZXh0KGZvcm1hdFNpemUoZGF0YS51c2VkX3NwYWNlKSk7XG4gICAgICAgICQoJyN0b3RhbC1zaXplLXRleHQnKS50ZXh0KGZvcm1hdFNpemUoZGF0YS50b3RhbF9zaXplKSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgcHJvZ3Jlc3Mgc2VnbWVudHMgaW4gbWFjT1Mgc3R5bGVcbiAgICAgICAgbGV0IGFjY3VtdWxhdGVkV2lkdGggPSAwO1xuICAgICAgICBcbiAgICAgICAgLy8gUHJvY2VzcyBlYWNoIGNhdGVnb3J5XG4gICAgICAgIFsnY2FsbF9yZWNvcmRpbmdzJywgJ2Nkcl9kYXRhYmFzZScsICdzeXN0ZW1fbG9ncycsICdtb2R1bGVzJywgJ2JhY2t1cHMnLCAnc3lzdGVtX2NhY2hlcycsICdzM19jYWNoZScsICdvdGhlciddLmZvckVhY2goY2F0ZWdvcnkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY2F0RGF0YSA9IGRhdGEuY2F0ZWdvcmllc1tjYXRlZ29yeV07XG4gICAgICAgICAgICBjb25zdCAkc2VnbWVudCA9ICQoYC5wcm9ncmVzcy1zZWdtZW50W2RhdGEtY2F0ZWdvcnk9XCIke2NhdGVnb3J5fVwiXWApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoY2F0RGF0YSAmJiBjYXREYXRhLnBlcmNlbnRhZ2UgPiAwKSB7XG4gICAgICAgICAgICAgICAgJHNlZ21lbnQuY3NzKCd3aWR0aCcsIGNhdERhdGEucGVyY2VudGFnZSArICclJykuc2hvdygpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEFkZCBob3ZlciB0b29sdGlwXG4gICAgICAgICAgICAgICAgY29uc3QgY2F0ZWdvcnlLZXkgPSAnc3RfQ2F0ZWdvcnknICsgY2F0ZWdvcnkuc3BsaXQoJ18nKS5tYXAod29yZCA9PiB3b3JkLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgd29yZC5zbGljZSgxKSkuam9pbignJyk7XG4gICAgICAgICAgICAgICAgJHNlZ21lbnQuYXR0cigndGl0bGUnLCBgJHtnbG9iYWxUcmFuc2xhdGVbY2F0ZWdvcnlLZXldIHx8IGNhdGVnb3J5fTogJHtmb3JtYXRTaXplKGNhdERhdGEuc2l6ZSl9ICgke2NhdERhdGEucGVyY2VudGFnZX0lKWApO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGFjY3VtdWxhdGVkV2lkdGggKz0gY2F0RGF0YS5wZXJjZW50YWdlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkc2VnbWVudC5oaWRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBjYXRlZ29yeSBzaXplIGluIGxpc3RcbiAgICAgICAgICAgICQoYCMke2NhdGVnb3J5fS1zaXplYCkudGV4dChmb3JtYXRTaXplKGNhdERhdGEgPyBjYXREYXRhLnNpemUgOiAwKSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQWRkIGhvdmVyIGVmZmVjdHMgZm9yIHByb2dyZXNzIHNlZ21lbnRzXG4gICAgICAgICQoJy5wcm9ncmVzcy1zZWdtZW50Jykub24oJ21vdXNlZW50ZXInLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICBjb25zdCAkdGhpcyA9ICQodGhpcyk7XG4gICAgICAgICAgICBjb25zdCB0b29sdGlwID0gJCgnPGRpdiBjbGFzcz1cInN0b3JhZ2UtdG9vbHRpcFwiPjwvZGl2PicpLnRleHQoJHRoaXMuYXR0cigndGl0bGUnKSk7XG4gICAgICAgICAgICAkKCdib2R5JykuYXBwZW5kKHRvb2x0aXApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAkKGRvY3VtZW50KS5vbignbW91c2Vtb3ZlLnRvb2x0aXAnLCBmdW5jdGlvbihlKSB7XG4gICAgICAgICAgICAgICAgdG9vbHRpcC5jc3Moe1xuICAgICAgICAgICAgICAgICAgICBsZWZ0OiBlLnBhZ2VYICsgMTAsXG4gICAgICAgICAgICAgICAgICAgIHRvcDogZS5wYWdlWSAtIDMwXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSkub24oJ21vdXNlbGVhdmUnLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICQoJy5zdG9yYWdlLXRvb2x0aXAnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICQoZG9jdW1lbnQpLm9mZignbW91c2Vtb3ZlLnRvb2x0aXAnKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBIaWdobGlnaHQgY2F0ZWdvcnkgb24gaG92ZXJcbiAgICAgICAgJCgnLmNhdGVnb3J5LWl0ZW0nKS5vbignbW91c2VlbnRlcicsIGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc3QgY2F0ZWdvcnkgPSAkKHRoaXMpLmRhdGEoJ2NhdGVnb3J5Jyk7XG4gICAgICAgICAgICAkKGAucHJvZ3Jlc3Mtc2VnbWVudFtkYXRhLWNhdGVnb3J5PVwiJHtjYXRlZ29yeX1cIl1gKS5jc3MoJ29wYWNpdHknLCAnMC43Jyk7XG4gICAgICAgIH0pLm9uKCdtb3VzZWxlYXZlJywgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAkKCcucHJvZ3Jlc3Mtc2VnbWVudCcpLmNzcygnb3BhY2l0eScsICcxJyk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFJlbmRlciByZW1vdGUgc3RvcmFnZSBpbmZvIChTMylcbiAgICAgICAgaWYgKGRhdGEucmVtb3RlX3N0b3JhZ2UgJiYgZGF0YS5yZW1vdGVfc3RvcmFnZS5zMyAmJiBkYXRhLnJlbW90ZV9zdG9yYWdlLnMzLmVuYWJsZWQgJiYgZGF0YS5yZW1vdGVfc3RvcmFnZS5zMy5zaXplID4gMCkge1xuICAgICAgICAgICAgY29uc3QgczMgPSBkYXRhLnJlbW90ZV9zdG9yYWdlLnMzO1xuICAgICAgICAgICAgJCgnI3JlbW90ZS1zdG9yYWdlLXRpdGxlJykudGV4dChnbG9iYWxUcmFuc2xhdGUuc3RfUzNSZW1vdGVTdG9yYWdlVGl0bGUpO1xuICAgICAgICAgICAgJCgnI3JlbW90ZS1zdG9yYWdlLWRldGFpbHMnKS50ZXh0KFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF9TM1JlbW90ZVN0b3JhZ2VJbmZvXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKCclZmlsZXMlJywgczMuZmlsZXNfY291bnQudG9Mb2NhbGVTdHJpbmcoKSlcbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoJyVzaXplJScsIGZvcm1hdFNpemUoczMuc2l6ZSkpXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKCclYnVja2V0JScsIHMzLmJ1Y2tldClcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICAkKCcjcmVtb3RlLXN0b3JhZ2Utc2VjdGlvbicpLnNob3coKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgSFRNTCBjb250ZW50IGZvciB0b29sdGlwIHBvcHVwXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZyAtIFRvb2x0aXAgY29uZmlndXJhdGlvbiBvYmplY3RcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIHN0cmluZyBmb3IgcG9wdXAgY29udGVudFxuICAgICAqL1xuICAgIGJ1aWxkVG9vbHRpcENvbnRlbnQoY29uZmlnKSB7XG4gICAgICAgIGxldCBodG1sID0gJzxkaXYgY2xhc3M9XCJ1aSByZWxheGVkIGxpc3RcIj4nO1xuXG4gICAgICAgIC8vIEhlYWRlclxuICAgICAgICBpZiAoY29uZmlnLmhlYWRlcikge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj48c3Ryb25nPiR7Y29uZmlnLmhlYWRlcn08L3N0cm9uZz48L2Rpdj5gO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRGVzY3JpcHRpb25cbiAgICAgICAgaWYgKGNvbmZpZy5kZXNjcmlwdGlvbikge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj4ke2NvbmZpZy5kZXNjcmlwdGlvbn08L2Rpdj5gO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTWFpbiBsaXN0XG4gICAgICAgIGlmIChjb25maWcubGlzdCAmJiBjb25maWcubGlzdC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiaXRlbVwiPjx1bCBjbGFzcz1cInVpIGxpc3RcIj4nO1xuICAgICAgICAgICAgY29uZmlnLmxpc3QuZm9yRWFjaChpdGVtID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT4ke2l0ZW19PC9saT5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXRlbS50ZXJtICYmIGl0ZW0uZGVmaW5pdGlvbiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTZWN0aW9uIGhlYWRlclxuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8L3VsPjxzdHJvbmc+JHtpdGVtLnRlcm19PC9zdHJvbmc+PHVsIGNsYXNzPVwidWkgbGlzdFwiPmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpdGVtLnRlcm0gJiYgaXRlbS5kZWZpbml0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRlcm0gd2l0aCBkZWZpbml0aW9uXG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT48c3Ryb25nPiR7aXRlbS50ZXJtfTo8L3N0cm9uZz4gJHtpdGVtLmRlZmluaXRpb259PC9saT5gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaHRtbCArPSAnPC91bD48L2Rpdj4nO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkaXRpb25hbCBsaXN0cyAobGlzdDItbGlzdDEwKVxuICAgICAgICBmb3IgKGxldCBpID0gMjsgaSA8PSAxMDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBsaXN0S2V5ID0gYGxpc3Qke2l9YDtcbiAgICAgICAgICAgIGlmIChjb25maWdbbGlzdEtleV0gJiYgY29uZmlnW2xpc3RLZXldLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiaXRlbVwiPjx1bCBjbGFzcz1cInVpIGxpc3RcIj4nO1xuICAgICAgICAgICAgICAgIGNvbmZpZ1tsaXN0S2V5XS5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+JHtpdGVtfTwvbGk+YDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzwvdWw+PC9kaXY+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFdhcm5pbmdcbiAgICAgICAgaWYgKGNvbmZpZy53YXJuaW5nKSB7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiaXRlbVwiPjxkaXYgY2xhc3M9XCJ1aSBvcmFuZ2UgbWVzc2FnZVwiPic7XG4gICAgICAgICAgICBpZiAoY29uZmlnLndhcm5pbmcuaGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Y29uZmlnLndhcm5pbmcuaGVhZGVyfTwvZGl2PmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoY29uZmlnLndhcm5pbmcudGV4dCkge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxwPiR7Y29uZmlnLndhcm5pbmcudGV4dH08L3A+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2PjwvZGl2Pic7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBFeGFtcGxlc1xuICAgICAgICBpZiAoY29uZmlnLmV4YW1wbGVzICYmIGNvbmZpZy5leGFtcGxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpZiAoY29uZmlnLmV4YW1wbGVzSGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj48c3Ryb25nPiR7Y29uZmlnLmV4YW1wbGVzSGVhZGVyfTwvc3Ryb25nPjwvZGl2PmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiaXRlbVwiPjxwcmUgc3R5bGU9XCJiYWNrZ3JvdW5kOiNmNGY0ZjQ7cGFkZGluZzoxMHB4O2JvcmRlci1yYWRpdXM6NHB4O1wiPic7XG4gICAgICAgICAgICBodG1sICs9IGNvbmZpZy5leGFtcGxlcy5qb2luKCdcXG4nKTtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvcHJlPjwvZGl2Pic7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBOb3RlXG4gICAgICAgIGlmIChjb25maWcubm90ZSkge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj48ZW0+JHtjb25maWcubm90ZX08L2VtPjwvZGl2PmA7XG4gICAgICAgIH1cblxuICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVG9vbHRpcHMoKSB7XG4gICAgICAgIC8vIFRvb2x0aXAgY29uZmlndXJhdGlvbnMgZm9yIGVhY2ggZmllbGRcbiAgICAgICAgY29uc3QgdG9vbHRpcENvbmZpZ3MgPSB7XG4gICAgICAgICAgICByZWNvcmRfcmV0ZW50aW9uX3BlcmlvZDogc3RvcmFnZUluZGV4LmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25fZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTMsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTRcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX3dhcm5pbmdfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX3dhcm5pbmdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgczNfZW5hYmxlZDogc3RvcmFnZUluZGV4LmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfZW5hYmxlZF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2VuYWJsZWRfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2VuYWJsZWRfaXRlbTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2VuYWJsZWRfaXRlbTIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2VuYWJsZWRfaXRlbTNcbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgczNfZW5kcG9pbnQ6IHN0b3JhZ2VJbmRleC5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2VuZHBvaW50X2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfZW5kcG9pbnRfZGVzYyxcbiAgICAgICAgICAgICAgICBleGFtcGxlczogW1xuICAgICAgICAgICAgICAgICAgICAnQVdTIFMzOiBodHRwczovL3MzLmFwLXNvdXRoZWFzdC0xLmFtYXpvbmF3cy5jb20nLFxuICAgICAgICAgICAgICAgICAgICAnWWFuZGV4IENsb3VkOiBodHRwczovL3N0b3JhZ2UueWFuZGV4Y2xvdWQubmV0JyxcbiAgICAgICAgICAgICAgICAgICAgJ1ZLIENsb3VkOiBodHRwczovL2hiLmt6LWFzdC52a2Nsb3VkLXN0b3JhZ2UucnUnLFxuICAgICAgICAgICAgICAgICAgICAnQ2xvdWRmbGFyZSBSMjogaHR0cHM6Ly88QUNDT1VOVF9JRD4ucjIuY2xvdWRmbGFyZXN0b3JhZ2UuY29tJyxcbiAgICAgICAgICAgICAgICAgICAgJ0RpZ2l0YWxPY2VhbjogaHR0cHM6Ly9zZ3AxLmRpZ2l0YWxvY2VhbnNwYWNlcy5jb20nLFxuICAgICAgICAgICAgICAgICAgICAnTWluSU86IGh0dHA6Ly9taW5pby5leGFtcGxlLmNvbTo5MDAwJyxcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIGV4YW1wbGVzSGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9leGFtcGxlc1xuICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgIHMzX3JlZ2lvbjogc3RvcmFnZUluZGV4LmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfcmVnaW9uX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfcmVnaW9uX2Rlc2MsXG4gICAgICAgICAgICAgICAgZXhhbXBsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgJ3VzLWVhc3QtMSAoZGVmYXVsdCknLFxuICAgICAgICAgICAgICAgICAgICAnZXUtd2VzdC0xJyxcbiAgICAgICAgICAgICAgICAgICAgJ2FwLXNvdXRoZWFzdC0xJ1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfcmVnaW9uX25vdGVcbiAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICBzM19idWNrZXQ6IHN0b3JhZ2VJbmRleC5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2J1Y2tldF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2J1Y2tldF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfYnVja2V0X2l0ZW0xLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19idWNrZXRfaXRlbTIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2J1Y2tldF9pdGVtM1xuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICBzM19hY2Nlc3Nfa2V5OiBzdG9yYWdlSW5kZXguYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19hY2Nlc3Nfa2V5X2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfYWNjZXNzX2tleV9kZXNjLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2FjY2Vzc19rZXlfbm90ZVxuICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgIHMzX3NlY3JldF9rZXk6IHN0b3JhZ2VJbmRleC5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX3NlY3JldF9rZXlfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19zZWNyZXRfa2V5X2Rlc2MsXG4gICAgICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3dhcm5pbmcsXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX3NlY3JldF9rZXlfd2FybmluZ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICBsb2NhbF9yZXRlbnRpb25fcGVyaW9kOiBzdG9yYWdlSW5kZXguYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25faGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25fZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9pdGVtMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2l0ZW0yLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25faXRlbTNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9ub3RlLFxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25fd2FybmluZ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBwb3B1cCBmb3IgZWFjaCB0b29sdGlwIGljb25cbiAgICAgICAgJCgnLmZpZWxkLWluZm8taWNvbicpLmVhY2goKGluZGV4LCBlbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkaWNvbiA9ICQoZWxlbWVudCk7XG4gICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSAkaWNvbi5kYXRhKCdmaWVsZCcpO1xuICAgICAgICAgICAgY29uc3QgY29udGVudCA9IHRvb2x0aXBDb25maWdzW2ZpZWxkTmFtZV07XG5cbiAgICAgICAgICAgIGlmIChjb250ZW50KSB7XG4gICAgICAgICAgICAgICAgJGljb24ucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICBodG1sOiBjb250ZW50LFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCByaWdodCcsXG4gICAgICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGVsYXk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3c6IDMwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhpZGU6IDEwMFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB2YXJpYXRpb246ICdmbG93aW5nJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBzdG9yYWdlSW5kZXguJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmICghcmVzcG9uc2Uuc3VjY2Vzcykge1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBzdG9yYWdlSW5kZXguJGZvcm1PYmo7XG4gICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbiA9IHN0b3JhZ2VJbmRleC4kc3VibWl0QnV0dG9uO1xuICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdCA9IHN0b3JhZ2VJbmRleC4kZHJvcGRvd25TdWJtaXQ7XG4gICAgICAgIEZvcm0uJGRpcnJ0eUZpZWxkID0gc3RvcmFnZUluZGV4LiRkaXJydHlGaWVsZDtcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gc3RvcmFnZUluZGV4LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IHN0b3JhZ2VJbmRleC5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IHN0b3JhZ2VJbmRleC5jYkFmdGVyU2VuZEZvcm07XG5cbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIHNldHRpbmdzIGZvciBGb3JtLmpzIChzaW5nbGV0b24gcmVzb3VyY2UpXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgYXBpT2JqZWN0OiBTdG9yYWdlQVBJLFxuICAgICAgICAgICAgc2F2ZU1ldGhvZDogJ3VwZGF0ZScgLy8gVXNpbmcgc3RhbmRhcmQgUFVUIGZvciBzaW5nbGV0b24gdXBkYXRlXG4gICAgICAgIH07XG5cbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfVxufTtcblxuLy8gV2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHksIGluaXRpYWxpemUgdGhlIHN0b3JhZ2UgbWFuYWdlbWVudCBpbnRlcmZhY2UuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgc3RvcmFnZUluZGV4LmluaXRpYWxpemUoKTtcbn0pOyJdfQ==