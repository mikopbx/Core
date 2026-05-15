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
   * Whether a benchmark run is currently in flight. Prevents the user
   * from kicking off a second concurrent dd run by spam-clicking the
   * button while the first one is still blocking the server worker.
   * @type {boolean}
   */
  benchmarkRunning: false,

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

    storageIndex.loadStorageData(); // Disk benchmark — load cached result and wire the "run" button.

    storageIndex.initializeDiskBenchmark();
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
   * Wire the disk benchmark card: load the last cached measurement on
   * page open, hand the "Run again" button to runDiskBenchmark().
   */
  initializeDiskBenchmark: function initializeDiskBenchmark() {
    StorageAPI.getIoBenchmark(function (response) {
      if (response.result && response.data) {
        storageIndex.renderDiskBenchmark(response.data);
      } else {
        storageIndex.showDiskBenchmarkEmpty();
      }
    });
    $('#disk-benchmark-run-button').off('click.diskbench').on('click.diskbench', function (e) {
      e.preventDefault();
      storageIndex.runDiskBenchmark();
    });
  },

  /**
   * Show the "no measurement yet" state.
   */
  showDiskBenchmarkEmpty: function showDiskBenchmarkEmpty() {
    $('#disk-speed-empty').show();
    $('#disk-speed-result').hide();
    $('#disk-speed-running').hide();
  },

  /**
   * Show the dd write/read numbers and the timestamp from the cached
   * result. Both numbers are pre-rounded server-side; we only format
   * the localised date here.
   *
   * @param {{writeMBps:number, readMBps:number, measuredAt:number}} data
   */
  renderDiskBenchmark: function renderDiskBenchmark(data) {
    $('#disk-speed-empty').hide();
    $('#disk-speed-running').hide();
    $('#disk-speed-result').css('display', 'inline-flex');
    $('#disk-benchmark-write').text(typeof data.writeMBps === 'number' ? data.writeMBps.toFixed(1) : '—');
    $('#disk-benchmark-read').text(typeof data.readMBps === 'number' ? data.readMBps.toFixed(1) : '—');

    if (data.measuredAt) {
      var d = new Date(data.measuredAt * 1000);

      var pad = function pad(n) {
        return String(n).padStart(2, '0');
      };

      $('#disk-benchmark-measured-at').text("".concat(pad(d.getDate()), ".").concat(pad(d.getMonth() + 1), ".").concat(d.getFullYear(), " ") + "".concat(pad(d.getHours()), ":").concat(pad(d.getMinutes())));
    } else {
      $('#disk-benchmark-measured-at').text('—');
    }
  },

  /**
   * Kick off a fresh benchmark. The POST blocks server-side for ~5–30 s
   * while dd runs both phases; we just toggle the running state and
   * re-render with whatever the server returns.
   */
  runDiskBenchmark: function runDiskBenchmark() {
    if (storageIndex.benchmarkRunning) {
      return;
    }

    storageIndex.benchmarkRunning = true;
    $('#disk-speed-empty').hide();
    $('#disk-speed-result').hide();
    $('#disk-speed-running').show();
    $('#disk-benchmark-run-button').prop('disabled', true);
    StorageAPI.runIoBenchmark(function (response) {
      storageIndex.benchmarkRunning = false;
      $('#disk-benchmark-run-button').prop('disabled', false);

      if (response.result && response.data) {
        storageIndex.renderDiskBenchmark(response.data);
      } else {
        storageIndex.showDiskBenchmarkEmpty();

        if (typeof UserMessage !== 'undefined' && response.messages) {
          UserMessage.showMultiString(response.messages);
        }
      }
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TdG9yYWdlL3N0b3JhZ2UtaW5kZXguanMiXSwibmFtZXMiOlsic3RvcmFnZUluZGV4IiwiJGZvcm1PYmoiLCIkc3VibWl0QnV0dG9uIiwiJGRyb3Bkb3duU3VibWl0IiwiJGRpcnJ0eUZpZWxkIiwiJHJlY29yZHNTYXZlUGVyaW9kU2xpZGVyIiwic2F2ZVJlY29yZHNQZXJpb2QiLCJ2YWxpZGF0ZVJ1bGVzIiwiczNFbmRwb2ludFByZXNldE5vdGUiLCJiZW5jaG1hcmtSdW5uaW5nIiwiaW5pdGlhbGl6ZSIsIiQiLCJmaW5kIiwidGFiIiwiaGlzdG9yeSIsImhpc3RvcnlUeXBlIiwib25WaXNpYmxlIiwidGFiUGF0aCIsImxvYWRTdG9yYWdlRGF0YSIsImluaXRpYWxpemVGb3JtIiwiczNTdG9yYWdlSW5kZXgiLCJzbGlkZXIiLCJtaW4iLCJtYXgiLCJzdGVwIiwic21vb3RoIiwiYXV0b0FkanVzdExhYmVscyIsImludGVycHJldExhYmVsIiwidmFsdWUiLCJsYWJlbHMiLCJnbG9iYWxUcmFuc2xhdGUiLCJzdF9TdG9yZTFNb250aE9mUmVjb3JkcyIsInN0X1N0b3JlM01vbnRoc09mUmVjb3JkcyIsInN0X1N0b3JlNk1vbnRoc09mUmVjb3JkcyIsInN0X1N0b3JlMVllYXJPZlJlY29yZHMiLCJzdF9TdG9yZTNZZWFyc09mUmVjb3JkcyIsInN0X1N0b3JlQWxsUG9zc2libGVSZWNvcmRzIiwib25DaGFuZ2UiLCJjYkFmdGVyU2VsZWN0U2F2ZVBlcmlvZFNsaWRlciIsImluaXRpYWxpemVUb29sdGlwcyIsImxvYWRTZXR0aW5ncyIsImluaXRpYWxpemVEaXNrQmVuY2htYXJrIiwic2F2ZVBlcmlvZCIsImZvcm0iLCJ1cGRhdGVTbGlkZXJMaW1pdHMiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJTdG9yYWdlQVBJIiwiZ2V0IiwicmVzcG9uc2UiLCJyZXN1bHQiLCJkYXRhIiwiUEJYUmVjb3JkU2F2ZVBlcmlvZCIsInJlY29yZFNhdmVQZXJpb2QiLCJzbGlkZXJJbmRleCIsImluZGV4T2YiLCJhZGRDbGFzcyIsImhpZGUiLCJnZXRVc2FnZSIsInJlbmRlclN0b3JhZ2VEYXRhIiwicmVtb3ZlQ2xhc3MiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsInN0X1N0b3JhZ2VMb2FkRXJyb3IiLCJzaG93IiwiZm9ybWF0U2l6ZSIsInNpemVJbk1iIiwidG9GaXhlZCIsInRleHQiLCJ1c2VkX3NwYWNlIiwidG90YWxfc2l6ZSIsImFjY3VtdWxhdGVkV2lkdGgiLCJmb3JFYWNoIiwiY2F0ZWdvcnkiLCJjYXREYXRhIiwiY2F0ZWdvcmllcyIsIiRzZWdtZW50IiwicGVyY2VudGFnZSIsImNzcyIsImNhdGVnb3J5S2V5Iiwic3BsaXQiLCJtYXAiLCJ3b3JkIiwiY2hhckF0IiwidG9VcHBlckNhc2UiLCJzbGljZSIsImpvaW4iLCJhdHRyIiwic2l6ZSIsIl9ob3ZlckJvdW5kIiwib24iLCJlIiwidG9vbHRpcCIsImFwcGVuZCIsImRvY3VtZW50IiwiZXYiLCJsZWZ0IiwicGFnZVgiLCJ0b3AiLCJwYWdlWSIsInJlbW92ZSIsIm9mZiIsInJlbW90ZV9zdG9yYWdlIiwiczMiLCJlbmFibGVkIiwic3RfUzNSZW1vdGVTdG9yYWdlVGl0bGUiLCJzdF9TM1JlbW90ZVN0b3JhZ2VJbmZvIiwicmVwbGFjZSIsImZpbGVzX2NvdW50IiwidG9Mb2NhbGVTdHJpbmciLCJidWNrZXQiLCJnZXRJb0JlbmNobWFyayIsInJlbmRlckRpc2tCZW5jaG1hcmsiLCJzaG93RGlza0JlbmNobWFya0VtcHR5IiwicHJldmVudERlZmF1bHQiLCJydW5EaXNrQmVuY2htYXJrIiwid3JpdGVNQnBzIiwicmVhZE1CcHMiLCJtZWFzdXJlZEF0IiwiZCIsIkRhdGUiLCJwYWQiLCJuIiwiU3RyaW5nIiwicGFkU3RhcnQiLCJnZXREYXRlIiwiZ2V0TW9udGgiLCJnZXRGdWxsWWVhciIsImdldEhvdXJzIiwiZ2V0TWludXRlcyIsInByb3AiLCJydW5Jb0JlbmNobWFyayIsIm1lc3NhZ2VzIiwiYnVpbGRUb29sdGlwQ29udGVudCIsImNvbmZpZyIsImh0bWwiLCJoZWFkZXIiLCJkZXNjcmlwdGlvbiIsImxpc3QiLCJsZW5ndGgiLCJpdGVtIiwidGVybSIsImRlZmluaXRpb24iLCJpIiwibGlzdEtleSIsIndhcm5pbmciLCJleGFtcGxlcyIsImV4YW1wbGVzSGVhZGVyIiwibm90ZSIsImJ1aWxkUzNFbmRwb2ludFRvb2x0aXBDb250ZW50Iiwic3RfdG9vbHRpcF9zM19lbmRwb2ludF9oZWFkZXIiLCJzdF90b29sdGlwX3MzX2VuZHBvaW50X2Rlc2MiLCJzdF90b29sdGlwX2V4YW1wbGVzIiwic2V0UzNFbmRwb2ludFByZXNldE5vdGUiLCIkaWNvbiIsInBvcHVwIiwidG9vbHRpcENvbmZpZ3MiLCJyZWNvcmRfcmV0ZW50aW9uX3BlcmlvZCIsInN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9oZWFkZXIiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25fZGVzYyIsInN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9pdGVtMSIsInN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9pdGVtMiIsInN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9pdGVtMyIsInN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9pdGVtNCIsInN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl93YXJuaW5nX2hlYWRlciIsInN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl93YXJuaW5nIiwiczNfZW5hYmxlZCIsInN0X3Rvb2x0aXBfczNfZW5hYmxlZF9oZWFkZXIiLCJzdF90b29sdGlwX3MzX2VuYWJsZWRfZGVzYyIsInN0X3Rvb2x0aXBfczNfZW5hYmxlZF9pdGVtMSIsInN0X3Rvb2x0aXBfczNfZW5hYmxlZF9pdGVtMiIsInN0X3Rvb2x0aXBfczNfZW5hYmxlZF9pdGVtMyIsInMzX3Byb3ZpZGVyX3ByZXNldCIsInN0X3Rvb2x0aXBfczNfcHJlc2V0X2hlYWRlciIsInN0X3Rvb2x0aXBfczNfcHJlc2V0X2Rlc2MiLCJzM19lbmRwb2ludCIsInMzX3JlZ2lvbiIsInN0X3Rvb2x0aXBfczNfcmVnaW9uX2hlYWRlciIsInN0X3Rvb2x0aXBfczNfcmVnaW9uX2Rlc2MiLCJzdF90b29sdGlwX3MzX3JlZ2lvbl9ub3RlIiwiczNfYnVja2V0Iiwic3RfdG9vbHRpcF9zM19idWNrZXRfaGVhZGVyIiwic3RfdG9vbHRpcF9zM19idWNrZXRfZGVzYyIsInN0X3Rvb2x0aXBfczNfYnVja2V0X2l0ZW0xIiwic3RfdG9vbHRpcF9zM19idWNrZXRfaXRlbTIiLCJzdF90b29sdGlwX3MzX2J1Y2tldF9pdGVtMyIsInMzX2FjY2Vzc19rZXkiLCJzdF90b29sdGlwX3MzX2FjY2Vzc19rZXlfaGVhZGVyIiwic3RfdG9vbHRpcF9zM19hY2Nlc3Nfa2V5X2Rlc2MiLCJzdF90b29sdGlwX3MzX2FjY2Vzc19rZXlfbm90ZSIsInMzX3NlY3JldF9rZXkiLCJzdF90b29sdGlwX3MzX3NlY3JldF9rZXlfaGVhZGVyIiwic3RfdG9vbHRpcF9zM19zZWNyZXRfa2V5X2Rlc2MiLCJzdF90b29sdGlwX3dhcm5pbmciLCJzdF90b29sdGlwX3MzX3NlY3JldF9rZXlfd2FybmluZyIsImxvY2FsX3JldGVudGlvbl9wZXJpb2QiLCJzdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9oZWFkZXIiLCJzdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9kZXNjIiwic3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25faXRlbTEiLCJzdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9pdGVtMiIsInN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2l0ZW0zIiwic3RfdG9vbHRpcF9ub3RlIiwic3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25fd2FybmluZyIsImVhY2giLCJpbmRleCIsImVsZW1lbnQiLCJmaWVsZE5hbWUiLCJjb250ZW50IiwicG9zaXRpb24iLCJob3ZlcmFibGUiLCJkZWxheSIsInZhcmlhdGlvbiIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsImNiQWZ0ZXJTZW5kRm9ybSIsInN1Y2Nlc3MiLCJhcGlTZXR0aW5ncyIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFlBQVksR0FBRztBQUNqQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFLElBUE87O0FBU2pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFBRSxJQWJFOztBQWVqQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxlQUFlLEVBQUUsSUFuQkE7O0FBcUJqQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxZQUFZLEVBQUUsSUF6Qkc7O0FBMkJqQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSx3QkFBd0IsRUFBRSxJQS9CVDs7QUFrQ2pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGlCQUFpQixFQUFFLENBQUMsSUFBRCxFQUFPLElBQVAsRUFBYSxLQUFiLEVBQW9CLEtBQXBCLEVBQTJCLE1BQTNCLEVBQW1DLEVBQW5DLENBdENGOztBQTBDakI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFLEVBOUNFOztBQWdEakI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsb0JBQW9CLEVBQUUsRUF2REw7O0FBeURqQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsZ0JBQWdCLEVBQUUsS0EvREQ7O0FBaUVqQjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsVUFwRWlCLHdCQW9FSjtBQUNUVixJQUFBQSxZQUFZLENBQUNDLFFBQWIsR0FBd0JVLENBQUMsQ0FBQyxxQkFBRCxDQUF6QjtBQUNBWCxJQUFBQSxZQUFZ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OztBQTRuQmpCO0FBQ0o7QUFDQTtBQUNJekMsRUFBQUEsY0EvbkJpQiw0QkErbkJBO0FBQ2IwQixJQUFBQSxJQUFJLENBQUM1QyxRQUFMLEdBQWdCRCxZQUFZLENBQUNDLFFBQTdCO0FBQ0E0QyxJQUFBQSxJQUFJLENBQUMzQyxhQUFMLEdBQXFCRixZQUFZLENBQUNFLGFBQWxDO0FBQ0EyQyxJQUFBQSxJQUFJLENBQUMxQyxlQUFMLEdBQXVCSCxZQUFZLENBQUNHLGVBQXBDO0FBQ0EwQyxJQUFBQSxJQUFJLENBQUN6QyxZQUFMLEdBQW9CSixZQUFZLENBQUNJLFlBQWpDO0FBQ0F5QyxJQUFBQSxJQUFJLENBQUN0QyxhQUFMLEdBQXFCUCxZQUFZLENBQUNPLGFBQWxDO0FBQ0FzQyxJQUFBQSxJQUFJLENBQUN1SyxnQkFBTCxHQUF3QnBOLFlBQVksQ0FBQ29OLGdCQUFyQztBQUNBdkssSUFBQUEsSUFBSSxDQUFDeUssZUFBTCxHQUF1QnROLFlBQVksQ0FBQ3NOLGVBQXBDLENBUGEsQ0FTYjs7QUFDQXpLLElBQUFBLElBQUksQ0FBQzJLLFdBQUwsR0FBbUI7QUFDZmhILE1BQUFBLE9BQU8sRUFBRSxJQURNO0FBRWZpSCxNQUFBQSxTQUFTLEVBQUUxSyxVQUZJO0FBR2YySyxNQUFBQSxVQUFVLEVBQUUsUUFIRyxDQUdNOztBQUhOLEtBQW5CO0FBTUE3SyxJQUFBQSxJQUFJLENBQUNuQyxVQUFMO0FBQ0g7QUFocEJnQixDQUFyQixDLENBbXBCQTs7QUFDQUMsQ0FBQyxDQUFDbUYsUUFBRCxDQUFELENBQVk2SCxLQUFaLENBQWtCLFlBQU07QUFDcEIzTixFQUFBQSxZQUFZLENBQUNVLFVBQWI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgU3RvcmFnZUFQSSwgVXNlck1lc3NhZ2UsIHMzU3RvcmFnZUluZGV4LCAkICovXG5cbi8qKlxuICogU3RvcmFnZSBtYW5hZ2VtZW50IG1vZHVsZVxuICovXG5jb25zdCBzdG9yYWdlSW5kZXggPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGxvY2FsIHN0b3JhZ2UgZm9ybSAoVGFiIDIpLlxuICAgICAqIFNlbmRzIGRhdGEgdG86IFBBVENIIC9wYnhjb3JlL2FwaS92My9zdG9yYWdlLlxuICAgICAqIFJlc29sdmVkIGluIGluaXRpYWxpemUoKSDigJQgbXVzdCBub3QgY2FsbCAkKCkgYXQgbW9kdWxlLWxvYWQgdGltZS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHN1Ym1pdCBidXR0b24gKHVuaXF1ZSB0byB0aGlzIGZvcm0pLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHN1Ym1pdEJ1dHRvbjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBkcm9wZG93biBzdWJtaXQgKHVuaXF1ZSB0byB0aGlzIGZvcm0pLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRyb3Bkb3duU3VibWl0OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGRpcnR5IGZpZWxkICh1bmlxdWUgdG8gdGhpcyBmb3JtKS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkaXJydHlGaWVsZDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSByZWNvcmRzIHJldGVudGlvbiBwZXJpb2Qgc2xpZGVyLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHJlY29yZHNTYXZlUGVyaW9kU2xpZGVyOiBudWxsLFxuXG5cbiAgICAvKipcbiAgICAgKiBQb3NzaWJsZSBwZXJpb2QgdmFsdWVzIGZvciB0aGUgcmVjb3JkcyByZXRlbnRpb24uXG4gICAgICogVmFsdWVzIGluIGRheXM6IDMwLCA5MCwgMTgwLCAzNjAsIDEwODAsICcnIChpbmZpbml0eSlcbiAgICAgKi9cbiAgICBzYXZlUmVjb3Jkc1BlcmlvZDogWyczMCcsICc5MCcsICcxODAnLCAnMzYwJywgJzEwODAnLCAnJ10sXG5cblxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGxvY2FsIHN0b3JhZ2UgZm9ybS5cbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHt9LFxuXG4gICAgLyoqXG4gICAgICogUGVyLXByZXNldCBub3RlIGFwcGVuZGVkIHRvIHRoZSBzM19lbmRwb2ludCBmaWVsZCB0b29sdGlwLiBVcGRhdGVkXG4gICAgICogYnkgc2V0UzNFbmRwb2ludFByZXNldE5vdGUoKSBlYWNoIHRpbWUgdGhlIG9wZXJhdG9yIHBpY2tzIGEgZGlmZmVyZW50XG4gICAgICogcHJvdmlkZXIgcHJlc2V0OyByZW5kZXJlZCBhcyB0aGUgYG5vdGVgIHNsb3Qgb2YgdGhlIHMzX2VuZHBvaW50XG4gICAgICogdG9vbHRpcCBjb25maWcgc28gYWxsIHBlci1maWVsZCBoaW50cyBzdGF5IGluIG9uZSBwbGFjZS5cbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIHMzRW5kcG9pbnRQcmVzZXROb3RlOiAnJyxcbiAgICBcbiAgICAvKipcbiAgICAgKiBXaGV0aGVyIGEgYmVuY2htYXJrIHJ1biBpcyBjdXJyZW50bHkgaW4gZmxpZ2h0LiBQcmV2ZW50cyB0aGUgdXNlclxuICAgICAqIGZyb20ga2lja2luZyBvZmYgYSBzZWNvbmQgY29uY3VycmVudCBkZCBydW4gYnkgc3BhbS1jbGlja2luZyB0aGVcbiAgICAgKiBidXR0b24gd2hpbGUgdGhlIGZpcnN0IG9uZSBpcyBzdGlsbCBibG9ja2luZyB0aGUgc2VydmVyIHdvcmtlci5cbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBiZW5jaG1hcmtSdW5uaW5nOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgbW9kdWxlIHdpdGggZXZlbnQgYmluZGluZ3MgYW5kIGNvbXBvbmVudCBpbml0aWFsaXphdGlvbnMuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgc3RvcmFnZUluZGV4LiRmb3JtT2JqID0gJCgnI2xvY2FsLXN0b3JhZ2UtZm9ybScpO1xuICAgICAgICBzdG9yYWdlSW5kZXguJHN1Ym1pdEJ1dHRvbiA9ICQoJyNzdWJtaXRidXR0b24tbG9jYWwnKTtcbiAgICAgICAgc3RvcmFnZUluZGV4LiRkcm9wZG93blN1Ym1pdCA9ICQoJyNkcm9wZG93blN1Ym1pdC1sb2NhbCcpO1xuICAgICAgICBzdG9yYWdlSW5kZXguJGRpcnJ0eUZpZWxkID0gJCgnI2RpcnJ0eS1sb2NhbCcpO1xuICAgICAgICBzdG9yYWdlSW5kZXguJHJlY29yZHNTYXZlUGVyaW9kU2xpZGVyID0gJCgnI1BCWFJlY29yZFNhdmVQZXJpb2RTbGlkZXInKTtcblxuICAgICAgICAvLyBFbmFibGUgdGFiIG5hdmlnYXRpb25cbiAgICAgICAgJCgnI3N0b3JhZ2UtbWVudScpLmZpbmQoJy5pdGVtJykudGFiKHtcbiAgICAgICAgICAgICAgICBoaXN0b3J5OiB0cnVlLFxuICAgICAgICAgICAgICAgIGhpc3RvcnlUeXBlOiAnaGFzaCcsXG4gICAgICAgICAgICAgICAgICAgb25WaXNpYmxlOiBmdW5jdGlvbih0YWJQYXRoKSB7XG4gICAgICAgICAgICAgICAgLy8gTG9hZCBzdG9yYWdlIGRhdGEgd2hlbiBzdG9yYWdlIGluZm8gdGFiIGlzIGFjdGl2YXRlZFxuICAgICAgICAgICAgICAgIGlmICh0YWJQYXRoID09PSAnc3RvcmFnZS1pbmZvJykge1xuICAgICAgICAgICAgICAgICAgICBzdG9yYWdlSW5kZXgubG9hZFN0b3JhZ2VEYXRhKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgbG9jYWwgc3RvcmFnZSBmb3JtIHdoZW4gdGFiIGJlY29tZXMgdmlzaWJsZVxuICAgICAgICAgICAgICAgIGlmICh0YWJQYXRoID09PSAnc3RvcmFnZS1sb2NhbCcpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RvcmFnZUluZGV4LmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIC8vIFJlLWluaXRpYWxpemUgUzMgZm9ybSB3aGVuIGNsb3VkIHRhYiBiZWNvbWVzIHZpc2libGVcbiAgICAgICAgICAgICAgICBpZiAodGFiUGF0aCA9PT0gJ3N0b3JhZ2UtY2xvdWQnICYmIHR5cGVvZiBzM1N0b3JhZ2VJbmRleCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHJlY29yZHMgc2F2ZSBwZXJpb2Qgc2xpZGVyXG4gICAgICAgIHN0b3JhZ2VJbmRleC4kcmVjb3Jkc1NhdmVQZXJpb2RTbGlkZXJcbiAgICAgICAgICAgIC5zbGlkZXIoe1xuICAgICAgICAgICAgICAgIG1pbjogMCxcbiAgICAgICAgICAgICAgICBtYXg6IDUsXG4gICAgICAgICAgICAgICAgc3RlcDogMSxcbiAgICAgICAgICAgICAgICBzbW9vdGg6IHRydWUsXG4gICAgICAgICAgICAgICAgYXV0b0FkanVzdExhYmVsczogZmFsc2UsXG4gICAgICAgICAgICAgICAgaW50ZXJwcmV0TGFiZWw6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsYWJlbHMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAwOiBnbG9iYWxUcmFuc2xhdGUuc3RfU3RvcmUxTW9udGhPZlJlY29yZHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAxOiBnbG9iYWxUcmFuc2xhdGUuc3RfU3RvcmUzTW9udGhzT2ZSZWNvcmRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgMjogZ2xvYmFsVHJhbnNsYXRlLnN0X1N0b3JlNk1vbnRoc09mUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIDM6IGdsb2JhbFRyYW5zbGF0ZS5zdF9TdG9yZTFZZWFyT2ZSZWNvcmRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgNDogZ2xvYmFsVHJhbnNsYXRlLnN0X1N0b3JlM1llYXJzT2ZSZWNvcmRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgNTogZ2xvYmFsVHJhbnNsYXRlLnN0X1N0b3JlQWxsUG9zc2libGVSZWNvcmRzLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGFiZWxzW3ZhbHVlXSB8fCAnJztcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiBzdG9yYWdlSW5kZXguY2JBZnRlclNlbGVjdFNhdmVQZXJpb2RTbGlkZXIsXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRvb2x0aXBzXG4gICAgICAgIHN0b3JhZ2VJbmRleC5pbml0aWFsaXplVG9vbHRpcHMoKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIHRoZSBmb3JtXG4gICAgICAgIHN0b3JhZ2VJbmRleC5pbml0aWFsaXplRm9ybSgpO1xuXG4gICAgICAgIC8vIExvYWQgc2V0dGluZ3MgZnJvbSBBUElcbiAgICAgICAgc3RvcmFnZUluZGV4LmxvYWRTZXR0aW5ncygpO1xuXG4gICAgICAgIC8vIExvYWQgc3RvcmFnZSBkYXRhIG9uIHBhZ2UgbG9hZFxuICAgICAgICBzdG9yYWdlSW5kZXgubG9hZFN0b3JhZ2VEYXRhKCk7XG5cbiAgICAgICAgLy8gRGlzayBiZW5jaG1hcmsg4oCUIGxvYWQgY2FjaGVkIHJlc3VsdCBhbmQgd2lyZSB0aGUgXCJydW5cIiBidXR0b24uXG4gICAgICAgIHN0b3JhZ2VJbmRleC5pbml0aWFsaXplRGlza0JlbmNobWFyaygpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSGFuZGxlIGV2ZW50IGFmdGVyIHRoZSBzZWxlY3Qgc2F2ZSBwZXJpb2Qgc2xpZGVyIGlzIGNoYW5nZWQuXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHZhbHVlIC0gVGhlIHNlbGVjdGVkIHZhbHVlIGZyb20gdGhlIHNsaWRlci5cbiAgICAgKi9cbiAgICBjYkFmdGVyU2VsZWN0U2F2ZVBlcmlvZFNsaWRlcih2YWx1ZSkge1xuICAgICAgICAvLyBHZXQgdGhlIHNhdmUgcGVyaW9kIGNvcnJlc3BvbmRpbmcgdG8gdGhlIHNsaWRlciB2YWx1ZS5cbiAgICAgICAgY29uc3Qgc2F2ZVBlcmlvZCA9IHN0b3JhZ2VJbmRleC5zYXZlUmVjb3Jkc1BlcmlvZFt2YWx1ZV07XG5cbiAgICAgICAgLy8gU2V0IHRoZSBmb3JtIHZhbHVlIGZvciAnUEJYUmVjb3JkU2F2ZVBlcmlvZCcgdG8gdGhlIHNlbGVjdGVkIHNhdmUgcGVyaW9kLlxuICAgICAgICBzdG9yYWdlSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1BCWFJlY29yZFNhdmVQZXJpb2QnLCBzYXZlUGVyaW9kKTtcblxuICAgICAgICAvLyBVcGRhdGUgUzMgbG9jYWwgcmV0ZW50aW9uIHNsaWRlciBtYXhpbXVtIChpZiBTMyBtb2R1bGUgbG9hZGVkKVxuICAgICAgICBpZiAodHlwZW9mIHMzU3RvcmFnZUluZGV4ICE9PSAndW5kZWZpbmVkJyAmJiBzM1N0b3JhZ2VJbmRleC51cGRhdGVTbGlkZXJMaW1pdHMpIHtcbiAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LnVwZGF0ZVNsaWRlckxpbWl0cyhzYXZlUGVyaW9kKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50IHRvIGFja25vd2xlZGdlIHRoZSBtb2RpZmljYXRpb25cbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG5cblxuICAgIC8qKlxuICAgICAqIExvYWQgU3RvcmFnZSBzZXR0aW5ncyBmcm9tIEFQSVxuICAgICAqL1xuICAgIGxvYWRTZXR0aW5ncygpIHtcbiAgICAgICAgU3RvcmFnZUFQSS5nZXQoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuZGF0YTtcblxuICAgICAgICAgICAgICAgIC8vIFNldCBmb3JtIHZhbHVlcyBmb3IgbG9jYWwgc3RvcmFnZSBvbmx5XG4gICAgICAgICAgICAgICAgc3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZXMnLCB7XG4gICAgICAgICAgICAgICAgICAgIFBCWFJlY29yZFNhdmVQZXJpb2Q6IGRhdGEuUEJYUmVjb3JkU2F2ZVBlcmlvZCB8fCAnJ1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRvdGFsIHJldGVudGlvbiBwZXJpb2Qgc2xpZGVyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVjb3JkU2F2ZVBlcmlvZCA9IGRhdGEuUEJYUmVjb3JkU2F2ZVBlcmlvZCB8fCAnJztcbiAgICAgICAgICAgICAgICBjb25zdCBzbGlkZXJJbmRleCA9IHN0b3JhZ2VJbmRleC5zYXZlUmVjb3Jkc1BlcmlvZC5pbmRleE9mKHJlY29yZFNhdmVQZXJpb2QpO1xuICAgICAgICAgICAgICAgIHN0b3JhZ2VJbmRleC4kcmVjb3Jkc1NhdmVQZXJpb2RTbGlkZXIuc2xpZGVyKFxuICAgICAgICAgICAgICAgICAgICAnc2V0IHZhbHVlJyxcbiAgICAgICAgICAgICAgICAgICAgc2xpZGVySW5kZXgsXG4gICAgICAgICAgICAgICAgICAgIGZhbHNlXG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIC8vIE5vdGlmeSBTMyBtb2R1bGUgYWJvdXQgdG90YWwgcmV0ZW50aW9uIGNoYW5nZSAoaWYgbG9hZGVkKVxuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgczNTdG9yYWdlSW5kZXggIT09ICd1bmRlZmluZWQnICYmIHMzU3RvcmFnZUluZGV4LnVwZGF0ZVNsaWRlckxpbWl0cykge1xuICAgICAgICAgICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC51cGRhdGVTbGlkZXJMaW1pdHMocmVjb3JkU2F2ZVBlcmlvZCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExvYWQgc3RvcmFnZSB1c2FnZSBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgbG9hZFN0b3JhZ2VEYXRhKCkge1xuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgJCgnI3N0b3JhZ2UtdXNhZ2UtY29udGFpbmVyIC5kaW1tZXInKS5hZGRDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICQoJyNzdG9yYWdlLWRldGFpbHMnKS5oaWRlKCk7XG5cbiAgICAgICAgLy8gTWFrZSBBUEkgY2FsbCB0byBnZXQgc3RvcmFnZSB1c2FnZSB1c2luZyBuZXcgU3RvcmFnZUFQSVxuICAgICAgICBTdG9yYWdlQVBJLmdldFVzYWdlKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgc3RvcmFnZUluZGV4LnJlbmRlclN0b3JhZ2VEYXRhKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkKCcjc3RvcmFnZS11c2FnZS1jb250YWluZXIgLmRpbW1lcicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZ2xvYmFsVHJhbnNsYXRlLnN0X1N0b3JhZ2VMb2FkRXJyb3IpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFJlbmRlciBzdG9yYWdlIHVzYWdlIGRhdGEgaW4gdGhlIFVJXG4gICAgICovXG4gICAgcmVuZGVyU3RvcmFnZURhdGEoZGF0YSkge1xuICAgICAgICAvLyBIaWRlIGxvYWRpbmcgYW5kIHNob3cgZGV0YWlsc1xuICAgICAgICAkKCcjc3RvcmFnZS11c2FnZS1jb250YWluZXIgLmRpbW1lcicpLnJlbW92ZUNsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgJCgnI3N0b3JhZ2UtZGV0YWlscycpLnNob3coKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEZvcm1hdCBzaXplIGZvciBkaXNwbGF5XG4gICAgICAgIGNvbnN0IGZvcm1hdFNpemUgPSAoc2l6ZUluTWIpID0+IHtcbiAgICAgICAgICAgIGlmIChzaXplSW5NYiA+PSAxMDI0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIChzaXplSW5NYiAvIDEwMjQpLnRvRml4ZWQoMSkgKyAnIEdCJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBzaXplSW5NYi50b0ZpeGVkKDEpICsgJyBNQic7XG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgaGVhZGVyIGluZm9ybWF0aW9uXG4gICAgICAgICQoJyN1c2VkLXNwYWNlLXRleHQnKS50ZXh0KGZvcm1hdFNpemUoZGF0YS51c2VkX3NwYWNlKSk7XG4gICAgICAgICQoJyN0b3RhbC1zaXplLXRleHQnKS50ZXh0KGZvcm1hdFNpemUoZGF0YS50b3RhbF9zaXplKSk7XG4gICAgICAgIFxuICAgICAgICAvLyBVcGRhdGUgcHJvZ3Jlc3Mgc2VnbWVudHMgaW4gbWFjT1Mgc3R5bGVcbiAgICAgICAgbGV0IGFjY3VtdWxhdGVkV2lkdGggPSAwO1xuICAgICAgICBcbiAgICAgICAgLy8gUHJvY2VzcyBlYWNoIGNhdGVnb3J5XG4gICAgICAgIFsnY2FsbF9yZWNvcmRpbmdzJywgJ2Nkcl9kYXRhYmFzZScsICdzeXN0ZW1fbG9ncycsICdtb2R1bGVzJywgJ2JhY2t1cHMnLCAnc3lzdGVtX2NhY2hlcycsICdzM19jYWNoZScsICdvdGhlciddLmZvckVhY2goY2F0ZWdvcnkgPT4ge1xuICAgICAgICAgICAgY29uc3QgY2F0RGF0YSA9IGRhdGEuY2F0ZWdvcmllc1tjYXRlZ29yeV07XG4gICAgICAgICAgICBjb25zdCAkc2VnbWVudCA9ICQoYC5wcm9ncmVzcy1zZWdtZW50W2RhdGEtY2F0ZWdvcnk9XCIke2NhdGVnb3J5fVwiXWApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoY2F0RGF0YSAmJiBjYXREYXRhLnBlcmNlbnRhZ2UgPiAwKSB7XG4gICAgICAgICAgICAgICAgJHNlZ21lbnQuY3NzKCd3aWR0aCcsIGNhdERhdGEucGVyY2VudGFnZSArICclJykuc2hvdygpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIEFkZCBob3ZlciB0b29sdGlwXG4gICAgICAgICAgICAgICAgY29uc3QgY2F0ZWdvcnlLZXkgPSAnc3RfQ2F0ZWdvcnknICsgY2F0ZWdvcnkuc3BsaXQoJ18nKS5tYXAod29yZCA9PiB3b3JkLmNoYXJBdCgwKS50b1VwcGVyQ2FzZSgpICsgd29yZC5zbGljZSgxKSkuam9pbignJyk7XG4gICAgICAgICAgICAgICAgJHNlZ21lbnQuYXR0cigndGl0bGUnLCBgJHtnbG9iYWxUcmFuc2xhdGVbY2F0ZWdvcnlLZXldIHx8IGNhdGVnb3J5fTogJHtmb3JtYXRTaXplKGNhdERhdGEuc2l6ZSl9ICgke2NhdERhdGEucGVyY2VudGFnZX0lKWApO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIGFjY3VtdWxhdGVkV2lkdGggKz0gY2F0RGF0YS5wZXJjZW50YWdlO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkc2VnbWVudC5oaWRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBjYXRlZ29yeSBzaXplIGluIGxpc3RcbiAgICAgICAgICAgICQoYCMke2NhdGVnb3J5fS1zaXplYCkudGV4dChmb3JtYXRTaXplKGNhdERhdGEgPyBjYXREYXRhLnNpemUgOiAwKSk7XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gQmluZCBob3ZlciBlZmZlY3RzIG9ubHkgb25jZSAobm90IG9uIGV2ZXJ5IGRhdGEgcmVmcmVzaClcbiAgICAgICAgaWYgKCFzdG9yYWdlSW5kZXguX2hvdmVyQm91bmQpIHtcbiAgICAgICAgICAgIHN0b3JhZ2VJbmRleC5faG92ZXJCb3VuZCA9IHRydWU7XG5cbiAgICAgICAgICAgIC8vIFRvb2x0aXAgZm9yIHByb2dyZXNzIHNlZ21lbnRzXG4gICAgICAgICAgICAkKCcjc3RvcmFnZS1wcm9ncmVzcycpLm9uKCdtb3VzZWVudGVyJywgJy5wcm9ncmVzcy1zZWdtZW50JywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCB0b29sdGlwID0gJCgnPGRpdiBjbGFzcz1cInN0b3JhZ2UtdG9vbHRpcFwiPjwvZGl2PicpLnRleHQoJCh0aGlzKS5hdHRyKCd0aXRsZScpKTtcbiAgICAgICAgICAgICAgICAkKCdib2R5JykuYXBwZW5kKHRvb2x0aXApO1xuICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLm9uKCdtb3VzZW1vdmUudG9vbHRpcCcsIGZ1bmN0aW9uIChldikge1xuICAgICAgICAgICAgICAgICAgICB0b29sdGlwLmNzcyh7IGxlZnQ6IGV2LnBhZ2VYICsgMTAsIHRvcDogZXYucGFnZVkgLSAzMCB9KTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0pLm9uKCdtb3VzZWxlYXZlJywgJy5wcm9ncmVzcy1zZWdtZW50JywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICQoJy5zdG9yYWdlLXRvb2x0aXAnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS5vZmYoJ21vdXNlbW92ZS50b29sdGlwJyk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgLy8gSGlnaGxpZ2h0IG1hdGNoaW5nIHByb2dyZXNzIHNlZ21lbnQgb24gY2F0ZWdvcnkgbGlzdCBob3ZlciB2aWEgQ1NTIGNsYXNzXG4gICAgICAgICAgICAkKCcuY2F0ZWdvcnktaXRlbScpLm9uKCdtb3VzZWVudGVyJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGNhdGVnb3J5ID0gJCh0aGlzKS5kYXRhKCdjYXRlZ29yeScpO1xuICAgICAgICAgICAgICAgICQoYC5wcm9ncmVzcy1zZWdtZW50W2RhdGEtY2F0ZWdvcnk9XCIke2NhdGVnb3J5fVwiXWApLmFkZENsYXNzKCdoaWdobGlnaHRlZCcpO1xuICAgICAgICAgICAgfSkub24oJ21vdXNlbGVhdmUnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgJCgnLnByb2dyZXNzLXNlZ21lbnQnKS5yZW1vdmVDbGFzcygnaGlnaGxpZ2h0ZWQnKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gUmVuZGVyIHJlbW90ZSBzdG9yYWdlIGluZm8gKFMzKVxuICAgICAgICBpZiAoZGF0YS5yZW1vdGVfc3RvcmFnZSAmJiBkYXRhLnJlbW90ZV9zdG9yYWdlLnMzICYmIGRhdGEucmVtb3RlX3N0b3JhZ2UuczMuZW5hYmxlZCAmJiBkYXRhLnJlbW90ZV9zdG9yYWdlLnMzLnNpemUgPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBzMyA9IGRhdGEucmVtb3RlX3N0b3JhZ2UuczM7XG4gICAgICAgICAgICAkKCcjcmVtb3RlLXN0b3JhZ2UtdGl0bGUnKS50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5zdF9TM1JlbW90ZVN0b3JhZ2VUaXRsZSk7XG4gICAgICAgICAgICAkKCcjcmVtb3RlLXN0b3JhZ2UtZGV0YWlscycpLnRleHQoXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X1MzUmVtb3RlU3RvcmFnZUluZm9cbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoJyVmaWxlcyUnLCBzMy5maWxlc19jb3VudC50b0xvY2FsZVN0cmluZygpKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgnJXNpemUlJywgZm9ybWF0U2l6ZShzMy5zaXplKSlcbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoJyVidWNrZXQlJywgczMuYnVja2V0KVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICQoJyNyZW1vdGUtc3RvcmFnZS1zZWN0aW9uJykuc2hvdygpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBXaXJlIHRoZSBkaXNrIGJlbmNobWFyayBjYXJkOiBsb2FkIHRoZSBsYXN0IGNhY2hlZCBtZWFzdXJlbWVudCBvblxuICAgICAqIHBhZ2Ugb3BlbiwgaGFuZCB0aGUgXCJSdW4gYWdhaW5cIiBidXR0b24gdG8gcnVuRGlza0JlbmNobWFyaygpLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVEaXNrQmVuY2htYXJrKCkge1xuICAgICAgICBTdG9yYWdlQVBJLmdldElvQmVuY2htYXJrKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgc3RvcmFnZUluZGV4LnJlbmRlckRpc2tCZW5jaG1hcmsocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN0b3JhZ2VJbmRleC5zaG93RGlza0JlbmNobWFya0VtcHR5KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgICQoJyNkaXNrLWJlbmNobWFyay1ydW4tYnV0dG9uJykub2ZmKCdjbGljay5kaXNrYmVuY2gnKS5vbignY2xpY2suZGlza2JlbmNoJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIHN0b3JhZ2VJbmRleC5ydW5EaXNrQmVuY2htYXJrKCk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93IHRoZSBcIm5vIG1lYXN1cmVtZW50IHlldFwiIHN0YXRlLlxuICAgICAqL1xuICAgIHNob3dEaXNrQmVuY2htYXJrRW1wdHkoKSB7XG4gICAgICAgICQoJyNkaXNrLXNwZWVkLWVtcHR5Jykuc2hvdygpO1xuICAgICAgICAkKCcjZGlzay1zcGVlZC1yZXN1bHQnKS5oaWRlKCk7XG4gICAgICAgICQoJyNkaXNrLXNwZWVkLXJ1bm5pbmcnKS5oaWRlKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3cgdGhlIGRkIHdyaXRlL3JlYWQgbnVtYmVycyBhbmQgdGhlIHRpbWVzdGFtcCBmcm9tIHRoZSBjYWNoZWRcbiAgICAgKiByZXN1bHQuIEJvdGggbnVtYmVycyBhcmUgcHJlLXJvdW5kZWQgc2VydmVyLXNpZGU7IHdlIG9ubHkgZm9ybWF0XG4gICAgICogdGhlIGxvY2FsaXNlZCBkYXRlIGhlcmUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3t3cml0ZU1CcHM6bnVtYmVyLCByZWFkTUJwczpudW1iZXIsIG1lYXN1cmVkQXQ6bnVtYmVyfX0gZGF0YVxuICAgICAqL1xuICAgIHJlbmRlckRpc2tCZW5jaG1hcmsoZGF0YSkge1xuICAgICAgICAkKCcjZGlzay1zcGVlZC1lbXB0eScpLmhpZGUoKTtcbiAgICAgICAgJCgnI2Rpc2stc3BlZWQtcnVubmluZycpLmhpZGUoKTtcbiAgICAgICAgJCgnI2Rpc2stc3BlZWQtcmVzdWx0JykuY3NzKCdkaXNwbGF5JywgJ2lubGluZS1mbGV4Jyk7XG5cbiAgICAgICAgJCgnI2Rpc2stYmVuY2htYXJrLXdyaXRlJykudGV4dChcbiAgICAgICAgICAgIHR5cGVvZiBkYXRhLndyaXRlTUJwcyA9PT0gJ251bWJlcicgPyBkYXRhLndyaXRlTUJwcy50b0ZpeGVkKDEpIDogJ+KAlCdcbiAgICAgICAgKTtcbiAgICAgICAgJCgnI2Rpc2stYmVuY2htYXJrLXJlYWQnKS50ZXh0KFxuICAgICAgICAgICAgdHlwZW9mIGRhdGEucmVhZE1CcHMgPT09ICdudW1iZXInID8gZGF0YS5yZWFkTUJwcy50b0ZpeGVkKDEpIDogJ+KAlCdcbiAgICAgICAgKTtcblxuICAgICAgICBpZiAoZGF0YS5tZWFzdXJlZEF0KSB7XG4gICAgICAgICAgICBjb25zdCBkID0gbmV3IERhdGUoZGF0YS5tZWFzdXJlZEF0ICogMTAwMCk7XG4gICAgICAgICAgICBjb25zdCBwYWQgPSAobikgPT4gU3RyaW5nKG4pLnBhZFN0YXJ0KDIsICcwJyk7XG4gICAgICAgICAgICAkKCcjZGlzay1iZW5jaG1hcmstbWVhc3VyZWQtYXQnKS50ZXh0KFxuICAgICAgICAgICAgICAgIGAke3BhZChkLmdldERhdGUoKSl9LiR7cGFkKGQuZ2V0TW9udGgoKSArIDEpfS4ke2QuZ2V0RnVsbFllYXIoKX0gYFxuICAgICAgICAgICAgICAgICsgYCR7cGFkKGQuZ2V0SG91cnMoKSl9OiR7cGFkKGQuZ2V0TWludXRlcygpKX1gXG4gICAgICAgICAgICApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCgnI2Rpc2stYmVuY2htYXJrLW1lYXN1cmVkLWF0JykudGV4dCgn4oCUJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogS2ljayBvZmYgYSBmcmVzaCBiZW5jaG1hcmsuIFRoZSBQT1NUIGJsb2NrcyBzZXJ2ZXItc2lkZSBmb3IgfjXigJMzMCBzXG4gICAgICogd2hpbGUgZGQgcnVucyBib3RoIHBoYXNlczsgd2UganVzdCB0b2dnbGUgdGhlIHJ1bm5pbmcgc3RhdGUgYW5kXG4gICAgICogcmUtcmVuZGVyIHdpdGggd2hhdGV2ZXIgdGhlIHNlcnZlciByZXR1cm5zLlxuICAgICAqL1xuICAgIHJ1bkRpc2tCZW5jaG1hcmsoKSB7XG4gICAgICAgIGlmIChzdG9yYWdlSW5kZXguYmVuY2htYXJrUnVubmluZykge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHN0b3JhZ2VJbmRleC5iZW5jaG1hcmtSdW5uaW5nID0gdHJ1ZTtcbiAgICAgICAgJCgnI2Rpc2stc3BlZWQtZW1wdHknKS5oaWRlKCk7XG4gICAgICAgICQoJyNkaXNrLXNwZWVkLXJlc3VsdCcpLmhpZGUoKTtcbiAgICAgICAgJCgnI2Rpc2stc3BlZWQtcnVubmluZycpLnNob3coKTtcbiAgICAgICAgJCgnI2Rpc2stYmVuY2htYXJrLXJ1bi1idXR0b24nKS5wcm9wKCdkaXNhYmxlZCcsIHRydWUpO1xuXG4gICAgICAgIFN0b3JhZ2VBUEkucnVuSW9CZW5jaG1hcmsoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBzdG9yYWdlSW5kZXguYmVuY2htYXJrUnVubmluZyA9IGZhbHNlO1xuICAgICAgICAgICAgJCgnI2Rpc2stYmVuY2htYXJrLXJ1bi1idXR0b24nKS5wcm9wKCdkaXNhYmxlZCcsIGZhbHNlKTtcblxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgc3RvcmFnZUluZGV4LnJlbmRlckRpc2tCZW5jaG1hcmsocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHN0b3JhZ2VJbmRleC5zaG93RGlza0JlbmNobWFya0VtcHR5KCk7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBVc2VyTWVzc2FnZSAhPT0gJ3VuZGVmaW5lZCcgJiYgcmVzcG9uc2UubWVzc2FnZXMpIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCBIVE1MIGNvbnRlbnQgZm9yIHRvb2x0aXAgcG9wdXBcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gY29uZmlnIC0gVG9vbHRpcCBjb25maWd1cmF0aW9uIG9iamVjdFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUwgc3RyaW5nIGZvciBwb3B1cCBjb250ZW50XG4gICAgICovXG4gICAgYnVpbGRUb29sdGlwQ29udGVudChjb25maWcpIHtcbiAgICAgICAgbGV0IGh0bWwgPSAnPGRpdiBjbGFzcz1cInVpIHJlbGF4ZWQgbGlzdFwiPic7XG5cbiAgICAgICAgLy8gSGVhZGVyXG4gICAgICAgIGlmIChjb25maWcuaGVhZGVyKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxzdHJvbmc+JHtjb25maWcuaGVhZGVyfTwvc3Ryb25nPjwvZGl2PmA7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBEZXNjcmlwdGlvblxuICAgICAgICBpZiAoY29uZmlnLmRlc2NyaXB0aW9uKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPiR7Y29uZmlnLmRlc2NyaXB0aW9ufTwvZGl2PmA7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBNYWluIGxpc3RcbiAgICAgICAgaWYgKGNvbmZpZy5saXN0ICYmIGNvbmZpZy5saXN0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+PHVsIGNsYXNzPVwidWkgbGlzdFwiPic7XG4gICAgICAgICAgICBjb25maWcubGlzdC5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGxpPiR7aXRlbX08L2xpPmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpdGVtLnRlcm0gJiYgaXRlbS5kZWZpbml0aW9uID09PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFNlY3Rpb24gaGVhZGVyXG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDwvdWw+PHN0cm9uZz4ke2l0ZW0udGVybX08L3N0cm9uZz48dWwgY2xhc3M9XCJ1aSBsaXN0XCI+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0udGVybSAmJiBpdGVtLmRlZmluaXRpb24pIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVGVybSB3aXRoIGRlZmluaXRpb25cbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGxpPjxzdHJvbmc+JHtpdGVtLnRlcm19Ojwvc3Ryb25nPiAke2l0ZW0uZGVmaW5pdGlvbn08L2xpPmA7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBodG1sICs9ICc8L3VsPjwvZGl2Pic7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBBZGRpdGlvbmFsIGxpc3RzIChsaXN0Mi1saXN0MTApXG4gICAgICAgIGZvciAobGV0IGkgPSAyOyBpIDw9IDEwOyBpKyspIHtcbiAgICAgICAgICAgIGNvbnN0IGxpc3RLZXkgPSBgbGlzdCR7aX1gO1xuICAgICAgICAgICAgaWYgKGNvbmZpZ1tsaXN0S2V5XSAmJiBjb25maWdbbGlzdEtleV0ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+PHVsIGNsYXNzPVwidWkgbGlzdFwiPic7XG4gICAgICAgICAgICAgICAgY29uZmlnW2xpc3RLZXldLmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT4ke2l0ZW19PC9saT5gO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPC91bD48L2Rpdj4nO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gV2FybmluZ1xuICAgICAgICBpZiAoY29uZmlnLndhcm5pbmcpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+PGRpdiBjbGFzcz1cInVpIG9yYW5nZSBtZXNzYWdlXCI+JztcbiAgICAgICAgICAgIGlmIChjb25maWcud2FybmluZy5oZWFkZXIpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaGVhZGVyXCI+JHtjb25maWcud2FybmluZy5oZWFkZXJ9PC9kaXY+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChjb25maWcud2FybmluZy50ZXh0KSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPHA+JHtjb25maWcud2FybmluZy50ZXh0fTwvcD5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+PC9kaXY+JztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEV4YW1wbGVzXG4gICAgICAgIGlmIChjb25maWcuZXhhbXBsZXMgJiYgY29uZmlnLmV4YW1wbGVzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGlmIChjb25maWcuZXhhbXBsZXNIZWFkZXIpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxzdHJvbmc+JHtjb25maWcuZXhhbXBsZXNIZWFkZXJ9PC9zdHJvbmc+PC9kaXY+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJpdGVtXCI+PHByZSBzdHlsZT1cImJhY2tncm91bmQ6I2Y0ZjRmNDtwYWRkaW5nOjEwcHg7Ym9yZGVyLXJhZGl1czo0cHg7XCI+JztcbiAgICAgICAgICAgIGh0bWwgKz0gY29uZmlnLmV4YW1wbGVzLmpvaW4oJ1xcbicpO1xuICAgICAgICAgICAgaHRtbCArPSAnPC9wcmU+PC9kaXY+JztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE5vdGVcbiAgICAgICAgaWYgKGNvbmZpZy5ub3RlKSB7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwiaXRlbVwiPjxlbT4ke2NvbmZpZy5ub3RlfTwvZW0+PC9kaXY+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCdWlsZCB0aGUgczNfZW5kcG9pbnQgdG9vbHRpcCBIVE1MLCB3ZWF2aW5nIGluIHRoZSBjdXJyZW50XG4gICAgICogcGVyLXByZXNldCBub3RlIChpZiBhbnkpIGFzIHRoZSB0cmFpbGluZyBgbm90ZWAgc2xvdC4gTGl2ZXMgaW4gaXRzXG4gICAgICogb3duIG1ldGhvZCBzbyBzZXRTM0VuZHBvaW50UHJlc2V0Tm90ZSgpIGNhbiByZWJ1aWxkIHRoZSBjb250ZW50IG9uXG4gICAgICogdGhlIGZseSB3aXRob3V0IHJlLXJ1bm5pbmcgdGhlIHJlc3Qgb2YgdGhlIHRvb2x0aXAgbWFjaGluZXJ5LlxuICAgICAqXG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTFxuICAgICAqL1xuICAgIGJ1aWxkUzNFbmRwb2ludFRvb2x0aXBDb250ZW50KCkge1xuICAgICAgICByZXR1cm4gc3RvcmFnZUluZGV4LmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19lbmRwb2ludF9oZWFkZXIsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfZW5kcG9pbnRfZGVzYyxcbiAgICAgICAgICAgIGV4YW1wbGVzOiBbXG4gICAgICAgICAgICAgICAgJ0FXUyBTMzogaHR0cHM6Ly9zMy5hcC1zb3V0aGVhc3QtMS5hbWF6b25hd3MuY29tJyxcbiAgICAgICAgICAgICAgICAnWWFuZGV4IENsb3VkOiBodHRwczovL3N0b3JhZ2UueWFuZGV4Y2xvdWQubmV0JyxcbiAgICAgICAgICAgICAgICAnVksgQ2xvdWQ6IGh0dHBzOi8vaGIua3otYXN0LnZrY2xvdWQtc3RvcmFnZS5ydScsXG4gICAgICAgICAgICAgICAgJ0Nsb3VkZmxhcmUgUjI6IGh0dHBzOi8vPEFDQ09VTlRfSUQ+LnIyLmNsb3VkZmxhcmVzdG9yYWdlLmNvbScsXG4gICAgICAgICAgICAgICAgJ0RpZ2l0YWxPY2VhbjogaHR0cHM6Ly9zZ3AxLmRpZ2l0YWxvY2VhbnNwYWNlcy5jb20nLFxuICAgICAgICAgICAgICAgICdNaW5JTzogaHR0cDovL21pbmlvLmV4YW1wbGUuY29tOjkwMDAnLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIGV4YW1wbGVzSGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9leGFtcGxlcyxcbiAgICAgICAgICAgIG5vdGU6IHN0b3JhZ2VJbmRleC5zM0VuZHBvaW50UHJlc2V0Tm90ZSB8fCBudWxsLFxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIHRoZSBwZXItcHJlc2V0IG5vdGUgdGhhdCB0aGUgczNfZW5kcG9pbnQgdG9vbHRpcCBjYXJyaWVzIGFuZFxuICAgICAqIHB1c2ggdGhlIHJlYnVpbHQgSFRNTCBpbnRvIHRoZSBsaXZlIEZvbWFudGljIHBvcHVwLiBDYWxsZWQgZnJvbVxuICAgICAqIHMzLXN0b3JhZ2UtaW5kZXguanMgd2hlbmV2ZXIgdGhlIHByb3ZpZGVyIHByZXNldCBjaGFuZ2VzIHNvIHRoZVxuICAgICAqIHByZXNldC1zcGVjaWZpYyBndWlkYW5jZSBsaXZlcyBuZXh0IHRvIHRoZSBmaWVsZCBpdCBhY3R1YWxseVxuICAgICAqIGFmZmVjdHMgKG5vIHNlcGFyYXRlIGhpbnQgYmFubmVyIG5lZWRlZCkuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdGV4dFxuICAgICAqL1xuICAgIHNldFMzRW5kcG9pbnRQcmVzZXROb3RlKHRleHQpIHtcbiAgICAgICAgc3RvcmFnZUluZGV4LnMzRW5kcG9pbnRQcmVzZXROb3RlID0gdGV4dCB8fCAnJztcbiAgICAgICAgY29uc3QgJGljb24gPSAkKCcuZmllbGQtaW5mby1pY29uW2RhdGEtZmllbGQ9XCJzM19lbmRwb2ludFwiXScpO1xuICAgICAgICBpZiAoJGljb24ubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgLy8gSWYgdGhlIHBvcHVwIGhhc24ndCBiZWVuIGluaXRpYWxpc2VkIHlldCAoZS5nLiBjbG91ZCB0YWIgbm90XG4gICAgICAgIC8vIHZpc2l0ZWQgeWV0KSwgZG8gbm90aGluZyBleHRyYSDigJQgaW5pdGlhbGl6ZVRvb2x0aXBzKCkgd2lsbCBwaWNrXG4gICAgICAgIC8vIHVwIHRoZSBuZXcgc3RhdGUgdmlhIGJ1aWxkUzNFbmRwb2ludFRvb2x0aXBDb250ZW50KCkgb24gZmlyc3RcbiAgICAgICAgLy8gaW5pdC4gQXZvaWRzIGEgZGVzdHJveS9yZWluaXQgcmFjZSB0aGF0IHdvdWxkIG90aGVyd2lzZSB3aXBlXG4gICAgICAgIC8vIHRoZSBkeW5hbWljIG5vdGUgd2hlbiBpbml0aWFsaXplVG9vbHRpcHMoKSBydW5zIGxhdGVyLlxuICAgICAgICBpZiAoJGljb24ucG9wdXAoJ2V4aXN0cycpKSB7XG4gICAgICAgICAgICAkaWNvbi5wb3B1cCgnY2hhbmdlIGNvbnRlbnQnLCBzdG9yYWdlSW5kZXguYnVpbGRTM0VuZHBvaW50VG9vbHRpcENvbnRlbnQoKSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0b29sdGlwcyBmb3IgZm9ybSBmaWVsZHNcbiAgICAgKi9cbiAgICBpbml0aWFsaXplVG9vbHRpcHMoKSB7XG4gICAgICAgIC8vIFRvb2x0aXAgY29uZmlndXJhdGlvbnMgZm9yIGVhY2ggZmllbGRcbiAgICAgICAgY29uc3QgdG9vbHRpcENvbmZpZ3MgPSB7XG4gICAgICAgICAgICByZWNvcmRfcmV0ZW50aW9uX3BlcmlvZDogc3RvcmFnZUluZGV4LmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25fZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTMsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTRcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX3dhcm5pbmdfaGVhZGVyLFxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX3dhcm5pbmdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgczNfZW5hYmxlZDogc3RvcmFnZUluZGV4LmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfZW5hYmxlZF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2VuYWJsZWRfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2VuYWJsZWRfaXRlbTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2VuYWJsZWRfaXRlbTIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2VuYWJsZWRfaXRlbTNcbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgczNfcHJvdmlkZXJfcHJlc2V0OiBzdG9yYWdlSW5kZXguYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19wcmVzZXRfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19wcmVzZXRfZGVzYyxcbiAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICBzM19lbmRwb2ludDogc3RvcmFnZUluZGV4LmJ1aWxkUzNFbmRwb2ludFRvb2x0aXBDb250ZW50KCksXG5cbiAgICAgICAgICAgIHMzX3JlZ2lvbjogc3RvcmFnZUluZGV4LmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfcmVnaW9uX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfcmVnaW9uX2Rlc2MsXG4gICAgICAgICAgICAgICAgZXhhbXBsZXM6IFtcbiAgICAgICAgICAgICAgICAgICAgJ3VzLWVhc3QtMSAoZGVmYXVsdCknLFxuICAgICAgICAgICAgICAgICAgICAnZXUtd2VzdC0xJyxcbiAgICAgICAgICAgICAgICAgICAgJ2FwLXNvdXRoZWFzdC0xJ1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfcmVnaW9uX25vdGVcbiAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICBzM19idWNrZXQ6IHN0b3JhZ2VJbmRleC5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2J1Y2tldF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2J1Y2tldF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfYnVja2V0X2l0ZW0xLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19idWNrZXRfaXRlbTIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2J1Y2tldF9pdGVtM1xuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICBzM19hY2Nlc3Nfa2V5OiBzdG9yYWdlSW5kZXguYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19hY2Nlc3Nfa2V5X2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfYWNjZXNzX2tleV9kZXNjLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2FjY2Vzc19rZXlfbm90ZVxuICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgIHMzX3NlY3JldF9rZXk6IHN0b3JhZ2VJbmRleC5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX3NlY3JldF9rZXlfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19zZWNyZXRfa2V5X2Rlc2MsXG4gICAgICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3dhcm5pbmcsXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX3NlY3JldF9rZXlfd2FybmluZ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICBsb2NhbF9yZXRlbnRpb25fcGVyaW9kOiBzdG9yYWdlSW5kZXguYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25faGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25fZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9pdGVtMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2l0ZW0yLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25faXRlbTNcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9ub3RlLFxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25fd2FybmluZ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBwb3B1cCBmb3IgZWFjaCB0b29sdGlwIGljb25cbiAgICAgICAgJCgnLmZpZWxkLWluZm8taWNvbicpLmVhY2goKGluZGV4LCBlbGVtZW50KSA9PiB7XG4gICAgICAgICAgICBjb25zdCAkaWNvbiA9ICQoZWxlbWVudCk7XG4gICAgICAgICAgICBjb25zdCBmaWVsZE5hbWUgPSAkaWNvbi5kYXRhKCdmaWVsZCcpO1xuICAgICAgICAgICAgY29uc3QgY29udGVudCA9IHRvb2x0aXBDb25maWdzW2ZpZWxkTmFtZV07XG5cbiAgICAgICAgICAgIGlmIChjb250ZW50KSB7XG4gICAgICAgICAgICAgICAgJGljb24ucG9wdXAoe1xuICAgICAgICAgICAgICAgICAgICBodG1sOiBjb250ZW50LFxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCByaWdodCcsXG4gICAgICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgZGVsYXk6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNob3c6IDMwMCxcbiAgICAgICAgICAgICAgICAgICAgICAgIGhpZGU6IDEwMFxuICAgICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICB2YXJpYXRpb246ICdmbG93aW5nJ1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBzdG9yYWdlSW5kZXguJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmICghcmVzcG9uc2Uuc3VjY2Vzcykge1xuICAgICAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBzdG9yYWdlSW5kZXguJGZvcm1PYmo7XG4gICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbiA9IHN0b3JhZ2VJbmRleC4kc3VibWl0QnV0dG9uO1xuICAgICAgICBGb3JtLiRkcm9wZG93blN1Ym1pdCA9IHN0b3JhZ2VJbmRleC4kZHJvcGRvd25TdWJtaXQ7XG4gICAgICAgIEZvcm0uJGRpcnJ0eUZpZWxkID0gc3RvcmFnZUluZGV4LiRkaXJydHlGaWVsZDtcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gc3RvcmFnZUluZGV4LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IHN0b3JhZ2VJbmRleC5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IHN0b3JhZ2VJbmRleC5jYkFmdGVyU2VuZEZvcm07XG5cbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIHNldHRpbmdzIGZvciBGb3JtLmpzIChzaW5nbGV0b24gcmVzb3VyY2UpXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgYXBpT2JqZWN0OiBTdG9yYWdlQVBJLFxuICAgICAgICAgICAgc2F2ZU1ldGhvZDogJ3VwZGF0ZScgLy8gVXNpbmcgc3RhbmRhcmQgUFVUIGZvciBzaW5nbGV0b24gdXBkYXRlXG4gICAgICAgIH07XG5cbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfVxufTtcblxuLy8gV2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHksIGluaXRpYWxpemUgdGhlIHN0b3JhZ2UgbWFuYWdlbWVudCBpbnRlcmZhY2UuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgc3RvcmFnZUluZGV4LmluaXRpYWxpemUoKTtcbn0pOyJdfQ==