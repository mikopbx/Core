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

use MikoPBX\AdminCabinet\Forms\NetworkEditForm;
use MikoPBX\Common\Models\LanInterfaces;

class NetworkController extends BaseController
{
    /**
     * Lan cards settings form
     * All structure and data are generated dynamically via JavaScript from REST API
     */
    public function modifyAction(): void
    {
        // Empty form - all structure will be generated dynamically in JavaScript
        $form = new NetworkEditForm();

        $this->view->setVars(
            [
                'form' => $form,
                'submitMode' => null,
            ]
        );
    }
}
