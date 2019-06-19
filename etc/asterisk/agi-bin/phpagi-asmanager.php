<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 12 2018
 */


/**
 * Written for PHP 4.3.4, should work with older PHP 4.x versions.
 * Please submit bug reports, patches, etc to http://sourceforge.net/projects/phpagi/
 * Gracias. :)
 *
 */

if (!class_exists('AGI')) {
    require_once(dirname(__FILE__) . DIRECTORY_SEPARATOR . 'phpagi.php');
}

/**
 * Asterisk Manager class
 *
 * @link http://www.voip-info.org/wiki-Asterisk+config+manager.conf
 * @link http://www.voip-info.org/wiki-Asterisk+manager+API
 * @example examples/sip_show_peer.php Get information about a sip peer
 * @package phpAGI
 */
class AGI_AsteriskManager {
    /**
     * Config variables
     *
     * @var array
     * @access public
     */
    public $config;

    /**
     * Socket
     *
     * @access public
     */
    public $socket = NULL;

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
     * @var integer
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
     * @var boolean
     */
    private $_logged_in = FALSE;

    /**
     * Constructor
     *
     * @param string $config is the name of the config file to parse or a parent agi from which to read the config
     * @param array  $optconfig is an array of configuration vars and vals, stuffed into $this->config['asmanager']
     */
    function __construct($config = NULL, $optconfig = array()){
        // load config
        if (!is_null($config) && file_exists($config)) $this->config = parse_ini_file($config, true); elseif (file_exists(DEFAULT_PHPAGI_CONFIG)) $this->config = parse_ini_file(DEFAULT_PHPAGI_CONFIG, true);

        // If optconfig is specified, stuff vals and vars into 'asmanager' config array.
        foreach ($optconfig as $var => $val) $this->config['asmanager'][$var] = $val;

        // add default values to config for uninitialized values
        if (!isset($this->config['asmanager']['server'])) $this->config['asmanager']['server'] = 'localhost';
        if (!isset($this->config['asmanager']['port'])) $this->config['asmanager']['port'] = 5038;
        if (!isset($this->config['asmanager']['username'])) $this->config['asmanager']['username'] = 'phpagi';
        if (!isset($this->config['asmanager']['secret'])) $this->config['asmanager']['secret'] = 'phpagi';
    }

    /**
     * Send a request
     *
     * @param string $action
     * @param array  $parameters
     * @return array of parameters
     */
    function send_request($action, $parameters = array()){
        $req = "Action: $action\r\n";
        foreach ($parameters as $var => $val) $req .= "$var: $val\r\n";
        $req .= "\r\n";
        if(!is_resource($this->socket)){
            return array();
        }
        @fwrite($this->socket, $req);
        return $this->wait_response();
    }

    /**
     * Send a request
     *
     * @param string $action
     * @param array  $parameters
     * @return array of parameters
     */
    function send_request_timeout($action, $parameters = array()){
        $req = "Action: $action\r\n";
        foreach ($parameters as $var => $val) $req .= "$var: $val\r\n";
        $req .= "\r\n";
        if(!is_resource($this->socket)){
            return array();
        }
        @fwrite($this->socket, $req);
        return $this->wait_response(true);
    }

    /**
     * Проверка работы сервиса AMI.
     * @param string $pingname
     * @return array|bool
     */
    function ping_ami_listner($pingname = 'CdrConnector'){
        // Установим фильтр на события.
        $params   = ['Operation'=>'Add', 'Filter' => 'Event: UserEvent'];
        $this->send_request_timeout('Filter', $params);
        // Отправим пинг.
        $req = '';
        $parameters = array(
            'Action'    => 'UserEvent',
            'UserEvent' => "{$pingname}Ping"
        );
        foreach ($parameters as $var => $val) $req .= "$var: $val\r\n";
        $req .= "\r\n";
        if(!is_resource($this->socket)){
            return array();
        }
        @fwrite($this->socket, $req);

        // Замеряем время.
        $time_start = $this->microtime_float();
        $result  = false;
        $timeout = false;

        // Слушаем события, ждем ответ.
        do {
            $type       = '';
            $parameters = [];
            if(!is_resource($this->socket)){
                return false;
            }
            $buffer = trim(@fgets($this->socket, 4096));
            while ($buffer != '') {
                $a = strpos($buffer, ':');
                if ($a) {
                    if (!count($parameters)){
                        $type = strtolower(substr($buffer, 0, $a));
                    }
                    $parameters[substr($buffer, 0, $a)] = substr($buffer, $a + 2);
                }
                $buffer = trim(fgets($this->socket, 4096));
            }

            if($type == '' && count($this->Ping())==0){
                $timeout = true;
            }
            else if('event' == $type && $parameters['Event'] == 'UserEvent' && "{$pingname}Pong" == $parameters['UserEvent']){
                // Ответ получен.
                $result = true;
                break;
            }
            $time = $this->microtime_float() - $time_start;
            if($time > 2){
                // Таймаут ожидания.
                break;
            }

        } while (!$timeout);

        return $result;
    }

    /**
     * Wait for a response
     *
     * If a request was just sent, this will return the response.
     * Otherwise, it will loop forever, handling events.
     *
     * @param boolean $allow_timeout if the socket times out, return an empty array
     * @return array of parameters, empty on timeout
     */
    public function wait_response($allow_timeout = false){
        $timeout = false;
        do {
            $type = NULL;
            $parameters = array();
            if(!is_resource($this->socket)){
                return $parameters;
            }
            $buffer = trim(@fgets($this->socket, 4096));
            while ($buffer != '') {
                $a = strpos($buffer, ':');
                if ($a) {
                    $key = ''; $value = '';
                    $event_text = substr($buffer, $a + 2);
                    if (!count($parameters)){
                        $type = strtolower(substr($buffer, 0, $a));
                        if ($event_text == 'Follows') {
                            // A follows response means there is a miltiline field that follows.
                            $parameters['data'] = '';
                            $buff = fgets($this->socket, 4096);
                            while (substr($buff, 0, 6) != '--END ') {
                                $parameters['data'] .= $buff;
                                $buff = fgets($this->socket, 4096);
                            }
                        }
                    } else if ('Queue status will follow' == $event_text) {
                        $parameters['data'] = array();
                        $m = array();
                        do {
                            $buff = fgets($this->socket, 4096);
                            $a_pos = strpos($buff, ':');
                            if (!$a_pos) {
                                if (count($m)) {
                                    $parameters['data'][$m['Event']][] = $m;
                                }
                                $m = array();
                                continue;
                            };

                            $key    = trim(substr($buff, 0, $a_pos));
                            $value  = trim(substr($buff, $a_pos + 1));

                            $m[$key] = $value;

                        } while ($value != 'QueueStatusComplete');

                    } else if ('Channels will follow' == $event_text) {
                        $parameters['data'] = array();
                        $m = array();
                        do {
                            $buff = fgets($this->socket, 4096);
                            $a_pos = strpos($buff, ':');
                            if (!$a_pos) {
                                if (count($m)) {
                                    $parameters['data'][$m['Event']][] = $m;
                                }
                                $m = array();
                                continue;
                            };

                            $key = trim(substr($buff, 0, $a_pos));
                            $value = trim(substr($buff, $a_pos + 1));

                            $m[$key] = $value;

                        } while ($value != 'CoreShowChannelsComplete');

                    } else if ('Result will follow' == $event_text) {
                        $parameters['data'] = array();
                        $m = array();
                        do {
                            $buff = fgets($this->socket, 4096);
                            $a_pos = strpos($buff, ':');
                            if (!$a_pos) {
                                if (count($m)) {
                                    $parameters['data'][$m['Event']][] = $m;
                                }
                                $m = array();
                                continue;
                            };

                            $key = trim(substr($buff, 0, $a_pos));
                            $value = trim(substr($buff, $a_pos + 1));

                            $m[$key] = $value;

                        } while ($value != 'DBGetComplete');

                    } else if ('Parked calls will follow' == $event_text) {
                        $parameters['data'] = array();
                        $m = array();
                        do {
                            $buff = fgets($this->socket, 4096);
                            $a_pos = strpos($buff, ':');
                            if (!$a_pos) {
                                if (count($m)) {
                                    $parameters['data'][$m['Event']][] = $m;
                                }
                                $m = array();
                                continue;
                            };

                            $key = trim(substr($buff, 0, $a_pos));
                            $value = trim(substr($buff, $a_pos + 1));

                            $m[$key] = $value;

                        } while ($value != 'ParkedCallsComplete');

                    } else if ('Peer status list will follow' == $event_text) {
                        $parameters['data'] = array();
                        $m = array();
                        do {
                            $buff = fgets($this->socket, 4096);
                            $a_pos = strpos($buff, ':');
                            if (!$a_pos) {
                                if (count($m)) {
                                    $parameters['data'][$m['Event']][] = $m;
                                }
                                $m = array();
                                continue;
                            };

                            $key = trim(substr($buff, 0, $a_pos));
                            $value = trim(substr($buff, $a_pos + 1));

                            $m[$key] = $value;

                        } while ($value != 'PeerlistComplete');
                    } else if ('IAX Peer status list will follow' == $event_text) {
                        $parameters['data'] = array();
                        $m = array();
                        do {
                            $buff = fgets($this->socket, 4096);
                            $a_pos = strpos($buff, ':');
                            if (!$a_pos) {
                                if (count($m)) {
                                    $parameters['data'][$m['Event']][] = $m;
                                }
                                $m = array();
                                continue;
                            };

                            $key = trim(substr($buff, 0, $a_pos));
                            $value = trim(substr($buff, $a_pos + 1));

                            $m[$key] = $value;

                        } while ($value != 'PeerlistComplete');
                    } else if ('Registrations will follow' == $event_text) {
                        $parameters['data'] = array();
                        $m = array();
                        do {
                            $buff = fgets($this->socket, 4096);
                            $a_pos = strpos($buff, ':');
                            if (!$a_pos) {
                                if (count($m)) {
                                    $parameters['data'][$m['Event']][] = $m;
                                }
                                $m = array();
                                continue;
                            };

                            $key = trim(substr($buff, 0, $a_pos));
                            $value = trim(substr($buff, $a_pos + 1));

                            $m[$key] = $value;

                        } while ($value != 'RegistrationsComplete');
                    }
                    unset($key);
                    unset($value);                    //
                    //* PT1C */

                    // store parameter in $parameters
                    $parameters[substr($buffer, 0, $a)] = $event_text;
                }
                $buffer = trim(fgets($this->socket, 4096));
            }

            // process response
            switch ($type) {
                case '': // timeout occured
                    $timeout = $allow_timeout;
                    break;
                case 'event':
                    $this->process_event($parameters);
                    break;
                case 'response':
                    break;
                default:
                    $this->log('Unhandled response packet from Manager: ' . print_r($parameters, true));
                    break;
            }
        } while ($type != 'response' && !$timeout);
        return $parameters;
    }

    /**
     * Wait for a user events.
     * @param $allow_timeout bool
     * @return array of parameters, empty on timeout
     */
    function wait_user_event($allow_timeout = false){
        $timeout = false;
        do {
            $type       = '';
            $parameters = [];
            try{
                $buffer = trim(@fgets($this->socket, 4096));
            }catch (Exception $e){
                return false;
            }
            while ($buffer != '') {
                $a = strpos($buffer, ':');
                if ($a) {
                    if (!count($parameters)){
                        $type = strtolower(substr($buffer, 0, $a));
                    }
                    $parameters[substr($buffer, 0, $a)] = substr($buffer, $a + 2);
                }
                $buffer = trim(fgets($this->socket, 4096));
            }
            if($type == '' && count($this->Ping())==0){
                $timeout = $allow_timeout;
            }
            else if('event' == $type){
                $this->process_event($parameters);
            }
        } while (!$timeout);
        return $parameters;
    }

    /**
     * Connect to Asterisk
     *
     * @example examples/sip_show_peer.php Get information about a sip peer
     *
     * @param string $server
     * @param string $username
     * @param string $secret
     * @param string $events
     * @return boolean true on success
     */
    function connect($server = NULL, $username = NULL, $secret = NULL, $events = 'on'){
        // use config if not specified
        if (is_null($server)) $server = $this->config['asmanager']['server'];
        if (is_null($username)) $username = $this->config['asmanager']['username'];
        if (is_null($secret)) $secret = $this->config['asmanager']['secret'];

        // get port from server if specified
        if (strpos($server, ':') !== false) {
            $c = explode(':', $server);
            $this->server = $c[0];
            $this->port = $c[1];
        } else {
            $this->server = $server;
            $this->port = $this->config['asmanager']['port'];
        }

        // connect the socket
        $errno = $errstr = NULL;
        $timeout = 2;

        $this->socket = @fsockopen($this->server, $this->port, $errno, $errstr, $timeout);
        if ($this->socket == false) {
            $this->log("Unable to connect to manager {$this->server}:{$this->port} ($errno): $errstr");
            return false;
        }
        // PT1C;
        stream_set_timeout($this->socket, 1, 0);

        // read the header
        $str = fgets($this->socket);
        if ($str == false) {
            // a problem.
            $this->log("Asterisk Manager header not received.");
            return false;
        }

        // login
        $res = $this->send_request('login', array('Username' => $username, 'Secret' => $secret, 'Events' => $events));
        if ($res['Response'] != 'Success') {
            $this->_logged_in = FALSE;
            $this->log("Failed to login.");
            $this->disconnect();
            return false;
        }
        $this->_logged_in = TRUE;
        return true;
    }

    public function logged_in(){
        return $this->_logged_in;
    }

    /**
     * Disconnect
     *
     * @example examples/sip_show_peer.php Get information about a sip peer
     */
    function disconnect(){
        if ($this->_logged_in == TRUE) $this->logoff();
        if(is_resource($this->socket)){
            fclose($this->socket);
        }
    }

    // *********************************************************************************************************
    // **                       COMMANDS                                                                      **
    // *********************************************************************************************************

    /**
     * Set Absolute Timeout
     *
     * Hangup a channel after a certain time.
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+AbsoluteTimeout
     * @param string  $channel Channel name to hangup
     * @param integer $timeout Maximum duration of the call (sec)
     * @return array
     */
    function AbsoluteTimeout($channel, $timeout){
        return $this->send_request('AbsoluteTimeout', array('Channel' => $channel, 'Timeout' => $timeout));
    }

    /**
     * Change monitoring filename of a channel
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+ChangeMonitor
     * @param string $channel the channel to record.
     * @param string $file the new name of the file created in the monitor spool directory.
     * @return array
     */
    function ChangeMonitor($channel, $file){
        return $this->send_request('ChangeMontior', array('Channel' => $channel, 'File' => $file));
    }

    /**
     * Execute Command
     *
     * @example examples/sip_show_peer.php Get information about a sip peer
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+Command
     * @link http://www.voip-info.org/wiki-Asterisk+CLI
     * @param string $command
     * @param string $actionid message matching variable
     * @return array
     */
    function Command($command, $actionid = NULL){
        $parameters = array('Command' => $command);
        if ($actionid) $parameters['ActionID'] = $actionid;
        return $this->send_request('Command', $parameters);
    }

    /**
     * Enable/Disable sending of events to this manager
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+Events
     * @param string $eventmask is either 'on', 'off', or 'system,call,log'
     * @return array
     */
    function Events($eventmask){
        return $this->send_request('Events', array('EventMask' => $eventmask));
    }

    /**
     * Check Extension Status
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+ExtensionState
     * @param string $exten Extension to check state on
     * @param string $context Context for extension
     * @param string $actionid message matching variable
     * @return array
     */
    function ExtensionState($exten, $context, $actionid = NULL){
        $parameters = array('Exten' => $exten, 'Context' => $context);
        if ($actionid) $parameters['ActionID'] = $actionid;
        return $this->send_request('ExtensionState', $parameters);
    }

    /**
     * Gets a Channel Variable
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+GetVar
     * @link http://www.voip-info.org/wiki-Asterisk+variables
     * @param string $channel Channel to read variable from
     * @param string $variable
     * @param string $actionid message matching variable
     * @param boolean $ret_array
     * @return string | array
     */
    function GetVar($channel, $variable, $actionid = NULL, $ret_array = true){
        $parameters = array('Channel' => $channel, 'Variable' => $variable);
        if ($actionid){
            $parameters['ActionID'] = $actionid;
        }

        $data = $this->send_request('GetVar', $parameters);
        if($ret_array != true){
            $data = (isset($data['Value']) && $data['Value'] )?$data['Value']:'';
        }
        return $data;
    }

    /**
     * Возвращает массив активных каналов.
     * @param boolean $group
     * @return array
     */
    public function GetChannels($group = true){
        $res 	  = $this->send_request_timeout('CoreShowChannels');
        $channels = null;
        if(isset($res['data']['CoreShowChannel'])){
            $channels = $res['data']['CoreShowChannel'];
        }
        $channels_id = array();
        if(null != $channels){
            foreach($channels as $chan){
                if($group == true){
                    $channels_id[$chan['Linkedid']][] = $chan['Channel'];
                }else{
                    $channels_id[] = $chan['Channel'];
                }            }
        }

        return $channels_id;
    }

    /**
     * Hangup Channel
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+Hangup
     * @param string $channel The channel name to be hungup
     * @return array
     */
    function Hangup($channel){
        return $this->send_request('Hangup', array('Channel' => $channel));
    }

    /**
     * List IAX Peers
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+IAXpeers
     * @return array
     */
    function IAXpeerlist(){
        $result = $this->send_request('IAXpeerlist');
        $data = (isset($result['data']) && is_array($result['data']))?$result['data']:[];
        $arr_peer = (isset($data['PeerEntry']) && is_array($data['PeerEntry']))?$data['PeerEntry']:[];
        return $arr_peer;
    }

    /**
     * Возвращает регистрации пиров.
     * @return array
     */
    function IAXregistry(){
        $result = $this->send_request('IAXregistry');
        $data = (isset($result['data']) && is_array($result['data']))?$result['data']:[];
        $arr_peer = (isset($data['RegistryEntry']) && is_array($data['RegistryEntry']))?$data['RegistryEntry']:[];
        return $arr_peer;
    }

    /**
     * List available manager commands
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+ListCommands
     * @param string $actionid message matching variable
     * @return array
     */
    function ListCommands($actionid = NULL){
        if ($actionid) return $this->send_request('ListCommands', array('ActionID' => $actionid)); else
            return $this->send_request('ListCommands');
    }

    /**
     * Отправка event в AMI.
     * @param  string $name
     * @param  array  $headers
     * @return array
     */
    function UserEvent($name, $headers){
        $headers['UserEvent'] = $name;
        return $this->send_request_timeout('UserEvent', $headers);
    }

    /**
     * Logoff Manager
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+Logoff
     */
    function Logoff(){
        return $this->send_request_timeout('Logoff');
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
     * @param string $mailbox Full mailbox ID <mailbox>@<vm-context>
     * @param string $actionid message matching variable
     * @return array
     */
    function MailboxCount($mailbox, $actionid = NULL){
        $parameters = array('Mailbox' => $mailbox);
        if ($actionid) $parameters['ActionID'] = $actionid;
        return $this->send_request('MailboxCount', $parameters);
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
     * @param string $mailbox Full mailbox ID <mailbox>@<vm-context>
     * @param string $actionid message matching variable
     * @return array
     */
    function MailboxStatus($mailbox, $actionid = NULL){
        $parameters = array('Mailbox' => $mailbox);
        if ($actionid) $parameters['ActionID'] = $actionid;
        return $this->send_request('MailboxStatus', $parameters);
    }

    /**
     * Monitor a channel
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+Monitor
     * @param string  $channel
     * @param string  $file
     * @param string  $format
     * @param boolean $mix
     * @return array
     */
    function Monitor($channel, $file = NULL, $format = NULL, $mix = NULL){
        $parameters = array('Channel' => $channel);
        if ($file) $parameters['File'] = $file;
        if ($format) $parameters['Format'] = $format;
        if (!is_null($file)) $parameters['Mix'] = ($mix) ? 'true' : 'false';
        return $this->send_request('Monitor', $parameters);
    }

    /**
     * MixMonitor a channel
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+Monitor
     * @param string $channel
     * @param string $file
     * @param string $options
     * @param string $command
     * @return array
     */
    function MixMonitor($channel, $file, $options, $command){
        $parameters = array('Channel' => $channel);
        $parameters['File'] = $file;
        $parameters['options'] = $options;
        $parameters['Command'] = $command;
        return $this->send_request_timeout('MixMonitor', $parameters);
    }

    /**
     * StopMixMonitor a channel
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+Monitor
     * @param string $channel
     * @return array
     */
    function StopMixMonitor($channel){
        $parameters = array('Channel' => $channel);
        return $this->send_request_timeout('StopMixMonitor', $parameters);
    }

    /**
     * DBGet a channel
     *
     * @param string $Family
     * @param string $Key
     * @param string $Val
     * @return array
     */
    function DBPut($Family, $Key, $Val = ''){
        $parameters = array('Family' => $Family, 'Key' => $Key, 'Val' => $Val);
        $res_data = $this->send_request_timeout('DBPut', $parameters);
        return $res_data;
    }

    /**
     * DBGet a channel
     *
     * @param string $Family
     * @param string $Key
     * @return array
     */
    function DBGet($Family, $Key){
        $parameters = array('Family' => $Family, 'Key' => $Key);
        return $this->send_request_timeout('DBGet', $parameters);
    }

    /**
     * Originate Call
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+Originate
     * @param string  $channel Channel name to call
     * @param string  $exten Extension to use (requires 'Context' and 'Priority')
     * @param string  $context Context to use (requires 'Exten' and 'Priority')
     * @param string  $priority Priority to use (requires 'Exten' and 'Context')
     * @param string  $application Application to use
     * @param string  $data Data to use (requires 'Application')
     * @param integer $timeout How long to wait for call to be answered (in ms)
     * @param string  $callerid Caller ID to be set on the outgoing channel
     * @param string  $variable Channel variable to set (VAR1=value1|VAR2=value2)
     * @param string  $account Account code
     * @param boolean $async true fast origination
     * @param string  $actionid message matching variable
     * @return array
     */
    function Originate($channel, $exten = NULL, $context = NULL, $priority = NULL, $application = NULL, $data = NULL, $timeout = NULL, $callerid = NULL, $variable = NULL, $account = NULL, $async = NULL, $actionid = NULL){
        $parameters = array('Channel' => $channel);

        if ($exten) $parameters['Exten'] = $exten;
        if ($context) $parameters['Context'] = $context;
        if ($priority) $parameters['Priority'] = $priority;

        if ($application) $parameters['Application'] = $application;
        if ($data) $parameters['Data'] = $data;

        if ($timeout) $parameters['Timeout'] = $timeout;
        if ($callerid) $parameters['CallerID'] = $callerid;
        if ($variable) $parameters['Variable'] = $variable;
        if ($account) $parameters['Account'] = $account;
        if (!is_null($async)) $parameters['Async'] = ($async) ? 'true' : 'false';
        if ($actionid) $parameters['ActionID'] = $actionid;

        return $this->send_request('Originate', $parameters);
    }

    /**
     * List parked calls
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+ParkedCalls
     * @param string $actionid message matching variable
     * @param string $parkinglot message matching variable
     * @return array
     */
    function ParkedCalls($parkinglot = NULL, $actionid = NULL){
        $parameters = [];
        if ($actionid){
            $parameters['ActionID'] = $actionid;
        }
        if ($parkinglot){
            $parameters['ParkingLot'] = $parkinglot;
        }
        $result = $this->send_request_timeout('ParkedCalls', $parameters);

        return $result;
    }

    /**
     * Ping
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+Ping
     */
    function Ping(){
        return $this->send_request_timeout('Ping');
    }

    /**
     * Queue Add
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+QueueAdd
     * @param string  $queue
     * @param string  $interface
     * @param integer $penalty
     * @return array
     */
    function QueueAdd($queue, $interface, $penalty = 0){
        $parameters = array('Queue' => $queue, 'Interface' => $interface);
        if ($penalty) $parameters['Penalty'] = $penalty;
        return $this->send_request('QueueAdd', $parameters);
    }

    /**
     * Queue Remove
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+QueueRemove
     * @param string $queue
     * @param string $interface
     * @return array
     */
    function QueueRemove($queue, $interface){
        return $this->send_request('QueueRemove', array('Queue' => $queue, 'Interface' => $interface));
    }

    /**
     * Queues
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+Queues
     */
    function Queues(){
        return $this->send_request('Queues');
    }

    /**
     * Queue Status
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+QueueStatus
     * @param string $actionid message matching variable
     * @return array
     */
    function QueueStatus($actionid = NULL){
        if ($actionid) return $this->send_request('QueueStatus', array('ActionID' => $actionid)); else
            return $this->send_request('QueueStatus');
    }

    /**
     * Redirect
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+Redirect
     * @param string $channel
     * @param string $extrachannel
     * @param string $exten
     * @param string $context
     * @param string $priority
     * @return array
     */
    function Redirect($channel, $extrachannel, $exten, $context, $priority){
        return $this->send_request('Redirect', array('Channel' => $channel, 'ExtraChannel' => $extrachannel, 'Exten' => $exten, 'Context' => $context, 'Priority' => $priority));
    }

    /**
     * Set the CDR UserField
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+SetCDRUserField
     * @param string $userfield
     * @param string $channel
     * @param string $append
     * @return array
     */
    function SetCDRUserField($userfield, $channel, $append = NULL){
        $parameters = array('UserField' => $userfield, 'Channel' => $channel);
        if ($append) $parameters['Append'] = $append;
        return $this->send_request('SetCDRUserField', $parameters);
    }

    /**
     * Set Channel Variable
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+SetVar
     * @param string $channel Channel to set variable for
     * @param string $variable name
     * @param string $value
     * @return array
     */
    function SetVar($channel, $variable, $value){
        return $this->send_request('SetVar', array('Channel' => $channel, 'Variable' => $variable, 'Value' => $value));
    }

    /**
     * Channel Status
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+Status
     * @param string $channel
     * @param string $actionid message matching variable
     * @return array
     */
    function Status($channel, $actionid = NULL){
        $parameters = array('Channel' => $channel);
        if ($actionid) $parameters['ActionID'] = $actionid;
        return $this->send_request('Status', $parameters);
    }

    /**
     * Stop monitoring a channel
     *
     * @link http://www.voip-info.org/wiki-Asterisk+Manager+API+Action+StopMonitor
     * @param string $channel
     * @return array
     */
    function StopMonitor($channel){
        return $this->send_request('StopMonitor', array('Channel' => $channel));
    }

    /*
    * MIKO Start.
    */

    /**
     * Полученире текущих регистраций.
     * @return array
     */
    public function get_sip_registry(){
        $peers = array();
        $result = $this->send_request_timeout('SIPshowregistry');
        if ($result['data'] != null && $result['data']['RegistryEntry'] != null) {
            foreach ($result['data']['RegistryEntry'] as $peer) {
                $peers[] = array(
                    'id'        => $peer['Username'],
                    'state'     => strtoupper($peer['State']),
                    'host'      => $peer['Host'],
                    'username'  => $peer['Username'],
                    );
            }
        }
        return $peers;
    }

    /**
     * Получение статусов пиров.
     * @return array
     */
    function get_sip_peers(){
        $peers = array();
        $res = $this->send_request_timeout('SIPpeers');
        if (isset($res['data']) && $res['data'] != null && $res['data']['PeerEntry'] != null) {
            foreach ($res['data']['PeerEntry'] as $peer) {
                if (!is_numeric($peer['ObjectName'])) continue;
                // if ('Unmonitored' == $peer['Status']) continue;
                $arr_status = explode(' ', $peer['Status']);
                $peers[] = array('id' => $peer['ObjectName'], 'state' => strtoupper($arr_status[0]),);
            }
        }
        return $peers;
    }

    /**
     * Получение статуса конкретного пира.
     * @param $peer
     * @return array
     */
    function get_sip_peer($peer){
        $parameters = ['Peer' => trim($peer)];
        $res = $this->send_request_timeout('SIPshowpeer', $parameters);
        $arr_status          = explode(' ', $res['Status']);
        $res['state']        = strtoupper($arr_status[0]);
        $res['time-response']= strtoupper(str_replace(['(', ')'],'',$arr_status[1]));
        return $res;
    }

    /*
    * MIKO End.
    */

    // *********************************************************************************************************
    // **                       MISC                                                                          **
    // *********************************************************************************************************

    /**
     * Log a message
     *
     * @param string $message
     * @param integer $level from 1 to 4
     */
    function log($message, $level = 1){
        if ($this->pagi != false) $this->pagi->conlog($message, $level);

    }

    function microtime_float(){
        list($usec, $sec) = explode(" ", microtime());
        return ((float)$usec + (float)$sec);
    }

    /**
     * Add event handler
     *
     * Known Events include ( http://www.voip-info.org/wiki-asterisk+manager+events )
     *   Link - Fired when two voice channels are linked together and voice data exchange commences.
     *   Unlink - Fired when a link between two voice channels is discontinued, for example, just before call completion.
     *   Newexten -
     *   Hangup -
     *   Newchannel -
     *   Newstate -
     *   Reload - Fired when the "RELOAD" console command is executed.
     *   Shutdown -
     *   ExtensionStatus -
     *   Rename -
     *   Newcallerid -
     *   Alarm -
     *   AlarmClear -
     *   Agentcallbacklogoff -
     *   Agentcallbacklogin -
     *   Agentlogoff -
     *   MeetmeJoin -
     *   MessageWaiting -
     *   join -
     *   leave -
     *   AgentCalled -
     *   ParkedCall - Fired after ParkedCalls
     *   Cdr -
     *   ParkedCallsComplete -
     *   QueueParams -
     *   QueueMember -
     *   QueueStatusEnd -
     *   Status -
     *   StatusComplete -
     *   ZapShowChannels - Fired after ZapShowChannels
     *   ZapShowChannelsComplete -
     *
     * @param string $event type or * for default handler
     * @param string | array $callback function
     * @return boolean sucess
     */
    function add_event_handler($event, $callback){
        $event = strtolower($event);
        if (isset($this->event_handlers[$event])) {
            $this->log("$event handler is already defined, not over-writing.");
            return false;
        }
        $this->event_handlers[$event] = $callback;
        return true;
    }

    /**
     * Process event
     *
     * @access private
     * @param array $parameters
     * @return mixed result of event handler or false if no handler was found
     */
    function process_event($parameters){
        $ret = false;
        $e = strtolower($parameters['Event']);
        $this->log("Got event.. $e");

        $handler = '';
        if (isset($this->event_handlers[$e])){
            $handler = $this->event_handlers[$e];
        }
        elseif (isset($this->event_handlers['*'])){
            $handler = $this->event_handlers['*'];
        }
        if(is_array($handler)){
            call_user_func($handler, $parameters);
        }else if (function_exists($handler)) {
            $this->log("Execute handler $handler");
            $ret = $handler($e, $parameters, $this->server, $this->port);
        } else
            $this->log("No event handler for event '$e'");
        return $ret;
    }
}
