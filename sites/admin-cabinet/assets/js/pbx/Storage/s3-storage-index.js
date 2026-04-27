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

/* global globalRootUrl, globalTranslate, Form, S3StorageAPI, UserMessage, $ */

/**
 * S3 Storage management module
 * Handles S3 cloud storage settings (Tab 3)
 * Sends data to: PATCH /pbxcore/api/v3/s3-storage
 */
var s3StorageIndex = {
  /**
   * jQuery object for the S3 storage form.
   * @type {jQuery}
   */
  $formObj: $('#s3-storage-form'),

  /**
   * jQuery object for the submit button (unique to this form).
   * @type {jQuery}
   */
  $submitButton: $('#submitbutton-s3'),

  /**
   * jQuery object for the dropdown submit (unique to this form).
   * @type {jQuery}
   */
  $dropdownSubmit: $('#dropdownSubmit-s3'),

  /**
   * jQuery object for the dirty field (unique to this form).
   * @type {jQuery}
   */
  $dirrtyField: $('#dirrty-s3'),

  /**
   * jQuery object for the S3 local retention period slider.
   * @type {jQuery}
   */
  $s3LocalDaysSlider: $('#PBXRecordS3LocalDaysSlider'),

  /**
   * jQuery object for S3 enabled checkbox.
   * @type {jQuery}
   */
  $s3EnabledCheckbox: $('#s3-enabled-checkbox'),

  /**
   * jQuery object for S3 settings group container.
   * @type {jQuery}
   */
  $s3SettingsGroup: $('#s3-settings-group'),

  /**
   * jQuery object for test S3 connection button.
   * @type {jQuery}
   */
  $testS3Button: $('#test-s3-connection'),

  /**
   * jQuery object for S3 stats container.
   * @type {jQuery}
   */
  $s3StatsContainer: $('#s3-stats-container'),

  /**
   * jQuery object for S3 stats message element.
   * @type {jQuery}
   */
  $s3StatsMessage: $('#s3-stats-message'),

  /**
   * jQuery object for S3 stats header.
   * @type {jQuery}
   */
  $s3StatsHeader: $('#s3-stats-header'),

  /**
   * jQuery object for S3 stats details.
   * @type {jQuery}
   */
  $s3StatsDetails: $('#s3-stats-details'),

  /**
   * jQuery object for the provider preset dropdown.
   * @type {jQuery}
   */
  $presetDropdown: $('#s3-provider-preset-dropdown'),

  /**
   * jQuery object for the preset hint container.
   * @type {jQuery}
   */
  $presetHint: $('#s3-preset-hint'),

  /**
   * jQuery object for the preset docs link.
   * @type {jQuery}
   */
  $presetDocsLink: $('#s3-preset-docs-link'),

  /**
   * jQuery object for the endpoint input (cached for placeholder updates).
   * @type {jQuery}
   */
  $s3EndpointInput: $('#s3-storage-form input[name="s3_endpoint"]'),

  /**
   * Provider presets received from /s3-storage GET response.
   * Indexed by preset id for O(1) lookup.
   * @type {Object<string, Object>}
   */
  presetCatalogue: {},

  /**
   * Base URL for documentation links.
   * @type {string}
   */
  docsBaseUrl: 'https://docs.mikopbx.com/',

  /**
   * Default preset id used when the server has no value yet.
   * @type {string}
   */
  DEFAULT_PRESET_ID: 'custom',

  /**
   * Suppresses the dropdown onChange handler while loadSettings()
   * synchronises the form with server data. Without this, setting the
   * dropdown's value during load would re-apply preset defaults and
   * clobber the freshly-loaded use_path_style flag.
   * @type {boolean}
   */
  isLoadingFromServer: false,

  /**
   * Possible period values for S3 local retention (in days).
   * Values: 7, 30, 90, 180, 365 days (1 week, 1/3/6 months, 1 year)
   */
  s3LocalDaysPeriod: ['7', '30', '90', '180', '365'],

  /**
   * Maximum allowed local retention period from main storage slider
   * Updated by storage-index.js when main slider changes
   */
  maxLocalRetentionDays: null,

  /**
   * Validation rules for the S3 form fields.
   * @type {object}
   */
  validateRules: {
    s3_endpoint: {
      identifier: 's3_endpoint',
      optional: true,
      depends: 's3_enabled',
      rules: [{
        type: 'url',
        prompt: globalTranslate.st_S3EndpointInvalid
      }]
    },
    s3_bucket: {
      identifier: 's3_bucket',
      optional: true,
      depends: 's3_enabled',
      rules: [{
        type: 'regExp',
        value: /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/,
        prompt: globalTranslate.st_S3BucketInvalid
      }]
    }
  },

  /**
   * Initialize or reinitialize the S3 local retention slider
   * @param {number} maxIndex - Maximum slider index (0-6)
   * @param {number} [initialValue] - Optional initial value to set
   */
  initializeSlider: function initializeSlider(maxIndex, initialValue) {
    // Destroy existing slider if it exists
    if (s3StorageIndex.$s3LocalDaysSlider.hasClass('slider')) {
      s3StorageIndex.$s3LocalDaysSlider.slider('destroy');
    } // Create slider with specified max


    s3StorageIndex.$s3LocalDaysSlider.slider({
      min: 0,
      max: maxIndex,
      step: 1,
      smooth: false,
      autoAdjustLabels: false,
      interpretLabel: function interpretLabel(value) {
        var labels = {
          0: '7 ' + globalTranslate.st_Days,
          1: globalTranslate.st_1Month,
          2: globalTranslate.st_3Months,
          3: globalTranslate.st_6Months,
          4: globalTranslate.st_1Year
        };
        return labels[value] || '';
      },
      onChange: s3StorageIndex.cbAfterSelectS3LocalDaysSlider
    }); // Set initial value if provided

    if (initialValue !== undefined && initialValue >= 0 && initialValue <= maxIndex) {
      s3StorageIndex.$s3LocalDaysSlider.slider('set value', initialValue, false);
    }
  },

  /**
   * Initialize S3 storage module
   */
  initialize: function initialize() {
    // Initialize S3 local retention period slider with default max (all options available)
    var defaultMaxIndex = s3StorageIndex.s3LocalDaysPeriod.length - 1;
    s3StorageIndex.initializeSlider(defaultMaxIndex); // Initialize S3 enabled checkbox

    s3StorageIndex.$s3EnabledCheckbox.checkbox({
      onChange: s3StorageIndex.toggleS3SettingsVisibility
    }); // Initialize provider preset dropdown. The user-driven path applies
    // preset defaults to the form; loadSettings() guards against this
    // firing on programmatic value changes.

    s3StorageIndex.$presetDropdown.dropdown({
      onChange: function onChange(value) {
        if (s3StorageIndex.isLoadingFromServer) {
          return;
        }

        s3StorageIndex.applyPresetToForm(value);
        s3StorageIndex.updatePresetUI(value);
        Form.dataChanged();
      }
    }); // Test S3 connection button handler

    s3StorageIndex.$testS3Button.on('click', s3StorageIndex.testS3Connection); // Initialize form

    s3StorageIndex.initializeForm(); // Load S3 settings

    s3StorageIndex.loadSettings();
  },

  /**
   * Toggle S3 settings group visibility based on checkbox state
   */
  toggleS3SettingsVisibility: function toggleS3SettingsVisibility() {
    if (s3StorageIndex.$s3EnabledCheckbox.checkbox('is checked')) {
      s3StorageIndex.$s3SettingsGroup.show(); // Load S3 stats when settings are shown

      s3StorageIndex.loadS3Stats();
    } else {
      s3StorageIndex.$s3SettingsGroup.hide();
      s3StorageIndex.$s3StatsContainer.hide();
    }
  },

  /**
   * Load S3 synchronization statistics
   */
  loadS3Stats: function loadS3Stats() {
    S3StorageAPI.getStats(function (response) {
      if (response.result === true && response.data) {
        s3StorageIndex.displayS3Stats(response.data);
      } else {
        s3StorageIndex.$s3StatsContainer.hide();
      }
    });
  },

  /**
   * Display S3 synchronization statistics
   * @param {Object} stats - Statistics data from API
   */
  displayS3Stats: function displayS3Stats(stats) {
    // Don't show if S3 is disabled
    if (!stats.s3_enabled) {
      s3StorageIndex.$s3StatsContainer.hide();
      return;
    } // Build header based on sync status


    var headerText = '';
    var messageClass = 'info';

    switch (stats.sync_status) {
      case 'synced':
        headerText = globalTranslate.st_S3StatusSynced;
        messageClass = 'positive';
        break;

      case 'uploading':
        headerText = globalTranslate.st_S3StatusUploading;
        messageClass = 'info';
        break;

      case 'syncing':
        headerText = globalTranslate.st_S3StatusSyncing.replace('%percent%', stats.sync_percentage);
        messageClass = 'info';
        break;

      case 'pending':
        headerText = globalTranslate.st_S3StatusPending;
        messageClass = 'warning';
        break;

      case 'empty':
        headerText = globalTranslate.st_S3StatusEmpty;
        messageClass = 'info';
        break;

      default:
        headerText = globalTranslate.st_S3StatusDisabled;
        messageClass = 'info';
    } // Build details text


    var details = []; // Files in S3

    if (stats.files_in_s3 > 0) {
      details.push(globalTranslate.st_S3FilesInCloud.replace('%count%', stats.files_in_s3.toLocaleString()).replace('%size%', s3StorageIndex.formatSize(stats.total_size_s3_bytes)));
    } // Files pending upload


    if (stats.files_local > 0) {
      details.push(globalTranslate.st_S3FilesPending.replace('%count%', stats.files_local.toLocaleString()).replace('%size%', s3StorageIndex.formatSize(stats.total_size_local_bytes)));
    } // Connection status


    if (stats.s3_connected) {
      details.push(globalTranslate.st_S3Connected);
    } else if (stats.s3_enabled) {
      details.push(globalTranslate.st_S3NotConnected);
      messageClass = 'warning';
    } // Last upload


    if (stats.last_upload_at) {
      details.push(globalTranslate.st_S3LastUpload.replace('%date%', stats.last_upload_at));
    } // Update message styling


    s3StorageIndex.$s3StatsMessage.removeClass('info positive warning negative').addClass(messageClass); // Update content

    s3StorageIndex.$s3StatsHeader.text(headerText);
    s3StorageIndex.$s3StatsDetails.html(details.join('<br>')); // Show container

    s3StorageIndex.$s3StatsContainer.show();
  },

  /**
   * Format bytes to human-readable size
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size string
   */
  formatSize: function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    var k = 1024;
    var sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * Callback after S3 local days slider value changes
   * @param {number} value - Slider value (0-6)
   */
  cbAfterSelectS3LocalDaysSlider: function cbAfterSelectS3LocalDaysSlider(value) {
    // Get the local retention period corresponding to the slider value
    var localDays = s3StorageIndex.s3LocalDaysPeriod[value]; // Set the form value for 'PBXRecordS3LocalDays'

    s3StorageIndex.$formObj.form('set value', 'PBXRecordS3LocalDays', localDays); // Trigger change event

    Form.dataChanged();
  },

  /**
   * Update S3 local slider limits based on total retention period
   * Called by storage-index.js when main slider changes
   * @param {string} totalPeriod - Total retention period in days ('' for infinity)
   */
  updateSliderLimits: function updateSliderLimits(totalPeriod) {
    // Store for reference
    s3StorageIndex.maxLocalRetentionDays = totalPeriod; // Calculate max index

    var maxIndex = s3StorageIndex.getMaxLocalRetentionIndex(totalPeriod); // Get current value before reinitializing

    var currentIndex = s3StorageIndex.$s3LocalDaysSlider.slider('get value'); // Clamp value to new max if needed

    var newValue = Math.min(currentIndex, maxIndex); // Reinitialize slider with new max (fixes visual positioning issue)

    s3StorageIndex.initializeSlider(maxIndex, newValue); // Update form value if it changed

    if (currentIndex > maxIndex) {
      s3StorageIndex.$formObj.form('set value', 'PBXRecordS3LocalDays', s3StorageIndex.s3LocalDaysPeriod[maxIndex]);
    }
  },

  /**
   * Get maximum allowed local retention index based on total retention period
   * @param {string} totalPeriod - Total retention period in days ('' for infinity)
   * @returns {number} Maximum index for s3LocalDaysPeriod array
   */
  getMaxLocalRetentionIndex: function getMaxLocalRetentionIndex(totalPeriod) {
    // If total period is infinity (empty, null, undefined, 0, or '0'), allow all local options
    if (!totalPeriod || totalPeriod === '' || totalPeriod === '0' || totalPeriod === 0) {
      return s3StorageIndex.s3LocalDaysPeriod.length - 1;
    }

    var totalDays = parseInt(totalPeriod);
    var maxIndex = s3StorageIndex.s3LocalDaysPeriod.length - 1; // Find the highest local retention that is less than total

    for (var i = s3StorageIndex.s3LocalDaysPeriod.length - 1; i >= 0; i--) {
      var localDays = parseInt(s3StorageIndex.s3LocalDaysPeriod[i]);

      if (localDays < totalDays) {
        maxIndex = i;
        break;
      }
    }

    return maxIndex;
  },

  /**
   * Write preset-derived defaults into the form. Region is only filled
   * when the user has nothing typed; path-style always tracks the preset
   * because that's the actual cross-provider fix the dropdown exists for.
   *
   * Called from the dropdown's user-driven onChange. loadSettings() does
   * NOT call this — server values win on load.
   *
   * @param {string} presetId
   */
  applyPresetToForm: function applyPresetToForm(presetId) {
    var preset = s3StorageIndex.presetCatalogue[presetId];

    if (!preset) {
      return;
    }

    var currentRegion = s3StorageIndex.$formObj.form('get value', 's3_region');

    if (!currentRegion) {
      s3StorageIndex.$formObj.form('set value', 's3_region', preset.region_default || '');
    }

    s3StorageIndex.$formObj.form('set value', 's3_use_path_style', preset.use_path_style ? 1 : 0);
  },

  /**
   * Update the preset-driven non-form UI: endpoint placeholder, hint
   * banner, docs link. Safe to call during initial load — does not write
   * form values.
   *
   * @param {string} presetId
   */
  updatePresetUI: function updatePresetUI(presetId) {
    var preset = s3StorageIndex.presetCatalogue[presetId];

    if (!preset) {
      return;
    }

    s3StorageIndex.$s3EndpointInput.attr('placeholder', preset.endpoint_placeholder || '');
    var hintText = globalTranslate[preset.hint_key] || '';

    if (hintText) {
      s3StorageIndex.$presetHint.find('.hint-text').text(hintText);
      s3StorageIndex.$presetHint.show();
    } else {
      s3StorageIndex.$presetHint.hide();
    }

    if (preset.docs_path) {
      s3StorageIndex.$presetDocsLink.attr('href', s3StorageIndex.docsBaseUrl + preset.docs_path).show();
    } else {
      s3StorageIndex.$presetDocsLink.hide();
    }
  },

  /**
   * Cache the preset catalogue from the API response so applyPresetDefaults
   * can look up metadata without another round-trip.
   *
   * @param {Array<Object>} presets - available_presets array from /s3-storage GET
   */
  cachePresetCatalogue: function cachePresetCatalogue(presets) {
    s3StorageIndex.presetCatalogue = {};

    if (!Array.isArray(presets)) {
      return;
    }

    presets.forEach(function (preset) {
      if (preset && preset.id) {
        s3StorageIndex.presetCatalogue[preset.id] = preset;
      }
    });
  },

  /**
   * Test S3 connection with current form values
   */
  testS3Connection: function testS3Connection() {
    // Show loading state
    s3StorageIndex.$testS3Button.addClass('loading disabled'); // Get form values

    var testData = {
      s3_endpoint: s3StorageIndex.$formObj.form('get value', 's3_endpoint'),
      s3_region: s3StorageIndex.$formObj.form('get value', 's3_region'),
      s3_bucket: s3StorageIndex.$formObj.form('get value', 's3_bucket'),
      s3_access_key: s3StorageIndex.$formObj.form('get value', 's3_access_key'),
      s3_secret_key: s3StorageIndex.$formObj.form('get value', 's3_secret_key'),
      s3_provider_preset: s3StorageIndex.$formObj.form('get value', 's3_provider_preset'),
      s3_use_path_style: s3StorageIndex.$formObj.form('get value', 's3_use_path_style')
    }; // Call API to test connection

    S3StorageAPI.testConnection(testData, function (response) {
      // Remove loading state
      s3StorageIndex.$testS3Button.removeClass('loading disabled');

      if (response && response.result === true) {
        var _response$data;

        var message = ((_response$data = response.data) === null || _response$data === void 0 ? void 0 : _response$data.message) || globalTranslate.st_S3TestSuccess;
        UserMessage.showInformation(message, globalTranslate.st_S3TestConnectionHeader);
        return;
      } // Failure path — surface the actionable diagnostic chain when
      // available: hint > underlying SDK message > generic fallback.


      var data = (response === null || response === void 0 ? void 0 : response.data) || {};
      var lines = [];

      if (data.message) {
        lines.push(data.message);
      }

      if (data.aws_error_code) {
        lines.push((globalTranslate.st_S3ErrorCodePrefix || 'AWS error') + ': ' + data.aws_error_code);
      }

      if (data.error_class) {
        lines.push((globalTranslate.st_S3ErrorTypePrefix || 'Type') + ': ' + data.error_class);
      }

      if (data.hint) {
        lines.push(data.hint);
      }

      var errorMessage = lines.length > 0 ? lines.join('\n') : globalTranslate.st_S3TestFailed;
      UserMessage.showError(errorMessage, globalTranslate.st_S3TestConnectionHeader);
    });
  },

  /**
   * Load S3 settings from API
   */
  loadSettings: function loadSettings() {
    S3StorageAPI.get(function (response) {
      if (response.result === true && response.data) {
        var data = response.data; // Cache preset catalogue first so the dropdown change handler
        // can resolve the chosen preset against it.

        s3StorageIndex.cachePresetCatalogue(data.available_presets || []); // Set checkbox state

        if (data.s3_enabled === '1' || data.s3_enabled === 1 || data.s3_enabled === true) {
          s3StorageIndex.$s3EnabledCheckbox.checkbox('set checked');
        } else {
          s3StorageIndex.$s3EnabledCheckbox.checkbox('set unchecked');
        } // Set text fields


        s3StorageIndex.$formObj.form('set value', 's3_endpoint', data.s3_endpoint || '');
        s3StorageIndex.$formObj.form('set value', 's3_region', data.s3_region || '');
        s3StorageIndex.$formObj.form('set value', 's3_bucket', data.s3_bucket || '');
        s3StorageIndex.$formObj.form('set value', 's3_access_key', data.s3_access_key || '');
        s3StorageIndex.$formObj.form('set value', 's3_secret_key', data.s3_secret_key || ''); // Set preset dropdown without firing the onChange handler —
        // server values are authoritative on load. Then refresh the
        // preset-driven UI bits (placeholder, hint, docs link).

        s3StorageIndex.isLoadingFromServer = true;

        try {
          var presetId = data.s3_provider_preset || s3StorageIndex.DEFAULT_PRESET_ID;
          s3StorageIndex.$presetDropdown.dropdown('set selected', presetId);
          s3StorageIndex.$formObj.form('set value', 's3_use_path_style', data.s3_use_path_style ? 1 : 0);
          s3StorageIndex.updatePresetUI(presetId);
        } finally {
          s3StorageIndex.isLoadingFromServer = false;
        } // Set S3 local retention slider


        var localDays = String(data.PBXRecordS3LocalDays);
        var localIndex = s3StorageIndex.s3LocalDaysPeriod.indexOf(localDays); // Fallback for legacy values not in new array - find closest valid value

        if (localIndex < 0) {
          var localDaysNum = parseInt(localDays) || 7; // Find the smallest value >= localDaysNum, or use first if all are larger

          localIndex = 0;

          for (var i = 0; i < s3StorageIndex.s3LocalDaysPeriod.length; i++) {
            if (parseInt(s3StorageIndex.s3LocalDaysPeriod[i]) >= localDaysNum) {
              localIndex = i;
              break;
            }

            localIndex = i; // Use last if none found
          }
        }

        s3StorageIndex.$s3LocalDaysSlider.slider('set value', localIndex);
        s3StorageIndex.$formObj.form('set value', 'PBXRecordS3LocalDays', s3StorageIndex.s3LocalDaysPeriod[localIndex]); // Update visibility

        s3StorageIndex.toggleS3SettingsVisibility(); // Load S3 stats if enabled

        if (data.s3_enabled === '1' || data.s3_enabled === 1 || data.s3_enabled === true) {
          s3StorageIndex.loadS3Stats();
        }
      }
    });
  },

  /**
   * Callback before form is sent
   * @param {Object} settings - Form settings
   * @returns {Object} Updated settings
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    var result = settings;
    result.data = s3StorageIndex.$formObj.form('get values');
    return result;
  },

  /**
   * Callback after form has been sent
   * @param {Object} response - Server response
   */
  cbAfterSendForm: function cbAfterSendForm(response) {
    if (response.success) {
      // Reload settings to show updated values
      s3StorageIndex.loadSettings();
    } else {
      Form.$submitButton.removeClass('disabled');
    }
  },

  /**
   * Initialize the form with custom settings
   */
  initializeForm: function initializeForm() {
    Form.$formObj = s3StorageIndex.$formObj;
    Form.$submitButton = s3StorageIndex.$submitButton;
    Form.$dropdownSubmit = s3StorageIndex.$dropdownSubmit;
    Form.$dirrtyField = s3StorageIndex.$dirrtyField;
    Form.validateRules = s3StorageIndex.validateRules;
    Form.cbBeforeSendForm = s3StorageIndex.cbBeforeSendForm;
    Form.cbAfterSendForm = s3StorageIndex.cbAfterSendForm; // Configure REST API settings for Form.js (singleton resource)

    Form.apiSettings = {
      enabled: true,
      apiObject: S3StorageAPI,
      saveMethod: 'patch' // Using PATCH for partial updates

    };
    Form.initialize();
  }
}; // Initialize when document is ready

$(document).ready(function () {
  s3StorageIndex.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TdG9yYWdlL3MzLXN0b3JhZ2UtaW5kZXguanMiXSwibmFtZXMiOlsiczNTdG9yYWdlSW5kZXgiLCIkZm9ybU9iaiIsIiQiLCIkc3VibWl0QnV0dG9uIiwiJGRyb3Bkb3duU3VibWl0IiwiJGRpcnJ0eUZpZWxkIiwiJHMzTG9jYWxEYXlzU2xpZGVyIiwiJHMzRW5hYmxlZENoZWNrYm94IiwiJHMzU2V0dGluZ3NHcm91cCIsIiR0ZXN0UzNCdXR0b24iLCIkczNTdGF0c0NvbnRhaW5lciIsIiRzM1N0YXRzTWVzc2FnZSIsIiRzM1N0YXRzSGVhZGVyIiwiJHMzU3RhdHNEZXRhaWxzIiwiJHByZXNldERyb3Bkb3duIiwiJHByZXNldEhpbnQiLCIkcHJlc2V0RG9jc0xpbmsiLCIkczNFbmRwb2ludElucHV0IiwicHJlc2V0Q2F0YWxvZ3VlIiwiZG9jc0Jhc2VVcmwiLCJERUZBVUxUX1BSRVNFVF9JRCIsImlzTG9hZGluZ0Zyb21TZXJ2ZXIiLCJzM0xvY2FsRGF5c1BlcmlvZCIsIm1heExvY2FsUmV0ZW50aW9uRGF5cyIsInZhbGlkYXRlUnVsZXMiLCJzM19lbmRwb2ludCIsImlkZW50aWZpZXIiLCJvcHRpb25hbCIsImRlcGVuZHMiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJzdF9TM0VuZHBvaW50SW52YWxpZCIsInMzX2J1Y2tldCIsInZhbHVlIiwic3RfUzNCdWNrZXRJbnZhbGlkIiwiaW5pdGlhbGl6ZVNsaWRlciIsIm1heEluZGV4IiwiaW5pdGlhbFZhbHVlIiwiaGFzQ2xhc3MiLCJzbGlkZXIiLCJtaW4iLCJtYXgiLCJzdGVwIiwic21vb3RoIiwiYXV0b0FkanVzdExhYmVscyIsImludGVycHJldExhYmVsIiwibGFiZWxzIiwic3RfRGF5cyIsInN0XzFNb250aCIsInN0XzNNb250aHMiLCJzdF82TW9udGhzIiwic3RfMVllYXIiLCJvbkNoYW5nZSIsImNiQWZ0ZXJTZWxlY3RTM0xvY2FsRGF5c1NsaWRlciIsInVuZGVmaW5lZCIsImluaXRpYWxpemUiLCJkZWZhdWx0TWF4SW5kZXgiLCJsZW5ndGgiLCJjaGVja2JveCIsInRvZ2dsZVMzU2V0dGluZ3NWaXNpYmlsaXR5IiwiZHJvcGRvd24iLCJhcHBseVByZXNldFRvRm9ybSIsInVwZGF0ZVByZXNldFVJIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwib24iLCJ0ZXN0UzNDb25uZWN0aW9uIiwiaW5pdGlhbGl6ZUZvcm0iLCJsb2FkU2V0dGluZ3MiLCJzaG93IiwibG9hZFMzU3RhdHMiLCJoaWRlIiwiUzNTdG9yYWdlQVBJIiwiZ2V0U3RhdHMiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJkaXNwbGF5UzNTdGF0cyIsInN0YXRzIiwiczNfZW5hYmxlZCIsImhlYWRlclRleHQiLCJtZXNzYWdlQ2xhc3MiLCJzeW5jX3N0YXR1cyIsInN0X1MzU3RhdHVzU3luY2VkIiwic3RfUzNTdGF0dXNVcGxvYWRpbmciLCJzdF9TM1N0YXR1c1N5bmNpbmciLCJyZXBsYWNlIiwic3luY19wZXJjZW50YWdlIiwic3RfUzNTdGF0dXNQZW5kaW5nIiwic3RfUzNTdGF0dXNFbXB0eSIsInN0X1MzU3RhdHVzRGlzYWJsZWQiLCJkZXRhaWxzIiwiZmlsZXNfaW5fczMiLCJwdXNoIiwic3RfUzNGaWxlc0luQ2xvdWQiLCJ0b0xvY2FsZVN0cmluZyIsImZvcm1hdFNpemUiLCJ0b3RhbF9zaXplX3MzX2J5dGVzIiwiZmlsZXNfbG9jYWwiLCJzdF9TM0ZpbGVzUGVuZGluZyIsInRvdGFsX3NpemVfbG9jYWxfYnl0ZXMiLCJzM19jb25uZWN0ZWQiLCJzdF9TM0Nvbm5lY3RlZCIsInN0X1MzTm90Q29ubmVjdGVkIiwibGFzdF91cGxvYWRfYXQiLCJzdF9TM0xhc3RVcGxvYWQiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwidGV4dCIsImh0bWwiLCJqb2luIiwiYnl0ZXMiLCJrIiwic2l6ZXMiLCJpIiwiTWF0aCIsImZsb29yIiwibG9nIiwicGFyc2VGbG9hdCIsInBvdyIsInRvRml4ZWQiLCJsb2NhbERheXMiLCJmb3JtIiwidXBkYXRlU2xpZGVyTGltaXRzIiwidG90YWxQZXJpb2QiLCJnZXRNYXhMb2NhbFJldGVudGlvbkluZGV4IiwiY3VycmVudEluZGV4IiwibmV3VmFsdWUiLCJ0b3RhbERheXMiLCJwYXJzZUludCIsInByZXNldElkIiwicHJlc2V0IiwiY3VycmVudFJlZ2lvbiIsInJlZ2lvbl9kZWZhdWx0IiwidXNlX3BhdGhfc3R5bGUiLCJhdHRyIiwiZW5kcG9pbnRfcGxhY2Vob2xkZXIiLCJoaW50VGV4dCIsImhpbnRfa2V5IiwiZmluZCIsImRvY3NfcGF0aCIsImNhY2hlUHJlc2V0Q2F0YWxvZ3VlIiwicHJlc2V0cyIsIkFycmF5IiwiaXNBcnJheSIsImZvckVhY2giLCJpZCIsInRlc3REYXRhIiwiczNfcmVnaW9uIiwiczNfYWNjZXNzX2tleSIsInMzX3NlY3JldF9rZXkiLCJzM19wcm92aWRlcl9wcmVzZXQiLCJzM191c2VfcGF0aF9zdHlsZSIsInRlc3RDb25uZWN0aW9uIiwibWVzc2FnZSIsInN0X1MzVGVzdFN1Y2Nlc3MiLCJVc2VyTWVzc2FnZSIsInNob3dJbmZvcm1hdGlvbiIsInN0X1MzVGVzdENvbm5lY3Rpb25IZWFkZXIiLCJsaW5lcyIsImF3c19lcnJvcl9jb2RlIiwic3RfUzNFcnJvckNvZGVQcmVmaXgiLCJlcnJvcl9jbGFzcyIsInN0X1MzRXJyb3JUeXBlUHJlZml4IiwiaGludCIsImVycm9yTWVzc2FnZSIsInN0X1MzVGVzdEZhaWxlZCIsInNob3dFcnJvciIsImdldCIsImF2YWlsYWJsZV9wcmVzZXRzIiwiU3RyaW5nIiwiUEJYUmVjb3JkUzNMb2NhbERheXMiLCJsb2NhbEluZGV4IiwiaW5kZXhPZiIsImxvY2FsRGF5c051bSIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsImNiQWZ0ZXJTZW5kRm9ybSIsInN1Y2Nlc3MiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiZG9jdW1lbnQiLCJyZWFk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SjtBQUNBO0FBQ0l2QyxFQUFBQSxjQXBwQm1CLDRCQW9wQkY7QUFDYkosSUFBQUEsSUFBSSxDQUFDaEUsUUFBTCxHQUFnQkQsY0FBYyxDQUFDQyxRQUEvQjtBQUNBZ0UsSUFBQUEsSUFBSSxDQUFDOUQsYUFBTCxHQUFxQkgsY0FBYyxDQUFDRyxhQUFwQztBQUNBOEQsSUFBQUEsSUFBSSxDQUFDN0QsZUFBTCxHQUF1QkosY0FBYyxDQUFDSSxlQUF0QztBQUNBNkQsSUFBQUEsSUFBSSxDQUFDNUQsWUFBTCxHQUFvQkwsY0FBYyxDQUFDSyxZQUFuQztBQUNBNEQsSUFBQUEsSUFBSSxDQUFDekMsYUFBTCxHQUFxQnhCLGNBQWMsQ0FBQ3dCLGFBQXBDO0FBQ0F5QyxJQUFBQSxJQUFJLENBQUNnSCxnQkFBTCxHQUF3QmpMLGNBQWMsQ0FBQ2lMLGdCQUF2QztBQUNBaEgsSUFBQUEsSUFBSSxDQUFDa0gsZUFBTCxHQUF1Qm5MLGNBQWMsQ0FBQ21MLGVBQXRDLENBUGEsQ0FTYjs7QUFDQWxILElBQUFBLElBQUksQ0FBQ29ILFdBQUwsR0FBbUI7QUFDZkMsTUFBQUEsT0FBTyxFQUFFLElBRE07QUFFZkMsTUFBQUEsU0FBUyxFQUFFN0csWUFGSTtBQUdmOEcsTUFBQUEsVUFBVSxFQUFFLE9BSEcsQ0FHSzs7QUFITCxLQUFuQjtBQU1BdkgsSUFBQUEsSUFBSSxDQUFDUixVQUFMO0FBQ0g7QUFycUJrQixDQUF2QixDLENBd3FCQTs7QUFDQXZELENBQUMsQ0FBQ3VMLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEIxTCxFQUFBQSxjQUFjLENBQUN5RCxVQUFmO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFMzU3RvcmFnZUFQSSwgVXNlck1lc3NhZ2UsICQgKi9cblxuLyoqXG4gKiBTMyBTdG9yYWdlIG1hbmFnZW1lbnQgbW9kdWxlXG4gKiBIYW5kbGVzIFMzIGNsb3VkIHN0b3JhZ2Ugc2V0dGluZ3MgKFRhYiAzKVxuICogU2VuZHMgZGF0YSB0bzogUEFUQ0ggL3BieGNvcmUvYXBpL3YzL3MzLXN0b3JhZ2VcbiAqL1xuY29uc3QgczNTdG9yYWdlSW5kZXggPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIFMzIHN0b3JhZ2UgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjczMtc3RvcmFnZS1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgc3VibWl0IGJ1dHRvbiAodW5pcXVlIHRvIHRoaXMgZm9ybSkuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc3VibWl0QnV0dG9uOiAkKCcjc3VibWl0YnV0dG9uLXMzJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZHJvcGRvd24gc3VibWl0ICh1bmlxdWUgdG8gdGhpcyBmb3JtKS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkcm9wZG93blN1Ym1pdDogJCgnI2Ryb3Bkb3duU3VibWl0LXMzJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZGlydHkgZmllbGQgKHVuaXF1ZSB0byB0aGlzIGZvcm0pLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRpcnJ0eUZpZWxkOiAkKCcjZGlycnR5LXMzJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgUzMgbG9jYWwgcmV0ZW50aW9uIHBlcmlvZCBzbGlkZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkczNMb2NhbERheXNTbGlkZXI6ICQoJyNQQlhSZWNvcmRTM0xvY2FsRGF5c1NsaWRlcicpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgUzMgZW5hYmxlZCBjaGVja2JveC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzM0VuYWJsZWRDaGVja2JveDogJCgnI3MzLWVuYWJsZWQtY2hlY2tib3gnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIFMzIHNldHRpbmdzIGdyb3VwIGNvbnRhaW5lci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzM1NldHRpbmdzR3JvdXA6ICQoJyNzMy1zZXR0aW5ncy1ncm91cCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGVzdCBTMyBjb25uZWN0aW9uIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR0ZXN0UzNCdXR0b246ICQoJyN0ZXN0LXMzLWNvbm5lY3Rpb24nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIFMzIHN0YXRzIGNvbnRhaW5lci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzM1N0YXRzQ29udGFpbmVyOiAkKCcjczMtc3RhdHMtY29udGFpbmVyJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciBTMyBzdGF0cyBtZXNzYWdlIGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkczNTdGF0c01lc3NhZ2U6ICQoJyNzMy1zdGF0cy1tZXNzYWdlJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciBTMyBzdGF0cyBoZWFkZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkczNTdGF0c0hlYWRlcjogJCgnI3MzLXN0YXRzLWhlYWRlcicpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgUzMgc3RhdHMgZGV0YWlscy5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzM1N0YXRzRGV0YWlsczogJCgnI3MzLXN0YXRzLWRldGFpbHMnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBwcm92aWRlciBwcmVzZXQgZHJvcGRvd24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkcHJlc2V0RHJvcGRvd246ICQoJyNzMy1wcm92aWRlci1wcmVzZXQtZHJvcGRvd24nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBwcmVzZXQgaGludCBjb250YWluZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkcHJlc2V0SGludDogJCgnI3MzLXByZXNldC1oaW50JyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgcHJlc2V0IGRvY3MgbGluay5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRwcmVzZXREb2NzTGluazogJCgnI3MzLXByZXNldC1kb2NzLWxpbmsnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBlbmRwb2ludCBpbnB1dCAoY2FjaGVkIGZvciBwbGFjZWhvbGRlciB1cGRhdGVzKS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzM0VuZHBvaW50SW5wdXQ6ICQoJyNzMy1zdG9yYWdlLWZvcm0gaW5wdXRbbmFtZT1cInMzX2VuZHBvaW50XCJdJyksXG5cbiAgICAvKipcbiAgICAgKiBQcm92aWRlciBwcmVzZXRzIHJlY2VpdmVkIGZyb20gL3MzLXN0b3JhZ2UgR0VUIHJlc3BvbnNlLlxuICAgICAqIEluZGV4ZWQgYnkgcHJlc2V0IGlkIGZvciBPKDEpIGxvb2t1cC5cbiAgICAgKiBAdHlwZSB7T2JqZWN0PHN0cmluZywgT2JqZWN0Pn1cbiAgICAgKi9cbiAgICBwcmVzZXRDYXRhbG9ndWU6IHt9LFxuXG4gICAgLyoqXG4gICAgICogQmFzZSBVUkwgZm9yIGRvY3VtZW50YXRpb24gbGlua3MuXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBkb2NzQmFzZVVybDogJ2h0dHBzOi8vZG9jcy5taWtvcGJ4LmNvbS8nLFxuXG4gICAgLyoqXG4gICAgICogRGVmYXVsdCBwcmVzZXQgaWQgdXNlZCB3aGVuIHRoZSBzZXJ2ZXIgaGFzIG5vIHZhbHVlIHlldC5cbiAgICAgKiBAdHlwZSB7c3RyaW5nfVxuICAgICAqL1xuICAgIERFRkFVTFRfUFJFU0VUX0lEOiAnY3VzdG9tJyxcblxuICAgIC8qKlxuICAgICAqIFN1cHByZXNzZXMgdGhlIGRyb3Bkb3duIG9uQ2hhbmdlIGhhbmRsZXIgd2hpbGUgbG9hZFNldHRpbmdzKClcbiAgICAgKiBzeW5jaHJvbmlzZXMgdGhlIGZvcm0gd2l0aCBzZXJ2ZXIgZGF0YS4gV2l0aG91dCB0aGlzLCBzZXR0aW5nIHRoZVxuICAgICAqIGRyb3Bkb3duJ3MgdmFsdWUgZHVyaW5nIGxvYWQgd291bGQgcmUtYXBwbHkgcHJlc2V0IGRlZmF1bHRzIGFuZFxuICAgICAqIGNsb2JiZXIgdGhlIGZyZXNobHktbG9hZGVkIHVzZV9wYXRoX3N0eWxlIGZsYWcuXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgaXNMb2FkaW5nRnJvbVNlcnZlcjogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBQb3NzaWJsZSBwZXJpb2QgdmFsdWVzIGZvciBTMyBsb2NhbCByZXRlbnRpb24gKGluIGRheXMpLlxuICAgICAqIFZhbHVlczogNywgMzAsIDkwLCAxODAsIDM2NSBkYXlzICgxIHdlZWssIDEvMy82IG1vbnRocywgMSB5ZWFyKVxuICAgICAqL1xuICAgIHMzTG9jYWxEYXlzUGVyaW9kOiBbJzcnLCAnMzAnLCAnOTAnLCAnMTgwJywgJzM2NSddLFxuXG4gICAgLyoqXG4gICAgICogTWF4aW11bSBhbGxvd2VkIGxvY2FsIHJldGVudGlvbiBwZXJpb2QgZnJvbSBtYWluIHN0b3JhZ2Ugc2xpZGVyXG4gICAgICogVXBkYXRlZCBieSBzdG9yYWdlLWluZGV4LmpzIHdoZW4gbWFpbiBzbGlkZXIgY2hhbmdlc1xuICAgICAqL1xuICAgIG1heExvY2FsUmV0ZW50aW9uRGF5czogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBTMyBmb3JtIGZpZWxkcy5cbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgczNfZW5kcG9pbnQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzM19lbmRwb2ludCcsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIGRlcGVuZHM6ICdzM19lbmFibGVkJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAndXJsJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuc3RfUzNFbmRwb2ludEludmFsaWRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBzM19idWNrZXQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzM19idWNrZXQnLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBkZXBlbmRzOiAnczNfZW5hYmxlZCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAvXlthLXowLTldW2EtejAtOS4tXXsxLDYxfVthLXowLTldJC8sXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnN0X1MzQnVja2V0SW52YWxpZFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgb3IgcmVpbml0aWFsaXplIHRoZSBTMyBsb2NhbCByZXRlbnRpb24gc2xpZGVyXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IG1heEluZGV4IC0gTWF4aW11bSBzbGlkZXIgaW5kZXggKDAtNilcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gW2luaXRpYWxWYWx1ZV0gLSBPcHRpb25hbCBpbml0aWFsIHZhbHVlIHRvIHNldFxuICAgICAqL1xuICAgIGluaXRpYWxpemVTbGlkZXIobWF4SW5kZXgsIGluaXRpYWxWYWx1ZSkge1xuICAgICAgICAvLyBEZXN0cm95IGV4aXN0aW5nIHNsaWRlciBpZiBpdCBleGlzdHNcbiAgICAgICAgaWYgKHMzU3RvcmFnZUluZGV4LiRzM0xvY2FsRGF5c1NsaWRlci5oYXNDbGFzcygnc2xpZGVyJykpIHtcbiAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LiRzM0xvY2FsRGF5c1NsaWRlci5zbGlkZXIoJ2Rlc3Ryb3knKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENyZWF0ZSBzbGlkZXIgd2l0aCBzcGVjaWZpZWQgbWF4XG4gICAgICAgIHMzU3RvcmFnZUluZGV4LiRzM0xvY2FsRGF5c1NsaWRlclxuICAgICAgICAgICAgLnNsaWRlcih7XG4gICAgICAgICAgICAgICAgbWluOiAwLFxuICAgICAgICAgICAgICAgIG1heDogbWF4SW5kZXgsXG4gICAgICAgICAgICAgICAgc3RlcDogMSxcbiAgICAgICAgICAgICAgICBzbW9vdGg6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGF1dG9BZGp1c3RMYWJlbHM6IGZhbHNlLFxuICAgICAgICAgICAgICAgIGludGVycHJldExhYmVsOiBmdW5jdGlvbiAodmFsdWUpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbGFiZWxzID0ge1xuICAgICAgICAgICAgICAgICAgICAgICAgMDogJzcgJyArIGdsb2JhbFRyYW5zbGF0ZS5zdF9EYXlzLFxuICAgICAgICAgICAgICAgICAgICAgICAgMTogZ2xvYmFsVHJhbnNsYXRlLnN0XzFNb250aCxcbiAgICAgICAgICAgICAgICAgICAgICAgIDI6IGdsb2JhbFRyYW5zbGF0ZS5zdF8zTW9udGhzLFxuICAgICAgICAgICAgICAgICAgICAgICAgMzogZ2xvYmFsVHJhbnNsYXRlLnN0XzZNb250aHMsXG4gICAgICAgICAgICAgICAgICAgICAgICA0OiBnbG9iYWxUcmFuc2xhdGUuc3RfMVllYXIsXG4gICAgICAgICAgICAgICAgICAgIH07XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBsYWJlbHNbdmFsdWVdIHx8ICcnO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25DaGFuZ2U6IHMzU3RvcmFnZUluZGV4LmNiQWZ0ZXJTZWxlY3RTM0xvY2FsRGF5c1NsaWRlcixcbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgIC8vIFNldCBpbml0aWFsIHZhbHVlIGlmIHByb3ZpZGVkXG4gICAgICAgIGlmIChpbml0aWFsVmFsdWUgIT09IHVuZGVmaW5lZCAmJiBpbml0aWFsVmFsdWUgPj0gMCAmJiBpbml0aWFsVmFsdWUgPD0gbWF4SW5kZXgpIHtcbiAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LiRzM0xvY2FsRGF5c1NsaWRlci5zbGlkZXIoJ3NldCB2YWx1ZScsIGluaXRpYWxWYWx1ZSwgZmFsc2UpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgUzMgc3RvcmFnZSBtb2R1bGVcbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIFMzIGxvY2FsIHJldGVudGlvbiBwZXJpb2Qgc2xpZGVyIHdpdGggZGVmYXVsdCBtYXggKGFsbCBvcHRpb25zIGF2YWlsYWJsZSlcbiAgICAgICAgY29uc3QgZGVmYXVsdE1heEluZGV4ID0gczNTdG9yYWdlSW5kZXguczNMb2NhbERheXNQZXJpb2QubGVuZ3RoIC0gMTtcbiAgICAgICAgczNTdG9yYWdlSW5kZXguaW5pdGlhbGl6ZVNsaWRlcihkZWZhdWx0TWF4SW5kZXgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgUzMgZW5hYmxlZCBjaGVja2JveFxuICAgICAgICBzM1N0b3JhZ2VJbmRleC4kczNFbmFibGVkQ2hlY2tib3guY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6IHMzU3RvcmFnZUluZGV4LnRvZ2dsZVMzU2V0dGluZ3NWaXNpYmlsaXR5XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgcHJvdmlkZXIgcHJlc2V0IGRyb3Bkb3duLiBUaGUgdXNlci1kcml2ZW4gcGF0aCBhcHBsaWVzXG4gICAgICAgIC8vIHByZXNldCBkZWZhdWx0cyB0byB0aGUgZm9ybTsgbG9hZFNldHRpbmdzKCkgZ3VhcmRzIGFnYWluc3QgdGhpc1xuICAgICAgICAvLyBmaXJpbmcgb24gcHJvZ3JhbW1hdGljIHZhbHVlIGNoYW5nZXMuXG4gICAgICAgIHMzU3RvcmFnZUluZGV4LiRwcmVzZXREcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZSh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmIChzM1N0b3JhZ2VJbmRleC5pc0xvYWRpbmdGcm9tU2VydmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguYXBwbHlQcmVzZXRUb0Zvcm0odmFsdWUpO1xuICAgICAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LnVwZGF0ZVByZXNldFVJKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBUZXN0IFMzIGNvbm5lY3Rpb24gYnV0dG9uIGhhbmRsZXJcbiAgICAgICAgczNTdG9yYWdlSW5kZXguJHRlc3RTM0J1dHRvbi5vbignY2xpY2snLCBzM1N0b3JhZ2VJbmRleC50ZXN0UzNDb25uZWN0aW9uKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGZvcm1cbiAgICAgICAgczNTdG9yYWdlSW5kZXguaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBMb2FkIFMzIHNldHRpbmdzXG4gICAgICAgIHMzU3RvcmFnZUluZGV4LmxvYWRTZXR0aW5ncygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGUgUzMgc2V0dGluZ3MgZ3JvdXAgdmlzaWJpbGl0eSBiYXNlZCBvbiBjaGVja2JveCBzdGF0ZVxuICAgICAqL1xuICAgIHRvZ2dsZVMzU2V0dGluZ3NWaXNpYmlsaXR5KCkge1xuICAgICAgICBpZiAoczNTdG9yYWdlSW5kZXguJHMzRW5hYmxlZENoZWNrYm94LmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LiRzM1NldHRpbmdzR3JvdXAuc2hvdygpO1xuICAgICAgICAgICAgLy8gTG9hZCBTMyBzdGF0cyB3aGVuIHNldHRpbmdzIGFyZSBzaG93blxuICAgICAgICAgICAgczNTdG9yYWdlSW5kZXgubG9hZFMzU3RhdHMoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LiRzM1NldHRpbmdzR3JvdXAuaGlkZSgpO1xuICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguJHMzU3RhdHNDb250YWluZXIuaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgUzMgc3luY2hyb25pemF0aW9uIHN0YXRpc3RpY3NcbiAgICAgKi9cbiAgICBsb2FkUzNTdGF0cygpIHtcbiAgICAgICAgUzNTdG9yYWdlQVBJLmdldFN0YXRzKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguZGlzcGxheVMzU3RhdHMocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LiRzM1N0YXRzQ29udGFpbmVyLmhpZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERpc3BsYXkgUzMgc3luY2hyb25pemF0aW9uIHN0YXRpc3RpY3NcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc3RhdHMgLSBTdGF0aXN0aWNzIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBkaXNwbGF5UzNTdGF0cyhzdGF0cykge1xuICAgICAgICAvLyBEb24ndCBzaG93IGlmIFMzIGlzIGRpc2FibGVkXG4gICAgICAgIGlmICghc3RhdHMuczNfZW5hYmxlZCkge1xuICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguJHMzU3RhdHNDb250YWluZXIuaGlkZSgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQnVpbGQgaGVhZGVyIGJhc2VkIG9uIHN5bmMgc3RhdHVzXG4gICAgICAgIGxldCBoZWFkZXJUZXh0ID0gJyc7XG4gICAgICAgIGxldCBtZXNzYWdlQ2xhc3MgPSAnaW5mbyc7XG5cbiAgICAgICAgc3dpdGNoIChzdGF0cy5zeW5jX3N0YXR1cykge1xuICAgICAgICAgICAgY2FzZSAnc3luY2VkJzpcbiAgICAgICAgICAgICAgICBoZWFkZXJUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLnN0X1MzU3RhdHVzU3luY2VkO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2VDbGFzcyA9ICdwb3NpdGl2ZSc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICd1cGxvYWRpbmcnOlxuICAgICAgICAgICAgICAgIGhlYWRlclRleHQgPSBnbG9iYWxUcmFuc2xhdGUuc3RfUzNTdGF0dXNVcGxvYWRpbmc7XG4gICAgICAgICAgICAgICAgbWVzc2FnZUNsYXNzID0gJ2luZm8nO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnc3luY2luZyc6XG4gICAgICAgICAgICAgICAgaGVhZGVyVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5zdF9TM1N0YXR1c1N5bmNpbmdcbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoJyVwZXJjZW50JScsIHN0YXRzLnN5bmNfcGVyY2VudGFnZSk7XG4gICAgICAgICAgICAgICAgbWVzc2FnZUNsYXNzID0gJ2luZm8nO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAncGVuZGluZyc6XG4gICAgICAgICAgICAgICAgaGVhZGVyVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5zdF9TM1N0YXR1c1BlbmRpbmc7XG4gICAgICAgICAgICAgICAgbWVzc2FnZUNsYXNzID0gJ3dhcm5pbmcnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZW1wdHknOlxuICAgICAgICAgICAgICAgIGhlYWRlclRleHQgPSBnbG9iYWxUcmFuc2xhdGUuc3RfUzNTdGF0dXNFbXB0eTtcbiAgICAgICAgICAgICAgICBtZXNzYWdlQ2xhc3MgPSAnaW5mbyc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGhlYWRlclRleHQgPSBnbG9iYWxUcmFuc2xhdGUuc3RfUzNTdGF0dXNEaXNhYmxlZDtcbiAgICAgICAgICAgICAgICBtZXNzYWdlQ2xhc3MgPSAnaW5mbyc7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBCdWlsZCBkZXRhaWxzIHRleHRcbiAgICAgICAgY29uc3QgZGV0YWlscyA9IFtdO1xuXG4gICAgICAgIC8vIEZpbGVzIGluIFMzXG4gICAgICAgIGlmIChzdGF0cy5maWxlc19pbl9zMyA+IDApIHtcbiAgICAgICAgICAgIGRldGFpbHMucHVzaChnbG9iYWxUcmFuc2xhdGUuc3RfUzNGaWxlc0luQ2xvdWRcbiAgICAgICAgICAgICAgICAucmVwbGFjZSgnJWNvdW50JScsIHN0YXRzLmZpbGVzX2luX3MzLnRvTG9jYWxlU3RyaW5nKCkpXG4gICAgICAgICAgICAgICAgLnJlcGxhY2UoJyVzaXplJScsIHMzU3RvcmFnZUluZGV4LmZvcm1hdFNpemUoc3RhdHMudG90YWxfc2l6ZV9zM19ieXRlcykpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZpbGVzIHBlbmRpbmcgdXBsb2FkXG4gICAgICAgIGlmIChzdGF0cy5maWxlc19sb2NhbCA+IDApIHtcbiAgICAgICAgICAgIGRldGFpbHMucHVzaChnbG9iYWxUcmFuc2xhdGUuc3RfUzNGaWxlc1BlbmRpbmdcbiAgICAgICAgICAgICAgICAucmVwbGFjZSgnJWNvdW50JScsIHN0YXRzLmZpbGVzX2xvY2FsLnRvTG9jYWxlU3RyaW5nKCkpXG4gICAgICAgICAgICAgICAgLnJlcGxhY2UoJyVzaXplJScsIHMzU3RvcmFnZUluZGV4LmZvcm1hdFNpemUoc3RhdHMudG90YWxfc2l6ZV9sb2NhbF9ieXRlcykpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENvbm5lY3Rpb24gc3RhdHVzXG4gICAgICAgIGlmIChzdGF0cy5zM19jb25uZWN0ZWQpIHtcbiAgICAgICAgICAgIGRldGFpbHMucHVzaChnbG9iYWxUcmFuc2xhdGUuc3RfUzNDb25uZWN0ZWQpO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YXRzLnMzX2VuYWJsZWQpIHtcbiAgICAgICAgICAgIGRldGFpbHMucHVzaChnbG9iYWxUcmFuc2xhdGUuc3RfUzNOb3RDb25uZWN0ZWQpO1xuICAgICAgICAgICAgbWVzc2FnZUNsYXNzID0gJ3dhcm5pbmcnO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTGFzdCB1cGxvYWRcbiAgICAgICAgaWYgKHN0YXRzLmxhc3RfdXBsb2FkX2F0KSB7XG4gICAgICAgICAgICBkZXRhaWxzLnB1c2goZ2xvYmFsVHJhbnNsYXRlLnN0X1MzTGFzdFVwbG9hZFxuICAgICAgICAgICAgICAgIC5yZXBsYWNlKCclZGF0ZSUnLCBzdGF0cy5sYXN0X3VwbG9hZF9hdCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIG1lc3NhZ2Ugc3R5bGluZ1xuICAgICAgICBzM1N0b3JhZ2VJbmRleC4kczNTdGF0c01lc3NhZ2VcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnaW5mbyBwb3NpdGl2ZSB3YXJuaW5nIG5lZ2F0aXZlJylcbiAgICAgICAgICAgIC5hZGRDbGFzcyhtZXNzYWdlQ2xhc3MpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBjb250ZW50XG4gICAgICAgIHMzU3RvcmFnZUluZGV4LiRzM1N0YXRzSGVhZGVyLnRleHQoaGVhZGVyVGV4dCk7XG4gICAgICAgIHMzU3RvcmFnZUluZGV4LiRzM1N0YXRzRGV0YWlscy5odG1sKGRldGFpbHMuam9pbignPGJyPicpKTtcblxuICAgICAgICAvLyBTaG93IGNvbnRhaW5lclxuICAgICAgICBzM1N0b3JhZ2VJbmRleC4kczNTdGF0c0NvbnRhaW5lci5zaG93KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZvcm1hdCBieXRlcyB0byBodW1hbi1yZWFkYWJsZSBzaXplXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGJ5dGVzIC0gU2l6ZSBpbiBieXRlc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEZvcm1hdHRlZCBzaXplIHN0cmluZ1xuICAgICAqL1xuICAgIGZvcm1hdFNpemUoYnl0ZXMpIHtcbiAgICAgICAgaWYgKGJ5dGVzID09PSAwKSByZXR1cm4gJzAgQic7XG4gICAgICAgIGNvbnN0IGsgPSAxMDI0O1xuICAgICAgICBjb25zdCBzaXplcyA9IFsnQicsICdLQicsICdNQicsICdHQicsICdUQiddO1xuICAgICAgICBjb25zdCBpID0gTWF0aC5mbG9vcihNYXRoLmxvZyhieXRlcykgLyBNYXRoLmxvZyhrKSk7XG4gICAgICAgIHJldHVybiBwYXJzZUZsb2F0KChieXRlcyAvIE1hdGgucG93KGssIGkpKS50b0ZpeGVkKDIpKSArICcgJyArIHNpemVzW2ldO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBTMyBsb2NhbCBkYXlzIHNsaWRlciB2YWx1ZSBjaGFuZ2VzXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHZhbHVlIC0gU2xpZGVyIHZhbHVlICgwLTYpXG4gICAgICovXG4gICAgY2JBZnRlclNlbGVjdFMzTG9jYWxEYXlzU2xpZGVyKHZhbHVlKSB7XG4gICAgICAgIC8vIEdldCB0aGUgbG9jYWwgcmV0ZW50aW9uIHBlcmlvZCBjb3JyZXNwb25kaW5nIHRvIHRoZSBzbGlkZXIgdmFsdWVcbiAgICAgICAgY29uc3QgbG9jYWxEYXlzID0gczNTdG9yYWdlSW5kZXguczNMb2NhbERheXNQZXJpb2RbdmFsdWVdO1xuXG4gICAgICAgIC8vIFNldCB0aGUgZm9ybSB2YWx1ZSBmb3IgJ1BCWFJlY29yZFMzTG9jYWxEYXlzJ1xuICAgICAgICBzM1N0b3JhZ2VJbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnUEJYUmVjb3JkUzNMb2NhbERheXMnLCBsb2NhbERheXMpO1xuXG4gICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50XG4gICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIFMzIGxvY2FsIHNsaWRlciBsaW1pdHMgYmFzZWQgb24gdG90YWwgcmV0ZW50aW9uIHBlcmlvZFxuICAgICAqIENhbGxlZCBieSBzdG9yYWdlLWluZGV4LmpzIHdoZW4gbWFpbiBzbGlkZXIgY2hhbmdlc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0b3RhbFBlcmlvZCAtIFRvdGFsIHJldGVudGlvbiBwZXJpb2QgaW4gZGF5cyAoJycgZm9yIGluZmluaXR5KVxuICAgICAqL1xuICAgIHVwZGF0ZVNsaWRlckxpbWl0cyh0b3RhbFBlcmlvZCkge1xuICAgICAgICAvLyBTdG9yZSBmb3IgcmVmZXJlbmNlXG4gICAgICAgIHMzU3RvcmFnZUluZGV4Lm1heExvY2FsUmV0ZW50aW9uRGF5cyA9IHRvdGFsUGVyaW9kO1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSBtYXggaW5kZXhcbiAgICAgICAgY29uc3QgbWF4SW5kZXggPSBzM1N0b3JhZ2VJbmRleC5nZXRNYXhMb2NhbFJldGVudGlvbkluZGV4KHRvdGFsUGVyaW9kKTtcblxuICAgICAgICAvLyBHZXQgY3VycmVudCB2YWx1ZSBiZWZvcmUgcmVpbml0aWFsaXppbmdcbiAgICAgICAgY29uc3QgY3VycmVudEluZGV4ID0gczNTdG9yYWdlSW5kZXguJHMzTG9jYWxEYXlzU2xpZGVyLnNsaWRlcignZ2V0IHZhbHVlJyk7XG5cbiAgICAgICAgLy8gQ2xhbXAgdmFsdWUgdG8gbmV3IG1heCBpZiBuZWVkZWRcbiAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBNYXRoLm1pbihjdXJyZW50SW5kZXgsIG1heEluZGV4KTtcblxuICAgICAgICAvLyBSZWluaXRpYWxpemUgc2xpZGVyIHdpdGggbmV3IG1heCAoZml4ZXMgdmlzdWFsIHBvc2l0aW9uaW5nIGlzc3VlKVxuICAgICAgICBzM1N0b3JhZ2VJbmRleC5pbml0aWFsaXplU2xpZGVyKG1heEluZGV4LCBuZXdWYWx1ZSk7XG5cbiAgICAgICAgLy8gVXBkYXRlIGZvcm0gdmFsdWUgaWYgaXQgY2hhbmdlZFxuICAgICAgICBpZiAoY3VycmVudEluZGV4ID4gbWF4SW5kZXgpIHtcbiAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdQQlhSZWNvcmRTM0xvY2FsRGF5cycsIHMzU3RvcmFnZUluZGV4LnMzTG9jYWxEYXlzUGVyaW9kW21heEluZGV4XSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IG1heGltdW0gYWxsb3dlZCBsb2NhbCByZXRlbnRpb24gaW5kZXggYmFzZWQgb24gdG90YWwgcmV0ZW50aW9uIHBlcmlvZFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0b3RhbFBlcmlvZCAtIFRvdGFsIHJldGVudGlvbiBwZXJpb2QgaW4gZGF5cyAoJycgZm9yIGluZmluaXR5KVxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IE1heGltdW0gaW5kZXggZm9yIHMzTG9jYWxEYXlzUGVyaW9kIGFycmF5XG4gICAgICovXG4gICAgZ2V0TWF4TG9jYWxSZXRlbnRpb25JbmRleCh0b3RhbFBlcmlvZCkge1xuICAgICAgICAvLyBJZiB0b3RhbCBwZXJpb2QgaXMgaW5maW5pdHkgKGVtcHR5LCBudWxsLCB1bmRlZmluZWQsIDAsIG9yICcwJyksIGFsbG93IGFsbCBsb2NhbCBvcHRpb25zXG4gICAgICAgIGlmICghdG90YWxQZXJpb2QgfHwgdG90YWxQZXJpb2QgPT09ICcnIHx8IHRvdGFsUGVyaW9kID09PSAnMCcgfHwgdG90YWxQZXJpb2QgPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBzM1N0b3JhZ2VJbmRleC5zM0xvY2FsRGF5c1BlcmlvZC5sZW5ndGggLSAxO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdG90YWxEYXlzID0gcGFyc2VJbnQodG90YWxQZXJpb2QpO1xuICAgICAgICBsZXQgbWF4SW5kZXggPSBzM1N0b3JhZ2VJbmRleC5zM0xvY2FsRGF5c1BlcmlvZC5sZW5ndGggLSAxO1xuXG4gICAgICAgIC8vIEZpbmQgdGhlIGhpZ2hlc3QgbG9jYWwgcmV0ZW50aW9uIHRoYXQgaXMgbGVzcyB0aGFuIHRvdGFsXG4gICAgICAgIGZvciAobGV0IGkgPSBzM1N0b3JhZ2VJbmRleC5zM0xvY2FsRGF5c1BlcmlvZC5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgY29uc3QgbG9jYWxEYXlzID0gcGFyc2VJbnQoczNTdG9yYWdlSW5kZXguczNMb2NhbERheXNQZXJpb2RbaV0pO1xuICAgICAgICAgICAgaWYgKGxvY2FsRGF5cyA8IHRvdGFsRGF5cykge1xuICAgICAgICAgICAgICAgIG1heEluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBtYXhJbmRleDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogV3JpdGUgcHJlc2V0LWRlcml2ZWQgZGVmYXVsdHMgaW50byB0aGUgZm9ybS4gUmVnaW9uIGlzIG9ubHkgZmlsbGVkXG4gICAgICogd2hlbiB0aGUgdXNlciBoYXMgbm90aGluZyB0eXBlZDsgcGF0aC1zdHlsZSBhbHdheXMgdHJhY2tzIHRoZSBwcmVzZXRcbiAgICAgKiBiZWNhdXNlIHRoYXQncyB0aGUgYWN0dWFsIGNyb3NzLXByb3ZpZGVyIGZpeCB0aGUgZHJvcGRvd24gZXhpc3RzIGZvci5cbiAgICAgKlxuICAgICAqIENhbGxlZCBmcm9tIHRoZSBkcm9wZG93bidzIHVzZXItZHJpdmVuIG9uQ2hhbmdlLiBsb2FkU2V0dGluZ3MoKSBkb2VzXG4gICAgICogTk9UIGNhbGwgdGhpcyDigJQgc2VydmVyIHZhbHVlcyB3aW4gb24gbG9hZC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcmVzZXRJZFxuICAgICAqL1xuICAgIGFwcGx5UHJlc2V0VG9Gb3JtKHByZXNldElkKSB7XG4gICAgICAgIGNvbnN0IHByZXNldCA9IHMzU3RvcmFnZUluZGV4LnByZXNldENhdGFsb2d1ZVtwcmVzZXRJZF07XG4gICAgICAgIGlmICghcHJlc2V0KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjdXJyZW50UmVnaW9uID0gczNTdG9yYWdlSW5kZXguJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3MzX3JlZ2lvbicpO1xuICAgICAgICBpZiAoIWN1cnJlbnRSZWdpb24pIHtcbiAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdzM19yZWdpb24nLCBwcmVzZXQucmVnaW9uX2RlZmF1bHQgfHwgJycpO1xuICAgICAgICB9XG5cbiAgICAgICAgczNTdG9yYWdlSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ3MzX3VzZV9wYXRoX3N0eWxlJywgcHJlc2V0LnVzZV9wYXRoX3N0eWxlID8gMSA6IDApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIHByZXNldC1kcml2ZW4gbm9uLWZvcm0gVUk6IGVuZHBvaW50IHBsYWNlaG9sZGVyLCBoaW50XG4gICAgICogYmFubmVyLCBkb2NzIGxpbmsuIFNhZmUgdG8gY2FsbCBkdXJpbmcgaW5pdGlhbCBsb2FkIOKAlCBkb2VzIG5vdCB3cml0ZVxuICAgICAqIGZvcm0gdmFsdWVzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHByZXNldElkXG4gICAgICovXG4gICAgdXBkYXRlUHJlc2V0VUkocHJlc2V0SWQpIHtcbiAgICAgICAgY29uc3QgcHJlc2V0ID0gczNTdG9yYWdlSW5kZXgucHJlc2V0Q2F0YWxvZ3VlW3ByZXNldElkXTtcbiAgICAgICAgaWYgKCFwcmVzZXQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHMzU3RvcmFnZUluZGV4LiRzM0VuZHBvaW50SW5wdXQuYXR0cigncGxhY2Vob2xkZXInLCBwcmVzZXQuZW5kcG9pbnRfcGxhY2Vob2xkZXIgfHwgJycpO1xuXG4gICAgICAgIGNvbnN0IGhpbnRUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlW3ByZXNldC5oaW50X2tleV0gfHwgJyc7XG4gICAgICAgIGlmIChoaW50VGV4dCkge1xuICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguJHByZXNldEhpbnQuZmluZCgnLmhpbnQtdGV4dCcpLnRleHQoaGludFRleHQpO1xuICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguJHByZXNldEhpbnQuc2hvdygpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguJHByZXNldEhpbnQuaGlkZSgpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHByZXNldC5kb2NzX3BhdGgpIHtcbiAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LiRwcmVzZXREb2NzTGlua1xuICAgICAgICAgICAgICAgIC5hdHRyKCdocmVmJywgczNTdG9yYWdlSW5kZXguZG9jc0Jhc2VVcmwgKyBwcmVzZXQuZG9jc19wYXRoKVxuICAgICAgICAgICAgICAgIC5zaG93KCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC4kcHJlc2V0RG9jc0xpbmsuaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhY2hlIHRoZSBwcmVzZXQgY2F0YWxvZ3VlIGZyb20gdGhlIEFQSSByZXNwb25zZSBzbyBhcHBseVByZXNldERlZmF1bHRzXG4gICAgICogY2FuIGxvb2sgdXAgbWV0YWRhdGEgd2l0aG91dCBhbm90aGVyIHJvdW5kLXRyaXAuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0FycmF5PE9iamVjdD59IHByZXNldHMgLSBhdmFpbGFibGVfcHJlc2V0cyBhcnJheSBmcm9tIC9zMy1zdG9yYWdlIEdFVFxuICAgICAqL1xuICAgIGNhY2hlUHJlc2V0Q2F0YWxvZ3VlKHByZXNldHMpIHtcbiAgICAgICAgczNTdG9yYWdlSW5kZXgucHJlc2V0Q2F0YWxvZ3VlID0ge307XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShwcmVzZXRzKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHByZXNldHMuZm9yRWFjaCgocHJlc2V0KSA9PiB7XG4gICAgICAgICAgICBpZiAocHJlc2V0ICYmIHByZXNldC5pZCkge1xuICAgICAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LnByZXNldENhdGFsb2d1ZVtwcmVzZXQuaWRdID0gcHJlc2V0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVGVzdCBTMyBjb25uZWN0aW9uIHdpdGggY3VycmVudCBmb3JtIHZhbHVlc1xuICAgICAqL1xuICAgIHRlc3RTM0Nvbm5lY3Rpb24oKSB7XG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICBzM1N0b3JhZ2VJbmRleC4kdGVzdFMzQnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cbiAgICAgICAgLy8gR2V0IGZvcm0gdmFsdWVzXG4gICAgICAgIGNvbnN0IHRlc3REYXRhID0ge1xuICAgICAgICAgICAgczNfZW5kcG9pbnQ6IHMzU3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdzM19lbmRwb2ludCcpLFxuICAgICAgICAgICAgczNfcmVnaW9uOiBzM1N0b3JhZ2VJbmRleC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnczNfcmVnaW9uJyksXG4gICAgICAgICAgICBzM19idWNrZXQ6IHMzU3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdzM19idWNrZXQnKSxcbiAgICAgICAgICAgIHMzX2FjY2Vzc19rZXk6IHMzU3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdzM19hY2Nlc3Nfa2V5JyksXG4gICAgICAgICAgICBzM19zZWNyZXRfa2V5OiBzM1N0b3JhZ2VJbmRleC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnczNfc2VjcmV0X2tleScpLFxuICAgICAgICAgICAgczNfcHJvdmlkZXJfcHJlc2V0OiBzM1N0b3JhZ2VJbmRleC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnczNfcHJvdmlkZXJfcHJlc2V0JyksXG4gICAgICAgICAgICBzM191c2VfcGF0aF9zdHlsZTogczNTdG9yYWdlSW5kZXguJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3MzX3VzZV9wYXRoX3N0eWxlJylcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBDYWxsIEFQSSB0byB0ZXN0IGNvbm5lY3Rpb25cbiAgICAgICAgUzNTdG9yYWdlQVBJLnRlc3RDb25uZWN0aW9uKHRlc3REYXRhLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIHN0YXRlXG4gICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC4kdGVzdFMzQnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gcmVzcG9uc2UuZGF0YT8ubWVzc2FnZSB8fCBnbG9iYWxUcmFuc2xhdGUuc3RfUzNUZXN0U3VjY2VzcztcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93SW5mb3JtYXRpb24obWVzc2FnZSwgZ2xvYmFsVHJhbnNsYXRlLnN0X1MzVGVzdENvbm5lY3Rpb25IZWFkZXIpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRmFpbHVyZSBwYXRoIOKAlCBzdXJmYWNlIHRoZSBhY3Rpb25hYmxlIGRpYWdub3N0aWMgY2hhaW4gd2hlblxuICAgICAgICAgICAgLy8gYXZhaWxhYmxlOiBoaW50ID4gdW5kZXJseWluZyBTREsgbWVzc2FnZSA+IGdlbmVyaWMgZmFsbGJhY2suXG4gICAgICAgICAgICBjb25zdCBkYXRhID0gcmVzcG9uc2U/LmRhdGEgfHwge307XG4gICAgICAgICAgICBjb25zdCBsaW5lcyA9IFtdO1xuICAgICAgICAgICAgaWYgKGRhdGEubWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIGxpbmVzLnB1c2goZGF0YS5tZXNzYWdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkYXRhLmF3c19lcnJvcl9jb2RlKSB7XG4gICAgICAgICAgICAgICAgbGluZXMucHVzaCgoZ2xvYmFsVHJhbnNsYXRlLnN0X1MzRXJyb3JDb2RlUHJlZml4IHx8ICdBV1MgZXJyb3InKSArICc6ICcgKyBkYXRhLmF3c19lcnJvcl9jb2RlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkYXRhLmVycm9yX2NsYXNzKSB7XG4gICAgICAgICAgICAgICAgbGluZXMucHVzaCgoZ2xvYmFsVHJhbnNsYXRlLnN0X1MzRXJyb3JUeXBlUHJlZml4IHx8ICdUeXBlJykgKyAnOiAnICsgZGF0YS5lcnJvcl9jbGFzcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZGF0YS5oaW50KSB7XG4gICAgICAgICAgICAgICAgbGluZXMucHVzaChkYXRhLmhpbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gbGluZXMubGVuZ3RoID4gMFxuICAgICAgICAgICAgICAgID8gbGluZXMuam9pbignXFxuJylcbiAgICAgICAgICAgICAgICA6IGdsb2JhbFRyYW5zbGF0ZS5zdF9TM1Rlc3RGYWlsZWQ7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZXJyb3JNZXNzYWdlLCBnbG9iYWxUcmFuc2xhdGUuc3RfUzNUZXN0Q29ubmVjdGlvbkhlYWRlcik7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIFMzIHNldHRpbmdzIGZyb20gQVBJXG4gICAgICovXG4gICAgbG9hZFNldHRpbmdzKCkge1xuICAgICAgICBTM1N0b3JhZ2VBUEkuZ2V0KChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XG5cbiAgICAgICAgICAgICAgICAvLyBDYWNoZSBwcmVzZXQgY2F0YWxvZ3VlIGZpcnN0IHNvIHRoZSBkcm9wZG93biBjaGFuZ2UgaGFuZGxlclxuICAgICAgICAgICAgICAgIC8vIGNhbiByZXNvbHZlIHRoZSBjaG9zZW4gcHJlc2V0IGFnYWluc3QgaXQuXG4gICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguY2FjaGVQcmVzZXRDYXRhbG9ndWUoZGF0YS5hdmFpbGFibGVfcHJlc2V0cyB8fCBbXSk7XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgY2hlY2tib3ggc3RhdGVcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5zM19lbmFibGVkID09PSAnMScgfHwgZGF0YS5zM19lbmFibGVkID09PSAxIHx8IGRhdGEuczNfZW5hYmxlZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC4kczNFbmFibGVkQ2hlY2tib3guY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguJHMzRW5hYmxlZENoZWNrYm94LmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU2V0IHRleHQgZmllbGRzXG4gICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ3MzX2VuZHBvaW50JywgZGF0YS5zM19lbmRwb2ludCB8fCAnJyk7XG4gICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ3MzX3JlZ2lvbicsIGRhdGEuczNfcmVnaW9uIHx8ICcnKTtcbiAgICAgICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnczNfYnVja2V0JywgZGF0YS5zM19idWNrZXQgfHwgJycpO1xuICAgICAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdzM19hY2Nlc3Nfa2V5JywgZGF0YS5zM19hY2Nlc3Nfa2V5IHx8ICcnKTtcbiAgICAgICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnczNfc2VjcmV0X2tleScsIGRhdGEuczNfc2VjcmV0X2tleSB8fCAnJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgcHJlc2V0IGRyb3Bkb3duIHdpdGhvdXQgZmlyaW5nIHRoZSBvbkNoYW5nZSBoYW5kbGVyIOKAlFxuICAgICAgICAgICAgICAgIC8vIHNlcnZlciB2YWx1ZXMgYXJlIGF1dGhvcml0YXRpdmUgb24gbG9hZC4gVGhlbiByZWZyZXNoIHRoZVxuICAgICAgICAgICAgICAgIC8vIHByZXNldC1kcml2ZW4gVUkgYml0cyAocGxhY2Vob2xkZXIsIGhpbnQsIGRvY3MgbGluaykuXG4gICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguaXNMb2FkaW5nRnJvbVNlcnZlciA9IHRydWU7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJlc2V0SWQgPSBkYXRhLnMzX3Byb3ZpZGVyX3ByZXNldCB8fCBzM1N0b3JhZ2VJbmRleC5ERUZBVUxUX1BSRVNFVF9JRDtcbiAgICAgICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguJHByZXNldERyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBwcmVzZXRJZCk7XG4gICAgICAgICAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdzM191c2VfcGF0aF9zdHlsZScsIGRhdGEuczNfdXNlX3BhdGhfc3R5bGUgPyAxIDogMCk7XG4gICAgICAgICAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LnVwZGF0ZVByZXNldFVJKHByZXNldElkKTtcbiAgICAgICAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC5pc0xvYWRpbmdGcm9tU2VydmVyID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU2V0IFMzIGxvY2FsIHJldGVudGlvbiBzbGlkZXJcbiAgICAgICAgICAgICAgICBjb25zdCBsb2NhbERheXMgPSBTdHJpbmcoZGF0YS5QQlhSZWNvcmRTM0xvY2FsRGF5cyk7XG4gICAgICAgICAgICAgICAgbGV0IGxvY2FsSW5kZXggPSBzM1N0b3JhZ2VJbmRleC5zM0xvY2FsRGF5c1BlcmlvZC5pbmRleE9mKGxvY2FsRGF5cyk7XG5cbiAgICAgICAgICAgICAgICAvLyBGYWxsYmFjayBmb3IgbGVnYWN5IHZhbHVlcyBub3QgaW4gbmV3IGFycmF5IC0gZmluZCBjbG9zZXN0IHZhbGlkIHZhbHVlXG4gICAgICAgICAgICAgICAgaWYgKGxvY2FsSW5kZXggPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxvY2FsRGF5c051bSA9IHBhcnNlSW50KGxvY2FsRGF5cykgfHwgNztcbiAgICAgICAgICAgICAgICAgICAgLy8gRmluZCB0aGUgc21hbGxlc3QgdmFsdWUgPj0gbG9jYWxEYXlzTnVtLCBvciB1c2UgZmlyc3QgaWYgYWxsIGFyZSBsYXJnZXJcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxJbmRleCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgczNTdG9yYWdlSW5kZXguczNMb2NhbERheXNQZXJpb2QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwYXJzZUludChzM1N0b3JhZ2VJbmRleC5zM0xvY2FsRGF5c1BlcmlvZFtpXSkgPj0gbG9jYWxEYXlzTnVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9jYWxJbmRleCA9IGk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBsb2NhbEluZGV4ID0gaTsgLy8gVXNlIGxhc3QgaWYgbm9uZSBmb3VuZFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguJHMzTG9jYWxEYXlzU2xpZGVyLnNsaWRlcignc2V0IHZhbHVlJywgbG9jYWxJbmRleCk7XG4gICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1BCWFJlY29yZFMzTG9jYWxEYXlzJywgczNTdG9yYWdlSW5kZXguczNMb2NhbERheXNQZXJpb2RbbG9jYWxJbmRleF0pO1xuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHZpc2liaWxpdHlcbiAgICAgICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC50b2dnbGVTM1NldHRpbmdzVmlzaWJpbGl0eSgpO1xuXG4gICAgICAgICAgICAgICAgLy8gTG9hZCBTMyBzdGF0cyBpZiBlbmFibGVkXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuczNfZW5hYmxlZCA9PT0gJzEnIHx8IGRhdGEuczNfZW5hYmxlZCA9PT0gMSB8fCBkYXRhLnMzX2VuYWJsZWQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXgubG9hZFMzU3RhdHMoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gRm9ybSBzZXR0aW5nc1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFVwZGF0ZWQgc2V0dGluZ3NcbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IHMzU3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBoYXMgYmVlbiBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gU2VydmVyIHJlc3BvbnNlXG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5zdWNjZXNzKSB7XG4gICAgICAgICAgICAvLyBSZWxvYWQgc2V0dGluZ3MgdG8gc2hvdyB1cGRhdGVkIHZhbHVlc1xuICAgICAgICAgICAgczNTdG9yYWdlSW5kZXgubG9hZFNldHRpbmdzKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gczNTdG9yYWdlSW5kZXguJGZvcm1PYmo7XG4gICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbiA9IHMzU3RvcmFnZUluZGV4LiRzdWJtaXRCdXR0b247XG4gICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0ID0gczNTdG9yYWdlSW5kZXguJGRyb3Bkb3duU3VibWl0O1xuICAgICAgICBGb3JtLiRkaXJydHlGaWVsZCA9IHMzU3RvcmFnZUluZGV4LiRkaXJydHlGaWVsZDtcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gczNTdG9yYWdlSW5kZXgudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gczNTdG9yYWdlSW5kZXguY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBzM1N0b3JhZ2VJbmRleC5jYkFmdGVyU2VuZEZvcm07XG5cbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIHNldHRpbmdzIGZvciBGb3JtLmpzIChzaW5nbGV0b24gcmVzb3VyY2UpXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgYXBpT2JqZWN0OiBTM1N0b3JhZ2VBUEksXG4gICAgICAgICAgICBzYXZlTWV0aG9kOiAncGF0Y2gnIC8vIFVzaW5nIFBBVENIIGZvciBwYXJ0aWFsIHVwZGF0ZXNcbiAgICAgICAgfTtcblxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9XG59O1xuXG4vLyBJbml0aWFsaXplIHdoZW4gZG9jdW1lbnQgaXMgcmVhZHlcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBzM1N0b3JhZ2VJbmRleC5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==