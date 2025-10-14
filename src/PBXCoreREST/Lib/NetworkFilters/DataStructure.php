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

namespace MikoPBX\PBXCoreREST\Lib\NetworkFilters;

use MikoPBX\PBXCoreREST\Lib\Firewall\DataStructure as FirewallDataStructure;

/**
 * Data structure for Network Filters with OpenAPI schema support
 *
 * NetworkFilters uses the same data model as Firewall (NetworkFilters model),
 * so we extend Firewall DataStructure for consistency.
 *
 * This provides read-only access to network filters for dropdown lists.
 * For create/update/delete operations, use the Firewall API.
 *
 * @package MikoPBX\PBXCoreREST\Lib\NetworkFilters
 */
class DataStructure extends FirewallDataStructure
{
    // Inherits all methods from Firewall\DataStructure:
    // - createFromModel()
    // - createForList()
    // - getListItemSchema()
    // - getDetailSchema()
    // - getSanitizationRules()
    // - formatBySchema()
    // - generateAutoSearchIndex()

}
