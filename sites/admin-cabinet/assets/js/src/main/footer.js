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

// Polyfill for old browsers
if (typeof Number.isFinite !== 'function') {
    Number.isFinite = function isFinite(value) {
        // 1. If Type(number) is not Number, return false.
        if (typeof value !== 'number') {
            return false;
        }
        // 2. If number is NaN, +∞, or −∞, return false.
        if (value !== value || value === Infinity || value === -Infinity) {
            return false;
        }
        // 3. Otherwise, return true.
        return true;
    };
}

// Initialize footer immediately (script is loaded at bottom of page, DOM is already ready)
(async () => {
    // Wait for TokenManager initialization to complete
    // (TokenManager.initialize() is called automatically in token-manager.js)
    if (window.tokenManagerReady) {
        const authorized = await window.tokenManagerReady;

        if (!authorized) {
            // No valid refresh token → TokenManager already redirected to login
            // Remove loading overlay before redirect
            $('#content-frame').removeClass('loading');
            if (!$('#content-frame').hasClass('grey')){
                $('#content-frame').removeClass('segment');
            }
            return;
        }

        // TokenManager initialized successfully
        // Global AJAX interceptor is set up
        // Access token will be automatically included in all requests
    }

    // Initialize footer UI elements
    $('.popuped').popup();
    $('div[data-content], a[data-content]').popup();
    $('#content-frame').removeClass('loading');
    if (!$('#content-frame').hasClass('grey')){
        $('#content-frame').removeClass('segment');
    }
})();