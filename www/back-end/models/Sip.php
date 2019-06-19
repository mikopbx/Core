<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace Models;

use Phalcon\Validation\Validator\Uniqueness as UniquenessValidator;

use Phalcon\Mvc\Model\Relation;

class Sip extends ModelsBase
{

    public $id;
    public $uniqid;
    public $disabled;
    public $extension;
    public $type;
    public $host;
    public $port;
    public $username;
    public $secret;
    public $defaultuser;
    public $fromuser;
    public $fromdomain;
    public $nat;
    public $dtmfmode;
    public $qualifyfreq;
    public $qualify;
    public $busylevel;
    public $networkfilterid;
    public $manualattributes;
    public $manualregister;
    public $disablefromuser;
    public $noregister;
	public $receive_calls_without_auth;
    public $description;

    public function getSource()
    {
        return 'm_Sip';
    }

    public function initialize()
    {
	    parent::initialize();
        $this->belongsTo(
            'extension',
            'Models\Extensions',
            'number',
            [
                "alias"=>"Extensions",
                "foreignKey" => [
                    "allowNulls" => true,
                    "action"     => Relation::NO_ACTION //Всегда сначала удаляем Extensions, а он удалит SIP
                ]
            ]
        );

        $this->belongsTo(
            'networkfilterid',
            'Models\NetworkFilters',
            'id',
            [
                "alias"=>"NetworkFilters",
                "foreignKey" => [
                    "allowNulls" => true,
                    "action"     => Relation::NO_ACTION
                ]
            ]
        );
        $this->hasMany(
            'uniqid',
            'Models\SipCodecs',
            'sipuid',
            [
                "alias"=>"Codecs",
                "foreignKey" => [
                    "allowNulls" => true,
                    "message"    => 'Models\Codecs',
                    "action"     => Relation::ACTION_CASCADE
                ],
                'params' => array(
                    'order' => 'priority asc'
                )
            ]
        );

        $this->belongsTo(
            'uniqid',
            'Models\Providers',
            'sipuid',
            [
                "alias"=>"Providers",
                "foreignKey" => [
                    "allowNulls" => true,
                    "action"     => Relation::ACTION_CASCADE
                ]
            ]
        );
    }

	public function setManualAttributes($text) {
		$this->manualattributes = base64_encode($text);
	}
	public function getManualAttributes() {
		return base64_decode($this->manualattributes);
	}

    public function validation()
    {
        $validation = new \Phalcon\Validation();
        $validation->add('uniqid', new UniquenessValidator([
            'message' => $this->t("mo_ThisUniqidMustBeUniqueForSIPModels")
        ]));
        return $this->validate($validation);
    }

}