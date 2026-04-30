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
   * Per-preset note appended to the s3_endpoint field tooltip. Updated
   * by setS3EndpointPresetNote() each time the operator picks a different
   * provider preset; rendered as the `note` slot of the s3_endpoint
   * tooltip config so all per-field hints stay in one place.
   * @type {string}
   */
  s3EndpointPresetNote: '',

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
   * Build the s3_endpoint tooltip HTML, weaving in the current
   * per-preset note (if any) as the trailing `note` slot. Lives in its
   * own method so setS3EndpointPresetNote() can rebuild the content on
   * the fly without re-running the rest of the tooltip machinery.
   *
   * @returns {string} HTML
   */
  buildS3EndpointTooltipContent: function buildS3EndpointTooltipContent() {
    return storageIndex.buildTooltipContent({
      header: globalTranslate.st_tooltip_s3_endpoint_header,
      description: globalTranslate.st_tooltip_s3_endpoint_desc,
      examples: ['AWS S3: https://s3.ap-southeast-1.amazonaws.com', 'Yandex Cloud: https://storage.yandexcloud.net', 'VK Cloud: https://hb.kz-ast.vkcloud-storage.ru', 'Cloudflare R2: https://<ACCOUNT_ID>.r2.cloudflarestorage.com', 'DigitalOcean: https://sgp1.digitaloceanspaces.com', 'MinIO: http://minio.example.com:9000'],
      examplesHeader: globalTranslate.st_tooltip_examples,
      note: storageIndex.s3EndpointPresetNote || null
    });
  },

  /**
   * Update the per-preset note that the s3_endpoint tooltip carries and
   * push the rebuilt HTML into the live Fomantic popup. Called from
   * s3-storage-index.js whenever the provider preset changes so the
   * preset-specific guidance lives next to the field it actually
   * affects (no separate hint banner needed).
   *
   * @param {string} text
   */
  setS3EndpointPresetNote: function setS3EndpointPresetNote(text) {
    storageIndex.s3EndpointPresetNote = text || '';
    var $icon = $('.field-info-icon[data-field="s3_endpoint"]');

    if ($icon.length === 0) {
      return;
    } // If the popup hasn't been initialised yet (e.g. cloud tab not
    // visited yet), do nothing extra — initializeTooltips() will pick
    // up the new state via buildS3EndpointTooltipContent() on first
    // init. Avoids a destroy/reinit race that would otherwise wipe
    // the dynamic note when initializeTooltips() runs later.


    if ($icon.popup('exists')) {
      $icon.popup('change content', storageIndex.buildS3EndpointTooltipContent());
    }
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
      s3_endpoint: storageIndex.buildS3EndpointTooltipContent(),
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TdG9yYWdlL3N0b3JhZ2UtaW5kZXguanMiXSwibmFtZXMiOlsic3RvcmFnZUluZGV4IiwiJGZvcm1PYmoiLCIkIiwiJHN1Ym1pdEJ1dHRvbiIsIiRkcm9wZG93blN1Ym1pdCIsIiRkaXJydHlGaWVsZCIsIiRyZWNvcmRzU2F2ZVBlcmlvZFNsaWRlciIsInNhdmVSZWNvcmRzUGVyaW9kIiwidmFsaWRhdGVSdWxlcyIsInMzRW5kcG9pbnRQcmVzZXROb3RlIiwiaW5pdGlhbGl6ZSIsImZpbmQiLCJ0YWIiLCJoaXN0b3J5IiwiaGlzdG9yeVR5cGUiLCJvblZpc2libGUiLCJ0YWJQYXRoIiwibG9hZFN0b3JhZ2VEYXRhIiwiaW5pdGlhbGl6ZUZvcm0iLCJzM1N0b3JhZ2VJbmRleCIsInNsaWRlciIsIm1pbiIsIm1heCIsInN0ZXAiLCJzbW9vdGgiLCJhdXRvQWRqdXN0TGFiZWxzIiwiaW50ZXJwcmV0TGFiZWwiLCJ2YWx1ZSIsImxhYmVscyIsImdsb2JhbFRyYW5zbGF0ZSIsInN0X1N0b3JlMU1vbnRoT2ZSZWNvcmRzIiwic3RfU3RvcmUzTW9udGhzT2ZSZWNvcmRzIiwic3RfU3RvcmU2TW9udGhzT2ZSZWNvcmRzIiwic3RfU3RvcmUxWWVhck9mUmVjb3JkcyIsInN0X1N0b3JlM1llYXJzT2ZSZWNvcmRzIiwic3RfU3RvcmVBbGxQb3NzaWJsZVJlY29yZHMiLCJvbkNoYW5nZSIsImNiQWZ0ZXJTZWxlY3RTYXZlUGVyaW9kU2xpZGVyIiwiaW5pdGlhbGl6ZVRvb2x0aXBzIiwibG9hZFNldHRpbmdzIiwic2F2ZVBlcmlvZCIsImZvcm0iLCJ1cGRhdGVTbGlkZXJMaW1pdHMiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJTdG9yYWdlQVBJIiwiZ2V0IiwicmVzcG9uc2UiLCJyZXN1bHQiLCJkYXRhIiwiUEJYUmVjb3JkU2F2ZVBlcmlvZCIsInJlY29yZFNhdmVQZXJpb2QiLCJzbGlkZXJJbmRleCIsImluZGV4T2YiLCJhZGRDbGFzcyIsImhpZGUiLCJnZXRVc2FnZSIsInJlbmRlclN0b3JhZ2VEYXRhIiwicmVtb3ZlQ2xhc3MiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsInN0X1N0b3JhZ2VMb2FkRXJyb3IiLCJzaG93IiwiZm9ybWF0U2l6ZSIsInNpemVJbk1iIiwidG9GaXhlZCIsInRleHQiLCJ1c2VkX3NwYWNlIiwidG90YWxfc2l6ZSIsImFjY3VtdWxhdGVkV2lkdGgiLCJmb3JFYWNoIiwiY2F0ZWdvcnkiLCJjYXREYXRhIiwiY2F0ZWdvcmllcyIsIiRzZWdtZW50IiwicGVyY2VudGFnZSIsImNzcyIsImNhdGVnb3J5S2V5Iiwic3BsaXQiLCJtYXAiLCJ3b3JkIiwiY2hhckF0IiwidG9VcHBlckNhc2UiLCJzbGljZSIsImpvaW4iLCJhdHRyIiwic2l6ZSIsIl9ob3ZlckJvdW5kIiwib24iLCJlIiwidG9vbHRpcCIsImFwcGVuZCIsImRvY3VtZW50IiwiZXYiLCJsZWZ0IiwicGFnZVgiLCJ0b3AiLCJwYWdlWSIsInJlbW92ZSIsIm9mZiIsInJlbW90ZV9zdG9yYWdlIiwiczMiLCJlbmFibGVkIiwic3RfUzNSZW1vdGVTdG9yYWdlVGl0bGUiLCJzdF9TM1JlbW90ZVN0b3JhZ2VJbmZvIiwicmVwbGFjZSIsImZpbGVzX2NvdW50IiwidG9Mb2NhbGVTdHJpbmciLCJidWNrZXQiLCJidWlsZFRvb2x0aXBDb250ZW50IiwiY29uZmlnIiwiaHRtbCIsImhlYWRlciIsImRlc2NyaXB0aW9uIiwibGlzdCIsImxlbmd0aCIsIml0ZW0iLCJ0ZXJtIiwiZGVmaW5pdGlvbiIsImkiLCJsaXN0S2V5Iiwid2FybmluZyIsImV4YW1wbGVzIiwiZXhhbXBsZXNIZWFkZXIiLCJub3RlIiwiYnVpbGRTM0VuZHBvaW50VG9vbHRpcENvbnRlbnQiLCJzdF90b29sdGlwX3MzX2VuZHBvaW50X2hlYWRlciIsInN0X3Rvb2x0aXBfczNfZW5kcG9pbnRfZGVzYyIsInN0X3Rvb2x0aXBfZXhhbXBsZXMiLCJzZXRTM0VuZHBvaW50UHJlc2V0Tm90ZSIsIiRpY29uIiwicG9wdXAiLCJ0b29sdGlwQ29uZmlncyIsInJlY29yZF9yZXRlbnRpb25fcGVyaW9kIiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2hlYWRlciIsInN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9kZXNjIiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2l0ZW0xIiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2l0ZW0yIiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2l0ZW0zIiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2l0ZW00Iiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX3dhcm5pbmdfaGVhZGVyIiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX3dhcm5pbmciLCJzM19lbmFibGVkIiwic3RfdG9vbHRpcF9zM19lbmFibGVkX2hlYWRlciIsInN0X3Rvb2x0aXBfczNfZW5hYmxlZF9kZXNjIiwic3RfdG9vbHRpcF9zM19lbmFibGVkX2l0ZW0xIiwic3RfdG9vbHRpcF9zM19lbmFibGVkX2l0ZW0yIiwic3RfdG9vbHRpcF9zM19lbmFibGVkX2l0ZW0zIiwiczNfcHJvdmlkZXJfcHJlc2V0Iiwic3RfdG9vbHRpcF9zM19wcmVzZXRfaGVhZGVyIiwic3RfdG9vbHRpcF9zM19wcmVzZXRfZGVzYyIsInMzX2VuZHBvaW50IiwiczNfcmVnaW9uIiwic3RfdG9vbHRpcF9zM19yZWdpb25faGVhZGVyIiwic3RfdG9vbHRpcF9zM19yZWdpb25fZGVzYyIsInN0X3Rvb2x0aXBfczNfcmVnaW9uX25vdGUiLCJzM19idWNrZXQiLCJzdF90b29sdGlwX3MzX2J1Y2tldF9oZWFkZXIiLCJzdF90b29sdGlwX3MzX2J1Y2tldF9kZXNjIiwic3RfdG9vbHRpcF9zM19idWNrZXRfaXRlbTEiLCJzdF90b29sdGlwX3MzX2J1Y2tldF9pdGVtMiIsInN0X3Rvb2x0aXBfczNfYnVja2V0X2l0ZW0zIiwiczNfYWNjZXNzX2tleSIsInN0X3Rvb2x0aXBfczNfYWNjZXNzX2tleV9oZWFkZXIiLCJzdF90b29sdGlwX3MzX2FjY2Vzc19rZXlfZGVzYyIsInN0X3Rvb2x0aXBfczNfYWNjZXNzX2tleV9ub3RlIiwiczNfc2VjcmV0X2tleSIsInN0X3Rvb2x0aXBfczNfc2VjcmV0X2tleV9oZWFkZXIiLCJzdF90b29sdGlwX3MzX3NlY3JldF9rZXlfZGVzYyIsInN0X3Rvb2x0aXBfd2FybmluZyIsInN0X3Rvb2x0aXBfczNfc2VjcmV0X2tleV93YXJuaW5nIiwibG9jYWxfcmV0ZW50aW9uX3BlcmlvZCIsInN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2hlYWRlciIsInN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2Rlc2MiLCJzdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9pdGVtMSIsInN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2l0ZW0yIiwic3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25faXRlbTMiLCJzdF90b29sdGlwX25vdGUiLCJzdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl93YXJuaW5nIiwiZWFjaCIsImluZGV4IiwiZWxlbWVudCIsImZpZWxkTmFtZSIsImNvbnRlbnQiLCJwb3NpdGlvbiIsImhvdmVyYWJsZSIsImRlbGF5IiwidmFyaWF0aW9uIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwiY2JBZnRlclNlbmRGb3JtIiwic3VjY2VzcyIsImFwaVNldHRpbmdzIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsWUFBWSxHQUFHO0FBQ2pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMscUJBQUQsQ0FOTTs7QUFRakI7QUFDSjtBQUNBO0FBQ0E7QUFD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QUNIO0FBcmlCZ0IsQ0FBckIsQyxDQXdpQkE7O0FBQ0FSLENBQUMsQ0FBQzBGLFFBQUQsQ0FBRCxDQUFZdUcsS0FBWixDQUFrQixZQUFNO0FBQ3BCbk0sRUFBQUEsWUFBWSxDQUFDVSxVQUFiO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFN0b3JhZ2VBUEksIFVzZXJNZXNzYWdlLCBzM1N0b3JhZ2VJbmRleCwgJCAqL1xuXG4vKipcbiAqIFN0b3JhZ2UgbWFuYWdlbWVudCBtb2R1bGVcbiAqL1xuY29uc3Qgc3RvcmFnZUluZGV4ID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBsb2NhbCBzdG9yYWdlIGZvcm0gKFRhYiAyKS5cbiAgICAgKiBTZW5kcyBkYXRhIHRvOiBQQVRDSCAvcGJ4Y29yZS9hcGkvdjMvc3RvcmFnZVxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNsb2NhbC1zdG9yYWdlLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBzdWJtaXQgYnV0dG9uICh1bmlxdWUgdG8gdGhpcyBmb3JtKS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzdWJtaXRCdXR0b246ICQoJyNzdWJtaXRidXR0b24tbG9jYWwnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBkcm9wZG93biBzdWJtaXQgKHVuaXF1ZSB0byB0aGlzIGZvcm0pLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRyb3Bkb3duU3VibWl0OiAkKCcjZHJvcGRvd25TdWJtaXQtbG9jYWwnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBkaXJ0eSBmaWVsZCAodW5pcXVlIHRvIHRoaXMgZm9ybSkuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGlycnR5RmllbGQ6ICQoJyNkaXJydHktbG9jYWwnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSByZWNvcmRzIHJldGVudGlvbiBwZXJpb2Qgc2xpZGVyLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHJlY29yZHNTYXZlUGVyaW9kU2xpZGVyOiAkKCcjUEJYUmVjb3JkU2F2ZVBlcmlvZFNsaWRlcicpLFxuXG5cbiAgICAvKipcbiAgICAgKiBQb3NzaWJsZSBwZXJpb2QgdmFsdWVzIGZvciB0aGUgcmVjb3JkcyByZXRlbnRpb24uXG4gICAgICogVmFsdWVzIGluIGRheXM6IDMwLCA5MCwgMTgwLCAzNjAsIDEwODAsICcnIChpbmZpbml0eSlcbiAgICAgKi9cbiAgICBzYXZlUmVjb3Jkc1BlcmlvZDogWyczMCcsICc5MCcsICcxODAnLCAnMzYwJywgJzEwODAnLCAnJ10sXG5cblxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGxvY2FsIHN0b3JhZ2UgZm9ybS5cbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHt9LFxuXG4gICAgLyoqXG4gICAgICogUGVyLXByZXNldCBub3RlIGFwcGVuZGVkIHRvIHRoZSBzM19lbmRwb2ludCBmaWVsZCB0b29sdGlwLiBVcGRhdGVkXG4gICAgICogYnkgc2V0UzNFbmRwb2ludFByZXNldE5vdGUoKSBlYWNoIHRpbWUgdGhlIG9wZXJhdG9yIHBpY2tzIGEgZGlmZmVyZW50XG4gICAgICogcHJvdmlkZXIgcHJlc2V0OyByZW5kZXJlZCBhcyB0aGUgYG5vdGVgIHNsb3Qgb2YgdGhlIHMzX2VuZHBvaW50XG4gICAgICogdG9vbHRpcCBjb25maWcgc28gYWxsIHBlci1maWVsZCBoaW50cyBzdGF5IGluIG9uZSBwbGFjZS5cbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIHMzRW5kcG9pbnRQcmVzZXROb3RlOiAnJyxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIG1vZHVsZSB3aXRoIGV2ZW50IGJpbmRpbmdzIGFuZCBjb21wb25lbnQgaW5pdGlhbGl6YXRpb25zLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEVuYWJsZSB0YWIgbmF2aWdhdGlvblxuICAgICAgICAkKCcjc3RvcmFnZS1tZW51JykuZmluZCgnLml0ZW0nKS50YWIoe1xuICAgICAgICAgICAgICAgIGhpc3Rvcnk6IHRydWUsXG4gICAgICAgICAgICAgICAgaGlzdG9yeVR5cGU6ICdoYXNoJyxcbiAgICAgICAgICAgICAgICAgICBvblZpc2libGU6IGZ1bmN0aW9uKHRhYlBhdGgpIHtcbiAgICAgICAgICAgICAgICAvLyBMb2FkIHN0b3JhZ2UgZGF0YSB3aGVuIHN0b3JhZ2UgaW5mbyB0YWIgaXMgYWN0aXZhdGVkXG4gICAgICAgICAgICAgICAgaWYgKHRhYlBhdGggPT09ICdzdG9yYWdlLWluZm8nKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0b3JhZ2VJbmRleC5sb2FkU3RvcmFnZURhdGEoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBsb2NhbCBzdG9yYWdlIGZvcm0gd2hlbiB0YWIgYmVjb21lcyB2aXNpYmxlXG4gICAgICAgICAgICAgICAgaWYgKHRhYlBhdGggPT09ICdzdG9yYWdlLWxvY2FsJykge1xuICAgICAgICAgICAgICAgICAgICBzdG9yYWdlSW5kZXguaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBTMyBmb3JtIHdoZW4gY2xvdWQgdGFiIGJlY29tZXMgdmlzaWJsZVxuICAgICAgICAgICAgICAgIGlmICh0YWJQYXRoID09PSAnc3RvcmFnZS1jbG91ZCcgJiYgdHlwZW9mIHMzU3RvcmFnZUluZGV4ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgcmVjb3JkcyBzYXZlIHBlcmlvZCBzbGlkZXJcbiAgICAgICAgc3RvcmFnZUluZGV4LiRyZWNvcmRzU2F2ZVBlcmlvZFNsaWRlclxuICAgICAgICAgICAgLnNsaWRlcih7XG4gICAgICAgICAgICAgICAgbWluOiAwLFxuICAgICAgICAgICAgICAgIG1heDogNSxcbiAgICAgICAgICAgICAgICBzdGVwOiAxLFxuICAgICAgICAgICAgICAgIHNtb290aDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBhdXRvQWRqdXN0TGFiZWxzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBpbnRlcnByZXRMYWJlbDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxhYmVscyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIDA6IGdsb2JhbFRyYW5zbGF0ZS5zdF9TdG9yZTFNb250aE9mUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIDE6IGdsb2JhbFRyYW5zbGF0ZS5zdF9TdG9yZTNNb250aHNPZlJlY29yZHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAyOiBnbG9iYWxUcmFuc2xhdGUuc3RfU3RvcmU2TW9udGhzT2ZSZWNvcmRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgMzogZ2xvYmFsVHJhbnNsYXRlLnN0X1N0b3JlMVllYXJPZlJlY29yZHMsXG4gICAgICAgICAgICAgICAgICAgICAgICA0OiBnbG9iYWxUcmFuc2xhdGUuc3RfU3RvcmUzWWVhcnNPZlJlY29yZHMsXG4gICAgICAgICAgICAgICAgICAgICAgICA1OiBnbG9iYWxUcmFuc2xhdGUuc3RfU3RvcmVBbGxQb3NzaWJsZVJlY29yZHMsXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsYWJlbHNbdmFsdWVdIHx8ICcnO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6IHN0b3JhZ2VJbmRleC5jYkFmdGVyU2VsZWN0U2F2ZVBlcmlvZFNsaWRlcixcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHNcbiAgICAgICAgc3RvcmFnZUluZGV4LmluaXRpYWxpemVUb29sdGlwcygpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGZvcm1cbiAgICAgICAgc3RvcmFnZUluZGV4LmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gTG9hZCBzZXR0aW5ncyBmcm9tIEFQSVxuICAgICAgICBzdG9yYWdlSW5kZXgubG9hZFNldHRpbmdzKCk7XG5cbiAgICAgICAgLy8gTG9hZCBzdG9yYWdlIGRhdGEgb24gcGFnZSBsb2FkXG4gICAgICAgIHN0b3JhZ2VJbmRleC5sb2FkU3RvcmFnZURhdGEoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBldmVudCBhZnRlciB0aGUgc2VsZWN0IHNhdmUgcGVyaW9kIHNsaWRlciBpcyBjaGFuZ2VkLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB2YWx1ZSAtIFRoZSBzZWxlY3RlZCB2YWx1ZSBmcm9tIHRoZSBzbGlkZXIuXG4gICAgICovXG4gICAgY2JBZnRlclNlbGVjdFNhdmVQZXJpb2RTbGlkZXIodmFsdWUpIHtcbiAgICAgICAgLy8gR2V0IHRoZSBzYXZlIHBlcmlvZCBjb3JyZXNwb25kaW5nIHRvIHRoZSBzbGlkZXIgdmFsdWUuXG4gICAgICAgIGNvbnN0IHNhdmVQZXJpb2QgPSBzdG9yYWdlSW5kZXguc2F2ZVJlY29yZHNQZXJpb2RbdmFsdWVdO1xuXG4gICAgICAgIC8vIFNldCB0aGUgZm9ybSB2YWx1ZSBmb3IgJ1BCWFJlY29yZFNhdmVQZXJpb2QnIHRvIHRoZSBzZWxlY3RlZCBzYXZlIHBlcmlvZC5cbiAgICAgICAgc3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdQQlhSZWNvcmRTYXZlUGVyaW9kJywgc2F2ZVBlcmlvZCk7XG5cbiAgICAgICAgLy8gVXBkYXRlIFMzIGxvY2FsIHJldGVudGlvbiBzbGlkZXIgbWF4aW11bSAoaWYgUzMgbW9kdWxlIGxvYWRlZClcbiAgICAgICAgaWYgKHR5cGVvZiBzM1N0b3JhZ2VJbmRleCAhPT0gJ3VuZGVmaW5lZCcgJiYgczNTdG9yYWdlSW5kZXgudXBkYXRlU2xpZGVyTGltaXRzKSB7XG4gICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC51cGRhdGVTbGlkZXJMaW1pdHMoc2F2ZVBlcmlvZCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUcmlnZ2VyIGNoYW5nZSBldmVudCB0byBhY2tub3dsZWRnZSB0aGUgbW9kaWZpY2F0aW9uXG4gICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIFN0b3JhZ2Ugc2V0dGluZ3MgZnJvbSBBUElcbiAgICAgKi9cbiAgICBsb2FkU2V0dGluZ3MoKSB7XG4gICAgICAgIFN0b3JhZ2VBUEkuZ2V0KChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgZm9ybSB2YWx1ZXMgZm9yIGxvY2FsIHN0b3JhZ2Ugb25seVxuICAgICAgICAgICAgICAgIHN0b3JhZ2VJbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWVzJywge1xuICAgICAgICAgICAgICAgICAgICBQQlhSZWNvcmRTYXZlUGVyaW9kOiBkYXRhLlBCWFJlY29yZFNhdmVQZXJpb2QgfHwgJydcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB0b3RhbCByZXRlbnRpb24gcGVyaW9kIHNsaWRlclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlY29yZFNhdmVQZXJpb2QgPSBkYXRhLlBCWFJlY29yZFNhdmVQZXJpb2QgfHwgJyc7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2xpZGVySW5kZXggPSBzdG9yYWdlSW5kZXguc2F2ZVJlY29yZHNQZXJpb2QuaW5kZXhPZihyZWNvcmRTYXZlUGVyaW9kKTtcbiAgICAgICAgICAgICAgICBzdG9yYWdlSW5kZXguJHJlY29yZHNTYXZlUGVyaW9kU2xpZGVyLnNsaWRlcihcbiAgICAgICAgICAgICAgICAgICAgJ3NldCB2YWx1ZScsXG4gICAgICAgICAgICAgICAgICAgIHNsaWRlckluZGV4LFxuICAgICAgICAgICAgICAgICAgICBmYWxzZVxuICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICAvLyBOb3RpZnkgUzMgbW9kdWxlIGFib3V0IHRvdGFsIHJldGVudGlvbiBjaGFuZ2UgKGlmIGxvYWRlZClcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHMzU3RvcmFnZUluZGV4ICE9PSAndW5kZWZpbmVkJyAmJiBzM1N0b3JhZ2VJbmRleC51cGRhdGVTbGlkZXJMaW1pdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXgudXBkYXRlU2xpZGVyTGltaXRzKHJlY29yZFNhdmVQZXJpb2QpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBMb2FkIHN0b3JhZ2UgdXNhZ2UgZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIGxvYWRTdG9yYWdlRGF0YSgpIHtcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgICQoJyNzdG9yYWdlLXVzYWdlLWNvbnRhaW5lciAuZGltbWVyJykuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAkKCcjc3RvcmFnZS1kZXRhaWxzJykuaGlkZSgpO1xuXG4gICAgICAgIC8vIE1ha2UgQVBJIGNhbGwgdG8gZ2V0IHN0b3JhZ2UgdXNhZ2UgdXNpbmcgbmV3IFN0b3JhZ2VBUElcbiAgICAgICAgU3RvcmFnZUFQSS5nZXRVc2FnZSgocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIHN0b3JhZ2VJbmRleC5yZW5kZXJTdG9yYWdlRGF0YShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJCgnI3N0b3JhZ2UtdXNhZ2UtY29udGFpbmVyIC5kaW1tZXInKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS5zdF9TdG9yYWdlTG9hZEVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZW5kZXIgc3RvcmFnZSB1c2FnZSBkYXRhIGluIHRoZSBVSVxuICAgICAqL1xuICAgIHJlbmRlclN0b3JhZ2VEYXRhKGRhdGEpIHtcbiAgICAgICAgLy8gSGlkZSBsb2FkaW5nIGFuZCBzaG93IGRldGFpbHNcbiAgICAgICAgJCgnI3N0b3JhZ2UtdXNhZ2UtY29udGFpbmVyIC5kaW1tZXInKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICQoJyNzdG9yYWdlLWRldGFpbHMnKS5zaG93KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBGb3JtYXQgc2l6ZSBmb3IgZGlzcGxheVxuICAgICAgICBjb25zdCBmb3JtYXRTaXplID0gKHNpemVJbk1iKSA9PiB7XG4gICAgICAgICAgICBpZiAoc2l6ZUluTWIgPj0gMTAyNCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoc2l6ZUluTWIgLyAxMDI0KS50b0ZpeGVkKDEpICsgJyBHQic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gc2l6ZUluTWIudG9GaXhlZCgxKSArICcgTUInO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGhlYWRlciBpbmZvcm1hdGlvblxuICAgICAgICAkKCcjdXNlZC1zcGFjZS10ZXh0JykudGV4dChmb3JtYXRTaXplKGRhdGEudXNlZF9zcGFjZSkpO1xuICAgICAgICAkKCcjdG90YWwtc2l6ZS10ZXh0JykudGV4dChmb3JtYXRTaXplKGRhdGEudG90YWxfc2l6ZSkpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHByb2dyZXNzIHNlZ21lbnRzIGluIG1hY09TIHN0eWxlXG4gICAgICAgIGxldCBhY2N1bXVsYXRlZFdpZHRoID0gMDtcbiAgICAgICAgXG4gICAgICAgIC8vIFByb2Nlc3MgZWFjaCBjYXRlZ29yeVxuICAgICAgICBbJ2NhbGxfcmVjb3JkaW5ncycsICdjZHJfZGF0YWJhc2UnLCAnc3lzdGVtX2xvZ3MnLCAnbW9kdWxlcycsICdiYWNrdXBzJywgJ3N5c3RlbV9jYWNoZXMnLCAnczNfY2FjaGUnLCAnb3RoZXInXS5mb3JFYWNoKGNhdGVnb3J5ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNhdERhdGEgPSBkYXRhLmNhdGVnb3JpZXNbY2F0ZWdvcnldO1xuICAgICAgICAgICAgY29uc3QgJHNlZ21lbnQgPSAkKGAucHJvZ3Jlc3Mtc2VnbWVudFtkYXRhLWNhdGVnb3J5PVwiJHtjYXRlZ29yeX1cIl1gKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGNhdERhdGEgJiYgY2F0RGF0YS5wZXJjZW50YWdlID4gMCkge1xuICAgICAgICAgICAgICAgICRzZWdtZW50LmNzcygnd2lkdGgnLCBjYXREYXRhLnBlcmNlbnRhZ2UgKyAnJScpLnNob3coKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBZGQgaG92ZXIgdG9vbHRpcFxuICAgICAgICAgICAgICAgIGNvbnN0IGNhdGVnb3J5S2V5ID0gJ3N0X0NhdGVnb3J5JyArIGNhdGVnb3J5LnNwbGl0KCdfJykubWFwKHdvcmQgPT4gd29yZC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHdvcmQuc2xpY2UoMSkpLmpvaW4oJycpO1xuICAgICAgICAgICAgICAgICRzZWdtZW50LmF0dHIoJ3RpdGxlJywgYCR7Z2xvYmFsVHJhbnNsYXRlW2NhdGVnb3J5S2V5XSB8fCBjYXRlZ29yeX06ICR7Zm9ybWF0U2l6ZShjYXREYXRhLnNpemUpfSAoJHtjYXREYXRhLnBlcmNlbnRhZ2V9JSlgKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBhY2N1bXVsYXRlZFdpZHRoICs9IGNhdERhdGEucGVyY2VudGFnZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHNlZ21lbnQuaGlkZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgY2F0ZWdvcnkgc2l6ZSBpbiBsaXN0XG4gICAgICAgICAgICAkKGAjJHtjYXRlZ29yeX0tc2l6ZWApLnRleHQoZm9ybWF0U2l6ZShjYXREYXRhID8gY2F0RGF0YS5zaXplIDogMCkpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEJpbmQgaG92ZXIgZWZmZWN0cyBvbmx5IG9uY2UgKG5vdCBvbiBldmVyeSBkYXRhIHJlZnJlc2gpXG4gICAgICAgIGlmICghc3RvcmFnZUluZGV4Ll9ob3ZlckJvdW5kKSB7XG4gICAgICAgICAgICBzdG9yYWdlSW5kZXguX2hvdmVyQm91bmQgPSB0cnVlO1xuXG4gICAgICAgICAgICAvLyBUb29sdGlwIGZvciBwcm9ncmVzcyBzZWdtZW50c1xuICAgICAgICAgICAgJCgnI3N0b3JhZ2UtcHJvZ3Jlc3MnKS5vbignbW91c2VlbnRlcicsICcucHJvZ3Jlc3Mtc2VnbWVudCcsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdG9vbHRpcCA9ICQoJzxkaXYgY2xhc3M9XCJzdG9yYWdlLXRvb2x0aXBcIj48L2Rpdj4nKS50ZXh0KCQodGhpcykuYXR0cigndGl0bGUnKSk7XG4gICAgICAgICAgICAgICAgJCgnYm9keScpLmFwcGVuZCh0b29sdGlwKTtcbiAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS5vbignbW91c2Vtb3ZlLnRvb2x0aXAnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgICAgICAgICAgdG9vbHRpcC5jc3MoeyBsZWZ0OiBldi5wYWdlWCArIDEwLCB0b3A6IGV2LnBhZ2VZIC0gMzAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS5vbignbW91c2VsZWF2ZScsICcucHJvZ3Jlc3Mtc2VnbWVudCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAkKCcuc3RvcmFnZS10b29sdGlwJykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgJChkb2N1bWVudCkub2ZmKCdtb3VzZW1vdmUudG9vbHRpcCcpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIEhpZ2hsaWdodCBtYXRjaGluZyBwcm9ncmVzcyBzZWdtZW50IG9uIGNhdGVnb3J5IGxpc3QgaG92ZXIgdmlhIENTUyBjbGFzc1xuICAgICAgICAgICAgJCgnLmNhdGVnb3J5LWl0ZW0nKS5vbignbW91c2VlbnRlcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjYXRlZ29yeSA9ICQodGhpcykuZGF0YSgnY2F0ZWdvcnknKTtcbiAgICAgICAgICAgICAgICAkKGAucHJvZ3Jlc3Mtc2VnbWVudFtkYXRhLWNhdGVnb3J5PVwiJHtjYXRlZ29yeX1cIl1gKS5hZGRDbGFzcygnaGlnaGxpZ2h0ZWQnKTtcbiAgICAgICAgICAgIH0pLm9uKCdtb3VzZWxlYXZlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICQoJy5wcm9ncmVzcy1zZWdtZW50JykucmVtb3ZlQ2xhc3MoJ2hpZ2hsaWdodGVkJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlbmRlciByZW1vdGUgc3RvcmFnZSBpbmZvIChTMylcbiAgICAgICAgaWYgKGRhdGEucmVtb3RlX3N0b3JhZ2UgJiYgZGF0YS5yZW1vdGVfc3RvcmFnZS5zMyAmJiBkYXRhLnJlbW90ZV9zdG9yYWdlLnMzLmVuYWJsZWQgJiYgZGF0YS5yZW1vdGVfc3RvcmFnZS5zMy5zaXplID4gMCkge1xuICAgICAgICAgICAgY29uc3QgczMgPSBkYXRhLnJlbW90ZV9zdG9yYWdlLnMzO1xuICAgICAgICAgICAgJCgnI3JlbW90ZS1zdG9yYWdlLXRpdGxlJykudGV4dChnbG9iYWxUcmFuc2xhdGUuc3RfUzNSZW1vdGVTdG9yYWdlVGl0bGUpO1xuICAgICAgICAgICAgJCgnI3JlbW90ZS1zdG9yYWdlLWRldGFpbHMnKS50ZXh0KFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF9TM1JlbW90ZVN0b3JhZ2VJbmZvXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKCclZmlsZXMlJywgczMuZmlsZXNfY291bnQudG9Mb2NhbGVTdHJpbmcoKSlcbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoJyVzaXplJScsIGZvcm1hdFNpemUoczMuc2l6ZSkpXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKCclYnVja2V0JScsIHMzLmJ1Y2tldClcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICAkKCcjcmVtb3RlLXN0b3JhZ2Utc2VjdGlvbicpLnNob3coKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQnVpbGQgSFRNTCBjb250ZW50IGZvciB0b29sdGlwIHBvcHVwXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZyAtIFRvb2x0aXAgY29uZmlndXJhdGlvbiBvYmplY3RcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIHN0cmluZyBmb3IgcG9wdXAgY29udGVudFxuICAgICAqL1xuICAgIGJ1aWxkVG9vbHRpcENvbnRlbnQoY29uZmlnKSB7XG4gICAgICAgIGxldCBodG1sID0gJzxkaXYgY2xhc3M9XCJ1aSByZWxheGVkIGxpc3RcIj4nO1xuXG4gICAgICAgIC8vIEhlYWRlclxuICAgICAgICBpZiAoY29uZmlnLmhlYWRlcikge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj48c3Ryb25nPiR7Y29uZmlnLmhlYWRlcn08L3N0cm9uZz48L2Rpdj5gO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRGVzY3JpcHRpb25cbiAgICAgICAgaWYgKGNvbmZpZy5kZXNjcmlwdGlvbikge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj4ke2NvbmZpZy5kZXNjcmlwdGlvbn08L2Rpdj5gO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTWFpbiBsaXN0XG4gICAgICAgIGlmIChjb25maWcubGlzdCAmJiBjb25maWcubGlzdC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiaXRlbVwiPjx1bCBjbGFzcz1cInVpIGxpc3RcIj4nO1xuICAgICAgICAgICAgY29uZmlnLmxpc3QuZm9yRWFjaChpdGVtID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT4ke2l0ZW19PC9saT5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXRlbS50ZXJtICYmIGl0ZW0uZGVmaW5pdGlvbiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTZWN0aW9uIGhlYWRlclxuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8L3VsPjxzdHJvbmc+JHtpdGVtLnRlcm19PC9zdHJvbmc+PHVsIGNsYXNzPVwidWkgbGlzdFwiPmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpdGVtLnRlcm0gJiYgaXRlbS5kZWZpbml0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRlcm0gd2l0aCBkZWZpbml0aW9uXG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT48c3Ryb25nPiR7aXRlbS50ZXJtfTo8L3N0cm9uZz4gJHtpdGVtLmRlZmluaXRpb259PC9saT5gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaHRtbCArPSAnPC91bD48L2Rpdj4nO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkaXRpb25hbCBsaXN0cyAobGlzdDItbGlzdDEwKVxuICAgICAgICBmb3IgKGxldCBpID0gMjsgaSA8PSAxMDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBsaXN0S2V5ID0gYGxpc3Qke2l9YDtcbiAgICAgICAgICAgIGlmIChjb25maWdbbGlzdEtleV0gJiYgY29uZmlnW2xpc3RLZXldLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiaXRlbVwiPjx1bCBjbGFzcz1cInVpIGxpc3RcIj4nO1xuICAgICAgICAgICAgICAgIGNvbmZpZ1tsaXN0S2V5XS5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+JHtpdGVtfTwvbGk+YDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzwvdWw+PC9kaXY+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFdhcm5pbmdcbiAgICAgICAgaWYgKGNvbmZpZy53YXJuaW5nKSB7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiaXRlbVwiPjxkaXYgY2xhc3M9XCJ1aSBvcmFuZ2UgbWVzc2FnZVwiPic7XG4gICAgICAgICAgICBpZiAoY29uZmlnLndhcm5pbmcuaGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Y29uZmlnLndhcm5pbmcuaGVhZGVyfTwvZGl2PmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoY29uZmlnLndhcm5pbmcudGV4dCkge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxwPiR7Y29uZmlnLndhcm5pbmcudGV4dH08L3A+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2PjwvZGl2Pic7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBFeGFtcGxlc1xuICAgICAgICBpZiAoY29uZmlnLmV4YW1wbGVzICYmIGNvbmZpZy5leGFtcGxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpZiAoY29uZmlnLmV4YW1wbGVzSGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj48c3Ryb25nPiR7Y29uZmlnLmV4YW1wbGVzSGVhZGVyfTwvc3Ryb25nPjwvZGl2PmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiaXRlbVwiPjxwcmUgc3R5bGU9XCJiYWNrZ3JvdW5kOiNmNGY0ZjQ7cGFkZGluZzoxMHB4O2JvcmRlci1yYWRpdXM6NHB4O1wiPic7XG4gICAgICAgICAgICBodG1sICs9IGNvbmZpZy5leGFtcGxlcy5qb2luKCdcXG4nKTtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvcHJlPjwvZGl2Pic7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBOb3RlXG4gICAgICAgIGlmIChjb25maWcubm90ZSkge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj48ZW0+JHtjb25maWcubm90ZX08L2VtPjwvZGl2PmA7XG4gICAgICAgIH1cblxuICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQnVpbGQgdGhlIHMzX2VuZHBvaW50IHRvb2x0aXAgSFRNTCwgd2VhdmluZyBpbiB0aGUgY3VycmVudFxuICAgICAqIHBlci1wcmVzZXQgbm90ZSAoaWYgYW55KSBhcyB0aGUgdHJhaWxpbmcgYG5vdGVgIHNsb3QuIExpdmVzIGluIGl0c1xuICAgICAqIG93biBtZXRob2Qgc28gc2V0UzNFbmRwb2ludFByZXNldE5vdGUoKSBjYW4gcmVidWlsZCB0aGUgY29udGVudCBvblxuICAgICAqIHRoZSBmbHkgd2l0aG91dCByZS1ydW5uaW5nIHRoZSByZXN0IG9mIHRoZSB0b29sdGlwIG1hY2hpbmVyeS5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUxcbiAgICAgKi9cbiAgICBidWlsZFMzRW5kcG9pbnRUb29sdGlwQ29udGVudCgpIHtcbiAgICAgICAgcmV0dXJuIHN0b3JhZ2VJbmRleC5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfZW5kcG9pbnRfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2VuZHBvaW50X2Rlc2MsXG4gICAgICAgICAgICBleGFtcGxlczogW1xuICAgICAgICAgICAgICAgICdBV1MgUzM6IGh0dHBzOi8vczMuYXAtc291dGhlYXN0LTEuYW1hem9uYXdzLmNvbScsXG4gICAgICAgICAgICAgICAgJ1lhbmRleCBDbG91ZDogaHR0cHM6Ly9zdG9yYWdlLnlhbmRleGNsb3VkLm5ldCcsXG4gICAgICAgICAgICAgICAgJ1ZLIENsb3VkOiBodHRwczovL2hiLmt6LWFzdC52a2Nsb3VkLXN0b3JhZ2UucnUnLFxuICAgICAgICAgICAgICAgICdDbG91ZGZsYXJlIFIyOiBodHRwczovLzxBQ0NPVU5UX0lEPi5yMi5jbG91ZGZsYXJlc3RvcmFnZS5jb20nLFxuICAgICAgICAgICAgICAgICdEaWdpdGFsT2NlYW46IGh0dHBzOi8vc2dwMS5kaWdpdGFsb2NlYW5zcGFjZXMuY29tJyxcbiAgICAgICAgICAgICAgICAnTWluSU86IGh0dHA6Ly9taW5pby5leGFtcGxlLmNvbTo5MDAwJyxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBleGFtcGxlc0hlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfZXhhbXBsZXMsXG4gICAgICAgICAgICBub3RlOiBzdG9yYWdlSW5kZXguczNFbmRwb2ludFByZXNldE5vdGUgfHwgbnVsbCxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0aGUgcGVyLXByZXNldCBub3RlIHRoYXQgdGhlIHMzX2VuZHBvaW50IHRvb2x0aXAgY2FycmllcyBhbmRcbiAgICAgKiBwdXNoIHRoZSByZWJ1aWx0IEhUTUwgaW50byB0aGUgbGl2ZSBGb21hbnRpYyBwb3B1cC4gQ2FsbGVkIGZyb21cbiAgICAgKiBzMy1zdG9yYWdlLWluZGV4LmpzIHdoZW5ldmVyIHRoZSBwcm92aWRlciBwcmVzZXQgY2hhbmdlcyBzbyB0aGVcbiAgICAgKiBwcmVzZXQtc3BlY2lmaWMgZ3VpZGFuY2UgbGl2ZXMgbmV4dCB0byB0aGUgZmllbGQgaXQgYWN0dWFsbHlcbiAgICAgKiBhZmZlY3RzIChubyBzZXBhcmF0ZSBoaW50IGJhbm5lciBuZWVkZWQpLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHRcbiAgICAgKi9cbiAgICBzZXRTM0VuZHBvaW50UHJlc2V0Tm90ZSh0ZXh0KSB7XG4gICAgICAgIHN0b3JhZ2VJbmRleC5zM0VuZHBvaW50UHJlc2V0Tm90ZSA9IHRleHQgfHwgJyc7XG4gICAgICAgIGNvbnN0ICRpY29uID0gJCgnLmZpZWxkLWluZm8taWNvbltkYXRhLWZpZWxkPVwiczNfZW5kcG9pbnRcIl0nKTtcbiAgICAgICAgaWYgKCRpY29uLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIElmIHRoZSBwb3B1cCBoYXNuJ3QgYmVlbiBpbml0aWFsaXNlZCB5ZXQgKGUuZy4gY2xvdWQgdGFiIG5vdFxuICAgICAgICAvLyB2aXNpdGVkIHlldCksIGRvIG5vdGhpbmcgZXh0cmEg4oCUIGluaXRpYWxpemVUb29sdGlwcygpIHdpbGwgcGlja1xuICAgICAgICAvLyB1cCB0aGUgbmV3IHN0YXRlIHZpYSBidWlsZFMzRW5kcG9pbnRUb29sdGlwQ29udGVudCgpIG9uIGZpcnN0XG4gICAgICAgIC8vIGluaXQuIEF2b2lkcyBhIGRlc3Ryb3kvcmVpbml0IHJhY2UgdGhhdCB3b3VsZCBvdGhlcndpc2Ugd2lwZVxuICAgICAgICAvLyB0aGUgZHluYW1pYyBub3RlIHdoZW4gaW5pdGlhbGl6ZVRvb2x0aXBzKCkgcnVucyBsYXRlci5cbiAgICAgICAgaWYgKCRpY29uLnBvcHVwKCdleGlzdHMnKSkge1xuICAgICAgICAgICAgJGljb24ucG9wdXAoJ2NoYW5nZSBjb250ZW50Jywgc3RvcmFnZUluZGV4LmJ1aWxkUzNFbmRwb2ludFRvb2x0aXBDb250ZW50KCkpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRvb2x0aXBzKCkge1xuICAgICAgICAvLyBUb29sdGlwIGNvbmZpZ3VyYXRpb25zIGZvciBlYWNoIGZpZWxkXG4gICAgICAgIGNvbnN0IHRvb2x0aXBDb25maWdzID0ge1xuICAgICAgICAgICAgcmVjb3JkX3JldGVudGlvbl9wZXJpb2Q6IHN0b3JhZ2VJbmRleC5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2l0ZW0xLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2l0ZW0yLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2l0ZW0zLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2l0ZW00XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl93YXJuaW5nX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl93YXJuaW5nXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgIHMzX2VuYWJsZWQ6IHN0b3JhZ2VJbmRleC5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2VuYWJsZWRfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19lbmFibGVkX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19lbmFibGVkX2l0ZW0xLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19lbmFibGVkX2l0ZW0yLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19lbmFibGVkX2l0ZW0zXG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgIHMzX3Byb3ZpZGVyX3ByZXNldDogc3RvcmFnZUluZGV4LmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfcHJlc2V0X2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfcHJlc2V0X2Rlc2MsXG4gICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgczNfZW5kcG9pbnQ6IHN0b3JhZ2VJbmRleC5idWlsZFMzRW5kcG9pbnRUb29sdGlwQ29udGVudCgpLFxuXG4gICAgICAgICAgICBzM19yZWdpb246IHN0b3JhZ2VJbmRleC5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX3JlZ2lvbl9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX3JlZ2lvbl9kZXNjLFxuICAgICAgICAgICAgICAgIGV4YW1wbGVzOiBbXG4gICAgICAgICAgICAgICAgICAgICd1cy1lYXN0LTEgKGRlZmF1bHQpJyxcbiAgICAgICAgICAgICAgICAgICAgJ2V1LXdlc3QtMScsXG4gICAgICAgICAgICAgICAgICAgICdhcC1zb3V0aGVhc3QtMSdcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX3JlZ2lvbl9ub3RlXG4gICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgczNfYnVja2V0OiBzdG9yYWdlSW5kZXguYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19idWNrZXRfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19idWNrZXRfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2J1Y2tldF9pdGVtMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfYnVja2V0X2l0ZW0yLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19idWNrZXRfaXRlbTNcbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgczNfYWNjZXNzX2tleTogc3RvcmFnZUluZGV4LmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfYWNjZXNzX2tleV9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2FjY2Vzc19rZXlfZGVzYyxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19hY2Nlc3Nfa2V5X25vdGVcbiAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICBzM19zZWNyZXRfa2V5OiBzdG9yYWdlSW5kZXguYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19zZWNyZXRfa2V5X2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfc2VjcmV0X2tleV9kZXNjLFxuICAgICAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF93YXJuaW5nLFxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19zZWNyZXRfa2V5X3dhcm5pbmdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgbG9jYWxfcmV0ZW50aW9uX3BlcmlvZDogc3RvcmFnZUluZGV4LmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25faXRlbTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9pdGVtMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2l0ZW0zXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfbm90ZSxcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX3dhcm5pbmdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgcG9wdXAgZm9yIGVhY2ggdG9vbHRpcCBpY29uXG4gICAgICAgICQoJy5maWVsZC1pbmZvLWljb24nKS5lYWNoKChpbmRleCwgZWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGljb24gPSAkKGVsZW1lbnQpO1xuICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0gJGljb24uZGF0YSgnZmllbGQnKTtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSB0b29sdGlwQ29uZmlnc1tmaWVsZE5hbWVdO1xuXG4gICAgICAgICAgICBpZiAoY29udGVudCkge1xuICAgICAgICAgICAgICAgICRpY29uLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbDogY29udGVudCxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnLFxuICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRlbGF5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaG93OiAzMDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBoaWRlOiAxMDBcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgdmFyaWF0aW9uOiAnZmxvd2luZydcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gc3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAoIXJlc3BvbnNlLnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gc3RvcmFnZUluZGV4LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24gPSBzdG9yYWdlSW5kZXguJHN1Ym1pdEJ1dHRvbjtcbiAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQgPSBzdG9yYWdlSW5kZXguJGRyb3Bkb3duU3VibWl0O1xuICAgICAgICBGb3JtLiRkaXJydHlGaWVsZCA9IHN0b3JhZ2VJbmRleC4kZGlycnR5RmllbGQ7XG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IHN0b3JhZ2VJbmRleC52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBzdG9yYWdlSW5kZXguY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBzdG9yYWdlSW5kZXguY2JBZnRlclNlbmRGb3JtO1xuXG4gICAgICAgIC8vIENvbmZpZ3VyZSBSRVNUIEFQSSBzZXR0aW5ncyBmb3IgRm9ybS5qcyAoc2luZ2xldG9uIHJlc291cmNlKVxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzID0ge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGFwaU9iamVjdDogU3RvcmFnZUFQSSxcbiAgICAgICAgICAgIHNhdmVNZXRob2Q6ICd1cGRhdGUnIC8vIFVzaW5nIHN0YW5kYXJkIFBVVCBmb3Igc2luZ2xldG9uIHVwZGF0ZVxuICAgICAgICB9O1xuXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH1cbn07XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBzdG9yYWdlIG1hbmFnZW1lbnQgaW50ZXJmYWNlLlxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIHN0b3JhZ2VJbmRleC5pbml0aWFsaXplKCk7XG59KTsiXX0=