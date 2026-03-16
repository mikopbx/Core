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
     * The parent segment containing the banned IPs tab (for dimmer overlay)
     * @type {jQuery}
     */
    $bannedIpTabSegment: $('#banned-ip-list-table').closest('.segment'),

    /**
     * jQuery object Maximum number of requests.
     * @type {jQuery}
     */
    $maxReqSlider: $('#PBXFirewallMaxReqSec'),

    /**
     * jQuery object for the ban time slider.
     * @type {jQuery}
     */
    $banTimeSlider: $('#BanTimeSlider'),

    /**
     * jQuery object for the find time slider.
     * @type {jQuery}
     */
    $findTimeSlider: $('#FindTimeSlider'),

    /**
     * Possible period values for the records retention.
     */
    maxReqValue: ['10', '30', '100', '300', '0'],

    /**
     * Possible ban time values in seconds.
     */
    banTimeValues: ['10800', '43200', '86400', '259200', '604800'],

    /**
     * Possible find time values in seconds.
     */
    findTimeValues: ['600', '1800', '3600', '10800'],

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
                    type: 'integer[2..99]',
                    prompt: globalTranslate.f2b_ValidateMaxRetryRange,
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

        fail2BanIndex.showBannedListLoader();
        FirewallAPI.getBannedIps(fail2BanIndex.cbGetBannedIpList);

        fail2BanIndex.$bannedIpListTable.on('click', '.unban-button', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const unbannedIp = $(e.currentTarget).attr('data-value');
            fail2BanIndex.showBannedListLoader();
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

        // Initialize ban time slider
        if (fail2BanIndex.$banTimeSlider.length > 0) {
            fail2BanIndex.$banTimeSlider
                .slider({
                    min: 0,
                    max: 4,
                    step: 1,
                    smooth: true,
                    interpretLabel: function (value) {
                        let labels = [
                            globalTranslate.f2b_BanTime3Hours,
                            globalTranslate.f2b_BanTime12Hours,
                            globalTranslate.f2b_BanTime24Hours,
                            globalTranslate.f2b_BanTime3Days,
                            globalTranslate.f2b_BanTime7Days,
                        ];
                        return labels[value];
                    },
                    onChange: fail2BanIndex.cbAfterSelectBanTimeSlider,
                });
            const banTime = fail2BanIndex.$formObj.form('get value', 'bantime');
            const idx = fail2BanIndex.banTimeValues.indexOf(String(banTime));
            fail2BanIndex.$banTimeSlider
                .slider('set value', idx >= 0 ? idx : 2, false);
        }

        // Initialize find time slider
        if (fail2BanIndex.$findTimeSlider.length > 0) {
            fail2BanIndex.$findTimeSlider
                .slider({
                    min: 0,
                    max: 3,
                    step: 1,
                    smooth: true,
                    interpretLabel: function (value) {
                        let labels = [
                            globalTranslate.f2b_FindTime10Min,
                            globalTranslate.f2b_FindTime30Min,
                            globalTranslate.f2b_FindTime1Hour,
                            globalTranslate.f2b_FindTime3Hours,
                        ];
                        return labels[value];
                    },
                    onChange: fail2BanIndex.cbAfterSelectFindTimeSlider,
                });
            const findTime = fail2BanIndex.$formObj.form('get value', 'findtime');
            const findIdx = fail2BanIndex.findTimeValues.indexOf(String(findTime));
            fail2BanIndex.$findTimeSlider
                .slider('set value', findIdx >= 0 ? findIdx : 2, false);
        }
    },

    /**
     * Handle event after the select save period slider is changed.
     * @param {number} value - The selected value from the slider.
     */
    cbAfterSelectMaxReqSlider(value) {
        const maxReq = fail2BanIndex.maxReqValue[value];
        fail2BanIndex.$formObj.form('set value', 'PBXFirewallMaxReqSec', maxReq);
        Form.dataChanged();
    },

    /**
     * Handle event after the ban time slider is changed.
     * @param {number} value - The selected slider position.
     */
    cbAfterSelectBanTimeSlider(value) {
        const banTime = fail2BanIndex.banTimeValues[value];
        fail2BanIndex.$formObj.form('set value', 'bantime', banTime);
        Form.dataChanged();
    },

    /**
     * Handle event after the find time slider is changed.
     * @param {number} value - The selected slider position.
     */
    cbAfterSelectFindTimeSlider(value) {
        const findTime = fail2BanIndex.findTimeValues[value];
        fail2BanIndex.$formObj.form('set value', 'findtime', findTime);
        Form.dataChanged();
    },


    /**
     * Mapping of jail names to short tag labels and colors.
     * Used to render compact colored labels instead of verbose ban reason text.
     */
    jailTagMap: {
        'asterisk_ami_v2': { tag: 'AMI', color: 'orange' },
        'asterisk_error_v2': { tag: 'SIP', color: 'blue' },
        'asterisk_public_v2': { tag: 'SIP', color: 'blue' },
        'asterisk_security_log_v2': { tag: 'SIP', color: 'blue' },
        'asterisk_v2': { tag: 'SIP', color: 'blue' },
        'asterisk_iax_v2': { tag: 'IAX', color: 'teal' },
        'dropbear_v2': { tag: 'SSH', color: 'grey' },
        'mikopbx-exploit-scanner_v2': { tag: 'SCAN', color: 'red' },
        'mikopbx-nginx-errors_v2': { tag: 'NGINX', color: 'purple' },
        'mikopbx-www_v2': { tag: 'WEB', color: 'olive' },
    },

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
            lengthChange: false,
            paging: true,
            pageLength: fail2BanIndex.calculatePageLength(),
            scrollCollapse: true,
            deferRender: true,
            columns: [
                // IP
                {
                    orderable: true,
                    searchable: true,
                },
                // Reason tags
                {
                    orderable: false,
                    searchable: false,
                },
                // Ban date
                {
                    orderable: true,
                    searchable: false,
                },
                // Expires
                {
                    orderable: true,
                    searchable: false,
                },
                // Buttons
                {
                    orderable: false,
                    searchable: false,
                },
            ],
            order: [0, 'asc'],
            language: SemanticLocalization.dataTableLocalisation,
            createdRow(row) {
                $('td', row).eq(0).addClass('collapsing');
                $('td', row).eq(2).addClass('collapsing');
                $('td', row).eq(3).addClass('collapsing');
                $('td', row).eq(4).addClass('collapsing');
            },
            drawCallback() {
                // Initialize popups after each DataTable draw (handles pagination)
                fail2BanIndex.$bannedIpListTable.find('.country-flag').popup({
                    hoverable: true,
                    position: 'top center',
                    delay: { show: 300, hide: 100 },
                });
                fail2BanIndex.$bannedIpListTable.find('.ban-reason-tag').popup({
                    hoverable: true,
                    position: 'top center',
                    delay: { show: 300, hide: 100 },
                });
            },
        });
    },

    /**
     * Build HTML for reason tags from ban entries.
     * Groups bans by tag label, deduplicates, and renders colored labels with popup tooltips.
     *
     * @param {Array} bans - Array of ban objects with jail, timeofban, timeunban properties.
     * @returns {string} HTML string with tag labels.
     */
    buildReasonTags(bans) {
        // Group by tag label to deduplicate (e.g. multiple SIP jails → one SIP tag)
        const tagGroups = {};
        bans.forEach(ban => {
            const jail = ban.jail || '';
            const mapping = fail2BanIndex.jailTagMap[jail] || { tag: jail, color: 'grey' };
            const translateKey = `f2b_Jail_${jail}`;
            const fullReason = globalTranslate[translateKey] || jail;

            if (!tagGroups[mapping.tag]) {
                tagGroups[mapping.tag] = {
                    color: mapping.color,
                    reasons: [],
                };
            }
            // Avoid duplicate reasons within the same tag group
            if (tagGroups[mapping.tag].reasons.indexOf(fullReason) === -1) {
                tagGroups[mapping.tag].reasons.push(fullReason);
            }
        });

        let html = '';
        Object.keys(tagGroups).forEach(tag => {
            const group = tagGroups[tag];
            const tooltipContent = group.reasons.join(', ');
            html += `<span class="ui mini ${group.color} label ban-reason-tag" data-content="${tooltipContent}" data-position="top center">${tag}</span> `;
        });
        return html;
    },

    // This callback method is used to display the list of banned IPs.
    cbGetBannedIpList(response) {
        fail2BanIndex.hideBannedListLoader();
        if (response === false || !response.result) {
            return;
        }

        const bannedIps = response.data || {};

        fail2BanIndex.dataTable.clear();

        const newData = [];
        Object.keys(bannedIps).forEach(ip => {
            const ipData = bannedIps[ip];
            const bans = ipData.bans || [];
            const country = ipData.country || '';
            const countryName = ipData.countryName || '';

            // Build IP display with country flag
            let ipDisplay = ip;
            if (country) {
                ipDisplay = `<span class="country-flag" data-content="${countryName}" data-position="top center"><i class="flag ${country.toLowerCase()}"></i></span>${ip}`;
            }

            // Build reason tags
            const reasonTags = fail2BanIndex.buildReasonTags(bans);

            // Calculate earliest ban date and latest expiry across all bans
            let earliestBan = Infinity;
            let latestExpiry = 0;
            bans.forEach(ban => {
                if (ban.timeofban < earliestBan) {
                    earliestBan = ban.timeofban;
                }
                if (ban.timeunban > latestExpiry) {
                    latestExpiry = ban.timeunban;
                }
            });

            const banDateStr = earliestBan < Infinity
                ? `<span data-order="${earliestBan}">${fail2BanIndex.formatDateTime(earliestBan)}</span>`
                : '';
            const expiresStr = latestExpiry > 0
                ? `<span data-order="${latestExpiry}">${fail2BanIndex.formatDateTime(latestExpiry)}</span>`
                : '';

            const row = [
                ipDisplay,
                reasonTags,
                banDateStr,
                expiresStr,
                `<button class="ui icon basic mini button right floated unban-button" data-value="${ip}"><i class="icon trash red"></i> ${globalTranslate.f2b_Unban}</button>`,
            ];
            newData.push(row);
        });

        fail2BanIndex.dataTable.rows.add(newData).draw();
    },

    // This callback method is used after an IP has been unbanned.
    cbAfterUnBanIp() {
        fail2BanIndex.showBannedListLoader();
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

                // Update sliders if they exist
                if (fail2BanIndex.$maxReqSlider.length > 0) {
                    const maxReq = data.PBXFirewallMaxReqSec || '10';
                    fail2BanIndex.$maxReqSlider.slider('set value', fail2BanIndex.maxReqValue.indexOf(maxReq), false);
                }
                if (fail2BanIndex.$banTimeSlider.length > 0) {
                    const banTime = String(data.bantime || '86400');
                    const idx = fail2BanIndex.banTimeValues.indexOf(banTime);
                    fail2BanIndex.$banTimeSlider.slider('set value', idx >= 0 ? idx : 2, false);
                }
                if (fail2BanIndex.$findTimeSlider.length > 0) {
                    const findTime = String(data.findtime || '1800');
                    const findIdx = fail2BanIndex.findTimeValues.indexOf(findTime);
                    fail2BanIndex.$findTimeSlider.slider('set value', findIdx >= 0 ? findIdx : 2, false);
                }
            }
        });
    },

    /**
     * Format unix timestamp as DD.MM.YYYY HH:MM
     *
     * @param {number} timestamp - Unix timestamp in seconds.
     * @returns {string} Formatted date string.
     */
    formatDateTime(timestamp) {
        const d = new Date(timestamp * 1000);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${day}.${month}.${year} ${hours}:${minutes}`;
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
     * Show dimmer with loader on the banned IPs tab segment
     */
    showBannedListLoader() {
        if (!fail2BanIndex.$bannedIpTabSegment.find('> .ui.dimmer').length) {
            fail2BanIndex.$bannedIpTabSegment.append(
                `<div class="ui inverted dimmer">
                    <div class="ui text loader">${globalTranslate.ex_LoadingData}</div>
                </div>`
            );
        }
        fail2BanIndex.$bannedIpTabSegment.find('> .ui.dimmer').addClass('active');
    },

    /**
     * Hide dimmer on the banned IPs tab segment
     */
    hideBannedListLoader() {
        fail2BanIndex.$bannedIpTabSegment.find('> .ui.dimmer').removeClass('active');
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

