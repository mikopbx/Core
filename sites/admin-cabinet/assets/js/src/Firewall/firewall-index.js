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

/* global globalRootUrl, globalTranslate */

/**
 * The `firewallTable` object contains methods and variables for managing the Firewall system.
 *
 * @module firewallTable
 */
const firewallTable = {
    // The status toggle for enabling/disabling the firewall
    $statusToggle: $('#status-toggle'),

    // The button for adding a new rule
    $addNewButton: $('#add-new-button'),

    // The settings section
    $settings: $('#firewall-settings'),

    // This method initializes the Firewall management interface.
    initialize() {

        // When a user double-clicks on a rule, they will be redirected to the modify page for that rule.
        $('.rule-row td').on('dblclick', (e) => {
            const id = $(e.target).closest('tr').attr('id');
            window.location = `${globalRootUrl}firewall/modify/${id}`;
        });

        // Setup checkbox to enable or disable the firewall.
        firewallTable.$statusToggle
            .checkbox({
                onChecked: firewallTable.enableFirewall,
                onUnchecked: firewallTable.disableFirewall,
            });
    },

    // Enable the firewall by making an HTTP request to the server.
    enableFirewall() {
        $.api({
            url: `${globalRootUrl}firewall/enable`,
            on: 'now',
            onSuccess(response) {
                response.success ? firewallTable.cbAfterEnabled(true) : firewallTable.cbAfterDisabled();
            },

        });
    },

    // Disable the firewall by making an HTTP request to the server.
    disableFirewall() {
        $.api({
            url: `${globalRootUrl}firewall/disable`,
            on: 'now',
            onSuccess(response) {
                response.success ? firewallTable.cbAfterDisabled(true) : firewallTable.cbAfterEnabled();
            },

        });
    },

    // Callback after the firewall has been enabled.
    cbAfterEnabled(sendEvent = false) {
        firewallTable.$statusToggle.find('label').text(globalTranslate.fw_StatusEnabled);
        firewallTable.$statusToggle.checkbox('set checked');
        $('i.icon.checkmark.green[data-value="off"]')
            .removeClass('checkmark green')
            .addClass('close red');
        $('i.icon.corner.close').hide();

        if (sendEvent) {
            const event = document.createEvent('Event');
            event.initEvent('ConfigDataChanged', false, true);
            window.dispatchEvent(event);
        }
    },

    // Callback after the firewall has been disabled.
    cbAfterDisabled(sendEvent = false) {
        firewallTable.$statusToggle.find('label').text(globalTranslate.fw_StatusDisabled);
        firewallTable.$statusToggle.checkbox('set unchecked');
        $('i.icon.close.red[data-value="off"]')
            .removeClass('close red')
            .addClass('checkmark green');
        $('i.icon.corner.close').show();
        if (sendEvent) {
            const event = document.createEvent('Event');
            event.initEvent('ConfigDataChanged', false, true);
            window.dispatchEvent(event);
        }
    },
};

// When the document is ready, initialize the Firewall management interface.
$(document).ready(() => {
    firewallTable.initialize();
});

