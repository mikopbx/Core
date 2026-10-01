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
   * Resolved in initialize() — must not call $() at module-load time.
   * @type {jQuery}
   */
  $soundUploadButton: null,

  /**
   * jQuery object for the sound file name input.
   * @type {jQuery}
   */
  $soundFileName: null,

  /**
   * jQuery object for the audio player.
   * @type {jQuery}
   */
  $audioPlayer: null,

  /**
   * jQuery object for the submit button.
   * @type {jQuery}
   */
  $submitButton: null,

  /**
   * The Blob URL object.
   * @type {Blob}
   */
  blob: window.URL || window.webkitURL,

  /**
   * jQuery object for the form.
   * @type {jQuery}
   */
  $formObj: null,

  /**
   * jQuery object for the form dropdowns.
   * @type {jQuery}
   */
  $dropDowns: null,

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
   * Returns true when the name field may be auto-populated from the uploaded
   * file name. Auto-fill is allowed only when the field is empty so that
   * re-uploading audio over an existing record preserves the user's display name.
   * @returns {boolean}
   */
  shouldAutoFillName: function shouldAutoFillName() {
    var currentName = (soundFileModifyRest.$soundFileName.val() || '').trim();
    return currentName === '';
  },

  /**
   * Initializes the sound file modification functionality.
   */
  initialize: function initialize() {
    soundFileModifyRest.$soundUploadButton = $('#upload-sound-file');
    soundFileModifyRest.$soundFileName = $('#name');
    soundFileModifyRest.$audioPlayer = $('#audio-player');
    soundFileModifyRest.$submitButton = $('#submitbutton');
    soundFileModifyRest.$formObj = $('#sound-file-form');
    soundFileModifyRest.$dropDowns = $('#sound-file-form .dropdown'); // Initialize dropdowns

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

            if (fileName && soundFileModifyRest.shouldAutoFillName()) {
              // Auto-fill name from filename only when the field is empty
              // (new record). Re-uploading over an existing record keeps the
              // user-entered display name.
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
    }, 'sound-file', 'sound'); // Listen for data changes to clear cache

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
          // Auto-fill name only on new records — preserve user input on re-upload.
          var fileName = params.file.fileName || params.file.name;

          if (fileName && soundFileModifyRest.shouldAutoFillName()) {
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
      if (typeof response.data === 'object' && response.data.path) {
        filename = response.data.path;
      }
      // API returns data as array ["/path/to/file"]
      else if (Array.isArray(response.data) && response.data.length > 0) {
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
      soundFileModifyRest.$formObj.form('set value', 'conversion_id', response.data.conversion_id || '');
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGUtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbInNvdW5kRmlsZU1vZGlmeVJlc3QiLCJ0cmFzaEJpbiIsIiRzb3VuZFVwbG9hZEJ1dHRvbiIsIiRzb3VuZEZpbGVOYW1lIiwiJGF1ZGlvUGxheWVyIiwiJHN1Ym1pdEJ1dHRvbiIsImJsb2IiLCJ3aW5kb3ciLCJVUkwiLCJ3ZWJraXRVUkwiLCIkZm9ybU9iaiIsIiRkcm9wRG93bnMiLCJpc05ld1NvdW5kRmlsZSIsInZhbGlkYXRlUnVsZXMiLCJuYW1lIiwiaWRlbnRpZmllciIsInJ1bGVzIiwidHlwZSIsInByb21wdCIsImdsb2JhbFRyYW5zbGF0ZSIsInNmX1ZhbGlkYXRpb25GaWxlTmFtZUlzRW1wdHkiLCJwYXRoIiwic2ZfVmFsaWRhdGlvbkZpbGVOb3RTZWxlY3RlZCIsInNob3VsZEF1dG9GaWxsTmFtZSIsImN1cnJlbnROYW1lIiwidmFsIiwidHJpbSIsImluaXRpYWxpemUiLCIkIiwiZHJvcGRvd24iLCJsb2FkRm9ybURhdGEiLCJpbml0aWFsaXplRm9ybSIsIkZpbGVzQVBJIiwiYXR0YWNoVG9CdG4iLCJhY3Rpb24iLCJwYXJhbXMiLCJjb25zb2xlIiwibG9nIiwiZmlsZSIsImZpbGVOYW1lIiwicmVwbGFjZSIsImZpbGVVUkwiLCJjcmVhdGVPYmplY3RVUkwiLCJzbmRQbGF5ZXIiLCJVcGRhdGVTb3VyY2UiLCJjYlVwbG9hZFJlc3VtYWJsZSIsImFkZEV2ZW50TGlzdGVuZXIiLCJjYk9uRGF0YUNoYW5nZWQiLCJyZWNvcmRJZCIsImdldFJlY29yZElkIiwiY2F0ZWdvcnkiLCJnZXRDYXRlZ29yeSIsImFkZENsYXNzIiwiU291bmRGaWxlc0FQSSIsImdldFJlY29yZCIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJyZXN1bHQiLCJkYXRhIiwiaWQiLCJfaXNOZXciLCJwb3B1bGF0ZUZvcm0iLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIm1lc3NhZ2VzIiwiZXJyb3IiLCJzZXRUaW1lb3V0IiwibG9jYXRpb24iLCJocmVmIiwiZ2xvYmFsUm9vdFVybCIsInJlY29yZElkVmFsdWUiLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJzZWFyY2giLCJjYXRlZ29yeVBhcmFtIiwiZ2V0IiwiRm9ybSIsInBvcHVsYXRlRm9ybVNpbGVudGx5IiwiYWZ0ZXJQb3B1bGF0ZSIsImZvcm1EYXRhIiwiYXVkaW9VcmwiLCIkYmFja0J1dHRvbiIsImxlbmd0aCIsImF0dHIiLCJlbmFibGVEaXJyaXR5Iiwic2F2ZUluaXRpYWxWYWx1ZXMiLCJQYnhBcGkiLCJ0cnlQYXJzZUpTT04iLCJmaWxlbmFtZSIsInVuZGVmaW5lZCIsImNoZWNrU3RhdHVzRmlsZU1lcmdpbmciLCJzaG93TXVsdGlTdHJpbmciLCJzZl9VcGxvYWRFcnJvciIsIm1lc3NhZ2UiLCJqc29uIiwiSlNPTiIsInBhcnNlIiwidXBsb2FkSWQiLCJ1cGxvYWRfaWQiLCJmaWxlUGF0aCIsIkZpbGVVcGxvYWRFdmVudEhhbmRsZXIiLCJzdWJzY3JpYmUiLCJvbk1lcmdlU3RhcnRlZCIsIm9uTWVyZ2VQcm9ncmVzcyIsInByb2dyZXNzIiwib25NZXJnZUNvbXBsZXRlIiwiZm9ybSIsImNvbnZlcnRBdWRpb0ZpbGUiLCJ0ZW1wX2ZpbGVuYW1lIiwiY2JBZnRlckNvbnZlcnRGaWxlIiwib25FcnJvciIsInNmX0NvbnZlcnRFcnJvciIsImVycm9yTWVzc2FnZSIsImpvaW4iLCJzZl9Db252ZXJ0RXJyb3JEZXRhaWxzIiwiQXJyYXkiLCJpc0FycmF5Iiwib2xkUGF0aCIsInB1c2giLCJ0cmlnZ2VyIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwiY2JBZnRlclNlbmRGb3JtIiwiZm9yRWFjaCIsImZpbGVwYXRoIiwicmVtb3ZlQXVkaW9GaWxlIiwicmVtb3ZlIiwiZXZlbnQiLCJkb2N1bWVudCIsImNyZWF0ZUV2ZW50IiwiaW5pdEV2ZW50IiwiZGlzcGF0Y2hFdmVudCIsInVybCIsImFwaVNldHRpbmdzIiwiZW5hYmxlZCIsImFwaU9iamVjdCIsInNhdmVNZXRob2QiLCJhZnRlclN1Ym1pdE1vZGlmeVVybCIsImFmdGVyU3VibWl0SW5kZXhVcmwiLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsbUJBQW1CLEdBQUc7QUFDeEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsUUFBUSxFQUFFLEVBTGM7O0FBT3hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsa0JBQWtCLEVBQUUsSUFaSTs7QUFleEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsY0FBYyxFQUFFLElBbkJROztBQXFCeEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsWUFBWSxFQUFFLElBekJVOztBQTJCeEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFLElBL0JTOztBQWlDeEI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsSUFBSSxFQUFFQyxNQUFNLENBQUNDLEdBQVAsSUFBY0QsTUFBTSxDQUFDRSxTQXJDSDs7QUF1Q3hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFFBQVEsRUFBRSxJQTNDYzs7QUE2Q3hCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFVBQVUsRUFBRSxJQWpEWTs7QUFtRHhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGNBQWMsRUFBRSxLQXZEUTs7QUF5RHhCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsYUFBYSxFQUFFO0FBQ1hDLElBQUFBLElBQUksRUFBRTtBQUNGQyxNQUFBQSxVQUFVLEVBQUUsTUFEVjtBQUVGQyxNQUFBQSxLQUFLLEVBQUUsQ0FDSDtBQUNJQyxRQUFBQSxJQUFJLEVBQUUs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YixRQUFNbUIsUUFBUSxHQUFHbEQsbUJBQW1CLENBQUNVLFFBQXBCLENBQTZCZ0csSUFBN0IsQ0FBa0MsV0FBbEMsRUFBK0MsVUFBL0MsQ0FBakIsQ0FEYSxDQUdiOztBQUNBOUIsSUFBQUEsSUFBSSxDQUFDbEUsUUFBTCxHQUFnQlYsbUJBQW1CLENBQUNVLFFBQXBDO0FBQ0FrRSxJQUFBQSxJQUFJLENBQUN3RCxHQUFMLEdBQVcsR0FBWCxDQUxhLENBS0c7O0FBQ2hCeEQsSUFBQUEsSUFBSSxDQUFDL0QsYUFBTCxHQUFxQmIsbUJBQW1CLENBQUNhLGFBQXpDO0FBQ0ErRCxJQUFBQSxJQUFJLENBQUM0QyxnQkFBTCxHQUF3QnhILG1CQUFtQixDQUFDd0gsZ0JBQTVDO0FBQ0E1QyxJQUFBQSxJQUFJLENBQUM4QyxlQUFMLEdBQXVCMUgsbUJBQW1CLENBQUMwSCxlQUEzQyxDQVJhLENBVWI7O0FBQ0E5QyxJQUFBQSxJQUFJLENBQUN5RCxXQUFMLEdBQW1CO0FBQ2ZDLE1BQUFBLE9BQU8sRUFBRSxJQURNO0FBRWZDLE1BQUFBLFNBQVMsRUFBRWxGLGFBRkk7QUFHZm1GLE1BQUFBLFVBQVUsRUFBRTtBQUhHLEtBQW5CLENBWGEsQ0FpQmI7O0FBQ0E1RCxJQUFBQSxJQUFJLENBQUM2RCxvQkFBTCxhQUErQnBFLGFBQS9CO0FBQ0FPLElBQUFBLElBQUksQ0FBQzhELG1CQUFMLGFBQThCckUsYUFBOUIsaUNBQWtFbkIsUUFBbEU7QUFFQTBCLElBQUFBLElBQUksQ0FBQ2pELFVBQUw7QUFDSDtBQXJmdUIsQ0FBNUIsQyxDQXdmQTtBQUVBOztBQUNBQyxDQUFDLENBQUNvRyxRQUFELENBQUQsQ0FBWVcsS0FBWixDQUFrQixZQUFNO0FBQ3BCM0ksRUFBQUEsbUJBQW1CLENBQUMyQixVQUFwQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBQYnhBcGksIHNuZFBsYXllciwgU291bmRGaWxlc0FQSSwgVXNlck1lc3NhZ2UsIENvbmZpZywgRmlsZVVwbG9hZEV2ZW50SGFuZGxlciwgRmlsZXNBUEksIFN5c3RlbUFQSSAqL1xuXG4vKipcbiAqIFNvdW5kIGZpbGUgbW9kaWZpY2F0aW9uIG1vZHVsZSB3aXRoIFJFU1QgQVBJIGludGVncmF0aW9uXG4gKiBUaGlzIG1vZHVsZSByZXBsYWNlcyBzb3VuZC1maWxlLW1vZGlmeS5qcyB3aXRoIFJFU1QgQVBJIGNhbGxzIHdoaWxlIHByZXNlcnZpbmdcbiAqIGFsbCBleGlzdGluZyBmdW5jdGlvbmFsaXR5IGluY2x1ZGluZyBmaWxlIHVwbG9hZCwgYXVkaW8gcmVjb3JkaW5nLCBhbmQgcGxheWVyXG4gKlxuICogQG1vZHVsZSBzb3VuZEZpbGVNb2RpZnlSZXN0XG4gKi9cbmNvbnN0IHNvdW5kRmlsZU1vZGlmeVJlc3QgPSB7XG4gICAgLyoqXG4gICAgICogQXJyYXkgdG8gc3RvcmUgcGF0aHMgb2YgZmlsZXMgdG8gYmUgZGVsZXRlZCBhZnRlciBzYXZlXG4gICAgICogQHR5cGUge0FycmF5fVxuICAgICAqL1xuICAgIHRyYXNoQmluOiBbXSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBzb3VuZCB1cGxvYWQgYnV0dG9uLlxuICAgICAqIFJlc29sdmVkIGluIGluaXRpYWxpemUoKSDigJQgbXVzdCBub3QgY2FsbCAkKCkgYXQgbW9kdWxlLWxvYWQgdGltZS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzb3VuZFVwbG9hZEJ1dHRvbjogbnVsbCxcblxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHNvdW5kIGZpbGUgbmFtZSBpbnB1dC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzb3VuZEZpbGVOYW1lOiBudWxsLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGF1ZGlvIHBsYXllci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRhdWRpb1BsYXllcjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBzdWJtaXQgYnV0dG9uLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHN1Ym1pdEJ1dHRvbjogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIFRoZSBCbG9iIFVSTCBvYmplY3QuXG4gICAgICogQHR5cGUge0Jsb2J9XG4gICAgICovXG4gICAgYmxvYjogd2luZG93LlVSTCB8fCB3aW5kb3cud2Via2l0VVJMLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtIGRyb3Bkb3ducy5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkcm9wRG93bnM6IG51bGwsXG5cbiAgICAvKipcbiAgICAgKiBUcmFjayBpZiB0aGlzIGlzIGEgbmV3IHNvdW5kIGZpbGUgKG5vdCBleGlzdGluZyBpbiBkYXRhYmFzZSlcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBpc05ld1NvdW5kRmlsZTogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgbmFtZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ25hbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnNmX1ZhbGlkYXRpb25GaWxlTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHBhdGg6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwYXRoJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5zZl9WYWxpZGF0aW9uRmlsZU5vdFNlbGVjdGVkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXR1cm5zIHRydWUgd2hlbiB0aGUgbmFtZSBmaWVsZCBtYXkgYmUgYXV0by1wb3B1bGF0ZWQgZnJvbSB0aGUgdXBsb2FkZWRcbiAgICAgKiBmaWxlIG5hbWUuIEF1dG8tZmlsbCBpcyBhbGxvd2VkIG9ubHkgd2hlbiB0aGUgZmllbGQgaXMgZW1wdHkgc28gdGhhdFxuICAgICAqIHJlLXVwbG9hZGluZyBhdWRpbyBvdmVyIGFuIGV4aXN0aW5nIHJlY29yZCBwcmVzZXJ2ZXMgdGhlIHVzZXIncyBkaXNwbGF5IG5hbWUuXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgc2hvdWxkQXV0b0ZpbGxOYW1lKCkge1xuICAgICAgICBjb25zdCBjdXJyZW50TmFtZSA9IChzb3VuZEZpbGVNb2RpZnlSZXN0LiRzb3VuZEZpbGVOYW1lLnZhbCgpIHx8ICcnKS50cmltKCk7XG4gICAgICAgIHJldHVybiBjdXJyZW50TmFtZSA9PT0gJyc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBzb3VuZCBmaWxlIG1vZGlmaWNhdGlvbiBmdW5jdGlvbmFsaXR5LlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJHNvdW5kVXBsb2FkQnV0dG9uID0gJCgnI3VwbG9hZC1zb3VuZC1maWxlJyk7XG4gICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJHNvdW5kRmlsZU5hbWUgPSAkKCcjbmFtZScpO1xuICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRhdWRpb1BsYXllciA9ICQoJyNhdWRpby1wbGF5ZXInKTtcbiAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kc3VibWl0QnV0dG9uID0gJCgnI3N1Ym1pdGJ1dHRvbicpO1xuICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqID0gJCgnI3NvdW5kLWZpbGUtZm9ybScpO1xuICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRkcm9wRG93bnMgPSAkKCcjc291bmQtZmlsZS1mb3JtIC5kcm9wZG93bicpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25zXG4gICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJGRyb3BEb3ducy5kcm9wZG93bigpO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBmb3JtIGRhdGEgZnJvbSBSRVNUIEFQSVxuICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LmxvYWRGb3JtRGF0YSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtIHZhbGlkYXRpb24gYW5kIHN1Ym1pc3Npb25cbiAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC5pbml0aWFsaXplRm9ybSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZmlsZSB1cGxvYWQgdXNpbmcgRmlsZXNBUEkuYXR0YWNoVG9CdG4gZm9yIHVuaWZpZWQgYmVoYXZpb3JcbiAgICAgICAgLy8gUGFzcyAnc291bmQtZmlsZScgYXMgaW5wdXROYW1lIGZvciB0ZXN0IGNvbXBhdGliaWxpdHlcbiAgICAgICAgRmlsZXNBUEkuYXR0YWNoVG9CdG4oJ3VwbG9hZC1zb3VuZC1maWxlJywgWyd3YXYnLCAnbXAzJywgJ29nZycsICdtNGEnLCAnYWFjJ10sIChhY3Rpb24sIHBhcmFtcykgPT4ge1xuICAgICAgICAgICAgc3dpdGNoIChhY3Rpb24pIHtcbiAgICAgICAgICAgICAgICBjYXNlICdmaWxlQWRkZWQnOlxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW3NvdW5kLWZpbGUtbW9kaWZ5XSBmaWxlQWRkZWQgcGFyYW1zOicsIHBhcmFtcyk7XG4gICAgICAgICAgICAgICAgICAgIGlmIChwYXJhbXMuZmlsZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tzb3VuZC1maWxlLW1vZGlmeV0gcGFyYW1zLmZpbGU6JywgcGFyYW1zLmZpbGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgLy8gR2V0IGZpbGVuYW1lIGZyb20gcmVzdW1hYmxlLmpzIGZpbGUgb2JqZWN0IChjYW4gYmUgZmlsZU5hbWUgb3IgbmFtZSlcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVOYW1lID0gcGFyYW1zLmZpbGUuZmlsZU5hbWUgfHwgcGFyYW1zLmZpbGUubmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbc291bmQtZmlsZS1tb2RpZnldIGV4dHJhY3RlZCBmaWxlTmFtZTonLCBmaWxlTmFtZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmlsZU5hbWUgJiYgc291bmRGaWxlTW9kaWZ5UmVzdC5zaG91bGRBdXRvRmlsbE5hbWUoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEF1dG8tZmlsbCBuYW1lIGZyb20gZmlsZW5hbWUgb25seSB3aGVuIHRoZSBmaWVsZCBpcyBlbXB0eVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIChuZXcgcmVjb3JkKS4gUmUtdXBsb2FkaW5nIG92ZXIgYW4gZXhpc3RpbmcgcmVjb3JkIGtlZXBzIHRoZVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIHVzZXItZW50ZXJlZCBkaXNwbGF5IG5hbWUuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kc291bmRGaWxlTmFtZS52YWwoZmlsZU5hbWUucmVwbGFjZSgvXFwuW14vLl0rJC8sICcnKSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBibG9iIFVSTCBmb3IgcHJldmlld1xuICAgICAgICAgICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC5ibG9iID0gd2luZG93LlVSTCB8fCB3aW5kb3cud2Via2l0VVJMO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZVVSTCA9IHNvdW5kRmlsZU1vZGlmeVJlc3QuYmxvYi5jcmVhdGVPYmplY3RVUkwocGFyYW1zLmZpbGUuZmlsZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBzbmRQbGF5ZXIuVXBkYXRlU291cmNlKGZpbGVVUkwpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgIGNhc2UgJ2ZpbGVTdWNjZXNzJzpcbiAgICAgICAgICAgICAgICBjYXNlICdmaWxlUHJvZ3Jlc3MnOlxuICAgICAgICAgICAgICAgIGNhc2UgJ3VwbG9hZFN0YXJ0JzpcbiAgICAgICAgICAgICAgICBjYXNlICdlcnJvcic6XG4gICAgICAgICAgICAgICAgY2FzZSAnY29tcGxldGUnOlxuICAgICAgICAgICAgICAgICAgICAvLyBGb3J3YXJkIGFsbCBvdGhlciBldmVudHMgdG8gdGhlIG9yaWdpbmFsIGNhbGxiYWNrXG4gICAgICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuY2JVcGxvYWRSZXN1bWFibGUoYWN0aW9uLCBwYXJhbXMpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgJ3NvdW5kLWZpbGUnKTtcbiAgICAgICAgXG4gICAgICAgIC8vIExpc3RlbiBmb3IgZGF0YSBjaGFuZ2VzIHRvIGNsZWFyIGNhY2hlXG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdDb25maWdEYXRhQ2hhbmdlZCcsIHNvdW5kRmlsZU1vZGlmeVJlc3QuY2JPbkRhdGFDaGFuZ2VkKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBmb3JtIGRhdGEgZnJvbSBSRVNUIEFQSVxuICAgICAqL1xuICAgIGxvYWRGb3JtRGF0YSgpIHtcbiAgICAgICAgY29uc3QgcmVjb3JkSWQgPSBzb3VuZEZpbGVNb2RpZnlSZXN0LmdldFJlY29yZElkKCk7XG4gICAgICAgIGNvbnN0IGNhdGVnb3J5ID0gc291bmRGaWxlTW9kaWZ5UmVzdC5nZXRDYXRlZ29yeSgpO1xuXG4gICAgICAgIC8vIERldGVybWluZSBpZiB0aGlzIGlzIGEgbmV3IHNvdW5kIGZpbGVcbiAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC5pc05ld1NvdW5kRmlsZSA9ICFyZWNvcmRJZCB8fCByZWNvcmRJZCA9PT0gJycgfHwgcmVjb3JkSWQgPT09ICduZXcnO1xuXG4gICAgICAgIC8vIFNob3cgbG9hZGluZyBzdGF0ZVxuICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgLy8gUGFzcyBjYXRlZ29yeSBmb3IgbmV3IHJlY29yZHNcbiAgICAgICAgY29uc3QgcGFyYW1zID0gY2F0ZWdvcnkgPyB7IGNhdGVnb3J5OiBjYXRlZ29yeSB9IDoge307XG5cbiAgICAgICAgU291bmRGaWxlc0FQSS5nZXRSZWNvcmQocmVjb3JkSWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGlzTmV3U291bmRGaWxlIGJhc2VkIG9uIGFjdHVhbCBkYXRhIGZyb20gc2VydmVyXG4gICAgICAgICAgICAgICAgLy8gTmV3IHNvdW5kIGZpbGVzIHdvbid0IGhhdmUgYW4gaWQgaW4gdGhlIHJlc3BvbnNlIGRhdGFcbiAgICAgICAgICAgICAgICBpZiAoIXJlc3BvbnNlLmRhdGEuaWQgfHwgcmVzcG9uc2UuZGF0YS5pZCA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC5pc05ld1NvdW5kRmlsZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC5pc05ld1NvdW5kRmlsZSA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFNldCB0aGUgX2lzTmV3IGZsYWcgZm9yIG5ldyBzb3VuZCBmaWxlc1xuICAgICAgICAgICAgICAgIGlmIChzb3VuZEZpbGVNb2RpZnlSZXN0LmlzTmV3U291bmRGaWxlKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc3BvbnNlLmRhdGEuX2lzTmV3ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LnBvcHVsYXRlRm9ybShyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAocmVjb3JkSWQgJiYgcmVjb3JkSWQgIT09ICduZXcnKSB7XG4gICAgICAgICAgICAgICAgLy8gU2hvdyBlcnJvciBpZiB0cnlpbmcgdG8gbG9hZCBub24tZXhpc3RlbnQgcmVjb3JkXG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd0Vycm9yKHJlc3BvbnNlLm1lc3NhZ2VzPy5lcnJvciB8fCAnRmFpbGVkIHRvIGxvYWQgc291bmQgZmlsZSBkYXRhJyk7XG4gICAgICAgICAgICAgICAgLy8gUmVkaXJlY3QgdG8gaW5kZXggYWZ0ZXIgZGVsYXlcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSBgJHtnbG9iYWxSb290VXJsfXNvdW5kLWZpbGVzL2luZGV4YDtcbiAgICAgICAgICAgICAgICB9LCAzMDAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSwgcGFyYW1zKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBJRCBmcm9tIGhpZGRlbiBpbnB1dCBmaWVsZFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFJlY29yZCBJRCBvciBlbXB0eSBzdHJpbmcgZm9yIG5ldyByZWNvcmRzXG4gICAgICovXG4gICAgZ2V0UmVjb3JkSWQoKSB7XG4gICAgICAgIC8vIEdldCByZWNvcmQgSUQgZnJvbSBoaWRkZW4gaW5wdXQgc2V0IGJ5IGNvbnRyb2xsZXJcbiAgICAgICAgY29uc3QgcmVjb3JkSWRWYWx1ZSA9ICQoJyNpZCcpLnZhbCgpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGl0J3MgYSBjYXRlZ29yeSBuYW1lIChjdXN0b20vbW9oKSBvciBhY3R1YWwgSURcbiAgICAgICAgaWYgKHJlY29yZElkVmFsdWUgPT09ICdjdXN0b20nIHx8IHJlY29yZElkVmFsdWUgPT09ICdtb2gnKSB7XG4gICAgICAgICAgICAvLyBUaGlzIGlzIGEgbmV3IHJlY29yZCB3aXRoIGNhdGVnb3J5IHByZXNldFxuICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlY29yZElkVmFsdWUgfHwgJyc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCBjYXRlZ29yeSBmcm9tIGhpZGRlbiBpbnB1dCBmaWVsZCBvciBVUkxcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfG51bGx9IENhdGVnb3J5IChjdXN0b20vbW9oKSBvciBudWxsXG4gICAgICovXG4gICAgZ2V0Q2F0ZWdvcnkoKSB7XG4gICAgICAgIC8vIEZpcnN0IGNoZWNrIGlmIElEIGZpZWxkIGNvbnRhaW5zIGNhdGVnb3J5XG4gICAgICAgIGNvbnN0IHJlY29yZElkVmFsdWUgPSAkKCcjaWQnKS52YWwoKTtcbiAgICAgICAgaWYgKHJlY29yZElkVmFsdWUgPT09ICdjdXN0b20nIHx8IHJlY29yZElkVmFsdWUgPT09ICdtb2gnKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVjb3JkSWRWYWx1ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIFVSTCBwYXJhbWV0ZXJzIGZvciBjYXRlZ29yeVxuICAgICAgICBjb25zdCB1cmxQYXJhbXMgPSBuZXcgVVJMU2VhcmNoUGFyYW1zKHdpbmRvdy5sb2NhdGlvbi5zZWFyY2gpO1xuICAgICAgICBjb25zdCBjYXRlZ29yeVBhcmFtID0gdXJsUGFyYW1zLmdldCgnY2F0ZWdvcnknKTtcbiAgICAgICAgaWYgKGNhdGVnb3J5UGFyYW0gPT09ICdjdXN0b20nIHx8IGNhdGVnb3J5UGFyYW0gPT09ICdtb2gnKSB7XG4gICAgICAgICAgICByZXR1cm4gY2F0ZWdvcnlQYXJhbTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBQb3B1bGF0ZSBmb3JtIHdpdGggZGF0YVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBkYXRhIC0gU291bmQgZmlsZSBkYXRhIGZyb20gQVBJXG4gICAgICovXG4gICAgcG9wdWxhdGVGb3JtKGRhdGEpIHtcbiAgICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2hcbiAgICAgICAgLy8gRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseSB3aWxsIGhhbmRsZSBfaXNOZXcgZmxhZyBhdXRvbWF0aWNhbGx5IChsaW5lcyA3NjYtNzc5IGluIGZvcm0uanMpXG4gICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoZGF0YSwge1xuICAgICAgICAgICAgYWZ0ZXJQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGF1ZGlvIHBsYXllciBpZiBwYXRoIGV4aXN0c1xuICAgICAgICAgICAgICAgIGlmIChmb3JtRGF0YS5wYXRoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFVzZSBuZXcgc291bmQtZmlsZXMgZW5kcG9pbnQgZm9yIE1PSC9JVlIvc3lzdGVtIHNvdW5kc1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBhdWRpb1VybCA9IGAvcGJ4Y29yZS9hcGkvdjMvc291bmQtZmlsZXM6cGxheWJhY2s/dmlldz0ke2Zvcm1EYXRhLnBhdGh9YDtcbiAgICAgICAgICAgICAgICAgICAgc25kUGxheWVyLlVwZGF0ZVNvdXJjZShhdWRpb1VybCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGJhY2stdG8tbGlzdCBidXR0b24gVVJMIHdpdGggY3VycmVudCBjYXRlZ29yeVxuICAgICAgICAgICAgICAgIGlmIChmb3JtRGF0YS5jYXRlZ29yeSkge1xuICAgICAgICAgICAgICAgICAgICBjb25zdCAkYmFja0J1dHRvbiA9ICQoJyNiYWNrLXRvLWxpc3QtYnV0dG9uJyk7XG4gICAgICAgICAgICAgICAgICAgIGlmICgkYmFja0J1dHRvbi5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAkYmFja0J1dHRvbi5hdHRyKCdocmVmJywgYCR7Z2xvYmFsUm9vdFVybH1zb3VuZC1maWxlcy9pbmRleCMke2Zvcm1EYXRhLmNhdGVnb3J5fWApO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU2F2ZSBpbml0aWFsIHZhbHVlcyBmb3IgZGlycml0eSBjaGVja2luZ1xuICAgICAgICAgICAgICAgIGlmIChGb3JtLmVuYWJsZURpcnJpdHkpIHtcbiAgICAgICAgICAgICAgICAgICAgRm9ybS5zYXZlSW5pdGlhbFZhbHVlcygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENsZWFycyBjYWNoZXMgaWYgZGF0YSBjaGFuZ2VzLlxuICAgICAqL1xuICAgIGNiT25EYXRhQ2hhbmdlZCgpIHtcbiAgICAgICAgLy8gQ2xlYXIgUkVTVCBBUEkgY2FjaGUgaWYgbmVlZGVkIC0gaGFuZGxlZCBieSBBUEkgbGF5ZXJcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gZm9yIGZpbGUgdXBsb2FkIHdpdGggY2h1bmtzIGFuZCBtZXJnZS5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYWN0aW9uIC0gVGhlIGFjdGlvbiBwZXJmb3JtZWQgZHVyaW5nIHRoZSB1cGxvYWQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHBhcmFtcyAtIEFkZGl0aW9uYWwgcGFyYW1ldGVycyByZWxhdGVkIHRvIHRoZSB1cGxvYWQuXG4gICAgICovXG4gICAgY2JVcGxvYWRSZXN1bWFibGUoYWN0aW9uLCBwYXJhbXMpIHtcbiAgICAgICAgc3dpdGNoIChhY3Rpb24pIHtcbiAgICAgICAgICAgIGNhc2UgJ2ZpbGVTdWNjZXNzJzpcbiAgICAgICAgICAgICAgICBjb25zdCByZXNwb25zZSA9IFBieEFwaS50cnlQYXJzZUpTT04ocGFyYW1zLnJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICBpZiAocmVzcG9uc2UgIT09IGZhbHNlICYmIHJlc3BvbnNlLmRhdGEuZmlsZW5hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBBdXRvLWZpbGwgbmFtZSBvbmx5IG9uIG5ldyByZWNvcmRzIOKAlCBwcmVzZXJ2ZSB1c2VyIGlucHV0IG9uIHJlLXVwbG9hZC5cbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZU5hbWUgPSBwYXJhbXMuZmlsZS5maWxlTmFtZSB8fCBwYXJhbXMuZmlsZS5uYW1lO1xuICAgICAgICAgICAgICAgICAgICBpZiAoZmlsZU5hbWUgJiYgc291bmRGaWxlTW9kaWZ5UmVzdC5zaG91bGRBdXRvRmlsbE5hbWUoKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kc291bmRGaWxlTmFtZS52YWwoZmlsZU5hbWUucmVwbGFjZSgvXFwuW14vLl0rJC8sICcnKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC5jaGVja1N0YXR1c0ZpbGVNZXJnaW5nKHBhcmFtcy5yZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHBhcmFtcywgZ2xvYmFsVHJhbnNsYXRlLnNmX1VwbG9hZEVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICd1cGxvYWRTdGFydCc6XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZmlsZUVycm9yJzpcbiAgICAgICAgICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHBhcmFtcy5tZXNzYWdlIHx8IHBhcmFtcywgZ2xvYmFsVHJhbnNsYXRlLnNmX1VwbG9hZEVycm9yKTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgLy8gT3RoZXIgZXZlbnRzIGRvbid0IG5lZWQgaGFuZGxpbmdcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgdGhlIHN0YXR1cyBvZiBmaWxlIG1lcmdpbmcuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIGZpbGUgbWVyZ2luZyBzdGF0dXMgZnVuY3Rpb24uXG4gICAgICovXG4gICAgY2hlY2tTdGF0dXNGaWxlTWVyZ2luZyhyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UgPT09IHVuZGVmaW5lZCB8fCBQYnhBcGkudHJ5UGFyc2VKU09OKHJlc3BvbnNlKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhgJHtnbG9iYWxUcmFuc2xhdGUuc2ZfVXBsb2FkRXJyb3J9YCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QganNvbiA9IEpTT04ucGFyc2UocmVzcG9uc2UpO1xuICAgICAgICBpZiAoanNvbiA9PT0gdW5kZWZpbmVkIHx8IGpzb24uZGF0YSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoYCR7Z2xvYmFsVHJhbnNsYXRlLnNmX1VwbG9hZEVycm9yfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdXBsb2FkSWQgPSBqc29uLmRhdGEudXBsb2FkX2lkO1xuICAgICAgICBjb25zdCBmaWxlUGF0aCA9IGpzb24uZGF0YS5maWxlbmFtZTtcblxuICAgICAgICAvLyBORVc6IFN1YnNjcmliZSB0byBFdmVudEJ1cyBpbnN0ZWFkIG9mIHVzaW5nIHBvbGxpbmcgd29ya2VyXG4gICAgICAgIEZpbGVVcGxvYWRFdmVudEhhbmRsZXIuc3Vic2NyaWJlKHVwbG9hZElkLCB7XG4gICAgICAgICAgICBvbk1lcmdlU3RhcnRlZDogKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBvbk1lcmdlUHJvZ3Jlc3M6IChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHByb2dyZXNzIGluZGljYXRvciBpZiBuZWVkZWRcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgU291bmQgZmlsZSBtZXJnZSBwcm9ncmVzczogJHtkYXRhLnByb2dyZXNzfSVgKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIG9uTWVyZ2VDb21wbGV0ZTogKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBLZWVwIGxvYWRpbmcgc3RhdGUgZHVyaW5nIGNvbnZlcnNpb25cbiAgICAgICAgICAgICAgICAvLyBQZXJmb3JtIGNvbnZlcnNpb24gYWZ0ZXIgbWVyZ2UgLSB1c2UgdGhlIGZpbGVQYXRoIGZyb20gdGhlIHJlc3BvbnNlXG4gICAgICAgICAgICAgICAgY29uc3QgY2F0ZWdvcnkgPSBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdjYXRlZ29yeScpO1xuICAgICAgICAgICAgICAgIFNvdW5kRmlsZXNBUEkuY29udmVydEF1ZGlvRmlsZSh7dGVtcF9maWxlbmFtZTogZmlsZVBhdGgsIGNhdGVnb3J5OiBjYXRlZ29yeX0sIHNvdW5kRmlsZU1vZGlmeVJlc3QuY2JBZnRlckNvbnZlcnRGaWxlKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIG9uRXJyb3I6IChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhkYXRhLmVycm9yIHx8IGdsb2JhbFRyYW5zbGF0ZS5zZl9VcGxvYWRFcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBhZnRlciB0aGUgZmlsZSBpcyBjb252ZXJ0ZWQgdG8gTVAzIGZvcm1hdC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZW5hbWUgLSBUaGUgZmlsZW5hbWUgb2YgdGhlIGNvbnZlcnRlZCBmaWxlLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJDb252ZXJ0RmlsZShyZXNwb25zZSkge1xuICAgICAgICBjb25zb2xlLmxvZygnW3NvdW5kLWZpbGUtbW9kaWZ5XSBjYkFmdGVyQ29udmVydEZpbGUgcmVzcG9uc2U6JywgcmVzcG9uc2UpO1xuXG4gICAgICAgIGxldCBmaWxlbmFtZSA9IG51bGw7XG5cbiAgICAgICAgLy8gSGFuZGxlIGRpZmZlcmVudCByZXNwb25zZSBmb3JtYXRzXG4gICAgICAgIGlmIChyZXNwb25zZSA9PT0gZmFsc2UgfHwgIXJlc3BvbnNlKSB7XG4gICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhgJHtnbG9iYWxUcmFuc2xhdGUuc2ZfQ29udmVydEVycm9yfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgZm9yIGNvbnZlcnNpb24gZXJyb3IgaW4gcmVzcG9uc2VcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgICAgICAvLyBTaG93IGRldGFpbGVkIGVycm9yIG1lc3NhZ2UgaWYgYXZhaWxhYmxlXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UubWVzc2FnZXMgJiYgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3IgJiYgcmVzcG9uc2UubWVzc2FnZXMuZXJyb3IubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IHJlc3BvbnNlLm1lc3NhZ2VzLmVycm9yLmpvaW4oJzxicj4nKTtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoZXJyb3JNZXNzYWdlLCBnbG9iYWxUcmFuc2xhdGUuc2ZfQ29udmVydEVycm9yKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS5zZl9Db252ZXJ0RXJyb3JEZXRhaWxzLCBnbG9iYWxUcmFuc2xhdGUuc2ZfQ29udmVydEVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEV4dHJhY3QgZmlsZW5hbWUgZnJvbSByZXNwb25zZVxuICAgICAgICBpZiAodHlwZW9mIHJlc3BvbnNlID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgZmlsZW5hbWUgPSByZXNwb25zZTtcbiAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5yZXN1bHQgPT09IHRydWUgJiYgcmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgLy8gQVBJIHJldHVybnMgZGF0YSBhcyBhcnJheSBbXCIvcGF0aC90by9maWxlXCJdXG4gICAgICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShyZXNwb25zZS5kYXRhKSAmJiByZXNwb25zZS5kYXRhLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICBmaWxlbmFtZSA9IHJlc3BvbnNlLmRhdGFbMF07XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiByZXNwb25zZS5kYXRhID09PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIGZpbGVuYW1lID0gcmVzcG9uc2UuZGF0YTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnNvbGUubG9nKCdbc291bmQtZmlsZS1tb2RpZnldIGV4dHJhY3RlZCBmaWxlbmFtZTonLCBmaWxlbmFtZSk7XG5cbiAgICAgICAgaWYgKGZpbGVuYW1lKSB7XG4gICAgICAgICAgICAvLyBBZGQgb2xkIGZpbGUgdG8gdHJhc2ggYmluIGZvciBkZWxldGlvbiBhZnRlciBzYXZlXG4gICAgICAgICAgICBjb25zdCBvbGRQYXRoID0gc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAncGF0aCcpO1xuICAgICAgICAgICAgaWYgKG9sZFBhdGgpIHtcbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LnRyYXNoQmluLnB1c2gob2xkUGF0aCk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmb3JtIHdpdGggbmV3IGZpbGUgcGF0aFxuICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdzZXQgdmFsdWUnLCAncGF0aCcsIGZpbGVuYW1lKTtcbiAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJHNvdW5kRmlsZU5hbWUudHJpZ2dlcignY2hhbmdlJyk7XG5cbiAgICAgICAgICAgIC8vIFVwZGF0ZSBwbGF5ZXIgd2l0aCBuZXcgZmlsZSB1c2luZyBzb3VuZC1maWxlcyBlbmRwb2ludFxuICAgICAgICAgICAgc25kUGxheWVyLlVwZGF0ZVNvdXJjZShgL3BieGNvcmUvYXBpL3YzL3NvdW5kLWZpbGVzOnBsYXliYWNrP3ZpZXc9JHtmaWxlbmFtZX1gKTtcblxuICAgICAgICAgICAgLy8gUmVtb3ZlIGxvYWRpbmcgc3RhdGVzXG4gICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRzdWJtaXRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGdsb2JhbFRyYW5zbGF0ZS5zZl9Db252ZXJ0RXJyb3JEZXRhaWxzLCBnbG9iYWxUcmFuc2xhdGUuc2ZfQ29udmVydEVycm9yKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm0uXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybS5cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAvLyBEZWxldGUgb2xkIGZpbGVzIGZyb20gdHJhc2ggYmluXG4gICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LnRyYXNoQmluLmZvckVhY2goKGZpbGVwYXRoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGZpbGVwYXRoKSBGaWxlc0FQSS5yZW1vdmVBdWRpb0ZpbGUoZmlsZXBhdGgsICgpID0+IHt9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC50cmFzaEJpbiA9IFtdO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgZm9ybSB3aXRoIG5ldyBkYXRhIGlmIHByb3ZpZGVkXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIC8vIElmIHRoaXMgd2FzIGEgbmV3IHNvdW5kIGZpbGUgdGhhdCB3YXMgc2F2ZWQsIHVwZGF0ZSBzdGF0ZVxuICAgICAgICAgICAgICAgIGlmIChzb3VuZEZpbGVNb2RpZnlSZXN0LmlzTmV3U291bmRGaWxlICYmIHJlc3BvbnNlLmRhdGEuaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBmb3JtIElEIGZpZWxkXG4gICAgICAgICAgICAgICAgICAgICQoJyNpZCcpLnZhbChyZXNwb25zZS5kYXRhLmlkKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgaXNOZXdTb3VuZEZpbGUgZmxhZ1xuICAgICAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LmlzTmV3U291bmRGaWxlID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlIF9pc05ldyBmbGFnIGZyb20gZm9ybVxuICAgICAgICAgICAgICAgICAgICAkKCcjX2lzTmV3JykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEZvcm0uanMgd2lsbCBoYW5kbGUgYWxsIHJlZGlyZWN0IGxvZ2ljIGJhc2VkIG9uIHN1Ym1pdE1vZGVcblxuICAgICAgICAgICAgLy8gVHJpZ2dlciBjb25maWcgY2hhbmdlZCBldmVudCB0byByZWZyZXNoIGxpc3RzXG4gICAgICAgICAgICBjb25zdCBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuICAgICAgICAgICAgZXZlbnQuaW5pdEV2ZW50KCdDb25maWdEYXRhQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcbiAgICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIGNvbnN0IGNhdGVnb3J5ID0gc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnY2F0ZWdvcnknKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyZSBGb3JtLmpzXG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBzb3VuZEZpbGVNb2RpZnlSZXN0LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IHNvdW5kRmlsZU1vZGlmeVJlc3QuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBzb3VuZEZpbGVNb2RpZnlSZXN0LmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyZSBSRVNUIEFQSSBpbnRlZ3JhdGlvblxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzID0ge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGFwaU9iamVjdDogU291bmRGaWxlc0FQSSxcbiAgICAgICAgICAgIHNhdmVNZXRob2Q6ICdzYXZlUmVjb3JkJ1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIHJlZGlyZWN0IFVSTHNcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9c291bmQtZmlsZXMvbW9kaWZ5L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9c291bmQtZmlsZXMvaW5kZXgvIy8ke2NhdGVnb3J5fWA7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxufTtcblxuLy8gTm90ZTogbWVyZ2luZ0NoZWNrV29ya2VyLmNiQWZ0ZXJNZXJnaW5nIGlzIG5vdyBoYW5kbGVkIHZpYSBFdmVudEJ1cyBpbiBjaGVja1N0YXR1c0ZpbGVNZXJnaW5nIG1ldGhvZFxuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgc291bmQgZmlsZSBtb2RpZnkgZm9ybVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZSgpO1xufSk7Il19
