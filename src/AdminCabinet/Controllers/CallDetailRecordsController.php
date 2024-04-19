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

namespace MikoPBX\AdminCabinet\Controllers;

use DateTime;
use MikoPBX\Common\Providers\PBXConfModulesProvider;
use MikoPBX\Modules\Config\CDRConfigInterface;
use MikoPBX\Common\Models\{PbxSettings, PbxSettingsConstants};
use MikoPBX\Common\Providers\CDRDatabaseProvider;

class CallDetailRecordsController extends BaseController
{


    /**
     * Retrieves records from the call log.
     *
     * @return void
     */
    public function indexAction(): void
    {
    }

    /**
     * Requests new package of call history records for DataTable JSON.
     *
     * @return void
     */
    public function getNewRecordsAction(): void
    {
        $currentPage = $this->request->getPost('draw');
        $position = $this->request->getPost('start');
        $recordsPerPage = $this->request->getPost('length');
        $searchPhrase = $this->request->getPost('search');
        $this->view->draw = $currentPage;
        $this->view->recordsFiltered = 0;
        $this->view->data = [];

        $parameters = [];
        $parameters['columns'] = 'COUNT(DISTINCT(linkedid)) as rows';
        // Count the number of unique calls considering filters
        if (!empty($searchPhrase['value'])) {
            $this->prepareConditionsForSearchPhrases($searchPhrase['value'], $parameters);
            // If we couldn't understand the search phrase, return empty result
            if (empty($parameters['conditions'])) {
                return;
            }
        }
        $recordsFilteredReq = $this->selectCDRRecordsWithFilters($parameters);
        $this->view->recordsFiltered = $recordsFilteredReq[0]['rows'] ?? 0;

        // Find all LinkedIDs that match the specified filter
        $parameters['columns'] = 'DISTINCT(linkedid) as linkedid';
        $parameters['order'] = ['start desc'];
        $parameters['limit'] = $recordsPerPage;
        $parameters['offset'] = $position;

        $selectedLinkedIds = $this->selectCDRRecordsWithFilters($parameters);
        $arrIDS = [];
        foreach ($selectedLinkedIds as $item) {
            $arrIDS[] = $item['linkedid'];
        }
        if (empty($arrIDS)) {
            return;
        }

        // Retrieve all detailed records for processing and merging
        if (count($arrIDS) === 1) {
            $parameters = [
                'conditions' => 'linkedid = :ids:',
                'columns' => 'id, disposition, start, src_num, dst_num, billsec, recordingfile, did, dst_chan, linkedid, is_app, verbose_call_id',
                'bind' => [
                    'ids' => $arrIDS[0],
                ],
                'order' => ['linkedid desc', 'start asc', 'id asc'],
            ];
        } else {
            $parameters = [
                'conditions' => 'linkedid IN ({ids:array})',
                'columns' => 'id, disposition, start, src_num, dst_num, billsec, recordingfile, did, dst_chan, linkedid, is_app, verbose_call_id',
                'bind' => [
                    'ids' => $arrIDS,
                ],
                'order' => ['linkedid desc', 'start asc', 'id asc'],
            ];
        }

        $selectedRecords = $this->selectCDRRecordsWithFilters($parameters);
        $arrCdr = [];
        $objectLinkedCallRecord = (object)[
            'linkedid' => '',
            'disposition' => '',
            'start' => '',
            'src_num' => '',
            'dst_num' => '',
            'billsec' => 0,
            'answered' => [],
            'detail' => [],
            'ids' => [],
        ];

        foreach ($selectedRecords as $arrRecord) {
            $record = (object)$arrRecord;
            if (!array_key_exists($record->linkedid, $arrCdr)) {
                $arrCdr[$record->linkedid] = clone $objectLinkedCallRecord;
            }
            if ($record->is_app !== '1'
                && $record->billsec > 0
                && ($record->disposition === 'ANSWER' || $record->disposition === 'ANSWERED')) {
                $disposition = 'ANSWERED';
            } else {
                $disposition = 'NOANSWER';
            }
            $linkedRecord = $arrCdr[$record->linkedid];
            $linkedRecord->linkedid = $record->linkedid;
            $linkedRecord->disposition = $linkedRecord->disposition !== 'ANSWERED' ? $disposition : 'ANSWERED';
            $linkedRecord->start = $linkedRecord->start === '' ? $record->start : $linkedRecord->start;
            $linkedRecord->src_num = $linkedRecord->src_num === '' ? $record->src_num : $linkedRecord->src_num;
            if (!empty($record->did)) {
                $linkedRecord->dst_num = $record->did;
            } else {
                $linkedRecord->dst_num = $linkedRecord->dst_num === '' ? $record->dst_num : $linkedRecord->dst_num;
            }
            $linkedRecord->billsec += (int)$record->billsec;
            $isAppWithRecord = ($record->is_app === '1' && file_exists($record->recordingfile));
            if ($disposition === 'ANSWERED' || $isAppWithRecord) {
                $linkedRecord->answered[] = [
                    'id' => $record->id,
                    'src_num' => $record->src_num,
                    'dst_num' => $record->dst_num,
                    'recordingfile' => $record->recordingfile,
                ];
            }
            $linkedRecord->detail[] = $record;
            if (!empty($record->verbose_call_id)) {
                $linkedRecord->ids[] = $record->verbose_call_id;
            }
        }
        $output = [];
        foreach ($arrCdr as $cdr) {
            $timing = gmdate($cdr->billsec < 3600 ? 'i:s' : 'G:i:s', $cdr->billsec);
            $additionalClass = (empty($cdr->answered))?'ui':'detailed';
            $output[] = [
                date('d-m-Y H:i:s', strtotime($cdr->start)),
                $cdr->src_num,
                $cdr->dst_num,
                $timing === '00:00' ? '' : $timing,
                $cdr->answered,
                $cdr->disposition,
                'DT_RowId' => $cdr->linkedid,
                'DT_RowClass' => trim($additionalClass.' '.('NOANSWER' === $cdr->disposition ? 'negative' : '')),
                'ids' => rawurlencode(implode('&', array_unique($cdr->ids))),
            ];
        }

        $this->view->data = $output;
    }

    /**
     * Prepares query parameters for filtering CDR records.
     *
     * @param string $searchPhrase The search phrase entered by the user.
     * @param array $parameters The CDR query parameters.
     * @return void
     */
    private function prepareConditionsForSearchPhrases(string &$searchPhrase, array &$parameters): void
    {
        $parameters['conditions'] = '';

        // Search the linkedid, if we found it on the search string we will ignore all other parameters
        if (preg_match_all("/mikopbx-\d+.\d+/", $searchPhrase, $matches) && count($matches[0]) === 1) {
            $parameters['conditions'] = 'linkedid = :SearchPhrase:';
            $parameters['bind']['SearchPhrase'] = $matches[0][0];

            return;
        }

        // Search date ranges
        if (preg_match_all("/\d{2}\/\d{2}\/\d{4}/", $searchPhrase, $matches)) {
            if (count($matches[0]) === 1) {
                $date = DateTime::createFromFormat('d/m/Y', $matches[0][0]);
                $requestedDate = $date->format('Y-m-d');
                $tomorrowDate = $date->modify('+1 day')->format('Y-m-d');
                $parameters['conditions'] .= 'start BETWEEN :dateFromPhrase1: AND :dateFromPhrase2:';
                $parameters['bind']['dateFromPhrase1'] = $requestedDate;
                $parameters['bind']['dateFromPhrase2'] = $tomorrowDate;
                $searchPhrase = str_replace($matches[0][0], "", $searchPhrase);
            } elseif (count($matches[0]) === 2) {
                $parameters['conditions'] .= 'start BETWEEN :dateFromPhrase1: AND :dateFromPhrase2:';
                $date = DateTime::createFromFormat('d/m/Y', $matches[0][0]);
                $requestedDate = $date->format('Y-m-d');
                $parameters['bind']['dateFromPhrase1'] = $requestedDate;
                $date = DateTime::createFromFormat('d/m/Y', $matches[0][1]);
                $tomorrowDate = $date->modify('+1 day')->format('Y-m-d');
                $parameters['bind']['dateFromPhrase2'] = $tomorrowDate;
                $searchPhrase = str_replace(
                    [$matches[0][0], $matches[0][1]],
                    '',
                    $searchPhrase
                );
            }
        }

        // Search phone numbers
        $searchPhrase = str_replace(['(', ')', '-', '+'], '', $searchPhrase);

        if (preg_match_all("/\d+/", $searchPhrase, $matches)) {
            $needCloseAnd = false;
            $extensionsLength = PbxSettings::getValueByKey(PbxSettingsConstants::PBX_INTERNAL_EXTENSION_LENGTH);
            if ($parameters['conditions'] !== '') {
                $parameters['conditions'] .= ' AND (';
                $needCloseAnd = true;
            }
            if (count($matches[0]) === 1) {
                if ($extensionsLength === strlen($matches[0][0])) {
                    $parameters['conditions'] .= 'src_num = :SearchPhrase1: OR dst_num = :SearchPhrase2:';
                    $parameters['bind']['SearchPhrase1'] = $matches[0][0];
                    $parameters['bind']['SearchPhrase2'] = $matches[0][0];
                } else {
                    $seekNumber = substr($matches[0][0], -9);
                    $parameters['conditions'] .= 'src_num LIKE :SearchPhrase1: OR dst_num LIKE :SearchPhrase2: OR did LIKE :SearchPhrase3:';
                    $parameters['bind']['SearchPhrase1'] = "%{$seekNumber}%";
                    $parameters['bind']['SearchPhrase2'] = "%{$seekNumber}%";
                    $parameters['bind']['SearchPhrase3'] = "%{$seekNumber}%";
                }

                $searchPhrase = str_replace($matches[0][0], '', $searchPhrase);
            } elseif (count($matches[0]) === 2) {
                if ($extensionsLength === strlen($matches[0][0]) && $extensionsLength === strlen($matches[0][1])) {
                    $parameters['conditions'] .= '(src_num = :SearchPhrase1: AND dst_num = :SearchPhrase2:)';
                    $parameters['conditions'] .= ' OR (src_num = :SearchPhrase3: AND dst_num = :SearchPhrase4:)';
                    $parameters['conditions'] .= ' OR (src_num = :SearchPhrase5: AND did = :SearchPhrase6:)';
                    $parameters['conditions'] .= ' OR (src_num = :SearchPhrase8: AND did = :SearchPhrase7:)';
                    $parameters['bind']['SearchPhrase1'] = $matches[0][0];
                    $parameters['bind']['SearchPhrase2'] = $matches[0][1];
                    $parameters['bind']['SearchPhrase3'] = $matches[0][1];
                    $parameters['bind']['SearchPhrase4'] = $matches[0][0];
                    $parameters['bind']['SearchPhrase5'] = $matches[0][1];
                    $parameters['bind']['SearchPhrase6'] = $matches[0][0];
                    $parameters['bind']['SearchPhrase7'] = $matches[0][1];
                    $parameters['bind']['SearchPhrase8'] = $matches[0][0];
                } elseif ($extensionsLength === strlen($matches[0][0]) && $extensionsLength !== strlen(
                        $matches[0][1]
                    )) {
                    $seekNumber = substr($matches[0][1], -9);
                    $parameters['conditions'] .= '(src_num = :SearchPhrase1: AND dst_num LIKE :SearchPhrase2:)';
                    $parameters['conditions'] .= ' OR (src_num LIKE :SearchPhrase3: AND dst_num = :SearchPhrase4:)';
                    $parameters['conditions'] .= ' OR (src_num LIKE :SearchPhrase5: AND did = :SearchPhrase6:)';
                    $parameters['conditions'] .= ' OR (src_num = :SearchPhrase8: AND did LIKE :SearchPhrase7:)';
                    $parameters['bind']['SearchPhrase1'] = $matches[0][0];
                    $parameters['bind']['SearchPhrase2'] = "%{$seekNumber}%";
                    $parameters['bind']['SearchPhrase3'] = "%{$seekNumber}%";
                    $parameters['bind']['SearchPhrase4'] = $matches[0][0];
                    $parameters['bind']['SearchPhrase5'] = "%{$seekNumber}%";
                    $parameters['bind']['SearchPhrase6'] = $matches[0][0];
                    $parameters['bind']['SearchPhrase7'] = "%{$seekNumber}%";
                    $parameters['bind']['SearchPhrase8'] = $matches[0][0];
                } elseif ($extensionsLength !== strlen($matches[0][0]) && $extensionsLength === strlen(
                        $matches[0][1]
                    )) {
                    $seekNumber = substr($matches[0][0], -9);
                    $parameters['conditions'] .= '(src_num LIKE :SearchPhrase1: AND dst_num = :SearchPhrase2:)';
                    $parameters['conditions'] .= ' OR (src_num = :SearchPhrase3: AND dst_num LIKE :SearchPhrase4:)';
                    $parameters['conditions'] .= ' OR (src_num LIKE :SearchPhrase5: AND did = :SearchPhrase6:)';
                    $parameters['conditions'] .= ' OR (src_num = :SearchPhrase8: AND did LIKE :SearchPhrase7:)';
                    $parameters['bind']['SearchPhrase1'] = "%{$seekNumber}%";
                    $parameters['bind']['SearchPhrase2'] = $matches[0][1];
                    $parameters['bind']['SearchPhrase3'] = $matches[0][1];
                    $parameters['bind']['SearchPhrase4'] = "%{$seekNumber}%";
                    $parameters['bind']['SearchPhrase5'] = "%{$seekNumber}%";
                    $parameters['bind']['SearchPhrase6'] = $matches[0][1];
                    $parameters['bind']['SearchPhrase7'] = "%{$seekNumber}%";
                    $parameters['bind']['SearchPhrase8'] = $matches[0][1];
                } else {
                    $seekNumber0 = substr($matches[0][0], -9);
                    $seekNumber1 = substr($matches[0][1], -9);
                    $parameters['conditions'] .= '(src_num LIKE :SearchPhrase1: AND dst_num LIKE :SearchPhrase2:)';
                    $parameters['conditions'] .= ' OR (src_num LIKE :SearchPhrase3: AND dst_num LIKE :SearchPhrase4:)';
                    $parameters['conditions'] .= ' OR (src_num LIKE :SearchPhrase5: AND did LIKE :SearchPhrase6:)';
                    $parameters['conditions'] .= ' OR (src_num LIKE :SearchPhrase7: AND did LIKE :SearchPhrase8:)';
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
            } elseif (count($matches[0]) > 2) {
                $searchPhrase = str_replace([' ', '  '], '', $searchPhrase);
                $parameters['conditions'] .= 'src_num = :SearchPhrase1: OR dst_num = :SearchPhrase2:';
                $parameters['bind']['SearchPhrase1'] = $searchPhrase;
                $parameters['bind']['SearchPhrase2'] = $searchPhrase;
            }
            if ($needCloseAnd) {
                $parameters['conditions'] .= ')';
            }
        }
    }

    /**
     * Select CDR records with filters based on the provided parameters.
     *
     * @param array $parameters The parameters for filtering CDR records.
     * @return array The selected CDR records.
     */
    private function selectCDRRecordsWithFilters(array $parameters): array
    {
        // Apply ACL filters to CDR query using hook method
        PBXConfModulesProvider::hookModulesMethod(CDRConfigInterface::APPLY_ACL_FILTERS_TO_CDR_QUERY, [&$parameters]);

        // Retrieve CDR records based on the filtered parameters
        return CDRDatabaseProvider::getCdr($parameters);
    }
}