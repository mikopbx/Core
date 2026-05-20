/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

/* global globalTranslate */

/**
 * extensionSipConnectionHint - Inline cheat-sheet under the Secret field
 * showing per-transport (UDP/TCP, TLS, WSS) SIP client connection parameters.
 *
 * Values reflect server-side data (PbxSettings: external/internal ports,
 * SIPAuthPrefix, AJAM_PORT_TLS) plus the live extension number from the form.
 * No interactive behavior beyond clipboard copy and reactive recomputation
 * when the number changes.
 */
const extensionSipConnectionHint = {
    STORAGE_KEY: 'mikopbx_sip_conn_hint_collapsed',
    $hint: null,
    $numberInput: null,
    config: null,

    initialize() {
        extensionSipConnectionHint.$hint = $('#sip-connection-hint');
        if (extensionSipConnectionHint.$hint.length === 0) {
            return;
        }

        const ds = extensionSipConnectionHint.$hint.data();
        extensionSipConnectionHint.config = {
            authPrefix: (ds.authPrefix || '').toString(),
            sipPort: parseInt(ds.sipPort, 10),
            sipPortInternal: parseInt(ds.sipPortInternal, 10),
            hasExtSip: ds.hasExtSip === 1 || ds.hasExtSip === '1',
            tlsPort: parseInt(ds.tlsPort, 10),
            tlsPortInternal: parseInt(ds.tlsPortInternal, 10),
            hasExtTls: ds.hasExtTls === 1 || ds.hasExtTls === '1',
            wssPort: parseInt(ds.wssPort, 10),
            wssPath: (ds.wssPath || '').toString(),
        };

        // Defensive cleanup - guards against duplicate handlers if initialize()
        // ever fires twice (e.g. SPA-style navigation via jquery.address).
        extensionSipConnectionHint.$numberInput = $('#number');
        extensionSipConnectionHint.$numberInput.off('.sipConnHint');
        $(document).off('FormPopulated.sipConnHint');
        $('#sip-conn-hint-copy').off('.sipConnHint .sipConnHintStop');
        $('#sip-conn-hint-toggle').off('.sipConnHint');

        extensionSipConnectionHint.$numberInput.on(
            'input.sipConnHint change.sipConnHint',
            extensionSipConnectionHint.render
        );

        // The extension number is populated asynchronously by extension-modify.js
        // after the REST API response. Form.populateFormSilently fires a global
        // 'FormPopulated' event once values are set; rerender at that point.
        $(document).on('FormPopulated.sipConnHint', extensionSipConnectionHint.render);

        $('#sip-conn-hint-copy').on('click.sipConnHint', extensionSipConnectionHint.copyAll);

        extensionSipConnectionHint.initializeCollapsible();
        extensionSipConnectionHint.render();
    },

    /**
     * Wire up collapse/expand on the header. The block starts collapsed in the
     * markup; localStorage may override that with the previously saved state.
     * Keyboard support: Enter / Space toggle when header is focused.
     */
    initializeCollapsible() {
        let saved = null;
        try {
            saved = localStorage.getItem(extensionSipConnectionHint.STORAGE_KEY);
        } catch (e) {
            saved = null;
        }
        if (saved === '0') {
            extensionSipConnectionHint.setCollapsed(false);
        } else if (saved === '1') {
            extensionSipConnectionHint.setCollapsed(true);
        }
        // saved === null → keep server-rendered default (collapsed)

        const $header = $('#sip-conn-hint-toggle');
        $header.on('click.sipConnHint', extensionSipConnectionHint.onHeaderClick);
        $header.on('keydown.sipConnHint', extensionSipConnectionHint.onHeaderKey);

        // Copy button lives inside the header - stop clicks AND keydowns
        // (Enter/Space) from bubbling and toggling the collapsible.
        $('#sip-conn-hint-copy')
            .on('click.sipConnHintStop', (e) => e.stopPropagation())
            .on('keydown.sipConnHintStop', (e) => {
                if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                    e.stopPropagation();
                }
            });
    },

    onHeaderClick() {
        const collapsed = extensionSipConnectionHint.$hint.hasClass('collapsed');
        extensionSipConnectionHint.setCollapsed(!collapsed);
    },

    onHeaderKey(e) {
        // ' ' is the modern key for space; older Edge/IE report 'Spacebar'.
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            const collapsed = extensionSipConnectionHint.$hint.hasClass('collapsed');
            extensionSipConnectionHint.setCollapsed(!collapsed);
        }
    },

    setCollapsed(collapsed) {
        // No-op when state already matches - avoids spurious cross-tab
        // 'storage' events and redundant DOM writes.
        if (extensionSipConnectionHint.$hint.hasClass('collapsed') === collapsed) {
            return;
        }
        extensionSipConnectionHint.$hint.toggleClass('collapsed', collapsed);
        $('#sip-conn-hint-toggle').attr('aria-expanded', collapsed ? 'false' : 'true');
        try {
            localStorage.setItem(extensionSipConnectionHint.STORAGE_KEY, collapsed ? '1' : '0');
        } catch (e) {
            // localStorage unavailable - state will not persist; safe to ignore.
        }
    },

    /**
     * Compute connection parameters for the current extension number
     * and inject them into the corresponding table cells.
     */
    render() {
        const number = (extensionSipConnectionHint.$numberInput.val() || '').trim();
        if (number === '') {
            extensionSipConnectionHint.$hint.find('code').text('—');
            return;
        }

        const cfg = extensionSipConnectionHint.config;
        const authUsername = number + cfg.authPrefix;

        const rows = {
            udp: {
                username: number,
                auth: authUsername,
                port: cfg.sipPort,
                portInternal: cfg.sipPortInternal,
                hasExt: cfg.hasExtSip,
            },
            tls: {
                username: `${number}-TLS`,
                auth: authUsername,
                port: cfg.tlsPort,
                portInternal: cfg.tlsPortInternal,
                hasExt: cfg.hasExtTls,
            },
            wss: {
                username: `${number}-WS`,
                auth: authUsername,
            },
        };

        Object.keys(rows).forEach((transport) => {
            const $row = extensionSipConnectionHint.$hint.find(`tr[data-transport="${transport}"]`);
            const row = rows[transport];
            $row.find('.sip-conn-hint-username').text(row.username);
            $row.find('.sip-conn-hint-auth').text(row.auth);

            if (transport === 'wss') {
                $row.find('.sip-conn-hint-wss').text(`${cfg.wssPort} → ${cfg.wssPath}`);
                return;
            }

            // Show both ports inline when external differs from internal
            // (e.g. NAT/port-forwarding). One number when they match.
            const portText = row.hasExt
                ? `${row.port} / ${row.portInternal}`
                : `${row.port}`;
            $row.find('.sip-conn-hint-port').text(portText);
        });
    },

    /**
     * Copy all three transport rows plus the SIP secret to the clipboard
     * as a single text block.
     */
    copyAll(event) {
        event.preventDefault();
        const number = (extensionSipConnectionHint.$numberInput.val() || '').trim();
        if (number === '') {
            return;
        }

        const cfg = extensionSipConnectionHint.config;
        const auth = number + cfg.authPrefix;
        // Tab-separated so paste survives variable-width extension numbers.
        const lines = [
            `UDP/TCP\tusername=${number}\tauth=${auth}\tport=${cfg.sipPort}`,
            `TLS\tusername=${number}-TLS\tauth=${auth}\tport=${cfg.tlsPort}`,
            `WSS\tusername=${number}-WS\tauth=${auth}\t${cfg.wssPort}${cfg.wssPath}`,
        ];
        // Append the SIP secret only when the partial sits next to the secret
        // field (extensions/modify); skipped on any future reuse without it.
        const $secret = $('#sip_secret');
        if ($secret.length > 0) {
            lines.push(`secret=${($secret.val() || '').toString()}`);
        }

        extensionSipConnectionHint.writeToClipboard(lines.join('\n'));
    },

    /**
     * Cross-environment clipboard write with graceful fallback to a temporary
     * textarea selection for browsers without the Clipboard API.
     * On success briefly swaps the button icon to a checkmark - no toast.
     */
    writeToClipboard(text) {
        const onSuccess = () => {
            const $icon = $('#sip-conn-hint-copy i');
            const originalClasses = $icon.attr('class');
            $icon.attr('class', 'check icon');
            setTimeout(() => $icon.attr('class', originalClasses), 1200);
        };

        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            navigator.clipboard.writeText(text).then(onSuccess).catch(() => {
                extensionSipConnectionHint.fallbackCopy(text, onSuccess);
            });
            return;
        }

        extensionSipConnectionHint.fallbackCopy(text, onSuccess);
    },

    fallbackCopy(text, onSuccess) {
        const $ta = $('<textarea>').css({
            position: 'fixed',
            top: 0,
            left: 0,
            opacity: 0,
        }).val(text);
        $('body').append($ta);
        $ta[0].select();
        try {
            document.execCommand('copy');
            onSuccess();
        } catch (e) {
            // Clipboard unavailable - nothing else we can do here.
        }
        $ta.remove();
    },
};

$(document).ready(() => {
    extensionSipConnectionHint.initialize();
});
