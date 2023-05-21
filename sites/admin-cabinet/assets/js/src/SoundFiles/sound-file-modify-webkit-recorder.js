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

/* global MediaStreamRecorder, StereoAudioRecorder, PbxApi, sndPlayer */

/**
 * WebKit sound recorder module.
 * @module webkitRecorder
 */
const webkitRecorder = {
    $recordLabel: $('#record-label'),
    $recordButton: $('#start-record-button'),
    $stopButton: $('#stop-record-button'),
    $selectAudioInput: $('#select-audio-button'),
    $audioPlayer: $('#audio-player'),
    audioInputMenu: document.getElementById('audio-input-select'),
    chunks: [],
    mediaRecorder: '',

    /**
     * Initialize the WebKit sound recorder module.
     */
    initialize() {
        webkitRecorder.$stopButton.addClass('disabled');

        // Event listener for the record button
        webkitRecorder.$recordButton.on('click', (e) => {
            e.preventDefault();
            webkitRecorder.chunks = [];
            let constraints = {
                audio: true,
            };
            if (webkitRecorder.audioInputMenu.getElementsByClassName('selected').length > 0) {
                const audioSource = webkitRecorder.audioInputMenu.getElementsByClassName('selected')[0].id;
                constraints = {
                    audio: {deviceId: audioSource ? {exact: audioSource} : undefined},
                };
            }
            console.log(constraints);
            webkitRecorder.captureUserMedia(
                constraints,
                webkitRecorder.cbOnSuccess,
                webkitRecorder.gotDevices,
                webkitRecorder.onError,
            );
        });

        // Event listener for the stop button
        webkitRecorder.$stopButton.on('click', (e) => {
            e.preventDefault();
            webkitRecorder.mediaRecorder.stop();
        });

        webkitRecorder.$selectAudioInput.dropdown();

        // Disable the field if the protocol is not HTTPS or the hostname is not localhost
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
            $('#only-https-field').addClass('disabled');
        }

        // Disable the field if the user agent is MSIE
        if (window.navigator.userAgent.indexOf('MSIE ') > 0) {
            $('#only-https-field').addClass('disabled');
        }
    },

    /**
     * Capture user media based on media constraints.
     * @param {MediaStreamConstraints} mediaConstraints - The media constraints for capturing user media.
     * @param {Function} successCallback - The success callback function to handle captured media stream.
     * @param {Function} gotDevicesCallBack - The callback function to handle the list of available devices.
     * @param {Function} errorCallback - The error callback function to handle errors during media capture.
     */
    captureUserMedia(mediaConstraints, successCallback, gotDevicesCallBack, errorCallback) {
        navigator
            .mediaDevices.getUserMedia(mediaConstraints)
            .then(successCallback)
            .then(gotDevicesCallBack)
            .catch(errorCallback);
    },

    /**
     * Callback function called when devices are retrieved.
     * @param {MediaDeviceInfo[]} deviceInfos - The array of retrieved device info.
     */
    gotDevices(deviceInfos) {
        if (webkitRecorder.audioInputMenu.getElementsByTagName('div').length > 0) return;
        for (let i = 0; i !== deviceInfos.length; i += 1) {
            const deviceInfo = deviceInfos[i];
            const option = document.createElement('div');
            option.className = 'item';
            option.id = deviceInfo.deviceId;
            if (deviceInfo.kind === 'audioinput') {
                option.innerHTML = deviceInfo.label ||
                    `microphone ${webkitRecorder.audioInputMenu.length + 1}`;
                webkitRecorder.audioInputMenu.appendChild(option);
            }
        }
        if (webkitRecorder.audioInputMenu.getElementsByTagName('div').length > 0) {
            webkitRecorder.$selectAudioInput.removeClass('disabled');
        }
    },

    /**
     * Callback function called after successfully capturing user media.
     * @param {MediaStream} stream - The captured media stream.
     * @returns {Promise} - The promise to enumerate devices.
     */
    cbOnSuccess(stream) {
        try {
            webkitRecorder.mediaRecorder = new MediaStreamRecorder(stream);
            webkitRecorder.mediaRecorder.stream = stream;
            webkitRecorder.mediaRecorder.recorderType = StereoAudioRecorder;
            webkitRecorder.mediaRecorder.mimeType = 'audio/wav';
            webkitRecorder.mediaRecorder.audioChannels = 1;

            // webkitRecorder.mediaRecorder = new MediaRecorder(stream);
            webkitRecorder.mediaRecorder.onstop = webkitRecorder.cbOnStopMediaRecorder;
            webkitRecorder.mediaRecorder.ondataavailable = webkitRecorder.cbOnDataAvailable;
            webkitRecorder.mediaRecorder.start(300000);
            console.log('recorder started');
            webkitRecorder.$recordLabel.addClass('red');
            webkitRecorder.$stopButton.removeClass('disabled');
            webkitRecorder.$recordButton.addClass('disabled');
            return navigator.mediaDevices.enumerateDevices();
        } catch (e) {
            console.error('MediaStreamRecorder is not supported by this browser.\n\n' +
                'Try Firefox 29 or later, or Chrome 47 or later, with Enable experimental Web Platform features enabled from chrome://flags.');
            console.error('Exception while creating MediaRecorder:', e);
            webkitRecorder.$recordButton.addClass('disabled');
        }
        return false;
    },

    /**
     * Callback function called when an error occurs.
     * @param {Error} err - The error object.
     */
    cbOnError(err) {
        console.log(`The following error occured: ${err}`);
    },

    /**
     * Callback function called when media recorder is stopped.
     */
    cbOnStopMediaRecorder() {
        console.log('data available after MediaStreamRecorder.stop() called.');
        soundFileModify.blob = new Blob(webkitRecorder.chunks);
        console.log('recorder stopped');
        const fileURL = URL.createObjectURL(soundFileModify.blob);
        sndPlayer.UpdateSource(fileURL);
        const blobFile = new File([webkitRecorder.chunks[0]], 'blob' + new Date().getTime() + '.wav');
        PbxApi.FilesUploadFile(blobFile, soundFileModify.cbUploadResumable);
        webkitRecorder.$recordLabel.removeClass('red');
        webkitRecorder.$stopButton.addClass('disabled');
        webkitRecorder.$recordButton.removeClass('disabled');
        soundFileModify.$soundFileInput.val('');
    },

    /**
     * Callback function called when data is available.
     * @param {BlobEvent} e - The blob event.
     */
    cbOnDataAvailable(e) {
        webkitRecorder.chunks.push(e);
    },
};

// When the document is ready, initialize the web kit sound recorder
$(document).ready(() => {
    webkitRecorder.initialize();
});
