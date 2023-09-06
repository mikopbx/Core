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

/* global globalRootUrl, globalTranslate, Form, PbxApi, sndPlayer, mergingCheckWorker */

/**
 * Object representing sound file modification functionality.
 *
 * @module soundFileModify
 */
const soundFileModify = {
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
        description: {
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
        soundFileModify.$dropDowns.dropdown();
        soundFileModify.initializeForm();

        soundFileModify.$soundUploadButton.on('click', (e) => {
            e.preventDefault();
            $('input:file', $(e.target).parents()).click();
        });

        soundFileModify.$soundFileInput.on('change', (e) => {
            const file = e.target.files[0];
            if (file === undefined) return;
            soundFileModify.$soundFileName.val(file.name.replace(/\.[^/.]+$/, ''));
            soundFileModify.blob = window.URL || window.webkitURL;
            const fileURL = soundFileModify.blob.createObjectURL(file);
            sndPlayer.UpdateSource(fileURL);
            PbxApi.FilesUploadFile(file, soundFileModify.cbUploadResumable);

        });
        window.addEventListener('ConfigDataChanged', soundFileModify.cbOnDataChanged);
    },

    /**
     * Clears caches if data changes.
     */
    cbOnDataChanged() {
        sessionStorage.removeItem(`${globalRootUrl}sound-files/getSoundFiles/custom`);
        sessionStorage.removeItem(`${globalRootUrl}sound-files/getSoundFiles/moh`);
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
                    soundFileModify.$soundFileName.val(params.file.fileName);
                    soundFileModify.checkStatusFileMerging(params.response);
                } else {
                    UserMessage.showMultiString(params, globalTranslate.sf_UploadError);
                }

                break;
            case 'uploadStart':
                soundFileModify.$formObj.addClass('loading');
                break;
            case 'error':
                soundFileModify.$submitButton.removeClass('loading');
                soundFileModify.$formObj.removeClass('loading');
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
            soundFileModify.trashBin.push(soundFileModify.$formObj.form('get value', 'path'));
            soundFileModify.$formObj.form('set value', 'path', filename);
            soundFileModify.$soundFileName.trigger('change');
            sndPlayer.UpdateSource(`/pbxcore/api/cdr/v2/playback?view=${filename}`);
            soundFileModify.$submitButton.removeClass('loading');
            soundFileModify.$formObj.removeClass('loading');

        }
    },

    /**
     * Callback function to be called before the form is sent.
     * @param {Object} settings - The current settings of the form.
     * @returns {Object} - The updated settings of the form.
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        result.data = soundFileModify.$formObj.form('get values');
        return result;
    },

    /**
     * Callback function to be called after the form has been sent.
     * @param {Object} response - The response from the server after the form is sent
     */
    cbAfterSendForm(response) {
        soundFileModify.trashBin.forEach((filepath) => {
            if (filepath) PbxApi.FilesRemoveAudioFile(filepath);
        });
        const event = document.createEvent('Event');
        event.initEvent('ConfigDataChanged', false, true);
        window.dispatchEvent(event);
    },

    /**
     * Initialize the form with custom settings
     */
    initializeForm() {
        const category = soundFileModify.$formObj.form('get value', 'category');
        Form.$formObj = soundFileModify.$formObj;
        Form.url = `${globalRootUrl}sound-files/save`; // Form submission URL
        Form.validateRules = soundFileModify.validateRules; // Form validation rules
        Form.cbBeforeSendForm = soundFileModify.cbBeforeSendForm; // Callback before form is sent
        Form.cbAfterSendForm = soundFileModify.cbAfterSendForm; // Callback after form is sent
        Form.afterSubmitModifyUrl = `${globalRootUrl}sound-files/modify/${category}`;
        Form.afterSubmitIndexUrl = `${globalRootUrl}sound-files/index/#/${category}`;
        Form.initialize();
    },
};

// When the document is ready, initialize the sound file modify form
$(document).ready(() => {
    soundFileModify.initialize();
});
