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
     * jQuery object for the security preset slider.
     * @type {jQuery}
     */
    $securityPresetSlider: $('#SecurityPresetSlider'),

    /**
     * Security preset definitions.
     * Each preset defines maxretry, findtime (seconds), and bantime (seconds).
     */
    securityPresets: [
        { // 0: Weak
            maxretry: 20,
            findtime: 600,     // 10 min
            bantime: 600,      // 10 min
            maxReqSec: 500,    // SIP rate limit (disabled if >200 extensions)
        },
        { // 1: Normal
            maxretry: 10,
            findtime: 3600,    // 1 hour
            bantime: 86400,    // 1 day
            maxReqSec: 300,
        },
        { // 2: Enhanced
            maxretry: 5,
            findtime: 21600,   // 6 hours
            bantime: 604800,   // 7 days
            maxReqSec: 150,
        },
        { // 3: Paranoid
            maxretry: 3,
            findtime: 86400,   // 24 hours
            bantime: 2592000,  // 30 days
            maxReqSec: 100,
        },
    ],

    /**
     * Number of extensions — loaded from API to determine MaxReqSec behavior.
     * If >200, MaxReqSec is disabled (NAT scenario).
     * @type {number}
     */
    extensionsCount: 0,

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
    validateRules: {},

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

        // Initialize security preset slider
        if (fail2BanIndex.$securityPresetSlider.length > 0) {
            fail2BanIndex.$securityPresetSlider
                .slider({
                    min: 0,
                    max: 3,
                    step: 1,
                    smooth: true,
                    interpretLabel: function (value) {
                        const labels = [
                            globalTranslate.f2b_SecurityPresetWeak,
                            globalTranslate.f2b_SecurityPresetNormal,
                            globalTranslate.f2b_SecurityPresetEnhanced,
                            globalTranslate.f2b_SecurityPresetParanoid,
                        ];
                        return labels[value];
                    },
                    onChange: fail2BanIndex.cbAfterSelectSecurityPreset,
                });
        }
    },

    /**
     * Handle event after the security preset slider is changed.
     * Updates maxretry, findtime, bantime values and the info panel.
     * @param {number} value - The selected preset index (0-3).
     */
    cbAfterSelectSecurityPreset(value) {
        const preset = fail2BanIndex.securityPresets[value];
        if (!preset) return;

        // Update hidden form fields
        fail2BanIndex.$formObj.form('set value', 'maxretry', preset.maxretry);
        fail2BanIndex.$formObj.form('set value', 'findtime', preset.findtime);
        fail2BanIndex.$formObj.form('set value', 'bantime', preset.bantime);

        // Set MaxReqSec: disabled (0) if >200 extensions (NAT scenario)
        const maxReqSec = fail2BanIndex.extensionsCount > 200 ? 0 : preset.maxReqSec;
        fail2BanIndex.$formObj.form('set value', 'PBXFirewallMaxReqSec', String(maxReqSec));

        // Update info panel
        fail2BanIndex.updatePresetInfoPanel(preset);

        Form.dataChanged();
    },

    /**
     * Update the info panel with preset values.
     * @param {Object} preset - The preset object with maxretry, findtime, bantime.
     */
    updatePresetInfoPanel(preset) {
        $('#preset-maxretry-value').text(preset.maxretry);
        $('#preset-findtime-value').text(fail2BanIndex.formatDuration(preset.findtime));
        $('#preset-bantime-value').text(fail2BanIndex.formatDuration(preset.bantime));
    },

    /**
     * Format seconds into a human-readable duration string.
     * @param {number} seconds - Duration in seconds.
     * @returns {string} Formatted duration.
     */
    formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days}${globalTranslate.f2b_DurationDays}`;
        }
        if (hours > 0) {
            return `${hours}${globalTranslate.f2b_DurationHours}`;
        }
        return `${minutes}${globalTranslate.f2b_DurationMinutes}`;
    },

    /**
     * Detect which security preset matches current values.
     * Returns preset index (0-3) or defaults to 1 (Normal) if no exact match.
     * @param {number} maxretry
     * @param {number} findtime - in seconds
     * @param {number} bantime - in seconds
     * @returns {number} Preset index.
     */
    detectPresetLevel(maxretry, findtime, bantime) {
        for (let i = 0; i < fail2BanIndex.securityPresets.length; i++) {
            const p = fail2BanIndex.securityPresets[i];
            if (p.maxretry === maxretry && p.findtime === findtime && p.bantime === bantime) {
                return i;
            }
        }
        // No exact match — find closest by comparing bantime
        let closest = 1;
        let minDiff = Infinity;
        for (let i = 0; i < fail2BanIndex.securityPresets.length; i++) {
            const diff = Math.abs(fail2BanIndex.securityPresets[i].bantime - bantime);
            if (diff < minDiff) {
                minDiff = diff;
                closest = i;
            }
        }
        return closest;
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

        // Normalize whitelist: split by any delimiter, keep only valid IPs/CIDRs
        if (result.data.whitelist) {
            const entries = result.data.whitelist.split(/[\s,;]+/).filter(entry => {
                entry = entry.trim();
                if (!entry) return false;
                // Basic IPv4, IPv6, CIDR validation
                return /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/.test(entry)
                    || /^[0-9a-fA-F:]+(\/\d{1,3})?$/.test(entry);
            });
            result.data.whitelist = entries.join(' ');
        }

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

                // Store extensions count for MaxReqSec calculation
                fail2BanIndex.extensionsCount = parseInt(data.extensionsCount, 10) || 0;

                // Detect and set security preset level
                if (fail2BanIndex.$securityPresetSlider.length > 0) {
                    const presetIdx = fail2BanIndex.detectPresetLevel(
                        parseInt(data.maxretry, 10),
                        parseInt(data.findtime, 10),
                        parseInt(data.bantime, 10)
                    );
                    fail2BanIndex.$securityPresetSlider.slider('set value', presetIdx, false);
                    fail2BanIndex.updatePresetInfoPanel(fail2BanIndex.securityPresets[presetIdx]);
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
