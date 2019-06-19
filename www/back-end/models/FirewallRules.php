<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 6 2018
 *
 */

namespace Models;
use Phalcon\Mvc\Model\Relation;
class FirewallRules extends ModelsBase
{
    public $id;
    public $protocol;
    public $portfrom;
    public $portto;
    public $networkfilterid;
    public $action;
    public $category;
    public $description;

    public function getSource()
    {
        return 'm_FirewallRules';
    }

    public function initialize()
    {
	    parent::initialize();
        $this->belongsTo(
            'networkfilterid',
            'Models\NetworkFilters',
            'id',
            [
                "alias"=>"NetworkFilters",
                "foreignKey" => [
                    "allowNulls" => false,
                    "action"     => Relation::NO_ACTION
                ]
            ]
        );
    }

    public static function getDefaultRules()
    {
        $defaultRTPFrom =   PbxSettings::getValueByKey('RTPPortFrom');
        $defaultRTPTo   =   PbxSettings::getValueByKey('RTPPortTo');
        $defaultSIP     =   PbxSettings::getValueByKey('SIPPort');
        $defaultAMI     =   PbxSettings::getValueByKey('AMIPort');
        $defaultAJAM    =   PbxSettings::getValueByKey('AJAMPort');
		$defaultAJAMTLS =   PbxSettings::getValueByKey('AJAMPortTLS');
        $defaultWeb     =   PbxSettings::getValueByKey('WEBPort');
        $defaultWebHttps=   PbxSettings::getValueByKey('WEBHTTPSPort');
        $defaultSSH     =   PbxSettings::getValueByKey('SSHPort');
	    $defaultNats    =   PbxSettings::getValueByKey('NatsPort');
	    $defaultNatsWeb =   PbxSettings::getValueByKey('NatsWebPort');
	    $defaultCDRCTI = PbxSettings::getValueByKey( 'CDRCTIPort' );


        $template = array(
            'SIP'=>array(
                'rules'=>array(
                    array('portfrom'=>$defaultSIP,'portto'=>$defaultSIP, 'protocol'=>'udp'),
                    array('portfrom'=>$defaultRTPFrom,'portto'=>$defaultRTPTo, 'protocol'=>'udp'),
                ),
                'action'=>'allow'
            ),
            'WEB'=>array(
                'rules'=>array(
                    array('portfrom'=>$defaultWeb,'portto'=>$defaultWeb, 'protocol'=>'tcp'),
                    array('portfrom'=>$defaultWebHttps,'portto'=>$defaultWebHttps, 'protocol'=>'tcp')
                ),
                'action'=>'allow'
            ),
            'SSH'=>array(
                'rules'=>array(
                    array('portfrom'=>$defaultSSH,'portto'=>$defaultSSH, 'protocol'=>'tcp')
                ),
                'action'=>'allow'
            ),
            'AMI'=>array(
                'rules'=>array(
                    array('portfrom'=>$defaultAMI,'portto'=>$defaultAMI, 'protocol'=>'tcp')
                ),
                'action'=>'allow'
            ),
            'CTI'=>array(
                'rules'=>array(
	                array('portfrom'=>$defaultAJAM,'portto'=>$defaultAJAM, 'protocol'=>'tcp'),
					array('portfrom'=>$defaultAJAMTLS,'portto'=>$defaultAJAMTLS, 'protocol'=>'tcp'),
	                array('portfrom'=>$defaultNats,'portto'=>$defaultNats, 'protocol'=>'tcp'),
	                array(
		                'portfrom' => $defaultNatsWeb,
		                'portto'   => $defaultNatsWeb,
		                'protocol' => 'tcp',
	                ),
	                array(
		                'portfrom' => $defaultCDRCTI,
		                'portto'   => $defaultCDRCTI,
		                'protocol' => 'tcp',
	                ),
                ),
                'action'=>'allow'
            ),
            'ICMP'=>array(
	            'rules'=>array(
		            array('portfrom'=>0,'portto'=>0, 'protocol'=>'icmp')
	            ),
	            'action'=>'allow'
            )
        );
        return $template;
    }

    /**
     * Обновляет порты в записях, эта функция вызывается при записи PBXSettings
     */
    public static function updatePorts(PbxSettings $enity){

        switch ($enity->key){
            case 'RTPPortFrom':
                $defaultSIP = PbxSettings::getValueByKey('SIPPort');
                $rules = FirewallRules::findByCategory('SIP');
                foreach ($rules as $rule){
                    if ($rule->portfrom == $defaultSIP) continue;
                        $rule->portfrom = $enity->value;
                        $rule->update();
                    }
                break;
            case 'RTPPortTo':
                $defaultSIP = PbxSettings::getValueByKey('SIPPort');
                $rules = FirewallRules::findByCategory('SIP');
                foreach ($rules as $rule){
                    if ($rule->portfrom == $defaultSIP) continue;
                    $rule->portto = $enity->value;
                    $rule->update();
                }
                break;
            case 'SIPPort':
                $defaultRTP = PbxSettings::getValueByKey('RTPPortFrom');
                $rules = FirewallRules::findByCategory('SIP');
                foreach ($rules as $rule){
                    if ($rule->portfrom == $defaultRTP) continue;
                    $rule->portfrom = $enity->value;
                    $rule->portto = $enity->value;
                    $rule->update();
                }
                break;
            case 'AMIPort':
                $rules = FirewallRules::findByCategory('AMI');
                foreach ($rules as $rule){
                    $rule->portfrom = $enity->value;
                    $rule->portto = $enity->value;
                    $rule->update();
                }
                break;
            case 'AJAMPort':
                $rules = FirewallRules::findByCategory('AMI');
                foreach ($rules as $rule){
                    $rule->portfrom = $enity->value;
                    $rule->portto = $enity->value;
                    $rule->update();
                }
                break;
            case 'WEBPort':
                $defaultWEBHTTPSPort = PbxSettings::getValueByKey('WEBHTTPSPort');
                $rules = FirewallRules::findByCategory('WEB');
                foreach ($rules as $rule){
                    if ($rule->portfrom == $defaultWEBHTTPSPort) continue;
                    $rule->portfrom = $enity->value;
                    $rule->portto = $enity->value;
                    $rule->update();
                }
                break;
            case 'WEBHTTPSPort':
                $defaultWEBPort = PbxSettings::getValueByKey('WEBPort');
                $rules = FirewallRules::findByCategory('WEB');
                foreach ($rules as $rule){
                    if ($rule->portfrom == $defaultWEBPort) continue;
                    $rule->portfrom = $enity->value;
                    $rule->portto = $enity->value;
                    $rule->update();
                }
                break;
            case 'SSHPort':
                $rules = FirewallRules::findByCategory('SSH');
                foreach ($rules as $rule){
                    $rule->portfrom = $enity->value;
                    $rule->portto = $enity->value;
                    $rule->update();
                }
                break;
        }


    }
}

