<?php
/**
 * Copyright (C) MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Nikolay Beketov, 5 2018
 *
 */

namespace MikoPBX\AdminCabinet\Controllers;

use MikoPBX\Common\Models\{CallDetailRecords, PbxSettings};
use DateTime;

class CallDetailRecordsController extends BaseController
{


    /**
     * Выборка записей из журнала звонков
     *
     * @param int  $currentPage текущая страница пажинации
     * @param null $parameters
     */
    public function indexAction($currentPage = 0, $parameters = null): void
    {
    }

    /**
     * Запрос нового пакета истории разговоров для DataTable JSON
     */
    public function getNewRecordsAction(): void
    {
        $currentPage                 = $this->request->getPost('draw');
        $position                    = $this->request->getPost('start');
        $recordsPerPage              = $this->request->getPost('length');
        $searchPhrase                = $this->request->getPost('search');
        $this->view->draw            = $currentPage;
        $this->view->recordsTotal    = 0;
        $this->view->recordsFiltered = 0;
        $this->view->data            = [];

        // Посчитаем количество уникальных звонков без учета фильтров
        $parameters['columns'] = 'COUNT(DISTINCT(linkedid)) as rows';
        $recordsTotalReq       = CallDetailRecords::findFirst($parameters);
        if ($recordsTotalReq) {
            $recordsTotal             = $recordsTotalReq->rows;
            $this->view->recordsTotal = $recordsTotal;
        } else {
            return;
        }
        // Посчитаем количество уникальных звонков с учетом фильтров
        if ( ! empty($searchPhrase['value'])) {
            $this->prepareConditionsForSearchPhrases($searchPhrase['value'], $parameters);
            // Если мы не смогли расшифровать строку запроса вернем пустой результата
            if (empty($parameters['conditions'])) {
                return;
            }
        }
        $recordsFilteredReq = CallDetailRecords::findFirst($parameters);
        if ($recordsFilteredReq) {
            $recordsFiltered             = $recordsFilteredReq->rows;
            $this->view->recordsFiltered = $recordsFiltered;
        }

        // Найдем все LinkedID подходящих под заданный фильтр
        $parameters['columns'] = 'DISTINCT(linkedid) as linkedid';
        $parameters['order']   = ['CallDetailRecords.start desc'];
        $parameters['limit']   = $recordsPerPage;
        $parameters['offset']  = $position;

        $selectedLinkedIds = CallDetailRecords::find($parameters);
        $arrIDS            = [];
        foreach ($selectedLinkedIds as $item) {
            $arrIDS[] = $item->linkedid;
        }

        if (count($arrIDS) === 0) {
            return;
        }

        // Получим все детальные записи для обработки и склеивания
        if (count($arrIDS) === 1) {
            $parameters = [
                'conditions' => 'linkedid = :ids:',
                'columns'    => 'id, disposition, start, src_num, dst_num, billsec, recordingfile, did, dst_chan, linkedid, is_app',
                'bind'       => [
                    'ids' => $arrIDS[0],
                ],
                'order'      => ['CallDetailRecords.linkedid desc', 'CallDetailRecords.start asc'],
            ];
        } else {
            $parameters = [
                'conditions' => 'linkedid IN ({ids:array})',
                'columns'    => 'id, disposition, start, src_num, dst_num, billsec, recordingfile, did, dst_chan, linkedid, is_app',
                'bind'       => [
                    'ids' => $arrIDS,
                ],
                'order'      => ['CallDetailRecords.linkedid desc', 'CallDetailRecords.start asc'],
            ];
        }

        $selectedRecords = CallDetailRecords::find($parameters);

        $arrCdr = [];

        $objectLinkedCallRecord = (object)[
            'linkedid'    => '',
            'disposition' => '',
            'start'       => '',
            'src_num'     => '',
            'dst_num'     => '',
            'billsec'     => 0,
            'answered'    => [],
            'detail'      => [],
        ];

        foreach ($selectedRecords as $record) {
            if ( ! array_key_exists($record->linkedid, $arrCdr)) {
                $arrCdr[$record->linkedid] = clone $objectLinkedCallRecord;
            }
            if ($record->is_app !== '1'
                && $record->billsec > 0
                && ($record->disposition === 'ANSWER' || $record->disposition === 'ANSWERED')) {
                $disposition = 'ANSWERED';
            } else {
                $disposition = 'NOANSWER';
            }
            $linkedRecord              = $arrCdr[$record->linkedid];
            $linkedRecord->linkedid    = $record->linkedid;
            $linkedRecord->disposition = $linkedRecord->disposition !== 'ANSWERED' ? $disposition : 'ANSWERED';
            $linkedRecord->start       = $linkedRecord->start === '' ? $record->start : $linkedRecord->start;
            $linkedRecord->src_num     = $linkedRecord->src_num === '' ? $record->src_num : $linkedRecord->src_num;
            if ( ! empty($record->did)) {
                $linkedRecord->dst_num = $record->did;
            } else {
                $linkedRecord->dst_num = $linkedRecord->dst_num === '' ? $record->dst_num : $linkedRecord->dst_num;
            }
            $linkedRecord->billsec += (int)$record->billsec;
            if ($disposition === 'ANSWERED') {
                $linkedRecord->answered[] = [
                    'id'            => $record->id,
                    'src_num'       => $record->src_num,
                    'dst_num'       => $record->dst_num,
                    'recordingfile' => $record->recordingfile,
                ];
            }
            $linkedRecord->detail[] = $record;
        }
        $output = [];
        foreach ($arrCdr as $cdr) {
            $timing   = gmdate($cdr->billsec < 3600 ? 'i:s' : 'G:i:s', $cdr->billsec);
            $output[] = [
                date('d-m-Y H:i:s', strtotime($cdr->start)),
                $cdr->src_num,
                $cdr->dst_num,
                $timing === '00:00' ? '' : $timing,
                $cdr->answered,
                $cdr->disposition,
                'DT_RowId'    => $cdr->linkedid,
                'DT_RowClass' => 'NOANSWER' === $cdr->disposition ? 'ui negative' : 'detailed',
            ];
        }

        $this->view->data = $output;
    }

    /**
     *
     * Подготовка параметров запроса для фильтрации CDR записей
     *
     * @param $searchPhrase - поисковая фраза, которую ввел пользователь
     * @param $parameters   - параметры запроса CDR
     */
    private function prepareConditionsForSearchPhrases(&$searchPhrase, &$parameters): void
    {
        $parameters['conditions'] = '';

        // Поищем линкдиды, и если они там есть, то игнориуем все предыдущие параметры запроса
        if (preg_match_all("/mikopbx-\d+.\d+/", $searchPhrase, $matches) && count($matches[0]) === 1) {
            $parameters['conditions']           = 'linkedid = :SearchPhrase:';
            $parameters['bind']['SearchPhrase'] = $matches[0][0];

            return;
        }

        // Поищем даты
        if (preg_match_all("/\d{2}\/\d{2}\/\d{4}/", $searchPhrase, $matches)) {
            if (count($matches[0]) === 1) {
                $date                                  = DateTime::createFromFormat('d/m/Y', $matches[0][0]);
                $requestedDate                         = $date->format('Y-m-d');
                $tomorrowDate                          = $date->modify('+1 day')->format('Y-m-d');
                $parameters['conditions']              .= 'start BETWEEN :dateFromPhrase1: AND :dateFromPhrase2:';
                $parameters['bind']['dateFromPhrase1'] = $requestedDate;
                $parameters['bind']['dateFromPhrase2'] = $tomorrowDate;
                $searchPhrase                          = str_replace($matches[0][0], "", $searchPhrase);
            } elseif (count($matches[0]) === 2) {
                $parameters['conditions']              .= 'start BETWEEN :dateFromPhrase1: AND :dateFromPhrase2:';
                $date                                  = DateTime::createFromFormat('d/m/Y', $matches[0][0]);
                $requestedDate                         = $date->format('Y-m-d');
                $parameters['bind']['dateFromPhrase1'] = $requestedDate;
                $date                                  = DateTime::createFromFormat('d/m/Y', $matches[0][1]);
                $tomorrowDate                          = $date->modify('+1 day')->format('Y-m-d');
                $parameters['bind']['dateFromPhrase2'] = $tomorrowDate;
                $searchPhrase                          = str_replace([$matches[0][0], $matches[0][1]], '',
                    $searchPhrase);
            }
        }

        // Поищем номера телефонов
        $searchPhrase = str_replace(['(', ')', '-', '+'], '', $searchPhrase);

        if (preg_match_all("/\d+/", $searchPhrase, $matches)) {
            $needCloseAnd     = false;
            $extensionsLength = PbxSettings::getValueByKey('PBXInternalExtensionLength');
            if ($parameters['conditions'] !== '') {
                $parameters['conditions'] .= ' AND (';
                $needCloseAnd             = true;
            }
            if (count($matches[0]) === 1) {
                if ($extensionsLength === strlen($matches[0][0])) {
                    $parameters['conditions']            .= 'src_num = :SearchPhrase1: OR dst_num = :SearchPhrase2:';
                    $parameters['bind']['SearchPhrase1'] = $matches[0][0];
                    $parameters['bind']['SearchPhrase2'] = $matches[0][0];
                } else {

                    $seekNumber                          = substr($matches[0][0], -9);
                    $parameters['conditions']            .= 'src_num LIKE :SearchPhrase1: OR dst_num LIKE :SearchPhrase2: OR did LIKE :SearchPhrase3:';
                    $parameters['bind']['SearchPhrase1'] = "%{$seekNumber}%";
                    $parameters['bind']['SearchPhrase2'] = "%{$seekNumber}%";
                    $parameters['bind']['SearchPhrase3'] = "%{$seekNumber}%";
                }

                $searchPhrase = str_replace($matches[0][0], '', $searchPhrase);
            } elseif (count($matches[0]) === 2) {
                if ($extensionsLength === strlen($matches[0][0]) && $extensionsLength === strlen($matches[0][1])) {
                    $parameters['conditions']            .= '(src_num = :SearchPhrase1: AND dst_num = :SearchPhrase2:)';
                    $parameters['conditions']            .= ' OR (src_num = :SearchPhrase3: AND dst_num = :SearchPhrase4:)';
                    $parameters['conditions']            .= ' OR (src_num = :SearchPhrase5: AND did = :SearchPhrase6:)';
                    $parameters['conditions']            .= ' OR (src_num = :SearchPhrase8: AND did = :SearchPhrase7:)';
                    $parameters['bind']['SearchPhrase1'] = $matches[0][0];
                    $parameters['bind']['SearchPhrase2'] = $matches[0][1];
                    $parameters['bind']['SearchPhrase3'] = $matches[0][1];
                    $parameters['bind']['SearchPhrase4'] = $matches[0][0];
                    $parameters['bind']['SearchPhrase5'] = $matches[0][1];
                    $parameters['bind']['SearchPhrase6'] = $matches[0][0];
                    $parameters['bind']['SearchPhrase7'] = $matches[0][1];
                    $parameters['bind']['SearchPhrase8'] = $matches[0][0];
                } elseif ($extensionsLength === strlen($matches[0][0]) && $extensionsLength !== strlen($matches[0][1])) {
                    $seekNumber                          = substr($matches[0][1], -9);
                    $parameters['conditions']            .= '(src_num = :SearchPhrase1: AND dst_num LIKE :SearchPhrase2:)';
                    $parameters['conditions']            .= ' OR (src_num LIKE :SearchPhrase3: AND dst_num = :SearchPhrase4:)';
                    $parameters['conditions']            .= ' OR (src_num LIKE :SearchPhrase5: AND did = :SearchPhrase6:)';
                    $parameters['conditions']            .= ' OR (src_num = :SearchPhrase8: AND did LIKE :SearchPhrase7:)';
                    $parameters['bind']['SearchPhrase1'] = $matches[0][0];
                    $parameters['bind']['SearchPhrase2'] = "%{$seekNumber}%";
                    $parameters['bind']['SearchPhrase3'] = "%{$seekNumber}%";
                    $parameters['bind']['SearchPhrase4'] = $matches[0][0];
                    $parameters['bind']['SearchPhrase5'] = "%{$seekNumber}%";
                    $parameters['bind']['SearchPhrase6'] = $matches[0][0];
                    $parameters['bind']['SearchPhrase7'] = "%{$seekNumber}%";
                    $parameters['bind']['SearchPhrase8'] = $matches[0][0];
                } elseif ($extensionsLength !== strlen($matches[0][0]) && $extensionsLength === strlen($matches[0][1])) {

                    $seekNumber                          = substr($matches[0][0], -9);
                    $parameters['conditions']            .= '(src_num LIKE :SearchPhrase1: AND dst_num = :SearchPhrase2:)';
                    $parameters['conditions']            .= ' OR (src_num = :SearchPhrase3: AND dst_num LIKE :SearchPhrase4:)';
                    $parameters['conditions']            .= ' OR (src_num LIKE :SearchPhrase5: AND did = :SearchPhrase6:)';
                    $parameters['conditions']            .= ' OR (src_num = :SearchPhrase8: AND did LIKE :SearchPhrase7:)';
                    $parameters['bind']['SearchPhrase1'] = "%{$seekNumber}%";
                    $parameters['bind']['SearchPhrase2'] = $matches[0][1];
                    $parameters['bind']['SearchPhrase3'] = $matches[0][1];
                    $parameters['bind']['SearchPhrase4'] = "%{$seekNumber}%";
                    $parameters['bind']['SearchPhrase5'] = "%{$seekNumber}%";
                    $parameters['bind']['SearchPhrase6'] = $matches[0][1];
                    $parameters['bind']['SearchPhrase7'] = "%{$seekNumber}%";
                    $parameters['bind']['SearchPhrase8'] = $matches[0][1];
                } else {
                    $seekNumber0                         = substr($matches[0][0], -9);
                    $seekNumber1                         = substr($matches[0][1], -9);
                    $parameters['conditions']            .= '(src_num LIKE :SearchPhrase1: AND dst_num LIKE :SearchPhrase2:)';
                    $parameters['conditions']            .= ' OR (src_num LIKE :SearchPhrase3: AND dst_num LIKE :SearchPhrase4:)';
                    $parameters['conditions']            .= ' OR (src_num LIKE :SearchPhrase5: AND did LIKE :SearchPhrase6:)';
                    $parameters['conditions']            .= ' OR (src_num LIKE :SearchPhrase7: AND did LIKE :SearchPhrase8:)';
                    $parameters['bind']['SearchPhrase1'] = "%{$seekNumber0}%";
                    $parameters['bind']['SearchPhrase2'] = "%{$seekNumber1}%";
                    $parameters['bind']['SearchPhrase3'] = "%{$seekNumber1}%";
                    $parameters['bind']['SearchPhrase4'] = "%{$seekNumber0}%";
                    $parameters['bind']['SearchPhrase5'] = "%{$seekNumber0}%";
                    $parameters['bind']['SearchPhrase6'] = "%{$seekNumber1}%";
                    $parameters['bind']['SearchPhrase7'] = "%{$seekNumber1}%";
                    $parameters['bind']['SearchPhrase8'] = "%{$seekNumber0}%";
                }
                $searchPhrase = str_replace([$matches[0][0], $matches[0][1]], '', $searchPhrase);
            }
            if ($needCloseAnd) {
                $parameters['conditions'] .= ')';
            }


        }
    }
}