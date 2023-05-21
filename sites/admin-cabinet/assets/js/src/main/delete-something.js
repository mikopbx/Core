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
 * The DeleteSomething object is responsible prevention occasionally delete something on the system
 *
 * @module DeleteSomething
 */
const DeleteSomething = {

    /**
     * Initializes the delete action for elements.
     */
    initialize() {

        // Prevent double-click event on two-steps-delete elements
        $('.two-steps-delete').closest('td').on('dblclick', (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
        });

        // Handle click event on two-steps-delete elements
        $('body').on('click', '.two-steps-delete', (e) => {
            e.preventDefault();
            e.stopImmediatePropagation();
            const $button = $(e.target).closest('a');
            const $icon = $button.find('i.trash');

            // Check if the button is disabled
            if ($button.hasClass('disabled')) {
                return;
            }

            // Disable the button temporarily
            $button.addClass('disabled');

            // Set a timeout to change button state
            setTimeout(() => {
                if ($button.length) {
                    // Remove two-steps-delete and disabled classes, change icon to close
                    $button.removeClass('two-steps-delete').removeClass('disabled');
                    $icon.removeClass('trash').addClass('close');
                }
            }, 200);

            // Set a timeout to revert button state
            setTimeout(() => {
                if ($button.length) {
                    // Add back two-steps-delete class, change icon to trash
                    $button.addClass('two-steps-delete');
                    $icon.removeClass('close').addClass('trash');
                }
            }, 3000);
        });
    },
};

// When the document is ready, initialize the delete records with extra check on double click
$(document).ready(() => {
    DeleteSomething.initialize();
});
