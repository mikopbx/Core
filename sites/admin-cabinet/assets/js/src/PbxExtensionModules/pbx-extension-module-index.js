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

/* global SemanticLocalization, PbxExtensionStatus, keyCheck */

/**
 * Represents list of extension modules.
 * @class extensionModules
 * @memberof module:PbxExtensionModules
 */
const extensionModules = {

    /**
     * jQuery object for the table with installed modules.
     * @type {jQuery}
     */
    $installedModulesTable: $('#installed-modules-table'),

    /**
     * jQuery object for the checkboxes.
     * @type {jQuery}
     */
    $checkboxes: $('.module-row .checkbox'),

    /**
     * Store array of module checkboxes.
     * @type {array}
     */
    checkBoxes: [],

    /**
     * jQuery object for icon with popup text
     * @type {jQuery}
     */
    $popupOnClick: $('i.popup-on-click'),

    /**
     * jQuery object for the tabular menu.
     * @type {jQuery}
     */
    $tabMenuItems: $('#pbx-extensions-tab-menu .item'),

    /**
     * Initialize extensionModules list
     */
    initialize() {
        // Enable tab navigation with history support
        extensionModules.$tabMenuItems.tab({
            history: true,
            historyType: 'hash',
            onVisible(){
                if ($(this).data('tab')==='licensing'){
                    PbxApi.LicenseGetLicenseInfo(keyCheck.cbAfterGetLicenseInfo);
                }
            }
        });

        extensionModules.initializeDataTable();

        extensionModules.$popupOnClick.popup({
            on    : 'click',
            className: {
                popup: 'ui popup wide'
            }
        });

        extensionModules.$checkboxes.each((index, obj) => {
            const uniqId = $(obj).attr('data-value');
            const pageStatus = new PbxExtensionStatus();
            pageStatus.initialize(uniqId, false);
            extensionModules.checkBoxes.push(pageStatus);
        });

        $('a[data-content]').popup();
    },

    /**
     * Initialize data tables on table
     */
    initializeDataTable() {
        extensionModules.$installedModulesTable.DataTable({
            lengthChange: false,
            paging: false,
            columns: [
                {orderable: false, searchable: false},
                null,
                null,
                null,
                {orderable: false, searchable: false},
            ],
            autoWidth: false,
            language: SemanticLocalization.dataTableLocalisation,
        });

        // Move the "Add New" button to the first eight-column div
        $('.add-new').appendTo($('div.eight.column:eq(0)'));
    },

};

// When the document is ready, initialize the external modules table
$(document).ready(() => {
    extensionModules.initialize();
});
