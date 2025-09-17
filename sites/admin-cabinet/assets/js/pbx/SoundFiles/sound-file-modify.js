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

/* global globalRootUrl, globalTranslate, Form, PbxApi, sndPlayer, mergingCheckWorker, SoundFilesAPI, UserMessage, Config */

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
   * jQuery object for the sound file input.
   * @type {jQuery}
   */
  $soundFileInput: $('#file'),

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

    soundFileModifyRest.initializeForm(); // Initialize file upload button

    soundFileModifyRest.$soundUploadButton.on('click', function (e) {
      e.preventDefault();
      $('input:file', $(e.target).parents()).click();
    }); // Handle file selection

    soundFileModifyRest.$soundFileInput.on('change', function (e) {
      var file = e.target.files[0];
      if (file === undefined) return; // Update name field with filename without extension

      soundFileModifyRest.$soundFileName.val(file.name.replace(/\.[^/.]+$/, '')); // Create blob URL for preview

      soundFileModifyRest.blob = window.URL || window.webkitURL;
      var fileURL = soundFileModifyRest.blob.createObjectURL(file);
      sndPlayer.UpdateSource(fileURL); // Upload file using PbxApi (this remains the same as it uses resumable.js)

      PbxApi.FilesUploadFile(file, soundFileModifyRest.cbUploadResumable);
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

    var fileID = json.data.upload_id;
    var filePath = json.data.filename;
    mergingCheckWorker.initialize(fileID, filePath);
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
        if (filepath) PbxApi.FilesRemoveAudioFile(filepath);
      });
      soundFileModifyRest.trashBin = []; // Update form with new data if provided

      if (response.data) {
        soundFileModifyRest.populateForm(response.data); // Update URL for new records

        var currentId = soundFileModifyRest.$formObj.form('get value', 'id');

        if (!currentId && response.data.id) {
          var newUrl = window.location.href.replace(/modify\/(custom|moh)?$/, "modify/".concat(response.data.id));
          window.history.pushState(null, '', newUrl);
        }
      } // Trigger config changed event to refresh lists


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
}; // Initialize mergingCheckWorker callback

if (typeof mergingCheckWorker !== 'undefined') {
  mergingCheckWorker.cbAfterMerging = soundFileModifyRest.cbAfterConvertFile;
} // When the document is ready, initialize the sound file modify form


$(document).ready(function () {
  soundFileModifyRest.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGUtbW9kaWZ5LmpzIl0sIm5hbWVzIjpbInNvdW5kRmlsZU1vZGlmeVJlc3QiLCJ0cmFzaEJpbiIsIiRzb3VuZFVwbG9hZEJ1dHRvbiIsIiQiLCIkc291bmRGaWxlSW5wdXQiLCIkc291bmRGaWxlTmFtZSIsIiRhdWRpb1BsYXllciIsIiRzdWJtaXRCdXR0b24iLCJibG9iIiwid2luZG93IiwiVVJMIiwid2Via2l0VVJMIiwiJGZvcm1PYmoiLCIkZHJvcERvd25zIiwidmFsaWRhdGVSdWxlcyIsIm5hbWUiLCJpZGVudGlmaWVyIiwicnVsZXMiLCJ0eXBlIiwicHJvbXB0IiwiZ2xvYmFsVHJhbnNsYXRlIiwic2ZfVmFsaWRhdGlvbkZpbGVOYW1lSXNFbXB0eSIsInBhdGgiLCJzZl9WYWxpZGF0aW9uRmlsZU5vdFNlbGVjdGVkIiwiaW5pdGlhbGl6ZSIsImRyb3Bkb3duIiwibG9hZEZvcm1EYXRhIiwiaW5pdGlhbGl6ZUZvcm0iLCJvbiIsImUiLCJwcmV2ZW50RGVmYXVsdCIsInRhcmdldCIsInBhcmVudHMiLCJjbGljayIsImZpbGUiLCJmaWxlcyIsInVuZGVmaW5lZCIsInZhbCIsInJlcGxhY2UiLCJmaWxlVVJMIiwiY3JlYXRlT2JqZWN0VVJMIiwic25kUGxheWVyIiwiVXBkYXRlU291cmNlIiwiUGJ4QXBpIiwiRmlsZXNVcGxvYWRGaWxlIiwiY2JVcGxvYWRSZXN1bWFibGUiLCJhZGRFdmVudExpc3RlbmVyIiwiY2JPbkRhdGFDaGFuZ2VkIiwicmVjb3JkSWQiLCJnZXRSZWNvcmRJZCIsImFkZENsYXNzIiwiU291bmRGaWxlc0FQSSIsImdldFJlY29yZCIsInJlc3BvbnNlIiwicmVtb3ZlQ2xhc3MiLCJyZXN1bHQiLCJwb3B1bGF0ZUZvcm0iLCJkYXRhIiwiVXNlck1lc3NhZ2UiLCJzaG93RXJyb3IiLCJtZXNzYWdlcyIsImVycm9yIiwic2V0VGltZW91dCIsImxvY2F0aW9uIiwiaHJlZiIsImdsb2JhbFJvb3RVcmwiLCJyZWNvcmRJZFZhbHVlIiwiRm9ybSIsInBvcHVsYXRlRm9ybVNpbGVudGx5IiwiYWZ0ZXJQb3B1bGF0ZSIsImZvcm1EYXRhIiwiYXVkaW9VcmwiLCJlbmFibGVEaXJyaXR5Iiwic2F2ZUluaXRpYWxWYWx1ZXMiLCJhY3Rpb24iLCJwYXJhbXMiLCJ0cnlQYXJzZUpTT04iLCJmaWxlbmFtZSIsImZpbGVOYW1lIiwiY2hlY2tTdGF0dXNGaWxlTWVyZ2luZyIsInNob3dNdWx0aVN0cmluZyIsInNmX1VwbG9hZEVycm9yIiwianNvbiIsIkpTT04iLCJwYXJzZSIsImZpbGVJRCIsInVwbG9hZF9pZCIsImZpbGVQYXRoIiwibWVyZ2luZ0NoZWNrV29ya2VyIiwiY2JBZnRlckNvbnZlcnRGaWxlIiwib2xkUGF0aCIsImZvcm0iLCJwdXNoIiwidHJpZ2dlciIsImNiQmVmb3JlU2VuZEZvcm0iLCJzZXR0aW5ncyIsImN1cnJlbnRJZCIsImlkIiwiX2lzTmV3IiwiY2JBZnRlclNlbmRGb3JtIiwiZm9yRWFjaCIsImZpbGVwYXRoIiwiRmlsZXNSZW1vdmVBdWRpb0ZpbGUiLCJuZXdVcmwiLCJoaXN0b3J5IiwicHVzaFN0YXRlIiwiZXZlbnQiLCJkb2N1bWVudCIsImNyZWF0ZUV2ZW50IiwiaW5pdEV2ZW50IiwiZGlzcGF0Y2hFdmVudCIsImNhdGVnb3J5IiwidXJsIiwiYXBpU2V0dGluZ3MiLCJlbmFibGVkIiwiYXBpT2JqZWN0Iiwic2F2ZU1ldGhvZCIsImFmdGVyU3VibWl0TW9kaWZ5VXJsIiwiYWZ0ZXJTdWJtaXRJbmRleFVybCIsImNiQWZ0ZXJNZXJnaW5nIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLG1CQUFtQixHQUFHO0FBQ3hCO0FBQ0o7QUFD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dGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgZ2xvYmFsVHJhbnNsYXRlLCBGb3JtLCBQYnhBcGksIHNuZFBsYXllciwgbWVyZ2luZ0NoZWNrV29ya2VyLCBTb3VuZEZpbGVzQVBJLCBVc2VyTWVzc2FnZSwgQ29uZmlnICovXG5cbi8qKlxuICogU291bmQgZmlsZSBtb2RpZmljYXRpb24gbW9kdWxlIHdpdGggUkVTVCBBUEkgaW50ZWdyYXRpb25cbiAqIFRoaXMgbW9kdWxlIHJlcGxhY2VzIHNvdW5kLWZpbGUtbW9kaWZ5LmpzIHdpdGggUkVTVCBBUEkgY2FsbHMgd2hpbGUgcHJlc2VydmluZ1xuICogYWxsIGV4aXN0aW5nIGZ1bmN0aW9uYWxpdHkgaW5jbHVkaW5nIGZpbGUgdXBsb2FkLCBhdWRpbyByZWNvcmRpbmcsIGFuZCBwbGF5ZXJcbiAqXG4gKiBAbW9kdWxlIHNvdW5kRmlsZU1vZGlmeVJlc3RcbiAqL1xuY29uc3Qgc291bmRGaWxlTW9kaWZ5UmVzdCA9IHtcbiAgICAvKipcbiAgICAgKiBBcnJheSB0byBzdG9yZSBwYXRocyBvZiBmaWxlcyB0byBiZSBkZWxldGVkIGFmdGVyIHNhdmVcbiAgICAgKiBAdHlwZSB7QXJyYXl9XG4gICAgICovXG4gICAgdHJhc2hCaW46IFtdLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHNvdW5kIHVwbG9hZCBidXR0b24uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc291bmRVcGxvYWRCdXR0b246ICQoJyN1cGxvYWQtc291bmQtZmlsZScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIHNvdW5kIGZpbGUgaW5wdXQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc291bmRGaWxlSW5wdXQ6ICQoJyNmaWxlJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgc291bmQgZmlsZSBuYW1lIGlucHV0LlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHNvdW5kRmlsZU5hbWU6ICQoJyNuYW1lJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgYXVkaW8gcGxheWVyLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGF1ZGlvUGxheWVyOiAkKCcjYXVkaW8tcGxheWVyJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgc3VibWl0IGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzdWJtaXRCdXR0b246ICQoJyNzdWJtaXRidXR0b24nKSxcblxuICAgIC8qKlxuICAgICAqIFRoZSBCbG9iIFVSTCBvYmplY3QuXG4gICAgICogQHR5cGUge0Jsb2J9XG4gICAgICovXG4gICAgYmxvYjogd2luZG93LlVSTCB8fCB3aW5kb3cud2Via2l0VVJMLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZm9ybU9iajogJCgnI3NvdW5kLWZpbGUtZm9ybScpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGZvcm0gZHJvcGRvd25zLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGRyb3BEb3duczogJCgnI3NvdW5kLWZpbGUtZm9ybSAuZHJvcGRvd24nKSxcblxuICAgIC8qKlxuICAgICAqIFZhbGlkYXRpb24gcnVsZXMgZm9yIHRoZSBmb3JtIGZpZWxkcyBiZWZvcmUgc3VibWlzc2lvbi5cbiAgICAgKlxuICAgICAqIEB0eXBlIHtvYmplY3R9XG4gICAgICovXG4gICAgdmFsaWRhdGVSdWxlczoge1xuICAgICAgICBuYW1lOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAnbmFtZScsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuc2ZfVmFsaWRhdGlvbkZpbGVOYW1lSXNFbXB0eSxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICAgICAgcGF0aDoge1xuICAgICAgICAgICAgaWRlbnRpZmllcjogJ3BhdGgnLFxuICAgICAgICAgICAgcnVsZXM6IFtcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHR5cGU6ICdlbXB0eScsXG4gICAgICAgICAgICAgICAgICAgIHByb21wdDogZ2xvYmFsVHJhbnNsYXRlLnNmX1ZhbGlkYXRpb25GaWxlTm90U2VsZWN0ZWQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYWxpemVzIHRoZSBzb3VuZCBmaWxlIG1vZGlmaWNhdGlvbiBmdW5jdGlvbmFsaXR5LlxuICAgICAqL1xuICAgIGluaXRpYWxpemUoKSB7XG4gICAgICAgIC8vIEluaXRpYWxpemUgZHJvcGRvd25zXG4gICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJGRyb3BEb3ducy5kcm9wZG93bigpO1xuICAgICAgICBcbiAgICAgICAgLy8gTG9hZCBmb3JtIGRhdGEgZnJvbSBSRVNUIEFQSVxuICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LmxvYWRGb3JtRGF0YSgpO1xuICAgICAgICBcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmb3JtIHZhbGlkYXRpb24gYW5kIHN1Ym1pc3Npb25cbiAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC5pbml0aWFsaXplRm9ybSgpO1xuXG4gICAgICAgIC8vIEluaXRpYWxpemUgZmlsZSB1cGxvYWQgYnV0dG9uXG4gICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJHNvdW5kVXBsb2FkQnV0dG9uLm9uKCdjbGljaycsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICAkKCdpbnB1dDpmaWxlJywgJChlLnRhcmdldCkucGFyZW50cygpKS5jbGljaygpO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBIYW5kbGUgZmlsZSBzZWxlY3Rpb25cbiAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kc291bmRGaWxlSW5wdXQub24oJ2NoYW5nZScsIChlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBmaWxlID0gZS50YXJnZXQuZmlsZXNbMF07XG4gICAgICAgICAgICBpZiAoZmlsZSA9PT0gdW5kZWZpbmVkKSByZXR1cm47XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBuYW1lIGZpZWxkIHdpdGggZmlsZW5hbWUgd2l0aG91dCBleHRlbnNpb25cbiAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJHNvdW5kRmlsZU5hbWUudmFsKGZpbGUubmFtZS5yZXBsYWNlKC9cXC5bXi8uXSskLywgJycpKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gQ3JlYXRlIGJsb2IgVVJMIGZvciBwcmV2aWV3XG4gICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LmJsb2IgPSB3aW5kb3cuVVJMIHx8IHdpbmRvdy53ZWJraXRVUkw7XG4gICAgICAgICAgICBjb25zdCBmaWxlVVJMID0gc291bmRGaWxlTW9kaWZ5UmVzdC5ibG9iLmNyZWF0ZU9iamVjdFVSTChmaWxlKTtcbiAgICAgICAgICAgIHNuZFBsYXllci5VcGRhdGVTb3VyY2UoZmlsZVVSTCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwbG9hZCBmaWxlIHVzaW5nIFBieEFwaSAodGhpcyByZW1haW5zIHRoZSBzYW1lIGFzIGl0IHVzZXMgcmVzdW1hYmxlLmpzKVxuICAgICAgICAgICAgUGJ4QXBpLkZpbGVzVXBsb2FkRmlsZShmaWxlLCBzb3VuZEZpbGVNb2RpZnlSZXN0LmNiVXBsb2FkUmVzdW1hYmxlKTtcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICAvLyBMaXN0ZW4gZm9yIGRhdGEgY2hhbmdlcyB0byBjbGVhciBjYWNoZVxuICAgICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignQ29uZmlnRGF0YUNoYW5nZWQnLCBzb3VuZEZpbGVNb2RpZnlSZXN0LmNiT25EYXRhQ2hhbmdlZCk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIExvYWQgZm9ybSBkYXRhIGZyb20gUkVTVCBBUElcbiAgICAgKi9cbiAgICBsb2FkRm9ybURhdGEoKSB7XG4gICAgICAgIGNvbnN0IHJlY29yZElkID0gc291bmRGaWxlTW9kaWZ5UmVzdC5nZXRSZWNvcmRJZCgpO1xuICAgICAgICBcbiAgICAgICAgLy8gU2hvdyBsb2FkaW5nIHN0YXRlXG4gICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmouYWRkQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgXG4gICAgICAgIFNvdW5kRmlsZXNBUEkuZ2V0UmVjb3JkKHJlY29yZElkLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChyZWNvcmRJZCAmJiByZWNvcmRJZCAhPT0gJ25ldycpIHtcbiAgICAgICAgICAgICAgICAvLyBTaG93IGVycm9yIGlmIHRyeWluZyB0byBsb2FkIG5vbi1leGlzdGVudCByZWNvcmRcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93RXJyb3IocmVzcG9uc2UubWVzc2FnZXM/LmVycm9yIHx8ICdGYWlsZWQgdG8gbG9hZCBzb3VuZCBmaWxlIGRhdGEnKTtcbiAgICAgICAgICAgICAgICAvLyBSZWRpcmVjdCB0byBpbmRleCBhZnRlciBkZWxheVxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24uaHJlZiA9IGAke2dsb2JhbFJvb3RVcmx9c291bmQtZmlsZXMvaW5kZXhgO1xuICAgICAgICAgICAgICAgIH0sIDMwMDApO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IHJlY29yZCBJRCBmcm9tIGhpZGRlbiBpbnB1dCBmaWVsZFxuICAgICAqIEByZXR1cm5zIHtzdHJpbmd9IFJlY29yZCBJRCBvciBlbXB0eSBzdHJpbmcgZm9yIG5ldyByZWNvcmRzXG4gICAgICovXG4gICAgZ2V0UmVjb3JkSWQoKSB7XG4gICAgICAgIC8vIEdldCByZWNvcmQgSUQgZnJvbSBoaWRkZW4gaW5wdXQgc2V0IGJ5IGNvbnRyb2xsZXJcbiAgICAgICAgY29uc3QgcmVjb3JkSWRWYWx1ZSA9ICQoJyNpZCcpLnZhbCgpO1xuXG4gICAgICAgIC8vIENoZWNrIGlmIGl0J3MgYSBjYXRlZ29yeSBuYW1lIChjdXN0b20vbW9oKSBvciBhY3R1YWwgSURcbiAgICAgICAgaWYgKHJlY29yZElkVmFsdWUgPT09ICdjdXN0b20nIHx8IHJlY29yZElkVmFsdWUgPT09ICdtb2gnKSB7XG4gICAgICAgICAgICAvLyBUaGlzIGlzIGEgbmV3IHJlY29yZCB3aXRoIGNhdGVnb3J5IHByZXNldFxuICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIHJlY29yZElkVmFsdWUgfHwgJyc7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFBvcHVsYXRlIGZvcm0gd2l0aCBkYXRhXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGRhdGEgLSBTb3VuZCBmaWxlIGRhdGEgZnJvbSBBUElcbiAgICAgKi9cbiAgICBwb3B1bGF0ZUZvcm0oZGF0YSkge1xuICAgICAgICAvLyBVc2UgdW5pZmllZCBzaWxlbnQgcG9wdWxhdGlvbiBhcHByb2FjaFxuICAgICAgICBGb3JtLnBvcHVsYXRlRm9ybVNpbGVudGx5KGRhdGEsIHtcbiAgICAgICAgICAgIGFmdGVyUG9wdWxhdGU6IChmb3JtRGF0YSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBhdWRpbyBwbGF5ZXIgaWYgcGF0aCBleGlzdHNcbiAgICAgICAgICAgICAgICBpZiAoZm9ybURhdGEucGF0aCkge1xuICAgICAgICAgICAgICAgICAgICAvLyBVc2UgbmV3IHNvdW5kLWZpbGVzIGVuZHBvaW50IGZvciBNT0gvSVZSL3N5c3RlbSBzb3VuZHNcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgYXVkaW9VcmwgPSBgL3BieGNvcmUvYXBpL3YzL3NvdW5kLWZpbGVzOnBsYXliYWNrP3ZpZXc9JHtmb3JtRGF0YS5wYXRofWA7XG4gICAgICAgICAgICAgICAgICAgIHNuZFBsYXllci5VcGRhdGVTb3VyY2UoYXVkaW9VcmwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBcbiAgICAgICAgICAgICAgICAvLyBTYXZlIGluaXRpYWwgdmFsdWVzIGZvciBkaXJyaXR5IGNoZWNraW5nXG4gICAgICAgICAgICAgICAgaWYgKEZvcm0uZW5hYmxlRGlycml0eSkge1xuICAgICAgICAgICAgICAgICAgICBGb3JtLnNhdmVJbml0aWFsVmFsdWVzKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2xlYXJzIGNhY2hlcyBpZiBkYXRhIGNoYW5nZXMuXG4gICAgICovXG4gICAgY2JPbkRhdGFDaGFuZ2VkKCkge1xuICAgICAgICAvLyBDbGVhciBSRVNUIEFQSSBjYWNoZSBpZiBuZWVkZWQgLSBoYW5kbGVkIGJ5IEFQSSBsYXllclxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBmb3IgZmlsZSB1cGxvYWQgd2l0aCBjaHVua3MgYW5kIG1lcmdlLlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhY3Rpb24gLSBUaGUgYWN0aW9uIHBlcmZvcm1lZCBkdXJpbmcgdGhlIHVwbG9hZC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcGFyYW1zIC0gQWRkaXRpb25hbCBwYXJhbWV0ZXJzIHJlbGF0ZWQgdG8gdGhlIHVwbG9hZC5cbiAgICAgKi9cbiAgICBjYlVwbG9hZFJlc3VtYWJsZShhY3Rpb24sIHBhcmFtcykge1xuICAgICAgICBzd2l0Y2ggKGFjdGlvbikge1xuICAgICAgICAgICAgY2FzZSAnZmlsZVN1Y2Nlc3MnOlxuICAgICAgICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gUGJ4QXBpLnRyeVBhcnNlSlNPTihwYXJhbXMucmVzcG9uc2UpO1xuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAhPT0gZmFsc2UgJiYgcmVzcG9uc2UuZGF0YS5maWxlbmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJHNvdW5kRmlsZU5hbWUudmFsKHBhcmFtcy5maWxlLmZpbGVOYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC5jaGVja1N0YXR1c0ZpbGVNZXJnaW5nKHBhcmFtcy5yZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHBhcmFtcywgZ2xvYmFsVHJhbnNsYXRlLnNmX1VwbG9hZEVycm9yKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICd1cGxvYWRTdGFydCc6XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnZXJyb3InOlxuICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmoucmVtb3ZlQ2xhc3MoJ2xvYWRpbmcnKTtcbiAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocGFyYW1zLCBnbG9iYWxUcmFuc2xhdGUuc2ZfVXBsb2FkRXJyb3IpO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDpcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVja3MgdGhlIHN0YXR1cyBvZiBmaWxlIG1lcmdpbmcuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHJlc3BvbnNlIC0gVGhlIHJlc3BvbnNlIGZyb20gdGhlIGZpbGUgbWVyZ2luZyBzdGF0dXMgZnVuY3Rpb24uXG4gICAgICovXG4gICAgY2hlY2tTdGF0dXNGaWxlTWVyZ2luZyhyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UgPT09IHVuZGVmaW5lZCB8fCBQYnhBcGkudHJ5UGFyc2VKU09OKHJlc3BvbnNlKSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhgJHtnbG9iYWxUcmFuc2xhdGUuc2ZfVXBsb2FkRXJyb3J9YCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QganNvbiA9IEpTT04ucGFyc2UocmVzcG9uc2UpO1xuICAgICAgICBpZiAoanNvbiA9PT0gdW5kZWZpbmVkIHx8IGpzb24uZGF0YSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoYCR7Z2xvYmFsVHJhbnNsYXRlLnNmX1VwbG9hZEVycm9yfWApO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGZpbGVJRCA9IGpzb24uZGF0YS51cGxvYWRfaWQ7XG4gICAgICAgIGNvbnN0IGZpbGVQYXRoID0ganNvbi5kYXRhLmZpbGVuYW1lO1xuICAgICAgICBtZXJnaW5nQ2hlY2tXb3JrZXIuaW5pdGlhbGl6ZShmaWxlSUQsIGZpbGVQYXRoKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gYWZ0ZXIgdGhlIGZpbGUgaXMgY29udmVydGVkIHRvIE1QMyBmb3JtYXQuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVuYW1lIC0gVGhlIGZpbGVuYW1lIG9mIHRoZSBjb252ZXJ0ZWQgZmlsZS5cbiAgICAgKi9cbiAgICBjYkFmdGVyQ29udmVydEZpbGUoZmlsZW5hbWUpIHtcbiAgICAgICAgaWYgKGZpbGVuYW1lID09PSBmYWxzZSkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGAke2dsb2JhbFRyYW5zbGF0ZS5zZl9VcGxvYWRFcnJvcn1gKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIC8vIEFkZCBvbGQgZmlsZSB0byB0cmFzaCBiaW4gZm9yIGRlbGV0aW9uIGFmdGVyIHNhdmVcbiAgICAgICAgICAgIGNvbnN0IG9sZFBhdGggPSBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdwYXRoJyk7XG4gICAgICAgICAgICBpZiAob2xkUGF0aCkge1xuICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QudHJhc2hCaW4ucHVzaChvbGRQYXRoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIGZvcm0gd2l0aCBuZXcgZmlsZSBwYXRoXG4gICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ3NldCB2YWx1ZScsICdwYXRoJywgZmlsZW5hbWUpO1xuICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kc291bmRGaWxlTmFtZS50cmlnZ2VyKCdjaGFuZ2UnKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIHBsYXllciB3aXRoIG5ldyBmaWxlIHVzaW5nIHNvdW5kLWZpbGVzIGVuZHBvaW50XG4gICAgICAgICAgICBzbmRQbGF5ZXIuVXBkYXRlU291cmNlKGAvcGJ4Y29yZS9hcGkvdjMvc291bmQtZmlsZXM6cGxheWJhY2s/dmlldz0ke2ZpbGVuYW1lfWApO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBSZW1vdmUgbG9hZGluZyBzdGF0ZXNcbiAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJHN1Ym1pdEJ1dHRvbi5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBiZWZvcmUgdGhlIGZvcm0gaXMgc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gc2V0dGluZ3MgLSBUaGUgY3VycmVudCBzZXR0aW5ncyBvZiB0aGUgZm9ybS5cbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSAtIFRoZSB1cGRhdGVkIHNldHRpbmdzIG9mIHRoZSBmb3JtLlxuICAgICAqL1xuICAgIGNiQmVmb3JlU2VuZEZvcm0oc2V0dGluZ3MpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gc2V0dGluZ3M7XG4gICAgICAgIHJlc3VsdC5kYXRhID0gc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWVzJyk7XG5cbiAgICAgICAgLy8gQWRkIGZsYWcgdG8gaW5kaWNhdGUgaWYgdGhpcyBpcyBhIG5ldyByZWNvcmQgZm9yIHByb3BlciBIVFRQIG1ldGhvZCBzZWxlY3Rpb25cbiAgICAgICAgY29uc3QgY3VycmVudElkID0gcmVzdWx0LmRhdGEuaWQ7XG4gICAgICAgIGlmICghY3VycmVudElkIHx8IGN1cnJlbnRJZCA9PT0gJycgfHwgY3VycmVudElkID09PSAnY3VzdG9tJyB8fCBjdXJyZW50SWQgPT09ICdtb2gnKSB7XG4gICAgICAgICAgICByZXN1bHQuZGF0YS5faXNOZXcgPSB0cnVlO1xuICAgICAgICAgICAgLy8gQ2xlYXIgdGhlIElEIGZvciBuZXcgcmVjb3Jkc1xuICAgICAgICAgICAgaWYgKGN1cnJlbnRJZCA9PT0gJ2N1c3RvbScgfHwgY3VycmVudElkID09PSAnbW9oJykge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5kYXRhLmlkID0gJyc7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiB0byBiZSBjYWxsZWQgYWZ0ZXIgdGhlIGZvcm0gaGFzIGJlZW4gc2VudC5cbiAgICAgKiBAcGFyYW0ge09iamVjdH0gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgc2VydmVyIGFmdGVyIHRoZSBmb3JtIGlzIHNlbnRcbiAgICAgKi9cbiAgICBjYkFmdGVyU2VuZEZvcm0ocmVzcG9uc2UpIHtcbiAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCkge1xuICAgICAgICAgICAgLy8gRGVsZXRlIG9sZCBmaWxlcyBmcm9tIHRyYXNoIGJpblxuICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC50cmFzaEJpbi5mb3JFYWNoKChmaWxlcGF0aCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChmaWxlcGF0aCkgUGJ4QXBpLkZpbGVzUmVtb3ZlQXVkaW9GaWxlKGZpbGVwYXRoKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC50cmFzaEJpbiA9IFtdO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgZm9ybSB3aXRoIG5ldyBkYXRhIGlmIHByb3ZpZGVkXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UuZGF0YSkge1xuICAgICAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QucG9wdWxhdGVGb3JtKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFVwZGF0ZSBVUkwgZm9yIG5ldyByZWNvcmRzXG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudElkID0gc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnaWQnKTtcbiAgICAgICAgICAgICAgICBpZiAoIWN1cnJlbnRJZCAmJiByZXNwb25zZS5kYXRhLmlkKSB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1VybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmLnJlcGxhY2UoL21vZGlmeVxcLyhjdXN0b218bW9oKT8kLywgYG1vZGlmeS8ke3Jlc3BvbnNlLmRhdGEuaWR9YCk7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZShudWxsLCAnJywgbmV3VXJsKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFRyaWdnZXIgY29uZmlnIGNoYW5nZWQgZXZlbnQgdG8gcmVmcmVzaCBsaXN0c1xuICAgICAgICAgICAgY29uc3QgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnQnKTtcbiAgICAgICAgICAgIGV2ZW50LmluaXRFdmVudCgnQ29uZmlnRGF0YUNoYW5nZWQnLCBmYWxzZSwgdHJ1ZSk7XG4gICAgICAgICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChldmVudCk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZSB0aGUgZm9ybSB3aXRoIGN1c3RvbSBzZXR0aW5nc1xuICAgICAqL1xuICAgIGluaXRpYWxpemVGb3JtKCkge1xuICAgICAgICBjb25zdCBjYXRlZ29yeSA9IHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ2NhdGVnb3J5Jyk7XG4gICAgICAgIFxuICAgICAgICAvLyBDb25maWd1cmUgRm9ybS5qc1xuICAgICAgICBGb3JtLiRmb3JtT2JqID0gc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iajtcbiAgICAgICAgRm9ybS51cmwgPSAnIyc7IC8vIE5vdCB1c2VkIHdpdGggUkVTVCBBUElcbiAgICAgICAgRm9ybS52YWxpZGF0ZVJ1bGVzID0gc291bmRGaWxlTW9kaWZ5UmVzdC52YWxpZGF0ZVJ1bGVzO1xuICAgICAgICBGb3JtLmNiQmVmb3JlU2VuZEZvcm0gPSBzb3VuZEZpbGVNb2RpZnlSZXN0LmNiQmVmb3JlU2VuZEZvcm07XG4gICAgICAgIEZvcm0uY2JBZnRlclNlbmRGb3JtID0gc291bmRGaWxlTW9kaWZ5UmVzdC5jYkFmdGVyU2VuZEZvcm07XG4gICAgICAgIFxuICAgICAgICAvLyBDb25maWd1cmUgUkVTVCBBUEkgaW50ZWdyYXRpb25cbiAgICAgICAgRm9ybS5hcGlTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgICBhcGlPYmplY3Q6IFNvdW5kRmlsZXNBUEksXG4gICAgICAgICAgICBzYXZlTWV0aG9kOiAnc2F2ZVJlY29yZCdcbiAgICAgICAgfTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyZSByZWRpcmVjdCBVUkxzXG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRNb2RpZnlVcmwgPSBgJHtnbG9iYWxSb290VXJsfXNvdW5kLWZpbGVzL21vZGlmeS9gO1xuICAgICAgICBGb3JtLmFmdGVyU3VibWl0SW5kZXhVcmwgPSBgJHtnbG9iYWxSb290VXJsfXNvdW5kLWZpbGVzL2luZGV4LyMvJHtjYXRlZ29yeX1gO1xuICAgICAgICBcbiAgICAgICAgRm9ybS5pbml0aWFsaXplKCk7XG4gICAgfSxcbn07XG5cbi8vIEluaXRpYWxpemUgbWVyZ2luZ0NoZWNrV29ya2VyIGNhbGxiYWNrXG5pZiAodHlwZW9mIG1lcmdpbmdDaGVja1dvcmtlciAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgICBtZXJnaW5nQ2hlY2tXb3JrZXIuY2JBZnRlck1lcmdpbmcgPSBzb3VuZEZpbGVNb2RpZnlSZXN0LmNiQWZ0ZXJDb252ZXJ0RmlsZTtcbn1cblxuLy8gV2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHksIGluaXRpYWxpemUgdGhlIHNvdW5kIGZpbGUgbW9kaWZ5IGZvcm1cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LmluaXRpYWxpemUoKTtcbn0pOyJdfQ==