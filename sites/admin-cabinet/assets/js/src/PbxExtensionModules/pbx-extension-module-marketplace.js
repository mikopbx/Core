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

/* global PbxApi, globalTranslate, globalPBXVersion, ModulesAPI */

/**
 * Represents list of extension modules.
 * @class marketplace
 * @memberof module:PbxExtensionModules
 */
const marketplace = {

    /**
     * jQuery object for the table with available modules.
     * Resolved in initialize() — must not call $() at module-load time.
     * @type {jQuery}
     */
    $marketplaceTable: null,

    /**
     * jQuery object for the loader instead of available modules.
     * @type {jQuery}
     */
    $marketplaceLoader: null,

    /**
     * jQuery object for the information when no any modules available to install.
     * @type {jQuery}
     */
    $noNewModulesSegment: null,

    /**
     * Store current installed a PBX version without a div postfix
     * @type {string}
     */
    pbxVersion: globalPBXVersion.replace(/-dev/i, ''),

    /**
     * jQuery object for the button which responsible for update all installed modules
     * @type {jQuery}
     */
    $btnUpdateAllModules: null,

    /**
     * jQuery object initialized flag
     * @type {jQuery}
     */
    isInitialized: false,

    /**
     * Currently selected module_type filter value ('all' shows every row).
     * @type {string}
     */
    selectedType: 'all',

    /**
     * Registered DataTable custom filter function (so it can be removed on re-init).
     * @type {?Function}
     */
    typeFilterFn: null,

    /**
     * Initialize extensionModulesShowAvailable class
     */
    initialize() {
        if (marketplace.isInitialized) {
            return;
        }
        marketplace.$marketplaceTable = $('#new-modules-table');
        marketplace.$marketplaceLoader = $('#new-modules-loader');
        marketplace.$noNewModulesSegment = $('#no-new-modules-segment');
        marketplace.$btnUpdateAllModules = $('#update-all-modules-button');

        marketplace.isInitialized = true;
        ModulesAPI.getAvailable(marketplace.cbParseModuleUpdates);
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

                            // Create compact search input in Fomantic UI style
                            let wrapper = document.createElement('div');
                            wrapper.className = 'ui mini icon input';
                            let input = document.createElement('input');
                            input.placeholder = title;
                            input.type = 'text';
                            input.style.width = '200px';
                            let icon = document.createElement('i');
                            icon.className = 'search icon';
                            wrapper.appendChild(input);
                            wrapper.appendChild(icon);

                            // Keep the header text for sorting, add input next to it
                            column.header().textContent = '';
                            column.header().appendChild(wrapper);

                            // Prevent input clicks from triggering column sort
                            wrapper.addEventListener('click', (e) => e.stopPropagation());

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
     * Register DataTable custom filter for module_type.
     * Idempotent — if called multiple times, previous filter fn is removed first.
     */
    registerTypeFilter() {
        if (!$.fn.DataTable || !$.fn.DataTable.ext || !$.fn.DataTable.ext.search) {
            return;
        }
        const searchStack = $.fn.DataTable.ext.search;
        if (marketplace.typeFilterFn) {
            const idx = searchStack.indexOf(marketplace.typeFilterFn);
            if (idx !== -1) {
                searchStack.splice(idx, 1);
            }
        }
        marketplace.typeFilterFn = function (settings, data, dataIndex, rowData, invalidated, row) {
            // Only apply to the marketplace table.
            if (!settings || !settings.nTable || settings.nTable.id !== 'new-modules-table') {
                return true;
            }
            if (marketplace.selectedType === 'all') {
                return true;
            }
            const rowNode = row || (settings.aoData[dataIndex] ? settings.aoData[dataIndex].nTr : null);
            if (!rowNode) {
                return true;
            }
            const rowType = $(rowNode).attr('data-type') || 'general';
            return rowType === marketplace.selectedType;
        };
        searchStack.push(marketplace.typeFilterFn);
    },

    /**
     * Collect unique module_type values from rendered rows, (re-)populate dropdown.
     * Hides the filter UI entirely if only one category is present (nothing to filter).
     */
    populateTypeFilter() {
        const $wrapper = $('#module-type-filter-wrapper');
        const $dropdown = $('#module-type-filter');
        if ($wrapper.length === 0 || $dropdown.length === 0) {
            return;
        }

        const typesSet = {};
        $('tr.new-module-row').each(function () {
            const type = $(this).attr('data-type') || 'general';
            typesSet[type] = true;
        });
        const types = Object.keys(typesSet).sort();

        if (types.length <= 1) {
            $wrapper.hide();
            return;
        }

        const allLabel = (globalTranslate && globalTranslate.ext_ModuleTypeAll) || 'All';
        let menuHtml = '<div class="item" data-value="all">' + allLabel + '</div>';
        types.forEach((type) => {
            const label = marketplace.moduleTypeLabel(type);
            menuHtml += '<div class="item" data-value="' + type + '">' + label + '</div>';
        });
        $dropdown.find('.menu').html(menuHtml);

        // Preserve current selection if the type is still present; otherwise fall back to 'all'.
        const previousType = marketplace.selectedType;
        const nextType = previousType === 'all' || typesSet[previousType] ? previousType : 'all';

        $dropdown.dropdown({
            onChange: function (value) {
                marketplace.applyTypeFilter(value || 'all');
            },
        });
        $dropdown.dropdown('set selected', nextType);
        $wrapper.show();
    },

    /**
     * Set active filter value and redraw the table.
     * @param {string} type
     */
    applyTypeFilter(type) {
        marketplace.selectedType = type || 'all';
        if ($.fn.DataTable && $.fn.DataTable.isDataTable(marketplace.$marketplaceTable)) {
            marketplace.$marketplaceTable.DataTable().draw();
        }
    },

    /**
     * Resolve UI label for a module_type. Uses globalTranslate when a known key exists,
     * otherwise falls back to the raw type string (forward-compat with new server types).
     * @param {string} type
     * @returns {string}
     */
    moduleTypeLabel(type) {
        if (!type) {
            return 'General';
        }
        // camelCase-ify snake_case: 'call_feature' -> 'CallFeature'
        const camel = type.split('_').map((part) => {
            if (part.length === 0) {
                return '';
            }
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        }).join('');
        const key = 'ext_ModuleType' + camel;
        if (globalTranslate && typeof globalTranslate[key] === 'string' && globalTranslate[key].length > 0) {
            return globalTranslate[key];
        }
        // Fallback: capitalized raw type (keeps the UI readable for unknown categories).
        return type.charAt(0).toUpperCase() + type.slice(1);
    },

    /**
     * Callback function to process the list of modules received from the website.
     * @param {object} response - The response containing the list of modules.
     */
    cbParseModuleUpdates(responseData, isSuccessful) {
        marketplace.$marketplaceLoader.hide();

        // When success, responseData is response.data from API
        // When failure, responseData is the full response object
        if (!isSuccessful) {
            marketplace.$noNewModulesSegment.show();
            return;
        }

        // In success case, responseData is response.data which should contain modules
        const modules = responseData?.modules || [];

        if (Array.isArray(modules) && modules.length > 0) {
            modules.forEach((obj) => {
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
                    const installedVer = $moduleRow.find('td.version').text().trim();
                    const versionCompareResult = marketplace.versionCompare(newModuleVersion, installedVer);
                    if (versionCompareResult > 0) {
                        marketplace.addUpdateButtonToRow(obj);
                    } else if (versionCompareResult === 0) {
                        marketplace.changeDownloadButtonOnRow(obj);
                    }
                }
            });
        }

        if ($('tr.new-module-row').length > 0) {
            marketplace.$noNewModulesSegment.hide();
            // Only initialize if DataTable is not already initialized
            if (!$.fn.DataTable.isDataTable(marketplace.$marketplaceTable)) {
                marketplace.initializeDataTable();
                marketplace.registerTypeFilter();
            } else {
                // If table is already initialized, just redraw it
                marketplace.$marketplaceTable.DataTable().draw();
            }
            marketplace.populateTypeFilter();
        } else {
            marketplace.$noNewModulesSegment.show();
        }

        // Check if URL has a module query parameter to auto-open its detail modal
        marketplace.openModuleFromQueryParam();
    },

    /**
     * Checks the URL query parameter for a module uniqid and opens its detail modal.
     * URL format: ?module=ModuleUniqid#/marketplace
     */
    openModuleFromQueryParam() {
        const urlParams = new URLSearchParams(window.location.search);
        const uniqid = urlParams.get('module');
        if (!uniqid) {
            return;
        }
        const $moduleRow = $(`tr.new-module-row[data-id=${uniqid}]`);
        if ($moduleRow.length > 0) {
            $moduleRow.find('td.show-details-on-click').first().trigger('click');
        }
        // Clean up the URL parameter after opening the modal
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState(null, '', cleanUrl);
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
        if (obj.commercial !== 0) {
            additionalIcon = '<i class="ui donate icon"></i>';
        }
        const moduleType = (obj.module_type && typeof obj.module_type === 'string')
            ? obj.module_type
            : 'general';
        const dynamicRow = `
			<tr class="new-module-row" data-id="${obj.uniqid}" data-name="${decodeURIComponent(obj.name)}" data-type="${moduleType}">
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
        const $moduleRow = $(`tr.module-row[data-id=${obj.uniqid}]`);
        
        // Check if we're working with a DataTable
        const $table = $('#installed-modules-table');
        if ($.fn.DataTable && $.fn.DataTable.isDataTable($table)) {
            const table = $table.DataTable();
            
            // Use jQuery element to find the row in DataTable instead of index
            const dtRow = table.row($moduleRow);
            
            if (dtRow.any()) {
                // Get the row node to work with
                const $rowNode = $(dtRow.node());
                
                // Clone the row's last cell (action buttons cell)
                const $lastCell = $rowNode.find('td:last').clone();
                
                // Remove download button if exists
                $lastCell.find('a.download').remove();
                
                // Create update button
                const dynamicButton = `<a href="#" class="ui basic icon button update popuped disable-if-no-internet" 
                    data-content="${globalTranslate.ext_UpdateModule}"
                    data-version ="${obj.version}"
                    data-size = "${obj.size}"
                    data-uniqid ="${obj.uniqid}" 
                    data-releaseid ="${obj.release_id}">
                    <i class="icon redo blue"></i> 
                    </a>`;
                
                // Prepend button to action-buttons div
                $lastCell.find('.action-buttons').prepend(dynamicButton);
                
                // Update the cell in DataTable using the row API
                const cellIndex = $rowNode.find('td').length - 1; // Last cell
                table.cell(dtRow, cellIndex).data($lastCell.html()).draw(false);

                // Re-initialize all popups after DOM update
                setTimeout(() => {
                    extensionModules.initializePopups();
                }, 100);
            } else {
                // If row not found in DataTable, use direct DOM manipulation
                this.addUpdateButtonDirectly($moduleRow, obj);
            }
        } else {
            // Fallback for non-DataTable scenario
            this.addUpdateButtonDirectly($moduleRow, obj);
        }
        
        marketplace.$btnUpdateAllModules.show();
    },
    
    /**
     * Adds update button directly to DOM without DataTable API
     * @param {jQuery} $moduleRow - The module row jQuery element
     * @param {Object} obj - The module object containing information
     */
    addUpdateButtonDirectly($moduleRow, obj) {
        const $currentDownloadButton = $moduleRow.find('a.download');
        $currentDownloadButton.remove();
        
        const dynamicButton = `<a href="#" class="ui basic icon button update popuped disable-if-no-internet" 
            data-content="${globalTranslate.ext_UpdateModule}"
            data-version ="${obj.version}"
            data-size = "${obj.size}"
            data-uniqid ="${obj.uniqid}" 
            data-releaseid ="${obj.release_id}">
            <i class="icon redo blue"></i> 
            </a>`;
        
        const $actionButtons = $moduleRow.find('.action-buttons');
        $actionButtons.prepend(dynamicButton);

        // Re-initialize all popups after DOM update
        extensionModules.initializePopups();
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

// Make marketplace globally accessible
window.marketplace = marketplace;