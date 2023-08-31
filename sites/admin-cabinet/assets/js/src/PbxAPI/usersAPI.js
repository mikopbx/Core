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

/* global PbxApi, globalTranslate */

/**
 * This module encapsulates a collection of functions related to Users.
 *
 * @module UsersAPI
 */
const UsersAPI = {
    /**
     * Checks if the new email is available.
     * @param {string} oldEmail - The original email.
     * @param {string} newEmail - The new email to check.
     * @param {string} cssClassName - The CSS class name for the input element.
     * @param {string} userId - The ID of the user associated with the extension.
     */
    checkAvailability(oldEmail, newEmail, cssClassName = 'email', userId = '') {
        if (oldEmail === newEmail || newEmail.length===0) {
            $(`.ui.input.${cssClassName}`).parent().removeClass('error');
            $(`#${cssClassName}-error`).addClass('hidden');
            return;
        }
        $.api({
            url: PbxApi.usersAvailable,
            stateContext: `.ui.input.${cssClassName}`,
            on: 'now',
            urlData: {
                email: newEmail
            },
            successTest: PbxApi.successTest,
            onSuccess(response) {
                if (response.data['available']===true) {
                    $(`.ui.input.${cssClassName}`).parent().removeClass('error');
                    $(`#${cssClassName}-error`).addClass('hidden');
                } else if (userId.length > 0 && response.data['userId'] === userId) {
                    $(`.ui.input.${cssClassName}`).parent().removeClass('error');
                    $(`#${cssClassName}-error`).addClass('hidden');
                } else {
                    $(`.ui.input.${cssClassName}`).parent().addClass('error');
                    let message =`${globalTranslate.ex_ThisEmailAlreadyRegisteredForOtherUser}:&nbsp`;
                    if (globalTranslate[response.data['represent']]!==undefined){
                        message = globalTranslate[response.data['represent']];
                    } else {
                        message +=response.data['represent'];
                    }
                    $(`#${cssClassName}-error`).removeClass('hidden').html(message);
                }
            },
        });
    },
}