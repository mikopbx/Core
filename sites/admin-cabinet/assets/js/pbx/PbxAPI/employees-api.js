"use strict";

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
var EmployeesAPI = new PbxApiClient({
  endpoint: '/pbxcore/api/v3/employees',
  customMethods: {
    getDefault: ':getDefault',
    "import": ':import',
    confirmImport: ':confirmImport',
    cancelImport: ':cancelImport',
    "export": ':export',
    exportTemplate: ':exportTemplate',
    batchCreate: ':batchCreate'
  }
}); // Add method aliases for compatibility and easier use using centralized utility

PbxApi.extendApiClient(EmployeesAPI, {
  /**
   * Get employee record for editing
   * Uses v3 RESTful API: GET /employees/{id} or GET /employees:getDefault for new
   * @param {string} recordId - Employee ID or empty/null for new employee
   * @param {function} callback - Callback function to handle response
   * @returns {Object} API call result
   */
  getRecord: function getRecord(recordId, callback) {
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
  deleteRecord: function deleteRecord(id, callback) {
    try {
      var validation = PbxApi.validateApiParams({
        id: id,
        callback: callback
      }, {
        required: ['id', 'callback'],
        types: {
          id: 'string',
          callback: 'function'
        }
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
  getList: function getList(params, callback) {
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
  importCSV: function importCSV(uploadId, action, strategy, callback) {
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
  confirmImport: function confirmImport(uploadId, strategy, callback) {
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
  cancelImport: function cancelImport(jobId, callback) {
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
  exportCSV: function exportCSV(format, filter, callback) {
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
  getTemplate: function getTemplate(format, callback) {
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
  batchCreate: function batchCreate(employees, callback) {
    return this.callCustomMethod('batchCreate', {
      employees: employees
    }, callback, 'POST');
  }
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvZW1wbG95ZWVzLWFwaS5qcyJdLCJuYW1lcyI6WyJFbXBsb3llZXNBUEkiLCJQYnhBcGlDbGllbnQiLCJlbmRwb2ludCIsImN1c3RvbU1ldGhvZHMiLCJnZXREZWZhdWx0IiwiY29uZmlybUltcG9ydCIsImNhbmNlbEltcG9ydCIsImV4cG9ydFRlbXBsYXRlIiwiYmF0Y2hDcmVhdGUiLCJQYnhBcGkiLCJleHRlbmRBcGlDbGllbnQiLCJnZXRSZWNvcmQiLCJyZWNvcmRJZCIsImNhbGxiYWNrIiwic3RhbmRhcmRHZXRSZWNvcmQiLCJlcnJvciIsImhhbmRsZUFwaUVycm9yIiwiZGVsZXRlUmVjb3JkIiwiaWQiLCJ2YWxpZGF0aW9uIiwidmFsaWRhdGVBcGlQYXJhbXMiLCJyZXF1aXJlZCIsInR5cGVzIiwiaXNWYWxpZCIsImVycm9ycyIsImpvaW4iLCJjYWxsRGVsZXRlIiwiZ2V0TGlzdCIsInBhcmFtcyIsImNhbGxHZXQiLCJpbXBvcnRDU1YiLCJ1cGxvYWRJZCIsImFjdGlvbiIsInN0cmF0ZWd5IiwiY2FsbEN1c3RvbU1ldGhvZCIsInVwbG9hZF9pZCIsImpvYklkIiwiam9iX2lkIiwiZXhwb3J0Q1NWIiwiZm9ybWF0IiwiZmlsdGVyIiwiZ2V0VGVtcGxhdGUiLCJlbXBsb3llZXMiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFlBQVksR0FBRyxJQUFJQyxZQUFKLENBQWlCO0FBQ2xDQyxFQUFBQSxRQUFRLEVBQUUsMkJBRHdCO0FBRWxDQyxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsVUFBVSxFQUFFLGFBREQ7QUFFWCxjQUFRLFNBRkc7QUFHWEMsSUFBQUEsYUFBYSxFQUFFLGdCQUhKO0FB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LFNBQVMsRUFBRUE7QUFENkIsS0FBckMsRUFFSjdCLFFBRkksRUFFTSxNQUZOLENBQVA7QUFHSDtBQWxJZ0MsQ0FBckMiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyMyBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgQ29uZmlnLCBQYnhBcGksIFBieEFwaUNsaWVudCwgJCAqLyBcblxuLyoqXG4gKiBFbXBsb3llZXNBUEkgLSBSRVNUIEFQSSB2MyBjbGllbnQgZm9yIGVtcGxveWVlcyBtYW5hZ2VtZW50XG4gKlxuICogUHJvdmlkZXMgYSBjbGVhbiBpbnRlcmZhY2UgZm9yIGVtcGxveWVlcyBvcGVyYXRpb25zIHVzaW5nIHRoZSBuZXcgUkVTVGZ1bCBBUEkuXG4gKlxuICogQGNsYXNzIEVtcGxveWVlc0FQSVxuICovXG5jb25zdCBFbXBsb3llZXNBUEkgPSBuZXcgUGJ4QXBpQ2xpZW50KHtcbiAgICBlbmRwb2ludDogJy9wYnhjb3JlL2FwaS92My9lbXBsb3llZXMnLFxuICAgIGN1c3RvbU1ldGhvZHM6IHtcbiAgICAgICAgZ2V0RGVmYXVsdDogJzpnZXREZWZhdWx0JyxcbiAgICAgICAgaW1wb3J0OiAnOmltcG9ydCcsXG4gICAgICAgIGNvbmZpcm1JbXBvcnQ6ICc6Y29uZmlybUltcG9ydCcsXG4gICAgICAgIGNhbmNlbEltcG9ydDogJzpjYW5jZWxJbXBvcnQnLFxuICAgICAgICBleHBvcnQ6ICc6ZXhwb3J0JyxcbiAgICAgICAgZXhwb3J0VGVtcGxhdGU6ICc6ZXhwb3J0VGVtcGxhdGUnLFxuICAgICAgICBiYXRjaENyZWF0ZTogJzpiYXRjaENyZWF0ZSdcbiAgICB9XG59KTtcblxuLy8gQWRkIG1ldGhvZCBhbGlhc2VzIGZvciBjb21wYXRpYmlsaXR5IGFuZCBlYXNpZXIgdXNlIHVzaW5nIGNlbnRyYWxpemVkIHV0aWxpdHlcblBieEFwaS5leHRlbmRBcGlDbGllbnQoRW1wbG95ZWVzQVBJLCB7XG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IGVtcGxveWVlIHJlY29yZCBmb3IgZWRpdGluZ1xuICAgICAqIFVzZXMgdjMgUkVTVGZ1bCBBUEk6IEdFVCAvZW1wbG95ZWVzL3tpZH0gb3IgR0VUIC9lbXBsb3llZXM6Z2V0RGVmYXVsdCBmb3IgbmV3XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHJlY29yZElkIC0gRW1wbG95ZWUgSUQgb3IgZW1wdHkvbnVsbCBmb3IgbmV3IGVtcGxveWVlXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgcmVzcG9uc2VcbiAgICAgKiBAcmV0dXJucyB7T2JqZWN0fSBBUEkgY2FsbCByZXN1bHRcbiAgICAgKi9cbiAgICBnZXRSZWNvcmQocmVjb3JkSWQsIGNhbGxiYWNrKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICAvLyBVc2Ugc3RhbmRhcmRpemVkIGdldFJlY29yZCBtZXRob2QgZnJvbSBwYnhhcGkgdXRpbGl0aWVzXG4gICAgICAgICAgICByZXR1cm4gUGJ4QXBpLnN0YW5kYXJkR2V0UmVjb3JkKHRoaXMsIHJlY29yZElkLCBjYWxsYmFjaywgdHJ1ZSwgJ2dldERlZmF1bHQnKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIHJldHVybiBQYnhBcGkuaGFuZGxlQXBpRXJyb3IoJ0VtcGxveWVlc0FQSS5nZXRSZWNvcmQnLCBlcnJvciwgY2FsbGJhY2spO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBEZWxldGUgZW1wbG95ZWUgcmVjb3JkXG4gICAgICogVXNlcyB2MyBSRVNUZnVsIEFQSTogREVMRVRFIC9lbXBsb3llZXMve2lkfVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpZCAtIEVtcGxveWVlIElEIHRvIGRlbGV0ZVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHJlc3BvbnNlXG4gICAgICogQHJldHVybnMge09iamVjdH0gQVBJIGNhbGwgcmVzdWx0XG4gICAgICovXG4gICAgZGVsZXRlUmVjb3JkKGlkLCBjYWxsYmFjaykge1xuICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgdmFsaWRhdGlvbiA9IFBieEFwaS52YWxpZGF0ZUFwaVBhcmFtcyh7IGlkLCBjYWxsYmFjayB9LCB7XG4gICAgICAgICAgICAgICAgcmVxdWlyZWQ6IFsnaWQnLCAnY2FsbGJhY2snXSxcbiAgICAgICAgICAgICAgICB0eXBlczogeyBpZDogJ3N0cmluZycsIGNhbGxiYWNrOiAnZnVuY3Rpb24nIH1cbiAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICBpZiAoIXZhbGlkYXRpb24uaXNWYWxpZCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBQYnhBcGkuaGFuZGxlQXBpRXJyb3IoJ0VtcGxveWVlc0FQSS5kZWxldGVSZWNvcmQnLCB2YWxpZGF0aW9uLmVycm9ycy5qb2luKCcsICcpLCBjYWxsYmFjayk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNhbGxEZWxldGUoY2FsbGJhY2ssIGlkKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIHJldHVybiBQYnhBcGkuaGFuZGxlQXBpRXJyb3IoJ0VtcGxveWVlc0FQSS5kZWxldGVSZWNvcmQnLCBlcnJvciwgY2FsbGJhY2spO1xuICAgICAgICB9XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZXQgbGlzdCBvZiBlbXBsb3llZXMgZm9yIERhdGFUYWJsZVxuICAgICAqIFVzZXMgdjMgUkVTVGZ1bCBBUEk6IEdFVCAvZW1wbG95ZWVzIHdpdGggcXVlcnkgcGFyYW1ldGVyc1xuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwYXJhbXMgLSBRdWVyeSBwYXJhbWV0ZXJzIChzZWFyY2gsIGxpbWl0LCBvZmZzZXQsIG9yZGVyX2J5LCBvcmRlcl9kaXJlY3Rpb24pXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBnZXRMaXN0KHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEdldChwYXJhbXMgfHwge30sIGNhbGxiYWNrKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEltcG9ydCBDU1YgZmlsZSB3aXRoIGVtcGxveWVlc1xuICAgICAqIFVzZXMgdjMgUkVTVGZ1bCBBUEk6IFBPU1QgL2VtcGxveWVlczppbXBvcnRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdXBsb2FkSWQgLSBVcGxvYWRlZCBmaWxlIElEXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGFjdGlvbiAtIEFjdGlvbiB0eXBlICgncHJldmlldycgb3IgJ2ltcG9ydCcpXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHN0cmF0ZWd5IC0gSW1wb3J0IHN0cmF0ZWd5ICgnc2tpcF9kdXBsaWNhdGVzJywgJ3VwZGF0ZV9leGlzdGluZycsICdmYWlsX29uX2R1cGxpY2F0ZScpXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBpbXBvcnRDU1YodXBsb2FkSWQsIGFjdGlvbiwgc3RyYXRlZ3ksIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2ltcG9ydCcsIHtcbiAgICAgICAgICAgIHVwbG9hZF9pZDogdXBsb2FkSWQsXG4gICAgICAgICAgICBhY3Rpb246IGFjdGlvbixcbiAgICAgICAgICAgIHN0cmF0ZWd5OiBzdHJhdGVneVxuICAgICAgICB9LCBjYWxsYmFjaywgJ1BPU1QnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENvbmZpcm0gQ1NWIGltcG9ydCBhZnRlciBwcmV2aWV3XG4gICAgICogVXNlcyB2MyBSRVNUZnVsIEFQSTogUE9TVCAvZW1wbG95ZWVzOmNvbmZpcm1JbXBvcnRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gdXBsb2FkSWQgLSBVcGxvYWQgc2Vzc2lvbiBJRFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBzdHJhdGVneSAtIEltcG9ydCBzdHJhdGVneVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHJlc3BvbnNlXG4gICAgICovXG4gICAgY29uZmlybUltcG9ydCh1cGxvYWRJZCwgc3RyYXRlZ3ksIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2NvbmZpcm1JbXBvcnQnLCB7XG4gICAgICAgICAgICB1cGxvYWRfaWQ6IHVwbG9hZElkLFxuICAgICAgICAgICAgc3RyYXRlZ3k6IHN0cmF0ZWd5XG4gICAgICAgIH0sIGNhbGxiYWNrLCAnUE9TVCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDYW5jZWwgcnVubmluZyBpbXBvcnQgam9iXG4gICAgICogVXNlcyB2MyBSRVNUZnVsIEFQSTogUE9TVCAvZW1wbG95ZWVzOmNhbmNlbEltcG9ydFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBqb2JJZCAtIEltcG9ydCBqb2IgSURcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSByZXNwb25zZVxuICAgICAqL1xuICAgIGNhbmNlbEltcG9ydChqb2JJZCwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnY2FuY2VsSW1wb3J0Jywge1xuICAgICAgICAgICAgam9iX2lkOiBqb2JJZFxuICAgICAgICB9LCBjYWxsYmFjaywgJ1BPU1QnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRXhwb3J0IGVtcGxveWVlcyB0byBDU1ZcbiAgICAgKiBVc2VzIHYzIFJFU1RmdWwgQVBJOiBQT1NUIC9lbXBsb3llZXM6ZXhwb3J0XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZvcm1hdCAtIEV4cG9ydCBmb3JtYXQgKCdtaW5pbWFsJywgJ3N0YW5kYXJkJywgJ2Z1bGwnKVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBmaWx0ZXIgLSBGaWx0ZXIgb3B0aW9ucyAobnVtYmVyX2Zyb20sIG51bWJlcl90bywgZXRjLilcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSByZXNwb25zZVxuICAgICAqL1xuICAgIGV4cG9ydENTVihmb3JtYXQsIGZpbHRlciwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZXhwb3J0Jywge1xuICAgICAgICAgICAgZm9ybWF0OiBmb3JtYXQsXG4gICAgICAgICAgICBmaWx0ZXI6IGZpbHRlclxuICAgICAgICB9LCBjYWxsYmFjaywgJ1BPU1QnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBDU1YgdGVtcGxhdGUgZm9yIGltcG9ydFxuICAgICAqIFVzZXMgdjMgUkVTVGZ1bCBBUEk6IEdFVCAvZW1wbG95ZWVzOnRlbXBsYXRlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZvcm1hdCAtIFRlbXBsYXRlIGZvcm1hdCAoJ21pbmltYWwnLCAnc3RhbmRhcmQnLCAnZnVsbCcpXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBnZXRUZW1wbGF0ZShmb3JtYXQsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNhbGxDdXN0b21NZXRob2QoJ2V4cG9ydFRlbXBsYXRlJywge1xuICAgICAgICAgICAgZm9ybWF0OiBmb3JtYXRcbiAgICAgICAgfSwgY2FsbGJhY2ssICdQT1NUJyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBCYXRjaCBjcmVhdGUgZW1wbG95ZWVzXG4gICAgICogVXNlcyB2MyBSRVNUZnVsIEFQSTogUE9TVCAvZW1wbG95ZWVzOmJhdGNoQ3JlYXRlXG4gICAgICogQHBhcmFtIHthcnJheX0gZW1wbG95ZWVzIC0gQXJyYXkgb2YgZW1wbG95ZWUgb2JqZWN0cyB0byBjcmVhdGVcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSByZXNwb25zZVxuICAgICAqL1xuICAgIGJhdGNoQ3JlYXRlKGVtcGxveWVlcywgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnYmF0Y2hDcmVhdGUnLCB7XG4gICAgICAgICAgICBlbXBsb3llZXM6IGVtcGxveWVlc1xuICAgICAgICB9LCBjYWxsYmFjaywgJ1BPU1QnKTtcbiAgICB9XG59KTsiXX0=