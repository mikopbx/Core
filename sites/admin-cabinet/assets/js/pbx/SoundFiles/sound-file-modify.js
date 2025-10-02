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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGUtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbInNvdW5kRmlsZU1vZGlmeVJlc3QiLCJ0cmFzaEJpbiIsIiRzb3VuZFVwbG9hZEJ1dHRvbiIsIiQiLCIkc291bmRGaWxlTmFtZSIsIiRhdWRpb1BsYXllciIsIiRzdWJtaXRCdXR0b24iLCJibG9iIiwid2luZG93IiwiVVJMIiwid2Via2l0VVJMIiwiJGZvcm1PYmoiLCIkZHJvcERvd25zIiwiaXNOZXdTb3VuZEZpbGUiLCJ2YWxpZGF0ZVJ1bGVzIiwibmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJzZl9WYWxpZGF0aW9uRmlsZU5hbWVJc0VtcHR5IiwicGF0aCIsInNmX1ZhbGlkYXRpb25GaWxlTm90U2VsZWN0ZWQiLCJpbml0aWFsaXplIiwiZHJvcGRvd24iLCJsb2FkRm9ybURhdGEiLCJpbml0aWFsaXplRm9ybSIsIkZpbGVzQVBJIiwiYXR0YWNoVG9CdG4iLCJhY3Rpb24iLCJwYXJhbXMiLCJjb25zb2xlIiwibG9nIiwiZmlsZSIsImZpbGVOYW1lIiwidmFsIiwicmVwbGFjZSIsImZpbGVVUkwiLCJjcmVhdGVPYmplY3RVUkwiLCJzbmRQbGF5ZXIiLCJVcGRhdGVTb3VyY2UiLCJjYlVwbG9hZFJlc3VtYWJsZSIsImFkZEV2ZW50TGlzdGVuZXIiLCJjYk9uRGF0YUNoYW5nZWQiLCJyZWNvcmRJZCIsImdldFJlY29yZElkIiwiY2F0ZWdvcnkiLCJnZXRDYXRlZ29yeSIsImFkZENsYXNzIiwiU291bmRGaWxlc0FQSSIsImdldFJlY29yZCIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJyZXN1bHQiLCJkYXRhIiwiaWQiLCJfaXNOZXciLCJwb3B1bGF0ZUZvcm0iLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIm1lc3NhZ2VzIiwiZXJyb3IiLCJzZXRUaW1lb3V0IiwibG9jYXRpb24iLCJocmVmIiwiZ2xvYmFsUm9vdFVybCIsInJlY29yZElkVmFsdWUiLCJ1cmxQYXJhbXMiLCJVUkxTZWFyY2hQYXJhbXMiLCJzZWFyY2giLCJjYXRlZ29yeVBhcmFtIiwiZ2V0IiwidW5kZWZpbmVkIiwibGVuZ3RoIiwiYXR0ciIsInZhbHVlIiwiYXBwZW5kVG8iLCJGb3JtIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJhZnRlclBvcHVsYXRlIiwiZm9ybURhdGEiLCJhdWRpb1VybCIsIiRiYWNrQnV0dG9uIiwiZW5hYmxlRGlycml0eSIsInNhdmVJbml0aWFsVmFsdWVzIiwiUGJ4QXBpIiwidHJ5UGFyc2VKU09OIiwiZmlsZW5hbWUiLCJjaGVja1N0YXR1c0ZpbGVNZXJnaW5nIiwic2hvd011bHRpU3RyaW5nIiwic2ZfVXBsb2FkRXJyb3IiLCJqc29uIiwiSlNPTiIsInBhcnNlIiwidXBsb2FkSWQiLCJ1cGxvYWRfaWQiLCJmaWxlUGF0aCIsIkZpbGVVcGxvYWRFdmVudEhhbmRsZXIiLCJzdWJzY3JpYmUiLCJvbk1lcmdlU3RhcnRlZCIsIm9uTWVyZ2VQcm9ncmVzcyIsInByb2dyZXNzIiwib25NZXJnZUNvbXBsZXRlIiwiZm9ybSIsImNvbnZlcnRBdWRpb0ZpbGUiLCJ0ZW1wX2ZpbGVuYW1lIiwiY2JBZnRlckNvbnZlcnRGaWxlIiwib25FcnJvciIsIkFycmF5IiwiaXNBcnJheSIsIm9sZFBhdGgiLCJwdXNoIiwidHJpZ2dlciIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsImNiQWZ0ZXJTZW5kRm9ybSIsImZvckVhY2giLCJmaWxlcGF0aCIsInJlbW92ZUF1ZGlvRmlsZSIsInJlbW92ZSIsImV2ZW50IiwiZG9jdW1lbnQiLCJjcmVhdGVFdmVudCIsImluaXRFdmVudCIsImRpc3BhdGNoRXZlbnQiLCJ1cmwiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwicmVhZHkiXSwibWFw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LEdBQUwsR0FBVyxHQUFYLENBTGEsQ0FLRzs7QUFDaEJoRCxJQUFBQSxJQUFJLENBQUNoRSxhQUFMLEdBQXFCZCxtQkFBbUIsQ0FBQ2MsYUFBekM7QUFDQWdFLElBQUFBLElBQUksQ0FBQ29DLGdCQUFMLEdBQXdCbEgsbUJBQW1CLENBQUNrSCxnQkFBNUM7QUFDQXBDLElBQUFBLElBQUksQ0FBQ3NDLGVBQUwsR0FBdUJwSCxtQkFBbUIsQ0FBQ29ILGVBQTNDLENBUmEsQ0FVYjs7QUFDQXRDLElBQUFBLElBQUksQ0FBQ2lELFdBQUwsR0FBbUI7QUFDZkMsTUFBQUEsT0FBTyxFQUFFLElBRE07QUFFZkMsTUFBQUEsU0FBUyxFQUFFL0UsYUFGSTtBQUdmZ0YsTUFBQUEsVUFBVSxFQUFFO0FBSEcsS0FBbkIsQ0FYYSxDQWlCYjs7QUFDQXBELElBQUFBLElBQUksQ0FBQ3FELG9CQUFMLGFBQStCakUsYUFBL0I7QUFDQVksSUFBQUEsSUFBSSxDQUFDc0QsbUJBQUwsYUFBOEJsRSxhQUE5QixpQ0FBa0VuQixRQUFsRTtBQUVBK0IsSUFBQUEsSUFBSSxDQUFDdEQsVUFBTDtBQUNIO0FBeGR1QixDQUE1QixDLENBMmRBO0FBRUE7O0FBQ0FyQixDQUFDLENBQUN1SCxRQUFELENBQUQsQ0FBWVcsS0FBWixDQUFrQixZQUFNO0FBQ3BCckksRUFBQUEsbUJBQW1CLENBQUN3QixVQUFwQjtBQUNILENBRkQiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBQYnhBcGksIHNuZFBsYXllciwgU291bmRGaWxlc0FQSSwgVXNlck1lc3NhZ2UsIENvbmZpZywgRmlsZVVwbG9hZEV2ZW50SGFuZGxlciwgRmlsZXNBUEksIFN5c3RlbUFQSSAqL1xuXG4vKipcbiAqIFNvdW5kIGZpbGUgbW9kaWZpY2F0aW9uIG1vZHVsZSB3aXRoIFJFU1QgQVBJIGludGVncmF0aW9uXG4gKiBUaGlzIG1vZHVsZSByZXBsYWNlcyBzb3VuZC1maWxlLW1vZGlmeS5qcyB3aXRoIFJFU1QgQVBJIGNhbGxzIHdoaWxlIHByZXNlcnZpbmdcbiAqIGFsbCBleGlzdGluZyBmdW5jdGlvbmFsaXR5IGluY2x1ZGluZyBmaWxlIHVwbG9hZCwgYXVkaW8gcmVjb3JkaW5nLCBhbmQgcGxheWVyXG4gKlxuICogQG1vZHVsZSBzb3VuZEZpbGVNb2RpZnlSZXN0XG4gKi9cbmNvbnN0IHNvdW5kRmlsZU1vZGlmeVJlc3QgPSB7XG4gICAgLyoqXG4gICAgICogQXJyYXkgdG8gc3RvcmUgcGF0aHMgb2YgZmlsZXMgdG8gYmUgZGVsZXRlZCBhZnRlciBzYXZlXG4gICAgICogQHR5cGUge0FycmF5fVxuICAgICAqL1xuICAgIHRyYXNoQmluOiBbXSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBzb3VuZCB1cGxvYWQgYnV0dG9uLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNvdW5kVXBsb2FkQnV0dG9uOiAkKCcjdXBsb2FkLXNvdW5kLWZpbGUnKSxcblxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHNvdW5kIGZpbGUgbmFtZSBpbnB1dC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzb3VuZEZpbGVOYW1lOiAkKCcjbmFtZScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGF1ZGlvIHBsYXllci5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRhdWRpb1BsYXllcjogJCgnI2F1ZGlvLXBsYXllcicpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHN1Ym1pdCBidXR0b24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc3VibWl0QnV0dG9uOiAkKCcjc3VibWl0YnV0dG9uJyksXG5cbiAgICAvKipcbiAgICAgKiBUaGUgQmxvYiBVUkwgb2JqZWN0LlxuICAgICAqIEB0eXBlIHtCbG9ifVxuICAgICAqL1xuICAgIGJsb2I6IHdpbmRvdy5VUkwgfHwgd2luZG93LndlYmtpdFVSTCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGZvcm1PYmo6ICQoJyNzb3VuZC1maWxlLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBmb3JtIGRyb3Bkb3ducy5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRkcm9wRG93bnM6ICQoJyNzb3VuZC1maWxlLWZvcm0gLmRyb3Bkb3duJyksXG5cbiAgICAvKipcbiAgICAgKiBUcmFjayBpZiB0aGlzIGlzIGEgbmV3IHNvdW5kIGZpbGUgKG5vdCBleGlzdGluZyBpbiBkYXRhYmFzZSlcbiAgICAgKiBAdHlwZSB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBpc05ld1NvdW5kRmlsZTogZmFsc2UsXG5cbiAgICAvKipcbiAgICAgKiBWYWxpZGF0aW9uIHJ1bGVzIGZvciB0aGUgZm9ybSBmaWVsZHMgYmVmb3JlIHN1Ym1pc3Npb24uXG4gICAgICpcbiAgICAgKiBAdHlwZSB7b2JqZWN0fVxuICAgICAqL1xuICAgIHZhbGlkYXRlUnVsZXM6IHtcbiAgICAgICAgbmFtZToge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ25hbWUnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnNmX1ZhbGlkYXRpb25GaWxlTmFtZUlzRW1wdHksXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICAgIHBhdGg6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICdwYXRoJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5zZl9WYWxpZGF0aW9uRmlsZU5vdFNlbGVjdGVkLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplcyB0aGUgc291bmQgZmlsZSBtb2RpZmljYXRpb24gZnVuY3Rpb25hbGl0eS5cbiAgICAgKi9cbiAgICBpbml0aWFsaXplKCkge1xuICAgICAgICAvLyBJbml0aWFsaXplIGRyb3Bkb3duc1xuICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRkcm9wRG93bnMuZHJvcGRvd24oKTtcbiAgICAgICAgXG4gICAgICAgIC8vIExvYWQgZm9ybSBkYXRhIGZyb20gUkVTVCBBUElcbiAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC5sb2FkRm9ybURhdGEoKTtcbiAgICAgICAgXG4gICAgICAgIC8vIEluaXRpYWxpemUgZm9ybSB2YWxpZGF0aW9uIGFuZCBzdWJtaXNzaW9uXG4gICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZUZvcm0oKTtcblxuICAgICAgICAvLyBJbml0aWFsaXplIGZpbGUgdXBsb2FkIHVzaW5nIEZpbGVzQVBJLmF0dGFjaFRvQnRuIGZvciB1bmlmaWVkIGJlaGF2aW9yXG4gICAgICAgIC8vIFBhc3MgJ3NvdW5kLWZpbGUnIGFzIGlucHV0TmFtZSBmb3IgdGVzdCBjb21wYXRpYmlsaXR5XG4gICAgICAgIEZpbGVzQVBJLmF0dGFjaFRvQnRuKCd1cGxvYWQtc291bmQtZmlsZScsIFsnd2F2JywgJ21wMycsICdvZ2cnLCAnbTRhJywgJ2FhYyddLCAoYWN0aW9uLCBwYXJhbXMpID0+IHtcbiAgICAgICAgICAgIHN3aXRjaCAoYWN0aW9uKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAnZmlsZUFkZGVkJzpcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1tzb3VuZC1maWxlLW1vZGlmeV0gZmlsZUFkZGVkIHBhcmFtczonLCBwYXJhbXMpO1xuICAgICAgICAgICAgICAgICAgICBpZiAocGFyYW1zLmZpbGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbc291bmQtZmlsZS1tb2RpZnldIHBhcmFtcy5maWxlOicsIHBhcmFtcy5maWxlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdldCBmaWxlbmFtZSBmcm9tIHJlc3VtYWJsZS5qcyBmaWxlIG9iamVjdCAoY2FuIGJlIGZpbGVOYW1lIG9yIG5hbWUpXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmaWxlTmFtZSA9IHBhcmFtcy5maWxlLmZpbGVOYW1lIHx8IHBhcmFtcy5maWxlLm5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnW3NvdW5kLWZpbGUtbW9kaWZ5XSBleHRyYWN0ZWQgZmlsZU5hbWU6JywgZmlsZU5hbWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZpbGVOYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIG5hbWUgZmllbGQgd2l0aCBmaWxlbmFtZSB3aXRob3V0IGV4dGVuc2lvblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJHNvdW5kRmlsZU5hbWUudmFsKGZpbGVOYW1lLnJlcGxhY2UoL1xcLlteLy5dKyQvLCAnJykpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBDcmVhdGUgYmxvYiBVUkwgZm9yIHByZXZpZXdcbiAgICAgICAgICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuYmxvYiA9IHdpbmRvdy5VUkwgfHwgd2luZG93LndlYmtpdFVSTDtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVVUkwgPSBzb3VuZEZpbGVNb2RpZnlSZXN0LmJsb2IuY3JlYXRlT2JqZWN0VVJMKHBhcmFtcy5maWxlLmZpbGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgc25kUGxheWVyLlVwZGF0ZVNvdXJjZShmaWxlVVJMKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICBjYXNlICdmaWxlU3VjY2Vzcyc6XG4gICAgICAgICAgICAgICAgY2FzZSAnZmlsZVByb2dyZXNzJzpcbiAgICAgICAgICAgICAgICBjYXNlICd1cGxvYWRTdGFydCc6XG4gICAgICAgICAgICAgICAgY2FzZSAnZXJyb3InOlxuICAgICAgICAgICAgICAgIGNhc2UgJ2NvbXBsZXRlJzpcbiAgICAgICAgICAgICAgICAgICAgLy8gRm9yd2FyZCBhbGwgb3RoZXIgZXZlbnRzIHRvIHRoZSBvcmlnaW5hbCBjYWxsYmFja1xuICAgICAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LmNiVXBsb2FkUmVzdW1hYmxlKGFjdGlvbiwgcGFyYW1zKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sICdzb3VuZC1maWxlJyk7XG4gICAgICAgIFxuICAgICAgICAvLyBMaXN0ZW4gZm9yIGRhdGEgY2hhbmdlcyB0byBjbGVhciBjYWNoZVxuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignQ29uZmlnRGF0YUNoYW5nZWQnLCBzb3VuZEZpbGVNb2RpZnlSZXN0LmNiT25EYXRhQ2hhbmdlZCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgZm9ybSBkYXRhIGZyb20gUkVTVCBBUElcbiAgICAgKi9cbiAgICBsb2FkRm9ybURhdGEoKSB7XG4gICAgICAgIGNvbnN0IHJlY29yZElkID0gc291bmRGaWxlTW9kaWZ5UmVzdC5nZXRSZWNvcmRJZCgpO1xuICAgICAgICBjb25zdCBjYXRlZ29yeSA9IHNvdW5kRmlsZU1vZGlmeVJlc3QuZ2V0Q2F0ZWdvcnkoKTtcblxuICAgICAgICAvLyBEZXRlcm1pbmUgaWYgdGhpcyBpcyBhIG5ldyBzb3VuZCBmaWxlXG4gICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuaXNOZXdTb3VuZEZpbGUgPSAhcmVjb3JkSWQgfHwgcmVjb3JkSWQgPT09ICcnIHx8IHJlY29yZElkID09PSAnbmV3JztcblxuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZycpO1xuXG4gICAgICAgIC8vIFBhc3MgY2F0ZWdvcnkgZm9yIG5ldyByZWNvcmRzXG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IGNhdGVnb3J5ID8geyBjYXRlZ29yeTogY2F0ZWdvcnkgfSA6IHt9O1xuXG4gICAgICAgIFNvdW5kRmlsZXNBUEkuZ2V0UmVjb3JkKHJlY29yZElkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcblxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBpc05ld1NvdW5kRmlsZSBiYXNlZCBvbiBhY3R1YWwgZGF0YSBmcm9tIHNlcnZlclxuICAgICAgICAgICAgICAgIC8vIE5ldyBzb3VuZCBmaWxlcyB3b24ndCBoYXZlIGFuIGlkIGluIHRoZSByZXNwb25zZSBkYXRhXG4gICAgICAgICAgICAgICAgaWYgKCFyZXNwb25zZS5kYXRhLmlkIHx8IHJlc3BvbnNlLmRhdGEuaWQgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuaXNOZXdTb3VuZEZpbGUgPSB0cnVlO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuaXNOZXdTb3VuZEZpbGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAvLyBTZXQgdGhlIF9pc05ldyBmbGFnIGZvciBuZXcgc291bmQgZmlsZXNcbiAgICAgICAgICAgICAgICBpZiAoc291bmRGaWxlTW9kaWZ5UmVzdC5pc05ld1NvdW5kRmlsZSkge1xuICAgICAgICAgICAgICAgICAgICByZXNwb25zZS5kYXRhLl9pc05ldyA9IHRydWU7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlY29yZElkICYmIHJlY29yZElkICE9PSAnbmV3Jykge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgaWYgdHJ5aW5nIHRvIGxvYWQgbm9uLWV4aXN0ZW50IHJlY29yZFxuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihyZXNwb25zZS5tZXNzYWdlcz8uZXJyb3IgfHwgJ0ZhaWxlZCB0byBsb2FkIHNvdW5kIGZpbGUgZGF0YScpO1xuICAgICAgICAgICAgICAgIC8vIFJlZGlyZWN0IHRvIGluZGV4IGFmdGVyIGRlbGF5XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gYCR7Z2xvYmFsUm9vdFVybH1zb3VuZC1maWxlcy9pbmRleGA7XG4gICAgICAgICAgICAgICAgfSwgMzAwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0sIHBhcmFtcyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEdldCByZWNvcmQgSUQgZnJvbSBoaWRkZW4gaW5wdXQgZmllbGRcbiAgICAgKiBAcmV0dXJucyB7c3RyaW5nfSBSZWNvcmQgSUQgb3IgZW1wdHkgc3RyaW5nIGZvciBuZXcgcmVjb3Jkc1xuICAgICAqL1xuICAgIGdldFJlY29yZElkKCkge1xuICAgICAgICAvLyBHZXQgcmVjb3JkIElEIGZyb20gaGlkZGVuIGlucHV0IHNldCBieSBjb250cm9sbGVyXG4gICAgICAgIGNvbnN0IHJlY29yZElkVmFsdWUgPSAkKCcjaWQnKS52YWwoKTtcblxuICAgICAgICAvLyBDaGVjayBpZiBpdCdzIGEgY2F0ZWdvcnkgbmFtZSAoY3VzdG9tL21vaCkgb3IgYWN0dWFsIElEXG4gICAgICAgIGlmIChyZWNvcmRJZFZhbHVlID09PSAnY3VzdG9tJyB8fCByZWNvcmRJZFZhbHVlID09PSAnbW9oJykge1xuICAgICAgICAgICAgLy8gVGhpcyBpcyBhIG5ldyByZWNvcmQgd2l0aCBjYXRlZ29yeSBwcmVzZXRcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZWNvcmRJZFZhbHVlIHx8ICcnO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgY2F0ZWdvcnkgZnJvbSBoaWRkZW4gaW5wdXQgZmllbGQgb3IgVVJMXG4gICAgICogQHJldHVybnMge3N0cmluZ3xudWxsfSBDYXRlZ29yeSAoY3VzdG9tL21vaCkgb3IgbnVsbFxuICAgICAqL1xuICAgIGdldENhdGVnb3J5KCkge1xuICAgICAgICAvLyBGaXJzdCBjaGVjayBpZiBJRCBmaWVsZCBjb250YWlucyBjYXRlZ29yeVxuICAgICAgICBjb25zdCByZWNvcmRJZFZhbHVlID0gJCgnI2lkJykudmFsKCk7XG4gICAgICAgIGlmIChyZWNvcmRJZFZhbHVlID09PSAnY3VzdG9tJyB8fCByZWNvcmRJZFZhbHVlID09PSAnbW9oJykge1xuICAgICAgICAgICAgcmV0dXJuIHJlY29yZElkVmFsdWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBVUkwgcGFyYW1ldGVycyBmb3IgY2F0ZWdvcnlcbiAgICAgICAgY29uc3QgdXJsUGFyYW1zID0gbmV3IFVSTFNlYXJjaFBhcmFtcyh3aW5kb3cubG9jYXRpb24uc2VhcmNoKTtcbiAgICAgICAgY29uc3QgY2F0ZWdvcnlQYXJhbSA9IHVybFBhcmFtcy5nZXQoJ2NhdGVnb3J5Jyk7XG4gICAgICAgIGlmIChjYXRlZ29yeVBhcmFtID09PSAnY3VzdG9tJyB8fCBjYXRlZ29yeVBhcmFtID09PSAnbW9oJykge1xuICAgICAgICAgICAgcmV0dXJuIGNhdGVnb3J5UGFyYW07XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGRhdGFcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFNvdW5kIGZpbGUgZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybShkYXRhKSB7XG4gICAgICAgIC8vIFNhdmUgdGhlIF9pc05ldyBmbGFnIGluIGEgaGlkZGVuIGZpZWxkIGlmIHByZXNlbnRcbiAgICAgICAgaWYgKGRhdGEuX2lzTmV3ICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIGlmICgkKCcjX2lzTmV3JykubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgLy8gQ3JlYXRlIGhpZGRlbiBmaWVsZCBpZiBpdCBkb2Vzbid0IGV4aXN0XG4gICAgICAgICAgICAgICAgJCgnPGlucHV0PicpLmF0dHIoe1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnaGlkZGVuJyxcbiAgICAgICAgICAgICAgICAgICAgaWQ6ICdfaXNOZXcnLFxuICAgICAgICAgICAgICAgICAgICBuYW1lOiAnX2lzTmV3JyxcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU6IGRhdGEuX2lzTmV3ID8gJ3RydWUnIDogJ2ZhbHNlJ1xuICAgICAgICAgICAgICAgIH0pLmFwcGVuZFRvKHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmopO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAkKCcjX2lzTmV3JykudmFsKGRhdGEuX2lzTmV3ID8gJ3RydWUnIDogJ2ZhbHNlJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICAvLyBVc2UgdW5pZmllZCBzaWxlbnQgcG9wdWxhdGlvbiBhcHByb2FjaFxuICAgICAgICBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KGRhdGEsIHtcbiAgICAgICAgICAgIGFmdGVyUG9wdWxhdGU6IChmb3JtRGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBhdWRpbyBwbGF5ZXIgaWYgcGF0aCBleGlzdHNcbiAgICAgICAgICAgICAgICBpZiAoZm9ybURhdGEucGF0aCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBVc2UgbmV3IHNvdW5kLWZpbGVzIGVuZHBvaW50IGZvciBNT0gvSVZSL3N5c3RlbSBzb3VuZHNcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYXVkaW9VcmwgPSBgL3BieGNvcmUvYXBpL3YzL3NvdW5kLWZpbGVzOnBsYXliYWNrP3ZpZXc9JHtmb3JtRGF0YS5wYXRofWA7XG4gICAgICAgICAgICAgICAgICAgIHNuZFBsYXllci5VcGRhdGVTb3VyY2UoYXVkaW9VcmwpO1xuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBiYWNrLXRvLWxpc3QgYnV0dG9uIFVSTCB3aXRoIGN1cnJlbnQgY2F0ZWdvcnlcbiAgICAgICAgICAgICAgICBpZiAoZm9ybURhdGEuY2F0ZWdvcnkpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgJGJhY2tCdXR0b24gPSAkKCcjYmFjay10by1saXN0LWJ1dHRvbicpO1xuICAgICAgICAgICAgICAgICAgICBpZiAoJGJhY2tCdXR0b24ubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgJGJhY2tCdXR0b24uYXR0cignaHJlZicsIGAke2dsb2JhbFJvb3RVcmx9c291bmQtZmlsZXMvaW5kZXgjJHtmb3JtRGF0YS5jYXRlZ29yeX1gKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIC8vIFNhdmUgaW5pdGlhbCB2YWx1ZXMgZm9yIGRpcnJpdHkgY2hlY2tpbmdcbiAgICAgICAgICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uc2F2ZUluaXRpYWxWYWx1ZXMoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDbGVhcnMgY2FjaGVzIGlmIGRhdGEgY2hhbmdlcy5cbiAgICAgKi9cbiAgICBjYk9uRGF0YUNoYW5nZWQoKSB7XG4gICAgICAgIC8vIENsZWFyIFJFU1QgQVBJIGNhY2hlIGlmIG5lZWRlZCAtIGhhbmRsZWQgYnkgQVBJIGxheWVyXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGZvciBmaWxlIHVwbG9hZCB3aXRoIGNodW5rcyBhbmQgbWVyZ2UuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGFjdGlvbiAtIFRoZSBhY3Rpb24gcGVyZm9ybWVkIGR1cmluZyB0aGUgdXBsb2FkLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgLSBBZGRpdGlvbmFsIHBhcmFtZXRlcnMgcmVsYXRlZCB0byB0aGUgdXBsb2FkLlxuICAgICAqL1xuICAgIGNiVXBsb2FkUmVzdW1hYmxlKGFjdGlvbiwgcGFyYW1zKSB7XG4gICAgICAgIHN3aXRjaCAoYWN0aW9uKSB7XG4gICAgICAgICAgICBjYXNlICdmaWxlU3VjY2Vzcyc6XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBQYnhBcGkudHJ5UGFyc2VKU09OKHBhcmFtcy5yZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlICE9PSBmYWxzZSAmJiByZXNwb25zZS5kYXRhLmZpbGVuYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gR2V0IGZpbGVuYW1lIGZyb20gcmVzdW1hYmxlLmpzIGZpbGUgb2JqZWN0IGFuZCByZW1vdmUgZXh0ZW5zaW9uXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGZpbGVOYW1lID0gcGFyYW1zLmZpbGUuZmlsZU5hbWUgfHwgcGFyYW1zLmZpbGUubmFtZTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGZpbGVOYW1lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRzb3VuZEZpbGVOYW1lLnZhbChmaWxlTmFtZS5yZXBsYWNlKC9cXC5bXi8uXSskLywgJycpKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LmNoZWNrU3RhdHVzRmlsZU1lcmdpbmcocGFyYW1zLnJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocGFyYW1zLCBnbG9iYWxUcmFuc2xhdGUuc2ZfVXBsb2FkRXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3VwbG9hZFN0YXJ0JzpcbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdlcnJvcic6XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhwYXJhbXMsIGdsb2JhbFRyYW5zbGF0ZS5zZl9VcGxvYWRFcnJvcik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyB0aGUgc3RhdHVzIG9mIGZpbGUgbWVyZ2luZy5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgZmlsZSBtZXJnaW5nIHN0YXR1cyBmdW5jdGlvbi5cbiAgICAgKi9cbiAgICBjaGVja1N0YXR1c0ZpbGVNZXJnaW5nKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZSA9PT0gdW5kZWZpbmVkIHx8IFBieEFwaS50cnlQYXJzZUpTT04ocmVzcG9uc2UpID09PSBmYWxzZSkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGAke2dsb2JhbFRyYW5zbGF0ZS5zZl9VcGxvYWRFcnJvcn1gKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBqc29uID0gSlNPTi5wYXJzZShyZXNwb25zZSk7XG4gICAgICAgIGlmIChqc29uID09PSB1bmRlZmluZWQgfHwganNvbi5kYXRhID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhgJHtnbG9iYWxUcmFuc2xhdGUuc2ZfVXBsb2FkRXJyb3J9YCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCB1cGxvYWRJZCA9IGpzb24uZGF0YS51cGxvYWRfaWQ7XG4gICAgICAgIGNvbnN0IGZpbGVQYXRoID0ganNvbi5kYXRhLmZpbGVuYW1lO1xuXG4gICAgICAgIC8vIE5FVzogU3Vic2NyaWJlIHRvIEV2ZW50QnVzIGluc3RlYWQgb2YgdXNpbmcgcG9sbGluZyB3b3JrZXJcbiAgICAgICAgRmlsZVVwbG9hZEV2ZW50SGFuZGxlci5zdWJzY3JpYmUodXBsb2FkSWQsIHtcbiAgICAgICAgICAgIG9uTWVyZ2VTdGFydGVkOiAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJHN1Ym1pdEJ1dHRvbi5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIG9uTWVyZ2VQcm9ncmVzczogKGRhdGEpID0+IHtcbiAgICAgICAgICAgICAgICAvLyBVcGRhdGUgcHJvZ3Jlc3MgaW5kaWNhdG9yIGlmIG5lZWRlZFxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBTb3VuZCBmaWxlIG1lcmdlIHByb2dyZXNzOiAke2RhdGEucHJvZ3Jlc3N9JWApO1xuICAgICAgICAgICAgfSxcblxuICAgICAgICAgICAgb25NZXJnZUNvbXBsZXRlOiAoZGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICAvLyBQZXJmb3JtIGNvbnZlcnNpb24gYWZ0ZXIgbWVyZ2UgLSB1c2UgdGhlIGZpbGVQYXRoIGZyb20gdGhlIHJlc3BvbnNlXG4gICAgICAgICAgICAgICAgY29uc3QgY2F0ZWdvcnkgPSBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdjYXRlZ29yeScpO1xuICAgICAgICAgICAgICAgIFNvdW5kRmlsZXNBUEkuY29udmVydEF1ZGlvRmlsZSh7dGVtcF9maWxlbmFtZTogZmlsZVBhdGgsIGNhdGVnb3J5OiBjYXRlZ29yeX0sIHNvdW5kRmlsZU1vZGlmeVJlc3QuY2JBZnRlckNvbnZlcnRGaWxlKTtcbiAgICAgICAgICAgIH0sXG5cbiAgICAgICAgICAgIG9uRXJyb3I6IChkYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhkYXRhLmVycm9yIHx8IGdsb2JhbFRyYW5zbGF0ZS5zZl9VcGxvYWRFcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBhZnRlciB0aGUgZmlsZSBpcyBjb252ZXJ0ZWQgdG8gTVAzIGZvcm1hdC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZW5hbWUgLSBUaGUgZmlsZW5hbWUgb2YgdGhlIGNvbnZlcnRlZCBmaWxlLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJDb252ZXJ0RmlsZShyZXNwb25zZSkge1xuICAgICAgICBjb25zb2xlLmxvZygnW3NvdW5kLWZpbGUtbW9kaWZ5XSBjYkFmdGVyQ29udmVydEZpbGUgcmVzcG9uc2U6JywgcmVzcG9uc2UpO1xuXG4gICAgICAgIGxldCBmaWxlbmFtZSA9IG51bGw7XG5cbiAgICAgICAgLy8gSGFuZGxlIGRpZmZlcmVudCByZXNwb25zZSBmb3JtYXRzXG4gICAgICAgIGlmIChyZXNwb25zZSA9PT0gZmFsc2UgfHwgIXJlc3BvbnNlKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoYCR7Z2xvYmFsVHJhbnNsYXRlLnNmX1VwbG9hZEVycm9yfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gRXh0cmFjdCBmaWxlbmFtZSBmcm9tIHJlc3BvbnNlXG4gICAgICAgIGlmICh0eXBlb2YgcmVzcG9uc2UgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICBmaWxlbmFtZSA9IHJlc3BvbnNlO1xuICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSAmJiByZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAvLyBBUEkgcmV0dXJucyBkYXRhIGFzIGFycmF5IFtcIi9wYXRoL3RvL2ZpbGVcIl1cbiAgICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHJlc3BvbnNlLmRhdGEpICYmIHJlc3BvbnNlLmRhdGEubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgIGZpbGVuYW1lID0gcmVzcG9uc2UuZGF0YVswXTtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIHJlc3BvbnNlLmRhdGEgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgZmlsZW5hbWUgPSByZXNwb25zZS5kYXRhO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgY29uc29sZS5sb2coJ1tzb3VuZC1maWxlLW1vZGlmeV0gZXh0cmFjdGVkIGZpbGVuYW1lOicsIGZpbGVuYW1lKTtcblxuICAgICAgICBpZiAoZmlsZW5hbWUpIHtcbiAgICAgICAgICAgIC8vIEFkZCBvbGQgZmlsZSB0byB0cmFzaCBiaW4gZm9yIGRlbGV0aW9uIGFmdGVyIHNhdmVcbiAgICAgICAgICAgIGNvbnN0IG9sZFBhdGggPSBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdwYXRoJyk7XG4gICAgICAgICAgICBpZiAob2xkUGF0aCkge1xuICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QudHJhc2hCaW4ucHVzaChvbGRQYXRoKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gVXBkYXRlIGZvcm0gd2l0aCBuZXcgZmlsZSBwYXRoXG4gICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdwYXRoJywgZmlsZW5hbWUpO1xuICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kc291bmRGaWxlTmFtZS50cmlnZ2VyKCdjaGFuZ2UnKTtcblxuICAgICAgICAgICAgLy8gVXBkYXRlIHBsYXllciB3aXRoIG5ldyBmaWxlIHVzaW5nIHNvdW5kLWZpbGVzIGVuZHBvaW50XG4gICAgICAgICAgICBzbmRQbGF5ZXIuVXBkYXRlU291cmNlKGAvcGJ4Y29yZS9hcGkvdjMvc291bmQtZmlsZXM6cGxheWJhY2s/dmlldz0ke2ZpbGVuYW1lfWApO1xuXG4gICAgICAgICAgICAvLyBSZW1vdmUgbG9hZGluZyBzdGF0ZXNcbiAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGAke2dsb2JhbFRyYW5zbGF0ZS5zZl9VcGxvYWRFcnJvcn1gKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYmVmb3JlIHRoZSBmb3JtIGlzIHNlbnQuXG4gICAgICogQHBhcmFtIHtPYmplY3R9IHNldHRpbmdzIC0gVGhlIGN1cnJlbnQgc2V0dGluZ3Mgb2YgdGhlIGZvcm0uXG4gICAgICogQHJldHVybnMge09iamVjdH0gLSBUaGUgdXBkYXRlZCBzZXR0aW5ncyBvZiB0aGUgZm9ybS5cbiAgICAgKi9cbiAgICBjYkJlZm9yZVNlbmRGb3JtKHNldHRpbmdzKSB7XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IHNldHRpbmdzO1xuICAgICAgICByZXN1bHQuZGF0YSA9IHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlcycpO1xuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAvLyBEZWxldGUgb2xkIGZpbGVzIGZyb20gdHJhc2ggYmluXG4gICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LnRyYXNoQmluLmZvckVhY2goKGZpbGVwYXRoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGZpbGVwYXRoKSBGaWxlc0FQSS5yZW1vdmVBdWRpb0ZpbGUoZmlsZXBhdGgsICgpID0+IHt9KTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC50cmFzaEJpbiA9IFtdO1xuXG4gICAgICAgICAgICAvLyBVcGRhdGUgZm9ybSB3aXRoIG5ldyBkYXRhIGlmIHByb3ZpZGVkXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIC8vIElmIHRoaXMgd2FzIGEgbmV3IHNvdW5kIGZpbGUgdGhhdCB3YXMgc2F2ZWQsIHVwZGF0ZSBzdGF0ZVxuICAgICAgICAgICAgICAgIGlmIChzb3VuZEZpbGVNb2RpZnlSZXN0LmlzTmV3U291bmRGaWxlICYmIHJlc3BvbnNlLmRhdGEuaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gVXBkYXRlIHRoZSBmb3JtIElEIGZpZWxkXG4gICAgICAgICAgICAgICAgICAgICQoJyNpZCcpLnZhbChyZXNwb25zZS5kYXRhLmlkKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyBVcGRhdGUgaXNOZXdTb3VuZEZpbGUgZmxhZ1xuICAgICAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LmlzTmV3U291bmRGaWxlID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICAgICAgLy8gUmVtb3ZlIF9pc05ldyBmbGFnIGZyb20gZm9ybVxuICAgICAgICAgICAgICAgICAgICAkKCcjX2lzTmV3JykucmVtb3ZlKCk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEZvcm0uanMgd2lsbCBoYW5kbGUgYWxsIHJlZGlyZWN0IGxvZ2ljIGJhc2VkIG9uIHN1Ym1pdE1vZGVcblxuICAgICAgICAgICAgLy8gVHJpZ2dlciBjb25maWcgY2hhbmdlZCBldmVudCB0byByZWZyZXNoIGxpc3RzXG4gICAgICAgICAgICBjb25zdCBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuICAgICAgICAgICAgZXZlbnQuaW5pdEV2ZW50KCdDb25maWdEYXRhQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcbiAgICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIGNvbnN0IGNhdGVnb3J5ID0gc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnY2F0ZWdvcnknKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyZSBGb3JtLmpzXG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBzb3VuZEZpbGVNb2RpZnlSZXN0LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IHNvdW5kRmlsZU1vZGlmeVJlc3QuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBzb3VuZEZpbGVNb2RpZnlSZXN0LmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyZSBSRVNUIEFQSSBpbnRlZ3JhdGlvblxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzID0ge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGFwaU9iamVjdDogU291bmRGaWxlc0FQSSxcbiAgICAgICAgICAgIHNhdmVNZXRob2Q6ICdzYXZlUmVjb3JkJ1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIHJlZGlyZWN0IFVSTHNcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9c291bmQtZmlsZXMvbW9kaWZ5L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9c291bmQtZmlsZXMvaW5kZXgvIy8ke2NhdGVnb3J5fWA7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxufTtcblxuLy8gTm90ZTogbWVyZ2luZ0NoZWNrV29ya2VyLmNiQWZ0ZXJNZXJnaW5nIGlzIG5vdyBoYW5kbGVkIHZpYSBFdmVudEJ1cyBpbiBjaGVja1N0YXR1c0ZpbGVNZXJnaW5nIG1ldGhvZFxuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgc291bmQgZmlsZSBtb2RpZnkgZm9ybVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZSgpO1xufSk7Il19