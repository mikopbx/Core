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
      s3_secret_key: s3StorageIndex.$formObj.form('get value', 's3_secret_key')
    }; // Call API to test connection

    S3StorageAPI.testConnection(testData, function (response) {
      // Remove loading state
      s3StorageIndex.$testS3Button.removeClass('loading disabled');

      if (response && response.result === true) {
        var _response$data;

        var message = ((_response$data = response.data) === null || _response$data === void 0 ? void 0 : _response$data.message) || globalTranslate.st_S3TestSuccess;
        UserMessage.showInformation(message, globalTranslate.st_S3TestConnectionHeader);
      } else {
        var _response$data2;

        var errorMessage = (response === null || response === void 0 ? void 0 : (_response$data2 = response.data) === null || _response$data2 === void 0 ? void 0 : _response$data2.message) || globalTranslate.st_S3TestFailed;
        UserMessage.showError(errorMessage, globalTranslate.st_S3TestConnectionHeader);
      }
    });
  },

  /**
   * Load S3 settings from API
   */
  loadSettings: function loadSettings() {
    S3StorageAPI.get(function (response) {
      if (response.result === true && response.data) {
        var data = response.data; // Set checkbox state

        if (data.s3_enabled === '1' || data.s3_enabled === 1 || data.s3_enabled === true) {
          s3StorageIndex.$s3EnabledCheckbox.checkbox('set checked');
        } else {
          s3StorageIndex.$s3EnabledCheckbox.checkbox('set unchecked');
        } // Set text fields


        s3StorageIndex.$formObj.form('set value', 's3_endpoint', data.s3_endpoint || '');
        s3StorageIndex.$formObj.form('set value', 's3_region', data.s3_region || '');
        s3StorageIndex.$formObj.form('set value', 's3_bucket', data.s3_bucket || '');
        s3StorageIndex.$formObj.form('set value', 's3_access_key', data.s3_access_key || '');
        s3StorageIndex.$formObj.form('set value', 's3_secret_key', data.s3_secret_key || ''); // Set S3 local retention slider

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TdG9yYWdlL3MzLXN0b3JhZ2UtaW5kZXguanMiXSwibmFtZXMiOlsiczNTdG9yYWdlSW5kZXgiLCIkZm9ybU9iaiIsIiQiLCIkc3VibWl0QnV0dG9uIiwiJGRyb3Bkb3duU3VibWl0IiwiJGRpcnJ0eUZpZWxkIiwiJHMzTG9jYWxEYXlzU2xpZGVyIiwiJHMzRW5hYmxlZENoZWNrYm94IiwiJHMzU2V0dGluZ3NHcm91cCIsIiR0ZXN0UzNCdXR0b24iLCIkczNTdGF0c0NvbnRhaW5lciIsIiRzM1N0YXRzTWVzc2FnZSIsIiRzM1N0YXRzSGVhZGVyIiwiJHMzU3RhdHNEZXRhaWxzIiwiczNMb2NhbERheXNQZXJpb2QiLCJtYXhMb2NhbFJldGVudGlvbkRheXMiLCJ2YWxpZGF0ZVJ1bGVzIiwiczNfZW5kcG9pbnQiLCJpZGVudGlmaWVyIiwib3B0aW9uYWwiLCJkZXBlbmRzIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwic3RfUzNFbmRwb2ludEludmFsaWQiLCJzM19idWNrZXQiLCJ2YWx1ZSIsInN0X1MzQnVja2V0SW52YWxpZCIsImluaXRpYWxpemVTbGlkZXIiLCJtYXhJbmRleCIsImluaXRpYWxWYWx1ZSIsImhhc0NsYXNzIiwic2xpZGVyIiwibWluIiwibWF4Iiwic3RlcCIsInNtb290aCIsImF1dG9BZGp1c3RMYWJlbHMiLCJpbnRlcnByZXRMYWJlbCIsImxhYmVscyIsInN0X0RheXMiLCJzdF8xTW9udGgiLCJzdF8zTW9udGhzIiwic3RfNk1vbnRocyIsInN0XzFZZWFyIiwib25DaGFuZ2UiLCJjYkFmdGVyU2VsZWN0UzNMb2NhbERheXNTbGlkZXIiLCJ1bmRlZmluZWQiLCJpbml0aWFsaXplIiwiZGVmYXVsdE1heEluZGV4IiwibGVuZ3RoIiwiY2hlY2tib3giLCJ0b2dnbGVTM1NldHRpbmdzVmlzaWJpbGl0eSIsIm9uIiwidGVzdFMzQ29ubmVjdGlvbiIsImluaXRpYWxpemVGb3JtIiwibG9hZFNldHRpbmdzIiwic2hvdyIsImxvYWRTM1N0YXRzIiwiaGlkZSIsIlMzU3RvcmFnZUFQSSIsImdldFN0YXRzIiwicmVzcG9uc2UiLCJyZXN1bHQiLCJkYXRhIiwiZGlzcGxheVMzU3RhdHMiLCJzdGF0cyIsInMzX2VuYWJsZWQiLCJoZWFkZXJUZXh0IiwibWVzc2FnZUNsYXNzIiwic3luY19zdGF0dXMiLCJzdF9TM1N0YXR1c1N5bmNlZCIsInN0X1MzU3RhdHVzVXBsb2FkaW5nIiwic3RfUzNTdGF0dXNTeW5jaW5nIiwicmVwbGFjZSIsInN5bmNfcGVyY2VudGFnZSIsInN0X1MzU3RhdHVzUGVuZGluZyIsInN0X1MzU3RhdHVzRW1wdHkiLCJzdF9TM1N0YXR1c0Rpc2FibGVkIiwiZGV0YWlscyIsImZpbGVzX2luX3MzIiwicHVzaCIsInN0X1MzRmlsZXNJbkNsb3VkIiwidG9Mb2NhbGVTdHJpbmciLCJmb3JtYXRTaXplIiwidG90YWxfc2l6ZV9zM19ieXRlcyIsImZpbGVzX2xvY2FsIiwic3RfUzNGaWxlc1BlbmRpbmciLCJ0b3RhbF9zaXplX2xvY2FsX2J5dGVzIiwiczNfY29ubmVjdGVkIiwic3RfUzNDb25uZWN0ZWQiLCJzdF9TM05vdENvbm5lY3RlZCIsImxhc3RfdXBsb2FkX2F0Iiwic3RfUzNMYXN0VXBsb2FkIiwicmVtb3ZlQ2xhc3MiLCJhZGRDbGFzcyIsInRleHQiLCJodG1sIiwiam9pbiIsImJ5dGVzIiwiayIsInNpemVzIiwiaSIsIk1hdGgiLCJmbG9vciIsImxvZyIsInBhcnNlRmxvYXQiLCJwb3ciLCJ0b0ZpeGVkIiwibG9jYWxEYXlzIiwiZm9ybSIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsInVwZGF0ZVNsaWRlckxpbWl0cyIsInRvdGFsUGVyaW9kIiwiZ2V0TWF4TG9jYWxSZXRlbnRpb25JbmRleCIsImN1cnJlbnRJbmRleCIsIm5ld1ZhbHVlIiwidG90YWxEYXlzIiwicGFyc2VJbnQiLCJ0ZXN0RGF0YSIsInMzX3JlZ2lvbiIsInMzX2FjY2Vzc19rZXkiLCJzM19zZWNyZXRfa2V5IiwidGVzdENvbm5lY3Rpb24iLCJtZXNzYWdlIiwic3RfUzNUZXN0U3VjY2VzcyIsIlVzZXJNZXNzYWdlIiwic2hvd0luZm9ybWF0aW9uIiwic3RfUzNUZXN0Q29ubmVjdGlvbkhlYWRlciIsImVycm9yTWVzc2FnZSIsInN0X1MzVGVzdEZhaWxlZCIsInNob3dFcnJvciIsImdldCIsIlN0cmluZyIsIlBCWFJlY29yZFMzTG9jYWxEYXlzIiwibG9jYWxJbmRleCIsImluZGV4T2YiLCJsb2NhbERheXNOdW0iLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJjYkFmdGVyU2VuZEZvcm0iLCJzdWNjZXNzIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImRvY3VtZW50IiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsY0FBYyxHQUFHO0FBQ25CO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRUMsQ0FBQyxDQUFDLGtCQUFELENBTFE7O0FBT25CO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGFBQWEsRUFBRUQsQ0FBQyxDQUFDLGtCQUFELENBWEc7O0FBYW5CO0FBQ0o7QUFDQTtBQUNBO0FBQ0lFLEVBQUFBLGVBQWUsRUFBRUYsQ0FBQyxDQUFDLG9CQUFELENBakJDOztBQW1CbkI7QUFDSjtBQUNBO0FBQ0E7QUFDSUcsRUFBQUEsWUFBWSxFQUFFSCxDQUFDLENBQUMsWUFBRCxDQXZCSTs7QUF5Qm5CO0FBQ0o7QUFDQTtBQUNBO0FBQ0lJLEVBQUFBLGtCQUFrQixFQUFFSixDQUFDLENBQUMsNkJBQUQsQ0E3QkY7O0FBK0JuQjtBQUNKO0FBQ0E7QUFDQTtBQUNJSyxFQUFBQSxrQkFBa0IsRUFBRUwsQ0FBQyxDQUFDLHNC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QUFmO0FBQ0gsS0FIRCxNQUdPO0FBQ0h1RCxNQUFBQSxJQUFJLENBQUM3RyxhQUFMLENBQW1CNEYsV0FBbkIsQ0FBK0IsVUFBL0I7QUFDSDtBQUNKLEdBN2RrQjs7QUErZG5CO0FBQ0o7QUFDQTtBQUNJdkMsRUFBQUEsY0FsZW1CLDRCQWtlRjtBQUNid0QsSUFBQUEsSUFBSSxDQUFDL0csUUFBTCxHQUFnQkQsY0FBYyxDQUFDQyxRQUEvQjtBQUNBK0csSUFBQUEsSUFBSSxDQUFDN0csYUFBTCxHQUFxQkgsY0FBYyxDQUFDRyxhQUFwQztBQUNBNkcsSUFBQUEsSUFBSSxDQUFDNUcsZUFBTCxHQUF1QkosY0FBYyxDQUFDSSxlQUF0QztBQUNBNEcsSUFBQUEsSUFBSSxDQUFDM0csWUFBTCxHQUFvQkwsY0FBYyxDQUFDSyxZQUFuQztBQUNBMkcsSUFBQUEsSUFBSSxDQUFDaEcsYUFBTCxHQUFxQmhCLGNBQWMsQ0FBQ2dCLGFBQXBDO0FBQ0FnRyxJQUFBQSxJQUFJLENBQUM0QixnQkFBTCxHQUF3QjVJLGNBQWMsQ0FBQzRJLGdCQUF2QztBQUNBNUIsSUFBQUEsSUFBSSxDQUFDOEIsZUFBTCxHQUF1QjlJLGNBQWMsQ0FBQzhJLGVBQXRDLENBUGEsQ0FTYjs7QUFDQTlCLElBQUFBLElBQUksQ0FBQ2dDLFdBQUwsR0FBbUI7QUFDZkMsTUFBQUEsT0FBTyxFQUFFLElBRE07QUFFZkMsTUFBQUEsU0FBUyxFQUFFckYsWUFGSTtBQUdmc0YsTUFBQUEsVUFBVSxFQUFFLE9BSEcsQ0FHSzs7QUFITCxLQUFuQjtBQU1BbkMsSUFBQUEsSUFBSSxDQUFDL0QsVUFBTDtBQUNIO0FBbmZrQixDQUF2QixDLENBc2ZBOztBQUNBL0MsQ0FBQyxDQUFDa0osUUFBRCxDQUFELENBQVlDLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnJKLEVBQUFBLGNBQWMsQ0FBQ2lELFVBQWY7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUzNTdG9yYWdlQVBJLCBVc2VyTWVzc2FnZSwgJCAqL1xuXG4vKipcbiAqIFMzIFN0b3JhZ2UgbWFuYWdlbWVudCBtb2R1bGVcbiAqIEhhbmRsZXMgUzMgY2xvdWQgc3RvcmFnZSBzZXR0aW5ncyAoVGFiIDMpXG4gKiBTZW5kcyBkYXRhIHRvOiBQQVRDSCAvcGJ4Y29yZS9hcGkvdjMvczMtc3RvcmFnZVxuICovXG5jb25zdCBzM1N0b3JhZ2VJbmRleCA9IHtcbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgUzMgc3RvcmFnZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNzMy1zdG9yYWdlLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBzdWJtaXQgYnV0dG9uICh1bmlxdWUgdG8gdGhpcyBmb3JtKS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzdWJtaXRCdXR0b246ICQoJyNzdWJtaXRidXR0b24tczMnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBkcm9wZG93biBzdWJtaXQgKHVuaXF1ZSB0byB0aGlzIGZvcm0pLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRyb3Bkb3duU3VibWl0OiAkKCcjZHJvcGRvd25TdWJtaXQtczMnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBkaXJ0eSBmaWVsZCAodW5pcXVlIHRvIHRoaXMgZm9ybSkuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZGlycnR5RmllbGQ6ICQoJyNkaXJydHktczMnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBTMyBsb2NhbCByZXRlbnRpb24gcGVyaW9kIHNsaWRlci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzM0xvY2FsRGF5c1NsaWRlcjogJCgnI1BCWFJlY29yZFMzTG9jYWxEYXlzU2xpZGVyJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciBTMyBlbmFibGVkIGNoZWNrYm94LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHMzRW5hYmxlZENoZWNrYm94OiAkKCcjczMtZW5hYmxlZC1jaGVja2JveCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgUzMgc2V0dGluZ3MgZ3JvdXAgY29udGFpbmVyLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHMzU2V0dGluZ3NHcm91cDogJCgnI3MzLXNldHRpbmdzLWdyb3VwJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0ZXN0IFMzIGNvbm5lY3Rpb24gYnV0dG9uLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHRlc3RTM0J1dHRvbjogJCgnI3Rlc3QtczMtY29ubmVjdGlvbicpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgUzMgc3RhdHMgY29udGFpbmVyLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHMzU3RhdHNDb250YWluZXI6ICQoJyNzMy1zdGF0cy1jb250YWluZXInKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIFMzIHN0YXRzIG1lc3NhZ2UgZWxlbWVudC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzM1N0YXRzTWVzc2FnZTogJCgnI3MzLXN0YXRzLW1lc3NhZ2UnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIFMzIHN0YXRzIGhlYWRlci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzM1N0YXRzSGVhZGVyOiAkKCcjczMtc3RhdHMtaGVhZGVyJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciBTMyBzdGF0cyBkZXRhaWxzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHMzU3RhdHNEZXRhaWxzOiAkKCcjczMtc3RhdHMtZGV0YWlscycpLFxuXG4gICAgLyoqXG4gICAgICogUG9zc2libGUgcGVyaW9kIHZhbHVlcyBmb3IgUzMgbG9jYWwgcmV0ZW50aW9uIChpbiBkYXlzKS5cbiAgICAgKiBWYWx1ZXM6IDcsIDMwLCA5MCwgMTgwLCAzNjUgZGF5cyAoMSB3ZWVrLCAxLzMvNiBtb250aHMsIDEgeWVhcilcbiAgICAgKi9cbiAgICBzM0xvY2FsRGF5c1BlcmlvZDogWyc3JywgJzMwJywgJzkwJywgJzE4MCcsICczNjUnXSxcblxuICAgIC8qKlxuICAgICAqIE1heGltdW0gYWxsb3dlZCBsb2NhbCByZXRlbnRpb24gcGVyaW9kIGZyb20gbWFpbiBzdG9yYWdlIHNsaWRlclxuICAgICAqIFVwZGF0ZWQgYnkgc3RvcmFnZS1pbmRleC5qcyB3aGVuIG1haW4gc2xpZGVyIGNoYW5nZXNcbiAgICAgKi9cbiAgICBtYXhMb2NhbFJldGVudGlvbkRheXM6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgUzMgZm9ybSBmaWVsZHMuXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIHMzX2VuZHBvaW50OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnczNfZW5kcG9pbnQnLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBkZXBlbmRzOiAnczNfZW5hYmxlZCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3VybCcsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnN0X1MzRW5kcG9pbnRJbnZhbGlkXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgczNfYnVja2V0OiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnczNfYnVja2V0JyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgZGVwZW5kczogJ3MzX2VuYWJsZWQnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdyZWdFeHAnLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogL15bYS16MC05XVthLXowLTkuLV17MSw2MX1bYS16MC05XSQvLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5zdF9TM0J1Y2tldEludmFsaWRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIG9yIHJlaW5pdGlhbGl6ZSB0aGUgUzMgbG9jYWwgcmV0ZW50aW9uIHNsaWRlclxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBtYXhJbmRleCAtIE1heGltdW0gc2xpZGVyIGluZGV4ICgwLTYpXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IFtpbml0aWFsVmFsdWVdIC0gT3B0aW9uYWwgaW5pdGlhbCB2YWx1ZSB0byBzZXRcbiAgICAgKi9cbiAgICBpbml0aWFsaXplU2xpZGVyKG1heEluZGV4LCBpbml0aWFsVmFsdWUpIHtcbiAgICAgICAgLy8gRGVzdHJveSBleGlzdGluZyBzbGlkZXIgaWYgaXQgZXhpc3RzXG4gICAgICAgIGlmIChzM1N0b3JhZ2VJbmRleC4kczNMb2NhbERheXNTbGlkZXIuaGFzQ2xhc3MoJ3NsaWRlcicpKSB7XG4gICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC4kczNMb2NhbERheXNTbGlkZXIuc2xpZGVyKCdkZXN0cm95Jyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDcmVhdGUgc2xpZGVyIHdpdGggc3BlY2lmaWVkIG1heFxuICAgICAgICBzM1N0b3JhZ2VJbmRleC4kczNMb2NhbERheXNTbGlkZXJcbiAgICAgICAgICAgIC5zbGlkZXIoe1xuICAgICAgICAgICAgICAgIG1pbjogMCxcbiAgICAgICAgICAgICAgICBtYXg6IG1heEluZGV4LFxuICAgICAgICAgICAgICAgIHN0ZXA6IDEsXG4gICAgICAgICAgICAgICAgc21vb3RoOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBhdXRvQWRqdXN0TGFiZWxzOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBpbnRlcnByZXRMYWJlbDogZnVuY3Rpb24gKHZhbHVlKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxhYmVscyA9IHtcbiAgICAgICAgICAgICAgICAgICAgICAgIDA6ICc3ICcgKyBnbG9iYWxUcmFuc2xhdGUuc3RfRGF5cyxcbiAgICAgICAgICAgICAgICAgICAgICAgIDE6IGdsb2JhbFRyYW5zbGF0ZS5zdF8xTW9udGgsXG4gICAgICAgICAgICAgICAgICAgICAgICAyOiBnbG9iYWxUcmFuc2xhdGUuc3RfM01vbnRocyxcbiAgICAgICAgICAgICAgICAgICAgICAgIDM6IGdsb2JhbFRyYW5zbGF0ZS5zdF82TW9udGhzLFxuICAgICAgICAgICAgICAgICAgICAgICAgNDogZ2xvYmFsVHJhbnNsYXRlLnN0XzFZZWFyLFxuICAgICAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbGFiZWxzW3ZhbHVlXSB8fCAnJztcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9uQ2hhbmdlOiBzM1N0b3JhZ2VJbmRleC5jYkFmdGVyU2VsZWN0UzNMb2NhbERheXNTbGlkZXIsXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAvLyBTZXQgaW5pdGlhbCB2YWx1ZSBpZiBwcm92aWRlZFxuICAgICAgICBpZiAoaW5pdGlhbFZhbHVlICE9PSB1bmRlZmluZWQgJiYgaW5pdGlhbFZhbHVlID49IDAgJiYgaW5pdGlhbFZhbHVlIDw9IG1heEluZGV4KSB7XG4gICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC4kczNMb2NhbERheXNTbGlkZXIuc2xpZGVyKCdzZXQgdmFsdWUnLCBpbml0aWFsVmFsdWUsIGZhbHNlKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIFMzIHN0b3JhZ2UgbW9kdWxlXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTMyBsb2NhbCByZXRlbnRpb24gcGVyaW9kIHNsaWRlciB3aXRoIGRlZmF1bHQgbWF4IChhbGwgb3B0aW9ucyBhdmFpbGFibGUpXG4gICAgICAgIGNvbnN0IGRlZmF1bHRNYXhJbmRleCA9IHMzU3RvcmFnZUluZGV4LnMzTG9jYWxEYXlzUGVyaW9kLmxlbmd0aCAtIDE7XG4gICAgICAgIHMzU3RvcmFnZUluZGV4LmluaXRpYWxpemVTbGlkZXIoZGVmYXVsdE1heEluZGV4KTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIFMzIGVuYWJsZWQgY2hlY2tib3hcbiAgICAgICAgczNTdG9yYWdlSW5kZXguJHMzRW5hYmxlZENoZWNrYm94LmNoZWNrYm94KHtcbiAgICAgICAgICAgIG9uQ2hhbmdlOiBzM1N0b3JhZ2VJbmRleC50b2dnbGVTM1NldHRpbmdzVmlzaWJpbGl0eVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBUZXN0IFMzIGNvbm5lY3Rpb24gYnV0dG9uIGhhbmRsZXJcbiAgICAgICAgczNTdG9yYWdlSW5kZXguJHRlc3RTM0J1dHRvbi5vbignY2xpY2snLCBzM1N0b3JhZ2VJbmRleC50ZXN0UzNDb25uZWN0aW9uKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGZvcm1cbiAgICAgICAgczNTdG9yYWdlSW5kZXguaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBMb2FkIFMzIHNldHRpbmdzXG4gICAgICAgIHMzU3RvcmFnZUluZGV4LmxvYWRTZXR0aW5ncygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUb2dnbGUgUzMgc2V0dGluZ3MgZ3JvdXAgdmlzaWJpbGl0eSBiYXNlZCBvbiBjaGVja2JveCBzdGF0ZVxuICAgICAqL1xuICAgIHRvZ2dsZVMzU2V0dGluZ3NWaXNpYmlsaXR5KCkge1xuICAgICAgICBpZiAoczNTdG9yYWdlSW5kZXguJHMzRW5hYmxlZENoZWNrYm94LmNoZWNrYm94KCdpcyBjaGVja2VkJykpIHtcbiAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LiRzM1NldHRpbmdzR3JvdXAuc2hvdygpO1xuICAgICAgICAgICAgLy8gTG9hZCBTMyBzdGF0cyB3aGVuIHNldHRpbmdzIGFyZSBzaG93blxuICAgICAgICAgICAgczNTdG9yYWdlSW5kZXgubG9hZFMzU3RhdHMoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LiRzM1NldHRpbmdzR3JvdXAuaGlkZSgpO1xuICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguJHMzU3RhdHNDb250YWluZXIuaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgUzMgc3luY2hyb25pemF0aW9uIHN0YXRpc3RpY3NcbiAgICAgKi9cbiAgICBsb2FkUzNTdGF0cygpIHtcbiAgICAgICAgUzNTdG9yYWdlQVBJLmdldFN0YXRzKChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguZGlzcGxheVMzU3RhdHMocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LiRzM1N0YXRzQ29udGFpbmVyLmhpZGUoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERpc3BsYXkgUzMgc3luY2hyb25pemF0aW9uIHN0YXRpc3RpY3NcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc3RhdHMgLSBTdGF0aXN0aWNzIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBkaXNwbGF5UzNTdGF0cyhzdGF0cykge1xuICAgICAgICAvLyBEb24ndCBzaG93IGlmIFMzIGlzIGRpc2FibGVkXG4gICAgICAgIGlmICghc3RhdHMuczNfZW5hYmxlZCkge1xuICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguJHMzU3RhdHNDb250YWluZXIuaGlkZSgpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQnVpbGQgaGVhZGVyIGJhc2VkIG9uIHN5bmMgc3RhdHVzXG4gICAgICAgIGxldCBoZWFkZXJUZXh0ID0gJyc7XG4gICAgICAgIGxldCBtZXNzYWdlQ2xhc3MgPSAnaW5mbyc7XG5cbiAgICAgICAgc3dpdGNoIChzdGF0cy5zeW5jX3N0YXR1cykge1xuICAgICAgICAgICAgY2FzZSAnc3luY2VkJzpcbiAgICAgICAgICAgICAgICBoZWFkZXJUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLnN0X1MzU3RhdHVzU3luY2VkO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2VDbGFzcyA9ICdwb3NpdGl2ZSc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICd1cGxvYWRpbmcnOlxuICAgICAgICAgICAgICAgIGhlYWRlclRleHQgPSBnbG9iYWxUcmFuc2xhdGUuc3RfUzNTdGF0dXNVcGxvYWRpbmc7XG4gICAgICAgICAgICAgICAgbWVzc2FnZUNsYXNzID0gJ2luZm8nO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnc3luY2luZyc6XG4gICAgICAgICAgICAgICAgaGVhZGVyVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5zdF9TM1N0YXR1c1N5bmNpbmdcbiAgICAgICAgICAgICAgICAgICAgLnJlcGxhY2UoJyVwZXJjZW50JScsIHN0YXRzLnN5bmNfcGVyY2VudGFnZSk7XG4gICAgICAgICAgICAgICAgbWVzc2FnZUNsYXNzID0gJ2luZm8nO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAncGVuZGluZyc6XG4gICAgICAgICAgICAgICAgaGVhZGVyVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5zdF9TM1N0YXR1c1BlbmRpbmc7XG4gICAgICAgICAgICAgICAgbWVzc2FnZUNsYXNzID0gJ3dhcm5pbmcnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZW1wdHknOlxuICAgICAgICAgICAgICAgIGhlYWRlclRleHQgPSBnbG9iYWxUcmFuc2xhdGUuc3RfUzNTdGF0dXNFbXB0eTtcbiAgICAgICAgICAgICAgICBtZXNzYWdlQ2xhc3MgPSAnaW5mbyc7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIGhlYWRlclRleHQgPSBnbG9iYWxUcmFuc2xhdGUuc3RfUzNTdGF0dXNEaXNhYmxlZDtcbiAgICAgICAgICAgICAgICBtZXNzYWdlQ2xhc3MgPSAnaW5mbyc7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBCdWlsZCBkZXRhaWxzIHRleHRcbiAgICAgICAgY29uc3QgZGV0YWlscyA9IFtdO1xuXG4gICAgICAgIC8vIEZpbGVzIGluIFMzXG4gICAgICAgIGlmIChzdGF0cy5maWxlc19pbl9zMyA+IDApIHtcbiAgICAgICAgICAgIGRldGFpbHMucHVzaChnbG9iYWxUcmFuc2xhdGUuc3RfUzNGaWxlc0luQ2xvdWRcbiAgICAgICAgICAgICAgICAucmVwbGFjZSgnJWNvdW50JScsIHN0YXRzLmZpbGVzX2luX3MzLnRvTG9jYWxlU3RyaW5nKCkpXG4gICAgICAgICAgICAgICAgLnJlcGxhY2UoJyVzaXplJScsIHMzU3RvcmFnZUluZGV4LmZvcm1hdFNpemUoc3RhdHMudG90YWxfc2l6ZV9zM19ieXRlcykpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEZpbGVzIHBlbmRpbmcgdXBsb2FkXG4gICAgICAgIGlmIChzdGF0cy5maWxlc19sb2NhbCA+IDApIHtcbiAgICAgICAgICAgIGRldGFpbHMucHVzaChnbG9iYWxUcmFuc2xhdGUuc3RfUzNGaWxlc1BlbmRpbmdcbiAgICAgICAgICAgICAgICAucmVwbGFjZSgnJWNvdW50JScsIHN0YXRzLmZpbGVzX2xvY2FsLnRvTG9jYWxlU3RyaW5nKCkpXG4gICAgICAgICAgICAgICAgLnJlcGxhY2UoJyVzaXplJScsIHMzU3RvcmFnZUluZGV4LmZvcm1hdFNpemUoc3RhdHMudG90YWxfc2l6ZV9sb2NhbF9ieXRlcykpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENvbm5lY3Rpb24gc3RhdHVzXG4gICAgICAgIGlmIChzdGF0cy5zM19jb25uZWN0ZWQpIHtcbiAgICAgICAgICAgIGRldGFpbHMucHVzaChnbG9iYWxUcmFuc2xhdGUuc3RfUzNDb25uZWN0ZWQpO1xuICAgICAgICB9IGVsc2UgaWYgKHN0YXRzLnMzX2VuYWJsZWQpIHtcbiAgICAgICAgICAgIGRldGFpbHMucHVzaChnbG9iYWxUcmFuc2xhdGUuc3RfUzNOb3RDb25uZWN0ZWQpO1xuICAgICAgICAgICAgbWVzc2FnZUNsYXNzID0gJ3dhcm5pbmcnO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gTGFzdCB1cGxvYWRcbiAgICAgICAgaWYgKHN0YXRzLmxhc3RfdXBsb2FkX2F0KSB7XG4gICAgICAgICAgICBkZXRhaWxzLnB1c2goZ2xvYmFsVHJhbnNsYXRlLnN0X1MzTGFzdFVwbG9hZFxuICAgICAgICAgICAgICAgIC5yZXBsYWNlKCclZGF0ZSUnLCBzdGF0cy5sYXN0X3VwbG9hZF9hdCkpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXBkYXRlIG1lc3NhZ2Ugc3R5bGluZ1xuICAgICAgICBzM1N0b3JhZ2VJbmRleC4kczNTdGF0c01lc3NhZ2VcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnaW5mbyBwb3NpdGl2ZSB3YXJuaW5nIG5lZ2F0aXZlJylcbiAgICAgICAgICAgIC5hZGRDbGFzcyhtZXNzYWdlQ2xhc3MpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBjb250ZW50XG4gICAgICAgIHMzU3RvcmFnZUluZGV4LiRzM1N0YXRzSGVhZGVyLnRleHQoaGVhZGVyVGV4dCk7XG4gICAgICAgIHMzU3RvcmFnZUluZGV4LiRzM1N0YXRzRGV0YWlscy5odG1sKGRldGFpbHMuam9pbignPGJyPicpKTtcblxuICAgICAgICAvLyBTaG93IGNvbnRhaW5lclxuICAgICAgICBzM1N0b3JhZ2VJbmRleC4kczNTdGF0c0NvbnRhaW5lci5zaG93KCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEZvcm1hdCBieXRlcyB0byBodW1hbi1yZWFkYWJsZSBzaXplXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IGJ5dGVzIC0gU2l6ZSBpbiBieXRlc1xuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IEZvcm1hdHRlZCBzaXplIHN0cmluZ1xuICAgICAqL1xuICAgIGZvcm1hdFNpemUoYnl0ZXMpIHtcbiAgICAgICAgaWYgKGJ5dGVzID09PSAwKSByZXR1cm4gJzAgQic7XG4gICAgICAgIGNvbnN0IGsgPSAxMDI0O1xuICAgICAgICBjb25zdCBzaXplcyA9IFsnQicsICdLQicsICdNQicsICdHQicsICdUQiddO1xuICAgICAgICBjb25zdCBpID0gTWF0aC5mbG9vcihNYXRoLmxvZyhieXRlcykgLyBNYXRoLmxvZyhrKSk7XG4gICAgICAgIHJldHVybiBwYXJzZUZsb2F0KChieXRlcyAvIE1hdGgucG93KGssIGkpKS50b0ZpeGVkKDIpKSArICcgJyArIHNpemVzW2ldO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBTMyBsb2NhbCBkYXlzIHNsaWRlciB2YWx1ZSBjaGFuZ2VzXG4gICAgICogQHBhcmFtIHtudW1iZXJ9IHZhbHVlIC0gU2xpZGVyIHZhbHVlICgwLTYpXG4gICAgICovXG4gICAgY2JBZnRlclNlbGVjdFMzTG9jYWxEYXlzU2xpZGVyKHZhbHVlKSB7XG4gICAgICAgIC8vIEdldCB0aGUgbG9jYWwgcmV0ZW50aW9uIHBlcmlvZCBjb3JyZXNwb25kaW5nIHRvIHRoZSBzbGlkZXIgdmFsdWVcbiAgICAgICAgY29uc3QgbG9jYWxEYXlzID0gczNTdG9yYWdlSW5kZXguczNMb2NhbERheXNQZXJpb2RbdmFsdWVdO1xuXG4gICAgICAgIC8vIFNldCB0aGUgZm9ybSB2YWx1ZSBmb3IgJ1BCWFJlY29yZFMzTG9jYWxEYXlzJ1xuICAgICAgICBzM1N0b3JhZ2VJbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnUEJYUmVjb3JkUzNMb2NhbERheXMnLCBsb2NhbERheXMpO1xuXG4gICAgICAgIC8vIFRyaWdnZXIgY2hhbmdlIGV2ZW50XG4gICAgICAgIEZvcm0uZGF0YUNoYW5nZWQoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlIFMzIGxvY2FsIHNsaWRlciBsaW1pdHMgYmFzZWQgb24gdG90YWwgcmV0ZW50aW9uIHBlcmlvZFxuICAgICAqIENhbGxlZCBieSBzdG9yYWdlLWluZGV4LmpzIHdoZW4gbWFpbiBzbGlkZXIgY2hhbmdlc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0b3RhbFBlcmlvZCAtIFRvdGFsIHJldGVudGlvbiBwZXJpb2QgaW4gZGF5cyAoJycgZm9yIGluZmluaXR5KVxuICAgICAqL1xuICAgIHVwZGF0ZVNsaWRlckxpbWl0cyh0b3RhbFBlcmlvZCkge1xuICAgICAgICAvLyBTdG9yZSBmb3IgcmVmZXJlbmNlXG4gICAgICAgIHMzU3RvcmFnZUluZGV4Lm1heExvY2FsUmV0ZW50aW9uRGF5cyA9IHRvdGFsUGVyaW9kO1xuXG4gICAgICAgIC8vIENhbGN1bGF0ZSBtYXggaW5kZXhcbiAgICAgICAgY29uc3QgbWF4SW5kZXggPSBzM1N0b3JhZ2VJbmRleC5nZXRNYXhMb2NhbFJldGVudGlvbkluZGV4KHRvdGFsUGVyaW9kKTtcblxuICAgICAgICAvLyBHZXQgY3VycmVudCB2YWx1ZSBiZWZvcmUgcmVpbml0aWFsaXppbmdcbiAgICAgICAgY29uc3QgY3VycmVudEluZGV4ID0gczNTdG9yYWdlSW5kZXguJHMzTG9jYWxEYXlzU2xpZGVyLnNsaWRlcignZ2V0IHZhbHVlJyk7XG5cbiAgICAgICAgLy8gQ2xhbXAgdmFsdWUgdG8gbmV3IG1heCBpZiBuZWVkZWRcbiAgICAgICAgY29uc3QgbmV3VmFsdWUgPSBNYXRoLm1pbihjdXJyZW50SW5kZXgsIG1heEluZGV4KTtcblxuICAgICAgICAvLyBSZWluaXRpYWxpemUgc2xpZGVyIHdpdGggbmV3IG1heCAoZml4ZXMgdmlzdWFsIHBvc2l0aW9uaW5nIGlzc3VlKVxuICAgICAgICBzM1N0b3JhZ2VJbmRleC5pbml0aWFsaXplU2xpZGVyKG1heEluZGV4LCBuZXdWYWx1ZSk7XG5cbiAgICAgICAgLy8gVXBkYXRlIGZvcm0gdmFsdWUgaWYgaXQgY2hhbmdlZFxuICAgICAgICBpZiAoY3VycmVudEluZGV4ID4gbWF4SW5kZXgpIHtcbiAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdQQlhSZWNvcmRTM0xvY2FsRGF5cycsIHMzU3RvcmFnZUluZGV4LnMzTG9jYWxEYXlzUGVyaW9kW21heEluZGV4XSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IG1heGltdW0gYWxsb3dlZCBsb2NhbCByZXRlbnRpb24gaW5kZXggYmFzZWQgb24gdG90YWwgcmV0ZW50aW9uIHBlcmlvZFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB0b3RhbFBlcmlvZCAtIFRvdGFsIHJldGVudGlvbiBwZXJpb2QgaW4gZGF5cyAoJycgZm9yIGluZmluaXR5KVxuICAgICAqIEByZXR1cm5zIHtudW1iZXJ9IE1heGltdW0gaW5kZXggZm9yIHMzTG9jYWxEYXlzUGVyaW9kIGFycmF5XG4gICAgICovXG4gICAgZ2V0TWF4TG9jYWxSZXRlbnRpb25JbmRleCh0b3RhbFBlcmlvZCkge1xuICAgICAgICAvLyBJZiB0b3RhbCBwZXJpb2QgaXMgaW5maW5pdHkgKGVtcHR5LCBudWxsLCB1bmRlZmluZWQsIDAsIG9yICcwJyksIGFsbG93IGFsbCBsb2NhbCBvcHRpb25zXG4gICAgICAgIGlmICghdG90YWxQZXJpb2QgfHwgdG90YWxQZXJpb2QgPT09ICcnIHx8IHRvdGFsUGVyaW9kID09PSAnMCcgfHwgdG90YWxQZXJpb2QgPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBzM1N0b3JhZ2VJbmRleC5zM0xvY2FsRGF5c1BlcmlvZC5sZW5ndGggLSAxO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdG90YWxEYXlzID0gcGFyc2VJbnQodG90YWxQZXJpb2QpO1xuICAgICAgICBsZXQgbWF4SW5kZXggPSBzM1N0b3JhZ2VJbmRleC5zM0xvY2FsRGF5c1BlcmlvZC5sZW5ndGggLSAxO1xuXG4gICAgICAgIC8vIEZpbmQgdGhlIGhpZ2hlc3QgbG9jYWwgcmV0ZW50aW9uIHRoYXQgaXMgbGVzcyB0aGFuIHRvdGFsXG4gICAgICAgIGZvciAobGV0IGkgPSBzM1N0b3JhZ2VJbmRleC5zM0xvY2FsRGF5c1BlcmlvZC5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgICAgICAgY29uc3QgbG9jYWxEYXlzID0gcGFyc2VJbnQoczNTdG9yYWdlSW5kZXguczNMb2NhbERheXNQZXJpb2RbaV0pO1xuICAgICAgICAgICAgaWYgKGxvY2FsRGF5cyA8IHRvdGFsRGF5cykge1xuICAgICAgICAgICAgICAgIG1heEluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBtYXhJbmRleDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVGVzdCBTMyBjb25uZWN0aW9uIHdpdGggY3VycmVudCBmb3JtIHZhbHVlc1xuICAgICAqL1xuICAgIHRlc3RTM0Nvbm5lY3Rpb24oKSB7XG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICBzM1N0b3JhZ2VJbmRleC4kdGVzdFMzQnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cbiAgICAgICAgLy8gR2V0IGZvcm0gdmFsdWVzXG4gICAgICAgIGNvbnN0IHRlc3REYXRhID0ge1xuICAgICAgICAgICAgczNfZW5kcG9pbnQ6IHMzU3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdzM19lbmRwb2ludCcpLFxuICAgICAgICAgICAgczNfcmVnaW9uOiBzM1N0b3JhZ2VJbmRleC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnczNfcmVnaW9uJyksXG4gICAgICAgICAgICBzM19idWNrZXQ6IHMzU3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdzM19idWNrZXQnKSxcbiAgICAgICAgICAgIHMzX2FjY2Vzc19rZXk6IHMzU3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdzM19hY2Nlc3Nfa2V5JyksXG4gICAgICAgICAgICBzM19zZWNyZXRfa2V5OiBzM1N0b3JhZ2VJbmRleC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnczNfc2VjcmV0X2tleScpXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gQ2FsbCBBUEkgdG8gdGVzdCBjb25uZWN0aW9uXG4gICAgICAgIFMzU3RvcmFnZUFQSS50ZXN0Q29ubmVjdGlvbih0ZXN0RGF0YSwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICAvLyBSZW1vdmUgbG9hZGluZyBzdGF0ZVxuICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguJHRlc3RTM0J1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UgJiYgcmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgbWVzc2FnZSA9IHJlc3BvbnNlLmRhdGE/Lm1lc3NhZ2UgfHwgZ2xvYmFsVHJhbnNsYXRlLnN0X1MzVGVzdFN1Y2Nlc3M7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0luZm9ybWF0aW9uKG1lc3NhZ2UsIGdsb2JhbFRyYW5zbGF0ZS5zdF9TM1Rlc3RDb25uZWN0aW9uSGVhZGVyKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gcmVzcG9uc2U/LmRhdGE/Lm1lc3NhZ2UgfHwgZ2xvYmFsVHJhbnNsYXRlLnN0X1MzVGVzdEZhaWxlZDtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IoZXJyb3JNZXNzYWdlLCBnbG9iYWxUcmFuc2xhdGUuc3RfUzNUZXN0Q29ubmVjdGlvbkhlYWRlcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIFMzIHNldHRpbmdzIGZyb20gQVBJXG4gICAgICovXG4gICAgbG9hZFNldHRpbmdzKCkge1xuICAgICAgICBTM1N0b3JhZ2VBUEkuZ2V0KChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZGF0YSA9IHJlc3BvbnNlLmRhdGE7XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgY2hlY2tib3ggc3RhdGVcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5zM19lbmFibGVkID09PSAnMScgfHwgZGF0YS5zM19lbmFibGVkID09PSAxIHx8IGRhdGEuczNfZW5hYmxlZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC4kczNFbmFibGVkQ2hlY2tib3guY2hlY2tib3goJ3NldCBjaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguJHMzRW5hYmxlZENoZWNrYm94LmNoZWNrYm94KCdzZXQgdW5jaGVja2VkJyk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU2V0IHRleHQgZmllbGRzXG4gICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ3MzX2VuZHBvaW50JywgZGF0YS5zM19lbmRwb2ludCB8fCAnJyk7XG4gICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ3MzX3JlZ2lvbicsIGRhdGEuczNfcmVnaW9uIHx8ICcnKTtcbiAgICAgICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnczNfYnVja2V0JywgZGF0YS5zM19idWNrZXQgfHwgJycpO1xuICAgICAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdzM19hY2Nlc3Nfa2V5JywgZGF0YS5zM19hY2Nlc3Nfa2V5IHx8ICcnKTtcbiAgICAgICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnczNfc2VjcmV0X2tleScsIGRhdGEuczNfc2VjcmV0X2tleSB8fCAnJyk7XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgUzMgbG9jYWwgcmV0ZW50aW9uIHNsaWRlclxuICAgICAgICAgICAgICAgIGNvbnN0IGxvY2FsRGF5cyA9IFN0cmluZyhkYXRhLlBCWFJlY29yZFMzTG9jYWxEYXlzKTtcbiAgICAgICAgICAgICAgICBsZXQgbG9jYWxJbmRleCA9IHMzU3RvcmFnZUluZGV4LnMzTG9jYWxEYXlzUGVyaW9kLmluZGV4T2YobG9jYWxEYXlzKTtcblxuICAgICAgICAgICAgICAgIC8vIEZhbGxiYWNrIGZvciBsZWdhY3kgdmFsdWVzIG5vdCBpbiBuZXcgYXJyYXkgLSBmaW5kIGNsb3Nlc3QgdmFsaWQgdmFsdWVcbiAgICAgICAgICAgICAgICBpZiAobG9jYWxJbmRleCA8IDApIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbG9jYWxEYXlzTnVtID0gcGFyc2VJbnQobG9jYWxEYXlzKSB8fCA3O1xuICAgICAgICAgICAgICAgICAgICAvLyBGaW5kIHRoZSBzbWFsbGVzdCB2YWx1ZSA+PSBsb2NhbERheXNOdW0sIG9yIHVzZSBmaXJzdCBpZiBhbGwgYXJlIGxhcmdlclxuICAgICAgICAgICAgICAgICAgICBsb2NhbEluZGV4ID0gMDtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBzM1N0b3JhZ2VJbmRleC5zM0xvY2FsRGF5c1BlcmlvZC5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHBhcnNlSW50KHMzU3RvcmFnZUluZGV4LnMzTG9jYWxEYXlzUGVyaW9kW2ldKSA+PSBsb2NhbERheXNOdW0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsb2NhbEluZGV4ID0gaTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGxvY2FsSW5kZXggPSBpOyAvLyBVc2UgbGFzdCBpZiBub25lIGZvdW5kXG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC4kczNMb2NhbERheXNTbGlkZXIuc2xpZGVyKCdzZXQgdmFsdWUnLCBsb2NhbEluZGV4KTtcbiAgICAgICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnUEJYUmVjb3JkUzNMb2NhbERheXMnLCBzM1N0b3JhZ2VJbmRleC5zM0xvY2FsRGF5c1BlcmlvZFtsb2NhbEluZGV4XSk7XG5cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdmlzaWJpbGl0eVxuICAgICAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LnRvZ2dsZVMzU2V0dGluZ3NWaXNpYmlsaXR5KCk7XG5cbiAgICAgICAgICAgICAgICAvLyBMb2FkIFMzIHN0YXRzIGlmIGVuYWJsZWRcbiAgICAgICAgICAgICAgICBpZiAoZGF0YS5zM19lbmFibGVkID09PSAnMScgfHwgZGF0YS5zM19lbmFibGVkID09PSAxIHx8IGRhdGEuczNfZW5hYmxlZCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC5sb2FkUzNTdGF0cygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGJlZm9yZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBGb3JtIHNldHRpbmdzXG4gICAgICogQHJldHVybnMge09iamVjdH0gVXBkYXRlZCBzZXR0aW5nc1xuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gczNTdG9yYWdlSW5kZXguJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBmb3JtIGhhcyBiZWVuIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBTZXJ2ZXIgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgIC8vIFJlbG9hZCBzZXR0aW5ncyB0byBzaG93IHVwZGF0ZWQgdmFsdWVzXG4gICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC5sb2FkU2V0dGluZ3MoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBzM1N0b3JhZ2VJbmRleC4kZm9ybU9iajtcbiAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uID0gczNTdG9yYWdlSW5kZXguJHN1Ym1pdEJ1dHRvbjtcbiAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQgPSBzM1N0b3JhZ2VJbmRleC4kZHJvcGRvd25TdWJtaXQ7XG4gICAgICAgIEZvcm0uJGRpcnJ0eUZpZWxkID0gczNTdG9yYWdlSW5kZXguJGRpcnJ0eUZpZWxkO1xuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBzM1N0b3JhZ2VJbmRleC52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBzM1N0b3JhZ2VJbmRleC5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IHMzU3RvcmFnZUluZGV4LmNiQWZ0ZXJTZW5kRm9ybTtcblxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUEkgc2V0dGluZ3MgZm9yIEZvcm0uanMgKHNpbmdsZXRvbiByZXNvdXJjZSlcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBhcGlPYmplY3Q6IFMzU3RvcmFnZUFQSSxcbiAgICAgICAgICAgIHNhdmVNZXRob2Q6ICdwYXRjaCcgLy8gVXNpbmcgUEFUQ0ggZm9yIHBhcnRpYWwgdXBkYXRlc1xuICAgICAgICB9O1xuXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH1cbn07XG5cbi8vIEluaXRpYWxpemUgd2hlbiBkb2N1bWVudCBpcyByZWFkeVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIHMzU3RvcmFnZUluZGV4LmluaXRpYWxpemUoKTtcbn0pO1xuIl19