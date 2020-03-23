<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

use \Models\LongPollSubscribe;

require_once 'globals.php';

/**
 * Проверяет наличие активных подписок LongPoll и отправляет с периодичностью новые данные.
 */

/**
 * Отправляет POST запрос по http. Возвращает ответ в виде массива.
 * @param  string $url
 * @param  string  $data
 * @return string
 */
function post_data($url, $data){
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST,           1);
    curl_setopt($ch, CURLOPT_POSTFIELDS,           $data);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT,        1);
    $resultrequest  = curl_exec($ch);
    curl_close ($ch);
    return json_decode($resultrequest, true);
}

/**
 * Отправляет GET запрос по http. Возвращает ответ в виде массива.
 * @param  string $url
 * @return string
 */
function get_data($url){
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT,        1);
    $resultrequest  = curl_exec($ch);
    curl_close ($ch);

    return json_decode($resultrequest, true);
}

/**
 * Выполнение метода API.
 * @param $channel
 * @param $common_chan
 * @return false|string|null
 */
function exec_function($channel, $common_chan=null){
    clearstatcache();
    if(!check_action($channel, $data, $common_chan)){
        return '';
    }
    $data   = null;
    $data_for_send = null;
    if('ping' === $channel){
        $data_for_send = 'PONG';
    }else if('get_active_channels' === $channel){
        $data_for_send = Cdr::get_active_channels();
    }else if('get_active_calls' === $channel){
        $data_for_send = Cdr::get_active_calls();
    }else if('get_registry' === $channel){
        $result = [
            'SIP' => p_SIP::get_registry(),
            'IAX' => p_IAX::get_registry()
        ];
        $data_for_send = json_encode($result, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    }

    return $data_for_send;
}

/**
 * Проверка допустимости выполнения дейсвтия в данный момент времени.
 * @param $channel
 * @param $data
 * @param $common_chan
 * @return bool
 */
function check_action($channel, & $data, $common_chan = null){

    if(!$common_chan){
        $actions = $GLOBALS['ACTIONS'];
    }else{
        $actions = $GLOBALS['COMMON_CNANNELS'][$common_chan];
    }

    $enable = false;
    if(!$actions){
        return $enable;
    }
    $data = null;
    $now  = time();

    $action_data = $actions[$channel]??null;
    if($action_data !== null){
        $timeout = $action_data['timeout'];
        $data    = $action_data['data'];
        if(($now - $action_data['last_action']) > $timeout){
            $enable = true;
        }
    }

    return $enable;
}

function set_channels_data(){
    /** @var Models\LongPollSubscribe $sub */
    $subscribes = LongPollSubscribe::find('enable=1');

    /** @var Models\LongPollSubscribe $sub */
    foreach ($subscribes as $sub){
        $last_action = $GLOBALS['ACTIONS'][$sub->action]['last_action'] ?? time()-1;
        $GLOBALS['ACTIONS'][$sub->action]  = $sub->toArray();
        $GLOBALS['ACTIONS'][$sub->action]['last_action'] = $last_action;


        $last_action = $GLOBALS['COMMON_CNANNELS'][$sub->channel][$sub->action]['last_action']  ?? time()-1;
        $GLOBALS['COMMON_CNANNELS'][$sub->channel][$sub->action] = $sub->toArray();
        $GLOBALS['COMMON_CNANNELS'][$sub->channel][$sub->action]['last_action'] = $last_action;
    }
}

/*
curl -s -v --no-buffer 'http://172.16.156.223/pbxcore/api/long/sub/get_registry' -H 'Cookie: PHPSESSID=aec8c4ae8a26e3f74296ba0acaa3a692'
curl -s -v --no-buffer 'http://172.16.156.223/pbxcore/api/long/sub/get_active_channels' -H 'Cookie: PHPSESSID=aec8c4ae8a26e3f74296ba0acaa3a692'
curl -s -v --no-buffer 'http://172.16.156.223/pbxcore/api/long/sub/get_active_calls' -H 'Cookie: PHPSESSID=aec8c4ae8a26e3f74296ba0acaa3a692'
curl -s -v --no-buffer 'http://172.16.156.223/pbxcore/api/long/sub/ping' -H 'Cookie: PHPSESSID=aec8c4ae8a26e3f74296ba0acaa3a692'
curl -s -v --no-buffer 'http://172.16.156.223/pbxcore/api/long/sub/common_channel' -H 'Cookie: PHPSESSID=aec8c4ae8a26e3f74296ba0acaa3a692'
curl -s -v --no-buffer 'http://172.16.156.223/pbxcore/api/long/sub/test' -H 'Cookie: PHPSESSID=aec8c4ae8a26e3f74296ba0acaa3a692'
*/

$ACTIONS         = [];
$COMMON_CNANNELS = [];
$worker_proc_name = 'longpoll_api';
while (true) {
    cli_set_process_title($worker_proc_name);
    $data = get_data('http://localhost/pbxcore/api/long/channels-stats?id=ALL');
    set_channels_data();
    if($data && isset($data['infos'])){
        foreach ($data['infos'] as $channel_data){
            $url    = 'http://localhost/pbxcore/api/long/pub?id='.$channel_data['channel'];

            $data_for_send = exec_function($channel_data['channel']);
            if($data_for_send){
                $ACTIONS[$channel_data['channel']]['last_action'] = time();
                post_data($url, "$data_for_send\n");
            }

            if(!isset($COMMON_CNANNELS[$channel_data['channel']])){
                continue;
            }

            $common_actions = $COMMON_CNANNELS[$channel_data['channel']];
            foreach ($common_actions as $action => $action_data){
                $data_for_send = exec_function($action, $channel_data['channel']);
                if($data_for_send !== ''){
                    $COMMON_CNANNELS[$channel_data['channel']][$action]['last_action'] = time();
                    post_data($url, "$data_for_send\n");
                }
            }
        }
    }
    sleep(1);
}