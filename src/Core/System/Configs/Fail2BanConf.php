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

namespace MikoPBX\Core\System\Configs;

use MikoPBX\Common\Models\Fail2BanRules;
use MikoPBX\Common\Models\NetworkFilters;
use MikoPBX\Common\Models\PbxSettings;
use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\System\Verify;
use MikoPBX\Modules\Config\SystemConfigInterface;
use Phalcon\Di;
use Phalcon\Di\Injectable;
use Phalcon\Text;
use SQLite3;

/**
 * Class Fail2BanConf
 *
 * Represents the Fail2Ban configuration.
 *
 * @package MikoPBX\Core\System\Configs
 */
class Fail2BanConf extends Injectable
{
    private const FILTER_PATH     = '/etc/fail2ban/filter.d';
    private const ACTION_PATH     = '/etc/fail2ban/action.d';
    private const JAILS_DIR       = '/etc/fail2ban/jail.d';
    private const PID_FILE        = '/var/run/fail2ban/fail2ban.pid';
    public const FAIL2BAN_DB_PATH = '/var/lib/fail2ban/fail2ban.sqlite3';

    public bool $fail2ban_enable;
    private array $allPbxSettings;

    /**
     * Fail2Ban constructor.
     */
    public function __construct()
    {
        $this->allPbxSettings  = PbxSettings::getAllPbxSettings();
        $fail2ban_enable       = $this->allPbxSettings[PbxSettingsConstants::PBX_FAIL2BAN_ENABLED];
        $this->fail2ban_enable = ($fail2ban_enable === '1');
    }

    /**
     * Check fail2ban service and restart it died
     */
    public static function checkFail2ban(): void
    {
        $fail2ban = new self();
        if ($fail2ban->fail2ban_enable
            && ! $fail2ban->fail2banIsRunning()) {
            $fail2ban->fail2banStart();
        }
    }

    /**
     * Check fail2ban service status
     *
     * @return bool
     */
    private function fail2banIsRunning(): bool
    {
        $fail2banPath = Util::which('fail2ban-client');
        $res_ping     = Processes::mwExec("$fail2banPath ping");
        $res_stat     = Processes::mwExec("$fail2banPath status");

        $result = false;
        if ($res_ping === 0 && $res_stat === 0) {
            $result = true;
        }

        return $result;
    }

    /**
     * Start fail2ban service
     */
    public function fail2banStart(): void
    {
        if (Util::isSystemctl()) {
            $systemctlPath = Util::which('systemctl');
            Processes::mwExec("$systemctlPath restart fail2ban");
            return;
        }
        // T2SDE or Docker
        Processes::killByName('fail2ban-server');
        $fail2banPath = Util::which('fail2ban-client');
        $cmd_start    = "$fail2banPath -x start";
        $command      = "($cmd_start;) > /dev/null 2>&1 &";
        Processes::mwExec($command);
    }

    /**
     * Applies iptables settings and restart firewall
     */
    public static function reloadFail2ban(): void
    {
        $fail2banPath = Util::which('fail2ban-client');
        if(file_exists(self::PID_FILE)){
            $pid = file_get_contents(self::PID_FILE);
        }else{
            $pid = Processes::getPidOfProcess('fail2ban-server');
        }
        $fail2ban = new self();
        if($fail2ban->fail2ban_enable && !empty($pid)){
            $fail2ban->generateConf();
            $fail2ban->generateModulesFilters();
            $fail2ban->generateModulesJailsLocal();
            // Reload the configuration without restarting Fail2Ban.
            Processes::mwExecBg("$fail2banPath reload");
        }
    }

    /**
     * Generating the fail2ban.conf config
     * @return void
     */
    private function generateConf():void
    {
        $log_dir = Directories::getDir(Directories::CORE_LOGS_DIR) . '/fail2ban';
        $lofFileName = "$log_dir/fail2ban.log";
        Util::mwMkdir($log_dir);
        $conf = '['.'Definition'.']'.PHP_EOL.
                'allowipv6 = auto'.PHP_EOL.
                'loglevel = INFO'.PHP_EOL.
                "logtarget = $lofFileName".PHP_EOL.
                'syslogsocket = auto'.PHP_EOL.
                'socket = /var/run/fail2ban/fail2ban.sock'.PHP_EOL.
                'pidfile = /var/run/fail2ban/fail2ban.pid'.PHP_EOL.
                'dbfile = /var/lib/fail2ban/fail2ban.sqlite3'.PHP_EOL.
                'dbpurgeage = 1d'.PHP_EOL;
        Util::fileWriteContent('/etc/fail2ban/fail2ban.conf', $conf);
        if(!file_exists($lofFileName)){
            file_put_contents($lofFileName, '');
        }
    }

    /**
     * Rotates the fail2ban log files.
     */
    public static function logRotate(): void
    {
        $di           = Di::getDefault();
        $fail2banPath = Util::which('fail2ban-client');

        if ($di === null) {
            return;
        }
        $max_size    = 10;
        $log_dir     = Directories::getDir(Directories::CORE_LOGS_DIR) . '/fail2ban/';
        $text_config = $log_dir."fail2ban.log {
    nocreate
    nocopytruncate
    delaycompress
    nomissingok
    start 0
    rotate 9
    size {$max_size}M
    missingok
    noolddir
    postrotate
        $fail2banPath set logtarget {$log_dir}fail2ban.log > /dev/null 2> /dev/null
    endscript
    create 640 www www 
}";
        $varEtcDir  = $di->getShared('config')->path('core.varEtcDir');
        $path_conf   = $varEtcDir . '/fail2ban_logrotate.conf';
        file_put_contents($path_conf, $text_config);
        $mb10 = $max_size * 1024 * 1024;

        $options = '';
        if (Util::mFileSize("{$log_dir}fail2ban.log") > $mb10) {
            $options = '-f';
        }
        $logrotatePath = Util::which('logrotate');
        Processes::mwExecBg("$logrotatePath $options '$path_conf' > /dev/null 2> /dev/null");
    }


    /**
     * Checks whether BANS table exists in DB or not
     *
     * @param SQLite3 $db
     *
     * @return bool
     */
    public function tableBanExists(SQLite3 $db): bool
    {
        $q_check      = 'SELECT name FROM sqlite_master WHERE type = "table" AND name="bans"';
        $result_check = $db->query($q_check);

        return (false !== $result_check && $result_check->fetchArray(SQLITE3_ASSOC) !== false);
    }

    /**
     * Shutdown fail2ban service
     */
    public function fail2banStop(): void
    {
        if (Util::isSystemctl()) {
            $systemctlPath = Util::which('systemctl');
            Processes::mwExec("$systemctlPath stop fail2ban");
        } else {
            $fail2banPath = Util::which('fail2ban-client');
            Processes::mwExec("$fail2banPath -x stop");
        }
    }

    /**
     * Creates the necessary directories and files for Fail2Ban.
     *
     * @return string Returns the path to the Fail2Ban database file.
     */
    public function fail2banMakeDirs(): string
    {
        $res_file = self::FAIL2BAN_DB_PATH;
        $filename = basename($res_file);

        $old_dir_db = '/cf/fail2ban';
        $dir_db     = $this->di->getShared('config')->path('core.fail2banDbDir');
        if (empty($dir_db)) {
            $dir_db = '/var/spool/fail2ban';
        }
        Util::mwMkdir($dir_db);

        // Create working directories.
        $db_bd_dir = dirname($res_file);
        Util::mwMkdir($db_bd_dir);

        $create_link = false;

        // Symbolic link to the database.
        if (file_exists($res_file)){
            if (filetype($res_file) !== 'link') {
                unlink($res_file);
                $create_link = true;
            } elseif (readlink($res_file) === "$old_dir_db/$filename") {
                unlink($res_file);
                $create_link = true;
                if (file_exists("$old_dir_db/$filename")) {
                    // Move the file to the new location.
                    $mvPath = Util::which('mv');
                    Processes::mwExec("$mvPath '$old_dir_db/$filename' '$dir_db/$filename'");
                }
            }
        }else{
            $sqlite3Path = Util::which('sqlite3');
            Processes::mwExec("$sqlite3Path $dir_db/$filename 'vacuum'");
            $create_link = true;
        }

        if ($create_link === true) {
            Util::createUpdateSymlink("$dir_db/$filename", $res_file);
        }

        return $res_file;
    }

    /**
     * Writes the Fail2Ban configuration to the jail.local file.
     */
    public function writeConfig(): void
    {
        // Initialize properties
        $this->generateConf();
        [$max_retry, $find_time, $ban_time, $user_whitelist] = $this->initProperty();
        $this->generateActions();
        $this->generateJails();

        // Define ports for different services
        $httpPorts = [
            $this->allPbxSettings[PbxSettingsConstants::WEB_PORT],
            $this->allPbxSettings[PbxSettingsConstants::WEB_HTTPS_PORT]
        ];
        $sshPort = [
            $this->allPbxSettings[PbxSettingsConstants::SSH_PORT],
        ];
        $asteriskPorts = [
            $this->allPbxSettings[PbxSettingsConstants::SIP_PORT],
            $this->allPbxSettings[PbxSettingsConstants::TLS_PORT],
            $this->allPbxSettings[PbxSettingsConstants::IAX_PORT],
            $this->allPbxSettings[PbxSettingsConstants::RTP_PORT_FROM].':'.$this->allPbxSettings[PbxSettingsConstants::RTP_PORT_TO],
            $this->allPbxSettings[PbxSettingsConstants::AJAM_PORT_TLS]
        ];
        $asteriskAMI = [
            $this->allPbxSettings[PbxSettingsConstants::AMI_PORT],
            $this->allPbxSettings[PbxSettingsConstants::AJAM_PORT],
        ];

        // Define jails and their corresponding actions
        $jails        = [
            'dropbear'    => 'miko-iptables-multiport-all[name=SSH, port="'.implode(',', $sshPort).'"]',
            'mikopbx-www' => 'miko-iptables-multiport-all[name=HTTP, port="'.implode(',', $httpPorts).'"]',
        ];
        $this->generateModulesJailsLocal($max_retry, $find_time, $ban_time);

        // Generate the Fail2Ban configuration
        $config       = "[DEFAULT]\n" .
            "ignoreip = 127.0.0.1 $user_whitelist\n\n";
        $syslog_file = SyslogConf::getSyslogFile();
        $commonParams = "enabled = true".PHP_EOL .
                        "maxretry = $max_retry\n" .
                        "findtime = $find_time\n" .
                        "bantime = $ban_time\n" .
                        "logencoding = utf-8".PHP_EOL;

        foreach ($jails as $jail => $action) {
            $config .= "[$jail]\n" .
                $commonParams.
                "logpath = $syslog_file\n" .
                "action = $action\n\n";
        }
        $log_dir = Directories::getDir(Directories::CORE_LOGS_DIR) . '/asterisk/';
        $jails = [
            'asterisk_security_log' => ['security_log', '', $asteriskPorts],
            'asterisk_error'        => ['error', '_ERROR', $asteriskPorts],
            'asterisk_public'       => ['messages', '_PUBLIC', $asteriskPorts],
            'asterisk_ami'          => ['messages', '_AMI', $asteriskAMI],
        ];
        foreach ($jails as $jail => [$logPrefix, $actionNamePrefix, $ports]) {
            $config  .= "[$jail]" . PHP_EOL.
                $commonParams.
                "filter = asterisk-main" . PHP_EOL.
                'action = miko-iptables-multiport-all[name=ASTERISK'.$actionNamePrefix.', port="'.implode(',', $ports).'"]'. PHP_EOL.
                "logpath = $log_dir$logPrefix". PHP_EOL. PHP_EOL;
        }
        // Write the Fail2Ban configuration to the jail.local file
        Util::fileWriteContent('/etc/fail2ban/jail.local', $config);
    }

    /**
     * Generate the actions for iptables and write it to a configuration file.
     *
     * This function constructs the configuration string for iptables based on predefined commands.
     * These commands include start, stop, check, ban, and unban actions for the iptables firewall.
     * The configuration is written to a file named 'miko-iptables-multiport-all.conf'.
     *
     * @return void
     */
    private function generateActions(): void
    {
        // Define the path to the configuration file
        $path = self::ACTION_PATH;

        // Construct the configuration string
        $conf = "[INCLUDES]".PHP_EOL.
                "before = iptables.conf".PHP_EOL.
                "[Definition]".PHP_EOL.
                "actionstart = <iptables> -N f2b-<name>".PHP_EOL.
                "              <iptables> -A f2b-<name> -j <returntype>".PHP_EOL.
                "              <iptables> -I <chain> -p tcp -m multiport --dports <port> -j f2b-<name>".PHP_EOL.
                "              <iptables> -I <chain> -p udp -m multiport --dports <port> -j f2b-<name>".PHP_EOL.
                "actionstop = <iptables> -D <chain> -p tcp -m multiport --dports <port> -j f2b-<name>".PHP_EOL.
                "             <iptables> -D <chain> -p udp -m multiport --dports <port> -j f2b-<name>".PHP_EOL.
                "             <actionflush>".PHP_EOL.
                "             <iptables> -X f2b-<name>".PHP_EOL.
                "actioncheck = <iptables> -n -L <chain> | grep -q 'f2b-<name>[ \\t]'".PHP_EOL.
                "actionban = <iptables> -I f2b-<name> 1 -s <ip> -p tcp -m multiport --dports <port> -j <blocktype>".PHP_EOL.
                "            <iptables> -I f2b-<name> 1 -s <ip> -p udp -m multiport --dports <port> -j <blocktype>".PHP_EOL.
                "actionunban = <iptables> -D f2b-<name> -s <ip> -p tcp -m multiport --dports <port> -j <blocktype>".PHP_EOL.
                "              <iptables> -D f2b-<name> -s <ip> -p udp -m multiport --dports <port> -j <blocktype>".PHP_EOL.
                "[Init]".PHP_EOL.PHP_EOL;

        // Write the configuration string to the configuration file
        file_put_contents("$path/miko-iptables-multiport-all.conf", $conf);
    }


    /**
     * Generate the jail configurations for various services.
     *
     * This function constructs the jail configuration strings for various services like MikroPBX web interface,
     * Dropbear SSH server, Asterisk AMI, and Asterisk security. These jail configurations are written to
     * their respective files.
     *
     * @return void
     */
    private function generateJails(): void
    {
        // Define the path to the filter files
        $filterPath = self::FILTER_PATH;

        $commonConf = "[INCLUDES]" . PHP_EOL.
            "before = common.conf" . PHP_EOL .
            "[Definition]". PHP_EOL;
        // Construct the MikoPBX web interface configuration string
        $conf = $commonConf .
            "_daemon = [\S\W\s]+web_auth\n" .
            'failregex = \sFrom:\s<HOST>\sUserAgent:(\S|\s)*Wrong password$' . "\n" .
            '            ^(\S|\s)*nginx:\s+\d+/\d+/\d+\s+(\S|\s)*status\s+403(\S|\s)*client:\s+<HOST>(\S|\s)*' . "\n" .
            '            \[error\] \d+#\d+: \*\d+ user "(?:[^"]+|.*?)":? (?:password mismatch|was not found in "[^\"]*"), client: <HOST>, server: \S*, request: "\S+ \S+ HTTP/\d+\.\d+", host: "\S+"(?:, referrer: "\S+")?\s*$' . "\n" .
            "ignoreregex =\n";

        // Write the configuration to the MikoPBX web interface file
        file_put_contents("$filterPath/mikopbx-www.conf", $conf);

        // Construct the Dropbear SSH server configuration string
        $conf = $commonConf .
            "_daemon = (authpriv.warn )?dropbear\n" .
            'prefregex = ^%(__prefix_line)s<F-CONTENT>(?:[Ll]ogin|[Bb]ad|[Ee]xit).+</F-CONTENT>$' . "\n" .
            'failregex = ^[Ll]ogin attempt for nonexistent user (\'.*\' )?from <HOST>:\d+$' . "\n" .
            '            ^[Bb]ad (PAM )?password attempt for .+ from <HOST>(:\d+)?$' . "\n" .
            '            ^[Ee]xit before auth \(user \'.+\', \d+ fails\): Max auth tries reached - user \'.+\' from <HOST>:\d+\s*$' . "\n" .
            "ignoreregex =\n";

        // Write the configuration to the Dropbear SSH server file
        file_put_contents("$filterPath/dropbear.conf", $conf);

        // Construct the Asterisk AMI configuration string
        $conf = $commonConf.
                "_daemon = asterisk".PHP_EOL.PHP_EOL.
                "__pid_re = (?:\[\d+\])".PHP_EOL.
                "_c_ooooo = (\[C-\d+[a-z]*\]?)".PHP_EOL.PHP_EOL.
                "log_prefix= (?:NOTICE|SECURITY)%(__pid_re)s:?%(_c_ooooo)s?:? \S+:\d*( in \w+:)?".PHP_EOL.PHP_EOL.
                "failregex = ^(%(__prefix_line)s|\[\]\s*)%(log_prefix)s Host <HOST> failed to authenticate as '[^']*'\$".PHP_EOL.
                "            ^(%(__prefix_line)s|\[\]\s*)%(log_prefix)s(?:\sHost)? <HOST> failed to authenticate as '[^']*'\$".PHP_EOL.PHP_EOL.
                "ignoreregex =".PHP_EOL.PHP_EOL;
        // Write the configuration to the Asterisk AMI file
        file_put_contents("$filterPath/asterisk-ami.conf", $conf);


        // Construct the Asterisk security configuration string

        $conf = $commonConf.
                "_daemon = asterisk".PHP_EOL.PHP_EOL.
                "__pid_re = (?:\[\d+\])".PHP_EOL.
                "_c_ooooo = (\[C-\d+[a-z]*\]?)".PHP_EOL.PHP_EOL.
                "log_prefix= (?:NOTICE|SECURITY)%(__pid_re)s:?%(_c_ooooo)s?:? \S+:\d*( in \w+:)?".PHP_EOL.PHP_EOL.
                "failregex = ^(%(__prefix_line)s|\[\]\s*)%(log_prefix)s Registration from '[^']*' failed for '<HOST>(:\d+)?' - (Wrong password|Username/auth name mismatch|No matching peer found|Not a local domain|Device does not match ACL|Peer is not supposed to register|ACL error \(permit/deny\)|Not a local domain)\$".PHP_EOL.
                "            ^(%(__prefix_line)s|\[\]\s*)%(log_prefix)s No registration for peer '[^']*' \(from <HOST>\)\$".PHP_EOL.
                "            ^(%(__prefix_line)s|\[\]\s*)%(log_prefix)s Host <HOST> failed MD5 authentication for '[^']*' \([^)]+\)\$".PHP_EOL.
                "            ^(%(__prefix_line)s|\[\]\s*)%(log_prefix)s Failed to authenticate (user|device) [^@]+@<HOST>\S*\$".PHP_EOL.
                "            ^(%(__prefix_line)s|\[\]\s*)%(log_prefix)s (?:handle_request_subscribe: )?Sending fake auth rejection for (device|user) \d*<sip:[^@]+@<HOST>>;tag=\w+\S*\$".PHP_EOL.
                '            ^(%(__prefix_line)s|\[\]\s*WARNING%(__pid_re)s:?(?:\[C-[\da-f]*\])? )Ext\. s: "Rejecting unknown SIP connection from <HOST>"$'.PHP_EOL.
                "            ^(%(__prefix_line)s|\[\]\s*)%(log_prefix)s <HOST> tried to authenticate with nonexistent user".PHP_EOL.
                "			^(%(__prefix_line)s|\[\]\s*)%(log_prefix)s Request (?:'[^']*' )?from '(?:[^']*|.*?)' failed for '<HOST>(?::\d+)?'\s\(callid: [^\)]*\) - (?:No matching endpoint found|Not match Endpoint(?: Contact)? ACL|(?:Failed|Error) to authenticate)\s*\$".PHP_EOL.
                "			^(%(__prefix_line)s|\[\]\s*)%(log_prefix)s\s*(anonymous:\s)?Call\s(from)*\s*\((\w*:)?<HOST>:\d+\) to extension '\S*' rejected because extension not found in context 'public-direct-dial'\.\$".PHP_EOL.
                '            ^(%(__prefix_line)s|\[\]\s*)%(log_prefix)s SecurityEvent="(?:FailedACL|InvalidAccountID|ChallengeResponseFailed|InvalidPassword)"(?:(?:,(?!RemoteAddress=)\w+="[^"]*")*|.*?),RemoteAddress="IPV[46]/[^/"]+/<HOST>/\d+"(?:,(?!RemoteAddress=)\w+="[^"]*")*$'.PHP_EOL.
                "            ^(%(__prefix_line)s|\[\]\s*)%(log_prefix)s ^hacking attempt detected '<HOST>'\$".PHP_EOL.PHP_EOL.
                'ignoreregex = Service="AMI"'.PHP_EOL.PHP_EOL;

        // Write the configuration to the Asterisk security file
        file_put_contents("$filterPath/asterisk-main.conf", $conf);

        // Generate the module filters
        $this->generateModulesFilters();
    }

    /**
     * Generate additional modules filter files
     */
    private function generateModulesFilters(): void
    {
        $filterPath        = self::FILTER_PATH;
        $rmPath            = Util::which('rm');
        Processes::mwExec("$rmPath -rf $filterPath/module_*.conf");

        // Add additional modules routes
        $additionalModulesJails = PBXConfModulesProvider::hookModulesMethod(SystemConfigInterface::GENERATE_FAIL2BAN_JAILS);
        foreach ($additionalModulesJails as $moduleUniqueId=>$moduleJailText) {
            $fileName = Text::uncamelize($moduleUniqueId,'_').'.conf';
            file_put_contents("$filterPath/$fileName", $moduleJailText);
        }
    }

    /**
     * Generate local jail configurations for the provided modules.
     *
     * This method creates configuration for each jail rule provided by the PBXConfModulesProvider. These
     * configurations are then written to their respective files in the jail directory.
     *
     * @param int $max_retry The maximum number of retries before a host is banned. Default is 0.
     * @param int $find_time The time frame in which a host makes unsuccessful login attempts before it is banned. Default is 0.
     * @param int $ban_time  The amount of time a host is banned. Default is 0.
     *
     * @return void
     */
    private function generateModulesJailsLocal(int $max_retry = 0, int $find_time = 0, int $ban_time = 0): void
    {
        // Initialize the properties if they are not provided.
        if($max_retry === 0){
            [$max_retry, $find_time, $ban_time] = $this->initProperty();
        }

        // Create the jail directory if it does not exist
        if(!is_dir(self::JAILS_DIR)){
            Util::mwMkdir(self::JAILS_DIR);
        }

        // Define the prefix and extension for the jail configuration files
        $prefix = 'pbx_';
        $extension = 'conf';

        // Delete all existing jail configuration files
        Processes::mwExec("rm -rf ".self::JAILS_DIR."/$prefix*.$extension");

        // Get the system log file
        $syslog_file = SyslogConf::getSyslogFile();

        // Fetch the jails provided by the modules
        $additionalModulesJails = PBXConfModulesProvider::hookModulesMethod(SystemConfigInterface::GENERATE_FAIL2BAN_JAILS);

        // Iterate over each jail rule provided by the modules
        foreach ($additionalModulesJails as $moduleUniqueId=>$moduleJailText) {

            // Convert the module's unique id to a file-friendly format
            $fileName = Text::uncamelize($moduleUniqueId,'_');

            // Construct the configuration string for the module
            $config = "[$fileName]\n" .
                "enabled = true\n" .
                "logpath = $syslog_file\n" .
                "maxretry = $max_retry\n" .
                "findtime = $find_time\n" .
                "bantime = $ban_time\n" .
                "logencoding = utf-8\n" .
                "action = iptables-allports[name=$moduleUniqueId, protocol=all]\n\n";

            // Write the configuration to the jail's configuration file
            file_put_contents(self::JAILS_DIR."/".$prefix."$fileName.$extension", $config);
        }
    }

    /**
     * Initialize fail2ban rule properties.
     *
     * This method retrieves fail2ban rule properties from the database and constructs a whitelist
     * of IPs which should not be banned. If the rule is not found, it assigns default values.
     *
     * @return array Contains max_retry, find_time, ban_time and user_whitelist.
     */
    private function initProperty(): array{

        // Initial empty whitelist.
        $user_whitelist = '';

        // Find the first rule with id '1'.
        /** @var Fail2BanRules $res */
        $res = Fail2BanRules::findFirst("id = '1'");

        // If rule exists, extract its properties.
        if ($res !== null) {
            $max_retry = (int) $res->maxretry;
            $find_time = (int) $res->findtime;
            $ban_time = (int) $res->bantime;

            // Explode whitelist IPs into array.
            $whitelist = (string) $res->whitelist;
            $arr_whitelist = explode(' ', $whitelist);

            // Verify and add each IP to user whitelist.
            foreach ($arr_whitelist as $ip_string) {
                if (Verify::isIpAddress($ip_string)) {
                    $user_whitelist .= "$ip_string ";
                }
            }

            // Fetch network filters where newer_block_ip = '1'.
            $net_filters = NetworkFilters::find("newer_block_ip = '1'");

            // Add each filter's permit IP to user whitelist.
            foreach ($net_filters as $filter) {
                $user_whitelist .= "$filter->permit ";
            }

            // Trim any trailing spaces from the user whitelist.
            $user_whitelist = trim($user_whitelist);
        } else {
            // If rule doesn't exist, use default values.
            $max_retry = 10;
            $find_time = 1800;
            $ban_time = 43200;
        }

        // Return an array of the properties.
        return array($max_retry, $find_time, $ban_time, $user_whitelist);
    }

}