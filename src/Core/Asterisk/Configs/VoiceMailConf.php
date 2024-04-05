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

namespace MikoPBX\Core\Asterisk\Configs;

use MikoPBX\Common\Models\PbxSettingsConstants;
use MikoPBX\Common\Providers\CDRDatabaseProvider;
use MikoPBX\Core\System\Directories;
use MikoPBX\Core\System\Processes;
use MikoPBX\Core\System\Util;
use MikoPBX\Common\Models\Extensions;
use MikoPBX\Common\Models\Sip;
use MikoPBX\Common\Models\Users;
use Phalcon\Di;
use Phalcon\Mvc\Model\Manager;

/**
 * Class VoiceMailConf
 *
 * Represents the voicemail.conf configuration file.
 * @package MikoPBX\Core\Asterisk\Configs
 */
class VoiceMailConf extends AsteriskConfigClass
{
    // The module hook applying priority
    public int $priority = 620;

    /**
     * The voice mailbox extension.
     */
    public const VOICE_MAIL_EXT = 'voicemail';
    protected string $description = 'voicemail.conf';


    /**
     * Get the inclusion in the internal context.
     *
     * @return string
     */
    public function getIncludeInternal(): string
    {
        return "include => voice_mail_peer\n";
    }

    /**
     * Prepare additional context sections in the extensions.conf file.
     *
     * @return string
     */
    public function extensionGenContexts(): string
    {
        $conf  = "[voice_mail_peer] \n";
        $conf .= 'exten => '.self::VOICE_MAIL_EXT.',1,Answer()' . "\n\t";
        $conf .= 'same => n,ExecIf($["${CHANNEL:0:5}" == "Local"]?Set(pl=${IF($["${CHANNEL:-1}" == "1"]?2:1)}))' . "\n\t";
        $conf .= 'same => n,ExecIf($["${CHANNEL:0:5}" == "Local"]?Set(bridgePeer=${IMPORT(${CUT(CHANNEL,\;,1)}\;${pl},BRIDGEPEER)}))' . "\n\t";
        $conf .= 'same => n,ExecIf($[ "${FROM_CHAN}" == "${bridgePeer}" ]?ChannelRedirect(${bridgePeer},${CONTEXT},${EXTEN},2))' . "\n\t";
        $conf .= 'same => n,Gosub(set-answer-state,${EXTEN},1)' . PHP_EOL."\t";
        $conf .= 'same => n,Gosub(voicemail_start,${EXTEN},1)' . "\n\t";
        $conf .= 'same => n,VoiceMail(admin@voicemailcontext)' . "\n\t";
        $conf .= 'same => n,Hangup()' . "\n\n";

        return  $conf;
    }

    /**
     * Generate the configuration content for voicemail.conf.
     *
     * This method generates the configuration content for the voicemail.conf file.
     */
    protected function generateConfigProtected(): void
    {
        // Create an array of parameters
        $params = [
            'VM_NAME' => '${VM_NAME}',
            'VM_DUR'  => '${VM_DUR}',
            'VM_MSGNUM'  => '${VM_MSGNUM}',
            'VM_MAILBOX'  => '${VM_MAILBOX}',
            'VM_CALLERID'  => '${VM_CALLERID}',
            'VM_DATE'  => '${VM_DATE}'
        ];
        try {
            // Convert the parameters array to JSON
            $emailBody = json_encode($params, JSON_THROW_ON_ERROR);

            // Replace double quotes with '%|%' in the JSON string
            $emailBody = str_replace('"', '%|%', $emailBody);
        }catch (\Exception $e){
            // If there is an exception, set emailBody to an empty string
            $emailBody = '';
        }

        // Get the sender address from generalSettings or fallback to MailSMTPUsername
        $from = $this->generalSettings[PbxSettingsConstants::MAIL_SMTP_SENDER_ADDRESS];
        if (empty($from)) {
            $from =  $this->generalSettings[PbxSettingsConstants::MAIL_SMTP_USERNAME];
        }

        // Get the PBX timezone and voicemail-sender path
        $timezone = $this->generalSettings[PbxSettingsConstants::PBX_TIMEZONE];
        $msmtpPath = Util::which('voicemail-sender');

        // Create the voicemail configuration string
        $conf     = "[general]\n" .
            "format=wav\n" .
            "attach=yes\n" .
            "maxmsg=100\n" .
            "maxsecs=120\n" .
            "maxgreet=60\n" .
            "maxsilence=10\n" .
            "silencethreshold=128\n" .
            "maxlogins=3\n" .
            "moveheard=yes\n" .
            "charset=UTF-8\n" .
            "pbxskip=yes\n" .
            "fromstring=VoiceMail\n" .
            "emailsubject=\n" .
            "emailbody={$emailBody}\n" .
            "emaildateformat=%A, %d %B %Y в %H:%M:%S\n" .
            "pagerdateformat=%T %D\n" .
            "mailcmd={$msmtpPath}\n" .
            "serveremail={$from}\n\n" .
            "[zonemessages]\n" .
            "local={$timezone}|'vm-received' q 'digits/at' H 'hours' M 'minutes'\n\n";

        // Append voicemail context and mail_box to the configuration string
        $conf .= "[voicemailcontext]\n";
        $mail_box = $this->generalSettings[PbxSettingsConstants::VOICEMAIL_NOTIFICATIONS_EMAIL];
        $conf .= "admin => admin," . Util::translate("user") . ",{$mail_box},,attach=yes|tz=local|delete=yes\n";

        // Write the configuration string to voicemail.conf file
        Util::fileWriteContent($this->config->path('asterisk.astetcdir') . '/voicemail.conf', $conf);
    }

    /**
     * Get the filename for copying a source file to a destination directory.
     *
     * @param string $srcFileName The source file name.
     * @param string $linkedId The linked ID.
     * @param int $time The timestamp.
     * @param bool $copy Whether to perform the copy operation.
     * @return string The recording file name.
     */
    public static function getCopyFilename($srcFileName, $linkedId, $time, bool $copy = true):string{
        // Generate the destination filename with .wav extension
        $filename = Util::trimExtensionForFile($srcFileName) . '.wav';
        $recordingFile = '';

        // Define the directory path for storing the recording file
        $monitor_dir = Directories::getDir(Directories::AST_MONITOR_DIR);
        $sub_dir     = date('Y/m/d', $time);
        $dirName = "$monitor_dir/$sub_dir/INBOX/";

        // Create the directory if it doesn't exist
        if(Util::mwMkdir($dirName)){
            $recordingFile = $dirName.$linkedId.'.wav';
            $cpPath = Util::which('cp');

            // Perform the copy operation if $copy is true
            if($copy === true){
                Processes::mwExec("{$cpPath} {$filename} {$recordingFile}");
            }

            // Check if the recording file exists
            if($copy === true && !file_exists($recordingFile)){
                $recordingFile = '';
            }else{
                // Change the extension of the recording file to .mp3
                $recordingFile = Util::trimExtensionForFile($recordingFile) . '.mp3';
            }
        }
        return $recordingFile;
    }

    /**
     * Get users' voicemail information.
     *
     * @return array An array containing the voicemail information of users.
     */
    public static function getUsersVM():array
    {
        // Check if the dependency injector is available
        $di = Di::getDefault();
        if(!$di){
            return [];
        }

        /** @var Manager $manager */
        $manager = $di->get('modelsManager');
        $parameters = [
            'models'     => [
                'Sip' => Sip::class,
            ],
            'conditions' => 'Sip.type = :type: AND Users.email <> ""',
            'bind'       => ['type' => 'peer'],
            'columns'    => [
                'extension'      => 'Sip.extension',
                'email'          => 'Users.email',
                'username'       => 'Users.username',
            ],
            'order'      => 'Sip.extension',
            'joins'      => [
                'Extensions' => [
                    0 => Extensions::class,
                    1 => 'Sip.extension = Extensions.number',
                    2 => 'Extensions',
                    3 => 'LEFT',
                ],
                'Users' => [
                    0 => Users::class,
                    1 => 'Users.id = Extensions.userid',
                    2 => 'Users',
                    3 => 'INNER',
                ]
            ],
        ];
        // Create the query builder and execute the query
        $query  = $manager->createBuilder($parameters)->getQuery();
        $result = $query->execute()->toArray();
        $mails = [];
        foreach ($result as $data){
            if(empty($data['email'])){
                continue;
            }
            // Store the voicemail information in an array with the extension as the key
            $mails[$data['extension']] = $data;
        }
        return $mails;
    }

    /**
     * Get the list of email addresses for voicemail notifications.
     *
     * @param string $linkedId
     * @return array
     */
    public static function getToMail($linkedId):array
    {
        $toMails  = [];
        $allMails = self::getUsersVM();
        $filter         = [
            'linkedid=:linkedid: AND disposition <> "ANSWERED"',
            'bind' => [
                'linkedid' => $linkedId,
            ],
            'columns' => 'dst_num',
            'miko_tmp_db' => true
        ];
        $m_data = CDRDatabaseProvider::getCdr($filter);
        foreach ($m_data as $row){
            $mailData = $allMails[$row['dst_num']]??false;
            if($mailData){
                $toMails[] = $mailData['email'];
            }
        }

        return $toMails;
    }

}