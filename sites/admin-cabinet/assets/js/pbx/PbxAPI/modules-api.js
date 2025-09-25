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
        callback(response.data);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError() {
        callback(false);
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
      onSuccess: function onSuccess(response) {
        callback(response);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError() {
        callback(false);
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
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError() {
        callback(false);
      }
    });
  },

  /**
   * Checks the status of a module installation
   * @param {string} filePath - Path to the module package
   * @param {function} callback - Callback function
   */
  getModuleInstallationStatus: function getModuleInstallationStatus(filePath, callback) {
    $.api({
      url: this.endpoints.statusOfModuleInstallation,
      on: 'now',
      method: 'POST',
      data: {
        filePath: filePath
      },
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        if (response !== undefined && response.data !== undefined) {
          callback(response.data);
        }
      },
      onError: function onError(errorMessage, element, xhr) {
        if (xhr.status === 401) {
          window.location = "".concat(globalRootUrl, "session/index");
        }
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
      onSuccess: function onSuccess(response) {
        if (callback) callback(response);
      },
      onFailure: function onFailure(response) {
        if (callback) callback(response);
      },
      onError: function onError() {
        if (callback) callback(false);
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
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        if (callback) callback(response);
      },
      onFailure: function onFailure(response) {
        if (callback) callback(response);
      },
      onError: function onError() {
        if (callback) callback(false);
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
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError() {
        callback(false);
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
        callback(response);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError() {
        callback(false);
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
      onSuccess: function onSuccess(response) {
        callback(response);
      },
      onFailure: function onFailure(response) {
        callback(response);
      },
      onError: function onError() {
        callback(false);
      }
    });
  },

  /**
   * Starts module download in background
   * @param {object} params - Download parameters
   * @param {string} params.uniqid - Module unique ID
   * @param {string} params.md5 - MD5 checksum
   * @param {string} params.size - File size
   * @param {string} params.updateLink - Download URL
   * @param {function} callback - Callback function
   */
  moduleStartDownload: function moduleStartDownload(params, callback) {
    $.api({
      url: this.endpoints.moduleStartDownload,
      on: 'now',
      method: 'POST',
      data: params,
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data);
      },
      onError: function onError() {
        callback(false);
      }
    });
  },

  /**
   * Gets module download status
   * @param {string} moduleUniqueID - Module unique ID
   * @param {function} callback - Callback function
   * @param {boolean} [failureCallback] - Whether to call callback on failure
   */
  moduleDownloadStatus: function moduleDownloadStatus(moduleUniqueID, callback) {
    var failureCallback = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
    $.api({
      url: this.endpoints.moduleDownloadStatus,
      on: 'now',
      method: 'POST',
      data: {
        uniqid: moduleUniqueID
      },
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data);
      },
      onFailure: function onFailure() {
        if (failureCallback) callback(false);
      },
      onError: function onError() {
        if (failureCallback) callback(false);
      }
    });
  },

  /**
   * Retrieves module metadata from an uploaded zip archive
   * @param {string} filePath - Path to zip file
   * @param {function} callback - Callback function
   */
  getMetadataFromModulePackage: function getMetadataFromModulePackage(filePath, callback) {
    $.api({
      url: this.endpoints.getMetadataFromModulePackage,
      on: 'now',
      method: 'POST',
      data: {
        filePath: filePath
      },
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(true, response);
      },
      onError: function onError(errorMessage, element, xhr) {
        if (xhr.status === 401) {
          window.location = "".concat(globalRootUrl, "session/index");
        }

        callback(false, errorMessage);
      },
      onFailure: function onFailure(response) {
        callback(false, response);
      }
    });
  },

  /**
   * Retrieves the installation link for a module
   * @param {object} params - Link parameters
   * @param {string} params.uniqid - Module unique ID
   * @param {function} callback - Callback function
   */
  getModuleLink: function getModuleLink(params, callback) {
    $.api({
      url: this.endpoints.getModuleLink,
      on: 'now',
      method: 'POST',
      data: params,
      successTest: PbxApi.successTest,
      onSuccess: function onSuccess(response) {
        callback(response.data);
      },
      onError: function onError() {
        callback(false);
      }
    });
  },

  /**
   * Helper method to attach file upload to button with Resumable.js
   * @param {string} buttonId - Button element ID
   * @param {string[]} fileTypes - Allowed file types
   * @param {function} callback - Callback function for upload events
   */
  uploadFileAttachToBtn: function uploadFileAttachToBtn(buttonId, fileTypes, callback) {
    var r = new Resumable({
      target: "".concat(Config.pbxUrl, "/pbxcore/api/v3/files:upload"),
      testChunks: false,
      chunkSize: 3 * 1024 * 1024,
      maxFiles: 1,
      simultaneousUploads: 1,
      fileType: fileTypes
    });
    r.assignBrowse(document.getElementById(buttonId));
    r.on('fileSuccess', function (file, response) {
      callback('fileSuccess', {
        file: file,
        response: response
      });
    });
    r.on('fileProgress', function (file) {
      callback('fileProgress', {
        file: file
      });
    });
    r.on('fileAdded', function (file, event) {
      r.upload();
      callback('fileAdded', {
        file: file,
        event: event
      });
    });
    r.on('fileRetry', function (file) {
      callback('fileRetry', {
        file: file
      });
    });
    r.on('fileError', function (file, message) {
      callback('fileError', {
        file: file,
        message: message
      });
    });
    r.on('uploadStart', function () {
      callback('uploadStart');
    });
    r.on('complete', function () {
      callback('complete');
    });
    r.on('progress', function () {
      var percent = 100 * r.progress();
      callback('progress', {
        percent: percent
      });
    });
    r.on('error', function (message, file) {
      callback('error', {
        message: message,
        file: file
      });
    });
    r.on('pause', function () {
      callback('pause');
    });
    r.on('cancel', function () {
      callback('cancel');
    });
    r.on('chunkingStart', function (file) {
      callback('chunkingStart', {
        file: file
      });
    });
    r.on('chunkingProgress', function (file, ratio) {
      callback('chunkingProgress', {
        file: file,
        ratio: ratio
      });
    });
    r.on('chunkingComplete', function (file) {
      callback('chunkingComplete', {
        file: file
      });
    });
    return r;
  }
}; // Export for use in other modules

window.ModulesAPI = ModulesAPI;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhBUEkvbW9kdWxlcy1hcGkuanMiXSwibmFtZXMiOlsiTW9kdWxlc0FQSSIsImVuZHBvaW50cyIsIm1vZHVsZVN0YXJ0RG93bmxvYWQiLCJDb25maWciLCJwYnhVcmwiLCJtb2R1bGVEb3dubG9hZFN0YXR1cyIsImluc3RhbGxGcm9tUGFja2FnZSIsImluc3RhbGxGcm9tUmVwbyIsInN0YXR1c09mTW9kdWxlSW5zdGFsbGF0aW9uIiwiZW5hYmxlTW9kdWxlIiwiZGlzYWJsZU1vZHVsZSIsInVuaW5zdGFsbE1vZHVsZSIsImdldEF2YWlsYWJsZU1vZHVsZXMiLCJnZXRNb2R1bGVMaW5rIiwidXBkYXRlQWxsIiwiZ2V0TWV0YWRhdGFGcm9tTW9kdWxlUGFja2FnZSIsImdldE1vZHVsZUluZm8iLCJnZXRBdmFpbGFibGUiLCJjYWxsYmFjayIsIiQiLCJhcGkiLCJ1cmwiLCJvbiIsInN1Y2Nlc3NUZXN0IiwiUGJ4QXBpIiwib25TdWNjZXNzIiwicmVzcG9uc2UiLCJkYXRhIiwib25GYWlsdXJlIiwib25FcnJvciIsInBhcmFtcyIsIm1ldGhvZCIsImdldE1vZHVsZUluc3RhbGxhdGlvblN0YXR1cyIsImZpbGVQYXRoIiwidW5kZWZpbmVkIiwiZXJyb3JNZXNzYWdlIiwiZWxlbWVudCIsInhociIsInN0YXR1cyIsIndpbmRvdyIsImxvY2F0aW9uIiwiZ2xvYmFsUm9vdFVybCIsIm1vZHVsZVVuaXF1ZUlEIiwiZmFpbHVyZUNhbGxiYWNrIiwidW5pcWlkIiwidXBsb2FkRmlsZUF0dGFjaFRvQnRuIiwiYnV0dG9uSWQiLCJmaWxlVHlwZXMiLCJyIiwiUmVzdW1hYmxlIiwidGFyZ2V0IiwidGVzdENodW5rcyIsImNodW5rU2l6ZSIsIm1heEZpbGVzIiwic2ltdWx0YW5lb3VzVXBsb2FkcyIsImZpbGVUeXBlIiwiYXNzaWduQnJvd3NlIiwiZG9jdW1lbnQiLCJnZXRFbGVtZW50QnlJZCIsImZpbGUiLCJldmVudCIsInVwbG9hZCIsIm1lc3NhZ2UiLCJwZXJjZW50IiwicHJvZ3Jlc3MiLCJyYXRpbyJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxVQUFVLEdBQUc7QUFFZjtBQUNKO0FBQ0E7QUFDSUMsRUFBQUEsU0FBUyxFQUFFO0FBQ1BDLElBQUFBLG1CQUFtQixZQUFLQyxNQUFNLENBQUNDLE1BQVosa0RBRFo7QUFFUEMsSUFBQUEsb0JBQW9CLFlBQUtGLE1BQU0sQ0FBQ0MsTUFBWixtREFGYjtBQUdQRSxJQUFBQSxrQkFBa0IsWUFBS0gsTUFBTSxDQUFDQyxNQUFaLGlEQUhYO0FBSVBHLElBQUFBLGVBQWUsWUFBS0osTUFBTSxDQUFDQyxNQUFaLDhDQUpSO0FBS1BJLElBQUFBLDBCQUEwQixZQUFLTCxNQUFNLENBQUNDLE1BQVoseURBTG5CO0FBTVBLLElBQUFBLFlBQVksWUFBS04sTUFBTSxDQUFDQyxNQUFaLDJDQU5MO0FBT1BNLElBQUFBLGFBQWEsWUFBS1AsTUFBTSxDQUFDQyxNQUFaLDRDQVBOO0FBUVBPLElBQUFBLGVBQWUsWUFBS1IsTUFBTSxDQUFDQyxNQUFaLDhDQVJSO0FBU1BRLElBQUFBLG1CQUFtQixZQUFLVCxNQUFNLENBQUNDLE1BQVosa0RBVFo7QUFVUFMsSUFBQUEsYUFBYSxZQUFLVixNQUFNLENBQUNDLE1BQVosNENBVk47QUFXUFUsSUFBQUEsU0FBUyxZQUFLWCxNQUFNLENBQUNDLE1BQVosd0NBWEY7QUFZUFcsSUFBQUEsNEJBQTRCLFlBQUtaLE1BQU0sQ0FBQ0MsTUFBWiwyREFackI7QUFhUFksSUFBQUEsYUFBYSxZQUFLYixNQUFNLENBQUNDLE1BQVo7QUFiTixHQUxJOztBQXFCZjtBQUNKO0FBQ0E7QUFDQTtBQUNJYSxFQUFBQSxZQXpCZSx3QkF5QkZDLFFBekJFLEVBeUJRO0FBQ25CQyxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUUsS0FBS3BCLFNBQUwsQ0FBZVcsbUJBRGxCO0FBRUZVLE1BQUFBLEVBQUUsRUFBRSxLQUZGO0FBR0ZDLE1BQUFBLFdBQVcsRUFBRUMsTUFBTSxDQUFDRCxXQUhsQjtBQUlGRSxNQUFBQSxTQUpFLHFCQUlRQyxRQUpSLEVBSWtCO0FBQ2hCUixRQUFBQSxRQUFRLENBQUNRLFFBQVEsQ0FBQ0MsSUFBVixDQUFSO0FBQ0gsT0FOQztBQU9GQyxNQUFBQSxTQVBFLHFCQU9RRixRQVBSLEVBT2tCO0FBQ2hCUixRQUFBQSxRQUFRLENBQUNRLFFBQUQsQ0FBUjtBQUNILE9BVEM7QUFVRkcsTUFBQUEsT0FWRSxxQkFVUTtBQUNOWCxRQUFBQSxRQUFRLENBQUMsS0FBRCxDQUFSO0FBQ0g7QUFaQyxLQUFOO0FBY0gsR0F4Q2M7O0FBMENmO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lYLEVBQUFBLGVBakRlLDJCQWlEQ3VCLE1BakRELEVBaURTWixRQWpEVCxFQWlEbUI7QUFDOUJDLElBQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0ZDLE1BQUFBLEdBQUcsRUFBRSxLQUFLcEIsU0FBTCxDQUFlTSxlQURsQjtBQUVGZSxNQUFBQSxFQUFFLEVBQUUsS0FGRjtBQUdGUyxNQUFBQSxNQUFNLEVBQUUsTUFITjtBQUlGSixNQUFBQSxJQUFJLEVBQUVHLE1BSko7QUFLRlAsTUFBQUEsV0FBVyxFQUFFQyxNQUFNLENBQUNELFdBTGxCO0FBTUZFLE1BQUFBLFNBTkUscUJBTVFDLFFBTlIsRUFNa0I7QUFDaEJSLFFBQUFBLFFBQVEsQ0FBQ1EsUUFBRCxDQUFSO0FBQ0gsT0FSQztBQVNGRSxNQUFBQSxTQVRFLHFCQVNRRixRQVRSLEVBU2tCO0FBQ2hCUixRQUFBQSxRQUFRLENBQUNRLFFBQUQsQ0FBUjtBQUNILE9BWEM7QUFZRkcsTUFBQUEsT0FaRSxxQkFZUTtBQUNOWCxRQUFBQSxRQUFRLENBQUMsS0FBRCxDQUFSO0FBQ0g7QUFkQyxLQUFOO0FBZ0JILEdBbEVjOztBQW9FZjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSVosRUFBQUEsa0JBMUVlLDhCQTBFSXdCLE1BMUVKLEVBMEVZWixRQTFFWixFQTBFc0I7QUFDakNDLElBQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0ZDLE1BQUFBLEdBQUcsRUFBRSxLQUFLcEIsU0FBTCxDQUFlSyxrQkFEbEI7QUFFRmdCLE1BQUFBLEVBQUUsRUFBRSxLQUZGO0FBR0ZTLE1BQUFBLE1BQU0sRUFBRSxNQUhOO0FBSUZKLE1BQUFBLElBQUksRUFBRUcsTUFKSjtBQUtGUCxNQUFBQSxXQUFXLEVBQUVDLE1BQU0sQ0FBQ0QsV0FMbEI7QUFNRkUsTUFBQUEsU0FORSxxQkFNUUMsUUFOUixFQU1rQjtBQUNoQlIsUUFBQUEsUUFBUSxDQUFDUSxRQUFELENBQVI7QUFDSCxPQVJDO0FBU0ZFLE1BQUFBLFNBVEUscUJBU1FGLFFBVFIsRUFTa0I7QUFDaEJSLFFBQUFBLFFBQVEsQ0FBQ1EsUUFBRCxDQUFSO0FBQ0gsT0FYQztBQVlGRyxNQUFBQSxPQVpFLHFCQVlRO0FBQ05YLFFBQUFBLFFBQVEsQ0FBQyxLQUFELENBQVI7QUFDSDtBQWRDLEtBQU47QUFnQkgsR0EzRmM7O0FBNkZmO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSWMsRUFBQUEsMkJBbEdlLHVDQWtHYUMsUUFsR2IsRUFrR3VCZixRQWxHdkIsRUFrR2lDO0FBQzVDQyxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUUsS0FBS3BCLFNBQUwsQ0FBZU8sMEJBRGxCO0FBRUZjLE1BQUFBLEVBQUUsRUFBRSxLQUZGO0FBR0ZTLE1BQUFBLE1BQU0sRUFBRSxNQUhOO0FBSUZKLE1BQUFBLElBQUksRUFBRTtBQUFFTSxRQUFBQSxRQUFRLEVBQVJBO0FBQUYsT0FKSjtBQUtGVixNQUFBQSxXQUFXLEVBQUVDLE1BQU0sQ0FBQ0QsV0FMbEI7QUFNRkUsTUFBQUEsU0FORSxxQkFNUUMsUUFOUixFQU1rQjtBQUNoQixZQUFJQSxRQUFRLEtBQUtRLFNBQWIsSUFBMEJSLFFBQVEsQ0FBQ0MsSUFBVCxLQUFrQk8sU0FBaEQsRUFBMkQ7QUFDdkRoQixVQUFBQSxRQUFRLENBQUNRLFFBQVEsQ0FBQ0MsSUFBVixDQUFSO0FBQ0g7QUFDSixPQVZDO0FBV0ZFLE1BQUFBLE9BWEUsbUJBV01NLFlBWE4sRUFXb0JDLE9BWHBCLEVBVzZCQyxHQVg3QixFQVdrQztBQUNoQyxZQUFJQSxHQUFHLENBQUNDLE1BQUosS0FBZSxHQUFuQixFQUF3QjtBQUNwQkMsVUFBQUEsTUFBTSxDQUFDQyxRQUFQLGFBQXFCQyxhQUFyQjtBQUNIO0FBQ0o7QUFmQyxLQUFOO0FBaUJILEdBcEhjOztBQXNIZjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSWhDLEVBQUFBLFlBNUhlLHdCQTRIRnFCLE1BNUhFLEVBNEhNWixRQTVITixFQTRIZ0I7QUFDM0JDLElBQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0ZDLE1BQUFBLEdBQUcsRUFBRSxLQUFLcEIsU0FBTCxDQUFlUSxZQURsQjtBQUVGYSxNQUFBQSxFQUFFLEVBQUUsS0FGRjtBQUdGUyxNQUFBQSxNQUFNLEVBQUUsTUFITjtBQUlGSixNQUFBQSxJQUFJLEVBQUVHLE1BSko7QUFLRlAsTUFBQUEsV0FBVyxFQUFFQyxNQUFNLENBQUNELFdBTGxCO0FBTUZFLE1BQUFBLFNBTkUscUJBTVFDLFFBTlIsRUFNa0I7QUFDaEIsWUFBSVIsUUFBSixFQUFjQSxRQUFRLENBQUNRLFFBQUQsQ0FBUjtBQUNqQixPQVJDO0FBU0ZFLE1BQUFBLFNBVEUscUJBU1FGLFFBVFIsRUFTa0I7QUFDaEIsWUFBSVIsUUFBSixFQUFjQSxRQUFRLENBQUNRLFFBQUQsQ0FBUjtBQUNqQixPQVhDO0FBWUZHLE1BQUFBLE9BWkUscUJBWVE7QUFDTixZQUFJWCxRQUFKLEVBQWNBLFFBQVEsQ0FBQyxLQUFELENBQVI7QUFDakI7QUFkQyxLQUFOO0FBZ0JILEdBN0ljOztBQStJZjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSVIsRUFBQUEsYUFySmUseUJBcUpEb0IsTUFySkMsRUFxSk9aLFFBckpQLEVBcUppQjtBQUM1QkMsSUFBQUEsQ0FBQyxDQUFDQyxHQUFGLENBQU07QUFDRkMsTUFBQUEsR0FBRyxFQUFFLEtBQUtwQixTQUFMLENBQWVTLGFBRGxCO0FBRUZZLE1BQUFBLEVBQUUsRUFBRSxLQUZGO0FBR0ZTLE1BQUFBLE1BQU0sRUFBRSxNQUhOO0FBSUZKLE1BQUFBLElBQUksRUFBRUcsTUFKSjtBQUtGUCxNQUFBQSxXQUFXLEVBQUVDLE1BQU0sQ0FBQ0QsV0FMbEI7QUFNRkUsTUFBQUEsU0FORSxxQkFNUUMsUUFOUixFQU1rQjtBQUNoQixZQUFJUixRQUFKLEVBQWNBLFFBQVEsQ0FBQ1EsUUFBRCxDQUFSO0FBQ2pCLE9BUkM7QUFTRkUsTUFBQUEsU0FURSxxQkFTUUYsUUFUUixFQVNrQjtBQUNoQixZQUFJUixRQUFKLEVBQWNBLFFBQVEsQ0FBQ1EsUUFBRCxDQUFSO0FBQ2pCLE9BWEM7QUFZRkcsTUFBQUEsT0FaRSxxQkFZUTtBQUNOLFlBQUlYLFFBQUosRUFBY0EsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNqQjtBQWRDLEtBQU47QUFnQkgsR0F0S2M7O0FBd0tmO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lQLEVBQUFBLGVBL0tlLDJCQStLQ21CLE1BL0tELEVBK0tTWixRQS9LVCxFQStLbUI7QUFDOUJDLElBQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0ZDLE1BQUFBLEdBQUcsRUFBRSxLQUFLcEIsU0FBTCxDQUFlVSxlQURsQjtBQUVGVyxNQUFBQSxFQUFFLEVBQUUsS0FGRjtBQUdGUyxNQUFBQSxNQUFNLEVBQUUsTUFITjtBQUlGSixNQUFBQSxJQUFJLEVBQUVHLE1BSko7QUFLRlAsTUFBQUEsV0FBVyxFQUFFQyxNQUFNLENBQUNELFdBTGxCO0FBTUZFLE1BQUFBLFNBTkUscUJBTVFDLFFBTlIsRUFNa0I7QUFDaEJSLFFBQUFBLFFBQVEsQ0FBQ1EsUUFBRCxDQUFSO0FBQ0gsT0FSQztBQVNGRSxNQUFBQSxTQVRFLHFCQVNRRixRQVRSLEVBU2tCO0FBQ2hCUixRQUFBQSxRQUFRLENBQUNRLFFBQUQsQ0FBUjtBQUNILE9BWEM7QUFZRkcsTUFBQUEsT0FaRSxxQkFZUTtBQUNOWCxRQUFBQSxRQUFRLENBQUMsS0FBRCxDQUFSO0FBQ0g7QUFkQyxLQUFOO0FBZ0JILEdBaE1jOztBQWtNZjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSUYsRUFBQUEsYUF4TWUseUJBd01EYyxNQXhNQyxFQXdNT1osUUF4TVAsRUF3TWlCO0FBQzVCQyxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUUsS0FBS3BCLFNBQUwsQ0FBZWUsYUFEbEI7QUFFRk0sTUFBQUEsRUFBRSxFQUFFLEtBRkY7QUFHRlMsTUFBQUEsTUFBTSxFQUFFLE1BSE47QUFJRkosTUFBQUEsSUFBSSxFQUFFRyxNQUpKO0FBS0ZQLE1BQUFBLFdBQVcsRUFBRUMsTUFBTSxDQUFDRCxXQUxsQjtBQU1GRSxNQUFBQSxTQU5FLHFCQU1RQyxRQU5SLEVBTWtCO0FBQ2hCUixRQUFBQSxRQUFRLENBQUNRLFFBQUQsQ0FBUjtBQUNILE9BUkM7QUFTRkUsTUFBQUEsU0FURSxxQkFTUUYsUUFUUixFQVNrQjtBQUNoQlIsUUFBQUEsUUFBUSxDQUFDUSxRQUFELENBQVI7QUFDSCxPQVhDO0FBWUZHLE1BQUFBLE9BWkUscUJBWVE7QUFDTlgsUUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNIO0FBZEMsS0FBTjtBQWdCSCxHQXpOYzs7QUEyTmY7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJSixFQUFBQSxTQWhPZSxxQkFnT0xnQixNQWhPSyxFQWdPR1osUUFoT0gsRUFnT2E7QUFDeEJDLElBQUFBLENBQUMsQ0FBQ0MsR0FBRixDQUFNO0FBQ0ZDLE1BQUFBLEdBQUcsRUFBRSxLQUFLcEIsU0FBTCxDQUFlYSxTQURsQjtBQUVGUSxNQUFBQSxFQUFFLEVBQUUsS0FGRjtBQUdGUyxNQUFBQSxNQUFNLEVBQUUsTUFITjtBQUlGSixNQUFBQSxJQUFJLEVBQUVHLE1BSko7QUFLRlAsTUFBQUEsV0FBVyxFQUFFQyxNQUFNLENBQUNELFdBTGxCO0FBTUZFLE1BQUFBLFNBTkUscUJBTVFDLFFBTlIsRUFNa0I7QUFDaEJSLFFBQUFBLFFBQVEsQ0FBQ1EsUUFBRCxDQUFSO0FBQ0gsT0FSQztBQVNGRSxNQUFBQSxTQVRFLHFCQVNRRixRQVRSLEVBU2tCO0FBQ2hCUixRQUFBQSxRQUFRLENBQUNRLFFBQUQsQ0FBUjtBQUNILE9BWEM7QUFZRkcsTUFBQUEsT0FaRSxxQkFZUTtBQUNOWCxRQUFBQSxRQUFRLENBQUMsS0FBRCxDQUFSO0FBQ0g7QUFkQyxLQUFOO0FBZ0JILEdBalBjOztBQW1QZjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSWhCLEVBQUFBLG1CQTVQZSwrQkE0UEs0QixNQTVQTCxFQTRQYVosUUE1UGIsRUE0UHVCO0FBQ2xDQyxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUUsS0FBS3BCLFNBQUwsQ0FBZUMsbUJBRGxCO0FBRUZvQixNQUFBQSxFQUFFLEVBQUUsS0FGRjtBQUdGUyxNQUFBQSxNQUFNLEVBQUUsTUFITjtBQUlGSixNQUFBQSxJQUFJLEVBQUVHLE1BSko7QUFLRlAsTUFBQUEsV0FBVyxFQUFFQyxNQUFNLENBQUNELFdBTGxCO0FBTUZFLE1BQUFBLFNBTkUscUJBTVFDLFFBTlIsRUFNa0I7QUFDaEJSLFFBQUFBLFFBQVEsQ0FBQ1EsUUFBUSxDQUFDQyxJQUFWLENBQVI7QUFDSCxPQVJDO0FBU0ZFLE1BQUFBLE9BVEUscUJBU1E7QUFDTlgsUUFBQUEsUUFBUSxDQUFDLEtBQUQsQ0FBUjtBQUNIO0FBWEMsS0FBTjtBQWFILEdBMVFjOztBQTRRZjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSWIsRUFBQUEsb0JBbFJlLGdDQWtSTXFDLGNBbFJOLEVBa1JzQnhCLFFBbFJ0QixFQWtSd0Q7QUFBQSxRQUF4QnlCLGVBQXdCLHVFQUFOLElBQU07QUFDbkV4QixJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUUsS0FBS3BCLFNBQUwsQ0FBZUksb0JBRGxCO0FBRUZpQixNQUFBQSxFQUFFLEVBQUUsS0FGRjtBQUdGUyxNQUFBQSxNQUFNLEVBQUUsTUFITjtBQUlGSixNQUFBQSxJQUFJLEVBQUU7QUFBRWlCLFFBQUFBLE1BQU0sRUFBRUY7QUFBVixPQUpKO0FBS0ZuQixNQUFBQSxXQUFXLEVBQUVDLE1BQU0sQ0FBQ0QsV0FMbEI7QUFNRkUsTUFBQUEsU0FORSxxQkFNUUMsUUFOUixFQU1rQjtBQUNoQlIsUUFBQUEsUUFBUSxDQUFDUSxRQUFRLENBQUNDLElBQVYsQ0FBUjtBQUNILE9BUkM7QUFTRkMsTUFBQUEsU0FURSx1QkFTVTtBQUNSLFlBQUllLGVBQUosRUFBcUJ6QixRQUFRLENBQUMsS0FBRCxDQUFSO0FBQ3hCLE9BWEM7QUFZRlcsTUFBQUEsT0FaRSxxQkFZUTtBQUNOLFlBQUljLGVBQUosRUFBcUJ6QixRQUFRLENBQUMsS0FBRCxDQUFSO0FBQ3hCO0FBZEMsS0FBTjtBQWdCSCxHQW5TYzs7QUFxU2Y7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJSCxFQUFBQSw0QkExU2Usd0NBMFNja0IsUUExU2QsRUEwU3dCZixRQTFTeEIsRUEwU2tDO0FBQzdDQyxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUUsS0FBS3BCLFNBQUwsQ0FBZWMsNEJBRGxCO0FBRUZPLE1BQUFBLEVBQUUsRUFBRSxLQUZGO0FBR0ZTLE1BQUFBLE1BQU0sRUFBRSxNQUhOO0FBSUZKLE1BQUFBLElBQUksRUFBRTtBQUFFTSxRQUFBQSxRQUFRLEVBQVJBO0FBQUYsT0FKSjtBQUtGVixNQUFBQSxXQUFXLEVBQUVDLE1BQU0sQ0FBQ0QsV0FMbEI7QUFNRkUsTUFBQUEsU0FORSxxQkFNUUMsUUFOUixFQU1rQjtBQUNoQlIsUUFBQUEsUUFBUSxDQUFDLElBQUQsRUFBT1EsUUFBUCxDQUFSO0FBQ0gsT0FSQztBQVNGRyxNQUFBQSxPQVRFLG1CQVNNTSxZQVROLEVBU29CQyxPQVRwQixFQVM2QkMsR0FUN0IsRUFTa0M7QUFDaEMsWUFBSUEsR0FBRyxDQUFDQyxNQUFKLEtBQWUsR0FBbkIsRUFBd0I7QUFDcEJDLFVBQUFBLE1BQU0sQ0FBQ0MsUUFBUCxhQUFxQkMsYUFBckI7QUFDSDs7QUFDRHZCLFFBQUFBLFFBQVEsQ0FBQyxLQUFELEVBQVFpQixZQUFSLENBQVI7QUFDSCxPQWRDO0FBZUZQLE1BQUFBLFNBZkUscUJBZVFGLFFBZlIsRUFla0I7QUFDaEJSLFFBQUFBLFFBQVEsQ0FBQyxLQUFELEVBQVFRLFFBQVIsQ0FBUjtBQUNIO0FBakJDLEtBQU47QUFtQkgsR0E5VGM7O0FBZ1VmO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJYixFQUFBQSxhQXRVZSx5QkFzVURpQixNQXRVQyxFQXNVT1osUUF0VVAsRUFzVWlCO0FBQzVCQyxJQUFBQSxDQUFDLENBQUNDLEdBQUYsQ0FBTTtBQUNGQyxNQUFBQSxHQUFHLEVBQUUsS0FBS3BCLFNBQUwsQ0FBZVksYUFEbEI7QUFFRlMsTUFBQUEsRUFBRSxFQUFFLEtBRkY7QUFHRlMsTUFBQUEsTUFBTSxFQUFFLE1BSE47QUFJRkosTUFBQUEsSUFBSSxFQUFFRyxNQUpKO0FBS0ZQLE1BQUFBLFdBQVcsRUFBRUMsTUFBTSxDQUFDRCxXQUxsQjtBQU1GRSxNQUFBQSxTQU5FLHFCQU1RQyxRQU5SLEVBTWtCO0FBQ2hCUixRQUFBQSxRQUFRLENBQUNRLFFBQVEsQ0FBQ0MsSUFBVixDQUFSO0FBQ0gsT0FSQztBQVNGRSxNQUFBQSxPQVRFLHFCQVNRO0FBQ05YLFFBQUFBLFFBQVEsQ0FBQyxLQUFELENBQVI7QUFDSDtBQVhDLEtBQU47QUFhSCxHQXBWYzs7QUFzVmY7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0kyQixFQUFBQSxxQkE1VmUsaUNBNFZPQyxRQTVWUCxFQTRWaUJDLFNBNVZqQixFQTRWNEI3QixRQTVWNUIsRUE0VnNDO0FBQ2pELFFBQU04QixDQUFDLEdBQUcsSUFBSUMsU0FBSixDQUFjO0FBQ3BCQyxNQUFBQSxNQUFNLFlBQUsvQyxNQUFNLENBQUNDLE1BQVosaUNBRGM7QUFFcEIrQyxNQUFBQSxVQUFVLEVBQUUsS0FGUTtBQUdwQkMsTUFBQUEsU0FBUyxFQUFFLElBQUksSUFBSixHQUFXLElBSEY7QUFJcEJDLE1BQUFBLFFBQVEsRUFBRSxDQUpVO0FBS3BCQyxNQUFBQSxtQkFBbUIsRUFBRSxDQUxEO0FBTXBCQyxNQUFBQSxRQUFRLEVBQUVSO0FBTlUsS0FBZCxDQUFWO0FBU0FDLElBQUFBLENBQUMsQ0FBQ1EsWUFBRixDQUFlQyxRQUFRLENBQUNDLGNBQVQsQ0FBd0JaLFFBQXhCLENBQWY7QUFDQUUsSUFBQUEsQ0FBQyxDQUFDMUIsRUFBRixDQUFLLGFBQUwsRUFBb0IsVUFBQ3FDLElBQUQsRUFBT2pDLFFBQVAsRUFBb0I7QUFDcENSLE1BQUFBLFFBQVEsQ0FBQyxhQUFELEVBQWdCO0FBQUN5QyxRQUFBQSxJQUFJLEVBQUpBLElBQUQ7QUFBT2pDLFFBQUFBLFFBQVEsRUFBUkE7QUFBUCxPQUFoQixDQUFSO0FBQ0gsS0FGRDtBQUdBc0IsSUFBQUEsQ0FBQyxDQUFDMUIsRUFBRixDQUFLLGNBQUwsRUFBcUIsVUFBQ3FDLElBQUQsRUFBVTtBQUMzQnpDLE1BQUFBLFFBQVEsQ0FBQyxjQUFELEVBQWlCO0FBQUN5QyxRQUFBQSxJQUFJLEVBQUpBO0FBQUQsT0FBakIsQ0FBUjtBQUNILEtBRkQ7QUFHQVgsSUFBQUEsQ0FBQyxDQUFDMUIsRUFBRixDQUFLLFdBQUwsRUFBa0IsVUFBQ3FDLElBQUQsRUFBT0MsS0FBUCxFQUFpQjtBQUMvQlosTUFBQUEsQ0FBQyxDQUFDYSxNQUFGO0FBQ0EzQyxNQUFBQSxRQUFRLENBQUMsV0FBRCxFQUFjO0FBQUN5QyxRQUFBQSxJQUFJLEVBQUpBLElBQUQ7QUFBT0MsUUFBQUEsS0FBSyxFQUFMQTtBQUFQLE9BQWQsQ0FBUjtBQUNILEtBSEQ7QUFJQVosSUFBQUEsQ0FBQyxDQUFDMUIsRUFBRixDQUFLLFdBQUwsRUFBa0IsVUFBQ3FDLElBQUQsRUFBVTtBQUN4QnpDLE1BQUFBLFFBQVEsQ0FBQyxXQUFELEVBQWM7QUFBQ3lDLFFBQUFBLElBQUksRUFBSkE7QUFBRCxPQUFkLENBQVI7QUFDSCxLQUZEO0FBR0FYLElBQUFBLENBQUMsQ0FBQzFCLEVBQUYsQ0FBSyxXQUFMLEVBQWtCLFVBQUNxQyxJQUFELEVBQU9HLE9BQVAsRUFBbUI7QUFDakM1QyxNQUFBQSxRQUFRLENBQUMsV0FBRCxFQUFjO0FBQUN5QyxRQUFBQSxJQUFJLEVBQUpBLElBQUQ7QUFBT0csUUFBQUEsT0FBTyxFQUFQQTtBQUFQLE9BQWQsQ0FBUjtBQUNILEtBRkQ7QUFHQWQsSUFBQUEsQ0FBQyxDQUFDMUIsRUFBRixDQUFLLGFBQUwsRUFBb0IsWUFBTTtBQUN0QkosTUFBQUEsUUFBUSxDQUFDLGFBQUQsQ0FBUjtBQUNILEtBRkQ7QUFHQThCLElBQUFBLENBQUMsQ0FBQzFCLEVBQUYsQ0FBSyxVQUFMLEVBQWlCLFlBQU07QUFDbkJKLE1BQUFBLFFBQVEsQ0FBQyxVQUFELENBQVI7QUFDSCxLQUZEO0FBR0E4QixJQUFBQSxDQUFDLENBQUMxQixFQUFGLENBQUssVUFBTCxFQUFpQixZQUFNO0FBQ25CLFVBQU15QyxPQUFPLEdBQUcsTUFBTWYsQ0FBQyxDQUFDZ0IsUUFBRixFQUF0QjtBQUNBOUMsTUFBQUEsUUFBUSxDQUFDLFVBQUQsRUFBYTtBQUFDNkMsUUFBQUEsT0FBTyxFQUFQQTtBQUFELE9BQWIsQ0FBUjtBQUNILEtBSEQ7QUFJQWYsSUFBQUEsQ0FBQyxDQUFDMUIsRUFBRixDQUFLLE9BQUwsRUFBYyxVQUFDd0MsT0FBRCxFQUFVSCxJQUFWLEVBQW1CO0FBQzdCekMsTUFBQUEsUUFBUSxDQUFDLE9BQUQsRUFBVTtBQUFDNEMsUUFBQUEsT0FBTyxFQUFQQSxPQUFEO0FBQVVILFFBQUFBLElBQUksRUFBSkE7QUFBVixPQUFWLENBQVI7QUFDSCxLQUZEO0FBR0FYLElBQUFBLENBQUMsQ0FBQzFCLEVBQUYsQ0FBSyxPQUFMLEVBQWMsWUFBTTtBQUNoQkosTUFBQUEsUUFBUSxDQUFDLE9BQUQsQ0FBUjtBQUNILEtBRkQ7QUFHQThCLElBQUFBLENBQUMsQ0FBQzFCLEVBQUYsQ0FBSyxRQUFMLEVBQWUsWUFBTTtBQUNqQkosTUFBQUEsUUFBUSxDQUFDLFFBQUQsQ0FBUjtBQUNILEtBRkQ7QUFHQThCLElBQUFBLENBQUMsQ0FBQzFCLEVBQUYsQ0FBSyxlQUFMLEVBQXNCLFVBQUNxQyxJQUFELEVBQVU7QUFDNUJ6QyxNQUFBQSxRQUFRLENBQUMsZUFBRCxFQUFrQjtBQUFDeUMsUUFBQUEsSUFBSSxFQUFKQTtBQUFELE9BQWxCLENBQVI7QUFDSCxLQUZEO0FBR0FYLElBQUFBLENBQUMsQ0FBQzFCLEVBQUYsQ0FBSyxrQkFBTCxFQUF5QixVQUFDcUMsSUFBRCxFQUFPTSxLQUFQLEVBQWlCO0FBQ3RDL0MsTUFBQUEsUUFBUSxDQUFDLGtCQUFELEVBQXFCO0FBQUN5QyxRQUFBQSxJQUFJLEVBQUpBLElBQUQ7QUFBT00sUUFBQUEsS0FBSyxFQUFMQTtBQUFQLE9BQXJCLENBQVI7QUFDSCxLQUZEO0FBR0FqQixJQUFBQSxDQUFDLENBQUMxQixFQUFGLENBQUssa0JBQUwsRUFBeUIsVUFBQ3FDLElBQUQsRUFBVTtBQUMvQnpDLE1BQUFBLFFBQVEsQ0FBQyxrQkFBRCxFQUFxQjtBQUFDeUMsUUFBQUEsSUFBSSxFQUFKQTtBQUFELE9BQXJCLENBQVI7QUFDSCxLQUZEO0FBSUEsV0FBT1gsQ0FBUDtBQUNIO0FBclpjLENBQW5CLEMsQ0F3WkE7O0FBQ0FULE1BQU0sQ0FBQ3ZDLFVBQVAsR0FBb0JBLFVBQXBCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIENvbmZpZywgUGJ4QXBpLCBSZXN1bWFibGUgKi9cblxuLyoqXG4gKiBNb2R1bGVzQVBJIC0gQVBJIGNsaWVudCBmb3IgbW9kdWxlIG1hbmFnZW1lbnQgb3BlcmF0aW9uc1xuICpcbiAqIFByb3ZpZGVzIG1ldGhvZHMgZm9yIGluc3RhbGxpbmcsIHVuaW5zdGFsbGluZywgZW5hYmxpbmcsIGRpc2FibGluZyBtb2R1bGVzLFxuICogY2hlY2tpbmcgbW9kdWxlIHN0YXR1cywgYW5kIG1hbmFnaW5nIG1vZHVsZSB1cGRhdGVzLlxuICpcbiAqIEBjbGFzcyBNb2R1bGVzQVBJXG4gKi9cbmNvbnN0IE1vZHVsZXNBUEkgPSB7XG5cbiAgICAvKipcbiAgICAgKiBNb2R1bGUgbWFuYWdlbWVudCBlbmRwb2ludHNcbiAgICAgKi9cbiAgICBlbmRwb2ludHM6IHtcbiAgICAgICAgbW9kdWxlU3RhcnREb3dubG9hZDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy9jb3JlL21vZHVsZVN0YXJ0RG93bmxvYWRgLFxuICAgICAgICBtb2R1bGVEb3dubG9hZFN0YXR1czogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy9jb3JlL21vZHVsZURvd25sb2FkU3RhdHVzYCxcbiAgICAgICAgaW5zdGFsbEZyb21QYWNrYWdlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL2NvcmUvaW5zdGFsbEZyb21QYWNrYWdlYCxcbiAgICAgICAgaW5zdGFsbEZyb21SZXBvOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL2NvcmUvaW5zdGFsbEZyb21SZXBvYCxcbiAgICAgICAgc3RhdHVzT2ZNb2R1bGVJbnN0YWxsYXRpb246IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvY29yZS9zdGF0dXNPZk1vZHVsZUluc3RhbGxhdGlvbmAsXG4gICAgICAgIGVuYWJsZU1vZHVsZTogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy9jb3JlL2VuYWJsZU1vZHVsZWAsXG4gICAgICAgIGRpc2FibGVNb2R1bGU6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvY29yZS9kaXNhYmxlTW9kdWxlYCxcbiAgICAgICAgdW5pbnN0YWxsTW9kdWxlOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL2NvcmUvdW5pbnN0YWxsTW9kdWxlYCxcbiAgICAgICAgZ2V0QXZhaWxhYmxlTW9kdWxlczogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy9jb3JlL2dldEF2YWlsYWJsZU1vZHVsZXNgLFxuICAgICAgICBnZXRNb2R1bGVMaW5rOiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS9tb2R1bGVzL2NvcmUvZ2V0TW9kdWxlTGlua2AsXG4gICAgICAgIHVwZGF0ZUFsbDogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy9jb3JlL3VwZGF0ZUFsbGAsXG4gICAgICAgIGdldE1ldGFkYXRhRnJvbU1vZHVsZVBhY2thZ2U6IGAke0NvbmZpZy5wYnhVcmx9L3BieGNvcmUvYXBpL21vZHVsZXMvY29yZS9nZXRNZXRhZGF0YUZyb21Nb2R1bGVQYWNrYWdlYCxcbiAgICAgICAgZ2V0TW9kdWxlSW5mbzogYCR7Q29uZmlnLnBieFVybH0vcGJ4Y29yZS9hcGkvbW9kdWxlcy9jb3JlL2dldE1vZHVsZUluZm9gXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyBhdmFpbGFibGUgbW9kdWxlcyBmcm9tIE1JS08gcmVwb3NpdG9yeVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBnZXRBdmFpbGFibGUoY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB0aGlzLmVuZHBvaW50cy5nZXRBdmFpbGFibGVNb2R1bGVzLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluc3RhbGxzIGEgbmV3IG1vZHVsZSBmcm9tIGEgcmVwb3NpdG9yeVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwYXJhbXMgLSBJbnN0YWxsYXRpb24gcGFyYW1ldGVyc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMudW5pcWlkIC0gTW9kdWxlIHVuaXF1ZSBJRFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMucmVsZWFzZUlkIC0gUmVsZWFzZSBJRCB0byBpbnN0YWxsXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGluc3RhbGxGcm9tUmVwbyhwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdGhpcy5lbmRwb2ludHMuaW5zdGFsbEZyb21SZXBvLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiBwYXJhbXMsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluc3RhbGxzIGEgbmV3IG1vZHVsZSBmcm9tIGFuIHVwbG9hZGVkIHppcCBhcmNoaXZlXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHBhcmFtcyAtIEluc3RhbGxhdGlvbiBwYXJhbWV0ZXJzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy5maWxlUGF0aCAtIFBhdGggdG8gdXBsb2FkZWQgemlwIGZpbGVcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgaW5zdGFsbEZyb21QYWNrYWdlKHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB0aGlzLmVuZHBvaW50cy5pbnN0YWxsRnJvbVBhY2thZ2UsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHBhcmFtcyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIHRoZSBzdGF0dXMgb2YgYSBtb2R1bGUgaW5zdGFsbGF0aW9uXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVQYXRoIC0gUGF0aCB0byB0aGUgbW9kdWxlIHBhY2thZ2VcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZ2V0TW9kdWxlSW5zdGFsbGF0aW9uU3RhdHVzKGZpbGVQYXRoLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHRoaXMuZW5kcG9pbnRzLnN0YXR1c09mTW9kdWxlSW5zdGFsbGF0aW9uLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7IGZpbGVQYXRoIH0sXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlICE9PSB1bmRlZmluZWQgJiYgcmVzcG9uc2UuZGF0YSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlLmRhdGEpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKGVycm9yTWVzc2FnZSwgZWxlbWVudCwgeGhyKSB7XG4gICAgICAgICAgICAgICAgaWYgKHhoci5zdGF0dXMgPT09IDQwMSkge1xuICAgICAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXNlc3Npb24vaW5kZXhgO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEVuYWJsZXMgYW4gZXh0ZW5zaW9uIG1vZHVsZVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwYXJhbXMgLSBFbmFibGUgcGFyYW1ldGVyc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMudW5pcWlkIC0gTW9kdWxlIHVuaXF1ZSBJRFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IFtjYWxsYmFja10gLSBPcHRpb25hbCBjYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGVuYWJsZU1vZHVsZShwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdGhpcy5lbmRwb2ludHMuZW5hYmxlTW9kdWxlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiBwYXJhbXMsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2spIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIERpc2FibGVzIGFuIGV4dGVuc2lvbiBtb2R1bGVcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zIC0gRGlzYWJsZSBwYXJhbWV0ZXJzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy51bmlxaWQgLSBNb2R1bGUgdW5pcXVlIElEXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gW2NhbGxiYWNrXSAtIE9wdGlvbmFsIGNhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgZGlzYWJsZU1vZHVsZShwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdGhpcy5lbmRwb2ludHMuZGlzYWJsZU1vZHVsZSxcbiAgICAgICAgICAgIG9uOiAnbm93JyxcbiAgICAgICAgICAgIG1ldGhvZDogJ1BPU1QnLFxuICAgICAgICAgICAgZGF0YTogcGFyYW1zLFxuICAgICAgICAgICAgc3VjY2Vzc1Rlc3Q6IFBieEFwaS5zdWNjZXNzVGVzdCxcbiAgICAgICAgICAgIG9uU3VjY2VzcyhyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGlmIChjYWxsYmFjaykgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgaWYgKGNhbGxiYWNrKSBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBVbmluc3RhbGxzIGFuIGV4dGVuc2lvbiBtb2R1bGVcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zIC0gVW5pbnN0YWxsIHBhcmFtZXRlcnNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLnVuaXFpZCAtIE1vZHVsZSB1bmlxdWUgSURcbiAgICAgKiBAcGFyYW0ge2Jvb2xlYW59IFtwYXJhbXMua2VlcFNldHRpbmdzPWZhbHNlXSAtIEtlZXAgbW9kdWxlIHNldHRpbmdzXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIHVuaW5zdGFsbE1vZHVsZShwYXJhbXMsIGNhbGxiYWNrKSB7XG4gICAgICAgICQuYXBpKHtcbiAgICAgICAgICAgIHVybDogdGhpcy5lbmRwb2ludHMudW5pbnN0YWxsTW9kdWxlLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiBwYXJhbXMsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRmFpbHVyZShyZXNwb25zZSkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKCkge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKGZhbHNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyBtb2R1bGUgaW5mb3JtYXRpb24gZnJvbSB0aGUgcmVwb3NpdG9yeVxuICAgICAqIEBwYXJhbSB7b2JqZWN0fSBwYXJhbXMgLSBNb2R1bGUgaW5mbyBwYXJhbWV0ZXJzXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IHBhcmFtcy51bmlxaWQgLSBNb2R1bGUgdW5pcXVlIElEXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqL1xuICAgIGdldE1vZHVsZUluZm8ocGFyYW1zLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHRoaXMuZW5kcG9pbnRzLmdldE1vZHVsZUluZm8sXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHBhcmFtcyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogVXBkYXRlcyBhbGwgaW5zdGFsbGVkIG1vZHVsZXNcbiAgICAgKiBAcGFyYW0ge29iamVjdH0gcGFyYW1zIC0gVXBkYXRlIHBhcmFtZXRlcnNcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIENhbGxiYWNrIGZ1bmN0aW9uXG4gICAgICovXG4gICAgdXBkYXRlQWxsKHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB0aGlzLmVuZHBvaW50cy51cGRhdGVBbGwsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHBhcmFtcyxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU3RhcnRzIG1vZHVsZSBkb3dubG9hZCBpbiBiYWNrZ3JvdW5kXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHBhcmFtcyAtIERvd25sb2FkIHBhcmFtZXRlcnNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLnVuaXFpZCAtIE1vZHVsZSB1bmlxdWUgSURcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gcGFyYW1zLm1kNSAtIE1ENSBjaGVja3N1bVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMuc2l6ZSAtIEZpbGUgc2l6ZVxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMudXBkYXRlTGluayAtIERvd25sb2FkIFVSTFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBtb2R1bGVTdGFydERvd25sb2FkKHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB0aGlzLmVuZHBvaW50cy5tb2R1bGVTdGFydERvd25sb2FkLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiBwYXJhbXMsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBHZXRzIG1vZHVsZSBkb3dubG9hZCBzdGF0dXNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gbW9kdWxlVW5pcXVlSUQgLSBNb2R1bGUgdW5pcXVlIElEXG4gICAgICogQHBhcmFtIHtmdW5jdGlvbn0gY2FsbGJhY2sgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgICAqIEBwYXJhbSB7Ym9vbGVhbn0gW2ZhaWx1cmVDYWxsYmFja10gLSBXaGV0aGVyIHRvIGNhbGwgY2FsbGJhY2sgb24gZmFpbHVyZVxuICAgICAqL1xuICAgIG1vZHVsZURvd25sb2FkU3RhdHVzKG1vZHVsZVVuaXF1ZUlELCBjYWxsYmFjaywgZmFpbHVyZUNhbGxiYWNrID0gdHJ1ZSkge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHRoaXMuZW5kcG9pbnRzLm1vZHVsZURvd25sb2FkU3RhdHVzLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiB7IHVuaXFpZDogbW9kdWxlVW5pcXVlSUQgfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhyZXNwb25zZS5kYXRhKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkZhaWx1cmUoKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZhaWx1cmVDYWxsYmFjaykgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoKSB7XG4gICAgICAgICAgICAgICAgaWYgKGZhaWx1cmVDYWxsYmFjaykgY2FsbGJhY2soZmFsc2UpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmV0cmlldmVzIG1vZHVsZSBtZXRhZGF0YSBmcm9tIGFuIHVwbG9hZGVkIHppcCBhcmNoaXZlXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGZpbGVQYXRoIC0gUGF0aCB0byB6aXAgZmlsZVxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBnZXRNZXRhZGF0YUZyb21Nb2R1bGVQYWNrYWdlKGZpbGVQYXRoLCBjYWxsYmFjaykge1xuICAgICAgICAkLmFwaSh7XG4gICAgICAgICAgICB1cmw6IHRoaXMuZW5kcG9pbnRzLmdldE1ldGFkYXRhRnJvbU1vZHVsZVBhY2thZ2UsXG4gICAgICAgICAgICBvbjogJ25vdycsXG4gICAgICAgICAgICBtZXRob2Q6ICdQT1NUJyxcbiAgICAgICAgICAgIGRhdGE6IHsgZmlsZVBhdGggfSxcbiAgICAgICAgICAgIHN1Y2Nlc3NUZXN0OiBQYnhBcGkuc3VjY2Vzc1Rlc3QsXG4gICAgICAgICAgICBvblN1Y2Nlc3MocmVzcG9uc2UpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayh0cnVlLCByZXNwb25zZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcihlcnJvck1lc3NhZ2UsIGVsZW1lbnQsIHhocikge1xuICAgICAgICAgICAgICAgIGlmICh4aHIuc3RhdHVzID09PSA0MDEpIHtcbiAgICAgICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1zZXNzaW9uL2luZGV4YDtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UsIGVycm9yTWVzc2FnZSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25GYWlsdXJlKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZmFsc2UsIHJlc3BvbnNlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJldHJpZXZlcyB0aGUgaW5zdGFsbGF0aW9uIGxpbmsgZm9yIGEgbW9kdWxlXG4gICAgICogQHBhcmFtIHtvYmplY3R9IHBhcmFtcyAtIExpbmsgcGFyYW1ldGVyc1xuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBwYXJhbXMudW5pcWlkIC0gTW9kdWxlIHVuaXF1ZSBJRFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICAgKi9cbiAgICBnZXRNb2R1bGVMaW5rKHBhcmFtcywgY2FsbGJhY2spIHtcbiAgICAgICAgJC5hcGkoe1xuICAgICAgICAgICAgdXJsOiB0aGlzLmVuZHBvaW50cy5nZXRNb2R1bGVMaW5rLFxuICAgICAgICAgICAgb246ICdub3cnLFxuICAgICAgICAgICAgbWV0aG9kOiAnUE9TVCcsXG4gICAgICAgICAgICBkYXRhOiBwYXJhbXMsXG4gICAgICAgICAgICBzdWNjZXNzVGVzdDogUGJ4QXBpLnN1Y2Nlc3NUZXN0LFxuICAgICAgICAgICAgb25TdWNjZXNzKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2socmVzcG9uc2UuZGF0YSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvcigpIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayhmYWxzZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBIZWxwZXIgbWV0aG9kIHRvIGF0dGFjaCBmaWxlIHVwbG9hZCB0byBidXR0b24gd2l0aCBSZXN1bWFibGUuanNcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYnV0dG9uSWQgLSBCdXR0b24gZWxlbWVudCBJRFxuICAgICAqIEBwYXJhbSB7c3RyaW5nW119IGZpbGVUeXBlcyAtIEFsbG93ZWQgZmlsZSB0eXBlc1xuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IGNhbGxiYWNrIC0gQ2FsbGJhY2sgZnVuY3Rpb24gZm9yIHVwbG9hZCBldmVudHNcbiAgICAgKi9cbiAgICB1cGxvYWRGaWxlQXR0YWNoVG9CdG4oYnV0dG9uSWQsIGZpbGVUeXBlcywgY2FsbGJhY2spIHtcbiAgICAgICAgY29uc3QgciA9IG5ldyBSZXN1bWFibGUoe1xuICAgICAgICAgICAgdGFyZ2V0OiBgJHtDb25maWcucGJ4VXJsfS9wYnhjb3JlL2FwaS92My9maWxlczp1cGxvYWRgLFxuICAgICAgICAgICAgdGVzdENodW5rczogZmFsc2UsXG4gICAgICAgICAgICBjaHVua1NpemU6IDMgKiAxMDI0ICogMTAyNCxcbiAgICAgICAgICAgIG1heEZpbGVzOiAxLFxuICAgICAgICAgICAgc2ltdWx0YW5lb3VzVXBsb2FkczogMSxcbiAgICAgICAgICAgIGZpbGVUeXBlOiBmaWxlVHlwZXMsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIHIuYXNzaWduQnJvd3NlKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGJ1dHRvbklkKSk7XG4gICAgICAgIHIub24oJ2ZpbGVTdWNjZXNzJywgKGZpbGUsIHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnZmlsZVN1Y2Nlc3MnLCB7ZmlsZSwgcmVzcG9uc2V9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2ZpbGVQcm9ncmVzcycsIChmaWxlKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnZmlsZVByb2dyZXNzJywge2ZpbGV9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2ZpbGVBZGRlZCcsIChmaWxlLCBldmVudCkgPT4ge1xuICAgICAgICAgICAgci51cGxvYWQoKTtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdmaWxlQWRkZWQnLCB7ZmlsZSwgZXZlbnR9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2ZpbGVSZXRyeScsIChmaWxlKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnZmlsZVJldHJ5Jywge2ZpbGV9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2ZpbGVFcnJvcicsIChmaWxlLCBtZXNzYWdlKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnZmlsZUVycm9yJywge2ZpbGUsIG1lc3NhZ2V9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ3VwbG9hZFN0YXJ0JywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ3VwbG9hZFN0YXJ0Jyk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdjb21wbGV0ZScsICgpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdjb21wbGV0ZScpO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbigncHJvZ3Jlc3MnLCAoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBwZXJjZW50ID0gMTAwICogci5wcm9ncmVzcygpO1xuICAgICAgICAgICAgY2FsbGJhY2soJ3Byb2dyZXNzJywge3BlcmNlbnR9KTtcbiAgICAgICAgfSk7XG4gICAgICAgIHIub24oJ2Vycm9yJywgKG1lc3NhZ2UsIGZpbGUpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdlcnJvcicsIHttZXNzYWdlLCBmaWxlfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdwYXVzZScsICgpID0+IHtcbiAgICAgICAgICAgIGNhbGxiYWNrKCdwYXVzZScpO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignY2FuY2VsJywgKCkgPT4ge1xuICAgICAgICAgICAgY2FsbGJhY2soJ2NhbmNlbCcpO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignY2h1bmtpbmdTdGFydCcsIChmaWxlKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnY2h1bmtpbmdTdGFydCcsIHtmaWxlfSk7XG4gICAgICAgIH0pO1xuICAgICAgICByLm9uKCdjaHVua2luZ1Byb2dyZXNzJywgKGZpbGUsIHJhdGlvKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnY2h1bmtpbmdQcm9ncmVzcycsIHtmaWxlLCByYXRpb30pO1xuICAgICAgICB9KTtcbiAgICAgICAgci5vbignY2h1bmtpbmdDb21wbGV0ZScsIChmaWxlKSA9PiB7XG4gICAgICAgICAgICBjYWxsYmFjaygnY2h1bmtpbmdDb21wbGV0ZScsIHtmaWxlfSk7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIHJldHVybiByO1xuICAgIH1cbn07XG5cbi8vIEV4cG9ydCBmb3IgdXNlIGluIG90aGVyIG1vZHVsZXNcbndpbmRvdy5Nb2R1bGVzQVBJID0gTW9kdWxlc0FQSTsiXX0=