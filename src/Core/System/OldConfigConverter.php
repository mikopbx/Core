<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 2 2020
 */

namespace MikoPBX\Core\System;

use MikoPBX\Common\Models\{Extensions, ExternalPhones, NetworkFilters};
use MikoPBX\Core\System\{Config};
use MikoPBX\Core\Backup\WebAPIClient;


/**
 * $cntr = new OldConfigConverter('/root/config.xml');
 * $cntr->parse();
 * $cntr->makeConfig();
 */

require_once '../Utilities/simple_html_dom.php';

class OldConfigConverter
{
    private $res_html;
    private $data;
    private $tmp_data;

    /**
     * OldConfigConverter constructor.
     *
     * @param $filename
     */
    public function __construct($filename)
    {
        $text_xml       = file_get_contents($filename);
        $this->res_html = str_get_html($text_xml);
        $this->data     = [
            'm_Users'                     => [],
            'm_Sip'                       => [],
            'm_Extensions'                => [],
            'm_ExternalPhones'            => [],
            'm_ExtensionForwardingRights' => [],
            'extensions'                  => [],
            'providers_sip'               => [],
            'providers_iax'               => [],
            'asterisk-managers'           => [],
            'net_filters'                 => [],
            'smart_ivr'                   => [],
            'saas_key'                    => '',
            'call-queues'                 => [],
            'ivr-menu'                    => [],
        ];
        $this->tmp_data = [];
    }

    /**
     * Старт конвертации конфигурации.
     *
     * @return array
     */
    public function parse()
    {
        if ($this->res_html) {
            $this->parseSipPhones();
            $this->parseExternalPhone();
            $this->parseManager();
            $this->parseSipProviders();
            $this->parseIaxProviders();
            $this->parseSmartIvr();
            $this->parseSaasKey();
            $this->parseCallFlow();
        }

        return $this->data;
    }

    /**
     * Конвертация настроек sip.conf (пользовательские учетки).
     */
    private function parseSipPhones(): void
    {
        if (is_bool($this->res_html)) {
            return;
        }
        $sip_phone_nodes = $this->res_html->find('sip phone');
        if (is_bool($sip_phone_nodes)) {
            return;
        }
        foreach ($sip_phone_nodes as $e) {
            $this->initData($e->children);
            $uid = $this->get('uniqid');
            if ($uid === null) {
                $uid = strtoupper('SIP-PHONE-' . md5(time()));
            }

            $this->data['m_ExtensionForwardingRights'][] = [
                'extension'                  => $this->get('extension'),
                'ringlength'                 => $this->get('ringlength'),
                'forwarding'                 => null,
                'forwardingonbusy'           => null,
                'forwardingonunavailable'    => null,
                'id_forwarding'              => $this->get('forwarding_external'),
                'id_forwardingonbusy'        => $this->get('forwarding_on_busy_external'),
                'id_forwardingonunavailable' => $this->get('forwarding_on_unavailable_external'),
            ];

            $this->data['m_Users'][]      = [
                'id'       => $this->get('extension'),
                'email'    => $this->get('emailcallrecordaddress'),
                'username' => $this->get('callerid'),
                'role'     => 'user',
                'language' => $this->get('language'),
            ];
            $this->data['m_Sip'][]        = [
                'disabled'    => false,
                'extension'   => $this->get('extension'),
                'type'        => 'peer',
                'host'        => null,
                'port'        => null,
                'username'    => null,
                'secret'      => $this->get('secret'),
                'defaultuser' => null,
                'fromuser'    => null,
                'fromdomain'  => null,
                'uniqid'      => $uid,
                'nat'         => 'force_rport,comedia',
                'dtmfmode'    => $this->get('dtmfmode'),

            ];
            $this->data['m_Extensions'][] = [
                'number'                 => $this->get('extension'),
                'type'                   => 'SIP',
                'callerid'               => $this->get('callerid'),
                'userid'                 => $this->get('extension'),
                'is_general_user_number' => 1,
            ];

            $rules         = 'rule_SIP,local_network';
            $networkfilter = $this->addNetFilter($this->get('permitip'), $this->get('permitnetmask'), $rules);

            $secret = substr($this->get('secret'), 0, stripos($this->get('secret'), '</secret>'));
            $secret = (trim($secret) === '') ? $this->get('secret') : $secret;

            $language_code = $this->get('language');
            if ($language_code !== 'ru-ru' && $language_code !== 'en-en') {
                $language = 'en-en';
            } else {
                $language = $this->get('language');
            }
            /** @var \MikoPBX\Common\Models\Extensions $exten_db */
            $exten_db = Extensions::findFirst("number='{$this->get('extension')}'");
            $id       = ($exten_db === null) ? null : $exten_db->id;
            $user_id  = ($exten_db === null) ? null : $exten_db->userid;

            $exten_num                            = $this->get('extension');
            $this->data['extensions'][$exten_num] = [
                'id'                          => $id,
                'user_id'                     => $user_id,
                'fwd_ringlength'              => $this->get('ringlength'),
                'user_username'               => $this->get('callerid'),
                'number'                      => $exten_num,
                'user_email'                  => $this->get('emailcallrecordaddress'),
                'user_language'               => $language,
                'sip_secret'                  => $secret,
                'sip_uniqid'                  => $uid,
                'sip_dtmfmode'                => $this->get('dtmfmode'),
                'sip_type'                    => 'peer',
                'is_general_user_number'      => 1,
                'sip_busylevel'               => 1,
                'sip_disabled'                => 0,
                'user_role'                   => 'user',
                'user_avatar'                 => '',
                'sip_networkfilterid'         => 'none',
                'file-select'                 => '',
                'nat'                         => 'force_rport,comedia',
                'qualify'                     => 'on',
                'qualifyfreq'                 => '60',
                'codec_alaw'                  => 'on',
                'codec_ulaw'                  => 'on',
                'codec_g726'                  => 'false',
                'codec_gsm'                   => 'false',
                'codec_adpcm'                 => 'false',
                'codec_g722'                  => 'false',
                'codec_h263'                  => 'false',
                'codec_h264'                  => 'false',
                'sip_manualattributes'        => '',
                'mobile_number'               => '',
                'mobile_dialstring'           => '',
                'mobile_uniqid'               => null,
                'fwd_forwarding'              => '',
                'fwd_forwardingonbusy'        => '',
                'fwd_forwardingonunavailable' => '',
                'tmp_pbx_networkfilter'       => $networkfilter,
            ];
        }
    }

    /**
     * Инициализация данных текущего узла.
     *
     * @param $children
     */
    private function initData($children): void
    {
        $this->tmp_data = [];
        foreach ($children as $child) {
            if (count($child->nodes) > 0) {
                if ('read-permission' == $child->tag) {
                    $this->tmp_data[$child->tag][] = $child->nodes[0]->__toString();
                } elseif ('write-permission' == $child->tag) {
                    $this->tmp_data[$child->tag][] = $child->nodes[0]->__toString();
                } else {
                    $this->tmp_data[$child->tag] = $child->nodes[0]->__toString();
                }
            }
        }
    }

    /**
     * Получить значение свойства узла.
     *
     * @param $name
     *
     * @return mixed|null
     */
    private function get($name)
    {
        return $this->tmp_data[$name] ?? null;
    }

    /**
     * Добавляем в массив новый сетевой фильтр.
     *
     * @param        $permitip
     * @param        $permitnetmask
     * @param string $rules
     *
     * @return string
     */
    private function addNetFilter($permitip, $permitnetmask, $rules = ''): string
    {
        $networkfilter = '';
        if (Verify::isIpAddress($permitip) && Verify::isIpAddress($permitnetmask)) {
            $net           = new Network();
            $subnet        = $net->netMaskToCidr($permitnetmask);
            $networkfilter = "{$permitip}/{$subnet}";

            if (isset($this->data['net_filters'][$networkfilter])) {
                $filter = &$this->data['net_filters'][$networkfilter];
            } else {
                $filter = [
                    'id'             => null,
                    'description'    => 'network from old config',
                    'network'        => $permitip,
                    'subnet'         => $subnet,
                    'rule_SIP'       => 'false',
                    'rule_WEB'       => 'false',
                    'rule_AMI'       => 'false',
                    'rule_CTI'       => 'false',
                    'rule_ICMP'      => 'false',
                    'local_network'  => 'false',
                    'newer_block_ip' => 'false',
                ];
            }

            $arr_rules = explode(',', $rules);
            foreach ($arr_rules as $rule_name) {
                $filter[$rule_name] = 'on';
            }
            if ($subnet == 32) {
                $filter['local_network'] = 'false';
            }
            $this->data['net_filters'][$networkfilter] = $filter;
        }

        return $networkfilter;
    }

    /**
     * Конвертация настроек внешних телефонов.
     */
    private function parseExternalPhone(): void
    {
        foreach ($this->res_html->find('external phone') as $e) {
            $this->initData($e->children);

            $userid                      = null;
            $user_num                    = null;
            $fwd_forwarding              = null;
            $fwd_forwardingonbusy        = null;
            $fwd_forwardingonunavailable = null;
            foreach ($this->data['m_ExtensionForwardingRights'] as &$forwarding) {
                if ($forwarding['id_forwarding'] == $this->get('uniqid')) {
                    $userid                   = $forwarding['id_forwarding'];
                    $user_num                 = $forwarding['extension'];
                    $forwarding['forwarding'] = $this->get('extension');
                    $fwd_forwarding           = $this->get('extension');
                    if ($forwarding['id_forwardingonbusy'] == $this->get('uniqid')) {
                        $forwarding['forwardingonbusy'] = $this->get('extension');
                        $fwd_forwardingonbusy           = $this->get('extension');
                    }
                    if ($forwarding['id_forwardingonunavailable'] == $this->get('uniqid')) {
                        $forwarding['forwardingonunavailable'] = $this->get('extension');
                        $fwd_forwardingonunavailable           = $this->get('extension');
                    }
                    break;
                }
            }
            if ($userid == null) {
                continue;
            }

            $exten_db      = ExternalPhones::findFirst("extension='{$this->get('extension')}'");
            $mobile_uniqid = ($exten_db === null) ? $this->get('uniqid') : $exten_db->uniqid;

            $extension                                = &$this->data['extensions'][$user_num];
            $extension['mobile_number']               = $this->get('extension');
            $extension['mobile_dialstring']           = $this->get('extension');
            $extension['mobile_uniqid']               = $mobile_uniqid;
            $extension['fwd_forwarding']              = $fwd_forwarding;
            $extension['fwd_forwardingonbusy']        = $fwd_forwardingonbusy;
            $extension['fwd_forwardingonunavailable'] = $fwd_forwardingonunavailable;

            $this->data['m_Extensions'][] = [
                'number'                 => $this->get('extension'),
                'type'                   => 'EXTERNAL',
                'callerid'               => $this->get('callerid'),
                'userid'                 => $userid,
                'is_general_user_number' => 1,
            ];

            $this->data['m_ExternalPhones'][] = [
                'extension'  => $this->get('extension'),
                'dialstring' => $this->get('extension'),
                'uniqid'     => $mobile_uniqid,
                'disabled'   => 0,
            ];
        }
    }

    /**
     * Конвертация настроек manager.conf.
     */
    private function parseManager(): void
    {
        foreach ($this->res_html->find('services manager manager-user') as $e) {
            $this->initData($e->children);
            if ($this->get('username') != null) {
                $rules         = 'rule_AMI';
                $networkfilter = $this->addNetFilter($this->get('permitip'), $this->get('permitnetmask'), $rules);

                $manager = [
                    'id'              => null,
                    'username'        => $this->get('username'),
                    'secret'          => $this->get('secret'),
                    'networkfilterid' => 'none',
                    'description'     => 'from old congig Askozia',
                ];
                $keys    = [
                    'call',
                    'cdr',
                    'originate',
                    'reporting',
                    'agent',
                    'config',
                    'dialplan',
                    'dtmf',
                    'log',
                    'system',
                    'verbose',
                    'user',
                ];

                foreach ($keys as $key) {
                    $manager["{$key}_main"]  = 'false';
                    $manager["{$key}_read"]  = 'false';
                    $manager["{$key}_write"] = 'false';
                }

                $read_permission = ($this->get('read-permission') == null) ? [] : $this->get('read-permission');
                foreach ($read_permission as $key) {
                    $manager["{$key}_read"] = 'on';
                }
                $read_permission = ($this->get('write-permission') == null) ? [] : $this->get('read-permission');
                foreach ($read_permission as $key) {
                    $manager["{$key}_write"] = 'on';
                }
                foreach ($keys as $key) {
                    if ($manager["{$key}_read"] == 'on' && $manager["{$key}_write"] == 'on') {
                        $manager["{$key}_main"] = 'on';
                    }
                }

                $this->data['asterisk-managers'][] = $manager;
            }
        }
    }

    /**
     * Конвертация настроек sip.conf (учетки провайдеров).
     */
    private function parseSipProviders(): void
    {
        foreach ($this->res_html->find('sip provider') as $e) {
            $this->initData($e->children);
            if ($this->get('uniqid') == null) {
                continue;
            }
            $this->data['providers_sip'][] = [
                'id'                         => null,
                'uniqid'                     => $this->get('uniqid'),
                'secret'                     => $this->get('secret'),
                'dtmfmode'                   => $this->get('dtmfmode'),
                'type'                       => 'friend',
                'port'                       => $this->get('port'),
                'username'                   => $this->get('username'),
                'host'                       => $this->get('host'),
                'description'                => $this->get('name'),
                'providerType'               => 'SIP',
                'receive_calls_without_auth' => 0,
                'disabled'                   => 1,
                'networkfilterid'            => 'none',
                'file-select'                => '',
                'nat'                        => 'force_rport,comedia',
                'qualify'                    => 'on',
                'qualifyfreq'                => '60',
                'codec_alaw'                 => 'on',
                'codec_ulaw'                 => 'on',
                'codec_g726'                 => 'false',
                'codec_gsm'                  => 'false',
                'codec_adpcm'                => 'false',
                'codec_g722'                 => 'false',
                'codec_h263'                 => 'false',
                'codec_h264'                 => 'false',
                'disablefromuser'            => ($this->get('disablefromuser') == 'yes') ? 1 : 0,
                'fromdomain'                 => $this->get('fromdomain'),
                'defaultuser'                => $this->get('authuser'),
                'fromuser'                   => $this->get('fromuser'),
                'manualattributes'           => base64_decode($this->get('manualattributes')),
                'noregister'                 => ($this->get('noregister') == 'yes') ? 1 : 0,
            ];
        }
    }

    /**
     * Конвертация настроек sip.conf (учетки провайдеров).
     */
    private function parseIaxProviders(): void
    {
        foreach ($this->res_html->find('iax provider') as $e) {
            $this->initData($e->children);
            if ($this->get('uniqid') == null) {
                continue;
            }

            $this->data['providers_iax'][] = [
                'id'               => null,
                'uniqid'           => $this->get('uniqid'),
                'secret'           => $this->get('secret'),
                'type'             => null,
                'username'         => $this->get('username'),
                'host'             => $this->get('host'),
                'description'      => $this->get('name'),
                'providerType'     => 'IAX',
                'disabled'         => 1,
                'networkfilterid'  => 'none',
                'qualify'          => 'on',
                'codec_alaw'       => 'on',
                'codec_ulaw'       => 'on',
                'codec_g726'       => 'false',
                'codec_gsm'        => 'false',
                'codec_adpcm'      => 'false',
                'codec_g722'       => 'false',
                'codec_h263'       => 'false',
                'codec_h264'       => 'false',
                'manualattributes' => base64_decode($this->get('manualattributes')),
                'noregister'       => ($this->get('noregister') == 'yes') ? 'on' : 'false',
            ];
        }
    }

    /**
     * Получаем настройки SMART IVR.
     */
    private function parseSmartIvr(): void
    {
        foreach ($this->res_html->find('miko_1c smartivr') as $e) {
            $this->initData($e->children);
            $exten = '000063';
            foreach ($this->data['extensions'] as $key => $value) {
                $exten = $key;
                break;
            }

            $this->data['smart_ivr'] = [
                'server1chost'      => $this->get('server'),
                'server1cport'      => $this->get('port'),
                'database'          => $this->get('db_name'),
                'login'             => $this->get('user_1c'),
                'secret'            => $this->get('pass'),
                'failoverextension' => "$exten",
            ];

            break;
        }
    }

    /**
     * Получаем ключ лицензии.
     */
    private function parseSaasKey(): void
    {
        foreach ($this->res_html->find('saaskey') as $e) {
            $this->data['saas_key'] = $e->text();
        }
    }

    /**
     * Разбор маршрутов вызовов.
     */
    private function parseCallFlow(): void
    {
        foreach ($this->res_html->find('cfe callflow') as $e) {
            $this->initData($e->children);
            if ($this->get('data') == null) {
                continue;
            }
            $data = json_decode(base64_decode($this->get('data')), true);
            $this->parseQueues($data);
            $this->parseIvr($data);
        }
    }

    /**
     * Конвертация очередей.
     *
     * @param $data
     */
    private function parseQueues($data): void
    {
        $queues      = [];
        $tmp_queues  = [];
        $tmp_members = [];
        foreach ($data['containers'] as $key => $value) {
            if ('Queue' == $value['title']) {
                $tmp_queues[$key] = $value;
            } elseif ('QueueMember' == $value['title']) {
                $tmp_members[$key] = $value;
            }
        }

        foreach ($data['wires'] as $value) {
            $src = $value['src']['moduleId'];
            $tgt = $value['tgt']['moduleId'];

            if ( ! isset($tmp_queues[$src]) || ! isset($tmp_members[$tgt])) {
                continue;
            }
            if ( ! isset($queues[$src]['description'])) {
                $queues[$src]['members']                      = [];
                $queues[$src]['name']                         = $this->get('name');
                $queues[$src]['recive_calls_while_on_a_call'] = ($tmp_queues[$src]["dataContainer"]["checkbox3"] == "y") ? 'false' : 'on';
                $queues[$src]['strategy']                     = $tmp_queues[$src]["dataContainer"]["list2"];
                $queues[$src]['caller_hear']                  = "moh";
                $queues[$src]['description']                  = "from old config Askozia";
                $queues[$src]['announce_hold_time']           = ($tmp_queues[$src]["dataContainer"]["checkbox6"] == "y") ? 'on' : 'false';
                $queues[$src]['announce_position']            = ($tmp_queues[$src]["dataContainer"]["checkbox7"] == "y") ? 'on' : 'false';

                $queues[$src]['periodic_announce_frequency']      = ($tmp_queues[$src]["dataContainer"]["number5"] == "0") ? '30' : $tmp_queues[$src]["dataContainer"]["number5"];
                $queues[$src]['periodic_announce_sound_id']       = '';
                $queues[$src]['timeout_to_redirect_to_extension'] = '';
                $queues[$src]['timeout_extension']                = '';
                $queues[$src]['redirect_to_extension_if_empty']   = '';
                $queues[$src]['id']                               = null;
                $queues[$src]['seconds_for_wrapup']               = $tmp_queues[$src]["dataContainer"]["number3"];
                $queues[$src]['seconds_to_ring_each_member']      = $tmp_queues[$src]["dataContainer"]["number4"];
            }

            $id_user = $tmp_members[$tgt]['dataContainer']['list1'];
            foreach ($this->data['extensions'] as $exten) {
                if ($exten['sip_uniqid'] == $id_user) {
                    $queues[$src]['members'][] = [
                        'number'   => $exten['number'],
                        'priority' => count($queues[$src]['members']),
                    ];
                    break;
                }
            }

            foreach ($this->data['m_ExternalPhones'] as $exten) {
                if ($exten['uniqid'] == $id_user) {
                    $queues[$src]['members'][] = [
                        'number'   => $exten['extension'],
                        'priority' => count($queues[$src]['members']),
                    ];
                    break;
                }
            }
        }

        foreach ($queues as $key => $q) {
            $q['members'] = json_encode($q['members'], JSON_UNESCAPED_SLASHES);
            if (count($queues) == 1) {
                $q['extension'] = $this->get('number');
            } else {
                $q['extension'] = '100' . $key . '0' . $this->get('number');
            }
            $q['uniqid']                 = "QUEUE-" . md5($q['extension']);
            $this->data['call-queues'][] = $q;
        }
    }

    private function parseIvr($data): void
    {
        $tmp_ivrs    = [];
        $tmp_modules = [];

        /*
         /admin-cabinet/ivr-menu/save
         */
        foreach ($data['containers'] as $key => $value) {
            if ('Background' == $value['title']) {
                $tmp_ivrs[$key] = $value;
            } else {
                $tmp_modules[$key] = $value;
            }
        }

        $arr_digits = [
            'Press1' => '1',
            'Press2' => '2',
            'Press3' => '3',
            'Press4' => '4',
            'Press5' => '5',
            'Press6' => '6',
            'Press7' => '7',
            'Press8' => '8',
            'Press9' => '9',
        ];
        foreach ($tmp_ivrs as $key => $ivr) {
            $m_ivr = [
                'id'                                 => null,
                'name'                               => $this->get('name'), // TODO,
                'extension'                          => '' . $this->get('number') . $key, // TODO,
                'description'                        => 'IVR from OLD config ' . $this->get('number'), // TODO,
                'actions'                            => [],
                'timeout_extension'                  => '',
                'uniqid'                             => 'IVR-' . md5($key . time()),
                'allow_enter_any_internal_extension' => 'false',
                'audio_message_id'                   => '0',
            ];
            // $key - это id модуля IVR.
            foreach ($data['wires'] as $value) {
                unset($digits);
                unset($timeout_extension);
                // Найдем связи модуля IVR.
                if ($value['src']['moduleId'] != $key) {
                    continue;
                }
                // $tgt - id модуля назначения.
                $tgt = $value['tgt']['moduleId'];
                if ( ! isset($tmp_modules[$tgt])) {
                    continue;
                }
                $m = $tmp_modules[$tgt];
                if (isset($arr_digits[$m['title']])) {
                    $digits = $arr_digits[$m['title']];
                } elseif ($m['title'] == 'ExtensionT') {
                    $timeout_extension = 't';
                } else {
                    continue;
                }
                $exten = '';
                $id    = $tgt;
                $ch    = 0;
                while ($ch < 20) {
                    if ($exten != '') {
                        break;
                    }
                    $ch++;
                    foreach ($data['wires'] as $wires) {
                        if ($exten != '') {
                            break;
                        }
                        if ($wires['src']['moduleId'] != $id) {
                            continue;
                        }
                        $tgt_m = $wires['tgt']['moduleId'];
                        if ( ! isset($tmp_modules[$tgt_m])) {
                            continue;
                        }
                        $res_m = $tmp_modules[$tgt_m];
                        if ('Phone' == $res_m['title']) {
                            $phone_id = $res_m['dataContainer']['list1'];
                            foreach ($this->data['extensions'] as $extension_m) {
                                if ($extension_m['sip_uniqid'] == $phone_id) {
                                    $exten = $extension_m['number'];
                                    break;
                                }
                            }
                        } elseif ('DialNumber' == $res_m['title']) {
                            foreach ($this->data['extensions'] as $extension_m) {
                                if ($extension_m['number'] == $res_m['dataContainer']['number1']) {
                                    $exten = $extension_m['number'];
                                    break;
                                }
                            }
                            foreach ($this->data['call-queues'] as $extension_m) {
                                if ($extension_m['name'] == $res_m['dataContainer']['number1']) {
                                    $exten = $extension_m['extension'];
                                    break;
                                }
                            }
                        } else {
                            $id = $tgt_m;
                        }
                    }
                }

                if ( ! empty($digits) && ! empty($exten)) {
                    $m_ivr['actions'][] = [
                        'digits'    => $digits,
                        'extension' => $exten,
                    ];
                } elseif ( ! empty($exten) && ! empty($timeout_extension)) {
                    $m_ivr['timeout_extension'] = $exten;
                }
            }
            $m_ivr['actions']         = json_encode($m_ivr['actions'], JSON_UNESCAPED_SLASHES);
            $this->data['ivr-menu'][] = $m_ivr;
        } // foreach ($tmp_ivrs as $key => $ivr)

    }

    /**
     * Создает конфигурацию в новом формате.
     */
    public function makeConfig(): ?bool
    {
        $w_api = new WebAPIClient();
        $res   = $w_api->login();
        if ( ! $res) {
            return false;
        }

        foreach ($this->data['net_filters'] as $key => $value) {
            $filter = NetworkFilters::findFirst("permit='{$key}'");
            if ($filter === null) {
                $w_api->addNetFilter($value);
            }
        }

        foreach ($this->data['extensions'] as $key => $value) {
            if ( ! empty($value['tmp_pbx_networkfilter'])) {
                $filter = NetworkFilters::findFirst("permit='{$value['tmp_pbx_networkfilter']}'");
                if ($filter !== null) {
                    $value['sip_networkfilterid'] = $filter->id;
                }
            }
            $w_api->addExtension($value);
        }
        foreach ($this->data['asterisk-managers'] as $key => $value) {
            $w_api->addManager($value);
        }
        foreach ($this->data['providers_sip'] as $key => $value) {
            $w_api->addProviderSip($value);
        }

        foreach ($this->data['providers_iax'] as $key => $value) {
            $w_api->addProviderIax($value);
        }

        if (count($this->data['smart_ivr']) > 0) {
            $w_api->addSmartIvr($this->data['smart_ivr']);
        }

        if ($this->data['saas_key'] != '') {
            $config = new MikoPBXConfig();
            $config->setGeneralSettings('PBXLicense', $this->data['saas_key']);
        }

        foreach ($this->data['call-queues'] as $key => $value) {
            $w_api->addQueue($value);
        }
        foreach ($this->data['ivr-menu'] as $key => $value) {
            $w_api->addIvrMenu($value);
        }
    }

}