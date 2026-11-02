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

/* global PbxApiClient, PbxApi, globalTranslate, $ */

/**
 * UsersAPI - REST API v3 client for users management
 *
 * Provides a clean interface for users operations using the new RESTful API.
 *  
 * @class UsersAPI
 */
const UsersAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/users',
    customMethods: {
        checkAvailability: ':available'
    }
});

// Add method aliases for compatibility and easier use
Object.assign(UsersAPI, {
    /**
     * Checks if the new email is available.
     * @param {string} oldEmail - The original email.
     * @param {string} newEmail - The new email to check.
     * @param {string} cssClassName - The CSS class name for the input element.
     * @param {string} userId - The ID of the user associated with the extension.
     */
    checkAvailability(oldEmail, newEmail, cssClassName = 'email', userId = '') {
        if (oldEmail === newEmail || newEmail.length === 0) {
            $(`.ui.input.${cssClassName}`).parent().removeClass('error');
            $(`#${cssClassName}-error`).addClass('hidden');
            return;
        }

        const $field = $(`.ui.input.${cssClassName}`).parent();
        const $error = $(`#${cssClassName}-error`);

        // Use new API approach with callCustomMethod
        this.callCustomMethod('checkAvailability', { email: newEmail }, (response) => {
            // No verdict without data (network error, 4xx/5xx): drop the verdict left from a previous value
            // and say the check failed instead of reporting the address as free or taken
            if (!response || response.result !== true || !response.data) {
                $field.removeClass('error');
                $error.removeClass('hidden').html(globalTranslate.ex_EmailAvailabilityCheckFailed);
                return;
            }
            const isOwnEmail = userId.length > 0 && response.data['userId'] === userId;
            if (response.data['available'] === true || isOwnEmail) {
                $field.removeClass('error');
                $error.addClass('hidden');
            } else {
                $field.addClass('error');
                let message = `${globalTranslate.ex_ThisEmailAlreadyRegisteredForOtherUser}:&nbsp`;
                if (globalTranslate[response.data['represent']] !== undefined) {
                    message = globalTranslate[response.data['represent']];
                } else {
                    message += response.data['represent'];
                }
                $error.removeClass('hidden').html(message);
            }
        });
    }
});