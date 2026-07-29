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
   * Resolved in initialize() — must not call $() at module-load time.
   * @type {jQuery}
   */
  $btnUpdateAllModules: null,

  /**
   * jQuery object for the block that contains the progress bar, used to indicate
   * the progress of module installation or updating processes.
   * @type {jQuery}
   */
  $progressBarBlock: null,

  /**
   * jQuery object for the installation module modal form.
   * @type {jQuery}
   */
  $installModuleModalForm: null,

  /**
   * jQuery object for the update changelog confirmation modal.
   * @type {jQuery}
   */
  $updateChangelogModal: null,

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
    installationFromRepo.$btnUpdateAllModules = $('#update-all-modules-button');
    installationFromRepo.$progressBarBlock = $('#upload-progress-bar-block');
    installationFromRepo.$installModuleModalForm = $('#install-modal-form');
    installationFromRepo.$updateChangelogModal = $('#update-changelog-modal');
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
    var $moduleButtons = $("a[data-uniqid=".concat(params.uniqid, "]"));
    $moduleButtons.removeClass('disabled');
    $moduleButtons.find('i').removeClass('download').removeClass('redo').addClass('spinner loading');
    $('tr.table-error-messages').remove();
    $('tr.error').removeClass('error');
    installStatusLoopWorker.startWatch(params.uniqid);
    ModulesAPI.installFromRepo(params, function (response) {
      console.debug(response);

      if (response.result === true) {
        $('html, body').animate({
          scrollTop: installationFromRepo.$progressBarBlock.offset().top - 50
        }, 2000);
      } else {
        // Command rejected outright — no point waiting for the watchdog
        installStatusLoopWorker.watchdog.stop();
        installStatusLoopWorker.resetButtonView($moduleButtons.closest('tr'));
        UserMessage.showMultiString(response.messages, globalTranslate.ext_InstallationError);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLWluc3RhbGwtZnJvbS1yZXBvLmpzIl0sIm5hbWVzIjpbImluc3RhbGxhdGlvbkZyb21SZXBvIiwicGJ4VmVyc2lvbiIsImdsb2JhbFBCWFZlcnNpb24iLCJyZXBsYWNlIiwiJGJ0blVwZGF0ZUFsbE1vZHVsZXMiLCIkcHJvZ3Jlc3NCYXJCbG9jayIsIiRpbnN0YWxsTW9kdWxlTW9kYWxGb3JtIiwiJHVwZGF0ZUNoYW5nZWxvZ01vZGFsIiwiY2hhbmdlbG9nR2VuIiwiaW5pdGlhbGl6ZSIsIiQiLCJpbml0aWFsaXplQnV0dG9uRXZlbnRzIiwiaGlkZSIsImRvY3VtZW50Iiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCIkY3VycmVudEJ1dHRvbiIsInRhcmdldCIsImNsb3Nlc3QiLCJnbG9iYWxQQlhMaWNlbnNlIiwidHJpbSIsIndpbmRvdyIsImxvY2F0aW9uIiwiZ2xvYmFsUm9vdFVybCIsIm9wZW5JbnN0YWxsTW9kdWxlTW9kYWwiLCJvcGVuVXBkYXRlQ2hhbmdlbG9nTW9kYWwiLCJ1cGRhdGVBbGxNb2R1bGVzIiwibW9kdWxlVW5pcXVlSWQiLCJkYXRhIiwicmVsZWFzZUlkIiwibW9kYWwiLCJjbG9zYWJsZSIsIm9uU2hvdyIsIm1vZHVsZU5hbWUiLCJ0aGVGb3JtIiwiZmluZCIsInRleHQiLCIkaW5zdGFsbGVkTW9kdWxlUm93IiwibGVuZ3RoIiwiaW5zdGFsbGVkVmVyc2lvbiIsIm5ld1ZlcnNpb24iLCJtYXJrZXRwbGFjZSIsInZlcnNpb25Db21wYXJlIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXh0X1VwZGF0ZU1vZHVsZVRpdGxlIiwiaHRtbCIsImV4dF9Nb2R1bGVVcGRhdGVEZXNjcmlwdGlvbiIsImV4dF9Eb3duZ3JhZGVNb2R1bGVUaXRsZSIsImV4dF9Nb2R1bGVEb3duZ3JhZGVEZXNjcmlwdGlvbiIsImV4dF9JbnN0YWxsTW9kdWxlVGl0bGUiLCJleHRfTW9kdWxlSW5zdGFsbERlc2NyaXB0aW9uIiwib25EZW55IiwicmVtb3ZlQ2xhc3MiLCJvbkFwcHJvdmUiLCJydW5TaW5nbGVJbnN0YWxsIiwiJG1vZGFsIiwiJGluc3RhbGxlZFJvdyIsIlN0cmluZyIsImZpcnN0IiwiY2xvbmUiLCJjaGlsZHJlbiIsInJlbW92ZSIsImVuZCIsInJlc2V0Q2hhbmdlbG9nTW9kYWwiLCJteUdlbiIsImhhc0NsYXNzIiwiTW9kdWxlc0FQSSIsImdldE1vZHVsZUluZm8iLCJ1bmlxaWQiLCJyZXBvRGF0YSIsInN1Y2Nlc3MiLCJBcnJheSIsImlzQXJyYXkiLCJyZWxlYXNlcyIsInNob3dDaGFuZ2Vsb2dFcnJvciIsIm5ld2VyUmVsZWFzZXMiLCJmaWx0ZXJOZXdlclJlbGVhc2VzIiwibGF0ZXN0VmVyc2lvbiIsInZlcnNpb24iLCJpbnRybyIsImZvcm1hdFN0cmluZyIsImV4dF9VcGRhdGVDaGFuZ2Vsb2dJbnRybyIsIm5hbWUiLCJmcm9tIiwidG8iLCJyZW5kZXJDaGFuZ2Vsb2dNb2RhbCIsInNsaWNlIiwiYWRkQ2xhc3MiLCJwYXJhbXMiLCJjaGFubmVsSWQiLCJpbnN0YWxsU3RhdHVzTG9vcFdvcmtlciIsIiRtb2R1bGVCdXR0b25zIiwic3RhcnRXYXRjaCIsImluc3RhbGxGcm9tUmVwbyIsInJlc3BvbnNlIiwiY29uc29sZSIsImRlYnVnIiwicmVzdWx0IiwiYW5pbWF0ZSIsInNjcm9sbFRvcCIsIm9mZnNldCIsInRvcCIsIndhdGNoZG9nIiwic3RvcCIsInJlc2V0QnV0dG9uVmlldyIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwibWVzc2FnZXMiLCJleHRfSW5zdGFsbGF0aW9uRXJyb3IiLCJvcGVuVXBkYXRlQWxsTW9kdWxlc01vZGFsIiwidW5pcXVlTW9kdWxlc0ZvclVwZGF0ZSIsIlNldCIsImVhY2giLCJfIiwiYnV0dG9uIiwiYWRkIiwibW9kdWxlc0ZvclVwZGF0ZSIsImV4dF9VcGRhdGVBbGxNb2R1bGVzVGl0bGUiLCJzZWxlY3RlZCIsImNvbGxlY3RTZWxlY3RlZE1vZHVsZXMiLCJydW5VcGRhdGVBbGwiLCJmZXRjaGVkIiwicGVuZGluZyIsImFueVN1Y2Nlc3MiLCJmb3JFYWNoIiwiJGJ0biIsInB1c2giLCJlcnJvciIsInNvcnQiLCJhIiwiYiIsImxvY2FsZUNvbXBhcmUiLCJyZW5kZXJNdWx0aVNlbGVjdE1vZGFsIiwiZXh0X1VwZGF0ZUFsbE1vZHVsZXNDaGFuZ2Vsb2dJbnRybyIsIiRib3hlcyIsImVsIiwic3RhcnRCYXRjaFVwZGF0ZSIsInVwZGF0ZUFsbCIsInJlc2V0QmF0Y2hVcGRhdGUiLCJzaG93IiwiZW1wdHkiLCJpbnRyb1RleHQiLCJlbnRyaWVzIiwiZW50cnkiLCJyZW5kZXJFbnRyeVJlbGVhc2VzIiwibmV3ZXN0IiwidmVyc2lvbkluZm8iLCJlc2NhcGVIdG1sIiwiJGJvZHkiLCIkYWNjb3JkaW9uIiwiYWNjb3JkaW9uIiwiZXhjbHVzaXZlIiwic3RvcFByb3BhZ2F0aW9uIiwiY2hlY2tib3giLCIkYXBwcm92ZSIsInJlZnJlc2hBcHByb3ZlU3RhdGUiLCJhbnlDaGVja2VkIiwiZXh0X0ZhaWxlZFRvTG9hZENoYW5nZWxvZyIsImV4dF9Ob0NoYW5nZWxvZ0F2YWlsYWJsZSIsInJlbGVhc2UiLCJyZWxlYXNlRGF0ZSIsImNyZWF0ZWQiLCJzcGxpdCIsImNoYW5nZUxvZ1RleHQiLCJmb3JtYXRDaGFuZ2Vsb2dUZXh0IiwiY2hhbmdlbG9nIiwiZXh0X0luc3RhbGxNb2R1bGVSZWxlYXNlVGFnIiwiZXh0X0Zyb21EYXRlIiwicmF3IiwidW5kZWZpbmVkIiwiZXNjYXBlZCIsIm5ld2VyIiwiZmlsdGVyIiwidGVtcGxhdGUiLCJyZXBsYWNlbWVudHMiLCJtYXAiLCJtYXRjaCIsImtleSIsIk9iamVjdCIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5IiwiY2FsbCIsInZhbHVlIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBTUEsb0JBQW9CLEdBQUc7QUFFekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsVUFBVSxFQUFFQyxnQkFBZ0IsQ0FBQ0MsT0FBakIsQ0FBeUIsT0FBekIsRUFBa0MsRUFBbEMsQ0FOYTs7QUFRekI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxvQkFBb0IsRUFBRSxJQWJHOztBQWV6QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLGlCQUFpQixFQUFFLElBcEJNOztBQXNCekI7QUFDSjtBQUNBO0FBQ0E7QUFDSUMsRUFBQUEsdUJBQXVCLEVBQUUsSUExQkE7O0FBNEJ6QjtBQUNKO0FBQ0E7QUFDQTtBQUNJQyxFQUFBQSxxQkFBcUIsRUFBRSxJQWhDRTs7QUFrQ3pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFlBQVksRUFBRSxDQXpDVzs7QUE0Q3pCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lDLEVBQUFBLFVBaER5Qix3QkFnRFo7QUFDVFQsSUFBQUEsb0JBQW9CLENBQUNJLG9CQUFyQixHQUE0Q00sQ0FBQyxDQUFDLDRCQUFELENBQTdDO0FBQ0FWLElBQUFBLG9CQUFvQixDQUFDSyxpQkFBckIsR0FBeUNLLENBQUMsQ0FBQyw0QkFBRCxDQUExQztBQUNBVixJQUFBQSxvQkFBb0IsQ0FBQ00sdUJBQXJCLEdBQStDSSxDQUFDLENBQUMscUJBQUQsQ0FBaEQ7QUFDQVYsSUFBQUEsb0JBQW9CLENBQUNPLHFCQUFyQixHQUE2Q0csQ0FBQyxDQUFDLHlCQUFELENBQTlDO0FBRUFWLElBQUFBLG9CQUFvQixDQUFDVyxzQkFBckI7QUFDQVgsSUFBQUEsb0JBQW9CLENBQUNLLGlCQUFyQixDQUF1Q08sSUFBdkM7QUFDQVosSUFBQUEsb0JBQW9CLENBQUNJLG9CQUFyQixDQUEwQ1EsSUFBMUMsR0FSUyxDQVF5QztBQUNyRCxHQXpEd0I7O0FBMkR6QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0lELEVBQUFBLHNCQWhFeUIsb0NBZ0VBO0FBQ3JCO0FBQ0FELElBQUFBLENBQUMsQ0FBQ0csUUFBRCxDQUFELENBQVlDLEVBQVosQ0FBZSxPQUFmLEVBQXdCLFlBQXhCLEVBQXNDLFVBQUNDLENBQUQsRUFBTztBQUN6Q0EsTUFBQUEsQ0FBQyxDQUFDQyxjQUFGO0FBQ0EsVUFBTUMsY0FBYyxHQUFHUCxDQUFDLENBQUNLLENBQUMsQ0FBQ0csTUFBSCxDQUFELENBQVlDLE9BQVosQ0FBb0IsVUFBcEIsQ0FBdkI7O0FBQ0EsVUFBSUMsZ0JBQWdCLENBQUNDLElBQWpCLE9BQTRCLEVBQWhDLEVBQW9DO0FBQ2hDQyxRQUFBQSxNQUFNLENBQUNDLFFBQVAsYUFBcUJDLGFBQXJCO0FBQ0gsT0FGRCxNQUVPO0FBQ0h4QixRQUFBQSxvQkFBb0IsQ0FBQ3lCLHNCQUFyQixDQUE0Q1IsY0FBNUM7QUFDSDtBQUNKLEtBUkQsRUFGcUIsQ0FZckI7O0FBQ0FQLElBQUFBLENBQUMsQ0FBQ0csUUFBRCxDQUFELENBQVlDLEVBQVosQ0FBZSxPQUFmLEVBQXdCLFVBQXhCLEVBQW9DLFVBQUNDLENBQUQsRUFBTztBQUN2Q0EsTUFBQUEsQ0FBQyxDQUFDQyxjQUFGO0FBQ0EsVUFBTUMsY0FBYyxHQUFHUCxDQUFDLENBQUNLLENBQUMsQ0FBQ0csTUFBSCxDQUFELENBQVlDLE9BQVosQ0FBb0IsVUFBcEIsQ0FBdkI7O0FBQ0EsVUFBSUMsZ0JBQWdCLENBQUNDLElBQWpCLE9BQTRCLEVBQWhDLEVBQW9DO0FBQ2hDQyxRQUFBQSxNQUFNLENBQUNDLFFBQVAsYUFBcUJDLGFBQXJCO0FBQ0gsT0FGRCxNQUVPO0FBQ0h4QixRQUFBQSxvQkFBb0IsQ0FBQzBCLHdCQUFyQixDQUE4Q1QsY0FBOUM7QUFDSDtBQUNKLEtBUkQ7QUFVQWpCLElBQUFBLG9CQUFvQixDQUFDSSxvQkFBckIsQ0FBMENVLEVBQTFDLENBQTZDLE9BQTdDLEVBQXNEZCxvQkFBb0IsQ0FBQzJCLGdCQUEzRTtBQUNILEdBeEZ3Qjs7QUEwRnpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJRixFQUFBQSxzQkFoR3lCLGtDQWdHRlIsY0FoR0UsRUFnR2M7QUFDbkMsUUFBTVcsY0FBYyxHQUFHWCxjQUFjLENBQUNZLElBQWYsQ0FBb0IsUUFBcEIsQ0FBdkI7QUFDQSxRQUFNQyxTQUFTLEdBQUdiLGNBQWMsQ0FBQ1ksSUFBZixDQUFvQixXQUFwQixDQUFsQjtBQUNBN0IsSUFBQUEsb0JBQW9CLENBQUNNLHVCQUFyQixDQUNLeUIsS0FETCxDQUNXO0FBQ0hDLE1BQUFBLFFBQVEsRUFBRSxLQURQO0FBRUhDLE1BQUFBLE1BQU0sRUFBRSxrQkFBTTtBQUNWLFlBQU1DLFVBQVUsR0FBR2pCLGNBQWMsQ0FBQ0UsT0FBZixDQUF1QixJQUF2QixFQUE2QlUsSUFBN0IsQ0FBa0MsTUFBbEMsQ0FBbkI7QUFDQSxZQUFNTSxPQUFPLEdBQUluQyxvQkFBb0IsQ0FBQ00sdUJBQXRDO0FBQ0E2QixRQUFBQSxPQUFPLENBQUNDLElBQVIsQ0FBYSxrQkFBYixFQUFpQ0MsSUFBakMsQ0FBc0NILFVBQXRDO0FBRUEsWUFBTUksbUJBQW1CLEdBQUc1QixDQUFDLGlDQUEwQmtCLGNBQTFCLE9BQTdCOztBQUNBLFlBQUlVLG1CQUFtQixDQUFDQyxNQUFwQixHQUEyQixDQUEvQixFQUFpQztBQUFBOztBQUM3QixjQUFNQyxnQkFBZ0IsR0FBR0YsbUJBQW1CLENBQUNULElBQXBCLENBQXlCLFNBQXpCLENBQXpCO0FBQ0EsY0FBTVksVUFBVSwyQkFBR3hCLGNBQWMsQ0FBQ1ksSUFBZixDQUFvQixTQUFwQixDQUFILHVFQUFtQ1csZ0JBQW5EOztBQUNBLGNBQUlFLFdBQVcsQ0FBQ0MsY0FBWixDQUEyQkYsVUFBM0IsRUFBdUNELGdCQUF2QyxJQUF5RCxDQUE3RCxFQUErRDtBQUMzREwsWUFBQUEsT0FBTyxDQUFDQyxJQUFSLENBQWEsYUFBYixFQUE0QkMsSUFBNUIsQ0FBaUNPLGVBQWUsQ0FBQ0MscUJBQWpEO0FBQ0FWLFlBQUFBLE9BQU8sQ0FBQ0MsSUFBUixDQUFhLGlCQUFiLEVBQWdDVSxJQUFoQyxDQUFxQ0YsZUFBZSxDQUFDRywyQkFBckQ7QUFDSCxXQUhELE1BR087QUFDSFosWUFBQUEsT0FBTyxDQUFDQyxJQUFSLENBQWEsYUFBYixFQUE0QkMsSUFBNUIsQ0FBaUNPLGVBQWUsQ0FBQ0ksd0JBQWpEO0FBQ0FiLFlBQUFBLE9BQU8sQ0FBQ0MsSUFBUixDQUFhLGlCQUFiLEVBQWdDVSxJQUFoQyxDQUFxQ0YsZUFBZSxDQUFDSyw4QkFBckQ7QUFDSDtBQUNKLFNBVkQsTUFVTztBQUNIZCxVQUFBQSxPQUFPLENBQUNDLElBQVIsQ0FBYSxhQUFiLEVBQTRCQyxJQUE1QixDQUFpQ08sZUFBZSxDQUFDTSxzQkFBakQ7QUFDQWYsVUFBQUEsT0FBTyxDQUFDQyxJQUFSLENBQWEsaUJBQWIsRUFBZ0NVLElBQWhDLENBQXFDRixlQUFlLENBQUNPLDRCQUFyRDtBQUNIO0FBQ0osT0F0QkU7QUF1QkhDLE1BQUFBLE1BQU0sRUFBRSxrQkFBTTtBQUNWMUMsUUFBQUEsQ0FBQyxDQUFDLFVBQUQsQ0FBRCxDQUFjMkMsV0FBZCxDQUEwQixVQUExQjtBQUNBLGVBQU8sSUFBUDtBQUNILE9BMUJFO0FBMkJIQyxNQUFBQSxTQUFTLEVBQUUscUJBQU07QUFDYnRELFFBQUFBLG9CQUFvQixDQUFDdUQsZ0JBQXJCLENBQXNDM0IsY0FBdEMsRUFBc0RFLFNBQXREO0FBQ0EsZUFBTyxJQUFQO0FBQ0g7QUE5QkUsS0FEWCxFQWlDS0MsS0FqQ0wsQ0FpQ1csTUFqQ1g7QUFrQ0gsR0FySXdCOztBQXVJekI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSUwsRUFBQUEsd0JBOUl5QixvQ0E4SUFULGNBOUlBLEVBOElnQjtBQUNyQyxRQUFNVyxjQUFjLEdBQUdYLGNBQWMsQ0FBQ1ksSUFBZixDQUFvQixRQUFwQixDQUF2QjtBQUNBLFFBQU1DLFNBQVMsR0FBR2IsY0FBYyxDQUFDWSxJQUFmLENBQW9CLFdBQXBCLENBQWxCO0FBQ0EsUUFBTTJCLE1BQU0sR0FBR3hELG9CQUFvQixDQUFDTyxxQkFBcEM7QUFDQSxRQUFNa0QsYUFBYSxHQUFHL0MsQ0FBQyxpQ0FBMEJrQixjQUExQixPQUF2QjtBQUNBLFFBQU1ZLGdCQUFnQixHQUFHaUIsYUFBYSxDQUFDbEIsTUFBZCxHQUF1QixDQUF2QixHQUEyQm1CLE1BQU0sQ0FBQ0QsYUFBYSxDQUFDNUIsSUFBZCxDQUFtQixTQUFuQixLQUFpQyxFQUFsQyxDQUFqQyxHQUF5RSxFQUFsRztBQUNBLFFBQU1LLFVBQVUsR0FBR2pCLGNBQWMsQ0FBQ0UsT0FBZixDQUF1QixJQUF2QixFQUE2QlUsSUFBN0IsQ0FBa0MsTUFBbEMsS0FDWjRCLGFBQWEsQ0FBQ3JCLElBQWQsQ0FBbUIsMEJBQW5CLEVBQStDdUIsS0FBL0MsR0FBdURDLEtBQXZELEdBQStEQyxRQUEvRCxHQUEwRUMsTUFBMUUsR0FBbUZDLEdBQW5GLEdBQXlGMUIsSUFBekYsR0FBZ0doQixJQUFoRyxFQURZLElBRVpPLGNBRlA7QUFJQTVCLElBQUFBLG9CQUFvQixDQUFDZ0UsbUJBQXJCLENBQXlDUixNQUF6QztBQUNBQSxJQUFBQSxNQUFNLENBQUNwQixJQUFQLENBQVksYUFBWixFQUEyQkMsSUFBM0IsQ0FBZ0NPLGVBQWUsQ0FBQ0MscUJBQWhEO0FBQ0FXLElBQUFBLE1BQU0sQ0FBQ3BCLElBQVAsQ0FBWSxrQkFBWixFQUFnQ0MsSUFBaEMsQ0FBcUNILFVBQXJDO0FBRUFsQyxJQUFBQSxvQkFBb0IsQ0FBQ1EsWUFBckIsSUFBcUMsQ0FBckM7QUFDQSxRQUFNeUQsS0FBSyxHQUFHakUsb0JBQW9CLENBQUNRLFlBQW5DO0FBRUFnRCxJQUFBQSxNQUFNLENBQUN6QixLQUFQLENBQWE7QUFDVEMsTUFBQUEsUUFBUSxFQUFFLEtBREQ7QUFFVG9CLE1BQUFBLE1BQU0sRUFBRSxrQkFBTTtBQUNWMUMsUUFBQUEsQ0FBQyxDQUFDLFVBQUQsQ0FBRCxDQUFjMkMsV0FBZCxDQUEwQixVQUExQjtBQUNBLGVBQU8sSUFBUDtBQUNILE9BTFE7QUFNVEMsTUFBQUEsU0FBUyxFQUFFLHFCQUFNO0FBQ2IsWUFBSUUsTUFBTSxDQUFDcEIsSUFBUCxDQUFZLGlCQUFaLEVBQStCOEIsUUFBL0IsQ0FBd0MsVUFBeEMsQ0FBSixFQUF5RDtBQUNyRCxpQkFBTyxLQUFQO0FBQ0g7O0FBQ0RsRSxRQUFBQSxvQkFBb0IsQ0FBQ3VELGdCQUFyQixDQUFzQzNCLGNBQXRDLEVBQXNERSxTQUF0RDtBQUNBLGVBQU8sSUFBUDtBQUNIO0FBWlEsS0FBYixFQWFHQyxLQWJILENBYVMsTUFiVDtBQWVBb0MsSUFBQUEsVUFBVSxDQUFDQyxhQUFYLENBQXlCO0FBQUVDLE1BQUFBLE1BQU0sRUFBRXpDO0FBQVYsS0FBekIsRUFBcUQsVUFBQzBDLFFBQUQsRUFBV0MsT0FBWCxFQUF1QjtBQUN4RSxVQUFJTixLQUFLLEtBQUtqRSxvQkFBb0IsQ0FBQ1EsWUFBbkMsRUFBaUQ7QUFDN0MsZUFENkMsQ0FDckM7QUFDWDs7QUFDRCxVQUFJLENBQUMrRCxPQUFELElBQVksQ0FBQ0QsUUFBYixJQUF5QixDQUFDRSxLQUFLLENBQUNDLE9BQU4sQ0FBY0gsUUFBUSxDQUFDSSxRQUF2QixDQUE5QixFQUFnRTtBQUM1RDFFLFFBQUFBLG9CQUFvQixDQUFDMkUsa0JBQXJCLENBQXdDbkIsTUFBeEM7QUFDQTtBQUNIOztBQUNELFVBQU1vQixhQUFhLEdBQUc1RSxvQkFBb0IsQ0FBQzZFLG1CQUFyQixDQUF5Q1AsUUFBUSxDQUFDSSxRQUFsRCxFQUE0RGxDLGdCQUE1RCxDQUF0QjtBQUNBLFVBQU1zQyxhQUFhLEdBQUdGLGFBQWEsQ0FBQ3JDLE1BQWQsR0FBdUIsQ0FBdkIsR0FBMkJxQyxhQUFhLENBQUMsQ0FBRCxDQUFiLENBQWlCRyxPQUE1QyxHQUF1RFQsUUFBUSxDQUFDSSxRQUFULENBQWtCLENBQWxCLEtBQXdCSixRQUFRLENBQUNJLFFBQVQsQ0FBa0IsQ0FBbEIsRUFBcUJLLE9BQTlDLElBQTBELEVBQXRJO0FBQ0EsVUFBTUMsS0FBSyxHQUFHaEYsb0JBQW9CLENBQUNpRixZQUFyQixDQUNWckMsZUFBZSxDQUFDc0Msd0JBRE4sRUFFVjtBQUFFQyxRQUFBQSxJQUFJLEVBQUVqRCxVQUFSO0FBQW9Ca0QsUUFBQUEsSUFBSSxFQUFFNUMsZ0JBQTFCO0FBQTRDNkMsUUFBQUEsRUFBRSxFQUFFUDtBQUFoRCxPQUZVLENBQWQ7QUFJQTlFLE1BQUFBLG9CQUFvQixDQUFDc0Ysb0JBQXJCLENBQTBDOUIsTUFBMUMsRUFBa0R3QixLQUFsRCxFQUF5RCxDQUFDO0FBQ3RERyxRQUFBQSxJQUFJLEVBQUVqRCxVQURnRDtBQUV0RHdDLFFBQUFBLFFBQVEsRUFBRUUsYUFBYSxDQUFDckMsTUFBZCxHQUF1QixDQUF2QixHQUEyQnFDLGFBQTNCLEdBQTJDTixRQUFRLENBQUNJLFFBQVQsQ0FBa0JhLEtBQWxCLENBQXdCLENBQXhCLEVBQTJCLENBQTNCO0FBRkMsT0FBRCxDQUF6RDtBQUlILEtBbEJEO0FBbUJILEdBak13Qjs7QUFtTXpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0loQyxFQUFBQSxnQkF2TXlCLDRCQXVNUjNCLGNBdk1RLEVBdU1RRSxTQXZNUixFQXVNbUI7QUFDeENwQixJQUFBQSxDQUFDLENBQUMsVUFBRCxDQUFELENBQWM4RSxRQUFkLENBQXVCLFVBQXZCO0FBRUEsUUFBTUMsTUFBTSxHQUFHO0FBQ1hwQixNQUFBQSxNQUFNLEVBQUV6QyxjQURHO0FBRVhFLE1BQUFBLFNBQVMsRUFBRUEsU0FGQTtBQUdYNEQsTUFBQUEsU0FBUyxFQUFFQyx1QkFBdUIsQ0FBQ0Q7QUFIeEIsS0FBZjtBQU1BaEYsSUFBQUEsQ0FBQyxrQkFBVytFLE1BQU0sQ0FBQ3BCLE1BQWxCLEVBQUQsQ0FBNkJ0QyxLQUE3QixDQUFtQyxNQUFuQztBQUNBLFFBQU02RCxjQUFjLEdBQUdsRixDQUFDLHlCQUFrQitFLE1BQU0sQ0FBQ3BCLE1BQXpCLE9BQXhCO0FBRUF1QixJQUFBQSxjQUFjLENBQUN2QyxXQUFmLENBQTJCLFVBQTNCO0FBQ0F1QyxJQUFBQSxjQUFjLENBQUN4RCxJQUFmLENBQW9CLEdBQXBCLEVBQ0tpQixXQURMLENBQ2lCLFVBRGpCLEVBRUtBLFdBRkwsQ0FFaUIsTUFGakIsRUFHS21DLFFBSEwsQ0FHYyxpQkFIZDtBQUtBOUUsSUFBQUEsQ0FBQyxDQUFDLHlCQUFELENBQUQsQ0FBNkJvRCxNQUE3QjtBQUNBcEQsSUFBQUEsQ0FBQyxDQUFDLFVBQUQsQ0FBRCxDQUFjMkMsV0FBZCxDQUEwQixPQUExQjtBQUVBc0MsSUFBQUEsdUJBQXVCLENBQUNFLFVBQXhCLENBQW1DSixNQUFNLENBQUNwQixNQUExQztBQUNBRixJQUFBQSxVQUFVLENBQUMyQixlQUFYLENBQTJCTCxNQUEzQixFQUFtQyxVQUFDTSxRQUFELEVBQWM7QUFDN0NDLE1BQUFBLE9BQU8sQ0FBQ0MsS0FBUixDQUFjRixRQUFkOztBQUNBLFVBQUlBLFFBQVEsQ0FBQ0csTUFBVCxLQUFvQixJQUF4QixFQUE4QjtBQUMxQnhGLFFBQUFBLENBQUMsQ0FBQyxZQUFELENBQUQsQ0FBZ0J5RixPQUFoQixDQUF3QjtBQUNwQkMsVUFBQUEsU0FBUyxFQUFFcEcsb0JBQW9CLENBQUNLLGlCQUFyQixDQUF1Q2dHLE1BQXZDLEdBQWdEQyxHQUFoRCxHQUFzRDtBQUQ3QyxTQUF4QixFQUVHLElBRkg7QUFHSCxPQUpELE1BSU87QUFDSDtBQUNBWCxRQUFBQSx1QkFBdUIsQ0FBQ1ksUUFBeEIsQ0FBaUNDLElBQWpDO0FBQ0FiLFFBQUFBLHVCQUF1QixDQUFDYyxlQUF4QixDQUF3Q2IsY0FBYyxDQUFDekUsT0FBZixDQUF1QixJQUF2QixDQUF4QztBQUNBdUYsUUFBQUEsV0FBVyxDQUFDQyxlQUFaLENBQTRCWixRQUFRLENBQUNhLFFBQXJDLEVBQStDaEUsZUFBZSxDQUFDaUUscUJBQS9EO0FBQ0g7QUFDSixLQVpEO0FBYUgsR0ExT3dCOztBQTRPekI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0lsRixFQUFBQSxnQkFsUHlCLDRCQWtQUlosQ0FsUFEsRUFrUEw7QUFDaEJBLElBQUFBLENBQUMsQ0FBQ0MsY0FBRjtBQUNBLFFBQU1DLGNBQWMsR0FBR1AsQ0FBQyxDQUFDSyxDQUFDLENBQUNHLE1BQUgsQ0FBRCxDQUFZQyxPQUFaLENBQW9CLEdBQXBCLENBQXZCO0FBQ0FuQixJQUFBQSxvQkFBb0IsQ0FBQzhHLHlCQUFyQixDQUErQzdGLGNBQS9DO0FBQ0gsR0F0UHdCOztBQXdQekI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSTZGLEVBQUFBLHlCQS9QeUIscUNBK1BDN0YsY0EvUEQsRUErUGlCO0FBQ3RDLFFBQU11QyxNQUFNLEdBQUd4RCxvQkFBb0IsQ0FBQ08scUJBQXBDO0FBQ0EsUUFBTXdHLHNCQUFzQixHQUFHLElBQUlDLEdBQUosRUFBL0I7QUFDQXRHLElBQUFBLENBQUMsQ0FBQyxVQUFELENBQUQsQ0FBY3VHLElBQWQsQ0FBbUIsVUFBQ0MsQ0FBRCxFQUFJQyxNQUFKLEVBQWU7QUFDOUJKLE1BQUFBLHNCQUFzQixDQUFDSyxHQUF2QixDQUEyQjFHLENBQUMsQ0FBQ3lHLE1BQUQsQ0FBRCxDQUFVdEYsSUFBVixDQUFlLFFBQWYsQ0FBM0I7QUFDSCxLQUZEOztBQUdBLFFBQU13RixnQkFBZ0Isc0JBQU9OLHNCQUFQLENBQXRCOztBQUVBLFFBQUlNLGdCQUFnQixDQUFDOUUsTUFBakIsS0FBNEIsQ0FBaEMsRUFBbUM7QUFDL0I7QUFDSDs7QUFFRHZDLElBQUFBLG9CQUFvQixDQUFDZ0UsbUJBQXJCLENBQXlDUixNQUF6QztBQUNBQSxJQUFBQSxNQUFNLENBQUNwQixJQUFQLENBQVksYUFBWixFQUEyQkMsSUFBM0IsQ0FBZ0NPLGVBQWUsQ0FBQzBFLHlCQUFoRDtBQUNBOUQsSUFBQUEsTUFBTSxDQUFDcEIsSUFBUCxDQUFZLGtCQUFaLEVBQWdDQyxJQUFoQyxDQUFxQyxFQUFyQztBQUVBckMsSUFBQUEsb0JBQW9CLENBQUNRLFlBQXJCLElBQXFDLENBQXJDO0FBQ0EsUUFBTXlELEtBQUssR0FBR2pFLG9CQUFvQixDQUFDUSxZQUFuQztBQUVBZ0QsSUFBQUEsTUFBTSxDQUFDekIsS0FBUCxDQUFhO0FBQ1RDLE1BQUFBLFFBQVEsRUFBRSxLQUREO0FBRVRvQixNQUFBQSxNQUFNLEVBQUUsa0JBQU07QUFDVjFDLFFBQUFBLENBQUMsQ0FBQyxVQUFELENBQUQsQ0FBYzJDLFdBQWQsQ0FBMEIsVUFBMUI7QUFDQSxlQUFPLElBQVA7QUFDSCxPQUxRO0FBTVRDLE1BQUFBLFNBQVMsRUFBRSxxQkFBTTtBQUNiLFlBQUlFLE1BQU0sQ0FBQ3BCLElBQVAsQ0FBWSxpQkFBWixFQUErQjhCLFFBQS9CLENBQXdDLFVBQXhDLENBQUosRUFBeUQ7QUFDckQsaUJBQU8sS0FBUDtBQUNIOztBQUNELFlBQU1xRCxRQUFRLEdBQUd2SCxvQkFBb0IsQ0FBQ3dILHNCQUFyQixDQUE0Q2hFLE1BQTVDLENBQWpCOztBQUNBLFlBQUkrRCxRQUFRLENBQUNoRixNQUFULEtBQW9CLENBQXhCLEVBQTJCO0FBQ3ZCLGlCQUFPLEtBQVA7QUFDSDs7QUFDRHZDLFFBQUFBLG9CQUFvQixDQUFDeUgsWUFBckIsQ0FBa0N4RyxjQUFsQyxFQUFrRHNHLFFBQWxEO0FBQ0EsZUFBTyxJQUFQO0FBQ0g7QUFoQlEsS0FBYixFQWlCR3hGLEtBakJILENBaUJTLE1BakJUO0FBbUJBLFFBQU0yRixPQUFPLEdBQUcsRUFBaEI7QUFDQSxRQUFJQyxPQUFPLEdBQUdOLGdCQUFnQixDQUFDOUUsTUFBL0I7QUFDQSxRQUFJcUYsVUFBVSxHQUFHLEtBQWpCO0FBRUFQLElBQUFBLGdCQUFnQixDQUFDUSxPQUFqQixDQUF5QixVQUFDeEQsTUFBRCxFQUFZO0FBQ2pDLFVBQU1aLGFBQWEsR0FBRy9DLENBQUMsaUNBQTBCMkQsTUFBMUIsT0FBdkI7QUFDQSxVQUFNN0IsZ0JBQWdCLEdBQUdpQixhQUFhLENBQUNsQixNQUFkLEdBQXVCLENBQXZCLEdBQTJCbUIsTUFBTSxDQUFDRCxhQUFhLENBQUM1QixJQUFkLENBQW1CLFNBQW5CLEtBQWlDLEVBQWxDLENBQWpDLEdBQXlFLEVBQWxHO0FBQ0EsVUFBTWlHLElBQUksR0FBR3BILENBQUMsZ0NBQXlCMkQsTUFBekIsT0FBRCxDQUFxQ1YsS0FBckMsRUFBYjtBQUNBLFVBQU16QixVQUFVLEdBQUc0RixJQUFJLENBQUMzRyxPQUFMLENBQWEsSUFBYixFQUFtQlUsSUFBbkIsQ0FBd0IsTUFBeEIsS0FDWjRCLGFBQWEsQ0FBQ3JCLElBQWQsQ0FBbUIsMEJBQW5CLEVBQStDdUIsS0FBL0MsR0FBdURDLEtBQXZELEdBQStEQyxRQUEvRCxHQUEwRUMsTUFBMUUsR0FBbUZDLEdBQW5GLEdBQXlGMUIsSUFBekYsR0FBZ0doQixJQUFoRyxFQURZLElBRVpnRCxNQUZQO0FBSUFGLE1BQUFBLFVBQVUsQ0FBQ0MsYUFBWCxDQUF5QjtBQUFFQyxRQUFBQSxNQUFNLEVBQUVBO0FBQVYsT0FBekIsRUFBNkMsVUFBQ0MsUUFBRCxFQUFXQyxPQUFYLEVBQXVCO0FBQ2hFLFlBQUlOLEtBQUssS0FBS2pFLG9CQUFvQixDQUFDUSxZQUFuQyxFQUFpRDtBQUM3QyxpQkFENkMsQ0FDckM7QUFDWDs7QUFDRG1ILFFBQUFBLE9BQU8sSUFBSSxDQUFYOztBQUNBLFlBQUlwRCxPQUFPLElBQUlELFFBQVgsSUFBdUJFLEtBQUssQ0FBQ0MsT0FBTixDQUFjSCxRQUFRLENBQUNJLFFBQXZCLENBQTNCLEVBQTZEO0FBQ3pEa0QsVUFBQUEsVUFBVSxHQUFHLElBQWI7QUFDQSxjQUFNaEQsYUFBYSxHQUFHNUUsb0JBQW9CLENBQUM2RSxtQkFBckIsQ0FBeUNQLFFBQVEsQ0FBQ0ksUUFBbEQsRUFBNERsQyxnQkFBNUQsQ0FBdEI7QUFDQWtGLFVBQUFBLE9BQU8sQ0FBQ0ssSUFBUixDQUFhO0FBQ1QxRCxZQUFBQSxNQUFNLEVBQUVBLE1BREM7QUFFVGMsWUFBQUEsSUFBSSxFQUFFakQsVUFGRztBQUdUTSxZQUFBQSxnQkFBZ0IsRUFBRUEsZ0JBSFQ7QUFJVGtDLFlBQUFBLFFBQVEsRUFBRUUsYUFBYSxDQUFDckMsTUFBZCxHQUF1QixDQUF2QixHQUEyQnFDLGFBQTNCLEdBQTJDTixRQUFRLENBQUNJLFFBQVQsQ0FBa0JhLEtBQWxCLENBQXdCLENBQXhCLEVBQTJCLENBQTNCO0FBSjVDLFdBQWI7QUFNSCxTQVRELE1BU087QUFDSG1DLFVBQUFBLE9BQU8sQ0FBQ0ssSUFBUixDQUFhO0FBQ1QxRCxZQUFBQSxNQUFNLEVBQUVBLE1BREM7QUFFVGMsWUFBQUEsSUFBSSxFQUFFakQsVUFGRztBQUdUTSxZQUFBQSxnQkFBZ0IsRUFBRUEsZ0JBSFQ7QUFJVGtDLFlBQUFBLFFBQVEsRUFBRSxFQUpEO0FBS1RzRCxZQUFBQSxLQUFLLEVBQUU7QUFMRSxXQUFiO0FBT0g7O0FBRUQsWUFBSUwsT0FBTyxLQUFLLENBQWhCLEVBQW1CO0FBQ2YsY0FBSSxDQUFDQyxVQUFMLEVBQWlCO0FBQ2I1SCxZQUFBQSxvQkFBb0IsQ0FBQzJFLGtCQUFyQixDQUF3Q25CLE1BQXhDO0FBQ0E7QUFDSDs7QUFDRGtFLFVBQUFBLE9BQU8sQ0FBQ08sSUFBUixDQUFhLFVBQUNDLENBQUQsRUFBSUMsQ0FBSjtBQUFBLG1CQUFVRCxDQUFDLENBQUMvQyxJQUFGLENBQU9pRCxhQUFQLENBQXFCRCxDQUFDLENBQUNoRCxJQUF2QixDQUFWO0FBQUEsV0FBYjtBQUNBbkYsVUFBQUEsb0JBQW9CLENBQUNxSSxzQkFBckIsQ0FDSTdFLE1BREosRUFFSVosZUFBZSxDQUFDMEYsa0NBRnBCLEVBR0laLE9BSEo7QUFLSDtBQUNKLE9BcENEO0FBcUNILEtBN0NEO0FBOENILEdBdlZ3Qjs7QUF5VnpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0lGLEVBQUFBLHNCQTdWeUIsa0NBNlZGaEUsTUE3VkUsRUE2Vk07QUFDM0IsUUFBTStFLE1BQU0sR0FBRy9FLE1BQU0sQ0FBQ3BCLElBQVAsQ0FBWSx3REFBWixDQUFmOztBQUNBLFFBQUltRyxNQUFNLENBQUNoRyxNQUFQLEtBQWtCLENBQXRCLEVBQXlCO0FBQ3JCLGFBQU8sRUFBUDtBQUNIOztBQUNELFFBQU0yRCxNQUFNLEdBQUcsRUFBZjtBQUNBcUMsSUFBQUEsTUFBTSxDQUFDdEIsSUFBUCxDQUFZLFVBQUNDLENBQUQsRUFBSXNCLEVBQUosRUFBVztBQUNuQixVQUFNbkUsTUFBTSxHQUFHM0QsQ0FBQyxDQUFDOEgsRUFBRCxDQUFELENBQU1ySCxPQUFOLENBQWMseUJBQWQsRUFBeUNVLElBQXpDLENBQThDLFFBQTlDLENBQWY7O0FBQ0EsVUFBSXdDLE1BQUosRUFBWTtBQUNSNkIsUUFBQUEsTUFBTSxDQUFDNkIsSUFBUCxDQUFZMUQsTUFBWjtBQUNIO0FBQ0osS0FMRDtBQU1BLFdBQU82QixNQUFQO0FBQ0gsR0ExV3dCOztBQTRXekI7QUFDSjtBQUNBO0FBQ0l1QixFQUFBQSxZQS9XeUIsd0JBK1daeEcsY0EvV1ksRUErV0lvRyxnQkEvV0osRUErV3NCO0FBQzNDM0csSUFBQUEsQ0FBQyxDQUFDLFVBQUQsQ0FBRCxDQUFjOEUsUUFBZCxDQUF1QixVQUF2QjtBQUNBdkUsSUFBQUEsY0FBYyxDQUFDb0MsV0FBZixDQUEyQixVQUEzQjtBQUNBcEMsSUFBQUEsY0FBYyxDQUFDbUIsSUFBZixDQUFvQixRQUFwQixFQUNLaUIsV0FETCxDQUNpQixNQURqQixFQUVLbUMsUUFGTCxDQUVjLGlCQUZkO0FBSUFHLElBQUFBLHVCQUF1QixDQUFDOEMsZ0JBQXhCLENBQXlDcEIsZ0JBQXpDO0FBQ0EsUUFBTTVCLE1BQU0sR0FBRztBQUNYQyxNQUFBQSxTQUFTLEVBQUVDLHVCQUF1QixDQUFDRCxTQUR4QjtBQUVYMkIsTUFBQUEsZ0JBQWdCLEVBQUVBO0FBRlAsS0FBZjtBQUlBbEQsSUFBQUEsVUFBVSxDQUFDdUUsU0FBWCxDQUFxQmpELE1BQXJCLEVBQTZCLFVBQUNNLFFBQUQsRUFBV3hCLE9BQVgsRUFBdUI7QUFDaER5QixNQUFBQSxPQUFPLENBQUNDLEtBQVIsQ0FBY0YsUUFBZDs7QUFDQSxVQUFJeEIsT0FBTyxLQUFLLEtBQVosSUFBcUJ3QixRQUFRLENBQUNHLE1BQVQsS0FBb0IsS0FBN0MsRUFBb0Q7QUFDaERQLFFBQUFBLHVCQUF1QixDQUFDZ0QsZ0JBQXhCO0FBQ0EzSSxRQUFBQSxvQkFBb0IsQ0FBQ0ssaUJBQXJCLENBQXVDTyxJQUF2QztBQUNBRixRQUFBQSxDQUFDLENBQUMsVUFBRCxDQUFELENBQWMyQyxXQUFkLENBQTBCLFVBQTFCO0FBQ0FwQyxRQUFBQSxjQUFjLENBQUNtQixJQUFmLENBQW9CLFFBQXBCLEVBQ0tpQixXQURMLENBQ2lCLGlCQURqQixFQUVLbUMsUUFGTCxDQUVjLE1BRmQ7QUFHSDtBQUNKLEtBVkQ7QUFZQTlFLElBQUFBLENBQUMsQ0FBQyx5QkFBRCxDQUFELENBQTZCb0QsTUFBN0I7QUFDQXBELElBQUFBLENBQUMsQ0FBQyxVQUFELENBQUQsQ0FBYzJDLFdBQWQsQ0FBMEIsT0FBMUI7QUFDSCxHQXpZd0I7O0FBMll6QjtBQUNKO0FBQ0E7QUFDSVcsRUFBQUEsbUJBOVl5QiwrQkE4WUxSLE1BOVlLLEVBOFlHO0FBQ3hCQSxJQUFBQSxNQUFNLENBQUNwQixJQUFQLENBQVksbUJBQVosRUFBaUN3RyxJQUFqQztBQUNBcEYsSUFBQUEsTUFBTSxDQUFDcEIsSUFBUCxDQUFZLGtCQUFaLEVBQWdDeEIsSUFBaEMsR0FBdUNpSSxLQUF2QztBQUNBckYsSUFBQUEsTUFBTSxDQUFDcEIsSUFBUCxDQUFZLGlCQUFaLEVBQStCeEIsSUFBL0IsR0FBc0NpSSxLQUF0QztBQUNBckYsSUFBQUEsTUFBTSxDQUFDcEIsSUFBUCxDQUFZLGtCQUFaLEVBQWdDeEIsSUFBaEM7QUFDQTRDLElBQUFBLE1BQU0sQ0FBQ3BCLElBQVAsQ0FBWSxpQkFBWixFQUErQm9ELFFBQS9CLENBQXdDLFVBQXhDO0FBQ0gsR0FwWndCOztBQXNaekI7QUFDSjtBQUNBO0FBQ0liLEVBQUFBLGtCQXpaeUIsOEJBeVpObkIsTUF6Wk0sRUF5WkU7QUFDdkJBLElBQUFBLE1BQU0sQ0FBQ3BCLElBQVAsQ0FBWSxtQkFBWixFQUFpQ3hCLElBQWpDO0FBQ0E0QyxJQUFBQSxNQUFNLENBQUNwQixJQUFQLENBQVksa0JBQVosRUFBZ0N3RyxJQUFoQztBQUNBcEYsSUFBQUEsTUFBTSxDQUFDcEIsSUFBUCxDQUFZLGlCQUFaLEVBQStCb0QsUUFBL0IsQ0FBd0MsVUFBeEM7QUFDSCxHQTdad0I7O0FBK1p6QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNJRixFQUFBQSxvQkF0YXlCLGdDQXNhSjlCLE1BdGFJLEVBc2FJc0YsU0F0YUosRUFzYWVDLE9BdGFmLEVBc2F3QjtBQUM3Q3ZGLElBQUFBLE1BQU0sQ0FBQ3BCLElBQVAsQ0FBWSxtQkFBWixFQUFpQ3hCLElBQWpDOztBQUVBLFFBQUlrSSxTQUFKLEVBQWU7QUFDWHRGLE1BQUFBLE1BQU0sQ0FBQ3BCLElBQVAsQ0FBWSxrQkFBWixFQUFnQ1UsSUFBaEMsQ0FBcUNnRyxTQUFyQyxFQUFnREYsSUFBaEQ7QUFDSDs7QUFFRCxRQUFJOUYsSUFBSSxHQUFHLEVBQVg7QUFDQWlHLElBQUFBLE9BQU8sQ0FBQ2xCLE9BQVIsQ0FBZ0IsVUFBQ21CLEtBQUQsRUFBVztBQUN2QmxHLE1BQUFBLElBQUksSUFBSTlDLG9CQUFvQixDQUFDaUosbUJBQXJCLENBQXlDRCxLQUF6QyxDQUFSO0FBQ0gsS0FGRDtBQUlBeEYsSUFBQUEsTUFBTSxDQUFDcEIsSUFBUCxDQUFZLGlCQUFaLEVBQStCVSxJQUEvQixDQUFvQ0EsSUFBcEMsRUFBMEM4RixJQUExQztBQUNBcEYsSUFBQUEsTUFBTSxDQUFDcEIsSUFBUCxDQUFZLGlCQUFaLEVBQStCaUIsV0FBL0IsQ0FBMkMsVUFBM0M7QUFDQUcsSUFBQUEsTUFBTSxDQUFDekIsS0FBUCxDQUFhLFNBQWI7QUFDSCxHQXJid0I7O0FBdWJ6QjtBQUNKO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDSXNHLEVBQUFBLHNCQWhjeUIsa0NBZ2NGN0UsTUFoY0UsRUFnY01zRixTQWhjTixFQWdjaUJDLE9BaGNqQixFQWdjMEI7QUFDL0N2RixJQUFBQSxNQUFNLENBQUNwQixJQUFQLENBQVksbUJBQVosRUFBaUN4QixJQUFqQzs7QUFFQSxRQUFJa0ksU0FBSixFQUFlO0FBQ1h0RixNQUFBQSxNQUFNLENBQUNwQixJQUFQLENBQVksa0JBQVosRUFBZ0NVLElBQWhDLENBQXFDZ0csU0FBckMsRUFBZ0RGLElBQWhEO0FBQ0g7O0FBRUQsUUFBSTlGLElBQUksR0FBRyxrRUFBWDtBQUNBaUcsSUFBQUEsT0FBTyxDQUFDbEIsT0FBUixDQUFnQixVQUFDbUIsS0FBRCxFQUFXO0FBQ3ZCLFVBQU1FLE1BQU0sR0FBR0YsS0FBSyxDQUFDdEUsUUFBTixJQUFrQnNFLEtBQUssQ0FBQ3RFLFFBQU4sQ0FBZSxDQUFmLENBQWxCLElBQXVDc0UsS0FBSyxDQUFDdEUsUUFBTixDQUFlLENBQWYsRUFBa0JLLE9BQXpELEdBQ1RpRSxLQUFLLENBQUN0RSxRQUFOLENBQWUsQ0FBZixFQUFrQkssT0FEVCxHQUVULEVBRk47QUFHQSxVQUFJb0UsV0FBVyxHQUFHLEVBQWxCOztBQUNBLFVBQUlILEtBQUssQ0FBQ3hHLGdCQUFOLElBQTBCMEcsTUFBOUIsRUFBc0M7QUFDbENDLFFBQUFBLFdBQVcsaURBQXdDbkosb0JBQW9CLENBQUNvSixVQUFyQixDQUFnQ0osS0FBSyxDQUFDeEcsZ0JBQXRDLENBQXhDLHFCQUFxR3hDLG9CQUFvQixDQUFDb0osVUFBckIsQ0FBZ0NGLE1BQWhDLENBQXJHLFlBQVg7QUFDSCxPQUZELE1BRU8sSUFBSUEsTUFBSixFQUFZO0FBQ2ZDLFFBQUFBLFdBQVcsaURBQXdDbkosb0JBQW9CLENBQUNvSixVQUFyQixDQUFnQ0YsTUFBaEMsQ0FBeEMsWUFBWDtBQUNIOztBQUVEcEcsTUFBQUEsSUFBSSxJQUFJLHFCQUFSO0FBQ0FBLE1BQUFBLElBQUksSUFBSSwrQkFBUjtBQUNBQSxNQUFBQSxJQUFJLDhFQUFvRTlDLG9CQUFvQixDQUFDb0osVUFBckIsQ0FBZ0NKLEtBQUssQ0FBQzNFLE1BQXRDLENBQXBFLFFBQUo7QUFDQXZCLE1BQUFBLElBQUksSUFBSSxtQ0FBUjtBQUNBQSxNQUFBQSxJQUFJLHdCQUFpQjlDLG9CQUFvQixDQUFDb0osVUFBckIsQ0FBZ0NKLEtBQUssQ0FBQzdELElBQXRDLENBQWpCLGlCQUFtRWdFLFdBQW5FLGFBQUo7QUFDQXJHLE1BQUFBLElBQUksSUFBSSxRQUFSO0FBQ0FBLE1BQUFBLElBQUksSUFBSSxRQUFSO0FBQ0FBLE1BQUFBLElBQUksSUFBSSx1QkFBUjtBQUNBQSxNQUFBQSxJQUFJLElBQUk5QyxvQkFBb0IsQ0FBQ2lKLG1CQUFyQixDQUF5Q0QsS0FBekMsQ0FBUjtBQUNBbEcsTUFBQUEsSUFBSSxJQUFJLFFBQVI7QUFDSCxLQXJCRDtBQXNCQUEsSUFBQUEsSUFBSSxJQUFJLFFBQVI7QUFFQSxRQUFNdUcsS0FBSyxHQUFHN0YsTUFBTSxDQUFDcEIsSUFBUCxDQUFZLGlCQUFaLENBQWQ7QUFDQWlILElBQUFBLEtBQUssQ0FBQ3ZHLElBQU4sQ0FBV0EsSUFBWCxFQUFpQjhGLElBQWpCO0FBRUEsUUFBTVUsVUFBVSxHQUFHRCxLQUFLLENBQUNqSCxJQUFOLENBQVcsMkJBQVgsQ0FBbkI7QUFDQWtILElBQUFBLFVBQVUsQ0FBQ0MsU0FBWCxDQUFxQjtBQUFFQyxNQUFBQSxTQUFTLEVBQUU7QUFBYixLQUFyQixFQXBDK0MsQ0FzQy9DOztBQUNBRixJQUFBQSxVQUFVLENBQUNsSCxJQUFYLENBQWdCLHlCQUFoQixFQUEyQ3RCLEVBQTNDLENBQThDLE9BQTlDLEVBQXVELFVBQUNDLENBQUQsRUFBTztBQUMxREEsTUFBQUEsQ0FBQyxDQUFDMEksZUFBRjtBQUNILEtBRkQ7QUFHQUgsSUFBQUEsVUFBVSxDQUFDbEgsSUFBWCxDQUFnQixxQ0FBaEIsRUFBdURzSCxRQUF2RDtBQUVBLFFBQU1DLFFBQVEsR0FBR25HLE1BQU0sQ0FBQ3BCLElBQVAsQ0FBWSxpQkFBWixDQUFqQjs7QUFDQSxRQUFNd0gsbUJBQW1CLEdBQUcsU0FBdEJBLG1CQUFzQixHQUFNO0FBQzlCLFVBQU1DLFVBQVUsR0FBR1AsVUFBVSxDQUFDbEgsSUFBWCxDQUFnQix3REFBaEIsRUFBMEVHLE1BQTFFLEdBQW1GLENBQXRHOztBQUNBLFVBQUlzSCxVQUFKLEVBQWdCO0FBQ1pGLFFBQUFBLFFBQVEsQ0FBQ3RHLFdBQVQsQ0FBcUIsVUFBckI7QUFDSCxPQUZELE1BRU87QUFDSHNHLFFBQUFBLFFBQVEsQ0FBQ25FLFFBQVQsQ0FBa0IsVUFBbEI7QUFDSDtBQUNKLEtBUEQ7O0FBUUE4RCxJQUFBQSxVQUFVLENBQUNsSCxJQUFYLENBQWdCLGdEQUFoQixFQUFrRXRCLEVBQWxFLENBQXFFLFFBQXJFLEVBQStFOEksbUJBQS9FO0FBQ0FBLElBQUFBLG1CQUFtQjtBQUVuQnBHLElBQUFBLE1BQU0sQ0FBQ3pCLEtBQVAsQ0FBYSxTQUFiO0FBQ0gsR0F6ZndCOztBQTJmekI7QUFDSjtBQUNBO0FBQ0E7QUFDSWtILEVBQUFBLG1CQS9meUIsK0JBK2ZMRCxLQS9mSyxFQStmRTtBQUN2QixRQUFJQSxLQUFLLENBQUNoQixLQUFWLEVBQWlCO0FBQ2IseURBQTBDcEYsZUFBZSxDQUFDa0gseUJBQTFEO0FBQ0g7O0FBQ0QsUUFBSSxDQUFDZCxLQUFLLENBQUN0RSxRQUFQLElBQW1Cc0UsS0FBSyxDQUFDdEUsUUFBTixDQUFlbkMsTUFBZixLQUEwQixDQUFqRCxFQUFvRDtBQUNoRCwwREFBMkNLLGVBQWUsQ0FBQ21ILHdCQUEzRDtBQUNIOztBQUNELFFBQUlqSCxJQUFJLEdBQUcsRUFBWDtBQUNBa0csSUFBQUEsS0FBSyxDQUFDdEUsUUFBTixDQUFlbUQsT0FBZixDQUF1QixVQUFDbUMsT0FBRCxFQUFhO0FBQ2hDLFVBQU1DLFdBQVcsR0FBR0QsT0FBTyxDQUFDRSxPQUFSLEdBQWtCeEcsTUFBTSxDQUFDc0csT0FBTyxDQUFDRSxPQUFULENBQU4sQ0FBd0JDLEtBQXhCLENBQThCLEdBQTlCLEVBQW1DLENBQW5DLENBQWxCLEdBQTBELEVBQTlFO0FBQ0EsVUFBTUMsYUFBYSxHQUFHcEssb0JBQW9CLENBQUNxSyxtQkFBckIsQ0FBeUNMLE9BQU8sQ0FBQ00sU0FBakQsQ0FBdEI7QUFDQXhILE1BQUFBLElBQUksSUFBSSxtQ0FBUjtBQUNBQSxNQUFBQSxJQUFJLG1EQUEwQ0YsZUFBZSxDQUFDMkgsMkJBQTFELGVBQTBGdkssb0JBQW9CLENBQUNvSixVQUFyQixDQUFnQ1ksT0FBTyxDQUFDakYsT0FBeEMsQ0FBMUYsQ0FBSjs7QUFDQSxVQUFJa0YsV0FBSixFQUFpQjtBQUNibkgsUUFBQUEsSUFBSSxlQUFRRixlQUFlLENBQUM0SCxZQUF4QixjQUF3Q3hLLG9CQUFvQixDQUFDb0osVUFBckIsQ0FBZ0NhLFdBQWhDLENBQXhDLENBQUo7QUFDSDs7QUFDRG5ILE1BQUFBLElBQUksSUFBSSxRQUFSO0FBQ0FBLE1BQUFBLElBQUksaURBQXdDc0gsYUFBeEMsZUFBSjtBQUNBdEgsTUFBQUEsSUFBSSxJQUFJLFFBQVI7QUFDSCxLQVhEO0FBWUEsV0FBT0EsSUFBUDtBQUNILEdBcGhCd0I7O0FBc2hCekI7QUFDSjtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0l1SCxFQUFBQSxtQkE1aEJ5QiwrQkE0aEJMSSxHQTVoQkssRUE0aEJBO0FBQ3JCLFFBQUlBLEdBQUcsS0FBSyxJQUFSLElBQWdCQSxHQUFHLEtBQUtDLFNBQTVCLEVBQXVDO0FBQ25DLDBCQUFhOUgsZUFBZSxDQUFDbUgsd0JBQTdCO0FBQ0g7O0FBQ0QsUUFBTTFILElBQUksR0FBR3FCLE1BQU0sQ0FBQytHLEdBQUQsQ0FBbkI7O0FBQ0EsUUFBSXBJLElBQUksS0FBSyxFQUFULElBQWVBLElBQUksS0FBSyxNQUF4QixJQUFrQ0EsSUFBSSxLQUFLLFdBQS9DLEVBQTREO0FBQ3hELDBCQUFhTyxlQUFlLENBQUNtSCx3QkFBN0I7QUFDSDs7QUFDRCxRQUFNWSxPQUFPLEdBQUczSyxvQkFBb0IsQ0FBQ29KLFVBQXJCLENBQWdDL0csSUFBaEMsQ0FBaEI7O0FBQ0EsUUFBSXNJLE9BQU8sQ0FBQ3RKLElBQVIsT0FBbUIsRUFBdkIsRUFBMkI7QUFDdkIsMEJBQWF1QixlQUFlLENBQUNtSCx3QkFBN0I7QUFDSDs7QUFDRCxXQUFPWSxPQUFPLENBQUN4SyxPQUFSLENBQWdCLEtBQWhCLEVBQXVCLE1BQXZCLENBQVA7QUFDSCxHQXppQndCOztBQTJpQnpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0kwRSxFQUFBQSxtQkEvaUJ5QiwrQkEraUJMSCxRQS9pQkssRUEraUJLbEMsZ0JBL2lCTCxFQStpQnVCO0FBQzVDLFFBQUksQ0FBQ0EsZ0JBQUwsRUFBdUI7QUFDbkIsYUFBT2tDLFFBQVEsQ0FBQ2EsS0FBVCxFQUFQO0FBQ0g7O0FBQ0QsUUFBTXFGLEtBQUssR0FBR2xHLFFBQVEsQ0FBQ21HLE1BQVQsQ0FBZ0IsVUFBQ2IsT0FBRCxFQUFhO0FBQ3ZDLFVBQUksQ0FBQ0EsT0FBRCxJQUFZLENBQUNBLE9BQU8sQ0FBQ2pGLE9BQXpCLEVBQWtDO0FBQzlCLGVBQU8sS0FBUDtBQUNIOztBQUNELGFBQU9yQyxXQUFXLENBQUNDLGNBQVosQ0FBMkJlLE1BQU0sQ0FBQ3NHLE9BQU8sQ0FBQ2pGLE9BQVQsQ0FBakMsRUFBb0RyQixNQUFNLENBQUNsQixnQkFBRCxDQUExRCxJQUFnRixDQUF2RjtBQUNILEtBTGEsQ0FBZDtBQU1Bb0ksSUFBQUEsS0FBSyxDQUFDM0MsSUFBTixDQUFXLFVBQUNDLENBQUQsRUFBSUMsQ0FBSjtBQUFBLGFBQVV6RixXQUFXLENBQUNDLGNBQVosQ0FBMkJlLE1BQU0sQ0FBQ3lFLENBQUMsQ0FBQ3BELE9BQUgsQ0FBakMsRUFBOENyQixNQUFNLENBQUN3RSxDQUFDLENBQUNuRCxPQUFILENBQXBELENBQVY7QUFBQSxLQUFYO0FBQ0EsV0FBTzZGLEtBQVA7QUFDSCxHQTNqQndCOztBQTZqQnpCO0FBQ0o7QUFDQTtBQUNBO0FBQ0E7QUFDSTNGLEVBQUFBLFlBbGtCeUIsd0JBa2tCWjZGLFFBbGtCWSxFQWtrQkZDLFlBbGtCRSxFQWtrQlk7QUFDakMsUUFBSSxDQUFDRCxRQUFMLEVBQWU7QUFDWCxhQUFPLEVBQVA7QUFDSDs7QUFDRCxRQUFNRSxHQUFHLEdBQUdELFlBQVksSUFBSSxFQUE1QjtBQUNBLFdBQU9ELFFBQVEsQ0FBQzNLLE9BQVQsQ0FBaUIsb0JBQWpCLEVBQXVDLFVBQUM4SyxLQUFELEVBQVFDLEdBQVIsRUFBZ0I7QUFDMUQsVUFBSSxDQUFDQyxNQUFNLENBQUNDLFNBQVAsQ0FBaUJDLGNBQWpCLENBQWdDQyxJQUFoQyxDQUFxQ04sR0FBckMsRUFBMENFLEdBQTFDLENBQUwsRUFBcUQ7QUFDakQsZUFBT0QsS0FBUDtBQUNIOztBQUNELFVBQU1SLEdBQUcsR0FBR08sR0FBRyxDQUFDRSxHQUFELENBQWY7QUFDQSxhQUFPbEwsb0JBQW9CLENBQUNvSixVQUFyQixDQUFnQzFGLE1BQU0sQ0FBQytHLEdBQUcsS0FBS0MsU0FBUixJQUFxQkQsR0FBRyxLQUFLLElBQTdCLEdBQW9DQSxHQUFwQyxHQUEwQyxFQUEzQyxDQUF0QyxDQUFQO0FBQ0gsS0FOTSxDQUFQO0FBT0gsR0E5a0J3Qjs7QUFnbEJ6QjtBQUNKO0FBQ0E7QUFDSXJCLEVBQUFBLFVBbmxCeUIsc0JBbWxCZG1DLEtBbmxCYyxFQW1sQlA7QUFDZCxXQUFPN0gsTUFBTSxDQUFDNkgsS0FBRCxDQUFOLENBQ0ZwTCxPQURFLENBQ00sSUFETixFQUNZLE9BRFosRUFFRkEsT0FGRSxDQUVNLElBRk4sRUFFWSxNQUZaLEVBR0ZBLE9BSEUsQ0FHTSxJQUhOLEVBR1ksTUFIWixFQUlGQSxPQUpFLENBSU0sSUFKTixFQUlZLFFBSlosRUFLRkEsT0FMRSxDQUtNLElBTE4sRUFLWSxPQUxaLENBQVA7QUFNSDtBQTFsQndCLENBQTdCLEMsQ0E4bEJBO0FBQ0E7O0FBQ0FPLENBQUMsQ0FBQ0csUUFBRCxDQUFELENBQVkySyxLQUFaLENBQWtCLFlBQU07QUFDcEJ4TCxFQUFBQSxvQkFBb0IsQ0FBQ1MsVUFBckI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjQgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIFBieEFwaSwgZ2xvYmFsUEJYTGljZW5zZSwgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSwgZ2xvYmFsUEJYVmVyc2lvbiwgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIsIG1hcmtldHBsYWNlLCBNb2R1bGVzQVBJICovXG5cbi8qKlxuICogTWFuYWdlcyB0aGUgaW5zdGFsbGF0aW9uIGFuZCB1cGRhdGluZyBvZiBQQlggZXh0ZW5zaW9uIG1vZHVsZXMgZnJvbSBhIHJlcG9zaXRvcnkuXG4gKiBJdCBwcm92aWRlcyBmdW5jdGlvbmFsaXR5IHRvIHVwZGF0ZSBpbmRpdmlkdWFsIG1vZHVsZXMgb3IgYWxsIG1vZHVsZXMgYXQgb25jZSxcbiAqIGFuZCBkaXNwbGF5cyBwcm9ncmVzcyBpbmZvcm1hdGlvbiB0byB0aGUgdXNlci5cbiAqXG4gKiBAY2xhc3MgaW5zdGFsbGF0aW9uRnJvbVJlcG9cbiAqIEBtZW1iZXJvZiBtb2R1bGU6UGJ4RXh0ZW5zaW9uTW9kdWxlc1xuICovXG5jb25zdCBpbnN0YWxsYXRpb25Gcm9tUmVwbyA9IHtcblxuICAgIC8qKlxuICAgICAqIFRoZSBjdXJyZW50IHZlcnNpb24gb2YgdGhlIFBCWCBzeXN0ZW0sIHdpdGggZGV2ZWxvcG1lbnQgdmVyc2lvbiBpZGVudGlmaWVycyByZW1vdmVkLlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgcGJ4VmVyc2lvbjogZ2xvYmFsUEJYVmVyc2lvbi5yZXBsYWNlKC8tZGV2L2ksICcnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBidXR0b24gcmVzcG9uc2libGUgZm9yIHVwZGF0aW5nIGFsbCBpbnN0YWxsZWQgbW9kdWxlcy5cbiAgICAgKiBSZXNvbHZlZCBpbiBpbml0aWFsaXplKCkg4oCUIG11c3Qgbm90IGNhbGwgJCgpIGF0IG1vZHVsZS1sb2FkIHRpbWUuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkYnRuVXBkYXRlQWxsTW9kdWxlczogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBibG9jayB0aGF0IGNvbnRhaW5zIHRoZSBwcm9ncmVzcyBiYXIsIHVzZWQgdG8gaW5kaWNhdGVcbiAgICAgKiB0aGUgcHJvZ3Jlc3Mgb2YgbW9kdWxlIGluc3RhbGxhdGlvbiBvciB1cGRhdGluZyBwcm9jZXNzZXMuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkcHJvZ3Jlc3NCYXJCbG9jazogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBpbnN0YWxsYXRpb24gbW9kdWxlIG1vZGFsIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkaW5zdGFsbE1vZHVsZU1vZGFsRm9ybTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB1cGRhdGUgY2hhbmdlbG9nIGNvbmZpcm1hdGlvbiBtb2RhbC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR1cGRhdGVDaGFuZ2Vsb2dNb2RhbDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIE1vbm90b25pY2FsbHkgaW5jcmVhc2luZyB0b2tlbiBidW1wZWQgZWFjaCB0aW1lIHRoZSBjaGFuZ2Vsb2cgbW9kYWwgaXMgb3BlbmVkLlxuICAgICAqIEluLWZsaWdodCBgZ2V0TW9kdWxlSW5mb2AgY2FsbGJhY2tzIGNvbXBhcmUgYWdhaW5zdCB0aGlzIHRva2VuIGFuZCBiYWlsIG91dCBpZlxuICAgICAqIGEgbmV3ZXIgbW9kYWwgb3BlbmluZyBoYXMgc3VwZXJzZWRlZCB0aGVpciByZXF1ZXN0IOKAlCBwcmV2ZW50cyBzdGFsZSByZXBvc2l0b3J5XG4gICAgICogcmVzcG9uc2VzIGZyb20gb3ZlcndyaXRpbmcgdGhlIGJvZHkgb2YgYSBuZXdseS1zaG93biBtb2RhbC5cbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAqL1xuICAgIGNoYW5nZWxvZ0dlbjogMCxcblxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGluc3RhbGxhdGlvbkZyb21SZXBvIG1vZHVsZS4gU2V0cyB1cCBldmVudCBoYW5kbGVycyBmb3IgVUkgaW50ZXJhY3Rpb25zXG4gICAgICogYW5kIGhpZGVzIFVJIGVsZW1lbnRzIHRoYXQgYXJlIG5vdCBpbW1lZGlhdGVseSBuZWVkZWQuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgaW5zdGFsbGF0aW9uRnJvbVJlcG8uJGJ0blVwZGF0ZUFsbE1vZHVsZXMgPSAkKCcjdXBkYXRlLWFsbC1tb2R1bGVzLWJ1dHRvbicpO1xuICAgICAgICBpbnN0YWxsYXRpb25Gcm9tUmVwby4kcHJvZ3Jlc3NCYXJCbG9jayA9ICQoJyN1cGxvYWQtcHJvZ3Jlc3MtYmFyLWJsb2NrJyk7XG4gICAgICAgIGluc3RhbGxhdGlvbkZyb21SZXBvLiRpbnN0YWxsTW9kdWxlTW9kYWxGb3JtID0gJCgnI2luc3RhbGwtbW9kYWwtZm9ybScpO1xuICAgICAgICBpbnN0YWxsYXRpb25Gcm9tUmVwby4kdXBkYXRlQ2hhbmdlbG9nTW9kYWwgPSAkKCcjdXBkYXRlLWNoYW5nZWxvZy1tb2RhbCcpO1xuXG4gICAgICAgIGluc3RhbGxhdGlvbkZyb21SZXBvLmluaXRpYWxpemVCdXR0b25FdmVudHMoKTtcbiAgICAgICAgaW5zdGFsbGF0aW9uRnJvbVJlcG8uJHByb2dyZXNzQmFyQmxvY2suaGlkZSgpO1xuICAgICAgICBpbnN0YWxsYXRpb25Gcm9tUmVwby4kYnRuVXBkYXRlQWxsTW9kdWxlcy5oaWRlKCk7IC8vIFVudGlsIGF0IGxlYXN0IG9uZSB1cGRhdGUgYXZhaWxhYmxlXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNldHMgdXAgZXZlbnQgaGFuZGxlcnMgZm9yIGJ1dHRvbiBjbGlja3Mgd2l0aGluIHRoZSBtb2R1bGUuXG4gICAgICogVXBkYXRlIGJ1dHRvbnMgZ28gdGhyb3VnaCBhIGNoYW5nZWxvZyBjb25maXJtYXRpb24gbW9kYWw7IGluc3RhbGwvZG93bmdyYWRlIGJ1dHRvbnNcbiAgICAgKiBnbyB0aHJvdWdoIHRoZSBvcmlnaW5hbCBzaW1wbGUgY29uZmlybWF0aW9uIG1vZGFsLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVCdXR0b25FdmVudHMoKSB7XG4gICAgICAgIC8vIE5ldyBpbnN0YWxsIC8gZXhwbGljaXQgdmVyc2lvbiBkb3dubG9hZCAocGVyLXJlbGVhc2UgaW4gZGV0YWlsIHBvcHVwKSAtPiBzaW1wbGUgbW9kYWxcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJ2EuZG93bmxvYWQnLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgJGN1cnJlbnRCdXR0b24gPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhLmJ1dHRvbicpO1xuICAgICAgICAgICAgaWYgKGdsb2JhbFBCWExpY2Vuc2UudHJpbSgpID09PSAnJykge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9cGJ4LWV4dGVuc2lvbi1tb2R1bGVzL2luZGV4Iy9saWNlbnNpbmdgO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbnN0YWxsYXRpb25Gcm9tUmVwby5vcGVuSW5zdGFsbE1vZHVsZU1vZGFsKCRjdXJyZW50QnV0dG9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2luZ2xlLW1vZHVsZSB1cGRhdGUgLT4gY2hhbmdlbG9nIGNvbmZpcm1hdGlvbiBtb2RhbCAoY3VycmVudCAtPiBsYXRlc3QpXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICdhLnVwZGF0ZScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkY3VycmVudEJ1dHRvbiA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2EuYnV0dG9uJyk7XG4gICAgICAgICAgICBpZiAoZ2xvYmFsUEJYTGljZW5zZS50cmltKCkgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1wYngtZXh0ZW5zaW9uLW1vZHVsZXMvaW5kZXgjL2xpY2Vuc2luZ2A7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGluc3RhbGxhdGlvbkZyb21SZXBvLm9wZW5VcGRhdGVDaGFuZ2Vsb2dNb2RhbCgkY3VycmVudEJ1dHRvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGluc3RhbGxhdGlvbkZyb21SZXBvLiRidG5VcGRhdGVBbGxNb2R1bGVzLm9uKCdjbGljaycsIGluc3RhbGxhdGlvbkZyb21SZXBvLnVwZGF0ZUFsbE1vZHVsZXMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBPcGVucyB0aGUgbW9kYWwgZm9ybSBmb3IgaW5zdGFsbGluZyBhIG1vZHVsZS4gVGhpcyBtb2RhbCBwcm92aWRlcyB0aGUgdXNlciB3aXRoIGluZm9ybWF0aW9uXG4gICAgICogYWJvdXQgdGhlIG1vZHVsZSB0aGV5IGFyZSBhYm91dCB0byBpbnN0YWxsLCBhbmQgY29uZmlybXMgdGhlaXIgYWN0aW9uLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRjdXJyZW50QnV0dG9uIC0gVGhlIGpRdWVyeSBvYmplY3Qgb2YgdGhlIGJ1dHRvbiB0aGF0IHdhcyBjbGlja2VkIHRvIHRyaWdnZXIgdGhpcyBtb2RhbC5cbiAgICAgKi9cbiAgICBvcGVuSW5zdGFsbE1vZHVsZU1vZGFsKCRjdXJyZW50QnV0dG9uKSB7XG4gICAgICAgIGNvbnN0IG1vZHVsZVVuaXF1ZUlkID0gJGN1cnJlbnRCdXR0b24uZGF0YSgndW5pcWlkJyk7XG4gICAgICAgIGNvbnN0IHJlbGVhc2VJZCA9ICRjdXJyZW50QnV0dG9uLmRhdGEoJ3JlbGVhc2VpZCcpO1xuICAgICAgICBpbnN0YWxsYXRpb25Gcm9tUmVwby4kaW5zdGFsbE1vZHVsZU1vZGFsRm9ybVxuICAgICAgICAgICAgLm1vZGFsKHtcbiAgICAgICAgICAgICAgICBjbG9zYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgb25TaG93OiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vZHVsZU5hbWUgPSAkY3VycmVudEJ1dHRvbi5jbG9zZXN0KCd0cicpLmRhdGEoJ25hbWUnKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGhlRm9ybSA9ICBpbnN0YWxsYXRpb25Gcm9tUmVwby4kaW5zdGFsbE1vZHVsZU1vZGFsRm9ybTtcbiAgICAgICAgICAgICAgICAgICAgdGhlRm9ybS5maW5kKCdzcGFuLm1vZHVsZS1uYW1lJykudGV4dChtb2R1bGVOYW1lKTtcblxuICAgICAgICAgICAgICAgICAgICBjb25zdCAkaW5zdGFsbGVkTW9kdWxlUm93ID0gJChgdHIubW9kdWxlLXJvd1tkYXRhLWlkPSR7bW9kdWxlVW5pcXVlSWR9XWApO1xuICAgICAgICAgICAgICAgICAgICBpZiAoJGluc3RhbGxlZE1vZHVsZVJvdy5sZW5ndGg+MCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpbnN0YWxsZWRWZXJzaW9uID0gJGluc3RhbGxlZE1vZHVsZVJvdy5kYXRhKCd2ZXJzaW9uJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdWZXJzaW9uID0gJGN1cnJlbnRCdXR0b24uZGF0YSgndmVyc2lvbicpPz9pbnN0YWxsZWRWZXJzaW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1hcmtldHBsYWNlLnZlcnNpb25Db21wYXJlKG5ld1ZlcnNpb24sIGluc3RhbGxlZFZlcnNpb24pPjApe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoZUZvcm0uZmluZCgnc3Bhbi5hY3Rpb24nKS50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfVXBkYXRlTW9kdWxlVGl0bGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoZUZvcm0uZmluZCgnZGl2LmRlc2NyaXB0aW9uJykuaHRtbChnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZVVwZGF0ZURlc2NyaXB0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlRm9ybS5maW5kKCdzcGFuLmFjdGlvbicpLnRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Eb3duZ3JhZGVNb2R1bGVUaXRsZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlRm9ybS5maW5kKCdkaXYuZGVzY3JpcHRpb24nKS5odG1sKGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlRG93bmdyYWRlRGVzY3JpcHRpb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhlRm9ybS5maW5kKCdzcGFuLmFjdGlvbicpLnRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9JbnN0YWxsTW9kdWxlVGl0bGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhlRm9ybS5maW5kKCdkaXYuZGVzY3JpcHRpb24nKS5odG1sKGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlSW5zdGFsbERlc2NyaXB0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25EZW55OiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25BcHByb3ZlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbGxhdGlvbkZyb21SZXBvLnJ1blNpbmdsZUluc3RhbGwobW9kdWxlVW5pcXVlSWQsIHJlbGVhc2VJZCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLm1vZGFsKCdzaG93Jyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIE9wZW5zIHRoZSBjaGFuZ2Vsb2cgY29uZmlybWF0aW9uIG1vZGFsIGZvciBhIHNpbmdsZS1tb2R1bGUgdXBkYXRlLiBGZXRjaGVzIHJlbGVhc2VcbiAgICAgKiBpbmZvIGZyb20gdGhlIHJlcG9zaXRvcnksIHJlbmRlcnMgYWdncmVnYXRlZCBjaGFuZ2Vsb2cgZnJvbSB0aGUgaW5zdGFsbGVkIHZlcnNpb25cbiAgICAgKiB1cCB0byB0aGUgbGF0ZXN0IHJlbGVhc2UsIGFuZCBsZXRzIHRoZSB1c2VyIGNvbmZpcm0gb3IgY2FuY2VsLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRjdXJyZW50QnV0dG9uIC0gVGhlIGNsaWNrZWQgVXBkYXRlIGJ1dHRvbi5cbiAgICAgKi9cbiAgICBvcGVuVXBkYXRlQ2hhbmdlbG9nTW9kYWwoJGN1cnJlbnRCdXR0b24pIHtcbiAgICAgICAgY29uc3QgbW9kdWxlVW5pcXVlSWQgPSAkY3VycmVudEJ1dHRvbi5kYXRhKCd1bmlxaWQnKTtcbiAgICAgICAgY29uc3QgcmVsZWFzZUlkID0gJGN1cnJlbnRCdXR0b24uZGF0YSgncmVsZWFzZWlkJyk7XG4gICAgICAgIGNvbnN0ICRtb2RhbCA9IGluc3RhbGxhdGlvbkZyb21SZXBvLiR1cGRhdGVDaGFuZ2Vsb2dNb2RhbDtcbiAgICAgICAgY29uc3QgJGluc3RhbGxlZFJvdyA9ICQoYHRyLm1vZHVsZS1yb3dbZGF0YS1pZD0ke21vZHVsZVVuaXF1ZUlkfV1gKTtcbiAgICAgICAgY29uc3QgaW5zdGFsbGVkVmVyc2lvbiA9ICRpbnN0YWxsZWRSb3cubGVuZ3RoID4gMCA/IFN0cmluZygkaW5zdGFsbGVkUm93LmRhdGEoJ3ZlcnNpb24nKSB8fCAnJykgOiAnJztcbiAgICAgICAgY29uc3QgbW9kdWxlTmFtZSA9ICRjdXJyZW50QnV0dG9uLmNsb3Nlc3QoJ3RyJykuZGF0YSgnbmFtZScpXG4gICAgICAgICAgICB8fCAkaW5zdGFsbGVkUm93LmZpbmQoJ3RkLnNob3ctZGV0YWlscy1vbi1jbGljaycpLmZpcnN0KCkuY2xvbmUoKS5jaGlsZHJlbigpLnJlbW92ZSgpLmVuZCgpLnRleHQoKS50cmltKClcbiAgICAgICAgICAgIHx8IG1vZHVsZVVuaXF1ZUlkO1xuXG4gICAgICAgIGluc3RhbGxhdGlvbkZyb21SZXBvLnJlc2V0Q2hhbmdlbG9nTW9kYWwoJG1vZGFsKTtcbiAgICAgICAgJG1vZGFsLmZpbmQoJ3NwYW4uYWN0aW9uJykudGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X1VwZGF0ZU1vZHVsZVRpdGxlKTtcbiAgICAgICAgJG1vZGFsLmZpbmQoJ3NwYW4ubW9kdWxlLW5hbWUnKS50ZXh0KG1vZHVsZU5hbWUpO1xuXG4gICAgICAgIGluc3RhbGxhdGlvbkZyb21SZXBvLmNoYW5nZWxvZ0dlbiArPSAxO1xuICAgICAgICBjb25zdCBteUdlbiA9IGluc3RhbGxhdGlvbkZyb21SZXBvLmNoYW5nZWxvZ0dlbjtcblxuICAgICAgICAkbW9kYWwubW9kYWwoe1xuICAgICAgICAgICAgY2xvc2FibGU6IGZhbHNlLFxuICAgICAgICAgICAgb25EZW55OiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgJCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkFwcHJvdmU6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoJG1vZGFsLmZpbmQoJy5hcHByb3ZlLmJ1dHRvbicpLmhhc0NsYXNzKCdkaXNhYmxlZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaW5zdGFsbGF0aW9uRnJvbVJlcG8ucnVuU2luZ2xlSW5zdGFsbChtb2R1bGVVbmlxdWVJZCwgcmVsZWFzZUlkKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pLm1vZGFsKCdzaG93Jyk7XG5cbiAgICAgICAgTW9kdWxlc0FQSS5nZXRNb2R1bGVJbmZvKHsgdW5pcWlkOiBtb2R1bGVVbmlxdWVJZCB9LCAocmVwb0RhdGEsIHN1Y2Nlc3MpID0+IHtcbiAgICAgICAgICAgIGlmIChteUdlbiAhPT0gaW5zdGFsbGF0aW9uRnJvbVJlcG8uY2hhbmdlbG9nR2VuKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuOyAvLyBhIG5ld2VyIG1vZGFsIG9wZW5pbmcgc3VwZXJzZWRlZCB0aGlzIHJlcXVlc3RcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghc3VjY2VzcyB8fCAhcmVwb0RhdGEgfHwgIUFycmF5LmlzQXJyYXkocmVwb0RhdGEucmVsZWFzZXMpKSB7XG4gICAgICAgICAgICAgICAgaW5zdGFsbGF0aW9uRnJvbVJlcG8uc2hvd0NoYW5nZWxvZ0Vycm9yKCRtb2RhbCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgbmV3ZXJSZWxlYXNlcyA9IGluc3RhbGxhdGlvbkZyb21SZXBvLmZpbHRlck5ld2VyUmVsZWFzZXMocmVwb0RhdGEucmVsZWFzZXMsIGluc3RhbGxlZFZlcnNpb24pO1xuICAgICAgICAgICAgY29uc3QgbGF0ZXN0VmVyc2lvbiA9IG5ld2VyUmVsZWFzZXMubGVuZ3RoID4gMCA/IG5ld2VyUmVsZWFzZXNbMF0udmVyc2lvbiA6IChyZXBvRGF0YS5yZWxlYXNlc1swXSAmJiByZXBvRGF0YS5yZWxlYXNlc1swXS52ZXJzaW9uKSB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IGludHJvID0gaW5zdGFsbGF0aW9uRnJvbVJlcG8uZm9ybWF0U3RyaW5nKFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5leHRfVXBkYXRlQ2hhbmdlbG9nSW50cm8sXG4gICAgICAgICAgICAgICAgeyBuYW1lOiBtb2R1bGVOYW1lLCBmcm9tOiBpbnN0YWxsZWRWZXJzaW9uLCB0bzogbGF0ZXN0VmVyc2lvbiB9XG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgaW5zdGFsbGF0aW9uRnJvbVJlcG8ucmVuZGVyQ2hhbmdlbG9nTW9kYWwoJG1vZGFsLCBpbnRybywgW3tcbiAgICAgICAgICAgICAgICBuYW1lOiBtb2R1bGVOYW1lLFxuICAgICAgICAgICAgICAgIHJlbGVhc2VzOiBuZXdlclJlbGVhc2VzLmxlbmd0aCA+IDAgPyBuZXdlclJlbGVhc2VzIDogcmVwb0RhdGEucmVsZWFzZXMuc2xpY2UoMCwgMSksXG4gICAgICAgICAgICB9XSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSdW5zIHRoZSBhY3R1YWwgc2luZ2xlLW1vZHVsZSBpbnN0YWxsL3VwZGF0ZSBBUEkgY2FsbC4gRXh0cmFjdGVkIHNvIGJvdGggbW9kYWxzXG4gICAgICogKHNpbXBsZSBpbnN0YWxsIGFuZCBjaGFuZ2Vsb2cgY29uZmlybSkgY2FuIHNoYXJlIHRoZSBwb3N0LWNvbmZpcm0gbG9naWMuXG4gICAgICovXG4gICAgcnVuU2luZ2xlSW5zdGFsbChtb2R1bGVVbmlxdWVJZCwgcmVsZWFzZUlkKSB7XG4gICAgICAgICQoJ2EuYnV0dG9uJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cbiAgICAgICAgY29uc3QgcGFyYW1zID0ge1xuICAgICAgICAgICAgdW5pcWlkOiBtb2R1bGVVbmlxdWVJZCxcbiAgICAgICAgICAgIHJlbGVhc2VJZDogcmVsZWFzZUlkLFxuICAgICAgICAgICAgY2hhbm5lbElkOiBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5jaGFubmVsSWRcbiAgICAgICAgfTtcblxuICAgICAgICAkKGAjbW9kYWwtJHtwYXJhbXMudW5pcWlkfWApLm1vZGFsKCdoaWRlJyk7XG4gICAgICAgIGNvbnN0ICRtb2R1bGVCdXR0b25zID0gJChgYVtkYXRhLXVuaXFpZD0ke3BhcmFtcy51bmlxaWR9XWApO1xuXG4gICAgICAgICRtb2R1bGVCdXR0b25zLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAkbW9kdWxlQnV0dG9ucy5maW5kKCdpJylcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZG93bmxvYWQnKVxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdyZWRvJylcbiAgICAgICAgICAgIC5hZGRDbGFzcygnc3Bpbm5lciBsb2FkaW5nJyk7XG5cbiAgICAgICAgJCgndHIudGFibGUtZXJyb3ItbWVzc2FnZXMnKS5yZW1vdmUoKTtcbiAgICAgICAgJCgndHIuZXJyb3InKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcblxuICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5zdGFydFdhdGNoKHBhcmFtcy51bmlxaWQpO1xuICAgICAgICBNb2R1bGVzQVBJLmluc3RhbGxGcm9tUmVwbyhwYXJhbXMsIChyZXNwb25zZSkgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5kZWJ1ZyhyZXNwb25zZSk7XG4gICAgICAgICAgICBpZiAocmVzcG9uc2UucmVzdWx0ID09PSB0cnVlKSB7XG4gICAgICAgICAgICAgICAgJCgnaHRtbCwgYm9keScpLmFuaW1hdGUoe1xuICAgICAgICAgICAgICAgICAgICBzY3JvbGxUb3A6IGluc3RhbGxhdGlvbkZyb21SZXBvLiRwcm9ncmVzc0JhckJsb2NrLm9mZnNldCgpLnRvcCAtIDUwLFxuICAgICAgICAgICAgICAgIH0sIDIwMDApO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAvLyBDb21tYW5kIHJlamVjdGVkIG91dHJpZ2h0IOKAlCBubyBwb2ludCB3YWl0aW5nIGZvciB0aGUgd2F0Y2hkb2dcbiAgICAgICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci53YXRjaGRvZy5zdG9wKCk7XG4gICAgICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIucmVzZXRCdXR0b25WaWV3KCRtb2R1bGVCdXR0b25zLmNsb3Nlc3QoJ3RyJykpO1xuICAgICAgICAgICAgICAgIFVzZXJNZXNzYWdlLnNob3dNdWx0aVN0cmluZyhyZXNwb25zZS5tZXNzYWdlcywgZ2xvYmFsVHJhbnNsYXRlLmV4dF9JbnN0YWxsYXRpb25FcnJvcik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBJbml0aWF0ZXMgdGhlIHByb2Nlc3Mgb2YgdXBkYXRpbmcgYWxsIGluc3RhbGxlZCBtb2R1bGVzLiBUcmlnZ2VyZWQgYnkgdGhlIHVzZXJcbiAgICAgKiBjbGlja2luZyB0aGUgJ1VwZGF0ZSBBbGwnIGJ1dHRvbi5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7RXZlbnR9IGUgLSBUaGUgY2xpY2sgZXZlbnQgb2JqZWN0IGFzc29jaWF0ZWQgd2l0aCB0aGUgJ1VwZGF0ZSBBbGwnIGJ1dHRvbiBjbGljay5cbiAgICAgKi9cbiAgICB1cGRhdGVBbGxNb2R1bGVzKGUpIHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICBjb25zdCAkY3VycmVudEJ1dHRvbiA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2EnKTtcbiAgICAgICAgaW5zdGFsbGF0aW9uRnJvbVJlcG8ub3BlblVwZGF0ZUFsbE1vZHVsZXNNb2RhbCgkY3VycmVudEJ1dHRvbik7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIE9wZW5zIHRoZSBjaGFuZ2Vsb2cgY29uZmlybWF0aW9uIG1vZGFsIGZvciB0aGUgYnVsayB1cGRhdGUuIEZldGNoZXMgcmVsZWFzZSBpbmZvXG4gICAgICogZm9yIGV2ZXJ5IG1vZHVsZSB0aGF0IGhhcyBhbiBhdmFpbGFibGUgdXBkYXRlIGFuZCByZW5kZXJzIGFuIGFnZ3JlZ2F0ZWQgY2hhbmdlbG9nXG4gICAgICogKG9uZSBzZWN0aW9uIHBlciBtb2R1bGUpIGJlZm9yZSBhc2tpbmcgdGhlIHVzZXIgdG8gY29uZmlybS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSB7alF1ZXJ5fSAkY3VycmVudEJ1dHRvbiAtIFRoZSAnVXBkYXRlIEFsbCcgYnV0dG9uLlxuICAgICAqL1xuICAgIG9wZW5VcGRhdGVBbGxNb2R1bGVzTW9kYWwoJGN1cnJlbnRCdXR0b24pIHtcbiAgICAgICAgY29uc3QgJG1vZGFsID0gaW5zdGFsbGF0aW9uRnJvbVJlcG8uJHVwZGF0ZUNoYW5nZWxvZ01vZGFsO1xuICAgICAgICBjb25zdCB1bmlxdWVNb2R1bGVzRm9yVXBkYXRlID0gbmV3IFNldCgpO1xuICAgICAgICAkKCdhLnVwZGF0ZScpLmVhY2goKF8sIGJ1dHRvbikgPT4ge1xuICAgICAgICAgICAgdW5pcXVlTW9kdWxlc0ZvclVwZGF0ZS5hZGQoJChidXR0b24pLmRhdGEoJ3VuaXFpZCcpKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGNvbnN0IG1vZHVsZXNGb3JVcGRhdGUgPSBbLi4udW5pcXVlTW9kdWxlc0ZvclVwZGF0ZV07XG5cbiAgICAgICAgaWYgKG1vZHVsZXNGb3JVcGRhdGUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuICAgICAgICBpbnN0YWxsYXRpb25Gcm9tUmVwby5yZXNldENoYW5nZWxvZ01vZGFsKCRtb2RhbCk7XG4gICAgICAgICRtb2RhbC5maW5kKCdzcGFuLmFjdGlvbicpLnRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9VcGRhdGVBbGxNb2R1bGVzVGl0bGUpO1xuICAgICAgICAkbW9kYWwuZmluZCgnc3Bhbi5tb2R1bGUtbmFtZScpLnRleHQoJycpO1xuXG4gICAgICAgIGluc3RhbGxhdGlvbkZyb21SZXBvLmNoYW5nZWxvZ0dlbiArPSAxO1xuICAgICAgICBjb25zdCBteUdlbiA9IGluc3RhbGxhdGlvbkZyb21SZXBvLmNoYW5nZWxvZ0dlbjtcblxuICAgICAgICAkbW9kYWwubW9kYWwoe1xuICAgICAgICAgICAgY2xvc2FibGU6IGZhbHNlLFxuICAgICAgICAgICAgb25EZW55OiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgJCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkFwcHJvdmU6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoJG1vZGFsLmZpbmQoJy5hcHByb3ZlLmJ1dHRvbicpLmhhc0NsYXNzKCdkaXNhYmxlZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY29uc3Qgc2VsZWN0ZWQgPSBpbnN0YWxsYXRpb25Gcm9tUmVwby5jb2xsZWN0U2VsZWN0ZWRNb2R1bGVzKCRtb2RhbCk7XG4gICAgICAgICAgICAgICAgaWYgKHNlbGVjdGVkLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGluc3RhbGxhdGlvbkZyb21SZXBvLnJ1blVwZGF0ZUFsbCgkY3VycmVudEJ1dHRvbiwgc2VsZWN0ZWQpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgfSkubW9kYWwoJ3Nob3cnKTtcblxuICAgICAgICBjb25zdCBmZXRjaGVkID0gW107XG4gICAgICAgIGxldCBwZW5kaW5nID0gbW9kdWxlc0ZvclVwZGF0ZS5sZW5ndGg7XG4gICAgICAgIGxldCBhbnlTdWNjZXNzID0gZmFsc2U7XG5cbiAgICAgICAgbW9kdWxlc0ZvclVwZGF0ZS5mb3JFYWNoKCh1bmlxaWQpID0+IHtcbiAgICAgICAgICAgIGNvbnN0ICRpbnN0YWxsZWRSb3cgPSAkKGB0ci5tb2R1bGUtcm93W2RhdGEtaWQ9JHt1bmlxaWR9XWApO1xuICAgICAgICAgICAgY29uc3QgaW5zdGFsbGVkVmVyc2lvbiA9ICRpbnN0YWxsZWRSb3cubGVuZ3RoID4gMCA/IFN0cmluZygkaW5zdGFsbGVkUm93LmRhdGEoJ3ZlcnNpb24nKSB8fCAnJykgOiAnJztcbiAgICAgICAgICAgIGNvbnN0ICRidG4gPSAkKGBhLnVwZGF0ZVtkYXRhLXVuaXFpZD0ke3VuaXFpZH1dYCkuZmlyc3QoKTtcbiAgICAgICAgICAgIGNvbnN0IG1vZHVsZU5hbWUgPSAkYnRuLmNsb3Nlc3QoJ3RyJykuZGF0YSgnbmFtZScpXG4gICAgICAgICAgICAgICAgfHwgJGluc3RhbGxlZFJvdy5maW5kKCd0ZC5zaG93LWRldGFpbHMtb24tY2xpY2snKS5maXJzdCgpLmNsb25lKCkuY2hpbGRyZW4oKS5yZW1vdmUoKS5lbmQoKS50ZXh0KCkudHJpbSgpXG4gICAgICAgICAgICAgICAgfHwgdW5pcWlkO1xuXG4gICAgICAgICAgICBNb2R1bGVzQVBJLmdldE1vZHVsZUluZm8oeyB1bmlxaWQ6IHVuaXFpZCB9LCAocmVwb0RhdGEsIHN1Y2Nlc3MpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAobXlHZW4gIT09IGluc3RhbGxhdGlvbkZyb21SZXBvLmNoYW5nZWxvZ0dlbikge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm47IC8vIGEgbmV3ZXIgbW9kYWwgb3BlbmluZyBzdXBlcnNlZGVkIHRoaXMgYmF0Y2hcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcGVuZGluZyAtPSAxO1xuICAgICAgICAgICAgICAgIGlmIChzdWNjZXNzICYmIHJlcG9EYXRhICYmIEFycmF5LmlzQXJyYXkocmVwb0RhdGEucmVsZWFzZXMpKSB7XG4gICAgICAgICAgICAgICAgICAgIGFueVN1Y2Nlc3MgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdlclJlbGVhc2VzID0gaW5zdGFsbGF0aW9uRnJvbVJlcG8uZmlsdGVyTmV3ZXJSZWxlYXNlcyhyZXBvRGF0YS5yZWxlYXNlcywgaW5zdGFsbGVkVmVyc2lvbik7XG4gICAgICAgICAgICAgICAgICAgIGZldGNoZWQucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgICAgICB1bmlxaWQ6IHVuaXFpZCxcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IG1vZHVsZU5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnN0YWxsZWRWZXJzaW9uOiBpbnN0YWxsZWRWZXJzaW9uLFxuICAgICAgICAgICAgICAgICAgICAgICAgcmVsZWFzZXM6IG5ld2VyUmVsZWFzZXMubGVuZ3RoID4gMCA/IG5ld2VyUmVsZWFzZXMgOiByZXBvRGF0YS5yZWxlYXNlcy5zbGljZSgwLCAxKSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgZmV0Y2hlZC5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVuaXFpZDogdW5pcWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogbW9kdWxlTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc3RhbGxlZFZlcnNpb246IGluc3RhbGxlZFZlcnNpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICByZWxlYXNlczogW10sXG4gICAgICAgICAgICAgICAgICAgICAgICBlcnJvcjogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgaWYgKHBlbmRpbmcgPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFhbnlTdWNjZXNzKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpbnN0YWxsYXRpb25Gcm9tUmVwby5zaG93Q2hhbmdlbG9nRXJyb3IoJG1vZGFsKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBmZXRjaGVkLnNvcnQoKGEsIGIpID0+IGEubmFtZS5sb2NhbGVDb21wYXJlKGIubmFtZSkpO1xuICAgICAgICAgICAgICAgICAgICBpbnN0YWxsYXRpb25Gcm9tUmVwby5yZW5kZXJNdWx0aVNlbGVjdE1vZGFsKFxuICAgICAgICAgICAgICAgICAgICAgICAgJG1vZGFsLFxuICAgICAgICAgICAgICAgICAgICAgICAgZ2xvYmFsVHJhbnNsYXRlLmV4dF9VcGRhdGVBbGxNb2R1bGVzQ2hhbmdlbG9nSW50cm8sXG4gICAgICAgICAgICAgICAgICAgICAgICBmZXRjaGVkXG4gICAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZWFkcyBjaGVja2VkIGNoZWNrYm94ZXMgaW5zaWRlIHRoZSBtb2RhbCBhbmQgcmV0dXJucyB0aGUgbGlzdCBvZiBzZWxlY3RlZCB1bmlxaWRzLlxuICAgICAqIEZhbGxzIGJhY2sgdG8gYWxsIGtub3duIHVuaXFpZHMgd2hlbiBubyBjaGVja2JveGVzIGFyZSByZW5kZXJlZCAoc2luZ2xlLW1vZHVsZSBjYXNlKS5cbiAgICAgKi9cbiAgICBjb2xsZWN0U2VsZWN0ZWRNb2R1bGVzKCRtb2RhbCkge1xuICAgICAgICBjb25zdCAkYm94ZXMgPSAkbW9kYWwuZmluZCgnLnVwZGF0ZS1tb2R1bGUtY2hlY2tib3ggaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdOmNoZWNrZWQnKTtcbiAgICAgICAgaWYgKCRib3hlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBbXTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCByZXN1bHQgPSBbXTtcbiAgICAgICAgJGJveGVzLmVhY2goKF8sIGVsKSA9PiB7XG4gICAgICAgICAgICBjb25zdCB1bmlxaWQgPSAkKGVsKS5jbG9zZXN0KCcudXBkYXRlLW1vZHVsZS1jaGVja2JveCcpLmRhdGEoJ3VuaXFpZCcpO1xuICAgICAgICAgICAgaWYgKHVuaXFpZCkge1xuICAgICAgICAgICAgICAgIHJlc3VsdC5wdXNoKHVuaXFpZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSdW5zIHRoZSBhY3R1YWwgYnVsayB1cGRhdGUgQVBJIGNhbGwgYWZ0ZXIgdXNlciBjb25maXJtZWQgaW4gdGhlIGNoYW5nZWxvZyBtb2RhbC5cbiAgICAgKi9cbiAgICBydW5VcGRhdGVBbGwoJGN1cnJlbnRCdXR0b24sIG1vZHVsZXNGb3JVcGRhdGUpIHtcbiAgICAgICAgJCgnYS5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgJGN1cnJlbnRCdXR0b24ucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICRjdXJyZW50QnV0dG9uLmZpbmQoJ2kuaWNvbicpXG4gICAgICAgICAgICAucmVtb3ZlQ2xhc3MoJ3JlZG8nKVxuICAgICAgICAgICAgLmFkZENsYXNzKCdzcGlubmVyIGxvYWRpbmcnKTtcblxuICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5zdGFydEJhdGNoVXBkYXRlKG1vZHVsZXNGb3JVcGRhdGUpO1xuICAgICAgICBjb25zdCBwYXJhbXMgPSB7XG4gICAgICAgICAgICBjaGFubmVsSWQ6IGluc3RhbGxTdGF0dXNMb29wV29ya2VyLmNoYW5uZWxJZCxcbiAgICAgICAgICAgIG1vZHVsZXNGb3JVcGRhdGU6IG1vZHVsZXNGb3JVcGRhdGUsXG4gICAgICAgIH07XG4gICAgICAgIE1vZHVsZXNBUEkudXBkYXRlQWxsKHBhcmFtcywgKHJlc3BvbnNlLCBzdWNjZXNzKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmRlYnVnKHJlc3BvbnNlKTtcbiAgICAgICAgICAgIGlmIChzdWNjZXNzID09PSBmYWxzZSB8fCByZXNwb25zZS5yZXN1bHQgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgICAgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIucmVzZXRCYXRjaFVwZGF0ZSgpO1xuICAgICAgICAgICAgICAgIGluc3RhbGxhdGlvbkZyb21SZXBvLiRwcm9ncmVzc0JhckJsb2NrLmhpZGUoKTtcbiAgICAgICAgICAgICAgICAkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgICRjdXJyZW50QnV0dG9uLmZpbmQoJ2kuaWNvbicpXG4gICAgICAgICAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnc3Bpbm5lciBsb2FkaW5nJylcbiAgICAgICAgICAgICAgICAgICAgLmFkZENsYXNzKCdyZWRvJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgICQoJ3RyLnRhYmxlLWVycm9yLW1lc3NhZ2VzJykucmVtb3ZlKCk7XG4gICAgICAgICQoJ3RyLmVycm9yJykucmVtb3ZlQ2xhc3MoJ2Vycm9yJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlc2V0cyB0aGUgY2hhbmdlbG9nIG1vZGFsIHRvIGl0cyBsb2FkaW5nIHN0YXRlIGJlZm9yZSBhIG5ldyBmZXRjaC5cbiAgICAgKi9cbiAgICByZXNldENoYW5nZWxvZ01vZGFsKCRtb2RhbCkge1xuICAgICAgICAkbW9kYWwuZmluZCgnLmNoYW5nZWxvZy1sb2FkZXInKS5zaG93KCk7XG4gICAgICAgICRtb2RhbC5maW5kKCcuY2hhbmdlbG9nLWludHJvJykuaGlkZSgpLmVtcHR5KCk7XG4gICAgICAgICRtb2RhbC5maW5kKCcuY2hhbmdlbG9nLWJvZHknKS5oaWRlKCkuZW1wdHkoKTtcbiAgICAgICAgJG1vZGFsLmZpbmQoJy5jaGFuZ2Vsb2ctZXJyb3InKS5oaWRlKCk7XG4gICAgICAgICRtb2RhbC5maW5kKCcuYXBwcm92ZS5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2hvd3MgdGhlIGVycm9yIG1lc3NhZ2UgaW5zaWRlIHRoZSBjaGFuZ2Vsb2cgbW9kYWwgYW5kIGRpc2FibGVzIENvbmZpcm0uXG4gICAgICovXG4gICAgc2hvd0NoYW5nZWxvZ0Vycm9yKCRtb2RhbCkge1xuICAgICAgICAkbW9kYWwuZmluZCgnLmNoYW5nZWxvZy1sb2FkZXInKS5oaWRlKCk7XG4gICAgICAgICRtb2RhbC5maW5kKCcuY2hhbmdlbG9nLWVycm9yJykuc2hvdygpO1xuICAgICAgICAkbW9kYWwuZmluZCgnLmFwcHJvdmUuYnV0dG9uJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbmRlcnMgdGhlIGNoYW5nZWxvZyBtb2RhbCBjb250ZW50IGZvciBhIHNpbmdsZS1tb2R1bGUgdXBkYXRlLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRtb2RhbFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpbnRyb1RleHRcbiAgICAgKiBAcGFyYW0ge0FycmF5PHtuYW1lOnN0cmluZywgcmVsZWFzZXM6QXJyYXksIGVycm9yPzpib29sZWFufT59IGVudHJpZXNcbiAgICAgKi9cbiAgICByZW5kZXJDaGFuZ2Vsb2dNb2RhbCgkbW9kYWwsIGludHJvVGV4dCwgZW50cmllcykge1xuICAgICAgICAkbW9kYWwuZmluZCgnLmNoYW5nZWxvZy1sb2FkZXInKS5oaWRlKCk7XG5cbiAgICAgICAgaWYgKGludHJvVGV4dCkge1xuICAgICAgICAgICAgJG1vZGFsLmZpbmQoJy5jaGFuZ2Vsb2ctaW50cm8nKS5odG1sKGludHJvVGV4dCkuc2hvdygpO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGh0bWwgPSAnJztcbiAgICAgICAgZW50cmllcy5mb3JFYWNoKChlbnRyeSkgPT4ge1xuICAgICAgICAgICAgaHRtbCArPSBpbnN0YWxsYXRpb25Gcm9tUmVwby5yZW5kZXJFbnRyeVJlbGVhc2VzKGVudHJ5KTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgJG1vZGFsLmZpbmQoJy5jaGFuZ2Vsb2ctYm9keScpLmh0bWwoaHRtbCkuc2hvdygpO1xuICAgICAgICAkbW9kYWwuZmluZCgnLmFwcHJvdmUuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICRtb2RhbC5tb2RhbCgncmVmcmVzaCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZW5kZXJzIHRoZSBtdWx0aS1tb2R1bGUgdXBkYXRlIG1vZGFsIGFzIGEgY2hlY2tib3ggbGlzdCB3aXRoIGNvbGxhcHNpYmxlXG4gICAgICogY2hhbmdlbG9nIGFjY29yZGlvbiBwZXIgbW9kdWxlLiBUaGUgdXNlciBjYW4gZGVzZWxlY3QgbW9kdWxlcyB0aGV5IGRvIG5vdFxuICAgICAqIHdhbnQgdG8gdXBkYXRlOyBDb25maXJtIGlzIGRpc2FibGVkIHdoaWxlIG5vIG1vZHVsZSBpcyBjaGVja2VkLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRtb2RhbFxuICAgICAqIEBwYXJhbSB7c3RyaW5nfSBpbnRyb1RleHRcbiAgICAgKiBAcGFyYW0ge0FycmF5PHt1bmlxaWQ6c3RyaW5nLCBuYW1lOnN0cmluZywgaW5zdGFsbGVkVmVyc2lvbjpzdHJpbmcsIHJlbGVhc2VzOkFycmF5LCBlcnJvcj86Ym9vbGVhbn0+fSBlbnRyaWVzXG4gICAgICovXG4gICAgcmVuZGVyTXVsdGlTZWxlY3RNb2RhbCgkbW9kYWwsIGludHJvVGV4dCwgZW50cmllcykge1xuICAgICAgICAkbW9kYWwuZmluZCgnLmNoYW5nZWxvZy1sb2FkZXInKS5oaWRlKCk7XG5cbiAgICAgICAgaWYgKGludHJvVGV4dCkge1xuICAgICAgICAgICAgJG1vZGFsLmZpbmQoJy5jaGFuZ2Vsb2ctaW50cm8nKS5odG1sKGludHJvVGV4dCkuc2hvdygpO1xuICAgICAgICB9XG5cbiAgICAgICAgbGV0IGh0bWwgPSAnPGRpdiBjbGFzcz1cInVpIHN0eWxlZCBmbHVpZCBhY2NvcmRpb24gdXBkYXRlLW1vZHVsZXMtYWNjb3JkaW9uXCI+JztcbiAgICAgICAgZW50cmllcy5mb3JFYWNoKChlbnRyeSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgbmV3ZXN0ID0gZW50cnkucmVsZWFzZXMgJiYgZW50cnkucmVsZWFzZXNbMF0gJiYgZW50cnkucmVsZWFzZXNbMF0udmVyc2lvblxuICAgICAgICAgICAgICAgID8gZW50cnkucmVsZWFzZXNbMF0udmVyc2lvblxuICAgICAgICAgICAgICAgIDogJyc7XG4gICAgICAgICAgICBsZXQgdmVyc2lvbkluZm8gPSAnJztcbiAgICAgICAgICAgIGlmIChlbnRyeS5pbnN0YWxsZWRWZXJzaW9uICYmIG5ld2VzdCkge1xuICAgICAgICAgICAgICAgIHZlcnNpb25JbmZvID0gYCA8c3BhbiBjbGFzcz1cInVpIHNtYWxsIGdyZXkgdGV4dFwiPiR7aW5zdGFsbGF0aW9uRnJvbVJlcG8uZXNjYXBlSHRtbChlbnRyeS5pbnN0YWxsZWRWZXJzaW9uKX0g4oaSICR7aW5zdGFsbGF0aW9uRnJvbVJlcG8uZXNjYXBlSHRtbChuZXdlc3QpfTwvc3Bhbj5gO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChuZXdlc3QpIHtcbiAgICAgICAgICAgICAgICB2ZXJzaW9uSW5mbyA9IGAgPHNwYW4gY2xhc3M9XCJ1aSBzbWFsbCBncmV5IHRleHRcIj4ke2luc3RhbGxhdGlvbkZyb21SZXBvLmVzY2FwZUh0bWwobmV3ZXN0KX08L3NwYW4+YDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cInRpdGxlXCI+JztcbiAgICAgICAgICAgIGh0bWwgKz0gJzxpIGNsYXNzPVwiZHJvcGRvd24gaWNvblwiPjwvaT4nO1xuICAgICAgICAgICAgaHRtbCArPSBgPGRpdiBjbGFzcz1cInVpIGNoZWNrYm94IHVwZGF0ZS1tb2R1bGUtY2hlY2tib3hcIiBkYXRhLXVuaXFpZD1cIiR7aW5zdGFsbGF0aW9uRnJvbVJlcG8uZXNjYXBlSHRtbChlbnRyeS51bmlxaWQpfVwiPmA7XG4gICAgICAgICAgICBodG1sICs9ICc8aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgY2hlY2tlZCAvPic7XG4gICAgICAgICAgICBodG1sICs9IGA8bGFiZWw+PGI+JHtpbnN0YWxsYXRpb25Gcm9tUmVwby5lc2NhcGVIdG1sKGVudHJ5Lm5hbWUpfTwvYj4ke3ZlcnNpb25JbmZvfTwvbGFiZWw+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuICAgICAgICAgICAgaHRtbCArPSAnPGRpdiBjbGFzcz1cImNvbnRlbnRcIj4nO1xuICAgICAgICAgICAgaHRtbCArPSBpbnN0YWxsYXRpb25Gcm9tUmVwby5yZW5kZXJFbnRyeVJlbGVhc2VzKGVudHJ5KTtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIH0pO1xuICAgICAgICBodG1sICs9ICc8L2Rpdj4nO1xuXG4gICAgICAgIGNvbnN0ICRib2R5ID0gJG1vZGFsLmZpbmQoJy5jaGFuZ2Vsb2ctYm9keScpO1xuICAgICAgICAkYm9keS5odG1sKGh0bWwpLnNob3coKTtcblxuICAgICAgICBjb25zdCAkYWNjb3JkaW9uID0gJGJvZHkuZmluZCgnLnVwZGF0ZS1tb2R1bGVzLWFjY29yZGlvbicpO1xuICAgICAgICAkYWNjb3JkaW9uLmFjY29yZGlvbih7IGV4Y2x1c2l2ZTogZmFsc2UgfSk7XG5cbiAgICAgICAgLy8gU3RvcCBjaGVja2JveCBjbGlja3MgZnJvbSB0b2dnbGluZyB0aGUgYWNjb3JkaW9uIHRpdGxlLlxuICAgICAgICAkYWNjb3JkaW9uLmZpbmQoJy51cGRhdGUtbW9kdWxlLWNoZWNrYm94Jykub24oJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgICAgIH0pO1xuICAgICAgICAkYWNjb3JkaW9uLmZpbmQoJy51aS5jaGVja2JveC51cGRhdGUtbW9kdWxlLWNoZWNrYm94JykuY2hlY2tib3goKTtcblxuICAgICAgICBjb25zdCAkYXBwcm92ZSA9ICRtb2RhbC5maW5kKCcuYXBwcm92ZS5idXR0b24nKTtcbiAgICAgICAgY29uc3QgcmVmcmVzaEFwcHJvdmVTdGF0ZSA9ICgpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IGFueUNoZWNrZWQgPSAkYWNjb3JkaW9uLmZpbmQoJy51cGRhdGUtbW9kdWxlLWNoZWNrYm94IGlucHV0W3R5cGU9XCJjaGVja2JveFwiXTpjaGVja2VkJykubGVuZ3RoID4gMDtcbiAgICAgICAgICAgIGlmIChhbnlDaGVja2VkKSB7XG4gICAgICAgICAgICAgICAgJGFwcHJvdmUucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICRhcHByb3ZlLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgICAgICAkYWNjb3JkaW9uLmZpbmQoJy51cGRhdGUtbW9kdWxlLWNoZWNrYm94IGlucHV0W3R5cGU9XCJjaGVja2JveFwiXScpLm9uKCdjaGFuZ2UnLCByZWZyZXNoQXBwcm92ZVN0YXRlKTtcbiAgICAgICAgcmVmcmVzaEFwcHJvdmVTdGF0ZSgpO1xuXG4gICAgICAgICRtb2RhbC5tb2RhbCgncmVmcmVzaCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBCdWlsZHMgdGhlIHBlci1yZWxlYXNlIGNoYW5nZWxvZyBIVE1MIGZvciBvbmUgbW9kdWxlIGVudHJ5LlxuICAgICAqIFVzZWQgYnkgYm90aCBzaW5nbGUtIGFuZCBtdWx0aS1tb2R1bGUgcmVuZGVyZXJzLlxuICAgICAqL1xuICAgIHJlbmRlckVudHJ5UmVsZWFzZXMoZW50cnkpIHtcbiAgICAgICAgaWYgKGVudHJ5LmVycm9yKSB7XG4gICAgICAgICAgICByZXR1cm4gYDxkaXYgY2xhc3M9XCJ1aSB3YXJuaW5nIG1lc3NhZ2VcIj4ke2dsb2JhbFRyYW5zbGF0ZS5leHRfRmFpbGVkVG9Mb2FkQ2hhbmdlbG9nfTwvZGl2PmA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFlbnRyeS5yZWxlYXNlcyB8fCBlbnRyeS5yZWxlYXNlcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBgPGRpdiBjbGFzcz1cInVpIGJhc2ljIHNlZ21lbnRcIj48aT4ke2dsb2JhbFRyYW5zbGF0ZS5leHRfTm9DaGFuZ2Vsb2dBdmFpbGFibGV9PC9pPjwvZGl2PmA7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGh0bWwgPSAnJztcbiAgICAgICAgZW50cnkucmVsZWFzZXMuZm9yRWFjaCgocmVsZWFzZSkgPT4ge1xuICAgICAgICAgICAgY29uc3QgcmVsZWFzZURhdGUgPSByZWxlYXNlLmNyZWF0ZWQgPyBTdHJpbmcocmVsZWFzZS5jcmVhdGVkKS5zcGxpdCgnICcpWzBdIDogJyc7XG4gICAgICAgICAgICBjb25zdCBjaGFuZ2VMb2dUZXh0ID0gaW5zdGFsbGF0aW9uRnJvbVJlcG8uZm9ybWF0Q2hhbmdlbG9nVGV4dChyZWxlYXNlLmNoYW5nZWxvZyk7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidWkgY2xlYXJpbmcgc2VnbWVudFwiPic7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwidWkgdG9wIGF0dGFjaGVkIGxhYmVsXCI+JHtnbG9iYWxUcmFuc2xhdGUuZXh0X0luc3RhbGxNb2R1bGVSZWxlYXNlVGFnfTogJHtpbnN0YWxsYXRpb25Gcm9tUmVwby5lc2NhcGVIdG1sKHJlbGVhc2UudmVyc2lvbil9YDtcbiAgICAgICAgICAgIGlmIChyZWxlYXNlRGF0ZSkge1xuICAgICAgICAgICAgICAgIGh0bWwgKz0gYCAke2dsb2JhbFRyYW5zbGF0ZS5leHRfRnJvbURhdGV9ICR7aW5zdGFsbGF0aW9uRnJvbVJlcG8uZXNjYXBlSHRtbChyZWxlYXNlRGF0ZSl9YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwidWkgYmFzaWMgc2VnbWVudFwiPjxwPiR7Y2hhbmdlTG9nVGV4dH08L3A+PC9kaXY+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gaHRtbDtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogU2FmZWx5IGZvcm1hdHMgYSByZXBvc2l0b3J5LXByb3ZpZGVkIGNoYW5nZWxvZyB2YWx1ZSBmb3IgSFRNTCBpbnNlcnRpb24uXG4gICAgICogVHJlYXRzIG51bGwvdW5kZWZpbmVkL2VtcHR5IHZhbHVlcyBhcyBtaXNzaW5nIChyZW5kZXJzIGFuIGl0YWxpYyBwbGFjZWhvbGRlciksXG4gICAgICogSFRNTC1lc2NhcGVzIHRoZSByYXcgdGV4dCwgYW5kIGNvbnZlcnRzIG5ld2xpbmVzIHRvIGA8YnI+YCBzbyBwbGFpbi10ZXh0XG4gICAgICogY2hhbmdlbG9ncyBrZWVwIHRoZWlyIGxpbmUgYnJlYWtzIHdpdGhvdXQgYWxsb3dpbmcgYXJiaXRyYXJ5IG1hcmt1cC5cbiAgICAgKi9cbiAgICBmb3JtYXRDaGFuZ2Vsb2dUZXh0KHJhdykge1xuICAgICAgICBpZiAocmF3ID09PSBudWxsIHx8IHJhdyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICByZXR1cm4gYDxpPiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9Ob0NoYW5nZWxvZ0F2YWlsYWJsZX08L2k+YDtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCB0ZXh0ID0gU3RyaW5nKHJhdyk7XG4gICAgICAgIGlmICh0ZXh0ID09PSAnJyB8fCB0ZXh0ID09PSAnbnVsbCcgfHwgdGV4dCA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAgICAgICAgIHJldHVybiBgPGk+JHtnbG9iYWxUcmFuc2xhdGUuZXh0X05vQ2hhbmdlbG9nQXZhaWxhYmxlfTwvaT5gO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGVzY2FwZWQgPSBpbnN0YWxsYXRpb25Gcm9tUmVwby5lc2NhcGVIdG1sKHRleHQpO1xuICAgICAgICBpZiAoZXNjYXBlZC50cmltKCkgPT09ICcnKSB7XG4gICAgICAgICAgICByZXR1cm4gYDxpPiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9Ob0NoYW5nZWxvZ0F2YWlsYWJsZX08L2k+YDtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZXNjYXBlZC5yZXBsYWNlKC9cXG4vZywgJzxicj4nKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogRmlsdGVycyB0aGUgcmVsZWFzZXMgYXJyYXkgdG8gaW5jbHVkZSBvbmx5IHZlcnNpb25zIG5ld2VyIHRoYW4gdGhlIGluc3RhbGxlZCBvbmUuXG4gICAgICogUmV0dXJucyB0aGVtIHNvcnRlZCBkZXNjZW5kaW5nIChuZXdlc3QgZmlyc3QpLlxuICAgICAqL1xuICAgIGZpbHRlck5ld2VyUmVsZWFzZXMocmVsZWFzZXMsIGluc3RhbGxlZFZlcnNpb24pIHtcbiAgICAgICAgaWYgKCFpbnN0YWxsZWRWZXJzaW9uKSB7XG4gICAgICAgICAgICByZXR1cm4gcmVsZWFzZXMuc2xpY2UoKTtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBuZXdlciA9IHJlbGVhc2VzLmZpbHRlcigocmVsZWFzZSkgPT4ge1xuICAgICAgICAgICAgaWYgKCFyZWxlYXNlIHx8ICFyZWxlYXNlLnZlcnNpb24pIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gbWFya2V0cGxhY2UudmVyc2lvbkNvbXBhcmUoU3RyaW5nKHJlbGVhc2UudmVyc2lvbiksIFN0cmluZyhpbnN0YWxsZWRWZXJzaW9uKSkgPiAwO1xuICAgICAgICB9KTtcbiAgICAgICAgbmV3ZXIuc29ydCgoYSwgYikgPT4gbWFya2V0cGxhY2UudmVyc2lvbkNvbXBhcmUoU3RyaW5nKGIudmVyc2lvbiksIFN0cmluZyhhLnZlcnNpb24pKSk7XG4gICAgICAgIHJldHVybiBuZXdlcjtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVwbGFjZXMgJXBsYWNlaG9sZGVycyUgaW4gYSB0cmFuc2xhdGlvbiB0ZW1wbGF0ZSB3aXRoIHZhbHVlcyBmcm9tIGEgbWFwLlxuICAgICAqIFNpbmdsZS1wYXNzIHN1YnN0aXR1dGlvbiBzbyBhIHJlcGxhY2VtZW50IHZhbHVlIGNvbnRhaW5pbmcgYW5vdGhlciBwbGFjZWhvbGRlclxuICAgICAqIGxpdGVyYWwgKGUuZy4gYSBtb2R1bGUgbmFtZWQgXCIlZnJvbSVcIikgaXMgbm90IHJlLWV4cGFuZGVkLlxuICAgICAqL1xuICAgIGZvcm1hdFN0cmluZyh0ZW1wbGF0ZSwgcmVwbGFjZW1lbnRzKSB7XG4gICAgICAgIGlmICghdGVtcGxhdGUpIHtcbiAgICAgICAgICAgIHJldHVybiAnJztcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBtYXAgPSByZXBsYWNlbWVudHMgfHwge307XG4gICAgICAgIHJldHVybiB0ZW1wbGF0ZS5yZXBsYWNlKC8lKFthLXpBLVowLTlfXSspJS9nLCAobWF0Y2gsIGtleSkgPT4ge1xuICAgICAgICAgICAgaWYgKCFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobWFwLCBrZXkpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG1hdGNoO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgcmF3ID0gbWFwW2tleV07XG4gICAgICAgICAgICByZXR1cm4gaW5zdGFsbGF0aW9uRnJvbVJlcG8uZXNjYXBlSHRtbChTdHJpbmcocmF3ICE9PSB1bmRlZmluZWQgJiYgcmF3ICE9PSBudWxsID8gcmF3IDogJycpKTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIE1pbmltYWwgSFRNTCBlc2NhcGUgZm9yIHZhbHVlcyBpbmplY3RlZCBpbnRvIHRoZSBjaGFuZ2Vsb2cgbW9kYWwuXG4gICAgICovXG4gICAgZXNjYXBlSHRtbCh2YWx1ZSkge1xuICAgICAgICByZXR1cm4gU3RyaW5nKHZhbHVlKVxuICAgICAgICAgICAgLnJlcGxhY2UoLyYvZywgJyZhbXA7JylcbiAgICAgICAgICAgIC5yZXBsYWNlKC88L2csICcmbHQ7JylcbiAgICAgICAgICAgIC5yZXBsYWNlKC8+L2csICcmZ3Q7JylcbiAgICAgICAgICAgIC5yZXBsYWNlKC9cIi9nLCAnJnF1b3Q7JylcbiAgICAgICAgICAgIC5yZXBsYWNlKC8nL2csICcmIzM5OycpO1xuICAgIH0sXG5cbn07XG5cbi8vIEluaXRpYWxpemVzIHRoZSBpbnN0YWxsYXRpb25Gcm9tUmVwbyBtb2R1bGUgd2hlbiB0aGUgZG9jdW1lbnQgaXMgcmVhZHksXG4vLyBwcmVwYXJpbmcgdGhlIGV4dGVuc2lvbiBtb2R1bGVzIG1hbmFnZW1lbnQgVUkuXG4kKGRvY3VtZW50KS5yZWFkeSgoKSA9PiB7XG4gICAgaW5zdGFsbGF0aW9uRnJvbVJlcG8uaW5pdGlhbGl6ZSgpO1xufSk7XG4iXX0=