<?php


namespace MikoPBX\Core\Asterisk;

class AGIBase {
    /**
     * Request variables read in on initialization.
     *
     * Often contains any/all of the following:
     *   agi_request - name of agi script
     *   agi_channel - current channel
     *   agi_language - current language
     *   agi_type - channel type (SIP, ZAP, IAX, ...)
     *   agi_uniqueid - unique id based on unix time
     *   agi_callerid - callerID string
     *   agi_dnid - dialed number id
     *   agi_rdnis - referring DNIS number
     *   agi_context - current context
     *   agi_extension - extension dialed
     *   agi_priority - current priority
     *   agi_enhanced - value is 1.0 if started as an EAGI script
     *   agi_accountcode - set by SetAccount in the dialplan
     *   agi_network - value is yes if this is a fastagi
     *   agi_network_script - name of the script to execute
     *
     * NOTE: program arguments are still in $_SERVER['argv'].
     *
     * @var array
     * @access public
     */
    public array $request;

    /**
     * Input Stream
     *
     * @access private
     */
    public $in;

    /**
     * Output Stream
     *
     * @access private
     */
    public $out;

    /**
     * Application option delimiter
     *
     * @access public
     */
    public string  $option_delim = ",";

    /**
     * Constructor
     */
    public function __construct()
    {
        ob_implicit_flush(1);
        // Open stdin & stdout.
        $this->in  = defined('STDIN') ? STDIN  : fopen('php://stdin',  'rb');
        $this->out = defined('STDOUT')? STDOUT : fopen('php://stdout', 'wb');
        $this->request = [];

        $this->readRequestData();
    }

    /**
     * Read the request data from the input stream.
     *
     * @return void
     */
    protected function readRequestData():void{
        if($this->in !== false){
            $str = PHP_EOL;
            // read the request
            $resIn = fgets($this->in);
            if($resIn !== false){
                $str = $resIn;
            }
            while ($str !== PHP_EOL) {
                $this->request[substr($str, 0, strpos($str, ':'))] = trim(substr($str, strpos($str, ':') + 1));
                $resIn = fgets($this->in);
                if($resIn === false){
                    break;
                }
                $str = $resIn;
            }
        }
    }

    /**
     * Evaluate and parse the response string.
     *
     * @param string $str The response string to parse.
     * @param array $ret The parsed response array.
     * @return void
     */
    protected function evaluateParseResponse($str, &$ret):void{
        $ret['result'] = null;
        $ret['data']   = '';
        if ( (int)$ret['code'] !== 200){
            // some sort of error
            $ret['data'] = $str;
        }else{
            // Normal AGI RES OK response
            $parse    = explode(' ', trim($str));
            $in_token = false;
            foreach ($parse as $token) {
                if ($in_token){
                    // we previously hit a token starting with ')' but not ending in ')'
                    $ret['data'] .= ' ' . trim($token, '() ');
                    if ($token[strlen($token) - 1] === ')') {
                        $in_token = false;
                    }
                }elseif ($token[0] === '('){
                    if ($token[strlen($token) - 1] !== ')') {
                        $in_token = true;
                    }
                    $ret['data'] .= ' ' . trim($token, '() ');
                }elseif (strpos($token, '=')){
                    $token          = explode('=', $token);
                    $ret[$token[0]] = $token[1];
                }elseif ($token !== ''){
                    $ret['data'] .= ' ' . $token;
                }
            }
            $ret['data'] = trim($ret['data']);
        }
    }

    /**
     * Evaluate and read the response from the AGI server.
     *
     * @param string $str The response string read from the AGI server.
     * @param array $ret The parsed response array.
     * @return bool Whether the evaluation and reading of the response was successful.
     */
    protected function evaluateReadResponse(string & $str, array & $ret): bool{
        $result = true;
        if(!is_resource($this->in)){
            return $result;
        }

        $count = 0;
        do {
            $str = trim(fgets($this->in, 4096));
        } while ($str === '' && $count++ < 5);

        if ($count >= 5) {
            return false;
        }

        $ret['code'] = substr($str, 0, 3);
        $str         = trim(substr($str, 3));

        if ($str[0] === '-') // We have a multiline response!
        {
            $count = 0;
            $str   = substr($str, 1) . "\n";
            $line  = fgets($this->in, 4096);
            while (strpos($line, $ret['code']) !== 0 && $count < 5) {
                $str   .= $line;
                $line  = fgets($this->in, 4096);
                $count = (trim($line) === '') ? $count + 1 : 0;
            }
            if ($count >= 5) {
                $result = false;
            }
        }

        return $result;
    }

    /**
     * Evaluate an AGI command.
     *
     * @access private
     *
     * @param string $command
     *
     * @return array ('code'=>$code, 'result'=>$result, 'data'=>$data)
     */
    public function evaluate($command)
    {
        $broken = ['code' => 500, 'result' => -1, 'data' => ''];

        if( !is_resource($this->out) ){
            return $broken;
        }

        if ( !fwrite($this->out, trim($command) . "\n")) {
            return $broken;
        }
        fflush($this->out);
        // parse result
        $str = '';
        $ret = [];
        if(!$this->evaluateReadResponse($str, $ret)){
            return $broken;
        }
        $this->evaluateParseResponse($str, $ret);
        return $ret;
    }
}