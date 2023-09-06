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

namespace MikoPBX\Modules\Config;

/**
 * Interface CDRConfigInterface
 *
 * Add additional filters for CDR records from modules
 *
 * @package MikoPBX\Modules\Config
 */
interface CDRConfigInterface
{
    public const APPLY_ACL_FILTERS_TO_CDR_QUERY = 'applyACLFiltersToCDRQuery';

    /**
     * Adds an extra filters before execute request to CDR table.
     * @see https://docs.mikopbx.com/mikopbx-development/module-developement/module-class#applyaclfilterstocdrquery
     *
     * @param array $parameters The array of parameters prepared for execute query.
     *
     * @return void
     */
    public function applyACLFiltersToCDRQuery(array &$parameters): void;
}