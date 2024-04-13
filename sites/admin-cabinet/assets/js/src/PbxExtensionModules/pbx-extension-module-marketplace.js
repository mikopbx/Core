/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

/* global PbxApi, globalTranslate, globalPBXVersion */

/**
 * Represents list of extension modules.
 * @class marketplace
 * @memberof module:PbxExtensionModules
 */
const marketplace = {

    /**
     * jQuery object for the table with available modules.
     * @type {jQuery}
     */
    $marketplaceTable: $('#new-modules-table'),

    /**
     * jQuery object for the loader instead of available modules.
     * @type {jQuery}
     */
    $marketplaceLoader: $('#new-modules-loader'),

    /**
     * jQuery object for the information when no any modules available to install.
     * @type {jQuery}
     */
    $noNewModulesSegment: $('#no-new-modules-segment'),

    /**
     * Store current installed a PBX version without a div postfix
     * @type {string}
     */
    pbxVersion: globalPBXVersion.replace(/-dev/i, ''),

    /**
     * jQuery object for the button which responsible for update all installed modules
     * @type {jQuery}
     */
    $btnUpdateAllModules: $('#update-all-modules-button'),


    /**
     * Initialize extensionModulesShowAvailable class
     */
    initialize() {
        PbxApi.ModulesGetAvailable(marketplace.cbParseModuleUpdates);
    },

    /**
     * Initialize data tables on table
     */
    initializeDataTable() {
        marketplace.$marketplaceTable.DataTable({
            lengthChange: false,
            paging: false,
            columns: [
                {orderable: false},
                null,
                {orderable: false, searchable: false},
                {orderable: false, searchable: false},
            ],
            autoWidth: false,
            sDom: 'lrtip',
            language: SemanticLocalization.dataTableLocalisation,
            initComplete: function () {
                this.api()
                    .columns()
                    .every(function () {
                        let column = this;
                        if (column.index() === 0) {
                            let title = column.header().textContent;

                            // Create input element
                            let input = document.createElement('input');
                            input.placeholder = title;
                            column.header().replaceChildren(input);

                            // Event listener for user input
                            input.addEventListener('keyup', () => {
                                if (column.search() !== this.value) {
                                    column.search(input.value).draw();
                                }
                            });
                        }
                    });
            }
        });
    },

    /**
     * Callback function to process the list of modules received from the website.
     * @param {object} response - The response containing the list of modules.
     */
    cbParseModuleUpdates(response) {
        marketplace.$marketplaceLoader.hide();

        if (response && Array.isArray(response.modules)) {
            response.modules.forEach((obj) => {
                // Check if this module is compatible with the PBX based on version number
                const minAppropriateVersionPBX = obj.min_pbx_version;
                const newModuleVersion = obj.version;
                const currentVersionPBX = marketplace.pbxVersion;
                if (marketplace.versionCompare(currentVersionPBX, minAppropriateVersionPBX) < 0) {
                    return;
                }

                // Add new module row
                marketplace.addModuleDescription(obj);

                // Check if the module is already installed and offer an update
                const $moduleRow = $(`tr.module-row[data-id=${obj.uniqid}]`);
                if ($moduleRow.length > 0) {
                    const installedVer = $moduleRow.find('td.version').text();
                    const versionCompareResult = marketplace.versionCompare(newModuleVersion, installedVer);
                    if (versionCompareResult > 0) {
                        marketplace.addUpdateButtonToRow(obj);
                    } else if (versionCompareResult === 0) {
                        marketplace.changeDownloadButtonOnRow(obj);
                    }
                }
            });
        }

        if ($('tr.new-module-row').length>0){
            marketplace.$noNewModulesSegment.hide();
            marketplace.initializeDataTable();
        } else {
            marketplace.$noNewModulesSegment.show();
        }
    },

    /**
     * Adds a description for an available module.
     * @param {Object} obj - The module object containing information.
     */
    addModuleDescription(obj) {
        marketplace.$marketplaceTable.show();
        let promoLink = '';
        if (obj.promo_link !== undefined && obj.promo_link !== null) {
            promoLink = `<br><a href="${obj.promo_link}" target="_blank">${globalTranslate.ext_ExternalDescription}</a>`;
        }

        let additionalIcon = '<i class="puzzle piece icon"></i>';
        if (obj.commercial !== '0') {
            additionalIcon = '<i class="ui donate icon"></i>';
        }
        const dynamicRow = `
			<tr class="new-module-row" data-id="${obj.uniqid}" data-name="${decodeURIComponent(obj.name)}">
						<td class="show-details-on-click">${additionalIcon} ${decodeURIComponent(obj.name)}<br>
						    <span class="features">${decodeURIComponent(obj.description)} ${promoLink}</span>
						</td>
						<td class="show-details-on-click">${decodeURIComponent(obj.developer)}</td>
						<td class="center aligned version show-details-on-click">${obj.version}</td>
						<td class="right aligned collapsing">
    							<div class="ui small basic icon buttons action-buttons">
                                    <a href="#" class="ui icon basic button download popuped disable-if-no-internet" 
                                        data-content= "${globalTranslate.ext_InstallModule}"
                                        data-uniqid = "${obj.uniqid}"
                                        data-size = "${obj.size}"
                                        data-version ="${obj.version}"
                                        data-releaseid ="${obj.release_id}">
                                        <i class="icon download blue"></i> 
                                    </a>
								</div>
    				    </td>		
			</tr>`;
        $('#new-modules-table tbody').append(dynamicRow);
    },

    /**
     * Adds an update button to the module row for updating an old version of PBX.
     * @param {Object} obj - The module object containing information.
     */
    addUpdateButtonToRow(obj) {
        const $moduleRow = $(`tr[data-id=${obj.uniqid}]`);
        const $currentDownloadButton = $moduleRow.find('a.download');
        $currentDownloadButton.remove();
        const dynamicButton
            = `<a href="#" class="ui basic icon button update popuped disable-if-no-internet" 
			data-content="${globalTranslate.ext_UpdateModule}"
			data-version ="${obj.version}"
			data-size = "${obj.size}"
			data-uniqid ="${obj.uniqid}" 
			data-releaseid ="${obj.release_id}">
			<i class="icon redo blue"></i> 
			</a>`;
        $moduleRow.find('.action-buttons').prepend(dynamicButton);
        marketplace.$btnUpdateAllModules.show();
    },

    /**
     *
     * @param {Object} obj - The module object containing information.
     */
    changeDownloadButtonOnRow(obj) {
        const $moduleRow = $(`tr.new-module-row[data-id=${obj.uniqid}]`);
        const $currentDownloadButton = $moduleRow.find('a.download');
        $currentDownloadButton.remove();
        const dynamicButton
            = `<a href="#" class="ui basic icon button popuped disable-if-no-internet" 
			data-content="${globalTranslate.ext_ShowModuleRepoDetails}">
			<i class="icon search blue"></i> 
			</a>`;
        $moduleRow.find('.action-buttons')
            .prepend(dynamicButton);
        $moduleRow.find('.action-buttons').closest('td').addClass('show-details-on-click');
    },

    /**
     * Compare versions of modules.
     * @param {string} v1 - The first version to compare.
     * @param {string} v2 - The second version to compare.
     * @param {object} [options] - Optional configuration options.
     * @param {boolean} [options.lexicographical] - Whether to perform lexicographical comparison (default: false).
     * @param {boolean} [options.zeroExtend] - Weather to zero-extend the shorter version (default: false).
     * @returns {number} - A number indicating the comparison result: 0 if versions are equal, 1 if v1 is greater, -1 if v2 is greater, or NaN if the versions are invalid.
     */
    versionCompare(v1, v2, options) {
        const lexicographical = options && options.lexicographical;
        const zeroExtend = options && options.zeroExtend;
        let v1parts = String(v1).split('.');
        let v2parts = String(v2).split('.');

        function isValidPart(x) {
            return (lexicographical ? /^\d+[A-Za-z]*$/ : /^\d+$/).test(x);
        }

        if (!v1parts.every(isValidPart) || !v2parts.every(isValidPart)) {
            return NaN;
        }

        if (zeroExtend) {
            while (v1parts.length < v2parts.length) v1parts.push('0');
            while (v2parts.length < v1parts.length) v2parts.push('0');
        }

        if (!lexicographical) {
            v1parts = v1parts.map(Number);
            v2parts = v2parts.map(Number);
        }

        for (let i = 0; i < v1parts.length; i += 1) {
            if (v2parts.length === i) {
                return 1;
            }
            if (v1parts[i] === v2parts[i]) {
                //
            } else if (v1parts[i] > v2parts[i]) {
                return 1;
            } else {
                return -1;
            }
        }

        if (v1parts.length !== v2parts.length) {
            return -1;
        }

        return 0;
    },

};

// When the document is ready, initialize the external modules table and fetch a list of available modules from the repo
$(document).ready(() => {
    marketplace.initialize();
});
