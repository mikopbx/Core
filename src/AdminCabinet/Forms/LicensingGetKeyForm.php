<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2023 Alexey Portnov and Nikolay Beketov
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

namespace MikoPBX\AdminCabinet\Forms;

use MikoPBX\Common\Providers\TranslationProvider;
use Phalcon\Forms\Element\Numeric;
use Phalcon\Forms\Element\Text;

/**
 * Class LicensingGetKeyForm
 *
 * @package MikoPBX\AdminCabinet\Forms
 * @property TranslationProvider translation
 */
class LicensingGetKeyForm extends BaseForm
{
    public function initialize($entity = null, $options = null): void
    {
        parent::initialize($entity, $options);

        // Company name field
        $companyName = new Text('companyname');
        $companyName->setAttributes([
            'placeholder' => $this->translation->_('lic_CompanyNameExample'),
            'class' => 'form-control'
        ]);
        $this->add($companyName);

        // Email field
        $email = new Text('email');
        $email->setAttributes([
            'placeholder' => $this->translation->_('lic_EmailExample'),
            'class' => 'form-control',
            'type' => 'email'
        ]);
        $this->add($email);

        // Contact person field
        $contact = new Text('contact');
        $contact->setAttributes([
            'placeholder' => $this->translation->_('lic_ContactExample'),
            'class' => 'form-control'
        ]);
        $this->add($contact);

        // INN field
        $inn = new Numeric('inn');
        $inn->setAttributes([
            'placeholder' => $this->translation->_('lic_InnExample'),
            'class' => 'form-control',
            'minlength' => '10',
            'maxlength' => '12'
        ]);
        $this->add($inn);

        // Phone field
        $phone = new Text('telefone');
        $phone->setAttributes([
            'placeholder' => $this->translation->_('lic_PhoneExample'),
            'class' => 'form-control'
        ]);
        $this->add($phone);
    }
}
