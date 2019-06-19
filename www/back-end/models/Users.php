<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace Models;

use Phalcon\Mvc\Model\Relation;

class Users extends ModelsBase
{
    public $id;
    public $email;
    public $username;
    public $password;
    public $role;
    public $language;
    public $voicemailpincode;
    public $ldapauth;
    public $avatar;

    public function getSource()
    {
        return 'm_Users';
    }

    static function getRoleValues(){
        return array('Admins','Users');
    }

    static function getLanguages(){
        return array('ru','en','de');
    }


    public function initialize()
    {
	    parent::initialize();
        $this->hasMany(
            'id',
            'Models\Extensions',
            'userid',
            [
                "alias"=>"Extensions",
                "foreignKey" => [
                    "allowNulls" => false,
                    "action"     => Relation::ACTION_CASCADE
                ]
            ]
        );
	    // $this->hasMany(
	    //     'id',
	    //     'Models\ModuleAutoProvisioning',
	    //     'userid',
	    //     [
	    //         "alias"=>"ModuleAutoProvisioning",
	    //         "foreignKey" => [
	    //             "allowNulls" => false,
	    //             "action"     => Relation::ACTION_CASCADE
	    //         ]
	    //     ]
	    // );
    }


}
