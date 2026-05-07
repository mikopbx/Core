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

/* global globalRootUrl, globalTranslate, Form, S3StorageAPI, UserMessage, storageIndex, $ */

/**
 * S3 Storage management module
 * Handles S3 cloud storage settings (Tab 3)
 * Sends data to: PATCH /pbxcore/api/v3/s3-storage
 */
var s3StorageIndex = {
  /**
   * jQuery object for the S3 storage form.
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
   * jQuery object for the S3 local retention period slider.
   * @type {jQuery}
   */
  $s3LocalDaysSlider: null,

  /**
   * jQuery object for S3 enabled checkbox.
   * @type {jQuery}
   */
  $s3EnabledCheckbox: null,

  /**
   * jQuery object for S3 settings group container.
   * @type {jQuery}
   */
  $s3SettingsGroup: null,

  /**
   * jQuery object for test S3 connection button.
   * @type {jQuery}
   */
  $testS3Button: null,

  /**
   * jQuery object for S3 stats container.
   * @type {jQuery}
   */
  $s3StatsContainer: null,

  /**
   * jQuery object for S3 stats message element.
   * @type {jQuery}
   */
  $s3StatsMessage: null,

  /**
   * jQuery object for S3 stats header.
   * @type {jQuery}
   */
  $s3StatsHeader: null,

  /**
   * jQuery object for S3 stats details.
   * @type {jQuery}
   */
  $s3StatsDetails: null,

  /**
   * jQuery object for the provider preset dropdown.
   * @type {jQuery}
   */
  $presetDropdown: null,

  /**
   * jQuery object for the endpoint input (cached for placeholder updates).
   * @type {jQuery}
   */
  $s3EndpointInput: null,

  /**
   * Provider presets received from /s3-storage GET response.
   * Indexed by preset id for O(1) lookup.
   * @type {Object<string, Object>}
   */
  presetCatalogue: {},

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
    s3StorageIndex.$formObj = $('#s3-storage-form');
    s3StorageIndex.$submitButton = $('#submitbutton-s3');
    s3StorageIndex.$dropdownSubmit = $('#dropdownSubmit-s3');
    s3StorageIndex.$dirrtyField = $('#dirrty-s3');
    s3StorageIndex.$s3LocalDaysSlider = $('#PBXRecordS3LocalDaysSlider');
    s3StorageIndex.$s3EnabledCheckbox = $('#s3-enabled-checkbox');
    s3StorageIndex.$s3SettingsGroup = $('#s3-settings-group');
    s3StorageIndex.$testS3Button = $('#test-s3-connection');
    s3StorageIndex.$s3StatsContainer = $('#s3-stats-container');
    s3StorageIndex.$s3StatsMessage = $('#s3-stats-message');
    s3StorageIndex.$s3StatsHeader = $('#s3-stats-header');
    s3StorageIndex.$s3StatsDetails = $('#s3-stats-details');
    s3StorageIndex.$presetDropdown = $('#s3-provider-preset-dropdown');
    s3StorageIndex.$s3EndpointInput = $('#s3-storage-form input[name="s3_endpoint"]'); // Initialize S3 local retention period slider with default max (all options available)

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
   * Update the preset-driven non-form UI: endpoint placeholder and the
   * preset-specific note that gets folded into the s3_endpoint field
   * tooltip (no standalone hint banner — uses the existing tooltip
   * mechanism in storage-index.js so all per-field hints live in one
   * place). Safe to call during initial load — does not write form
   * values.
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

    if (typeof storageIndex !== 'undefined' && typeof storageIndex.setS3EndpointPresetNote === 'function') {
      storageIndex.setS3EndpointPresetNote(hintText);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TdG9yYWdlL3MzLXN0b3JhZ2UtaW5kZXguanMiXSwibmFtZXMiOlsiczNTdG9yYWdlSW5kZXgiLCIkZm9ybU9iaiIsIiRzdWJtaXRCdXR0b24iLCIkZHJvcGRvd25TdWJtaXQiLCIkZGlycnR5RmllbGQiLCIkczNMb2NhbERheXNTbGlkZXIiLCIkczNFbmFibGVkQ2hlY2tib3giLCIkczNTZXR0aW5nc0dyb3VwIiwiJHRlc3RTM0J1dHRvbiIsIiRzM1N0YXRzQ29udGFpbmVyIiwiJHMzU3RhdHNNZXNzYWdlIiwiJHMzU3RhdHNIZWFkZXIiLCIkczNTdGF0c0RldGFpbHMiLCIkcHJlc2V0RHJvcGRvd24iLCIkczNFbmRwb2ludElucHV0IiwicHJlc2V0Q2F0YWxvZ3VlIiwiREVGQVVMVF9QUkVTRVRfSUQiLCJpc0xvYWRpbmdGcm9tU2VydmVyIiwiczNMb2NhbERheXNQZXJpb2QiLCJtYXhMb2NhbFJldGVudGlvbkRheXMiLCJ2YWxpZGF0ZVJ1bGVzIiwiczNfZW5kcG9pbnQiLCJpZGVudGlmaWVyIiwib3B0aW9uYWwiLCJkZXBlbmRzIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwic3RfUzNFbmRwb2ludEludmFsaWQiLCJzM19idWNrZXQiLCJ2YWx1ZSIsInN0X1MzQnVja2V0SW52YWxpZCIsImluaXRpYWxpemVTbGlkZXIiLCJtYXhJbmRleCIsImluaXRpYWxWYWx1ZSIsImhhc0NsYXNzIiwic2xpZGVyIiwibWluIiwibWF4Iiwic3RlcCIsInNtb290aCIsImF1dG9BZGp1c3RMYWJlbHMiLCJpbnRlcnByZXRMYWJlbCIsImxhYmVscyIsInN0X0RheXMiLCJzdF8xTW9udGgiLCJzdF8zTW9udGhzIiwic3RfNk1vbnRocyIsInN0XzFZZWFyIiwib25DaGFuZ2UiLCJjYkFmdGVyU2VsZWN0UzNMb2NhbERheXNTbGlkZXIiLCJ1bmRlZmluZWQiLCJpbml0aWFsaXplIiwiJCIsImRlZmF1bHRNYXhJbmRleCIsImxlbmd0aCIsImNoZWNrYm94IiwidG9nZ2xlUzNTZXR0aW5nc1Zpc2liaWxpdHkiLCJkcm9wZG93biIsImFwcGx5UHJlc2V0VG9Gb3JtIiwidXBkYXRlUHJlc2V0VUkiLCJGb3JtIiwiZGF0YUNoYW5nZWQiLCJvbiIsInRlc3RTM0Nvbm5lY3Rpb24iLCJpbml0aWFsaXplRm9ybSIsImxvYWRTZXR0aW5ncyIsInNob3ciLCJsb2FkUzNTdGF0cyIsImhpZGUiLCJTM1N0b3JhZ2VBUEkiLCJnZXRTdGF0cyIsInJlc3BvbnNlIiwicmVzdWx0IiwiZGF0YSIsImRpc3BsYXlTM1N0YXRzIiwic3RhdHMiLCJzM19lbmFibGVkIiwiaGVhZGVyVGV4dCIsIm1lc3NhZ2VDbGFzcyIsInN5bmNfc3RhdHVzIiwic3RfUzNTdGF0dXNTeW5jZWQiLCJzdF9TM1N0YXR1c1VwbG9hZGluZyIsInN0X1MzU3RhdHVzU3luY2luZyIsInJlcGxhY2UiLCJzeW5jX3BlcmNlbnRhZ2UiLCJzdF9TM1N0YXR1c1BlbmRpbmciLCJzdF9TM1N0YXR1c0VtcHR5Iiwic3RfUzNTdGF0dXNEaXNhYmxlZCIsImRldGFpbHMiLCJmaWxlc19pbl9zMyIsInB1c2giLCJzdF9TM0ZpbGVzSW5DbG91ZCIsInRvTG9jYWxlU3RyaW5nIiwiZm9ybWF0U2l6ZSIsInRvdGFsX3NpemVfczNfYnl0ZXMiLCJmaWxlc19sb2NhbCIsInN0X1MzRmlsZXNQZW5kaW5nIiwidG90YWxfc2l6ZV9sb2NhbF9ieXRlcyIsInMzX2Nvbm5lY3RlZCIsInN0X1MzQ29ubmVjdGVkIiwic3RfUzNOb3RDb25uZWN0ZWQiLCJsYXN0X3VwbG9hZF9hdCIsInN0X1MzTGFzdFVwbG9hZCIsInJlbW92ZUNsYXNzIiwiYWRkQ2xhc3MiLCJ0ZXh0IiwiaHRtbCIsImpvaW4iLCJieXRlcyIsImsiLCJzaXplcyIsImkiLCJNYXRoIiwiZmxvb3IiLCJsb2ciLCJwYXJzZUZsb2F0IiwicG93IiwidG9GaXhlZCIsImxvY2FsRGF5cyIsImZvcm0iLCJ1cGRhdGVTbGlkZXJMaW1pdHMiLCJ0b3RhbFBlcmlvZCIsImdldE1heExvY2FsUmV0ZW50aW9uSW5kZXgiLCJjdXJyZW50SW5kZXgiLCJuZXdWYWx1ZSIsInRvdGFsRGF5cyIsInBhcnNlSW50IiwicHJlc2V0SWQiLCJwcmVzZXQiLCJjdXJyZW50UmVnaW9uIiwicmVnaW9uX2RlZmF1bHQiLCJ1c2VfcGF0aF9zdHlsZSIsImF0dHIiLCJlbmRwb2ludF9wbGFjZWhvbGRlciIsImhpbnRUZXh0IiwiaGludF9rZXkiLCJzdG9yYWdlSW5kZXgiLCJzZXRTM0VuZHBvaW50UHJlc2V0Tm90ZSIsImNhY2hlUHJlc2V0Q2F0YWxvZ3VlIiwicHJlc2V0cyIsIkFycmF5IiwiaXNBcnJheSIsImZvckVhY2giLCJpZCIsInRlc3REYXRhIiwiczNfcmVnaW9uIiwiczNfYWNjZXNzX2tleSIsInMzX3NlY3JldF9rZXkiLCJzM19wcm92aWRlcl9wcmVzZXQiLCJzM191c2VfcGF0aF9zdHlsZSIsInRlc3RDb25uZWN0aW9uIiwibWVzc2FnZSIsInN0X1MzVGVzdFN1Y2Nlc3MiLCJVc2VyTWVzc2FnZSIsInNob3dJbmZvcm1hdGlvbiIsInN0X1MzVGVzdENvbm5lY3Rpb25IZWFkZXIiLCJsaW5lcyIsImF3c19lcnJvcl9jb2RlIiwic3RfUzNFcnJvckNvZGVQcmVmaXgiLCJlcnJvcl9jbGFzcyIsInN0X1MzRXJyb3JUeXBlUHJlZml4IiwiaGludCIsImVycm9yTWVzc2FnZSIsInN0X1MzVGVzdEZhaWxlZCIsInNob3dFcnJvciIsImdldCIsImF2YWlsYWJsZV9wcmVzZXRzIiwiU3RyaW5nIiwiUEJYUmVjb3JkUzNMb2NhbERheXMiLCJsb2NhbEluZGV4IiwiaW5kZXhPZiIsImxvY2FsRGF5c051bSIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsImNiQWZ0ZXJTZW5kRm9ybSIsInN1Y2Nlc3MiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtB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Q21FLFlBQWY7QUFDSCxLQUhELE1BR087QUFDSEwsTUFBQUEsSUFBSSxDQUFDNUQsYUFBTCxDQUFtQnVHLFdBQW5CLENBQStCLFVBQS9CO0FBQ0g7QUFDSixHQXJvQmtCOztBQXVvQm5CO0FBQ0o7QUFDQTtBQUNJdkMsRUFBQUEsY0Exb0JtQiw0QkEwb0JGO0FBQ2JKLElBQUFBLElBQUksQ0FBQzdELFFBQUwsR0FBZ0JELGNBQWMsQ0FBQ0MsUUFBL0I7QUFDQTZELElBQUFBLElBQUksQ0FBQzVELGFBQUwsR0FBcUJGLGNBQWMsQ0FBQ0UsYUFBcEM7QUFDQTRELElBQUFBLElBQUksQ0FBQzNELGVBQUwsR0FBdUJILGNBQWMsQ0FBQ0csZUFBdEM7QUFDQTJELElBQUFBLElBQUksQ0FBQzFELFlBQUwsR0FBb0JKLGNBQWMsQ0FBQ0ksWUFBbkM7QUFDQTBELElBQUFBLElBQUksQ0FBQzFDLGFBQUwsR0FBcUJwQixjQUFjLENBQUNvQixhQUFwQztBQUNBMEMsSUFBQUEsSUFBSSxDQUFDZ0gsZ0JBQUwsR0FBd0I5SyxjQUFjLENBQUM4SyxnQkFBdkM7QUFDQWhILElBQUFBLElBQUksQ0FBQ2tILGVBQUwsR0FBdUJoTCxjQUFjLENBQUNnTCxlQUF0QyxDQVBhLENBU2I7O0FBQ0FsSCxJQUFBQSxJQUFJLENBQUNvSCxXQUFMLEdBQW1CO0FBQ2ZDLE1BQUFBLE9BQU8sRUFBRSxJQURNO0FBRWZDLE1BQUFBLFNBQVMsRUFBRTdHLFlBRkk7QUFHZjhHLE1BQUFBLFVBQVUsRUFBRSxPQUhHLENBR0s7O0FBSEwsS0FBbkI7QUFNQXZILElBQUFBLElBQUksQ0FBQ1QsVUFBTDtBQUNIO0FBM3BCa0IsQ0FBdkIsQyxDQThwQkE7O0FBQ0FDLENBQUMsQ0FBQ2dJLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJ2TCxFQUFBQSxjQUFjLENBQUNxRCxVQUFmO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFMzU3RvcmFnZUFQSSwgVXNlck1lc3NhZ2UsIHN0b3JhZ2VJbmRleCwgJCAqL1xuXG4vKipcbiAqIFMzIFN0b3JhZ2UgbWFuYWdlbWVudCBtb2R1bGVcbiAqIEhhbmRsZXMgUzMgY2xvdWQgc3RvcmFnZSBzZXR0aW5ncyAoVGFiIDMpXG4gKiBTZW5kcyBkYXRhIHRvOiBQQVRDSCAvcGJ4Y29yZS9hcGkvdjMvczMtc3RvcmFnZVxuICovXG5jb25zdCBzM1N0b3JhZ2VJbmRleCA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgUzMgc3RvcmFnZSBmb3JtLlxuICAgICAqIFJlc29sdmVkIGluIGluaXRpYWxpemUoKSDigJQgbXVzdCBub3QgY2FsbCAkKCkgYXQgbW9kdWxlLWxvYWQgdGltZS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHN1Ym1pdCBidXR0b24gKHVuaXF1ZSB0byB0aGlzIGZvcm0pLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHN1Ym1pdEJ1dHRvbjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBkcm9wZG93biBzdWJtaXQgKHVuaXF1ZSB0byB0aGlzIGZvcm0pLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRyb3Bkb3duU3VibWl0OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGRpcnR5IGZpZWxkICh1bmlxdWUgdG8gdGhpcyBmb3JtKS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkaXJydHlGaWVsZDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBTMyBsb2NhbCByZXRlbnRpb24gcGVyaW9kIHNsaWRlci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzM0xvY2FsRGF5c1NsaWRlcjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIFMzIGVuYWJsZWQgY2hlY2tib3guXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkczNFbmFibGVkQ2hlY2tib3g6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciBTMyBzZXR0aW5ncyBncm91cCBjb250YWluZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkczNTZXR0aW5nc0dyb3VwOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGVzdCBTMyBjb25uZWN0aW9uIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR0ZXN0UzNCdXR0b246IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciBTMyBzdGF0cyBjb250YWluZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkczNTdGF0c0NvbnRhaW5lcjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIFMzIHN0YXRzIG1lc3NhZ2UgZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzM1N0YXRzTWVzc2FnZTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIFMzIHN0YXRzIGhlYWRlci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzM1N0YXRzSGVhZGVyOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgUzMgc3RhdHMgZGV0YWlscy5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzM1N0YXRzRGV0YWlsczogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBwcm92aWRlciBwcmVzZXQgZHJvcGRvd24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkcHJlc2V0RHJvcGRvd246IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZW5kcG9pbnQgaW5wdXQgKGNhY2hlZCBmb3IgcGxhY2Vob2xkZXIgdXBkYXRlcykuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkczNFbmRwb2ludElucHV0OiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogUHJvdmlkZXIgcHJlc2V0cyByZWNlaXZlZCBmcm9tIC9zMy1zdG9yYWdlIEdFVCByZXNwb25zZS5cbiAgICAgKiBJbmRleGVkIGJ5IHByZXNldCBpZCBmb3IgTygxKSBsb29rdXAuXG4gICAgICogQHR5cGUge09iamVjdDxzdHJpbmcsIE9iamVjdD59XG4gICAgICovXG4gICAgcHJlc2V0Q2F0YWxvZ3VlOiB7fSxcblxuICAgIC8qKlxuICAgICAqIERlZmF1bHQgcHJlc2V0IGlkIHVzZWQgd2hlbiB0aGUgc2VydmVyIGhhcyBubyB2YWx1ZSB5ZXQuXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBERUZBVUxUX1BSRVNFVF9JRDogJ2N1c3RvbScsXG5cbiAgICAvKipcbiAgICAgKiBTdXBwcmVzc2VzIHRoZSBkcm9wZG93biBvbkNoYW5nZSBoYW5kbGVyIHdoaWxlIGxvYWRTZXR0aW5ncygpXG4gICAgICogc3luY2hyb25pc2VzIHRoZSBmb3JtIHdpdGggc2VydmVyIGRhdGEuIFdpdGhvdXQgdGhpcywgc2V0dGluZyB0aGVcbiAgICAgKiBkcm9wZG93bidzIHZhbHVlIGR1cmluZyBsb2FkIHdvdWxkIHJlLWFwcGx5IHByZXNldCBkZWZhdWx0cyBhbmRcbiAgICAgKiBjbG9iYmVyIHRoZSBmcmVzaGx5LWxvYWRlZCB1c2VfcGF0aF9zdHlsZSBmbGFnLlxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGlzTG9hZGluZ0Zyb21TZXJ2ZXI6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogUG9zc2libGUgcGVyaW9kIHZhbHVlcyBmb3IgUzMgbG9jYWwgcmV0ZW50aW9uIChpbiBkYXlzKS5cbiAgICAgKiBWYWx1ZXM6IDcsIDMwLCA5MCwgMTgwLCAzNjUgZGF5cyAoMSB3ZWVrLCAxLzMvNiBtb250aHMsIDEgeWVhcilcbiAgICAgKi9cbiAgICBzM0xvY2FsRGF5c1BlcmlvZDogWyc3JywgJzMwJywgJzkwJywgJzE4MCcsICczNjUnXSxcblxuICAgIC8qKlxuICAgICAqIE1heGltdW0gYWxsb3dlZCBsb2NhbCByZXRlbnRpb24gcGVyaW9kIGZyb20gbWFpbiBzdG9yYWdlIHNsaWRlclxuICAgICAqIFVwZGF0ZWQgYnkgc3RvcmFnZS1pbmRleC5qcyB3aGVuIG1haW4gc2xpZGVyIGNoYW5nZXNcbiAgICAgKi9cbiAgICBtYXhMb2NhbFJldGVudGlvbkRheXM6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgUzMgZm9ybSBmaWVsZHMuXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIHMzX2VuZHBvaW50OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnczNfZW5kcG9pbnQnLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBkZXBlbmRzOiAnczNfZW5hYmxlZCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3VybCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnN0X1MzRW5kcG9pbnRJbnZhbGlkXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgczNfYnVja2V0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnczNfYnVja2V0JyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgZGVwZW5kczogJ3MzX2VuYWJsZWQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogL15bYS16MC05XVthLXowLTkuLV17MSw2MX1bYS16MC05XSQvLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5zdF9TM0J1Y2tldEludmFsaWRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIG9yIHJlaW5pdGlhbGl6ZSB0aGUgUzMgbG9jYWwgcmV0ZW50aW9uIHNsaWRlclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBtYXhJbmRleCAtIE1heGltdW0gc2xpZGVyIGluZGV4ICgwLTYpXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFtpbml0aWFsVmFsdWVdIC0gT3B0aW9uYWwgaW5pdGlhbCB2YWx1ZSB0byBzZXRcbiAgICAgKi9cbiAgICBpbml0aWFsaXplU2xpZGVyKG1heEluZGV4LCBpbml0aWFsVmFsdWUpIHtcbiAgICAgICAgLy8gRGVzdHJveSBleGlzdGluZyBzbGlkZXIgaWYgaXQgZXhpc3RzXG4gICAgICAgIGlmIChzM1N0b3JhZ2VJbmRleC4kczNMb2NhbERheXNTbGlkZXIuaGFzQ2xhc3MoJ3NsaWRlcicpKSB7XG4gICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC4kczNMb2NhbERheXNTbGlkZXIuc2xpZGVyKCdkZXN0cm95Jyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDcmVhdGUgc2xpZGVyIHdpdGggc3BlY2lmaWVkIG1heFxuICAgICAgICBzM1N0b3JhZ2VJbmRleC4kczNMb2NhbERheXNTbGlkZXJcbiAgICAgICAgICAgIC5zbGlkZXIoe1xuICAgICAgICAgICAgICAgIG1pbjogMCxcbiAgICAgICAgICAgICAgICBtYXg6IG1heEluZGV4LFxuICAgICAgICAgICAgICAgIHN0ZXA6IDEsXG4gICAgICAgICAgICAgICAgc21vb3RoOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBhdXRvQWRqdXN0TGFiZWxzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBpbnRlcnByZXRMYWJlbDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxhYmVscyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIDA6ICc3ICcgKyBnbG9iYWxUcmFuc2xhdGUuc3RfRGF5cyxcbiAgICAgICAgICAgICAgICAgICAgICAgIDE6IGdsb2JhbFRyYW5zbGF0ZS5zdF8xTW9udGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAyOiBnbG9iYWxUcmFuc2xhdGUuc3RfM01vbnRocyxcbiAgICAgICAgICAgICAgICAgICAgICAgIDM6IGdsb2JhbFRyYW5zbGF0ZS5zdF82TW9udGhzLFxuICAgICAgICAgICAgICAgICAgICAgICAgNDogZ2xvYmFsVHJhbnNsYXRlLnN0XzFZZWFyLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGFiZWxzW3ZhbHVlXSB8fCAnJztcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiBzM1N0b3JhZ2VJbmRleC5jYkFmdGVyU2VsZWN0UzNMb2NhbERheXNTbGlkZXIsXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgaW5pdGlhbCB2YWx1ZSBpZiBwcm92aWRlZFxuICAgICAgICBpZiAoaW5pdGlhbFZhbHVlICE9PSB1bmRlZmluZWQgJiYgaW5pdGlhbFZhbHVlID49IDAgJiYgaW5pdGlhbFZhbHVlIDw9IG1heEluZGV4KSB7XG4gICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC4kczNMb2NhbERheXNTbGlkZXIuc2xpZGVyKCdzZXQgdmFsdWUnLCBpbml0aWFsVmFsdWUsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIFMzIHN0b3JhZ2UgbW9kdWxlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgczNTdG9yYWdlSW5kZXguJGZvcm1PYmogPSAkKCcjczMtc3RvcmFnZS1mb3JtJyk7XG4gICAgICAgIHMzU3RvcmFnZUluZGV4LiRzdWJtaXRCdXR0b24gPSAkKCcjc3VibWl0YnV0dG9uLXMzJyk7XG4gICAgICAgIHMzU3RvcmFnZUluZGV4LiRkcm9wZG93blN1Ym1pdCA9ICQoJyNkcm9wZG93blN1Ym1pdC1zMycpO1xuICAgICAgICBzM1N0b3JhZ2VJbmRleC4kZGlycnR5RmllbGQgPSAkKCcjZGlycnR5LXMzJyk7XG4gICAgICAgIHMzU3RvcmFnZUluZGV4LiRzM0xvY2FsRGF5c1NsaWRlciA9ICQoJyNQQlhSZWNvcmRTM0xvY2FsRGF5c1NsaWRlcicpO1xuICAgICAgICBzM1N0b3JhZ2VJbmRleC4kczNFbmFibGVkQ2hlY2tib3ggPSAkKCcjczMtZW5hYmxlZC1jaGVja2JveCcpO1xuICAgICAgICBzM1N0b3JhZ2VJbmRleC4kczNTZXR0aW5nc0dyb3VwID0gJCgnI3MzLXNldHRpbmdzLWdyb3VwJyk7XG4gICAgICAgIHMzU3RvcmFnZUluZGV4LiR0ZXN0UzNCdXR0b24gPSAkKCcjdGVzdC1zMy1jb25uZWN0aW9uJyk7XG4gICAgICAgIHMzU3RvcmFnZUluZGV4LiRzM1N0YXRzQ29udGFpbmVyID0gJCgnI3MzLXN0YXRzLWNvbnRhaW5lcicpO1xuICAgICAgICBzM1N0b3JhZ2VJbmRleC4kczNTdGF0c01lc3NhZ2UgPSAkKCcjczMtc3RhdHMtbWVzc2FnZScpO1xuICAgICAgICBzM1N0b3JhZ2VJbmRleC4kczNTdGF0c0hlYWRlciA9ICQoJyNzMy1zdGF0cy1oZWFkZXInKTtcbiAgICAgICAgczNTdG9yYWdlSW5kZXguJHMzU3RhdHNEZXRhaWxzID0gJCgnI3MzLXN0YXRzLWRldGFpbHMnKTtcbiAgICAgICAgczNTdG9yYWdlSW5kZXguJHByZXNldERyb3Bkb3duID0gJCgnI3MzLXByb3ZpZGVyLXByZXNldC1kcm9wZG93bicpO1xuICAgICAgICBzM1N0b3JhZ2VJbmRleC4kczNFbmRwb2ludElucHV0ID0gJCgnI3MzLXN0b3JhZ2UtZm9ybSBpbnB1dFtuYW1lPVwiczNfZW5kcG9pbnRcIl0nKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIFMzIGxvY2FsIHJldGVudGlvbiBwZXJpb2Qgc2xpZGVyIHdpdGggZGVmYXVsdCBtYXggKGFsbCBvcHRpb25zIGF2YWlsYWJsZSlcbiAgICAgICAgY29uc3QgZGVmYXVsdE1heEluZGV4ID0gczNTdG9yYWdlSW5kZXguczNMb2NhbERheXNQZXJpb2QubGVuZ3RoIC0gMTtcbiAgICAgICAgczNTdG9yYWdlSW5kZXguaW5pdGlhbGl6ZVNsaWRlcihkZWZhdWx0TWF4SW5kZXgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgUzMgZW5hYmxlZCBjaGVja2JveFxuICAgICAgICBzM1N0b3JhZ2VJbmRleC4kczNFbmFibGVkQ2hlY2tib3guY2hlY2tib3goe1xuICAgICAgICAgICAgb25DaGFuZ2U6IHMzU3RvcmFnZUluZGV4LnRvZ2dsZVMzU2V0dGluZ3NWaXNpYmlsaXR5XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgcHJvdmlkZXIgcHJlc2V0IGRyb3Bkb3duLiBUaGUgdXNlci1kcml2ZW4gcGF0aCBhcHBsaWVzXG4gICAgICAgIC8vIHByZXNldCBkZWZhdWx0cyB0byB0aGUgZm9ybTsgbG9hZFNldHRpbmdzKCkgZ3VhcmRzIGFnYWluc3QgdGhpc1xuICAgICAgICAvLyBmaXJpbmcgb24gcHJvZ3JhbW1hdGljIHZhbHVlIGNoYW5nZXMuXG4gICAgICAgIHMzU3RvcmFnZUluZGV4LiRwcmVzZXREcm9wZG93bi5kcm9wZG93bih7XG4gICAgICAgICAgICBvbkNoYW5nZSh2YWx1ZSkge1xuICAgICAgICAgICAgICAgIGlmIChzM1N0b3JhZ2VJbmRleC5pc0xvYWRpbmdGcm9tU2VydmVyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguYXBwbHlQcmVzZXRUb0Zvcm0odmFsdWUpO1xuICAgICAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LnVwZGF0ZVByZXNldFVJKHZhbHVlKTtcbiAgICAgICAgICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBUZXN0IFMzIGNvbm5lY3Rpb24gYnV0dG9uIGhhbmRsZXJcbiAgICAgICAgczNTdG9yYWdlSW5kZXguJHRlc3RTM0J1dHRvbi5vbignY2xpY2snLCBzM1N0b3JhZ2VJbmRleC50ZXN0UzNDb25uZWN0aW9uKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGZvcm1cbiAgICAgICAgczNTdG9yYWdlSW5kZXguaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBMb2FkIFMzIHNldHRpbmdzXG4gICAgICAgIHMzU3RvcmFnZUluZGV4LmxvYWRTZXR0aW5ncygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGUgUzMgc2V0dGluZ3MgZ3JvdXAgdmlzaWJpbGl0eSBiYXNlZCBvbiBjaGVja2JveCBzdGF0ZVxuICAgICAqL1xuICAgIHRvZ2dsZVMzU2V0dGluZ3NWaXNpYmlsaXR5KCkge1xuICAgICAgICBpZiAoczNTdG9yYWdlSW5kZXguJHMzRW5hYmxlZENoZWNrYm94LmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LiRzM1NldHRpbmdzR3JvdXAuc2hvdygpO1xuICAgICAgICAgICAgLy8gTG9hZCBTMyBzdGF0cyB3aGVuIHNldHRpbmdzIGFyZSBzaG93blxuICAgICAgICAgICAgczNTdG9yYWdlSW5kZXgubG9hZFMzU3RhdHMoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LiRzM1NldHRpbmdzR3JvdXAuaGlkZSgpO1xuICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguJHMzU3RhdHNDb250YWluZXIuaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgUzMgc3luY2hyb25pemF0aW9uIHN0YXRpc3RpY3NcbiAgICAgKi9cbiAgICBsb2FkUzNTdGF0cygpIHtcbiAgICAgICAgUzNTdG9yYWdlQVBJLmdldFN0YXRzKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguZGlzcGxheVMzU3RhdHMocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LiRzM1N0YXRzQ29udGFpbmVyLmhpZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERpc3BsYXkgUzMgc3luY2hyb25pemF0aW9uIHN0YXRpc3RpY3NcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc3RhdHMgLSBTdGF0aXN0aWNzIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBkaXNwbGF5UzNTdGF0cyhzdGF0cykge1xuICAgICAgICAvLyBEb24ndCBzaG93IGlmIFMzIGlzIGRpc2FibGVkXG4gICAgICAgIGlmICghc3RhdHMuczNfZW5hYmxlZCkge1xuICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguJHMzU3RhdHNDb250YWluZXIuaGlkZSgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQnVpbGQgaGVhZGVyIGJhc2VkIG9uIHN5bmMgc3RhdHVzXG4gICAgICAgIGxldCBoZWFkZXJUZXh0ID0gJyc7XG4gICAgICAgIGxldCBtZXNzYWdlQ2xhc3MgPSAnaW5mbyc7XG5cbiAgICAgICAgc3dpdGNoIChzdGF0cy5zeW5jX3N0YXR1cykge1xuICAgICAgICAgICAgY2FzZSAnc3luY2VkJzpcbiAgICAgICAgICAgICAgICBoZWFkZXJUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLnN0X1MzU3RhdHVzU3luY2VkO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2VDbGFzcyA9ICdwb3NpdGl2ZSc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICd1cGxvYWRpbmcnOlxuICAgICAgICAgICAgICAgIGhlYWRlclRleHQgPSBnbG9iYWxUcmFuc2xhdGUuc3RfUzNTdGF0dXNVcGxvYWRpbmc7XG4gICAgICAgICAgICAgICAgbWVzc2FnZUNsYXNzID0gJ2luZm8nO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnc3luY2luZyc6XG4gICAgICAgICAgICAgICAgaGVhZGVyVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5zdF9TM1N0YXR1c1N5bmNpbmdcbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoJyVwZXJjZW50JScsIHN0YXRzLnN5bmNfcGVyY2VudGFnZSk7XG4gICAgICAgICAgICAgICAgbWVzc2FnZUNsYXNzID0gJ2luZm8nO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAncGVuZGluZyc6XG4gICAgICAgICAgICAgICAgaGVhZGVyVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5zdF9TM1N0YXR1c1BlbmRpbmc7XG4gICAgICAgICAgICAgICAgbWVzc2FnZUNsYXNzID0gJ3dhcm5pbmcnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZW1wdHknOlxuICAgICAgICAgICAgICAgIGhlYWRlclRleHQgPSBnbG9iYWxUcmFuc2xhdGUuc3RfUzNTdGF0dXNFbXB0eTtcbiAgICAgICAgICAgICAgICBtZXNzYWdlQ2xhc3MgPSAnaW5mbyc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGhlYWRlclRleHQgPSBnbG9iYWxUcmFuc2xhdGUuc3RfUzNTdGF0dXNEaXNhYmxlZDtcbiAgICAgICAgICAgICAgICBtZXNzYWdlQ2xhc3MgPSAnaW5mbyc7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBCdWlsZCBkZXRhaWxzIHRleHRcbiAgICAgICAgY29uc3QgZGV0YWlscyA9IFtdO1xuXG4gICAgICAgIC8vIEZpbGVzIGluIFMzXG4gICAgICAgIGlmIChzdGF0cy5maWxlc19pbl9zMyA+IDApIHtcbiAgICAgICAgICAgIGRldGFpbHMucHVzaChnbG9iYWxUcmFuc2xhdGUuc3RfUzNGaWxlc0luQ2xvdWRcbiAgICAgICAgICAgICAgICAucmVwbGFjZSgnJWNvdW50JScsIHN0YXRzLmZpbGVzX2luX3MzLnRvTG9jYWxlU3RyaW5nKCkpXG4gICAgICAgICAgICAgICAgLnJlcGxhY2UoJyVzaXplJScsIHMzU3RvcmFnZUluZGV4LmZvcm1hdFNpemUoc3RhdHMudG90YWxfc2l6ZV9zM19ieXRlcykpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZpbGVzIHBlbmRpbmcgdXBsb2FkXG4gICAgICAgIGlmIChzdGF0cy5maWxlc19sb2NhbCA+IDApIHtcbiAgICAgICAgICAgIGRldGFpbHMucHVzaChnbG9iYWxUcmFuc2xhdGUuc3RfUzNGaWxlc1BlbmRpbmdcbiAgICAgICAgICAgICAgICAucmVwbGFjZSgnJWNvdW50JScsIHN0YXRzLmZpbGVzX2xvY2FsLnRvTG9jYWxlU3RyaW5nKCkpXG4gICAgICAgICAgICAgICAgLnJlcGxhY2UoJyVzaXplJScsIHMzU3RvcmFnZUluZGV4LmZvcm1hdFNpemUoc3RhdHMudG90YWxfc2l6ZV9sb2NhbF9ieXRlcykpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENvbm5lY3Rpb24gc3RhdHVzXG4gICAgICAgIGlmIChzdGF0cy5zM19jb25uZWN0ZWQpIHtcbiAgICAgICAgICAgIGRldGFpbHMucHVzaChnbG9iYWxUcmFuc2xhdGUuc3RfUzNDb25uZWN0ZWQpO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YXRzLnMzX2VuYWJsZWQpIHtcbiAgICAgICAgICAgIGRldGFpbHMucHVzaChnbG9iYWxUcmFuc2xhdGUuc3RfUzNOb3RDb25uZWN0ZWQpO1xuICAgICAgICAgICAgbWVzc2FnZUNsYXNzID0gJ3dhcm5pbmcnO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTGFzdCB1cGxvYWRcbiAgICAgICAgaWYgKHN0YXRzLmxhc3RfdXBsb2FkX2F0KSB7XG4gICAgICAgICAgICBkZXRhaWxzLnB1c2goZ2xvYmFsVHJhbnNsYXRlLnN0X1MzTGFzdFVwbG9hZFxuICAgICAgICAgICAgICAgIC5yZXBsYWNlKCclZGF0ZSUnLCBzdGF0cy5sYXN0X3VwbG9hZF9hdCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIG1lc3NhZ2Ugc3R5bGluZ1xuICAgICAgICBzM1N0b3JhZ2VJbmRleC4kczNTdGF0c01lc3NhZ2VcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnaW5mbyBwb3NpdGl2ZSB3YXJuaW5nIG5lZ2F0aXZlJylcbiAgICAgICAgICAgIC5hZGRDbGFzcyhtZXNzYWdlQ2xhc3MpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBjb250ZW50XG4gICAgICAgIHMzU3RvcmFnZUluZGV4LiRzM1N0YXRzSGVhZGVyLnRleHQoaGVhZGVyVGV4dCk7XG4gICAgICAgIHMzU3RvcmFnZUluZGV4LiRzM1N0YXRzRGV0YWlscy5odG1sKGRldGFpbHMuam9pbignPGJyPicpKTtcblxuICAgICAgICAvLyBTaG93IGNvbnRhaW5lclxuICAgICAgICBzM1N0b3JhZ2VJbmRleC4kczNTdGF0c0NvbnRhaW5lci5zaG93KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZvcm1hdCBieXRlcyB0byBodW1hbi1yZWFkYWJsZSBzaXplXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGJ5dGVzIC0gU2l6ZSBpbiBieXRlc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEZvcm1hdHRlZCBzaXplIHN0cmluZ1xuICAgICAqL1xuICAgIGZvcm1hdFNpemUoYnl0ZXMpIHtcbiAgICAgICAgaWYgKGJ5dGVzID09PSAwKSByZXR1cm4gJzAgQic7XG4gICAgICAgIGNvbnN0IGsgPSAxMDI0O1xuICAgICAgICBjb25zdCBzaXplcyA9IFsnQicsICdLQicsICdNQicsICdHQicsICdUQiddO1xuICAgICAgICBjb25zdCBpID0gTWF0aC5mbG9vcihNYXRoLmxvZyhieXRlcykgLyBNYXRoLmxvZyhrKSk7XG4gICAgICAgIHJldHVybiBwYXJzZUZsb2F0KChieXRlcyAvIE1hdGgucG93KGssIGkpKS50b0ZpeGVkKDIpKSArICcgJyArIHNpemVzW2ldO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBTMyBsb2NhbCBkYXlzIHNsaWRlciB2YWx1ZSBjaGFuZ2VzXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHZhbHVlIC0gU2xpZGVyIHZhbHVlICgwLTYpXG4gICAgICovXG4gICAgY2JBZnRlclNlbGVjdFMzTG9jYWxEYXlzU2xpZGVyKHZhbHVlKSB7XG4gICAgICAgIC8vIEdldCB0aGUgbG9jYWwgcmV0ZW50aW9uIHBlcmlvZCBjb3JyZXNwb25kaW5nIHRvIHRoZSBzbGlkZXIgdmFsdWVcbiAgICAgICAgY29uc3QgbG9jYWxEYXlzID0gczNTdG9yYWdlSW5kZXguczNMb2NhbERheXNQZXJpb2RbdmFsdWVdO1xuXG4gICAgICAgIC8vIFNldCB0aGUgZm9ybSB2YWx1ZSBmb3IgJ1BCWFJlY29yZFMzTG9jYWxEYXlzJ1xuICAgICAgICBzM1N0b3JhZ2VJbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnUEJYUmVjb3JkUzNMb2NhbERheXMnLCBsb2NhbERheXMpO1xuXG4gICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50XG4gICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIFMzIGxvY2FsIHNsaWRlciBsaW1pdHMgYmFzZWQgb24gdG90YWwgcmV0ZW50aW9uIHBlcmlvZFxuICAgICAqIENhbGxlZCBieSBzdG9yYWdlLWluZGV4LmpzIHdoZW4gbWFpbiBzbGlkZXIgY2hhbmdlc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0b3RhbFBlcmlvZCAtIFRvdGFsIHJldGVudGlvbiBwZXJpb2QgaW4gZGF5cyAoJycgZm9yIGluZmluaXR5KVxuICAgICAqL1xuICAgIHVwZGF0ZVNsaWRlckxpbWl0cyh0b3RhbFBlcmlvZCkge1xuICAgICAgICAvLyBTdG9yZSBmb3IgcmVmZXJlbmNlXG4gICAgICAgIHMzU3RvcmFnZUluZGV4Lm1heExvY2FsUmV0ZW50aW9uRGF5cyA9IHRvdGFsUGVyaW9kO1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSBtYXggaW5kZXhcbiAgICAgICAgY29uc3QgbWF4SW5kZXggPSBzM1N0b3JhZ2VJbmRleC5nZXRNYXhMb2NhbFJldGVudGlvbkluZGV4KHRvdGFsUGVyaW9kKTtcblxuICAgICAgICAvLyBHZXQgY3VycmVudCB2YWx1ZSBiZWZvcmUgcmVpbml0aWFsaXppbmdcbiAgICAgICAgY29uc3QgY3VycmVudEluZGV4ID0gczNTdG9yYWdlSW5kZXguJHMzTG9jYWxEYXlzU2xpZGVyLnNsaWRlcignZ2V0IHZhbHVlJyk7XG5cbiAgICAgICAgLy8gQ2xhbXAgdmFsdWUgdG8gbmV3IG1heCBpZiBuZWVkZWRcbiAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBNYXRoLm1pbihjdXJyZW50SW5kZXgsIG1heEluZGV4KTtcblxuICAgICAgICAvLyBSZWluaXRpYWxpemUgc2xpZGVyIHdpdGggbmV3IG1heCAoZml4ZXMgdmlzdWFsIHBvc2l0aW9uaW5nIGlzc3VlKVxuICAgICAgICBzM1N0b3JhZ2VJbmRleC5pbml0aWFsaXplU2xpZGVyKG1heEluZGV4LCBuZXdWYWx1ZSk7XG5cbiAgICAgICAgLy8gVXBkYXRlIGZvcm0gdmFsdWUgaWYgaXQgY2hhbmdlZFxuICAgICAgICBpZiAoY3VycmVudEluZGV4ID4gbWF4SW5kZXgpIHtcbiAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdQQlhSZWNvcmRTM0xvY2FsRGF5cycsIHMzU3RvcmFnZUluZGV4LnMzTG9jYWxEYXlzUGVyaW9kW21heEluZGV4XSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IG1heGltdW0gYWxsb3dlZCBsb2NhbCByZXRlbnRpb24gaW5kZXggYmFzZWQgb24gdG90YWwgcmV0ZW50aW9uIHBlcmlvZFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0b3RhbFBlcmlvZCAtIFRvdGFsIHJldGVudGlvbiBwZXJpb2QgaW4gZGF5cyAoJycgZm9yIGluZmluaXR5KVxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IE1heGltdW0gaW5kZXggZm9yIHMzTG9jYWxEYXlzUGVyaW9kIGFycmF5XG4gICAgICovXG4gICAgZ2V0TWF4TG9jYWxSZXRlbnRpb25JbmRleCh0b3RhbFBlcmlvZCkge1xuICAgICAgICAvLyBJZiB0b3RhbCBwZXJpb2QgaXMgaW5maW5pdHkgKGVtcHR5LCBudWxsLCB1bmRlZmluZWQsIDAsIG9yICcwJyksIGFsbG93IGFsbCBsb2NhbCBvcHRpb25zXG4gICAgICAgIGlmICghdG90YWxQZXJpb2QgfHwgdG90YWxQZXJpb2QgPT09ICcnIHx8IHRvdGFsUGVyaW9kID09PSAnMCcgfHwgdG90YWxQZXJpb2QgPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBzM1N0b3JhZ2VJbmRleC5zM0xvY2FsRGF5c1BlcmlvZC5sZW5ndGggLSAxO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdG90YWxEYXlzID0gcGFyc2VJbnQodG90YWxQZXJpb2QpO1xuICAgICAgICBsZXQgbWF4SW5kZXggPSBzM1N0b3JhZ2VJbmRleC5zM0xvY2FsRGF5c1BlcmlvZC5sZW5ndGggLSAxO1xuXG4gICAgICAgIC8vIEZpbmQgdGhlIGhpZ2hlc3QgbG9jYWwgcmV0ZW50aW9uIHRoYXQgaXMgbGVzcyB0aGFuIHRvdGFsXG4gICAgICAgIGZvciAobGV0IGkgPSBzM1N0b3JhZ2VJbmRleC5zM0xvY2FsRGF5c1BlcmlvZC5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgY29uc3QgbG9jYWxEYXlzID0gcGFyc2VJbnQoczNTdG9yYWdlSW5kZXguczNMb2NhbERheXNQZXJpb2RbaV0pO1xuICAgICAgICAgICAgaWYgKGxvY2FsRGF5cyA8IHRvdGFsRGF5cykge1xuICAgICAgICAgICAgICAgIG1heEluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBtYXhJbmRleDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogV3JpdGUgcHJlc2V0LWRlcml2ZWQgZGVmYXVsdHMgaW50byB0aGUgZm9ybS4gUmVnaW9uIGlzIG9ubHkgZmlsbGVkXG4gICAgICogd2hlbiB0aGUgdXNlciBoYXMgbm90aGluZyB0eXBlZDsgcGF0aC1zdHlsZSBhbHdheXMgdHJhY2tzIHRoZSBwcmVzZXRcbiAgICAgKiBiZWNhdXNlIHRoYXQncyB0aGUgYWN0dWFsIGNyb3NzLXByb3ZpZGVyIGZpeCB0aGUgZHJvcGRvd24gZXhpc3RzIGZvci5cbiAgICAgKlxuICAgICAqIENhbGxlZCBmcm9tIHRoZSBkcm9wZG93bidzIHVzZXItZHJpdmVuIG9uQ2hhbmdlLiBsb2FkU2V0dGluZ3MoKSBkb2VzXG4gICAgICogTk9UIGNhbGwgdGhpcyDigJQgc2VydmVyIHZhbHVlcyB3aW4gb24gbG9hZC5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwcmVzZXRJZFxuICAgICAqL1xuICAgIGFwcGx5UHJlc2V0VG9Gb3JtKHByZXNldElkKSB7XG4gICAgICAgIGNvbnN0IHByZXNldCA9IHMzU3RvcmFnZUluZGV4LnByZXNldENhdGFsb2d1ZVtwcmVzZXRJZF07XG4gICAgICAgIGlmICghcHJlc2V0KSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjdXJyZW50UmVnaW9uID0gczNTdG9yYWdlSW5kZXguJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3MzX3JlZ2lvbicpO1xuICAgICAgICBpZiAoIWN1cnJlbnRSZWdpb24pIHtcbiAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdzM19yZWdpb24nLCBwcmVzZXQucmVnaW9uX2RlZmF1bHQgfHwgJycpO1xuICAgICAgICB9XG5cbiAgICAgICAgczNTdG9yYWdlSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ3MzX3VzZV9wYXRoX3N0eWxlJywgcHJlc2V0LnVzZV9wYXRoX3N0eWxlID8gMSA6IDApO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgdGhlIHByZXNldC1kcml2ZW4gbm9uLWZvcm0gVUk6IGVuZHBvaW50IHBsYWNlaG9sZGVyIGFuZCB0aGVcbiAgICAgKiBwcmVzZXQtc3BlY2lmaWMgbm90ZSB0aGF0IGdldHMgZm9sZGVkIGludG8gdGhlIHMzX2VuZHBvaW50IGZpZWxkXG4gICAgICogdG9vbHRpcCAobm8gc3RhbmRhbG9uZSBoaW50IGJhbm5lciDigJQgdXNlcyB0aGUgZXhpc3RpbmcgdG9vbHRpcFxuICAgICAqIG1lY2hhbmlzbSBpbiBzdG9yYWdlLWluZGV4LmpzIHNvIGFsbCBwZXItZmllbGQgaGludHMgbGl2ZSBpbiBvbmVcbiAgICAgKiBwbGFjZSkuIFNhZmUgdG8gY2FsbCBkdXJpbmcgaW5pdGlhbCBsb2FkIOKAlCBkb2VzIG5vdCB3cml0ZSBmb3JtXG4gICAgICogdmFsdWVzLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHByZXNldElkXG4gICAgICovXG4gICAgdXBkYXRlUHJlc2V0VUkocHJlc2V0SWQpIHtcbiAgICAgICAgY29uc3QgcHJlc2V0ID0gczNTdG9yYWdlSW5kZXgucHJlc2V0Q2F0YWxvZ3VlW3ByZXNldElkXTtcbiAgICAgICAgaWYgKCFwcmVzZXQpIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIHMzU3RvcmFnZUluZGV4LiRzM0VuZHBvaW50SW5wdXQuYXR0cigncGxhY2Vob2xkZXInLCBwcmVzZXQuZW5kcG9pbnRfcGxhY2Vob2xkZXIgfHwgJycpO1xuXG4gICAgICAgIGNvbnN0IGhpbnRUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlW3ByZXNldC5oaW50X2tleV0gfHwgJyc7XG4gICAgICAgIGlmICh0eXBlb2Ygc3RvcmFnZUluZGV4ICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2Ygc3RvcmFnZUluZGV4LnNldFMzRW5kcG9pbnRQcmVzZXROb3RlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgICBzdG9yYWdlSW5kZXguc2V0UzNFbmRwb2ludFByZXNldE5vdGUoaGludFRleHQpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhY2hlIHRoZSBwcmVzZXQgY2F0YWxvZ3VlIGZyb20gdGhlIEFQSSByZXNwb25zZSBzbyBhcHBseVByZXNldERlZmF1bHRzXG4gICAgICogY2FuIGxvb2sgdXAgbWV0YWRhdGEgd2l0aG91dCBhbm90aGVyIHJvdW5kLXRyaXAuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge0FycmF5PE9iamVjdD59IHByZXNldHMgLSBhdmFpbGFibGVfcHJlc2V0cyBhcnJheSBmcm9tIC9zMy1zdG9yYWdlIEdFVFxuICAgICAqL1xuICAgIGNhY2hlUHJlc2V0Q2F0YWxvZ3VlKHByZXNldHMpIHtcbiAgICAgICAgczNTdG9yYWdlSW5kZXgucHJlc2V0Q2F0YWxvZ3VlID0ge307XG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShwcmVzZXRzKSkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHByZXNldHMuZm9yRWFjaCgocHJlc2V0KSA9PiB7XG4gICAgICAgICAgICBpZiAocHJlc2V0ICYmIHByZXNldC5pZCkge1xuICAgICAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LnByZXNldENhdGFsb2d1ZVtwcmVzZXQuaWRdID0gcHJlc2V0O1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVGVzdCBTMyBjb25uZWN0aW9uIHdpdGggY3VycmVudCBmb3JtIHZhbHVlc1xuICAgICAqL1xuICAgIHRlc3RTM0Nvbm5lY3Rpb24oKSB7XG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICBzM1N0b3JhZ2VJbmRleC4kdGVzdFMzQnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cbiAgICAgICAgLy8gR2V0IGZvcm0gdmFsdWVzXG4gICAgICAgIGNvbnN0IHRlc3REYXRhID0ge1xuICAgICAgICAgICAgczNfZW5kcG9pbnQ6IHMzU3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdzM19lbmRwb2ludCcpLFxuICAgICAgICAgICAgczNfcmVnaW9uOiBzM1N0b3JhZ2VJbmRleC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnczNfcmVnaW9uJyksXG4gICAgICAgICAgICBzM19idWNrZXQ6IHMzU3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdzM19idWNrZXQnKSxcbiAgICAgICAgICAgIHMzX2FjY2Vzc19rZXk6IHMzU3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdzM19hY2Nlc3Nfa2V5JyksXG4gICAgICAgICAgICBzM19zZWNyZXRfa2V5OiBzM1N0b3JhZ2VJbmRleC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnczNfc2VjcmV0X2tleScpLFxuICAgICAgICAgICAgczNfcHJvdmlkZXJfcHJlc2V0OiBzM1N0b3JhZ2VJbmRleC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnczNfcHJvdmlkZXJfcHJlc2V0JyksXG4gICAgICAgICAgICBzM191c2VfcGF0aF9zdHlsZTogczNTdG9yYWdlSW5kZXguJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3MzX3VzZV9wYXRoX3N0eWxlJylcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBDYWxsIEFQSSB0byB0ZXN0IGNvbm5lY3Rpb25cbiAgICAgICAgUzNTdG9yYWdlQVBJLnRlc3RDb25uZWN0aW9uKHRlc3REYXRhLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIHN0YXRlXG4gICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC4kdGVzdFMzQnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gcmVzcG9uc2UuZGF0YT8ubWVzc2FnZSB8fCBnbG9iYWxUcmFuc2xhdGUuc3RfUzNUZXN0U3VjY2VzcztcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93SW5mb3JtYXRpb24obWVzc2FnZSwgZ2xvYmFsVHJhbnNsYXRlLnN0X1MzVGVzdENvbm5lY3Rpb25IZWFkZXIpO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRmFpbHVyZSBwYXRoIOKAlCBzdXJmYWNlIHRoZSBhY3Rpb25hYmxlIGRpYWdub3N0aWMgY2hhaW4gd2hlblxuICAgICAgICAgICAgLy8gYXZhaWxhYmxlOiBoaW50ID4gdW5kZXJseWluZyBTREsgbWVzc2FnZSA+IGdlbmVyaWMgZmFsbGJhY2suXG4gICAgICAgICAgICBjb25zdCBkYXRhID0gcmVzcG9uc2U/LmRhdGEgfHwge307XG4gICAgICAgICAgICBjb25zdCBsaW5lcyA9IFtdO1xuICAgICAgICAgICAgaWYgKGRhdGEubWVzc2FnZSkge1xuICAgICAgICAgICAgICAgIGxpbmVzLnB1c2goZGF0YS5tZXNzYWdlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkYXRhLmF3c19lcnJvcl9jb2RlKSB7XG4gICAgICAgICAgICAgICAgbGluZXMucHVzaCgoZ2xvYmFsVHJhbnNsYXRlLnN0X1MzRXJyb3JDb2RlUHJlZml4IHx8ICdBV1MgZXJyb3InKSArICc6ICcgKyBkYXRhLmF3c19lcnJvcl9jb2RlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChkYXRhLmVycm9yX2NsYXNzKSB7XG4gICAgICAgICAgICAgICAgbGluZXMucHVzaCgoZ2xvYmFsVHJhbnNsYXRlLnN0X1MzRXJyb3JUeXBlUHJlZml4IHx8ICdUeXBlJykgKyAnOiAnICsgZGF0YS5lcnJvcl9jbGFzcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoZGF0YS5oaW50KSB7XG4gICAgICAgICAgICAgICAgbGluZXMucHVzaChkYXRhLmhpbnQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gbGluZXMubGVuZ3RoID4gMFxuICAgICAgICAgICAgICAgID8gbGluZXMuam9pbignXFxuJylcbiAgICAgICAgICAgICAgICA6IGdsb2JhbFRyYW5zbGF0ZS5zdF9TM1Rlc3RGYWlsZWQ7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZXJyb3JNZXNzYWdlLCBnbG9iYWxUcmFuc2xhdGUuc3RfUzNUZXN0Q29ubmVjdGlvbkhlYWRlcik7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIFMzIHNldHRpbmdzIGZyb20gQVBJXG4gICAgICovXG4gICAgbG9hZFNldHRpbmdzKCkge1xuICAgICAgICBTM1N0b3JhZ2VBUEkuZ2V0KChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XG5cbiAgICAgICAgICAgICAgICAvLyBDYWNoZSBwcmVzZXQgY2F0YWxvZ3VlIGZpcnN0IHNvIHRoZSBkcm9wZG93biBjaGFuZ2UgaGFuZGxlclxuICAgICAgICAgICAgICAgIC8vIGNhbiByZXNvbHZlIHRoZSBjaG9zZW4gcHJlc2V0IGFnYWluc3QgaXQuXG4gICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguY2FjaGVQcmVzZXRDYXRhbG9ndWUoZGF0YS5hdmFpbGFibGVfcHJlc2V0cyB8fCBbXSk7XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgY2hlY2tib3ggc3RhdGVcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5zM19lbmFibGVkID09PSAnMScgfHwgZGF0YS5zM19lbmFibGVkID09PSAxIHx8IGRhdGEuczNfZW5hYmxlZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC4kczNFbmFibGVkQ2hlY2tib3guY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguJHMzRW5hYmxlZENoZWNrYm94LmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU2V0IHRleHQgZmllbGRzXG4gICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ3MzX2VuZHBvaW50JywgZGF0YS5zM19lbmRwb2ludCB8fCAnJyk7XG4gICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ3MzX3JlZ2lvbicsIGRhdGEuczNfcmVnaW9uIHx8ICcnKTtcbiAgICAgICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnczNfYnVja2V0JywgZGF0YS5zM19idWNrZXQgfHwgJycpO1xuICAgICAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdzM19hY2Nlc3Nfa2V5JywgZGF0YS5zM19hY2Nlc3Nfa2V5IHx8ICcnKTtcbiAgICAgICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnczNfc2VjcmV0X2tleScsIGRhdGEuczNfc2VjcmV0X2tleSB8fCAnJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgcHJlc2V0IGRyb3Bkb3duIHdpdGhvdXQgZmlyaW5nIHRoZSBvbkNoYW5nZSBoYW5kbGVyIOKAlFxuICAgICAgICAgICAgICAgIC8vIHNlcnZlciB2YWx1ZXMgYXJlIGF1dGhvcml0YXRpdmUgb24gbG9hZC4gVGhlbiByZWZyZXNoIHRoZVxuICAgICAgICAgICAgICAgIC8vIHByZXNldC1kcml2ZW4gVUkgYml0cyAocGxhY2Vob2xkZXIsIGhpbnQsIGRvY3MgbGluaykuXG4gICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguaXNMb2FkaW5nRnJvbVNlcnZlciA9IHRydWU7XG4gICAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJlc2V0SWQgPSBkYXRhLnMzX3Byb3ZpZGVyX3ByZXNldCB8fCBzM1N0b3JhZ2VJbmRleC5ERUZBVUxUX1BSRVNFVF9JRDtcbiAgICAgICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguJHByZXNldERyb3Bkb3duLmRyb3Bkb3duKCdzZXQgc2VsZWN0ZWQnLCBwcmVzZXRJZCk7XG4gICAgICAgICAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdzM191c2VfcGF0aF9zdHlsZScsIGRhdGEuczNfdXNlX3BhdGhfc3R5bGUgPyAxIDogMCk7XG4gICAgICAgICAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LnVwZGF0ZVByZXNldFVJKHByZXNldElkKTtcbiAgICAgICAgICAgICAgICB9IGZpbmFsbHkge1xuICAgICAgICAgICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC5pc0xvYWRpbmdGcm9tU2VydmVyID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU2V0IFMzIGxvY2FsIHJldGVudGlvbiBzbGlkZXJcbiAgICAgICAgICAgICAgICBjb25zdCBsb2NhbERheXMgPSBTdHJpbmcoZGF0YS5QQlhSZWNvcmRTM0xvY2FsRGF5cyk7XG4gICAgICAgICAgICAgICAgbGV0IGxvY2FsSW5kZXggPSBzM1N0b3JhZ2VJbmRleC5zM0xvY2FsRGF5c1BlcmlvZC5pbmRleE9mKGxvY2FsRGF5cyk7XG5cbiAgICAgICAgICAgICAgICAvLyBGYWxsYmFjayBmb3IgbGVnYWN5IHZhbHVlcyBub3QgaW4gbmV3IGFycmF5IC0gZmluZCBjbG9zZXN0IHZhbGlkIHZhbHVlXG4gICAgICAgICAgICAgICAgaWYgKGxvY2FsSW5kZXggPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxvY2FsRGF5c051bSA9IHBhcnNlSW50KGxvY2FsRGF5cykgfHwgNztcbiAgICAgICAgICAgICAgICAgICAgLy8gRmluZCB0aGUgc21hbGxlc3QgdmFsdWUgPj0gbG9jYWxEYXlzTnVtLCBvciB1c2UgZmlyc3QgaWYgYWxsIGFyZSBsYXJnZXJcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxJbmRleCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgczNTdG9yYWdlSW5kZXguczNMb2NhbERheXNQZXJpb2QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwYXJzZUludChzM1N0b3JhZ2VJbmRleC5zM0xvY2FsRGF5c1BlcmlvZFtpXSkgPj0gbG9jYWxEYXlzTnVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9jYWxJbmRleCA9IGk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBsb2NhbEluZGV4ID0gaTsgLy8gVXNlIGxhc3QgaWYgbm9uZSBmb3VuZFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguJHMzTG9jYWxEYXlzU2xpZGVyLnNsaWRlcignc2V0IHZhbHVlJywgbG9jYWxJbmRleCk7XG4gICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1BCWFJlY29yZFMzTG9jYWxEYXlzJywgczNTdG9yYWdlSW5kZXguczNMb2NhbERheXNQZXJpb2RbbG9jYWxJbmRleF0pO1xuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHZpc2liaWxpdHlcbiAgICAgICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC50b2dnbGVTM1NldHRpbmdzVmlzaWJpbGl0eSgpO1xuXG4gICAgICAgICAgICAgICAgLy8gTG9hZCBTMyBzdGF0cyBpZiBlbmFibGVkXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuczNfZW5hYmxlZCA9PT0gJzEnIHx8IGRhdGEuczNfZW5hYmxlZCA9PT0gMSB8fCBkYXRhLnMzX2VuYWJsZWQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXgubG9hZFMzU3RhdHMoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gRm9ybSBzZXR0aW5nc1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFVwZGF0ZWQgc2V0dGluZ3NcbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IHMzU3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBoYXMgYmVlbiBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gU2VydmVyIHJlc3BvbnNlXG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5zdWNjZXNzKSB7XG4gICAgICAgICAgICAvLyBSZWxvYWQgc2V0dGluZ3MgdG8gc2hvdyB1cGRhdGVkIHZhbHVlc1xuICAgICAgICAgICAgczNTdG9yYWdlSW5kZXgubG9hZFNldHRpbmdzKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gczNTdG9yYWdlSW5kZXguJGZvcm1PYmo7XG4gICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbiA9IHMzU3RvcmFnZUluZGV4LiRzdWJtaXRCdXR0b247XG4gICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0ID0gczNTdG9yYWdlSW5kZXguJGRyb3Bkb3duU3VibWl0O1xuICAgICAgICBGb3JtLiRkaXJydHlGaWVsZCA9IHMzU3RvcmFnZUluZGV4LiRkaXJydHlGaWVsZDtcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gczNTdG9yYWdlSW5kZXgudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gczNTdG9yYWdlSW5kZXguY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBzM1N0b3JhZ2VJbmRleC5jYkFmdGVyU2VuZEZvcm07XG5cbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIHNldHRpbmdzIGZvciBGb3JtLmpzIChzaW5nbGV0b24gcmVzb3VyY2UpXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgYXBpT2JqZWN0OiBTM1N0b3JhZ2VBUEksXG4gICAgICAgICAgICBzYXZlTWV0aG9kOiAncGF0Y2gnIC8vIFVzaW5nIFBBVENIIGZvciBwYXJ0aWFsIHVwZGF0ZXNcbiAgICAgICAgfTtcblxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9XG59O1xuXG4vLyBJbml0aWFsaXplIHdoZW4gZG9jdW1lbnQgaXMgcmVhZHlcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBzM1N0b3JhZ2VJbmRleC5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==