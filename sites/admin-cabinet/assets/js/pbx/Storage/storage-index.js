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

/* global globalRootUrl, globalTranslate, Form, StorageAPI, UserMessage, s3StorageIndex, $, PbxDateTime, TooltipBuilder */

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
    }; // Delegate to TooltipBuilder so popups use `on: 'manual'` +
    // `click.popup-trigger` + `lastResort: true`. Without this, a click
    // on the s3_enabled icon (nested inside the toggle <label>) flips
    // the storage mode, and long tooltips get hidden on small viewports.
    // See docs/TOOLTIP_GUIDELINES.md.

    if (typeof TooltipBuilder === 'undefined') {
      console.error('storageIndex: TooltipBuilder is not available');
      return;
    }

    TooltipBuilder.initialize(tooltipConfigs, {
      selector: '.field-info-icon',
      position: 'top right',
      hoverable: true,
      showDelay: 300,
      hideDelay: 100,
      variation: 'flowing'
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TdG9yYWdlL3N0b3JhZ2UtaW5kZXguanMiXSwibmFtZXMiOlsic3RvcmFnZUluZGV4IiwiJGZvcm1PYmoiLCIkc3VibWl0QnV0dG9uIiwiJGRyb3Bkb3duU3VibWl0IiwiJGRpcnJ0eUZpZWxkIiwiJHJlY29yZHNTYXZlUGVyaW9kU2xpZGVyIiwic2F2ZVJlY29yZHNQZXJpb2QiLCJ2YWxpZGF0ZVJ1bGVzIiwiczNFbmRwb2ludFByZXNldE5vdGUiLCJiZW5jaG1hcmtSdW5uaW5nIiwiaW5pdGlhbGl6ZSIsIiQiLCJmaW5kIiwidGFiIiwiaGlzdG9yeSIsImhpc3RvcnlUeXBlIiwib25WaXNpYmxlIiwidGFiUGF0aCIsImxvYWRTdG9yYWdlRGF0YSIsImluaXRpYWxpemVGb3JtIiwiczNTdG9yYWdlSW5kZXgiLCJzbGlkZXIiLCJtaW4iLCJtYXgiLCJzdGVwIiwic21vb3RoIiwiYXV0b0FkanVzdExhYmVscyIsImludGVycHJldExhYmVsIiwidmFsdWUiLCJsYWJlbHMiLCJnbG9iYWxUcmFuc2xhdGUiLCJzdF9TdG9yZTFNb250aE9mUmVjb3JkcyIsInN0X1N0b3JlM01vbnRoc09mUmVjb3JkcyIsInN0X1N0b3JlNk1vbnRoc09mUmVjb3JkcyIsInN0X1N0b3JlMVllYXJPZlJlY29yZHMiLCJzdF9TdG9yZTNZZWFyc09mUmVjb3JkcyIsInN0X1N0b3JlQWxsUG9zc2libGVSZWNvcmRzIiwib25DaGFuZ2UiLCJjYkFmdGVyU2VsZWN0U2F2ZVBlcmlvZFNsaWRlciIsImluaXRpYWxpemVUb29sdGlwcyIsImxvYWRTZXR0aW5ncyIsImluaXRpYWxpemVEaXNrQmVuY2htYXJrIiwic2F2ZVBlcmlvZCIsImZvcm0iLCJ1cGRhdGVTbGlkZXJMaW1pdHMiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJTdG9yYWdlQVBJIiwiZ2V0IiwicmVzcG9uc2UiLCJyZXN1bHQiLCJkYXRhIiwiUEJYUmVjb3JkU2F2ZVBlcmlvZCIsInJlY29yZFNhdmVQZXJpb2QiLCJzbGlkZXJJbmRleCIsImluZGV4T2YiLCJhZGRDbGFzcyIsImhpZGUiLCJnZXRVc2FnZSIsInJlbmRlclN0b3JhZ2VEYXRhIiwicmVtb3ZlQ2xhc3MiLCJVc2VyTWVzc2FnZSIsInNob3dNdWx0aVN0cmluZyIsInN0X1N0b3JhZ2VMb2FkRXJyb3IiLCJzaG93IiwiZm9ybWF0U2l6ZSIsInNpemVJbk1iIiwidG9GaXhlZCIsInRleHQiLCJ1c2VkX3NwYWNlIiwidG90YWxfc2l6ZSIsImFjY3VtdWxhdGVkV2lkdGgiLCJmb3JFYWNoIiwiY2F0ZWdvcnkiLCJjYXREYXRhIiwiY2F0ZWdvcmllcyIsIiRzZWdtZW50IiwicGVyY2VudGFnZSIsImNzcyIsImNhdGVnb3J5S2V5Iiwic3BsaXQiLCJtYXAiLCJ3b3JkIiwiY2hhckF0IiwidG9VcHBlckNhc2UiLCJzbGljZSIsImpvaW4iLCJhdHRyIiwic2l6ZSIsIl9ob3ZlckJvdW5kIiwib24iLCJlIiwidG9vbHRpcCIsImFwcGVuZCIsImRvY3VtZW50IiwiZXYiLCJsZWZ0IiwicGFnZVgiLCJ0b3AiLCJwYWdlWSIsInJlbW92ZSIsIm9mZiIsInJlbW90ZV9zdG9yYWdlIiwiczMiLCJlbmFibGVkIiwic3RfUzNSZW1vdGVTdG9yYWdlVGl0bGUiLCJzdF9TM1JlbW90ZVN0b3JhZ2VJbmZvIiwicmVwbGFjZSIsImZpbGVzX2NvdW50IiwidG9Mb2NhbGVTdHJpbmciLCJidWNrZXQiLCJnZXRJb0JlbmNobWFyayIsInJlbmRlckRpc2tCZW5jaG1hcmsiLCJzaG93RGlza0JlbmNobWFya0VtcHR5IiwicHJldmVudERlZmF1bHQiLCJydW5EaXNrQmVuY2htYXJrIiwid3JpdGVNQnBzIiwicmVhZE1CcHMiLCJfbWV0YSIsIlBieERhdGVUaW1lIiwic2V0U2VydmVyTWV0YSIsIm1lYXN1cmVkQXQiLCIkY2VsbCIsImZvcm1hdFNlcnZlclRpbWUiLCJwb3B1cCIsImh0bWwiLCJidWlsZER1YWxUb29sdGlwSHRtbCIsImhvdmVyYWJsZSIsInBvc2l0aW9uIiwidmFyaWF0aW9uIiwiZGVsYXkiLCJwcm9wIiwicnVuSW9CZW5jaG1hcmsiLCJtZXNzYWdlcyIsImJ1aWxkVG9vbHRpcENvbnRlbnQiLCJjb25maWciLCJoZWFkZXIiLCJkZXNjcmlwdGlvbiIsImxpc3QiLCJsZW5ndGgiLCJpdGVtIiwidGVybSIsImRlZmluaXRpb24iLCJpIiwibGlzdEtleSIsIndhcm5pbmciLCJleGFtcGxlcyIsImV4YW1wbGVzSGVhZGVyIiwibm90ZSIsImJ1aWxkUzNFbmRwb2ludFRvb2x0aXBDb250ZW50Iiwic3RfdG9vbHRpcF9zM19lbmRwb2ludF9oZWFkZXIiLCJzdF90b29sdGlwX3MzX2VuZHBvaW50X2Rlc2MiLCJzdF90b29sdGlwX2V4YW1wbGVzIiwic2V0UzNFbmRwb2ludFByZXNldE5vdGUiLCIkaWNvbiIsInRvb2x0aXBDb25maWdzIiwicmVjb3JkX3JldGVudGlvbl9wZXJpb2QiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faGVhZGVyIiwic3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2Rlc2MiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTEiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTIiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTMiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25faXRlbTQiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25fd2FybmluZ19oZWFkZXIiLCJzdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25fd2FybmluZyIsInMzX2VuYWJsZWQiLCJzdF90b29sdGlwX3MzX2VuYWJsZWRfaGVhZGVyIiwic3RfdG9vbHRpcF9zM19lbmFibGVkX2Rlc2MiLCJzdF90b29sdGlwX3MzX2VuYWJsZWRfaXRlbTEiLCJzdF90b29sdGlwX3MzX2VuYWJsZWRfaXRlbTIiLCJzdF90b29sdGlwX3MzX2VuYWJsZWRfaXRlbTMiLCJzM19wcm92aWRlcl9wcmVzZXQiLCJzdF90b29sdGlwX3MzX3ByZXNldF9oZWFkZXIiLCJzdF90b29sdGlwX3MzX3ByZXNldF9kZXNjIiwiczNfZW5kcG9pbnQiLCJzM19yZWdpb24iLCJzdF90b29sdGlwX3MzX3JlZ2lvbl9oZWFkZXIiLCJzdF90b29sdGlwX3MzX3JlZ2lvbl9kZXNjIiwic3RfdG9vbHRpcF9zM19yZWdpb25fbm90ZSIsInMzX2J1Y2tldCIsInN0X3Rvb2x0aXBfczNfYnVja2V0X2hlYWRlciIsInN0X3Rvb2x0aXBfczNfYnVja2V0X2Rlc2MiLCJzdF90b29sdGlwX3MzX2J1Y2tldF9pdGVtMSIsInN0X3Rvb2x0aXBfczNfYnVja2V0X2l0ZW0yIiwic3RfdG9vbHRpcF9zM19idWNrZXRfaXRlbTMiLCJzM19hY2Nlc3Nfa2V5Iiwic3RfdG9vbHRpcF9zM19hY2Nlc3Nfa2V5X2hlYWRlciIsInN0X3Rvb2x0aXBfczNfYWNjZXNzX2tleV9kZXNjIiwic3RfdG9vbHRpcF9zM19hY2Nlc3Nfa2V5X25vdGUiLCJzM19zZWNyZXRfa2V5Iiwic3RfdG9vbHRpcF9zM19zZWNyZXRfa2V5X2hlYWRlciIsInN0X3Rvb2x0aXBfczNfc2VjcmV0X2tleV9kZXNjIiwic3RfdG9vbHRpcF93YXJuaW5nIiwic3RfdG9vbHRpcF9zM19zZWNyZXRfa2V5X3dhcm5pbmciLCJsb2NhbF9yZXRlbnRpb25fcGVyaW9kIiwic3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25faGVhZGVyIiwic3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25fZGVzYyIsInN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2l0ZW0xIiwic3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25faXRlbTIiLCJzdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9pdGVtMyIsInN0X3Rvb2x0aXBfbm90ZSIsInN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX3dhcm5pbmciLCJUb29sdGlwQnVpbGRlciIsImNvbnNvbGUiLCJlcnJvciIsInNlbGVjdG9yIiwic2hvd0RlbGF5IiwiaGlkZURlbGF5IiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwiY2JBZnRlclNlbmRGb3JtIiwic3VjY2VzcyIsImFwaVNldHRpbmdzIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsWUFBWSxHQUFHO0FBQ2pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUUsSUFQTzs7QUFTakI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFLElBYkU7O0FBZWpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGVBQWUsRUFBRSxJQW5CQTs7QUFxQmpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBQVksRUFBRSxJQXpCRzs7QUEyQmpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLHdCQUF3QixFQUFFLElBL0JUOztBQWtDakI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsaUJBQWlCLEVBQUUsQ0FBQyxJQUFELEVBQU8sSUFBUCxFQUFhLEtBQWIsRUFBb0IsS0FBcEIsRUFBMkIsTUFBM0IsRUFBbUMsRUFBbkMsQ0F0Q0Y7O0FBMENqQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUUsRUE5Q0U7O0FBZ0RqQjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxvQkFBb0IsRUFBRSxFQXZETDs7QUF5RGpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxnQkFBZ0IsRUFBRSxLQS9ERDs7QUFpRWpCO0FBQ0o7QUFDQTtBQUNJQyxFQUFBQSxVQXBFaUIsd0JBb0VKO0FBQ1RWLElBQUFBLFlBQVksQ0FBQ0MsUUFBYixHQUF3QlUsQ0FBQyxDQUFDLHFCQUFELENBQXpCO0FBQ0FY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RUFBQUEsY0F2b0JpQiw0QkF1b0JBO0FBQ2IwQixJQUFBQSxJQUFJLENBQUM1QyxRQUFMLEdBQWdCRCxZQUFZLENBQUNDLFFBQTdCO0FBQ0E0QyxJQUFBQSxJQUFJLENBQUMzQyxhQUFMLEdBQXFCRixZQUFZLENBQUNFLGFBQWxDO0FBQ0EyQyxJQUFBQSxJQUFJLENBQUMxQyxlQUFMLEdBQXVCSCxZQUFZLENBQUNHLGVBQXBDO0FBQ0EwQyxJQUFBQSxJQUFJLENBQUN6QyxZQUFMLEdBQW9CSixZQUFZLENBQUNJLFlBQWpDO0FBQ0F5QyxJQUFBQSxJQUFJLENBQUN0QyxhQUFMLEdBQXFCUCxZQUFZLENBQUNPLGFBQWxDO0FBQ0FzQyxJQUFBQSxJQUFJLENBQUNtSyxnQkFBTCxHQUF3QmhOLFlBQVksQ0FBQ2dOLGdCQUFyQztBQUNBbkssSUFBQUEsSUFBSSxDQUFDcUssZUFBTCxHQUF1QmxOLFlBQVksQ0FBQ2tOLGVBQXBDLENBUGEsQ0FTYjs7QUFDQXJLLElBQUFBLElBQUksQ0FBQ3VLLFdBQUwsR0FBbUI7QUFDZjVHLE1BQUFBLE9BQU8sRUFBRSxJQURNO0FBRWY2RyxNQUFBQSxTQUFTLEVBQUV0SyxVQUZJO0FBR2Z1SyxNQUFBQSxVQUFVLEVBQUUsUUFIRyxDQUdNOztBQUhOLEtBQW5CO0FBTUF6SyxJQUFBQSxJQUFJLENBQUNuQyxVQUFMO0FBQ0g7QUF4cEJnQixDQUFyQixDLENBMnBCQTs7QUFDQUMsQ0FBQyxDQUFDbUYsUUFBRCxDQUFELENBQVl5SCxLQUFaLENBQWtCLFlBQU07QUFDcEJ2TixFQUFBQSxZQUFZLENBQUNVLFVBQWI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgU3RvcmFnZUFQSSwgVXNlck1lc3NhZ2UsIHMzU3RvcmFnZUluZGV4LCAkLCBQYnhEYXRlVGltZSwgVG9vbHRpcEJ1aWxkZXIgKi9cblxuLyoqXG4gKiBTdG9yYWdlIG1hbmFnZW1lbnQgbW9kdWxlXG4gKi9cbmNvbnN0IHN0b3JhZ2VJbmRleCA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgbG9jYWwgc3RvcmFnZSBmb3JtIChUYWIgMikuXG4gICAgICogU2VuZHMgZGF0YSB0bzogUEFUQ0ggL3BieGNvcmUvYXBpL3YzL3N0b3JhZ2UuXG4gICAgICogUmVzb2x2ZWQgaW4gaW5pdGlhbGl6ZSgpIOKAlCBtdXN0IG5vdCBjYWxsICQoKSBhdCBtb2R1bGUtbG9hZCB0aW1lLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgc3VibWl0IGJ1dHRvbiAodW5pcXVlIHRvIHRoaXMgZm9ybSkuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc3VibWl0QnV0dG9uOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGRyb3Bkb3duIHN1Ym1pdCAodW5pcXVlIHRvIHRoaXMgZm9ybSkuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZHJvcGRvd25TdWJtaXQ6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZGlydHkgZmllbGQgKHVuaXF1ZSB0byB0aGlzIGZvcm0pLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRpcnJ0eUZpZWxkOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHJlY29yZHMgcmV0ZW50aW9uIHBlcmlvZCBzbGlkZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkcmVjb3Jkc1NhdmVQZXJpb2RTbGlkZXI6IG51bGwsXG5cblxuICAgIC8qKlxuICAgICAqIFBvc3NpYmxlIHBlcmlvZCB2YWx1ZXMgZm9yIHRoZSByZWNvcmRzIHJldGVudGlvbi5cbiAgICAgKiBWYWx1ZXMgaW4gZGF5czogMzAsIDkwLCAxODAsIDM2MCwgMTA4MCwgJycgKGluZmluaXR5KVxuICAgICAqL1xuICAgIHNhdmVSZWNvcmRzUGVyaW9kOiBbJzMwJywgJzkwJywgJzE4MCcsICczNjAnLCAnMTA4MCcsICcnXSxcblxuXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgbG9jYWwgc3RvcmFnZSBmb3JtLlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge30sXG5cbiAgICAvKipcbiAgICAgKiBQZXItcHJlc2V0IG5vdGUgYXBwZW5kZWQgdG8gdGhlIHMzX2VuZHBvaW50IGZpZWxkIHRvb2x0aXAuIFVwZGF0ZWRcbiAgICAgKiBieSBzZXRTM0VuZHBvaW50UHJlc2V0Tm90ZSgpIGVhY2ggdGltZSB0aGUgb3BlcmF0b3IgcGlja3MgYSBkaWZmZXJlbnRcbiAgICAgKiBwcm92aWRlciBwcmVzZXQ7IHJlbmRlcmVkIGFzIHRoZSBgbm90ZWAgc2xvdCBvZiB0aGUgczNfZW5kcG9pbnRcbiAgICAgKiB0b29sdGlwIGNvbmZpZyBzbyBhbGwgcGVyLWZpZWxkIGhpbnRzIHN0YXkgaW4gb25lIHBsYWNlLlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgczNFbmRwb2ludFByZXNldE5vdGU6ICcnLFxuICAgIFxuICAgIC8qKlxuICAgICAqIFdoZXRoZXIgYSBiZW5jaG1hcmsgcnVuIGlzIGN1cnJlbnRseSBpbiBmbGlnaHQuIFByZXZlbnRzIHRoZSB1c2VyXG4gICAgICogZnJvbSBraWNraW5nIG9mZiBhIHNlY29uZCBjb25jdXJyZW50IGRkIHJ1biBieSBzcGFtLWNsaWNraW5nIHRoZVxuICAgICAqIGJ1dHRvbiB3aGlsZSB0aGUgZmlyc3Qgb25lIGlzIHN0aWxsIGJsb2NraW5nIHRoZSBzZXJ2ZXIgd29ya2VyLlxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGJlbmNobWFya1J1bm5pbmc6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBtb2R1bGUgd2l0aCBldmVudCBiaW5kaW5ncyBhbmQgY29tcG9uZW50IGluaXRpYWxpemF0aW9ucy5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICBzdG9yYWdlSW5kZXguJGZvcm1PYmogPSAkKCcjbG9jYWwtc3RvcmFnZS1mb3JtJyk7XG4gICAgICAgIHN0b3JhZ2VJbmRleC4kc3VibWl0QnV0dG9uID0gJCgnI3N1Ym1pdGJ1dHRvbi1sb2NhbCcpO1xuICAgICAgICBzdG9yYWdlSW5kZXguJGRyb3Bkb3duU3VibWl0ID0gJCgnI2Ryb3Bkb3duU3VibWl0LWxvY2FsJyk7XG4gICAgICAgIHN0b3JhZ2VJbmRleC4kZGlycnR5RmllbGQgPSAkKCcjZGlycnR5LWxvY2FsJyk7XG4gICAgICAgIHN0b3JhZ2VJbmRleC4kcmVjb3Jkc1NhdmVQZXJpb2RTbGlkZXIgPSAkKCcjUEJYUmVjb3JkU2F2ZVBlcmlvZFNsaWRlcicpO1xuXG4gICAgICAgIC8vIEVuYWJsZSB0YWIgbmF2aWdhdGlvblxuICAgICAgICAkKCcjc3RvcmFnZS1tZW51JykuZmluZCgnLml0ZW0nKS50YWIoe1xuICAgICAgICAgICAgICAgIGhpc3Rvcnk6IHRydWUsXG4gICAgICAgICAgICAgICAgaGlzdG9yeVR5cGU6ICdoYXNoJyxcbiAgICAgICAgICAgICAgICAgICBvblZpc2libGU6IGZ1bmN0aW9uKHRhYlBhdGgpIHtcbiAgICAgICAgICAgICAgICAvLyBMb2FkIHN0b3JhZ2UgZGF0YSB3aGVuIHN0b3JhZ2UgaW5mbyB0YWIgaXMgYWN0aXZhdGVkXG4gICAgICAgICAgICAgICAgaWYgKHRhYlBhdGggPT09ICdzdG9yYWdlLWluZm8nKSB7XG4gICAgICAgICAgICAgICAgICAgIHN0b3JhZ2VJbmRleC5sb2FkU3RvcmFnZURhdGEoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBsb2NhbCBzdG9yYWdlIGZvcm0gd2hlbiB0YWIgYmVjb21lcyB2aXNpYmxlXG4gICAgICAgICAgICAgICAgaWYgKHRhYlBhdGggPT09ICdzdG9yYWdlLWxvY2FsJykge1xuICAgICAgICAgICAgICAgICAgICBzdG9yYWdlSW5kZXguaW5pdGlhbGl6ZUZvcm0oKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgLy8gUmUtaW5pdGlhbGl6ZSBTMyBmb3JtIHdoZW4gY2xvdWQgdGFiIGJlY29tZXMgdmlzaWJsZVxuICAgICAgICAgICAgICAgIGlmICh0YWJQYXRoID09PSAnc3RvcmFnZS1jbG91ZCcgJiYgdHlwZW9mIHMzU3RvcmFnZUluZGV4ICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC5pbml0aWFsaXplRm9ybSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgcmVjb3JkcyBzYXZlIHBlcmlvZCBzbGlkZXJcbiAgICAgICAgc3RvcmFnZUluZGV4LiRyZWNvcmRzU2F2ZVBlcmlvZFNsaWRlclxuICAgICAgICAgICAgLnNsaWRlcih7XG4gICAgICAgICAgICAgICAgbWluOiAwLFxuICAgICAgICAgICAgICAgIG1heDogNSxcbiAgICAgICAgICAgICAgICBzdGVwOiAxLFxuICAgICAgICAgICAgICAgIHNtb290aDogdHJ1ZSxcbiAgICAgICAgICAgICAgICBhdXRvQWRqdXN0TGFiZWxzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBpbnRlcnByZXRMYWJlbDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxhYmVscyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIDA6IGdsb2JhbFRyYW5zbGF0ZS5zdF9TdG9yZTFNb250aE9mUmVjb3JkcyxcbiAgICAgICAgICAgICAgICAgICAgICAgIDE6IGdsb2JhbFRyYW5zbGF0ZS5zdF9TdG9yZTNNb250aHNPZlJlY29yZHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAyOiBnbG9iYWxUcmFuc2xhdGUuc3RfU3RvcmU2TW9udGhzT2ZSZWNvcmRzLFxuICAgICAgICAgICAgICAgICAgICAgICAgMzogZ2xvYmFsVHJhbnNsYXRlLnN0X1N0b3JlMVllYXJPZlJlY29yZHMsXG4gICAgICAgICAgICAgICAgICAgICAgICA0OiBnbG9iYWxUcmFuc2xhdGUuc3RfU3RvcmUzWWVhcnNPZlJlY29yZHMsXG4gICAgICAgICAgICAgICAgICAgICAgICA1OiBnbG9iYWxUcmFuc2xhdGUuc3RfU3RvcmVBbGxQb3NzaWJsZVJlY29yZHMsXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsYWJlbHNbdmFsdWVdIHx8ICcnO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6IHN0b3JhZ2VJbmRleC5jYkFmdGVyU2VsZWN0U2F2ZVBlcmlvZFNsaWRlcixcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdG9vbHRpcHNcbiAgICAgICAgc3RvcmFnZUluZGV4LmluaXRpYWxpemVUb29sdGlwcygpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgdGhlIGZvcm1cbiAgICAgICAgc3RvcmFnZUluZGV4LmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gTG9hZCBzZXR0aW5ncyBmcm9tIEFQSVxuICAgICAgICBzdG9yYWdlSW5kZXgubG9hZFNldHRpbmdzKCk7XG5cbiAgICAgICAgLy8gTG9hZCBzdG9yYWdlIGRhdGEgb24gcGFnZSBsb2FkXG4gICAgICAgIHN0b3JhZ2VJbmRleC5sb2FkU3RvcmFnZURhdGEoKTtcblxuICAgICAgICAvLyBEaXNrIGJlbmNobWFyayDigJQgbG9hZCBjYWNoZWQgcmVzdWx0IGFuZCB3aXJlIHRoZSBcInJ1blwiIGJ1dHRvbi5cbiAgICAgICAgc3RvcmFnZUluZGV4LmluaXRpYWxpemVEaXNrQmVuY2htYXJrKCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBIYW5kbGUgZXZlbnQgYWZ0ZXIgdGhlIHNlbGVjdCBzYXZlIHBlcmlvZCBzbGlkZXIgaXMgY2hhbmdlZC5cbiAgICAgKiBAcGFyYW0ge251bWJlcn0gdmFsdWUgLSBUaGUgc2VsZWN0ZWQgdmFsdWUgZnJvbSB0aGUgc2xpZGVyLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZWxlY3RTYXZlUGVyaW9kU2xpZGVyKHZhbHVlKSB7XG4gICAgICAgIC8vIEdldCB0aGUgc2F2ZSBwZXJpb2QgY29ycmVzcG9uZGluZyB0byB0aGUgc2xpZGVyIHZhbHVlLlxuICAgICAgICBjb25zdCBzYXZlUGVyaW9kID0gc3RvcmFnZUluZGV4LnNhdmVSZWNvcmRzUGVyaW9kW3ZhbHVlXTtcblxuICAgICAgICAvLyBTZXQgdGhlIGZvcm0gdmFsdWUgZm9yICdQQlhSZWNvcmRTYXZlUGVyaW9kJyB0byB0aGUgc2VsZWN0ZWQgc2F2ZSBwZXJpb2QuXG4gICAgICAgIHN0b3JhZ2VJbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnUEJYUmVjb3JkU2F2ZVBlcmlvZCcsIHNhdmVQZXJpb2QpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBTMyBsb2NhbCByZXRlbnRpb24gc2xpZGVyIG1heGltdW0gKGlmIFMzIG1vZHVsZSBsb2FkZWQpXG4gICAgICAgIGlmICh0eXBlb2YgczNTdG9yYWdlSW5kZXggIT09ICd1bmRlZmluZWQnICYmIHMzU3RvcmFnZUluZGV4LnVwZGF0ZVNsaWRlckxpbWl0cykge1xuICAgICAgICAgICAgczNTdG9yYWdlSW5kZXgudXBkYXRlU2xpZGVyTGltaXRzKHNhdmVQZXJpb2QpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVHJpZ2dlciBjaGFuZ2UgZXZlbnQgdG8gYWNrbm93bGVkZ2UgdGhlIG1vZGlmaWNhdGlvblxuICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgfSxcblxuXG4gICAgLyoqXG4gICAgICogTG9hZCBTdG9yYWdlIHNldHRpbmdzIGZyb20gQVBJXG4gICAgICovXG4gICAgbG9hZFNldHRpbmdzKCkge1xuICAgICAgICBTdG9yYWdlQVBJLmdldCgocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5kYXRhO1xuXG4gICAgICAgICAgICAgICAgLy8gU2V0IGZvcm0gdmFsdWVzIGZvciBsb2NhbCBzdG9yYWdlIG9ubHlcbiAgICAgICAgICAgICAgICBzdG9yYWdlSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlcycsIHtcbiAgICAgICAgICAgICAgICAgICAgUEJYUmVjb3JkU2F2ZVBlcmlvZDogZGF0YS5QQlhSZWNvcmRTYXZlUGVyaW9kIHx8ICcnXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdG90YWwgcmV0ZW50aW9uIHBlcmlvZCBzbGlkZXJcbiAgICAgICAgICAgICAgICBjb25zdCByZWNvcmRTYXZlUGVyaW9kID0gZGF0YS5QQlhSZWNvcmRTYXZlUGVyaW9kIHx8ICcnO1xuICAgICAgICAgICAgICAgIGNvbnN0IHNsaWRlckluZGV4ID0gc3RvcmFnZUluZGV4LnNhdmVSZWNvcmRzUGVyaW9kLmluZGV4T2YocmVjb3JkU2F2ZVBlcmlvZCk7XG4gICAgICAgICAgICAgICAgc3RvcmFnZUluZGV4LiRyZWNvcmRzU2F2ZVBlcmlvZFNsaWRlci5zbGlkZXIoXG4gICAgICAgICAgICAgICAgICAgICdzZXQgdmFsdWUnLFxuICAgICAgICAgICAgICAgICAgICBzbGlkZXJJbmRleCxcbiAgICAgICAgICAgICAgICAgICAgZmFsc2VcbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgLy8gTm90aWZ5IFMzIG1vZHVsZSBhYm91dCB0b3RhbCByZXRlbnRpb24gY2hhbmdlIChpZiBsb2FkZWQpXG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBzM1N0b3JhZ2VJbmRleCAhPT0gJ3VuZGVmaW5lZCcgJiYgczNTdG9yYWdlSW5kZXgudXBkYXRlU2xpZGVyTGltaXRzKSB7XG4gICAgICAgICAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LnVwZGF0ZVNsaWRlckxpbWl0cyhyZWNvcmRTYXZlUGVyaW9kKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTG9hZCBzdG9yYWdlIHVzYWdlIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBsb2FkU3RvcmFnZURhdGEoKSB7XG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICAkKCcjc3RvcmFnZS11c2FnZS1jb250YWluZXIgLmRpbW1lcicpLmFkZENsYXNzKCdhY3RpdmUnKTtcbiAgICAgICAgJCgnI3N0b3JhZ2UtZGV0YWlscycpLmhpZGUoKTtcblxuICAgICAgICAvLyBNYWtlIEFQSSBjYWxsIHRvIGdldCBzdG9yYWdlIHVzYWdlIHVzaW5nIG5ldyBTdG9yYWdlQVBJXG4gICAgICAgIFN0b3JhZ2VBUEkuZ2V0VXNhZ2UoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBzdG9yYWdlSW5kZXgucmVuZGVyU3RvcmFnZURhdGEocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICQoJyNzdG9yYWdlLXVzYWdlLWNvbnRhaW5lciAuZGltbWVyJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhnbG9iYWxUcmFuc2xhdGUuc3RfU3RvcmFnZUxvYWRFcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUmVuZGVyIHN0b3JhZ2UgdXNhZ2UgZGF0YSBpbiB0aGUgVUlcbiAgICAgKi9cbiAgICByZW5kZXJTdG9yYWdlRGF0YShkYXRhKSB7XG4gICAgICAgIC8vIEhpZGUgbG9hZGluZyBhbmQgc2hvdyBkZXRhaWxzXG4gICAgICAgICQoJyNzdG9yYWdlLXVzYWdlLWNvbnRhaW5lciAuZGltbWVyJykucmVtb3ZlQ2xhc3MoJ2FjdGl2ZScpO1xuICAgICAgICAkKCcjc3RvcmFnZS1kZXRhaWxzJykuc2hvdygpO1xuICAgICAgICBcbiAgICAgICAgLy8gRm9ybWF0IHNpemUgZm9yIGRpc3BsYXlcbiAgICAgICAgY29uc3QgZm9ybWF0U2l6ZSA9IChzaXplSW5NYikgPT4ge1xuICAgICAgICAgICAgaWYgKHNpemVJbk1iID49IDEwMjQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gKHNpemVJbk1iIC8gMTAyNCkudG9GaXhlZCgxKSArICcgR0InO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIHNpemVJbk1iLnRvRml4ZWQoMSkgKyAnIE1CJztcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBoZWFkZXIgaW5mb3JtYXRpb25cbiAgICAgICAgJCgnI3VzZWQtc3BhY2UtdGV4dCcpLnRleHQoZm9ybWF0U2l6ZShkYXRhLnVzZWRfc3BhY2UpKTtcbiAgICAgICAgJCgnI3RvdGFsLXNpemUtdGV4dCcpLnRleHQoZm9ybWF0U2l6ZShkYXRhLnRvdGFsX3NpemUpKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFVwZGF0ZSBwcm9ncmVzcyBzZWdtZW50cyBpbiBtYWNPUyBzdHlsZVxuICAgICAgICBsZXQgYWNjdW11bGF0ZWRXaWR0aCA9IDA7XG4gICAgICAgIFxuICAgICAgICAvLyBQcm9jZXNzIGVhY2ggY2F0ZWdvcnlcbiAgICAgICAgWydjYWxsX3JlY29yZGluZ3MnLCAnY2RyX2RhdGFiYXNlJywgJ3N5c3RlbV9sb2dzJywgJ21vZHVsZXMnLCAnYmFja3VwcycsICdzeXN0ZW1fY2FjaGVzJywgJ3MzX2NhY2hlJywgJ290aGVyJ10uZm9yRWFjaChjYXRlZ29yeSA9PiB7XG4gICAgICAgICAgICBjb25zdCBjYXREYXRhID0gZGF0YS5jYXRlZ29yaWVzW2NhdGVnb3J5XTtcbiAgICAgICAgICAgIGNvbnN0ICRzZWdtZW50ID0gJChgLnByb2dyZXNzLXNlZ21lbnRbZGF0YS1jYXRlZ29yeT1cIiR7Y2F0ZWdvcnl9XCJdYCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChjYXREYXRhICYmIGNhdERhdGEucGVyY2VudGFnZSA+IDApIHtcbiAgICAgICAgICAgICAgICAkc2VnbWVudC5jc3MoJ3dpZHRoJywgY2F0RGF0YS5wZXJjZW50YWdlICsgJyUnKS5zaG93KCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gQWRkIGhvdmVyIHRvb2x0aXBcbiAgICAgICAgICAgICAgICBjb25zdCBjYXRlZ29yeUtleSA9ICdzdF9DYXRlZ29yeScgKyBjYXRlZ29yeS5zcGxpdCgnXycpLm1hcCh3b3JkID0+IHdvcmQuY2hhckF0KDApLnRvVXBwZXJDYXNlKCkgKyB3b3JkLnNsaWNlKDEpKS5qb2luKCcnKTtcbiAgICAgICAgICAgICAgICAkc2VnbWVudC5hdHRyKCd0aXRsZScsIGAke2dsb2JhbFRyYW5zbGF0ZVtjYXRlZ29yeUtleV0gfHwgY2F0ZWdvcnl9OiAke2Zvcm1hdFNpemUoY2F0RGF0YS5zaXplKX0gKCR7Y2F0RGF0YS5wZXJjZW50YWdlfSUpYCk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgYWNjdW11bGF0ZWRXaWR0aCArPSBjYXREYXRhLnBlcmNlbnRhZ2U7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRzZWdtZW50LmhpZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIGNhdGVnb3J5IHNpemUgaW4gbGlzdFxuICAgICAgICAgICAgJChgIyR7Y2F0ZWdvcnl9LXNpemVgKS50ZXh0KGZvcm1hdFNpemUoY2F0RGF0YSA/IGNhdERhdGEuc2l6ZSA6IDApKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBCaW5kIGhvdmVyIGVmZmVjdHMgb25seSBvbmNlIChub3Qgb24gZXZlcnkgZGF0YSByZWZyZXNoKVxuICAgICAgICBpZiAoIXN0b3JhZ2VJbmRleC5faG92ZXJCb3VuZCkge1xuICAgICAgICAgICAgc3RvcmFnZUluZGV4Ll9ob3ZlckJvdW5kID0gdHJ1ZTtcblxuICAgICAgICAgICAgLy8gVG9vbHRpcCBmb3IgcHJvZ3Jlc3Mgc2VnbWVudHNcbiAgICAgICAgICAgICQoJyNzdG9yYWdlLXByb2dyZXNzJykub24oJ21vdXNlZW50ZXInLCAnLnByb2dyZXNzLXNlZ21lbnQnLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHRvb2x0aXAgPSAkKCc8ZGl2IGNsYXNzPVwic3RvcmFnZS10b29sdGlwXCI+PC9kaXY+JykudGV4dCgkKHRoaXMpLmF0dHIoJ3RpdGxlJykpO1xuICAgICAgICAgICAgICAgICQoJ2JvZHknKS5hcHBlbmQodG9vbHRpcCk7XG4gICAgICAgICAgICAgICAgJChkb2N1bWVudCkub24oJ21vdXNlbW92ZS50b29sdGlwJywgZnVuY3Rpb24gKGV2KSB7XG4gICAgICAgICAgICAgICAgICAgIHRvb2x0aXAuY3NzKHsgbGVmdDogZXYucGFnZVggKyAxMCwgdG9wOiBldi5wYWdlWSAtIDMwIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSkub24oJ21vdXNlbGVhdmUnLCAnLnByb2dyZXNzLXNlZ21lbnQnLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgJCgnLnN0b3JhZ2UtdG9vbHRpcCcpLnJlbW92ZSgpO1xuICAgICAgICAgICAgICAgICQoZG9jdW1lbnQpLm9mZignbW91c2Vtb3ZlLnRvb2x0aXAnKTtcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAvLyBIaWdobGlnaHQgbWF0Y2hpbmcgcHJvZ3Jlc3Mgc2VnbWVudCBvbiBjYXRlZ29yeSBsaXN0IGhvdmVyIHZpYSBDU1MgY2xhc3NcbiAgICAgICAgICAgICQoJy5jYXRlZ29yeS1pdGVtJykub24oJ21vdXNlZW50ZXInLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgY2F0ZWdvcnkgPSAkKHRoaXMpLmRhdGEoJ2NhdGVnb3J5Jyk7XG4gICAgICAgICAgICAgICAgJChgLnByb2dyZXNzLXNlZ21lbnRbZGF0YS1jYXRlZ29yeT1cIiR7Y2F0ZWdvcnl9XCJdYCkuYWRkQ2xhc3MoJ2hpZ2hsaWdodGVkJyk7XG4gICAgICAgICAgICB9KS5vbignbW91c2VsZWF2ZScsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAkKCcucHJvZ3Jlc3Mtc2VnbWVudCcpLnJlbW92ZUNsYXNzKCdoaWdobGlnaHRlZCcpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBSZW5kZXIgcmVtb3RlIHN0b3JhZ2UgaW5mbyAoUzMpXG4gICAgICAgIGlmIChkYXRhLnJlbW90ZV9zdG9yYWdlICYmIGRhdGEucmVtb3RlX3N0b3JhZ2UuczMgJiYgZGF0YS5yZW1vdGVfc3RvcmFnZS5zMy5lbmFibGVkICYmIGRhdGEucmVtb3RlX3N0b3JhZ2UuczMuc2l6ZSA+IDApIHtcbiAgICAgICAgICAgIGNvbnN0IHMzID0gZGF0YS5yZW1vdGVfc3RvcmFnZS5zMztcbiAgICAgICAgICAgICQoJyNyZW1vdGUtc3RvcmFnZS10aXRsZScpLnRleHQoZ2xvYmFsVHJhbnNsYXRlLnN0X1MzUmVtb3RlU3RvcmFnZVRpdGxlKTtcbiAgICAgICAgICAgICQoJyNyZW1vdGUtc3RvcmFnZS1kZXRhaWxzJykudGV4dChcbiAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfUzNSZW1vdGVTdG9yYWdlSW5mb1xuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgnJWZpbGVzJScsIHMzLmZpbGVzX2NvdW50LnRvTG9jYWxlU3RyaW5nKCkpXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKCclc2l6ZSUnLCBmb3JtYXRTaXplKHMzLnNpemUpKVxuICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgnJWJ1Y2tldCUnLCBzMy5idWNrZXQpXG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgJCgnI3JlbW90ZS1zdG9yYWdlLXNlY3Rpb24nKS5zaG93KCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIFdpcmUgdGhlIGRpc2sgYmVuY2htYXJrIGNhcmQ6IGxvYWQgdGhlIGxhc3QgY2FjaGVkIG1lYXN1cmVtZW50IG9uXG4gICAgICogcGFnZSBvcGVuLCBoYW5kIHRoZSBcIlJ1biBhZ2FpblwiIGJ1dHRvbiB0byBydW5EaXNrQmVuY2htYXJrKCkuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZURpc2tCZW5jaG1hcmsoKSB7XG4gICAgICAgIFN0b3JhZ2VBUEkuZ2V0SW9CZW5jaG1hcmsoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBzdG9yYWdlSW5kZXgucmVuZGVyRGlza0JlbmNobWFyayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3RvcmFnZUluZGV4LnNob3dEaXNrQmVuY2htYXJrRW1wdHkoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgJCgnI2Rpc2stYmVuY2htYXJrLXJ1bi1idXR0b24nKS5vZmYoJ2NsaWNrLmRpc2tiZW5jaCcpLm9uKCdjbGljay5kaXNrYmVuY2gnLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgc3RvcmFnZUluZGV4LnJ1bkRpc2tCZW5jaG1hcmsoKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3cgdGhlIFwibm8gbWVhc3VyZW1lbnQgeWV0XCIgc3RhdGUuXG4gICAgICovXG4gICAgc2hvd0Rpc2tCZW5jaG1hcmtFbXB0eSgpIHtcbiAgICAgICAgJCgnI2Rpc2stc3BlZWQtZW1wdHknKS5zaG93KCk7XG4gICAgICAgICQoJyNkaXNrLXNwZWVkLXJlc3VsdCcpLmhpZGUoKTtcbiAgICAgICAgJCgnI2Rpc2stc3BlZWQtcnVubmluZycpLmhpZGUoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvdyB0aGUgZGQgd3JpdGUvcmVhZCBudW1iZXJzIGFuZCB0aGUgdGltZXN0YW1wIGZyb20gdGhlIGNhY2hlZFxuICAgICAqIHJlc3VsdC4gQm90aCBudW1iZXJzIGFyZSBwcmUtcm91bmRlZCBzZXJ2ZXItc2lkZTsgd2Ugb25seSBmb3JtYXRcbiAgICAgKiB0aGUgbG9jYWxpc2VkIGRhdGUgaGVyZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7e3dyaXRlTUJwczpudW1iZXIsIHJlYWRNQnBzOm51bWJlciwgbWVhc3VyZWRBdDpudW1iZXJ9fSBkYXRhXG4gICAgICovXG4gICAgcmVuZGVyRGlza0JlbmNobWFyayhkYXRhKSB7XG4gICAgICAgICQoJyNkaXNrLXNwZWVkLWVtcHR5JykuaGlkZSgpO1xuICAgICAgICAkKCcjZGlzay1zcGVlZC1ydW5uaW5nJykuaGlkZSgpO1xuICAgICAgICAkKCcjZGlzay1zcGVlZC1yZXN1bHQnKS5jc3MoJ2Rpc3BsYXknLCAnaW5saW5lLWZsZXgnKTtcblxuICAgICAgICAkKCcjZGlzay1iZW5jaG1hcmstd3JpdGUnKS50ZXh0KFxuICAgICAgICAgICAgdHlwZW9mIGRhdGEud3JpdGVNQnBzID09PSAnbnVtYmVyJyA/IGRhdGEud3JpdGVNQnBzLnRvRml4ZWQoMSkgOiAn4oCUJ1xuICAgICAgICApO1xuICAgICAgICAkKCcjZGlzay1iZW5jaG1hcmstcmVhZCcpLnRleHQoXG4gICAgICAgICAgICB0eXBlb2YgZGF0YS5yZWFkTUJwcyA9PT0gJ251bWJlcicgPyBkYXRhLnJlYWRNQnBzLnRvRml4ZWQoMSkgOiAn4oCUJ1xuICAgICAgICApO1xuXG4gICAgICAgIGlmIChkYXRhLl9tZXRhKSB7XG4gICAgICAgICAgICBQYnhEYXRlVGltZS5zZXRTZXJ2ZXJNZXRhKGRhdGEuX21ldGEpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChkYXRhLm1lYXN1cmVkQXQpIHtcbiAgICAgICAgICAgIC8vIFJlbmRlciBpbiBzZXJ2ZXIgVFogKyBGb21hbnRpYyBwb3B1cCB3aXRoIHRoZSBkdWFsLVRaIHRvb2x0aXAuXG4gICAgICAgICAgICAvLyBUaGUgb3BlcmF0b3Igc2hvdWxkIG5ldmVyIGhhdmUgdG8gY29udmVydCBiZXR3ZWVuIFwiYnJvd3NlclxuICAgICAgICAgICAgLy8gc2FpZFwiIGFuZCBcInNlcnZlciBsb2dnZWRcIiB3aGVuIHJldmlld2luZyBhIGJlbmNobWFyayB0aW1lc3RhbXAuXG4gICAgICAgICAgICBjb25zdCAkY2VsbCA9ICQoJyNkaXNrLWJlbmNobWFyay1tZWFzdXJlZC1hdCcpO1xuICAgICAgICAgICAgJGNlbGwudGV4dChQYnhEYXRlVGltZS5mb3JtYXRTZXJ2ZXJUaW1lKGRhdGEubWVhc3VyZWRBdCkpO1xuICAgICAgICAgICAgJGNlbGwucG9wdXAoJ2Rlc3Ryb3knKTtcbiAgICAgICAgICAgICRjZWxsLnBvcHVwKHtcbiAgICAgICAgICAgICAgICBodG1sOiBQYnhEYXRlVGltZS5idWlsZER1YWxUb29sdGlwSHRtbChkYXRhLm1lYXN1cmVkQXQpLFxuICAgICAgICAgICAgICAgIGhvdmVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICAgICAgICBwb3NpdGlvbjogJ3RvcCBsZWZ0JyxcbiAgICAgICAgICAgICAgICB2YXJpYXRpb246ICdpbnZlcnRlZCcsXG4gICAgICAgICAgICAgICAgZGVsYXk6IHsgc2hvdzogMjAwLCBoaWRlOiAxMDAgfSxcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJCgnI2Rpc2stYmVuY2htYXJrLW1lYXN1cmVkLWF0JykudGV4dCgn4oCUJykucG9wdXAoJ2Rlc3Ryb3knKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBLaWNrIG9mZiBhIGZyZXNoIGJlbmNobWFyay4gVGhlIFBPU1QgYmxvY2tzIHNlcnZlci1zaWRlIGZvciB+NeKAkzMwIHNcbiAgICAgKiB3aGlsZSBkZCBydW5zIGJvdGggcGhhc2VzOyB3ZSBqdXN0IHRvZ2dsZSB0aGUgcnVubmluZyBzdGF0ZSBhbmRcbiAgICAgKiByZS1yZW5kZXIgd2l0aCB3aGF0ZXZlciB0aGUgc2VydmVyIHJldHVybnMuXG4gICAgICovXG4gICAgcnVuRGlza0JlbmNobWFyaygpIHtcbiAgICAgICAgaWYgKHN0b3JhZ2VJbmRleC5iZW5jaG1hcmtSdW5uaW5nKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgc3RvcmFnZUluZGV4LmJlbmNobWFya1J1bm5pbmcgPSB0cnVlO1xuICAgICAgICAkKCcjZGlzay1zcGVlZC1lbXB0eScpLmhpZGUoKTtcbiAgICAgICAgJCgnI2Rpc2stc3BlZWQtcmVzdWx0JykuaGlkZSgpO1xuICAgICAgICAkKCcjZGlzay1zcGVlZC1ydW5uaW5nJykuc2hvdygpO1xuICAgICAgICAkKCcjZGlzay1iZW5jaG1hcmstcnVuLWJ1dHRvbicpLnByb3AoJ2Rpc2FibGVkJywgdHJ1ZSk7XG5cbiAgICAgICAgU3RvcmFnZUFQSS5ydW5Jb0JlbmNobWFyaygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIHN0b3JhZ2VJbmRleC5iZW5jaG1hcmtSdW5uaW5nID0gZmFsc2U7XG4gICAgICAgICAgICAkKCcjZGlzay1iZW5jaG1hcmstcnVuLWJ1dHRvbicpLnByb3AoJ2Rpc2FibGVkJywgZmFsc2UpO1xuXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBzdG9yYWdlSW5kZXgucmVuZGVyRGlza0JlbmNobWFyayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3RvcmFnZUluZGV4LnNob3dEaXNrQmVuY2htYXJrRW1wdHkoKTtcbiAgICAgICAgICAgICAgICBpZiAodHlwZW9mIFVzZXJNZXNzYWdlICE9PSAndW5kZWZpbmVkJyAmJiByZXNwb25zZS5tZXNzYWdlcykge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocmVzcG9uc2UubWVzc2FnZXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJ1aWxkIEhUTUwgY29udGVudCBmb3IgdG9vbHRpcCBwb3B1cFxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBjb25maWcgLSBUb29sdGlwIGNvbmZpZ3VyYXRpb24gb2JqZWN0XG4gICAgICogQHJldHVybnMge3N0cmluZ30gSFRNTCBzdHJpbmcgZm9yIHBvcHVwIGNvbnRlbnRcbiAgICAgKi9cbiAgICBidWlsZFRvb2x0aXBDb250ZW50KGNvbmZpZykge1xuICAgICAgICBsZXQgaHRtbCA9ICc8ZGl2IGNsYXNzPVwidWkgcmVsYXhlZCBsaXN0XCI+JztcblxuICAgICAgICAvLyBIZWFkZXJcbiAgICAgICAgaWYgKGNvbmZpZy5oZWFkZXIpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+PHN0cm9uZz4ke2NvbmZpZy5oZWFkZXJ9PC9zdHJvbmc+PC9kaXY+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERlc2NyaXB0aW9uXG4gICAgICAgIGlmIChjb25maWcuZGVzY3JpcHRpb24pIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+JHtjb25maWcuZGVzY3JpcHRpb259PC9kaXY+YDtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE1haW4gbGlzdFxuICAgICAgICBpZiAoY29uZmlnLmxpc3QgJiYgY29uZmlnLmxpc3QubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIj48dWwgY2xhc3M9XCJ1aSBsaXN0XCI+JztcbiAgICAgICAgICAgIGNvbmZpZy5saXN0LmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+JHtpdGVtfTwvbGk+YDtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0udGVybSAmJiBpdGVtLmRlZmluaXRpb24gPT09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gU2VjdGlvbiBoZWFkZXJcbiAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPC91bD48c3Ryb25nPiR7aXRlbS50ZXJtfTwvc3Ryb25nPjx1bCBjbGFzcz1cInVpIGxpc3RcIj5gO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoaXRlbS50ZXJtICYmIGl0ZW0uZGVmaW5pdGlvbikge1xuICAgICAgICAgICAgICAgICAgICAvLyBUZXJtIHdpdGggZGVmaW5pdGlvblxuICAgICAgICAgICAgICAgICAgICBodG1sICs9IGA8bGk+PHN0cm9uZz4ke2l0ZW0udGVybX06PC9zdHJvbmc+ICR7aXRlbS5kZWZpbml0aW9ufTwvbGk+YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvdWw+PC9kaXY+JztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEFkZGl0aW9uYWwgbGlzdHMgKGxpc3QyLWxpc3QxMClcbiAgICAgICAgZm9yIChsZXQgaSA9IDI7IGkgPD0gMTA7IGkrKykge1xuICAgICAgICAgICAgY29uc3QgbGlzdEtleSA9IGBsaXN0JHtpfWA7XG4gICAgICAgICAgICBpZiAoY29uZmlnW2xpc3RLZXldICYmIGNvbmZpZ1tsaXN0S2V5XS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIj48dWwgY2xhc3M9XCJ1aSBsaXN0XCI+JztcbiAgICAgICAgICAgICAgICBjb25maWdbbGlzdEtleV0uZm9yRWFjaChpdGVtID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHR5cGVvZiBpdGVtID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaHRtbCArPSBgPGxpPiR7aXRlbX08L2xpPmA7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICBodG1sICs9ICc8L3VsPjwvZGl2Pic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBXYXJuaW5nXG4gICAgICAgIGlmIChjb25maWcud2FybmluZykge1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIj48ZGl2IGNsYXNzPVwidWkgb3JhbmdlIG1lc3NhZ2VcIj4nO1xuICAgICAgICAgICAgaWYgKGNvbmZpZy53YXJuaW5nLmhlYWRlcikge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJoZWFkZXJcIj4ke2NvbmZpZy53YXJuaW5nLmhlYWRlcn08L2Rpdj5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKGNvbmZpZy53YXJuaW5nLnRleHQpIHtcbiAgICAgICAgICAgICAgICBodG1sICs9IGA8cD4ke2NvbmZpZy53YXJuaW5nLnRleHR9PC9wPmA7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj48L2Rpdj4nO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRXhhbXBsZXNcbiAgICAgICAgaWYgKGNvbmZpZy5leGFtcGxlcyAmJiBjb25maWcuZXhhbXBsZXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgaWYgKGNvbmZpZy5leGFtcGxlc0hlYWRlcikge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+PHN0cm9uZz4ke2NvbmZpZy5leGFtcGxlc0hlYWRlcn08L3N0cm9uZz48L2Rpdj5gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cIml0ZW1cIj48cHJlIHN0eWxlPVwiYmFja2dyb3VuZDojZjRmNGY0O3BhZGRpbmc6MTBweDtib3JkZXItcmFkaXVzOjRweDtcIj4nO1xuICAgICAgICAgICAgaHRtbCArPSBjb25maWcuZXhhbXBsZXMuam9pbignXFxuJyk7XG4gICAgICAgICAgICBodG1sICs9ICc8L3ByZT48L2Rpdj4nO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTm90ZVxuICAgICAgICBpZiAoY29uZmlnLm5vdGUpIHtcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJpdGVtXCI+PGVtPiR7Y29uZmlnLm5vdGV9PC9lbT48L2Rpdj5gO1xuICAgICAgICB9XG5cbiAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgcmV0dXJuIGh0bWw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJ1aWxkIHRoZSBzM19lbmRwb2ludCB0b29sdGlwIEhUTUwsIHdlYXZpbmcgaW4gdGhlIGN1cnJlbnRcbiAgICAgKiBwZXItcHJlc2V0IG5vdGUgKGlmIGFueSkgYXMgdGhlIHRyYWlsaW5nIGBub3RlYCBzbG90LiBMaXZlcyBpbiBpdHNcbiAgICAgKiBvd24gbWV0aG9kIHNvIHNldFMzRW5kcG9pbnRQcmVzZXROb3RlKCkgY2FuIHJlYnVpbGQgdGhlIGNvbnRlbnQgb25cbiAgICAgKiB0aGUgZmx5IHdpdGhvdXQgcmUtcnVubmluZyB0aGUgcmVzdCBvZiB0aGUgdG9vbHRpcCBtYWNoaW5lcnkuXG4gICAgICpcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBIVE1MXG4gICAgICovXG4gICAgYnVpbGRTM0VuZHBvaW50VG9vbHRpcENvbnRlbnQoKSB7XG4gICAgICAgIHJldHVybiBzdG9yYWdlSW5kZXguYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2VuZHBvaW50X2hlYWRlcixcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19lbmRwb2ludF9kZXNjLFxuICAgICAgICAgICAgZXhhbXBsZXM6IFtcbiAgICAgICAgICAgICAgICAnQVdTIFMzOiBodHRwczovL3MzLmFwLXNvdXRoZWFzdC0xLmFtYXpvbmF3cy5jb20nLFxuICAgICAgICAgICAgICAgICdZYW5kZXggQ2xvdWQ6IGh0dHBzOi8vc3RvcmFnZS55YW5kZXhjbG91ZC5uZXQnLFxuICAgICAgICAgICAgICAgICdWSyBDbG91ZDogaHR0cHM6Ly9oYi5rei1hc3QudmtjbG91ZC1zdG9yYWdlLnJ1JyxcbiAgICAgICAgICAgICAgICAnQ2xvdWRmbGFyZSBSMjogaHR0cHM6Ly88QUNDT1VOVF9JRD4ucjIuY2xvdWRmbGFyZXN0b3JhZ2UuY29tJyxcbiAgICAgICAgICAgICAgICAnRGlnaXRhbE9jZWFuOiBodHRwczovL3NncDEuZGlnaXRhbG9jZWFuc3BhY2VzLmNvbScsXG4gICAgICAgICAgICAgICAgJ01pbklPOiBodHRwOi8vbWluaW8uZXhhbXBsZS5jb206OTAwMCcsXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgZXhhbXBsZXNIZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX2V4YW1wbGVzLFxuICAgICAgICAgICAgbm90ZTogc3RvcmFnZUluZGV4LnMzRW5kcG9pbnRQcmVzZXROb3RlIHx8IG51bGwsXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIHBlci1wcmVzZXQgbm90ZSB0aGF0IHRoZSBzM19lbmRwb2ludCB0b29sdGlwIGNhcnJpZXMgYW5kXG4gICAgICogcHVzaCB0aGUgcmVidWlsdCBIVE1MIGludG8gdGhlIGxpdmUgRm9tYW50aWMgcG9wdXAuIENhbGxlZCBmcm9tXG4gICAgICogczMtc3RvcmFnZS1pbmRleC5qcyB3aGVuZXZlciB0aGUgcHJvdmlkZXIgcHJlc2V0IGNoYW5nZXMgc28gdGhlXG4gICAgICogcHJlc2V0LXNwZWNpZmljIGd1aWRhbmNlIGxpdmVzIG5leHQgdG8gdGhlIGZpZWxkIGl0IGFjdHVhbGx5XG4gICAgICogYWZmZWN0cyAobm8gc2VwYXJhdGUgaGludCBiYW5uZXIgbmVlZGVkKS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0ZXh0XG4gICAgICovXG4gICAgc2V0UzNFbmRwb2ludFByZXNldE5vdGUodGV4dCkge1xuICAgICAgICBzdG9yYWdlSW5kZXguczNFbmRwb2ludFByZXNldE5vdGUgPSB0ZXh0IHx8ICcnO1xuICAgICAgICBjb25zdCAkaWNvbiA9ICQoJy5maWVsZC1pbmZvLWljb25bZGF0YS1maWVsZD1cInMzX2VuZHBvaW50XCJdJyk7XG4gICAgICAgIGlmICgkaWNvbi5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICAvLyBJZiB0aGUgcG9wdXAgaGFzbid0IGJlZW4gaW5pdGlhbGlzZWQgeWV0IChlLmcuIGNsb3VkIHRhYiBub3RcbiAgICAgICAgLy8gdmlzaXRlZCB5ZXQpLCBkbyBub3RoaW5nIGV4dHJhIOKAlCBpbml0aWFsaXplVG9vbHRpcHMoKSB3aWxsIHBpY2tcbiAgICAgICAgLy8gdXAgdGhlIG5ldyBzdGF0ZSB2aWEgYnVpbGRTM0VuZHBvaW50VG9vbHRpcENvbnRlbnQoKSBvbiBmaXJzdFxuICAgICAgICAvLyBpbml0LiBBdm9pZHMgYSBkZXN0cm95L3JlaW5pdCByYWNlIHRoYXQgd291bGQgb3RoZXJ3aXNlIHdpcGVcbiAgICAgICAgLy8gdGhlIGR5bmFtaWMgbm90ZSB3aGVuIGluaXRpYWxpemVUb29sdGlwcygpIHJ1bnMgbGF0ZXIuXG4gICAgICAgIGlmICgkaWNvbi5wb3B1cCgnZXhpc3RzJykpIHtcbiAgICAgICAgICAgICRpY29uLnBvcHVwKCdjaGFuZ2UgY29udGVudCcsIHN0b3JhZ2VJbmRleC5idWlsZFMzRW5kcG9pbnRUb29sdGlwQ29udGVudCgpKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRvb2x0aXBzIGZvciBmb3JtIGZpZWxkc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVUb29sdGlwcygpIHtcbiAgICAgICAgLy8gVG9vbHRpcCBjb25maWd1cmF0aW9ucyBmb3IgZWFjaCBmaWVsZFxuICAgICAgICBjb25zdCB0b29sdGlwQ29uZmlncyA9IHtcbiAgICAgICAgICAgIHJlY29yZF9yZXRlbnRpb25fcGVyaW9kOiBzdG9yYWdlSW5kZXguYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9yZWNvcmRfcmV0ZW50aW9uX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9pdGVtMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9pdGVtMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9pdGVtMyxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfcmVjb3JkX3JldGVudGlvbl9pdGVtNFxuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25fd2FybmluZ19oZWFkZXIsXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3JlY29yZF9yZXRlbnRpb25fd2FybmluZ1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICBzM19lbmFibGVkOiBzdG9yYWdlSW5kZXguYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19lbmFibGVkX2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfZW5hYmxlZF9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfZW5hYmxlZF9pdGVtMSxcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfZW5hYmxlZF9pdGVtMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfZW5hYmxlZF9pdGVtM1xuICAgICAgICAgICAgICAgIF1cbiAgICAgICAgICAgIH0pLFxuXG4gICAgICAgICAgICBzM19wcm92aWRlcl9wcmVzZXQ6IHN0b3JhZ2VJbmRleC5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX3ByZXNldF9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX3ByZXNldF9kZXNjLFxuICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgIHMzX2VuZHBvaW50OiBzdG9yYWdlSW5kZXguYnVpbGRTM0VuZHBvaW50VG9vbHRpcENvbnRlbnQoKSxcblxuICAgICAgICAgICAgczNfcmVnaW9uOiBzdG9yYWdlSW5kZXguYnVpbGRUb29sdGlwQ29udGVudCh7XG4gICAgICAgICAgICAgICAgaGVhZGVyOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19yZWdpb25faGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19yZWdpb25fZGVzYyxcbiAgICAgICAgICAgICAgICBleGFtcGxlczogW1xuICAgICAgICAgICAgICAgICAgICAndXMtZWFzdC0xIChkZWZhdWx0KScsXG4gICAgICAgICAgICAgICAgICAgICdldS13ZXN0LTEnLFxuICAgICAgICAgICAgICAgICAgICAnYXAtc291dGhlYXN0LTEnXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgICBub3RlOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19yZWdpb25fbm90ZVxuICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgIHMzX2J1Y2tldDogc3RvcmFnZUluZGV4LmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfYnVja2V0X2hlYWRlcixcbiAgICAgICAgICAgICAgICBkZXNjcmlwdGlvbjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfYnVja2V0X2Rlc2MsXG4gICAgICAgICAgICAgICAgbGlzdDogW1xuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19idWNrZXRfaXRlbTEsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2J1Y2tldF9pdGVtMixcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfYnVja2V0X2l0ZW0zXG4gICAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgIHMzX2FjY2Vzc19rZXk6IHN0b3JhZ2VJbmRleC5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX2FjY2Vzc19rZXlfaGVhZGVyLFxuICAgICAgICAgICAgICAgIGRlc2NyaXB0aW9uOiBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9zM19hY2Nlc3Nfa2V5X2Rlc2MsXG4gICAgICAgICAgICAgICAgbm90ZTogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfYWNjZXNzX2tleV9ub3RlXG4gICAgICAgICAgICB9KSxcblxuICAgICAgICAgICAgczNfc2VjcmV0X2tleTogc3RvcmFnZUluZGV4LmJ1aWxkVG9vbHRpcENvbnRlbnQoe1xuICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfc2VjcmV0X2tleV9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX3MzX3NlY3JldF9rZXlfZGVzYyxcbiAgICAgICAgICAgICAgICB3YXJuaW5nOiB7XG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcjogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfd2FybmluZyxcbiAgICAgICAgICAgICAgICAgICAgdGV4dDogZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfczNfc2VjcmV0X2tleV93YXJuaW5nXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSksXG5cbiAgICAgICAgICAgIGxvY2FsX3JldGVudGlvbl9wZXJpb2Q6IHN0b3JhZ2VJbmRleC5idWlsZFRvb2x0aXBDb250ZW50KHtcbiAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9oZWFkZXIsXG4gICAgICAgICAgICAgICAgZGVzY3JpcHRpb246IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9kZXNjLFxuICAgICAgICAgICAgICAgIGxpc3Q6IFtcbiAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLnN0X3Rvb2x0aXBfbG9jYWxfcmV0ZW50aW9uX2l0ZW0xLFxuICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuc3RfdG9vbHRpcF9sb2NhbF9yZXRlbnRpb25faXRlbTIsXG4gICAgICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl9pdGVtM1xuICAgICAgICAgICAgICAgIF0sXG4gICAgICAgICAgICAgICAgd2FybmluZzoge1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXI6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX25vdGUsXG4gICAgICAgICAgICAgICAgICAgIHRleHQ6IGdsb2JhbFRyYW5zbGF0ZS5zdF90b29sdGlwX2xvY2FsX3JldGVudGlvbl93YXJuaW5nXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBEZWxlZ2F0ZSB0byBUb29sdGlwQnVpbGRlciBzbyBwb3B1cHMgdXNlIGBvbjogJ21hbnVhbCdgICtcbiAgICAgICAgLy8gYGNsaWNrLnBvcHVwLXRyaWdnZXJgICsgYGxhc3RSZXNvcnQ6IHRydWVgLiBXaXRob3V0IHRoaXMsIGEgY2xpY2tcbiAgICAgICAgLy8gb24gdGhlIHMzX2VuYWJsZWQgaWNvbiAobmVzdGVkIGluc2lkZSB0aGUgdG9nZ2xlIDxsYWJlbD4pIGZsaXBzXG4gICAgICAgIC8vIHRoZSBzdG9yYWdlIG1vZGUsIGFuZCBsb25nIHRvb2x0aXBzIGdldCBoaWRkZW4gb24gc21hbGwgdmlld3BvcnRzLlxuICAgICAgICAvLyBTZWUgZG9jcy9UT09MVElQX0dVSURFTElORVMubWQuXG4gICAgICAgIGlmICh0eXBlb2YgVG9vbHRpcEJ1aWxkZXIgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCdzdG9yYWdlSW5kZXg6IFRvb2x0aXBCdWlsZGVyIGlzIG5vdCBhdmFpbGFibGUnKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBUb29sdGlwQnVpbGRlci5pbml0aWFsaXplKHRvb2x0aXBDb25maWdzLCB7XG4gICAgICAgICAgICBzZWxlY3RvcjogJy5maWVsZC1pbmZvLWljb24nLFxuICAgICAgICAgICAgcG9zaXRpb246ICd0b3AgcmlnaHQnLFxuICAgICAgICAgICAgaG92ZXJhYmxlOiB0cnVlLFxuICAgICAgICAgICAgc2hvd0RlbGF5OiAzMDAsXG4gICAgICAgICAgICBoaWRlRGVsYXk6IDEwMCxcbiAgICAgICAgICAgIHZhcmlhdGlvbjogJ2Zsb3dpbmcnXG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybVxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm1cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IHN0b3JhZ2VJbmRleC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKCFyZXNwb25zZS5zdWNjZXNzKSB7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBjdXN0b20gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IHN0b3JhZ2VJbmRleC4kZm9ybU9iajtcbiAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uID0gc3RvcmFnZUluZGV4LiRzdWJtaXRCdXR0b247XG4gICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0ID0gc3RvcmFnZUluZGV4LiRkcm9wZG93blN1Ym1pdDtcbiAgICAgICAgRm9ybS4kZGlycnR5RmllbGQgPSBzdG9yYWdlSW5kZXguJGRpcnJ0eUZpZWxkO1xuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBzdG9yYWdlSW5kZXgudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gc3RvcmFnZUluZGV4LmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gc3RvcmFnZUluZGV4LmNiQWZ0ZXJTZW5kRm9ybTtcblxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUEkgc2V0dGluZ3MgZm9yIEZvcm0uanMgKHNpbmdsZXRvbiByZXNvdXJjZSlcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBhcGlPYmplY3Q6IFN0b3JhZ2VBUEksXG4gICAgICAgICAgICBzYXZlTWV0aG9kOiAndXBkYXRlJyAvLyBVc2luZyBzdGFuZGFyZCBQVVQgZm9yIHNpbmdsZXRvbiB1cGRhdGVcbiAgICAgICAgfTtcblxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9XG59O1xuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgc3RvcmFnZSBtYW5hZ2VtZW50IGludGVyZmFjZS5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBzdG9yYWdlSW5kZXguaW5pdGlhbGl6ZSgpO1xufSk7Il19