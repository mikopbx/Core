<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */
namespace MikoPBX\AdminCabinet\Forms;

use MikoPBX\Common\Models\Users;
use Phalcon\Forms\Element\Check;
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Password;
use Phalcon\Forms\Element\Select;
use Phalcon\Forms\Element\Text;
use Phalcon\Validation\Validator\Email;
use Phalcon\Validation\Validator\PresenceOf;

class UserEditForm extends FormsBase
{

    public function initialize($entity = null, $options = null)
    {
        // ID
        $this->add(new Hidden('id'));
        // Name
        $name = new Text('name');
        $name->setFilters(['striptags', 'string']);
        $name->addValidators([
            new PresenceOf([
                'message' => $this->translation->_("Name is required"),
            ]),
        ]);
        $this->add($name);

        // Email
        $email = new Text('email');
        $email->setFilters('email');
        $email->addValidators([
            new PresenceOf([
                'message' => $this->translation->_("E-mail is required"),
            ]),
            new Email([
                'message' => $this->translation->_("E-mail is not valid"),
            ]),
        ]);
        $this->add($email);

        // Password
        $password = new Password('newpassword');

        if ($entity == null) {
            $password->addValidators([
                new PresenceOf([
                    'message' => $this->translation->_("Password is required"),
                ]),
            ]);
        }


        $this->add($password);

        // Password
        $passwordConformation = new Password('passwordConformation');
        $this->add($passwordConformation);


        // Role

        $arrTypes = Users::getRoleValues();
        $arrType  = [];
        foreach ($arrTypes as $typename) {
            $arrType[] = [
                $typename => $this->translation->_($typename),
            ];
        }
        $role = new Select('role', $arrType, [
            'using'    => [
                'id',
                'name',
            ],
            'useEmpty' => false,
            'class'    => 'ui dropdown userrole',
        ]);
        $this->add($role);


        // Language

        // $arrLanguages = Users::getLanguages();
        // $arrLang      = [];
        // foreach ($arrLanguages as $langname) {
        //     $arrLang[] = [
        //         $langname => $this->translation->_($langname),
        //     ];
        // }
        // $language = new Select('language', $arrLang, [
        //     'using'    => [
        //         'id',
        //         'name',
        //     ],
        //     'useEmpty' => false,
        //     'class'    => 'ui dropdown userrole',
        // ]);
        // $this->add($language);


        // Active
        $cheskarr = ['value' => null];
        if (isset($entity) && $entity->active == 1) {
            $cheskarr = ['checked' => 'checked'];
        }

        $active = new Check('active', $cheskarr);
        $this->add($active);


    }
}