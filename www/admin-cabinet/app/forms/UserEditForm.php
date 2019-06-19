<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

use Phalcon\Forms\Element\Text;
use Phalcon\Forms\Element\Password;
use Phalcon\Validation\Validator\PresenceOf;
use Phalcon\Validation\Validator\Email;
use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Check;
use Phalcon\Forms\Element\Select;

class UserEditForm extends FormsBase
{

    public function initialize($entity = null, $options = null)
    {
        // ID
        $this->add(new Hidden('id'));
        // Name
        $name = new Text('name');
        $name->setFilters(array('striptags', 'string'));
        $name->addValidators(array(
            new PresenceOf(array(
                'message' => $this->translation->_("Name is required")
            ))
        ));
        $this->add($name);

        // Email
        $email = new Text('email');
        $email->setFilters('email');
        $email->addValidators(array(
            new PresenceOf(array(
                'message' => $this->translation->_("E-mail is required")
            )),
            new Email(array(
                'message' => $this->translation->_("E-mail is not valid")
            ))
        ));
        $this->add($email);

        // Password
        $password = new Password('newpassword');

        if ($entity==null) {
            $password->addValidators(array(
                new PresenceOf(array(
                    'message' => $this->translation->_("Password is required")
                ))
            ));
        }


        $this->add($password);

        // Password
        $passwordConformation = new Password('passwordConformation');
        $this->add($passwordConformation);


        // Role

        $arrTypes=\Models\Users::getRoleValues();
        $arrType=array();
        foreach ($arrTypes as $typename ){
            $arrType[]=array(
                $typename=>$this->translation->_($typename)
            );
        }
        $role = new Select('role',$arrType, array(
            'using' => array(
                'id',
                'name'
            ),
            'useEmpty' => false,
            'class' => 'ui dropdown userrole'
        ));
        $this->add($role);


        // Language

        $arrLanguages=\Models\Users::getLanguages();
        $arrLang=array();
        foreach ($arrLanguages as $langname ){
            $arrLang[]=array(
                $langname=>$this->translation->_($langname)
            );
        }
        $language = new Select('language',$arrLang, array(
            'using' => array(
                'id',
                'name'
            ),
            'useEmpty' => false,
            'class' => 'ui dropdown userrole'
        ));
        $this->add($language);


        // Active
        $cheskarr=array('value'=>null);
        if (isset($entity) && $entity->active==1) $cheskarr=array('checked' => 'checked');

        $active = new Check('active',$cheskarr);
        $this->add($active);


    }
}