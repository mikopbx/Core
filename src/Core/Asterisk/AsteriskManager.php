<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2023 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\Asterisk;

use MikoPBX\Core\System\Util;
use Throwable;

/**
 * Asterisk Manager class
 *
 * @link    http://www.voip-info.org/wiki-Asterisk+config+manager.conf
 * @link    http://www.voip-info.org/wiki-Asterisk+manager+API
 * @example examples/sip_show_peer.php Get information about a sip peer
 * @package phpAGI
 */
class AsteriskManager
{
    /**
     * Config variables
     *
     * @var array
     * @access public
     */
    public $config;

    /** @var string  */
    private string $listenEvents;

    /**
     * Socket
     *
     * @access public
     */
    public $socket = null;

    /**
     * Server we are connected to
     *
     * @access public
     * @var string
     */
    public $server;

    /**
     * Port on the server we are connected to
     *
     * @access public
     * @var int
     */
    public $port;

    /**
     * Parent AGI
     *
     * @access public
     * @var AGI
     */
    public $pagi;

    /**
     * Event Handlers
     *
     * @access private
     * @var array
     */
    private $event_handlers;

    /**
     * Whether we're successfully logged in
     *
     * @access private
     * @var bool
     */
    private $_loggedIn = false;

    /**
     * Constructor
     *
     * @param ?string $config    is the name of the config file to parse or a parent agi from which to read the config
     * @param array  $optconfig is an array of configuration vars and vals, stuffed into $this->config['asmanager']
     */
    public function __construct($config = null, $optconfig = [])
    {
        // load config
        if ( !is_null($config) && file_exists($config)) {
            $arrData = parse_ini_file($config, true);
            $this->config = ($arrData === false)?[]:$arrData;
        }

        // If optconfig is specified, stuff vals and vars into 'asmanager' config array.
        foreach ($optconfig as $var => $val) {
            $this->config['asmanager'][$var] = $val;
        }

        // add default values to config for uninitialized values
        if ( ! isset($this->config['asmanager']['server'])) {
            $this->config['asmanager']['server'] = 'localhost';
        }
        if ( ! isset($this->config['asmanager']['port'])) {
            $this->config['asmanager']['port'] = 5038;
        }
        if ( ! isset($this->config['asmanager']['username'])) {
            $this->config['asmanager']['username'] = 'phpagi';
        }
        if ( ! isset($this->config['asmanager']['secret'])) {
            $this->config['asmanager']['secret'] = 'phpagi';
        }
    }

    /**
     * Проверка работы сервиса AMI.
     *
     * @param string $pingTube
     *
     * @return array|bool
     */
    public function pingAMIListener($pingTube = 'CdrConnector')
    {
        // Установим фильтр на события.
        $params = ['Operation' => 'Add', 'Filter' => 'Event: UserEvent'];
        $this->sendRequestTimeout('Filter', $params);
        // Отправим пинг.
        $req        = '';
        $parameters = [
            'Action'    => 'UserEvent',
            'UserEvent' => $pingTube,
        ];
        foreach ($parameters as $var => $val) {
            $req .= "$var: $val\r\n";
        }
        $req .= "\r\n";
        if ( ! is_resource($this->socket)) {
            return [];
        }
        $this->sendDataToSocket($req);

        // Замеряем время.
        $time_start = $this->microtimeFloat();
        $result     = false;
        $timeout    = false;

        // Слушаем события, ждем ответ.
        do {
            $type       = '';
            $parameters = [];
            if ( ! is_resource($this->socket)) {
                return false;
            }
            $buffer = $this->getStringDataFromSocket();
            while (!empty($buffer)) {
                $a = strpos($buffer, ':');
                if ($a) {
                    if ( ! count($parameters)) {
                        $type = strtolower(substr($buffer, 0, $a));
                    }
                    $parameters[substr($buffer, 0, $a)] = substr($buffer, $a + 2);
                }
                $buffer = $this->getStringDataFromSocket();
            }

            if ($type === '' && count($this->Ping()) === 0) {
                $timeout = true;
            } elseif (
                'event' === $type
                && $parameters['Event'] === 'UserEvent'
                && "{$pingTube}Pong" === $parameters['UserEvent']) {
                // Ответ получен.
                $result = true;
                break;
            }
            $time = $this->microtimeFloat() - $time_start;
            if ($time > 5) {
                // Таймаут ожидания.
                break;
            }
        } while ( ! $timeout);

        return $result;
    }

    /**
     * Send a request
     *
     * @param string $action
     * @param array  $parameters
     *
     * @return array of parameters
     */
    public function sendRequestTimeout($action, $parameters = [])
    {
        if ( ! is_resource($this->socket) && !$this->connectDefault()) {
            return [];
        }
        // Прописываем обязательные поля.
        $parameters['Action']   = $action;
        $parameters['ActionID'] = $parameters['ActionID'] ?? "{$action}_".getmypid();
        $req = "";
        foreach ($parameters as $var => $val) {
            $req .= "$var: $val\r\n";
        }
        $req .= "\r\n";

        $result = $this->sendDataToSocket($req);
        if(!$result) {
            usleep(500000);
            if($this->connectDefault()){
                $result = $this->sendDataToSocket($req);
            }
        }

        $response = [];
        if($result){
            $response = $this->waitResponse(true);
        }
        return $response;
    }

    private function connectDefault():bool{
        $this->connect(null, null, null, $this->listenEvents);
        return $this->loggedIn();
    }

    /**
     * Wait for a response
     *
     * If a request was just sent, this will return the response.
     * Otherwise, it will loop forever, handling events.
     *
     * @param bool $allow_timeout if the socket times out, return an empty array
     *
     * @return array of parameters, empty on timeout
     */
    public function waitResponse($allow_timeout = false): array
    {
        $timeout = false;
        do {
            $type       = null;
            $parameters = [];
            $response   = [];
            if(!$this->waitResponseGetInitialData($response)) {
                return $parameters;
            }
            if(isset($response['data']) && empty($response['data']) && !$this->waitResponseGetInitialData($response)){
                return $parameters;
            }
            $buffer = $response['data']??'';
            while ($buffer !== '') {
                $a = strpos($buffer, ':');
                if ($a) {
                    $event_text = substr($buffer, $a + 2);
                    $this->waitResponseGetEventType($parameters, $buffer, $a, $type);
                    $this->waitResponseReadFollowsPart($event_text,$parameters);
                    $this->waitResponseReadCompletePart($event_text, $parameters);
                    $parameters[substr($buffer, 0, $a)] = $event_text;
                }
                $buffer = $this->getStringDataFromSocket();
            }
            $this->waitResponseProcessResponse($type, $timeout, $allow_timeout, $parameters);
        } while ($type !== 'response' && ! $timeout);

        return $parameters;
    }

    /**
     * Получение первичных данных из соекта.
     * @param $response
     * @return bool
     */
    private function waitResponseGetInitialData(& $response):bool{
        if ( !is_resource($this->socket) && !$this->connectDefault()) {
            return false;
        }
        $result = true;
        $response = $this->getDataFromSocket();
        if(isset($response['error'])) {
            usleep(500000);
            if($this->connectDefault()){
                $response = $this->getDataFromSocket();
            }
        }
        if(isset($response['error'])) {
            $result = false;
        }
        return $result;
    }

    /**
     * Ответ получен, обработка ответа.
     * @param $type
     * @param $timeout
     * @param $allow_timeout
     * @param $parameters
     */
    private function waitResponseProcessResponse($type, & $timeout, $allow_timeout, $parameters):void{
        switch ($type) {
            case '':
                // Timeout occured
                $timeout = $allow_timeout;
                break;
            case 'event':
                $this->processEvent($parameters);
                break;
            case 'response':
                break;
        }
    }

    /**
     * Получаем тип ивента.
     * @param $parameters
     * @param $buffer
     * @param $a
     * @param $type
     */
    private function waitResponseGetEventType($parameters, $buffer, $a, & $type):void{
        if ( ! count($parameters)) {
            $type = strtolower(substr($buffer, 0, $a));
        }
    }

    /**
     * Получение мноопакетного ответа.
     * @param $event_text
     * @param $parameters
     */
    private function waitResponseReadFollowsPart($event_text, & $parameters):void{
        if ( ($event_text === 'Follows') && !count($parameters)) {
            // A follows response means there is a miltiline field that follows.
            $parameters['data'] = '';
            $buff               = $this->getStringDataFromSocket();
            while (strpos($buff, '--END ') !== 0) {
                $parameters['data'] .= $buff;
                $buff               = $this->getStringDataFromSocket();
            }
        }
    }

    /**
     * Индивидуальная обработка для ряда запросов.
     * Многопакетные ответы.
     * @param $event_text
     * @param $parameters
     */
    private function waitResponseReadCompletePart($event_text, & $parameters):void{
        $settings = [
            'Queue status will follow'          => 'QueueStatusComplete',
            'Channels will follow'              => 'CoreShowChannelsComplete',
            'Result will follow'                => 'DBGetComplete',
            'Parked calls will follow'          => 'ParkedCallsComplete',
            'Peer status list will follow'      => 'PeerlistComplete',
            'IAX Peer status list will follow'  => 'PeerlistComplete',
            'Registrations will follow'         => 'RegistrationsComplete',
            'Meetme user list will follow'      => 'MeetmeListComplete',
            'Meetme conferences will follow'    => 'MeetmeListRoomsComplete',
            'Following are Events for each object associated with the Endpoint' => 'EndpointDetailComplete',
            'Following are Events for each Outbound registration'               => 'OutboundRegistrationDetailComplete',
            'A listing of Endpoints follows, presented as EndpointList events'  => 'EndpointListComplete'
        ];
        $eventsAsNotArray = [];//[ 'EndpointDetailComplete' ];

        $endString = $settings[$event_text]??false;
        if($endString !== false){
            $NotArray = !in_array($endString,$eventsAsNotArray);
            $this->waitResponseGetSubData($parameters, $endString, $NotArray);
        }
    }

    /**
     * Читает данные из сокета. Если возникает ошибка возвращает ее.
     * @return array
     */
    private function getDataFromSocket() {
        $response = [];
        if(!is_resource($this->socket)){
            $response['error'] = 'Socket not init.';
            return $response;
        }
        try {
            $resultFgets = fgets($this->socket, 4096);
            if($resultFgets !== false){
                $buffer = trim($resultFgets);
                $response['data']  = $buffer;
            }else{
                $response['error'] = 'Read data error.';
            }

        }catch (Throwable $e){
            $response['error'] = $e->getMessage();
        }

        return $response;
    }

    /**
     * Читает данные из сокета
     * @return string
     */
    private function getStringDataFromSocket() {
        $response = $this->getDataFromSocket();
        return $response['data'] ?? '';
    }

    /**
     * Отправляет данные в сокет.
     * @param $req
     * @return bool
     */
    private function sendDataToSocket($req) : bool{
        if(!is_resource($this->socket)){
            return false;
        }
        $result = true;
        try {
            $resultWrite = fwrite($this->socket, $req);
            if($resultWrite === false){
                $result = false;
            }
        }catch (Throwable $e){
            $result = false;
        }
        return $result;
    }

    private function waitResponseGetSubData(&$parameters, $end_string = '', $event_as_array = true): void
    {
        if ( ! is_array($parameters)) {
            $parameters = [];
        }
        if (empty($end_string)) {
            return;
        }
        $parameters['data'] = [];
        $m                  = [];
        do {
            $value = '';
            $buff  = $this->getStringDataFromSocket().$value;
            $a_pos = strpos($buff, ':');
            if ( ! $a_pos) {
                if (!empty($m)) {
                    if ($event_as_array) {
                        $parameters['data'][$m['Event']][] = $m;
                    } else {
                        $parameters['data'][$m['Event']] = $m;
                    }
                }
                $m = [];
                continue;
            }

            $key   = trim(substr($buff, 0, $a_pos));
            $value = trim(substr($buff, $a_pos + 1));

            $m[$key] = $value;
        } while ($value !== $end_string);
    }

    /**
     * Process event
     *
     * @access private
     *
     * @param array $parameters
     *
     * @return mixed result of event handler or false if no handler was found
     */
    public function processEvent($parameters)
    {
        $ret = false;
        $e   = strtolower($parameters['Event']);

        $handler = '';
        if (isset($this->event_handlers[$e])) {
            $handler = $this->event_handlers[$e];
        } elseif (isset($this->event_handlers['*'])) {
            $handler = $this->event_handlers['*'];
        }
        if (is_array($handler)) {
            call_user_func($handler, $parameters);
        } elseif (function_exists($handler)) {
            $ret = $handler($e, $parameters, $this->server, $this->port);
        }

        return $ret;
    }

    public function microtimeFloat()
    {
        [$usec, $sec] = explode(" ", microtime());

        return ((float)$usec + (float)$sec);
    }

    /**
     * Ping
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+Ping
     */
    public function Ping()
    {
        return $this->sendRequestTimeout('Ping');
    }

    /**
     * Wait for a user events.
     *
     * @param $allow_timeout bool
     *
     * @return array of parameters, empty on timeout
     */
    public function waitUserEvent($allow_timeout = false): array
    {
        $timeout = false;
        do {
            $type       = '';
            $parameters = [];
            $buffer = $this->getStringDataFromSocket();
            while ($buffer !== '') {
                $pos = strpos($buffer, ':');
                if ($pos) {
                    if ( ! count($parameters)) {
                        $type = strtolower(substr($buffer, 0, $pos));
                    }
                    $parameters[substr($buffer, 0, $pos)] = substr($buffer, $pos + 2);
                }
                $buffer = $this->getStringDataFromSocket();
            }
            if ($type === '' && count($this->Ping()) === 0) {
                $timeout = $allow_timeout;
            } elseif (stripos($type, 'event')!==false ) {
                $this->processEvent($parameters);
            }
        } while ( ! $timeout);

        return $parameters;
    }

    // *********************************************************************************************************
    // **                       COMMANDS                                                                      **
    // *********************************************************************************************************

    /**
     * Connect to Asterisk
     *
     * @param ?string $server
     * @param ?string $username
     * @param ?string $secret
     * @param string $events
     *
     * @return bool true on success
     * @example examples/sip_show_peer.php Get information about a sip peer
     *
     */
    public function connect($server = null, $username = null, $secret = null, $events = 'on')
    {
        $this->listenEvents = $events;
        // use config if not specified
        if (is_null($server)) {
            $server = $this->config['asmanager']['server'];
        }
        if (is_null($username)) {
            $username = $this->config['asmanager']['username'];
        }
        if (is_null($secret)) {
            $secret = $this->config['asmanager']['secret'];
        }

        // get port from server if specified
        if (strpos($server, ':') !== false) {
            $c            = explode(':', $server);
            $this->server = $c[0];
            $this->port   = (int)$c[1];
        } else {
            $this->server = $server;
            $this->port   = $this->config['asmanager']['port'];
        }

        // connect the socket
        $errno   = $errstr = null;
        $timeout = 2;

        $this->socket = @fsockopen($this->server, $this->port, $errno, $errstr, $timeout);
        if ($this->socket == false) {
            Util::sysLogMsg('asmanager', "Unable to connect to manager {$this->server}:{$this->port} ($errno): $errstr", LOG_ERR);
            return false;
        }
        // PT1C;
        stream_set_timeout($this->socket, 1, 0);

        // read the header
        $str = $this->getStringDataFromSocket();
        if ($str === '') {
            // a problem.
            Util::sysLogMsg('asmanager', "Asterisk Manager header not received.", LOG_ERR);
            return false;
        }

        // login
        $res = $this->sendRequest('login', ['Username' => $username, 'Secret' => $secret, 'Events' => $events]);
        if ($res['Response'] != 'Success') {
            $this->_loggedIn = false;
            Util::sysLogMsg('asmanager', "Failed to login.", LOG_ERR);
            $this->disconnect();
            return false;
        }
        $this->_loggedIn = true;

        return true;
    }

    /**
     * Send a request
     *
     * @param string $action
     * @param array  $parameters
     *
     * @return array of parameters
     */
    public function sendRequest($action, $parameters = [])
    {
        $req = "Action: $action\r\n";
        foreach ($parameters as $var => $val) {
            $req .= "$var: $val\r\n";
        }
        $req .= "\r\n";
        if ( ! is_resource($this->socket)) {
            return [];
        }
        $this->sendDataToSocket($req);

        return $this->waitResponse();
    }

    /**
     * Disconnect
     *
     * @example examples/sip_show_peer.php Get information about a sip peer
     */
    public function disconnect()
    {
        if ($this->_loggedIn === true) {
            $this->logoff();
        }
        if (is_resource($this->socket)) {
            fclose($this->socket);
        }
    }

    /**
     * Logoff Manager
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+Logoff
     */
    private function Logoff()
    {
        return $this->sendRequestTimeout('Logoff');
    }

    public function loggedIn()
    {
        return $this->_loggedIn;
    }

    /**
     * Set Absolute Timeout
     *
     * Hangup a channel after a certain time.
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+AbsoluteTimeout
     *
     * @param string $channel Channel name to hangup
     * @param int    $timeout Maximum duration of the call (sec)
     *
     * @return array
     */
    public function AbsoluteTimeout($channel, $timeout)
    {
        return $this->sendRequest('AbsoluteTimeout', ['Channel' => $channel, 'Timeout' => $timeout]);
    }

    /**
     * Change monitoring filename of a channel
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+ChangeMonitor
     *
     * @param string $channel the channel to record.
     * @param string $file    the new name of the file created in the monitor spool directory.
     *
     * @return array
     */
    public function ChangeMonitor($channel, $file)
    {
        return $this->sendRequest('ChangeMontior', ['Channel' => $channel, 'File' => $file]);
    }

    /**
     * Execute Command
     *
     * @param string $command
     * @param ?string $actionid message matching variable
     *
     * @return array
     * @example examples/sip_show_peer.php Get information about a sip peer
     * @link    http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+Command
     * @link    http://www.voip-info.org/wiki-Asterisk+CLI
     */
    public function Command($command, $actionid = null)
    {
        $parameters = ['Command' => $command];
        if ($actionid) {
            $parameters['ActionID'] = $actionid;
        }

        return $this->sendRequest('Command', $parameters);
    }

    /**
     * Enable/Disable sending of events to this manager
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+Events
     *
     * @param string $eventMask is either 'on', 'off', or 'system,call,log'
     *
     * @return array
     */
    public function Events($eventMask)
    {
        return $this->sendRequest('Events', ['EventMask' => $eventMask]);
    }

    /**
     * Check Extension Status
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+ExtensionState
     *
     * @param string $exten    Extension to check state on
     * @param string $context  Context for extension
     * @param ?string $actionid message matching variable
     *
     * @return array
     */
    public function ExtensionState($exten, $context, $actionid = null)
    {
        $parameters = ['Exten' => $exten, 'Context' => $context];
        if ($actionid) {
            $parameters['ActionID'] = $actionid;
        }

        return $this->sendRequest('ExtensionState', $parameters);
    }

    /**
     * Возвращает массив активных каналов.
     *
     * @param bool $group
     *
     * @return array
     */
    public function GetChannels($group = true)
    {
        $res      = $this->sendRequestTimeout('CoreShowChannels');
        $channels = null;
        if (isset($res['data']['CoreShowChannel'])) {
            $channels = $res['data']['CoreShowChannel'];
        }
        $channels_id = [];
        if (null !== $channels) {
            foreach ($channels as $chan) {
                if ($group === true) {
                    if ( ! isset($chan['Linkedid'])) {
                        continue;
                    }
                    $channels_id[$chan['Linkedid']][] = $chan['Channel'];
                } else {
                    $channels_id[] = $chan['Channel'];
                }
            }
        }

        return $channels_id;
    }

    /**
     * Hangup Channel
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+Hangup
     *
     * @param string $channel The channel name to be hungup
     *
     * @return array
     */
    public function Hangup($channel)
    {
        return $this->sendRequest('Hangup', ['Channel' => $channel]);
    }

    /**
     * List IAX Peers
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+IAXpeers
     * @return array
     */
    public function IAXpeerlist()
    {
        $result   = $this->sendRequestTimeout('IAXpeerlist');
        $data     = (isset($result['data']) && is_array($result['data'])) ? $result['data'] : [];
        $arr_peer = (isset($data['PeerEntry']) && is_array($data['PeerEntry'])) ? $data['PeerEntry'] : [];

        return $arr_peer;
    }

    /**
     * Возвращает регистрации пиров.
     *
     * @return array
     */
    public function IAXregistry(): array
    {
        $result   = $this->sendRequestTimeout('IAXregistry');
        $data     = (isset($result['data']) && is_array($result['data'])) ? $result['data'] : [];
        $arr_peer = (isset($data['RegistryEntry']) && is_array($data['RegistryEntry'])) ? $data['RegistryEntry'] : [];

        return $arr_peer;
    }

    /**
     * List available manager commands
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+ListCommands
     *
     * @param string $actionid message matching variable
     *
     * @return array
     */
    public function ListCommands($actionid = null)
    {
        if ($actionid) {
            return $this->sendRequest('ListCommands', ['ActionID' => $actionid]);
        } else {
            return $this->sendRequest('ListCommands');
        }
    }

    /**
     * Отправка event в AMI.
     *
     * @param string $name
     * @param array  $headers
     *
     * @return array
     */
    public function UserEvent($name, $headers)
    {
        $headers['UserEvent'] = $name;

        return $this->sendRequestTimeout('UserEvent', $headers);
    }

    /**
     * Check Mailbox Message Count
     *
     * Returns number of new and old messages.
     *   Message: Mailbox Message Count
     *   Mailbox: <mailboxid>
     *   NewMessages: <count>
     *   OldMessages: <count>
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+MailboxCount
     *
     * @param string $mailbox  Full mailbox ID <mailbox>@<vm-context>
     * @param string $actionid message matching variable
     *
     * @return array
     */
    public function MailboxCount($mailbox, $actionid = null)
    {
        $parameters = ['Mailbox' => $mailbox];
        if ($actionid) {
            $parameters['ActionID'] = $actionid;
        }

        return $this->sendRequest('MailboxCount', $parameters);
    }

    /**
     * Check Mailbox
     *
     * Returns number of messages.
     *   Message: Mailbox Status
     *   Mailbox: <mailboxid>
     *   Waiting: <count>
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+MailboxStatus
     *
     * @param string $mailbox  Full mailbox ID <mailbox>@<vm-context>
     * @param string $actionid message matching variable
     *
     * @return array
     */
    public function MailboxStatus($mailbox, $actionid = null)
    {
        $parameters = ['Mailbox' => $mailbox];
        if ($actionid) {
            $parameters['ActionID'] = $actionid;
        }

        return $this->sendRequest('MailboxStatus', $parameters);
    }

    /**
     * Monitor a channel
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+Monitor
     *
     * @param string $channel
     * @param string $file
     * @param string $format
     * @param bool   $mix
     *
     * @return array
     */
    public function Monitor($channel, $file = null, $format = null, $mix = null)
    {
        $parameters = ['Channel' => $channel];
        if ($file) {
            $parameters['File'] = $file;
        }
        if ($format) {
            $parameters['Format'] = $format;
        }
        if ( ! is_null($file)) {
            $parameters['Mix'] = ($mix) ? 'true' : 'false';
        }

        return $this->sendRequest('Monitor', $parameters);
    }

    /**
     * MixMonitor a channel
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+Monitor
     *
     * @param string $channel
     * @param string $file
     * @param string $options
     * @param string $command
     *
     * @return array
     */
    public function MixMonitor($channel, $file, $options, $command='', string $ActionID = '')
    {
        $parameters            = [
            'Channel' => $channel,
            'File'    => $file,
            'options' => $options,
            'ActionID'=> $ActionID
        ];
        if(!empty($command)){
            $parameters['Command'] = $command;
        }
        return $this->sendRequestTimeout('MixMonitor', $parameters);
    }

    /**
     * StopMixMonitor a channel
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+Monitor
     *
     * @param string $channel
     * @param string $ActionID
     *
     * @return array
     */
    public function StopMixMonitor($channel, string $ActionID = '')
    {
        $parameters = [
            'Channel' => $channel,
            'ActionID'=> $ActionID
        ];
        return $this->sendRequestTimeout('StopMixMonitor', $parameters);
    }

    /**
     * DBGet a channel
     *
     * @param string $Family
     * @param string $Key
     * @param string $Val
     *
     * @return array
     */
    public function DBPut($Family, $Key, $Val = '')
    {
        $parameters = ['Family' => $Family, 'Key' => $Key, 'Val' => $Val];
        return $this->sendRequestTimeout('DBPut', $parameters);
    }

    /**
     * MeetmeListRooms
     *
     * @param $ActionID
     *
     * @return array
     */
    public function MeetmeListRooms($ActionID = ''): array
    {
        if (empty($ActionID)) {
            $ActionID = Util::generateRandomString(5);
        }
        $parameters = [
            'ActionID' => $ActionID,
        ];

        return $this->sendRequestTimeout('MeetmeListRooms', $parameters);
    }

    /**
     * DBGet a channel
     *
     * @param string $Family
     * @param string $Key
     *
     * @return array
     */
    public function DBGet($Family, $Key)
    {
        $parameters = ['Family' => $Family, 'Key' => $Key];

        return $this->sendRequestTimeout('DBGet', $parameters);
    }

    /**
     * Originate Call
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+Originate
     *
     * @param string $channel     Channel name to call
     * @param ?string $exten       Extension to use (requires 'Context' and 'Priority')
     * @param ?string $context     Context to use (requires 'Exten' and 'Priority')
     * @param ?string $priority    Priority to use (requires 'Exten' and 'Context')
     * @param ?string $application Application to use
     * @param ?string $data        Data to use (requires 'Application')
     * @param ?int    $timeout     How long to wait for call to be answered (in ms)
     * @param ?string $callerid    Caller ID to be set on the outgoing channel
     * @param ?string $variable    Channel variable to set (VAR1=value1|VAR2=value2)
     * @param ?string $account     Account code
     * @param bool   $async       true fast origination
     * @param ?string $actionid    message matching variable
     *
     * @return array
     */
    public function Originate(
        $channel,
        $exten = null,
        $context = null,
        $priority = null,
        $application = null,
        $data = null,
        $timeout = null,
        $callerid = null,
        $variable = null,
        $account = null,
        $async = true,
        $actionid = null
    ) {

        $parameters = [
            'Exten'         => $exten,
            'Context'       => $context,
            'Priority'      => $priority,
            'Application'   => $application,
            'Data'          => $data,
            'Timeout'       => $timeout,
            'CallerID'      => $callerid,
            'Variable'      => $variable,
            'Account'       => $account,
            'ActionID'      => $actionid
        ];
        $keys = array_keys($parameters);
        foreach ($keys as $key){
            if(empty($parameters[$key])){
                unset($parameters[$key]);
            }
        }
        $parameters['Channel'] = $channel;
        $parameters['Async']   = ($async === true) ? 'true' : 'false';

        return $this->sendRequest('Originate', $parameters);
    }

    /**
     * List parked calls
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+ParkedCalls
     *
     * @param string $actionid   message matching variable
     * @param string $parkinglot message matching variable
     *
     * @return array
     */
    public function ParkedCalls($parkinglot = null, $actionid = null)
    {
        $parameters = [];
        if ($actionid) {
            $parameters['ActionID'] = $actionid;
        }
        if ($parkinglot) {
            $parameters['ParkingLot'] = $parkinglot;
        }
        $result = $this->sendRequestTimeout('ParkedCalls', $parameters);

        return $result;
    }

    /**
     * Queue Add
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+QueueAdd
     *
     * @param string $queue
     * @param string $interface
     * @param int    $penalty
     *
     * @return array
     */
    public function QueueAdd($queue, $interface, $penalty = 0)
    {
        $parameters = ['Queue' => $queue, 'Interface' => $interface];
        if ($penalty) {
            $parameters['Penalty'] = $penalty;
        }

        return $this->sendRequest('QueueAdd', $parameters);
    }

    /**
     * Queue Remove
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+QueueRemove
     *
     * @param string $queue
     * @param string $interface
     *
     * @return array
     */
    public function QueueRemove($queue, $interface)
    {
        return $this->sendRequest('QueueRemove', ['Queue' => $queue, 'Interface' => $interface]);
    }

    /**
     * Queues
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+Queues
     */
    public function Queues()
    {
        return $this->sendRequest('Queues');
    }

    /**
     * Queue Status
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+QueueStatus
     *
     * @param string $actionid message matching variable
     *
     * @return array
     */
    public function QueueStatus($actionid = null)
    {
        if ($actionid) {
            return $this->sendRequest('QueueStatus', ['ActionID' => $actionid]);
        } else {
            return $this->sendRequest('QueueStatus');
        }
    }

    /**
     * Redirect
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+Redirect
     *
     * @param string $channel
     * @param string $extrachannel
     * @param string $exten
     * @param string $context
     * @param string $priority
     *
     * @return array
     */
    public function Redirect($channel, $extrachannel, $exten, $context, $priority)
    {
        return $this->sendRequest(
            'Redirect',
            [
                'Channel'      => $channel,
                'ExtraChannel' => $extrachannel,
                'Exten'        => $exten,
                'Context'      => $context,
                'Priority'     => $priority,
            ]
        );
    }

    /**
     * Set the CDR UserField
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+SetCDRUserField
     *
     * @param string $userfield
     * @param string $channel
     * @param string $append
     *
     * @return array
     */
    public function SetCDRUserField($userfield, $channel, $append = null)
    {
        $parameters = ['UserField' => $userfield, 'Channel' => $channel];
        if ($append) {
            $parameters['Append'] = $append;
        }

        return $this->sendRequest('SetCDRUserField', $parameters);
    }

    /**
     * Set Channel Variable
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+SetVar
     *
     * @param string $channel  Channel to set variable for
     * @param string $variable name
     * @param string $value
     *
     * @return array
     */
    public function SetVar($channel, $variable, $value)
    {
        $params = [
            'Channel'   => $channel,
            'Variable'  => $variable,
            'Value'     => $value
        ];
        return $this->sendRequestTimeout('SetVar', $params);
    }

    /**
     * Channel Status
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+Status
     *
     * @param string $channel
     * @param null|string $actionid message matching variable
     *
     * @return array
     */
    public function Status($channel, $actionid = null)
    {
        $parameters = ['Channel' => $channel];
        if ($actionid) {
            $parameters['ActionID'] = $actionid;
        }

        return $this->sendRequest('Status', $parameters);
    }

    /*
    * MIKO Start.
    */

    /**
     * Stop monitoring a channel
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+StopMonitor
     *
     * @param string $channel
     *
     * @return array
     */
    public function StopMonitor($channel)
    {
        return $this->sendRequest('StopMonitor', ['Channel' => $channel]);
    }

    /**
     * Полученире текущих регистраций.
     *
     * @return array
     */
    public function getSipRegistry()
    {
        $peers  = [];
        $result = $this->sendRequestTimeout('SIPshowregistry');
        if ($result['data'] !== null && $result['data']['RegistryEntry'] !== null) {
            foreach ($result['data']['RegistryEntry'] as $peer) {
                $peers[] = [
                    'id'       => $peer['Username'],
                    'state'    => strtoupper($peer['State']),
                    'host'     => $peer['Host'],
                    'username' => $peer['Username'],
                ];
            }
        }

        return $peers;
    }

    /**
     * Полученире текущих регистраций.
     *
     * @return array
     */
    public function getPjSipRegistry(): array
    {
        $peers  = [];
        $result = $this->sendRequestTimeout('PJSIPShowRegistrationsOutbound');
        if (isset($result['data']['OutboundRegistrationDetail'])) {
            foreach ($result['data']['OutboundRegistrationDetail'] as $peer) {
                [$sip, $host, $port] = explode(':', $peer['ServerUri']);
                $peers[] = [
                    'id'       => str_replace('REG-', '', $peer['ObjectName']),
                    'state'    => strtoupper($peer['Status']),
                    'host'     => $host,
                    'username' => $peer['ContactUser'],
                ];
                unset($sip, $port);
            }
        }

        return $peers;
    }

    /**
     * Полученире статусов пиров.
     *
     * @return array
     */
    public function getPjSipPeers(): array
    {
        $peers  = [];
        $result = $this->sendRequestTimeout('PJSIPShowEndpoints');
        $endpoints = $result['data']['EndpointList']??[];
        foreach ($endpoints as $peer) {
            if ($peer['ObjectName'] === 'anonymous') {
                continue;
            }
            $state_array = [
                'Not in use' => 'OK',
                'Busy'       => 'OK',
            ];
            $state       = $state_array[$peer['DeviceState']] ?? 'UNKNOWN';
            $oldAState   = $peers[$peer['Auths']]['state']??'';

            if('OK' === $oldAState || empty($peer['Auths'])){
                continue;
            }

            $peers[$peer['Auths']] = [
                'id'        => $peer['Auths'],
                'state'     => strtoupper($state)
            ];
        }
        return array_values($peers);
    }

    /**
     * Получение статусов пиров.
     *
     * @return array
     */
    public function getSipPeers():array
    {
        $peers = [];
        $res   = $this->sendRequestTimeout('SIPpeers');
        if (isset($res['data']) && $res['data'] != null && $res['data']['PeerEntry'] != null) {
            foreach ($res['data']['PeerEntry'] as $peer) {
                if ( ! is_numeric($peer['ObjectName'])) {
                    continue;
                }
                // if ('Unmonitored' == $peer['Status']) continue;
                $arr_status = explode(' ', $peer['Status']);
                $peers[]    = ['id' => $peer['ObjectName'], 'state' => strtoupper($arr_status[0]),];
            }
        }

        return $peers;
    }

    /**
     * Получение статуса конкретного пира.
     *
     * @param $peer
     *
     * @return array
     */
    public function getSipPeer($peer)
    {
        $parameters           = ['Peer' => trim($peer)];
        $res                  = $this->sendRequestTimeout('SIPshowpeer', $parameters);
        $arr_status           = explode(' ', $res['Status']);
        $res['state']         = strtoupper($arr_status[0]);
        $res['time-response'] = strtoupper(str_replace(['(', ')'], '', $arr_status[1]));

        return $res;
    }

    /**
     * Получение статуса конкретного пира.
     *
     * @param $peer
     * @param string $prefix
     *
     * @return array
     */
    public function getPjSipPeer($peer, string $prefix = ''):array
    {
        $result     = [];
        if(empty($prefix)){
            $wsResult     = $this->getPjSipPeer($peer, "WS");
            if($wsResult['state'] !== 'UNKNOWN'){
                $result = $wsResult;
            }
            $parameters = ['Endpoint' => trim($peer)];
            unset($wsResult);
        }else{
            $parameters = ['Endpoint' => trim($peer)."-$prefix"];
        }

        $res        = $this->sendRequestTimeout('PJSIPShowEndpoint', $parameters);
        $generalRecordFound = !empty($result);
        foreach ($res['data']['ContactStatusDetail']??[] as $index => $data){
            $suffix = "-$prefix$index";
            if(!empty($data['URI']) && !$generalRecordFound){
                $generalRecordFound = true;
                $suffix = '';
            }
            foreach ($data as $key => $value){
                $result["$key$suffix"] = $value;
            }
        }
        $result['state'] = isset($result['URI']) && ! empty($result['URI']) ? 'OK' : 'UNKNOWN';
        return $result;
    }

    /*
    * MIKO End.
    */

    // *********************************************************************************************************
    // **                       MISC                                                                          **
    // *********************************************************************************************************

    /**
     * @param       $conference
     * @param array $vars
     *
     * @return array
     */
    public function meetMeCollectInfo($conference, $vars = []): array
    {
        $result    = [];
        $conf_data = $this->MeetmeList($conference);
        if ( ! isset($conf_data['data']['MeetmeList'])) {
            return $result;
        }
        foreach ($conf_data['data']['MeetmeList'] as $user_data) {
            $user_data['linkedid']  = $this->GetVar($user_data['Channel'], 'CHANNEL(linkedid)', null, false);
            $user_data['meetme_id'] = $this->GetVar($user_data['Channel'], 'MEETMEUNIQUEID', null, false);

            foreach ($vars as $var) {
                $user_data[$var] = $this->GetVar($user_data['Channel'], $var, null, false);
            }

            $result[] = $user_data;
        }

        return $result;
    }

    /**
     * MeetmeList
     *
     * @param $Conference
     * @param $ActionID
     *
     * @return array
     */
    public function MeetmeList($Conference, $ActionID = ''): array
    {
        if (empty($ActionID)) {
            $ActionID = Util::generateRandomString(5);
        }
        $parameters = [
            'Conference' => $Conference,
            'ActionID'   => $ActionID,
        ];

        return $this->sendRequestTimeout('MeetmeList', $parameters);
    }

    /**
     * Gets a Channel Variable
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+GetVar
     * @link http://www.voip-info.org/wiki-Asterisk+variables
     *
     * @param string      $channel  Channel to read variable from
     * @param string      $variable
     * @param null|string $actionId message matching variable
     * @param bool        $retArray
     *
     * @return string | array
     */
    public function GetVar($channel, $variable, $actionId = null, $retArray = true)
    {
        $parameters = ['Channel' => $channel, 'Variable' => $variable];
        if ($actionId) {
            $parameters['ActionID'] = $actionId;
        }

        $data = $this->sendRequestTimeout('GetVar', $parameters);
        if ($retArray !== true) {
            $data = (isset($data['Value']) && $data['Value']) ? $data['Value'] : '';
        }

        return $data;
    }

    /**
     * Add event handler
     *
     * Known Events include ( http://www.voip-info.org/wiki-asterisk+manager+events )
     *   Link - Fired when two voice channels are linked together and voice data exchange commences.
     *   Unlink - Fired when a link between two voice channels is discontinued, for example, just before call
     *   completion. Newexten - Hangup - Newchannel - Newstate - Reload - Fired when the "RELOAD" console command is
     *   executed. Shutdown - ExtensionStatus - Rename - Newcallerid - Alarm - AlarmClear - Agentcallbacklogoff -
     *   Agentcallbacklogin - Agentlogoff - MeetmeJoin - MessageWaiting - join - leave - AgentCalled - ParkedCall -
     *   Fired after ParkedCalls Cdr - ParkedCallsComplete - QueueParams - QueueMember - QueueStatusEnd - Status -
     *   StatusComplete - ZapShowChannels - Fired after ZapShowChannels ZapShowChannelsComplete -
     *
     * @param string         $event    type or * for default handler
     * @param string | array $callback function
     *
     * @return bool sucess
     */
    public function addEventHandler($event, $callback)
    {
        $event = strtolower($event);
        if (isset($this->event_handlers[$event])) {
            return false;
        }
        $this->event_handlers[$event] = $callback;

        return true;
    }
}