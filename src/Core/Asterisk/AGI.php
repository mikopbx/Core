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

namespace MikoPBX\Core\Asterisk;

/**
 * AGI class
 *
 * @package phpAGI
 * @link    http://www.voip-info.org/wiki-Asterisk+agi
 * @example examples/dtmf.php Get DTMF tones from the user and say the digits
 * @example examples/input.php Get text input from the user and say it back
 * @example examples/ping.php Ping an IP address
 */
class AGI extends AGIBase
{
    /**
     * Sends $message to the Asterisk console via the 'verbose' message system.
     *
     * If the Asterisk verbosity level is $level or greater, send $message to the console.
     *
     * The Asterisk verbosity system works as follows. The Asterisk user gets to set the desired verbosity at startup
     * time or later using the console 'set verbose' command. Messages are displayed on the console if their verbose
     * level is less than or equal to desired verbosity set by the user. More important messages should have a low
     * verbose level; less important messages should have a high verbose level.
     *
     * @link http://www.voip-info.org/wiki-verbose
     *
     * @param string $message
     * @param int    $level from 1 to 4
     *
     * @return array, see evaluate for return information.
     */
    public function verbose($message, $level = 1)
    {
        $ret = ['code' => 500, 'result' => -1, 'data' => ''];
        foreach (explode("\n", str_replace("\r\n", "\n", print_r($message, true))) as $msg) {
            $ret = $this->evaluate("VERBOSE \"$msg\" $level");
        }

        return $ret;
    }


    /**
     * Answer channel if not already in answer state.
     *
     * @link    http://www.voip-info.org/wiki-answer
     * @example examples/dtmf.php Get DTMF tones from the user and say the digits
     * @example examples/input.php Get text input from the user and say it back
     * @example examples/ping.php Ping an IP address
     *
     * @return array, see evaluate for return information.  ['result'] is 0 on success, -1 on failure.
     */
    public function answer()
    {
        return $this->evaluate('ANSWER');
    }

    /**
     * Deletes an entry in the Asterisk database for a given family and key.
     *
     * @link http://www.voip-info.org/wiki-database+del
     *
     * @param string $family
     * @param string $key
     *
     * @return array, see evaluate for return information. ['result'] is 1 on sucess, 0 otherwise.
     */
    public function database_del($family, $key)
    {
        return $this->evaluate("DATABASE DEL \"$family\" \"$key\"");
    }

    /**
     * Deletes a family or specific keytree within a family in the Asterisk database.
     *
     * @link http://www.voip-info.org/wiki-database+deltree
     *
     * @param string $family
     * @param string $keytree
     *
     * @return array, see evaluate for return information. ['result'] is 1 on sucess, 0 otherwise.
     */
    public function database_deltree(string $family, string $keytree = '')
    {
        $cmd = "DATABASE DELTREE \"$family\"";
        if (!empty($keytree)) {
            $cmd .= " \"$keytree\"";
        }

        return $this->evaluate($cmd);
    }

    /**
     * Retrieves an entry in the Asterisk database for a given family and key.
     *
     * @link http://www.voip-info.org/wiki-database+get
     *
     * @param string $family
     * @param string $key
     *
     * @return array, see evaluate for return information. ['result'] is 1 on sucess, 0 failure. ['data'] holds the
     *                value
     */
    public function database_get($family, $key)
    {
        return $this->evaluate("DATABASE GET \"$family\" \"$key\"");
    }

    /**
     * Adds or updates an entry in the Asterisk database for a given family, key, and value.
     *
     * @param string $family
     * @param string $key
     * @param string $value
     *
     * @return array, see evaluate for return information. ['result'] is 1 on sucess, 0 otherwise
     */
    public function databasePut($family, $key, $value)
    {
        $value = str_replace("\n", '\n', addslashes($value));

        return $this->evaluate("DATABASE PUT \"$family\" \"$key\" \"$value\"");
    }

    /**
     * Sets a variable, using Asterisk 1.6 syntax.
     *
     * @link http://www.voip-info.org/wiki/view/Asterisk+cmd+Set
     *
     * @param string           $pVariable
     * @param string|int|float $pValue
     *
     * @return array, see evaluate for return information. ['result'] is 1 on sucess, 0 otherwise
     */
    public function set_var($pVariable, $pValue)
    {
        if (is_numeric($pValue)) {
            return $this->evaluate("Set({$pVariable}={$pValue});");
        } else {
            return $this->evaluate("Set({$pVariable}=\"{$pValue}\");");
        }
    }

    /**
     * Fetch the value of a variable.
     *
     * Does not work with global variables. Does not work with some variables that are generated by modules.
     *
     * @link http://www.voip-info.org/wiki-get+variable
     * @link http://www.voip-info.org/wiki-Asterisk+variables
     *
     * @param string $variable name
     * @param bool   $getvalue return the value only
     *
     * @return array | string, see evaluate for return information. ['result'] is 0 if variable hasn't been set, 1 if
     *               it has. ['data'] holds the value. returns value if $getvalue is TRUE
     */
    public function get_variable($variable, $getvalue = false)
    {
        $res = $this->evaluate("GET VARIABLE $variable");
        if ($getvalue === false) {
            return ($res);
        }

        return trim($res['data']);
    }

    /**
     * Hangup the specified channel. If no channel name is given, hang up the current channel.
     *
     * With power comes responsibility. Hanging up channels other than your own isn't something
     * that is done routinely. If you are not sure why you are doing so, then don't.
     *
     * @link    http://www.voip-info.org/wiki-hangup
     * @example examples/dtmf.php Get DTMF tones from the user and say the digits
     * @example examples/input.php Get text input from the user and say it back
     * @example examples/ping.php Ping an IP address
     *
     * @param string $channel
     *
     * @return array, see evaluate for return information. ['result'] is 1 on success, -1 on failure.
     */
    public function hangup($channel = '')
    {
        return $this->evaluate("HANGUP $channel");
    }

    /**
     * Does nothing.
     *
     * @link http://www.voip-info.org/wiki-noop
     *
     * @param string $string
     *
     * @return array, see evaluate for return information.
     */
    public function noop($string = "")
    {
        return $this->evaluate("NOOP \"$string\"");
    }

    /**
     * Send the specified image on a channel.
     *
     * Most channels do not support the transmission of images.
     *
     * @link http://www.voip-info.org/wiki-send+image
     *
     * @param string $image without extension, often in /var/lib/asterisk/images
     *
     * @return array, see evaluate for return information. ['result'] is -1 on hangup or error, 0 if the image is sent
     *                or channel does not support image transmission.
     */
    public function send_image($image)
    {
        return $this->evaluate("SEND IMAGE $image");
    }

    /**
     * Send the given text to the connected channel.
     *
     * Most channels do not support transmission of text.
     *
     * @link http://www.voip-info.org/wiki-send+text
     *
     * @param $text
     *
     * @return array, see evaluate for return information. ['result'] is -1 on hangup or error, 0 if the text is sent or
     * channel does not support text transmission.
     */
    public function send_text($text)
    {
        return $this->evaluate("SEND TEXT \"$text\"");
    }

    /**
     * Cause the channel to automatically hangup at $time seconds in the future.
     * If $time is 0 then the autohangup feature is disabled on this channel.
     *
     * If the channel is hungup prior to $time seconds, this setting has no effect.
     *
     * @link http://www.voip-info.org/wiki-set+autohangup
     *
     * @param int $time until automatic hangup
     *
     * @return array, see evaluate for return information.
     */
    public function set_autohangup($time = 0)
    {
        return $this->evaluate("SET AUTOHANGUP $time");
    }

    /**
     * Changes the caller ID of the current channel.
     *
     * @link http://www.voip-info.org/wiki-set+callerid
     *
     * @param string $cid example: "John Smith"<1234567>
     *                    This command will let you take liberties with the <caller ID specification> but the format
     *                    shown in the example above works well: the name enclosed in double quotes followed
     *                    immediately by the number inside angle brackets. If there is no name then you can omit it. If
     *                    the name contains no spaces you can omit the double quotes around it. The number must follow
     *                    the name immediately; don't put a space between them. The angle brackets around the number
     *                    are necessary; if you omit them the number will be considered to be part of the name.
     *
     * @return array, see evaluate for return information.
     */
    public function set_callerid($cid)
    {
        return $this->evaluate("SET CALLERID $cid");
    }

    /**
     * Enable/Disable Music on hold generator.
     *
     * @link http://www.voip-info.org/wiki-set+music
     *
     * @param bool   $enabled
     * @param string $class
     *
     * @return array, see evaluate for return information.
     */
    public function set_music($enabled = true, $class = '')
    {
        $enabled = ($enabled) ? 'ON' : 'OFF';

        return $this->evaluate("SET MUSIC $enabled $class");
    }

    /**
     * Sets a variable to the specified value. The variables so created can later be used by later using
     * ${<variablename>} in the dialplan.
     *
     * These variables live in the channel Asterisk creates when you pickup a phone and as such they are both local and
     * temporary. Variables created in one channel can not be accessed by another channel. When you hang up the phone,
     * the channel is deleted and any variables in that channel are deleted as well.
     *
     * @link http://www.voip-info.org/wiki-set+variable
     *
     * @param string $variable is case sensitive
     * @param string $value
     *
     * @return array, see evaluate for return information.
     */
    public function set_variable($variable, $value)
    {
        $value = str_replace("\n", '\n', addslashes($value));

        return $this->evaluate("SET VARIABLE $variable \"$value\"");
    }

    /**
     * Set absolute maximum time of call.
     *
     * Note that the timeout is set from the current time forward, not counting the number of seconds the call has
     * already been up. Each time you call AbsoluteTimeout(), all previous absolute timeouts are cancelled. Will return
     * the call to the T extension so that you can playback an explanatory note to the calling party (the called party
     * will not hear that)
     *
     * @link http://www.voip-info.org/wiki-Asterisk+-+documentation+of+application+commands
     * @link http://www.dynx.net/ASTERISK/AGI/ccard/agi-ccard.agi
     *
     * @param $seconds
     * allowed, 0 disables timeout
     *
     * @return array, see evaluate for return information.
     */
    public function exec_absolutetimeout($seconds = 0)
    {
        return $this->exec('AbsoluteTimeout', $seconds);
    }

    /**
     * Executes the specified Asterisk application with given options.
     *
     * @link http://www.voip-info.org/wiki-exec
     * @link http://www.voip-info.org/wiki-Asterisk+-+documentation+of+application+commands
     *
     * @param string $application
     * @param mixed  $options
     *
     * @return array, see evaluate for return information. ['result'] is whatever the application returns, or -2 on
     *                failure to find application
     */
    public function exec($application, $options)
    {
        if (is_array($options)) {
            $options = join(',', $options);
        }

        return $this->evaluate("EXEC $application $options");
    }

    /**
     * Dial.
     *
     * Dial takes input from ${VXML_URL} to send XML Url to Cisco 7960
     * Dial takes input from ${ALERT_INFO} to set ring cadence for Cisco phones
     * Dial returns ${CAUSECODE}: If the dial failed, this is the errormessage.
     * Dial returns ${DIALSTATUS}: Text code returning status of last dial attempt.
     *
     * @link http://www.voip-info.org/wiki-Asterisk+cmd+Dial
     *
     * @param string $type
     * @param string $identifier
     * @param int    $timeout
     * @param string $options
     * @param string $url
     *
     * @return array, see evaluate for return information.
     */
    public function exec_dial($type, $identifier, $timeout = null, $options = null, $url = null)
    {
        return $this->exec(
            'Dial',
            trim(
                "$type/$identifier" . $this->option_delim . $timeout . $this->option_delim . $options . $this->option_delim . $url,
                $this->option_delim
            )
        );
    }

    /**
     * Goto.
     *
     * This function takes three arguments: context,extension, and priority, but the leading arguments
     * are optional, not the trailing arguments.  Thuse goto($z) sets the priority to $z.
     *
     * @param string $a
     * @param string $b ;
     * @param string $c ;
     *
     * @return array, see evaluate for return information.
     */
    public function exec_goto($a, $b = null, $c = null)
    {
        return $this->exec('Goto', trim($a . $this->option_delim . $b . $this->option_delim . $c, $this->option_delim));
    }


    // *********************************************************************************************************
    // **                             APPLICATIONS                                                                                        **
    // *********************************************************************************************************

    /**
     * Play the given audio file, allowing playback to be interrupted by a DTMF digit. This command is similar to the
     * GET DATA command but this command returns after the first DTMF digit has been pressed while GET DATA can
     * accumulated any number of digits before returning.
     *
     * @param string $filename without extension, often in /var/lib/asterisk/sounds
     * @param string $escape_digits
     * @param int    $offset
     *
     * @return array, see evaluate for return information. ['result'] is -1 on hangup or error, 0 if playback completes
     *                with no digit received, otherwise a decimal value of the DTMF tone.  Use chr() to convert to
     *                ASCII.
     * @example examples/ping.php Ping an IP address
     *
     * @link    http://www.voip-info.org/wiki-stream+file
     */
    public function stream_file($filename, $escape_digits = '', $offset = 0)
    {
        return $this->evaluate("STREAM FILE $filename \"$escape_digits\" $offset");
    }

    // *********************************************************************************************************
    // **                             DERIVED                                                                                             **
    // *********************************************************************************************************

    /**
     * Plays the given file and receives DTMF data.
     *
     * This is similar to STREAM FILE, but this command can accept and return many DTMF digits,
     * while STREAM FILE returns immediately after the first DTMF digit is detected.
     *
     * Asterisk looks for the file to play in /var/lib/asterisk/sounds by default.
     *
     * If the user doesn't press any keys when the message plays, there is $timeout milliseconds
     * of silence then the command ends.
     *
     * The user has the opportunity to press a key at any time during the message or the
     * post-message silence. If the user presses a key while the message is playing, the
     * message stops playing. When the first key is pressed a timer starts counting for
     * $timeout milliseconds. Every time the user presses another key the timer is restarted.
     * The command ends when the counter goes to zero or the maximum number of digits is entered,
     * whichever happens first.
     *
     * If you don't specify a time out then a default timeout of 2000 is used following a pressed
     * digit. If no digits are pressed then 6 seconds of silence follow the message.
     *
     * If you don't specify $max_digits then the user can enter as many digits as they want.
     *
     * Pressing the # key has the same effect as the timer running out: the command ends and
     * any previously keyed digits are returned. A side effect of this is that there is no
     * way to read a # key using this command.
     *
     * @param string $filename file to play. Do not include file extension.
     * @param ?int    $timeout  milliseconds
     * @param ?int    $max_digits
     *
     * @return array, see evaluate for return information. ['result'] holds the digits and ['data'] holds the timeout
     *                if present.
     *
     * This differs from other commands with return DTMF as numbers representing ASCII characters.
     * @example examples/ping.php Ping an IP address
     *
     * @link    http://www.voip-info.org/wiki-get+data
     */
    public function getData($filename, $timeout = null, $max_digits = null)
    {
        return $this->evaluate(rtrim("GET DATA $filename $timeout $max_digits"));
    }

    /**
     * Waits up to $timeout milliseconds for channel to receive a DTMF digit.
     *
     * @link http://www.voip-info.org/wiki-wait+for+digit
     *
     * @param int $timeout in millisecons. Use -1 for the timeout value if you want the call to wait indefinitely.
     *
     * @return array, see evaluate for return information. ['result'] is 0 if wait completes with no
     * digit received, otherwise a decimal value of the DTMF tone.  Use chr() to convert to ASCII.
     */
    public function wait_for_digit($timeout = -1)
    {
        return $this->evaluate("WAIT FOR DIGIT $timeout");
    }
}
