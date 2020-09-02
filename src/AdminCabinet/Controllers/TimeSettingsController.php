<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace MikoPBX\AdminCabinet\Controllers;

use DateTime;
use DateTimeZone;
use MikoPBX\AdminCabinet\Forms\TimeSettingsEditForm;
use MikoPBX\Common\Models\{PbxSettings};

class TimeSettingsController extends BaseController
{

    /**
     * Форма редактирования и настроек времени на станции
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
        $this->view->params     = [
            'currenttime'     => date('d/m/Y H:i:s', time()),
            'currenttimezone' => date_default_timezone_get(),
        ];
        $this->view->form       = $form;
        $this->view->submitMode = null;
    }

    /**
     * Массив настроек времени
     *
     * @return array
     */
    private function getTimeSettingsArray(): array
    {
        return [
            'PBXTimezone',
            'NTPServer',
            'PBXManualTimeSettings',
        ];
    }

    /**
     * Генерация массива тайм зон
     *
     * @return array
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
            $offset_formatted = gmdate('H:i', $offset);

            $pretty_offset = "UTC${offset_prefix}${offset_formatted}";

            $timezone_list[$timezone] = "$timezone (${pretty_offset})";
        }

        return $timezone_list;
    }

    /**
     * Сохранение данных о настройках времени
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
                case "PBXManualTimeSettings":
                case "***ALL CHECK BOXES ABOVE***":
                    $record->value = ($data[$key] === 'on') ? "1" : "0";
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
        $this->view->reload  = 'time-settings/modify';
        $this->db->commit();
        $PBXTimezone = PbxSettings::getValueByKey("PBXTimezone");
        $this->session->set('timezone', $PBXTimezone);
    }
}