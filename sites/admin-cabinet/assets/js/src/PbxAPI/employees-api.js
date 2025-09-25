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

/* global Config, PbxApi, PbxApiClient, $ */ 

/**
 * EmployeesAPI - REST API v3 client for employees management
 *
 * Provides a clean interface for employees operations using the new RESTful API.
 *
 * @class EmployeesAPI
 */
const EmployeesAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/employees',
    customMethods: {
        getDefault: ':getDefault',
        import: ':import',
        confirmImport: ':confirmImport',
        cancelImport: ':cancelImport',
        export: ':export',
        exportTemplate: ':exportTemplate',
        batchCreate: ':batchCreate'
    }
});

// Add method aliases for compatibility and easier use using centralized utility
PbxApi.extendApiClient(EmployeesAPI, {
    
    /**
     * Get employee record for editing
     * Uses v3 RESTful API: GET /employees/{id} or GET /employees:getDefault for new
     * @param {string} recordId - Employee ID or empty/null for new employee
     * @param {function} callback - Callback function to handle response
     * @returns {Object} API call result
     */
    getRecord(recordId, callback) {
        try {
            // Use standardized getRecord method from pbxapi utilities
            return PbxApi.standardGetRecord(this, recordId, callback, true, 'getDefault');
        } catch (error) {
            return PbxApi.handleApiError('EmployeesAPI.getRecord', error, callback);
        }
    },
    
    /**
     * Delete employee record
     * Uses v3 RESTful API: DELETE /employees/{id}
     * @param {string} id - Employee ID to delete
     * @param {function} callback - Callback function to handle response
     * @returns {Object} API call result
     */
    deleteRecord(id, callback) {
        try {
            const validation = PbxApi.validateApiParams({ id, callback }, {
                required: ['id', 'callback'],
                types: { id: 'string', callback: 'function' }
            });

            if (!validation.isValid) {
                return PbxApi.handleApiError('EmployeesAPI.deleteRecord', validation.errors.join(', '), callback);
            }

            return this.callDelete(callback, id);
        } catch (error) {
            return PbxApi.handleApiError('EmployeesAPI.deleteRecord', error, callback);
        }
    },
    
    /**
     * Get list of employees for DataTable
     * Uses v3 RESTful API: GET /employees with query parameters
     * @param {object} params - Query parameters (search, limit, offset, order_by, order_direction)
     * @param {function} callback - Callback function to handle response
     */
    getList(params, callback) {
        return this.callGet(params || {}, callback);
    },
    
    /**
     * Import CSV file with employees
     * Uses v3 RESTful API: POST /employees:import
     * @param {string} uploadId - Uploaded file ID
     * @param {string} action - Action type ('preview' or 'import')
     * @param {string} strategy - Import strategy ('skip_duplicates', 'update_existing', 'fail_on_duplicate')
     * @param {function} callback - Callback function to handle response
     */
    importCSV(uploadId, action, strategy, callback) {
        return this.callCustomMethod('import', {
            upload_id: uploadId,
            action: action,
            strategy: strategy
        }, callback, 'POST');
    },
    
    /**
     * Confirm CSV import after preview
     * Uses v3 RESTful API: POST /employees:confirmImport
     * @param {string} uploadId - Upload session ID
     * @param {string} strategy - Import strategy
     * @param {function} callback - Callback function to handle response
     */
    confirmImport(uploadId, strategy, callback) {
        return this.callCustomMethod('confirmImport', {
            upload_id: uploadId,
            strategy: strategy
        }, callback, 'POST');
    },

    /**
     * Cancel running import job
     * Uses v3 RESTful API: POST /employees:cancelImport
     * @param {string} jobId - Import job ID
     * @param {function} callback - Callback function to handle response
     */
    cancelImport(jobId, callback) {
        return this.callCustomMethod('cancelImport', {
            job_id: jobId
        }, callback, 'POST');
    },

    /**
     * Export employees to CSV
     * Uses v3 RESTful API: POST /employees:export
     * @param {string} format - Export format ('minimal', 'standard', 'full')
     * @param {object} filter - Filter options (number_from, number_to, etc.)
     * @param {function} callback - Callback function to handle response
     */
    exportCSV(format, filter, callback) {
        return this.callCustomMethod('export', {
            format: format,
            filter: filter
        }, callback, 'POST');
    },
    
    /**
     * Get CSV template for import
     * Uses v3 RESTful API: GET /employees:template
     * @param {string} format - Template format ('minimal', 'standard', 'full')
     * @param {function} callback - Callback function to handle response
     */
    getTemplate(format, callback) {
        return this.callCustomMethod('exportTemplate', {
            format: format
        }, callback, 'POST');
    },
    
    /**
     * Batch create employees
     * Uses v3 RESTful API: POST /employees:batchCreate
     * @param {array} employees - Array of employee objects to create
     * @param {function} callback - Callback function to handle response
     */
    batchCreate(employees, callback) {
        return this.callCustomMethod('batchCreate', {
            employees: employees
        }, callback, 'POST');
    }
});