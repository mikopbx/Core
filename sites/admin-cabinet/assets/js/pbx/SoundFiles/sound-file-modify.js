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
    // Pass 'sound-file' as inputName for test compatibility

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
    }, 'sound-file'); // Listen for data changes to clear cache

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGUtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbInNvdW5kRmlsZU1vZGlmeVJlc3QiLCJ0cmFzaEJpbiIsIiRzb3VuZFVwbG9hZEJ1dHRvbiIsIiQiLCIkc291bmRGaWxlTmFtZSIsIiRhdWRpb1BsYXllciIsIiRzdWJtaXRCdXR0b24iLCJibG9iIiwid2luZG93IiwiVVJMIiwid2Via2l0VVJMIiwiJGZvcm1PYmoiLCIkZHJvcERvd25zIiwidmFsaWRhdGVSdWxlcyIsIm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwic2ZfVmFsaWRhdGlvbkZpbGVOYW1lSXNFbXB0eSIsInBhdGgiLCJzZl9WYWxpZGF0aW9uRmlsZU5vdFNlbGVjdGVkIiwiaW5pdGlhbGl6ZSIsImRyb3Bkb3duIiwibG9hZEZvcm1EYXRhIiwiaW5pdGlhbGl6ZUZvcm0iLCJGaWxlc0FQSSIsImF0dGFjaFRvQnRuIiwiYWN0aW9uIiwicGFyYW1zIiwiY29uc29sZSIsImxvZyIsImZpbGUiLCJmaWxlTmFtZSIsInZhbCIsInJlcGxhY2UiLCJmaWxlVVJMIiwiY3JlYXRlT2JqZWN0VVJMIiwic25kUGxheWVyIiwiVXBkYXRlU291cmNlIiwiY2JVcGxvYWRSZXN1bWFibGUiLCJhZGRFdmVudExpc3RlbmVyIiwiY2JPbkRhdGFDaGFuZ2VkIiwicmVjb3JkSWQiLCJnZXRSZWNvcmRJZCIsImNhdGVnb3J5IiwiZ2V0Q2F0ZWdvcnkiLCJhZGRDbGFzcyIsIlNvdW5kRmlsZXNBUEkiLCJnZXRSZWNvcmQiLCJyZXNwb25zZSIsInJlbW92ZUNsYXNzIiwicmVzdWx0IiwicG9wdWxhdGVGb3JtIiwiZGF0YSIsIlVzZXJNZXNzYWdlIiwic2hvd0Vycm9yIiwibWVzc2FnZXMiLCJlcnJvciIsInNldFRpbWVvdXQiLCJsb2NhdGlvbiIsImhyZWYiLCJnbG9iYWxSb290VXJsIiwicmVjb3JkSWRWYWx1ZSIsInVybFBhcmFtcyIsIlVSTFNlYXJjaFBhcmFtcyIsInNlYXJjaCIsImNhdGVnb3J5UGFyYW0iLCJnZXQiLCJGb3JtIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJhZnRlclBvcHVsYXRlIiwiZm9ybURhdGEiLCJhdWRpb1VybCIsImVuYWJsZURpcnJpdHkiLCJzYXZlSW5pdGlhbFZhbHVlcyIsIlBieEFwaSIsInRyeVBhcnNlSlNPTiIsImZpbGVuYW1lIiwidW5kZWZpbmVkIiwiY2hlY2tTdGF0dXNGaWxlTWVyZ2luZyIsInNob3dNdWx0aVN0cmluZyIsInNmX1VwbG9hZEVycm9yIiwianNvbiIsIkpTT04iLCJwYXJzZSIsInVwbG9hZElkIiwidXBsb2FkX2lkIiwiZmlsZVBhdGgiLCJGaWxlVXBsb2FkRXZlbnRIYW5kbGVyIiwic3Vic2NyaWJlIiwib25NZXJnZVN0YXJ0ZWQiLCJvbk1lcmdlUHJvZ3Jlc3MiLCJwcm9ncmVzcyIsIm9uTWVyZ2VDb21wbGV0ZSIsImZvcm0iLCJjb252ZXJ0QXVkaW9GaWxlIiwidGVtcF9maWxlbmFtZSIsImNiQWZ0ZXJDb252ZXJ0RmlsZSIsIm9uRXJyb3IiLCJBcnJheSIsImlzQXJyYXkiLCJsZW5ndGgiLCJvbGRQYXRoIiwicHVzaCIsInRyaWdnZXIiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJjdXJyZW50SWQiLCJpZCIsIl9pc05ldyIsImNiQWZ0ZXJTZW5kRm9ybSIsImZvckVhY2giLCJmaWxlcGF0aCIsInJlbW92ZUF1ZGlvRmlsZSIsImV2ZW50IiwiZG9jdW1lbnQiLCJjcmVhdGVFdmVudCIsImluaXRFdmVudCIsImRpc3BhdGNoRXZlbnQiLCJ1cmwiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNB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RSxhQUZJO0FBR2Y0RSxNQUFBQSxVQUFVLEVBQUU7QUFIRyxLQUFuQixDQVhhLENBaUJiOztBQUNBdkQsSUFBQUEsSUFBSSxDQUFDd0Qsb0JBQUwsYUFBK0IvRCxhQUEvQjtBQUNBTyxJQUFBQSxJQUFJLENBQUN5RCxtQkFBTCxhQUE4QmhFLGFBQTlCLGlDQUFrRWpCLFFBQWxFO0FBRUF3QixJQUFBQSxJQUFJLENBQUMvQyxVQUFMO0FBQ0g7QUF6YXVCLENBQTVCLEMsQ0E0YUE7QUFFQTs7QUFDQXBCLENBQUMsQ0FBQ2tILFFBQUQsQ0FBRCxDQUFZVyxLQUFaLENBQWtCLFlBQU07QUFDcEJoSSxFQUFBQSxtQkFBbUIsQ0FBQ3VCLFVBQXBCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFBieEFwaSwgc25kUGxheWVyLCBTb3VuZEZpbGVzQVBJLCBVc2VyTWVzc2FnZSwgQ29uZmlnLCBGaWxlVXBsb2FkRXZlbnRIYW5kbGVyLCBGaWxlc0FQSSwgU3lzdGVtQVBJICovXG5cbi8qKlxuICogU291bmQgZmlsZSBtb2RpZmljYXRpb24gbW9kdWxlIHdpdGggUkVTVCBBUEkgaW50ZWdyYXRpb25cbiAqIFRoaXMgbW9kdWxlIHJlcGxhY2VzIHNvdW5kLWZpbGUtbW9kaWZ5LmpzIHdpdGggUkVTVCBBUEkgY2FsbHMgd2hpbGUgcHJlc2VydmluZ1xuICogYWxsIGV4aXN0aW5nIGZ1bmN0aW9uYWxpdHkgaW5jbHVkaW5nIGZpbGUgdXBsb2FkLCBhdWRpbyByZWNvcmRpbmcsIGFuZCBwbGF5ZXJcbiAqXG4gKiBAbW9kdWxlIHNvdW5kRmlsZU1vZGlmeVJlc3RcbiAqL1xuY29uc3Qgc291bmRGaWxlTW9kaWZ5UmVzdCA9IHtcbiAgICAvKipcbiAgICAgKiBBcnJheSB0byBzdG9yZSBwYXRocyBvZiBmaWxlcyB0byBiZSBkZWxldGVkIGFmdGVyIHNhdmVcbiAgICAgKiBAdHlwZSB7QXJyYXl9XG4gICAgICovXG4gICAgdHJhc2hCaW46IFtdLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHNvdW5kIHVwbG9hZCBidXR0b24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc291bmRVcGxvYWRCdXR0b246ICQoJyN1cGxvYWQtc291bmQtZmlsZScpLFxuXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgc291bmQgZmlsZSBuYW1lIGlucHV0LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNvdW5kRmlsZU5hbWU6ICQoJyNuYW1lJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgYXVkaW8gcGxheWVyLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGF1ZGlvUGxheWVyOiAkKCcjYXVkaW8tcGxheWVyJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgc3VibWl0IGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzdWJtaXRCdXR0b246ICQoJyNzdWJtaXRidXR0b24nKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBCbG9iIFVSTCBvYmplY3QuXG4gICAgICogQHR5cGUge0Jsb2J9XG4gICAgICovXG4gICAgYmxvYjogd2luZG93LlVSTCB8fCB3aW5kb3cud2Via2l0VVJMLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI3NvdW5kLWZpbGUtZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0gZHJvcGRvd25zLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRyb3BEb3duczogJCgnI3NvdW5kLWZpbGUtZm9ybSAuZHJvcGRvd24nKSxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBuYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnbmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuc2ZfVmFsaWRhdGlvbkZpbGVOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgcGF0aDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3BhdGgnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnNmX1ZhbGlkYXRpb25GaWxlTm90U2VsZWN0ZWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBzb3VuZCBmaWxlIG1vZGlmaWNhdGlvbiBmdW5jdGlvbmFsaXR5LlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25zXG4gICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJGRyb3BEb3ducy5kcm9wZG93bigpO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBmb3JtIGRhdGEgZnJvbSBSRVNUIEFQSVxuICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LmxvYWRGb3JtRGF0YSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtIHZhbGlkYXRpb24gYW5kIHN1Ym1pc3Npb25cbiAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC5pbml0aWFsaXplRm9ybSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZmlsZSB1cGxvYWQgdXNpbmcgRmlsZXNBUEkuYXR0YWNoVG9CdG4gZm9yIHVuaWZpZWQgYmVoYXZpb3JcbiAgICAgICAgLy8gUGFzcyAnc291bmQtZmlsZScgYXMgaW5wdXROYW1lIGZvciB0ZXN0IGNvbXBhdGliaWxpdHlcbiAgICAgICAgRmlsZXNBUEkuYXR0YWNoVG9CdG4oJ3VwbG9hZC1zb3VuZC1maWxlJywgWyd3YXYnLCAnbXAzJywgJ29nZycsICdtNGEnLCAnYWFjJ10sIChhY3Rpb24sIHBhcmFtcykgPT4ge1xuICAgICAgICAgICAgc3dpdGNoIChhY3Rpb24pIHtcbiAgICAgICAgICAgICAgICBjYXNlICdmaWxlQWRkZWQnOlxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW3NvdW5kLWZpbGUtbW9kaWZ5XSBmaWxlQWRkZWQgcGFyYW1zOicsIHBhcmFtcyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwYXJhbXMuZmlsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tzb3VuZC1maWxlLW1vZGlmeV0gcGFyYW1zLmZpbGU6JywgcGFyYW1zLmZpbGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gR2V0IGZpbGVuYW1lIGZyb20gcmVzdW1hYmxlLmpzIGZpbGUgb2JqZWN0IChjYW4gYmUgZmlsZU5hbWUgb3IgbmFtZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVOYW1lID0gcGFyYW1zLmZpbGUuZmlsZU5hbWUgfHwgcGFyYW1zLmZpbGUubmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbc291bmQtZmlsZS1tb2RpZnldIGV4dHJhY3RlZCBmaWxlTmFtZTonLCBmaWxlTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmlsZU5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgbmFtZSBmaWVsZCB3aXRoIGZpbGVuYW1lIHdpdGhvdXQgZXh0ZW5zaW9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kc291bmRGaWxlTmFtZS52YWwoZmlsZU5hbWUucmVwbGFjZSgvXFwuW14vLl0rJC8sICcnKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBibG9iIFVSTCBmb3IgcHJldmlld1xuICAgICAgICAgICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC5ibG9iID0gd2luZG93LlVSTCB8fCB3aW5kb3cud2Via2l0VVJMO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZVVSTCA9IHNvdW5kRmlsZU1vZGlmeVJlc3QuYmxvYi5jcmVhdGVPYmplY3RVUkwocGFyYW1zLmZpbGUuZmlsZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzbmRQbGF5ZXIuVXBkYXRlU291cmNlKGZpbGVVUkwpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2ZpbGVTdWNjZXNzJzpcbiAgICAgICAgICAgICAgICBjYXNlICdmaWxlUHJvZ3Jlc3MnOlxuICAgICAgICAgICAgICAgIGNhc2UgJ3VwbG9hZFN0YXJ0JzpcbiAgICAgICAgICAgICAgICBjYXNlICdlcnJvcic6XG4gICAgICAgICAgICAgICAgY2FzZSAnY29tcGxldGUnOlxuICAgICAgICAgICAgICAgICAgICAvLyBGb3J3YXJkIGFsbCBvdGhlciBldmVudHMgdG8gdGhlIG9yaWdpbmFsIGNhbGxiYWNrXG4gICAgICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuY2JVcGxvYWRSZXN1bWFibGUoYWN0aW9uLCBwYXJhbXMpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgJ3NvdW5kLWZpbGUnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIExpc3RlbiBmb3IgZGF0YSBjaGFuZ2VzIHRvIGNsZWFyIGNhY2hlXG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdDb25maWdEYXRhQ2hhbmdlZCcsIHNvdW5kRmlsZU1vZGlmeVJlc3QuY2JPbkRhdGFDaGFuZ2VkKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBmb3JtIGRhdGEgZnJvbSBSRVNUIEFQSVxuICAgICAqL1xuICAgIGxvYWRGb3JtRGF0YSgpIHtcbiAgICAgICAgY29uc3QgcmVjb3JkSWQgPSBzb3VuZEZpbGVNb2RpZnlSZXN0LmdldFJlY29yZElkKCk7XG4gICAgICAgIGNvbnN0IGNhdGVnb3J5ID0gc291bmRGaWxlTW9kaWZ5UmVzdC5nZXRDYXRlZ29yeSgpO1xuXG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgLy8gUGFzcyBjYXRlZ29yeSBmb3IgbmV3IHJlY29yZHNcbiAgICAgICAgY29uc3QgcGFyYW1zID0gY2F0ZWdvcnkgPyB7IGNhdGVnb3J5OiBjYXRlZ29yeSB9IDoge307XG5cbiAgICAgICAgU291bmRGaWxlc0FQSS5nZXRSZWNvcmQocmVjb3JkSWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlY29yZElkICYmIHJlY29yZElkICE9PSAnbmV3Jykge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgaWYgdHJ5aW5nIHRvIGxvYWQgbm9uLWV4aXN0ZW50IHJlY29yZFxuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihyZXNwb25zZS5tZXNzYWdlcz8uZXJyb3IgfHwgJ0ZhaWxlZCB0byBsb2FkIHNvdW5kIGZpbGUgZGF0YScpO1xuICAgICAgICAgICAgICAgIC8vIFJlZGlyZWN0IHRvIGluZGV4IGFmdGVyIGRlbGF5XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gYCR7Z2xvYmFsUm9vdFVybH1zb3VuZC1maWxlcy9pbmRleGA7XG4gICAgICAgICAgICAgICAgfSwgMzAwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHBhcmFtcyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCByZWNvcmQgSUQgZnJvbSBoaWRkZW4gaW5wdXQgZmllbGRcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBSZWNvcmQgSUQgb3IgZW1wdHkgc3RyaW5nIGZvciBuZXcgcmVjb3Jkc1xuICAgICAqL1xuICAgIGdldFJlY29yZElkKCkge1xuICAgICAgICAvLyBHZXQgcmVjb3JkIElEIGZyb20gaGlkZGVuIGlucHV0IHNldCBieSBjb250cm9sbGVyXG4gICAgICAgIGNvbnN0IHJlY29yZElkVmFsdWUgPSAkKCcjaWQnKS52YWwoKTtcblxuICAgICAgICAvLyBDaGVjayBpZiBpdCdzIGEgY2F0ZWdvcnkgbmFtZSAoY3VzdG9tL21vaCkgb3IgYWN0dWFsIElEXG4gICAgICAgIGlmIChyZWNvcmRJZFZhbHVlID09PSAnY3VzdG9tJyB8fCByZWNvcmRJZFZhbHVlID09PSAnbW9oJykge1xuICAgICAgICAgICAgLy8gVGhpcyBpcyBhIG5ldyByZWNvcmQgd2l0aCBjYXRlZ29yeSBwcmVzZXRcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZWNvcmRJZFZhbHVlIHx8ICcnO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgY2F0ZWdvcnkgZnJvbSBoaWRkZW4gaW5wdXQgZmllbGQgb3IgVVJMXG4gICAgICogQHJldHVybnMge3N0cmluZ3xudWxsfSBDYXRlZ29yeSAoY3VzdG9tL21vaCkgb3IgbnVsbFxuICAgICAqL1xuICAgIGdldENhdGVnb3J5KCkge1xuICAgICAgICAvLyBGaXJzdCBjaGVjayBpZiBJRCBmaWVsZCBjb250YWlucyBjYXRlZ29yeVxuICAgICAgICBjb25zdCByZWNvcmRJZFZhbHVlID0gJCgnI2lkJykudmFsKCk7XG4gICAgICAgIGlmIChyZWNvcmRJZFZhbHVlID09PSAnY3VzdG9tJyB8fCByZWNvcmRJZFZhbHVlID09PSAnbW9oJykge1xuICAgICAgICAgICAgcmV0dXJuIHJlY29yZElkVmFsdWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBVUkwgcGFyYW1ldGVycyBmb3IgY2F0ZWdvcnlcbiAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICAgICAgY29uc3QgY2F0ZWdvcnlQYXJhbSA9IHVybFBhcmFtcy5nZXQoJ2NhdGVnb3J5Jyk7XG4gICAgICAgIGlmIChjYXRlZ29yeVBhcmFtID09PSAnY3VzdG9tJyB8fCBjYXRlZ29yeVBhcmFtID09PSAnbW9oJykge1xuICAgICAgICAgICAgcmV0dXJuIGNhdGVnb3J5UGFyYW07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGRhdGFcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFNvdW5kIGZpbGUgZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybShkYXRhKSB7XG4gICAgICAgIC8vIFVzZSB1bmlmaWVkIHNpbGVudCBwb3B1bGF0aW9uIGFwcHJvYWNoXG4gICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoZGF0YSwge1xuICAgICAgICAgICAgYWZ0ZXJQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGF1ZGlvIHBsYXllciBpZiBwYXRoIGV4aXN0c1xuICAgICAgICAgICAgICAgIGlmIChmb3JtRGF0YS5wYXRoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFVzZSBuZXcgc291bmQtZmlsZXMgZW5kcG9pbnQgZm9yIE1PSC9JVlIvc3lzdGVtIHNvdW5kc1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBhdWRpb1VybCA9IGAvcGJ4Y29yZS9hcGkvdjMvc291bmQtZmlsZXM6cGxheWJhY2s/dmlldz0ke2Zvcm1EYXRhLnBhdGh9YDtcbiAgICAgICAgICAgICAgICAgICAgc25kUGxheWVyLlVwZGF0ZVNvdXJjZShhdWRpb1VybCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNhdmUgaW5pdGlhbCB2YWx1ZXMgZm9yIGRpcnJpdHkgY2hlY2tpbmdcbiAgICAgICAgICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uc2F2ZUluaXRpYWxWYWx1ZXMoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDbGVhcnMgY2FjaGVzIGlmIGRhdGEgY2hhbmdlcy5cbiAgICAgKi9cbiAgICBjYk9uRGF0YUNoYW5nZWQoKSB7XG4gICAgICAgIC8vIENsZWFyIFJFU1QgQVBJIGNhY2hlIGlmIG5lZWRlZCAtIGhhbmRsZWQgYnkgQVBJIGxheWVyXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGZvciBmaWxlIHVwbG9hZCB3aXRoIGNodW5rcyBhbmQgbWVyZ2UuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGFjdGlvbiAtIFRoZSBhY3Rpb24gcGVyZm9ybWVkIGR1cmluZyB0aGUgdXBsb2FkLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgLSBBZGRpdGlvbmFsIHBhcmFtZXRlcnMgcmVsYXRlZCB0byB0aGUgdXBsb2FkLlxuICAgICAqL1xuICAgIGNiVXBsb2FkUmVzdW1hYmxlKGFjdGlvbiwgcGFyYW1zKSB7XG4gICAgICAgIHN3aXRjaCAoYWN0aW9uKSB7XG4gICAgICAgICAgICBjYXNlICdmaWxlU3VjY2Vzcyc6XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBQYnhBcGkudHJ5UGFyc2VKU09OKHBhcmFtcy5yZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlICE9PSBmYWxzZSAmJiByZXNwb25zZS5kYXRhLmZpbGVuYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gR2V0IGZpbGVuYW1lIGZyb20gcmVzdW1hYmxlLmpzIGZpbGUgb2JqZWN0IGFuZCByZW1vdmUgZXh0ZW5zaW9uXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVOYW1lID0gcGFyYW1zLmZpbGUuZmlsZU5hbWUgfHwgcGFyYW1zLmZpbGUubmFtZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZpbGVOYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRzb3VuZEZpbGVOYW1lLnZhbChmaWxlTmFtZS5yZXBsYWNlKC9cXC5bXi8uXSskLywgJycpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LmNoZWNrU3RhdHVzRmlsZU1lcmdpbmcocGFyYW1zLnJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocGFyYW1zLCBnbG9iYWxUcmFuc2xhdGUuc2ZfVXBsb2FkRXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3VwbG9hZFN0YXJ0JzpcbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdlcnJvcic6XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhwYXJhbXMsIGdsb2JhbFRyYW5zbGF0ZS5zZl9VcGxvYWRFcnJvcik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyB0aGUgc3RhdHVzIG9mIGZpbGUgbWVyZ2luZy5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgZmlsZSBtZXJnaW5nIHN0YXR1cyBmdW5jdGlvbi5cbiAgICAgKi9cbiAgICBjaGVja1N0YXR1c0ZpbGVNZXJnaW5nKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZSA9PT0gdW5kZWZpbmVkIHx8IFBieEFwaS50cnlQYXJzZUpTT04ocmVzcG9uc2UpID09PSBmYWxzZSkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGAke2dsb2JhbFRyYW5zbGF0ZS5zZl9VcGxvYWRFcnJvcn1gKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBqc29uID0gSlNPTi5wYXJzZShyZXNwb25zZSk7XG4gICAgICAgIGlmIChqc29uID09PSB1bmRlZmluZWQgfHwganNvbi5kYXRhID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhgJHtnbG9iYWxUcmFuc2xhdGUuc2ZfVXBsb2FkRXJyb3J9YCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB1cGxvYWRJZCA9IGpzb24uZGF0YS51cGxvYWRfaWQ7XG4gICAgICAgIGNvbnN0IGZpbGVQYXRoID0ganNvbi5kYXRhLmZpbGVuYW1lO1xuXG4gICAgICAgIC8vIE5FVzogU3Vic2NyaWJlIHRvIEV2ZW50QnVzIGluc3RlYWQgb2YgdXNpbmcgcG9sbGluZyB3b3JrZXJcbiAgICAgICAgRmlsZVVwbG9hZEV2ZW50SGFuZGxlci5zdWJzY3JpYmUodXBsb2FkSWQsIHtcbiAgICAgICAgICAgIG9uTWVyZ2VTdGFydGVkOiAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIG9uTWVyZ2VQcm9ncmVzczogKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgcHJvZ3Jlc3MgaW5kaWNhdG9yIGlmIG5lZWRlZFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBTb3VuZCBmaWxlIG1lcmdlIHByb2dyZXNzOiAke2RhdGEucHJvZ3Jlc3N9JWApO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb25NZXJnZUNvbXBsZXRlOiAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICAvLyBQZXJmb3JtIGNvbnZlcnNpb24gYWZ0ZXIgbWVyZ2UgLSB1c2UgdGhlIGZpbGVQYXRoIGZyb20gdGhlIHJlc3BvbnNlXG4gICAgICAgICAgICAgICAgY29uc3QgY2F0ZWdvcnkgPSBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdjYXRlZ29yeScpO1xuICAgICAgICAgICAgICAgIFNvdW5kRmlsZXNBUEkuY29udmVydEF1ZGlvRmlsZSh7dGVtcF9maWxlbmFtZTogZmlsZVBhdGgsIGNhdGVnb3J5OiBjYXRlZ29yeX0sIHNvdW5kRmlsZU1vZGlmeVJlc3QuY2JBZnRlckNvbnZlcnRGaWxlKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIG9uRXJyb3I6IChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhkYXRhLmVycm9yIHx8IGdsb2JhbFRyYW5zbGF0ZS5zZl9VcGxvYWRFcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBhZnRlciB0aGUgZmlsZSBpcyBjb252ZXJ0ZWQgdG8gTVAzIGZvcm1hdC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZW5hbWUgLSBUaGUgZmlsZW5hbWUgb2YgdGhlIGNvbnZlcnRlZCBmaWxlLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJDb252ZXJ0RmlsZShyZXNwb25zZSkge1xuICAgICAgICBjb25zb2xlLmxvZygnW3NvdW5kLWZpbGUtbW9kaWZ5XSBjYkFmdGVyQ29udmVydEZpbGUgcmVzcG9uc2U6JywgcmVzcG9uc2UpO1xuXG4gICAgICAgIGxldCBmaWxlbmFtZSA9IG51bGw7XG5cbiAgICAgICAgLy8gSGFuZGxlIGRpZmZlcmVudCByZXNwb25zZSBmb3JtYXRzXG4gICAgICAgIGlmIChyZXNwb25zZSA9PT0gZmFsc2UgfHwgIXJlc3BvbnNlKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoYCR7Z2xvYmFsVHJhbnNsYXRlLnNmX1VwbG9hZEVycm9yfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRXh0cmFjdCBmaWxlbmFtZSBmcm9tIHJlc3BvbnNlXG4gICAgICAgIGlmICh0eXBlb2YgcmVzcG9uc2UgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBmaWxlbmFtZSA9IHJlc3BvbnNlO1xuICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAvLyBBUEkgcmV0dXJucyBkYXRhIGFzIGFycmF5IFtcIi9wYXRoL3RvL2ZpbGVcIl1cbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHJlc3BvbnNlLmRhdGEpICYmIHJlc3BvbnNlLmRhdGEubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGZpbGVuYW1lID0gcmVzcG9uc2UuZGF0YVswXTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHJlc3BvbnNlLmRhdGEgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgZmlsZW5hbWUgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc29sZS5sb2coJ1tzb3VuZC1maWxlLW1vZGlmeV0gZXh0cmFjdGVkIGZpbGVuYW1lOicsIGZpbGVuYW1lKTtcblxuICAgICAgICBpZiAoZmlsZW5hbWUpIHtcbiAgICAgICAgICAgIC8vIEFkZCBvbGQgZmlsZSB0byB0cmFzaCBiaW4gZm9yIGRlbGV0aW9uIGFmdGVyIHNhdmVcbiAgICAgICAgICAgIGNvbnN0IG9sZFBhdGggPSBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdwYXRoJyk7XG4gICAgICAgICAgICBpZiAob2xkUGF0aCkge1xuICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QudHJhc2hCaW4ucHVzaChvbGRQYXRoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVXBkYXRlIGZvcm0gd2l0aCBuZXcgZmlsZSBwYXRoXG4gICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdwYXRoJywgZmlsZW5hbWUpO1xuICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kc291bmRGaWxlTmFtZS50cmlnZ2VyKCdjaGFuZ2UnKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIHBsYXllciB3aXRoIG5ldyBmaWxlIHVzaW5nIHNvdW5kLWZpbGVzIGVuZHBvaW50XG4gICAgICAgICAgICBzbmRQbGF5ZXIuVXBkYXRlU291cmNlKGAvcGJ4Y29yZS9hcGkvdjMvc291bmQtZmlsZXM6cGxheWJhY2s/dmlldz0ke2ZpbGVuYW1lfWApO1xuXG4gICAgICAgICAgICAvLyBSZW1vdmUgbG9hZGluZyBzdGF0ZXNcbiAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGAke2dsb2JhbFRyYW5zbGF0ZS5zZl9VcGxvYWRFcnJvcn1gKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm0uXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybS5cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXG4gICAgICAgIC8vIEFkZCBmbGFnIHRvIGluZGljYXRlIGlmIHRoaXMgaXMgYSBuZXcgcmVjb3JkIGZvciBwcm9wZXIgSFRUUCBtZXRob2Qgc2VsZWN0aW9uXG4gICAgICAgIGNvbnN0IGN1cnJlbnRJZCA9IHJlc3VsdC5kYXRhLmlkO1xuICAgICAgICBpZiAoIWN1cnJlbnRJZCB8fCBjdXJyZW50SWQgPT09ICcnIHx8IGN1cnJlbnRJZCA9PT0gJ2N1c3RvbScgfHwgY3VycmVudElkID09PSAnbW9oJykge1xuICAgICAgICAgICAgcmVzdWx0LmRhdGEuX2lzTmV3ID0gdHJ1ZTtcbiAgICAgICAgICAgIC8vIENsZWFyIHRoZSBJRCBmb3IgbmV3IHJlY29yZHNcbiAgICAgICAgICAgIGlmIChjdXJyZW50SWQgPT09ICdjdXN0b20nIHx8IGN1cnJlbnRJZCA9PT0gJ21vaCcpIHtcbiAgICAgICAgICAgICAgICByZXN1bHQuZGF0YS5pZCA9ICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgIC8vIERlbGV0ZSBvbGQgZmlsZXMgZnJvbSB0cmFzaCBiaW5cbiAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QudHJhc2hCaW4uZm9yRWFjaCgoZmlsZXBhdGgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZmlsZXBhdGgpIEZpbGVzQVBJLnJlbW92ZUF1ZGlvRmlsZShmaWxlcGF0aCwgKCkgPT4ge30pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LnRyYXNoQmluID0gW107XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmb3JtIHdpdGggbmV3IGRhdGEgaWYgcHJvdmlkZWRcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEZvcm0uanMgd2lsbCBoYW5kbGUgYWxsIHJlZGlyZWN0IGxvZ2ljIGJhc2VkIG9uIHN1Ym1pdE1vZGVcblxuICAgICAgICAgICAgLy8gVHJpZ2dlciBjb25maWcgY2hhbmdlZCBldmVudCB0byByZWZyZXNoIGxpc3RzXG4gICAgICAgICAgICBjb25zdCBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuICAgICAgICAgICAgZXZlbnQuaW5pdEV2ZW50KCdDb25maWdEYXRhQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcbiAgICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIGNvbnN0IGNhdGVnb3J5ID0gc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnY2F0ZWdvcnknKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyZSBGb3JtLmpzXG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBzb3VuZEZpbGVNb2RpZnlSZXN0LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IHNvdW5kRmlsZU1vZGlmeVJlc3QuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBzb3VuZEZpbGVNb2RpZnlSZXN0LmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyZSBSRVNUIEFQSSBpbnRlZ3JhdGlvblxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzID0ge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGFwaU9iamVjdDogU291bmRGaWxlc0FQSSxcbiAgICAgICAgICAgIHNhdmVNZXRob2Q6ICdzYXZlUmVjb3JkJ1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIHJlZGlyZWN0IFVSTHNcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9c291bmQtZmlsZXMvbW9kaWZ5L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9c291bmQtZmlsZXMvaW5kZXgvIy8ke2NhdGVnb3J5fWA7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxufTtcblxuLy8gTm90ZTogbWVyZ2luZ0NoZWNrV29ya2VyLmNiQWZ0ZXJNZXJnaW5nIGlzIG5vdyBoYW5kbGVkIHZpYSBFdmVudEJ1cyBpbiBjaGVja1N0YXR1c0ZpbGVNZXJnaW5nIG1ldGhvZFxuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgc291bmQgZmlsZSBtb2RpZnkgZm9ybVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZSgpO1xufSk7Il19