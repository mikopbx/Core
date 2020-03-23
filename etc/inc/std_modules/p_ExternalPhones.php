<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

class p_ExternalPhones extends ConfigClass{
	private $db_data;
    protected $description = 'external phones conf';

    /**
     * Генератор sip.conf
     * @param $general_settings
     * @return bool|void
     */
    protected function generateConfigProtected($general_settings){

    }

    /**
     * Получение настроек с АТС.
     */
	public function getSettings(){
		$db_data = array();
        $ext_phones = Models\ExternalPhones::find("disabled = '0' OR disabled IS NULL");
        if($ext_phones != null){
            foreach ($ext_phones as $ext_phone) {
                $db_data[] = array(
                    'extension' => $ext_phone->extension,
                    'dialstring' => $ext_phone->dialstring
                );
            }
        }
        $this->db_data = $db_data;
    }

    /**
     * Генерация внутреннего номерного плана.
     * @return string
     */
	public function extensionGenInternal(){
		$conf = '';
		foreach($this->db_data as $external){
			$conf.= "exten => _{$external['extension']},1,Set(EXTERNALPHONE=".$external['dialstring'].")\n\t";
			$conf.= "same => n,Goto(outgoing,{$external['dialstring']},1)\n\t";
			$conf.= "same => n,AGI(check_redirect.php,\${BLINDTRANSFER})\n";
		}
        $conf .= "\n";
		return $conf;
	}

    /**
     * @return string
     */
    public function extensionGenInternalTransfer(){
        $conf = '';
        foreach($this->db_data as $external){
            $conf.= 'exten => _'.$external['extension'].',1,Set(__ISTRANSFER=transfer_)'." \n\t";
            $conf.= 'same => n,Goto(internal,${EXTEN},1)'." \n";
        }
        $conf .= "\n";
        return $conf;
    }

}
