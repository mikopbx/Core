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

/**
 * FullscreenToggle — cross-browser Fullscreen API helper.
 *
 * iPhone WebKit (incl. Edge/Chrome on iOS) does NOT expose the Fullscreen
 * API on arbitrary DOM elements — only `<video>` has `webkitEnterFullscreen`.
 * Old Safari macOS (≤16.3) used the `webkit*` prefix; modern browsers use
 * the unprefixed standard. This helper feature-detects both and gracefully
 * hides the toggle button when neither is available.
 *
 * @module FullscreenToggle
 */
const FullscreenToggle = {
    /**
     * Returns the element currently in fullscreen, or null.
     * @returns {Element|null}
     */
    getActiveElement() {
        return document.fullscreenElement || document.webkitFullscreenElement || null;
    },

    /**
     * Checks whether the Fullscreen API is usable for the given element.
     * @param {Element|null|undefined} el
     * @returns {boolean}
     */
    isSupported(el) {
        if (!el) {
            return false;
        }
        const elHasReq = (typeof el.requestFullscreen === 'function')
            || (typeof el.webkitRequestFullscreen === 'function');
        const docHasExit = (typeof document.exitFullscreen === 'function')
            || (typeof document.webkitExitFullscreen === 'function');
        return elHasReq && docHasExit;
    },

    /**
     * Enters fullscreen for the given element. Wraps both standard and
     * webkit-prefixed APIs and always returns a Promise.
     * @param {Element} el
     * @returns {Promise<void>}
     */
    request(el) {
        const req = el.requestFullscreen || el.webkitRequestFullscreen;
        if (typeof req !== 'function') {
            return Promise.reject(new Error('Fullscreen API not available for this element'));
        }
        try {
            const result = req.call(el);
            return result instanceof Promise ? result : Promise.resolve();
        } catch (err) {
            return Promise.reject(err);
        }
    },

    /**
     * Exits fullscreen mode.
     * @returns {Promise<void>}
     */
    exit() {
        const fn = document.exitFullscreen || document.webkitExitFullscreen;
        if (typeof fn !== 'function') {
            return Promise.reject(new Error('Fullscreen API not available'));
        }
        try {
            const result = fn.call(document);
            return result instanceof Promise ? result : Promise.resolve();
        } catch (err) {
            return Promise.reject(err);
        }
    },

    /**
     * Toggles fullscreen mode for the given element. If something is
     * already fullscreen, exits; otherwise requests fullscreen on `el`.
     * @param {Element|null|undefined} el
     * @returns {Promise<void>}
     */
    toggle(el) {
        if (!el) {
            return Promise.resolve();
        }
        if (FullscreenToggle.getActiveElement()) {
            return FullscreenToggle.exit();
        }
        return FullscreenToggle.request(el);
    },

    /**
     * Subscribes to both standard and webkit-prefixed fullscreenchange
     * events. Returns an unsubscribe function.
     * @param {EventListener} handler
     * @returns {function(): void}
     */
    onChange(handler) {
        document.addEventListener('fullscreenchange', handler);
        document.addEventListener('webkitfullscreenchange', handler);
        return function unsubscribe() {
            document.removeEventListener('fullscreenchange', handler);
            document.removeEventListener('webkitfullscreenchange', handler);
        };
    },
};
