<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

define('ISPBXCORESERVICES', '1');
/* nginx -s reload;
 */
require_once 'Nats/autoloader.php';
require_once 'globals.php';
use Phalcon\Mvc\Micro;
use Phalcon\Events\Event;
use Phalcon\Events\Manager as EventsManager;

// Create a events manager
$eventsManager = new EventsManager();
$eventsManager->attach('micro:beforeExecuteRoute', function (Event $event, Micro $app) {
    // return true;
    if($_SERVER['REMOTE_ADDR'] === '127.0.0.1'){
        return true;
    }
    $config = $GLOBALS['g']['phalcon_settings'];
    if($config['application']['debugMode'] === true){
        return true;
    }
    System::session_readonly();
    if( isset($_SESSION['auth']) ){
        return true;
    }
    // Исключения дла авторизации.content-disposition
    $panel_pattern = [
        '/api/miko_ajam/getvar', // Тут авторизация basic
        '/api/cdr/records',      // Тут авторизация basic
        '/api/cdr/playback',     // Защищен fail2ban
        '/api/cdr/get_data',
    ];
    // Текущий паттерн.
    $pattern = $app->getRouter()->getRewriteUri();
    $res_auth = true;
    // Проверяем авторизацию.
    if(preg_match_all('/\/api\/modules\/Module\w*\/custom_action\S*/m', $pattern) > 0){
        // Это сервисы модулей.
    }elseif(!in_array($pattern, $panel_pattern, true)) {
        $res_auth = false;
    }
    if(FALSE === $res_auth){
        $app->response->setStatusCode(403, 'Forbidden')->sendHeaders();
        $app->response->setContent('The user isn\'t authenticated. ');
        $app->response->send();
        $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? 'Undefined';
        Util::sys_log_msg('web_auth', "From: {$_SERVER['REMOTE_ADDR']} UserAgent:{$user_agent} Cause: Wrong password");
    }
    return $res_auth;
});

$app = new Micro();
$app->setEventsManager($eventsManager);

/**
 * Последовательная загрузка данных из cdr таблицы.
 * /pbxcore/api/cdr/get_data MIKO AJAM
 * curl 'http://127.0.0.1:80/pbxcore/api/cdr/get_data?offset=0&limit=1';
 */
$app->get('/api/cdr/get_data', function () use ($app) {
    $offset = $app->request->get('offset');
    $limit  = $app->request->get('limit');
    $limit  = ($limit>600)?600:$limit;

    $filter = [
        'id>:id:',
        'bind'  => ['id' => $offset],
        'order' => 'id',
        'limit' => $limit,
        'miko_result_in_file' => true
    ];

    $client  = new BeanstalkClient('select_cdr');
    $message = $client->request(json_encode($filter), 2);
    if($message === false){
        $app->response->setContent('');
        $app->response->send();
    }else{
        $result   = json_decode($message, true);
        $arr_data = [];
        if(file_exists($result)){
            $arr_data = json_decode(file_get_contents($result), true);
            @unlink($result);
        }
        $xml_output  = "<?xml version=\"1.0\"?>\n";
        $xml_output .= "<cdr-table-askozia>\n";
        if(is_array($arr_data)){
            foreach ($arr_data as $data){
                $attributes = '';
                foreach ($data as $tmp_key => $tmp_val) {
                    $attributes .= sprintf('%s="%s" ', $tmp_key, rawurlencode($tmp_val));
                }
                $xml_output.= "<cdr-row $attributes />\n";
            }
        }
        $xml_output .= '</cdr-table-askozia>';
        $app->response->setContent($xml_output);
        $app->response->send();
    }
});

/**
 * Скачивание записи разговора.
 * /pbxcore/api/cdr/records MIKO AJAM
 * curl http://172.16.156.223/pbxcore/api/cdr/records?view=/storage/usbdisk1/mikoziapbx/voicemailarchive/monitor/2018/05/05/16/mikozia-1525527966.4_oWgzQFMPRA.mp3
 */
$app->get('/api/cdr/records', function () use ($app) {
    if(!Util::check_auth_http($this->request)){
        $app->response->setStatusCode(403, 'Forbidden');
        $app->response->setContent('The user isn\'t authenticated.');
        $app->response->send();
        return;
    }

    $filename = $app->request->get('view');
    $extension = strtolower(substr(strrchr($filename,'.'),1));
    $type = '';
    switch ($extension) {
        case 'mp3':
            $type = 'audio/mpeg';
            break;
        case 'wav':
            $type = 'audio/x-wav';
            break;
        case 'gsm':
            $type = 'audio/x-gsm';
            break;
    }
    $size = @filesize($filename);
    if(!$size || $type === ''){
        openlog('miko_ajam', LOG_PID | LOG_PERROR, LOG_AUTH);
        $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? 'Undefined';
        syslog(LOG_WARNING, "From {$_SERVER['REMOTE_ADDR']}. UserAgent: ({$user_agent}). File not found.");
        closelog();

        $response = new Phalcon\Http\Response();
        $response->setStatusCode(404, 'Файл не найден');
        $response->setContent('Файл не найден');
        $response->send();
        return;
    }

    $fp=fopen($filename, 'rb');
    if ($fp) {
        $app->response->setHeader('Content-Description', 'mp3 file');
        $app->response->setHeader('Content-Disposition', 'attachment; filename='.basename($filename));
        $app->response->setHeader('Content-type', $type);
        $app->response->setHeader('Content-Transfer-Encoding', 'binary');
        $app->response->setContentLength($size);
        $app->response->sendHeaders();
        fpassthru($fp);
    }else{
        $response = new Phalcon\Http\Response();
        $response->setStatusCode(404, 'Файл не найден');
        $response->setContent('Не удалось открыть файо на сервере');
        $response->send();
        return;
    }
});

/**
 * Прослушивание файла записи с прокруткой.
 * /pbxcore/api/cdr/playback MIKO AJAM
 * http://172.16.156.212/pbxcore/api/cdr/playback?view=/storage/usbdisk1/mikopbx/voicemailarchive/monitor/2018/05/11/16/mikopbx-1526043925.13_43T4MdXcpT.mp3
 * http://172.16.156.212/pbxcore/api/cdr/playback?view=/storage/usbdisk1/mikopbx/voicemailarchive/monitor/2018/06/01/17/mikopbx-1527865189.0_qrQeNUixcV.wav
 * http://172.16.156.223/pbxcore/api/cdr/playback?view=/storage/usbdisk1/mikopbx/voicemailarchive/monitor/2018/12/18/09/mikopbx-1545113960.4_gTvBUcLEYh.mp3&download=true&filename=test.mp3
 *  Итого имеем следующий набор параметров API:
 *   * view* - полный путь к файлу записи разговора.
 *  download - опциональный параметр, скачивать записи или нет
 *  filename - опциональный параметр, красивое имя для файла, так файл будет назван при скачивании браузером
 */
$app->get('/api/cdr/playback', function () use ($app) {
    $filename    = $app->request->get('view');
    $extension = strtolower(substr(strrchr($filename,'.'),1));
    if(($extension === 'mp3' || $extension === 'wav' ) && Util::rec_file_exists($filename)){
        $ctype ='';
        switch( $extension ) {
            case 'mp3': $ctype='audio/mpeg'; break;
            case 'wav': $ctype='audio/x-wav'; break;
        }
        $filesize = filesize($filename);
        if (isset($_SERVER['HTTP_RANGE'])){
            $range = $_SERVER['HTTP_RANGE'];
            list ($param, $range) = explode('=', $range);
            if (strtolower(trim($param)) !== 'bytes') {
                header('HTTP/1.1 400 Invalid Request');
                exit();
            }
            $range = explode(',', $range);
            $range = explode('-', $range[0]);
            if ($range[0] === '') {
                $end = $filesize - 1;
                $start = $end - (int) $range[0];
            }else
                if ($range[1] === ''){
                    $start = (int) $range[0];
                    $end = $filesize - 1;
                }else{
                    $start  = (int) $range[0];
                    $end    = (int) $range[1];
                    // if ($end >= $filesize || (! $start && (! $end || $end == ($filesize - 1)))){
                        // $partial = false;
                    // }
                }
            $length = $end - $start + 1;

            $app->response->resetHeaders();
            if (! $fp = fopen($filename, 'rb')) {
                $app->response->setRawHeader('HTTP/1.1 500 Internal Server Error');
            }else{
                $app->response->setRawHeader('HTTP/1.1 206 Partial Content');
                $app->response->setHeader('Content-type', $ctype);
                $app->response->setHeader('Content-Range', "bytes $start-$end/$filesize");
                $app->response->setContentLength($length);
                if ($start){
                    fseek($fp, $start);
                }
                $content = '';
                while ($length) {
                    set_time_limit(0);
                    $read = ($length > 8192) ? 8192 : $length;
                    $length -= $read;
                    $content.=fread($fp, $read);
                }
                fclose($fp);
                $app->response->setContent($content);
            }
        }else{
            $app->response->setHeader('Content-type', $ctype);
            $app->response->setContentLength($filesize);
            $app->response->setHeader('Accept-Ranges', 'bytes');
            $app->response->setStatusCode(200, 'OK');
            // $app->response->setContent(file_get_contents($filename));
            $app->response->setFileToSend($filename);
            // TODO
        }
        $app->response->setHeader('Server', 'nginx');

        $is_download = !empty($app->request->get('download'));
        if($is_download){
            $new_filename = $app->request->get('filename');
            if(empty($new_filename)){
                $new_filename = basename($filename);
            }

            $app->response->setHeader('Content-Disposition', "attachment; filename*=UTF-8''".basename($new_filename));
        }
        $app->response->send();
    }else{
        openlog('miko_ajam', LOG_PID | LOG_PERROR, LOG_AUTH);

        $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? 'Undefined';
        syslog(LOG_WARNING, "From {$_SERVER['REMOTE_ADDR']}. UserAgent: ({$user_agent}). File not found.");
        closelog();
        $app->response->resetHeaders();
        $app->response->setRawHeader('HTTP/1.0 404 Not Found');
        $app->response->setStatusCode(404, 'Not Found');
        $app->response->setContent('File not found');
        $app->response->send();
    }
});

/**
 * /pbxcore/api/cdr/ Запрос активных звонков.
 *   curl http://172.16.156.223/pbxcore/api/cdr/get_active_calls;
 * Пример ответа:
 * [{"start":"2018-02-27 10:45:07","answer":null,"src_num":"206","dst_num":"226","did":"","linkedid":"1519717507.24"}]
 * Возвращает массив массивов со следующими полями:
"start" 		 => 'TEXT', 	 // DataTime
"answer" 		 => 'TEXT', 	 // DataTime
"endtime" 		 => 'TEXT', 	 // DataTime
"src_num" 		 => 'TEXT',
"dst_num" 		 => 'TEXT',
"linkedid" 		 => 'TEXT',
"did"  			 => 'TEXT',
 */
$app->get('/api/cdr/get_active_calls', function () use ($app) {
    $content = Cdr::get_active_calls();
    $app->response->setContent($content);
    $app->response->send();

});

/**
 * /pbxcore/api/cdr/ Запрос активных звонков.
 *   curl http://127.0.0.1/pbxcore/api/cdr/get_active_channels;
 * Пример ответа:
 * [{"start":"2018-02-27 10:45:07","answer":null,"src_num":"206","dst_num":"226","did":"","linkedid":"1519717507.24"}]
 * Возвращает массив массивов со следующими полями:
"start" 		 => 'TEXT', 	 // DataTime
"answer" 		 => 'TEXT', 	 // DataTime
"endtime" 		 => 'TEXT', 	 // DataTime
"src_num" 		 => 'TEXT',
"dst_num" 		 => 'TEXT',
"linkedid" 		 => 'TEXT',
"did"  			 => 'TEXT',
 */
$app->get('/api/cdr/get_active_channels', function () use ($app) {
    $content = Cdr::get_active_channels();
    $app->response->setContent($content);
    $app->response->send();

});

/**
 * /pbxcore/api/sip/ Получение информации о SIP.
 * Статусы SIP учеток:
 *   curl http://172.16.156.223/pbxcore/api/sip/get_peers_statuses;
 * Пример ответа:
 *   {"result":"Success","data":[{"id":"204","state":"UNKNOWN"}]}
 *
 * Статусы регистраций:
 *   curl http://172.16.156.212/pbxcore/api/sip/get_registry;
 * Пример ответа:
 *   {"result":"Success","data":[{"id":"SIP-PROVIDER-426304427564469b6c7755","state":"Registered"}]}
 */
$app->get('/api/sip/{name}', function ($params) use ($app) {
    $request = [
        'data'   => null,
        'action' =>$params
    ];

    $client = new Nats\Connection();
    $client->connect(2);
    $cb = function (Nats\Message $message) use ($app) {
        $app->response->setContent($message->getBody());
        $app->response->send();
        exit(0);
    };
    $client->request('sip', json_encode($request), $cb);

    $data = [
        'result'  => 'ERROR',
        'message' => 'API Worker not started...'
    ];
    $app->response->setContent(json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    $app->response->send();
});

/**
 * Статусы регистраций:
 *   curl http://172.16.156.212/pbxcore/api/iax/get_registry;
 */
$app->get('/api/iax/{name}', function ($params) use ($app) {
    $request = [
        'data' => null,
        'action' =>$params
    ];

    $client = new Nats\Connection();
    $client->connect(2);
    $cb = function (Nats\Message $message) use ($app) {
        $app->response->setContent($message->getBody());
        $app->response->send();
        exit(0);
    };
    $client->request('iax', json_encode($request), $cb);

    $data = [
        'result'  => 'ERROR',
        'message' => 'API Worker not started...'
    ];
    $app->response->setContent(json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    $app->response->send();
});

/**
 * Получение информации по SIP пиру.
 *   curl -X POST -d '{"peer": "212"}' http://127.0.0.1/pbxcore/api/sip/get_sip_peer;
 */
$app->post('/api/sip/{name}', function ($params) use ($app) {
    $row_data = $app->request->getRawBody();
    // Проверим, переданные данные.
    if(!Util::is_json($row_data)){
        $app->response->setStatusCode(200, "OK")->sendHeaders();
        $app->response->setContent('{"result":"ERROR"}');
        $app->response->send();
        return;
    }
    $data = json_decode( $row_data, true);
    $request = array(
        'data'      => $data,   // Параметры запроса.
        'action'    => $params  // Операция.
    );

    $client = new Nats\Connection();
    $client->connect(2);
    $cb = function (Nats\Message $message) use ($app) {
        $app->response->setContent($message->getBody());
        $app->response->send();
        exit(0);
    };
    $client->request('sip', json_encode($request), $cb);
    $data = [
        'result'  => 'ERROR',
        'message' => 'API Worker not started...'
    ];
    $app->response->setContent(json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    $app->response->send();
});

/**
 * /pbxcore/api/pbx/ Управление PBX.
 * Рестарт всех модулей АТС:
 *   curl http://172.16.156.212/pbxcore/api/pbx/reload_all_modules;
 * Запуск генератора dialplan, перезапуск dialplan на АТС.
 *   curl http://172.16.156.212/pbxcore/api/pbx/reload_dialplan;
 * Рестарт модуля SIP.
 *   curl http://127.0.0.1/pbxcore/api/pbx/reload_sip;
 * Рестарт модуля очередей.
 *   curl http://172.16.156.212/pbxcore/api/pbx/reload_queues;
 * Рестарт модуля IAX
 *   curl http://172.16.156.212/pbxcore/api/pbx/reload_iax;
 * Рестарт модуля AMI
 *   curl http://172.16.156.212/pbxcore/api/pbx/reload_manager;
 * Рестарт модуля features.conf
 *   curl http://172.16.156.212/pbxcore/api/pbx/reload_features;
 * Проверка лицензии
 *   curl http://172.16.156.212/pbxcore/api/pbx/check_licence;
 *
 * Пример ответа:
 *   {"result":"Success"}
 */
$app->get('/api/pbx/{name}', function ($params) use ($app) {
    $client = new Nats\Connection();
    $client->connect(10);
    $cb = function (Nats\Message $message) use ($app) {
        $app->response->setContent($message->getBody());
        $app->response->send();
    };
    $client->request('pbx', "$params", $cb);
});

/**
 * /pbxcore/api/system/ Управление системой в целом (GET).
 * Рестарт ОС.
 *   curl http://172.16.156.212/pbxcore/api/system/shutdown;
 * Рестарт ОС.
 *   curl http://172.16.156.212/pbxcore/api/system/reboot;
 * Рестарт сетевых интерфейсов.
 *   curl http://172.16.156.212/pbxcore/api/system/network_reload;
 * Перезагрузка правил firewall.
 *   curl http://127.0.0.1/pbxcore/api/system/reload_firewall;
 * Получения забаненных ip
 *   curl http://172.16.156.212/pbxcore/api/system/get_ban_ip;
 * Получение информации о системе
 *   curl http://172.16.156.223/pbxcore/api/system/get_info;
 * Настройка msmtp
 *   curl http://172.16.156.212/pbxcore/api/system/reload_msmtp;
 * Настройка SSH
 *   curl http://172.16.156.212/pbxcore/api/system/reload_ssh;
 * Настройка cron
 *   curl http://127.0.0.1/pbxcore/api/system/reload_cron;
 * Настройка Nats
 *   curl http://172.16.156.212/pbxcore/api/system/reload_nats;
 * Обновление конфигурации кастомных файлов.
 *   curl http://172.16.156.212/pbxcore/api/system/update_custom_files;
 * Старт сбора логов.
 *   curl http://172.16.156.212/pbxcore/api/system/start_log;
 * Завершение сбора логов.
 *   curl http://172.16.156.212/pbxcore/api/system/stop_log;
 * Пинг АТС (описан в nginx.conf):
 *   curl http://172.16.156.223/pbxcore/api/system/ping
 * Рестарт Web сервера:
 *   curl http://172.16.156.212/pbxcore/api/system/reload_nginx
 * Получение информации о внешнем IP адресе:
 *   curl http://172.16.156.212/pbxcore/api/system/get_external_ip_info
 *
 * Рестарт сервисов, зависимфх от модулей.
 *   curl http://127.0.0.1/pbxcore/api/system/restart_module_dependent_workers -H 'Cookie: XDEBUG_SESSION=PHPSTORM'
 * Пример ответа:
 *   {"result":"Success"}
 */
$app->get('/api/system/{name}', function ($params)use ($app) {

    $request = array(
        'data' => null,
        'action' =>$params
    );
    $client = new Nats\Connection();
    if($params === 'stop_log') {
        $client->connect(60);
    }else{
        $client->connect(5);
    }
    $cb = function (Nats\Message $message) use ($params, $app) {
        if($params === 'stop_log'){
            $data = json_decode($message->getBody(), true);
            if(!file_exists($data['filename'])){
                $app->response->setStatusCode(200, 'OK')->sendHeaders();
                $app->response->setContent('Log file not found.');
                $app->response->send();
                return;
            }

            $scheme     = $app->request->getScheme();
            $host       = $app->request->getHttpHost();
            $port       = $app->request->getPort();
            $uid        = Util::generateRandomString(36);
            $path2dirs  = PBX::get_asterisk_dirs();

            $result_dir = "{$path2dirs['download_link']}/{$uid}";
            Util::mwexec("mkdir -p {$result_dir}");

            $link_name = md5($data['filename']).'.'.Util::get_extension_file($data['filename']);
            Util::mwexec("ln -s {$data['filename']} {$result_dir}/{$link_name}");
            $app->response->redirect("{$scheme}://{$host}/download_link/{$uid}/{$link_name}");
            $app->response->send();
        }else{
            $app->response->setStatusCode(200, 'OK')->sendHeaders();
            $app->response->setContent($message->getBody());
            $app->response->send();
        }
    };
    $client->request('system', json_encode($request), $cb);
});

/**
 * /pbxcore/api/system/ Управление системой в целом (POST).
 * Установка системного времени
 *   curl -X POST -d '{"date": "2015.12.31-01:01:20"}' http://172.16.156.212/pbxcore/api/system/set_date;
 *
 * Отправка email.
 *   curl -X POST -d '{"email": "apor@miko.ru", "subject":"Привет от mikopbx", "body":"Тестовое сообщение", "encode": ""}' http://172.16.156.223/pbxcore/api/system/send_mail;
 *     'encode' - может быть пустой строкой или 'base64', на случай, если subject и body передаются в base64;
 *
 * Снятие бана IP адреса
 *   curl -X POST -d '{"ip": "172.16.156.1"}' http://172.16.156.212/pbxcore/api/system/unban_ip;
 *   Пример ответа:
 *   {"result":"Success","data":[{"jail":"asterisk","ip":"172.16.156.1","timeofban":1522326119}],"function":"get_ban_ip"}
 *
 * Получение содержимого файла.
 *   curl -X POST -d '{"filename": "/etc/asterisk/asterisk.conf"}' http://172.16.156.212/pbxcore/api/system/file_read_content;
 *   Примеры ответа:
 *   {"result":"ERROR","message":"API action not found;","function":"file_read_content"}
 *   {"result":"Success","data":"W2RpcmVj","function":"file_read_content"}
 *
 * Конвертация аудио файла:
 *   curl -X POST -d '{"filename": "/tmp/WelcomeMaleMusic.mp3"}' http://172.16.156.212/pbxcore/api/system/convert_audio_file;
 *   Пример ответа:
 *   {
 *      "result": "Success",
 *      "filename": "/tmp/WelcomeMaleMusic.wav",
 *      "function": "convert_audio_file"
 *   }
 * Загрузка аудио файла на АТС:
 *   curl  -X POST -d '{"filename": "/storage/usbdisk1/mikopbx/tmp/1577195443/test.mp3"}' http://127.0.0.1/pbxcore/api/system/upload_audio_file -H 'Cookie: XDEBUG_SESSION=PHPSTORM';
 *   curl  -F "file=@/storage/usbdisk1/mikopbx/voicemailarchive/monitor/2019/11/29/10/mikopbx-15750140_201_YNrXH1KHDj.mp3" http://127.0.0.1/pbxcore/api/system/upload_audio_file;
 *   Пример ответа:
 *   {
 *      "result": "Success",
 *      "filename": "/tmp/WelcomeMaleMusic.wav",
 *      "function": "upload_audio_file"
 *   }
 * Удаление аудио файла:

 *   curl -X POST -d '{"filename": "/storage/usbdisk1/mikopbx/tmp/2233333.wav"}' http://172.16.156.212/pbxcore/api/system/remove_audio_file;
 * Обновление системы (офлайн)
 *   curl -X POST -d '{"filename": "/storage/usbdisk1/mikopbx/tmp/2019.4.200-mikopbx-generic-x86-64-linux.img"}' http://127.0.0.1/pbxcore/api/system/upgrade -H 'Cookie: XDEBUG_SESSION=PHPSTORM';
 *   curl -F "file=@1.0.5-9.0-svn-mikopbx-x86-64-cross-linux.img" http://172.16.156.212/pbxcore/api/system/upgrade;
 * Онлайн обновление АТС.
 *   curl -X POST -d '{"md5":"df7622068d0d58700a2a624d991b6c1f", "url": "https://www.askozia.ru/upload/update/firmware/6.2.96-9.0-svn-mikopbx-x86-64-cross-linux.img"}' http://172.16.156.223/pbxcore/api/system/upgrade_online;
 */
$app->post('/api/system/{name}', function ($params) use ($app) {
    $data = [
        'result"' => 'ERROR'
    ];
    if($params === 'upgrade') {
        $dirs     = PBX::get_asterisk_dirs();
        $upd_file = "{$dirs['tmp']}/update.img";
        $res      = false;
        if ($app->request->hasFiles() === 0) {
            // Используем существующий файл;
            $post_data = json_decode($app->request->getRawBody(), true);
            if($post_data && isset($post_data['filename']) && file_exists($post_data['filename'])) {
                $res = Util::mwexec("cp '{$post_data['filename']}' '{$upd_file}'") === 0;
            }
        }else{
            // Загружаем новый файл на сервер
            foreach ($app->request->getUploadedFiles() as $file) {
                $res = $file->moveTo($upd_file);
            }
        }
        // Проверяем существование файла.
        $res = ($res && file_exists($upd_file));
        if ($res !== true) {
            $data['data'] = 'Update file not found.';
            $app->response->setContent(json_encode($data));
            $app->response->send();
            return;
        }
        $data = null;
    }else if($params === 'upload_audio_file') {
        $dirs = PBX::get_asterisk_dirs();
        $filename = '';
        $res = false;
        if ($app->request->hasFiles() === 0) {
            // Используем существующий файл;
            $post_data = json_decode($app->request->getRawBody(), true);
            if($post_data && isset($post_data['filename']) && file_exists($post_data['filename'])) {
                $filename = "{$dirs['media']}/".basename($post_data['filename']);
                $res = Util::mwexec("cp {$post_data['filename']} {$filename}") === 0;
            }
        }else{
            foreach ($app->request->getUploadedFiles() as $file) {
                $filename = $dirs['media'].'/'.basename($file->getName());
                $res = $file->moveTo( $filename);
            }
        }

        $res = ($res && file_exists($filename));
        if ($res !== true) {
            $data['message'] = 'Can not move uploded file.';
            $app->response->setContent(json_encode($data));
            $app->response->send();
            return;
        }

        $data   = ['filename' => $filename];
        $params = 'convert_audio_file';
    }else{
        $row_data = $app->request->getRawBody();
        // Проверим, переданные данные.
        if(!Util::is_json($row_data)){
            $app->response->setStatusCode(200, 'OK')->sendHeaders();
            $app->response->setContent(json_encode($data));
            $app->response->send();
            return;
        }
        $data = json_decode( $row_data, true);
    }

    $request = array(
        'data'      => $data,   // Параметры запроса.
        'action'    => $params  // Операция.
    );

    $client = new Nats\Connection();
    $client->connect(10);
    $cb = function (Nats\Message $message) use ($app) {
        $app->response->setStatusCode(200, "OK")->sendHeaders();
        $app->response->setContent(''.$message->getBody());
        $app->response->send();
    };

    $client->request('system', json_encode($request), $cb);
});

/**
 * GET Резервное копирование.
 *
 * Получить список доступных резервных копий.
 *   curl http://127.0.0.1/pbxcore/api/backup/list;
 * Скачать файл лога.
 *   curl http://172.16.156.212/pbxcore/api/backup/download?id=backup_1530715058
 * Удалить резервную копию
 *   curl http://127.0.0.1/pbxcore/api/backup/remove?id=backup_1564399526
 * Старт резервного копирования по расписанию вручную.
 *   curl http://127.0.0.1/pbxcore/api/backup/start_scheduled
 * Получить пердполагаемый размер резервной копии
 *   curl http://172.16.156.212/pbxcore/api/backup/get_estimated_size
 *
 * Восстановить из резервной копии.
 *  curl http://172.16.156.212/pbxcore/api/backup/recover?id=backup_1531123800
 * Проверить соединение с FTP / SFTP хранилищем.
 *  curl http://172.16.156.212/pbxcore/api/backup/check_storage_ftp?id=1
 */
$app->get('/api/backup/{name}', function ($action)use ($app) {
    $request = array(
        'data'   => $_REQUEST,
        'action' => $action
    );

    $client = new Nats\Connection();
    $client->connect(10);
    $cb = function (Nats\Message $message) use ($action, $app) {
        if($action === 'download'){
            $id = $app->request->get('id');
            $b = new Backup($id);
            $filename = $b->get_result_file();

            Util::sys_log_msg('test', $filename);

            if(!file_exists($filename)){
                $app->response->setStatusCode(404, 'File not found')->sendHeaders();
                $app->response->setContent('File not found '.$id);
                $app->response->send();
                return;
            }

            $extension = Util::get_extension_file($filename);
            if($extension === 'zip'){
                $size = filesize($filename);
                $app->response->setHeader('Content-type',        'application/zip');
                $app->response->setHeader('Content-Description', 'File Transfer');
                $app->response->setHeader('Content-Disposition', "attachment; filename={$id}.{$extension}");

                $app->response->setContentLength($size);
                $app->response->sendHeaders();

                proc_nice(15);
                readfile($filename);
            }else{
                $scheme     = $app->request->getScheme();
                $host       = $app->request->getHttpHost();
                $port       = $app->request->getPort();
                $uid        = Util::generateRandomString(36);
                $path2dirs  = PBX::get_asterisk_dirs();

                $result_dir = "{$path2dirs['download_link']}/{$uid}";
                Util::mwexec("mkdir -p {$result_dir}");
                Util::mwexec("ln -s {$filename} {$result_dir}/{$id}.{$extension}");
                $app->response->redirect("{$scheme}://{$host}:{$port}/download_link/{$uid}/{$id}.{$extension}");
                $app->response->send();
            }
        }else{
            $app->response->setStatusCode(200, 'OK')->sendHeaders();
            $app->response->setContent($message->getBody());
            $app->response->send();
        }
    };
    $client->request('backup', json_encode($request), $cb);
});

/**
 * POST Начать резервное копирование.
 *   curl -X POST -d '{"backup-config":"1","backup-records":"1","backup-cdr":"1","backup-sound-files":"1"}' http://172.16.156.212/pbxcore/api/backup/start;
 * Продолжить выполнение резервного копирования:
 *   curl -X POST -d '{"id":"backup_1531123800"}' http://172.16.156.212/pbxcore/api/backup/start;
 * Приостановить процесс
 *   curl -X POST -d '{"id":"backup_1531123800"}' http://172.16.156.212/pbxcore/api/backup/stop;
 * Загрузка файла на АТС.
 *   curl -F "file=@backup_1531474060.zip" http://172.16.156.212/pbxcore/api/backup/upload;
 * Конвертация старого конфига.
 *
 *
 * Восстановить из резервной копии.
 *  curl -X POST -d '{"id": "backup_1534838222", "options":{"backup-config":"1","backup-records":"1","backup-cdr":"1","backup-sound-files":"1"}}' http://172.16.156.212/pbxcore/api/backup/recover;
 *  curl -X POST -d '{"id": "backup_1534838222", "options":{"backup-sound-files":"1"}}' http://172.16.156.212/pbxcore/api/backup/recover;
 */
$app->post('/api/backup/{name}', function ($params)use ($app){
    if($params === 'upload' ){
        $data = [];
        $data['result'] = 'ERROR';

        foreach ($_FILES as $file) {
            // check the error status
            if ($file['error'] !== 0) {
                Util::sys_log_msg('UploadFile','error '.$file['error'].' in file '.$_POST['resumableFilename']);
                continue;
            }
            $dirs = PBX::get_asterisk_dirs();
            // init the destination file (format <filename.ext>.part<#chunk>
            // the file is stored in a temporary directory
            if(isset($_POST['resumableIdentifier']) && trim($_POST['resumableIdentifier'])!==''){
                $temp_dir = $dirs['tmp'].'/'.$_POST['resumableIdentifier'];
            }else{
                $temp_dir = $dirs['tmp'].'/backup';
            }
            $dest_file = $temp_dir.'/'.$_POST['resumableFilename'].'.part'.$_POST['resumableChunkNumber'];
            // create the temporary directory
            if(!Util::mw_mkdir($temp_dir)){
                Util::sys_log_msg('UploadFile', "Error create dir '$temp_dir'");
            }

            $result = false;
            // move the temporary file
            if (!move_uploaded_file($file['tmp_name'], $dest_file)) {
                Util::sys_log_msg('UploadFile','Error saving (move_uploaded_file) chunk '.$_POST['resumableChunkNumber'].' for file '.$dest_file);
            } else {
                // check if all the parts present, and create the final destination file
                $result = Util::createFileFromChunks($temp_dir, $_POST['resumableFilename'], $_POST['resumableTotalSize'],$_POST['resumableTotalChunks'], '', $_POST['resumableChunkSize']);
            }
            if($result === true){
                $data['result'] = 'Success';
                $backupdir  = Backup::get_backup_dir();
                $dir_name   = Util::trim_extension_file(basename($_POST['resumableFilename']));
                $extension  = Util::get_extension_file(basename($_POST['resumableFilename']));
                $mnt_point  = "{$backupdir}/$dir_name/mnt_point";
                if(!file_exists("{$backupdir}/$dir_name/")){
                    Util::mwexec("mkdir -p '{$backupdir}/{$dir_name}/' '{$mnt_point}'");
                }
                file_put_contents("{$backupdir}/$dir_name/upload_status", 'MERGING');
                $data['data'] = [
                    'backup_id'  => $dir_name,
                    'status_url' => '/pbxcore/api/backup/status_upload?backup_id='.$dir_name,
                    'result'     => 'MERGING'
                ];

                $merge_post_action = ($extension === 'xml')?'convert_config':'upload_backup';
                $merge_settings    = [
                    'data'   => [
                        'result_file'           => "{$backupdir}/$dir_name/resultfile.{$extension}",
                        'mnt_point'             => $mnt_point,
                        'backupdir'             => $backupdir,
                        'dir_name'              => $dir_name,
                        'extension'             => $extension,
                        'temp_dir'              => $temp_dir,
                        'resumableFilename'     => $_POST['resumableFilename'] ?? 'test',
                        'resumableTotalChunks'  => $_POST['resumableTotalChunks'] ?? '1',
                    ],
                    'action' => $merge_post_action
                ];
                $settings_file = "{$backupdir}/$dir_name/merge_settings";
                file_put_contents($settings_file, json_encode($merge_settings, JSON_UNESCAPED_SLASHES|JSON_PRETTY_PRINT));

                // Отправляем задачу на склеивание файла.
                $client = new Nats\Connection();
                $client->connect(10);
                $req_data = [
                    'action' => 'merge_uploaded_file',
                    'data' => [
                        'settings_file' => $settings_file
                    ]
                ];
                $client->request('backup', json_encode($req_data), function (Nats\Message $message){
                });

            }else{
                $data['result'] = 'INPROGRESS';
            }
        }
        $app->response->setStatusCode(200, 'OK')->sendHeaders();
        $app->response->setContent(json_encode($data, JSON_UNESCAPED_SLASHES|JSON_PRETTY_PRINT));
        $app->response->send();
        return;
    }

    $row_data = $app->request->getRawBody();
    // Проверим, переданные данные.
    if(!Util::is_json($row_data)){
        $app->response->setStatusCode(200, 'OK')->sendHeaders();
        $app->response->setContent('{"result":"ERROR"}');
        $app->response->send();
        return;
    }
    $data = json_decode( $row_data, true);
    $request = array(
        'data'      => $data,   // Параметры запроса.
        'action'    => $params  // Операция.
    );

    $client = new Nats\Connection();
    $client->connect(10);
    $cb = static function (Nats\Message $message) use ($app) {
        $app->response->setStatusCode(200, 'OK')->sendHeaders();
        $app->response->setContent(''.$message->getBody());
        $app->response->send();
    };

    $client->request('backup', json_encode($request), $cb);
});

/**
 *   curl -F "file=@ModuleTemplate.zip" http://127.0.0.1/pbxcore/api/upload/module -H 'Cookie: XDEBUG_SESSION=PHPSTORM'
 *   curl -X POST -d '{"id": "1531474060"}' http://127.0.0.1/pbxcore/api/upload/status; -H 'Cookie: XDEBUG_SESSION=PHPSTORM'
 */
$app->post('/api/upload/{name}', function ($params)use ($app){

    $data = [];
    $data['result'] = 'ERROR';
    $data['data']   = '';

    $dirs = PBX::get_asterisk_dirs();
    if ($app->request->hasFiles() > 0){
        $upload_id = time();
        $resumableFilename    = $app->request->getPost('resumableFilename');
        $resumableIdentifier  = $app->request->getPost('resumableIdentifier');
        $resumableChunkNumber = $app->request->getPost('resumableChunkNumber');
        $resumableTotalSize   = $app->request->getPost('resumableTotalSize');
        $resumableChunkSize   = $app->request->getPost('resumableChunkSize');

        foreach ($app->request->getUploadedFiles() as $file) {
            if ( $file->getError() ) {
                $data['data'] = 'error '.$file->getError().' in file '.$resumableFilename;
                Util::sys_log_msg('UploadFile','error '.$file->getError().' in file '.$resumableFilename);
                continue;
            }
            if(isset($resumableIdentifier) && trim($resumableIdentifier)!==''){
                $temp_dir      = $dirs['tmp'].'/'.Util::trim_extension_file(basename($resumableFilename));
                $temp_dst_file = $dirs['tmp'].'/'.$upload_id.'/'.basename($resumableFilename);
                $chunks_dest_file = $temp_dir.'/'.$resumableFilename.'.part'.$resumableChunkNumber;
            }else{
                $temp_dir           = $dirs['tmp'].'/'.$upload_id;
                $temp_dst_file      = $temp_dir.'/'.basename($file->getName());
                $chunks_dest_file   = $temp_dst_file;
            }
            if(!Util::mw_mkdir($temp_dir) || ! Util::mw_mkdir(dirname($temp_dst_file))){
                Util::sys_log_msg('UploadFile', "Error create dir '$temp_dir'");
                $data['data'] .= "Error create dir 'temp_dir'";
                continue;
            }
            if ( !$file->moveTo($chunks_dest_file) ) {
                Util::sys_log_msg('UploadFile','Error saving (move_uploaded_file) for '.$chunks_dest_file);
                $data['result'] = 'ERROR';
                $data['d_status_progress'] = '0';
                $data['d_status'] = 'ID_NOT_SET';
            }elseif($resumableFilename) {
                // Передача файлов частями.
                $result = Util::createFileFromChunks($temp_dir, $resumableFilename, $resumableTotalSize, $resumableChunkNumber, '', $resumableChunkSize);
                if($result === true){
                    $data['result'] = 'Success';

                    $merge_settings    = [
                        'data'   => [
                            'result_file'           => $temp_dst_file,
                            'temp_dir'              => $temp_dir,
                            'resumableFilename'     => $resumableFilename,
                            'resumableTotalChunks'  => $resumableChunkNumber,
                        ],
                        'action' => 'merge'
                    ];
                    $settings_file = "{$temp_dir}/merge_settings";
                    file_put_contents($settings_file, json_encode($merge_settings, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT));

                    // Отправляем задачу на склеивание файла.
                    $client = new Nats\Connection();
                    $client->connect(10);
                    $req_data = [
                        'action' => 'merge_uploaded_file',
                        'data' => [
                            'settings_file' => $settings_file
                        ]
                    ];
                    $client->request('system', json_encode($req_data), function (Nats\Message $message){
                    });
                    $data['upload_id'] = $upload_id;
                    $data['filename']  = $temp_dst_file;
                    $data['d_status'] = 'INPROGRESS';
                }
            }else{
                $data['result'] = 'Success';
                // Передача файла целиком.
                $data['upload_id'] = $upload_id;
                $data['filename']  = $temp_dst_file;
                $data['d_status'] = 'DOWNLOAD_COMPLETE';
                file_put_contents($temp_dir.'/progress', '100');
                Util::mwexec_bg('/etc/rc/shell_functions.sh killprocesses '.$temp_dir.' -TERM 0;rm -rf '.$temp_dir, '/dev/null', 30);
            }
        }
    }elseif($params === 'status'){
        $data['result'] = 'Success';
        $post_data = json_decode($app->request->getRawBody(), true);
        if($post_data && isset($post_data['id'])){
            $upload_id      = $post_data['id'];
            $progress_dir   = $dirs['tmp'].'/'.$upload_id;
            $progress_file  = $progress_dir.'/progress';

            if(empty($upload_id)){
                $data['result'] = 'ERROR';
                $data['d_status_progress'] = '0';
                $data['d_status'] = 'ID_NOT_SET';
            }
            elseif(!file_exists($progress_file) && file_exists($progress_dir)){
                $data['d_status_progress'] = '0';
                $data['d_status'] = 'INPROGRESS';
            }elseif( !file_exists($progress_dir) ){
                $data['result'] = 'ERROR';
                $data['d_status_progress'] = '0';
                $data['d_status'] = 'NOT_FOUND';
            }elseif('100' === file_get_contents($progress_file) ){
                $data['d_status_progress'] = '100';
                $data['d_status'] = 'DOWNLOAD_COMPLETE';
            }else{
                $data['d_status_progress'] = file_get_contents($progress_file);
            }
        }
    }

    $app->response->setStatusCode(200, 'OK')->sendHeaders();
    $app->response->setContent(json_encode($data, JSON_UNESCAPED_SLASHES|JSON_PRETTY_PRINT));
    $app->response->send();


});

/**
 * API дополнительных модулей.
 * Проверка работы модуля:
 *   curl http://127.0.0.1/pbxcore/api/modules/ModuleSmartIVR/check
 *   curl http://127.0.0.1/pbxcore/api/modules/ModuleCTIClient/check
 *   curl http://127.0.0.1/pbxcore/api/modules/ModuleTelegramNotify/check
 *   curl http://127.0.0.1/pbxcore/api/modules/ModuleBitrix24Notify/check
 *   curl http://127.0.0.1/pbxcore/api/modules/ModuleBitrix24Integration/check
 *
 * Перезапуск модуля с генерацией конфига:
 *   curl http://127.0.0.1/pbxcore/api/modules/ModuleSmartIVR/reload
 *   curl http://127.0.0.1/pbxcore/api/modules/ModuleCTIClient/reload
 *   curl http://127.0.0.1/pbxcore/api/modules/ModuleBitrix24Integration/reload
 *
 * Деинсталляция модуля:
    curl http://172.16.156.223/pbxcore/api/modules/ModuleSmartIVR/uninstall
    curl http://172.16.156.223/pbxcore/api/modules/ModuleCTIClient/uninstall
 * Статус загрузки модуля на АТС:
    curl http://172.16.156.223/pbxcore/api/modules/ModuleSmartIVR/status/
    curl http://172.16.156.223/pbxcore/api/modules/ModuleCTIClient/status/
 *
 * Выполнение действий без основной авторизации.
 * curl http://172.16.156.223/pbxcore/api/modules/ModuleAutoprovision/custom_action?action=getcfg&mac=00135E874B49&solt=test
 * curl http://172.16.156.223/pbxcore/api/modules/ModuleAutoprovision/custom_action?action=getimg&file=logo-yealink-132x32.dob
 *
 * curl http://84.201.142.45/pbxcore/api/modules/ModuleBitrix24Notify/custom_action?portal=b24-uve4uz.bitrix24.ru
 * curl http://84.201.142.45/pbxcore/api/modules/ModuleBitrix24Notify/custom_action?portal=miko24.ru
 * curl http://84.201.142.45/pbxcore/api/modules/ModuleBitrix24Notify/custom_action
 *
 * curl http://127.0.0.1/pbxcore/api/modules/ModuleWebConsole/show_console
 * curl http://127.0.0.1/pbxcore/api/modules/ModuleWebConsole/show_console
 *
 * @param $name
 * @param $command
 */
$f_modules_name_command = function ($name, $command) use ($app) {

    $_REQUEST['ip_srv'] = $_SERVER['SERVER_ADDR'];
    $input    = file_get_contents( 'php://input' );
    $request = [
        'data'   => $_REQUEST,
        'module' => $name,
        'input'  => $input,     // Параметры запроса.
        'action' => $command,
        'REQUEST_METHOD' => $_SERVER['REQUEST_METHOD']
    ];

    $cb = function (Nats\Message $message) use ($name, $command, $app) {
        $response = json_decode($message->getBody(), true);
        if( isset($response['fpassthru']) ) {
            $fp = fopen($response['filename'], "rb");
            if ($fp) {
                $size = filesize($response['filename']);
                $name = basename($response['filename']);
                $app->response->setHeader('Content-Description', "config file");
                $app->response->setHeader('Content-Disposition', "attachment; filename={$name}");
                $app->response->setHeader('Content-type', "text/plain");
                $app->response->setHeader('Content-Transfer-Encoding', "binary");
                $app->response->setContentLength($size);
                $app->response->sendHeaders();
                fpassthru($fp);
            }
            fclose($fp);
            if (isset($response['need_delete']) && $response['need_delete'] == true) {
                unlink($response['filename']);
            }
        }elseif (isset($response['redirect'])){
            $app->response->redirect($response['redirect'], true, 302);
            $app->response->send();
        }elseif (isset($response['headers']) && isset($response['echo'])){
            foreach ($response['headers'] as $name => $value){
                $app->response->setHeader($name, $value);
            }

            $app->response->setContent($response['echo']);
            $app->response->setStatusCode(200, 'OK')->sendHeaders();
            $app->response->send();
        }elseif (isset($response['echo_file'])){
            $app->response->setStatusCode(200, 'OK')->sendHeaders();
            $app->response->setFileToSend($response['echo_file']);
            $app->response->send();
        }else{
            $app->response->setStatusCode(200, 'OK')->sendHeaders();
            $app->response->setContent($message->getBody());
            $app->response->send();
        }

    };
    $client = new Nats\Connection();
    $client->connect(100);
    $client->request('modules', json_encode($request), $cb);
};
$app->get( '/api/modules/{name}/{command}', $f_modules_name_command);
$app->post('/api/modules/{name}/{command}', $f_modules_name_command);

/**
 * Загрузка модуля по http
    curl -X POST -d '{"uniqid":"ModuleCTIClient", "md5":"fd9fbf38298dea83667a36d1d0464eae", "url": "https://www.askozia.ru/upload/update/modules/ModuleCTIClient/ModuleCTIClientv01.zip"}' http://172.16.156.223/pbxcore/api/modules/upload;
    curl -X POST -d '{"uniqid":"ModuleSmartIVR", "md5":"fc64fd786f4242885ab50ce5f1fb56c5", "url": "https://www.askozia.ru/upload/update/modules/ModuleSmartIVR/ModuleSmartIVRv01.zip"}' http://172.16.156.223/pbxcore/api/modules/upload;
 * Загрузка аудио файла на АТС:
    curl -F "file=@ModuleTemplate.zip" http://127.0.0.1/pbxcore/api/modules/upload;
    curl -X POST -d '{"filename":"/storage/usbdisk1/mikopbx/tmp/ModuleTemplate.zip"}' http://127.0.0.1/pbxcore/api/modules/unpack -H 'Cookie: XDEBUG_SESSION=PHPSTORM';
 */
$app->post('/api/modules/{command}', function ($command) use ($app){
    $result = [
        'result' => 'ERROR',
        'uniqid' => null
    ];
    $data = NULL;
    if ('upload' === $command  && $app->request->hasFiles() === 0){
        if (Util::is_json($app->request->getRawBody() )  ){
            $row_data = $app->request->getRawBody();
            $data     = json_decode( $row_data, true);
        }else{
            $result['data'] = 'Body is not JSON';
        }
    }elseif( in_array($command, ['upload', 'unpack']) ){
        $dirs = PBX::get_asterisk_dirs();
        $module_file = "{$dirs['tmp']}/".time().'.zip';
        if ($app->request->hasFiles() > 0) {
            foreach ($app->request->getUploadedFiles() as $file) {
                $extension = Util::get_extension_file($file->getName());
                if ($extension !== 'zip') {
                    continue;
                }
                $file->moveTo($module_file);
                break;
            }
        }elseif ('unpack' === $command ){
            $post_data = json_decode($app->request->getRawBody(), true);
            if($post_data && isset($post_data['filename']) && file_exists($post_data['filename'])) {
                Util::mwexec("cp '{$post_data['filename']}' '{$module_file}'");
            }
        }
        if (file_exists($module_file)) {
            $cmd = 'f="'.$module_file.'"; p=`7za l $f | grep module.json`;if [ "$?" == "0" ]; then 7za -so e -y -r $f `echo $p |  awk -F" " \'{print $6}\'`; fi';
            Util::mwexec($cmd, $out);
            $settings = json_decode(implode("\n", $out), true);

            $module_uniqid = $settings['module_uniqid'] ?? NULL;
            if(!$module_uniqid){
                $result['data'] = 'The" module_uniqid " in the module file is not described.the json or file does not exist.';
            }
            $data = [
                'md5' => md5_file($module_file),
                'url' => "file://{$module_file}",
                'l_file' => $module_file,
                'uniqid' => $module_uniqid
            ];
        }else{
            $result['data'] = 'Failed to upload file to server';
        }
        $command = 'upload';
    }

    if($data){
        $request  = array(
            'data'      => $data,           // Параметры запроса.
            'module'    => $data['uniqid'], // Параметры запроса.
            'action'    => $command         // Операция.
        );
        $client = new Nats\Connection();
        $client->connect(5);
        $cb = function (Nats\Message $message) use (&$result) {
            $result = json_decode($message->getBody(), true);
        };
        $client->request('modules', json_encode($request), $cb);
        $result['uniqid'] = $data['uniqid'];
    }

    $app->response->setContent(json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    $app->response->send();

});

/**
 * Получить список подключенных дисков к ПК.
 * curl http://172.16.156.212/pbxcore/api/storage/list
 */
$app->get('/api/storage/{name}', function ($name) use ($app) {
    $request = array(
        'data'   => $_REQUEST,
        'action' => $name
    );
    $client = new Nats\Connection();
    $client->connect(10);
    $cb = function (Nats\Message $message) use ($name, $app) {
        $app->response->setStatusCode(200, 'OK')->sendHeaders();
        $app->response->setContent($message->getBody());
        $app->response->send();
    };
    $client->request('storage', json_encode($request), $cb);
});

/**
 * Монтируем диск:
 *   curl -X POST -d '{"dev":"/dev/sdc1","format":"ext2","dir":"/tmp/123"}' http://172.16.156.212/pbxcore/api/storage/mount;
 * Размонтируем диск:
 *   curl -X POST -d '{"dir":"/tmp/123"}' http://172.16.156.212/pbxcore/api/storage/umount;
 * Форматируем диск в ext2. Форматирование осуществляется в фоне.
 *   curl -X POST -d '{"dev":"/dev/sdc"}' http://172.16.156.212/pbxcore/api/storage/mkfs;
 * Получаем статус форматирования диска:
 *   curl -X POST -d '{"dev":"/dev/sdc"}' http://172.16.156.212/pbxcore/api/storage/status_mkfs;
 *   'ended' / 'inprogress'
 */
$app->post('/api/storage/{name}', function ($name)use ($app){
    $row_data = $app->request->getRawBody();
    // Проверим, переданные данные.
    if(!Util::is_json($row_data)){
        $app->response->setStatusCode(200, 'OK')->sendHeaders();
        $app->response->setContent('{"result":"ERROR"}');
        $app->response->send();
        return;
    }
    $data = json_decode( $row_data, true);
    $request = array(
        'data'      => $data, // Параметры запроса.
        'action'    => $name  // Операция.
    );

    $client = new Nats\Connection();
    $client->connect(10);
    $cb = function (Nats\Message $message) use ($app) {
        $app->response->setStatusCode(200, 'OK')->sendHeaders();
        $app->response->setContent(''.$message->getBody());
        $app->response->send();
    };

    $client->request('storage', json_encode($request), $cb);
});

/**
 * Обработка не корректного запроса.
 */
$app->notFound(function () use ($app) {
    sleep(2);
    $app->response->setStatusCode(404, 'Not Found')->sendHeaders();
    $app->response->setContent('This is crazy, but this page was not found!');
    $app->response->send();
});

try{
    $app->handle();
}catch( Nats\Exception $e){
    Util::sys_log_msg('pbx_core_api', $e->getMessage() );
    // Если произошло исключение, то NATS скорее всего не запущен.
    $response = [
        'result'  => 'ERROR',
        'message' => 'NATS not started...'
    ];
    $msg = json_encode($response, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    $app->response->setContent($msg);
    $app->response->send();
}


