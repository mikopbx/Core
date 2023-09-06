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

namespace MikoPBX\Modules\Setup;


/**
 * Interface PbxExtensionSetupInterface
 * Represents the interface for the setup of PBX extensions.
 *
 * @package MikoPBX\Modules\Setup
 */
interface PbxExtensionSetupInterface
{
    /**
     * PbxExtensionSetupInterface constructor.
     *
     * @param string $moduleUniqueID The unique identifier of the module.
     */
    public function __construct(string $moduleUniqueID);

    /**
     * Performs the main module installation process called by PBXCoreRest after unzipping module files.
     * It invokes private functions and sets up error messages in the message variable.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-installer#installmodule
     *
     * @return bool The result of the installation process.
     */
    public function installModule(): bool;

    /**
     * Checks if the current PBX version is compatible with the minimum required version.
     *
     * This function compares the current PBX version with the minimum required version
     * specified by the module. If the current version is lower than the minimum required
     * version, it adds a message to the `messages` array and returns `false`. Otherwise,
     * it returns `true`, indicating that the PBX version is compatible.
     *
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-installer#checkcompatibility
     *
     * @return bool Returns `true` if PBX version is compatible; otherwise, `false`.
     */
    public function checkCompatibility():bool;

    /**
     * Activates the license, applicable only for commercial modules.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-installer#activatelicense
     *
     * @return bool The result of the license activation.
     */
    public function activateLicense(): bool;

    /**
     * Copies files, creates folders, and symlinks for the module and restores previous backup settings.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-installer#installfiles
     *
     * @return bool The result of the installation process.
     */
    public function installFiles(): bool;

    /**
     * Sets up ownerships and folder rights.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-installer#fixfilesrights
     *
     * @return bool The result of the fixing process.
     */
    public function fixFilesRights(): bool;

    /**
     * Creates the database structure according to models' annotations.
     * If necessary, it fills some default settings and changes the sidebar menu item representation for this module.
     * After installation, it registers the module on the PbxExtensionModules model.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-installer#fixfilesrights
     *
     * @return bool The result of the installation process.
     */
    public function installDB(): bool;

    /**
     * Performs the main module uninstallation process called by MikoPBX REST API to delete any module.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-installer#uninstallmodule
     *
     * @param bool $keepSettings If set to true, the function saves the module database.
     *
     * @return bool The result of the uninstallation process.
     */
    public function uninstallModule(bool $keepSettings = false): bool;

    /**
     * Deletes some settings from the database and links to the module.
     * If $keepSettings is set to true, it copies the database file to the Backup folder.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-installer#uninstalldb
     *
     * @param bool $keepSettings If set to true, the module database is saved.
     *
     * @return bool The result of the uninstallation process.
     */
    public function unInstallDB(bool $keepSettings = false): bool;

    /**
     * Deletes records from the PbxExtensionModules table.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-installer#unregistermodule
     *
     * @return bool The result of the unregistration process.
     */
    public function unregisterModule(): bool;

    /**
     * Deletes the module files, folders, and symlinks.
     * If $keepSettings is set to true, it copies the database file to the Backup folder.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-installer#uninstallfiles
     *
     * @param bool $keepSettings If set to true, the module database is saved.
     *
     * @return bool The result of the deletion process.
     */
    public function unInstallFiles(bool $keepSettings = false): bool;

    /**
     * Returns error messages.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-installer#getmessages
     *
     * @return array An array of error messages.
     */
    public function getMessages(): array;

    /**
     * Registers the module in the PbxExtensionModules table.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-installer#registernewmodule
     *
     * @return bool The result of the registration process.
     */
    public function registerNewModule(): bool;

    /**
     * Traverses files with model descriptions and creates/alters tables in the system database.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-installer#createsettingstablebymodelsannotations
     *
     * @return bool The result of the table modification process.
     */
    public function createSettingsTableByModelsAnnotations(): bool;

    /**
     * Adds the module to the sidebar menu.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-installer#addtosidebar
     *
     * @return bool The result of the addition process.
     */
    public function addToSidebar(): bool;
}