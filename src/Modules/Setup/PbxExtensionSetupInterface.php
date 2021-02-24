<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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


interface PbxExtensionSetupInterface
{
    /**
     * PbxExtensionBase constructor.
     *
     * @param  $moduleUniqueID string
     *
     * @throws \Phalcon\Exception
     */
    public function __construct(string $moduleUniqueID);

    /**
     * The main module installation function called by PBXCoreRest after unzip module files
     * It calls some private functions and setup error messages on the message variable
     *
     * @return bool - result of installation
     */
    public function installModule(): bool;

    /**
     * Executes license activation only for commercial modules
     *
     * @return bool result of license activation
     */
    public function activateLicense(): bool;

    /**
     * Copies files, creates folders and symlinks for module and restores previous backup settings
     *
     * @return bool installation result
     */
    public function installFiles(): bool;

    /**
     * Setups ownerships and folder rights
     *
     * @return bool fixing result
     */
    public function fixFilesRights(): bool;

    /**
     * Creates database structure according to models annotations
     *
     * If it necessary, it fills some default settings, and change sidebar menu item representation for this module
     *
     * After installation it registers module on PbxExtensionModules model
     *
     * @return bool result of installation
     */
    public function installDB(): bool;

    /**
     * The main function called by MikoPBX REST API for delete any module
     *
     * @param $keepSettings bool if it set to true, the function saves module database
     *
     * @return bool uninstall result
     */
    public function uninstallModule(bool $keepSettings = false): bool;

    /**
     * Deletes some settings from database and links to the module
     * If keepSettings set to true it copies database file to Backup folder
     *
     * @param  $keepSettings bool
     *
     * @return bool the uninstall result
     */
    public function unInstallDB(bool $keepSettings = false): bool;

    /**
     * Deletes records from PbxExtensionModules
     *
     * @return bool  unregistration result
     */
    public function unregisterModule(): bool;

    /**
     * Deletes the module files, folders, symlinks
     * If keepSettings set to true it copies database file to Backup folder
     *
     * @param $keepSettings bool
     *
     * @return bool delete result
     */
    public function unInstallFiles(bool $keepSettings = false): bool;

    /**
     * Returns error messages
     *
     * @return array
     */
    public function getMessages(): array;

    /**
     * Registers module in the PbxExtensionModules table
     *
     * @return bool
     */
    public function registerNewModule(): bool;


    /**
     * Traverses files with model descriptions and creates / modifies tables in the system database
     *
     * @return bool the table modification result
     */
    public function createSettingsTableByModelsAnnotations(): bool;


    /**
     * Adds module to sidebar menu
     *
     * @return bool
     */
    public function addToSidebar(): bool;
}