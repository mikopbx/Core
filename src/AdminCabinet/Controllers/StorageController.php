<?php

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

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\LocalStorageEditForm;
use MikoPBX\AdminCabinet\Forms\S3StorageEditForm;

/**
 * StorageController
 *
 * Manages storage information and settings.
 * Data loading is handled via REST API from JavaScript.
 */
class StorageController extends BaseController
{
    /**
     * Builds the index page for Storage management.
     *
     * Data loading is handled via REST API from JavaScript.
     * This method sets up two separate forms:
     * - Local storage form for general retention settings (PATCH /pbxcore/api/v3/storage)
     * - S3 storage form for cloud storage settings (PATCH /pbxcore/api/v3/s3-storage)
     */
    public function indexAction(): void
    {
        $this->view->localStorageForm = new LocalStorageEditForm();
        $this->view->s3StorageForm = new S3StorageEditForm();
        $this->view->submitMode = null;
    }
}