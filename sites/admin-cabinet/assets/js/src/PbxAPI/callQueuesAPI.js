/*
 * CallQueuesAPI - REST API client for call queue management
 *
 * Implements unified API approach with centralized endpoint definitions
 * and comprehensive error handling following IVR Menu patterns.
 */

/* global globalRootUrl, PbxApi, globalTranslate */

const CallQueuesAPI = {
    /**
     * API endpoints configuration
     */
    apiUrl: `/pbxcore/api/v2/call-queues/`,

    // Centralized endpoint definitions for easy maintenance
    endpoints: {
        getList: `/pbxcore/api/v2/call-queues/getList`,
        getRecord: `/pbxcore/api/v2/call-queues/getRecord`,
        saveRecord: `/pbxcore/api/v2/call-queues/saveRecord`,
        deleteRecord: `/pbxcore/api/v2/call-queues/deleteRecord`
    },

    /**
     * Get call queue record with all representation fields
     *
     * @param {string} id Record ID or empty string for new record
     * @param {function} callback Callback function to handle response
     */
    getRecord(id, callback) {
        const recordId = (!id || id === '') ? 'new' : id;

        $.api({
            url: `${this.endpoints.getRecord}/${recordId}`,
            method: 'GET',
            on: 'now',
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback({
                    result: false,
                    messages: {error: ['Network error occurred']}
                });
            }
        });
    },

    /**
     * Get list of all call queues with member representations
     *
     * @param {function} callback Callback function to handle response
     */
    getList(callback) {
        $.api({
            url: this.endpoints.getList,
            method: 'GET',
            on: 'now',
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback({result: false, data: []});
            }
        });
    },

    /**
     * Save call queue record (create or update)
     *
     * @param {object} data Data to save
     * @param {function} callback Callback function to handle response
     */
    saveRecord(data, callback) {
        const method = data.id ? 'PUT' : 'POST';
        const url = data.id ?
            `${this.endpoints.saveRecord}/${data.id}` :
            this.endpoints.saveRecord;

        $.api({
            url: url,
            method: method,
            data: data,
            on: 'now',
            // Session cookies automatically included for CSRF protection
            onSuccess(response) {
                callback(response);
            },
            onFailure(response) {
                callback(response);
            },
            onError() {
                callback({
                    result: false,
                    messages: {error: ['Network error occurred']}
                });
            }
        });
    },

    /**
     * Delete call queue record
     *
     * @param {string} id Record ID to delete
     * @param {function} callback Callback function to handle response
     */
    deleteRecord(id, callback) {
        $.api({
            url: `${this.endpoints.deleteRecord}/${id}`,
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
    }
};