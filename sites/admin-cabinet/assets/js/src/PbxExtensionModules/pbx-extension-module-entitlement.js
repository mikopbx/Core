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

/* global globalTranslate, i18n, LicenseAPI, UserMessage */

/**
 * "Entitlement document" block of the Licensing tab (LicenseV2, #1148): state of the document, the request
 * file for the closed contour, the answer file from the cabinet and a forced round. Rendered by the view
 * only when LicenseV2 is on; without the block every method is a no-op.
 *
 * @module entitlement
 */
const entitlement = {
    $section: null,
    $status: null,
    $issued: null,
    $next: null,
    $error: null,
    $exportButton: null,
    $importButton: null,
    $importInput: null,
    $refreshButton: null,

    /** Largest answer file taken, bytes (LicenseV2::IMPORT_MAX_BYTES); the cabinet file is about 1 KiB. */
    importMaxBytes: 262144,

    initialize() {
        entitlement.$section = $('#entitlementSection');
        if (entitlement.$section.length === 0) {
            return;
        }
        entitlement.$status = $('#entitlement-status');
        entitlement.$issued = $('#entitlement-issued');
        entitlement.$next = $('#entitlement-next');
        entitlement.$error = $('#entitlement-error');
        entitlement.$exportButton = $('#entitlement-export-button');
        entitlement.$importButton = $('#entitlement-import-button');
        entitlement.$importInput = $('#entitlement-import-input');
        entitlement.$refreshButton = $('#entitlement-refresh-button');

        entitlement.$exportButton.off('click.entitlement').on('click.entitlement', entitlement.exportRequest);
        entitlement.$importButton.off('click.entitlement').on('click.entitlement', () => {
            entitlement.$importInput.trigger('click');
        });
        entitlement.$importInput.off('change.entitlement').on('change.entitlement', entitlement.cbOnFileChosen);
        entitlement.$refreshButton.off('click.entitlement').on('click.entitlement', entitlement.refreshNow);

        entitlement.refresh();
    },

    /**
     * Re-reads the state; keyCheck calls it after the key is saved.
     */
    refresh() {
        if (entitlement.$section === null || entitlement.$section.length === 0) {
            return;
        }
        LicenseAPI.entitlementStatus(entitlement.cbAfterStatus);
    },

    cbAfterStatus(response, isSuccessful) {
        if (!isSuccessful || response.data === undefined) {
            entitlement.$status.text(globalTranslate.lic_EntitlementUnavailable);
            entitlement.$issued.hide();
            entitlement.$next.hide();
            entitlement.$refreshButton.hide();
            return;
        }
        entitlement.render(response.data);
    },

    /**
     * @param {object} s - entitlementStatus() of the PBX: unix times, booleans, the refusal reason.
     */
    render(s) {
        entitlement.$status.text(entitlement.statusLine(s));
        if (s.hasDocument && s.iat > 0) {
            entitlement.$issued.text(i18n('lic_EntitlementIssued', {date: entitlement.date(s.iat)})).show();
        } else {
            entitlement.$issued.hide();
        }
        if (s.nextExchange > s.now) {
            entitlement.$next.text(i18n('lic_EntitlementNextExchange', {date: entitlement.date(s.nextExchange)})).show();
        } else {
            entitlement.$next.hide();
        }
        entitlement.$refreshButton.toggle(s.serversConfigured === true);
    },

    /**
     * The first matching line of the spec's order; server text (the refusal reason) stays text.
     * @param {object} s
     * @returns {string}
     */
    statusLine(s) {
        if (s.refused) {
            return s.refusalReason
                ? `${globalTranslate.lic_EntitlementRefused}: ${s.refusalReason}`
                : globalTranslate.lic_EntitlementRefused;
        }
        if (s.foreignHardware) {
            return globalTranslate.lic_EntitlementForeignHardware;
        }
        if (!s.hasKey) {
            return globalTranslate.lic_EntitlementNoKey;
        }
        if (!s.hasDocument) {
            return globalTranslate.lic_EntitlementNoDocument;
        }
        if (s.keyMismatch) {
            return globalTranslate.lic_EntitlementKeyMismatch;
        }
        if (s.effectiveExpiry <= s.now) {
            return globalTranslate.lic_EntitlementExpired;
        }
        if (s.exp > s.now) {
            return i18n('lic_EntitlementValidUntil', {date: entitlement.date(s.exp)});
        }
        return i18n('lic_EntitlementOfflineUntil', {date: entitlement.date(s.offlineUntil)});
    },

    /**
     * @param {number} unix - seconds
     * @returns {string} - local date and time of the browser
     */
    date(unix) {
        return new Date(unix * 1000).toLocaleString();
    },

    /**
     * Server messages (a 400 of the import, the "Network error") go through text(): never markup.
     * @param {object} response
     */
    showServerError(response) {
        const messages = response && response.messages ? response.messages : {};
        const lines = [].concat(messages.error || [], messages.license || []);
        entitlement.$error.text(lines.length > 0 ? lines.join('\n') : globalTranslate.lic_GeneralError).show();
    },

    exportRequest(e) {
        e.preventDefault();
        entitlement.$error.hide();
        entitlement.$exportButton.addClass('loading disabled');
        LicenseAPI.entitlementExport((response, isSuccessful) => {
            entitlement.$exportButton.removeClass('loading disabled');
            if (!isSuccessful || response.data === undefined || typeof response.data.request !== 'string') {
                entitlement.showServerError(response);
                return;
            }
            const blob = new Blob([response.data.request], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', 'mikopbx-license-request.json');
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        });
    },

    cbOnFileChosen(e) {
        const file = e.target.files[0];
        entitlement.$importInput.val('');
        if (file === undefined) {
            return;
        }
        entitlement.$error.hide();
        if (file.size > entitlement.importMaxBytes) {
            entitlement.$error.text(globalTranslate.lic_EntitlementFileTooLarge).show();
            return;
        }
        entitlement.$importButton.addClass('loading disabled');
        file.text().then((token) => {
            LicenseAPI.entitlementImport({token}, (response, isSuccessful) => {
                entitlement.$importButton.removeClass('loading disabled');
                if (isSuccessful) {
                    UserMessage.showInformation(globalTranslate.lic_EntitlementImported);
                } else {
                    entitlement.showServerError(response);
                }
                // After any outcome: a refusal file is applied first and only then answered with 400.
                entitlement.refresh();
            });
        });
    },

    refreshNow(e) {
        e.preventDefault();
        entitlement.$error.hide();
        entitlement.$refreshButton.addClass('loading disabled');
        LicenseAPI.entitlementRefresh((response, isSuccessful) => {
            entitlement.$refreshButton.removeClass('loading disabled');
            if (!isSuccessful || response.data === undefined || response.data.outcome === undefined) {
                entitlement.showServerError(response);
                entitlement.refresh();
                return;
            }
            const key = `lic_EntitlementRound_${response.data.outcome}`;
            UserMessage.showInformation(globalTranslate[key] !== undefined ? globalTranslate[key] : response.data.outcome);
            entitlement.render(response.data);
        });
    },
};

$(document).ready(() => {
    entitlement.initialize();
});
