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
/* global globalRootUrl */

/**
 * SSH Console object for managing SSH console functionality.
 * @module sshConsole
 */
const sshConsole = {
    /**
     * jQuery object for the SSH console menu link.
     * @type {jQuery}
     */
    $menuLink: $(`a[href$="${globalRootUrl}console/index/"]`),

    /**
     * SSH console link.
     * @type {?string}
     */
    link: null,

    /**
     * Target attribute for the SSH console link.
     * @type {?string}
     */
    target: null,

    /**
     * Flag indicating whether the SSH console should be hidden.
     * @type {boolean}
     */
    hide: false,

    /**
     * Initializes the SSH console functionality.
     */
    initialize() {
        if (!sshConsole.$menuLink) {
            return;
        }
        let connectionAddress = sshConsole.$menuLink.attr('data-value');
        const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor) && !(navigator.userAgent.match(/Opera|OPR\//));
        if (isChrome) {
            sshConsole.detect(
                'chrome-extension://iodihamcpbpeioajjeobimgagajmlibd',
                () => {
                    sshConsole.link = `chrome-extension://iodihamcpbpeioajjeobimgagajmlibd/html/nassh.html#${connectionAddress}`;
                    sshConsole.target = '_blank';
                },
                () => {
                    sshConsole.link = 'https://chrome.google.com/webstore/detail/iodihamcpbpeioajjeobimgagajmlibd';
                    sshConsole.target = '_blank';
                },
            );
            $('body').on('click', `a[href$="${globalRootUrl}console/index/"]`, (e) => {
                e.preventDefault();
                window.open(sshConsole.link, sshConsole.target);
            });
        } else {
            sshConsole.$menuLink.hide();
        }
    },

    /**
     * Detects if the SSH console extension is installed.
     * @param {string} base - Base URL of the SSH console extension.
     * @param {Function} ifInstalled - Callback function to execute if the extension is installed.
     * @param {Function} ifNotInstalled - Callback function to execute if the extension is not installed.
     */
    detect(base, ifInstalled, ifNotInstalled) {
        $.get(`${base}/html/nassh.html`)
            .done(ifInstalled)
            .fail(ifNotInstalled);
    },
};

/**
 *  Initialize menu item SSH console on document ready
 */
$(document).ready(() => {
    sshConsole.initialize();
});
