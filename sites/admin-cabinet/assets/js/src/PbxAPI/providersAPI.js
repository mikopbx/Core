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
 * ProvidersAPI - REST API v3 client for providers management
 * 
 * Provides a clean interface for provider operations using the new RESTful API.
 * Supports both SIP and IAX providers.
 * 
 * Note: Custom methods use colon notation without leading slash:
 * - Collection-level: /pbxcore/api/v3/providers:getDefault
 * - Resource-level: /pbxcore/api/v3/providers/{id}:getStatus
 * 
 * @class ProvidersAPI
 */
const ProvidersAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/providers',
    customMethods: {
        getDefault: ':getDefault',
        getForSelect: ':getForSelect',
        getStatuses: ':getStatuses',
        getStatus: ':getStatus',
        getHistory: ':getHistory',
        getStats: ':getStats',
        forceCheck: ':forceCheck',
        updateStatus: ':updateStatus',
        copy: ':copy'
    }
});

/**
 * Get providers formatted for dropdown selection
 * @param {object|function} dataOrCallback - Optional parameters or callback
 * @param {function} [callback] - Callback if first param is data
 */
ProvidersAPI.getForSelect = function(dataOrCallback, callback) {
    // Handle overloaded parameters
    if (typeof dataOrCallback === 'function') {
        this.callCustomMethod('getForSelect', dataOrCallback);
    } else {
        this.callCustomMethod('getForSelect', dataOrCallback || {}, callback);
    }
};

/**
 * Get all provider statuses
 * @param {function} callback - Callback function
 */
ProvidersAPI.getStatuses = function(callback) {
    this.callCustomMethod('getStatuses', callback);
};

/**
 * Get provider status by ID
 * @param {string} providerId - Provider ID  
 * @param {function} callback - Callback function
 */
ProvidersAPI.getStatus = function(providerId, callback) {
    this.callCustomMethod('getStatus', {id: providerId}, callback);
};

/**
 * Get provider history
 * @param {string} providerId - Provider ID
 * @param {function} callback - Callback function
 */
ProvidersAPI.getHistory = function(providerId, callback) {
    this.callCustomMethod('getHistory', {id: providerId}, callback);
};

/**
 * Get provider statistics
 * @param {string} providerId - Provider ID
 * @param {function} callback - Callback function
 */
ProvidersAPI.getStats = function(providerId, callback) {
    this.callCustomMethod('getStats', {id: providerId}, callback);
};

/**
 * Force provider status check
 * @param {string} providerId - Provider ID
 * @param {function} callback - Callback function
 */
ProvidersAPI.forceCheck = function(providerId, callback) {
    this.callCustomMethod('forceCheck', {id: providerId}, callback, 'POST');
};

/**
 * Update provider status
 * @param {string} providerId - Provider ID
 * @param {object} data - Status data
 * @param {function} callback - Callback function
 */
ProvidersAPI.updateStatus = function(providerId, data, callback) {
    this.callCustomMethod('updateStatus', {id: providerId, ...data}, callback, 'POST');
};

/**
 * SipProvidersAPI - REST API v3 client for SIP providers management
 * 
 * Specialized client for SIP-only provider operations.
 * 
 * @class SipProvidersAPI
 */
const SipProvidersAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/sip-providers',
    customMethods: {
        getDefault: ':getDefault',
        getStatuses: ':getStatuses',
        getStatus: ':getStatus',
        getHistory: ':getHistory',
        getStats: ':getStats',
        forceCheck: ':forceCheck',
        updateStatus: ':updateStatus',
        copy: ':copy'
    }
});

// Add custom methods for SIP providers
SipProvidersAPI.getStatuses = function(callback) {
    this.callCustomMethod('getStatuses', callback);
};

SipProvidersAPI.getStatus = function(providerId, callback) {
    this.callCustomMethod('getStatus', {id: providerId}, callback);
};

SipProvidersAPI.getHistory = function(providerId, callback) {
    this.callCustomMethod('getHistory', {id: providerId}, callback);
};

SipProvidersAPI.getStats = function(providerId, callback) {
    this.callCustomMethod('getStats', {id: providerId}, callback);
};

SipProvidersAPI.forceCheck = function(providerId, callback) {
    this.callCustomMethod('forceCheck', {id: providerId}, callback, 'POST');
};

SipProvidersAPI.updateStatus = function(providerId, data, callback) {
    this.callCustomMethod('updateStatus', {id: providerId, ...data}, callback, 'POST');
};

/**
 * IaxProvidersAPI - REST API v3 client for IAX providers management
 * 
 * Specialized client for IAX-only provider operations.
 * 
 * @class IaxProvidersAPI
 */
const IaxProvidersAPI = new PbxApiClient({
    endpoint: '/pbxcore/api/v3/iax-providers',
    customMethods: {
        getDefault: ':getDefault',
        getStatuses: ':getStatuses',
        getStatus: ':getStatus',
        getHistory: ':getHistory',
        getStats: ':getStats',
        forceCheck: ':forceCheck',
        updateStatus: ':updateStatus',
        copy: ':copy'
    }
});

// Add custom methods for IAX providers
IaxProvidersAPI.getStatuses = function(callback) {
    this.callCustomMethod('getStatuses', callback);
};

IaxProvidersAPI.getStatus = function(providerId, callback) {
    this.callCustomMethod('getStatus', {id: providerId}, callback);
};

IaxProvidersAPI.getHistory = function(providerId, callback) {
    this.callCustomMethod('getHistory', {id: providerId}, callback);
};

IaxProvidersAPI.getStats = function(providerId, callback) {
    this.callCustomMethod('getStats', {id: providerId}, callback);
};

IaxProvidersAPI.forceCheck = function(providerId, callback) {
    this.callCustomMethod('forceCheck', {id: providerId}, callback, 'POST');
};

IaxProvidersAPI.updateStatus = function(providerId, data, callback) {
    this.callCustomMethod('updateStatus', {id: providerId, ...data}, callback, 'POST');
};