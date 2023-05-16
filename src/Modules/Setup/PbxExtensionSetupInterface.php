<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2023 Alexey Portnov and Nikolay Beketov
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
     *
     * @return bool The result of the installation process.
     */
    public function installModule(): bool;

    /**
     * Activates the license, applicable only for commercial modules.
     *
     * @return bool The result of the license activation.
     */
    public function activateLicense(): bool;

    /**
     * Copies files, creates folders, and symlinks for the module and restores previous backup settings.
     *
     * @return bool The result of the installation process.
     */
    public function installFiles(): bool;

    /**
     * Sets up ownerships and folder rights.
     *
     * @return bool The result of the fixing process.
     */
    public function fixFilesRights(): bool;

    /**
     * Creates the database structure according to models' annotations.
     * If necessary, it fills some default settings and changes the sidebar menu item representation for this module.
     * After installation, it registers the module on the PbxExtensionModules model.
     *
     * @return bool The result of the installation process.
     */
    public function installDB(): bool;

    /**
     * Performs the main module uninstallation process called by MikoPBX REST API to delete any module.
     *
     * @param bool $keepSettings If set to true, the function saves the module database.
     *
     * @return bool The result of the uninstallation process.
     */
    public function uninstallModule(bool $keepSettings = false): bool;

    /**
     * Deletes some settings from the database and links to the module.
     * If $keepSettings is set to true, it copies the database file to the Backup folder.
     *
     * @param bool $keepSettings If set to true, the module database is saved.
     *
     * @return bool The result of the uninstallation process.
     */
    public function unInstallDB(bool $keepSettings = false): bool;

    /**
     * Deletes records from the PbxExtensionModules table.
     *
     * @return bool The result of the unregistration process.
     */
    public function unregisterModule(): bool;

    /**
     * Deletes the module files, folders, and symlinks.
     * If $keepSettings is set to true, it copies the database file to the Backup folder.
     *
     * @param bool $keepSettings If set to true, the module database is saved.
     *
     * @return bool The result of the deletion process.
     */
    public function unInstallFiles(bool $keepSettings = false): bool;

    /**
     * Returns error messages.
     *
     * @return array An array of error messages.
     */
    public function getMessages(): array;

    /**
     * Registers the module in the PbxExtensionModules table.
     *
     * @return bool The result of the registration process.
     */
    public function registerNewModule(): bool;

    /**
     * Traverses files with model descriptions and creates/alters tables in the system database.
     *
     * @return bool The result of the table modification process.
     */
    public function createSettingsTableByModelsAnnotations(): bool;

    /**
     * Adds the module to the sidebar menu.
     *
     * @return bool The result of the addition process.
     */
    public function addToSidebar(): bool;
}