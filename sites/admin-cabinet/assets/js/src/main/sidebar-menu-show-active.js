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

/* global globalRootUrl, globalTranslate, globalWebAdminLanguage, sessionStorage */

/**
 * sidebarMenuShowActive object for managing the highlighting of the active sidebar menu item.
 * @module sidebarMenuShowActive
 */
const sidebarMenuShowActive = {

    /**
     * jQuery object for the sidebar menu.
     * @type {jQuery}
     */
    $sidebarMenu: $('#toc'),

    /**
     * Initializes the sidebar menu and sets the active menu item.
     */
    initialize() {
        sidebarMenuShowActive.$sidebarMenu.sidebar('setting', 'transition', 'overlay');
        sidebarMenuShowActive.$sidebarMenu.sidebar('attach events', '#sidebar-menu-button');
        sidebarMenuShowActive.makeMenuActiveElement();
    },

    /**
     * Sets the active menu item in the sidebar based on the current URL.
     */
    makeMenuActiveElement() {
        const current = window.location.href;
        $.each($('.sidebar-menu a'), (index, value) => {
            const $this = $(value);
            $this.removeClass('active');
            // if the current path is like this link, make it active
            const needle = $this.attr('href')
                .replace('/index', '')
                .replace('/modify', '');

            if (current.indexOf(needle) !== -1
                && !$this.hasClass('logo')) {
                $this.addClass('active');
            }
        });
    },
};


/**
 * Initialize highlighting the active sidebar menu item.
 */
$(document).ready(() => {
    sidebarMenuShowActive.initialize();
});
