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

/**
 * Call Detail Records Controller
 *
 * This controller is now a minimal skeleton that only renders the CDR view page.
 * All CDR data retrieval and processing has been migrated to REST API v3.
 *
 * Migration Details:
 * - Old DataTables-based approach (getNewRecordsAction) → REST API v3 (/pbxcore/api/v3/cdr)
 * - Complex search logic (prepareConditionsForSearchPhrases) → GetListAction.php
 * - Date filtering and employee lookup → REST API with smart search
 * - ACL filtering → Preserved in REST API via module hooks
 *
 * Frontend Integration:
 * - JavaScript fetches CDR data directly from REST API
 * - No server-side pagination/filtering in controller
 * - View (index.volt) loads static page with REST API client
 *
 * @see \MikoPBX\PBXCoreREST\Lib\Cdr\GetListAction For current implementation
 * @see /Users/nb/PhpstormProjects/mikopbx/Core/sites/admin-cabinet/assets/js/src/CallDetailRecords/call-detail-records-index.js
 *
 * @package MikoPBX\AdminCabinet\Controllers
 */
class CallDetailRecordsController extends BaseController
{
    /**
     * CDR index page - renders the view only
     *
     * All data retrieval is handled client-side via REST API v3
     *
     * @return void
     */
    public function indexAction(): void
    {
        // Empty action - view renders static HTML
        // JavaScript calls REST API for data:
        // GET /pbxcore/api/v3/cdr
    }
}
