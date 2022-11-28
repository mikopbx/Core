<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright (C) 2017-2020 Alexey Portnov and Nikolay Beketov
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
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\System;
use MikoPBX\Core\System\Util;
use MikoPBX\Core\System\Verify;
use MikoPBX\Modules\Config\ConfigClass;
use Phalcon\Di\Injectable;
use Phalcon\Text;
use SQLite3;

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
        $fail2ban_enable       = $this->allPbxSettings['PBXFail2BanEnabled'];
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
        $res_ping     = Processes::mwExec("{$fail2banPath} ping");
        $res_stat     = Processes::mwExec("{$fail2banPath} status");

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
        if (Util::isSystemctl() && ! Util::isDocker()) {
            $systemctlPath = Util::which('systemctl');
            Processes::mwExec("{$systemctlPath} restart fail2ban");

            return;
        }
        Processes::killByName('fail2ban-server');
        $fail2banPath = Util::which('fail2ban-client');
        $cmd_start    = "{$fail2banPath} -x start";
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
            $fail2ban->generateModulesFilters();
            $fail2ban->generateModulesJailsLocal();
            // Перезагрузка конфигов без рестарта конфига.
            Processes::mwExecBg("{$fail2banPath} reload");
        }
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
        if (Util::isSystemctl() && ! Util::isDocker()) {
            $systemctlPath = Util::which('systemctl');
            Processes::mwExec("{$systemctlPath} stop fail2ban");
        } else {
            $fail2banPath = Util::which('fail2ban-client');
            Processes::mwExec("{$fail2banPath} -x stop");
        }
    }

    /**
     * Create fail2ban dirs and DB if it does not exists
     *
     * @return string
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
        // Создаем рабочие каталоги.
        $db_bd_dir = dirname($res_file);
        Util::mwMkdir($db_bd_dir);

        $create_link = false;

        // Символическая ссылка на базу данных.
        if (file_exists($res_file)){
            if (filetype($res_file) !== 'link') {
                unlink($res_file);
                $create_link = true;
            } elseif (readlink($res_file) === "$old_dir_db/$filename") {
                unlink($res_file);
                $create_link = true;
                if (file_exists("$old_dir_db/$filename")) {
                    // Перемещаем файл в новое местоположение.
                    $mvPath = Util::which('mv');
                    Processes::mwExec("{$mvPath} '$old_dir_db/$filename' '$dir_db/$filename'");
                }
            }
        }else{
            $sqlite3Path = Util::which('sqlite3');
            Processes::mwExec("{$sqlite3Path} {$dir_db}/{$filename} 'vacuum'");
            $create_link = true;
        }

        if ($create_link === true) {
            Util::createUpdateSymlink("$dir_db/$filename", $res_file);
        }

        return $res_file;
    }

    /**
     * Записываем конфиг для fail2ban. Описываем правила блокировок.
     */
    public function writeConfig(): void
    {
        [$max_retry, $find_time, $ban_time, $user_whitelist] = $this->initProperty();
        $this->generateActions();
        $this->generateJails();

        $httpPorts = [
            $this->allPbxSettings['WEBPort'],
            $this->allPbxSettings['WEBHTTPSPort']
        ];
        $sshPort = [
            $this->allPbxSettings['SSHPort'],
        ];
        $asteriskPorts = [
            $this->allPbxSettings['SIPPort'],
            $this->allPbxSettings['TLS_PORT'],
            $this->allPbxSettings['IAXPort'],
            $this->allPbxSettings['RTPPortFrom'].':'.$this->allPbxSettings['RTPPortTo'],
            $this->allPbxSettings['AJAMPortTLS']
        ];
        $asteriskAMI = [
            $this->allPbxSettings['AMIPort'],
            $this->allPbxSettings['AJAMPort'],
        ];

        $jails        = [
            'dropbear'    => 'miko-iptables-multiport-all[name=SSH, port="'.implode(',', $sshPort).'"]',
            'mikopbx-www' => 'miko-iptables-multiport-all[name=HTTP, port="'.implode(',', $httpPorts).'"]',
        ];

        $this->generateModulesJailsLocal($max_retry, $find_time, $ban_time);

        $config       = "[DEFAULT]\n" .
            "ignoreip = 127.0.0.1 {$user_whitelist}\n\n";

        $syslog_file = SyslogConf::getSyslogFile();

        foreach ($jails as $jail => $action) {
            $config .= "[{$jail}]\n" .
                "enabled = true\n" .
                "logpath = {$syslog_file}\n" .
                "maxretry = {$max_retry}\n" .
                "findtime = {$find_time}\n" .
                "bantime = {$ban_time}\n" .
                "logencoding = utf-8\n" .
                "action = {$action}\n\n";
        }

        $log_dir = System::getLogDir() . '/asterisk/';
        $config  .= "[asterisk_security_log]\n" .
            "enabled = true\n" .
            "filter = asterisk-main\n" .
            'action = miko-iptables-multiport-all[name=ASTERISK, port="'.implode(',', $asteriskPorts).'"]'. PHP_EOL.
            "logencoding = utf-8\n" .
            "maxretry = {$max_retry}\n" .
            "findtime = {$find_time}\n" .
            "bantime = {$ban_time}\n" .
            "logpath = {$log_dir}security_log\n\n";

        $config .= "[asterisk_error]\n" .
            "enabled = true\n" .
            "filter = asterisk-main\n" .
            'action = miko-iptables-multiport-all[name=ASTERISK_ERROR, port="'.implode(',', $asteriskPorts).'"]'. PHP_EOL.
            "maxretry = {$max_retry}\n" .
            "findtime = {$find_time}\n" .
            "bantime = {$ban_time}\n" .
            "logencoding = utf-8\n" .
            "logpath = {$log_dir}error\n\n";

        $config .= "[asterisk_public]\n" .
            "enabled = true\n" .
            "filter = asterisk-main\n" .
            'action = miko-iptables-multiport-all[name=ASTERISK_PUBLIC, port="'.implode(',', $asteriskPorts).'"]'. PHP_EOL.
            "maxretry = {$max_retry}\n" .
            "findtime = {$find_time}\n" .
            "bantime = {$ban_time}\n" .
            "logencoding = utf-8\n" .
            "logpath = {$log_dir}messages\n\n";

        $config .= "[asterisk_ami]\n" .
            "enabled = true\n" .
            "filter = asterisk-ami\n" .
            'action = miko-iptables-multiport-all[name=ASTERISK_AMI, port="'.implode(',', $asteriskAMI).'"]'. PHP_EOL.
            "maxretry = {$max_retry}\n" .
            "findtime = {$find_time}\n" .
            "bantime = {$ban_time}\n" .
            "logencoding = utf-8\n" .
            "logpath = {$log_dir}messages\n\n";

        Util::fileWriteContent('/etc/fail2ban/jail.local', $config);
    }

    private function generateActions(): void
    {
        $path = self::ACTION_PATH;
        $conf = "[INCLUDES]".PHP_EOL.
                "before = iptables-common.conf".PHP_EOL.
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
        file_put_contents("{$path}/miko-iptables-multiport-all.conf", $conf);
    }


    /**
     * Creates additional rules
     */
    private function generateJails(): void
    {
        $filterPath = self::FILTER_PATH;

        $conf = "[INCLUDES]\n" .
            "before = common.conf\n" .
            "[Definition]\n" .
            "_daemon = [\S\W\s]+web_auth\n" .
            'failregex = \sFrom:\s<HOST>\sUserAgent:(\S|\s)*Wrong password$' . "\n" .
            '            ^(\S|\s)*nginx:\s+\d+/\d+/\d+\s+(\S|\s)*status\s+403(\S|\s)*client:\s+<HOST>(\S|\s)*' . "\n" .
            '            \[error\] \d+#\d+: \*\d+ user "(?:[^"]+|.*?)":? (?:password mismatch|was not found in "[^\"]*"), client: <HOST>, server: \S*, request: "\S+ \S+ HTTP/\d+\.\d+", host: "\S+"(?:, referrer: "\S+")?\s*$' . "\n" .
            "ignoreregex =\n";
        file_put_contents("{$filterPath}/mikopbx-www.conf", $conf);

        $conf = "[INCLUDES]\n" .
            "before = common.conf\n" .
            "[Definition]\n" .
            "_daemon = (authpriv.warn )?dropbear\n" .
            'prefregex = ^%(__prefix_line)s<F-CONTENT>(?:[Ll]ogin|[Bb]ad|[Ee]xit).+</F-CONTENT>$' . "\n" .
            'failregex = ^[Ll]ogin attempt for nonexistent user (\'.*\' )?from <HOST>:\d+$' . "\n" .
            '            ^[Bb]ad (PAM )?password attempt for .+ from <HOST>(:\d+)?$' . "\n" .
            '            ^[Ee]xit before auth \(user \'.+\', \d+ fails\): Max auth tries reached - user \'.+\' from <HOST>:\d+\s*$' . "\n" .
            "ignoreregex =\n";
        file_put_contents("{$filterPath}/dropbear.conf", $conf);

        $conf = "[INCLUDES]".PHP_EOL.
                "before = common.conf".PHP_EOL.PHP_EOL.
                "[Definition]".PHP_EOL.PHP_EOL.
                "_daemon = asterisk".PHP_EOL.PHP_EOL.
                "__pid_re = (?:\[\d+\])".PHP_EOL.
                "_c_ooooo = (\[C-\d+[a-z]*\]?)".PHP_EOL.PHP_EOL.
                "log_prefix= (?:NOTICE|SECURITY)%(__pid_re)s:?%(_c_ooooo)s?:? \S+:\d*( in \w+:)?".PHP_EOL.PHP_EOL.
                "failregex = ^(%(__prefix_line)s|\[\]\s*)%(log_prefix)s Host <HOST> failed to authenticate as '[^']*'\$".PHP_EOL.
                "            ^(%(__prefix_line)s|\[\]\s*)%(log_prefix)s(?:\sHost)? <HOST> failed to authenticate as '[^']*'\$".PHP_EOL.PHP_EOL.
                "ignoreregex =".PHP_EOL.PHP_EOL;
        file_put_contents("{$filterPath}/asterisk-ami.conf", $conf);

        $conf = "[INCLUDES]".PHP_EOL.
                "before = common.conf".PHP_EOL.PHP_EOL.
                "[Definition]".PHP_EOL.PHP_EOL.
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
                "ignoreregex =".PHP_EOL.PHP_EOL;
        file_put_contents("{$filterPath}/asterisk-main.conf", $conf);

        $this->generateModulesFilters();
    }

    /**
     * Generate additional modules filter files
     */
    private function generateModulesFilters(): void
    {
        $filterPath        = self::FILTER_PATH;
        $rmPath            = Util::which('rm');
        Processes::mwExec("{$rmPath} -rf {$filterPath}/module_*.conf");


        // Add additional modules routes
        $configClassObj = new ConfigClass();
        $additionalModulesJails = $configClassObj->hookModulesMethodWithArrayResult(ConfigClass::GENERATE_FAIL2BAN_JAILS);
        foreach ($additionalModulesJails as $moduleUniqueId=>$moduleJailText) {
            $fileName = Text::uncamelize($moduleUniqueId,'_').'.conf';
            file_put_contents("{$filterPath}/{$fileName}", $moduleJailText);
        }
    }

    /**
     * @param $max_retry
     * @param $find_time
     * @param $ban_time
     */
    private function generateModulesJailsLocal($max_retry = 0, $find_time = 0, $ban_time = 0): void
    {
        if($max_retry === 0){
            [$max_retry, $find_time, $ban_time] = $this->initProperty();
        }
        if(!is_dir(self::JAILS_DIR)){
            Util::mwMkdir(self::JAILS_DIR);
        }
        $prefix = 'pbx_';
        $extension = 'conf';
        Processes::mwExec("rm -rf ".self::JAILS_DIR."/{$prefix}*.{$extension}");
        $syslog_file = SyslogConf::getSyslogFile();

        $configClassObj = new ConfigClass();
        $additionalModulesJails = $configClassObj->hookModulesMethodWithArrayResult(ConfigClass::GENERATE_FAIL2BAN_JAILS);
        foreach ($additionalModulesJails as $moduleUniqueId=>$moduleJailText) {
            $fileName = Text::uncamelize($moduleUniqueId,'_');

            $config = "[{$fileName}]\n" .
                "enabled = true\n" .
                "logpath = {$syslog_file}\n" .
                "maxretry = {$max_retry}\n" .
                "findtime = {$find_time}\n" .
                "bantime = {$ban_time}\n" .
                "logencoding = utf-8\n" .
                "action = iptables-allports[name={$moduleUniqueId}, protocol=all]\n\n";

            file_put_contents(self::JAILS_DIR."/{$prefix}{$fileName}.{$extension}", $config);
        }
    }

    /**
     * @return array
     */
    private function initProperty(): array{
        $user_whitelist = '';
        /** @var Fail2BanRules $res */
        $res = Fail2BanRules::findFirst("id = '1'");
        if ($res !== null) {
            $max_retry = $res->maxretry;
            $find_time = $res->findtime;
            $ban_time = $res->bantime;
            $whitelist = (string) $res->whitelist;
            $arr_whitelist = explode(' ', $whitelist);
            foreach ($arr_whitelist as $ip_string) {
                if (Verify::isIpAddress($ip_string)) {
                    $user_whitelist .= "$ip_string ";
                }
            }
            $net_filters = NetworkFilters::find("newer_block_ip = '1'");
            foreach ($net_filters as $filter) {
                $user_whitelist .= "{$filter->permit} ";
            }

            $user_whitelist = trim($user_whitelist);
        } else {
            $max_retry = '10';
            $find_time = '1800';
            $ban_time = '43200';
        }
        return array($max_retry, $find_time, $ban_time, $user_whitelist);
    }

}