/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2026 Alexey Portnov and Nikolay Beketov
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

/* global globalTranslate, globalRootUrl, Fail2BanAPI, SemanticLocalization, SecurityUtils */

/**
 * fail2banWhitelist — manages the "Trusted addresses" tab.
 *
 * Single source of truth for the whitelist string lives on the backend in
 * Fail2BanRules.whitelist. This module keeps a parsed in-memory `manual` list,
 * applies add/remove edits locally, and commits via PATCH /fail2ban with the
 * full re-joined string. Auto-trusted entries surfaced from NetworkFilters
 * (newer_block_ip=1) are read-only and link to the originating firewall rule.
 *
 * @module fail2banWhitelist
 */
const fail2banWhitelist = {
    $tableEl: null,
    $input: null,
    $addBtn: null,
    $errorLabel: null,
    $tabSegment: null,
    dataTable: null,
    initialized: false,

    // Parsed lists. Each entry is normalised (lowercase IPv6, trimmed).
    manual: [],
    auto: [],

    /**
     * Wire up DOM handles, build DataTable shell, register events.
     * Called on first activation of the "whitelist" tab.
     */
    initialize() {
        if (fail2banWhitelist.initialized) {
            return;
        }
        fail2banWhitelist.initialized = true;

        fail2banWhitelist.$tableEl = $('#whitelist-table');
        fail2banWhitelist.$input = $('#whitelist-input');
        fail2banWhitelist.$addBtn = $('#whitelist-add-btn');
        fail2banWhitelist.$errorLabel = $('#whitelist-input-error');
        fail2banWhitelist.$tabSegment = $('#whitelist-table').closest('.segment');

        fail2banWhitelist.initializeDataTable();

        fail2banWhitelist.$addBtn.on('click', fail2banWhitelist.handleAdd);
        fail2banWhitelist.$input.on('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                fail2banWhitelist.handleAdd();
            }
        });
        // The input doubles as a live filter for the table: every keystroke
        // drives DataTable's built-in search engine. We also clear inline
        // errors here so the red label vanishes as soon as the user edits.
        fail2banWhitelist.$input.on('input', () => {
            fail2banWhitelist.clearError();
            if (fail2banWhitelist.dataTable) {
                fail2banWhitelist.dataTable.search(fail2banWhitelist.$input.val() || '').draw();
            }
        });

        // Delete-button + auto-row click handler (event delegation — table redraws).
        fail2banWhitelist.$tableEl.on('click', '.whitelist-delete-btn', fail2banWhitelist.handleDelete);
        fail2banWhitelist.$tableEl.on('click', '.whitelist-auto-row', (e) => {
            const filterId = $(e.currentTarget).data('filter-id');
            if (filterId) {
                window.location.href = `${globalRootUrl}firewall/modify/${filterId}`;
            }
        });
    },

    /**
     * Build the DataTable shell. Rows are populated by reload().
     */
    initializeDataTable() {
        fail2banWhitelist.dataTable = fail2banWhitelist.$tableEl.DataTable({
            lengthChange: false,
            paging: true,
            pageLength: 15,
            scrollCollapse: true,
            deferRender: true,
            columns: [
                { orderable: true, searchable: true },   // Address
                { orderable: true, searchable: true },   // Source
                { orderable: false, searchable: true },  // Description
                { orderable: false, searchable: false }, // Actions
            ],
            order: [[1, 'asc'], [0, 'asc']],
            language: SemanticLocalization.dataTableLocalisation,
            createdRow(row) {
                $('td', row).eq(3).addClass('collapsing');
            },
        });
    },

    /**
     * Refresh both lists from the API, then redraw.
     * Called on tab activation and after every add/remove.
     */
    reload() {
        fail2banWhitelist.showLoader();
        Fail2BanAPI.getSettings((response) => {
            fail2banWhitelist.hideLoader();
            if (!response || !response.result || !response.data) {
                return;
            }
            const whitelistStr = response.data.whitelist || '';
            fail2banWhitelist.manual = fail2banWhitelist.parseManualString(whitelistStr);
            fail2banWhitelist.auto = Array.isArray(response.data.autoWhitelist)
                ? response.data.autoWhitelist
                : [];
            fail2banWhitelist.redraw();
        });
    },

    /**
     * Split the stored whitelist string (space/comma/semicolon-separated)
     * into a deduped array of normalised IP/CIDR strings.
     *
     * @param {string} raw
     * @returns {string[]}
     */
    parseManualString(raw) {
        if (!raw) {
            return [];
        }
        const seen = {};
        const out = [];
        raw.split(/[\s,;]+/).forEach((entry) => {
            const norm = fail2banWhitelist.normalizeEntry(entry);
            if (norm && !seen[norm]) {
                seen[norm] = true;
                out.push(norm);
            }
        });
        return out;
    },

    /**
     * Rebuild table rows from manual + auto state.
     */
    redraw() {
        fail2banWhitelist.dataTable.clear();
        const rows = [];

        fail2banWhitelist.manual.forEach((ip) => {
            rows.push([
                fail2banWhitelist.renderAddressCell(ip),
                `<span class="ui basic label">${SecurityUtils.escapeHtml(globalTranslate.f2b_SourceManual)}</span>`,
                '',
                `<button type="button" class="ui icon basic mini button right floated whitelist-delete-btn"
                         data-ip="${SecurityUtils.escapeHtml(ip)}"
                         title="${SecurityUtils.escapeHtml(globalTranslate.f2b_RemoveFromWhitelist)}">
                    <i class="icon trash red"></i>
                </button>`,
            ]);
        });

        fail2banWhitelist.auto.forEach((entry) => {
            const ip = String(entry.ip || '');
            const desc = String(entry.description || '');
            const filterId = String(entry.filter_id || '');
            rows.push([
                fail2banWhitelist.renderAddressCell(ip),
                `<a class="ui label whitelist-auto-row"
                    data-filter-id="${SecurityUtils.escapeHtml(filterId)}"
                    title="${SecurityUtils.escapeHtml(globalTranslate.f2b_SourceFirewallTooltip)}"
                    style="cursor:pointer;">
                    <i class="shield alternate icon"></i>${SecurityUtils.escapeHtml(globalTranslate.f2b_SourceFirewall)}
                 </a>`,
                SecurityUtils.escapeHtml(desc),
                `<button type="button" class="ui icon basic mini button right floated disabled"
                         title="${SecurityUtils.escapeHtml(globalTranslate.f2b_CannotDeleteAuto)}">
                    <i class="icon lock grey"></i>
                </button>`,
            ]);
        });

        fail2banWhitelist.dataTable.rows.add(rows).draw();
    },

    /**
     * Build the first-column cell with a v4/v6 badge.
     *
     * @param {string} ip
     * @returns {string}
     */
    renderAddressCell(ip) {
        const version = ip.indexOf(':') !== -1 ? 'v6' : 'v4';
        const badgeColor = version === 'v6' ? 'teal' : 'blue';
        return `<span class="ui mini ${badgeColor} label">${version}</span>&nbsp;${SecurityUtils.escapeHtml(ip)}`;
    },

    /**
     * Parse the input as a delimited list (whitespace, comma, semicolon),
     * triage each token into valid/duplicate/invalid buckets, and commit the
     * batch in one PATCH. Single-address input is just the degenerate case
     * (one token).
     */
    handleAdd() {
        const raw = (fail2banWhitelist.$input.val() || '').trim();
        if (raw === '') {
            fail2banWhitelist.showError(globalTranslate.f2b_InvalidAddress);
            return;
        }

        const tokens = raw.split(/[\s,;]+/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
        const blocked = { '0.0.0.0': 1, '0.0.0.0/0': 1, '::': 1, '::/0': 1 };

        const valid = [];
        const rejected = [];
        const duplicates = [];
        const seenInBatch = {};

        tokens.forEach((token) => {
            const norm = fail2banWhitelist.normalizeEntry(token);
            if (!norm || !fail2banWhitelist.isValidIpOrCidr(norm) || blocked[norm]) {
                rejected.push(token);
                return;
            }
            if (seenInBatch[norm] || fail2banWhitelist.containsEntry(norm)) {
                duplicates.push(token);
                return;
            }
            seenInBatch[norm] = true;
            valid.push(norm);
        });

        if (valid.length === 0) {
            if (rejected.length > 0) {
                fail2banWhitelist.showError(
                    fail2banWhitelist.formatRejected(rejected)
                );
            } else if (duplicates.length > 0) {
                fail2banWhitelist.showError(globalTranslate.f2b_DuplicateAddress);
            } else {
                fail2banWhitelist.showError(globalTranslate.f2b_InvalidAddress);
            }
            return;
        }

        const next = fail2banWhitelist.manual.concat(valid);
        fail2banWhitelist.commit(next, () => {
            if (rejected.length > 0) {
                // Partial success: keep the rejected tokens visible in the
                // input so the admin can fix them, and explain why.
                fail2banWhitelist.$input.val(rejected.join(' '));
                fail2banWhitelist.showError(fail2banWhitelist.formatRejected(rejected));
                // Re-apply filter with the leftover text.
                if (fail2banWhitelist.dataTable) {
                    fail2banWhitelist.dataTable.search(rejected.join(' ')).draw();
                }
            } else {
                fail2banWhitelist.$input.val('');
                fail2banWhitelist.clearError();
                if (fail2banWhitelist.dataTable) {
                    fail2banWhitelist.dataTable.search('').draw();
                }
            }
        });
    },

    /**
     * Render the "rejected entries" message, falling back to a sensible
     * English default if the translation key is missing (older language
     * files may not have f2b_BulkAddRejected yet).
     *
     * @param {string[]} rejectedList
     * @returns {string}
     */
    formatRejected(rejectedList) {
        const template = globalTranslate.f2b_BulkAddRejected || 'Rejected: %list%';
        return template.replace('%list%', rejectedList.join(', '));
    },

    /**
     * Remove a manual entry on × click.
     *
     * @param {Event} e
     */
    handleDelete(e) {
        const ip = $(e.currentTarget).data('ip');
        if (!ip) {
            return;
        }
        const target = String(ip);
        const next = fail2banWhitelist.manual.filter((entry) => entry !== target);
        if (next.length === fail2banWhitelist.manual.length) {
            return;
        }
        fail2banWhitelist.commit(next);
    },

    /**
     * Send PATCH /fail2ban with the new whitelist string and reload on success.
     *
     * @param {string[]} nextManual
     * @param {function} [onSuccess]
     */
    commit(nextManual, onSuccess) {
        fail2banWhitelist.showLoader();
        Fail2BanAPI.patch({ whitelist: nextManual.join(' ') }, (response) => {
            if (!response || !response.result) {
                fail2banWhitelist.hideLoader();
                fail2banWhitelist.showError(globalTranslate.f2b_WhitelistSaveError);
                return;
            }
            if (typeof onSuccess === 'function') {
                onSuccess();
            }
            // reload() handles hideLoader after fresh data arrives.
            fail2banWhitelist.reload();
        });
    },

    /**
     * Check whether an IP/CIDR is already present in either manual or auto list.
     *
     * @param {string} norm
     * @returns {boolean}
     */
    containsEntry(norm) {
        if (fail2banWhitelist.manual.indexOf(norm) !== -1) {
            return true;
        }
        return fail2banWhitelist.auto.some((entry) => {
            const autoIp = fail2banWhitelist.normalizeEntry(String(entry.ip || ''));
            return autoIp === norm;
        });
    },

    /**
     * Trim, lowercase IPv6, drop redundant /32 or /128 masks so duplicate detection
     * treats "192.168.1.5" and "192.168.1.5/32" as the same entry.
     *
     * @param {string} raw
     * @returns {string}
     */
    normalizeEntry(raw) {
        const value = String(raw || '').trim();
        if (value === '') {
            return '';
        }
        // Lowercase only IPv6 (presence of colon); leave IPv4 alone.
        const lowered = value.indexOf(':') !== -1 ? value.toLowerCase() : value;
        // Strip /32 from IPv4 host, /128 from IPv6 host.
        if (lowered.indexOf(':') === -1 && lowered.endsWith('/32')) {
            return lowered.slice(0, -3);
        }
        if (lowered.indexOf(':') !== -1 && lowered.endsWith('/128')) {
            return lowered.slice(0, -4);
        }
        return lowered;
    },

    /**
     * Client-side validation that mirrors backend canonicalizeEntry() in
     * UpdateSettingsAction. IPv4 is checked via a strict octet regex; IPv6
     * goes through a structural check that accepts "::" compression and
     * CIDR prefixes — the backend re-validates via inet_pton, so the goal
     * here is to catch obvious garbage before issuing the PATCH, not to
     * reproduce inet_pton's exhaustive semantics in JS.
     *
     * @param {string} value
     * @returns {boolean}
     */
    isValidIpOrCidr(value) {
        if (!value) {
            return false;
        }

        // Split optional CIDR prefix.
        let address = value;
        let prefix = null;
        const slashIdx = value.indexOf('/');
        if (slashIdx !== -1) {
            address = value.substring(0, slashIdx);
            prefix = value.substring(slashIdx + 1);
            if (!/^\d+$/.test(prefix)) {
                return false;
            }
        }

        // IPv4 literal.
        const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1?[0-9]?[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1?[0-9]?[0-9])$/;
        if (ipv4.test(address)) {
            if (prefix === null) return true;
            const p = parseInt(prefix, 10);
            return p >= 0 && p <= 32;
        }

        // IPv6 literal.
        if (fail2banWhitelist.isLikelyIpv6(address)) {
            if (prefix === null) return true;
            const p = parseInt(prefix, 10);
            return p >= 0 && p <= 128;
        }

        return false;
    },

    /**
     * Lightweight structural check for an IPv6 address. Handles "::"
     * compression — including edge cases where it fills only one zero group
     * at the start or end (`::1:2:3:4:5:6:7`, `1:2:3:4:5:6:7::`) — by
     * counting non-empty groups instead of raw split() length, since edge
     * "::" produces two adjacent empty entries. Not a substitute for
     * inet_pton — the backend is authoritative; the goal here is to filter
     * obvious garbage before issuing the PATCH.
     *
     * @param {string} address
     * @returns {boolean}
     */
    isLikelyIpv6(address) {
        if (!address || address.indexOf(':') === -1) return false;
        if (!/^[0-9a-f:]+$/i.test(address)) return false;
        if (address.indexOf(':::') !== -1) return false;

        const doubleColons = address.match(/::/g) || [];
        if (doubleColons.length > 1) return false;

        const groups = address.split(':');
        const nonEmpty = groups.filter((g) => g !== '');

        if (!nonEmpty.every((g) => /^[0-9a-f]{1,4}$/i.test(g))) return false;

        if (doubleColons.length === 0) {
            // Uncompressed form: exactly 8 hex groups, no empties allowed.
            return groups.length === 8;
        }

        // Compressed form: "::" must fill at least one zero group, leaving
        // at most 7 explicit groups. (`::` alone -> 0 explicit groups -> valid
        // unspecified address; rejected separately by the blocked-list.)
        return nonEmpty.length <= 7;
    },

    showError(text) {
        fail2banWhitelist.$errorLabel.text(text).show();
        fail2banWhitelist.$input.closest('.ui.input').addClass('error');
    },

    clearError() {
        fail2banWhitelist.$errorLabel.hide().text('');
        fail2banWhitelist.$input.closest('.ui.input').removeClass('error');
    },

    showLoader() {
        if (!fail2banWhitelist.$tabSegment.find('> .ui.dimmer').length) {
            fail2banWhitelist.$tabSegment.append(
                `<div class="ui inverted dimmer">
                    <div class="ui text loader">${globalTranslate.ex_LoadingData}</div>
                </div>`
            );
        }
        fail2banWhitelist.$tabSegment.find('> .ui.dimmer').addClass('active');
    },

    hideLoader() {
        fail2banWhitelist.$tabSegment.find('> .ui.dimmer').removeClass('active');
    },
};

// Lazy-init on first activation of the tab. Fomantic UI may restore the
// previously active tab on load (e.g. when the user navigates back), in which
// case the click handler below never fires — so we also check the tab's
// current `active` state at ready-time and initialise immediately if so.
$(document).ready(() => {
    if ($('#whitelist-table').length === 0) {
        return;
    }
    const $tab = $('#fail2ban-tab-menu .item[data-tab="whitelist"]');
    $tab.on('click', () => {
        fail2banWhitelist.initialize();
        fail2banWhitelist.reload();
    });
    if ($tab.hasClass('active')) {
        fail2banWhitelist.initialize();
        fail2banWhitelist.reload();
    }
});
