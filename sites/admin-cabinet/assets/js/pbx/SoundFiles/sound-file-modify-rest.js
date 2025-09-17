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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9Tb3VuZEZpbGVzL3NvdW5kLWZpbGUtbW9kaWZ5LXJlc3QuanMiXSwibmFtZXMiOlsic291bmRGaWxlTW9kaWZ5UmVzdCIsInRyYXNoQmluIiwiJHNvdW5kVXBsb2FkQnV0dG9uIiwiJCIsIiRzb3VuZEZpbGVJbnB1dCIsIiRzb3VuZEZpbGVOYW1lIiwiJGF1ZGlvUGxheWVyIiwiJHN1Ym1pdEJ1dHRvbiIsImJsb2IiLCJ3aW5kb3ciLCJVUkwiLCJ3ZWJraXRVUkwiLCIkZm9ybU9iaiIsIiRkcm9wRG93bnMiLCJ2YWxpZGF0ZVJ1bGVzIiwibmFtZSIsImlkZW50aWZpZXIiLCJydWxlcyIsInR5cGUiLCJwcm9tcHQiLCJnbG9iYWxUcmFuc2xhdGUiLCJzZl9WYWxpZGF0aW9uRmlsZU5hbWVJc0VtcHR5IiwicGF0aCIsInNmX1ZhbGlkYXRpb25GaWxlTm90U2VsZWN0ZWQiLCJpbml0aWFsaXplIiwiZHJvcGRvd24iLCJsb2FkRm9ybURhdGEiLCJpbml0aWFsaXplRm9ybSIsIm9uIiwiZSIsInByZXZlbnREZWZhdWx0IiwidGFyZ2V0IiwicGFyZW50cyIsImNsaWNrIiwiZmlsZSIsImZpbGVzIiwidW5kZWZpbmVkIiwidmFsIiwicmVwbGFjZSIsImZpbGVVUkwiLCJjcmVhdGVPYmplY3RVUkwiLCJzbmRQbGF5ZXIiLCJVcGRhdGVTb3VyY2UiLCJQYnhBcGkiLCJGaWxlc1VwbG9hZEZpbGUiLCJjYlVwbG9hZFJlc3VtYWJsZSIsImFkZEV2ZW50TGlzdGVuZXIiLCJjYk9uRGF0YUNoYW5nZWQiLCJyZWNvcmRJZCIsImdldFJlY29yZElkIiwiYWRkQ2xhc3MiLCJTb3VuZEZpbGVzQVBJIiwiZ2V0UmVjb3JkIiwicmVzcG9uc2UiLCJyZW1vdmVDbGFzcyIsInJlc3VsdCIsInBvcHVsYXRlRm9ybSIsImRhdGEiLCJVc2VyTWVzc2FnZSIsInNob3dFcnJvciIsIm1lc3NhZ2VzIiwiZXJyb3IiLCJzZXRUaW1lb3V0IiwibG9jYXRpb24iLCJocmVmIiwiZ2xvYmFsUm9vdFVybCIsInJlY29yZElkVmFsdWUiLCJGb3JtIiwicG9wdWxhdGVGb3JtU2lsZW50bHkiLCJhZnRlclBvcHVsYXRlIiwiZm9ybURhdGEiLCJhdWRpb1VybCIsImVuYWJsZURpcnJpdHkiLCJzYXZlSW5pdGlhbFZhbHVlcyIsImFjdGlvbiIsInBhcmFtcyIsInRyeVBhcnNlSlNPTiIsImZpbGVuYW1lIiwiZmlsZU5hbWUiLCJjaGVja1N0YXR1c0ZpbGVNZXJnaW5nIiwic2hvd011bHRpU3RyaW5nIiwic2ZfVXBsb2FkRXJyb3IiLCJqc29uIiwiSlNPTiIsInBhcnNlIiwiZmlsZUlEIiwidXBsb2FkX2lkIiwiZmlsZVBhdGgiLCJtZXJnaW5nQ2hlY2tXb3JrZXIiLCJjYkFmdGVyQ29udmVydEZpbGUiLCJvbGRQYXRoIiwiZm9ybSIsInB1c2giLCJ0cmlnZ2VyIiwiY2JCZWZvcmVTZW5kRm9ybSIsInNldHRpbmdzIiwiY3VycmVudElkIiwiaWQiLCJfaXNOZXciLCJjYkFmdGVyU2VuZEZvcm0iLCJmb3JFYWNoIiwiZmlsZXBhdGgiLCJGaWxlc1JlbW92ZUF1ZGlvRmlsZSIsIm5ld1VybCIsImhpc3RvcnkiLCJwdXNoU3RhdGUiLCJldmVudCIsImRvY3VtZW50IiwiY3JlYXRlRXZlbnQiLCJpbml0RXZlbnQiLCJkaXNwYXRjaEV2ZW50IiwiY2F0ZWdvcnkiLCJ1cmwiLCJhcGlTZXR0aW5ncyIsImVuYWJsZWQiLCJhcGlPYmplY3QiLCJzYXZlTWV0aG9kIiwiYWZ0ZXJTdWJtaXRNb2RpZnlVcmwiLCJhZnRlclN1Ym1pdEluZGV4VXJsIiwiY2JBZnRlck1lcmdpbmciLCJyZWFkeSJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsbUJBQW1CLEdBQUc7QUFDeEI7QUFD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ZSBzeXN0ZW0gZm9yIHNtYWxsIGJ1c2luZXNzXG4gKiBDb3B5cmlnaHQgwqkgMjAxNy0yMDIzIEFsZXhleSBQb3J0bm92IGFuZCBOaWtvbGF5IEJla2V0b3ZcbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZnJlZSBzb2Z0d2FyZTogeW91IGNhbiByZWRpc3RyaWJ1dGUgaXQgYW5kL29yIG1vZGlmeVxuICogaXQgdW5kZXIgdGhlIHRlcm1zIG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhcyBwdWJsaXNoZWQgYnlcbiAqIHRoZSBGcmVlIFNvZnR3YXJlIEZvdW5kYXRpb247IGVpdGhlciB2ZXJzaW9uIDMgb2YgdGhlIExpY2Vuc2UsIG9yXG4gKiAoYXQgeW91ciBvcHRpb24pIGFueSBsYXRlciB2ZXJzaW9uLlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBkaXN0cmlidXRlZCBpbiB0aGUgaG9wZSB0aGF0IGl0IHdpbGwgYmUgdXNlZnVsLFxuICogYnV0IFdJVEhPVVQgQU5ZIFdBUlJBTlRZOyB3aXRob3V0IGV2ZW4gdGhlIGltcGxpZWQgd2FycmFudHkgb2ZcbiAqIE1FUkNIQU5UQUJJTElUWSBvciBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRS4gIFNlZSB0aGVcbiAqIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGZvciBtb3JlIGRldGFpbHMuXG4gKlxuICogWW91IHNob3VsZCBoYXZlIHJlY2VpdmVkIGEgY29weSBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYWxvbmcgd2l0aCB0aGlzIHByb2dyYW0uXG4gKiBJZiBub3QsIHNlZSA8aHR0cHM6Ly93d3cuZ251Lm9yZy9saWNlbnNlcy8+LlxuICovXG5cbi8qIGdsb2JhbCBnbG9iYWxSb290VXJsLCBnbG9iYWxUcmFuc2xhdGUsIEZvcm0sIFBieEFwaSwgc25kUGxheWVyLCBtZXJnaW5nQ2hlY2tXb3JrZXIsIFNvdW5kRmlsZXNBUEksIFVzZXJNZXNzYWdlLCBDb25maWcgKi9cblxuLyoqXG4gKiBTb3VuZCBmaWxlIG1vZGlmaWNhdGlvbiBtb2R1bGUgd2l0aCBSRVNUIEFQSSBpbnRlZ3JhdGlvblxuICogVGhpcyBtb2R1bGUgcmVwbGFjZXMgc291bmQtZmlsZS1tb2RpZnkuanMgd2l0aCBSRVNUIEFQSSBjYWxscyB3aGlsZSBwcmVzZXJ2aW5nXG4gKiBhbGwgZXhpc3RpbmcgZnVuY3Rpb25hbGl0eSBpbmNsdWRpbmcgZmlsZSB1cGxvYWQsIGF1ZGlvIHJlY29yZGluZywgYW5kIHBsYXllclxuICpcbiAqIEBtb2R1bGUgc291bmRGaWxlTW9kaWZ5UmVzdFxuICovXG5jb25zdCBzb3VuZEZpbGVNb2RpZnlSZXN0ID0ge1xuICAgIC8qKlxuICAgICAqIEFycmF5IHRvIHN0b3JlIHBhdGhzIG9mIGZpbGVzIHRvIGJlIGRlbGV0ZWQgYWZ0ZXIgc2F2ZVxuICAgICAqIEB0eXBlIHtBcnJheX1cbiAgICAgKi9cbiAgICB0cmFzaEJpbjogW10sXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgc291bmQgdXBsb2FkIGJ1dHRvbi5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzb3VuZFVwbG9hZEJ1dHRvbjogJCgnI3VwbG9hZC1zb3VuZC1maWxlJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgc291bmQgZmlsZSBpbnB1dC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRzb3VuZEZpbGVJbnB1dDogJCgnI2ZpbGUnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBzb3VuZCBmaWxlIG5hbWUgaW5wdXQuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkc291bmRGaWxlTmFtZTogJCgnI25hbWUnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBhdWRpbyBwbGF5ZXIuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkYXVkaW9QbGF5ZXI6ICQoJyNhdWRpby1wbGF5ZXInKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBzdWJtaXQgYnV0dG9uLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHN1Ym1pdEJ1dHRvbjogJCgnI3N1Ym1pdGJ1dHRvbicpLFxuXG4gICAgLyoqXG4gICAgICogVGhlIEJsb2IgVVJMIG9iamVjdC5cbiAgICAgKiBAdHlwZSB7QmxvYn1cbiAgICAgKi9cbiAgICBibG9iOiB3aW5kb3cuVVJMIHx8IHdpbmRvdy53ZWJraXRVUkwsXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybS5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICRmb3JtT2JqOiAkKCcjc291bmQtZmlsZS1mb3JtJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgZm9ybSBkcm9wZG93bnMuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkZHJvcERvd25zOiAkKCcjc291bmQtZmlsZS1mb3JtIC5kcm9wZG93bicpLFxuXG4gICAgLyoqXG4gICAgICogVmFsaWRhdGlvbiBydWxlcyBmb3IgdGhlIGZvcm0gZmllbGRzIGJlZm9yZSBzdWJtaXNzaW9uLlxuICAgICAqXG4gICAgICogQHR5cGUge29iamVjdH1cbiAgICAgKi9cbiAgICB2YWxpZGF0ZVJ1bGVzOiB7XG4gICAgICAgIG5hbWU6IHtcbiAgICAgICAgICAgIGlkZW50aWZpZXI6ICduYW1lJyxcbiAgICAgICAgICAgIHJ1bGVzOiBbXG4gICAgICAgICAgICAgICAge1xuICAgICAgICAgICAgICAgICAgICB0eXBlOiAnZW1wdHknLFxuICAgICAgICAgICAgICAgICAgICBwcm9tcHQ6IGdsb2JhbFRyYW5zbGF0ZS5zZl9WYWxpZGF0aW9uRmlsZU5hbWVJc0VtcHR5LFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgICBwYXRoOiB7XG4gICAgICAgICAgICBpZGVudGlmaWVyOiAncGF0aCcsXG4gICAgICAgICAgICBydWxlczogW1xuICAgICAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgICAgICAgdHlwZTogJ2VtcHR5JyxcbiAgICAgICAgICAgICAgICAgICAgcHJvbXB0OiBnbG9iYWxUcmFuc2xhdGUuc2ZfVmFsaWRhdGlvbkZpbGVOb3RTZWxlY3RlZCxcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgXSxcbiAgICAgICAgfSxcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIHNvdW5kIGZpbGUgbW9kaWZpY2F0aW9uIGZ1bmN0aW9uYWxpdHkuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBkcm9wZG93bnNcbiAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZHJvcERvd25zLmRyb3Bkb3duKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBMb2FkIGZvcm0gZGF0YSBmcm9tIFJFU1QgQVBJXG4gICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QubG9hZEZvcm1EYXRhKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBJbml0aWFsaXplIGZvcm0gdmFsaWRhdGlvbiBhbmQgc3VibWlzc2lvblxuICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LmluaXRpYWxpemVGb3JtKCk7XG5cbiAgICAgICAgLy8gSW5pdGlhbGl6ZSBmaWxlIHVwbG9hZCBidXR0b25cbiAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kc291bmRVcGxvYWRCdXR0b24ub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgICQoJ2lucHV0OmZpbGUnLCAkKGUudGFyZ2V0KS5wYXJlbnRzKCkpLmNsaWNrKCk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIC8vIEhhbmRsZSBmaWxlIHNlbGVjdGlvblxuICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRzb3VuZEZpbGVJbnB1dC5vbignY2hhbmdlJywgKGUpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGZpbGUgPSBlLnRhcmdldC5maWxlc1swXTtcbiAgICAgICAgICAgIGlmIChmaWxlID09PSB1bmRlZmluZWQpIHJldHVybjtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBkYXRlIG5hbWUgZmllbGQgd2l0aCBmaWxlbmFtZSB3aXRob3V0IGV4dGVuc2lvblxuICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kc291bmRGaWxlTmFtZS52YWwoZmlsZS5uYW1lLnJlcGxhY2UoL1xcLlteLy5dKyQvLCAnJykpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBDcmVhdGUgYmxvYiBVUkwgZm9yIHByZXZpZXdcbiAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuYmxvYiA9IHdpbmRvdy5VUkwgfHwgd2luZG93LndlYmtpdFVSTDtcbiAgICAgICAgICAgIGNvbnN0IGZpbGVVUkwgPSBzb3VuZEZpbGVNb2RpZnlSZXN0LmJsb2IuY3JlYXRlT2JqZWN0VVJMKGZpbGUpO1xuICAgICAgICAgICAgc25kUGxheWVyLlVwZGF0ZVNvdXJjZShmaWxlVVJMKTtcbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVXBsb2FkIGZpbGUgdXNpbmcgUGJ4QXBpICh0aGlzIHJlbWFpbnMgdGhlIHNhbWUgYXMgaXQgdXNlcyByZXN1bWFibGUuanMpXG4gICAgICAgICAgICBQYnhBcGkuRmlsZXNVcGxvYWRGaWxlKGZpbGUsIHNvdW5kRmlsZU1vZGlmeVJlc3QuY2JVcGxvYWRSZXN1bWFibGUpO1xuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIC8vIExpc3RlbiBmb3IgZGF0YSBjaGFuZ2VzIHRvIGNsZWFyIGNhY2hlXG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdDb25maWdEYXRhQ2hhbmdlZCcsIHNvdW5kRmlsZU1vZGlmeVJlc3QuY2JPbkRhdGFDaGFuZ2VkKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTG9hZCBmb3JtIGRhdGEgZnJvbSBSRVNUIEFQSVxuICAgICAqL1xuICAgIGxvYWRGb3JtRGF0YSgpIHtcbiAgICAgICAgY29uc3QgcmVjb3JkSWQgPSBzb3VuZEZpbGVNb2RpZnlSZXN0LmdldFJlY29yZElkKCk7XG4gICAgICAgIFxuICAgICAgICAvLyBTaG93IGxvYWRpbmcgc3RhdGVcbiAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5hZGRDbGFzcygnbG9hZGluZycpO1xuICAgICAgICBcbiAgICAgICAgU291bmRGaWxlc0FQSS5nZXRSZWNvcmQocmVjb3JkSWQsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlY29yZElkICYmIHJlY29yZElkICE9PSAnbmV3Jykge1xuICAgICAgICAgICAgICAgIC8vIFNob3cgZXJyb3IgaWYgdHJ5aW5nIHRvIGxvYWQgbm9uLWV4aXN0ZW50IHJlY29yZFxuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dFcnJvcihyZXNwb25zZS5tZXNzYWdlcz8uZXJyb3IgfHwgJ0ZhaWxlZCB0byBsb2FkIHNvdW5kIGZpbGUgZGF0YScpO1xuICAgICAgICAgICAgICAgIC8vIFJlZGlyZWN0IHRvIGluZGV4IGFmdGVyIGRlbGF5XG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gYCR7Z2xvYmFsUm9vdFVybH1zb3VuZC1maWxlcy9pbmRleGA7XG4gICAgICAgICAgICAgICAgfSwgMzAwMCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXQgcmVjb3JkIElEIGZyb20gaGlkZGVuIGlucHV0IGZpZWxkXG4gICAgICogQHJldHVybnMge3N0cmluZ30gUmVjb3JkIElEIG9yIGVtcHR5IHN0cmluZyBmb3IgbmV3IHJlY29yZHNcbiAgICAgKi9cbiAgICBnZXRSZWNvcmRJZCgpIHtcbiAgICAgICAgLy8gR2V0IHJlY29yZCBJRCBmcm9tIGhpZGRlbiBpbnB1dCBzZXQgYnkgY29udHJvbGxlclxuICAgICAgICBjb25zdCByZWNvcmRJZFZhbHVlID0gJCgnI2lkJykudmFsKCk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgaXQncyBhIGNhdGVnb3J5IG5hbWUgKGN1c3RvbS9tb2gpIG9yIGFjdHVhbCBJRFxuICAgICAgICBpZiAocmVjb3JkSWRWYWx1ZSA9PT0gJ2N1c3RvbScgfHwgcmVjb3JkSWRWYWx1ZSA9PT0gJ21vaCcpIHtcbiAgICAgICAgICAgIC8vIFRoaXMgaXMgYSBuZXcgcmVjb3JkIHdpdGggY2F0ZWdvcnkgcHJlc2V0XG4gICAgICAgICAgICByZXR1cm4gJyc7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gcmVjb3JkSWRWYWx1ZSB8fCAnJztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUG9wdWxhdGUgZm9ybSB3aXRoIGRhdGFcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gZGF0YSAtIFNvdW5kIGZpbGUgZGF0YSBmcm9tIEFQSVxuICAgICAqL1xuICAgIHBvcHVsYXRlRm9ybShkYXRhKSB7XG4gICAgICAgIC8vIFVzZSB1bmlmaWVkIHNpbGVudCBwb3B1bGF0aW9uIGFwcHJvYWNoXG4gICAgICAgIEZvcm0ucG9wdWxhdGVGb3JtU2lsZW50bHkoZGF0YSwge1xuICAgICAgICAgICAgYWZ0ZXJQb3B1bGF0ZTogKGZvcm1EYXRhKSA9PiB7XG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIGF1ZGlvIHBsYXllciBpZiBwYXRoIGV4aXN0c1xuICAgICAgICAgICAgICAgIGlmIChmb3JtRGF0YS5wYXRoKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIFVzZSBuZXcgc291bmQtZmlsZXMgZW5kcG9pbnQgZm9yIE1PSC9JVlIvc3lzdGVtIHNvdW5kc1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBhdWRpb1VybCA9IGAvcGJ4Y29yZS9hcGkvdjMvc291bmQtZmlsZXM6cGxheWJhY2s/dmlldz0ke2Zvcm1EYXRhLnBhdGh9YDtcbiAgICAgICAgICAgICAgICAgICAgc25kUGxheWVyLlVwZGF0ZVNvdXJjZShhdWRpb1VybCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIFxuICAgICAgICAgICAgICAgIC8vIFNhdmUgaW5pdGlhbCB2YWx1ZXMgZm9yIGRpcnJpdHkgY2hlY2tpbmdcbiAgICAgICAgICAgICAgICBpZiAoRm9ybS5lbmFibGVEaXJyaXR5KSB7XG4gICAgICAgICAgICAgICAgICAgIEZvcm0uc2F2ZUluaXRpYWxWYWx1ZXMoKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDbGVhcnMgY2FjaGVzIGlmIGRhdGEgY2hhbmdlcy5cbiAgICAgKi9cbiAgICBjYk9uRGF0YUNoYW5nZWQoKSB7XG4gICAgICAgIC8vIENsZWFyIFJFU1QgQVBJIGNhY2hlIGlmIG5lZWRlZCAtIGhhbmRsZWQgYnkgQVBJIGxheWVyXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIGZvciBmaWxlIHVwbG9hZCB3aXRoIGNodW5rcyBhbmQgbWVyZ2UuXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGFjdGlvbiAtIFRoZSBhY3Rpb24gcGVyZm9ybWVkIGR1cmluZyB0aGUgdXBsb2FkLlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBwYXJhbXMgLSBBZGRpdGlvbmFsIHBhcmFtZXRlcnMgcmVsYXRlZCB0byB0aGUgdXBsb2FkLlxuICAgICAqL1xuICAgIGNiVXBsb2FkUmVzdW1hYmxlKGFjdGlvbiwgcGFyYW1zKSB7XG4gICAgICAgIHN3aXRjaCAoYWN0aW9uKSB7XG4gICAgICAgICAgICBjYXNlICdmaWxlU3VjY2Vzcyc6XG4gICAgICAgICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSBQYnhBcGkudHJ5UGFyc2VKU09OKHBhcmFtcy5yZXNwb25zZSk7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlICE9PSBmYWxzZSAmJiByZXNwb25zZS5kYXRhLmZpbGVuYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kc291bmRGaWxlTmFtZS52YWwocGFyYW1zLmZpbGUuZmlsZU5hbWUpO1xuICAgICAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LmNoZWNrU3RhdHVzRmlsZU1lcmdpbmcocGFyYW1zLnJlc3BvbnNlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcocGFyYW1zLCBnbG9iYWxUcmFuc2xhdGUuc2ZfVXBsb2FkRXJyb3IpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJ3VwbG9hZFN0YXJ0JzpcbiAgICAgICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLmFkZENsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICdlcnJvcic6XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhwYXJhbXMsIGdsb2JhbFRyYW5zbGF0ZS5zZl9VcGxvYWRFcnJvcik7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENoZWNrcyB0aGUgc3RhdHVzIG9mIGZpbGUgbWVyZ2luZy5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcmVzcG9uc2UgLSBUaGUgcmVzcG9uc2UgZnJvbSB0aGUgZmlsZSBtZXJnaW5nIHN0YXR1cyBmdW5jdGlvbi5cbiAgICAgKi9cbiAgICBjaGVja1N0YXR1c0ZpbGVNZXJnaW5nKHJlc3BvbnNlKSB7XG4gICAgICAgIGlmIChyZXNwb25zZSA9PT0gdW5kZWZpbmVkIHx8IFBieEFwaS50cnlQYXJzZUpTT04ocmVzcG9uc2UpID09PSBmYWxzZSkge1xuICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKGAke2dsb2JhbFRyYW5zbGF0ZS5zZl9VcGxvYWRFcnJvcn1gKTtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBqc29uID0gSlNPTi5wYXJzZShyZXNwb25zZSk7XG4gICAgICAgIGlmIChqc29uID09PSB1bmRlZmluZWQgfHwganNvbi5kYXRhID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhgJHtnbG9iYWxUcmFuc2xhdGUuc2ZfVXBsb2FkRXJyb3J9YCk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZmlsZUlEID0ganNvbi5kYXRhLnVwbG9hZF9pZDtcbiAgICAgICAgY29uc3QgZmlsZVBhdGggPSBqc29uLmRhdGEuZmlsZW5hbWU7XG4gICAgICAgIG1lcmdpbmdDaGVja1dvcmtlci5pbml0aWFsaXplKGZpbGVJRCwgZmlsZVBhdGgpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYWxsYmFjayBmdW5jdGlvbiBhZnRlciB0aGUgZmlsZSBpcyBjb252ZXJ0ZWQgdG8gTVAzIGZvcm1hdC5cbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZmlsZW5hbWUgLSBUaGUgZmlsZW5hbWUgb2YgdGhlIGNvbnZlcnRlZCBmaWxlLlxuICAgICAqL1xuICAgIGNiQWZ0ZXJDb252ZXJ0RmlsZShmaWxlbmFtZSkge1xuICAgICAgICBpZiAoZmlsZW5hbWUgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICBVc2VyTWVzc2FnZS5zaG93TXVsdGlTdHJpbmcoYCR7Z2xvYmFsVHJhbnNsYXRlLnNmX1VwbG9hZEVycm9yfWApO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgLy8gQWRkIG9sZCBmaWxlIHRvIHRyYXNoIGJpbiBmb3IgZGVsZXRpb24gYWZ0ZXIgc2F2ZVxuICAgICAgICAgICAgY29uc3Qgb2xkUGF0aCA9IHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnZ2V0IHZhbHVlJywgJ3BhdGgnKTtcbiAgICAgICAgICAgIGlmIChvbGRQYXRoKSB7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC50cmFzaEJpbi5wdXNoKG9sZFBhdGgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgZm9ybSB3aXRoIG5ldyBmaWxlIHBhdGhcbiAgICAgICAgICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuJGZvcm1PYmouZm9ybSgnc2V0IHZhbHVlJywgJ3BhdGgnLCBmaWxlbmFtZSk7XG4gICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRzb3VuZEZpbGVOYW1lLnRyaWdnZXIoJ2NoYW5nZScpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBVcGRhdGUgcGxheWVyIHdpdGggbmV3IGZpbGUgdXNpbmcgc291bmQtZmlsZXMgZW5kcG9pbnRcbiAgICAgICAgICAgIHNuZFBsYXllci5VcGRhdGVTb3VyY2UoYC9wYnhjb3JlL2FwaS92My9zb3VuZC1maWxlczpwbGF5YmFjaz92aWV3PSR7ZmlsZW5hbWV9YCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFJlbW92ZSBsb2FkaW5nIHN0YXRlc1xuICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC4kc3VibWl0QnV0dG9uLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLnJlbW92ZUNsYXNzKCdsb2FkaW5nJyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdG8gYmUgY2FsbGVkIGJlZm9yZSB0aGUgZm9ybSBpcyBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSBzZXR0aW5ncyAtIFRoZSBjdXJyZW50IHNldHRpbmdzIG9mIHRoZSBmb3JtLlxuICAgICAqIEByZXR1cm5zIHtPYmplY3R9IC0gVGhlIHVwZGF0ZWQgc2V0dGluZ3Mgb2YgdGhlIGZvcm0uXG4gICAgICovXG4gICAgY2JCZWZvcmVTZW5kRm9ybShzZXR0aW5ncykge1xuICAgICAgICBjb25zdCByZXN1bHQgPSBzZXR0aW5ncztcbiAgICAgICAgcmVzdWx0LmRhdGEgPSBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZXMnKTtcblxuICAgICAgICAvLyBBZGQgZmxhZyB0byBpbmRpY2F0ZSBpZiB0aGlzIGlzIGEgbmV3IHJlY29yZCBmb3IgcHJvcGVyIEhUVFAgbWV0aG9kIHNlbGVjdGlvblxuICAgICAgICBjb25zdCBjdXJyZW50SWQgPSByZXN1bHQuZGF0YS5pZDtcbiAgICAgICAgaWYgKCFjdXJyZW50SWQgfHwgY3VycmVudElkID09PSAnJyB8fCBjdXJyZW50SWQgPT09ICdjdXN0b20nIHx8IGN1cnJlbnRJZCA9PT0gJ21vaCcpIHtcbiAgICAgICAgICAgIHJlc3VsdC5kYXRhLl9pc05ldyA9IHRydWU7XG4gICAgICAgICAgICAvLyBDbGVhciB0aGUgSUQgZm9yIG5ldyByZWNvcmRzXG4gICAgICAgICAgICBpZiAoY3VycmVudElkID09PSAnY3VzdG9tJyB8fCBjdXJyZW50SWQgPT09ICdtb2gnKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LmRhdGEuaWQgPSAnJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGJlIGNhbGxlZCBhZnRlciB0aGUgZm9ybSBoYXMgYmVlbiBzZW50LlxuICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNwb25zZSAtIFRoZSByZXNwb25zZSBmcm9tIHRoZSBzZXJ2ZXIgYWZ0ZXIgdGhlIGZvcm0gaXMgc2VudFxuICAgICAqL1xuICAgIGNiQWZ0ZXJTZW5kRm9ybShyZXNwb25zZSkge1xuICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0KSB7XG4gICAgICAgICAgICAvLyBEZWxldGUgb2xkIGZpbGVzIGZyb20gdHJhc2ggYmluXG4gICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LnRyYXNoQmluLmZvckVhY2goKGZpbGVwYXRoKSA9PiB7XG4gICAgICAgICAgICAgICAgaWYgKGZpbGVwYXRoKSBQYnhBcGkuRmlsZXNSZW1vdmVBdWRpb0ZpbGUoZmlsZXBhdGgpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBzb3VuZEZpbGVNb2RpZnlSZXN0LnRyYXNoQmluID0gW107XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIFVwZGF0ZSBmb3JtIHdpdGggbmV3IGRhdGEgaWYgcHJvdmlkZWRcbiAgICAgICAgICAgIGlmIChyZXNwb25zZS5kYXRhKSB7XG4gICAgICAgICAgICAgICAgc291bmRGaWxlTW9kaWZ5UmVzdC5wb3B1bGF0ZUZvcm0ocmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgICAgLy8gVXBkYXRlIFVSTCBmb3IgbmV3IHJlY29yZHNcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50SWQgPSBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqLmZvcm0oJ2dldCB2YWx1ZScsICdpZCcpO1xuICAgICAgICAgICAgICAgIGlmICghY3VycmVudElkICYmIHJlc3BvbnNlLmRhdGEuaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbmV3VXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWYucmVwbGFjZSgvbW9kaWZ5XFwvKGN1c3RvbXxtb2gpPyQvLCBgbW9kaWZ5LyR7cmVzcG9uc2UuZGF0YS5pZH1gKTtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlKG51bGwsICcnLCBuZXdVcmwpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVHJpZ2dlciBjb25maWcgY2hhbmdlZCBldmVudCB0byByZWZyZXNoIGxpc3RzXG4gICAgICAgICAgICBjb25zdCBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuICAgICAgICAgICAgZXZlbnQuaW5pdEV2ZW50KCdDb25maWdEYXRhQ2hhbmdlZCcsIGZhbHNlLCB0cnVlKTtcbiAgICAgICAgICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWFsaXplIHRoZSBmb3JtIHdpdGggY3VzdG9tIHNldHRpbmdzXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUZvcm0oKSB7XG4gICAgICAgIGNvbnN0IGNhdGVnb3J5ID0gc291bmRGaWxlTW9kaWZ5UmVzdC4kZm9ybU9iai5mb3JtKCdnZXQgdmFsdWUnLCAnY2F0ZWdvcnknKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyZSBGb3JtLmpzXG4gICAgICAgIEZvcm0uJGZvcm1PYmogPSBzb3VuZEZpbGVNb2RpZnlSZXN0LiRmb3JtT2JqO1xuICAgICAgICBGb3JtLnVybCA9ICcjJzsgLy8gTm90IHVzZWQgd2l0aCBSRVNUIEFQSVxuICAgICAgICBGb3JtLnZhbGlkYXRlUnVsZXMgPSBzb3VuZEZpbGVNb2RpZnlSZXN0LnZhbGlkYXRlUnVsZXM7XG4gICAgICAgIEZvcm0uY2JCZWZvcmVTZW5kRm9ybSA9IHNvdW5kRmlsZU1vZGlmeVJlc3QuY2JCZWZvcmVTZW5kRm9ybTtcbiAgICAgICAgRm9ybS5jYkFmdGVyU2VuZEZvcm0gPSBzb3VuZEZpbGVNb2RpZnlSZXN0LmNiQWZ0ZXJTZW5kRm9ybTtcbiAgICAgICAgXG4gICAgICAgIC8vIENvbmZpZ3VyZSBSRVNUIEFQSSBpbnRlZ3JhdGlvblxuICAgICAgICBGb3JtLmFwaVNldHRpbmdzID0ge1xuICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgIGFwaU9iamVjdDogU291bmRGaWxlc0FQSSxcbiAgICAgICAgICAgIHNhdmVNZXRob2Q6ICdzYXZlUmVjb3JkJ1xuICAgICAgICB9O1xuICAgICAgICBcbiAgICAgICAgLy8gQ29uZmlndXJlIHJlZGlyZWN0IFVSTHNcbiAgICAgICAgRm9ybS5hZnRlclN1Ym1pdE1vZGlmeVVybCA9IGAke2dsb2JhbFJvb3RVcmx9c291bmQtZmlsZXMvbW9kaWZ5L2A7XG4gICAgICAgIEZvcm0uYWZ0ZXJTdWJtaXRJbmRleFVybCA9IGAke2dsb2JhbFJvb3RVcmx9c291bmQtZmlsZXMvaW5kZXgvIy8ke2NhdGVnb3J5fWA7XG4gICAgICAgIFxuICAgICAgICBGb3JtLmluaXRpYWxpemUoKTtcbiAgICB9LFxufTtcblxuLy8gSW5pdGlhbGl6ZSBtZXJnaW5nQ2hlY2tXb3JrZXIgY2FsbGJhY2tcbmlmICh0eXBlb2YgbWVyZ2luZ0NoZWNrV29ya2VyICE9PSAndW5kZWZpbmVkJykge1xuICAgIG1lcmdpbmdDaGVja1dvcmtlci5jYkFmdGVyTWVyZ2luZyA9IHNvdW5kRmlsZU1vZGlmeVJlc3QuY2JBZnRlckNvbnZlcnRGaWxlO1xufVxuXG4vLyBXaGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSwgaW5pdGlhbGl6ZSB0aGUgc291bmQgZmlsZSBtb2RpZnkgZm9ybVxuJChkb2N1bWVudCkucmVhZHkoKCkgPT4ge1xuICAgIHNvdW5kRmlsZU1vZGlmeVJlc3QuaW5pdGlhbGl6ZSgpO1xufSk7Il19