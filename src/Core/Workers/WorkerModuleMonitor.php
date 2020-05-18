<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace MikoPBX\Core\Workers;

use Exception;
use MikoPBX\Common\Models\PbxExtensionModules;
use MikoPBX\Core\System\BeanstalkClient;
use MikoPBX\Core\System\Util;

require_once 'globals.php';

class WorkerModuleMonitor extends WorkerBase
{
    private $last_check_time = 0;

    /**
     * Проверка целостности модулей.
     */
    public function start($argv): void
    {
        $natsClient = $this->di->getShared('natsConnection');

        $beansTalkClient = new BeanstalkClient();
        $beansTalkClient->subscribe('ping_' . self::class, [$this, 'pingCallBack']);

        while (true) {
            if ( ! $natsClient->isConnected() === true) {
                $natsClient->reconnect();
            }
            $natsClient->wait();

            $beansTalkClient->wait(1); // instead of sleep

            $delta = time() - $this->last_check_time;
            if ($delta < 86400) {
                continue;
            }
            $this->last_check_time = time();
            $modules_miko          = $this->getNoduleData();

            $extensions_data = [];
            /** @var  PbxExtensionModules $data */
            $extensions_data = PbxExtensionModules::find('disabled=0');

            foreach ($extensions_data as $data) {
                if (($modules_miko[$data->uniqid] ?? true) === true) {
                    continue;
                }
                $lic_feature_id = $modules_miko[$data->uniqid]['lic_feature_id'] ?? '';
                if ($lic_feature_id !== '' && ! $this->captureFeature($lic_feature_id)) {
                    $this->disableModule($data->uniqid);
                }
            }
        }
    }


    /**
     * Получение информации по модулям MikoPBX.
     *
     * @return array
     */
    private function getNoduleData(): array
    {
        $result = $this->query('GET', 'https://update.askozia.ru/', ['TYPE' => 'MODULESLICINFO']);

        $data = [];
        if (isset($result['result']) && strtoupper($result['result']) === 'SUCCESS') {
            $data = $result['modules'] ?? [];
        }

        return $data;
    }

    /**
     * Отправка запроса HTTP.
     *
     * @param      $method
     * @param      $url
     * @param null $data
     * @param null $headers
     *
     * @return array
     */
    private function query($method, $url, $data = null, $headers = null): array
    {
        $curlOptions = [];

        if (is_array($headers)) {
            $curlOptions[CURLOPT_HTTPHEADER] = $headers;
        }

        if ($method === 'POST') {
            $curlOptions[CURLOPT_POST]       = true;
            $curlOptions[CURLOPT_POSTFIELDS] = http_build_query($data);
        } elseif ( ! empty($data)) {
            $url .= strpos($url, '?') > 0 ? '&' : '?';
            $url .= http_build_query($data);
        }
        $curlOptions[CURLOPT_RETURNTRANSFER] = true;

        return $this->execCurl($url, $curlOptions);
    }

    /**
     * Выполнение запроса с заданными параметрами.
     *
     * @param $url
     * @param $curlOptions
     *
     * @return array
     */
    private function execCurl($url, $curlOptions): array
    {
        $curl = curl_init($url);
        curl_setopt($curl, CURLOPT_TIMEOUT, 1);
        curl_setopt_array($curl, $curlOptions);
        $result = curl_exec($curl);

        $http_code = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        if ($http_code !== 200) {
            $data = [
                'ERROR' => $http_code,
                'data'  => $result,
            ];
        } else {
            $data = json_decode($result, true);
        }

        return $data;
    }

    /**
     * Проверка.
     *
     * @param $id
     *
     * @return bool
     */
    private function captureFeature($id): bool
    {
        $result = false;

        $url      = 'http://127.0.0.1:8223/license.api/featureavailable';
        $headers  = [];
        $response = $this->query('GET', $url, ['feature' => $id], $headers);
        if (isset($response['result']) && ! empty($response['result'])) {
            $result = true;
        }

        return $result;
    }

    /**
     * Отключение модуля
     *
     * @param $id
     */
    private function disableModule($id): void
    {
        /* Запрос на отключение модуля:
        curl 'http://127.0.0.1/admin-cabinet/pbx-extension-modules/disable/ModuleBitrix24Integration' \
              -H 'X-Requested-With: XMLHttpRequest' \
              -H 'Content-Type: application/x-www-form-urlencoded'
        //*/
        $url      = 'http://127.0.0.1/admin-cabinet/pbx-extension-modules/disable/' . $id;
        $headers  = [
            'X-Requested-With: XMLHttpRequest',
            'Content-Type: application/x-www-form-urlencoded',
        ];
        $response = $this->query('GET', $url, null, $headers);
        if ($response['success'] ?? false) {
            Util::sysLogMsg($id, 'Disable module: license lost.');
        }
    }

    /**
     * Обработка фатальных ошибок PHP.
     */
    public function shutdownHandler(): void
    {
        // if (@is_array($e = @error_get_last())) {
        //     Util::mwExecBg('/usr/bin/php -f /etc/inc/cron/WorkerSafeScripts.php');
        // }
    }

}

// Start worker process
$workerClassname = WorkerModuleMonitor::class;
if (isset($argv) && count($argv) > 1 && $argv[1] === 'start') {
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
