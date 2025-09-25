"use strict";

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, globalTranslate, Form, PbxApi, sndPlayer, SoundFilesAPI, UserMessage, Config, FileUploadEventHandler, FilesAPI, SystemAPI */

/**
 * Sound file modification module with REST API integration
 * This module replaces sound-file-modify.js with REST API calls while preserving
 * all existing functionality including file upload, audio recording, and player
 *
 * @module soundFileModifyRest
 */
var soundFileModifyRest = {
  /**
   * Array to store paths of files to be deleted after save
   * @type {Array}
   */
  trashBin: [],

  /**
   * jQuery object for the sound upload button.
   * @type {jQuery}
   */
  $soundUploadButton: $('#upload-sound-file'),

  /**
   * jQuery object for the sound file name input.
   * @type {jQuery}
   */
  $soundFileName: $('#name'),

  /**
   * jQuery object for the audio player.
   * @type {jQuery}
   */
  $audioPlayer: $('#audio-player'),

  /**
   * jQuery object for the submit button.
   * @type {jQuery}
   */
  $submitButton: $('#submitbutton'),

  /**
   * The Blob URL object.
   * @type {Blob}
   */
  blob: window.URL || window.webkitURL,

  /**
   * jQuery object for the form.
   * @type {jQuery}
   */
  $formObj: $('#sound-file-form'),

  /**
   * jQuery object for the form dropdowns.
   * @type {jQuery}
   */
  $dropDowns: $('#sound-file-form .dropdown'),

  /**
   * Validation rules for the form fields before submission.
   *
   * @type {object}
   */
  validateRules: {
    name: {
      identifier: 'name',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.sf_ValidationFileNameIsEmpty
      }]
    },
    path: {
      identifier: 'path',
      rules: [{
        type: 'empty',
        prompt: globalTranslate.sf_ValidationFileNotSelected
      }]
    }
  },

  /**
   * Initializes the sound file modification functionality.
   */
  initialize: function initialize() {
    // Initialize dropdowns
    soundFileModifyRest.$dropDowns.dropdown(); // Load form data from REST API

    soundFileModifyRest.loadFormData(); // Initialize form validation and submission

    soundFileModifyRest.initializeForm(); // Initialize file upload using FilesAPI.attachToBtn for unified behavior

    FilesAPI.attachToBtn('upload-sound-file', ['wav', 'mp3', 'ogg', 'm4a', 'aac'], function (action, params) {
      switch (action) {
        case 'fileAdded':
          if (params.file) {
            // Update name field with filename without extension
            soundFileModifyRest.$soundFileName.val(params.file.name.replace(/\.[^/.]+$/, '')); // Create blob URL for preview

            soundFileModifyRest.blob = window.URL || window.webkitURL;
            var fileURL = soundFileModifyRest.blob.createObjectURL(params.file.file);
            sndPlayer.UpdateSource(fileURL);
          }

          break;

        case 'fileSuccess':
        case 'fileProgress':
        case 'uploadStart':
        case 'error':
        case 'complete':
          // Forward all other events to the original callback
          soundFileModifyRest.cbUploadResumable(action, params);
          break;
      }
    }); // Listen for data changes to clear cache

    window.addEventListener('ConfigDataChanged', soundFileModifyRest.cbOnDataChanged);
  },

  /**
   * Load form data from REST API
   */
  loadFormData: function loadFormData() {
    var recordId = soundFileModifyRest.getRecordId(); // Show loading state

    soundFileModifyRest.$formObj.addClass('loading');
    SoundFilesAPI.getRecord(recordId, function (response) {
      soundFileModifyRest.$formObj.removeClass('loading');

      if (response.result) {
        soundFileModifyRest.populateForm(response.data);
      } else if (recordId && recordId !== 'new') {
        var _response$messages;

        // Show error if trying to load non-existent record
        UserMessage.showError(((_response$messages = response.messages) === null || _response$messages === void 0 ? void 0 : _response$messages.error) || 'Failed to load sound file data'); // Redirect to index after delay

        setTimeout(function () {
          window.location.href = "".concat(globalRootUrl, "sound-files/index");
        }, 3000);
      }
    });
  },

  /**
   * Get record ID from hidden input field
   * @returns {string} Record ID or empty string for new records
   */
  getRecordId: function getRecordId() {
    // Get record ID from hidden input set by controller
    var recordIdValue = $('#id').val(); // Check if it's a category name (custom/moh) or actual ID

    if (recordIdValue === 'custom' || recordIdValue === 'moh') {
      // This is a new record with category preset
      return '';
    }

    return recordIdValue || '';
  },

  /**
   * Populate form with data
   * @param {object} data - Sound file data from API
   */
  populateForm: function populateForm(data) {
    // Use unified silent population approach
    Form.populateFormSilently(data, {
      afterPopulate: function afterPopulate(formData) {
        // Update audio player if path exists
        if (formData.path) {
          // Use new sound-files endpoint for MOH/IVR/system sounds
          var audioUrl = "/pbxcore/api/v3/sound-files:playback?view=".concat(formData.path);
          sndPlayer.UpdateSource(audioUrl);
        } // Save initial values for dirrity checking


        if (Form.enableDirrity) {
          Form.saveInitialValues();
        }
      }
    });
  },

  /**
   * Clears caches if data changes.
   */
  cbOnDataChanged: function cbOnDataChanged() {// Clear REST API cache if needed - handled by API layer
  },

  /**
   * Callback function for file upload with chunks and merge.
   * @param {string} action - The action performed during the upload.
   * @param {Object} params - Additional parameters related to the upload.
   */
  cbUploadResumable: function cbUploadResumable(action, params) {
    switch (action) {
      case 'fileSuccess':
        var response = PbxApi.tryParseJSON(params.response);

        if (response !== false && response.data.filename !== undefined) {
          soundFileModifyRest.$soundFileName.val(params.file.fileName);
          soundFileModifyRest.checkStatusFileMerging(params.response);
        } else {
          UserMessage.showMultiString(params, globalTranslate.sf_UploadError);
        }

        break;

      case 'uploadStart':
        soundFileModifyRest.$formObj.addClass('loading');
        break;

      case 'error':
        soundFileModifyRest.$submitButton.removeClass('loading');
        soundFileModifyRest.$formObj.removeClass('loading');
        UserMessage.showMultiString(params, globalTranslate.sf_UploadError);
        break;

      default:
    }
  },

  /**
   * Checks the status of file merging.
   * @param {string} response - The response from the file merging status function.
   */
  checkStatusFileMerging: function checkStatusFileMerging(response) {
    if (response === undefined || PbxApi.tryParseJSON(response) === false) {
      UserMessage.showMultiString("".concat(globalTranslate.sf_UploadError));
      return;
    }

    var json = JSON.parse(response);

    if (json === undefined || json.data === undefined) {
      UserMessage.showMultiString("".concat(globalTranslate.sf_UploadError));
      return;
    }

    var uploadId = json.data.upload_id;
    var filePath = json.data.filename; // NEW: Subscribe to EventBus instead of using polling worker

    FileUploadEventHandler.subscribe(uploadId, {
      onMergeStarted: function onMergeStarted(data) {
        soundFileModifyRest.$submitButton.addClass('loading');
        soundFileModifyRest.$formObj.addClass('loading');
      },
      onMergeProgress: function onMergeProgress(data) {
        // Update progress indicator if needed
        console.log("Sound file merge progress: ".concat(data.progress, "%"));
      },
      onMergeComplete: function onMergeComplete(data) {
        soundFileModifyRest.$submitButton.removeClass('loading');
        soundFileModifyRest.$formObj.removeClass('loading'); // Perform conversion after merge - use the filePath from the response

        var category = soundFileModifyRest.$formObj.form('get value', 'category');
        SystemAPI.convertAudioFile({
          filename: filePath,
          category: category
        }, soundFileModifyRest.cbAfterConvertFile);
      },
      onError: function onError(data) {
        soundFileModifyRest.$submitButton.removeClass('loading');
        soundFileModifyRest.$formObj.removeClass('loading');
        UserMessage.showMultiString(data.error || globalTranslate.sf_UploadError);
      }
    });
  },

  /**
   * Callback function after the file is converted to MP3 format.
   * @param {string} filename - The filename of the converted file.
   */
  cbAfterConvertFile: function cbAfterConvertFile(filename) {
    if (filename === false) {
      UserMessage.showMultiString("".concat(globalTranslate.sf_UploadError));
    } else {
      // Add old file to trash bin for deletion after save
      var oldPath = soundFileModifyRest.$formObj.form('get value', 'path');

      if (oldPath) {
        soundFileModifyRest.trashBin.push(oldPath);
      } // Update form with new file path


      soundFileModifyRest.$formObj.form('set value', 'path', filename);
      soundFileModifyRest.$soundFileName.trigger('change'); // Update player with new file using sound-files endpoint

      sndPlayer.UpdateSource("/pbxcore/api/v3/sound-files:playback?view=".concat(filename)); // Remove loading states

      soundFileModifyRest.$submitButton.removeClass('loading');
      soundFileModifyRest.$formObj.removeClass('loading');
    }
  },

  /**
   * Callback function to be called before the form is sent.
   * @param {Object} settings - The current settings of the form.
   * @returns {Object} - The updated settings of the form.
   */
  cbBeforeSendForm: function cbBeforeSendForm(settings) {
    var result = settings;
    result.data = soundFileModifyRest.$formObj.form('get values'); // Add flag to indicate if this is a new record for proper HTTP method selection

    var currentId = result.data.id;

    if (!currentId || currentId === '' || currentId === 'custom' || currentId === 'moh') {
      result.data._isNew = true; // Clear the ID for new records

      if (currentId === 'custom' || currentId === 'moh') {
        result.data.id = '';
      }
    }

    return result;
  },

  /**
   * Callback function to be called after the form has been sent.
   * @param {Object} response - The response from the server after the form is sent
   */
  cbAfterSendForm: function cbAfterSendForm(response) {
    if (response.result) {
      // Delete old files from trash bin
      soundFileModifyRest.trashBin.forEach(function (filepath) {
        if (filepath) FilesAPI.removeAudioFile(filepath, function () {});
      });
      soundFileModifyRest.trashBin = []; // Update form with new data if provided

      if (response.data) {
        soundFileModifyRest.populateForm(response.data);
      } // Form.js will handle all redirect logic based on submitMode
      // Trigger config changed event to refresh lists


      var event = document.createEvent('Event');
      event.initEvent('ConfigDataChanged', false, true);
      window.dispatchEvent(event);
    }
  },

  /**
   * Initialize the form with custom settings
   */
  initializeForm: function initializeForm() {
    var category = soundFileModifyRest.$formObj.form('get value', 'category'); // Configure Form.js

    Form.$formObj = soundFileModifyRest.$formObj;
    Form.url = '#'; // Not used with REST API

    Form.validateRules = soundFileModifyRest.validateRules;
    Form.cbBeforeSendForm = soundFileModifyRest.cbBeforeSendForm;
    Form.cbAfterSendForm = soundFileModifyRest.cbAfterSendForm; // Configure REST API integration

    Form.apiSettings = {
      enabled: true,
      apiObject: SoundFilesAPI,
      saveMethod: 'saveRecord'
    }; // Configure redirect URLs

    Form.afterSubmitModifyUrl = "".concat(globalRootUrl, "sound-files/modify/");
    Form.afterSubmitIndexUrl = "".concat(globalRootUrl, "sound-files/index/#/").concat(category);
    Form.initialize();
  }
}; // Note: mergingCheckWorker.cbAfterMerging is now handled via EventBus in checkStatusFileMerging method
// When the document is ready, initialize the sound file modify form

$(document).ready(function () {
  soundFileModifyRest.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGUtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbInNvdW5kRmlsZU1vZGlmeVJlc3QiLCJ0cmFzaEJpbiIsIiRzb3VuZFVwbG9hZEJ1dHRvbiIsIiQiLCIkc291bmRGaWxlTmFtZSIsIiRhdWRpb1BsYXllciIsIiRzdWJtaXRCdXR0b24iLCJibG9iIiwid2luZG93IiwiVVJMIiwid2Via2l0VVJMIiwiJGZvcm1PYmoiLCIkZHJvcERvd25zIiwidmFsaWRhdGVSdWxlcyIsIm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwic2ZfVmFsaWRhdGlvbkZpbGVOYW1lSXNFbXB0eSIsInBhdGgiLCJzZl9WYWxpZGF0aW9uRmlsZU5vdFNlbGVjdGVkIiwiaW5pdGlhbGl6ZSIsImRyb3Bkb3duIiwibG9hZEZvcm1EYXRhIiwiaW5pdGlhbGl6ZUZvcm0iLCJGaWxlc0FQSSIsImF0dGFjaFRvQnRuIiwiYWN0aW9uIiwicGFyYW1zIiwiZmlsZSIsInZhbCIsInJlcGxhY2UiLCJmaWxlVVJMIiwiY3JlYXRlT2JqZWN0VVJMIiwic25kUGxheWVyIiwiVXBkYXRlU291cmNlIiwiY2JVcGxvYWRSZXN1bWFibGUiLCJhZGRFdmVudExpc3RlbmVyIiwiY2JPbkRhdGFDaGFuZ2VkIiwicmVjb3JkSWQiLCJnZXRSZWNvcmRJZCIsImFkZENsYXNzIiwiU291bmRGaWxlc0FQSSIsImdldFJlY29yZCIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJyZXN1bHQiLCJwb3B1bGF0ZUZvcm0iLCJkYXRhIiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJtZXNzYWdlcyIsImVycm9yIiwic2V0VGltZW91dCIsImxvY2F0aW9uIiwiaHJlZiIsImdsb2JhbFJvb3RVcmwiLCJyZWNvcmRJZFZhbHVlIiwiRm9ybSIsInBvcHVsYXRlRm9ybVNpbGVudGx5IiwiYWZ0ZXJQb3B1bGF0ZSIsImZvcm1EYXRhIiwiYXVkaW9VcmwiLCJlbmFibGVEaXJyaXR5Iiwic2F2ZUluaXRpYWxWYWx1ZXMiLCJQYnhBcGkiLCJ0cnlQYXJzZUpTT04iLCJmaWxlbmFtZSIsInVuZGVmaW5lZCIsImZpbGVOYW1lIiwiY2hlY2tTdGF0dXNGaWxlTWVyZ2luZyIsInNob3dNdWx0aVN0cmluZyIsInNmX1VwbG9hZEVycm9yIiwianNvbiIsIkpTT04iLCJwYXJzZSIsInVwbG9hZElkIiwidXBsb2FkX2lkIiwiZmlsZVBhdGgiLCJGaWxlVXBsb2FkRXZlbnRIYW5kbGVyIiwic3Vic2NyaWJlIiwib25NZXJnZVN0YXJ0ZWQiLCJvbk1lcmdlUHJvZ3Jlc3MiLCJjb25zb2xlIiwibG9nIiwicHJvZ3Jlc3MiLCJvbk1lcmdlQ29tcGxldGUiLCJjYXRlZ29yeSIsImZvcm0iLCJTeXN0ZW1BUEkiLCJjb252ZXJ0QXVkaW9GaWxlIiwiY2JBZnRlckNvbnZlcnRGaWxlIiwib25FcnJvciIsIm9sZFBhdGgiLCJwdXNoIiwidHJpZ2dlciIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsImN1cnJlbnRJZCIsImlkIiwiX2lzTmV3IiwiY2JBZnRlclNlbmRGb3JtIiwiZm9yRWFjaCIsImZpbGVwYXRoIiwicmVtb3ZlQXVkaW9GaWxlIiwiZXZlbnQiLCJkb2N1bWVudCIsImNyZWF0ZUV2ZW50IiwiaW5pdEV2ZW50IiwiZGlzcGF0Y2hFdmVudCIsInVybCIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsbUJBQW1CLEdBQUc7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SEcsS0FBbkIsQ0FYYSxDQWlCYjs7QUFDQXhELElBQUFBLElBQUksQ0FBQ3lELG9CQUFMLGFBQStCM0QsYUFBL0I7QUFDQUUsSUFBQUEsSUFBSSxDQUFDMEQsbUJBQUwsYUFBOEI1RCxhQUE5QixpQ0FBa0UrQixRQUFsRTtBQUVBN0IsSUFBQUEsSUFBSSxDQUFDckMsVUFBTDtBQUNIO0FBNVd1QixDQUE1QixDLENBK1dBO0FBRUE7O0FBQ0FwQixDQUFDLENBQUN5RyxRQUFELENBQUQsQ0FBWVcsS0FBWixDQUFrQixZQUFNO0FBQ3BCdkgsRUFBQUEsbUJBQW1CLENBQUN1QixVQUFwQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBQYnhBcGksIHNuZFBsYXllciwgU291bmRGaWxlc0FQSSwgVXNlck1lc3NhZ2UsIENvbmZpZywgRmlsZVVwbG9hZEV2ZW50SGFuZGxlciwgRmlsZXNBUEksIFN5c3RlbUFQSSAqL1xuXG4vKipcbiAqIFNvdW5kIGZpbGUgbW9kaWZpY2F0aW9uIG1vZHVsZSB3aXRoIFJFU1QgQVBJIGludGVncmF0aW9uXG4gKiBUaGlzIG1vZHVsZSByZXBsYWNlcyBzb3VuZC1maWxlLW1vZGlmeS5qcyB3aXRoIFJFU1QgQVBJIGNhbGxzIHdoaWxlIHByZXNlcnZpbmdcbiAqIGFsbCBleGlzdGluZyBmdW5jdGlvbmFsaXR5IGluY2x1ZGluZyBmaWxlIHVwbG9hZCwgYXVkaW8gcmVjb3JkaW5nLCBhbmQgcGxheWVyXG4gKlxuICogQG1vZHVsZSBzb3VuZEZpbGVNb2RpZnlSZXN0XG4gKi9cbmNvbnN0IHNvdW5kRmlsZU1vZGlmeVJlc3QgPSB7XG4gICAgLyoqXG4gICAgICogQXJyYXkgdG8gc3RvcmUgcGF0aHMgb2YgZmlsZXMgdG8gYmUgZGVsZXRlZCBhZnRlciBzYXZlXG4gICAgICogQHR5cGUge0FycmF5fVxuICAgICAqL1xuICAgIHRyYXNoQmluOiBbXSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBzb3VuZCB1cGxvYWQgYnV0dG9uLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNvdW5kVXBsb2FkQnV0dG9uOiAkKCcjdXBsb2FkLXNvdW5kLWZpbGUnKSxcblxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHNvdW5kIGZpbGUgbmFtZSBpbnB1dC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzb3VuZEZpbGVOYW1lOiAkKCcjbmFtZScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGF1ZGlvIHBsYXllci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRhdWRpb1BsYXllcjogJCgnI2F1ZGlvLXBsYXllcicpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHN1Ym1pdCBidXR0b24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc3VibWl0QnV0dG9uOiAkKCcjc3VibWl0YnV0dG9uJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgQmxvYiBVUkwgb2JqZWN0LlxuICAgICAqIEB0eXBlIHtCbG9ifVxuICAgICAqL1xuICAgIGJsb2I6IHdpbmRvdy5VUkwgfHwgd2luZG93LndlYmtpdFVSTCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNzb3VuZC1maWxlLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtIGRyb3Bkb3ducy5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkcm9wRG93bnM6ICQoJyNzb3VuZC1maWxlLWZvcm0gLmRyb3Bkb3duJyksXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgbmFtZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ25hbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnNmX1ZhbGlkYXRpb25GaWxlTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHBhdGg6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwYXRoJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5zZl9WYWxpZGF0aW9uRmlsZU5vdFNlbGVjdGVkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgc291bmQgZmlsZSBtb2RpZmljYXRpb24gZnVuY3Rpb25hbGl0eS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3duc1xuICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRkcm9wRG93bnMuZHJvcGRvd24oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgZm9ybSBkYXRhIGZyb20gUkVTVCBBUElcbiAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC5sb2FkRm9ybURhdGEoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZm9ybSB2YWxpZGF0aW9uIGFuZCBzdWJtaXNzaW9uXG4gICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGZpbGUgdXBsb2FkIHVzaW5nIEZpbGVzQVBJLmF0dGFjaFRvQnRuIGZvciB1bmlmaWVkIGJlaGF2aW9yXG4gICAgICAgIEZpbGVzQVBJLmF0dGFjaFRvQnRuKCd1cGxvYWQtc291bmQtZmlsZScsIFsnd2F2JywgJ21wMycsICdvZ2cnLCAnbTRhJywgJ2FhYyddLCAoYWN0aW9uLCBwYXJhbXMpID0+IHtcbiAgICAgICAgICAgIHN3aXRjaCAoYWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnZmlsZUFkZGVkJzpcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBhcmFtcy5maWxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgbmFtZSBmaWVsZCB3aXRoIGZpbGVuYW1lIHdpdGhvdXQgZXh0ZW5zaW9uXG4gICAgICAgICAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRzb3VuZEZpbGVOYW1lLnZhbChwYXJhbXMuZmlsZS5uYW1lLnJlcGxhY2UoL1xcLlteLy5dKyQvLCAnJykpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDcmVhdGUgYmxvYiBVUkwgZm9yIHByZXZpZXdcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuYmxvYiA9IHdpbmRvdy5VUkwgfHwgd2luZG93LndlYmtpdFVSTDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVVUkwgPSBzb3VuZEZpbGVNb2RpZnlSZXN0LmJsb2IuY3JlYXRlT2JqZWN0VVJMKHBhcmFtcy5maWxlLmZpbGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc25kUGxheWVyLlVwZGF0ZVNvdXJjZShmaWxlVVJMKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdmaWxlU3VjY2Vzcyc6XG4gICAgICAgICAgICAgICAgY2FzZSAnZmlsZVByb2dyZXNzJzpcbiAgICAgICAgICAgICAgICBjYXNlICd1cGxvYWRTdGFydCc6XG4gICAgICAgICAgICAgICAgY2FzZSAnZXJyb3InOlxuICAgICAgICAgICAgICAgIGNhc2UgJ2NvbXBsZXRlJzpcbiAgICAgICAgICAgICAgICAgICAgLy8gRm9yd2FyZCBhbGwgb3RoZXIgZXZlbnRzIHRvIHRoZSBvcmlnaW5hbCBjYWxsYmFja1xuICAgICAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LmNiVXBsb2FkUmVzdW1hYmxlKGFjdGlvbiwgcGFyYW1zKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gTGlzdGVuIGZvciBkYXRhIGNoYW5nZXMgdG8gY2xlYXIgY2FjaGVcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgc291bmRGaWxlTW9kaWZ5UmVzdC5jYk9uRGF0YUNoYW5nZWQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGZvcm0gZGF0YSBmcm9tIFJFU1QgQVBJXG4gICAgICovXG4gICAgbG9hZEZvcm1EYXRhKCkge1xuICAgICAgICBjb25zdCByZWNvcmRJZCA9IHNvdW5kRmlsZU1vZGlmeVJlc3QuZ2V0UmVjb3JkSWQoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIFxuICAgICAgICBTb3VuZEZpbGVzQVBJLmdldFJlY29yZChyZWNvcmRJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVjb3JkSWQgJiYgcmVjb3JkSWQgIT09ICduZXcnKSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBlcnJvciBpZiB0cnlpbmcgdG8gbG9hZCBub24tZXhpc3RlbnQgcmVjb3JkXG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKHJlc3BvbnNlLm1lc3NhZ2VzPy5lcnJvciB8fCAnRmFpbGVkIHRvIGxvYWQgc291bmQgZmlsZSBkYXRhJyk7XG4gICAgICAgICAgICAgICAgLy8gUmVkaXJlY3QgdG8gaW5kZXggYWZ0ZXIgZGVsYXlcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBgJHtnbG9iYWxSb290VXJsfXNvdW5kLWZpbGVzL2luZGV4YDtcbiAgICAgICAgICAgICAgICB9LCAzMDAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCByZWNvcmQgSUQgZnJvbSBoaWRkZW4gaW5wdXQgZmllbGRcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBSZWNvcmQgSUQgb3IgZW1wdHkgc3RyaW5nIGZvciBuZXcgcmVjb3Jkc1xuICAgICAqL1xuICAgIGdldFJlY29yZElkKCkge1xuICAgICAgICAvLyBHZXQgcmVjb3JkIElEIGZyb20gaGlkZGVuIGlucHV0IHNldCBieSBjb250cm9sbGVyXG4gICAgICAgIGNvbnN0IHJlY29yZElkVmFsdWUgPSAkKCcjaWQnKS52YWwoKTtcblxuICAgICAgICAvLyBDaGVjayBpZiBpdCdzIGEgY2F0ZWdvcnkgbmFtZSAoY3VzdG9tL21vaCkgb3IgYWN0dWFsIElEXG4gICAgICAgIGlmIChyZWNvcmRJZFZhbHVlID09PSAnY3VzdG9tJyB8fCByZWNvcmRJZFZhbHVlID09PSAnbW9oJykge1xuICAgICAgICAgICAgLy8gVGhpcyBpcyBhIG5ldyByZWNvcmQgd2l0aCBjYXRlZ29yeSBwcmVzZXRcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZWNvcmRJZFZhbHVlIHx8ICcnO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gU291bmQgZmlsZSBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2hcbiAgICAgICAgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseShkYXRhLCB7XG4gICAgICAgICAgICBhZnRlclBvcHVsYXRlOiAoZm9ybURhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgYXVkaW8gcGxheWVyIGlmIHBhdGggZXhpc3RzXG4gICAgICAgICAgICAgICAgaWYgKGZvcm1EYXRhLnBhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVXNlIG5ldyBzb3VuZC1maWxlcyBlbmRwb2ludCBmb3IgTU9IL0lWUi9zeXN0ZW0gc291bmRzXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGF1ZGlvVXJsID0gYC9wYnhjb3JlL2FwaS92My9zb3VuZC1maWxlczpwbGF5YmFjaz92aWV3PSR7Zm9ybURhdGEucGF0aH1gO1xuICAgICAgICAgICAgICAgICAgICBzbmRQbGF5ZXIuVXBkYXRlU291cmNlKGF1ZGlvVXJsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2F2ZSBpbml0aWFsIHZhbHVlcyBmb3IgZGlycml0eSBjaGVja2luZ1xuICAgICAgICAgICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5zYXZlSW5pdGlhbFZhbHVlcygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENsZWFycyBjYWNoZXMgaWYgZGF0YSBjaGFuZ2VzLlxuICAgICAqL1xuICAgIGNiT25EYXRhQ2hhbmdlZCgpIHtcbiAgICAgICAgLy8gQ2xlYXIgUkVTVCBBUEkgY2FjaGUgaWYgbmVlZGVkIC0gaGFuZGxlZCBieSBBUEkgbGF5ZXJcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gZm9yIGZpbGUgdXBsb2FkIHdpdGggY2h1bmtzIGFuZCBtZXJnZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYWN0aW9uIC0gVGhlIGFjdGlvbiBwZXJmb3JtZWQgZHVyaW5nIHRoZSB1cGxvYWQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtcyAtIEFkZGl0aW9uYWwgcGFyYW1ldGVycyByZWxhdGVkIHRvIHRoZSB1cGxvYWQuXG4gICAgICovXG4gICAgY2JVcGxvYWRSZXN1bWFibGUoYWN0aW9uLCBwYXJhbXMpIHtcbiAgICAgICAgc3dpdGNoIChhY3Rpb24pIHtcbiAgICAgICAgICAgIGNhc2UgJ2ZpbGVTdWNjZXNzJzpcbiAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IFBieEFwaS50cnlQYXJzZUpTT04ocGFyYW1zLnJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgIT09IGZhbHNlICYmIHJlc3BvbnNlLmRhdGEuZmlsZW5hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRzb3VuZEZpbGVOYW1lLnZhbChwYXJhbXMuZmlsZS5maWxlTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuY2hlY2tTdGF0dXNGaWxlTWVyZ2luZyhwYXJhbXMucmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhwYXJhbXMsIGdsb2JhbFRyYW5zbGF0ZS5zZl9VcGxvYWRFcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAndXBsb2FkU3RhcnQnOlxuICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHBhcmFtcywgZ2xvYmFsVHJhbnNsYXRlLnNmX1VwbG9hZEVycm9yKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIHRoZSBzdGF0dXMgb2YgZmlsZSBtZXJnaW5nLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBmaWxlIG1lcmdpbmcgc3RhdHVzIGZ1bmN0aW9uLlxuICAgICAqL1xuICAgIGNoZWNrU3RhdHVzRmlsZU1lcmdpbmcocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlID09PSB1bmRlZmluZWQgfHwgUGJ4QXBpLnRyeVBhcnNlSlNPTihyZXNwb25zZSkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoYCR7Z2xvYmFsVHJhbnNsYXRlLnNmX1VwbG9hZEVycm9yfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKHJlc3BvbnNlKTtcbiAgICAgICAgaWYgKGpzb24gPT09IHVuZGVmaW5lZCB8fCBqc29uLmRhdGEgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGAke2dsb2JhbFRyYW5zbGF0ZS5zZl9VcGxvYWRFcnJvcn1gKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHVwbG9hZElkID0ganNvbi5kYXRhLnVwbG9hZF9pZDtcbiAgICAgICAgY29uc3QgZmlsZVBhdGggPSBqc29uLmRhdGEuZmlsZW5hbWU7XG5cbiAgICAgICAgLy8gTkVXOiBTdWJzY3JpYmUgdG8gRXZlbnRCdXMgaW5zdGVhZCBvZiB1c2luZyBwb2xsaW5nIHdvcmtlclxuICAgICAgICBGaWxlVXBsb2FkRXZlbnRIYW5kbGVyLnN1YnNjcmliZSh1cGxvYWRJZCwge1xuICAgICAgICAgICAgb25NZXJnZVN0YXJ0ZWQ6IChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb25NZXJnZVByb2dyZXNzOiAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBwcm9ncmVzcyBpbmRpY2F0b3IgaWYgbmVlZGVkXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFNvdW5kIGZpbGUgbWVyZ2UgcHJvZ3Jlc3M6ICR7ZGF0YS5wcm9ncmVzc30lYCk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBvbk1lcmdlQ29tcGxldGU6IChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIC8vIFBlcmZvcm0gY29udmVyc2lvbiBhZnRlciBtZXJnZSAtIHVzZSB0aGUgZmlsZVBhdGggZnJvbSB0aGUgcmVzcG9uc2VcbiAgICAgICAgICAgICAgICBjb25zdCBjYXRlZ29yeSA9IHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2NhdGVnb3J5Jyk7XG4gICAgICAgICAgICAgICAgU3lzdGVtQVBJLmNvbnZlcnRBdWRpb0ZpbGUoe2ZpbGVuYW1lOiBmaWxlUGF0aCwgY2F0ZWdvcnk6IGNhdGVnb3J5fSwgc291bmRGaWxlTW9kaWZ5UmVzdC5jYkFmdGVyQ29udmVydEZpbGUpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb25FcnJvcjogKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGRhdGEuZXJyb3IgfHwgZ2xvYmFsVHJhbnNsYXRlLnNmX1VwbG9hZEVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGFmdGVyIHRoZSBmaWxlIGlzIGNvbnZlcnRlZCB0byBNUDMgZm9ybWF0LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlbmFtZSAtIFRoZSBmaWxlbmFtZSBvZiB0aGUgY29udmVydGVkIGZpbGUuXG4gICAgICovXG4gICAgY2JBZnRlckNvbnZlcnRGaWxlKGZpbGVuYW1lKSB7XG4gICAgICAgIGlmIChmaWxlbmFtZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhgJHtnbG9iYWxUcmFuc2xhdGUuc2ZfVXBsb2FkRXJyb3J9YCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBBZGQgb2xkIGZpbGUgdG8gdHJhc2ggYmluIGZvciBkZWxldGlvbiBhZnRlciBzYXZlXG4gICAgICAgICAgICBjb25zdCBvbGRQYXRoID0gc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAncGF0aCcpO1xuICAgICAgICAgICAgaWYgKG9sZFBhdGgpIHtcbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LnRyYXNoQmluLnB1c2gob2xkUGF0aCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmb3JtIHdpdGggbmV3IGZpbGUgcGF0aFxuICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAncGF0aCcsIGZpbGVuYW1lKTtcbiAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJHNvdW5kRmlsZU5hbWUudHJpZ2dlcignY2hhbmdlJyk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBwbGF5ZXIgd2l0aCBuZXcgZmlsZSB1c2luZyBzb3VuZC1maWxlcyBlbmRwb2ludFxuICAgICAgICAgICAgc25kUGxheWVyLlVwZGF0ZVNvdXJjZShgL3BieGNvcmUvYXBpL3YzL3NvdW5kLWZpbGVzOnBsYXliYWNrP3ZpZXc9JHtmaWxlbmFtZX1gKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgc3RhdGVzXG4gICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm0uXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybS5cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXG4gICAgICAgIC8vIEFkZCBmbGFnIHRvIGluZGljYXRlIGlmIHRoaXMgaXMgYSBuZXcgcmVjb3JkIGZvciBwcm9wZXIgSFRUUCBtZXRob2Qgc2VsZWN0aW9uXG4gICAgICAgIGNvbnN0IGN1cnJlbnRJZCA9IHJlc3VsdC5kYXRhLmlkO1xuICAgICAgICBpZiAoIWN1cnJlbnRJZCB8fCBjdXJyZW50SWQgPT09ICcnIHx8IGN1cnJlbnRJZCA9PT0gJ2N1c3RvbScgfHwgY3VycmVudElkID09PSAnbW9oJykge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuX2lzTmV3ID0gdHJ1ZTtcbiAgICAgICAgICAgIC8vIENsZWFyIHRoZSBJRCBmb3IgbmV3IHJlY29yZHNcbiAgICAgICAgICAgIGlmIChjdXJyZW50SWQgPT09ICdjdXN0b20nIHx8IGN1cnJlbnRJZCA9PT0gJ21vaCcpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YS5pZCA9ICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgIC8vIERlbGV0ZSBvbGQgZmlsZXMgZnJvbSB0cmFzaCBiaW5cbiAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QudHJhc2hCaW4uZm9yRWFjaCgoZmlsZXBhdGgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZmlsZXBhdGgpIEZpbGVzQVBJLnJlbW92ZUF1ZGlvRmlsZShmaWxlcGF0aCwgKCkgPT4ge30pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LnRyYXNoQmluID0gW107XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmb3JtIHdpdGggbmV3IGRhdGEgaWYgcHJvdmlkZWRcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEZvcm0uanMgd2lsbCBoYW5kbGUgYWxsIHJlZGlyZWN0IGxvZ2ljIGJhc2VkIG9uIHN1Ym1pdE1vZGVcblxuICAgICAgICAgICAgLy8gVHJpZ2dlciBjb25maWcgY2hhbmdlZCBldmVudCB0byByZWZyZXNoIGxpc3RzXG4gICAgICAgICAgICBjb25zdCBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuICAgICAgICAgICAgZXZlbnQuaW5pdEV2ZW50KCdDb25maWdEYXRhQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcbiAgICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIGNvbnN0IGNhdGVnb3J5ID0gc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnY2F0ZWdvcnknKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyZSBGb3JtLmpzXG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBzb3VuZEZpbGVNb2RpZnlSZXN0LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IHNvdW5kRmlsZU1vZGlmeVJlc3QuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBzb3VuZEZpbGVNb2RpZnlSZXN0LmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyZSBSRVNUIEFQSSBpbnRlZ3JhdGlvblxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzID0ge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGFwaU9iamVjdDogU291bmRGaWxlc0FQSSxcbiAgICAgICAgICAgIHNhdmVNZXRob2Q6ICdzYXZlUmVjb3JkJ1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIHJlZGlyZWN0IFVSTHNcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9c291bmQtZmlsZXMvbW9kaWZ5L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9c291bmQtZmlsZXMvaW5kZXgvIy8ke2NhdGVnb3J5fWA7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxufTtcblxuLy8gTm90ZTogbWVyZ2luZ0NoZWNrV29ya2VyLmNiQWZ0ZXJNZXJnaW5nIGlzIG5vdyBoYW5kbGVkIHZpYSBFdmVudEJ1cyBpbiBjaGVja1N0YXR1c0ZpbGVNZXJnaW5nIG1ldGhvZFxuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgc291bmQgZmlsZSBtb2RpZnkgZm9ybVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZSgpO1xufSk7Il19