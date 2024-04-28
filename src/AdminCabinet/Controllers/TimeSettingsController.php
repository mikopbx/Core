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

use DateTime;
use DateTimeZone;
use MikoPBX\AdminCabinet\Forms\TimeSettingsEditForm;
use MikoPBX\Common\Models\{PbxSettings, PbxSettingsConstants};

class TimeSettingsController extends BaseController
{

    /**
     * Form for editing and configuring time settings on the station.
     */
    public function modifyAction(): void
    {
        $parameters = [
            'key IN ({ids:array})',
            'bind' => ['ids' => $this->getTimeSettingsArray()],
        ];

        $timeSettingsFields     = PbxSettings::find($parameters);
        $readibleTimeZones      = $this->generateTimezoneList();
        $form                   = new TimeSettingsEditForm($timeSettingsFields, $readibleTimeZones);
        $this->view->form       = $form;
        $this->view->submitMode = null;
    }

    /**
     * Get the array of time settings.
     *
     * @return array Array of time settings keys.
     */
    private function getTimeSettingsArray(): array
    {
        return [
            PbxSettingsConstants::PBX_TIMEZONE,
            PbxSettingsConstants::NTP_SERVER,
            PbxSettingsConstants::PBX_MANUAL_TIME_SETTINGS,
        ];
    }

    /**
     * Generate an array of time zones.
     *
     * @return array Array of time zones.
     */
    private function generateTimezoneList(): array
    {
        static $regions = [
            DateTimeZone::AFRICA,
            DateTimeZone::AMERICA,
            DateTimeZone::ANTARCTICA,
            DateTimeZone::ASIA,
            DateTimeZone::ATLANTIC,
            DateTimeZone::AUSTRALIA,
            DateTimeZone::EUROPE,
            DateTimeZone::INDIAN,
            DateTimeZone::PACIFIC,
        ];

        $timezones = [];
        foreach ($regions as $region) {
            $timezones[] = DateTimeZone::listIdentifiers($region);
        }
        $timezones = array_merge(...$timezones);

        $timezone_offsets = [];
        foreach ($timezones as $timezone) {
            $tz                          = new DateTimeZone($timezone);
            $timezone_offsets[$timezone] = (int)$tz->getOffset(new DateTime());
        }

        // sort timezone by offset
        asort($timezone_offsets);

        $timezone_list = [];
        foreach ($timezone_offsets as $timezone => $offset) {
            $offset_prefix    = $offset < 0 ? '-' : '+';
            $absOffset = (int)abs($offset);
            $offset_formatted = gmdate('H:i', $absOffset);

            $pretty_offset = "UTC${offset_prefix}${offset_formatted}";

            $timezone_list[$timezone] = "$timezone (${pretty_offset})";
        }

        return $timezone_list;
    }

    /**
     * Save timezone settings
     */
    public function saveAction()
    {
        if ( ! $this->request->isPost()) {
            return;
        }

        $data = $this->request->getPost();

        $this->db->begin();
        $arrSettings = $this->getTimeSettingsArray();
        foreach ($arrSettings as $key) {
            $record = PbxSettings::findFirstByKey($key);
            if ($record === null) {
                $record      = new PbxSettings();
                $record->key = $key;
            }

            switch ($key) {
                case PbxSettingsConstants::PBX_MANUAL_TIME_SETTINGS:
                case "***ALL CHECK BOXES ABOVE***":
                    $record->value = ($data[$key] === 'on') ? '1' : '0';
                    break;
                case PbxSettingsConstants::NTP_SERVER:
                    $ntp_servers   = preg_split('/\r\n|\r|\n| |,/', $data[$key]);
                    if (is_array($ntp_servers)){
                        $record->value = implode(PHP_EOL, $ntp_servers);
                    }
                    break;
                default:
                    if ( ! array_key_exists($key, $data)) {
                        continue 2;
                    }
                    $record->value = $data[$key];
            }
            if ($record->save() === false) {
                $errors = $record->getMessages();
                $this->flash->warning(implode('<br>', $errors));
                $this->view->success = false;
                $this->db->rollback();

                return;
            }
        }

        $this->flash->success($this->translation->_('ms_SuccessfulSaved'));
        $this->view->success = true;
        $this->db->commit();
    }
}