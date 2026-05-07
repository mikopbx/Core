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

/* global $, i18n, localStorage, EventBus, AdviceAPI, globalTranslate */

/**
 * GitLab-style update notification banner shown at the top of every page.
 *
 * Subscribes to the existing 'advice' EventBus channel (populated by
 * WorkerPrepareAdvice). Picks the single most-important advice item from
 * the `warning` (red) and `info` (blue) buckets whose messageTpl matches
 * one of the recognised banner templates. User can "Install now",
 * "Remind me in 3 days" or dismiss — state lives in localStorage so new
 * versions automatically re-show the banner.
 */
const updateBanner = {
    /**
     * Banner container created in main.volt.
     * Resolved in initialize() — must not call $() at module-load time.
     */
    $banner: null,

    /** Advice templates surfaced by the banner. */
    bannerTemplates: [
        'adv_AvailableNewVersionPBX',
        'adv_AvailableNewVersionModule',
        'adv_SecurityPatchAvailable',
    ],

    /** Remind-me-later duration for the "remind in 3 days" button. */
    remindLaterMs: 3 * 24 * 60 * 60 * 1000,

    initialize() {
        updateBanner.$banner = $('#update-banner');
        if (updateBanner.$banner.length === 0) {
            return;
        }
        EventBus.subscribe('advice', updateBanner.onAdvice);
        if (typeof AdviceAPI !== 'undefined' && AdviceAPI.getList) {
            AdviceAPI.getList(updateBanner.onAdvice);
        }
    },

    /**
     * EventBus / AdviceAPI callback.
     * @param {object} response
     */
    onAdvice(response) {
        if (!response || response.result === false
            || !response.data || response.data.advice === undefined) {
            return;
        }
        updateBanner.render(response.data.advice);
    },

    /**
     * Render the highest-severity relevant advice item, or hide the banner.
     * @param {object} advice - {error, warning, info, needUpdate}
     */
    render(advice) {
        const item = updateBanner.pickBannerItem(advice);
        if (!item) {
            updateBanner.hide();
            return;
        }
        if (updateBanner.isDismissed(item.entry)) {
            updateBanner.hide();
            return;
        }
        updateBanner.draw(item.severity, item.entry);
    },

    /**
     * Choose the banner entry — banner surfaces ONLY warning-bucket advice
     * (critical PBX updates, uninstalled security modules, updates of installed
     * security modules). Regular info-level updates stay in the bell popup and
     * are intentionally skipped here to avoid banner noise.
     *
     * @returns {?{severity: string, entry: object}}
     */
    pickBannerItem(advice) {
        const warnings = Array.isArray(advice.warning) ? advice.warning : [];
        const warningMatch = updateBanner.findFirstByTemplate(warnings);
        if (warningMatch) {
            return { severity: 'warning', entry: warningMatch };
        }
        return null;
    },

    findFirstByTemplate(entries) {
        for (let i = 0; i < entries.length; i += 1) {
            if (updateBanner.bannerTemplates.indexOf(entries[i].messageTpl) !== -1) {
                return entries[i];
            }
        }
        return null;
    },

    severityHint(entry) {
        if (entry && entry.messageParams && typeof entry.messageParams.severity === 'string') {
            return entry.messageParams.severity;
        }
        return 'info';
    },

    /**
     * Build and show the banner DOM. Banner is always rendered in warning
     * (red) style because pickBannerItem only returns warning-bucket entries.
     * The `severity` parameter is kept for future re-introduction of info
     * banners but is currently always 'warning'.
     */
    draw(severity, entry) {
        const params = entry.messageParams || {};
        const ver = params.ver ? $('<div>').text(params.ver).html() : '';
        const moduleName = params.module ? $('<div>').text(params.module).html() : '';

        // Template-specific primary message + action URL.
        let message;
        let actionUrl;
        switch (entry.messageTpl) {
            case 'adv_AvailableNewVersionPBX': {
                // severity hint 'critical' → stronger wording, 'warning' (or unknown)
                // → "important update available" copy.
                const hint = updateBanner.severityHint(entry);
                const tpl = hint === 'critical'
                    ? globalTranslate.banner_SecurityUpdateCritical
                    : globalTranslate.banner_UpdateAvailable;
                message = updateBanner.interpolate(tpl, { ver });
                actionUrl = params.url || '';
                break;
            }
            case 'adv_SecurityPatchAvailable':
                message = updateBanner.interpolate(
                    globalTranslate.banner_SecurityPatchAvailable,
                    { module: moduleName, ver },
                );
                actionUrl = params.url || '';
                break;
            case 'adv_AvailableNewVersionModule':
                // Reuse existing translated template for in-banner copy.
                message = i18n(entry.messageTpl, entry.messageParams);
                actionUrl = params.url || '';
                break;
            default:
                message = i18n(entry.messageTpl, entry.messageParams);
                actionUrl = params.url || '';
        }

        const installLabel = $('<div>').text(globalTranslate.banner_InstallNow).html();
        const remindLabel = $('<div>').text(globalTranslate.banner_RemindIn3Days).html();
        const dismissLabel = $('<div>').text(globalTranslate.banner_Dismiss).html();

        const installButton = actionUrl
            ? `<a href="${actionUrl}" class="ui small primary button">${installLabel}</a>`
            : '';

        const html = `
            <i class="exclamation triangle icon update-banner-icon"></i>
            <div class="update-banner-message">${message}</div>
            <div class="update-banner-actions">
                ${installButton}
                <button type="button" class="ui small basic button update-banner-remind">${remindLabel}</button>
                <button type="button" class="update-banner-close" aria-label="${dismissLabel}">&times;</button>
            </div>
        `;

        updateBanner.$banner
            .removeClass('hidden info warning')
            .addClass(severity || 'warning')
            .html(html);

        updateBanner.$banner.find('.update-banner-remind').on('click', () => {
            updateBanner.dismiss(entry, updateBanner.remindLaterMs);
        });
        updateBanner.$banner.find('.update-banner-close').on('click', () => {
            updateBanner.dismiss(entry, null);
        });
    },

    hide() {
        updateBanner.$banner.addClass('hidden').empty();
    },

    /**
     * Persist dismiss decision keyed by messageTpl + version.
     * `null` untilMs means "dismiss until a different version".
     */
    dismiss(entry, untilMs) {
        const key = updateBanner.storageKey(entry);
        if (!key) {
            updateBanner.hide();
            return;
        }
        try {
            const payload = untilMs === null
                ? { permanent: true }
                : { remindAt: Date.now() + untilMs };
            localStorage.setItem(key, JSON.stringify(payload));
        } catch (e) {
            // Storage disabled / quota exceeded — still hide current banner in-memory.
        }
        updateBanner.hide();
    },

    isDismissed(entry) {
        const key = updateBanner.storageKey(entry);
        if (!key) {
            return false;
        }
        let raw;
        try {
            raw = localStorage.getItem(key);
        } catch (e) {
            return false;
        }
        if (!raw) {
            return false;
        }
        let state;
        try {
            state = JSON.parse(raw);
        } catch (e) {
            return false;
        }
        if (state && state.permanent === true) {
            return true;
        }
        if (state && typeof state.remindAt === 'number' && state.remindAt > Date.now()) {
            return true;
        }
        return false;
    },

    /**
     * Dismiss key depends on message template + version so upgrades re-show the banner.
     */
    storageKey(entry) {
        if (!entry || !entry.messageTpl) {
            return '';
        }
        const params = entry.messageParams || {};
        const version = params.ver || '';
        const moduleName = params.module || '';
        return `updateBannerDismiss_${entry.messageTpl}_${moduleName}_${version}`;
    },

    /**
     * Simple %placeholder% interpolation — `str` is a server-provided translated
     * template that is not rendered as HTML (values already escaped by the caller).
     */
    interpolate(template, values) {
        if (typeof template !== 'string') {
            return '';
        }
        let out = template;
        Object.keys(values || {}).forEach((name) => {
            out = out.replace(new RegExp(`%${name}%`, 'g'), values[name]);
        });
        return out;
    },
};

$(document).ready(() => {
    updateBanner.initialize();
});
