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
      rules: [{
        type: 'url',
        prompt: globalTranslate.st_S3EndpointInvalid
      }]
    },
    s3_bucket: {
      identifier: 's3_bucket',
      optional: true,
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TdG9yYWdlL3MzLXN0b3JhZ2UtaW5kZXguanMiXSwibmFtZXMiOlsiczNTdG9yYWdlSW5kZXgiLCIkZm9ybU9iaiIsIiQiLCIkc3VibWl0QnV0dG9uIiwiJGRyb3Bkb3duU3VibWl0IiwiJGRpcnJ0eUZpZWxkIiwiJHMzTG9jYWxEYXlzU2xpZGVyIiwiJHMzRW5hYmxlZENoZWNrYm94IiwiJHMzU2V0dGluZ3NHcm91cCIsIiR0ZXN0UzNCdXR0b24iLCIkczNTdGF0c0NvbnRhaW5lciIsIiRzM1N0YXRzTWVzc2FnZSIsIiRzM1N0YXRzSGVhZGVyIiwiJHMzU3RhdHNEZXRhaWxzIiwiczNMb2NhbERheXNQZXJpb2QiLCJtYXhMb2NhbFJldGVudGlvbkRheXMiLCJ2YWxpZGF0ZVJ1bGVzIiwiczNfZW5kcG9pbnQiLCJpZGVudGlmaWVyIiwib3B0aW9uYWwiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJzdF9TM0VuZHBvaW50SW52YWxpZCIsInMzX2J1Y2tldCIsInZhbHVlIiwic3RfUzNCdWNrZXRJbnZhbGlkIiwiaW5pdGlhbGl6ZVNsaWRlciIsIm1heEluZGV4IiwiaW5pdGlhbFZhbHVlIiwiaGFzQ2xhc3MiLCJzbGlkZXIiLCJtaW4iLCJtYXgiLCJzdGVwIiwic21vb3RoIiwiYXV0b0FkanVzdExhYmVscyIsImludGVycHJldExhYmVsIiwibGFiZWxzIiwic3RfRGF5cyIsInN0XzFNb250aCIsInN0XzNNb250aHMiLCJzdF82TW9udGhzIiwic3RfMVllYXIiLCJvbkNoYW5nZSIsImNiQWZ0ZXJTZWxlY3RTM0xvY2FsRGF5c1NsaWRlciIsInVuZGVmaW5lZCIsImluaXRpYWxpemUiLCJkZWZhdWx0TWF4SW5kZXgiLCJsZW5ndGgiLCJjaGVja2JveCIsInRvZ2dsZVMzU2V0dGluZ3NWaXNpYmlsaXR5Iiwib24iLCJ0ZXN0UzNDb25uZWN0aW9uIiwiaW5pdGlhbGl6ZUZvcm0iLCJsb2FkU2V0dGluZ3MiLCJzaG93IiwibG9hZFMzU3RhdHMiLCJoaWRlIiwiUzNTdG9yYWdlQVBJIiwiZ2V0U3RhdHMiLCJyZXNwb25zZSIsInJlc3VsdCIsImRhdGEiLCJkaXNwbGF5UzNTdGF0cyIsInN0YXRzIiwiczNfZW5hYmxlZCIsImhlYWRlclRleHQiLCJtZXNzYWdlQ2xhc3MiLCJzeW5jX3N0YXR1cyIsInN0X1MzU3RhdHVzU3luY2VkIiwic3RfUzNTdGF0dXNVcGxvYWRpbmciLCJzdF9TM1N0YXR1c1N5bmNpbmciLCJyZXBsYWNlIiwic3luY19wZXJjZW50YWdlIiwic3RfUzNTdGF0dXNQZW5kaW5nIiwic3RfUzNTdGF0dXNFbXB0eSIsInN0X1MzU3RhdHVzRGlzYWJsZWQiLCJkZXRhaWxzIiwiZmlsZXNfaW5fczMiLCJwdXNoIiwic3RfUzNGaWxlc0luQ2xvdWQiLCJ0b0xvY2FsZVN0cmluZyIsImZvcm1hdFNpemUiLCJ0b3RhbF9zaXplX3MzX2J5dGVzIiwiZmlsZXNfbG9jYWwiLCJzdF9TM0ZpbGVzUGVuZGluZyIsInRvdGFsX3NpemVfbG9jYWxfYnl0ZXMiLCJzM19jb25uZWN0ZWQiLCJzdF9TM0Nvbm5lY3RlZCIsInN0X1MzTm90Q29ubmVjdGVkIiwibGFzdF91cGxvYWRfYXQiLCJzdF9TM0xhc3RVcGxvYWQiLCJyZW1vdmVDbGFzcyIsImFkZENsYXNzIiwidGV4dCIsImh0bWwiLCJqb2luIiwiYnl0ZXMiLCJrIiwic2l6ZXMiLCJpIiwiTWF0aCIsImZsb29yIiwibG9nIiwicGFyc2VGbG9hdCIsInBvdyIsInRvRml4ZWQiLCJsb2NhbERheXMiLCJmb3JtIiwiRm9ybSIsImRhdGFDaGFuZ2VkIiwidXBkYXRlU2xpZGVyTGltaXRzIiwidG90YWxQZXJpb2QiLCJnZXRNYXhMb2NhbFJldGVudGlvbkluZGV4IiwiY3VycmVudEluZGV4IiwibmV3VmFsdWUiLCJ0b3RhbERheXMiLCJwYXJzZUludCIsInRlc3REYXRhIiwiczNfcmVnaW9uIiwiczNfYWNjZXNzX2tleSIsInMzX3NlY3JldF9rZXkiLCJ0ZXN0Q29ubmVjdGlvbiIsIm1lc3NhZ2UiLCJzdF9TM1Rlc3RTdWNjZXNzIiwiVXNlck1lc3NhZ2UiLCJzaG93SW5mb3JtYXRpb24iLCJzdF9TM1Rlc3RDb25uZWN0aW9uSGVhZGVyIiwiZXJyb3JNZXNzYWdlIiwic3RfUzNUZXN0RmFpbGVkIiwic2hvd0Vycm9yIiwiZ2V0IiwiU3RyaW5nIiwiUEJYUmVjb3JkUzNMb2NhbERheXMiLCJsb2NhbEluZGV4IiwiaW5kZXhPZiIsImxvY2FsRGF5c051bSIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsImNiQWZ0ZXJTZW5kRm9ybSIsInN1Y2Nlc3MiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiZG9jdW1lbnQiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxjQUFjLEdBQUc7QUFDbkI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFQyxDQUFDLENBQUMsa0JBQUQsQ0FMUTs7QUFPbkI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFRCxDQUFDLENBQUMsa0JBQUQsQ0FYRzs7QUFhbkI7QUFDSjtBQUNBO0FBQ0E7QUFDSUUsRUFBQUEsZUFBZSxFQUFFRixDQUFDLENBQUMsb0JBQUQsQ0FqQkM7O0FBbUJuQjtBQUNKO0FBQ0E7QUFDQTtBQUNJRyxFQUFBQSxZQUFZLEVBQUVILENBQUMsQ0FBQyxZQUFELENBdkJJOztBQXlCbkI7QUFDSjtBQUNBO0FBQ0E7QUFDSUksRUFBQUEsa0JBQWtCLEVBQUVKLENBQUMsQ0FBQyw2QkFBRCxDQTdCRjs7QUErQm5CO0FBQ0o7QUFDQTtBQUNBO0FBQ0lLLEVBQUFBLGtCQUFrQixFQUFFTCxDQUFDLENBQUMsc0JBQUQsQ0FuQ0Y7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QStCLFVBQS9CO0FBQ0g7QUFDSixHQTNka0I7O0FBNmRuQjtBQUNKO0FBQ0E7QUFDSXZDLEVBQUFBLGNBaGVtQiw0QkFnZUY7QUFDYndELElBQUFBLElBQUksQ0FBQzlHLFFBQUwsR0FBZ0JELGNBQWMsQ0FBQ0MsUUFBL0I7QUFDQThHLElBQUFBLElBQUksQ0FBQzVHLGFBQUwsR0FBcUJILGNBQWMsQ0FBQ0csYUFBcEM7QUFDQTRHLElBQUFBLElBQUksQ0FBQzNHLGVBQUwsR0FBdUJKLGNBQWMsQ0FBQ0ksZUFBdEM7QUFDQTJHLElBQUFBLElBQUksQ0FBQzFHLFlBQUwsR0FBb0JMLGNBQWMsQ0FBQ0ssWUFBbkM7QUFDQTBHLElBQUFBLElBQUksQ0FBQy9GLGFBQUwsR0FBcUJoQixjQUFjLENBQUNnQixhQUFwQztBQUNBK0YsSUFBQUEsSUFBSSxDQUFDNEIsZ0JBQUwsR0FBd0IzSSxjQUFjLENBQUMySSxnQkFBdkM7QUFDQTVCLElBQUFBLElBQUksQ0FBQzhCLGVBQUwsR0FBdUI3SSxjQUFjLENBQUM2SSxlQUF0QyxDQVBhLENBU2I7O0FBQ0E5QixJQUFBQSxJQUFJLENBQUNnQyxXQUFMLEdBQW1CO0FBQ2ZDLE1BQUFBLE9BQU8sRUFBRSxJQURNO0FBRWZDLE1BQUFBLFNBQVMsRUFBRXJGLFlBRkk7QUFHZnNGLE1BQUFBLFVBQVUsRUFBRSxPQUhHLENBR0s7O0FBSEwsS0FBbkI7QUFNQW5DLElBQUFBLElBQUksQ0FBQy9ELFVBQUw7QUFDSDtBQWpma0IsQ0FBdkIsQyxDQW9mQTs7QUFDQTlDLENBQUMsQ0FBQ2lKLFFBQUQsQ0FBRCxDQUFZQyxLQUFaLENBQWtCLFlBQU07QUFDcEJwSixFQUFBQSxjQUFjLENBQUNnRCxVQUFmO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDI1IEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFMzU3RvcmFnZUFQSSwgVXNlck1lc3NhZ2UsICQgKi9cblxuLyoqXG4gKiBTMyBTdG9yYWdlIG1hbmFnZW1lbnQgbW9kdWxlXG4gKiBIYW5kbGVzIFMzIGNsb3VkIHN0b3JhZ2Ugc2V0dGluZ3MgKFRhYiAzKVxuICogU2VuZHMgZGF0YSB0bzogUEFUQ0ggL3BieGNvcmUvYXBpL3YzL3MzLXN0b3JhZ2VcbiAqL1xuY29uc3QgczNTdG9yYWdlSW5kZXggPSB7XG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIFMzIHN0b3JhZ2UgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjczMtc3RvcmFnZS1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgc3VibWl0IGJ1dHRvbiAodW5pcXVlIHRvIHRoaXMgZm9ybSkuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc3VibWl0QnV0dG9uOiAkKCcjc3VibWl0YnV0dG9uLXMzJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZHJvcGRvd24gc3VibWl0ICh1bmlxdWUgdG8gdGhpcyBmb3JtKS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkcm9wZG93blN1Ym1pdDogJCgnI2Ryb3Bkb3duU3VibWl0LXMzJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZGlydHkgZmllbGQgKHVuaXF1ZSB0byB0aGlzIGZvcm0pLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRpcnJ0eUZpZWxkOiAkKCcjZGlycnR5LXMzJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgUzMgbG9jYWwgcmV0ZW50aW9uIHBlcmlvZCBzbGlkZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkczNMb2NhbERheXNTbGlkZXI6ICQoJyNQQlhSZWNvcmRTM0xvY2FsRGF5c1NsaWRlcicpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgUzMgZW5hYmxlZCBjaGVja2JveC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzM0VuYWJsZWRDaGVja2JveDogJCgnI3MzLWVuYWJsZWQtY2hlY2tib3gnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIFMzIHNldHRpbmdzIGdyb3VwIGNvbnRhaW5lci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzM1NldHRpbmdzR3JvdXA6ICQoJyNzMy1zZXR0aW5ncy1ncm91cCcpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGVzdCBTMyBjb25uZWN0aW9uIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR0ZXN0UzNCdXR0b246ICQoJyN0ZXN0LXMzLWNvbm5lY3Rpb24nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIFMzIHN0YXRzIGNvbnRhaW5lci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzM1N0YXRzQ29udGFpbmVyOiAkKCcjczMtc3RhdHMtY29udGFpbmVyJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciBTMyBzdGF0cyBtZXNzYWdlIGVsZW1lbnQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkczNTdGF0c01lc3NhZ2U6ICQoJyNzMy1zdGF0cy1tZXNzYWdlJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciBTMyBzdGF0cyBoZWFkZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkczNTdGF0c0hlYWRlcjogJCgnI3MzLXN0YXRzLWhlYWRlcicpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgUzMgc3RhdHMgZGV0YWlscy5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzM1N0YXRzRGV0YWlsczogJCgnI3MzLXN0YXRzLWRldGFpbHMnKSxcblxuICAgIC8qKlxuICAgICAqIFBvc3NpYmxlIHBlcmlvZCB2YWx1ZXMgZm9yIFMzIGxvY2FsIHJldGVudGlvbiAoaW4gZGF5cykuXG4gICAgICogVmFsdWVzOiA3LCAzMCwgOTAsIDE4MCwgMzY1IGRheXMgKDEgd2VlaywgMS8zLzYgbW9udGhzLCAxIHllYXIpXG4gICAgICovXG4gICAgczNMb2NhbERheXNQZXJpb2Q6IFsnNycsICczMCcsICc5MCcsICcxODAnLCAnMzY1J10sXG5cbiAgICAvKipcbiAgICAgKiBNYXhpbXVtIGFsbG93ZWQgbG9jYWwgcmV0ZW50aW9uIHBlcmlvZCBmcm9tIG1haW4gc3RvcmFnZSBzbGlkZXJcbiAgICAgKiBVcGRhdGVkIGJ5IHN0b3JhZ2UtaW5kZXguanMgd2hlbiBtYWluIHNsaWRlciBjaGFuZ2VzXG4gICAgICovXG4gICAgbWF4TG9jYWxSZXRlbnRpb25EYXlzOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIFMzIGZvcm0gZmllbGRzLlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBzM19lbmRwb2ludDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3MzX2VuZHBvaW50JyxcbiAgICAgICAgICAgIG9wdGlvbmFsOiB0cnVlLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICd1cmwnLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5zdF9TM0VuZHBvaW50SW52YWxpZFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHMzX2J1Y2tldDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3MzX2J1Y2tldCcsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAncmVnRXhwJyxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IC9eW2EtejAtOV1bYS16MC05Li1dezEsNjF9W2EtejAtOV0kLyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuc3RfUzNCdWNrZXRJbnZhbGlkXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBvciByZWluaXRpYWxpemUgdGhlIFMzIGxvY2FsIHJldGVudGlvbiBzbGlkZXJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbWF4SW5kZXggLSBNYXhpbXVtIHNsaWRlciBpbmRleCAoMC02KVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbaW5pdGlhbFZhbHVlXSAtIE9wdGlvbmFsIGluaXRpYWwgdmFsdWUgdG8gc2V0XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVNsaWRlcihtYXhJbmRleCwgaW5pdGlhbFZhbHVlKSB7XG4gICAgICAgIC8vIERlc3Ryb3kgZXhpc3Rpbmcgc2xpZGVyIGlmIGl0IGV4aXN0c1xuICAgICAgICBpZiAoczNTdG9yYWdlSW5kZXguJHMzTG9jYWxEYXlzU2xpZGVyLmhhc0NsYXNzKCdzbGlkZXInKSkge1xuICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguJHMzTG9jYWxEYXlzU2xpZGVyLnNsaWRlcignZGVzdHJveScpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ3JlYXRlIHNsaWRlciB3aXRoIHNwZWNpZmllZCBtYXhcbiAgICAgICAgczNTdG9yYWdlSW5kZXguJHMzTG9jYWxEYXlzU2xpZGVyXG4gICAgICAgICAgICAuc2xpZGVyKHtcbiAgICAgICAgICAgICAgICBtaW46IDAsXG4gICAgICAgICAgICAgICAgbWF4OiBtYXhJbmRleCxcbiAgICAgICAgICAgICAgICBzdGVwOiAxLFxuICAgICAgICAgICAgICAgIHNtb290aDogZmFsc2UsXG4gICAgICAgICAgICAgICAgYXV0b0FkanVzdExhYmVsczogZmFsc2UsXG4gICAgICAgICAgICAgICAgaW50ZXJwcmV0TGFiZWw6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsYWJlbHMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAwOiAnNyAnICsgZ2xvYmFsVHJhbnNsYXRlLnN0X0RheXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAxOiBnbG9iYWxUcmFuc2xhdGUuc3RfMU1vbnRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgMjogZ2xvYmFsVHJhbnNsYXRlLnN0XzNNb250aHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAzOiBnbG9iYWxUcmFuc2xhdGUuc3RfNk1vbnRocyxcbiAgICAgICAgICAgICAgICAgICAgICAgIDQ6IGdsb2JhbFRyYW5zbGF0ZS5zdF8xWWVhcixcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxhYmVsc1t2YWx1ZV0gfHwgJyc7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogczNTdG9yYWdlSW5kZXguY2JBZnRlclNlbGVjdFMzTG9jYWxEYXlzU2xpZGVyLFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IGluaXRpYWwgdmFsdWUgaWYgcHJvdmlkZWRcbiAgICAgICAgaWYgKGluaXRpYWxWYWx1ZSAhPT0gdW5kZWZpbmVkICYmIGluaXRpYWxWYWx1ZSA+PSAwICYmIGluaXRpYWxWYWx1ZSA8PSBtYXhJbmRleCkge1xuICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguJHMzTG9jYWxEYXlzU2xpZGVyLnNsaWRlcignc2V0IHZhbHVlJywgaW5pdGlhbFZhbHVlLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBTMyBzdG9yYWdlIG1vZHVsZVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgUzMgbG9jYWwgcmV0ZW50aW9uIHBlcmlvZCBzbGlkZXIgd2l0aCBkZWZhdWx0IG1heCAoYWxsIG9wdGlvbnMgYXZhaWxhYmxlKVxuICAgICAgICBjb25zdCBkZWZhdWx0TWF4SW5kZXggPSBzM1N0b3JhZ2VJbmRleC5zM0xvY2FsRGF5c1BlcmlvZC5sZW5ndGggLSAxO1xuICAgICAgICBzM1N0b3JhZ2VJbmRleC5pbml0aWFsaXplU2xpZGVyKGRlZmF1bHRNYXhJbmRleCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTMyBlbmFibGVkIGNoZWNrYm94XG4gICAgICAgIHMzU3RvcmFnZUluZGV4LiRzM0VuYWJsZWRDaGVja2JveC5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZTogczNTdG9yYWdlSW5kZXgudG9nZ2xlUzNTZXR0aW5nc1Zpc2liaWxpdHlcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVGVzdCBTMyBjb25uZWN0aW9uIGJ1dHRvbiBoYW5kbGVyXG4gICAgICAgIHMzU3RvcmFnZUluZGV4LiR0ZXN0UzNCdXR0b24ub24oJ2NsaWNrJywgczNTdG9yYWdlSW5kZXgudGVzdFMzQ29ubmVjdGlvbik7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtXG4gICAgICAgIHMzU3RvcmFnZUluZGV4LmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gTG9hZCBTMyBzZXR0aW5nc1xuICAgICAgICBzM1N0b3JhZ2VJbmRleC5sb2FkU2V0dGluZ3MoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIFMzIHNldHRpbmdzIGdyb3VwIHZpc2liaWxpdHkgYmFzZWQgb24gY2hlY2tib3ggc3RhdGVcbiAgICAgKi9cbiAgICB0b2dnbGVTM1NldHRpbmdzVmlzaWJpbGl0eSgpIHtcbiAgICAgICAgaWYgKHMzU3RvcmFnZUluZGV4LiRzM0VuYWJsZWRDaGVja2JveC5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC4kczNTZXR0aW5nc0dyb3VwLnNob3coKTtcbiAgICAgICAgICAgIC8vIExvYWQgUzMgc3RhdHMgd2hlbiBzZXR0aW5ncyBhcmUgc2hvd25cbiAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LmxvYWRTM1N0YXRzKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC4kczNTZXR0aW5nc0dyb3VwLmhpZGUoKTtcbiAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LiRzM1N0YXRzQ29udGFpbmVyLmhpZGUoKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIFMzIHN5bmNocm9uaXphdGlvbiBzdGF0aXN0aWNzXG4gICAgICovXG4gICAgbG9hZFMzU3RhdHMoKSB7XG4gICAgICAgIFMzU3RvcmFnZUFQSS5nZXRTdGF0cygocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LmRpc3BsYXlTM1N0YXRzKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC4kczNTdGF0c0NvbnRhaW5lci5oaWRlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBEaXNwbGF5IFMzIHN5bmNocm9uaXphdGlvbiBzdGF0aXN0aWNzXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHN0YXRzIC0gU3RhdGlzdGljcyBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgZGlzcGxheVMzU3RhdHMoc3RhdHMpIHtcbiAgICAgICAgLy8gRG9uJ3Qgc2hvdyBpZiBTMyBpcyBkaXNhYmxlZFxuICAgICAgICBpZiAoIXN0YXRzLnMzX2VuYWJsZWQpIHtcbiAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LiRzM1N0YXRzQ29udGFpbmVyLmhpZGUoKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEJ1aWxkIGhlYWRlciBiYXNlZCBvbiBzeW5jIHN0YXR1c1xuICAgICAgICBsZXQgaGVhZGVyVGV4dCA9ICcnO1xuICAgICAgICBsZXQgbWVzc2FnZUNsYXNzID0gJ2luZm8nO1xuXG4gICAgICAgIHN3aXRjaCAoc3RhdHMuc3luY19zdGF0dXMpIHtcbiAgICAgICAgICAgIGNhc2UgJ3N5bmNlZCc6XG4gICAgICAgICAgICAgICAgaGVhZGVyVGV4dCA9IGdsb2JhbFRyYW5zbGF0ZS5zdF9TM1N0YXR1c1N5bmNlZDtcbiAgICAgICAgICAgICAgICBtZXNzYWdlQ2xhc3MgPSAncG9zaXRpdmUnO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAndXBsb2FkaW5nJzpcbiAgICAgICAgICAgICAgICBoZWFkZXJUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLnN0X1MzU3RhdHVzVXBsb2FkaW5nO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2VDbGFzcyA9ICdpbmZvJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3N5bmNpbmcnOlxuICAgICAgICAgICAgICAgIGhlYWRlclRleHQgPSBnbG9iYWxUcmFuc2xhdGUuc3RfUzNTdGF0dXNTeW5jaW5nXG4gICAgICAgICAgICAgICAgICAgIC5yZXBsYWNlKCclcGVyY2VudCUnLCBzdGF0cy5zeW5jX3BlcmNlbnRhZ2UpO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2VDbGFzcyA9ICdpbmZvJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3BlbmRpbmcnOlxuICAgICAgICAgICAgICAgIGhlYWRlclRleHQgPSBnbG9iYWxUcmFuc2xhdGUuc3RfUzNTdGF0dXNQZW5kaW5nO1xuICAgICAgICAgICAgICAgIG1lc3NhZ2VDbGFzcyA9ICd3YXJuaW5nJztcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2VtcHR5JzpcbiAgICAgICAgICAgICAgICBoZWFkZXJUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLnN0X1MzU3RhdHVzRW1wdHk7XG4gICAgICAgICAgICAgICAgbWVzc2FnZUNsYXNzID0gJ2luZm8nO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgICAgICAgICBoZWFkZXJUZXh0ID0gZ2xvYmFsVHJhbnNsYXRlLnN0X1MzU3RhdHVzRGlzYWJsZWQ7XG4gICAgICAgICAgICAgICAgbWVzc2FnZUNsYXNzID0gJ2luZm8nO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQnVpbGQgZGV0YWlscyB0ZXh0XG4gICAgICAgIGNvbnN0IGRldGFpbHMgPSBbXTtcblxuICAgICAgICAvLyBGaWxlcyBpbiBTM1xuICAgICAgICBpZiAoc3RhdHMuZmlsZXNfaW5fczMgPiAwKSB7XG4gICAgICAgICAgICBkZXRhaWxzLnB1c2goZ2xvYmFsVHJhbnNsYXRlLnN0X1MzRmlsZXNJbkNsb3VkXG4gICAgICAgICAgICAgICAgLnJlcGxhY2UoJyVjb3VudCUnLCBzdGF0cy5maWxlc19pbl9zMy50b0xvY2FsZVN0cmluZygpKVxuICAgICAgICAgICAgICAgIC5yZXBsYWNlKCclc2l6ZSUnLCBzM1N0b3JhZ2VJbmRleC5mb3JtYXRTaXplKHN0YXRzLnRvdGFsX3NpemVfczNfYnl0ZXMpKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBGaWxlcyBwZW5kaW5nIHVwbG9hZFxuICAgICAgICBpZiAoc3RhdHMuZmlsZXNfbG9jYWwgPiAwKSB7XG4gICAgICAgICAgICBkZXRhaWxzLnB1c2goZ2xvYmFsVHJhbnNsYXRlLnN0X1MzRmlsZXNQZW5kaW5nXG4gICAgICAgICAgICAgICAgLnJlcGxhY2UoJyVjb3VudCUnLCBzdGF0cy5maWxlc19sb2NhbC50b0xvY2FsZVN0cmluZygpKVxuICAgICAgICAgICAgICAgIC5yZXBsYWNlKCclc2l6ZSUnLCBzM1N0b3JhZ2VJbmRleC5mb3JtYXRTaXplKHN0YXRzLnRvdGFsX3NpemVfbG9jYWxfYnl0ZXMpKSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDb25uZWN0aW9uIHN0YXR1c1xuICAgICAgICBpZiAoc3RhdHMuczNfY29ubmVjdGVkKSB7XG4gICAgICAgICAgICBkZXRhaWxzLnB1c2goZ2xvYmFsVHJhbnNsYXRlLnN0X1MzQ29ubmVjdGVkKTtcbiAgICAgICAgfSBlbHNlIGlmIChzdGF0cy5zM19lbmFibGVkKSB7XG4gICAgICAgICAgICBkZXRhaWxzLnB1c2goZ2xvYmFsVHJhbnNsYXRlLnN0X1MzTm90Q29ubmVjdGVkKTtcbiAgICAgICAgICAgIG1lc3NhZ2VDbGFzcyA9ICd3YXJuaW5nJztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIExhc3QgdXBsb2FkXG4gICAgICAgIGlmIChzdGF0cy5sYXN0X3VwbG9hZF9hdCkge1xuICAgICAgICAgICAgZGV0YWlscy5wdXNoKGdsb2JhbFRyYW5zbGF0ZS5zdF9TM0xhc3RVcGxvYWRcbiAgICAgICAgICAgICAgICAucmVwbGFjZSgnJWRhdGUlJywgc3RhdHMubGFzdF91cGxvYWRfYXQpKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZSBtZXNzYWdlIHN0eWxpbmdcbiAgICAgICAgczNTdG9yYWdlSW5kZXguJHMzU3RhdHNNZXNzYWdlXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2luZm8gcG9zaXRpdmUgd2FybmluZyBuZWdhdGl2ZScpXG4gICAgICAgICAgICAuYWRkQ2xhc3MobWVzc2FnZUNsYXNzKTtcblxuICAgICAgICAvLyBVcGRhdGUgY29udGVudFxuICAgICAgICBzM1N0b3JhZ2VJbmRleC4kczNTdGF0c0hlYWRlci50ZXh0KGhlYWRlclRleHQpO1xuICAgICAgICBzM1N0b3JhZ2VJbmRleC4kczNTdGF0c0RldGFpbHMuaHRtbChkZXRhaWxzLmpvaW4oJzxicj4nKSk7XG5cbiAgICAgICAgLy8gU2hvdyBjb250YWluZXJcbiAgICAgICAgczNTdG9yYWdlSW5kZXguJHMzU3RhdHNDb250YWluZXIuc2hvdygpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGb3JtYXQgYnl0ZXMgdG8gaHVtYW4tcmVhZGFibGUgc2l6ZVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBieXRlcyAtIFNpemUgaW4gYnl0ZXNcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBGb3JtYXR0ZWQgc2l6ZSBzdHJpbmdcbiAgICAgKi9cbiAgICBmb3JtYXRTaXplKGJ5dGVzKSB7XG4gICAgICAgIGlmIChieXRlcyA9PT0gMCkgcmV0dXJuICcwIEInO1xuICAgICAgICBjb25zdCBrID0gMTAyNDtcbiAgICAgICAgY29uc3Qgc2l6ZXMgPSBbJ0InLCAnS0InLCAnTUInLCAnR0InLCAnVEInXTtcbiAgICAgICAgY29uc3QgaSA9IE1hdGguZmxvb3IoTWF0aC5sb2coYnl0ZXMpIC8gTWF0aC5sb2coaykpO1xuICAgICAgICByZXR1cm4gcGFyc2VGbG9hdCgoYnl0ZXMgLyBNYXRoLnBvdyhrLCBpKSkudG9GaXhlZCgyKSkgKyAnICcgKyBzaXplc1tpXTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgUzMgbG9jYWwgZGF5cyBzbGlkZXIgdmFsdWUgY2hhbmdlc1xuICAgICAqIEBwYXJhbSB7bnVtYmVyfSB2YWx1ZSAtIFNsaWRlciB2YWx1ZSAoMC02KVxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZWxlY3RTM0xvY2FsRGF5c1NsaWRlcih2YWx1ZSkge1xuICAgICAgICAvLyBHZXQgdGhlIGxvY2FsIHJldGVudGlvbiBwZXJpb2QgY29ycmVzcG9uZGluZyB0byB0aGUgc2xpZGVyIHZhbHVlXG4gICAgICAgIGNvbnN0IGxvY2FsRGF5cyA9IHMzU3RvcmFnZUluZGV4LnMzTG9jYWxEYXlzUGVyaW9kW3ZhbHVlXTtcblxuICAgICAgICAvLyBTZXQgdGhlIGZvcm0gdmFsdWUgZm9yICdQQlhSZWNvcmRTM0xvY2FsRGF5cydcbiAgICAgICAgczNTdG9yYWdlSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1BCWFJlY29yZFMzTG9jYWxEYXlzJywgbG9jYWxEYXlzKTtcblxuICAgICAgICAvLyBUcmlnZ2VyIGNoYW5nZSBldmVudFxuICAgICAgICBGb3JtLmRhdGFDaGFuZ2VkKCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZSBTMyBsb2NhbCBzbGlkZXIgbGltaXRzIGJhc2VkIG9uIHRvdGFsIHJldGVudGlvbiBwZXJpb2RcbiAgICAgKiBDYWxsZWQgYnkgc3RvcmFnZS1pbmRleC5qcyB3aGVuIG1haW4gc2xpZGVyIGNoYW5nZXNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdG90YWxQZXJpb2QgLSBUb3RhbCByZXRlbnRpb24gcGVyaW9kIGluIGRheXMgKCcnIGZvciBpbmZpbml0eSlcbiAgICAgKi9cbiAgICB1cGRhdGVTbGlkZXJMaW1pdHModG90YWxQZXJpb2QpIHtcbiAgICAgICAgLy8gU3RvcmUgZm9yIHJlZmVyZW5jZVxuICAgICAgICBzM1N0b3JhZ2VJbmRleC5tYXhMb2NhbFJldGVudGlvbkRheXMgPSB0b3RhbFBlcmlvZDtcblxuICAgICAgICAvLyBDYWxjdWxhdGUgbWF4IGluZGV4XG4gICAgICAgIGNvbnN0IG1heEluZGV4ID0gczNTdG9yYWdlSW5kZXguZ2V0TWF4TG9jYWxSZXRlbnRpb25JbmRleCh0b3RhbFBlcmlvZCk7XG5cbiAgICAgICAgLy8gR2V0IGN1cnJlbnQgdmFsdWUgYmVmb3JlIHJlaW5pdGlhbGl6aW5nXG4gICAgICAgIGNvbnN0IGN1cnJlbnRJbmRleCA9IHMzU3RvcmFnZUluZGV4LiRzM0xvY2FsRGF5c1NsaWRlci5zbGlkZXIoJ2dldCB2YWx1ZScpO1xuXG4gICAgICAgIC8vIENsYW1wIHZhbHVlIHRvIG5ldyBtYXggaWYgbmVlZGVkXG4gICAgICAgIGNvbnN0IG5ld1ZhbHVlID0gTWF0aC5taW4oY3VycmVudEluZGV4LCBtYXhJbmRleCk7XG5cbiAgICAgICAgLy8gUmVpbml0aWFsaXplIHNsaWRlciB3aXRoIG5ldyBtYXggKGZpeGVzIHZpc3VhbCBwb3NpdGlvbmluZyBpc3N1ZSlcbiAgICAgICAgczNTdG9yYWdlSW5kZXguaW5pdGlhbGl6ZVNsaWRlcihtYXhJbmRleCwgbmV3VmFsdWUpO1xuXG4gICAgICAgIC8vIFVwZGF0ZSBmb3JtIHZhbHVlIGlmIGl0IGNoYW5nZWRcbiAgICAgICAgaWYgKGN1cnJlbnRJbmRleCA+IG1heEluZGV4KSB7XG4gICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnUEJYUmVjb3JkUzNMb2NhbERheXMnLCBzM1N0b3JhZ2VJbmRleC5zM0xvY2FsRGF5c1BlcmlvZFttYXhJbmRleF0pO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBtYXhpbXVtIGFsbG93ZWQgbG9jYWwgcmV0ZW50aW9uIGluZGV4IGJhc2VkIG9uIHRvdGFsIHJldGVudGlvbiBwZXJpb2RcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdG90YWxQZXJpb2QgLSBUb3RhbCByZXRlbnRpb24gcGVyaW9kIGluIGRheXMgKCcnIGZvciBpbmZpbml0eSlcbiAgICAgKiBAcmV0dXJucyB7bnVtYmVyfSBNYXhpbXVtIGluZGV4IGZvciBzM0xvY2FsRGF5c1BlcmlvZCBhcnJheVxuICAgICAqL1xuICAgIGdldE1heExvY2FsUmV0ZW50aW9uSW5kZXgodG90YWxQZXJpb2QpIHtcbiAgICAgICAgLy8gSWYgdG90YWwgcGVyaW9kIGlzIGluZmluaXR5IChlbXB0eSwgbnVsbCwgdW5kZWZpbmVkLCAwLCBvciAnMCcpLCBhbGxvdyBhbGwgbG9jYWwgb3B0aW9uc1xuICAgICAgICBpZiAoIXRvdGFsUGVyaW9kIHx8IHRvdGFsUGVyaW9kID09PSAnJyB8fCB0b3RhbFBlcmlvZCA9PT0gJzAnIHx8IHRvdGFsUGVyaW9kID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gczNTdG9yYWdlSW5kZXguczNMb2NhbERheXNQZXJpb2QubGVuZ3RoIC0gMTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHRvdGFsRGF5cyA9IHBhcnNlSW50KHRvdGFsUGVyaW9kKTtcbiAgICAgICAgbGV0IG1heEluZGV4ID0gczNTdG9yYWdlSW5kZXguczNMb2NhbERheXNQZXJpb2QubGVuZ3RoIC0gMTtcblxuICAgICAgICAvLyBGaW5kIHRoZSBoaWdoZXN0IGxvY2FsIHJldGVudGlvbiB0aGF0IGlzIGxlc3MgdGhhbiB0b3RhbFxuICAgICAgICBmb3IgKGxldCBpID0gczNTdG9yYWdlSW5kZXguczNMb2NhbERheXNQZXJpb2QubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICAgICAgICAgIGNvbnN0IGxvY2FsRGF5cyA9IHBhcnNlSW50KHMzU3RvcmFnZUluZGV4LnMzTG9jYWxEYXlzUGVyaW9kW2ldKTtcbiAgICAgICAgICAgIGlmIChsb2NhbERheXMgPCB0b3RhbERheXMpIHtcbiAgICAgICAgICAgICAgICBtYXhJbmRleCA9IGk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbWF4SW5kZXg7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFRlc3QgUzMgY29ubmVjdGlvbiB3aXRoIGN1cnJlbnQgZm9ybSB2YWx1ZXNcbiAgICAgKi9cbiAgICB0ZXN0UzNDb25uZWN0aW9uKCkge1xuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgczNTdG9yYWdlSW5kZXguJHRlc3RTM0J1dHRvbi5hZGRDbGFzcygnbG9hZGluZyBkaXNhYmxlZCcpO1xuXG4gICAgICAgIC8vIEdldCBmb3JtIHZhbHVlc1xuICAgICAgICBjb25zdCB0ZXN0RGF0YSA9IHtcbiAgICAgICAgICAgIHMzX2VuZHBvaW50OiBzM1N0b3JhZ2VJbmRleC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnczNfZW5kcG9pbnQnKSxcbiAgICAgICAgICAgIHMzX3JlZ2lvbjogczNTdG9yYWdlSW5kZXguJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3MzX3JlZ2lvbicpLFxuICAgICAgICAgICAgczNfYnVja2V0OiBzM1N0b3JhZ2VJbmRleC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnczNfYnVja2V0JyksXG4gICAgICAgICAgICBzM19hY2Nlc3Nfa2V5OiBzM1N0b3JhZ2VJbmRleC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnczNfYWNjZXNzX2tleScpLFxuICAgICAgICAgICAgczNfc2VjcmV0X2tleTogczNTdG9yYWdlSW5kZXguJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3MzX3NlY3JldF9rZXknKVxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIENhbGwgQVBJIHRvIHRlc3QgY29ubmVjdGlvblxuICAgICAgICBTM1N0b3JhZ2VBUEkudGVzdENvbm5lY3Rpb24odGVzdERhdGEsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgc3RhdGVcbiAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LiR0ZXN0UzNCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlICYmIHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSByZXNwb25zZS5kYXRhPy5tZXNzYWdlIHx8IGdsb2JhbFRyYW5zbGF0ZS5zdF9TM1Rlc3RTdWNjZXNzO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dJbmZvcm1hdGlvbihtZXNzYWdlLCBnbG9iYWxUcmFuc2xhdGUuc3RfUzNUZXN0Q29ubmVjdGlvbkhlYWRlcik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlPy5kYXRhPy5tZXNzYWdlIHx8IGdsb2JhbFRyYW5zbGF0ZS5zdF9TM1Rlc3RGYWlsZWQ7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKGVycm9yTWVzc2FnZSwgZ2xvYmFsVHJhbnNsYXRlLnN0X1MzVGVzdENvbm5lY3Rpb25IZWFkZXIpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBTMyBzZXR0aW5ncyBmcm9tIEFQSVxuICAgICAqL1xuICAgIGxvYWRTZXR0aW5ncygpIHtcbiAgICAgICAgUzNTdG9yYWdlQVBJLmdldCgocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSByZXNwb25zZS5kYXRhO1xuXG4gICAgICAgICAgICAgICAgLy8gU2V0IGNoZWNrYm94IHN0YXRlXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuczNfZW5hYmxlZCA9PT0gJzEnIHx8IGRhdGEuczNfZW5hYmxlZCA9PT0gMSB8fCBkYXRhLnMzX2VuYWJsZWQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguJHMzRW5hYmxlZENoZWNrYm94LmNoZWNrYm94KCdzZXQgY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LiRzM0VuYWJsZWRDaGVja2JveC5jaGVja2JveCgnc2V0IHVuY2hlY2tlZCcpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFNldCB0ZXh0IGZpZWxkc1xuICAgICAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdzM19lbmRwb2ludCcsIGRhdGEuczNfZW5kcG9pbnQgfHwgJycpO1xuICAgICAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdzM19yZWdpb24nLCBkYXRhLnMzX3JlZ2lvbiB8fCAnJyk7XG4gICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ3MzX2J1Y2tldCcsIGRhdGEuczNfYnVja2V0IHx8ICcnKTtcbiAgICAgICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnczNfYWNjZXNzX2tleScsIGRhdGEuczNfYWNjZXNzX2tleSB8fCAnJyk7XG4gICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ3MzX3NlY3JldF9rZXknLCBkYXRhLnMzX3NlY3JldF9rZXkgfHwgJycpO1xuXG4gICAgICAgICAgICAgICAgLy8gU2V0IFMzIGxvY2FsIHJldGVudGlvbiBzbGlkZXJcbiAgICAgICAgICAgICAgICBjb25zdCBsb2NhbERheXMgPSBTdHJpbmcoZGF0YS5QQlhSZWNvcmRTM0xvY2FsRGF5cyk7XG4gICAgICAgICAgICAgICAgbGV0IGxvY2FsSW5kZXggPSBzM1N0b3JhZ2VJbmRleC5zM0xvY2FsRGF5c1BlcmlvZC5pbmRleE9mKGxvY2FsRGF5cyk7XG5cbiAgICAgICAgICAgICAgICAvLyBGYWxsYmFjayBmb3IgbGVnYWN5IHZhbHVlcyBub3QgaW4gbmV3IGFycmF5IC0gZmluZCBjbG9zZXN0IHZhbGlkIHZhbHVlXG4gICAgICAgICAgICAgICAgaWYgKGxvY2FsSW5kZXggPCAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGxvY2FsRGF5c051bSA9IHBhcnNlSW50KGxvY2FsRGF5cykgfHwgNztcbiAgICAgICAgICAgICAgICAgICAgLy8gRmluZCB0aGUgc21hbGxlc3QgdmFsdWUgPj0gbG9jYWxEYXlzTnVtLCBvciB1c2UgZmlyc3QgaWYgYWxsIGFyZSBsYXJnZXJcbiAgICAgICAgICAgICAgICAgICAgbG9jYWxJbmRleCA9IDA7XG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgczNTdG9yYWdlSW5kZXguczNMb2NhbERheXNQZXJpb2QubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChwYXJzZUludChzM1N0b3JhZ2VJbmRleC5zM0xvY2FsRGF5c1BlcmlvZFtpXSkgPj0gbG9jYWxEYXlzTnVtKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbG9jYWxJbmRleCA9IGk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBsb2NhbEluZGV4ID0gaTsgLy8gVXNlIGxhc3QgaWYgbm9uZSBmb3VuZFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguJHMzTG9jYWxEYXlzU2xpZGVyLnNsaWRlcignc2V0IHZhbHVlJywgbG9jYWxJbmRleCk7XG4gICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1BCWFJlY29yZFMzTG9jYWxEYXlzJywgczNTdG9yYWdlSW5kZXguczNMb2NhbERheXNQZXJpb2RbbG9jYWxJbmRleF0pO1xuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHZpc2liaWxpdHlcbiAgICAgICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC50b2dnbGVTM1NldHRpbmdzVmlzaWJpbGl0eSgpO1xuXG4gICAgICAgICAgICAgICAgLy8gTG9hZCBTMyBzdGF0cyBpZiBlbmFibGVkXG4gICAgICAgICAgICAgICAgaWYgKGRhdGEuczNfZW5hYmxlZCA9PT0gJzEnIHx8IGRhdGEuczNfZW5hYmxlZCA9PT0gMSB8fCBkYXRhLnMzX2VuYWJsZWQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXgubG9hZFMzU3RhdHMoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBiZWZvcmUgZm9ybSBpcyBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gRm9ybSBzZXR0aW5nc1xuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IFVwZGF0ZWQgc2V0dGluZ3NcbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IHMzU3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgYWZ0ZXIgZm9ybSBoYXMgYmVlbiBzZW50XG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gU2VydmVyIHJlc3BvbnNlXG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5zdWNjZXNzKSB7XG4gICAgICAgICAgICAvLyBSZWxvYWQgc2V0dGluZ3MgdG8gc2hvdyB1cGRhdGVkIHZhbHVlc1xuICAgICAgICAgICAgczNTdG9yYWdlSW5kZXgubG9hZFNldHRpbmdzKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBGb3JtLiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gczNTdG9yYWdlSW5kZXguJGZvcm1PYmo7XG4gICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbiA9IHMzU3RvcmFnZUluZGV4LiRzdWJtaXRCdXR0b247XG4gICAgICAgIEZvcm0uJGRyb3Bkb3duU3VibWl0ID0gczNTdG9yYWdlSW5kZXguJGRyb3Bkb3duU3VibWl0O1xuICAgICAgICBGb3JtLiRkaXJydHlGaWVsZCA9IHMzU3RvcmFnZUluZGV4LiRkaXJydHlGaWVsZDtcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gczNTdG9yYWdlSW5kZXgudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gczNTdG9yYWdlSW5kZXguY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBzM1N0b3JhZ2VJbmRleC5jYkFmdGVyU2VuZEZvcm07XG5cbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIHNldHRpbmdzIGZvciBGb3JtLmpzIChzaW5nbGV0b24gcmVzb3VyY2UpXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgYXBpT2JqZWN0OiBTM1N0b3JhZ2VBUEksXG4gICAgICAgICAgICBzYXZlTWV0aG9kOiAncGF0Y2gnIC8vIFVzaW5nIFBBVENIIGZvciBwYXJ0aWFsIHVwZGF0ZXNcbiAgICAgICAgfTtcblxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9XG59O1xuXG4vLyBJbml0aWFsaXplIHdoZW4gZG9jdW1lbnQgaXMgcmVhZHlcbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBzM1N0b3JhZ2VJbmRleC5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==