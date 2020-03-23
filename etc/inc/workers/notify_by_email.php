<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

require_once 'globals.php';

/**
 * Обработчик пинга.
 * @param BeanstalkClient $message
 */
$ping_worker = function ($message) {
    $message->reply(json_encode($message->getBody().':pong'));
};

$notify_by_email = function ($message){
    $config = new \Config();
    $settings = $config->get_general_settings();

    /** @var BeanstalkClient $message */
    $data = json_decode($message->getBody(), true);
    if( isset($data['NOANSWER']) ){
        // Вызов клиента отвечен одним из сотрудников. Но не все участники подняли трубку.
        return;
    }
    $template_body   = $settings['MailTplMissedCallBody'];
    $template_Footer = $settings['MailTplMissedCallFooter'];
    $emails = [];
    foreach ($data as $call){
        /**
        'language'
        'is_internal'
         */
        if(!isset($emails[$call['email']])){
            $emails[$call['email']] = '';
        }

        if(empty($template_body)){
            $email = Util::translate("You have missing call");
        }else{
            $email = str_replace("\n", "<br>", $template_body);
            $email = str_replace("NOTIFICATION_MISSEDCAUSE",'NOANSWER', $email);
            $email = str_replace("NOTIFICATION_CALLERID",   $call['from_number'], $email);
            $email = str_replace("NOTIFICATION_TO",         $call['to_number'],   $email);
            $email = str_replace("NOTIFICATION_DURATION",   $call['duration'],    $email);
            $email = str_replace("NOTIFICATION_DATE",       $call['start'],       $email);
        }
        $emails[$call['email']] .=  "$email <br> <hr> <br>";
    }

    if(isset($settings['MailSMTPSenderAddress']) && trim($settings['MailSMTPSenderAddress'])!=''){
        $from_address = $settings['MailSMTPSenderAddress'];
    }else{
        $from_address = $settings['MailSMTPUsername'];
    }

    foreach ($emails as $to => $text){
        $subject = str_replace("MailSMTPSenderAddress", $from_address, $settings['MailTplMissedCallSubject']);
        if(empty($subject)){
            $subject = Util::translate("You have missing call");
        }

        $body = "{$text}<br>{$template_Footer}";
        \Notifications::send_mail($to, "$subject", $body);
    }
    sleep(1);
};

/**
 * Основной цикл демона.
 */
while (true) {
    try{
        $client  = new BeanstalkClient('notify_by_email');
        $client->subscribe('notify_by_email',           $notify_by_email );
        $client->subscribe('ping_notify_by_email',      $ping_worker);

        $client->wait();
    }catch (Exception $e){
        sleep(1);
    }
}