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

use MikoPBX\AdminCabinet\Forms\ApiKeyEditForm;
use MikoPBX\Common\Models\ApiKeys;

/**
 * ApiKeysController
 * Manages API keys for REST API authentication
 */
class ApiKeysController extends BaseController
{
    /**
     * Build the list of API keys.
     */
    public function indexAction(): void
    {
        // The data will load by DataTable AJAX
    }
    
    /**
     * Edit API key details.
     *
     * @param string|null $id The unique identifier of the API key.
     */
    public function modifyAction(string $id = null): void
    {
        // Create empty structure for new records or pass ID for existing
        $getRecordStructure = (object)[
            'id' => $id ?: '',
            'description' => '',
            'networkfilterid' => '',
            'allowed_paths' => []
        ];
        
        // For existing keys, get the key suffix for display
        $apiKeySuffix = '';
        if (!empty($id)) {
            $apiKey = ApiKeys::findFirstById($id);
            if ($apiKey) {
                $apiKeySuffix = $apiKey->key_suffix ?? '';
            }
        }
        
        // Create form with empty/default structure - JavaScript will load everything
        $this->view->form = new ApiKeyEditForm($getRecordStructure);
        $this->view->represent = $id ? $this->translation->_('ak_EditApiKey') : $this->translation->_('ak_NewApiKey');
        $this->view->apiKeyId = $id ?: '';
        $this->view->apiKeySuffix = $apiKeySuffix;
    }
}