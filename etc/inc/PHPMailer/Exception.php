<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 6 2019
 */

namespace Library\Mail;

/**
 * PHPMailer exception handler.
 *
 * @author  Marcus Bointon <phpmailer@synchromedia.co.uk>
 */
class Exception extends \Phalcon\Exception
{
    /**
     * Prettify error message output.
     *
     * @return string
     */
    public function errorMessage()
    {
        return '<strong>' . htmlspecialchars($this->getMessage()) . "</strong><br />\n";
    }
}