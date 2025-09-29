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
    "export": ':export',
    exportTemplate: ':exportTemplate',
    batchCreate: ':batchCreate'
  }
}); // Add method aliases for compatibility and easier use

Object.assign(EmployeesAPI, {
  /**
   * Get employee record for editing
   * Uses v3 RESTful API: GET /employees/{id} or GET /employees:getDefault for new
   * @param {string} recordId - Employee ID or empty/null for new employee
   * @param {function} callback - Callback function to handle response
   */
  getRecord: function getRecord(recordId, callback) {
    // Use :getDefault for new records, otherwise GET by ID
    var isNew = !recordId || recordId === '' || recordId === 'new';

    if (isNew) {
      return this.callCustomMethod('getDefault', {}, callback);
    } else {
      return this.callGet({}, callback, recordId);
    }
  },

  /**
   * Delete employee record
   * Uses v3 RESTful API: DELETE /employees/{id}
   * @param {string} id - Employee ID to delete
   * @param {function} callback - Callback function to handle response
   */
  deleteRecord: function deleteRecord(id, callback) {
    return this.callDelete(callback, id);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvZW1wbG95ZWVzLWFwaS5qcyJdLCJuYW1lcyI6WyJFbXBsb3llZXNBUEkiLCJQYnhBcGlDbGllbnQiLCJlbmRwb2ludCIsImN1c3RvbU1ldGhvZHMiLCJnZXREZWZhdWx0IiwiY29uZmlybUltcG9ydCIsImV4cG9ydFRlbXBsYXRlIiwiYmF0Y2hDcmVhdGUiLCJPYmplY3QiLCJhc3NpZ24iLCJnZXRSZWNvcmQiLCJyZWNvcmRJZCIsImNhbGxiYWNrIiwiaXNOZXciLCJjYWxsQ3VzdG9tTWV0aG9kIiwiY2FsbEdldCIsImRlbGV0ZVJlY29yZCIsImlkIiwiY2FsbERlbGV0ZSIsImdldExpc3QiLCJwYXJhbXMiLCJpbXBvcnRDU1YiLCJ1cGxvYWRJZCIsImFjdGlvbiIsInN0cmF0ZWd5IiwidXBsb2FkX2lkIiwiZXhwb3J0Q1NWIiwiZm9ybWF0IiwiZmlsdGVyIiwiZ2V0VGVtcGxhdGUiLCJlbXBsb3llZXMiXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLFlBQVksR0FBRyxJQUFJQyxZQUFKLENBQWlCO0FBQ2xDQyxFQUFBQSxRQUFRLEVBQUUsMkJBRHdCO0FBRWxDQyxFQUFBQSxhQUFhLEVBQUU7QUFDWEMsSUFBQUEsVUFBVSxFQUFFLGFBREQ7QUFFWCxjQUFRLFNBRkc7QUFHWEMsSUFBQUEsYUFBYSxFQUFFLGdCQUhKO0FBSVgsY0FBUSxTQUpHO0FBS1hDLElBQUFBLGNBQWMsRUFBRSxpQkFMTDtBQU1YQyxJQUFBQSxXQUFXLEVBQUU7QUFORjtBQUZtQixDQUFqQixDQUFyQixDLENBWUE7O0FBQ0FDLE1BQU0sQ0FBQ0MsTUFBUCxDQUFjVCxZQUFkLEVBQTRCO0FBRXhCO0FBQ0o7QUFDQTtBQUNBO0FB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QUZJLEVBRU0sTUFGTixDQUFQO0FBR0g7QUF6R3VCLENBQTVCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjMgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIENvbmZpZywgUGJ4QXBpLCBQYnhBcGlDbGllbnQsICQgKi8gXG5cbi8qKlxuICogRW1wbG95ZWVzQVBJIC0gUkVTVCBBUEkgdjMgY2xpZW50IGZvciBlbXBsb3llZXMgbWFuYWdlbWVudFxuICpcbiAqIFByb3ZpZGVzIGEgY2xlYW4gaW50ZXJmYWNlIGZvciBlbXBsb3llZXMgb3BlcmF0aW9ucyB1c2luZyB0aGUgbmV3IFJFU1RmdWwgQVBJLlxuICpcbiAqIEBjbGFzcyBFbXBsb3llZXNBUElcbiAqL1xuY29uc3QgRW1wbG95ZWVzQVBJID0gbmV3IFBieEFwaUNsaWVudCh7XG4gICAgZW5kcG9pbnQ6ICcvcGJ4Y29yZS9hcGkvdjMvZW1wbG95ZWVzJyxcbiAgICBjdXN0b21NZXRob2RzOiB7XG4gICAgICAgIGdldERlZmF1bHQ6ICc6Z2V0RGVmYXVsdCcsXG4gICAgICAgIGltcG9ydDogJzppbXBvcnQnLFxuICAgICAgICBjb25maXJtSW1wb3J0OiAnOmNvbmZpcm1JbXBvcnQnLFxuICAgICAgICBleHBvcnQ6ICc6ZXhwb3J0JyxcbiAgICAgICAgZXhwb3J0VGVtcGxhdGU6ICc6ZXhwb3J0VGVtcGxhdGUnLFxuICAgICAgICBiYXRjaENyZWF0ZTogJzpiYXRjaENyZWF0ZSdcbiAgICB9XG59KTtcblxuLy8gQWRkIG1ldGhvZCBhbGlhc2VzIGZvciBjb21wYXRpYmlsaXR5IGFuZCBlYXNpZXIgdXNlXG5PYmplY3QuYXNzaWduKEVtcGxveWVlc0FQSSwge1xuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBlbXBsb3llZSByZWNvcmQgZm9yIGVkaXRpbmdcbiAgICAgKiBVc2VzIHYzIFJFU1RmdWwgQVBJOiBHRVQgL2VtcGxveWVlcy97aWR9IG9yIEdFVCAvZW1wbG95ZWVzOmdldERlZmF1bHQgZm9yIG5ld1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSByZWNvcmRJZCAtIEVtcGxveWVlIElEIG9yIGVtcHR5L251bGwgZm9yIG5ldyBlbXBsb3llZVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHJlc3BvbnNlXG4gICAgICovXG4gICAgZ2V0UmVjb3JkKHJlY29yZElkLCBjYWxsYmFjaykge1xuICAgICAgICAvLyBVc2UgOmdldERlZmF1bHQgZm9yIG5ldyByZWNvcmRzLCBvdGhlcndpc2UgR0VUIGJ5IElEXG4gICAgICAgIGNvbnN0IGlzTmV3ID0gIXJlY29yZElkIHx8IHJlY29yZElkID09PSAnJyB8fCByZWNvcmRJZCA9PT0gJ25ldyc7XG5cbiAgICAgICAgaWYgKGlzTmV3KSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdnZXREZWZhdWx0Jywge30sIGNhbGxiYWNrKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNhbGxHZXQoe30sIGNhbGxiYWNrLCByZWNvcmRJZCk7XG4gICAgICAgIH1cbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIERlbGV0ZSBlbXBsb3llZSByZWNvcmRcbiAgICAgKiBVc2VzIHYzIFJFU1RmdWwgQVBJOiBERUxFVEUgL2VtcGxveWVlcy97aWR9XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGlkIC0gRW1wbG95ZWUgSUQgdG8gZGVsZXRlXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBkZWxldGVSZWNvcmQoaWQsIGNhbGxiYWNrKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmNhbGxEZWxldGUoY2FsbGJhY2ssIGlkKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEdldCBsaXN0IG9mIGVtcGxveWVlcyBmb3IgRGF0YVRhYmxlXG4gICAgICogVXNlcyB2MyBSRVNUZnVsIEFQSTogR0VUIC9lbXBsb3llZXMgd2l0aCBxdWVyeSBwYXJhbWV0ZXJzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHBhcmFtcyAtIFF1ZXJ5IHBhcmFtZXRlcnMgKHNlYXJjaCwgbGltaXQsIG9mZnNldCwgb3JkZXJfYnksIG9yZGVyX2RpcmVjdGlvbilcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSByZXNwb25zZVxuICAgICAqL1xuICAgIGdldExpc3QocGFyYW1zLCBjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gdGhpcy5jYWxsR2V0KHBhcmFtcyB8fCB7fSwgY2FsbGJhY2spO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSW1wb3J0IENTViBmaWxlIHdpdGggZW1wbG95ZWVzXG4gICAgICogVXNlcyB2MyBSRVNUZnVsIEFQSTogUE9TVCAvZW1wbG95ZWVzOmltcG9ydFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB1cGxvYWRJZCAtIFVwbG9hZGVkIGZpbGUgSURcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYWN0aW9uIC0gQWN0aW9uIHR5cGUgKCdwcmV2aWV3JyBvciAnaW1wb3J0JylcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gc3RyYXRlZ3kgLSBJbXBvcnQgc3RyYXRlZ3kgKCdza2lwX2R1cGxpY2F0ZXMnLCAndXBkYXRlX2V4aXN0aW5nJywgJ2ZhaWxfb25fZHVwbGljYXRlJylcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSByZXNwb25zZVxuICAgICAqL1xuICAgIGltcG9ydENTVih1cGxvYWRJZCwgYWN0aW9uLCBzdHJhdGVneSwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnaW1wb3J0Jywge1xuICAgICAgICAgICAgdXBsb2FkX2lkOiB1cGxvYWRJZCxcbiAgICAgICAgICAgIGFjdGlvbjogYWN0aW9uLFxuICAgICAgICAgICAgc3RyYXRlZ3k6IHN0cmF0ZWd5XG4gICAgICAgIH0sIGNhbGxiYWNrLCAnUE9TVCcpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ29uZmlybSBDU1YgaW1wb3J0IGFmdGVyIHByZXZpZXdcbiAgICAgKiBVc2VzIHYzIFJFU1RmdWwgQVBJOiBQT1NUIC9lbXBsb3llZXM6Y29uZmlybUltcG9ydFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSB1cGxvYWRJZCAtIFVwbG9hZCBzZXNzaW9uIElEXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHN0cmF0ZWd5IC0gSW1wb3J0IHN0cmF0ZWd5XG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvbiB0byBoYW5kbGUgcmVzcG9uc2VcbiAgICAgKi9cbiAgICBjb25maXJtSW1wb3J0KHVwbG9hZElkLCBzdHJhdGVneSwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnY29uZmlybUltcG9ydCcsIHtcbiAgICAgICAgICAgIHVwbG9hZF9pZDogdXBsb2FkSWQsXG4gICAgICAgICAgICBzdHJhdGVneTogc3RyYXRlZ3lcbiAgICAgICAgfSwgY2FsbGJhY2ssICdQT1NUJyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBFeHBvcnQgZW1wbG95ZWVzIHRvIENTVlxuICAgICAqIFVzZXMgdjMgUkVTVGZ1bCBBUEk6IFBPU1QgL2VtcGxveWVlczpleHBvcnRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZm9ybWF0IC0gRXhwb3J0IGZvcm1hdCAoJ21pbmltYWwnLCAnc3RhbmRhcmQnLCAnZnVsbCcpXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGZpbHRlciAtIEZpbHRlciBvcHRpb25zIChudW1iZXJfZnJvbSwgbnVtYmVyX3RvLCBldGMuKVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHJlc3BvbnNlXG4gICAgICovXG4gICAgZXhwb3J0Q1NWKGZvcm1hdCwgZmlsdGVyLCBjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdleHBvcnQnLCB7XG4gICAgICAgICAgICBmb3JtYXQ6IGZvcm1hdCxcbiAgICAgICAgICAgIGZpbHRlcjogZmlsdGVyXG4gICAgICAgIH0sIGNhbGxiYWNrLCAnUE9TVCcpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogR2V0IENTViB0ZW1wbGF0ZSBmb3IgaW1wb3J0XG4gICAgICogVXNlcyB2MyBSRVNUZnVsIEFQSTogR0VUIC9lbXBsb3llZXM6dGVtcGxhdGVcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gZm9ybWF0IC0gVGVtcGxhdGUgZm9ybWF0ICgnbWluaW1hbCcsICdzdGFuZGFyZCcsICdmdWxsJylcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uIHRvIGhhbmRsZSByZXNwb25zZVxuICAgICAqL1xuICAgIGdldFRlbXBsYXRlKGZvcm1hdCwgY2FsbGJhY2spIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuY2FsbEN1c3RvbU1ldGhvZCgnZXhwb3J0VGVtcGxhdGUnLCB7XG4gICAgICAgICAgICBmb3JtYXQ6IGZvcm1hdFxuICAgICAgICB9LCBjYWxsYmFjaywgJ1BPU1QnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEJhdGNoIGNyZWF0ZSBlbXBsb3llZXNcbiAgICAgKiBVc2VzIHYzIFJFU1RmdWwgQVBJOiBQT1NUIC9lbXBsb3llZXM6YmF0Y2hDcmVhdGVcbiAgICAgKiBAcGFyYW0ge2FycmF5fSBlbXBsb3llZXMgLSBBcnJheSBvZiBlbXBsb3llZSBvYmplY3RzIHRvIGNyZWF0ZVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gdG8gaGFuZGxlIHJlc3BvbnNlXG4gICAgICovXG4gICAgYmF0Y2hDcmVhdGUoZW1wbG95ZWVzLCBjYWxsYmFjaykge1xuICAgICAgICByZXR1cm4gdGhpcy5jYWxsQ3VzdG9tTWV0aG9kKCdiYXRjaENyZWF0ZScsIHtcbiAgICAgICAgICAgIGVtcGxveWVlczogZW1wbG95ZWVzXG4gICAgICAgIH0sIGNhbGxiYWNrLCAnUE9TVCcpO1xuICAgIH1cbn0pOyJdfQ==