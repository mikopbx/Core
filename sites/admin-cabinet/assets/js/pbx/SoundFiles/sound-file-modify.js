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
   * Track if this is a new sound file (not existing in database)
   * @type {boolean}
   */
  isNewSoundFile: false,

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
    var category = soundFileModifyRest.getCategory(); // Determine if this is a new sound file

    soundFileModifyRest.isNewSoundFile = !recordId || recordId === '' || recordId === 'new'; // Show loading state

    soundFileModifyRest.$formObj.addClass('loading'); // Pass category for new records

    var params = category ? {
      category: category
    } : {};
    SoundFilesAPI.getRecord(recordId, function (response) {
      soundFileModifyRest.$formObj.removeClass('loading');

      if (response.result) {
        // Update isNewSoundFile based on actual data from server
        // New sound files won't have an id in the response data
        if (!response.data.id || response.data.id === '') {
          soundFileModifyRest.isNewSoundFile = true;
        } else {
          soundFileModifyRest.isNewSoundFile = false;
        } // Set the _isNew flag for new sound files


        if (soundFileModifyRest.isNewSoundFile) {
          response.data._isNew = true;
        }

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
    // Save the _isNew flag in a hidden field if present
    if (data._isNew !== undefined) {
      if ($('#_isNew').length === 0) {
        // Create hidden field if it doesn't exist
        $('<input>').attr({
          type: 'hidden',
          id: '_isNew',
          name: '_isNew',
          value: data._isNew ? 'true' : 'false'
        }).appendTo(soundFileModifyRest.$formObj);
      } else {
        $('#_isNew').val(data._isNew ? 'true' : 'false');
      }
    } // Use unified silent population approach


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
    result.data = soundFileModifyRest.$formObj.form('get values');
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
        // If this was a new sound file that was saved, update state
        if (soundFileModifyRest.isNewSoundFile && response.data.id) {
          // Update the form ID field
          $('#id').val(response.data.id); // Update isNewSoundFile flag

          soundFileModifyRest.isNewSoundFile = false; // Remove _isNew flag from form

          $('#_isNew').remove();
        }

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGUtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbInNvdW5kRmlsZU1vZGlmeVJlc3QiLCJ0cmFzaEJpbiIsIiRzb3VuZFVwbG9hZEJ1dHRvbiIsIiQiLCIkc291bmRGaWxlTmFtZSIsIiRhdWRpb1BsYXllciIsIiRzdWJtaXRCdXR0b24iLCJibG9iIiwid2luZG93IiwiVVJMIiwid2Via2l0VVJMIiwiJGZvcm1PYmoiLCIkZHJvcERvd25zIiwiaXNOZXdTb3VuZEZpbGUiLCJ2YWxpZGF0ZVJ1bGVzIiwibmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJzZl9WYWxpZGF0aW9uRmlsZU5hbWVJc0VtcHR5IiwicGF0aCIsInNmX1ZhbGlkYXRpb25GaWxlTm90U2VsZWN0ZWQiLCJpbml0aWFsaXplIiwiZHJvcGRvd24iLCJsb2FkRm9ybURhdGEiLCJpbml0aWFsaXplRm9ybSIsIkZpbGVzQVBJIiwiYXR0YWNoVG9CdG4iLCJhY3Rpb24iLCJwYXJhbXMiLCJjb25zb2xlIiwibG9nIiwiZmlsZSIsImZpbGVOYW1lIiwidmFsIiwicmVwbGFjZSIsImZpbGVVUkwiLCJjcmVhdGVPYmplY3RVUkwiLCJzbmRQbGF5ZXIiLCJVcGRhdGVTb3VyY2UiLCJjYlVwbG9hZFJlc3VtYWJsZSIsImFkZEV2ZW50TGlzdGVuZXIiLCJjYk9uRGF0YUNoYW5nZWQiLCJyZWNvcmRJZCIsImdldFJlY29yZElkIiwiY2F0ZWdvcnkiLCJnZXRDYXRlZ29yeSIsImFkZENsYXNzIiwiU291bmRGaWxlc0FQSSIsImdldFJlY29yZCIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJyZXN1bHQiLCJkYXRhIiwiaWQiLCJfaXNOZXciLCJwb3B1bGF0ZUZvcm0iLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIm1lc3NhZ2VzIiwiZXJyb3IiLCJzZXRUaW1lb3V0IiwibG9jYXRpb24iLCJocmVmIiwiZ2xvYmFsUm9vdFVybCIsInJlY29yZElkVmFsdWUiLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJzZWFyY2giLCJjYXRlZ29yeVBhcmFtIiwiZ2V0IiwidW5kZWZpbmVkIiwibGVuZ3RoIiwiYXR0ciIsInZhbHVlIiwiYXBwZW5kVG8iLCJGb3JtIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJhZnRlclBvcHVsYXRlIiwiZm9ybURhdGEiLCJhdWRpb1VybCIsImVuYWJsZURpcnJpdHkiLCJzYXZlSW5pdGlhbFZhbHVlcyIsIlBieEFwaSIsInRyeVBhcnNlSlNPTiIsImZpbGVuYW1lIiwiY2hlY2tTdGF0dXNGaWxlTWVyZ2luZyIsInNob3dNdWx0aVN0cmluZyIsInNmX1VwbG9hZEVycm9yIiwianNvbiIsIkpTT04iLCJwYXJzZSIsInVwbG9hZElkIiwidXBsb2FkX2lkIiwiZmlsZVBhdGgiLCJGaWxlVXBsb2FkRXZlbnRIYW5kbGVyIiwic3Vic2NyaWJlIiwib25NZXJnZVN0YXJ0ZWQiLCJvbk1lcmdlUHJvZ3Jlc3MiLCJwcm9ncmVzcyIsIm9uTWVyZ2VDb21wbGV0ZSIsImZvcm0iLCJjb252ZXJ0QXVkaW9GaWxlIiwidGVtcF9maWxlbmFtZSIsImNiQWZ0ZXJDb252ZXJ0RmlsZSIsIm9uRXJyb3IiLCJBcnJheSIsImlzQXJyYXkiLCJvbGRQYXRoIiwicHVzaCIsInRyaWdnZXIiLCJjYkJlZm9yZVNlbmRGb3JtIiwic2V0dGluZ3MiLCJjYkFmdGVyU2VuZEZvcm0iLCJmb3JFYWNoIiwiZmlsZXBhdGgiLCJyZW1vdmVBdWRpb0ZpbGUiLCJyZW1vdmUiLCJldmVudCIsImRvY3VtZW50IiwiY3JlYXRlRXZlbnQiLCJpbml0RXZlbnQiLCJkaXNwYXRjaEV2ZW50IiwidXJsIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOztBQUFB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QUNmQyxNQUFBQSxPQUFPLEVBQUUsSUFETTtBQUVmQyxNQUFBQSxTQUFTLEVBQUU5RSxhQUZJO0FBR2YrRSxNQUFBQSxVQUFVLEVBQUU7QUFIRyxLQUFuQixDQVhhLENBaUJiOztBQUNBbkQsSUFBQUEsSUFBSSxDQUFDb0Qsb0JBQUwsYUFBK0JoRSxhQUEvQjtBQUNBWSxJQUFBQSxJQUFJLENBQUNxRCxtQkFBTCxhQUE4QmpFLGFBQTlCLGlDQUFrRW5CLFFBQWxFO0FBRUErQixJQUFBQSxJQUFJLENBQUN0RCxVQUFMO0FBQ0g7QUFoZHVCLENBQTVCLEMsQ0FtZEE7QUFFQTs7QUFDQXJCLENBQUMsQ0FBQ3NILFFBQUQsQ0FBRCxDQUFZVyxLQUFaLENBQWtCLFlBQU07QUFDcEJwSSxFQUFBQSxtQkFBbUIsQ0FBQ3dCLFVBQXBCO0FBQ0gsQ0FGRCIsInNvdXJjZXNDb250ZW50IjpbIi8qXG4gKiBNaWtvUEJYIC0gZnJlZSBwaG9uZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFBieEFwaSwgc25kUGxheWVyLCBTb3VuZEZpbGVzQVBJLCBVc2VyTWVzc2FnZSwgQ29uZmlnLCBGaWxlVXBsb2FkRXZlbnRIYW5kbGVyLCBGaWxlc0FQSSwgU3lzdGVtQVBJICovXG5cbi8qKlxuICogU291bmQgZmlsZSBtb2RpZmljYXRpb24gbW9kdWxlIHdpdGggUkVTVCBBUEkgaW50ZWdyYXRpb25cbiAqIFRoaXMgbW9kdWxlIHJlcGxhY2VzIHNvdW5kLWZpbGUtbW9kaWZ5LmpzIHdpdGggUkVTVCBBUEkgY2FsbHMgd2hpbGUgcHJlc2VydmluZ1xuICogYWxsIGV4aXN0aW5nIGZ1bmN0aW9uYWxpdHkgaW5jbHVkaW5nIGZpbGUgdXBsb2FkLCBhdWRpbyByZWNvcmRpbmcsIGFuZCBwbGF5ZXJcbiAqXG4gKiBAbW9kdWxlIHNvdW5kRmlsZU1vZGlmeVJlc3RcbiAqL1xuY29uc3Qgc291bmRGaWxlTW9kaWZ5UmVzdCA9IHtcbiAgICAvKipcbiAgICAgKiBBcnJheSB0byBzdG9yZSBwYXRocyBvZiBmaWxlcyB0byBiZSBkZWxldGVkIGFmdGVyIHNhdmVcbiAgICAgKiBAdHlwZSB7QXJyYXl9XG4gICAgICovXG4gICAgdHJhc2hCaW46IFtdLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHNvdW5kIHVwbG9hZCBidXR0b24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc291bmRVcGxvYWRCdXR0b246ICQoJyN1cGxvYWQtc291bmQtZmlsZScpLFxuXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgc291bmQgZmlsZSBuYW1lIGlucHV0LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNvdW5kRmlsZU5hbWU6ICQoJyNuYW1lJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgYXVkaW8gcGxheWVyLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGF1ZGlvUGxheWVyOiAkKCcjYXVkaW8tcGxheWVyJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgc3VibWl0IGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzdWJtaXRCdXR0b246ICQoJyNzdWJtaXRidXR0b24nKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBCbG9iIFVSTCBvYmplY3QuXG4gICAgICogQHR5cGUge0Jsb2J9XG4gICAgICovXG4gICAgYmxvYjogd2luZG93LlVSTCB8fCB3aW5kb3cud2Via2l0VVJMLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI3NvdW5kLWZpbGUtZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0gZHJvcGRvd25zLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRyb3BEb3duczogJCgnI3NvdW5kLWZpbGUtZm9ybSAuZHJvcGRvd24nKSxcblxuICAgIC8qKlxuICAgICAqIFRyYWNrIGlmIHRoaXMgaXMgYSBuZXcgc291bmQgZmlsZSAobm90IGV4aXN0aW5nIGluIGRhdGFiYXNlKVxuICAgICAqIEB0eXBlIHtib29sZWFufVxuICAgICAqL1xuICAgIGlzTmV3U291bmRGaWxlOiBmYWxzZSxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBuYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnbmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuc2ZfVmFsaWRhdGlvbkZpbGVOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgcGF0aDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3BhdGgnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnNmX1ZhbGlkYXRpb25GaWxlTm90U2VsZWN0ZWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBzb3VuZCBmaWxlIG1vZGlmaWNhdGlvbiBmdW5jdGlvbmFsaXR5LlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25zXG4gICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJGRyb3BEb3ducy5kcm9wZG93bigpO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBmb3JtIGRhdGEgZnJvbSBSRVNUIEFQSVxuICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LmxvYWRGb3JtRGF0YSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtIHZhbGlkYXRpb24gYW5kIHN1Ym1pc3Npb25cbiAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC5pbml0aWFsaXplRm9ybSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZmlsZSB1cGxvYWQgdXNpbmcgRmlsZXNBUEkuYXR0YWNoVG9CdG4gZm9yIHVuaWZpZWQgYmVoYXZpb3JcbiAgICAgICAgLy8gUGFzcyAnc291bmQtZmlsZScgYXMgaW5wdXROYW1lIGZvciB0ZXN0IGNvbXBhdGliaWxpdHlcbiAgICAgICAgRmlsZXNBUEkuYXR0YWNoVG9CdG4oJ3VwbG9hZC1zb3VuZC1maWxlJywgWyd3YXYnLCAnbXAzJywgJ29nZycsICdtNGEnLCAnYWFjJ10sIChhY3Rpb24sIHBhcmFtcykgPT4ge1xuICAgICAgICAgICAgc3dpdGNoIChhY3Rpb24pIHtcbiAgICAgICAgICAgICAgICBjYXNlICdmaWxlQWRkZWQnOlxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW3NvdW5kLWZpbGUtbW9kaWZ5XSBmaWxlQWRkZWQgcGFyYW1zOicsIHBhcmFtcyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwYXJhbXMuZmlsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tzb3VuZC1maWxlLW1vZGlmeV0gcGFyYW1zLmZpbGU6JywgcGFyYW1zLmZpbGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gR2V0IGZpbGVuYW1lIGZyb20gcmVzdW1hYmxlLmpzIGZpbGUgb2JqZWN0IChjYW4gYmUgZmlsZU5hbWUgb3IgbmFtZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVOYW1lID0gcGFyYW1zLmZpbGUuZmlsZU5hbWUgfHwgcGFyYW1zLmZpbGUubmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbc291bmQtZmlsZS1tb2RpZnldIGV4dHJhY3RlZCBmaWxlTmFtZTonLCBmaWxlTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmlsZU5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgbmFtZSBmaWVsZCB3aXRoIGZpbGVuYW1lIHdpdGhvdXQgZXh0ZW5zaW9uXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kc291bmRGaWxlTmFtZS52YWwoZmlsZU5hbWUucmVwbGFjZSgvXFwuW14vLl0rJC8sICcnKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBibG9iIFVSTCBmb3IgcHJldmlld1xuICAgICAgICAgICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC5ibG9iID0gd2luZG93LlVSTCB8fCB3aW5kb3cud2Via2l0VVJMO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZVVSTCA9IHNvdW5kRmlsZU1vZGlmeVJlc3QuYmxvYi5jcmVhdGVPYmplY3RVUkwocGFyYW1zLmZpbGUuZmlsZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzbmRQbGF5ZXIuVXBkYXRlU291cmNlKGZpbGVVUkwpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2ZpbGVTdWNjZXNzJzpcbiAgICAgICAgICAgICAgICBjYXNlICdmaWxlUHJvZ3Jlc3MnOlxuICAgICAgICAgICAgICAgIGNhc2UgJ3VwbG9hZFN0YXJ0JzpcbiAgICAgICAgICAgICAgICBjYXNlICdlcnJvcic6XG4gICAgICAgICAgICAgICAgY2FzZSAnY29tcGxldGUnOlxuICAgICAgICAgICAgICAgICAgICAvLyBGb3J3YXJkIGFsbCBvdGhlciBldmVudHMgdG8gdGhlIG9yaWdpbmFsIGNhbGxiYWNrXG4gICAgICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuY2JVcGxvYWRSZXN1bWFibGUoYWN0aW9uLCBwYXJhbXMpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgJ3NvdW5kLWZpbGUnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIExpc3RlbiBmb3IgZGF0YSBjaGFuZ2VzIHRvIGNsZWFyIGNhY2hlXG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdDb25maWdEYXRhQ2hhbmdlZCcsIHNvdW5kRmlsZU1vZGlmeVJlc3QuY2JPbkRhdGFDaGFuZ2VkKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBmb3JtIGRhdGEgZnJvbSBSRVNUIEFQSVxuICAgICAqL1xuICAgIGxvYWRGb3JtRGF0YSgpIHtcbiAgICAgICAgY29uc3QgcmVjb3JkSWQgPSBzb3VuZEZpbGVNb2RpZnlSZXN0LmdldFJlY29yZElkKCk7XG4gICAgICAgIGNvbnN0IGNhdGVnb3J5ID0gc291bmRGaWxlTW9kaWZ5UmVzdC5nZXRDYXRlZ29yeSgpO1xuXG4gICAgICAgIC8vIERldGVybWluZSBpZiB0aGlzIGlzIGEgbmV3IHNvdW5kIGZpbGVcbiAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC5pc05ld1NvdW5kRmlsZSA9ICFyZWNvcmRJZCB8fCByZWNvcmRJZCA9PT0gJycgfHwgcmVjb3JkSWQgPT09ICduZXcnO1xuXG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgLy8gUGFzcyBjYXRlZ29yeSBmb3IgbmV3IHJlY29yZHNcbiAgICAgICAgY29uc3QgcGFyYW1zID0gY2F0ZWdvcnkgPyB7IGNhdGVnb3J5OiBjYXRlZ29yeSB9IDoge307XG5cbiAgICAgICAgU291bmRGaWxlc0FQSS5nZXRSZWNvcmQocmVjb3JkSWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGlzTmV3U291bmRGaWxlIGJhc2VkIG9uIGFjdHVhbCBkYXRhIGZyb20gc2VydmVyXG4gICAgICAgICAgICAgICAgLy8gTmV3IHNvdW5kIGZpbGVzIHdvbid0IGhhdmUgYW4gaWQgaW4gdGhlIHJlc3BvbnNlIGRhdGFcbiAgICAgICAgICAgICAgICBpZiAoIXJlc3BvbnNlLmRhdGEuaWQgfHwgcmVzcG9uc2UuZGF0YS5pZCA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC5pc05ld1NvdW5kRmlsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC5pc05ld1NvdW5kRmlsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFNldCB0aGUgX2lzTmV3IGZsYWcgZm9yIG5ldyBzb3VuZCBmaWxlc1xuICAgICAgICAgICAgICAgIGlmIChzb3VuZEZpbGVNb2RpZnlSZXN0LmlzTmV3U291bmRGaWxlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuX2lzTmV3ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVjb3JkSWQgJiYgcmVjb3JkSWQgIT09ICduZXcnKSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBlcnJvciBpZiB0cnlpbmcgdG8gbG9hZCBub24tZXhpc3RlbnQgcmVjb3JkXG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKHJlc3BvbnNlLm1lc3NhZ2VzPy5lcnJvciB8fCAnRmFpbGVkIHRvIGxvYWQgc291bmQgZmlsZSBkYXRhJyk7XG4gICAgICAgICAgICAgICAgLy8gUmVkaXJlY3QgdG8gaW5kZXggYWZ0ZXIgZGVsYXlcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBgJHtnbG9iYWxSb290VXJsfXNvdW5kLWZpbGVzL2luZGV4YDtcbiAgICAgICAgICAgICAgICB9LCAzMDAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgcGFyYW1zKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBJRCBmcm9tIGhpZGRlbiBpbnB1dCBmaWVsZFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFJlY29yZCBJRCBvciBlbXB0eSBzdHJpbmcgZm9yIG5ldyByZWNvcmRzXG4gICAgICovXG4gICAgZ2V0UmVjb3JkSWQoKSB7XG4gICAgICAgIC8vIEdldCByZWNvcmQgSUQgZnJvbSBoaWRkZW4gaW5wdXQgc2V0IGJ5IGNvbnRyb2xsZXJcbiAgICAgICAgY29uc3QgcmVjb3JkSWRWYWx1ZSA9ICQoJyNpZCcpLnZhbCgpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGl0J3MgYSBjYXRlZ29yeSBuYW1lIChjdXN0b20vbW9oKSBvciBhY3R1YWwgSURcbiAgICAgICAgaWYgKHJlY29yZElkVmFsdWUgPT09ICdjdXN0b20nIHx8IHJlY29yZElkVmFsdWUgPT09ICdtb2gnKSB7XG4gICAgICAgICAgICAvLyBUaGlzIGlzIGEgbmV3IHJlY29yZCB3aXRoIGNhdGVnb3J5IHByZXNldFxuICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlY29yZElkVmFsdWUgfHwgJyc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBjYXRlZ29yeSBmcm9tIGhpZGRlbiBpbnB1dCBmaWVsZCBvciBVUkxcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfG51bGx9IENhdGVnb3J5IChjdXN0b20vbW9oKSBvciBudWxsXG4gICAgICovXG4gICAgZ2V0Q2F0ZWdvcnkoKSB7XG4gICAgICAgIC8vIEZpcnN0IGNoZWNrIGlmIElEIGZpZWxkIGNvbnRhaW5zIGNhdGVnb3J5XG4gICAgICAgIGNvbnN0IHJlY29yZElkVmFsdWUgPSAkKCcjaWQnKS52YWwoKTtcbiAgICAgICAgaWYgKHJlY29yZElkVmFsdWUgPT09ICdjdXN0b20nIHx8IHJlY29yZElkVmFsdWUgPT09ICdtb2gnKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVjb3JkSWRWYWx1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIFVSTCBwYXJhbWV0ZXJzIGZvciBjYXRlZ29yeVxuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICBjb25zdCBjYXRlZ29yeVBhcmFtID0gdXJsUGFyYW1zLmdldCgnY2F0ZWdvcnknKTtcbiAgICAgICAgaWYgKGNhdGVnb3J5UGFyYW0gPT09ICdjdXN0b20nIHx8IGNhdGVnb3J5UGFyYW0gPT09ICdtb2gnKSB7XG4gICAgICAgICAgICByZXR1cm4gY2F0ZWdvcnlQYXJhbTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gU291bmQgZmlsZSBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgLy8gU2F2ZSB0aGUgX2lzTmV3IGZsYWcgaW4gYSBoaWRkZW4gZmllbGQgaWYgcHJlc2VudFxuICAgICAgICBpZiAoZGF0YS5faXNOZXcgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgaWYgKCQoJyNfaXNOZXcnKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAvLyBDcmVhdGUgaGlkZGVuIGZpZWxkIGlmIGl0IGRvZXNuJ3QgZXhpc3RcbiAgICAgICAgICAgICAgICAkKCc8aW5wdXQ+JykuYXR0cih7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdoaWRkZW4nLFxuICAgICAgICAgICAgICAgICAgICBpZDogJ19pc05ldycsXG4gICAgICAgICAgICAgICAgICAgIG5hbWU6ICdfaXNOZXcnLFxuICAgICAgICAgICAgICAgICAgICB2YWx1ZTogZGF0YS5faXNOZXcgPyAndHJ1ZScgOiAnZmFsc2UnXG4gICAgICAgICAgICAgICAgfSkuYXBwZW5kVG8oc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iaik7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICQoJyNfaXNOZXcnKS52YWwoZGF0YS5faXNOZXcgPyAndHJ1ZScgOiAnZmFsc2UnKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVzZSB1bmlmaWVkIHNpbGVudCBwb3B1bGF0aW9uIGFwcHJvYWNoXG4gICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoZGF0YSwge1xuICAgICAgICAgICAgYWZ0ZXJQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGF1ZGlvIHBsYXllciBpZiBwYXRoIGV4aXN0c1xuICAgICAgICAgICAgICAgIGlmIChmb3JtRGF0YS5wYXRoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFVzZSBuZXcgc291bmQtZmlsZXMgZW5kcG9pbnQgZm9yIE1PSC9JVlIvc3lzdGVtIHNvdW5kc1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBhdWRpb1VybCA9IGAvcGJ4Y29yZS9hcGkvdjMvc291bmQtZmlsZXM6cGxheWJhY2s/dmlldz0ke2Zvcm1EYXRhLnBhdGh9YDtcbiAgICAgICAgICAgICAgICAgICAgc25kUGxheWVyLlVwZGF0ZVNvdXJjZShhdWRpb1VybCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU2F2ZSBpbml0aWFsIHZhbHVlcyBmb3IgZGlycml0eSBjaGVja2luZ1xuICAgICAgICAgICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5zYXZlSW5pdGlhbFZhbHVlcygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENsZWFycyBjYWNoZXMgaWYgZGF0YSBjaGFuZ2VzLlxuICAgICAqL1xuICAgIGNiT25EYXRhQ2hhbmdlZCgpIHtcbiAgICAgICAgLy8gQ2xlYXIgUkVTVCBBUEkgY2FjaGUgaWYgbmVlZGVkIC0gaGFuZGxlZCBieSBBUEkgbGF5ZXJcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gZm9yIGZpbGUgdXBsb2FkIHdpdGggY2h1bmtzIGFuZCBtZXJnZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYWN0aW9uIC0gVGhlIGFjdGlvbiBwZXJmb3JtZWQgZHVyaW5nIHRoZSB1cGxvYWQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtcyAtIEFkZGl0aW9uYWwgcGFyYW1ldGVycyByZWxhdGVkIHRvIHRoZSB1cGxvYWQuXG4gICAgICovXG4gICAgY2JVcGxvYWRSZXN1bWFibGUoYWN0aW9uLCBwYXJhbXMpIHtcbiAgICAgICAgc3dpdGNoIChhY3Rpb24pIHtcbiAgICAgICAgICAgIGNhc2UgJ2ZpbGVTdWNjZXNzJzpcbiAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IFBieEFwaS50cnlQYXJzZUpTT04ocGFyYW1zLnJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgIT09IGZhbHNlICYmIHJlc3BvbnNlLmRhdGEuZmlsZW5hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBHZXQgZmlsZW5hbWUgZnJvbSByZXN1bWFibGUuanMgZmlsZSBvYmplY3QgYW5kIHJlbW92ZSBleHRlbnNpb25cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZU5hbWUgPSBwYXJhbXMuZmlsZS5maWxlTmFtZSB8fCBwYXJhbXMuZmlsZS5uYW1lO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZmlsZU5hbWUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJHNvdW5kRmlsZU5hbWUudmFsKGZpbGVOYW1lLnJlcGxhY2UoL1xcLlteLy5dKyQvLCAnJykpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuY2hlY2tTdGF0dXNGaWxlTWVyZ2luZyhwYXJhbXMucmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhwYXJhbXMsIGdsb2JhbFRyYW5zbGF0ZS5zZl9VcGxvYWRFcnJvcik7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAndXBsb2FkU3RhcnQnOlxuICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHBhcmFtcywgZ2xvYmFsVHJhbnNsYXRlLnNmX1VwbG9hZEVycm9yKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIHRoZSBzdGF0dXMgb2YgZmlsZSBtZXJnaW5nLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBmaWxlIG1lcmdpbmcgc3RhdHVzIGZ1bmN0aW9uLlxuICAgICAqL1xuICAgIGNoZWNrU3RhdHVzRmlsZU1lcmdpbmcocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlID09PSB1bmRlZmluZWQgfHwgUGJ4QXBpLnRyeVBhcnNlSlNPTihyZXNwb25zZSkgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoYCR7Z2xvYmFsVHJhbnNsYXRlLnNmX1VwbG9hZEVycm9yfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKHJlc3BvbnNlKTtcbiAgICAgICAgaWYgKGpzb24gPT09IHVuZGVmaW5lZCB8fCBqc29uLmRhdGEgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGAke2dsb2JhbFRyYW5zbGF0ZS5zZl9VcGxvYWRFcnJvcn1gKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IHVwbG9hZElkID0ganNvbi5kYXRhLnVwbG9hZF9pZDtcbiAgICAgICAgY29uc3QgZmlsZVBhdGggPSBqc29uLmRhdGEuZmlsZW5hbWU7XG5cbiAgICAgICAgLy8gTkVXOiBTdWJzY3JpYmUgdG8gRXZlbnRCdXMgaW5zdGVhZCBvZiB1c2luZyBwb2xsaW5nIHdvcmtlclxuICAgICAgICBGaWxlVXBsb2FkRXZlbnRIYW5kbGVyLnN1YnNjcmliZSh1cGxvYWRJZCwge1xuICAgICAgICAgICAgb25NZXJnZVN0YXJ0ZWQ6IChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kc3VibWl0QnV0dG9uLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb25NZXJnZVByb2dyZXNzOiAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBwcm9ncmVzcyBpbmRpY2F0b3IgaWYgbmVlZGVkXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYFNvdW5kIGZpbGUgbWVyZ2UgcHJvZ3Jlc3M6ICR7ZGF0YS5wcm9ncmVzc30lYCk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBvbk1lcmdlQ29tcGxldGU6IChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIC8vIFBlcmZvcm0gY29udmVyc2lvbiBhZnRlciBtZXJnZSAtIHVzZSB0aGUgZmlsZVBhdGggZnJvbSB0aGUgcmVzcG9uc2VcbiAgICAgICAgICAgICAgICBjb25zdCBjYXRlZ29yeSA9IHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2NhdGVnb3J5Jyk7XG4gICAgICAgICAgICAgICAgU291bmRGaWxlc0FQSS5jb252ZXJ0QXVkaW9GaWxlKHt0ZW1wX2ZpbGVuYW1lOiBmaWxlUGF0aCwgY2F0ZWdvcnk6IGNhdGVnb3J5fSwgc291bmRGaWxlTW9kaWZ5UmVzdC5jYkFmdGVyQ29udmVydEZpbGUpO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb25FcnJvcjogKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGRhdGEuZXJyb3IgfHwgZ2xvYmFsVHJhbnNsYXRlLnNmX1VwbG9hZEVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGFmdGVyIHRoZSBmaWxlIGlzIGNvbnZlcnRlZCB0byBNUDMgZm9ybWF0LlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBmaWxlbmFtZSAtIFRoZSBmaWxlbmFtZSBvZiB0aGUgY29udmVydGVkIGZpbGUuXG4gICAgICovXG4gICAgY2JBZnRlckNvbnZlcnRGaWxlKHJlc3BvbnNlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdbc291bmQtZmlsZS1tb2RpZnldIGNiQWZ0ZXJDb252ZXJ0RmlsZSByZXNwb25zZTonLCByZXNwb25zZSk7XG5cbiAgICAgICAgbGV0IGZpbGVuYW1lID0gbnVsbDtcblxuICAgICAgICAvLyBIYW5kbGUgZGlmZmVyZW50IHJlc3BvbnNlIGZvcm1hdHNcbiAgICAgICAgaWYgKHJlc3BvbnNlID09PSBmYWxzZSB8fCAhcmVzcG9uc2UpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhgJHtnbG9iYWxUcmFuc2xhdGUuc2ZfVXBsb2FkRXJyb3J9YCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICAvLyBFeHRyYWN0IGZpbGVuYW1lIGZyb20gcmVzcG9uc2VcbiAgICAgICAgaWYgKHR5cGVvZiByZXNwb25zZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgIGZpbGVuYW1lID0gcmVzcG9uc2U7XG4gICAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlICYmIHJlc3BvbnNlLmRhdGEpIHtcbiAgICAgICAgICAgIC8vIEFQSSByZXR1cm5zIGRhdGEgYXMgYXJyYXkgW1wiL3BhdGgvdG8vZmlsZVwiXVxuICAgICAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkocmVzcG9uc2UuZGF0YSkgJiYgcmVzcG9uc2UuZGF0YS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgZmlsZW5hbWUgPSByZXNwb25zZS5kYXRhWzBdO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgcmVzcG9uc2UuZGF0YSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICBmaWxlbmFtZSA9IHJlc3BvbnNlLmRhdGE7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBjb25zb2xlLmxvZygnW3NvdW5kLWZpbGUtbW9kaWZ5XSBleHRyYWN0ZWQgZmlsZW5hbWU6JywgZmlsZW5hbWUpO1xuXG4gICAgICAgIGlmIChmaWxlbmFtZSkge1xuICAgICAgICAgICAgLy8gQWRkIG9sZCBmaWxlIHRvIHRyYXNoIGJpbiBmb3IgZGVsZXRpb24gYWZ0ZXIgc2F2ZVxuICAgICAgICAgICAgY29uc3Qgb2xkUGF0aCA9IHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3BhdGgnKTtcbiAgICAgICAgICAgIGlmIChvbGRQYXRoKSB7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC50cmFzaEJpbi5wdXNoKG9sZFBhdGgpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBVcGRhdGUgZm9ybSB3aXRoIG5ldyBmaWxlIHBhdGhcbiAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ3BhdGgnLCBmaWxlbmFtZSk7XG4gICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRzb3VuZEZpbGVOYW1lLnRyaWdnZXIoJ2NoYW5nZScpO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgcGxheWVyIHdpdGggbmV3IGZpbGUgdXNpbmcgc291bmQtZmlsZXMgZW5kcG9pbnRcbiAgICAgICAgICAgIHNuZFBsYXllci5VcGRhdGVTb3VyY2UoYC9wYnhjb3JlL2FwaS92My9zb3VuZC1maWxlczpwbGF5YmFjaz92aWV3PSR7ZmlsZW5hbWV9YCk7XG5cbiAgICAgICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIHN0YXRlc1xuICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoYCR7Z2xvYmFsVHJhbnNsYXRlLnNmX1VwbG9hZEVycm9yfWApO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybS5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtLlxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGFmdGVyIHRoZSBmb3JtIGhhcyBiZWVuIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIHNlcnZlciBhZnRlciB0aGUgZm9ybSBpcyBzZW50XG4gICAgICovXG4gICAgY2JBZnRlclNlbmRGb3JtKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgIC8vIERlbGV0ZSBvbGQgZmlsZXMgZnJvbSB0cmFzaCBiaW5cbiAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QudHJhc2hCaW4uZm9yRWFjaCgoZmlsZXBhdGgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoZmlsZXBhdGgpIEZpbGVzQVBJLnJlbW92ZUF1ZGlvRmlsZShmaWxlcGF0aCwgKCkgPT4ge30pO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LnRyYXNoQmluID0gW107XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmb3JtIHdpdGggbmV3IGRhdGEgaWYgcHJvdmlkZWRcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgLy8gSWYgdGhpcyB3YXMgYSBuZXcgc291bmQgZmlsZSB0aGF0IHdhcyBzYXZlZCwgdXBkYXRlIHN0YXRlXG4gICAgICAgICAgICAgICAgaWYgKHNvdW5kRmlsZU1vZGlmeVJlc3QuaXNOZXdTb3VuZEZpbGUgJiYgcmVzcG9uc2UuZGF0YS5pZCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgdGhlIGZvcm0gSUQgZmllbGRcbiAgICAgICAgICAgICAgICAgICAgJCgnI2lkJykudmFsKHJlc3BvbnNlLmRhdGEuaWQpO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBpc05ld1NvdW5kRmlsZSBmbGFnXG4gICAgICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuaXNOZXdTb3VuZEZpbGUgPSBmYWxzZTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBSZW1vdmUgX2lzTmV3IGZsYWcgZnJvbSBmb3JtXG4gICAgICAgICAgICAgICAgICAgICQoJyNfaXNOZXcnKS5yZW1vdmUoKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gRm9ybS5qcyB3aWxsIGhhbmRsZSBhbGwgcmVkaXJlY3QgbG9naWMgYmFzZWQgb24gc3VibWl0TW9kZVxuXG4gICAgICAgICAgICAvLyBUcmlnZ2VyIGNvbmZpZyBjaGFuZ2VkIGV2ZW50IHRvIHJlZnJlc2ggbGlzdHNcbiAgICAgICAgICAgIGNvbnN0IGV2ZW50ID0gZG9jdW1lbnQuY3JlYXRlRXZlbnQoJ0V2ZW50Jyk7XG4gICAgICAgICAgICBldmVudC5pbml0RXZlbnQoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgZmFsc2UsIHRydWUpO1xuICAgICAgICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemUgdGhlIGZvcm0gd2l0aCBjdXN0b20gc2V0dGluZ3NcbiAgICAgKi9cbiAgICBpbml0aWFsaXplRm9ybSgpIHtcbiAgICAgICAgY29uc3QgY2F0ZWdvcnkgPSBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdjYXRlZ29yeScpO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIEZvcm0uanNcbiAgICAgICAgRm9ybS4kZm9ybU9iaiA9IHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmo7XG4gICAgICAgIEZvcm0udXJsID0gJyMnOyAvLyBOb3QgdXNlZCB3aXRoIFJFU1QgQVBJXG4gICAgICAgIEZvcm0udmFsaWRhdGVSdWxlcyA9IHNvdW5kRmlsZU1vZGlmeVJlc3QudmFsaWRhdGVSdWxlcztcbiAgICAgICAgRm9ybS5jYkJlZm9yZVNlbmRGb3JtID0gc291bmRGaWxlTW9kaWZ5UmVzdC5jYkJlZm9yZVNlbmRGb3JtO1xuICAgICAgICBGb3JtLmNiQWZ0ZXJTZW5kRm9ybSA9IHNvdW5kRmlsZU1vZGlmeVJlc3QuY2JBZnRlclNlbmRGb3JtO1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIFJFU1QgQVBJIGludGVncmF0aW9uXG4gICAgICAgIEZvcm0uYXBpU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxuICAgICAgICAgICAgYXBpT2JqZWN0OiBTb3VuZEZpbGVzQVBJLFxuICAgICAgICAgICAgc2F2ZU1ldGhvZDogJ3NhdmVSZWNvcmQnXG4gICAgICAgIH07XG4gICAgICAgIFxuICAgICAgICAvLyBDb25maWd1cmUgcmVkaXJlY3QgVVJMc1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0TW9kaWZ5VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1zb3VuZC1maWxlcy9tb2RpZnkvYDtcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdEluZGV4VXJsID0gYCR7Z2xvYmFsUm9vdFVybH1zb3VuZC1maWxlcy9pbmRleC8jLyR7Y2F0ZWdvcnl9YDtcbiAgICAgICAgXG4gICAgICAgIEZvcm0uaW5pdGlhbGl6ZSgpO1xuICAgIH0sXG59O1xuXG4vLyBOb3RlOiBtZXJnaW5nQ2hlY2tXb3JrZXIuY2JBZnRlck1lcmdpbmcgaXMgbm93IGhhbmRsZWQgdmlhIEV2ZW50QnVzIGluIGNoZWNrU3RhdHVzRmlsZU1lcmdpbmcgbWV0aG9kXG5cbi8vIFdoZW4gdGhlIGRvY3VtZW50IGlzIHJlYWR5LCBpbml0aWFsaXplIHRoZSBzb3VuZCBmaWxlIG1vZGlmeSBmb3JtXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgc291bmRGaWxlTW9kaWZ5UmVzdC5pbml0aWFsaXplKCk7XG59KTsiXX0=