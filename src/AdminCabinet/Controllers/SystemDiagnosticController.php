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

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\AdminCabinet\Forms\SystemDiagnosticForm;
use Phalcon\Filter\Filter;

class SystemDiagnosticController extends BaseController
{
    public function indexAction(): void
    {
        $options = [
            // WHY: filename is now passed via URL hash (#file=...) and handled by JavaScript
            // This allows JS to update the file without page reload
            'filename' => $this->request->get('filename', FILTER::FILTER_STRING, ''),
            // WHY: Use raw filter value without HTML encoding
            // The filter field contains search patterns (possibly regex) that may include special chars like &, [, ]
            // HTML encoding would convert & to &amp;, breaking the search pattern
            // Security: Filter is used only for grep/search, not rendered as HTML, so XSS is not a concern
            'filter' => $this->request->get('filter') ?? '',
        ];
        $this->view->form     = new SystemDiagnosticForm(null, $options);
    }
}
