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
   * Sends data to: PATCH /pbxcore/api/v3/storage.
   * Resolved in initialize() — must not call $() at module-load time.
   * @type {jQuery}
   */
  $formObj: null,

  /**
   * jQuery object for the submit button (unique to this form).
   * @type {jQuery}
   */
  $submitButton: null,

  /**
   * jQuery object for the dropdown submit (unique to this form).
   * @type {jQuery}
   */
  $dropdownSubmit: null,

  /**
   * jQuery object for the dirty field (unique to this form).
   * @type {jQuery}
   */
  $dirrtyField: null,

  /**
   * jQuery object for the records retention period slider.
   * @type {jQuery}
   */
  $recordsSavePeriodSlider: null,

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
    storageIndex.$formObj = $('#local-storage-form');
    storageIndex.$submitButton = $('#submitbutton-local');
    storageIndex.$dropdownSubmit = $('#dropdownSubmit-local');
    storageIndex.$dirrtyField = $('#dirrty-local');
    storageIndex.$recordsSavePeriodSlider = $('#PBXRecordSavePeriodSlider'); // Enable tab navigation

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TdG9yYWdlL3N0b3JhZ2UtaW5kZXguanMiXSwibmFtZXMiOlsic3RvcmFnZUluZGV4IiwiJGZvcm1PYmoiLCIkc3VibWl0QnV0dG9uIiwiJGRyb3Bkb3duU3VibWl0IiwiJGRpcnJ0eUZpZWxkIiwiJHJlY29yZHNTYXZlUGVyaW9kU2xpZGVyIiwic2F2ZVJlY29yZHNQZXJpb2QiLCJ2YWxpZGF0ZVJ1bGVzIiwiczNFbmRwb2ludFByZXNldE5vdGUiLCJpbml0aWFsaXplIiwiJCIsImZpbmQiLCJ0YWIiLCJoaXN0b3J5IiwiaGlzdG9yeVR5cGUiLCJvblZpc2libGUiLCJ0YWJQYXRoIiwibG9hZFN0b3JhZ2VEYXRhIiwiaW5pdGlhbGl6ZUZvcm0iLCJzM1N0b3JhZ2VJbmRleCIsInNsaWRlciIsIm1pbiIsIm1heCIsInN0ZXAiLCJzbW9vdGgiLCJhdXRvQWRqdXN0TGFiZWxzIiwiaW50ZXJwcmV0TGFiZWwiLCJ2YWx1ZSIsImxhYmVscyIsImdsb2JhbFRyYW5zbGF0ZSIsInN0X1N0b3JlMU1vbnRoT2ZSZWNvcmRzIiwic3RfU3RvcmUzTW9udGhzT2ZSZWNvcmRzIiwic3RfU3RvcmU2TW9udGhzT2ZSZWNvcmRzIiwic3RfU3RvcmUxWWVhck9mUmVjb3JkcyIsInN0X1N0b3JlM1llYXJzT2ZSZWNvcmRzIiwic3RfU3RvcmVBbGxQb3NzaWJsZVJlY29yZHMiLCJvbkNoYW5nZSIsImNiQWZ0ZXJTZWxlY3RTYXZlUGVyaW9kU2xpZGVyIiwiaW5pdGlhbGl6ZVRvb2x0aXBzIiwibG9hZFNldHRpbmdzIiwic2F2ZVBlcmlvZCIsImZvcm0iLCJ1cGRhdGVTbGlkZXJMaW1pdHMiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJTdG9yYWdlQVBJIiwiZ2V0IiwicmVzcG9uc2UiLCJyZXN1bHQiLCJkYXRhIiwiUEJYUmVjb3JkU2F2ZVBlcmlvZCIsInJlY29yZFNhdmVQZXJpb2QiLCJzbGlkZXJJbmRleCIsImluZGV4T2YiLCJhZGRDbGFzcyIsImhpZGUiLCJnZXRVc2FnZSIsInJlbmRlclN0b3JhZ2VEYXRhIiwicmVtb3ZlQ2xhc3MiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsInN0X1N0b3JhZ2VMb2FkRXJyb3IiLCJzaG93IiwiZm9ybWF0U2l6ZSIsInNpemVJbk1iIiwidG9GaXhlZCIsInRleHQiLCJ1c2VkX3NwYWNlIiwidG90YWxfc2l6ZSIsImFjY3VtdWxhdGVkV2lkdGgiLCJmb3JFYWNoIiwiY2F0ZWdvcnkiLCJjYXREYXRhIiwiY2F0ZWdvcmllcyIsIiRzZWdtZW50IiwicGVyY2VudGFnZSIsImNzcyIsImNhdGVnb3J5S2V5Iiwic3BsaXQiLCJtYXAiLCJ3b3JkIiwiY2hhckF0IiwidG9VcHBlckNhc2UiLCJzbGljZSIsImpvaW4iLCJhdHRyIiwic2l6ZSIsIl9ob3ZlckJvdW5kIiwib24iLCJlIiwidG9vbHRpcCIsImFwcGVuZCIsImRvY3VtZW50IiwiZXYiLCJsZWZ0IiwicGFnZVgiLCJ0b3AiLCJwYWdlWSIsInJlbW92ZSIsIm9mZiIsInJlbW90ZV9zdG9yYWdlIiwiczMiLCJlbmFibGVkIiwic3RfUzNSZW1vdGVTdG9yYWdlVGl0bGUiLCJzdF9TM1JlbW90ZVN0b3JhZ2VJbmZvIiwicmVwbGFjZSIsImZpbGVzX2NvdW50IiwidG9Mb2NhbGVTdHJpbmciLCJidWNrZXQiLCJidWlsZFRvb2x0aXBDb250ZW50IiwiY29uZmlnIiwiaHRtbCIsImhlYWRlciIsImRlc2NyaXB0aW9uIiwibGlzdCIsImxlbmd0aCIsIml0ZW0iLCJ0ZXJtIiwiZGVmaW5pdGlvbiIsImkiLCJsaXN0S2V5Iiwid2FybmluZyIsImV4YW1wbGVzIiwiZXhhbXBsZXNIZWFkZXIiLCJub3RlIiwiYnVpbGRTM0VuZHBvaW50VG9vbHRpcENvbnRlbnQiLCJzdF90b29sdGlwX3MzX2VuZHBvaW50X2hlYWRlciIsInN0X3Rvb2x0aXBfczNfZW5kcG9pbnRfZGVzYyIsInN0X3Rvb2x0aXBfZXhhbXBsZXMiLCJzZXRTM0VuZHBvaW50UHJlc2V0Tm90ZSIsIiRpY29uIiwicG9wdXAiLCJ0b29sdGlwQ29uZmlncyIsInJlY29yZF9yZXRlbnRpb25fcGVyaW9kIiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2hlYWRlciIsInN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9kZXNjIiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2l0ZW0xIiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2l0ZW0yIiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2l0ZW0zIiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2l0ZW00Iiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX3dhcm5pbmdfaGVhZGVyIiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX3dhcm5pbmciLCJzM19lbmFibGVkIiwic3RfdG9vbHRpcF9zM19lbmFibGVkX2hlYWRlciIsInN0X3Rvb2x0aXBfczNfZW5hYmxlZF9kZXNjIiwic3RfdG9vbHRpcF9zM19lbmFibGVkX2l0ZW0xIiwic3RfdG9vbHRpcF9zM19lbmFibGVkX2l0ZW0yIiwic3RfdG9vbHRpcF9zM19lbmFibGVkX2l0ZW0zIiwiczNfcHJvdmlkZXJfcHJlc2V0Iiwic3RfdG9vbHRpcF9zM19wcmVzZXRfaGVhZGVyIiwic3RfdG9vbHRpcF9zM19wcmVzZXRfZGVzYyIsInMzX2VuZHBvaW50IiwiczNfcmVnaW9uIiwic3RfdG9vbHRpcF9zM19yZWdpb25faGVhZGVyIiwic3RfdG9vbHRpcF9zM19yZWdpb25fZGVzYyIsInN0X3Rvb2x0aXBfczNfcmVnaW9uX25vdGUiLCJzM19idWNrZXQiLCJzdF90b29sdGlwX3MzX2J1Y2tldF9oZWFkZXIiLCJzdF90b29sdGlwX3MzX2J1Y2tldF9kZXNjIiwic3RfdG9vbHRpcF9zM19idWNrZXRfaXRlbTEiLCJzdF90b29sdGlwX3MzX2J1Y2tldF9pdGVtMiIsInN0X3Rvb2x0aXBfczNfYnVja2V0X2l0ZW0zIiwiczNfYWNjZXNzX2tleSIsInN0X3Rvb2x0aXBfczNfYWNjZXNzX2tleV9oZWFkZXIiLCJzdF90b29sdGlwX3MzX2FjY2Vzc19rZXlfZGVzYyIsInN0X3Rvb2x0aXBfczNfYWNjZXNzX2tleV9ub3RlIiwiczNfc2VjcmV0X2tleSIsInN0X3Rvb2x0aXBfczNfc2VjcmV0X2tleV9oZWFkZXIiLCJzdF90b29sdGlwX3MzX3NlY3JldF9rZXlfZGVzYyIsInN0X3Rvb2x0aXBfd2FybmluZyIsInN0X3Rvb2x0aXBfczNfc2VjcmV0X2tleV93YXJuaW5nIiwibG9jYWxfcmV0ZW50aW9uX3BlcmlvZCIsInN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2hlYWRlciIsInN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2Rlc2MiLCJzdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9pdGVtMSIsInN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2l0ZW0yIiwic3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25faXRlbTMiLCJzdF90b29sdGlwX25vdGUiLCJzdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl93YXJuaW5nIiwiZWFjaCIsImluZGV4IiwiZWxlbWVudCIsImZpZWxkTmFtZSIsImNvbnRlbnQiLCJwb3NpdGlvbiIsImhvdmVyYWJsZSIsImRlbGF5IiwidmFyaWF0aW9uIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwiY2JBZnRlclNlbmRGb3JtIiwic3VjY2VzcyIsImFwaVNldHRpbmdzIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsWUFBWSxHQUFHO0FBQ2pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUUsSUFQTzs7QUFTakI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFB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SixlQUFMLEdBQXVCOUwsWUFBWSxDQUFDOEwsZUFBcEMsQ0FQYSxDQVNiOztBQUNBbkosSUFBQUEsSUFBSSxDQUFDcUosV0FBTCxHQUFtQjtBQUNmMUYsTUFBQUEsT0FBTyxFQUFFLElBRE07QUFFZjJGLE1BQUFBLFNBQVMsRUFBRXBKLFVBRkk7QUFHZnFKLE1BQUFBLFVBQVUsRUFBRSxRQUhHLENBR007O0FBSE4sS0FBbkI7QUFNQXZKLElBQUFBLElBQUksQ0FBQ2xDLFVBQUw7QUFDSDtBQTVpQmdCLENBQXJCLEMsQ0EraUJBOztBQUNBQyxDQUFDLENBQUNrRixRQUFELENBQUQsQ0FBWXVHLEtBQVosQ0FBa0IsWUFBTTtBQUNwQm5NLEVBQUFBLFlBQVksQ0FBQ1MsVUFBYjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBTdG9yYWdlQVBJLCBVc2VyTWVzc2FnZSwgczNTdG9yYWdlSW5kZXgsICQgKi9cblxuLyoqXG4gKiBTdG9yYWdlIG1hbmFnZW1lbnQgbW9kdWxlXG4gKi9cbmNvbnN0IHN0b3JhZ2VJbmRleCA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgbG9jYWwgc3RvcmFnZSBmb3JtIChUYWIgMikuXG4gICAgICogU2VuZHMgZGF0YSB0bzogUEFUQ0ggL3BieGNvcmUvYXBpL3YzL3N0b3JhZ2UuXG4gICAgICogUmVzb2x2ZWQgaW4gaW5pdGlhbGl6ZSgpIOKAlCBtdXN0IG5vdCBjYWxsICQoKSBhdCBtb2R1bGUtbG9hZCB0aW1lLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgc3VibWl0IGJ1dHRvbiAodW5pcXVlIHRvIHRoaXMgZm9ybSkuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc3VibWl0QnV0dG9uOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGRyb3Bkb3duIHN1Ym1pdCAodW5pcXVlIHRvIHRoaXMgZm9ybSkuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZHJvcGRvd25TdWJtaXQ6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZGlydHkgZmllbGQgKHVuaXF1ZSB0byB0aGlzIGZvcm0pLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRpcnJ0eUZpZWxkOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHJlY29yZHMgcmV0ZW50aW9uIHBlcmlvZCBzbGlkZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkcmVjb3Jkc1NhdmVQZXJpb2RTbGlkZXI6IG51bGwsXG5cblxuICAgIC8qKlxuICAgICAqIFBvc3NpYmxlIHBlcmlvZCB2YWx1ZXMgZm9yIHRoZSByZWNvcmRzIHJldGVudGlvbi5cbiAgICAgKiBWYWx1ZXMgaW4gZGF5czogMzAsIDkwLCAxODAsIDM2MCwgMTA4MCwgJycgKGluZmluaXR5KVxuICAgICAqL1xuICAgIHNhdmVSZWNvcmRzUGVyaW9kOiBbJzMwJywgJzkwJywgJzE4MCcsICczNjAnLCAnMTA4MCcsICcnXSxcblxuXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgbG9jYWwgc3RvcmFnZSBmb3JtLlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge30sXG5cbiAgICAvKipcbiAgICAgKiBQZXItcHJlc2V0IG5vdGUgYXBwZW5kZWQgdG8gdGhlIHMzX2VuZHBvaW50IGZpZWxkIHRvb2x0aXAuIFVwZGF0ZWRcbiAgICAgKiBieSBzZXRTM0VuZHBvaW50UHJlc2V0Tm90ZSgpIGVhY2ggdGltZSB0aGUgb3BlcmF0b3IgcGlja3MgYSBkaWZmZXJlbnRcbiAgICAgKiBwcm92aWRlciBwcmVzZXQ7IHJlbmRlcmVkIGFzIHRoZSBgbm90ZWAgc2xvdCBvZiB0aGUgczNfZW5kcG9pbnRcbiAgICAgKiB0b29sdGlwIGNvbmZpZyBzbyBhbGwgcGVyLWZpZWxkIGhpbnRzIHN0YXkgaW4gb25lIHBsYWNlLlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgczNFbmRwb2ludFByZXNldE5vdGU6ICcnLFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgbW9kdWxlIHdpdGggZXZlbnQgYmluZGluZ3MgYW5kIGNvbXBvbmVudCBpbml0aWFsaXphdGlvbnMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgc3RvcmFnZUluZGV4LiRmb3JtT2JqID0gJCgnI2xvY2FsLXN0b3JhZ2UtZm9ybScpO1xuICAgICAgICBzdG9yYWdlSW5kZXguJHN1Ym1pdEJ1dHRvbiA9ICQoJyNzdWJtaXRidXR0b24tbG9jYWwnKTtcbiAgICAgICAgc3RvcmFnZUluZGV4LiRkcm9wZG93blN1Ym1pdCA9ICQoJyNkcm9wZG93blN1Ym1pdC1sb2NhbCcpO1xuICAgICAgICBzdG9yYWdlSW5kZXguJGRpcnJ0eUZpZWxkID0gJCgnI2RpcnJ0eS1sb2NhbCcpO1xuICAgICAgICBzdG9yYWdlSW5kZXguJHJlY29yZHNTYXZlUGVyaW9kU2xpZGVyID0gJCgnI1BCWFJlY29yZFNhdmVQZXJpb2RTbGlkZXInKTtcblxuICAgICAgICAvLyBFbmFibGUgdGFiIG5hdmlnYXRpb25cbiAgICAgICAgJCgnI3N0b3JhZ2UtbWVudScpLmZpbmQoJy5pdGVtJykudGFiKHtcbiAgICAgICAgICAgICAgICBoaXN0b3J5OiB0cnVlLFxuICAgICAgICAgICAgICAgIGhpc3RvcnlUeXBlOiAnaGFzaCcsXG4gICAgICAgICAgICAgICAgICAgb25WaXNpYmxlOiBmdW5jdGlvbih0YWJQYXRoKSB7XG4gICAgICAgICAgICAgICAgLy8gTG9hZCBzdG9yYWdlIGRhdGEgd2hlbiBzdG9yYWdlIGluZm8gdGFiIGlzIGFjdGl2YXRlZFxuICAgICAgICAgICAgICAgIGlmICh0YWJQYXRoID09PSAnc3RvcmFnZS1pbmZvJykge1xuICAgICAgICAgICAgICAgICAgICBzdG9yYWdlSW5kZXgubG9hZFN0b3JhZ2VEYXRhKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgbG9jYWwgc3RvcmFnZSBmb3JtIHdoZW4gdGFiIGJlY29tZXMgdmlzaWJsZVxuICAgICAgICAgICAgICAgIGlmICh0YWJQYXRoID09PSAnc3RvcmFnZS1sb2NhbCcpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RvcmFnZUluZGV4LmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgUzMgZm9ybSB3aGVuIGNsb3VkIHRhYiBiZWNvbWVzIHZpc2libGVcbiAgICAgICAgICAgICAgICBpZiAodGFiUGF0aCA9PT0gJ3N0b3JhZ2UtY2xvdWQnICYmIHR5cGVvZiBzM1N0b3JhZ2VJbmRleCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHJlY29yZHMgc2F2ZSBwZXJpb2Qgc2xpZGVyXG4gICAgICAgIHN0b3JhZ2VJbmRleC4kcmVjb3Jkc1NhdmVQZXJpb2RTbGlkZXJcbiAgICAgICAgICAgIC5zbGlkZXIoe1xuICAgICAgICAgICAgICAgIG1pbjogMCxcbiAgICAgICAgICAgICAgICBtYXg6IDUsXG4gICAgICAgICAgICAgICAgc3RlcDogMSxcbiAgICAgICAgICAgICAgICBzbW9vdGg6IHRydWUsXG4gICAgICAgICAgICAgICAgYXV0b0FkanVzdExhYmVsczogZmFsc2UsXG4gICAgICAgICAgICAgICAgaW50ZXJwcmV0TGFiZWw6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsYWJlbHMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAwOiBnbG9iYWxUcmFuc2xhdGUuc3RfU3RvcmUxTW9udGhPZlJlY29yZHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAxOiBnbG9iYWxUcmFuc2xhdGUuc3RfU3RvcmUzTW9udGhzT2ZSZWNvcmRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgMjogZ2xvYmFsVHJhbnNsYXRlLnN0X1N0b3JlNk1vbnRoc09mUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIDM6IGdsb2JhbFRyYW5zbGF0ZS5zdF9TdG9yZTFZZWFyT2ZSZWNvcmRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgNDogZ2xvYmFsVHJhbnNsYXRlLnN0X1N0b3JlM1llYXJzT2ZSZWNvcmRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgNTogZ2xvYmFsVHJhbnNsYXRlLnN0X1N0b3JlQWxsUG9zc2libGVSZWNvcmRzLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGFiZWxzW3ZhbHVlXSB8fCAnJztcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiBzdG9yYWdlSW5kZXguY2JBZnRlclNlbGVjdFNhdmVQZXJpb2RTbGlkZXIsXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzXG4gICAgICAgIHN0b3JhZ2VJbmRleC5pbml0aWFsaXplVG9vbHRpcHMoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBmb3JtXG4gICAgICAgIHN0b3JhZ2VJbmRleC5pbml0aWFsaXplRm9ybSgpO1xuXG4gICAgICAgIC8vIExvYWQgc2V0dGluZ3MgZnJvbSBBUElcbiAgICAgICAgc3RvcmFnZUluZGV4LmxvYWRTZXR0aW5ncygpO1xuXG4gICAgICAgIC8vIExvYWQgc3RvcmFnZSBkYXRhIG9uIHBhZ2UgbG9hZFxuICAgICAgICBzdG9yYWdlSW5kZXgubG9hZFN0b3JhZ2VEYXRhKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgZXZlbnQgYWZ0ZXIgdGhlIHNlbGVjdCBzYXZlIHBlcmlvZCBzbGlkZXIgaXMgY2hhbmdlZC5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gdmFsdWUgLSBUaGUgc2VsZWN0ZWQgdmFsdWUgZnJvbSB0aGUgc2xpZGVyLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZWxlY3RTYXZlUGVyaW9kU2xpZGVyKHZhbHVlKSB7XG4gICAgICAgIC8vIEdldCB0aGUgc2F2ZSBwZXJpb2QgY29ycmVzcG9uZGluZyB0byB0aGUgc2xpZGVyIHZhbHVlLlxuICAgICAgICBjb25zdCBzYXZlUGVyaW9kID0gc3RvcmFnZUluZGV4LnNhdmVSZWNvcmRzUGVyaW9kW3ZhbHVlXTtcblxuICAgICAgICAvLyBTZXQgdGhlIGZvcm0gdmFsdWUgZm9yICdQQlhSZWNvcmRTYXZlUGVyaW9kJyB0byB0aGUgc2VsZWN0ZWQgc2F2ZSBwZXJpb2QuXG4gICAgICAgIHN0b3JhZ2VJbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnUEJYUmVjb3JkU2F2ZVBlcmlvZCcsIHNhdmVQZXJpb2QpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBTMyBsb2NhbCByZXRlbnRpb24gc2xpZGVyIG1heGltdW0gKGlmIFMzIG1vZHVsZSBsb2FkZWQpXG4gICAgICAgIGlmICh0eXBlb2YgczNTdG9yYWdlSW5kZXggIT09ICd1bmRlZmluZWQnICYmIHMzU3RvcmFnZUluZGV4LnVwZGF0ZVNsaWRlckxpbWl0cykge1xuICAgICAgICAgICAgczNTdG9yYWdlSW5kZXgudXBkYXRlU2xpZGVyTGltaXRzKHNhdmVQZXJpb2QpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVHJpZ2dlciBjaGFuZ2UgZXZlbnQgdG8gYWNrbm93bGVkZ2UgdGhlIG1vZGlmaWNhdGlvblxuICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogTG9hZCBTdG9yYWdlIHNldHRpbmdzIGZyb20gQVBJXG4gICAgICovXG4gICAgbG9hZFNldHRpbmdzKCkge1xuICAgICAgICBTdG9yYWdlQVBJLmdldCgocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5kYXRhO1xuXG4gICAgICAgICAgICAgICAgLy8gU2V0IGZvcm0gdmFsdWVzIGZvciBsb2NhbCBzdG9yYWdlIG9ubHlcbiAgICAgICAgICAgICAgICBzdG9yYWdlSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlcycsIHtcbiAgICAgICAgICAgICAgICAgICAgUEJYUmVjb3JkU2F2ZVBlcmlvZDogZGF0YS5QQlhSZWNvcmRTYXZlUGVyaW9kIHx8ICcnXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdG90YWwgcmV0ZW50aW9uIHBlcmlvZCBzbGlkZXJcbiAgICAgICAgICAgICAgICBjb25zdCByZWNvcmRTYXZlUGVyaW9kID0gZGF0YS5QQlhSZWNvcmRTYXZlUGVyaW9kIHx8ICcnO1xuICAgICAgICAgICAgICAgIGNvbnN0IHNsaWRlckluZGV4ID0gc3RvcmFnZUluZGV4LnNhdmVSZWNvcmRzUGVyaW9kLmluZGV4T2YocmVjb3JkU2F2ZVBlcmlvZCk7XG4gICAgICAgICAgICAgICAgc3RvcmFnZUluZGV4LiRyZWNvcmRzU2F2ZVBlcmlvZFNsaWRlci5zbGlkZXIoXG4gICAgICAgICAgICAgICAgICAgICdzZXQgdmFsdWUnLFxuICAgICAgICAgICAgICAgICAgICBzbGlkZXJJbmRleCxcbiAgICAgICAgICAgICAgICAgICAgZmFsc2VcbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgLy8gTm90aWZ5IFMzIG1vZHVsZSBhYm91dCB0b3RhbCByZXRlbnRpb24gY2hhbmdlIChpZiBsb2FkZWQpXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBzM1N0b3JhZ2VJbmRleCAhPT0gJ3VuZGVmaW5lZCcgJiYgczNTdG9yYWdlSW5kZXgudXBkYXRlU2xpZGVyTGltaXRzKSB7XG4gICAgICAgICAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LnVwZGF0ZVNsaWRlckxpbWl0cyhyZWNvcmRTYXZlUGVyaW9kKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCBzdG9yYWdlIHVzYWdlIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBsb2FkU3RvcmFnZURhdGEoKSB7XG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICAkKCcjc3RvcmFnZS11c2FnZS1jb250YWluZXIgLmRpbW1lcicpLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgJCgnI3N0b3JhZ2UtZGV0YWlscycpLmhpZGUoKTtcblxuICAgICAgICAvLyBNYWtlIEFQSSBjYWxsIHRvIGdldCBzdG9yYWdlIHVzYWdlIHVzaW5nIG5ldyBTdG9yYWdlQVBJXG4gICAgICAgIFN0b3JhZ2VBUEkuZ2V0VXNhZ2UoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBzdG9yYWdlSW5kZXgucmVuZGVyU3RvcmFnZURhdGEocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICQoJyNzdG9yYWdlLXVzYWdlLWNvbnRhaW5lciAuZGltbWVyJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhnbG9iYWxUcmFuc2xhdGUuc3RfU3RvcmFnZUxvYWRFcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUmVuZGVyIHN0b3JhZ2UgdXNhZ2UgZGF0YSBpbiB0aGUgVUlcbiAgICAgKi9cbiAgICByZW5kZXJTdG9yYWdlRGF0YShkYXRhKSB7XG4gICAgICAgIC8vIEhpZGUgbG9hZGluZyBhbmQgc2hvdyBkZXRhaWxzXG4gICAgICAgICQoJyNzdG9yYWdlLXVzYWdlLWNvbnRhaW5lciAuZGltbWVyJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAkKCcjc3RvcmFnZS1kZXRhaWxzJykuc2hvdygpO1xuICAgICAgICBcbiAgICAgICAgLy8gRm9ybWF0IHNpemUgZm9yIGRpc3BsYXlcbiAgICAgICAgY29uc3QgZm9ybWF0U2l6ZSA9IChzaXplSW5NYikgPT4ge1xuICAgICAgICAgICAgaWYgKHNpemVJbk1iID49IDEwMjQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKHNpemVJbk1iIC8gMTAyNCkudG9GaXhlZCgxKSArICcgR0InO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHNpemVJbk1iLnRvRml4ZWQoMSkgKyAnIE1CJztcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBoZWFkZXIgaW5mb3JtYXRpb25cbiAgICAgICAgJCgnI3VzZWQtc3BhY2UtdGV4dCcpLnRleHQoZm9ybWF0U2l6ZShkYXRhLnVzZWRfc3BhY2UpKTtcbiAgICAgICAgJCgnI3RvdGFsLXNpemUtdGV4dCcpLnRleHQoZm9ybWF0U2l6ZShkYXRhLnRvdGFsX3NpemUpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBwcm9ncmVzcyBzZWdtZW50cyBpbiBtYWNPUyBzdHlsZVxuICAgICAgICBsZXQgYWNjdW11bGF0ZWRXaWR0aCA9IDA7XG4gICAgICAgIFxuICAgICAgICAvLyBQcm9jZXNzIGVhY2ggY2F0ZWdvcnlcbiAgICAgICAgWydjYWxsX3JlY29yZGluZ3MnLCAnY2RyX2RhdGFiYXNlJywgJ3N5c3RlbV9sb2dzJywgJ21vZHVsZXMnLCAnYmFja3VwcycsICdzeXN0ZW1fY2FjaGVzJywgJ3MzX2NhY2hlJywgJ290aGVyJ10uZm9yRWFjaChjYXRlZ29yeSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjYXREYXRhID0gZGF0YS5jYXRlZ29yaWVzW2NhdGVnb3J5XTtcbiAgICAgICAgICAgIGNvbnN0ICRzZWdtZW50ID0gJChgLnByb2dyZXNzLXNlZ21lbnRbZGF0YS1jYXRlZ29yeT1cIiR7Y2F0ZWdvcnl9XCJdYCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChjYXREYXRhICYmIGNhdERhdGEucGVyY2VudGFnZSA+IDApIHtcbiAgICAgICAgICAgICAgICAkc2VnbWVudC5jc3MoJ3dpZHRoJywgY2F0RGF0YS5wZXJjZW50YWdlICsgJyUnKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQWRkIGhvdmVyIHRvb2x0aXBcbiAgICAgICAgICAgICAgICBjb25zdCBjYXRlZ29yeUtleSA9ICdzdF9DYXRlZ29yeScgKyBjYXRlZ29yeS5zcGxpdCgnXycpLm1hcCh3b3JkID0+IHdvcmQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB3b3JkLnNsaWNlKDEpKS5qb2luKCcnKTtcbiAgICAgICAgICAgICAgICAkc2VnbWVudC5hdHRyKCd0aXRsZScsIGAke2dsb2JhbFRyYW5zbGF0ZVtjYXRlZ29yeUtleV0gfHwgY2F0ZWdvcnl9OiAke2Zvcm1hdFNpemUoY2F0RGF0YS5zaXplKX0gKCR7Y2F0RGF0YS5wZXJjZW50YWdlfSUpYCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgYWNjdW11bGF0ZWRXaWR0aCArPSBjYXREYXRhLnBlcmNlbnRhZ2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRzZWdtZW50LmhpZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIGNhdGVnb3J5IHNpemUgaW4gbGlzdFxuICAgICAgICAgICAgJChgIyR7Y2F0ZWdvcnl9LXNpemVgKS50ZXh0KGZvcm1hdFNpemUoY2F0RGF0YSA/IGNhdERhdGEuc2l6ZSA6IDApKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBCaW5kIGhvdmVyIGVmZmVjdHMgb25seSBvbmNlIChub3Qgb24gZXZlcnkgZGF0YSByZWZyZXNoKVxuICAgICAgICBpZiAoIXN0b3JhZ2VJbmRleC5faG92ZXJCb3VuZCkge1xuICAgICAgICAgICAgc3RvcmFnZUluZGV4Ll9ob3ZlckJvdW5kID0gdHJ1ZTtcblxuICAgICAgICAgICAgLy8gVG9vbHRpcCBmb3IgcHJvZ3Jlc3Mgc2VnbWVudHNcbiAgICAgICAgICAgICQoJyNzdG9yYWdlLXByb2dyZXNzJykub24oJ21vdXNlZW50ZXInLCAnLnByb2dyZXNzLXNlZ21lbnQnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRvb2x0aXAgPSAkKCc8ZGl2IGNsYXNzPVwic3RvcmFnZS10b29sdGlwXCI+PC9kaXY+JykudGV4dCgkKHRoaXMpLmF0dHIoJ3RpdGxlJykpO1xuICAgICAgICAgICAgICAgICQoJ2JvZHknKS5hcHBlbmQodG9vbHRpcCk7XG4gICAgICAgICAgICAgICAgJChkb2N1bWVudCkub24oJ21vdXNlbW92ZS50b29sdGlwJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICAgICAgICAgIHRvb2x0aXAuY3NzKHsgbGVmdDogZXYucGFnZVggKyAxMCwgdG9wOiBldi5wYWdlWSAtIDMwIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkub24oJ21vdXNlbGVhdmUnLCAnLnByb2dyZXNzLXNlZ21lbnQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgJCgnLnN0b3JhZ2UtdG9vbHRpcCcpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLm9mZignbW91c2Vtb3ZlLnRvb2x0aXAnKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBIaWdobGlnaHQgbWF0Y2hpbmcgcHJvZ3Jlc3Mgc2VnbWVudCBvbiBjYXRlZ29yeSBsaXN0IGhvdmVyIHZpYSBDU1MgY2xhc3NcbiAgICAgICAgICAgICQoJy5jYXRlZ29yeS1pdGVtJykub24oJ21vdXNlZW50ZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY2F0ZWdvcnkgPSAkKHRoaXMpLmRhdGEoJ2NhdGVnb3J5Jyk7XG4gICAgICAgICAgICAgICAgJChgLnByb2dyZXNzLXNlZ21lbnRbZGF0YS1jYXRlZ29yeT1cIiR7Y2F0ZWdvcnl9XCJdYCkuYWRkQ2xhc3MoJ2hpZ2hsaWdodGVkJyk7XG4gICAgICAgICAgICB9KS5vbignbW91c2VsZWF2ZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAkKCcucHJvZ3Jlc3Mtc2VnbWVudCcpLnJlbW92ZUNsYXNzKCdoaWdobGlnaHRlZCcpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZW5kZXIgcmVtb3RlIHN0b3JhZ2UgaW5mbyAoUzMpXG4gICAgICAgIGlmIChkYXRhLnJlbW90ZV9zdG9yYWdlICYmIGRhdGEucmVtb3RlX3N0b3JhZ2UuczMgJiYgZGF0YS5yZW1vdGVfc3RvcmFnZS5zMy5lbmFibGVkICYmIGRhdGEucmVtb3RlX3N0b3JhZ2UuczMuc2l6ZSA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHMzID0gZGF0YS5yZW1vdGVfc3RvcmFnZS5zMztcbiAgICAgICAgICAgICQoJyNyZW1vdGUtc3RvcmFnZS10aXRsZScpLnRleHQoZ2xvYmFsVHJhbnNsYXRlLnN0X1MzUmVtb3RlU3RvcmFnZVRpdGxlKTtcbiAgICAgICAgICAgICQoJyNyZW1vdGUtc3RvcmFnZS1kZXRhaWxzJykudGV4dChcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfUzNSZW1vdGVTdG9yYWdlSW5mb1xuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgnJWZpbGVzJScsIHMzLmZpbGVzX2NvdW50LnRvTG9jYWxlU3RyaW5nKCkpXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKCclc2l6ZSUnLCBmb3JtYXRTaXplKHMzLnNpemUpKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgnJWJ1Y2tldCUnLCBzMy5idWNrZXQpXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgJCgnI3JlbW90ZS1zdG9yYWdlLXNlY3Rpb24nKS5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEJ1aWxkIEhUTUwgY29udGVudCBmb3IgdG9vbHRpcCBwb3B1cFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcgLSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gb2JqZWN0XG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBzdHJpbmcgZm9yIHBvcHVwIGNvbnRlbnRcbiAgICAgKi9cbiAgICBidWlsZFRvb2x0aXBDb250ZW50KGNvbmZpZykge1xuICAgICAgICBsZXQgaHRtbCA9ICc8ZGl2IGNsYXNzPVwidWkgcmVsYXhlZCBsaXN0XCI+JztcblxuICAgICAgICAvLyBIZWFkZXJcbiAgICAgICAgaWYgKGNvbmZpZy5oZWFkZXIpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+PHN0cm9uZz4ke2NvbmZpZy5oZWFkZXJ9PC9zdHJvbmc+PC9kaXY+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERlc2NyaXB0aW9uXG4gICAgICAgIGlmIChjb25maWcuZGVzY3JpcHRpb24pIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+JHtjb25maWcuZGVzY3JpcHRpb259PC9kaXY+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1haW4gbGlzdFxuICAgICAgICBpZiAoY29uZmlnLmxpc3QgJiYgY29uZmlnLmxpc3QubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIj48dWwgY2xhc3M9XCJ1aSBsaXN0XCI+JztcbiAgICAgICAgICAgIGNvbmZpZy5saXN0LmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+JHtpdGVtfTwvbGk+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0udGVybSAmJiBpdGVtLmRlZmluaXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2VjdGlvbiBoZWFkZXJcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPC91bD48c3Ryb25nPiR7aXRlbS50ZXJtfTwvc3Ryb25nPjx1bCBjbGFzcz1cInVpIGxpc3RcIj5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXRlbS50ZXJtICYmIGl0ZW0uZGVmaW5pdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAvLyBUZXJtIHdpdGggZGVmaW5pdGlvblxuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+PHN0cm9uZz4ke2l0ZW0udGVybX06PC9zdHJvbmc+ICR7aXRlbS5kZWZpbml0aW9ufTwvbGk+YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvdWw+PC9kaXY+JztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZGl0aW9uYWwgbGlzdHMgKGxpc3QyLWxpc3QxMClcbiAgICAgICAgZm9yIChsZXQgaSA9IDI7IGkgPD0gMTA7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgbGlzdEtleSA9IGBsaXN0JHtpfWA7XG4gICAgICAgICAgICBpZiAoY29uZmlnW2xpc3RLZXldICYmIGNvbmZpZ1tsaXN0S2V5XS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIj48dWwgY2xhc3M9XCJ1aSBsaXN0XCI+JztcbiAgICAgICAgICAgICAgICBjb25maWdbbGlzdEtleV0uZm9yRWFjaChpdGVtID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGxpPiR7aXRlbX08L2xpPmA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8L3VsPjwvZGl2Pic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBXYXJuaW5nXG4gICAgICAgIGlmIChjb25maWcud2FybmluZykge1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIj48ZGl2IGNsYXNzPVwidWkgb3JhbmdlIG1lc3NhZ2VcIj4nO1xuICAgICAgICAgICAgaWYgKGNvbmZpZy53YXJuaW5nLmhlYWRlcikge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2NvbmZpZy53YXJuaW5nLmhlYWRlcn08L2Rpdj5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGNvbmZpZy53YXJuaW5nLnRleHQpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8cD4ke2NvbmZpZy53YXJuaW5nLnRleHR9PC9wPmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj48L2Rpdj4nO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRXhhbXBsZXNcbiAgICAgICAgaWYgKGNvbmZpZy5leGFtcGxlcyAmJiBjb25maWcuZXhhbXBsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaWYgKGNvbmZpZy5leGFtcGxlc0hlYWRlcikge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+PHN0cm9uZz4ke2NvbmZpZy5leGFtcGxlc0hlYWRlcn08L3N0cm9uZz48L2Rpdj5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIj48cHJlIHN0eWxlPVwiYmFja2dyb3VuZDojZjRmNGY0O3BhZGRpbmc6MTBweDtib3JkZXItcmFkaXVzOjRweDtcIj4nO1xuICAgICAgICAgICAgaHRtbCArPSBjb25maWcuZXhhbXBsZXMuam9pbignXFxuJyk7XG4gICAgICAgICAgICBodG1sICs9ICc8L3ByZT48L2Rpdj4nO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTm90ZVxuICAgICAgICBpZiAoY29uZmlnLm5vdGUpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+PGVtPiR7Y29uZmlnLm5vdGV9PC9lbT48L2Rpdj5gO1xuICAgICAgICB9XG5cbiAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJ1aWxkIHRoZSBzM19lbmRwb2ludCB0b29sdGlwIEhUTUwsIHdlYXZpbmcgaW4gdGhlIGN1cnJlbnRcbiAgICAgKiBwZXItcHJlc2V0IG5vdGUgKGlmIGFueSkgYXMgdGhlIHRyYWlsaW5nIGBub3RlYCBzbG90LiBMaXZlcyBpbiBpdHNcbiAgICAgKiBvd24gbWV0aG9kIHNvIHNldFMzRW5kcG9pbnRQcmVzZXROb3RlKCkgY2FuIHJlYnVpbGQgdGhlIGNvbnRlbnQgb25cbiAgICAgKiB0aGUgZmx5IHdpdGhvdXQgcmUtcnVubmluZyB0aGUgcmVzdCBvZiB0aGUgdG9vbHRpcCBtYWNoaW5lcnkuXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MXG4gICAgICovXG4gICAgYnVpbGRTM0VuZHBvaW50VG9vbHRpcENvbnRlbnQoKSB7XG4gICAgICAgIHJldHVybiBzdG9yYWdlSW5kZXguYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2VuZHBvaW50X2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19lbmRwb2ludF9kZXNjLFxuICAgICAgICAgICAgZXhhbXBsZXM6IFtcbiAgICAgICAgICAgICAgICAnQVdTIFMzOiBodHRwczovL3MzLmFwLXNvdXRoZWFzdC0xLmFtYXpvbmF3cy5jb20nLFxuICAgICAgICAgICAgICAgICdZYW5kZXggQ2xvdWQ6IGh0dHBzOi8vc3RvcmFnZS55YW5kZXhjbG91ZC5uZXQnLFxuICAgICAgICAgICAgICAgICdWSyBDbG91ZDogaHR0cHM6Ly9oYi5rei1hc3QudmtjbG91ZC1zdG9yYWdlLnJ1JyxcbiAgICAgICAgICAgICAgICAnQ2xvdWRmbGFyZSBSMjogaHR0cHM6Ly88QUNDT1VOVF9JRD4ucjIuY2xvdWRmbGFyZXN0b3JhZ2UuY29tJyxcbiAgICAgICAgICAgICAgICAnRGlnaXRhbE9jZWFuOiBodHRwczovL3NncDEuZGlnaXRhbG9jZWFuc3BhY2VzLmNvbScsXG4gICAgICAgICAgICAgICAgJ01pbklPOiBodHRwOi8vbWluaW8uZXhhbXBsZS5jb206OTAwMCcsXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgZXhhbXBsZXNIZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX2V4YW1wbGVzLFxuICAgICAgICAgICAgbm90ZTogc3RvcmFnZUluZGV4LnMzRW5kcG9pbnRQcmVzZXROb3RlIHx8IG51bGwsXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIHBlci1wcmVzZXQgbm90ZSB0aGF0IHRoZSBzM19lbmRwb2ludCB0b29sdGlwIGNhcnJpZXMgYW5kXG4gICAgICogcHVzaCB0aGUgcmVidWlsdCBIVE1MIGludG8gdGhlIGxpdmUgRm9tYW50aWMgcG9wdXAuIENhbGxlZCBmcm9tXG4gICAgICogczMtc3RvcmFnZS1pbmRleC5qcyB3aGVuZXZlciB0aGUgcHJvdmlkZXIgcHJlc2V0IGNoYW5nZXMgc28gdGhlXG4gICAgICogcHJlc2V0LXNwZWNpZmljIGd1aWRhbmNlIGxpdmVzIG5leHQgdG8gdGhlIGZpZWxkIGl0IGFjdHVhbGx5XG4gICAgICogYWZmZWN0cyAobm8gc2VwYXJhdGUgaGludCBiYW5uZXIgbmVlZGVkKS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0XG4gICAgICovXG4gICAgc2V0UzNFbmRwb2ludFByZXNldE5vdGUodGV4dCkge1xuICAgICAgICBzdG9yYWdlSW5kZXguczNFbmRwb2ludFByZXNldE5vdGUgPSB0ZXh0IHx8ICcnO1xuICAgICAgICBjb25zdCAkaWNvbiA9ICQoJy5maWVsZC1pbmZvLWljb25bZGF0YS1maWVsZD1cInMzX2VuZHBvaW50XCJdJyk7XG4gICAgICAgIGlmICgkaWNvbi5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBJZiB0aGUgcG9wdXAgaGFzbid0IGJlZW4gaW5pdGlhbGlzZWQgeWV0IChlLmcuIGNsb3VkIHRhYiBub3RcbiAgICAgICAgLy8gdmlzaXRlZCB5ZXQpLCBkbyBub3RoaW5nIGV4dHJhIOKAlCBpbml0aWFsaXplVG9vbHRpcHMoKSB3aWxsIHBpY2tcbiAgICAgICAgLy8gdXAgdGhlIG5ldyBzdGF0ZSB2aWEgYnVpbGRTM0VuZHBvaW50VG9vbHRpcENvbnRlbnQoKSBvbiBmaXJzdFxuICAgICAgICAvLyBpbml0LiBBdm9pZHMgYSBkZXN0cm95L3JlaW5pdCByYWNlIHRoYXQgd291bGQgb3RoZXJ3aXNlIHdpcGVcbiAgICAgICAgLy8gdGhlIGR5bmFtaWMgbm90ZSB3aGVuIGluaXRpYWxpemVUb29sdGlwcygpIHJ1bnMgbGF0ZXIuXG4gICAgICAgIGlmICgkaWNvbi5wb3B1cCgnZXhpc3RzJykpIHtcbiAgICAgICAgICAgICRpY29uLnBvcHVwKCdjaGFuZ2UgY29udGVudCcsIHN0b3JhZ2VJbmRleC5idWlsZFMzRW5kcG9pbnRUb29sdGlwQ29udGVudCgpKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVUb29sdGlwcygpIHtcbiAgICAgICAgLy8gVG9vbHRpcCBjb25maWd1cmF0aW9ucyBmb3IgZWFjaCBmaWVsZFxuICAgICAgICBjb25zdCB0b29sdGlwQ29uZmlncyA9IHtcbiAgICAgICAgICAgIHJlY29yZF9yZXRlbnRpb25fcGVyaW9kOiBzdG9yYWdlSW5kZXguYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9pdGVtMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9pdGVtMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9pdGVtMyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9pdGVtNFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25fd2FybmluZ19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25fd2FybmluZ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICBzM19lbmFibGVkOiBzdG9yYWdlSW5kZXguYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19lbmFibGVkX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfZW5hYmxlZF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfZW5hYmxlZF9pdGVtMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfZW5hYmxlZF9pdGVtMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfZW5hYmxlZF9pdGVtM1xuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICBzM19wcm92aWRlcl9wcmVzZXQ6IHN0b3JhZ2VJbmRleC5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX3ByZXNldF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX3ByZXNldF9kZXNjLFxuICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgIHMzX2VuZHBvaW50OiBzdG9yYWdlSW5kZXguYnVpbGRTM0VuZHBvaW50VG9vbHRpcENvbnRlbnQoKSxcblxuICAgICAgICAgICAgczNfcmVnaW9uOiBzdG9yYWdlSW5kZXguYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19yZWdpb25faGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19yZWdpb25fZGVzYyxcbiAgICAgICAgICAgICAgICBleGFtcGxlczogW1xuICAgICAgICAgICAgICAgICAgICAndXMtZWFzdC0xIChkZWZhdWx0KScsXG4gICAgICAgICAgICAgICAgICAgICdldS13ZXN0LTEnLFxuICAgICAgICAgICAgICAgICAgICAnYXAtc291dGhlYXN0LTEnXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19yZWdpb25fbm90ZVxuICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgIHMzX2J1Y2tldDogc3RvcmFnZUluZGV4LmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfYnVja2V0X2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfYnVja2V0X2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19idWNrZXRfaXRlbTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2J1Y2tldF9pdGVtMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfYnVja2V0X2l0ZW0zXG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgIHMzX2FjY2Vzc19rZXk6IHN0b3JhZ2VJbmRleC5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2FjY2Vzc19rZXlfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19hY2Nlc3Nfa2V5X2Rlc2MsXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfYWNjZXNzX2tleV9ub3RlXG4gICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgczNfc2VjcmV0X2tleTogc3RvcmFnZUluZGV4LmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfc2VjcmV0X2tleV9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX3NlY3JldF9rZXlfZGVzYyxcbiAgICAgICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfd2FybmluZyxcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfc2VjcmV0X2tleV93YXJuaW5nXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgIGxvY2FsX3JldGVudGlvbl9wZXJpb2Q6IHN0b3JhZ2VJbmRleC5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2l0ZW0xLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25faXRlbTIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9pdGVtM1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX25vdGUsXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl93YXJuaW5nXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHBvcHVwIGZvciBlYWNoIHRvb2x0aXAgaWNvblxuICAgICAgICAkKCcuZmllbGQtaW5mby1pY29uJykuZWFjaCgoaW5kZXgsIGVsZW1lbnQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRpY29uID0gJChlbGVtZW50KTtcbiAgICAgICAgICAgIGNvbnN0IGZpZWxkTmFtZSA9ICRpY29uLmRhdGEoJ2ZpZWxkJyk7XG4gICAgICAgICAgICBjb25zdCBjb250ZW50ID0gdG9vbHRpcENvbmZpZ3NbZmllbGROYW1lXTtcblxuICAgICAgICAgICAgaWYgKGNvbnRlbnQpIHtcbiAgICAgICAgICAgICAgICAkaWNvbi5wb3B1cCh7XG4gICAgICAgICAgICAgICAgICAgIGh0bWw6IGNvbnRlbnQsXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIHJpZ2h0JyxcbiAgICAgICAgICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICBkZWxheToge1xuICAgICAgICAgICAgICAgICAgICAgICAgc2hvdzogMzAwLFxuICAgICAgICAgICAgICAgICAgICAgICAgaGlkZTogMTAwXG4gICAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ2Zsb3dpbmcnXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IHN0b3JhZ2VJbmRleC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKCFyZXNwb25zZS5zdWNjZXNzKSB7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBjdXN0b20gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IHN0b3JhZ2VJbmRleC4kZm9ybU9iajtcbiAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uID0gc3RvcmFnZUluZGV4LiRzdWJtaXRCdXR0b247XG4gICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0ID0gc3RvcmFnZUluZGV4LiRkcm9wZG93blN1Ym1pdDtcbiAgICAgICAgRm9ybS4kZGlycnR5RmllbGQgPSBzdG9yYWdlSW5kZXguJGRpcnJ0eUZpZWxkO1xuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBzdG9yYWdlSW5kZXgudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gc3RvcmFnZUluZGV4LmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gc3RvcmFnZUluZGV4LmNiQWZ0ZXJTZW5kRm9ybTtcblxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUEkgc2V0dGluZ3MgZm9yIEZvcm0uanMgKHNpbmdsZXRvbiByZXNvdXJjZSlcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBhcGlPYmplY3Q6IFN0b3JhZ2VBUEksXG4gICAgICAgICAgICBzYXZlTWV0aG9kOiAndXBkYXRlJyAvLyBVc2luZyBzdGFuZGFyZCBQVVQgZm9yIHNpbmdsZXRvbiB1cGRhdGVcbiAgICAgICAgfTtcblxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9XG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgc3RvcmFnZSBtYW5hZ2VtZW50IGludGVyZmFjZS5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBzdG9yYWdlSW5kZXguaW5pdGlhbGl6ZSgpO1xufSk7Il19