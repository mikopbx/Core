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

use MikoPBX\AdminCabinet\Forms\TimeSettingsEditForm;
use MikoPBX\Common\Models\PbxSettings;

/**
 * TimeSettingsController
 *
 * Simple controller for time settings management.
 * All data operations are handled through REST API.
 */
class TimeSettingsController extends BaseController
{
    /**
     * Redirects index action to modify page.
     * Time settings has only one form, no list view.
     */
    public function indexAction(): void
    {
        $this->forward('time-settings/modify');
    }

    /**
     * Handles the modify action for Time Settings.
     *
     * Data loading is handled via REST API from JavaScript.
     * This method sets up the form structure for the modify view.
     */
    public function modifyAction(): void
    {
        // Initialize time settings array with empty values for REST API loading
        $timeSettings = [
            PbxSettings::PBX_TIMEZONE => '',
            PbxSettings::PBX_MANUAL_TIME_SETTINGS => '0',
            PbxSettings::NTP_SERVER => ''
        ];

        // Create form with null entity and settings array
        $this->view->form = new TimeSettingsEditForm(null, $timeSettings);
        $this->view->submitMode = null;
    }
}
