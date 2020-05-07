<?php
// /**
//  * Copyright (C) MIKO LLC - All Rights Reserved
//  * Unauthorized copying of this file, via any medium is strictly prohibited
//  * Proprietary and confidential
//  * Written by Nikolay Beketov, 6 2018
//  *
//  */
// namespace MikoPBX\PBXCoreREST\Plugins;
//
// use MikoPBX\Core\System\System;
// use MikoPBX\Core\System\Util;
// use Phalcon\Di;
// use Phalcon\Di\Injectable;
// use Phalcon\Events\Event;
// use Phalcon\Mvc\Micro;
//
// /**
//  * SecurityPlugin
//  *
//  * This is the security plugin which controls that users only have access to the modules they're assigned to
//  */
// class SecurityPlugin extends Injectable
// {
//     public static function beforeExecuteRoute(Event $event, Micro $app){
//         // return true;
//         if($_SERVER['REMOTE_ADDR'] === '127.0.0.1'){
//             return true;
//         }
//         $di = Di::getDefault();
//         $debugMode = $di->getShared('config')->path('adminApplication.debugMode');
//         if($debugMode === true){
//             return true;
//         }
//         System::sessionReadonly();
//         if( isset($_SESSION['auth']) ){
//             return true;
//         }
//         // Исключения дла авторизации.content-disposition
//         $panel_pattern = [
//             '/api/miko_ajam/getvar', // Тут авторизация basic
//             '/api/cdr/records',      // Тут авторизация basic
//             '/api/cdr/playback',     // Защищен fail2ban
//             '/api/cdr/getData',
//         ];
//         // Текущий паттерн.
//         $pattern = $app->getRouter()->getRewriteUri();
//         $res_auth = true;
//         // Проверяем авторизацию.
//         if(preg_match_all('/\/api\/modules\/Module\w*\/customAction\S*/m', $pattern) > 0){
//             // Это сервисы модулей.
//         }elseif(!in_array($pattern, $panel_pattern, true)) {
//             $res_auth = false;
//         }
//         if(FALSE === $res_auth){
//             $app->response->setStatusCode(403, 'Forbidden')->sendHeaders();
//             $app->response->setContent('The user isn\'t authenticated. ');
//             $app->response->send();
//             $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? 'Undefined';
//             Util::sysLogMsg('web_auth', "From: {$_SERVER['REMOTE_ADDR']} UserAgent:{$user_agent} Cause: Wrong password");
//         }
//         return $res_auth;
//     }
// }
