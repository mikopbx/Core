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

/* global globalDebugMode, globalPBXLicense */


/**
 * Object for managing global Config
 *
 * @module Config
 */
const Config = {
    pbxUrl: globalDebugMode ? '//172.16.32.72' : '',
    updateUrl: 'https://releases.mikopbx.com/releases/v1/mikopbx/',
    keyManagementUrl: `https://lm.mikopbx.com/client-cabinet/session/index/${globalPBXLicense}`,
    keyManagementSite: 'https://lm.mikopbx.com'
};
