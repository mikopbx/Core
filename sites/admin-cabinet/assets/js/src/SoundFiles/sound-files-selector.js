/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2021 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, sessionStorage */

const SoundFilesSelector = {

	initialize() {
		window.addEventListener('ConfigDataChanged', SoundFilesSelector.cbOnDataChanged);
	},
	/**
	 * We will drop all caches if data changes
	 */
	cbOnDataChanged() {
		sessionStorage.removeItem(`${globalRootUrl}sound-files/getSoundFiles/custom`);
	},
	/**
	 * Makes dropdown menu for soundFiles with empty field
	 * @param cbOnChange - on change callback function
	 * @returns  dropdown settings
	 */
	getDropdownSettingsWithEmpty(cbOnChange = null) {
		return {
			apiSettings: {
				url: `${globalRootUrl}sound-files/getSoundFiles/custom`,
				// cache: false,
				// throttle: 400,
				onResponse(response) {
					return SoundFilesSelector.formatDropdownResults(response, true);
				},
			},
			onChange(value) {
				if (parseInt(value, 10) === -1) $(this).dropdown('clear');
				if (cbOnChange !== null) cbOnChange(value);
			},
			ignoreCase: true,
			fullTextSearch: true,
			filterRemoteData: true,
			saveRemoteData: true,
			forceSelection: false,
			// direction: 'downward',
			hideDividers: 'empty',

		};
	},
	/**
	 * Makes dropdown menu for soundFiles without empty field
	 * @param cbOnChange - on change callback function
	 * @returns  dropdown settings
	 */
	getDropdownSettingsWithoutEmpty(cbOnChange = null) {
		return {
			apiSettings: {
				url: `${globalRootUrl}sound-files/getSoundFiles/custom`,
				// cache: false,
				// throttle: 400,
				onResponse(response) {
					return SoundFilesSelector.formatDropdownResults(response, false);
				},
			},
			ignoreCase: true,
			fullTextSearch: true,
			filterRemoteData: true,
			saveRemoteData: true,
			forceSelection: false,
			// direction: 'downward',
			hideDividers: 'empty',
			onChange(value) {
				if (cbOnChange !== null) cbOnChange(value);
			},
		};
	},
	/**
	 * Makes formatted menu structure
	 */
	formatDropdownResults(response, addEmpty) {
		const formattedResponse = {
			success: false,
			results: [],
		};
		if (addEmpty) {
			formattedResponse.results.push({
				name: '-',
				value: -1
			});
		}

		if (response) {
			formattedResponse.success = true;
			$.each(response.results, (index, item) => {
				formattedResponse.results.push({
					name: item.name,
					value: item.value
				});
			});
		}
		return formattedResponse;
	},
}


$(document).ready(() => {
	SoundFilesSelector.initialize();
});
