"use strict";

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

/* global Config, PbxApi, Resumable */

/**
 * ModulesAPI - API client for module management operations
 *
 * Provides methods for installing, uninstalling, enabling, disabling modules,
 * checking module status, and managing module updates.
 *
 * @class ModulesAPI
 */
var ModulesAPI = {
  /**
   * Module management endpoints
   */
  endpoints: {
    moduleStartDownload: "".concat(Config.pbxUrl, "/pbxcore/api/modules/core/moduleStartDownload"),
    moduleDownloadStatus: "".concat(Config.pbxUrl, "/pbxcore/api/modules/core/moduleDownloadStatus"),
    installFromPackage: "".concat(Config.pbxUrl, "/pbxcore/api/modules/core/installFromPackage"),
    installFromRepo: "".concat(Config.pbxUrl, "/pbxcore/api/modules/core/installFromRepo"),
    statusOfModuleInstallation: "".concat(Config.pbxUrl, "/pbxcore/api/modules/core/statusOfModuleInstallation"),
    enableModule: "".concat(Config.pbxUrl, "/pbxcore/api/modules/core/enableModule"),
    disableModule: "".concat(Config.pbxUrl, "/pbxcore/api/modules/core/disableModule"),
    uninstallModule: "".concat(Config.pbxUrl, "/pbxcore/api/modules/core/uninstallModule"),
    getAvailableModules: "".concat(Config.pbxUrl, "/pbxcore/api/modules/core/getAvailableModules"),
    getModuleLink: "".concat(Config.pbxUrl, "/pbxcore/api/modules/core/getModuleLink"),
    updateAll: "".concat(Config.pbxUrl, "/pbxcore/api/modules/core/updateAll"),
    getMetadataFromModulePackage: "".concat(Config.pbxUrl, "/pbxcore/api/modules/core/getMetadataFromModulePackage"),
    getModuleInfo: "".concat(Config.pbxUrl, "/pbxcore/api/modules/core/getModuleInfo")
  },

  /**
   * Retrieves available modules from MIKO repository
   * @param {function} callback - Callback function
   */
  getAvailable: function getAvailable(callback) {
    $.api({
      url: this.endpoints.getAvailableModules,
      on: 'now',
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data, true);
      },
      onFailure: function onFailure(response) {
        callback(response, false);
      },
      onError: function onError() {
        callback(false, false);
      }
    });
  },

  /**
   * Installs a new module from a repository
   * @param {object} params - Installation parameters
   * @param {string} params.uniqid - Module unique ID
   * @param {string} params.releaseId - Release ID to install
   * @param {function} callback - Callback function
   */
  installFromRepo: function installFromRepo(params, callback) {
    $.api({
      url: this.endpoints.installFromRepo,
      on: 'now',
      method: 'POST',
      data: params,
      successTest: PbxApi.successTest,
      beforeXHR: function beforeXHR(xhr) {
        xhr.setRequestHeader('X-Async-Response-Channel-Id', params.channelId);
        return xhr;
      },
      onSuccess: function onSuccess(response) {
        callback(response, true);
      },
      onFailure: function onFailure(response) {
        callback(response, false);
      },
      onError: function onError() {
        callback(false, false);
      }
    });
  },

  /**
   * Installs a new module from an uploaded zip archive
   * @param {object} params - Installation parameters
   * @param {string} params.filePath - Path to uploaded zip file
   * @param {function} callback - Callback function
   */
  installFromPackage: function installFromPackage(params, callback) {
    $.api({
      url: this.endpoints.installFromPackage,
      on: 'now',
      method: 'POST',
      data: params,
      beforeXHR: function beforeXHR(xhr) {
        xhr.setRequestHeader('X-Async-Response-Channel-Id', params.channelId);
        return xhr;
      },
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response, true);
      },
      onFailure: function onFailure(response) {
        callback(response, false);
      },
      onError: function onError() {
        callback(false, false);
      }
    });
  },

  /**
   * Enables an extension module
   * @param {object} params - Enable parameters
   * @param {string} params.uniqid - Module unique ID
   * @param {function} [callback] - Optional callback function
   */
  enableModule: function enableModule(params, callback) {
    $.api({
      url: this.endpoints.enableModule,
      on: 'now',
      method: 'POST',
      data: params,
      successTest: PbxApi.successTest,
      beforeXHR: function beforeXHR(xhr) {
        xhr.setRequestHeader('X-Async-Response-Channel-Id', params.channelId);
        return xhr;
      },
      onSuccess: function onSuccess(response) {
        if (callback) callback(response, true);
      },
      onFailure: function onFailure(response) {
        if (callback) callback(response, false);
      },
      onError: function onError() {
        if (callback) callback(false, false);
      }
    });
  },

  /**
   * Disables an extension module
   * @param {object} params - Disable parameters
   * @param {string} params.uniqid - Module unique ID
   * @param {function} [callback] - Optional callback function
   */
  disableModule: function disableModule(params, callback) {
    $.api({
      url: this.endpoints.disableModule,
      on: 'now',
      method: 'POST',
      data: params,
      beforeXHR: function beforeXHR(xhr) {
        xhr.setRequestHeader('X-Async-Response-Channel-Id', params.channelId);
        return xhr;
      },
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        if (callback) callback(response, true);
      },
      onFailure: function onFailure(response) {
        if (callback) callback(response, false);
      },
      onError: function onError() {
        if (callback) callback(false, false);
      }
    });
  },

  /**
   * Uninstalls an extension module
   * @param {object} params - Uninstall parameters
   * @param {string} params.uniqid - Module unique ID
   * @param {boolean} [params.keepSettings=false] - Keep module settings
   * @param {function} callback - Callback function
   */
  uninstallModule: function uninstallModule(params, callback) {
    $.api({
      url: this.endpoints.uninstallModule,
      on: 'now',
      method: 'POST',
      data: params,
      beforeXHR: function beforeXHR(xhr) {
        xhr.setRequestHeader('X-Async-Response-Channel-Id', params.channelId);
        return xhr;
      },
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response, true);
      },
      onFailure: function onFailure(response) {
        callback(response, false);
      },
      onError: function onError() {
        callback(false, false);
      }
    });
  },

  /**
   * Retrieves module information from the repository
   * @param {object} params - Module info parameters
   * @param {string} params.uniqid - Module unique ID
   * @param {function} callback - Callback function
   */
  getModuleInfo: function getModuleInfo(params, callback) {
    $.api({
      url: this.endpoints.getModuleInfo,
      on: 'now',
      method: 'POST',
      data: params,
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response, true);
      },
      onFailure: function onFailure(response) {
        callback(response, false);
      },
      onError: function onError() {
        callback(false, false);
      }
    });
  },

  /**
   * Updates all installed modules
   * @param {object} params - Update parameters
   * @param {function} callback - Callback function
   */
  updateAll: function updateAll(params, callback) {
    $.api({
      url: this.endpoints.updateAll,
      on: 'now',
      method: 'POST',
      data: params,
      successTest: PbxApi.successTest,
      beforeXHR: function beforeXHR(xhr) {
        xhr.setRequestHeader('X-Async-Response-Channel-Id', params.channelId);
        return xhr;
      },
      onSuccess: function onSuccess(response) {
        callback(response, true);
      },
      onFailure: function onFailure(response) {
        callback(response, false);
      },
      onError: function onError() {
        callback(false, false);
      }
    });
  }
}; // Export for use in other modules

window.ModulesAPI = ModulesAPI;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvbW9kdWxlcy1hcGkuanMiXSwibmFtZXMiOlsiTW9kdWxlc0FQSSIsImVuZHBvaW50cyIsIm1vZHVsZVN0YXJ0RG93bmxvYWQiLCJDb25maWciLCJwYnhVcmwiLCJtb2R1bGVEb3dubG9hZFN0YXR1cyIsImluc3RhbGxGcm9tUGFja2FnZSIsImluc3RhbGxGcm9tUmVwbyIsInN0YXR1c09mTW9kdWxlSW5zdGFsbGF0aW9uIiwiZW5hYmxlTW9kdWxlIiwiZGlzYWJsZU1vZHVsZSIsInVuaW5zdGFsbE1vZHVsZSIsImdldEF2YWlsYWJsZU1vZHVsZXMiLCJnZXRNb2R1bGVMaW5rIiwidXBkYXRlQWxsIiwiZ2V0TWV0YWRhdGFGcm9tTW9kdWxlUGFja2FnZSIsImdldE1vZHVsZUluZm8iLCJnZXRBdmFpbGFibGUiLCJjYWxsYmFjayIsIiQiLCJhcGkiLCJ1cmwiLCJvbiIsInN1Y2Nlc3NUZXN0IiwiUGJ4QXBpIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJkYXRhIiwib25GYWlsdXJlIiwib25FcnJvciIsInBhcmFtcyIsIm1ldGhvZCIsImJlZm9yZVhIUiIsInhociIsInNldFJlcXVlc3RIZWFkZXIiLCJjaGFubmVsSWQiLCJ3aW5kb3ciXSwibWFwcGluZ3MiOiI7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsVUFBVSxHQUFHO0FBRWY7QUFDSjtBQUNBO0FBQ0lDLEVBQUFBLFNBQVMsRUFBRTtBQUNQQyxJQUFBQSxtQkFBbUIsWUFBS0MsTUFBTSxDQUFDQyxNQUFaLGtEQURaO0FBRVBDLElBQUFBLG9CQUFvQixZQUFLRixNQUFNLENBQUNDLE1BQVosbURBRmI7QUFHUEUsSUFBQUEsa0JBQWtCLFlBQUtILE1BQU0sQ0FB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TUFBTSxDQUFDSyxTQUE1RDtBQUNBLGVBQU9GLEdBQVA7QUFDSCxPQVRDO0FBVUZSLE1BQUFBLFNBVkUscUJBVVFDLFFBVlIsRUFVa0I7QUFDaEJSLFFBQUFBLFFBQVEsQ0FBQ1EsUUFBRCxFQUFXLElBQVgsQ0FBUjtBQUNILE9BWkM7QUFhRkUsTUFBQUEsU0FiRSxxQkFhUUYsUUFiUixFQWFrQjtBQUNoQlIsUUFBQUEsUUFBUSxDQUFDUSxRQUFELEVBQVcsS0FBWCxDQUFSO0FBQ0gsT0FmQztBQWdCRkcsTUFBQUEsT0FoQkUscUJBZ0JRO0FBQ05YLFFBQUFBLFFBQVEsQ0FBQyxLQUFELEVBQVEsS0FBUixDQUFSO0FBQ0g7QUFsQkMsS0FBTjtBQW9CSDtBQWhQYyxDQUFuQixDLENBbVBBOztBQUNBa0IsTUFBTSxDQUFDcEMsVUFBUCxHQUFvQkEsVUFBcEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNSBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgQ29uZmlnLCBQYnhBcGksIFJlc3VtYWJsZSAqL1xuXG4vKipcbiAqIE1vZHVsZXNBUEkgLSBBUEkgY2xpZW50IGZvciBtb2R1bGUgbWFuYWdlbWVudCBvcGVyYXRpb25zXG4gKlxuICogUHJvdmlkZXMgbWV0aG9kcyBmb3IgaW5zdGFsbGluZywgdW5pbnN0YWxsaW5nLCBlbmFibGluZywgZGlzYWJsaW5nIG1vZHVsZXMsXG4gKiBjaGVja2luZyBtb2R1bGUgc3RhdHVzLCBhbmQgbWFuYWdpbmcgbW9kdWxlIHVwZGF0ZXMuXG4gKlxuICogQGNsYXNzIE1vZHVsZXNBUElcbiAqL1xuY29uc3QgTW9kdWxlc0FQSSA9IHtcblxuICAgIC8qKlxuICAgICAqIE1vZHVsZSBtYW5hZ2VtZW50IGVuZHBvaW50c1xuICAgICAqL1xuICAgIGVuZHBvaW50czoge1xuICAgICAgICBtb2R1bGVTdGFydERvd25sb2FkOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL2NvcmUvbW9kdWxlU3RhcnREb3dubG9hZGAsXG4gICAgICAgIG1vZHVsZURvd25sb2FkU3RhdHVzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL2NvcmUvbW9kdWxlRG93bmxvYWRTdGF0dXNgLFxuICAgICAgICBpbnN0YWxsRnJvbVBhY2thZ2U6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvY29yZS9pbnN0YWxsRnJvbVBhY2thZ2VgLFxuICAgICAgICBpbnN0YWxsRnJvbVJlcG86IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvY29yZS9pbnN0YWxsRnJvbVJlcG9gLFxuICAgICAgICBzdGF0dXNPZk1vZHVsZUluc3RhbGxhdGlvbjogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy9jb3JlL3N0YXR1c09mTW9kdWxlSW5zdGFsbGF0aW9uYCxcbiAgICAgICAgZW5hYmxlTW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL2NvcmUvZW5hYmxlTW9kdWxlYCxcbiAgICAgICAgZGlzYWJsZU1vZHVsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy9jb3JlL2Rpc2FibGVNb2R1bGVgLFxuICAgICAgICB1bmluc3RhbGxNb2R1bGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvY29yZS91bmluc3RhbGxNb2R1bGVgLFxuICAgICAgICBnZXRBdmFpbGFibGVNb2R1bGVzOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL2NvcmUvZ2V0QXZhaWxhYmxlTW9kdWxlc2AsXG4gICAgICAgIGdldE1vZHVsZUxpbms6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvY29yZS9nZXRNb2R1bGVMaW5rYCxcbiAgICAgICAgdXBkYXRlQWxsOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL2NvcmUvdXBkYXRlQWxsYCxcbiAgICAgICAgZ2V0TWV0YWRhdGFGcm9tTW9kdWxlUGFja2FnZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy9jb3JlL2dldE1ldGFkYXRhRnJvbU1vZHVsZVBhY2thZ2VgLFxuICAgICAgICBnZXRNb2R1bGVJbmZvOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL2NvcmUvZ2V0TW9kdWxlSW5mb2BcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIGF2YWlsYWJsZSBtb2R1bGVzIGZyb20gTUlLTyByZXBvc2l0b3J5XG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGdldEF2YWlsYWJsZShjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHRoaXMuZW5kcG9pbnRzLmdldEF2YWlsYWJsZU1vZHVsZXMsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSwgdHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlLCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbnN0YWxscyBhIG5ldyBtb2R1bGUgZnJvbSBhIHJlcG9zaXRvcnlcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zIC0gSW5zdGFsbGF0aW9uIHBhcmFtZXRlcnNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLnVuaXFpZCAtIE1vZHVsZSB1bmlxdWUgSURcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLnJlbGVhc2VJZCAtIFJlbGVhc2UgSUQgdG8gaW5zdGFsbFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBpbnN0YWxsRnJvbVJlcG8ocGFyYW1zLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHRoaXMuZW5kcG9pbnRzLmluc3RhbGxGcm9tUmVwbyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YTogcGFyYW1zLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIGJlZm9yZVhIUih4aHIpIHtcbiAgICAgICAgICAgICAgICB4aHIuc2V0UmVxdWVzdEhlYWRlciAoJ1gtQXN5bmMtUmVzcG9uc2UtQ2hhbm5lbC1JZCcsIHBhcmFtcy5jaGFubmVsSWQpO1xuICAgICAgICAgICAgICAgIHJldHVybiB4aHI7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSwgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogSW5zdGFsbHMgYSBuZXcgbW9kdWxlIGZyb20gYW4gdXBsb2FkZWQgemlwIGFyY2hpdmVcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zIC0gSW5zdGFsbGF0aW9uIHBhcmFtZXRlcnNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLmZpbGVQYXRoIC0gUGF0aCB0byB1cGxvYWRlZCB6aXAgZmlsZVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBpbnN0YWxsRnJvbVBhY2thZ2UocGFyYW1zLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHRoaXMuZW5kcG9pbnRzLmluc3RhbGxGcm9tUGFja2FnZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YTogcGFyYW1zLFxuICAgICAgICAgICAgYmVmb3JlWEhSKHhocikge1xuICAgICAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyICgnWC1Bc3luYy1SZXNwb25zZS1DaGFubmVsLUlkJywgcGFyYW1zLmNoYW5uZWxJZCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHhocjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSwgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRW5hYmxlcyBhbiBleHRlbnNpb24gbW9kdWxlXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHBhcmFtcyAtIEVuYWJsZSBwYXJhbWV0ZXJzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy51bmlxaWQgLSBNb2R1bGUgdW5pcXVlIElEXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gW2NhbGxiYWNrXSAtIE9wdGlvbmFsIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZW5hYmxlTW9kdWxlKHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB0aGlzLmVuZHBvaW50cy5lbmFibGVNb2R1bGUsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHBhcmFtcyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBiZWZvcmVYSFIoeGhyKSB7XG4gICAgICAgICAgICAgICAgeGhyLnNldFJlcXVlc3RIZWFkZXIgKCdYLUFzeW5jLVJlc3BvbnNlLUNoYW5uZWwtSWQnLCBwYXJhbXMuY2hhbm5lbElkKTtcbiAgICAgICAgICAgICAgICByZXR1cm4geGhyO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2socmVzcG9uc2UsIHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2soZmFsc2UsIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERpc2FibGVzIGFuIGV4dGVuc2lvbiBtb2R1bGVcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zIC0gRGlzYWJsZSBwYXJhbWV0ZXJzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy51bmlxaWQgLSBNb2R1bGUgdW5pcXVlIElEXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gW2NhbGxiYWNrXSAtIE9wdGlvbmFsIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZGlzYWJsZU1vZHVsZShwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdGhpcy5lbmRwb2ludHMuZGlzYWJsZU1vZHVsZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YTogcGFyYW1zLFxuICAgICAgICAgICAgYmVmb3JlWEhSKHhocikge1xuICAgICAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyICgnWC1Bc3luYy1SZXNwb25zZS1DaGFubmVsLUlkJywgcGFyYW1zLmNoYW5uZWxJZCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHhocjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhmYWxzZSwgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVW5pbnN0YWxscyBhbiBleHRlbnNpb24gbW9kdWxlXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHBhcmFtcyAtIFVuaW5zdGFsbCBwYXJhbWV0ZXJzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy51bmlxaWQgLSBNb2R1bGUgdW5pcXVlIElEXG4gICAgICogQHBhcmFtIHtib29sZWFufSBbcGFyYW1zLmtlZXBTZXR0aW5ncz1mYWxzZV0gLSBLZWVwIG1vZHVsZSBzZXR0aW5nc1xuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICB1bmluc3RhbGxNb2R1bGUocGFyYW1zLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHRoaXMuZW5kcG9pbnRzLnVuaW5zdGFsbE1vZHVsZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YTogcGFyYW1zLFxuICAgICAgICAgICAgYmVmb3JlWEhSKHhocikge1xuICAgICAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyICgnWC1Bc3luYy1SZXNwb25zZS1DaGFubmVsLUlkJywgcGFyYW1zLmNoYW5uZWxJZCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHhocjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIHRydWUpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCBmYWxzZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSwgZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIG1vZHVsZSBpbmZvcm1hdGlvbiBmcm9tIHRoZSByZXBvc2l0b3J5XG4gICAgICogQHBhcmFtIHtvYmplY3R9IHBhcmFtcyAtIE1vZHVsZSBpbmZvIHBhcmFtZXRlcnNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLnVuaXFpZCAtIE1vZHVsZSB1bmlxdWUgSURcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZ2V0TW9kdWxlSW5mbyhwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdGhpcy5lbmRwb2ludHMuZ2V0TW9kdWxlSW5mbyxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YTogcGFyYW1zLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLCB0cnVlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UsIGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFVwZGF0ZXMgYWxsIGluc3RhbGxlZCBtb2R1bGVzXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHBhcmFtcyAtIFVwZGF0ZSBwYXJhbWV0ZXJzXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIHVwZGF0ZUFsbChwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdGhpcy5lbmRwb2ludHMudXBkYXRlQWxsLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiBwYXJhbXMsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgYmVmb3JlWEhSKHhocikge1xuICAgICAgICAgICAgICAgIHhoci5zZXRSZXF1ZXN0SGVhZGVyICgnWC1Bc3luYy1SZXNwb25zZS1DaGFubmVsLUlkJywgcGFyYW1zLmNoYW5uZWxJZCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHhocjtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSwgdHJ1ZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UsIGZhbHNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlLCBmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG59O1xuXG4vLyBFeHBvcnQgZm9yIHVzZSBpbiBvdGhlciBtb2R1bGVzXG53aW5kb3cuTW9kdWxlc0FQSSA9IE1vZHVsZXNBUEk7Il19