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

declare(strict_types=1);

namespace MikoPBX\PBXCoreREST\Lib\Providers;

use MikoPBX\Common\Models\Providers;
use MikoPBX\PBXCoreREST\Lib\PBXApiResult;
use MikoPBX\PBXCoreREST\Lib\Common\AbstractGetListAction;

/**
 * Class GetListAction
 * 
 * Retrieves list of providers organized by categories (SIP/IAX2)
 * 
 * @package MikoPBX\PBXCoreREST\Lib\Providers
 */
class GetListAction extends AbstractGetListAction
{
    /**
     * Get list of all providers
     * 
     * @param bool $includeDisabled Include disabled providers in the list
     * @param array $requestParams Request parameters for filtering/sorting
     * @return PBXApiResult
     */
    public static function main(bool $includeDisabled = false, array $requestParams = []): PBXApiResult
    {
        // Create record filter for disabled providers
        $recordFilter = null;
        if (!$includeDisabled) {
            $recordFilter = function($provider) {
                // Check if provider is disabled based on type
                if ($provider->type === 'SIP' && $provider->Sip) {
                    return $provider->Sip->disabled !== '1';
                } elseif ($provider->type === 'IAX' && $provider->Iax) {
                    return $provider->Iax->disabled !== '1';
                }
                return true; // Include if config not found
            };
        }
        
        // Define allowed fields for ordering and searching
        $allowedOrderFields = ['type', '[note]', 'id'];
        $searchableFields = ['[note]'];
        
        // Set custom default order: type first, then note (escaped)
        $defaultOrder = 'type ASC, [note] ASC';
        
        // If no ordering requested, set empty requestParams to avoid applyOrdering interference
        if (!isset($requestParams['order_by']) && !isset($requestParams['order'])) {
            $requestParams = [];
        }
        
        // Use standard list execution with custom ordering
        return self::executeStandardList(
            Providers::class,
            DataStructure::class,
            $requestParams,
            ['order' => $defaultOrder], // Set base query order
            false, // Use createForList for performance
            $allowedOrderFields,
            $searchableFields,
            $recordFilter,
            $defaultOrder
        );
    }
}