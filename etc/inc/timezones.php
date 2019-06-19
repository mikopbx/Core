<?php
/**
 * Copyright © MIKO LLC - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited
 * Proprietary and confidential
 * Written by Alexey Portnov, 12 2018
 */

$tz = array();
$tmp = gettext("Africa");
$tz["Africa/Maputo"] 		= array($tmp . ", " . gettext("Mozambique"), "UTC-2", "Africa/Maputo", "", "+2");

$tmp = gettext("Asia");
$tz["Asia/China"] 	 		= array($tmp . ", " . gettext("China"), "UTC-8", "Asia/China", "CHN+7", "+8", "China(Beijing)", "GMT-8.Asia/Shanghai");
$tz["Asia/Jakarta"] 		= array($tmp . ", " . gettext("Jakarta"), "WIB-7", "Asia/Jakarta", "CHN+7", "+7");
$tz["Asia/Singapore"] 		= array($tmp . ", " . gettext("Singapore"), "SGT-8", "Asia/Singapore", "SGP+8", "+8", "Singapore(Singapore)", "GMT-8.Asia/Taipei");
$tz["Asia/Ulaanbaatar"] 	= array($tmp . ", " . gettext("Ulaanbaatar, Mongolia"), "ULAT-8ULAST,M3.5.0/2,M9.5.0/2", "Asia/Ulaanbaatar");
$tz["Asia/Tokyo"] 			= array($tmp . ", " . gettext("Tokyo, Japan"), "JST", "Asia/Tokyo", "JPN+9", "+9", "Japan(Tokyo)", "GMT-9.Asia/Tokyo");
$tz["Asia/Riyadh"] 			= array($tmp . ", " . gettext("Riyadh, Saudi Arabia"), "AST-3", "Asia/Riyadh", "EAT+3", "+3", "Saudi Arabia(Riyadh)", "GMT-3.Asia/Kuwait");
$tz["Asia/Kabul"] 			= array($tmp . ", " . gettext("Kabul, Afghanistan"), "AFT-4:30", "Asia/Kabul", "", "+4:30", "Afghanistan(Kabul)");
$tz["Asia/Karachi"] 		= array($tmp . ", " . gettext("Islamabad, Pakistan"), "UTC-5", "Asia/Karachi", "PAK+5", "+5", "Pakistan(Islamabad)", "GMT-5.Asia/Karachi");
$tz["Asia/Yekaterinburg"] 	= array($tmp . ", " . gettext("Yekaterinburg, Russia, MSK+2"), "YEKT", "Asia/Yekaterinburg", "RUS+5", "+5", "Russia(Yekaterinburg)", "GMT-5.Asia/Yekaterinburg");
$tz["Asia/Omsk"] 			= array($tmp . ", " . gettext("Omsk, Russia, MSK+3"), "OMST", "Asia/Omsk", "RUS+6", "+6", "Russia(Omsk)", "GMT-6.Asia/Almaty");
$tz["Asia/Krasnoyarsk"] 	= array($tmp . ", " . gettext("Krasnoyarsk, Russia, MSK+4"), "KRAT", "Asia/Krasnoyarsk", "RUS+7", "+7", "Russia(Krasnoyarsk)", "GMT-7.Asia/Krasnoyarsk");
$tz["Asia/Irkutsk"] 		= array($tmp . ", " . gettext("Irkutsk, Russia, MSK+5"), "IRKT", "Asia/Irkutsk", "RUS+8", "+8", "Russia(Irkutsk)", "GMT-8.Asia/Irkutsk");
$tz["Asia/Yakutsk"] 		= array($tmp . ", " . gettext("Yakutsk, Russia, MSK+6"), "YAKT", "Asia/Yakutsk", "RUS+9", "+9", "Russia(Yakutsk)", "GMT-9.Asia/Yakutsk");
$tz["Asia/Vladivostok"] 	= array($tmp . ", " . gettext("Vladivostok, Russia, MSK+7"), "VLAT", "Asia/Vladivostok", "RUS+10", "+10", "Russia(Vladivostok)", "GMT-10.Asia/Vladivostok");
$tz["Asia/Srednekolymsk"] 	= array($tmp . ", " . gettext("Srednekolymsk, Russia, MSK+8"), "SRET", "Asia/Srednekolymsk", "RUS+11", "+11", "Russia(Srednekolymsk)");
$tz["Asia/Kamchatka"] 		= array($tmp . ", " . gettext("Kamchatka, Russia, MSK+9"), "PETT", "Asia/Kamchatka", "RUS+12", "+12", "Russia(Kamchatka)", "GMT-12.Pacific/Auckland");

$tmp = gettext("Australia");
$tz["Australia/Adelaide"] 	= array($tmp . ", " . gettext("Adelaide"), "CST-9:30CDT-10:30,M10.5.0/02:00:00,M3.5.0/03:00:00", "Australia/Adelaide", "AUS+9.5", "+9:30", "Australia(Adelaide)");
$tz["Australia/Brisbane"] 	= array($tmp . ", " . gettext("Brisbane"), "EST-10", "Australia/Brisbane", "AUS+10", "+10", "Australia(Brisbane)", "GMT-10.Australia/Sydney");
$tz["Australia/Canberra"] 	= array($tmp . ", " . gettext("Canberra"), "EST-10EDT-11,M10.5.0/02:00:00,M3.5.0/03:00:00", "Australia/Canberra", "AUS2+10", "+10", "Australia(Sydney,Melbourne,Canberra)", "GMT-10.Australia/Sydney");
$tz["Australia/Darwin"] 	= array($tmp . ", " . gettext("Darwin"), "CST-9:30", "Australia/Darwin", "AUS2+9.5", "+9:30", "Australia(Sydney,Melbourne,Canberra)");
$tz["Australia/Hobart"] 	= array($tmp . ", " . gettext("Hobart"), "EST-10EDT-11,M10.1.0/02:00:00,M3.5.0/03:00:00", "Australia/Hobart", "AUS+10", "+10", "Australia(Hobart)", "GMT-10.Australia/Hobart");
$tz["Australia/Melbourne"] 	= array($tmp . ", " . gettext("Melbourne"), "EST-10EDT-11,M10.5.0/02:00:00,M3.5.0/03:00:00", "Australia/Melbourne", "AUS+10", "+10", "Australia(Sydney,Melbourne,Canberra)", "GMT-10.Australia/Sydney");
$tz["Australia/Perth"] 		= array($tmp . ", " . gettext("Perth"), "WST-8", "Australia/Perth", "AUS+8", "+8", "Australia(Perth)", "GMT-8.Australia/Perth");
$tz["Australia/Sydney"] 	= array($tmp . ", " . gettext("Sydney"), "EST-10EDT-11,M10.5.0/02:00:00,M3.5.0/03:00:00", "Australia/Sydney", "AUS+10", "+10", "Australia(Sydney,Melbourne,Canberra)", "GMT-10.Australia/Sydney");

$tmp = gettext("Central and South America");
$tz["America/Argentina/Buenos_Aires"] 	= array($tmp . ", " . gettext("Argentina"), "UTC+3", "America/Argentina/Buenos_Aires", "ARG-3", "-3", "Argentina(Buenos Aires)", "GMT+3.America/Sao_Paulo");
$tz["America/Sao_Paulo"] 				= array($tmp . ", " . gettext("Brazil, São Paulo"), "BRST+3BRDT+2,M10.3.0,M2.3.0", "America/Sao_Paulo", "BRA1-3", "-3", "Brazil(DST)", "GMT+3.America/Sao_Paulo");
$tz["CST6CDT"] 							= array($tmp . ", " . gettext("Central America"), "CST+6", "CST6CDT", "USA-6", "-6", "United States-Central Time", "GMT+6.America/Chicago");
$tz["America/Caracas"] 					= array($tmp . ", " . gettext("Venezuela, Caracas"), "UTC+4:30", "America/Caracas", "VEN-4.5", "-4:30", "Venezuela(Caracas)");

$tmp = gettext("Europe");
$tz["Europe/Amsterdam"] = array($tmp . ", " . gettext("Amsterdam, Netherlands"), "CET-1CEST-2,M3.5.0/02:00:00,M10.5.0/03:00:00", "Europe/Amsterdam", "NLD+1", "+1", "Netherlands(Amsterdam)", "GMT-1.Europe/Brussels");
$tz["Europe/Athens"] 	= array($tmp . ", " . gettext("Athens, Greece"), "EET-2EEST-3,M3.5.0/03:00:00,M10.5.0/04:00:00", "Europe/Athens", "GRC+2", "+2", "Greece(Athens)", "GMT-2.Europe/Athens");
$tz["Europe/Berlin"] 	= array($tmp . ", " . gettext("Berlin, Germany"), "CET-1CEST-2,M3.5.0/02:00:00,M10.5.0/03:00:00", "Europe/Berlin", "GER+1", "+1", "Germany(Berlin)", "GMT-1.Europe/Brussels");
$tz["Europe/Brussels"] 	= array($tmp . ", " . gettext("Brussels, Belgium"), "CET-1CEST-2,M3.5.0/02:00:00,M10.5.0/03:00:00", "Europe/Brussels", "BEL+1", "+1", "Belgium(Brussels)", "GMT-1.Europe/Brussels");
$tz["Europe/Budapest"] 	= array($tmp . ", " . gettext("Budapest, Hungary"), "CET-1CEST-2,M3.5.0/02:00:00,M10.5.0/03:00:00", "Europe/Budapest", "HUN+1", "+1", "Hungary(Budapest)", "GMT-1.Europe/Brussels");
$tz["Europe/Copenhagen"]= array($tmp . ", " . gettext("Copenhagen, Denmark"), "CET-1CEST-2,M3.5.0/02:00:00,M10.5.0/03:00:00", "Europe/Copenhagen", "DNK+1", "+1", "Denmark(Kopenhaven)", "GMT-1.Europe/Brussels");
$tz["Europe/Dublin"] 	= array($tmp . ", " . gettext("Dublin, Ireland"), "GMT+0IST-1,M3.5.0/01:00:00,M10.5.0/02:00:00", "Europe/Dublin", "IRL-0", "0", "Ireland(Dublin)", "GMT.Europe/London");

$tz["Europe/Copenhagen"]= array($tmp . ", " . gettext("Geneva, Switzerland"), "CET-1CEST-2,M3.5.0/02:00:00,M10.5.0/03:00:00", "Europe/Copenhagen", "GER+1", "+1", "Denmark(Kopenhaven)", "GMT-1.Europe/Brussels");
$tz["Europe/Helsinki"] 	= array($tmp . ", " . gettext("Helsinki, Finland"), "EET-2EEST-3,M3.5.0/03:00:00,M10.5.0/04:00:00", "Europe/Helsinki", "FIN+2", "+2", "Finland(Helsinki)GMT-2.Europe/Helsinki");
$tz["Europe/Kiev"] 		= array($tmp . ", " . gettext("Kiev, Ukraine"), "EET-2EEST,M3.5.0/3,M10.5.0/4", "Europe/Kiev", "UKR+2", "+2", "Ukraine(Kyiv,Odessa)", "GMT-2.Europe/Athens");
$tz["Europe/Lisbon"] 	= array($tmp . ", " . gettext("Lisbon, Portugal"), "WET-0WEST-1,M3.5.0/01:00:00,M10.5.0/02:00:00", "Europe/Lisbon", "PRT+0", "0", "Portugal(Lisboa,Porto,Funchal)", "GMT.Europe/London");
$tz["Europe/London"] 	= array($tmp . ", " . gettext("London, Great Britain"), "GMT+0BST-1,M3.5.0/01:00:00,M10.5.0/02:00:00", "Europe/London", "GBR+0", "0", "United Kingdom(London)", "GMT.Europe/London");
$tz["Europe/Madrid"] 	= array($tmp . ", " . gettext("Madrid, Spain"), "CET-1CEST-2,M3.5.0/02:00:00,M10.5.0/03:00:00", "Europe/Madrid", "ESP+1", "+1", "Spain-Canary Islands(Las Palmas)", "GMT-1.Europe/Brussels");
$tz["Europe/Oslo"] 		= array($tmp . ", " . gettext("Oslo, Norway"), "CET-1CEST-2,M3.5.0/02:00:00,M10.5.0/03:00:00", "Europe/Oslo", "NOR+1", "+1", "GMT-1.Europe/Brussels");
$tz["Europe/Paris"] 	= array($tmp . ", " . gettext("Paris, France"), "CET-1CEST-2,M3.5.0/02:00:00,M10.5.0/03:00:00", "Europe/Paris", "FRA+1", "+1", "France(Paris)", "GMT-1.Europe/Brussels");
$tz["Europe/Prague"] 	= array($tmp . ", " . gettext("Prague, Czech Republic"), "CET-1CEST-2,M3.5.0/02:00:00,M10.5.0/03:00:00", "Europe/Prague", "CZE+1", "+1", "Czech Republic(Prague)", "GMT-1.Europe/Brussels");
$tz["Europe/Rome"] 		= array($tmp . ", " . gettext("Rome, Italy"), "CET-1CEST-2,M3.5.0/02:00:00,M10.5.0/03:00:00", "Europe/Rome", "ITA+1", "+1", "Italy(Rome)", "GMT-1.Europe/Brussels");
$tz["Europe/Moscow"] 	= array($tmp . ", " . gettext("Moscow, Russia, MSK"), "MSK", "Europe/Moscow", "RUS+3", "+3", "Russia(Moscow)", "GMT-3.Europe/Moscow");

$tz["Europe/Kaliningrad"] 	= array($tmp . ", " . gettext("Kaliningrad, Russia, MSK-1"), "EET", "Europe/Kaliningrad", "RUS+2", "+2", "Russia(Kaliningrad)", "GMT-2.Europe/Helsinki");
$tz["Europe/Samara"] 		= array($tmp . ", " . gettext("Samara, Russia, MSK+1"), "SAMT", "Europe/Samara", "RUS+4", "+4", "Russia(Samara)", "GMT-4.Asia/Yerevan");
$tz["Europe/Stockholm"] 	= array($tmp . ", " . gettext("Stockholm, Sweden"), "CET-1CEST-2,M3.5.0/02:00:00,M10.5.0/03:00:00", "Europe/Stockholm", "SWE+1", "+1", "GMT-1.Europe/Brussels");
$tz["Europe/Tallinn"] 		= array($tmp . ", " . gettext("Tallinn, Estonia"), "EET-2EEST-3,M3.5.0/03:00:00,M10.5.0/04:00:00", "Europe/Tallinn", "EST+2", "+2", "Estonia(Tallinn)", "GMT-2.Europe/Athens");
$tz["Europe/Bucharest"] 	= array($tmp . ", " . gettext("Bucharest, Romania"), "EET-2EEST,M3.5.0/3,M10.5.0/4", "Europe/Bucharest", "ROU+2", "+2", "Romania(Bucharest)", "GMT-2.Europe/Athens");
$tmp = gettext("New Zealand");
$tz["Pacific/Auckland"] 	= array($tmp . ", " . gettext("Auckland"), "NZST-12NZDT-13,M10.1.0/02:00:00,M3.3.0/03:00:00", "Pacific/Auckland", "NZL+12", "+12", "New Zeland(Wellington,Auckland)", "GMT-12.Pacific/Auckland");
$tz["Pacific/Auckland"] 	= array($tmp . ", " . gettext("Wellington"), "NZST-12NZDT-13,M10.1.0/02:00:00,M3.3.0/03:00:00", "Pacific/Auckland", "NZL+12", "+12", "New Zeland(Wellington,Auckland)", "GMT-12.Pacific/Auckland");
$tmp = gettext("New Caledonia");
$tz["Pacific/Noumea"] 		= array($tmp . ", " . gettext("Noumea"), "NCT-11", "Pacific/Noumea", "NCL+11", "+11", "New Caledonia(Noumea)");
$tmp = gettext("USA & Canada");
$tz["US/Alaska"] 			= array($tmp . ", " . gettext("Alaska Time"), "AKST9AKDT", "US/Alaska", "USA-9", "-9", "United States-Alaska Time", "GMT+9.America/Anchorage");
$tz["Canada/Atlantic"] 		= array($tmp . ", " . gettext("Atlantic Time"), "AST4ADT", "Canada/Atlantic", "USA-4", "-4", "Canada(Vancouver,Whitehorse)", "GMT+4.America/Halifax");
$tz["US/Central"] 			= array($tmp . ", " . gettext("Central Time"), "CST6CDT", "US/Central", "USA-6", "-6", "United States-Central Time", "GMT+6.America/Chicago");
$tz["US/Eastern"] 			= array($tmp . ", " . gettext("Eastern Time"), "EST5EDT", "US/Eastern", "USA-5", "-5", "United States-Eastern Time", "GMT+5.America/New_York");
$tz["US/Hawaii"] 			= array($tmp . ", " . gettext("Hawaii Time"), "HAW10", "US/Hawaii", "USA-10", "-10", "United States-Hawaii-Aleutian", "GMT+10.Pacific/Honolulu");
$tz["US/Mountain"] 			= array($tmp . ", " . gettext("Mountain Time"), "MST7MDT", "US/Mountain", "USA-7", "-7", "United States-Mountain Time", "GMT+7.America/Denver");

$tz["US/Arizona"] 			= array($tmp . ", " . gettext("Mountain Time (Arizona, no DST)"), "MST7", "US/Arizona");
$tz["Canada/Newfoundland"]  = array($tmp . ", " . gettext("Newfoundland Time"), "NST+3:30NDT+2:30,M4.1.0/00:01:00,M10.5.0/00:01:00", "Canada/Newfoundland", "CAN-3.5", "-3:30", "Canada-New Foundland(St.Johns)");
$tz["US/Pacific"] 			= array($tmp . ", " . gettext("Pacific Time"), "PST8PDT", "US/Pacific", "USA-8", "-8", "United States-Pacific Time", "GMT+8.America/Los_Angeles");
$tz["UTC"] 					= array(gettext("UTC"), "UTC", "UTC", "UTC", "0", "GMT");

