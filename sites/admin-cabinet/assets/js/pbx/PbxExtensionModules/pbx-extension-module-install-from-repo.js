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
    ModulesAPI.installFromRepo(params, function (response, success) {
      console.debug(response); // The async ack carries no `result` field — only an explicit rejection stops the watch

      if (success !== false && response.result !== false) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9QYnhFeHRlbnNpb25Nb2R1bGVzL3BieC1leHRlbnNpb24tbW9kdWxlLWluc3RhbGwtZnJvbS1yZXBvLmpzIl0sIm5hbWVzIjpbImluc3RhbGxhdGlvbkZyb21SZXBvIiwicGJ4VmVyc2lvbiIsImdsb2JhbFBCWFZlcnNpb24iLCJyZXBsYWNlIiwiJGJ0blVwZGF0ZUFsbE1vZHVsZXMiLCIkcHJvZ3Jlc3NCYXJCbG9jayIsIiRpbnN0YWxsTW9kdWxlTW9kYWxGb3JtIiwiJHVwZGF0ZUNoYW5nZWxvZ01vZGFsIiwiY2hhbmdlbG9nR2VuIiwiaW5pdGlhbGl6ZSIsIiQiLCJpbml0aWFsaXplQnV0dG9uRXZlbnRzIiwiaGlkZSIsImRvY3VtZW50Iiwib24iLCJlIiwicHJldmVudERlZmF1bHQiLCIkY3VycmVudEJ1dHRvbiIsInRhcmdldCIsImNsb3Nlc3QiLCJnbG9iYWxQQlhMaWNlbnNlIiwidHJpbSIsIndpbmRvdyIsImxvY2F0aW9uIiwiZ2xvYmFsUm9vdFVybCIsIm9wZW5JbnN0YWxsTW9kdWxlTW9kYWwiLCJvcGVuVXBkYXRlQ2hhbmdlbG9nTW9kYWwiLCJ1cGRhdGVBbGxNb2R1bGVzIiwibW9kdWxlVW5pcXVlSWQiLCJkYXRhIiwicmVsZWFzZUlkIiwibW9kYWwiLCJjbG9zYWJsZSIsIm9uU2hvdyIsIm1vZHVsZU5hbWUiLCJ0aGVGb3JtIiwiZmluZCIsInRleHQiLCIkaW5zdGFsbGVkTW9kdWxlUm93IiwibGVuZ3RoIiwiaW5zdGFsbGVkVmVyc2lvbiIsIm5ld1ZlcnNpb24iLCJtYXJrZXRwbGFjZSIsInZlcnNpb25Db21wYXJlIiwiZ2xvYmFsVHJhbnNsYXRlIiwiZXh0X1VwZGF0ZU1vZHVsZVRpdGxlIiwiaHRtbCIsImV4dF9Nb2R1bGVVcGRhdGVEZXNjcmlwdGlvbiIsImV4dF9Eb3duZ3JhZGVNb2R1bGVUaXRsZSIsImV4dF9Nb2R1bGVEb3duZ3JhZGVEZXNjcmlwdGlvbiIsImV4dF9JbnN0YWxsTW9kdWxlVGl0bGUiLCJleHRfTW9kdWxlSW5zdGFsbERlc2NyaXB0aW9uIiwib25EZW55IiwicmVtb3ZlQ2xhc3MiLCJvbkFwcHJvdmUiLCJydW5TaW5nbGVJbnN0YWxsIiwiJG1vZGFsIiwiJGluc3RhbGxlZFJvdyIsIlN0cmluZyIsImZpcnN0IiwiY2xvbmUiLCJjaGlsZHJlbiIsInJlbW92ZSIsImVuZCIsInJlc2V0Q2hhbmdlbG9nTW9kYWwiLCJteUdlbiIsImhhc0NsYXNzIiwiTW9kdWxlc0FQSSIsImdldE1vZHVsZUluZm8iLCJ1bmlxaWQiLCJyZXBvRGF0YSIsInN1Y2Nlc3MiLCJBcnJheSIsImlzQXJyYXkiLCJyZWxlYXNlcyIsInNob3dDaGFuZ2Vsb2dFcnJvciIsIm5ld2VyUmVsZWFzZXMiLCJmaWx0ZXJOZXdlclJlbGVhc2VzIiwibGF0ZXN0VmVyc2lvbiIsInZlcnNpb24iLCJpbnRybyIsImZvcm1hdFN0cmluZyIsImV4dF9VcGRhdGVDaGFuZ2Vsb2dJbnRybyIsIm5hbWUiLCJmcm9tIiwidG8iLCJyZW5kZXJDaGFuZ2Vsb2dNb2RhbCIsInNsaWNlIiwiYWRkQ2xhc3MiLCJwYXJhbXMiLCJjaGFubmVsSWQiLCJpbnN0YWxsU3RhdHVzTG9vcFdvcmtlciIsIiRtb2R1bGVCdXR0b25zIiwic3RhcnRXYXRjaCIsImluc3RhbGxGcm9tUmVwbyIsInJlc3BvbnNlIiwiY29uc29sZSIsImRlYnVnIiwicmVzdWx0IiwiYW5pbWF0ZSIsInNjcm9sbFRvcCIsIm9mZnNldCIsInRvcCIsIndhdGNoZG9nIiwic3RvcCIsInJlc2V0QnV0dG9uVmlldyIsIlVzZXJNZXNzYWdlIiwic2hvd011bHRpU3RyaW5nIiwibWVzc2FnZXMiLCJleHRfSW5zdGFsbGF0aW9uRXJyb3IiLCJvcGVuVXBkYXRlQWxsTW9kdWxlc01vZGFsIiwidW5pcXVlTW9kdWxlc0ZvclVwZGF0ZSIsIlNldCIsImVhY2giLCJfIiwiYnV0dG9uIiwiYWRkIiwibW9kdWxlc0ZvclVwZGF0ZSIsImV4dF9VcGRhdGVBbGxNb2R1bGVzVGl0bGUiLCJzZWxlY3RlZCIsImNvbGxlY3RTZWxlY3RlZE1vZHVsZXMiLCJydW5VcGRhdGVBbGwiLCJmZXRjaGVkIiwicGVuZGluZyIsImFueVN1Y2Nlc3MiLCJmb3JFYWNoIiwiJGJ0biIsInB1c2giLCJlcnJvciIsInNvcnQiLCJhIiwiYiIsImxvY2FsZUNvbXBhcmUiLCJyZW5kZXJNdWx0aVNlbGVjdE1vZGFsIiwiZXh0X1VwZGF0ZUFsbE1vZHVsZXNDaGFuZ2Vsb2dJbnRybyIsIiRib3hlcyIsImVsIiwic3RhcnRCYXRjaFVwZGF0ZSIsInVwZGF0ZUFsbCIsInJlc2V0QmF0Y2hVcGRhdGUiLCJzaG93IiwiZW1wdHkiLCJpbnRyb1RleHQiLCJlbnRyaWVzIiwiZW50cnkiLCJyZW5kZXJFbnRyeVJlbGVhc2VzIiwibmV3ZXN0IiwidmVyc2lvbkluZm8iLCJlc2NhcGVIdG1sIiwiJGJvZHkiLCIkYWNjb3JkaW9uIiwiYWNjb3JkaW9uIiwiZXhjbHVzaXZlIiwic3RvcFByb3BhZ2F0aW9uIiwiY2hlY2tib3giLCIkYXBwcm92ZSIsInJlZnJlc2hBcHByb3ZlU3RhdGUiLCJhbnlDaGVja2VkIiwiZXh0X0ZhaWxlZFRvTG9hZENoYW5nZWxvZyIsImV4dF9Ob0NoYW5nZWxvZ0F2YWlsYWJsZSIsInJlbGVhc2UiLCJyZWxlYXNlRGF0ZSIsImNyZWF0ZWQiLCJzcGxpdCIsImNoYW5nZUxvZ1RleHQiLCJmb3JtYXRDaGFuZ2Vsb2dUZXh0IiwiY2hhbmdlbG9nIiwiZXh0X0luc3RhbGxNb2R1bGVSZWxlYXNlVGFnIiwiZXh0X0Zyb21EYXRlIiwicmF3IiwidW5kZWZpbmVkIiwiZXNjYXBlZCIsIm5ld2VyIiwiZmlsdGVyIiwidGVtcGxhdGUiLCJyZXBsYWNlbWVudHMiLCJtYXAiLCJtYXRjaCIsImtleSIsIk9iamVjdCIsInByb3RvdHlwZSIsImhhc093blByb3BlcnR5IiwiY2FsbCIsInZhbHVlIiwicmVhZHkiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FB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cUQ7QUFDakQsZUFBT0QsS0FBUDtBQUNIOztBQUNELFVBQU1SLEdBQUcsR0FBR08sR0FBRyxDQUFDRSxHQUFELENBQWY7QUFDQSxhQUFPbEwsb0JBQW9CLENBQUNvSixVQUFyQixDQUFnQzFGLE1BQU0sQ0FBQytHLEdBQUcsS0FBS0MsU0FBUixJQUFxQkQsR0FBRyxLQUFLLElBQTdCLEdBQW9DQSxHQUFwQyxHQUEwQyxFQUEzQyxDQUF0QyxDQUFQO0FBQ0gsS0FOTSxDQUFQO0FBT0gsR0Eva0J3Qjs7QUFpbEJ6QjtBQUNKO0FBQ0E7QUFDSXJCLEVBQUFBLFVBcGxCeUIsc0JBb2xCZG1DLEtBcGxCYyxFQW9sQlA7QUFDZCxXQUFPN0gsTUFBTSxDQUFDNkgsS0FBRCxDQUFOLENBQ0ZwTCxPQURFLENBQ00sSUFETixFQUNZLE9BRFosRUFFRkEsT0FGRSxDQUVNLElBRk4sRUFFWSxNQUZaLEVBR0ZBLE9BSEUsQ0FHTSxJQUhOLEVBR1ksTUFIWixFQUlGQSxPQUpFLENBSU0sSUFKTixFQUlZLFFBSlosRUFLRkEsT0FMRSxDQUtNLElBTE4sRUFLWSxPQUxaLENBQVA7QUFNSDtBQTNsQndCLENBQTdCLEMsQ0ErbEJBO0FBQ0E7O0FBQ0FPLENBQUMsQ0FBQ0csUUFBRCxDQUFELENBQVkySyxLQUFaLENBQWtCLFlBQU07QUFDcEJ4TCxFQUFBQSxvQkFBb0IsQ0FBQ1MsVUFBckI7QUFDSCxDQUZEIiwic291cmNlc0NvbnRlbnQiOlsiLypcbiAqIE1pa29QQlggLSBmcmVlIHBob25lIHN5c3RlbSBmb3Igc21hbGwgYnVzaW5lc3NcbiAqIENvcHlyaWdodCDCqSAyMDE3LTIwMjQgQWxleGV5IFBvcnRub3YgYW5kIE5pa29sYXkgQmVrZXRvdlxuICpcbiAqIFRoaXMgcHJvZ3JhbSBpcyBmcmVlIHNvZnR3YXJlOiB5b3UgY2FuIHJlZGlzdHJpYnV0ZSBpdCBhbmQvb3IgbW9kaWZ5XG4gKiBpdCB1bmRlciB0aGUgdGVybXMgb2YgdGhlIEdOVSBHZW5lcmFsIFB1YmxpYyBMaWNlbnNlIGFzIHB1Ymxpc2hlZCBieVxuICogdGhlIEZyZWUgU29mdHdhcmUgRm91bmRhdGlvbjsgZWl0aGVyIHZlcnNpb24gMyBvZiB0aGUgTGljZW5zZSwgb3JcbiAqIChhdCB5b3VyIG9wdGlvbikgYW55IGxhdGVyIHZlcnNpb24uXG4gKlxuICogVGhpcyBwcm9ncmFtIGlzIGRpc3RyaWJ1dGVkIGluIHRoZSBob3BlIHRoYXQgaXQgd2lsbCBiZSB1c2VmdWwsXG4gKiBidXQgV0lUSE9VVCBBTlkgV0FSUkFOVFk7IHdpdGhvdXQgZXZlbiB0aGUgaW1wbGllZCB3YXJyYW50eSBvZlxuICogTUVSQ0hBTlRBQklMSVRZIG9yIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLiAgU2VlIHRoZVxuICogR05VIEdlbmVyYWwgUHVibGljIExpY2Vuc2UgZm9yIG1vcmUgZGV0YWlscy5cbiAqXG4gKiBZb3Ugc2hvdWxkIGhhdmUgcmVjZWl2ZWQgYSBjb3B5IG9mIHRoZSBHTlUgR2VuZXJhbCBQdWJsaWMgTGljZW5zZSBhbG9uZyB3aXRoIHRoaXMgcHJvZ3JhbS5cbiAqIElmIG5vdCwgc2VlIDxodHRwczovL3d3dy5nbnUub3JnL2xpY2Vuc2VzLz4uXG4gKi9cblxuLyogZ2xvYmFsIGdsb2JhbFJvb3RVcmwsIFBieEFwaSwgZ2xvYmFsUEJYTGljZW5zZSwgZ2xvYmFsVHJhbnNsYXRlLCBVc2VyTWVzc2FnZSwgZ2xvYmFsUEJYVmVyc2lvbiwgaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIsIG1hcmtldHBsYWNlLCBNb2R1bGVzQVBJICovXG5cbi8qKlxuICogTWFuYWdlcyB0aGUgaW5zdGFsbGF0aW9uIGFuZCB1cGRhdGluZyBvZiBQQlggZXh0ZW5zaW9uIG1vZHVsZXMgZnJvbSBhIHJlcG9zaXRvcnkuXG4gKiBJdCBwcm92aWRlcyBmdW5jdGlvbmFsaXR5IHRvIHVwZGF0ZSBpbmRpdmlkdWFsIG1vZHVsZXMgb3IgYWxsIG1vZHVsZXMgYXQgb25jZSxcbiAqIGFuZCBkaXNwbGF5cyBwcm9ncmVzcyBpbmZvcm1hdGlvbiB0byB0aGUgdXNlci5cbiAqXG4gKiBAY2xhc3MgaW5zdGFsbGF0aW9uRnJvbVJlcG9cbiAqIEBtZW1iZXJvZiBtb2R1bGU6UGJ4RXh0ZW5zaW9uTW9kdWxlc1xuICovXG5jb25zdCBpbnN0YWxsYXRpb25Gcm9tUmVwbyA9IHtcblxuICAgIC8qKlxuICAgICAqIFRoZSBjdXJyZW50IHZlcnNpb24gb2YgdGhlIFBCWCBzeXN0ZW0sIHdpdGggZGV2ZWxvcG1lbnQgdmVyc2lvbiBpZGVudGlmaWVycyByZW1vdmVkLlxuICAgICAqIEB0eXBlIHtzdHJpbmd9XG4gICAgICovXG4gICAgcGJ4VmVyc2lvbjogZ2xvYmFsUEJYVmVyc2lvbi5yZXBsYWNlKC8tZGV2L2ksICcnKSxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBidXR0b24gcmVzcG9uc2libGUgZm9yIHVwZGF0aW5nIGFsbCBpbnN0YWxsZWQgbW9kdWxlcy5cbiAgICAgKiBSZXNvbHZlZCBpbiBpbml0aWFsaXplKCkg4oCUIG11c3Qgbm90IGNhbGwgJCgpIGF0IG1vZHVsZS1sb2FkIHRpbWUuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkYnRuVXBkYXRlQWxsTW9kdWxlczogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBibG9jayB0aGF0IGNvbnRhaW5zIHRoZSBwcm9ncmVzcyBiYXIsIHVzZWQgdG8gaW5kaWNhdGVcbiAgICAgKiB0aGUgcHJvZ3Jlc3Mgb2YgbW9kdWxlIGluc3RhbGxhdGlvbiBvciB1cGRhdGluZyBwcm9jZXNzZXMuXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkcHJvZ3Jlc3NCYXJCbG9jazogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSBpbnN0YWxsYXRpb24gbW9kdWxlIG1vZGFsIGZvcm0uXG4gICAgICogQHR5cGUge2pRdWVyeX1cbiAgICAgKi9cbiAgICAkaW5zdGFsbE1vZHVsZU1vZGFsRm9ybTogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIGpRdWVyeSBvYmplY3QgZm9yIHRoZSB1cGRhdGUgY2hhbmdlbG9nIGNvbmZpcm1hdGlvbiBtb2RhbC5cbiAgICAgKiBAdHlwZSB7alF1ZXJ5fVxuICAgICAqL1xuICAgICR1cGRhdGVDaGFuZ2Vsb2dNb2RhbDogbnVsbCxcblxuICAgIC8qKlxuICAgICAqIE1vbm90b25pY2FsbHkgaW5jcmVhc2luZyB0b2tlbiBidW1wZWQgZWFjaCB0aW1lIHRoZSBjaGFuZ2Vsb2cgbW9kYWwgaXMgb3BlbmVkLlxuICAgICAqIEluLWZsaWdodCBgZ2V0TW9kdWxlSW5mb2AgY2FsbGJhY2tzIGNvbXBhcmUgYWdhaW5zdCB0aGlzIHRva2VuIGFuZCBiYWlsIG91dCBpZlxuICAgICAqIGEgbmV3ZXIgbW9kYWwgb3BlbmluZyBoYXMgc3VwZXJzZWRlZCB0aGVpciByZXF1ZXN0IOKAlCBwcmV2ZW50cyBzdGFsZSByZXBvc2l0b3J5XG4gICAgICogcmVzcG9uc2VzIGZyb20gb3ZlcndyaXRpbmcgdGhlIGJvZHkgb2YgYSBuZXdseS1zaG93biBtb2RhbC5cbiAgICAgKiBAdHlwZSB7bnVtYmVyfVxuICAgICAqL1xuICAgIGNoYW5nZWxvZ0dlbjogMCxcblxuXG4gICAgLyoqXG4gICAgICogSW5pdGlhbGl6ZXMgdGhlIGluc3RhbGxhdGlvbkZyb21SZXBvIG1vZHVsZS4gU2V0cyB1cCBldmVudCBoYW5kbGVycyBmb3IgVUkgaW50ZXJhY3Rpb25zXG4gICAgICogYW5kIGhpZGVzIFVJIGVsZW1lbnRzIHRoYXQgYXJlIG5vdCBpbW1lZGlhdGVseSBuZWVkZWQuXG4gICAgICovXG4gICAgaW5pdGlhbGl6ZSgpIHtcbiAgICAgICAgaW5zdGFsbGF0aW9uRnJvbVJlcG8uJGJ0blVwZGF0ZUFsbE1vZHVsZXMgPSAkKCcjdXBkYXRlLWFsbC1tb2R1bGVzLWJ1dHRvbicpO1xuICAgICAgICBpbnN0YWxsYXRpb25Gcm9tUmVwby4kcHJvZ3Jlc3NCYXJCbG9jayA9ICQoJyN1cGxvYWQtcHJvZ3Jlc3MtYmFyLWJsb2NrJyk7XG4gICAgICAgIGluc3RhbGxhdGlvbkZyb21SZXBvLiRpbnN0YWxsTW9kdWxlTW9kYWxGb3JtID0gJCgnI2luc3RhbGwtbW9kYWwtZm9ybScpO1xuICAgICAgICBpbnN0YWxsYXRpb25Gcm9tUmVwby4kdXBkYXRlQ2hhbmdlbG9nTW9kYWwgPSAkKCcjdXBkYXRlLWNoYW5nZWxvZy1tb2RhbCcpO1xuXG4gICAgICAgIGluc3RhbGxhdGlvbkZyb21SZXBvLmluaXRpYWxpemVCdXR0b25FdmVudHMoKTtcbiAgICAgICAgaW5zdGFsbGF0aW9uRnJvbVJlcG8uJHByb2dyZXNzQmFyQmxvY2suaGlkZSgpO1xuICAgICAgICBpbnN0YWxsYXRpb25Gcm9tUmVwby4kYnRuVXBkYXRlQWxsTW9kdWxlcy5oaWRlKCk7IC8vIFVudGlsIGF0IGxlYXN0IG9uZSB1cGRhdGUgYXZhaWxhYmxlXG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFNldHMgdXAgZXZlbnQgaGFuZGxlcnMgZm9yIGJ1dHRvbiBjbGlja3Mgd2l0aGluIHRoZSBtb2R1bGUuXG4gICAgICogVXBkYXRlIGJ1dHRvbnMgZ28gdGhyb3VnaCBhIGNoYW5nZWxvZyBjb25maXJtYXRpb24gbW9kYWw7IGluc3RhbGwvZG93bmdyYWRlIGJ1dHRvbnNcbiAgICAgKiBnbyB0aHJvdWdoIHRoZSBvcmlnaW5hbCBzaW1wbGUgY29uZmlybWF0aW9uIG1vZGFsLlxuICAgICAqL1xuICAgIGluaXRpYWxpemVCdXR0b25FdmVudHMoKSB7XG4gICAgICAgIC8vIE5ldyBpbnN0YWxsIC8gZXhwbGljaXQgdmVyc2lvbiBkb3dubG9hZCAocGVyLXJlbGVhc2UgaW4gZGV0YWlsIHBvcHVwKSAtPiBzaW1wbGUgbW9kYWxcbiAgICAgICAgJChkb2N1bWVudCkub24oJ2NsaWNrJywgJ2EuZG93bmxvYWQnLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICAgICAgY29uc3QgJGN1cnJlbnRCdXR0b24gPSAkKGUudGFyZ2V0KS5jbG9zZXN0KCdhLmJ1dHRvbicpO1xuICAgICAgICAgICAgaWYgKGdsb2JhbFBCWExpY2Vuc2UudHJpbSgpID09PSAnJykge1xuICAgICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbiA9IGAke2dsb2JhbFJvb3RVcmx9cGJ4LWV4dGVuc2lvbi1tb2R1bGVzL2luZGV4Iy9saWNlbnNpbmdgO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBpbnN0YWxsYXRpb25Gcm9tUmVwby5vcGVuSW5zdGFsbE1vZHVsZU1vZGFsKCRjdXJyZW50QnV0dG9uKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gU2luZ2xlLW1vZHVsZSB1cGRhdGUgLT4gY2hhbmdlbG9nIGNvbmZpcm1hdGlvbiBtb2RhbCAoY3VycmVudCAtPiBsYXRlc3QpXG4gICAgICAgICQoZG9jdW1lbnQpLm9uKCdjbGljaycsICdhLnVwZGF0ZScsIChlKSA9PiB7XG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBjb25zdCAkY3VycmVudEJ1dHRvbiA9ICQoZS50YXJnZXQpLmNsb3Nlc3QoJ2EuYnV0dG9uJyk7XG4gICAgICAgICAgICBpZiAoZ2xvYmFsUEJYTGljZW5zZS50cmltKCkgPT09ICcnKSB7XG4gICAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uID0gYCR7Z2xvYmFsUm9vdFVybH1wYngtZXh0ZW5zaW9uLW1vZHVsZXMvaW5kZXgjL2xpY2Vuc2luZ2A7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGluc3RhbGxhdGlvbkZyb21SZXBvLm9wZW5VcGRhdGVDaGFuZ2Vsb2dNb2RhbCgkY3VycmVudEJ1dHRvbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgICAgIGluc3RhbGxhdGlvbkZyb21SZXBvLiRidG5VcGRhdGVBbGxNb2R1bGVzLm9uKCdjbGljaycsIGluc3RhbGxhdGlvbkZyb21SZXBvLnVwZGF0ZUFsbE1vZHVsZXMpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBPcGVucyB0aGUgbW9kYWwgZm9ybSBmb3IgaW5zdGFsbGluZyBhIG1vZHVsZS4gVGhpcyBtb2RhbCBwcm92aWRlcyB0aGUgdXNlciB3aXRoIGluZm9ybWF0aW9uXG4gICAgICogYWJvdXQgdGhlIG1vZHVsZSB0aGV5IGFyZSBhYm91dCB0byBpbnN0YWxsLCBhbmQgY29uZmlybXMgdGhlaXIgYWN0aW9uLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRjdXJyZW50QnV0dG9uIC0gVGhlIGpRdWVyeSBvYmplY3Qgb2YgdGhlIGJ1dHRvbiB0aGF0IHdhcyBjbGlja2VkIHRvIHRyaWdnZXIgdGhpcyBtb2RhbC5cbiAgICAgKi9cbiAgICBvcGVuSW5zdGFsbE1vZHVsZU1vZGFsKCRjdXJyZW50QnV0dG9uKSB7XG4gICAgICAgIGNvbnN0IG1vZHVsZVVuaXF1ZUlkID0gJGN1cnJlbnRCdXR0b24uZGF0YSgndW5pcWlkJyk7XG4gICAgICAgIGNvbnN0IHJlbGVhc2VJZCA9ICRjdXJyZW50QnV0dG9uLmRhdGEoJ3JlbGVhc2VpZCcpO1xuICAgICAgICBpbnN0YWxsYXRpb25Gcm9tUmVwby4kaW5zdGFsbE1vZHVsZU1vZGFsRm9ybVxuICAgICAgICAgICAgLm1vZGFsKHtcbiAgICAgICAgICAgICAgICBjbG9zYWJsZTogZmFsc2UsXG4gICAgICAgICAgICAgICAgb25TaG93OiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG1vZHVsZU5hbWUgPSAkY3VycmVudEJ1dHRvbi5jbG9zZXN0KCd0cicpLmRhdGEoJ25hbWUnKTtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgdGhlRm9ybSA9ICBpbnN0YWxsYXRpb25Gcm9tUmVwby4kaW5zdGFsbE1vZHVsZU1vZGFsRm9ybTtcbiAgICAgICAgICAgICAgICAgICAgdGhlRm9ybS5maW5kKCdzcGFuLm1vZHVsZS1uYW1lJykudGV4dChtb2R1bGVOYW1lKTtcblxuICAgICAgICAgICAgICAgICAgICBjb25zdCAkaW5zdGFsbGVkTW9kdWxlUm93ID0gJChgdHIubW9kdWxlLXJvd1tkYXRhLWlkPSR7bW9kdWxlVW5pcXVlSWR9XWApO1xuICAgICAgICAgICAgICAgICAgICBpZiAoJGluc3RhbGxlZE1vZHVsZVJvdy5sZW5ndGg+MCl7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBpbnN0YWxsZWRWZXJzaW9uID0gJGluc3RhbGxlZE1vZHVsZVJvdy5kYXRhKCd2ZXJzaW9uJyk7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXdWZXJzaW9uID0gJGN1cnJlbnRCdXR0b24uZGF0YSgndmVyc2lvbicpPz9pbnN0YWxsZWRWZXJzaW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1hcmtldHBsYWNlLnZlcnNpb25Db21wYXJlKG5ld1ZlcnNpb24sIGluc3RhbGxlZFZlcnNpb24pPjApe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoZUZvcm0uZmluZCgnc3Bhbi5hY3Rpb24nKS50ZXh0KGdsb2JhbFRyYW5zbGF0ZS5leHRfVXBkYXRlTW9kdWxlVGl0bGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoZUZvcm0uZmluZCgnZGl2LmRlc2NyaXB0aW9uJykuaHRtbChnbG9iYWxUcmFuc2xhdGUuZXh0X01vZHVsZVVwZGF0ZURlc2NyaXB0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlRm9ybS5maW5kKCdzcGFuLmFjdGlvbicpLnRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9Eb3duZ3JhZGVNb2R1bGVUaXRsZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhlRm9ybS5maW5kKCdkaXYuZGVzY3JpcHRpb24nKS5odG1sKGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlRG93bmdyYWRlRGVzY3JpcHRpb24pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhlRm9ybS5maW5kKCdzcGFuLmFjdGlvbicpLnRleHQoZ2xvYmFsVHJhbnNsYXRlLmV4dF9JbnN0YWxsTW9kdWxlVGl0bGUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhlRm9ybS5maW5kKCdkaXYuZGVzY3JpcHRpb24nKS5odG1sKGdsb2JhbFRyYW5zbGF0ZS5leHRfTW9kdWxlSW5zdGFsbERlc2NyaXB0aW9uKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25EZW55OiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgb25BcHByb3ZlOiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbGxhdGlvbkZyb21SZXBvLnJ1blNpbmdsZUluc3RhbGwobW9kdWxlVW5pcXVlSWQsIHJlbGVhc2VJZCk7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgLm1vZGFsKCdzaG93Jyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIE9wZW5zIHRoZSBjaGFuZ2Vsb2cgY29uZmlybWF0aW9uIG1vZGFsIGZvciBhIHNpbmdsZS1tb2R1bGUgdXBkYXRlLiBGZXRjaGVzIHJlbGVhc2VcbiAgICAgKiBpbmZvIGZyb20gdGhlIHJlcG9zaXRvcnksIHJlbmRlcnMgYWdncmVnYXRlZCBjaGFuZ2Vsb2cgZnJvbSB0aGUgaW5zdGFsbGVkIHZlcnNpb25cbiAgICAgKiB1cCB0byB0aGUgbGF0ZXN0IHJlbGVhc2UsIGFuZCBsZXRzIHRoZSB1c2VyIGNvbmZpcm0gb3IgY2FuY2VsLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRjdXJyZW50QnV0dG9uIC0gVGhlIGNsaWNrZWQgVXBkYXRlIGJ1dHRvbi5cbiAgICAgKi9cbiAgICBvcGVuVXBkYXRlQ2hhbmdlbG9nTW9kYWwoJGN1cnJlbnRCdXR0b24pIHtcbiAgICAgICAgY29uc3QgbW9kdWxlVW5pcXVlSWQgPSAkY3VycmVudEJ1dHRvbi5kYXRhKCd1bmlxaWQnKTtcbiAgICAgICAgY29uc3QgcmVsZWFzZUlkID0gJGN1cnJlbnRCdXR0b24uZGF0YSgncmVsZWFzZWlkJyk7XG4gICAgICAgIGNvbnN0ICRtb2RhbCA9IGluc3RhbGxhdGlvbkZyb21SZXBvLiR1cGRhdGVDaGFuZ2Vsb2dNb2RhbDtcbiAgICAgICAgY29uc3QgJGluc3RhbGxlZFJvdyA9ICQoYHRyLm1vZHVsZS1yb3dbZGF0YS1pZD0ke21vZHVsZVVuaXF1ZUlkfV1gKTtcbiAgICAgICAgY29uc3QgaW5zdGFsbGVkVmVyc2lvbiA9ICRpbnN0YWxsZWRSb3cubGVuZ3RoID4gMCA/IFN0cmluZygkaW5zdGFsbGVkUm93LmRhdGEoJ3ZlcnNpb24nKSB8fCAnJykgOiAnJztcbiAgICAgICAgY29uc3QgbW9kdWxlTmFtZSA9ICRjdXJyZW50QnV0dG9uLmNsb3Nlc3QoJ3RyJykuZGF0YSgnbmFtZScpXG4gICAgICAgICAgICB8fCAkaW5zdGFsbGVkUm93LmZpbmQoJ3RkLnNob3ctZGV0YWlscy1vbi1jbGljaycpLmZpcnN0KCkuY2xvbmUoKS5jaGlsZHJlbigpLnJlbW92ZSgpLmVuZCgpLnRleHQoKS50cmltKClcbiAgICAgICAgICAgIHx8IG1vZHVsZVVuaXF1ZUlkO1xuXG4gICAgICAgIGluc3RhbGxhdGlvbkZyb21SZXBvLnJlc2V0Q2hhbmdlbG9nTW9kYWwoJG1vZGFsKTtcbiAgICAgICAgJG1vZGFsLmZpbmQoJ3NwYW4uYWN0aW9uJykudGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X1VwZGF0ZU1vZHVsZVRpdGxlKTtcbiAgICAgICAgJG1vZGFsLmZpbmQoJ3NwYW4ubW9kdWxlLW5hbWUnKS50ZXh0KG1vZHVsZU5hbWUpO1xuXG4gICAgICAgIGluc3RhbGxhdGlvbkZyb21SZXBvLmNoYW5nZWxvZ0dlbiArPSAxO1xuICAgICAgICBjb25zdCBteUdlbiA9IGluc3RhbGxhdGlvbkZyb21SZXBvLmNoYW5nZWxvZ0dlbjtcblxuICAgICAgICAkbW9kYWwubW9kYWwoe1xuICAgICAgICAgICAgY2xvc2FibGU6IGZhbHNlLFxuICAgICAgICAgICAgb25EZW55OiAoKSA9PiB7XG4gICAgICAgICAgICAgICAgJCgnYS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkFwcHJvdmU6ICgpID0+IHtcbiAgICAgICAgICAgICAgICBpZiAoJG1vZGFsLmZpbmQoJy5hcHByb3ZlLmJ1dHRvbicpLmhhc0NsYXNzKCdkaXNhYmxlZCcpKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaW5zdGFsbGF0aW9uRnJvbVJlcG8ucnVuU2luZ2xlSW5zdGFsbChtb2R1bGVVbmlxdWVJZCwgcmVsZWFzZUlkKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgIH0pLm1vZGFsKCdzaG93Jyk7XG5cbiAgICAgICAgTW9kdWxlc0FQSS5nZXRNb2R1bGVJbmZvKHsgdW5pcWlkOiBtb2R1bGVVbmlxdWVJZCB9LCAocmVwb0RhdGEsIHN1Y2Nlc3MpID0+IHtcbiAgICAgICAgICAgIGlmIChteUdlbiAhPT0gaW5zdGFsbGF0aW9uRnJvbVJlcG8uY2hhbmdlbG9nR2VuKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuOyAvLyBhIG5ld2VyIG1vZGFsIG9wZW5pbmcgc3VwZXJzZWRlZCB0aGlzIHJlcXVlc3RcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghc3VjY2VzcyB8fCAhcmVwb0RhdGEgfHwgIUFycmF5LmlzQXJyYXkocmVwb0RhdGEucmVsZWFzZXMpKSB7XG4gICAgICAgICAgICAgICAgaW5zdGFsbGF0aW9uRnJvbVJlcG8uc2hvd0NoYW5nZWxvZ0Vycm9yKCRtb2RhbCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY29uc3QgbmV3ZXJSZWxlYXNlcyA9IGluc3RhbGxhdGlvbkZyb21SZXBvLmZpbHRlck5ld2VyUmVsZWFzZXMocmVwb0RhdGEucmVsZWFzZXMsIGluc3RhbGxlZFZlcnNpb24pO1xuICAgICAgICAgICAgY29uc3QgbGF0ZXN0VmVyc2lvbiA9IG5ld2VyUmVsZWFzZXMubGVuZ3RoID4gMCA/IG5ld2VyUmVsZWFzZXNbMF0udmVyc2lvbiA6IChyZXBvRGF0YS5yZWxlYXNlc1swXSAmJiByZXBvRGF0YS5yZWxlYXNlc1swXS52ZXJzaW9uKSB8fCAnJztcbiAgICAgICAgICAgIGNvbnN0IGludHJvID0gaW5zdGFsbGF0aW9uRnJvbVJlcG8uZm9ybWF0U3RyaW5nKFxuICAgICAgICAgICAgICAgIGdsb2JhbFRyYW5zbGF0ZS5leHRfVXBkYXRlQ2hhbmdlbG9nSW50cm8sXG4gICAgICAgICAgICAgICAgeyBuYW1lOiBtb2R1bGVOYW1lLCBmcm9tOiBpbnN0YWxsZWRWZXJzaW9uLCB0bzogbGF0ZXN0VmVyc2lvbiB9XG4gICAgICAgICAgICApO1xuICAgICAgICAgICAgaW5zdGFsbGF0aW9uRnJvbVJlcG8ucmVuZGVyQ2hhbmdlbG9nTW9kYWwoJG1vZGFsLCBpbnRybywgW3tcbiAgICAgICAgICAgICAgICBuYW1lOiBtb2R1bGVOYW1lLFxuICAgICAgICAgICAgICAgIHJlbGVhc2VzOiBuZXdlclJlbGVhc2VzLmxlbmd0aCA+IDAgPyBuZXdlclJlbGVhc2VzIDogcmVwb0RhdGEucmVsZWFzZXMuc2xpY2UoMCwgMSksXG4gICAgICAgICAgICB9XSk7XG4gICAgICAgIH0pO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSdW5zIHRoZSBhY3R1YWwgc2luZ2xlLW1vZHVsZSBpbnN0YWxsL3VwZGF0ZSBBUEkgY2FsbC4gRXh0cmFjdGVkIHNvIGJvdGggbW9kYWxzXG4gICAgICogKHNpbXBsZSBpbnN0YWxsIGFuZCBjaGFuZ2Vsb2cgY29uZmlybSkgY2FuIHNoYXJlIHRoZSBwb3N0LWNvbmZpcm0gbG9naWMuXG4gICAgICovXG4gICAgcnVuU2luZ2xlSW5zdGFsbChtb2R1bGVVbmlxdWVJZCwgcmVsZWFzZUlkKSB7XG4gICAgICAgICQoJ2EuYnV0dG9uJykuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG5cbiAgICAgICAgY29uc3QgcGFyYW1zID0ge1xuICAgICAgICAgICAgdW5pcWlkOiBtb2R1bGVVbmlxdWVJZCxcbiAgICAgICAgICAgIHJlbGVhc2VJZDogcmVsZWFzZUlkLFxuICAgICAgICAgICAgY2hhbm5lbElkOiBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5jaGFubmVsSWRcbiAgICAgICAgfTtcblxuICAgICAgICAkKGAjbW9kYWwtJHtwYXJhbXMudW5pcWlkfWApLm1vZGFsKCdoaWRlJyk7XG4gICAgICAgIGNvbnN0ICRtb2R1bGVCdXR0b25zID0gJChgYVtkYXRhLXVuaXFpZD0ke3BhcmFtcy51bmlxaWR9XWApO1xuXG4gICAgICAgICRtb2R1bGVCdXR0b25zLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAkbW9kdWxlQnV0dG9ucy5maW5kKCdpJylcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygnZG93bmxvYWQnKVxuICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdyZWRvJylcbiAgICAgICAgICAgIC5hZGRDbGFzcygnc3Bpbm5lciBsb2FkaW5nJyk7XG5cbiAgICAgICAgJCgndHIudGFibGUtZXJyb3ItbWVzc2FnZXMnKS5yZW1vdmUoKTtcbiAgICAgICAgJCgndHIuZXJyb3InKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcblxuICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5zdGFydFdhdGNoKHBhcmFtcy51bmlxaWQpO1xuICAgICAgICBNb2R1bGVzQVBJLmluc3RhbGxGcm9tUmVwbyhwYXJhbXMsIChyZXNwb25zZSwgc3VjY2VzcykgPT4ge1xuICAgICAgICAgICAgY29uc29sZS5kZWJ1ZyhyZXNwb25zZSk7XG4gICAgICAgICAgICAvLyBUaGUgYXN5bmMgYWNrIGNhcnJpZXMgbm8gYHJlc3VsdGAgZmllbGQg4oCUIG9ubHkgYW4gZXhwbGljaXQgcmVqZWN0aW9uIHN0b3BzIHRoZSB3YXRjaFxuICAgICAgICAgICAgaWYgKHN1Y2Nlc3MgIT09IGZhbHNlICYmIHJlc3BvbnNlLnJlc3VsdCAhPT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICAkKCdodG1sLCBib2R5JykuYW5pbWF0ZSh7XG4gICAgICAgICAgICAgICAgICAgIHNjcm9sbFRvcDogaW5zdGFsbGF0aW9uRnJvbVJlcG8uJHByb2dyZXNzQmFyQmxvY2sub2Zmc2V0KCkudG9wIC0gNTAsXG4gICAgICAgICAgICAgICAgfSwgMjAwMCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIC8vIENvbW1hbmQgcmVqZWN0ZWQgb3V0cmlnaHQg4oCUIG5vIHBvaW50IHdhaXRpbmcgZm9yIHRoZSB3YXRjaGRvZ1xuICAgICAgICAgICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLndhdGNoZG9nLnN0b3AoKTtcbiAgICAgICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5yZXNldEJ1dHRvblZpZXcoJG1vZHVsZUJ1dHRvbnMuY2xvc2VzdCgndHInKSk7XG4gICAgICAgICAgICAgICAgVXNlck1lc3NhZ2Uuc2hvd011bHRpU3RyaW5nKHJlc3BvbnNlLm1lc3NhZ2VzLCBnbG9iYWxUcmFuc2xhdGUuZXh0X0luc3RhbGxhdGlvbkVycm9yKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEluaXRpYXRlcyB0aGUgcHJvY2VzcyBvZiB1cGRhdGluZyBhbGwgaW5zdGFsbGVkIG1vZHVsZXMuIFRyaWdnZXJlZCBieSB0aGUgdXNlclxuICAgICAqIGNsaWNraW5nIHRoZSAnVXBkYXRlIEFsbCcgYnV0dG9uLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtFdmVudH0gZSAtIFRoZSBjbGljayBldmVudCBvYmplY3QgYXNzb2NpYXRlZCB3aXRoIHRoZSAnVXBkYXRlIEFsbCcgYnV0dG9uIGNsaWNrLlxuICAgICAqL1xuICAgIHVwZGF0ZUFsbE1vZHVsZXMoZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIGNvbnN0ICRjdXJyZW50QnV0dG9uID0gJChlLnRhcmdldCkuY2xvc2VzdCgnYScpO1xuICAgICAgICBpbnN0YWxsYXRpb25Gcm9tUmVwby5vcGVuVXBkYXRlQWxsTW9kdWxlc01vZGFsKCRjdXJyZW50QnV0dG9uKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogT3BlbnMgdGhlIGNoYW5nZWxvZyBjb25maXJtYXRpb24gbW9kYWwgZm9yIHRoZSBidWxrIHVwZGF0ZS4gRmV0Y2hlcyByZWxlYXNlIGluZm9cbiAgICAgKiBmb3IgZXZlcnkgbW9kdWxlIHRoYXQgaGFzIGFuIGF2YWlsYWJsZSB1cGRhdGUgYW5kIHJlbmRlcnMgYW4gYWdncmVnYXRlZCBjaGFuZ2Vsb2dcbiAgICAgKiAob25lIHNlY3Rpb24gcGVyIG1vZHVsZSkgYmVmb3JlIGFza2luZyB0aGUgdXNlciB0byBjb25maXJtLlxuICAgICAqXG4gICAgICogQHBhcmFtIHtqUXVlcnl9ICRjdXJyZW50QnV0dG9uIC0gVGhlICdVcGRhdGUgQWxsJyBidXR0b24uXG4gICAgICovXG4gICAgb3BlblVwZGF0ZUFsbE1vZHVsZXNNb2RhbCgkY3VycmVudEJ1dHRvbikge1xuICAgICAgICBjb25zdCAkbW9kYWwgPSBpbnN0YWxsYXRpb25Gcm9tUmVwby4kdXBkYXRlQ2hhbmdlbG9nTW9kYWw7XG4gICAgICAgIGNvbnN0IHVuaXF1ZU1vZHVsZXNGb3JVcGRhdGUgPSBuZXcgU2V0KCk7XG4gICAgICAgICQoJ2EudXBkYXRlJykuZWFjaCgoXywgYnV0dG9uKSA9PiB7XG4gICAgICAgICAgICB1bmlxdWVNb2R1bGVzRm9yVXBkYXRlLmFkZCgkKGJ1dHRvbikuZGF0YSgndW5pcWlkJykpO1xuICAgICAgICB9KTtcbiAgICAgICAgY29uc3QgbW9kdWxlc0ZvclVwZGF0ZSA9IFsuLi51bmlxdWVNb2R1bGVzRm9yVXBkYXRlXTtcblxuICAgICAgICBpZiAobW9kdWxlc0ZvclVwZGF0ZS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuXG4gICAgICAgIGluc3RhbGxhdGlvbkZyb21SZXBvLnJlc2V0Q2hhbmdlbG9nTW9kYWwoJG1vZGFsKTtcbiAgICAgICAgJG1vZGFsLmZpbmQoJ3NwYW4uYWN0aW9uJykudGV4dChnbG9iYWxUcmFuc2xhdGUuZXh0X1VwZGF0ZUFsbE1vZHVsZXNUaXRsZSk7XG4gICAgICAgICRtb2RhbC5maW5kKCdzcGFuLm1vZHVsZS1uYW1lJykudGV4dCgnJyk7XG5cbiAgICAgICAgaW5zdGFsbGF0aW9uRnJvbVJlcG8uY2hhbmdlbG9nR2VuICs9IDE7XG4gICAgICAgIGNvbnN0IG15R2VuID0gaW5zdGFsbGF0aW9uRnJvbVJlcG8uY2hhbmdlbG9nR2VuO1xuXG4gICAgICAgICRtb2RhbC5tb2RhbCh7XG4gICAgICAgICAgICBjbG9zYWJsZTogZmFsc2UsXG4gICAgICAgICAgICBvbkRlbnk6ICgpID0+IHtcbiAgICAgICAgICAgICAgICAkKCdhLmJ1dHRvbicpLnJlbW92ZUNsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uQXBwcm92ZTogKCkgPT4ge1xuICAgICAgICAgICAgICAgIGlmICgkbW9kYWwuZmluZCgnLmFwcHJvdmUuYnV0dG9uJykuaGFzQ2xhc3MoJ2Rpc2FibGVkJykpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBjb25zdCBzZWxlY3RlZCA9IGluc3RhbGxhdGlvbkZyb21SZXBvLmNvbGxlY3RTZWxlY3RlZE1vZHVsZXMoJG1vZGFsKTtcbiAgICAgICAgICAgICAgICBpZiAoc2VsZWN0ZWQubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaW5zdGFsbGF0aW9uRnJvbVJlcG8ucnVuVXBkYXRlQWxsKCRjdXJyZW50QnV0dG9uLCBzZWxlY3RlZCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgICB9LFxuICAgICAgICB9KS5tb2RhbCgnc2hvdycpO1xuXG4gICAgICAgIGNvbnN0IGZldGNoZWQgPSBbXTtcbiAgICAgICAgbGV0IHBlbmRpbmcgPSBtb2R1bGVzRm9yVXBkYXRlLmxlbmd0aDtcbiAgICAgICAgbGV0IGFueVN1Y2Nlc3MgPSBmYWxzZTtcblxuICAgICAgICBtb2R1bGVzRm9yVXBkYXRlLmZvckVhY2goKHVuaXFpZCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgJGluc3RhbGxlZFJvdyA9ICQoYHRyLm1vZHVsZS1yb3dbZGF0YS1pZD0ke3VuaXFpZH1dYCk7XG4gICAgICAgICAgICBjb25zdCBpbnN0YWxsZWRWZXJzaW9uID0gJGluc3RhbGxlZFJvdy5sZW5ndGggPiAwID8gU3RyaW5nKCRpbnN0YWxsZWRSb3cuZGF0YSgndmVyc2lvbicpIHx8ICcnKSA6ICcnO1xuICAgICAgICAgICAgY29uc3QgJGJ0biA9ICQoYGEudXBkYXRlW2RhdGEtdW5pcWlkPSR7dW5pcWlkfV1gKS5maXJzdCgpO1xuICAgICAgICAgICAgY29uc3QgbW9kdWxlTmFtZSA9ICRidG4uY2xvc2VzdCgndHInKS5kYXRhKCduYW1lJylcbiAgICAgICAgICAgICAgICB8fCAkaW5zdGFsbGVkUm93LmZpbmQoJ3RkLnNob3ctZGV0YWlscy1vbi1jbGljaycpLmZpcnN0KCkuY2xvbmUoKS5jaGlsZHJlbigpLnJlbW92ZSgpLmVuZCgpLnRleHQoKS50cmltKClcbiAgICAgICAgICAgICAgICB8fCB1bmlxaWQ7XG5cbiAgICAgICAgICAgIE1vZHVsZXNBUEkuZ2V0TW9kdWxlSW5mbyh7IHVuaXFpZDogdW5pcWlkIH0sIChyZXBvRGF0YSwgc3VjY2VzcykgPT4ge1xuICAgICAgICAgICAgICAgIGlmIChteUdlbiAhPT0gaW5zdGFsbGF0aW9uRnJvbVJlcG8uY2hhbmdlbG9nR2VuKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybjsgLy8gYSBuZXdlciBtb2RhbCBvcGVuaW5nIHN1cGVyc2VkZWQgdGhpcyBiYXRjaFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwZW5kaW5nIC09IDE7XG4gICAgICAgICAgICAgICAgaWYgKHN1Y2Nlc3MgJiYgcmVwb0RhdGEgJiYgQXJyYXkuaXNBcnJheShyZXBvRGF0YS5yZWxlYXNlcykpIHtcbiAgICAgICAgICAgICAgICAgICAgYW55U3VjY2VzcyA9IHRydWU7XG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IG5ld2VyUmVsZWFzZXMgPSBpbnN0YWxsYXRpb25Gcm9tUmVwby5maWx0ZXJOZXdlclJlbGVhc2VzKHJlcG9EYXRhLnJlbGVhc2VzLCBpbnN0YWxsZWRWZXJzaW9uKTtcbiAgICAgICAgICAgICAgICAgICAgZmV0Y2hlZC5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHVuaXFpZDogdW5pcWlkLFxuICAgICAgICAgICAgICAgICAgICAgICAgbmFtZTogbW9kdWxlTmFtZSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc3RhbGxlZFZlcnNpb246IGluc3RhbGxlZFZlcnNpb24sXG4gICAgICAgICAgICAgICAgICAgICAgICByZWxlYXNlczogbmV3ZXJSZWxlYXNlcy5sZW5ndGggPiAwID8gbmV3ZXJSZWxlYXNlcyA6IHJlcG9EYXRhLnJlbGVhc2VzLnNsaWNlKDAsIDEpLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBmZXRjaGVkLnB1c2goe1xuICAgICAgICAgICAgICAgICAgICAgICAgdW5pcWlkOiB1bmlxaWQsXG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBtb2R1bGVOYW1lLFxuICAgICAgICAgICAgICAgICAgICAgICAgaW5zdGFsbGVkVmVyc2lvbjogaW5zdGFsbGVkVmVyc2lvbixcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbGVhc2VzOiBbXSxcbiAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBpZiAocGVuZGluZyA9PT0gMCkge1xuICAgICAgICAgICAgICAgICAgICBpZiAoIWFueVN1Y2Nlc3MpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGluc3RhbGxhdGlvbkZyb21SZXBvLnNob3dDaGFuZ2Vsb2dFcnJvcigkbW9kYWwpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIGZldGNoZWQuc29ydCgoYSwgYikgPT4gYS5uYW1lLmxvY2FsZUNvbXBhcmUoYi5uYW1lKSk7XG4gICAgICAgICAgICAgICAgICAgIGluc3RhbGxhdGlvbkZyb21SZXBvLnJlbmRlck11bHRpU2VsZWN0TW9kYWwoXG4gICAgICAgICAgICAgICAgICAgICAgICAkbW9kYWwsXG4gICAgICAgICAgICAgICAgICAgICAgICBnbG9iYWxUcmFuc2xhdGUuZXh0X1VwZGF0ZUFsbE1vZHVsZXNDaGFuZ2Vsb2dJbnRybyxcbiAgICAgICAgICAgICAgICAgICAgICAgIGZldGNoZWRcbiAgICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgfSk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlYWRzIGNoZWNrZWQgY2hlY2tib3hlcyBpbnNpZGUgdGhlIG1vZGFsIGFuZCByZXR1cm5zIHRoZSBsaXN0IG9mIHNlbGVjdGVkIHVuaXFpZHMuXG4gICAgICogRmFsbHMgYmFjayB0byBhbGwga25vd24gdW5pcWlkcyB3aGVuIG5vIGNoZWNrYm94ZXMgYXJlIHJlbmRlcmVkIChzaW5nbGUtbW9kdWxlIGNhc2UpLlxuICAgICAqL1xuICAgIGNvbGxlY3RTZWxlY3RlZE1vZHVsZXMoJG1vZGFsKSB7XG4gICAgICAgIGNvbnN0ICRib3hlcyA9ICRtb2RhbC5maW5kKCcudXBkYXRlLW1vZHVsZS1jaGVja2JveCBpbnB1dFt0eXBlPVwiY2hlY2tib3hcIl06Y2hlY2tlZCcpO1xuICAgICAgICBpZiAoJGJveGVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIFtdO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IFtdO1xuICAgICAgICAkYm94ZXMuZWFjaCgoXywgZWwpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHVuaXFpZCA9ICQoZWwpLmNsb3Nlc3QoJy51cGRhdGUtbW9kdWxlLWNoZWNrYm94JykuZGF0YSgndW5pcWlkJyk7XG4gICAgICAgICAgICBpZiAodW5pcWlkKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0LnB1c2godW5pcWlkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJ1bnMgdGhlIGFjdHVhbCBidWxrIHVwZGF0ZSBBUEkgY2FsbCBhZnRlciB1c2VyIGNvbmZpcm1lZCBpbiB0aGUgY2hhbmdlbG9nIG1vZGFsLlxuICAgICAqL1xuICAgIHJ1blVwZGF0ZUFsbCgkY3VycmVudEJ1dHRvbiwgbW9kdWxlc0ZvclVwZGF0ZSkge1xuICAgICAgICAkKCdhLmJ1dHRvbicpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgICAgICAkY3VycmVudEJ1dHRvbi5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgJGN1cnJlbnRCdXR0b24uZmluZCgnaS5pY29uJylcbiAgICAgICAgICAgIC5yZW1vdmVDbGFzcygncmVkbycpXG4gICAgICAgICAgICAuYWRkQ2xhc3MoJ3NwaW5uZXIgbG9hZGluZycpO1xuXG4gICAgICAgIGluc3RhbGxTdGF0dXNMb29wV29ya2VyLnN0YXJ0QmF0Y2hVcGRhdGUobW9kdWxlc0ZvclVwZGF0ZSk7XG4gICAgICAgIGNvbnN0IHBhcmFtcyA9IHtcbiAgICAgICAgICAgIGNoYW5uZWxJZDogaW5zdGFsbFN0YXR1c0xvb3BXb3JrZXIuY2hhbm5lbElkLFxuICAgICAgICAgICAgbW9kdWxlc0ZvclVwZGF0ZTogbW9kdWxlc0ZvclVwZGF0ZSxcbiAgICAgICAgfTtcbiAgICAgICAgTW9kdWxlc0FQSS51cGRhdGVBbGwocGFyYW1zLCAocmVzcG9uc2UsIHN1Y2Nlc3MpID0+IHtcbiAgICAgICAgICAgIGNvbnNvbGUuZGVidWcocmVzcG9uc2UpO1xuICAgICAgICAgICAgaWYgKHN1Y2Nlc3MgPT09IGZhbHNlIHx8IHJlc3BvbnNlLnJlc3VsdCA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgICBpbnN0YWxsU3RhdHVzTG9vcFdvcmtlci5yZXNldEJhdGNoVXBkYXRlKCk7XG4gICAgICAgICAgICAgICAgaW5zdGFsbGF0aW9uRnJvbVJlcG8uJHByb2dyZXNzQmFyQmxvY2suaGlkZSgpO1xuICAgICAgICAgICAgICAgICQoJ2EuYnV0dG9uJykucmVtb3ZlQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICAgICAgJGN1cnJlbnRCdXR0b24uZmluZCgnaS5pY29uJylcbiAgICAgICAgICAgICAgICAgICAgLnJlbW92ZUNsYXNzKCdzcGlubmVyIGxvYWRpbmcnKVxuICAgICAgICAgICAgICAgICAgICAuYWRkQ2xhc3MoJ3JlZG8nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgJCgndHIudGFibGUtZXJyb3ItbWVzc2FnZXMnKS5yZW1vdmUoKTtcbiAgICAgICAgJCgndHIuZXJyb3InKS5yZW1vdmVDbGFzcygnZXJyb3InKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVzZXRzIHRoZSBjaGFuZ2Vsb2cgbW9kYWwgdG8gaXRzIGxvYWRpbmcgc3RhdGUgYmVmb3JlIGEgbmV3IGZldGNoLlxuICAgICAqL1xuICAgIHJlc2V0Q2hhbmdlbG9nTW9kYWwoJG1vZGFsKSB7XG4gICAgICAgICRtb2RhbC5maW5kKCcuY2hhbmdlbG9nLWxvYWRlcicpLnNob3coKTtcbiAgICAgICAgJG1vZGFsLmZpbmQoJy5jaGFuZ2Vsb2ctaW50cm8nKS5oaWRlKCkuZW1wdHkoKTtcbiAgICAgICAgJG1vZGFsLmZpbmQoJy5jaGFuZ2Vsb2ctYm9keScpLmhpZGUoKS5lbXB0eSgpO1xuICAgICAgICAkbW9kYWwuZmluZCgnLmNoYW5nZWxvZy1lcnJvcicpLmhpZGUoKTtcbiAgICAgICAgJG1vZGFsLmZpbmQoJy5hcHByb3ZlLmJ1dHRvbicpLmFkZENsYXNzKCdkaXNhYmxlZCcpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTaG93cyB0aGUgZXJyb3IgbWVzc2FnZSBpbnNpZGUgdGhlIGNoYW5nZWxvZyBtb2RhbCBhbmQgZGlzYWJsZXMgQ29uZmlybS5cbiAgICAgKi9cbiAgICBzaG93Q2hhbmdlbG9nRXJyb3IoJG1vZGFsKSB7XG4gICAgICAgICRtb2RhbC5maW5kKCcuY2hhbmdlbG9nLWxvYWRlcicpLmhpZGUoKTtcbiAgICAgICAgJG1vZGFsLmZpbmQoJy5jaGFuZ2Vsb2ctZXJyb3InKS5zaG93KCk7XG4gICAgICAgICRtb2RhbC5maW5kKCcuYXBwcm92ZS5idXR0b24nKS5hZGRDbGFzcygnZGlzYWJsZWQnKTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogUmVuZGVycyB0aGUgY2hhbmdlbG9nIG1vZGFsIGNvbnRlbnQgZm9yIGEgc2luZ2xlLW1vZHVsZSB1cGRhdGUuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJG1vZGFsXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGludHJvVGV4dFxuICAgICAqIEBwYXJhbSB7QXJyYXk8e25hbWU6c3RyaW5nLCByZWxlYXNlczpBcnJheSwgZXJyb3I/OmJvb2xlYW59Pn0gZW50cmllc1xuICAgICAqL1xuICAgIHJlbmRlckNoYW5nZWxvZ01vZGFsKCRtb2RhbCwgaW50cm9UZXh0LCBlbnRyaWVzKSB7XG4gICAgICAgICRtb2RhbC5maW5kKCcuY2hhbmdlbG9nLWxvYWRlcicpLmhpZGUoKTtcblxuICAgICAgICBpZiAoaW50cm9UZXh0KSB7XG4gICAgICAgICAgICAkbW9kYWwuZmluZCgnLmNoYW5nZWxvZy1pbnRybycpLmh0bWwoaW50cm9UZXh0KS5zaG93KCk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuICAgICAgICBlbnRyaWVzLmZvckVhY2goKGVudHJ5KSA9PiB7XG4gICAgICAgICAgICBodG1sICs9IGluc3RhbGxhdGlvbkZyb21SZXBvLnJlbmRlckVudHJ5UmVsZWFzZXMoZW50cnkpO1xuICAgICAgICB9KTtcblxuICAgICAgICAkbW9kYWwuZmluZCgnLmNoYW5nZWxvZy1ib2R5JykuaHRtbChodG1sKS5zaG93KCk7XG4gICAgICAgICRtb2RhbC5maW5kKCcuYXBwcm92ZS5idXR0b24nKS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgJG1vZGFsLm1vZGFsKCdyZWZyZXNoJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIFJlbmRlcnMgdGhlIG11bHRpLW1vZHVsZSB1cGRhdGUgbW9kYWwgYXMgYSBjaGVja2JveCBsaXN0IHdpdGggY29sbGFwc2libGVcbiAgICAgKiBjaGFuZ2Vsb2cgYWNjb3JkaW9uIHBlciBtb2R1bGUuIFRoZSB1c2VyIGNhbiBkZXNlbGVjdCBtb2R1bGVzIHRoZXkgZG8gbm90XG4gICAgICogd2FudCB0byB1cGRhdGU7IENvbmZpcm0gaXMgZGlzYWJsZWQgd2hpbGUgbm8gbW9kdWxlIGlzIGNoZWNrZWQuXG4gICAgICpcbiAgICAgKiBAcGFyYW0ge2pRdWVyeX0gJG1vZGFsXG4gICAgICogQHBhcmFtIHtzdHJpbmd9IGludHJvVGV4dFxuICAgICAqIEBwYXJhbSB7QXJyYXk8e3VuaXFpZDpzdHJpbmcsIG5hbWU6c3RyaW5nLCBpbnN0YWxsZWRWZXJzaW9uOnN0cmluZywgcmVsZWFzZXM6QXJyYXksIGVycm9yPzpib29sZWFufT59IGVudHJpZXNcbiAgICAgKi9cbiAgICByZW5kZXJNdWx0aVNlbGVjdE1vZGFsKCRtb2RhbCwgaW50cm9UZXh0LCBlbnRyaWVzKSB7XG4gICAgICAgICRtb2RhbC5maW5kKCcuY2hhbmdlbG9nLWxvYWRlcicpLmhpZGUoKTtcblxuICAgICAgICBpZiAoaW50cm9UZXh0KSB7XG4gICAgICAgICAgICAkbW9kYWwuZmluZCgnLmNoYW5nZWxvZy1pbnRybycpLmh0bWwoaW50cm9UZXh0KS5zaG93KCk7XG4gICAgICAgIH1cblxuICAgICAgICBsZXQgaHRtbCA9ICc8ZGl2IGNsYXNzPVwidWkgc3R5bGVkIGZsdWlkIGFjY29yZGlvbiB1cGRhdGUtbW9kdWxlcy1hY2NvcmRpb25cIj4nO1xuICAgICAgICBlbnRyaWVzLmZvckVhY2goKGVudHJ5KSA9PiB7XG4gICAgICAgICAgICBjb25zdCBuZXdlc3QgPSBlbnRyeS5yZWxlYXNlcyAmJiBlbnRyeS5yZWxlYXNlc1swXSAmJiBlbnRyeS5yZWxlYXNlc1swXS52ZXJzaW9uXG4gICAgICAgICAgICAgICAgPyBlbnRyeS5yZWxlYXNlc1swXS52ZXJzaW9uXG4gICAgICAgICAgICAgICAgOiAnJztcbiAgICAgICAgICAgIGxldCB2ZXJzaW9uSW5mbyA9ICcnO1xuICAgICAgICAgICAgaWYgKGVudHJ5Lmluc3RhbGxlZFZlcnNpb24gJiYgbmV3ZXN0KSB7XG4gICAgICAgICAgICAgICAgdmVyc2lvbkluZm8gPSBgIDxzcGFuIGNsYXNzPVwidWkgc21hbGwgZ3JleSB0ZXh0XCI+JHtpbnN0YWxsYXRpb25Gcm9tUmVwby5lc2NhcGVIdG1sKGVudHJ5Lmluc3RhbGxlZFZlcnNpb24pfSDihpIgJHtpbnN0YWxsYXRpb25Gcm9tUmVwby5lc2NhcGVIdG1sKG5ld2VzdCl9PC9zcGFuPmA7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKG5ld2VzdCkge1xuICAgICAgICAgICAgICAgIHZlcnNpb25JbmZvID0gYCA8c3BhbiBjbGFzcz1cInVpIHNtYWxsIGdyZXkgdGV4dFwiPiR7aW5zdGFsbGF0aW9uRnJvbVJlcG8uZXNjYXBlSHRtbChuZXdlc3QpfTwvc3Bhbj5gO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwidGl0bGVcIj4nO1xuICAgICAgICAgICAgaHRtbCArPSAnPGkgY2xhc3M9XCJkcm9wZG93biBpY29uXCI+PC9pPic7XG4gICAgICAgICAgICBodG1sICs9IGA8ZGl2IGNsYXNzPVwidWkgY2hlY2tib3ggdXBkYXRlLW1vZHVsZS1jaGVja2JveFwiIGRhdGEtdW5pcWlkPVwiJHtpbnN0YWxsYXRpb25Gcm9tUmVwby5lc2NhcGVIdG1sKGVudHJ5LnVuaXFpZCl9XCI+YDtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBjaGVja2VkIC8+JztcbiAgICAgICAgICAgIGh0bWwgKz0gYDxsYWJlbD48Yj4ke2luc3RhbGxhdGlvbkZyb21SZXBvLmVzY2FwZUh0bWwoZW50cnkubmFtZSl9PC9iPiR7dmVyc2lvbkluZm99PC9sYWJlbD5gO1xuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG4gICAgICAgICAgICBodG1sICs9ICc8ZGl2IGNsYXNzPVwiY29udGVudFwiPic7XG4gICAgICAgICAgICBodG1sICs9IGluc3RhbGxhdGlvbkZyb21SZXBvLnJlbmRlckVudHJ5UmVsZWFzZXMoZW50cnkpO1xuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgfSk7XG4gICAgICAgIGh0bWwgKz0gJzwvZGl2Pic7XG5cbiAgICAgICAgY29uc3QgJGJvZHkgPSAkbW9kYWwuZmluZCgnLmNoYW5nZWxvZy1ib2R5Jyk7XG4gICAgICAgICRib2R5Lmh0bWwoaHRtbCkuc2hvdygpO1xuXG4gICAgICAgIGNvbnN0ICRhY2NvcmRpb24gPSAkYm9keS5maW5kKCcudXBkYXRlLW1vZHVsZXMtYWNjb3JkaW9uJyk7XG4gICAgICAgICRhY2NvcmRpb24uYWNjb3JkaW9uKHsgZXhjbHVzaXZlOiBmYWxzZSB9KTtcblxuICAgICAgICAvLyBTdG9wIGNoZWNrYm94IGNsaWNrcyBmcm9tIHRvZ2dsaW5nIHRoZSBhY2NvcmRpb24gdGl0bGUuXG4gICAgICAgICRhY2NvcmRpb24uZmluZCgnLnVwZGF0ZS1tb2R1bGUtY2hlY2tib3gnKS5vbignY2xpY2snLCAoZSkgPT4ge1xuICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICAgICAgfSk7XG4gICAgICAgICRhY2NvcmRpb24uZmluZCgnLnVpLmNoZWNrYm94LnVwZGF0ZS1tb2R1bGUtY2hlY2tib3gnKS5jaGVja2JveCgpO1xuXG4gICAgICAgIGNvbnN0ICRhcHByb3ZlID0gJG1vZGFsLmZpbmQoJy5hcHByb3ZlLmJ1dHRvbicpO1xuICAgICAgICBjb25zdCByZWZyZXNoQXBwcm92ZVN0YXRlID0gKCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgYW55Q2hlY2tlZCA9ICRhY2NvcmRpb24uZmluZCgnLnVwZGF0ZS1tb2R1bGUtY2hlY2tib3ggaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdOmNoZWNrZWQnKS5sZW5ndGggPiAwO1xuICAgICAgICAgICAgaWYgKGFueUNoZWNrZWQpIHtcbiAgICAgICAgICAgICAgICAkYXBwcm92ZS5yZW1vdmVDbGFzcygnZGlzYWJsZWQnKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgJGFwcHJvdmUuYWRkQ2xhc3MoJ2Rpc2FibGVkJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgICRhY2NvcmRpb24uZmluZCgnLnVwZGF0ZS1tb2R1bGUtY2hlY2tib3ggaW5wdXRbdHlwZT1cImNoZWNrYm94XCJdJykub24oJ2NoYW5nZScsIHJlZnJlc2hBcHByb3ZlU3RhdGUpO1xuICAgICAgICByZWZyZXNoQXBwcm92ZVN0YXRlKCk7XG5cbiAgICAgICAgJG1vZGFsLm1vZGFsKCdyZWZyZXNoJyk7XG4gICAgfSxcblxuICAgIC8qKlxuICAgICAqIEJ1aWxkcyB0aGUgcGVyLXJlbGVhc2UgY2hhbmdlbG9nIEhUTUwgZm9yIG9uZSBtb2R1bGUgZW50cnkuXG4gICAgICogVXNlZCBieSBib3RoIHNpbmdsZS0gYW5kIG11bHRpLW1vZHVsZSByZW5kZXJlcnMuXG4gICAgICovXG4gICAgcmVuZGVyRW50cnlSZWxlYXNlcyhlbnRyeSkge1xuICAgICAgICBpZiAoZW50cnkuZXJyb3IpIHtcbiAgICAgICAgICAgIHJldHVybiBgPGRpdiBjbGFzcz1cInVpIHdhcm5pbmcgbWVzc2FnZVwiPiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9GYWlsZWRUb0xvYWRDaGFuZ2Vsb2d9PC9kaXY+YDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWVudHJ5LnJlbGVhc2VzIHx8IGVudHJ5LnJlbGVhc2VzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGA8ZGl2IGNsYXNzPVwidWkgYmFzaWMgc2VnbWVudFwiPjxpPiR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9Ob0NoYW5nZWxvZ0F2YWlsYWJsZX08L2k+PC9kaXY+YDtcbiAgICAgICAgfVxuICAgICAgICBsZXQgaHRtbCA9ICcnO1xuICAgICAgICBlbnRyeS5yZWxlYXNlcy5mb3JFYWNoKChyZWxlYXNlKSA9PiB7XG4gICAgICAgICAgICBjb25zdCByZWxlYXNlRGF0ZSA9IHJlbGVhc2UuY3JlYXRlZCA/IFN0cmluZyhyZWxlYXNlLmNyZWF0ZWQpLnNwbGl0KCcgJylbMF0gOiAnJztcbiAgICAgICAgICAgIGNvbnN0IGNoYW5nZUxvZ1RleHQgPSBpbnN0YWxsYXRpb25Gcm9tUmVwby5mb3JtYXRDaGFuZ2Vsb2dUZXh0KHJlbGVhc2UuY2hhbmdlbG9nKTtcbiAgICAgICAgICAgIGh0bWwgKz0gJzxkaXYgY2xhc3M9XCJ1aSBjbGVhcmluZyBzZWdtZW50XCI+JztcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJ1aSB0b3AgYXR0YWNoZWQgbGFiZWxcIj4ke2dsb2JhbFRyYW5zbGF0ZS5leHRfSW5zdGFsbE1vZHVsZVJlbGVhc2VUYWd9OiAke2luc3RhbGxhdGlvbkZyb21SZXBvLmVzY2FwZUh0bWwocmVsZWFzZS52ZXJzaW9uKX1gO1xuICAgICAgICAgICAgaWYgKHJlbGVhc2VEYXRlKSB7XG4gICAgICAgICAgICAgICAgaHRtbCArPSBgICR7Z2xvYmFsVHJhbnNsYXRlLmV4dF9Gcm9tRGF0ZX0gJHtpbnN0YWxsYXRpb25Gcm9tUmVwby5lc2NhcGVIdG1sKHJlbGVhc2VEYXRlKX1gO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgICAgIGh0bWwgKz0gYDxkaXYgY2xhc3M9XCJ1aSBiYXNpYyBzZWdtZW50XCI+PHA+JHtjaGFuZ2VMb2dUZXh0fTwvcD48L2Rpdj5gO1xuICAgICAgICAgICAgaHRtbCArPSAnPC9kaXY+JztcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBodG1sO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBTYWZlbHkgZm9ybWF0cyBhIHJlcG9zaXRvcnktcHJvdmlkZWQgY2hhbmdlbG9nIHZhbHVlIGZvciBIVE1MIGluc2VydGlvbi5cbiAgICAgKiBUcmVhdHMgbnVsbC91bmRlZmluZWQvZW1wdHkgdmFsdWVzIGFzIG1pc3NpbmcgKHJlbmRlcnMgYW4gaXRhbGljIHBsYWNlaG9sZGVyKSxcbiAgICAgKiBIVE1MLWVzY2FwZXMgdGhlIHJhdyB0ZXh0LCBhbmQgY29udmVydHMgbmV3bGluZXMgdG8gYDxicj5gIHNvIHBsYWluLXRleHRcbiAgICAgKiBjaGFuZ2Vsb2dzIGtlZXAgdGhlaXIgbGluZSBicmVha3Mgd2l0aG91dCBhbGxvd2luZyBhcmJpdHJhcnkgbWFya3VwLlxuICAgICAqL1xuICAgIGZvcm1hdENoYW5nZWxvZ1RleHQocmF3KSB7XG4gICAgICAgIGlmIChyYXcgPT09IG51bGwgfHwgcmF3ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBgPGk+JHtnbG9iYWxUcmFuc2xhdGUuZXh0X05vQ2hhbmdlbG9nQXZhaWxhYmxlfTwvaT5gO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IHRleHQgPSBTdHJpbmcocmF3KTtcbiAgICAgICAgaWYgKHRleHQgPT09ICcnIHx8IHRleHQgPT09ICdudWxsJyB8fCB0ZXh0ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgcmV0dXJuIGA8aT4ke2dsb2JhbFRyYW5zbGF0ZS5leHRfTm9DaGFuZ2Vsb2dBdmFpbGFibGV9PC9pPmA7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZXNjYXBlZCA9IGluc3RhbGxhdGlvbkZyb21SZXBvLmVzY2FwZUh0bWwodGV4dCk7XG4gICAgICAgIGlmIChlc2NhcGVkLnRyaW0oKSA9PT0gJycpIHtcbiAgICAgICAgICAgIHJldHVybiBgPGk+JHtnbG9iYWxUcmFuc2xhdGUuZXh0X05vQ2hhbmdlbG9nQXZhaWxhYmxlfTwvaT5gO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBlc2NhcGVkLnJlcGxhY2UoL1xcbi9nLCAnPGJyPicpO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBGaWx0ZXJzIHRoZSByZWxlYXNlcyBhcnJheSB0byBpbmNsdWRlIG9ubHkgdmVyc2lvbnMgbmV3ZXIgdGhhbiB0aGUgaW5zdGFsbGVkIG9uZS5cbiAgICAgKiBSZXR1cm5zIHRoZW0gc29ydGVkIGRlc2NlbmRpbmcgKG5ld2VzdCBmaXJzdCkuXG4gICAgICovXG4gICAgZmlsdGVyTmV3ZXJSZWxlYXNlcyhyZWxlYXNlcywgaW5zdGFsbGVkVmVyc2lvbikge1xuICAgICAgICBpZiAoIWluc3RhbGxlZFZlcnNpb24pIHtcbiAgICAgICAgICAgIHJldHVybiByZWxlYXNlcy5zbGljZSgpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG5ld2VyID0gcmVsZWFzZXMuZmlsdGVyKChyZWxlYXNlKSA9PiB7XG4gICAgICAgICAgICBpZiAoIXJlbGVhc2UgfHwgIXJlbGVhc2UudmVyc2lvbikge1xuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBtYXJrZXRwbGFjZS52ZXJzaW9uQ29tcGFyZShTdHJpbmcocmVsZWFzZS52ZXJzaW9uKSwgU3RyaW5nKGluc3RhbGxlZFZlcnNpb24pKSA+IDA7XG4gICAgICAgIH0pO1xuICAgICAgICBuZXdlci5zb3J0KChhLCBiKSA9PiBtYXJrZXRwbGFjZS52ZXJzaW9uQ29tcGFyZShTdHJpbmcoYi52ZXJzaW9uKSwgU3RyaW5nKGEudmVyc2lvbikpKTtcbiAgICAgICAgcmV0dXJuIG5ld2VyO1xuICAgIH0sXG5cbiAgICAvKipcbiAgICAgKiBSZXBsYWNlcyAlcGxhY2Vob2xkZXJzJSBpbiBhIHRyYW5zbGF0aW9uIHRlbXBsYXRlIHdpdGggdmFsdWVzIGZyb20gYSBtYXAuXG4gICAgICogU2luZ2xlLXBhc3Mgc3Vic3RpdHV0aW9uIHNvIGEgcmVwbGFjZW1lbnQgdmFsdWUgY29udGFpbmluZyBhbm90aGVyIHBsYWNlaG9sZGVyXG4gICAgICogbGl0ZXJhbCAoZS5nLiBhIG1vZHVsZSBuYW1lZCBcIiVmcm9tJVwiKSBpcyBub3QgcmUtZXhwYW5kZWQuXG4gICAgICovXG4gICAgZm9ybWF0U3RyaW5nKHRlbXBsYXRlLCByZXBsYWNlbWVudHMpIHtcbiAgICAgICAgaWYgKCF0ZW1wbGF0ZSkge1xuICAgICAgICAgICAgcmV0dXJuICcnO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG1hcCA9IHJlcGxhY2VtZW50cyB8fCB7fTtcbiAgICAgICAgcmV0dXJuIHRlbXBsYXRlLnJlcGxhY2UoLyUoW2EtekEtWjAtOV9dKyklL2csIChtYXRjaCwga2V5KSA9PiB7XG4gICAgICAgICAgICBpZiAoIU9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChtYXAsIGtleSkpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gbWF0Y2g7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCByYXcgPSBtYXBba2V5XTtcbiAgICAgICAgICAgIHJldHVybiBpbnN0YWxsYXRpb25Gcm9tUmVwby5lc2NhcGVIdG1sKFN0cmluZyhyYXcgIT09IHVuZGVmaW5lZCAmJiByYXcgIT09IG51bGwgPyByYXcgOiAnJykpO1xuICAgICAgICB9KTtcbiAgICB9LFxuXG4gICAgLyoqXG4gICAgICogTWluaW1hbCBIVE1MIGVzY2FwZSBmb3IgdmFsdWVzIGluamVjdGVkIGludG8gdGhlIGNoYW5nZWxvZyBtb2RhbC5cbiAgICAgKi9cbiAgICBlc2NhcGVIdG1sKHZhbHVlKSB7XG4gICAgICAgIHJldHVybiBTdHJpbmcodmFsdWUpXG4gICAgICAgICAgICAucmVwbGFjZSgvJi9nLCAnJmFtcDsnKVxuICAgICAgICAgICAgLnJlcGxhY2UoLzwvZywgJyZsdDsnKVxuICAgICAgICAgICAgLnJlcGxhY2UoLz4vZywgJyZndDsnKVxuICAgICAgICAgICAgLnJlcGxhY2UoL1wiL2csICcmcXVvdDsnKVxuICAgICAgICAgICAgLnJlcGxhY2UoLycvZywgJyYjMzk7Jyk7XG4gICAgfSxcblxufTtcblxuLy8gSW5pdGlhbGl6ZXMgdGhlIGluc3RhbGxhdGlvbkZyb21SZXBvIG1vZHVsZSB3aGVuIHRoZSBkb2N1bWVudCBpcyByZWFkeSxcbi8vIHByZXBhcmluZyB0aGUgZXh0ZW5zaW9uIG1vZHVsZXMgbWFuYWdlbWVudCBVSS5cbiQoZG9jdW1lbnQpLnJlYWR5KCgpID0+IHtcbiAgICBpbnN0YWxsYXRpb25Gcm9tUmVwby5pbml0aWFsaXplKCk7XG59KTtcbiJdfQ==