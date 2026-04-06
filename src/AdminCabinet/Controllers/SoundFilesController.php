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

use MikoPBX\Common\Models\SoundFiles;

class SoundFilesController extends BaseController
{
    /**
     * Build sounds list
     * All data loaded via JavaScript REST API
     */
    public function indexAction(): void
    {
        // View renders, JS handles everything
    }

    /**
     * Opens and edits a record.
     * Form population handled by JavaScript REST API
     *
     * @param string $id The ID of the record being edited or category for new record
     */
    public function modifyAction(string $id = ''): void
    {
        // Pass ID to view for JavaScript to handle
        $this->view->recordId = $id;

        // Set category for new records
        $this->view->category = in_array($id, [SoundFiles::CATEGORY_CUSTOM, SoundFiles::CATEGORY_MOH], true)
            ? $id
            : '';
    }
}
