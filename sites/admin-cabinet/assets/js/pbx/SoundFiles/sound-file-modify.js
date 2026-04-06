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
    // Use unified silent population approach
    // Form.populateFormSilently will handle _isNew flag automatically (lines 766-779 in form.js)
    Form.populateFormSilently(data, {
      afterPopulate: function afterPopulate(formData) {
        // Update audio player if path exists
        if (formData.path) {
          // Use new sound-files endpoint for MOH/IVR/system sounds
          var audioUrl = "/pbxcore/api/v3/sound-files:playback?view=".concat(formData.path);
          sndPlayer.UpdateSource(audioUrl);
        } // Update back-to-list button URL with current category


        if (formData.category) {
          var $backButton = $('#back-to-list-button');

          if ($backButton.length > 0) {
            $backButton.attr('href', "".concat(globalRootUrl, "sound-files/index#").concat(formData.category));
          }
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
          soundFileModifyRest.$submitButton.removeClass('loading');
          soundFileModifyRest.$formObj.removeClass('loading');
          UserMessage.showMultiString(params, globalTranslate.sf_UploadError);
        }

        break;

      case 'uploadStart':
        soundFileModifyRest.$formObj.addClass('loading');
        break;

      case 'fileError':
      case 'error':
        soundFileModifyRest.$submitButton.removeClass('loading');
        soundFileModifyRest.$formObj.removeClass('loading');
        UserMessage.showMultiString(params.message || params, globalTranslate.sf_UploadError);
        break;

      default: // Other events don't need handling

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
        // Keep loading state during conversion
        // Perform conversion after merge - use the filePath from the response
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
      soundFileModifyRest.$submitButton.removeClass('loading');
      soundFileModifyRest.$formObj.removeClass('loading');
      UserMessage.showMultiString("".concat(globalTranslate.sf_ConvertError));
      return;
    } // Check for conversion error in response


    if (response.result === false) {
      soundFileModifyRest.$submitButton.removeClass('loading');
      soundFileModifyRest.$formObj.removeClass('loading'); // Show detailed error message if available

      if (response.messages && response.messages.error && response.messages.error.length > 0) {
        var errorMessage = response.messages.error.join('<br>');
        UserMessage.showMultiString(errorMessage, globalTranslate.sf_ConvertError);
      } else {
        UserMessage.showMultiString(globalTranslate.sf_ConvertErrorDetails, globalTranslate.sf_ConvertError);
      }

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
      soundFileModifyRest.$submitButton.removeClass('loading');
      soundFileModifyRest.$formObj.removeClass('loading');
      UserMessage.showMultiString(globalTranslate.sf_ConvertErrorDetails, globalTranslate.sf_ConvertError);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGUtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbInNvdW5kRmlsZU1vZGlmeVJlc3QiLCJ0cmFzaEJpbiIsIiRzb3VuZFVwbG9hZEJ1dHRvbiIsIiQiLCIkc291bmRGaWxlTmFtZSIsIiRhdWRpb1BsYXllciIsIiRzdWJtaXRCdXR0b24iLCJibG9iIiwid2luZG93IiwiVVJMIiwid2Via2l0VVJMIiwiJGZvcm1PYmoiLCIkZHJvcERvd25zIiwiaXNOZXdTb3VuZEZpbGUiLCJ2YWxpZGF0ZVJ1bGVzIiwibmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJzZl9WYWxpZGF0aW9uRmlsZU5hbWVJc0VtcHR5IiwicGF0aCIsInNmX1ZhbGlkYXRpb25GaWxlTm90U2VsZWN0ZWQiLCJpbml0aWFsaXplIiwiZHJvcGRvd24iLCJsb2FkRm9ybURhdGEiLCJpbml0aWFsaXplRm9ybSIsIkZpbGVzQVBJIiwiYXR0YWNoVG9CdG4iLCJhY3Rpb24iLCJwYXJhbXMiLCJjb25zb2xlIiwibG9nIiwiZmlsZSIsImZpbGVOYW1lIiwidmFsIiwicmVwbGFjZSIsImZpbGVVUkwiLCJjcmVhdGVPYmplY3RVUkwiLCJzbmRQbGF5ZXIiLCJVcGRhdGVTb3VyY2UiLCJjYlVwbG9hZFJlc3VtYWJsZSIsImFkZEV2ZW50TGlzdGVuZXIiLCJjYk9uRGF0YUNoYW5nZWQiLCJyZWNvcmRJZCIsImdldFJlY29yZElkIiwiY2F0ZWdvcnkiLCJnZXRDYXRlZ29yeSIsImFkZENsYXNzIiwiU291bmRGaWxlc0FQSSIsImdldFJlY29yZCIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJyZXN1bHQiLCJkYXRhIiwiaWQiLCJfaXNOZXciLCJwb3B1bGF0ZUZvcm0iLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIm1lc3NhZ2VzIiwiZXJyb3IiLCJzZXRUaW1lb3V0IiwibG9jYXRpb24iLCJocmVmIiwiZ2xvYmFsUm9vdFVybCIsInJlY29yZElkVmFsdWUiLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJzZWFyY2giLCJjYXRlZ29yeVBhcmFtIiwiZ2V0IiwiRm9ybSIsInBvcHVsYXRlRm9ybVNpbGVudGx5IiwiYWZ0ZXJQb3B1bGF0ZSIsImZvcm1EYXRhIiwiYXVkaW9VcmwiLCIkYmFja0J1dHRvbiIsImxlbmd0aCIsImF0dHIiLCJlbmFibGVEaXJyaXR5Iiwic2F2ZUluaXRpYWxWYWx1ZXMiLCJQYnhBcGkiLCJ0cnlQYXJzZUpTT04iLCJmaWxlbmFtZSIsInVuZGVmaW5lZCIsImNoZWNrU3RhdHVzRmlsZU1lcmdpbmciLCJzaG93TXVsdGlTdHJpbmciLCJzZl9VcGxvYWRFcnJvciIsIm1lc3NhZ2UiLCJqc29uIiwiSlNPTiIsInBhcnNlIiwidXBsb2FkSWQiLCJ1cGxvYWRfaWQiLCJmaWxlUGF0aCIsIkZpbGVVcGxvYWRFdmVudEhhbmRsZXIiLCJzdWJzY3JpYmUiLCJvbk1lcmdlU3RhcnRlZCIsIm9uTWVyZ2VQcm9ncmVzcyIsInByb2dyZXNzIiwib25NZXJnZUNvbXBsZXRlIiwiZm9ybSIsImNvbnZlcnRBdWRpb0ZpbGUiLCJ0ZW1wX2ZpbGVuYW1lIiwiY2JBZnRlckNvbnZlcnRGaWxlIiwib25FcnJvciIsInNmX0NvbnZlcnRFcnJvciIsImVycm9yTWVzc2FnZSIsImpvaW4iLCJzZl9Db252ZXJ0RXJyb3JEZXRhaWxzIiwiQXJyYXkiLCJpc0FycmF5Iiwib2xkUGF0aCIsInB1c2giLCJ0cmlnZ2VyIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwiY2JBZnRlclNlbmRGb3JtIiwiZm9yRWFjaCIsImZpbGVwYXRoIiwicmVtb3ZlQXVkaW9GaWxlIiwicmVtb3ZlIiwiZXZlbnQiLCJkb2N1bWVudCIsImNyZWF0ZUV2ZW50IiwiaW5pdEV2ZW50IiwiZGlzcGF0Y2hFdmVudCIsInVybCIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJh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LGFBQThCckUsYUFBOUIsaUNBQWtFbkIsUUFBbEU7QUFFQTBCLElBQUFBLElBQUksQ0FBQ2pELFVBQUw7QUFDSDtBQWhldUIsQ0FBNUIsQyxDQW1lQTtBQUVBOztBQUNBckIsQ0FBQyxDQUFDMEgsUUFBRCxDQUFELENBQVlXLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnhJLEVBQUFBLG1CQUFtQixDQUFDd0IsVUFBcEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUGJ4QXBpLCBzbmRQbGF5ZXIsIFNvdW5kRmlsZXNBUEksIFVzZXJNZXNzYWdlLCBDb25maWcsIEZpbGVVcGxvYWRFdmVudEhhbmRsZXIsIEZpbGVzQVBJLCBTeXN0ZW1BUEkgKi9cblxuLyoqXG4gKiBTb3VuZCBmaWxlIG1vZGlmaWNhdGlvbiBtb2R1bGUgd2l0aCBSRVNUIEFQSSBpbnRlZ3JhdGlvblxuICogVGhpcyBtb2R1bGUgcmVwbGFjZXMgc291bmQtZmlsZS1tb2RpZnkuanMgd2l0aCBSRVNUIEFQSSBjYWxscyB3aGlsZSBwcmVzZXJ2aW5nXG4gKiBhbGwgZXhpc3RpbmcgZnVuY3Rpb25hbGl0eSBpbmNsdWRpbmcgZmlsZSB1cGxvYWQsIGF1ZGlvIHJlY29yZGluZywgYW5kIHBsYXllclxuICpcbiAqIEBtb2R1bGUgc291bmRGaWxlTW9kaWZ5UmVzdFxuICovXG5jb25zdCBzb3VuZEZpbGVNb2RpZnlSZXN0ID0ge1xuICAgIC8qKlxuICAgICAqIEFycmF5IHRvIHN0b3JlIHBhdGhzIG9mIGZpbGVzIHRvIGJlIGRlbGV0ZWQgYWZ0ZXIgc2F2ZVxuICAgICAqIEB0eXBlIHtBcnJheX1cbiAgICAgKi9cbiAgICB0cmFzaEJpbjogW10sXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgc291bmQgdXBsb2FkIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzb3VuZFVwbG9hZEJ1dHRvbjogJCgnI3VwbG9hZC1zb3VuZC1maWxlJyksXG5cblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBzb3VuZCBmaWxlIG5hbWUgaW5wdXQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc291bmRGaWxlTmFtZTogJCgnI25hbWUnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBhdWRpbyBwbGF5ZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkYXVkaW9QbGF5ZXI6ICQoJyNhdWRpby1wbGF5ZXInKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBzdWJtaXQgYnV0dG9uLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHN1Ym1pdEJ1dHRvbjogJCgnI3N1Ym1pdGJ1dHRvbicpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIEJsb2IgVVJMIG9iamVjdC5cbiAgICAgKiBAdHlwZSB7QmxvYn1cbiAgICAgKi9cbiAgICBibG9iOiB3aW5kb3cuVVJMIHx8IHdpbmRvdy53ZWJraXRVUkwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjc291bmQtZmlsZS1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybSBkcm9wZG93bnMuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZHJvcERvd25zOiAkKCcjc291bmQtZmlsZS1mb3JtIC5kcm9wZG93bicpLFxuXG4gICAgLyoqXG4gICAgICogVHJhY2sgaWYgdGhpcyBpcyBhIG5ldyBzb3VuZCBmaWxlIChub3QgZXhpc3RpbmcgaW4gZGF0YWJhc2UpXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgaXNOZXdTb3VuZEZpbGU6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIG5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICduYW1lJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5zZl9WYWxpZGF0aW9uRmlsZU5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBwYXRoOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAncGF0aCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuc2ZfVmFsaWRhdGlvbkZpbGVOb3RTZWxlY3RlZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIHNvdW5kIGZpbGUgbW9kaWZpY2F0aW9uIGZ1bmN0aW9uYWxpdHkuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93bnNcbiAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZHJvcERvd25zLmRyb3Bkb3duKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBMb2FkIGZvcm0gZGF0YSBmcm9tIFJFU1QgQVBJXG4gICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QubG9hZEZvcm1EYXRhKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGZvcm0gdmFsaWRhdGlvbiBhbmQgc3VibWlzc2lvblxuICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmaWxlIHVwbG9hZCB1c2luZyBGaWxlc0FQSS5hdHRhY2hUb0J0biBmb3IgdW5pZmllZCBiZWhhdmlvclxuICAgICAgICAvLyBQYXNzICdzb3VuZC1maWxlJyBhcyBpbnB1dE5hbWUgZm9yIHRlc3QgY29tcGF0aWJpbGl0eVxuICAgICAgICBGaWxlc0FQSS5hdHRhY2hUb0J0bigndXBsb2FkLXNvdW5kLWZpbGUnLCBbJ3dhdicsICdtcDMnLCAnb2dnJywgJ200YScsICdhYWMnXSwgKGFjdGlvbiwgcGFyYW1zKSA9PiB7XG4gICAgICAgICAgICBzd2l0Y2ggKGFjdGlvbikge1xuICAgICAgICAgICAgICAgIGNhc2UgJ2ZpbGVBZGRlZCc6XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbc291bmQtZmlsZS1tb2RpZnldIGZpbGVBZGRlZCBwYXJhbXM6JywgcGFyYW1zKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBhcmFtcy5maWxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW3NvdW5kLWZpbGUtbW9kaWZ5XSBwYXJhbXMuZmlsZTonLCBwYXJhbXMuZmlsZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBHZXQgZmlsZW5hbWUgZnJvbSByZXN1bWFibGUuanMgZmlsZSBvYmplY3QgKGNhbiBiZSBmaWxlTmFtZSBvciBuYW1lKVxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZU5hbWUgPSBwYXJhbXMuZmlsZS5maWxlTmFtZSB8fCBwYXJhbXMuZmlsZS5uYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tzb3VuZC1maWxlLW1vZGlmeV0gZXh0cmFjdGVkIGZpbGVOYW1lOicsIGZpbGVOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmaWxlTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBuYW1lIGZpZWxkIHdpdGggZmlsZW5hbWUgd2l0aG91dCBleHRlbnNpb25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRzb3VuZEZpbGVOYW1lLnZhbChmaWxlTmFtZS5yZXBsYWNlKC9cXC5bXi8uXSskLywgJycpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGJsb2IgVVJMIGZvciBwcmV2aWV3XG4gICAgICAgICAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LmJsb2IgPSB3aW5kb3cuVVJMIHx8IHdpbmRvdy53ZWJraXRVUkw7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWxlVVJMID0gc291bmRGaWxlTW9kaWZ5UmVzdC5ibG9iLmNyZWF0ZU9iamVjdFVSTChwYXJhbXMuZmlsZS5maWxlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNuZFBsYXllci5VcGRhdGVTb3VyY2UoZmlsZVVSTCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnZmlsZVN1Y2Nlc3MnOlxuICAgICAgICAgICAgICAgIGNhc2UgJ2ZpbGVQcm9ncmVzcyc6XG4gICAgICAgICAgICAgICAgY2FzZSAndXBsb2FkU3RhcnQnOlxuICAgICAgICAgICAgICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgICAgICAgICAgICBjYXNlICdjb21wbGV0ZSc6XG4gICAgICAgICAgICAgICAgICAgIC8vIEZvcndhcmQgYWxsIG90aGVyIGV2ZW50cyB0byB0aGUgb3JpZ2luYWwgY2FsbGJhY2tcbiAgICAgICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC5jYlVwbG9hZFJlc3VtYWJsZShhY3Rpb24sIHBhcmFtcyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCAnc291bmQtZmlsZScpO1xuICAgICAgICBcbiAgICAgICAgLy8gTGlzdGVuIGZvciBkYXRhIGNoYW5nZXMgdG8gY2xlYXIgY2FjaGVcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgc291bmRGaWxlTW9kaWZ5UmVzdC5jYk9uRGF0YUNoYW5nZWQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGZvcm0gZGF0YSBmcm9tIFJFU1QgQVBJXG4gICAgICovXG4gICAgbG9hZEZvcm1EYXRhKCkge1xuICAgICAgICBjb25zdCByZWNvcmRJZCA9IHNvdW5kRmlsZU1vZGlmeVJlc3QuZ2V0UmVjb3JkSWQoKTtcbiAgICAgICAgY29uc3QgY2F0ZWdvcnkgPSBzb3VuZEZpbGVNb2RpZnlSZXN0LmdldENhdGVnb3J5KCk7XG5cbiAgICAgICAgLy8gRGV0ZXJtaW5lIGlmIHRoaXMgaXMgYSBuZXcgc291bmQgZmlsZVxuICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LmlzTmV3U291bmRGaWxlID0gIXJlY29yZElkIHx8IHJlY29yZElkID09PSAnJyB8fCByZWNvcmRJZCA9PT0gJ25ldyc7XG5cbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAvLyBQYXNzIGNhdGVnb3J5IGZvciBuZXcgcmVjb3Jkc1xuICAgICAgICBjb25zdCBwYXJhbXMgPSBjYXRlZ29yeSA/IHsgY2F0ZWdvcnk6IGNhdGVnb3J5IH0gOiB7fTtcblxuICAgICAgICBTb3VuZEZpbGVzQVBJLmdldFJlY29yZChyZWNvcmRJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgaXNOZXdTb3VuZEZpbGUgYmFzZWQgb24gYWN0dWFsIGRhdGEgZnJvbSBzZXJ2ZXJcbiAgICAgICAgICAgICAgICAvLyBOZXcgc291bmQgZmlsZXMgd29uJ3QgaGF2ZSBhbiBpZCBpbiB0aGUgcmVzcG9uc2UgZGF0YVxuICAgICAgICAgICAgICAgIGlmICghcmVzcG9uc2UuZGF0YS5pZCB8fCByZXNwb25zZS5kYXRhLmlkID09PSAnJykge1xuICAgICAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LmlzTmV3U291bmRGaWxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LmlzTmV3U291bmRGaWxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU2V0IHRoZSBfaXNOZXcgZmxhZyBmb3IgbmV3IHNvdW5kIGZpbGVzXG4gICAgICAgICAgICAgICAgaWYgKHNvdW5kRmlsZU1vZGlmeVJlc3QuaXNOZXdTb3VuZEZpbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YS5faXNOZXcgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChyZWNvcmRJZCAmJiByZWNvcmRJZCAhPT0gJ25ldycpIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGVycm9yIGlmIHRyeWluZyB0byBsb2FkIG5vbi1leGlzdGVudCByZWNvcmRcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IocmVzcG9uc2UubWVzc2FnZXM/LmVycm9yIHx8ICdGYWlsZWQgdG8gbG9hZCBzb3VuZCBmaWxlIGRhdGEnKTtcbiAgICAgICAgICAgICAgICAvLyBSZWRpcmVjdCB0byBpbmRleCBhZnRlciBkZWxheVxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IGAke2dsb2JhbFJvb3RVcmx9c291bmQtZmlsZXMvaW5kZXhgO1xuICAgICAgICAgICAgICAgIH0sIDMwMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBwYXJhbXMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgcmVjb3JkIElEIGZyb20gaGlkZGVuIGlucHV0IGZpZWxkXG4gICAgICogQHJldHVybnMge3N0cmluZ30gUmVjb3JkIElEIG9yIGVtcHR5IHN0cmluZyBmb3IgbmV3IHJlY29yZHNcbiAgICAgKi9cbiAgICBnZXRSZWNvcmRJZCgpIHtcbiAgICAgICAgLy8gR2V0IHJlY29yZCBJRCBmcm9tIGhpZGRlbiBpbnB1dCBzZXQgYnkgY29udHJvbGxlclxuICAgICAgICBjb25zdCByZWNvcmRJZFZhbHVlID0gJCgnI2lkJykudmFsKCk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgaXQncyBhIGNhdGVnb3J5IG5hbWUgKGN1c3RvbS9tb2gpIG9yIGFjdHVhbCBJRFxuICAgICAgICBpZiAocmVjb3JkSWRWYWx1ZSA9PT0gJ2N1c3RvbScgfHwgcmVjb3JkSWRWYWx1ZSA9PT0gJ21vaCcpIHtcbiAgICAgICAgICAgIC8vIFRoaXMgaXMgYSBuZXcgcmVjb3JkIHdpdGggY2F0ZWdvcnkgcHJlc2V0XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVjb3JkSWRWYWx1ZSB8fCAnJztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGNhdGVnb3J5IGZyb20gaGlkZGVuIGlucHV0IGZpZWxkIG9yIFVSTFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd8bnVsbH0gQ2F0ZWdvcnkgKGN1c3RvbS9tb2gpIG9yIG51bGxcbiAgICAgKi9cbiAgICBnZXRDYXRlZ29yeSgpIHtcbiAgICAgICAgLy8gRmlyc3QgY2hlY2sgaWYgSUQgZmllbGQgY29udGFpbnMgY2F0ZWdvcnlcbiAgICAgICAgY29uc3QgcmVjb3JkSWRWYWx1ZSA9ICQoJyNpZCcpLnZhbCgpO1xuICAgICAgICBpZiAocmVjb3JkSWRWYWx1ZSA9PT0gJ2N1c3RvbScgfHwgcmVjb3JkSWRWYWx1ZSA9PT0gJ21vaCcpIHtcbiAgICAgICAgICAgIHJldHVybiByZWNvcmRJZFZhbHVlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgVVJMIHBhcmFtZXRlcnMgZm9yIGNhdGVnb3J5XG4gICAgICAgIGNvbnN0IHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG4gICAgICAgIGNvbnN0IGNhdGVnb3J5UGFyYW0gPSB1cmxQYXJhbXMuZ2V0KCdjYXRlZ29yeScpO1xuICAgICAgICBpZiAoY2F0ZWdvcnlQYXJhbSA9PT0gJ2N1c3RvbScgfHwgY2F0ZWdvcnlQYXJhbSA9PT0gJ21vaCcpIHtcbiAgICAgICAgICAgIHJldHVybiBjYXRlZ29yeVBhcmFtO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBTb3VuZCBmaWxlIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBVc2UgdW5pZmllZCBzaWxlbnQgcG9wdWxhdGlvbiBhcHByb2FjaFxuICAgICAgICAvLyBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5IHdpbGwgaGFuZGxlIF9pc05ldyBmbGFnIGF1dG9tYXRpY2FsbHkgKGxpbmVzIDc2Ni03NzkgaW4gZm9ybS5qcylcbiAgICAgICAgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseShkYXRhLCB7XG4gICAgICAgICAgICBhZnRlclBvcHVsYXRlOiAoZm9ybURhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgYXVkaW8gcGxheWVyIGlmIHBhdGggZXhpc3RzXG4gICAgICAgICAgICAgICAgaWYgKGZvcm1EYXRhLnBhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVXNlIG5ldyBzb3VuZC1maWxlcyBlbmRwb2ludCBmb3IgTU9IL0lWUi9zeXN0ZW0gc291bmRzXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGF1ZGlvVXJsID0gYC9wYnhjb3JlL2FwaS92My9zb3VuZC1maWxlczpwbGF5YmFjaz92aWV3PSR7Zm9ybURhdGEucGF0aH1gO1xuICAgICAgICAgICAgICAgICAgICBzbmRQbGF5ZXIuVXBkYXRlU291cmNlKGF1ZGlvVXJsKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgYmFjay10by1saXN0IGJ1dHRvbiBVUkwgd2l0aCBjdXJyZW50IGNhdGVnb3J5XG4gICAgICAgICAgICAgICAgaWYgKGZvcm1EYXRhLmNhdGVnb3J5KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRiYWNrQnV0dG9uID0gJCgnI2JhY2stdG8tbGlzdC1idXR0b24nKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCRiYWNrQnV0dG9uLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRiYWNrQnV0dG9uLmF0dHIoJ2hyZWYnLCBgJHtnbG9iYWxSb290VXJsfXNvdW5kLWZpbGVzL2luZGV4IyR7Zm9ybURhdGEuY2F0ZWdvcnl9YCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBTYXZlIGluaXRpYWwgdmFsdWVzIGZvciBkaXJyaXR5IGNoZWNraW5nXG4gICAgICAgICAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLnNhdmVJbml0aWFsVmFsdWVzKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xlYXJzIGNhY2hlcyBpZiBkYXRhIGNoYW5nZXMuXG4gICAgICovXG4gICAgY2JPbkRhdGFDaGFuZ2VkKCkge1xuICAgICAgICAvLyBDbGVhciBSRVNUIEFQSSBjYWNoZSBpZiBuZWVkZWQgLSBoYW5kbGVkIGJ5IEFQSSBsYXllclxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBmb3IgZmlsZSB1cGxvYWQgd2l0aCBjaHVua3MgYW5kIG1lcmdlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhY3Rpb24gLSBUaGUgYWN0aW9uIHBlcmZvcm1lZCBkdXJpbmcgdGhlIHVwbG9hZC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gQWRkaXRpb25hbCBwYXJhbWV0ZXJzIHJlbGF0ZWQgdG8gdGhlIHVwbG9hZC5cbiAgICAgKi9cbiAgICBjYlVwbG9hZFJlc3VtYWJsZShhY3Rpb24sIHBhcmFtcykge1xuICAgICAgICBzd2l0Y2ggKGFjdGlvbikge1xuICAgICAgICAgICAgY2FzZSAnZmlsZVN1Y2Nlc3MnOlxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gUGJ4QXBpLnRyeVBhcnNlSlNPTihwYXJhbXMucmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAhPT0gZmFsc2UgJiYgcmVzcG9uc2UuZGF0YS5maWxlbmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEdldCBmaWxlbmFtZSBmcm9tIHJlc3VtYWJsZS5qcyBmaWxlIG9iamVjdCBhbmQgcmVtb3ZlIGV4dGVuc2lvblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWxlTmFtZSA9IHBhcmFtcy5maWxlLmZpbGVOYW1lIHx8IHBhcmFtcy5maWxlLm5hbWU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmaWxlTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kc291bmRGaWxlTmFtZS52YWwoZmlsZU5hbWUucmVwbGFjZSgvXFwuW14vLl0rJC8sICcnKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC5jaGVja1N0YXR1c0ZpbGVNZXJnaW5nKHBhcmFtcy5yZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHBhcmFtcywgZ2xvYmFsVHJhbnNsYXRlLnNmX1VwbG9hZEVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICd1cGxvYWRTdGFydCc6XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZmlsZUVycm9yJzpcbiAgICAgICAgICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHBhcmFtcy5tZXNzYWdlIHx8IHBhcmFtcywgZ2xvYmFsVHJhbnNsYXRlLnNmX1VwbG9hZEVycm9yKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgLy8gT3RoZXIgZXZlbnRzIGRvbid0IG5lZWQgaGFuZGxpbmdcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgdGhlIHN0YXR1cyBvZiBmaWxlIG1lcmdpbmcuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIGZpbGUgbWVyZ2luZyBzdGF0dXMgZnVuY3Rpb24uXG4gICAgICovXG4gICAgY2hlY2tTdGF0dXNGaWxlTWVyZ2luZyhyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UgPT09IHVuZGVmaW5lZCB8fCBQYnhBcGkudHJ5UGFyc2VKU09OKHJlc3BvbnNlKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhgJHtnbG9iYWxUcmFuc2xhdGUuc2ZfVXBsb2FkRXJyb3J9YCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QganNvbiA9IEpTT04ucGFyc2UocmVzcG9uc2UpO1xuICAgICAgICBpZiAoanNvbiA9PT0gdW5kZWZpbmVkIHx8IGpzb24uZGF0YSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoYCR7Z2xvYmFsVHJhbnNsYXRlLnNmX1VwbG9hZEVycm9yfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdXBsb2FkSWQgPSBqc29uLmRhdGEudXBsb2FkX2lkO1xuICAgICAgICBjb25zdCBmaWxlUGF0aCA9IGpzb24uZGF0YS5maWxlbmFtZTtcblxuICAgICAgICAvLyBORVc6IFN1YnNjcmliZSB0byBFdmVudEJ1cyBpbnN0ZWFkIG9mIHVzaW5nIHBvbGxpbmcgd29ya2VyXG4gICAgICAgIEZpbGVVcGxvYWRFdmVudEhhbmRsZXIuc3Vic2NyaWJlKHVwbG9hZElkLCB7XG4gICAgICAgICAgICBvbk1lcmdlU3RhcnRlZDogKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBvbk1lcmdlUHJvZ3Jlc3M6IChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHByb2dyZXNzIGluZGljYXRvciBpZiBuZWVkZWRcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgU291bmQgZmlsZSBtZXJnZSBwcm9ncmVzczogJHtkYXRhLnByb2dyZXNzfSVgKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIG9uTWVyZ2VDb21wbGV0ZTogKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBLZWVwIGxvYWRpbmcgc3RhdGUgZHVyaW5nIGNvbnZlcnNpb25cbiAgICAgICAgICAgICAgICAvLyBQZXJmb3JtIGNvbnZlcnNpb24gYWZ0ZXIgbWVyZ2UgLSB1c2UgdGhlIGZpbGVQYXRoIGZyb20gdGhlIHJlc3BvbnNlXG4gICAgICAgICAgICAgICAgY29uc3QgY2F0ZWdvcnkgPSBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdjYXRlZ29yeScpO1xuICAgICAgICAgICAgICAgIFNvdW5kRmlsZXNBUEkuY29udmVydEF1ZGlvRmlsZSh7dGVtcF9maWxlbmFtZTogZmlsZVBhdGgsIGNhdGVnb3J5OiBjYXRlZ29yeX0sIHNvdW5kRmlsZU1vZGlmeVJlc3QuY2JBZnRlckNvbnZlcnRGaWxlKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIG9uRXJyb3I6IChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhkYXRhLmVycm9yIHx8IGdsb2JhbFRyYW5zbGF0ZS5zZl9VcGxvYWRFcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBhZnRlciB0aGUgZmlsZSBpcyBjb252ZXJ0ZWQgdG8gTVAzIGZvcm1hdC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZW5hbWUgLSBUaGUgZmlsZW5hbWUgb2YgdGhlIGNvbnZlcnRlZCBmaWxlLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJDb252ZXJ0RmlsZShyZXNwb25zZSkge1xuICAgICAgICBjb25zb2xlLmxvZygnW3NvdW5kLWZpbGUtbW9kaWZ5XSBjYkFmdGVyQ29udmVydEZpbGUgcmVzcG9uc2U6JywgcmVzcG9uc2UpO1xuXG4gICAgICAgIGxldCBmaWxlbmFtZSA9IG51bGw7XG5cbiAgICAgICAgLy8gSGFuZGxlIGRpZmZlcmVudCByZXNwb25zZSBmb3JtYXRzXG4gICAgICAgIGlmIChyZXNwb25zZSA9PT0gZmFsc2UgfHwgIXJlc3BvbnNlKSB7XG4gICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhgJHtnbG9iYWxUcmFuc2xhdGUuc2ZfQ29udmVydEVycm9yfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgZm9yIGNvbnZlcnNpb24gZXJyb3IgaW4gcmVzcG9uc2VcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICAvLyBTaG93IGRldGFpbGVkIGVycm9yIG1lc3NhZ2UgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXMgJiYgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3IgJiYgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3IubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLmpvaW4oJzxicj4nKTtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZXJyb3JNZXNzYWdlLCBnbG9iYWxUcmFuc2xhdGUuc2ZfQ29udmVydEVycm9yKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS5zZl9Db252ZXJ0RXJyb3JEZXRhaWxzLCBnbG9iYWxUcmFuc2xhdGUuc2ZfQ29udmVydEVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEV4dHJhY3QgZmlsZW5hbWUgZnJvbSByZXNwb25zZVxuICAgICAgICBpZiAodHlwZW9mIHJlc3BvbnNlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgZmlsZW5hbWUgPSByZXNwb25zZTtcbiAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgLy8gQVBJIHJldHVybnMgZGF0YSBhcyBhcnJheSBbXCIvcGF0aC90by9maWxlXCJdXG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShyZXNwb25zZS5kYXRhKSAmJiByZXNwb25zZS5kYXRhLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBmaWxlbmFtZSA9IHJlc3BvbnNlLmRhdGFbMF07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiByZXNwb25zZS5kYXRhID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIGZpbGVuYW1lID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnNvbGUubG9nKCdbc291bmQtZmlsZS1tb2RpZnldIGV4dHJhY3RlZCBmaWxlbmFtZTonLCBmaWxlbmFtZSk7XG5cbiAgICAgICAgaWYgKGZpbGVuYW1lKSB7XG4gICAgICAgICAgICAvLyBBZGQgb2xkIGZpbGUgdG8gdHJhc2ggYmluIGZvciBkZWxldGlvbiBhZnRlciBzYXZlXG4gICAgICAgICAgICBjb25zdCBvbGRQYXRoID0gc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAncGF0aCcpO1xuICAgICAgICAgICAgaWYgKG9sZFBhdGgpIHtcbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LnRyYXNoQmluLnB1c2gob2xkUGF0aCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmb3JtIHdpdGggbmV3IGZpbGUgcGF0aFxuICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAncGF0aCcsIGZpbGVuYW1lKTtcbiAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJHNvdW5kRmlsZU5hbWUudHJpZ2dlcignY2hhbmdlJyk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBwbGF5ZXIgd2l0aCBuZXcgZmlsZSB1c2luZyBzb3VuZC1maWxlcyBlbmRwb2ludFxuICAgICAgICAgICAgc25kUGxheWVyLlVwZGF0ZVNvdXJjZShgL3BieGNvcmUvYXBpL3YzL3NvdW5kLWZpbGVzOnBsYXliYWNrP3ZpZXc9JHtmaWxlbmFtZX1gKTtcblxuICAgICAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgc3RhdGVzXG4gICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS5zZl9Db252ZXJ0RXJyb3JEZXRhaWxzLCBnbG9iYWxUcmFuc2xhdGUuc2ZfQ29udmVydEVycm9yKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm0uXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybS5cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAvLyBEZWxldGUgb2xkIGZpbGVzIGZyb20gdHJhc2ggYmluXG4gICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LnRyYXNoQmluLmZvckVhY2goKGZpbGVwYXRoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGZpbGVwYXRoKSBGaWxlc0FQSS5yZW1vdmVBdWRpb0ZpbGUoZmlsZXBhdGgsICgpID0+IHt9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC50cmFzaEJpbiA9IFtdO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgZm9ybSB3aXRoIG5ldyBkYXRhIGlmIHByb3ZpZGVkXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIC8vIElmIHRoaXMgd2FzIGEgbmV3IHNvdW5kIGZpbGUgdGhhdCB3YXMgc2F2ZWQsIHVwZGF0ZSBzdGF0ZVxuICAgICAgICAgICAgICAgIGlmIChzb3VuZEZpbGVNb2RpZnlSZXN0LmlzTmV3U291bmRGaWxlICYmIHJlc3BvbnNlLmRhdGEuaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBmb3JtIElEIGZpZWxkXG4gICAgICAgICAgICAgICAgICAgICQoJyNpZCcpLnZhbChyZXNwb25zZS5kYXRhLmlkKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgaXNOZXdTb3VuZEZpbGUgZmxhZ1xuICAgICAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LmlzTmV3U291bmRGaWxlID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlIF9pc05ldyBmbGFnIGZyb20gZm9ybVxuICAgICAgICAgICAgICAgICAgICAkKCcjX2lzTmV3JykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEZvcm0uanMgd2lsbCBoYW5kbGUgYWxsIHJlZGlyZWN0IGxvZ2ljIGJhc2VkIG9uIHN1Ym1pdE1vZGVcblxuICAgICAgICAgICAgLy8gVHJpZ2dlciBjb25maWcgY2hhbmdlZCBldmVudCB0byByZWZyZXNoIGxpc3RzXG4gICAgICAgICAgICBjb25zdCBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuICAgICAgICAgICAgZXZlbnQuaW5pdEV2ZW50KCdDb25maWdEYXRhQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcbiAgICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIGNvbnN0IGNhdGVnb3J5ID0gc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnY2F0ZWdvcnknKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyZSBGb3JtLmpzXG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBzb3VuZEZpbGVNb2RpZnlSZXN0LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IHNvdW5kRmlsZU1vZGlmeVJlc3QuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBzb3VuZEZpbGVNb2RpZnlSZXN0LmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyZSBSRVNUIEFQSSBpbnRlZ3JhdGlvblxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzID0ge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGFwaU9iamVjdDogU291bmRGaWxlc0FQSSxcbiAgICAgICAgICAgIHNhdmVNZXRob2Q6ICdzYXZlUmVjb3JkJ1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIHJlZGlyZWN0IFVSTHNcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9c291bmQtZmlsZXMvbW9kaWZ5L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9c291bmQtZmlsZXMvaW5kZXgvIy8ke2NhdGVnb3J5fWA7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxufTtcblxuLy8gTm90ZTogbWVyZ2luZ0NoZWNrV29ya2VyLmNiQWZ0ZXJNZXJnaW5nIGlzIG5vdyBoYW5kbGVkIHZpYSBFdmVudEJ1cyBpbiBjaGVja1N0YXR1c0ZpbGVNZXJnaW5nIG1ldGhvZFxuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgc291bmQgZmlsZSBtb2RpZnkgZm9ybVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZSgpO1xufSk7Il19