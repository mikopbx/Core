<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 7 2020
 */

namespace MikoPBX\Core\Asterisk\Configs;

use MikoPBX\Modules\Config\ConfigClass;
use MikoPBX\Core\System\Util;

class ResParkingConf extends ConfigClass
{
    protected $ParkingExt;
    protected $ParkingStartSlot;
    protected $ParkingEndSlot;


    protected string $description = 'res_parking.conf';

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
        $conf   = "[general] \n" .
            "parkeddynamic = yes \n\n" .
            "[default] \n" .
            "context => parked-calls \n" .
            "parkedcallreparking = caller\n" .
            "parkedcalltransfers = caller\n" .
            "parkext => {$this->ParkingExt} \n" .
            "findslot => next\n" .
            "comebacktoorigin=no\n" .
            "comebackcontext = parked-calls-timeout\n" .
            "parkpos => {$this->ParkingStartSlot}-{$this->ParkingEndSlot} \n\n";
        file_put_contents($this->config->path('asterisk.astetcdir') . '/res_parking.conf', $conf);
    }


    /**
     * Функция позволяет получить активные каналы.
     * Возвращает ассоциативный массив. Ключ - Linkedid, значение - массив каналов.
     *
     * @param null $EXTEN
     *
     * @return null
     */
    public static function getParkslotData($EXTEN = null)
    {
        $ParkeeChannel = null;
        $am            = Util::getAstManager('off');
        $res           = $am->ParkedCalls('default');
        if (count($res['data']) == 0) {
            return null;
        }

        foreach ($res['data']['ParkedCall'] as $park_row) {
            if ($park_row['ParkingSpace'] == $EXTEN || $EXTEN == null) {
                $var_data                = $am->GetVar($park_row['ParkeeChannel'], 'pt1c_is_dst');
                $park_row['pt1c_is_dst'] = ($var_data["Value"] == '1');
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
        $this->ParkingExt       = $this->generalSettings['PBXCallParkingExt'];
        $this->ParkingStartSlot = (int)$this->generalSettings['PBXCallParkingStartSlot'];
        $this->ParkingEndSlot   = (int)$this->generalSettings['PBXCallParkingEndSlot'];
    }

    /**
     * Возвращает включения в контекст internal
     *
     * @return string
     */
    public function getIncludeInternal(): string
    {
        return '';
    }

    /**
     * Возвращает включения в контекст internal-transfer
     *
     * @return string
     */
    public function getIncludeInternalTransfer(): string
    {
        // Генерация внутреннего номерного плана.
        return 'exten => ' . $this->ParkingExt . ',1,Goto(parked-calls,${EXTEN},1)' . "\n";
    }

    /**
     * Генерация дополнительных контекстов.
     *
     * @return string
     */
    public function extensionGenContexts(): string
    {
        // Генерация внутреннего номерного плана.
        $conf = '';
        $conf .= "[parked-calls]\n";
        $conf .= "exten => _X!,1,AGI(cdr_connector.php,unpark_call)\n\t";
        $conf .= 'same => n,ExecIf($["${pt1c_PARK_CHAN}x" == "x"]?Hangup())' . "\n\t";
        $conf .= 'same => n,Bridge(${pt1c_PARK_CHAN},kKTt)' . "\n\t";
        $conf .= 'same => n,Hangup()' . "\n\n";

        $conf .= "[parked-calls-timeout]\n";
        $conf .= "exten => s,1,NoOp(This is all that happens to parked calls if they time out.)\n\t";
        $conf .= 'same => n,Set(FROM_PEER=${EMPTYVAR})' . "\n\t";
        $conf .= 'same => n,AGI(cdr_connector.php,unpark_call_timeout)' . "\n\t";
        $conf .= 'same => n,Goto(internal,${PARKER:4},1)' . "\n\t";
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
            $conf .= 'exten => ' . $ext . ',1,Goto(parked-calls,${EXTEN},1)' . "\n";
        }
        $conf .= "\n";

        return $conf;
    }

    /**
     * Дополнительные параметры для секции global.
     *
     * @return string
     */
    public function extensionGlobals(): string
    {
        return "PARKING_DURATION=50\n";
    }

    /**
     * Дополнительные коды feature.conf
     *
     * @return string
     */
    public function getFeatureMap(): string
    {
        return "parkcall => *2 \n";
    }
}
