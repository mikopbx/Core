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

use MikoPBX\AdminCabinet\Forms\CustomFilesEditForm;
use MikoPBX\Common\Models\CustomFiles;

/**
 * Custom Files Controller
 *
 * Handles the web interface for managing custom configuration files.
 * Uses REST API v3 for all data operations.
 */
class CustomFilesController extends BaseController
{
    /**
     * Generates Custom Files index page
     * Data is loaded via REST API from JavaScript
     */
    public function indexAction(): void
    {
        // View will be loaded automatically
        // Data fetching is handled by custom-files-index.js via REST API
    }

    /**
     * Shows the edit form for a custom file.
     * Creates empty form structure, data is loaded via REST API.
     *
     * @param string $id CustomFiles record ID (optional for new files)
     */
    public function modifyAction(string $id = ''): void
    {
        $form = new CustomFilesEditForm();

        $this->view->form = $form;
        $this->view->id = $id;
    }

    /**
     * Get allowed directories for MODE_CUSTOM files
     * Returns JSON array of allowed directory paths
     *
     * @return void
     */
    public function getAllowedDirectoriesAction(): void
    {
        $this->view->success = true;
        $this->view->data = CustomFiles::ALLOWED_DIRECTORIES;
    }
}