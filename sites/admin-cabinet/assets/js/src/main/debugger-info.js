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

/**
 * The DebuggerInfo object is responsible for showing extra information by double ESC key press
 *
 * @module DebuggerInfo
 */
const DebuggerInfo = {
    $debugInfoDiv: $('#debug-info'),
    delta: 500,
    lastKeypressTime: 0,

    /**
     * Initializes the debugger info.
     */
    initialize() {

        // Add CSS class to the debug info div
        DebuggerInfo.$debugInfoDiv.addClass('ui right very wide sidebar');

        // Attach keydown event handler to the document
        window.$(document).on('keydown', (event) => {
            DebuggerInfo.keyHandler(event);
        });
    },

    /**
     * Updates the content of the debug info.
     * @param {string} newContent - The new content for the debug info.
     */
    UpdateContent(newContent) {
        DebuggerInfo.$debugInfoDiv.html(newContent);
    },

    /**
     * Shows the sidebar with the debug info.
     */
    showSidebar() {
        // Check if debug info is available
        if (DebuggerInfo.$debugInfoDiv.html().length === 0) return;

        // Toggle the sidebar to show/hide
        DebuggerInfo.$debugInfoDiv
            .sidebar({
                transition: 'overlay',
                dimPage: false,
            })
            .sidebar('toggle');
    },

    /**
     * Handles key events for the debugger info.
     * @param {Event} event - The keydown event.
     */
    keyHandler(event) {
        // Double press of ESC key will show the debug information
        if (event.keyCode === 27) {
            let thisKeypressTime = new Date();
            if (thisKeypressTime - DebuggerInfo.lastKeypressTime <= DebuggerInfo.delta) {
                // Show the sidebar with debug info
                DebuggerInfo.showSidebar();
                thisKeypressTime = 0;
            }
            // Update the last keypress time
            DebuggerInfo.lastKeypressTime = thisKeypressTime;
        }
    },
};


// export default DebuggerInfo;