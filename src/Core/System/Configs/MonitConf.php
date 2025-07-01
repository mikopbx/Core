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

use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\SystemMessages;
use MikoPBX\Core\System\Util;
use function MikoPBX\Common\Config\appPath;

/**
 * Class MonitConf
 *
 * Represents the Monit configuration.
 *
 * @package MikoPBX\Core\System\Configs
 */
class MonitConf extends SystemConfigClass
{
    public const string PROC_NAME = 'monit';
    private const string CONF_PATH = '/etc/monitrc';
    public const string CONF_DIR_PATH = '/etc/monit.d';

    /**
     * Start the service after reconfiguring it.
     *
     * This method first applies the current configuration by calling configure(),
     * then safely restarts the daemon process using Processes::safeStartDaemon().
     *
     * @return bool True if the daemon was restarted successfully, false otherwise.
     */
    public function start(): bool
    {
        $result = $this->reStart();
        $this->monitValidate();
        return $result;
    }

    /**
     * Restarts the service after reconfiguring it.
     *
     * This method first applies the current configuration by calling configure(),
     * then safely restarts the daemon process using Processes::safeStartDaemon().
     *
     * @return bool True if the daemon was restarted successfully, false otherwise.
     */
    public function reStart(): bool
    {
        $this->configure();
        $isStarted = Processes::safeStartDaemon(self::PROC_NAME, '-I', 40);
        $isReady = false;
        if($isStarted){
            $redisCli = Util::which(self::PROC_NAME);
            for ($i = 1; $i <= 60; $i++) {
                if (Processes::mwExec("$redisCli status") === 0) {
                    $isReady = true;
                    break;
                }
                sleep(1);
            }
        }
        return $isStarted && $isReady;
    }

    /**
     * Sets up the Monit daemon conf file.
     *
     * @return void
     */
    private function configure(): void
    {
        Util::mwMkdir(self::CONF_DIR_PATH);
        $rmPath = Util::which('rm');
        shell_exec("$rmPath -rf ".self::CONF_DIR_PATH."/*.conf");

        $conf = 'set daemon 5'.PHP_EOL.
                //'set logfile /var/log/monit.log'.PHP_EOL.
                'set logfile syslog'.PHP_EOL.
                'include '.self::CONF_DIR_PATH.'/*.cfg'.PHP_EOL.
                'set httpd unixsocket /var/run/monit.sock'.PHP_EOL.
                'allow mikopbx:mikopbx'.PHP_EOL.PHP_EOL.
                'CHECK NETWORK loopback WITH ADDRESS 127.0.0.1'.PHP_EOL;
        file_put_contents(self::CONF_PATH, $conf);
        chmod(self::CONF_PATH, 0700);
        chmod(self::CONF_DIR_PATH, 0700);
        $this->generateOtherConf();
    }
    /**
     * Generates Monit configuration files for all registered system components except current class and MonitConf.
     *
     * This method scans the configuration directory for PHP files representing system components,
     * skips specific classes (like SystemConfigClass and MonitConf), instantiates valid classes,
     * sorts them by priority, and calls their generateMonitConf() method to create Monit configs.
     *
     * If a generated configuration is invalid, an error is logged and the configuration file is removed.
     *
     * @return void
     */
    private function generateOtherConf():void
    {
        $arrObjects = [];
        $configsDir = appPath('src/Core/System/Configs');
        $modulesFiles = glob("$configsDir/*.php", GLOB_NOSORT);

        foreach ($modulesFiles as $file) {
            $className        = pathinfo($file)['filename'];
            if (in_array($className, ['SystemConfigClass','MonitConf'], true) ){
                continue;
            }
            $fullClassName = "\\MikoPBX\\Core\\System\\Configs\\$className";
            if (class_exists($fullClassName)) {
                $object = new $fullClassName();
                if ($object instanceof SystemConfigClass){
                    $arrObjects[] = $object;
                }
            }
        }

        usort($arrObjects, function($a, $b) {
            return $a->getMethodPriority() - $b->getMethodPriority();
        });

        foreach ($arrObjects as $obj) {
            $obj->generateMonitConf();
            if(!$this->monitConfigIsValid()){
                SystemMessages::sysLogMsg(self::PROC_NAME, "Fail generate config ". $obj::PROC_NAME, LOG_ERR);
                $obj->deleteMonitConf();
            }
        }
    }

    /**
     * Generate additional syslog rules.
     * @return void
     */
    public static function generateSyslogConf(): void
    {
        Util::mwMkdir('/etc/rsyslog.d');
        $log_file       = SyslogConf::getSyslogFile(self::PROC_NAME);
        $pathScript     = SyslogConf::createRotateScript(self::PROC_NAME);
        $confSyslogD = '$outchannel log_' . self::PROC_NAME . ',' . $log_file . ',10485760,' . $pathScript . PHP_EOL .
            'if $programname == "' . self::PROC_NAME . '" then :omfile:$log_' . self::PROC_NAME . PHP_EOL .
            'if $programname == "' . self::PROC_NAME . '" then stop' . PHP_EOL;
        file_put_contents('/etc/rsyslog.d/' . self::PROC_NAME . '.conf', $confSyslogD);
    }
}
