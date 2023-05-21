/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
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

/* global globalTranslate, PbxApi, Form, globalRootUrl */
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

    $bannedIpList: $('#banned-ip-list'), // The list of banned IPs
    $unbanButons: $('.unban-button'), // The unban buttons
    $enableCheckBox: $('#fail2ban-switch'),  // The checkbox for enabling Fail2Ban

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
                    type: 'integer[300..86400]',
                    prompt: globalTranslate.f2b_ValidateBanTimeRange,
                },
            ],
        },
    },

    // This method initializes the Fail2Ban management interface.
    initialize() {
        PbxApi.SystemGetBannedIp(fail2BanIndex.cbGetBannedIpList);
        fail2BanIndex.$bannedIpList.on('click', fail2BanIndex.$unbanButons, (e) => {
            const unbannedIp = $(e.target).attr('data-value');
            PbxApi.SystemUnBanIp(unbannedIp, fail2BanIndex.cbAfterUnBanIp);
        });

        fail2BanIndex.$enableCheckBox.checkbox({
            onChange() {
                fail2BanIndex.changeFieldsLook();
            },
        });
        fail2BanIndex.changeFieldsLook();
        fail2BanIndex.initializeForm();
    },

    // This method changes the look of the fields based on whether Fail2Ban is enabled or not.
    changeFieldsLook() {
        const checked = fail2BanIndex.$enableCheckBox.checkbox('is checked');
        fail2BanIndex.$formObj.find('.disability').each((index, obj) => {
            if (checked) {
                $(obj).removeClass('disabled');
            } else {
                $(obj).addClass('disabled');
            }
        });
    },

    // This callback method is used to display the list of banned IPs.
    cbGetBannedIpList(response) {
        if (response === false) {
            return;
        }
        let htmlTable = `<h2 class="ui header">${globalTranslate.f2b_TableBannedHeader}</h2>`;
        htmlTable += '<table class="ui very compact unstackable table">';
        htmlTable += '<thead>';
        htmlTable += `<th>${globalTranslate.f2b_Reason}</th>`;
        htmlTable += `<th>${globalTranslate.f2b_IpAddres}</th>`;
        htmlTable += `<th>${globalTranslate.f2b_BanedTime}</th>`;
        htmlTable += '<th></th>';
        htmlTable += '</thead>';
        htmlTable += '<tbody>';
        response.sort((a, b) => {
            const keyA = a.timeofban;
            const keyB = b.timeofban;
            // Compare the 2 dates
            if (keyA < keyB) return 1;
            if (keyA > keyB) return -1;
            return 0;
        });
        $.each(response, (key, value) => {
            const blockDate = new Date(value.timeofban * 1000);
            let reason = `f2b_Jail_${value.jail}`;
            if (reason in globalTranslate) {
                reason = globalTranslate[reason];
            }

            htmlTable += '<tr>';
            htmlTable += `<td>${reason}</td>`;
            htmlTable += `<td>${value.ip}</td>`;
            htmlTable += `<td>${blockDate.toLocaleString()}</td>`;
            htmlTable += `<td class="right aligned collapsing"><button class="ui icon basic mini button unban-button" data-value="${value.ip}"><i class="icon trash red"></i>${globalTranslate.f2b_Unban}</button></td>`;
            htmlTable += '</tr>';
        });
        if (response.length === 0) {
            htmlTable += `<tr><td colspan="4" class="center aligned">${globalTranslate.f2b_TableBannedEmpty}</td></tr>`;
        }
        htmlTable += '<tbody>';
        htmlTable += '</table>';
        fail2BanIndex.$bannedIpList.html(htmlTable);
    },

    // This callback method is used after an IP has been unbanned.
    cbAfterUnBanIp() {
        PbxApi.SystemGetBannedIp(fail2BanIndex.cbGetBannedIpList);
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

    },
    /**
     * Initialize the form with custom settings
     */
    initializeForm() {
        Form.$formObj = fail2BanIndex.$formObj;
        Form.url = `${globalRootUrl}fail2-ban/save`; // Form submission URL
        Form.validateRules = fail2BanIndex.validateRules; // Form validation rules
        Form.cbBeforeSendForm = fail2BanIndex.cbBeforeSendForm; // Callback before form is sent
        Form.cbAfterSendForm = fail2BanIndex.cbAfterSendForm; // Callback after form is sent
        Form.initialize();
    },
};

// When the document is ready, initialize the Fail2Ban management interface.
$(document).ready(() => {
    fail2BanIndex.initialize();
});

