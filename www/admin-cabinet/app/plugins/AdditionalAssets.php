<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 12 2019
 *
 */
use Phalcon\Text;

class AdditionalAssets
{
    public static function Register($di): void
    {
        /**
         * Сервис для работы с JS и CSS файлами
         */
        $di->set('assets', function (){
            $config     = $this->get('config');
            $manager    = new Phalcon\Assets\Manager();
            $dispatcher = $this->get('dispatcher');
            $session    = $this->get('session');
            $controller = $dispatcher->getControllerName();
            $action     = $dispatcher->getActionName();
            if ($action === null) {
                $action = 'index';
            }
            $headerCollectionJSForExtensions = $manager->collection('headerJS');
            $footerCollectionJSForExtensions = $manager->collection('footerJS');
            $headerCollectionJS              = $manager->collection('headerPBXJS');
            $headerCollectionCSS             = $manager->collection('headerCSS');
            $footerCollectionJS              = $manager->collection('footerPBXJS');
            $headerCollectionSentryJS        = $manager->collection('headerSentryJS');


            $cssCacheDir = $config->application->cssCacheDir;
            $jsCacheDir  = $config->application->jsCacheDir;

            if ($session !== null && $session->has('versionHash')) {
                $version = $session->get('versionHash');
            } else {
                $version = str_replace(PHP_EOL, '', file_get_contents('/etc/version'));
            }
            if (file_exists('/tmp/sendmetrics')) {
                $headerCollectionSentryJS->addjs('//browser.sentry-cdn.com/5.6.1/bundle.min.js', false, false, [
                    'crossorigin' => 'anonymous',
                    'integrity'   => 'sha384-pGTFmbQfua2KiaV2+ZLlfowPdd5VMT2xU4zCBcuJr7TVQozMO+I1FmPuVHY3u8KB',
                ]);
                $headerCollectionSentryJS->addJs("public/js/pbx/main/sentry-error-logger.js?v={$version}", true, false);
            }

            $semanticCollectionCSS = $manager
                ->collection('SemanticUICSS');
            $semanticCollectionCSS
                ->addCss('css/semantic/grid.min.css', true, false)
                ->addCss('css/semantic/divider.min.css', true, false)
                ->addCss('css/semantic/container.min.css', true, false)
                ->addCss('css/semantic/header.min.css', true, false)
                ->addCss('css/semantic/button.min.css', true, false)
                ->addCss('css/semantic/form.min.css', true, false)
                ->addCss('css/semantic/icon.min.css', true, false)
                ->addCss('css/semantic/image.min.css', true, false)
                ->addCss('css/semantic/input.min.css', true, false)
                ->addCss('css/semantic/message.min.css', true, false)
                ->addCss('css/semantic/segment.min.css', true, false)
                ->addCss('css/semantic/site.min.css', true, false)
                ->addCss('css/semantic/reset.min.css', true, false)
                ->addCss('css/semantic/transition.min.css', true, false);

            $footerCollectionACE = $manager
                ->collection('footerACE');

            $headerCollectionJS
                ->addJs('js/pbx/main/header.js', true)
                ->addJs('js/jquery.min.js', true);

            $semanticCollectionJS = $manager
                ->collection('SemanticUIJS');
            $semanticCollectionJS
                ->addJs('js/semantic/form.min.js', true, false)
                ->addJs('js/semantic/api.min.js', true, false)
                ->addJs('js/semantic/site.min.js', true, false)
                ->addJs('js/semantic/popup.min.js', true, false)
                ->addJs('js/semantic/transition.min.js', true, false);

            // Если пользователь залогинился, сформируем необходимые CSS кеши
            if ($session && $session->has('auth')) {
                $semanticCollectionCSS
                    ->addCss('css/semantic/menu.min.css', true, false)
                    ->addCss('css/semantic/sidebar.min.css', true, false)
                    ->addCss('css/semantic/table.min.css', true, false)
                    ->addCss('css/semantic/loader.min.css', true, false)
                    ->addCss('css/semantic/label.min.css', true, false)
                    ->addCss('css/semantic/dimmer.min.css', true, false)
                    ->addCss('css/semantic/accordion.min.css', true, false)
                    ->addCss('css/semantic/placeholder.min.css', true, false)
                    ->addCss('css/semantic/item.min.css', true, false)
                    ->addCss('css/semantic/tab.min.css', true, false)
                    ->addCss('css/semantic/checkbox.min.css', true, false)
                    ->addCss('css/semantic/popup.min.css', true, false)
                    ->addCss('css/semantic/toast.min.css', true, false)
                    ->addCss('css/semantic/dropdown.min.css', true, false);

                $semanticCollectionJS
                    ->addJs('js/semantic/accordion.min.js', true, false)
                    ->addJs('js/semantic/dimmer.min.js', true, false)
                    ->addJs('js/semantic/sidebar.min.js', true, false)
                    ->addJs('js/semantic/dropdown.min.js', true, false)
                    ->addJs('js/semantic/checkbox.min.js', true, false)
                    ->addJs('js/semantic/toast.min.js', true, false)
                    ->addJs('js/semantic/tab.min.js', true, false);


                $footerCollectionJS
                    ->addJs('js/pbx/main/config.js',
                        true,
                        true)
                    ->addJs('js/pbx/main/pbxapi.js',
                        true,
                        true)
                    ->addJs('js/pbx/main/connection-check-worker.js',
                        true,
                        true)
                    ->addJs('js/pbx/main/semantic-localization.js',
                        true,
                        true)
                    ->addJs('js/pbx/Advices/advices-worker.js',
                        true,
                        true)
                    ->addJs('js/pbx/SendMetrics/send-metrics-index.js',
                        true,
                        true)
                    ->addJs('js/pbx/main/ssh-console.js',
                        true,
                        true)
                    ->addJs('js/pbx/main/delete-something.js',
                        true,
                        true)
                    ->addJs('js/pbx/main/user-message.js',
                        true,
                        true)
                    ->addJs('js/pbx/PbxExtensionModules/pbx-extension-menu-addition.js',
                        true,
                        true);

                if ($dispatcher->getModuleName() === 'PBXExtension') {
                    $footerCollectionJS->addJs('js/pbx/PbxExtensionModules/pbx-extension-module-status.js',
                        true);
                }
            }
            switch ($controller) {
                case 'AsteriskManagers':
                    if ($action === 'index') {
                        $footerCollectionJS->addJs('js/pbx/AsteriskManagers/managers-index.js', true, true);
                    } elseif ($action === 'modify') {
                        $footerCollectionJS
                            ->addJs('js/pbx/main/form.js', true, true)
                            ->addJs('js/pbx/AsteriskManagers/manager-modify.js', true, true);
                    }
                    break;
                case 'Backup':
                    if ($action === 'index') {
                        $semanticCollectionCSS->addCss('css/semantic/progress.min.css', true, false);
                        $semanticCollectionJS->addJs('js/semantic/progress.min.js', true, false);
                        $footerCollectionJS->addJs('js/resumable.js', true, true);
                        $footerCollectionJS->addJs('js/pbx/Backup/backup-index.js', true, true);
                    } elseif ($action === 'create') {
                        $semanticCollectionCSS->addCss('css/semantic/progress.min.css', true, false);
                        $semanticCollectionJS->addJs('js/semantic/progress.min.js', true, false);
                        $footerCollectionJS
                            ->addJs('js/pbx/main/form.js', true, true)
                            ->addJs('js/pbx/Backup/backup-create.js', true, true);
                    } elseif ($action === 'restore') {
                        $semanticCollectionCSS
                            ->addCss('css/semantic/progress.min.css', true, false)
                            ->addCss('css/semantic/modal.min.css', true, false);

                        $semanticCollectionJS
                            ->addJs('js/semantic/progress.min.js', true, false)
                            ->addJs('js/semantic/modal.min.js', true, false);

                        $footerCollectionJS
                            ->addJs('js/pbx/main/form.js', true, true)
                            ->addJs('js/pbx/Backup/backup-restore.js', true, true);
                    } elseif ($action === 'automatic') {
                        $semanticCollectionCSS->addCss('css/semantic/calendar.min.css', true, false);
                        $semanticCollectionJS->addJs('js/semantic/calendar.min.js', true, false);
                        $footerCollectionJS
                            ->addJs('js/pbx/main/form.js', true, true)
                            ->addJs('js/pbx/Backup/backup-automatic.js', true, true);
                    }
                    break;
                case 'CallDetailRecords':
                    if ($action === 'index') {

                        $semanticCollectionJS->addJs('js/semantic/progress.min.js', true, false);

                        $semanticCollectionCSS
                            ->addCss('css/range/range.min.css', true, false)
                            ->addCss('css/datatable/scroller.dataTables.min.css', true, false)
                            ->addCss('css/datepicker/daterangepicker.css', true, false)
                            ->addCss('css/datatable/dataTables.semanticui.min.css', true, false);

                        $semanticCollectionJS
                            ->addJs('js/datatable/dataTables.semanticui.js', true)
                            ->addJs('js/datatable/dataTables.scroller.min.js', true)
                            ->addJs('js/datatable/scroller.semanticui.js', true)
                            //->addJs('js/datatable/dataTables.pageResize.min.js', TRUE)
                            ->addJs('js/range/range.min.js', true)
                            ->addJS('js/datepicker/moment.min.js', true, true)
                            ->addJS('js/datepicker/daterangepicker.js', true, true);

                        $footerCollectionJS
                            ->addJs('js/pbx/Extensions/extensions.js', true, true)
                            ->addJs('js/pbx/CallDetailRecords/call-detail-records-index.js',
                                true);
                    }
                    break;
                case 'CallQueues':
                    if ($action === 'index') {
                        $headerCollectionCSS
                            ->addCss('css/datatable/dataTables.semanticui.css', true, true);
                        $footerCollectionJS
                            ->addJs('js/datatable/dataTables.semanticui.js', true)
                            ->addJs('js/pbx/CallQueues/callqueues-index.js', true);
                    } elseif ($action === 'modify') {
                        $footerCollectionJS
                            ->addJs('js/jquery.debounce-1.0.5.js', true)
                            ->addJs('js/jquery.tablednd.js', true)
                            ->addJs('js/pbx/main/form.js', true)
                            ->addJs('js/pbx/Extensions/extensions.js', true)
                            ->addJs('js/pbx/CallQueues/callqueue-modify.js', true)
                            ->addJs('js/pbx/SoundFiles/one-button-sound-player.js', true);
                    }
                    break;
                case 'ConferenceRooms':
                    if ($action === 'index') {
                        $footerCollectionJS
                            ->addJs('js/pbx/ConferenceRooms/conference-rooms-index.js', true);
                    } elseif ($action === 'modify') {
                        $footerCollectionJS
                            ->addJs('js/pbx/main/form.js', true)
                            ->addJs('js/pbx/Extensions/extensions.js', true)
                            ->addJs('js/pbx/ConferenceRooms/conference-room-modify.js', true);
                    }
                    break;
                case 'CustomFiles':
                    if ($action === 'index') {
                        $headerCollectionCSS
                            ->addCss('css/datatable/dataTables.semanticui.css', true, true);
                        $footerCollectionJS
                            ->addJs('js/datatable/dataTables.semanticui.js', true)
                            ->addJs('js/pbx/CustomFiles/custom-files-index.js', true);
                    } elseif ($action === 'modify') {
                        $footerCollectionJS
                            ->addJs('js/pbx/main/form.js', true)
                            ->addJs('js/pbx/CustomFiles/custom-files-modify.js', true);
                        $footerCollectionACE
                            ->addJs('public/js/ace/ace.js', true)
                            ->addJs('public/js/ace/mode-julia.js', true);
                    }
                    break;
                case 'DialplanApplications':
                    if ($action === 'index') {
                        $headerCollectionCSS
                            ->addCss('css/datatable/dataTables.semanticui.css', true, true);
                        $footerCollectionJS
                            ->addJs('js/datatable/dataTables.semanticui.js', true)
                            ->addJs('js/pbx/DialplanApplications/dialplan-applications-index.js', true);
                    } elseif ($action === 'modify') {
                        $footerCollectionACE
                            ->addJs('public/js/ace/ace.js', true)
                            ->addJs('public/js/ace/mode-php.js', true)
                            ->addJs('public/js/ace/mode-julia.js', true);
                        $footerCollectionJS
                            ->addJs('js/pbx/main/form.js', true)
                            ->addJs('js/pbx/Extensions/extensions.js', true)
                            ->addJs('js/pbx/DialplanApplications/dialplan-applications-modify.js', true);
                    }
                    break;
                case 'Extensions':
                    if ($action === 'index') {
                        $headerCollectionCSS->addCss('css/datatable/dataTables.semanticui.min.css', true);

                        $footerCollectionJS
                            ->addJs('js/datatable/dataTables.semanticui.js', true)
                            ->addJs('js/inputmask/inputmask.js', true)
                            ->addJs('js/inputmask/jquery.inputmask.js', true)
                            ->addJs('js/inputmask/jquery.inputmask-multi.js', true)
                            ->addJs('js/inputmask/bindings/inputmask.binding.js', true)
                            ->addJs('js/inputmask/init.js', true)
                            ->addJs('js/pbx/Extensions/input-mask-patterns.js', true)
                            ->addJs('js/pbx/Extensions/extensions-index.js', true)
                            ->addJs('js/pbx/main/debugger-info.js', true)
                            ->addJs('js/clipboard/clipboard.js', true);

                    } elseif ($action === 'modify') {
                        $semanticCollectionCSS->addCss('css/semantic/card.min.css', true, false);
                        $footerCollectionJS
                            ->addJs('js/inputmask/inputmask.js', true)
                            ->addJs('js/inputmask/jquery.inputmask.js', true)
                            ->addJs('js/inputmask/jquery.inputmask-multi.js', true)
                            ->addJs('js/inputmask/bindings/inputmask.binding.js', true)
                            ->addJs('js/inputmask/init.js', true)
                            ->addJs('js/pbx/Extensions/input-mask-patterns.js', true)
                            ->addJs('js/pbx/Extensions/extensions.js', true)
                            ->addJs('js/pbx/main/form.js', true)
                            ->addJs('js/pbx/main/debugger-info.js', true)
                            ->addJs('js/pbx/Extensions/extension-modify.js', true);
                    }
                    break;
                case 'Fail2Ban':
                    if ($action === 'index') {
                        $footerCollectionJS
                            ->addJs('js/pbx/main/form.js', true)
                            ->addJs('js/pbx/Fail2Ban/fail-to-ban-index.js', true);
                    }
                    break;
                case 'Firewall':
                    if ($action === 'index') {
                        $footerCollectionJS
                            ->addJs('js/pbx/Firewall/firewall-index.js', true);
                    } elseif ($action === 'modify') {
                        $footerCollectionJS
                            ->addJs('js/pbx/main/form.js', true)
                            ->addJs('js/pbx/Firewall/firewall-modify.js', true);
                    }
                    break;
                case 'GeneralSettings':
                    if ($action === 'modify') {
                        $semanticCollectionCSS->addCss('css/semantic/progress.min.css', true, false);
                        $semanticCollectionJS->addJs('js/semantic/progress.min.js', true, false);
                        $footerCollectionJS
                            ->addJs('js/jquery.address.min.js', true, false)
                            ->addJs('js/pbx/main/form.js', true)
                            ->addJs('js/pbx/main/password-score.js', true)
                            ->addJs('js/pbx/GeneralSettings/general-settings-modify.js',
                                true);
                    }
                    break;
                case 'IncomingRoutes':
                    if ($action === 'index') {
                        $footerCollectionJS->addJs('js/jquery.tablednd.js', true)
                            ->addJs('js/pbx/main/form.js', true)
                            ->addJs('js/pbx/Extensions/extensions.js', true)
                            ->addJs('js/pbx/IncomingRoutes/incoming-route-index.js', true);

                    } elseif ($action === 'modify') {
                        $footerCollectionJS->addJs('js/pbx/main/form.js', true)
                            ->addJs('js/pbx/Extensions/extensions.js', true)
                            ->addJs('js/pbx/IncomingRoutes/incoming-route-modify.js', true);
                    }
                    break;
                case 'IvrMenu':
                    if ($action === 'index') {
                        $headerCollectionCSS
                            ->addCss('css/datatable/dataTables.semanticui.css', true, true);
                        $footerCollectionJS
                            ->addJs('js/datatable/dataTables.semanticui.js', true)
                            ->addJs('js/pbx/IvrMenu/ivrmenu-index.js', true);

                    } elseif ($action === 'modify') {
                        $footerCollectionJS->addJs('js/pbx/main/form.js', true)
                            ->addJs('js/pbx/Extensions/extensions.js', true)
                            ->addJs('js/pbx/SoundFiles/one-button-sound-player.js', true)
                            ->addJs('js/pbx/IvrMenu/ivrmenu-modify.js', true);
                    }
                    break;
                case 'Licensing':
                    if ($action === 'modify') {
                        $footerCollectionJS
                            ->addJs('js/inputmask/inputmask.js', true)
                            ->addJs('js/inputmask/jquery.inputmask.js', true)
                            ->addJs('js/inputmask/bindings/inputmask.binding.js', true)
                            ->addJs('js/jquery.address.min.js', true, false)
                            // ->addJs( 'js/inputmask/inputmask.extensions.js',TRUE )
                            ->addJs('js/inputmask/init.js', true)
                            ->addJs('js/pbx/main/form.js', true)
                            ->addJs('js/pbx/Licensing/licensing-modify.js', true);
                    }
                    break;
                case 'MailSettings':
                    if ($action === 'modify') {
                        $footerCollectionJS
                            ->addJs('js/pbx/main/form.js', true)
                            ->addJs('js/pbx/MailSettings/mail-settings-modify.js', true);
                    }
                    break;
                case 'Network':
                    if ($action === 'modify') {
                        $footerCollectionJS
                            ->addJs('js/pbx/main/form.js', true)
                            ->addJs('js/pbx/Network/network-modify.js', true);
                    }
                    break;
                case 'OutboundRoutes':
                    if ($action === 'index') {
                        $footerCollectionJS
                            ->addJs('js/jquery.tablednd.min.js', true)
                            ->addJs('js/pbx/OutboundRoutes/outbound-routes-index.js', true);

                    } elseif ($action === 'modify') {
                        $footerCollectionJS->addJs('js/pbx/main/form.js', true)
                            ->addJs('js/pbx/OutboundRoutes/outbound-route-modify.js', true);
                    }
                    break;
                case 'OutOffWorkTime':
                    if ($action === 'index') {
                        $footerCollectionJS
                            ->addJs('js/pbx/OutOffWorkTime/out-of-work-times-index.js', true);

                    } elseif ($action === 'modify') {
                        $semanticCollectionCSS->addCss('css/semantic/calendar.min.css', true, false);
                        $semanticCollectionJS->addJs('js/semantic/calendar.min.js', true, false);
                        $footerCollectionJS
                            ->addJs('js/pbx/main/form.js', true, true)
                            ->addJs('js/pbx/Extensions/extensions.js', true, true)
                            ->addJs('js/pbx/OutOffWorkTime/out-of-work-time-modify.js', true, true)
                            ->addJs('js/pbx/SoundFiles/one-button-sound-player.js', true, true);
                    }
                    break;
                case 'PbxExtensionModules':
                    if ($action === 'index') {
                        $semanticCollectionJS->addJs('js/semantic/modal.min.js', true, false);
                        $footerCollectionJS
                            ->addJs('js/pbx/Update/update-api.js', true)
                            ->addJs('js/datatable/dataTables.semanticui.js', true)
                            ->addJs('js/pbx/PbxExtensionModules/pbx-extension-module-licensing.js', true)
                            ->addJs('js/pbx/PbxExtensionModules/pbx-extension-module-upgrade-status-worker.js', true)
                            ->addJs('js/pbx/PbxExtensionModules/pbx-extension-module-status.js', true)
                            ->addJs('js/pbx/PbxExtensionModules/pbx-extension-modules-index.js', true)
                            ->addJs('js/semantic/progress.min.js', true, false)
                            ->addJs('js/pbx/PbxExtensionModules/pbx-extension-module-add-new.js', true);
                        $semanticCollectionCSS
                            ->addCss('css/datatable/dataTables.semanticui.min.css', true, false)
                            ->addCss('css/semantic/modal.min.css', true, false)
                            ->addCss('css/semantic/progress.min.css', true, false);

                    } elseif ($action === 'modify') {
                        $footerCollectionJS
                            ->addJs('js/pbx/main/form.js', true)
                            ->addJs('js/pbx/PbxExtensionModules/pbx-extension-module-modify.js', true);
                    }
                    break;

                case 'Providers':
                    if ($action === 'index') {
                        $semanticCollectionCSS
                            ->addCss('css/datatable/dataTables.semanticui.css', true, true)
                            ->addCss('css/semantic/modal.min.css', true, false);

                        $semanticCollectionJS
                            ->addJs('js/semantic/modal.min.js', true, false);
                        $footerCollectionJS
                            ->addJs('js/pbx/main/debugger-info.js', true)
                            ->addJs('js/datatable/dataTables.semanticui.js', true)
                            ->addJs('js/pbx/Providers/providers-index.js', true);

                    } elseif ($action === 'modifysip' || $action === 'modifyiax') {
                        $footerCollectionJS
                            ->addJs('js/pbx/main/form.js', true)
                            ->addJs('js/pbx/main/debugger-info.js', true)
                            ->addJs('js/pbx/Providers/provider-modify.js', true);
                    }

                    break;
                case 'Restart':
                    if ($action === 'index') {
                        $footerCollectionJS
                            ->addJs('js/pbx/Extensions/extensions.js', true, true)
                            ->addJs('js/pbx/Restart/restart-index.js', true);
                    }
                    break;
                case 'Session':
                    if ($action === 'index') {
                        $footerCollectionJS
                            ->addJs('js/pbx/main/form.js', true)
                            ->addJs('js/pbx/Session/login-form.js', true);
                    }
                    break;
                case 'SoundFiles':
                    if ($action === 'index') {
                        $headerCollectionCSS
                            ->addCss('css/range/range.css')
                            ->addCss('css/datatable/dataTables.semanticui.css',
                                true);
                        $footerCollectionJS->addJs('js/datatable/dataTables.semanticui.js', true)
                            ->addJs('js/range/range.min.js', true)
                            ->addJs('js/pbx/SoundFiles/sound-files-index.js', true);

                    } elseif ($action === 'modify') {
                        $headerCollectionCSS->addCss('css/range/range.css');

                        $headerCollectionJS
                            ->addJs('js/webrtc//MediaStreamRecorder.min.js',
                                true)
                            ->addJs('js/webrtc/adapter-latest.min.js', true);

                        $footerCollectionJS
                            ->addJs('js/range/range.min.js', true)
                            ->addJs('js/pbx/main/form.js', true)
                            ->addJs('js/pbx/SoundFiles/sound-file-modify.js', true);
                    }
                    break;
                case 'SystemDiagnostic':
                    if ($action === 'index') {
                        $footerCollectionJS
                            ->addJs('js/pbx/main/form.js', true)
                            ->addJs('js/pbx/SystemDiagnostic/system-diagnostic-index.js', true);
                    }
                    break;
                case 'TimeSettings':
                    if ($action === 'modify') {
                        $semanticCollectionCSS->addCss('css/semantic/calendar.min.css', true, false);
                        $semanticCollectionJS->addJs('js/semantic/calendar.min.js', true, false);
                        $footerCollectionJS
                            ->addJs('js/pbx/main/form.js', true)
                            ->addJs('js/pbx/TimeSettings/time-settings-modify.js', true);

                    }
                    break;
                case 'Update':
                    if ($action === 'index') {
                        $footerCollectionJS
                            ->addJs('js/pbx/main/form.js', true)
                            ->addJs('js/showdown/showdown.min.js', true)
                            ->addJs('js/pbx/Update/update-index.js', true);
                        $semanticCollectionCSS
                            ->addCss('css/semantic/progress.min.css', true, false)
                            ->addCss('css/semantic/modal.min.css', true, false);

                        $semanticCollectionJS
                            ->addJs('js/semantic/progress.min.js', true, false)
                            ->addJs('js/semantic/modal.min.js', true, false);

                    }
                    break;
                default:
                    break;
            }
            $headerCollectionCSS
                ->addCss('css/custom.css', true);

            $footerCollectionJS->addJs('js/pbx/main/footer.js',
                true,
                true);


            // Сохраним перевод в файл если его еще нет
            $language   = $this->get('language');
            $langJSFile = "public/js/cache/localization-{$language}-{$version}.min.js";
            if ( ! file_exists($langJSFile)) {
                $arrStr = [];
                foreach ($this->get('messages') as $key => $value) {
                    $arrStr[$key] = str_replace("'", "\\'",
                        str_replace(["\n", '  '], '', $value));
                }

                $fileName    = "{$jsCacheDir}localization-{$language}-{$version}.min.js";
                $scriptArray = json_encode($arrStr);
                file_put_contents($fileName, "globalTranslate = {$scriptArray}");
            }

            $footerCollectionLoc = $manager->collection('footerLoc');
            $footerCollectionLoc->addJs($langJSFile, true);


            // Название получаемого файла
            $resultCombinedName = Text::uncamelize(ucfirst($controller) . ucfirst($action), '-');
            $resultCombinedName = strlen($resultCombinedName) !== '' ? $resultCombinedName . '-' : '';


            $headerCollectionCSS->join(true);
            $headerCollectionCSS->setTargetPath("{$cssCacheDir}{$resultCombinedName}header.min.css");
            $headerCollectionCSS->setTargetUri("public/css/cache/{$resultCombinedName}header.min.css?v={$version}");
            $headerCollectionCSS->addFilter(
                new Phalcon\Assets\Filters\Cssmin()
            );

            $semanticCollectionCSS->setPrefix('public/');
            $semanticCollectionJS->setPrefix('public/');
            $headerCollectionJS->setPrefix('public/');
            $footerCollectionJS->setPrefix('public/');
            foreach ($headerCollectionJS as $resource) {
                $resource->setPath($resource->getPath() . '?v=' . $version);
            }
            foreach ($footerCollectionJS as $resource) {
                $resource->setPath($resource->getPath() . '?v=' . $version);
            }
            foreach ($semanticCollectionJS as $resource) {
                $resource->setPath($resource->getPath() . '?v=' . $version);
            }
            foreach ($semanticCollectionCSS as $resource) {
                $resource->setPath($resource->getPath() . '?v=' . $version);
            }

            $headerCollectionJSForExtensions->join(true);
            $headerCollectionJSForExtensions->setTargetPath("{$jsCacheDir}{$resultCombinedName}header.min.js");
            $headerCollectionJSForExtensions->setTargetUri("public/js/cache/{$resultCombinedName}header.min.js?v={$version}");
            $headerCollectionJSForExtensions->addFilter(
                new Phalcon\Assets\Filters\Jsmin()
            );

            $footerCollectionJSForExtensions->join(true);
            $footerCollectionJSForExtensions->setTargetPath("{$jsCacheDir}{$resultCombinedName}footer.min.js");
            $footerCollectionJSForExtensions->setTargetUri("public/js/cache/{$resultCombinedName}footer.min.js?v={$version}");
            $footerCollectionJSForExtensions->addFilter(
                new Phalcon\Assets\Filters\Jsmin()
            );

            return $manager;
        });
    }
}