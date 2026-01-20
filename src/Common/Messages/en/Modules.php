<?php
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

/**
 * External modules translations
 */

return [
    // EXT
    'ext_AddNewExtension' => 'Upload new module',
    'ext_Available' => 'can update toо',
    'ext_AvailableModules' => 'Modules available for installation',
    'ext_Cancel' => 'Cancel',
    'ext_Caption' => 'Caption',
    'ext_CheckLicenseInProgress' => 'License check…',
    'ext_CommercialModule' => 'Paid module',
    'ext_CreateNewExtension' => 'Create new one',
    'ext_Delete' => 'Delete',
    'ext_DeleteDescription' => 'Before deleting this module, the system going to check links to other modules and system settings.',
    'ext_DeleteModuleError' => 'Error deleting module',
    'ext_DeleteTitle' => 'Delete module',
    'ext_DisableReasonHeader' => 'The module was disabled automatically',
    'ext_DowngradeModuleTitle' => 'Rolling back a module version',
    'ext_DownloadInProgress' => 'Downloading the module…',
    'ext_EmptyLicenseKey' => 'The license key to activate the license for the module has not been installed',
    'ext_EmptyRepoAnswer' => 'There are no releases available to install the module',
    'ext_ErrDownloadTimeout' => 'Failed to download module update. Timeout for operation.',
    'ext_ErrInstallationTimeout' => 'Failed to install module. Timeout for operation.',
    'ext_ErrUploadTimeout' => 'Failed to upload module file. Timeout for operation.',
    'ext_ErrorOnAppliesFilesRights' => 'Error when assigning permissions to module files',
    'ext_ErrorOnDecodeModuleJson' => 'Error parsing module configuration file %filename%',
    'ext_ErrorOnDisableFirewallSettings' => 'Firewall settings exclusion error for module',
    'ext_ErrorOnEnableFirewallSettings' => 'Error enabling firewall settings for module',
    'ext_ErrorOnInstallDB' => 'Error while configuring module database',
    'ext_ErrorOnInstallFiles' => 'Errors when copying module files',
    'ext_ErrorOnLicenseActivation' => 'Errors when activating a license',
    'ext_ErrorOnModuleBeforeDisable' => 'Errors in checking the ability to disable the module',
    'ext_ErrorOnModuleBeforeEnable' => 'Errors checking the ability to enable the module',
    'ext_ExternalDescription' => 'Detailed description, documentation',
    'ext_FreeModule' => 'Free module',
    'ext_FromDate' => 'released',
    'ext_GetLinkError' => 'The update server returns a wrong answer, try to continue a bit later.',
    'ext_GetReleaseInProgress' => 'Requesting data from the repository…',
    'ext_GoToMarketplace' => 'Go to marketplace',
    'ext_GoToRegistration' => 'Registration in the marketplace',
    'ext_InstallModule' => 'Install module',
    'ext_InstallModuleReleaseTag' => 'Release',
    'ext_InstallModuleShort' => 'Install',
    'ext_InstallModuleTitle' => 'Installing the module',
    'ext_InstallModuleVersion' => 'Install version',
    'ext_InstallUpdateAction' => 'Execute',
    'ext_InstallationError' => 'Error installing module',
    'ext_InstallationInProgress' => 'Installation …',
    'ext_InstalledModules' => 'Installed modules',
    'ext_KeepModuleSettings' => 'Save current module settings',
    'ext_LicenseProblemHeader' => 'License issue',
    'ext_Licensing' => 'License management',
    'ext_Marketplace' => 'Marketplace',
    'ext_ModuleChangeStatusError' => 'Problem with module status',
    'ext_ModuleChangedObjects' => 'Changed the following objects',
    'ext_ModuleChangelogTab' => 'Version history',
    'ext_ModuleDependsHigherVersion' => '%version% or a newer version of MikoPBX is required to install the module',
    'ext_ModuleDescriptionTab' => 'Module description',
    'ext_ModuleDisabledStatusDisabled' => 'Module disabled',
    'ext_ModuleDisabledStatusEnabled' => 'Module enabled',
    'ext_ModuleDowngradeDescription' => 'The module will be rolled back to the previous version. The settings will be saved, but for paid modules the license will be checked first. Please note that a rollback may change the data structure and the module may need to be reconfigured. During the rollback, avoid performing other operations on the system.',
    'ext_ModuleEulaTab' => 'License agreement',
    'ext_ModuleExecutionProblem' => 'A serious error occurred:',
    'ext_ModuleInstallDescription' => 'When installing the module, the system will check the license. For paid modules, if possible, a trial version will be provided. Free modules are installed without conditions. If the module was previously deleted while saving the settings, they will be restored. While installing the module, it is better not to perform other actions on the system.',
    'ext_ModuleInstallations' => 'Installed',
    'ext_ModuleLastRelease' => 'Current release',
    'ext_ModuleLicenseProblem' => 'Module license problem',
    'ext_ModulePublisher' => 'Developer',
    'ext_ModuleStatusChanging' => 'Change the module state …',
    'ext_ModuleUpdateDescription' => 'The selected module will be updated to the latest version from the repository, and all settings will be saved. For paid modules, the license is first checked. During the update, it is recommended to refrain from performing other actions on the system.',
    'ext_NoAvailableModules' => 'No modules available for installation',
    'ext_NoInstalledModules' => 'No modules installed',
    'ext_NoLicenseAvailable' => 'There is no license to install this module or update it.',
    'ext_NoLicenseRequired' => 'Free module',
    'ext_SelectMenuGroup' => 'Select menu group',
    'ext_SettingsForModule' => 'Settings for module:',
    'ext_ShowModuleItemAtMainMenu' => 'Show item in sidebar menu',
    'ext_ShowModuleRepoDetails' => 'Open detailed module description',
    'ext_SystemVersionRequired' => 'Minimum compatible version of MikoPBX',
    'ext_TableColumnDescription' => 'Module name',
    'ext_TableColumnDeveloper' => 'Creator',
    'ext_TableColumnVersion' => 'Version',
    'ext_UnInstallFiles' => 'Error while deleting module files',
    'ext_UninstallDBError' => 'Error when deleting module database',
    'ext_UpdateAllModules' => 'Update all installed modules',
    'ext_UpdateAllModulesDescription' => 'The system will update all installed modules to the latest versions, maintaining the current settings. It is recommended that you do not perform any other operations on the system during the update process.',
    'ext_UpdateAllModulesTitle' => 'Updating all modules',
    'ext_UpdateModule' => 'Update module',
    'ext_UpdateModuleError' => 'Error installing module',
    'ext_UpdateModuleShort' => 'Update',
    'ext_UpdateModuleTitle' => 'Module update',
    'ext_UploadError' => 'Upload error',
    'ext_UploadInProgress' => 'Uploading…',
    'ext_UsefulLinks' => 'useful links',
    'ext_ValidateCaptionEmpty' => 'Menu item caption is empty',
    'ext_Version' => 'Version',
    'ext_WrongGetModuleLink' => 'Error getting module file from repository',

    // Module package validation errors
    'ext_FileNotFound' => 'Module file not found: %filePath%',
    'ext_CorruptedZipFile' => 'Module ZIP file is corrupted or has invalid format: %filePath%. Error code: %errorCode%',
    'ext_ModuleJsonNotFound' => 'File module.json not found in module archive %filePath%',
    'ext_InvalidModuleJson' => 'File module.json in archive %filePath% contains invalid JSON: %error%',
    'ext_MissingModuleUniqueID' => 'Required field moduleUniqueID is missing in module.json file of archive %filePath%',

    // Module compatibility validation
    'ext_ModuleIncompatibleWithVersion' => 'Module %module% is incompatible with current MikoPBX version',
    'ext_ModuleMethodSignatureIncompatibility' => 'Module %module% is incompatible with current MikoPBX version: method signature incompatibility detected',
];
