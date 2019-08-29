<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 8 2019
 */

class p_Park extends ConfigClass{

    protected $description = 'res_parking.conf';

    protected $ParkingExt;
    protected $ParkingStartSlot;
    protected $ParkingEndSlot;

    /**
     * Получение настроек.
     */
    public function getSettings(){
        $config = new Config();
        $this->ParkingExt       = $config->get_general_settings('PBXCallParkingExt');
        $this->ParkingStartSlot = 0+$config->get_general_settings('PBXCallParkingStartSlot');
        $this->ParkingEndSlot   = 0+$config->get_general_settings('PBXCallParkingEndSlot');
    }

    /**
     * Генерация файла конфигурации.
     * @param $settings
     * @return bool
     */
    protected function generateConfigProtected($settings){
		// Генерация конфигурационных файлов. 
		$result = true;
		$conf = "[general] \n".
				"parkeddynamic = yes \n\n".
				"[default] \n".
				"context => parkedcalls \n".
				"parkedcallreparking = caller\n".
				"parkedcalltransfers = caller\n".
				"parkext => {$this->ParkingExt} \n".
				"findslot => next\n".				
				"comebacktoorigin=no\n".
				"comebackcontext = parkedcallstimeout\n".
				"parkpos => {$this->ParkingStartSlot}-{$this->ParkingEndSlot} \n\n";
		file_put_contents($this->astConfDir."/res_parking.conf", $conf);

		return $result;
	}

    /**
     * Возвращает включения в контекст internal
     * @return string
     */
	public function getIncludeInternal(){
		// Включаем контексты. 
		$conf = '';
		// $conf.= "include => parked-calls \n";
		return $conf;
	}

    /**
     * Возвращает включения в контекст internal-transfer
     * @return string
     */
	public function getIncludeInternalTransfer(){
		// Генерация внутреннего номерного плана. 
		$result = '';
		// $result.= "include => parked-calls \n";
		return $result;
	}

    /**
     * Генерация дополнительных контекстов.
     * @return string
     */
	public function extensionGenContexts(){
		// Генерация внутреннего номерного плана. 
		$conf = '';
		$conf.= "[parked-calls]\n";
		$conf.= "exten => _X!,1,NoOp(--- parkedcalls)\n\t";
		$conf.= "same => n,AGI(cdr_connector.php,unpark_call)\n\t";
		$conf.= 'same => n,ExecIf($["${pt1c_PARK_CHAN}x" == "x"]?Hangup())'."\n\t";
		$conf.= 'same => n,Bridge(${pt1c_PARK_CHAN},kKTt)'."\n\t";
		$conf.= 'same => n,Hangup()'."\n\n";
		
		$conf.= "[parkedcallstimeout]\n";
		$conf.= "exten => s,1,NoOp(This is all that happens to parked calls if they time out.)\n\t";
		$conf.= 'same => n,Set(FROM_PEER=${EMPTYVAR})'."\n\t";
		$conf.= 'same => n,AGI(cdr_connector.php,unpark_call_timeout)'."\n\t";
		$conf.= 'same => n,Goto(internal,${PARKER:4},1)'."\n\t";
		$conf.= 'same => n,Hangup()'."\n\n";

		return $conf;
	}

    /**
     * Возвращает номерной план для internal контекста.
     * @return string
     */
    public function extensionGenInternal(){
        $conf = '';
        for ($ext = $this->ParkingStartSlot; $ext <= $this->ParkingEndSlot; $ext++) {
            $conf.= 'exten => '.$ext.',1,Goto(parked-calls,${EXTEN},1)'. "\n";
        }
        $conf .= "\n";
        return $conf;
    }

    /**
     * Дополнительные параметры для секции global.
     * @return string
     */
	public function extensionGlobals(){
		// Генерация хинтов. 
		$result = "PARKING_DURATION=50\n";
		return $result;
	}

    /**
     * Дополнительные коды feature.conf
     * @return string
     */
	public function getfeaturemap(){
		return "parkcall => *2 \n";	
	}

    /**
     * Функция позволяет получить активные каналы.
     * Возвращает ассоциативный массив. Ключ - Linkedid, значение - массив каналов.
     * @param null $EXTEN
     * @return null
     */
    static function get_parkslot_data($EXTEN = null){
        $ParkeeChannel = null;
        $am 	  = Util::get_am('off');
        $res 	  = $am->ParkedCalls('default');
        if(count($res['data'])==0) return $ParkeeChannel;

        foreach($res['data']['ParkedCall'] as $park_row){
            if($park_row['ParkingSpace'] == $EXTEN || $EXTEN == null){
                $var_data = $am->GetVar($park_row['ParkeeChannel'], 'pt1c_is_dst');
                $park_row['pt1c_is_dst'] = ( $var_data["Value"]== '1' );
                $ParkeeChannel 			 = $park_row;
            }
        }

        return $ParkeeChannel;
    }

}
