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

/* global globalRootUrl, globalTranslate, Form, StorageAPI, UserMessage, s3StorageIndex, $, PbxDateTime */

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

    if (data._meta) {
      PbxDateTime.setServerMeta(data._meta);
    }

    if (data.measuredAt) {
      // Render in server TZ + Fomantic popup with the dual-TZ tooltip.
      // The operator should never have to convert between "browser
      // said" and "server logged" when reviewing a benchmark timestamp.
      var $cell = $('#disk-benchmark-measured-at');
      $cell.text(PbxDateTime.formatServerTime(data.measuredAt));
      $cell.popup('destroy');
      $cell.popup({
        html: PbxDateTime.buildDualTooltipHtml(data.measuredAt),
        hoverable: true,
        position: 'top left',
        variation: 'inverted',
        delay: {
          show: 200,
          hide: 100
        }
      });
    } else {
      $('#disk-benchmark-measured-at').text('—').popup('destroy');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TdG9yYWdlL3N0b3JhZ2UtaW5kZXguanMiXSwibmFtZXMiOlsic3RvcmFnZUluZGV4IiwiJGZvcm1PYmoiLCIkc3VibWl0QnV0dG9uIiwiJGRyb3Bkb3duU3VibWl0IiwiJGRpcnJ0eUZpZWxkIiwiJHJlY29yZHNTYXZlUGVyaW9kU2xpZGVyIiwic2F2ZVJlY29yZHNQZXJpb2QiLCJ2YWxpZGF0ZVJ1bGVzIiwiczNFbmRwb2ludFByZXNldE5vdGUiLCJiZW5jaG1hcmtSdW5uaW5nIiwiaW5pdGlhbGl6ZSIsIiQiLCJmaW5kIiwidGFiIiwiaGlzdG9yeSIsImhpc3RvcnlUeXBlIiwib25WaXNpYmxlIiwidGFiUGF0aCIsImxvYWRTdG9yYWdlRGF0YSIsImluaXRpYWxpemVGb3JtIiwiczNTdG9yYWdlSW5kZXgiLCJzbGlkZXIiLCJtaW4iLCJtYXgiLCJzdGVwIiwic21vb3RoIiwiYXV0b0FkanVzdExhYmVscyIsImludGVycHJldExhYmVsIiwidmFsdWUiLCJsYWJlbHMiLCJnbG9iYWxUcmFuc2xhdGUiLCJzdF9TdG9yZTFNb250aE9mUmVjb3JkcyIsInN0X1N0b3JlM01vbnRoc09mUmVjb3JkcyIsInN0X1N0b3JlNk1vbnRoc09mUmVjb3JkcyIsInN0X1N0b3JlMVllYXJPZlJlY29yZHMiLCJzdF9TdG9yZTNZZWFyc09mUmVjb3JkcyIsInN0X1N0b3JlQWxsUG9zc2libGVSZWNvcmRzIiwib25DaGFuZ2UiLCJjYkFmdGVyU2VsZWN0U2F2ZVBlcmlvZFNsaWRlciIsImluaXRpYWxpemVUb29sdGlwcyIsImxvYWRTZXR0aW5ncyIsImluaXRpYWxpemVEaXNrQmVuY2htYXJrIiwic2F2ZVBlcmlvZCIsImZvcm0iLCJ1cGRhdGVTbGlkZXJMaW1pdHMiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJTdG9yYWdlQVBJIiwiZ2V0IiwicmVzcG9uc2UiLCJyZXN1bHQiLCJkYXRhIiwiUEJYUmVjb3JkU2F2ZVBlcmlvZCIsInJlY29yZFNhdmVQZXJpb2QiLCJzbGlkZXJJbmRleCIsImluZGV4T2YiLCJhZGRDbGFzcyIsImhpZGUiLCJnZXRVc2FnZSIsInJlbmRlclN0b3JhZ2VEYXRhIiwicmVtb3ZlQ2xhc3MiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsInN0X1N0b3JhZ2VMb2FkRXJyb3IiLCJzaG93IiwiZm9ybWF0U2l6ZSIsInNpemVJbk1iIiwidG9GaXhlZCIsInRleHQiLCJ1c2VkX3NwYWNlIiwidG90YWxfc2l6ZSIsImFjY3VtdWxhdGVkV2lkdGgiLCJmb3JFYWNoIiwiY2F0ZWdvcnkiLCJjYXREYXRhIiwiY2F0ZWdvcmllcyIsIiRzZWdtZW50IiwicGVyY2VudGFnZSIsImNzcyIsImNhdGVnb3J5S2V5Iiwic3BsaXQiLCJtYXAiLCJ3b3JkIiwiY2hhckF0IiwidG9VcHBlckNhc2UiLCJzbGljZSIsImpvaW4iLCJhdHRyIiwic2l6ZSIsIl9ob3ZlckJvdW5kIiwib24iLCJlIiwidG9vbHRpcCIsImFwcGVuZCIsImRvY3VtZW50IiwiZXYiLCJsZWZ0IiwicGFnZVgiLCJ0b3AiLCJwYWdlWSIsInJlbW92ZSIsIm9mZiIsInJlbW90ZV9zdG9yYWdlIiwiczMiLCJlbmFibGVkIiwic3RfUzNSZW1vdGVTdG9yYWdlVGl0bGUiLCJzdF9TM1JlbW90ZVN0b3JhZ2VJbmZvIiwicmVwbGFjZSIsImZpbGVzX2NvdW50IiwidG9Mb2NhbGVTdHJpbmciLCJidWNrZXQiLCJnZXRJb0JlbmNobWFyayIsInJlbmRlckRpc2tCZW5jaG1hcmsiLCJzaG93RGlza0JlbmNobWFya0VtcHR5IiwicHJldmVudERlZmF1bHQiLCJydW5EaXNrQmVuY2htYXJrIiwid3JpdGVNQnBzIiwicmVhZE1CcHMiLCJfbWV0YSIsIlBieERhdGVUaW1lIiwic2V0U2VydmVyTWV0YSIsIm1lYXN1cmVkQXQiLCIkY2VsbCIsImZvcm1hdFNlcnZlclRpbWUiLCJwb3B1cCIsImh0bWwiLCJidWlsZER1YWxUb29sdGlwSHRtbCIsImhvdmVyYWJsZSIsInBvc2l0aW9uIiwidmFyaWF0aW9uIiwiZGVsYXkiLCJwcm9wIiwicnVuSW9CZW5jaG1hcmsiLCJtZXNzYWdlcyIsImJ1aWxkVG9vbHRpcENvbnRlbnQiLCJjb25maWciLCJoZWFkZXIiLCJkZXNjcmlwdGlvbiIsImxpc3QiLCJsZW5ndGgiLCJpdGVtIiwidGVybSIsImRlZmluaXRpb24iLCJpIiwibGlzdEtleSIsIndhcm5pbmciLCJleGFtcGxlcyIsImV4YW1wbGVzSGVhZGVyIiwibm90ZSIsImJ1aWxkUzNFbmRwb2ludFRvb2x0aXBDb250ZW50Iiwic3RfdG9vbHRpcF9zM19lbmRwb2ludF9oZWFkZXIiLCJzdF90b29sdGlwX3MzX2VuZHBvaW50X2Rlc2MiLCJzdF90b29sdGlwX2V4YW1wbGVzIiwic2V0UzNFbmRwb2ludFByZXNldE5vdGUiLCIkaWNvbiIsInRvb2x0aXBDb25maWdzIiwicmVjb3JkX3JldGVudGlvbl9wZXJpb2QiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faGVhZGVyIiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2Rlc2MiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTEiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTIiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTMiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTQiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25fd2FybmluZ19oZWFkZXIiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25fd2FybmluZyIsInMzX2VuYWJsZWQiLCJzdF90b29sdGlwX3MzX2VuYWJsZWRfaGVhZGVyIiwic3RfdG9vbHRpcF9zM19lbmFibGVkX2Rlc2MiLCJzdF90b29sdGlwX3MzX2VuYWJsZWRfaXRlbTEiLCJzdF90b29sdGlwX3MzX2VuYWJsZWRfaXRlbTIiLCJzdF90b29sdGlwX3MzX2VuYWJsZWRfaXRlbTMiLCJzM19wcm92aWRlcl9wcmVzZXQiLCJzdF90b29sdGlwX3MzX3ByZXNldF9oZWFkZXIiLCJzdF90b29sdGlwX3MzX3ByZXNldF9kZXNjIiwiczNfZW5kcG9pbnQiLCJzM19yZWdpb24iLCJzdF90b29sdGlwX3MzX3JlZ2lvbl9oZWFkZXIiLCJzdF90b29sdGlwX3MzX3JlZ2lvbl9kZXNjIiwic3RfdG9vbHRpcF9zM19yZWdpb25fbm90ZSIsInMzX2J1Y2tldCIsInN0X3Rvb2x0aXBfczNfYnVja2V0X2hlYWRlciIsInN0X3Rvb2x0aXBfczNfYnVja2V0X2Rlc2MiLCJzdF90b29sdGlwX3MzX2J1Y2tldF9pdGVtMSIsInN0X3Rvb2x0aXBfczNfYnVja2V0X2l0ZW0yIiwic3RfdG9vbHRpcF9zM19idWNrZXRfaXRlbTMiLCJzM19hY2Nlc3Nfa2V5Iiwic3RfdG9vbHRpcF9zM19hY2Nlc3Nfa2V5X2hlYWRlciIsInN0X3Rvb2x0aXBfczNfYWNjZXNzX2tleV9kZXNjIiwic3RfdG9vbHRpcF9zM19hY2Nlc3Nfa2V5X25vdGUiLCJzM19zZWNyZXRfa2V5Iiwic3RfdG9vbHRpcF9zM19zZWNyZXRfa2V5X2hlYWRlciIsInN0X3Rvb2x0aXBfczNfc2VjcmV0X2tleV9kZXNjIiwic3RfdG9vbHRpcF93YXJuaW5nIiwic3RfdG9vbHRpcF9zM19zZWNyZXRfa2V5X3dhcm5pbmciLCJsb2NhbF9yZXRlbnRpb25fcGVyaW9kIiwic3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25faGVhZGVyIiwic3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25fZGVzYyIsInN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2l0ZW0xIiwic3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25faXRlbTIiLCJzdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9pdGVtMyIsInN0X3Rvb2x0aXBfbm90ZSIsInN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX3dhcm5pbmciLCJlYWNoIiwiaW5kZXgiLCJlbGVtZW50IiwiZmllbGROYW1lIiwiY29udGVudCIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsImNiQWZ0ZXJT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b3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgU3RvcmFnZUFQSSwgVXNlck1lc3NhZ2UsIHMzU3RvcmFnZUluZGV4LCAkLCBQYnhEYXRlVGltZSAqL1xuXG4vKipcbiAqIFN0b3JhZ2UgbWFuYWdlbWVudCBtb2R1bGVcbiAqL1xuY29uc3Qgc3RvcmFnZUluZGV4ID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBsb2NhbCBzdG9yYWdlIGZvcm0gKFRhYiAyKS5cbiAgICAgKiBTZW5kcyBkYXRhIHRvOiBQQVRDSCAvcGJ4Y29yZS9hcGkvdjMvc3RvcmFnZS5cbiAgICAgKiBSZXNvbHZlZCBpbiBpbml0aWFsaXplKCkg4oCUIG11c3Qgbm90IGNhbGwgJCgpIGF0IG1vZHVsZS1sb2FkIHRpbWUuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBzdWJtaXQgYnV0dG9uICh1bmlxdWUgdG8gdGhpcyBmb3JtKS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzdWJtaXRCdXR0b246IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZHJvcGRvd24gc3VibWl0ICh1bmlxdWUgdG8gdGhpcyBmb3JtKS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkcm9wZG93blN1Ym1pdDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBkaXJ0eSBmaWVsZCAodW5pcXVlIHRvIHRoaXMgZm9ybSkuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGlycnR5RmllbGQ6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgcmVjb3JkcyByZXRlbnRpb24gcGVyaW9kIHNsaWRlci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRyZWNvcmRzU2F2ZVBlcmlvZFNsaWRlcjogbnVsbCxcblxuXG4gICAgLyoqXG4gICAgICogUG9zc2libGUgcGVyaW9kIHZhbHVlcyBmb3IgdGhlIHJlY29yZHMgcmV0ZW50aW9uLlxuICAgICAqIFZhbHVlcyBpbiBkYXlzOiAzMCwgOTAsIDE4MCwgMzYwLCAxMDgwLCAnJyAoaW5maW5pdHkpXG4gICAgICovXG4gICAgc2F2ZVJlY29yZHNQZXJpb2Q6IFsnMzAnLCAnOTAnLCAnMTgwJywgJzM2MCcsICcxMDgwJywgJyddLFxuXG5cblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBsb2NhbCBzdG9yYWdlIGZvcm0uXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7fSxcblxuICAgIC8qKlxuICAgICAqIFBlci1wcmVzZXQgbm90ZSBhcHBlbmRlZCB0byB0aGUgczNfZW5kcG9pbnQgZmllbGQgdG9vbHRpcC4gVXBkYXRlZFxuICAgICAqIGJ5IHNldFMzRW5kcG9pbnRQcmVzZXROb3RlKCkgZWFjaCB0aW1lIHRoZSBvcGVyYXRvciBwaWNrcyBhIGRpZmZlcmVudFxuICAgICAqIHByb3ZpZGVyIHByZXNldDsgcmVuZGVyZWQgYXMgdGhlIGBub3RlYCBzbG90IG9mIHRoZSBzM19lbmRwb2ludFxuICAgICAqIHRvb2x0aXAgY29uZmlnIHNvIGFsbCBwZXItZmllbGQgaGludHMgc3RheSBpbiBvbmUgcGxhY2UuXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBzM0VuZHBvaW50UHJlc2V0Tm90ZTogJycsXG4gICAgXG4gICAgLyoqXG4gICAgICogV2hldGhlciBhIGJlbmNobWFyayBydW4gaXMgY3VycmVudGx5IGluIGZsaWdodC4gUHJldmVudHMgdGhlIHVzZXJcbiAgICAgKiBmcm9tIGtpY2tpbmcgb2ZmIGEgc2Vjb25kIGNvbmN1cnJlbnQgZGQgcnVuIGJ5IHNwYW0tY2xpY2tpbmcgdGhlXG4gICAgICogYnV0dG9uIHdoaWxlIHRoZSBmaXJzdCBvbmUgaXMgc3RpbGwgYmxvY2tpbmcgdGhlIHNlcnZlciB3b3JrZXIuXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgYmVuY2htYXJrUnVubmluZzogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIG1vZHVsZSB3aXRoIGV2ZW50IGJpbmRpbmdzIGFuZCBjb21wb25lbnQgaW5pdGlhbGl6YXRpb25zLlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHN0b3JhZ2VJbmRleC4kZm9ybU9iaiA9ICQoJyNsb2NhbC1zdG9yYWdlLWZvcm0nKTtcbiAgICAgICAgc3RvcmFnZUluZGV4LiRzdWJtaXRCdXR0b24gPSAkKCcjc3VibWl0YnV0dG9uLWxvY2FsJyk7XG4gICAgICAgIHN0b3JhZ2VJbmRleC4kZHJvcGRvd25TdWJtaXQgPSAkKCcjZHJvcGRvd25TdWJtaXQtbG9jYWwnKTtcbiAgICAgICAgc3RvcmFnZUluZGV4LiRkaXJydHlGaWVsZCA9ICQoJyNkaXJydHktbG9jYWwnKTtcbiAgICAgICAgc3RvcmFnZUluZGV4LiRyZWNvcmRzU2F2ZVBlcmlvZFNsaWRlciA9ICQoJyNQQlhSZWNvcmRTYXZlUGVyaW9kU2xpZGVyJyk7XG5cbiAgICAgICAgLy8gRW5hYmxlIHRhYiBuYXZpZ2F0aW9uXG4gICAgICAgICQoJyNzdG9yYWdlLW1lbnUnKS5maW5kKCcuaXRlbScpLnRhYih7XG4gICAgICAgICAgICAgICAgaGlzdG9yeTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBoaXN0b3J5VHlwZTogJ2hhc2gnLFxuICAgICAgICAgICAgICAgICAgIG9uVmlzaWJsZTogZnVuY3Rpb24odGFiUGF0aCkge1xuICAgICAgICAgICAgICAgIC8vIExvYWQgc3RvcmFnZSBkYXRhIHdoZW4gc3RvcmFnZSBpbmZvIHRhYiBpcyBhY3RpdmF0ZWRcbiAgICAgICAgICAgICAgICBpZiAodGFiUGF0aCA9PT0gJ3N0b3JhZ2UtaW5mbycpIHtcbiAgICAgICAgICAgICAgICAgICAgc3RvcmFnZUluZGV4LmxvYWRTdG9yYWdlRGF0YSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIGxvY2FsIHN0b3JhZ2UgZm9ybSB3aGVuIHRhYiBiZWNvbWVzIHZpc2libGVcbiAgICAgICAgICAgICAgICBpZiAodGFiUGF0aCA9PT0gJ3N0b3JhZ2UtbG9jYWwnKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0b3JhZ2VJbmRleC5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAvLyBSZS1pbml0aWFsaXplIFMzIGZvcm0gd2hlbiBjbG91ZCB0YWIgYmVjb21lcyB2aXNpYmxlXG4gICAgICAgICAgICAgICAgaWYgKHRhYlBhdGggPT09ICdzdG9yYWdlLWNsb3VkJyAmJiB0eXBlb2YgczNTdG9yYWdlSW5kZXggIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LmluaXRpYWxpemVGb3JtKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSByZWNvcmRzIHNhdmUgcGVyaW9kIHNsaWRlclxuICAgICAgICBzdG9yYWdlSW5kZXguJHJlY29yZHNTYXZlUGVyaW9kU2xpZGVyXG4gICAgICAgICAgICAuc2xpZGVyKHtcbiAgICAgICAgICAgICAgICBtaW46IDAsXG4gICAgICAgICAgICAgICAgbWF4OiA1LFxuICAgICAgICAgICAgICAgIHN0ZXA6IDEsXG4gICAgICAgICAgICAgICAgc21vb3RoOiB0cnVlLFxuICAgICAgICAgICAgICAgIGF1dG9BZGp1c3RMYWJlbHM6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGludGVycHJldExhYmVsOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbGFiZWxzID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgMDogZ2xvYmFsVHJhbnNsYXRlLnN0X1N0b3JlMU1vbnRoT2ZSZWNvcmRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgMTogZ2xvYmFsVHJhbnNsYXRlLnN0X1N0b3JlM01vbnRoc09mUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIDI6IGdsb2JhbFRyYW5zbGF0ZS5zdF9TdG9yZTZNb250aHNPZlJlY29yZHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAzOiBnbG9iYWxUcmFuc2xhdGUuc3RfU3RvcmUxWWVhck9mUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIDQ6IGdsb2JhbFRyYW5zbGF0ZS5zdF9TdG9yZTNZZWFyc09mUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIDU6IGdsb2JhbFRyYW5zbGF0ZS5zdF9TdG9yZUFsbFBvc3NpYmxlUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxhYmVsc1t2YWx1ZV0gfHwgJyc7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogc3RvcmFnZUluZGV4LmNiQWZ0ZXJTZWxlY3RTYXZlUGVyaW9kU2xpZGVyLFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0b29sdGlwc1xuICAgICAgICBzdG9yYWdlSW5kZXguaW5pdGlhbGl6ZVRvb2x0aXBzKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSB0aGUgZm9ybVxuICAgICAgICBzdG9yYWdlSW5kZXguaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBMb2FkIHNldHRpbmdzIGZyb20gQVBJXG4gICAgICAgIHN0b3JhZ2VJbmRleC5sb2FkU2V0dGluZ3MoKTtcblxuICAgICAgICAvLyBMb2FkIHN0b3JhZ2UgZGF0YSBvbiBwYWdlIGxvYWRcbiAgICAgICAgc3RvcmFnZUluZGV4LmxvYWRTdG9yYWdlRGF0YSgpO1xuXG4gICAgICAgIC8vIERpc2sgYmVuY2htYXJrIOKAlCBsb2FkIGNhY2hlZCByZXN1bHQgYW5kIHdpcmUgdGhlIFwicnVuXCIgYnV0dG9uLlxuICAgICAgICBzdG9yYWdlSW5kZXguaW5pdGlhbGl6ZURpc2tCZW5jaG1hcmsoKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEhhbmRsZSBldmVudCBhZnRlciB0aGUgc2VsZWN0IHNhdmUgcGVyaW9kIHNsaWRlciBpcyBjaGFuZ2VkLlxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB2YWx1ZSAtIFRoZSBzZWxlY3RlZCB2YWx1ZSBmcm9tIHRoZSBzbGlkZXIuXG4gICAgICovXG4gICAgY2JBZnRlclNlbGVjdFNhdmVQZXJpb2RTbGlkZXIodmFsdWUpIHtcbiAgICAgICAgLy8gR2V0IHRoZSBzYXZlIHBlcmlvZCBjb3JyZXNwb25kaW5nIHRvIHRoZSBzbGlkZXIgdmFsdWUuXG4gICAgICAgIGNvbnN0IHNhdmVQZXJpb2QgPSBzdG9yYWdlSW5kZXguc2F2ZVJlY29yZHNQZXJpb2RbdmFsdWVdO1xuXG4gICAgICAgIC8vIFNldCB0aGUgZm9ybSB2YWx1ZSBmb3IgJ1BCWFJlY29yZFNhdmVQZXJpb2QnIHRvIHRoZSBzZWxlY3RlZCBzYXZlIHBlcmlvZC5cbiAgICAgICAgc3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdQQlhSZWNvcmRTYXZlUGVyaW9kJywgc2F2ZVBlcmlvZCk7XG5cbiAgICAgICAgLy8gVXBkYXRlIFMzIGxvY2FsIHJldGVudGlvbiBzbGlkZXIgbWF4aW11bSAoaWYgUzMgbW9kdWxlIGxvYWRlZClcbiAgICAgICAgaWYgKHR5cGVvZiBzM1N0b3JhZ2VJbmRleCAhPT0gJ3VuZGVmaW5lZCcgJiYgczNTdG9yYWdlSW5kZXgudXBkYXRlU2xpZGVyTGltaXRzKSB7XG4gICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC51cGRhdGVTbGlkZXJMaW1pdHMoc2F2ZVBlcmlvZCk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBUcmlnZ2VyIGNoYW5nZSBldmVudCB0byBhY2tub3dsZWRnZSB0aGUgbW9kaWZpY2F0aW9uXG4gICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICB9LFxuXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIFN0b3JhZ2Ugc2V0dGluZ3MgZnJvbSBBUElcbiAgICAgKi9cbiAgICBsb2FkU2V0dGluZ3MoKSB7XG4gICAgICAgIFN0b3JhZ2VBUEkuZ2V0KChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgZm9ybSB2YWx1ZXMgZm9yIGxvY2FsIHN0b3JhZ2Ugb25seVxuICAgICAgICAgICAgICAgIHN0b3JhZ2VJbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWVzJywge1xuICAgICAgICAgICAgICAgICAgICBQQlhSZWNvcmRTYXZlUGVyaW9kOiBkYXRhLlBCWFJlY29yZFNhdmVQZXJpb2QgfHwgJydcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB0b3RhbCByZXRlbnRpb24gcGVyaW9kIHNsaWRlclxuICAgICAgICAgICAgICAgIGNvbnN0IHJlY29yZFNhdmVQZXJpb2QgPSBkYXRhLlBCWFJlY29yZFNhdmVQZXJpb2QgfHwgJyc7XG4gICAgICAgICAgICAgICAgY29uc3Qgc2xpZGVySW5kZXggPSBzdG9yYWdlSW5kZXguc2F2ZVJlY29yZHNQZXJpb2QuaW5kZXhPZihyZWNvcmRTYXZlUGVyaW9kKTtcbiAgICAgICAgICAgICAgICBzdG9yYWdlSW5kZXguJHJlY29yZHNTYXZlUGVyaW9kU2xpZGVyLnNsaWRlcihcbiAgICAgICAgICAgICAgICAgICAgJ3NldCB2YWx1ZScsXG4gICAgICAgICAgICAgICAgICAgIHNsaWRlckluZGV4LFxuICAgICAgICAgICAgICAgICAgICBmYWxzZVxuICAgICAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgICAgICAvLyBOb3RpZnkgUzMgbW9kdWxlIGFib3V0IHRvdGFsIHJldGVudGlvbiBjaGFuZ2UgKGlmIGxvYWRlZClcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIHMzU3RvcmFnZUluZGV4ICE9PSAndW5kZWZpbmVkJyAmJiBzM1N0b3JhZ2VJbmRleC51cGRhdGVTbGlkZXJMaW1pdHMpIHtcbiAgICAgICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXgudXBkYXRlU2xpZGVyTGltaXRzKHJlY29yZFNhdmVQZXJpb2QpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBMb2FkIHN0b3JhZ2UgdXNhZ2UgZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIGxvYWRTdG9yYWdlRGF0YSgpIHtcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgICQoJyNzdG9yYWdlLXVzYWdlLWNvbnRhaW5lciAuZGltbWVyJykuYWRkQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAkKCcjc3RvcmFnZS1kZXRhaWxzJykuaGlkZSgpO1xuXG4gICAgICAgIC8vIE1ha2UgQVBJIGNhbGwgdG8gZ2V0IHN0b3JhZ2UgdXNhZ2UgdXNpbmcgbmV3IFN0b3JhZ2VBUElcbiAgICAgICAgU3RvcmFnZUFQSS5nZXRVc2FnZSgocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIHN0b3JhZ2VJbmRleC5yZW5kZXJTdG9yYWdlRGF0YShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJCgnI3N0b3JhZ2UtdXNhZ2UtY29udGFpbmVyIC5kaW1tZXInKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS5zdF9TdG9yYWdlTG9hZEVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSZW5kZXIgc3RvcmFnZSB1c2FnZSBkYXRhIGluIHRoZSBVSVxuICAgICAqL1xuICAgIHJlbmRlclN0b3JhZ2VEYXRhKGRhdGEpIHtcbiAgICAgICAgLy8gSGlkZSBsb2FkaW5nIGFuZCBzaG93IGRldGFpbHNcbiAgICAgICAgJCgnI3N0b3JhZ2UtdXNhZ2UtY29udGFpbmVyIC5kaW1tZXInKS5yZW1vdmVDbGFzcygnYWN0aXZlJyk7XG4gICAgICAgICQoJyNzdG9yYWdlLWRldGFpbHMnKS5zaG93KCk7XG4gICAgICAgIFxuICAgICAgICAvLyBGb3JtYXQgc2l6ZSBmb3IgZGlzcGxheVxuICAgICAgICBjb25zdCBmb3JtYXRTaXplID0gKHNpemVJbk1iKSA9PiB7XG4gICAgICAgICAgICBpZiAoc2l6ZUluTWIgPj0gMTAyNCkge1xuICAgICAgICAgICAgICAgIHJldHVybiAoc2l6ZUluTWIgLyAxMDI0KS50b0ZpeGVkKDEpICsgJyBHQic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gc2l6ZUluTWIudG9GaXhlZCgxKSArICcgTUInO1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIGhlYWRlciBpbmZvcm1hdGlvblxuICAgICAgICAkKCcjdXNlZC1zcGFjZS10ZXh0JykudGV4dChmb3JtYXRTaXplKGRhdGEudXNlZF9zcGFjZSkpO1xuICAgICAgICAkKCcjdG90YWwtc2l6ZS10ZXh0JykudGV4dChmb3JtYXRTaXplKGRhdGEudG90YWxfc2l6ZSkpO1xuICAgICAgICBcbiAgICAgICAgLy8gVXBkYXRlIHByb2dyZXNzIHNlZ21lbnRzIGluIG1hY09TIHN0eWxlXG4gICAgICAgIGxldCBhY2N1bXVsYXRlZFdpZHRoID0gMDtcbiAgICAgICAgXG4gICAgICAgIC8vIFByb2Nlc3MgZWFjaCBjYXRlZ29yeVxuICAgICAgICBbJ2NhbGxfcmVjb3JkaW5ncycsICdjZHJfZGF0YWJhc2UnLCAnc3lzdGVtX2xvZ3MnLCAnbW9kdWxlcycsICdiYWNrdXBzJywgJ3N5c3RlbV9jYWNoZXMnLCAnczNfY2FjaGUnLCAnb3RoZXInXS5mb3JFYWNoKGNhdGVnb3J5ID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGNhdERhdGEgPSBkYXRhLmNhdGVnb3JpZXNbY2F0ZWdvcnldO1xuICAgICAgICAgICAgY29uc3QgJHNlZ21lbnQgPSAkKGAucHJvZ3Jlc3Mtc2VnbWVudFtkYXRhLWNhdGVnb3J5PVwiJHtjYXRlZ29yeX1cIl1gKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGNhdERhdGEgJiYgY2F0RGF0YS5wZXJjZW50YWdlID4gMCkge1xuICAgICAgICAgICAgICAgICRzZWdtZW50LmNzcygnd2lkdGgnLCBjYXREYXRhLnBlcmNlbnRhZ2UgKyAnJScpLnNob3coKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBBZGQgaG92ZXIgdG9vbHRpcFxuICAgICAgICAgICAgICAgIGNvbnN0IGNhdGVnb3J5S2V5ID0gJ3N0X0NhdGVnb3J5JyArIGNhdGVnb3J5LnNwbGl0KCdfJykubWFwKHdvcmQgPT4gd29yZC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHdvcmQuc2xpY2UoMSkpLmpvaW4oJycpO1xuICAgICAgICAgICAgICAgICRzZWdtZW50LmF0dHIoJ3RpdGxlJywgYCR7Z2xvYmFsVHJhbnNsYXRlW2NhdGVnb3J5S2V5XSB8fCBjYXRlZ29yeX06ICR7Zm9ybWF0U2l6ZShjYXREYXRhLnNpemUpfSAoJHtjYXREYXRhLnBlcmNlbnRhZ2V9JSlgKTtcbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICBhY2N1bXVsYXRlZFdpZHRoICs9IGNhdERhdGEucGVyY2VudGFnZTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJHNlZ21lbnQuaGlkZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgY2F0ZWdvcnkgc2l6ZSBpbiBsaXN0XG4gICAgICAgICAgICAkKGAjJHtjYXRlZ29yeX0tc2l6ZWApLnRleHQoZm9ybWF0U2l6ZShjYXREYXRhID8gY2F0RGF0YS5zaXplIDogMCkpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIEJpbmQgaG92ZXIgZWZmZWN0cyBvbmx5IG9uY2UgKG5vdCBvbiBldmVyeSBkYXRhIHJlZnJlc2gpXG4gICAgICAgIGlmICghc3RvcmFnZUluZGV4Ll9ob3ZlckJvdW5kKSB7XG4gICAgICAgICAgICBzdG9yYWdlSW5kZXguX2hvdmVyQm91bmQgPSB0cnVlO1xuXG4gICAgICAgICAgICAvLyBUb29sdGlwIGZvciBwcm9ncmVzcyBzZWdtZW50c1xuICAgICAgICAgICAgJCgnI3N0b3JhZ2UtcHJvZ3Jlc3MnKS5vbignbW91c2VlbnRlcicsICcucHJvZ3Jlc3Mtc2VnbWVudCcsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdG9vbHRpcCA9ICQoJzxkaXYgY2xhc3M9XCJzdG9yYWdlLXRvb2x0aXBcIj48L2Rpdj4nKS50ZXh0KCQodGhpcykuYXR0cigndGl0bGUnKSk7XG4gICAgICAgICAgICAgICAgJCgnYm9keScpLmFwcGVuZCh0b29sdGlwKTtcbiAgICAgICAgICAgICAgICAkKGRvY3VtZW50KS5vbignbW91c2Vtb3ZlLnRvb2x0aXAnLCBmdW5jdGlvbiAoZXYpIHtcbiAgICAgICAgICAgICAgICAgICAgdG9vbHRpcC5jc3MoeyBsZWZ0OiBldi5wYWdlWCArIDEwLCB0b3A6IGV2LnBhZ2VZIC0gMzAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KS5vbignbW91c2VsZWF2ZScsICcucHJvZ3Jlc3Mtc2VnbWVudCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAkKCcuc3RvcmFnZS10b29sdGlwJykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgJChkb2N1bWVudCkub2ZmKCdtb3VzZW1vdmUudG9vbHRpcCcpO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIC8vIEhpZ2hsaWdodCBtYXRjaGluZyBwcm9ncmVzcyBzZWdtZW50IG9uIGNhdGVnb3J5IGxpc3QgaG92ZXIgdmlhIENTUyBjbGFzc1xuICAgICAgICAgICAgJCgnLmNhdGVnb3J5LWl0ZW0nKS5vbignbW91c2VlbnRlcicsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBjYXRlZ29yeSA9ICQodGhpcykuZGF0YSgnY2F0ZWdvcnknKTtcbiAgICAgICAgICAgICAgICAkKGAucHJvZ3Jlc3Mtc2VnbWVudFtkYXRhLWNhdGVnb3J5PVwiJHtjYXRlZ29yeX1cIl1gKS5hZGRDbGFzcygnaGlnaGxpZ2h0ZWQnKTtcbiAgICAgICAgICAgIH0pLm9uKCdtb3VzZWxlYXZlJywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICQoJy5wcm9ncmVzcy1zZWdtZW50JykucmVtb3ZlQ2xhc3MoJ2hpZ2hsaWdodGVkJyk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFJlbmRlciByZW1vdGUgc3RvcmFnZSBpbmZvIChTMylcbiAgICAgICAgaWYgKGRhdGEucmVtb3RlX3N0b3JhZ2UgJiYgZGF0YS5yZW1vdGVfc3RvcmFnZS5zMyAmJiBkYXRhLnJlbW90ZV9zdG9yYWdlLnMzLmVuYWJsZWQgJiYgZGF0YS5yZW1vdGVfc3RvcmFnZS5zMy5zaXplID4gMCkge1xuICAgICAgICAgICAgY29uc3QgczMgPSBkYXRhLnJlbW90ZV9zdG9yYWdlLnMzO1xuICAgICAgICAgICAgJCgnI3JlbW90ZS1zdG9yYWdlLXRpdGxlJykudGV4dChnbG9iYWxUcmFuc2xhdGUuc3RfUzNSZW1vdGVTdG9yYWdlVGl0bGUpO1xuICAgICAgICAgICAgJCgnI3JlbW90ZS1zdG9yYWdlLWRldGFpbHMnKS50ZXh0KFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF9TM1JlbW90ZVN0b3JhZ2VJbmZvXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKCclZmlsZXMlJywgczMuZmlsZXNfY291bnQudG9Mb2NhbGVTdHJpbmcoKSlcbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoJyVzaXplJScsIGZvcm1hdFNpemUoczMuc2l6ZSkpXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKCclYnVja2V0JScsIHMzLmJ1Y2tldClcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICAkKCcjcmVtb3RlLXN0b3JhZ2Utc2VjdGlvbicpLnNob3coKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogV2lyZSB0aGUgZGlzayBiZW5jaG1hcmsgY2FyZDogbG9hZCB0aGUgbGFzdCBjYWNoZWQgbWVhc3VyZW1lbnQgb25cbiAgICAgKiBwYWdlIG9wZW4sIGhhbmQgdGhlIFwiUnVuIGFnYWluXCIgYnV0dG9uIHRvIHJ1bkRpc2tCZW5jaG1hcmsoKS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplRGlza0JlbmNobWFyaygpIHtcbiAgICAgICAgU3RvcmFnZUFQSS5nZXRJb0JlbmNobWFyaygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIHN0b3JhZ2VJbmRleC5yZW5kZXJEaXNrQmVuY2htYXJrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzdG9yYWdlSW5kZXguc2hvd0Rpc2tCZW5jaG1hcmtFbXB0eSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAkKCcjZGlzay1iZW5jaG1hcmstcnVuLWJ1dHRvbicpLm9mZignY2xpY2suZGlza2JlbmNoJykub24oJ2NsaWNrLmRpc2tiZW5jaCcsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBzdG9yYWdlSW5kZXgucnVuRGlza0JlbmNobWFyaygpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvdyB0aGUgXCJubyBtZWFzdXJlbWVudCB5ZXRcIiBzdGF0ZS5cbiAgICAgKi9cbiAgICBzaG93RGlza0JlbmNobWFya0VtcHR5KCkge1xuICAgICAgICAkKCcjZGlzay1zcGVlZC1lbXB0eScpLnNob3coKTtcbiAgICAgICAgJCgnI2Rpc2stc3BlZWQtcmVzdWx0JykuaGlkZSgpO1xuICAgICAgICAkKCcjZGlzay1zcGVlZC1ydW5uaW5nJykuaGlkZSgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93IHRoZSBkZCB3cml0ZS9yZWFkIG51bWJlcnMgYW5kIHRoZSB0aW1lc3RhbXAgZnJvbSB0aGUgY2FjaGVkXG4gICAgICogcmVzdWx0LiBCb3RoIG51bWJlcnMgYXJlIHByZS1yb3VuZGVkIHNlcnZlci1zaWRlOyB3ZSBvbmx5IGZvcm1hdFxuICAgICAqIHRoZSBsb2NhbGlzZWQgZGF0ZSBoZXJlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHt7d3JpdGVNQnBzOm51bWJlciwgcmVhZE1CcHM6bnVtYmVyLCBtZWFzdXJlZEF0Om51bWJlcn19IGRhdGFcbiAgICAgKi9cbiAgICByZW5kZXJEaXNrQmVuY2htYXJrKGRhdGEpIHtcbiAgICAgICAgJCgnI2Rpc2stc3BlZWQtZW1wdHknKS5oaWRlKCk7XG4gICAgICAgICQoJyNkaXNrLXNwZWVkLXJ1bm5pbmcnKS5oaWRlKCk7XG4gICAgICAgICQoJyNkaXNrLXNwZWVkLXJlc3VsdCcpLmNzcygnZGlzcGxheScsICdpbmxpbmUtZmxleCcpO1xuXG4gICAgICAgICQoJyNkaXNrLWJlbmNobWFyay13cml0ZScpLnRleHQoXG4gICAgICAgICAgICB0eXBlb2YgZGF0YS53cml0ZU1CcHMgPT09ICdudW1iZXInID8gZGF0YS53cml0ZU1CcHMudG9GaXhlZCgxKSA6ICfigJQnXG4gICAgICAgICk7XG4gICAgICAgICQoJyNkaXNrLWJlbmNobWFyay1yZWFkJykudGV4dChcbiAgICAgICAgICAgIHR5cGVvZiBkYXRhLnJlYWRNQnBzID09PSAnbnVtYmVyJyA/IGRhdGEucmVhZE1CcHMudG9GaXhlZCgxKSA6ICfigJQnXG4gICAgICAgICk7XG5cbiAgICAgICAgaWYgKGRhdGEuX21ldGEpIHtcbiAgICAgICAgICAgIFBieERhdGVUaW1lLnNldFNlcnZlck1ldGEoZGF0YS5fbWV0YSk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGRhdGEubWVhc3VyZWRBdCkge1xuICAgICAgICAgICAgLy8gUmVuZGVyIGluIHNlcnZlciBUWiArIEZvbWFudGljIHBvcHVwIHdpdGggdGhlIGR1YWwtVFogdG9vbHRpcC5cbiAgICAgICAgICAgIC8vIFRoZSBvcGVyYXRvciBzaG91bGQgbmV2ZXIgaGF2ZSB0byBjb252ZXJ0IGJldHdlZW4gXCJicm93c2VyXG4gICAgICAgICAgICAvLyBzYWlkXCIgYW5kIFwic2VydmVyIGxvZ2dlZFwiIHdoZW4gcmV2aWV3aW5nIGEgYmVuY2htYXJrIHRpbWVzdGFtcC5cbiAgICAgICAgICAgIGNvbnN0ICRjZWxsID0gJCgnI2Rpc2stYmVuY2htYXJrLW1lYXN1cmVkLWF0Jyk7XG4gICAgICAgICAgICAkY2VsbC50ZXh0KFBieERhdGVUaW1lLmZvcm1hdFNlcnZlclRpbWUoZGF0YS5tZWFzdXJlZEF0KSk7XG4gICAgICAgICAgICAkY2VsbC5wb3B1cCgnZGVzdHJveScpO1xuICAgICAgICAgICAgJGNlbGwucG9wdXAoe1xuICAgICAgICAgICAgICAgIGh0bWw6IFBieERhdGVUaW1lLmJ1aWxkRHVhbFRvb2x0aXBIdG1sKGRhdGEubWVhc3VyZWRBdCksXG4gICAgICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiAndG9wIGxlZnQnLFxuICAgICAgICAgICAgICAgIHZhcmlhdGlvbjogJ2ludmVydGVkJyxcbiAgICAgICAgICAgICAgICBkZWxheTogeyBzaG93OiAyMDAsIGhpZGU6IDEwMCB9LFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkKCcjZGlzay1iZW5jaG1hcmstbWVhc3VyZWQtYXQnKS50ZXh0KCfigJQnKS5wb3B1cCgnZGVzdHJveScpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEtpY2sgb2ZmIGEgZnJlc2ggYmVuY2htYXJrLiBUaGUgUE9TVCBibG9ja3Mgc2VydmVyLXNpZGUgZm9yIH414oCTMzAgc1xuICAgICAqIHdoaWxlIGRkIHJ1bnMgYm90aCBwaGFzZXM7IHdlIGp1c3QgdG9nZ2xlIHRoZSBydW5uaW5nIHN0YXRlIGFuZFxuICAgICAqIHJlLXJlbmRlciB3aXRoIHdoYXRldmVyIHRoZSBzZXJ2ZXIgcmV0dXJucy5cbiAgICAgKi9cbiAgICBydW5EaXNrQmVuY2htYXJrKCkge1xuICAgICAgICBpZiAoc3RvcmFnZUluZGV4LmJlbmNobWFya1J1bm5pbmcpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBzdG9yYWdlSW5kZXguYmVuY2htYXJrUnVubmluZyA9IHRydWU7XG4gICAgICAgICQoJyNkaXNrLXNwZWVkLWVtcHR5JykuaGlkZSgpO1xuICAgICAgICAkKCcjZGlzay1zcGVlZC1yZXN1bHQnKS5oaWRlKCk7XG4gICAgICAgICQoJyNkaXNrLXNwZWVkLXJ1bm5pbmcnKS5zaG93KCk7XG4gICAgICAgICQoJyNkaXNrLWJlbmNobWFyay1ydW4tYnV0dG9uJykucHJvcCgnZGlzYWJsZWQnLCB0cnVlKTtcblxuICAgICAgICBTdG9yYWdlQVBJLnJ1bklvQmVuY2htYXJrKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgc3RvcmFnZUluZGV4LmJlbmNobWFya1J1bm5pbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICQoJyNkaXNrLWJlbmNobWFyay1ydW4tYnV0dG9uJykucHJvcCgnZGlzYWJsZWQnLCBmYWxzZSk7XG5cbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIHN0b3JhZ2VJbmRleC5yZW5kZXJEaXNrQmVuY2htYXJrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzdG9yYWdlSW5kZXguc2hvd0Rpc2tCZW5jaG1hcmtFbXB0eSgpO1xuICAgICAgICAgICAgICAgIGlmICh0eXBlb2YgVXNlck1lc3NhZ2UgIT09ICd1bmRlZmluZWQnICYmIHJlc3BvbnNlLm1lc3NhZ2VzKSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQnVpbGQgSFRNTCBjb250ZW50IGZvciB0b29sdGlwIHBvcHVwXG4gICAgICogQHBhcmFtIHtPYmplY3R9IGNvbmZpZyAtIFRvb2x0aXAgY29uZmlndXJhdGlvbiBvYmplY3RcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MIHN0cmluZyBmb3IgcG9wdXAgY29udGVudFxuICAgICAqL1xuICAgIGJ1aWxkVG9vbHRpcENvbnRlbnQoY29uZmlnKSB7XG4gICAgICAgIGxldCBodG1sID0gJzxkaXYgY2xhc3M9XCJ1aSByZWxheGVkIGxpc3RcIj4nO1xuXG4gICAgICAgIC8vIEhlYWRlclxuICAgICAgICBpZiAoY29uZmlnLmhlYWRlcikge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj48c3Ryb25nPiR7Y29uZmlnLmhlYWRlcn08L3N0cm9uZz48L2Rpdj5gO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRGVzY3JpcHRpb25cbiAgICAgICAgaWYgKGNvbmZpZy5kZXNjcmlwdGlvbikge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj4ke2NvbmZpZy5kZXNjcmlwdGlvbn08L2Rpdj5gO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTWFpbiBsaXN0XG4gICAgICAgIGlmIChjb25maWcubGlzdCAmJiBjb25maWcubGlzdC5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiaXRlbVwiPjx1bCBjbGFzcz1cInVpIGxpc3RcIj4nO1xuICAgICAgICAgICAgY29uZmlnLmxpc3QuZm9yRWFjaChpdGVtID0+IHtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT4ke2l0ZW19PC9saT5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXRlbS50ZXJtICYmIGl0ZW0uZGVmaW5pdGlvbiA9PT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBTZWN0aW9uIGhlYWRlclxuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8L3VsPjxzdHJvbmc+JHtpdGVtLnRlcm19PC9zdHJvbmc+PHVsIGNsYXNzPVwidWkgbGlzdFwiPmA7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChpdGVtLnRlcm0gJiYgaXRlbS5kZWZpbml0aW9uKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFRlcm0gd2l0aCBkZWZpbml0aW9uXG4gICAgICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxsaT48c3Ryb25nPiR7aXRlbS50ZXJtfTo8L3N0cm9uZz4gJHtpdGVtLmRlZmluaXRpb259PC9saT5gO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgaHRtbCArPSAnPC91bD48L2Rpdj4nO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQWRkaXRpb25hbCBsaXN0cyAobGlzdDItbGlzdDEwKVxuICAgICAgICBmb3IgKGxldCBpID0gMjsgaSA8PSAxMDsgaSsrKSB7XG4gICAgICAgICAgICBjb25zdCBsaXN0S2V5ID0gYGxpc3Qke2l9YDtcbiAgICAgICAgICAgIGlmIChjb25maWdbbGlzdEtleV0gJiYgY29uZmlnW2xpc3RLZXldLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiaXRlbVwiPjx1bCBjbGFzcz1cInVpIGxpc3RcIj4nO1xuICAgICAgICAgICAgICAgIGNvbmZpZ1tsaXN0S2V5XS5mb3JFYWNoKGl0ZW0gPT4ge1xuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+JHtpdGVtfTwvbGk+YDtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gJzwvdWw+PC9kaXY+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFdhcm5pbmdcbiAgICAgICAgaWYgKGNvbmZpZy53YXJuaW5nKSB7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiaXRlbVwiPjxkaXYgY2xhc3M9XCJ1aSBvcmFuZ2UgbWVzc2FnZVwiPic7XG4gICAgICAgICAgICBpZiAoY29uZmlnLndhcm5pbmcuaGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cImhlYWRlclwiPiR7Y29uZmlnLndhcm5pbmcuaGVhZGVyfTwvZGl2PmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoY29uZmlnLndhcm5pbmcudGV4dCkge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxwPiR7Y29uZmlnLndhcm5pbmcudGV4dH08L3A+YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2PjwvZGl2Pic7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBFeGFtcGxlc1xuICAgICAgICBpZiAoY29uZmlnLmV4YW1wbGVzICYmIGNvbmZpZy5leGFtcGxlcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBpZiAoY29uZmlnLmV4YW1wbGVzSGVhZGVyKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj48c3Ryb25nPiR7Y29uZmlnLmV4YW1wbGVzSGVhZGVyfTwvc3Ryb25nPjwvZGl2PmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiaXRlbVwiPjxwcmUgc3R5bGU9XCJiYWNrZ3JvdW5kOiNmNGY0ZjQ7cGFkZGluZzoxMHB4O2JvcmRlci1yYWRpdXM6NHB4O1wiPic7XG4gICAgICAgICAgICBodG1sICs9IGNvbmZpZy5leGFtcGxlcy5qb2luKCdcXG4nKTtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvcHJlPjwvZGl2Pic7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBOb3RlXG4gICAgICAgIGlmIChjb25maWcubm90ZSkge1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cIml0ZW1cIj48ZW0+JHtjb25maWcubm90ZX08L2VtPjwvZGl2PmA7XG4gICAgICAgIH1cblxuICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQnVpbGQgdGhlIHMzX2VuZHBvaW50IHRvb2x0aXAgSFRNTCwgd2VhdmluZyBpbiB0aGUgY3VycmVudFxuICAgICAqIHBlci1wcmVzZXQgbm90ZSAoaWYgYW55KSBhcyB0aGUgdHJhaWxpbmcgYG5vdGVgIHNsb3QuIExpdmVzIGluIGl0c1xuICAgICAqIG93biBtZXRob2Qgc28gc2V0UzNFbmRwb2ludFByZXNldE5vdGUoKSBjYW4gcmVidWlsZCB0aGUgY29udGVudCBvblxuICAgICAqIHRoZSBmbHkgd2l0aG91dCByZS1ydW5uaW5nIHRoZSByZXN0IG9mIHRoZSB0b29sdGlwIG1hY2hpbmVyeS5cbiAgICAgKlxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEhUTUxcbiAgICAgKi9cbiAgICBidWlsZFMzRW5kcG9pbnRUb29sdGlwQ29udGVudCgpIHtcbiAgICAgICAgcmV0dXJuIHN0b3JhZ2VJbmRleC5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfZW5kcG9pbnRfaGVhZGVyLFxuICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2VuZHBvaW50X2Rlc2MsXG4gICAgICAgICAgICBleGFtcGxlczogW1xuICAgICAgICAgICAgICAgICdBV1MgUzM6IGh0dHBzOi8vczMuYXAtc291dGhlYXN0LTEuYW1hem9uYXdzLmNvbScsXG4gICAgICAgICAgICAgICAgJ1lhbmRleCBDbG91ZDogaHR0cHM6Ly9zdG9yYWdlLnlhbmRleGNsb3VkLm5ldCcsXG4gICAgICAgICAgICAgICAgJ1ZLIENsb3VkOiBodHRwczovL2hiLmt6LWFzdC52a2Nsb3VkLXN0b3JhZ2UucnUnLFxuICAgICAgICAgICAgICAgICdDbG91ZGZsYXJlIFIyOiBodHRwczovLzxBQ0NPVU5UX0lEPi5yMi5jbG91ZGZsYXJlc3RvcmFnZS5jb20nLFxuICAgICAgICAgICAgICAgICdEaWdpdGFsT2NlYW46IGh0dHBzOi8vc2dwMS5kaWdpdGFsb2NlYW5zcGFjZXMuY29tJyxcbiAgICAgICAgICAgICAgICAnTWluSU86IGh0dHA6Ly9taW5pby5leGFtcGxlLmNvbTo5MDAwJyxcbiAgICAgICAgICAgIF0sXG4gICAgICAgICAgICBleGFtcGxlc0hlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfZXhhbXBsZXMsXG4gICAgICAgICAgICBub3RlOiBzdG9yYWdlSW5kZXguczNFbmRwb2ludFByZXNldE5vdGUgfHwgbnVsbCxcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSB0aGUgcGVyLXByZXNldCBub3RlIHRoYXQgdGhlIHMzX2VuZHBvaW50IHRvb2x0aXAgY2FycmllcyBhbmRcbiAgICAgKiBwdXNoIHRoZSByZWJ1aWx0IEhUTUwgaW50byB0aGUgbGl2ZSBGb21hbnRpYyBwb3B1cC4gQ2FsbGVkIGZyb21cbiAgICAgKiBzMy1zdG9yYWdlLWluZGV4LmpzIHdoZW5ldmVyIHRoZSBwcm92aWRlciBwcmVzZXQgY2hhbmdlcyBzbyB0aGVcbiAgICAgKiBwcmVzZXQtc3BlY2lmaWMgZ3VpZGFuY2UgbGl2ZXMgbmV4dCB0byB0aGUgZmllbGQgaXQgYWN0dWFsbHlcbiAgICAgKiBhZmZlY3RzIChubyBzZXBhcmF0ZSBoaW50IGJhbm5lciBuZWVkZWQpLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRleHRcbiAgICAgKi9cbiAgICBzZXRTM0VuZHBvaW50UHJlc2V0Tm90ZSh0ZXh0KSB7XG4gICAgICAgIHN0b3JhZ2VJbmRleC5zM0VuZHBvaW50UHJlc2V0Tm90ZSA9IHRleHQgfHwgJyc7XG4gICAgICAgIGNvbnN0ICRpY29uID0gJCgnLmZpZWxkLWluZm8taWNvbltkYXRhLWZpZWxkPVwiczNfZW5kcG9pbnRcIl0nKTtcbiAgICAgICAgaWYgKCRpY29uLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIC8vIElmIHRoZSBwb3B1cCBoYXNuJ3QgYmVlbiBpbml0aWFsaXNlZCB5ZXQgKGUuZy4gY2xvdWQgdGFiIG5vdFxuICAgICAgICAvLyB2aXNpdGVkIHlldCksIGRvIG5vdGhpbmcgZXh0cmEg4oCUIGluaXRpYWxpemVUb29sdGlwcygpIHdpbGwgcGlja1xuICAgICAgICAvLyB1cCB0aGUgbmV3IHN0YXRlIHZpYSBidWlsZFMzRW5kcG9pbnRUb29sdGlwQ29udGVudCgpIG9uIGZpcnN0XG4gICAgICAgIC8vIGluaXQuIEF2b2lkcyBhIGRlc3Ryb3kvcmVpbml0IHJhY2UgdGhhdCB3b3VsZCBvdGhlcndpc2Ugd2lwZVxuICAgICAgICAvLyB0aGUgZHluYW1pYyBub3RlIHdoZW4gaW5pdGlhbGl6ZVRvb2x0aXBzKCkgcnVucyBsYXRlci5cbiAgICAgICAgaWYgKCRpY29uLnBvcHVwKCdleGlzdHMnKSkge1xuICAgICAgICAgICAgJGljb24ucG9wdXAoJ2NoYW5nZSBjb250ZW50Jywgc3RvcmFnZUluZGV4LmJ1aWxkUzNFbmRwb2ludFRvb2x0aXBDb250ZW50KCkpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdG9vbHRpcHMgZm9yIGZvcm0gZmllbGRzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVRvb2x0aXBzKCkge1xuICAgICAgICAvLyBUb29sdGlwIGNvbmZpZ3VyYXRpb25zIGZvciBlYWNoIGZpZWxkXG4gICAgICAgIGNvbnN0IHRvb2x0aXBDb25maWdzID0ge1xuICAgICAgICAgICAgcmVjb3JkX3JldGVudGlvbl9wZXJpb2Q6IHN0b3JhZ2VJbmRleC5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2l0ZW0xLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2l0ZW0yLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2l0ZW0zLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2l0ZW00XG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl93YXJuaW5nX2hlYWRlcixcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl93YXJuaW5nXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgIHMzX2VuYWJsZWQ6IHN0b3JhZ2VJbmRleC5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2VuYWJsZWRfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19lbmFibGVkX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19lbmFibGVkX2l0ZW0xLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19lbmFibGVkX2l0ZW0yLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19lbmFibGVkX2l0ZW0zXG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgIHMzX3Byb3ZpZGVyX3ByZXNldDogc3RvcmFnZUluZGV4LmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfcHJlc2V0X2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfcHJlc2V0X2Rlc2MsXG4gICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgczNfZW5kcG9pbnQ6IHN0b3JhZ2VJbmRleC5idWlsZFMzRW5kcG9pbnRUb29sdGlwQ29udGVudCgpLFxuXG4gICAgICAgICAgICBzM19yZWdpb246IHN0b3JhZ2VJbmRleC5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX3JlZ2lvbl9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX3JlZ2lvbl9kZXNjLFxuICAgICAgICAgICAgICAgIGV4YW1wbGVzOiBbXG4gICAgICAgICAgICAgICAgICAgICd1cy1lYXN0LTEgKGRlZmF1bHQpJyxcbiAgICAgICAgICAgICAgICAgICAgJ2V1LXdlc3QtMScsXG4gICAgICAgICAgICAgICAgICAgICdhcC1zb3V0aGVhc3QtMSdcbiAgICAgICAgICAgICAgICBdLFxuICAgICAgICAgICAgICAgIG5vdGU6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX3JlZ2lvbl9ub3RlXG4gICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgczNfYnVja2V0OiBzdG9yYWdlSW5kZXguYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19idWNrZXRfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19idWNrZXRfZGVzYyxcbiAgICAgICAgICAgICAgICBsaXN0OiBbXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2J1Y2tldF9pdGVtMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfYnVja2V0X2l0ZW0yLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19idWNrZXRfaXRlbTNcbiAgICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgczNfYWNjZXNzX2tleTogc3RvcmFnZUluZGV4LmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfYWNjZXNzX2tleV9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2FjY2Vzc19rZXlfZGVzYyxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19hY2Nlc3Nfa2V5X25vdGVcbiAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICBzM19zZWNyZXRfa2V5OiBzdG9yYWdlSW5kZXguYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19zZWNyZXRfa2V5X2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfc2VjcmV0X2tleV9kZXNjLFxuICAgICAgICAgICAgICAgIHdhcm5pbmc6IHtcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF93YXJuaW5nLFxuICAgICAgICAgICAgICAgICAgICB0ZXh0OiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19zZWNyZXRfa2V5X3dhcm5pbmdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgbG9jYWxfcmV0ZW50aW9uX3BlcmlvZDogc3RvcmFnZUluZGV4LmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25faXRlbTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9pdGVtMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2l0ZW0zXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfbm90ZSxcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX3dhcm5pbmdcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgcG9wdXAgZm9yIGVhY2ggdG9vbHRpcCBpY29uXG4gICAgICAgICQoJy5maWVsZC1pbmZvLWljb24nKS5lYWNoKChpbmRleCwgZWxlbWVudCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGljb24gPSAkKGVsZW1lbnQpO1xuICAgICAgICAgICAgY29uc3QgZmllbGROYW1lID0gJGljb24uZGF0YSgnZmllbGQnKTtcbiAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSB0b29sdGlwQ29uZmlnc1tmaWVsZE5hbWVdO1xuXG4gICAgICAgICAgICBpZiAoY29udGVudCkge1xuICAgICAgICAgICAgICAgICRpY29uLnBvcHVwKHtcbiAgICAgICAgICAgICAgICAgICAgaHRtbDogY29udGVudCxcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnLFxuICAgICAgICAgICAgICAgICAgICBob3ZlcmFibGU6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgIGRlbGF5OiB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzaG93OiAzMDAsXG4gICAgICAgICAgICAgICAgICAgICAgICBoaWRlOiAxMDBcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICAgICAgdmFyaWF0aW9uOiAnZmxvd2luZydcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gc3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAoIXJlc3BvbnNlLnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gc3RvcmFnZUluZGV4LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24gPSBzdG9yYWdlSW5kZXguJHN1Ym1pdEJ1dHRvbjtcbiAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQgPSBzdG9yYWdlSW5kZXguJGRyb3Bkb3duU3VibWl0O1xuICAgICAgICBGb3JtLiRkaXJydHlGaWVsZCA9IHN0b3JhZ2VJbmRleC4kZGlycnR5RmllbGQ7XG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IHN0b3JhZ2VJbmRleC52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBzdG9yYWdlSW5kZXguY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBzdG9yYWdlSW5kZXguY2JBZnRlclNlbmRGb3JtO1xuXG4gICAgICAgIC8vIENvbmZpZ3VyZSBSRVNUIEFQSSBzZXR0aW5ncyBmb3IgRm9ybS5qcyAoc2luZ2xldG9uIHJlc291cmNlKVxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzID0ge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGFwaU9iamVjdDogU3RvcmFnZUFQSSxcbiAgICAgICAgICAgIHNhdmVNZXRob2Q6ICd1cGRhdGUnIC8vIFVzaW5nIHN0YW5kYXJkIFBVVCBmb3Igc2luZ2xldG9uIHVwZGF0ZVxuICAgICAgICB9O1xuXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH1cbn07XG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBzdG9yYWdlIG1hbmFnZW1lbnQgaW50ZXJmYWNlLlxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIHN0b3JhZ2VJbmRleC5pbml0aWFsaXplKCk7XG59KTsiXX0=