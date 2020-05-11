<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 8 2019
 *
 */

namespace MikoPBX\Service;

use Phalcon\Di\Injectable;
use SimpleXMLElement;

class LicenseWorker extends Injectable
{

    private $serverUrl;
    private $sessionId;

    public function __construct($serverUrl = 'http://127.0.0.1:8223')
    {
        $this->serverUrl = $serverUrl;
    }

    /**
     * Получение инфорамции по лицензиям. Установка значения ключа в NATS.
     *
     * @param $key
     *
     * @return string|SimpleXMLElement
     */
    public function getLicenseInfo($key)
    {
        $response = $this->curlPostRequest(
            'getlicenseinfo',
            ['key' => $key]
        );

        $arResult = $this->convertXMLToArray($response['result']);
        if ($arResult['success']) {
            $result = $arResult['result'];
        } else {
            $result = $arResult['error'];
            if (openlog('License', LOG_ODELAY, LOG_LOCAL7)) {
                syslog(LOG_EMERG, $arResult['error']);
                closelog();
            }
        }

        return $result;
    }

    /**
     * Выполнение запроса к серверу NATS.
     *
     * @param $metod
     * @param $data
     *
     * @return mixed
     */
    private function curlPostRequest($metod, $data = null)
    {
        $url = $this->serverUrl . "/license.api/$metod";
        $ch  = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_TIMEOUT, 25);
        if ($data !== null) {
            $params = http_build_query($data);
            curl_setopt($ch, CURLOPT_POST, 1);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $params);
            curl_setopt(
                $ch,
                CURLOPT_HTTPHEADER,
                ['Content-type: application/x-www-form-urlencoded']
            );
        }
        $output   = curl_exec($ch);
        $httpcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return ['code' => $httpcode, 'result' => $output];
    }

    /**
     * Преобразование ответа в массив значений.
     *
     * @param $text
     *
     * @return array
     */
    private function convertXMLToArray($text): array
    {
        $json_data = json_decode($text, true);
        if (is_null($json_data)) {
            $text      = str_replace(['\n', '\"'], "\n", $text);
            $json_data = json_decode($text, true);
        }
        if ( ! isset($json_data['error'])) {
            $text_xml = urldecode($json_data['result']);
            libxml_use_internal_errors(true);
            $doc = simplexml_load_string($text_xml);
            if ( ! $doc) {
                libxml_clear_errors();
                $doc = $text_xml;
            }
            $result = ['success' => true, 'result' => $doc];
        } elseif (isset($json_data['error'])) {
            $result = ['success' => false, 'error' => $json_data['error']];
        } else {
            $result = ['success' => false, 'error' => $json_data];
        }

        return $result;
    }

    /**
     * Получение нового регистрационного номера.
     *
     * @param $params
     *
     * @return mixed
     */
    public function getTrialLicense($params)
    {
        $version = str_replace(PHP_EOL, '', file_get_contents('/etc/version'));

        $data     = [
            'companyname' => $params['companyname'],
            'email'       => $params['email'],
            'contact'     => $params['contact'],
            'tel'         => $params['telefone'],
            'inn'         => $params['inn'],
            'description' => "get trial from askozia pbx $version",
            'product'     => '11',
        ];
        $response = $this->curlPostRequest('gettrial', $data);
        $arResult = $this->convertXMLToArray($response['result']);
        if ($arResult['success']) {
            $result = $arResult['result'];
        } else {
            $result = $arResult['error'];
        }

        return $result;
    }

    /**
     * Добавление нового триала к ключу.
     *
     * @param $productId
     *
     * @return bool|string - результат активации триала
     */
    public function addTrial($productId)
    {
        $data     = ['product' => $productId];
        $response = $this->curlPostRequest('addtrial', $data);
        $arResult = $this->convertXMLToArray($response['result']);
        if ($arResult['success']) {
            $result = true;
        } else {
            $result = $arResult['error'];
        }

        return $result;
    }

    /**
     * Активация купона
     *
     * @param $coupon
     *
     * @return bool|string результат активации купона
     */
    public function activateCoupon($coupon)
    {
        $data     = ['coupon' => trim($coupon)];
        $response = $this->curlPostRequest('activatecoupon', $data);
        $arResult = $this->convertXMLToArray($response['result']);
        if ($arResult['success']) {
            $result = true;
        } else {
            $result = $arResult['error'];
        }

        return $result;
    }

    /**
     * Смена лицензионного ключа
     *
     * @param $newKey - новый ключ
     */
    public function changeLicenseKey($newKey): void
    {
        $this->curlPostRequest('changekey', ['key' => $newKey]);
    }

    /**
     * Отправка статистики на сервер лицензированиия
     *
     * @param $key    - ключ
     * @param $params - отправляемые параметры
     */
    public function sendLicenseMetrics($key, $params): void
    {
        $data = array_merge(['key' => $key], $params);
        $this->curlPostRequest('sendmetrics', $data);
    }

    /**
     * Захватывает указанную фичу в лицензиии
     *
     * @param $featureId
     *
     * @return bool
     */
    public function captureFeature($featureId): array
    {
        $params   = "feature={$featureId}";
        $response = $this->curlPostRequest('capturefeature?' . $params);
        $data     = json_decode($response['result'], true);
        if ($response['code'] === 200) {
            $this->sessionId = $data['session'];

            return ['success' => true];
        } else {
            return ['success' => false, 'error' => $data['error']];
        }
    }

    /**
     * Захватывает указанную фичу в лицензиии, учетом оффлайн режиима
     *
     * @param $featureId
     *
     * @return bool
     */
    public function featureAvailable($featureId): array
    {
        $params   = "feature={$featureId}";
        $response = $this->curlPostRequest('featureavailable?' . $params);
        if ($response['code'] === 200) {
            return ['success' => true];
        } else {
            $data = json_decode($response['result'], true);

            return ['success' => false, 'error' => $data['error']];
        }
    }

    /**
     * Захватывает указанную фичу в лицензиии
     *
     * @param $featureId
     *
     * @return bool
     */
    public function releaseFeature($featureId): array
    {
        if ($this->sessionId) {
            $params   = "session={$this->sessionId}&feature={$featureId}";
            $response = $this->curlPostRequest('releasefeature?' . $params);
            if ($response['code'] === 200) {
                return ['success' => true];
            } else {
                $data = json_decode($response['result'], true);

                return ['success' => false, 'error' => $data['error']];
            }
        }

        return ['success' => false, 'error' => 'SessionId did not store on capture'];
    }

    /**
     * Переводит сообщение сервера лицензирования на нужный язык
     *
     * @param $message
     *
     * @return string
     */
    public function translateLicenseErrorMessage($message): string
    {
        $result = $message;
        if (strpos($message, '2041') !== false) {
            $result = $this->translation->_('lic_FailedActivateCoupon2041');
        } elseif (strpos($message, '2040') !== false) {
            $result = $this->translation->_('lic_FailedActivateCoupon2040');
        } elseif (strpos($message, '2057') !== false) {
            $result = $this->translation->_('lic_FailedActivateCoupon2057');
        } elseif (strpos($message, '2037') !== false) {
            $result = $this->translation->_('lic_FailedActivateCoupon2037');
        } elseif (strpos($message, '2051') !== false) {
            $result = $this->translation->_('lic_FailedToGetTrialKey2051');
        } elseif (strpos($message, '2022') !== false) {
            $result = $this->translation->_('lic_FailedToGetTrialKey2022');
        } elseif (strpos($message, '2008') !== false) {
            $result = $this->translation->_('lic_FailedToCaptureFeature2008');
        } elseif (strpos($message, '2009') !== false) {
            $result = $this->translation->_('lic_InvalidLicenseKey2009');
        } elseif (strpos($message, '2011') !== false) {
            $result = $this->translation->_('lic_FeatureExpired2011');
        } elseif (empty($message)) {
            $result = $this->translation->_('lic_UnknownLicenseMessage');
        }

        return $result;
    }
}