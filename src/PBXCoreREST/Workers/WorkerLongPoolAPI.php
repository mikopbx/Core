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

namespace MikoPBX\PBXCoreREST\Workers;
require_once 'Globals.php';

use MikoPBX\Common\Models\LongPollSubscribe;
use MikoPBX\Core\System\BeanstalkClient;
use MikoPBX\Core\Workers\WorkerBase;
use MikoPBX\PBXCoreREST\Lib\CdrDB\GetActiveChannelsAction;
use MikoPBX\PBXCoreREST\Lib\Sip\GetRegistryAction as GetSipRegistryAction;
use MikoPBX\PBXCoreREST\Lib\Iax\GetRegistryAction as GetIaxRegistryAction;

use Throwable;

use function clearstatcache;

/**
 * The WorkerLongPoolAPI class is responsible for handling the long-polling API worker process.
 *
 * @package MikoPBX\PBXCoreREST\Workers
 *
 * @example
 * curl -s -v --no-buffer 'http://172.16.156.223/pbxcore/api/long/sub/getRegistry' -H 'Cookie: PHPSESSID=aec8c4ae8a26e3f74296ba0acaa3a692'
 * curl -s -v --no-buffer 'http://172.16.156.223/pbxcore/api/long/sub/getActiveChannels' -H 'Cookie: PHPSESSID=aec8c4ae8a26e3f74296ba0acaa3a692'
 * curl -s -v --no-buffer 'http://172.16.156.223/pbxcore/api/long/sub/getActiveCalls' -H 'Cookie: PHPSESSID=aec8c4ae8a26e3f74296ba0acaa3a692'
 * curl -s -v --no-buffer 'http://172.16.156.223/pbxcore/api/long/sub/ping' -H 'Cookie: PHPSESSID=aec8c4ae8a26e3f74296ba0acaa3a692'
 * curl -s -v --no-buffer 'http://172.16.156.223/pbxcore/api/long/sub/common_channel' -H 'Cookie: PHPSESSID=aec8c4ae8a26e3f74296ba0acaa3a692'
 * curl -s -v --no-buffer 'http://172.16.156.223/pbxcore/api/long/sub/test' -H 'Cookie: PHPSESSID=aec8c4ae8a26e3f74296ba0acaa3a692'
 */
class WorkerLongPoolAPI extends WorkerBase
{

    /**
     * Starts the worker.
     *
     * @param array $argv The command-line arguments passed to the worker.
     * @return void
     */
    public function start(array $argv): void
    {

        $client_queue = new BeanstalkClient();
        $client_queue->subscribe($this->makePingTubeName(self::class), [$this, 'pingCallBack']);

        $ACTIONS         = [];
        $COMMON_CNANNELS = [];

        while (true) {
            $data = $this->getData('http://localhost/pbxcore/api/long/channels-stats?id=ALL');
            $this->setChannelsData();
            if (is_array($data) && isset($data['infos'])) {
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
     * Retrieves data from a specified URL.
     *
     * @param string $url The URL to retrieve data from.
     * @return array The retrieved data as an associative array.
     */
    private function getData(string $url):array
    {
        $result = [];
        $ch = curl_init($url);
        if (!is_resource($ch)) {
            return $result;
        }
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 1);
        $resultRequest = curl_exec($ch);
        curl_close($ch);

        if(is_string($resultRequest)){
            $resultTmp = json_decode($resultRequest, true);
            if(is_array($resultTmp)){
                $result = $resultTmp;
            }
        }
        return $result;
    }

    /**
     * Sets the channels data.
     *
     * @return void
     */
    private function setChannelsData(): void
    {
        /** @var \MikoPBX\Common\Models\LongPollSubscribe[] $subscribes */
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
     * Executes a function based on the specified channel and optional common channel.
     *
     * @param string $channel The channel to execute the function for.
     * @param string|null $common_chan The optional common channel.
     * @return string The data to send.
     */
    private function execFunction(string $channel, string $common_chan = null)
    {
        clearstatcache();
        if ( ! $this->checkAction($channel, $common_chan)) {
            return '';
        }
        $data_for_send = null;
        if ('ping' === $channel) {
            $data_for_send = 'PONG';
        } elseif ('getActiveChannels' === $channel) {
            $data_for_send = GetActiveChannelsAction::main()->getResult();
        } elseif ('getRegistry' === $channel) {
            $result        = [
                'SIP' => GetSipRegistryAction::main()->getResult(),
                'IAX' => GetIaxRegistryAction::main()->getResult(),
            ];
            $data_for_send = json_encode($result, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        }

        return $data_for_send;
    }

    /**
     * Checks if an action is enabled based on the specified channel and optional common channel.
     *
     * @param string $channel The channel to check the action for.
     * @param string|null $common_chan The optional common channel.
     * @return bool Whether the action is enabled or not.
     */
    private function checkAction(string $channel, string $common_chan = null)
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
        // $data = null;
        $now  = time();

        $action_data = $actions[$channel] ?? null;
        if ($action_data !== null) {
            $timeout = $action_data['timeout'];
            // $data    = $action_data['data'];
            if (($now - $action_data['last_action']) > $timeout) {
                $enable = true;
            }
        }

        return $enable;
    }

    /**
     * Posts data to the specified URL using HTTP POST.
     *
     * @param string $url The URL to post the data to.
     * @param string $data The data to be posted.
     * @return array The response data as an associative array.
     */
    private function postData(string $url, string $data): array
    {
        $ch = curl_init($url);
        if (!is_resource($ch)) {
            return [];
        }
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 1);
        $resultRequest = curl_exec($ch);
        curl_close($ch);
        if (is_string($resultRequest)){
            $result = json_decode($resultRequest, true);
        } else {
            $result = [];
        }
        return $result;
    }

}

// Start worker process
WorkerLongPoolAPI::startWorker($argv??[]);