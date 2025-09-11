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

/* global Config, PbxApi, $ */

/**
 * Employees API methods for V3 RESTful architecture
 * These methods provide clean REST API interface for employee data management
 * following REST conventions with proper HTTP methods
 */
const EmployeesAPI = {
    /**
     * API base URL for v3 RESTful endpoints
     */
    apiUrl: `${Config.pbxUrl}/pbxcore/api/v3/employees`,
    
    // Legacy v2 endpoints for backward compatibility (will be removed in future)
    v2Endpoints: {
        getRecord: `${Config.pbxUrl}/pbxcore/api/v2/employees/getRecord`,
        getNew: `${Config.pbxUrl}/pbxcore/api/v2/employees/new`,
        saveRecord: `${Config.pbxUrl}/pbxcore/api/v2/employees/saveRecord`,
        deleteRecord: `${Config.pbxUrl}/pbxcore/api/v2/employees/deleteRecord`
    },
    
    /**
     * Get employee record for editing
     * Uses v3 RESTful API: GET /employees/{id}
     * @param {string} recordId - Employee ID or 'new' for new employee
     * @param {function} callback - Callback function to handle response
     */
    getRecord(recordId, callback) {
        const id = (!recordId || recordId === '') ? 'new' : recordId;
        
        // v3 API: GET /employees/{id} or GET /employees/new
        const url = `${this.apiUrl}/${id}`;
        
        $.api({
            url: url,
            method: 'GET',
            on: 'now',
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback({result: false, messages: {error: 'Network error'}});
            }
        });
    },
    
    /**
     * Save employee record with proper POST/PUT method selection
     * Uses v3 RESTful API: POST /employees (create) or PUT /employees/{id} (update)
     * @param {object} data - Employee data to save
     * @param {function} callback - Callback function to handle response
     */
    saveRecord(data, callback) {
        // Check if this is a new record using the _isNew flag passed from form
        const isNew = data._isNew === true || !data.id || data.id === '';
        
        // Remove the flag before sending to server
        if (data._isNew !== undefined) {
            delete data._isNew;
        }
        
        // v3 API: POST for new records, PUT for updates
        const method = isNew ? 'POST' : 'PUT';
        const url = isNew ? this.apiUrl : `${this.apiUrl}/${data.id}`;
        
        $.api({
            url: url,
            method: method,
            data: data,
            on: 'now',
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback({result: false, messages: {error: 'Network error'}});
            }
        });
    },
    
    /**
     * Delete employee record
     * Uses v3 RESTful API: DELETE /employees/{id}
     * @param {string} id - Employee ID to delete
     * @param {function} callback - Callback function to handle response
     */
    deleteRecord(id, callback) {
        // v3 API: DELETE /employees/{id}
        $.api({
            url: `${this.apiUrl}/${id}`,
            on: 'now',
            method: 'DELETE',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback(false);
            }
        });
    },
    
    /**
     * Get list of employees for DataTable
     * Uses v3 RESTful API: GET /employees with query parameters
     * @param {object} params - Query parameters (search, limit, offset, order_by, order_direction)
     * @param {function} callback - Callback function to handle response
     */
    getList(params, callback) {
        // v3 API: GET /employees with query parameters
        $.api({
            url: this.apiUrl,
            method: 'GET',
            data: params,
            on: 'now',
            successTest: PbxApi.successTest,
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback({result: false, messages: {error: 'Network error'}});
            }
        });
    }
};