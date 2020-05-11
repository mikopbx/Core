<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 4 2020
 */

namespace MikoPBX\Core\System;

use MikoPBX\Common\Models\{Fail2BanRules, FirewallRules, NetworkFilters};
use SQLite3;

class Firewall
{
    private $firewall_enable;
    private $fail2ban_enable;

    /**
     * Firewall constructor.
     */
    public function __construct()
    {
        $this->firewall_enable = false;
        $this->fail2ban_enable = false;
        // Получение настроек.
        $config = new MikoPBXConfig();

        $firewall_enable       = $config->getGeneralSettings('PBXFirewallEnabled');
        $this->firewall_enable = ($firewall_enable === '1');

        $fail2ban_enable       = $config->getGeneralSettings('PBXFail2BanEnabled');
        $this->fail2ban_enable = ($fail2ban_enable === '1');
    }

    /**
     * Рестарт firewall.
     *
     * @return array
     */
    public static function reloadFirewall(): array
    {
        $result = [];

        $pid_file = '/var/run/service_reloadFirewall.pid';
        if (file_exists($pid_file)) {
            $old_pid = file_get_contents($pid_file);
            $process = Util::getPidOfProcess("^{$old_pid}");
            if ($process !== '') {
                $result['result'] = 'ERROR';
                $result['data']   = 'Another restart process has not yet completed';

                return $result;
            }
        }
        file_put_contents($pid_file, getmypid());

        $firewall = new Firewall();
        $firewall->applyConfig();

        unlink($pid_file);
        $result['result'] = 'Success';

        return $result;
    }

    /**
     *    Установка правил Firewall.
     **/
    public function applyConfig(): void
    {
        self::fail2banStop();
        $this->dropAllRules();
        self::fail2banMakeDirs();

        if ($this->firewall_enable) {
            $arr_command   = [];
            $arr_command[] = $this->getIptablesInputRule('', '-m conntrack --ctstate ESTABLISHED,RELATED');
            // Добавляем разрешения на сервисы.
            $this->addFirewallRules($arr_command);
            // Все остальное запрещаем.
            $arr_command[] = $this->getIptablesInputRule('', '', 'DROP');

            // Кастомизация правил firewall.
            $arr_commands_custom = [];
            $out                 = [];
            Util::fileWriteContent('/etc/firewall_additional', '');
            Util::mwExec(
                "/bin/cat /etc/firewall_additional | grep -v '|' | grep -v '&'| /bin/grep '^iptables' | /bin/busybox awk -F ';' '{print $1}'",
                $arr_commands_custom
            );
            if (Util::isSystemctl()) {
                Util::mwMkdir('/etc/iptables');
                file_put_contents('/etc/iptables/iptables.mikopbx', implode("\n", $arr_command));
                file_put_contents(
                    '/etc/iptables/iptables.mikopbx',
                    "\n" . implode("\n", $arr_commands_custom),
                    FILE_APPEND
                );
                Util::mwExec('systemctl restart mikopbx_iptables');
            } else {
                Util::mwExecCommands($arr_command, $out, 'firewall');
                Util::mwExecCommands($arr_commands_custom, $out, 'firewall_additional');
            }
        }
        if ($this->fail2ban_enable) {
            // Настройка правил бана.
            $this->writeConfig();
            self::fail2banStart();
        } else {
            self::fail2banStop();
        }
    }

    /**
     * Завершение работы fail2ban;
     */
    public static function fail2banStop(): void
    {
        if (Util::isSystemctl()) {
            Util::mwExec('systemctl stop fail2ban');
        } else {
            Util::mwExec('fail2ban-client -x stop');
        }
    }

    /**
     *    Удаление всех правил Firewall.
     */
    private function dropAllRules(): void
    {
        Util::mwExec('iptables -F');
        Util::mwExec('iptables -X');
    }

    /**
     * Создает служебные директории и ссылки на файлы fail2ban
     *
     * @return string
     */
    public static function fail2banMakeDirs(): string
    {
        $res_file = self::fail2banGetDbPath();
        $filename = basename($res_file);

        $old_dir_db = '/cf/fail2ban';
        $dir_db     = self::getFail2banDbDir();

        // Создаем рабочие каталоги.
        $db_bd_dir = dirname($res_file);
        if ( ! is_dir($db_bd_dir) && ! mkdir($db_bd_dir, 0755, true) && ! is_dir($db_bd_dir)) {
            Util::logMsgDb('Fail2ban', 'Error create dir ' . $db_bd_dir);
        }
        if ( ! is_dir($dir_db) && ! mkdir($dir_db, 0755, true) && ! is_dir($dir_db)) {
            Util::logMsgDb('Fail2ban', 'Error create dir ' . $dir_db);
        }

        $create_link = false;

        // Символическая ссылка на базу данных.
        if (@filetype($res_file) !== 'link') {
            @unlink($res_file);
            $create_link = true;
        } elseif (readlink($res_file) === "$old_dir_db/$filename") {
            @unlink($res_file);
            $create_link = true;
            if (file_exists("$old_dir_db/$filename")) {
                // Перемещаем файл в новое местоположение.
                Util::mwExec("mv '$old_dir_db/$filename' '$dir_db/$filename'");
            }
        }

        if ($create_link === true) {
            @symlink("$dir_db/$filename", $res_file);
        }

        return $res_file;
    }

    /**
     * Возвращает путь к файлу базы данных fail2ban.
     *
     * @return string
     */
    public static function fail2banGetDbPath(): string
    {
        return '/var/lib/fail2ban/fail2ban.sqlite3';
    }

    public static function getFail2banDbDir(): string
    {
        if (Storage::isStorageDiskMounted()) {
            $mount_point = Storage::getMediaDir();
            $db_dir      = "$mount_point/fail2ban";
        } else {
            $db_dir = "/var/spool/fail2ban";
        }
        if ( ! is_dir($db_dir) && ! mkdir($db_dir, 0755, true) && ! is_dir($db_dir)) {
            Util::logMsgDb('Fail2ban', 'Error create dir ' . $db_dir);
        }
        if ( ! file_exists($db_dir)) {
            $db_dir = '/tmp';
        }

        return $db_dir;
    }

    /**
     * Формирует строку правила iptables
     *
     * @param string $dport
     * @param string $other_data
     * @param string $action
     *
     * @return string
     */
    private function getIptablesInputRule($dport = '', $other_data = '', $action = 'ACCEPT'): string
    {
        $data_port = '';
        if (trim($dport) !== '') {
            $data_port = '--dport ' . $dport;
        }
        $other_data = trim($other_data);

        return "iptables -A INPUT $other_data $data_port -j $action";
    }

    /**
     * Генератор правил iptables.
     *
     * @param $arr_command
     */
    private function addFirewallRules(&$arr_command): void
    {
        /** @var \MikoPBX\Common\Models\FirewallRules $result */
        /** @var \MikoPBX\Common\Models\FirewallRules $rule */
        /** @var \MikoPBX\Common\Models\FirewallRules $rule */
        $result = FirewallRules::find();
        foreach ($result as $rule) {
            if ($rule->portfrom !== $rule->portto && trim($rule->portto) !== '') {
                $port = "{$rule->portfrom}:{$rule->portto}";
            } else {
                $port = $rule->portfrom;
            }
            /** @var \MikoPBX\Common\Models\NetworkFilters $network_filter */
            $network_filter = NetworkFilters::findFirst($rule->networkfilterid);
            if ($network_filter === null) {
                Util::sysLogMsg('Firewall', "network_filter_id not found {$rule->networkfilterid}");
                continue;
            }
            if ('0.0.0.0/0' === $network_filter->permit && $rule->action !== 'allow') {
                continue;
            }
            $other_data = "-p {$rule->protocol}";
            $other_data .= ($network_filter === null) ? '' : ' -s ' . $network_filter->permit;
            if ($rule->protocol === 'icmp') {
                $port       = '';
                $other_data .= ' --icmp-type echo-request';
            }

            $action        = ($rule->action === 'allow') ? 'ACCEPT' : 'DROP';
            $arr_command[] = $this->getIptablesInputRule($port, $other_data, $action);
        }
        // Разрешим все локальные подключения.
        $arr_command[] = $this->getIptablesInputRule('', '-s 127.0.0.1 ', 'ACCEPT');
    }

    /**
     * Записываем конфиг для fail2ban. Описываем правила блокировок.
     */
    private function writeConfig(): void
    {
        $user_whitelist = '';
        /** @var \MikoPBX\Common\Models\Fail2BanRules $res */
        $res = Fail2BanRules::findFirst("id = '1'");
        if ($res !== null) {
            $max_retry     = $res->maxretry;
            $find_time     = $res->findtime;
            $ban_time      = $res->bantime;
            $whitelist     = $res->whitelist;
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
            $ban_time  = '43200';
        }
        $this->generateJails();
        $jails  = [
            'dropbear'    => 'iptables-allports[name=SSH, protocol=all]',
            'mikoajam'    => 'iptables-allports[name=MIKOAJAM, protocol=all]',
            'mikopbx-www' => 'iptables-allports[name=HTTP, protocol=all]',
        ];
        $config = "[DEFAULT]\n" .
            "ignoreip = 127.0.0.1 {$user_whitelist}\n\n";

        $syslog_file = System::getSyslogFile();

        foreach ($jails as $jail => $action) {
            $config .= "[{$jail}]\n" .
                "enabled = true\n" .
                "backend = process\n" .
                "logpath = {$syslog_file}\n" .
                // "logprocess = logread -f\n".
                "maxretry = {$max_retry}\n" .
                "findtime = {$find_time}\n" .
                "bantime = {$ban_time}\n" .
                "logencoding = utf-8\n" .
                "action = {$action}\n\n";
        }

        $log_dir = System::getLogDir() . '/asterisk/';
        $config  .= "[asterisk_security_log]\n" .
            "enabled = true\n" .
            "filter = asterisk\n" .
            "action = iptables-allports[name=ASTERISK, protocol=all]\n" .
            "logencoding = utf-8\n" .
            "maxretry = {$max_retry}\n" .
            "findtime = {$find_time}\n" .
            "bantime = {$ban_time}\n" .
            "logpath = {$log_dir}security_log\n\n";

        $config .= "[asterisk_error]\n" .
            "enabled = true\n" .
            "filter = asterisk\n" .
            "action = iptables-allports[name=ASTERISK_ERROR, protocol=all]\n" .
            "maxretry = {$max_retry}\n" .
            "findtime = {$find_time}\n" .
            "bantime = {$ban_time}\n" .
            "logencoding = utf-8\n" .
            "logpath = {$log_dir}error\n\n";

        $config .= "[asterisk_public]\n" .
            "enabled = true\n" .
            "filter = asterisk\n" .
            "action = iptables-allports[name=ASTERISK_PUBLIC, protocol=all]\n" .
            "maxretry = {$max_retry}\n" .
            "findtime = {$find_time}\n" .
            "bantime = {$ban_time}\n" .
            "logencoding = utf-8\n" .
            "logpath = {$log_dir}messages\n\n";

        Util::fileWriteContent('/etc/fail2ban/jail.local', $config);
    }

    /**
     * Создаем дополнительные правила.
     */
    private function generateJails(): void
    {
        $conf = "[INCLUDES]\n" .
            "before = common.conf\n" .
            "[Definition]\n" .
            "_daemon = (authpriv.warn |auth.warn )?miko_ajam\n" .
            'failregex = ^%(__prefix_line)sFrom\s+<HOST>.\s+UserAgent:\s+[a-zA-Z0-9 \s\.,/:;\+\-_\)\(\[\]]*.\s+Fail\s+auth\s+http.$' . "\n" .
            '            ^%(__prefix_line)sFrom\s+<HOST>.\s+UserAgent:\s+[a-zA-Z0-9 \s\.,/:;\+\-_\)\(\[\]]*.\s+File\s+not\s+found.$' . "\n" .
            "ignoreregex =\n";
        file_put_contents('/etc/fail2ban/filter.d/mikoajam.conf', $conf);

        $conf = "[INCLUDES]\n" .
            "before = common.conf\n" .
            "[Definition]\n" .
            "_daemon = [\S\W\s]+web_auth\n" .
            'failregex = ^%(__prefix_line)sFrom:\s<HOST>\sUserAgent:(\S|\s)*Wrong password$' . "\n" .
            '            ^(\S|\s)*nginx:\s+\d+/\d+/\d+\s+(\S|\s)*status\s+403(\S|\s)*client:\s+<HOST>(\S|\s)*' . "\n" .
            "ignoreregex =\n";
        file_put_contents('/etc/fail2ban/filter.d/mikopbx-www.conf', $conf);

        $conf = "[INCLUDES]\n" .
            "before = common.conf\n" .
            "[Definition]\n" .
            "_daemon = (authpriv.warn )?dropbear\n" .
            'prefregex = ^%(__prefix_line)s<F-CONTENT>(?:[Ll]ogin|[Bb]ad|[Ee]xit).+</F-CONTENT>$' . "\n" .
            'failregex = ^[Ll]ogin attempt for nonexistent user (\'.*\' )?from <HOST>:\d+$' . "\n" .
            '            ^[Bb]ad (PAM )?password attempt for .+ from <HOST>(:\d+)?$' . "\n" .
            '            ^[Ee]xit before auth \(user \'.+\', \d+ fails\): Max auth tries reached - user \'.+\' from <HOST>:\d+\s*$' . "\n" .
            "ignoreregex =\n";
        file_put_contents('/etc/fail2ban/filter.d/dropbear.conf', $conf);
    }

    /**
     * Старт firewall.
     */
    public static function fail2banStart(): void
    {
        if (Util::isSystemctl()) {
            Util::mwExec('systemctl restart fail2ban');

            return;
        }
        // Чистим битые строки, не улдаленные после отмены бана.
        self::cleanFail2banDb();

        Util::killByName('fail2ban-server');
        $cmd_start = 'fail2ban-client -x start';
        $command   = "($cmd_start;) > /dev/null 2>&1 &";
        Util::mwExec($command);
    }

    public static function cleanFail2banDb(): void
    {
        /** @var \MikoPBX\Common\Models\Fail2BanRules $res */
        $res = Fail2BanRules::findFirst("id = '1'");
        if ($res !== null) {
            $ban_time = $res->bantime;
        } else {
            $ban_time = '43800';
        }
        $path_db = self::fail2banGetDbPath();
        $db      = new SQLite3($path_db);
        $db->busyTimeout(3000);
        if (false === self::tableBanExists($db)) {
            return;
        }
        $q = 'DELETE' . ' from bans WHERE (timeofban+' . $ban_time . ')<' . time();
        $db->query($q);
    }

    /**
     * Проверка существования таблицы ban в базе данных.
     *
     * @param SQLite3 $db
     *
     * @return bool
     */
    public static function tableBanExists($db): bool
    {
        $q_check      = 'SELECT' . ' name FROM sqlite_master WHERE type = "table" AND name="bans"';
        $result_check = $db->query($q_check);

        return (false !== $result_check && $result_check->fetchArray(SQLITE3_ASSOC) !== false);
    }

    /**
     * Проверка запущен ли fail2ban.
     */
    public static function checkFail2ban(): void
    {
        $firewall = new Firewall();
        if ($firewall->fail2ban_enable && ! $firewall->fail2banIsRunning()) {
            self::fail2banStart();
        }
    }

    /**
     * Проверка статуса fail2ban
     *
     * @return bool
     */
    private function fail2banIsRunning(): bool
    {
        $res_ping = Util::mwExec('fail2ban-client ping');
        $res_stat = Util::mwExec('fail2ban-client status');

        $result = false;
        if ($res_ping === 0 && $res_stat === 0) {
            $result = true;
        }

        return $result;
    }

    /**
     * Удалить адрес из бана.
     *
     * @param $ip
     *
     * @return array
     */
    public static function fail2banUnbanAll($ip): array
    {
        $ip     = trim($ip);
        $result = ['result' => 'Success'];
        if ( ! Verify::isIpAddress($ip)) {
            $result['message'] = "Not valid ip '{$ip}'.";

            return $result;
        }
        $config          = new MikoPBXConfig();
        $fail2ban_enable = $config->getGeneralSettings('PBXFail2BanEnabled');
        $enable          = ($fail2ban_enable == '1');
        if ($enable) {
            // Попробуем найти jail по данным DB.
            // fail2ban-client unban 172.16.156.1
            // TODO Util::mwExec("fail2ban-client unban {$ip}}");
            $data = self::getBanIp($ip);
            foreach ($data as $row) {
                $res = self::fail2banUnban($ip, $row['jail']);
                if ($res['result'] === 'ERROR') {
                    $result = $res;
                }
            }
        } else {
            $result = self::fail2banUnbanDb($ip);
        }

        return $result;
    }

    /**
     * Возвращает массив забаненных ip. Либо данные по конкретному адресу.
     *
     * @param null $ip
     *
     * @return array
     */
    public static function getBanIp($ip = null): array
    {
        $result = [];

        /** @var \MikoPBX\Common\Models\Fail2BanRules $res */
        $res = Fail2BanRules::findFirst("id = '1'");
        if ($res !== null) {
            $ban_time = $res->bantime;
        } else {
            $ban_time = '43800';
        }

        // Добавленн фильтр по времени бана. возвращаем только адреса, которые еще НЕ разбанены.
        $q = 'SELECT' . ' DISTINCT jail,ip,MAX(timeofban) AS timeofban, MAX(timeofban+' . $ban_time . ') AS timeunban FROM bans where (timeofban+' . $ban_time . ')>' . time(
            );
        if ($ip !== null) {
            $q .= " AND ip='{$ip}'";
        }
        $q .= ' GROUP BY jail,ip';

        $path_db = self::fail2banGetDbPath();
        $db      = new SQLite3($path_db);
        $db->busyTimeout(5000);

        if (false === self::tableBanExists($db)) {
            // Таблица не существует. Бана нет.
            return $result;
        }

        $results = $db->query($q);
        if (false !== $results && $results->numColumns() > 0) {
            while ($res = $results->fetchArray(SQLITE3_ASSOC)) {
                $result[] = $res;
            }
        }

        return $result;
    }

    /**
     * Удалить из бана конкретный IP из конкретного jail.
     *
     * @param $ip
     * @param $jail
     *
     * @return array
     */
    public static function fail2banUnban($ip, $jail): array
    {
        $res = ['result' => 'ERROR'];
        $ip  = trim($ip);
        // Валидация...
        $matches = [];
        // preg_match_all('/^[a-z-]+$/', $jail, $matches, PREG_SET_ORDER);
        if ( ! Verify::isIpAddress($ip)) {
            // это НЕ IP адрес, или не корректно указан jail.
            $res['message'] = 'Not valid ip or jail.';

            return $res;
        }
        $path_sock = '/var/run/fail2ban/fail2ban.sock';
        if (file_exists($path_sock) && filetype($path_sock) === 'socket') {
            $out = [];
            Util::mwExec("fail2ban-client set {$jail} unbanip {$ip} 2>&1", $out);
            $res_data = trim(implode('', $out));
            if ($res_data !== $ip && $res_data !== "IP $ip is not banned") {
                $res['message'] = 'Error fail2ban-client. ' . $res_data;

                return $res;
            }
        } else {
            $res['message'] = 'Fail2ban not run.';

            return $res;
        }

        $res = self::fail2banUnbanDb($ip, $jail);

        return $res;
    }

    /**
     * Удаление бана из базы.
     *
     * @param        $ip
     * @param string $jail
     *
     * @return array
     */
    public static function fail2banUnbanDb($ip, $jail = ''): array
    {
        $jail_q  = ($jail === '') ? '' : "AND jail = '{$jail}'";
        $path_db = self::fail2banGetDbPath();
        $db      = new SQLite3($path_db);
        $db->busyTimeout(3000);
        if (false === self::tableBanExists($db)) {
            // Таблица не существует. Бана нет.
            return [
                'result'  => 'Success',
                'message' => '',
            ];
        }
        $q = 'DELETE' . " FROM bans WHERE ip = '{$ip}' {$jail_q}";
        $db->query($q);

        $err = $db->lastErrorMsg();

        return [
            'result'  => ($err === 'not an error') ? 'Success' : 'ERROR',
            'message' => $err,
        ];
    }

}
