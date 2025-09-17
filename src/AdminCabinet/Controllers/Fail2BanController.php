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

use MikoPBX\AdminCabinet\Forms\Fail2BanEditForm;
use MikoPBX\Core\System\Util;

class Fail2BanController extends BaseController
{
    /**
     * Builds the index page for Fail2Ban management.
     *
     * Data loading is handled via REST API from JavaScript.
     * This method only sets up the form structure for the view.
     */
    public function indexAction(): void
    {

        $this->view->form = new Fail2BanEditForm();
        $this->view->submitMode = null;

        // Pass Docker environment flag to view
        $this->view->isDocker = Util::isDocker();
    }
}
