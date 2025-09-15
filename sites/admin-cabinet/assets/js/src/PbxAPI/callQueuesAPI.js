/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

/* global PbxApiClient */

/**
 * Call Queues API using unified PbxApiClient
 * All standard CRUD operations are provided by the base class
 */
const CallQueuesAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/call-queues',
    customMethods: {
        getDefault: ':getDefault',
        copy: ':copy'
    }
});

// Override getRecordId to handle ID field
CallQueuesAPI.getRecordId = function(data) {
    // v3 API uses 'id' field as primary identifier
    return data.id;
};

// The PbxApiClient automatically provides:
// - getList(callback) or getList(params, callback)
// - getRecord(id, callback) - uses :getDefault for new records
// - saveRecord(data, callback) - automatically selects POST/PUT
// - deleteRecord(id, callback)
// - callCustomMethod(methodName, data, callback)