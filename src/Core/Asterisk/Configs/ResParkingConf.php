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

namespace MikoPBX\Core\Asterisk\Configs;

use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Core\System\Util;

/**
 * Class ResParkingConf
 *
 * Represents the res_parking.conf configuration file in Asterisk.
 *
 * @package MikoPBX\Core\Asterisk\Configs
 */
class ResParkingConf extends AsteriskConfigClass
{
    // The module hook applying priority
    public int $priority = 590;

    /**
     * Parking extension.
     *
     * @var string
     */
    protected string $ParkingExt;

    /**
     * Start slot for parking.
     *
     * @var string
     */
    protected string $ParkingStartSlot;

    /**
     * End slot for parking.
     *
     * @var string
     */
    protected string $ParkingEndSlot;

    /**
     * Parking feature.
     *
     * @var string
     */
    protected string $ParkingFeature;

    /**
     * Parking duration.
     *
     * @var string
     */
    protected string $ParkingDuration;

    /**
     * Description of the res_parking.conf file.
     *
     * @var string
     */

    protected string $description = 'res_parking.conf';

    /**
     * Get the dependence models.
     *
     * @return array
     */
    public function getDependenceModels(): array
    {
        return [PbxSettings::class];
    }

    /**
     * ResParkingConf constructor.
     */
    public function __construct(){
        parent::__construct();
        $this->getSettings();
    }

    /**
     * Generates the res_parking.conf configuration content and writes it to the file.
     *
     */
    protected function generateConfigProtected(): void
    {
        // Generate the configuration content
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

        // Write the configuration content to the file
        file_put_contents($this->config->path('asterisk.astetcdir') . '/res_parking.conf', $conf);
    }

    /**
     * Get the park slot data.
     *
     * Retrieves park slot data based on the provided extension.
     * If the extension is null, it returns all park slot data.
     *
     * @param string|null $extension The extension to filter the park slot data. If null, returns all park slot data. Default is null.
     *
     * @return array|null An associative array representing the park slot data.
     *
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
     * Retrieve park slot settings.
     *
     * This method fetches park slot settings from the PbxSettings class and assigns them to the corresponding properties.
     */
    public function getSettings(): void
    {
        $this->ParkingExt       = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_CALL_PARKING_EXT);
        $this->ParkingFeature   = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_CALL_PARKING_FEATURE);
        $this->ParkingDuration  = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_CALL_PARKING_DURATION);
        $this->ParkingStartSlot = (int)PbxSettings::getValueByKey(PbxSettingsConstants::PBX_CALL_PARKING_START_SLOT);
        $this->ParkingEndSlot   = (int)PbxSettings::getValueByKey(PbxSettingsConstants::PBX_CALL_PARKING_END_SLOT);
    }

    /**
     * Generate extension contexts.
     *
     * Generates the internal number plan for parked calls and returns it as a string.
     *
     * @return string The generated extension contexts for parked calls.
     */
    public function extensionGenContexts(): string
    {
        // Generate the internal number plan for parked calls.
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
     * Generate internal extensions.
     *
     * Generates internal extensions for parked calls and returns them as a string.
     *
     * @return string The generated internal extensions for parked calls.
     */
    public function extensionGenInternal(): string
    {
        $conf = '';
        // Generate internal extensions for the range of parking slots.
        for ($ext = $this->ParkingStartSlot; $ext <= $this->ParkingEndSlot; $ext++) {
            $conf .= 'exten => ' . $ext . ',1,Goto(parked-calls,${EXTEN},2)' . "\n";
        }
        $conf .= "\n";

        return $conf;
    }

    /**
     * Get the include for internal transfer.
     *
     * Generates the include for internal transfers based on the configured ParkingExt and returns it as a string.
     *
     * @return string The generated include for internal transfer.
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
     * Generate extension globals.
     *
     * Generates extension globals based on the configured ParkingDuration and returns them as a string.
     *
     * @return string The generated extension globals.
     */
    public function extensionGlobals(): string
    {
        return "PARKING_DURATION=$this->ParkingDuration".PHP_EOL;
    }

    /**
     * Get the feature map for feature.conf
     *
     * Generates the feature map based on the configured ParkingFeature and returns it as a string.
     *
     * @return string The generated feature map.
     */
    public function getFeatureMap(): string
    {
        return "parkcall => $this->ParkingFeature".PHP_EOL;
    }
}
