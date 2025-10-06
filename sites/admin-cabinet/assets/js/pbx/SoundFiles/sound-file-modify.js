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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGUtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbInNvdW5kRmlsZU1vZGlmeVJlc3QiLCJ0cmFzaEJpbiIsIiRzb3VuZFVwbG9hZEJ1dHRvbiIsIiQiLCIkc291bmRGaWxlTmFtZSIsIiRhdWRpb1BsYXllciIsIiRzdWJtaXRCdXR0b24iLCJibG9iIiwid2luZG93IiwiVVJMIiwid2Via2l0VVJMIiwiJGZvcm1PYmoiLCIkZHJvcERvd25zIiwiaXNOZXdTb3VuZEZpbGUiLCJ2YWxpZGF0ZVJ1bGVzIiwibmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJzZl9WYWxpZGF0aW9uRmlsZU5hbWVJc0VtcHR5IiwicGF0aCIsInNmX1ZhbGlkYXRpb25GaWxlTm90U2VsZWN0ZWQiLCJpbml0aWFsaXplIiwiZHJvcGRvd24iLCJsb2FkRm9ybURhdGEiLCJpbml0aWFsaXplRm9ybSIsIkZpbGVzQVBJIiwiYXR0YWNoVG9CdG4iLCJhY3Rpb24iLCJwYXJhbXMiLCJjb25zb2xlIiwibG9nIiwiZmlsZSIsImZpbGVOYW1lIiwidmFsIiwicmVwbGFjZSIsImZpbGVVUkwiLCJjcmVhdGVPYmplY3RVUkwiLCJzbmRQbGF5ZXIiLCJVcGRhdGVTb3VyY2UiLCJjYlVwbG9hZFJlc3VtYWJsZSIsImFkZEV2ZW50TGlzdGVuZXIiLCJjYk9uRGF0YUNoYW5nZWQiLCJyZWNvcmRJZCIsImdldFJlY29yZElkIiwiY2F0ZWdvcnkiLCJnZXRDYXRlZ29yeSIsImFkZENsYXNzIiwiU291bmRGaWxlc0FQSSIsImdldFJlY29yZCIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJyZXN1bHQiLCJkYXRhIiwiaWQiLCJfaXNOZXciLCJwb3B1bGF0ZUZvcm0iLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIm1lc3NhZ2VzIiwiZXJyb3IiLCJzZXRUaW1lb3V0IiwibG9jYXRpb24iLCJocmVmIiwiZ2xvYmFsUm9vdFVybCIsInJlY29yZElkVmFsdWUiLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJzZWFyY2giLCJjYXRlZ29yeVBhcmFtIiwiZ2V0IiwidW5kZWZpbmVkIiwibGVuZ3RoIiwiYXR0ciIsInZhbHVlIiwiYXBwZW5kVG8iLCJGb3JtIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJhZnRlclBvcHVsYXRlIiwiZm9ybURhdGEiLCJhdWRpb1VybCIsIiRiYWNrQnV0dG9uIiwiZW5hYmxlRGlycml0eSIsInNhdmVJbml0aWFsVmFsdWVzIiwiUGJ4QXBpIiwidHJ5UGFyc2VKU09OIiwiZmlsZW5hbWUiLCJjaGVja1N0YXR1c0ZpbGVNZXJnaW5nIiwic2hvd011bHRpU3RyaW5nIiwic2ZfVXBsb2FkRXJyb3IiLCJqc29uIiwiSlNPTiIsInBhcnNlIiwidXBsb2FkSWQiLCJ1cGxvYWRfaWQiLCJmaWxlUGF0aCIsIkZpbGVVcGxvYWRFdmVudEhhbmRsZXIiLCJzdWJzY3JpYmUiLCJvbk1lcmdlU3RhcnRlZCIsIm9uTWVyZ2VQcm9ncmVzcyIsInByb2dyZXNzIiwib25NZXJnZUNvbXBsZXRlIiwiZm9ybSIsImNvbnZlcnRBdWRpb0ZpbGUiLCJ0ZW1wX2ZpbGVuYW1lIiwiY2JBZnRlckNvbnZlcnRGaWxlIiwib25FcnJvciIsIkFycmF5IiwiaXNBcnJheSIsIm9sZFBhdGgiLCJwdXNoIiwidHJpZ2dlciIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsImNiQWZ0ZXJTZW5kRm9ybSIsImZvckVhY2giLCJmaWxlcGF0aCIsInJlbW92ZUF1ZGlvRmlsZSIsInJlbW92ZSIsImV2ZW50IiwiZG9jdW1lbnQiLCJjcmVhdGVFdmVudCIsImluaXRFdmVudCIsImRpc3BhdGNoRXZlbnQiLCJ1cmwiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwicmVhZHkiXSwibWFw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QmxILG1CQUFtQixDQUFDa0gsZ0JBQTVDO0FBQ0FwQyxJQUFBQSxJQUFJLENBQUNzQyxlQUFMLEdBQXVCcEgsbUJBQW1CLENBQUNvSCxlQUEzQyxDQVJhLENBVWI7O0FBQ0F0QyxJQUFBQSxJQUFJLENBQUNpRCxXQUFMLEdBQW1CO0FBQ2ZDLE1BQUFBLE9BQU8sRUFBRSxJQURNO0FBRWZDLE1BQUFBLFNBQVMsRUFBRS9FLGFBRkk7QUFHZmdGLE1BQUFBLFVBQVUsRUFBRTtBQUhHLEtBQW5CLENBWGEsQ0FpQmI7O0FBQ0FwRCxJQUFBQSxJQUFJLENBQUNxRCxvQkFBTCxhQUErQmpFLGFBQS9CO0FBQ0FZLElBQUFBLElBQUksQ0FBQ3NELG1CQUFMLGFBQThCbEUsYUFBOUIsaUNBQWtFbkIsUUFBbEU7QUFFQStCLElBQUFBLElBQUksQ0FBQ3RELFVBQUw7QUFDSDtBQXZkdUIsQ0FBNUIsQyxDQTBkQTtBQUVBOztBQUNBckIsQ0FBQyxDQUFDdUgsUUFBRCxDQUFELENBQVlXLEtBQVosQ0FBa0IsWUFBTTtBQUNwQnJJLEVBQUFBLG1CQUFtQixDQUFDd0IsVUFBcEI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIGdsb2JhbFRyYW5zbGF0ZSwgRm9ybSwgUGJ4QXBpLCBzbmRQbGF5ZXIsIFNvdW5kRmlsZXNBUEksIFVzZXJNZXNzYWdlLCBDb25maWcsIEZpbGVVcGxvYWRFdmVudEhhbmRsZXIsIEZpbGVzQVBJLCBTeXN0ZW1BUEkgKi9cblxuLyoqXG4gKiBTb3VuZCBmaWxlIG1vZGlmaWNhdGlvbiBtb2R1bGUgd2l0aCBSRVNUIEFQSSBpbnRlZ3JhdGlvblxuICogVGhpcyBtb2R1bGUgcmVwbGFjZXMgc291bmQtZmlsZS1tb2RpZnkuanMgd2l0aCBSRVNUIEFQSSBjYWxscyB3aGlsZSBwcmVzZXJ2aW5nXG4gKiBhbGwgZXhpc3RpbmcgZnVuY3Rpb25hbGl0eSBpbmNsdWRpbmcgZmlsZSB1cGxvYWQsIGF1ZGlvIHJlY29yZGluZywgYW5kIHBsYXllclxuICpcbiAqIEBtb2R1bGUgc291bmRGaWxlTW9kaWZ5UmVzdFxuICovXG5jb25zdCBzb3VuZEZpbGVNb2RpZnlSZXN0ID0ge1xuICAgIC8qKlxuICAgICAqIEFycmF5IHRvIHN0b3JlIHBhdGhzIG9mIGZpbGVzIHRvIGJlIGRlbGV0ZWQgYWZ0ZXIgc2F2ZVxuICAgICAqIEB0eXBlIHtBcnJheX1cbiAgICAgKi9cbiAgICB0cmFzaEJpbjogW10sXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgc291bmQgdXBsb2FkIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzb3VuZFVwbG9hZEJ1dHRvbjogJCgnI3VwbG9hZC1zb3VuZC1maWxlJyksXG5cblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBzb3VuZCBmaWxlIG5hbWUgaW5wdXQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc291bmRGaWxlTmFtZTogJCgnI25hbWUnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBhdWRpbyBwbGF5ZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkYXVkaW9QbGF5ZXI6ICQoJyNhdWRpby1wbGF5ZXInKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBzdWJtaXQgYnV0dG9uLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHN1Ym1pdEJ1dHRvbjogJCgnI3N1Ym1pdGJ1dHRvbicpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIEJsb2IgVVJMIG9iamVjdC5cbiAgICAgKiBAdHlwZSB7QmxvYn1cbiAgICAgKi9cbiAgICBibG9iOiB3aW5kb3cuVVJMIHx8IHdpbmRvdy53ZWJraXRVUkwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjc291bmQtZmlsZS1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybSBkcm9wZG93bnMuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZHJvcERvd25zOiAkKCcjc291bmQtZmlsZS1mb3JtIC5kcm9wZG93bicpLFxuXG4gICAgLyoqXG4gICAgICogVHJhY2sgaWYgdGhpcyBpcyBhIG5ldyBzb3VuZCBmaWxlIChub3QgZXhpc3RpbmcgaW4gZGF0YWJhc2UpXG4gICAgICogQHR5cGUge2Jvb2xlYW59XG4gICAgICovXG4gICAgaXNOZXdTb3VuZEZpbGU6IGZhbHNlLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIG5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICduYW1lJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5zZl9WYWxpZGF0aW9uRmlsZU5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBwYXRoOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAncGF0aCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuc2ZfVmFsaWRhdGlvbkZpbGVOb3RTZWxlY3RlZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIHNvdW5kIGZpbGUgbW9kaWZpY2F0aW9uIGZ1bmN0aW9uYWxpdHkuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93bnNcbiAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZHJvcERvd25zLmRyb3Bkb3duKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBMb2FkIGZvcm0gZGF0YSBmcm9tIFJFU1QgQVBJXG4gICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QubG9hZEZvcm1EYXRhKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGZvcm0gdmFsaWRhdGlvbiBhbmQgc3VibWlzc2lvblxuICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmaWxlIHVwbG9hZCB1c2luZyBGaWxlc0FQSS5hdHRhY2hUb0J0biBmb3IgdW5pZmllZCBiZWhhdmlvclxuICAgICAgICAvLyBQYXNzICdzb3VuZC1maWxlJyBhcyBpbnB1dE5hbWUgZm9yIHRlc3QgY29tcGF0aWJpbGl0eVxuICAgICAgICBGaWxlc0FQSS5hdHRhY2hUb0J0bigndXBsb2FkLXNvdW5kLWZpbGUnLCBbJ3dhdicsICdtcDMnLCAnb2dnJywgJ200YScsICdhYWMnXSwgKGFjdGlvbiwgcGFyYW1zKSA9PiB7XG4gICAgICAgICAgICBzd2l0Y2ggKGFjdGlvbikge1xuICAgICAgICAgICAgICAgIGNhc2UgJ2ZpbGVBZGRlZCc6XG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbc291bmQtZmlsZS1tb2RpZnldIGZpbGVBZGRlZCBwYXJhbXM6JywgcGFyYW1zKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBhcmFtcy5maWxlKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW3NvdW5kLWZpbGUtbW9kaWZ5XSBwYXJhbXMuZmlsZTonLCBwYXJhbXMuZmlsZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBHZXQgZmlsZW5hbWUgZnJvbSByZXN1bWFibGUuanMgZmlsZSBvYmplY3QgKGNhbiBiZSBmaWxlTmFtZSBvciBuYW1lKVxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmlsZU5hbWUgPSBwYXJhbXMuZmlsZS5maWxlTmFtZSB8fCBwYXJhbXMuZmlsZS5uYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tzb3VuZC1maWxlLW1vZGlmeV0gZXh0cmFjdGVkIGZpbGVOYW1lOicsIGZpbGVOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmaWxlTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBuYW1lIGZpZWxkIHdpdGggZmlsZW5hbWUgd2l0aG91dCBleHRlbnNpb25cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRzb3VuZEZpbGVOYW1lLnZhbChmaWxlTmFtZS5yZXBsYWNlKC9cXC5bXi8uXSskLywgJycpKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGJsb2IgVVJMIGZvciBwcmV2aWV3XG4gICAgICAgICAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LmJsb2IgPSB3aW5kb3cuVVJMIHx8IHdpbmRvdy53ZWJraXRVUkw7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWxlVVJMID0gc291bmRGaWxlTW9kaWZ5UmVzdC5ibG9iLmNyZWF0ZU9iamVjdFVSTChwYXJhbXMuZmlsZS5maWxlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHNuZFBsYXllci5VcGRhdGVTb3VyY2UoZmlsZVVSTCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSAnZmlsZVN1Y2Nlc3MnOlxuICAgICAgICAgICAgICAgIGNhc2UgJ2ZpbGVQcm9ncmVzcyc6XG4gICAgICAgICAgICAgICAgY2FzZSAndXBsb2FkU3RhcnQnOlxuICAgICAgICAgICAgICAgIGNhc2UgJ2Vycm9yJzpcbiAgICAgICAgICAgICAgICBjYXNlICdjb21wbGV0ZSc6XG4gICAgICAgICAgICAgICAgICAgIC8vIEZvcndhcmQgYWxsIG90aGVyIGV2ZW50cyB0byB0aGUgb3JpZ2luYWwgY2FsbGJhY2tcbiAgICAgICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC5jYlVwbG9hZFJlc3VtYWJsZShhY3Rpb24sIHBhcmFtcyk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCAnc291bmQtZmlsZScpO1xuICAgICAgICBcbiAgICAgICAgLy8gTGlzdGVuIGZvciBkYXRhIGNoYW5nZXMgdG8gY2xlYXIgY2FjaGVcbiAgICAgICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ0NvbmZpZ0RhdGFDaGFuZ2VkJywgc291bmRGaWxlTW9kaWZ5UmVzdC5jYk9uRGF0YUNoYW5nZWQpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBMb2FkIGZvcm0gZGF0YSBmcm9tIFJFU1QgQVBJXG4gICAgICovXG4gICAgbG9hZEZvcm1EYXRhKCkge1xuICAgICAgICBjb25zdCByZWNvcmRJZCA9IHNvdW5kRmlsZU1vZGlmeVJlc3QuZ2V0UmVjb3JkSWQoKTtcbiAgICAgICAgY29uc3QgY2F0ZWdvcnkgPSBzb3VuZEZpbGVNb2RpZnlSZXN0LmdldENhdGVnb3J5KCk7XG5cbiAgICAgICAgLy8gRGV0ZXJtaW5lIGlmIHRoaXMgaXMgYSBuZXcgc291bmQgZmlsZVxuICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LmlzTmV3U291bmRGaWxlID0gIXJlY29yZElkIHx8IHJlY29yZElkID09PSAnJyB8fCByZWNvcmRJZCA9PT0gJ25ldyc7XG5cbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAvLyBQYXNzIGNhdGVnb3J5IGZvciBuZXcgcmVjb3Jkc1xuICAgICAgICBjb25zdCBwYXJhbXMgPSBjYXRlZ29yeSA/IHsgY2F0ZWdvcnk6IGNhdGVnb3J5IH0gOiB7fTtcblxuICAgICAgICBTb3VuZEZpbGVzQVBJLmdldFJlY29yZChyZWNvcmRJZCwgKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG5cbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5yZXN1bHQpIHtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgaXNOZXdTb3VuZEZpbGUgYmFzZWQgb24gYWN0dWFsIGRhdGEgZnJvbSBzZXJ2ZXJcbiAgICAgICAgICAgICAgICAvLyBOZXcgc291bmQgZmlsZXMgd29uJ3QgaGF2ZSBhbiBpZCBpbiB0aGUgcmVzcG9uc2UgZGF0YVxuICAgICAgICAgICAgICAgIGlmICghcmVzcG9uc2UuZGF0YS5pZCB8fCByZXNwb25zZS5kYXRhLmlkID09PSAnJykge1xuICAgICAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LmlzTmV3U291bmRGaWxlID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LmlzTmV3U291bmRGaWxlID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgLy8gU2V0IHRoZSBfaXNOZXcgZmxhZyBmb3IgbmV3IHNvdW5kIGZpbGVzXG4gICAgICAgICAgICAgICAgaWYgKHNvdW5kRmlsZU1vZGlmeVJlc3QuaXNOZXdTb3VuZEZpbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzcG9uc2UuZGF0YS5faXNOZXcgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChyZWNvcmRJZCAmJiByZWNvcmRJZCAhPT0gJ25ldycpIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGVycm9yIGlmIHRyeWluZyB0byBsb2FkIG5vbi1leGlzdGVudCByZWNvcmRcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IocmVzcG9uc2UubWVzc2FnZXM/LmVycm9yIHx8ICdGYWlsZWQgdG8gbG9hZCBzb3VuZCBmaWxlIGRhdGEnKTtcbiAgICAgICAgICAgICAgICAvLyBSZWRpcmVjdCB0byBpbmRleCBhZnRlciBkZWxheVxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IGAke2dsb2JhbFJvb3RVcmx9c291bmQtZmlsZXMvaW5kZXhgO1xuICAgICAgICAgICAgICAgIH0sIDMwMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9LCBwYXJhbXMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgcmVjb3JkIElEIGZyb20gaGlkZGVuIGlucHV0IGZpZWxkXG4gICAgICogQHJldHVybnMge3N0cmluZ30gUmVjb3JkIElEIG9yIGVtcHR5IHN0cmluZyBmb3IgbmV3IHJlY29yZHNcbiAgICAgKi9cbiAgICBnZXRSZWNvcmRJZCgpIHtcbiAgICAgICAgLy8gR2V0IHJlY29yZCBJRCBmcm9tIGhpZGRlbiBpbnB1dCBzZXQgYnkgY29udHJvbGxlclxuICAgICAgICBjb25zdCByZWNvcmRJZFZhbHVlID0gJCgnI2lkJykudmFsKCk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgaXQncyBhIGNhdGVnb3J5IG5hbWUgKGN1c3RvbS9tb2gpIG9yIGFjdHVhbCBJRFxuICAgICAgICBpZiAocmVjb3JkSWRWYWx1ZSA9PT0gJ2N1c3RvbScgfHwgcmVjb3JkSWRWYWx1ZSA9PT0gJ21vaCcpIHtcbiAgICAgICAgICAgIC8vIFRoaXMgaXMgYSBuZXcgcmVjb3JkIHdpdGggY2F0ZWdvcnkgcHJlc2V0XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVjb3JkSWRWYWx1ZSB8fCAnJztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGNhdGVnb3J5IGZyb20gaGlkZGVuIGlucHV0IGZpZWxkIG9yIFVSTFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd8bnVsbH0gQ2F0ZWdvcnkgKGN1c3RvbS9tb2gpIG9yIG51bGxcbiAgICAgKi9cbiAgICBnZXRDYXRlZ29yeSgpIHtcbiAgICAgICAgLy8gRmlyc3QgY2hlY2sgaWYgSUQgZmllbGQgY29udGFpbnMgY2F0ZWdvcnlcbiAgICAgICAgY29uc3QgcmVjb3JkSWRWYWx1ZSA9ICQoJyNpZCcpLnZhbCgpO1xuICAgICAgICBpZiAocmVjb3JkSWRWYWx1ZSA9PT0gJ2N1c3RvbScgfHwgcmVjb3JkSWRWYWx1ZSA9PT0gJ21vaCcpIHtcbiAgICAgICAgICAgIHJldHVybiByZWNvcmRJZFZhbHVlO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ2hlY2sgVVJMIHBhcmFtZXRlcnMgZm9yIGNhdGVnb3J5XG4gICAgICAgIGNvbnN0IHVybFBhcmFtcyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCk7XG4gICAgICAgIGNvbnN0IGNhdGVnb3J5UGFyYW0gPSB1cmxQYXJhbXMuZ2V0KCdjYXRlZ29yeScpO1xuICAgICAgICBpZiAoY2F0ZWdvcnlQYXJhbSA9PT0gJ2N1c3RvbScgfHwgY2F0ZWdvcnlQYXJhbSA9PT0gJ21vaCcpIHtcbiAgICAgICAgICAgIHJldHVybiBjYXRlZ29yeVBhcmFtO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBTb3VuZCBmaWxlIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBTYXZlIHRoZSBfaXNOZXcgZmxhZyBpbiBhIGhpZGRlbiBmaWVsZCBpZiBwcmVzZW50XG4gICAgICAgIGlmIChkYXRhLl9pc05ldyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBpZiAoJCgnI19pc05ldycpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgIC8vIENyZWF0ZSBoaWRkZW4gZmllbGQgaWYgaXQgZG9lc24ndCBleGlzdFxuICAgICAgICAgICAgICAgICQoJzxpbnB1dD4nKS5hdHRyKHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2hpZGRlbicsXG4gICAgICAgICAgICAgICAgICAgIGlkOiAnX2lzTmV3JyxcbiAgICAgICAgICAgICAgICAgICAgbmFtZTogJ19pc05ldycsXG4gICAgICAgICAgICAgICAgICAgIHZhbHVlOiBkYXRhLl9pc05ldyA/ICd0cnVlJyA6ICdmYWxzZSdcbiAgICAgICAgICAgICAgICB9KS5hcHBlbmRUbyhzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJCgnI19pc05ldycpLnZhbChkYXRhLl9pc05ldyA/ICd0cnVlJyA6ICdmYWxzZScpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gVXNlIHVuaWZpZWQgc2lsZW50IHBvcHVsYXRpb24gYXBwcm9hY2hcbiAgICAgICAgRm9ybS5wb3B1bGF0ZUZvcm1TaWxlbnRseShkYXRhLCB7XG4gICAgICAgICAgICBhZnRlclBvcHVsYXRlOiAoZm9ybURhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgYXVkaW8gcGxheWVyIGlmIHBhdGggZXhpc3RzXG4gICAgICAgICAgICAgICAgaWYgKGZvcm1EYXRhLnBhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVXNlIG5ldyBzb3VuZC1maWxlcyBlbmRwb2ludCBmb3IgTU9IL0lWUi9zeXN0ZW0gc291bmRzXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGF1ZGlvVXJsID0gYC9wYnhjb3JlL2FwaS92My9zb3VuZC1maWxlczpwbGF5YmFjaz92aWV3PSR7Zm9ybURhdGEucGF0aH1gO1xuICAgICAgICAgICAgICAgICAgICBzbmRQbGF5ZXIuVXBkYXRlU291cmNlKGF1ZGlvVXJsKTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgYmFjay10by1saXN0IGJ1dHRvbiBVUkwgd2l0aCBjdXJyZW50IGNhdGVnb3J5XG4gICAgICAgICAgICAgICAgaWYgKGZvcm1EYXRhLmNhdGVnb3J5KSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRiYWNrQnV0dG9uID0gJCgnI2JhY2stdG8tbGlzdC1idXR0b24nKTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCRiYWNrQnV0dG9uLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICRiYWNrQnV0dG9uLmF0dHIoJ2hyZWYnLCBgJHtnbG9iYWxSb290VXJsfXNvdW5kLWZpbGVzL2luZGV4IyR7Zm9ybURhdGEuY2F0ZWdvcnl9YCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBTYXZlIGluaXRpYWwgdmFsdWVzIGZvciBkaXJyaXR5IGNoZWNraW5nXG4gICAgICAgICAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLnNhdmVJbml0aWFsVmFsdWVzKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xlYXJzIGNhY2hlcyBpZiBkYXRhIGNoYW5nZXMuXG4gICAgICovXG4gICAgY2JPbkRhdGFDaGFuZ2VkKCkge1xuICAgICAgICAvLyBDbGVhciBSRVNUIEFQSSBjYWNoZSBpZiBuZWVkZWQgLSBoYW5kbGVkIGJ5IEFQSSBsYXllclxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBmb3IgZmlsZSB1cGxvYWQgd2l0aCBjaHVua3MgYW5kIG1lcmdlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhY3Rpb24gLSBUaGUgYWN0aW9uIHBlcmZvcm1lZCBkdXJpbmcgdGhlIHVwbG9hZC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gQWRkaXRpb25hbCBwYXJhbWV0ZXJzIHJlbGF0ZWQgdG8gdGhlIHVwbG9hZC5cbiAgICAgKi9cbiAgICBjYlVwbG9hZFJlc3VtYWJsZShhY3Rpb24sIHBhcmFtcykge1xuICAgICAgICBzd2l0Y2ggKGFjdGlvbikge1xuICAgICAgICAgICAgY2FzZSAnZmlsZVN1Y2Nlc3MnOlxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gUGJ4QXBpLnRyeVBhcnNlSlNPTihwYXJhbXMucmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAhPT0gZmFsc2UgJiYgcmVzcG9uc2UuZGF0YS5maWxlbmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIEdldCBmaWxlbmFtZSBmcm9tIHJlc3VtYWJsZS5qcyBmaWxlIG9iamVjdCBhbmQgcmVtb3ZlIGV4dGVuc2lvblxuICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWxlTmFtZSA9IHBhcmFtcy5maWxlLmZpbGVOYW1lIHx8IHBhcmFtcy5maWxlLm5hbWU7XG4gICAgICAgICAgICAgICAgICAgIGlmIChmaWxlTmFtZSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kc291bmRGaWxlTmFtZS52YWwoZmlsZU5hbWUucmVwbGFjZSgvXFwuW14vLl0rJC8sICcnKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC5jaGVja1N0YXR1c0ZpbGVNZXJnaW5nKHBhcmFtcy5yZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHBhcmFtcywgZ2xvYmFsVHJhbnNsYXRlLnNmX1VwbG9hZEVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICd1cGxvYWRTdGFydCc6XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZXJyb3InOlxuICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocGFyYW1zLCBnbG9iYWxUcmFuc2xhdGUuc2ZfVXBsb2FkRXJyb3IpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgdGhlIHN0YXR1cyBvZiBmaWxlIG1lcmdpbmcuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIGZpbGUgbWVyZ2luZyBzdGF0dXMgZnVuY3Rpb24uXG4gICAgICovXG4gICAgY2hlY2tTdGF0dXNGaWxlTWVyZ2luZyhyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UgPT09IHVuZGVmaW5lZCB8fCBQYnhBcGkudHJ5UGFyc2VKU09OKHJlc3BvbnNlKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhgJHtnbG9iYWxUcmFuc2xhdGUuc2ZfVXBsb2FkRXJyb3J9YCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QganNvbiA9IEpTT04ucGFyc2UocmVzcG9uc2UpO1xuICAgICAgICBpZiAoanNvbiA9PT0gdW5kZWZpbmVkIHx8IGpzb24uZGF0YSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoYCR7Z2xvYmFsVHJhbnNsYXRlLnNmX1VwbG9hZEVycm9yfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgdXBsb2FkSWQgPSBqc29uLmRhdGEudXBsb2FkX2lkO1xuICAgICAgICBjb25zdCBmaWxlUGF0aCA9IGpzb24uZGF0YS5maWxlbmFtZTtcblxuICAgICAgICAvLyBORVc6IFN1YnNjcmliZSB0byBFdmVudEJ1cyBpbnN0ZWFkIG9mIHVzaW5nIHBvbGxpbmcgd29ya2VyXG4gICAgICAgIEZpbGVVcGxvYWRFdmVudEhhbmRsZXIuc3Vic2NyaWJlKHVwbG9hZElkLCB7XG4gICAgICAgICAgICBvbk1lcmdlU3RhcnRlZDogKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRzdWJtaXRCdXR0b24uYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICB9LFxuXG4gICAgICAgICAgICBvbk1lcmdlUHJvZ3Jlc3M6IChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIHByb2dyZXNzIGluZGljYXRvciBpZiBuZWVkZWRcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgU291bmQgZmlsZSBtZXJnZSBwcm9ncmVzczogJHtkYXRhLnByb2dyZXNzfSVgKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIG9uTWVyZ2VDb21wbGV0ZTogKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBLZWVwIGxvYWRpbmcgc3RhdGUgZHVyaW5nIGNvbnZlcnNpb25cbiAgICAgICAgICAgICAgICAvLyBQZXJmb3JtIGNvbnZlcnNpb24gYWZ0ZXIgbWVyZ2UgLSB1c2UgdGhlIGZpbGVQYXRoIGZyb20gdGhlIHJlc3BvbnNlXG4gICAgICAgICAgICAgICAgY29uc3QgY2F0ZWdvcnkgPSBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdjYXRlZ29yeScpO1xuICAgICAgICAgICAgICAgIFNvdW5kRmlsZXNBUEkuY29udmVydEF1ZGlvRmlsZSh7dGVtcF9maWxlbmFtZTogZmlsZVBhdGgsIGNhdGVnb3J5OiBjYXRlZ29yeX0sIHNvdW5kRmlsZU1vZGlmeVJlc3QuY2JBZnRlckNvbnZlcnRGaWxlKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIG9uRXJyb3I6IChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhkYXRhLmVycm9yIHx8IGdsb2JhbFRyYW5zbGF0ZS5zZl9VcGxvYWRFcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBhZnRlciB0aGUgZmlsZSBpcyBjb252ZXJ0ZWQgdG8gTVAzIGZvcm1hdC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZW5hbWUgLSBUaGUgZmlsZW5hbWUgb2YgdGhlIGNvbnZlcnRlZCBmaWxlLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJDb252ZXJ0RmlsZShyZXNwb25zZSkge1xuICAgICAgICBjb25zb2xlLmxvZygnW3NvdW5kLWZpbGUtbW9kaWZ5XSBjYkFmdGVyQ29udmVydEZpbGUgcmVzcG9uc2U6JywgcmVzcG9uc2UpO1xuXG4gICAgICAgIGxldCBmaWxlbmFtZSA9IG51bGw7XG5cbiAgICAgICAgLy8gSGFuZGxlIGRpZmZlcmVudCByZXNwb25zZSBmb3JtYXRzXG4gICAgICAgIGlmIChyZXNwb25zZSA9PT0gZmFsc2UgfHwgIXJlc3BvbnNlKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoYCR7Z2xvYmFsVHJhbnNsYXRlLnNmX1VwbG9hZEVycm9yfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRXh0cmFjdCBmaWxlbmFtZSBmcm9tIHJlc3BvbnNlXG4gICAgICAgIGlmICh0eXBlb2YgcmVzcG9uc2UgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBmaWxlbmFtZSA9IHJlc3BvbnNlO1xuICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAvLyBBUEkgcmV0dXJucyBkYXRhIGFzIGFycmF5IFtcIi9wYXRoL3RvL2ZpbGVcIl1cbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHJlc3BvbnNlLmRhdGEpICYmIHJlc3BvbnNlLmRhdGEubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGZpbGVuYW1lID0gcmVzcG9uc2UuZGF0YVswXTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHJlc3BvbnNlLmRhdGEgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgZmlsZW5hbWUgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc29sZS5sb2coJ1tzb3VuZC1maWxlLW1vZGlmeV0gZXh0cmFjdGVkIGZpbGVuYW1lOicsIGZpbGVuYW1lKTtcblxuICAgICAgICBpZiAoZmlsZW5hbWUpIHtcbiAgICAgICAgICAgIC8vIEFkZCBvbGQgZmlsZSB0byB0cmFzaCBiaW4gZm9yIGRlbGV0aW9uIGFmdGVyIHNhdmVcbiAgICAgICAgICAgIGNvbnN0IG9sZFBhdGggPSBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdwYXRoJyk7XG4gICAgICAgICAgICBpZiAob2xkUGF0aCkge1xuICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QudHJhc2hCaW4ucHVzaChvbGRQYXRoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVXBkYXRlIGZvcm0gd2l0aCBuZXcgZmlsZSBwYXRoXG4gICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdwYXRoJywgZmlsZW5hbWUpO1xuICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kc291bmRGaWxlTmFtZS50cmlnZ2VyKCdjaGFuZ2UnKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIHBsYXllciB3aXRoIG5ldyBmaWxlIHVzaW5nIHNvdW5kLWZpbGVzIGVuZHBvaW50XG4gICAgICAgICAgICBzbmRQbGF5ZXIuVXBkYXRlU291cmNlKGAvcGJ4Y29yZS9hcGkvdjMvc291bmQtZmlsZXM6cGxheWJhY2s/dmlldz0ke2ZpbGVuYW1lfWApO1xuXG4gICAgICAgICAgICAvLyBSZW1vdmUgbG9hZGluZyBzdGF0ZXNcbiAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGAke2dsb2JhbFRyYW5zbGF0ZS5zZl9VcGxvYWRFcnJvcn1gKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm0uXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybS5cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAvLyBEZWxldGUgb2xkIGZpbGVzIGZyb20gdHJhc2ggYmluXG4gICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LnRyYXNoQmluLmZvckVhY2goKGZpbGVwYXRoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGZpbGVwYXRoKSBGaWxlc0FQSS5yZW1vdmVBdWRpb0ZpbGUoZmlsZXBhdGgsICgpID0+IHt9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC50cmFzaEJpbiA9IFtdO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgZm9ybSB3aXRoIG5ldyBkYXRhIGlmIHByb3ZpZGVkXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIC8vIElmIHRoaXMgd2FzIGEgbmV3IHNvdW5kIGZpbGUgdGhhdCB3YXMgc2F2ZWQsIHVwZGF0ZSBzdGF0ZVxuICAgICAgICAgICAgICAgIGlmIChzb3VuZEZpbGVNb2RpZnlSZXN0LmlzTmV3U291bmRGaWxlICYmIHJlc3BvbnNlLmRhdGEuaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBmb3JtIElEIGZpZWxkXG4gICAgICAgICAgICAgICAgICAgICQoJyNpZCcpLnZhbChyZXNwb25zZS5kYXRhLmlkKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgaXNOZXdTb3VuZEZpbGUgZmxhZ1xuICAgICAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LmlzTmV3U291bmRGaWxlID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlIF9pc05ldyBmbGFnIGZyb20gZm9ybVxuICAgICAgICAgICAgICAgICAgICAkKCcjX2lzTmV3JykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEZvcm0uanMgd2lsbCBoYW5kbGUgYWxsIHJlZGlyZWN0IGxvZ2ljIGJhc2VkIG9uIHN1Ym1pdE1vZGVcblxuICAgICAgICAgICAgLy8gVHJpZ2dlciBjb25maWcgY2hhbmdlZCBldmVudCB0byByZWZyZXNoIGxpc3RzXG4gICAgICAgICAgICBjb25zdCBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuICAgICAgICAgICAgZXZlbnQuaW5pdEV2ZW50KCdDb25maWdEYXRhQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcbiAgICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIGNvbnN0IGNhdGVnb3J5ID0gc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnY2F0ZWdvcnknKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyZSBGb3JtLmpzXG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBzb3VuZEZpbGVNb2RpZnlSZXN0LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IHNvdW5kRmlsZU1vZGlmeVJlc3QuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBzb3VuZEZpbGVNb2RpZnlSZXN0LmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyZSBSRVNUIEFQSSBpbnRlZ3JhdGlvblxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzID0ge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGFwaU9iamVjdDogU291bmRGaWxlc0FQSSxcbiAgICAgICAgICAgIHNhdmVNZXRob2Q6ICdzYXZlUmVjb3JkJ1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIHJlZGlyZWN0IFVSTHNcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9c291bmQtZmlsZXMvbW9kaWZ5L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9c291bmQtZmlsZXMvaW5kZXgvIy8ke2NhdGVnb3J5fWA7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxufTtcblxuLy8gTm90ZTogbWVyZ2luZ0NoZWNrV29ya2VyLmNiQWZ0ZXJNZXJnaW5nIGlzIG5vdyBoYW5kbGVkIHZpYSBFdmVudEJ1cyBpbiBjaGVja1N0YXR1c0ZpbGVNZXJnaW5nIG1ldGhvZFxuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgc291bmQgZmlsZSBtb2RpZnkgZm9ybVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZSgpO1xufSk7Il19