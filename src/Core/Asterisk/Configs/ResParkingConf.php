<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\Asterisk\Configs;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Core\System\Util;

class ResParkingConf extends AsteriskConfigClass
{
    // The module hook applying priority
    public int $priority = 590;

    protected string $ParkingExt;
    protected string $ParkingStartSlot;
    protected string $ParkingEndSlot;
    protected string $ParkingFeature;
    protected string $ParkingDuration;

    protected string $description = 'res_parking.conf';

    /**
     *
     * @return array
     */
    public function getDependenceModels(): array
    {
        return [PbxSettings::class];
    }

    /**
     * ResParkingConf constructor.
     *
     */
    public function __construct(){
        parent::__construct();
        // Вызов "getSettings" приемлем, так как идет работа с инициализированной переменной generalSettings.
        $this->getSettings();
    }

    protected function generateConfigProtected(): void
    {
        // Генерация конфигурационных файлов.
        $conf   = "[general]".PHP_EOL.
            "parkeddynamic = yes".PHP_EOL.PHP_EOL.
            "[default]".PHP_EOL.
            "context => parked-calls".PHP_EOL.
            "parkedcallreparking = caller".PHP_EOL.
            "parkedcalltransfers = caller".PHP_EOL.
            "parkext => $this->ParkingExt".PHP_EOL.
            "findslot => next".PHP_EOL.
            "comebacktoorigin=no".PHP_EOL.
            "comebackcontext = parked-calls-timeout".PHP_EOL.
            "parkpos => $this->ParkingStartSlot-$this->ParkingEndSlot".PHP_EOL.PHP_EOL;
        file_put_contents($this->config->path('asterisk.astetcdir') . '/res_parking.conf', $conf);
    }

    /**
     * Функция позволяет получить активные каналы.
     * Возвращает ассоциативный массив. Ключ - linked id, значение - массив каналов.
     * @param string|null $extension
     * @return array|null
     * @throws \Phalcon\Exception
     */
    public static function getParkSlotData(?string $extension = null) : ?array
    {
        $ParkeeChannel = null;
        $am            = Util::getAstManager('off');
        $res           = $am->ParkedCalls('default');
        if (count($res['data']) === 0) {
            return null;
        }

        foreach ($res['data']['ParkedCall'] as $park_row) {
            if ($park_row['ParkingSpace'] === $extension || $extension === null) {
                $var_data                = $am->GetVar($park_row['ParkeeChannel'], 'pt1c_is_dst');
                $park_row['pt1c_is_dst'] = ($var_data["Value"] === '1');
                $ParkeeChannel           = $park_row;
            }
        }

        return $ParkeeChannel;
    }

    /**
     * Получение настроек.
     */
    public function getSettings(): void
    {
        $this->ParkingExt       = PbxSettings::getValueByKey('PBXCallParkingExt');
        $this->ParkingFeature   = PbxSettings::getValueByKey('PBXCallParkingFeature');
        $this->ParkingDuration  = PbxSettings::getValueByKey('PBXCallParkingDuration');
        $this->ParkingStartSlot = (int)PbxSettings::getValueByKey('PBXCallParkingStartSlot');
        $this->ParkingEndSlot   = (int)PbxSettings::getValueByKey('PBXCallParkingEndSlot');
    }

    /**
     * Генерация дополнительных контекстов.
     *
     * @return string
     */
    public function extensionGenContexts(): string
    {
        // Генерация внутреннего номерного плана.
        $conf  = "[parked-calls]\n";
        $conf .= "exten => _X!,2,NoOp()\n\t";
        $conf .= 'same => n,AGI(cdr_connector.php,unpark_call)' . "\n\t";
        $conf .= 'same => n,ExecIf($["${pt1c_PARK_CHAN}x" != "x"]?Bridge(${pt1c_PARK_CHAN},kKTt))' . "\n\t";
        $conf .= 'same => n,ExecIf($["${pt1c_PARK_CHAN}x" == "x"]?ParkedCall(default,${EXTEN}))' . "\n\t";
        $conf .= 'same => n,Hangup()' . "\n\n";

        $conf .= "[parked-calls-timeout]\n";
        $conf .= "exten => s,1,NoOp(This is all that happens to parked calls if they time out.)\n\t";
        $conf .= 'same => n,Set(FROM_PEER=${EMPTYVAR})' . "\n\t";
        $conf .= 'same => n,AGI(cdr_connector.php,unpark_call_timeout)' . "\n\t";
        $conf .= 'same => n,Goto(internal,${CUT(PARKER,/,2)},1)' . "\n\t";
        $conf .= 'same => n,Hangup()' . "\n\n";

        return $conf;
    }

    /**
     * Возвращает номерной план для internal контекста.
     *
     * @return string
     */
    public function extensionGenInternal(): string
    {
        $conf = '';
        for ($ext = $this->ParkingStartSlot; $ext <= $this->ParkingEndSlot; $ext++) {
            $conf .= 'exten => ' . $ext . ',1,Goto(parked-calls,${EXTEN},2)' . "\n";
        }
        $conf .= "\n";

        return $conf;
    }

    /**
     * Возвращает включения в контекст internal-transfer
     *
     * @return string
     */
    public function getIncludeInternalTransfer(): string
    {
        if(empty($this->ParkingExt)){
            $conf = '';
        }else{
            $conf = 'exten => ' . $this->ParkingExt . ',1,Goto(parked-calls,${EXTEN},1)' . PHP_EOL;
        }
        return $conf;
    }

    /**
     * Дополнительные параметры для секции global.
     *
     * @return string
     */
    public function extensionGlobals(): string
    {
        return "PARKING_DURATION=$this->ParkingDuration".PHP_EOL;
    }

    /**
     * Дополнительные коды feature.conf
     *
     * @return string
     */
    public function getFeatureMap(): string
    {
        return "parkcall => $this->ParkingFeature".PHP_EOL;
    }
}
