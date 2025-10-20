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

/**
 * ACL Helper - Client-side Access Control List helper
 *
 * Provides convenient API for checking user permissions in JavaScript code.
 * Works with CurrentPageACL object that is initialized by PHP on page load.
 *
 * @module ACLHelper
 */
var ACLHelper = {
  /**
   * Check if ACL data is initialized
   * @returns {boolean} true if ACL data is available
   */
  isInitialized: function isInitialized() {
    return window.CurrentPageACL && window.CurrentPageACL.initialized === true && window.CurrentPageACL.permissions;
  },

  /**
   * Get all permissions for current page
   * @returns {object|null} Permissions object or null if not initialized
   */
  getPermissions: function getPermissions() {
    if (!this.isInitialized()) {
      console.warn('ACLHelper: CurrentPageACL is not initialized');
      return null;
    }

    return window.CurrentPageACL.permissions;
  },

  /**
   * Get current controller information
   * @returns {object|null} Controller info or null if not initialized
   */
  getControllerInfo: function getControllerInfo() {
    if (!this.isInitialized()) {
      return null;
    }

    return {
      controller: window.CurrentPageACL.controller,
      controllerName: window.CurrentPageACL.controllerName,
      actionName: window.CurrentPageACL.actionName
    };
  },

  /**
   * Check if user has permission for specific action
   *
   * @param {string} action - Action name (save, delete, modify, etc.)
   * @returns {boolean} true if user has permission, false otherwise
   *
   * @example
   * if (ACLHelper.isAllowed('save')) {
   *     $('#save-button').show();
   * }
   */
  isAllowed: function isAllowed(action) {
    if (!this.isInitialized()) {
      // If ACL not initialized, allow by default (localhost bypass)
      console.warn("ACLHelper: ACL not initialized, allowing '".concat(action, "' by default"));
      return true;
    }

    var permissions = this.getPermissions();
    return permissions[action] === true;
  },

  /**
   * Shorthand: Check if user can save
   * @returns {boolean}
   */
  canSave: function canSave() {
    return this.isAllowed('save');
  },

  /**
   * Shorthand: Check if user can delete
   * @returns {boolean}
   */
  canDelete: function canDelete() {
    return this.isAllowed('delete');
  },

  /**
   * Shorthand: Check if user can modify
   * @returns {boolean}
   */
  canModify: function canModify() {
    return this.isAllowed('modify');
  },

  /**
   * Shorthand: Check if user can edit
   * @returns {boolean}
   */
  canEdit: function canEdit() {
    return this.isAllowed('edit');
  },

  /**
   * Shorthand: Check if user can copy
   * @returns {boolean}
   */
  canCopy: function canCopy() {
    return this.isAllowed('copy');
  },

  /**
   * Shorthand: Check if user can download
   * @returns {boolean}
   */
  canDownload: function canDownload() {
    return this.isAllowed('download');
  },

  /**
   * Shorthand: Check if user can restore
   * @returns {boolean}
   */
  canRestore: function canRestore() {
    return this.isAllowed('restore');
  },

  /**
   * Show or hide element based on permission
   *
   * @param {string|jQuery} selector - jQuery selector or jQuery object
   * @param {string} action - Action name to check
   * @returns {boolean} true if element is shown, false if hidden
   *
   * @example
   * ACLHelper.toggleByPermission('#save-button', 'save');
   * ACLHelper.toggleByPermission($('#delete-button'), 'delete');
   */
  toggleByPermission: function toggleByPermission(selector, action) {
    var $element = typeof selector === 'string' ? $(selector) : selector;

    if ($element.length === 0) {
      console.warn("ACLHelper: Element not found: ".concat(selector));
      return false;
    }

    if (this.isAllowed(action)) {
      $element.show();
      return true;
    } else {
      $element.hide();
      return false;
    }
  },

  /**
   * Enable or disable element based on permission
   *
   * @param {string|jQuery} selector - jQuery selector or jQuery object
   * @param {string} action - Action name to check
   * @returns {boolean} true if element is enabled, false if disabled
   *
   * @example
   * ACLHelper.toggleEnableByPermission('#save-button', 'save');
   */
  toggleEnableByPermission: function toggleEnableByPermission(selector, action) {
    var $element = typeof selector === 'string' ? $(selector) : selector;

    if ($element.length === 0) {
      console.warn("ACLHelper: Element not found: ".concat(selector));
      return false;
    }

    if (this.isAllowed(action)) {
      $element.removeClass('disabled');
      $element.prop('disabled', false);
      return true;
    } else {
      $element.addClass('disabled');
      $element.prop('disabled', true);
      return false;
    }
  },

  /**
   * Add or remove CSS class based on permission
   *
   * @param {string|jQuery} selector - jQuery selector or jQuery object
   * @param {string} action - Action name to check
   * @param {string} classToAdd - CSS class to add if allowed
   * @param {string} classToRemove - CSS class to remove if not allowed (optional)
   * @returns {boolean} true if class was added, false otherwise
   *
   * @example
   * ACLHelper.toggleClassByPermission('#my-button', 'save', 'active', 'inactive');
   */
  toggleClassByPermission: function toggleClassByPermission(selector, action, classToAdd) {
    var classToRemove = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;
    var $element = typeof selector === 'string' ? $(selector) : selector;

    if ($element.length === 0) {
      console.warn("ACLHelper: Element not found: ".concat(selector));
      return false;
    }

    if (this.isAllowed(action)) {
      $element.addClass(classToAdd);

      if (classToRemove) {
        $element.removeClass(classToRemove);
      }

      return true;
    } else {
      $element.removeClass(classToAdd);

      if (classToRemove) {
        $element.addClass(classToRemove);
      }

      return false;
    }
  },

  /**
   * Execute callback only if user has permission
   *
   * @param {string} action - Action name to check
   * @param {function} callback - Function to execute if allowed
   * @param {function} [deniedCallback] - Optional function to execute if not allowed
   * @returns {boolean} true if callback was executed, false otherwise
   *
   * @example
   * ACLHelper.ifAllowed('save', () => {
   *     console.log('User can save');
   *     initializeSaveButton();
   * }, () => {
   *     console.log('User cannot save');
   * });
   */
  ifAllowed: function ifAllowed(action, callback) {
    var deniedCallback = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

    if (this.isAllowed(action)) {
      if (typeof callback === 'function') {
        callback();
      }

      return true;
    } else {
      if (typeof deniedCallback === 'function') {
        deniedCallback();
      }

      return false;
    }
  },

  /**
   * Apply multiple permission-based actions
   *
   * @param {object} config - Configuration object mapping actions to selectors
   *
   * @example
   * ACLHelper.applyPermissions({
   *     save: {
   *         show: '#save-button',
   *         enable: '#submit-form'
   *     },
   *     delete: {
   *         show: '#delete-button'
   *     }
   * });
   */
  applyPermissions: function applyPermissions(config) {
    var _this = this;

    Object.keys(config).forEach(function (action) {
      var rules = config[action];

      if (rules.show) {
        _this.toggleByPermission(rules.show, action);
      }

      if (rules.hide) {
        var $element = $(rules.hide);

        if (_this.isAllowed(action)) {
          $element.hide();
        } else {
          $element.show();
        }
      }

      if (rules.enable) {
        _this.toggleEnableByPermission(rules.enable, action);
      }

      if (rules.disable) {
        var _$element = $(rules.disable);

        if (_this.isAllowed(action)) {
          _$element.addClass('disabled').prop('disabled', true);
        } else {
          _$element.removeClass('disabled').prop('disabled', false);
        }
      }
    });
  },

  /**
   * Debug helper: Log current ACL state to console
   */
  debug: function debug() {
    if (!this.isInitialized()) {
      console.warn('ACLHelper: Not initialized');
      return;
    }

    console.group('ACL Helper Debug Info');
    console.log('Controller:', window.CurrentPageACL.controller);
    console.log('Controller Name:', window.CurrentPageACL.controllerName);
    console.log('Action Name:', window.CurrentPageACL.actionName);
    console.log('Permissions:', window.CurrentPageACL.permissions);
    console.groupEnd();
  }
};
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9tYWluL2FjbC1oZWxwZXIuanMiXSwibmFtZXMiOlsiQUNMSGVscGVyIiwiaXNJbml0aWFsaXplZCIsIndpbmRvdyIsIkN1cnJlbnRQYWdlQUNMIiwiaW5pdGlhbGl6ZWQiLCJwZXJtaXNzaW9ucyIsImdldFBlcm1pc3Npb25zIiwiY29uc29sZSIsIndhcm4iLCJnZXRDb250cm9sbGVySW5mbyIsImNvbnRyb2xsZXIiLCJjb250cm9sbGVyTmFtZSIsImFjdGlvbk5hbWUiLCJpc0FsbG93ZWQiLCJhY3Rpb24iLCJjYW5TYXZlIiwiY2FuRGVsZXRlIiwiY2FuTW9kaWZ5IiwiY2FuRWRpdCIsImNhbkNvcHkiLCJjYW5Eb3dubG9hZCIsImNhblJlc3RvcmUiLCJ0b2dnbGVCeVBlcm1pc3Npb24iLCJzZWxlY3RvciIsIiRlbGVtZW50IiwiJCIsImxlbmd0aCIsInNob3ciLCJoaWRlIiwidG9nZ2xlRW5hYmxlQnlQZXJtaXNzaW9uIiwicmVtb3ZlQ2xhc3MiLCJwcm9wIiwiYWRkQ2xhc3MiLCJ0b2dnbGVDbGFzc0J5UGVybWlzc2lvbiIsImNsYXNzVG9BZGQiLCJjbGFzc1RvUmVtb3ZlIiwiaWZBbGxvd2VkIiwiY2FsbGJhY2siLCJkZW5pZWRDYWxsYmFjayIsImFwcGx5UGVybWlzc2lvbnMiLCJjb25maWciLCJPYmplY3QiLCJrZXlzIiwiZm9yRWFjaCIsInJ1bGVzIiwiZW5hYmxlIiwiZGlzYWJsZSIsImRlYnVnIiwiZ3JvdXAiLCJsb2ciLCJncm91cEVuZCJdLCJtYXBwaW5ncyI6Ijs7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxJQUFNQSxTQUFTLEdBQUc7QUFFZDtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxhQU5jLDJCQU1FO0FBQ1osV0FBT0Ms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QUFlQyxNQUFmLENBQUosRUFBNEI7QUFDeEJVLFVBQUFBLFNBQVEsQ0FBQ1EsUUFBVCxDQUFrQixVQUFsQixFQUE4QkQsSUFBOUIsQ0FBbUMsVUFBbkMsRUFBK0MsSUFBL0M7QUFDSCxTQUZELE1BRU87QUFDSFAsVUFBQUEsU0FBUSxDQUFDTSxXQUFULENBQXFCLFVBQXJCLEVBQWlDQyxJQUFqQyxDQUFzQyxVQUF0QyxFQUFrRCxLQUFsRDtBQUNIO0FBQ0o7QUFDSixLQTVCRDtBQTZCSCxHQTdSYTs7QUErUmQ7QUFDSjtBQUNBO0FBQ0lnQixFQUFBQSxLQWxTYyxtQkFrU047QUFDSixRQUFJLENBQUMsS0FBSzlDLGFBQUwsRUFBTCxFQUEyQjtBQUN2Qk0sTUFBQUEsT0FBTyxDQUFDQyxJQUFSLENBQWEsNEJBQWI7QUFDQTtBQUNIOztBQUVERCxJQUFBQSxPQUFPLENBQUN5QyxLQUFSLENBQWMsdUJBQWQ7QUFDQXpDLElBQUFBLE9BQU8sQ0FBQzBDLEdBQVIsQ0FBWSxhQUFaLEVBQTJCL0MsTUFBTSxDQUFDQyxjQUFQLENBQXNCTyxVQUFqRDtBQUNBSCxJQUFBQSxPQUFPLENBQUMwQyxHQUFSLENBQVksa0JBQVosRUFBZ0MvQyxNQUFNLENBQUNDLGNBQVAsQ0FBc0JRLGNBQXREO0FBQ0FKLElBQUFBLE9BQU8sQ0FBQzBDLEdBQVIsQ0FBWSxjQUFaLEVBQTRCL0MsTUFBTSxDQUFDQyxjQUFQLENBQXNCUyxVQUFsRDtBQUNBTCxJQUFBQSxPQUFPLENBQUMwQyxHQUFSLENBQVksY0FBWixFQUE0Qi9DLE1BQU0sQ0FBQ0MsY0FBUCxDQUFzQkUsV0FBbEQ7QUFDQUUsSUFBQUEsT0FBTyxDQUFDMkMsUUFBUjtBQUNIO0FBOVNhLENBQWxCIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjUgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyoqXG4gKiBBQ0wgSGVscGVyIC0gQ2xpZW50LXNpZGUgQWNjZXNzIENvbnRyb2wgTGlzdCBoZWxwZXJcbiAqXG4gKiBQcm92aWRlcyBjb252ZW5pZW50IEFQSSBmb3IgY2hlY2tpbmcgdXNlciBwZXJtaXNzaW9ucyBpbiBKYXZhU2NyaXB0IGNvZGUuXG4gKiBXb3JrcyB3aXRoIEN1cnJlbnRQYWdlQUNMIG9iamVjdCB0aGF0IGlzIGluaXRpYWxpemVkIGJ5IFBIUCBvbiBwYWdlIGxvYWQuXG4gKlxuICogQG1vZHVsZSBBQ0xIZWxwZXJcbiAqL1xuY29uc3QgQUNMSGVscGVyID0ge1xuXG4gICAgLyoqXG4gICAgICogQ2hlY2sgaWYgQUNMIGRhdGEgaXMgaW5pdGlhbGl6ZWRcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gdHJ1ZSBpZiBBQ0wgZGF0YSBpcyBhdmFpbGFibGVcbiAgICAgKi9cbiAgICBpc0luaXRpYWxpemVkKCkge1xuICAgICAgICByZXR1cm4gd2luZG93LkN1cnJlbnRQYWdlQUNMXG4gICAgICAgICAgICAmJiB3aW5kb3cuQ3VycmVudFBhZ2VBQ0wuaW5pdGlhbGl6ZWQgPT09IHRydWVcbiAgICAgICAgICAgICYmIHdpbmRvdy5DdXJyZW50UGFnZUFDTC5wZXJtaXNzaW9ucztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGFsbCBwZXJtaXNzaW9ucyBmb3IgY3VycmVudCBwYWdlXG4gICAgICogQHJldHVybnMge29iamVjdHxudWxsfSBQZXJtaXNzaW9ucyBvYmplY3Qgb3IgbnVsbCBpZiBub3QgaW5pdGlhbGl6ZWRcbiAgICAgKi9cbiAgICBnZXRQZXJtaXNzaW9ucygpIHtcbiAgICAgICAgaWYgKCF0aGlzLmlzSW5pdGlhbGl6ZWQoKSkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKCdBQ0xIZWxwZXI6IEN1cnJlbnRQYWdlQUNMIGlzIG5vdCBpbml0aWFsaXplZCcpO1xuICAgICAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHdpbmRvdy5DdXJyZW50UGFnZUFDTC5wZXJtaXNzaW9ucztcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogR2V0IGN1cnJlbnQgY29udHJvbGxlciBpbmZvcm1hdGlvblxuICAgICAqIEByZXR1cm5zIHtvYmplY3R8bnVsbH0gQ29udHJvbGxlciBpbmZvIG9yIG51bGwgaWYgbm90IGluaXRpYWxpemVkXG4gICAgICovXG4gICAgZ2V0Q29udHJvbGxlckluZm8oKSB7XG4gICAgICAgIGlmICghdGhpcy5pc0luaXRpYWxpemVkKCkpIHtcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBjb250cm9sbGVyOiB3aW5kb3cuQ3VycmVudFBhZ2VBQ0wuY29udHJvbGxlcixcbiAgICAgICAgICAgIGNvbnRyb2xsZXJOYW1lOiB3aW5kb3cuQ3VycmVudFBhZ2VBQ0wuY29udHJvbGxlck5hbWUsXG4gICAgICAgICAgICBhY3Rpb25OYW1lOiB3aW5kb3cuQ3VycmVudFBhZ2VBQ0wuYWN0aW9uTmFtZVxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBDaGVjayBpZiB1c2VyIGhhcyBwZXJtaXNzaW9uIGZvciBzcGVjaWZpYyBhY3Rpb25cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhY3Rpb24gLSBBY3Rpb24gbmFtZSAoc2F2ZSwgZGVsZXRlLCBtb2RpZnksIGV0Yy4pXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IHRydWUgaWYgdXNlciBoYXMgcGVybWlzc2lvbiwgZmFsc2Ugb3RoZXJ3aXNlXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIGlmIChBQ0xIZWxwZXIuaXNBbGxvd2VkKCdzYXZlJykpIHtcbiAgICAgKiAgICAgJCgnI3NhdmUtYnV0dG9uJykuc2hvdygpO1xuICAgICAqIH1cbiAgICAgKi9cbiAgICBpc0FsbG93ZWQoYWN0aW9uKSB7XG4gICAgICAgIGlmICghdGhpcy5pc0luaXRpYWxpemVkKCkpIHtcbiAgICAgICAgICAgIC8vIElmIEFDTCBub3QgaW5pdGlhbGl6ZWQsIGFsbG93IGJ5IGRlZmF1bHQgKGxvY2FsaG9zdCBieXBhc3MpXG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYEFDTEhlbHBlcjogQUNMIG5vdCBpbml0aWFsaXplZCwgYWxsb3dpbmcgJyR7YWN0aW9ufScgYnkgZGVmYXVsdGApO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBwZXJtaXNzaW9ucyA9IHRoaXMuZ2V0UGVybWlzc2lvbnMoKTtcbiAgICAgICAgcmV0dXJuIHBlcm1pc3Npb25zW2FjdGlvbl0gPT09IHRydWU7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3J0aGFuZDogQ2hlY2sgaWYgdXNlciBjYW4gc2F2ZVxuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGNhblNhdmUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmlzQWxsb3dlZCgnc2F2ZScpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG9ydGhhbmQ6IENoZWNrIGlmIHVzZXIgY2FuIGRlbGV0ZVxuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGNhbkRlbGV0ZSgpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaXNBbGxvd2VkKCdkZWxldGUnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvcnRoYW5kOiBDaGVjayBpZiB1c2VyIGNhbiBtb2RpZnlcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBjYW5Nb2RpZnkoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmlzQWxsb3dlZCgnbW9kaWZ5Jyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3J0aGFuZDogQ2hlY2sgaWYgdXNlciBjYW4gZWRpdFxuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGNhbkVkaXQoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmlzQWxsb3dlZCgnZWRpdCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG9ydGhhbmQ6IENoZWNrIGlmIHVzZXIgY2FuIGNvcHlcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAgICAgKi9cbiAgICBjYW5Db3B5KCkge1xuICAgICAgICByZXR1cm4gdGhpcy5pc0FsbG93ZWQoJ2NvcHknKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvcnRoYW5kOiBDaGVjayBpZiB1c2VyIGNhbiBkb3dubG9hZFxuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGNhbkRvd25sb2FkKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5pc0FsbG93ZWQoJ2Rvd25sb2FkJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNob3J0aGFuZDogQ2hlY2sgaWYgdXNlciBjYW4gcmVzdG9yZVxuICAgICAqIEByZXR1cm5zIHtib29sZWFufVxuICAgICAqL1xuICAgIGNhblJlc3RvcmUoKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmlzQWxsb3dlZCgncmVzdG9yZScpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93IG9yIGhpZGUgZWxlbWVudCBiYXNlZCBvbiBwZXJtaXNzaW9uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ3xqUXVlcnl9IHNlbGVjdG9yIC0galF1ZXJ5IHNlbGVjdG9yIG9yIGpRdWVyeSBvYmplY3RcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYWN0aW9uIC0gQWN0aW9uIG5hbWUgdG8gY2hlY2tcbiAgICAgKiBAcmV0dXJucyB7Ym9vbGVhbn0gdHJ1ZSBpZiBlbGVtZW50IGlzIHNob3duLCBmYWxzZSBpZiBoaWRkZW5cbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogQUNMSGVscGVyLnRvZ2dsZUJ5UGVybWlzc2lvbignI3NhdmUtYnV0dG9uJywgJ3NhdmUnKTtcbiAgICAgKiBBQ0xIZWxwZXIudG9nZ2xlQnlQZXJtaXNzaW9uKCQoJyNkZWxldGUtYnV0dG9uJyksICdkZWxldGUnKTtcbiAgICAgKi9cbiAgICB0b2dnbGVCeVBlcm1pc3Npb24oc2VsZWN0b3IsIGFjdGlvbikge1xuICAgICAgICBjb25zdCAkZWxlbWVudCA9IHR5cGVvZiBzZWxlY3RvciA9PT0gJ3N0cmluZycgPyAkKHNlbGVjdG9yKSA6IHNlbGVjdG9yO1xuXG4gICAgICAgIGlmICgkZWxlbWVudC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgQUNMSGVscGVyOiBFbGVtZW50IG5vdCBmb3VuZDogJHtzZWxlY3Rvcn1gKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLmlzQWxsb3dlZChhY3Rpb24pKSB7XG4gICAgICAgICAgICAkZWxlbWVudC5zaG93KCk7XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICRlbGVtZW50LmhpZGUoKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBFbmFibGUgb3IgZGlzYWJsZSBlbGVtZW50IGJhc2VkIG9uIHBlcm1pc3Npb25cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7c3RyaW5nfGpRdWVyeX0gc2VsZWN0b3IgLSBqUXVlcnkgc2VsZWN0b3Igb3IgalF1ZXJ5IG9iamVjdFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBhY3Rpb24gLSBBY3Rpb24gbmFtZSB0byBjaGVja1xuICAgICAqIEByZXR1cm5zIHtib29sZWFufSB0cnVlIGlmIGVsZW1lbnQgaXMgZW5hYmxlZCwgZmFsc2UgaWYgZGlzYWJsZWRcbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogQUNMSGVscGVyLnRvZ2dsZUVuYWJsZUJ5UGVybWlzc2lvbignI3NhdmUtYnV0dG9uJywgJ3NhdmUnKTtcbiAgICAgKi9cbiAgICB0b2dnbGVFbmFibGVCeVBlcm1pc3Npb24oc2VsZWN0b3IsIGFjdGlvbikge1xuICAgICAgICBjb25zdCAkZWxlbWVudCA9IHR5cGVvZiBzZWxlY3RvciA9PT0gJ3N0cmluZycgPyAkKHNlbGVjdG9yKSA6IHNlbGVjdG9yO1xuXG4gICAgICAgIGlmICgkZWxlbWVudC5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgQUNMSGVscGVyOiBFbGVtZW50IG5vdCBmb3VuZDogJHtzZWxlY3Rvcn1gKTtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLmlzQWxsb3dlZChhY3Rpb24pKSB7XG4gICAgICAgICAgICAkZWxlbWVudC5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICRlbGVtZW50LnByb3AoJ2Rpc2FibGVkJywgZmFsc2UpO1xuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAkZWxlbWVudC5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICRlbGVtZW50LnByb3AoJ2Rpc2FibGVkJywgdHJ1ZSk7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogQWRkIG9yIHJlbW92ZSBDU1MgY2xhc3MgYmFzZWQgb24gcGVybWlzc2lvblxuICAgICAqXG4gICAgICogQHBhcmFtIHtzdHJpbmd8alF1ZXJ5fSBzZWxlY3RvciAtIGpRdWVyeSBzZWxlY3RvciBvciBqUXVlcnkgb2JqZWN0XG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGFjdGlvbiAtIEFjdGlvbiBuYW1lIHRvIGNoZWNrXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGNsYXNzVG9BZGQgLSBDU1MgY2xhc3MgdG8gYWRkIGlmIGFsbG93ZWRcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gY2xhc3NUb1JlbW92ZSAtIENTUyBjbGFzcyB0byByZW1vdmUgaWYgbm90IGFsbG93ZWQgKG9wdGlvbmFsKVxuICAgICAqIEByZXR1cm5zIHtib29sZWFufSB0cnVlIGlmIGNsYXNzIHdhcyBhZGRlZCwgZmFsc2Ugb3RoZXJ3aXNlXG4gICAgICpcbiAgICAgKiBAZXhhbXBsZVxuICAgICAqIEFDTEhlbHBlci50b2dnbGVDbGFzc0J5UGVybWlzc2lvbignI215LWJ1dHRvbicsICdzYXZlJywgJ2FjdGl2ZScsICdpbmFjdGl2ZScpO1xuICAgICAqL1xuICAgIHRvZ2dsZUNsYXNzQnlQZXJtaXNzaW9uKHNlbGVjdG9yLCBhY3Rpb24sIGNsYXNzVG9BZGQsIGNsYXNzVG9SZW1vdmUgPSBudWxsKSB7XG4gICAgICAgIGNvbnN0ICRlbGVtZW50ID0gdHlwZW9mIHNlbGVjdG9yID09PSAnc3RyaW5nJyA/ICQoc2VsZWN0b3IpIDogc2VsZWN0b3I7XG5cbiAgICAgICAgaWYgKCRlbGVtZW50Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBBQ0xIZWxwZXI6IEVsZW1lbnQgbm90IGZvdW5kOiAke3NlbGVjdG9yfWApO1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHRoaXMuaXNBbGxvd2VkKGFjdGlvbikpIHtcbiAgICAgICAgICAgICRlbGVtZW50LmFkZENsYXNzKGNsYXNzVG9BZGQpO1xuICAgICAgICAgICAgaWYgKGNsYXNzVG9SZW1vdmUpIHtcbiAgICAgICAgICAgICAgICAkZWxlbWVudC5yZW1vdmVDbGFzcyhjbGFzc1RvUmVtb3ZlKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgJGVsZW1lbnQucmVtb3ZlQ2xhc3MoY2xhc3NUb0FkZCk7XG4gICAgICAgICAgICBpZiAoY2xhc3NUb1JlbW92ZSkge1xuICAgICAgICAgICAgICAgICRlbGVtZW50LmFkZENsYXNzKGNsYXNzVG9SZW1vdmUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEV4ZWN1dGUgY2FsbGJhY2sgb25seSBpZiB1c2VyIGhhcyBwZXJtaXNzaW9uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge3N0cmluZ30gYWN0aW9uIC0gQWN0aW9uIG5hbWUgdG8gY2hlY2tcbiAgICAgKiBAcGFyYW0ge2Z1bmN0aW9ufSBjYWxsYmFjayAtIEZ1bmN0aW9uIHRvIGV4ZWN1dGUgaWYgYWxsb3dlZFxuICAgICAqIEBwYXJhbSB7ZnVuY3Rpb259IFtkZW5pZWRDYWxsYmFja10gLSBPcHRpb25hbCBmdW5jdGlvbiB0byBleGVjdXRlIGlmIG5vdCBhbGxvd2VkXG4gICAgICogQHJldHVybnMge2Jvb2xlYW59IHRydWUgaWYgY2FsbGJhY2sgd2FzIGV4ZWN1dGVkLCBmYWxzZSBvdGhlcndpc2VcbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogQUNMSGVscGVyLmlmQWxsb3dlZCgnc2F2ZScsICgpID0+IHtcbiAgICAgKiAgICAgY29uc29sZS5sb2coJ1VzZXIgY2FuIHNhdmUnKTtcbiAgICAgKiAgICAgaW5pdGlhbGl6ZVNhdmVCdXR0b24oKTtcbiAgICAgKiB9LCAoKSA9PiB7XG4gICAgICogICAgIGNvbnNvbGUubG9nKCdVc2VyIGNhbm5vdCBzYXZlJyk7XG4gICAgICogfSk7XG4gICAgICovXG4gICAgaWZBbGxvd2VkKGFjdGlvbiwgY2FsbGJhY2ssIGRlbmllZENhbGxiYWNrID0gbnVsbCkge1xuICAgICAgICBpZiAodGhpcy5pc0FsbG93ZWQoYWN0aW9uKSkge1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBjYWxsYmFjayA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgZGVuaWVkQ2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICAgICAgICBkZW5pZWRDYWxsYmFjaygpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEFwcGx5IG11bHRpcGxlIHBlcm1pc3Npb24tYmFzZWQgYWN0aW9uc1xuICAgICAqXG4gICAgICogQHBhcmFtIHtvYmplY3R9IGNvbmZpZyAtIENvbmZpZ3VyYXRpb24gb2JqZWN0IG1hcHBpbmcgYWN0aW9ucyB0byBzZWxlY3RvcnNcbiAgICAgKlxuICAgICAqIEBleGFtcGxlXG4gICAgICogQUNMSGVscGVyLmFwcGx5UGVybWlzc2lvbnMoe1xuICAgICAqICAgICBzYXZlOiB7XG4gICAgICogICAgICAgICBzaG93OiAnI3NhdmUtYnV0dG9uJyxcbiAgICAgKiAgICAgICAgIGVuYWJsZTogJyNzdWJtaXQtZm9ybSdcbiAgICAgKiAgICAgfSxcbiAgICAgKiAgICAgZGVsZXRlOiB7XG4gICAgICogICAgICAgICBzaG93OiAnI2RlbGV0ZS1idXR0b24nXG4gICAgICogICAgIH1cbiAgICAgKiB9KTtcbiAgICAgKi9cbiAgICBhcHBseVBlcm1pc3Npb25zKGNvbmZpZykge1xuICAgICAgICBPYmplY3Qua2V5cyhjb25maWcpLmZvckVhY2goYWN0aW9uID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJ1bGVzID0gY29uZmlnW2FjdGlvbl07XG5cbiAgICAgICAgICAgIGlmIChydWxlcy5zaG93KSB7XG4gICAgICAgICAgICAgICAgdGhpcy50b2dnbGVCeVBlcm1pc3Npb24ocnVsZXMuc2hvdywgYWN0aW9uKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKHJ1bGVzLmhpZGUpIHtcbiAgICAgICAgICAgICAgICBjb25zdCAkZWxlbWVudCA9ICQocnVsZXMuaGlkZSk7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNBbGxvd2VkKGFjdGlvbikpIHtcbiAgICAgICAgICAgICAgICAgICAgJGVsZW1lbnQuaGlkZSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICRlbGVtZW50LnNob3coKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChydWxlcy5lbmFibGUpIHtcbiAgICAgICAgICAgICAgICB0aGlzLnRvZ2dsZUVuYWJsZUJ5UGVybWlzc2lvbihydWxlcy5lbmFibGUsIGFjdGlvbik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChydWxlcy5kaXNhYmxlKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgJGVsZW1lbnQgPSAkKHJ1bGVzLmRpc2FibGUpO1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzQWxsb3dlZChhY3Rpb24pKSB7XG4gICAgICAgICAgICAgICAgICAgICRlbGVtZW50LmFkZENsYXNzKCdkaXNhYmxlZCcpLnByb3AoJ2Rpc2FibGVkJywgdHJ1ZSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgJGVsZW1lbnQucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJykucHJvcCgnZGlzYWJsZWQnLCBmYWxzZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRGVidWcgaGVscGVyOiBMb2cgY3VycmVudCBBQ0wgc3RhdGUgdG8gY29uc29sZVxuICAgICAqL1xuICAgIGRlYnVnKCkge1xuICAgICAgICBpZiAoIXRoaXMuaXNJbml0aWFsaXplZCgpKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ0FDTEhlbHBlcjogTm90IGluaXRpYWxpemVkJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBjb25zb2xlLmdyb3VwKCdBQ0wgSGVscGVyIERlYnVnIEluZm8nKTtcbiAgICAgICAgY29uc29sZS5sb2coJ0NvbnRyb2xsZXI6Jywgd2luZG93LkN1cnJlbnRQYWdlQUNMLmNvbnRyb2xsZXIpO1xuICAgICAgICBjb25zb2xlLmxvZygnQ29udHJvbGxlciBOYW1lOicsIHdpbmRvdy5DdXJyZW50UGFnZUFDTC5jb250cm9sbGVyTmFtZSk7XG4gICAgICAgIGNvbnNvbGUubG9nKCdBY3Rpb24gTmFtZTonLCB3aW5kb3cuQ3VycmVudFBhZ2VBQ0wuYWN0aW9uTmFtZSk7XG4gICAgICAgIGNvbnNvbGUubG9nKCdQZXJtaXNzaW9uczonLCB3aW5kb3cuQ3VycmVudFBhZ2VBQ0wucGVybWlzc2lvbnMpO1xuICAgICAgICBjb25zb2xlLmdyb3VwRW5kKCk7XG4gICAgfVxufTtcbiJdfQ==