#!/usr/bin/php
<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 5 2018
 */
require_once 'globals.php';
require_once 'phpagi.php';

// Функция позволяет получить активные каналы. 
// Возвращает ассоциативный массив. Ключ - Linkedid, значение - массив каналов. 
function get_active_id_channels($EXTEN){
	$ParkeeChannel = '';
	$am 	  = Util::get_am('off');
    if(!$am->logged_in()){
        return $ParkeeChannel;
    }
	$res 	  = $am->ParkedCalls('default');
	if(count($res['data'])==0) return $ParkeeChannel;
	
    foreach($res['data']['ParkedCall'] as $park_row){
	    if($park_row['ParkingSpace'] == $EXTEN){
		    $ParkeeChannel = $park_row['ParkeeChannel'];
	    }
    }

	return $ParkeeChannel;
}
$agi = new AGI();
$exten	= $agi->get_variable("EXTEN", 	true);

$PARK_CHAN = get_active_id_channels($exten);
$agi->set_variable("__pt1c_IS_PARK", "1");		
$agi->set_variable("pt1c_PARK_CHAN", $PARK_CHAN);		

?>