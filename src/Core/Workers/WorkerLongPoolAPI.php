<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 7 2020
 */

namespace MikoPBX\Core\Workers;
require_once 'Globals.php';
use MikoPBX\Common\Models\LongPollSubscribe;
use MikoPBX\Core\Asterisk\CdrDb;
use MikoPBX\Core\Asterisk\Configs\{IAXConf, SIPConf};
use MikoPBX\Core\System\BeanstalkClient;
use MikoPBX\Core\System\Util;
use Phalcon\Exception;

use function clearstatcache;


/*
curl -s -v --no-buffer 'http://172.16.156.223/pbxcore/api/long/sub/getRegistry' -H 'Cookie: PHPSESSID=aec8c4ae8a26e3f74296ba0acaa3a692'
curl -s -v --no-buffer 'http://172.16.156.223/pbxcore/api/long/sub/getActiveChannels' -H 'Cookie: PHPSESSID=aec8c4ae8a26e3f74296ba0acaa3a692'
curl -s -v --no-buffer 'http://172.16.156.223/pbxcore/api/long/sub/getActiveCalls' -H 'Cookie: PHPSESSID=aec8c4ae8a26e3f74296ba0acaa3a692'
curl -s -v --no-buffer 'http://172.16.156.223/pbxcore/api/long/sub/ping' -H 'Cookie: PHPSESSID=aec8c4ae8a26e3f74296ba0acaa3a692'
curl -s -v --no-buffer 'http://172.16.156.223/pbxcore/api/long/sub/common_channel' -H 'Cookie: PHPSESSID=aec8c4ae8a26e3f74296ba0acaa3a692'
curl -s -v --no-buffer 'http://172.16.156.223/pbxcore/api/long/sub/test' -H 'Cookie: PHPSESSID=aec8c4ae8a26e3f74296ba0acaa3a692'
*/

class WorkerLongPoolAPI extends WorkerBase
{

    public function start($argv): void
    {
        // PID сохраняем при начале работы Worker.
        $this::savePidFile(self::class);

        $client_queue = new BeanstalkClient();
        $client_queue->subscribe($this->makePingTubeName(self::class), [$this, 'pingCallBack']);

        $ACTIONS         = [];
        $COMMON_CNANNELS = [];

        while (true) {
            $data = $this->getData('http://localhost/pbxcore/api/long/channels-stats?id=ALL');
            $this->setChannelsData();
            if ($data && isset($data['infos'])) {
                foreach ($data['infos'] as $channel_data) {
                    $url = 'http://localhost/pbxcore/api/long/pub?id=' . $channel_data['channel'];

                    $data_for_send = $this->execFunction($channel_data['channel']);
                    if ($data_for_send) {
                        $ACTIONS[$channel_data['channel']]['last_action'] = time();
                        $this->postData($url, "$data_for_send\n");
                    }

                    if ( ! isset($COMMON_CNANNELS[$channel_data['channel']])) {
                        continue;
                    }

                    $common_actions = $COMMON_CNANNELS[$channel_data['channel']];
                    foreach ($common_actions as $action => $action_data) {
                        $data_for_send = $this->execFunction($action, $channel_data['channel']);
                        if ($data_for_send !== '') {
                            $COMMON_CNANNELS[$channel_data['channel']][$action]['last_action'] = time();
                            $this->postData($url, "$data_for_send\n");
                        }
                    }
                }
            }
            $client_queue->wait(1); // instead of sleep
        }
    }

    /**
     * Проверяет наличие активных подписок LongPoll и отправляет с периодичностью новые данные.
     */

    /**
     * Отправляет GET запрос по http. Возвращает ответ в виде массива.
     *
     * @param string $url
     *
     * @return string
     */
    private function getData($url)
    {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 1);
        $resultrequest = curl_exec($ch);
        curl_close($ch);

        return json_decode($resultrequest, true);
    }

    private function setChannelsData(): void
    {
        /** @var \MikoPBX\Common\Models\LongPollSubscribe $sub */
        $subscribes = LongPollSubscribe::find('enable=1');

        /** @var \MikoPBX\Common\Models\LongPollSubscribe $sub */
        foreach ($subscribes as $sub) {
            $last_action                                     = $GLOBALS['ACTIONS'][$sub->action]['last_action'] ?? time(
                ) - 1;
            $GLOBALS['ACTIONS'][$sub->action]                = $sub->toArray();
            $GLOBALS['ACTIONS'][$sub->action]['last_action'] = $last_action;


            $last_action                                                            = $GLOBALS['COMMON_CNANNELS'][$sub->channel][$sub->action]['last_action'] ?? time(
                ) - 1;
            $GLOBALS['COMMON_CNANNELS'][$sub->channel][$sub->action]                = $sub->toArray();
            $GLOBALS['COMMON_CNANNELS'][$sub->channel][$sub->action]['last_action'] = $last_action;
        }
    }

    /**
     * Выполнение метода API.
     *
     * @param $channel
     * @param $common_chan
     *
     * @return false|string|null
     */
    private function execFunction($channel, $common_chan = null)
    {
        clearstatcache();
        if ( ! $this->checkAction($channel, $data, $common_chan)) {
            return '';
        }
        $data          = null;
        $data_for_send = null;
        if ('ping' === $channel) {
            $data_for_send = 'PONG';
        } elseif ('getActiveChannels' === $channel) {
            $data_for_send = CdrDb::getActiveChannels();
        } elseif ('getActiveCalls' === $channel) {
            $data_for_send = CdrDb::getActiveCalls();
        } elseif ('getRegistry' === $channel) {
            $result        = [
                'SIP' => SIPConf::getRegistry(),
                'IAX' => IAXConf::getRegistry(),
            ];
            $data_for_send = json_encode($result, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        }

        return $data_for_send;
    }

    /**
     * Проверка допустимости выполнения дейсвтия в данный момент времени.
     *
     * @param $channel
     * @param $data
     * @param $common_chan
     *
     * @return bool
     */
    private function checkAction($channel, &$data, $common_chan = null)
    {
        if ( ! $common_chan) {
            $actions = $GLOBALS['ACTIONS'];
        } else {
            $actions = $GLOBALS['COMMON_CNANNELS'][$common_chan];
        }

        $enable = false;
        if ( ! $actions) {
            return $enable;
        }
        $data = null;
        $now  = time();

        $action_data = $actions[$channel] ?? null;
        if ($action_data !== null) {
            $timeout = $action_data['timeout'];
            $data    = $action_data['data'];
            if (($now - $action_data['last_action']) > $timeout) {
                $enable = true;
            }
        }

        return $enable;
    }

    /**
     * Отправляет POST запрос по http. Возвращает ответ в виде массива.
     *
     * @param string $url
     * @param string $data
     *
     * @return string
     */
    private function postData($url, $data)
    {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 1);
        $resultrequest = curl_exec($ch);
        curl_close($ch);

        return json_decode($resultrequest, true);
    }

}

// Start worker process
$workerClassname = WorkerLongPoolAPI::class;
if (isset($argv) && count($argv) > 1) {
    cli_set_process_title($workerClassname);
    try {
        $worker = new $workerClassname();
        $worker->start($argv);
    } catch (Exception $e) {
        global $errorLogger;
        $errorLogger->captureException($e);
        Util::sysLogMsg("{$workerClassname}_EXCEPTION", $e->getMessage());
    }
}