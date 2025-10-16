<?php

/*
 * MikoPBX - free phone system for small business
 * Copyright © 2017-2025 Alexey Portnov and Nikolay Beketov
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

namespace MikoPBX\Core\System\Mail\Builders;

use MikoPBX\Common\Providers\TranslationProvider;
use MikoPBX\Core\System\Mail\EmailTemplateRenderer;
use MikoPBX\Core\System\Mail\NotificationType;

/**
 * Class SmtpTestNotificationBuilder
 *
 * Builder for SMTP/OAuth2 test email notifications.
 * Used when testing mail configuration from admin panel.
 *
 * @package MikoPBX\Core\System\Mail\Builders
 */
class SmtpTestNotificationBuilder extends AbstractNotificationBuilder
{
    private string $smtpServer = '';
    private int $smtpPort = 587;
    private string $encryptionType = 'none';
    private string $authType = 'password';
    private string $senderAddress = '';
    private bool $oauth2Enabled = false;
    private string $oauth2Provider = '';

    /**
     * Constructor
     */
    public function __construct()
    {
        parent::__construct(NotificationType::SMTP_TEST);

        $this->subject = TranslationProvider::translate('ms_EmailNotification_SMTPTest_Subject');
        $this->preheaderText = TranslationProvider::translate('ms_EmailNotification_SMTPTest_Preheader');
        $this->mainMessage = TranslationProvider::translate('ms_EmailNotification_SMTPTest_Message');
    }

    /**
     * Set SMTP server hostname
     *
     * @param string $server SMTP server hostname
     * @return $this
     */
    public function setSmtpServer(string $server): static
    {
        $this->smtpServer = $server;
        return $this;
    }

    /**
     * Set SMTP port
     *
     * @param int $port SMTP port number
     * @return $this
     */
    public function setSmtpPort(int $port): static
    {
        $this->smtpPort = $port;
        return $this;
    }

    /**
     * Set encryption type
     *
     * @param string $type Encryption type: 'none', 'tls', 'ssl'
     * @return $this
     */
    public function setEncryptionType(string $type): static
    {
        $this->encryptionType = $type;
        return $this;
    }

    /**
     * Set authentication type
     *
     * @param string $type Auth type: 'password', 'oauth2'
     * @return $this
     */
    public function setAuthType(string $type): static
    {
        $this->authType = $type;
        return $this;
    }

    /**
     * Set sender email address
     *
     * @param string $address Sender email
     * @return $this
     */
    public function setSenderAddress(string $address): static
    {
        $this->senderAddress = $address;
        return $this;
    }

    /**
     * Set OAuth2 provider
     *
     * @param string $provider Provider name: 'google', 'microsoft', 'yandex'
     * @return $this
     */
    public function setOAuth2Provider(string $provider): static
    {
        $this->oauth2Enabled = !empty($provider);
        $this->oauth2Provider = $provider;
        return $this;
    }

    /**
     * Build template variables
     *
     * @return array<string, mixed> Template variables
     */
    protected function buildVariables(): array
    {
        // Build SMTP parameters table
        $smtpParams = [
            ['label' => TranslationProvider::translate('ms_EmailNotification_SMTPTest_SMTPServer'), 'value' => $this->smtpServer],
            ['label' => TranslationProvider::translate('ms_EmailNotification_SMTPTest_Port'), 'value' => (string)$this->smtpPort],
            ['label' => TranslationProvider::translate('ms_EmailNotification_SMTPTest_Encryption'), 'value' => strtoupper($this->encryptionType)],
            ['label' => TranslationProvider::translate('ms_EmailNotification_SMTPTest_Authentication'), 'value' => ucfirst($this->authType)],
            ['label' => TranslationProvider::translate('ms_EmailNotification_SMTPTest_FromAddress'), 'value' => $this->senderAddress],
        ];

        // Add OAuth2 info if enabled
        if ($this->oauth2Enabled) {
            $smtpParams[] = [
                'label' => TranslationProvider::translate('ms_EmailNotification_SMTPTest_OAuth2Provider'),
                'value' => ucfirst($this->oauth2Provider)
            ];
        }

        // Build success info box content
        $infoBoxContent = '<strong>✓ ' . TranslationProvider::translate('ms_EmailNotification_SMTPTest_SMTPConnection') . ':</strong> ' . TranslationProvider::translate('ms_EmailNotification_SMTPTest_Successful') . '<br>';
        $infoBoxContent .= '<strong>✓ ' . TranslationProvider::translate('ms_EmailNotification_SMTPTest_Authentication') . ':</strong> ' . TranslationProvider::translate('ms_EmailNotification_SMTPTest_Passed') . '<br>';
        $infoBoxContent .= '<strong>✓ ' . TranslationProvider::translate('ms_EmailNotification_SMTPTest_EmailDelivery') . ':</strong> ' . TranslationProvider::translate('ms_EmailNotification_SMTPTest_Working');

        if ($this->oauth2Enabled) {
            $infoBoxContent .= '<br><strong>✓ OAuth2:</strong> ' . TranslationProvider::translate('ms_EmailNotification_SMTPTest_Configured');
        }

        return [
            // Data table
            'IF_DATA_TABLE' => true,
            'DATA_TABLE_ROWS' => $this->buildDataTable($smtpParams),

            // Success info box
            'IF_INFO_BOX' => true,
            'INFO_BOX_COLOR' => '#20bf6b',
            'INFO_BOX_CONTENT' => $infoBoxContent,

            // Help text
            'IF_HELP_TEXT' => true,
            'HELP_TEXT' => TranslationProvider::translate('ms_EmailNotification_SMTPTest_HelpText'),

            // No CTA button for test emails
            'IF_CTA_BUTTON' => false,
        ];
    }
}
