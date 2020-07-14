/*
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */

/* global UserMessage, globalTranslate, PbxApi, upgradeStatusLoopWorker */ 

const addNewExtension = {
	$uploadButton: $('#add-new-button'),
	$progressBar: $('#upload-progress-bar'),
	$progressBarLabel: $('#upload-progress-bar').find('.label'),
	uploadInProgress: false,
	initialize() {
		addNewExtension.$progressBar.hide();
		addNewExtension.$uploadButton.on('click', (e) => {
			e.preventDefault();
			if (
				addNewExtension.$uploadButton.hasClass('loading')
				|| addNewExtension.uploadInProgress
			) { return; }
			$('input:file', $(e.target).parents()).click();
		});

		$('input:file').on('change', (e) => {
			if (e.target.files[0] !== undefined) {
				addNewExtension.$progressBar.show();
				const filename = e.target.files[0].name;
				$('input:text', $(e.target).parent()).val(filename);
				addNewExtension.uploadInProgress = true;
				addNewExtension.$uploadButton.addClass('loading');
				const data = $('input:file')[0].files[0];
				PbxApi.SystemUploadModule(data, addNewExtension.cbAfterUploadFile);
			}
		});
	},
	cbAfterUploadFile(response, success) {
		if (response.length === 0 || response === false || success === false) {
			addNewExtension.$uploadButton.removeClass('loading');
			addNewExtension.uploadInProgress = false;
			UserMessage.showError(globalTranslate.ext_UploadError);
		} else if (response.function === 'upload_progress' && success) {
			addNewExtension.$progressBar.progress({
				percent: parseInt(response.percent, 10),
			});
			if (response.percent < 100) {
				addNewExtension.$progressBarLabel.text(globalTranslate.ext_UploadInProgress);
			} else {
				addNewExtension.$progressBarLabel.text(globalTranslate.ext_InstallationInProgress);
			}
		} else if (response.function === 'uploadNewModule' && success) {
			upgradeStatusLoopWorker.initialize(response.uniqid, false);
		} else {
			UserMessage.showMultiString(response.message);
		}
	},
};

$(document).ready(() => {
	addNewExtension.initialize();
});
