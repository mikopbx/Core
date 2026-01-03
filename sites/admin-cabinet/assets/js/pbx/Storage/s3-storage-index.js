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
        value: /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/,
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
      s3StorageIndex.$s3SettingsGroup.show();
    } else {
      s3StorageIndex.$s3SettingsGroup.hide();
    }
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

        s3StorageIndex.toggleS3SettingsVisibility();
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9TdG9yYWdlL3MzLXN0b3JhZ2UtaW5kZXguanMiXSwibmFtZXMiOlsiczNTdG9yYWdlSW5kZXgiLCIkZm9ybU9iaiIsIiQiLCIkc3VibWl0QnV0dG9uIiwiJGRyb3Bkb3duU3VibWl0IiwiJGRpcnJ0eUZpZWxkIiwiJHMzTG9jYWxEYXlzU2xpZGVyIiwiJHMzRW5hYmxlZENoZWNrYm94IiwiJHMzU2V0dGluZ3NHcm91cCIsIiR0ZXN0UzNCdXR0b24iLCJzM0xvY2FsRGF5c1BlcmlvZCIsIm1heExvY2FsUmV0ZW50aW9uRGF5cyIsInZhbGlkYXRlUnVsZXMiLCJzM19lbmRwb2ludCIsImlkZW50aWZpZXIiLCJvcHRpb25hbCIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsInN0X1MzRW5kcG9pbnRJbnZhbGlkIiwiczNfYnVja2V0IiwidmFsdWUiLCJzdF9TM0J1Y2tldEludmFsaWQiLCJpbml0aWFsaXplU2xpZGVyIiwibWF4SW5kZXgiLCJpbml0aWFsVmFsdWUiLCJoYXNDbGFzcyIsInNsaWRlciIsIm1pbiIsIm1heCIsInN0ZXAiLCJzbW9vdGgiLCJhdXRvQWRqdXN0TGFiZWxzIiwiaW50ZXJwcmV0TGFiZWwiLCJsYWJlbHMiLCJzdF9EYXlzIiwic3RfMU1vbnRoIiwic3RfM01vbnRocyIsInN0XzZNb250aHMiLCJzdF8xWWVhciIsIm9uQ2hhbmdlIiwiY2JBZnRlclNlbGVjdFMzTG9jYWxEYXlzU2xpZGVyIiwidW5kZWZpbmVkIiwiaW5pdGlhbGl6ZSIsImRlZmF1bHRNYXhJbmRleCIsImxlbmd0aCIsImNoZWNrYm94IiwidG9nZ2xlUzNTZXR0aW5nc1Zpc2liaWxpdHkiLCJvbiIsInRlc3RTM0Nvbm5lY3Rpb24iLCJpbml0aWFsaXplRm9ybSIsImxvYWRTZXR0aW5ncyIsInNob3ciLCJoaWRlIiwibG9jYWxEYXlzIiwiZm9ybSIsIkZvcm0iLCJkYXRhQ2hhbmdlZCIsInVwZGF0ZVNsaWRlckxpbWl0cyIsInRvdGFsUGVyaW9kIiwiZ2V0TWF4TG9jYWxSZXRlbnRpb25JbmRleCIsImN1cnJlbnRJbmRleCIsIm5ld1ZhbHVlIiwiTWF0aCIsInRvdGFsRGF5cyIsInBhcnNlSW50IiwiaSIsImFkZENsYXNzIiwidGVzdERhdGEiLCJzM19yZWdpb24iLCJzM19hY2Nlc3Nfa2V5IiwiczNfc2VjcmV0X2tleSIsIlMzU3RvcmFnZUFQSSIsInRlc3RDb25uZWN0aW9uIiwicmVzcG9uc2UiLCJyZW1vdmVDbGFzcyIsInJlc3VsdCIsIm1lc3NhZ2UiLCJkYXRhIiwic3RfUzNUZXN0U3VjY2VzcyIsIlVzZXJNZXNzYWdlIiwic2hvd0luZm9ybWF0aW9uIiwic3RfUzNUZXN0Q29ubmVjdGlvbkhlYWRlciIsImVycm9yTWVzc2FnZSIsInN0X1MzVGVzdEZhaWxlZCIsInNob3dFcnJvciIsImdldCIsInMzX2VuYWJsZWQiLCJTdHJpbmciLCJQQlhSZWNvcmRTM0xvY2FsRGF5cyIsImxvY2FsSW5kZXgiLCJpbmRleE9mIiwibG9jYWxEYXlzTnVtIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwiY2JBZnRlclNlbmRGb3JtIiwic3VjY2VzcyIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJkb2N1bWVudCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLGNBQWMsR0FBRztBQUNuQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxRQUFRLEVBQUVDLENBQUMsQ0FBQyxrQkFBRCxDQUxROztBQU9uQjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQUFhLEVBQUVELENBQUMsQ0FBQyxrQkFBRCxDQVhHOztBQWFuQjtBQUNKO0FBQ0E7QUFDQTtBQUNJ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TUFBQUEsU0FBUyxFQUFFM0IsWUFGSTtBQUdmNEIsTUFBQUEsVUFBVSxFQUFFLE9BSEcsQ0FHSzs7QUFITCxLQUFuQjtBQU1BNUMsSUFBQUEsSUFBSSxDQUFDYixVQUFMO0FBQ0g7QUFqV2tCLENBQXZCLEMsQ0FvV0E7O0FBQ0ExQyxDQUFDLENBQUNvRyxRQUFELENBQUQsQ0FBWUMsS0FBWixDQUFrQixZQUFNO0FBQ3BCdkcsRUFBQUEsY0FBYyxDQUFDNEMsVUFBZjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBTM1N0b3JhZ2VBUEksIFVzZXJNZXNzYWdlLCAkICovXG5cbi8qKlxuICogUzMgU3RvcmFnZSBtYW5hZ2VtZW50IG1vZHVsZVxuICogSGFuZGxlcyBTMyBjbG91ZCBzdG9yYWdlIHNldHRpbmdzIChUYWIgMylcbiAqIFNlbmRzIGRhdGEgdG86IFBBVENIIC9wYnhjb3JlL2FwaS92My9zMy1zdG9yYWdlXG4gKi9cbmNvbnN0IHMzU3RvcmFnZUluZGV4ID0ge1xuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBTMyBzdG9yYWdlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI3MzLXN0b3JhZ2UtZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHN1Ym1pdCBidXR0b24gKHVuaXF1ZSB0byB0aGlzIGZvcm0pLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHN1Ym1pdEJ1dHRvbjogJCgnI3N1Ym1pdGJ1dHRvbi1zMycpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGRyb3Bkb3duIHN1Ym1pdCAodW5pcXVlIHRvIHRoaXMgZm9ybSkuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZHJvcGRvd25TdWJtaXQ6ICQoJyNkcm9wZG93blN1Ym1pdC1zMycpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGRpcnR5IGZpZWxkICh1bmlxdWUgdG8gdGhpcyBmb3JtKS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkaXJydHlGaWVsZDogJCgnI2RpcnJ0eS1zMycpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIFMzIGxvY2FsIHJldGVudGlvbiBwZXJpb2Qgc2xpZGVyLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHMzTG9jYWxEYXlzU2xpZGVyOiAkKCcjUEJYUmVjb3JkUzNMb2NhbERheXNTbGlkZXInKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIFMzIGVuYWJsZWQgY2hlY2tib3guXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkczNFbmFibGVkQ2hlY2tib3g6ICQoJyNzMy1lbmFibGVkLWNoZWNrYm94JyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciBTMyBzZXR0aW5ncyBncm91cCBjb250YWluZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkczNTZXR0aW5nc0dyb3VwOiAkKCcjczMtc2V0dGluZ3MtZ3JvdXAnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRlc3QgUzMgY29ubmVjdGlvbiBidXR0b24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkdGVzdFMzQnV0dG9uOiAkKCcjdGVzdC1zMy1jb25uZWN0aW9uJyksXG5cbiAgICAvKipcbiAgICAgKiBQb3NzaWJsZSBwZXJpb2QgdmFsdWVzIGZvciBTMyBsb2NhbCByZXRlbnRpb24gKGluIGRheXMpLlxuICAgICAqIFZhbHVlczogNywgMzAsIDkwLCAxODAsIDM2NSBkYXlzICgxIHdlZWssIDEvMy82IG1vbnRocywgMSB5ZWFyKVxuICAgICAqL1xuICAgIHMzTG9jYWxEYXlzUGVyaW9kOiBbJzcnLCAnMzAnLCAnOTAnLCAnMTgwJywgJzM2NSddLFxuXG4gICAgLyoqXG4gICAgICogTWF4aW11bSBhbGxvd2VkIGxvY2FsIHJldGVudGlvbiBwZXJpb2QgZnJvbSBtYWluIHN0b3JhZ2Ugc2xpZGVyXG4gICAgICogVXBkYXRlZCBieSBzdG9yYWdlLWluZGV4LmpzIHdoZW4gbWFpbiBzbGlkZXIgY2hhbmdlc1xuICAgICAqL1xuICAgIG1heExvY2FsUmV0ZW50aW9uRGF5czogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBTMyBmb3JtIGZpZWxkcy5cbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgczNfZW5kcG9pbnQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzM19lbmRwb2ludCcsXG4gICAgICAgICAgICBvcHRpb25hbDogdHJ1ZSxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAndXJsJyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuc3RfUzNFbmRwb2ludEludmFsaWRcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBzM19idWNrZXQ6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdzM19idWNrZXQnLFxuICAgICAgICAgICAgb3B0aW9uYWw6IHRydWUsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ3JlZ0V4cCcsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiAvXlthLXowLTldW2EtejAtOS1dezEsNjF9W2EtejAtOV0kLyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuc3RfUzNCdWNrZXRJbnZhbGlkXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBvciByZWluaXRpYWxpemUgdGhlIFMzIGxvY2FsIHJldGVudGlvbiBzbGlkZXJcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gbWF4SW5kZXggLSBNYXhpbXVtIHNsaWRlciBpbmRleCAoMC02KVxuICAgICAqIEBwYXJhbSB7bnVtYmVyfSBbaW5pdGlhbFZhbHVlXSAtIE9wdGlvbmFsIGluaXRpYWwgdmFsdWUgdG8gc2V0XG4gICAgICovXG4gICAgaW5pdGlhbGl6ZVNsaWRlcihtYXhJbmRleCwgaW5pdGlhbFZhbHVlKSB7XG4gICAgICAgIC8vIERlc3Ryb3kgZXhpc3Rpbmcgc2xpZGVyIGlmIGl0IGV4aXN0c1xuICAgICAgICBpZiAoczNTdG9yYWdlSW5kZXguJHMzTG9jYWxEYXlzU2xpZGVyLmhhc0NsYXNzKCdzbGlkZXInKSkge1xuICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguJHMzTG9jYWxEYXlzU2xpZGVyLnNsaWRlcignZGVzdHJveScpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ3JlYXRlIHNsaWRlciB3aXRoIHNwZWNpZmllZCBtYXhcbiAgICAgICAgczNTdG9yYWdlSW5kZXguJHMzTG9jYWxEYXlzU2xpZGVyXG4gICAgICAgICAgICAuc2xpZGVyKHtcbiAgICAgICAgICAgICAgICBtaW46IDAsXG4gICAgICAgICAgICAgICAgbWF4OiBtYXhJbmRleCxcbiAgICAgICAgICAgICAgICBzdGVwOiAxLFxuICAgICAgICAgICAgICAgIHNtb290aDogZmFsc2UsXG4gICAgICAgICAgICAgICAgYXV0b0FkanVzdExhYmVsczogZmFsc2UsXG4gICAgICAgICAgICAgICAgaW50ZXJwcmV0TGFiZWw6IGZ1bmN0aW9uICh2YWx1ZSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsYWJlbHMgPSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAwOiAnNyAnICsgZ2xvYmFsVHJhbnNsYXRlLnN0X0RheXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAxOiBnbG9iYWxUcmFuc2xhdGUuc3RfMU1vbnRoLFxuICAgICAgICAgICAgICAgICAgICAgICAgMjogZ2xvYmFsVHJhbnNsYXRlLnN0XzNNb250aHMsXG4gICAgICAgICAgICAgICAgICAgICAgICAzOiBnbG9iYWxUcmFuc2xhdGUuc3RfNk1vbnRocyxcbiAgICAgICAgICAgICAgICAgICAgICAgIDQ6IGdsb2JhbFRyYW5zbGF0ZS5zdF8xWWVhcixcbiAgICAgICAgICAgICAgICAgICAgfTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxhYmVsc1t2YWx1ZV0gfHwgJyc7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbkNoYW5nZTogczNTdG9yYWdlSW5kZXguY2JBZnRlclNlbGVjdFMzTG9jYWxEYXlzU2xpZGVyLFxuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2V0IGluaXRpYWwgdmFsdWUgaWYgcHJvdmlkZWRcbiAgICAgICAgaWYgKGluaXRpYWxWYWx1ZSAhPT0gdW5kZWZpbmVkICYmIGluaXRpYWxWYWx1ZSA+PSAwICYmIGluaXRpYWxWYWx1ZSA8PSBtYXhJbmRleCkge1xuICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguJHMzTG9jYWxEYXlzU2xpZGVyLnNsaWRlcignc2V0IHZhbHVlJywgaW5pdGlhbFZhbHVlLCBmYWxzZSk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSBTMyBzdG9yYWdlIG1vZHVsZVxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgUzMgbG9jYWwgcmV0ZW50aW9uIHBlcmlvZCBzbGlkZXIgd2l0aCBkZWZhdWx0IG1heCAoYWxsIG9wdGlvbnMgYXZhaWxhYmxlKVxuICAgICAgICBjb25zdCBkZWZhdWx0TWF4SW5kZXggPSBzM1N0b3JhZ2VJbmRleC5zM0xvY2FsRGF5c1BlcmlvZC5sZW5ndGggLSAxO1xuICAgICAgICBzM1N0b3JhZ2VJbmRleC5pbml0aWFsaXplU2xpZGVyKGRlZmF1bHRNYXhJbmRleCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBTMyBlbmFibGVkIGNoZWNrYm94XG4gICAgICAgIHMzU3RvcmFnZUluZGV4LiRzM0VuYWJsZWRDaGVja2JveC5jaGVja2JveCh7XG4gICAgICAgICAgICBvbkNoYW5nZTogczNTdG9yYWdlSW5kZXgudG9nZ2xlUzNTZXR0aW5nc1Zpc2liaWxpdHlcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVGVzdCBTMyBjb25uZWN0aW9uIGJ1dHRvbiBoYW5kbGVyXG4gICAgICAgIHMzU3RvcmFnZUluZGV4LiR0ZXN0UzNCdXR0b24ub24oJ2NsaWNrJywgczNTdG9yYWdlSW5kZXgudGVzdFMzQ29ubmVjdGlvbik7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtXG4gICAgICAgIHMzU3RvcmFnZUluZGV4LmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gTG9hZCBTMyBzZXR0aW5nc1xuICAgICAgICBzM1N0b3JhZ2VJbmRleC5sb2FkU2V0dGluZ3MoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVG9nZ2xlIFMzIHNldHRpbmdzIGdyb3VwIHZpc2liaWxpdHkgYmFzZWQgb24gY2hlY2tib3ggc3RhdGVcbiAgICAgKi9cbiAgICB0b2dnbGVTM1NldHRpbmdzVmlzaWJpbGl0eSgpIHtcbiAgICAgICAgaWYgKHMzU3RvcmFnZUluZGV4LiRzM0VuYWJsZWRDaGVja2JveC5jaGVja2JveCgnaXMgY2hlY2tlZCcpKSB7XG4gICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC4kczNTZXR0aW5nc0dyb3VwLnNob3coKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LiRzM1NldHRpbmdzR3JvdXAuaGlkZSgpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGFmdGVyIFMzIGxvY2FsIGRheXMgc2xpZGVyIHZhbHVlIGNoYW5nZXNcbiAgICAgKiBAcGFyYW0ge251bWJlcn0gdmFsdWUgLSBTbGlkZXIgdmFsdWUgKDAtNilcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VsZWN0UzNMb2NhbERheXNTbGlkZXIodmFsdWUpIHtcbiAgICAgICAgLy8gR2V0IHRoZSBsb2NhbCByZXRlbnRpb24gcGVyaW9kIGNvcnJlc3BvbmRpbmcgdG8gdGhlIHNsaWRlciB2YWx1ZVxuICAgICAgICBjb25zdCBsb2NhbERheXMgPSBzM1N0b3JhZ2VJbmRleC5zM0xvY2FsRGF5c1BlcmlvZFt2YWx1ZV07XG5cbiAgICAgICAgLy8gU2V0IHRoZSBmb3JtIHZhbHVlIGZvciAnUEJYUmVjb3JkUzNMb2NhbERheXMnXG4gICAgICAgIHMzU3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdQQlhSZWNvcmRTM0xvY2FsRGF5cycsIGxvY2FsRGF5cyk7XG5cbiAgICAgICAgLy8gVHJpZ2dlciBjaGFuZ2UgZXZlbnRcbiAgICAgICAgRm9ybS5kYXRhQ2hhbmdlZCgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVcGRhdGUgUzMgbG9jYWwgc2xpZGVyIGxpbWl0cyBiYXNlZCBvbiB0b3RhbCByZXRlbnRpb24gcGVyaW9kXG4gICAgICogQ2FsbGVkIGJ5IHN0b3JhZ2UtaW5kZXguanMgd2hlbiBtYWluIHNsaWRlciBjaGFuZ2VzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRvdGFsUGVyaW9kIC0gVG90YWwgcmV0ZW50aW9uIHBlcmlvZCBpbiBkYXlzICgnJyBmb3IgaW5maW5pdHkpXG4gICAgICovXG4gICAgdXBkYXRlU2xpZGVyTGltaXRzKHRvdGFsUGVyaW9kKSB7XG4gICAgICAgIC8vIFN0b3JlIGZvciByZWZlcmVuY2VcbiAgICAgICAgczNTdG9yYWdlSW5kZXgubWF4TG9jYWxSZXRlbnRpb25EYXlzID0gdG90YWxQZXJpb2Q7XG5cbiAgICAgICAgLy8gQ2FsY3VsYXRlIG1heCBpbmRleFxuICAgICAgICBjb25zdCBtYXhJbmRleCA9IHMzU3RvcmFnZUluZGV4LmdldE1heExvY2FsUmV0ZW50aW9uSW5kZXgodG90YWxQZXJpb2QpO1xuXG4gICAgICAgIC8vIEdldCBjdXJyZW50IHZhbHVlIGJlZm9yZSByZWluaXRpYWxpemluZ1xuICAgICAgICBjb25zdCBjdXJyZW50SW5kZXggPSBzM1N0b3JhZ2VJbmRleC4kczNMb2NhbERheXNTbGlkZXIuc2xpZGVyKCdnZXQgdmFsdWUnKTtcblxuICAgICAgICAvLyBDbGFtcCB2YWx1ZSB0byBuZXcgbWF4IGlmIG5lZWRlZFxuICAgICAgICBjb25zdCBuZXdWYWx1ZSA9IE1hdGgubWluKGN1cnJlbnRJbmRleCwgbWF4SW5kZXgpO1xuXG4gICAgICAgIC8vIFJlaW5pdGlhbGl6ZSBzbGlkZXIgd2l0aCBuZXcgbWF4IChmaXhlcyB2aXN1YWwgcG9zaXRpb25pbmcgaXNzdWUpXG4gICAgICAgIHMzU3RvcmFnZUluZGV4LmluaXRpYWxpemVTbGlkZXIobWF4SW5kZXgsIG5ld1ZhbHVlKTtcblxuICAgICAgICAvLyBVcGRhdGUgZm9ybSB2YWx1ZSBpZiBpdCBjaGFuZ2VkXG4gICAgICAgIGlmIChjdXJyZW50SW5kZXggPiBtYXhJbmRleCkge1xuICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ1BCWFJlY29yZFMzTG9jYWxEYXlzJywgczNTdG9yYWdlSW5kZXguczNMb2NhbERheXNQZXJpb2RbbWF4SW5kZXhdKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgbWF4aW11bSBhbGxvd2VkIGxvY2FsIHJldGVudGlvbiBpbmRleCBiYXNlZCBvbiB0b3RhbCByZXRlbnRpb24gcGVyaW9kXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHRvdGFsUGVyaW9kIC0gVG90YWwgcmV0ZW50aW9uIHBlcmlvZCBpbiBkYXlzICgnJyBmb3IgaW5maW5pdHkpXG4gICAgICogQHJldHVybnMge251bWJlcn0gTWF4aW11bSBpbmRleCBmb3IgczNMb2NhbERheXNQZXJpb2QgYXJyYXlcbiAgICAgKi9cbiAgICBnZXRNYXhMb2NhbFJldGVudGlvbkluZGV4KHRvdGFsUGVyaW9kKSB7XG4gICAgICAgIC8vIElmIHRvdGFsIHBlcmlvZCBpcyBpbmZpbml0eSAoZW1wdHksIG51bGwsIHVuZGVmaW5lZCwgMCwgb3IgJzAnKSwgYWxsb3cgYWxsIGxvY2FsIG9wdGlvbnNcbiAgICAgICAgaWYgKCF0b3RhbFBlcmlvZCB8fCB0b3RhbFBlcmlvZCA9PT0gJycgfHwgdG90YWxQZXJpb2QgPT09ICcwJyB8fCB0b3RhbFBlcmlvZCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIHMzU3RvcmFnZUluZGV4LnMzTG9jYWxEYXlzUGVyaW9kLmxlbmd0aCAtIDE7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB0b3RhbERheXMgPSBwYXJzZUludCh0b3RhbFBlcmlvZCk7XG4gICAgICAgIGxldCBtYXhJbmRleCA9IHMzU3RvcmFnZUluZGV4LnMzTG9jYWxEYXlzUGVyaW9kLmxlbmd0aCAtIDE7XG5cbiAgICAgICAgLy8gRmluZCB0aGUgaGlnaGVzdCBsb2NhbCByZXRlbnRpb24gdGhhdCBpcyBsZXNzIHRoYW4gdG90YWxcbiAgICAgICAgZm9yIChsZXQgaSA9IHMzU3RvcmFnZUluZGV4LnMzTG9jYWxEYXlzUGVyaW9kLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICAgICAgICBjb25zdCBsb2NhbERheXMgPSBwYXJzZUludChzM1N0b3JhZ2VJbmRleC5zM0xvY2FsRGF5c1BlcmlvZFtpXSk7XG4gICAgICAgICAgICBpZiAobG9jYWxEYXlzIDwgdG90YWxEYXlzKSB7XG4gICAgICAgICAgICAgICAgbWF4SW5kZXggPSBpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG1heEluZGV4O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBUZXN0IFMzIGNvbm5lY3Rpb24gd2l0aCBjdXJyZW50IGZvcm0gdmFsdWVzXG4gICAgICovXG4gICAgdGVzdFMzQ29ubmVjdGlvbigpIHtcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgIHMzU3RvcmFnZUluZGV4LiR0ZXN0UzNCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcgZGlzYWJsZWQnKTtcblxuICAgICAgICAvLyBHZXQgZm9ybSB2YWx1ZXNcbiAgICAgICAgY29uc3QgdGVzdERhdGEgPSB7XG4gICAgICAgICAgICBzM19lbmRwb2ludDogczNTdG9yYWdlSW5kZXguJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3MzX2VuZHBvaW50JyksXG4gICAgICAgICAgICBzM19yZWdpb246IHMzU3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdzM19yZWdpb24nKSxcbiAgICAgICAgICAgIHMzX2J1Y2tldDogczNTdG9yYWdlSW5kZXguJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3MzX2J1Y2tldCcpLFxuICAgICAgICAgICAgczNfYWNjZXNzX2tleTogczNTdG9yYWdlSW5kZXguJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3MzX2FjY2Vzc19rZXknKSxcbiAgICAgICAgICAgIHMzX3NlY3JldF9rZXk6IHMzU3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdzM19zZWNyZXRfa2V5JylcbiAgICAgICAgfTtcblxuICAgICAgICAvLyBDYWxsIEFQSSB0byB0ZXN0IGNvbm5lY3Rpb25cbiAgICAgICAgUzNTdG9yYWdlQVBJLnRlc3RDb25uZWN0aW9uKHRlc3REYXRhLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIHN0YXRlXG4gICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC4kdGVzdFMzQnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nIGRpc2FibGVkJyk7XG5cbiAgICAgICAgICAgIGlmIChyZXNwb25zZSAmJiByZXNwb25zZS5yZXN1bHQgPT09IHRydWUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBtZXNzYWdlID0gcmVzcG9uc2UuZGF0YT8ubWVzc2FnZSB8fCBnbG9iYWxUcmFuc2xhdGUuc3RfUzNUZXN0U3VjY2VzcztcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93SW5mb3JtYXRpb24obWVzc2FnZSwgZ2xvYmFsVHJhbnNsYXRlLnN0X1MzVGVzdENvbm5lY3Rpb25IZWFkZXIpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSByZXNwb25zZT8uZGF0YT8ubWVzc2FnZSB8fCBnbG9iYWxUcmFuc2xhdGUuc3RfUzNUZXN0RmFpbGVkO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihlcnJvck1lc3NhZ2UsIGdsb2JhbFRyYW5zbGF0ZS5zdF9TM1Rlc3RDb25uZWN0aW9uSGVhZGVyKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgUzMgc2V0dGluZ3MgZnJvbSBBUElcbiAgICAgKi9cbiAgICBsb2FkU2V0dGluZ3MoKSB7XG4gICAgICAgIFMzU3RvcmFnZUFQSS5nZXQoKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBkYXRhID0gcmVzcG9uc2UuZGF0YTtcblxuICAgICAgICAgICAgICAgIC8vIFNldCBjaGVja2JveCBzdGF0ZVxuICAgICAgICAgICAgICAgIGlmIChkYXRhLnMzX2VuYWJsZWQgPT09ICcxJyB8fCBkYXRhLnMzX2VuYWJsZWQgPT09IDEgfHwgZGF0YS5zM19lbmFibGVkID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LiRzM0VuYWJsZWRDaGVja2JveC5jaGVja2JveCgnc2V0IGNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC4kczNFbmFibGVkQ2hlY2tib3guY2hlY2tib3goJ3NldCB1bmNoZWNrZWQnKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgdGV4dCBmaWVsZHNcbiAgICAgICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnczNfZW5kcG9pbnQnLCBkYXRhLnMzX2VuZHBvaW50IHx8ICcnKTtcbiAgICAgICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAnczNfcmVnaW9uJywgZGF0YS5zM19yZWdpb24gfHwgJycpO1xuICAgICAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdzM19idWNrZXQnLCBkYXRhLnMzX2J1Y2tldCB8fCAnJyk7XG4gICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXguJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ3MzX2FjY2Vzc19rZXknLCBkYXRhLnMzX2FjY2Vzc19rZXkgfHwgJycpO1xuICAgICAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdzM19zZWNyZXRfa2V5JywgZGF0YS5zM19zZWNyZXRfa2V5IHx8ICcnKTtcblxuICAgICAgICAgICAgICAgIC8vIFNldCBTMyBsb2NhbCByZXRlbnRpb24gc2xpZGVyXG4gICAgICAgICAgICAgICAgY29uc3QgbG9jYWxEYXlzID0gU3RyaW5nKGRhdGEuUEJYUmVjb3JkUzNMb2NhbERheXMpO1xuICAgICAgICAgICAgICAgIGxldCBsb2NhbEluZGV4ID0gczNTdG9yYWdlSW5kZXguczNMb2NhbERheXNQZXJpb2QuaW5kZXhPZihsb2NhbERheXMpO1xuXG4gICAgICAgICAgICAgICAgLy8gRmFsbGJhY2sgZm9yIGxlZ2FjeSB2YWx1ZXMgbm90IGluIG5ldyBhcnJheSAtIGZpbmQgY2xvc2VzdCB2YWxpZCB2YWx1ZVxuICAgICAgICAgICAgICAgIGlmIChsb2NhbEluZGV4IDwgMCkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBsb2NhbERheXNOdW0gPSBwYXJzZUludChsb2NhbERheXMpIHx8IDc7XG4gICAgICAgICAgICAgICAgICAgIC8vIEZpbmQgdGhlIHNtYWxsZXN0IHZhbHVlID49IGxvY2FsRGF5c051bSwgb3IgdXNlIGZpcnN0IGlmIGFsbCBhcmUgbGFyZ2VyXG4gICAgICAgICAgICAgICAgICAgIGxvY2FsSW5kZXggPSAwO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHMzU3RvcmFnZUluZGV4LnMzTG9jYWxEYXlzUGVyaW9kLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAocGFyc2VJbnQoczNTdG9yYWdlSW5kZXguczNMb2NhbERheXNQZXJpb2RbaV0pID49IGxvY2FsRGF5c051bSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxvY2FsSW5kZXggPSBpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgbG9jYWxJbmRleCA9IGk7IC8vIFVzZSBsYXN0IGlmIG5vbmUgZm91bmRcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LiRzM0xvY2FsRGF5c1NsaWRlci5zbGlkZXIoJ3NldCB2YWx1ZScsIGxvY2FsSW5kZXgpO1xuICAgICAgICAgICAgICAgIHMzU3RvcmFnZUluZGV4LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdQQlhSZWNvcmRTM0xvY2FsRGF5cycsIHMzU3RvcmFnZUluZGV4LnMzTG9jYWxEYXlzUGVyaW9kW2xvY2FsSW5kZXhdKTtcblxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSB2aXNpYmlsaXR5XG4gICAgICAgICAgICAgICAgczNTdG9yYWdlSW5kZXgudG9nZ2xlUzNTZXR0aW5nc1Zpc2liaWxpdHkoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGJlZm9yZSBmb3JtIGlzIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBGb3JtIHNldHRpbmdzXG4gICAgICogQHJldHVybnMge09iamVjdH0gVXBkYXRlZCBzZXR0aW5nc1xuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gczNTdG9yYWdlSW5kZXguJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBhZnRlciBmb3JtIGhhcyBiZWVuIHNlbnRcbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBTZXJ2ZXIgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnN1Y2Nlc3MpIHtcbiAgICAgICAgICAgIC8vIFJlbG9hZCBzZXR0aW5ncyB0byBzaG93IHVwZGF0ZWQgdmFsdWVzXG4gICAgICAgICAgICBzM1N0b3JhZ2VJbmRleC5sb2FkU2V0dGluZ3MoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIEZvcm0uJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBzM1N0b3JhZ2VJbmRleC4kZm9ybU9iajtcbiAgICAgICAgRm9ybS4kc3VibWl0QnV0dG9uID0gczNTdG9yYWdlSW5kZXguJHN1Ym1pdEJ1dHRvbjtcbiAgICAgICAgRm9ybS4kZHJvcGRvd25TdWJtaXQgPSBzM1N0b3JhZ2VJbmRleC4kZHJvcGRvd25TdWJtaXQ7XG4gICAgICAgIEZvcm0uJGRpcnJ0eUZpZWxkID0gczNTdG9yYWdlSW5kZXguJGRpcnJ0eUZpZWxkO1xuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBzM1N0b3JhZ2VJbmRleC52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBzM1N0b3JhZ2VJbmRleC5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IHMzU3RvcmFnZUluZGV4LmNiQWZ0ZXJTZW5kRm9ybTtcblxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUEkgc2V0dGluZ3MgZm9yIEZvcm0uanMgKHNpbmdsZXRvbiByZXNvdXJjZSlcbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBhcGlPYmplY3Q6IFMzU3RvcmFnZUFQSSxcbiAgICAgICAgICAgIHNhdmVNZXRob2Q6ICdwYXRjaCcgLy8gVXNpbmcgUEFUQ0ggZm9yIHBhcnRpYWwgdXBkYXRlc1xuICAgICAgICB9O1xuXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH1cbn07XG5cbi8vIEluaXRpYWxpemUgd2hlbiBkb2N1bWVudCBpcyByZWFkeVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIHMzU3RvcmFnZUluZGV4LmluaXRpYWxpemUoKTtcbn0pO1xuIl19