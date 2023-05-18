/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2023 Alexey Portnov and Nikolay Beketov
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

/* global PbxApi, globalTranslate, UserMessage */
class PbxExtensionStatus {
	initialize(uniqid, changeLabel = true) {
		this.$toggle = $(`.ui.toggle.checkbox[data-value="${uniqid}"]`);
		this.$toggleSegment = $('#module-status-toggle-segment');
		this.$allToggles = $(`.ui.toggle.checkbox`);
		this.$statusIcon = $(`tr#${uniqid} i.status-icon`);
		this.$toggleSegment.show();
		if (changeLabel) {
			this.$label = $(`.ui.toggle.checkbox[data-value="${uniqid}"]`).find('label');
		} else {
			this.$label = false;
		}
		this.uniqid = uniqid;
		this.$disabilityFields = $(`tr#${uniqid} .disability`);
		const cbOnChecked = $.proxy(this.cbOnChecked, this);
		const cbOnUnchecked = $.proxy(this.cbOnUnchecked, this);
		this.$toggle.checkbox({
			onChecked: cbOnChecked,
			onUnchecked: cbOnUnchecked,
		});
	}
	changeLabelText(newText) {
		if (this.$label) {
			this.$label.text(newText);
		}
	}
	cbOnChecked() {
		this.$statusIcon.addClass('spinner loading icon');
		this.$allToggles.addClass('disabled');
		$('a.button').addClass('disabled');
		this.changeLabelText(globalTranslate.ext_ModuleStatusChanging);
		const cbAfterModuleEnable = $.proxy(this.cbAfterModuleEnable, this);
		PbxApi.SystemEnableModule(this.uniqid, cbAfterModuleEnable);
	}
	cbOnUnchecked() {
		this.$statusIcon.addClass('spinner loading icon');
		this.$allToggles.addClass('disabled');
		$('a.button').addClass('disabled');
		this.changeLabelText(globalTranslate.ext_ModuleStatusChanging);
		const cbAfterModuleDisable = $.proxy(this.cbAfterModuleDisable, this);
		PbxApi.SystemDisableModule(this.uniqid, cbAfterModuleDisable);
	}
	// Callback function after disabling the module
	cbAfterModuleDisable(response, success) {
		if (success) {
			// Update UI to show module is disabled
			this.$toggle.checkbox('set unchecked');
			this.$statusIcon.removeClass('spinner loading icon');
			this.changeLabelText(globalTranslate.ext_ModuleDisabledStatusDisabled);

			// Trigger events to indicate module status and config data has changed
			const event = document.createEvent('Event');
			event.initEvent('ModuleStatusChanged', false, true);
			window.dispatchEvent(event);
			event.initEvent('ConfigDataChanged', false, true);
			window.dispatchEvent(event);

			// Disable input fields and show message for changed objects
			this.$disabilityFields.addClass('disabled');
			if (response.data.changedObjects !== undefined){
				UserMessage.showMultiString(response.data.changedObjects, globalTranslate.ext_ModuleChangedObjects);
			}

			// Refresh the page to reflect changes
			window.location.reload();
		} else {
			this.$toggle.checkbox('set checked');
			this.changeLabelText(globalTranslate.ext_ModuleDisabledStatusEnabled);
			this.$disabilityFields.removeClass('disabled');
			if (response !== undefined && response.messages !== undefined) {
				UserMessage.showMultiString(response.messages, globalTranslate.ext_ModuleChangeStatusError);
			}
		}
		this.$allToggles.removeClass('disabled');
		$('a.button').removeClass('disabled');
		this.$statusIcon.removeClass('spinner loading icon');
	}

	// Callback function after enabling the module
	cbAfterModuleEnable(response, success) {
		if (success) {
			// Update UI to show module is enabled
			this.$toggle.checkbox('set checked');
			this.changeLabelText(globalTranslate.ext_ModuleDisabledStatusEnabled);

			// Trigger events to indicate module status and config data has changed
			const event = document.createEvent('Event');
			event.initEvent('ModuleStatusChanged', false, true);
			window.dispatchEvent(event);
			event.initEvent('ConfigDataChanged', false, true);
			window.dispatchEvent(event);

			// Enable input fields and show message for changed objects
			this.$disabilityFields.removeClass('disabled');
			if (response.data.changedObjects !== undefined){
				UserMessage.showMultiString(response.data.changedObjects, globalTranslate.ext_ModuleChangedObjects);
			}

			// Refresh the page to reflect changes
			window.location.reload();
		} else {
			this.$toggle.checkbox('set unchecked');
			this.changeLabelText(globalTranslate.ext_ModuleDisabledStatusDisabled);
			this.$disabilityFields.addClass('disabled');
			if (response !== undefined && response.messages !== undefined) {
				UserMessage.showMultiString(response.messages, globalTranslate.ext_ModuleChangeStatusError);
			}
		}
		this.$allToggles.removeClass('disabled');
		this.$statusIcon.removeClass('spinner loading icon');
		$('a.button').removeClass('disabled');
	}
}

$(document).ready(() => {
	const uniqId = $('#module-status-toggle').attr('data-value');
	if (uniqId) {
		const pageStatus = new PbxExtensionStatus();
		pageStatus.initialize(uniqId, true);
	}
});
