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
const soundFileModifyRest = {
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
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.sf_ValidationFileNameIsEmpty,
                },
            ],
        },
        path: {
            identifier: 'path',
            rules: [
                {
                    type: 'empty',
                    prompt: globalTranslate.sf_ValidationFileNotSelected,
                },
            ],
        },
    },

    /**
     * Initializes the sound file modification functionality.
     */
    initialize() {
        // Initialize dropdowns
        soundFileModifyRest.$dropDowns.dropdown();
        
        // Load form data from REST API
        soundFileModifyRest.loadFormData();
        
        // Initialize form validation and submission
        soundFileModifyRest.initializeForm();

        // Initialize file upload button
        soundFileModifyRest.$soundUploadButton.on('click', (e) => {
            e.preventDefault();
            $('input:file', $(e.target).parents()).click();
        });

        // Handle file selection
        soundFileModifyRest.$soundFileInput.on('change', (e) => {
            const file = e.target.files[0];
            if (file === undefined) return;
            
            // Update name field with filename without extension
            soundFileModifyRest.$soundFileName.val(file.name.replace(/\.[^/.]+$/, ''));
            
            // Create blob URL for preview
            soundFileModifyRest.blob = window.URL || window.webkitURL;
            const fileURL = soundFileModifyRest.blob.createObjectURL(file);
            sndPlayer.UpdateSource(fileURL);
            
            // Upload file using PbxApi (this remains the same as it uses resumable.js)
            PbxApi.FilesUploadFile(file, soundFileModifyRest.cbUploadResumable);
        });
        
        // Listen for data changes to clear cache
        window.addEventListener('ConfigDataChanged', soundFileModifyRest.cbOnDataChanged);
    },

    /**
     * Load form data from REST API
     */
    loadFormData() {
        const recordId = soundFileModifyRest.getRecordId();
        
        // Show loading state
        soundFileModifyRest.$formObj.addClass('loading');
        
        SoundFilesAPI.getRecord(recordId, (response) => {
            soundFileModifyRest.$formObj.removeClass('loading');
            
            if (response.result) {
                soundFileModifyRest.populateForm(response.data);
            } else if (recordId && recordId !== 'new') {
                // Show error if trying to load non-existent record
                UserMessage.showError(response.messages?.error || 'Failed to load sound file data');
                // Redirect to index after delay
                setTimeout(() => {
                    window.location.href = `${globalRootUrl}sound-files/index`;
                }, 3000);
            }
        });
    },

    /**
     * Get record ID from URL
     * @returns {string} Record ID or empty string for new records
     */
    getRecordId() {
        const urlParts = window.location.pathname.split('/');
        const modifyIndex = urlParts.indexOf('modify');
        
        if (modifyIndex !== -1 && urlParts[modifyIndex + 1]) {
            const potentialId = urlParts[modifyIndex + 1];
            // Check if it's a numeric ID or category (custom/moh)
            if (!isNaN(potentialId)) {
                return potentialId;
            }
        }
        return '';
    },

    /**
     * Populate form with data
     * @param {object} data - Sound file data from API
     */
    populateForm(data) {
        // Set form values
        soundFileModifyRest.$formObj.form('set values', data);
        
        // Update audio player if path exists
        if (data.path) {
            const audioUrl = `/pbxcore/api/cdr/v2/playback?view=${data.path}`;
            sndPlayer.UpdateSource(audioUrl);
        }
        
        // Save initial values for dirrity checking
        if (Form.enableDirrity) {
            Form.saveInitialValues();
        }
    },

    /**
     * Clears caches if data changes.
     */
    cbOnDataChanged() {
        // Clear REST API cache if needed - handled by API layer
    },

    /**
     * Callback function for file upload with chunks and merge.
     * @param {string} action - The action performed during the upload.
     * @param {Object} params - Additional parameters related to the upload.
     */
    cbUploadResumable(action, params) {
        switch (action) {
            case 'fileSuccess':
                const response = PbxApi.tryParseJSON(params.response);
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
    checkStatusFileMerging(response) {
        if (response === undefined || PbxApi.tryParseJSON(response) === false) {
            UserMessage.showMultiString(`${globalTranslate.sf_UploadError}`);
            return;
        }
        const json = JSON.parse(response);
        if (json === undefined || json.data === undefined) {
            UserMessage.showMultiString(`${globalTranslate.sf_UploadError}`);
            return;
        }
        const fileID = json.data.upload_id;
        const filePath = json.data.filename;
        mergingCheckWorker.initialize(fileID, filePath);
    },

    /**
     * Callback function after the file is converted to MP3 format.
     * @param {string} filename - The filename of the converted file.
     */
    cbAfterConvertFile(filename) {
        if (filename === false) {
            UserMessage.showMultiString(`${globalTranslate.sf_UploadError}`);
        } else {
            // Add old file to trash bin for deletion after save
            const oldPath = soundFileModifyRest.$formObj.form('get value', 'path');
            if (oldPath) {
                soundFileModifyRest.trashBin.push(oldPath);
            }
            
            // Update form with new file path
            soundFileModifyRest.$formObj.form('set value', 'path', filename);
            soundFileModifyRest.$soundFileName.trigger('change');
            
            // Update player with new file
            sndPlayer.UpdateSource(`/pbxcore/api/cdr/v2/playback?view=${filename}`);
            
            // Remove loading states
            soundFileModifyRest.$submitButton.removeClass('loading');
            soundFileModifyRest.$formObj.removeClass('loading');
        }
    },

    /**
     * Callback function to be called before the form is sent.
     * @param {Object} settings - The current settings of the form.
     * @returns {Object} - The updated settings of the form.
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        result.data = soundFileModifyRest.$formObj.form('get values');
        return result;
    },

    /**
     * Callback function to be called after the form has been sent.
     * @param {Object} response - The response from the server after the form is sent
     */
    cbAfterSendForm(response) {
        if (response.result) {
            // Delete old files from trash bin
            soundFileModifyRest.trashBin.forEach((filepath) => {
                if (filepath) PbxApi.FilesRemoveAudioFile(filepath);
            });
            soundFileModifyRest.trashBin = [];
            
            // Update form with new data if provided
            if (response.data) {
                soundFileModifyRest.populateForm(response.data);
                
                // Update URL for new records
                const currentId = soundFileModifyRest.$formObj.form('get value', 'id');
                if (!currentId && response.data.id) {
                    const newUrl = window.location.href.replace(/modify\/(custom|moh)?$/, `modify/${response.data.id}`);
                    window.history.pushState(null, '', newUrl);
                }
            }
            
            // Trigger config changed event to refresh lists
            const event = document.createEvent('Event');
            event.initEvent('ConfigDataChanged', false, true);
            window.dispatchEvent(event);
        }
    },

    /**
     * Initialize the form with custom settings
     */
    initializeForm() {
        const category = soundFileModifyRest.$formObj.form('get value', 'category');
        
        // Configure Form.js
        Form.$formObj = soundFileModifyRest.$formObj;
        Form.url = '#'; // Not used with REST API
        Form.validateRules = soundFileModifyRest.validateRules;
        Form.cbBeforeSendForm = soundFileModifyRest.cbBeforeSendForm;
        Form.cbAfterSendForm = soundFileModifyRest.cbAfterSendForm;
        
        // Configure REST API integration
        Form.apiSettings = {
            enabled: true,
            apiObject: SoundFilesAPI,
            saveMethod: 'saveRecord'
        };
        
        // Configure redirect URLs
        Form.afterSubmitModifyUrl = `${globalRootUrl}sound-files/modify/`;
        Form.afterSubmitIndexUrl = `${globalRootUrl}sound-files/index/#/${category}`;
        
        Form.initialize();
    },
};

// Initialize mergingCheckWorker callback
if (typeof mergingCheckWorker !== 'undefined') {
    mergingCheckWorker.cbAfterMerging = soundFileModifyRest.cbAfterConvertFile;
}

// When the document is ready, initialize the sound file modify form
$(document).ready(() => {
    soundFileModifyRest.initialize();
});