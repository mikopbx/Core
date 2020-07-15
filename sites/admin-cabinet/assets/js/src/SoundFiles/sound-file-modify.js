/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global globalRootUrl,globalTranslate, MediaStreamRecorder, StereoAudioRecorder, Form, PbxApi */

const mergingCheckWorker = {
	timeOut: 3000,
	timeOutHandle: '',
	errorCounts: 0,
	fileID: null,
	filePath: '',
	initialize(fileID, filePath) {
		// Запустим обновление статуса провайдера
		mergingCheckWorker.fileID = fileID;
		mergingCheckWorker.filePath = filePath;
		mergingCheckWorker.restartWorker(fileID);
	},
	restartWorker() {
		window.clearTimeout(mergingCheckWorker.timeoutHandle);
		mergingCheckWorker.worker();
	},
	worker() {
		PbxApi.SystemGetStatusUploadFile(mergingCheckWorker.fileID, mergingCheckWorker.cbAfterResponse);
		mergingCheckWorker.timeoutHandle = window.setTimeout(
			mergingCheckWorker.worker,
			mergingCheckWorker.timeOut,
		);
	},
	cbAfterResponse(response) {
		if (mergingCheckWorker.errorCounts > 10) {
			UserMessage.showError(globalTranslate.sf_UploadError);
			soundFileModify.$submitButton.removeClass('loading');
			soundFileModify.$formObj.removeClass('loading');
			window.clearTimeout(mergingCheckWorker.timeoutHandle);
		}
		if (response === undefined || Object.keys(response).length === 0) {
			mergingCheckWorker.errorCounts += 1;
			return;
		}
		if (response.d_status === 'UPLOAD_COMPLETE') {
			const category = soundFileModify.$formObj.form('get value', 'category');
			PbxApi.SystemConvertAudioFile(mergingCheckWorker.filePath, category, soundFileModify.cbAfterConvertFile);
			window.clearTimeout(mergingCheckWorker.timeoutHandle);
		} else if (response.d_status !== undefined) {
			mergingCheckWorker.errorCounts = 0;
		} else {
			mergingCheckWorker.errorCounts += 1;
		}
	},
};

const sndPlayer = {
	slider: document.getElementById('audio-player'),
	duration: 0, // Duration of audio clip
	$pButton: $('#play-button'), // play button
	$slider: $('#play-slider'),
	$playerSegment: $('#audio-player-segment'),
	initialize() {
		// play button event listenter
		sndPlayer.$pButton.on('click', (e) => {
			e.preventDefault();
			sndPlayer.play();
		});
		// timeupdate event listener
		sndPlayer.slider.addEventListener('timeupdate', sndPlayer.cbTimeUpdate, false);

		// Gets audio file duration
		sndPlayer.slider.addEventListener('canplaythrough', sndPlayer.cbCanPlayThrough, false);

		sndPlayer.$slider.range({
			min: 0,
			max: 100,
			start: 0,
			onChange: sndPlayer.cbOnSliderChange,
		});
	},
	UpdateSource(newSource) {
		sndPlayer.slider.getElementsByTagName('source')[0].src = newSource;
		sndPlayer.slider.pause();
		sndPlayer.slider.load();
		sndPlayer.slider.oncanplaythrough = sndPlayer.cbCanPlayThrough;
	},
	cbCanPlayThrough() {
		sndPlayer.duration = sndPlayer.slider.duration;
		console.log(`New duration ${sndPlayer.slider.readyState}`);
		if (sndPlayer.duration > 0) {
			sndPlayer.$slider.range('set value', 0);
			sndPlayer.$playerSegment.show();
		} else {
			sndPlayer.$playerSegment.hide();
		}
	},

	cbOnSliderChange(newVal, meta) {
		if (meta.triggeredByUser && Number.isFinite(sndPlayer.slider.duration)) {
			sndPlayer.slider.removeEventListener('timeupdate', sndPlayer.cbTimeUpdate, false);
			sndPlayer.slider.currentTime = (sndPlayer.slider.duration * newVal) / 100;
			sndPlayer.slider.addEventListener('timeupdate', sndPlayer.cbTimeUpdate, false);
		}
	},
	// timeUpdate
	// Synchronizes playhead position with current point in audio
	cbTimeUpdate() {
		if (Number.isFinite(sndPlayer.slider.duration)) {
			const percent = sndPlayer.slider.currentTime / sndPlayer.slider.duration;
			const rangePosition = Math.round((percent) * 100);
			sndPlayer.$slider.range('set value', rangePosition);
			if (sndPlayer.slider.currentTime === sndPlayer.duration) {
				sndPlayer.$pButton.html('<i class="icon play"></i>');
			}
		}
	},

	// Play and Pause
	play() {
		// start music
		if (sndPlayer.slider.paused && sndPlayer.slider.duration) {
			sndPlayer.slider.play();
			// remove play, add pause
			sndPlayer.$pButton.html('<i class="icon pause"></i>');
		} else { // pause music
			sndPlayer.slider.pause();
			// remove pause, add play
			sndPlayer.$pButton.html('<i class="icon play"></i>');
		}
	},

};

const soundFileModify = {
	trashBin: [],
	$soundUploadButton: $('#upload-sound-file'),
	$soundFileInput: $('#file'),
	$soundFileName: $('#name'),
	$audioPlayer: $('#audio-player'),
	$submitButton: $('#submitbutton'),
	blob: window.URL || window.webkitURL,
	$formObj: $('#sound-file-form'),
	$dropDowns: $('#sound-file-form .dropdown'),
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
	initialize() {
		soundFileModify.$dropDowns.dropdown();
		soundFileModify.initializeForm();
		PbxApi.SystemUploadFileAttachToBtn('upload-sound-file',['mp3','wav'], soundFileModify.cbUploadResumable);

		if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
			$('#only-https-field').addClass('disabled');
		}
		if (window.navigator.userAgent.indexOf('MSIE ') > 0) {
			$('#only-https-field').addClass('disabled');
		}
	},

	/**
	 * Callback file upload with chunks and merge
	 * @param action
	 * @param params
	 */
	cbUploadResumable(action, params){
		switch (action) {
			case 'fileSuccess':
				const response = PbxApi.tryParseJSON(params.response);
				if (response !==false && response.data.filename!==undefined){
					soundFileModify.$soundFileName.val(params.file.fileName);
					soundFileModify.checkStatusFileMerging(params.response);
				} else {
					UserMessage.showError(`${globalTranslate.sf_UploadError}`);
				}

				break;
			case 'uploadStart':
				soundFileModify.$formObj.addClass('loading');
				break;
			case 'error':
				soundFileModify.$submitButton.removeClass('loading');
				soundFileModify.$formObj.removeClass('loading');
				UserMessage.showError(`${globalTranslate.sf_UploadError}<br>${params.message}`);
				break;
			default:
		}
	},
	/**
	 * Wait for file ready to use
	 *
	 * @param response ответ функции /pbxcore/api/upload/status
	 */
	checkStatusFileMerging(response) {
		if (response === undefined || PbxApi.tryParseJSON(response) === false) {
			UserMessage.showError(`${globalTranslate.sf_UploadError}`);
			return;
		}
		const json = JSON.parse(response);
		if (json === undefined || json.data === undefined) {
			UserMessage.showError(`${globalTranslate.sf_UploadError}`);
			return;
		}
		const fileID = json.data.upload_id;
		const filePath = json.data.filename;
		mergingCheckWorker.initialize(fileID, filePath);
	},
	/**
	 * After file converted to MP3 format
	 * @param filename
	 */
	cbAfterConvertFile(filename) {
		if (filename === false){
			UserMessage.showError(`${globalTranslate.sf_UploadError}`);
		} else {
			soundFileModify.trashBin.push(soundFileModify.$formObj.form('get value', 'path'));
			soundFileModify.$formObj.form('set value', 'path', filename);
			soundFileModify.$soundFileName.trigger('change');
			sndPlayer.UpdateSource(`/pbxcore/api/cdr/playback?view=${filename}`);
			soundFileModify.$submitButton.removeClass('loading');
			soundFileModify.$formObj.removeClass('loading');

		}
	},
	cbBeforeSendForm(settings) {
		const result = settings;
		result.data = soundFileModify.$formObj.form('get values');
		return result;
	},
	cbAfterSendForm() {
		soundFileModify.trashBin.forEach((filepath) => {
			if (filepath) PbxApi.SystemRemoveAudioFile(filepath);
		});
	},
	initializeForm() {
		Form.$formObj = soundFileModify.$formObj;
		Form.url = `${globalRootUrl}sound-files/save`;
		Form.validateRules = soundFileModify.validateRules;
		Form.cbBeforeSendForm = soundFileModify.cbBeforeSendForm;
		Form.cbAfterSendForm = soundFileModify.cbAfterSendForm;
		Form.initialize();
	},
};


const webkitRecorder = {
	$recordLabel: $('#record-label'),
	$recordButton: $('#start-record-button'),
	$stopButton: $('#stop-record-button'),
	$selectAudioInput: $('#select-audio-button'),
	$audioPlayer: $('#audio-player'),
	audioInputMenu: document.getElementById('audio-input-select'),
	chunks: [],
	mediaRecorder: '',
	initialize() {
		webkitRecorder.$stopButton.addClass('disabled');

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
		webkitRecorder.$stopButton.on('click', (e) => {
			e.preventDefault();
			webkitRecorder.mediaRecorder.stop();
		});

		webkitRecorder.$selectAudioInput.dropdown();
	},
	captureUserMedia(mediaConstraints, successCallback, gotDevicesCallBack, errorCallback) {
		navigator
			.mediaDevices.getUserMedia(mediaConstraints)
			.then(successCallback)
			.then(gotDevicesCallBack)
			.catch(errorCallback);
	},
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
	cbOnError(err) {
		console.log(`The following error occured: ${err}`);
	},
	cbOnStopMediaRecorder() {
		console.log('data available after MediaStreamRecorder.stop() called.');
		soundFileModify.blob = new Blob(webkitRecorder.chunks);
		console.log('recorder stopped');
		const fileURL = URL.createObjectURL(soundFileModify.blob);
		sndPlayer.UpdateSource(fileURL);
		const blobFile = new File([webkitRecorder.chunks[0]], 'blob'+ new Date().getTime()+'.wav');
		PbxApi.SystemUploadFile(blobFile, soundFileModify.cbUploadResumable);
		// const category = soundFileModify.$formObj.form('get value', 'category');
		//
		// PbxApi.SystemUploadAudioFile(blobFile, category, soundFileModify.cbAfterUploadFile);
		webkitRecorder.$recordLabel.removeClass('red');
		webkitRecorder.$stopButton.addClass('disabled');
		webkitRecorder.$recordButton.removeClass('disabled');
		soundFileModify.$soundFileInput.val('');
	},
	cbOnDataAvailable(e) {
		webkitRecorder.chunks.push(e);
	},
};


$(document).ready(() => {
	sndPlayer.initialize();
	soundFileModify.initialize();
	webkitRecorder.initialize();
});
