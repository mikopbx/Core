<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace MikoPBX\Common\Models;

use Phalcon\Validation;
use Phalcon\Validation\Validator\Uniqueness as UniquenessValidator;

/**
 * Class CustomFiles
 *
 * @package MikoPBX\Common\Models
 */
class CustomFiles extends ModelsBase
{
    /**
     * @Primary
     * @Identity
     * @Column(type="integer", nullable=false)
     */
    public $id;

    /**
     * @Column(type="string", nullable=true)
     */
    public $filepath;

    /**
     * @Column(type="string", nullable=true)
     */
    public $content;

    /**
     * Режим подмены файла
     * append - добавить в конец файла
     * override - переопределить
     * none - ничего не делать
     *
     * @Column(type="string", nullable=true, default="none") {'append'|'override'|'none'}
     */
    public $mode;

    /**
     * @Column(type="integer", nullable=true)
     */
    public $changed;

    /**
     * @Column(type="string", nullable=true)
     */
    public $description;

    public function initialize(): void
    {
        $this->setSource('m_CustomFiles');
        parent::initialize();
    }

    public function validation(): bool
    {
        $validation = new Validation();
        $validation->add(
            'filepath',
            new UniquenessValidator(
                [
                    'message' => $this->t('mo_ThisFilepathMustBeUniqueForCustomFilesModels'),
                ]
            )
        );

        return $this->validate($validation);
    }

    public function getContent(): string
    {
        return base64_decode($this->content);
    }

    public function setContent($text): void
    {
        $this->content = base64_encode($text);
    }
}