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
 * This module encapsulates a collection of functions related to Call queues.
 *
 * @module Call queues
 */

const CallQueuesAPI= {
    /**
     * Deletes the call queue record with its dependent tables.
     *
     * @param {string} id - id of deleting call queue record.
     * @param {function} callback - The callback function to handle the API response.
     */
    deleteRecord(id, callback) {
        $.api({
            url: PbxApi.callQueuesDeleteRecord,
            on: 'now',
            method: 'POST',
            data: {id},
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback(false);
            },
        });
    },
}