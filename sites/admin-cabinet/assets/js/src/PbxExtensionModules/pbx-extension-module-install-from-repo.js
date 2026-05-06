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
const installationFromRepo = {

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
    initialize() {
        installationFromRepo.initializeButtonEvents();
        installationFromRepo.$progressBarBlock.hide();
        installationFromRepo.$btnUpdateAllModules.hide(); // Until at least one update available
    },

    /**
     * Sets up event handlers for button clicks within the module.
     * Update buttons go through a changelog confirmation modal; install/downgrade buttons
     * go through the original simple confirmation modal.
     */
    initializeButtonEvents() {
        // New install / explicit version download (per-release in detail popup) -> simple modal
        $(document).on('click', 'a.download', (e) => {
            e.preventDefault();
            const $currentButton = $(e.target).closest('a.button');
            if (globalPBXLicense.trim() === '') {
                window.location = `${globalRootUrl}pbx-extension-modules/index#/licensing`;
            } else {
                installationFromRepo.openInstallModuleModal($currentButton);
            }
        });

        // Single-module update -> changelog confirmation modal (current -> latest)
        $(document).on('click', 'a.update', (e) => {
            e.preventDefault();
            const $currentButton = $(e.target).closest('a.button');
            if (globalPBXLicense.trim() === '') {
                window.location = `${globalRootUrl}pbx-extension-modules/index#/licensing`;
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
    openInstallModuleModal($currentButton) {
        const moduleUniqueId = $currentButton.data('uniqid');
        const releaseId = $currentButton.data('releaseid');
        installationFromRepo.$installModuleModalForm
            .modal({
                closable: false,
                onShow: () => {
                    const moduleName = $currentButton.closest('tr').data('name');
                    const theForm =  installationFromRepo.$installModuleModalForm;
                    theForm.find('span.module-name').text(moduleName);

                    const $installedModuleRow = $(`tr.module-row[data-id=${moduleUniqueId}]`);
                    if ($installedModuleRow.length>0){
                        const installedVersion = $installedModuleRow.data('version');
                        const newVersion = $currentButton.data('version')??installedVersion;
                        if (marketplace.versionCompare(newVersion, installedVersion)>0){
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
                onDeny: () => {
                    $('a.button').removeClass('disabled');
                    return true;
                },
                onApprove: () => {
                    installationFromRepo.runSingleInstall(moduleUniqueId, releaseId);
                    return true;
                },
            })
            .modal('show');
    },

    /**
     * Opens the changelog confirmation modal for a single-module update. Fetches release
     * info from the repository, renders aggregated changelog from the installed version
     * up to the latest release, and lets the user confirm or cancel.
     *
     * @param {jQuery} $currentButton - The clicked Update button.
     */
    openUpdateChangelogModal($currentButton) {
        const moduleUniqueId = $currentButton.data('uniqid');
        const releaseId = $currentButton.data('releaseid');
        const $modal = installationFromRepo.$updateChangelogModal;
        const $installedRow = $(`tr.module-row[data-id=${moduleUniqueId}]`);
        const installedVersion = $installedRow.length > 0 ? String($installedRow.data('version') || '') : '';
        const moduleName = $currentButton.closest('tr').data('name')
            || $installedRow.find('td.show-details-on-click').first().clone().children().remove().end().text().trim()
            || moduleUniqueId;

        installationFromRepo.resetChangelogModal($modal);
        $modal.find('span.action').text(globalTranslate.ext_UpdateModuleTitle);
        $modal.find('span.module-name').text(moduleName);

        installationFromRepo.changelogGen += 1;
        const myGen = installationFromRepo.changelogGen;

        $modal.modal({
            closable: false,
            onDeny: () => {
                $('a.button').removeClass('disabled');
                return true;
            },
            onApprove: () => {
                if ($modal.find('.approve.button').hasClass('disabled')) {
                    return false;
                }
                installationFromRepo.runSingleInstall(moduleUniqueId, releaseId);
                return true;
            },
        }).modal('show');

        ModulesAPI.getModuleInfo({ uniqid: moduleUniqueId }, (repoData, success) => {
            if (myGen !== installationFromRepo.changelogGen) {
                return; // a newer modal opening superseded this request
            }
            if (!success || !repoData || !Array.isArray(repoData.releases)) {
                installationFromRepo.showChangelogError($modal);
                return;
            }
            const newerReleases = installationFromRepo.filterNewerReleases(repoData.releases, installedVersion);
            const latestVersion = newerReleases.length > 0 ? newerReleases[0].version : (repoData.releases[0] && repoData.releases[0].version) || '';
            const intro = installationFromRepo.formatString(
                globalTranslate.ext_UpdateChangelogIntro,
                { name: moduleName, from: installedVersion, to: latestVersion }
            );
            installationFromRepo.renderChangelogModal($modal, intro, [{
                name: moduleName,
                releases: newerReleases.length > 0 ? newerReleases : repoData.releases.slice(0, 1),
            }]);
        });
    },

    /**
     * Runs the actual single-module install/update API call. Extracted so both modals
     * (simple install and changelog confirm) can share the post-confirm logic.
     */
    runSingleInstall(moduleUniqueId, releaseId) {
        $('a.button').addClass('disabled');

        const params = {
            uniqid: moduleUniqueId,
            releaseId: releaseId,
            channelId: installStatusLoopWorker.channelId
        };

        $(`#modal-${params.uniqid}`).modal('hide');
        const $moduleButtons = $(`a[data-uniqid=${params.uniqid}`);

        $moduleButtons.removeClass('disabled');
        $moduleButtons.find('i')
            .removeClass('download')
            .removeClass('redo')
            .addClass('spinner loading');

        $('tr.table-error-messages').remove();
        $('tr.error').removeClass('error');

        ModulesAPI.installFromRepo(params, (response) => {
            console.debug(response);
            if (response.result === true) {
                $('html, body').animate({
                    scrollTop: installationFromRepo.$progressBarBlock.offset().top - 50,
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
    updateAllModules(e) {
        e.preventDefault();
        const $currentButton = $(e.target).closest('a');
        installationFromRepo.openUpdateAllModulesModal($currentButton);
    },

    /**
     * Opens the changelog confirmation modal for the bulk update. Fetches release info
     * for every module that has an available update and renders an aggregated changelog
     * (one section per module) before asking the user to confirm.
     *
     * @param {jQuery} $currentButton - The 'Update All' button.
     */
    openUpdateAllModulesModal($currentButton) {
        const $modal = installationFromRepo.$updateChangelogModal;
        const uniqueModulesForUpdate = new Set();
        $('a.update').each((_, button) => {
            uniqueModulesForUpdate.add($(button).data('uniqid'));
        });
        const modulesForUpdate = [...uniqueModulesForUpdate];

        if (modulesForUpdate.length === 0) {
            return;
        }

        installationFromRepo.resetChangelogModal($modal);
        $modal.find('span.action').text(globalTranslate.ext_UpdateAllModulesTitle);
        $modal.find('span.module-name').text('');

        installationFromRepo.changelogGen += 1;
        const myGen = installationFromRepo.changelogGen;

        $modal.modal({
            closable: false,
            onDeny: () => {
                $('a.button').removeClass('disabled');
                return true;
            },
            onApprove: () => {
                if ($modal.find('.approve.button').hasClass('disabled')) {
                    return false;
                }
                const selected = installationFromRepo.collectSelectedModules($modal);
                if (selected.length === 0) {
                    return false;
                }
                installationFromRepo.runUpdateAll($currentButton, selected);
                return true;
            },
        }).modal('show');

        const fetched = [];
        let pending = modulesForUpdate.length;
        let anySuccess = false;

        modulesForUpdate.forEach((uniqid) => {
            const $installedRow = $(`tr.module-row[data-id=${uniqid}]`);
            const installedVersion = $installedRow.length > 0 ? String($installedRow.data('version') || '') : '';
            const $btn = $(`a.update[data-uniqid=${uniqid}]`).first();
            const moduleName = $btn.closest('tr').data('name')
                || $installedRow.find('td.show-details-on-click').first().clone().children().remove().end().text().trim()
                || uniqid;

            ModulesAPI.getModuleInfo({ uniqid: uniqid }, (repoData, success) => {
                if (myGen !== installationFromRepo.changelogGen) {
                    return; // a newer modal opening superseded this batch
                }
                pending -= 1;
                if (success && repoData && Array.isArray(repoData.releases)) {
                    anySuccess = true;
                    const newerReleases = installationFromRepo.filterNewerReleases(repoData.releases, installedVersion);
                    fetched.push({
                        uniqid: uniqid,
                        name: moduleName,
                        installedVersion: installedVersion,
                        releases: newerReleases.length > 0 ? newerReleases : repoData.releases.slice(0, 1),
                    });
                } else {
                    fetched.push({
                        uniqid: uniqid,
                        name: moduleName,
                        installedVersion: installedVersion,
                        releases: [],
                        error: true,
                    });
                }

                if (pending === 0) {
                    if (!anySuccess) {
                        installationFromRepo.showChangelogError($modal);
                        return;
                    }
                    fetched.sort((a, b) => a.name.localeCompare(b.name));
                    installationFromRepo.renderMultiSelectModal(
                        $modal,
                        globalTranslate.ext_UpdateAllModulesChangelogIntro,
                        fetched
                    );
                }
            });
        });
    },

    /**
     * Reads checked checkboxes inside the modal and returns the list of selected uniqids.
     * Falls back to all known uniqids when no checkboxes are rendered (single-module case).
     */
    collectSelectedModules($modal) {
        const $boxes = $modal.find('.update-module-checkbox input[type="checkbox"]:checked');
        if ($boxes.length === 0) {
            return [];
        }
        const result = [];
        $boxes.each((_, el) => {
            const uniqid = $(el).closest('.update-module-checkbox').data('uniqid');
            if (uniqid) {
                result.push(uniqid);
            }
        });
        return result;
    },

    /**
     * Runs the actual bulk update API call after user confirmed in the changelog modal.
     */
    runUpdateAll($currentButton, modulesForUpdate) {
        $('a.button').addClass('disabled');
        $currentButton.removeClass('disabled');
        $currentButton.find('i.icon')
            .removeClass('redo')
            .addClass('spinner loading');

        installStatusLoopWorker.startBatchUpdate(modulesForUpdate);
        const params = {
            channelId: installStatusLoopWorker.channelId,
            modulesForUpdate: modulesForUpdate,
        };
        ModulesAPI.updateAll(params, (response, success) => {
            console.debug(response);
            if (success === false || response.result === false) {
                installStatusLoopWorker.resetBatchUpdate();
                installationFromRepo.$progressBarBlock.hide();
                $('a.button').removeClass('disabled');
                $currentButton.find('i.icon')
                    .removeClass('spinner loading')
                    .addClass('redo');
            }
        });

        $('tr.table-error-messages').remove();
        $('tr.error').removeClass('error');
    },

    /**
     * Resets the changelog modal to its loading state before a new fetch.
     */
    resetChangelogModal($modal) {
        $modal.find('.changelog-loader').show();
        $modal.find('.changelog-intro').hide().empty();
        $modal.find('.changelog-body').hide().empty();
        $modal.find('.changelog-error').hide();
        $modal.find('.approve.button').addClass('disabled');
    },

    /**
     * Shows the error message inside the changelog modal and disables Confirm.
     */
    showChangelogError($modal) {
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
    renderChangelogModal($modal, introText, entries) {
        $modal.find('.changelog-loader').hide();

        if (introText) {
            $modal.find('.changelog-intro').html(introText).show();
        }

        let html = '';
        entries.forEach((entry) => {
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
    renderMultiSelectModal($modal, introText, entries) {
        $modal.find('.changelog-loader').hide();

        if (introText) {
            $modal.find('.changelog-intro').html(introText).show();
        }

        let html = '<div class="ui styled fluid accordion update-modules-accordion">';
        entries.forEach((entry) => {
            const newest = entry.releases && entry.releases[0] && entry.releases[0].version
                ? entry.releases[0].version
                : '';
            let versionInfo = '';
            if (entry.installedVersion && newest) {
                versionInfo = ` <span class="ui small grey text">${installationFromRepo.escapeHtml(entry.installedVersion)} → ${installationFromRepo.escapeHtml(newest)}</span>`;
            } else if (newest) {
                versionInfo = ` <span class="ui small grey text">${installationFromRepo.escapeHtml(newest)}</span>`;
            }

            html += '<div class="title">';
            html += '<i class="dropdown icon"></i>';
            html += `<div class="ui checkbox update-module-checkbox" data-uniqid="${installationFromRepo.escapeHtml(entry.uniqid)}">`;
            html += '<input type="checkbox" checked />';
            html += `<label><b>${installationFromRepo.escapeHtml(entry.name)}</b>${versionInfo}</label>`;
            html += '</div>';
            html += '</div>';
            html += '<div class="content">';
            html += installationFromRepo.renderEntryReleases(entry);
            html += '</div>';
        });
        html += '</div>';

        const $body = $modal.find('.changelog-body');
        $body.html(html).show();

        const $accordion = $body.find('.update-modules-accordion');
        $accordion.accordion({ exclusive: false });

        // Stop checkbox clicks from toggling the accordion title.
        $accordion.find('.update-module-checkbox').on('click', (e) => {
            e.stopPropagation();
        });
        $accordion.find('.ui.checkbox.update-module-checkbox').checkbox();

        const $approve = $modal.find('.approve.button');
        const refreshApproveState = () => {
            const anyChecked = $accordion.find('.update-module-checkbox input[type="checkbox"]:checked').length > 0;
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
    renderEntryReleases(entry) {
        if (entry.error) {
            return `<div class="ui warning message">${globalTranslate.ext_FailedToLoadChangelog}</div>`;
        }
        if (!entry.releases || entry.releases.length === 0) {
            return `<div class="ui basic segment"><i>${globalTranslate.ext_NoChangelogAvailable}</i></div>`;
        }
        let html = '';
        entry.releases.forEach((release) => {
            const releaseDate = release.created ? String(release.created).split(' ')[0] : '';
            const changeLogText = installationFromRepo.formatChangelogText(release.changelog);
            html += '<div class="ui clearing segment">';
            html += `<div class="ui top attached label">${globalTranslate.ext_InstallModuleReleaseTag}: ${installationFromRepo.escapeHtml(release.version)}`;
            if (releaseDate) {
                html += ` ${globalTranslate.ext_FromDate} ${installationFromRepo.escapeHtml(releaseDate)}`;
            }
            html += '</div>';
            html += `<div class="ui basic segment"><p>${changeLogText}</p></div>`;
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
    formatChangelogText(raw) {
        if (raw === null || raw === undefined) {
            return `<i>${globalTranslate.ext_NoChangelogAvailable}</i>`;
        }
        const text = String(raw);
        if (text === '' || text === 'null' || text === 'undefined') {
            return `<i>${globalTranslate.ext_NoChangelogAvailable}</i>`;
        }
        const escaped = installationFromRepo.escapeHtml(text);
        if (escaped.trim() === '') {
            return `<i>${globalTranslate.ext_NoChangelogAvailable}</i>`;
        }
        return escaped.replace(/\n/g, '<br>');
    },

    /**
     * Filters the releases array to include only versions newer than the installed one.
     * Returns them sorted descending (newest first).
     */
    filterNewerReleases(releases, installedVersion) {
        if (!installedVersion) {
            return releases.slice();
        }
        const newer = releases.filter((release) => {
            if (!release || !release.version) {
                return false;
            }
            return marketplace.versionCompare(String(release.version), String(installedVersion)) > 0;
        });
        newer.sort((a, b) => marketplace.versionCompare(String(b.version), String(a.version)));
        return newer;
    },

    /**
     * Replaces %placeholders% in a translation template with values from a map.
     * Single-pass substitution so a replacement value containing another placeholder
     * literal (e.g. a module named "%from%") is not re-expanded.
     */
    formatString(template, replacements) {
        if (!template) {
            return '';
        }
        const map = replacements || {};
        return template.replace(/%([a-zA-Z0-9_]+)%/g, (match, key) => {
            if (!Object.prototype.hasOwnProperty.call(map, key)) {
                return match;
            }
            const raw = map[key];
            return installationFromRepo.escapeHtml(String(raw !== undefined && raw !== null ? raw : ''));
        });
    },

    /**
     * Minimal HTML escape for values injected into the changelog modal.
     */
    escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

};

// Initializes the installationFromRepo module when the document is ready,
// preparing the extension modules management UI.
$(document).ready(() => {
    installationFromRepo.initialize();
});
