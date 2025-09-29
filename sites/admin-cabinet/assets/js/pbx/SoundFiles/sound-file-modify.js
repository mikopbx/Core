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
          console.log('[sound-file-modify] fileAdded params:', params);

          if (params.file) {
            console.log('[sound-file-modify] params.file:', params.file); // Get filename from resumable.js file object (can be fileName or name)

            var fileName = params.file.fileName || params.file.name;
            console.log('[sound-file-modify] extracted fileName:', fileName);

            if (fileName) {
              // Update name field with filename without extension
              soundFileModifyRest.$soundFileName.val(fileName.replace(/\.[^/.]+$/, ''));
            } // Create blob URL for preview


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
    var recordId = soundFileModifyRest.getRecordId();
    var category = soundFileModifyRest.getCategory(); // Show loading state

    soundFileModifyRest.$formObj.addClass('loading'); // Pass category for new records

    var params = category ? {
      category: category
    } : {};
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
    }, params);
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
   * Get category from hidden input field or URL
   * @returns {string|null} Category (custom/moh) or null
   */
  getCategory: function getCategory() {
    // First check if ID field contains category
    var recordIdValue = $('#id').val();

    if (recordIdValue === 'custom' || recordIdValue === 'moh') {
      return recordIdValue;
    } // Check URL parameters for category


    var urlParams = new URLSearchParams(window.location.search);
    var categoryParam = urlParams.get('category');

    if (categoryParam === 'custom' || categoryParam === 'moh') {
      return categoryParam;
    }

    return null;
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
          // Get filename from resumable.js file object and remove extension
          var fileName = params.file.fileName || params.file.name;

          if (fileName) {
            soundFileModifyRest.$soundFileName.val(fileName.replace(/\.[^/.]+$/, ''));
          }

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
        SoundFilesAPI.convertAudioFile({
          temp_filename: filePath,
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
  cbAfterConvertFile: function cbAfterConvertFile(response) {
    console.log('[sound-file-modify] cbAfterConvertFile response:', response);
    var filename = null; // Handle different response formats

    if (response === false || !response) {
      UserMessage.showMultiString("".concat(globalTranslate.sf_UploadError));
      return;
    } // Extract filename from response


    if (typeof response === 'string') {
      filename = response;
    } else if (response.result === true && response.data) {
      // API returns data as array ["/path/to/file"]
      if (Array.isArray(response.data) && response.data.length > 0) {
        filename = response.data[0];
      } else if (typeof response.data === 'string') {
        filename = response.data;
      }
    }

    console.log('[sound-file-modify] extracted filename:', filename);

    if (filename) {
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
    } else {
      UserMessage.showMultiString("".concat(globalTranslate.sf_UploadError));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGUtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbInNvdW5kRmlsZU1vZGlmeVJlc3QiLCJ0cmFzaEJpbiIsIiRzb3VuZFVwbG9hZEJ1dHRvbiIsIiQiLCIkc291bmRGaWxlTmFtZSIsIiRhdWRpb1BsYXllciIsIiRzdWJtaXRCdXR0b24iLCJibG9iIiwid2luZG93IiwiVVJMIiwid2Via2l0VVJMIiwiJGZvcm1PYmoiLCIkZHJvcERvd25zIiwidmFsaWRhdGVSdWxlcyIsIm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwic2ZfVmFsaWRhdGlvbkZpbGVOYW1lSXNFbXB0eSIsInBhdGgiLCJzZl9WYWxpZGF0aW9uRmlsZU5vdFNlbGVjdGVkIiwiaW5pdGlhbGl6ZSIsImRyb3Bkb3duIiwibG9hZEZvcm1EYXRhIiwiaW5pdGlhbGl6ZUZvcm0iLCJGaWxlc0FQSSIsImF0dGFjaFRvQnRuIiwiYWN0aW9uIiwicGFyYW1zIiwiY29uc29sZSIsImxvZyIsImZpbGUiLCJmaWxlTmFtZSIsInZhbCIsInJlcGxhY2UiLCJmaWxlVVJMIiwiY3JlYXRlT2JqZWN0VVJMIiwic25kUGxheWVyIiwiVXBkYXRlU291cmNlIiwiY2JVcGxvYWRSZXN1bWFibGUiLCJhZGRFdmVudExpc3RlbmVyIiwiY2JPbkRhdGFDaGFuZ2VkIiwicmVjb3JkSWQiLCJnZXRSZWNvcmRJZCIsImNhdGVnb3J5IiwiZ2V0Q2F0ZWdvcnkiLCJhZGRDbGFzcyIsIlNvdW5kRmlsZXNBUEkiLCJnZXRSZWNvcmQiLCJyZXNwb25zZSIsInJlbW92ZUNsYXNzIiwicmVzdWx0IiwicG9wdWxhdGVGb3JtIiwiZGF0YSIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwibWVzc2FnZXMiLCJlcnJvciIsInNldFRpbWVvdXQiLCJsb2NhdGlvbiIsImhyZWYiLCJnbG9iYWxSb290VXJsIiwicmVjb3JkSWRWYWx1ZSIsInVybFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsInNlYXJjaCIsImNhdGVnb3J5UGFyYW0iLCJnZXQiLCJGb3JtIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJhZnRlclBvcHVsYXRlIiwiZm9ybURhdGEiLCJhdWRpb1VybCIsImVuYWJsZURpcnJpdHkiLCJzYXZlSW5pdGlhbFZhbHVlcyIsIlBieEFwaSIsInRyeVBhcnNlSlNPTiIsImZpbGVuYW1lIiwidW5kZWZpbmVkIiwiY2hlY2tTdGF0dXNGaWxlTWVyZ2luZyIsInNob3dNdWx0aVN0cmluZyIsInNmX1VwbG9hZEVycm9yIiwianNvbiIsIkpTT04iLCJwYXJzZSIsInVwbG9hZElkIiwidXBsb2FkX2lkIiwiZmlsZVBhdGgiLCJGaWxlVXBsb2FkRXZlbnRIYW5kbGVyIiwic3Vic2NyaWJlIiwib25NZXJnZVN0YXJ0ZWQiLCJvbk1lcmdlUHJvZ3Jlc3MiLCJwcm9ncmVzcyIsIm9uTWVyZ2VDb21wbGV0ZSIsImZvcm0iLCJjb252ZXJ0QXVkaW9GaWxlIiwidGVtcF9maWxlbmFtZSIsImNiQWZ0ZXJDb252ZXJ0RmlsZSIsIm9uRXJyb3IiLCJBcnJheSIsImlzQXJyYXkiLCJsZW5ndGgiLCJvbGRQYXRoIiwicHVzaCIsInRyaWdnZXIiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJjdXJyZW50SWQiLCJpZCIsIl9pc05ldyIsImNiQWZ0ZXJTZW5kRm9ybSIsImZvckVhY2giLCJmaWxlcGF0aCIsInJlbW92ZUF1ZGlvRmlsZSIsImV2ZW50IiwiZG9jdW1lbnQiLCJjcmVhdGVFdmVudCIsImluaXRFdmVudCIsImRpc3BhdGNoRXZlbnQiLCJ1cmwiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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QUEsVUFBVSxFQUFFO0FBSEcsS0FBbkIsQ0FYYSxDQWlCYjs7QUFDQXZELElBQUFBLElBQUksQ0FBQ3dELG9CQUFMLGFBQStCL0QsYUFBL0I7QUFDQU8sSUFBQUEsSUFBSSxDQUFDeUQsbUJBQUwsYUFBOEJoRSxhQUE5QixpQ0FBa0VqQixRQUFsRTtBQUVBd0IsSUFBQUEsSUFBSSxDQUFDL0MsVUFBTDtBQUNIO0FBeGF1QixDQUE1QixDLENBMmFBO0FBRUE7O0FBQ0FwQixDQUFDLENBQUNrSCxRQUFELENBQUQsQ0FBWVcsS0FBWixDQUFrQixZQUFNO0FBQ3BCaEksRUFBQUEsbUJBQW1CLENBQUN1QixVQUFwQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBQYnhBcGksIHNuZFBsYXllciwgU291bmRGaWxlc0FQSSwgVXNlck1lc3NhZ2UsIENvbmZpZywgRmlsZVVwbG9hZEV2ZW50SGFuZGxlciwgRmlsZXNBUEksIFN5c3RlbUFQSSAqL1xuXG4vKipcbiAqIFNvdW5kIGZpbGUgbW9kaWZpY2F0aW9uIG1vZHVsZSB3aXRoIFJFU1QgQVBJIGludGVncmF0aW9uXG4gKiBUaGlzIG1vZHVsZSByZXBsYWNlcyBzb3VuZC1maWxlLW1vZGlmeS5qcyB3aXRoIFJFU1QgQVBJIGNhbGxzIHdoaWxlIHByZXNlcnZpbmdcbiAqIGFsbCBleGlzdGluZyBmdW5jdGlvbmFsaXR5IGluY2x1ZGluZyBmaWxlIHVwbG9hZCwgYXVkaW8gcmVjb3JkaW5nLCBhbmQgcGxheWVyXG4gKlxuICogQG1vZHVsZSBzb3VuZEZpbGVNb2RpZnlSZXN0XG4gKi9cbmNvbnN0IHNvdW5kRmlsZU1vZGlmeVJlc3QgPSB7XG4gICAgLyoqXG4gICAgICogQXJyYXkgdG8gc3RvcmUgcGF0aHMgb2YgZmlsZXMgdG8gYmUgZGVsZXRlZCBhZnRlciBzYXZlXG4gICAgICogQHR5cGUge0FycmF5fVxuICAgICAqL1xuICAgIHRyYXNoQmluOiBbXSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBzb3VuZCB1cGxvYWQgYnV0dG9uLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNvdW5kVXBsb2FkQnV0dG9uOiAkKCcjdXBsb2FkLXNvdW5kLWZpbGUnKSxcblxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHNvdW5kIGZpbGUgbmFtZSBpbnB1dC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzb3VuZEZpbGVOYW1lOiAkKCcjbmFtZScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGF1ZGlvIHBsYXllci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRhdWRpb1BsYXllcjogJCgnI2F1ZGlvLXBsYXllcicpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHN1Ym1pdCBidXR0b24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc3VibWl0QnV0dG9uOiAkKCcjc3VibWl0YnV0dG9uJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgQmxvYiBVUkwgb2JqZWN0LlxuICAgICAqIEB0eXBlIHtCbG9ifVxuICAgICAqL1xuICAgIGJsb2I6IHdpbmRvdy5VUkwgfHwgd2luZG93LndlYmtpdFVSTCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNzb3VuZC1maWxlLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtIGRyb3Bkb3ducy5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkcm9wRG93bnM6ICQoJyNzb3VuZC1maWxlLWZvcm0gLmRyb3Bkb3duJyksXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgbmFtZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ25hbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnNmX1ZhbGlkYXRpb25GaWxlTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHBhdGg6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwYXRoJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5zZl9WYWxpZGF0aW9uRmlsZU5vdFNlbGVjdGVkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgc291bmQgZmlsZSBtb2RpZmljYXRpb24gZnVuY3Rpb25hbGl0eS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3duc1xuICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRkcm9wRG93bnMuZHJvcGRvd24oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgZm9ybSBkYXRhIGZyb20gUkVTVCBBUElcbiAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC5sb2FkRm9ybURhdGEoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZm9ybSB2YWxpZGF0aW9uIGFuZCBzdWJtaXNzaW9uXG4gICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGZpbGUgdXBsb2FkIHVzaW5nIEZpbGVzQVBJLmF0dGFjaFRvQnRuIGZvciB1bmlmaWVkIGJlaGF2aW9yXG4gICAgICAgIEZpbGVzQVBJLmF0dGFjaFRvQnRuKCd1cGxvYWQtc291bmQtZmlsZScsIFsnd2F2JywgJ21wMycsICdvZ2cnLCAnbTRhJywgJ2FhYyddLCAoYWN0aW9uLCBwYXJhbXMpID0+IHtcbiAgICAgICAgICAgIHN3aXRjaCAoYWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnZmlsZUFkZGVkJzpcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tzb3VuZC1maWxlLW1vZGlmeV0gZmlsZUFkZGVkIHBhcmFtczonLCBwYXJhbXMpO1xuICAgICAgICAgICAgICAgICAgICBpZiAocGFyYW1zLmZpbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbc291bmQtZmlsZS1tb2RpZnldIHBhcmFtcy5maWxlOicsIHBhcmFtcy5maWxlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdldCBmaWxlbmFtZSBmcm9tIHJlc3VtYWJsZS5qcyBmaWxlIG9iamVjdCAoY2FuIGJlIGZpbGVOYW1lIG9yIG5hbWUpXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWxlTmFtZSA9IHBhcmFtcy5maWxlLmZpbGVOYW1lIHx8IHBhcmFtcy5maWxlLm5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW3NvdW5kLWZpbGUtbW9kaWZ5XSBleHRyYWN0ZWQgZmlsZU5hbWU6JywgZmlsZU5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZpbGVOYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIG5hbWUgZmllbGQgd2l0aCBmaWxlbmFtZSB3aXRob3V0IGV4dGVuc2lvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJHNvdW5kRmlsZU5hbWUudmFsKGZpbGVOYW1lLnJlcGxhY2UoL1xcLlteLy5dKyQvLCAnJykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDcmVhdGUgYmxvYiBVUkwgZm9yIHByZXZpZXdcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuYmxvYiA9IHdpbmRvdy5VUkwgfHwgd2luZG93LndlYmtpdFVSTDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVVUkwgPSBzb3VuZEZpbGVNb2RpZnlSZXN0LmJsb2IuY3JlYXRlT2JqZWN0VVJMKHBhcmFtcy5maWxlLmZpbGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc25kUGxheWVyLlVwZGF0ZVNvdXJjZShmaWxlVVJMKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdmaWxlU3VjY2Vzcyc6XG4gICAgICAgICAgICAgICAgY2FzZSAnZmlsZVByb2dyZXNzJzpcbiAgICAgICAgICAgICAgICBjYXNlICd1cGxvYWRTdGFydCc6XG4gICAgICAgICAgICAgICAgY2FzZSAnZXJyb3InOlxuICAgICAgICAgICAgICAgIGNhc2UgJ2NvbXBsZXRlJzpcbiAgICAgICAgICAgICAgICAgICAgLy8gRm9yd2FyZCBhbGwgb3RoZXIgZXZlbnRzIHRvIHRoZSBvcmlnaW5hbCBjYWxsYmFja1xuICAgICAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LmNiVXBsb2FkUmVzdW1hYmxlKGFjdGlvbiwgcGFyYW1zKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgLy8gTGlzdGVuIGZvciBkYXRhIGNoYW5nZXMgdG8gY2xlYXIgY2FjaGVcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgc291bmRGaWxlTW9kaWZ5UmVzdC5jYk9uRGF0YUNoYW5nZWQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGZvcm0gZGF0YSBmcm9tIFJFU1QgQVBJXG4gICAgICovXG4gICAgbG9hZEZvcm1EYXRhKCkge1xuICAgICAgICBjb25zdCByZWNvcmRJZCA9IHNvdW5kRmlsZU1vZGlmeVJlc3QuZ2V0UmVjb3JkSWQoKTtcbiAgICAgICAgY29uc3QgY2F0ZWdvcnkgPSBzb3VuZEZpbGVNb2RpZnlSZXN0LmdldENhdGVnb3J5KCk7XG5cbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAvLyBQYXNzIGNhdGVnb3J5IGZvciBuZXcgcmVjb3Jkc1xuICAgICAgICBjb25zdCBwYXJhbXMgPSBjYXRlZ29yeSA/IHsgY2F0ZWdvcnk6IGNhdGVnb3J5IH0gOiB7fTtcblxuICAgICAgICBTb3VuZEZpbGVzQVBJLmdldFJlY29yZChyZWNvcmRJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVjb3JkSWQgJiYgcmVjb3JkSWQgIT09ICduZXcnKSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBlcnJvciBpZiB0cnlpbmcgdG8gbG9hZCBub24tZXhpc3RlbnQgcmVjb3JkXG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKHJlc3BvbnNlLm1lc3NhZ2VzPy5lcnJvciB8fCAnRmFpbGVkIHRvIGxvYWQgc291bmQgZmlsZSBkYXRhJyk7XG4gICAgICAgICAgICAgICAgLy8gUmVkaXJlY3QgdG8gaW5kZXggYWZ0ZXIgZGVsYXlcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBgJHtnbG9iYWxSb290VXJsfXNvdW5kLWZpbGVzL2luZGV4YDtcbiAgICAgICAgICAgICAgICB9LCAzMDAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgcGFyYW1zKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBJRCBmcm9tIGhpZGRlbiBpbnB1dCBmaWVsZFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFJlY29yZCBJRCBvciBlbXB0eSBzdHJpbmcgZm9yIG5ldyByZWNvcmRzXG4gICAgICovXG4gICAgZ2V0UmVjb3JkSWQoKSB7XG4gICAgICAgIC8vIEdldCByZWNvcmQgSUQgZnJvbSBoaWRkZW4gaW5wdXQgc2V0IGJ5IGNvbnRyb2xsZXJcbiAgICAgICAgY29uc3QgcmVjb3JkSWRWYWx1ZSA9ICQoJyNpZCcpLnZhbCgpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGl0J3MgYSBjYXRlZ29yeSBuYW1lIChjdXN0b20vbW9oKSBvciBhY3R1YWwgSURcbiAgICAgICAgaWYgKHJlY29yZElkVmFsdWUgPT09ICdjdXN0b20nIHx8IHJlY29yZElkVmFsdWUgPT09ICdtb2gnKSB7XG4gICAgICAgICAgICAvLyBUaGlzIGlzIGEgbmV3IHJlY29yZCB3aXRoIGNhdGVnb3J5IHByZXNldFxuICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlY29yZElkVmFsdWUgfHwgJyc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBjYXRlZ29yeSBmcm9tIGhpZGRlbiBpbnB1dCBmaWVsZCBvciBVUkxcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfG51bGx9IENhdGVnb3J5IChjdXN0b20vbW9oKSBvciBudWxsXG4gICAgICovXG4gICAgZ2V0Q2F0ZWdvcnkoKSB7XG4gICAgICAgIC8vIEZpcnN0IGNoZWNrIGlmIElEIGZpZWxkIGNvbnRhaW5zIGNhdGVnb3J5XG4gICAgICAgIGNvbnN0IHJlY29yZElkVmFsdWUgPSAkKCcjaWQnKS52YWwoKTtcbiAgICAgICAgaWYgKHJlY29yZElkVmFsdWUgPT09ICdjdXN0b20nIHx8IHJlY29yZElkVmFsdWUgPT09ICdtb2gnKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVjb3JkSWRWYWx1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIFVSTCBwYXJhbWV0ZXJzIGZvciBjYXRlZ29yeVxuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICBjb25zdCBjYXRlZ29yeVBhcmFtID0gdXJsUGFyYW1zLmdldCgnY2F0ZWdvcnknKTtcbiAgICAgICAgaWYgKGNhdGVnb3J5UGFyYW0gPT09ICdjdXN0b20nIHx8IGNhdGVnb3J5UGFyYW0gPT09ICdtb2gnKSB7XG4gICAgICAgICAgICByZXR1cm4gY2F0ZWdvcnlQYXJhbTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gU291bmQgZmlsZSBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2hcbiAgICAgICAgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseShkYXRhLCB7XG4gICAgICAgICAgICBhZnRlclBvcHVsYXRlOiAoZm9ybURhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgYXVkaW8gcGxheWVyIGlmIHBhdGggZXhpc3RzXG4gICAgICAgICAgICAgICAgaWYgKGZvcm1EYXRhLnBhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVXNlIG5ldyBzb3VuZC1maWxlcyBlbmRwb2ludCBmb3IgTU9IL0lWUi9zeXN0ZW0gc291bmRzXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGF1ZGlvVXJsID0gYC9wYnhjb3JlL2FwaS92My9zb3VuZC1maWxlczpwbGF5YmFjaz92aWV3PSR7Zm9ybURhdGEucGF0aH1gO1xuICAgICAgICAgICAgICAgICAgICBzbmRQbGF5ZXIuVXBkYXRlU291cmNlKGF1ZGlvVXJsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gU2F2ZSBpbml0aWFsIHZhbHVlcyBmb3IgZGlycml0eSBjaGVja2luZ1xuICAgICAgICAgICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5zYXZlSW5pdGlhbFZhbHVlcygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENsZWFycyBjYWNoZXMgaWYgZGF0YSBjaGFuZ2VzLlxuICAgICAqL1xuICAgIGNiT25EYXRhQ2hhbmdlZCgpIHtcbiAgICAgICAgLy8gQ2xlYXIgUkVTVCBBUEkgY2FjaGUgaWYgbmVlZGVkIC0gaGFuZGxlZCBieSBBUEkgbGF5ZXJcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gZm9yIGZpbGUgdXBsb2FkIHdpdGggY2h1bmtzIGFuZCBtZXJnZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYWN0aW9uIC0gVGhlIGFjdGlvbiBwZXJmb3JtZWQgZHVyaW5nIHRoZSB1cGxvYWQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtcyAtIEFkZGl0aW9uYWwgcGFyYW1ldGVycyByZWxhdGVkIHRvIHRoZSB1cGxvYWQuXG4gICAgICovXG4gICAgY2JVcGxvYWRSZXN1bWFibGUoYWN0aW9uLCBwYXJhbXMpIHtcbiAgICAgICAgc3dpdGNoIChhY3Rpb24pIHtcbiAgICAgICAgICAgIGNhc2UgJ2ZpbGVTdWNjZXNzJzpcbiAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IFBieEFwaS50cnlQYXJzZUpTT04ocGFyYW1zLnJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgIT09IGZhbHNlICYmIHJlc3BvbnNlLmRhdGEuZmlsZW5hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBHZXQgZmlsZW5hbWUgZnJvbSByZXN1bWFibGUuanMgZmlsZSBvYmplY3QgYW5kIHJlbW92ZSBleHRlbnNpb25cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZU5hbWUgPSBwYXJhbXMuZmlsZS5maWxlTmFtZSB8fCBwYXJhbXMuZmlsZS5uYW1lO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZmlsZU5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJHNvdW5kRmlsZU5hbWUudmFsKGZpbGVOYW1lLnJlcGxhY2UoL1xcLlteLy5dKyQvLCAnJykpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuY2hlY2tTdGF0dXNGaWxlTWVyZ2luZyhwYXJhbXMucmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhwYXJhbXMsIGdsb2JhbFRyYW5zbGF0ZS5zZl9VcGxvYWRFcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAndXBsb2FkU3RhcnQnOlxuICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHBhcmFtcywgZ2xvYmFsVHJhbnNsYXRlLnNmX1VwbG9hZEVycm9yKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIHRoZSBzdGF0dXMgb2YgZmlsZSBtZXJnaW5nLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBmaWxlIG1lcmdpbmcgc3RhdHVzIGZ1bmN0aW9uLlxuICAgICAqL1xuICAgIGNoZWNrU3RhdHVzRmlsZU1lcmdpbmcocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlID09PSB1bmRlZmluZWQgfHwgUGJ4QXBpLnRyeVBhcnNlSlNPTihyZXNwb25zZSkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoYCR7Z2xvYmFsVHJhbnNsYXRlLnNmX1VwbG9hZEVycm9yfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKHJlc3BvbnNlKTtcbiAgICAgICAgaWYgKGpzb24gPT09IHVuZGVmaW5lZCB8fCBqc29uLmRhdGEgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGAke2dsb2JhbFRyYW5zbGF0ZS5zZl9VcGxvYWRFcnJvcn1gKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHVwbG9hZElkID0ganNvbi5kYXRhLnVwbG9hZF9pZDtcbiAgICAgICAgY29uc3QgZmlsZVBhdGggPSBqc29uLmRhdGEuZmlsZW5hbWU7XG5cbiAgICAgICAgLy8gTkVXOiBTdWJzY3JpYmUgdG8gRXZlbnRCdXMgaW5zdGVhZCBvZiB1c2luZyBwb2xsaW5nIHdvcmtlclxuICAgICAgICBGaWxlVXBsb2FkRXZlbnRIYW5kbGVyLnN1YnNjcmliZSh1cGxvYWRJZCwge1xuICAgICAgICAgICAgb25NZXJnZVN0YXJ0ZWQ6IChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb25NZXJnZVByb2dyZXNzOiAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBwcm9ncmVzcyBpbmRpY2F0b3IgaWYgbmVlZGVkXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFNvdW5kIGZpbGUgbWVyZ2UgcHJvZ3Jlc3M6ICR7ZGF0YS5wcm9ncmVzc30lYCk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBvbk1lcmdlQ29tcGxldGU6IChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIC8vIFBlcmZvcm0gY29udmVyc2lvbiBhZnRlciBtZXJnZSAtIHVzZSB0aGUgZmlsZVBhdGggZnJvbSB0aGUgcmVzcG9uc2VcbiAgICAgICAgICAgICAgICBjb25zdCBjYXRlZ29yeSA9IHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2NhdGVnb3J5Jyk7XG4gICAgICAgICAgICAgICAgU291bmRGaWxlc0FQSS5jb252ZXJ0QXVkaW9GaWxlKHt0ZW1wX2ZpbGVuYW1lOiBmaWxlUGF0aCwgY2F0ZWdvcnk6IGNhdGVnb3J5fSwgc291bmRGaWxlTW9kaWZ5UmVzdC5jYkFmdGVyQ29udmVydEZpbGUpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb25FcnJvcjogKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGRhdGEuZXJyb3IgfHwgZ2xvYmFsVHJhbnNsYXRlLnNmX1VwbG9hZEVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGFmdGVyIHRoZSBmaWxlIGlzIGNvbnZlcnRlZCB0byBNUDMgZm9ybWF0LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlbmFtZSAtIFRoZSBmaWxlbmFtZSBvZiB0aGUgY29udmVydGVkIGZpbGUuXG4gICAgICovXG4gICAgY2JBZnRlckNvbnZlcnRGaWxlKHJlc3BvbnNlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdbc291bmQtZmlsZS1tb2RpZnldIGNiQWZ0ZXJDb252ZXJ0RmlsZSByZXNwb25zZTonLCByZXNwb25zZSk7XG5cbiAgICAgICAgbGV0IGZpbGVuYW1lID0gbnVsbDtcblxuICAgICAgICAvLyBIYW5kbGUgZGlmZmVyZW50IHJlc3BvbnNlIGZvcm1hdHNcbiAgICAgICAgaWYgKHJlc3BvbnNlID09PSBmYWxzZSB8fCAhcmVzcG9uc2UpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhgJHtnbG9iYWxUcmFuc2xhdGUuc2ZfVXBsb2FkRXJyb3J9YCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBFeHRyYWN0IGZpbGVuYW1lIGZyb20gcmVzcG9uc2VcbiAgICAgICAgaWYgKHR5cGVvZiByZXNwb25zZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGZpbGVuYW1lID0gcmVzcG9uc2U7XG4gICAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgIC8vIEFQSSByZXR1cm5zIGRhdGEgYXMgYXJyYXkgW1wiL3BhdGgvdG8vZmlsZVwiXVxuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkocmVzcG9uc2UuZGF0YSkgJiYgcmVzcG9uc2UuZGF0YS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgZmlsZW5hbWUgPSByZXNwb25zZS5kYXRhWzBdO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcmVzcG9uc2UuZGF0YSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICBmaWxlbmFtZSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb25zb2xlLmxvZygnW3NvdW5kLWZpbGUtbW9kaWZ5XSBleHRyYWN0ZWQgZmlsZW5hbWU6JywgZmlsZW5hbWUpO1xuXG4gICAgICAgIGlmIChmaWxlbmFtZSkge1xuICAgICAgICAgICAgLy8gQWRkIG9sZCBmaWxlIHRvIHRyYXNoIGJpbiBmb3IgZGVsZXRpb24gYWZ0ZXIgc2F2ZVxuICAgICAgICAgICAgY29uc3Qgb2xkUGF0aCA9IHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3BhdGgnKTtcbiAgICAgICAgICAgIGlmIChvbGRQYXRoKSB7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC50cmFzaEJpbi5wdXNoKG9sZFBhdGgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBVcGRhdGUgZm9ybSB3aXRoIG5ldyBmaWxlIHBhdGhcbiAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ3BhdGgnLCBmaWxlbmFtZSk7XG4gICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRzb3VuZEZpbGVOYW1lLnRyaWdnZXIoJ2NoYW5nZScpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgcGxheWVyIHdpdGggbmV3IGZpbGUgdXNpbmcgc291bmQtZmlsZXMgZW5kcG9pbnRcbiAgICAgICAgICAgIHNuZFBsYXllci5VcGRhdGVTb3VyY2UoYC9wYnhjb3JlL2FwaS92My9zb3VuZC1maWxlczpwbGF5YmFjaz92aWV3PSR7ZmlsZW5hbWV9YCk7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIHN0YXRlc1xuICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoYCR7Z2xvYmFsVHJhbnNsYXRlLnNmX1VwbG9hZEVycm9yfWApO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybS5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtLlxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cbiAgICAgICAgLy8gQWRkIGZsYWcgdG8gaW5kaWNhdGUgaWYgdGhpcyBpcyBhIG5ldyByZWNvcmQgZm9yIHByb3BlciBIVFRQIG1ldGhvZCBzZWxlY3Rpb25cbiAgICAgICAgY29uc3QgY3VycmVudElkID0gcmVzdWx0LmRhdGEuaWQ7XG4gICAgICAgIGlmICghY3VycmVudElkIHx8IGN1cnJlbnRJZCA9PT0gJycgfHwgY3VycmVudElkID09PSAnY3VzdG9tJyB8fCBjdXJyZW50SWQgPT09ICdtb2gnKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5faXNOZXcgPSB0cnVlO1xuICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIElEIGZvciBuZXcgcmVjb3Jkc1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRJZCA9PT0gJ2N1c3RvbScgfHwgY3VycmVudElkID09PSAnbW9oJykge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhLmlkID0gJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgLy8gRGVsZXRlIG9sZCBmaWxlcyBmcm9tIHRyYXNoIGJpblxuICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC50cmFzaEJpbi5mb3JFYWNoKChmaWxlcGF0aCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChmaWxlcGF0aCkgRmlsZXNBUEkucmVtb3ZlQXVkaW9GaWxlKGZpbGVwYXRoLCAoKSA9PiB7fSk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QudHJhc2hCaW4gPSBbXTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIGZvcm0gd2l0aCBuZXcgZGF0YSBpZiBwcm92aWRlZFxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRm9ybS5qcyB3aWxsIGhhbmRsZSBhbGwgcmVkaXJlY3QgbG9naWMgYmFzZWQgb24gc3VibWl0TW9kZVxuXG4gICAgICAgICAgICAvLyBUcmlnZ2VyIGNvbmZpZyBjaGFuZ2VkIGV2ZW50IHRvIHJlZnJlc2ggbGlzdHNcbiAgICAgICAgICAgIGNvbnN0IGV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0V2ZW50Jyk7XG4gICAgICAgICAgICBldmVudC5pbml0RXZlbnQoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgZmFsc2UsIHRydWUpO1xuICAgICAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBjdXN0b20gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgY29uc3QgY2F0ZWdvcnkgPSBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdjYXRlZ29yeScpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIEZvcm0uanNcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IHNvdW5kRmlsZU1vZGlmeVJlc3QudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gc291bmRGaWxlTW9kaWZ5UmVzdC5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IHNvdW5kRmlsZU1vZGlmeVJlc3QuY2JBZnRlclNlbmRGb3JtO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIGludGVncmF0aW9uXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgYXBpT2JqZWN0OiBTb3VuZEZpbGVzQVBJLFxuICAgICAgICAgICAgc2F2ZU1ldGhvZDogJ3NhdmVSZWNvcmQnXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBDb25maWd1cmUgcmVkaXJlY3QgVVJMc1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1zb3VuZC1maWxlcy9tb2RpZnkvYDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1zb3VuZC1maWxlcy9pbmRleC8jLyR7Y2F0ZWdvcnl9YDtcbiAgICAgICAgXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG59O1xuXG4vLyBOb3RlOiBtZXJnaW5nQ2hlY2tXb3JrZXIuY2JBZnRlck1lcmdpbmcgaXMgbm93IGhhbmRsZWQgdmlhIEV2ZW50QnVzIGluIGNoZWNrU3RhdHVzRmlsZU1lcmdpbmcgbWV0aG9kXG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBzb3VuZCBmaWxlIG1vZGlmeSBmb3JtXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgc291bmRGaWxlTW9kaWZ5UmVzdC5pbml0aWFsaXplKCk7XG59KTsiXX0=