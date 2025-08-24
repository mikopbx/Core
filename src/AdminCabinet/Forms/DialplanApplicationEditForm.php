<?php
/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
 */

namespace MikoPBX\AdminCabinet\Forms;

use Phalcon\Forms\Element\Hidden;
use Phalcon\Forms\Element\Text;
use Phalcon\Forms\Element\TextArea;
use Phalcon\Forms\Element\Select;

/**
 * DialplanApplicationEditForm - Form for editing dialplan applications
 * 
 * Integrates with REST API through JavaScript - provides structure only
 */
class DialplanApplicationEditForm extends BaseForm
{
    /**
     * Initialize the form
     * 
     * @param object|null $entity Entity object
     * @param array|null $options Form options
     */
    public function initialize($entity = null, $options = null): void
    {
        parent::initialize($entity, $options);
        
        // CSRF protection is handled automatically by BaseForm
        
        // Hidden fields for REST API integration
        $this->add(new Hidden('id'));
        $this->add(new Hidden('uniqid'));
        
        // Basic form fields
        $this->add(new Text('name', [
            'maxlength' => 50,
            'class' => 'form-control'
        ]));
        
        $this->add(new Text('extension', [
            'maxlength' => 64,
            'class' => 'form-control'
        ]));
        
        $this->add(new Text('hint', [
            'maxlength' => 255,
            'class' => 'form-control'
        ]));
        
        // Application type - hidden field, UI dropdown will be created by JavaScript
        $this->add(new Hidden('type'));
        
        // Application logic - hidden field, ACE editor will populate this
        $this->add(new Hidden('applicationlogic'));
        
        $this->add(new TextArea('description', [
            'maxlength' => 2000,
            'class' => 'form-control'
        ]));
    }
}
