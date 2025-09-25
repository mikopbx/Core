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

        // Initialize file upload using FilesAPI.attachToBtn for unified behavior
        FilesAPI.attachToBtn('upload-sound-file', ['wav', 'mp3', 'ogg', 'm4a', 'aac'], (action, params) => {
            switch (action) {
                case 'fileAdded':
                    if (params.file) {
                        // Update name field with filename without extension
                        soundFileModifyRest.$soundFileName.val(params.file.name.replace(/\.[^/.]+$/, ''));

                        // Create blob URL for preview
                        soundFileModifyRest.blob = window.URL || window.webkitURL;
                        const fileURL = soundFileModifyRest.blob.createObjectURL(params.file.file);
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
     * Get record ID from hidden input field
     * @returns {string} Record ID or empty string for new records
     */
    getRecordId() {
        // Get record ID from hidden input set by controller
        const recordIdValue = $('#id').val();

        // Check if it's a category name (custom/moh) or actual ID
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
    populateForm(data) {
        // Use unified silent population approach
        Form.populateFormSilently(data, {
            afterPopulate: (formData) => {
                // Update audio player if path exists
                if (formData.path) {
                    // Use new sound-files endpoint for MOH/IVR/system sounds
                    const audioUrl = `/pbxcore/api/v3/sound-files:playback?view=${formData.path}`;
                    sndPlayer.UpdateSource(audioUrl);
                }
                
                // Save initial values for dirrity checking
                if (Form.enableDirrity) {
                    Form.saveInitialValues();
                }
            }
        });
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

        const uploadId = json.data.upload_id;
        const filePath = json.data.filename;

        // NEW: Subscribe to EventBus instead of using polling worker
        FileUploadEventHandler.subscribe(uploadId, {
            onMergeStarted: (data) => {
                soundFileModifyRest.$submitButton.addClass('loading');
                soundFileModifyRest.$formObj.addClass('loading');
            },

            onMergeProgress: (data) => {
                // Update progress indicator if needed
                console.log(`Sound file merge progress: ${data.progress}%`);
            },

            onMergeComplete: (data) => {
                soundFileModifyRest.$submitButton.removeClass('loading');
                soundFileModifyRest.$formObj.removeClass('loading');
                // Perform conversion after merge - use the filePath from the response
                const category = soundFileModifyRest.$formObj.form('get value', 'category');
                SystemAPI.convertAudioFile({filename: filePath, category: category}, soundFileModifyRest.cbAfterConvertFile);
            },

            onError: (data) => {
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
            
            // Update player with new file using sound-files endpoint
            sndPlayer.UpdateSource(`/pbxcore/api/v3/sound-files:playback?view=${filename}`);
            
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

        // Add flag to indicate if this is a new record for proper HTTP method selection
        const currentId = result.data.id;
        if (!currentId || currentId === '' || currentId === 'custom' || currentId === 'moh') {
            result.data._isNew = true;
            // Clear the ID for new records
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
    cbAfterSendForm(response) {
        if (response.result) {
            // Delete old files from trash bin
            soundFileModifyRest.trashBin.forEach((filepath) => {
                if (filepath) FilesAPI.removeAudioFile(filepath, () => {});
            });
            soundFileModifyRest.trashBin = [];

            // Update form with new data if provided
            if (response.data) {
                soundFileModifyRest.populateForm(response.data);
            }

            // Form.js will handle all redirect logic based on submitMode

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

// Note: mergingCheckWorker.cbAfterMerging is now handled via EventBus in checkStatusFileMerging method

// When the document is ready, initialize the sound file modify form
$(document).ready(() => {
    soundFileModifyRest.initialize();
});