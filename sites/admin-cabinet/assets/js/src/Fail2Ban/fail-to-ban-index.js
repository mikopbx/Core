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

/* global globalTranslate, PbxApi, Form, globalRootUrl, Datatable, SemanticLocalization, FirewallAPI, Fail2BanAPI, Fail2BanTooltipManager */
/**
 * The `fail2BanIndex` object contains methods and variables for managing the Fail2Ban system.
 *
 * @module fail2BanIndex
 */
const fail2BanIndex = {

    /**
     * jQuery object for the form.
     * @type {jQuery}
     */
    $formObj: $('#fail2ban-settings-form'),

    /**
     * The list of banned IPs
     * @type {jQuery}
     */
    $bannedIpListTable: $('#banned-ip-list-table'),

    /**
     * jQuery object Maximum number of requests.
     * @type {jQuery}
     */
    $maxReqSlider: $('#PBXFirewallMaxReqSec'),

    /**
     * Possible period values for the records retention.
     */
    maxReqValue: ['10', '30', '100', '300', '0'],

    /**
     * The list of banned IPs
     * @type {Datatable}
     */
    dataTable: null,

    /**
     * The unban buttons
     * @type {jQuery}
     */
    $unbanButtons: $('.unban-button'),

    /**
     * The global search input element.
     * @type {jQuery}
     */
    $globalSearch: $('#global-search'),

    /**
     * Validation rules for the form fields before submission.
     *
     * @type {object}
     */
    validateRules: {
        maxretry: {
            identifier: 'maxretry',
            rules: [
                {
                    type: 'integer[3..99]',
                    prompt: globalTranslate.f2b_ValidateMaxRetryRange,
                },
            ],
        },
        findtime: {
            identifier: 'findtime',
            rules: [
                {
                    type: 'integer[300..86400]',
                    prompt: globalTranslate.f2b_ValidateFindTimeRange,
                },
            ],
        },
        bantime: {
            identifier: 'bantime',
            rules: [
                {
                    type: 'integer[300..259200]',
                    prompt: globalTranslate.f2b_ValidateBanTimeRange,
                },
            ],
        },
    },

    // This method initializes the Fail2Ban management interface.
    initialize() {
        $('#fail2ban-tab-menu .item').tab();
        fail2BanIndex.initializeDataTable();
        fail2BanIndex.initializeForm();
        fail2BanIndex.loadSettings();

        // Initialize tooltips for form fields
        if (typeof Fail2BanTooltipManager !== 'undefined') {
            Fail2BanTooltipManager.initialize();
        }

        FirewallAPI.getBannedIps(fail2BanIndex.cbGetBannedIpList);

        fail2BanIndex.$bannedIpListTable.on('click', fail2BanIndex.$unbanButtons, (e) => {
            const unbannedIp = $(e.target).attr('data-value');
            fail2BanIndex.$bannedIpListTable.addClass('loading');
            FirewallAPI.unbanIp(unbannedIp, fail2BanIndex.cbAfterUnBanIp);
        });

        // Initialize records save period slider only if it exists (not in Docker)
        if (fail2BanIndex.$maxReqSlider.length > 0) {
            fail2BanIndex.$maxReqSlider
                .slider({
                    min: 0,
                    max: 4,
                    step: 1,
                    smooth: true,
                    interpretLabel: function (value) {
                        let labels = [
                            globalTranslate.f2b_MaxReqSec10,
                            globalTranslate.f2b_MaxReqSec30,
                            globalTranslate.f2b_MaxReqSec100,
                            globalTranslate.f2b_MaxReqSec300,
                            globalTranslate.f2b_MaxReqSecUnlimited,
                        ];
                        return labels[value];
                    },
                    onChange: fail2BanIndex.cbAfterSelectMaxReqSlider,
                })
            ;
            const maxReq = fail2BanIndex.$formObj.form('get value', 'PBXFirewallMaxReqSec');
            fail2BanIndex.$maxReqSlider
                .slider('set value', fail2BanIndex.maxReqValue.indexOf(maxReq), false);
        }
    },

    /**
     * Handle event after the select save period slider is changed.
     * @param {number} value - The selected value from the slider.
     */
    cbAfterSelectMaxReqSlider(value) {
        // Get the save period corresponding to the slider value.
        const maxReq = fail2BanIndex.maxReqValue[value];
        // Set the form value for 'PBXRecordSavePeriod' to the selected save period.
        fail2BanIndex.$formObj.form('set value', 'PBXFirewallMaxReqSec', maxReq);
        // Trigger change event to acknowledge the modification
        Form.dataChanged();
    },


    /**
     * Initialize data table on the page
     *
     */
    initializeDataTable(){
        $('#fail2ban-tab-menu .item').tab({
            onVisible(){
                if ($(this).data('tab')==='banned' && fail2BanIndex.dataTable!==null){
                    const newPageLength = fail2BanIndex.calculatePageLength();
                    fail2BanIndex.dataTable.page.len(newPageLength).draw(false);
                }
            }
        });

        fail2BanIndex.dataTable = fail2BanIndex.$bannedIpListTable.DataTable({
            // destroy: true,
            lengthChange: false,
            paging: true,
            pageLength: fail2BanIndex.calculatePageLength(),
            scrollCollapse: true,
            deferRender: true,
            columns: [
                // IP
                {
                    orderable: true,  // This column is orderable
                    searchable: true  // This column is searchable
                },
                // Reason
                {
                    orderable: false,  // This column is not orderable
                    searchable: false  // This column is not searchable
                },
                // Buttons
                {
                    orderable: false,  // This column is orderable
                    searchable: false  // This column is searchable
                },
            ],
            order: [0, 'asc'],
            language: SemanticLocalization.dataTableLocalisation,
            /**
             * Constructs the Extensions row.
             * @param {HTMLElement} row - The row element.
             * @param {Array} data - The row data.
             */
            createdRow(row, data) {
                $('td', row).eq(0).addClass('collapsing');
                $('td', row).eq(2).addClass('collapsing');
            },
        });
    },

    // This callback method is used to display the list of banned IPs.
    cbGetBannedIpList(response) {
        fail2BanIndex.$bannedIpListTable.removeClass('loading');
        if (response === false || !response.result) {
            return;
        }

        // Extract data from response
        const bannedIps = response.data || {};

        // Clear the DataTable
        fail2BanIndex.dataTable.clear();

        // Prepare the new data to be added
        let newData = [];
        Object.keys(bannedIps).forEach(ip => {
            const bans = bannedIps[ip];
            // Combine all reasons and dates for this IP into one string
            let reasonsDatesCombined = bans.map(ban => {
                const blockDate = new Date(ban.timeofban * 1000).toLocaleString();
                let reason = `f2b_Jail_${ban.jail}`;
                if (reason in globalTranslate) {
                    reason = globalTranslate[reason];
                }
                return `${reason} - ${blockDate}`;
            }).join('<br>'); // Use line breaks to separate each reason-date pair

            // Construct a row: IP, Combined Reasons and Dates, Unban Button
            const row = [
                ip,
                reasonsDatesCombined,
                `<button class="ui icon basic mini button right floated unban-button" data-value="${ip}"><i class="icon trash red"></i>${globalTranslate.f2b_Unban}</button>`
            ];
            newData.push(row);
        });

        // Add the new data and redraw the table
        fail2BanIndex.dataTable.rows.add(newData).draw();
    },

    // This callback method is used after an IP has been unbanned.
    cbAfterUnBanIp() {
        FirewallAPI.getBannedIps(fail2BanIndex.cbGetBannedIpList);
    },

    /**
     * Callback function to be called before the form is sent
     * @param {Object} settings - The current settings of the form
     * @returns {Object} - The updated settings of the form
     */
    cbBeforeSendForm(settings) {
        const result = settings;
        result.data = fail2BanIndex.$formObj.form('get values');
        return result;
    },

    /**
     * Callback function to be called after the form has been sent.
     * @param {Object} response - The response from the server after the form is sent
     */
    cbAfterSendForm(response) {
        // Response handling is done by Form.js
        // This callback is for additional processing if needed
    },

    /**
     * Load Fail2Ban settings from API
     */
    loadSettings() {
        Fail2BanAPI.getSettings((response) => {
            if (response.result && response.data) {
                const data = response.data;
                // Set form values
                fail2BanIndex.$formObj.form('set values', {
                    maxretry: data.maxretry,
                    bantime: data.bantime,
                    findtime: data.findtime,
                    whitelist: data.whitelist,
                    PBXFirewallMaxReqSec: data.PBXFirewallMaxReqSec
                });

                // Update slider if it exists
                if (fail2BanIndex.$maxReqSlider.length > 0) {
                    const maxReq = data.PBXFirewallMaxReqSec || '10';
                    fail2BanIndex.$maxReqSlider.slider('set value', fail2BanIndex.maxReqValue.indexOf(maxReq), false);
                }
            }
        });
    },

    /**
     * Calculate data table page length
     *
     * @returns {number}
     */
    calculatePageLength() {
        // Calculate row height
        let rowHeight = fail2BanIndex.$bannedIpListTable.find('tr').last().outerHeight();
        // Calculate window height and available space for table
        const windowHeight = window.innerHeight;
        const headerFooterHeight = 400; // Estimate height for header, footer, and other elements

        // Calculate new page length
        return Math.max(Math.floor((windowHeight - headerFooterHeight) / rowHeight), 10);
    },

    /**
     * Initialize the form with custom settings
     */
    initializeForm() {
        Form.$formObj = fail2BanIndex.$formObj;
        Form.validateRules = fail2BanIndex.validateRules;
        Form.cbBeforeSendForm = fail2BanIndex.cbBeforeSendForm;
        Form.cbAfterSendForm = fail2BanIndex.cbAfterSendForm;

        // Configure REST API settings for Form.js (singleton resource)
        Form.apiSettings = {
            enabled: true,
            apiObject: Fail2BanAPI,
            saveMethod: 'update' // Using standard PUT for singleton update
        };

        Form.initialize();
    },
};

// When the document is ready, initialize the Fail2Ban management interface.
$(document).ready(() => {
    fail2BanIndex.initialize();
});

