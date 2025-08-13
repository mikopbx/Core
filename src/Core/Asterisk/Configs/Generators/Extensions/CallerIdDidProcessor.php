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

namespace MikoPBX\Core\Asterisk\Configs\Generators\Extensions;

use MikoPBX\Common\Models\Sip;
use MikoPBX\Core\System\SystemMessages;

/**
 * Class CallerIdDidProcessor
 * Generates dialplan for processing CallerID and DID from various SIP headers
 * 
 * @package MikoPBX\Core\Asterisk\Configs\Generators\Extensions
 */
class CallerIdDidProcessor
{
    /**
     * Provider uniqid
     */
    private string $providerId;
    
    /**
     * Provider settings from database
     * @var array<string, mixed>
     */
    private array $providerSettings;
    
    /**
     * Whether to enable debug output
     */
    private bool $debugMode = false;
    
    /**
     * Constructor
     * 
     * @param string $providerId Provider unique ID
     * @param array<string, mixed> $providerSettings Provider configuration array
     */
    public function __construct(string $providerId, array $providerSettings)
    {
        $this->providerId = $providerId;
        $this->providerSettings = $providerSettings;
        $this->debugMode = ($providerSettings['cid_did_debug'] ?? '0') === '1';
    }
    
    /**
     * Generate system context for CallerID and DID processing
     * 
     * @return string Generated dialplan context
     */
    public function generateIncomingProcessingContext(): string
    {
        $contextName = "{$this->providerId}-incoming-cid-did";
        $dialplan = "[{$contextName}]\n";
        
        // Main extension pattern - matches any extension
        $dialplan .= "exten => _[0-9*#+a-zA-Z][0-9*#+a-zA-Z]!,1,NoOp(=== CallerID/DID Processing for provider {$this->providerId} ===)\n";
        
        if ($this->debugMode) {
            $dialplan .= "\tsame => n,NoOp(Original CALLERID(num)=\${CALLERID(num)})\n";
            $dialplan .= "\tsame => n,NoOp(Original EXTEN=\${EXTEN})\n";
        }
        
        // Process CallerID
        $dialplan .= $this->generateCallerIdProcessing();
        
        // Process DID
        $dialplan .= $this->generateDidProcessing();
        
        if ($this->debugMode) {
            $dialplan .= "\tsame => n,NoOp(Final CALLERID(num)=\${CALLERID(num)})\n";
            $dialplan .= "\tsame => n,NoOp(Final EXTEN=\${EXTEN})\n";
        }
        
        // Return to main processing
        $dialplan .= "\tsame => n,Return()\n\n";
        
        return $dialplan;
    }
    
    /**
     * Generate CallerID processing logic based on source configuration
     * 
     * @return string Dialplan fragment for CallerID processing
     */
    private function generateCallerIdProcessing(): string
    {
        $dialplan = "";
        $callerIdSource = $this->providerSettings['cid_source'] ?? Sip::CALLERID_SOURCE_DEFAULT;
        
        switch ($callerIdSource) {
            case Sip::CALLERID_SOURCE_FROM:
                $dialplan .= $this->generateCallerIdFromHeader('From');
                break;
                
            case Sip::CALLERID_SOURCE_RPID:
                $dialplan .= $this->generateCallerIdFromHeader('Remote-Party-ID');
                break;
                
            case Sip::CALLERID_SOURCE_PAI:
                $dialplan .= $this->generateCallerIdFromHeader('P-Asserted-Identity');
                break;
                
            case Sip::CALLERID_SOURCE_CUSTOM:
                $dialplan .= $this->generateCallerIdFromCustomHeader();
                break;
                
            case Sip::CALLERID_SOURCE_DEFAULT:
            default:
                // No processing, use default Asterisk behavior
                if ($this->debugMode) {
                    $dialplan .= "\tsame => n,NoOp(CallerID source: DEFAULT - no processing)\n";
                }
                break;
        }
        
        return $dialplan;
    }
    
    /**
     * Generate CallerID extraction from standard SIP headers
     * 
     * @param string $headerName SIP header name
     * @return string Dialplan fragment
     */
    private function generateCallerIdFromHeader(string $headerName): string
    {
        $dialplan = "";
        
        if ($this->debugMode) {
            $dialplan .= "\tsame => n,NoOp(CallerID source: {$headerName})\n";
        }
        
        // Read header value
        $dialplan .= "\tsame => n,Set(tmpCidHeader=\${PJSIP_HEADER(read,{$headerName})})\n";
        
        if ($this->debugMode) {
            $dialplan .= "\tsame => n,NoOp(Raw header value: \${tmpCidHeader})\n";
        }
        
        // Check if header exists
        $dialplan .= "\tsame => n,ExecIf(\$[\"x\${tmpCidHeader}\" != \"x\"]?Gosub(sub-extract-callerid,s,1(\${tmpCidHeader})))\n";
        
        return $dialplan;
    }
    
    /**
     * Generate CallerID extraction from custom header
     * 
     * @return string Dialplan fragment
     */
    private function generateCallerIdFromCustomHeader(): string
    {
        $dialplan = "";
        $customHeader = $this->providerSettings['cid_custom_header'] ?? '';
        
        if (empty($customHeader)) {
            SystemMessages::sysLogMsg(__CLASS__, "Custom CallerID header not configured for provider {$this->providerId}", LOG_WARNING);
            return $dialplan;
        }
        
        if ($this->debugMode) {
            $dialplan .= "\tsame => n,NoOp(CallerID source: CUSTOM header {$customHeader})\n";
        }
        
        // Read custom header
        $dialplan .= "\tsame => n,Set(tmpCidHeader=\${PJSIP_HEADER(read,{$customHeader})})\n";
        
        if ($this->debugMode) {
            $dialplan .= "\tsame => n,NoOp(Custom header value: \${tmpCidHeader})\n";
        }
        
        // Parse using configured delimiters or regex
        if (!empty($this->providerSettings['cid_parser_regex'])) {
            // Use regex parser
            $regex = $this->providerSettings['cid_parser_regex'];
            $dialplan .= "\tsame => n,ExecIf(\$[\"x\${tmpCidHeader}\" != \"x\"]?Set(fromCid=\${REGEX(\"{$regex}\" \${tmpCidHeader})}))\n";
        } elseif (!empty($this->providerSettings['cid_parser_start']) || !empty($this->providerSettings['cid_parser_end'])) {
            // Use delimiter parser
            $start = $this->providerSettings['cid_parser_start'] ?? '';
            $end = $this->providerSettings['cid_parser_end'] ?? '';
            
            if (!empty($start) && !empty($end)) {
                $dialplan .= "\tsame => n,ExecIf(\$[\"x\${tmpCidHeader}\" != \"x\"]?Set(fromCid=\${CUT(CUT(tmpCidHeader,{$start},2),{$end},1)}))\n";
            } elseif (!empty($start)) {
                $dialplan .= "\tsame => n,ExecIf(\$[\"x\${tmpCidHeader}\" != \"x\"]?Set(fromCid=\${CUT(tmpCidHeader,{$start},2)}))\n";
            } elseif (!empty($end)) {
                $dialplan .= "\tsame => n,ExecIf(\$[\"x\${tmpCidHeader}\" != \"x\"]?Set(fromCid=\${CUT(tmpCidHeader,{$end},1)}))\n";
            }
        } else {
            // Use raw value
            $dialplan .= "\tsame => n,ExecIf(\$[\"x\${tmpCidHeader}\" != \"x\"]?Set(fromCid=\${tmpCidHeader}))\n";
        }
        
        // Set CallerID if extracted
        $dialplan .= "\tsame => n,ExecIf(\$[\"x\${fromCid}\" != \"x\"]?Set(CALLERID(num)=\${fromCid}))\n";
        $dialplan .= "\tsame => n,ExecIf(\$[\"x\${fromCid}\" != \"x\"]?Set(CALLERID(name)=\${fromCid}))\n";
        
        return $dialplan;
    }
    
    /**
     * Generate DID processing logic based on source configuration
     * 
     * @return string Dialplan fragment for DID processing
     */
    private function generateDidProcessing(): string
    {
        $dialplan = "";
        $didSource = $this->providerSettings['did_source'] ?? Sip::DID_SOURCE_DEFAULT;
        
        switch ($didSource) {
            case Sip::DID_SOURCE_TO:
                $dialplan .= $this->generateDidFromTo();
                break;
                
            case Sip::DID_SOURCE_DIVERSION:
                $dialplan .= $this->generateDidFromDiversion();
                break;
                
            case Sip::DID_SOURCE_CUSTOM:
                $dialplan .= $this->generateDidFromCustomHeader();
                break;
                
            case Sip::DID_SOURCE_DEFAULT:
            default:
                // No processing, use default EXTEN
                if ($this->debugMode) {
                    $dialplan .= "\tsame => n,NoOp(DID source: DEFAULT - no processing)\n";
                }
                break;
        }
        
        return $dialplan;
    }
    
    /**
     * Generate DID extraction from To header
     * 
     * @return string Dialplan fragment
     */
    private function generateDidFromTo(): string
    {
        $dialplan = "";
        
        if ($this->debugMode) {
            $dialplan .= "\tsame => n,NoOp(DID source: TO header)\n";
        }
        
        // Extract user part from To header using PJSIP_PARSE_URI
        $dialplan .= "\tsame => n,Set(toNum=\${PJSIP_PARSE_URI(\${PJSIP_HEADER(read,To)},user)})\n";
        
        if ($this->debugMode) {
            $dialplan .= "\tsame => n,NoOp(Extracted DID from To: \${toNum})\n";
        }
        
        // If extracted DID differs from current EXTEN, redirect call
        $dialplan .= "\tsame => n,ExecIf(\$[\"x\${toNum}\" != \"x\" && \"\${toNum}\" != \"\${EXTEN}\"]?Goto(\${CUT(CONTEXT,-,1-2)},\${toNum},1))\n";
        
        return $dialplan;
    }
    
    /**
     * Generate DID extraction from Diversion header
     * 
     * @return string Dialplan fragment
     */
    private function generateDidFromDiversion(): string
    {
        $dialplan = "";
        
        if ($this->debugMode) {
            $dialplan .= "\tsame => n,NoOp(DID source: DIVERSION header)\n";
        }
        
        // Read Diversion header
        $dialplan .= "\tsame => n,Set(tmpDiversion=\${PJSIP_HEADER(read,Diversion)})\n";
        
        if ($this->debugMode) {
            $dialplan .= "\tsame => n,NoOp(Diversion header: \${tmpDiversion})\n";
        }
        
        // Extract DID from Diversion header
        // First try PJSIP_PARSE_URI, then fallback to CUT method
        $dialplan .= "\tsame => n,ExecIf(\$[\"x\${tmpDiversion}\" != \"x\"]?Set(divNum=\${PJSIP_PARSE_URI(\${tmpDiversion},user)}))\n";
        
        // Fallback: extract using CUT if PJSIP_PARSE_URI didn't work
        $dialplan .= "\tsame => n,ExecIf(\$[\"x\${divNum}\" == \"x\" && \"x\${tmpDiversion}\" != \"x\"]?Set(divNum=\${CUT(CUT(tmpDiversion,@,1),:,2)}))\n";
        
        if ($this->debugMode) {
            $dialplan .= "\tsame => n,NoOp(Extracted DID from Diversion: \${divNum})\n";
        }
        
        // If extracted DID differs from current EXTEN, redirect call
        $dialplan .= "\tsame => n,ExecIf(\$[\"x\${divNum}\" != \"x\" && \"\${divNum}\" != \"\${EXTEN}\"]?Goto(\${CUT(CONTEXT,-,1-2)},\${divNum},1))\n";
        
        return $dialplan;
    }
    
    /**
     * Generate DID extraction from custom header
     * 
     * @return string Dialplan fragment
     */
    private function generateDidFromCustomHeader(): string
    {
        $dialplan = "";
        $customHeader = $this->providerSettings['did_custom_header'] ?? '';
        
        if (empty($customHeader)) {
            SystemMessages::sysLogMsg(__CLASS__, "Custom DID header not configured for provider {$this->providerId}", LOG_WARNING);
            return $dialplan;
        }
        
        if ($this->debugMode) {
            $dialplan .= "\tsame => n,NoOp(DID source: CUSTOM header {$customHeader})\n";
        }
        
        // Read custom header
        $dialplan .= "\tsame => n,Set(tmpDidHeader=\${PJSIP_HEADER(read,{$customHeader})})\n";
        
        if ($this->debugMode) {
            $dialplan .= "\tsame => n,NoOp(Custom DID header value: \${tmpDidHeader})\n";
        }
        
        // Parse using configured delimiters or regex
        if (!empty($this->providerSettings['did_parser_regex'])) {
            // Use regex parser
            $regex = $this->providerSettings['did_parser_regex'];
            $dialplan .= "\tsame => n,ExecIf(\$[\"x\${tmpDidHeader}\" != \"x\"]?Set(didNum=\${REGEX(\"{$regex}\" \${tmpDidHeader})}))\n";
        } elseif (!empty($this->providerSettings['did_parser_start']) || !empty($this->providerSettings['did_parser_end'])) {
            // Use delimiter parser
            $start = $this->providerSettings['did_parser_start'] ?? '';
            $end = $this->providerSettings['did_parser_end'] ?? '';
            
            if (!empty($start) && !empty($end)) {
                $dialplan .= "\tsame => n,ExecIf(\$[\"x\${tmpDidHeader}\" != \"x\"]?Set(didNum=\${CUT(CUT(tmpDidHeader,{$start},2),{$end},1)}))\n";
            } elseif (!empty($start)) {
                $dialplan .= "\tsame => n,ExecIf(\$[\"x\${tmpDidHeader}\" != \"x\"]?Set(didNum=\${CUT(tmpDidHeader,{$start},2)}))\n";
            } elseif (!empty($end)) {
                $dialplan .= "\tsame => n,ExecIf(\$[\"x\${tmpDidHeader}\" != \"x\"]?Set(didNum=\${CUT(tmpDidHeader,{$end},1)}))\n";
            }
        } else {
            // Use raw value
            $dialplan .= "\tsame => n,ExecIf(\$[\"x\${tmpDidHeader}\" != \"x\"]?Set(didNum=\${tmpDidHeader}))\n";
        }
        
        if ($this->debugMode) {
            $dialplan .= "\tsame => n,NoOp(Extracted custom DID: \${didNum})\n";
        }
        
        // If extracted DID differs from current EXTEN, redirect call
        $dialplan .= "\tsame => n,ExecIf(\$[\"x\${didNum}\" != \"x\" && \"\${didNum}\" != \"\${EXTEN}\"]?Goto(\${CUT(CONTEXT,-,1-2)},\${didNum},1))\n";
        
        return $dialplan;
    }
    
    /**
     * Generate subroutine for extracting CallerID from SIP URI
     * This is a shared subroutine used by multiple CallerID extraction methods
     * 
     * @return string Dialplan subroutine
     */
    public static function generateCallerIdExtractionSubroutine(): string
    {
        $dialplan = "[sub-extract-callerid]\n";
        $dialplan .= "exten => s,1,NoOp(Extracting CallerID from: \${ARG1})\n";
        
        // Try to extract using PJSIP_PARSE_URI first
        $dialplan .= "\tsame => n,Set(fromCid=\${PJSIP_PARSE_URI(\${ARG1},user)})\n";
        
        // If PJSIP_PARSE_URI didn't work, try CUT method for sip: URIs
        $dialplan .= "\tsame => n,ExecIf(\$[\"x\${fromCid}\" == \"x\" && \"\${ARG1}\" : \"sip:\"]?Set(fromCid=\${CUT(CUT(ARG1,@,1),:,2)}))\n";
        
        // For tel: URIs, extract number after tel:
        $dialplan .= "\tsame => n,ExecIf(\$[\"x\${fromCid}\" == \"x\" && \"\${ARG1}\" : \"tel:\"]?Set(fromCid=\${CUT(CUT(ARG1,>,1),:,2)}))\n";
        
        // Clean up extracted number (remove < > characters if present)
        $dialplan .= "\tsame => n,Set(fromCid=\${FILTER(+0123456789,\${fromCid})})\n";
        
        // Set CallerID if successfully extracted
        $dialplan .= "\tsame => n,ExecIf(\$[\"x\${fromCid}\" != \"x\"]?Set(CALLERID(num)=\${fromCid}))\n";
        $dialplan .= "\tsame => n,ExecIf(\$[\"x\${fromCid}\" != \"x\"]?Set(CALLERID(name)=\${fromCid}))\n";
        $dialplan .= "\tsame => n,Return()\n\n";
        
        return $dialplan;
    }
}