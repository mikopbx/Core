"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && iter[Symbol.iterator] != null || iter["@@iterator"] != null) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2024 Alexey Portnov and Nikolay Beketov
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

/* global globalRootUrl, PbxApi, globalPBXLicense, globalTranslate, UserMessage, globalPBXVersion, installStatusLoopWorker, marketplace, ModulesAPI */

/**
 * Manages the installation and updating of PBX extension modules from a repository.
 * It provides functionality to update individual modules or all modules at once,
 * and displays progress information to the user.
 *
 * @class installationFromRepo
 * @memberof module:PbxExtensionModules
 */
var installationFromRepo = {
  /**
   * The current version of the PBX system, with development version identifiers removed.
   * @type {string}
   */
  pbxVersion: globalPBXVersion.replace(/-dev/i, ''),

  /**
   * jQuery object for the button responsible for updating all installed modules.
   * @type {jQuery}
   */
  $btnUpdateAllModules: $('#update-all-modules-button'),

  /**
   * jQuery object for the block that contains the progress bar, used to indicate
   * the progress of module installation or updating processes.
   * @type {jQuery}
   */
  $progressBarBlock: $('#upload-progress-bar-block'),

  /**
   * jQuery object for the installation module modal form.
   * @type {jQuery}
   */
  $installModuleModalForm: $('#install-modal-form'),

  /**
   * jQuery object for the update changelog confirmation modal.
   * @type {jQuery}
   */
  $updateChangelogModal: $('#update-changelog-modal'),

  /**
   * Monotonically increasing token bumped each time the changelog modal is opened.
   * In-flight `getModuleInfo` callbacks compare against this token and bail out if
   * a newer modal opening has superseded their request — prevents stale repository
   * responses from overwriting the body of a newly-shown modal.
   * @type {number}
   */
  changelogGen: 0,

  /**
   * Initializes the installationFromRepo module. Sets up event handlers for UI interactions
   * and hides UI elements that are not immediately needed.
   */
  initialize: function initialize() {
    installationFromRepo.initializeButtonEvents();
    installationFromRepo.$progressBarBlock.hide();
    installationFromRepo.$btnUpdateAllModules.hide(); // Until at least one update available
  },

  /**
   * Sets up event handlers for button clicks within the module.
   * Update buttons go through a changelog confirmation modal; install/downgrade buttons
   * go through the original simple confirmation modal.
   */
  initializeButtonEvents: function initializeButtonEvents() {
    // New install / explicit version download (per-release in detail popup) -> simple modal
    $(document).on('click', 'a.download', function (e) {
      e.preventDefault();
      var $currentButton = $(e.target).closest('a.button');

      if (globalPBXLicense.trim() === '') {
        window.location = "".concat(globalRootUrl, "pbx-extension-modules/index#/licensing");
      } else {
        installationFromRepo.openInstallModuleModal($currentButton);
      }
    }); // Single-module update -> changelog confirmation modal (current -> latest)

    $(document).on('click', 'a.update', function (e) {
      e.preventDefault();
      var $currentButton = $(e.target).closest('a.button');

      if (globalPBXLicense.trim() === '') {
        window.location = "".concat(globalRootUrl, "pbx-extension-modules/index#/licensing");
      } else {
        installationFromRepo.openUpdateChangelogModal($currentButton);
      }
    });
    installationFromRepo.$btnUpdateAllModules.on('click', installationFromRepo.updateAllModules);
  },

  /**
   * Opens the modal form for installing a module. This modal provides the user with information
   * about the module they are about to install, and confirms their action.
   *
   * @param {jQuery} $currentButton - The jQuery object of the button that was clicked to trigger this modal.
   */
  openInstallModuleModal: function openInstallModuleModal($currentButton) {
    var moduleUniqueId = $currentButton.data('uniqid');
    var releaseId = $currentButton.data('releaseid');
    installationFromRepo.$installModuleModalForm.modal({
      closable: false,
      onShow: function onShow() {
        var moduleName = $currentButton.closest('tr').data('name');
        var theForm = installationFromRepo.$installModuleModalForm;
        theForm.find('span.module-name').text(moduleName);
        var $installedModuleRow = $("tr.module-row[data-id=".concat(moduleUniqueId, "]"));

        if ($installedModuleRow.length > 0) {
          var _$currentButton$data;

          var installedVersion = $installedModuleRow.data('version');
          var newVersion = (_$currentButton$data = $currentButton.data('version')) !== null && _$currentButton$data !== void 0 ? _$currentButton$data : installedVersion;

          if (marketplace.versionCompare(newVersion, installedVersion) > 0) {
            theForm.find('span.action').text(globalTranslate.ext_UpdateModuleTitle);
            theForm.find('div.description').html(globalTranslate.ext_ModuleUpdateDescription);
          } else {
            theForm.find('span.action').text(globalTranslate.ext_DowngradeModuleTitle);
            theForm.find('div.description').html(globalTranslate.ext_ModuleDowngradeDescription);
          }
        } else {
          theForm.find('span.action').text(globalTranslate.ext_InstallModuleTitle);
          theForm.find('div.description').html(globalTranslate.ext_ModuleInstallDescription);
        }
      },
      onDeny: function onDeny() {
        $('a.button').removeClass('disabled');
        return true;
      },
      onApprove: function onApprove() {
        installationFromRepo.runSingleInstall(moduleUniqueId, releaseId);
        return true;
      }
    }).modal('show');
  },

  /**
   * Opens the changelog confirmation modal for a single-module update. Fetches release
   * info from the repository, renders aggregated changelog from the installed version
   * up to the latest release, and lets the user confirm or cancel.
   *
   * @param {jQuery} $currentButton - The clicked Update button.
   */
  openUpdateChangelogModal: function openUpdateChangelogModal($currentButton) {
    var moduleUniqueId = $currentButton.data('uniqid');
    var releaseId = $currentButton.data('releaseid');
    var $modal = installationFromRepo.$updateChangelogModal;
    var $installedRow = $("tr.module-row[data-id=".concat(moduleUniqueId, "]"));
    var installedVersion = $installedRow.length > 0 ? String($installedRow.data('version') || '') : '';
    var moduleName = $currentButton.closest('tr').data('name') || $installedRow.find('td.show-details-on-click').first().clone().children().remove().end().text().trim() || moduleUniqueId;
    installationFromRepo.resetChangelogModal($modal);
    $modal.find('span.action').text(globalTranslate.ext_UpdateModuleTitle);
    $modal.find('span.module-name').text(moduleName);
    installationFromRepo.changelogGen += 1;
    var myGen = installationFromRepo.changelogGen;
    $modal.modal({
      closable: false,
      onDeny: function onDeny() {
        $('a.button').removeClass('disabled');
        return true;
      },
      onApprove: function onApprove() {
        if ($modal.find('.approve.button').hasClass('disabled')) {
          return false;
        }

        installationFromRepo.runSingleInstall(moduleUniqueId, releaseId);
        return true;
      }
    }).modal('show');
    ModulesAPI.getModuleInfo({
      uniqid: moduleUniqueId
    }, function (repoData, success) {
      if (myGen !== installationFromRepo.changelogGen) {
        return; // a newer modal opening superseded this request
      }

      if (!success || !repoData || !Array.isArray(repoData.releases)) {
        installationFromRepo.showChangelogError($modal);
        return;
      }

      var newerReleases = installationFromRepo.filterNewerReleases(repoData.releases, installedVersion);
      var latestVersion = newerReleases.length > 0 ? newerReleases[0].version : repoData.releases[0] && repoData.releases[0].version || '';
      var intro = installationFromRepo.formatString(globalTranslate.ext_UpdateChangelogIntro, {
        name: moduleName,
        from: installedVersion,
        to: latestVersion
      });
      installationFromRepo.renderChangelogModal($modal, intro, [{
        name: moduleName,
        releases: newerReleases.length > 0 ? newerReleases : repoData.releases.slice(0, 1)
      }]);
    });
  },

  /**
   * Runs the actual single-module install/update API call. Extracted so both modals
   * (simple install and changelog confirm) can share the post-confirm logic.
   */
  runSingleInstall: function runSingleInstall(moduleUniqueId, releaseId) {
    $('a.button').addClass('disabled');
    var params = {
      uniqid: moduleUniqueId,
      releaseId: releaseId,
      channelId: installStatusLoopWorker.channelId
    };
    $("#modal-".concat(params.uniqid)).modal('hide');
    var $moduleButtons = $("a[data-uniqid=".concat(params.uniqid));
    $moduleButtons.removeClass('disabled');
    $moduleButtons.find('i').removeClass('download').removeClass('redo').addClass('spinner loading');
    $('tr.table-error-messages').remove();
    $('tr.error').removeClass('error');
    ModulesAPI.installFromRepo(params, function (response) {
      console.debug(response);

      if (response.result === true) {
        $('html, body').animate({
          scrollTop: installationFromRepo.$progressBarBlock.offset().top - 50
        }, 2000);
      }
    });
  },

  /**
   * Initiates the process of updating all installed modules. Triggered by the user
   * clicking the 'Update All' button.
   *
   * @param {Event} e - The click event object associated with the 'Update All' button click.
   */
  updateAllModules: function updateAllModules(e) {
    e.preventDefault();
    var $currentButton = $(e.target).closest('a');
    installationFromRepo.openUpdateAllModulesModal($currentButton);
  },

  /**
   * Opens the changelog confirmation modal for the bulk update. Fetches release info
   * for every module that has an available update and renders an aggregated changelog
   * (one section per module) before asking the user to confirm.
   *
   * @param {jQuery} $currentButton - The 'Update All' button.
   */
  openUpdateAllModulesModal: function openUpdateAllModulesModal($currentButton) {
    var $modal = installationFromRepo.$updateChangelogModal;
    var uniqueModulesForUpdate = new Set();
    $('a.update').each(function (_, button) {
      uniqueModulesForUpdate.add($(button).data('uniqid'));
    });

    var modulesForUpdate = _toConsumableArray(uniqueModulesForUpdate);

    if (modulesForUpdate.length === 0) {
      return;
    }

    installationFromRepo.resetChangelogModal($modal);
    $modal.find('span.action').text(globalTranslate.ext_UpdateAllModulesTitle);
    $modal.find('span.module-name').text('');
    installationFromRepo.changelogGen += 1;
    var myGen = installationFromRepo.changelogGen;
    $modal.modal({
      closable: false,
      onDeny: function onDeny() {
        $('a.button').removeClass('disabled');
        return true;
      },
      onApprove: function onApprove() {
        if ($modal.find('.approve.button').hasClass('disabled')) {
          return false;
        }

        var selected = installationFromRepo.collectSelectedModules($modal);

        if (selected.length === 0) {
          return false;
        }

        installationFromRepo.runUpdateAll($currentButton, selected);
        return true;
      }
    }).modal('show');
    var fetched = [];
    var pending = modulesForUpdate.length;
    var anySuccess = false;
    modulesForUpdate.forEach(function (uniqid) {
      var $installedRow = $("tr.module-row[data-id=".concat(uniqid, "]"));
      var installedVersion = $installedRow.length > 0 ? String($installedRow.data('version') || '') : '';
      var $btn = $("a.update[data-uniqid=".concat(uniqid, "]")).first();
      var moduleName = $btn.closest('tr').data('name') || $installedRow.find('td.show-details-on-click').first().clone().children().remove().end().text().trim() || uniqid;
      ModulesAPI.getModuleInfo({
        uniqid: uniqid
      }, function (repoData, success) {
        if (myGen !== installationFromRepo.changelogGen) {
          return; // a newer modal opening superseded this batch
        }

        pending -= 1;

        if (success && repoData && Array.isArray(repoData.releases)) {
          anySuccess = true;
          var newerReleases = installationFromRepo.filterNewerReleases(repoData.releases, installedVersion);
          fetched.push({
            uniqid: uniqid,
            name: moduleName,
            installedVersion: installedVersion,
            releases: newerReleases.length > 0 ? newerReleases : repoData.releases.slice(0, 1)
          });
        } else {
          fetched.push({
            uniqid: uniqid,
            name: moduleName,
            installedVersion: installedVersion,
            releases: [],
            error: true
          });
        }

        if (pending === 0) {
          if (!anySuccess) {
            installationFromRepo.showChangelogError($modal);
            return;
          }

          fetched.sort(function (a, b) {
            return a.name.localeCompare(b.name);
          });
          installationFromRepo.renderMultiSelectModal($modal, globalTranslate.ext_UpdateAllModulesChangelogIntro, fetched);
        }
      });
    });
  },

  /**
   * Reads checked checkboxes inside the modal and returns the list of selected uniqids.
   * Falls back to all known uniqids when no checkboxes are rendered (single-module case).
   */
  collectSelectedModules: function collectSelectedModules($modal) {
    var $boxes = $modal.find('.update-module-checkbox input[type="checkbox"]:checked');

    if ($boxes.length === 0) {
      return [];
    }

    var result = [];
    $boxes.each(function (_, el) {
      var uniqid = $(el).closest('.update-module-checkbox').data('uniqid');

      if (uniqid) {
        result.push(uniqid);
      }
    });
    return result;
  },

  /**
   * Runs the actual bulk update API call after user confirmed in the changelog modal.
   */
  runUpdateAll: function runUpdateAll($currentButton, modulesForUpdate) {
    $('a.button').addClass('disabled');
    $currentButton.removeClass('disabled');
    $currentButton.find('i.icon').removeClass('redo').addClass('spinner loading');
    installStatusLoopWorker.startBatchUpdate(modulesForUpdate);
    var params = {
      channelId: installStatusLoopWorker.channelId,
      modulesForUpdate: modulesForUpdate
    };
    ModulesAPI.updateAll(params, function (response, success) {
      console.debug(response);

      if (success === false || response.result === false) {
        installStatusLoopWorker.resetBatchUpdate();
        installationFromRepo.$progressBarBlock.hide();
        $('a.button').removeClass('disabled');
        $currentButton.find('i.icon').removeClass('spinner loading').addClass('redo');
      }
    });
    $('tr.table-error-messages').remove();
    $('tr.error').removeClass('error');
  },

  /**
   * Resets the changelog modal to its loading state before a new fetch.
   */
  resetChangelogModal: function resetChangelogModal($modal) {
    $modal.find('.changelog-loader').show();
    $modal.find('.changelog-intro').hide().empty();
    $modal.find('.changelog-body').hide().empty();
    $modal.find('.changelog-error').hide();
    $modal.find('.approve.button').addClass('disabled');
  },

  /**
   * Shows the error message inside the changelog modal and disables Confirm.
   */
  showChangelogError: function showChangelogError($modal) {
    $modal.find('.changelog-loader').hide();
    $modal.find('.changelog-error').show();
    $modal.find('.approve.button').addClass('disabled');
  },

  /**
   * Renders the changelog modal content for a single-module update.
   *
   * @param {jQuery} $modal
   * @param {string} introText
   * @param {Array<{name:string, releases:Array, error?:boolean}>} entries
   */
  renderChangelogModal: function renderChangelogModal($modal, introText, entries) {
    $modal.find('.changelog-loader').hide();

    if (introText) {
      $modal.find('.changelog-intro').html(introText).show();
    }

    var html = '';
    entries.forEach(function (entry) {
      html += installationFromRepo.renderEntryReleases(entry);
    });
    $modal.find('.changelog-body').html(html).show();
    $modal.find('.approve.button').removeClass('disabled');
    $modal.modal('refresh');
  },

  /**
   * Renders the multi-module update modal as a checkbox list with collapsible
   * changelog accordion per module. The user can deselect modules they do not
   * want to update; Confirm is disabled while no module is checked.
   *
   * @param {jQuery} $modal
   * @param {string} introText
   * @param {Array<{uniqid:string, name:string, installedVersion:string, releases:Array, error?:boolean}>} entries
   */
  renderMultiSelectModal: function renderMultiSelectModal($modal, introText, entries) {
    $modal.find('.changelog-loader').hide();

    if (introText) {
      $modal.find('.changelog-intro').html(introText).show();
    }

    var html = '<div class="ui styled fluid accordion update-modules-accordion">';
    entries.forEach(function (entry) {
      var newest = entry.releases && entry.releases[0] && entry.releases[0].version ? entry.releases[0].version : '';
      var versionInfo = '';

      if (entry.installedVersion && newest) {
        versionInfo = " <span class=\"ui small grey text\">".concat(installationFromRepo.escapeHtml(entry.installedVersion), " \u2192 ").concat(installationFromRepo.escapeHtml(newest), "</span>");
      } else if (newest) {
        versionInfo = " <span class=\"ui small grey text\">".concat(installationFromRepo.escapeHtml(newest), "</span>");
      }

      html += '<div class="title">';
      html += '<i class="dropdown icon"></i>';
      html += "<div class=\"ui checkbox update-module-checkbox\" data-uniqid=\"".concat(installationFromRepo.escapeHtml(entry.uniqid), "\">");
      html += '<input type="checkbox" checked />';
      html += "<label><b>".concat(installationFromRepo.escapeHtml(entry.name), "</b>").concat(versionInfo, "</label>");
      html += '</div>';
      html += '</div>';
      html += '<div class="content">';
      html += installationFromRepo.renderEntryReleases(entry);
      html += '</div>';
    });
    html += '</div>';
    var $body = $modal.find('.changelog-body');
    $body.html(html).show();
    var $accordion = $body.find('.update-modules-accordion');
    $accordion.accordion({
      exclusive: false
    }); // Stop checkbox clicks from toggling the accordion title.

    $accordion.find('.update-module-checkbox').on('click', function (e) {
      e.stopPropagation();
    });
    $accordion.find('.ui.checkbox.update-module-checkbox').checkbox();
    var $approve = $modal.find('.approve.button');

    var refreshApproveState = function refreshApproveState() {
      var anyChecked = $accordion.find('.update-module-checkbox input[type="checkbox"]:checked').length > 0;

      if (anyChecked) {
        $approve.removeClass('disabled');
      } else {
        $approve.addClass('disabled');
      }
    };

    $accordion.find('.update-module-checkbox input[type="checkbox"]').on('change', refreshApproveState);
    refreshApproveState();
    $modal.modal('refresh');
  },

  /**
   * Builds the per-release changelog HTML for one module entry.
   * Used by both single- and multi-module renderers.
   */
  renderEntryReleases: function renderEntryReleases(entry) {
    if (entry.error) {
      return "<div class=\"ui warning message\">".concat(globalTranslate.ext_FailedToLoadChangelog, "</div>");
    }

    if (!entry.releases || entry.releases.length === 0) {
      return "<div class=\"ui basic segment\"><i>".concat(globalTranslate.ext_NoChangelogAvailable, "</i></div>");
    }

    var html = '';
    entry.releases.forEach(function (release) {
      var releaseDate = release.created ? String(release.created).split(' ')[0] : '';
      var changeLogText = installationFromRepo.formatChangelogText(release.changelog);
      html += '<div class="ui clearing segment">';
      html += "<div class=\"ui top attached label\">".concat(globalTranslate.ext_InstallModuleReleaseTag, ": ").concat(installationFromRepo.escapeHtml(release.version));

      if (releaseDate) {
        html += " ".concat(globalTranslate.ext_FromDate, " ").concat(installationFromRepo.escapeHtml(releaseDate));
      }

      html += '</div>';
      html += "<div class=\"ui basic segment\"><p>".concat(changeLogText, "</p></div>");
      html += '</div>';
    });
    return html;
  },

  /**
   * Safely formats a repository-provided changelog value for HTML insertion.
   * Treats null/undefined/empty values as missing (renders an italic placeholder),
   * HTML-escapes the raw text, and converts newlines to `<br>` so plain-text
   * changelogs keep their line breaks without allowing arbitrary markup.
   */
  formatChangelogText: function formatChangelogText(raw) {
    if (raw === null || raw === undefined) {
      return "<i>".concat(globalTranslate.ext_NoChangelogAvailable, "</i>");
    }

    var text = String(raw);

    if (text === '' || text === 'null' || text === 'undefined') {
      return "<i>".concat(globalTranslate.ext_NoChangelogAvailable, "</i>");
    }

    var escaped = installationFromRepo.escapeHtml(text);

    if (escaped.trim() === '') {
      return "<i>".concat(globalTranslate.ext_NoChangelogAvailable, "</i>");
    }

    return escaped.replace(/\n/g, '<br>');
  },

  /**
   * Filters the releases array to include only versions newer than the installed one.
   * Returns them sorted descending (newest first).
   */
  filterNewerReleases: function filterNewerReleases(releases, installedVersion) {
    if (!installedVersion) {
      return releases.slice();
    }

    var newer = releases.filter(function (release) {
      if (!release || !release.version) {
        return false;
      }

      return marketplace.versionCompare(String(release.version), String(installedVersion)) > 0;
    });
    newer.sort(function (a, b) {
      return marketplace.versionCompare(String(b.version), String(a.version));
    });
    return newer;
  },

  /**
   * Replaces %placeholders% in a translation template with values from a map.
   * Single-pass substitution so a replacement value containing another placeholder
   * literal (e.g. a module named "%from%") is not re-expanded.
   */
  formatString: function formatString(template, replacements) {
    if (!template) {
      return '';
    }

    var map = replacements || {};
    return template.replace(/%([a-zA-Z0-9_]+)%/g, function (match, key) {
      if (!Object.prototype.hasOwnProperty.call(map, key)) {
        return match;
      }

      var raw = map[key];
      return installationFromRepo.escapeHtml(String(raw !== undefined && raw !== null ? raw : ''));
    });
  },

  /**
   * Minimal HTML escape for values injected into the changelog modal.
   */
  escapeHtml: function escapeHtml(value) {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
}; // Initializes the installationFromRepo module when the document is ready,
// preparing the extension modules management UI.

$(document).ready(function () {
  installationFromRepo.initialize();
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLWluc3RhbGwtZnJvbS1yZXBvLmpzIl0sIm5hbWVzIjpbImluc3RhbGxhdGlvbkZyb21SZXBvIiwicGJ4VmVyc2lvbiIsImdsb2JhbFBCWFZlcnNpb24iLCJyZXBsYWNlIiwiJGJ0blVwZGF0ZUFsbE1vZHVsZXMiLCIkIiwiJHByb2dyZXNzQmFyQmxvY2siLCIkaW5zdGFsbE1vZHVsZU1vZGFsRm9ybSIsIiR1cGRhdGVDaGFuZ2Vsb2dNb2RhbCIsImNoYW5nZWxvZ0dlbiIsImluaXRpYWxpemUiLCJpbml0aWFsaXplQnV0dG9uRXZlbnRzIiwiaGlkZSIsImRvY3VtZW50Iiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCIkY3VycmVudEJ1dHRvbiIsInRhcmdldCIsImNsb3Nlc3QiLCJnbG9iYWxQQlhMaWNlbnNlIiwidHJpbSIsIndpbmRvdyIsImxvY2F0aW9uIiwiZ2xvYmFsUm9vdFVybCIsIm9wZW5JbnN0YWxsTW9kdWxlTW9kYWwiLCJvcGVuVXBkYXRlQ2hhbmdlbG9nTW9kYWwiLCJ1cGRhdGVBbGxNb2R1bGVzIiwibW9kdWxlVW5pcXVlSWQiLCJkYXRhIiwicmVsZWFzZUlkIiwibW9kYWwiLCJjbG9zYWJsZSIsIm9uU2hvdyIsIm1vZHVsZU5hbWUiLCJ0aGVGb3JtIiwiZmluZCIsInRleHQiLCIkaW5zdGFsbGVkTW9kdWxlUm93IiwibGVuZ3RoIiwiaW5zdGFsbGVkVmVyc2lvbiIsIm5ld1ZlcnNpb24iLCJtYXJrZXRwbGFjZSIsInZlcnNpb25Db21wYXJlIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXh0X1VwZGF0ZU1vZHVsZVRpdGxlIiwiaHRtbCIsImV4dF9Nb2R1bGVVcGRhdGVEZXNjcmlwdGlvbiIsImV4dF9Eb3duZ3JhZGVNb2R1bGVUaXRsZSIsImV4dF9Nb2R1bGVEb3duZ3JhZGVEZXNjcmlwdGlvbiIsImV4dF9JbnN0YWxsTW9kdWxlVGl0bGUiLCJleHRfTW9kdWxlSW5zdGFsbERlc2NyaXB0aW9uIiwib25EZW55IiwicmVtb3ZlQ2xhc3MiLCJvbkFwcHJvdmUiLCJydW5TaW5nbGVJbnN0YWxsIiwiJG1vZGFsIiwiJGluc3RhbGxlZFJvdyIsIlN0cmluZyIsImZpcnN0IiwiY2xvbmUiLCJjaGlsZHJlbiIsInJlbW92ZSIsImVuZCIsInJlc2V0Q2hhbmdlbG9nTW9kYWwiLCJteUdlbiIsImhhc0NsYXNzIiwiTW9kdWxlc0FQSSIsImdldE1vZHVsZUluZm8iLCJ1bmlxaWQiLCJyZXBvRGF0YSIsInN1Y2Nlc3MiLCJBcnJheSIsImlzQXJyYXkiLCJyZWxlYXNlcyIsInNob3dDaGFuZ2Vsb2dFcnJvciIsIm5ld2VyUmVsZWFzZXMiLCJmaWx0ZXJOZXdlclJlbGVhc2VzIiwibGF0ZXN0VmVyc2lvbiIsInZlcnNpb24iLCJpbnRybyIsImZvcm1hdFN0cmluZyIsImV4dF9VcGRhdGVDaGFuZ2Vsb2dJbnRybyIsIm5hbWUiLCJmcm9tIiwidG8iLCJyZW5kZXJDaGFuZ2Vsb2dNb2RhbCIsInNsaWNlIiwiYWRkQ2xhc3MiLCJwYXJhbXMiLCJjaGFubmVsSWQiLCJpbnN0YWxsU3RhdHVzTG9vcFdvcmtlciIsIiRtb2R1bGVCdXR0b25zIiwiaW5zdGFsbEZyb21SZXBvIiwicmVzcG9uc2UiLCJjb25zb2xlIiwiZGVidWciLCJyZXN1bHQiLCJhbmltYXRlIiwic2Nyb2xsVG9wIiwib2Zmc2V0IiwidG9wIiwib3BlblVwZGF0ZUFsbE1vZHVsZXNNb2RhbCIsInVuaXF1ZU1vZHVsZXNGb3JVcGRhdGUiLCJTZXQiLCJlYWNoIiwiXyIsImJ1dHRvbiIsImFkZCIsIm1vZHVsZXNGb3JVcGRhdGUiLCJleHRfVXBkYXRlQWxsTW9kdWxlc1RpdGxlIiwic2VsZWN0ZWQiLCJjb2xsZWN0U2VsZWN0ZWRNb2R1bGVzIiwicnVuVXBkYXRlQWxsIiwiZmV0Y2hlZCIsInBlbmRpbmciLCJhbnlTdWNjZXNzIiwiZm9yRWFjaCIsIiRidG4iLCJwdXNoIiwiZXJyb3IiLCJzb3J0IiwiYSIsImIiLCJsb2NhbGVDb21wYXJlIiwicmVuZGVyTXVsdGlTZWxlY3RNb2RhbCIsImV4dF9VcGRhdGVBbGxNb2R1bGVzQ2hhbmdlbG9nSW50cm8iLCIkYm94ZXMiLCJlbCIsInN0YXJ0QmF0Y2hVcGRhdGUiLCJ1cGRhdGVBbGwiLCJyZXNldEJhdGNoVXBkYXRlIiwic2hvdyIsImVtcHR5IiwiaW50cm9UZXh0IiwiZW50cmllcyIsImVudHJ5IiwicmVuZGVyRW50cnlSZWxlYXNlcyIsIm5ld2VzdCIsInZlcnNpb25JbmZvIiwiZXNjYXBlSHRtbCIsIiRib2R5IiwiJGFjY29yZGlvbiIsImFjY29yZGlvbiIsImV4Y2x1c2l2ZSIsInN0b3BQcm9wYWdhdGlvbiIsImNoZWNrYm94IiwiJGFwcHJvdmUiLCJyZWZyZXNoQXBwcm92ZVN0YXRlIiwiYW55Q2hlY2tlZCIsImV4dF9GYWlsZWRUb0xvYWRDaGFuZ2Vsb2ciLCJleHRfTm9DaGFuZ2Vsb2dBdmFpbGFibGUiLCJyZWxlYXNlIiwicmVsZWFzZURhdGUiLCJjcmVhdGVkIiwic3BsaXQiLCJjaGFuZ2VMb2dUZXh0IiwiZm9ybWF0Q2hhbmdlbG9nVGV4dCIsImNoYW5nZWxvZyIsImV4dF9JbnN0YWxsTW9kdWxlUmVsZWFzZVRhZyIsImV4dF9Gcm9tRGF0ZSIsInJhdyIsInVuZGVmaW5lZCIsImVzY2FwZWQiLCJuZXdlciIsImZpbHRlciIsInRlbXBsYXRlIiwicmVwbGFjZW1lbnRzIiwibWFwIiwibWF0Y2giLCJrZXkiLCJPYmplY3QiLCJwcm90b3R5cGUiLCJoYXNPd25Qcm9wZXJ0eSIsImNhbGwiLCJ2YWx1ZSIsInJlYWR5Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FBRUE7O0FBRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLElBQU1BLG9CQUFvQixHQUFHO0FBRXpCO0FB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dCI6WyIvKlxuICogTWlrb1BCWCAtIGZyZWUgcGhvbmUgc3lzdGVtIGZvciBzbWFsbCBidXNpbmVzc1xuICogQ29weXJpZ2h0IMKpIDIwMTctMjAyNCBBbGV4ZXkgUG9ydG5vdiBhbmQgTmlrb2xheSBCZWtldG92XG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGZyZWUgc29mdHdhcmU6IHlvdSBjYW4gcmVkaXN0cmlidXRlIGl0IGFuZC9vciBtb2RpZnlcbiAqIGl0IHVuZGVyIHRoZSB0ZXJtcyBvZiB0aGUgR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgYXMgcHVibGlzaGVkIGJ5XG4gKiB0aGUgRnJlZSBTb2Z0d2FyZSBGb3VuZGF0aW9uOyBlaXRoZXIgdmVyc2lvbiAzIG9mIHRoZSBMaWNlbnNlLCBvclxuICogKGF0IHlvdXIgb3B0aW9uKSBhbnkgbGF0ZXIgdmVyc2lvbi5cbiAqXG4gKiBUaGlzIHByb2dyYW0gaXMgZGlzdHJpYnV0ZWQgaW4gdGhlIGhvcGUgdGhhdCBpdCB3aWxsIGJlIHVzZWZ1bCxcbiAqIGJ1dCBXSVRIT1VUIEFOWSBXQVJSQU5UWTsgd2l0aG91dCBldmVuIHRoZSBpbXBsaWVkIHdhcnJhbnR5IG9mXG4gKiBNRVJDSEFOVEFCSUxJVFkgb3IgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UuICBTZWUgdGhlXG4gKiBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBmb3IgbW9yZSBkZXRhaWxzLlxuICpcbiAqIFlvdSBzaG91bGQgaGF2ZSByZWNlaXZlZCBhIGNvcHkgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFsb25nIHdpdGggdGhpcyBwcm9ncmFtLlxuICogSWYgbm90LCBzZWUgPGh0dHBzOi8vd3d3LmdudS5vcmcvbGljZW5zZXMvPi5cbiAqL1xuXG4vKiBnbG9iYWwgZ2xvYmFsUm9vdFVybCwgUGJ4QXBpLCBnbG9iYWxQQlhMaWNlbnNlLCBnbG9iYWxUcmFuc2xhdGUsIFVzZXJNZXNzYWdlLCBnbG9iYWxQQlhWZXJzaW9uLCBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlciwgbWFya2V0cGxhY2UsIE1vZHVsZXNBUEkgKi9cblxuLyoqXG4gKiBNYW5hZ2VzIHRoZSBpbnN0YWxsYXRpb24gYW5kIHVwZGF0aW5nIG9mIFBCWCBleHRlbnNpb24gbW9kdWxlcyBmcm9tIGEgcmVwb3NpdG9yeS5cbiAqIEl0IHByb3ZpZGVzIGZ1bmN0aW9uYWxpdHkgdG8gdXBkYXRlIGluZGl2aWR1YWwgbW9kdWxlcyBvciBhbGwgbW9kdWxlcyBhdCBvbmNlLFxuICogYW5kIGRpc3BsYXlzIHByb2dyZXNzIGluZm9ybWF0aW9uIHRvIHRoZSB1c2VyLlxuICpcbiAqIEBjbGFzcyBpbnN0YWxsYXRpb25Gcm9tUmVwb1xuICogQG1lbWJlcm9mIG1vZHVsZTpQYnhFeHRlbnNpb25Nb2R1bGVzXG4gKi9cbmNvbnN0IGluc3RhbGxhdGlvbkZyb21SZXBvID0ge1xuXG4gICAgLyoqXG4gICAgICogVGhlIGN1cnJlbnQgdmVyc2lvbiBvZiB0aGUgUEJYIHN5c3RlbSwgd2l0aCBkZXZlbG9wbWVudCB2ZXJzaW9uIGlkZW50aWZpZXJzIHJlbW92ZWQuXG4gICAgICogQHR5cGUge3N0cmluZ31cbiAgICAgKi9cbiAgICBwYnhWZXJzaW9uOiBnbG9iYWxQQlhWZXJzaW9uLnJlcGxhY2UoLy1kZXYvaSwgJycpLFxuXG4gICAgLyoqXG4gICAgICogalF1ZXJ5IG9iamVjdCBmb3IgdGhlIGJ1dHRvbiByZXNwb25zaWJsZSBmb3IgdXBkYXRpbmcgYWxsIGluc3RhbGxlZCBtb2R1bGVzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGJ0blVwZGF0ZUFsbE1vZHVsZXM6ICQoJyN1cGRhdGUtYWxsLW1vZHVsZXMtYnV0dG9uJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgYmxvY2sgdGhhdCBjb250YWlucyB0aGUgcHJvZ3Jlc3MgYmFyLCB1c2VkIHRvIGluZGljYXRlXG4gICAgICogdGhlIHByb2dyZXNzIG9mIG1vZHVsZSBpbnN0YWxsYXRpb24gb3IgdXBkYXRpbmcgcHJvY2Vzc2VzLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJHByb2dyZXNzQmFyQmxvY2s6ICQoJyN1cGxvYWQtcHJvZ3Jlc3MtYmFyLWJsb2NrJyksXG5cbiAgICAvKipcbiAgICAgKiBqUXVlcnkgb2JqZWN0IGZvciB0aGUgaW5zdGFsbGF0aW9uIG1vZHVsZSBtb2RhbCBmb3JtLlxuICAgICAqIEB0eXBlIHtqUXVlcnl9XG4gICAgICovXG4gICAgJGluc3RhbGxNb2R1bGVNb2RhbEZvcm06ICQoJyNpbnN0YWxsLW1vZGFsLWZvcm0nKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB1cGRhdGUgY2hhbmdlbG9nIGNvbmZpcm1hdGlvbiBtb2RhbC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR1cGRhdGVDaGFuZ2Vsb2dNb2RhbDogJCgnI3VwZGF0ZS1jaGFuZ2Vsb2ctbW9kYWwnKSxcblxuICAgIC8qKlxuICAgICAqIE1vbm90b25pY2FsbHkgaW5jcmVhc2luZyB0b2tlbiBidW1wZWQgZWFjaCB0aW1lIHRoZSBjaGFuZ2Vsb2cgbW9kYWwgaXMgb3BlbmVkLlxuICAgICAqIEluLWZsaWdodCBgZ2V0TW9kdWxlSW5mb2AgY2FsbGJhY2tzIGNvbXBhcmUgYWdhaW5zdCB0aGlzIHRva2VuIGFuZCBiYWlsIG91dCBpZlxuICAgICAqIGEgbmV3ZXIgbW9kYWwgb3BlbmluZyBoYXMgc3VwZXJzZWRlZCB0aGVpciByZXF1ZXN0IOKAlCBwcmV2ZW50cyBzdGFsZSByZXBvc2l0b3J5XG4gICAgICogcmVzcG9uc2VzIGZyb20gb3ZlcndyaXRpbmcgdGhlIGJvZHkgb2YgYSBuZXdseS1zaG93biBtb2RhbC5cbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAqL1xuICAgIGNoYW5nZWxvZ0dlbjogMCxcblxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGluc3RhbGxhdGlvbkZyb21SZXBvIG1vZHVsZS4gU2V0cyB1cCBldmVudCBoYW5kbGVycyBmb3IgVUkgaW50ZXJhY3Rpb25zXG4gICAgICogYW5kIGhpZGVzIFVJIGVsZW1lbnRzIHRoYXQgYXJlIG5vdCBpbW1lZGlhdGVseSBuZWVkZWQuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgaW5zdGFsbGF0aW9uRnJvbVJlcG8uaW5pdGlhbGl6ZUJ1dHRvbkV2ZW50cygpO1xuICAgICAgICBpbnN0YWxsYXRpb25Gcm9tUmVwby4kcHJvZ3Jlc3NCYXJCbG9jay5oaWRlKCk7XG4gICAgICAgIGluc3RhbGxhdGlvbkZyb21SZXBvLiRidG5VcGRhdGVBbGxNb2R1bGVzLmhpZGUoKTsgLy8gVW50aWwgYXQgbGVhc3Qgb25lIHVwZGF0ZSBhdmFpbGFibGVcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2V0cyB1cCBldmVudCBoYW5kbGVycyBmb3IgYnV0dG9uIGNsaWNrcyB3aXRoaW4gdGhlIG1vZHVsZS5cbiAgICAgKiBVcGRhdGUgYnV0dG9ucyBnbyB0aHJvdWdoIGEgY2hhbmdlbG9nIGNvbmZpcm1hdGlvbiBtb2RhbDsgaW5zdGFsbC9kb3duZ3JhZGUgYnV0dG9uc1xuICAgICAqIGdvIHRocm91Z2ggdGhlIG9yaWdpbmFsIHNpbXBsZSBjb25maXJtYXRpb24gbW9kYWwuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZUJ1dHRvbkV2ZW50cygpIHtcbiAgICAgICAgLy8gTmV3IGluc3RhbGwgLyBleHBsaWNpdCB2ZXJzaW9uIGRvd25sb2FkIChwZXItcmVsZWFzZSBpbiBkZXRhaWwgcG9wdXApIC0+IHNpbXBsZSBtb2RhbFxuICAgICAgICAkKGRvY3VtZW50KS5vbignY2xpY2snLCAnYS5kb3dubG9hZCcsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkY3VycmVudEJ1dHRvbiA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2EuYnV0dG9uJyk7XG4gICAgICAgICAgICBpZiAoZ2xvYmFsUEJYTGljZW5zZS50cmltKCkgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1wYngtZXh0ZW5zaW9uLW1vZHVsZXMvaW5kZXgjL2xpY2Vuc2luZ2A7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGluc3RhbGxhdGlvbkZyb21SZXBvLm9wZW5JbnN0YWxsTW9kdWxlTW9kYWwoJGN1cnJlbnRCdXR0b24pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcblxuICAgICAgICAvLyBTaW5nbGUtbW9kdWxlIHVwZGF0ZSAtPiBjaGFuZ2Vsb2cgY29uZmlybWF0aW9uIG1vZGFsIChjdXJyZW50IC0+IGxhdGVzdClcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJ2EudXBkYXRlJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGNvbnN0ICRjdXJyZW50QnV0dG9uID0gJChlLnRhcmdldCkuY2xvc2VzdCgnYS5idXR0b24nKTtcbiAgICAgICAgICAgIGlmIChnbG9iYWxQQlhMaWNlbnNlLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgICAgICAgICB3aW5kb3cubG9jYXRpb24gPSBgJHtnbG9iYWxSb290VXJsfXBieC1leHRlbnNpb24tbW9kdWxlcy9pbmRleCMvbGljZW5zaW5nYDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgaW5zdGFsbGF0aW9uRnJvbVJlcG8ub3BlblVwZGF0ZUNoYW5nZWxvZ01vZGFsKCRjdXJyZW50QnV0dG9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaW5zdGFsbGF0aW9uRnJvbVJlcG8uJGJ0blVwZGF0ZUFsbE1vZHVsZXMub24oJ2NsaWNrJywgaW5zdGFsbGF0aW9uRnJvbVJlcG8udXBkYXRlQWxsTW9kdWxlcyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIE9wZW5zIHRoZSBtb2RhbCBmb3JtIGZvciBpbnN0YWxsaW5nIGEgbW9kdWxlLiBUaGlzIG1vZGFsIHByb3ZpZGVzIHRoZSB1c2VyIHdpdGggaW5mb3JtYXRpb25cbiAgICAgKiBhYm91dCB0aGUgbW9kdWxlIHRoZXkgYXJlIGFib3V0IHRvIGluc3RhbGwsIGFuZCBjb25maXJtcyB0aGVpciBhY3Rpb24uXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJGN1cnJlbnRCdXR0b24gLSBUaGUgalF1ZXJ5IG9iamVjdCBvZiB0aGUgYnV0dG9uIHRoYXQgd2FzIGNsaWNrZWQgdG8gdHJpZ2dlciB0aGlzIG1vZGFsLlxuICAgICAqL1xuICAgIG9wZW5JbnN0YWxsTW9kdWxlTW9kYWwoJGN1cnJlbnRCdXR0b24pIHtcbiAgICAgICAgY29uc3QgbW9kdWxlVW5pcXVlSWQgPSAkY3VycmVudEJ1dHRvbi5kYXRhKCd1bmlxaWQnKTtcbiAgICAgICAgY29uc3QgcmVsZWFzZUlkID0gJGN1cnJlbnRCdXR0b24uZGF0YSgncmVsZWFzZWlkJyk7XG4gICAgICAgIGluc3RhbGxhdGlvbkZyb21SZXBvLiRpbnN0YWxsTW9kdWxlTW9kYWxGb3JtXG4gICAgICAgICAgICAubW9kYWwoe1xuICAgICAgICAgICAgICAgIGNsb3NhYmxlOiBmYWxzZSxcbiAgICAgICAgICAgICAgICBvblNob3c6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgbW9kdWxlTmFtZSA9ICRjdXJyZW50QnV0dG9uLmNsb3Nlc3QoJ3RyJykuZGF0YSgnbmFtZScpO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCB0aGVGb3JtID0gIGluc3RhbGxhdGlvbkZyb21SZXBvLiRpbnN0YWxsTW9kdWxlTW9kYWxGb3JtO1xuICAgICAgICAgICAgICAgICAgICB0aGVGb3JtLmZpbmQoJ3NwYW4ubW9kdWxlLW5hbWUnKS50ZXh0KG1vZHVsZU5hbWUpO1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0ICRpbnN0YWxsZWRNb2R1bGVSb3cgPSAkKGB0ci5tb2R1bGUtcm93W2RhdGEtaWQ9JHttb2R1bGVVbmlxdWVJZH1dYCk7XG4gICAgICAgICAgICAgICAgICAgIGlmICgkaW5zdGFsbGVkTW9kdWxlUm93Lmxlbmd0aD4wKXtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGluc3RhbGxlZFZlcnNpb24gPSAkaW5zdGFsbGVkTW9kdWxlUm93LmRhdGEoJ3ZlcnNpb24nKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld1ZlcnNpb24gPSAkY3VycmVudEJ1dHRvbi5kYXRhKCd2ZXJzaW9uJyk/P2luc3RhbGxlZFZlcnNpb247XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWFya2V0cGxhY2UudmVyc2lvbkNvbXBhcmUobmV3VmVyc2lvbiwgaW5zdGFsbGVkVmVyc2lvbik+MCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlRm9ybS5maW5kKCdzcGFuLmFjdGlvbicpLnRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9VcGRhdGVNb2R1bGVUaXRsZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlRm9ybS5maW5kKCdkaXYuZGVzY3JpcHRpb24nKS5odG1sKGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlVXBkYXRlRGVzY3JpcHRpb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGVGb3JtLmZpbmQoJ3NwYW4uYWN0aW9uJykudGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X0Rvd25ncmFkZU1vZHVsZVRpdGxlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGVGb3JtLmZpbmQoJ2Rpdi5kZXNjcmlwdGlvbicpLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVEb3duZ3JhZGVEZXNjcmlwdGlvbik7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGVGb3JtLmZpbmQoJ3NwYW4uYWN0aW9uJykudGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X0luc3RhbGxNb2R1bGVUaXRsZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGVGb3JtLmZpbmQoJ2Rpdi5kZXNjcmlwdGlvbicpLmh0bWwoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Nb2R1bGVJbnN0YWxsRGVzY3JpcHRpb24pO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbkRlbnk6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgJCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBvbkFwcHJvdmU6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgaW5zdGFsbGF0aW9uRnJvbVJlcG8ucnVuU2luZ2xlSW5zdGFsbChtb2R1bGVVbmlxdWVJZCwgcmVsZWFzZUlkKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAubW9kYWwoJ3Nob3cnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogT3BlbnMgdGhlIGNoYW5nZWxvZyBjb25maXJtYXRpb24gbW9kYWwgZm9yIGEgc2luZ2xlLW1vZHVsZSB1cGRhdGUuIEZldGNoZXMgcmVsZWFzZVxuICAgICAqIGluZm8gZnJvbSB0aGUgcmVwb3NpdG9yeSwgcmVuZGVycyBhZ2dyZWdhdGVkIGNoYW5nZWxvZyBmcm9tIHRoZSBpbnN0YWxsZWQgdmVyc2lvblxuICAgICAqIHVwIHRvIHRoZSBsYXRlc3QgcmVsZWFzZSwgYW5kIGxldHMgdGhlIHVzZXIgY29uZmlybSBvciBjYW5jZWwuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJGN1cnJlbnRCdXR0b24gLSBUaGUgY2xpY2tlZCBVcGRhdGUgYnV0dG9uLlxuICAgICAqL1xuICAgIG9wZW5VcGRhdGVDaGFuZ2Vsb2dNb2RhbCgkY3VycmVudEJ1dHRvbikge1xuICAgICAgICBjb25zdCBtb2R1bGVVbmlxdWVJZCA9ICRjdXJyZW50QnV0dG9uLmRhdGEoJ3VuaXFpZCcpO1xuICAgICAgICBjb25zdCByZWxlYXNlSWQgPSAkY3VycmVudEJ1dHRvbi5kYXRhKCdyZWxlYXNlaWQnKTtcbiAgICAgICAgY29uc3QgJG1vZGFsID0gaW5zdGFsbGF0aW9uRnJvbVJlcG8uJHVwZGF0ZUNoYW5nZWxvZ01vZGFsO1xuICAgICAgICBjb25zdCAkaW5zdGFsbGVkUm93ID0gJChgdHIubW9kdWxlLXJvd1tkYXRhLWlkPSR7bW9kdWxlVW5pcXVlSWR9XWApO1xuICAgICAgICBjb25zdCBpbnN0YWxsZWRWZXJzaW9uID0gJGluc3RhbGxlZFJvdy5sZW5ndGggPiAwID8gU3RyaW5nKCRpbnN0YWxsZWRSb3cuZGF0YSgndmVyc2lvbicpIHx8ICcnKSA6ICcnO1xuICAgICAgICBjb25zdCBtb2R1bGVOYW1lID0gJGN1cnJlbnRCdXR0b24uY2xvc2VzdCgndHInKS5kYXRhKCduYW1lJylcbiAgICAgICAgICAgIHx8ICRpbnN0YWxsZWRSb3cuZmluZCgndGQuc2hvdy1kZXRhaWxzLW9uLWNsaWNrJykuZmlyc3QoKS5jbG9uZSgpLmNoaWxkcmVuKCkucmVtb3ZlKCkuZW5kKCkudGV4dCgpLnRyaW0oKVxuICAgICAgICAgICAgfHwgbW9kdWxlVW5pcXVlSWQ7XG5cbiAgICAgICAgaW5zdGFsbGF0aW9uRnJvbVJlcG8ucmVzZXRDaGFuZ2Vsb2dNb2RhbCgkbW9kYWwpO1xuICAgICAgICAkbW9kYWwuZmluZCgnc3Bhbi5hY3Rpb24nKS50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfVXBkYXRlTW9kdWxlVGl0bGUpO1xuICAgICAgICAkbW9kYWwuZmluZCgnc3Bhbi5tb2R1bGUtbmFtZScpLnRleHQobW9kdWxlTmFtZSk7XG5cbiAgICAgICAgaW5zdGFsbGF0aW9uRnJvbVJlcG8uY2hhbmdlbG9nR2VuICs9IDE7XG4gICAgICAgIGNvbnN0IG15R2VuID0gaW5zdGFsbGF0aW9uRnJvbVJlcG8uY2hhbmdlbG9nR2VuO1xuXG4gICAgICAgICRtb2RhbC5tb2RhbCh7XG4gICAgICAgICAgICBjbG9zYWJsZTogZmFsc2UsXG4gICAgICAgICAgICBvbkRlbnk6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uQXBwcm92ZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICgkbW9kYWwuZmluZCgnLmFwcHJvdmUuYnV0dG9uJykuaGFzQ2xhc3MoJ2Rpc2FibGVkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpbnN0YWxsYXRpb25Gcm9tUmVwby5ydW5TaW5nbGVJbnN0YWxsKG1vZHVsZVVuaXF1ZUlkLCByZWxlYXNlSWQpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSkubW9kYWwoJ3Nob3cnKTtcblxuICAgICAgICBNb2R1bGVzQVBJLmdldE1vZHVsZUluZm8oeyB1bmlxaWQ6IG1vZHVsZVVuaXF1ZUlkIH0sIChyZXBvRGF0YSwgc3VjY2VzcykgPT4ge1xuICAgICAgICAgICAgaWYgKG15R2VuICE9PSBpbnN0YWxsYXRpb25Gcm9tUmVwby5jaGFuZ2Vsb2dHZW4pIHtcbiAgICAgICAgICAgICAgICByZXR1cm47IC8vIGEgbmV3ZXIgbW9kYWwgb3BlbmluZyBzdXBlcnNlZGVkIHRoaXMgcmVxdWVzdFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFzdWNjZXNzIHx8ICFyZXBvRGF0YSB8fCAhQXJyYXkuaXNBcnJheShyZXBvRGF0YS5yZWxlYXNlcykpIHtcbiAgICAgICAgICAgICAgICBpbnN0YWxsYXRpb25Gcm9tUmVwby5zaG93Q2hhbmdlbG9nRXJyb3IoJG1vZGFsKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCBuZXdlclJlbGVhc2VzID0gaW5zdGFsbGF0aW9uRnJvbVJlcG8uZmlsdGVyTmV3ZXJSZWxlYXNlcyhyZXBvRGF0YS5yZWxlYXNlcywgaW5zdGFsbGVkVmVyc2lvbik7XG4gICAgICAgICAgICBjb25zdCBsYXRlc3RWZXJzaW9uID0gbmV3ZXJSZWxlYXNlcy5sZW5ndGggPiAwID8gbmV3ZXJSZWxlYXNlc1swXS52ZXJzaW9uIDogKHJlcG9EYXRhLnJlbGVhc2VzWzBdICYmIHJlcG9EYXRhLnJlbGVhc2VzWzBdLnZlcnNpb24pIHx8ICcnO1xuICAgICAgICAgICAgY29uc3QgaW50cm8gPSBpbnN0YWxsYXRpb25Gcm9tUmVwby5mb3JtYXRTdHJpbmcoXG4gICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmV4dF9VcGRhdGVDaGFuZ2Vsb2dJbnRybyxcbiAgICAgICAgICAgICAgICB7IG5hbWU6IG1vZHVsZU5hbWUsIGZyb206IGluc3RhbGxlZFZlcnNpb24sIHRvOiBsYXRlc3RWZXJzaW9uIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgICAgICBpbnN0YWxsYXRpb25Gcm9tUmVwby5yZW5kZXJDaGFuZ2Vsb2dNb2RhbCgkbW9kYWwsIGludHJvLCBbe1xuICAgICAgICAgICAgICAgIG5hbWU6IG1vZHVsZU5hbWUsXG4gICAgICAgICAgICAgICAgcmVsZWFzZXM6IG5ld2VyUmVsZWFzZXMubGVuZ3RoID4gMCA/IG5ld2VyUmVsZWFzZXMgOiByZXBvRGF0YS5yZWxlYXNlcy5zbGljZSgwLCAxKSxcbiAgICAgICAgICAgIH1dKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJ1bnMgdGhlIGFjdHVhbCBzaW5nbGUtbW9kdWxlIGluc3RhbGwvdXBkYXRlIEFQSSBjYWxsLiBFeHRyYWN0ZWQgc28gYm90aCBtb2RhbHNcbiAgICAgKiAoc2ltcGxlIGluc3RhbGwgYW5kIGNoYW5nZWxvZyBjb25maXJtKSBjYW4gc2hhcmUgdGhlIHBvc3QtY29uZmlybSBsb2dpYy5cbiAgICAgKi9cbiAgICBydW5TaW5nbGVJbnN0YWxsKG1vZHVsZVVuaXF1ZUlkLCByZWxlYXNlSWQpIHtcbiAgICAgICAgJCgnYS5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcblxuICAgICAgICBjb25zdCBwYXJhbXMgPSB7XG4gICAgICAgICAgICB1bmlxaWQ6IG1vZHVsZVVuaXF1ZUlkLFxuICAgICAgICAgICAgcmVsZWFzZUlkOiByZWxlYXNlSWQsXG4gICAgICAgICAgICBjaGFubmVsSWQ6IGluc3RhbGxTdGF0dXNMb29wV29ya2VyLmNoYW5uZWxJZFxuICAgICAgICB9O1xuXG4gICAgICAgICQoYCNtb2RhbC0ke3BhcmFtcy51bmlxaWR9YCkubW9kYWwoJ2hpZGUnKTtcbiAgICAgICAgY29uc3QgJG1vZHVsZUJ1dHRvbnMgPSAkKGBhW2RhdGEtdW5pcWlkPSR7cGFyYW1zLnVuaXFpZH1gKTtcblxuICAgICAgICAkbW9kdWxlQnV0dG9ucy5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgJG1vZHVsZUJ1dHRvbnMuZmluZCgnaScpXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ2Rvd25sb2FkJylcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygncmVkbycpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ3NwaW5uZXIgbG9hZGluZycpO1xuXG4gICAgICAgICQoJ3RyLnRhYmxlLWVycm9yLW1lc3NhZ2VzJykucmVtb3ZlKCk7XG4gICAgICAgICQoJ3RyLmVycm9yJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG5cbiAgICAgICAgTW9kdWxlc0FQSS5pbnN0YWxsRnJvbVJlcG8ocGFyYW1zLCAocmVzcG9uc2UpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUuZGVidWcocmVzcG9uc2UpO1xuICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnJlc3VsdCA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgICAgICQoJ2h0bWwsIGJvZHknKS5hbmltYXRlKHtcbiAgICAgICAgICAgICAgICAgICAgc2Nyb2xsVG9wOiBpbnN0YWxsYXRpb25Gcm9tUmVwby4kcHJvZ3Jlc3NCYXJCbG9jay5vZmZzZXQoKS50b3AgLSA1MCxcbiAgICAgICAgICAgICAgICB9LCAyMDAwKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYXRlcyB0aGUgcHJvY2VzcyBvZiB1cGRhdGluZyBhbGwgaW5zdGFsbGVkIG1vZHVsZXMuIFRyaWdnZXJlZCBieSB0aGUgdXNlclxuICAgICAqIGNsaWNraW5nIHRoZSAnVXBkYXRlIEFsbCcgYnV0dG9uLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtFdmVudH0gZSAtIFRoZSBjbGljayBldmVudCBvYmplY3QgYXNzb2NpYXRlZCB3aXRoIHRoZSAnVXBkYXRlIEFsbCcgYnV0dG9uIGNsaWNrLlxuICAgICAqL1xuICAgIHVwZGF0ZUFsbE1vZHVsZXMoZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGNvbnN0ICRjdXJyZW50QnV0dG9uID0gJChlLnRhcmdldCkuY2xvc2VzdCgnYScpO1xuICAgICAgICBpbnN0YWxsYXRpb25Gcm9tUmVwby5vcGVuVXBkYXRlQWxsTW9kdWxlc01vZGFsKCRjdXJyZW50QnV0dG9uKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogT3BlbnMgdGhlIGNoYW5nZWxvZyBjb25maXJtYXRpb24gbW9kYWwgZm9yIHRoZSBidWxrIHVwZGF0ZS4gRmV0Y2hlcyByZWxlYXNlIGluZm9cbiAgICAgKiBmb3IgZXZlcnkgbW9kdWxlIHRoYXQgaGFzIGFuIGF2YWlsYWJsZSB1cGRhdGUgYW5kIHJlbmRlcnMgYW4gYWdncmVnYXRlZCBjaGFuZ2Vsb2dcbiAgICAgKiAob25lIHNlY3Rpb24gcGVyIG1vZHVsZSkgYmVmb3JlIGFza2luZyB0aGUgdXNlciB0byBjb25maXJtLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRjdXJyZW50QnV0dG9uIC0gVGhlICdVcGRhdGUgQWxsJyBidXR0b24uXG4gICAgICovXG4gICAgb3BlblVwZGF0ZUFsbE1vZHVsZXNNb2RhbCgkY3VycmVudEJ1dHRvbikge1xuICAgICAgICBjb25zdCAkbW9kYWwgPSBpbnN0YWxsYXRpb25Gcm9tUmVwby4kdXBkYXRlQ2hhbmdlbG9nTW9kYWw7XG4gICAgICAgIGNvbnN0IHVuaXF1ZU1vZHVsZXNGb3JVcGRhdGUgPSBuZXcgU2V0KCk7XG4gICAgICAgICQoJ2EudXBkYXRlJykuZWFjaCgoXywgYnV0dG9uKSA9PiB7XG4gICAgICAgICAgICB1bmlxdWVNb2R1bGVzRm9yVXBkYXRlLmFkZCgkKGJ1dHRvbikuZGF0YSgndW5pcWlkJykpO1xuICAgICAgICB9KTtcbiAgICAgICAgY29uc3QgbW9kdWxlc0ZvclVwZGF0ZSA9IFsuLi51bmlxdWVNb2R1bGVzRm9yVXBkYXRlXTtcblxuICAgICAgICBpZiAobW9kdWxlc0ZvclVwZGF0ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGluc3RhbGxhdGlvbkZyb21SZXBvLnJlc2V0Q2hhbmdlbG9nTW9kYWwoJG1vZGFsKTtcbiAgICAgICAgJG1vZGFsLmZpbmQoJ3NwYW4uYWN0aW9uJykudGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X1VwZGF0ZUFsbE1vZHVsZXNUaXRsZSk7XG4gICAgICAgICRtb2RhbC5maW5kKCdzcGFuLm1vZHVsZS1uYW1lJykudGV4dCgnJyk7XG5cbiAgICAgICAgaW5zdGFsbGF0aW9uRnJvbVJlcG8uY2hhbmdlbG9nR2VuICs9IDE7XG4gICAgICAgIGNvbnN0IG15R2VuID0gaW5zdGFsbGF0aW9uRnJvbVJlcG8uY2hhbmdlbG9nR2VuO1xuXG4gICAgICAgICRtb2RhbC5tb2RhbCh7XG4gICAgICAgICAgICBjbG9zYWJsZTogZmFsc2UsXG4gICAgICAgICAgICBvbkRlbnk6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uQXBwcm92ZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICgkbW9kYWwuZmluZCgnLmFwcHJvdmUuYnV0dG9uJykuaGFzQ2xhc3MoJ2Rpc2FibGVkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RlZCA9IGluc3RhbGxhdGlvbkZyb21SZXBvLmNvbGxlY3RTZWxlY3RlZE1vZHVsZXMoJG1vZGFsKTtcbiAgICAgICAgICAgICAgICBpZiAoc2VsZWN0ZWQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaW5zdGFsbGF0aW9uRnJvbVJlcG8ucnVuVXBkYXRlQWxsKCRjdXJyZW50QnV0dG9uLCBzZWxlY3RlZCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KS5tb2RhbCgnc2hvdycpO1xuXG4gICAgICAgIGNvbnN0IGZldGNoZWQgPSBbXTtcbiAgICAgICAgbGV0IHBlbmRpbmcgPSBtb2R1bGVzRm9yVXBkYXRlLmxlbmd0aDtcbiAgICAgICAgbGV0IGFueVN1Y2Nlc3MgPSBmYWxzZTtcblxuICAgICAgICBtb2R1bGVzRm9yVXBkYXRlLmZvckVhY2goKHVuaXFpZCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGluc3RhbGxlZFJvdyA9ICQoYHRyLm1vZHVsZS1yb3dbZGF0YS1pZD0ke3VuaXFpZH1dYCk7XG4gICAgICAgICAgICBjb25zdCBpbnN0YWxsZWRWZXJzaW9uID0gJGluc3RhbGxlZFJvdy5sZW5ndGggPiAwID8gU3RyaW5nKCRpbnN0YWxsZWRSb3cuZGF0YSgndmVyc2lvbicpIHx8ICcnKSA6ICcnO1xuICAgICAgICAgICAgY29uc3QgJGJ0biA9ICQoYGEudXBkYXRlW2RhdGEtdW5pcWlkPSR7dW5pcWlkfV1gKS5maXJzdCgpO1xuICAgICAgICAgICAgY29uc3QgbW9kdWxlTmFtZSA9ICRidG4uY2xvc2VzdCgndHInKS5kYXRhKCduYW1lJylcbiAgICAgICAgICAgICAgICB8fCAkaW5zdGFsbGVkUm93LmZpbmQoJ3RkLnNob3ctZGV0YWlscy1vbi1jbGljaycpLmZpcnN0KCkuY2xvbmUoKS5jaGlsZHJlbigpLnJlbW92ZSgpLmVuZCgpLnRleHQoKS50cmltKClcbiAgICAgICAgICAgICAgICB8fCB1bmlxaWQ7XG5cbiAgICAgICAgICAgIE1vZHVsZXNBUEkuZ2V0TW9kdWxlSW5mbyh7IHVuaXFpZDogdW5pcWlkIH0sIChyZXBvRGF0YSwgc3VjY2VzcykgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChteUdlbiAhPT0gaW5zdGFsbGF0aW9uRnJvbVJlcG8uY2hhbmdlbG9nR2VuKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjsgLy8gYSBuZXdlciBtb2RhbCBvcGVuaW5nIHN1cGVyc2VkZWQgdGhpcyBiYXRjaFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwZW5kaW5nIC09IDE7XG4gICAgICAgICAgICAgICAgaWYgKHN1Y2Nlc3MgJiYgcmVwb0RhdGEgJiYgQXJyYXkuaXNBcnJheShyZXBvRGF0YS5yZWxlYXNlcykpIHtcbiAgICAgICAgICAgICAgICAgICAgYW55U3VjY2VzcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld2VyUmVsZWFzZXMgPSBpbnN0YWxsYXRpb25Gcm9tUmVwby5maWx0ZXJOZXdlclJlbGVhc2VzKHJlcG9EYXRhLnJlbGVhc2VzLCBpbnN0YWxsZWRWZXJzaW9uKTtcbiAgICAgICAgICAgICAgICAgICAgZmV0Y2hlZC5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVuaXFpZDogdW5pcWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogbW9kdWxlTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc3RhbGxlZFZlcnNpb246IGluc3RhbGxlZFZlcnNpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICByZWxlYXNlczogbmV3ZXJSZWxlYXNlcy5sZW5ndGggPiAwID8gbmV3ZXJSZWxlYXNlcyA6IHJlcG9EYXRhLnJlbGVhc2VzLnNsaWNlKDAsIDEpLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmZXRjaGVkLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgdW5pcWlkOiB1bmlxaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBtb2R1bGVOYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5zdGFsbGVkVmVyc2lvbjogaW5zdGFsbGVkVmVyc2lvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbGVhc2VzOiBbXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAocGVuZGluZyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWFueVN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc3RhbGxhdGlvbkZyb21SZXBvLnNob3dDaGFuZ2Vsb2dFcnJvcigkbW9kYWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGZldGNoZWQuc29ydCgoYSwgYikgPT4gYS5uYW1lLmxvY2FsZUNvbXBhcmUoYi5uYW1lKSk7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbGxhdGlvbkZyb21SZXBvLnJlbmRlck11bHRpU2VsZWN0TW9kYWwoXG4gICAgICAgICAgICAgICAgICAgICAgICAkbW9kYWwsXG4gICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZXh0X1VwZGF0ZUFsbE1vZHVsZXNDaGFuZ2Vsb2dJbnRybyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZldGNoZWRcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlYWRzIGNoZWNrZWQgY2hlY2tib3hlcyBpbnNpZGUgdGhlIG1vZGFsIGFuZCByZXR1cm5zIHRoZSBsaXN0IG9mIHNlbGVjdGVkIHVuaXFpZHMuXG4gICAgICogRmFsbHMgYmFjayB0byBhbGwga25vd24gdW5pcWlkcyB3aGVuIG5vIGNoZWNrYm94ZXMgYXJlIHJlbmRlcmVkIChzaW5nbGUtbW9kdWxlIGNhc2UpLlxuICAgICAqL1xuICAgIGNvbGxlY3RTZWxlY3RlZE1vZHVsZXMoJG1vZGFsKSB7XG4gICAgICAgIGNvbnN0ICRib3hlcyA9ICRtb2RhbC5maW5kKCcudXBkYXRlLW1vZHVsZS1jaGVja2JveCBpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl06Y2hlY2tlZCcpO1xuICAgICAgICBpZiAoJGJveGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IFtdO1xuICAgICAgICAkYm94ZXMuZWFjaCgoXywgZWwpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHVuaXFpZCA9ICQoZWwpLmNsb3Nlc3QoJy51cGRhdGUtbW9kdWxlLWNoZWNrYm94JykuZGF0YSgndW5pcWlkJyk7XG4gICAgICAgICAgICBpZiAodW5pcWlkKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnB1c2godW5pcWlkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJ1bnMgdGhlIGFjdHVhbCBidWxrIHVwZGF0ZSBBUEkgY2FsbCBhZnRlciB1c2VyIGNvbmZpcm1lZCBpbiB0aGUgY2hhbmdlbG9nIG1vZGFsLlxuICAgICAqL1xuICAgIHJ1blVwZGF0ZUFsbCgkY3VycmVudEJ1dHRvbiwgbW9kdWxlc0ZvclVwZGF0ZSkge1xuICAgICAgICAkKCdhLmJ1dHRvbicpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAkY3VycmVudEJ1dHRvbi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgJGN1cnJlbnRCdXR0b24uZmluZCgnaS5pY29uJylcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygncmVkbycpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ3NwaW5uZXIgbG9hZGluZycpO1xuXG4gICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLnN0YXJ0QmF0Y2hVcGRhdGUobW9kdWxlc0ZvclVwZGF0ZSk7XG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IHtcbiAgICAgICAgICAgIGNoYW5uZWxJZDogaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuY2hhbm5lbElkLFxuICAgICAgICAgICAgbW9kdWxlc0ZvclVwZGF0ZTogbW9kdWxlc0ZvclVwZGF0ZSxcbiAgICAgICAgfTtcbiAgICAgICAgTW9kdWxlc0FQSS51cGRhdGVBbGwocGFyYW1zLCAocmVzcG9uc2UsIHN1Y2Nlc3MpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUuZGVidWcocmVzcG9uc2UpO1xuICAgICAgICAgICAgaWYgKHN1Y2Nlc3MgPT09IGZhbHNlIHx8IHJlc3BvbnNlLnJlc3VsdCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5yZXNldEJhdGNoVXBkYXRlKCk7XG4gICAgICAgICAgICAgICAgaW5zdGFsbGF0aW9uRnJvbVJlcG8uJHByb2dyZXNzQmFyQmxvY2suaGlkZSgpO1xuICAgICAgICAgICAgICAgICQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgJGN1cnJlbnRCdXR0b24uZmluZCgnaS5pY29uJylcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdzcGlubmVyIGxvYWRpbmcnKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ3JlZG8nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgJCgndHIudGFibGUtZXJyb3ItbWVzc2FnZXMnKS5yZW1vdmUoKTtcbiAgICAgICAgJCgndHIuZXJyb3InKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVzZXRzIHRoZSBjaGFuZ2Vsb2cgbW9kYWwgdG8gaXRzIGxvYWRpbmcgc3RhdGUgYmVmb3JlIGEgbmV3IGZldGNoLlxuICAgICAqL1xuICAgIHJlc2V0Q2hhbmdlbG9nTW9kYWwoJG1vZGFsKSB7XG4gICAgICAgICRtb2RhbC5maW5kKCcuY2hhbmdlbG9nLWxvYWRlcicpLnNob3coKTtcbiAgICAgICAgJG1vZGFsLmZpbmQoJy5jaGFuZ2Vsb2ctaW50cm8nKS5oaWRlKCkuZW1wdHkoKTtcbiAgICAgICAgJG1vZGFsLmZpbmQoJy5jaGFuZ2Vsb2ctYm9keScpLmhpZGUoKS5lbXB0eSgpO1xuICAgICAgICAkbW9kYWwuZmluZCgnLmNoYW5nZWxvZy1lcnJvcicpLmhpZGUoKTtcbiAgICAgICAgJG1vZGFsLmZpbmQoJy5hcHByb3ZlLmJ1dHRvbicpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93cyB0aGUgZXJyb3IgbWVzc2FnZSBpbnNpZGUgdGhlIGNoYW5nZWxvZyBtb2RhbCBhbmQgZGlzYWJsZXMgQ29uZmlybS5cbiAgICAgKi9cbiAgICBzaG93Q2hhbmdlbG9nRXJyb3IoJG1vZGFsKSB7XG4gICAgICAgICRtb2RhbC5maW5kKCcuY2hhbmdlbG9nLWxvYWRlcicpLmhpZGUoKTtcbiAgICAgICAgJG1vZGFsLmZpbmQoJy5jaGFuZ2Vsb2ctZXJyb3InKS5zaG93KCk7XG4gICAgICAgICRtb2RhbC5maW5kKCcuYXBwcm92ZS5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVuZGVycyB0aGUgY2hhbmdlbG9nIG1vZGFsIGNvbnRlbnQgZm9yIGEgc2luZ2xlLW1vZHVsZSB1cGRhdGUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJG1vZGFsXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGludHJvVGV4dFxuICAgICAqIEBwYXJhbSB7QXJyYXk8e25hbWU6c3RyaW5nLCByZWxlYXNlczpBcnJheSwgZXJyb3I/OmJvb2xlYW59Pn0gZW50cmllc1xuICAgICAqL1xuICAgIHJlbmRlckNoYW5nZWxvZ01vZGFsKCRtb2RhbCwgaW50cm9UZXh0LCBlbnRyaWVzKSB7XG4gICAgICAgICRtb2RhbC5maW5kKCcuY2hhbmdlbG9nLWxvYWRlcicpLmhpZGUoKTtcblxuICAgICAgICBpZiAoaW50cm9UZXh0KSB7XG4gICAgICAgICAgICAkbW9kYWwuZmluZCgnLmNoYW5nZWxvZy1pbnRybycpLmh0bWwoaW50cm9UZXh0KS5zaG93KCk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuICAgICAgICBlbnRyaWVzLmZvckVhY2goKGVudHJ5KSA9PiB7XG4gICAgICAgICAgICBodG1sICs9IGluc3RhbGxhdGlvbkZyb21SZXBvLnJlbmRlckVudHJ5UmVsZWFzZXMoZW50cnkpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkbW9kYWwuZmluZCgnLmNoYW5nZWxvZy1ib2R5JykuaHRtbChodG1sKS5zaG93KCk7XG4gICAgICAgICRtb2RhbC5maW5kKCcuYXBwcm92ZS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgJG1vZGFsLm1vZGFsKCdyZWZyZXNoJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbmRlcnMgdGhlIG11bHRpLW1vZHVsZSB1cGRhdGUgbW9kYWwgYXMgYSBjaGVja2JveCBsaXN0IHdpdGggY29sbGFwc2libGVcbiAgICAgKiBjaGFuZ2Vsb2cgYWNjb3JkaW9uIHBlciBtb2R1bGUuIFRoZSB1c2VyIGNhbiBkZXNlbGVjdCBtb2R1bGVzIHRoZXkgZG8gbm90XG4gICAgICogd2FudCB0byB1cGRhdGU7IENvbmZpcm0gaXMgZGlzYWJsZWQgd2hpbGUgbm8gbW9kdWxlIGlzIGNoZWNrZWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJG1vZGFsXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGludHJvVGV4dFxuICAgICAqIEBwYXJhbSB7QXJyYXk8e3VuaXFpZDpzdHJpbmcsIG5hbWU6c3RyaW5nLCBpbnN0YWxsZWRWZXJzaW9uOnN0cmluZywgcmVsZWFzZXM6QXJyYXksIGVycm9yPzpib29sZWFufT59IGVudHJpZXNcbiAgICAgKi9cbiAgICByZW5kZXJNdWx0aVNlbGVjdE1vZGFsKCRtb2RhbCwgaW50cm9UZXh0LCBlbnRyaWVzKSB7XG4gICAgICAgICRtb2RhbC5maW5kKCcuY2hhbmdlbG9nLWxvYWRlcicpLmhpZGUoKTtcblxuICAgICAgICBpZiAoaW50cm9UZXh0KSB7XG4gICAgICAgICAgICAkbW9kYWwuZmluZCgnLmNoYW5nZWxvZy1pbnRybycpLmh0bWwoaW50cm9UZXh0KS5zaG93KCk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgaHRtbCA9ICc8ZGl2IGNsYXNzPVwidWkgc3R5bGVkIGZsdWlkIGFjY29yZGlvbiB1cGRhdGUtbW9kdWxlcy1hY2NvcmRpb25cIj4nO1xuICAgICAgICBlbnRyaWVzLmZvckVhY2goKGVudHJ5KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBuZXdlc3QgPSBlbnRyeS5yZWxlYXNlcyAmJiBlbnRyeS5yZWxlYXNlc1swXSAmJiBlbnRyeS5yZWxlYXNlc1swXS52ZXJzaW9uXG4gICAgICAgICAgICAgICAgPyBlbnRyeS5yZWxlYXNlc1swXS52ZXJzaW9uXG4gICAgICAgICAgICAgICAgOiAnJztcbiAgICAgICAgICAgIGxldCB2ZXJzaW9uSW5mbyA9ICcnO1xuICAgICAgICAgICAgaWYgKGVudHJ5Lmluc3RhbGxlZFZlcnNpb24gJiYgbmV3ZXN0KSB7XG4gICAgICAgICAgICAgICAgdmVyc2lvbkluZm8gPSBgIDxzcGFuIGNsYXNzPVwidWkgc21hbGwgZ3JleSB0ZXh0XCI+JHtpbnN0YWxsYXRpb25Gcm9tUmVwby5lc2NhcGVIdG1sKGVudHJ5Lmluc3RhbGxlZFZlcnNpb24pfSDihpIgJHtpbnN0YWxsYXRpb25Gcm9tUmVwby5lc2NhcGVIdG1sKG5ld2VzdCl9PC9zcGFuPmA7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG5ld2VzdCkge1xuICAgICAgICAgICAgICAgIHZlcnNpb25JbmZvID0gYCA8c3BhbiBjbGFzcz1cInVpIHNtYWxsIGdyZXkgdGV4dFwiPiR7aW5zdGFsbGF0aW9uRnJvbVJlcG8uZXNjYXBlSHRtbChuZXdlc3QpfTwvc3Bhbj5gO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidGl0bGVcIj4nO1xuICAgICAgICAgICAgaHRtbCArPSAnPGkgY2xhc3M9XCJkcm9wZG93biBpY29uXCI+PC9pPic7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwidWkgY2hlY2tib3ggdXBkYXRlLW1vZHVsZS1jaGVja2JveFwiIGRhdGEtdW5pcWlkPVwiJHtpbnN0YWxsYXRpb25Gcm9tUmVwby5lc2NhcGVIdG1sKGVudHJ5LnVuaXFpZCl9XCI+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBjaGVja2VkIC8+JztcbiAgICAgICAgICAgIGh0bWwgKz0gYDxsYWJlbD48Yj4ke2luc3RhbGxhdGlvbkZyb21SZXBvLmVzY2FwZUh0bWwoZW50cnkubmFtZSl9PC9iPiR7dmVyc2lvbkluZm99PC9sYWJlbD5gO1xuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiY29udGVudFwiPic7XG4gICAgICAgICAgICBodG1sICs9IGluc3RhbGxhdGlvbkZyb21SZXBvLnJlbmRlckVudHJ5UmVsZWFzZXMoZW50cnkpO1xuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgfSk7XG4gICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG5cbiAgICAgICAgY29uc3QgJGJvZHkgPSAkbW9kYWwuZmluZCgnLmNoYW5nZWxvZy1ib2R5Jyk7XG4gICAgICAgICRib2R5Lmh0bWwoaHRtbCkuc2hvdygpO1xuXG4gICAgICAgIGNvbnN0ICRhY2NvcmRpb24gPSAkYm9keS5maW5kKCcudXBkYXRlLW1vZHVsZXMtYWNjb3JkaW9uJyk7XG4gICAgICAgICRhY2NvcmRpb24uYWNjb3JkaW9uKHsgZXhjbHVzaXZlOiBmYWxzZSB9KTtcblxuICAgICAgICAvLyBTdG9wIGNoZWNrYm94IGNsaWNrcyBmcm9tIHRvZ2dsaW5nIHRoZSBhY2NvcmRpb24gdGl0bGUuXG4gICAgICAgICRhY2NvcmRpb24uZmluZCgnLnVwZGF0ZS1tb2R1bGUtY2hlY2tib3gnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgfSk7XG4gICAgICAgICRhY2NvcmRpb24uZmluZCgnLnVpLmNoZWNrYm94LnVwZGF0ZS1tb2R1bGUtY2hlY2tib3gnKS5jaGVja2JveCgpO1xuXG4gICAgICAgIGNvbnN0ICRhcHByb3ZlID0gJG1vZGFsLmZpbmQoJy5hcHByb3ZlLmJ1dHRvbicpO1xuICAgICAgICBjb25zdCByZWZyZXNoQXBwcm92ZVN0YXRlID0gKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgYW55Q2hlY2tlZCA9ICRhY2NvcmRpb24uZmluZCgnLnVwZGF0ZS1tb2R1bGUtY2hlY2tib3ggaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdOmNoZWNrZWQnKS5sZW5ndGggPiAwO1xuICAgICAgICAgICAgaWYgKGFueUNoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICAkYXBwcm92ZS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJGFwcHJvdmUuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgICRhY2NvcmRpb24uZmluZCgnLnVwZGF0ZS1tb2R1bGUtY2hlY2tib3ggaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJykub24oJ2NoYW5nZScsIHJlZnJlc2hBcHByb3ZlU3RhdGUpO1xuICAgICAgICByZWZyZXNoQXBwcm92ZVN0YXRlKCk7XG5cbiAgICAgICAgJG1vZGFsLm1vZGFsKCdyZWZyZXNoJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJ1aWxkcyB0aGUgcGVyLXJlbGVhc2UgY2hhbmdlbG9nIEhUTUwgZm9yIG9uZSBtb2R1bGUgZW50cnkuXG4gICAgICogVXNlZCBieSBib3RoIHNpbmdsZS0gYW5kIG11bHRpLW1vZHVsZSByZW5kZXJlcnMuXG4gICAgICovXG4gICAgcmVuZGVyRW50cnlSZWxlYXNlcyhlbnRyeSkge1xuICAgICAgICBpZiAoZW50cnkuZXJyb3IpIHtcbiAgICAgICAgICAgIHJldHVybiBgPGRpdiBjbGFzcz1cInVpIHdhcm5pbmcgbWVzc2FnZVwiPiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9GYWlsZWRUb0xvYWRDaGFuZ2Vsb2d9PC9kaXY+YDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWVudHJ5LnJlbGVhc2VzIHx8IGVudHJ5LnJlbGVhc2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGA8ZGl2IGNsYXNzPVwidWkgYmFzaWMgc2VnbWVudFwiPjxpPiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9Ob0NoYW5nZWxvZ0F2YWlsYWJsZX08L2k+PC9kaXY+YDtcbiAgICAgICAgfVxuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuICAgICAgICBlbnRyeS5yZWxlYXNlcy5mb3JFYWNoKChyZWxlYXNlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCByZWxlYXNlRGF0ZSA9IHJlbGVhc2UuY3JlYXRlZCA/IFN0cmluZyhyZWxlYXNlLmNyZWF0ZWQpLnNwbGl0KCcgJylbMF0gOiAnJztcbiAgICAgICAgICAgIGNvbnN0IGNoYW5nZUxvZ1RleHQgPSBpbnN0YWxsYXRpb25Gcm9tUmVwby5mb3JtYXRDaGFuZ2Vsb2dUZXh0KHJlbGVhc2UuY2hhbmdlbG9nKTtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSBjbGVhcmluZyBzZWdtZW50XCI+JztcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJ1aSB0b3AgYXR0YWNoZWQgbGFiZWxcIj4ke2dsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbE1vZHVsZVJlbGVhc2VUYWd9OiAke2luc3RhbGxhdGlvbkZyb21SZXBvLmVzY2FwZUh0bWwocmVsZWFzZS52ZXJzaW9uKX1gO1xuICAgICAgICAgICAgaWYgKHJlbGVhc2VEYXRlKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgICR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9Gcm9tRGF0ZX0gJHtpbnN0YWxsYXRpb25Gcm9tUmVwby5lc2NhcGVIdG1sKHJlbGVhc2VEYXRlKX1gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJ1aSBiYXNpYyBzZWdtZW50XCI+PHA+JHtjaGFuZ2VMb2dUZXh0fTwvcD48L2Rpdj5gO1xuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTYWZlbHkgZm9ybWF0cyBhIHJlcG9zaXRvcnktcHJvdmlkZWQgY2hhbmdlbG9nIHZhbHVlIGZvciBIVE1MIGluc2VydGlvbi5cbiAgICAgKiBUcmVhdHMgbnVsbC91bmRlZmluZWQvZW1wdHkgdmFsdWVzIGFzIG1pc3NpbmcgKHJlbmRlcnMgYW4gaXRhbGljIHBsYWNlaG9sZGVyKSxcbiAgICAgKiBIVE1MLWVzY2FwZXMgdGhlIHJhdyB0ZXh0LCBhbmQgY29udmVydHMgbmV3bGluZXMgdG8gYDxicj5gIHNvIHBsYWluLXRleHRcbiAgICAgKiBjaGFuZ2Vsb2dzIGtlZXAgdGhlaXIgbGluZSBicmVha3Mgd2l0aG91dCBhbGxvd2luZyBhcmJpdHJhcnkgbWFya3VwLlxuICAgICAqL1xuICAgIGZvcm1hdENoYW5nZWxvZ1RleHQocmF3KSB7XG4gICAgICAgIGlmIChyYXcgPT09IG51bGwgfHwgcmF3ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBgPGk+JHtnbG9iYWxUcmFuc2xhdGUuZXh0X05vQ2hhbmdlbG9nQXZhaWxhYmxlfTwvaT5gO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHRleHQgPSBTdHJpbmcocmF3KTtcbiAgICAgICAgaWYgKHRleHQgPT09ICcnIHx8IHRleHQgPT09ICdudWxsJyB8fCB0ZXh0ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgcmV0dXJuIGA8aT4ke2dsb2JhbFRyYW5zbGF0ZS5leHRfTm9DaGFuZ2Vsb2dBdmFpbGFibGV9PC9pPmA7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZXNjYXBlZCA9IGluc3RhbGxhdGlvbkZyb21SZXBvLmVzY2FwZUh0bWwodGV4dCk7XG4gICAgICAgIGlmIChlc2NhcGVkLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgICAgIHJldHVybiBgPGk+JHtnbG9iYWxUcmFuc2xhdGUuZXh0X05vQ2hhbmdlbG9nQXZhaWxhYmxlfTwvaT5gO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBlc2NhcGVkLnJlcGxhY2UoL1xcbi9nLCAnPGJyPicpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGaWx0ZXJzIHRoZSByZWxlYXNlcyBhcnJheSB0byBpbmNsdWRlIG9ubHkgdmVyc2lvbnMgbmV3ZXIgdGhhbiB0aGUgaW5zdGFsbGVkIG9uZS5cbiAgICAgKiBSZXR1cm5zIHRoZW0gc29ydGVkIGRlc2NlbmRpbmcgKG5ld2VzdCBmaXJzdCkuXG4gICAgICovXG4gICAgZmlsdGVyTmV3ZXJSZWxlYXNlcyhyZWxlYXNlcywgaW5zdGFsbGVkVmVyc2lvbikge1xuICAgICAgICBpZiAoIWluc3RhbGxlZFZlcnNpb24pIHtcbiAgICAgICAgICAgIHJldHVybiByZWxlYXNlcy5zbGljZSgpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG5ld2VyID0gcmVsZWFzZXMuZmlsdGVyKChyZWxlYXNlKSA9PiB7XG4gICAgICAgICAgICBpZiAoIXJlbGVhc2UgfHwgIXJlbGVhc2UudmVyc2lvbikge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBtYXJrZXRwbGFjZS52ZXJzaW9uQ29tcGFyZShTdHJpbmcocmVsZWFzZS52ZXJzaW9uKSwgU3RyaW5nKGluc3RhbGxlZFZlcnNpb24pKSA+IDA7XG4gICAgICAgIH0pO1xuICAgICAgICBuZXdlci5zb3J0KChhLCBiKSA9PiBtYXJrZXRwbGFjZS52ZXJzaW9uQ29tcGFyZShTdHJpbmcoYi52ZXJzaW9uKSwgU3RyaW5nKGEudmVyc2lvbikpKTtcbiAgICAgICAgcmV0dXJuIG5ld2VyO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXBsYWNlcyAlcGxhY2Vob2xkZXJzJSBpbiBhIHRyYW5zbGF0aW9uIHRlbXBsYXRlIHdpdGggdmFsdWVzIGZyb20gYSBtYXAuXG4gICAgICogU2luZ2xlLXBhc3Mgc3Vic3RpdHV0aW9uIHNvIGEgcmVwbGFjZW1lbnQgdmFsdWUgY29udGFpbmluZyBhbm90aGVyIHBsYWNlaG9sZGVyXG4gICAgICogbGl0ZXJhbCAoZS5nLiBhIG1vZHVsZSBuYW1lZCBcIiVmcm9tJVwiKSBpcyBub3QgcmUtZXhwYW5kZWQuXG4gICAgICovXG4gICAgZm9ybWF0U3RyaW5nKHRlbXBsYXRlLCByZXBsYWNlbWVudHMpIHtcbiAgICAgICAgaWYgKCF0ZW1wbGF0ZSkge1xuICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG1hcCA9IHJlcGxhY2VtZW50cyB8fCB7fTtcbiAgICAgICAgcmV0dXJuIHRlbXBsYXRlLnJlcGxhY2UoLyUoW2EtekEtWjAtOV9dKyklL2csIChtYXRjaCwga2V5KSA9PiB7XG4gICAgICAgICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChtYXAsIGtleSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbWF0Y2g7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCByYXcgPSBtYXBba2V5XTtcbiAgICAgICAgICAgIHJldHVybiBpbnN0YWxsYXRpb25Gcm9tUmVwby5lc2NhcGVIdG1sKFN0cmluZyhyYXcgIT09IHVuZGVmaW5lZCAmJiByYXcgIT09IG51bGwgPyByYXcgOiAnJykpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTWluaW1hbCBIVE1MIGVzY2FwZSBmb3IgdmFsdWVzIGluamVjdGVkIGludG8gdGhlIGNoYW5nZWxvZyBtb2RhbC5cbiAgICAgKi9cbiAgICBlc2NhcGVIdG1sKHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBTdHJpbmcodmFsdWUpXG4gICAgICAgICAgICAucmVwbGFjZSgvJi9nLCAnJmFtcDsnKVxuICAgICAgICAgICAgLnJlcGxhY2UoLzwvZywgJyZsdDsnKVxuICAgICAgICAgICAgLnJlcGxhY2UoLz4vZywgJyZndDsnKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1wiL2csICcmcXVvdDsnKVxuICAgICAgICAgICAgLnJlcGxhY2UoLycvZywgJyYjMzk7Jyk7XG4gICAgfSxcblxufTtcblxuLy8gSW5pdGlhbGl6ZXMgdGhlIGluc3RhbGxhdGlvbkZyb21SZXBvIG1vZHVsZSB3aGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSxcbi8vIHByZXBhcmluZyB0aGUgZXh0ZW5zaW9uIG1vZHVsZXMgbWFuYWdlbWVudCBVSS5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBpbnN0YWxsYXRpb25Gcm9tUmVwby5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==